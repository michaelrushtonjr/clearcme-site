// Opt-in SQL integration checks in memory. No environment files or remote calls.
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { applyBackfill, readRows, planBackfill } = require('./backfill-requirement-keys');

async function main() {
  const { PGlite } = await import('@electric-sql/pglite');
  const root = path.resolve(__dirname, '..');
  const folder = path.join(root, 'prisma/migrations');
  const names = fs.readdirSync(folder).filter((name) => fs.statSync(path.join(folder, name)).isDirectory()).sort();
  const sql = (name) => fs.readFileSync(path.join(folder, name, 'migration.sql'), 'utf8');
  const identityName = '20260910060000_requirement_identity_retirement';
  const constraintsName = '20260916090000_requirement_key_constraints';
  const topicsName = '20260910061000_certificate_eligibility_topics';
  const mapping = JSON.parse(fs.readFileSync(path.join(root, 'codex-review/requirement-key-resolution-a.json')));
  const fixtures = Object.entries(mapping).map(([identity, requirementKey], index) => {
    const [state, licenseType, topic, ...description] = identity.split(':');
    return { id: `different-environment-${index}`, complianceRuleId: `rule-${state}-${licenseType}`, state, licenseType, topic, description: description.join(':'), requirementKey };
  });
  const db = await PGlite.create();
  try {
    for (const name of names) await db.exec(sql(name));
    console.log(`PASS: all ${names.length} migrations replay from empty PostgreSQL`);
    await db.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    for (const name of names.filter((name) => name < identityName)) await db.exec(sql(name));
    // All compliance values here are deliberately synthetic test data.
    for (const row of fixtures) {
      await db.query('INSERT INTO "ComplianceRule" (id,state,"licenseType","renewalCycle","totalHours","updatedAt") VALUES ($1,$2,$3,24,100,now()) ON CONFLICT DO NOTHING', [row.complianceRuleId, row.state, row.licenseType]);
      await db.query('INSERT INTO "MandatoryRequirement" (id,"complianceRuleId",topic,"hoursRequired",description,cadence,"intervalYears","lookbackYears","attestationAllowed",notes) VALUES ($1,$2,$3,17,$4,\'CONDITIONAL\',3,5,false,\'synthetic fixture\')', [row.id, row.complianceRuleId, row.topic, row.description]);
    }
    // A lone topic (no sibling) must receive the bare base key.
    await db.query('INSERT INTO "ComplianceRule" (id,state,"licenseType","renewalCycle","totalHours","updatedAt") VALUES (\'rule-ZZ-MD\',\'ZZ\',\'MD\',24,100,now())');
    await db.query('INSERT INTO "MandatoryRequirement" (id,"complianceRuleId",topic,"hoursRequired",description) VALUES (\'lone\',\'rule-ZZ-MD\',\'ETHICS\',1,\'Ethics — 1 hr\')');
    await db.exec(`INSERT INTO "User" (id,"updatedAt") VALUES ('fixture-user',now());
      INSERT INTO "PhysicianLicense" (id,"userId",state,"licenseType","updatedAt") VALUES ('fixture-license','fixture-user','FL','MD',now());`);
    for (const row of fixtures) await db.query('INSERT INTO "UserRequirementCompletion" (id,"userId","physicianLicenseId","mandatoryRequirementId",topic,"updatedAt") VALUES ($1,\'fixture-user\',\'fixture-license\',$2,$3,now())', [`completion-${row.id}`, row.id, row.topic]);
    const before = (await db.query('SELECT * FROM "MandatoryRequirement" ORDER BY id')).rows;
    const completions = (await db.query('SELECT * FROM "UserRequirementCompletion" ORDER BY id')).rows;
    await db.exec(sql(identityName));
    const noKeys = async () => assert.equal((await db.query('SELECT count(*)::int n FROM "MandatoryRequirement" WHERE "requirementKey" IS NOT NULL')).rows[0].n, 0);
    await noKeys();

    // Identical topic AND description under one rule cannot be keyed: constraints abort atomically.
    await db.query('INSERT INTO "MandatoryRequirement" (id,"complianceRuleId",topic,"hoursRequired",description) VALUES (\'ambiguous\',$1,$2,1,$3)', [fixtures[0].complianceRuleId, fixtures[0].topic, fixtures[0].description]);
    await assert.rejects(db.exec(sql(constraintsName)), /share a key/i);
    await db.exec('ROLLBACK');
    await noKeys();
    assert.deepEqual((await db.query('SELECT * FROM "UserRequirementCompletion" ORDER BY id')).rows, completions);
    await db.exec("DELETE FROM \"MandatoryRequirement\" WHERE id = 'ambiguous'");
    console.log('PASS: identical-description siblings abort the constraints migration atomically without losing completions');

    // The optional operator script still refuses unreviewed collisions and stale mappings.
    await db.query('INSERT INTO "MandatoryRequirement" (id,"complianceRuleId",topic,"hoursRequired",description) VALUES (\'unapproved\',$1,$2,1,\'Unreviewed extra obligation\')', [fixtures[0].complianceRuleId, fixtures[0].topic]);
    const inventory = planBackfill(await readRows(db));
    assert.equal(inventory.collisions.length, 4);
    assert.equal(inventory.unresolvedCollisions.length, 4);
    await assert.rejects(applyBackfill(db, mapping), /Unresolved collision/);
    await noKeys();
    await db.exec("DELETE FROM \"MandatoryRequirement\" WHERE id = 'unapproved'");
    await db.query('UPDATE "MandatoryRequirement" SET description=\'changed since approval\' WHERE id=$1', [fixtures[0].id]);
    await assert.rejects(applyBackfill(db, mapping), /stale mapping/);
    await noKeys();
    await db.query('UPDATE "MandatoryRequirement" SET description=$1 WHERE id=$2', [fixtures[0].description, fixtures[0].id]);
    console.log('PASS: operator script refuses unreviewed collisions and stale mappings atomically');

    // The constraints migration alone backfills deterministically, matching the reviewed mapping exactly.
    await db.exec(sql(constraintsName));
    const lone = (await db.query('SELECT "requirementKey" FROM "MandatoryRequirement" WHERE id=\'lone\'')).rows[0].requirementKey;
    assert.equal(lone, 'ZZ:MD:ETHICS');
    await applyBackfill(db, mapping); // Idempotent with keys and constraint already present.
    await assert.rejects(db.exec(sql(constraintsName)), /already exists|NOT NULL|duplicate/i); // Re-running is refused by PostgreSQL, never silently repeated.
    await db.exec('ROLLBACK');
    const after = (await db.query('SELECT * FROM "MandatoryRequirement" WHERE id <> \'lone\' ORDER BY id')).rows;
    assert.deepEqual(after.map((row) => {
      assert.equal(row.requirementKey, fixtures.find((item) => item.id === row.id).requirementKey);
      assert.equal(row.retiredAt, null);
      const prior = { ...row }; delete prior.requirementKey; delete prior.retiredAt; return prior;
    }), before.filter((row) => row.id !== 'lone'));
    assert.deepEqual((await db.query('SELECT * FROM "UserRequirementCompletion" ORDER BY id')).rows, completions);
    console.log('PASS: constraints migration self-backfills all eight sibling keys and the lone base key, preserving every field and completion');

    await db.exec(`INSERT INTO "Certificate" (id,"userId","updatedAt","fileName","specialTopics","manuallyVerified") VALUES
      ('extracted','fixture-user',now(),'synthetic.pdf',ARRAY['ETHICS']::"SpecialTopic"[],false),
      ('manual','fixture-user',now(),'synthetic.pdf',ARRAY['ETHICS']::"SpecialTopic"[],true);`);
    await db.exec(sql(topicsName));
    const certificates = (await db.query('SELECT id,to_json("specialTopics") AS "specialTopics",to_json("suggestedSpecialTopics") AS "suggestedSpecialTopics",to_json("extractedSpecialTopics") AS "extractedSpecialTopics","topicHourAllocations" FROM "Certificate" ORDER BY id')).rows;
    assert.deepEqual(certificates, [
      { id: 'extracted', specialTopics: ['ETHICS'], suggestedSpecialTopics: ['ETHICS'], extractedSpecialTopics: [], topicHourAllocations: {} },
      { id: 'manual', specialTopics: ['ETHICS'], suggestedSpecialTopics: [], extractedSpecialTopics: [], topicHourAllocations: {} },
    ]);
    console.log('PASS: legacy extraction becomes a suggestion without inventing provenance');

    // Run B: existing hashes/metadata survive, collisions fail without deleting evidence.
    await db.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    const billingName = '20260916100000_billing_integrity';
    const certificateName = '20260916101000_certificate_integrity';
    const storageName = '20260916102000_certificate_storage_status';
    for (const name of names.filter((name) => name < billingName)) await db.exec(sql(name));
    await db.exec(`INSERT INTO "User" (id,"updatedAt") VALUES ('one',now()),('two',now());
      INSERT INTO "Certificate" (id,"userId","updatedAt","fileName","fileHash","creditHours","fileUrl") VALUES
      ('original','one',now(),'original.pdf','same-hash',4,'https://example.invalid/original'),
      ('collision','one',now(),'other.pdf','same-hash',4,NULL),
      ('manual','one',now(),'Manual entry',NULL,2,NULL),
      ('another-user','two',now(),'original.pdf','same-hash',4,NULL);`);
    const beforeCertificates = (await db.query('SELECT * FROM "Certificate" ORDER BY id')).rows;
    await assert.rejects(db.exec(sql(certificateName)), /reviewed resolution/);
    await db.exec('ROLLBACK');
    assert.deepEqual((await db.query('SELECT * FROM "Certificate" ORDER BY id')).rows, beforeCertificates);
    console.log('PASS: duplicate legacy hashes abort Run B migration atomically without changing evidence');

    await db.exec(`DELETE FROM "Certificate" WHERE id='collision'`); // Synthetic collision only.
    await db.exec(sql(billingName));
    await db.exec(sql(certificateName));
    await db.exec(sql(storageName));
    const originals = (await db.query('SELECT id,"creditHours","hoursEarned","activityFingerprint","fileHash","storageStatus" FROM "Certificate" ORDER BY id')).rows;
    assert.deepEqual(originals, [
      { id: 'another-user', creditHours: 4, hoursEarned: null, activityFingerprint: null, fileHash: 'same-hash', storageStatus: 'STORE_FAILED' },
      { id: 'manual', creditHours: 2, hoursEarned: null, activityFingerprint: null, fileHash: null, storageStatus: 'STORE_FAILED' },
      { id: 'original', creditHours: 4, hoursEarned: null, activityFingerprint: null, fileHash: 'same-hash', storageStatus: 'STORED' },
    ]);
    await assert.rejects(db.exec(`INSERT INTO "Certificate" (id,"userId","updatedAt","fileName","fileHash") VALUES ('duplicate','one',now(),'same.pdf','same-hash')`), /unique constraint/);
    await db.exec(`INSERT INTO "Certificate" (id,"userId","updatedAt","fileName","fileHash") VALUES ('manual-2','one',now(),'Manual entry',NULL)`);
    console.log('PASS: per-user hash uniqueness allows NULLs and different users; legacy hours/hash preserved and storage status backfilled');

    await db.exec(`INSERT INTO "Subscription" (id,"userId","updatedAt","stripeSubId") VALUES ('subscription','one',now(),'sub_identity');
      INSERT INTO "StripePriceMap" ("priceId",tier,label,active) VALUES ('price_retired','ESSENTIAL','Founding',false);`);
    await assert.rejects(db.exec(`INSERT INTO "Subscription" (id,"userId","updatedAt","stripeSubId") VALUES ('other','two',now(),'sub_identity')`), /unique constraint/);
    const billing = (await db.query('SELECT "paymentFailureGraceUntil", "stripeCreatedAt" FROM "Subscription"')).rows[0];
    assert.deepEqual(billing, { paymentFailureGraceUntil: null, stripeCreatedAt: null });
    await db.exec(`BEGIN; INSERT INTO "StripeEvent" ("stripeEventId",type) VALUES ('evt_rollback','customer.subscription.updated'); UPDATE "Subscription" SET tier='PRO'; ROLLBACK;`);
    assert.equal((await db.query('SELECT count(*)::int n FROM "StripeEvent"')).rows[0].n, 0);
    assert.equal((await db.query('SELECT tier FROM "Subscription"')).rows[0].tier, 'FREE');
    await db.exec(`BEGIN; INSERT INTO "StripeEvent" ("stripeEventId",type) VALUES ('evt_commit','customer.subscription.updated'); UPDATE "Subscription" SET tier='ESSENTIAL'; COMMIT;`);
    await assert.rejects(db.exec(`INSERT INTO "StripeEvent" ("stripeEventId",type) VALUES ('evt_commit','customer.subscription.updated')`), /unique constraint/);
    await db.exec(`INSERT INTO "BillingAnomaly" (id,"priceId",message) VALUES ('anomaly','price_missing','Unknown price')`);
    assert.equal((await db.query('SELECT tier FROM "StripePriceMap" WHERE "priceId"=\'price_retired\'')).rows[0].tier, 'ESSENTIAL');
    console.log('PASS: Stripe identity/event uniqueness, receipt+effect atomicity, persistent retired prices and billing anomalies');

    // Run C: execute the application's actual parameterized SQL in PostgreSQL.
    const transportName = '20260916110000_extraction_reservations';
    const deliveryName = '20260916111000_email_delivery';
    const federalName = '20260916112000_federal_training';
    const taggedQuery = (file, start, bindings) => {
      const source = fs.readFileSync(path.join(root, file), 'utf8');
      const query = source.slice(source.indexOf(start)).split('`')[0];
      const parameters = [];
      const text = query.replace(/\$\{([^}]+)\}/g, (_, expression) => {
        assert.ok(Object.hasOwn(bindings, expression), `Missing SQL binding ${expression}`);
        parameters.push(bindings[expression]); return `$${parameters.length}`;
      });
      return db.query(text, parameters);
    };
    await db.exec(sql(transportName));
    const quota = (ungated = false) => taggedQuery('lib/entitlements.ts', 'UPDATE "User" SET "extractionAttempts"', {
      userId: 'one', 'entitlements.ungated': ungated, FREE_SCAN_ATTEMPT_LIMIT: 10, FREE_EXTRACTION_LIMIT: 3, now: '2026-09-16T12:00:00.000Z',
    });
    for (let index = 0; index < 3; index++) {
      assert.equal((await quota()).rows.length, 1);
      await db.query(`INSERT INTO "ExtractionReservation" (id,"userId","expiresAt") VALUES ($1,'one',TIMESTAMP '2026-09-16 12:02:00')`, [`scan-${index}`]);
    }
    assert.equal((await quota()).rows.length, 0); // Last clean slot reserved.
    await db.exec(`DELETE FROM "ExtractionReservation" WHERE id='scan-0'; UPDATE "User" SET "extractionsUsed"=1 WHERE id='one'`);
    assert.equal((await quota()).rows.length, 0); // Clean result replaces its reservation.
    await db.exec(`DELETE FROM "ExtractionReservation" WHERE id='scan-1'`);
    assert.equal((await quota()).rows.length, 1); // Failed scan releases clean slot, attempt stays spent.
    await db.exec(`UPDATE "ExtractionReservation" SET "expiresAt"=TIMESTAMP '2026-09-16 11:59:00'; UPDATE "User" SET "extractionAttempts"=9 WHERE id='one'`);
    assert.equal((await quota()).rows.length, 1); // Expired leases cannot strand a clean slot.
    assert.equal((await quota()).rows.length, 0); // Atomic ten-attempt cap.
    assert.equal((await quota(true)).rows.length, 1); // Paid/grandfathered remain ungated.
    assert.deepEqual((await db.query(`SELECT "extractionsUsed","extractionAttempts" FROM "User" WHERE id='one'`)).rows[0], { extractionsUsed: 1, extractionAttempts: 11 });
    console.log('PASS: actual quota SQL caps reservations and attempts, preserves monotonic counters, releases failed/expired leases, and bypasses paid/grandfathered users');

    await db.exec(`INSERT INTO "EmailLog" (id,"userId",kind,"dedupeKey") VALUES ('legacy-email','one','RENEWAL_REMINDER','renewal:license:30:2026-10-16')`);
    const oldLog = (await db.query('SELECT * FROM "EmailLog"')).rows[0];
    await db.exec(sql(deliveryName));
    const newLog = (await db.query('SELECT * FROM "EmailLog"')).rows[0];
    assert.equal(newLog.status, 'SENT'); assert.equal(newLog.cycleKey, 'license:2026-10-16'); assert.deepEqual(newLog.sentAt, oldLog.sentAt);
    const claim = (key) => taggedQuery('lib/email-delivery.ts', 'INSERT INTO "EmailLog" (id,', {
      'crypto.randomUUID()': require('node:crypto').randomUUID(), 'input.userId': 'one', 'input.kind': 'RENEWAL_REMINDER',
      'input.dedupeKey': key, 'input.cycleKey': 'license:2026-10-16', now: '2026-09-16T12:00:00.000Z', stale: '2026-09-16T11:45:00.000Z',
    });
    assert.equal((await claim(newLog.dedupeKey)).rows.length, 0);
    assert.equal((await claim('retry')).rows.length, 1);
    assert.equal((await claim('retry')).rows.length, 0); // Cannot claim another live worker's PENDING.
    for (let attempt = 2; attempt <= 5; attempt++) {
      await db.exec(`UPDATE "EmailLog" SET status='FAILED',"lastError"='synthetic outage' WHERE "dedupeKey"='retry'`);
      assert.equal((await claim('retry')).rows.length, 1);
    }
    await db.exec(`UPDATE "EmailLog" SET status='FAILED' WHERE "dedupeKey"='retry'`);
    assert.equal((await claim('retry')).rows.length, 0);
    assert.equal((await db.query(`SELECT attempts FROM "EmailLog" WHERE "dedupeKey"='retry'`)).rows[0].attempts, 5);
    assert.equal((await claim('stale')).rows.length, 1);
    await db.exec(`UPDATE "EmailLog" SET "lastAttemptAt"=TIMESTAMP '2026-09-16 11:44:00' WHERE "dedupeKey"='stale'`);
    assert.equal((await claim('stale')).rows.length, 1);
    console.log('PASS: historical SENT/cycle keys preserved; actual delivery SQL blocks concurrent claims/duplicates and retries failed or stale PENDING rows up to five attempts');

    await db.exec(`INSERT INTO "User" (id,"updatedAt") VALUES ('registration-only',now());
      INSERT INTO "PhysicianLicense" (id,"userId",state,"licenseType","updatedAt","mateActCompleted","deaRegisteredAt") VALUES
      ('legacy-one','one','ZZ','MD',now(),true,'2020-01-01'), ('legacy-two','one','ZY','MD',now(),true,NULL),
      ('registration-only','registration-only','ZZ','MD',now(),NULL,'2024-01-01');
      INSERT INTO "ComplianceRule" (id,state,"licenseType","renewalCycle","totalHours","updatedAt") VALUES ('mate-rule','ZZ','MD',24,0,now());
      INSERT INTO "MandatoryRequirement" (id,"complianceRuleId",topic,"hoursRequired",description,"requirementKey") VALUES ('mate','mate-rule','SUBSTANCE_USE',8,'Federal MATE Act','ZZ:MD:SUBSTANCE_USE');
      INSERT INTO "UserRequirementCompletion" (id,"userId","mandatoryRequirementId",topic,"completedAt",notes,"updatedAt") VALUES
      ('mate-evidence','two','mate','SUBSTANCE_USE','2025-01-15','__CLEARCME_CERT__:another-user',now());`);
    const priorLicenses = (await db.query('SELECT * FROM "PhysicianLicense" ORDER BY id')).rows;
    const priorFacts = (await db.query('SELECT * FROM "MandatoryRequirement" ORDER BY id')).rows;
    await db.exec(sql(federalName));
    const records = (await db.query('SELECT "userId",basis,"completedAt","evidenceCertificateId" FROM "FederalTrainingRecord" ORDER BY "userId"')).rows;
    assert.equal(records.length, 2);
    assert.deepEqual(records[0], { userId: 'one', basis: 'OTHER', completedAt: null, evidenceCertificateId: null });
    assert.equal(records[1].basis, 'EIGHT_HOUR_TRAINING'); assert.equal(records[1].evidenceCertificateId, 'another-user');
    assert.equal(new Date(records[1].completedAt).toISOString().slice(0,10), '2025-01-15');
    assert.deepEqual((await db.query('SELECT * FROM "PhysicianLicense" ORDER BY id')).rows, priorLicenses);
    assert.deepEqual((await db.query('SELECT * FROM "MandatoryRequirement" ORDER BY id')).rows, priorFacts);
    await assert.rejects(db.exec(`INSERT INTO "FederalTrainingRecord" (id,"userId",basis) VALUES ('duplicate-federal','one','OTHER')`), /unique constraint/);
    await db.exec(`DELETE FROM "Certificate" WHERE id='another-user'`);
    assert.equal((await db.query(`SELECT "evidenceCertificateId" FROM "FederalTrainingRecord" WHERE "userId"='two'`)).rows[0].evidenceCertificateId, null);
    console.log('PASS: one federal record per physician, explicit legacy attestation/evidence preserved, registration-only records excluded, state facts/legacy fields unchanged, evidence deletion retains attestation');

  } finally { await db.close(); }
}

main().catch((error) => { console.error(error.stack ?? error.message); process.exitCode = 1; });

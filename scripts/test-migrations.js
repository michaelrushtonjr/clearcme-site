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
  } finally { await db.close(); }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });

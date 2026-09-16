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
    await db.exec(`INSERT INTO "User" (id,"updatedAt") VALUES ('fixture-user',now());
      INSERT INTO "PhysicianLicense" (id,"userId",state,"licenseType","updatedAt") VALUES ('fixture-license','fixture-user','FL','MD',now());`);
    for (const row of fixtures) await db.query('INSERT INTO "UserRequirementCompletion" (id,"userId","physicianLicenseId","mandatoryRequirementId",topic,"updatedAt") VALUES ($1,\'fixture-user\',\'fixture-license\',$2,$3,now())', [`completion-${row.id}`, row.id, row.topic]);
    const before = (await db.query('SELECT * FROM "MandatoryRequirement" ORDER BY id')).rows;
    const completions = (await db.query('SELECT * FROM "UserRequirementCompletion" ORDER BY id')).rows;
    await db.exec(sql(identityName));
    const noKeys = async () => assert.equal((await db.query('SELECT count(*)::int n FROM "MandatoryRequirement" WHERE "requirementKey" IS NOT NULL')).rows[0].n, 0);
    // Constraints refuse an omitted backfill and leave the schema/data intact.
    await assert.rejects(db.exec(sql(constraintsName)), /null/i);
    await db.exec('ROLLBACK');
    await noKeys();

    await db.query('INSERT INTO "MandatoryRequirement" (id,"complianceRuleId",topic,"hoursRequired",description) VALUES (\'unapproved\',$1,$2,1,\'Unreviewed extra obligation\')', [fixtures[0].complianceRuleId, fixtures[0].topic]);
    const inventory = planBackfill(await readRows(db));
    assert.equal(inventory.collisions.length, 4);
    assert.equal(inventory.unresolvedCollisions.length, 4);
    await assert.rejects(applyBackfill(db, mapping), /Unresolved collision/);
    await noKeys();
    assert.deepEqual((await db.query('SELECT * FROM "UserRequirementCompletion" ORDER BY id')).rows, completions);
    await db.exec("DELETE FROM \"MandatoryRequirement\" WHERE id = 'unapproved'");
    console.log('PASS: unapproved collisions and missing backfill fail atomically without losing completions');

    await db.query('UPDATE "MandatoryRequirement" SET description=\'changed since approval\' WHERE id=$1', [fixtures[0].id]);
    await assert.rejects(applyBackfill(db, mapping), /stale mapping/);
    await noKeys();
    await db.query('UPDATE "MandatoryRequirement" SET description=$1 WHERE id=$2', [fixtures[0].description, fixtures[0].id]);
    console.log('PASS: stale approved mappings fail atomically');

    await applyBackfill(db, mapping);
    await db.exec(sql(constraintsName));
    await applyBackfill(db, mapping); // Idempotent with the constraint installed.
    const after = (await db.query('SELECT * FROM "MandatoryRequirement" ORDER BY id')).rows;
    assert.deepEqual(after.map((row) => {
      assert.equal(row.requirementKey, fixtures.find((item) => item.id === row.id).requirementKey);
      assert.equal(row.retiredAt, null);
      const prior = { ...row }; delete prior.requirementKey; delete prior.retiredAt; return prior;
    }), before);
    assert.deepEqual((await db.query('SELECT * FROM "UserRequirementCompletion" ORDER BY id')).rows, completions);
    console.log('PASS: all eight description-mapped keys preserve every field, foreign-environment ID and completion');

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

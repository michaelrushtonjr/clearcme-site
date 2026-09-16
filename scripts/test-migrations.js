// Opt-in SQL integration checks in memory. No environment files or remote calls.
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

async function main() {
  const { PGlite } = await import('@electric-sql/pglite');
  const root = path.resolve(__dirname, '..');
  const folder = path.join(root, 'prisma/migrations');
  const names = fs.readdirSync(folder).filter((name) => fs.statSync(path.join(folder, name)).isDirectory()).sort();
  const sql = (name) => fs.readFileSync(path.join(folder, name, 'migration.sql'), 'utf8');
  const identityName = '20260910060000_requirement_identity_retirement';
  const topicsName = '20260910061000_certificate_eligibility_topics';
  const mapping = JSON.parse(fs.readFileSync(path.join(root, 'codex-review/requirement-key-resolution-a.json')));
  const db = await PGlite.create();
  try {
    for (const name of names) await db.exec(sql(name));
    console.log(`PASS: all ${names.length} migrations replay from empty PostgreSQL`);
    await db.exec('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    for (const name of names.filter((name) => name < identityName)) await db.exec(sql(name));
    // All compliance values here are deliberately synthetic test data.
    for (const row of mapping) {
      await db.query('INSERT INTO "ComplianceRule" (id,state,"licenseType","renewalCycle","totalHours","updatedAt") VALUES ($1,$2,$3,24,100,now()) ON CONFLICT DO NOTHING', [row.complianceRuleId, row.state, row.licenseType]);
      await db.query('INSERT INTO "MandatoryRequirement" (id,"complianceRuleId",topic,"hoursRequired",description,cadence,"intervalYears","lookbackYears","attestationAllowed",notes) VALUES ($1,$2,$3,17,$4,\'CONDITIONAL\',3,5,false,\'synthetic fixture\')', [row.id, row.complianceRuleId, row.topic, row.description]);
    }
    await db.exec(`INSERT INTO "User" (id,"updatedAt") VALUES ('fixture-user',now());
      INSERT INTO "PhysicianLicense" (id,"userId",state,"licenseType","updatedAt") VALUES ('fixture-license','fixture-user','FL','MD',now());`);
    for (const row of mapping) await db.query('INSERT INTO "UserRequirementCompletion" (id,"userId","physicianLicenseId","mandatoryRequirementId",topic,"updatedAt") VALUES ($1,\'fixture-user\',\'fixture-license\',$2,$3,now())', [`completion-${row.id}`, row.id, row.topic]);
    const before = (await db.query('SELECT * FROM "MandatoryRequirement" ORDER BY id')).rows;
    const completions = (await db.query('SELECT * FROM "UserRequirementCompletion" ORDER BY id')).rows;
    const noKeyColumn = async () => assert.equal((await db.query("SELECT count(*)::int n FROM information_schema.columns WHERE table_name='MandatoryRequirement' AND column_name='requirementKey'")).rows[0].n, 0);

    await db.query('INSERT INTO "MandatoryRequirement" (id,"complianceRuleId",topic,"hoursRequired",description) VALUES (\'unapproved\',$1,$2,1,\'Unreviewed extra obligation\')', [mapping[0].complianceRuleId, mapping[0].topic]);
    await assert.rejects(db.exec(sql(identityName)), /Duplicate requirement keys/);
    await db.exec('ROLLBACK');
    await noKeyColumn();
    assert.deepEqual((await db.query('SELECT * FROM "UserRequirementCompletion" ORDER BY id')).rows, completions);
    await db.exec("DELETE FROM \"MandatoryRequirement\" WHERE id IN ('unapproved','unapproved-2')");
    console.log('PASS: unapproved collisions fail atomically without losing completions');

    await db.query('UPDATE "MandatoryRequirement" SET description=\'changed since approval\' WHERE id=$1', [mapping[0].id]);
    await assert.rejects(db.exec(sql(identityName)), /no longer matches/);
    await db.exec('ROLLBACK');
    await noKeyColumn();
    await db.query('UPDATE "MandatoryRequirement" SET description=$1 WHERE id=$2', [mapping[0].description, mapping[0].id]);
    console.log('PASS: stale approved mappings fail atomically');

    await db.exec(sql(identityName));
    const after = (await db.query('SELECT * FROM "MandatoryRequirement" ORDER BY id')).rows;
    assert.deepEqual(after.map((row) => {
      assert.equal(row.requirementKey, mapping.find((item) => item.id === row.id).requirementKey);
      assert.equal(row.retiredAt, null);
      const prior = { ...row }; delete prior.requirementKey; delete prior.retiredAt; return prior;
    }), before);
    assert.deepEqual((await db.query('SELECT * FROM "UserRequirementCompletion" ORDER BY id')).rows, completions);
    console.log('PASS: all eight approved keys preserve every field, ID and completion');

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

#!/usr/bin/env node
/*
 * Update Nevada DO compliance requirements in the live ComplianceRule tables.
 * Loads DATABASE_URL from the environment or local .env/.env.local without printing it.
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

function loadEnvFile(file) {
  const fullPath = path.join(process.cwd(), file);
  if (!fs.existsSync(fullPath)) return;
  for (const line of fs.readFileSync(fullPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const requirements = [
  {
    topic: 'OPIOID_PRESCRIBING',
    hoursRequired: 2,
    description: 'Misuse/abuse of controlled substances, prescribing of opioids, or addiction',
    firstRenewalOnly: false,
    cadence: 'EVERY_RENEWAL',
    intervalYears: null,
    lookbackYears: null,
    notes: 'Required annually for all Nevada DOs; no DEA-registration gate.',
  },
  {
    topic: 'ETHICS',
    hoursRequired: 2,
    description: 'Ethics, pain management, care of persons with addiction, or SBIRT',
    firstRenewalOnly: false,
    cadence: 'EVERY_RENEWAL',
    intervalYears: null,
    lookbackYears: null,
    notes: 'Required in even-numbered renewal years only; distinct from the annual opioid/controlled-substance requirement.',
  },
  {
    topic: 'SUBSTANCE_USE',
    hoursRequired: 2,
    description: 'SBIRT (Screening, Brief Intervention, and Referral to Treatment) approach to substance use disorder',
    firstRenewalOnly: false,
    cadence: 'INITIAL_LICENSE_ONLY',
    intervalYears: null,
    lookbackYears: null,
    notes: 'One-time requirement within 2 years of initial licensure. If taken in an even-year cycle, may also satisfy the even-year ethics/pain/addiction/SBIRT bucket.',
  },
  {
    topic: 'SUICIDE_PREVENTION',
    hoursRequired: 2,
    description: 'Evidence-based suicide prevention and awareness',
    firstRenewalOnly: false,
    cadence: 'EVERY_N_YEARS',
    intervalYears: 4,
    lookbackYears: 4,
    notes: 'Within 2 years of initial licensure and at least once every 4 years thereafter.',
  },
  {
    topic: 'IMPLICIT_BIAS',
    hoursRequired: 2,
    description: 'HIV stigma, discrimination, and unrecognized bias training',
    firstRenewalOnly: true,
    cadence: 'ONE_TIME',
    intervalYears: null,
    lookbackYears: null,
    notes: 'One-time requirement for DOs providing or supervising hospital emergency medical services or primary care services.',
  },
  {
    topic: 'CULTURAL_COMPETENCY',
    hoursRequired: 6,
    description: 'Cultural competency and DEI training for psychiatrists',
    firstRenewalOnly: false,
    cadence: 'CONDITIONAL',
    intervalYears: 2,
    lookbackYears: 2,
    notes: 'Nevada DO specialty-specific requirement: applies to psychiatrists only; 6 hours biennially. Do not apply to non-psychiatry DOs.'
  },
  {
    topic: 'SUBSTANCE_USE',
    hoursRequired: 8,
    description: 'DEA MATE Act: treating/managing opioid and other substance use disorders',
    firstRenewalOnly: true,
    cadence: 'ONE_TIME',
    intervalYears: null,
    lookbackYears: null,
    notes: 'One-time federal DEA MATE Act requirement for DEA-registered practitioners.',
  },
];

async function main() {
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  try {
    await client.query('BEGIN');
    const ruleResult = await client.query(`
      INSERT INTO "ComplianceRule" (id, state, "licenseType", "renewalCycle", "totalHours", notes, "updatedAt", "sourceUrl")
      VALUES (gen_random_uuid()::text, 'NV', 'DO', 12, 35, $1, NOW(), $2)
      ON CONFLICT (state, "licenseType") DO UPDATE SET
        "renewalCycle" = EXCLUDED."renewalCycle",
        "totalHours" = EXCLUDED."totalHours",
        notes = EXCLUDED.notes,
        "updatedAt" = NOW(),
        "sourceUrl" = EXCLUDED."sourceUrl"
      RETURNING id
    `, [
      'Nevada DO annual renewal: 35 hrs/year, 10 Category 1A. Updated 2026-05-16 after principal finding + Roz verification: annual opioid/CS requirement; separate even-year ethics/pain/addiction/SBIRT bucket; one-time SBIRT within 2 years of initial licensure; cultural competency is psychiatrist-only.',
      'https://bom.nv.gov/Licensee/CME/; https://www.law.cornell.edu/regulations/nevada/NAC-633-250',
    ]);
    const ruleId = ruleResult.rows[0].id;

    await client.query(`
      DELETE FROM "MandatoryRequirement"
      WHERE "complianceRuleId" = $1
        AND (
          topic IN ('OPIOID_PRESCRIBING', 'ETHICS', 'SUICIDE_PREVENTION', 'IMPLICIT_BIAS', 'INFECTION_CONTROL', 'CULTURAL_COMPETENCY')
          OR description ILIKE '%SBIRT%'
          OR description ILIKE '%DEA MATE%'
          OR notes ILIKE '%DEA MATE%'
        )
    `, [ruleId]);

    for (const req of requirements) {
      await client.query(`
        INSERT INTO "MandatoryRequirement" (
          id, "complianceRuleId", topic, "hoursRequired", description,
          "firstRenewalOnly", cadence, "intervalYears", "lookbackYears", notes
        ) VALUES (
          gen_random_uuid()::text, $1, $2::"SpecialTopic", $3, $4,
          $5, $6::"RequirementCadence", $7, $8, $9
        )
      `, [
        ruleId,
        req.topic,
        req.hoursRequired,
        req.description,
        req.firstRenewalOnly,
        req.cadence,
        req.intervalYears,
        req.lookbackYears,
        req.notes,
      ]);
    }

    await client.query('COMMIT');
    console.log(`Updated NV DO rule with ${requirements.length} mandatory requirements.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});

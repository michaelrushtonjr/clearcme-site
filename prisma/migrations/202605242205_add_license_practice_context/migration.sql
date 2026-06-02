-- Add per-license clinical context so multi-state physicians can edit
-- specialty/practice setting independently for each license.
ALTER TABLE "PhysicianLicense" ADD COLUMN "specialty" TEXT;
ALTER TABLE "PhysicianLicense" ADD COLUMN "practiceArea" TEXT;

-- Backfill existing licenses from the account-level profile as a safe default.
UPDATE "PhysicianLicense" pl
SET
  "specialty" = u."specialty",
  "practiceArea" = u."practiceArea"
FROM "User" u
WHERE pl."userId" = u."id";

-- Correct stale NV DO psychiatrist-only cultural competency data if present.
UPDATE "MandatoryRequirement" mr
SET
  "hoursRequired" = 2,
  "description" = 'Cultural competency and DEI training for psychiatrists',
  "cadence" = 'CONDITIONAL',
  "intervalYears" = 2,
  "lookbackYears" = 2,
  "notes" = 'Nevada DO specialty-specific requirement: applies to psychiatrists only; 2 hours biennially. Do not apply to non-psychiatry DOs.'
FROM "ComplianceRule" cr
WHERE mr."complianceRuleId" = cr."id"
  AND cr."state" = 'NV'
  AND cr."licenseType" = 'DO'
  AND mr."topic" = 'CULTURAL_COMPETENCY'
  AND (mr."notes" ILIKE '%psychiat%' OR mr."description" ILIKE '%psychiat%');

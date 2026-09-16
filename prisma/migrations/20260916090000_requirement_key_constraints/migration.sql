-- Review #A2-2: scripts/backfill-requirement-keys.js must have been applied first.
-- NULL keys or duplicate keys abort this transaction without partial constraints.
BEGIN;
ALTER TABLE "MandatoryRequirement" ALTER COLUMN "requirementKey" SET NOT NULL;
CREATE UNIQUE INDEX "MandatoryRequirement_complianceRuleId_requirementKey_key" ON "MandatoryRequirement"("complianceRuleId", "requirementKey");
COMMIT;

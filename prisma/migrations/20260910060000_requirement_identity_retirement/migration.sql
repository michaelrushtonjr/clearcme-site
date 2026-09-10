-- ASTRA-TODO(A-A2): migrate dev is blocked by pre-existing shadow-history drift
-- (P3006 at 20260424). Validate/reconcile that history before production rollout.
-- Fail before changing rows; never guess which historical completion a duplicate belongs to.
DO $$
DECLARE duplicates TEXT;
BEGIN
  SELECT string_agg(key || ' (' || count || ' rows)', ', ' ORDER BY key)
  INTO duplicates
  FROM (
    SELECT r.state || ':' || r."licenseType"::text || ':' || m.topic::text AS key, count(*)
    FROM "MandatoryRequirement" m JOIN "ComplianceRule" r ON r.id = m."complianceRuleId"
    GROUP BY r.id, r.state, r."licenseType", m.topic HAVING count(*) > 1
  ) collisions;
  IF duplicates IS NOT NULL THEN
    RAISE EXCEPTION 'Duplicate requirement keys; resolve through FACT-QUESTIONS-A.md before migration: %', duplicates;
  END IF;
END $$;

ALTER TABLE "MandatoryRequirement" ADD COLUMN "requirementKey" TEXT;
ALTER TABLE "MandatoryRequirement" ADD COLUMN "retiredAt" TIMESTAMP(3);
UPDATE "MandatoryRequirement" m SET "requirementKey" = r.state || ':' || r."licenseType"::text || ':' || m.topic::text
FROM "ComplianceRule" r WHERE r.id = m."complianceRuleId";
ALTER TABLE "MandatoryRequirement" ALTER COLUMN "requirementKey" SET NOT NULL;
CREATE UNIQUE INDEX "MandatoryRequirement_complianceRuleId_requirementKey_key" ON "MandatoryRequirement"("complianceRuleId", "requirementKey");

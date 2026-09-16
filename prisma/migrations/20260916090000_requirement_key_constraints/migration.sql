-- Review #A2-2, amended 2026-09-16: self-sufficient so `prisma migrate deploy` applies in one pass.
-- Backfills every NULL requirementKey deterministically as <STATE>:<LICENSE_TYPE>:<TOPIC>, adding
-- ":<slug(description)>" when the same topic appears more than once under one rule (the identical rule
-- scripts/rule-sync-planner.js and scripts/backfill-requirement-keys.js use). If two sibling rows would
-- still share a key (identical topic AND description), the whole migration aborts with no partial change.
BEGIN;
LOCK TABLE "MandatoryRequirement" IN SHARE ROW EXCLUSIVE MODE;
WITH keyed AS (
  SELECT m.id,
         r.state || ':' || r."licenseType"::text || ':' || m.topic::text
           || CASE WHEN count(*) OVER (PARTITION BY m."complianceRuleId", m.topic) > 1
                   THEN ':' || trim(both '-' from regexp_replace(lower(coalesce(m.description, '')), '[^a-z0-9]+', '-', 'g'))
                   ELSE '' END AS key
  FROM "MandatoryRequirement" m
  JOIN "ComplianceRule" r ON r.id = m."complianceRuleId"
)
UPDATE "MandatoryRequirement" m SET "requirementKey" = keyed.key
FROM keyed WHERE keyed.id = m.id AND m."requirementKey" IS NULL;
DO $$
DECLARE dups TEXT;
BEGIN
  SELECT string_agg("complianceRuleId" || '/' || "requirementKey" || ' (' || n || ' rows)', ', ' ORDER BY "requirementKey")
    INTO dups
    FROM (SELECT "complianceRuleId", "requirementKey", count(*) AS n
            FROM "MandatoryRequirement" GROUP BY 1, 2 HAVING count(*) > 1) d;
  IF dups IS NOT NULL THEN
    RAISE EXCEPTION 'Requirement rows share a key (identical topic and description under one rule); resolve before constraints: %', dups;
  END IF;
END $$;
ALTER TABLE "MandatoryRequirement" ALTER COLUMN "requirementKey" SET NOT NULL;
CREATE UNIQUE INDEX "MandatoryRequirement_complianceRuleId_requirementKey_key" ON "MandatoryRequirement"("complianceRuleId", "requirementKey");
COMMIT;

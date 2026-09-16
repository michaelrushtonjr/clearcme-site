BEGIN;
ALTER TABLE "User" ADD COLUMN "hasDeaRegistration" BOOLEAN, ADD COLUMN "deaFirstQualifyingAt" TIMESTAMP(3);
CREATE TYPE "FederalTrainingKind" AS ENUM ('MATE_ACT');
CREATE TYPE "FederalTrainingBasis" AS ENUM ('EIGHT_HOUR_TRAINING', 'BOARD_CERT_ADDICTION', 'GRADUATED_AFTER_2023', 'OTHER');
CREATE TABLE "FederalTrainingRecord" (
  id TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES "User"(id) ON DELETE CASCADE ON UPDATE CASCADE,
  kind "FederalTrainingKind" NOT NULL DEFAULT 'MATE_ACT',
  "completedAt" TIMESTAMP(3),
  basis "FederalTrainingBasis" NOT NULL,
  "evidenceCertificateId" TEXT REFERENCES "Certificate"(id) ON DELETE SET NULL ON UPDATE CASCADE,
  "attestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT
);
CREATE UNIQUE INDEX "FederalTrainingRecord_userId_key" ON "FederalTrainingRecord"("userId");
-- DEA registration certificates establish registration, not completion of SUD
-- training. Only explicit prior completion attestations are migrated.
INSERT INTO "FederalTrainingRecord" (id, "userId", basis, "attestedAt", notes)
SELECT 'legacy-mate-' || "userId", "userId", 'OTHER', min("updatedAt"),
  'Migrated explicit mateActCompleted attestation; original completion date and basis were not recorded.'
FROM "PhysicianLicense" WHERE "mateActCompleted" = true GROUP BY "userId";
-- Certificate-linked, explicitly confirmed MATE completions preserve evidence
-- and dates. Generic opioid certificates and registration uploads do not qualify.
INSERT INTO "FederalTrainingRecord" (id, "userId", basis, "completedAt", "evidenceCertificateId", "attestedAt", notes)
SELECT DISTINCT ON (c."userId") 'legacy-mate-' || c."userId", c."userId", 'EIGHT_HOUR_TRAINING', c."completedAt", cert.id, c."createdAt",
  'Migrated certificate-linked MATE attestation ' || c.id
FROM "UserRequirementCompletion" c
JOIN "MandatoryRequirement" r ON r.id = c."mandatoryRequirementId"
JOIN "Certificate" cert ON cert.id = substring(c.notes from 19) AND cert."userId" = c."userId"
WHERE r.description ~* '^\s*(Federal\s+)?(DEA\s+)?MATE\s+Act\M' AND c.notes LIKE '__CLEARCME_CERT__:%'
ORDER BY c."userId", c."createdAt", c.id
ON CONFLICT ("userId") DO UPDATE SET
  "completedAt" = EXCLUDED."completedAt", "evidenceCertificateId" = EXCLUDED."evidenceCertificateId",
  basis = EXCLUDED.basis, notes = EXCLUDED.notes;
COMMIT;

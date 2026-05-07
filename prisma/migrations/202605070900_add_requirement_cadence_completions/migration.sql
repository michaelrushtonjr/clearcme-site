-- Add cadence metadata for mandatory requirements and user-level completion attestations.
CREATE TYPE "RequirementCadence" AS ENUM (
  'EVERY_RENEWAL',
  'ONE_TIME',
  'FIRST_RENEWAL_ONLY',
  'EVERY_N_YEARS',
  'INITIAL_LICENSE_ONLY',
  'CONDITIONAL'
);

CREATE TYPE "RequirementCompletionSource" AS ENUM (
  'SELF_ATTESTED',
  'CERTIFICATE_UPLOAD',
  'ADMIN_ADJUSTED'
);

ALTER TABLE "MandatoryRequirement"
  ADD COLUMN "cadence" "RequirementCadence" NOT NULL DEFAULT 'EVERY_RENEWAL',
  ADD COLUMN "intervalYears" INTEGER,
  ADD COLUMN "lookbackYears" INTEGER,
  ADD COLUMN "attestationAllowed" BOOLEAN NOT NULL DEFAULT true;

-- Backfill conservative cadence from existing flags/notes so one-time and long-cycle
-- mandates stop behaving like ordinary every-renewal gaps.
UPDATE "MandatoryRequirement"
SET "cadence" = 'ONE_TIME'
WHERE "firstRenewalOnly" = true;

UPDATE "MandatoryRequirement"
SET "cadence" = 'EVERY_N_YEARS', "intervalYears" = 6, "lookbackYears" = 6
WHERE "firstRenewalOnly" = false
  AND (notes ILIKE '%every 6 years%' OR notes ILIKE '%every six years%');

UPDATE "MandatoryRequirement"
SET "cadence" = 'EVERY_N_YEARS', "intervalYears" = 4, "lookbackYears" = 4
WHERE "firstRenewalOnly" = false
  AND (notes ILIKE '%every 4 years%' OR notes ILIKE '%every four years%');

UPDATE "MandatoryRequirement"
SET "cadence" = 'EVERY_N_YEARS', "intervalYears" = 3, "lookbackYears" = 3
WHERE "firstRenewalOnly" = false
  AND (notes ILIKE '%every 3 years%' OR notes ILIKE '%every three years%' OR notes ILIKE '%3-year rolling%' OR notes ILIKE '%3-year cycle%');

UPDATE "MandatoryRequirement"
SET "cadence" = 'EVERY_N_YEARS', "intervalYears" = 2, "lookbackYears" = 2
WHERE "firstRenewalOnly" = false
  AND (notes ILIKE '%every 2 years%' OR notes ILIKE '%every two years%' OR notes ILIKE '%2-year sub-cycle%' OR notes ILIKE '%2-year cycle%');

CREATE TABLE "UserRequirementCompletion" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "physicianLicenseId" TEXT,
  "mandatoryRequirementId" TEXT NOT NULL,
  "topic" "SpecialTopic" NOT NULL,
  "completedAt" TIMESTAMP(3),
  "completedYear" INTEGER,
  "source" "RequirementCompletionSource" NOT NULL DEFAULT 'SELF_ATTESTED',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserRequirementCompletion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserRequirementCompletion_userId_mandatoryRequirementId_physicianLicenseId_key"
  ON "UserRequirementCompletion"("userId", "mandatoryRequirementId", "physicianLicenseId");
CREATE INDEX "UserRequirementCompletion_userId_topic_idx" ON "UserRequirementCompletion"("userId", "topic");
CREATE INDEX "UserRequirementCompletion_physicianLicenseId_idx" ON "UserRequirementCompletion"("physicianLicenseId");
CREATE INDEX "UserRequirementCompletion_mandatoryRequirementId_idx" ON "UserRequirementCompletion"("mandatoryRequirementId");

ALTER TABLE "UserRequirementCompletion"
  ADD CONSTRAINT "UserRequirementCompletion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "UserRequirementCompletion_physicianLicenseId_fkey" FOREIGN KEY ("physicianLicenseId") REFERENCES "PhysicianLicense"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "UserRequirementCompletion_mandatoryRequirementId_fkey" FOREIGN KEY ("mandatoryRequirementId") REFERENCES "MandatoryRequirement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

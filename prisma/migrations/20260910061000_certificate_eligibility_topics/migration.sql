-- Draft pending the A2 shadow-history/identity blockers. No state eligibility facts populated.
ALTER TABLE "ComplianceRule" ADD COLUMN "acceptedCreditTypes" "CreditType"[] DEFAULT ARRAY[]::"CreditType"[];
ALTER TABLE "Certificate" ADD COLUMN "suggestedSpecialTopics" "SpecialTopic"[] DEFAULT ARRAY[]::"SpecialTopic"[];
ALTER TABLE "Certificate" ADD COLUMN "extractedSpecialTopics" "SpecialTopic"[] DEFAULT ARRAY[]::"SpecialTopic"[];
ALTER TABLE "Certificate" ADD COLUMN "topicHourAllocations" JSONB NOT NULL DEFAULT '{}';
-- Preserve old keyword-only flags as suggestions; no historical extractor provenance is assumed.
UPDATE "Certificate" SET "suggestedSpecialTopics" = "specialTopics" WHERE NOT "manuallyVerified";

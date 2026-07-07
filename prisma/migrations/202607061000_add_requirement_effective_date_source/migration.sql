-- Add requirement-level effective date + primary source URL (both nullable, additive-only).
-- effectiveDate: when the requirement first became mandatory. Populate ONLY from
-- Vera/Roz-verified primary sources; UI hides the line when NULL.
-- sourceUrl: requirement-specific citation; UI falls back to ComplianceRule.sourceUrl when NULL.
ALTER TABLE "MandatoryRequirement" ADD COLUMN "effectiveDate" TIMESTAMP(3);
ALTER TABLE "MandatoryRequirement" ADD COLUMN "sourceUrl" TEXT;

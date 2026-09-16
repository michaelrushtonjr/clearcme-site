-- Review #A2-2: schema only. Run the reviewed identity backfill before constraints.
ALTER TABLE "MandatoryRequirement" ADD COLUMN "requirementKey" TEXT;
ALTER TABLE "MandatoryRequirement" ADD COLUMN "retiredAt" TIMESTAMP(3);

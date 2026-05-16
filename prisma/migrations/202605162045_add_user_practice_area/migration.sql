-- Add practice-area context so specialty/practice-setting conditional CME rules can be applied safely.
ALTER TABLE "User" ADD COLUMN "practiceArea" TEXT;

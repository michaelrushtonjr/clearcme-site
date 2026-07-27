-- Second counter for the extraction fence (additive only). extractionsUsed now
-- counts only clean full-confidence extractions (imperfect scans don't burn a
-- trial slot); extractionAttempts counts every scan that ran and backstops
-- API spend at FREE_SCAN_ATTEMPT_LIMIT. Monotonic like extractionsUsed.
-- MUST be deployed before (or with) the code that reads it.
ALTER TABLE "User" ADD COLUMN "extractionAttempts" INTEGER NOT NULL DEFAULT 0;

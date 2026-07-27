-- Lifetime AI-extraction counter for the free-tier fence (additive only).
-- Monotonic by design: never decremented on certificate delete, so the
-- 3-free-extractions trial can't be reset by upload → delete → repeat.
-- MUST be deployed before (or with) the code that reads it — the tier-fence
-- release selects User.extractionsUsed on every gated route.
ALTER TABLE "User" ADD COLUMN "extractionsUsed" INTEGER NOT NULL DEFAULT 0;

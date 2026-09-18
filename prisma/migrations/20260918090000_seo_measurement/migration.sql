-- Additive only: optional acquisition attribution and aggregate counters.
ALTER TABLE "User" ADD COLUMN "seoLandingPath" TEXT,
                   ADD COLUMN "seoChannel" TEXT,
                   ADD COLUMN "seoActivatedAt" TIMESTAMP(3);
CREATE TABLE "SeoDailyMetric" (
  "id" TEXT NOT NULL,
  "day" DATE NOT NULL,
  "event" TEXT NOT NULL,
  "landing" TEXT NOT NULL,
  "cluster" TEXT NOT NULL,
  "channel" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "SeoDailyMetric_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SeoDailyMetric_day_event_landing_channel_key" ON "SeoDailyMetric"("day", "event", "landing", "channel");
CREATE INDEX "SeoDailyMetric_day_cluster_idx" ON "SeoDailyMetric"("day", "cluster");

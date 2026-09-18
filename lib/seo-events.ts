import { cookies, headers } from "next/headers";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ACQUISITION_COOKIE, parseAcquisition, seoCluster } from "@/lib/seo-attribution";

type Metric = { event: "cta_click" | "course_click" | "registration" | "activation"; landing: string; channel: string };
export async function incrementSeoMetric(metric: Metric, db: Prisma.TransactionClient = prisma) {
  const cluster = seoCluster(metric.landing);
  if (!cluster) return;
  const day = new Date(new Date().toISOString().slice(0, 10));
  const key = { day, event: metric.event, landing: metric.landing, channel: metric.channel };
  await db.seoDailyMetric.upsert({
    where: { day_event_landing_channel: key },
    create: { ...key, cluster, count: 1 },
    update: { count: { increment: 1 } },
  });
}
export async function recordSeoRegistration(userId: string) {
  try {
    if ((await headers()).get("dnt") === "1") return;
    const acquisition = parseAcquisition((await cookies()).get(ACQUISITION_COOKIE)?.value);
    if (!acquisition) return;
    await prisma.$transaction(async (tx) => {
      const recorded = await tx.user.updateMany({ where: { id: userId, seoLandingPath: null }, data: { seoLandingPath: acquisition.landing, seoChannel: acquisition.channel } });
      if (recorded.count) await incrementSeoMetric({ event: "registration", landing: acquisition.landing, channel: acquisition.channel }, tx);
    });
  } catch {
    // Authentication must not depend on measurement availability.
    console.warn("SEO registration attribution unavailable");
  }
}
export async function recordSeoActivation(userId: string): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({ where: { id: userId }, select: { seoLandingPath: true, seoChannel: true, seoActivatedAt: true } });
    if (!user?.seoLandingPath || !seoCluster(user.seoLandingPath) || !user.seoChannel || user.seoActivatedAt) return false;
    const [license, certificate] = await Promise.all([
      tx.physicianLicense.findFirst({ where: { userId, isActive: true }, select: { id: true } }),
      tx.certificate.findFirst({ where: { userId, OR: [{ extractionStatus: "COMPLETED" }, { extractionStatus: "MANUAL", manuallyVerified: true }] }, select: { id: true } }),
    ]);
    if (!license || !certificate) return false;
    // Concurrent requests claim the milestone once; the count rolls back with it.
    const claimed = await tx.user.updateMany({ where: { id: userId, seoActivatedAt: null }, data: { seoActivatedAt: new Date() } });
    if (!claimed.count) return false;
    await incrementSeoMetric({ event: "activation", landing: user.seoLandingPath, channel: user.seoChannel }, tx);
    return true;
  });
}

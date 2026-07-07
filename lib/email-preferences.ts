import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/email";

/**
 * Email preference access. A missing row means defaults (all email types ON);
 * rows are created lazily the first time we need a stable unsubscribe token
 * or the user changes a setting.
 */
export async function getOrCreateEmailPreference(userId: string) {
  return prisma.emailPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export function unsubscribeUrlFor(token: string): string {
  return `${siteUrl()}/unsubscribe?token=${encodeURIComponent(token)}`;
}

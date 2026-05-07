import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import SettingsClient from "./SettingsClient";

export const metadata = {
  title: "Settings — ClearCME",
};

export default async function SettingsPage() {
  const session = await auth();
  const userId = session!.user!.id!;

  const [user, licenses, subscription] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, image: true },
    }),
    prisma.physicianLicense.findMany({
      where: { userId, isActive: true },
      orderBy: { renewalDate: "asc" },
    }),
    prisma.subscription.findUnique({
      where: { userId },
      select: {
        tier: true,
        status: true,
        stripeCustomerId: true,
        currentPeriodEnd: true,
        cancelAtPeriodEnd: true,
      },
    }),
  ]);

  const sessionEmail = session?.user?.email ?? null;
  return (
    <SettingsClient
      user={user ?? { id: userId, name: null, email: sessionEmail, image: null }}
      licenses={licenses}
      subscription={subscription}
    />
  );
}

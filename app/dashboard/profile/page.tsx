import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import FederalTrainingForm from "@/components/FederalTrainingForm";
import ProfileClient from "./ProfileClient";

export const metadata = {
  title: "Add License — ClearCME",
};

export default async function ProfilePage() {
  const session = await auth();
  const userId = session!.user!.id!;
  const [record, user] = await Promise.all([
    prisma.federalTrainingRecord.findUnique({ where: { userId } }),
    prisma.user.findUnique({ where: { id: userId }, select: { hasDeaRegistration: true, deaFirstQualifyingAt: true } }),
  ]);
  return <><FederalTrainingForm firstQualifyingAt={user?.deaFirstQualifyingAt?.toISOString() ?? null} record={record ? { basis: record.basis, completedAt: record.completedAt?.toISOString() ?? null, notes: record.notes } : null} registered={user?.hasDeaRegistration ?? null} /><ProfileClient userName={session?.user?.name ?? null} /></>;
}

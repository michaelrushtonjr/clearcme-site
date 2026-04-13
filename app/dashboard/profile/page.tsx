import { auth } from "@/auth";
import ProfileClient from "./ProfileClient";

export const metadata = {
  title: "Add License — ClearCME",
};

export default async function ProfilePage() {
  const session = await auth();
  return <ProfileClient userName={session?.user?.name ?? null} />;
}

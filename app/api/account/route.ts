import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { AccountDeletionError, deleteAccount } from "@/lib/account-deletion";

const PRIVATE_HEADERS = { "Cache-Control": "no-store" };

// DELETE /api/account — permanent, self-serve account deletion (also the
// in-app deletion path App Store guideline 5.1.1(v) requires).
// Body: { "confirm": "DELETE" }
export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: PRIVATE_HEADERS });

  const body = (await req.json().catch(() => ({}))) as { confirm?: unknown };
  if (body.confirm !== "DELETE") return NextResponse.json({ error: "Type DELETE to confirm." }, { status: 400, headers: PRIVATE_HEADERS });

  try {
    await deleteAccount(session.user.id);
    return NextResponse.json({ deleted: true }, { headers: PRIVATE_HEADERS });
  } catch (error) {
    if (error instanceof AccountDeletionError) return NextResponse.json({ error: error.message }, { status: error.status, headers: PRIVATE_HEADERS });
    console.error("[account] Account deletion failed");
    return NextResponse.json({ error: "Something went wrong and your account was not deleted. Try again, or email hello@clearcme.ai." }, { status: 500, headers: PRIVATE_HEADERS });
  }
}

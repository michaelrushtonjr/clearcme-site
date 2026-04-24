import { NextResponse } from "next/server";

export async function GET() {
  const secret = process.env.GOOGLE_CLIENT_SECRET || "";
  const authSecret = process.env.AUTH_SECRET || "";
  return NextResponse.json({
    googleSecretPrefix: secret.substring(0, 10),
    googleSecretLength: secret.length,
    authSecretPrefix: authSecret.substring(0, 6),
    authSecretLength: authSecret.length,
    // Check for common issues
    googleSecretHasNewline: secret.includes("\n"),
    googleSecretHasQuote: secret.includes('"'),
    googleSecretHasSpace: secret.includes(" "),
    authSecretHasNewline: authSecret.includes("\n"),
  });
}

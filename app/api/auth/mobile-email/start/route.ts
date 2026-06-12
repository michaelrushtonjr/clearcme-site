import { NextResponse } from "next/server";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: Request) {
  const { email } = await req.json().catch(() => ({})) as { email?: string };

  if (!email || !/.+@.+\..+/.test(email)) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400, headers: CORS_HEADERS });
  }

  return NextResponse.json(
    {
      error:
        "Mobile email sign-in needs a native magic-link callback before it can issue app sessions. Use Gmail or Apple for now.",
    },
    { status: 501, headers: CORS_HEADERS }
  );
}

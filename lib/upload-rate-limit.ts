import { NextResponse } from "next/server";

const windows = new Map<string, { count: number; resetAt: number }>();
// ASTRA-TODO(C-1): Replace this per-instance limiter with shared KV before relying on it across Vercel instances.
export function limitCertificateUpload(userId: string, now = Date.now()): NextResponse | null {
  for (const [key, value] of windows) if (value.resetAt <= now) windows.delete(key);
  const window = windows.get(userId) ?? { count: 0, resetAt: now + 60_000 };
  windows.set(userId, window);
  if (window.count >= 10) return NextResponse.json({ error: "Too many uploads. Try again in a minute." }, {
    status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((window.resetAt - now) / 1000))) },
  });
  window.count += 1;
  return null;
}

import Link from "next/link";
import { BrandLockup } from "@/components/BrandLockup";
import { BrandPanel } from "@/components/login/BrandPanel";

// NextAuth's pages.verifyRequest points here (auth.ts) — users land on this
// page right after requesting a magic link. The address is deliberately NOT
// in the URL (matching Auth.js's default), so the copy stays generic.

export const metadata = {
  title: "Check your email — ClearCME",
  description: "A sign-in link is on its way to your inbox.",
};

export default function CheckEmailPage() {
  return (
    <div className="c1b">
      <div className="c1b-login">
        <BrandPanel />

        <main className="form-panel">
          <div className="form-col">
            <div className="mobile-brand">
              <BrandLockup href="/" size="md" />
            </div>

            <h2 className="form-title">Check your email</h2>
            <p className="form-sub">A sign-in link is on its way.</p>

            <div className="form-card" style={{ textAlign: "center" }}>
              <div className="sent-check">
                <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <p className="form-sub" style={{ marginBottom: 0 }}>
                We sent a sign-in link to the address you entered. The link expires
                in 24 hours and can be used once.
              </p>
            </div>

            <p className="form-foot">
              Nothing after a minute? Check your spam folder, or{" "}
              <Link href="/login">request a new link</Link>.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

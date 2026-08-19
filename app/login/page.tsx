"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { signOutAndClear } from "@/lib/client-sign-out";
import { BrandLockup } from "@/components/BrandLockup";
import { BrandPanel } from "@/components/login/BrandPanel";

// Email magic link is only available when RESEND_API_KEY is configured.
// On production without the key, we show Google-only sign-in.
const EMAIL_ENABLED = !!process.env.NEXT_PUBLIC_EMAIL_SIGNIN_ENABLED;
const APPLE_ENABLED = !!process.env.NEXT_PUBLIC_APPLE_SIGNIN_ENABLED;

// Demo mode (Phase 4): read-only sample persona at /demo, no sign-up.
const DEMO_ENTRY_ENABLED = true;

// Human-readable copy for NextAuth's ?error= codes. Anything unlisted gets
// the generic message rather than leaking a raw error code.
const AUTH_ERROR_COPY: Record<string, string> = {
  OAuthAccountNotLinked:
    "That sign-in belongs to a different ClearCME account than the one this browser is signed in to.",
  AccessDenied: "Sign-in was cancelled or not permitted.",
  Verification: "That sign-in link has expired or was already used. Request a new one below.",
  Configuration: "Sign-in is misconfigured on our end. Please try again shortly.",
};

function AuthErrorNotice({ error }: { error: string }) {
  // The login page has no SessionProvider, so ask next-auth's session
  // endpoint directly to find out who (if anyone) this browser is signed in
  // as — OAuthAccountNotLinked is almost always caused by an active session.
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setSessionEmail(s?.user?.email ?? null))
      .catch(() => {});
  }, []);

  const isNotLinked = error === "OAuthAccountNotLinked";
  const message =
    AUTH_ERROR_COPY[error] ?? "Something went wrong signing you in. Please try again.";

  return (
    <div className="error-note" role="alert">
      <p>{message}</p>
      {isNotLinked && (
        <>
          {sessionEmail && (
            <p style={{ marginTop: 8 }}>
              You&apos;re currently signed in as <strong>{sessionEmail}</strong>.
            </p>
          )}
          <button onClick={() => signOutAndClear({ callbackUrl: "/login" })}>
            Sign out, then try again
          </button>
        </>
      )}
    </div>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const [email, setEmail] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await signIn("resend", { email, callbackUrl: "/dashboard" });
    setEmailSent(true);
    setLoading(false);
  };

  return (
    <div className="c1b">
      <div className="c1b-login">
        <BrandPanel />

        <main className="form-panel">
          <div className="form-col">
            <div className="mobile-brand">
              <BrandLockup href="/" size="md" />
            </div>

            <h2 className="form-title">Welcome back</h2>
            <p className="form-sub">Sign in to see where every license stands.</p>

            {error && <AuthErrorNotice error={error} />}

            <div className="form-card">
              {emailSent ? (
                <div style={{ textAlign: "center" }}>
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
                  <h3 className="form-title" style={{ fontSize: 22 }}>
                    Check your email
                  </h3>
                  <p className="form-sub">
                    We sent a sign-in link to <strong>{email}</strong>. Click the link to sign in.
                  </p>
                </div>
              ) : (
                <>
                  {APPLE_ENABLED && (
                    <button className="btn btn-apple" onClick={() => signIn("apple", { callbackUrl: "/dashboard" })}>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                      </svg>
                      Continue with Apple
                    </button>
                  )}

                  <button className="btn btn-google" onClick={() => signIn("google", { callbackUrl: "/dashboard" })}>
                    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </button>

                  {EMAIL_ENABLED && (
                    <>
                      <div className="or-row mono-label">or</div>

                      <form onSubmit={handleEmailSignIn} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        <label htmlFor="email" className="mono-label email-label">
                          Email
                        </label>
                        <input
                          id="email"
                          className="email-input"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@practice.com"
                          required
                        />
                        <button
                          type="submit"
                          className="btn btn-primary"
                          disabled={loading || !email}
                          aria-disabled={loading || !email}
                        >
                          {loading ? "Sending link…" : "Email me a sign-in link"}
                        </button>
                      </form>

                      <p className="form-helper">No passwords — we send a link that signs you in.</p>
                    </>
                  )}
                </>
              )}
            </div>

            {DEMO_ENTRY_ENABLED && !emailSent && (
              <button className="demo-card" onClick={() => (window.location.href = "/demo")}>
                <span>
                  <span className="t">New here? See it with sample data first</span>
                  <br />
                  <span className="s">Pick a state, see the requirements — no sign-up.</span>
                </span>
                <span className="arrow" aria-hidden="true">
                  →
                </span>
              </button>
            )}

            <p className="form-foot">
              By signing in you agree to our <a href="/terms">Terms</a> and{" "}
              <a href="/privacy">Privacy Policy</a>.
              <br />
              Your certificates are encrypted in transit and at rest.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}

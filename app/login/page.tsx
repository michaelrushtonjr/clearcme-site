"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { signOutAndClear } from "@/lib/client-sign-out";
import { BrandLockup } from "@/components/BrandLockup";

// Email magic link is only available when RESEND_API_KEY is configured.
// On production without the key, we show Google-only sign-in.
const EMAIL_ENABLED = !!process.env.NEXT_PUBLIC_EMAIL_SIGNIN_ENABLED;
const APPLE_ENABLED = !!process.env.NEXT_PUBLIC_APPLE_SIGNIN_ENABLED;

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
    <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
      <p>{message}</p>
      {isNotLinked && (
        <>
          {sessionEmail && (
            <p className="mt-2">
              You&apos;re currently signed in as <strong>{sessionEmail}</strong>.
            </p>
          )}
          <button
            onClick={() => signOutAndClear({ callbackUrl: "/login" })}
            className="mt-3 px-4 py-2 rounded-lg bg-red-700 text-white font-semibold hover:bg-red-800 transition-colors"
          >
            Sign out, then try again
          </button>
        </>
      )}
    </div>
  );
}

const TRUST_BULLETS = [
  { icon: "✓", text: "Free to start" },
  { icon: "✓", text: "No PHI stored — credits only" },
  { icon: "✓", text: "3-step setup: license → map → gaps" },
];

function TrustBlock() {
  return (
    <div className="flex h-full flex-col justify-center">
      <BrandLockup href="/" size="md" className="mb-8" />

      <h2 className="public-heading mb-3 text-3xl">
        CME compliance, <span className="public-accent">handled.</span>
      </h2>
      <p className="mb-8 text-sm leading-relaxed text-[var(--ink-2)]">
        Map your state license requirements, track your credits, and close gaps — before your renewal deadline.
      </p>

      <ul className="mb-10 space-y-3">
        {TRUST_BULLETS.map((b) => (
          <li key={b.text} className="flex items-center gap-3 text-sm text-[var(--ink-2)]">
            <span className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-[#fffdf6]">
              {b.icon}
            </span>
            {b.text}
          </li>
        ))}
      </ul>

      {/* Testimonial */}
      <div className="public-card public-card-soft p-5">
        <p className="mb-3 text-sm italic leading-relaxed text-[var(--ink-2)]">
          &ldquo;Finally, a CME tracker built for how I actually practice.&rdquo;
        </p>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--primary)] text-xs font-bold text-[#fffdf6]">
            EM
          </div>
          <span className="text-xs text-[var(--ink-3)]">Dr. M.R. — Emergency Medicine</span>
        </div>
      </div>
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

  const handleGoogleSignIn = () => {
    signIn("google", { callbackUrl: "/dashboard" });
  };

  const handleAppleSignIn = () => {
    signIn("apple", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="public-site flex min-h-screen items-center justify-center px-4">
      {/* Mobile value line — shown only below lg */}
      <div className="w-full max-w-sm lg:hidden">
        <div className="mb-6 flex justify-center">
          <BrandLockup href="/" size="md" />
        </div>
        <p className="mb-1 text-center text-sm text-[var(--ink-2)]">Sign in to your account</p>
        <p className="mb-4 text-center text-xs text-[var(--ink-3)]">
          Built by a board-certified physician · All 50 states + DC
        </p>
        <p className="mb-4 rounded-xl border border-[var(--line-soft)] bg-[rgba(255,253,246,0.7)] px-4 py-2 text-center text-xs text-[var(--ink-3)]">
          Free · No PHI stored · 3-step setup: license → map → gaps
        </p>

        {error && <AuthErrorNotice error={error} />}

        <AuthForm
          email={email}
          setEmail={setEmail}
          emailSent={emailSent}
          loading={loading}
          handleGoogleSignIn={handleGoogleSignIn}
          handleAppleSignIn={handleAppleSignIn}
          handleEmailSignIn={handleEmailSignIn}
        />
      </div>

      {/* Desktop two-column layout — shown only at lg+ */}
      <div className="hidden lg:grid lg:grid-cols-2 lg:gap-16 w-full max-w-4xl">
        {/* Left: trust block */}
        <TrustBlock />

        {/* Right: auth form */}
        <div className="flex flex-col justify-center">
          <div className="mb-8">
            <p className="text-sm text-[var(--ink-2)]">Sign in to your account</p>
            <p className="mt-0.5 text-xs text-[var(--ink-3)]">
              Built by a board-certified physician · All 50 states + DC
            </p>
          </div>

          {error && <AuthErrorNotice error={error} />}

          <AuthForm
            email={email}
            setEmail={setEmail}
            emailSent={emailSent}
            loading={loading}
            handleGoogleSignIn={handleGoogleSignIn}
            handleAppleSignIn={handleAppleSignIn}
            handleEmailSignIn={handleEmailSignIn}
          />
        </div>
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

interface AuthFormProps {
  email: string;
  setEmail: (v: string) => void;
  emailSent: boolean;
  loading: boolean;
  handleGoogleSignIn: () => void;
  handleAppleSignIn: () => void;
  handleEmailSignIn: (e: React.FormEvent) => void;
}

function AuthForm({
  email,
  setEmail,
  emailSent,
  loading,
  handleGoogleSignIn,
  handleAppleSignIn,
  handleEmailSignIn,
}: AuthFormProps) {
  return (
    <>
      <div className="public-card p-8">
        {emailSent ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#e7ecdd]">
              <svg
                className="h-6 w-6 text-[var(--primary)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h2 className="mb-2 text-lg font-semibold text-[var(--ink)]">
              Check your email
            </h2>
            <p className="text-sm text-[var(--ink-3)]">
              We sent a sign-in link to <strong>{email}</strong>. Click the link to sign in.
            </p>
          </div>
        ) : (
          <>
            {APPLE_ENABLED && (
              <button
                onClick={handleAppleSignIn}
                className="mb-3 flex w-full items-center justify-center gap-3 rounded-full border border-black bg-black px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#1e1e1e]"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                Continue with Apple
              </button>
            )}

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              className="mb-6 flex w-full items-center justify-center gap-3 rounded-full border border-[var(--line)] bg-[#fffdf6] px-4 py-3 text-sm font-medium text-[var(--ink-2)] transition-colors hover:bg-[#f7f2e4]"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
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
                <div className="relative mb-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[var(--line-soft)]" />
                  </div>
                  <div className="relative flex justify-center text-xs text-[var(--ink-3)]">
                    <span className="bg-[#fffdf6] px-3">or continue with email</span>
                  </div>
                </div>

                {/* Email Magic Link */}
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-1.5 block text-sm font-medium text-[var(--ink-2)]"
                    >
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      required
                      className="w-full rounded-xl border border-[var(--line)] bg-[#fffdf6] px-4 py-3 text-sm text-[var(--ink)] transition-colors placeholder:text-[var(--ink-3)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full rounded-full bg-[var(--primary)] px-4 py-3 text-sm font-semibold text-[#fffdf6] transition-colors hover:bg-[var(--primary-2)] disabled:opacity-60"
                  >
                    {loading ? "Sending link..." : "Email me a sign-in link"}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </div>

      <p className="mt-6 text-center text-xs text-[var(--ink-3)]">
        By signing in, you agree to our{" "}
        <a href="/terms" className="text-[var(--primary)] hover:underline">
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" className="text-[var(--primary)] hover:underline">
          Privacy Policy
        </a>
      </p>
    </>
  );
}

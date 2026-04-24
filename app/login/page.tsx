"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

// Email magic link is only available when RESEND_API_KEY is configured.
// On production without the key, we show Google-only sign-in.
const EMAIL_ENABLED = !!process.env.NEXT_PUBLIC_EMAIL_SIGNIN_ENABLED;

const TRUST_BULLETS = [
  { icon: "✓", text: "Free to start" },
  { icon: "✓", text: "No PHI stored — credits only" },
  { icon: "✓", text: "3-step setup: license → map → gaps" },
];

function TrustBlock() {
  return (
    <div className="flex flex-col justify-center h-full">
      <a href="/" className="inline-block mb-8">
        <span className="text-3xl font-bold tracking-tight" style={{ color: "#1E293B" }}>
          Clear<span style={{ color: "#0F766E" }}>CME</span>
        </span>
      </a>

      <h2 className="text-2xl font-bold mb-2" style={{ color: "#1E293B" }}>
        CME compliance,{" "}
        <span style={{ color: "#0F766E" }}>finally sorted.</span>
      </h2>
      <p className="text-slate-500 mb-8 text-sm leading-relaxed">
        Map your state license requirements, track your credits, and close gaps — before your renewal deadline.
      </p>

      <ul className="space-y-3 mb-10">
        {TRUST_BULLETS.map((b) => (
          <li key={b.text} className="flex items-center gap-3 text-sm text-slate-700">
            <span
              className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
              style={{ backgroundColor: "#0F766E" }}
            >
              {b.icon}
            </span>
            {b.text}
          </li>
        ))}
      </ul>

      {/* Testimonial */}
      <div className="rounded-2xl border border-slate-100 p-5" style={{ backgroundColor: "#F8FDFC" }}>
        <p className="text-slate-700 text-sm italic leading-relaxed mb-3">
          &ldquo;Finally, a CME tracker built for how I actually practice.&rdquo;
        </p>
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: "#0F766E" }}
          >
            EM
          </div>
          <span className="text-xs text-slate-500">Dr. M.R. — Emergency Medicine</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
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

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "#FAFAF7" }}>
      {/* Mobile value line — shown only below lg */}
      <div className="w-full max-w-sm lg:hidden">
        <a href="/" className="block text-center mb-6">
          <span className="text-2xl font-bold tracking-tight" style={{ color: "#1E293B" }}>
            Clear<span style={{ color: "#0F766E" }}>CME</span>
          </span>
        </a>
        <p className="text-center text-sm text-slate-600 mb-1">Sign in to your account</p>
        <p className="text-center text-xs text-slate-400 mb-4">
          Built by a board-certified physician · All 50 states + DC
        </p>
        <p className="text-center text-xs text-slate-500 mb-4 bg-teal-50 border border-teal-100 rounded-xl px-4 py-2">
          Free · No PHI stored · 3-step setup: license → map → gaps
        </p>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
            <strong>Auth error:</strong> {error}
          </div>
        )}

        <AuthForm
          email={email}
          setEmail={setEmail}
          emailSent={emailSent}
          loading={loading}
          handleGoogleSignIn={handleGoogleSignIn}
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
            <p className="text-sm text-slate-500">Sign in to your account</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Built by a board-certified physician · All 50 states + DC
            </p>
          </div>

          <AuthForm
            email={email}
            setEmail={setEmail}
            emailSent={emailSent}
            loading={loading}
            handleGoogleSignIn={handleGoogleSignIn}
            handleEmailSignIn={handleEmailSignIn}
          />
        </div>
      </div>
    </div>
  );
}

interface AuthFormProps {
  email: string;
  setEmail: (v: string) => void;
  emailSent: boolean;
  loading: boolean;
  handleGoogleSignIn: () => void;
  handleEmailSignIn: (e: React.FormEvent) => void;
}

function AuthForm({
  email,
  setEmail,
  emailSent,
  loading,
  handleGoogleSignIn,
  handleEmailSignIn,
}: AuthFormProps) {
  return (
    <>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        {emailSent ? (
          <div className="text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: "#F0FDFA" }}
            >
              <svg
                className="w-6 h-6"
                style={{ color: "#0F766E" }}
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
            <h2 className="text-lg font-semibold mb-2" style={{ color: "#1E293B" }}>
              Check your email
            </h2>
            <p className="text-sm text-slate-500">
              We sent a magic link to <strong>{email}</strong>. Click the link to sign in.
            </p>
          </div>
        ) : (
          <>
            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors mb-6"
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
                    <div className="w-full border-t border-slate-200" />
                  </div>
                  <div className="relative flex justify-center text-xs text-slate-400">
                    <span className="bg-white px-3">or continue with email</span>
                  </div>
                </div>

                {/* Email Magic Link */}
                <form onSubmit={handleEmailSignIn} className="space-y-4">
                  <div>
                    <label
                      htmlFor="email"
                      className="block text-sm font-medium text-slate-700 mb-1.5"
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
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-colors text-sm"
                      style={{ "--tw-ring-color": "#0F766E" } as React.CSSProperties}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full px-4 py-3 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 text-sm"
                    style={{ backgroundColor: "#0F766E" }}
                  >
                    {loading ? "Sending link..." : "Send magic link"}
                  </button>
                </form>
              </>
            )}
          </>
        )}
      </div>

      <p className="text-center text-xs text-slate-400 mt-6">
        By signing in, you agree to our{" "}
        <a href="/terms" className="hover:underline" style={{ color: "#0F766E" }}>
          Terms
        </a>{" "}
        and{" "}
        <a href="/privacy" className="hover:underline" style={{ color: "#0F766E" }}>
          Privacy Policy
        </a>
      </p>
    </>
  );
}

import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { renderMagicLinkEmail } from "@/lib/email";

const providers = [
  ...(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET
    ? [
        Apple({
          clientId: process.env.AUTH_APPLE_ID,
          clientSecret: process.env.AUTH_APPLE_SECRET,
          // Safe: Apple emails are always verified; rationale at the Google
          // provider's matching flag below.
          allowDangerousEmailAccountLinking: true,
        }),
      ]
    : []),
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    // "Dangerous" only if a provider can hand us an unverified email — Google
    // and Apple never do. Without this, a user whose email already exists
    // (magic link, other provider, or mobile find-or-create-by-email) bounces
    // with error=OAuthAccountNotLinked instead of signing in.
    allowDangerousEmailAccountLinking: true,
  }),
  ...(process.env.RESEND_API_KEY
    ? [
        Resend({
          apiKey: process.env.RESEND_API_KEY,
          from: process.env.EMAIL_FROM ?? "noreply@clearcme.ai",
          // Branded sign-in email. Mirrors the default provider send exactly
          // (same Resend endpoint, same throw-on-failure) with our subject
          // and template swapped in — the default is an unbranded Auth.js
          // card with a cobalt button and subject "Sign in to clearcme.ai".
          async sendVerificationRequest({ identifier, url, provider }) {
            const { subject, html, text } = renderMagicLinkEmail({ url });
            const res = await fetch("https://api.resend.com/emails", {
              method: "POST",
              headers: {
                Authorization: `Bearer ${provider.apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                from: provider.from,
                to: identifier,
                subject,
                html,
                text,
              }),
            });
            if (!res.ok) {
              throw new Error("Resend error: " + JSON.stringify(await res.json()));
            }
          },
        }),
      ]
    : []),
];

// Apple's OAuth callback arrives as a cross-site form_post from
// appleid.apple.com. SameSite=Lax cookies (the default) are NOT sent on
// cross-site POSTs, so the state/PKCE/nonce checks fail and sign-in bounces
// back to /login. These three short-lived check cookies must be
// SameSite=None in production. Session cookies stay at their Lax default.
const isProd = process.env.NODE_ENV === "production";
const crossSiteCheckCookie = (name: string) => ({
  name,
  options: {
    httpOnly: true,
    sameSite: "none" as const,
    secure: true,
    path: "/",
  },
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  debug: false,
  ...(isProd
    ? {
        cookies: {
          state: crossSiteCheckCookie("__Secure-authjs.state"),
          pkceCodeVerifier: crossSiteCheckCookie("__Secure-authjs.pkce.code_verifier"),
          nonce: crossSiteCheckCookie("__Secure-authjs.nonce"),
          // Also needed at Apple's cross-site form_post callback: without it,
          // Auth.js forgets the post-login destination and dumps users on "/".
          callbackUrl: {
            name: "__Secure-authjs.callback-url",
            options: { sameSite: "none" as const, secure: true, path: "/" },
          },
        },
      }
    : {}),
  pages: {
    signIn: "/login",
    error: "/login",
    // Branded check-your-email page instead of Auth.js's unstyled default
    // at /api/auth/verify-request.
    verifyRequest: "/login/check-email",
  },
  callbacks: {
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});

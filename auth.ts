import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

const providers = [
  ...(process.env.AUTH_APPLE_ID && process.env.AUTH_APPLE_SECRET
    ? [
        Apple({
          clientId: process.env.AUTH_APPLE_ID,
          clientSecret: process.env.AUTH_APPLE_SECRET,
        }),
      ]
    : []),
  Google({
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  }),
  ...(process.env.RESEND_API_KEY
    ? [
        Resend({
          apiKey: process.env.RESEND_API_KEY,
          from: process.env.EMAIL_FROM ?? "noreply@clearcme.ai",
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
        },
      }
    : {}),
  pages: {
    signIn: "/login",
    error: "/login",
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

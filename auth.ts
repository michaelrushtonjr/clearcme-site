import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// Store last error for debug endpoint
export let lastAuthError: unknown = null;

const providers = [
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

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers,
  debug: false,
  pages: {
    signIn: "/login",
  },
  logger: {
    error(error) {
      lastAuthError = {
        message: error.message,
        name: error.name,
        cause: error.cause,
        stack: error.stack?.split("\n").slice(0, 10),
        time: new Date().toISOString(),
      };
      console.error("[AUTH ERROR FULL]", JSON.stringify(lastAuthError, null, 2));
    },
    warn(code) {
      console.warn("[auth][warn]", code);
    },
    debug(message, metadata) {
      console.log("[auth][debug]", message, metadata);
    },
  },
  callbacks: {
    async signIn({ user, account, profile }) {
      console.log("[auth][signIn callback]", { 
        userId: user?.id, 
        email: user?.email,
        provider: account?.provider,
        hasProfile: !!profile 
      });
      return true;
    },
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
  },
});

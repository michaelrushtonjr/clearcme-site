import { afterEach, expect, it, vi } from "vitest";
import type { NextAuthConfig } from "next-auth";
import type { Account } from "next-auth";
import { prismaMock } from "../helpers/prisma-mock";
const state = vi.hoisted(() => ({ config: null as NextAuthConfig | null }));
vi.mock("next-auth", () => ({ default: (config: NextAuthConfig) => { state.config = config; return {}; } }));
vi.mock("@/lib/google-ads-registration", () => ({ queueGoogleAdsRegistration: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ trackSignup: vi.fn() }));
vi.mock("@/lib/seo-events", () => ({ recordSeoRegistration: vi.fn() }));
import { queueGoogleAdsRegistration } from "@/lib/google-ads-registration";
import { trackSignup } from "@/lib/analytics";
import { recordSeoRegistration } from "@/lib/seo-events";
import "@/auth";
afterEach(() => vi.unstubAllEnvs());

it("queues the actual successful new-user sign-in and preserves first-party signup behavior", async () => {
  const user = { id: "private-user", email: "doctor@example.invalid", name: "Doctor" };
  await state.config!.events!.createUser!({ user });
  expect(recordSeoRegistration).toHaveBeenCalledWith("private-user");
  expect(queueGoogleAdsRegistration).not.toHaveBeenCalled();
  for (const provider of ["google", "apple", "resend"]) await state.config!.events!.signIn!({ user, account: { provider } as Account, isNewUser: true });
  expect(queueGoogleAdsRegistration).toHaveBeenCalledTimes(3);
  expect(queueGoogleAdsRegistration).toHaveBeenCalledWith("private-user", true);
  expect(trackSignup).toHaveBeenLastCalledWith(user, "email", "web");
  expect(prismaMock.user.create).not.toHaveBeenCalled();
});
it("a returning sign-in cannot create an Ads registration", async () => {
  await state.config!.events!.signIn!({ user: { id: "returning" }, isNewUser: false });
  expect(queueGoogleAdsRegistration).not.toHaveBeenCalled(); expect(trackSignup).not.toHaveBeenCalled();
});

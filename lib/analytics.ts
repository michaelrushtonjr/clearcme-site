import { after } from "next/server";
import { PostHog } from "posthog-node";

type Properties = Record<string, string | number | boolean | null | undefined>;

let client: PostHog | null | undefined;

// Off unless NEXT_PUBLIC_POSTHOG_KEY is set. In Vercel it is set for
// Production only, so local dev, tests and preview builds send nothing.
function getClient(): PostHog | null {
  if (client === undefined) {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    client = key
      ? new PostHog(key, {
          host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
          flushAt: 1,
          flushInterval: 0,
        })
      : null;
  }
  return client;
}

/**
 * Records a product event in PostHog, keyed by the account id (the same id the
 * browser identifies with, so server events and session recordings land on
 * one person). Sent after the response, so it never slows a request, and it
 * never throws: nothing a user does may depend on measurement being available.
 */
export function trackEvent(
  userId: string,
  event: string,
  properties: Properties = {},
  person?: { set?: Properties; setOnce?: Properties },
) {
  const posthog = getClient();
  if (!posthog) return;
  const send = () =>
    posthog
      .captureImmediate({
        distinctId: userId,
        event,
        properties: {
          ...properties,
          ...(person?.set && { $set: person.set }),
          ...(person?.setOnce && { $set_once: person.setOnce }),
        },
      })
      .catch(() => console.warn(`analytics: ${event} not recorded`));
  try {
    after(send);
  } catch {
    // Called outside a request (a script): send without waiting.
    void send();
  }
}

/** A new account was created, by any sign-in path. */
export function trackSignup(
  user: { id: string; email?: string | null; name?: string | null },
  method: string,
  source: "web" | "ios_app",
) {
  trackEvent(
    user.id,
    "user_signed_up",
    { method, source },
    {
      set: { email: user.email, name: user.name },
      setOnce: { signed_up_at: new Date().toISOString(), signup_method: method, signup_source: source },
    },
  );
}

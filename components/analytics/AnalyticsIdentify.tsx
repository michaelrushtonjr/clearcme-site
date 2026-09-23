"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

/**
 * Ties this browser's page views and session recordings to the signed-in
 * account, so they line up with the server's signup, license and certificate
 * events for the same person.
 */
export function AnalyticsIdentify({
  userId,
  email,
  name,
}: {
  userId: string;
  email?: string | null;
  name?: string | null;
}) {
  useEffect(() => {
    if (!posthog.__loaded) return;
    posthog.identify(userId, { email: email ?? undefined, name: name ?? undefined });
  }, [userId, email, name]);
  return null;
}

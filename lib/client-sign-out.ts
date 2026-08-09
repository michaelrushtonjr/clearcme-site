"use client";

import { signOut } from "next-auth/react";

/**
 * Setup-wizard progress is parked in sessionStorage under a per-user key
 * (see app/dashboard/setup/SetupWizard.tsx). The prefix also matches the
 * legacy un-keyed "clearcme-setup-wizard" entry left by older sessions.
 */
export const WIZARD_STORAGE_PREFIX = "clearcme-setup-wizard";

export function wizardStorageKey(userId: string) {
  return `${WIZARD_STORAGE_PREFIX}:${userId}`;
}

/**
 * Sign out via next-auth, first dropping any wizard state so the next
 * account signing in on this tab starts the wizard fresh.
 */
export function signOutAndClear(options?: { callbackUrl?: string }) {
  try {
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key?.startsWith(WIZARD_STORAGE_PREFIX)) {
        sessionStorage.removeItem(key);
      }
    }
  } catch {
    // Storage unavailable — nothing parked, nothing to clear.
  }
  return signOut(options);
}

"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};

/** True when the page is running inside the ClearCME iOS app's web view. */
export function useAppShell(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => document.documentElement.getAttribute("data-app-shell") === "ios",
    () => false
  );
}

// Opening the printable compliance report. Browsers and in-app web views can
// refuse a new window; the caller falls back to showing the report on the page.

/** Escapes text for use inside the report's HTML. */
export function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** The parts of a window the report uses — narrow so tests can pass a stand-in. */
export interface ReportPopup {
  closed?: boolean;
  document: { write(html: string): void; close(): void };
  focus(): void;
  print(): void;
  close(): void;
  onload: ((this: GlobalEventHandlers, event: Event) => unknown) | null;
}

export interface ReportOpener {
  open(url?: string, target?: string, features?: string): ReportPopup | null;
}

/**
 * Tries to open the report in a new window. Returns the window with the report
 * written into it, or null when a new window is not available:
 * - inside the iPhone app's web view (never attempted there),
 * - a blocked pop-up (null, or a window that is already closed),
 * - a window that opens but cannot be written to.
 */
export function openReportPopup(html: string, opener: ReportOpener, options: { inAppShell?: boolean } = {}): ReportPopup | null {
  if (options.inAppShell) return null;
  let popup: ReportPopup | null = null;
  try {
    popup = opener.open("", "_blank", "width=900,height=700");
  } catch {
    return null;
  }
  if (!popup || popup.closed) return null;
  try {
    popup.document.write(html);
    popup.document.close();
  } catch {
    try {
      popup.close();
    } catch {
      // Nothing to clean up.
    }
    return null;
  }
  return popup;
}

/** Prints the report window once: when it has loaded, or shortly after if no load event arrives. */
export function printWhenReady(popup: ReportPopup, schedule: (run: () => void, ms: number) => unknown = setTimeout, delayMs = 600): void {
  let printed = false;
  const print = () => {
    if (printed) return;
    printed = true;
    try {
      popup.focus();
      popup.print();
    } catch {
      // The window was closed first; the report is still open for the user to print.
    }
  };
  popup.onload = print;
  schedule(print, delayMs);
}

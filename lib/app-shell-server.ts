/** User-agent marker the iOS wrapper appends to its web view requests. */
export const APP_SHELL_UA_MARKER = "ClearCMEApp";

/** True when a request comes from inside the ClearCME iOS app's web view. */
export function isAppShellRequest(req: { headers: Headers }): boolean {
  return (req.headers.get("user-agent") ?? "").includes(APP_SHELL_UA_MARKER);
}

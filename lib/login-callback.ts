/** Accept only a relative path on this origin, never an external sign-in return. */
export function loginCallbackUrl(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/dashboard';
  // Browsers strip some control characters during URL parsing (e.g. /\n/evil).
  if (/[\u0000-\u0020\u007f]/.test(value)) return '/dashboard';
  return value;
}

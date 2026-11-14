/** Accept only a relative path on this origin, never an external sign-in return. */
export function loginCallbackUrl(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return '/dashboard';
  // Browsers strip some control characters during URL parsing (e.g. /\n/evil).
  if (/[\u0000-\u0020\u007f]/.test(value)) return '/dashboard';
  return value;
}

/** A paid plan picked on a price card before signing in. */
export type ChosenPlan = 'essential' | 'pro';

/**
 * Where a "Start Essential" / "Start Pro" button sends a visitor: sign in (or
 * create the account) first, then straight on to that plan's checkout.
 */
export function planLoginHref(plan: ChosenPlan): string {
  return `/login?callbackUrl=${encodeURIComponent(`/pricing?checkout=${plan}`)}`;
}

/** The plan carried by a sign-in return path, or null when none was chosen. */
export function chosenPlan(callbackUrl: string | null | undefined): ChosenPlan | null {
  const safe = loginCallbackUrl(callbackUrl);
  let url: URL;
  try { url = new URL(safe, 'https://clearcme.ai'); } catch { return null; }
  if (url.pathname !== '/pricing') return null;
  const plan = url.searchParams.get('checkout')?.toLowerCase();
  return plan === 'essential' || plan === 'pro' ? plan : null;
}

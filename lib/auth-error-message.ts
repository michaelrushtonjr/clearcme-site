// Human-readable Auth.js errors; never expose unknown server error codes.
const AUTH_ERROR_COPY: Record<string, string> = {
  OAuthAccountNotLinked:
    "That sign-in belongs to a different ClearCME account than the one this browser is signed in to.",
  AccessDenied: "Sign-in was cancelled or not permitted.",
  Verification: "That sign-in link has expired or was already used. Please try signing in again below.",
  Configuration: "Sign-in is misconfigured on our end. Please try again shortly.",
  OAuthSignin: "We couldn't start sign-in with that provider. Please try again.",
  OAuthSignInError: "We couldn't start sign-in with that provider. Please try again.",
  OAuthCallback: "We couldn't finish sign-in with that provider. Please try again.",
  OAuthCallbackError: "We couldn't finish sign-in with that provider. Please try again.",
  EmailSignin: "We couldn't send your sign-in link. Please try again shortly.",
  EmailSignInError: "We couldn't send your sign-in link. Please try again shortly.",
};

export function authErrorMessage(error: string): string {
  return Object.hasOwn(AUTH_ERROR_COPY, error)
    ? AUTH_ERROR_COPY[error]
    : "Something went wrong signing you in. Please try again.";
}

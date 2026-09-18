/** Copy for a manual entry the server has already marked NEEDS_REVIEW. */
export function manualCertificateReviewMessage(activityDate?: Date | string | null, now = new Date()): string {
  if (activityDate && new Date(activityDate).getTime() > now.getTime()) {
    return "Saved for review — the completion date is in the future, so it doesn't count yet. Fix the date to count it.";
  }
  return "Saved for review — it doesn't count yet. Check the completion date and hours, and make sure the provider is filled in.";
}

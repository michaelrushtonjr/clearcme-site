/**
 * Counting the setup wizard's screens before the physician has finished
 * choosing.
 *
 * Four license screens always show. A fifth (practice questions) follows only
 * when a chosen license carries a requirement that maps to a question. Setup
 * used to say "Step 4 of 4" and then show that fifth screen; these helpers let
 * it say "of 5" from the start whenever the fifth screen is coming, and say no
 * total at all in the rare moment it cannot yet tell.
 *
 * Pure and client-safe: the server works out which pairs raise a question
 * (lib/practice-questions.ts) and passes them in.
 */

export const LICENSE_STEPS = 4;

export function expectsPracticeStep(input: {
  /** Pairs ("NV:MD") whose rules raise a question; null when the server could not tell. */
  questionPairs: readonly string[] | null;
  /** Licenses the user already holds raise an unanswered question. */
  hasOpenQuestions: boolean;
  /**
   * What the primary license can still turn out to be: every pair before a
   * state is chosen, both license types once it is, one pair once both are.
   */
  primaryCandidates: readonly string[];
  /** Additional licenses with both state and license type filled in. */
  additionalPairs: readonly string[];
}): boolean | null {
  if (input.hasOpenQuestions) return true;
  if (input.questionPairs === null) return null;
  const asks = new Set(input.questionPairs);
  if (input.additionalPairs.some((pair) => asks.has(pair))) return true;
  const hits = input.primaryCandidates.filter((pair) => asks.has(pair)).length;
  if (hits > 0 && hits === input.primaryCandidates.length) return true;
  if (hits === 0) return false;
  return null;
}

/** Total screens, or null while it depends on a choice not yet made. */
export function totalSetupSteps(practiceStepExpected: boolean | null): number | null {
  if (practiceStepExpected === null) return null;
  return practiceStepExpected ? LICENSE_STEPS + 1 : LICENSE_STEPS;
}

/**
 * When the plan refuses an additional license, the licenses before it are
 * already saved. These are the cards to keep if the physician carries on
 * without the refused one: everything ahead of it that was complete enough to
 * have been submitted. The refused card and any after it are dropped — the
 * limit that stopped one stops the rest.
 */
export function keptAfterRefusal<T extends { state: string; licenseType: string }>(
  additionalLicenses: readonly T[],
  refusedIndex: number
): T[] {
  return additionalLicenses
    .slice(0, Math.max(0, refusedIndex))
    .filter((license) => license.state && license.licenseType);
}

function listNames(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/**
 * One plain sentence set for the refusal: what is saved, what was left out,
 * and that carrying on is possible. Names no plan or price (it also shows
 * inside the iPhone app).
 */
export function licenseRefusalSummary(input: {
  savedLicenses: number;
  primaryStateName: string;
  /** State names on the refused card and the complete cards after it. */
  droppedStateNames: readonly string[];
}): string {
  const saved =
    input.savedLicenses <= 1
      ? `Your ${input.primaryStateName} license is saved.`
      : `Your first ${input.savedLicenses} licenses are saved.`;
  const dropped =
    input.droppedStateNames.length === 0
      ? "The other license was not added."
      : `${listNames(input.droppedStateNames)} ${input.droppedStateNames.length === 1 ? "was" : "were"} not added.`;
  const next =
    input.savedLicenses <= 1
      ? `You can continue with ${input.primaryStateName} now.`
      : "You can continue with those now.";
  return `${saved} ${dropped} ${next}`;
}

/** Button label for carrying on with the licenses that were saved. */
export function continueWithSavedLabel(savedLicenses: number): string {
  return savedLicenses <= 1 ? "Continue with one state →" : `Continue with ${savedLicenses} states →`;
}

/** "Step 3 of 5", or just "Step 3" when the total is not known yet. */
export function setupStepLabel(step: number, total: number | null): string {
  return total === null ? `Step ${step}` : `Step ${step} of ${total}`;
}

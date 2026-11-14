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

/** "Step 3 of 5", or just "Step 3" when the total is not known yet. */
export function setupStepLabel(step: number, total: number | null): string {
  return total === null ? `Step ${step}` : `Step ${step} of ${total}`;
}

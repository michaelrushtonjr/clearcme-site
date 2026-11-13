// What a rule's own hours label says about recurrence.
//
// Reads the label only ("2 hrs per cycle", "Initial + every 4 years") and
// never the note, which carries conditions and one-off extras such as
// "Plus 3 hrs at initial licensure". Nothing here asserts a cadence for the
// sync. It exists so that a one-time, initial-license-only or
// first-renewal-only cadence can never be stored against a label that says
// the rule recurs.
const ONE_TIME_KINDS = ['ONE_TIME', 'FIRST_RENEWAL_ONLY', 'INITIAL_LICENSE_ONLY'];

const RECURRING = new RegExp([
  // every 4 years, every renewal, every third renewal, each full CSR renewal period
  '\\b(?:every|each)\\s+(?:[\\w-]+\\s+){0,3}?(?:renewals?|cycles?|years?|months?|periods?|bienni(?:um|al))\\b',
  // per cycle, per renewal cycle, per 2-year cycle, per 2 years, per biennium
  '\\bper\\s+(?:[\\w-]+\\s+){0,2}?(?:renewals?|cycles?|years?|periods?|bienni(?:um|al))\\b',
  '\\bannual(?:ly)?\\b',
  '\\bin\\s+(?:even|odd)-numbered\\s+years\\b',
].join('|'), 'i');

function labelRecurs(hours) {
  return RECURRING.test(String(hours || ''));
}

// The app shows and evaluates a row as one-time when either field says so.
function isOneTimeKind(cadence, firstRenewalOnly) {
  return ONE_TIME_KINDS.includes(cadence) || firstRenewalOnly === true;
}

module.exports = { ONE_TIME_KINDS, labelRecurs, isOneTimeKind };

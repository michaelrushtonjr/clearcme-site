// Historical inference for the fact-question report ONLY. Never used by sync.
const { labelRecurs } = require('./label-cadence');

function cadenceFor(topic) {
  const text = `${topic.hours || ''} ${topic.note || ''}`;
  // A label that says the rule recurs always wins. Wording such as "Plus 3 hrs
  // at initial licensure" or "at first renewal and every third renewal after"
  // used to turn a recurring rule into an initial-only or first-renewal-only one.
  if (!labelRecurs(topic.hours)) {
    if (/first renewal/i.test(text)) return 'FIRST_RENEWAL_ONLY';
    if (/initial/i.test(text)) return 'INITIAL_LICENSE_ONLY';
    if (/one-time|one time|within 5 years|within 3 years|required before first/i.test(text)) return 'ONE_TIME';
  }
  const years = text.match(/every\s+(\d+)\s+years?/i) || text.match(/(\d+)-year/i);
  if (years) return 'EVERY_N_YEARS';
  if (/if |when applicable|applies|depending|implementation|pending|scope-specific|exemption|may apply|separate.*condition/i.test(text)) return 'CONDITIONAL';
  return 'EVERY_RENEWAL';
}

function intervalYearsFor(topic) {
  const text = `${topic.hours || ''} ${topic.note || ''}`;
  const years = text.match(/every\s+(\d+)\s+years?/i) || text.match(/(\d+)-year/i);
  return years ? Number(years[1]) : null;
}


module.exports = { cadenceFor, intervalYearsFor };

// Historical inference for the fact-question report ONLY. Never used by sync.
function cadenceFor(topic) {
  const text = `${topic.hours || ''} ${topic.note || ''}`;
  if (/first renewal/i.test(text)) return 'FIRST_RENEWAL_ONLY';
  if (/initial/i.test(text)) return 'INITIAL_LICENSE_ONLY';
  if (/one-time|one time|within 5 years|within 3 years|required before first/i.test(text)) return 'ONE_TIME';
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

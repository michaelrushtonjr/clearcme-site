// Pure planning: no Prisma client, clock, network, or deletion operations.
const FIELDS = ['topic', 'hoursRequired', 'description', 'firstRenewalOnly', 'cadence', 'intervalYears', 'lookbackYears', 'attestationAllowed', 'notes', 'retiredAt'];
const slug = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function withRequirementKeys(state, licenseType, rows, existingRows = []) {
  const counts = new Map();
  for (const row of rows) counts.set(row.topic, (counts.get(row.topic) || 0) + 1);
  return rows.map((row) => {
    const base = `${state}:${licenseType}:${row.topic}`;
    const matches = existingRows.filter((old) => old.topic === row.topic && old.description === row.description);
    if (matches.length > 1) throw new Error(`Ambiguous requirement identity: ${base} / ${row.description}`);
    // Retain an existing identity when a source adds/removes a sibling topic.
    const requirementKey = matches[0]?.requirementKey || (counts.get(row.topic) > 1 ? `${base}:${slug(row.description)}` : base);
    return { ...row, requirementKey, retiredAt: null };
  });
}

function planSync(sourceRequirements, existingRows) {
  const source = new Map();
  const existing = new Map();
  for (const row of existingRows) {
    if (!row.requirementKey || existing.has(row.requirementKey)) throw new Error(`Duplicate/missing existing requirementKey: ${row.requirementKey}`);
    existing.set(row.requirementKey, row);
  }
  const creates = [], updates = [], retires = [];
  for (const row of sourceRequirements) {
    if (!row.requirementKey || source.has(row.requirementKey)) throw new Error(`Duplicate/missing source requirementKey: ${row.requirementKey}`);
    source.set(row.requirementKey, row);
    const before = existing.get(row.requirementKey);
    if (!before) { creates.push(row); continue; }
    const changes = {};
    for (const field of FIELDS) {
      if (field in row && JSON.stringify(before[field] ?? null) !== JSON.stringify(row[field] ?? null)) {
        changes[field] = { from: before[field] ?? null, to: row[field] ?? null };
      }
    }
    if (Object.keys(changes).length) updates.push({ requirementKey: row.requirementKey, changes });
  }
  for (const row of existingRows) {
    if (!source.has(row.requirementKey) && !row.retiredAt) retires.push({ requirementKey: row.requirementKey });
  }
  return { creates, updates, retires };
}
module.exports = { planSync, withRequirementKeys };

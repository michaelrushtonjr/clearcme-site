#!/usr/bin/env node
/**
 * Apply Vera/Roz-CONFIRMED "required since" dates to the production DB.
 *
 * Reads the fleet research queue (claude-agents/shared/effective-dates-queue.md),
 * finds lines with verdict: CONFIRMED and a filled effectiveDate + source, and
 * updates MandatoryRequirement.effectiveDate + sourceUrl. Rows are matched on
 * state + licenseType + topic + hoursRequired (+ description when present) so
 * duplicate-topic rows (e.g. NV's two OTHER_MANDATORY rows) can't cross-match.
 *
 * Usage:
 *   DATABASE_URL="postgres://…railway…" node scripts/apply-effective-dates.mjs <queue.md> [--dry-run]
 *
 * Only CONFIRMED lines are touched. Prints every update; exits non-zero if any
 * confirmed line failed to match exactly one DB row.
 */
import { readFileSync } from "node:fs";
import pg from "pg";

const [, , queuePath, ...flags] = process.argv;
const dryRun = flags.includes("--dry-run");

if (!queuePath) {
  console.error("Usage: node scripts/apply-effective-dates.mjs <effective-dates-queue.md> [--dry-run]");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required (use the Railway production URL from .env.prod).");
  process.exit(1);
}

// Line shape:
// - [x] CA DO+MD | End Of Life Care — 12 hr, One-time | "desc" | effectiveDate: 2018-01-01 | source: https://… | verdict: CONFIRMED
const LINE_RE =
  /^- \[[ xX]\] (?<state>[A-Z]{2}) (?<types>[A-Z+]+) \| (?<topicLabel>[^—|]+) — (?<hours>[\d.]+) hr[^|]* (?:\| "(?<desc>[^"]*)" )?\| effectiveDate: (?<date>\d{4}-\d{2}-\d{2}) \| source: (?<source>\S+) \| verdict: CONFIRMED\b/;

const toTopicEnum = (label) => label.trim().toUpperCase().replace(/\s+/g, "_");

const lines = readFileSync(queuePath, "utf8").split("\n");
const confirmed = [];
for (const line of lines) {
  if (!line.startsWith("- [")) continue;
  if (!/verdict: CONFIRMED\b/.test(line)) continue;
  const m = line.match(LINE_RE);
  if (!m) {
    console.error(`SKIP (CONFIRMED but unparseable — check formatting): ${line}`);
    continue;
  }
  confirmed.push({
    state: m.groups.state,
    types: m.groups.types.split("+"),
    topic: toTopicEnum(m.groups.topicLabel),
    hours: Number(m.groups.hours),
    desc: m.groups.desc ?? null,
    date: m.groups.date,
    source: m.groups.source,
    raw: line.trim(),
  });
}

if (confirmed.length === 0) {
  console.log("No CONFIRMED lines with filled dates found. Nothing to do.");
  process.exit(0);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
let updates = 0;
let failures = 0;

try {
  for (const item of confirmed) {
    for (const licenseType of item.types) {
      const params = [item.state, licenseType, item.topic, item.hours];
      let where = `cr.state = $1 AND cr."licenseType" = $2 AND mr.topic = $3 AND mr."hoursRequired" = $4`;
      if (item.desc) {
        params.push(item.desc);
        where += ` AND mr.description = $5`;
      }
      const { rows } = await pool.query(
        `SELECT mr.id, mr.description FROM "MandatoryRequirement" mr
         JOIN "ComplianceRule" cr ON cr.id = mr."complianceRuleId" WHERE ${where}`,
        params
      );
      if (rows.length !== 1) {
        failures += 1;
        console.error(
          `NO UNIQUE MATCH (${rows.length} rows) for ${item.state} ${licenseType} ${item.topic} ${item.hours}hr${item.desc ? ` "${item.desc}"` : ""} — not updated.`
        );
        continue;
      }
      if (dryRun) {
        console.log(`[dry-run] would set ${item.state} ${licenseType} ${item.topic} → effectiveDate=${item.date}, sourceUrl=${item.source}`);
      } else {
        await pool.query(
          `UPDATE "MandatoryRequirement" SET "effectiveDate" = $1, "sourceUrl" = $2 WHERE id = $3`,
          [new Date(`${item.date}T00:00:00.000Z`), item.source, rows[0].id]
        );
        console.log(`updated ${item.state} ${licenseType} ${item.topic} (${item.hours}hr) → Required since ${item.date}`);
      }
      updates += 1;
    }
  }
} finally {
  await pool.end();
}

console.log(`\n${dryRun ? "[dry-run] " : ""}${updates} row(s) ${dryRun ? "would be " : ""}updated, ${failures} failure(s).`);
process.exit(failures > 0 ? 2 : 0);

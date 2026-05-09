#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const courseFile = path.join(__dirname, '..', 'lib', 'courses.ts');
const source = fs.readFileSync(courseFile, 'utf8');
const blocks = [...source.matchAll(/\{\n\s*name: "([^"]+)"[\s\S]*?\n\s*\}/g)];
const issues = [];
let courseCount = 0;
let freeCount = 0;
let paidCount = 0;

for (const match of blocks) {
  const block = match[0];
  const name = match[1];
  const line = source.slice(0, match.index).split('\n').length;
  const price = block.match(/price: "([^"]*)"/);
  const isFree = block.match(/isFree: (true|false)/);
  const description = block.match(/description: "([\s\S]*?)",\n\s*url:/);
  if (!price || !isFree) continue;

  courseCount += 1;
  const free = isFree[1] === 'true';
  if (free) freeCount += 1;
  else paidCount += 1;

  const combined = `${price[1]} ${description?.[1] ?? ''}`;
  const lower = combined.toLowerCase();
  const dollars = [...combined.matchAll(/\$\s*([0-9][0-9,]*(?:\.\d+)?)/g)]
    .map((d) => Number(d[1].replace(/,/g, '')))
    .filter(Number.isFinite);

  const hasPositiveDollar = dollars.some((d) => d > 0);
  const hasUnconfirmedCost = /\b(tbd|not shown|unconfirmed|likely free|pricing not|price still unconfirmed|cost unconfirmed)\b/.test(lower);
  const hasPaidLanguage = /\b(paid|premium|cost is|non-members: \$|non-members can purchase)\b/.test(lower);

  if (free && (hasPositiveDollar || hasUnconfirmedCost || hasPaidLanguage)) {
    // Allow explicit free-for-everyone phrases that include the word non-member.
    const explicitlyFreeForAll = /free for all including non-members|non-member price is free|free for members and non-members alike|without subscription/.test(lower);
    if (!explicitlyFreeForAll) {
      issues.push({ line, name, price: price[1], dollars, reason: [hasPositiveDollar && 'positive $ amount', hasUnconfirmedCost && 'unconfirmed cost', hasPaidLanguage && 'paid wording'].filter(Boolean).join(', ') });
    }
  }
}

console.log(`Courses audited: ${courseCount}`);
console.log(`Free-tagged: ${freeCount}`);
console.log(`Paid/variable/unconfirmed: ${paidCount}`);

if (issues.length) {
  console.error(`\nPricing audit failed: ${issues.length} suspect free-tagged course(s).`);
  for (const issue of issues) {
    console.error(`- lib/courses.ts:${issue.line} ${issue.name} | price=${issue.price} | ${issue.reason}`);
  }
  process.exit(1);
}

console.log('Pricing audit passed: no suspect free-tagged courses.');

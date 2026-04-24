#!/usr/bin/env node
/**
 * sync-courses.js
 * Reads Scout's course catalog and updates lib/courses.ts
 *
 * Usage: node scripts/sync-courses.js
 */

const fs = require('fs');
const path = require('path');

// ── Paths ────────────────────────────────────────────────────────────────────
const CATALOG_PATH = '/Users/michaeljrushton/.openclaw/workspace-scout/course-catalog.md';
const COURSES_TS   = path.join(__dirname, '..', 'lib', 'courses.ts');
const PENDING_PATH = '/Users/michaeljrushton/.openclaw/workspace-scout/pending-review.md';

// ── Trusted providers (case-insensitive) ─────────────────────────────────────
const TRUSTED_PROVIDERS = [
  'pcss', 'pcss-moud', 'samhsa', 'ama ed hub', 'medscape', 'medscape education',
  'nejm knowledge+', 'pri-med', 'stanford', 'stanford center for cme',
  'cdc', 'aafp', 'statpearls', 'echo', 'hippo education', 'cme outfitters',
  'proce', 'freecme', 'texas medical association', 'tma',
  // Roz-verified batch — Apr 23, 2026
  'adventhealth', 'advocate health', 'advocate aurora',
  'american college of physicians', 'acp',
  'american society of addiction medicine', 'asam',
  'baptist health south florida', 'baptist health',
  'baylor college of medicine', 'bcm',
  'hca healthcare', 'medstar health',
  'memorial healthcare system',
  'the doctors company', 'doctors company',
  'university of california, san francisco', 'ucsf',
  // Eva-verified Apr 24, 2026 — ACCME accreditation confirmed on site
  'scientiacme',
];

// ── Section → TopicKey map ────────────────────────────────────────────────────
const HEADING_TO_TOPIC = {
  'opioid prescribing / dea mate act': 'OPIOID_PRESCRIBING',
  'opioid prescribing':                'OPIOID_PRESCRIBING',
  'substance use / sud':               'SUBSTANCE_USE',
  'substance use':                     'SUBSTANCE_USE',
  'ethics':                            'ETHICS',
  'implicit bias':                     'IMPLICIT_BIAS',
  'patient safety / medical errors':   'PATIENT_SAFETY',
  'patient safety':                    'PATIENT_SAFETY',
  'suicide prevention':                'SUICIDE_PREVENTION',
  'domestic violence':                 'DOMESTIC_VIOLENCE',
  'human trafficking':                 'HUMAN_TRAFFICKING',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function isTrusted(provider) {
  const p = provider.toLowerCase().trim();
  return TRUSTED_PROVIDERS.some(t => p.includes(t) || t.includes(p));
}

function parseCreditHours(raw) {
  if (!raw) return 0;
  // "Up to 10.25 hours" → 10.25, "8.0 hours (Choose 8 of 14 modules)" → 8.0
  const m = raw.match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 0;
}

function parseCost(raw) {
  if (!raw) return 0;
  const lower = raw.toLowerCase();
  if (lower.includes('free')) return 0;
  // "Free for AMA Members (varies for non-members)" → treat as 0
  if (lower.includes('free for')) return 0;
  const m = raw.match(/\$?([\d,]+(?:\.\d+)?)/);
  return m ? parseFloat(m[1].replace(',', '')) : 0;
}

function parseCostLabel(raw) {
  if (!raw) return 'Unknown';
  const lower = raw.toLowerCase();
  if (lower.startsWith('free for')) return raw.trim();
  if (lower.includes('free')) return 'Free';
  const m = raw.match(/\$?([\d,]+(?:\.\d+)?)/);
  return m ? `$${m[1]}` : raw.trim();
}

function parseDeaMate(raw) {
  if (!raw) return false;
  return raw.toLowerCase().includes('yes');
}

// ── Parse catalog ─────────────────────────────────────────────────────────────
function parseCatalog(markdown) {
  const lines = markdown.split('\n');
  const courses = [];
  let currentTopic = null;

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();

    // ## heading → detect topic
    if (line.startsWith('## ')) {
      const heading = line.slice(3).trim().toLowerCase();
      currentTopic = HEADING_TO_TOPIC[heading] || null;
      i++;
      continue;
    }

    // ### heading → start of a course entry
    if (line.startsWith('### ') && currentTopic) {
      const title = line.slice(4).trim();
      const course = {
        title,
        provider: '',
        creditHours: 0,
        creditType: '',
        cost: 0,
        costLabel: 'Unknown',
        url: '',
        accreditation: '',
        deaMateCompliant: false,
        stateAcceptance: '',
        notes: '',
        verified: '',
        topic: currentTopic,
        trusted: false,
      };

      // Read the bullet fields until next heading or empty section
      i++;
      while (i < lines.length) {
        const fl = lines[i].trim();
        if (fl.startsWith('#') || fl === '---') break;

        // Strip leading "- " bullet prefix before matching
        const fld = fl.replace(/^-\s*/, '');

        const provM = fld.match(/^\*\*Provider:\*\*\s*(.+)/);
        if (provM) { course.provider = provM[1].trim(); i++; continue; }

        const credM = fld.match(/^\*\*Credit hours:\*\*\s*(.+)/);
        if (credM) { course.creditHours = parseCreditHours(credM[1]); i++; continue; }

        const typeM = fld.match(/^\*\*Credit type:\*\*\s*(.+)/);
        if (typeM) { course.creditType = typeM[1].trim(); i++; continue; }

        const costM = fld.match(/^\*\*Cost:\*\*\s*(.+)/);
        if (costM) {
          course.cost = parseCost(costM[1]);
          course.costLabel = parseCostLabel(costM[1]);
          i++; continue;
        }

        const urlM = fld.match(/^\*\*URL:\*\*\s*(.+)/);
        if (urlM) { course.url = urlM[1].trim(); i++; continue; }

        const accredM = fld.match(/^\*\*Accreditation:\*\*\s*(.+)/);
        if (accredM) { course.accreditation = accredM[1].trim(); i++; continue; }

        const stateM = fld.match(/^\*\*State acceptance:\*\*\s*(.+)/);
        if (stateM) { course.stateAcceptance = stateM[1].trim(); i++; continue; }

        const deaM = fld.match(/^\*\*DEA MATE Act compliant:\*\*\s*(.+)/);
        if (deaM) { course.deaMateCompliant = parseDeaMate(deaM[1]); i++; continue; }

        const notesM = fld.match(/^\*\*Notes:\*\*\s*(.+)/);
        if (notesM) { course.notes = notesM[1].trim(); i++; continue; }

        const verM = fld.match(/^\*\*Verified:\*\*\s*(.+)/);
        if (verM) { course.verified = verM[1].trim(); i++; continue; }

        i++;
      }

      course.trusted = isTrusted(course.provider);
      if (course.title && course.provider) {
        courses.push(course);
      }
      continue;
    }

    i++;
  }

  return courses;
}

// ── Build Course object in lib/courses.ts shape ───────────────────────────────
function buildCourseObject(c) {
  // Derive a providerUrl from the url (origin only)
  let providerUrl = '';
  try {
    const u = new URL(c.url);
    providerUrl = `${u.protocol}//${u.hostname}`;
  } catch (_) {
    providerUrl = c.url;
  }

  const isFree = c.cost === 0;
  const isHippo = c.provider.toLowerCase().includes('hippo');

  return {
    name: c.title,
    provider: c.provider,
    providerUrl,
    credits: `${c.creditHours} ${c.creditType}`.trim(),
    creditType: 'AMA_PRA_1',
    price: c.costLabel,
    isFree,
    isHippo,
    description: c.notes || c.title,
    url: c.url,
    // extra fields retained for reference
    accreditation: c.accreditation,
    deaMateCompliant: c.deaMateCompliant,
    stateAcceptance: c.stateAcceptance,
    verified: c.verified,
  };
}

// ── Sort: free first, then by creditHours desc ────────────────────────────────
function sortCourses(courses) {
  return [...courses].sort((a, b) => {
    if (a.cost !== b.cost) return a.cost - b.cost;
    return b.creditHours - a.creditHours;
  });
}

// ── Serialise a course object to TypeScript source ───────────────────────────
function courseToTs(obj, indent = '      ') {
  const lines = ['{'];
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'string') {
      lines.push(`${indent}  ${k}: ${JSON.stringify(v)},`);
    } else if (typeof v === 'boolean') {
      lines.push(`${indent}  ${k}: ${v},`);
    } else if (typeof v === 'number') {
      lines.push(`${indent}  ${k}: ${v},`);
    }
  }
  lines.push(`${indent}}`);
  return lines.join('\n');
}

// ── Read existing courses.ts and update each topic section ───────────────────
function updateCoursesCatalog(approvedByTopic, timestamp) {
  const raw = fs.readFileSync(COURSES_TS, 'utf8');

  // We'll rebuild the COURSE_CATALOG constant from scratch,
  // preserving non-catalog keys (topicLabel, requirement) and merging courses.
  // Strategy: parse existing catalog, replace courses arrays for known topics.

  // Extract each topic block using a regex that captures the key and full block
  // Then replace the courses array within each block.

  // Parse existing COURSE_CATALOG keys and their topicLabel/requirement
  const topicMeta = {};
  const topicMetaRegex = /(\w+):\s*\{[\s\S]*?topicLabel:\s*"([^"]*)"[\s\S]*?requirement:\s*"([^"]*)"[\s\S]*?courses:\s*\[/g;
  let m;
  while ((m = topicMetaRegex.exec(raw)) !== null) {
    topicMeta[m[1]] = { topicLabel: m[2], requirement: m[3] };
  }

  // Also capture manual courses (non-Scout) keyed by name for dedup
  // We'll extract per-topic course names from the existing file
  const existingCoursesByTopic = {};
  // Match each topic's courses array
  const topicBlockRegex = /(\w+):\s*\{([\s\S]*?)(?=\n  \w+:\s*\{|\n\};)/g;
  while ((m = topicBlockRegex.exec(raw)) !== null) {
    const key = m[1];
    const block = m[2];
    const courseNames = [];
    const nameRegex = /name:\s*"([^"]*)"/g;
    let nm;
    while ((nm = nameRegex.exec(block)) !== null) {
      courseNames.push(nm[1]);
    }
    existingCoursesByTopic[key] = courseNames;
  }

  // Build new COURSE_CATALOG source
  const allTopicKeys = [
    'SUBSTANCE_USE', 'OPIOID_PRESCRIBING', 'ETHICS', 'IMPLICIT_BIAS',
    'PATIENT_SAFETY', 'SUICIDE_PREVENTION', 'DOMESTIC_VIOLENCE', 'HUMAN_TRAFFICKING'
  ];

  const topicBlocks = allTopicKeys.map(key => {
    const meta = topicMeta[key] || { topicLabel: key, requirement: 'Varies by state' };
    const scoutCourses = approvedByTopic[key] || [];
    const sorted = sortCourses(scoutCourses);
    const builtCourses = sorted.map(c => buildCourseObject(c));

    const syncComment = scoutCourses.length > 0
      ? `    // Auto-synced from Scout catalog — ${timestamp}\n`
      : `    // No Scout courses yet for this topic\n`;

    const coursesSrc = builtCourses.length > 0
      ? builtCourses.map(c => `      ${courseToTs(c)}`).join(',\n')
      : '';

    return `  ${key}: {
    topicLabel: ${JSON.stringify(meta.topicLabel)},
    requirement: ${JSON.stringify(meta.requirement)},
    courses: [
${syncComment}${coursesSrc}
    ],
  }`;
  });

  // Rebuild the file: keep everything before COURSE_CATALOG, replace the constant
  const beforeCatalog = raw.slice(0, raw.indexOf('export const COURSE_CATALOG'));
  const afterCatalog = raw.slice(raw.indexOf('/** Convert a URL-slug'));

  const newCatalogSrc = `export const COURSE_CATALOG: Record<string, TopicCatalog> = {\n${topicBlocks.join(',\n')},\n};\n\n`;

  return beforeCatalog + newCatalogSrc + afterCatalog;
}

// ── Write pending-review.md ───────────────────────────────────────────────────
function writePendingReview(pendingCourses) {
  if (pendingCourses.length === 0) {
    fs.writeFileSync(PENDING_PATH,
      '# Pending Review\n\n_No unknown providers at this time._\n');
    console.log('  No pending courses to review.');
    return;
  }

  const byTopic = {};
  for (const c of pendingCourses) {
    if (!byTopic[c.topic]) byTopic[c.topic] = [];
    byTopic[c.topic].push(c);
  }

  let md = '# ClearCME — Pending Course Review\n';
  md += '> ⚠️ Needs review — unknown provider\n\n';
  md += `_Generated: ${new Date().toISOString()}_\n\n---\n\n`;

  for (const [topic, courses] of Object.entries(byTopic)) {
    md += `## ${topic}\n\n`;
    for (const c of courses) {
      md += `### ${c.title}\n`;
      md += `> ⚠️ Needs review — unknown provider\n`;
      md += `- **Provider:** ${c.provider}\n`;
      md += `- **Credit hours:** ${c.creditHours}\n`;
      md += `- **Credit type:** ${c.creditType}\n`;
      md += `- **Cost:** ${c.costLabel}\n`;
      md += `- **URL:** ${c.url}\n`;
      md += `- **Accreditation:** ${c.accreditation}\n`;
      md += `- **State acceptance:** ${c.stateAcceptance}\n`;
      md += `- **DEA MATE Act compliant:** ${c.deaMateCompliant ? 'Yes' : 'No'}\n`;
      md += `- **Notes:** ${c.notes}\n`;
      md += `- **Verified:** ${c.verified}\n\n`;
    }
    md += '---\n\n';
  }

  fs.writeFileSync(PENDING_PATH, md);
  console.log(`  Wrote ${pendingCourses.length} pending course(s) to ${PENDING_PATH}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────
function main() {
  console.log('📚 Scout Course Sync — starting...\n');

  // 1. Read catalog
  if (!fs.existsSync(CATALOG_PATH)) {
    console.error(`ERROR: Catalog not found at ${CATALOG_PATH}`);
    process.exit(1);
  }
  const markdown = fs.readFileSync(CATALOG_PATH, 'utf8');
  console.log(`✅ Read catalog: ${CATALOG_PATH}`);

  // 2. Parse
  const allCourses = parseCatalog(markdown);
  console.log(`   Parsed ${allCourses.length} course(s) total`);

  const approvedCourses = allCourses.filter(c => c.trusted);
  const pendingCourses  = allCourses.filter(c => !c.trusted);
  console.log(`   ✅ Approved (trusted providers): ${approvedCourses.length}`);
  console.log(`   ⚠️  Pending (unknown providers):  ${pendingCourses.length}`);

  // Group approved by topic
  const approvedByTopic = {};
  for (const c of approvedCourses) {
    if (!approvedByTopic[c.topic]) approvedByTopic[c.topic] = [];
    approvedByTopic[c.topic].push(c);
  }

  // 3. Update lib/courses.ts
  const timestamp = new Date().toISOString();
  const newSrc = updateCoursesCatalog(approvedByTopic, timestamp);
  fs.writeFileSync(COURSES_TS, newSrc);
  console.log(`\n✅ Updated ${COURSES_TS}`);

  // 4. Write pending review
  console.log('\n📝 Writing pending-review.md...');
  writePendingReview(pendingCourses);

  // 5. Summary
  console.log('\n─────────────────────────────────────────');
  console.log('📊 Sync summary:');
  for (const [topic, courses] of Object.entries(approvedByTopic)) {
    console.log(`   ${topic}: ${courses.length} course(s)`);
  }
  console.log(`   TOTAL synced: ${approvedCourses.length}`);
  console.log('─────────────────────────────────────────\n');
  console.log('Done ✓');
}

main();

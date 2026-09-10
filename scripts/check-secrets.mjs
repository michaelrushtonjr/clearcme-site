import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const fingerprint = (value) => createHash('sha256').update(value).digest('hex').slice(0, 12);
const placeholder = (value) => /YOUR_|PLACEHOLDER|EXAMPLE|REPLACE_ME|\$\{|process\.env|os\.environ|\.\.\.|^undefined$/i.test(value);
export function scanText(text) {
  const findings = [];
  for (const [index, line] of text.split('\n').entries()) {
    const patterns = [
      ['database-url', /\b(?:postgres(?:ql)?|prisma\+postgres):\/\/[^\s'"`<>]+/gi],
      ['railway-host', /\b[a-z0-9.-]+\.rlwy\.net\b/gi],
      ['stripe-key', /\b(?:sk_live_|sk_test_|whsec_)[A-Za-z0-9_-]{8,}\b/g],
      ['resend-key', /\bre_[A-Za-z0-9]{16,}\b/g],
      ['blob-token', /BLOB_READ_WRITE_TOKEN\s*[:=]\s*['"`]?([^'"`\s,;]+)/g],
    ];
    for (const [kind, pattern] of patterns) {
      for (const match of line.matchAll(pattern)) {
        const value = kind === 'blob-token' ? match[1] : match[0];
        let actionable = kind !== 'railway-host' && !placeholder(value);
        if (kind === 'database-url') {
          try { const url = new URL(value); actionable = !placeholder(url.password) && Boolean(url.password) && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname) && !['password', 'pass', 'PASSWORD', 'postgres'].includes(url.password); }
          catch { actionable = false; }
        }
        if (kind === 'blob-token' && !/^vercel_blob_rw_[A-Za-z0-9_-]+$/.test(value)) actionable = false;
        findings.push({ line: index + 1, kind, fingerprint: fingerprint(value), actionable });
      }
    }
  }
  return findings;
}
export function scanTrackedFiles(cwd = process.cwd()) {
  const files = execFileSync('git', ['ls-files', '-z'], { cwd, encoding: 'utf8' }).split('\0').filter(Boolean);
  const findings = [], skipped = [];
  for (const file of files) {
    if (file.split('/').at(-1) === '.env.prod') { skipped.push(file); continue; }
    let content;
    try { content = readFileSync(`${cwd}/${file}`, 'utf8'); } catch { continue; }
    if (content.includes('\0')) continue;
    for (const finding of scanText(content)) findings.push({ file, ...finding });
  }
  return { findings, skipped };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const result = scanTrackedFiles();
  for (const hit of result.findings.filter((finding) => finding.actionable)) console.error(`${hit.file}:${hit.line} ${hit.kind} [redacted; fingerprint ${hit.fingerprint}]`);
  console.log(`${result.findings.filter((hit) => hit.actionable).length} potential credential values; ${result.skipped.length} explicitly excluded .env.prod files. No values printed.`);
  process.exitCode = result.findings.some((hit) => hit.actionable) ? 1 : 0;
}

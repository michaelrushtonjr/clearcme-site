import { expect, test } from 'vitest';
import { buildHtml } from '@/components/dashboard/ComplianceExportButton';
import { escapeHtml } from '@/lib/compliance-report-window';

test('escapeHtml neutralizes markup characters', () => {
  expect(escapeHtml(`<img src=x onerror="alert('x')"> & more`)).toBe('&lt;img src=x onerror=&quot;alert(&#39;x&#39;)&quot;&gt; &amp; more');
  expect(escapeHtml(null)).toBe('');
});

test('text read from a certificate is shown as text in the report, never as markup', () => {
  const html = buildHtml({
    licenses: [{
      state: 'PA', licenseType: 'MD', renewalDate: '2026-12-31T00:00:00.000Z', totalHoursEarned: 6, totalHoursNeeded: 100, gapHours: 94,
      overall: 'ACTION_NEEDED', isCompliant: false,
      mandatoryGaps: [{ status: 'NOT_MET', topic: 'PATIENT_SAFETY', earned: 6, needed: 12, gap: 6, isMet: false, displayName: 'Patient safety <b>bold</b>' }],
    }],
    certificates: [{ title: '<script>alert(1)</script>Risk update', provider: 'Fixture & Sons <img src=x onerror=alert(1)>', activityDate: '2026-09-01T00:00:00.000Z', creditHours: 6, creditType: 'AMA_PRA_1' }],
    totalHoursAllCerts: 6,
  });
  expect(html).not.toContain('<script>alert(1)</script>');
  expect(html).not.toContain('<img src=x');
  expect(html).not.toContain('<b>bold</b>');
  expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;Risk update');
  expect(html).toContain('Fixture &amp; Sons');
  expect(html).toContain('Patient safety &lt;b&gt;bold&lt;/b&gt;');
  expect(html).toContain('PA — MD');
});

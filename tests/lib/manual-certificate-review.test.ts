import { expect, test, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { manualCertificateReviewMessage } from '@/lib/manual-certificate-review';
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import CertificateList from '@/components/CertificateList';

test('future manual date tells the user how to make it count', () => {
  expect(manualCertificateReviewMessage('2099-01-01', new Date('2026-09-18'))).toBe("Saved for review — the completion date is in the future, so it doesn't count yet. Fix the date to count it.");
});
test.each([null, undefined, 'invalid', '2026-01-01'])('unidentified review reason gives correction guidance for %s', date => {
  expect(manualCertificateReviewMessage(date, new Date('2026-09-18'))).toContain('Check the completion date and hours');
});
test('manual review avoids extraction copy while extracted review retains it', () => {
  const base = { id: 'fixture', activityDate: '2099-01-01', creditHours: 2, extractionStatus: 'NEEDS_REVIEW' };
  const render = (fileName: string) => renderToStaticMarkup(createElement(CertificateList, { certs: [{ ...base, fileName }], totalCount: 1 }));
  expect(render('Manual entry')).toContain('Fix the date to count it.');
  expect(render('Manual entry')).not.toContain('read with confidence');
  expect(render('scan.pdf')).toContain('read with confidence');
});

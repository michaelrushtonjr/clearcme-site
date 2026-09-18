import { expect, test } from 'vitest';
import { deferUnresolved, summarizeUploadSession, type UploadedCert, type UploadResolution } from '@/components/CertificateUpload';

const cert = (over: Partial<UploadedCert> & { id: string }): UploadedCert => ({ fileName: `${over.id}.pdf`, extracted: null, ...over });
const confirmed = (id: string, hours: number, topics: string[] = []): UploadResolution => ({ id, fileName: `${id}.pdf`, outcome: 'confirmed', hours, topics });
const pending = (id: string): UploadResolution => ({ id, fileName: `${id}.pdf`, outcome: 'pending', hours: 0, topics: [] });

test('the summary claims nothing until a certificate is confirmed and saved', () => {
  expect(summarizeUploadSession([])).toEqual({ confirmedCount: 0, pendingCount: 0, hoursAdded: 0, topics: [] });
  // Moving on with a review still open makes it pending — 0 hours, needs review 1.
  expect(summarizeUploadSession([pending('a')])).toEqual({ confirmedCount: 0, pendingCount: 1, hoursAdded: 0, topics: [] });
});

test('confirmed certificates add hours and de-duplicated topics; pending ones stay separate', () => {
  const s = summarizeUploadSession([confirmed('a', 2, ['ETHICS']), confirmed('b', 1.5, ['ETHICS', 'OPIOID_PRESCRIBING']), pending('c')]);
  expect(s).toEqual({ confirmedCount: 2, pendingCount: 1, hoursAdded: 3.5, topics: ['ETHICS', 'OPIOID_PRESCRIBING'] });
});

test('"Upload another" defers only unresolved certificates that still need review', () => {
  const certs = [
    cert({ id: 'review', needsReview: true, extracted: { title: 't', provider: 'p', date: '', creditHours: 2, creditType: 'OTHER', topics: [], accreditation: '' } }),
    cert({ id: 'failed', extractionFailed: true }),
    cert({ id: 'done', extracted: { title: 't', provider: 'p', date: '', creditHours: 1, creditType: 'OTHER', topics: [], accreditation: '' } }),
    cert({ id: 'rejected', error: 'File too large.' }),
    cert({ id: 'blocked', upgradeRequired: true }),
    cert({ id: 'already', needsReview: true }),
  ];
  const next = deferUnresolved(certs, { already: confirmed('already', 2) });
  expect(Object.keys(next).sort()).toEqual(['already', 'failed', 'review']);
  expect(next.review.outcome).toBe('pending');
  expect(next.failed.outcome).toBe('pending');
  expect(next.already.outcome).toBe('confirmed'); // a saved certificate is never demoted
});

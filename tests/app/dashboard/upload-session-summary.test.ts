import { expect, test } from 'vitest';
import { deferUnresolved, resolutionFromSave, summarizeUploadSession, uploadedCertFromResponse, type UploadedCert, type UploadResolution } from '@/components/CertificateUpload';

const cert = (over: Partial<UploadedCert> & { id: string }): UploadedCert => ({ fileName: `${over.id}.pdf`, extracted: null, ...over });
const confirmed = (id: string, hours: number, topics: string[] = [], topicsToConfirm: string[] = []): UploadResolution => ({ id, fileName: `${id}.pdf`, outcome: 'confirmed', hours, topics, topicsToConfirm });
const pending = (id: string): UploadResolution => ({ id, fileName: `${id}.pdf`, outcome: 'pending', hours: 0, topics: [] });

test('the summary claims nothing until a certificate is confirmed and saved', () => {
  expect(summarizeUploadSession([])).toEqual({ confirmedCount: 0, pendingCount: 0, hoursAdded: 0, topics: [], topicsToConfirm: [] });
  // Moving on with a review still open makes it pending — 0 hours, needs review 1.
  expect(summarizeUploadSession([pending('a')])).toEqual({ confirmedCount: 0, pendingCount: 1, hoursAdded: 0, topics: [], topicsToConfirm: [] });
});

test('confirmed certificates add hours and de-duplicated topics; pending ones stay separate', () => {
  const s = summarizeUploadSession([confirmed('a', 2, ['ETHICS']), confirmed('b', 1.5, ['ETHICS', 'OPIOID_PRESCRIBING']), pending('c')]);
  expect(s).toEqual({ confirmedCount: 2, pendingCount: 1, hoursAdded: 3.5, topics: ['ETHICS', 'OPIOID_PRESCRIBING'], topicsToConfirm: [] });
});

test('a topic match saved without hours is listed as still to confirm, unless another certificate confirmed that topic', () => {
  const s = summarizeUploadSession([confirmed('a', 2, ['ETHICS'], ['PATIENT_SAFETY']), confirmed('b', 1, [], ['ETHICS', 'PATIENT_SAFETY'])]);
  expect(s.topics).toEqual(['ETHICS']);
  expect(s.topicsToConfirm).toEqual(['PATIENT_SAFETY']);
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

test('the review card keeps what the server read: date, hours, activity maximum and mandated topics', () => {
  const uploaded = uploadedCertFromResponse({
    id: 'c1', fileName: 'scan.jpg', extractionStatus: 'NEEDS_REVIEW', title: 'Risk Management Update', provider: 'Fixture Society',
    activityDate: '2023-03-15T00:00:00.000Z', creditHours: null, hoursEarned: null, activityMaxHours: 3, creditType: 'AMA_PRA_1',
    topics: ['Emergency Medicine'], accreditation: null, specialTopics: [], extractedSpecialTopics: ['PATIENT_SAFETY'], suggestedSpecialTopics: ['PATIENT_SAFETY'],
  }, 'Check the extracted details.');
  expect(uploaded.needsReview).toBe(true);
  expect(uploaded.warning).toBe('Check the extracted details.');
  expect(uploaded.extracted).toMatchObject({ activityDate: '2023-03-15T00:00:00.000Z', hoursEarned: null, activityMaxHours: 3, creditHours: 0 });
  // Free-text subjects ("Emergency Medicine") are not mandated topics.
  expect(uploaded.extracted?.mandatedTopics).toEqual(['PATIENT_SAFETY']);
  expect(uploadedCertFromResponse({ id: 'c2', fileName: 'x.pdf', extractionStatus: 'FAILED' })).toMatchObject({ extracted: null, extractionFailed: true });
});

test('a save counts as confirmed only when the server says COMPLETED, with the topics it recorded', () => {
  const c = cert({ id: 'c1' });
  expect(resolutionFromSave(c, { certificate: { extractionStatus: 'NEEDS_REVIEW', creditHours: 2 } }, 2)).toBeNull();
  expect(resolutionFromSave(c, null, 2)).toBeNull();
  // Hours went to one topic and another was left at 0: that is a decision, not something left to confirm.
  expect(resolutionFromSave(c, { certificate: { extractionStatus: 'COMPLETED', creditHours: 6, specialTopics: ['PATIENT_SAFETY'], suggestedSpecialTopics: ['ETHICS'] } }, 0))
    .toEqual({ id: 'c1', fileName: 'c1.pdf', outcome: 'confirmed', hours: 6, topics: ['PATIENT_SAFETY'], topicsToConfirm: [] });
  // Saved with no topic hours at all: the match is still to confirm.
  expect(resolutionFromSave(c, { certificate: { extractionStatus: 'COMPLETED', creditHours: 6, specialTopics: [], suggestedSpecialTopics: ['ETHICS'] } }, 0))
    .toMatchObject({ topics: [], topicsToConfirm: ['ETHICS'] });
});

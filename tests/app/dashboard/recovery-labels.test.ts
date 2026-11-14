import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
const advanced = vi.hoisted(() => ({ enabled: false, calls: 0 }));
// useState calls per ExtractedCreditCard render: showAdvanced, confirmed, fields,
// saving, saveError, plus the topic-hours split. showAdvanced is the first.
const EXTRACTED_CARD_STATES = 6;
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>();
  return { ...react, useState: (initial: unknown) => {
    // Enter each extracted card's "Fix something" state for the markup check.
    const value = advanced.enabled && advanced.calls++ % EXTRACTED_CARD_STATES === 0 ? true : initial;
    return react.useState(value);
  } };
});
import { ManualEntryForm } from '@/components/CertificateList';
import { NeedsReviewCard, ExtractionFailedCard, ExtractedCreditCard, type UploadedCert } from '@/components/CertificateUpload';

function check(html: string, expected: number) {
  const labels = [...html.matchAll(/<label\b[^>]*>/g)].map(m => m[0]);
  const targets = labels.map(label => /for="([^"]+)"/.exec(label)?.[1]);
  expect(targets).toHaveLength(expected);
  expect(new Set(targets).size).toBe(expected);
  const ids = [...html.matchAll(/<(?:input|select)\b[^>]*id="([^"]+)"/g)].map(m => m[1]);
  for (const target of targets) { expect(target).toBeTruthy(); expect(ids.filter(id => id === target)).toHaveLength(1); }
}
const value = (html: string, idSuffix: string) => new RegExp(`<input\\b[^>]*id="[^"]*${idSuffix}"[^>]*>`).exec(html)?.[0].match(/\bvalue="([^"]*)"/)?.[1];

test('two library recovery rows associate all five labels without collisions', () => {
  advanced.enabled = false;
  const props = { cert: { id: 'a', activityDate: null, creditHours: null, extractionStatus: 'NEEDS_REVIEW' }, onSaved: vi.fn() };
  check(renderToStaticMarkup(createElement(Fragment, null, createElement(ManualEntryForm, props), createElement(ManualEntryForm, { ...props, cert: { ...props.cert, id: 'b' } }))), 10);
});
for (const Card of [NeedsReviewCard, ExtractionFailedCard, ExtractedCreditCard]) {
  test(`two ${Card.name} cards associate all four labels without collisions`, () => {
    advanced.enabled = Card === ExtractedCreditCard; advanced.calls = 0;
    const cert: UploadedCert = { id: 'a', fileName: 'fixture.pdf', extracted: { title: 'Fictional', provider: 'Fixture', date: '2026-09-01', creditHours: 2, creditType: 'AMA_PRA_1', topics: [], accreditation: '' } };
    const props = { cert, onReset: vi.fn(), onResolved: vi.fn() };
    check(renderToStaticMarkup(createElement(Fragment, null, createElement(Card, props), createElement(Card, { ...props, cert: { ...cert, id: 'b' } }))), 8);
    advanced.enabled = false;
  });
}

const read = (over: Partial<NonNullable<UploadedCert['extracted']>>): UploadedCert => ({
  id: 'a', fileName: 'fixture.pdf', needsReview: true,
  extracted: { title: 'Fictional risk management', provider: 'Fixture', date: 'March 15, 2023', creditHours: 0, creditType: 'AMA_PRA_1', topics: ['Emergency Medicine'], accreditation: '', ...over },
});

test('the review form starts with the date and hours the server read, and one input per mandated topic', () => {
  advanced.enabled = false;
  const cert = read({ activityDate: '2023-03-15T00:00:00.000Z', creditHours: 6, hoursEarned: 6, mandatedTopics: ['PATIENT_SAFETY'] });
  const html = renderToStaticMarkup(createElement(NeedsReviewCard, { cert, onReset: vi.fn(), onResolved: vi.fn() }));
  expect(value(html, '-date')).toBe('2023-03-15');
  expect(value(html, '-hours')).toBe('6');
  // The topic is pre-filled with the certificate's hours, on the same form.
  expect(value(html, '-topic-PATIENT_SAFETY')).toBe('6');
  expect(html).toContain('Patient Safety');
  expect(html).not.toContain('Emergency Medicine');
  expect(html).not.toContain('compliance map');
  check(html, 5);
});

test('an activity maximum is offered as a labelled suggestion the physician has to confirm', () => {
  advanced.enabled = false;
  const cert = read({ activityDate: '2023-03-15T00:00:00.000Z', creditHours: 0, hoursEarned: null, activityMaxHours: 3 });
  const html = renderToStaticMarkup(createElement(NeedsReviewCard, { cert, onReset: vi.fn(), onResolved: vi.fn() }));
  expect(value(html, '-hours')).toBe('3');
  expect(html).toContain('activity&#x27;s maximum (3 hours)');
  expect(html).toContain('saved only when you confirm');
  expect(html).toContain('Confirm 3 hours &amp; save');
});

test('the extracted card asks for topic hours next to "Looks good"', () => {
  advanced.enabled = false;
  const cert: UploadedCert = { ...read({ activityDate: '2026-09-01T00:00:00.000Z', creditHours: 6, hoursEarned: 6, mandatedTopics: ['PATIENT_SAFETY', 'ETHICS'] }), needsReview: false };
  const html = renderToStaticMarkup(createElement(ExtractedCreditCard, { cert, onReset: vi.fn(), onResolved: vi.fn() }));
  expect(html).toContain('Looks good');
  expect(value(html, '-topic-PATIENT_SAFETY')).toBe('6');
  expect(value(html, '-topic-ETHICS')).toBe('0');
  expect(html).not.toContain('Mandatory Topics Detected');
});

import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, test, vi } from 'vitest';
const advanced = vi.hoisted(() => ({ enabled: false, calls: 0 }));
vi.mock('react', async (original) => {
  const react = await original<typeof import('react')>();
  return { ...react, useState: (initial: unknown) => {
    // Enter each extracted card's "Fix something" state for the markup check.
    const value = advanced.enabled && advanced.calls++ % 5 === 0 ? true : initial;
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

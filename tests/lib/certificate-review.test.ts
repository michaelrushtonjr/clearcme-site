import { describe, expect, test } from 'vitest';
import { defaultTopicSplit, detectedTopics, formatSpecialTopic, reviewPrefill, toDateInputValue, topicAllocationsFromSplit } from '@/lib/certificate-review';

describe('review form pre-fill', () => {
  test('the date and earned hours the server returned start in the form', () => {
    expect(reviewPrefill({ activityDate: '2023-03-15T00:00:00.000Z', hoursEarned: 7.5, creditHours: 7.5, activityMaxHours: 12 }))
      .toEqual({ date: '2023-03-15', hours: '7.5', hoursSource: 'earned', activityMaxHours: 12 });
  });

  test('earned hours always win over the activity maximum', () => {
    expect(reviewPrefill({ hoursEarned: 1, activityMaxHours: 20 }).hours).toBe('1');
    expect(reviewPrefill({ creditHours: 2, activityMaxHours: 20 }).hoursSource).toBe('earned');
  });

  test('with no earned hours the activity maximum is offered, and marked as a suggestion', () => {
    expect(reviewPrefill({ activityDate: new Date('2023-03-15T00:00:00Z'), hoursEarned: null, creditHours: null, activityMaxHours: 3 }))
      .toEqual({ date: '2023-03-15', hours: '3', hoursSource: 'activity_maximum', activityMaxHours: 3 });
  });

  test('nothing read leaves the form blank', () => {
    expect(reviewPrefill({ activityDate: null, hoursEarned: null, creditHours: 0, activityMaxHours: null }))
      .toEqual({ date: '', hours: '', hoursSource: 'none', activityMaxHours: null });
    expect(toDateInputValue('not a date')).toBe('');
  });
});

describe('topic hours', () => {
  test('detected topics are de-duplicated: confirmed, then read from the certificate, then inferred', () => {
    expect(detectedTopics({ specialTopics: ['ETHICS'], extractedSpecialTopics: ['PATIENT_SAFETY', 'ETHICS'], suggestedSpecialTopics: ['PATIENT_SAFETY', 'OPIOID_PRESCRIBING'] }))
      .toEqual(['ETHICS', 'PATIENT_SAFETY', 'OPIOID_PRESCRIBING']);
    expect(detectedTopics({})).toEqual([]);
  });

  test('the first topic starts with all of the hours; the same hours are not counted twice', () => {
    expect(defaultTopicSplit(['PATIENT_SAFETY'], 6)).toEqual({ PATIENT_SAFETY: '6' });
    expect(defaultTopicSplit(['PATIENT_SAFETY', 'ETHICS'], 6)).toEqual({ PATIENT_SAFETY: '6', ETHICS: '0' });
    expect(defaultTopicSplit(['PATIENT_SAFETY'], null)).toEqual({ PATIENT_SAFETY: '0' });
  });

  test('a saved split is shown as saved', () => {
    expect(defaultTopicSplit(['PATIENT_SAFETY', 'ETHICS'], 6, { ETHICS: 2 })).toEqual({ PATIENT_SAFETY: '0', ETHICS: '2' });
    // An unrelated or empty saved value does not count as a split.
    expect(defaultTopicSplit(['PATIENT_SAFETY'], 6, { OTHER_MANDATORY: 1 })).toEqual({ PATIENT_SAFETY: '6' });
    expect(defaultTopicSplit(['PATIENT_SAFETY'], 6, [])).toEqual({ PATIENT_SAFETY: '6' });
  });

  test('only topics with hours are sent', () => {
    expect(topicAllocationsFromSplit({ PATIENT_SAFETY: '4', ETHICS: '0', OPIOID_PRESCRIBING: '' }, 6))
      .toEqual({ allocations: { PATIENT_SAFETY: 4 }, error: null });
    expect(topicAllocationsFromSplit({ PATIENT_SAFETY: '0' }, 6)).toEqual({ allocations: {}, error: null });
  });

  test('topic hours cannot exceed the hours earned, or be assigned before hours are entered', () => {
    expect(topicAllocationsFromSplit({ PATIENT_SAFETY: '4', ETHICS: '3' }, 6).error).toContain("can't add up to more than the 6 hours");
    expect(topicAllocationsFromSplit({ PATIENT_SAFETY: '2' }, 1).error).toContain('the 1 hour on');
    expect(topicAllocationsFromSplit({ PATIENT_SAFETY: '2' }, null).error).toContain('Enter the hours you earned');
    expect(topicAllocationsFromSplit({ PATIENT_SAFETY: '-1' }, 6).error).toContain('0 or more');
    expect(topicAllocationsFromSplit({ PATIENT_SAFETY: 'abc' }, 6).error).toContain('must be a number');
  });

  test('topic labels are readable', () => {
    expect(formatSpecialTopic('PATIENT_SAFETY')).toBe('Patient Safety');
    expect(formatSpecialTopic('SOMETHING_NEW')).toBe('Something New');
  });
});

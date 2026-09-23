import { expect, test } from 'vitest';
import { restoreConditionalAnswers } from '@/app/dashboard/setup/SetupWizard';

test('restores yes/no only for current server question keys', () => {
  expect(restoreConditionalAnswers([{ key: 'kept' }, { key: 'no' }, { key: 'new' }, { key: 'invalid' }], {
    kept: 'yes', no: 'no', removed: 'yes', invalid: 'maybe',
  })).toEqual({ kept: 'yes', no: 'no' });
});
test.each([null, undefined, [], 'invalid', 5])('ignores malformed draft %s', draft => {
  expect(restoreConditionalAnswers([{ key: 'fixture' }], draft)).toEqual({});
});
test('does not restore an inherited value', () => {
  expect(restoreConditionalAnswers([{ key: 'fixture' }], Object.create({ fixture: 'yes' }))).toEqual({});
});

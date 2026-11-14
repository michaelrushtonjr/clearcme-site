import { expect, test, vi } from 'vitest';
import { openReportPopup, printWhenReady, type ReportPopup } from '@/lib/compliance-report-window';

function popup(over: Partial<ReportPopup> = {}): ReportPopup {
  return { closed: false, document: { write: vi.fn(), close: vi.fn() }, focus: vi.fn(), print: vi.fn(), close: vi.fn(), onload: null, ...over };
}

test('a new window gets the report written into it', () => {
  const win = popup();
  const open = vi.fn(() => win);
  expect(openReportPopup('<html>report</html>', { open })).toBe(win);
  expect(open).toHaveBeenCalledWith('', '_blank', 'width=900,height=700');
  expect(win.document.write).toHaveBeenCalledWith('<html>report</html>');
  expect(win.document.close).toHaveBeenCalled();
});

test('a blocked pop-up is reported as unavailable instead of leaving the button waiting', () => {
  // Most browsers return null; Safari can return a window that is already closed.
  expect(openReportPopup('x', { open: () => null })).toBeNull();
  expect(openReportPopup('x', { open: () => popup({ closed: true }) })).toBeNull();
  expect(openReportPopup('x', { open: () => { throw new Error('blocked'); } })).toBeNull();
});

test('a window that cannot be written to is closed and reported as unavailable', () => {
  const win = popup({ document: { write: () => { throw new Error('denied'); }, close: vi.fn() } });
  expect(openReportPopup('x', { open: () => win })).toBeNull();
  expect(win.close).toHaveBeenCalled();
});

test('inside the iPhone app no new window is attempted', () => {
  const open = vi.fn(() => popup());
  expect(openReportPopup('x', { open }, { inAppShell: true })).toBeNull();
  expect(open).not.toHaveBeenCalled();
});

test('the report prints once: on load, or after the fallback delay if no load event arrives', () => {
  const loaded = popup();
  let fallback: () => void = () => {};
  printWhenReady(loaded, (run) => { fallback = run; });
  loaded.onload?.call({} as GlobalEventHandlers, {} as Event);
  fallback();
  expect(loaded.print).toHaveBeenCalledTimes(1);

  const silent = popup();
  printWhenReady(silent, (run) => { fallback = run; });
  fallback();
  expect(silent.focus).toHaveBeenCalledTimes(1);
  expect(silent.print).toHaveBeenCalledTimes(1);
});

test('printing a window the user already closed does not throw', () => {
  const closed = popup({ print: () => { throw new Error('closed'); } });
  let fallback: () => void = () => {};
  printWhenReady(closed, (run) => { fallback = run; });
  expect(() => fallback()).not.toThrow();
});

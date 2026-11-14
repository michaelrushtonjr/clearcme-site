import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';
import { LINK_PREVIEW_IMAGE, pageMetadata } from '@/lib/seo';

const root = path.resolve(__dirname, '../..');

test('the link preview image exists, is a 1200x630 PNG and is small enough for every network', () => {
  const file = path.join(root, 'public', LINK_PREVIEW_IMAGE.url);
  const png = readFileSync(file);
  expect(png.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  // IHDR: width and height are the first two big-endian integers after the chunk header.
  expect(png.readUInt32BE(16)).toBe(LINK_PREVIEW_IMAGE.width);
  expect(png.readUInt32BE(20)).toBe(LINK_PREVIEW_IMAGE.height);
  expect([LINK_PREVIEW_IMAGE.width, LINK_PREVIEW_IMAGE.height]).toEqual([1200, 630]);
  expect(statSync(file).size).toBeLessThan(300_000);
});

test('pages built with pageMetadata carry the image as a large card', () => {
  const meta = pageMetadata('Title', 'Description', '/pricing');
  expect(meta.openGraph).toMatchObject({ url: 'https://clearcme.ai/pricing', images: [LINK_PREVIEW_IMAGE] });
  expect(meta.twitter).toMatchObject({ card: 'summary_large_image', images: [LINK_PREVIEW_IMAGE] });
});

// A page-level `openGraph` or `twitter` object replaces the root layout's
// whole object, image included. Only the root layout and pageMetadata() may
// build one, so no public page can silently lose its preview image.
test('no page builds its own openGraph or twitter metadata', () => {
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(entry.name) && /\b(openGraph|twitter)\s*:/.test(readFileSync(full, 'utf8'))) {
        offenders.push(path.relative(root, full));
      }
    }
  };
  walk(path.join(root, 'app'));
  expect(offenders).toEqual(['app/layout.tsx']);
});

import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from 'vitest';

const root = path.resolve(__dirname, '../..');
const dir = path.join(root, 'public/images/founder');

/** Width and height from a JPEG's frame header, and whether it still carries EXIF. */
function readJpeg(file: string) {
  const data = readFileSync(file);
  expect(data.readUInt16BE(0)).toBe(0xffd8);
  let offset = 2;
  let size: [number, number] | null = null;
  let exif = false;
  while (offset < data.length && data[offset] === 0xff) {
    const marker = data[offset + 1];
    const length = data.readUInt16BE(offset + 2);
    if (marker === 0xe1 && data.toString('latin1', offset + 4, offset + 8) === 'Exif') exif = true;
    if (marker >= 0xc0 && marker <= 0xc2) size = [data.readUInt16BE(offset + 7), data.readUInt16BE(offset + 5)];
    if (marker === 0xda) break;
    offset += 2 + length;
  }
  return { size, exif, bytes: data.length };
}

test('founder photo files are the sizes their names say, small, and carry no camera metadata', () => {
  const files = readdirSync(dir).sort();
  expect(files).toEqual([
    'michael-rushton-avatar-128.jpg', 'michael-rushton-avatar-192.jpg', 'michael-rushton-avatar-64.jpg',
    'michael-rushton-portrait-200.jpg', 'michael-rushton-portrait-400.jpg', 'michael-rushton-portrait-600.jpg',
  ]);
  for (const name of files) {
    const width = Number(name.match(/-(\d+)\.jpg$/)![1]);
    const { size, exif, bytes } = readJpeg(path.join(dir, name));
    expect(size, name).toEqual(name.includes('avatar') ? [width, width] : [width, width * 1.25]);
    expect(exif, name).toBe(false);
    expect(bytes, name).toBeLessThan(name.includes('avatar') ? 40_000 : 80_000);
  }
});

test('every founder photo the pages point at exists', () => {
  const home = readFileSync(path.join(root, 'components/HomePage.tsx'), 'utf8');
  const about = readFileSync(path.join(root, 'app/about/michael-rushton/page.tsx'), 'utf8')
    .replaceAll('${PORTRAIT}', '/images/founder/michael-rushton-portrait');
  const referenced = [...`${home}\n${about}`.matchAll(/\/images\/founder\/[a-z0-9-]+\.jpg/g)].map((m) => path.basename(m[0]));
  expect(new Set(referenced)).toEqual(new Set(readdirSync(dir)));
  // The initials placeholder is gone from the home page founder block.
  expect(home).not.toContain('<div className="av">MR</div>');
  expect(home).toContain('alt="Michael Rushton, DO"');
  expect(about).toContain('alt="Michael Rushton, DO"');
});

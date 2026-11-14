// Cuts the founder photo into the sizes the site shows and writes them to
// public/images/founder/. The original (1333x2000 JPEG) is not kept in the
// repo; pass its path:
//
//   node design/founder-photo/generate.mjs /path/to/founder-headshot-michael-rushton.jpg
//
// sharp drops EXIF/IPTC metadata and writes sRGB by default.
import { createRequire } from "node:module";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const source = process.argv[2];
if (!source) {
  console.error("Usage: node design/founder-photo/generate.mjs <source photo>");
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = path.join(root, "public/images/founder");
await mkdir(outDir, { recursive: true });

// Crop boxes in source pixels (1333x2000).
// Avatar: a square around the face for the round home-page picture.
const AVATAR = { left: 185, top: 215, width: 920, height: 920 };
// Portrait: 4:5, head and shoulders, for the founder page.
const PORTRAIT = { left: 66, top: 170, width: 1200, height: 1500 };

const jobs = [
  // Home page founder block: 64 CSS px at 1x, 2x and 3x screens.
  ...[64, 128, 192].map((size) => ({ box: AVATAR, width: size, height: size, name: `michael-rushton-avatar-${size}.jpg` })),
  // Founder page: 160x200 on phones, 200x250 from 640px up, with 2x and 3x.
  ...[200, 400, 600].map((width) => ({ box: PORTRAIT, width, height: width * 1.25, name: `michael-rushton-portrait-${width}.jpg` })),
];

for (const job of jobs) {
  const info = await sharp(source)
    .rotate()
    .extract(job.box)
    .resize(job.width, job.height, { kernel: "lanczos3" })
    .jpeg({ quality: 82, mozjpeg: true, progressive: true })
    .toFile(path.join(outDir, job.name));
  console.log(`${job.name}  ${info.width}x${info.height}  ${info.size} bytes`);
}

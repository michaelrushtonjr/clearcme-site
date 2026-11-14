// Draws the link preview image (Open Graph / Twitter card, 1200x630) that
// every public page points at: public/og/clearcme-link-preview-v1.png.
//
//   node design/link-preview/generate.mjs
//
// Uses only what the site already installs: the image renderer bundled with
// Next.js (next/og) and sharp. The fonts are the site's own typefaces
// (Newsreader, Plus Jakarta Sans), copied from the @fontsource npm packages
// v5.3.0 under the SIL Open Font License (texts in ./fonts).
//
// If the picture changes, save it under a new file name (…-v2.png) and update
// LINK_PREVIEW_IMAGE in lib/seo.ts: social networks cache previews by URL.
import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { ImageResponse } = require("next/og");
const { createElement: h } = require("react");
const sharp = require("sharp");

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const OUT = path.join(root, "public/og/clearcme-link-preview-v1.png");

const WIDTH = 1200;
const HEIGHT = 630;

// Editorial Sage tokens (app/globals.css).
const INK = "#1E2920";
const INK_2 = "#3F4A40";
const BG = "#F4EFE3";
const LINE = "#DDD4BD";
const PRIMARY = "#3F5F33";

const font = async (file) => (await readFile(path.join(here, "fonts", file))).buffer;

// The ClearCME mark (public/clearcme-mark.svg) without its tile, as used on
// light surfaces by components/BrandLockup.tsx.
const mark = (size) =>
  h(
    "svg",
    { width: size, height: size, viewBox: "100 100 304 304", xmlns: "http://www.w3.org/2000/svg" },
    h("path", {
      fill: "#de5d32",
      d: "M358.13,205.88l-106.48,109.36c-1.92,1.9-4.98,1.95-6.9,.1l-24.17-23.26-11.57-10.58c-1.05-.96-1.62-2.33-1.57-3.76l-.15-32.35c.24-7.13,10.13-10.47,15.13-5.45l21.35,21.47c1.92,1.93,5.08,1.9,7.02-.07l62.82-67.63c.94-.96,2.22-1.5,3.55-1.5h34.78c7.22-.03,11.35,8.55,6.19,13.67Z",
    }),
    h("path", {
      fill: "#2b392b",
      d: "M347.98,386.5H200.17c-35.56,0-64.39-28.96-64.39-64.68V167.93c0-26.83,21.65-48.58,48.36-48.58h163.84c6.88,0,12.45,5.6,12.45,12.51v35.88c0,6.95-5.63,12.56-12.55,12.51l-142.04-1.04c-6.48-.05-11.75,5.23-11.72,11.74l.59,124.54c.03,6.89,5.6,12.45,12.45,12.45h140.8c6.88,0,12.45,5.6,12.45,12.51v33.53c0,6.91-5.58,12.51-12.45,12.51Z",
    }),
  );

const card = h(
  "div",
  {
    style: {
      width: WIDTH,
      height: HEIGHT,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      padding: "64px 76px 56px",
      backgroundColor: BG,
      color: INK,
      fontFamily: "Plus Jakarta Sans",
    },
  },
  // Brand lockup
  h(
    "div",
    { style: { display: "flex", alignItems: "center" } },
    mark(60),
    h(
      "div",
      { style: { display: "flex", marginLeft: 16, fontSize: 40, fontWeight: 700, letterSpacing: "-0.02em" } },
      h("span", { style: { color: INK } }, "Clear"),
      h("span", { style: { color: PRIMARY } }, "CME"),
    ),
  ),
  // Headline and subline
  h(
    "div",
    { style: { display: "flex", flexDirection: "column" } },
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          fontFamily: "Newsreader",
          fontSize: 82,
          lineHeight: 1.06,
          letterSpacing: "-0.022em",
        },
      },
      h("span", { style: { fontWeight: 500 } }, "Know exactly where you stand"),
      h("span", { style: { fontWeight: 400, fontStyle: "italic", color: PRIMARY } }, "for your next renewal."),
    ),
    h(
      "div",
      { style: { display: "flex", marginTop: 30, fontSize: 31, fontWeight: 500, color: INK_2 } },
      "State CME requirements for physicians, all in one place.",
    ),
  ),
  // Footer
  h(
    "div",
    {
      style: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderTop: `2px solid ${LINE}`,
        paddingTop: 24,
        fontSize: 25,
        fontWeight: 500,
        color: INK_2,
      },
    },
    h("span", { style: { fontWeight: 700, color: PRIMARY } }, "clearcme.ai"),
    h("span", null, "MD and DO licenses · Free to start"),
  ),
);

const response = new ImageResponse(card, {
  width: WIDTH,
  height: HEIGHT,
  fonts: [
    { name: "Newsreader", data: await font("newsreader-latin-500-normal.woff"), weight: 500, style: "normal" },
    { name: "Newsreader", data: await font("newsreader-latin-400-italic.woff"), weight: 400, style: "italic" },
    { name: "Plus Jakarta Sans", data: await font("plus-jakarta-sans-latin-500-normal.woff"), weight: 500, style: "normal" },
    { name: "Plus Jakarta Sans", data: await font("plus-jakarta-sans-latin-700-normal.woff"), weight: 700, style: "normal" },
  ],
});

// Flat colours: an 8-bit palette keeps the file small without visible loss.
const png = await sharp(Buffer.from(await response.arrayBuffer()))
  .png({ palette: true, colours: 128, compressionLevel: 9, effort: 10 })
  .toBuffer();

await mkdir(path.dirname(OUT), { recursive: true });
await writeFile(OUT, png);
const meta = await sharp(png).metadata();
console.log(`${path.relative(root, OUT)}  ${meta.width}x${meta.height}  ${png.length} bytes`);

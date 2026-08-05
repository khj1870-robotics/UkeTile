// Renders the app icon set (ukulele glyph) with headless Chromium and writes
// PNGs into assets/images. Deterministic: pure SVG, no external assets.
//
//   npm install --no-save playwright && node ./scripts/generate-icons.mjs
//
// Not a project dependency (only needed for regenerating these assets).
// If the installed Playwright's bundled browser version doesn't match one
// already on disk, pass an explicit path: `chromium.launch({ executablePath })`.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const imagesDir = join(root, 'assets', 'images');
mkdirSync(imagesDir, { recursive: true });

const BG = '#1D1B2E';
const ACCENT = '#F4A259';

// A simple ukulele silhouette: headstock + tuning pegs, neck, figure-8 body
// (two overlapping circles), sound hole, bridge, strings. All primitive
// shapes (rect/circle/line) — no hand-tuned bezier paths needed.
function ukuleleGlyph({ bodyColor, holeColor, scale = 1 }) {
  const cx = 512;
  const cy = 512;
  return `
    <g transform="translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})">
      <rect x="452" y="165" width="120" height="90" rx="20" fill="${bodyColor}" />
      <circle cx="430" cy="185" r="14" fill="${bodyColor}" />
      <circle cx="594" cy="185" r="14" fill="${bodyColor}" />
      <circle cx="430" cy="235" r="14" fill="${bodyColor}" />
      <circle cx="594" cy="235" r="14" fill="${bodyColor}" />
      <rect x="482" y="255" width="60" height="230" fill="${bodyColor}" />
      <circle cx="512" cy="515" r="100" fill="${bodyColor}" />
      <circle cx="512" cy="705" r="155" fill="${bodyColor}" />
      <circle cx="512" cy="645" r="38" fill="${holeColor}" />
      <rect x="472" y="765" width="80" height="22" rx="6" fill="${holeColor}" />
      <line x1="497" y1="255" x2="497" y2="787" stroke="${holeColor}" stroke-width="3" opacity="0.6" />
      <line x1="506" y1="255" x2="506" y2="787" stroke="${holeColor}" stroke-width="3" opacity="0.6" />
      <line x1="518" y1="255" x2="518" y2="787" stroke="${holeColor}" stroke-width="3" opacity="0.6" />
      <line x1="527" y1="255" x2="527" y2="787" stroke="${holeColor}" stroke-width="3" opacity="0.6" />
    </g>
  `;
}

function svg(inner, { size = 1024 } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${inner}</svg>`;
}

const targets = [
  {
    // Full icon: dark background + accent glyph. iOS + web fallback.
    file: 'icon.png',
    size: 1024,
    transparent: false,
    content: svg(`
      <rect width="1024" height="1024" fill="${BG}" />
      ${ukuleleGlyph({ bodyColor: ACCENT, holeColor: BG })}
    `),
  },
  {
    // Same glyph, transparent background, used behind the splash screen's own bg color.
    file: 'splash-icon.png',
    size: 1024,
    transparent: true,
    content: svg(ukuleleGlyph({ bodyColor: ACCENT, holeColor: BG })),
  },
  {
    // Android adaptive icon foreground: transparent, glyph scaled into the safe zone.
    file: 'android-icon-foreground.png',
    size: 512,
    transparent: true,
    content: svg(ukuleleGlyph({ bodyColor: ACCENT, holeColor: BG, scale: 0.8 })),
  },
  {
    // Android adaptive icon background: flat fill only.
    file: 'android-icon-background.png',
    size: 512,
    transparent: false,
    content: svg(`<rect width="1024" height="1024" fill="${BG}" />`),
  },
  {
    // Android themed monochrome icon: single-color (white) glyph, OS tints it.
    file: 'android-icon-monochrome.png',
    size: 432,
    transparent: true,
    content: svg(ukuleleGlyph({ bodyColor: '#FFFFFF', holeColor: '#FFFFFF00', scale: 0.8 })),
  },
  {
    file: 'favicon.png',
    size: 48,
    transparent: false,
    content: svg(`
      <rect width="1024" height="1024" fill="${BG}" />
      ${ukuleleGlyph({ bodyColor: ACCENT, holeColor: BG })}
    `),
  },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1024, height: 1024 } });

for (const target of targets) {
  await page.setViewportSize({ width: target.size, height: target.size });
  const html = `<!doctype html><html><body style="margin:0;padding:0;">${target.content
    .replace('width="1024" height="1024"', `width="${target.size}" height="${target.size}"`)}</body></html>`;
  await page.setContent(html);
  const buffer = await page.screenshot({ omitBackground: target.transparent });
  writeFileSync(join(imagesDir, target.file), buffer);
  console.log(`Wrote ${target.file} (${target.size}x${target.size})`);
}

await browser.close();

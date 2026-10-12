// Copies the real application icons the site shows out of the apps' own .icns resources.
//
//   npm run icons -- <folder>
//
// <folder> holds icon resources copied unmodified from installed application bundles, and a
// manifest.json listing each file with its app, bundle identifier, bundle resource path and
// SHA-256. Every .icns is checked against that hash first. The representations used here are PNGs
// embedded in the .icns; each is copied out byte for byte, so outline, colour, transparency and
// proportions are exactly the vendor's. Nothing is redrawn, recoloured, cropped or re-encoded.
//
// Writes public/apps/<app>-<size>.png and public/apps/sources.json (the provenance record that
// tests/smoke.mjs checks the served files against). The icons belong to their owners, not to this
// repository's MIT license; see README.md.
import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, 'public/apps');
const source = process.argv[2];
if (!source) throw new Error('usage: npm run icons -- <folder with the .icns files and manifest.json>');

// The site's name for each app, the .icns it comes from and the pixel sizes it needs.
const WANTED = [
  { id: 'blender', file: 'blender.icns', sizes: [128, 256, 512] },
  { id: 'md', file: 'marvelous-designer.icns', sizes: [128, 256, 512] },
  { id: 'chrome', file: 'google-chrome.icns', sizes: [128, 256] },
  { id: 'wechat', file: 'wechat.icns', sizes: [128, 256] },
  { id: 'yomado', file: 'yomado.icns', sizes: [128, 256, 512] },
];

// .icns types that hold a PNG of a given pixel size: the 1x type first, then the @2x one.
const TYPES = { 128: ['ic07'], 256: ['ic08', 'ic13'], 512: ['ic09', 'ic14'], 1024: ['ic10'] };
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const sha256 = (buf) => createHash('sha256').update(buf).digest('hex');

/** The chunks of an .icns container: type → data. */
function chunks(buf) {
  if (buf.toString('latin1', 0, 4) !== 'icns' || buf.readUInt32BE(4) !== buf.length) throw new Error('not an icns file');
  const map = new Map();
  for (let off = 8; off < buf.length; ) {
    const type = buf.toString('latin1', off, off + 4);
    const len = buf.readUInt32BE(off + 4);
    if (len < 8 || off + len > buf.length) throw new Error(`corrupt chunk ${type}`);
    map.set(type, buf.subarray(off + 8, off + len));
    off += len;
  }
  return map;
}

const manifest = JSON.parse(await readFile(join(source, 'manifest.json'), 'utf8'));
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

const record = [];
for (const want of WANTED) {
  const entry = manifest.assets.find((a) => a.file === want.file);
  if (!entry) throw new Error(`${want.file} is not in the manifest`);
  const icns = await readFile(join(source, want.file));
  if (sha256(icns) !== entry.sha256) throw new Error(`${want.file} does not match its manifest SHA-256`);
  const parts = chunks(icns);
  const files = [];
  for (const size of want.sizes) {
    const type = TYPES[size].find((t) => parts.get(t)?.subarray(0, 8).equals(PNG));
    if (!type) throw new Error(`${want.file} has no ${size} px PNG`);
    const png = parts.get(type);
    const width = png.readUInt32BE(16);
    const height = png.readUInt32BE(20);
    // RGBA, 8 bits per channel: the alpha channel comes through untouched.
    if (width !== size || height !== size || png[24] !== 8 || png[25] !== 6) throw new Error(`${want.file} ${type} is ${width}×${height}, not ${size} px RGBA`);
    const name = `${want.id}-${size}.png`;
    await writeFile(join(out, name), png);
    files.push({ file: name, icnsType: type, width, height, bytes: png.length, sha256: sha256(png) });
  }
  record.push({
    id: want.id,
    app: entry.app,
    bundleIdentifier: entry.bundleIdentifier,
    bundleResource: entry.bundleResource,
    icns: { file: want.file, bytes: icns.length, sha256: entry.sha256 },
    files,
  });
  console.log(`${want.id}: ${files.map((f) => `${f.width}px (${f.icnsType})`).join(', ')}`);
}

await writeFile(
  join(out, 'sources.json'),
  `${JSON.stringify(
    {
      about:
        'Application icons copied byte for byte from PNG representations inside each app’s own .icns resource (scripts/extract-icons.mjs). They identify the apps shown in the scene and the film, remain the trademarks and copyright of their owners, are not covered by this repository’s MIT license and do not imply endorsement.',
      icons: record,
    },
    null,
    2,
  )}\n`,
);
console.log(`public/apps: ${record.reduce((n, r) => n + r.files.length, 0)} icons and sources.json`);

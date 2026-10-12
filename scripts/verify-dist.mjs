// Static checks on the built site (no browser needed).
//
//   npm run build && npm run verify
//
// - every page has lang, title, description, a canonical URL on the configured origin and an OG image
// - every internal link and asset resolves to a file in the build
// - the only archive linked anywhere is the configured release download
// - each locale's one-minute film, in both compositions and both formats, is what the pages say:
//   55–65 s, 1920 × 1080 or 1080 × 1350, at least 30 fps, H.264 High 4.0 yuv420p with moov before
//   mdat (the codec string the pages declare) or VP9; within a size budget, with its poster
// - no internal film render page and no file of the old 16-second film is published
// - the app icons are byte for byte the PNGs recorded in apps/sources.json
// - neither the build nor the tracked sources contain machine paths, private hosts or credentials
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mp4Info, webmInfo } from './media-info.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const config = JSON.parse(await readFile(join(root, 'site.config.json'), 'utf8'));
const site = (process.env.SITE_URL || config.siteUrl).replace(/\/?$/, '/');
const base = (process.env.SITE_BASE ?? '/').replace(/^\/?/, '/').replace(/\/?$/, '/');
const dist = join(root, process.env.SITE_OUT_DIR ?? 'dist');

const problems = [];
const fail = (where, message) => problems.push(`${where}: ${message}`);

// Each locale's root below the site base (src/lib/site.ts), and its Open Graph card.
const LOCALES = { en: '', 'zh-cn': 'zh-cn/', ja: 'ja/' };
const ROUTES = ['', 'details/', 'watch/'];
// Links to the English home say ?lang=en, because the bare home page follows the browser.
const localeHref = (prefix, route) => `${base}${prefix}${route}${prefix === '' && route === '' ? '?lang=en' : ''}`;

// Patterns that must never be published: local paths, private hosts, credentials.
// VERIFY_DENY adds comma-separated regular expressions for a one-off run.
const PRIVATE = [
  [/\/home\/[a-z]/, 'a home directory path'],
  [/\/Users\/[A-Za-z]/, 'a home directory path'],
  [/\b(?:localhost|127\.0\.0\.1)\b/, 'a loopback address'],
  [/\.ts\.net\b|tailnet/i, 'a tailnet address'],
  [/ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY/, 'a credential'],
  ...(process.env.VERIFY_DENY ?? '')
    .split(',')
    .filter(Boolean)
    .map((source) => [new RegExp(source, 'i'), `a denied pattern (${source})`]),
];
// Tracked sources may use loopback for the local test server, nothing else.
const PRIVATE_SOURCES = PRIVATE.filter(([, label]) => label !== 'a loopback address');

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(file)));
    else out.push(file);
  }
  return out;
}

const TEXT = new Set(['.html', '.css', '.js', '.xml', '.txt', '.svg', '.json', '.webmanifest']);
const files = await walk(dist);
const pages = files.filter((f) => f.endsWith('.html'));

for (const file of files.filter((f) => TEXT.has(extname(f)))) {
  const text = await readFile(file, 'utf8');
  for (const [pattern, label] of PRIVATE) if (pattern.test(text)) fail(relative(dist, file), `contains ${label}`);
}

const attr = (html, re) => [...html.matchAll(re)].map((m) => m[1]);

for (const file of pages) {
  const where = relative(dist, file);
  const html = await readFile(file, 'utf8');
  if (!/<html lang="[a-zA-Z-]+"/.test(html)) fail(where, 'missing <html lang>');
  if (!/<title>[^<]{10,}<\/title>/.test(html)) fail(where, 'missing title');
  if (!/<meta name="description" content="[^"]{60,}"/.test(html)) fail(where, 'missing description');
  const canonical = attr(html, /<link rel="canonical" href="([^"]+)"/g)[0];
  if (!canonical?.startsWith(site)) fail(where, `canonical ${canonical} is not on ${site}`);
  if (/[?#]/.test(canonical ?? '') || attr(html, /hreflang="[^"]+" href="([^"]+)"/g).some((u) => /[?#]/.test(u))) fail(where, 'canonical or hreflang URL has a query or hash');
  // Only the English home page may move a visitor to another language.
  if (html.includes('location.replace') !== (where === 'index.html')) fail(where, 'language redirect script on the wrong page');
  const og = attr(html, /<meta property="og:image" content="([^"]+)"/g)[0];
  if (!og?.startsWith(`${site}og/`)) fail(where, `og:image ${og} is not on ${site}`);

  const refs = [...attr(html, /\shref="([^"]+)"/g), ...attr(html, /\ssrc="([^"]+)"/g), ...attr(html, /\ssrcset="([^"]+)"/g).flatMap((s) => s.split(',').map((p) => p.trim().split(/\s+/)[0]))];
  for (const ref of refs) {
    if (ref.endsWith('.zip') && ref !== config.release.url) fail(where, `links an archive other than the release: ${ref}`);
    if (/^(https?:|mailto:|#|data:)/.test(ref)) continue;
    if (!ref.startsWith(base)) {
      fail(where, `relative or off-base link ${ref}`);
      continue;
    }
    const path = decodeURIComponent(ref.slice(base.length).split(/[?#]/)[0]);
    const target = join(dist, path);
    if (!existsSync(target) && !existsSync(join(target, 'index.html'))) fail(where, `broken link ${ref}`);
  }
}

for (const [locale, prefix] of Object.entries(LOCALES)) {
  const page = `${prefix}index.html`;
  const html = await readFile(join(dist, page), 'utf8').catch(() => '');
  const downloads = (html.match(/data-download="[a-z]+"/g) ?? []).length;
  if (downloads !== 3) fail(page, `expected download links in header, hero and finale, found ${downloads}`);
  if (!existsSync(join(dist, 'og', `${locale}.png`))) fail(`og/${locale}.png`, 'missing');
  for (const route of ROUTES) {
    const other = await readFile(join(dist, prefix, route, 'index.html'), 'utf8').catch(() => '');
    for (const [l, p] of Object.entries(LOCALES)) {
      if (!other.includes(`href="${localeHref(p, route)}"`)) fail(`${prefix}${route}index.html`, `no link to the ${l} version`);
    }
  }
}

// The film: one per locale, wide and tall, MP4 and WebM. A minute of 1080p is bigger than the old
// 16-second clip, so the budget grew with it, but stays a budget: each video file at most 9 MB
// (it streams; the hero loads nothing before it plays), posters and story stills under 200 kB.
const FILM = { minSeconds: 55, maxSeconds: 65, minFps: 29.9, maxBytes: 9e6 };
const SIZE = { wide: [1920, 1080], tall: [1080, 1350] };
const declared = new Set();
// Attribute values come HTML-escaped (codecs=&quot;…&quot;); compare them as the browser reads them.
const unescape = (v) => v.replaceAll('&quot;', '"').replaceAll('&#34;', '"').replaceAll('&amp;', '&');
for (const file of pages) for (const t of attr(await readFile(file, 'utf8'), /<source[^>]*type="(video\/mp4[^"]*)"/g)) declared.add(unescape(t));
for (const locale of Object.keys(LOCALES)) {
  for (const [layout, [w, h]] of Object.entries(SIZE)) {
    const name = `film-${locale}-${layout}`;
    const where = `media/${name}`;
    try {
      const mp4 = await mp4Info(join(dist, 'media', `${name}.mp4`));
      if (mp4.bytes > FILM.maxBytes) fail(`${where}.mp4`, `${mp4.bytes} bytes, over ${FILM.maxBytes}`);
      if (mp4.duration < FILM.minSeconds || mp4.duration > FILM.maxSeconds) fail(`${where}.mp4`, `${mp4.duration.toFixed(2)} s long`);
      if (mp4.width !== w || mp4.height !== h) fail(`${where}.mp4`, `${mp4.width} × ${mp4.height}, not ${w} × ${h}`);
      if (mp4.fps < FILM.minFps) fail(`${where}.mp4`, `${mp4.fps} fps`);
      if (!mp4.faststart) fail(`${where}.mp4`, `moov does not precede mdat (${mp4.order.join(', ')})`);
      if (mp4.codec !== 'avc1' || mp4.pixelFormat !== 'yuv420p') fail(`${where}.mp4`, `${mp4.codec} ${mp4.pixelFormat}, not H.264 yuv420p`);
      if (![...declared].every((t) => t.includes(`codecs="${mp4.codecs}"`))) fail(`${where}.mp4`, `is ${mp4.codecs}, pages declare ${[...declared].join(' | ')}`);
    } catch (e) {
      fail(`${where}.mp4`, `missing or unreadable (${e.message})`);
    }
    try {
      const webm = await webmInfo(join(dist, 'media', `${name}.webm`));
      if (webm.bytes > FILM.maxBytes) fail(`${where}.webm`, `${webm.bytes} bytes, over ${FILM.maxBytes}`);
      if (webm.duration < FILM.minSeconds || webm.duration > FILM.maxSeconds) fail(`${where}.webm`, `${webm.duration?.toFixed(2)} s long`);
      if (webm.width !== w || webm.height !== h) fail(`${where}.webm`, `${webm.width} × ${webm.height}, not ${w} × ${h}`);
      if (webm.codec !== 'V_VP9') fail(`${where}.webm`, `${webm.codec}, not VP9`);
    } catch (e) {
      fail(`${where}.webm`, `missing or unreadable (${e.message})`);
    }
    const poster = await stat(join(dist, 'media', `${name}-poster.webp`)).then((st) => st.size).catch(() => 0);
    if (!poster || poster > 2e5) fail(`${where}-poster.webp`, poster ? `${poster} bytes, over 200000` : 'missing');
  }
}
for (const file of ['story-wide.webp', 'story-tall.webp']) {
  const size = await stat(join(dist, 'media', file)).then((st) => st.size).catch(() => 0);
  if (!size || size > 2e5) fail(`media/${file}`, size ? `${size} bytes, over 200000` : 'missing');
}
// The internal render pages and the old 16-second film stay out of the build.
if (existsSync(join(dist, 'film'))) fail('film/', 'internal film render pages are in the build');
for (const old of ['film-wide.mp4', 'film-wide.webm', 'film-tall.mp4', 'film-tall.webm', 'film-wide-poster.webp', 'film-tall-poster.webp']) {
  if (existsSync(join(dist, 'media', old))) fail(`media/${old}`, 'a file of the old 16-second film');
}

// The app icons are exactly the PNGs copied out of the apps' .icns (scripts/extract-icons.mjs).
try {
  const sources = JSON.parse(await readFile(join(dist, 'apps', 'sources.json'), 'utf8'));
  for (const icon of sources.icons) {
    for (const f of icon.files) {
      const buf = await readFile(join(dist, 'apps', f.file)).catch(() => null);
      if (!buf) fail(`apps/${f.file}`, 'missing');
      else if (createHash('sha256').update(buf).digest('hex') !== f.sha256) fail(`apps/${f.file}`, 'differs from apps/sources.json');
    }
  }
} catch (e) {
  fail('apps/sources.json', `missing or unreadable (${e.message})`);
}

const sitemap = await readFile(join(dist, 'sitemap.xml'), 'utf8').catch(() => '');
for (const loc of Object.values(LOCALES).flatMap((p) => ROUTES.map((r) => `${site}${p}${r}`))) {
  if (!sitemap.includes(`<loc>${loc}</loc>`)) fail('sitemap.xml', `missing ${loc}`);
}

// Tracked sources: same rules, minus the loopback address used by the local test server.
let tracked = [];
try {
  tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
} catch {
  // Not a git checkout; the build checks above still ran.
}
for (const file of tracked) {
  if (!TEXT.has(extname(file)) && !/\.(ts|mjs|astro|md|ya?ml)$/.test(file)) continue;
  if (file === 'package-lock.json' || file === 'scripts/verify-dist.mjs') continue;
  // A tracked file may be deleted in the working tree before the deletion is committed.
  const text = await readFile(join(root, file), 'utf8').catch(() => null);
  if (text === null) continue;
  for (const [pattern, label] of PRIVATE_SOURCES) if (pattern.test(text)) fail(file, `contains ${label}`);
}

if (problems.length) {
  console.error(`verify-dist: ${problems.length} problem(s)\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`verify-dist: ${pages.length} pages, ${files.length} files and ${tracked.length} tracked sources look clean (${site}).`);

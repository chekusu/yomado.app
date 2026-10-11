// Static checks on the built site (no browser needed).
//
//   npm run build && npm run verify
//
// - every page has lang, title, description, a canonical URL on the configured origin and an OG image
// - every internal link and asset resolves to a file in the build
// - the only archive linked anywhere is the configured release download
// - the concept film and its posters are in the build and stay small
// - neither the build nor the tracked sources contain machine paths, private hosts or credentials
import { execFileSync } from 'node:child_process';
import { readFile, readdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const config = JSON.parse(await readFile(join(root, 'site.config.json'), 'utf8'));
const site = (process.env.SITE_URL || config.siteUrl).replace(/\/?$/, '/');
const base = (process.env.SITE_BASE ?? '/').replace(/^\/?/, '/').replace(/\/?$/, '/');
const dist = join(root, process.env.SITE_OUT_DIR ?? 'dist');

const problems = [];
const fail = (where, message) => problems.push(`${where}: ${message}`);

// Each locale's root below the site base (src/lib/site.ts), and its Open Graph card.
const LOCALES = { en: '', 'zh-cn': 'zh-cn/', ja: 'ja/' };
const ROUTES = ['', 'details/'];

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
      if (!other.includes(`href="${base}${p}${route}"`)) fail(`${prefix}${route}index.html`, `no link to the ${l} version`);
    }
  }
}

// The film is lazy, but it should still be light: every video under 2.5 MB, posters under 200 kB.
const MEDIA = { 'film-wide.mp4': 2.5e6, 'film-wide.webm': 2.5e6, 'film-tall.mp4': 2.5e6, 'film-tall.webm': 2.5e6, 'film-wide-poster.webp': 2e5, 'film-tall-poster.webp': 2e5, 'story-wide.webp': 2e5, 'story-tall.webp': 2e5 };
for (const [file, limit] of Object.entries(MEDIA)) {
  const size = await stat(join(dist, 'media', file)).then((s) => s.size).catch(() => 0);
  if (!size) fail(`media/${file}`, 'missing');
  else if (size > limit) fail(`media/${file}`, `${size} bytes, over ${limit}`);
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
  const text = await readFile(join(root, file), 'utf8');
  for (const [pattern, label] of PRIVATE_SOURCES) if (pattern.test(text)) fail(file, `contains ${label}`);
}

if (problems.length) {
  console.error(`verify-dist: ${problems.length} problem(s)\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`verify-dist: ${pages.length} pages, ${files.length} files and ${tracked.length} tracked sources look clean (${site}).`);

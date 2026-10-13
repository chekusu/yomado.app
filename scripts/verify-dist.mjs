// Static checks on the built site (no browser needed).
//
//   npm run build && npm run verify
//
// - every page has lang, title, description, a canonical URL on the configured origin and an OG image
//   that is in the build; every page of the 16 languages (home, details, watch) has its language and
//   direction, hreflang alternates for all 16 plus x-default, and links to the same page in each
// - every internal link and asset resolves to a file in the build
// - the only archive linked anywhere is the configured release download
// - each film's one-minute film (en, zh-cn, ja), in both compositions and both formats, is what the
//   pages say: 55–65 s, 1920 × 1080 or 1080 × 1350, at least 30 fps, H.264 High 4.0 yuv420p with moov
//   before mdat (the codec string the pages declare) or VP9; within a size budget, with its poster
// - each watch page plays its language's film and offers that language's captioned MP4s as downloads
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

// The website's languages are the 16 subtitle languages (captions/index.json); each one's root below
// the site base (src/lib/site.ts), and its Open Graph card. The films are the three there are.
const captionIndex = JSON.parse(await readFile(join(root, 'captions/index.json'), 'utf8'));
const LOCALES = Object.fromEntries(captionIndex.order.map((tag) => [tag.toLowerCase(), tag === 'en' ? '' : `${tag.toLowerCase()}/`]));
const TAG = Object.fromEntries(captionIndex.order.map((tag) => [tag.toLowerCase(), tag]));
const FILMS = ['en', 'zh-cn', 'ja'];
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
  else if (!existsSync(join(dist, og.slice(site.length)))) fail(where, `og:image ${og} is not in the build`);

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
    const where = `${prefix}${route}index.html`;
    const other = await readFile(join(dist, prefix, route, 'index.html'), 'utf8').catch(() => '');
    if (!other) {
      fail(where, 'missing');
      continue;
    }
    const dir = TAG[locale] === 'ar' ? 'rtl' : 'ltr';
    if (!other.includes(`<html lang="${TAG[locale]}" dir="${dir}"`)) fail(where, `not <html lang="${TAG[locale]}" dir="${dir}">`);
    if (attr(other, /<link rel="canonical" href="([^"]+)"/g)[0] !== `${site}${prefix}${route}`) fail(where, 'canonical is not the page itself');
    const alternates = attr(other, /<link rel="alternate" hreflang="([^"]+)"/g);
    if (alternates.length !== captionIndex.order.length + 1 || !alternates.includes('x-default')) fail(where, `${alternates.length} hreflang alternates`);
    if (!other.includes(`content="${site}og/${locale}.png"`)) fail(where, `og:image is not og/${locale}.png`);
    for (const [l, p] of Object.entries(LOCALES)) {
      if (!other.includes(`href="${localeHref(p, route)}"`)) fail(where, `no link to the ${l} version`);
    }
  }
}

// The film: one per locale, wide and tall, MP4 and WebM, each with its narration (English or
// Simplified Chinese; Japanese has the English one, src/lib/film-media.json) and the version in its
// name. A narrated minute of 1080p is bigger than the old 16-second clip, so the budget grew with
// it, but stays a budget: each video file at most 10 MB (it streams; the hero loads nothing
// before it plays), posters and story stills under 200 kB.
const FILM = { minSeconds: 55, maxSeconds: 65, minFps: 29.9, maxBytes: 10e6, audioRate: 48000, audioDrift: 0.25 };
const SIZE = { wide: [1920, 1080], tall: [1080, 1350] };
const filmMedia = JSON.parse(await readFile(join(root, 'src/lib/film-media.json'), 'utf8'));
const declared = { mp4: new Set(), webm: new Set() };
// Attribute values come HTML-escaped (codecs=&quot;…&quot;); compare them as the browser reads them.
const unescape = (v) => v.replaceAll('&quot;', '"').replaceAll('&#34;', '"').replaceAll('&amp;', '&');
for (const file of pages) {
  for (const t of attr(await readFile(file, 'utf8'), /<source[^>]*type="(video\/(?:mp4|webm)[^"]*)"/g)) declared[t.startsWith('video/mp4') ? 'mp4' : 'webm'].add(unescape(t));
}
if (![...declared.webm].every((t) => /codecs="vp9, opus"/.test(t))) fail('pages', `declare WebM as ${[...declared.webm].join(' | ')}, not VP9 with Opus`);
for (const locale of FILMS) {
  const language = filmMedia.language[filmMedia.narration[locale]];
  for (const [layout, [w, h]] of Object.entries(SIZE)) {
    const name = `film-${locale}-${layout}`;
    const file = `${name}-${filmMedia.version}`;
    const where = `media/${file}`;
    try {
      const mp4 = await mp4Info(join(dist, 'media', `${file}.mp4`));
      if (mp4.bytes > FILM.maxBytes) fail(`${where}.mp4`, `${mp4.bytes} bytes, over ${FILM.maxBytes}`);
      if (mp4.duration < FILM.minSeconds || mp4.duration > FILM.maxSeconds) fail(`${where}.mp4`, `${mp4.duration.toFixed(2)} s long`);
      if (mp4.width !== w || mp4.height !== h) fail(`${where}.mp4`, `${mp4.width} × ${mp4.height}, not ${w} × ${h}`);
      if (mp4.fps < FILM.minFps) fail(`${where}.mp4`, `${mp4.fps} fps`);
      if (!mp4.faststart) fail(`${where}.mp4`, `moov does not precede mdat (${mp4.order.join(', ')})`);
      if (mp4.codec !== 'avc1' || mp4.pixelFormat !== 'yuv420p') fail(`${where}.mp4`, `${mp4.codec} ${mp4.pixelFormat}, not H.264 yuv420p`);
      const a = mp4.audio;
      if (a?.codecs !== 'mp4a.40.2' || a.sampleRate !== FILM.audioRate || a.channels < 1) fail(`${where}.mp4`, `audio is ${a ? `${a.codecs} ${a.sampleRate} Hz ×${a.channels}` : 'missing'}, not AAC-LC at 48 kHz`);
      else {
        if (Math.abs(a.duration - mp4.duration) > FILM.audioDrift) fail(`${where}.mp4`, `audio ${a.duration.toFixed(2)} s against video ${mp4.duration.toFixed(2)} s`);
        if (a.language !== language) fail(`${where}.mp4`, `narration tagged ${a.language}, expected ${language}`);
        if (![...declared.mp4].every((t) => t.includes(`codecs="${mp4.codecs}, ${a.codecs}"`))) fail(`${where}.mp4`, `is ${mp4.codecs} + ${a.codecs}, pages declare ${[...declared.mp4].join(' | ')}`);
      }
    } catch (e) {
      fail(`${where}.mp4`, `missing or unreadable (${e.message})`);
    }
    try {
      const webm = await webmInfo(join(dist, 'media', `${file}.webm`));
      if (webm.bytes > FILM.maxBytes) fail(`${where}.webm`, `${webm.bytes} bytes, over ${FILM.maxBytes}`);
      if (webm.duration < FILM.minSeconds || webm.duration > FILM.maxSeconds) fail(`${where}.webm`, `${webm.duration?.toFixed(2)} s long`);
      if (webm.width !== w || webm.height !== h) fail(`${where}.webm`, `${webm.width} × ${webm.height}, not ${w} × ${h}`);
      if (webm.codec !== 'V_VP9') fail(`${where}.webm`, `${webm.codec}, not VP9`);
      const a = webm.audio;
      if (a?.codec !== 'A_OPUS' || a.sampleRate !== FILM.audioRate) fail(`${where}.webm`, `audio is ${a ? `${a.codec} ${a.sampleRate} Hz` : 'missing'}, not Opus at 48 kHz`);
      else if (a.language !== language) fail(`${where}.webm`, `narration tagged ${a.language}, expected ${language}`);
    } catch (e) {
      fail(`${where}.webm`, `missing or unreadable (${e.message})`);
    }
    const poster = await stat(join(dist, 'media', `${name}-poster.webp`)).then((st) => st.size).catch(() => 0);
    if (!poster || poster > 2e5) fail(`media/${name}-poster.webp`, poster ? `${poster} bytes, over 200000` : 'missing');
    // Earlier versions of the film (the silent one had no version in its name) stay out.
    for (const old of (await readdir(join(dist, 'media'))).filter((f) => f.startsWith(`${name}`) && /\.(mp4|webm)$/.test(f) && !f.startsWith(file + '.') && !f.includes('-band-'))) {
      fail(`media/${old}`, `an earlier version of the film; this build serves ${file}`);
    }
  }
}
// Captions: per locale a WebVTT and an SRT with exactly the cues of captions/<tag>.json on its
// narration's timing (captions/timing.json); the film with those captions in its pixels, wide and
// tall, with that narration; and per film the band masters the watch page plays with tracks.
const captionTiming = JSON.parse(await readFile(join(root, 'captions/timing.json'), 'utf8'));
const CV = filmMedia.captions;
const toSeconds = (stamp) => {
  const [h, m, rest] = stamp.split(':');
  return Number(h) * 3600 + Number(m) * 60 + Number(rest.replace(',', '.'));
};
function parseCues(body, kind) {
  const blocks = body.replace(/\r/g, '').split(/\n\n+/).map((b) => b.replace(/\n+$/, '')).filter((b) => b.trim());
  if (kind === 'vtt' && blocks[0].trim() !== 'WEBVTT') throw new Error('no WEBVTT header');
  return blocks
    .filter((b) => b.includes('-->'))
    .map((b) => {
      const lines = b.split('\n');
      const at = lines.findIndex((l) => l.includes('-->'));
      const [start, rest] = lines[at].split(' --> ');
      const unescape = (t) => (kind === 'vtt' ? t.replaceAll('&lt;', '<').replaceAll('&amp;', '&') : t);
      return { start: toSeconds(start.trim()), end: toSeconds(rest.trim().split(/\s+/)[0]), settings: rest.trim().split(/\s+/).slice(1).join(' '), text: unescape(lines.slice(at + 1).join('\n')) };
    });
}
for (const tag of captionIndex.order) {
  const loc = JSON.parse(await readFile(join(root, 'captions', `${tag}.json`), 'utf8'));
  const expected = captionTiming.families[loc.family].cues.map((c) => ({ start: c.start, end: c.end, text: loc.cues[c.key] }));
  for (const kind of ['vtt', 'srt']) {
    const where = `media/captions/yomado-film-${tag}-${CV}.${kind}`;
    try {
      const cues = parseCues(await readFile(join(dist, where), 'utf8'), kind);
      if (cues.length !== expected.length) fail(where, `${cues.length} cues, expected ${expected.length}`);
      cues.forEach((c, i) => {
        const e = expected[i];
        if (!e) return;
        if (Math.abs(c.start - e.start) > 0.0015 || Math.abs(c.end - e.end) > 0.0015) fail(where, `cue ${i + 1} at ${c.start}–${c.end}, expected ${e.start}–${e.end}`);
        if (c.text !== e.text) fail(where, `cue ${i + 1} reads "${c.text}", expected "${e.text}"`);
        if (!(c.end > c.start) || (i && c.start < cues[i - 1].end) || c.end > captionTiming.duration) fail(where, `cue ${i + 1} out of order or range`);
        if (kind === 'vtt' && (/line:/.test(c.settings) || !/size:84%/.test(c.settings))) fail(where, `cue ${i + 1} settings "${c.settings}": cues snap to the last line (the band), 84 % wide`);
      });
    } catch (e) {
      fail(where, `missing or unreadable (${e.message})`);
    }
  }
  const language = filmMedia.language[loc.family === 'zh' ? 'zh-cn' : 'en'];
  for (const [layout, [w, h]] of Object.entries(SIZE)) {
    const where = `media/captioned/yomado-film-${tag}-${layout}-${CV}.mp4`;
    try {
      const mp4 = await mp4Info(join(dist, where));
      if (mp4.width !== w || mp4.height !== h || mp4.codec !== 'avc1' || mp4.pixelFormat !== 'yuv420p' || !mp4.faststart) fail(where, `${mp4.codec} ${mp4.width} × ${mp4.height} ${mp4.pixelFormat}${mp4.faststart ? '' : ', not faststart'}`);
      if (mp4.frames !== 1801 || Math.abs(mp4.duration - captionTiming.duration) > 0.05) fail(where, `${mp4.frames} frames, ${mp4.duration.toFixed(3)} s`);
      if (mp4.audio?.codecs !== 'mp4a.40.2' || mp4.audio.language !== language) fail(where, `audio ${mp4.audio?.codecs} ${mp4.audio?.language}, expected AAC-LC ${language}`);
      if (mp4.bytes > FILM.maxBytes) fail(where, `${mp4.bytes} bytes, over ${FILM.maxBytes}`);
    } catch (e) {
      fail(where, `missing or unreadable (${e.message})`);
    }
  }
}
for (const visual of FILMS) {
  const language = filmMedia.language[filmMedia.narration[visual]];
  for (const [layout, [w, h]] of Object.entries(SIZE)) {
    const where = `media/film-${visual}-${layout}-band-${CV}`;
    try {
      const mp4 = await mp4Info(join(dist, `${where}.mp4`));
      if (mp4.width !== w || mp4.height !== h || mp4.frames !== 1801 || !mp4.faststart || mp4.audio?.language !== language) fail(`${where}.mp4`, `${mp4.width} × ${mp4.height}, ${mp4.frames} frames, audio ${mp4.audio?.language}`);
      const webm = await webmInfo(join(dist, `${where}.webm`));
      if (webm.width !== w || webm.height !== h || webm.codec !== 'V_VP9' || webm.audio?.codec !== 'A_OPUS' || webm.audio.language !== language) fail(`${where}.webm`, `${webm.codec} ${webm.width} × ${webm.height}, audio ${webm.audio?.codec} ${webm.audio?.language}`);
    } catch (e) {
      fail(where, `missing or unreadable (${e.message})`);
    }
    const poster = await stat(join(dist, 'media', `film-${visual}-${layout}-band-poster-${CV}.webp`)).then((st) => st.size).catch(() => 0);
    if (!poster || poster > 2e5) fail(`${where}-poster`, poster ? `${poster} bytes` : 'missing');
  }
}
// Each language shows the film its own subtitles go with (zh-CN and zh-TW the Chinese one, ja the
// Japanese one, the rest the English one): the hero plays it, the watch page its band masters with
// that film's tracks and, as downloads (?download), that language's captioned MP4s and SRT. The
// hero gets every language's subtitles.
for (const [locale, prefix] of Object.entries(LOCALES)) {
  const tag = TAG[locale];
  const visual = captionIndex.locales[tag].visual;
  const watch = await readFile(join(dist, prefix, 'watch/index.html'), 'utf8');
  if (!watch.includes(`film-${visual}-wide-band-${CV}.mp4`)) fail(`${prefix}watch/index.html`, `does not play the ${visual} band master`);
  const tracks = attr(watch, /<track[^>]*srclang="([^"]+)"/g);
  const own = captionIndex.order.filter((t) => captionIndex.locales[t].visual === visual);
  if (tracks.join() !== own.join()) fail(`${prefix}watch/index.html`, `tracks ${tracks.join(', ')}, expected ${own.join(', ')}`);
  for (const layout of ['wide', 'tall']) {
    if (!watch.includes(`href="${base}media/captioned/yomado-film-${tag}-${layout}-${CV}.mp4?download"`)) fail(`${prefix}watch/index.html`, `no ${layout} ${tag} download`);
  }
  if (!watch.includes(`href="${base}media/captions/yomado-film-${tag}-${CV}.srt?download"`)) fail(`${prefix}watch/index.html`, `no ${tag} SRT download`);
  const home = await readFile(join(dist, prefix, 'index.html'), 'utf8');
  if (!home.includes(`film-${visual}-wide-${filmMedia.version}.mp4`)) fail(`${prefix}index.html`, `does not play the ${visual} film`);
  for (const t of captionIndex.order) if (!home.includes(`captions/yomado-film-${t}-${CV}.vtt`)) fail(`${prefix}index.html`, `no ${t} subtitles`);
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

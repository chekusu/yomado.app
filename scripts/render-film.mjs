// Renders the one-minute product film from its timeline (src/lib/film.ts), in every locale and
// both layouts, and the home page story's no-JavaScript stills from the story scene.
//
//   npm run film                                   everything → public/media/
//   npm run film -- --stills 0,12.5,36.9 --out d   PNG stills of those moments only, for review
//   npm run film -- --locale ja --layout tall      one variant
//   npm run film -- --encode-only                  re-encode the frames of the last render
//   npm run film -- --workers 3                    browsers per variant (default 3)
//   npm run film -- --fresh                        discard frames kept from an interrupted render
//   npm run film:narrate                           narrate the last render again (scripts/narrate-film.mjs)
//
// Builds the site with FILM_STAGE=1, which adds the /film/<locale>/<layout>/ and
// /film/story/<layout>/ render pages (never part of a normal build). Each variant plays in its own
// headless Chromium (split into contiguous chunks, one browser each: every frame is a pure
// function of time), frame by frame at FPS, into PNG frames under .film-build/; ffmpeg (on PATH)
// encodes H.264 (MP4, yuv420p, faststart) and VP9 (WebM) into .film-build/silent/, and
// scripts/narrate-film.mjs adds the narration on the way to public/media/. The poster of each film
// is its first frame, so playback starts without a jump. The outputs are committed; CI and deploys
// never run this.
import { chromium } from 'playwright';
import { execFile as execFileCb, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import sharp from 'sharp';
import { FILM_VERSION, narrate, silentDir } from './narrate-film.mjs';

const execFile = promisify(execFileCb);
const root = fileURLToPath(new URL('../', import.meta.url));
const build = join(root, '.film-build');
const media = join(root, 'public/media');
const FPS = 30;
/** The film's length in seconds (src/lib/film.ts FILM_DURATION; the stage reports it too). */
const DURATION = 60;
const SIZES = { wide: { width: 1920, height: 1080 }, tall: { width: 1080, height: 1350 } };
const LOCALES = ['en', 'zh-cn', 'ja'];
// H.264 High at level 4.0 holds 1080p at 30 fps; Film.astro declares avc1.640028 to match.
const X264 = ['-c:v', 'libx264', '-preset', 'veryslow', '-tune', 'animation', '-crf', '23', '-profile:v', 'high', '-level:v', '4.0', '-g', '60', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an'];
const VP9 = ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '35', '-row-mt', '1', '-tile-columns', '2', '-deadline', 'good', '-cpu-used', '2', '-g', '60', '-pix_fmt', 'yuv420p', '-an'];

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const stills = option('stills')?.split(',').map(Number);
const locales = LOCALES.filter((l) => !option('locale') || l === option('locale'));
const layouts = Object.keys(SIZES).filter((l) => !option('layout') || l === option('layout'));
const variants = locales.flatMap((locale) => layouts.map((layout) => ({ locale, layout, name: `film-${locale}-${layout}` })));
const encodeOnly = args.includes('--encode-only');
const workers = Math.max(1, Number(option('workers') ?? 3));
const fresh = args.includes('--fresh');

const frameDir = (v) => join(build, `frames-${v.locale}-${v.layout}`);
const frameFile = (dir, i) => join(dir, `${String(i).padStart(5, '0')}.png`);
const sha256 = async (file) => createHash('sha256').update(await readFile(file)).digest('hex');

if (!encodeOnly) {
  execFileSync('npx', ['astro', 'build'], {
    cwd: root,
    stdio: ['ignore', 'ignore', 'inherit'],
    env: { ...process.env, FILM_STAGE: '1', SITE_OUT_DIR: './.film-build/site', SITE_BASE: '/', SITE_NOINDEX: '1' },
  });
}

const site = join(build, 'site');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp' };
const server = createServer(async (req, res) => {
  let file = join(site, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

/** Open a variant's stage, ready to render any moment. */
async function openStage(browser, v) {
  const page = await browser.newPage({ viewport: SIZES[v.layout], deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  await page.goto(`${origin}/film/${v.locale}/${v.layout}/`, { waitUntil: 'networkidle' });
  const ok = await page.evaluate(() => window.__film.ready());
  if (!ok) throw new Error(`${v.name}: an image did not load`);
  const shoot = async (t, path) => {
    await page.evaluate((time) => window.__film.render(time), t);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.screenshot({ path, type: 'png' });
  };
  const duration = await page.evaluate(() => window.__film.duration);
  if (duration !== DURATION) throw new Error(`${v.name}: the stage says ${duration} s, the renderer ${DURATION} s`);
  return { page, shoot, duration, errors };
}

/** A complete PNG: signature at the start, IEND chunk at the end (an interrupted write has neither). */
async function complete(file) {
  try {
    const buf = await readFile(file);
    return buf.length > 57 && buf.readUInt32BE(0) === 0x89504e47 && buf.toString('latin1', buf.length - 8, buf.length - 4) === 'IEND';
  } catch {
    return false;
  }
}

/** Render frames [from, to] of a variant in one browser, keeping complete frames already on disk. */
async function renderChunk(v, from, to) {
  const browser = await chromium.launch();
  try {
    const { shoot, errors } = await openStage(browser, v);
    const dir = frameDir(v);
    let done = 0;
    for (let i = from; i <= to; i++) {
      const file = frameFile(dir, i);
      if (await complete(file)) continue;
      await shoot(i / FPS, file);
      if (++done % 150 === 0) console.log(`${v.name} [${from}–${to}]: ${done} new frames`);
    }
    if (errors.length) throw new Error(`${v.name}: page errors\n${errors.join('\n')}`);
    return done;
  } finally {
    await browser.close();
  }
}

/** Render one variant: stills for review, or every frame in `workers` contiguous chunks. */
async function renderVariant(v) {
  if (stills) {
    const browser = await chromium.launch();
    try {
      const { shoot, errors } = await openStage(browser, v);
      const out = option('out') ?? join(root, 'test-output/stills');
      await mkdir(out, { recursive: true });
      for (const t of stills) await shoot(t, join(out, `${v.name}-${t.toFixed(2)}.png`));
      console.log(`${v.name}: ${stills.length} stills → ${out}`);
      if (errors.length) throw new Error(`${v.name}: page errors\n${errors.join('\n')}`);
    } finally {
      await browser.close();
    }
    return;
  }
  const dir = frameDir(v);
  if (fresh) await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });
  const count = Math.round(DURATION * FPS);
  const size = Math.ceil((count + 1) / workers);
  const started = Date.now();
  const chunks = Array.from({ length: workers }, (_, w) => [w * size, Math.min(count, (w + 1) * size - 1)]).filter(([a, b]) => a <= b);
  const rendered = await Promise.all(chunks.map(([a, b]) => renderChunk(v, a, b)));
  for (let i = 0; i <= count; i++) if (!(await complete(frameFile(dir, i)))) throw new Error(`${v.name}: frame ${i} missing`);
  console.log(`${v.name}: ${count + 1} frames (${rendered.reduce((a, b) => a + b, 0)} new) in ${((Date.now() - started) / 1000).toFixed(0)} s`);
}

/** The story scene's still at the end of act 3, for the home page without JavaScript. */
async function renderStoryStills() {
  const browser = await chromium.launch();
  try {
    for (const layout of layouts) {
      const page = await browser.newPage({ viewport: SIZES[layout], deviceScaleFactor: 1 });
      await page.goto(`${origin}/film/story/${layout}/`, { waitUntil: 'networkidle' });
      await page.evaluate(() => window.__story.ready());
      await page.evaluate(() => window.__story.render(window.__story.at));
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
      const png = join(build, `story-${layout}.png`);
      await page.screenshot({ path: png, type: 'png' });
      await sharp(png).webp({ quality: 82, effort: 6 }).toFile(join(media, `story-${layout}.webp`));
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

async function encode(v) {
  const dir = frameDir(v);
  const frames = (await readdir(dir)).filter((f) => f.endsWith('.png')).length;
  const input = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(dir, '%05d.png')];
  await mkdir(silentDir, { recursive: true });
  const mp4 = join(silentDir, `${v.name}.mp4`);
  const webm = join(silentDir, `${v.name}.webm`);
  await Promise.all([execFile('ffmpeg', [...input, ...X264, mp4]), execFile('ffmpeg', [...input, ...VP9, webm])]);
  const poster = join(media, `${v.name}-poster.webp`);
  await sharp(frameFile(dir, 0)).webp({ quality: 82, effort: 6 }).toFile(poster);
  const out = { variant: v.name, frames, fps: FPS, seconds: (frames - 1) / FPS, files: await narrate(v) };
  out.files[`${v.name}-poster.webp`] = { bytes: (await stat(poster)).size, sha256: await sha256(poster) };
  console.log(v.name, JSON.stringify(out.files));
  return out;
}

await mkdir(media, { recursive: true });
let results = [];
if (stills) {
  await Promise.all(variants.map(renderVariant));
} else {
  if (!encodeOnly) {
    await Promise.all(variants.map(renderVariant));
    await renderStoryStills();
  }
  results = await Promise.all(variants.map(encode));
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  await writeFile(
    join(build, 'render-manifest.json'),
    `${JSON.stringify({ renderedAt: new Date().toISOString(), commit, fps: FPS, x264: X264, vp9: VP9, variants: results }, null, 2)}\n`,
  );
  await writeFile(
    join(media, 'README.txt'),
    [
      `film-<locale>-<layout>-${FILM_VERSION}.{mp4,webm} and the posters film-<locale>-<layout>-poster.webp are rendered by`,
      'scripts/render-film.mjs from the timeline in src/lib/film.ts (npm run film) and narrated by',
      'scripts/narrate-film.mjs from narration/ (English and Simplified Chinese; the Japanese film has the',
      'English narration); story-<layout>.webp from the home page story scene (src/lib/scene.ts, end of',
      'act 3). The film is a simulated demo. App icons are the apps’ own (public/apps/sources.json) and',
      'belong to their owners. Do not edit by hand.',
      '',
    ].join('\n'),
  );
}

server.close();

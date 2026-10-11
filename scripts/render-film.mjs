// Renders the concept film from the story timeline in src/lib/scene.ts.
//
//   npm run film                               both layouts → public/media/ (MP4, WebM and posters)
//   npm run film -- --stills 0,3.6,9.8 --out d only PNG stills of those moments, for review
//   npm run film -- --stills-only              recut posters and stills from the last render's frames
//
// Builds the site with FILM_STAGE=1 (which adds the /film/<layout>/ render pages), plays the
// timeline frame by frame in Chromium and encodes the frames with ffmpeg, which must be on PATH.
// The outputs are committed; CI and deploys never run this.
import { chromium } from 'playwright';
import { execFileSync } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../', import.meta.url));
const build = join(root, '.film-build');
const media = join(root, 'public/media');
const FPS = 30;
const SIZES = { wide: { width: 1920, height: 1080 }, tall: { width: 1080, height: 1350 } };

const args = process.argv.slice(2);
const option = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const stills = option('stills')?.split(',').map(Number);
const only = option('layout');
const layouts = Object.keys(SIZES).filter((l) => !only || l === only);

const frameFile = (frames, i) => join(frames, `${String(i).padStart(4, '0')}.png`);

// Stills cut from the rendered frames: the poster is the opening frame, so playback starts
// without a jump; the story still (end of act 3) stands in for the scroll story without JavaScript.
async function writeStills(layout, frames) {
  const webp = (i, file) => sharp(frameFile(frames, i)).webp({ quality: 82, effort: 6 }).toFile(join(media, file));
  await webp(0, `film-${layout}-poster.webp`);
  await webp(Math.round(9.8 * FPS), `story-${layout}.webp`);
}

if (args.includes('--stills-only')) {
  // Recut the stills from frames already rendered into .film-build.
  for (const layout of layouts) await writeStills(layout, join(build, `frames-${layout}`));
  console.log('stills recut');
  process.exit(0);
}

execFileSync('npx', ['astro', 'build'], {
  cwd: root,
  stdio: ['ignore', 'ignore', 'inherit'],
  env: { ...process.env, FILM_STAGE: '1', SITE_OUT_DIR: './.film-build', SITE_BASE: '/', SITE_NOINDEX: '1' },
});

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  let file = join(build, decodeURIComponent(new URL(req.url, 'http://x').pathname));
  try {
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
for (const layout of layouts) {
  const page = await browser.newPage({ viewport: SIZES[layout], deviceScaleFactor: 1 });
  await page.goto(`${origin}/film/${layout}/`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const duration = await page.evaluate(() => window.__film.duration);
  const shoot = async (t, path) => {
    await page.evaluate((time) => window.__film.render(time), t);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))));
    await page.screenshot({ path, type: 'png' });
  };

  if (stills) {
    const out = option('out') ?? join(root, 'test-output/stills');
    await mkdir(out, { recursive: true });
    for (const t of stills) await shoot(t, join(out, `${layout}-${t.toFixed(2)}.png`));
    console.log(`${layout}: ${stills.length} stills → ${out}`);
    await page.close();
    continue;
  }

  const frames = join(build, `frames-${layout}`);
  await rm(frames, { recursive: true, force: true });
  await mkdir(frames, { recursive: true });
  const count = Math.round(duration * FPS);
  for (let i = 0; i <= count; i++) {
    await shoot(i / FPS, join(frames, `${String(i).padStart(4, '0')}.png`));
    if (i % 60 === 0) process.stdout.write(`${layout}: frame ${i}/${count}\r`);
  }
  await page.close();
  console.log(`${layout}: ${count + 1} frames rendered`);

  await mkdir(media, { recursive: true });
  const input = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', join(frames, '%04d.png')];
  const name = `film-${layout}`;
  // H.264 for every browser with proprietary codecs (Safari, Chrome, Edge), hardware decoded on Macs.
  execFileSync('ffmpeg', [
    ...input,
    '-c:v', 'libx264', '-preset', 'veryslow', '-tune', 'animation', '-crf', '24',
    '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-an',
    join(media, `${name}.mp4`),
  ]);
  // VP9 for open-source browser builds without H.264, and usually smaller.
  execFileSync('ffmpeg', [
    ...input,
    '-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '36', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '1',
    '-pix_fmt', 'yuv420p', '-an',
    join(media, `${name}.webm`),
  ]);
  await writeStills(layout, frames);
  const sizes = {};
  for (const file of [`${name}.mp4`, `${name}.webm`, `${name}-poster.webp`, `story-${layout}.webp`]) {
    sizes[file] = (await stat(join(media, file))).size;
  }
  console.log(layout, sizes);
}

await browser.close();
server.close();
if (!stills) await writeFile(join(media, 'README.txt'), 'Rendered by scripts/render-film.mjs from src/lib/scene.ts. Do not edit by hand.\n');

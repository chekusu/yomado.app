// Captions for the film in 16 languages, from captions/ (the text per locale, the timing per
// narration). Writes the caption files, the captioned exports and the website's band masters:
//
//   npm run film:captions                        everything below
//   npm run film:captions -- --only fr,ar        some locales (caption files are always all written)
//   npm run film:captions -- --proof <dir>       proof frames only, for review before rendering
//   npm run film:captions -- --files-only        the caption files only
//
// public/media/captions/yomado-film-<tag>-<v>.{vtt,srt}   one caption file per locale
// public/media/captioned/yomado-film-<tag>-<layout>-<v>.mp4   the film with that locale's captions in
//     its pixels, with the narration it follows (zh-CN and zh-TW: Chinese; the rest: English), for
//     sharing as a file
// public/media/film-<visual>-<layout>-band-<v>.{mp4,webm} and -band-poster-<v>.webp   the same films
//     without captions, for the website's switchable caption tracks
//
// Layout: inside the film's own sizes the picture shrinks to leave a caption band at the bottom
// (wide 1920 × 1080: picture 1664 × 936 at x 128; tall 1080 × 1350: picture 960 × 1200 at x 60), so
// a caption never covers the film's titles, the panel being dragged or the typing. The band is one
// night-blue plate the full width of the frame with near-white text, at most two lines inside its
// safe area. Chromium sets the text (Arabic right to left, Devanagari shaping, CJK line breaking)
// with the Noto and Inter fonts; ffmpeg scales the lossless frames of the last render
// (.film-build/frames-*), lays each caption's band over its cue window and copies the narration in.
// The timing is never changed.
import { chromium } from 'playwright';
import { execFile as execFileCb } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import sharp from 'sharp';

const execFile = promisify(execFileCb);
const root = fileURLToPath(new URL('../', import.meta.url));
const build = join(root, '.film-build');
const media = join(root, 'public/media');
const FPS = 30;
const FRAMES = 1801;

const filmMedia = JSON.parse(await readFile(join(root, 'src/lib/film-media.json'), 'utf8'));
const V = filmMedia.captions;
const index = JSON.parse(await readFile(join(root, 'captions/index.json'), 'utf8'));
const timing = JSON.parse(await readFile(join(root, 'captions/timing.json'), 'utf8'));
const text = {};
for (const tag of index.order) text[tag] = JSON.parse(await readFile(join(root, 'captions', `${tag}.json`), 'utf8'));

export const LAYOUT = {
  wide: { width: 1920, height: 1080, picture: { w: 1664, h: 936, x: 128 }, band: { y: 936, h: 144 }, safe: { x: 144, w: 1632, y: 958, h: 94 }, font: 38, line: 46 },
  tall: { width: 1080, height: 1350, picture: { w: 960, h: 1200, x: 60 }, band: { y: 1200, h: 150 }, safe: { x: 72, w: 936, y: 1220, h: 102 }, font: 42, line: 50 },
};
export const BAND = '#050a1c';
const INK = '#f5f5f7';
// Arabic and Devanagari read smaller than Latin at the same size; the line height stays the same.
const SCALE = { ar: 1.1, hi: 1.06 };
const SCRIPT_FONT = {
  'zh-CN': 'Noto Sans SC Variable',
  'zh-TW': 'Noto Sans TC Variable',
  ja: 'Noto Sans JP Variable',
  ko: 'Noto Sans KR Variable',
  ar: 'Noto Sans Arabic Variable',
  hi: 'Noto Sans Devanagari Variable',
};
const FONT_PACKAGES = ['inter', 'noto-sans-sc', 'noto-sans-tc', 'noto-sans-jp', 'noto-sans-kr', 'noto-sans-arabic', 'noto-sans-devanagari'];
const NARRATION_FILE = { en: 'en', zh: 'zh-cn' };
const LANGUAGE_TAG = { en: 'eng', zh: 'zho' };

/** The cues of a locale: its family's windows with its own text. */
export function cuesOf(tag) {
  const { family, cues } = text[tag];
  return timing.families[family].cues.map((c) => ({ key: c.key, start: c.start, end: c.end, text: cues[c.key] }));
}

const stamp = (s, sep) => {
  const ms = Math.round(s * 1000);
  const p = (v, n = 2) => String(v).padStart(n, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}${sep}${p(ms % 1000, 3)}`;
};
// WebVTT cues snap to the last line, so in the band masters they sit in the band at the bottom
// and the browser lifts them above its own controls while those show; at most 84 % wide, centred.
// SRT carries text and time only.
const VTT_SETTINGS = 'position:50%,center size:84% align:center';
export const toVtt = (tag) =>
  `WEBVTT\n\n${cuesOf(tag)
    .map((c, i) => `${i + 1}\n${stamp(c.start, '.')} --> ${stamp(c.end, '.')} ${VTT_SETTINGS}\n${c.text.replace(/&/g, '&amp;').replace(/</g, '&lt;')}\n`)
    .join('\n')}`;
export const toSrt = (tag) => cuesOf(tag).map((c, i) => `${i + 1}\n${stamp(c.start, ',')} --> ${stamp(c.end, ',')}\n${c.text}\n`).join('\n');

const sha256 = async (file) => createHash('sha256').update(await readFile(file)).digest('hex');
const option = (name) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
};

/** A page that sets one caption band at a time and reports the lines it broke the text into. */
async function captionPage(browser) {
  const css = FONT_PACKAGES.map((p) => `<link rel="stylesheet" href="${pathToFileURL(join(root, 'node_modules/@fontsource-variable', p, 'wght.css')).href}">`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8">${css}<style>
    html, body { margin: 0; background: ${BAND}; }
    #band { position: relative; background: ${BAND}; overflow: hidden; }
    #safe { position: absolute; display: flex; align-items: center; justify-content: center; }
    #text { margin: 0; color: ${INK}; font-weight: 500; text-align: center; text-wrap: balance; font-kerning: normal;
            font-synthesis: none; -webkit-font-smoothing: antialiased; overflow-wrap: break-word; }
    #text:lang(zh-CN), #text:lang(zh-TW) { line-break: strict; }
    #text:lang(ja) { line-break: strict; word-break: auto-phrase; }
    #text:lang(ko) { word-break: keep-all; }
  </style></head><body><div id="band"><div id="safe"><p id="text"></p></div></div></body></html>`;
  await mkdir(join(build, 'captions'), { recursive: true });
  const file = join(build, 'captions', 'page.html');
  await writeFile(file, html);
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(file).href);
  return page;
}

async function setBand(page, tag, layout, cueText) {
  const L = LAYOUT[layout];
  const size = Math.round(L.font * (SCALE[tag] ?? 1));
  const family = [`'Inter Variable'`, SCRIPT_FONT[tag] && `'${SCRIPT_FONT[tag]}'`].filter(Boolean).join(', ');
  await page.setViewportSize({ width: L.width, height: L.band.h });
  return page.evaluate(
    async ({ L, tag, dir, size, family, cueText }) => {
      const band = document.getElementById('band');
      const safe = document.getElementById('safe');
      const p = document.getElementById('text');
      Object.assign(band.style, { width: `${L.width}px`, height: `${L.band.h}px` });
      Object.assign(safe.style, { left: `${L.safe.x}px`, width: `${L.safe.w}px`, top: `${L.safe.y - L.band.y}px`, height: `${L.safe.h}px` });
      Object.assign(p.style, { fontFamily: family, fontSize: `${size}px`, lineHeight: `${L.line}px`, maxWidth: `${L.safe.w}px` });
      p.lang = tag;
      p.dir = dir;
      p.textContent = cueText;
      // Load every face the text needs (subsets load by unicode range), then lay out.
      const faces = family.split(',').map((f) => f.trim());
      await Promise.all(faces.map((f) => document.fonts.load(`500 ${size}px ${f}`, cueText)));
      await document.fonts.ready;
      // Where the browser broke the lines: the top of each grapheme, in logical order.
      const node = p.firstChild;
      const lines = [];
      let line = '';
      let top = null;
      for (const { segment, index } of new Intl.Segmenter(tag, { granularity: 'grapheme' }).segment(cueText)) {
        const r = document.createRange();
        r.setStart(node, index);
        r.setEnd(node, index + segment.length);
        const rect = [...r.getClientRects()].find((x) => x.width > 0);
        if (rect && segment.trim()) {
          if (top !== null && Math.abs(rect.top - top) > 4) {
            lines.push(line);
            line = '';
          }
          top = rect.top;
        }
        line += segment;
      }
      lines.push(line);
      const box = p.getBoundingClientRect();
      const safeBox = safe.getBoundingClientRect();
      const fonts = [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family);
      return {
        lines: lines.map((l) => l.trim()).filter(Boolean),
        fits: box.width <= safeBox.width + 0.5 && box.height <= safeBox.height + 0.5 && p.scrollWidth <= Math.ceil(box.width) + 1,
        width: Math.round(box.width),
        height: Math.round(box.height),
        fonts: [...new Set(fonts)],
      };
    },
    { L, tag, dir: text[tag].dir, size, family, cueText },
  );
}

/** Each cue of each locale and layout as a band image; returns what was set. */
async function renderBands(browser, tags, layouts) {
  const page = await captionPage(browser);
  const set = {};
  for (const tag of tags) {
    for (const layout of layouts) {
      const dir = join(build, 'captions', 'bands', tag, layout);
      await rm(dir, { recursive: true, force: true });
      await mkdir(dir, { recursive: true });
      const cues = [];
      for (const cue of cuesOf(tag)) {
        const result = await setBand(page, tag, layout, cue.text);
        if (result.lines.length > 2 || !result.fits) throw new Error(`${tag} ${layout} ${cue.key}: ${result.lines.length} lines, ${result.width}×${result.height} — does not fit "${cue.text}"`);
        // Nothing lost or doubled: the lines hold exactly the cue's characters.
        if (result.lines.join('').replace(/\s+/g, '') !== cue.text.replace(/\s+/g, '')) throw new Error(`${tag} ${layout} ${cue.key}: set ${JSON.stringify(result.lines)} for "${cue.text}"`);
        const png = join(dir, `${cue.key}.png`);
        await page.locator('#band').screenshot({ path: png });
        cues.push({ ...cue, lines: result.lines, width: result.width, png });
      }
      set[`${tag}/${layout}`] = cues;
    }
  }
  await page.close();
  return set;
}

const frames = (visual, layout) => join(build, `frames-${visual}-${layout}`, '%05d.png');
const base = (layout) => {
  const L = LAYOUT[layout];
  return `scale=${L.picture.w}:${L.picture.h}:flags=lanczos,pad=${L.width}:${L.height}:${L.picture.x}:0:color=0x${BAND.slice(1)}`;
};
const X264 = ['-c:v', 'libx264', '-preset', 'slow', '-tune', 'animation', '-crf', '22', '-profile:v', 'high', '-level:v', '4.0', '-pix_fmt', 'yuv420p', '-g', '60', '-threads', '8'];
const VP9 = ['-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '35', '-row-mt', '1', '-tile-columns', '2', '-deadline', 'good', '-cpu-used', '2', '-g', '60', '-pix_fmt', 'yuv420p'];
const CLEAN = ['-map_metadata', '-1', '-fflags', '+bitexact'];

/**
 * The film of one locale with its captions in the band, and its narration. Each band image is a
 * single frame read inside the filter graph (movie=) and held by the overlay for its cue's window;
 * looping images as inputs instead makes ffmpeg queue frames without end.
 */
async function exportCaptioned(tag, layout, cues) {
  const { family, visual } = { family: text[tag].family, visual: index.locales[tag].visual };
  const L = LAYOUT[layout];
  const out = join(media, 'captioned', `yomado-film-${tag}-${layout}-${V}.mp4`);
  const inputs = ['-framerate', String(FPS), '-i', frames(visual, layout), '-i', join(root, 'narration', `${NARRATION_FILE[family]}.m4a`)];
  const chain = [`[0:v]${base(layout)}[v0]`];
  cues.forEach((c, i) => {
    chain.push(`movie='${c.png}'[c${i}]`);
    chain.push(`[v${i}][c${i}]overlay=0:${L.band.y}:eof_action=repeat:enable='between(t,${c.start},${c.end})'[v${i + 1}]`);
  });
  chain.push(`[v${cues.length}]format=yuv420p[out]`);
  await execFile('ffmpeg', ['-y', '-loglevel', 'error', ...inputs, '-filter_complex', chain.join(';'), '-map', '[out]', '-map', '1:a:0', ...X264, '-frames:v', String(FRAMES), '-c:a', 'copy', ...CLEAN, '-metadata:s:a:0', `language=${LANGUAGE_TAG[family]}`, '-movflags', '+faststart', out], { maxBuffer: 1 << 24 });
  return out;
}

/** A website master: the band layout without captions, MP4 and WebM, and its poster. */
async function bandMaster(visual, layout) {
  const family = visual === 'zh-cn' ? 'zh' : 'en';
  const audio = join(root, 'narration', `${NARRATION_FILE[family]}.m4a`);
  const name = `film-${visual}-${layout}-band-${V}`;
  const vf = `${base(layout)},format=yuv420p`;
  const common = ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', frames(visual, layout), '-i', audio, '-vf', vf, '-map', '0:v', '-map', '1:a:0', '-frames:v', String(FRAMES), ...CLEAN, '-metadata:s:a:0', `language=${LANGUAGE_TAG[family]}`];
  await Promise.all([
    execFile('ffmpeg', [...common, ...X264, '-c:a', 'copy', '-movflags', '+faststart', join(media, `${name}.mp4`)]),
    execFile('ffmpeg', [...common, ...VP9, '-c:a', 'libopus', '-b:a', '96k', '-ac', '2', '-ar', '48000', '-cues_to_front', '1', join(media, `${name}.webm`)]),
  ]);
  const L = LAYOUT[layout];
  await sharp(join(build, `frames-${visual}-${layout}`, '00000.png'))
    .resize(L.picture.w, L.picture.h, { kernel: 'lanczos3' })
    .extend({ top: 0, bottom: L.height - L.picture.h, left: L.picture.x, right: L.width - L.picture.w - L.picture.x, background: BAND })
    .webp({ quality: 82, effort: 6 })
    .toFile(join(media, `film-${visual}-${layout}-band-poster-${V}.webp`));
  return name;
}

/** One frame of an export, composed exactly as ffmpeg lays it out, at the middle of a cue. */
async function proofFrame(tag, layout, cue, out) {
  const L = LAYOUT[layout];
  const frame = Math.round(((cue.start + cue.end) / 2) * FPS);
  const picture = await sharp(join(build, `frames-${index.locales[tag].visual}-${layout}`, `${String(frame).padStart(5, '0')}.png`))
    .resize(L.picture.w, L.picture.h, { kernel: 'lanczos3' })
    .toBuffer();
  await sharp({ create: { width: L.width, height: L.height, channels: 3, background: BAND } })
    .composite([
      { input: picture, left: L.picture.x, top: 0 },
      { input: cue.png, left: 0, top: L.band.y },
    ])
    .png()
    .toFile(out);
  return { tag, layout, key: cue.key, at: +(frame / FPS).toFixed(3), lines: cue.lines, file: out };
}

async function pool(items, size, fn) {
  const results = [];
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < items.length) {
        const i = next++;
        results[i] = await fn(items[i]);
      }
    }),
  );
  return results;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const only = option('only')?.split(',');
  const proof = option('proof');
  const tags = index.order.filter((t) => !only || only.includes(t));
  const layouts = Object.keys(LAYOUT);
  const browser = await chromium.launch();

  if (proof) {
    // English, Chinese, Japanese, Arabic (right to left) and Hindi (Devanagari shaping), then the
    // widest cue that needs two lines.
    await mkdir(proof, { recursive: true });
    const picks = [
      ['en', 'en12'],
      ['zh-CN', 'zh10'],
      ['ja', 'en10'],
      ['ar', 'en02'],
      ['hi', 'en10'],
    ];
    const set = await renderBands(browser, index.order, layouts);
    let widest = null;
    for (const [k, cues] of Object.entries(set)) for (const c of cues) if (c.lines.length === 2 && (!widest || c.text.length > widest.cue.text.length)) widest = { k, cue: c };
    // Arabic and Devanagari: their widest set cue as well, to judge the shaping itself.
    for (const tag of ['ar', 'hi']) {
      const cue = set[`${tag}/tall`].reduce((a, b) => (b.width > a.width ? b : a));
      if (!picks.some(([t, k]) => t === tag && k === cue.key)) picks.push([tag, cue.key]);
    }
    const out = [];
    for (const [tag, key] of [...picks, [widest.k.split('/')[0], widest.cue.key]]) {
      for (const layout of layouts) {
        const cue = set[`${tag}/${layout}`].find((c) => c.key === key);
        out.push(await proofFrame(tag, layout, cue, join(proof, `proof-${tag}-${key}-${layout}.png`)));
      }
    }
    const twoLine = Object.entries(set).flatMap(([k, cues]) => cues.filter((c) => c.lines.length === 2).map((c) => `${k} ${c.key}`));
    await writeFile(join(proof, 'proof.json'), `${JSON.stringify({ frames: out, widestTwoLine: { set: widest.k, key: widest.cue.key, lines: widest.cue.lines }, twoLineCues: twoLine }, null, 2)}\n`);
    console.log(JSON.stringify({ frames: out.map((f) => f.file), widestTwoLine: widest.cue.lines, twoLineCount: twoLine.length }, null, 2));
    await browser.close();
    process.exit(0);
  }

  // Caption files for every locale.
  await mkdir(join(media, 'captions'), { recursive: true });
  await mkdir(join(media, 'captioned'), { recursive: true });
  for (const tag of index.order) {
    await writeFile(join(media, 'captions', `yomado-film-${tag}-${V}.vtt`), toVtt(tag));
    await writeFile(join(media, 'captions', `yomado-film-${tag}-${V}.srt`), toSrt(tag));
  }
  if (process.argv.includes('--files-only')) {
    await browser.close();
    process.exit(0);
  }
  const set = await renderBands(browser, tags, layouts);
  await browser.close();

  const jobs = tags.flatMap((tag) => layouts.map((layout) => ({ tag, layout })));
  const masters = only || process.argv.includes('--skip-masters') ? [] : ['en', 'zh-cn', 'ja'].flatMap((visual) => layouts.map((layout) => ({ visual, layout })));
  const started = Date.now();
  await pool([...masters.map((m) => ({ master: m })), ...jobs], 4, async (job) => {
    if (job.master) {
      const name = await bandMaster(job.master.visual, job.master.layout);
      console.log(`master ${name} (${Math.round((Date.now() - started) / 1000)} s)`);
    } else {
      const out = await exportCaptioned(job.tag, job.layout, set[`${job.tag}/${job.layout}`]);
      console.log(`export ${out.slice(media.length + 1)} (${Math.round((Date.now() - started) / 1000)} s)`);
    }
  });

  // What was made, for review and checks: every file's size and hash, every cue's lines.
  const files = {};
  for (const dir of ['captions', 'captioned', '.']) {
    for (const f of (await readdir(join(media, dir))).filter((f) => f.includes(`-${V}.`) || f.includes(`-${V}-`))) {
      const p = join(media, dir, f);
      if ((await stat(p)).isFile()) files[join(dir, f).replace(/^\.\//, '')] = { bytes: (await stat(p)).size, sha256: await sha256(p) };
    }
  }
  const lines = Object.fromEntries(Object.entries(set).map(([k, cues]) => [k, cues.map((c) => ({ key: c.key, start: c.start, end: c.end, lines: c.lines }))]));
  await writeFile(join(build, 'captions-manifest.json'), `${JSON.stringify({ renderedAt: new Date().toISOString(), version: V, layout: LAYOUT, x264: X264, vp9: VP9, files, lines }, null, 2)}\n`);
  console.log(`done: ${Object.keys(files).length} files`);
}

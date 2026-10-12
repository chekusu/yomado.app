// Browser smoke test for the built site.
//
//   npm run build && npm test             serves dist/ with a minimal static server
//   BASE_URL=https://host/path/ npm test  tests an already deployed copy
//   SCREENSHOT_DIR=dir npm test           also writes desktop and phone screenshots to dir
//
// Covers all three locales (English, Simplified Chinese, Japanese) at desktop, laptop, tablet and
// phone widths: metadata, console errors, failed requests, horizontal overflow, the download entry
// points, the one-minute film (its real length and size, autoplay, play/pause/replay, seeking to
// the end, the keyboard, poster, fallback, reduced motion, byte ranges and media types of every
// file; its narration: muted by itself, the sound button, the first time from the beginning, a mute
// that holds, nothing audible starting by itself, refused or interrupted play()), the watch page
// (the browser's own controls with sound, seeking, the MP4 links), the scroll story and
// finale, the language menu between every pair of locales on home, details and watch pages, the
// details page with checksum copy, the agent setup under the panel and on the details page (the
// skill link, the request to copy by mouse or keyboard, the clipboard fallback, phones, without
// JavaScript), the page without JavaScript, the header on phones with classic scrollbars, 404,
// sitemap and robots.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const config = JSON.parse(await readFile(new URL('../site.config.json', import.meta.url), 'utf8'));
const SITE = (process.env.SITE_URL || config.siteUrl).replace(/\/?$/, '/');
const RELEASE = config.release;
const SHOTS = process.env.SCREENSHOT_DIR;

// `name` and `short` are how the language menu names each language; `ui` is how each locale says
// the app's own interface language, which stays Simplified Chinese.
const LOCALES = [
  {
    key: 'en',
    path: '',
    lang: 'en',
    og: 'en_US',
    name: 'English',
    short: 'EN',
    title: /A screen for your agents/,
    caption: 'Simulated demo, not a recording of an agent at work. Running with physical displays switched off is not yet verified on real hardware.',
    minute: 'one minute',
    narration: 'English narration',
    ui: 'Simplified Chinese',
    request: 'Use yomado to set up a virtual screen named Codex for this Blender task, move only this task’s windows onto it, and restore them when you’re done.',
  },
  {
    key: 'zh-cn',
    path: 'zh-cn/',
    lang: 'zh-CN',
    og: 'zh_CN',
    name: '简体中文',
    short: '中文',
    title: /给 Agent\s*一块屏幕/,
    caption: '模拟演示，并非 Agent 实际工作的录像。实体屏关闭后的运行尚待实机验证。',
    minute: '1 分钟',
    narration: '中文旁白',
    ui: '简体中文',
    request: '用 yomado 为这次 Blender 任务准备一块叫 Codex 的虚拟屏，只移入本任务的窗口，完成后恢复。',
  },
  {
    key: 'ja',
    path: 'ja/',
    lang: 'ja',
    og: 'ja_JP',
    name: '日本語',
    short: '日本語',
    title: /エージェントに、\s*専用の画面を。/,
    caption: '英語ナレーション付き。シミュレーションによるデモで、エージェントが実際に作業した録画ではありません。実際のディスプレイを消した状態での動作は、実機ではまだ検証していません。',
    minute: '1 分',
    narration: '英語ナレーション',
    ui: '簡体字中国語',
    request: 'yomado で、今回の Blender の作業用に Codex という仮想画面を用意して、この作業のウィンドウだけを移し、終わったら元に戻してください。',
  },
];
const ROUTES = ['', 'details/', 'watch/'];
// The yomado skill's public folder in the app's repository.
const SKILL_URL = 'https://github.com/chekusu/yomado/tree/main/skills/yomado';
const CLIPBOARD = ['clipboard-read', 'clipboard-write'];
// The film's files, per locale: wide and tall, MP4 and WebM, and the posters.
const FILM_SECONDS = [55, 65];
// The films carry a version in their names (src/lib/film-media.json); posters don't.
const { version: V } = JSON.parse(await readFile(new URL('../src/lib/film-media.json', import.meta.url), 'utf8'));
const filmFiles = (key) => [
  ...['wide', 'tall'].flatMap((layout) => [`film-${key}-${layout}-${V}.mp4`, `film-${key}-${layout}-${V}.webm`, `film-${key}-${layout}-poster.webp`]),
];
const filmSrc = (key, layout) => new RegExp(`/film-${key}-${layout}-${V}\\.(mp4|webm)$`);
const MEDIA_TYPE = { mp4: 'video/mp4', webm: 'video/webm', webp: 'image/webp' };
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 945, height: 800 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'small', width: 320, height: 640 },
];
// hreflang alternates every page should list: one per locale plus x-default (English).
const alternatesFor = (route) => [...LOCALES.map((l) => `${l.lang} ${SITE}${l.path}${route}`), `x-default ${SITE}${route}`].sort();

let server;
let base = process.env.BASE_URL;
if (!base) {
  // Serve dist/ the way a static host would (byte ranges included), under SITE_BASE if the build used one.
  const prefix = (process.env.SITE_BASE ?? '/').replace(/^\/?/, '/').replace(/\/?$/, '/');
  const dist = fileURLToPath(new URL(`../${process.env.SITE_OUT_DIR ?? 'dist'}/`, import.meta.url));
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.avif': 'image/avif',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml',
  };
  server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (!url.pathname.startsWith(prefix)) return res.writeHead(404).end();
    let file = join(dist, decodeURIComponent(url.pathname.slice(prefix.length)));
    if (!file.startsWith(dist)) return res.writeHead(403).end();
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      const body = await readFile(file);
      const headers = { 'Content-Type': types[extname(file)] ?? 'application/octet-stream', 'Accept-Ranges': 'bytes' };
      const range = /bytes=(\d*)-(\d*)/.exec(req.headers.range ?? '');
      if (range) {
        const start = range[1] ? Number(range[1]) : body.length - Number(range[2]);
        const end = range[1] && range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
        res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${body.length}` });
        return res.end(body.subarray(start, end + 1));
      }
      res.writeHead(200, headers);
      res.end(body);
    } catch {
      res.writeHead(404, { 'Content-Type': types['.html'] }).end(await readFile(join(dist, '404.html')));
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}${prefix}`;
}
if (!base.endsWith('/')) base += '/';

const results = [];
// SMOKE_PROGRESS=1 logs each check as it starts and ends; SMOKE_ONLY=<regex> runs only matching checks
// (for diagnosing one check; a full run uses neither).
const progress = process.env.SMOKE_PROGRESS === '1';
const only = process.env.SMOKE_ONLY ? new RegExp(process.env.SMOKE_ONLY) : null;
async function check(name, fn) {
  if (only && !only.test(name)) return;
  const started = Date.now();
  if (progress) console.error(`▶ ${name}`);
  try {
    await fn();
    results.push(['ok', name]);
    if (progress) console.error(`  ok (${((Date.now() - started) / 1000).toFixed(1)} s)`);
  } catch (error) {
    if (progress) console.error(`  FAIL (${((Date.now() - started) / 1000).toFixed(1)} s): ${String(error.message).split('\n')[0]}`);
    const detail = 'actual' in error ? ` (actual ${JSON.stringify(error.actual)}, expected ${JSON.stringify(error.expected)})` : '';
    results.push(['FAIL', name, String(error.message).split('\n')[0] + detail]);
  }
}

const browser = await chromium.launch();

/**
 * Play a video from a moment (seconds, or seconds before the end when negative) and wait at most
 * 15 s for playback to begin: a play() that never settles fails the check instead of hanging the run.
 */
const playFrom = (video, at) =>
  video.evaluate(async (v, at) => {
    if (at !== undefined && at !== null) v.currentTime = at < 0 ? v.duration + at : at;
    await Promise.race([v.play(), new Promise((_, reject) => setTimeout(() => reject(new Error('play() did not start within 15 s')), 15000))]);
  }, at ?? null);

/** Chromium counts the audio it decodes: more than none means the chosen file has sound and it plays. */
async function audioDecoded(page, selector) {
  for (let i = 0; i < 80; i++) {
    if ((await page.locator(selector).evaluate((v) => v.webkitAudioDecodedByteCount ?? 0)) > 0) return true;
    await page.waitForTimeout(100);
  }
  return false;
}

/** Pretend the tab was hidden or shown again (a headless page is always visible). */
const setTabHidden = (page, hidden) =>
  page.evaluate((hidden) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (hidden ? 'hidden' : 'visible') });
    document.dispatchEvent(new Event('visibilitychange'));
  }, hidden);

async function open(path, options = {}) {
  const { route, ...contextOptions } = options;
  // An English browser unless a test says otherwise: the bare home page follows the browser's language.
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'en-US', ...contextOptions });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('requestfailed', (r) => {
    // A video element cancels its own range requests while it buffers or switches source.
    const reason = r.failure()?.errorText ?? '';
    if (r.resourceType() === 'media' && /ABORTED/.test(reason)) return;
    errors.push(`failed ${r.url()} ${reason}`);
  });
  page.on('response', (r) => r.status() >= 400 && !r.url().endsWith('/does-not-exist/') && errors.push(`${r.status()} ${r.url()}`));
  if (route) await page.route(route.match, route.handler);
  // 'load', not 'networkidle': the film autoplays and streams for a minute, so the network never
  // goes quiet. Fonts are awaited below; checks that need every image call loadAllImages().
  await page.goto(base + path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  return { context, page, errors };
}

// Load and decode every image (lazy ones included) so checks and full-page captures see them.
async function loadAllImages(page) {
  await page.evaluate(async () => {
    for (const img of document.images) img.loading = 'eager';
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
  });
}

// Scroll so a fraction p (0–1) of the story's pinned travel has passed.
async function scrollStory(page, p) {
  await page.evaluate((p) => {
    const story = document.querySelector('[data-story]');
    const sticky = story.firstElementChild;
    const top = story.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(sticky).top);
    scrollTo(0, top + (story.offsetHeight - sticky.offsetHeight) * p);
  }, p);
}

const box = (page, selector) =>
  page
    .locator(selector)
    .first()
    .evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { x: r.x, y: r.y, w: r.width, h: r.height, o: Number(getComputedStyle(el).opacity) };
    });
const inside = (a, b) => a.x >= b.x - 1 && a.y >= b.y - 1 && a.x + a.w <= b.x + b.w + 1 && a.y + a.h <= b.y + b.h + 1;

for (const locale of LOCALES) {
  await check(`${locale.lang}: metadata and structured data`, async () => {
    const { context, page, errors } = await open(locale.path);
    assert.equal(await page.getAttribute('html', 'lang'), locale.lang);
    assert.match(await page.title(), /yomado/);
    assert.match(await page.locator('h1').innerText(), locale.title);
    assert.equal(await page.locator('h1').count(), 1);
    assert.ok((await page.getAttribute('meta[name=description]', 'content')).length > 60, 'description');
    assert.equal(await page.getAttribute('link[rel=canonical]', 'href'), SITE + locale.path);
    const alternates = await page.$$eval('link[rel=alternate][hreflang]', (els) => els.map((e) => `${e.hreflang} ${e.href}`));
    assert.deepEqual(alternates.sort(), alternatesFor(''));
    assert.equal(await page.getAttribute('meta[property="og:url"]', 'content'), SITE + locale.path);
    assert.equal(await page.getAttribute('meta[property="og:locale"]', 'content'), locale.og);
    const ogAlternates = await page.$$eval('meta[property="og:locale:alternate"]', (els) => els.map((e) => e.content));
    assert.deepEqual(ogAlternates.sort(), LOCALES.filter((l) => l !== locale).map((l) => l.og).sort());
    assert.equal(await page.getAttribute('meta[property="og:image"]', 'content'), `${SITE}og/${locale.key}.png`);
    assert.equal(await page.getAttribute('meta[name="twitter:card"]', 'content'), 'summary_large_image');
    const ld = JSON.parse(await page.locator('script[type="application/ld+json"]').innerText());
    assert.equal(ld.softwareVersion, RELEASE.version);
    assert.equal(ld.downloadUrl, RELEASE.url);
    for (const asset of ['favicon.svg', 'favicon-32.png', 'apple-touch-icon.png', `og/${locale.key}.png`]) {
      const response = await page.request.get(base + asset);
      assert.equal(response.status(), 200, asset);
    }
    assert.deepEqual(errors, []);
    await context.close();
  });

  await check(`${locale.lang}: every download link is the configured release archive`, async () => {
    const { context, page } = await open(locale.path);
    const kinds = await page.$$eval('a[data-download]', (els) => els.map((e) => [e.dataset.download, e.href]));
    assert.deepEqual(
      kinds.map(([kind]) => kind),
      ['header', 'hero', 'finale'],
    );
    for (const [, href] of kinds) assert.equal(href, RELEASE.url);
    const zips = await page.$$eval('a[href$=".zip"]', (els) => els.map((e) => e.href));
    assert.deepEqual([...new Set(zips)], [RELEASE.url], 'no other archives, in particular no source zip');
    const repo = await page.$$eval(`a[href="${config.appRepository}"]`, (els) => els.length);
    assert.ok(repo >= 2, 'GitHub links');
    const details = await page.$$eval('a[href$="details/"]', (els) => els.map((e) => e.href));
    assert.ok(details.length >= 2 && details.every((href) => href === `${base}${locale.path}details/`), 'details links');
    await context.close();
  });

  for (const viewport of VIEWPORTS) {
    await check(`${locale.lang} @${viewport.width}: no overflow, download and film in the first screen`, async () => {
      const { context, page, errors } = await open(locale.path, { viewport, reducedMotion: 'reduce' });
      await loadAllImages(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 0, `horizontal overflow ${overflow}px`);
      const hero = page.locator('a[data-download="hero"]');
      assert.ok(await hero.isVisible(), 'hero download visible');
      const at = await hero.boundingBox();
      assert.ok(at.y + at.height <= viewport.height, `hero download at ${Math.round(at.y)}px`);
      assert.ok(await page.locator('a[data-download="header"]').isVisible(), 'header download visible');
      const film = await box(page, '[data-film] video');
      assert.ok(film.y < viewport.height, 'the film starts in the first screen');
      const broken = await page.$$eval('img', (imgs) => imgs.filter((i) => i.offsetParent && (!i.complete || i.naturalWidth === 0)).map((i) => i.src));
      assert.deepEqual(broken, []);
      assert.equal(await page.$$eval('img:not([alt])', (imgs) => imgs.length), 0);
      assert.deepEqual(errors, []);
      if (SHOTS) {
        await mkdir(SHOTS, { recursive: true });
        await page.screenshot({ path: join(SHOTS, `${locale.key}-${viewport.name}-fold.png`) });
        if (viewport.name === 'desktop' || viewport.name === 'mobile') {
          await page.screenshot({ path: join(SHOTS, `${locale.key}-${viewport.name}-full.png`), fullPage: true });
        }
      }
      await context.close();
    });
  }

  await check(`${locale.lang}: the one-minute film plays muted inline, seeks, pauses, ends and replays`, async () => {
    const { context, page, errors } = await open(locale.path);
    const video = page.locator('[data-film] video');
    const toggle = page.locator('[data-film-toggle]');
    const attrs = await video.evaluate((v) => ({ muted: v.muted, inline: v.playsInline, controls: v.controls, poster: v.poster, label: v.getAttribute('aria-label') }));
    assert.ok(attrs.muted && attrs.inline, 'muted and playsinline');
    assert.equal(attrs.controls, false, 'our button replaces the native controls');
    assert.match(attrs.poster, new RegExp(`/film-${locale.key}-wide-poster\\.webp$`));
    assert.ok(attrs.label.includes(locale.minute) && !/16/.test(attrs.label), 'described as the one-minute film');
    assert.ok(attrs.label.includes(locale.narration) && !/no sound|无声|音声なし/.test(attrs.label), 'described with its narration');
    const caption = page.locator('[data-film] figcaption');
    assert.ok((await caption.innerText()).startsWith(locale.caption), 'caption');
    assert.equal(await caption.locator('[data-watch-link]').getAttribute('href'), `${new URL(base).pathname}${locale.path}watch/`);
    // Media events arrive asynchronously, so wait for the button to catch up rather than racing it.
    const state = (s) => page.waitForFunction((s) => document.querySelector('[data-film-toggle]').dataset.state === s, s, { timeout: 10000 });
    await page.waitForFunction(() => document.querySelector('[data-film] video').currentTime > 1, null, { timeout: 15000 });
    await state('playing');
    assert.equal(await toggle.getAttribute('aria-label'), await toggle.getAttribute('data-label-pause'));
    const meta = await video.evaluate((v) => ({ src: v.currentSrc, duration: v.duration, w: v.videoWidth, h: v.videoHeight }));
    assert.match(meta.src, filmSrc(locale.key, 'wide'));
    assert.ok(meta.duration >= FILM_SECONDS[0] && meta.duration <= FILM_SECONDS[1], `duration ${meta.duration}`);
    assert.deepEqual([meta.w, meta.h], [1920, 1080]);
    await toggle.click();
    await state('paused');
    assert.equal(await video.evaluate((v) => v.paused), true);
    assert.equal(await toggle.getAttribute('aria-label'), await toggle.getAttribute('data-label-play'));
    // Into the middle: it plays on from there.
    await playFrom(video, 30);
    await page.waitForFunction(() => document.querySelector('[data-film] video').currentTime > 30.6, null, { timeout: 15000 });
    await playFrom(video, -0.3);
    await state('ended');
    assert.equal(await video.evaluate((v) => v instanceof HTMLMediaElement && v.ended), true);
    assert.equal(await toggle.getAttribute('aria-label'), await toggle.getAttribute('data-label-replay'));
    await toggle.click();
    await page.waitForFunction(() => {
      const v = document.querySelector('[data-film] video');
      return !v.paused && v.currentTime < 3;
    });
    // Every file of this locale's film is served with its own media type and answers byte ranges,
    // from the start and from the middle (Safari needs them; every browser needs them to seek).
    for (const file of filmFiles(locale.key)) {
      const response = await page.request.get(`${base}media/${file}`);
      assert.equal(response.status(), 200, file);
      assert.equal(response.headers()['content-type'], MEDIA_TYPE[file.split('.').pop()], file);
      if (!/\.(mp4|webm)$/.test(file)) continue;
      const size = (await response.body()).length;
      const head = await page.request.get(`${base}media/${file}`, { headers: { Range: 'bytes=0-1' } });
      assert.equal(head.status(), 206, `${file} range`);
      assert.equal(head.headers()['content-range'], `bytes 0-1/${size}`, `${file} content-range`);
      const mid = Math.floor(size / 2);
      const middle = await page.request.get(`${base}media/${file}`, { headers: { Range: `bytes=${mid}-${mid + 99}` } });
      assert.equal(middle.status(), 206, `${file} middle range`);
      assert.equal((await middle.body()).length, 100, `${file} middle range length`);
    }
    assert.deepEqual(errors, []);
    await context.close();
  });

  await check(`${locale.lang}: phones get the portrait film and poster`, async () => {
    const { context, page } = await open(locale.path, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const video = page.locator('[data-film] video');
    assert.match(await video.evaluate((v) => v.poster), new RegExp(`/film-${locale.key}-tall-poster\\.webp$`));
    await page.waitForFunction(() => document.querySelector('[data-film] video').currentTime > 0.5, null, { timeout: 15000 });
    const meta = await video.evaluate((v) => ({ src: v.currentSrc, duration: v.duration, w: v.videoWidth, h: v.videoHeight }));
    assert.match(meta.src, filmSrc(locale.key, 'tall'));
    assert.ok(meta.duration >= FILM_SECONDS[0] && meta.duration <= FILM_SECONDS[1], `duration ${meta.duration}`);
    assert.deepEqual([meta.w, meta.h], [1080, 1350]);
    const frame = await box(page, '[data-film] video');
    assert.ok(Math.abs(frame.w / frame.h - 0.8) < 0.02, `portrait frame ${frame.w}×${frame.h}`);
    await context.close();
  });

  await check(`${locale.lang}: reduced motion keeps the film still until asked, from the keyboard too`, async () => {
    const { context, page } = await open(locale.path, { reducedMotion: 'reduce' });
    await page.waitForTimeout(2500);
    const video = page.locator('[data-film] video');
    assert.equal(await video.evaluate((v) => v.paused && v.currentTime === 0), true, 'no autoplay');
    const toggle = page.locator('[data-film-toggle]');
    assert.equal(await toggle.getAttribute('aria-label'), await toggle.getAttribute('data-label-play'));
    // Tab to the button, then Enter plays and Space pauses; the focus ring shows.
    let focused = false;
    for (let i = 0; i < 30 && !focused; i++) {
      await page.keyboard.press('Tab');
      focused = await toggle.evaluate((el) => document.activeElement === el);
    }
    assert.ok(focused, 'the play button is reachable with Tab');
    assert.notEqual(await toggle.evaluate((el) => getComputedStyle(el).outlineStyle), 'none', 'focus ring');
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.querySelector('[data-film] video').currentTime > 0.3, null, { timeout: 15000 });
    await page.keyboard.press('Space');
    await page.waitForFunction(() => document.querySelector('[data-film] video').paused, null, { timeout: 5000 });
    await context.close();
  });

  await check(`${locale.lang}: without a playable source the poster stays and the button goes`, async () => {
    const { context, page } = await open(locale.path, {
      reducedMotion: 'reduce',
      route: {
        match: /\/media\/film-[a-z0-9-]+\.(mp4|webm)$/,
        handler: (r) => r.fulfill({ status: 200, contentType: 'video/mp4', body: 'not a video' }),
      },
    });
    await page.locator('[data-film-toggle]').click();
    await page.waitForFunction(() => document.querySelector('[data-film-toggle]').hidden, null, { timeout: 10000 });
    assert.equal(await page.locator('[data-film-sound]').evaluate((b) => b.hidden), true, 'the sound button goes too');
    assert.equal(await page.locator('[data-film] .controls button:visible').count(), 0, 'nothing left in sight');
    assert.match(await page.locator('[data-film] video').evaluate((v) => v.poster), /poster\.webp$/);
    await context.close();
  });

  await check(`${locale.lang}: the film starts muted; the sound button plays its narration from the start, and mutes it`, async () => {
    const { context, page, errors } = await open(locale.path);
    const video = page.locator('[data-film] video');
    const sound = page.locator('[data-film-sound]');
    const toggle = page.locator('[data-film-toggle]');
    const soundIs = (state) => page.waitForFunction((state) => document.querySelector('[data-film-sound]').dataset.state === state, state, { timeout: 10000 });
    // Muted while it plays by itself, with a visible, named way to hear it.
    await page.waitForFunction(() => document.querySelector('[data-film] video').currentTime > 2.5, null, { timeout: 20000 });
    assert.equal(await video.evaluate((v) => v.muted), true, 'starts muted');
    assert.ok(await sound.isVisible(), 'the sound button shows');
    assert.equal(await sound.getAttribute('aria-label'), await sound.getAttribute('data-label-on'));
    assert.equal((await sound.innerText()).trim(), await sound.getAttribute('data-text-on'));
    if (locale.key === 'ja') assert.ok((await sound.innerText()).includes('英語ナレーション'), 'names the English narration');
    // On: with its sound, from the beginning, and the browser decodes it.
    await sound.click();
    await soundIs('on');
    const on = await video.evaluate((v) => ({ muted: v.muted, volume: v.volume, t: v.currentTime, paused: v.paused, src: v.currentSrc }));
    assert.ok(!on.muted && on.volume > 0 && !on.paused, 'plays with its sound');
    assert.ok(on.t < 1.5, `starts again from the beginning (at ${on.t.toFixed(2)} s)`);
    assert.match(on.src, filmSrc(locale.key, 'wide'));
    assert.equal(await sound.getAttribute('aria-label'), await sound.getAttribute('data-label-off'));
    assert.ok(await audioDecoded(page, '[data-film] video'), 'its audio is decoded');
    // Off from the keyboard; the mute holds when the film leaves and comes back, pauses, plays and replays.
    await sound.focus();
    await page.keyboard.press('Enter');
    await soundIs('muted');
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForFunction(() => document.querySelector('[data-film] video').paused, null, { timeout: 5000 });
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForFunction(() => !document.querySelector('[data-film] video').paused, null, { timeout: 10000 });
    assert.equal(await video.evaluate((v) => v.muted), true, 'back in view, still muted');
    await toggle.click();
    await page.waitForFunction(() => document.querySelector('[data-film] video').paused);
    await toggle.click();
    await page.waitForFunction(() => !document.querySelector('[data-film] video').paused);
    assert.equal(await video.evaluate((v) => v.muted), true, 'play keeps the mute');
    await playFrom(video, -0.3);
    await page.waitForFunction(() => document.querySelector('[data-film] video').ended, null, { timeout: 10000 });
    await toggle.click();
    await page.waitForFunction(() => {
      const v = document.querySelector('[data-film] video');
      return !v.paused && v.currentTime < 3;
    });
    assert.equal(await video.evaluate((v) => v.muted), true, 'replay keeps the mute');
    // On again later, after seeking: it carries on from there; only the first time starts over.
    await playFrom(video, 20);
    await sound.click();
    await soundIs('on');
    assert.ok((await video.evaluate((v) => v.currentTime)) > 19, 'the second time it carries on');
    assert.deepEqual(errors, []);
    await context.close();
  });

  await check(`${locale.lang}: on phones the portrait film plays its narration, and under reduced motion only when asked`, async () => {
    const { context, page, errors } = await open(locale.path, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
    const video = page.locator('[data-film] video');
    await page.waitForTimeout(1500);
    assert.equal(await video.evaluate((v) => v.paused && v.currentTime === 0), true, 'nothing starts by itself');
    await page.locator('[data-film-sound]').tap();
    await page.waitForFunction(
      () => {
        const v = document.querySelector('[data-film] video');
        return !v.paused && !v.muted && v.currentTime > 0.3;
      },
      null,
      { timeout: 15000 },
    );
    assert.match(await video.evaluate((v) => v.currentSrc), filmSrc(locale.key, 'tall'));
    assert.ok(await audioDecoded(page, '[data-film] video'), 'its audio is decoded');
    const inside = await page.evaluate(() => {
      const f = document.querySelector('[data-film] .frame').getBoundingClientRect();
      return [...document.querySelectorAll('[data-film] .controls button')].every((b) => {
        const r = b.getBoundingClientRect();
        return r.left >= f.left && r.right <= f.right && r.bottom <= f.bottom;
      });
    });
    assert.ok(inside, 'the buttons sit inside the portrait frame');
    if (SHOTS) await page.locator('[data-film] .frame').screenshot({ path: join(SHOTS, `${locale.key}-mobile-film-sound.png`) });
    assert.deepEqual(errors, []);
    await context.close();
  });

  await check(`${locale.lang}: the watch page plays the whole film with the browser's controls`, async () => {
    const { context, page, errors } = await open(`${locale.path}watch/`);
    assert.equal(await page.getAttribute('html', 'lang'), locale.lang);
    assert.equal(await page.locator('h1').count(), 1);
    assert.equal(await page.getAttribute('link[rel=canonical]', 'href'), `${SITE}${locale.path}watch/`);
    const alternates = await page.$$eval('link[rel=alternate][hreflang]', (els) => els.map((e) => `${e.hreflang} ${e.href}`));
    assert.deepEqual(alternates.sort(), alternatesFor('watch/'));
    const video = page.locator('[data-watch-video]');
    const before = await video.evaluate((v) => ({ controls: v.controls, paused: v.paused, poster: v.poster, preload: v.preload }));
    assert.ok(before.controls && before.paused, 'the browser’s own controls; nothing plays by itself');
    assert.match(before.poster, new RegExp(`/film-${locale.key}-wide-poster\\.webp$`));
    // Click the film, as a person would; the click is the user gesture that lets it play with sound.
    await video.click();
    await page.waitForTimeout(600);
    if (await video.evaluate((v) => v.paused)) await playFrom(video);
    await page.waitForFunction(() => document.querySelector('[data-watch-video]').currentTime > 0.5, null, { timeout: 15000 });
    const meta = await video.evaluate((v) => ({ src: v.currentSrc, duration: v.duration, w: v.videoWidth, h: v.videoHeight }));
    assert.match(meta.src, filmSrc(locale.key, 'wide'));
    assert.ok(meta.duration >= FILM_SECONDS[0] && meta.duration <= FILM_SECONDS[1], `duration ${meta.duration}`);
    assert.deepEqual([meta.w, meta.h], [1920, 1080]);
    assert.deepEqual(await video.evaluate((v) => [v.muted, v.volume > 0]), [false, true], 'plays with its sound');
    assert.ok(await audioDecoded(page, '[data-watch-video]'), 'its audio is decoded');
    assert.ok((await page.locator('.player figcaption').innerText()).includes(locale.narration), 'says which narration');
    await video.evaluate((v) => (v.currentTime = 44));
    await page.waitForFunction(() => document.querySelector('[data-watch-video]').currentTime > 44.5, null, { timeout: 15000 });
    await video.evaluate((v) => (v.currentTime = v.duration - 0.4));
    await page.waitForFunction(() => document.querySelector('[data-watch-video]').ended, null, { timeout: 15000 });
    for (const layout of ['wide', 'tall']) {
      const link = page.locator(`[data-mp4="${layout}"]`);
      assert.equal(await link.getAttribute('href'), `${new URL(base).pathname}media/film-${locale.key}-${layout}-${V}.mp4`);
      assert.match(await link.innerText(), layout === 'wide' ? /1920 × 1080/ : /1080 × 1350/);
      const response = await page.request.get(new URL(await link.getAttribute('href'), base).href);
      assert.equal(response.status(), 200);
      assert.equal(response.headers()['content-type'], 'video/mp4');
    }
    assert.equal(await page.getAttribute('a[data-download="watch"]', 'href'), RELEASE.url);
    assert.deepEqual(errors, []);
    await context.close();
  });

  await check(`${locale.lang}: on phones the watch page plays the portrait film`, async () => {
    const { context, page, errors } = await open(`${locale.path}watch/`, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, `horizontal overflow ${overflow}px`);
    const video = page.locator('[data-watch-video]');
    assert.match(await video.evaluate((v) => v.poster), new RegExp(`/film-${locale.key}-tall-poster\\.webp$`));
    // A tap may only reveal the controls; it still counts as the gesture that allows play.
    await video.tap();
    await page.waitForTimeout(600);
    if (await video.evaluate((v) => v.paused)) await playFrom(video);
    await page.waitForFunction(() => document.querySelector('[data-watch-video]').currentTime > 0.5, null, { timeout: 15000 });
    assert.match(await video.evaluate((v) => v.currentSrc), filmSrc(locale.key, 'tall'));
    assert.equal(await video.evaluate((v) => v.muted), false, 'with its sound');
    assert.ok(await audioDecoded(page, '[data-watch-video]'), 'its audio is decoded');
    const frame = await box(page, '[data-watch-video]');
    assert.ok(Math.abs(frame.w / frame.h - 0.8) < 0.02, `portrait frame ${frame.w}×${frame.h}`);
    if (SHOTS) {
      await mkdir(SHOTS, { recursive: true });
      await page.screenshot({ path: join(SHOTS, `${locale.key}-mobile-watch.png`) });
    }
    assert.deepEqual(errors, []);
    await context.close();
  });

  await check(`${locale.lang}: the story scrubs with scroll, act by act`, async () => {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const { context, page, errors } = await open(locale.path, { reducedMotion });
      const active = () => page.$eval('[data-act].is-active', (el) => Number(el.dataset.act));
      await scrollStory(page, 0.02);
      await page.waitForTimeout(800);
      assert.equal(await active(), 0);
      if (reducedMotion === 'no-preference') {
        const start = await box(page, '#story-scene [data-part="blender"]');
        assert.ok(inside(start, await box(page, '#story-scene .screen')), 'the app starts on your display');
      }
      await scrollStory(page, 0.5);
      await page.waitForTimeout(1200);
      assert.equal(await active(), 1);
      const moved = await box(page, '#story-scene [data-part="blender"]');
      assert.ok(inside(moved, await box(page, '#story-scene [data-part="codex"]')), 'the app ends up on the Codex screen');
      assert.ok(inside(await box(page, '#story-scene .notes'), await box(page, '#story-scene .screen')), 'your windows stay');
      await scrollStory(page, 0.99);
      await page.waitForTimeout(1200);
      assert.equal(await active(), 2);
      const grok = await box(page, '#story-scene [data-part="grok"]');
      assert.ok(grok.o > 0.95, 'GrokBot is open');
      assert.ok(inside(await box(page, '#story-scene [data-part="chrome"]'), grok), 'GrokBot has its own app');
      const chips = await page.$$eval('#story-scene [data-chip] img', (imgs) => imgs.map((i) => new URL(i.currentSrc || i.src).pathname.split('/').pop()));
      assert.ok(chips.length === 3 && chips.every((f) => /^(blender|md|chrome)-\d+\.png$/.test(f)), `the apps' own icons: ${chips}`);
      assert.deepEqual(errors, []);
      await context.close();
    }
  });

  await check(`${locale.lang}: the finale turns to night and forms the mark`, async () => {
    for (const reducedMotion of ['no-preference', 'reduce']) {
      const { context, page } = await open(locale.path, { reducedMotion });
      // Bring the finale to the top: the header then sits over the dark end of the dusk band.
      await page.evaluate(() => document.querySelector('#download').scrollIntoView({ block: 'start' }));
      await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('#finale-scene [data-part="mark"]')).opacity) > 0.99, null, { timeout: 8000 });
      await page.waitForFunction(() => document.querySelector('[data-header]').dataset.tone === 'night');
      assert.ok(await page.locator('a[data-download="finale"]').isVisible());
      if (SHOTS && reducedMotion === 'no-preference') {
        await page.waitForTimeout(800);
        await page.screenshot({ path: join(SHOTS, `${locale.key}-desktop-finale.png`) });
      }
      await context.close();
    }
  });

  await check(`${locale.lang}: the language menu reaches every language, page and place`, async () => {
    for (const route of ROUTES) {
      // A place on each page: the download on home, the checksum on details, the film's page itself.
      const hash = { '': '#download', 'details/': '#verify', 'watch/': '#main' }[route];
      for (const target of LOCALES.filter((l) => l !== locale)) {
        const { context, page, errors } = await open(`${locale.path}${route}${hash}`);
        const menu = page.locator('header [data-lang-menu]');
        assert.ok((await menu.locator('summary').innerText()).includes(locale.short), 'the bar shows the current language');
        await menu.locator('summary').click();
        const items = await menu.locator('a[data-lang-switch]').evaluateAll((els) => els.map((e) => [e.textContent.trim(), e.getAttribute('hreflang'), e.getAttribute('aria-current')]));
        assert.deepEqual(items, LOCALES.map((l) => [l.name, l.lang, l === locale ? 'page' : null]), 'all three, by their own names, the current one marked');
        const footer = await page.$$eval('footer [data-lang-switch]', (els) => els.map((e) => [e.textContent.trim(), e.getAttribute('aria-current')]));
        assert.deepEqual(footer, LOCALES.map((l) => [l.name, l === locale ? 'page' : null]), 'the footer lists all three too');
        await menu.locator(`a[hreflang="${target.lang}"]`).click();
        const query = target.key === 'en' && !route ? '?lang=en' : '';
        await page.waitForURL((url) => url.href === `${base}${target.path}${route}${query}${hash}`);
        assert.equal(await page.getAttribute('html', 'lang'), target.lang);
        assert.deepEqual(errors, []);
        await context.close();
      }
    }
    // Escape and a click elsewhere close the menu; Escape gives focus back to it.
    const { context, page } = await open(locale.path);
    const menu = page.locator('header [data-lang-menu]');
    await menu.locator('summary').click();
    await page.keyboard.press('Escape');
    assert.equal(await menu.evaluate((d) => d.open), false, 'Escape closes');
    assert.equal(await page.evaluate(() => document.activeElement?.tagName), 'SUMMARY');
    await menu.locator('summary').click();
    await page.locator('h1').click();
    assert.equal(await menu.evaluate((d) => d.open), false, 'a click elsewhere closes');
    await context.close();
  });

  await check(`${locale.lang}: details page, metadata and checksum copy`, async () => {
    const path = `${locale.path}details/`;
    const { context, page, errors } = await open(path);
    assert.equal(await page.getAttribute('link[rel=canonical]', 'href'), SITE + path);
    const alternates = await page.$$eval('link[rel=alternate][hreflang]', (els) => els.map((e) => `${e.hreflang} ${e.href}`));
    assert.deepEqual(alternates.sort(), alternatesFor('details/'));
    assert.ok((await page.locator('h1').innerText()).includes(RELEASE.version));
    assert.ok((await page.locator('.specs').innerText()).includes(locale.ui), 'says the app interface is Simplified Chinese');
    const downloads = await page.$$eval('a[data-download]', (els) => els.map((e) => e.href));
    assert.deepEqual(downloads, [RELEASE.url, RELEASE.url]);
    assert.equal((await page.locator('#sha256').innerText()).trim(), RELEASE.sha256);
    assert.equal(await page.locator('section[aria-labelledby="install"] .steps li').count(), 3);
    assert.ok((await page.locator('main').innerText()).includes(RELEASE.fileName));
    assert.equal(await page.locator(`a[href="${RELEASE.checksumsUrl}"]`).count(), 1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, `horizontal overflow ${overflow}px`);
    assert.deepEqual(errors, []);
    await context.close();

    const origin = new URL(base).origin;
    const granted = await open(path, { permissions: ['clipboard-read', 'clipboard-write'] });
    await granted.context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
    const button = granted.page.locator('button[data-copy="#sha256"]');
    await button.click();
    assert.equal(await granted.page.evaluate(() => navigator.clipboard.readText()), RELEASE.sha256);
    assert.equal((await button.innerText()).trim(), await button.getAttribute('data-copied'));
    await granted.context.close();

    const denied = await open(path, { viewport: { width: 320, height: 640 } });
    const narrow = await denied.page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(narrow <= 0, `horizontal overflow at 320px: ${narrow}px`);
    await denied.page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) } });
    });
    const fallback = denied.page.locator('button[data-copy="#sha256"]');
    await fallback.click();
    assert.equal(await denied.page.evaluate(() => window.getSelection().toString().trim()), RELEASE.sha256);
    assert.equal((await fallback.innerText()).trim(), await fallback.getAttribute('data-fallback'));
    if (SHOTS) {
      await denied.page.setViewportSize({ width: 390, height: 844 });
      await denied.page.screenshot({ path: join(SHOTS, `${locale.key}-details-mobile.png`), fullPage: true });
    }
    await denied.context.close();
  });

  await check(`${locale.lang}: under the panel, the skill and a request to copy`, async () => {
    const origin = new URL(base).origin;
    const { context, page, errors } = await open(locale.path, { permissions: CLIPBOARD });
    await context.grantPermissions(CLIPBOARD, { origin });
    const block = page.locator('.panel #agent-setup');
    await block.scrollIntoViewIfNeeded();
    assert.ok(await block.isVisible(), 'one short message under the panel');
    assert.equal(await page.locator('[role="img"] #agent-setup, [role="img"] #agent-request').count(), 0, 'outside the panel illustration');
    assert.equal((await page.locator('#agent-request').innerText()).trim(), locale.request);
    const links = await block.locator('a').evaluateAll((els) => els.map((e) => e.getAttribute('href')));
    assert.deepEqual(links, [SKILL_URL, `${new URL(base).pathname}${locale.path}details/#agent-setup`]);
    // The keyboard reaches the button; Enter copies the request exactly as shown and says so.
    const button = block.locator('button[data-copy="#agent-request"]');
    assert.ok((await button.getAttribute('aria-label'))?.length > 3, 'a descriptive name');
    await button.focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => {
      const b = document.querySelector('[data-copy="#agent-request"]');
      return b.textContent.trim() === b.dataset.copied;
    });
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), locale.request);
    assert.equal((await block.locator('[data-copy-status]').textContent()).trim(), await button.getAttribute('data-copied'));
    // A second copy works the same.
    await page.evaluate(() => navigator.clipboard.writeText(''));
    await button.click();
    let copied = '';
    for (let i = 0; i < 30 && copied !== locale.request; i++) {
      await page.waitForTimeout(100);
      copied = await page.evaluate(() => navigator.clipboard.readText());
    }
    assert.equal(copied, locale.request, 'copies again');
    if (SHOTS) {
      await mkdir(SHOTS, { recursive: true });
      await block.screenshot({ path: join(SHOTS, `${locale.key}-desktop-agent.png`) });
    }
    assert.deepEqual(errors, []);
    await context.close();

    // Phones: the request wraps inside its box and nothing leaves the screen.
    for (const width of [320, 390]) {
      const phone = await open(locale.path, { viewport: { width, height: 800 }, isMobile: true, hasTouch: true, reducedMotion: 'reduce' });
      const area = phone.page.locator('.panel #agent-setup');
      await area.scrollIntoViewIfNeeded();
      const m = await area.evaluate((el) => {
        const box = el.querySelector('.copy-text').getBoundingClientRect();
        const button = el.querySelector('button').getBoundingClientRect();
        const text = el.querySelector('#agent-request');
        return {
          left: Math.min(box.left, button.left),
          right: Math.max(box.right, button.right),
          room: document.documentElement.clientWidth,
          text: text.scrollWidth - text.clientWidth,
          page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        };
      });
      assert.ok(m.left >= 0 && m.right <= m.room, `@${width}: the request box leaves the screen (${Math.round(m.left)}–${Math.round(m.right)})`);
      assert.ok(m.text <= 0 && m.page <= 0, `@${width}: overflow ${m.text}/${m.page}px`);
      if (SHOTS && width === 390) await area.screenshot({ path: join(SHOTS, `${locale.key}-mobile-agent.png`) });
      await phone.context.close();
    }

    // Where the clipboard is refused, the request is selected for ⌘C instead.
    const denied = await open(locale.path);
    await denied.page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) } });
    });
    const fallback = denied.page.locator('button[data-copy="#agent-request"]');
    await fallback.scrollIntoViewIfNeeded();
    await fallback.click();
    assert.equal(await denied.page.evaluate(() => window.getSelection().toString().trim()), locale.request);
    assert.equal((await fallback.innerText()).trim(), await fallback.getAttribute('data-fallback'));
    await denied.context.close();
  });

  await check(`${locale.lang}: details explain how to install the skill, and both copy buttons work`, async () => {
    const origin = new URL(base).origin;
    const { context, page, errors } = await open(`${locale.path}details/`, { permissions: CLIPBOARD });
    await context.grantPermissions(CLIPBOARD, { origin });
    const section = page.locator('#agent-setup');
    assert.equal(await section.evaluate((el) => el.previousElementSibling?.getAttribute('aria-labelledby')), 'install', 'right after the install steps');
    const text = await section.innerText();
    for (const words of ['$CODEX_HOME/skills', '~/.codex/skills', 'SKILL.md', 'Codex']) assert.ok(text.includes(words), `mentions ${words}`);
    assert.equal(await section.locator(`a[href="${SKILL_URL}"]`).count(), 1, 'links the skill folder');
    assert.equal((await section.locator('#agent-request').innerText()).trim(), locale.request);
    // Each button copies its own text, one after the other.
    await section.locator('button[data-copy="#agent-request"]').click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), locale.request);
    await page.locator('button[data-copy="#sha256"]').click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), RELEASE.sha256);
    assert.deepEqual(errors, []);
    await context.close();
    // The language menu keeps the reader at this section.
    const target = LOCALES.find((l) => l !== locale);
    const there = await open(`${locale.path}details/#agent-setup`);
    await there.page.locator('header [data-lang-menu] summary').click();
    await there.page.locator(`header [data-lang-menu] a[hreflang="${target.lang}"]`).click();
    await there.page.waitForURL((url) => url.href === `${base}${target.path}details/#agent-setup`);
    await there.context.close();
  });

  await check(`${locale.lang}: without JavaScript the request still reads, with no dead copy button`, async () => {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, javaScriptEnabled: false, locale: 'en-US' });
    const page = await context.newPage();
    for (const route of ['', 'details/']) {
      await page.goto(`${base}${locale.path}${route}`, { waitUntil: 'load' });
      const request = page.locator('#agent-request');
      assert.ok(await request.isVisible(), `${route || 'home'}: the request is shown`);
      assert.equal((await request.innerText()).trim(), locale.request);
      const shown = await page.locator('button[data-copy]').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).length);
      assert.equal(shown, 0, `${route || 'home'}: copy buttons wait for JavaScript`);
      assert.ok(await page.locator(`a[href="${SKILL_URL}"]`).first().isVisible(), 'the skill link');
    }
    await context.close();
  });

  await check(`${locale.lang}: without JavaScript the story and film still read`, async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false, locale: 'en-US' });
    const page = await context.newPage();
    await page.goto(base + locale.path, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-film] video').evaluate((v) => v.hasAttribute('controls')), true, 'native controls');
    assert.equal(await page.locator('[data-film] video').evaluate((v) => v.muted || v.hasAttribute('muted')), false, 'started by hand, it plays with its sound');
    assert.equal(await page.locator('[data-film] .controls button:visible').count(), 0, 'no buttons without their script');
    assert.ok((await page.locator('[data-film] figcaption').innerText()).startsWith(locale.caption), 'the caption, with the narration where it is not the page language');
    for (const act of await page.locator('[data-act]').all()) assert.ok(await act.isVisible(), 'every act is shown');
    assert.ok(await page.locator('.story .still img').isVisible(), 'a still stands in for the scene');
    assert.ok(await page.locator('a[data-download="finale"]').isVisible());
    await context.close();
  });
}

await check('with the narration on, the film never starts again by itself', async () => {
  const { context, page, errors } = await open('');
  const video = page.locator('[data-film] video');
  await page.waitForFunction(() => document.querySelector('[data-film] video').currentTime > 0.5, null, { timeout: 20000 });
  await page.locator('[data-film-sound]').click();
  await page.waitForFunction(() => {
    const v = document.querySelector('[data-film] video');
    return !v.muted && !v.paused;
  });
  // Out of view and back: it waits for the play button.
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForFunction(() => document.querySelector('[data-film] video').paused, null, { timeout: 5000 });
  await page.evaluate(() => scrollTo(0, 0));
  await page.waitForTimeout(1500);
  assert.equal(await video.evaluate((v) => v.paused), true, 'no sound by itself on scrolling back');
  assert.equal(await page.locator('[data-film-toggle]').getAttribute('data-state'), 'paused');
  await page.locator('[data-film-toggle]').click();
  await page.waitForFunction(() => {
    const v = document.querySelector('[data-film] video');
    return !v.paused && !v.muted;
  });
  // Another tab and back: the same.
  await setTabHidden(page, true);
  await page.waitForFunction(() => document.querySelector('[data-film] video').paused);
  await setTabHidden(page, false);
  await page.waitForTimeout(1000);
  assert.equal(await video.evaluate((v) => v.paused), true, 'no sound by itself on returning to the tab');
  // Muted, it resumes by itself as before.
  await page.locator('[data-film-sound]').click();
  await setTabHidden(page, true);
  await setTabHidden(page, false);
  await page.waitForFunction(
    () => {
      const v = document.querySelector('[data-film] video');
      return !v.paused && v.muted;
    },
    null,
    { timeout: 5000 },
  );
  assert.deepEqual(errors, []);
  await context.close();
});

await check('a refused or interrupted play() never undoes a pause or a choice', async () => {
  // Started with its sound and paused at once: that play() ends in an AbortError, which changes nothing.
  {
    const { context, page } = await open('', { reducedMotion: 'reduce' });
    await page.locator('[data-film-sound]').click();
    await page.locator('[data-film-toggle]').click();
    await page.waitForTimeout(1500);
    assert.deepEqual(await page.locator('[data-film] video').evaluate((v) => [v.paused, v.muted]), [true, false], 'stays paused, the sound still chosen');
    assert.equal(await page.locator('[data-film-toggle]').getAttribute('data-state'), 'paused');
    await context.close();
  }
  // play() replaced to answer as a browser might: count the calls and check what the page does.
  const stub = (page, answer) =>
    page.evaluate((answer) => {
      const v = document.querySelector('[data-film] video');
      const real = HTMLMediaElement.prototype.play;
      window.__plays = 0;
      v.play = function () {
        window.__plays++;
        if (answer === 'abort') return Promise.reject(new DOMException('interrupted', 'AbortError'));
        if (answer === 'refuse-sound') return this.muted ? real.call(this) : Promise.reject(new DOMException('needs a gesture', 'NotAllowedError'));
        return new Promise((_, reject) => setTimeout(() => reject(new DOMException('too late', 'NotAllowedError')), 500));
      };
    }, answer);
  // Refused with sound: one retry, muted, and the sound button says so.
  {
    const { context, page } = await open('', { reducedMotion: 'reduce' });
    await stub(page, 'refuse-sound');
    await page.locator('[data-film-sound]').click();
    await page.waitForFunction(
      () => {
        const v = document.querySelector('[data-film] video');
        return !v.paused && v.muted;
      },
      null,
      { timeout: 10000 },
    );
    assert.equal(await page.evaluate(() => window.__plays), 2, 'a single muted retry');
    assert.equal(await page.locator('[data-film-sound]').getAttribute('data-state'), 'muted');
    await context.close();
  }
  // An AbortError: no retry, nothing muted, nothing played.
  {
    const { context, page } = await open('', { reducedMotion: 'reduce' });
    await stub(page, 'abort');
    await page.locator('[data-film-sound]').click();
    await page.waitForTimeout(800);
    assert.equal(await page.evaluate(() => window.__plays), 1, 'no retry');
    assert.deepEqual(await page.locator('[data-film] video').evaluate((v) => [v.paused, v.muted]), [true, false]);
    await context.close();
  }
  // Refused only after the tab was left: the late answer changes nothing.
  {
    const { context, page } = await open('', { reducedMotion: 'reduce' });
    await stub(page, 'late');
    await page.locator('[data-film-sound]').click();
    await setTabHidden(page, true);
    await page.waitForTimeout(900);
    assert.equal(await page.evaluate(() => window.__plays), 1, 'no retry');
    assert.deepEqual(await page.locator('[data-film] video').evaluate((v) => [v.paused, v.muted]), [true, false]);
    await context.close();
  }
});

// Classic scrollbars (desktop Chrome on Linux and Windows) take ~15 px from phone-width layouts.
const scrollbars = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
for (const locale of LOCALES) {
  await check(`${locale.lang}: header stays on one line with a classic scrollbar at 320–430 px`, async () => {
    for (const width of [320, 375, 390, 430]) {
      const context = await scrollbars.newContext({ viewport: { width, height: 844 }, locale: 'en-US' });
      const page = await context.newPage();
      await page.goto(base + locale.path, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      const m = await page.evaluate(() => {
        const header = document.querySelector('.site-header');
        const visible = (el) => el && el.offsetParent !== null;
        const height = (el) => el.getBoundingClientRect().height;
        // What sits in the bar itself; the language menu's own links stay out until it opens.
        const items = [header.querySelector('.home'), ...header.querySelectorAll('nav > a, nav > details > summary')].filter(visible);
        return {
          tallest: Math.max(...items.map(height)),
          overflow: Math.max(header.scrollWidth - header.clientWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        };
      });
      assert.ok(m.tallest <= 36, `@${width}: a header item wraps (${Math.round(m.tallest)}px tall)`);
      assert.ok(m.overflow <= 0, `@${width}: ${m.overflow}px overflow`);
      await page.locator('header [data-lang-menu] summary').click();
      const menu = await page.locator('header [data-lang-menu] .menu').evaluate((el) => {
        const r = el.getBoundingClientRect();
        return { left: r.left, right: r.right, room: document.documentElement.clientWidth };
      });
      assert.ok(menu.left >= 0 && menu.right <= menu.room, `@${width}: the open menu leaves the screen (${Math.round(menu.left)}–${Math.round(menu.right)})`);
      await context.close();
    }
  });
}
await scrollbars.close();

await check('404 page, sitemap and robots.txt', async () => {
  const { context, page } = await open('does-not-exist/');
  assert.match(await page.locator('h1').innerText(), /dark/);
  assert.equal(await page.getAttribute('meta[name=robots]', 'content'), 'noindex, nofollow');
  const sitemap = await (await page.request.get(`${base}sitemap.xml`)).text();
  for (const loc of LOCALES.flatMap((l) => ROUTES.map((r) => `${SITE}${l.path}${r}`))) {
    assert.ok(sitemap.includes(`<loc>${loc}</loc>`), `sitemap ${loc}`);
  }
  for (const l of LOCALES) assert.ok(sitemap.includes(`hreflang="${l.lang}"`), `sitemap hreflang ${l.lang}`);
  // An unknown hash is dropped on a language switch rather than carried to the other page.
  const stray = await open('#no-such-section');
  await stray.page.locator('header [data-lang-menu] summary').click();
  await stray.page.locator('header [data-lang-menu] a[hreflang="ja"]').click();
  await stray.page.waitForURL((url) => url.href === `${base}ja/`);
  await stray.context.close();
  const robots = await (await page.request.get(`${base}robots.txt`)).text();
  assert.match(robots, /^User-agent: \*/);
  await context.close();
});

if (SHOTS) {
  await check('story screenshots', async () => {
    for (const locale of LOCALES) {
      for (const [name, viewport] of [
        ['desktop', { width: 1440, height: 900 }],
        ['mobile', { width: 390, height: 844 }],
      ]) {
        const { context, page } = await open(locale.path, { viewport });
        for (const [act, p] of [
          [1, 0.3],
          [2, 0.62],
          [3, 0.97],
        ]) {
          await scrollStory(page, p);
          await page.waitForTimeout(1200);
          await page.screenshot({ path: join(SHOTS, `${locale.key}-${name}-act${act}.png`) });
        }
        await context.close();
      }
    }
  });
}

await browser.close();
server?.close();

for (const [status, name, detail] of results) console.log(`${status === 'ok' ? '  ok ' : 'FAIL '} ${name}${detail ? ` — ${detail}` : ''}`);
const failed = results.filter(([status]) => status !== 'ok').length;
console.log(`\n${results.length - failed}/${results.length} checks passed against ${base}`);
process.exit(failed ? 1 : 0);

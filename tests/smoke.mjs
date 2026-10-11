// Browser smoke test for the built site.
//
//   npm run build && npm test             serves dist/ with a minimal static server
//   BASE_URL=https://host/path/ npm test  tests an already deployed copy
//   SCREENSHOT_DIR=dir npm test           also writes desktop and phone screenshots to dir
//
// Covers both locales at desktop, tablet and phone widths: metadata, console errors, failed
// requests, horizontal overflow, the download entry points, the concept film (autoplay, controls,
// poster, fallback, reduced motion), the scroll story and finale, language switching, the details
// page with checksum copy, the page without JavaScript, the header on phones with classic
// scrollbars, 404, sitemap and robots.
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

const LOCALES = [
  {
    key: 'en',
    path: '',
    lang: 'en',
    title: /A screen for your agents/,
    caption: 'Concept demo. Running with physical displays switched off is not yet verified on real hardware.',
    other: 'zh-cn/',
  },
  { key: 'zh-cn', path: 'zh-cn/', lang: 'zh-CN', title: /给 Agent\s*一块屏幕/, caption: '概念演示；实体屏关闭后的运行尚待实机验证。', other: '' },
];
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'tablet', width: 834, height: 1112 },
  { name: 'mobile', width: 390, height: 844 },
  { name: 'small', width: 320, height: 640 },
];

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
async function check(name, fn) {
  try {
    await fn();
    results.push(['ok', name]);
  } catch (error) {
    const detail = 'actual' in error ? ` (actual ${JSON.stringify(error.actual)}, expected ${JSON.stringify(error.expected)})` : '';
    results.push(['FAIL', name, String(error.message).split('\n')[0] + detail]);
  }
}

const browser = await chromium.launch();

async function open(path, options = {}) {
  const { route, ...contextOptions } = options;
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...contextOptions });
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
  await page.goto(base + path, { waitUntil: 'networkidle' });
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
    assert.deepEqual(alternates.sort(), [`en ${SITE}`, `x-default ${SITE}`, `zh-CN ${SITE}zh-cn/`].sort());
    assert.equal(await page.getAttribute('meta[property="og:url"]', 'content'), SITE + locale.path);
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
      if (SHOTS && (viewport.name === 'desktop' || viewport.name === 'mobile')) {
        await mkdir(SHOTS, { recursive: true });
        await page.screenshot({ path: join(SHOTS, `${locale.key}-${viewport.name}-fold.png`) });
        await page.screenshot({ path: join(SHOTS, `${locale.key}-${viewport.name}-full.png`), fullPage: true });
      }
      await context.close();
    });
  }

  await check(`${locale.lang}: the concept film plays muted inline, pauses and replays`, async () => {
    const { context, page, errors } = await open(locale.path);
    const video = page.locator('[data-film] video');
    const toggle = page.locator('[data-film-toggle]');
    const attrs = await video.evaluate((v) => ({ muted: v.muted, inline: v.playsInline, controls: v.controls, poster: v.poster, label: v.getAttribute('aria-label') }));
    assert.ok(attrs.muted && attrs.inline, 'muted and playsinline');
    assert.equal(attrs.controls, false, 'our button replaces the native controls');
    assert.match(attrs.poster, /film-wide-poster\.webp$/);
    assert.ok(attrs.label.length > 40, 'described for screen readers');
    assert.equal((await page.locator('[data-film] figcaption').innerText()).trim(), locale.caption);
    // Media events arrive asynchronously, so wait for the button to catch up rather than racing it.
    const state = (s) => page.waitForFunction((s) => document.querySelector('[data-film-toggle]').dataset.state === s, s, { timeout: 10000 });
    await page.waitForFunction(() => document.querySelector('[data-film] video').currentTime > 1, null, { timeout: 15000 });
    await state('playing');
    assert.equal(await toggle.getAttribute('aria-label'), await toggle.getAttribute('data-label-pause'));
    assert.match(await video.evaluate((v) => v.currentSrc), /film-wide\.(mp4|webm)$/);
    await toggle.click();
    await state('paused');
    assert.equal(await video.evaluate((v) => v.paused), true);
    assert.equal(await toggle.getAttribute('aria-label'), await toggle.getAttribute('data-label-play'));
    await video.evaluate((v) => {
      v.currentTime = v.duration - 0.3;
      return v.play();
    });
    await state('ended');
    assert.equal(await video.evaluate((v) => v instanceof HTMLMediaElement && v.ended), true);
    assert.equal(await toggle.getAttribute('aria-label'), await toggle.getAttribute('data-label-replay'));
    await toggle.click();
    await page.waitForFunction(() => {
      const v = document.querySelector('[data-film] video');
      return !v.paused && v.currentTime < 3;
    });
    // Every media file is served with a media type, and films answer byte ranges (Safari needs them).
    for (const file of ['film-wide.mp4', 'film-wide.webm', 'film-tall.mp4', 'film-tall.webm', 'film-wide-poster.webp', 'film-tall-poster.webp']) {
      const response = await page.request.get(`${base}media/${file}`);
      assert.equal(response.status(), 200, file);
      assert.match(response.headers()['content-type'], /^(video|image)\//, file);
      if (!/\.(mp4|webm)$/.test(file)) continue;
      const head = await page.request.get(`${base}media/${file}`, { headers: { Range: 'bytes=0-1' } });
      assert.equal(head.status(), 206, `${file} range`);
      assert.match(head.headers()['content-range'] ?? '', /^bytes 0-1\/\d+$/, `${file} content-range`);
    }
    assert.deepEqual(errors, []);
    await context.close();
  });

  await check(`${locale.lang}: phones get the portrait film and poster`, async () => {
    const { context, page } = await open(locale.path, { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const video = page.locator('[data-film] video');
    assert.match(await video.evaluate((v) => v.poster), /film-tall-poster\.webp$/);
    await page.waitForFunction(() => document.querySelector('[data-film] video').currentTime > 0.5, null, { timeout: 15000 });
    assert.match(await video.evaluate((v) => v.currentSrc), /film-tall\.(mp4|webm)$/);
    const frame = await box(page, '[data-film] video');
    assert.ok(Math.abs(frame.w / frame.h - 0.8) < 0.02, `portrait frame ${frame.w}×${frame.h}`);
    await context.close();
  });

  await check(`${locale.lang}: reduced motion keeps the film still until asked`, async () => {
    const { context, page } = await open(locale.path, { reducedMotion: 'reduce' });
    await page.waitForTimeout(2500);
    const video = page.locator('[data-film] video');
    assert.equal(await video.evaluate((v) => v.paused && v.currentTime === 0), true, 'no autoplay');
    const toggle = page.locator('[data-film-toggle]');
    assert.equal(await toggle.getAttribute('aria-label'), await toggle.getAttribute('data-label-play'));
    await toggle.click();
    await page.waitForFunction(() => document.querySelector('[data-film] video').currentTime > 0.3, null, { timeout: 15000 });
    await context.close();
  });

  await check(`${locale.lang}: without a playable source the poster stays and the button goes`, async () => {
    const { context, page } = await open(locale.path, {
      reducedMotion: 'reduce',
      route: {
        match: /\/media\/film-[a-z]+\.(mp4|webm)$/,
        handler: (r) => r.fulfill({ status: 200, contentType: 'video/mp4', body: 'not a video' }),
      },
    });
    await page.locator('[data-film-toggle]').click();
    await page.waitForFunction(() => document.querySelector('[data-film-toggle]').hidden, null, { timeout: 10000 });
    assert.match(await page.locator('[data-film] video').evaluate((v) => v.poster), /poster\.webp$/);
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
        const start = await box(page, '#story-scene [data-part="model"]');
        assert.ok(inside(start, await box(page, '#story-scene .screen')), 'the app starts on your display');
      }
      await scrollStory(page, 0.5);
      await page.waitForTimeout(1200);
      assert.equal(await active(), 1);
      const moved = await box(page, '#story-scene [data-part="model"]');
      assert.ok(inside(moved, await box(page, '#story-scene [data-part="codex"]')), 'the app ends up on the Codex screen');
      assert.ok(inside(await box(page, '#story-scene .notes'), await box(page, '#story-scene .screen')), 'your windows stay');
      await scrollStory(page, 0.99);
      await page.waitForTimeout(1200);
      assert.equal(await active(), 2);
      const grok = await box(page, '#story-scene [data-part="grok"]');
      assert.ok(grok.o > 0.95, 'GrokBot is open');
      assert.ok(inside(await box(page, '#story-scene [data-part="browser"]'), grok), 'GrokBot has its own apps');
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

  await check(`${locale.lang}: language switch keeps the place`, async () => {
    const { context, page } = await open(`${locale.path}#download`);
    await page.locator('header [data-lang-switch]').click();
    await page.waitForURL((url) => url.href === `${base}${locale.other}#download`);
    assert.equal(await page.getAttribute('html', 'lang'), locale.lang === 'en' ? 'zh-CN' : 'en');
    await context.close();
  });

  await check(`${locale.lang}: details page, metadata and checksum copy`, async () => {
    const path = `${locale.path}details/`;
    const { context, page, errors } = await open(path);
    assert.equal(await page.getAttribute('link[rel=canonical]', 'href'), SITE + path);
    const alternates = await page.$$eval('link[rel=alternate][hreflang]', (els) => els.map((e) => `${e.hreflang} ${e.href}`));
    assert.deepEqual(alternates.sort(), [`en ${SITE}details/`, `x-default ${SITE}details/`, `zh-CN ${SITE}zh-cn/details/`].sort());
    assert.ok((await page.locator('h1').innerText()).includes(RELEASE.version));
    const downloads = await page.$$eval('a[data-download]', (els) => els.map((e) => e.href));
    assert.deepEqual(downloads, [RELEASE.url, RELEASE.url]);
    assert.equal((await page.locator('#sha256').innerText()).trim(), RELEASE.sha256);
    assert.equal(await page.locator('.steps li').count(), 3);
    assert.ok((await page.locator('main').innerText()).includes(RELEASE.fileName));
    assert.equal(await page.locator(`a[href="${RELEASE.checksumsUrl}"]`).count(), 1);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    assert.ok(overflow <= 0, `horizontal overflow ${overflow}px`);
    await page.locator('header [data-lang-switch]').click();
    await page.waitForURL((url) => url.href === `${base}${locale.other}details/`);
    assert.deepEqual(errors, []);
    await context.close();

    const origin = new URL(base).origin;
    const granted = await open(path, { permissions: ['clipboard-read', 'clipboard-write'] });
    await granted.context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
    const button = granted.page.locator('button[data-copy]');
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
    const fallback = denied.page.locator('button[data-copy]');
    await fallback.click();
    assert.equal(await denied.page.evaluate(() => window.getSelection().toString().trim()), RELEASE.sha256);
    assert.equal((await fallback.innerText()).trim(), await fallback.getAttribute('data-fallback'));
    if (SHOTS) {
      await denied.page.setViewportSize({ width: 390, height: 844 });
      await denied.page.screenshot({ path: join(SHOTS, `${locale.key}-details-mobile.png`), fullPage: true });
    }
    await denied.context.close();
  });

  await check(`${locale.lang}: without JavaScript the story and film still read`, async () => {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(base + locale.path, { waitUntil: 'networkidle' });
    assert.equal(await page.locator('[data-film] video').evaluate((v) => v.hasAttribute('controls')), true, 'native controls');
    for (const act of await page.locator('[data-act]').all()) assert.ok(await act.isVisible(), 'every act is shown');
    assert.ok(await page.locator('.story .still img').isVisible(), 'a still stands in for the scene');
    assert.ok(await page.locator('a[data-download="finale"]').isVisible());
    await context.close();
  });
}

// Classic scrollbars (desktop Chrome on Linux and Windows) take ~15 px from phone-width layouts.
const scrollbars = await chromium.launch({ ignoreDefaultArgs: ['--hide-scrollbars'] });
for (const locale of LOCALES) {
  await check(`${locale.lang}: header stays on one line with a classic scrollbar at 320–430 px`, async () => {
    for (const width of [320, 375, 390, 430]) {
      const context = await scrollbars.newContext({ viewport: { width, height: 844 } });
      const page = await context.newPage();
      await page.goto(base + locale.path, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const m = await page.evaluate(() => {
        const header = document.querySelector('.site-header');
        const visible = (el) => el && el.offsetParent !== null;
        const height = (el) => el.getBoundingClientRect().height;
        const items = [header.querySelector('.home'), ...header.querySelectorAll('nav a')].filter(visible);
        return {
          tallest: Math.max(...items.map(height)),
          overflow: Math.max(header.scrollWidth - header.clientWidth, document.documentElement.scrollWidth - document.documentElement.clientWidth),
        };
      });
      assert.ok(m.tallest <= 36, `@${width}: a header item wraps (${Math.round(m.tallest)}px tall)`);
      assert.ok(m.overflow <= 0, `@${width}: ${m.overflow}px overflow`);
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
  for (const loc of [SITE, `${SITE}zh-cn/`, `${SITE}details/`, `${SITE}zh-cn/details/`]) {
    assert.ok(sitemap.includes(`<loc>${loc}</loc>`), `sitemap ${loc}`);
  }
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

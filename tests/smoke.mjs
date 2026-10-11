// Browser smoke test for the built site.
//
//   npm run build && npm test             serves dist/ with a minimal static server
//   BASE_URL=https://host/path/ npm test  tests an already deployed copy
//   SCREENSHOT_DIR=dir npm test           also writes desktop and phone screenshots to dir
//
// Covers both locales at desktop, tablet and phone widths: metadata, console errors, failed
// requests, horizontal overflow, the download entry points, FAQ, checksum copy (clipboard
// and selection fallback), language switching, reduced motion, 404, sitemap and robots.txt.
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
  { key: 'en', path: '', lang: 'en', title: /stays lit/, other: 'zh-cn/' },
  { key: 'zh-cn', path: 'zh-cn/', lang: 'zh-CN', title: /亮着的窗/, other: '' },
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
  // Serve dist/ the way a static host would, under SITE_BASE if the build used one.
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
      res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
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
    results.push(['FAIL', name, String(error.message).split('\n')[0]]);
  }
}

const browser = await chromium.launch();

async function open(path, options = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...options });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('requestfailed', (r) => errors.push(`failed ${r.url()}`));
  page.on('response', (r) => r.status() >= 400 && !r.url().endsWith('/does-not-exist/') && errors.push(`${r.status()} ${r.url()}`));
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
    const hrefs = await page.$$eval('a[data-download]', (els) => els.map((e) => e.href));
    assert.equal(hrefs.length, 3, 'header, hero and download section');
    for (const href of hrefs) assert.equal(href, RELEASE.url);
    const zips = await page.$$eval('a[href$=".zip"]', (els) => els.map((e) => e.href));
    assert.deepEqual([...new Set(zips)], [RELEASE.url], 'no other archives, in particular no source zip');
    const repo = await page.$$eval(`a[href="${config.appRepository}"]`, (els) => els.length);
    assert.ok(repo >= 2, 'GitHub links');
    await expectText(page, '#download', RELEASE.sha256);
    await context.close();
  });

  for (const viewport of VIEWPORTS) {
    await check(`${locale.lang} @${viewport.width}: no overflow, download reachable early`, async () => {
      const { context, page, errors } = await open(locale.path, { viewport, reducedMotion: 'reduce' });
      await loadAllImages(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      assert.ok(overflow <= 0, `horizontal overflow ${overflow}px`);
      const hero = page.locator('a[data-download="hero"]');
      assert.ok(await hero.isVisible(), 'hero download visible');
      const box = await hero.boundingBox();
      assert.ok(box.y + box.height <= viewport.height * 1.15, `hero download at ${Math.round(box.y)}px`);
      assert.ok(await page.locator('a[data-download="header"]').isVisible(), 'header download visible');
      const broken = await page.$$eval('img', (imgs) => imgs.filter((i) => !i.complete || i.naturalWidth === 0).map((i) => i.src));
      assert.deepEqual(broken, []);
      const missingAlt = await page.$$eval('img:not([alt])', (imgs) => imgs.length);
      assert.equal(missingAlt, 0);
      assert.deepEqual(errors, []);
      if (SHOTS && (viewport.name === 'desktop' || viewport.name === 'mobile')) {
        await mkdir(SHOTS, { recursive: true });
        await page.screenshot({ path: join(SHOTS, `${locale.key}-${viewport.name}-fold.png`) });
        await page.screenshot({ path: join(SHOTS, `${locale.key}-${viewport.name}-full.png`), fullPage: true });
      }
      await context.close();
    });
  }

  await check(`${locale.lang}: FAQ, anchors and language switch`, async () => {
    const { context, page } = await open(locale.path);
    for (const id of ['how', 'download', 'faq']) assert.equal(await page.locator(`#${id}`).count(), 1, id);
    const first = page.locator('#faq details').first();
    assert.equal(await first.evaluate((d) => d.open), false);
    await first.locator('summary').click();
    assert.equal(await first.evaluate((d) => d.open), true);
    await page.locator('.hero .fine a[href="#download"]').click();
    await page.waitForFunction(() => location.hash === '#download');
    await page.locator('header [data-lang-switch]').click();
    await page.waitForURL((url) => url.href === `${base}${locale.other}#download`);
    assert.equal(await page.getAttribute('html', 'lang'), locale.lang === 'en' ? 'zh-CN' : 'en');
    await context.close();
  });

  await check(`${locale.lang}: checksum copy, with and without clipboard access`, async () => {
    const origin = new URL(base).origin;
    const granted = await open(locale.path, { permissions: ['clipboard-read', 'clipboard-write'] });
    await granted.context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin });
    const button = granted.page.locator('#download button[data-copy]');
    await button.click();
    assert.equal(await granted.page.evaluate(() => navigator.clipboard.readText()), RELEASE.sha256);
    assert.equal((await button.innerText()).trim(), await button.getAttribute('data-copied'));
    await granted.context.close();

    const denied = await open(locale.path);
    await denied.page.evaluate(() => {
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: () => Promise.reject(new Error('denied')) } });
    });
    const fallback = denied.page.locator('#download button[data-copy]');
    await fallback.click();
    assert.equal(await denied.page.evaluate(() => window.getSelection().toString().trim()), RELEASE.sha256);
    assert.equal((await fallback.innerText()).trim(), await fallback.getAttribute('data-fallback'));
    await denied.context.close();
  });

  await check(`${locale.lang}: hero motion plays once and respects reduced motion`, async () => {
    const moving = await open(locale.path);
    assert.notEqual(await moving.page.locator('.scene .app').evaluate((el) => getComputedStyle(el).animationName), 'none');
    assert.ok(await moving.page.locator('[data-replay]').isVisible());
    await moving.page.locator('[data-replay]').click();
    assert.ok(await moving.page.locator('#hero-scene.play').count());
    await moving.context.close();

    const still = await open(locale.path, { reducedMotion: 'reduce' });
    const app = still.page.locator('.scene .app');
    assert.equal(await app.evaluate((el) => getComputedStyle(el).animationName), 'none');
    assert.equal(await app.evaluate((el) => getComputedStyle(el).transform), 'none');
    assert.equal(await still.page.locator('[data-replay]').isVisible(), false);
    await still.context.close();
  });
}

await check('404 page, sitemap and robots.txt', async () => {
  const { context, page } = await open('does-not-exist/');
  assert.match(await page.locator('h1').innerText(), /dark/);
  assert.equal(await page.getAttribute('meta[name=robots]', 'content'), 'noindex, nofollow');
  const sitemap = await (await page.request.get(`${base}sitemap.xml`)).text();
  assert.ok(sitemap.includes(`<loc>${SITE}</loc>`) && sitemap.includes(`<loc>${SITE}zh-cn/</loc>`), 'sitemap locs');
  const robots = await (await page.request.get(`${base}robots.txt`)).text();
  assert.match(robots, /^User-agent: \*/);
  await context.close();
});

if (SHOTS) {
  await check('motion frame screenshot', async () => {
    const { context, page } = await open('', { viewport: { width: 1440, height: 900 } });
    await page.locator('[data-replay]').click();
    await page.waitForTimeout(2900);
    await page.screenshot({ path: join(SHOTS, 'en-desktop-motion.png') });
    await context.close();
  });
}

async function expectText(page, selector, text) {
  const content = await page.locator(selector).innerText();
  assert.ok(content.includes(text), `${selector} should include ${text}`);
}

await browser.close();
server?.close();

for (const [status, name, detail] of results) console.log(`${status === 'ok' ? '  ok ' : 'FAIL '} ${name}${detail ? ` — ${detail}` : ''}`);
const failed = results.filter(([status]) => status !== 'ok').length;
console.log(`\n${results.length - failed}/${results.length} checks passed against ${base}`);
process.exit(failed ? 1 : 0);

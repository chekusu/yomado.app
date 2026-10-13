// Browser-language test for the bare home page.
//
//   npm run build && node tests/language.mjs          serves dist/ (under SITE_BASE if set)
//   BASE_URL=https://host/path/ node tests/language.mjs  tests a deployed copy
//   SCREENSHOT_DIR=dir node tests/language.mjs           also saves a few screenshots
//
// Each case runs in its own browser context with navigator.languages (and, where needed,
// localStorage) replaced by an init script, so no real browser or system setting changes. The
// home page should pick one of the 16 website languages: a valid ?lang=, else a language chosen by
// hand, else the first supported browser language (Chinese by script, then region: zh-Hant, zh-TW,
// zh-HK and zh-MO to Traditional; any Portuguese to Brazilian), else English; every other page, in
// any language, never changes language.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { mkdir, readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const SHOTS = process.env.SCREENSHOT_DIR;

let server;
let base = process.env.BASE_URL;
if (!base) {
  const prefix = (process.env.SITE_BASE ?? '/').replace(/^\/?/, '/').replace(/\/?$/, '/');
  const dist = fileURLToPath(new URL(`../${process.env.SITE_OUT_DIR ?? 'dist'}/`, import.meta.url));
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.avif': 'image/avif', '.woff2': 'font/woff2', '.vtt': 'text/vtt; charset=utf-8', '.mp4': 'video/mp4', '.webm': 'video/webm' };
  server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://x');
    if (!url.pathname.startsWith(prefix)) return res.writeHead(404).end();
    let file = join(dist, decodeURIComponent(url.pathname.slice(prefix.length)));
    if (!file.startsWith(dist)) return res.writeHead(403).end();
    try {
      if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
      res.writeHead(200, { 'Content-Type': types[extname(file)] ?? 'application/octet-stream' });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404, { 'Content-Type': types['.html'] }).end(await readFile(join(dist, '404.html')));
    }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${server.address().port}${prefix}`;
}
if (!base.endsWith('/')) base += '/';

const browser = await chromium.launch();
const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(['ok', name]);
  } catch (error) {
    results.push(['FAIL', name, String(error.message).split('\n')[0]]);
  }
}

/** A fresh context whose browser reports these languages; storage: false makes localStorage throw. */
async function browserWith(languages, { language = languages[0], storage = true, javaScriptEnabled = true } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled, ...(languages[0] ? { locale: languages[0] } : {}) });
  await context.addInitScript(
    ({ languages, language, storage }) => {
      Object.defineProperty(Navigator.prototype, 'languages', { get: () => languages, configurable: true });
      Object.defineProperty(Navigator.prototype, 'language', { get: () => language, configurable: true });
      if (!storage) {
        Object.defineProperty(window, 'localStorage', {
          get() {
            throw new DOMException('The operation is insecure.', 'SecurityError');
          },
          configurable: true,
        });
      }
    },
    { languages, language, storage },
  );
  return context;
}

/**
 * Open a path and let any redirect settle. Returns the final URL, the page language, how many
 * times the main frame navigated, and any errors.
 */
async function visit(context, path, page) {
  page ??= await context.newPage();
  const errors = [];
  let navigations = 0;
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('framenavigated', (frame) => frame === page.mainFrame() && navigations++);
  await page.goto(base + path, { waitUntil: 'commit' });
  await page.waitForLoadState('load');
  await page.waitForTimeout(400);
  await page.waitForLoadState('load');
  return { page, url: page.url(), lang: await page.getAttribute('html', 'lang'), navigations, errors };
}

const expectVisit = async (languages, path, expected, options) => {
  const context = await browserWith(languages, options);
  const v = await visit(context, path);
  assert.equal(v.url, base + expected, `${JSON.stringify(languages)} ${path || '/'}`);
  assert.ok(v.navigations <= 2, `navigated ${v.navigations} times`);
  assert.deepEqual(v.errors, []);
  return { context, ...v };
};

// 1. First visits by browser language.
for (const [languages, expected, lang] of [
  [['zh-CN', 'zh'], 'zh-cn/', 'zh-CN'],
  [['zh-TW'], 'zh-tw/', 'zh-TW'],
  [['zh-HK'], 'zh-tw/', 'zh-TW'],
  [['zh-MO'], 'zh-tw/', 'zh-TW'],
  [['zh-Hant-HK'], 'zh-tw/', 'zh-TW'],
  [['zh-Hans-HK'], 'zh-cn/', 'zh-CN'],
  [['zh-Hans'], 'zh-cn/', 'zh-CN'],
  [['zh-SG'], 'zh-cn/', 'zh-CN'],
  [['ja-JP', 'ja'], 'ja/', 'ja'],
  [['ko-KR', 'ko'], 'ko/', 'ko'],
  [['es-ES'], 'es/', 'es'],
  [['es-419', 'es'], 'es/', 'es'],
  [['fr-FR', 'ja', 'en'], 'fr/', 'fr'],
  [['fr-CA'], 'fr/', 'fr'],
  [['de-DE', 'de'], 'de/', 'de'],
  [['de-AT'], 'de/', 'de'],
  [['it-IT'], 'it/', 'it'],
  [['pt-BR', 'pt'], 'pt-br/', 'pt-BR'],
  [['pt-PT', 'pt'], 'pt-br/', 'pt-BR'],
  [['nl-NL'], 'nl/', 'nl'],
  [['nl-BE'], 'nl/', 'nl'],
  [['pl-PL'], 'pl/', 'pl'],
  [['tr-TR'], 'tr/', 'tr'],
  [['ar-EG', 'ar'], 'ar/', 'ar'],
  [['ar-SA'], 'ar/', 'ar'],
  [['hi-IN'], 'hi/', 'hi'],
  [['id-ID'], 'id/', 'id'],
  [['en-US', 'en'], '', 'en'],
  [['en-GB', 'ja'], '', 'en'],
  [['sv-SE', 'nb-NO'], '', 'en'],
  [['sv-SE', 'de-DE'], 'de/', 'de'],
]) {
  await check(`first visit with ${JSON.stringify(languages)} lands on /${expected}`, async () => {
    const v = await expectVisit(languages, '', expected);
    assert.equal(v.lang, lang);
    if (SHOTS && expected && languages.length === 2 && ['zh-CN', 'ja-JP', 'ar-EG'].includes(languages[0])) {
      await mkdir(SHOTS, { recursive: true });
      await v.page.screenshot({ path: join(SHOTS, `first-visit-${languages[0]}.png`) });
    }
    if (expected) {
      const stored = await v.page.evaluate((k) => localStorage.getItem(k), 'yomado.lang');
      assert.equal(stored, null, 'detection stores nothing');
    }
    await v.context.close();
  });
}

await check('navigator.language counts only when navigator.languages is empty', async () => {
  (await expectVisit([], '', 'ja/', { language: 'ja-JP' })).context.close();
  (await expectVisit([], '', 'ar/', { language: 'ar' })).context.close();
  (await expectVisit(['sv-SE'], '', '', { language: 'ja-JP' })).context.close();
});

// 2. Explicit ?lang= wins; an invalid one is ignored. Query and hash survive the move.
await check('?lang= picks the language, invalid values are ignored, query and hash are kept', async () => {
  (await expectVisit(['en-US'], '?lang=ja', 'ja/?lang=ja')).context.close();
  (await expectVisit(['ja-JP'], '?lang=en', '?lang=en')).context.close();
  (await expectVisit(['ja-JP'], '?lang=zh-CN', 'zh-cn/?lang=zh-CN')).context.close();
  (await expectVisit(['ja-JP'], '?lang=xx', 'ja/?lang=xx')).context.close();
  (await expectVisit(['en-US'], '?lang=pt-BR', 'pt-br/?lang=pt-BR')).context.close();
  (await expectVisit(['en-US'], '?lang=zh-Hant', 'zh-tw/?lang=zh-Hant')).context.close();
  (await expectVisit(['ja-JP'], '?lang=AR', 'ar/?lang=AR')).context.close();
  (await expectVisit(['de-DE'], '?lang=ko&cc=fr', 'ko/?lang=ko&cc=fr')).context.close();
  (await expectVisit(['ja-JP'], '?utm_source=test&x=1#download', 'ja/?utm_source=test&x=1#download')).context.close();
});

// 3. A language picked by hand is remembered for the home page and beats the browser, but not ?lang=.
await check('a language picked from the menu or footer is remembered for the home page', async () => {
  const ja = await browserWith(['ja-JP']);
  const first = await visit(ja, 'ja/');
  await first.page.locator('header [data-lang-menu] summary').click();
  await first.page.locator('header [data-lang-menu] a[hreflang="en"]').click();
  await first.page.waitForURL(`${base}?lang=en`);
  assert.equal(await first.page.getAttribute('html', 'lang'), 'en');
  assert.equal((await visit(ja, '')).url, base, 'English is remembered');
  assert.equal((await visit(ja, '?lang=ja')).url, `${base}ja/?lang=ja`, '?lang= still wins');
  await ja.close();

  const en = await browserWith(['en-US']);
  const home = await visit(en, '');
  await home.page.locator('footer [data-lang-switch][hreflang="zh-CN"]').click();
  await home.page.waitForURL(`${base}zh-cn/`);
  assert.equal((await visit(en, '')).url, `${base}zh-cn/`, 'Chinese is remembered');
  await en.close();

  // A newer language the same way, and it wins over the browser's.
  const ko = await browserWith(['ko-KR']);
  const korean = await visit(ko, '');
  assert.equal(korean.url, `${base}ko/`);
  await korean.page.locator('footer [data-lang-switch][hreflang="de"]').click();
  await korean.page.waitForURL(`${base}de/`);
  assert.equal(await korean.page.getAttribute('html', 'lang'), 'de');
  assert.equal((await visit(ko, '')).url, `${base}de/`, 'German is remembered over the Korean browser');
  await ko.close();
});

// 3b. The watch page's menu remembers a choice the same way, and closes with Escape.
await check('a language picked on the watch page is remembered for the home page', async () => {
  const zh = await browserWith(['zh-CN']);
  const watch = await visit(zh, 'zh-cn/watch/');
  const menu = watch.page.locator('header [data-lang-menu]');
  await menu.locator('summary').click();
  await watch.page.keyboard.press('Escape');
  assert.equal(await menu.evaluate((d) => d.open), false, 'Escape closes the menu');
  await menu.locator('summary').click();
  await menu.locator('a[hreflang="ja"]').click();
  await watch.page.waitForURL(`${base}ja/watch/`);
  assert.equal(await watch.page.getAttribute('html', 'lang'), 'ja');
  assert.equal(await watch.page.evaluate((k) => localStorage.getItem(k), 'yomado.lang'), 'ja', 'stored');
  assert.equal((await visit(zh, '')).url, `${base}ja/`, 'Japanese is remembered over the Chinese browser');
  assert.deepEqual(watch.errors, []);
  await zh.close();
});

// 4. Every language's pages and every details and watch page keep their language, whatever the
// browser's language or a language remembered before.
await check('explicit pages and deep links never change language', async () => {
  for (const [languages, path] of [
    [['ja-JP'], 'zh-cn/'],
    [['zh-CN'], 'ja/'],
    [['ja-JP'], 'details/'],
    [['ja-JP'], 'details/#verify'],
    [['zh-CN'], 'ja/details/'],
    [['en-US'], 'zh-cn/details/'],
    [['ja-JP'], 'watch/'],
    [['en-US'], 'ja/watch/'],
    [['ja-JP'], 'zh-cn/watch/'],
    [['ko-KR'], 'de/'],
    [['ar-EG'], 'ko/watch/'],
    [['zh-TW'], 'zh-cn/'],
    [['zh-CN'], 'zh-tw/details/'],
    [['pt-PT'], 'es/watch/?cc=fr'],
    [['de-DE'], 'ar/'],
    [['fr-FR'], 'watch/'],
  ]) {
    const v = await expectVisit(languages, path, path);
    assert.equal(v.navigations, 1, `${path} navigated ${v.navigations} times`);
    await v.context.close();
  }
  // A language remembered from the menu decides only the bare home page.
  const context = await browserWith(['en-US']);
  await context.addInitScript(() => localStorage.setItem('yomado.lang', 'de'));
  for (const path of ['ko/', 'hi/watch/', 'details/']) {
    const v = await visit(context, path);
    assert.equal(v.url, base + path, `${path} stays`);
  }
  assert.equal((await visit(context, '')).url, `${base}de/`, 'the bare home page follows it');
  await context.close();
});

// 4b. An explicit website-language switch leaves a ?cc= behind: the new page has its own subtitles.
await check('switching language from a page asked for other subtitles leaves ?cc= behind', async () => {
  const context = await browserWith(['zh-CN']);
  const v = await visit(context, 'zh-cn/watch/?cc=fr');
  assert.equal(await v.page.locator('[data-watch-cc] select').inputValue(), 'fr');
  await v.page.locator('header [data-lang-menu] summary').click();
  await v.page.locator('header [data-lang-menu] a[hreflang="ko"]').click();
  await v.page.waitForURL(`${base}ko/watch/`);
  assert.equal(await v.page.locator('[data-watch-cc] select').inputValue(), 'ko');
  assert.deepEqual(v.errors, []);
  await context.close();
});

// 5. With storage blocked, choosing English sticks through a reload via ?lang=en.
await check('with storage blocked, English chosen from the menu survives a reload', async () => {
  const context = await browserWith(['ja-JP'], { storage: false });
  const v = await visit(context, '');
  assert.equal(v.url, `${base}ja/`, 'detection still works without storage');
  await v.page.locator('header [data-lang-menu] summary').click();
  await v.page.locator('header [data-lang-menu] a[hreflang="en"]').click();
  await v.page.waitForURL(`${base}?lang=en`);
  await v.page.reload({ waitUntil: 'load' });
  await v.page.waitForTimeout(400);
  assert.equal(v.page.url(), `${base}?lang=en`);
  assert.equal(await v.page.getAttribute('html', 'lang'), 'en');
  assert.deepEqual(v.errors, []);
  if (SHOTS) await v.page.screenshot({ path: join(SHOTS, 'storage-blocked-english-after-reload.png') });
  await context.close();
});

// 6. Without JavaScript the home page stays English and the menu still switches.
await check('without JavaScript the home page stays English and the menu works', async () => {
  const context = await browserWith(['ja-JP'], { javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(base, { waitUntil: 'load' });
  assert.equal(page.url(), base);
  assert.equal(await page.getAttribute('html', 'lang'), 'en');
  await page.locator('header [data-lang-menu] summary').click();
  await page.locator('header [data-lang-menu] a[hreflang="ja"]').click();
  await page.waitForURL(`${base}ja/`);
  await context.close();
});

await browser.close();
server?.close();

for (const [status, name, detail] of results) console.log(`${status === 'ok' ? '  ok ' : 'FAIL '} ${name}${detail ? ` — ${detail}` : ''}`);
const failed = results.filter(([status]) => status !== 'ok').length;
console.log(`\n${results.length - failed}/${results.length} language checks passed against ${base}`);
process.exit(failed ? 1 : 0);

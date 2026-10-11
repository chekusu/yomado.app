// Renders the committed raster assets in public/: PNG favicons and the Open Graph cards.
//
//   npm run assets            (after npm run film, which renders the story still the cards use)
//
// The cards use Inter from node_modules. Chinese titles are set in Noto Sans SC, subset by Google
// Fonts to the characters on the card, so rendering needs network access. Re-run after changing
// the headline, the brand icon, the story scene or the canonical domain.
import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const path = (p) => fileURLToPath(new URL(p, root));
const config = JSON.parse(await readFile(path('site.config.json'), 'utf8'));
const host = new URL(config.siteUrl).host;

const dataUri = async (file, type) => `data:${type};base64,${(await readFile(path(file))).toString('base64')}`;
const icon = await dataUri('src/assets/night-window.png', 'image/png');
const still = await dataUri('public/media/story-wide.webp', 'image/webp');
const inter = await dataUri('node_modules/@fontsource-variable/inter/files/inter-latin-opsz-normal.woff2', 'font/woff2');

const cards = {
  en: { lang: 'en', title: 'A screen<br>for your agents.', line: 'Virtual displays for visual agents' },
  'zh-cn': { lang: 'zh-CN', title: '给 Agent<br>一块屏幕。', line: '为视觉 Agent 准备的虚拟屏' },
};

function cardHtml(card) {
  const cjk = encodeURIComponent(`${card.title.replace(/<[^>]+>/g, '')}${card.line}夜窗`);
  return `<!doctype html><html lang="${card.lang}"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@500;700&text=${cjk}">
<style>
  @font-face { font-family: Inter; font-weight: 100 900; src: url(${inter}) format('woff2'); }
  * { margin: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body { position: relative; overflow: hidden; background: #fff; color: #1d1d1f; font-family: Inter, 'Noto Sans SC', sans-serif; }
  .shot { position: absolute; left: 536px; top: 58px; width: 900px; }
  .brand { position: absolute; left: 72px; top: 76px; display: flex; align-items: center; gap: 14px; }
  .brand img { width: 52px; height: 52px; border-radius: 12px; }
  .brand b { font-size: 38px; font-weight: 650; letter-spacing: -.03em; }
  .brand i { font-style: normal; color: #6e6e73; font-size: 22px; font-weight: 500; letter-spacing: .16em; }
  h1 { position: absolute; left: 72px; top: 200px; width: 520px; font-size: 64px; font-weight: 650; line-height: 1.04; letter-spacing: -.035em; }
  :lang(zh-CN) h1 { font-weight: 700; line-height: 1.2; letter-spacing: 0; }
  p { position: absolute; left: 72px; bottom: 72px; color: #6e6e73; font-size: 24px; font-weight: 500; letter-spacing: -.01em; }
  p b { color: #1d1d1f; font-weight: 600; }
</style></head><body>
  <img class="shot" src="${still}" alt="">
  <div class="brand"><img src="${icon}" alt=""><b>yomado</b><i>夜窗</i></div>
  <h1>${card.title}</h1>
  <p><b>${host}</b> · ${card.line}</p>
</body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await mkdir(path('public/og'), { recursive: true });

for (const [locale, card] of Object.entries(cards)) {
  await page.setContent(cardHtml(card), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path(`public/og/${locale}.png`) });
  console.log(`public/og/${locale}.png`);
}

// Favicons from the app icon: transparent 32 px, and a full-bleed 180 px touch icon.
for (const [file, size, background] of [
  ['public/favicon-32.png', 32, 'transparent'],
  ['public/apple-touch-icon.png', 180, '#0a1538'],
]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>*{margin:0}body{background:${background}}img{display:block;width:${size}px;height:${size}px}</style><img src="${icon}">`,
  );
  await page.screenshot({ path: path(file), omitBackground: background === 'transparent' });
  console.log(file);
}

await browser.close();

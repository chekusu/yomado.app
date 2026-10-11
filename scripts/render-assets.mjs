// Renders the committed raster assets in public/: PNG favicons and the Open Graph cards.
//
//   npm run assets
//
// The cards reuse the site's fonts from node_modules. Chinese titles are set in Noto Serif SC,
// subset by Google Fonts to the characters on the card, so rendering needs network access.
// Re-run after changing the headline, the brand icon or the canonical domain.
import { chromium } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const path = (p) => fileURLToPath(new URL(p, root));
const config = JSON.parse(await readFile(path('site.config.json'), 'utf8'));
const host = new URL(config.siteUrl).host;

const dataUri = async (file, type) => `data:${type};base64,${(await readFile(path(file))).toString('base64')}`;
const icon = await dataUri('src/assets/night-window.png', 'image/png');
const font = (file) => dataUri(`node_modules/${file}`, 'font/woff2');
const fonts = `
  @font-face { font-family: Spectral; font-weight: 300; src: url(${await font('@fontsource/spectral/files/spectral-latin-300-normal.woff2')}); }
  @font-face { font-family: Spectral; font-weight: 300; font-style: italic; src: url(${await font('@fontsource/spectral/files/spectral-latin-300-italic.woff2')}); }
  @font-face { font-family: Spectral; font-weight: 400; src: url(${await font('@fontsource/spectral/files/spectral-latin-400-normal.woff2')}); }
  @font-face { font-family: 'Fragment Mono'; src: url(${await font('@fontsource/fragment-mono/files/fragment-mono-latin-400-normal.woff2')}); }
`;

const cards = {
  en: {
    lang: 'en',
    title: 'Give your agent<br>a window that<br><em>stays lit.</em>',
    line: 'Virtual displays for visual agents on macOS',
  },
  'zh-cn': {
    lang: 'zh-CN',
    title: '给 Agent<br>一扇<em>亮着的窗</em>。',
    line: '为视觉 Agent 准备的 macOS 虚拟屏',
  },
};

// The night-window silhouette (see src/lib/shape.ts), portrait like the icon.
function nightWindow(x, y, w, h, { tl, br, r }) {
  const cx = x + w - 0.646 * r;
  const cy = y + 0.67 * r;
  const ax = cx - Math.sqrt(r * r - (cy - y) ** 2);
  const by = cy + Math.sqrt(r * r - (x + w - cx) ** 2);
  return `M${x} ${y + tl}A${tl} ${tl} 0 0 1 ${x + tl} ${y}H${ax}A${r} ${r} 0 1 0 ${x + w} ${by}V${y + h - br}A${br} ${br} 0 0 1 ${x + w - br} ${y + h}H${x + br}A${br} ${br} 0 0 1 ${x} ${y + h - br}Z`;
}

function cardHtml(card) {
  const cjk = encodeURIComponent(`${card.title.replace(/<[^>]+>/g, '')}${card.line}夜窗`);
  return `<!doctype html><html lang="${card.lang}"><head><meta charset="utf-8">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@300;400&text=${cjk}">
<style>
  ${fonts}
  * { margin: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    position: relative; overflow: hidden; color: #fcf8e1;
    background: radial-gradient(760px 520px at 86% 18%, rgb(58 78 144 / .55), transparent 64%), #0a1434;
    font-family: Spectral, 'Noto Serif SC', serif;
  }
  .brand { position: absolute; left: 80px; top: 72px; display: flex; align-items: center; gap: 18px; }
  .brand img { width: 64px; height: 64px; }
  .brand b { font-weight: 400; font-size: 46px; letter-spacing: -.01em; }
  .brand i { font-style: normal; padding-left: 16px; border-left: 1px solid rgb(252 248 225 / .25); color: #b9c0d8; font-size: 26px; letter-spacing: .14em; }
  h1 { position: absolute; left: 80px; top: 196px; width: 650px; font-weight: 300; font-size: 78px; line-height: 1.02; letter-spacing: -.02em; }
  h1 em { font-style: italic; color: #fffcef; }
  :lang(zh-CN) h1 { font-size: 74px; line-height: 1.3; letter-spacing: 0; width: 600px; }
  :lang(zh-CN) h1 em { font-style: normal; color: #f2c27b; }
  p { position: absolute; left: 80px; bottom: 70px; font: 22px/1.3 'Fragment Mono', 'Noto Serif SC', monospace; color: #b9c0d8; letter-spacing: .02em; }
  p span { color: #fcf8e1; }
  svg { position: absolute; right: 0; top: 0; }
</style></head><body>
  <svg width="1200" height="630" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="lit" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fffdf3"/><stop offset="1" stop-color="#efe5c2"/></linearGradient>
      <filter id="glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="38"/></filter>
    </defs>
    <path d="${nightWindow(838, 104, 270, 424, { tl: 82, br: 26, r: 64 })}" fill="#fcf8e1" opacity=".38" filter="url(#glow)"/>
    <path d="${nightWindow(838, 104, 270, 424, { tl: 82, br: 26, r: 64 })}" fill="url(#lit)"/>
    <g transform="translate(872 262)">
      <rect width="202" height="132" rx="9" fill="#161e48"/>
      <path d="M9 0h184a9 9 0 0 1 9 9v12H0V9a9 9 0 0 1 9-9z" fill="#222c5e"/>
      <circle cx="13" cy="10.5" r="3.4" fill="#ec7b69"/><circle cx="25" cy="10.5" r="3.4" fill="#efc566"/><circle cx="37" cy="10.5" r="3.4" fill="#76c38b"/>
      <path d="M84 52h34v34H84zM84 52l14-11h34l-14 11M118 52l14-11v34l-14 11" fill="none" stroke="#f2b56f" stroke-width="2" stroke-linejoin="round"/>
    </g>
  </svg>
  <div class="brand"><img src="${icon}" alt=""><b>yomado</b><i>夜窗</i></div>
  <h1>${card.title}</h1>
  <p><span>${host}</span> · ${card.line}</p>
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
  ['public/apple-touch-icon.png', 180, '#0c1940'],
]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    `<style>*{margin:0}body{background:${background}}img{display:block;width:${size}px;height:${size}px}</style><img src="${icon}">`,
  );
  await page.screenshot({ path: path(file), omitBackground: background === 'transparent' });
  console.log(file);
}

await browser.close();

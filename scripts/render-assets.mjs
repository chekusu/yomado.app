// Renders the committed raster assets in public/: PNG favicons and the Open Graph cards, one per
// website language.
//
//   npm run assets            (after npm run film, which renders the story still the cards use)
//   npm run assets -- ja ko   only the named cards; favicons are left alone
//
// The cards use Inter from node_modules. Chinese, Japanese, Korean, Arabic and Hindi titles are set
// in Noto Sans SC, TC, JP, KR, Arabic and Devanagari, subset by Google Fonts to the characters on
// the card, so rendering needs network access. The Arabic card reads right to left, its picture on
// the left. Re-run after changing the headline, the brand icon, the story scene or the canonical
// domain.
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
const interExt = await dataUri('node_modules/@fontsource-variable/inter/files/inter-latin-ext-opsz-normal.woff2', 'font/woff2');

// font: the Noto family a card's own words are set in (Latin words stay in Inter); size: a smaller
// title where a language's words run long.
const cards = {
  en: { lang: 'en', title: 'A screen<br>for your agents.', line: 'Virtual displays for visual agents' },
  'zh-cn': { lang: 'zh-CN', title: '给 Agent<br>一块屏幕。', line: '为视觉 Agent 准备的虚拟屏', font: 'Noto Sans SC' },
  'zh-tw': { lang: 'zh-TW', title: '給 Agent<br>一塊螢幕。', line: '為視覺 Agent 準備的虛擬螢幕', font: 'Noto Sans TC' },
  ja: { lang: 'ja', title: 'エージェントに、<br>専用の画面を。', line: 'エージェントのための仮想ディスプレイ', font: 'Noto Sans JP' },
  ko: { lang: 'ko', title: '에이전트에게,<br>전용 화면을.', line: '시각 에이전트를 위한 가상 디스플레이', font: 'Noto Sans KR' },
  es: { lang: 'es', title: 'Una pantalla<br>para tus agentes.', line: 'Pantallas virtuales para agentes visuales', size: 58 },
  fr: { lang: 'fr', title: 'Un écran<br>pour vos agents.', line: 'Des écrans virtuels pour les agents visuels' },
  de: { lang: 'de', title: 'Ein Bildschirm<br>für deine Agenten.', line: 'Virtuelle Displays für visuelle Agenten', size: 54 },
  it: { lang: 'it', title: 'Uno schermo<br>per i tuoi agenti.', line: 'Schermi virtuali per agenti visivi', size: 60 },
  'pt-br': { lang: 'pt-BR', title: 'Uma tela para<br>os seus agentes.', line: 'Telas virtuais para agentes visuais', size: 58 },
  nl: { lang: 'nl', title: 'Een scherm<br>voor je agents.', line: 'Virtuele schermen voor visuele agents' },
  pl: { lang: 'pl', title: 'Ekran dla<br>twoich agentów.', line: 'Wirtualne ekrany dla agentów wizualnych' },
  tr: { lang: 'tr', title: 'Ajanlarınız için<br>bir ekran.', line: 'Görsel ajanlar için sanal ekranlar', size: 58 },
  ar: { lang: 'ar', dir: 'rtl', title: 'شاشة<br>لوكلائك.', line: 'شاشات افتراضية للوكلاء البصريين', font: 'Noto Sans Arabic' },
  hi: { lang: 'hi', title: 'आपके एजेंट्स<br>के लिए एक स्क्रीन।', line: 'विज़ुअल एजेंट्स के लिए वर्चुअल डिस्प्ले', font: 'Noto Sans Devanagari', size: 50 },
  id: { lang: 'id', title: 'Layar untuk<br>agen Anda.', line: 'Layar virtual untuk agen visual' },
};
const only = process.argv.slice(2);
for (const name of only) if (!cards[name]) throw new Error(`no card named ${name}; choose from ${Object.keys(cards).join(', ')}`);

const googleFont = (family, text) =>
  `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${family.replaceAll(' ', '+')}:wght@500;700&text=${encodeURIComponent(text)}">`;

function cardHtml(card) {
  const text = `${card.title.replace(/<[^>]+>/g, '')}${card.line}`;
  // A card's own words in its script's font; the brand's 夜窗 is Chinese (Noto Sans SC) on every card.
  const own = card.font && card.font !== 'Noto Sans SC' ? googleFont(card.font, text) : '';
  const sc = googleFont('Noto Sans SC', card.font === 'Noto Sans SC' ? `${text}夜窗` : '夜窗');
  return `<!doctype html><html lang="${card.lang}" dir="${card.dir ?? 'ltr'}"><head><meta charset="utf-8">
${sc}${own}
<style>
  @font-face { font-family: Inter; font-weight: 100 900; src: url(${inter}) format('woff2'); unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD; }
  @font-face { font-family: Inter; font-weight: 100 900; src: url(${interExt}) format('woff2'); unicode-range: U+0100-02BA, U+02BD-02C5, U+02C7-02CC, U+02CE-02D7, U+02DD-02FF, U+0304, U+0308, U+0329, U+1D00-1DBF, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20C0, U+2113, U+2C60-2C7F, U+A720-A7FF; }
  * { margin: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body { position: relative; overflow: hidden; background: #fff; color: #1d1d1f; font-family: Inter, ${card.font ? `'${card.font}', ` : ''}'Noto Sans SC', sans-serif; }
  .shot { position: absolute; left: 536px; top: 58px; width: 900px; }
  .brand { position: absolute; left: 72px; top: 76px; display: flex; align-items: center; gap: 14px; }
  .brand img { width: 52px; height: 52px; border-radius: 12px; }
  .brand b { font-size: 38px; font-weight: 650; letter-spacing: -.03em; }
  .brand i { font-style: normal; color: #6e6e73; font-size: 22px; font-weight: 500; letter-spacing: .16em; }
  h1 { position: absolute; left: 72px; top: 200px; width: 520px; font-size: ${card.size ?? 64}px; font-weight: 650; line-height: 1.04; letter-spacing: -.035em; }
  :lang(zh) h1, :lang(ko) h1 { font-weight: 700; line-height: 1.2; letter-spacing: 0; }
  :lang(ja) h1 { font-size: 56px; font-weight: 700; line-height: 1.24; letter-spacing: 0; }
  :lang(ar) h1, :lang(hi) h1 { font-weight: 700; line-height: 1.3; letter-spacing: 0; }
  :lang(ar) p, :lang(hi) p { letter-spacing: 0; }
  .brand i { font-family: 'Noto Sans SC', sans-serif; }
  p { position: absolute; left: 72px; bottom: 72px; color: #6e6e73; font-size: 24px; font-weight: 500; letter-spacing: -.01em; }
  p b { color: #1d1d1f; font-weight: 600; }
  /* Right to left: the words on the right, the picture on the left (clipped to the card, so the page
     never scrolls toward it). */
  html[dir='rtl'] { overflow: hidden; }
  [dir='rtl'] .shot { left: auto; right: 536px; }
  [dir='rtl'] .brand, [dir='rtl'] h1, [dir='rtl'] p { left: auto; right: 72px; }
</style></head><body>
  <img class="shot" src="${still}" alt="">
  <div class="brand" dir="ltr"><img src="${icon}" alt=""><b>yomado</b><i lang="zh-CN">夜窗</i></div>
  <h1>${card.title}</h1>
  <p><b><bdi>${host}</bdi></b> · ${card.line}</p>
</body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await mkdir(path('public/og'), { recursive: true });

for (const [locale, card] of Object.entries(cards)) {
  if (only.length && !only.includes(locale)) continue;
  await page.setContent(cardHtml(card), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path(`public/og/${locale}.png`) });
  console.log(`public/og/${locale}.png`);
}

// Favicons from the app icon: transparent 32 px, and a full-bleed 180 px touch icon.
for (const [file, size, background] of only.length ? [] : [
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

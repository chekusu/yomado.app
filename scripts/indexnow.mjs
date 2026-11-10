// Tell the IndexNow search engines (Bing, Yandex, Naver, Seznam and others; Bing's index also feeds
// the web search of AI assistants such as ChatGPT and Copilot) that the site's pages changed.
//
//   node scripts/indexnow.mjs [dist]
//
// Runs after a production deploy (.github/workflows/deploy.yml). It submits every page in the
// built sitemap plus /llms.txt and /llms-full.txt, once the live key file answers with the key, so
// the engines can check that the submission speaks for the site. Exits non-zero if the
// submission is refused; the deploy step doesn't fail on it.
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, process.argv[2] ?? 'dist');
const config = JSON.parse(await readFile(join(root, 'site.config.json'), 'utf8'));
const site = config.siteUrl.replace(/\/?$/, '/');
const key = config.indexNowKey;
const keyLocation = `${site}${key}.txt`;

const sitemap = await readFile(join(dist, 'sitemap.xml'), 'utf8');
const urlList = [...new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).concat(`${site}llms.txt`, `${site}llms-full.txt`))];

// The deploy has just finished; give the edge a moment to serve the key file.
let live = '';
for (let attempt = 1; attempt <= 6 && live !== key; attempt++) {
  live = await fetch(keyLocation, { cache: 'no-store' })
    .then((r) => (r.ok ? r.text() : ''))
    .then((t) => t.trim())
    .catch(() => '');
  if (live !== key) await new Promise((resolve) => setTimeout(resolve, attempt * 5000));
}
if (live !== key) {
  console.error(`IndexNow: ${keyLocation} doesn't answer with the key; nothing submitted.`);
  process.exit(1);
}

const response = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({ host: new URL(site).host, key, keyLocation, urlList }),
});
console.log(`IndexNow: ${urlList.length} URLs, ${response.status} ${response.statusText}`);
// 200 accepted, 202 accepted and the key is being checked; anything else is a refusal.
if (![200, 202].includes(response.status)) {
  console.error(await response.text());
  process.exit(1);
}

# yomado.app

The website for **yomado · 夜窗**, a native macOS virtual display for visual agents —
live at **[yomado.app](https://yomado.app)**.

> This repository is only the website. The app, its documentation and its releases live in
> **[chekusu/yomado](https://github.com/chekusu/yomado)**.

The page shows what yomado is for and gets the visitor to the real download, with as few words
as possible. yomado gives Codex and other visual agents a virtual display of their own, so they
can work in desktop apps through screenshots, mouse and keyboard while your windows stay on your
screen. It is not an agent, a remote desktop or an MCP replacement — it only supplies the display.

- English at `/`, Simplified Chinese at `/zh-cn/`, Japanese at `/ja/`; install, checksum and
  requirements at `/details/`, `/zh-cn/details/` and `/ja/details/`
- A language menu in the header (and a list in the footer) links every page to the same page in
  the other languages and keeps the section in view
- The bare home page (`/`, or the `SITE_BASE` root) follows the browser: a valid `?lang=` first,
  then a language picked by hand from the menu or footer (remembered in `localStorage`), then the
  first supported entry of `navigator.languages` (any `zh-*` is Simplified Chinese), then English.
  It moves with `location.replace`, keeping the query and hash. `/zh-cn/`, `/ja/` and every
  details page never redirect, detection itself stores nothing, links to the English home carry
  `?lang=en` so the choice holds without storage, and canonical and `hreflang` URLs carry no query.
  Without JavaScript the home page stays English and the menu still works
- Every download button points at the configured GitHub Release archive
- `sitemap.xml`, `robots.txt`, per-locale Open Graph cards, `hreflang` alternates, structured data

## The page

The design brief is in [.impeccable.md](.impeccable.md): an Apple-style product page, one short
headline per scene, motion that demonstrates the product rather than decorates.

1. **Hero** — the headline, the download and a 16-second concept film.
2. **Story** — three acts scrubbed by scroll: a named screen opens; an app moves into it while
   your other windows stay; Codex and GrokBot each get a screen with their own apps.
3. **Panel** — the app's real control panel.
4. **Finale** — night falls, the two lit screens draw together into the night-window mark, and
   the download waits underneath.

The film, the story and the finale are one timeline, `src/lib/scene.ts`, drawn by
`src/components/Scene.astro`. The page poses the scene live; `npm run film` plays the same
timeline frame by frame in Chromium and encodes it with ffmpeg, so the three never disagree.
Under reduced motion the film doesn't start by itself and each act shows its finished state;
without JavaScript the film gets native controls and the story becomes stills.

## Stack

[Astro](https://astro.build) and TypeScript, built to plain static files. No backend, analytics,
cookies, forms or third-party requests at runtime. Macs render the system font; elsewhere
[Inter](https://rsms.me/inter/) stands in, self-hosted from [Fontsource](https://fontsource.org)
(SIL OFL), with Fragment Mono for the checksum. Chinese text uses the reader's system CJK fonts.

```
site.config.json   canonical origin and the release the page offers (single source)
.impeccable.md     confirmed design context
src/i18n/          all copy, per locale (en, zh-cn, ja)
src/lib/site.ts    locales (paths, tags, Open Graph locales, names, dates) and release facts
src/lib/scene.ts   the story timeline: poses for every moment, in two layouts (wide, tall)
src/components/    Scene (the drawn scene), Hero + Film, Story, Panel, Finale, DetailsPage
src/scripts/       scene-view (poses the DOM), story (scroll and finale), film (playback)
src/assets/        app icon and control-panel render (from chekusu/yomado)
public/media/      the concept film (MP4 + WebM, wide and tall), posters, story stills (generated)
public/            favicons and Open Graph cards (generated, committed)
functions/         a Pages Function that answers byte ranges for the films on Cloudflare
scripts/           verify-dist.mjs (static checks), render-film.mjs, render-assets.mjs
tests/             smoke.mjs (browser), download.mjs (real download acceptance)
```

## Develop

Requires Node.js 22+.

```sh
npm install
npm run dev          # http://localhost:4321
```

## Check, build and test

```sh
npm run check        # astro check
npm run build        # static output in dist/
npm run verify       # metadata, links, release URL, media sizes, no private paths or credentials
npm test             # serves dist/ and runs the Playwright smoke test
npm run test:download
```

The smoke test needs Playwright's Chromium (`npx playwright install chromium`). It covers all
three locales at 1440, 945, 834, 390 and 320 px: metadata (hreflang, Open Graph locales), console
errors, horizontal overflow, the download entry points, the film (muted inline autoplay, pause and
replay, the portrait version on phones, reduced motion, the poster when no source plays), the
scroll story and the finale, the language menu between every pair of locales on the home and
details pages (with the section kept), the details page with checksum copy, the page without
JavaScript, the header on phones with classic scrollbars, 404, sitemap and robots.txt.
`SCREENSHOT_DIR=dir npm test` also saves screenshots.

`npm test` then runs `tests/language.mjs` (also `npm run test:language`): first visits with
Chinese, Japanese, English, mixed (`fr, ja, en`; `en, ja`) and unsupported browser languages,
`navigator.language` only when the list is empty, `?lang=` (valid and not), query and hash kept,
a remembered choice, the other languages' pages and details deep links left alone, English
surviving a reload with storage blocked, and the page without JavaScript. Each case runs in its
own browser context with the languages replaced by an init script.

`npm run test:download` clicks the hero download button on each locale's home page in a real
browser and checks that the file is the configured app archive: SHA-256, size, bundle identifier,
version, build, minimum macOS and an arm64 executable.

Both tests run against a deployed copy too:

```sh
BASE_URL=https://yomado.app/ npm test
BASE_URL=https://yomado.app/ npm run test:download
```

## The film

```sh
npm run film                          # renders public/media/ (needs ffmpeg on PATH)
npm run film -- --stills 0,3.6 --out d    # PNG stills of single moments, for review
npm run assets                        # Open Graph cards and favicons (use the story still)
npm run assets -- ja                  # just the named cards (en, zh-cn, ja)
```

Safari plays video only from servers that answer byte-range requests, and `*.pages.dev` serves
static files whole, so `functions/media/[[path]].js` (a Pages Function on `/media/*`) returns the
requested slice as 206. The smoke test checks ranges wherever it runs.

The render builds the site with `FILM_STAGE=1`, which adds two render pages
(`/film/wide/`, `/film/tall/`) that production builds never contain. Wide is 1920 × 1080, tall is
1080 × 1350 for phones; each is about 0.9 MB as H.264 and as VP9. Re-render after changing
`src/lib/scene.ts` or `src/components/Scene.astro`.

## Configuration

`site.config.json` is the only place to change:

- **`siteUrl`** — the canonical origin used for canonical links, `hreflang`, Open Graph,
  structured data, `robots.txt` and the sitemap. `SITE_URL=https://example.com npm run build`
  overrides it for one build. Re-run `npm run assets` after changing it (the cards show the host).
- **`release`** — the version, download URL, file name, size and SHA-256 the page offers. When a
  new release is published, update this block and run `npm run test:download`; the page must
  never link a source archive or an unverified file.

The site builds for the domain root. To serve it under a path, set `SITE_BASE`:

```sh
SITE_BASE=/preview/ npm run build
SITE_BASE=/preview/ npm test
```

`SITE_NOINDEX=1` adds `noindex` and a disallowing `robots.txt`, for preview copies.

## Deploy

`.github/workflows/deploy.yml` checks, builds, verifies and runs the smoke test, then
`wrangler pages deploy dist` to the Cloudflare Pages project `yomado-dev`:

- a push to **`main`** updates the production site, `yomado.app` and `www.yomado.app`;
- a push to **`preview/<name>`** publishes only a preview deployment at
  `preview-<name>.yomado-dev.pages.dev`, leaving production as it is.

The deploy step runs only where Cloudflare credentials are available and is skipped elsewhere, so
forks and pull requests just build and test. `dist/` works on any static host; serve
`dist/404.html` for missing paths.

## Copy and claims

All visible text lives in `src/i18n/{en,zh-cn,ja}.ts`; update all three together. In Chinese and
Japanese titles, `|` marks where a line may break, so words are never split. The app's own
interface is Simplified Chinese only, and every locale says so; the Japanese and English pages
don't make the app multilingual. Locales are defined once in `src/lib/site.ts`; a new one also
needs its copy, its two pages under `src/pages/`, an Open Graph card and a line in the tests.

Keep claims inside the app's README and release notes. Verified: the native Apple Silicon build;
moving Calculator into virtual screens named Codex and GrokBot through the panel's app menu, a
fresh screenshot, keyboard input, returning it to its original place, and closing a single screen
after its windows return. Not verified: agent work with monitors physically switched off, power
savings, long unattended runs, drag-and-drop moves, WeChat visual automation. Virtual displays
share the login session, keyboard, pointer and focus — the film never shows two pointers at once.
The film is a concept demo and its caption says so. The build is Developer ID signed by CHEKUSU
and notarized by Apple, with the notarization ticket stapled to the app. This is website
distribution, not a Mac App Store release; macOS may still request confirmation on first launch.
It remains experimental software using private macOS APIs, arm64 only; macOS 14 is the deployment
target, not a compatibility guarantee. Don't add reviews, user counts, sponsors or benchmarks.

## Assets

The night-window app icon and the control-panel render (drawn by the app with example display
data) come from [chekusu/yomado](https://github.com/chekusu/yomado) under its MIT license. The
scene, its app windows and glyphs, and the film are original to this repository: synthetic
example content, no real desktops, contacts or private data.

## License

MIT, see [LICENSE](LICENSE). Bundled fonts keep their SIL Open Font License. Codex, GrokBot and
macOS are names of their respective owners; their mention does not imply endorsement.

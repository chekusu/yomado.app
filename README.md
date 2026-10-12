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
  requirements at `/details/`, `/zh-cn/details/` and `/ja/details/`; the one-minute film with the
  browser's own controls at `/watch/`, `/zh-cn/watch/` and `/ja/watch/`
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

The design brief is in [PRODUCT.md](PRODUCT.md): an Apple-style product page, one short headline
per scene, motion that demonstrates the product rather than decorates.

1. **Hero** — the headline, the download and the one-minute product film, with a link to watch it
   with full controls.
2. **Story** — three acts scrubbed by scroll: a named screen opens; Blender moves into it while
   your other windows stay; Codex gets Marvelous Designer too and GrokBot a screen with Chrome.
3. **Panel** — the app's control panel, rebuilt from its own layout with the apps' real icons.
4. **Finale** — night falls, the two lit screens draw together into the night-window mark, and
   the download waits underneath.

Apps appear everywhere with their own icons (the Dock, the screens' labels, the panel, the film),
copied byte for byte out of the apps' `.icns` resources; see Assets.

The story and the finale are one timeline, `src/lib/scene.ts`, drawn by
`src/components/Scene.astro`. The film has its own, longer timeline, `src/lib/film.ts`, drawn by
`src/components/FilmStage.astro` with the same apps, screens and panel; `npm run film` plays it
frame by frame in Chromium and encodes it with ffmpeg. Under reduced motion the film doesn't start
by itself (the play button and the watch page still play all of it) and each act shows its
finished state; without JavaScript the film gets native controls and the story becomes stills.

### The film

Sixty seconds, six shots, no sound, in each locale's language, labelled as a simulated demo
throughout:

1. **The need** — your display, its Dock and windows; Codex works in Blender there, by screenshot
   and click.
2. **The panel** — yomado's menu bar icon opens the control panel; a virtual screen is added to
   the right of your two Studio Displays and renamed Codex.
3. **The move** — Blender and Marvelous Designer are dragged onto Codex in the panel (lift, hover,
   wiggle, snap); their windows cross to the new screen while yours stay.
4. **The loop** — on Codex, Codex takes a screenshot, adds a Subdivision Surface modifier, types
   3, turns the view and switches to rendered shading, then takes another screenshot.
5. **The return** — a second screen, GrokBot, gets Chrome; Marvelous Designer is dragged back;
   the menu bar menu lists each screen's apps and closes GrokBot, whose window returns first.
6. **The close** — night falls and Codex becomes the night-window mark, with `yomado.app`.

There is one pointer throughout, yours or Codex's: the screens share one keyboard, pointer and
focus. The panel, menus and dialog use the app's own interface text (Simplified Chinese).

## Stack

[Astro](https://astro.build) and TypeScript, built to plain static files. No backend, analytics,
cookies, forms or third-party requests at runtime. Macs render the system font; elsewhere
[Inter](https://rsms.me/inter/) stands in, self-hosted from [Fontsource](https://fontsource.org)
(SIL OFL), with Fragment Mono for the checksum. Chinese text uses the reader's system CJK fonts.

```
site.config.json   canonical origin and the release the page offers (single source)
PRODUCT.md         confirmed design context
src/i18n/          all copy, per locale (en, zh-cn, ja), including the film's supers
src/lib/site.ts    locales (paths, tags, Open Graph locales, names, dates) and release facts
src/lib/scene.ts   the story timeline: poses for every moment, in two layouts (wide, tall)
src/lib/film.ts    the film timeline: world, camera, pointer, panel, Blender, supers, end card
src/lib/apps.ts    the apps shown and their icons; panel.ts the panel's layout; media.ts the films
src/components/    Scene, FilmStage, ControlPanel, AppIcon, Hero + Film, Story, Panel, Finale,
                   DetailsPage, WatchPage
src/scripts/       scene-view, story, film (playback), film-view (poses the film), film-garment
                   (the film's 3D views, three.js)
src/assets/        the night-window app icon (from chekusu/yomado)
public/apps/       the apps' icons, extracted from their .icns, and sources.json (provenance)
public/media/      the film per locale (MP4 + WebM, wide and tall), posters, story stills
public/            favicons and Open Graph cards (generated, committed)
functions/         a Pages Function that answers byte ranges for the films on Cloudflare
scripts/           verify-dist.mjs, media-info.mjs, render-film.mjs, render-assets.mjs,
                   extract-icons.mjs
tests/             smoke.mjs (browser), language.mjs, download.mjs (real download acceptance)
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
npm run verify       # metadata, links, release URL, film files, icons, no private paths or credentials
npm test             # serves dist/ and runs the Playwright smoke test
npm run test:download
```

The smoke test needs Playwright's Chromium (`npx playwright install chromium`). It covers all
three locales at 1440, 945, 834, 390 and 320 px: metadata (hreflang, Open Graph locales), console
errors, horizontal overflow, the download entry points, the film (its real length and size, muted
inline autoplay, seeking into the middle and to the end, pause and replay, Tab, Enter and Space
with a visible focus ring, the portrait version on phones, reduced motion, the poster when no
source plays, and the media type and byte ranges of every film file), the watch page (the
browser's controls, seeking, the end, the MP4 links, phones), the scroll story with the apps' own
icons and the finale, the language menu between every pair of locales on the home, details and
watch pages (with the section kept), the details page with checksum copy, the page without
JavaScript, the header on phones with classic scrollbars, 404, sitemap and robots.txt.
`SCREENSHOT_DIR=dir npm test` also saves screenshots.

`npm run verify` reads the film files themselves (`scripts/media-info.mjs`, no ffprobe needed):
55–65 s, 1920 × 1080 or 1080 × 1350, at least 30 fps, H.264 High 4.0 in yuv420p with `moov`
before `mdat`, the codec string the pages declare, VP9 for the WebM; each video file under 9 MB,
posters and stills under 200 kB. It fails if an internal render page or a file of the old
16-second film is published, or if an app icon differs from `public/apps/sources.json`.

`npm test` then runs `tests/language.mjs` (also `npm run test:language`): first visits with
Chinese, Japanese, English, mixed (`fr, ja, en`; `en, ja`) and unsupported browser languages,
`navigator.language` only when the list is empty, `?lang=` (valid and not), query and hash kept,
a remembered choice, the other languages' pages, details and watch deep links left alone, English
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

## Rendering the film and the icons

```sh
npm run film                               # all six films → public/media/ (needs ffmpeg on PATH)
npm run film -- --stills 0,36.9 --out d    # PNG stills of single moments, for review
npm run film -- --locale ja --layout tall  # one variant
npm run film -- --encode-only              # re-encode the last render's frames
npm run assets                             # Open Graph cards and favicons (use the story still)
npm run assets -- ja                       # just the named cards (en, zh-cn, ja)
npm run icons -- <folder>                  # the apps' icons from their .icns (see Assets)
```

Safari plays video only from servers that answer byte-range requests, and `*.pages.dev` serves
static files whole, so `functions/media/[[path]].js` (a Pages Function on `/media/*`) returns the
requested slice as 206. The smoke test checks ranges wherever it runs.

The render builds the site with `FILM_STAGE=1`, which adds render pages (`/film/<locale>/<layout>/`
and `/film/story/<layout>/`) that production builds never contain. Each of the six films (three
locales, wide 1920 × 1080 and tall 1080 × 1350 for phones) plays in headless Chromium at 30 fps,
split into three chunks per film that render side by side (every frame is a pure function of
time); the frames are encoded as H.264 (High, level 4.0, yuv420p, faststart, a keyframe every two
seconds) and VP9. Each film's poster is its first frame, so playback starts without a jump; the
home page's no-JavaScript stills come from the story scene at the end of act 3. Rendering uses
three.js and the Noto Sans SC and JP fonts, development dependencies that the site never loads.
`.film-build/render-manifest.json` records the settings, sizes and SHA-256 of each file.
Re-render after changing `src/lib/film.ts`, `FilmStage.astro`, `ControlPanel.astro` or the
film's copy, and `npm run assets` after the story scene changes.

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
after its windows return. Not verified: agent work with monitors physically switched off or the
Mac locked, power savings, long unattended runs, drag-and-drop moves, WeChat visual automation.
Virtual displays share the login session, keyboard, pointer and focus — the film never shows two
pointers at once. The film is a simulated demo of how the app works (including the drag-and-drop
moves its panel implements), not a recording of an agent at work: a label says so on screen
throughout and the caption says so too. WeChat appears only as one of your own apps. The build is Developer ID signed by CHEKUSU
and notarized by Apple, with the notarization ticket stapled to the app. This is website
distribution, not a Mac App Store release; macOS may still request confirmation on first launch.
It remains experimental software using private macOS APIs, arm64 only; macOS 14 is the deployment
target, not a compatibility guarantee. Don't add reviews, user counts, sponsors or benchmarks.

## Assets

**Third-party app icons.** Blender, Marvelous Designer, Google Chrome and WeChat appear with their
own icons, which belong to their owners. They are not covered by this repository's MIT license,
they only identify the apps, and their use implies no endorsement or partnership; follow each
owner's brand guidelines when reusing them. `npm run icons -- <folder>` reads `.icns` resources
copied unmodified from the installed apps (checked against a manifest of their SHA-256) and copies
the PNG representations inside them out byte for byte: nothing is redrawn, recoloured, cropped or
re-encoded, so transparency, outline and proportions are the apps' own. `public/apps/sources.json`
records each file's app, bundle identifier, bundle resource, `.icns` hash and PNG hash, and
`npm run verify` checks the published icons against it. There are no Codex or Grok logos anywhere:
Codex and GrokBot are screen names, written out as text.

**yomado's own marks.** The night-window app icon (in the Dock and the panel) and the menu bar
icon (only the inner window, as a single-colour template, traced from `app/MenuBarIcon.m`) come
from [chekusu/yomado](https://github.com/chekusu/yomado) under its MIT license.

**Everything else** is original to this repository under MIT: the scene, the film and its 3D dress,
and the control panel rebuilt in HTML from the app's 0.3.3 layout with example displays. The
Blender, Marvelous Designer and Chrome windows are simplified recreations with synthetic content;
no real desktops, documents, accounts, contacts or private data appear.

## License

MIT, see [LICENSE](LICENSE), except the third-party app icons in `public/apps/` (see Assets).
Bundled fonts keep their SIL Open Font License. Blender, Marvelous Designer, Google Chrome, WeChat,
Codex, GrokBot and macOS are names of their respective owners; their mention does not imply
endorsement.

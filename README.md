# yomado.app

The website for **yomado · 夜窗**, a native macOS virtual display for visual agents —
live at **[yomado.app](https://yomado.app)**.

> This repository is only the website. The app, its documentation and its releases live in
> **[chekusu/yomado](https://github.com/chekusu/yomado)**.

The page shows what yomado is for and gets the visitor to the real download, with as few words
as possible. yomado gives Codex and other visual agents a virtual display of their own, so they
can work in desktop apps through screenshots, mouse and keyboard while your windows stay on your
screen. It is not an agent, a remote desktop or an MCP replacement — it only supplies the display.

- 16 languages, the same as the film's subtitles: English at `/`; Simplified and Traditional
  Chinese, Japanese, Korean, Spanish, French, German, Italian, Brazilian Portuguese, Dutch, Polish,
  Turkish, Arabic (right to left), Hindi and Indonesian at `/zh-cn/`, `/zh-tw/`, `/ja/`, `/ko/`,
  `/es/`, `/fr/`, `/de/`, `/it/`, `/pt-br/`, `/nl/`, `/pl/`, `/tr/`, `/ar/`, `/hi/` and `/id/`. Each
  has the home page, install, checksum and requirements at `details/`, and the one-minute film with
  the browser's own controls at `watch/`: 48 pages
- A language menu in the header (and a list in the footer) links every page to the same page in
  the other languages and keeps the section in view
- The bare home page (`/`, or the `SITE_BASE` root) follows the browser: a valid `?lang=` first
  (read like a browser language: `?lang=pt-BR`, `?lang=zh-Hant`), then a language picked by hand
  from the menu or footer (remembered in `localStorage`), then the first supported entry of
  `navigator.languages`, then English. Chinese goes by script, then region: `zh-Hant`, `zh-TW`,
  `zh-HK` and `zh-MO` to Traditional, any other `zh` to Simplified; any Portuguese (`pt-PT` too)
  to Brazilian Portuguese. It moves with `location.replace`, keeping the query and hash. Every other
  page, in any language, never redirects, detection itself stores nothing, links to the English
  home carry `?lang=en` so the choice holds without storage, and canonical and `hreflang` URLs
  carry no query. Without JavaScript the home page stays English and the menu still works
- Every download button points at the configured GitHub Release archive
- `sitemap.xml`, `robots.txt`, per-language Open Graph cards, `hreflang` alternates, structured data

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
frame by frame in Chromium and encodes it with ffmpeg, and `npm run film:narrate` adds the
narration. Under reduced motion the film doesn't start by itself (the play and sound buttons and
the watch page still play all of it) and each act shows its finished state; without JavaScript the
film gets native controls, with its sound, and the story becomes stills.

### The film

Sixty seconds, six shots, labelled as a simulated demo throughout, and narrated: the approved
River voice-over in English and Simplified Chinese. There are three films, by the language of
their supers: English, Simplified Chinese and Japanese. The Japanese film keeps its Japanese supers
and has the English narration, and its caption and sound button say so (英語ナレーション); there is
no Japanese narration. Every website language shows the film its subtitles go with: both Chinese
the Chinese film with the Chinese narration, Japanese the Japanese film, every other language the
English film with the English narration, and the note under the film names the narration that
plays. Nothing is dubbed.

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

**Subtitles in 16 languages** (en, zh-CN, zh-TW, ja, ko, es, fr, de, it, pt-BR, nl, pl, tr, ar,
hi, id) follow the narration word for word in time: zh-CN and zh-TW the Chinese narration, the
other fourteen the English one; there are only those two voices. A subtitle language comes with
its film: zh-CN and zh-TW with the Chinese film, ja with the Japanese film, the rest with the
English film. The film's own titles, the panel being dragged and the typing sit near the bottom
of the frame, so subtitles keep off the picture: in the hero they read in a line under the film;
the watch page plays band masters (the picture at 86.67 % or 88.89 % above a night-blue band,
inside the same 1920 × 1080 or 1080 × 1350 frame) and the browser's own subtitle tracks read in
that band, also in full screen (while the browser shows its own controls it lifts them just above
the controls, which on a phone covers the bottom of the picture until the controls hide); and
each language has the film with its subtitles burned into that band, wide and tall, for sharing
as a file (`media/captioned/yomado-film-<tag>-<wide|tall>-c1.mp4`), plus WebVTT and SRT files
(`media/captions/`). Choosing a language that follows the other narration loads that narration's
film where the current one was, playing or paused, at its speed, with the sound as it was; the
note under the film says which narration plays.

Subtitles follow the website's language. Which ones a page starts with:

1. `?cc=<tag>` (or `?cc=off`) in the address asks for them; it is not remembered.
2. Else a choice made in a subtitle menu (the hero's, the watch page's or the browser's own) while
   on this same website language: it is kept in `localStorage` together with that language, so it
   holds on that language's other pages and after a reload. One choice is kept, the latest.
3. Else the website language's own subtitles, and with them its film, narration and downloads.

Picking a website language from the menu or the footer is a fresh start: it forgets the subtitle
choice, and the links carry no query, so a `?cc=` stays behind; the new page shows its own
subtitles, film, narration and downloads, also after a reload. A choice made in a menu takes `?cc=`
out of the address, so a reload keeps what is shown. A choice kept by an earlier version of the
site, without its language, is dropped. The browser's language only decides the website language,
on the bare home page. The translations, of the subtitles and of the website, are
machine-assisted and reviewed for meaning, not proofread by native speakers.

In the hero the film plays by itself only muted. Its sound button (named, keyboard-operable)
turns the narration on, the first time from the beginning so it is heard whole; the play and
replay buttons play it with sound too, unless it was muted by hand, and a mute holds. Leaving the
view or the tab pauses it; only a muted film resumes by itself. The watch page waits for a click
and plays with sound, with the browser's controls (their timeline runs left to right in Arabic
too). Under it, the chosen language's captioned MP4s, landscape and portrait, and its SRT are
offered as downloads: big buttons, one per line on phones, that link the file with `?download`.
`functions/media/[[path]].js` answers those addresses with `Content-Disposition: attachment` and
the file's name (`yomado-film-<tag>-<wide|tall>-c1.mp4`), so a phone saves the file instead of
opening a player; ranges and media types are the file's own, and the same file without
`?download` still plays inline. With subtitles off, the downloads are the films without them.

## Stack

[Astro](https://astro.build) and TypeScript, built to plain static files. No backend, analytics,
cookies, forms or third-party requests at runtime. Macs render the system font; elsewhere
[Inter](https://rsms.me/inter/) stands in, self-hosted from [Fontsource](https://fontsource.org)
(SIL OFL), with Fragment Mono for the checksum. Chinese text uses the reader's system CJK fonts.

```
site.config.json   canonical origin and the release the page offers (single source)
PRODUCT.md         confirmed design context
src/i18n/          all copy, per language (16 files), and the film's supers for en, zh-cn and ja
src/lib/site.ts    languages (paths, tags, direction, Open Graph locales, names, dates, sizes) and
                   release facts
src/lib/captions.ts  subtitle languages, and the film and narration each website language shows
src/pages/         English at the root; [locale]/ builds the same three pages for the other 15
src/lib/scene.ts   the story timeline: poses for every moment, in two layouts (wide, tall)
src/lib/film.ts    the film timeline: world, camera, pointer, panel, Blender, supers, end card
src/lib/apps.ts    the apps shown and their icons; panel.ts the panel's layout; media.ts the films
src/components/    Scene, FilmStage, ControlPanel, AppIcon, Hero + Film, Story, Panel, Finale,
                   DetailsPage, WatchPage
src/scripts/       scene-view, story, film (playback), film-view (poses the film), film-garment
                   (the film's 3D views, three.js)
src/assets/        the night-window app icon (from chekusu/yomado)
public/apps/       the apps' icons, extracted from their .icns, and sources.json (provenance)
public/media/      the film per locale (MP4 + WebM with narration, wide and tall, the version in
                   each name), posters, story stills
narration/         the narration, English and Simplified Chinese (AAC), as approved
captions/          subtitle text per language (<tag>.json), its timing per narration (timing.json,
                   from the approved script's character timings) and the language list (index.json)
public/            favicons and Open Graph cards, one per language (generated, committed)
functions/         a Pages Function for /media/ on Cloudflare: byte ranges, and ?download as an
                   attachment
scripts/           verify-dist.mjs, media-info.mjs, render-film.mjs, narrate-film.mjs,
                   caption-cues.mjs, caption-film.mjs, render-assets.mjs, extract-icons.mjs
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

The smoke test needs Playwright's Chromium (`npx playwright install chromium`). Locally it serves
`dist/` and runs `/media/` through the site's own Pages Function, as Cloudflare does. All 16
languages: home, details and watch in the language and its direction, metadata, `hreflang` for
all 16, Open Graph card, menu and footer links to the same page in every language, no overflow at
1440, 390 and 320 px with the download and the film in the first screen, a one-line header and a
menu that reaches all 16 on phones, the hero's film with its subtitles and audible narration, the
watch page's band master with its subtitles and sound, and its downloads (attachment, name, media
type, ranges, the plain address inline). Then: switching the website language from Chinese to
Korean, German and Arabic over an old subtitle choice, Off or `?cc=`, also after a reload; a choice
held within its website language; `?cc=`; an old stored choice dropped; real delayed media on a
German watch page (time, pause, speed, a seek to the start); the films saved as files by clicking
and tapping (English, Simplified and Traditional Chinese, Arabic); Arabic right to left (the
layout mirrored, the version and size lines, code and the video timeline in their own order). The
three languages with a film of their own in depth at 1440, 945, 834, 390 and 320 px: metadata
(hreflang, Open Graph locales), console errors, horizontal overflow, the download entry points,
the film (its real length and size, muted
inline autoplay, seeking into the middle and to the end, pause and replay, Tab, Enter and Space
with a visible focus ring, the portrait version on phones, reduced motion, the poster when no
source plays, and the media type and byte ranges of every film file), its narration (muted while
it plays by itself; the sound button by mouse and keyboard, from the beginning the first time, its
audio decoded; a mute that holds through scrolling, pausing and replay; nothing audible starting
by itself after scrolling back or a hidden tab; a refused or interrupted `play()` never undoing a
pause; phones and reduced motion), the watch page (the browser's controls with sound, seeking,
the end, the MP4 links, phones), the scroll story with the apps' own
icons and the finale, the language menu between every pair of locales on the home, details and
watch pages (with the section kept), the details page with checksum copy, the page without
JavaScript, the header on phones with classic scrollbars, 404, sitemap and robots.txt.
`SCREENSHOT_DIR=dir npm test` also saves screenshots.

`npm run verify` reads the film files themselves (`scripts/media-info.mjs`, no ffprobe needed):
55–65 s, 1920 × 1080 or 1080 × 1350, at least 30 fps, H.264 High 4.0 in yuv420p with `moov`
before `mdat` and AAC-LC at 48 kHz in the MP4, VP9 and Opus in the WebM, the audio as long as the
video and tagged with the locale's narration language, the codec strings the pages declare; each
video file under 10 MB, posters and stills under 200 kB. It fails if an internal render page, a
file of the old 16-second film or an earlier version of the film (such as the silent one) is
published, or if an app icon differs from `public/apps/sources.json`.

`npm test` then runs `tests/language.mjs` (also `npm run test:language`): first visits in each
of the 16 languages and their regional forms (`zh-HK`, `zh-Hant-HK`, `zh-Hans-HK`, `pt-PT`,
`es-419`, …), mixed and unsupported browser languages, `navigator.language` only when the list is
empty, `?lang=` (valid and not), query and hash kept, a remembered choice (over the browser's
language, never over an explicit page), every language's pages left alone, a website-language
switch leaving `?cc=` behind, English surviving a reload with storage blocked, and the page without
JavaScript. Each case runs in its own browser context with the languages replaced by an init
script.

`npm run test:download` clicks the hero download button on each language's home page in a real
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
npm run film:narrate                       # add the narration to the last render again
npm run film:captions                      # subtitle files, captioned exports and band masters
npm run film:captions -- --proof <dir>     # proof frames of chosen cues, before rendering
npm run assets                             # Open Graph cards and favicons (use the story still)
npm run assets -- ja ko                    # just the named cards (one per website language)
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
seconds) and VP9 into `.film-build/silent/`. `scripts/narrate-film.mjs` then adds the narration
from `narration/` (the Japanese film takes the English one) without touching the video: the MP4
gets the narration's AAC as it is, the WebM the same narration as Opus 96 kbps, with the inputs'
metadata dropped and the audio tagged with its language. The files are named with the version in
`src/lib/film-media.json`; raise it whenever the films change, so no browser or CDN keeps serving
an older file. Each film's poster is its first frame, so playback starts without a jump; the
home page's no-JavaScript stills come from the story scene at the end of act 3. Rendering uses
three.js and the Noto Sans SC and JP fonts, development dependencies that the site never loads.
`.film-build/render-manifest.json` records the settings, sizes and SHA-256 of each file.

Subtitles: `node scripts/caption-cues.mjs <alignment.json>` splits the approved narration script
(kept outside the repository, with a start and end for every character) into short phrases and
writes their timing to `captions/timing.json`: a cue runs from its first to its last spoken
character, may stay up to 0.6 s longer but never past the next cue, and a section's last cue ends
at that section's measured speech end. `npm run film:captions` writes the WebVTT (placed in the
band) and SRT files, sets every cue in Chromium on its band (Noto Sans SC, TC, JP, KR, Arabic and
Devanagari with Inter for Latin; at most two lines inside the band's safe area, checked) and has
ffmpeg scale the lossless frames, lay each band over its cue's window and copy the narration in,
for the 32 exports and the six band masters. `.film-build/captions-manifest.json` records every
file's hash and how each cue broke into lines.
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

All visible text lives in `src/i18n/<locale>.ts`, one file per website language; update all 16
together. In Chinese and Japanese titles, `|` marks where a line may break, so words are never
split. The app's own interface is Simplified Chinese only, and every language says so; the website
in 16 languages doesn't make the app multilingual. In Arabic, runs that read left to right on
their own (versions, file names, the size line) are isolated, and code, commands and checksums
read left to right. The website languages are the subtitle languages (`captions/index.json`) and
are defined in `src/lib/site.ts`; a new one also needs its copy, its subtitles, an Open Graph card
and a line in the tests. Only English, Simplified Chinese and Japanese have a film of their own
(`filmScript`); the film a language shows comes from its subtitles' entry.

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

**Narration.** The English and Simplified Chinese narration in `narration/` is the approved River
voice-over of the app's own narrated demos (`docs/media/yomado-en-river.mp4` and
`yomado-zh-cn-river.mp4` in chekusu/yomado): the wide MP4s here carry exactly those audio streams
over exactly the same video. It is the app owner's published product material, used here as part
of the film.

**Subtitle fonts.** The exports' subtitles are set in Inter and Noto Sans SC, TC, JP, KR, Arabic and
Devanagari (SIL Open Font License, from Fontsource, development dependencies only; the site itself
keeps the reader's system fonts).

**Everything else** is original to this repository under MIT: the scene, the film and its 3D dress,
and the control panel rebuilt in HTML from the app's 0.3.3 layout with example displays. The
Blender, Marvelous Designer and Chrome windows are simplified recreations with synthetic content;
no real desktops, documents, accounts, contacts or private data appear.

## License

MIT, see [LICENSE](LICENSE), except the third-party app icons in `public/apps/` (see Assets).
Bundled fonts keep their SIL Open Font License. Blender, Marvelous Designer, Google Chrome, WeChat,
Codex, GrokBot and macOS are names of their respective owners; their mention does not imply
endorsement.

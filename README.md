# yomado.app

The website for **yomado · 夜窗**, a native macOS virtual display for visual agents —
live at **[yomado.app](https://yomado.app)**.

> This repository is only the website. The app, its documentation and its releases live in
> **[chekusu/yomado](https://github.com/chekusu/yomado)**.

The page has one job: explain what yomado does, precisely, and get the visitor to the real
download. yomado gives Codex and other visual agents a virtual display, so they can operate
desktop apps through screenshots, mouse and keyboard without an app-specific MCP. It is not an
agent, a remote desktop or an MCP replacement — it only supplies the display.

- English at `/`, Simplified Chinese at `/zh-cn/`
- Every download button points at the configured GitHub Release archive
- `sitemap.xml`, `robots.txt`, per-locale Open Graph cards, `hreflang` alternates, structured data

## Stack

[Astro](https://astro.build) and TypeScript, built to plain static files. No backend, analytics,
cookies, forms or third-party requests at runtime. Fonts are self-hosted from
[Fontsource](https://fontsource.org) (SIL OFL): Spectral for display, Schibsted Grotesk for text,
Fragment Mono for technical details. Chinese text uses the reader's system CJK fonts.

```
site.config.json   canonical origin and the release the page offers (single source)
src/i18n/          all copy, per locale
src/components/    page sections; HeroScene is the animated illustration
src/lib/           config helpers, the night-window shape, CJK title breaking
src/assets/        app icon, control-panel render and concept illustration (from chekusu/yomado)
public/            favicons and Open Graph cards (generated, committed)
scripts/           verify-dist.mjs (static checks), render-assets.mjs (cards and icons)
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
npm run verify       # metadata, links, release URL, no private paths or credentials
npm test             # serves dist/ and runs the Playwright smoke test
npm run test:download
```

The smoke test needs Playwright's Chromium (`npx playwright install chromium`). It covers both
locales at desktop, tablet and phone widths: metadata, console errors, horizontal overflow, the
download entry points, FAQ, copying the checksum (and the selection fallback), language
switching, reduced motion, 404, sitemap and robots.txt. `SCREENSHOT_DIR=dir npm test` also
saves desktop and phone screenshots.

`npm run test:download` clicks the hero download button in a real browser and checks that the
file is the configured app archive: SHA-256, size, bundle identifier, version, build, minimum
macOS and an arm64 executable.

Both tests run against a deployed copy too:

```sh
BASE_URL=https://yomado.app/ npm test
BASE_URL=https://yomado.app/ npm run test:download
```

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

Pushes to `main` run `.github/workflows/deploy.yml`: check, build, verify and the smoke test,
then `wrangler pages deploy dist` to the Cloudflare Pages project `yomado-dev`, which serves
`yomado.app` and `www.yomado.app`. The deploy step runs only where Cloudflare credentials are
available and is skipped elsewhere, so forks and pull requests just build and test.

`dist/` works on any static host. Serve `dist/404.html` for missing paths.

## Copy and claims

All visible text lives in `src/i18n/{en,zh-cn}.ts`; update both together. In Chinese titles, `|`
marks where a line may break, so words are never split.

Keep claims inside the app's README and release notes. Verified: the native Apple Silicon build;
moving Calculator into virtual screens named Codex and GrokBot through the panel's app menu, a
fresh screenshot, keyboard input, returning it to its original place, and closing a single screen
after its windows return. Not verified: agent work with monitors physically switched off, power
savings, long unattended runs, drag-and-drop moves, WeChat visual automation. Virtual displays
share the login session, keyboard, pointer and focus. The build is ad hoc signed, not notarized,
arm64 only; macOS 14 is the deployment target, not a compatibility guarantee. Don't add reviews,
user counts, sponsors or benchmarks.

## Assets

The night-window app icon, the concept illustration (AI-generated, cropped to drop an earlier
logo) and the control-panel render (drawn by the app with example display data) come from
[chekusu/yomado](https://github.com/chekusu/yomado) under its MIT license. The concept image is
captioned as an illustration everywhere it appears.

## License

MIT, see [LICENSE](LICENSE). Bundled fonts keep their SIL Open Font License. Codex, GrokBot,
Blender, Marvelous Designer and macOS are names of their respective owners; their mention does not
imply endorsement.

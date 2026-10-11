// @ts-check
import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';

const config = JSON.parse(readFileSync(new URL('./site.config.json', import.meta.url), 'utf8'));

// The canonical origin lives in site.config.json; SITE_URL overrides it for one build.
const site = (process.env.SITE_URL || config.siteUrl).replace(/\/+$/, '');

// Production builds live at the domain root. Path-mounted previews set SITE_BASE.
const rawBase = process.env.SITE_BASE ?? '/';
const base = rawBase === '/' ? '/' : `/${rawBase.replace(/^\/+|\/+$/g, '')}/`;

export default defineConfig({
  site,
  base,
  outDir: process.env.SITE_OUT_DIR ?? './dist',
  trailingSlash: 'ignore',
  build: { format: 'directory', inlineStylesheets: 'auto' },
  devToolbar: { enabled: false },
  server: { host: '127.0.0.1' },
});

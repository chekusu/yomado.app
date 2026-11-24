import type { APIRoute } from 'astro';
import { GUIDES_UPDATED, GUIDE_LOCALES, GUIDE_ROUTES } from '../lib/guides';
import { LOCALES, LOCALE_PATH, LOCALE_TAG, canonical, type Locale } from '../lib/site';

// Home, the download details and the film exist once per locale; the guides in three of them.
// Only the guides carry a date: when they were last checked. The app's release date is not a
// page's date, so the other pages go without one.
const PAGES: { route: string; locales: readonly Locale[]; lastmod?: string }[] = [
  ...['', 'details/', 'watch/'].map((route) => ({ route, locales: LOCALES })),
  ...Object.values(GUIDE_ROUTES).map((route) => ({ route, locales: GUIDE_LOCALES, lastmod: GUIDES_UPDATED })),
];

export const GET: APIRoute = () => {
  const urls = PAGES.flatMap(({ route, locales, lastmod }) => {
    const alternates = locales
      .map((l) => `    <xhtml:link rel="alternate" hreflang="${LOCALE_TAG[l]}" href="${canonical(LOCALE_PATH[l] + route)}"/>`)
      .join('\n');
    return locales.map(
      (l) => `  <url>
    <loc>${canonical(LOCALE_PATH[l] + route)}</loc>
${lastmod ? `    <lastmod>${lastmod}</lastmod>\n` : ''}${alternates}
    <xhtml:link rel="alternate" hreflang="x-default" href="${canonical(route)}"/>
  </url>`,
    );
  }).join('\n');
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
};

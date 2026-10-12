import type { APIRoute } from 'astro';
import { LOCALES, LOCALE_PATH, LOCALE_TAG, RELEASE, canonical } from '../lib/site';

// Every page exists once per locale: home, the download details and the film.
const ROUTES = ['', 'details/', 'watch/'];

export const GET: APIRoute = () => {
  const urls = ROUTES.flatMap((route) => {
    const alternates = LOCALES.map(
      (l) => `    <xhtml:link rel="alternate" hreflang="${LOCALE_TAG[l]}" href="${canonical(LOCALE_PATH[l] + route)}"/>`,
    ).join('\n');
    return LOCALES.map(
      (l) => `  <url>
    <loc>${canonical(LOCALE_PATH[l] + route)}</loc>
    <lastmod>${RELEASE.publishedAt}</lastmod>
${alternates}
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

import type { APIRoute } from 'astro';
import { canonical } from '../lib/site';

export const GET: APIRoute = () => {
  const body =
    process.env.SITE_NOINDEX === '1'
      ? 'User-agent: *\nDisallow: /\n'
      : `User-agent: *\nAllow: /\n\nSitemap: ${canonical('sitemap.xml')}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};

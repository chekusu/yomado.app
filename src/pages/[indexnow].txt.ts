import type { APIRoute } from 'astro';
import { SITE } from '../lib/site';

// The IndexNow key file (https://www.indexnow.org): proves to Bing and the other IndexNow search
// engines that scripts/indexnow.mjs speaks for this site. The key is public by design.
export const getStaticPaths = () => [{ params: { indexnow: SITE.indexNowKey } }];

export const GET: APIRoute = () => new Response(SITE.indexNowKey, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

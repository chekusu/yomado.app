// Cloudflare Pages Function for /media/*: answers byte-range requests.
//
// Pages serves static files whole, but Safari plays video only from servers that honour
// `Range` (it starts with `bytes=0-1`), and every browser needs ranges to seek. This passes
// each request to the static file and, when a single range was asked for, returns that slice
// as 206 Partial Content. Everything else is passed through untouched.

const RANGE = /^bytes=(\d*)-(\d*)$/;

/** @param {{ request: Request, next: () => Promise<Response> }} context */
export async function onRequest({ request, next }) {
  const response = await next();
  const range = request.headers.get('Range');
  if (!range || (request.method !== 'GET' && request.method !== 'HEAD') || response.status !== 200) return response;

  const match = RANGE.exec(range.trim());
  if (!match || (!match[1] && !match[2])) return response;

  const body = await response.arrayBuffer();
  const size = body.byteLength;
  const start = match[1] ? Number(match[1]) : Math.max(size - Number(match[2]), 0);
  const end = match[1] && match[2] ? Math.min(Number(match[2]), size - 1) : size - 1;

  const headers = new Headers(response.headers);
  headers.set('Accept-Ranges', 'bytes');
  if (start >= size || start > end) {
    headers.set('Content-Range', `bytes */${size}`);
    headers.delete('Content-Length');
    return new Response(null, { status: 416, headers });
  }
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(end - start + 1));
  return new Response(request.method === 'HEAD' ? null : body.slice(start, end + 1), { status: 206, headers });
}

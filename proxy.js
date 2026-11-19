/**
 * Vercel Routing Middleware: reverse proxy for the PHP API.
 *
 * The SPA is deployed as static files on Vercel. PHP and SQLite cannot run
 * durably on Vercel, so the API lives on a persistent host (Render, Railway,
 * Fly.io, or a VPS). Requests to /api/* are forwarded from the Vercel domain
 * to that host, which keeps the browser talking to a single origin and keeps
 * the httpOnly session cookie host-only for the public domain.
 *
 * Configure the backend origin with the MERIDIAN_API_ORIGIN environment
 * variable, for example: https://meridian-academy-api.onrender.com
 *
 * See docs/deployment.md. Limits: Vercel Routing Middleware accepts request
 * bodies up to 4 MB, so document uploads larger than that must be sent to the
 * API host directly or the SPA must be served by the API host itself.
 */

const HOP_BY_HOP_HEADERS = [
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
];

function jsonError(status, code, message) {
  return new Response(
    JSON.stringify({ error: { code, messageKey: 'errors.network', message } }),
    {
      status,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    },
  );
}

function apiOrigin() {
  const raw = (process.env.MERIDIAN_API_ORIGIN || '').trim().replace(/\/+$/, '');

  if (raw === '') {
    return null;
  }

  try {
    const origin = new URL(raw);

    if (origin.protocol !== 'https:' && origin.protocol !== 'http:') {
      return null;
    }

    return origin;
  } catch {
    return null;
  }
}

export default async function proxy(request) {
  const incoming = new URL(request.url);
  const origin = apiOrigin();

  if (origin === null) {
    return jsonError(
      503,
      'api_unreachable',
      'The API origin is not configured. Set MERIDIAN_API_ORIGIN in the Vercel project environment variables.',
    );
  }

  const target = new URL(origin.toString());
  target.pathname = `${origin.pathname.replace(/\/$/, '')}${incoming.pathname}`;
  target.search = incoming.search;

  const headers = new Headers(request.headers);

  for (const name of HOP_BY_HOP_HEADERS) {
    headers.delete(name);
  }

  // The body is re-sent by fetch, which recomputes length and encoding.
  headers.delete('content-length');
  headers.delete('accept-encoding');
  headers.delete('host');

  const forwardedFor = request.headers.get('x-forwarded-for') || '';
  const clientIp =
    (request.headers.get('x-real-ip') || '').trim() ||
    forwardedFor.split(',')[0].trim() ||
    (request.headers.get('x-vercel-forwarded-for') || '').split(',')[0].trim();

  headers.set('x-forwarded-host', incoming.host);
  headers.set('x-forwarded-proto', request.headers.get('x-forwarded-proto') || incoming.protocol.replace(':', ''));

  if (clientIp !== '') {
    headers.set('x-forwarded-for', clientIp);
    headers.set('x-real-ip', clientIp);
  }

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
    cache: 'no-store',
    signal: AbortSignal.timeout(30_000),
  };

  if (request.method !== 'GET' && request.method !== 'HEAD' && request.body !== null) {
    init.body = request.body;
    init.duplex = 'half';
  }

  let upstream;

  try {
    upstream = await fetch(target, init);
  } catch (error) {
    console.error('API proxy failed', error);

    return jsonError(
      502,
      'api_unreachable',
      'The school server could not be reached. Check that the API host is running.',
    );
  }

  const responseHeaders = new Headers();
  const cookies =
    typeof upstream.headers.getSetCookie === 'function'
      ? upstream.headers.getSetCookie()
      : [];

  if (cookies.length === 0) {
    const cookie = upstream.headers.get('set-cookie');

    if (cookie) {
      cookies.push(cookie);
    }
  }

  upstream.headers.forEach((value, name) => {
    const key = name.toLowerCase();

    if (
      key === 'set-cookie' ||
      key === 'content-length' ||
      key === 'content-encoding' ||
      HOP_BY_HOP_HEADERS.includes(key)
    ) {
      return;
    }

    responseHeaders.set(key, value);
  });

  for (const cookie of cookies) {
    responseHeaders.append('set-cookie', cookie);
  }

  const location = responseHeaders.get('location');

  if (location && location.startsWith(origin.origin)) {
    responseHeaders.set('location', location.slice(origin.origin.length) || '/');
  }

  const body =
    upstream.status === 204 || upstream.status === 205 || upstream.status === 304
      ? null
      : upstream.body;

  return new Response(body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

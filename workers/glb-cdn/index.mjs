const B2_ORIGIN = 'https://s3.us-east-005.backblazeb2.com';
const SIGNING_REGION = 'us-east-005';
const BUCKET = 'aetherbow-assets';
const CONTENT_HASH = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
const CACHE_CONTROL = 'public, max-age=86400';
const MAP_CHUNK_BYTES = 6 * 1024 * 1024;
const CHAPTER_1_MAP = '/assets/Chương 1/Map mới/Chương 1.glb';
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, HEAD, OPTIONS',
  'access-control-allow-headers': 'Range',
  'access-control-expose-headers': 'Content-Length, Content-Range, Accept-Ranges, ETag',
};
const utf8 = new TextEncoder();

function encodeS3Segment(value) {
  return encodeURIComponent(value).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function getObjectPath(url) {
  let segments;
  try {
    segments = url.pathname.slice(1).split('/').map(decodeURIComponent);
  } catch {
    return undefined;
  }
  if (
    segments.length < 2 || segments[0] !== 'assets' ||
    !segments.at(-1).toLowerCase().endsWith('.glb') ||
    segments.some((segment) => !segment || segment === '.' || segment === '..' ||
      segment.includes('/') || segment.includes('\\') ||
      [...segment].some((char) => char.charCodeAt(0) < 32 || char.charCodeAt(0) === 127))
  ) return undefined;

  return { encoded: `/${segments.map(encodeS3Segment).join('/')}`, decoded: `/${segments.join('/')}` };
}

function hex(bytes) {
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function hmac(key, value) {
  const imported = await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return crypto.subtle.sign('HMAC', imported, utf8.encode(value));
}

export async function signB2Download(url, method, keyId, applicationKey, now = new Date()) {
  const dateTime = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const day = dateTime.slice(0, 8);
  const scope = `${day}/${SIGNING_REGION}/s3/aws4_request`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalHeaders = `host:${url.host}\nx-amz-content-sha256:${CONTENT_HASH}\nx-amz-date:${dateTime}\n`;
  const canonicalRequest = [method, url.pathname, '', canonicalHeaders, signedHeaders, CONTENT_HASH].join('\n');
  const canonicalHash = hex(await crypto.subtle.digest('SHA-256', utf8.encode(canonicalRequest)));
  const stringToSign = ['AWS4-HMAC-SHA256', dateTime, scope, canonicalHash].join('\n');
  const dateKey = await hmac(utf8.encode(`AWS4${applicationKey}`), day);
  const regionKey = await hmac(dateKey, SIGNING_REGION);
  const serviceKey = await hmac(regionKey, 's3');
  const signingKey = await hmac(serviceKey, 'aws4_request');
  const signature = hex(await hmac(signingKey, stringToSign));

  return new Headers({
    authorization: `AWS4-HMAC-SHA256 Credential=${keyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    'x-amz-content-sha256': CONTENT_HASH,
    'x-amz-date': dateTime,
  });
}

function cacheRequest(url, objectPath, method, range) {
  if (method !== 'GET') return undefined;
  const key = new URL(objectPath.encoded, url.origin);
  const version = url.searchParams.get('v');
  if (version && /^\d{1,12}$/.test(version)) key.searchParams.set('v', version);
  if (range) {
    // Cache the fixed ranges used by the game. Other ranges can be streamed on demand.
    if (objectPath.decoded !== CHAPTER_1_MAP) return undefined;
    const [, start, end] = range.match(/^bytes=(\d+)-(\d+)$/) ?? [];
    if (!start || Number(start) % MAP_CHUNK_BYTES !== 0 ||
      Number(end) < Number(start) || Number(end) - Number(start) >= MAP_CHUNK_BYTES) return undefined;
    key.searchParams.set('range', range);
  }
  return new Request(key);
}

function error(message, status, extraHeaders) {
  return new Response(message, {
    status, headers: { ...CORS, 'cache-control': 'no-store', ...extraHeaders },
  });
}

export default {
  async fetch(request, env, context) {
    const url = new URL(request.url);
    const objectPath = getObjectPath(url);
    if (!objectPath) return error('Not found', 404);
    const method = request.method;
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...CORS, 'access-control-max-age': '3600' } });
    }
    if (method !== 'GET' && method !== 'HEAD') {
      return error('Method not allowed', 405, { allow: 'GET, HEAD, OPTIONS' });
    }

    const range = method === 'GET' ? request.headers.get('range') : null;
    if (range && !/^bytes=(?:\d{1,12}-\d{0,12}|-\d{1,12})$/.test(range)) {
      return error('Invalid range', 416);
    }

    const cache = globalThis.caches?.default;
    const key = cache && cacheRequest(url, objectPath, method, range);
    if (key) {
      const hit = await cache.match(key).catch(() => undefined);
      if (hit) {
        const headers = new Headers(hit.headers);
        const cachedRange = headers.get('x-glb-cached-range');
        headers.delete('x-glb-cached-range');
        if (cachedRange) headers.set('content-range', cachedRange);
        return new Response(hit.body, { status: cachedRange ? 206 : 200, headers });
      }
    }

    const keyId = env.B2_READ_KEY_ID?.trim();
    const applicationKey = env.B2_READ_APPLICATION_KEY?.trim();
    if (!keyId || !applicationKey) return error('Asset origin is not configured', 503);

    const upstreamUrl = new URL(`/${BUCKET}${objectPath.encoded}`, B2_ORIGIN);
    let upstream;
    try {
      const headers = await signB2Download(upstreamUrl, method, keyId, applicationKey);
      if (range) headers.set('range', range);
      upstream = await fetch(upstreamUrl.href, { method, headers, redirect: 'manual' });
    } catch {
      return error('Asset origin unavailable', 502);
    }
    if (upstream.status !== 200 && upstream.status !== 206) {
      await upstream.body?.cancel();
      if (upstream.status === 404) return error('Not found', 404);
      if (upstream.status === 416) {
        const contentRange = upstream.headers.get('content-range');
        return error('Range not satisfiable', 416, contentRange ? { 'content-range': contentRange } : undefined);
      }
      return error('Asset origin unavailable', 502);
    }

    const responseHeaders = new Headers({
      ...CORS, 'content-type': 'model/gltf-binary', 'cache-control': CACHE_CONTROL,
    });
    for (const name of ['content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) {
      const value = upstream.headers.get(name);
      if (value !== null) responseHeaders.set(name, value);
    }
    const response = new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
    if (key && (range ? response.status === 206 : response.status === 200)) {
      const copy = response.clone();
      const cacheHeaders = new Headers(copy.headers);
      const contentRange = cacheHeaders.get('content-range');
      // The Cache API only accepts 200. Keep the range key and metadata internally.
      if (contentRange) {
        cacheHeaders.delete('content-range');
        cacheHeaders.set('x-glb-cached-range', contentRange);
      }
      context.waitUntil(cache.put(key, new Response(copy.body, { headers: cacheHeaders })).catch(() => {}));
    }
    return response;
  },
};

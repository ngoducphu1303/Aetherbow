import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import test from 'node:test';
import worker, { signB2Download } from '../workers/glb-cdn/index.mjs';

test('private B2 signature covers the exact encoded object path', async () => {
  const url = new URL('https://s3.us-east-005.backblazeb2.com/aetherbow-assets/assets/Ch%C6%B0%C6%A1ng%201/file.glb');
  const date = '20261123T080000Z';
  const scope = '20261123/us-east-005/s3/aws4_request';
  const hash = (data) => createHash('sha256').update(data).digest('hex');
  const hmac = (key, data) => createHmac('sha256', key).update(data).digest();
  const empty = hash('');
  const canonical = `GET\n${url.pathname}\n\nhost:${url.host}\nx-amz-content-sha256:${empty}\nx-amz-date:${date}\n\nhost;x-amz-content-sha256;x-amz-date\n${empty}`;
  const key = hmac(hmac(hmac(hmac('AWS4test-secret', '20261123'), 'us-east-005'), 's3'), 'aws4_request');
  const expected = hmac(key, `AWS4-HMAC-SHA256\n${date}\n${scope}\n${hash(canonical)}`).toString('hex');
  const headers = await signB2Download(url, 'GET', 'test-key', 'test-secret', new Date('2026-11-23T08:00:00Z'));

  assert.equal(headers.get('x-amz-date'), date);
  assert.equal(headers.get('authorization'),
    `AWS4-HMAC-SHA256 Credential=test-key/${scope}, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=${expected}`);
});

test('private CDN streams, caches and restores range responses without exposing origin credentials', async (t) => {
  const items = new Map();
  const previousCaches = globalThis.caches;
  globalThis.caches = { default: {
    match: async (request) => items.get(request.url)?.clone(),
    put: async (request, response) => items.set(request.url, response),
  } };
  t.after(() => { globalThis.caches = previousCaches; });
  const pending = [];
  const context = { waitUntil: (work) => pending.push(work) };
  const upstream = t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(new URL(url).href,
      'https://s3.us-east-005.backblazeb2.com/aetherbow-assets/assets/Ch%C6%B0%C6%A1ng%201/Map%20m%E1%BB%9Bi/Ch%C6%B0%C6%A1ng%201.glb');
    assert.match(options.headers.get('authorization'), /^AWS4-HMAC-SHA256 Credential=test-key\//);
    assert.equal(options.redirect, 'manual');
    if (options.method === 'HEAD') {
      return new Response(null, { headers: { 'content-length': '40' } });
    }
    assert.equal(options.headers.get('range'), 'bytes=0-11');
    return new Response('glTF01234567', { status: 206, headers: {
      'content-range': 'bytes 0-11/40', 'content-length': '12', authorization: 'internal',
    } });
  });
  const env = { B2_READ_KEY_ID: 'test-key\r\n', B2_READ_APPLICATION_KEY: 'test-secret\n' };
  const url = 'https://aetherbow-glb.example.workers.dev/assets/Chương 1/Map mới/Chương 1.glb?v=2';
  const request = () => new Request(url, { headers: { range: 'bytes=0-11' } });

  assert.equal((await worker.fetch(new Request(url, { method: 'OPTIONS' }), env, context)).status, 204);
  assert.equal((await worker.fetch(new Request(url, { method: 'PUT' }), env, context)).status, 405);
  assert.equal((await worker.fetch(new Request('https://cdn.example/assets/sub%2Ffile.glb'), env, context)).status, 404);
  assert.equal((await worker.fetch(new Request('https://cdn.example/assets/thumbnail.webp'), env, context)).status, 404);
  const first = await worker.fetch(request(), env, context);
  assert.equal(first.status, 206);
  assert.equal(first.headers.get('access-control-allow-origin'), '*');
  assert.equal(first.headers.get('content-range'), 'bytes 0-11/40');
  assert.equal(first.headers.get('authorization'), null);
  assert.equal(await first.text(), 'glTF01234567');
  await Promise.all(pending);

  const cached = await worker.fetch(request(), env, context);
  assert.equal(cached.status, 206);
  assert.equal(cached.headers.get('x-glb-cached-range'), null);
  assert.equal(cached.headers.get('content-range'), 'bytes 0-11/40');
  assert.equal(await cached.text(), 'glTF01234567');
  assert.equal(upstream.mock.callCount(), 1);

  const head = await worker.fetch(new Request(url, { method: 'HEAD' }), env, context);
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-length'), '40');
  assert.equal(head.body, null);
});

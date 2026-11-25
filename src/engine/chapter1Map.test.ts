import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import * as THREE from 'three';
import {
  CHAPTER1_MAP_FLOOR_OFFSET_Y,
  CHAPTER1_MAP_LITE_PATH_SEGMENTS,
  CHAPTER1_MAP_LITE_VERSION,
  CHAPTER1_MAP_PATH_SEGMENTS,
  CHAPTER1_MAP_VERSION,
  fetchChapter1MapArrayBuffer,
  getChapter1MapAssetUrl,
  getChapter1MapLiteAssetUrl,
  prepareChapter1MapModel,
} from './chapter1Map';
import { assertValidGlbAssetOrManifest } from './testGlbManifestHelper';

test('Chapter 1 GLB map encodes URL segments safely and has an intact GLB on disk or CDN manifest (full or Lite fallback)', () => {
  const fullPath = path.resolve(process.cwd(), 'public', ...CHAPTER1_MAP_PATH_SEGMENTS);
  const litePath = path.resolve(process.cwd(), 'public', ...CHAPTER1_MAP_LITE_PATH_SEGMENTS);
  const resolved = fs.existsSync(fullPath)
    ? assertValidGlbAssetOrManifest(fullPath)
    : assertValidGlbAssetOrManifest(litePath, { requireRuntime: true });

  const url = getChapter1MapAssetUrl('/', 'http://127.0.0.1:3000/');
  assert.equal(
    url.pathname,
    '/assets/Ch%C6%B0%C6%A1ng%201/Map%20m%E1%BB%9Bi/Ch%C6%B0%C6%A1ng%201.glb'
  );
  assert.equal(url.searchParams.get('v'), CHAPTER1_MAP_VERSION);
  if (resolved.absPath === fullPath) {
    assert.equal(resolved.size, 94_747_964, 'Original 90.3 MB Chương 1.glb must remain uncompressed');
  } else {
    assert.ok(resolved.size > 100_000 && resolved.size < 5 * 1024 * 1024, 'Fallback Lite GLB must be valid and compact');
  }
});

test('Chapter 1 Lite GLB exists intact on disk or CDN manifest, stays lightweight (< 5 MB), and preserves canonical scale', () => {
  const absPath = path.resolve(process.cwd(), 'public', ...CHAPTER1_MAP_LITE_PATH_SEGMENTS);
  const resolved = assertValidGlbAssetOrManifest(absPath, { maxBytes: 5 * 1024 * 1024, requireRuntime: true });

  if (resolved.source === 'disk') {
    const buf = fs.readFileSync(absPath);
    const jsonLen = buf.readUInt32LE(12);
    const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
    const prim = gltf.meshes[0].primitives[0];
    const idxAcc = gltf.accessors[prim.indices];
    const posAcc = gltf.accessors[prim.attributes.POSITION];
    const triCount = idxAcc.count / 3;
    assert.ok(
      triCount >= 20_000 && triCount <= 40_000,
      `Expected Lite triangle count around 30k, got ${triCount}`
    );
    assert.equal(gltf.images.length, 1, 'Lite GLB should embed only 1 BaseColor albedo image');
    assert.equal(gltf.images[0].mimeType, 'image/jpeg');
    assert.equal(
      Boolean(gltf.extensionsUsed?.includes('KHR_materials_specular')),
      false,
      'Lite GLB should use lightweight MeshStandardMaterial without KHR_materials_specular'
    );
    assert.ok(posAcc.min[0] < -0.58 && posAcc.max[0] > 0.58);
    assert.ok(posAcc.min[1] < -0.58 && posAcc.max[1] > 0.59);
  }

  const url = getChapter1MapLiteAssetUrl('/', 'http://127.0.0.1:3000/');
  assert.equal(
    url.pathname,
    '/assets/Ch%C6%B0%C6%A1ng%201/Map%20m%E1%BB%9Bi/Ch%C6%B0%C6%A1ng%201%20Lite.glb'
  );
  assert.equal(url.searchParams.get('v'), CHAPTER1_MAP_LITE_VERSION);
});

test('prepareChapter1MapModel calibrates canonical Chương 1.glb bounds, floor elevation, and shadow flags', () => {
  // Synthetic replica matching exact Chương 1.glb dimensions after +90deg X rotation:
  // X in [-0.592, 0.594], Y in [0, 0.4783], Z in [-0.592, 0.605]
  const root = new THREE.Group();
  const geo = new THREE.BoxGeometry(1.186, 0.4783, 1.197);
  geo.translate(0.001, 0.4783 / 2, 0.0064);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const mesh = new THREE.Mesh(geo, mat);
  root.add(mesh);

  const prepared = prepareChapter1MapModel(root, 16);
  assert.ok(prepared.scale > 34 && prepared.scale < 36.5, `Unexpected scale: ${prepared.scale}`);
  // Outer bounds must generously surround the playable arena (±10.5 x ±12.2)
  assert.ok(prepared.bounds.min.x < -19 && prepared.bounds.max.x > 19);
  assert.ok(prepared.bounds.min.z < -19 && prepared.bounds.max.z > 19);
  // Floor surface at raw y=0.2755 should sit at CHAPTER1_MAP_FLOOR_OFFSET_Y (-0.02)
  const expectedTopY = (0.4783 - 0.2755) * prepared.scale + CHAPTER1_MAP_FLOOR_OFFSET_Y;
  assert.ok(
    Math.abs(prepared.bounds.max.y - expectedTopY) < 0.05,
    `Expected top Y near ${expectedTopY}, got ${prepared.bounds.max.y}`
  );
  assert.equal(mesh.receiveShadow, true);
  assert.equal(mesh.castShadow, false);
});

test('fetchChapter1MapArrayBuffer reassembles multi-chunk API payload byte-for-byte under 8 MiB per request', async () => {
  const payload = new Uint8Array(2_500_000);
  for (let i = 0; i < payload.length; i++) {
    payload[i] = (i * 31 + 7) & 0xff;
  }
  const chunkRequests: Array<{ start: number; end: number }> = [];
  const fakeFetch: typeof fetch = async (input) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.pathname === '/api/assets/chapter1-map/meta') {
      return new Response(
        JSON.stringify({ size: payload.byteLength, chunkSize: 1_048_576, etag: '"test"' }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      );
    }
    if (url.pathname === '/api/assets/chapter1-map/chunk') {
      const start = Number(url.searchParams.get('start'));
      const end = Number(url.searchParams.get('end'));
      chunkRequests.push({ start, end });
      return new Response(payload.slice(start, end + 1), {
        status: 200,
        headers: { 'content-type': 'application/octet-stream' },
      });
    }
    return new Response('Not found', { status: 404 });
  };

  const progressEvents: Array<[number, number]> = [];
  const buffer = await fetchChapter1MapArrayBuffer({
    baseUrl: '/',
    baseUri: 'http://127.0.0.1:3000/',
    concurrency: 2,
    fetchImpl: fakeFetch,
    onProgress: (loaded, total) => progressEvents.push([loaded, total]),
  });

  assert.equal(chunkRequests.length, 3);
  const out = new Uint8Array(buffer);
  assert.equal(out.byteLength, payload.byteLength);
  assert.deepEqual(out, payload);
  assert.deepEqual(progressEvents.at(-1), [payload.byteLength, payload.byteLength]);
});

test('fetchChapter1MapArrayBuffer streams incremental progress mid-chunk and recovers cleanly from transient Range failures', async () => {
  const totalSize = 7_000_000; // > 6 MiB so it spans 2 HTTP Range requests
  const payload = new Uint8Array(totalSize);
  for (let i = 0; i < payload.length; i += 4096) {
    payload[i] = (i / 4096) & 0xff;
  }

  let secondRangeAttempts = 0;
  const makeChunkedStream = (slice: Uint8Array, pieces: number, failHalfway = false) =>
    new ReadableStream<Uint8Array>({
      start(controller) {
        const step = Math.ceil(slice.byteLength / pieces);
        for (let i = 0; i < pieces; i++) {
          if (failHalfway && i === Math.floor(pieces / 2)) {
            controller.error(new Error('Simulated transient TCP reset'));
            return;
          }
          const from = i * step;
          const to = Math.min(slice.byteLength, from + step);
          if (from < to) {
            controller.enqueue(slice.slice(from, to));
          }
        }
        controller.close();
      },
    });

  const fakeFetch: typeof fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    if (url.pathname.startsWith('/api/assets/chapter1-map/')) {
      return new Response('Not Found', { status: 404 });
    }
    const rangeHeader =
      init?.headers && !Array.isArray(init.headers)
        ? (init.headers as Record<string, string>).Range ||
          (init.headers as Record<string, string>).range
        : undefined;
    const match = rangeHeader?.match(/^bytes=(\d+)-(\d+)$/);
    assert.ok(match, `Expected Range header, got ${String(rangeHeader)}`);
    const start = Number(match[1]);
    const end = Math.min(totalSize - 1, Number(match[2]));
    const slice = payload.slice(start, end + 1);
    if (start > 0) {
      secondRangeAttempts += 1;
      if (secondRangeAttempts === 1) {
        return new Response(makeChunkedStream(slice, 4, true), {
          status: 206,
          headers: {
            'content-type': 'model/gltf-binary',
            'content-range': `bytes ${start}-${end}/${totalSize}`,
          },
        });
      }
    }
    return new Response(makeChunkedStream(slice, 4, false), {
      status: 206,
      headers: {
        'content-type': 'model/gltf-binary',
        'content-range': `bytes ${start}-${end}/${totalSize}`,
      },
    });
  };

  const progressEvents: Array<[number, number]> = [];
  const buffer = await fetchChapter1MapArrayBuffer({
    baseUrl: '/',
    baseUri: 'http://127.0.0.1:3000/',
    concurrency: 2,
    fetchImpl: fakeFetch,
    onProgress: (loaded, total) => progressEvents.push([loaded, total]),
  });

  assert.equal(secondRangeAttempts, 2, 'Second 6 MiB range should recover on retry');
  // Streaming must emit multiple intermediate progress updates inside chunks (well above 2 chunk completions)
  assert.ok(progressEvents.length >= 8, `Expected incremental streamed progress, got ${progressEvents.length} events`);
  assert.deepEqual(progressEvents.at(-1), [totalSize, totalSize]);
  const out = new Uint8Array(buffer);
  assert.equal(out.byteLength, totalSize);
  for (let i = 0; i < totalSize; i += 4096) {
    assert.equal(out[i], payload[i], `Byte mismatch at offset ${i}`);
  }
});

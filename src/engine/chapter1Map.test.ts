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

test('Chapter 1 GLB map encodes URL segments safely and has an intact GLB on disk (full or Lite fallback)', () => {
  const fullPath = path.resolve(process.cwd(), 'public', ...CHAPTER1_MAP_PATH_SEGMENTS);
  const litePath = path.resolve(process.cwd(), 'public', ...CHAPTER1_MAP_LITE_PATH_SEGMENTS);
  const targetPath = fs.existsSync(fullPath) ? fullPath : litePath;
  assert.ok(fs.existsSync(targetPath), `Missing Chapter 1 map GLB at ${fullPath} and ${litePath}`);

  const header = Buffer.alloc(12);
  const fd = fs.openSync(targetPath, 'r');
  try {
    fs.readSync(fd, header, 0, 12, 0);
  } finally {
    fs.closeSync(fd);
  }
  const stat = fs.statSync(targetPath);
  assert.equal(header.toString('ascii', 0, 4), 'glTF');
  assert.equal(header.readUInt32LE(4), 2);
  assert.equal(header.readUInt32LE(8), stat.size);

  const url = getChapter1MapAssetUrl('/', 'http://127.0.0.1:3000/');
  assert.equal(
    url.pathname,
    '/assets/Ch%C6%B0%C6%A1ng%201/Map%20m%E1%BB%9Bi/Ch%C6%B0%C6%A1ng%201.glb'
  );
  assert.equal(url.searchParams.get('v'), CHAPTER1_MAP_VERSION);
  if (targetPath === fullPath) {
    assert.equal(stat.size, 94_747_964, 'Original 90.3 MB Chương 1.glb must remain uncompressed');
  } else {
    assert.ok(stat.size > 100_000 && stat.size < 5 * 1024 * 1024, 'Fallback Lite GLB must be valid and compact');
  }
});

test('Chapter 1 Lite GLB exists intact on disk, stays lightweight (~30k tris, 1024px albedo, < 5 MB), and preserves canonical scale', () => {
  const absPath = path.resolve(process.cwd(), 'public', ...CHAPTER1_MAP_LITE_PATH_SEGMENTS);
  assert.ok(fs.existsSync(absPath), `Missing Chapter 1 Lite GLB at ${absPath}`);
  const buf = fs.readFileSync(absPath);
  assert.equal(buf.toString('ascii', 0, 4), 'glTF');
  assert.equal(buf.readUInt32LE(4), 2);
  assert.equal(buf.readUInt32LE(8), buf.byteLength);
  assert.ok(
    buf.byteLength < 5 * 1024 * 1024,
    `Expected Lite GLB under 5 MB, got ${(buf.byteLength / (1024 * 1024)).toFixed(2)} MB`
  );

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
  // Canonical raw bounds should closely match original Chương 1.glb
  assert.ok(posAcc.min[0] < -0.58 && posAcc.max[0] > 0.58);
  assert.ok(posAcc.min[1] < -0.58 && posAcc.max[1] > 0.59);

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

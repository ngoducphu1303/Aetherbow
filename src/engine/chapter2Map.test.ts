import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import * as THREE from 'three';
import {
  CHAPTER2_MAP_CDN_URL,
  CHAPTER2_MAP_FLOOR_OFFSET_Y,
  CHAPTER2_MAP_FLOOR_Y_RAW,
  CHAPTER2_MAP_LITE_PATH_SEGMENTS,
  CHAPTER2_MAP_LITE_VERSION,
  createChapter2WarForgeAtmosphere,
  fetchChapter2MapArrayBuffer,
  getChapter2MapHighAssetUrl,
  getChapter2MapLiteAssetUrl,
  isValidGlbBuffer,
  prepareChapter2MapModel,
  resolveChapter2ForgeAtmosphereBudget,
  updateChapter2WarForgeAtmosphere,
} from './chapter2Map';

function makeMinimalValidGlb(): ArrayBuffer {
  const json = Buffer.from(JSON.stringify({ asset: { version: '2.0' } }), 'utf8');
  const padLen = (json.length + 3) & ~3;
  const paddedJson = Buffer.alloc(padLen, 0x20);
  json.copy(paddedJson);
  const totalLen = 12 + 8 + paddedJson.length;
  const out = Buffer.alloc(totalLen);
  out.writeUInt32LE(0x46546c67, 0);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(totalLen, 8);
  out.writeUInt32LE(paddedJson.length, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  paddedJson.copy(out, 20);
  return out.buffer.slice(out.byteOffset, out.byteOffset + out.byteLength);
}

test('Chapter 2 Lite GLB exists intact on disk, stays lightweight (~30k tris, 1024px JPEG albedo, < 3 MB), and preserves canonical bounds', () => {
  const absPath = path.resolve(process.cwd(), 'public', ...CHAPTER2_MAP_LITE_PATH_SEGMENTS);
  assert.ok(fs.existsSync(absPath), `Missing Chapter 2 Lite GLB at ${absPath}`);
  const buf = fs.readFileSync(absPath);
  assert.equal(buf.toString('ascii', 0, 4), 'glTF');
  assert.equal(buf.readUInt32LE(4), 2);
  assert.equal(buf.readUInt32LE(8), buf.byteLength);
  assert.ok(
    isValidGlbBuffer(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)),
    'isValidGlbBuffer should validate real Chapter 2 Lite GLB'
  );
  assert.ok(
    buf.byteLength < 3 * 1024 * 1024,
    `Expected Chapter 2 Lite GLB under 3 MB, got ${(buf.byteLength / (1024 * 1024)).toFixed(2)} MB`
  );

  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const prim = gltf.meshes[0].primitives[0];
  const idxAcc = gltf.accessors[prim.indices];
  const posAcc = gltf.accessors[prim.attributes.POSITION];
  const triCount = idxAcc.count / 3;
  assert.ok(
    triCount >= 20_000 && triCount <= 40_000,
    `Expected Chapter 2 Lite triangle count around 30k, got ${triCount}`
  );
  assert.equal(gltf.images.length, 1, 'Lite GLB should embed only 1 BaseColor albedo image');
  assert.equal(gltf.images[0].mimeType, 'image/jpeg');
  assert.equal(
    Boolean(gltf.extensionsUsed?.includes('KHR_materials_specular')),
    false,
    'Lite GLB should use lightweight MeshStandardMaterial without KHR_materials_specular'
  );
  // Canonical raw bounds match Aries War-Forge Arena.glb
  assert.ok(posAcc.min[0] < -0.52 && posAcc.max[0] > 0.52);
  assert.ok(posAcc.min[1] < -0.52 && posAcc.max[1] > 0.52);

  const liteUrl = getChapter2MapLiteAssetUrl('/', 'http://127.0.0.1:3000/');
  assert.equal(
    liteUrl.pathname,
    '/assets/Ch%C6%B0%C6%A1ng%202/Map%20m%E1%BB%9Bi/Aries%20War-Forge%20Arena%20Lite.glb'
  );
  assert.equal(liteUrl.searchParams.get('v'), CHAPTER2_MAP_LITE_VERSION);
  assert.equal(getChapter2MapHighAssetUrl().href, CHAPTER2_MAP_CDN_URL);
});

test('prepareChapter2MapModel calibrates canonical Aries War-Forge Arena bounds, floor elevation, and shadow flags', () => {
  // Synthetic replica matching exact Aries War-Forge Arena.glb dimensions after +90deg X rotation:
  // X in [-0.5400, 0.5368], Y in [0, 0.6622], Z in [-0.5434, 0.5345]
  const root = new THREE.Group();
  const geo = new THREE.BoxGeometry(1.0768, 0.6622, 1.0779);
  geo.translate(-0.0016, 0.6622 / 2, -0.0044);
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff });
  const mesh = new THREE.Mesh(geo, mat);
  root.add(mesh);

  const prepared = prepareChapter2MapModel(root, 16);
  assert.ok(prepared.scale > 40.5 && prepared.scale < 42.5, `Unexpected scale: ${prepared.scale}`);
  // Outer forge bounds must generously surround the playable arena (±10.5 x ±12.2)
  assert.ok(prepared.bounds.min.x < -21 && prepared.bounds.max.x > 21);
  assert.ok(prepared.bounds.min.z < -21 && prepared.bounds.max.z > 21);
  // Floor surface at raw y=0.4325 should sit at CHAPTER2_MAP_FLOOR_OFFSET_Y (-0.02)
  const expectedTopY = (0.6622 - CHAPTER2_MAP_FLOOR_Y_RAW) * prepared.scale + CHAPTER2_MAP_FLOOR_OFFSET_Y;
  assert.ok(
    Math.abs(prepared.bounds.max.y - expectedTopY) < 0.05,
    `Expected top Y near ${expectedTopY}, got ${prepared.bounds.max.y}`
  );
  assert.equal(mesh.receiveShadow, true);
  assert.equal(mesh.castShadow, false);
  assert.equal(mat.emissive.getHex(), 0x2a0c04);
});

test('fetchChapter2MapArrayBuffer loads CDN high map when healthy and automatically falls back to local Lite GLB on CDN failure', async () => {
  const validCdnGlb = makeMinimalValidGlb();
  const validLiteGlb = makeMinimalValidGlb();
  const calls: string[] = [];

  // 1. Healthy CDN load for 'full'
  const healthyFetch: typeof fetch = async (input) => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push(urlStr);
    if (urlStr === CHAPTER2_MAP_CDN_URL) {
      return new Response(validCdnGlb, {
        status: 200,
        headers: { 'content-type': 'model/gltf-binary' },
      });
    }
    return new Response('Not Found', { status: 404 });
  };
  const okResult = await fetchChapter2MapArrayBuffer({
    variant: 'full',
    baseUrl: '/',
    baseUri: 'http://127.0.0.1:3000/',
    fetchImpl: healthyFetch,
  });
  assert.equal(okResult.resolvedVariant, 'full');
  assert.equal(okResult.fallbackUsed, false);
  assert.equal(calls.length, 1);
  assert.equal(calls[0], CHAPTER2_MAP_CDN_URL);

  // 2. CDN failure falls back automatically to local Lite GLB
  const fallbackCalls: string[] = [];
  const failingCdnFetch: typeof fetch = async (input) => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    fallbackCalls.push(urlStr);
    if (urlStr === CHAPTER2_MAP_CDN_URL) {
      return new Response('Service Unavailable', { status: 503 });
    }
    if (urlStr.includes('Aries%20War-Forge%20Arena%20Lite.glb')) {
      return new Response(validLiteGlb, {
        status: 200,
        headers: { 'content-type': 'model/gltf-binary' },
      });
    }
    return new Response('Not Found', { status: 404 });
  };
  const fallbackResult = await fetchChapter2MapArrayBuffer({
    variant: 'full',
    baseUrl: '/',
    baseUri: 'http://127.0.0.1:3000/',
    fetchImpl: failingCdnFetch,
  });
  assert.equal(fallbackResult.resolvedVariant, 'lite');
  assert.equal(fallbackResult.fallbackUsed, true);
  assert.equal(fallbackCalls.length, 2);
  assert.equal(fallbackCalls[0], CHAPTER2_MAP_CDN_URL);
  assert.ok(fallbackCalls[1].includes('Aries%20War-Forge%20Arena%20Lite.glb'));
});

test('Chapter 2 War-Forge atmosphere strictly enforces Dell E5430 Lite caps and animates without shadows or errors', () => {
  const liteBudget = resolveChapter2ForgeAtmosphereBudget(true, false);
  const highBudget = resolveChapter2ForgeAtmosphereBudget(false, false);
  const swBudget = resolveChapter2ForgeAtmosphereBudget(true, true);

  assert.ok(liteBudget.emberCount <= 24 && liteBudget.ashCount <= 12);
  assert.equal(liteBudget.lavaLightCount, 1);
  assert.equal(swBudget.lavaLightCount, 0);
  assert.ok(highBudget.emberCount > liteBudget.emberCount);
  assert.equal(highBudget.lavaLightCount, 3);

  const liteRig = createChapter2WarForgeAtmosphere({ liteActive: true, isSoftwareGl: false });
  assert.equal(liteRig.lavaLights.length, 1);
  assert.equal(liteRig.lavaLights[0].light.castShadow, false);
  assert.equal(liteRig.emberMesh?.count, liteBudget.emberCount);
  assert.equal(liteRig.ashMesh?.count, liteBudget.ashCount);

  const initialIntensity = liteRig.lavaLights[0].light.intensity;
  updateChapter2WarForgeAtmosphere(liteRig, 0.85);
  assert.notEqual(liteRig.lavaLights[0].light.intensity, initialIntensity);
});

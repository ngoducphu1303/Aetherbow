import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import * as THREE from 'three';
import {
  CHAPTER4_MAP_FLOOR_OFFSET_Y,
  CHAPTER4_MAP_FLOOR_Y_RAW,
  CHAPTER4_MAP_HIGH_PATH_SEGMENTS,
  CHAPTER4_MAP_LITE_PATH_SEGMENTS,
  CHAPTER4_MAP_VERSION,
  createChapter4GeminiSanctuaryAtmosphere,
  fetchChapter4MapArrayBuffer,
  getChapter4MapHighAssetUrl,
  getChapter4MapLiteAssetUrl,
  isValidChapter4GlbBuffer,
  prepareChapter4MapModel,
  resolveChapter4GeminiAtmosphereBudget,
  updateChapter4GeminiSanctuaryAtmosphere,
} from './chapter4Map';
import { assertValidGlbAssetOrManifest } from './testGlbManifestHelper';

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

test('Chapter 4 Lite & High GLBs exist intact on disk or CDN manifest and meet Dell Latitude E5430 Lite GPU budgets', () => {
  const liteAbsPath = path.resolve(process.cwd(), 'public', ...CHAPTER4_MAP_LITE_PATH_SEGMENTS);
  const liteRes = assertValidGlbAssetOrManifest(liteAbsPath, { maxBytes: 2.2 * 1024 * 1024, requireRuntime: true });
  if (liteRes.source === 'disk') {
    const liteBuf = fs.readFileSync(liteAbsPath);
    assert.ok(
      isValidChapter4GlbBuffer(
        liteBuf.buffer.slice(liteBuf.byteOffset, liteBuf.byteOffset + liteBuf.byteLength)
      ),
      'isValidChapter4GlbBuffer should validate real Chapter 4 Lite GLB'
    );
    const jsonLen = liteBuf.readUInt32LE(12);
    const gltf = JSON.parse(liteBuf.subarray(20, 20 + jsonLen).toString('utf8'));
    const prim = gltf.meshes[0].primitives[0];
    const idxAcc = gltf.accessors[prim.indices];
    const triCount = idxAcc.count / 3;
    assert.ok(
      triCount >= 15_000 && triCount <= 42_000,
      `Expected Chapter 4 Lite triangle count <= 42k for E5430, got ${triCount}`
    );
    assert.equal(gltf.images.length, 1, 'Lite GLB should embed only 1 BaseColor albedo image');
    assert.equal(gltf.images[0].mimeType, 'image/jpeg');
  }

  const highAbsPath = path.resolve(process.cwd(), 'public', ...CHAPTER4_MAP_HIGH_PATH_SEGMENTS);
  const highRes = assertValidGlbAssetOrManifest(highAbsPath, { maxBytes: 4.5 * 1024 * 1024, requireRuntime: true });
  if (highRes.source === 'disk') {
    const highBuf = fs.readFileSync(highAbsPath);
    assert.ok(
      isValidChapter4GlbBuffer(
        highBuf.buffer.slice(highBuf.byteOffset, highBuf.byteOffset + highBuf.byteLength)
      )
    );
  }

  const liteUrl = getChapter4MapLiteAssetUrl('/', 'http://127.0.0.1:3000/');
  assert.equal(
    decodeURI(liteUrl.pathname),
    '/assets/Chương 4/Runtime/gemini-arena-lite.glb'
  );
  assert.equal(liteUrl.searchParams.get('v'), CHAPTER4_MAP_VERSION);
  assert.equal(
    decodeURI(getChapter4MapHighAssetUrl().pathname),
    '/assets/Chương 4/Runtime/gemini-arena-high.glb'
  );
});

test('prepareChapter4MapModel calibrates canonical Gemini Astral Mirror Arena bounds, floor elevation, and Lite anisotropy cap', () => {
  // Synthetic replica matching exact 01_Dau_Truong_Song_Tu_Gemini_Arena.glb dimensions after +90deg X rotation:
  // X in [-0.5501, 0.5307] (span 1.0808), Y in [0.0004, 0.4082] (span 0.4077), Z in [-0.5294, 0.5512] (span 1.0806)
  const root = new THREE.Group();
  const geo = new THREE.BoxGeometry(1.0808, 0.4077, 1.0806);
  geo.translate(-0.0097, 0.4077 / 2 + 0.0004, 0.0109);
  const tex = new THREE.Texture();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex });
  const mesh = new THREE.Mesh(geo, mat);
  root.add(mesh);

  const prepared = prepareChapter4MapModel(root, 16, { liteMode: true });
  assert.ok(prepared.scale > 37.5 && prepared.scale < 39.0, `Unexpected scale: ${prepared.scale}`);
  assert.ok(prepared.bounds.min.x < -20 && prepared.bounds.max.x > 20);
  assert.ok(prepared.bounds.min.z < -20 && prepared.bounds.max.z > 20);

  const expectedTopY =
    (0.4081 - CHAPTER4_MAP_FLOOR_Y_RAW) * prepared.scale + CHAPTER4_MAP_FLOOR_OFFSET_Y;
  assert.ok(
    Math.abs(prepared.bounds.max.y - expectedTopY) < 0.08,
    `Expected top Y near ${expectedTopY}, got ${prepared.bounds.max.y}`
  );
  assert.equal(mesh.receiveShadow, true);
  assert.equal(mesh.castShadow, false);
  assert.equal(mat.emissive.getHex(), 0x0c1b3a);
  assert.equal(tex.anisotropy, 2, 'Lite mode should cap texture anisotropy at 2 for E5430');
});

test('fetchChapter4MapArrayBuffer loads High map when healthy and falls back cleanly to Lite GLB on failure', async () => {
  const validHighGlb = makeMinimalValidGlb();
  const validLiteGlb = makeMinimalValidGlb();
  const calls: string[] = [];

  const healthyFetch: typeof fetch = async (input) => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push(urlStr);
    if (urlStr === getChapter4MapHighAssetUrl('/', 'http://127.0.0.1:3000/').href) {
      return new Response(validHighGlb, {
        status: 200,
        headers: { 'content-type': 'model/gltf-binary' },
      });
    }
    return new Response('Not Found', { status: 404 });
  };
  const okResult = await fetchChapter4MapArrayBuffer({
    variant: 'full',
    baseUrl: '/',
    baseUri: 'http://127.0.0.1:3000/',
    fetchImpl: healthyFetch,
  });
  assert.equal(okResult.resolvedVariant, 'full');
  assert.equal(okResult.fallbackUsed, false);
  assert.equal(calls.length, 1);

  const fallbackCalls: string[] = [];
  const failingHighFetch: typeof fetch = async (input) => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    fallbackCalls.push(urlStr);
    if (urlStr.includes('gemini-arena-high.glb')) {
      return new Response('Not Found', { status: 404 });
    }
    if (urlStr.includes('gemini-arena-lite.glb')) {
      return new Response(validLiteGlb, {
        status: 200,
        headers: { 'content-type': 'model/gltf-binary' },
      });
    }
    return new Response('Not Found', { status: 404 });
  };
  const fallbackResult = await fetchChapter4MapArrayBuffer({
    variant: 'full',
    baseUrl: '/',
    baseUri: 'http://127.0.0.1:3000/',
    fetchImpl: failingHighFetch,
  });
  assert.equal(fallbackResult.resolvedVariant, 'lite');
  assert.equal(fallbackResult.fallbackUsed, true);
  assert.ok(fallbackCalls.some((u) => u.includes('gemini-arena-lite.glb')));
});

test('Chapter 4 Gemini Sanctuary atmosphere enforces Dell E5430 Lite caps and animates without shadows', () => {
  const liteBudget = resolveChapter4GeminiAtmosphereBudget(true, false);
  const highBudget = resolveChapter4GeminiAtmosphereBudget(false, false);
  const swBudget = resolveChapter4GeminiAtmosphereBudget(true, true);

  assert.ok(liteBudget.shardCount <= 24 && liteBudget.stardustCount <= 12);
  assert.equal(liteBudget.sanctuaryLightCount, 1);
  assert.equal(swBudget.sanctuaryLightCount, 0);
  assert.ok(highBudget.shardCount > liteBudget.shardCount);
  assert.equal(highBudget.sanctuaryLightCount, 3);

  const liteRig = createChapter4GeminiSanctuaryAtmosphere({ liteActive: true, isSoftwareGl: false });
  assert.equal(liteRig.sanctuaryLights.length, 1);
  assert.equal(liteRig.sanctuaryLights[0].light.castShadow, false);
  assert.equal(liteRig.shardMesh?.count, liteBudget.shardCount);
  assert.equal(liteRig.stardustMesh?.count, liteBudget.stardustCount);

  const initialIntensity = liteRig.sanctuaryLights[0].light.intensity;
  updateChapter4GeminiSanctuaryAtmosphere(liteRig, 0.9);
  assert.notEqual(liteRig.sanctuaryLights[0].light.intensity, initialIntensity);
});

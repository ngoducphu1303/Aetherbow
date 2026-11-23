import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import * as THREE from 'three';
import {
  CHAPTER3_MAP_FLOOR_OFFSET_Y,
  CHAPTER3_MAP_FLOOR_Y_RAW,
  CHAPTER3_MAP_HIGH_PATH_SEGMENTS,
  CHAPTER3_MAP_LITE_PATH_SEGMENTS,
  CHAPTER3_MAP_VERSION,
  createChapter3EmeraldSanctuaryAtmosphere,
  fetchChapter3MapArrayBuffer,
  getChapter3MapHighAssetUrl,
  getChapter3MapLiteAssetUrl,
  isValidChapter3GlbBuffer,
  prepareChapter3MapModel,
  resolveChapter3SanctuaryAtmosphereBudget,
  updateChapter3EmeraldSanctuaryAtmosphere,
} from './chapter3Map';

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

test('Chapter 3 Lite & High GLBs exist intact on disk and meet Dell Latitude E5430 Lite GPU budgets', () => {
  const liteAbsPath = path.resolve(process.cwd(), 'public', ...CHAPTER3_MAP_LITE_PATH_SEGMENTS);
  assert.ok(fs.existsSync(liteAbsPath), `Missing Chapter 3 Lite GLB at ${liteAbsPath}`);
  const liteBuf = fs.readFileSync(liteAbsPath);
  assert.equal(liteBuf.toString('ascii', 0, 4), 'glTF');
  assert.equal(liteBuf.readUInt32LE(4), 2);
  assert.equal(liteBuf.readUInt32LE(8), liteBuf.byteLength);
  assert.ok(
    isValidChapter3GlbBuffer(liteBuf.buffer.slice(liteBuf.byteOffset, liteBuf.byteOffset + liteBuf.byteLength)),
    'isValidChapter3GlbBuffer should validate real Chapter 3 Lite GLB'
  );
  assert.ok(
    liteBuf.byteLength < 2.2 * 1024 * 1024,
    `Expected Chapter 3 Lite GLB under 2.2 MB, got ${(liteBuf.byteLength / (1024 * 1024)).toFixed(2)} MB`
  );

  const jsonLen = liteBuf.readUInt32LE(12);
  const gltf = JSON.parse(liteBuf.subarray(20, 20 + jsonLen).toString('utf8'));
  const prim = gltf.meshes[0].primitives[0];
  const idxAcc = gltf.accessors[prim.indices];
  const triCount = idxAcc.count / 3;
  assert.ok(
    triCount >= 15_000 && triCount <= 42_000,
    `Expected Chapter 3 Lite triangle count <= 42k for E5430, got ${triCount}`
  );
  assert.equal(gltf.images.length, 1, 'Lite GLB should embed only 1 BaseColor albedo image');
  assert.equal(gltf.images[0].mimeType, 'image/jpeg');

  const highAbsPath = path.resolve(process.cwd(), 'public', ...CHAPTER3_MAP_HIGH_PATH_SEGMENTS);
  assert.ok(fs.existsSync(highAbsPath), `Missing Chapter 3 High GLB at ${highAbsPath}`);
  const highBuf = fs.readFileSync(highAbsPath);
  assert.ok(
    isValidChapter3GlbBuffer(highBuf.buffer.slice(highBuf.byteOffset, highBuf.byteOffset + highBuf.byteLength))
  );
  assert.ok(highBuf.byteLength < 4.5 * 1024 * 1024);

  const liteUrl = getChapter3MapLiteAssetUrl('/', 'http://127.0.0.1:3000/');
  assert.equal(
    decodeURI(liteUrl.pathname),
    '/assets/Chương 3/Runtime/taurus-arena-lite.glb'
  );
  assert.equal(liteUrl.searchParams.get('v'), CHAPTER3_MAP_VERSION);
  assert.equal(
    decodeURI(getChapter3MapHighAssetUrl().pathname),
    '/assets/Chương 3/Runtime/taurus-arena-high.glb'
  );
});

test('prepareChapter3MapModel calibrates canonical Taurus Emerald Sanctuary bounds, floor elevation, and Lite anisotropy cap', () => {
  // Synthetic replica matching exact dau_truong_thanh_dia_ngoc_luc_bao.glb dimensions after +90deg X rotation:
  // X in [-0.4709, 0.4526], Y in [0.0003, 0.7287], Z in [-0.4402, 0.4891]
  const root = new THREE.Group();
  const geo = new THREE.BoxGeometry(0.9235, 0.7284, 0.9293);
  geo.translate(-0.0091, 0.7284 / 2 + 0.0003, 0.0245);
  const tex = new THREE.Texture();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: tex });
  const mesh = new THREE.Mesh(geo, mat);
  root.add(mesh);

  const prepared = prepareChapter3MapModel(root, 16, { liteMode: true });
  assert.ok(prepared.scale > 47.5 && prepared.scale < 49.5, `Unexpected scale: ${prepared.scale}`);
  assert.ok(prepared.bounds.min.x < -21 && prepared.bounds.max.x > 21);
  assert.ok(prepared.bounds.min.z < -21 && prepared.bounds.max.z > 21);

  const expectedTopY = (0.7287 - CHAPTER3_MAP_FLOOR_Y_RAW) * prepared.scale + CHAPTER3_MAP_FLOOR_OFFSET_Y;
  assert.ok(
    Math.abs(prepared.bounds.max.y - expectedTopY) < 0.08,
    `Expected top Y near ${expectedTopY}, got ${prepared.bounds.max.y}`
  );
  assert.equal(mesh.receiveShadow, true);
  assert.equal(mesh.castShadow, false);
  assert.equal(mat.emissive.getHex(), 0x062414);
  assert.equal(tex.anisotropy, 2, 'Lite mode should cap texture anisotropy at 2 for E5430');
});

test('fetchChapter3MapArrayBuffer loads High map when healthy and falls back cleanly to Lite GLB on failure', async () => {
  const validHighGlb = makeMinimalValidGlb();
  const validLiteGlb = makeMinimalValidGlb();
  const calls: string[] = [];

  const healthyFetch: typeof fetch = async (input) => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push(urlStr);
    if (urlStr === getChapter3MapHighAssetUrl('/', 'http://127.0.0.1:3000/').href) {
      return new Response(validHighGlb, {
        status: 200,
        headers: { 'content-type': 'model/gltf-binary' },
      });
    }
    return new Response('Not Found', { status: 404 });
  };
  const okResult = await fetchChapter3MapArrayBuffer({
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
    if (urlStr.includes('taurus-arena-high.glb')) {
      return new Response('Not Found', { status: 404 });
    }
    if (urlStr.includes('taurus-arena-lite.glb')) {
      return new Response(validLiteGlb, {
        status: 200,
        headers: { 'content-type': 'model/gltf-binary' },
      });
    }
    return new Response('Not Found', { status: 404 });
  };
  const fallbackResult = await fetchChapter3MapArrayBuffer({
    variant: 'full',
    baseUrl: '/',
    baseUri: 'http://127.0.0.1:3000/',
    fetchImpl: failingHighFetch,
  });
  assert.equal(fallbackResult.resolvedVariant, 'lite');
  assert.equal(fallbackResult.fallbackUsed, true);
  assert.ok(fallbackCalls.some((u) => u.includes('taurus-arena-lite.glb')));
});

test('Chapter 3 Emerald Sanctuary atmosphere enforces Dell E5430 Lite caps and animates without shadows', () => {
  const liteBudget = resolveChapter3SanctuaryAtmosphereBudget(true, false);
  const highBudget = resolveChapter3SanctuaryAtmosphereBudget(false, false);
  const swBudget = resolveChapter3SanctuaryAtmosphereBudget(true, true);

  assert.ok(liteBudget.moteCount <= 24 && liteBudget.pollenCount <= 12);
  assert.equal(liteBudget.sanctuaryLightCount, 1);
  assert.equal(swBudget.sanctuaryLightCount, 0);
  assert.ok(highBudget.moteCount > liteBudget.moteCount);
  assert.equal(highBudget.sanctuaryLightCount, 3);

  const liteRig = createChapter3EmeraldSanctuaryAtmosphere({ liteActive: true, isSoftwareGl: false });
  assert.equal(liteRig.sanctuaryLights.length, 1);
  assert.equal(liteRig.sanctuaryLights[0].light.castShadow, false);
  assert.equal(liteRig.moteMesh?.count, liteBudget.moteCount);
  assert.equal(liteRig.pollenMesh?.count, liteBudget.pollenCount);

  const initialIntensity = liteRig.sanctuaryLights[0].light.intensity;
  updateChapter3EmeraldSanctuaryAtmosphere(liteRig, 0.9);
  assert.notEqual(liteRig.sanctuaryLights[0].light.intensity, initialIntensity);
});

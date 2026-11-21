import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EnemyKind } from '../types/game';
import { classifyGpuCapability } from './aaaVisualPipeline';
import {
  CHAPTER1_BOSS_HIGH_PATH_SEGMENTS,
  CHAPTER1_BOSS_LITE_PATH_SEGMENTS,
  CHAPTER1_BOSS_SOURCE_PATH_SEGMENTS,
  CHAPTER1_BOSS_TARGET_HEIGHT,
  clearChapter1BossDownloadCache,
  downloadChapter1BossArrayBuffer,
  getChapter1BossAssetUrl,
  isSolarLionBossEncounter,
  prepareChapter1BossModel,
  updateChapter1BossMotion,
} from './chapter1Boss';
import {
  BOSS_3D_INFLIGHT_KEY,
  clearBoss3dLoadInFlight,
  markBoss3dLoadInFlight,
  promoteUnfinishedChapter1MapCrash,
  resetGpuCrashSentinel,
  resolveBoss3dModelVariant,
} from './gpuSafetyGuard';

function readGlbJsonAndHeader(absPath: string) {
  assert.ok(fs.existsSync(absPath), `Missing GLB at ${absPath}`);
  const stat = fs.statSync(absPath);
  const fd = fs.openSync(absPath, 'r');
  try {
    const hdr = Buffer.alloc(20);
    fs.readSync(fd, hdr, 0, 20, 0);
    assert.equal(hdr.toString('ascii', 0, 4), 'glTF');
    assert.equal(hdr.readUInt32LE(4), 2);
    assert.equal(hdr.readUInt32LE(8), stat.size);
    const jsonLen = hdr.readUInt32LE(12);
    const jsonBuf = Buffer.alloc(jsonLen);
    fs.readSync(fd, jsonBuf, 0, jsonLen, 20);
    return { stat, gltf: JSON.parse(jsonBuf.toString('utf8')) };
  } finally {
    fs.closeSync(fd);
  }
}

function createMemoryStorage(): Storage {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    clear() {
      map.clear();
    },
    getItem(key: string) {
      return map.has(key) ? map.get(key)! : null;
    },
    key(index: number) {
      return Array.from(map.keys())[index] ?? null;
    },
    removeItem(key: string) {
      map.delete(key);
    },
    setItem(key: string, value: string) {
      map.set(key, String(value));
    },
  };
}

test('Original GitHub Sư tử boss mới.glb, High PBR variant, and Low-End Lite variant all exist intact on disk', () => {
  const srcPath = path.resolve(process.cwd(), 'public', ...CHAPTER1_BOSS_SOURCE_PATH_SEGMENTS);
  const src = readGlbJsonAndHeader(srcPath);
  assert.equal(src.stat.size, 87_056_812, 'Original 83.02 MB GitHub source must remain untouched');

  const highPath = path.resolve(process.cwd(), 'public', ...CHAPTER1_BOSS_HIGH_PATH_SEGMENTS);
  const high = readGlbJsonAndHeader(highPath);
  assert.ok(high.stat.size < 6 * 1024 * 1024, `High Boss GLB must be under 6 MB, got ${high.stat.size}`);
  const highTris = high.gltf.accessors[high.gltf.meshes[0].primitives[0].indices].count / 3;
  assert.ok(highTris >= 30_000 && highTris <= 48_000, `Expected High tris ~38k, got ${highTris}`);
  assert.equal(high.gltf.images.length, 3, 'High Boss GLB must retain all 3 PBR maps');
  assert.equal(Boolean(high.gltf.extensionsUsed?.includes('KHR_materials_specular')), false);

  const litePath = path.resolve(process.cwd(), 'public', ...CHAPTER1_BOSS_LITE_PATH_SEGMENTS);
  const lite = readGlbJsonAndHeader(litePath);
  assert.ok(lite.stat.size < 1024 * 1024, `Lite Boss GLB must be under 1 MB for E5430, got ${lite.stat.size}`);
  const liteTris = lite.gltf.accessors[lite.gltf.meshes[0].primitives[0].indices].count / 3;
  assert.ok(liteTris >= 8_000 && liteTris <= 16_000, `Expected Lite tris ~12k, got ${liteTris}`);
  assert.equal(lite.gltf.images.length, 1, 'Lite Boss GLB must embed only 1 BaseColor texture');
  assert.equal(lite.gltf.images[0].mimeType, 'image/jpeg');
  assert.equal(Boolean(lite.gltf.extensionsUsed?.includes('KHR_materials_specular')), false);

  const highUrl = getChapter1BossAssetUrl('high', '/', 'http://127.0.0.1:3000/');
  const liteUrl = getChapter1BossAssetUrl('lite', '/', 'http://127.0.0.1:3000/');
  assert.ok(highUrl.pathname.endsWith('High.glb'));
  assert.ok(liteUrl.pathname.endsWith('Lite.glb'));
});

test('isSolarLionBossEncounter scopes strictly to Chapter 1 Final Boss and Weekly Solar Leo Boss', () => {
  assert.equal(
    isSolarLionBossEncounter({ chapterId: 1, enemyKind: EnemyKind.ZODIAC_BOSS }),
    true
  );
  assert.equal(
    isSolarLionBossEncounter({
      chapterId: 1,
      enemyKind: EnemyKind.ZODIAC_BOSS,
      isWeeklyRankedBossMode: true,
      weeklyBossId: 'weekly_solar_leo',
    }),
    true
  );
  assert.equal(
    isSolarLionBossEncounter({
      chapterId: 1,
      enemyKind: EnemyKind.ZODIAC_BOSS,
      isWeeklyRankedBossMode: true,
      weeklyBossId: 'weekly_solar_leo_blitz',
    }),
    true
  );
  // Other chapters, side modes, non-final bosses, and other weekly bosses stay untouched
  assert.equal(
    isSolarLionBossEncounter({ chapterId: 2, enemyKind: EnemyKind.ZODIAC_BOSS }),
    false
  );
  assert.equal(
    isSolarLionBossEncounter({ chapterId: 1, enemyKind: EnemyKind.TITAN_BOSS }),
    false
  );
  assert.equal(
    isSolarLionBossEncounter({
      chapterId: 1,
      enemyKind: EnemyKind.ZODIAC_BOSS,
      isSideModeActive: true,
    }),
    false
  );
  assert.equal(
    isSolarLionBossEncounter({
      chapterId: 1,
      enemyKind: EnemyKind.ZODIAC_BOSS,
      isWeeklyRankedBossMode: true,
      weeklyBossId: 'weekly_boreas_frost',
    }),
    false
  );
});

test('Hardware guard routes Dell Latitude E5430 to Lite Boss GLB, RTX to High PBR, and protects against mid-load crashes', () => {
  const e5430 = classifyGpuCapability(
    'ANGLE (Intel, Intel(R) HD Graphics 4000 Direct3D11 vs_5_0 ps_5_0)',
    8,
    4,
    { maxTextureSize: 8192 }
  );
  assert.equal(resolveBoss3dModelVariant(e5430, 'auto', 'auto'), 'lite');
  assert.equal(resolveBoss3dModelVariant(e5430, 'auto', 'light'), 'none');

  const rtx = classifyGpuCapability(
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0)',
    16,
    12,
    { maxTextureSize: 16384 }
  );
  assert.equal(resolveBoss3dModelVariant(rtx, 'auto', 'auto'), 'high');
  assert.equal(resolveBoss3dModelVariant(rtx, 'on', 'auto'), 'lite');
  assert.equal(resolveBoss3dModelVariant(rtx, 'auto', 'lite_3d'), 'lite');
  assert.equal(resolveBoss3dModelVariant(rtx, 'auto', 'light'), 'none');

  const swift = classifyGpuCapability('Google SwiftShader', 8, 4);
  assert.equal(resolveBoss3dModelVariant(swift, 'auto', 'auto'), 'none');

  const storage = createMemoryStorage();
  markBoss3dLoadInFlight(storage);
  assert.ok(storage.getItem(BOSS_3D_INFLIGHT_KEY));
  const promoted = promoteUnfinishedChapter1MapCrash(storage);
  assert.equal(promoted.tripped, true);
  assert.equal(storage.getItem(BOSS_3D_INFLIGHT_KEY), null);
  clearBoss3dLoadInFlight(storage);
  resetGpuCrashSentinel(storage);
});

test('Real Lite Boss GLB parses, grounds flush at Y=0, scales to target height, and drives finite combat choreography', async () => {
  const prevCreateBitmap = (globalThis as Record<string, unknown>).createImageBitmap;
  const prevSelf = (globalThis as Record<string, unknown>).self;
  Object.assign(globalThis, {
    self: globalThis,
    createImageBitmap: async () => ({ width: 1, height: 1, close() {} }),
  });

  try {
    const litePath = path.resolve(process.cwd(), 'public', ...CHAPTER1_BOSS_LITE_PATH_SEGMENTS);
    const bytes = fs.readFileSync(litePath);
    const gltf = await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, '');

    const preparedLite = prepareChapter1BossModel(gltf.scene, 16, { liteMode: true });
    assert.ok(preparedLite.hitMeshes.length >= 1, 'Boss must expose hitMeshes for hit-flash & rage glow');
    assert.ok(
      Math.abs(preparedLite.bounds.min.y) < 0.03,
      `Boss feet must sit flush at y=0, got min.y=${preparedLite.bounds.min.y}`
    );
    const height = preparedLite.bounds.max.y - preparedLite.bounds.min.y;
    assert.ok(
      Math.abs(height - CHAPTER1_BOSS_TARGET_HEIGHT) < 0.06,
      `Expected height ~${CHAPTER1_BOSS_TARGET_HEIGHT}, got ${height}`
    );
    assert.equal(preparedLite.hitMeshes[0].castShadow, false, 'Lite mode disables heavy shadow casting');

    // Step combat choreography through Idle, Stalking, Slam Telegraph, Slam Burst, Lunge, Stun, Hit Recoil
    const idleSnap = updateChapter1BossMotion(
      preparedLite.group,
      {
        elapsed: 1.0,
        phaseAngle: 0,
        speed: 0,
        telegraphType: 'none',
        telegraphProgress: 0,
        attackBurstType: 'none',
        attackBurstTimer: 0,
        bossPhase: 1,
        stunTimer: 0,
        hitFlashTimer: 0,
      },
      1 / 60
    );
    const crouchSnap = updateChapter1BossMotion(
      preparedLite.group,
      {
        elapsed: 2.0,
        phaseAngle: 0,
        speed: 0,
        telegraphType: 'slam',
        telegraphProgress: 0.9,
        attackBurstType: 'none',
        attackBurstTimer: 0,
        bossPhase: 2,
        stunTimer: 0,
        hitFlashTimer: 0,
      },
      0.05
    );
    const slamSnap = updateChapter1BossMotion(
      preparedLite.group,
      {
        elapsed: 2.2,
        phaseAngle: 0,
        speed: 0,
        telegraphType: 'none',
        telegraphProgress: 0,
        attackBurstType: 'slam',
        attackBurstTimer: 0.22,
        bossPhase: 2,
        stunTimer: 0,
        hitFlashTimer: 0.08,
      },
      0.05
    );
    const lungeSnap = updateChapter1BossMotion(
      preparedLite.group,
      {
        elapsed: 2.4,
        phaseAngle: 0,
        speed: 5.0,
        telegraphType: 'none',
        telegraphProgress: 0,
        attackBurstType: 'lunge',
        attackBurstTimer: 0.35,
        bossPhase: 2,
        stunTimer: 0,
        hitFlashTimer: 0,
      },
      0.05
    );

    for (const snap of [idleSnap, crouchSnap, slamSnap, lungeSnap]) {
      assert.ok(Object.values(snap).every(Number.isFinite));
    }
    assert.ok(crouchSnap.offsetY < 0, 'Slam telegraph must crouch downward');
    assert.ok(slamSnap.offsetY > crouchSnap.offsetY, 'Slam burst must rise above crouch');
    assert.ok(lungeSnap.offsetZ > 0, 'Lunge burst must propel boss forward along +Z');
  } finally {
    if (prevCreateBitmap === undefined) delete (globalThis as Record<string, unknown>).createImageBitmap;
    else (globalThis as Record<string, unknown>).createImageBitmap = prevCreateBitmap;
    if (prevSelf === undefined) delete (globalThis as Record<string, unknown>).self;
    else (globalThis as Record<string, unknown>).self = prevSelf;
  }
});

test('downloadChapter1BossArrayBuffer falls back automatically from High to Lite if High is unavailable', async () => {
  clearChapter1BossDownloadCache();
  const validGlb = new ArrayBuffer(24);
  const view = new DataView(validGlb);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, 24, true);

  const requested: string[] = [];
  const fakeFetch: typeof fetch = async (input) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    requested.push(href);
    if (href.includes('High.glb')) {
      return new Response('not found', { status: 404 });
    }
    return new Response(validGlb.slice(0), {
      status: 200,
      headers: { 'content-type': 'model/gltf-binary' },
    });
  };

  const buf = await downloadChapter1BossArrayBuffer('high', {
    baseUrl: '/',
    baseUri: 'http://127.0.0.1:3000/',
    fetchImpl: fakeFetch,
  });
  assert.equal(buf.byteLength, 24);
  assert.equal(requested.length, 2);
  assert.ok(requested[0].includes('High.glb'));
  assert.ok(requested[1].includes('Lite.glb'));
  clearChapter1BossDownloadCache();
});

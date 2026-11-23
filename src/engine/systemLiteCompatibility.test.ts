import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import {
  classifyGpuCapability,
  estimateGpuVramMb,
  resolveSystemLiteBudget,
} from './aaaVisualPipeline';
import { evaluateAdaptiveResolutionScale } from './aaaFivePillarsDirector';
import { sanitizeLoadedObjectForBudget } from './assetSanitizer';
import {
  clearHeavyAssetLoadInFlight,
  isLowEndSafetyModeActive,
  markHeavyAssetLoadInFlight,
  promoteUnfinishedHeavyAssetCrash,
  readGpuCrashSentinel,
  readPersistedChapter1MapMode,
  readPersistedLowEndSafetyMode,
  readPersistedSelectedHeroId,
  resetGpuCrashSentinel,
  resolveChapter1MapVariant,
  resolveGlobalAssetVariant,
} from './gpuSafetyGuard';
import {
  HERO_LITE_VARIANT_PATHS,
  isGlobalLiteHeroAssetsEnabled,
  setGlobalAssetPreloadMode,
} from './modelAssets';
import {
  createAdaptiveFpsGovernor,
  sampleAdaptiveFpsFrame,
} from './wave5CombatSystems';

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
      return map.has(key) ? (map.get(key) as string) : null;
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

function readGlbJsonChunk(filePath: string): {
  meshes?: unknown[];
  skins?: unknown[];
  nodes?: unknown[];
  images?: unknown[];
} {
  const buf = fs.readFileSync(filePath);
  assert.ok(buf.byteLength >= 20, `${filePath} must be >= 20 bytes`);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  assert.equal(view.getUint32(0, true), 0x46546c67, `${filePath} magic must be glTF`);
  assert.equal(view.getUint32(4, true), 2, `${filePath} must be glTF 2.0`);
  const jsonLength = view.getUint32(12, true);
  const jsonType = view.getUint32(16, true);
  assert.equal(jsonType, 0x4e4f534a, `${filePath} first chunk must be JSON`);
  const jsonText = buf.subarray(20, 20 + jsonLength).toString('utf8');
  return JSON.parse(jsonText) as {
    meshes?: unknown[];
    skins?: unknown[];
    nodes?: unknown[];
    images?: unknown[];
  };
}

test('Hardware tier & VRAM classifier accurately identifies Dell Latitude E5430 and 4 device segments', () => {
  // 1. Dell Latitude E5430: Intel HD Graphics 4000, 8 GB RAM, 4 logical threads
  const e5430 = classifyGpuCapability(
    'ANGLE (Intel, Intel(R) HD Graphics 4000 Direct3D11 vs_5_0 ps_5_0)',
    8,
    4,
    { maxTextureSize: 8192 }
  );
  assert.equal(e5430.deviceTier, 'lite');
  assert.equal(e5430.lowPowerLegacyGpu, true);
  assert.equal(e5430.supportsHighDetailAssets, false);
  assert.equal(e5430.supportsHighDetailChapter1Map, false);
  assert.equal(e5430.recommendedQuality, 'low');
  assert.equal(e5430.bloomSupported, false);
  assert.equal(e5430.shadowMapSize, 0);
  assert.ok((e5430.estimatedVramMb ?? 0) <= 512, 'Intel HD 4000 should report <= 512 MB VRAM');

  // 2. Ultra-low RAM machine (2 GB RAM, 2 cores)
  const ultraLow = classifyGpuCapability(
    'ANGLE (Intel, Intel(R) UHD Graphics 600 Direct3D11)',
    2,
    2,
    { maxTextureSize: 4096 }
  );
  assert.equal(ultraLow.deviceTier, 'ultra_lite');
  assert.equal(ultraLow.supportsHighDetailAssets, false);

  // 3. Software WebGL (SwiftShader)
  const swift = classifyGpuCapability('Google SwiftShader', 8, 4, { maxTextureSize: 4096 });
  assert.equal(swift.tier, 'software');
  assert.equal(swift.deviceTier, 'ultra_lite');
  assert.equal(swift.targetCombatFps, 12);

  // 4. Modern integrated GPU (Intel Iris Xe, 16 GB RAM, 8 cores)
  const irisXe = classifyGpuCapability(
    'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0)',
    16,
    8,
    { maxTextureSize: 16384 }
  );
  assert.equal(irisXe.deviceTier, 'balanced');
  assert.equal(irisXe.recommendedQuality, 'medium');

  // 5. Discrete GPU (NVIDIA RTX 4060, 16 GB RAM, 12 cores)
  const rtx = classifyGpuCapability(
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 4060 Direct3D11 vs_5_0 ps_5_0)',
    16,
    12,
    { maxTextureSize: 16384 }
  );
  assert.equal(rtx.tier, 'discrete');
  assert.equal(rtx.deviceTier, 'high');
  assert.equal(rtx.supportsHighDetailAssets, true);
  assert.ok(
    estimateGpuVramMb({
      rendererString: rtx.rendererName,
      tier: 'discrete',
      isLegacyWeakGpu: false,
      deviceMemoryGb: 16,
      maxTextureSize: 16384,
    }) >= 4096,
    'Discrete RTX 4060 should report >= 4096 MB estimated VRAM'
  );
});

test('SystemLiteBudget enforces safe global resource caps across all chapters on Dell Latitude E5430', () => {
  const e5430 = classifyGpuCapability(
    'ANGLE (Intel, Intel(R) HD Graphics 4000 Direct3D11 vs_5_0 ps_5_0)',
    8,
    4,
    { maxTextureSize: 8192 }
  );

  const budget = resolveSystemLiteBudget(e5430, 'auto', 'auto');
  assert.equal(budget.liteActive, true);
  assert.equal(budget.targetCombatFps, 30);
  assert.equal(budget.targetLobbyFps, 20);
  assert.ok(
    budget.maxPixelBudget <= 820_000,
    'Lite pixel budget must stay <= 820k px to prevent Intel HD 4000 fillrate overload'
  );
  assert.equal(budget.loadLobbyCity3d, false, 'Lite mode must skip heavy Lobby City 3D');
  assert.equal(budget.shadowMapSize, 0, 'Lite mode must disable shadow maps');
  assert.equal(budget.bloomAllowed, false, 'Lite mode must disable bloom post-processing');
  assert.equal(budget.enableBrazierFlames, false, 'Lite mode must skip extra brazier flame draw calls');
  assert.ok(budget.arenaMonolithCount <= 10, 'Lite mode must cut distant monolith count across all 12 chapters');
  assert.ok(budget.arenaDustCount <= 10, 'Lite mode must reduce ambient dust motes');
  assert.equal(budget.assetVariant, 'lite');
  assert.equal(resolveGlobalAssetVariant(e5430, 'auto'), 'lite');
  assert.equal(resolveChapter1MapVariant(e5430, 'auto', 'auto'), 'lite');

  // Manual global Lite ON on a high-end GPU also applies Lite budget everywhere
  const rtx = classifyGpuCapability('NVIDIA GeForce RTX 4060', 16, 12, { maxTextureSize: 16384 });
  const forcedLite = resolveSystemLiteBudget(rtx, 'on', 'auto');
  assert.equal(forcedLite.liteActive, true);
  assert.equal(forcedLite.loadLobbyCity3d, false);
  assert.equal(forcedLite.shadowMapSize, 0);
  assert.equal(resolveChapter1MapVariant(rtx, 'auto', 'on'), 'lite');
  assert.equal(isLowEndSafetyModeActive(rtx, 'on'), true);
});

test('Persisted save key reader correctly parses artemis_3d_save_v1 & global crash sentinel latches Safe Mode', () => {
  const mockStorage = createMemoryStorage();
  mockStorage.setItem(
    'artemis_3d_save_v1',
    JSON.stringify({
      selectedHeroId: 'hatsune_miku',
      settings: {
        chapter1MapMode: 'lite_3d',
        lowEndSafetyMode: 'on',
      },
    })
  );
  assert.equal(readPersistedChapter1MapMode(mockStorage), 'lite_3d');
  assert.equal(readPersistedLowEndSafetyMode(mockStorage), 'on');
  assert.equal(readPersistedSelectedHeroId(mockStorage), 'aurelia');

  // Simulate an unhandled GPU hang / tab crash during heavy 3D asset parse
  resetGpuCrashSentinel(mockStorage);
  assert.equal(readGpuCrashSentinel(mockStorage).tripped, false);
  markHeavyAssetLoadInFlight('heroes/hatsune-miku.glb', mockStorage);
  const promoted = promoteUnfinishedHeavyAssetCrash(mockStorage);
  assert.equal(promoted.tripped, true);
  assert.equal(readGpuCrashSentinel(mockStorage).tripped, true);
  assert.match(readGpuCrashSentinel(mockStorage).reason ?? '', /hatsune-miku\.glb/);
  clearHeavyAssetLoadInFlight(mockStorage);
  resetGpuCrashSentinel(mockStorage);
});

test('Target-aware adaptive FPS governor & resolution scaler support 30 FPS Lite without false-triggering', () => {
  const gov = createAdaptiveFpsGovernor(true);
  // Steady 30 FPS on Dell Latitude E5430 (33.3 ms per frame) must stay in 'full' tier!
  for (let i = 0; i < 45; i++) {
    sampleAdaptiveFpsFrame(gov, 1 / 30, 30);
  }
  assert.equal(gov.tier, 'full', 'Steady 30 FPS on a 30 FPS Lite target must NOT false-trigger degradation');

  // Severe lag spike down to 14 FPS (~71 ms per frame) across >5.5s MUST progressively step down full -> balanced -> performance_guard
  for (let i = 0; i < 95; i++) {
    sampleAdaptiveFpsFrame(gov, 1 / 14, 30);
  }
  assert.equal(gov.tier, 'performance_guard', 'Severe FPS drop on 30 FPS target must enter performance_guard');

  // Resolution scaler must step down smoothly toward minScale=0.68 on 30 FPS lag and recover when smooth
  let scale = 1.0;
  for (let i = 0; i < 8; i++) {
    scale = evaluateAdaptiveResolutionScale(55, scale, true, 30, 0.68);
  }
  assert.ok(scale <= 0.72 && scale >= 0.68, `Expected adaptive DPR scale in [0.68, 0.72], got ${scale}`);

  for (let i = 0; i < 12; i++) {
    scale = evaluateAdaptiveResolutionScale(30, scale, true, 30, 0.68);
  }
  assert.ok(scale > 0.85, `Expected adaptive DPR scale to recover smoothly above 0.85, got ${scale}`);
});

test('Asset sanitizer strips shadows, mipmaps, and heavy PBR maps under Lite budget', () => {
  const e5430 = classifyGpuCapability('Intel(R) HD Graphics 4000', 8, 4, { maxTextureSize: 8192 });
  const liteBudget = resolveSystemLiteBudget(e5430, 'auto', 'auto');

  const tex = new THREE.DataTexture(new Uint8Array(16 * 16 * 4), 16, 16);
  tex.generateMipmaps = true;
  tex.anisotropy = 8;

  const mat = new THREE.MeshPhysicalMaterial({
    map: tex,
    aoMap: tex,
    clearcoat: 0.9,
    sheen: 0.8,
  });
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;

  const group = new THREE.Group();
  group.add(mesh);

  const stats = sanitizeLoadedObjectForBudget(group, liteBudget, { preserveFaceSharpness: true });
  assert.equal(stats.meshesProcessed, 1);
  assert.equal(mesh.castShadow, false);
  assert.equal(mesh.receiveShadow, false);
  assert.equal(tex.generateMipmaps, false);
  assert.equal(tex.anisotropy, 1);
  assert.equal(mat.aoMap, null);
  assert.equal(mat.clearcoat, 0);
  assert.equal(mat.sheen, 0);
});

test('All 4 shared hero Lite GLBs exist, are significantly smaller than full originals, and decode cleanly with Three.js GLTFLoader + MeshoptDecoder', async () => {
  const publicDir = path.resolve(process.cwd(), 'public', 'assets');
  await MeshoptDecoder.ready;

  // Minimal browser shims so Three.js GLTFLoader can decode embedded texture blobs & meshopt buffers in Node
  const g = globalThis as unknown as {
    self?: unknown;
    createImageBitmap?: (blob: Blob) => Promise<{ width: number; height: number; close(): void }>;
  };
  const prevSelf = g.self;
  const prevCreateImageBitmap = g.createImageBitmap;
  g.self = globalThis;
  g.createImageBitmap = async () => ({ width: 64, height: 64, close() {} });

  try {
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);

    for (const [fullRel, liteRel] of Object.entries(HERO_LITE_VARIANT_PATHS)) {
      const fullPath = path.join(publicDir, fullRel);
      const litePath = path.join(publicDir, liteRel);
      assert.ok(fs.existsSync(fullPath), `Missing full hero GLB: ${fullRel}`);
      assert.ok(fs.existsSync(litePath), `Missing Lite hero GLB: ${liteRel}`);

      const fullSize = fs.statSync(fullPath).size;
      const liteSize = fs.statSync(litePath).size;
      assert.ok(
        liteSize < fullSize * 0.75,
        `Lite variant ${liteRel} (${liteSize}B) should be at least 25% smaller than ${fullRel} (${fullSize}B)`
      );

      const fullJson = readGlbJsonChunk(fullPath);
      const liteJson = readGlbJsonChunk(litePath);
      assert.ok((liteJson.meshes?.length ?? 0) > 0, `Lite hero ${liteRel} must contain valid meshes`);
      assert.equal(
        liteJson.skins?.length ?? 0,
        fullJson.skins?.length ?? 0,
        `Lite hero ${liteRel} must preserve full skin/rig structure`
      );

      // End-to-end Three.js GLTFLoader + MeshoptDecoder parse (catches any bufferView/EXT_meshopt_compression offset corruption!)
      const rawBuf = fs.readFileSync(litePath);
      const arrayBuf = rawBuf.buffer.slice(rawBuf.byteOffset, rawBuf.byteOffset + rawBuf.byteLength);
      const parsed = await loader.parseAsync(arrayBuf, '');
      let meshCount = 0;
      let vertexCount = 0;
      parsed.scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          meshCount += 1;
          const pos = (obj as THREE.Mesh).geometry?.getAttribute('position');
          if (pos) vertexCount += pos.count;
        }
      });
      assert.ok(meshCount > 0, `Parsed Lite hero ${liteRel} must have renderable meshes`);
      assert.ok(vertexCount > 500, `Parsed Lite hero ${liteRel} must have decoded vertices (got ${vertexCount})`);
    }
  } finally {
    if (prevSelf === undefined) delete g.self;
    else g.self = prevSelf;
    if (prevCreateImageBitmap === undefined) delete g.createImageBitmap;
    else g.createImageBitmap = prevCreateImageBitmap;
  }

  // Verify global preload mode toggle state
  setGlobalAssetPreloadMode({ liteMode: true, activeHeroId: 'aurelia', lazyPreloadOnlyActiveHero: true });
  assert.equal(isGlobalLiteHeroAssetsEnabled(), true);
  setGlobalAssetPreloadMode({ liteMode: false, activeHeroId: 'aurelia', lazyPreloadOnlyActiveHero: true });
  assert.equal(isGlobalLiteHeroAssetsEnabled(), false);
});

test('Zero backdrop-blur Tailwind classes remain in UI components over WebGL canvas', () => {
  const componentsDir = path.resolve(process.cwd(), 'src', 'components');
  const offenders: string[] = [];
  for (const file of fs.readdirSync(componentsDir)) {
    if (!file.endsWith('.tsx')) continue;
    const raw = fs.readFileSync(path.join(componentsDir, file), 'utf8');
    // Strip single-line and JSX block comments before scanning for Tailwind backdrop-blur utilities
    const stripped = raw
      .replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    if (/\bbackdrop-blur(?:-[a-z0-9[\]]+)?\b/.test(stripped)) {
      offenders.push(file);
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `Found forbidden backdrop-blur classes over WebGL canvas in: ${offenders.join(', ')}`
  );
});

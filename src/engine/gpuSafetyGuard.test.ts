import assert from 'node:assert/strict';
import test from 'node:test';
import { classifyGpuCapability } from './aaaVisualPipeline';
import {
  CH1_MAP_INFLIGHT_KEY,
  clearChapter1MapLoadInFlight,
  GPU_CRASH_SENTINEL_KEY,
  isLowEndSafetyModeActive,
  markChapter1MapLoadInFlight,
  promoteUnfinishedChapter1MapCrash,
  readGpuCrashSentinel,
  readPersistedChapter1MapMode,
  resetGpuCrashSentinel,
  resolveChapter1MapVariant,
  shouldUseHighDetailChapter1Map,
  tripGpuCrashSentinel,
} from './gpuSafetyGuard';

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

test('Dell Latitude E5430 (Core i7-3520M 4 threads, Intel HD Graphics 4000, 8GB RAM) auto-disables 90.3 MB map and locks 30 FPS safety mode', () => {
  const e5430 = classifyGpuCapability(
    'ANGLE (Intel, Intel(R) HD Graphics 4000 Direct3D11 vs_5_0 ps_5_0)',
    8,
    4,
    { maxTextureSize: 8192 }
  );

  assert.equal(e5430.tier, 'integrated');
  assert.equal(e5430.lowPowerLegacyGpu, true);
  assert.equal(e5430.supportsHighDetailChapter1Map, false);
  assert.equal(e5430.recommendedQuality, 'low');
  assert.equal(e5430.shadowMapSize, 0);
  assert.equal(e5430.bloomSupported, false);
  assert.equal(e5430.targetCombatFps, 30);
  assert.ok(e5430.safetyReason && e5430.safetyReason.length > 0);

  assert.equal(resolveChapter1MapVariant(e5430, 'auto'), 'lite');
  assert.equal(resolveChapter1MapVariant(e5430, 'lite_3d'), 'lite');
  assert.equal(resolveChapter1MapVariant(e5430, 'light'), 'none');
  assert.equal(resolveChapter1MapVariant(e5430, 'high_3d'), 'full');
  assert.equal(shouldUseHighDetailChapter1Map(e5430, 'auto'), false);
  assert.equal(shouldUseHighDetailChapter1Map(e5430, 'light'), false);
  // Explicit user override still respected when confirmed in Settings
  assert.equal(shouldUseHighDetailChapter1Map(e5430, 'high_3d'), true);
  assert.equal(isLowEndSafetyModeActive(e5430, 'auto'), true);
});

test('Weak 4-thread CPU with masked GPU string or low MAX_TEXTURE_SIZE also disables heavy 4K map', () => {
  const masked4Core = classifyGpuCapability('ANGLE (Generic GPU)', 8, 4);
  assert.equal(masked4Core.lowPowerLegacyGpu, true);
  assert.equal(masked4Core.supportsHighDetailChapter1Map, false);
  assert.equal(shouldUseHighDetailChapter1Map(masked4Core, 'auto'), false);

  const smallTex = classifyGpuCapability('ANGLE (NVIDIA, GeForce GTX 1060)', 16, 8, {
    maxTextureSize: 4096,
  });
  assert.equal(smallTex.lowPowerLegacyGpu, true);
  assert.equal(smallTex.supportsHighDetailChapter1Map, false);
});

test('Modern discrete GPU enables full 90.3 MB Chapter 1 map and 60 FPS by default, while honoring manual overrides', () => {
  const rtx = classifyGpuCapability(
    'ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11 vs_5_0 ps_5_0)',
    16,
    12,
    { maxTextureSize: 16384 }
  );

  assert.equal(rtx.tier, 'discrete');
  assert.equal(rtx.lowPowerLegacyGpu, false);
  assert.equal(rtx.supportsHighDetailChapter1Map, true);
  assert.equal(rtx.targetCombatFps, 60);
  assert.equal(resolveChapter1MapVariant(rtx, 'auto'), 'full');
  assert.equal(resolveChapter1MapVariant(rtx, 'lite_3d'), 'lite');
  assert.equal(resolveChapter1MapVariant(rtx, 'light'), 'none');
  assert.equal(shouldUseHighDetailChapter1Map(rtx, 'auto'), true);
  assert.equal(shouldUseHighDetailChapter1Map(rtx, 'light'), false);
  assert.equal(isLowEndSafetyModeActive(rtx, 'auto'), false);
  assert.equal(isLowEndSafetyModeActive(rtx, 'on'), true);

  const swift = classifyGpuCapability('Google SwiftShader', 8, 4);
  assert.equal(resolveChapter1MapVariant(swift, 'auto'), 'none');
  assert.equal(resolveChapter1MapVariant(swift, 'lite_3d'), 'lite');
});

test('Crash sentinel promotes unfinished Chapter 1 GLB load after black-screen/shutdown and resets cleanly', () => {
  const storage = createMemoryStorage();

  // Normal safe boot -> not tripped
  assert.equal(promoteUnfinishedChapter1MapCrash(storage).tripped, false);

  // Start loading heavy map -> simulates laptop black-screen / thermal shutdown before 2 stable frames
  markChapter1MapLoadInFlight(storage);
  assert.ok(storage.getItem(CH1_MAP_INFLIGHT_KEY));

  // Next boot immediately promotes inflight marker to persistent Safe Mode latch
  const promoted = promoteUnfinishedChapter1MapCrash(storage);
  assert.equal(promoted.tripped, true);
  assert.equal(storage.getItem(CH1_MAP_INFLIGHT_KEY), null);
  assert.ok(storage.getItem(GPU_CRASH_SENTINEL_KEY));

  // Even a strong GPU profile is locked to lightweight arena while sentinel is tripped
  const guardedRtx = classifyGpuCapability('ANGLE (NVIDIA, NVIDIA GeForce RTX 4070)', 16, 12, {
    crashGuardTripped: promoted.tripped,
    crashReason: promoted.reason,
  });
  assert.equal(guardedRtx.supportsHighDetailChapter1Map, false);
  assert.equal(resolveChapter1MapVariant(guardedRtx, 'auto'), 'none');
  assert.equal(shouldUseHighDetailChapter1Map(guardedRtx, 'auto'), false);
  assert.equal(isLowEndSafetyModeActive(guardedRtx, 'auto'), true);

  // Persisted lite_3d mode is read back cleanly at startup
  storage.setItem(
    'aetherbow_zodiac_save_v1',
    JSON.stringify({ settings: { chapter1MapMode: 'lite_3d' } })
  );
  assert.equal(readPersistedChapter1MapMode(storage), 'lite_3d');

  // User resets crash guard in Settings
  resetGpuCrashSentinel(storage);
  assert.equal(readGpuCrashSentinel(storage).tripped, false);

  // Explicit WebGL context loss also trips sentinel and normal completion clears inflight cleanly
  markChapter1MapLoadInFlight(storage);
  clearChapter1MapLoadInFlight(storage);
  assert.equal(promoteUnfinishedChapter1MapCrash(storage).tripped, false);

  tripGpuCrashSentinel('webglcontextlost', storage);
  assert.equal(readGpuCrashSentinel(storage).tripped, true);
});

test('modelAssets completely skips fetching Chương 1.glb when setChapter1MapPreloadEnabled(false) is active', async () => {
  const prevDoc = globalThis.document;
  const prevFetch = globalThis.fetch;
  globalThis.document = { baseURI: 'http://127.0.0.1:3000/' } as unknown as Document;

  const requestedUrls: string[] = [];
  const validGlb = new ArrayBuffer(24);
  const view = new DataView(validGlb);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, 24, true);

  globalThis.fetch = (async (input: RequestInfo | URL) => {
    const href = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    requestedUrls.push(href);
    return new Response(validGlb.slice(0), {
      status: 200,
      headers: { 'content-type': 'model/gltf-binary', 'content-length': '24' },
    });
  }) as typeof fetch;

  try {
    const mod = await import('./modelAssets');
    mod.setChapter1MapPreloadEnabled(false);
    mod.preloadGameModels();
    await new Promise((r) => setTimeout(r, 60));

    const snap = mod.getModelDownloadProgress();
    assert.equal(snap.status, 'ready');
    assert.equal(
      snap.files.some((f) => f.path === mod.CHAPTER1_MAP_MODEL_ASSET),
      false,
      'Chương 1.glb must not appear in preload list on weak GPUs'
    );
    assert.equal(
      requestedUrls.some((u) => u.includes('chapter1-map') || u.includes('Ch%C6%B0%C6%A1ng')),
      false,
      'Weak GPU must never fetch any bytes of the 90.3 MB Chapter 1 map'
    );

    // Switching to 'lite' preloads ONLY Chương 1 Lite.glb and never touches the 90.3 MB chunk API
    requestedUrls.length = 0;
    mod.setChapter1MapPreloadVariant('lite');
    mod.preloadGameModels();
    await new Promise((r) => setTimeout(r, 60));

    const liteSnap = mod.getModelDownloadProgress();
    assert.equal(liteSnap.status, 'ready');
    const liteEntry = liteSnap.files.find((f) => f.path === mod.CHAPTER1_MAP_MODEL_ASSET);
    assert.ok(liteEntry, 'Lite Chapter 1 map must be included in SplashGate preload list');
    assert.equal(liteEntry.label, mod.CHAPTER1_MAP_LITE_LABEL);
    assert.equal(
      requestedUrls.some((u) => u.includes('Ch%C6%B0%C6%A1ng%201%20Lite.glb')),
      true,
      'Lite variant must fetch Chương 1 Lite.glb'
    );
    assert.equal(
      requestedUrls.some((u) => u.includes('/api/assets/chapter1-map/')),
      false,
      'Lite variant must never hit the 90.3 MB chunk API'
    );

    // Restore default flag for subsequent modules
    mod.setChapter1MapPreloadVariant('full');
  } finally {
    globalThis.document = prevDoc;
    globalThis.fetch = prevFetch;
  }
});

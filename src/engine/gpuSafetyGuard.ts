import type {
  Boss3dModelVariant,
  Chapter1MapMode,
  Chapter1MapVariant,
  GpuProfileSummary,
  HeroId,
  LowEndSafetyMode,
  SystemLiteBudget,
} from '../types/game';
import { classifyGpuCapability, resolveSystemLiteBudget } from './aaaVisualPipeline';

export const GPU_CRASH_SENTINEL_KEY = 'aetherbow_gpu_safe_mode_v1';
export const CH1_MAP_INFLIGHT_KEY = 'aetherbow_ch1_map_inflight_v1';
export const BOSS_3D_INFLIGHT_KEY = 'aetherbow_boss_3d_inflight_v1';
export const GLOBAL_ASSET_INFLIGHT_KEY = 'aetherbow_heavy_asset_inflight_v1';

export interface GpuCrashSentinelState {
  tripped: boolean;
  reason?: string;
  trippedAt?: number;
}

interface RawHardwareProbe {
  rendererString: string;
  deviceMemoryGb?: number;
  hardwareConcurrency: number;
  maxTextureSize?: number;
  maxRenderbufferSize?: number;
  maxTextureImageUnits?: number;
}

let cachedRawProbe: RawHardwareProbe | null = null;
let cachedStartupProfile: GpuProfileSummary | null = null;

function getSafeStorage(override?: Storage | null): Storage | null {
  if (override !== undefined) return override;
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readGpuCrashSentinel(storage?: Storage | null): GpuCrashSentinelState {
  const store = getSafeStorage(storage);
  if (!store) return { tripped: false };
  try {
    const raw = store.getItem(GPU_CRASH_SENTINEL_KEY);
    if (!raw) return { tripped: false };
    const parsed = JSON.parse(raw) as Partial<GpuCrashSentinelState>;
    if (parsed && parsed.tripped) {
      return {
        tripped: true,
        reason: typeof parsed.reason === 'string' ? parsed.reason : undefined,
        trippedAt: typeof parsed.trippedAt === 'number' ? parsed.trippedAt : undefined,
      };
    }
  } catch {
    // Ignore malformed storage entry
  }
  return { tripped: false };
}

export function tripGpuCrashSentinel(
  reason: string,
  storage?: Storage | null
): GpuCrashSentinelState {
  const next: GpuCrashSentinelState = {
    tripped: true,
    reason,
    trippedAt: Date.now(),
  };
  const store = getSafeStorage(storage);
  if (store) {
    try {
      store.setItem(GPU_CRASH_SENTINEL_KEY, JSON.stringify(next));
      store.removeItem(CH1_MAP_INFLIGHT_KEY);
      store.removeItem(BOSS_3D_INFLIGHT_KEY);
      store.removeItem(GLOBAL_ASSET_INFLIGHT_KEY);
    } catch {
      // Ignore quota/privacy errors
    }
  }
  cachedStartupProfile = null;
  return next;
}

export function resetGpuCrashSentinel(storage?: Storage | null): void {
  const store = getSafeStorage(storage);
  if (store) {
    try {
      store.removeItem(GPU_CRASH_SENTINEL_KEY);
      store.removeItem(CH1_MAP_INFLIGHT_KEY);
      store.removeItem(BOSS_3D_INFLIGHT_KEY);
      store.removeItem(GLOBAL_ASSET_INFLIGHT_KEY);
    } catch {
      // Ignore storage errors
    }
  }
  cachedStartupProfile = null;
}

/**
 * Records that a heavy 3D asset (any Chapter map, Boss, Hero, or Lobby GLB) is actively
 * being parsed/uploaded to WebGL. If the laptop black-screens or shuts down before stable
 * frames complete, the next boot promotes this marker into persistent Safe/Lite Mode.
 */
export function markHeavyAssetLoadInFlight(
  assetLabel: string,
  storage?: Storage | null
): void {
  const store = getSafeStorage(storage);
  if (!store) return;
  try {
    store.setItem(
      GLOBAL_ASSET_INFLIGHT_KEY,
      JSON.stringify({ label: assetLabel.slice(0, 80), at: Date.now() })
    );
  } catch {
    // Ignore storage errors
  }
}

export function clearHeavyAssetLoadInFlight(storage?: Storage | null): void {
  const store = getSafeStorage(storage);
  if (!store) return;
  try {
    store.removeItem(GLOBAL_ASSET_INFLIGHT_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function markChapter1MapLoadInFlight(storage?: Storage | null): void {
  const store = getSafeStorage(storage);
  if (!store) return;
  try {
    store.setItem(CH1_MAP_INFLIGHT_KEY, String(Date.now()));
  } catch {
    // Ignore storage errors
  }
}

export function clearChapter1MapLoadInFlight(storage?: Storage | null): void {
  const store = getSafeStorage(storage);
  if (!store) return;
  try {
    store.removeItem(CH1_MAP_INFLIGHT_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function markBoss3dLoadInFlight(storage?: Storage | null): void {
  const store = getSafeStorage(storage);
  if (!store) return;
  try {
    store.setItem(BOSS_3D_INFLIGHT_KEY, String(Date.now()));
  } catch {
    // Ignore storage errors
  }
}

export function clearBoss3dLoadInFlight(storage?: Storage | null): void {
  const store = getSafeStorage(storage);
  if (!store) return;
  try {
    store.removeItem(BOSS_3D_INFLIGHT_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Checks whether a previous session aborted mid-load of ANY heavy 3D map, Boss, Hero,
 * or Lobby GLB (e.g. Windows GPU TDR black screen or thermal shutdown) and promotes it
 * into a persistent Safe/Lite Mode latch before any heavy asset is requested.
 */
export function promoteUnfinishedChapter1MapCrash(
  storage?: Storage | null
): GpuCrashSentinelState {
  const store = getSafeStorage(storage);
  if (store) {
    try {
      const inflight = store.getItem(CH1_MAP_INFLIGHT_KEY);
      if (inflight) {
        return tripGpuCrashSentinel(
          'Phát hiện máy bị gián đoạn khi nạp Bản Đồ 3D Chương 1 ở phiên trước · Đã tự bật Chế Độ An Toàn',
          store
        );
      }
      const bossInflight = store.getItem(BOSS_3D_INFLIGHT_KEY);
      if (bossInflight) {
        return tripGpuCrashSentinel(
          'Phát hiện máy bị gián đoạn khi nạp Mô Hình Boss 3D ở phiên trước · Đã tự bật Chế Độ An Toàn',
          store
        );
      }
      const globalInflight = store.getItem(GLOBAL_ASSET_INFLIGHT_KEY);
      if (globalInflight) {
        let assetLabel = 'tài nguyên 3D';
        try {
          const parsed = JSON.parse(globalInflight) as { label?: string };
          if (parsed?.label) assetLabel = parsed.label;
        } catch {
          assetLabel = globalInflight.slice(0, 60);
        }
        return tripGpuCrashSentinel(
          `Phát hiện máy bị gián đoạn khi nạp ${assetLabel} ở phiên trước · Đã tự bật Chế Độ Lite An Toàn`,
          store
        );
      }
    } catch {
      // Ignore storage errors
    }
  }
  return readGpuCrashSentinel(store);
}

export const promoteUnfinishedHeavyAssetCrash = promoteUnfinishedChapter1MapCrash;

function probeBrowserHardwareOnce(): RawHardwareProbe {
  if (cachedRawProbe) return cachedRawProbe;

  const nav =
    typeof navigator !== 'undefined'
      ? (navigator as Navigator & { deviceMemory?: number })
      : undefined;
  const hardwareConcurrency = nav?.hardwareConcurrency || 4;
  const deviceMemoryGb = nav?.deviceMemory;

  let rendererString = '';
  let maxTextureSize: number | undefined;
  let maxRenderbufferSize: number | undefined;
  let maxTextureImageUnits: number | undefined;

  if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
    try {
      const probeCanvas = document.createElement('canvas');
      const gl =
        (probeCanvas.getContext('webgl2', { powerPreference: 'low-power' }) as
          | WebGL2RenderingContext
          | null) ||
        (probeCanvas.getContext('webgl', { powerPreference: 'low-power' }) as
          | WebGLRenderingContext
          | null);
      if (gl) {
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        rendererString = String(gl.getParameter(param) ?? '');
        const texSize = Number(gl.getParameter(gl.MAX_TEXTURE_SIZE));
        if (Number.isFinite(texSize) && texSize > 0) {
          maxTextureSize = texSize;
        }
        const rbSize = Number(gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
        if (Number.isFinite(rbSize) && rbSize > 0) {
          maxRenderbufferSize = rbSize;
        }
        const texUnits = Number(gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS));
        if (Number.isFinite(texUnits) && texUnits > 0) {
          maxTextureImageUnits = texUnits;
        }
        gl.getExtension('WEBGL_lose_context')?.loseContext();
      }
    } catch {
      // Fall back safely to conservative software/low-end classification
    }
  }

  cachedRawProbe = {
    rendererString,
    deviceMemoryGb,
    hardwareConcurrency,
    maxTextureSize,
    maxRenderbufferSize,
    maxTextureImageUnits,
  };
  return cachedRawProbe;
}

/**
 * Synchronously detects the host CPU/GPU/RAM/VRAM profile + Crash Sentinel state
 * BEFORE any 3D asset preload begins. Shared by SplashGate, modelAssets, and GameEngine.
 */
export function detectStartupGpuProfile(storage?: Storage | null): GpuProfileSummary {
  if (cachedStartupProfile && storage === undefined) {
    return cachedStartupProfile;
  }
  const sentinel = promoteUnfinishedChapter1MapCrash(storage);
  const raw = probeBrowserHardwareOnce();
  const profile = classifyGpuCapability(
    raw.rendererString,
    raw.deviceMemoryGb,
    raw.hardwareConcurrency,
    {
      maxTextureSize: raw.maxTextureSize,
      maxRenderbufferSize: raw.maxRenderbufferSize,
      maxTextureImageUnits: raw.maxTextureImageUnits,
      crashGuardTripped: sentinel.tripped,
      crashReason: sentinel.reason,
    }
  );
  if (storage === undefined) {
    cachedStartupProfile = profile;
  }
  return profile;
}

export function refreshStartupGpuProfile(storage?: Storage | null): GpuProfileSummary {
  cachedStartupProfile = null;
  return detectStartupGpuProfile(storage);
}

export function resolveChapter1MapVariant(
  profile: GpuProfileSummary,
  mode: Chapter1MapMode = 'auto',
  lowEndSafetyMode: LowEndSafetyMode = 'auto'
): Chapter1MapVariant {
  if (mode === 'light') return 'none';
  if (mode === 'lite_3d') return 'lite';
  if (mode === 'high_3d') return 'full';
  // Global Lite mode pins all heavy maps to Lite unless explicitly overridden
  if (profile.crashGuardTripped || profile.tier === 'software') return 'none';
  if (lowEndSafetyMode === 'on') return 'lite';
  if (profile.supportsHighDetailChapter1Map !== false && !profile.lowPowerLegacyGpu) {
    return 'full';
  }
  return 'lite';
}

export function shouldUseHighDetailChapter1Map(
  profile: GpuProfileSummary,
  mode: Chapter1MapMode = 'auto',
  lowEndSafetyMode: LowEndSafetyMode = 'auto'
): boolean {
  return resolveChapter1MapVariant(profile, mode, lowEndSafetyMode) === 'full';
}

export function resolveBoss3dModelVariant(
  profile: GpuProfileSummary,
  lowEndSafetyMode: LowEndSafetyMode = 'auto',
  chapter1MapMode: Chapter1MapMode = 'auto'
): Boss3dModelVariant {
  if (profile.crashGuardTripped || profile.tier === 'software') return 'none';
  if (chapter1MapMode === 'light') return 'none';
  if (lowEndSafetyMode === 'on' || chapter1MapMode === 'lite_3d') return 'lite';
  if (chapter1MapMode === 'high_3d') return 'high';
  if (
    profile.tier === 'discrete' &&
    !profile.lowPowerLegacyGpu &&
    profile.supportsHighDetailChapter1Map !== false
  ) {
    return 'high';
  }
  // Integrated/legacy GPUs (e.g. Dell Latitude E5430 / Intel HD 4000) always use the Lite GLB (< 1 MB)
  return 'lite';
}

/**
 * Resolves the active asset quality tier ('lite' vs 'high') for ALL shared 3D models
 * (Heroes, Skins, Pets, Mounts, Wings, Artifacts, Halos, Bosses, Mobs, and future content).
 */
export function resolveGlobalAssetVariant(
  profile: GpuProfileSummary,
  lowEndSafetyMode: LowEndSafetyMode = 'auto',
  chapter1MapMode: Chapter1MapMode = 'auto'
): 'lite' | 'high' {
  const budget = resolveSystemLiteBudget(profile, lowEndSafetyMode, chapter1MapMode);
  return budget.assetVariant === 'high' ? 'high' : 'lite';
}

export function getSystemLiteBudget(
  profile: GpuProfileSummary,
  lowEndSafetyMode: LowEndSafetyMode = 'auto',
  chapter1MapMode: Chapter1MapMode = 'auto'
): SystemLiteBudget {
  return resolveSystemLiteBudget(profile, lowEndSafetyMode, chapter1MapMode);
}

export function isLowEndSafetyModeActive(
  profile: GpuProfileSummary,
  mode: LowEndSafetyMode = 'auto'
): boolean {
  if (profile.tier === 'software') return true;
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  return Boolean(
    profile.lowPowerLegacyGpu ||
      profile.crashGuardTripped ||
      profile.tier !== 'discrete' ||
      profile.deviceTier === 'ultra_lite' ||
      profile.deviceTier === 'lite'
  );
}

function getCandidateSaveStorageKeys(store: Storage): string[] {
  const owner = (() => {
    try {
      return store.getItem('artemis_3d_save_owner_v1');
    } catch {
      return null;
    }
  })();

  const uidKeys: string[] = [];
  try {
    for (let i = 0; i < store.length; i += 1) {
      const k = store.key(i);
      if (k && k.startsWith('artemis_3d_save_uid_')) {
        uidKeys.push(k);
      }
    }
  } catch {
    // Ignore storage enumeration errors
  }

  const ordered =
    owner === 'guest'
      ? [
          'artemis_3d_guest_save_v1',
          'artemis_3d_save_v1',
          ...uidKeys,
          'aetherbow_zodiac_save_v1',
          'aetherbow_guest_save_v1',
        ]
      : [
          ...uidKeys,
          'artemis_3d_guest_save_v1',
          'artemis_3d_save_v1',
          'aetherbow_zodiac_save_v1',
          'aetherbow_guest_save_v1',
        ];
  return Array.from(new Set(ordered));
}

function readPersistedSaveSnapshot(storage?: Storage | null): {
  selectedHeroId?: HeroId;
  settings?: {
    chapter1MapMode?: unknown;
    lowEndSafetyMode?: unknown;
  };
} | null {
  const store = getSafeStorage(storage);
  if (!store) return null;
  try {
    for (const key of getCandidateSaveStorageKeys(store)) {
      const raw = store.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as {
        selectedHeroId?: HeroId;
        settings?: { chapter1MapMode?: unknown; lowEndSafetyMode?: unknown };
      };
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Reads saved Chapter1MapMode from actual local save storage at very first boot so
 * SplashGate knows whether the user explicitly pinned 'light', 'lite_3d', or 'high_3d'.
 */
export function readPersistedChapter1MapMode(storage?: Storage | null): Chapter1MapMode {
  const parsed = readPersistedSaveSnapshot(storage);
  const mode = parsed?.settings?.chapter1MapMode;
  if (mode === 'lite_3d' || mode === 'light' || mode === 'high_3d' || mode === 'auto') {
    return mode;
  }
  return 'auto';
}

/**
 * Reads saved Global Lite Mode preference before any 3D asset preload begins.
 */
export function readPersistedLowEndSafetyMode(storage?: Storage | null): LowEndSafetyMode {
  const parsed = readPersistedSaveSnapshot(storage);
  const mode = parsed?.settings?.lowEndSafetyMode;
  if (mode === 'auto' || mode === 'on' || mode === 'off') {
    return mode;
  }
  return 'auto';
}

/**
 * Reads the player's currently selected hero before preload so low-end devices
 * only fetch that hero's Lite 3D model at boot instead of preloading all heroes.
 */
export function readPersistedSelectedHeroId(storage?: Storage | null): HeroId {
  const parsed = readPersistedSaveSnapshot(storage);
  const id = parsed?.selectedHeroId;
  if (id === 'artemis' || id === 'hatsune_miku' || id === 'aurelia') {
    return id;
  }
  return 'artemis';
}

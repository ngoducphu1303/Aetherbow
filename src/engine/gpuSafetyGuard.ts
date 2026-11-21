import type {
  Chapter1MapMode,
  Chapter1MapVariant,
  GpuProfileSummary,
  LowEndSafetyMode,
} from '../types/game';
import { classifyGpuCapability } from './aaaVisualPipeline';

export const GPU_CRASH_SENTINEL_KEY = 'aetherbow_gpu_safe_mode_v1';
export const CH1_MAP_INFLIGHT_KEY = 'aetherbow_ch1_map_inflight_v1';

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
    } catch {
      // Ignore storage errors
    }
  }
  cachedStartupProfile = null;
}

/**
 * Records that the 90.3 MB Chapter 1 GLB map is actively being parsed/uploaded
 * to WebGL. If the laptop black-screens or shuts down before 2 stable frames
 * render, the next boot detects this unfinished marker and automatically locks
 * Safe Mode so the crash never loops.
 */
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

/**
 * Checks whether a previous session aborted mid-load of Chương 1.glb (e.g.
 * Windows GPU TDR black screen or thermal shutdown) and promotes it into a
 * persistent Safe Mode latch before any heavy asset is requested.
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
    } catch {
      // Ignore storage errors
    }
  }
  return readGpuCrashSentinel(store);
}

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
  };
  return cachedRawProbe;
}

/**
 * Synchronously detects the host GPU/CPU/RAM profile + Crash Sentinel state
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
  mode: Chapter1MapMode = 'auto'
): Chapter1MapVariant {
  if (mode === 'light') return 'none';
  if (mode === 'lite_3d') return 'lite';
  if (mode === 'high_3d') return 'full';
  // Auto mode: software WebGL or crash-tripped sessions fall back to ultra-light procedural arena;
  // strong discrete GPUs load the full 90.3 MB uncompressed GLB; legacy/weak laptops (e.g. Intel HD 4000)
  // automatically load the lightweight 3D Lite GLB (~30k tris, 1024px albedo).
  if (profile.crashGuardTripped || profile.tier === 'software') return 'none';
  if (profile.supportsHighDetailChapter1Map !== false && !profile.lowPowerLegacyGpu) {
    return 'full';
  }
  return 'lite';
}

export function shouldUseHighDetailChapter1Map(
  profile: GpuProfileSummary,
  mode: Chapter1MapMode = 'auto'
): boolean {
  return resolveChapter1MapVariant(profile, mode) === 'full';
}

export function isLowEndSafetyModeActive(
  profile: GpuProfileSummary,
  mode: LowEndSafetyMode = 'auto'
): boolean {
  if (profile.tier === 'software') return true;
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  return Boolean(
    profile.lowPowerLegacyGpu || profile.crashGuardTripped || profile.tier !== 'discrete'
  );
}

/**
 * Reads saved Chapter1MapMode from local save storage at very first boot so
 * SplashGate knows whether the user explicitly pinned 'light' or 'high_3d'.
 */
export function readPersistedChapter1MapMode(storage?: Storage | null): Chapter1MapMode {
  const store = getSafeStorage(storage);
  if (!store) return 'auto';
  try {
    for (const key of ['aetherbow_zodiac_save_v1', 'aetherbow_guest_save_v1']) {
      const raw = store.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as { settings?: { chapter1MapMode?: unknown } };
      const mode = parsed?.settings?.chapter1MapMode;
      if (mode === 'lite_3d' || mode === 'light' || mode === 'high_3d' || mode === 'auto') {
        return mode;
      }
    }
  } catch {
    // Ignore parse errors
  }
  return 'auto';
}

import type { GpuWatchdogStage } from '../types/game';

export interface ZodiacChapterLightingPalette {
  chapterId: number;
  zodiacName: string;
  keyLightHex: number;
  keyIntensity: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensity: number;
  fogHex: number;
  fogNear: number;
  fogFar: number;
  backdropHex: number;
  architectureAccentHex: number;
  /** Hard Dell Latitude E5430 / Intel HD 4000 guarantee: strictly 0 new PointLights */
  newPointLightsAdded: 0;
}

export type CombatVfxFaction = 'player' | 'enemy' | 'boss';

export interface FactionVfxPalette {
  faction: CombatVfxFaction;
  primaryHex: number;
  secondaryHex: number;
  accentHex: number;
  trailHex: number;
  shapeToken: 'crisp_diamond' | 'crimson_ring' | 'imperial_octagon';
}

export interface DynamicVfxBudget {
  watchdogStage: GpuWatchdogStage;
  maxParticlesPerBurst: number;
  maxActiveShockwaves: number;
  particleDensityScale: number;
  allowSecondaryTrails: boolean;
  allowScreenFlash: boolean;
  newPointLightsAdded: 0;
}

/**
 * 12-Chapter Zodiac Lighting & Fog Director (Phase 4 Pillar 2).
 * Follows 60-30-10 warm/cool contrast and strictly adds 0 dynamic PointLights.
 */
export const ZODIAC_CHAPTER_LIGHTING_PALETTES: readonly ZodiacChapterLightingPalette[] = [
  {
    chapterId: 1,
    zodiacName: 'Sư Tử Nhật Luân',
    keyLightHex: 0xffdf9e,
    keyIntensity: 1.48,
    hemiSkyHex: 0xffe4b5,
    hemiGroundHex: 0x261d14,
    hemiIntensity: 0.9,
    fogHex: 0x16121f,
    fogNear: 26,
    fogFar: 68,
    backdropHex: 0x120f1a,
    architectureAccentHex: 0xf59e0b,
    newPointLightsAdded: 0,
  },
  {
    chapterId: 2,
    zodiacName: 'Hỏa Sơn Bạch Dương',
    keyLightHex: 0xffb07c,
    keyIntensity: 1.52,
    hemiSkyHex: 0xf97316,
    hemiGroundHex: 0x241210,
    hemiIntensity: 0.86,
    fogHex: 0x1f0f10,
    fogNear: 24,
    fogFar: 64,
    backdropHex: 0x190b0c,
    architectureAccentHex: 0xf97316,
    newPointLightsAdded: 0,
  },
  {
    chapterId: 3,
    zodiacName: 'Thánh Địa Kim Ngưu',
    keyLightHex: 0xd9f99d,
    keyIntensity: 1.4,
    hemiSkyHex: 0x86efac,
    hemiGroundHex: 0x0d261b,
    hemiIntensity: 0.9,
    fogHex: 0x0c1b18,
    fogNear: 25,
    fogFar: 66,
    backdropHex: 0x091614,
    architectureAccentHex: 0x10b981,
    newPointLightsAdded: 0,
  },
  {
    chapterId: 4,
    zodiacName: 'Đấu Trường Song Tử',
    keyLightHex: 0xbce6ff,
    keyIntensity: 1.46,
    hemiSkyHex: 0x7dd3fc,
    hemiGroundHex: 0x1e1b4b,
    hemiIntensity: 0.92,
    fogHex: 0x10172b,
    fogNear: 26,
    fogFar: 70,
    backdropHex: 0x0b1020,
    architectureAccentHex: 0x38bdf8,
    newPointLightsAdded: 0,
  },
  {
    chapterId: 5,
    zodiacName: 'Nguyệt Triều Cự Giải',
    keyLightHex: 0xc7d2fe,
    keyIntensity: 1.38,
    hemiSkyHex: 0x93c5fd,
    hemiGroundHex: 0x0f1d33,
    hemiIntensity: 0.88,
    fogHex: 0x0c1629,
    fogNear: 24,
    fogFar: 65,
    backdropHex: 0x081020,
    architectureAccentHex: 0x60a5fa,
    newPointLightsAdded: 0,
  },
  {
    chapterId: 6,
    zodiacName: 'Thánh Điện Xử Nữ',
    keyLightHex: 0xfef3c7,
    keyIntensity: 1.44,
    hemiSkyHex: 0xa7f3d0,
    hemiGroundHex: 0x1c2520,
    hemiIntensity: 0.9,
    fogHex: 0x131d1d,
    fogNear: 26,
    fogFar: 68,
    backdropHex: 0x0e1617,
    architectureAccentHex: 0x34d399,
    newPointLightsAdded: 0,
  },
  {
    chapterId: 7,
    zodiacName: 'Phán Quyết Thiên Bình',
    keyLightHex: 0xfde68a,
    keyIntensity: 1.46,
    hemiSkyHex: 0xe0e7ff,
    hemiGroundHex: 0x221c33,
    hemiIntensity: 0.9,
    fogHex: 0x151428,
    fogNear: 26,
    fogFar: 68,
    backdropHex: 0x100f20,
    architectureAccentHex: 0xfbbf24,
    newPointLightsAdded: 0,
  },
  {
    chapterId: 8,
    zodiacName: 'Vực Sâu Bọ Cạp',
    keyLightHex: 0xf5d0fe,
    keyIntensity: 1.38,
    hemiSkyHex: 0xc084fc,
    hemiGroundHex: 0x210d24,
    hemiIntensity: 0.84,
    fogHex: 0x1a0c21,
    fogNear: 22,
    fogFar: 60,
    backdropHex: 0x13081a,
    architectureAccentHex: 0xc026d3,
    newPointLightsAdded: 0,
  },
  {
    chapterId: 9,
    zodiacName: 'Tinh Nguyên Nhân Mã',
    keyLightHex: 0xfed7aa,
    keyIntensity: 1.5,
    hemiSkyHex: 0xfbbf24,
    hemiGroundHex: 0x261a14,
    hemiIntensity: 0.88,
    fogHex: 0x1b1318,
    fogNear: 26,
    fogFar: 68,
    backdropHex: 0x140e12,
    architectureAccentHex: 0xfb923c,
    newPointLightsAdded: 0,
  },
  {
    chapterId: 10,
    zodiacName: 'Hàn Đỉnh Ma Kết',
    keyLightHex: 0xe0f2fe,
    keyIntensity: 1.42,
    hemiSkyHex: 0xbae6fd,
    hemiGroundHex: 0x172030,
    hemiIntensity: 0.9,
    fogHex: 0x101826,
    fogNear: 25,
    fogFar: 66,
    backdropHex: 0x0b121e,
    architectureAccentHex: 0x7dd3fc,
    newPointLightsAdded: 0,
  },
  {
    chapterId: 11,
    zodiacName: 'Lôi Vực Bảo Bình',
    keyLightHex: 0xa5f3fc,
    keyIntensity: 1.46,
    hemiSkyHex: 0x38bdf8,
    hemiGroundHex: 0x121d36,
    hemiIntensity: 0.9,
    fogHex: 0x0d172c,
    fogNear: 25,
    fogFar: 67,
    backdropHex: 0x091122,
    architectureAccentHex: 0x22d3ee,
    newPointLightsAdded: 0,
  },
  {
    chapterId: 12,
    zodiacName: 'Thiên Hải Song Ngư',
    keyLightHex: 0xe9d5ff,
    keyIntensity: 1.48,
    hemiSkyHex: 0x818cf8,
    hemiGroundHex: 0x161436,
    hemiIntensity: 0.92,
    fogHex: 0x11122e,
    fogNear: 26,
    fogFar: 70,
    backdropHex: 0x0b0c22,
    architectureAccentHex: 0xa855f7,
    newPointLightsAdded: 0,
  },
] as const;

export function resolveZodiacChapterLighting(chapterId: number): ZodiacChapterLightingPalette {
  const clamped = Math.max(1, Math.min(12, Math.floor(chapterId || 1)));
  return ZODIAC_CHAPTER_LIGHTING_PALETTES[clamped - 1];
}

/**
 * Enforces colorblind-safe faction VFX separation:
 * - Player: radiant gold / ice cyan / crisp jade
 * - Enemy: crimson / vermilion (shifts to warm amber-orange in colorblind mode)
 * - Boss: dark violet / crimson imperial (paired with octagonal telegraph geometry)
 */
export function resolveFactionVfxPalette(
  faction: CombatVfxFaction,
  colorblindSafe = false
): FactionVfxPalette {
  if (faction === 'player') {
    return colorblindSafe
      ? {
          faction: 'player',
          primaryHex: 0x38bdf8,
          secondaryHex: 0xfef08a,
          accentHex: 0xffffff,
          trailHex: 0x7dd3fc,
          shapeToken: 'crisp_diamond',
        }
      : {
          faction: 'player',
          primaryHex: 0xfacc15,
          secondaryHex: 0x38bdf8,
          accentHex: 0x34d399,
          trailHex: 0xfde68a,
          shapeToken: 'crisp_diamond',
        };
  }

  if (faction === 'boss') {
    return colorblindSafe
      ? {
          faction: 'boss',
          primaryHex: 0xe879f9,
          secondaryHex: 0xf97316,
          accentHex: 0xfef08a,
          trailHex: 0xc026d3,
          shapeToken: 'imperial_octagon',
        }
      : {
          faction: 'boss',
          primaryHex: 0xa855f7,
          secondaryHex: 0xe11d48,
          accentHex: 0xf43f5e,
          trailHex: 0x7e22ce,
          shapeToken: 'imperial_octagon',
        };
  }

  return colorblindSafe
    ? {
        faction: 'enemy',
        primaryHex: 0xf97316,
        secondaryHex: 0xfb923c,
        accentHex: 0xfef08a,
        trailHex: 0xea580c,
        shapeToken: 'crimson_ring',
      }
    : {
        faction: 'enemy',
        primaryHex: 0xef4444,
        secondaryHex: 0xf43f5e,
        accentHex: 0xfb7185,
        trailHex: 0xb91c1c,
        shapeToken: 'crimson_ring',
      };
}

/**
 * Computes live particle & shockwave budgets from GPU Watchdog tier (0..4),
 * low-end Lite status, and active combat density so low-end laptops (Dell E5430)
 * never suffer WebGL stalls during dense AoE/Boss bursts.
 */
export function resolveDynamicVfxBudget(input: {
  watchdogStage: GpuWatchdogStage;
  isLowEndGpu: boolean;
  reducedMotion: boolean;
  activeEnemies: number;
  activeProjectiles: number;
}): DynamicVfxBudget {
  const stage: GpuWatchdogStage = input.isLowEndGpu
    ? (Math.max(2, input.watchdogStage) as GpuWatchdogStage)
    : input.watchdogStage;

  const baseMaxParticles: Record<GpuWatchdogStage, number> = {
    0: 22,
    1: 16,
    2: 11,
    3: 7,
    4: 4,
  };
  const baseMaxShockwaves: Record<GpuWatchdogStage, number> = {
    0: 10,
    1: 8,
    2: 5,
    3: 3,
    4: 2,
  };
  const baseDensityScale: Record<GpuWatchdogStage, number> = {
    0: 1.0,
    1: 0.78,
    2: 0.56,
    3: 0.36,
    4: 0.22,
  };

  const entityLoad = Math.max(0, input.activeEnemies) + Math.max(0, input.activeProjectiles) * 0.35;
  const crowdThrottle =
    entityLoad >= 28 ? 0.52 : entityLoad >= 18 ? 0.72 : entityLoad >= 12 ? 0.86 : 1.0;
  const motionFactor = input.reducedMotion ? 0.45 : 1.0;

  const maxParticlesPerBurst = Math.max(
    2,
    Math.round(baseMaxParticles[stage] * crowdThrottle * motionFactor)
  );
  const maxActiveShockwaves = Math.max(
    1,
    Math.round(baseMaxShockwaves[stage] * (crowdThrottle < 0.75 ? 0.75 : 1) * (input.reducedMotion ? 0.6 : 1))
  );
  const particleDensityScale =
    Math.round(Math.max(0.16, baseDensityScale[stage] * crowdThrottle * motionFactor) * 100) / 100;

  return {
    watchdogStage: stage,
    maxParticlesPerBurst,
    maxActiveShockwaves,
    particleDensityScale,
    allowSecondaryTrails: stage <= 1 && !input.reducedMotion && crowdThrottle >= 0.75,
    allowScreenFlash: stage <= 2 && !input.reducedMotion,
    newPointLightsAdded: 0,
  };
}

export function clampParticleBurstCount(requestedCount: number, budget: DynamicVfxBudget): number {
  if (requestedCount <= 0) return 0;
  const scaled = Math.round(requestedCount * budget.particleDensityScale);
  return Math.max(1, Math.min(budget.maxParticlesPerBurst, scaled));
}

export interface DynamicPointLightPolicy {
  enableHeroLight: boolean;
  maxImpactPointLights: number;
  flashScale: number;
  totalScenePointLights: number;
}

/**
 * Resolves exact Three.js PointLight attachment policy so low-end / Intel HD 4000
 * devices (Dell Latitude E5430), Lite Mode, SoftwareGL, or throttled Watchdog >= 2
 * detach all PointLights from the scene (compiling fragment shaders with NUM_POINT_LIGHTS=0).
 * Also applies independent Anti-Flash (reduceScreenFlash) damping on high-end devices.
 */
export function resolveDynamicPointLightPolicy(input: {
  lowEndGpu: boolean;
  isSoftwareGl: boolean;
  liteActive: boolean;
  graphicsQuality?: 'low' | 'medium' | 'high';
  watchdogStage: GpuWatchdogStage;
  reducedMotion?: boolean;
  reduceScreenFlash?: boolean;
}): DynamicPointLightPolicy {
  const zeroPointLightMode =
    input.lowEndGpu ||
    input.isSoftwareGl ||
    input.liteActive ||
    input.graphicsQuality === 'low' ||
    input.watchdogStage >= 2;

  if (zeroPointLightMode) {
    return {
      enableHeroLight: false,
      maxImpactPointLights: 0,
      flashScale: 0,
      totalScenePointLights: 0,
    };
  }

  const antiFlash = Boolean(input.reduceScreenFlash || input.reducedMotion);
  const maxImpactPointLights = antiFlash ? 1 : input.watchdogStage >= 1 ? 1 : 2;
  const flashScale = antiFlash ? 0.25 : input.watchdogStage >= 1 ? 0.65 : 1.0;

  return {
    enableHeroLight: true,
    maxImpactPointLights,
    flashScale,
    totalScenePointLights: 1 + maxImpactPointLights,
  };
}

import type { GraphicsQuality } from '../types/game';

/**
 * 12-Chapter Zodiac Lighting & Dynamic VFX Budget Director.
 * Keeps strictly 0 dynamic PointLights on Dell Latitude E5430 (Intel HD 4000),
 * Software WebGL, Lite Mode, or GPU Watchdog Stage >= 2 while giving every
 * chapter a distinct warm/cool directional + hemisphere + fog identity and
 * readable faction VFX separation (Player vs Enemy vs Boss).
 */

export interface ZodiacChapterLightingProfile {
  chapterId: number;
  zodiacLabel: string;
  backdropHex: number;
  fogHex: number;
  keyLightHex: number;
  keyIntensity: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  hemiIntensity: number;
  playerVfxHex: number;
  enemyVfxHex: number;
  bossVfxHex: number;
}

export interface DynamicPointLightPolicyInput {
  lowEndGpu: boolean;
  isSoftwareGl: boolean;
  liteActive: boolean;
  graphicsQuality: GraphicsQuality;
  watchdogStage: number;
  reducedMotion: boolean;
  reduceScreenFlash: boolean;
}

export interface DynamicPointLightPolicy {
  enableHeroLight: boolean;
  maxImpactPointLights: number;
  flashScale: number;
  zeroPointLightEnforced: boolean;
}

export interface DynamicVfxBudgetInput {
  watchdogStage: number;
  isLowEndGpu: boolean;
  reducedMotion: boolean;
  activeEnemies: number;
  activeProjectiles: number;
}

export interface DynamicVfxBudget {
  maxParticlesPerBurst: number;
  particleCountScale: number;
  maxActiveShockwaves: number;
  crowdThrottleActive: boolean;
}

export const ZODIAC_CHAPTER_LIGHTING: ReadonlyArray<ZodiacChapterLightingProfile> = [
  {
    chapterId: 1,
    zodiacLabel: 'Sư Tử Nhật Luân',
    backdropHex: 0x0e1326,
    fogHex: 0x171d36,
    keyLightHex: 0xfff0cc,
    keyIntensity: 1.72,
    hemiSkyHex: 0x9ec5fe,
    hemiGroundHex: 0x3b2c1d,
    hemiIntensity: 0.78,
    playerVfxHex: 0xfbbf24,
    enemyVfxHex: 0xf43f5e,
    bossVfxHex: 0xd946ef,
  },
  {
    chapterId: 2,
    zodiacLabel: 'Hỏa Sơn Bạch Dương',
    backdropHex: 0x1a0d12,
    fogHex: 0x261217,
    keyLightHex: 0xffc699,
    keyIntensity: 1.68,
    hemiSkyHex: 0xffa07a,
    hemiGroundHex: 0x2d140f,
    hemiIntensity: 0.72,
    playerVfxHex: 0x38bdf8,
    enemyVfxHex: 0xf97316,
    bossVfxHex: 0xef4444,
  },
  {
    chapterId: 3,
    zodiacLabel: 'Thánh Địa Kim Ngưu',
    backdropHex: 0x0b1817,
    fogHex: 0x112421,
    keyLightHex: 0xecfccb,
    keyIntensity: 1.64,
    hemiSkyHex: 0x6ee7b7,
    hemiGroundHex: 0x29251b,
    hemiIntensity: 0.8,
    playerVfxHex: 0x34d399,
    enemyVfxHex: 0xf59e0b,
    bossVfxHex: 0xe11d48,
  },
  {
    chapterId: 4,
    zodiacLabel: 'Đấu Trường Song Tử',
    backdropHex: 0x0b1526,
    fogHex: 0x12223b,
    keyLightHex: 0xe0f2fe,
    keyIntensity: 1.7,
    hemiSkyHex: 0x7dd3fc,
    hemiGroundHex: 0x271d3d,
    hemiIntensity: 0.82,
    playerVfxHex: 0x22d3ee,
    enemyVfxHex: 0xfb7185,
    bossVfxHex: 0xc084fc,
  },
  {
    chapterId: 5,
    zodiacLabel: 'Hải Vực Cự Giải',
    backdropHex: 0x081624,
    fogHex: 0x0d2236,
    keyLightHex: 0xcffafe,
    keyIntensity: 1.62,
    hemiSkyHex: 0x67e8f9,
    hemiGroundHex: 0x172554,
    hemiIntensity: 0.8,
    playerVfxHex: 0x38bdf8,
    enemyVfxHex: 0xf43f5e,
    bossVfxHex: 0xa855f7,
  },
  {
    chapterId: 6,
    zodiacLabel: 'Vườn Thánh Xử Nữ',
    backdropHex: 0x121914,
    fogHex: 0x1b261e,
    keyLightHex: 0xfef3c7,
    keyIntensity: 1.66,
    hemiSkyHex: 0xbef264,
    hemiGroundHex: 0x2e2618,
    hemiIntensity: 0.78,
    playerVfxHex: 0xfacc15,
    enemyVfxHex: 0xfb7185,
    bossVfxHex: 0xc026d3,
  },
  {
    chapterId: 7,
    zodiacLabel: 'Thánh Điện Thiên Bình',
    backdropHex: 0x131326,
    fogHex: 0x1d1d38,
    keyLightHex: 0xfff7ed,
    keyIntensity: 1.7,
    hemiSkyHex: 0xc4b5fd,
    hemiGroundHex: 0x3b2c1a,
    hemiIntensity: 0.78,
    playerVfxHex: 0xfde047,
    enemyVfxHex: 0xf43f5e,
    bossVfxHex: 0xec4899,
  },
  {
    chapterId: 8,
    zodiacLabel: 'Vực Sâu Bọ Cạp',
    backdropHex: 0x160a1c,
    fogHex: 0x220f2b,
    keyLightHex: 0xf5d0fe,
    keyIntensity: 1.58,
    hemiSkyHex: 0xe879f9,
    hemiGroundHex: 0x240b18,
    hemiIntensity: 0.72,
    playerVfxHex: 0x38bdf8,
    enemyVfxHex: 0xfb7185,
    bossVfxHex: 0xf43f5e,
  },
  {
    chapterId: 9,
    zodiacLabel: 'Thảo Nguyên Nhân Mã',
    backdropHex: 0x17121e,
    fogHex: 0x241c2e,
    keyLightHex: 0xfde68a,
    keyIntensity: 1.7,
    hemiSkyHex: 0xfdba74,
    hemiGroundHex: 0x2d1f16,
    hemiIntensity: 0.76,
    playerVfxHex: 0xfbbf24,
    enemyVfxHex: 0xf97316,
    bossVfxHex: 0xe11d48,
  },
  {
    chapterId: 10,
    zodiacLabel: 'Đỉnh Đá Ma Kết',
    backdropHex: 0x0f141b,
    fogHex: 0x19202b,
    keyLightHex: 0xe2e8f0,
    keyIntensity: 1.62,
    hemiSkyHex: 0x94a3b8,
    hemiGroundHex: 0x292524,
    hemiIntensity: 0.74,
    playerVfxHex: 0x38bdf8,
    enemyVfxHex: 0xf59e0b,
    bossVfxHex: 0xef4444,
  },
  {
    chapterId: 11,
    zodiacLabel: 'Tinh Đảo Bảo Bình',
    backdropHex: 0x091626,
    fogHex: 0x10253d,
    keyLightHex: 0xbae6fd,
    keyIntensity: 1.68,
    hemiSkyHex: 0x38bdf8,
    hemiGroundHex: 0x1e1b4b,
    hemiIntensity: 0.82,
    playerVfxHex: 0x22d3ee,
    enemyVfxHex: 0xf43f5e,
    bossVfxHex: 0xa855f7,
  },
  {
    chapterId: 12,
    zodiacLabel: 'Biển Sao Song Ngư',
    backdropHex: 0x0c0e24,
    fogHex: 0x16183b,
    keyLightHex: 0xede9fe,
    keyIntensity: 1.66,
    hemiSkyHex: 0xa78bfa,
    hemiGroundHex: 0x16213e,
    hemiIntensity: 0.8,
    playerVfxHex: 0x34d399,
    enemyVfxHex: 0xf43f5e,
    bossVfxHex: 0xd946ef,
  },
];

export function resolveZodiacChapterLighting(chapterId: number): ZodiacChapterLightingProfile {
  const safeId = Math.max(1, Math.min(12, Math.floor(Number.isFinite(chapterId) ? chapterId : 1)));
  return ZODIAC_CHAPTER_LIGHTING[safeId - 1];
}

export function resolveDynamicPointLightPolicy(
  input: DynamicPointLightPolicyInput
): DynamicPointLightPolicy {
  const forceZero =
    input.lowEndGpu ||
    input.isSoftwareGl ||
    input.liteActive ||
    input.graphicsQuality === 'low' ||
    input.watchdogStage >= 2;

  if (forceZero) {
    return {
      enableHeroLight: false,
      maxImpactPointLights: 0,
      flashScale: 0,
      zeroPointLightEnforced: true,
    };
  }

  const baseFlash = input.reduceScreenFlash ? 0.35 : input.reducedMotion ? 0.55 : 1.0;

  if (input.watchdogStage >= 1 || input.graphicsQuality === 'medium') {
    return {
      enableHeroLight: true,
      maxImpactPointLights: 1,
      flashScale: Number((baseFlash * 0.72).toFixed(2)),
      zeroPointLightEnforced: false,
    };
  }

  return {
    enableHeroLight: true,
    maxImpactPointLights: 2,
    flashScale: Number(baseFlash.toFixed(2)),
    zeroPointLightEnforced: false,
  };
}

export function resolveDynamicVfxBudget(input: DynamicVfxBudgetInput): DynamicVfxBudget {
  const enemies = Math.max(0, Math.floor(input.activeEnemies || 0));
  const projectiles = Math.max(0, Math.floor(input.activeProjectiles || 0));
  const crowdLoad = enemies + projectiles * 0.45;
  const crowdThrottleActive = crowdLoad >= 16;

  let maxParticlesPerBurst = 16;
  let particleCountScale = 1.0;
  let maxActiveShockwaves = 6;

  if (input.isLowEndGpu) {
    maxParticlesPerBurst = 6;
    particleCountScale = 0.55;
    maxActiveShockwaves = 3;
  }

  if (input.watchdogStage >= 4) {
    maxParticlesPerBurst = Math.min(maxParticlesPerBurst, 3);
    particleCountScale = Math.min(particleCountScale, 0.3);
    maxActiveShockwaves = Math.min(maxActiveShockwaves, 2);
  } else if (input.watchdogStage >= 3) {
    maxParticlesPerBurst = Math.min(maxParticlesPerBurst, 4);
    particleCountScale = Math.min(particleCountScale, 0.4);
    maxActiveShockwaves = Math.min(maxActiveShockwaves, 2);
  } else if (input.watchdogStage >= 2) {
    maxParticlesPerBurst = Math.min(maxParticlesPerBurst, 6);
    particleCountScale = Math.min(particleCountScale, 0.52);
    maxActiveShockwaves = Math.min(maxActiveShockwaves, 3);
  } else if (input.watchdogStage >= 1) {
    maxParticlesPerBurst = Math.min(maxParticlesPerBurst, 10);
    particleCountScale = Math.min(particleCountScale, 0.75);
    maxActiveShockwaves = Math.min(maxActiveShockwaves, 4);
  }

  if (crowdThrottleActive) {
    const crowdMult = crowdLoad >= 28 ? 0.55 : 0.72;
    particleCountScale = Number((particleCountScale * crowdMult).toFixed(2));
    maxParticlesPerBurst = Math.max(2, Math.floor(maxParticlesPerBurst * crowdMult));
    maxActiveShockwaves = Math.max(2, maxActiveShockwaves - 1);
  }

  if (input.reducedMotion) {
    particleCountScale = Number((particleCountScale * 0.45).toFixed(2));
    maxParticlesPerBurst = Math.max(2, Math.floor(maxParticlesPerBurst * 0.5));
    maxActiveShockwaves = Math.min(maxActiveShockwaves, 2);
  }

  return {
    maxParticlesPerBurst,
    particleCountScale: Math.max(0.15, particleCountScale),
    maxActiveShockwaves,
    crowdThrottleActive,
  };
}

export function clampParticleBurstCount(requestedCount: number, budget: DynamicVfxBudget): number {
  if (!Number.isFinite(requestedCount) || requestedCount <= 0) return 0;
  const scaled = Math.round(requestedCount * budget.particleCountScale);
  return Math.max(1, Math.min(budget.maxParticlesPerBurst, scaled));
}

export interface HitstopJitterOffset {
  x: number;
  z: number;
}

export interface KnockbackRecoilResult {
  impulseX: number;
  impulseZ: number;
  squashY: number;
  stretchXZ: number;
}

export type CombatFlashKind =
  | 'crit'
  | 'super_crit'
  | 'ultimate'
  | 'boss_slam'
  | 'perfect_dodge'
  | 'storm'
  | 'frost';

export interface ImpactLightSpec {
  colorHex: number;
  peakIntensity: number;
  distance: number;
  decayRate: number;
}

export type PostFxImpulseEvent =
  | 'super_crit'
  | 'boss_break'
  | 'boss_phase'
  | 'boss_slam'
  | 'ultimate'
  | 'perfect_dodge'
  | 'player_hurt';

export interface PostFxImpulseSpec {
  bloomBoost: number;
  chromaticBoost: number;
  fovKick: number;
}

/**
 * Produces damped high-frequency horizontal micro-vibration during hit-stop
 * freeze frames so heavy impacts feel kinetic and crunchy instead of stalled.
 */
export function computeHitstopMicroJitter(
  hitstopRemaining: number,
  elapsed: number,
  strength = 1.0
): HitstopJitterOffset {
  if (hitstopRemaining <= 0.001 || strength <= 0) {
    return { x: 0, z: 0 };
  }
  const env = Math.min(1, hitstopRemaining / 0.065) * strength;
  return {
    x: Math.sin(elapsed * 165.0) * 0.11 * env,
    z: Math.cos(elapsed * 142.0) * 0.08 * env,
  };
}

/**
 * Computes directional knockback velocity and elastic squash-and-stretch recoil
 * on impact. Bosses stay rooted (minimal flinch), elites resist heavily,
 * standard enemies pop back crisply along the arrow trajectory.
 */
export function computeKnockbackImpulse(params: {
  dirX: number;
  dirZ: number;
  isCrit: boolean;
  isSuperCrit: boolean;
  isBoss: boolean;
  isElite: boolean;
}): KnockbackRecoilResult {
  const { dirX, dirZ, isCrit, isSuperCrit, isBoss, isElite } = params;
  const len = Math.hypot(dirX, dirZ);
  const nx = len > 0.0001 ? dirX / len : 0;
  const nz = len > 0.0001 ? dirZ / len : -1;

  if (isBoss) {
    return {
      impulseX: nx * 0.25,
      impulseZ: nz * 0.25,
      squashY: isSuperCrit ? 0.93 : 0.96,
      stretchXZ: isSuperCrit ? 1.05 : 1.03,
    };
  }

  const basePush = isSuperCrit ? 3.8 : isCrit ? 2.6 : 1.55;
  const resistance = isElite ? 0.45 : 1.0;
  const push = basePush * resistance;

  return {
    impulseX: nx * push,
    impulseZ: nz * push,
    squashY: isSuperCrit ? 0.78 : isCrit ? 0.84 : 0.9,
    stretchXZ: isSuperCrit ? 1.2 : isCrit ? 1.13 : 1.08,
  };
}

/**
 * Calibrated Mythic Zodiac point-light flash presets for pooled dynamic floor lighting.
 */
export function computeImpactLightPulse(kind: CombatFlashKind): ImpactLightSpec {
  switch (kind) {
    case 'super_crit':
      return { colorHex: 0xfde047, peakIntensity: 6.5, distance: 9.5, decayRate: 13.5 };
    case 'ultimate':
      return { colorHex: 0xfbbf24, peakIntensity: 9.5, distance: 14.0, decayRate: 6.2 };
    case 'boss_slam':
      return { colorHex: 0xf43f5e, peakIntensity: 8.4, distance: 13.0, decayRate: 7.5 };
    case 'perfect_dodge':
      return { colorHex: 0x34d399, peakIntensity: 7.4, distance: 11.0, decayRate: 8.8 };
    case 'storm':
      return { colorHex: 0x38bdf8, peakIntensity: 6.0, distance: 9.0, decayRate: 15.0 };
    case 'frost':
      return { colorHex: 0x67e8f9, peakIntensity: 5.4, distance: 8.5, decayRate: 11.5 };
    case 'crit':
    default:
      return { colorHex: 0xf59e0b, peakIntensity: 4.4, distance: 7.2, decayRate: 16.0 };
  }
}

/**
 * Resolves cinematic post-FX surge (Bloom + Chromatic Aberration + FOV breath)
 * for major combat peaks so players feel every climax across visuals & camera.
 */
export function computePostFxImpulse(event: PostFxImpulseEvent): PostFxImpulseSpec {
  switch (event) {
    case 'ultimate':
      return { bloomBoost: 0.48, chromaticBoost: 0.0085, fovKick: 3.1 };
    case 'boss_phase':
      return { bloomBoost: 0.42, chromaticBoost: 0.0095, fovKick: 2.6 };
    case 'boss_slam':
      return { bloomBoost: 0.3, chromaticBoost: 0.0065, fovKick: 1.8 };
    case 'boss_break':
      return { bloomBoost: 0.52, chromaticBoost: 0.0075, fovKick: 2.4 };
    case 'perfect_dodge':
      return { bloomBoost: 0.34, chromaticBoost: 0.0055, fovKick: 2.3 };
    case 'player_hurt':
      return { bloomBoost: 0.14, chromaticBoost: 0.007, fovKick: -1.2 };
    case 'super_crit':
    default:
      return { bloomBoost: 0.24, chromaticBoost: 0.0038, fovKick: 1.0 };
  }
}

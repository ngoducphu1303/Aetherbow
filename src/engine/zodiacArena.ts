export type ZodiacElementStyle =
  | 'solar_obelisk'
  | 'frost_lotus'
  | 'astral_orrery'
  | 'earth_monolith';

export interface ZodiacArenaThemeSpec {
  style: ZodiacElementStyle;
  elementLabel: string;
  rimLightHex: number;
  dustHex: number;
  brazierSpinSpeed: number;
  brazierBobAmp: number;
}

const SOLAR_ZODIACS = new Set(['leo', 'aries', 'sagittarius']);
const FROST_ZODIACS = new Set(['cancer', 'pisces', 'scorpio']);
const ASTRAL_ZODIACS = new Set(['gemini', 'libra', 'aquarius']);

/**
 * Deterministically maps each of the 12 Zodiac chapters into one of 4 distinct
 * 3D elemental architectural signatures (pillar finials, corner shrines, rim lights, dust tint).
 */
export function resolveZodiacArenaStyle(zodiacId: string): ZodiacArenaThemeSpec {
  const key = (zodiacId || '').trim().toLowerCase();
  if (SOLAR_ZODIACS.has(key)) {
    return {
      style: 'solar_obelisk',
      elementLabel: 'Hỏa Hoàng Đạo',
      rimLightHex: 0xfb923c,
      dustHex: 0xfde68a,
      brazierSpinSpeed: 1.55,
      brazierBobAmp: 0.16,
    };
  }
  if (FROST_ZODIACS.has(key)) {
    return {
      style: 'frost_lotus',
      elementLabel: 'Thủy Băng Hoàng Đạo',
      rimLightHex: 0x38bdf8,
      dustHex: 0xbae6fd,
      brazierSpinSpeed: 1.05,
      brazierBobAmp: 0.2,
    };
  }
  if (ASTRAL_ZODIACS.has(key)) {
    return {
      style: 'astral_orrery',
      elementLabel: 'Phong Tinh Hoàng Đạo',
      rimLightHex: 0xa78bfa,
      dustHex: 0xe9d5ff,
      brazierSpinSpeed: 2.35,
      brazierBobAmp: 0.14,
    };
  }
  return {
    style: 'earth_monolith',
    elementLabel: 'Thổ Thần Hoàng Đạo',
    rimLightHex: 0x4ade80,
    dustHex: 0xfef08a,
    brazierSpinSpeed: 0.9,
    brazierBobAmp: 0.11,
  };
}

/**
 * Smooth cinematic Boss entrance camera blend weight in [0, 1].
 * Ramps smoothly in over the opening 22% of the intro sweep, holds near peak,
 * then glides cleanly back to 0 so combat camera never snaps.
 */
export function computeBossIntroBlend(timer: number, duration = 1.55): number {
  if (timer <= 0 || duration <= 0) return 0;
  const elapsedFrac = Math.max(0, Math.min(1, 1 - timer / duration));
  if (elapsedFrac < 0.22) {
    const t = elapsedFrac / 0.22;
    return t * t * (3 - 2 * t);
  }
  if (elapsedFrac < 0.62) {
    return 1;
  }
  const t = (elapsedFrac - 0.62) / 0.38;
  return 1 - t * t * (3 - 2 * t);
}

/**
 * Maps attack telegraph progress [0, 1] into a crisp contracting 3D countdown ring scale
 * and imminent detonation flag for high-contrast white-gold impact flash.
 */
export function computeCountdownRingScale(progress: number): {
  scale: number;
  isImminent: boolean;
} {
  const clamped = Math.max(0, Math.min(1, progress));
  const eased = Math.pow(clamped, 1.15);
  return {
    scale: Math.max(0.14, 1.04 - eased * 0.9),
    isImminent: clamped >= 0.82,
  };
}

/**
 * Adaptive 3-phase Boss symphony step duration (seconds per 16th-note pulse).
 * Accelerates smoothly as the Boss enters Phase II (Cuồng Nộ) and Phase III (Tối Thượng).
 */
export function computeBossBgmStepDuration(phase: 1 | 2 | 3): number {
  if (phase === 3) return 0.165;
  if (phase === 2) return 0.185;
  return 0.21;
}

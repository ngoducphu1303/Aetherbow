export type ComboStyleGrade = 'C' | 'B' | 'A' | 'S' | 'SS' | 'SSS';

export interface ComboStyleRankInfo {
  grade: ComboStyleGrade;
  title: string;
  accentHex: string;
  textClass: string;
  ringColor: string;
  borderClass: string;
  nextThreshold: number | null;
}

export interface BossFinisherKinematics {
  active: boolean;
  timeScale: number;
  cameraBlend: number;
  fovBoost: number;
  letterboxRatio: number;
}

export interface BowStringSegmentPose {
  topPosY: number;
  topPosZ: number;
  topRotX: number;
  bottomPosY: number;
  bottomPosZ: number;
  bottomRotX: number;
  segmentScaleY: number;
  nockZ: number;
  tipEmissiveIntensity: number;
}

export interface CloakWavePose {
  rotX: number;
  rotZ: number;
  scaleZ: number;
}

export type ElementalGroundKind = 'ember' | 'frost';

export interface ElementalZoneTickResult {
  inside: boolean;
  tickDamage: number;
  applyBurn: boolean;
  applyChill: boolean;
}

export interface UrnPlacement {
  x: number;
  z: number;
  variant: 'heal' | 'ult' | 'gold';
}

/**
 * Resolves Action-RPG Combo Style Rank (C -> B -> A -> S -> SS -> SSS)
 * strictly from live combo count for crisp HUD rank emblem progression.
 */
export function computeComboStyleRank(comboCount: number): ComboStyleRankInfo {
  const c = Math.max(0, Math.floor(comboCount));
  if (c >= 65) {
    return {
      grade: 'SSS',
      title: 'THẦN TIỄN',
      accentHex: '#fde047',
      textClass: 'text-amber-200',
      ringColor: '#fde047',
      borderClass: 'border-amber-300',
      nextThreshold: null,
    };
  }
  if (c >= 45) {
    return {
      grade: 'SS',
      title: 'SIÊU VIỆT',
      accentHex: '#f59e0b',
      textClass: 'text-amber-300',
      ringColor: '#fbbf24',
      borderClass: 'border-amber-400/90',
      nextThreshold: 65,
    };
  }
  if (c >= 28) {
    return {
      grade: 'S',
      title: 'HOÀNG ĐẠO',
      accentHex: '#e879f9',
      textClass: 'text-fuchsia-300',
      ringColor: '#e879f9',
      borderClass: 'border-fuchsia-400/85',
      nextThreshold: 45,
    };
  }
  if (c >= 16) {
    return {
      grade: 'A',
      title: 'CUỒNG PHONG',
      accentHex: '#38bdf8',
      textClass: 'text-sky-300',
      ringColor: '#38bdf8',
      borderClass: 'border-sky-400/80',
      nextThreshold: 28,
    };
  }
  if (c >= 8) {
    return {
      grade: 'B',
      title: 'SẮC BÉN',
      accentHex: '#34d399',
      textClass: 'text-emerald-300',
      ringColor: '#34d399',
      borderClass: 'border-emerald-400/75',
      nextThreshold: 16,
    };
  }
  return {
    grade: 'C',
    title: 'LIÊN KÍCH',
    accentHex: '#cbd5e1',
    textClass: 'text-slate-200',
    ringColor: '#94a3b8',
    borderClass: 'border-slate-500/70',
    nextThreshold: 8,
  };
}

/**
 * Computes smooth time dilation, camera dolly blend, FOV punch, and letterbox bar ratio
 * for the Boss Execution Slow-Mo ("KẾT LIỄU!") sequence.
 */
export function computeBossKillSlowMoState(
  remainingSec: number,
  durationSec = 0.85
): BossFinisherKinematics {
  if (remainingSec <= 0.001 || durationSec <= 0) {
    return {
      active: false,
      timeScale: 1,
      cameraBlend: 0,
      fovBoost: 0,
      letterboxRatio: 0,
    };
  }

  const progress = Math.max(0, Math.min(1, 1 - remainingSec / durationSec));
  // Smooth bell curve: holds deep 0.22x slow-mo across first 60%, eases cleanly back to 1.0x
  let timeScale = 0.22;
  if (progress > 0.6) {
    const easeOut = (progress - 0.6) / 0.4;
    const smooth = easeOut * easeOut * (3 - 2 * easeOut);
    timeScale = 0.22 + (1 - 0.22) * smooth;
  }

  // Camera dolly-in peaks quickly and releases smoothly before end
  const cameraBlend =
    progress < 0.22
      ? progress / 0.22
      : progress < 0.72
      ? 1
      : Math.max(0, 1 - (progress - 0.72) / 0.28);
  const smoothBlend = cameraBlend * cameraBlend * (3 - 2 * cameraBlend);

  return {
    active: true,
    timeScale: Math.round(timeScale * 1000) / 1000,
    cameraBlend: Math.round(smoothBlend * 1000) / 1000,
    fovBoost: Math.round(smoothBlend * -4.2 * 100) / 100,
    letterboxRatio: Math.round(smoothBlend * 1000) / 1000,
  };
}

/**
 * Computes geometry transform for a 2-segment dynamic V-bowstring anchored at
 * bow tips (0, ±0.57, -0.21) that pulls back cleanly as drawProgress rises 0 -> 1.
 */
export function computeBowStringPose(drawProgress: number): BowStringSegmentPose {
  const p = Math.max(0, Math.min(1, drawProgress));
  const halfHeight = 0.57;
  const restZ = -0.21;
  const pullBack = p * 0.27;
  const midZ = restZ - pullBack;
  const segLen = Math.hypot(halfHeight, pullBack);
  const scaleY = segLen / halfHeight;
  // Angle in Y-Z plane from center nock point to upper/lower bow tips
  const tilt = Math.atan2(pullBack, halfHeight);

  return {
    topPosY: halfHeight * 0.5,
    topPosZ: (restZ + midZ) * 0.5,
    topRotX: tilt,
    bottomPosY: -halfHeight * 0.5,
    bottomPosZ: (restZ + midZ) * 0.5,
    bottomRotX: tilt === 0 ? 0 : -tilt,
    segmentScaleY: Math.round(scaleY * 1000) / 1000,
    nockZ: 0.2 - p * 0.27,
    tipEmissiveIntensity: 0.85 + p * 1.45,
  };
}

/**
 * Procedural multi-harmonic Hero Cloak physics driven by movement speed, stride, and dash surge.
 */
export function computeCloakWavePose(params: {
  elapsed: number;
  speedMag: number;
  isDashing: boolean;
  stridePhase: number;
}): CloakWavePose {
  const { elapsed, speedMag, isDashing, stridePhase } = params;
  const speedNorm = Math.max(0, Math.min(1.6, speedMag / 7.5));
  const windPrimary = Math.sin(elapsed * 3.4) * 0.045;
  const windHarmonic = Math.sin(elapsed * 7.8 + 1.1) * 0.025 * (0.4 + speedNorm);
  const strideBillow = Math.sin(stridePhase * 1.1) * 0.13 * Math.min(1, speedNorm);
  const dashKick = isDashing ? 0.54 : 0;

  return {
    rotX: 0.16 + speedNorm * 0.28 + dashKick + windPrimary + strideBillow,
    rotZ: Math.cos(elapsed * 4.2 + stridePhase * 0.5) * (0.04 + speedNorm * 0.085) + windHarmonic,
    scaleZ: 1 + speedNorm * 0.12 + (isDashing ? 0.24 : 0),
  };
}

/**
 * Deterministic tactical placement of 3 destructible Zodiac Urns around the room perimeter,
 * guaranteed clear of hero spawn, north portal, and obstacle pillars.
 */
export function computeZodiacUrnPlacements(
  stageSeed: number,
  obstacles: Array<{ x: number; z: number; radius: number }>
): UrnPlacement[] {
  const candidates: Array<{ x: number; z: number }> = [
    { x: -7.8, z: -3.2 },
    { x: 7.8, z: -3.2 },
    { x: -7.4, z: 3.4 },
    { x: 7.4, z: 3.4 },
    { x: -5.2, z: -6.4 },
    { x: 5.2, z: -6.4 },
    { x: -8.1, z: 0.2 },
    { x: 8.1, z: 0.2 },
  ];

  const valid = candidates.filter((pt) => {
    // Keep clear of Hero spawn (0, 8.2) and North Portal (0, -10.5)
    if (Math.hypot(pt.x, pt.z - 8.2) < 3.6) return false;
    if (Math.hypot(pt.x, pt.z + 10.5) < 3.4) return false;
    for (const obs of obstacles) {
      if (Math.hypot(pt.x - obs.x, pt.z - obs.z) < obs.radius + 1.35) {
        return false;
      }
    }
    return true;
  });

  const variants: Array<UrnPlacement['variant']> = ['heal', 'ult', 'gold'];
  const picked: UrnPlacement[] = [];
  const n = valid.length;
  if (n === 0) return picked;
  const offset = Math.abs(Math.floor(stageSeed)) % n;
  const step = n % 3 !== 0 ? 3 : n % 2 !== 0 ? 2 : 1;
  for (let i = 0; i < n && picked.length < 3; i++) {
    const idx = (offset + i * step) % n;
    const pt = valid[idx];
    if (picked.some((p) => Math.hypot(p.x - pt.x, p.z - pt.z) < 3.5)) continue;
    picked.push({
      x: pt.x,
      z: pt.z,
      variant: variants[picked.length % variants.length],
    });
  }
  return picked;
}

/**
 * Pure tick evaluator for player-created Ember Burn & Frost Slow elemental ground zones.
 */
export function evaluateElementalZoneEffect(
  kind: ElementalGroundKind,
  baseAtk: number,
  distanceToCenter: number,
  zoneRadius: number
): ElementalZoneTickResult {
  if (distanceToCenter > zoneRadius || zoneRadius <= 0) {
    return { inside: false, tickDamage: 0, applyBurn: false, applyChill: false };
  }
  if (kind === 'ember') {
    return {
      inside: true,
      tickDamage: Math.max(3, Math.round(baseAtk * 0.28)),
      applyBurn: true,
      applyChill: false,
    };
  }
  return {
    inside: true,
    tickDamage: Math.max(2, Math.round(baseAtk * 0.14)),
    applyBurn: false,
    applyChill: true,
  };
}

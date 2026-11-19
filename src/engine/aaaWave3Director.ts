import { DamageBreakdown, EdgeThreatIndicator, SkillId, SkillSynergyDef } from '../types/game';

export type ChapterWeatherKind = 'embers' | 'snow' | 'stardust' | 'petals';

export interface ChapterBiomeAtmosphere {
  weatherKind: ChapterWeatherKind;
  weatherLabel: string;
  skyHex: number;
  fogHex: number;
  fogDensity: number;
  rimLightHex: number;
  weatherColorHex: number;
  weatherSpeedY: number;
  weatherDriftX: number;
  weatherSpinSpeed: number;
}

export interface UltimateCutinKinematics {
  active: boolean;
  eclipseDarken: number; // 0..0.48 transient ambient darkening for skybeam contrast
  fovPunch: number;      // negative degrees zoom punch
  bannerProgress: number;
}

export interface LobbyEmotePose {
  active: boolean;
  drawProgress: number; // 0..1 bow pull
  liftY: number;        // subtle heroic hop/poise
  glowBoost: number;    // 0..1 weapon aura glow boost
}

export interface RawThreatSample {
  x: number;
  z: number;
  kind: 'boss_charge' | 'orb';
  urgent?: boolean;
}

export interface SkillSynergyPreviewInfo {
  synergyId: string;
  synergyName: string;
  shortEffect: string;
  matchedCount: number;
  requiredCount: number;
  willActivateNow: boolean;
  alreadyActive: boolean;
}

export interface PostRunDamageShares {
  total: number;
  basicPct: number;
  ultimatePct: number;
  elementalPct: number;
  petPct: number;
  dominantLabel: string;
}

const SOLAR_ZODIACS = new Set(['leo', 'aries', 'sagittarius']);
const FROST_ZODIACS = new Set(['cancer', 'pisces', 'scorpio']);
const ASTRAL_ZODIACS = new Set(['gemini', 'libra', 'aquarius']);

/**
 * Resolves chapter-specific 3D biome weather, sky/fog density, and Boss Phase II/III
 * atmospheric shifts for high-clarity 60fps 3D arenas.
 */
export function resolveChapterBiomeAtmosphere(
  zodiacId: string,
  bossPhase: 1 | 2 | 3 = 1
): ChapterBiomeAtmosphere {
  const key = (zodiacId || '').trim().toLowerCase();
  let base: ChapterBiomeAtmosphere;

  if (SOLAR_ZODIACS.has(key)) {
    base = {
      weatherKind: 'embers',
      weatherLabel: 'Tro Tàn Thái Dương',
      skyHex: 0x1b1124,
      fogHex: 0x261529,
      fogDensity: 0.0145,
      rimLightHex: 0xfb923c,
      weatherColorHex: 0xfdba74,
      weatherSpeedY: 1.85, // rising embers
      weatherDriftX: 0.55,
      weatherSpinSpeed: 2.1,
    };
  } else if (FROST_ZODIACS.has(key)) {
    base = {
      weatherKind: 'snow',
      weatherLabel: 'Tuyết Tinh Thánh Điện',
      skyHex: 0x0b1a2e,
      fogHex: 0x10253f,
      fogDensity: 0.0155,
      rimLightHex: 0x38bdf8,
      weatherColorHex: 0xe0f2fe,
      weatherSpeedY: -1.45, // falling frost crystals
      weatherDriftX: 0.72,
      weatherSpinSpeed: 1.4,
    };
  } else if (ASTRAL_ZODIACS.has(key)) {
    base = {
      weatherKind: 'stardust',
      weatherLabel: 'Bụi Sao Thiên Văn',
      skyHex: 0x100d28,
      fogHex: 0x18133a,
      fogDensity: 0.014,
      rimLightHex: 0xc084fc,
      weatherColorHex: 0xe9d5ff,
      weatherSpeedY: 0.65, // gentle hovering orbit
      weatherDriftX: 1.05,
      weatherSpinSpeed: 2.8,
    };
  } else {
    base = {
      weatherKind: 'petals',
      weatherLabel: 'Lá Vàng Thánh Rừng',
      skyHex: 0x0f1d1f,
      fogHex: 0x152829,
      fogDensity: 0.015,
      rimLightHex: 0x4ade80,
      weatherColorHex: 0xfef08a,
      weatherSpeedY: -0.95, // drifting golden leaves
      weatherDriftX: 0.88,
      weatherSpinSpeed: 1.85,
    };
  }

  if (bossPhase === 2) {
    return {
      ...base,
      skyHex: 0x23111c,
      fogHex: 0x311722,
      fogDensity: Math.min(0.0185, base.fogDensity + 0.002),
      rimLightHex: 0xf59e0b,
    };
  }
  if (bossPhase === 3) {
    return {
      ...base,
      skyHex: 0x210818,
      fogHex: 0x340c22,
      fogDensity: Math.min(0.02, base.fogDensity + 0.0032),
      rimLightHex: 0xf43f5e,
    };
  }
  return base;
}

/**
 * Non-blocking 0.75s Ultimate Cut-In curve: transient sky darkening + crisp FOV punch
 * without locking player movement or dodging.
 */
export function computeUltimateCutinState(
  remainingSec: number,
  durationSec = 0.75
): UltimateCutinKinematics {
  if (remainingSec <= 0.001 || durationSec <= 0) {
    return { active: false, eclipseDarken: 0, fovPunch: 0, bannerProgress: 0 };
  }
  const progress = Math.max(0, Math.min(1, 1 - remainingSec / durationSec));
  // Rapid attack (first 16%), brief hold, smooth release
  const envelope =
    progress < 0.16
      ? progress / 0.16
      : progress < 0.58
      ? 1
      : Math.max(0, 1 - (progress - 0.58) / 0.42);
  const smooth = envelope * envelope * (3 - 2 * envelope);
  return {
    active: true,
    eclipseDarken: Math.round(smooth * 0.44 * 1000) / 1000,
    fovPunch: Math.round(smooth * -3.4 * 100) / 100,
    bannerProgress: Math.round(progress * 1000) / 1000,
  };
}

/**
 * Smooth ease-out curve (1 -> 0) for the seamless Lobby-to-Arena camera fly-through.
 */
export function computeArenaEntryFlyBlend(
  remainingSec: number,
  durationSec = 0.55
): number {
  if (remainingSec <= 0.001 || durationSec <= 0) return 0;
  const t = Math.max(0, Math.min(1, remainingSec / durationSec));
  // Cubic ease-in on remaining fraction yields silky deceleration into combat framing
  return Math.round(t * t * (3 - 2 * t) * 1000) / 1000;
}

/**
 * Interactive 3D Lobby Hero Emote kinematics (hero draws bow & pulses weapon aura on tap).
 */
export function computeLobbyEmotePose(
  remainingSec: number,
  durationSec = 1.05
): LobbyEmotePose {
  if (remainingSec <= 0.001 || durationSec <= 0) {
    return { active: false, drawProgress: 0, liftY: 0, glowBoost: 0 };
  }
  const p = Math.max(0, Math.min(1, 1 - remainingSec / durationSec));
  // Draw smoothly 0 -> 1 over first 45%, hold peak to 72%, release cleanly to 0
  const drawRaw =
    p < 0.45 ? p / 0.45 : p < 0.72 ? 1 : Math.max(0, 1 - (p - 0.72) / 0.28);
  const smoothDraw = drawRaw * drawRaw * (3 - 2 * drawRaw);
  const liftY = Math.sin(p * Math.PI) * 0.14;
  return {
    active: true,
    drawProgress: Math.round(smoothDraw * 1000) / 1000,
    liftY: Math.round(liftY * 1000) / 1000,
    glowBoost: Math.round(smoothDraw * 1000) / 1000,
  };
}

/**
 * Computes up to 4 prioritized screen-edge directional threat arrows for dangerous
 * boss charges or fast incoming orbs outside immediate melee radius.
 * Angle 0 deg = North (top of screen), 90 deg = East (right), 180 deg = South, 270 deg = West.
 */
export function computeEdgeThreatIndicators(
  playerX: number,
  playerZ: number,
  samples: RawThreatSample[],
  maxCount = 4
): EdgeThreatIndicator[] {
  if (!samples || samples.length === 0 || maxCount <= 0) return [];

  const scored: Array<EdgeThreatIndicator & { score: number }> = [];
  for (let i = 0; i < samples.length; i++) {
    const s = samples[i];
    const dx = s.x - playerX;
    const dz = s.z - playerZ;
    const dist = Math.hypot(dx, dz);
    // Skip threats already point-blank or way too far
    if (dist < 2.2 || dist > 19.5) continue;

    // Bearing in screen space: +X is East (90 deg), -Z is North (0 deg)
    const rad = Math.atan2(dx, -dz);
    const angleDeg = ((rad * 180) / Math.PI + 360) % 360;
    const isHigh = Boolean(s.urgent) || s.kind === 'boss_charge' || dist < 6.4;
    const score = (isHigh ? 100 : 40) + (20 - dist);
    scored.push({
      angleDeg: Math.round(angleDeg),
      severity: isHigh ? 'high' : 'medium',
      kind: s.kind,
      score,
    });
  }

  scored.sort((a, b) => b.score - a.score);

  // Deduplicate indicators within 28 degrees of a higher-priority arrow so HUD stays crisp
  const result: EdgeThreatIndicator[] = [];
  for (const item of scored) {
    if (result.length >= maxCount) break;
    const overlaps = result.some((existing) => {
      const diff = Math.abs(existing.angleDeg - item.angleDeg);
      const angularDist = Math.min(diff, 360 - diff);
      return angularDist < 28;
    });
    if (overlaps) continue;
    result.push({
      angleDeg: item.angleDeg,
      severity: item.severity,
      kind: item.kind,
    });
  }
  return result;
}

/**
 * Computes crisp Synergy pair completion progress for a candidate Skill Draft card
 * so players immediately see (0/2 -> 1/2 -> 2/2) activation thresholds.
 */
export function computeSkillSynergyProgress(
  skillId: SkillId,
  currentStacks: Partial<Record<SkillId, number>>,
  synergies: SkillSynergyDef[]
): SkillSynergyPreviewInfo | null {
  let best: SkillSynergyPreviewInfo | null = null;
  for (const syn of synergies) {
    const inA = syn.groupA.includes(skillId);
    const inB = syn.groupB.includes(skillId);
    if (!inA && !inB) continue;

    const hasA = syn.groupA.some((id) => (currentStacks[id] ?? 0) > 0);
    const hasB = syn.groupB.some((id) => (currentStacks[id] ?? 0) > 0);
    const alreadyActive = hasA && hasB;
    const willActivateNow = !alreadyActive && ((inA && hasB) || (inB && hasA));
    const matchedCount = (hasA ? 1 : 0) + (hasB ? 1 : 0);

    const candidate: SkillSynergyPreviewInfo = {
      synergyId: syn.id,
      synergyName: syn.name,
      shortEffect: syn.shortEffect,
      matchedCount,
      requiredCount: 2,
      willActivateNow,
      alreadyActive,
    };

    if (!best) {
      best = candidate;
    } else if (candidate.willActivateNow && !best.willActivateNow) {
      best = candidate;
    } else if (!best.willActivateNow && candidate.matchedCount > best.matchedCount) {
      best = candidate;
    }
  }
  return best;
}

/**
 * Normalizes post-run damage breakdown into clean integer percentages (summing to 100%)
 * and identifies the player's dominant damage pillar for Post-Run AAA Analytics.
 */
export function computePostRunDamageShares(
  breakdown?: DamageBreakdown
): PostRunDamageShares {
  if (!breakdown) {
    return {
      total: 0,
      basicPct: 0,
      ultimatePct: 0,
      elementalPct: 0,
      petPct: 0,
      dominantLabel: 'Cung Tiễn',
    };
  }

  const basic = Math.max(0, breakdown.basic || 0);
  const ultimate = Math.max(0, breakdown.ultimate || 0);
  const elemental = Math.max(0, breakdown.elemental || 0);
  const pet = Math.max(0, breakdown.pet || 0);
  const total = basic + ultimate + elemental + pet;

  if (total <= 0) {
    return {
      total: 0,
      basicPct: 0,
      ultimatePct: 0,
      elementalPct: 0,
      petPct: 0,
      dominantLabel: 'Cung Tiễn',
    };
  }

  const basicPct = Math.round((basic / total) * 100);
  const ultimatePct = Math.round((ultimate / total) * 100);
  const elementalPct = Math.round((elemental / total) * 100);
  const petPct = Math.max(0, 100 - basicPct - ultimatePct - elementalPct);

  const pairs: Array<{ val: number; label: string }> = [
    { val: basic, label: 'Đòn Thường' },
    { val: elemental, label: 'Nguyên Tố' },
    { val: ultimate, label: 'Chiêu Cuối' },
    { val: pet, label: 'Tinh Linh' },
  ];
  pairs.sort((a, b) => b.val - a.val);

  return {
    total: Math.round(total),
    basicPct,
    ultimatePct,
    elementalPct,
    petPct,
    dominantLabel: pairs[0].label,
  };
}

import type {
  AdaptiveFpsTier,
  BossPaceHudSnapshot,
  CoopAiRole,
  CoopRoleSynergySummary,
  WeatherBiomeKind,
} from '../types/game';

/**
 * ============================================================================
 * WAVE 6 — PURE DETERMINISTIC SYSTEMS ACROSS ALL 5 AAA PILLARS
 * ============================================================================
 * - Pillar 1 & 2: Perfect Dodge Counter-Window ("Phản Kích Thời Gian") + 3D Weather Profiles
 * - Pillar 4: Live Boss Split Pace Calculator (75% / 50% / 25% / 0% HP checkpoints)
 * - Pillar 5: Co-op 3D AI Party Role Presets & Team Synergy (DPS / Control / Guardian)
 */

// ---------------------------------------------------------------------------
// 1. PERFECT DODGE COUNTER-WINDOW ("PHẢN KÍCH THỜI GIAN")
// ---------------------------------------------------------------------------

export const PERFECT_DODGE_COUNTER_WINDOW_SEC = 1.6;
export const PERFECT_DODGE_COUNTER_SHOTS = 2;
export const PERFECT_DODGE_COUNTER_DMG_MULT = 1.65;
export const PERFECT_DODGE_VISUAL_SLOWMO_SEC = 0.24;

export interface PerfectDodgeCounterState {
  windowRemainingSec: number;
  chargesRemaining: number;
  visualSlowMoRemainingSec: number;
  totalCountersLanded: number;
}

export function createPerfectDodgeCounterState(): PerfectDodgeCounterState {
  return {
    windowRemainingSec: 0,
    chargesRemaining: 0,
    visualSlowMoRemainingSec: 0,
    totalCountersLanded: 0,
  };
}

/**
 * Deterministic activation inside the 1/60s fixed simulation tick.
 * Visual slow-mo is strictly presentation-only; gameplay timing runs at exact 60Hz.
 */
export function triggerPerfectDodgeCounter(state: PerfectDodgeCounterState): void {
  state.windowRemainingSec = PERFECT_DODGE_COUNTER_WINDOW_SEC;
  state.chargesRemaining = PERFECT_DODGE_COUNTER_SHOTS;
  state.visualSlowMoRemainingSec = PERFECT_DODGE_VISUAL_SLOWMO_SEC;
}

export function stepPerfectDodgeCounter(state: PerfectDodgeCounterState, dtSec: number): void {
  if (state.windowRemainingSec > 0) {
    state.windowRemainingSec = Math.max(0, state.windowRemainingSec - dtSec);
    if (state.windowRemainingSec === 0) {
      state.chargesRemaining = 0;
    }
  }
  if (state.visualSlowMoRemainingSec > 0) {
    state.visualSlowMoRemainingSec = Math.max(0, state.visualSlowMoRemainingSec - dtSec);
  }
}

export function consumePerfectDodgeCounterShot(state: PerfectDodgeCounterState): {
  empowered: boolean;
  damageMult: number;
  guaranteedCrit: boolean;
  piercing: boolean;
} {
  if (state.windowRemainingSec > 0 && state.chargesRemaining > 0) {
    state.chargesRemaining -= 1;
    state.totalCountersLanded += 1;
    if (state.chargesRemaining <= 0) {
      state.windowRemainingSec = 0;
    }
    return {
      empowered: true,
      damageMult: PERFECT_DODGE_COUNTER_DMG_MULT,
      guaranteedCrit: true,
      piercing: true,
    };
  }
  return {
    empowered: false,
    damageMult: 1,
    guaranteedCrit: false,
    piercing: false,
  };
}

export function computeCounterVisualTimeScale(state: PerfectDodgeCounterState): number {
  if (state.visualSlowMoRemainingSec <= 0) return 1;
  const progress = 1 - state.visualSlowMoRemainingSec / PERFECT_DODGE_VISUAL_SLOWMO_SEC;
  // Crisp dip to 0.38x then smooth release to 1.0x
  const eased = progress * progress * (3 - 2 * progress);
  return Number((0.38 + 0.62 * eased).toFixed(4));
}

// ---------------------------------------------------------------------------
// 2. 3D ARENA WEATHER & LIGHTING PROFILES (ZERO-GC INSTANCED BUDGETS)
// ---------------------------------------------------------------------------

export interface WeatherBiomeProfile {
  kind: WeatherBiomeKind;
  label: string;
  particleHex: number;
  secondaryHex: number;
  fallSpeed: number;
  driftX: number;
  driftZ: number;
  scaleX: number;
  scaleY: number;
  baseCount: number;
  fogHex: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
}

export const WEATHER_BIOME_PROFILES: Record<WeatherBiomeKind, WeatherBiomeProfile> = {
  ember_ash: {
    kind: 'ember_ash',
    label: 'Tro Tàn Lửa',
    particleHex: 0xf97316,
    secondaryHex: 0xfde047,
    fallSpeed: -1.35, // Rising ember ash
    driftX: 0.9,
    driftZ: 0.45,
    scaleX: 0.12,
    scaleY: 0.12,
    baseCount: 68,
    fogHex: 0x1c1218,
    hemiSkyHex: 0xfdba74,
    hemiGroundHex: 0x3b1d1d,
  },
  starlight_snow: {
    kind: 'starlight_snow',
    label: 'Tuyết Tinh Quang',
    particleHex: 0xe0f2fe,
    secondaryHex: 0x7dd3fc,
    fallSpeed: 2.1,
    driftX: 0.65,
    driftZ: 0.35,
    scaleX: 0.11,
    scaleY: 0.11,
    baseCount: 72,
    fogHex: 0x0d1b2a,
    hemiSkyHex: 0xbae6fd,
    hemiGroundHex: 0x1e293b,
  },
  storm_rain: {
    kind: 'storm_rain',
    label: 'Bão Sét Tinh Giới',
    particleHex: 0x93c5fd,
    secondaryHex: 0xc084fc,
    fallSpeed: 10.5,
    driftX: 1.4,
    driftZ: 0.6,
    scaleX: 0.045,
    scaleY: 0.48,
    baseCount: 84,
    fogHex: 0x0b1024,
    hemiSkyHex: 0x93c5fd,
    hemiGroundHex: 0x17153b,
  },
  celestial_dust: {
    kind: 'celestial_dust',
    label: 'Hạt Hoàng Kim',
    particleHex: 0xfde68a,
    secondaryHex: 0x38bdf8,
    fallSpeed: -0.65,
    driftX: 0.35,
    driftZ: 0.35,
    scaleX: 0.1,
    scaleY: 0.1,
    baseCount: 56,
    fogHex: 0x0b132b,
    hemiSkyHex: 0xfef3c7,
    hemiGroundHex: 0x1e293b,
  },
};

export function resolveWeatherBiome(params: {
  chapterIndex: number;
  isWeeklyBoss?: boolean;
  isWeekendBlitz?: boolean;
  isLobby?: boolean;
}): WeatherBiomeKind {
  if (params.isLobby) return 'celestial_dust';
  if (params.isWeekendBlitz) return 'storm_rain';
  if (params.isWeeklyBoss) return 'ember_ash';
  const mod = Math.abs(Math.floor(params.chapterIndex)) % 4;
  if (mod === 0) return 'celestial_dust';
  if (mod === 1) return 'ember_ash';
  if (mod === 2) return 'starlight_snow';
  return 'storm_rain';
}

export function computeWeatherInstanceBudget(
  profile: WeatherBiomeProfile,
  tier: AdaptiveFpsTier,
  isSoftwareGl: boolean
): number {
  const tierFactor = tier === 'full' ? 1 : tier === 'balanced' ? 0.62 : 0.32;
  const swFactor = isSoftwareGl ? 0.45 : 1;
  return Math.max(12, Math.round(profile.baseCount * tierFactor * swFactor));
}

// ---------------------------------------------------------------------------
// 3. LIVE BOSS SPLIT PACE TRACKER (75% / 50% / 25% / 0% HP CHECKPOINTS)
// ---------------------------------------------------------------------------

export const BOSS_PACE_THRESHOLDS = [0.75, 0.5, 0.25, 0] as const;

export interface BossPaceTrackerState {
  referenceLabel: string;
  referenceSplitsMs: [number, number, number, number];
  currentSplitsMs: [number | null, number | null, number | null, number | null];
  lastCheckpointIndex: number;
}

export function createDefaultReferenceSplitsMs(timeLimitSec: number): [number, number, number, number] {
  const targetClearMs = Math.round(Math.max(24, timeLimitSec * 0.56) * 1000);
  return [
    Math.round(targetClearMs * 0.25),
    Math.round(targetClearMs * 0.5),
    Math.round(targetClearMs * 0.76),
    targetClearMs,
  ];
}

export function createBossPaceTracker(params: {
  timeLimitSec: number;
  top1ClearTimeMs?: number | null;
  top1SplitsMs?: number[] | null;
  personalBestClearTimeMs?: number | null;
  personalBestSplitsMs?: number[] | null;
}): BossPaceTrackerState {
  const hasTop1Splits =
    Array.isArray(params.top1SplitsMs) &&
    params.top1SplitsMs.length === 4 &&
    params.top1SplitsMs.every((n) => Number.isFinite(n) && n > 0);

  if (hasTop1Splits) {
    return {
      referenceLabel: 'Top 1',
      referenceSplitsMs: params.top1SplitsMs as [number, number, number, number],
      currentSplitsMs: [null, null, null, null],
      lastCheckpointIndex: -1,
    };
  }

  if (params.top1ClearTimeMs && params.top1ClearTimeMs > 5000) {
    const c = params.top1ClearTimeMs;
    return {
      referenceLabel: 'Top 1',
      referenceSplitsMs: [
        Math.round(c * 0.25),
        Math.round(c * 0.5),
        Math.round(c * 0.76),
        Math.round(c),
      ],
      currentSplitsMs: [null, null, null, null],
      lastCheckpointIndex: -1,
    };
  }

  const hasPbSplits =
    Array.isArray(params.personalBestSplitsMs) &&
    params.personalBestSplitsMs.length === 4 &&
    params.personalBestSplitsMs.every((n) => Number.isFinite(n) && n > 0);
  if (hasPbSplits) {
    return {
      referenceLabel: 'Kỷ Lục',
      referenceSplitsMs: params.personalBestSplitsMs as [number, number, number, number],
      currentSplitsMs: [null, null, null, null],
      lastCheckpointIndex: -1,
    };
  }

  if (params.personalBestClearTimeMs && params.personalBestClearTimeMs > 5000) {
    const c = params.personalBestClearTimeMs;
    return {
      referenceLabel: 'Kỷ Lục',
      referenceSplitsMs: [
        Math.round(c * 0.25),
        Math.round(c * 0.5),
        Math.round(c * 0.76),
        Math.round(c),
      ],
      currentSplitsMs: [null, null, null, null],
      lastCheckpointIndex: -1,
    };
  }

  return {
    referenceLabel: 'Mốc Vàng',
    referenceSplitsMs: createDefaultReferenceSplitsMs(params.timeLimitSec),
    currentSplitsMs: [null, null, null, null],
    lastCheckpointIndex: -1,
  };
}

/**
 * Updates split checkpoints inside the fixed 1/60s simulation loop and returns live HUD pace.
 * Negative deltaSec = AHEAD of reference pace (green); Positive = BEHIND (amber/rose).
 */
export function updateBossPaceTracker(
  tracker: BossPaceTrackerState,
  bossHpRatio: number,
  elapsedSimMs: number
): BossPaceHudSnapshot {
  const clampedRatio = Math.max(0, Math.min(1, bossHpRatio));
  const safeMs = Math.max(0, Math.round(elapsedSimMs));

  for (let i = 0; i < BOSS_PACE_THRESHOLDS.length; i++) {
    if (tracker.currentSplitsMs[i] === null && clampedRatio <= BOSS_PACE_THRESHOLDS[i]) {
      tracker.currentSplitsMs[i] = Math.max(100, safeMs);
      tracker.lastCheckpointIndex = i;
    }
  }

  // Smooth interpolated reference elapsed time for current Boss HP progress (0 -> 1)
  const damageProgress = 1 - clampedRatio;
  let expectedRefMs: number;
  if (damageProgress <= 0.25) {
    expectedRefMs = tracker.referenceSplitsMs[0] * (damageProgress / 0.25);
  } else if (damageProgress <= 0.5) {
    const t = (damageProgress - 0.25) / 0.25;
    expectedRefMs =
      tracker.referenceSplitsMs[0] + (tracker.referenceSplitsMs[1] - tracker.referenceSplitsMs[0]) * t;
  } else if (damageProgress <= 0.75) {
    const t = (damageProgress - 0.5) / 0.25;
    expectedRefMs =
      tracker.referenceSplitsMs[1] + (tracker.referenceSplitsMs[2] - tracker.referenceSplitsMs[1]) * t;
  } else {
    const t = (damageProgress - 0.75) / 0.25;
    expectedRefMs =
      tracker.referenceSplitsMs[2] + (tracker.referenceSplitsMs[3] - tracker.referenceSplitsMs[2]) * t;
  }

  const deltaMs = safeMs - Math.round(expectedRefMs);
  const deltaSec = Number((deltaMs / 1000).toFixed(1));
  const ahead = deltaMs <= 0;

  return {
    referenceLabel: tracker.referenceLabel,
    elapsedMs: safeMs,
    referenceTargetMs: tracker.referenceSplitsMs[3],
    deltaSec,
    ahead,
    checkpointsReached: tracker.currentSplitsMs.filter((v) => v !== null).length,
    splitsMs: [...tracker.currentSplitsMs],
  };
}

// ---------------------------------------------------------------------------
// 4. CO-OP 3D AI PARTY ROLE PRESETS & TEAM SYNERGY (PILLAR 5)
// ---------------------------------------------------------------------------

export interface CoopAiRoleDefinition {
  id: CoopAiRole;
  label: string;
  shortLabel: string;
  accentHex: number;
  accentCss: string;
  synergyDesc: string;
  bossDamageBonus: number;
  enemyProjectileSlowPct: number;
  periodicHealPct: number;
  damageReductionBonus: number;
  preferredRange: number;
  fireRateMult: number;
}

export const COOP_AI_ROLE_DEFS: Record<CoopAiRole, CoopAiRoleDefinition> = {
  dps: {
    id: 'dps',
    label: 'Sát Thương (DPS)',
    shortLabel: 'Sát Thương',
    accentHex: 0xf43f5e,
    accentCss: '#fb7185',
    synergyDesc: '+15% Sát Thương Boss toàn đội · Tập trung bắn liên thanh',
    bossDamageBonus: 0.15,
    enemyProjectileSlowPct: 0,
    periodicHealPct: 0,
    damageReductionBonus: 0,
    preferredRange: 7.2,
    fireRateMult: 1.18,
  },
  control: {
    id: 'control',
    label: 'Khống Chế (Control)',
    shortLabel: 'Khống Chế',
    accentHex: 0x38bdf8,
    accentCss: '#38bdf8',
    synergyDesc: 'Giảm 18% tốc độ đạn địch & làm chậm Boss · Giữ vị trí cánh',
    bossDamageBonus: 0.05,
    enemyProjectileSlowPct: 0.18,
    periodicHealPct: 0,
    damageReductionBonus: 0.04,
    preferredRange: 8.6,
    fireRateMult: 1.0,
  },
  guardian: {
    id: 'guardian',
    label: 'Hộ Vệ (Guardian)',
    shortLabel: 'Hộ Vệ',
    accentHex: 0x10b981,
    accentCss: '#34d399',
    synergyDesc: 'Hồi 3% Máu mỗi 8s & +12% Giảm Thương · Che chắn tuyến đầu',
    bossDamageBonus: 0.03,
    enemyProjectileSlowPct: 0,
    periodicHealPct: 0.03,
    damageReductionBonus: 0.12,
    preferredRange: 5.4,
    fireRateMult: 0.92,
  },
};

export const COOP_AI_ROLE_LIST: CoopAiRoleDefinition[] = [
  COOP_AI_ROLE_DEFS.dps,
  COOP_AI_ROLE_DEFS.control,
  COOP_AI_ROLE_DEFS.guardian,
];

export function computeCoopRoleSynergy(roles: readonly [CoopAiRole, CoopAiRole]): CoopRoleSynergySummary {
  const r0 = COOP_AI_ROLE_DEFS[roles[0]] ?? COOP_AI_ROLE_DEFS.dps;
  const r1 = COOP_AI_ROLE_DEFS[roles[1]] ?? COOP_AI_ROLE_DEFS.guardian;

  const bossDamageBonus = Number((r0.bossDamageBonus + r1.bossDamageBonus).toFixed(3));
  const enemyProjectileSlowPct = Number(
    Math.min(0.32, r0.enemyProjectileSlowPct + r1.enemyProjectileSlowPct).toFixed(3)
  );
  const periodicHealPct = Number((r0.periodicHealPct + r1.periodicHealPct).toFixed(3));
  const damageReductionBonus = Number(
    Math.min(0.24, r0.damageReductionBonus + r1.damageReductionBonus).toFixed(3)
  );

  let teamBadge = 'Tổ Đội Cân Bằng';
  if (roles[0] === 'dps' && roles[1] === 'dps') teamBadge = 'Hỏa Lực Tối Đa (+30% ST Boss)';
  else if (roles[0] === 'guardian' && roles[1] === 'guardian') teamBadge = 'Pháo Đài Bất Hoại (+24% Thủ)';
  else if (roles[0] === 'control' && roles[1] === 'control') teamBadge = 'Kiểm Soát Tuyệt Đối (-32% Tốc Đạn)';
  else teamBadge = `Hiệp Đồng ${r0.shortLabel} + ${r1.shortLabel}`;

  return {
    roles: [r0.id, r1.id],
    teamBadge,
    bossDamageBonus,
    enemyProjectileSlowPct,
    periodicHealPct,
    damageReductionBonus,
  };
}

import type { CoopTacticalOrder } from '../types/game';

export type SeasonRankTierId = 'bronze' | 'silver' | 'gold' | 'platinum' | 'astral_emperor';

/**
 * ============================================================================
 * WAVE 9 — UNIFIED 5-PILLAR PURE SIMULATION & COMPETITIVE LEAGUE ENGINE
 * ============================================================================
 * Zero DOM / Three.js dependencies for deterministic 60Hz parity & fast tests.
 *
 * Pillar 1 & 2:
 *   - Boss Phase Transition Counter Window (2.5s at <=65% & <=30% HP)
 *   - Execution Finisher Eligibility (<=18% HP or Guard-Broken Boss/Elite) & Star-Spear Curve
 *   - Interactive 3D Arena Props (Celestial Obelisk, Crimson Brazier, Relic Crate)
 * Pillar 4:
 *   - Equalized Seasonal League Brackets (5 Divisions aligned with Firestore rules)
 * Pillar 5:
 *   - Co-op AI Emergency <35% HP Sanctuary Rescue + Tactical Combo Primers
 */

export const BOSS_PHASE_2_HP_RATIO = 0.65;
export const BOSS_PHASE_3_HP_RATIO = 0.30;
export const BOSS_PHASE_COUNTER_WINDOW_SEC = 2.5;
export const EXECUTION_FINISHER_HP_THRESHOLD = 0.18;
export const EXECUTION_FINISHER_DURATION_SEC = 0.72;

export interface BossPhaseCounterPresentation {
  active: boolean;
  remainingSec: number;
  totalSec: number;
  progress: number;
  fovPulseDelta: number;
  rimIntensityBoost: number;
  counterMultiplier: number;
  guardBreakBonusRatio: number;
  bannerText: string;
}

export function computeBossPhaseCounterPresentation(
  remainingSec: number,
  phaseLevel: 2 | 3 | null,
  totalSec = BOSS_PHASE_COUNTER_WINDOW_SEC
): BossPhaseCounterPresentation {
  if (remainingSec <= 0 || !phaseLevel) {
    return {
      active: false,
      remainingSec: 0,
      totalSec,
      progress: 1,
      fovPulseDelta: 0,
      rimIntensityBoost: 0,
      counterMultiplier: 1,
      guardBreakBonusRatio: 0,
      bannerText: '',
    };
  }
  const clamped = Math.max(0, Math.min(totalSec, remainingSec));
  const progress = 1 - clamped / Math.max(0.1, totalSec);
  // Subtle dramatic pull-out FOV surge on the opening 0.45s then settle smoothly
  const surgeCurve = progress < 0.25 ? Math.sin((progress / 0.25) * Math.PI) : 0;
  const fovPulseDelta = Number((surgeCurve * (phaseLevel === 3 ? 4.4 : 3.2)).toFixed(3));
  const rimIntensityBoost = Number(((1 - progress) * (phaseLevel === 3 ? 0.85 : 0.55)).toFixed(3));
  return {
    active: true,
    remainingSec: Number(clamped.toFixed(2)),
    totalSec,
    progress: Number(progress.toFixed(4)),
    fovPulseDelta,
    rimIntensityBoost,
    counterMultiplier: phaseLevel === 3 ? 1.75 : 1.55,
    guardBreakBonusRatio: phaseLevel === 3 ? 0.35 : 0.25,
    bannerText: `PHA ${phaseLevel === 3 ? 'III' : 'II'} CHUYỂN CẢNH · CỬA SỔ PHẢN CÔNG (${clamped.toFixed(1)}s)`,
  };
}

export interface ExecutionFinisherCheckInput {
  hp: number;
  maxHp: number;
  isBoss: boolean;
  isElite: boolean;
  isTrainingDummy?: boolean;
  isVaultPillar?: boolean;
  guardBroken?: boolean;
}

export function isExecutionFinisherEligible(input: ExecutionFinisherCheckInput): boolean {
  if (input.isTrainingDummy || input.isVaultPillar) return false;
  if (!input.isBoss && !input.isElite) return false;
  if (input.hp <= 0 || input.maxHp <= 0) return false;
  if (input.guardBroken) return true;
  return input.hp / input.maxHp <= EXECUTION_FINISHER_HP_THRESHOLD;
}

export interface ExecutionFinisherPresentation {
  active: boolean;
  progress: number;
  visualTimeScale: number;
  cameraZoomBlend: number;
  fovDelta: number;
  starSpearConverge: number;
  shatterBurst: number;
}

export function computeExecutionFinisherPresentation(
  remainingSec: number,
  durationSec = EXECUTION_FINISHER_DURATION_SEC
): ExecutionFinisherPresentation {
  if (remainingSec <= 0 || durationSec <= 0) {
    return {
      active: false,
      progress: 1,
      visualTimeScale: 1,
      cameraZoomBlend: 0,
      fovDelta: 0,
      starSpearConverge: 1,
      shatterBurst: 0,
    };
  }
  const progress = Math.max(0, Math.min(1, 1 - remainingSec / durationSec));
  // 0.45s crisp slow-motion (~62% of 0.72s duration), then smooth ramp back to 1.0x
  let visualTimeScale: number;
  if (progress < 0.62) {
    visualTimeScale = 0.2;
  } else {
    const t = (progress - 0.62) / 0.38;
    const smooth = t * t * (3 - 2 * t);
    visualTimeScale = 0.2 + 0.8 * smooth;
  }
  const cameraZoomBlend =
    progress < 0.25
      ? Math.sin((progress / 0.25) * (Math.PI / 2))
      : progress < 0.75
      ? 1
      : Math.cos(((progress - 0.75) / 0.25) * (Math.PI / 2));
  const starSpearConverge = Math.min(1, progress / 0.55);
  const shatterBurst = progress >= 0.45 ? Math.max(0, 1 - (progress - 0.45) / 0.55) : 0;

  return {
    active: true,
    progress: Number(progress.toFixed(4)),
    visualTimeScale: Number(visualTimeScale.toFixed(4)),
    cameraZoomBlend: Number(Math.max(0, Math.min(1, cameraZoomBlend)).toFixed(4)),
    fovDelta: Number((-5.2 * cameraZoomBlend).toFixed(3)),
    starSpearConverge: Number(starSpearConverge.toFixed(4)),
    shatterBurst: Number(shatterBurst.toFixed(4)),
  };
}

// ============================================================================
// INTERACTIVE 3D ARENA PROPS (CELESTIAL OBELISK, CRIMSON BRAZIER, RELIC CRATE)
// ============================================================================

export type ArenaPropKind = 'celestial_obelisk' | 'crimson_brazier' | 'relic_crate';

export interface ArenaPropConfig {
  kind: ArenaPropKind;
  label: string;
  shortDesc: string;
  primaryHex: number;
  accentHex: number;
  stoneHex: number;
  metalHex: number;
  aoeRadius: number;
  aoeAtkMult: number;
  healPct: number;
  shieldPct: number;
  ultGain: number;
  aspdBonusPct: number;
  atkBonusPct: number;
  buffDurationSec: number;
  goldBonus: number;
}

export const ARENA_PROP_CONFIGS: Record<ArenaPropKind, ArenaPropConfig> = {
  celestial_obelisk: {
    kind: 'celestial_obelisk',
    label: 'Đài Tinh Tú',
    shortDesc: '+28% Nộ Tuyệt Kỹ & +18% Tốc Đánh (6s)',
    primaryHex: 0x38bdf8,
    accentHex: 0xe0f2fe,
    stoneHex: 0x1e293b,
    metalHex: 0xfbbf24,
    aoeRadius: 4.4,
    aoeAtkMult: 1.45,
    healPct: 0,
    shieldPct: 0.08,
    ultGain: 28,
    aspdBonusPct: 18,
    atkBonusPct: 0,
    buffDurationSec: 6.0,
    goldBonus: 25,
  },
  crimson_brazier: {
    kind: 'crimson_brazier',
    label: 'Lò Hỏa Tinh',
    shortDesc: 'Nổ Hỏa Diệm 4.8m & +22% Sát Thương (6s)',
    primaryHex: 0xf97316,
    accentHex: 0xfde047,
    stoneHex: 0x27191b,
    metalHex: 0xd97706,
    aoeRadius: 4.8,
    aoeAtkMult: 2.15,
    healPct: 0,
    shieldPct: 0,
    ultGain: 12,
    aspdBonusPct: 0,
    atkBonusPct: 22,
    buffDurationSec: 6.0,
    goldBonus: 30,
  },
  relic_crate: {
    kind: 'relic_crate',
    label: 'Rương Di Tích',
    shortDesc: 'Hồi +14% HP, +12% Giáp Ảo & +45 Vàng',
    primaryHex: 0x34d399,
    accentHex: 0xfde047,
    stoneHex: 0x1b2620,
    metalHex: 0xf59e0b,
    aoeRadius: 3.4,
    aoeAtkMult: 0.85,
    healPct: 0.14,
    shieldPct: 0.12,
    ultGain: 10,
    aspdBonusPct: 10,
    atkBonusPct: 10,
    buffDurationSec: 5.0,
    goldBonus: 45,
  },
};

export interface ArenaPropPlacement {
  id: string;
  kind: ArenaPropKind;
  x: number;
  z: number;
  radius: number;
}

export function computeWave9ArenaPropPlacements(
  seed: number,
  arenaHalfW: number,
  arenaHalfD: number,
  obstacles: ReadonlyArray<{ x: number; z: number; r?: number; radius?: number }>,
  isBossStage: boolean
): ArenaPropPlacement[] {
  const count = isBossStage ? 3 : 2;
  const kinds: ArenaPropKind[] = ['celestial_obelisk', 'crimson_brazier', 'relic_crate'];
  const flankX = Math.max(4.4, Math.min(arenaHalfW - 1.5, 6.2));
  const candidates: Array<[number, number]> = [
    [-flankX, -4.6],
    [flankX, -4.6],
    [-flankX, 4.4],
    [flankX, 4.4],
    [-flankX + 0.8, 0.2],
    [flankX - 0.8, -0.2],
  ];

  const results: ArenaPropPlacement[] = [];
  const startOffset = Math.abs(seed) % candidates.length;

  for (let i = 0; i < candidates.length && results.length < count; i++) {
    const [cx, cz] = candidates[(startOffset + i) % candidates.length];
    if (Math.abs(cx) < 3.6) continue;
    if (Math.abs(cz) > arenaHalfD - 1.6) continue;
    const blockedByObstacle = obstacles.some((o) => {
      const or = o.r ?? o.radius ?? 0.9;
      return Math.hypot(cx - o.x, cz - o.z) < or + 1.85;
    });
    if (blockedByObstacle) continue;
    const tooCloseToSibling = results.some((p) => Math.hypot(cx - p.x, cz - p.z) < 3.5);
    if (tooCloseToSibling) continue;

    const kind = kinds[(Math.abs(seed) + results.length) % kinds.length];
    results.push({
      id: `w9_prop_${seed}_${results.length}`,
      kind,
      x: Number(cx.toFixed(2)),
      z: Number(cz.toFixed(2)),
      radius: 0.78,
    });
  }

  return results;
}

export interface ArenaPropActivationReward {
  kind: ArenaPropKind;
  label: string;
  healAmount: number;
  shieldAmount: number;
  ultGain: number;
  atkBonusPct: number;
  aspdBonusPct: number;
  buffDurationSec: number;
  aoeRadius: number;
  aoeDamage: number;
  goldBonus: number;
  calloutText: string;
}

export function resolveArenaPropActivation(
  kind: ArenaPropKind,
  maxHp: number,
  attackPower: number
): ArenaPropActivationReward {
  const cfg = ARENA_PROP_CONFIGS[kind];
  const healAmount = Math.round(Math.max(0, maxHp * cfg.healPct));
  const shieldAmount = Math.round(Math.max(0, maxHp * cfg.shieldPct));
  const aoeDamage = Math.round(Math.max(10, attackPower * cfg.aoeAtkMult));
  return {
    kind,
    label: cfg.label,
    healAmount,
    shieldAmount,
    ultGain: cfg.ultGain,
    atkBonusPct: cfg.atkBonusPct,
    aspdBonusPct: cfg.aspdBonusPct,
    buffDurationSec: cfg.buffDurationSec,
    aoeRadius: cfg.aoeRadius,
    aoeDamage,
    goldBonus: cfg.goldBonus,
    calloutText: `${cfg.label}: ${cfg.shortDesc}`,
  };
}

// ============================================================================
// PILLAR 4: EQUALIZED SEASONAL LEAGUE BRACKETS (5 DIVISIONS)
// ============================================================================

export interface SeasonLeagueDivisionDef {
  id: SeasonRankTierId;
  name: string;
  badgeText: string;
  minSeasonPoints: number;
  relegationFloor: number;
  promotionRewardGems: number;
  promotionRewardShards: number;
  colorClass: string;
  borderClass: string;
}

export const SEASON_LEAGUE_DIVISIONS: SeasonLeagueDivisionDef[] = [
  {
    id: 'bronze',
    name: 'Tân Tinh (Đồng)',
    badgeText: 'Hạng I · Tân Tinh',
    minSeasonPoints: 0,
    relegationFloor: 0,
    promotionRewardGems: 60,
    promotionRewardShards: 12,
    colorClass: 'text-amber-600',
    borderClass: 'border-amber-600/45',
  },
  {
    id: 'silver',
    name: 'Bạch Ngân (Bạc)',
    badgeText: 'Hạng II · Bạch Ngân',
    minSeasonPoints: 180,
    relegationFloor: 140,
    promotionRewardGems: 110,
    promotionRewardShards: 24,
    colorClass: 'text-slate-200',
    borderClass: 'border-slate-300/50',
  },
  {
    id: 'gold',
    name: 'Hoàng Kim (Vàng)',
    badgeText: 'Hạng III · Hoàng Kim',
    minSeasonPoints: 420,
    relegationFloor: 360,
    promotionRewardGems: 180,
    promotionRewardShards: 40,
    colorClass: 'text-amber-300',
    borderClass: 'border-amber-300/60',
  },
  {
    id: 'platinum',
    name: 'Bạch Kim Tinh Giới',
    badgeText: 'Hạng IV · Bạch Kim',
    minSeasonPoints: 760,
    relegationFloor: 680,
    promotionRewardGems: 280,
    promotionRewardShards: 65,
    colorClass: 'text-cyan-300',
    borderClass: 'border-cyan-300/65',
  },
  {
    id: 'astral_emperor',
    name: 'Tinh Đế Tối Cao',
    badgeText: 'Hạng V · Tinh Đế',
    minSeasonPoints: 1200,
    relegationFloor: 1080,
    promotionRewardGems: 450,
    promotionRewardShards: 110,
    colorClass: 'text-rose-300',
    borderClass: 'border-rose-400/75',
  },
];

export interface SeasonalLeagueStandingSummary {
  totalPoints: number;
  division: SeasonLeagueDivisionDef;
  nextDivision: SeasonLeagueDivisionDef | null;
  pointsToPromote: number;
  progressToNextPct: number;
  safeAboveRelegation: boolean;
  relegationBuffer: number;
  breakdown: {
    weeklyBossCp: number;
    equalizedArenaPoints: number;
    coopSyncPoints: number;
  };
}

export function computeSeasonalLeagueBracket(params: {
  weeklyBossSeasonPoints: number;
  equalizedArenaWins: number;
  coopSyncRuns?: number;
}): SeasonalLeagueStandingSummary {
  const weeklyBossCp = Math.max(0, Math.round(params.weeklyBossSeasonPoints));
  const equalizedArenaPoints = Math.max(0, Math.round(params.equalizedArenaWins)) * 28;
  const coopSyncPoints = Math.max(0, Math.round(params.coopSyncRuns ?? 0)) * 12;
  const totalPoints = weeklyBossCp + equalizedArenaPoints + coopSyncPoints;

  let currentIdx = 0;
  for (let i = SEASON_LEAGUE_DIVISIONS.length - 1; i >= 0; i--) {
    if (totalPoints >= SEASON_LEAGUE_DIVISIONS[i].minSeasonPoints) {
      currentIdx = i;
      break;
    }
  }
  const division = SEASON_LEAGUE_DIVISIONS[currentIdx];
  const nextDivision =
    currentIdx < SEASON_LEAGUE_DIVISIONS.length - 1
      ? SEASON_LEAGUE_DIVISIONS[currentIdx + 1]
      : null;

  const pointsToPromote = nextDivision
    ? Math.max(0, nextDivision.minSeasonPoints - totalPoints)
    : 0;
  const progressToNextPct = nextDivision
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round(
            ((totalPoints - division.minSeasonPoints) /
              Math.max(1, nextDivision.minSeasonPoints - division.minSeasonPoints)) *
              100
          )
        )
      )
    : 100;

  const relegationBuffer = Math.max(0, totalPoints - division.relegationFloor);

  return {
    totalPoints,
    division,
    nextDivision,
    pointsToPromote,
    progressToNextPct,
    safeAboveRelegation: totalPoints >= division.relegationFloor,
    relegationBuffer,
    breakdown: {
      weeklyBossCp,
      equalizedArenaPoints,
      coopSyncPoints,
    },
  };
}

// ============================================================================
// PILLAR 5: CO-OP AI EMERGENCY <35% HP SANCTUARY RESCUE & PRIMER CALLOUTS
// ============================================================================

export const COOP_SANCTUARY_HP_THRESHOLD = 0.35;
export const COOP_SANCTUARY_COOLDOWN_SEC = 14.0;

export interface CoopSanctuaryRescueResult {
  triggered: boolean;
  healAmount: number;
  shieldAmount: number;
  nextCooldownSec: number;
  calloutText: string | null;
}

export function evaluateCoopSanctuaryRescue(params: {
  playerHp: number;
  playerMaxHp: number;
  cooldownSec: number;
  order: CoopTacticalOrder;
  allyName?: string;
}): CoopSanctuaryRescueResult {
  if (params.cooldownSec > 0 || params.playerMaxHp <= 0 || params.playerHp <= 0) {
    return {
      triggered: false,
      healAmount: 0,
      shieldAmount: 0,
      nextCooldownSec: Math.max(0, params.cooldownSec),
      calloutText: null,
    };
  }
  const hpRatio = params.playerHp / params.playerMaxHp;
  const threshold =
    params.order === 'protect_player' ? 0.50 : COOP_SANCTUARY_HP_THRESHOLD;
  if (hpRatio >= threshold) {
    return {
      triggered: false,
      healAmount: 0,
      shieldAmount: 0,
      nextCooldownSec: 0,
      calloutText: null,
    };
  }
  const healMult = params.order === 'protect_player' ? 0.22 : 0.16;
  const shieldMult = params.order === 'protect_player' ? 0.28 : 0.20;
  const healAmount = Math.max(12, Math.round(params.playerMaxHp * healMult));
  const shieldAmount = Math.max(16, Math.round(params.playerMaxHp * shieldMult));
  const cd =
    params.order === 'protect_player'
      ? COOP_SANCTUARY_COOLDOWN_SEC - 3.0
      : COOP_SANCTUARY_COOLDOWN_SEC;
  const who = params.allyName || 'Đồng Đội [AI Live]';

  return {
    triggered: true,
    healAmount,
    shieldAmount,
    nextCooldownSec: cd,
    calloutText: `${who}: Vòng Hộ Mệnh Cứu Nguy! (+${healAmount} HP · +${shieldAmount} Khiên)`,
  };
}

export function computeCoopPrimerCallout(params: {
  order: CoopTacticalOrder;
  bossShieldRatio: number;
  allyUltCharge: number;
  allyName?: string;
}): string | null {
  const who = params.allyName || 'Đồng Đội AI';
  if (params.order === 'break_guard' && params.bossShieldRatio > 0.05) {
    return `${who}: Đang Phá Giáp Boss — Bấm F hoặc Q Liên Kích!`;
  }
  if (params.order === 'protect_player') {
    return `${who}: Đang giữ vị trí Hộ Vệ & sẵn sàng thả Vòng Hồi Phục!`;
  }
  if (params.allyUltCharge >= 92) {
    return `${who}: Tuyệt Kỹ đã nạp — Bấm Q kích hoạt Cộng Hưởng!`;
  }
  return null;
}

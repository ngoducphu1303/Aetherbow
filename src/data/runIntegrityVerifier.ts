/**
 * Wave 14 Pillar 4: Deterministic Combat Run Integrity Verifier
 * (Criterion 28 Security & Anti-Cheat + Criterion 02 Core Loop).
 *
 * Shared pure verifier invoked both client-side before committing run rewards
 * and server-side on `POST /api/runs/verify`.
 *
 * Security Invariants:
 * - Never trusts client-supplied reward ceilings or DPS caps.
 * - Recomputes authoritative upper bounds purely from chapter/stage/mode/powerRating.
 * - Flags speedhacks, memory-edited DPS spikes, and tampered reward totals while
 *   giving generous legitimate headroom for crits, Tier III synergies, Evolutions,
 *   Nightmare Ascension, and LiveOps events.
 */

export type RunIntegrityMode =
  | 'chapter'
  | 'tower'
  | 'boss_rush'
  | 'daily_rift'
  | 'guild_boss'
  | 'arena'
  | 'coop_raid'
  | 'elemental_tower'
  | 'crystal_defense'
  | 'world_boss'
  | 'blood_moon'
  | 'abyssal_gauntlet'
  | 'guild_war'
  | 'pantheon_expedition'
  | 'championship_3round'
  | 'crystal_vault'
  | 'dragon_lair'
  | 'sky_citadel';

export type RunIntegrityAnomalyCode =
  | 'invalid_payload'
  | 'impossible_clear_speed'
  | 'excessive_dps'
  | 'reward_gold_overflow'
  | 'reward_gems_overflow'
  | 'reward_xp_overflow'
  | 'replay_nonce';

export type RunIntegrityVerdict = 'verified' | 'clamped' | 'rejected';

export interface RunIntegrityReportInput {
  runNonce?: string;
  mode: RunIntegrityMode;
  chapterId: number;
  stageReached: number;
  victory: boolean;
  kills: number;
  durationSec: number;
  basePowerRating: number;
  totalDamageDealt?: number;
  peakDps?: number;
  claimedGold: number;
  claimedGems: number;
  claimedSeasonXp: number;
  nightmareTier?: number;
  liveOpsGoldMult?: number;
  liveOpsGemMult?: number;
  zodiacVowGoldMult?: number;
}

export interface RunIntegrityBounds {
  minPlausibleDurationSec: number;
  maxPlausibleDps: number;
  maxAllowedGold: number;
  maxAllowedGems: number;
  maxAllowedSeasonXp: number;
}

export interface RunIntegrityResult {
  ok: boolean;
  verdict: RunIntegrityVerdict;
  anomalies: RunIntegrityAnomalyCode[];
  reasons: string[];
  sanitizedRewards: {
    gold: number;
    gems: number;
    seasonXp: number;
  };
  bounds: RunIntegrityBounds;
}

const VALID_MODES = new Set<string>([
  'chapter',
  'tower',
  'boss_rush',
  'daily_rift',
  'guild_boss',
  'arena',
  'coop_raid',
  'elemental_tower',
  'crystal_defense',
  'world_boss',
  'blood_moon',
  'abyssal_gauntlet',
  'guild_war',
  'pantheon_expedition',
  'championship_3round',
  'crystal_vault',
  'dragon_lair',
  'sky_citadel',
]);

function isFiniteNonNeg(val: unknown): val is number {
  return typeof val === 'number' && Number.isFinite(val) && val >= 0;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * Computes authoritative upper bounds for a combat run without trusting any
 * client-supplied limit fields.
 */
export function computeAuthoritativeRunBounds(input: {
  mode: RunIntegrityMode;
  chapterId: number;
  stageReached: number;
  victory: boolean;
  basePowerRating: number;
  nightmareTier?: number;
  liveOpsGoldMult?: number;
  liveOpsGemMult?: number;
  zodiacVowGoldMult?: number;
}): RunIntegrityBounds {
  const ch = clamp(Math.floor(input.chapterId || 1), 1, 12);
  const stage = clamp(Math.floor(input.stageReached || 1), 1, 500);
  const power = clamp(Math.floor(input.basePowerRating || 702), 500, 5_000_000);
  const nmTier = clamp(Math.floor(input.nightmareTier ?? 0), 0, 5);
  const nmGoldMult = 1 + nmTier * 0.45;
  const goldMult = clamp(Number.isFinite(input.liveOpsGoldMult) ? input.liveOpsGoldMult! : 1, 0.5, 3.0);
  const gemMult = clamp(Number.isFinite(input.liveOpsGemMult) ? input.liveOpsGemMult! : 1, 0.5, 3.0);
  const vowGoldMult =
    ch <= 1 || (input.mode !== 'chapter' && input.mode !== 'tower')
      ? 1.0
      : clamp(Number.isFinite(input.zodiacVowGoldMult) ? input.zodiacVowGoldMult! : 1.0, 1.0, 1.7);

  // Minimum physically plausible clear time for multi-room runs (generous for overgeared speedruns)
  const roomsCleared =
    input.mode === 'chapter'
      ? Math.min(12, stage)
      : input.mode === 'tower' || input.mode === 'elemental_tower'
      ? Math.min(20, stage)
      : Math.min(8, stage);
  const minPlausibleDurationSec = roomsCleared >= 4 ? Math.max(4, Math.floor(roomsCleared * 1.4)) : 1;

  // Generous DPS ceiling allowing Crits + Overdrive + Evolutions + Tier III Synergies,
  // while decisively catching memory-editor 100x+ damage hacks.
  const maxPlausibleDps = Math.max(4_500, Math.round(power * 32));

  // Mode-specific authoritative reward ceilings (with comfortable 2.2x ceiling headroom for VIP/synergies/gold luck)
  let baseGoldCap = 1_600 + ch * 950 + Math.min(12, stage) * 420 + (input.victory ? 1_200 + ch * 320 : 0);
  let baseGemsCap = 45 + ch * 16 + (input.victory ? 65 + ch * 12 : 18);
  let baseXpCap = 420 + Math.min(20, stage) * 35 + (input.victory ? 180 : 0);

  if (input.mode === 'tower' || input.mode === 'elemental_tower') {
    const floorCap = Math.min(300, stage);
    baseGoldCap = 2_400 + floorCap * 620;
    baseGemsCap = 85 + floorCap * 18;
    baseXpCap = 500 + floorCap * 38;
  } else if (
    input.mode === 'world_boss' ||
    input.mode === 'guild_boss' ||
    input.mode === 'dragon_lair' ||
    input.mode === 'sky_citadel' ||
    input.mode === 'crystal_vault'
  ) {
    baseGoldCap = 12_000 + ch * 1_600;
    baseGemsCap = 360 + ch * 28;
    baseXpCap = 1_400;
  } else if (input.mode !== 'chapter') {
    baseGoldCap = 9_500 + ch * 1_200;
    baseGemsCap = 280 + ch * 22;
    baseXpCap = 1_100;
  }

  return {
    minPlausibleDurationSec,
    maxPlausibleDps,
    maxAllowedGold: Math.round(baseGoldCap * nmGoldMult * goldMult * vowGoldMult),
    maxAllowedGems: Math.round(baseGemsCap * gemMult),
    maxAllowedSeasonXp: Math.round(baseXpCap * 1.4),
  };
}

export function verifyCombatRunIntegrity(raw: RunIntegrityReportInput): RunIntegrityResult {
  const anomalies: RunIntegrityAnomalyCode[] = [];
  const reasons: string[] = [];

  const validMode = raw && typeof raw === 'object' && VALID_MODES.has(String(raw.mode));
  if (
    !validMode ||
    !isFiniteNonNeg(raw.chapterId) ||
    !isFiniteNonNeg(raw.stageReached) ||
    !isFiniteNonNeg(raw.kills) ||
    !isFiniteNonNeg(raw.durationSec) ||
    !isFiniteNonNeg(raw.basePowerRating) ||
    !isFiniteNonNeg(raw.claimedGold) ||
    !isFiniteNonNeg(raw.claimedGems) ||
    !isFiniteNonNeg(raw.claimedSeasonXp)
  ) {
    const fallbackBounds = computeAuthoritativeRunBounds({
      mode: 'chapter',
      chapterId: 1,
      stageReached: 1,
      victory: false,
      basePowerRating: 702,
    });
    return {
      ok: false,
      verdict: 'rejected',
      anomalies: ['invalid_payload'],
      reasons: ['Báo cáo kết quả trận đấu thiếu trường bắt buộc hoặc chứa giá trị âm/NaN.'],
      sanitizedRewards: { gold: 0, gems: 0, seasonXp: 0 },
      bounds: fallbackBounds,
    };
  }

  const bounds = computeAuthoritativeRunBounds({
    mode: raw.mode,
    chapterId: raw.chapterId,
    stageReached: raw.stageReached,
    victory: Boolean(raw.victory),
    basePowerRating: raw.basePowerRating,
    nightmareTier: raw.nightmareTier,
    liveOpsGoldMult: raw.liveOpsGoldMult,
    liveOpsGemMult: raw.liveOpsGemMult,
    zodiacVowGoldMult: raw.zodiacVowGoldMult,
  });

  // 1. Speedhack / impossible clear duration check
  const effectiveDuration = Math.max(0.1, raw.durationSec);
  if (raw.stageReached >= 4 && raw.durationSec < bounds.minPlausibleDurationSec) {
    anomalies.push('impossible_clear_speed');
    reasons.push(
      `Thời lượng vượt ${raw.stageReached} ải (${raw.durationSec.toFixed(1)}s) thấp hơn ngưỡng vật lý (${bounds.minPlausibleDurationSec}s).`
    );
  }

  // 2. Peak / average DPS ceiling check
  const avgDps =
    isFiniteNonNeg(raw.totalDamageDealt) && raw.totalDamageDealt > 0
      ? raw.totalDamageDealt / effectiveDuration
      : 0;
  const peakDps = isFiniteNonNeg(raw.peakDps) ? raw.peakDps : avgDps;
  const observedDps = Math.max(avgDps, peakDps);
  if (observedDps > bounds.maxPlausibleDps) {
    anomalies.push('excessive_dps');
    reasons.push(
      `Đỉnh sát thương/giây (${Math.round(observedDps).toLocaleString('vi-VN')}) vượt trần Lực Chiến (${bounds.maxPlausibleDps.toLocaleString('vi-VN')}).`
    );
  }

  // 3. Authoritative reward clamping
  let safeGold = Math.round(raw.claimedGold);
  let safeGems = Math.round(raw.claimedGems);
  let safeXp = Math.round(raw.claimedSeasonXp);

  if (safeGold > bounds.maxAllowedGold) {
    anomalies.push('reward_gold_overflow');
    reasons.push(`Vàng thưởng (${safeGold}) vượt trần hợp lệ (${bounds.maxAllowedGold}) và đã bị kẹp biên.`);
    safeGold = bounds.maxAllowedGold;
  }
  if (safeGems > bounds.maxAllowedGems) {
    anomalies.push('reward_gems_overflow');
    reasons.push(`Ngọc thưởng (${safeGems}) vượt trần hợp lệ (${bounds.maxAllowedGems}) và đã bị kẹp biên.`);
    safeGems = bounds.maxAllowedGems;
  }
  if (safeXp > bounds.maxAllowedSeasonXp) {
    anomalies.push('reward_xp_overflow');
    reasons.push(`Điểm Mùa (${safeXp}) vượt trần hợp lệ (${bounds.maxAllowedSeasonXp}) và đã bị kẹp biên.`);
    safeXp = bounds.maxAllowedSeasonXp;
  }

  // Severe simultaneous speedhack + DPS hack rejects rewards outright; otherwise clamp safely
  const hasSevereCombo =
    anomalies.includes('impossible_clear_speed') && anomalies.includes('excessive_dps');
  if (hasSevereCombo) {
    return {
      ok: false,
      verdict: 'rejected',
      anomalies,
      reasons,
      sanitizedRewards: { gold: 0, gems: 0, seasonXp: 0 },
      bounds,
    };
  }

  // If speedhack or excessive DPS alone was detected, apply a defensive 50% clamp ceiling
  if (anomalies.includes('impossible_clear_speed') || anomalies.includes('excessive_dps')) {
    safeGold = Math.min(safeGold, Math.round(bounds.maxAllowedGold * 0.5));
    safeGems = Math.min(safeGems, Math.round(bounds.maxAllowedGems * 0.5));
    safeXp = Math.min(safeXp, Math.round(bounds.maxAllowedSeasonXp * 0.5));
  }

  const verdict: RunIntegrityVerdict = anomalies.length === 0 ? 'verified' : 'clamped';
  return {
    ok: anomalies.length === 0,
    verdict,
    anomalies,
    reasons,
    sanitizedRewards: {
      gold: safeGold,
      gems: safeGems,
      seasonXp: safeXp,
    },
    bounds,
  };
}

import {
  AiAutoPilotTactic,
  ArenaOpponent,
  ComputedPlayerStats,
  FairProgressionState,
  GachaPullHistoryEntry,
  PityState,
  Rarity,
  SkillDefinition,
  SkillId,
  WeaponArchetype,
} from '../types/game';
import { computeComboStyleRank } from './aaaCombatDirector';

// ============================================================================
// PILLAR 1: AAA PRODUCTION QUALITY — DYNAMIC LIGHTING MOOD & ADAPTIVE DPR GUARD
// ============================================================================

export type CombatLightingMood = 'normal' | 'boss_enrage' | 'victory_golden';

export interface CombatLightingState {
  mood: CombatLightingMood;
  rimIntensity: number;
  hemiIntensity: number;
  fogDensityMult: number;
  enrageBlend: number; // 0..1
  victoryBlend: number; // 0..1
}

export function createCombatLightingState(): CombatLightingState {
  return {
    mood: 'normal',
    rimIntensity: 1.0,
    hemiIntensity: 1.0,
    fogDensityMult: 1.0,
    enrageBlend: 0,
    victoryBlend: 0,
  };
}

export function stepCombatLightingMood(
  current: CombatLightingState,
  targetMood: CombatLightingMood,
  dt: number
): CombatLightingState {
  const safeDt = Math.max(0.001, Math.min(0.08, dt));
  const alpha = 1 - Math.exp(-3.4 * safeDt);
  const targetEnrage = targetMood === 'boss_enrage' ? 1 : 0;
  const targetVictory = targetMood === 'victory_golden' ? 1 : 0;
  const targetRim =
    targetMood === 'boss_enrage' ? 1.52 : targetMood === 'victory_golden' ? 1.38 : 1.0;
  const targetHemi =
    targetMood === 'boss_enrage' ? 0.78 : targetMood === 'victory_golden' ? 1.18 : 1.0;
  const targetFog =
    targetMood === 'boss_enrage' ? 1.32 : targetMood === 'victory_golden' ? 0.82 : 1.0;

  return {
    mood: targetMood,
    rimIntensity: current.rimIntensity + (targetRim - current.rimIntensity) * alpha,
    hemiIntensity: current.hemiIntensity + (targetHemi - current.hemiIntensity) * alpha,
    fogDensityMult: current.fogDensityMult + (targetFog - current.fogDensityMult) * alpha,
    enrageBlend: current.enrageBlend + (targetEnrage - current.enrageBlend) * alpha,
    victoryBlend: current.victoryBlend + (targetVictory - current.victoryBlend) * alpha,
  };
}

export function evaluateAdaptiveResolutionScale(
  avgFrameMs: number,
  currentScale: number,
  guardEnabled: boolean
): number {
  if (!guardEnabled) return 1.0;
  const clampedCur = Math.max(0.75, Math.min(1.0, currentScale));
  if (avgFrameMs > 25) {
    return Math.max(0.75, Number((clampedCur - 0.05).toFixed(2)));
  }
  if (avgFrameMs < 15.5 && clampedCur < 1.0) {
    return Math.min(1.0, Number((clampedCur + 0.05).toFixed(2)));
  }
  return clampedCur;
}

// ============================================================================
// PILLAR 2: WORLD-CLASS GAME FEEL — 120ms INPUT BUFFER, WEAPON SIGNATURES & COMBO LIFT
// ============================================================================

export type BufferedCombatAction = 'dash' | 'activeSkill' | 'ultimate';

export interface CombatInputBufferState {
  queuedAtMs: Record<BufferedCombatAction, number>;
}

export const COMBAT_INPUT_BUFFER_WINDOW_MS = 120;

export function createCombatInputBuffer(): CombatInputBufferState {
  return {
    queuedAtMs: {
      dash: -1,
      activeSkill: -1,
      ultimate: -1,
    },
  };
}

export function queueBufferedAction(
  buffer: CombatInputBufferState,
  action: BufferedCombatAction,
  nowMs: number
): void {
  buffer.queuedAtMs[action] = Math.max(0, nowMs);
}

export function hasBufferedAction(
  buffer: CombatInputBufferState,
  action: BufferedCombatAction,
  nowMs: number,
  windowMs = COMBAT_INPUT_BUFFER_WINDOW_MS
): boolean {
  const ts = buffer.queuedAtMs[action];
  return ts >= 0 && nowMs - ts >= 0 && nowMs - ts <= windowMs;
}

export function consumeBufferedAction(
  buffer: CombatInputBufferState,
  action: BufferedCombatAction,
  nowMs: number,
  windowMs = COMBAT_INPUT_BUFFER_WINDOW_MS
): boolean {
  if (!hasBufferedAction(buffer, action, nowMs, windowMs)) return false;
  buffer.queuedAtMs[action] = -1;
  return true;
}

export function clearCombatInputBuffer(buffer: CombatInputBufferState): void {
  buffer.queuedAtMs.dash = -1;
  buffer.queuedAtMs.activeSkill = -1;
  buffer.queuedAtMs.ultimate = -1;
}

export interface WeaponKineticSignature {
  archetype: WeaponArchetype;
  label: string;
  recoilKick: number;
  critShakeMult: number;
  hitstopTicks: number;
  impactHex: number;
  sparkCount: number;
  releasePitch: number;
  critPitch: number;
}

export const WEAPON_KINETIC_SIGNATURES: Record<WeaponArchetype, WeaponKineticSignature> = {
  bow: {
    archetype: 'bow',
    label: 'Cung Tiễn Xuyên Phá',
    recoilKick: 0.14,
    critShakeMult: 1.05,
    hitstopTicks: 3,
    impactHex: 0xfde047,
    sparkCount: 7,
    releasePitch: 1.08,
    critPitch: 1.24,
  },
  staff: {
    archetype: 'staff',
    label: 'Pháp Trượng Cộng Hưởng',
    recoilKick: 0.11,
    critShakeMult: 1.15,
    hitstopTicks: 3,
    impactHex: 0x38bdf8,
    sparkCount: 9,
    releasePitch: 0.96,
    critPitch: 1.16,
  },
  claw: {
    archetype: 'claw',
    label: 'Song Trảo Xé Gió',
    recoilKick: 0.19,
    critShakeMult: 1.25,
    hitstopTicks: 4,
    impactHex: 0xfb7185,
    sparkCount: 10,
    releasePitch: 1.18,
    critPitch: 1.32,
  },
};

export function getWeaponKineticSignature(
  archetype: WeaponArchetype = 'bow'
): WeaponKineticSignature {
  return WEAPON_KINETIC_SIGNATURES[archetype] ?? WEAPON_KINETIC_SIGNATURES.bow;
}

export interface ComboPromotionEvent {
  promoted: boolean;
  grade: string;
  title: string;
  accentHex: string;
  pitchBoost: number;
}

export function evaluateComboRankPromotion(
  prevCombo: number,
  nextCombo: number
): ComboPromotionEvent {
  const prevRank = computeComboStyleRank(Math.max(0, prevCombo));
  const nextRank = computeComboStyleRank(Math.max(0, nextCombo));
  const order = ['C', 'B', 'A', 'S', 'SS', 'SSS'];
  const prevIdx = order.indexOf(prevRank.grade);
  const nextIdx = order.indexOf(nextRank.grade);
  const promoted = nextCombo > prevCombo && nextIdx > prevIdx && nextIdx >= 1;
  return {
    promoted,
    grade: nextRank.grade,
    title: nextRank.title,
    accentHex: nextRank.accentHex,
    pitchBoost: 1 + Math.max(0, nextIdx) * 0.075,
  };
}

// ============================================================================
// PILLAR 3: FAIR PROGRESSION — TRANSPARENT PITY, ASTRAL SHARDS & EQUALIZED PVP
// ============================================================================

export type FairChestVariant = 'iron' | 'mythic' | 'rune_bag' | 'rune_rare';

export interface GachaRateDisclosureRow {
  rarity: Rarity;
  label: string;
  baseRatePct: number;
  softPityNote: string;
}

export interface TransparentPitySummary {
  variant: FairChestVariant;
  epicPityCurrent: number;
  epicPityMax: number;
  epicRemaining: number;
  sTierPityCurrent: number;
  sTierPityMax: number;
  sTierRemaining: number;
  softPityActive: boolean;
  effectiveSTierRatePct: number;
  rates: GachaRateDisclosureRow[];
}

export function computeTransparentPitySummary(
  pity: PityState | undefined,
  variant: FairChestVariant
): TransparentPitySummary {
  const epicCur =
    variant === 'rune_bag' || variant === 'rune_rare'
      ? Math.max(0, pity?.runeRollsSinceEpic ?? 0)
      : Math.max(0, pity?.mythicRollsSinceEpic ?? 0);
  const epicMax = 10;
  const isRuneVariant = variant === 'rune_bag' || variant === 'rune_rare';
  const sMax = isRuneVariant ? 30 : 50;
  const sCur = Math.max(
    0,
    isRuneVariant
      ? pity?.runeRollsSinceLegendary ?? 0
      : pity?.mythicRollsSinceSTier ?? 0
  );
  const softPityActive =
    (variant === 'mythic' && sCur >= 35) || (variant === 'rune_rare' && sCur >= 22);
  const softBoost =
    variant === 'mythic' && softPityActive
      ? (sCur - 34) * 2.5
      : variant === 'rune_rare' && softPityActive
      ? (sCur - 21) * 5.0
      : 0;
  const baseSTier = variant === 'mythic' ? 3.5 : variant === 'rune_rare' ? 4.5 : 0.8;
  const effectiveSTierRatePct =
    sCur >= sMax - 1 ? 100 : Math.min(100, Number((baseSTier + softBoost).toFixed(1)));

  const rates: GachaRateDisclosureRow[] =
    variant === 'mythic'
      ? [
          {
            rarity: Rarity.LEGENDARY,
            label: 'Huyền Thoại / S-Tier',
            baseRatePct: effectiveSTierRatePct,
            softPityNote: 'Tăng +2.5%/lượt từ lượt 36 · Chắc chắn ở lượt 50',
          },
          {
            rarity: Rarity.EPIC,
            label: 'Sử Thi',
            baseRatePct: 16.5,
            softPityNote: 'Bảo hiểm chắc chắn mỗi 10 lượt',
          },
          {
            rarity: Rarity.RARE,
            label: 'Hiếm',
            baseRatePct: 48.0,
            softPityNote: 'Tặng kèm +2 Tinh Mảnh Hoàng Đạo',
          },
          {
            rarity: Rarity.COMMON,
            label: 'Thường',
            baseRatePct: Math.max(0, Number((35.5 - effectiveSTierRatePct).toFixed(1))),
            softPityNote: 'Tặng kèm +1 Tinh Mảnh Hoàng Đạo',
          },
        ]
      : variant === 'rune_rare' || variant === 'rune_bag'
      ? [
          {
            rarity: Rarity.LEGENDARY,
            label: 'Cổ Ngữ Huyền Thoại',
            baseRatePct: variant === 'rune_rare' ? effectiveSTierRatePct : 1.0,
            softPityNote:
              variant === 'rune_rare'
                ? 'Tăng +5%/lượt từ lượt 22 · Chắc chắn ở lượt 30 (+8 Mảnh Cổ Ngữ)'
                : 'Nhận kèm +8 Mảnh Cổ Ngữ',
          },
          {
            rarity: Rarity.EPIC,
            label: 'Cổ Ngữ Sử Thi',
            baseRatePct: variant === 'rune_rare' ? 22.5 : 9.0,
            softPityNote: 'Bảo hiểm chắc chắn mỗi 10 lượt',
          },
          {
            rarity: Rarity.RARE,
            label: 'Cổ Ngữ Hiếm',
            baseRatePct: 48.0,
            softPityNote: 'Tặng kèm +2 Tinh Mảnh Hoàng Đạo',
          },
          {
            rarity: Rarity.COMMON,
            label: 'Cổ Ngữ Thường',
            baseRatePct: variant === 'rune_rare' ? 25.0 : 42.0,
            softPityNote: 'Tặng kèm +1 Tinh Mảnh Hoàng Đạo',
          },
        ]
      : [
          {
            rarity: Rarity.EPIC,
            label: 'Sử Thi',
            baseRatePct: 8.0,
            softPityNote: 'Bảo hiểm chắc chắn mỗi 10 lượt Rương Thần Thoại',
          },
          {
            rarity: Rarity.RARE,
            label: 'Hiếm',
            baseRatePct: 37.0,
            softPityNote: 'Tặng kèm +2 Tinh Mảnh Hoàng Đạo',
          },
          {
            rarity: Rarity.COMMON,
            label: 'Thường',
            baseRatePct: 55.0,
            softPityNote: 'Tặng kèm +1 Tinh Mảnh Hoàng Đạo',
          },
        ];

  return {
    variant,
    epicPityCurrent: Math.min(epicMax, epicCur),
    epicPityMax: epicMax,
    epicRemaining: Math.max(1, epicMax - epicCur),
    sTierPityCurrent: Math.min(sMax, sCur),
    sTierPityMax: sMax,
    sTierRemaining: Math.max(1, sMax - sCur),
    softPityActive,
    effectiveSTierRatePct,
    rates,
  };
}

export function computeAstralShardsAwarded(rarities: Rarity[]): number {
  let total = 0;
  for (const r of rarities) {
    if (r === Rarity.MYTHIC) total += 8;
    else if (r === Rarity.LEGENDARY) total += 5;
    else if (r === Rarity.EPIC) total += 3;
    else if (r === Rarity.RARE) total += 2;
    else total += 1;
  }
  return Math.max(1, total);
}

export interface AstralShardExchangeItem {
  id: string;
  title: string;
  subtitle: string;
  costShards: number;
  kind: 'gear' | 'rune' | 'gems' | 'awakening';
  templateId?: string;
  runeId?: string;
  rarity?: Rarity;
  amount?: number;
  accentClass: string;
}

export const ASTRAL_SHARD_EXCHANGE_CATALOG: AstralShardExchangeItem[] = [
  {
    id: 'ex_oracle_spear',
    title: 'Trường Thương Tiên Tri [S]',
    subtitle: 'Vũ Khí S-Tier Sử Thi · Chọn trực tiếp không phụ thuộc RNG',
    costShards: 45,
    kind: 'gear',
    templateId: 'oracle_spear',
    rarity: Rarity.EPIC,
    accentClass: 'text-amber-300',
  },
  {
    id: 'ex_dragoon_crossbow',
    title: 'Nỏ Long Kỵ Thần Công [S]',
    subtitle: 'Vũ Khí S-Tier Sử Thi · Xuyên giáp & chí mạng bùng nổ',
    costShards: 45,
    kind: 'gear',
    templateId: 'dragoon_crossbow',
    rarity: Rarity.EPIC,
    accentClass: 'text-rose-300',
  },
  {
    id: 'ex_griffin_claw',
    title: 'Song Trảo Điểu Sư [S]',
    subtitle: 'Vũ Khí S-Tier Sử Thi · Tốc đánh cực hạn & sát thương gần',
    costShards: 45,
    kind: 'gear',
    templateId: 'griffin_claw',
    rarity: Rarity.EPIC,
    accentClass: 'text-sky-300',
  },
  {
    id: 'ex_oracle_plate',
    title: 'Giáp Hộ Vệ Tiên Tri [S]',
    subtitle: 'Áo Giáp S-Tier Sử Thi · Sinh lực lớn & giảm sát thương',
    costShards: 40,
    kind: 'gear',
    templateId: 'oracle_plate',
    rarity: Rarity.EPIC,
    accentClass: 'text-purple-300',
  },
  {
    id: 'ex_awakening_pack',
    title: 'Gói Tinh Thể Thức Tỉnh ×12',
    subtitle: 'Đột phá sao anh hùng & nâng cấp kỹ năng bị động',
    costShards: 20,
    kind: 'awakening',
    amount: 12,
    accentClass: 'text-emerald-300',
  },
  {
    id: 'ex_soul_gems_pack',
    title: 'Túi Ngọc Hồn Minh Bạch ×120',
    subtitle: 'Đổi trực tiếp Ngọc Hồn phục vụ triệu hồi & vé đấu trường',
    costShards: 24,
    kind: 'gems',
    amount: 120,
    accentClass: 'text-cyan-300',
  },
];

export function normalizeFairProgression(
  fp?: Partial<FairProgressionState>
): FairProgressionState {
  const validKits = ['assassin_counter', 'rapid_ranger', 'elemental_sage'] as const;
  const kitId = validKits.includes(fp?.selectedTrialKitId as (typeof validKits)[number])
    ? (fp?.selectedTrialKitId as (typeof validKits)[number])
    : 'assassin_counter';
  return {
    astralShards: Math.max(0, Math.floor(fp?.astralShards ?? 12)),
    pullHistory: Array.isArray(fp?.pullHistory) ? fp.pullHistory.slice(0, 30) : [],
    totalExchanges: Math.max(0, Math.floor(fp?.totalExchanges ?? 0)),
    arenaEqualizedMode: fp?.arenaEqualizedMode ?? true,
    equalizedArenaWins: Math.max(0, Math.floor(fp?.equalizedArenaWins ?? 0)),
    equalizedTrialRound: Math.max(1, Math.min(3, Math.floor(fp?.equalizedTrialRound ?? 1))),
    equalizedTrialWins: Math.max(0, Math.floor(fp?.equalizedTrialWins ?? 0)),
    selectedTrialKitId: kitId,
    equalizedRift: fp?.equalizedRift
      ? {
          dateKey: String(fp.equalizedRift.dateKey ?? ''),
          bestFloorToday: Math.max(0, Math.floor(fp.equalizedRift.bestFloorToday ?? 0)),
          seasonBestFloor: Math.max(0, Math.floor(fp.equalizedRift.seasonBestFloor ?? 0)),
          claimedMilestones: Array.isArray(fp.equalizedRift.claimedMilestones)
            ? fp.equalizedRift.claimedMilestones
            : [],
          totalRiftClears: Math.max(0, Math.floor(fp.equalizedRift.totalRiftClears ?? 0)),
        }
      : undefined,
  };
}

export function appendGachaPullHistory(
  existing: GachaPullHistoryEntry[],
  newEntries: GachaPullHistoryEntry[],
  maxEntries = 30
): GachaPullHistoryEntry[] {
  return [...newEntries, ...existing].slice(0, maxEntries);
}

export interface EqualizedArenaResult {
  playerStats: ComputedPlayerStats;
  opponent: ArenaOpponent;
  baselineHp: number;
  baselineAttack: number;
  baselineCritPct: number;
  fairPlayBonusCoins: number;
}

export const EQUALIZED_ARENA_BASELINE = {
  maxHp: 3200,
  attack: 165,
  attackSpeed: 1.28,
  moveSpeed: 6.4,
  critChance: 0.22,
  critMultiplier: 1.85,
  damageReduction: 0.1,
} as const;

/**
 * Equalized Fair-Play PvP Normalization:
 * Places both player and rival on an identical stat baseline so skill (dodging,
 * counter-shots, spacing, Ultimate timing) decides the 1v1 duel, not wallet/power gap.
 */
export function computeEqualizedArenaStats(
  playerStats: ComputedPlayerStats,
  opponent: ArenaOpponent
): EqualizedArenaResult {
  const normalizedPlayer: ComputedPlayerStats = {
    ...playerStats,
    maxHp: EQUALIZED_ARENA_BASELINE.maxHp,
    attack: EQUALIZED_ARENA_BASELINE.attack,
    attackSpeedMult: EQUALIZED_ARENA_BASELINE.attackSpeed,
    moveSpeed: EQUALIZED_ARENA_BASELINE.moveSpeed,
    critChance: EQUALIZED_ARENA_BASELINE.critChance,
    critDamage: EQUALIZED_ARENA_BASELINE.critMultiplier,
    damageReduction: EQUALIZED_ARENA_BASELINE.damageReduction,
  };

  const fairPlayBonusCoins = Math.round(opponent.rewardArenaCoins * 0.35);
  const normalizedOpponent: ArenaOpponent = {
    ...opponent,
    maxHp: EQUALIZED_ARENA_BASELINE.maxHp,
    attack: EQUALIZED_ARENA_BASELINE.attack,
    speedMult: 1.0,
    rewardArenaCoins: opponent.rewardArenaCoins + fairPlayBonusCoins,
  };

  return {
    playerStats: normalizedPlayer,
    opponent: normalizedOpponent,
    baselineHp: EQUALIZED_ARENA_BASELINE.maxHp,
    baselineAttack: EQUALIZED_ARENA_BASELINE.attack,
    baselineCritPct: Math.round(EQUALIZED_ARENA_BASELINE.critChance * 100),
    fairPlayBonusCoins,
  };
}

// ============================================================================
// PILLAR 4: COMPETITIVE LIVEOPS — SEASON HUB, RANK TIERS & MILESTONES
// ============================================================================

export interface SeasonRankTierDef {
  id: 'bronze' | 'silver' | 'gold' | 'platinum' | 'astral_emperor';
  label: string;
  minPoints: number;
  colorClass: string;
  accentHex: string;
  rewardGems: number;
  rewardShards: number;
}

export const SEASON_RANK_TIERS: SeasonRankTierDef[] = [
  {
    id: 'bronze',
    label: 'Tinh Vệ Đồng',
    minPoints: 0,
    colorClass: 'text-amber-500',
    accentHex: '#d97706',
    rewardGems: 40,
    rewardShards: 6,
  },
  {
    id: 'silver',
    label: 'Chiến Tướng Bạc',
    minPoints: 120,
    colorClass: 'text-slate-200',
    accentHex: '#cbd5e1',
    rewardGems: 80,
    rewardShards: 12,
  },
  {
    id: 'gold',
    label: 'Thủ Lĩnh Vàng',
    minPoints: 260,
    colorClass: 'text-amber-300',
    accentHex: '#fbbf24',
    rewardGems: 140,
    rewardShards: 20,
  },
  {
    id: 'platinum',
    label: 'Bạch Kim Tinh Giới',
    minPoints: 440,
    colorClass: 'text-cyan-300',
    accentHex: '#22d3ee',
    rewardGems: 220,
    rewardShards: 30,
  },
  {
    id: 'astral_emperor',
    label: 'Hoàng Đạo Tinh Đế',
    minPoints: 680,
    colorClass: 'text-rose-300',
    accentHex: '#fb7185',
    rewardGems: 360,
    rewardShards: 48,
  },
];

export interface ActiveCompetitiveSeasonInfo {
  seasonId: string;
  seasonNumber: number;
  title: string;
  endsAtMs: number;
  remainingMs: number;
  weekIndexInSeason: number;
}

const SEASON_DURATION_MS = 28 * 24 * 60 * 60 * 1000;
const SEASON_EPOCH_MS = Date.UTC(2026, 0, 5, 0, 0, 0);

export function getActiveCompetitiveSeason(nowMs = Date.now()): ActiveCompetitiveSeasonInfo {
  const safeNow = Math.max(SEASON_EPOCH_MS, nowMs);
  const elapsed = safeNow - SEASON_EPOCH_MS;
  const seasonIdx = Math.floor(elapsed / SEASON_DURATION_MS);
  const seasonNumber = seasonIdx + 1;
  const seasonStart = SEASON_EPOCH_MS + seasonIdx * SEASON_DURATION_MS;
  const endsAtMs = seasonStart + SEASON_DURATION_MS;
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const weekIndexInSeason = Math.min(4, Math.floor((safeNow - seasonStart) / weekMs) + 1);

  return {
    seasonId: `S${String(seasonNumber).padStart(2, '0')}`,
    seasonNumber,
    title: `Mùa ${seasonNumber} · Tranh Bá Hoàng Đạo`,
    endsAtMs,
    remainingMs: Math.max(0, endsAtMs - safeNow),
    weekIndexInSeason,
  };
}

export function resolveSeasonRankTier(points: number): SeasonRankTierDef {
  const p = Math.max(0, points);
  let best = SEASON_RANK_TIERS[0];
  for (const tier of SEASON_RANK_TIERS) {
    if (p >= tier.minPoints) best = tier;
  }
  return best;
}

export function getNextSeasonRankTier(points: number): SeasonRankTierDef | null {
  const p = Math.max(0, points);
  for (const tier of SEASON_RANK_TIERS) {
    if (p < tier.minPoints) return tier;
  }
  return null;
}

// ============================================================================
// PILLAR 5: AI REAL-TIME — SKILL DRAFT RATIONALE FOR AUTO-PILOT TRANSPARENCY
// ============================================================================

export function explainAiSkillChoice(
  skill: SkillDefinition,
  currentStacks: Partial<Record<SkillId, number>>,
  tactic: AiAutoPilotTactic
): string {
  const has = (id: SkillId) => (currentStacks[id] ?? 0) > 0;
  if (
    (skill.id === 'super_blaze' && has('fire_arrow')) ||
    (skill.id === 'super_freeze' && has('ice_arrow')) ||
    (skill.id === 'super_bolt' && has('lightning_arrow')) ||
    (skill.id === 'super_circle' && has('orbit_orbs')) ||
    (skill.id === 'twin_strike' && has('flying_swords')) ||
    (skill.id === 'super_meteor' && has('meteor_shower'))
  ) {
    return 'Kích hoạt Tiến Hóa Kỹ Năng tối thượng';
  }
  if (
    skill.id === 'multishot' ||
    skill.id === 'front_arrow' ||
    skill.id === 'ricochet' ||
    skill.id === 'tracking_eye'
  ) {
    return 'Nhân bội sát thương cốt lõi đa tiễn';
  }
  if (tactic === 'aggressive' && (skill.buildTag === 'boss' || skill.category === 'weapon')) {
    return 'Tối ưu thế đánh Tấn Công phá Boss';
  }
  if (tactic === 'evasive' && (skill.buildTag === 'sustain' || skill.category === 'circle')) {
    return 'Tăng khả năng sinh tồn & bảo toàn HP';
  }
  if (skill.rarity === 'legend') return 'Kỹ năng Huyền Thoại giá trị cao nhất';
  if (skill.rarity === 'epic') return 'Kỹ năng Sử Thi cộng hưởng tốt';
  return 'Cân bằng sát thương & nhịp thả diều';
}

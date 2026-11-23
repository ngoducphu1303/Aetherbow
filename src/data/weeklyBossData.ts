import type {
  AvatarFrameId,
  CombatStyleGrade,
  ComputedPlayerStats,
  DynamicTitleId,
} from '../types/game';

export const WEEKLY_BOSS_MAX_FREE_ATTEMPTS = 3;
export const WEEKLY_BOSS_TIME_LIMIT_SEC = 90;
export const WEEKLY_BOSS_BASE_HP = 18500;

export interface WeeklyBossLoanerGearItem {
  slotLabel: string;
  name: string;
  rarityLabel: 'Sử Thi';
  level: number;
  summary: string;
}

export interface WeeklyBossRewardTier {
  tierId: string;
  minScore: number;
  title: string;
  subtitle: string;
  rewardTitleLabel: string;
  rewardDynamicTitleId?: DynamicTitleId;
  rewardFrameId?: AvatarFrameId;
  rewardFrameName?: string;
}

export interface WeeklyBossSchedule {
  weekId: string;
  weekIndex: number;
  bossId: string;
  bossName: string;
  bossSubtitle: string;
  chapterVisualIndex: number;
  seed: string;
  startsAt: number;
  endsAt: number;
  maxFreeAttempts: number;
  timeLimitSec: number;
  bossMaxHp: number;
  fairPlayRules: string[];
  loanerGear: WeeklyBossLoanerGearItem[];
  loanerStats: ComputedPlayerStats;
  rewardTiers: WeeklyBossRewardTier[];
}

export interface WeeklyBossLeaderboardEntry {
  uid: string;
  displayName: string;
  bestScore: number;
  bestClearTimeMs: number | null;
  bestDamage: number;
  cleared: boolean;
  attemptsUsed: number;
  updatedAt: number;
  bestSplitsMs?: number[] | null;
  counterHitsLanded?: number;
  guardBreaksLanded?: number;
  peakStyleGrade?: CombatStyleGrade;
  lastVerifiedAttemptId?: string;
}

export interface WeeklyBossClaimReceipt {
  claimKey: string;
  weekId: string;
  uid: string;
  tierId: string;
  claimedAt: number;
  rewardTitleLabel: string;
  rewardDynamicTitleId?: DynamicTitleId;
  rewardFrameId?: AvatarFrameId;
  rewardFrameName?: string;
  idempotencyKey?: string;
}

export interface WeeklyBossStateResponse {
  schedule: WeeklyBossSchedule;
  serverNow: number;
  authenticated: boolean;
  player: {
    uid: string;
    displayName: string;
    attemptsUsed: number;
    attemptsRemaining: number;
    activeAttemptId: string | null;
    bestScore: number;
    bestClearTimeMs: number | null;
    bestDamage: number;
    claimedTierIds: string[];
    receipts: WeeklyBossClaimReceipt[];
    bestSplitsMs?: number[] | null;
    lastVerifiedAttemptId?: string | null;
  } | null;
  leaderboard: WeeklyBossLeaderboardEntry[];
  top1SplitsMs?: number[] | null;
}

export const WEEKLY_BOSS_LOANER_GEAR: WeeklyBossLoanerGearItem[] = [
  {
    slotLabel: 'Vũ Khí',
    name: 'Cung Tinh Giới Sử Thi +15',
    rarityLabel: 'Sử Thi',
    level: 15,
    summary: '+185 Công · +12% Tốc Bắn · Xuyên Giáp chuẩn hóa',
  },
  {
    slotLabel: 'Áo Giáp',
    name: 'Chiến Giáp Nhật Luân +15',
    rarityLabel: 'Sử Thi',
    level: 15,
    summary: '+720 Máu · +8% Giảm Sát Thương',
  },
  {
    slotLabel: 'Nhẫn & Dây Chuyền',
    name: 'Bộ Dấu Ấn Hoàng Đạo +15',
    rarityLabel: 'Sử Thi',
    level: 15,
    summary: '+24% Chí Mạng · ×1.85 ST Chí Mạng · +15% ST Boss',
  },
  {
    slotLabel: 'Mũ & Giày',
    name: 'Bộ Hộ Vệ Tinh Tú +15',
    rarityLabel: 'Sử Thi',
    level: 15,
    summary: '+5.8 Tốc Chạy · Đồng bộ 100% mọi người chơi',
  },
];

/**
 * Strictly standardized Epic loaner stats for Weekly Ranked Boss.
 * VIP, paid packs, mounts, wings, pets, halos, and personal gear are completely excluded.
 */
export const WEEKLY_BOSS_LOANER_STATS: ComputedPlayerStats = {
  heroId: 'aurelia',
  heroName: 'Alice (Chuẩn Hóa)',
  heroStar: 1,
  weaponArchetype: 'bow',
  attack: 225,
  maxHp: 1350,
  critChance: 0.28,
  critDamage: 1.85,
  attackSpeedMult: 1.24,
  moveSpeed: 5.8,
  damageReduction: 0.1,
  arrowSpeed: 23.5,
  innatePierce: false,
  innateHoming: false,
  stageHealPct: 0,
  goldGainMult: 1,
  bossDamageBonus: 0.15,
  powerRating: 2400,
  equippedRunes: [],
  equippedPetId: null,
  petAtk: 0,
  equippedWingId: null,
  wingLevel: 0,
  equippedMountId: null,
  mountLevel: 0,
  equippedWeaponAuraId: 'none',
  weaponAuraLevel: 0,
  equippedArtifactId: null,
  artifactLevel: 0,
  equippedHaloId: null,
  haloLevel: 0,
  equippedWarBannerId: null,
  warBannerLevel: 0,
  lifeStealPct: 0,
};

export const WEEKLY_BOSS_REWARD_TIERS: WeeklyBossRewardTier[] = [
  {
    tierId: 'weekly_challenger',
    minScore: 2500,
    title: 'Mốc Tham Chiến Tinh Giới',
    subtitle: 'Đạt 2.500 điểm xác minh trong tuần',
    rewardTitleLabel: 'Tinh Binh Công Bằng',
    rewardDynamicTitleId: 'star_challenger',
  },
  {
    tierId: 'weekly_slayer',
    minScore: 8000,
    title: 'Mốc Săn Boss Chuẩn Mực',
    subtitle: 'Đạt 8.000 điểm hoặc hạ gục Boss Tuần',
    rewardTitleLabel: 'Thợ Săn Boss Tuần',
    rewardFrameId: 'astral_crescent',
    rewardFrameName: 'Khung Trăng Khuyết Tinh Tú',
  },
  {
    tierId: 'weekly_sovereign',
    minScore: 14500,
    title: 'Mốc Quán Quân Kỹ Năng Thuần',
    subtitle: 'Hạ Boss Tuần nhanh với điểm xác minh ≥ 14.500',
    rewardTitleLabel: 'Chí Tôn Bảng Hạng Tuần',
    rewardDynamicTitleId: 'mythic_sovereign',
    rewardFrameId: 'seraph_crown',
    rewardFrameName: 'Khung Vương Miện Thiên Sứ',
  },
];

const WEEKLY_BOSS_ROTATION = [
  {
    bossId: 'weekly_solar_leo',
    bossName: 'Sư Vương Thái Dương · Bản Xếp Hạng',
    bossSubtitle: 'Chu kỳ Hỏa Dương · Mẫu đòn dậm & tia sáng theo Seed cố định',
    chapterVisualIndex: 0,
  },
  {
    bossId: 'weekly_boreas_frost',
    bossName: 'Băng Đế Boreas · Bản Xếp Hạng',
    bossSubtitle: 'Chu kỳ Băng Sương · Vòng tỏa cầu băng & lao kích theo Seed cố định',
    chapterVisualIndex: 3,
  },
  {
    bossId: 'weekly_ares_warlord',
    bossName: 'Chiến Thần Ares · Bản Xếp Hạng',
    bossSubtitle: 'Chu kỳ Chiến Hỏa · Xung kích tuyến thẳng & chấn động theo Seed cố định',
    chapterVisualIndex: 1,
  },
  {
    bossId: 'weekly_obsidian_eclipse',
    bossName: 'Nhật Thực Ma Vương · Bản Xếp Hạng',
    bossSubtitle: 'Chu kỳ Nhật Thực · Chuỗi đòn tốc độ cao thử thách Né Hoàn Hảo',
    chapterVisualIndex: 7,
  },
] as const;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
// Monday 2025-01-06 00:00:00 UTC epoch anchor for clean Monday-to-Monday weekly resets
const WEEKLY_EPOCH_UTC = Date.UTC(2025, 0, 6, 0, 0, 0);

export function getCurrentWeeklyBossSchedule(nowMs = Date.now()): WeeklyBossSchedule {
  const safeNow = Number.isFinite(nowMs) ? nowMs : Date.now();
  const weekIndex = Math.max(0, Math.floor((safeNow - WEEKLY_EPOCH_UTC) / WEEK_MS));
  const startsAt = WEEKLY_EPOCH_UTC + weekIndex * WEEK_MS;
  const endsAt = startsAt + WEEK_MS;

  const startDate = new Date(startsAt);
  const year = startDate.getUTCFullYear();
  const startOfYear = Date.UTC(year, 0, 1);
  const weekOfYear = Math.floor((startsAt - startOfYear) / WEEK_MS) + 1;
  const weekId = `${year}-W${String(weekOfYear).padStart(2, '0')}`;

  const rotation = WEEKLY_BOSS_ROTATION[weekIndex % WEEKLY_BOSS_ROTATION.length];
  const seed = `ARTEMIS-${weekId}-${rotation.bossId.toUpperCase()}`;

  return {
    weekId,
    weekIndex,
    bossId: rotation.bossId,
    bossName: rotation.bossName,
    bossSubtitle: rotation.bossSubtitle,
    chapterVisualIndex: rotation.chapterVisualIndex,
    seed,
    startsAt,
    endsAt,
    maxFreeAttempts: WEEKLY_BOSS_MAX_FREE_ATTEMPTS,
    timeLimitSec: WEEKLY_BOSS_TIME_LIMIT_SEC,
    bossMaxHp: WEEKLY_BOSS_BASE_HP,
    fairPlayRules: [
      'Cùng mã Seed trận đấu cho toàn bộ người chơi trong tuần',
      'Dùng chung bộ Trang Bị Sử Thi +15 cho mượn (không dùng đồ cá nhân)',
      'Loại trừ hoàn toàn chỉ số VIP, đồ mua, thú cưỡi, cánh và pet',
      'Giới hạn công bằng 3 lượt tính hạng miễn phí mỗi tuần',
      'Thưởng Danh Hiệu & Khung Avatar (không bán chỉ số chiến đấu)',
    ],
    loanerGear: WEEKLY_BOSS_LOANER_GEAR,
    loanerStats: WEEKLY_BOSS_LOANER_STATS,
    rewardTiers: WEEKLY_BOSS_REWARD_TIERS,
  };
}

/**
 * Authoritative deterministic score computation used by the Express verification server
 * (and mirrored for client preview only — server value is always authoritative).
 */
export function computeWeeklyBossScore(params: {
  cleared: boolean;
  damageDealt: number;
  bossMaxHp: number;
  clearTimeMs: number;
  timeLimitSec: number;
  remainingHpPct: number;
  perfectDodges: number;
}): number {
  const clampedDmg = Math.max(0, Math.min(params.bossMaxHp, Math.round(params.damageDealt)));
  const damageRatio = clampedDmg / Math.max(1, params.bossMaxHp);
  const damagePoints = Math.round(damageRatio * 7500);
  const clearBonus = params.cleared ? 4000 : 0;
  const timeLimitMs = params.timeLimitSec * 1000;
  const speedRatio = params.cleared
    ? Math.max(0, Math.min(1, (timeLimitMs - Math.max(0, params.clearTimeMs)) / Math.max(1, timeLimitMs)))
    : 0;
  const speedBonus = Math.round(speedRatio * 4500);
  const hpBonus = params.cleared
    ? Math.round(Math.max(0, Math.min(1, params.remainingHpPct)) * 1200)
    : 0;
  const skillBonus = Math.min(1000, Math.max(0, Math.floor(params.perfectDodges)) * 125);

  return damagePoints + clearBonus + speedBonus + hpBonus + skillBonus;
}

export interface WeeklyBossSeasonMilestone {
  tierId: string;
  minSeasonPoints: number;
  title: string;
  subtitle: string;
  rewardTitleLabel: string;
  rewardDynamicTitleId?: DynamicTitleId;
  rewardFrameId?: AvatarFrameId;
  rewardFrameName?: string;
}

export interface WeeklyBossSeasonInfo {
  seasonId: string;
  seasonIndex: number;
  seasonName: string;
  weekIds: string[];
  currentWeekId: string;
  currentWeekNumberInSeason: number;
  startsAt: number;
  endsAt: number;
  milestones: WeeklyBossSeasonMilestone[];
}

export interface WeeklyBossSeasonEntry {
  uid: string;
  displayName: string;
  seasonPoints: number;
  weeksParticipated: number;
  bestWeeklyScore: number;
  highestRank: number;
  totalClears: number;
  updatedAt: number;
}

export interface WeeklyBossRunHistoryEntry {
  weekId: string;
  bossName: string;
  attemptId: string;
  verifiedScore: number;
  damageDealt: number;
  clearTimeMs: number | null;
  cleared: boolean;
  weekRank: number;
  seasonPointsAwarded: number;
  submittedAt: number;
}

export interface WeeklyBossSeasonClaimReceipt {
  claimKey: string;
  seasonId: string;
  uid: string;
  tierId: string;
  claimedAt: number;
  rewardTitleLabel: string;
  rewardDynamicTitleId?: DynamicTitleId;
  rewardFrameId?: AvatarFrameId;
  rewardFrameName?: string;
  idempotencyKey?: string;
}

export interface WeeklyBossSeasonStateResponse {
  season: WeeklyBossSeasonInfo;
  serverNow: number;
  authenticated: boolean;
  player: {
    uid: string;
    displayName: string;
    seasonPoints: number;
    seasonRank: number | null;
    weeksParticipated: number;
    claimedSeasonTierIds: string[];
    receipts: WeeklyBossSeasonClaimReceipt[];
    history: WeeklyBossRunHistoryEntry[];
  } | null;
  standings: WeeklyBossSeasonEntry[];
}

export const WEEKLY_BOSS_SEASON_MILESTONES: WeeklyBossSeasonMilestone[] = [
  {
    tierId: 'season_contender',
    minSeasonPoints: 50,
    title: 'Huy Chương Mùa Giải · Tân Tinh',
    subtitle: 'Tích lũy ≥ 50 Điểm Mùa Giải (CP) qua các tuần xác minh',
    rewardTitleLabel: 'Đấu Sĩ Mùa Giải Tinh Giới',
    rewardDynamicTitleId: 'star_challenger',
  },
  {
    tierId: 'season_master',
    minSeasonPoints: 150,
    title: 'Cúp Bạc Mùa Giải · Cao Thủ',
    subtitle: 'Tích lũy ≥ 150 Điểm Mùa Giải (CP) qua các tuần xác minh',
    rewardTitleLabel: 'Cao Thủ Mùa Giải Công Bằng',
    rewardFrameId: 'crystal_guardian',
    rewardFrameName: 'Khung Pha Lê Hộ Vệ Mùa Giải',
  },
  {
    tierId: 'season_champion',
    minSeasonPoints: 280,
    title: 'Cúp Vàng Mùa Giải · Quán Quân',
    subtitle: 'Tích lũy ≥ 280 Điểm Mùa Giải (CP) — Đỉnh cao kỹ năng 4 tuần',
    rewardTitleLabel: 'Quán Quân Mùa Giải Hoàng Đạo',
    rewardDynamicTitleId: 'mythic_sovereign',
    rewardFrameId: 'world_dragon',
    rewardFrameName: 'Khung Thần Long Quán Quân Mùa',
  },
];

/**
 * Deterministic Season Championship Points (CP) awarded per verified weekly placement.
 * Only human verified runs earn official Season CP.
 */
export function computeWeeklySeasonPointsForRank(rank: number, cleared: boolean): number {
  const rankPts =
    rank === 1 ? 100 : rank <= 3 ? 75 : rank <= 10 ? 50 : rank <= 25 ? 30 : 15;
  const clearBonus = cleared ? 20 : 0;
  return rankPts + clearBonus;
}

const SEASON_WEEKS = 4;

export function getWeeklyBossSeasonInfo(nowMs = Date.now()): WeeklyBossSeasonInfo {
  const current = getCurrentWeeklyBossSchedule(nowMs);
  const seasonIndex = Math.floor(current.weekIndex / SEASON_WEEKS);
  const firstWeekIndex = seasonIndex * SEASON_WEEKS;
  const startsAt = WEEKLY_EPOCH_UTC + firstWeekIndex * WEEK_MS;
  const endsAt = startsAt + SEASON_WEEKS * WEEK_MS;

  const weekIds: string[] = [];
  for (let offset = 0; offset < SEASON_WEEKS; offset++) {
    const wkSchedule = getCurrentWeeklyBossSchedule(startsAt + offset * WEEK_MS + 1000);
    weekIds.push(wkSchedule.weekId);
  }

  const seasonYear = new Date(startsAt).getUTCFullYear();
  const seasonNumberInYear = (seasonIndex % 13) + 1;
  const seasonId = `${seasonYear}-S${String(seasonNumberInYear).padStart(2, '0')}`;

  return {
    seasonId,
    seasonIndex,
    seasonName: `Mùa Giải Tinh Giới #${seasonNumberInYear} (${seasonYear})`,
    weekIds,
    currentWeekId: current.weekId,
    currentWeekNumberInSeason: (current.weekIndex % SEASON_WEEKS) + 1,
    startsAt,
    endsAt,
    milestones: WEEKLY_BOSS_SEASON_MILESTONES,
  };
}

// ============================================================================
// WAVE 5 — PILLAR 4: WEEKEND BLITZ BOSS EVENT (COMPETITIVE LIVEOPS)
// ============================================================================

export type WeekendBlitzModifierId = 'gale_charge' | 'crit_counter' | 'iron_tempo';

export interface WeekendBlitzModifier {
  id: WeekendBlitzModifierId;
  title: string;
  subtitle: string;
  scoreBonusNote: string;
  dodgePointBonusPct: number;
  clearBonusPoints: number;
}

export const WEEKEND_BLITZ_MODIFIERS: WeekendBlitzModifier[] = [
  {
    id: 'gale_charge',
    title: 'Gió Bão Tụ Lực',
    subtitle: 'Nhịp tụ lực nhanh hơn · Thưởng thêm điểm kỹ năng khi Né Hoàn Hảo chuẩn nhịp.',
    scoreBonusNote: '+20% điểm Né Hoàn Hảo · +300 điểm Hạ Boss Cuối Tuần',
    dodgePointBonusPct: 20,
    clearBonusPoints: 300,
  },
  {
    id: 'crit_counter',
    title: 'Phản Đòn Chí Mạng',
    subtitle: 'Ưu tiên đọc chiêu Boss chuẩn xác và phản công liên hoàn sau mỗi lần né.',
    scoreBonusNote: '+30% điểm Né Hoàn Hảo · +350 điểm Hạ Boss Cuối Tuần',
    dodgePointBonusPct: 30,
    clearBonusPoints: 350,
  },
  {
    id: 'iron_tempo',
    title: 'Nhịp Điệu Thép',
    subtitle: 'Duy trì máu cao và dứt điểm Boss nhanh bằng bộ Sử Thi chuẩn hóa công bằng.',
    scoreBonusNote: '+15% điểm Né Hoàn Hảo · +450 điểm Hạ Boss Cuối Tuần',
    dodgePointBonusPct: 15,
    clearBonusPoints: 450,
  },
];

export interface WeekendBlitzRewardTier {
  tierId: string;
  minScore: number;
  title: string;
  subtitle: string;
  rewardGems: number;
  rewardEpicShards: number;
  rewardTitleLabel: string;
  rewardFrameId?: AvatarFrameId;
  rewardFrameName?: string;
}

export const WEEKEND_BLITZ_REWARD_TIERS: WeekendBlitzRewardTier[] = [
  {
    tierId: 'weekend_striker',
    minScore: 4500,
    title: 'Mốc Đồng · Tiên Phong Cuối Tuần',
    subtitle: 'Đạt ≥ 4.500 điểm xác minh trong Sự Kiện Boss Cuối Tuần',
    rewardGems: 120,
    rewardEpicShards: 6,
    rewardTitleLabel: 'Tiên Phong Boss Cuối Tuần',
  },
  {
    tierId: 'weekend_ace',
    minScore: 9500,
    title: 'Mốc Bạc · Thợ Săn Thần Tốc',
    subtitle: 'Đạt ≥ 9.500 điểm xác minh — Làm chủ biến thể chiến thuật cuối tuần',
    rewardGems: 220,
    rewardEpicShards: 10,
    rewardTitleLabel: 'Thợ Săn Thần Tốc Cuối Tuần',
    rewardFrameId: 'crystal_guardian',
    rewardFrameName: 'Khung Tinh Quang Cuối Tuần',
  },
  {
    tierId: 'weekend_sovereign',
    minScore: 13200,
    title: 'Mốc Vàng · Chinh Phục Cuối Tuần',
    subtitle: 'Đạt ≥ 13.200 điểm xác minh — Đỉnh cao kỹ năng công bằng +25 CP Mùa Giải',
    rewardGems: 360,
    rewardEpicShards: 16,
    rewardTitleLabel: 'Bá Chủ Đấu Trường Cuối Tuần',
    rewardFrameId: 'world_dragon',
    rewardFrameName: 'Khung Hoàng Kim Cuối Tuần',
  },
];

export interface WeekendBlitzSchedule {
  eventId: string; // e.g. WE-2026-W47
  weekId: string;
  bossId: string;
  bossName: string;
  bossSubtitle: string;
  chapterVisualIndex: number;
  seed: string;
  startsAt: number;
  endsAt: number;
  maxFreeAttempts: number;
  timeLimitSec: number;
  bossMaxHp: number;
  modifier: WeekendBlitzModifier;
  loanerGear: WeeklyBossLoanerGearItem[];
  loanerStats: ComputedPlayerStats;
  rewardTiers: WeekendBlitzRewardTier[];
  seasonCpBonusOnClear: number;
}

export interface WeekendBlitzClaimReceipt {
  claimKey: string;
  eventId: string;
  uid: string;
  tierId: string;
  claimedAt: number;
  rewardGems: number;
  rewardEpicShards: number;
  rewardTitleLabel: string;
  rewardFrameId?: AvatarFrameId;
  rewardFrameName?: string;
  idempotencyKey?: string;
}

export interface WeekendBlitzStateResponse {
  schedule: WeekendBlitzSchedule;
  serverNow: number;
  authenticated: boolean;
  player: {
    uid: string;
    displayName: string;
    attemptsUsed: number;
    attemptsRemaining: number;
    activeAttemptId: string | null;
    bestScore: number;
    bestClearTimeMs: number | null;
    bestDamage: number;
    claimedTierIds: string[];
    receipts: WeekendBlitzClaimReceipt[];
    bestSplitsMs?: number[] | null;
    lastVerifiedAttemptId?: string | null;
  } | null;
  leaderboard: WeeklyBossLeaderboardEntry[];
  top1SplitsMs?: number[] | null;
}

export function getCurrentWeekendBlitzSchedule(nowMs = Date.now()): WeekendBlitzSchedule {
  const weekly = getCurrentWeeklyBossSchedule(nowMs);
  const modifier =
    WEEKEND_BLITZ_MODIFIERS[weekly.weekIndex % WEEKEND_BLITZ_MODIFIERS.length];
  const eventId = `WE-${weekly.weekId}`;
  return {
    eventId,
    weekId: weekly.weekId,
    bossId: `${weekly.bossId}_blitz`,
    bossName: `${weekly.bossName} · Đột Kích Cuối Tuần`,
    bossSubtitle: `Biến thể "${modifier.title}" · Bộ Sử Thi +15 chuẩn hóa · +25 CP Mùa Giải khi hạ Boss`,
    chapterVisualIndex: weekly.chapterVisualIndex,
    seed: `BLITZ-${weekly.weekId}-${modifier.id.toUpperCase()}`,
    startsAt: weekly.startsAt,
    endsAt: weekly.endsAt,
    maxFreeAttempts: WEEKLY_BOSS_MAX_FREE_ATTEMPTS,
    timeLimitSec: 75,
    bossMaxHp: Math.round(weekly.bossMaxHp * 0.92),
    modifier,
    loanerGear: WEEKLY_BOSS_LOANER_GEAR,
    loanerStats: WEEKLY_BOSS_LOANER_STATS,
    rewardTiers: WEEKEND_BLITZ_REWARD_TIERS,
    seasonCpBonusOnClear: 25,
  };
}

export function computeWeekendBlitzScore(params: {
  cleared: boolean;
  damageDealt: number;
  bossMaxHp: number;
  clearTimeMs: number;
  timeLimitSec: number;
  remainingHpPct: number;
  perfectDodges: number;
  modifier: WeekendBlitzModifier;
}): number {
  const base = computeWeeklyBossScore({
    cleared: params.cleared,
    damageDealt: params.damageDealt,
    bossMaxHp: params.bossMaxHp,
    clearTimeMs: params.clearTimeMs,
    timeLimitSec: params.timeLimitSec,
    remainingHpPct: params.remainingHpPct,
    perfectDodges: params.perfectDodges,
  });
  const dodgeBonus = Math.round(
    Math.min(20, Math.max(0, Math.floor(params.perfectDodges))) *
      125 *
      (params.modifier.dodgePointBonusPct / 100)
  );
  const clearModBonus = params.cleared ? params.modifier.clearBonusPoints : 0;
  return base + dodgeBonus + clearModBonus;
}

export interface WeeklyBossAnalytics {
  totalRankedPlayers: number;
  playerRank: number | null;
  playerBestScore: number;
  gapToNextRank: number | null;
  nextRankTargetName: string | null;
  gapToTop10: number | null;
  gapToTop1: number | null;
  top3AvgClearTimeMs: number | null;
  top3AvgSplitsMs: number[] | null;
  playerGuardBreaks: number;
  playerPeakStyleGrade: CombatStyleGrade | null;
}

/**
 * Computes transparent Weekly/Weekend Boss competitive gap analytics
 * strictly from verified human leaderboard entries.
 */
export function computeWeeklyBossAnalytics(
  state: Pick<WeeklyBossStateResponse | WeekendBlitzStateResponse, 'leaderboard' | 'player'>
): WeeklyBossAnalytics {
  const lb = state.leaderboard ?? [];
  const playerUid = state.player?.uid ?? null;
  const playerIdx = playerUid ? lb.findIndex((e) => e.uid === playerUid) : -1;
  const playerEntry = playerIdx >= 0 ? lb[playerIdx] : null;
  const playerBestScore = playerEntry?.bestScore ?? state.player?.bestScore ?? 0;
  const playerRank = playerIdx >= 0 ? playerIdx + 1 : null;

  let gapToNextRank: number | null = null;
  let nextRankTargetName: string | null = null;
  if (playerIdx > 0) {
    const above = lb[playerIdx - 1];
    gapToNextRank = Math.max(1, above.bestScore - playerBestScore);
    nextRankTargetName = above.displayName;
  } else if (playerIdx === -1 && lb.length > 0) {
    const tail = lb[Math.min(lb.length - 1, 9)];
    gapToNextRank = Math.max(1, tail.bestScore - playerBestScore);
    nextRankTargetName = tail.displayName;
  }

  const top10Entry = lb.length >= 10 ? lb[9] : lb[lb.length - 1] ?? null;
  const gapToTop10 =
    top10Entry && (playerRank === null || playerRank > 10)
      ? Math.max(0, top10Entry.bestScore - playerBestScore)
      : playerRank !== null && playerRank <= 10
      ? 0
      : null;

  const top1Entry = lb[0] ?? null;
  const gapToTop1 = top1Entry ? Math.max(0, top1Entry.bestScore - playerBestScore) : null;

  const top3 = lb.slice(0, 3);
  const top3ClearTimes = top3
    .map((e) => e.bestClearTimeMs)
    .filter((v): v is number => typeof v === 'number' && v > 0);
  const top3AvgClearTimeMs =
    top3ClearTimes.length > 0
      ? Math.round(top3ClearTimes.reduce((acc, v) => acc + v, 0) / top3ClearTimes.length)
      : null;

  const top3WithSplits = top3.filter(
    (e): e is WeeklyBossLeaderboardEntry & { bestSplitsMs: number[] } =>
      Array.isArray(e.bestSplitsMs) && e.bestSplitsMs.length === 4 && e.bestSplitsMs.every((v) => v > 0)
  );
  const top3AvgSplitsMs =
    top3WithSplits.length > 0
      ? [0, 1, 2, 3].map((idx) =>
          Math.round(
            top3WithSplits.reduce((acc, e) => acc + e.bestSplitsMs[idx], 0) /
              top3WithSplits.length
          )
        )
      : null;

  return {
    totalRankedPlayers: lb.length,
    playerRank,
    playerBestScore,
    gapToNextRank,
    nextRankTargetName,
    gapToTop10,
    gapToTop1,
    top3AvgClearTimeMs,
    top3AvgSplitsMs,
    playerGuardBreaks: playerEntry?.guardBreaksLanded ?? 0,
    playerPeakStyleGrade: playerEntry?.peakStyleGrade ?? null,
  };
}


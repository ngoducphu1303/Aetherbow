import type { AvatarFrameId, ComputedPlayerStats, DynamicTitleId } from '../types/game';

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
  } | null;
  leaderboard: WeeklyBossLeaderboardEntry[];
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
  heroId: 'artemis',
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

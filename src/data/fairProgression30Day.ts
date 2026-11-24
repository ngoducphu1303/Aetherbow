import { CHAPTERS } from './chaptersData';
import {
  applyEarlyRunMilestones,
  claimMailsUnified,
  getEarlyProgressionPolicy,
  isEarlyFeatureUnlocked,
  normalizeEarlyForgeProgress,
  RARITY_RANK,
} from './earlyProgressionData';
import {
  computeAutoOptimizeEquipment,
  computePlayerStats,
  craftEarlyTargetGear,
  createInitialSaveData,
  GEAR_TEMPLATES,
  getUpgradeCost,
  RARITY_META,
  RARITY_ORDER,
  rollChestGearBatch,
  rollProgressionGatedGear,
  salvageExcessGearToForgeShards,
  transferGearUpgradeLevel,
} from './gearData';
import { getTodayKey } from './questsData';
import { getTalentLevel, getTalentUpgradeCost, TALENTS } from './talentsData';
import { grantChapter2Collection } from './chapter2Collection';
import { grantChapter3Collection } from './chapter3Collection';
import { grantChapter4Collection } from './chapter4Collection';
import { normalizeBlessingAltar, normalizeMythicWeapon } from './wave12Data';
import { normalizeSoulRings } from './wave13Data';
import { normalizeGuildSanctuary, normalizeZodiacRelics } from './wave14Data';
import { createSeededRng } from '../engine/fixedTimestep';
import {
  ComputedPlayerStats,
  ConstellationId,
  EarlyFeatureId,
  GearInstance,
  GearSlot,
  Rarity,
  RuneId,
  SaveData,
} from '../types/game';

// ============================================================================
// 1. PROGRESSIVE POWER PRESSURE (SKILL GAP 1.3x–1.5x + TIMED BOSS ENRAGE)
// ============================================================================

export type PowerPressureTier = 'ready' | 'skill_challenge' | 'high_danger';

export interface PowerPressureEvaluation {
  tier: PowerPressureTier;
  ratio: number;
  playerPower: number;
  recommendedPower: number;
  label: string;
  shortLabel: string;
  description: string;
  /** Final multiplicative gate applied to ALL player damage sources (normal, skills, DoT, reactions, resonance). */
  enemyDamageTakenMult: number;
  /** Multiplier applied to damage enemies deal to the player. */
  enemyDamageDealtMult: number;
  /** Fraction (0..0.72) of player Damage Reduction pierced by enemies when player is under-powered. */
  enemyDrPiercePct: number;
  /** Boss Timed Enrage countdown (seconds) before boss enters lethal berserk overdrive. */
  bossEnrageSec: number;
  /** Instant Execution Finisher (<= 18% HP) is only allowed within the skill challenge band (ratio >= 0.62). */
  allowInstantExecute: boolean;
  textClass: string;
  borderClass: string;
  bgClass: string;
}

export function computePowerPressure(
  playerPower: number,
  recommendedPower: number
): PowerPressureEvaluation {
  const safePlayer = Math.max(1, Math.round(playerPower || 0));
  const safeRec = Math.max(1, Math.round(recommendedPower || 1));
  const ratio = safePlayer / safeRec;

  // Band 1: Ready (>= 90% recommended LC, <= 1.11x gap) — no LC penalty
  if (ratio >= 0.9) {
    return {
      tier: 'ready',
      ratio,
      playerPower: safePlayer,
      recommendedPower: safeRec,
      label: 'Đạt Chuẩn Lực Chiến',
      shortLabel: 'Đạt Chuẩn',
      description: 'Lực chiến đạt ≥90% khuyến nghị — chiến đấu đúng thực lực, không chịu áp chế.',
      enemyDamageTakenMult: 1.0,
      enemyDamageDealtMult: 1.0,
      enemyDrPiercePct: 0,
      bossEnrageSec: 75,
      allowInstantExecute: true,
      textClass: 'text-emerald-300',
      borderClass: 'border-emerald-400/40',
      bgClass: 'bg-emerald-500/10',
    };
  }

  // Band 2: Skill Challenge (75%..89% LC, 1.12x..1.33x gap) — winnable cleanly with sharp dodging
  if (ratio >= 0.75) {
    const t = (0.9 - ratio) / 0.15; // 0 at 90% -> 1 at 75%
    const dmgTakenMult = Number((1.0 - t * 0.14).toFixed(3)); // 1.00 -> 0.86
    const dmgDealtMult = Number((1.18 + t * 0.27).toFixed(2)); // 1.18 -> 1.45
    const drPiercePct = Number((0.06 + t * 0.06).toFixed(2)); // 6% -> 12%
    const enrageSec = Math.round(70 - t * 8); // 70s -> 62s
    return {
      tier: 'skill_challenge',
      ratio,
      playerPower: safePlayer,
      recommendedPower: safeRec,
      label: 'Thử Thách Kỹ Năng',
      shortLabel: 'Thử Thách',
      description: `Thiếu ${Math.round((1 - ratio) * 100)}% LC — sát thương gây ra ${Math.round(dmgTakenMult * 100)}%, quái đánh mạnh ${dmgDealtMult.toFixed(2)}x (xuyên ${Math.round(drPiercePct * 100)}% giảm thương), Boss Cuồng Nộ sau ${enrageSec}s.`,
      enemyDamageTakenMult: dmgTakenMult,
      enemyDamageDealtMult: dmgDealtMult,
      enemyDrPiercePct: drPiercePct,
      bossEnrageSec: enrageSec,
      allowInstantExecute: true,
      textClass: 'text-amber-300',
      borderClass: 'border-amber-400/45',
      bgClass: 'bg-amber-500/10',
    };
  }

  // Band 3: Skill Ceiling Edge (62%..74% LC, 1.35x..1.61x gap) — extreme skill check (~1.5x max realistic clear)
  if (ratio >= 0.62) {
    const t = (0.75 - ratio) / 0.13; // 0 at 75% -> 1 at 62%
    const dmgTakenMult = Number((0.85 - t * 0.39).toFixed(3)); // 0.85 -> 0.46
    const dmgDealtMult = Number((1.5 + t * 0.85).toFixed(2)); // 1.50 -> 2.35
    const drPiercePct = Number((0.14 + t * 0.12).toFixed(2)); // 14% -> 26%
    const enrageSec = Math.round(60 - t * 10); // 60s -> 50s
    return {
      tier: 'high_danger',
      ratio,
      playerPower: safePlayer,
      recommendedPower: safeRec,
      label: 'Ranh Giới Vượt Cấp · Áp Chế LC',
      shortLabel: 'Ranh Giới LC',
      description: `Thiếu ${Math.round((1 - ratio) * 100)}% LC — sát thương gây ra chỉ còn ${Math.round(dmgTakenMult * 100)}%, quái đánh mạnh ${dmgDealtMult.toFixed(2)}x (xuyên ${Math.round(drPiercePct * 100)}% giảm thương) & Boss Cuồng Nộ sau ${enrageSec}s.`,
      enemyDamageTakenMult: dmgTakenMult,
      enemyDamageDealtMult: dmgDealtMult,
      enemyDrPiercePct: drPiercePct,
      bossEnrageSec: enrageSec,
      allowInstantExecute: true,
      textClass: 'text-orange-300',
      borderClass: 'border-orange-500/50',
      bgClass: 'bg-orange-500/12',
    };
  }

  // Band 4: Deep Exponential Suppression (<62% LC, >1.61x..9x+ gap) — shuts down 2x..9x cheese clears
  const u = Math.max(0, Math.min(1, (0.62 - ratio) / 0.52)); // 0 at 62% -> 1 at <=10%
  const dmgTakenMult = Number(
    Math.max(0.015, 0.46 * Math.pow(0.015 / 0.46, Math.pow(u, 0.78))).toFixed(3)
  );
  const dmgDealtMult = Number((2.35 + u * 7.15).toFixed(2)); // 2.35x -> 9.50x
  const drPiercePct = Number(Math.min(0.72, 0.26 + u * 0.46).toFixed(2)); // 26% -> 72%
  const enrageSec = Math.max(25, Math.round(50 - u * 25)); // 50s -> 25s
  return {
    tier: 'high_danger',
    ratio,
    playerPower: safePlayer,
    recommendedPower: safeRec,
    label: 'Áp Chế Tuyệt Đối · Vượt Cấp Quá Mức',
    shortLabel: 'Áp Chế Nặng',
    description: `Thiếu ${Math.round((1 - ratio) * 100)}% LC — sát thương chỉ còn ${Math.max(1.5, Number((dmgTakenMult * 100).toFixed(1)))}%, quái đánh ${dmgDealtMult.toFixed(1)}x xuyên ${Math.round(drPiercePct * 100)}% giảm thương, khóa Kết Liễu & Boss Cuồng Nộ sau ${enrageSec}s!`,
    enemyDamageTakenMult: dmgTakenMult,
    enemyDamageDealtMult: dmgDealtMult,
    enemyDrPiercePct: drPiercePct,
    bossEnrageSec: enrageSec,
    allowInstantExecute: false,
    textClass: 'text-rose-300',
    borderClass: 'border-rose-500/55',
    bgClass: 'bg-rose-500/15',
  };
}

export function getTowerRecommendedPower(floor: number): number {
  const f = Math.max(1, Math.floor(floor || 1));
  return Math.round(2400 + (f - 1) * 1650 + Math.pow(Math.max(0, f - 8), 1.85) * 265);
}

// ============================================================================
// 2. ACTIVE DAY TRACKING (LOSSLESS & CALENDAR-BASED)
// ============================================================================

export function touchFairActiveDays(save: SaveData, todayKey = getTodayKey()): SaveData {
  const prev = save.fairActiveDays;
  if (!prev || typeof prev.count !== 'number' || prev.count < 1) {
    return {
      ...save,
      fairActiveDays: {
        count: Math.max(1, Math.min(30, (save.highestChapterCleared ?? 0) * 2 + 1)),
        lastDate: todayKey,
      },
    };
  }
  if (prev.lastDate === todayKey) return save;
  return {
    ...save,
    fairActiveDays: {
      count: prev.count + 1,
      lastDate: todayKey,
    },
  };
}

// ============================================================================
// 3. 30-DAY FAIR PROGRESSION ROADMAP (4 WEEKS · 8 CLAIMABLE MILESTONES)
// ============================================================================

export type FairActionTarget =
  | 'battle'
  | 'gear'
  | 'talents'
  | 'runes'
  | 'shop'
  | 'tower'
  | 'daily_rift'
  | 'arena'
  | 'coop_raid'
  | 'elemental_towers'
  | 'world_boss'
  | 'crystal_defense'
  | 'blood_moon'
  | 'abyssal_gauntlet'
  | 'pantheon'
  | 'dragon_lair'
  | 'crystal_vault'
  | 'sky_citadel';

export interface FairWeekAct {
  week: 1 | 2 | 3 | 4;
  dayRange: string;
  title: string;
  subtitle: string;
  targetChapters: string;
  targetPowerRange: string;
  rarityMilestone: string;
}

export const FAIR_30DAY_WEEKS: FairWeekAct[] = [
  {
    week: 1,
    dayRange: 'Ngày 1–7',
    title: 'Tuần 1 · Khởi Hành & Nền Móng',
    subtitle: 'Chinh phục Chương 1–3, mở khóa Tháp Vô Tận, Bí Cảnh, Đấu Trường và bộ đồ Sử Thi.',
    targetChapters: 'Chương 1–3',
    targetPowerRange: '1.350 → 10.000 LC',
    rarityMilestone: 'Thường → Hiếm → Sử Thi (Epic)',
  },
  {
    week: 2,
    dayRange: 'Ngày 8–14',
    title: 'Tuần 2 · Đột Phá Mẫu [S] & Huyền Thoại',
    subtitle: 'Vượt Chương 4–6, mở khóa Mẫu [S], Huyền Thoại, Co-op Raid, Tháp Nguyên Tố & Boss Thế Giới.',
    targetChapters: 'Chương 4–6',
    targetPowerRange: '20.000 → 54.000 LC',
    rarityMilestone: 'Sử Thi [S] → Huyền Thoại (Legendary)',
  },
  {
    week: 3,
    dayRange: 'Ngày 15–21',
    title: 'Tuần 3 · Chinh Phục Huyền Thoại & Đột Phá Thần Thoại',
    subtitle: 'Vượt Chương 7–9, leo Tháp 25–35, mở Huyết Nguyệt, Viễn Chinh Pantheon & Hang Rồng.',
    targetChapters: 'Chương 7–9',
    targetPowerRange: '80.000 → 152.000 LC',
    rarityMilestone: 'Huyền Thoại +60 → Mở Thần Thoại (Mythic)',
  },
  {
    week: 4,
    dayRange: 'Ngày 22–30',
    title: 'Tuần 4 · Chạm Đỉnh Max Đồ Giai Đoạn Hiện Tại',
    subtitle: 'Vượt Chương 10–12, leo Tháp 45+, hoàn thiện 6 món Thần Thoại Lv.70+ và Thiên Phú 160/160.',
    targetChapters: 'Chương 10–12',
    targetPowerRange: '192.000 → 285.000+ LC',
    rarityMilestone: 'Full 6 Thần Thoại (Mythic) · Max Đồ',
  },
];

export interface Fair30DayMilestone {
  id: string;
  week: 1 | 2 | 3 | 4;
  dayRange: string;
  stepNumber: string;
  title: string;
  requirementText: string;
  unlocksText: string;
  rewardGold: number;
  rewardGems: number;
  rewardStarDust: number;
  rewardRareShards?: number;
  rewardEpicShards?: number;
  rewardSTierBlueprints?: number;
  actionTarget: FairActionTarget;
  actionLabel: string;
  isMet: (save: SaveData, stats: ComputedPlayerStats) => boolean;
}

export const FAIR_30DAY_MILESTONES: Fair30DayMilestone[] = [
  {
    id: 'fair_w1_ch1',
    week: 1,
    dayRange: 'Ngày 1–2',
    stepNumber: '01',
    title: 'Chinh Phục Chương 1 · Thánh Điện Nhật Luân',
    requirementText: 'Vượt Chương 1 (Sư Vương Ải 12)',
    unlocksText: 'Mở Trần Sử Thi (Epic) · Quét Nhanh · Ngọc Khắc · Bí Cảnh · Tháp Vô Tận',
    rewardGold: 650,
    rewardGems: 40,
    rewardStarDust: 60,
    rewardEpicShards: 6,
    actionTarget: 'battle',
    actionLabel: 'Đánh Chương 1',
    isMet: (save) => save.highestChapterCleared >= 1,
  },
  {
    id: 'fair_w1_ch3',
    week: 1,
    dayRange: 'Ngày 6–7',
    stepNumber: '02',
    title: 'Vượt Chương 3 · Thiết Lập Đội Hình Sử Thi',
    requirementText: 'Vượt Chương 3 & đạt ≥ 9.500 LC',
    unlocksText: 'Mở Mẫu [S] Bậc Sử Thi · Co-op Raid · Gói Khởi Nghiệp · Đấu Trường',
    rewardGold: 2800,
    rewardGems: 85,
    rewardStarDust: 160,
    rewardSTierBlueprints: 10,
    actionTarget: 'battle',
    actionLabel: 'Chinh Phục Ch.3',
    isMet: (save, stats) => save.highestChapterCleared >= 3 && stats.powerRating >= 9500,
  },
  {
    id: 'fair_w2_ch4',
    week: 2,
    dayRange: 'Ngày 9–10',
    stepNumber: '03',
    title: 'Vượt Chương 4 · Khai Mở Huyền Thoại',
    requirementText: 'Vượt Chương 4 & leo Tháp Vô Tận Tầng 10+',
    unlocksText: 'Mở Trần Huyền Thoại (Legendary) · Tháp Nguyên Tố · Ngọc Khắc Huyền Thoại',
    rewardGold: 6200,
    rewardGems: 130,
    rewardStarDust: 280,
    rewardSTierBlueprints: 12,
    actionTarget: 'tower',
    actionLabel: 'Leo Tháp Vô Tận',
    isMet: (save) => save.highestChapterCleared >= 4 && (save.bestTowerFloor ?? 0) >= 10,
  },
  {
    id: 'fair_w2_ch6',
    week: 2,
    dayRange: 'Ngày 13–14',
    stepNumber: '04',
    title: 'Vượt Chương 6 · Làm Chủ Boss Thế Giới',
    requirementText: 'Vượt Chương 6 & đạt ≥ 50.000 LC',
    unlocksText: 'Mở Đêm Huyết Nguyệt · Boss Thế Giới · Thủ Thành Tinh Thể',
    rewardGold: 13500,
    rewardGems: 180,
    rewardStarDust: 440,
    rewardSTierBlueprints: 15,
    actionTarget: 'world_boss',
    actionLabel: 'Săn Boss Thế Giới',
    isMet: (save, stats) => save.highestChapterCleared >= 6 && stats.powerRating >= 50000,
  },
  {
    id: 'fair_w3_ch8',
    week: 3,
    dayRange: 'Ngày 17–19',
    stepNumber: '05',
    title: 'Vượt Chương 8 · Cánh Cổng Thần Thoại',
    requirementText: 'Vượt Chương 8 & leo Tháp Vô Tận Tầng 25+',
    unlocksText: 'Mở Trần Thần Thoại (Mythic) · Hang Rồng Cổ Đại · Viễn Chinh Pantheon',
    rewardGold: 26000,
    rewardGems: 240,
    rewardStarDust: 660,
    rewardSTierBlueprints: 18,
    actionTarget: 'dragon_lair',
    actionLabel: 'Vào Hang Rồng',
    isMet: (save) => save.highestChapterCleared >= 8 && (save.bestTowerFloor ?? 0) >= 25,
  },
  {
    id: 'fair_w3_ch9',
    week: 3,
    dayRange: 'Ngày 20–21',
    stepNumber: '06',
    title: 'Vượt Chương 9 · Tinh Chỉnh Thiên Phú & Thần Thoại',
    requirementText: 'Vượt Chương 9 & đạt ≥ 145.000 LC',
    unlocksText: 'Mở Kho Báu Tinh Thể · Sẵn sàng chinh phục chặng cuối Chương 10–12',
    rewardGold: 42000,
    rewardGems: 300,
    rewardStarDust: 920,
    rewardSTierBlueprints: 20,
    actionTarget: 'talents',
    actionLabel: 'Nâng Thiên Phú',
    isMet: (save, stats) => save.highestChapterCleared >= 9 && stats.powerRating >= 145000,
  },
  {
    id: 'fair_w4_ch11',
    week: 4,
    dayRange: 'Ngày 25–27',
    stepNumber: '07',
    title: 'Vượt Chương 11 · Chinh Phục Thành Trì Bầu Trời',
    requirementText: 'Vượt Chương 11 & leo Tháp Vô Tận Tầng 38+',
    unlocksText: 'Mở toàn bộ phó bản cuối mùa · Hoàn thiện bộ 6 Thần Thoại',
    rewardGold: 68000,
    rewardGems: 380,
    rewardStarDust: 1280,
    rewardSTierBlueprints: 25,
    actionTarget: 'sky_citadel',
    actionLabel: 'Thành Trì Bầu Trời',
    isMet: (save) => save.highestChapterCleared >= 11 && (save.bestTowerFloor ?? 0) >= 38,
  },
  {
    id: 'fair_w4_max',
    week: 4,
    dayRange: 'Ngày 28–30',
    stepNumber: '08',
    title: 'Hoàn Thành Lộ Trình 30 Ngày · Max Đồ Giai Đoạn',
    requirementText: 'Vượt Chương 12 · Tháp Tầng 45+ · ≥ 285.000 LC',
    unlocksText: 'Chứng nhận Đỉnh Cao Tinh Giới Mùa 1 · Toàn bộ tính năng & trang bị đạt cực đại',
    rewardGold: 110000,
    rewardGems: 650,
    rewardStarDust: 2000,
    rewardSTierBlueprints: 30,
    actionTarget: 'gear',
    actionLabel: 'Xem Trang Bị',
    isMet: (save, stats) =>
      save.highestChapterCleared >= 12 && (save.bestTowerFloor ?? 0) >= 45 && stats.powerRating >= 285000,
  },
];

export function countClaimableFairRoadmapMilestones(
  save: SaveData,
  stats?: ComputedPlayerStats
): number {
  const computed = stats ?? computePlayerStats(save);
  const claimed = new Set(save.fairRoadmapClaimedIds ?? []);
  return FAIR_30DAY_MILESTONES.filter((m) => !claimed.has(m.id) && m.isMet(save, computed)).length;
}

export function claimFairRoadmapMilestone(
  save: SaveData,
  milestoneId: string,
  stats?: ComputedPlayerStats
): {
  ok: boolean;
  reason?: string;
  milestone?: Fair30DayMilestone;
  nextSave: SaveData;
} {
  const milestone = FAIR_30DAY_MILESTONES.find((m) => m.id === milestoneId);
  if (!milestone) {
    return { ok: false, reason: 'Không tìm thấy cột mốc lộ trình.', nextSave: save };
  }
  const claimed = new Set(save.fairRoadmapClaimedIds ?? []);
  if (claimed.has(milestone.id)) {
    return { ok: false, reason: 'Cột mốc này đã được nhận thưởng.', nextSave: save };
  }
  const computed = stats ?? computePlayerStats(save);
  if (!milestone.isMet(save, computed)) {
    return { ok: false, reason: `Chưa đạt điều kiện: ${milestone.requirementText}.`, nextSave: save };
  }

  claimed.add(milestone.id);
  const fp = normalizeEarlyForgeProgress(save.earlyForgeProgress);
  const nextSave: SaveData = {
    ...save,
    gold: save.gold + milestone.rewardGold,
    gems: save.gems + milestone.rewardGems,
    starDust: (save.starDust ?? 0) + milestone.rewardStarDust,
    earlyForgeProgress: {
      rareShards: fp.rareShards + (milestone.rewardRareShards ?? 0),
      epicShards: fp.epicShards + (milestone.rewardEpicShards ?? 0),
      sTierBlueprints: fp.sTierBlueprints + (milestone.rewardSTierBlueprints ?? 0),
    },
    fairRoadmapClaimedIds: Array.from(claimed),
  };

  return { ok: true, milestone, nextSave };
}

// ============================================================================
// 4. MAX CURRENT-STAGE READINESS (5 PILLARS TOWARD DAY 30 COMPLETION)
// ============================================================================

export interface MaxStagePillar {
  id: 'chapters' | 'gear' | 'talents' | 'tower' | 'power';
  label: string;
  currentText: string;
  targetText: string;
  percent: number;
}

export interface MaxStageReadinessSummary {
  overallPercent: number;
  activeDay: number;
  stageLabel: string;
  pillars: MaxStagePillar[];
}

export function evaluateMaxStageReadiness(
  save: SaveData,
  stats?: ComputedPlayerStats
): MaxStageReadinessSummary {
  const computed = stats ?? computePlayerStats(save);
  const chaptersCleared = Math.max(0, Math.min(12, save.highestChapterCleared ?? 0));
  const chapterPct = Math.round((chaptersCleared / 12) * 100);

  // Equipped gear score toward 6 Mythic Lv.70+
  let gearPoints = 0;
  let mythicCount = 0;
  let totalLevel = 0;
  const slots = Object.values(GearSlot);
  for (const slot of slots) {
    const uid = save.equipped[slot];
    const item = save.inventory.find((g) => g.uid === uid);
    if (!item) continue;
    const rankScore = (RARITY_RANK[item.rarity] + 1) / 5; // 0.2 .. 1.0
    const levelScore = Math.min(1, item.level / 70);
    gearPoints += rankScore * 0.55 + levelScore * 0.45;
    if (item.rarity === Rarity.MYTHIC) mythicCount += 1;
    totalLevel += item.level;
  }
  const gearPct = Math.round((gearPoints / slots.length) * 100);
  const avgGearLevel = Math.round(totalLevel / slots.length);

  // Talents total out of 160 (8 talents * 20 maxLevel)
  const talentTotal = TALENTS.reduce((sum, t) => sum + getTalentLevel(save.talents, t.id), 0);
  const talentMax = TALENTS.reduce((sum, t) => sum + t.maxLevel, 0);
  const talentPct = Math.min(100, Math.round((talentTotal / Math.max(1, talentMax)) * 100));

  // Endless Tower toward Floor 45
  const towerBest = Math.max(0, save.bestTowerFloor ?? 0);
  const towerPct = Math.min(100, Math.round((towerBest / 45) * 100));

  // Power Rating toward 285,000 LC (Chapter 12 Max Current-Stage benchmark)
  const powerPct = Math.min(100, Math.round((computed.powerRating / 285000) * 100));

  const overallPercent = Math.round(
    chapterPct * 0.25 + gearPct * 0.25 + talentPct * 0.15 + towerPct * 0.15 + powerPct * 0.2
  );

  const activeDay = Math.max(1, save.fairActiveDays?.count ?? 1);
  let stageLabel = 'Tuần 1 · Khởi Hành';
  if (overallPercent >= 95) stageLabel = 'Đạt Đỉnh Max Đồ Giai Đoạn';
  else if (chaptersCleared >= 9) stageLabel = 'Tuần 4 · Chạy Nước Rút Thần Thoại';
  else if (chaptersCleared >= 6) stageLabel = 'Tuần 3 · Cao Thủ Huyền Thoại';
  else if (chaptersCleared >= 3) stageLabel = 'Tuần 2 · Đột Phá Mẫu [S]';

  return {
    overallPercent,
    activeDay,
    stageLabel,
    pillars: [
      {
        id: 'chapters',
        label: 'Chiến Dịch',
        currentText: `${chaptersCleared}/12`,
        targetText: '12 Chương',
        percent: chapterPct,
      },
      {
        id: 'gear',
        label: 'Trang Bị',
        currentText: `${mythicCount}/6 Mythic · TB +${avgGearLevel}`,
        targetText: '6 Mythic +70',
        percent: gearPct,
      },
      {
        id: 'talents',
        label: 'Thiên Phú',
        currentText: `${talentTotal}/${talentMax}`,
        targetText: `${talentMax} cấp`,
        percent: talentPct,
      },
      {
        id: 'tower',
        label: 'Tháp Vô Tận',
        currentText: `Tầng ${towerBest}`,
        targetText: 'Tầng 45',
        percent: towerPct,
      },
      {
        id: 'power',
        label: 'Lực Chiến',
        currentText: computed.powerRating.toLocaleString('vi-VN'),
        targetText: '285.000 LC',
        percent: powerPct,
      },
    ],
  };
}

// ============================================================================
// 5. DAILY 30–45 MINUTE RESOURCE ROUTINE (CHAPTER-GATED)
// ============================================================================

export interface DailyRoutineItem {
  id: string;
  name: string;
  featureGate: EarlyFeatureId | null;
  unlocked: boolean;
  unlockRequirementLabel: string;
  remainingRuns: number;
  maxRuns: number;
  estimatedMinutes: number;
  primaryReward: string;
  actionTarget: FairActionTarget;
  completedToday: boolean;
}

export function getDailyFairRoutine(save: SaveData): {
  items: DailyRoutineItem[];
  unlockedCount: number;
  completedCount: number;
  totalEstimatedMinutes: number;
  remainingEstimatedMinutes: number;
} {
  const today = getTodayKey();
  const isToday = (d?: string) => d === today;

  const sweepRemaining = isToday(save.dailySweeps?.date) ? Math.max(0, save.dailySweeps?.remaining ?? 0) : 3;
  const riftRemaining = isToday(save.dailyRift?.date) ? Math.max(0, save.dailyRift?.runsRemaining ?? 0) : 2;
  const arenaRemaining = isToday(save.arena?.ticketsDate) ? Math.max(0, save.arena?.ticketsRemaining ?? 0) : 5;
  const raidRemaining = isToday(save.coopRaid?.date) ? Math.max(0, save.coopRaid?.dailyRewardsLeft ?? 0) : 2;
  const elemRemaining = 3;
  const wbRemaining = isToday(save.worldBoss?.date) ? Math.max(0, save.worldBoss?.dailyRunsRemaining ?? 0) : 2;
  const cdRemaining = isToday(save.crystalDefense?.date) ? Math.max(0, save.crystalDefense?.runsRemaining ?? 0) : 2;
  const bmRemaining = isToday(save.bloodMoon?.date) ? Math.max(0, save.bloodMoon?.dailyRunsRemaining ?? 0) : 2;
  const agRemaining = isToday(save.abyssalGauntlet?.date) ? Math.max(0, save.abyssalGauntlet?.dailyRunsRemaining ?? 0) : 2;
  const panRemaining = isToday(save.pantheonExpedition?.date)
    ? Math.max(0, save.pantheonExpedition?.dailyRunsRemaining ?? 0)
    : 2;
  const dlRemaining = isToday(save.dragonLair?.date) ? Math.max(0, save.dragonLair?.dailyRunsRemaining ?? 0) : 2;
  const cvRemaining = isToday(save.crystalVault?.date) ? Math.max(0, save.crystalVault?.dailyRunsRemaining ?? 0) : 2;
  const scRemaining = isToday(save.skyCitadel?.date) ? Math.max(0, save.skyCitadel?.dailyRunsRemaining ?? 0) : 2;

  const specs: Array<{
    id: string;
    name: string;
    gate: EarlyFeatureId | null;
    remaining: number;
    max: number;
    minutes: number;
    reward: string;
    target: FairActionTarget;
  }> = [
    {
      id: 'campaign_push',
      name: 'Chiến Dịch Hoàng Đạo (Đẩy Chương)',
      gate: null,
      remaining: 2,
      max: 2,
      minutes: 10,
      reward: 'Vàng · Mảnh Rèn · Mở khóa chương mới',
      target: 'battle',
    },
    {
      id: 'quick_sweep',
      name: 'Quét Nhanh Chương Đã Vượt',
      gate: 'sweep',
      remaining: sweepRemaining,
      max: 3,
      minutes: 1,
      reward: 'Vàng cường hóa · Bụi Tinh Tú · Đồ nền',
      target: 'battle',
    },
    {
      id: 'daily_rift',
      name: 'Bí Cảnh Hằng Ngày',
      gate: 'daily_rift',
      remaining: riftRemaining,
      max: 2,
      minutes: 4,
      reward: 'Bụi Tinh Tú · Đá Linh Thú · Vàng theo bậc Ch.',
      target: 'daily_rift',
    },
    {
      id: 'endless_tower',
      name: 'Tháp Vô Tận (Đẩy Mốc 5 Tầng)',
      gate: 'endless_tower',
      remaining: 2,
      max: 2,
      minutes: 5,
      reward: 'Ngọc Hồn · Bụi Tinh Tú · Mốc 45 Tầng',
      target: 'tower',
    },
    {
      id: 'arena',
      name: 'Đấu Trường Tinh Giới (PvP)',
      gate: 'arena',
      remaining: arenaRemaining,
      max: 5,
      minutes: 3,
      reward: 'Xu Đấu Trường · Ngọc Khảm · Danh Vọng',
      target: 'arena',
    },
    {
      id: 'coop_raid',
      name: 'Co-op Đột Kích Boss',
      gate: 'coop_raid',
      remaining: raidRemaining,
      max: 2,
      minutes: 4,
      reward: 'Mảnh Chòm Sao · Đá Đột Phá · Vàng lớn',
      target: 'coop_raid',
    },
    {
      id: 'elemental_towers',
      name: 'Tháp Nguyên Tố (Hỏa · Băng · Lôi)',
      gate: 'elemental_towers',
      remaining: elemRemaining,
      max: 3,
      minutes: 4,
      reward: 'Tinh Chất Nguyên Tố · Ngọc Hồn · Chòm Sao',
      target: 'elemental_towers',
    },
    {
      id: 'world_boss',
      name: 'Boss Thế Giới Liên Đấu',
      gate: 'world_boss',
      remaining: wbRemaining,
      max: 2,
      minutes: 3,
      reward: 'Lông Cánh 3D · Ngọc Hồn · Vàng cao cấp',
      target: 'world_boss',
    },
    {
      id: 'crystal_defense',
      name: 'Thủ Thành Tinh Thể',
      gate: 'crystal_defense',
      remaining: cdRemaining,
      max: 2,
      minutes: 3,
      reward: 'Lông Cánh · Bụi Tinh Tú · Rương đồ',
      target: 'crystal_defense',
    },
    {
      id: 'blood_moon',
      name: 'Đêm Huyết Nguyệt',
      gate: 'blood_moon',
      remaining: bmRemaining,
      max: 2,
      minutes: 3,
      reward: 'Mảnh Thú Cưỡi 3D · Tinh Thể Thức Tỉnh',
      target: 'blood_moon',
    },
    {
      id: 'abyssal_gauntlet',
      name: 'Hầm Ngục Vực Sâu',
      gate: 'abyssal_gauntlet',
      remaining: agRemaining,
      max: 2,
      minutes: 3,
      reward: 'Mảnh Cổ Vật 3D · Đá Tẩy Luyện',
      target: 'abyssal_gauntlet',
    },
    {
      id: 'pantheon_expedition',
      name: 'Viễn Chinh Đền Thờ Pantheon',
      gate: 'pantheon_expedition',
      remaining: panRemaining,
      max: 2,
      minutes: 3,
      reward: 'Tinh Thể Thần Quang · Vầng Hào Quang 3D',
      target: 'pantheon',
    },
    {
      id: 'dragon_lair',
      name: 'Hang Rồng Cổ Đại',
      gate: 'dragon_lair',
      remaining: dlRemaining,
      max: 2,
      minutes: 3,
      reward: 'Vảy Rồng · Hồn Hoàn 3D · Chiến Mã',
      target: 'dragon_lair',
    },
    {
      id: 'crystal_vault',
      name: 'Kho Báu Tinh Thể',
      gate: 'crystal_vault',
      remaining: cvRemaining,
      max: 2,
      minutes: 2,
      reward: 'Mảnh Vũ Khí Thần Thoại · Chiến Kỳ 3D',
      target: 'crystal_vault',
    },
    {
      id: 'sky_citadel',
      name: 'Thành Trì Bầu Trời',
      gate: 'sky_citadel',
      remaining: scRemaining,
      max: 2,
      minutes: 3,
      reward: 'Lông Thiên Giới · Thánh Tích Hoàng Đạo',
      target: 'sky_citadel',
    },
  ];

  const items: DailyRoutineItem[] = specs.map((spec) => {
    const status = spec.gate
      ? isEarlyFeatureUnlocked(save, spec.gate)
      : { unlocked: true, requiredLabel: 'Mở từ đầu' };
    return {
      id: spec.id,
      name: spec.name,
      featureGate: spec.gate,
      unlocked: status.unlocked,
      unlockRequirementLabel: status.requiredLabel,
      remainingRuns: spec.remaining,
      maxRuns: spec.max,
      estimatedMinutes: spec.minutes,
      primaryReward: spec.reward,
      actionTarget: spec.target,
      completedToday: status.unlocked && spec.remaining === 0,
    };
  });

  const unlockedItems = items.filter((i) => i.unlocked);
  const completedCount = unlockedItems.filter((i) => i.completedToday).length;
  // Cap displayed daily routine window around 30–45 min by summing unlocked core + rotated late modes
  const totalEstimatedMinutes = Math.min(
    45,
    unlockedItems.reduce((sum, i) => sum + i.estimatedMinutes, 0)
  );
  const remainingEstimatedMinutes = Math.min(
    45,
    unlockedItems
      .filter((i) => !i.completedToday)
      .reduce((sum, i) => sum + i.estimatedMinutes, 0)
  );

  return {
    items,
    unlockedCount: unlockedItems.length,
    completedCount,
    totalEstimatedMinutes,
    remainingEstimatedMinutes,
  };
}

// ============================================================================
// 6. DETERMINISTIC 30-DAY FAIR PROGRESSION SIMULATOR (AVERAGE VS UNLUCKY PITY)
// ============================================================================

export type LuckProfile = 'average' | 'unlucky';

export interface Sim30DaySnapshot {
  day: number;
  week: 1 | 2 | 3 | 4;
  chapterCleared: number;
  bestTowerFloor: number;
  powerRating: number;
  avgGearLevel: number;
  highestRarityLabel: string;
  mythicGearCount: number;
  talentLevels: number;
  maxStagePct: number;
  goldEarnedToday: number;
  gemsEarnedToday: number;
}

export interface Sim30DayResult {
  seed: number | string;
  luckProfile: LuckProfile;
  dailyMinutes: number;
  days: Sim30DaySnapshot[];
  chapterClearDays: Record<number, number>;
  dayReachedTower40: number | null;
  dayReachedTower45: number | null;
  finalPowerRating: number;
  finalMaxStagePct: number;
  finalChaptersCleared: number;
  finalTowerFloor: number;
  finalMythicSlots: number;
  finalTalentLevels: number;
}

function makeGearInstance(
  slot: GearSlot,
  rarity: Rarity,
  level: number,
  preferSTier: boolean,
  uidSuffix: string
): GearInstance {
  const candidates = Object.values(GEAR_TEMPLATES).filter((t) => t.slot === slot);
  const chosen =
    (preferSTier ? candidates.find((t) => t.isSTier) : candidates.find((t) => !t.isSTier && t.setName !== 'Khởi Đầu')) ??
    candidates.find((t) => !t.isSTier) ??
    candidates[0];
  return {
    uid: `sim_${slot}_${rarity}_${uidSuffix}`,
    templateId: chosen.templateId,
    rarity,
    level,
    awakeningLevel: 0,
  };
}

/**
 * Deterministic 30-day simulator modelling a real F2P player spending 30–45 min/day:
 * - Campaign attempts (2-3 runs/day) governed by real Chapter recommendedPower + computePowerPressure
 * - Unlocked daily modes (Sweep, Daily Rift, Endless Tower, Arena, Co-op Raid, Elemental Towers,
 *   World Boss, Crystal Defense, Blood Moon, Abyssal Gauntlet, Pantheon, Dragon Lair, Crystal Vault, Sky Citadel)
 * - Real gear enhancement (`getUpgradeCost`), talent upgrades (`getTalentUpgradeCost`), free gear level transfer,
 *   merge/forge progression under `getEarlyProgressionPolicy`, hero stars, mastery, constellations, wings, pets,
 *   mounts, artifacts, halos, soul rings, and zodiac relics.
 */
export function simulate30DayFairProgression(options: {
  seed?: number | string;
  luckProfile?: LuckProfile;
  dailyMinutes?: number;
} = {}): Sim30DayResult {
  const seed = options.seed ?? 'fair-30d-v1';
  const luckProfile: LuckProfile = options.luckProfile ?? 'average';
  const dailyMinutes = Math.max(25, Math.min(60, options.dailyMinutes ?? 40));
  const rng = createSeededRng(`${seed}_${luckProfile}`);
  const paceFactor = dailyMinutes / 40; // 1.0 at 40 min/day

  let save = createInitialSaveData();
  const chapterClearDays: Record<number, number> = {};
  let dayReachedTower40: number | null = null;
  let dayReachedTower45: number | null = null;
  const days: Sim30DaySnapshot[] = [];

  const allSlots = Object.values(GearSlot);
  const originalMathRandom = Math.random;
  Math.random = rng;
  try {
  for (let day = 1; day <= 30; day++) {
    const week = (day <= 7 ? 1 : day <= 14 ? 2 : day <= 21 ? 3 : 4) as 1 | 2 | 3 | 4;
    let goldToday = 0;
    let gemsToday = 0;

    save = {
      ...save,
      fairActiveDays: { count: day, lastDate: `2026-01-${String(day).padStart(2, '0')}` },
    };

    const chCleared = save.highestChapterCleared;
    const chFactor = 1 + chCleared * 0.56 + Math.pow(Math.max(0, chCleared - 3), 1.42) * 0.44;

    // 1. Daily Quests + Check-in + Mail + Unlocked Side Modes income (scales with chapter unlocked!)
    const dailyQuestGold = Math.round((300 + chCleared * 260 + Math.pow(chCleared, 1.62) * 95) * paceFactor);
    const dailyQuestGems = Math.round((40 + chCleared * 11) * paceFactor);
    goldToday += dailyQuestGold;
    gemsToday += dailyQuestGems;

    // Sweep (unlocked Ch.1+)
    if (isEarlyFeatureUnlocked(save, 'sweep').unlocked) {
      const sweepGold = Math.round(3 * (210 * chFactor) * paceFactor);
      goldToday += sweepGold;
    }
    // Daily Rift (unlocked Ch.1+)
    if (isEarlyFeatureUnlocked(save, 'daily_rift').unlocked) {
      goldToday += Math.round(2 * (260 * chFactor));
      save = { ...save, starDust: (save.starDust ?? 0) + Math.round(48 + chCleared * 20) };
    }
    // Arena (unlocked Ch.2+)
    if (isEarlyFeatureUnlocked(save, 'arena').unlocked) {
      goldToday += Math.round(340 * chFactor);
      gemsToday += 28 + chCleared * 3;
    }
    // Co-op Raid (unlocked Ch.3+) -> Constellations + Gold
    if (isEarlyFeatureUnlocked(save, 'coop_raid').unlocked) {
      goldToday += Math.round(640 * chFactor);
      gemsToday += 36;
      const nextConst: Partial<Record<ConstellationId, number>> = { ...(save.constellations ?? {}) };
      const constKeys: ConstellationId[] = [
        'aries',
        'taurus',
        'gemini',
        'cancer',
        'leo',
        'virgo',
        'libra',
        'scorpio',
        'sagittarius',
        'capricorn',
        'aquarius',
        'pisces',
      ];
      const targetKey = constKeys[(day - 1) % constKeys.length];
      const prevLv = nextConst[targetKey] ?? 0;
      if (prevLv < 5) {
        nextConst[targetKey] = prevLv + 1;
        save = { ...save, constellations: nextConst };
      }
    }
    // Chapter 2-4 Collection grants on campaign clear (real F2P unlocks)
    if (chCleared >= 2) {
      save = grantChapter2Collection(save);
    }
    if (chCleared >= 3) {
      save = grantChapter3Collection(save);
    }
    if (chCleared >= 4) {
      save = grantChapter4Collection(save);
    }

    // Elemental Towers (unlocked Ch.4+) -> Hero Stars + Gems + Blessing Altar
    if (isEarlyFeatureUnlocked(save, 'elemental_towers').unlocked) {
      goldToday += Math.round(620 * chFactor);
      gemsToday += 42;
      if (day % 4 === 0) {
        const curStar = save.heroStars[save.selectedHeroId] ?? 0;
        if (curStar < 5) {
          save = {
            ...save,
            heroStars: { ...save.heroStars, [save.selectedHeroId]: curStar + 1 },
          };
        }
      }
      const altar = normalizeBlessingAltar(save.blessingAltar);
      const altarIds = Object.keys(altar.levels) as Array<keyof typeof altar.levels>;
      const targetAltar = altarIds[(day - 1) % altarIds.length];
      if ((altar.levels[targetAltar] ?? 0) < 12) {
        save = {
          ...save,
          blessingAltar: {
            ...altar,
            levels: { ...altar.levels, [targetAltar]: (altar.levels[targetAltar] ?? 0) + 1 },
            totalSacrifices: altar.totalSacrifices + 1,
          },
        };
      }
    }
    // World Boss & Crystal Defense (unlocked Ch.5+) -> Wings 3D + Mythic Weapon Transcendence
    if (isEarlyFeatureUnlocked(save, 'world_boss').unlocked) {
      goldToday += Math.round(880 * chFactor);
      gemsToday += 48;
      const unlockedWings = save.unlockedWings ?? [];
      const wingId = 'solar_zenith';
      if (!unlockedWings.includes(wingId)) {
        save = {
          ...save,
          unlockedWings: [...unlockedWings, wingId],
          equippedWingId: wingId,
          wingLevels: { ...(save.wingLevels ?? {}), [wingId]: 1 },
        };
      } else {
        const curLv = save.wingLevels?.[wingId] ?? 1;
        if (curLv < 10 && day % 2 === 0) {
          save = { ...save, wingLevels: { ...(save.wingLevels ?? {}), [wingId]: curLv + 1 } };
        }
      }
      const mw = normalizeMythicWeapon(save.mythicWeapon);
      const targetTier = Math.min(5, Math.max(mw.tier, Math.floor((chCleared - 4) / 1.4) + 1));
      if (targetTier > mw.tier) {
        save = {
          ...save,
          mythicWeapon: { ...mw, tier: targetTier },
        };
      }
    }
    // Blood Moon (unlocked Ch.6+) -> Mount 3D
    if (isEarlyFeatureUnlocked(save, 'blood_moon').unlocked) {
      goldToday += Math.round(980 * chFactor);
      const mountId = 'solarius';
      const unlockedMounts = save.unlockedMounts ?? [];
      if (!unlockedMounts.includes(mountId)) {
        save = {
          ...save,
          unlockedMounts: [...unlockedMounts, mountId],
          equippedMountId: mountId,
          mountLevels: { ...(save.mountLevels ?? {}), [mountId]: 1 },
        };
      } else {
        const curLv = save.mountLevels?.[mountId] ?? 1;
        if (curLv < 10 && day % 2 === 0) {
          save = { ...save, mountLevels: { ...(save.mountLevels ?? {}), [mountId]: curLv + 1 } };
        }
      }
    }
    // Abyssal Gauntlet (unlocked Ch.7+) -> Artifact 3D + Soul Rings
    if (isEarlyFeatureUnlocked(save, 'abyssal_gauntlet').unlocked) {
      goldToday += Math.round(1150 * chFactor);
      const artId = 'astrolabe_regulus';
      const unlockedArts = save.unlockedArtifacts ?? [];
      if (!unlockedArts.includes(artId)) {
        save = {
          ...save,
          unlockedArtifacts: [...unlockedArts, artId],
          equippedArtifactId: artId,
          artifactLevels: { ...(save.artifactLevels ?? {}), [artId]: 1 },
        };
      } else {
        const curLv = save.artifactLevels?.[artId] ?? 1;
        if (curLv < 10 && day % 2 === 1) {
          save = { ...save, artifactLevels: { ...(save.artifactLevels ?? {}), [artId]: curLv + 1 } };
        }
      }
      const sr = normalizeSoulRings(save.soulRings);
      const ringIds = Object.keys(sr.levels) as Array<keyof typeof sr.levels>;
      const targetRing = ringIds[(day - 1) % ringIds.length];
      if ((sr.levels[targetRing] ?? 0) < 10) {
        save = {
          ...save,
          soulRings: {
            ...sr,
            levels: { ...sr.levels, [targetRing]: (sr.levels[targetRing] ?? 0) + 1 },
            totalFusions: sr.totalFusions + 1,
          },
        };
      }
    }
    // Pantheon & Dragon Lair (unlocked Ch.8+) -> Halo 3D + Zodiac Relics + Guild Sanctuary
    if (isEarlyFeatureUnlocked(save, 'pantheon_expedition').unlocked) {
      goldToday += Math.round(1650 * chFactor);
      gemsToday += 68;
      const haloId = 'leo_sovereign';
      const unlockedHalos = save.unlockedHalos ?? [];
      if (!unlockedHalos.includes(haloId)) {
        save = {
          ...save,
          unlockedHalos: [...unlockedHalos, haloId],
          equippedHaloId: haloId,
          haloLevels: { ...(save.haloLevels ?? {}), [haloId]: 1 },
        };
      } else {
        const curLv = save.haloLevels?.[haloId] ?? 1;
        if (curLv < 10) {
          save = { ...save, haloLevels: { ...(save.haloLevels ?? {}), [haloId]: curLv + 1 } };
        }
      }
      const relics = normalizeZodiacRelics(save.zodiacRelics);
      const relicPool = [
        'relic_aries_horn',
        'relic_leo_suncrest',
        'relic_libra_scale',
        'relic_scorpio_sting',
        'relic_sagittarius_bow',
        'relic_aquarius_chalice',
      ] as const;
      const targetRelic = relicPool[(day - 1) % relicPool.length];
      const curRelicLv = relics.levels[targetRelic] ?? 0;
      if (curRelicLv < 5) {
        save = {
          ...save,
          zodiacRelics: {
            ...relics,
            levels: { ...relics.levels, [targetRelic]: curRelicLv + 1 },
          },
        };
      }
      const sanc = normalizeGuildSanctuary(save.guildSanctuary);
      const monIds = Object.keys(sanc.monumentLevels) as Array<keyof typeof sanc.monumentLevels>;
      const targetMon = monIds[(day - 1) % monIds.length];
      if ((sanc.monumentLevels[targetMon] ?? 0) < 10) {
        save = {
          ...save,
          guildSanctuary: {
            ...sanc,
            monumentLevels: {
              ...sanc.monumentLevels,
              [targetMon]: (sanc.monumentLevels[targetMon] ?? 0) + 1,
            },
          },
        };
      }
    }
    // Crystal Vault & Sky Citadel (unlocked Ch.9-10+) -> Endgame gold & Mythic gear awakening
    if (isEarlyFeatureUnlocked(save, 'crystal_vault').unlocked) {
      goldToday += Math.round(2300 * chFactor);
      gemsToday += 85;
    }
    if (isEarlyFeatureUnlocked(save, 'sky_citadel').unlocked) {
      goldToday += Math.round(3400 * chFactor);
      gemsToday += 100;
    }

    save = {
      ...save,
      gold: save.gold + goldToday,
      gems: save.gems + gemsToday,
    };

    // 2. Hero Mastery steady daily growth (Lv.1 -> Lv.10 over ~26 days)
    const masteryLv = Math.min(10, 1 + Math.floor(day / 2.9));
    save = {
      ...save,
      heroMastery: {
        ...(save.heroMastery ?? {}),
        [save.selectedHeroId]: { level: masteryLv, exp: 0, totalRuns: day * 3 },
      },
    };

    // 3. Chests, Pity & Gear Rarity Synthesis governed strictly by getEarlyProgressionPolicy
    const policy = getEarlyProgressionPolicy(save);
    // Unlucky profile tests worst-case rarity RNG (r >= 0.52 -> 0% natural Epic/Legendary outside hard Pity)
    // while keeping realistic slot distribution across Weapon/Armor/Ring/Necklace/Helmet/Boots.
    let unluckyCall = 0;
    const chestRng =
      luckProfile === 'unlucky'
        ? () => {
            unluckyCall++;
            // Odd calls pick template/uid (uniform via rng), even calls roll rarity (always >= 0.55 -> unlucky!)
            return unluckyCall % 2 === 1 ? rng() : 0.55 + rng() * 0.43;
          }
        : rng;
    if (isEarlyFeatureUnlocked(save, 'mythic_chest').unlocked && save.gems >= 225) {
      const pulls = Math.min(10, Math.floor(save.gems / 25));
      const cost = pulls === 10 ? 225 : pulls * 25;
      const batch = rollChestGearBatch(true, pulls, save.pity, { policy, rng: chestRng });
      save = {
        ...save,
        gems: save.gems - cost,
        inventory: [...save.inventory, ...batch.items],
        pity: batch.nextPity,
      };
    }

    // Progressive slot crafting / merge (3-of-a-kind merge + pity forge -> ensures even unlucky player progresses smoothly by policy tier)
    const maxRarityRank = RARITY_RANK[policy.maxGearRarity];
    // Ensure all 6 slots have at least one item by Day 2
    for (const slot of allSlots) {
      const hasSlot = save.inventory.some((g) => GEAR_TEMPLATES[g.templateId]?.slot === slot);
      if (!hasSlot && (day >= 2 || slot === GearSlot.WEAPON || slot === GearSlot.ARMOR)) {
        const initRarity = day <= 1 ? Rarity.COMMON : policy.maxGearRarity === Rarity.COMMON ? Rarity.COMMON : Rarity.RARE;
        const item = makeGearInstance(slot, initRarity, 1, false, `d${day}_init`);
        save = { ...save, inventory: [...save.inventory, item] };
      }
    }

    // Smart equip per slot: prefer highest rarity (tie-break S-tier) and always free-transfer enhancement level
    for (const slot of allSlots) {
      const candidates = save.inventory.filter((g) => GEAR_TEMPLATES[g.templateId]?.slot === slot);
      if (candidates.length === 0) continue;
      candidates.sort((a, b) => {
        const rDiff = RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
        if (rDiff !== 0) return rDiff;
        const sDiff = Number(Boolean(GEAR_TEMPLATES[b.templateId]?.isSTier)) - Number(Boolean(GEAR_TEMPLATES[a.templateId]?.isSTier));
        if (sDiff !== 0) return sDiff;
        return b.level - a.level;
      });
      const best = candidates[0];
      const curUid = save.equipped[slot];
      if (curUid !== best.uid) {
        const curItem = save.inventory.find((g) => g.uid === curUid);
        if (curItem && curItem.level > best.level) {
          save = transferGearUpgradeLevel(save, curItem.uid, best.uid).nextSave;
        }
        save = { ...save, equipped: { ...save.equipped, [slot]: best.uid } };
      }
    }

    // Simulate fair gear merging / forging up to the current chapter's rarity ceiling (including S-Tier at Ch.4+).
    // Pity + Forge + Salvage guarantees unlucky players still progress 1 slot/day (no dead-end!).
    if (maxRarityRank >= 1) {
      let lowestSlot: GearSlot | null = null;
      let lowestScore = 999;
      let lowestItem: GearInstance | null = null;
      for (const slot of allSlots) {
        const uid = save.equipped[slot];
        const it = save.inventory.find((g) => g.uid === uid);
        if (!it) continue;
        const r = RARITY_RANK[it.rarity];
        const isS = Boolean(GEAR_TEMPLATES[it.templateId]?.isSTier);
        const needsRarity = r < maxRarityRank;
        const needsSTier = policy.allowSTier && !isS;
        if (!needsRarity && !needsSTier) continue;
        const score = r * 2 + (isS ? 1 : 0);
        if (score < lowestScore) {
          lowestScore = score;
          lowestSlot = slot;
          lowestItem = it;
        }
      }
      if (lowestSlot && lowestItem) {
        const curRank = RARITY_RANK[lowestItem.rarity];
        const nextRarity = RARITY_ORDER[Math.min(maxRarityRank, curRank < maxRarityRank ? curRank + 1 : curRank)];
        const upgraded = makeGearInstance(
          lowestSlot,
          nextRarity,
          1,
          policy.allowSTier,
          `d${day}_m_${nextRarity}`
        );
        // Transfer enhancement level for free (Wave 7 Fair Progression!)
        const tempSave: SaveData = { ...save, inventory: [...save.inventory, upgraded] };
        const xfer =
          lowestItem.level > 1
            ? transferGearUpgradeLevel(tempSave, lowestItem.uid, upgraded.uid).nextSave
            : tempSave;
        save = {
          ...xfer,
          equipped: { ...xfer.equipped, [lowestSlot]: upgraded.uid },
        };
      }
    }

    // Late-game Gear Awakening (Week 3–4): +1 awakening star on equipped gear every 2 days once Ch.6+
    if (save.highestChapterCleared >= 6 && day % 2 === 0) {
      const slot = allSlots[(day / 2) % allSlots.length];
      const uid = save.equipped[slot];
      if (uid) {
        save = {
          ...save,
          inventory: save.inventory.map((g) =>
            g.uid === uid && (g.awakeningLevel ?? 0) < 5
              ? { ...g, awakeningLevel: (g.awakeningLevel ?? 0) + 1 }
              : g
          ),
        };
      }
    }

    // Salvage excess Common/Rare for Forge Shards
    const salv = salvageExcessGearToForgeShards(save, { includeRare: day >= 4 });
    save = salv.nextSave;

    // Craft Rare/Epic/S-Tier via Forge whenever ready
    const forgedTier: 'rare' | 'epic' | 's_tier' | null =
      save.earlyForgeProgress && save.earlyForgeProgress.sTierBlueprints >= 30 && policy.allowSTier
        ? 's_tier'
        : save.earlyForgeProgress && save.earlyForgeProgress.epicShards >= 20 && save.highestChapterCleared >= 1
        ? 'epic'
        : save.earlyForgeProgress && save.earlyForgeProgress.rareShards >= 12 && (save.bestStagePerChapter[1] ?? 0) >= 4
        ? 'rare'
        : null;
    if (forgedTier) {
      const crafted = craftEarlyTargetGear(save, forgedTier, chestRng);
      if (crafted.ok && crafted.nextSave && crafted.item) {
        const craftedSlot = GEAR_TEMPLATES[crafted.item.templateId]?.slot;
        let nextS = crafted.nextSave;
        if (craftedSlot) {
          const prevUid = nextS.equipped[craftedSlot];
          const prevItem = nextS.inventory.find((g) => g.uid === prevUid);
          if (prevItem && RARITY_RANK[crafted.item.rarity] >= RARITY_RANK[prevItem.rarity]) {
            if (prevItem.level > 1) {
              nextS = transferGearUpgradeLevel(nextS, prevItem.uid, crafted.item.uid).nextSave;
            }
            nextS = { ...nextS, equipped: { ...nextS.equipped, [craftedSlot]: crafted.item.uid } };
          }
        }
        save = nextS;
      }
    }

    // Equip Runes progressively (Ch.1 -> 1 Rare, Ch.3 -> 2 Epic, Ch.5 -> 4 Legendary)
    const desiredRunes =
      save.highestChapterCleared >= 5 ? 4 : save.highestChapterCleared >= 2 ? 2 : save.highestChapterCleared >= 1 ? 1 : 0;
    const runePool: Array<{ id: RuneId; rarity: Rarity }> = [
      { id: 'arrow_rain', rarity: policy.maxRuneRarity },
      { id: 'rune_flame', rarity: policy.maxRuneRarity },
      { id: 'rune_frost', rarity: policy.maxRuneRarity },
      { id: 'giant_meteor', rarity: policy.maxRuneRarity },
    ];
    if (desiredRunes > 0) {
      const nextRunes = runePool.slice(0, desiredRunes).map((r, idx) => ({
        uid: `sim_rune_${idx}`,
        runeId: r.id,
        rarity: r.rarity,
      }));
      save = {
        ...save,
        runeInventory: nextRunes,
        equippedRunes: nextRunes.map((r) => r.uid),
      };
    }

    // 4. Spend Gold systematically: balance Gear Enhancement (65%) and Talents (35%)
    const talentsUnlocked = isEarlyFeatureUnlocked(save, 'talents').unlocked;
    let safetyLoop = 0;
    while (safetyLoop < 140) {
      safetyLoop++;
      // Find lowest-level equipped item that hasn't hit rarity maxLevel
      let bestGear: GearInstance | null = null;
      let bestGearCost = Infinity;
      for (const slot of allSlots) {
        const uid = save.equipped[slot];
        const it = save.inventory.find((g) => g.uid === uid);
        if (!it) continue;
        const maxLv = RARITY_META[it.rarity].maxLevel;
        if (it.level >= maxLv) continue;
        const cost = getUpgradeCost(it);
        if (!bestGear || it.level < bestGear.level || (it.level === bestGear.level && cost < bestGearCost)) {
          bestGear = it;
          bestGearCost = cost;
        }
      }

      // Find cheapest talent below maxLevel (20)
      let bestTalentId: (typeof TALENTS)[number]['id'] | null = null;
      let bestTalentLv = 0;
      let bestTalentCost = Infinity;
      if (talentsUnlocked) {
        for (const t of TALENTS) {
          const lv = getTalentLevel(save.talents, t.id);
          if (lv >= t.maxLevel) continue;
          const cost = getTalentUpgradeCost(t.id, lv);
          if (cost < bestTalentCost) {
            bestTalentId = t.id;
            bestTalentLv = lv;
            bestTalentCost = cost;
          }
        }
      }

      const canBuyGear = bestGear !== null && save.gold >= bestGearCost;
      const canBuyTalent = bestTalentId !== null && save.gold >= bestTalentCost;
      if (!canBuyGear && !canBuyTalent) break;

      // Prefer whichever is cheaper (with slight preference to Talents until Lv.160)
      if (canBuyTalent && (!canBuyGear || bestTalentCost <= bestGearCost * 1.15)) {
        save = {
          ...save,
          gold: save.gold - bestTalentCost,
          talents: { ...save.talents, [bestTalentId!]: bestTalentLv + 1 },
        };
      } else if (canBuyGear && bestGear) {
        const targetUid = bestGear.uid;
        save = {
          ...save,
          gold: save.gold - bestGearCost,
          inventory: save.inventory.map((g) =>
            g.uid === targetUid ? { ...g, level: g.level + 1 } : g
          ),
        };
      }
    }

    // 5. Campaign Attempts (2 runs/day) evaluated against real Chapter Recommended Power & Soft Power Pressure
    const statsBeforeRun = computePlayerStats(save);
    for (let attempt = 0; attempt < 2; attempt++) {
      const targetChId = Math.min(12, save.highestChapterCleared + 1);
      const chapter = CHAPTERS.find((c) => c.id === targetChId) ?? CHAPTERS[CHAPTERS.length - 1];
      const curStats = computePlayerStats(save);
      const pressure = computePowerPressure(curStats.powerRating, chapter.recommendedPower);

      // Clear threshold: same player skill (0.86 LC ratio) for both profiles so 'unlucky' isolates drop RNG fairness
      const clearThreshold = luckProfile === 'unlucky' ? 0.87 : 0.85;
      const victory = pressure.ratio >= clearThreshold && save.highestChapterCleared < targetChId;
      const stageReached = victory
        ? 12
        : Math.max(2, Math.min(11, Math.round(pressure.ratio * 12)));

      const prevBest = save.bestStagePerChapter[targetChId] ?? 0;
      const runGold = Math.round((stageReached * 36 + (victory ? 180 : 0)) * chapter.goldBonusMult);
      goldToday += runGold;

      save = {
        ...save,
        gold: save.gold + runGold,
        highestChapterCleared: victory ? Math.max(save.highestChapterCleared, targetChId) : save.highestChapterCleared,
        bestStagePerChapter: {
          ...save.bestStagePerChapter,
          [targetChId]: Math.max(prevBest, stageReached),
        },
      };

      const msRes = applyEarlyRunMilestones(save, targetChId, stageReached, victory);
      save = msRes.nextSave;

      const mailRes = claimMailsUnified(save, 'all', ({ isPremium, minRarity, forceSTier }) =>
        rollProgressionGatedGear(save, isPremium, minRarity, forceSTier, chestRng)
      );
      save = mailRes.nextSave;

      if (victory && !chapterClearDays[targetChId]) {
        chapterClearDays[targetChId] = day;
      }
    }

    // 6. Endless Tower Climb (up to 3 floors/day once Ch.1 cleared, gated by Tower Recommended Power)
    if (isEarlyFeatureUnlocked(save, 'endless_tower').unlocked) {
      const curStats = computePlayerStats(save);
      let climbedToday = 0;
      while (climbedToday < 3 && (save.bestTowerFloor ?? 0) < 50) {
        const nextFloor = (save.bestTowerFloor ?? 0) + 1;
        const recPower = getTowerRecommendedPower(nextFloor);
        const pressure = computePowerPressure(curStats.powerRating, recPower);
        if (pressure.ratio < 0.84) break;
        save = {
          ...save,
          bestTowerFloor: nextFloor,
          gold: save.gold + 120 + nextFloor * 35,
          gems: save.gems + (nextFloor % 5 === 0 ? 15 : 3),
        };
        climbedToday++;
        if (nextFloor >= 40 && dayReachedTower40 === null) dayReachedTower40 = day;
        if (nextFloor >= 45 && dayReachedTower45 === null) dayReachedTower45 = day;
      }
    }

    // 7. Claim any newly reached 30-Day Fair Progression Milestones
    const postRunStats = computePlayerStats(save);
    for (const ms of FAIR_30DAY_MILESTONES) {
      const res = claimFairRoadmapMilestone(save, ms.id, postRunStats);
      if (res.ok) {
        save = res.nextSave;
        goldToday += ms.rewardGold;
        gemsToday += ms.rewardGems;
      }
    }

    // Capture Day snapshot
    const finalDayStats = computePlayerStats(save);
    const readiness = evaluateMaxStageReadiness(save, finalDayStats);
    let highestRank = 0;
    let mythicCount = 0;
    let sumLv = 0;
    for (const slot of allSlots) {
      const uid = save.equipped[slot];
      const it = save.inventory.find((g) => g.uid === uid);
      if (!it) continue;
      highestRank = Math.max(highestRank, RARITY_RANK[it.rarity]);
      if (it.rarity === Rarity.MYTHIC) mythicCount++;
      sumLv += it.level;
    }
    const talentLevels = TALENTS.reduce((sum, t) => sum + getTalentLevel(save.talents, t.id), 0);

    days.push({
      day,
      week,
      chapterCleared: save.highestChapterCleared,
      bestTowerFloor: save.bestTowerFloor ?? 0,
      powerRating: Math.max(statsBeforeRun.powerRating, finalDayStats.powerRating),
      avgGearLevel: Math.round(sumLv / allSlots.length),
      highestRarityLabel: RARITY_META[RARITY_ORDER[highestRank]].label,
      mythicGearCount: mythicCount,
      talentLevels,
      maxStagePct: readiness.overallPercent,
      goldEarnedToday: goldToday,
      gemsEarnedToday: gemsToday,
    });
  }
  } finally {
    Math.random = originalMathRandom;
  }

  const last = days[days.length - 1];
  return {
    seed,
    luckProfile,
    dailyMinutes,
    days,
    chapterClearDays,
    dayReachedTower40,
    dayReachedTower45,
    finalPowerRating: last.powerRating,
    finalMaxStagePct: last.maxStagePct,
    finalChaptersCleared: last.chapterCleared,
    finalTowerFloor: last.bestTowerFloor,
    finalMythicSlots: last.mythicGearCount,
    finalTalentLevels: last.talentLevels,
  };
}

// ============================================================================
// 8. WAVE 9 — PILLAR 3: CAPPED DAILY CATCH-UP DEFICIT ENGINE
// ============================================================================

export interface FairCatchUpMission {
  id: 'catchup_rift' | 'catchup_forge' | 'catchup_arena';
  title: string;
  desc: string;
  progressText: string;
  completed: boolean;
  claimedToday: boolean;
  rewardGold: number;
  rewardStarDust: number;
  rewardEpicShards: number;
  actionTarget: FairActionTarget;
  actionLabel: string;
}

export interface FairCatchUpEvaluation {
  isBehind: boolean;
  activeDay: number;
  expectedChapter: number;
  expectedPower: number;
  chapterDeficit: number;
  powerDeficit: number;
  deficitScorePct: number;
  lockReason: string | null;
  missions: FairCatchUpMission[];
}

export function getExpected30DayBenchmark(activeDay: number): {
  expectedChapter: number;
  expectedPower: number;
} {
  const d = Math.max(1, Math.min(30, Math.round(activeDay)));
  const expectedChapter = Math.min(12, Math.max(1, Math.floor((d + 1) / 2.4)));
  const expectedPower = Math.round(4500 + (d - 1) * 9500);
  return { expectedChapter, expectedPower };
}

export function evaluateFairCatchUpMissions(
  save: SaveData,
  stats?: ComputedPlayerStats,
  todayKey = getTodayKey()
): FairCatchUpEvaluation {
  const computed = stats ?? computePlayerStats(save);
  const activeDay = Math.max(1, save.fairActiveDays?.count ?? 1);
  const { expectedChapter, expectedPower } = getExpected30DayBenchmark(activeDay);
  const actualChapter = Math.max(0, save.highestChapterCleared ?? 0);
  const chapterDeficit = Math.max(0, expectedChapter - actualChapter);
  const powerDeficit = Math.max(0, expectedPower - computed.powerRating);

  // Strict Day-1 anti-exploit guard: catch-up only unlocks once player has progressed past Day 1
  // AND genuinely lags behind either expected chapter or expected power (>= 12% behind).
  const powerBehind = activeDay >= 2 && computed.powerRating < expectedPower * 0.88;
  const chapterBehind = activeDay >= 2 && chapterDeficit >= 1;
  const isBehind = powerBehind || chapterBehind;

  if (!isBehind) {
    return {
      isBehind: false,
      activeDay,
      expectedChapter,
      expectedPower,
      chapterDeficit,
      powerDeficit,
      deficitScorePct: 0,
      lockReason:
        activeDay <= 1
          ? 'Đang ở Ngày 1 — Nhiệm vụ Bắt Kịp chỉ mở từ Ngày 2 trở đi nếu bị tụt nhịp.'
          : 'Tiến độ của bạn đang bám sát hoặc vượt chuẩn Lộ Trình 30 Ngày!',
      missions: [],
    };
  }

  const deficitRatio = Math.min(
    1,
    Math.max(
      chapterDeficit / 4,
      powerDeficit / Math.max(1, expectedPower * 0.65)
    )
  );
  const scale = 0.65 + deficitRatio * 0.75;
  const ledger =
    save.fairCatchUp?.claimedDateKey === todayKey
      ? save.fairCatchUp
      : {
          claimedDateKey: todayKey,
          claimedMissionIdsToday: [],
          totalMissionsClaimed: save.fairCatchUp?.totalMissionsClaimed ?? 0,
        };
  const claimedSet = new Set(ledger.claimedMissionIdsToday);

  const riftRunsLeft =
    save.dailyRift?.date === todayKey ? (save.dailyRift.runsRemaining ?? 2) : 2;
  const riftDone = riftRunsLeft < 2 || (save.career?.totalRuns ?? 0) >= 2;

  const avgGearLv = (() => {
    const slots = Object.values(GearSlot);
    let total = 0;
    for (const sl of slots) {
      const uid = save.equipped[sl];
      const item = save.inventory.find((g) => g.uid === uid);
      if (item) total += item.level;
    }
    return Math.round(total / Math.max(1, slots.length));
  })();
  const forgeDone = avgGearLv >= Math.min(20, 2 + activeDay);

  const arenaPlayedToday =
    save.arena?.ticketsDate === todayKey && (save.arena?.ticketsRemaining ?? 5) < 5;
  const arenaDone = arenaPlayedToday || (save.fairProgression?.equalizedArenaWins ?? 0) >= 1;

  const capGold = Math.min(3600, Math.round(1400 * scale));
  const capDust = Math.min(340, Math.round(140 * scale));
  const capShards = Math.min(18, Math.max(5, Math.round(7 * scale)));

  const missions: FairCatchUpMission[] = [
    {
      id: 'catchup_rift',
      title: 'Khôi Phục Nhịp Bí Cảnh',
      desc: 'Tham gia 1 lượt Bí Cảnh Hằng Ngày hoặc hoàn thành 2 trận leo ải để bù tài nguyên.',
      progressText: riftDone ? 'Đã đạt điều kiện hôm nay' : 'Cần 1 lượt Bí Cảnh / leo ải',
      completed: riftDone,
      claimedToday: claimedSet.has('catchup_rift'),
      rewardGold: capGold,
      rewardStarDust: capDust,
      rewardEpicShards: capShards,
      actionTarget: 'daily_rift',
      actionLabel: 'Đi Bí Cảnh',
    },
    {
      id: 'catchup_forge',
      title: 'Cường Hóa Bám Chuẩn Trang Bị',
      desc: `Đưa cấp trang bị trung bình đạt tối thiểu +${Math.min(20, 2 + activeDay)}.`,
      progressText: `Hiện tại TB +${avgGearLv}/${Math.min(20, 2 + activeDay)}`,
      completed: forgeDone,
      claimedToday: claimedSet.has('catchup_forge'),
      rewardGold: Math.round(capGold * 0.9),
      rewardStarDust: Math.round(capDust * 1.15),
      rewardEpicShards: capShards,
      actionTarget: 'gear',
      actionLabel: 'Mở Trang Bị',
    },
    {
      id: 'catchup_arena',
      title: 'Thử Sức Đấu Trường Công Bằng',
      desc: 'Đánh 1 trận Đấu Trường 1v1 hoặc sở hữu ít nhất 1 trận Thắng Công Bằng.',
      progressText: arenaDone ? 'Đã tham chiến hôm nay' : 'Cần 1 trận Arena 1v1',
      completed: arenaDone,
      claimedToday: claimedSet.has('catchup_arena'),
      rewardGold: Math.round(capGold * 0.85),
      rewardStarDust: capDust,
      rewardEpicShards: Math.max(4, Math.round(capShards * 0.8)),
      actionTarget: 'arena',
      actionLabel: 'Vào Arena',
    },
  ];

  return {
    isBehind: true,
    activeDay,
    expectedChapter,
    expectedPower,
    chapterDeficit,
    powerDeficit,
    deficitScorePct: Math.round(deficitRatio * 100),
    lockReason: null,
    missions,
  };
}

export function claimFairCatchUpMission(
  save: SaveData,
  missionId: FairCatchUpMission['id'],
  stats?: ComputedPlayerStats,
  todayKey = getTodayKey()
): {
  ok: boolean;
  reason?: string;
  mission?: FairCatchUpMission;
  nextSave: SaveData;
} {
  const evalRes = evaluateFairCatchUpMissions(save, stats, todayKey);
  if (!evalRes.isBehind) {
    return {
      ok: false,
      reason: evalRes.lockReason ?? 'Hiện không có nhiệm vụ Bắt Kịp khả dụng.',
      nextSave: save,
    };
  }
  const mission = evalRes.missions.find((m) => m.id === missionId);
  if (!mission) {
    return { ok: false, reason: 'Không tìm thấy nhiệm vụ Bắt Kịp.', nextSave: save };
  }
  if (mission.claimedToday) {
    return {
      ok: false,
      reason: 'Nhiệm vụ Bắt Kịp này đã được nhận hôm nay.',
      nextSave: save,
    };
  }
  if (!mission.completed) {
    return {
      ok: false,
      reason: `Chưa hoàn thành điều kiện: ${mission.desc}`,
      nextSave: save,
    };
  }

  const prevLedger =
    save.fairCatchUp?.claimedDateKey === todayKey
      ? save.fairCatchUp
      : {
          claimedDateKey: todayKey,
          claimedMissionIdsToday: [],
          totalMissionsClaimed: save.fairCatchUp?.totalMissionsClaimed ?? 0,
        };
  const fp = normalizeEarlyForgeProgress(save.earlyForgeProgress);

  const nextSave: SaveData = {
    ...save,
    gold: save.gold + mission.rewardGold,
    starDust: (save.starDust ?? 0) + mission.rewardStarDust,
    earlyForgeProgress: {
      ...fp,
      epicShards: fp.epicShards + mission.rewardEpicShards,
    },
    fairCatchUp: {
      claimedDateKey: todayKey,
      claimedMissionIdsToday: [...prevLedger.claimedMissionIdsToday, mission.id],
      totalMissionsClaimed: (prevLedger.totalMissionsClaimed ?? 0) + 1,
    },
  };

  return {
    ok: true,
    mission: { ...mission, claimedToday: true },
    nextSave,
  };
}


import {
  applyEarlyRunMilestones,
  claimMailsUnified,
  countUnclaimedEligibleMail,
  EARLY_FORGE_COSTS,
  getEarlyProgressionPolicy,
  getNextTargetGoal,
  isEarlyFeatureUnlocked,
  normalizeEarlyForgeProgress,
  RARITY_RANK,
} from './earlyProgressionData';
import {
  craftEarlyTargetGear,
  createInitialSaveData,
  findBestUpgradeTransferSource,
  GEAR_TEMPLATES,
  getUpgradeCost,
  RARITY_META,
  rollChestGearBatch,
  rollProgressionGatedGear,
} from './gearData';
import { getTalentLevel, getTalentUpgradeCost, TALENTS } from './talentsData';
import { createSeededRng } from '../engine/fixedTimestep';
import { GearSlot, Rarity, SaveData } from '../types/game';

export type UpgradeActionTarget = 'gear' | 'forge' | 'talents' | 'mail' | 'shop' | 'battle';

export interface NextUpgradeRecommendation {
  kind: 'craft_target' | 'claim_mail' | 'upgrade_gear' | 'upgrade_talent' | 'farm_shards';
  title: string;
  targetItemName: string;
  whatToUpgrade: string;
  missingText: string;
  farmWhereText: string;
  canActNow: boolean;
  actionTarget: UpgradeActionTarget;
  actionLabel: string;
  secondaryHint?: string;
}

const SLOT_PRIORITY: GearSlot[] = [
  GearSlot.WEAPON,
  GearSlot.ARMOR,
  GearSlot.RING,
  GearSlot.NECKLACE,
  GearSlot.HELMET,
  GearSlot.BOOTS,
];

const SLOT_LABELS: Record<GearSlot, string> = {
  [GearSlot.WEAPON]: 'Vũ Khí',
  [GearSlot.ARMOR]: 'Áo Giáp',
  [GearSlot.RING]: 'Nhẫn',
  [GearSlot.NECKLACE]: 'Dây Chuyền',
  [GearSlot.HELMET]: 'Mũ',
  [GearSlot.BOOTS]: 'Giày',
};

/**
 * Evaluates the player's current save right after a run and returns one clear,
 * actionable "Đường Nâng Cấp Tiếp Theo" recommendation:
 * 1) What to upgrade,
 * 2) Exact missing materials (or ready immediately),
 * 3) Where to farm it + direct button destination.
 */
export function computeNextUpgradeRecommendation(save: SaveData): NextUpgradeRecommendation {
  const policy = getEarlyProgressionPolicy(save);
  const targetGoal = getNextTargetGoal(save);
  const forge = normalizeEarlyForgeProgress(save.earlyForgeProgress);
  const sweepUnlocked = isEarlyFeatureUnlocked(save, 'sweep').unlocked;
  const talentsUnlocked = isEarlyFeatureUnlocked(save, 'talents').unlocked;
  const unclaimedMail = countUnclaimedEligibleMail(save);

  // 1. Highest value: Craft guaranteed Rare / Epic / S-Tier target right now
  if (targetGoal.canCraftNow) {
    const label =
      targetGoal.tier === 'rare'
        ? 'Rèn Vũ Khí Hiếm (Rare) đầu tiên'
        : targetGoal.tier === 'epic'
        ? 'Rèn Trang Bị Sử Thi (Epic) đầu tiên'
        : 'Rèn Thánh Vật Mẫu [S] Hoàng Đạo';
    return {
      kind: 'craft_target',
      title: label,
      targetItemName: targetGoal.title,
      whatToUpgrade: `${label} (${targetGoal.current}/${targetGoal.target} mảnh đã đủ)`,
      missingText: 'Đủ tài nguyên rèn ngay · 0 mảnh thiếu',
      farmWhereText: 'Mở Lò Rèn để chế tạo ngay — bảo đảm nhảy bậc Lực Chiến lập tức.',
      canActNow: true,
      actionTarget: 'forge',
      actionLabel: 'Mở Lò Rèn',
    };
  }

  // 2. Free unclaimed progression mail (immediate gold / gems / Ch.1 Epic gear)
  if (unclaimedMail > 0) {
    return {
      kind: 'claim_mail',
      title: `Nhận ${unclaimedMail} Thư Tiếp Tế Miễn Phí`,
      targetItemName: 'Hòm Thư Hệ Thống',
      whatToUpgrade: `Nhận ngay ${unclaimedMail} thư mốc tiến độ chứa Vàng, Ngọc Hồn hoặc trang bị thưởng`,
      missingText: 'Miễn phí · Nhận ngay không tốn tài nguyên',
      farmWhereText: 'Mở Hòm Thư tại Sảnh Chính để nhận trước khi cường hóa.',
      canActNow: true,
      actionTarget: 'mail',
      actionLabel: 'Mở Hòm Thư',
    };
  }

  // 3. Find the best equipped gear slot to upgrade next
  let bestAffordable:
    | { slot: GearSlot; name: string; rarity: Rarity; level: number; cost: number }
    | undefined;
  let bestNextMissing:
    | { slot: GearSlot; name: string; rarity: Rarity; level: number; cost: number; missingGold: number }
    | undefined;

  for (const slot of SLOT_PRIORITY) {
    const uid = save.equipped[slot];
    if (!uid) continue;
    const item = save.inventory.find((g) => g.uid === uid);
    if (!item) continue;
    const tpl = GEAR_TEMPLATES[item.templateId];
    if (!tpl) continue;
    const cost = getUpgradeCost(item);
    if (save.gold >= cost) {
      if (!bestAffordable) {
        bestAffordable = { slot, name: tpl.name, rarity: item.rarity, level: item.level, cost };
      }
    } else {
      const missingGold = Math.max(1, cost - save.gold);
      if (!bestNextMissing || missingGold < bestNextMissing.missingGold) {
        bestNextMissing = {
          slot,
          name: tpl.name,
          rarity: item.rarity,
          level: item.level,
          cost,
          missingGold,
        };
      }
    }
  }

  if (bestAffordable) {
    return {
      kind: 'upgrade_gear',
      title: `Cường hóa ${bestAffordable.name} lên +${bestAffordable.level + 1}`,
      targetItemName: `${SLOT_LABELS[bestAffordable.slot]} · ${RARITY_META[bestAffordable.rarity].label}`,
      whatToUpgrade: `Nâng ${bestAffordable.name} (+${bestAffordable.level} → +${bestAffordable.level + 1})`,
      missingText: `Đủ ${bestAffordable.cost.toLocaleString('vi-VN')} Vàng (đang có ${save.gold.toLocaleString('vi-VN')})`,
      farmWhereText: 'Vào Trang Bị để nâng ngay — tăng trực tiếp Công/Máu cho lượt sau.',
      canActNow: true,
      actionTarget: 'gear',
      actionLabel: 'Nâng Trang Bị',
    };
  }

  // 4. Affordable talent upgrade if unlocked
  if (talentsUnlocked) {
    let cheapestTalent:
      | { id: (typeof TALENTS)[number]['id']; name: string; lv: number; cost: number }
      | undefined;
    for (const t of TALENTS) {
      const lv = getTalentLevel(save.talents, t.id);
      if (lv >= t.maxLevel) continue;
      const cost = getTalentUpgradeCost(t.id, lv);
      if (!cheapestTalent || cost < cheapestTalent.cost) {
        cheapestTalent = { id: t.id, name: t.name, lv, cost };
      }
    }
    if (cheapestTalent && save.gold >= cheapestTalent.cost) {
      return {
        kind: 'upgrade_talent',
        title: `Nâng Thiên Phú ${cheapestTalent.name} (Lv.${cheapestTalent.lv + 1})`,
        targetItemName: cheapestTalent.name,
        whatToUpgrade: `Tăng bậc Thiên Phú ${cheapestTalent.name} (${cheapestTalent.lv} → ${cheapestTalent.lv + 1})`,
        missingText: `Đủ ${cheapestTalent.cost.toLocaleString('vi-VN')} Vàng`,
        farmWhereText: 'Mở bảng Thiên Phú tại Sảnh để kích hoạt chỉ số vĩnh viễn.',
        canActNow: true,
        actionTarget: 'talents',
        actionLabel: 'Mở Thiên Phú',
      };
    }
  }

  // 5. Not enough gold yet: show exact missing gold OR exact missing rare/epic shards + where to farm
  const hasRare = save.inventory.some((g) => RARITY_RANK[g.rarity] >= RARITY_RANK[Rarity.RARE]);
  const hasEpic = save.inventory.some((g) => RARITY_RANK[g.rarity] >= RARITY_RANK[Rarity.EPIC]);

  if (!hasRare && policy.highestChapterCleared < 1) {
    const missingShards = Math.max(0, EARLY_FORGE_COSTS.rareShards - forge.rareShards);
    const farmSource =
      policy.bestCh1Stage < 4
        ? 'Đánh Chương 1 tới Phụ Boss Ares (Ải 4) để mở khóa Hiếm + nhận thưởng 8 Mảnh Hiếm.'
        : 'Đánh lại Chương 1 qua Ải 4 (+2~4 Mảnh/lượt) hoặc mở Rương Sắt/Thần Thoại tại Cửa Hàng.';
    return {
      kind: 'farm_shards',
      title: 'Tích Mảnh Rèn Trang Bị Hiếm (Rare) Đầu Tiên',
      targetItemName: 'Mốc Đồ Hiếm · Lượt 1–3',
      whatToUpgrade: bestNextMissing
        ? `Ưu tiên ${bestNextMissing.name} (+${bestNextMissing.level + 1}) & rèn đồ Hiếm đầu tiên`
        : 'Rèn Vũ Khí Hiếm (Rare) đầu tiên tại Lò Rèn',
      missingText:
        missingShards > 0
          ? `Thiếu ${missingShards} Mảnh Hiếm (${forge.rareShards}/${EARLY_FORGE_COSTS.rareShards})${
              bestNextMissing
                ? ` · hoặc ${bestNextMissing.missingGold.toLocaleString('vi-VN')} Vàng nâng vũ khí`
                : ''
            }`
          : `Đạt Ải 4 Ch.1 để mở khóa rèn (${forge.rareShards}/${EARLY_FORGE_COSTS.rareShards} mảnh)`,
      farmWhereText: farmSource,
      canActNow: false,
      actionTarget: 'battle',
      actionLabel: 'Đánh Chương 1',
    };
  }

  if (!hasEpic && policy.highestChapterCleared < 2) {
    const missingEpicShards = Math.max(0, EARLY_FORGE_COSTS.epicShards - forge.epicShards);
    const pityLeft = Math.max(1, 10 - (save.pity?.mythicRollsSinceEpic ?? 0));
    return {
      kind: 'farm_shards',
      title: 'Mở Khóa & Rèn Trang Bị Sử Thi (Epic) Đầu Tiên',
      targetItemName: 'Mốc Đồ Sử Thi · Lượt 2–6',
      whatToUpgrade: bestNextMissing
        ? `Nâng ${bestNextMissing.name} (+${bestNextMissing.level + 1}) và hoàn thiện đồ Sử Thi`
        : 'Rèn Trang Bị Sử Thi (Epic) đầu tiên',
      missingText:
        policy.highestChapterCleared < 1
          ? `Cần vượt Sư Vương (Ải 12 Ch.1) · Đang có ${forge.epicShards}/${EARLY_FORGE_COSTS.epicShards} Mảnh Sử Thi`
          : `Thiếu ${missingEpicShards} Mảnh Sử Thi (hoặc còn ${pityLeft} lượt Pity Rương Thần Thoại)`,
      farmWhereText:
        policy.highestChapterCleared < 1
          ? 'Kiếm tại Chương 1 Ải 8 (Phụ Boss Boreas +5 Mảnh) và Ải 12 (Sư Vương +6 Mảnh + Thư Epic).'
          : 'Kiếm tại Chương 2 (+2~5 Mảnh/lượt), Quét Nhanh hoặc Rương Thần Thoại.',
      canActNow: false,
      actionTarget: policy.highestChapterCleared >= 1 ? 'shop' : 'battle',
      actionLabel: policy.highestChapterCleared >= 1 ? 'Tới Rương & Shop' : 'Chinh Phục Chương 1',
    };
  }

  if (bestNextMissing) {
    return {
      kind: 'upgrade_gear',
      title: `Tích Vàng nâng ${bestNextMissing.name} lên +${bestNextMissing.level + 1}`,
      targetItemName: `${SLOT_LABELS[bestNextMissing.slot]} · ${RARITY_META[bestNextMissing.rarity].label}`,
      whatToUpgrade: `Cường hóa ${bestNextMissing.name} (+${bestNextMissing.level} → +${bestNextMissing.level + 1})`,
      missingText: `Thiếu ${bestNextMissing.missingGold.toLocaleString('vi-VN')} Vàng (cần ${bestNextMissing.cost.toLocaleString('vi-VN')})`,
      farmWhereText: sweepUnlocked
        ? 'Kiếm Vàng nhanh từ Quét Nhanh (3 lượt/ngày), Bí Cảnh Hằng Ngày hoặc Chương cao nhất.'
        : 'Kiếm Vàng trực tiếp từ Chương 1, Nhiệm Vụ Ngày và Đánh Phụ Boss Ares.',
      canActNow: false,
      actionTarget: 'battle',
      actionLabel: 'Vào Trận Kiếm Vàng',
    };
  }

  return {
    kind: 'farm_shards',
    title: targetGoal.title,
    targetItemName: targetGoal.title,
    whatToUpgrade: `Tích lũy ${targetGoal.target - targetGoal.current} mảnh nữa để chế tạo`,
    missingText: `Đang có ${targetGoal.current}/${targetGoal.target} mảnh`,
    farmWhereText: targetGoal.dropSourceText,
    canActNow: false,
    actionTarget: 'battle',
    actionLabel: 'Tiếp Tục Chiến Đấu',
  };
}

export interface F2pProgressionSimOptions {
  seed: number | string;
  /**
   * When true, simulates worst-case drop RNG where chests never naturally roll
   * above Common until pity/forge guarantees intervene.
   */
  worstCaseRng?: boolean;
  /**
   * Optional per-run scripted stage outcomes (defaults to realistic F2P curve over 6 runs).
   */
  runPlan?: Array<{ chapterId: number; stageReached: number; victory: boolean }>;
}

export interface F2pProgressionSimResult {
  firstRareRun: number | null;
  firstEpicRun: number | null;
  finalSave: SaveData;
  runSnapshots: Array<{
    run: number;
    chapterId: number;
    stageReached: number;
    victory: boolean;
    hasRare: boolean;
    hasEpic: boolean;
    rareShards: number;
    epicShards: number;
    recommendationTitle: string;
  }>;
}

const DEFAULT_F2P_RUN_PLAN: Array<{ chapterId: number; stageReached: number; victory: boolean }> = [
  { chapterId: 1, stageReached: 3, victory: false },
  { chapterId: 1, stageReached: 6, victory: false }, // Beats Ares (Stage 4) -> unlocks Rare + 10 shards!
  { chapterId: 1, stageReached: 9, victory: false }, // Beats Boreas (Stage 8) -> +5 Epic shards
  { chapterId: 1, stageReached: 12, victory: true }, // Clears Ch.1 -> unlocks Epic + 15 Epic shards + Ch.1 mail!
  { chapterId: 2, stageReached: 6, victory: false },
  { chapterId: 2, stageReached: 12, victory: true },
];

/**
 * Deterministic F2P progression simulator using real game rules (chapter rarity caps,
 * pity counters, milestone shards, forge crafting, and progression mail) to verify
 * that first Rare arrives in runs 1–3 and first Epic arrives in runs 2–6 even under
 * worst-case chest drop luck.
 */
export function simulateSeededF2pProgression(
  options: F2pProgressionSimOptions
): F2pProgressionSimResult {
  const rng = createSeededRng(options.seed);
  const runPlan = options.runPlan ?? DEFAULT_F2P_RUN_PLAN;
  let save = createInitialSaveData();
  let firstRareRun: number | null = null;
  let firstEpicRun: number | null = null;
  const runSnapshots: F2pProgressionSimResult['runSnapshots'] = [];

  const originalRandom = Math.random;
  Math.random = options.worstCaseRng ? () => 0.9999 : rng;

  try {
    for (let i = 0; i < runPlan.length; i++) {
      const runNum = i + 1;
      const plan = runPlan[i];

      // Record chapter/stage progress + gold/gem drop from the run
      const prevBest = save.bestStagePerChapter[plan.chapterId] ?? 0;
      save = {
        ...save,
        gold: save.gold + plan.stageReached * 28 + (plan.victory ? 120 : 0),
        gems: save.gems + (plan.stageReached >= 4 ? 10 : 4) + (plan.victory ? 15 : 0),
        highestChapterCleared: plan.victory
          ? Math.max(save.highestChapterCleared, plan.chapterId)
          : save.highestChapterCleared,
        bestStagePerChapter: {
          ...save.bestStagePerChapter,
          [plan.chapterId]: Math.max(prevBest, plan.stageReached),
        },
      };

      // Apply real early run milestones (Ares/Boreas/Ch.1 clear shards)
      const ms = applyEarlyRunMilestones(save, plan.chapterId, plan.stageReached, plan.victory);
      save = ms.nextSave;

      const effectiveRng = options.worstCaseRng ? () => 0.9999 : rng;

      // Claim any eligible system mail (Launch, Ares, Ch.1 Clear)
      const mailRes = claimMailsUnified(save, 'all', ({ isPremium, minRarity, forceSTier }) =>
        rollProgressionGatedGear(save, isPremium, minRarity, forceSTier, effectiveRng)
      );
      save = mailRes.nextSave;

      // Open Mythic Chest if unlocked and affordable (25 gems)
      if (isEarlyFeatureUnlocked(save, 'mythic_chest').unlocked && save.gems >= 25) {
        const policy = getEarlyProgressionPolicy(save);
        const batch = rollChestGearBatch(true, 1, save.pity, {
          policy,
          rng: effectiveRng,
        });
        save = {
          ...save,
          gems: save.gems - 25,
          inventory: [...save.inventory, ...batch.items],
          pity: batch.nextPity,
        };
      }

      // Bad-luck fallback: if forge target is craftable, craft immediately
      const goal = getNextTargetGoal(save);
      if (goal.canCraftNow && (goal.tier === 'rare' || goal.tier === 'epic')) {
        const forged = craftEarlyTargetGear(save, goal.tier, effectiveRng);
        if (forged.ok && forged.nextSave) {
          save = forged.nextSave;
        }
      }

      const hasRare = save.inventory.some((g) => RARITY_RANK[g.rarity] >= RARITY_RANK[Rarity.RARE]);
      const hasEpic = save.inventory.some((g) => RARITY_RANK[g.rarity] >= RARITY_RANK[Rarity.EPIC]);
      if (hasRare && firstRareRun === null) firstRareRun = runNum;
      if (hasEpic && firstEpicRun === null) firstEpicRun = runNum;

      const rec = computeNextUpgradeRecommendation(save);
      const fp = normalizeEarlyForgeProgress(save.earlyForgeProgress);
      runSnapshots.push({
        run: runNum,
        chapterId: plan.chapterId,
        stageReached: plan.stageReached,
        victory: plan.victory,
        hasRare,
        hasEpic,
        rareShards: fp.rareShards,
        epicShards: fp.epicShards,
        recommendationTitle: rec.title,
      });
    }
  } finally {
    Math.random = originalRandom;
  }

  return {
    firstRareRun,
    firstEpicRun,
    finalSave: save,
    runSnapshots,
  };
}

export interface DropProtectionSnapshot {
  mythicEpicPityCurrent: number;
  mythicEpicPityMax: number;
  mythicEpicRemaining: number;
  mythicLegendPityCurrent: number;
  mythicLegendPityMax: number;
  mythicLegendRemaining: number;
  rareShards: number;
  rareShardsTarget: number;
  rareCraftReady: boolean;
  epicShards: number;
  epicShardsTarget: number;
  epicCraftReady: boolean;
  hasRare: boolean;
  hasEpic: boolean;
  totalRunsCompleted: number;
  badLuckProtectionActive: boolean;
  f2pMilestoneSummary: string;
  primaryActionTarget: UpgradeActionTarget;
  primaryActionLabel: string;
}

/**
 * Pure, transparent Drop-Protection & Pity calculator surfaced in Post-Run Summary,
 * Forge, and Shop so F2P players always see exact guaranteed progression thresholds.
 */
export function computeDropProtectionSnapshot(save: SaveData): DropProtectionSnapshot {
  const forge = normalizeEarlyForgeProgress(save.earlyForgeProgress);
  const mythicEpicPityMax = 10;
  const mythicLegendPityMax = 50;
  const mythicEpicPityCurrent = Math.max(
    0,
    Math.min(mythicEpicPityMax, save.pity?.mythicRollsSinceEpic ?? 0)
  );
  const mythicLegendPityCurrent = Math.max(
    0,
    Math.min(mythicLegendPityMax, save.pity?.mythicRollsSinceSTier ?? 0)
  );
  const mythicEpicRemaining = Math.max(1, mythicEpicPityMax - mythicEpicPityCurrent);
  const mythicLegendRemaining = Math.max(1, mythicLegendPityMax - mythicLegendPityCurrent);

  const rareShards = forge.rareShards;
  const rareShardsTarget = EARLY_FORGE_COSTS.rareShards;
  const epicShards = forge.epicShards;
  const epicShardsTarget = EARLY_FORGE_COSTS.epicShards;

  const hasRare = save.inventory.some((g) => RARITY_RANK[g.rarity] >= RARITY_RANK[Rarity.RARE]);
  const hasEpic = save.inventory.some((g) => RARITY_RANK[g.rarity] >= RARITY_RANK[Rarity.EPIC]);
  const targetGoal = getNextTargetGoal(save);

  const rareCraftReady = !hasRare && targetGoal.tier === 'rare' && targetGoal.canCraftNow;
  const epicCraftReady = !hasEpic && targetGoal.tier === 'epic' && targetGoal.canCraftNow;
  const totalRunsCompleted = save.runHistory?.length ?? 0;

  // Highlight active Bad-Luck Protection if player has run 2+ times without Rare or 4+ times without Epic
  const badLuckProtectionActive =
    (!hasRare && totalRunsCompleted >= 2) ||
    (!hasEpic && totalRunsCompleted >= 4) ||
    mythicEpicPityCurrent >= 7;

  let f2pMilestoneSummary: string;
  let primaryActionTarget: UpgradeActionTarget;
  let primaryActionLabel: string;

  if (rareCraftReady) {
    f2pMilestoneSummary = 'Đủ Mảnh Hiếm — Có thể rèn ngay Vũ Khí Hiếm (Rare) bảo đảm 100%!';
    primaryActionTarget = 'forge';
    primaryActionLabel = 'Rèn Đồ Hiếm Ngay';
  } else if (epicCraftReady) {
    f2pMilestoneSummary = 'Đủ Mảnh Sử Thi — Có thể rèn ngay Trang Bị Sử Thi (Epic) bảo đảm 100%!';
    primaryActionTarget = 'forge';
    primaryActionLabel = 'Rèn Đồ Sử Thi Ngay';
  } else if (!hasRare) {
    f2pMilestoneSummary = `Mốc Lượt 1–3 (Đồ Hiếm): ${rareShards}/${rareShardsTarget} mảnh rèn bù xui · Đánh tới Ải 4 Ch.1 mở bảo hiểm.`;
    primaryActionTarget = 'battle';
    primaryActionLabel = 'Đánh Chương 1';
  } else if (!hasEpic) {
    f2pMilestoneSummary = `Mốc Lượt 2–6 (Đồ Sử Thi): ${epicShards}/${epicShardsTarget} mảnh rèn · Còn ${mythicEpicRemaining} lượt Pity Rương Thần Thoại.`;
    primaryActionTarget = mythicEpicRemaining <= 3 ? 'shop' : 'battle';
    primaryActionLabel = mythicEpicRemaining <= 3 ? 'Mở Rương Thần Thoại' : 'Săn Mảnh Sử Thi';
  } else {
    f2pMilestoneSummary = `Đã đạt mốc F2P Hiếm & Sử Thi · Còn ${mythicLegendRemaining} lượt Pity Thần Thoại / S-Tier.`;
    primaryActionTarget = 'shop';
    primaryActionLabel = 'Xem Rương & Bảo Hiểm';
  }

  return {
    mythicEpicPityCurrent,
    mythicEpicPityMax,
    mythicEpicRemaining,
    mythicLegendPityCurrent,
    mythicLegendPityMax,
    mythicLegendRemaining,
    rareShards,
    rareShardsTarget,
    rareCraftReady,
    epicShards,
    epicShardsTarget,
    epicCraftReady,
    hasRare,
    hasEpic,
    totalRunsCompleted,
    badLuckProtectionActive,
    f2pMilestoneSummary,
    primaryActionTarget,
    primaryActionLabel,
  };
}

export interface DropRateCodexRow {
  rarityLabel: string;
  colorClass: string;
  baseChestPct: string;
  mythicChestPct: string;
  guaranteeRule: string;
}

export interface DropRateCodexSnapshot {
  rows: DropRateCodexRow[];
  protection: DropProtectionSnapshot;
  salvageConversionNote: string;
  targetSlotCraftCosts: {
    rareShards: number;
    epicShards: number;
    sTierBlueprints: number;
  };
  excessSalvageableCount: number;
}

export function computeDropRateCodex(save: SaveData): DropRateCodexSnapshot {
  const protection = computeDropProtectionSnapshot(save);
  const equippedSet = new Set(Object.values(save.equipped).filter(Boolean) as string[]);
  const excessSalvageableCount = save.inventory.filter((item) => {
    if (equippedSet.has(item.uid)) return false;
    const tpl = GEAR_TEMPLATES[item.templateId];
    if (tpl?.isSTier) return false;
    return item.rarity === Rarity.COMMON || item.rarity === Rarity.RARE;
  }).length;

  return {
    rows: [
      {
        rarityLabel: 'Thường (Common)',
        colorClass: 'text-slate-300',
        baseChestPct: '62.0%',
        mythicChestPct: '0.0%',
        guaranteeRule: 'Phân giải hoàn +2 Mảnh Hiếm · +10 Bụi Tinh Tú',
      },
      {
        rarityLabel: 'Hiếm (Rare)',
        colorClass: 'text-sky-300',
        baseChestPct: '28.0%',
        mythicChestPct: '58.0%',
        guaranteeRule: 'Bảo đảm 100% trong 1–3 lượt Ch.1 hoặc Rèn Đúng Ô (12 Mảnh)',
      },
      {
        rarityLabel: 'Sử Thi (Epic)',
        colorClass: 'text-purple-300',
        baseChestPct: '8.5%',
        mythicChestPct: '33.0%',
        guaranteeRule: `Pity cứng mỗi 10 rương (còn ${protection.mythicEpicRemaining}) · Rèn Đúng Ô (20 Mảnh)`,
      },
      {
        rarityLabel: 'Huyền Thoại / [S]',
        colorClass: 'text-amber-300',
        baseChestPct: '1.5%',
        mythicChestPct: '9.0%',
        guaranteeRule: `Pity cứng mỗi 50 rương (còn ${protection.mythicLegendRemaining}) · Bản Vẽ [S]`,
      },
    ],
    protection,
    salvageConversionNote:
      'Phân Giải An Toàn chỉ tách đồ Thường/Hiếm chưa mặc, tuyệt đối không xóa đồ đang mặc hay bậc Thần Thoại.',
    targetSlotCraftCosts: {
      rareShards: EARLY_FORGE_COSTS.rareShards,
      epicShards: EARLY_FORGE_COSTS.epicShards,
      sTierBlueprints: EARLY_FORGE_COSTS.sTierBlueprints,
    },
    excessSalvageableCount,
  };
}

export interface WeeklyFairnessSummary {
  mythicEpicRemaining: number;
  mythicLegendRemaining: number;
  reforgeGoldPityCount: number;
  reforgeGoldPityMax: number;
  reforgeGoldPityRemaining: number;
  rareShards: number;
  rareShardsTarget: number;
  epicShards: number;
  epicShardsTarget: number;
  sTierBlueprints: number;
  sTierBlueprintsTarget: number;
  freeTransferEligibleCount: number;
  highlightNote: string;
}

/**
 * Pure Wave 7 Fair Progression summary surfacing exact Pity counters,
 * Gold Substat Reforge pity (X/5), Forge Shards, and 100% Free Gear Upgrade Transfer count.
 */
export function computeWeeklyFairnessSummary(save: SaveData): WeeklyFairnessSummary {
  const protection = computeDropProtectionSnapshot(save);
  const forge = normalizeEarlyForgeProgress(save.earlyForgeProgress);
  const reforgeGoldPityMax = 5;
  const reforgeGoldPityCount = Math.max(
    0,
    Math.min(reforgeGoldPityMax, save.reforgeGoldPityCount ?? 0)
  );
  const reforgeGoldPityRemaining = Math.max(1, reforgeGoldPityMax - reforgeGoldPityCount);

  let freeTransferEligibleCount = 0;
  for (const item of save.inventory) {
    if (findBestUpgradeTransferSource(save, item.uid)) {
      freeTransferEligibleCount += 1;
    }
  }

  const sTierBlueprints = forge.sTierBlueprints;
  const sTierBlueprintsTarget = EARLY_FORGE_COSTS.sTierBlueprints;

  let highlightNote: string;
  if (freeTransferEligibleCount > 0) {
    highlightNote = `Có ${freeTransferEligibleCount} trang bị kế thừa cấp Cường Hóa 100% Miễn Phí (0 Vàng · Không mất đồ).`;
  } else if (reforgeGoldPityCount >= 4) {
    highlightNote = 'Lần Tẩy Luyện tiếp theo bảo đảm 100% nổ Dòng Vàng (5/5 Pity)!';
  } else if (protection.epicCraftReady || protection.rareCraftReady) {
    highlightNote = 'Đủ mảnh rèn bù xui — có thể chế tạo đúng ô trang bị mục tiêu ngay!';
  } else {
    highlightNote = `Bảo hiểm công bằng: còn ${protection.mythicEpicRemaining} lượt Sử Thi · ${reforgeGoldPityCount}/${reforgeGoldPityMax} Pity Dòng Vàng.`;
  }

  return {
    mythicEpicRemaining: protection.mythicEpicRemaining,
    mythicLegendRemaining: protection.mythicLegendRemaining,
    reforgeGoldPityCount,
    reforgeGoldPityMax,
    reforgeGoldPityRemaining,
    rareShards: forge.rareShards,
    rareShardsTarget: EARLY_FORGE_COSTS.rareShards,
    epicShards: forge.epicShards,
    epicShardsTarget: EARLY_FORGE_COSTS.epicShards,
    sTierBlueprints,
    sTierBlueprintsTarget,
    freeTransferEligibleCount,
    highlightNote,
  };
}


import {
  GearInstance,
  GearSubstat,
  Rarity,
  RuneId,
  SaveData,
} from '../types/game';
import { RUNES_CATALOG } from './runesData';
import {
  SUBSTAT_DEFS,
  getEffectiveSubstats,
  getMaxSubstatsForRarity,
} from './wave4Data';

/**
 * Wave 13 Pillar 3: Ancient Rune Refinement (+0 → +5) & Targeted Gear Substat Polishing.
 *
 * Economic & Progression Guarantees:
 * - Ancient Rune Refinement unlocks at Chapter 3+ (`highestChapterCleared >= 2`),
 *   so Fresh Account (`702 LC`) and Chapter 1–2 early progression remain 100% untouched.
 * - Deterministic Targeted Substat Polishing eliminates pure-RNG frustration while
 *   acting as a meaningful Mid-to-Endgame Gold + StarDust sink (10h–100h).
 * - Strict upper caps prevent Power Creep or Arena/Tower balance breaks.
 */

export const RUNE_REFINEMENT_MAX_TIER = 5;
export const RUNE_REFINEMENT_UNLOCK_CHAPTER_CLEARED = 2; // Cleared Ch.2 -> Ch.3 unlocked
export const RUNE_REFINEMENT_BONUS_PER_TIER = 0.06; // +6% rune effectiveness per tier (max +30%)

export interface RuneRefinementCost {
  gold: number;
  starDust: number;
  ancientRuneShards: number;
}

export interface RuneRefinementPreview {
  runeId: RuneId;
  unlocked: boolean;
  currentTier: number;
  nextTier: number;
  maxTier: number;
  alreadyMaxed: boolean;
  currentBonusPct: number;
  nextBonusPct: number;
  cost: RuneRefinementCost;
  canAfford: boolean;
  lockReason: string | null;
}

export function getRuneRefinementTier(save: Pick<SaveData, 'runeRefinements'>, runeId: RuneId): number {
  const raw = save.runeRefinements?.[runeId];
  if (typeof raw !== 'number' || !Number.isFinite(raw)) return 0;
  return Math.max(0, Math.min(RUNE_REFINEMENT_MAX_TIER, Math.floor(raw)));
}

export function getRuneRefinementMultiplier(
  save: Pick<SaveData, 'runeRefinements'>,
  runeId: RuneId
): number {
  const tier = getRuneRefinementTier(save, runeId);
  return 1 + tier * RUNE_REFINEMENT_BONUS_PER_TIER;
}

export function getRuneRefinementCost(currentTier: number): RuneRefinementCost {
  const tier = Math.max(0, Math.min(RUNE_REFINEMENT_MAX_TIER - 1, Math.floor(currentTier)));
  const goldSteps = [1800, 3800, 7500, 14000, 24000];
  const dustSteps = [35, 70, 120, 190, 280];
  const shardSteps = [6, 12, 20, 32, 48];
  return {
    gold: goldSteps[tier] ?? 24000,
    starDust: dustSteps[tier] ?? 280,
    ancientRuneShards: shardSteps[tier] ?? 48,
  };
}

export function previewRuneRefinement(save: SaveData, runeId: RuneId): RuneRefinementPreview {
  const unlocked = (save.highestChapterCleared ?? 0) >= RUNE_REFINEMENT_UNLOCK_CHAPTER_CLEARED;
  const currentTier = getRuneRefinementTier(save, runeId);
  const alreadyMaxed = currentTier >= RUNE_REFINEMENT_MAX_TIER;
  const nextTier = alreadyMaxed ? RUNE_REFINEMENT_MAX_TIER : currentTier + 1;
  const cost = getRuneRefinementCost(currentTier);
  const gold = save.gold ?? 0;
  const dust = save.starDust ?? 0;
  const shards = save.pity?.ancientRuneShards ?? 0;
  const canAfford =
    unlocked &&
    !alreadyMaxed &&
    gold >= cost.gold &&
    dust >= cost.starDust &&
    shards >= cost.ancientRuneShards;

  return {
    runeId,
    unlocked,
    currentTier,
    nextTier,
    maxTier: RUNE_REFINEMENT_MAX_TIER,
    alreadyMaxed,
    currentBonusPct: Math.round(currentTier * RUNE_REFINEMENT_BONUS_PER_TIER * 100),
    nextBonusPct: Math.round(nextTier * RUNE_REFINEMENT_BONUS_PER_TIER * 100),
    cost,
    canAfford,
    lockReason: unlocked ? null : 'Mở khóa sau khi vượt Chương 2',
  };
}

export function refineRuneInSave(
  save: SaveData,
  runeId: RuneId
): { ok: boolean; nextSave: SaveData; message: string; newTier: number } {
  if (!RUNES_CATALOG[runeId]) {
    return { ok: false, nextSave: save, message: 'Cổ Ngữ không hợp lệ.', newTier: 0 };
  }
  const hasRune = (save.runeInventory ?? []).some((r) => r.runeId === runeId);
  if (!hasRune) {
    return { ok: false, nextSave: save, message: 'Bạn chưa sở hữu Cổ Ngữ này.', newTier: 0 };
  }
  const preview = previewRuneRefinement(save, runeId);
  if (!preview.unlocked) {
    return {
      ok: false,
      nextSave: save,
      message: preview.lockReason ?? 'Chưa mở khóa Tinh Luyện Cổ Ngữ.',
      newTier: preview.currentTier,
    };
  }
  if (preview.alreadyMaxed) {
    return {
      ok: false,
      nextSave: save,
      message: 'Cổ Ngữ đã đạt bậc tối đa (+5).',
      newTier: preview.currentTier,
    };
  }
  if (!preview.canAfford) {
    return {
      ok: false,
      nextSave: save,
      message: 'Không đủ Vàng, Bụi Sao hoặc Mảnh Cổ Ngữ.',
      newTier: preview.currentTier,
    };
  }

  const nextSave: SaveData = {
    ...save,
    gold: Math.max(0, (save.gold ?? 0) - preview.cost.gold),
    starDust: Math.max(0, (save.starDust ?? 0) - preview.cost.starDust),
    pity: {
      mythicRollsSinceEpic: save.pity?.mythicRollsSinceEpic ?? 0,
      mythicRollsSinceSTier: save.pity?.mythicRollsSinceSTier ?? 0,
      runeRollsSinceEpic: save.pity?.runeRollsSinceEpic ?? 0,
      ...save.pity,
      ancientRuneShards: Math.max(
        0,
        (save.pity?.ancientRuneShards ?? 0) - preview.cost.ancientRuneShards
      ),
    },
    runeRefinements: {
      ...(save.runeRefinements ?? {}),
      [runeId]: preview.nextTier,
    },
  };

  return {
    ok: true,
    nextSave,
    message: `Tinh luyện ${RUNES_CATALOG[runeId].name} lên +${preview.nextTier} (+${preview.nextBonusPct}% hiệu lực)!`,
    newTier: preview.nextTier,
  };
}

// ============================================================================
// TARGETED GEAR SUBSTAT POLISHING (DETERMINISTIC MID-TO-ENDGAME SINK)
// ============================================================================

export interface SubstatPolishCost {
  gold: number;
  starDust: number;
}

export interface SubstatPolishPreview {
  substatId: string;
  label: string;
  currentValue: number;
  nextValue: number;
  maxValue: number;
  currentTier: GearSubstat['tier'];
  nextTier: GearSubstat['tier'];
  completionPct: number;
  nextCompletionPct: number;
  alreadyMaxed: boolean;
  cost: SubstatPolishCost;
  canAfford: boolean;
  currentFormatted: string;
  nextFormatted: string;
}

function resolveTierFromRatio(ratio: number): GearSubstat['tier'] {
  if (ratio >= 0.8) return 'gold';
  if (ratio >= 0.55) return 'epic';
  if (ratio >= 0.25) return 'rare';
  return 'common';
}

export function getSubstatPolishCost(rarity: Rarity, completionRatio: number): SubstatPolishCost {
  const rarityFactor =
    rarity === Rarity.MYTHIC
      ? 2.6
      : rarity === Rarity.LEGENDARY
      ? 1.9
      : rarity === Rarity.EPIC
      ? 1.35
      : 1.0;
  const tierPressure = 1 + Math.max(0, Math.min(1, completionRatio)) * 1.15;
  return {
    gold: Math.round(950 * rarityFactor * tierPressure),
    starDust: Math.round(18 * rarityFactor * tierPressure),
  };
}

export function previewGearSubstatPolish(
  item: GearInstance,
  substatId: string,
  save: Pick<SaveData, 'gold' | 'starDust'>
): SubstatPolishPreview | null {
  if (getMaxSubstatsForRarity(item.rarity) <= 0) return null;
  const subs = getEffectiveSubstats(item);
  const sub = subs.find((s) => s.id === substatId);
  if (!sub) return null;
  const def = SUBSTAT_DEFS[sub.kind];
  if (!def) return null;

  const span = Math.max(0.01, def.maxPct - def.minPct);
  const clampedVal = Math.max(def.minPct, Math.min(def.maxPct, sub.value));
  const currentRatio = Math.max(0, Math.min(1, (clampedVal - def.minPct) / span));
  const alreadyMaxed = clampedVal >= def.maxPct - 0.0005;

  // Deterministic step: advance by 24% of full stat span per polish (caps cleanly in <= 5 steps)
  const step = Math.max(0.01, Math.round(span * 0.24 * 100) / 100);
  const nextValue = alreadyMaxed
    ? def.maxPct
    : Math.min(def.maxPct, Math.round((clampedVal + step) * 100) / 100);
  const nextRatio = Math.max(0, Math.min(1, (nextValue - def.minPct) / span));
  const cost = getSubstatPolishCost(item.rarity, currentRatio);

  const canAfford =
    !alreadyMaxed &&
    (save.gold ?? 0) >= cost.gold &&
    (save.starDust ?? 0) >= cost.starDust;

  return {
    substatId: sub.id,
    label: def.label,
    currentValue: clampedVal,
    nextValue,
    maxValue: def.maxPct,
    currentTier: resolveTierFromRatio(currentRatio),
    nextTier: resolveTierFromRatio(nextRatio),
    completionPct: Math.round(currentRatio * 100),
    nextCompletionPct: Math.round(nextRatio * 100),
    alreadyMaxed,
    cost,
    canAfford,
    currentFormatted: def.format(clampedVal),
    nextFormatted: def.format(nextValue),
  };
}

export function polishGearSubstatInSave(
  save: SaveData,
  gearUid: string,
  substatId: string
): { ok: boolean; nextSave: SaveData; message: string } {
  const idx = save.inventory.findIndex((g) => g.uid === gearUid);
  if (idx < 0) {
    return { ok: false, nextSave: save, message: 'Không tìm thấy trang bị.' };
  }
  const item = save.inventory[idx];
  const preview = previewGearSubstatPolish(item, substatId, save);
  if (!preview) {
    return { ok: false, nextSave: save, message: 'Dòng phụ không hợp lệ.' };
  }
  if (preview.alreadyMaxed) {
    return { ok: false, nextSave: save, message: 'Dòng phụ này đã đạt trần tối đa.' };
  }
  if (!preview.canAfford) {
    return { ok: false, nextSave: save, message: 'Không đủ Vàng hoặc Bụi Sao để tôi luyện.' };
  }

  const nextSubstats = (item.substats ?? []).map((s) =>
    s.id === substatId
      ? {
          ...s,
          value: preview.nextValue,
          tier: preview.nextTier,
        }
      : s
  );

  const nextInventory = save.inventory.slice();
  nextInventory[idx] = {
    ...item,
    substats: nextSubstats,
  };

  return {
    ok: true,
    nextSave: {
      ...save,
      gold: Math.max(0, (save.gold ?? 0) - preview.cost.gold),
      starDust: Math.max(0, (save.starDust ?? 0) - preview.cost.starDust),
      inventory: nextInventory,
    },
    message: `Tôi luyện ${preview.label}: ${preview.currentFormatted} → ${preview.nextFormatted}!`,
  };
}

import {
  Rarity,
  type ActiveGearSetBonus,
  type GearInstance,
  type GearSetId,
  type PityState,
  type SaveData,
} from '../types/game';
import {
  GEAR_SET_DEFINITIONS,
  GEAR_TEMPLATES,
  evaluateEquippedGearSets,
} from './gearData';

/**
 * ============================================================================
 * WAVE 15 — DETERMINISTIC GEAR SET TRANSMUTATION (CHUYỂN HÓA ĐỒ BỘ TẤT ĐỊNH)
 * ============================================================================
 * Unlocks strictly after Chapter 2 (`highestChapterCleared >= 2`) for Epic+ gear,
 * keeping Fresh Account (702 LC) and early FTUE balance 100% untouched.
 * Eliminates pure RNG frustration when chasing 2-piece / 3-piece Zodiac Set bonuses
 * while creating a clean, audited Gold + StarDust + Forge Relic Shard endgame sink.
 */

export const GEAR_SET_TRANSMUTATION_MIN_CHAPTER = 2;

export const TRANSMUTABLE_GEAR_SET_IDS: readonly GearSetId[] = [
  'Destruction Set',
  'Echo Set',
  'Dragon Knight Set',
  'Oracle Set',
  'Griffin Set',
];

export interface GearSetTransmutationCost {
  gold: number;
  starDust: number;
  forgeRelicShards: number;
}

export const GEAR_SET_TRANSMUTATION_COSTS: Record<
  Rarity.EPIC | Rarity.LEGENDARY | Rarity.MYTHIC,
  GearSetTransmutationCost
> = {
  [Rarity.EPIC]: {
    gold: 6_500,
    starDust: 90,
    forgeRelicShards: 15,
  },
  [Rarity.LEGENDARY]: {
    gold: 18_000,
    starDust: 240,
    forgeRelicShards: 35,
  },
  [Rarity.MYTHIC]: {
    gold: 42_000,
    starDust: 520,
    forgeRelicShards: 75,
  },
};

export function isGearRarityTransmutable(rarity: Rarity): boolean {
  return (
    rarity === Rarity.EPIC ||
    rarity === Rarity.LEGENDARY ||
    rarity === Rarity.MYTHIC
  );
}

export function isValidGearSetId(setId: unknown): setId is GearSetId {
  return typeof setId === 'string' && setId in GEAR_SET_DEFINITIONS;
}

export function resolveEffectiveGearSetId(
  item: Pick<GearInstance, 'templateId' | 'rarity' | 'transmutedSetId'>
): GearSetId | null {
  if (
    item.transmutedSetId &&
    isGearRarityTransmutable(item.rarity) &&
    isValidGearSetId(item.transmutedSetId)
  ) {
    return item.transmutedSetId;
  }
  const tpl = GEAR_TEMPLATES[item.templateId];
  if (!tpl) return null;
  return isValidGearSetId(tpl.setName) ? (tpl.setName as GearSetId) : null;
}

export function getGearSetTransmutationCost(
  rarity: Rarity
): GearSetTransmutationCost | null {
  if (rarity === Rarity.EPIC) return GEAR_SET_TRANSMUTATION_COSTS[Rarity.EPIC];
  if (rarity === Rarity.LEGENDARY) return GEAR_SET_TRANSMUTATION_COSTS[Rarity.LEGENDARY];
  if (rarity === Rarity.MYTHIC) return GEAR_SET_TRANSMUTATION_COSTS[Rarity.MYTHIC];
  return null;
}

export interface GearSetTransmutationPreview {
  canTransmute: boolean;
  reason: string | null;
  unlocked: boolean;
  currentSetId: GearSetId | null;
  targetSetId: GearSetId;
  cost: GearSetTransmutationCost | null;
  hasEnoughGold: boolean;
  hasEnoughDust: boolean;
  hasEnoughShards: boolean;
  beforeSets: ActiveGearSetBonus[];
  afterSets: ActiveGearSetBonus[];
  beforeActiveTiers: number;
  afterActiveTiers: number;
}

export function previewGearSetTransmutation(
  save: SaveData,
  itemUid: string,
  targetSetId: GearSetId
): GearSetTransmutationPreview {
  const beforeEval = evaluateEquippedGearSets(save);
  const unlocked = (save.highestChapterCleared ?? 0) >= GEAR_SET_TRANSMUTATION_MIN_CHAPTER;
  const item = save.inventory.find((g) => g.uid === itemUid);

  if (!isValidGearSetId(targetSetId)) {
    return {
      canTransmute: false,
      reason: 'Đồ Bộ đích không hợp lệ.',
      unlocked,
      currentSetId: item ? resolveEffectiveGearSetId(item) : null,
      targetSetId,
      cost: null,
      hasEnoughGold: false,
      hasEnoughDust: false,
      hasEnoughShards: false,
      beforeSets: beforeEval.sets,
      afterSets: beforeEval.sets,
      beforeActiveTiers: beforeEval.activeTierCount,
      afterActiveTiers: beforeEval.activeTierCount,
    };
  }

  if (!unlocked) {
    return {
      canTransmute: false,
      reason: `Mở khóa sau khi vượt Chương ${GEAR_SET_TRANSMUTATION_MIN_CHAPTER}.`,
      unlocked: false,
      currentSetId: item ? resolveEffectiveGearSetId(item) : null,
      targetSetId,
      cost: item ? getGearSetTransmutationCost(item.rarity) : null,
      hasEnoughGold: false,
      hasEnoughDust: false,
      hasEnoughShards: false,
      beforeSets: beforeEval.sets,
      afterSets: beforeEval.sets,
      beforeActiveTiers: beforeEval.activeTierCount,
      afterActiveTiers: beforeEval.activeTierCount,
    };
  }

  if (!item) {
    return {
      canTransmute: false,
      reason: 'Không tìm thấy trang bị trong túi đồ.',
      unlocked: true,
      currentSetId: null,
      targetSetId,
      cost: null,
      hasEnoughGold: false,
      hasEnoughDust: false,
      hasEnoughShards: false,
      beforeSets: beforeEval.sets,
      afterSets: beforeEval.sets,
      beforeActiveTiers: beforeEval.activeTierCount,
      afterActiveTiers: beforeEval.activeTierCount,
    };
  }

  const currentSetId = resolveEffectiveGearSetId(item);
  const cost = getGearSetTransmutationCost(item.rarity);
  if (!cost) {
    return {
      canTransmute: false,
      reason: 'Chỉ trang bị Sử Thi (Epic) trở lên mới có thể Chuyển Hóa Đồ Bộ.',
      unlocked: true,
      currentSetId,
      targetSetId,
      cost: null,
      hasEnoughGold: false,
      hasEnoughDust: false,
      hasEnoughShards: false,
      beforeSets: beforeEval.sets,
      afterSets: beforeEval.sets,
      beforeActiveTiers: beforeEval.activeTierCount,
      afterActiveTiers: beforeEval.activeTierCount,
    };
  }

  if (currentSetId === targetSetId) {
    return {
      canTransmute: false,
      reason: 'Trang bị đã thuộc Đồ Bộ này.',
      unlocked: true,
      currentSetId,
      targetSetId,
      cost,
      hasEnoughGold: save.gold >= cost.gold,
      hasEnoughDust: (save.starDust ?? 0) >= cost.starDust,
      hasEnoughShards: (save.pity?.forgeRelicShards ?? 0) >= cost.forgeRelicShards,
      beforeSets: beforeEval.sets,
      afterSets: beforeEval.sets,
      beforeActiveTiers: beforeEval.activeTierCount,
      afterActiveTiers: beforeEval.activeTierCount,
    };
  }

  const simulatedInventory = save.inventory.map((g) =>
    g.uid === item.uid ? { ...g, transmutedSetId: targetSetId } : g
  );
  const afterEval = evaluateEquippedGearSets({
    equipped: save.equipped,
    inventory: simulatedInventory,
  });

  const hasEnoughGold = save.gold >= cost.gold;
  const hasEnoughDust = (save.starDust ?? 0) >= cost.starDust;
  const hasEnoughShards = (save.pity?.forgeRelicShards ?? 0) >= cost.forgeRelicShards;

  let reason: string | null = null;
  if (!hasEnoughGold) {
    reason = `Thiếu Vàng (cần ${cost.gold.toLocaleString('vi-VN')}).`;
  } else if (!hasEnoughDust) {
    reason = `Thiếu Bụi Sao (cần ${cost.starDust.toLocaleString('vi-VN')}).`;
  } else if (!hasEnoughShards) {
    reason = `Thiếu Mảnh Thánh Lò (cần ${cost.forgeRelicShards}).`;
  }

  return {
    canTransmute: hasEnoughGold && hasEnoughDust && hasEnoughShards,
    reason,
    unlocked: true,
    currentSetId,
    targetSetId,
    cost,
    hasEnoughGold,
    hasEnoughDust,
    hasEnoughShards,
    beforeSets: beforeEval.sets,
    afterSets: afterEval.sets,
    beforeActiveTiers: beforeEval.activeTierCount,
    afterActiveTiers: afterEval.activeTierCount,
  };
}

export interface GearSetTransmutationResult {
  ok: boolean;
  reason?: string;
  nextSave: SaveData;
  cost?: GearSetTransmutationCost;
  targetSetDisplayName?: string;
}

export function transmuteGearSetInSave(
  save: SaveData,
  itemUid: string,
  targetSetId: GearSetId
): GearSetTransmutationResult {
  const preview = previewGearSetTransmutation(save, itemUid, targetSetId);
  if (!preview.canTransmute || !preview.cost) {
    return {
      ok: false,
      reason: preview.reason ?? 'Không thể chuyển hóa Đồ Bộ.',
      nextSave: save,
    };
  }

  const cost = preview.cost;
  const nextPity: PityState = {
    mythicRollsSinceEpic: save.pity?.mythicRollsSinceEpic ?? 0,
    mythicRollsSinceSTier: save.pity?.mythicRollsSinceSTier ?? 0,
    runeRollsSinceEpic: save.pity?.runeRollsSinceEpic ?? 0,
    runeRollsSinceLegendary: save.pity?.runeRollsSinceLegendary ?? 0,
    ancientRuneShards: save.pity?.ancientRuneShards ?? 0,
    forgeRollsSinceEpic: save.pity?.forgeRollsSinceEpic ?? 0,
    forgeRollsSinceLegendary: save.pity?.forgeRollsSinceLegendary ?? 0,
    forgeRelicShards: Math.max(0, (save.pity?.forgeRelicShards ?? 0) - cost.forgeRelicShards),
  };

  const nextInventory = save.inventory.map((g) =>
    g.uid === itemUid ? { ...g, transmutedSetId: targetSetId } : g
  );

  return {
    ok: true,
    cost,
    targetSetDisplayName: GEAR_SET_DEFINITIONS[targetSetId].displayName,
    nextSave: {
      ...save,
      gold: Math.max(0, save.gold - cost.gold),
      starDust: Math.max(0, (save.starDust ?? 0) - cost.starDust),
      pity: nextPity,
      inventory: nextInventory,
    },
  };
}

export interface Wave15TransmutationSinkAudit {
  midgame2EpicTransmutes: GearSetTransmutationCost;
  endgame2LegendaryAnd2MythicTransmutes: GearSetTransmutationCost;
  total100hTransmutationGoldSink: number;
  total100hTransmutationDustSink: number;
  total100hTransmutationShardSink: number;
}

export function computeWave15TransmutationSinkAudit(): Wave15TransmutationSinkAudit {
  const e = GEAR_SET_TRANSMUTATION_COSTS[Rarity.EPIC];
  const l = GEAR_SET_TRANSMUTATION_COSTS[Rarity.LEGENDARY];
  const m = GEAR_SET_TRANSMUTATION_COSTS[Rarity.MYTHIC];

  const midgame2EpicTransmutes: GearSetTransmutationCost = {
    gold: e.gold * 2,
    starDust: e.starDust * 2,
    forgeRelicShards: e.forgeRelicShards * 2,
  };
  const endgame2LegendaryAnd2MythicTransmutes: GearSetTransmutationCost = {
    gold: l.gold * 2 + m.gold * 2,
    starDust: l.starDust * 2 + m.starDust * 2,
    forgeRelicShards: l.forgeRelicShards * 2 + m.forgeRelicShards * 2,
  };

  return {
    midgame2EpicTransmutes,
    endgame2LegendaryAnd2MythicTransmutes,
    total100hTransmutationGoldSink:
      midgame2EpicTransmutes.gold + endgame2LegendaryAnd2MythicTransmutes.gold,
    total100hTransmutationDustSink:
      midgame2EpicTransmutes.starDust + endgame2LegendaryAnd2MythicTransmutes.starDust,
    total100hTransmutationShardSink:
      midgame2EpicTransmutes.forgeRelicShards +
      endgame2LegendaryAnd2MythicTransmutes.forgeRelicShards,
  };
}

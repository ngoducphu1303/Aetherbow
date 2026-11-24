import { GearSlot, Rarity, SaveData } from '../types/game';
import { GEAR_TEMPLATES, RARITY_META } from './gearData';

export const SAVE_INTEGRITY_CAPS = {
  maxGold: 500_000_000,
  maxGems: 5_000_000,
  maxStarDust: 50_000_000,
  maxHeroShards: 100_000,
  maxChapterCleared: 12,
  maxTowerFloor: 500,
  maxGearAwakening: 10,
  maxInventoryItems: 600,
  maxRunes: 300,
} as const;

export interface SaveIntegrityReport {
  ok: boolean;
  repairs: string[];
  warnings: string[];
  sanitizedSave: SaveData;
}

const VALID_RARITIES = new Set<string>(Object.values(Rarity));

function clampSafeInt(
  value: unknown,
  min: number,
  max: number,
  label: string,
  repairs: string[]
): number {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    repairs.push(`${label}: giá trị không phải số hợp lệ đã được đưa về ${min}`);
    return min;
  }
  const floored = Math.floor(num);
  if (floored < min) {
    repairs.push(`${label}: giá trị âm (${floored}) đã được khôi phục về ${min}`);
    return min;
  }
  if (floored > max) {
    repairs.push(`${label}: vượt trần (${floored}) đã được giới hạn ở ${max}`);
    return max;
  }
  return floored;
}

/**
 * Forward-compatible save integrity sanitizer:
 * - Preserves 100% of legitimate existing player progress, currencies, chapters, and items.
 * - Neutralizes corrupted values (NaN, Infinity, negative currencies, impossible overflows,
 *   invalid rarities, and dangling equipped UIDs) before persistence or cloud sync.
 */
export function validateAndSanitizeSaveIntegrity(save: SaveData): SaveIntegrityReport {
  const repairs: string[] = [];
  const warnings: string[] = [];

  const gold = clampSafeInt(save.gold, 0, SAVE_INTEGRITY_CAPS.maxGold, 'gold', repairs);
  const gems = clampSafeInt(save.gems, 0, SAVE_INTEGRITY_CAPS.maxGems, 'gems', repairs);
  const starDust = clampSafeInt(
    save.starDust ?? 0,
    0,
    SAVE_INTEGRITY_CAPS.maxStarDust,
    'starDust',
    repairs
  );
  const highestChapterCleared = clampSafeInt(
    save.highestChapterCleared ?? 0,
    0,
    SAVE_INTEGRITY_CAPS.maxChapterCleared,
    'highestChapterCleared',
    repairs
  );
  const bestTowerFloor = clampSafeInt(
    save.bestTowerFloor ?? 0,
    0,
    SAVE_INTEGRITY_CAPS.maxTowerFloor,
    'bestTowerFloor',
    repairs
  );

  // Sanitize inventory while preserving every valid legacy item
  const rawInventory = Array.isArray(save.inventory) ? save.inventory : [];
  if (rawInventory.length > SAVE_INTEGRITY_CAPS.maxInventoryItems) {
    warnings.push(
      `Túi trang bị chứa ${rawInventory.length} vật phẩm (khuyến nghị tách đồ thừa dưới ${SAVE_INTEGRITY_CAPS.maxInventoryItems}).`
    );
  }

  const seenUids = new Set<string>();
  const cleanInventory = [];
  for (const item of rawInventory) {
    if (!item || typeof item !== 'object' || typeof item.uid !== 'string' || !item.uid.trim()) {
      repairs.push('inventory: đã bỏ qua 1 bản ghi trang bị lỗi thiếu mã định danh');
      continue;
    }
    if (seenUids.has(item.uid)) {
      repairs.push(`inventory: đã loại bỏ bản sao trùng UID (${item.uid})`);
      continue;
    }
    if (!GEAR_TEMPLATES[item.templateId]) {
      repairs.push(`inventory: bỏ qua trang bị không tồn tại mẫu (${String(item.templateId)})`);
      continue;
    }
    seenUids.add(item.uid);

    const safeRarity: Rarity = VALID_RARITIES.has(item.rarity) ? item.rarity : Rarity.COMMON;
    if (safeRarity !== item.rarity) {
      repairs.push(`inventory[${item.uid}]: phẩm chất không hợp lệ được đưa về COMMON`);
    }
    const maxLv = RARITY_META[safeRarity]?.maxLevel ?? 80;
    const safeLevel = clampSafeInt(
      item.level ?? 1,
      1,
      Math.max(maxLv, 80),
      `gear[${item.uid}].level`,
      repairs
    );
    const safeAwakening = clampSafeInt(
      item.awakeningLevel ?? 0,
      0,
      SAVE_INTEGRITY_CAPS.maxGearAwakening,
      `gear[${item.uid}].awakeningLevel`,
      repairs
    );

    cleanInventory.push(
      safeRarity === item.rarity &&
        safeLevel === item.level &&
        safeAwakening === (item.awakeningLevel ?? 0)
        ? item
        : {
            ...item,
            rarity: safeRarity,
            level: safeLevel,
            awakeningLevel: safeAwakening,
          }
    );
  }

  // Sanitize equipped references (clear dangling UIDs only)
  const nextEquipped: Partial<Record<GearSlot, string>> = { ...(save.equipped ?? {}) };
  for (const slot of Object.values(GearSlot)) {
    const uid = nextEquipped[slot];
    if (uid && !seenUids.has(uid)) {
      repairs.push(`equipped[${slot}]: đã gỡ tham chiếu trang bị không còn tồn tại (${uid})`);
      delete nextEquipped[slot];
    }
  }

  // Sanitize earlyForgeProgress counters
  const fp = save.earlyForgeProgress;
  const cleanForge = fp
    ? {
        ...fp,
        rareShards: clampSafeInt(fp.rareShards ?? 0, 0, 100_000, 'rareShards', repairs),
        epicShards: clampSafeInt(fp.epicShards ?? 0, 0, 100_000, 'epicShards', repairs),
        sTierBlueprints: clampSafeInt(
          fp.sTierBlueprints ?? 0,
          0,
          100_000,
          'sTierBlueprints',
          repairs
        ),
      }
    : save.earlyForgeProgress;

  // Sanitize hero stars map (preserve valid legacy star tiers, clamp corrupt values)
  const cleanHeroStars: Record<string, number> = {};
  if (save.heroStars && typeof save.heroStars === 'object') {
    for (const [k, v] of Object.entries(save.heroStars)) {
      cleanHeroStars[k] = clampSafeInt(
        v ?? 0,
        0,
        20,
        `heroStars[${k}]`,
        repairs
      );
    }
  }

  // Sanitize chapterMilestones (preserve valid 1..4 star progress, clamp corrupt values)
  let cleanChapterMilestones = save.chapterMilestones;
  if (save.chapterMilestones && typeof save.chapterMilestones === 'object') {
    const nextMap: NonNullable<SaveData['chapterMilestones']> = {};
    for (const [k, entry] of Object.entries(save.chapterMilestones)) {
      const chId = Number(k);
      if (!Number.isInteger(chId) || chId < 1 || chId > SAVE_INTEGRITY_CAPS.maxChapterCleared || !entry || typeof entry !== 'object') {
        repairs.push(`chapterMilestones[${k}]: bỏ qua bản ghi mốc sao không hợp lệ`);
        continue;
      }
      const clears = clampSafeInt(entry.clears ?? 0, 0, 100_000, `chapterMilestones[${k}].clears`, repairs);
      const rawStars = Array.isArray(entry.starsEarned) ? entry.starsEarned : [];
      const validStars = Array.from(
        new Set(rawStars.filter((s): s is number => s === 1 || s === 2 || s === 3 || s === 4))
      ).sort((a, b) => a - b);
      if (validStars.length !== rawStars.length) {
        repairs.push(`chapterMilestones[${k}].starsEarned: đã lọc giá trị sao không hợp lệ`);
      }
      nextMap[chId] = {
        chapterId: chId,
        clears,
        starsEarned: validStars,
        bestEndHpRatio:
          typeof entry.bestEndHpRatio === 'number' && Number.isFinite(entry.bestEndHpRatio)
            ? Math.max(0, Math.min(1, entry.bestEndHpRatio))
            : undefined,
        bestPerfectDodges:
          typeof entry.bestPerfectDodges === 'number' && Number.isFinite(entry.bestPerfectDodges)
            ? Math.max(0, Math.floor(entry.bestPerfectDodges))
            : undefined,
        bestBossGuardBreaks:
          typeof entry.bestBossGuardBreaks === 'number' && Number.isFinite(entry.bestBossGuardBreaks)
            ? Math.max(0, Math.floor(entry.bestBossGuardBreaks))
            : undefined,
      };
    }
    cleanChapterMilestones = nextMap;
  }

  const sanitizedSave: SaveData =
    repairs.length === 0
      ? save
      : {
          ...save,
          gold,
          gems,
          starDust,
          highestChapterCleared,
          bestTowerFloor,
          inventory: cleanInventory,
          equipped: nextEquipped,
          earlyForgeProgress: cleanForge,
          heroStars: save.heroStars
            ? (cleanHeroStars as SaveData['heroStars'])
            : save.heroStars,
          chapterMilestones: cleanChapterMilestones,
        };

  return {
    ok: repairs.length === 0,
    repairs,
    warnings,
    sanitizedSave,
  };
}

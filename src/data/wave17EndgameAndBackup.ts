import {
  GearInstance,
  GearSlot,
  MythicImprintAspectId,
  MythicZodiacImprint,
  Rarity,
  SaveData,
  SaveRollbackSnapshotMeta,
  SmartUpgradeRoiEntry,
} from '../types/game';
import {
  computePlayerStats,
  GEAR_TEMPLATES,
  getGearUpgradeCost,
  getTalentUpgradeCost,
} from './gearData';
import {
  getRuneRefinementCost,
  getRuneRefinementLevel,
  RUNE_REFINEMENT_MAX_LEVEL,
} from './wave4Data';
import { validateAndSanitizeSaveIntegrity } from './saveIntegrity';

/**
 * Wave 17 Endgame Economy, Smart Upgrade ROI Advisor & Automatic Save Rollback Vault.
 * - Mythic Zodiac Imprint (+1..+5): strictly gated Ch.4+ & Rarity.MYTHIC (0 impact on Fresh 702 LC!).
 * - Smart Upgrade ROI Advisor: read-only projections using real computePlayerStats (+LC / 1.000 Vàng).
 * - Save Rollback Vault: bounded max 5 FNV-1a checksummed local snapshots + saveIntegrity validation.
 */

export const MYTHIC_IMPRINT_MIN_CHAPTER = 4;
export const MYTHIC_IMPRINT_MAX_TIER = 5;

export interface MythicImprintAspectDef {
  id: MythicImprintAspectId;
  name: string;
  glyph: string;
  accentHex: string;
  summary: string;
  atkPctPerTier: number;
  hpPctPerTier: number;
  bossDmgPctPerTier: number;
  critChancePerTier: number;
  critDmgPerTier: number;
  drPerTier: number;
}

export const MYTHIC_IMPRINT_ASPECTS: Record<MythicImprintAspectId, MythicImprintAspectDef> = {
  solar_sunder: {
    id: 'solar_sunder',
    name: 'Nhật Luân Phá Giáp',
    glyph: '☀',
    accentHex: '#f59e0b',
    summary: '+2.4% Công & +3.0% ST Boss mỗi bậc',
    atkPctPerTier: 0.024,
    hpPctPerTier: 0,
    bossDmgPctPerTier: 0.03,
    critChancePerTier: 0,
    critDmgPerTier: 0,
    drPerTier: 0,
  },
  astral_pierce: {
    id: 'astral_pierce',
    name: 'Tinh Lôi Xuyên Thấu',
    glyph: '⚡',
    accentHex: '#38bdf8',
    summary: '+1.4% Chí Mạng & +2.2% Công mỗi bậc',
    atkPctPerTier: 0.022,
    hpPctPerTier: 0,
    bossDmgPctPerTier: 0,
    critChancePerTier: 0.014,
    critDmgPerTier: 0.035,
    drPerTier: 0,
  },
  jade_aegis: {
    id: 'jade_aegis',
    name: 'Thánh Ngọc Hộ Thân',
    glyph: '◈',
    accentHex: '#10b981',
    summary: '+3.2% Máu & +1.6% Giảm Sát Thương mỗi bậc',
    atkPctPerTier: 0,
    hpPctPerTier: 0.032,
    bossDmgPctPerTier: 0,
    critChancePerTier: 0,
    critDmgPerTier: 0,
    drPerTier: 0.016,
  },
  lunar_execution: {
    id: 'lunar_execution',
    name: 'Huyết Nguyệt Bạo Kích',
    glyph: '☽',
    accentHex: '#e879f9',
    summary: '+6.0% ST Chí Mạng & +2.0% ST Boss mỗi bậc',
    atkPctPerTier: 0.012,
    hpPctPerTier: 0,
    bossDmgPctPerTier: 0.02,
    critChancePerTier: 0.008,
    critDmgPerTier: 0.06,
    drPerTier: 0,
  },
};

export const MYTHIC_IMPRINT_ASPECT_LIST: MythicImprintAspectDef[] = [
  MYTHIC_IMPRINT_ASPECTS.solar_sunder,
  MYTHIC_IMPRINT_ASPECTS.astral_pierce,
  MYTHIC_IMPRINT_ASPECTS.jade_aegis,
  MYTHIC_IMPRINT_ASPECTS.lunar_execution,
];

export function isValidMythicImprintAspectId(value: unknown): value is MythicImprintAspectId {
  return (
    typeof value === 'string' &&
    Object.prototype.hasOwnProperty.call(MYTHIC_IMPRINT_ASPECTS, value)
  );
}

export interface MythicImprintCost {
  nextTier: number;
  gold: number;
  starDust: number;
  forgeShards: number;
  spiritCores: number;
}

export function getMythicImprintCost(currentTier: number): MythicImprintCost {
  const safeTier = Math.max(0, Math.min(MYTHIC_IMPRINT_MAX_TIER, Math.floor(currentTier || 0)));
  const nextTier = Math.min(MYTHIC_IMPRINT_MAX_TIER, safeTier + 1);
  // Deterministic progressive Endgame sink (+1 -> +5)
  const goldTable = [0, 3200, 6200, 10800, 17500, 26500];
  const dustTable = [0, 240, 460, 760, 1180, 1750];
  const shardTable = [0, 12, 22, 36, 54, 78];
  const coreTable = [0, 8, 16, 28, 44, 65];
  return {
    nextTier,
    gold: goldTable[nextTier],
    starDust: dustTable[nextTier],
    forgeShards: shardTable[nextTier],
    spiritCores: coreTable[nextTier],
  };
}

export interface MythicImprintStatBonus {
  atkPct: number;
  hpPct: number;
  bossDmgPct: number;
  critChance: number;
  critDmg: number;
  damageReduction: number;
  powerScoreBonus: number;
}

export function getMythicImprintStatBonus(
  imprint?: MythicZodiacImprint | null,
  rarity?: Rarity
): MythicImprintStatBonus {
  if (
    !imprint ||
    (rarity !== undefined && rarity !== Rarity.MYTHIC) ||
    !isValidMythicImprintAspectId(imprint.aspectId)
  ) {
    return {
      atkPct: 0,
      hpPct: 0,
      bossDmgPct: 0,
      critChance: 0,
      critDmg: 0,
      damageReduction: 0,
      powerScoreBonus: 0,
    };
  }
  const tier = Math.max(0, Math.min(MYTHIC_IMPRINT_MAX_TIER, Math.floor(imprint.tier || 0)));
  if (tier <= 0) {
    return {
      atkPct: 0,
      hpPct: 0,
      bossDmgPct: 0,
      critChance: 0,
      critDmg: 0,
      damageReduction: 0,
      powerScoreBonus: 0,
    };
  }
  const def = MYTHIC_IMPRINT_ASPECTS[imprint.aspectId];
  return {
    atkPct: def.atkPctPerTier * tier,
    hpPct: def.hpPctPerTier * tier,
    bossDmgPct: def.bossDmgPctPerTier * tier,
    critChance: def.critChancePerTier * tier,
    critDmg: def.critDmgPerTier * tier,
    damageReduction: def.drPerTier * tier,
    powerScoreBonus: tier * 115,
  };
}

export interface MythicImprintPreview {
  eligible: boolean;
  canAfford: boolean;
  blockedReason: string | null;
  currentImprint: MythicZodiacImprint | null;
  nextImprint: MythicZodiacImprint | null;
  cost: MythicImprintCost;
  beforePower: number;
  afterPower: number;
  powerDelta: number;
}

export function previewMythicImprint(
  save: SaveData,
  gearUid: string,
  aspectId: MythicImprintAspectId
): MythicImprintPreview {
  const beforePower = computePlayerStats(save).powerRating;
  const item = save.inventory.find((g) => g.uid === gearUid);
  const currentImprint = item?.mythicImprint ?? null;
  const currentTier = currentImprint ? Math.max(0, Math.min(MYTHIC_IMPRINT_MAX_TIER, currentImprint.tier)) : 0;
  const isAspectSwitch = Boolean(currentImprint && currentImprint.aspectId !== aspectId);
  const nextTier = isAspectSwitch ? Math.max(1, currentTier) : Math.min(MYTHIC_IMPRINT_MAX_TIER, currentTier + 1);
  const cost = isAspectSwitch
    ? {
        nextTier,
        gold: 2400,
        starDust: 180,
        forgeShards: 10,
        spiritCores: 6,
      }
    : getMythicImprintCost(currentTier);

  if ((save.highestChapterCleared ?? 0) < MYTHIC_IMPRINT_MIN_CHAPTER) {
    return {
      eligible: false,
      canAfford: false,
      blockedReason: `Cần vượt Chương ${MYTHIC_IMPRINT_MIN_CHAPTER} để mở Ấn Tinh Thần Thoại.`,
      currentImprint,
      nextImprint: null,
      cost,
      beforePower,
      afterPower: beforePower,
      powerDelta: 0,
    };
  }
  if (!item) {
    return {
      eligible: false,
      canAfford: false,
      blockedReason: 'Không tìm thấy trang bị.',
      currentImprint: null,
      nextImprint: null,
      cost,
      beforePower,
      afterPower: beforePower,
      powerDelta: 0,
    };
  }
  if (item.rarity !== Rarity.MYTHIC) {
    return {
      eligible: false,
      canAfford: false,
      blockedReason: 'Chỉ trang bị phẩm chất Thần Thoại mới có thể khắc Ấn Tinh.',
      currentImprint,
      nextImprint: null,
      cost,
      beforePower,
      afterPower: beforePower,
      powerDelta: 0,
    };
  }
  if (!isAspectSwitch && currentTier >= MYTHIC_IMPRINT_MAX_TIER) {
    return {
      eligible: false,
      canAfford: false,
      blockedReason: `Trang bị đã đạt Ấn Tinh tối đa (+${MYTHIC_IMPRINT_MAX_TIER}).`,
      currentImprint,
      nextImprint: currentImprint,
      cost,
      beforePower,
      afterPower: beforePower,
      powerDelta: 0,
    };
  }

  const nextImprint: MythicZodiacImprint = { aspectId, tier: nextTier };
  const simulatedSave: SaveData = {
    ...save,
    inventory: save.inventory.map((g) =>
      g.uid === gearUid ? { ...g, mythicImprint: nextImprint } : g
    ),
  };
  const afterPower = computePlayerStats(simulatedSave).powerRating;

  const ownedGold = save.gold ?? 0;
  const ownedDust = save.starDust ?? 0;
  const ownedShards = save.pity?.forgeRelicShards ?? 0;
  const ownedCores = save.spiritCores ?? 0;
  const canAfford =
    ownedGold >= cost.gold &&
    ownedDust >= cost.starDust &&
    ownedShards >= cost.forgeShards &&
    ownedCores >= cost.spiritCores;

  return {
    eligible: true,
    canAfford,
    blockedReason: canAfford ? null : 'Chưa đủ Vàng, Bụi Sao, Mảnh Thánh Lò hoặc Hồn Tinh.',
    currentImprint,
    nextImprint,
    cost,
    beforePower,
    afterPower,
    powerDelta: afterPower - beforePower,
  };
}

export function applyMythicImprint(
  save: SaveData,
  gearUid: string,
  aspectId: MythicImprintAspectId
): { ok: boolean; save: SaveData; message: string; powerDelta: number } {
  const preview = previewMythicImprint(save, gearUid, aspectId);
  if (!preview.eligible || !preview.canAfford || !preview.nextImprint) {
    return {
      ok: false,
      save,
      message: preview.blockedReason ?? 'Không thể khắc Ấn Tinh lúc này.',
      powerDelta: 0,
    };
  }

  const nextSave: SaveData = {
    ...save,
    gold: Math.max(0, (save.gold ?? 0) - preview.cost.gold),
    starDust: Math.max(0, (save.starDust ?? 0) - preview.cost.starDust),
    spiritCores: Math.max(0, (save.spiritCores ?? 0) - preview.cost.spiritCores),
    pity: {
      ...(save.pity ?? {
        goldChestCounter: 0,
        astralChestCounter: 0,
        forgeRelicShards: 0,
        zodiacBannerCounter: 0,
      }),
      forgeRelicShards: Math.max(
        0,
        (save.pity?.forgeRelicShards ?? 0) - preview.cost.forgeShards
      ),
    },
    inventory: save.inventory.map((g) =>
      g.uid === gearUid ? { ...g, mythicImprint: preview.nextImprint! } : g
    ),
  };

  const aspectDef = MYTHIC_IMPRINT_ASPECTS[aspectId];
  return {
    ok: true,
    save: nextSave,
    message: `Đã khắc ${aspectDef.name} +${preview.nextImprint.tier} (${preview.powerDelta >= 0 ? `+${preview.powerDelta}` : preview.powerDelta} LC)!`,
    powerDelta: preview.powerDelta,
  };
}

export interface MythicImprintSinkAudit {
  perItemGoldSink: number;
  perItemStarDustSink: number;
  perItemForgeShardsSink: number;
  perItemSpiritCoresSink: number;
  full6SlotGoldSink: number;
  full6SlotStarDustSink: number;
  full6SlotForgeShardsSink: number;
  full6SlotSpiritCoresSink: number;
}

export function computeWave17MythicImprintSinkAudit(): MythicImprintSinkAudit {
  let gold = 0;
  let dust = 0;
  let shards = 0;
  let cores = 0;
  for (let tier = 0; tier < MYTHIC_IMPRINT_MAX_TIER; tier++) {
    const c = getMythicImprintCost(tier);
    gold += c.gold;
    dust += c.starDust;
    shards += c.forgeShards;
    cores += c.spiritCores;
  }
  return {
    perItemGoldSink: gold,
    perItemStarDustSink: dust,
    perItemForgeShardsSink: shards,
    perItemSpiritCoresSink: cores,
    full6SlotGoldSink: gold * 6,
    full6SlotStarDustSink: dust * 6,
    full6SlotForgeShardsSink: shards * 6,
    full6SlotSpiritCoresSink: cores * 6,
  };
}

// ---------------------------------------------------------------------------
// Smart Upgrade ROI Advisor (+LC / 1.000 Vàng) — Read-Only Projection
// ---------------------------------------------------------------------------

export function computeSmartUpgradeRoi(
  save: SaveData,
  maxResults = 3
): SmartUpgradeRoiEntry[] {
  const basePower = computePlayerStats(save).powerRating;
  const candidates: SmartUpgradeRoiEntry[] = [];

  // 1. Equipped Gear Level-Up Candidates
  for (const slot of Object.values(GearSlot)) {
    const uid = save.equipped[slot];
    if (!uid) continue;
    const item = save.inventory.find((g) => g.uid === uid);
    if (!item || item.level >= 60) continue;
    const tpl = GEAR_TEMPLATES[item.templateId];
    if (!tpl) continue;
    const goldCost = getGearUpgradeCost(item.level, item.rarity);
    if (goldCost <= 0) continue;

    const simSave: SaveData = {
      ...save,
      inventory: save.inventory.map((g) =>
        g.uid === item.uid ? { ...g, level: g.level + 1 } : g
      ),
    };
    const nextPower = computePlayerStats(simSave).powerRating;
    const delta = Math.max(0, nextPower - basePower);
    if (delta <= 0) continue;

    candidates.push({
      id: `gear_${item.uid}`,
      targetTab: 'gear',
      title: `Cường hóa ${tpl.name} Lv.${item.level} → ${item.level + 1}`,
      detail: `Tăng trực tiếp chỉ số gốc (+${delta} LC) · Tốn ${goldCost.toLocaleString('vi-VN')} Vàng.`,
      goldCost,
      estimatedLcGain: delta,
      lcPer1000Gold: Number(((delta / goldCost) * 1000).toFixed(1)),
      affordableNow: (save.gold ?? 0) >= goldCost,
      actionLabel: 'Mở Trang Bị',
    });
  }

  // 2. Cheapest Talent Candidate (Attack / HP / Crit / AtkSpeed)
  const talentKeys: Array<{ key: keyof SaveData['talents']; label: string }> = [
    { key: 'attack', label: 'Thiên Phú Sức Mạnh' },
    { key: 'hp', label: 'Thiên Phú Sinh Mệnh' },
    { key: 'crit', label: 'Thiên Phú Chí Mạng' },
    { key: 'atkSpeed', label: 'Thiên Phú Tốc Bắn' },
  ];
  for (const tk of talentKeys) {
    const curLv = save.talents?.[tk.key] ?? 0;
    if (curLv >= 50) continue;
    const goldCost = getTalentUpgradeCost(curLv);
    if (goldCost <= 0) continue;
    const simSave: SaveData = {
      ...save,
      talents: {
        ...save.talents,
        [tk.key]: curLv + 1,
      },
    };
    const nextPower = computePlayerStats(simSave).powerRating;
    const delta = Math.max(0, nextPower - basePower);
    if (delta <= 0) continue;

    candidates.push({
      id: `talent_${tk.key}`,
      targetTab: 'talents',
      title: `${tk.label} Lv.${curLv} → ${curLv + 1}`,
      detail: `Buff vĩnh viễn toàn đội hình (+${delta} LC) · Tốn ${goldCost.toLocaleString('vi-VN')} Vàng.`,
      goldCost,
      estimatedLcGain: delta,
      lcPer1000Gold: Number(((delta / goldCost) * 1000).toFixed(1)),
      affordableNow: (save.gold ?? 0) >= goldCost,
      actionLabel: 'Nâng Thiên Phú',
    });
  }

  // 3. Equipped Rune Refinement Candidate
  for (const rUid of save.equippedRunes ?? []) {
    const rInst = (save.runeInventory ?? []).find((r) => r.uid === rUid);
    if (!rInst) continue;
    const curLv = getRuneRefinementLevel(save, rInst.runeId);
    if (curLv >= RUNE_REFINEMENT_MAX_LEVEL) continue;
    const cost = getRuneRefinementCost(curLv);
    const simSave: SaveData = {
      ...save,
      runeRefinements: {
        ...(save.runeRefinements ?? {}),
        [rInst.runeId]: curLv + 1,
      },
    };
    const nextPower = computePlayerStats(simSave).powerRating;
    const delta = Math.max(0, nextPower - basePower);
    if (delta <= 0 || cost.gold <= 0) continue;

    candidates.push({
      id: `rune_${rInst.runeId}`,
      targetTab: 'runes',
      title: `Tinh Luyện Cổ Ngữ +${curLv} → +${curLv + 1}`,
      detail: `Khuếch đại cổ ngữ đang lắp (+${delta} LC) · ${cost.gold.toLocaleString('vi-VN')} Vàng & ${cost.starDust} Bụi Sao.`,
      goldCost: cost.gold,
      estimatedLcGain: delta,
      lcPer1000Gold: Number(((delta / cost.gold) * 1000).toFixed(1)),
      affordableNow:
        (save.gold ?? 0) >= cost.gold && (save.starDust ?? 0) >= cost.starDust,
      actionLabel: 'Mở Cổ Ngữ',
    });
  }

  // 4. Mythic Zodiac Imprint Candidate (only if Ch.4+ unlocked & Mythic gear equipped)
  if ((save.highestChapterCleared ?? 0) >= MYTHIC_IMPRINT_MIN_CHAPTER) {
    for (const slot of Object.values(GearSlot)) {
      const uid = save.equipped[slot];
      if (!uid) continue;
      const item = save.inventory.find((g) => g.uid === uid);
      if (!item || item.rarity !== Rarity.MYTHIC) continue;
      const aspectId: MythicImprintAspectId = item.mythicImprint?.aspectId ?? 'solar_sunder';
      const preview = previewMythicImprint(save, item.uid, aspectId);
      if (!preview.eligible || preview.powerDelta <= 0 || preview.cost.gold <= 0) continue;
      const tpl = GEAR_TEMPLATES[item.templateId];
      candidates.push({
        id: `imprint_${item.uid}`,
        targetTab: 'forge_imprint',
        title: `Ấn Tinh ${tpl?.name ?? 'Thần Thoại'} +${preview.nextImprint?.tier ?? 1}`,
        detail: `Thức tỉnh đồ Thần Thoại (+${preview.powerDelta} LC) · ${preview.cost.gold.toLocaleString('vi-VN')} Vàng + nguyên liệu Endgame.`,
        goldCost: preview.cost.gold,
        estimatedLcGain: preview.powerDelta,
        lcPer1000Gold: Number(((preview.powerDelta / preview.cost.gold) * 1000).toFixed(1)),
        affordableNow: preview.canAfford,
        actionLabel: 'Khắc Ấn Tinh',
      });
    }
  }

  // Sort deterministically: highest LC per 1,000 Gold first, tie-break affordableNow then higher LC gain
  candidates.sort((a, b) => {
    if (b.lcPer1000Gold !== a.lcPer1000Gold) return b.lcPer1000Gold - a.lcPer1000Gold;
    if (a.affordableNow !== b.affordableNow) return a.affordableNow ? -1 : 1;
    return b.estimatedLcGain - a.estimatedLcGain;
  });

  return candidates.slice(0, Math.max(1, maxResults));
}

// ---------------------------------------------------------------------------
// Automatic Local Save Snapshot & Rollback Vault (Max 5 Ring-Buffer + FNV-1a)
// ---------------------------------------------------------------------------

export const SAVE_ROLLBACK_MAX_SNAPSHOTS = 5;
export const SAVE_ROLLBACK_STORAGE_KEY = 'aetherbow_save_rollback_vault_v1';

export type SaveRollbackReason = SaveRollbackSnapshotMeta['reason'];

export interface SaveRollbackVaultEntry {
  meta: SaveRollbackSnapshotMeta;
  payloadJson: string;
}

const REASON_LABELS: Record<SaveRollbackReason, string> = {
  manual: 'Lưu thủ công',
  pre_import: 'Trước khi nhập Save',
  pre_reset: 'Trước khi đặt lại tài khoản',
  pre_restore: 'Trước khi khôi phục mốc',
  pre_cloud_overwrite: 'Trước khi đồng bộ đám mây',
};

/**
 * Deterministic 32-bit FNV-1a checksum in 8-char uppercase hex.
 */
export function computeSnapshotChecksum(payload: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    hash ^= payload.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).toUpperCase().padStart(8, '0');
}

export function createSaveRollbackVaultEntry(
  save: SaveData,
  reason: SaveRollbackReason,
  nowMs = Date.now()
): SaveRollbackVaultEntry {
  const sanitized = validateAndSanitizeSaveIntegrity(save).sanitizedSave;
  const payloadJson = JSON.stringify(sanitized);
  const checksum = computeSnapshotChecksum(payloadJson);
  const stats = computePlayerStats(sanitized);
  return {
    meta: {
      id: `snap_${nowMs}_${checksum.slice(0, 4)}`,
      createdAtMs: nowMs,
      reason,
      reasonLabel: REASON_LABELS[reason] ?? 'Mốc sao lưu',
      highestChapterCleared: sanitized.highestChapterCleared ?? 0,
      powerRating: stats.powerRating,
      gold: sanitized.gold ?? 0,
      gems: sanitized.gems ?? 0,
      checksum,
    },
    payloadJson,
  };
}

export function pushSaveRollbackSnapshot(
  vault: SaveRollbackVaultEntry[],
  save: SaveData,
  reason: SaveRollbackReason,
  nowMs = Date.now()
): SaveRollbackVaultEntry[] {
  const entry = createSaveRollbackVaultEntry(save, reason, nowMs);
  const next = [entry, ...vault.filter((v) => v && v.meta && v.meta.id !== entry.meta.id)];
  return next.slice(0, SAVE_ROLLBACK_MAX_SNAPSHOTS);
}

export function listSaveRollbackSnapshots(
  vault: SaveRollbackVaultEntry[]
): SaveRollbackSnapshotMeta[] {
  return vault
    .filter((v) => Boolean(v && v.meta && typeof v.payloadJson === 'string'))
    .map((v) => v.meta);
}

export function restoreSaveRollbackSnapshot(
  vault: SaveRollbackVaultEntry[],
  snapshotId: string
): { ok: boolean; save?: SaveData; error?: string; meta?: SaveRollbackSnapshotMeta } {
  const entry = vault.find((v) => v?.meta?.id === snapshotId);
  if (!entry) {
    return { ok: false, error: 'Không tìm thấy mốc sao lưu được chọn.' };
  }
  const actualChecksum = computeSnapshotChecksum(entry.payloadJson);
  if (actualChecksum !== entry.meta.checksum) {
    return {
      ok: false,
      error: 'Mã kiểm tra FNV-1a không khớp — mốc sao lưu đã bị hỏng hoặc chỉnh sửa.',
    };
  }
  try {
    const parsed = JSON.parse(entry.payloadJson) as SaveData;
    const integrity = validateAndSanitizeSaveIntegrity(parsed);
    return {
      ok: true,
      save: integrity.sanitizedSave,
      meta: entry.meta,
    };
  } catch {
    return {
      ok: false,
      error: 'Không thể giải mã JSON của mốc sao lưu này.',
    };
  }
}

export function loadLocalRollbackVault(): SaveRollbackVaultEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SAVE_ROLLBACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (item): item is SaveRollbackVaultEntry =>
          Boolean(
            item &&
              typeof item === 'object' &&
              item.meta &&
              typeof item.meta.id === 'string' &&
              typeof item.meta.checksum === 'string' &&
              typeof item.payloadJson === 'string'
          )
      )
      .slice(0, SAVE_ROLLBACK_MAX_SNAPSHOTS);
  } catch {
    return [];
  }
}

export function saveLocalRollbackVault(vault: SaveRollbackVaultEntry[]): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(
      SAVE_ROLLBACK_STORAGE_KEY,
      JSON.stringify(vault.slice(0, SAVE_ROLLBACK_MAX_SNAPSHOTS))
    );
  } catch {
    // Ignore storage quota errors cleanly
  }
}

export function recordLocalRollbackSnapshot(
  save: SaveData,
  reason: SaveRollbackReason,
  nowMs = Date.now()
): SaveRollbackVaultEntry[] {
  const current = loadLocalRollbackVault();
  const next = pushSaveRollbackSnapshot(current, save, reason, nowMs);
  saveLocalRollbackVault(next);
  return next;
}

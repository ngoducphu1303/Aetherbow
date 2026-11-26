import {
  AutoSalvageFilterRule,
  CombatDamageSkillKey,
  DamageBreakdown,
  GearInstance,
  HeroId,
  LoadoutPreset,
  LoadoutPresetSlotId,
  Rarity,
  SaveData,
  WeeklyChallengeMetric,
  WeeklyChallengeProgress,
} from '../types/game';
import {
  DEFAULT_LOADOUT_PRESET_SLOTS,
  HERO_MASTERY_MAX_LEVEL,
  computeHeroMasteryBonuses,
  normalizeEarlyForgeProgress,
  normalizeLoadoutPresets,
} from './earlyProgressionData';
import {
  GEAR_SET_DEFINITIONS,
  GEAR_TEMPLATES,
  evaluateEquippedGearSets,
} from './gearData';

// ============================================================================
// 1. SMART AUTO-SALVAGE FILTER (WITH ABSOLUTE PRESET & S-TIER PROTECTION)
// ============================================================================

export const DEFAULT_AUTO_SALVAGE_FILTER: AutoSalvageFilterRule = {
  maxRarity: 'RARE',
  protectSTier: true,
  protectSetPieces: true,
  protectUpgradedOrSocketed: true,
  autoRunAfterBattle: false,
};

export function normalizeAutoSalvageFilter(
  raw?: Partial<AutoSalvageFilterRule>
): AutoSalvageFilterRule {
  const maxRarity =
    raw?.maxRarity === 'COMMON' || raw?.maxRarity === 'RARE' || raw?.maxRarity === 'EPIC'
      ? raw.maxRarity
      : DEFAULT_AUTO_SALVAGE_FILTER.maxRarity;
  return {
    maxRarity,
    // Always protect S-Tier items so players can never accidentally destroy chase relics
    protectSTier: true,
    protectSetPieces: raw?.protectSetPieces ?? DEFAULT_AUTO_SALVAGE_FILTER.protectSetPieces,
    protectUpgradedOrSocketed:
      raw?.protectUpgradedOrSocketed ?? DEFAULT_AUTO_SALVAGE_FILTER.protectUpgradedOrSocketed,
    autoRunAfterBattle: Boolean(raw?.autoRunAfterBattle),
  };
}

/**
 * Collects every gear UID currently equipped or referenced in any Loadout Preset,
 * Build Preset, or Chapter Equipment Preset so Smart Salvage can NEVER destroy them.
 */
export function collectProtectedGearUids(save: SaveData): Set<string> {
  const protectedUids = new Set<string>();
  for (const uid of Object.values(save.equipped ?? {})) {
    if (uid) protectedUids.add(uid);
  }
  for (const preset of normalizeLoadoutPresets(save.loadoutPresets)) {
    for (const uid of Object.values(preset.equipped ?? {})) {
      if (uid) protectedUids.add(uid);
    }
  }
  for (const bp of save.buildPresets ?? []) {
    for (const uid of Object.values(bp?.equipped ?? {})) {
      if (uid) protectedUids.add(uid);
    }
  }
  for (const cp of save.chapterEquipmentPresets ?? []) {
    for (const uid of Object.values(cp?.equipped ?? {})) {
      if (uid) protectedUids.add(uid);
    }
  }
  return protectedUids;
}

const SALVAGE_RARITY_RANK: Record<Rarity, number> = {
  [Rarity.COMMON]: 1,
  [Rarity.RARE]: 2,
  [Rarity.EPIC]: 3,
  [Rarity.LEGENDARY]: 4,
  [Rarity.MYTHIC]: 5,
};

export interface SmartSalvagePreview {
  candidates: GearInstance[];
  salvagedCount: number;
  goldGained: number;
  starDustGained: number;
  rareShardsGained: number;
  epicShardsGained: number;
  protectedPresetCount: number;
  protectedSetOrUpgradedCount: number;
}

export function previewSmartSalvage(
  save: SaveData,
  rawRule?: Partial<AutoSalvageFilterRule>
): SmartSalvagePreview {
  const rule = normalizeAutoSalvageFilter(rawRule ?? save.autoSalvageFilter);
  const maxRank = SALVAGE_RARITY_RANK[Rarity[rule.maxRarity]];
  const protectedUids = collectProtectedGearUids(save);

  const candidates: GearInstance[] = [];
  let goldGained = 0;
  let starDustGained = 0;
  let rareShardsGained = 0;
  let epicShardsGained = 0;
  let protectedPresetCount = 0;
  let protectedSetOrUpgradedCount = 0;

  for (const item of save.inventory) {
    const rank = SALVAGE_RARITY_RANK[item.rarity] ?? 99;
    // Never salvage Legendary or Mythic items regardless of filter settings
    if (rank > maxRank || rank >= SALVAGE_RARITY_RANK[Rarity.LEGENDARY]) {
      continue;
    }
    if (protectedUids.has(item.uid)) {
      protectedPresetCount += 1;
      continue;
    }
    const tpl = GEAR_TEMPLATES[item.templateId];
    if (rule.protectSTier && tpl?.isSTier) {
      protectedSetOrUpgradedCount += 1;
      continue;
    }
    if (rule.protectSetPieces && Boolean(tpl?.setName && tpl.setName in GEAR_SET_DEFINITIONS)) {
      protectedSetOrUpgradedCount += 1;
      continue;
    }
    if (
      rule.protectUpgradedOrSocketed &&
      (item.level > 1 ||
        (item.awakeningLevel ?? 0) > 0 ||
        (Array.isArray(item.socketedGems) && item.socketedGems.length > 0))
    ) {
      protectedSetOrUpgradedCount += 1;
      continue;
    }

    candidates.push(item);
    if (item.rarity === Rarity.COMMON) {
      rareShardsGained += 2;
      starDustGained += 10;
      goldGained += 80 + Math.max(0, item.level - 1) * 25;
    } else if (item.rarity === Rarity.RARE) {
      rareShardsGained += 3;
      epicShardsGained += 1;
      starDustGained += 25;
      goldGained += 220 + Math.max(0, item.level - 1) * 45;
    } else if (item.rarity === Rarity.EPIC) {
      epicShardsGained += 3;
      starDustGained += 55;
      goldGained += 480 + Math.max(0, item.level - 1) * 75;
    }
  }

  return {
    candidates,
    salvagedCount: candidates.length,
    goldGained,
    starDustGained,
    rareShardsGained,
    epicShardsGained,
    protectedPresetCount,
    protectedSetOrUpgradedCount,
  };
}

export function executeSmartSalvage(
  save: SaveData,
  rawRule?: Partial<AutoSalvageFilterRule>
): SmartSalvagePreview & { nextSave: SaveData } {
  const preview = previewSmartSalvage(save, rawRule);
  if (preview.salvagedCount === 0) {
    return { ...preview, nextSave: save };
  }
  const removeSet = new Set(preview.candidates.map((c) => c.uid));
  const kept = save.inventory.filter((g) => !removeSet.has(g.uid));
  const fp = normalizeEarlyForgeProgress(save.earlyForgeProgress);
  return {
    ...preview,
    nextSave: {
      ...save,
      gold: save.gold + preview.goldGained,
      starDust: (save.starDust ?? 0) + preview.starDustGained,
      inventory: kept,
      earlyForgeProgress: {
        ...fp,
        rareShards: fp.rareShards + preview.rareShardsGained,
        epicShards: fp.epicShards + preview.epicShardsGained,
      },
    },
  };
}

// ============================================================================
// 2. WEEKLY CHALLENGE CONTRACTS (ROTATING ISO-WEEK TACTICAL GOALS)
// ============================================================================

export interface WeeklyChallengeDefinition {
  id: string;
  title: string;
  desc: string;
  metric: WeeklyChallengeMetric;
  target: number;
  rewardGold: number;
  rewardGems: number;
  rewardStarDust: number;
  rewardEpicShards: number;
}

export const WEEKLY_CHALLENGES: ReadonlyArray<WeeklyChallengeDefinition> = [
  {
    id: 'wk_runs_6',
    title: 'Chinh Chiến Bền Bỉ',
    desc: 'Hoàn thành 6 lượt chiến đấu bất kỳ (Chiến Dịch, Tháp hoặc Phó Bản)',
    metric: 'runsCompleted',
    target: 6,
    rewardGold: 1200,
    rewardGems: 40,
    rewardStarDust: 45,
    rewardEpicShards: 2,
  },
  {
    id: 'wk_boss_4',
    title: 'Kẻ Diệt Thủ Lĩnh',
    desc: 'Hạ gục 4 Thủ Lĩnh hoặc Boss Chiến Dịch trong tuần',
    metric: 'bossKills',
    target: 4,
    rewardGold: 1600,
    rewardGems: 55,
    rewardStarDust: 60,
    rewardEpicShards: 3,
  },
  {
    id: 'wk_interrupts_5',
    title: 'Nghệ Sĩ Ngắt Chiêu',
    desc: 'Ngắt chiêu cảnh báo của Boss hoặc Tinh Anh 5 lần',
    metric: 'bossInterrupts',
    target: 5,
    rewardGold: 1400,
    rewardGems: 50,
    rewardStarDust: 55,
    rewardEpicShards: 3,
  },
  {
    id: 'wk_reactions_25',
    title: 'Cộng Hưởng Nguyên Tố',
    desc: 'Kích hoạt 25 lần Phản Ứng Nguyên Tố trong trận đấu',
    metric: 'elementalReactions',
    target: 25,
    rewardGold: 1500,
    rewardGems: 45,
    rewardStarDust: 50,
    rewardEpicShards: 2,
  },
  {
    id: 'wk_heroes_2',
    title: 'Bậc Thầy Đa Tướng',
    desc: 'Giành chiến thắng bằng ít nhất 2 Anh Hùng Hoàng Đạo khác nhau',
    metric: 'uniqueHeroesWon',
    target: 2,
    rewardGold: 2000,
    rewardGems: 75,
    rewardStarDust: 80,
    rewardEpicShards: 4,
  },
];

export function getIsoWeekKey(now: Date = new Date()): string {
  const utc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const dayNum = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export function normalizeWeeklyChallenges(
  raw?: WeeklyChallengeProgress,
  weekKey: string = getIsoWeekKey()
): WeeklyChallengeProgress {
  if (!raw || raw.weekKey !== weekKey) {
    return {
      weekKey,
      runsCompleted: 0,
      bossKills: 0,
      bossInterrupts: 0,
      elementalReactions: 0,
      heroesUsedToWin: [],
      claimedIds: [],
    };
  }
  const uniqueHeroes = Array.isArray(raw.heroesUsedToWin)
    ? Array.from(new Set(raw.heroesUsedToWin.filter((h): h is HeroId => typeof h === 'string' && h.length > 0))).slice(0, 8)
    : [];
  const claimedIds = Array.isArray(raw.claimedIds)
    ? Array.from(new Set(raw.claimedIds.filter((id): id is string => typeof id === 'string' && id.length > 0)))
    : [];
  return {
    weekKey,
    runsCompleted: Math.max(0, Math.min(10000, Math.floor(raw.runsCompleted || 0))),
    bossKills: Math.max(0, Math.min(10000, Math.floor(raw.bossKills || 0))),
    bossInterrupts: Math.max(0, Math.min(10000, Math.floor(raw.bossInterrupts || 0))),
    elementalReactions: Math.max(0, Math.min(100000, Math.floor(raw.elementalReactions || 0))),
    heroesUsedToWin: uniqueHeroes,
    claimedIds,
  };
}

export function getWeeklyChallengeCurrentValue(
  progress: WeeklyChallengeProgress,
  metric: WeeklyChallengeMetric
): number {
  if (metric === 'uniqueHeroesWon') {
    return progress.heroesUsedToWin.length;
  }
  return progress[metric] ?? 0;
}

export function recordWeeklyChallengeRun(
  raw: WeeklyChallengeProgress | undefined,
  delta: {
    runsCompleted?: number;
    bossKills?: number;
    bossInterrupts?: number;
    elementalReactions?: number;
    heroWonId?: HeroId;
  },
  weekKey: string = getIsoWeekKey()
): WeeklyChallengeProgress {
  const cur = normalizeWeeklyChallenges(raw, weekKey);
  const nextHeroes =
    delta.heroWonId && !cur.heroesUsedToWin.includes(delta.heroWonId)
      ? [...cur.heroesUsedToWin, delta.heroWonId]
      : cur.heroesUsedToWin;
  return {
    ...cur,
    runsCompleted: cur.runsCompleted + Math.max(0, Math.floor(delta.runsCompleted ?? 0)),
    bossKills: cur.bossKills + Math.max(0, Math.floor(delta.bossKills ?? 0)),
    bossInterrupts: cur.bossInterrupts + Math.max(0, Math.floor(delta.bossInterrupts ?? 0)),
    elementalReactions:
      cur.elementalReactions + Math.max(0, Math.floor(delta.elementalReactions ?? 0)),
    heroesUsedToWin: nextHeroes,
  };
}

export function countClaimableWeeklyChallenges(
  raw: WeeklyChallengeProgress | undefined,
  weekKey: string = getIsoWeekKey()
): number {
  const cur = normalizeWeeklyChallenges(raw, weekKey);
  let count = 0;
  for (const ch of WEEKLY_CHALLENGES) {
    if (
      !cur.claimedIds.includes(ch.id) &&
      getWeeklyChallengeCurrentValue(cur, ch.metric) >= ch.target
    ) {
      count += 1;
    }
  }
  return count;
}

export function claimWeeklyChallengeReward(
  save: SaveData,
  challengeId: string,
  weekKey: string = getIsoWeekKey()
): { claimed: boolean; nextSave: SaveData; reward?: WeeklyChallengeDefinition } {
  const def = WEEKLY_CHALLENGES.find((c) => c.id === challengeId);
  if (!def) return { claimed: false, nextSave: save };
  const cur = normalizeWeeklyChallenges(save.weeklyChallenges, weekKey);
  if (cur.claimedIds.includes(def.id)) return { claimed: false, nextSave: save };
  if (getWeeklyChallengeCurrentValue(cur, def.metric) < def.target) {
    return { claimed: false, nextSave: save };
  }
  const fp = normalizeEarlyForgeProgress(save.earlyForgeProgress);
  return {
    claimed: true,
    reward: def,
    nextSave: {
      ...save,
      gold: save.gold + def.rewardGold,
      gems: save.gems + def.rewardGems,
      starDust: (save.starDust ?? 0) + def.rewardStarDust,
      earlyForgeProgress: {
        ...fp,
        epicShards: fp.epicShards + def.rewardEpicShards,
      },
      weeklyChallenges: {
        ...cur,
        claimedIds: [...cur.claimedIds, def.id],
      },
    },
  };
}

// ============================================================================
// 3. CLAIMABLE HERO-SPECIFIC MASTERY MILESTONES (Lv.2 / 4 / 6 / 8 / 10)
// ============================================================================

export interface HeroMasteryMilestoneDef {
  level: 2 | 4 | 6 | 8 | 10;
  rewardGold: number;
  rewardGems: number;
  rewardStarDust: number;
  titleByHero?: Partial<Record<HeroId, string>>;
}

export const HERO_MASTERY_MILESTONES: ReadonlyArray<HeroMasteryMilestoneDef> = [
  { level: 2, rewardGold: 350, rewardGems: 15, rewardStarDust: 15 },
  { level: 4, rewardGold: 650, rewardGems: 25, rewardStarDust: 30 },
  { level: 6, rewardGold: 1100, rewardGems: 40, rewardStarDust: 50 },
  { level: 8, rewardGold: 1800, rewardGems: 65, rewardStarDust: 80 },
  {
    level: 10,
    rewardGold: 3200,
    rewardGems: 120,
    rewardStarDust: 140,
    titleByHero: {
      aurelia: 'Thái Dương Thánh Xạ',
      bellona: 'Chiến Thần Sấm Bạch Dương',
      sylvia: 'Hộ Vệ Địa Mạch Lục Bảo',
      celeste: 'Nữ Hoàng Nguyệt Kính',
    },
  },
];

export interface HeroMasteryMilestoneState {
  def: HeroMasteryMilestoneDef;
  unlocked: boolean;
  claimed: boolean;
  claimable: boolean;
  rewardTitle?: string;
}

export function getHeroMasteryMilestoneStates(
  save: SaveData,
  heroId: HeroId
): HeroMasteryMilestoneState[] {
  const mastery = computeHeroMasteryBonuses(save.heroMastery, heroId);
  const claimedLevels = new Set(save.claimedHeroMasteryMilestones?.[heroId] ?? []);
  return HERO_MASTERY_MILESTONES.map((def) => {
    const unlocked = mastery.level >= def.level;
    const claimed = claimedLevels.has(def.level);
    return {
      def,
      unlocked,
      claimed,
      claimable: unlocked && !claimed,
      rewardTitle: def.titleByHero?.[heroId],
    };
  });
}

export function countClaimableHeroMasteryMilestones(save: SaveData): number {
  let total = 0;
  for (const heroId of save.unlockedHeroes ?? []) {
    const states = getHeroMasteryMilestoneStates(save, heroId);
    for (const st of states) {
      if (st.claimable) total += 1;
    }
  }
  return total;
}

export function claimHeroMasteryMilestone(
  save: SaveData,
  heroId: HeroId,
  milestoneLevel: number
): { claimed: boolean; nextSave: SaveData; rewardTitle?: string; def?: HeroMasteryMilestoneDef } {
  const def = HERO_MASTERY_MILESTONES.find((m) => m.level === milestoneLevel);
  if (!def) return { claimed: false, nextSave: save };
  const mastery = computeHeroMasteryBonuses(save.heroMastery, heroId);
  if (mastery.level < def.level || def.level > HERO_MASTERY_MAX_LEVEL) {
    return { claimed: false, nextSave: save };
  }
  const existingMap = save.claimedHeroMasteryMilestones ?? {};
  const existingList = Array.isArray(existingMap[heroId]) ? existingMap[heroId]! : [];
  if (existingList.includes(def.level)) {
    return { claimed: false, nextSave: save };
  }
  const rewardTitle = def.titleByHero?.[heroId];

  return {
    claimed: true,
    rewardTitle,
    def,
    nextSave: {
      ...save,
      gold: save.gold + def.rewardGold,
      gems: save.gems + def.rewardGems,
      starDust: (save.starDust ?? 0) + def.rewardStarDust,
      claimedHeroMasteryMilestones: {
        ...existingMap,
        [heroId]: [...existingList, def.level].sort((a, b) => a - b),
      },
    },
  };
}

// ============================================================================
// 4. LOADOUT PRESET RENAME & ACTIVE GEAR SET PREVIEW
// ============================================================================

export function renameLoadoutPreset(
  save: SaveData,
  slotId: LoadoutPresetSlotId,
  rawName: string
): SaveData {
  const cleaned = rawName.replace(/\s+/g, ' ').trim().slice(0, 22);
  const fallbackName =
    DEFAULT_LOADOUT_PRESET_SLOTS.find((s) => s.slotId === slotId)?.defaultName ?? 'Bộ Trang Bị';
  const finalName = cleaned.length > 0 ? cleaned : fallbackName;
  const presets = normalizeLoadoutPresets(save.loadoutPresets);
  const existing = presets.find((p) => p.slotId === slotId);
  if (!existing) {
    const created: LoadoutPreset = {
      slotId,
      name: finalName,
      heroId: save.selectedHeroId,
      equipped: { ...(save.equipped ?? {}) },
      equippedRunes: [...(save.equippedRunes ?? [])].slice(0, 4),
      equippedPetId: save.equippedPetId ?? null,
      equippedWingId: save.equippedWingId ?? null,
      savedAt: Date.now(),
    };
    return {
      ...save,
      loadoutPresets: [...presets, created].sort((a, b) => a.slotId.localeCompare(b.slotId)),
    };
  }
  return {
    ...save,
    loadoutPresets: presets.map((p) => (p.slotId === slotId ? { ...p, name: finalName } : p)),
  };
}

export function getPresetActiveSetSummary(save: SaveData, preset: LoadoutPreset): string | null {
  const evalRes = evaluateEquippedGearSets({
    inventory: save.inventory,
    equipped: preset.equipped,
  });
  const active = evalRes.sets.filter((s) => s.unlockedTiers.length > 0);
  if (active.length === 0) return null;
  return active.map((s) => `${s.displayName} (${s.equippedCount}/${s.maxPieces})`).join(' · ');
}

// ============================================================================
// 5. PER-SKILL COMBAT DAMAGE BREAKDOWN FORMATTER (END-OF-RUN DEBRIEF)
// ============================================================================

export interface CombatSkillDamageMeta {
  key: CombatDamageSkillKey;
  labelVi: string;
  barClass: string;
  textClass: string;
  dotHex: string;
  buildAdviceVi: string;
}

export const COMBAT_SKILL_DAMAGE_META: Record<CombatDamageSkillKey, CombatSkillDamageMeta> = {
  basic_volley: {
    key: 'basic_volley',
    labelVi: 'Đòn Cung & Đa Tiễn',
    barClass: 'from-sky-500 to-cyan-300',
    textClass: 'text-sky-300',
    dotHex: '#38bdf8',
    buildAdviceVi: 'Ưu tiên Đa Tiễn, Mũi Tên Xuyên và Bộ Vang Vọng để tối đa hóa chuỗi đòn thường.',
  },
  hero_active: {
    key: 'hero_active',
    labelVi: 'Chiêu Chủ Động Anh Hùng (E)',
    barClass: 'from-amber-400 to-yellow-200',
    textClass: 'text-amber-200',
    dotHex: '#fbbf24',
    buildAdviceVi: 'Kết hợp nhịp E ngay sau khi né đòn để giữ mạch combo và dồn sát thương gọn.',
  },
  heavy_break: {
    key: 'heavy_break',
    labelVi: 'Phá Giáp Trảm (F)',
    barClass: 'from-orange-500 to-amber-300',
    textClass: 'text-orange-300',
    dotHex: '#f97316',
    buildAdviceVi: 'Dùng Phá Giáp Trảm khi Boss đang gồng chiêu để cắt nhịp và mở cửa sổ +45% sát thương.',
  },
  hero_ultimate: {
    key: 'hero_ultimate',
    labelVi: 'Tuyệt Kỹ Hoàng Đạo (Q)',
    barClass: 'from-purple-500 to-fuchsia-300',
    textClass: 'text-fuchsia-300',
    dotHex: '#c084fc',
    buildAdviceVi: 'Giữ Tuyệt Kỹ cho Pha II/III hoặc ngay khi Boss vừa vỡ giáp để bùng nổ sát thương tối đa.',
  },
  weapon_overdrive: {
    key: 'weapon_overdrive',
    labelVi: 'Thức Tỉnh Vũ Khí (X)',
    barClass: 'from-rose-500 to-amber-300',
    textClass: 'text-rose-300',
    dotHex: '#fb7185',
    buildAdviceVi: 'Tích chí mạng nhanh bằng Tốc Bắn cao để kích hoạt Thức Tỉnh Vũ Khí nhiều lần mỗi trận.',
  },
  orbit_orbs: {
    key: 'orbit_orbs',
    labelVi: 'Tinh Cầu Xoay & Lưỡi Cưa',
    barClass: 'from-cyan-500 to-teal-300',
    textClass: 'text-cyan-300',
    dotHex: '#22d3ee',
    buildAdviceVi: 'Hiệu quả khi đánh áp sát vòng ngoài Boss và quét đàn quái cận chiến.',
  },
  flying_swords: {
    key: 'flying_swords',
    labelVi: 'Phi Kiếm Tinh Linh',
    barClass: 'from-indigo-400 to-sky-300',
    textClass: 'text-indigo-300',
    dotHex: '#818cf8',
    buildAdviceVi: 'Kết hợp Phi Kiếm với Mắt Tầm Nhiệt để duy trì sát thương liên tục khi phải chạy né đòn.',
  },
  meteor_shower: {
    key: 'meteor_shower',
    labelVi: 'Mưa Thiên Thạch',
    barClass: 'from-red-500 to-orange-300',
    textClass: 'text-orange-300',
    dotHex: '#ef4444',
    buildAdviceVi: 'Ghép Mưa Thiên Thạch cùng Mũi Tên Lửa để kích hoạt cộng hưởng Địa Ngục Diện Rộng.',
  },
  elemental_procs: {
    key: 'elemental_procs',
    labelVi: 'Sét Lan, Bỏng & Độc Nguyên Tố',
    barClass: 'from-yellow-400 to-emerald-300',
    textClass: 'text-yellow-300',
    dotHex: '#facc15',
    buildAdviceVi: 'Lấy thêm 1 nguyên tố bổ trợ để chuyển sát thương đơn hệ sang Phản Ứng Nguyên Tố.',
  },
  elemental_reaction: {
    key: 'elemental_reaction',
    labelVi: 'Bùng Nổ Phản Ứng Nguyên Tố',
    barClass: 'from-teal-400 to-sky-300',
    textClass: 'text-teal-300',
    dotHex: '#2dd4bf',
    buildAdviceVi: 'Lối build Phản Ứng đang phát huy rất mạnh — duy trì xen kẽ Lửa/Băng/Sét để phá phòng cực nhanh.',
  },
  pet_companion: {
    key: 'pet_companion',
    labelVi: 'Tinh Linh Đồng Hành 3D',
    barClass: 'from-emerald-500 to-lime-300',
    textClass: 'text-emerald-300',
    dotHex: '#34d399',
    buildAdviceVi: 'Nâng cấp Tinh Linh bằng Tinh Chất để tăng mạnh sát thương phụ trợ ổn định trong lúc né đòn.',
  },
  arena_mechanism: {
    key: 'arena_mechanism',
    labelVi: 'Cơ Quan Đấu Trường Hoàng Đạo',
    barClass: 'from-amber-500 to-orange-400',
    textClass: 'text-amber-300',
    dotHex: '#f59e0b',
    buildAdviceVi: 'Tiếp tục tận dụng Cơ Quan sàn đấu đúng nhịp hồi chiêu để gây sát thương chuẩn diện rộng.',
  },
};

export interface PerSkillDamageRow {
  key: CombatDamageSkillKey;
  labelVi: string;
  damage: number;
  pct: number;
  barClass: string;
  textClass: string;
  dotHex: string;
}

export interface PerSkillDamageReport {
  rows: PerSkillDamageRow[];
  totalAttributed: number;
  mvpSkill: PerSkillDamageRow | null;
  buildAdviceVi: string;
}

export function buildPerSkillDamageReport(
  breakdown?: DamageBreakdown
): PerSkillDamageReport {
  if (!breakdown) {
    return { rows: [], totalAttributed: 0, mvpSkill: null, buildAdviceVi: '' };
  }

  const rawMap = breakdown.skillDamageMap;
  const entries: Array<[CombatDamageSkillKey, number]> = [];

  if (rawMap && typeof rawMap === 'object') {
    for (const key of Object.keys(COMBAT_SKILL_DAMAGE_META) as CombatDamageSkillKey[]) {
      const val = Math.round(Number(rawMap[key] ?? 0));
      if (Number.isFinite(val) && val > 0) {
        entries.push([key, val]);
      }
    }
  }

  // Graceful fallback for legacy snapshots without granular skillDamageMap
  if (entries.length === 0) {
    if (breakdown.basic > 0) entries.push(['basic_volley', Math.round(breakdown.basic)]);
    if (breakdown.ultimate > 0) entries.push(['hero_ultimate', Math.round(breakdown.ultimate)]);
    if (breakdown.elemental > 0) entries.push(['elemental_procs', Math.round(breakdown.elemental)]);
    if (breakdown.pet > 0) entries.push(['pet_companion', Math.round(breakdown.pet)]);
  }

  if (entries.length === 0) {
    return { rows: [], totalAttributed: 0, mvpSkill: null, buildAdviceVi: '' };
  }

  entries.sort((a, b) => b[1] - a[1]);
  const totalAttributed = entries.reduce((sum, [, v]) => sum + v, 0);

  const rows: PerSkillDamageRow[] = entries.map(([key, damage]) => {
    const meta = COMBAT_SKILL_DAMAGE_META[key];
    return {
      key,
      labelVi: meta.labelVi,
      damage,
      pct: Math.max(1, Math.round((damage / Math.max(1, totalAttributed)) * 100)),
      barClass: meta.barClass,
      textClass: meta.textClass,
      dotHex: meta.dotHex,
    };
  });

  const mvpSkill = rows[0] ?? null;
  const buildAdviceVi = mvpSkill ? COMBAT_SKILL_DAMAGE_META[mvpSkill.key].buildAdviceVi : '';

  return {
    rows,
    totalAttributed,
    mvpSkill,
    buildAdviceVi,
  };
}

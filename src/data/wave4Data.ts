import {
  BuildPreset,
  DestinyWheelPrize,
  DestinyWheelState,
  GearInstance,
  GearSlot,
  GearSubstat,
  GuildState,
  GuildTechId,
  Rarity,
  SaveData,
  SeasonMedalDefinition,
  SubstatKind,
} from '../types/game';
import { getTodayKey } from './questsData';

// =========================================================
// 1. GEAR SUBSTAT REFORGE & MYTHIC AWAKENING
// =========================================================

export interface SubstatDef {
  kind: SubstatKind;
  label: string;
  minPct: number;
  maxPct: number;
  format: (v: number) => string;
}

export const SUBSTAT_DEFS: Record<SubstatKind, SubstatDef> = {
  atk_pct: {
    kind: 'atk_pct',
    label: 'Tấn Công',
    minPct: 0.04,
    maxPct: 0.14,
    format: (v) => `+${Math.round(v * 100)}% ATK`,
  },
  hp_pct: {
    kind: 'hp_pct',
    label: 'Sinh Lực',
    minPct: 0.05,
    maxPct: 0.16,
    format: (v) => `+${Math.round(v * 100)}% HP`,
  },
  crit_pct: {
    kind: 'crit_pct',
    label: 'Chí Mạng',
    minPct: 0.02,
    maxPct: 0.07,
    format: (v) => `+${Math.round(v * 100)}% Crit`,
  },
  crit_dmg_pct: {
    kind: 'crit_dmg_pct',
    label: 'ST Chí Mạng',
    minPct: 0.08,
    maxPct: 0.25,
    format: (v) => `+${Math.round(v * 100)}% ST Crit`,
  },
  aspd_pct: {
    kind: 'aspd_pct',
    label: 'Tốc Đánh',
    minPct: 0.04,
    maxPct: 0.14,
    format: (v) => `+${Math.round(v * 100)}% Tốc Đánh`,
  },
  move_pct: {
    kind: 'move_pct',
    label: 'Tốc Chạy',
    minPct: 0.03,
    maxPct: 0.1,
    format: (v) => `+${Math.round(v * 100)}% Tốc Chạy`,
  },
  dr_pct: {
    kind: 'dr_pct',
    label: 'Giảm Thương',
    minPct: 0.02,
    maxPct: 0.06,
    format: (v) => `+${Math.round(v * 100)}% Giáp`,
  },
  boss_dmg_pct: {
    kind: 'boss_dmg_pct',
    label: 'Khắc Tinh Boss',
    minPct: 0.06,
    maxPct: 0.18,
    format: (v) => `+${Math.round(v * 100)}% ST Boss`,
  },
};

export const ALL_SUBSTAT_KINDS = Object.keys(SUBSTAT_DEFS) as SubstatKind[];

export function getMaxSubstatsForRarity(rarity: Rarity): number {
  switch (rarity) {
    case Rarity.COMMON:
      return 0;
    case Rarity.RARE:
      return 1;
    case Rarity.EPIC:
      return 2;
    case Rarity.LEGENDARY:
    case Rarity.MYTHIC:
      return 3;
  }
}

export function getSubstatTierColor(tier: GearSubstat['tier']): string {
  switch (tier) {
    case 'gold':
      return 'text-amber-300';
    case 'epic':
      return 'text-purple-300';
    case 'rare':
      return 'text-sky-300';
    default:
      return 'text-slate-300';
  }
}

function rollSingleSubstat(rarity: Rarity, excludeKinds: Set<SubstatKind>): GearSubstat {
  const pool = ALL_SUBSTAT_KINDS.filter((k) => !excludeKinds.has(k));
  const kind = (pool.length > 0 ? pool : ALL_SUBSTAT_KINDS)[
    Math.floor(Math.random() * Math.max(1, pool.length))
  ];
  const def = SUBSTAT_DEFS[kind];
  const rarityFloor =
    rarity === Rarity.MYTHIC
      ? 0.45
      : rarity === Rarity.LEGENDARY
      ? 0.3
      : rarity === Rarity.EPIC
      ? 0.15
      : 0;
  const roll = Math.min(1, rarityFloor + Math.random() * (1 - rarityFloor));
  const rawValue = def.minPct + (def.maxPct - def.minPct) * roll;
  const value = Math.round(rawValue * 100) / 100;
  const tier: GearSubstat['tier'] =
    roll >= 0.8 ? 'gold' : roll >= 0.55 ? 'epic' : roll >= 0.25 ? 'rare' : 'common';
  return {
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    kind,
    value,
    tier,
  };
}

export function getEffectiveSubstats(item: GearInstance): GearSubstat[] {
  const maxLines = getMaxSubstatsForRarity(item.rarity);
  if (maxLines === 0) return [];
  if (Array.isArray(item.substats) && item.substats.length >= maxLines) {
    return item.substats.slice(0, maxLines);
  }
  return item.substats ?? [];
}

export function reforgeItemSubstats(
  item: GearInstance,
  lockedIds: string[]
): GearSubstat[] {
  const maxLines = getMaxSubstatsForRarity(item.rarity);
  if (maxLines === 0) return [];
  const existing = item.substats ?? [];
  const lockedSet = new Set(lockedIds);
  const kept = existing.filter((s) => lockedSet.has(s.id)).slice(0, Math.max(0, maxLines - 1));
  const usedKinds = new Set<SubstatKind>(kept.map((k) => k.kind));
  const next: GearSubstat[] = [...kept];
  while (next.length < maxLines) {
    const rolled = rollSingleSubstat(item.rarity, usedKinds);
    usedKinds.add(rolled.kind);
    next.push(rolled);
  }
  return next;
}

export function getReforgeCost(
  item: GearInstance,
  lockCount: number
): { starDust: number; gold: number } {
  const baseDust =
    item.rarity === Rarity.MYTHIC
      ? 48
      : item.rarity === Rarity.LEGENDARY
      ? 34
      : item.rarity === Rarity.EPIC
      ? 22
      : 12;
  const baseGold =
    item.rarity === Rarity.MYTHIC
      ? 140
      : item.rarity === Rarity.LEGENDARY
      ? 95
      : item.rarity === Rarity.EPIC
      ? 60
      : 35;
  return {
    starDust: baseDust + lockCount * 22,
    gold: baseGold + lockCount * 40,
  };
}

export function getAwakenCost(item: GearInstance): {
  starDust: number;
  gold: number;
  guildCoins: number;
  maxStars: number;
} {
  const cur = item.awakeningLevel ?? 0;
  const maxStars =
    item.rarity === Rarity.MYTHIC || item.rarity === Rarity.LEGENDARY
      ? 3
      : item.rarity === Rarity.EPIC
      ? 2
      : 0;
  return {
    starDust: 75 + cur * 65,
    gold: 180 + cur * 150,
    guildCoins: cur >= 1 ? 30 + cur * 25 : 0,
    maxStars,
  };
}

export function getAwakeningMultiplier(awakeningLevel = 0): number {
  return 1 + Math.max(0, Math.min(3, awakeningLevel)) * 0.18;
}

// =========================================================
// 2. QUICK BUILD PRESETS (3 LOADOUT SLOTS)
// =========================================================

export function normalizeBuildPresets(save: SaveData): BuildPreset[] {
  const defaults: BuildPreset[] = [
    {
      id: 'preset_1',
      name: 'Bộ 1 · Vượt Ải',
      heroId: save.selectedHeroId,
      equipped: { ...save.equipped },
      equippedRunes: [...save.equippedRunes],
      equippedPetId: save.equippedPetId ?? null,
      skinId: save.equippedSkinByHero?.[save.selectedHeroId] ?? 'default',
      auraId: save.equippedAuraId ?? 'zodiac_gold',
    },
    {
      id: 'preset_2',
      name: 'Bộ 2 · Săn Boss',
      heroId: save.selectedHeroId,
      equipped: { ...save.equipped },
      equippedRunes: [...save.equippedRunes],
      equippedPetId: save.equippedPetId ?? null,
      skinId: save.equippedSkinByHero?.[save.selectedHeroId] ?? 'default',
      auraId: save.equippedAuraId ?? 'zodiac_gold',
    },
    {
      id: 'preset_3',
      name: 'Bộ 3 · Tháp Vô Tận',
      heroId: save.selectedHeroId,
      equipped: { ...save.equipped },
      equippedRunes: [...save.equippedRunes],
      equippedPetId: save.equippedPetId ?? null,
      skinId: save.equippedSkinByHero?.[save.selectedHeroId] ?? 'default',
      auraId: save.equippedAuraId ?? 'zodiac_gold',
    },
  ];
  if (!Array.isArray(save.buildPresets) || save.buildPresets.length === 0) {
    return defaults;
  }
  return defaults.map((def, idx) => {
    const existing = save.buildPresets?.[idx];
    if (!existing) return def;
    return {
      ...def,
      ...existing,
      equipped: existing.equipped ?? def.equipped,
      equippedRunes: Array.isArray(existing.equippedRunes) ? existing.equippedRunes : def.equippedRunes,
    };
  });
}

// =========================================================
// 3. ZODIAC GUILD & GUILD BOSS RAID
// =========================================================

export const MAX_DAILY_GUILD_TRIBUTES = 3;
export const MAX_DAILY_GUILD_BOSS_RUNS = 2;
export const GUILD_BOSS_DURATION_SEC = 60;

export interface GuildTechDef {
  id: GuildTechId;
  name: string;
  desc: string;
  maxLevel: number;
  perLevelLabel: string;
  baseCoinCost: number;
  stepCoinCost: number;
  baseGoldCost: number;
  stepGoldCost: number;
}

export const GUILD_TECH_DEFS: GuildTechDef[] = [
  {
    id: 'forge_might',
    name: 'Thiên Công Chiến Ý',
    desc: 'Cường hóa sát thương cơ bản và kỹ năng toàn đội hình.',
    maxLevel: 15,
    perLevelLabel: '+3% ATK mỗi cấp',
    baseCoinCost: 25,
    stepCoinCost: 15,
    baseGoldCost: 90,
    stepGoldCost: 55,
  },
  {
    id: 'bastion_ward',
    name: 'Thánh Thuẫn Hoàng Đạo',
    desc: 'Gia tăng Sinh Lực tối đa khi bước vào mọi đấu trường.',
    maxLevel: 15,
    perLevelLabel: '+3.5% HP mỗi cấp',
    baseCoinCost: 25,
    stepCoinCost: 15,
    baseGoldCost: 90,
    stepGoldCost: 55,
  },
  {
    id: 'star_sight',
    name: 'Tinh Nhãn Bạo Kích',
    desc: 'Tăng tỷ lệ Chí Mạng vĩnh viễn cho mọi Anh Hùng.',
    maxLevel: 12,
    perLevelLabel: '+1.2% Crit mỗi cấp',
    baseCoinCost: 30,
    stepCoinCost: 18,
    baseGoldCost: 110,
    stepGoldCost: 65,
  },
  {
    id: 'fortune_vault',
    name: 'Kho Báu Tinh Vân',
    desc: 'Tăng tỷ lệ thu nhập Vàng từ quái vật và rương.',
    maxLevel: 12,
    perLevelLabel: '+4% Vàng mỗi cấp',
    baseCoinCost: 22,
    stepCoinCost: 14,
    baseGoldCost: 85,
    stepGoldCost: 50,
  },
];

export const GUILD_BOSS_DAMAGE_TIERS = [
  { id: 'gb_d', rank: 'D', minDamage: 2500, guildCoins: 35, starDust: 25, gems: 4, label: 'Khởi Đầu' },
  { id: 'gb_c', rank: 'C', minDamage: 6500, guildCoins: 55, starDust: 40, gems: 8, label: 'Tinh Anh' },
  { id: 'gb_b', rank: 'B', minDamage: 14000, guildCoins: 85, starDust: 65, gems: 14, label: 'Chiến Tướng' },
  { id: 'gb_a', rank: 'A', minDamage: 26000, guildCoins: 120, starDust: 95, gems: 22, label: 'Hộ Vệ Sao' },
  { id: 'gb_s', rank: 'S', minDamage: 45000, guildCoins: 175, starDust: 140, gems: 35, label: 'Thần Thoại' },
  { id: 'gb_ss', rank: 'SS', minDamage: 75000, guildCoins: 240, starDust: 200, gems: 55, label: 'Chí Tôn' },
];

export function getGuildBossRankTier(damage: number) {
  let matched = GUILD_BOSS_DAMAGE_TIERS[0];
  for (const tier of GUILD_BOSS_DAMAGE_TIERS) {
    if (damage >= tier.minDamage) matched = tier;
  }
  return matched;
}

export const GUILD_RIVAL_MEMBERS = [
  { name: 'Nguyệt Ảnh Linh Cơ', role: 'Hội Trưởng', contribution: 4820, bossDmg: 68400 },
  { name: 'Thiên Lang Vô Song', role: 'Phó Hội', contribution: 3940, bossDmg: 54100 },
  { name: 'Lôi Đế Bất Bại', role: 'Tinh Anh', contribution: 2810, bossDmg: 37200 },
  { name: 'Băng Hậu Tinh Vân', role: 'Thành Viên', contribution: 1960, bossDmg: 22900 },
];

export function normalizeGuild(g?: Partial<GuildState>): GuildState {
  const today = getTodayKey();
  const tributeReset = !g || g.lastTributeDate !== today;
  const bossReset = !g || g.bossRunsDate !== today;
  return {
    name: g?.name ?? 'Tinh Vân Hoàng Đạo',
    emblem: g?.emblem ?? '🦁',
    level: g?.level ?? 3,
    exp: g?.exp ?? 240,
    guildCoins: g?.guildCoins ?? 85,
    lastTributeDate: today,
    tributeCountToday: tributeReset ? 0 : g?.tributeCountToday ?? 0,
    techLevels: {
      forge_might: g?.techLevels?.forge_might ?? 1,
      bastion_ward: g?.techLevels?.bastion_ward ?? 1,
      star_sight: g?.techLevels?.star_sight ?? 0,
      fortune_vault: g?.techLevels?.fortune_vault ?? 0,
    },
    bossRunsDate: today,
    bossRunsRemaining: bossReset
      ? MAX_DAILY_GUILD_BOSS_RUNS
      : Math.max(0, Math.min(MAX_DAILY_GUILD_BOSS_RUNS, g?.bossRunsRemaining ?? MAX_DAILY_GUILD_BOSS_RUNS)),
    bestGuildBossDamage: g?.bestGuildBossDamage ?? 0,
    totalGuildBossDamage: g?.totalGuildBossDamage ?? 0,
    claimedDamageTiers: Array.isArray(g?.claimedDamageTiers) ? g.claimedDamageTiers : [],
  };
}

export function getGuildLevelExpReq(level: number): number {
  return 250 + level * 160;
}

export function computeGuildTechBonuses(guild?: Partial<GuildState>) {
  const g = normalizeGuild(guild);
  return {
    atkPct: g.techLevels.forge_might * 0.03,
    hpPct: g.techLevels.bastion_ward * 0.035,
    critBonus: g.techLevels.star_sight * 0.012,
    goldPct: g.techLevels.fortune_vault * 0.04,
  };
}

// =========================================================
// 4. DESTINY WHEEL & LIMITED-TIME EVENT
// =========================================================

export const DESTINY_EVENT_ID = 'zodiac_eclipse_wheel_s1';
export const DESTINY_SPIN_GEM_COST = 20;
export const DESTINY_SPIN5_GEM_COST = 90;

export const DESTINY_WHEEL_PRIZES: DestinyWheelPrize[] = [
  { id: 'dw_gold_300', label: '320 Vàng', badge: 'VÀNG', kind: 'gold', amount: 320, color: '#eab308', weight: 22 },
  { id: 'dw_dust_60', label: '65 Bụi Tinh Tú', badge: 'BỤI SAO', kind: 'star_dust', amount: 65, color: '#38bdf8', weight: 20 },
  { id: 'dw_essence_25', label: '28 Tinh Chất', badge: 'TINH LINH', kind: 'pet_essence', amount: 28, color: '#34d399', weight: 18 },
  { id: 'dw_gems_35', label: '35 Ngọc Hồn', badge: 'NGỌC', kind: 'gems', amount: 35, color: '#c084fc', weight: 14 },
  { id: 'dw_dust_140', label: '140 Bụi Tinh Tú', badge: 'HIẾM', kind: 'star_dust', amount: 140, color: '#0ea5e9', weight: 10 },
  { id: 'dw_epic_gear', label: 'Trang Bị Sử Thi', badge: 'SỬ THI', kind: 'gear_epic', amount: 1, color: '#a855f7', weight: 9 },
  { id: 'dw_gems_80', label: '85 Ngọc Hồn', badge: 'ĐẠI THƯỞNG', kind: 'gems', amount: 85, color: '#f59e0b', weight: 5 },
  { id: 'dw_stier', label: 'Thánh Vật [S]', badge: 'CỰC HIẾM', kind: 'gear_s', amount: 1, color: '#f43f5e', weight: 2 },
];

export const DESTINY_MILESTONES = [
  { spins: 5, label: 'Mốc 5 Lượt', rewardLabel: '90 Bụi Sao + 20 Ngọc', starDust: 90, gems: 20, gold: 300, gearS: false },
  { spins: 15, label: 'Mốc 15 Lượt', rewardLabel: '160 Bụi Sao + 40 Tinh Chất', starDust: 160, gems: 25, gold: 500, gearS: false },
  { spins: 30, label: 'Mốc 30 Lượt', rewardLabel: 'Trang Bị [S] Sử Thi + 45 Ngọc', starDust: 120, gems: 45, gold: 600, gearS: true },
  { spins: 50, label: 'Mốc 50 Lượt', rewardLabel: 'Thánh Vật [S] Huyền Thoại', starDust: 240, gems: 80, gold: 1000, gearS: true },
];

export function normalizeDestinyWheel(d?: Partial<DestinyWheelState>): DestinyWheelState {
  const today = getTodayKey();
  const isSameEvent = d?.eventId === DESTINY_EVENT_ID;
  const freeReset = !isSameEvent || d?.freeSpinsDate !== today;
  return {
    eventId: DESTINY_EVENT_ID,
    freeSpinsDate: today,
    freeSpinsRemaining: freeReset ? 1 : Math.max(0, d?.freeSpinsRemaining ?? 0),
    tickets: isSameEvent ? d?.tickets ?? 1 : 1,
    totalSpins: isSameEvent ? d?.totalSpins ?? 0 : 0,
    claimedMilestones: isSameEvent && Array.isArray(d?.claimedMilestones) ? d.claimedMilestones : [],
    history: isSameEvent && Array.isArray(d?.history) ? d.history.slice(0, 8) : [],
  };
}

export function rollDestinyPrize(): { prize: DestinyWheelPrize; index: number } {
  const totalW = DESTINY_WHEEL_PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * totalW;
  for (let i = 0; i < DESTINY_WHEEL_PRIZES.length; i++) {
    r -= DESTINY_WHEEL_PRIZES[i].weight;
    if (r <= 0) {
      return { prize: DESTINY_WHEEL_PRIZES[i], index: i };
    }
  }
  return { prize: DESTINY_WHEEL_PRIZES[0], index: 0 };
}

// =========================================================
// 5. SEASON HONOR MEDALS
// =========================================================

export const SEASON_MEDALS: SeasonMedalDefinition[] = [
  {
    id: 'medal_vanguard',
    title: 'Huy Chương Tiên Phong',
    tierLabel: 'ĐỒNG TINH',
    desc: 'Đạt tối thiểu 1.200 Lực Chiến (LC) tổng hợp để khẳng định bản lĩnh.',
    metric: 'powerRating',
    target: 1200,
    rewardGold: 320,
    rewardGems: 18,
    rewardStarDust: 60,
    atkBonus: 10,
    hpBonus: 55,
    accentColor: '#34d399',
  },
  {
    id: 'medal_guild_guardian',
    title: 'Huy Chương Hộ Vệ Bang',
    tierLabel: 'BẠCH NGÂN',
    desc: 'Gây ít nhất 6.500 sát thương trong 1 trận Boss Bang Hội.',
    metric: 'guildBossDamage',
    target: 6500,
    rewardGold: 450,
    rewardGems: 25,
    rewardStarDust: 85,
    atkBonus: 14,
    hpBonus: 80,
    accentColor: '#38bdf8',
  },
  {
    id: 'medal_tower_ascendant',
    title: 'Huy Chương Tháp Vô Tận',
    tierLabel: 'HOÀNG KIM',
    desc: 'Chinh phục Tầng 6 trở lên tại Tháp Vô Tận Hoàng Đạo.',
    metric: 'bestTowerFloor',
    target: 6,
    rewardGold: 520,
    rewardGems: 32,
    rewardStarDust: 100,
    atkBonus: 18,
    hpBonus: 95,
    accentColor: '#fbbf24',
  },
  {
    id: 'medal_awakened_smith',
    title: 'Huy Chương Thức Tỉnh Sư',
    tierLabel: 'TINH VƯƠNG',
    desc: 'Sở hữu ít nhất 1 trang bị đã Thức Tỉnh ★1 trở lên.',
    metric: 'awakenedCount',
    target: 1,
    rewardGold: 600,
    rewardGems: 38,
    rewardStarDust: 120,
    atkBonus: 20,
    hpBonus: 110,
    accentColor: '#c084fc',
  },
  {
    id: 'medal_destiny_chosen',
    title: 'Huy Chương Thiên Mệnh',
    tierLabel: 'NHẬT THỰC',
    desc: 'Thực hiện tổng cộng 5 lượt quay tại Vòng Quay Vận Mệnh.',
    metric: 'destinySpins',
    target: 5,
    rewardGold: 680,
    rewardGems: 45,
    rewardStarDust: 140,
    atkBonus: 22,
    hpBonus: 120,
    accentColor: '#f472b6',
  },
  {
    id: 'medal_supreme_zodiac',
    title: 'Ấn Ký Hoàng Đạo Chí Tôn',
    tierLabel: 'CHÍ TÔN MÙA 1',
    desc: 'Đạt tối thiểu 4.500 Điểm Vinh Danh Mùa 1.',
    metric: 'seasonScore',
    target: 4500,
    rewardGold: 1200,
    rewardGems: 75,
    rewardStarDust: 220,
    atkBonus: 34,
    hpBonus: 180,
    accentColor: '#f43f5e',
  },
];

export function getSeasonMedalCurrentValue(
  save: SaveData,
  powerRating: number,
  seasonScore: number,
  metric: SeasonMedalDefinition['metric']
): number {
  switch (metric) {
    case 'powerRating':
      return powerRating;
    case 'seasonScore':
      return seasonScore;
    case 'guildBossDamage':
      return save.guild?.bestGuildBossDamage ?? 0;
    case 'bestTowerFloor':
      return save.bestTowerFloor ?? 0;
    case 'awakenedCount':
      return save.inventory.filter((g) => (g.awakeningLevel ?? 0) >= 1).length;
    case 'destinySpins':
      return save.destinyWheel?.totalSpins ?? 0;
  }
}

export function countClaimableSeasonMedals(
  save: SaveData,
  powerRating: number,
  seasonScore: number
): number {
  const claimed = new Set(save.seasonMedalsClaimed ?? []);
  return SEASON_MEDALS.filter(
    (m) =>
      !claimed.has(m.id) &&
      getSeasonMedalCurrentValue(save, powerRating, seasonScore, m.metric) >= m.target
  ).length;
}

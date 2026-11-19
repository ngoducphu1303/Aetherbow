import {
  AltarBlessingDef,
  AltarBlessingId,
  BlessingAltarState,
  ClaimAllPreview,
  ClaimAllSourceItem,
  CombatPowerAnalysis,
  CombatPowerCategoryItem,
  CrystalVaultMilestone,
  CrystalVaultState,
  GoldenStatTier,
  LobbyHeroPoseId,
  MythicGoldenStatKind,
  MythicGoldenStatSlot,
  MythicWeaponState,
  SaveData,
  SupremeMonthlyPassState,
  TreasureWheelSlotDef,
  TreasureWheelState,
  WarBannerDef,
  WarBannerId,
} from '../types/game';
import { getTodayKey } from './questsData';
import {
  canClaimWeekendPassDaily,
  computeCodexSummary,
  countClaimableChampionshipMilestones,
  countClaimableCodexRanks,
  countClaimableFestivalRewards,
} from './wave11Data';
import { countClaimableVaultRewards, hasFreeChainStepReady } from './wave10Data';
import { isMonthlyCardActive, normalizeMonthlyPrivilege } from './wave7Data';
import {
  computeSoulRingBonuses,
  countClaimableCarnivalRewards,
  countClaimableDragonLairMilestones,
  countClaimableStarlightMilestones,
} from './wave13Data';
import {
  computeGuildSanctuaryBonuses,
  computeZodiacRelicBonuses,
  countClaimableAstralBoardRewards,
  countClaimableGuildSanctuaryRewards,
  countClaimableSkyCitadelMilestones,
} from './wave14Data';

// ============================================================================
// 1. MYTHIC WEAPON TRANSCENDENCE 3D & GOLDEN STAT REFORGE (THẦN BINH 3D)
// ============================================================================

export const MYTHIC_WEAPON_MAX_TIER = 5;

export interface MythicWeaponTierDef {
  tier: number;
  title: string;
  auraLabel: string;
  atkPctBonus: number;
  critDmgBonus: number;
  bossDmgBonus: number;
  shardCost: number;
  goldCost: number;
  glowHex: number;
}

export const MYTHIC_WEAPON_TIERS: MythicWeaponTierDef[] = [
  {
    tier: 0,
    title: 'Vũ Khí Nguyên Bản',
    auraLabel: 'Chưa Thức Tỉnh Thần Binh',
    atkPctBonus: 0,
    critDmgBonus: 0,
    bossDmgBonus: 0,
    shardCost: 0,
    goldCost: 0,
    glowHex: 0x94a3b8,
  },
  {
    tier: 1,
    title: 'Thần Binh Bậc I · Tinh Quang',
    auraLabel: 'Vệt Sáng Vàng Tinh Tú',
    atkPctBonus: 0.08,
    critDmgBonus: 0.12,
    bossDmgBonus: 0.06,
    shardCost: 8,
    goldCost: 450,
    glowHex: 0x38bdf8,
  },
  {
    tier: 2,
    title: 'Thần Binh Bậc II · Hoàng Đạo',
    auraLabel: 'Hào Quang Kiếm Khí Vàng',
    atkPctBonus: 0.16,
    critDmgBonus: 0.24,
    bossDmgBonus: 0.12,
    shardCost: 14,
    goldCost: 850,
    glowHex: 0xfbbf24,
  },
  {
    tier: 3,
    title: 'Thần Binh Bậc III · Nhật Thực',
    auraLabel: 'Vòng Năng Lượng Tử Kim',
    atkPctBonus: 0.26,
    critDmgBonus: 0.38,
    bossDmgBonus: 0.2,
    shardCost: 22,
    goldCost: 1400,
    glowHex: 0xc084fc,
  },
  {
    tier: 4,
    title: 'Thần Binh Bậc IV · Phượng Hỏa',
    auraLabel: 'Hỏa Diệm Thần Binh 3D',
    atkPctBonus: 0.38,
    critDmgBonus: 0.54,
    bossDmgBonus: 0.3,
    shardCost: 32,
    goldCost: 2200,
    glowHex: 0xf97316,
  },
  {
    tier: 5,
    title: 'Thần Binh Bậc V · Chí Tôn Vĩnh Hằng',
    auraLabel: 'Thiên Uy Hoàng Kim Chí Tôn',
    atkPctBonus: 0.52,
    critDmgBonus: 0.75,
    bossDmgBonus: 0.42,
    shardCost: 45,
    goldCost: 3400,
    glowHex: 0xfde047,
  },
];

export interface GoldenStatMeta {
  kind: MythicGoldenStatKind;
  label: string;
  minVal: number;
  maxVal: number;
}

export const GOLDEN_STAT_POOL: GoldenStatMeta[] = [
  { kind: 'atk_pct', label: 'Công Kích Thần Binh', minVal: 0.04, maxVal: 0.18 },
  { kind: 'crit_pct', label: 'Tỷ Lệ Chí Mạng', minVal: 0.02, maxVal: 0.09 },
  { kind: 'crit_dmg', label: 'Sát Thương Bạo Kích', minVal: 0.08, maxVal: 0.34 },
  { kind: 'boss_dmg', label: 'Sát Thương Phá Boss', minVal: 0.06, maxVal: 0.26 },
  { kind: 'aspd_pct', label: 'Tốc Độ Xuất Chiêu', minVal: 0.03, maxVal: 0.14 },
  { kind: 'lifesteal_pct', label: 'Hút Máu Chiến Đấu', minVal: 0.015, maxVal: 0.055 },
];

export const GOLDEN_STAT_MAP: Record<MythicGoldenStatKind, GoldenStatMeta> =
  GOLDEN_STAT_POOL.reduce((acc, item) => {
    acc[item.kind] = item;
    return acc;
  }, {} as Record<MythicGoldenStatKind, GoldenStatMeta>);

export function formatGoldenStatValue(kind: MythicGoldenStatKind, value: number): string {
  const pct = (value * 100).toFixed(1).replace(/\.0$/, '');
  const meta = GOLDEN_STAT_MAP[kind];
  return `+${pct}% ${meta?.label ?? kind}`;
}

export function createDefaultGoldenStats(): MythicGoldenStatSlot[] {
  return [
    { slotIndex: 0, kind: 'atk_pct', value: 0.06, tier: 'rare', locked: false },
    { slotIndex: 1, kind: 'crit_pct', value: 0.03, tier: 'rare', locked: false },
    { slotIndex: 2, kind: 'boss_dmg', value: 0.09, tier: 'epic', locked: false },
  ];
}

export function normalizeMythicWeapon(m?: Partial<MythicWeaponState>): MythicWeaponState {
  const tier = Math.max(0, Math.min(MYTHIC_WEAPON_MAX_TIER, Math.floor(m?.tier ?? 0)));
  const stats =
    Array.isArray(m?.goldenStats) && m.goldenStats.length === 3
      ? m.goldenStats.map((s, idx) => ({
          slotIndex: idx,
          kind: GOLDEN_STAT_MAP[s.kind] ? s.kind : 'atk_pct',
          value: Math.max(0.01, Number(s.value) || 0.05),
          tier: (['rare', 'epic', 'legendary', 'mythic'].includes(s.tier) ? s.tier : 'rare') as GoldenStatTier,
          locked: Boolean(s.locked),
        }))
      : createDefaultGoldenStats();
  return {
    tier,
    goldenStats: stats,
    totalReforges: Math.max(0, Math.floor(m?.totalReforges ?? 0)),
  };
}

export function getReforgeCost(lockedCount: number): { reforgeStones: number; gold: number } {
  const locks = Math.max(0, Math.min(2, lockedCount));
  return {
    reforgeStones: 3 + locks * 3, // 3, 6, 9
    gold: 160 + locks * 140,
  };
}

export function rollGoldenStats(
  currentSlots: MythicGoldenStatSlot[],
  mythicTier: number,
  rng: () => number = Math.random
): { nextSlots: MythicGoldenStatSlot[]; hasMythicOrGold: boolean } {
  const tierLuckBonus = Math.min(0.18, mythicTier * 0.035);
  let hasMythicOrGold = false;
  const nextSlots = currentSlots.map((slot) => {
    if (slot.locked) return { ...slot };
    const meta = GOLDEN_STAT_POOL[Math.floor(rng() * GOLDEN_STAT_POOL.length)] ?? GOLDEN_STAT_POOL[0];
    const roll = Math.min(0.999, rng() + tierLuckBonus);
    let tier: GoldenStatTier = 'rare';
    let ratio = 0.25;
    if (roll >= 0.92) {
      tier = 'mythic';
      ratio = 0.88 + rng() * 0.12;
      hasMythicOrGold = true;
    } else if (roll >= 0.72) {
      tier = 'legendary';
      ratio = 0.64 + rng() * 0.24;
      hasMythicOrGold = true;
    } else if (roll >= 0.4) {
      tier = 'epic';
      ratio = 0.36 + rng() * 0.28;
    } else {
      tier = 'rare';
      ratio = 0.08 + rng() * 0.28;
    }
    const rawVal = meta.minVal + (meta.maxVal - meta.minVal) * Math.min(1, ratio);
    const roundedVal = Math.round(rawVal * 1000) / 1000;
    return {
      slotIndex: slot.slotIndex,
      kind: meta.kind,
      value: roundedVal,
      tier,
      locked: false,
    };
  });
  return { nextSlots, hasMythicOrGold };
}

export function getMythicWeaponBonuses(m?: Partial<MythicWeaponState>): {
  tier: number;
  atkPct: number;
  critBonus: number;
  critDmgBonus: number;
  bossDmgBonus: number;
  aspdBonus: number;
  lifeStealPct: number;
} {
  const st = normalizeMythicWeapon(m);
  const tierDef = MYTHIC_WEAPON_TIERS[st.tier] ?? MYTHIC_WEAPON_TIERS[0];
  let atkPct = tierDef.atkPctBonus;
  let critBonus = 0;
  let critDmgBonus = tierDef.critDmgBonus;
  let bossDmgBonus = tierDef.bossDmgBonus;
  let aspdBonus = 0;
  let lifeStealPct = 0;

  for (const s of st.goldenStats) {
    if (s.kind === 'atk_pct') atkPct += s.value;
    else if (s.kind === 'crit_pct') critBonus += s.value;
    else if (s.kind === 'crit_dmg') critDmgBonus += s.value;
    else if (s.kind === 'boss_dmg') bossDmgBonus += s.value;
    else if (s.kind === 'aspd_pct') aspdBonus += s.value;
    else if (s.kind === 'lifesteal_pct') lifeStealPct += s.value;
  }

  return { tier: st.tier, atkPct, critBonus, critDmgBonus, bossDmgBonus, aspdBonus, lifeStealPct };
}

// ============================================================================
// 2. ZODIAC TREASURE WHEEL (12 SLOTS + PITY 10) & SUPREME MONTHLY PASS
// ============================================================================

export const TREASURE_WHEEL_PITY_MAX = 10;
export const TREASURE_WHEEL_SPIN_COST_1 = 28;
export const TREASURE_WHEEL_SPIN_COST_5 = 120; // Discounted 5x spin

export const TREASURE_WHEEL_SLOTS: TreasureWheelSlotDef[] = [
  { index: 0, id: 'tw_jackpot', label: 'ĐẠI JACKPOT: 180 Ngọc + 12 Mảnh Thần Binh', shortLabel: 'JACKPOT 180💎', rarity: 'mythic', weight: 4, rewardKind: 'jackpot_mythic', amount: 180 },
  { index: 1, id: 'tw_gold_1', label: '650 Vàng Hoàng Đạo', shortLabel: '650 Vàng', rarity: 'rare', weight: 16, rewardKind: 'gold', amount: 650 },
  { index: 2, id: 'tw_reforge_1', label: '6 Đá Đúc Hoàng Kim', shortLabel: '6 Đá Đúc', rarity: 'epic', weight: 14, rewardKind: 'reforgeStones', amount: 6 },
  { index: 3, id: 'tw_gems_1', label: '42 Ngọc Hồn', shortLabel: '42 Ngọc', rarity: 'epic', weight: 12, rewardKind: 'gems', amount: 42 },
  { index: 4, id: 'tw_shards_1', label: '5 Mảnh Thần Binh', shortLabel: '5 Thần Binh', rarity: 'legendary', weight: 9, rewardKind: 'mythicShards', amount: 5 },
  { index: 5, id: 'tw_crests_1', label: '8 Huy Hiệu Chiến Trận', shortLabel: '8 Huy Hiệu', rarity: 'epic', weight: 12, rewardKind: 'warCrests', amount: 8 },
  { index: 6, id: 'tw_cores_1', label: '6 Lõi Thần Sủng', shortLabel: '6 Lõi Sủng', rarity: 'epic', weight: 11, rewardKind: 'spiritCores', amount: 6 },
  { index: 7, id: 'tw_tickets_1', label: '2 Vé Ước Nguyện', shortLabel: '2 Vé Ước', rarity: 'legendary', weight: 8, rewardKind: 'wishTickets', amount: 2 },
  { index: 8, id: 'tw_gold_2', label: '1.150 Vàng Hoàng Đạo', shortLabel: '1.150 Vàng', rarity: 'epic', weight: 12, rewardKind: 'gold', amount: 1150 },
  { index: 9, id: 'tw_reforge_2', label: '12 Đá Đúc Hoàng Kim', shortLabel: '12 Đá Đúc', rarity: 'legendary', weight: 7, rewardKind: 'reforgeStones', amount: 12 },
  { index: 10, id: 'tw_gems_2', label: '85 Ngọc Hồn', shortLabel: '85 Ngọc', rarity: 'legendary', weight: 6, rewardKind: 'gems', amount: 85 },
  { index: 11, id: 'tw_shards_2', label: '10 Mảnh Thần Binh', shortLabel: '10 Thần Binh', rarity: 'legendary', weight: 5, rewardKind: 'mythicShards', amount: 10 },
];

export const TREASURE_WHEEL_MILESTONES = [
  { spins: 5, title: 'Mốc 5 Lượt Quay', rewardReforgeStones: 10, rewardMythicShards: 6, rewardGems: 35 },
  { spins: 12, title: 'Mốc 12 Lượt Quay', rewardReforgeStones: 18, rewardMythicShards: 12, rewardGems: 65 },
  { spins: 25, title: 'Mốc 25 Lượt Chí Tôn', rewardReforgeStones: 30, rewardMythicShards: 22, rewardGems: 120 },
];

export function normalizeTreasureWheel(tw?: Partial<TreasureWheelState>): TreasureWheelState {
  return {
    pityCount: Math.max(0, Math.min(TREASURE_WHEEL_PITY_MAX - 1, Math.floor(tw?.pityCount ?? 0))),
    totalSpins: Math.max(0, Math.floor(tw?.totalSpins ?? 0)),
    lastRewardLabel: tw?.lastRewardLabel ?? '',
    claimedMilestoneSpins: Array.isArray(tw?.claimedMilestoneSpins) ? tw.claimedMilestoneSpins : [],
  };
}

export function spinTreasureWheelOnce(
  state: TreasureWheelState,
  rng: () => number = Math.random
): { slot: TreasureWheelSlotDef; nextState: TreasureWheelState; wasPity: boolean } {
  const isPityHit = state.pityCount + 1 >= TREASURE_WHEEL_PITY_MAX;
  let chosen: TreasureWheelSlotDef;
  if (isPityHit) {
    chosen = TREASURE_WHEEL_SLOTS[0]; // Mythic Jackpot
  } else {
    const totalWeight = TREASURE_WHEEL_SLOTS.reduce((s, x) => s + x.weight, 0);
    let r = rng() * totalWeight;
    chosen = TREASURE_WHEEL_SLOTS[TREASURE_WHEEL_SLOTS.length - 1];
    for (const slot of TREASURE_WHEEL_SLOTS) {
      r -= slot.weight;
      if (r <= 0) {
        chosen = slot;
        break;
      }
    }
  }
  const hitJackpot = chosen.rarity === 'mythic';
  return {
    slot: chosen,
    wasPity: isPityHit,
    nextState: {
      ...state,
      pityCount: hitJackpot ? 0 : Math.min(TREASURE_WHEEL_PITY_MAX - 1, state.pityCount + 1),
      totalSpins: state.totalSpins + 1,
      lastRewardLabel: chosen.label,
    },
  };
}

export const SUPREME_MONTHLY_CONFIG = {
  title: 'Thẻ Tháng Chí Tôn (30 Ngày)',
  badge: 'GIÁ TRỊ X12 · ĐẶC QUYỀN TỐI THƯỢNG',
  costGems: 138,
  originalGems: 480,
  instantGems: 150,
  instantMythicShards: 12,
  instantReforgeStones: 16,
  dailyGems: 55,
  dailyReforgeStones: 4,
  dailyWarCrests: 3,
  passiveAtkPct: 0.1,
  passiveGoldPct: 0.3,
  topUpPoints: 240,
};

export function normalizeSupremeMonthly(s?: Partial<SupremeMonthlyPassState>): SupremeMonthlyPassState {
  const days = Math.max(0, Math.min(90, Math.floor(s?.daysRemaining ?? 0)));
  return {
    active: Boolean(s?.active && days > 0),
    daysRemaining: days,
    lastClaimDate: s?.lastClaimDate ?? '',
    totalActivatedCount: Math.max(0, Math.floor(s?.totalActivatedCount ?? 0)),
  };
}

export function isSupremeMonthlyActive(s?: Partial<SupremeMonthlyPassState>): boolean {
  const n = normalizeSupremeMonthly(s);
  return n.active && n.daysRemaining > 0;
}

export function canClaimSupremeMonthlyDaily(save: SaveData): boolean {
  const n = normalizeSupremeMonthly(save.supremeMonthly);
  return n.active && n.daysRemaining > 0 && n.lastClaimDate !== getTodayKey();
}

// ============================================================================
// 3. ALTAR OF ZODIAC BLESSINGS & 3D WAR BANNERS (TẾ ĐÀN & CỜ HIỆU 3D)
// ============================================================================

export const ALTAR_BLESSING_DEFS: AltarBlessingDef[] = [
  {
    id: 'altar_fury',
    name: 'Tế Đàn Chiến Hồn',
    subtitle: 'Tăng % Công Kích toàn đội vĩnh viễn',
    maxLevel: 10,
    atkPctPerLv: 0.025,
    hpPctPerLv: 0,
    critPerLv: 0.004,
    bossDmgPerLv: 0,
    goldPctPerLv: 0,
    accentHex: 0xf97316,
  },
  {
    id: 'altar_aegis',
    name: 'Tế Đàn Thánh Thuẫn',
    subtitle: 'Tăng % Sinh Lực tối đa toàn đội',
    maxLevel: 10,
    atkPctPerLv: 0,
    hpPctPerLv: 0.03,
    critPerLv: 0,
    bossDmgPerLv: 0,
    goldPctPerLv: 0,
    accentHex: 0x38bdf8,
  },
  {
    id: 'altar_breaker',
    name: 'Tế Đàn Phá Giáp Boss',
    subtitle: 'Tăng Sát Thương Boss & tốc độ bào Giáp Phá',
    maxLevel: 10,
    atkPctPerLv: 0.01,
    hpPctPerLv: 0,
    critPerLv: 0,
    bossDmgPerLv: 0.035,
    goldPctPerLv: 0,
    accentHex: 0xf43f5e,
  },
  {
    id: 'altar_fortune',
    name: 'Tế Đàn Tài Lộc Tinh Giới',
    subtitle: 'Tăng % Vàng chiến lợi phẩm & Chí Mạng',
    maxLevel: 10,
    atkPctPerLv: 0,
    hpPctPerLv: 0.01,
    critPerLv: 0.005,
    bossDmgPerLv: 0,
    goldPctPerLv: 0.04,
    accentHex: 0xfbbf24,
  },
];

export function normalizeBlessingAltar(b?: Partial<BlessingAltarState>): BlessingAltarState {
  const raw = b?.levels ?? ({} as Partial<Record<AltarBlessingId, number>>);
  return {
    levels: {
      altar_fury: Math.max(0, Math.min(10, Math.floor(raw.altar_fury ?? 0))),
      altar_aegis: Math.max(0, Math.min(10, Math.floor(raw.altar_aegis ?? 0))),
      altar_breaker: Math.max(0, Math.min(10, Math.floor(raw.altar_breaker ?? 0))),
      altar_fortune: Math.max(0, Math.min(10, Math.floor(raw.altar_fortune ?? 0))),
    },
    totalSacrifices: Math.max(0, Math.floor(b?.totalSacrifices ?? 0)),
  };
}

export function getAltarUpgradeCost(currentLevel: number): { gold: number; warCrests: number } {
  const lv = Math.max(0, currentLevel);
  return {
    gold: 220 + lv * 165,
    warCrests: 3 + Math.floor(lv * 1.4),
  };
}

export function computeAltarBonuses(b?: Partial<BlessingAltarState>): {
  atkPct: number;
  hpPct: number;
  critBonus: number;
  bossDmgBonus: number;
  goldPct: number;
  totalLevel: number;
} {
  const st = normalizeBlessingAltar(b);
  let atkPct = 0;
  let hpPct = 0;
  let critBonus = 0;
  let bossDmgBonus = 0;
  let goldPct = 0;
  let totalLevel = 0;
  for (const def of ALTAR_BLESSING_DEFS) {
    const lv = st.levels[def.id] ?? 0;
    totalLevel += lv;
    atkPct += lv * def.atkPctPerLv;
    hpPct += lv * def.hpPctPerLv;
    critBonus += lv * def.critPerLv;
    bossDmgBonus += lv * def.bossDmgPerLv;
    goldPct += lv * def.goldPctPerLv;
  }
  return { atkPct, hpPct, critBonus, bossDmgBonus, goldPct, totalLevel };
}

export const WAR_BANNER_MAX_LEVEL = 5;

export const WAR_BANNER_DEFS: WarBannerDef[] = [
  {
    id: 'banner_solar',
    name: 'Cờ Hiệu Thái Dương Hoàng Đạo',
    badge: 'HOÀNG KIM · CÔNG KÍCH',
    desc: 'Ngọn cờ chiến trận bằng gấm đỏ viền vàng rực tung bay sau lưng, gia tăng mạnh Công Kích toàn đội.',
    clothHex: 0xb91c1c,
    trimHex: 0xfbbf24,
    emblemHex: 0xfde047,
    baseAtkPct: 0.06,
    baseHpPct: 0.04,
    baseBossDmg: 0.05,
    atkPctPerLv: 0.025,
    hpPctPerLv: 0.015,
    unlockGems: 0,
    unlockWarCrests: 10,
  },
  {
    id: 'banner_lunar',
    name: 'Cờ Hiệu Nguyệt Ảnh Tinh Vân',
    badge: 'TINH VÂN · BẠO KÍCH',
    desc: 'Lá cờ lam tím thêu trăng khuyết tỏa tinh quang, cường hóa khả năng sinh tồn và xuyên giáp Boss.',
    clothHex: 0x312e81,
    trimHex: 0x38bdf8,
    emblemHex: 0xe0f2fe,
    baseAtkPct: 0.05,
    baseHpPct: 0.07,
    baseBossDmg: 0.08,
    atkPctPerLv: 0.02,
    hpPctPerLv: 0.025,
    unlockGems: 65,
    unlockWarCrests: 14,
  },
  {
    id: 'banner_storm',
    name: 'Cờ Hiệu Lôi Đình Thần Uy',
    badge: 'SỬ THI · PHÁ GIÁP',
    desc: 'Biểu tượng tia sét hoàng đạo chói lòa, khuếch đại sát thương Phá Giáp Boss và tốc độ công phá.',
    clothHex: 0x0f172a,
    trimHex: 0x22d3ee,
    emblemHex: 0x67e8f9,
    baseAtkPct: 0.075,
    baseHpPct: 0.055,
    baseBossDmg: 0.12,
    atkPctPerLv: 0.028,
    hpPctPerLv: 0.02,
    unlockGems: 95,
    unlockWarCrests: 18,
  },
  {
    id: 'banner_phoenix',
    name: 'Cờ Hiệu Phượng Hoàng Chí Tôn',
    badge: 'THẦN THOẠI · TỐI THƯỢNG',
    desc: 'Chiến kỳ Chí Tôn rực lửa Phượng Hoàng, bộc phát chỉ số cao nhất trong mọi chiến trường 3D.',
    clothHex: 0x7c2d12,
    trimHex: 0xfde047,
    emblemHex: 0xfb923c,
    baseAtkPct: 0.1,
    baseHpPct: 0.09,
    baseBossDmg: 0.16,
    atkPctPerLv: 0.035,
    hpPctPerLv: 0.03,
    unlockGems: 135,
    unlockWarCrests: 24,
  },
];

export const WAR_BANNER_MAP: Record<WarBannerId, WarBannerDef> = WAR_BANNER_DEFS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<WarBannerId, WarBannerDef>
);

export function getWarBannerStats(
  bannerId: WarBannerId | null | undefined,
  level: number
): { atkPct: number; hpPct: number; bossDmg: number } {
  if (!bannerId || !WAR_BANNER_MAP[bannerId]) {
    return { atkPct: 0, hpPct: 0, bossDmg: 0 };
  }
  const def = WAR_BANNER_MAP[bannerId];
  const lv = Math.max(1, Math.min(WAR_BANNER_MAX_LEVEL, Math.floor(level || 1)));
  return {
    atkPct: def.baseAtkPct + (lv - 1) * def.atkPctPerLv,
    hpPct: def.baseHpPct + (lv - 1) * def.hpPctPerLv,
    bossDmg: def.baseBossDmg + (lv - 1) * 0.03,
  };
}

export function getWarBannerUpgradeCost(level: number): { gold: number; warCrests: number } {
  const lv = Math.max(1, level);
  return {
    gold: 420 + lv * 320,
    warCrests: 6 + lv * 4,
  };
}

// ============================================================================
// 4. 14TH PLAYABLE MODE: CRYSTAL VAULT 3D RAID (HẦM MỎ KHO BÁU 3D)
// ============================================================================

export const MAX_DAILY_CRYSTAL_VAULT_RUNS = 3;
export const CRYSTAL_VAULT_DURATION_SEC = 60;

export const CRYSTAL_VAULT_MILESTONES: CrystalVaultMilestone[] = [
  {
    pillarsTarget: 8,
    title: 'Thợ Săn Pha Lê Khởi Nguyên',
    rewardGems: 35,
    rewardReforgeStones: 8,
    rewardMythicShards: 6,
    rewardWarCrests: 6,
  },
  {
    pillarsTarget: 20,
    title: 'Kẻ Khai Phá Kho Báu Vàng',
    rewardGems: 55,
    rewardReforgeStones: 14,
    rewardMythicShards: 10,
    rewardWarCrests: 10,
  },
  {
    pillarsTarget: 40,
    title: 'Chúa Tể Hầm Mỏ Tinh Giới',
    rewardGems: 90,
    rewardReforgeStones: 22,
    rewardMythicShards: 16,
    rewardWarCrests: 15,
  },
  {
    pillarsTarget: 75,
    title: 'Huyền Thoại Hầm Mỏ Chí Tôn',
    rewardGems: 140,
    rewardReforgeStones: 32,
    rewardMythicShards: 24,
    rewardWarCrests: 22,
  },
];

export function normalizeCrystalVault(
  cv?: Partial<CrystalVaultState>,
  hasBonusAttempt = false
): CrystalVaultState {
  const today = getTodayKey();
  const maxRuns = MAX_DAILY_CRYSTAL_VAULT_RUNS + (hasBonusAttempt ? 1 : 0);
  if (!cv || cv.date !== today) {
    return {
      date: today,
      dailyRunsRemaining: maxRuns,
      bestPillarsBroken: Math.max(0, cv?.bestPillarsBroken ?? 0),
      totalPillarsBroken: Math.max(0, cv?.totalPillarsBroken ?? 0),
      totalVaultGems: Math.max(0, cv?.totalVaultGems ?? 0),
      claimedMilestones: Array.isArray(cv?.claimedMilestones) ? cv.claimedMilestones : [],
    };
  }
  return {
    date: today,
    dailyRunsRemaining: Math.max(0, Math.min(maxRuns, cv.dailyRunsRemaining ?? maxRuns)),
    bestPillarsBroken: Math.max(0, cv.bestPillarsBroken ?? 0),
    totalPillarsBroken: Math.max(0, cv.totalPillarsBroken ?? 0),
    totalVaultGems: Math.max(0, cv.totalVaultGems ?? 0),
    claimedMilestones: Array.isArray(cv.claimedMilestones) ? cv.claimedMilestones : [],
  };
}

export function countClaimableCrystalVaultMilestones(save: SaveData): number {
  const st = normalizeCrystalVault(save.crystalVault);
  return CRYSTAL_VAULT_MILESTONES.filter(
    (m) => st.totalPillarsBroken >= m.pillarsTarget && !st.claimedMilestones.includes(m.pillarsTarget)
  ).length;
}

// ============================================================================
// 5. LOBBY 3D PHOTO MODE POSES, LIVE CP BREAKDOWN, CLAIM ALL & COMBO TIERS
// ============================================================================

export const LOBBY_HERO_POSES: Array<{ id: LobbyHeroPoseId; label: string; shortDesc: string }> = [
  { id: 'heroic', label: 'Đứng Oai Vệ', shortDesc: 'Tư thế thủ lĩnh mặc định' },
  { id: 'aim_ready', label: 'Khai Cung Chiến Đấu', shortDesc: 'Nghiêng vai dương vũ khí sẵn sàng' },
  { id: 'astral_float', label: 'Lơ Lửng Tinh Giới', shortDesc: 'Bay bổng hấp thụ năng lượng sao' },
  { id: 'victory_salute', label: 'Mừng Chiến Thắng', shortDesc: 'Nâng vũ khí tôn vinh Quán Quân' },
];

export function analyzeCombatPower(save: SaveData, totalPower: number): CombatPowerAnalysis {
  const mythic = normalizeMythicWeapon(save.mythicWeapon);
  const equippedGearCount = Object.values(save.equipped ?? {}).filter(Boolean).length;
  const totalGearLv = (save.inventory ?? [])
    .filter((g) => Object.values(save.equipped ?? {}).includes(g.uid))
    .reduce((sum, g) => sum + (g.level ?? 1), 0);
  const gearMythicScore = Math.max(
    120,
    equippedGearCount * 95 + totalGearLv * 24 + mythic.tier * 220 + mythic.totalReforges * 15
  );

  const heroStar = save.heroStars?.[save.selectedHeroId] ?? 1;
  const talentLvSum = Object.values(save.talents ?? {}).reduce((s, v) => s + (v ?? 0), 0);
  const heroScore = Math.max(100, heroStar * 180 + talentLvSum * 32 + (save.unlockedHeroes?.length ?? 1) * 45);

  const petInst = save.pets?.find((p) => p.petId === save.equippedPetId);
  const petEvolved = Boolean(save.equippedPetId && save.evolvedPets?.includes(save.equippedPetId));
  const petScore = Math.max(40, (petInst ? 160 + petInst.level * 36 : 40) + (petEvolved ? 260 : 0));

  const wingLv = save.equippedWingId ? save.wingLevels?.[save.equippedWingId] ?? 1 : 0;
  const mountLv = save.equippedMountId ? save.mountLevels?.[save.equippedMountId] ?? 1 : 0;
  const haloLv = save.equippedHaloId ? save.haloLevels?.[save.equippedHaloId] ?? 1 : 0;
  const steedStar = save.equippedAstralSteedId ? save.astralSteedStars?.[save.equippedAstralSteedId] ?? 1 : 0;
  const celWingStar = save.equippedCelestialWingId
    ? save.celestialWingStars?.[save.equippedCelestialWingId] ?? 1
    : 0;
  const cosmeticScore = Math.max(
    45,
    wingLv * 90 +
      mountLv * 95 +
      haloLv * 120 +
      steedStar * 150 +
      celWingStar * 170 +
      (save.equippedArtifactId ? 150 : 0)
  );

  const altar = computeAltarBonuses(save.blessingAltar);
  const soulRings = computeSoulRingBonuses(save.soulRings);
  const guildSanct = computeGuildSanctuaryBonuses(save.guildSanctuary);
  const bannerLv = save.equippedWarBannerId ? save.warBannerLevels?.[save.equippedWarBannerId] ?? 1 : 0;
  const altarBannerScore = Math.max(
    35,
    altar.totalLevel * 55 + bannerLv * 140 + soulRings.totalLevel * 65 + guildSanct.totalLevel * 48
  );

  const codex = computeCodexSummary(save);
  const relics = computeZodiacRelicBonuses(save.zodiacRelics);
  const codexScore = Math.max(
    50,
    codex.totalPoints * 1.4 + codex.currentRank.rank * 95 + relics.totalStars * 95
  );

  const rawItems: Array<Omit<CombatPowerCategoryItem, 'sharePct' | 'statusLabel'>> = [
    {
      id: 'gear_mythic',
      label: 'Trang Bị & Thần Binh 3D',
      score: Math.round(gearMythicScore),
      targetAction: mythic.tier < 5 ? 'mythic_forge' : 'gear',
      actionLabel: mythic.tier < 5 ? 'Thức Tỉnh Thần Binh' : 'Cường Hóa Đồ',
      accentClass: 'from-amber-500 to-yellow-300',
    },
    {
      id: 'hero_talents',
      label: 'Anh Hùng & Thiên Phú',
      score: Math.round(heroScore),
      targetAction: 'heroes',
      actionLabel: 'Nâng Sao Tướng',
      accentClass: 'from-sky-500 to-cyan-300',
    },
    {
      id: 'pets',
      label: 'Tinh Linh & Thần Sủng 3D',
      score: Math.round(petScore),
      targetAction: 'pets',
      actionLabel: petEvolved ? 'Nâng Cấp Sủng' : 'Tiến Hóa Thần Sủng',
      accentClass: 'from-emerald-500 to-lime-300',
    },
    {
      id: 'cosmetics_halo',
      label: 'Cánh, Thú Cưỡi & Hào Quang',
      score: Math.round(cosmeticScore),
      targetAction: 'wardrobe',
      actionLabel: 'Phòng Thử Đồ 3D',
      accentClass: 'from-purple-500 to-fuchsia-300',
    },
    {
      id: 'altar_banner',
      label: 'Tế Đàn & Cờ Hiệu Chiến Trận',
      score: Math.round(altarBannerScore),
      targetAction: 'altar_banner',
      actionLabel: 'Hiến Tế & Đeo Cờ',
      accentClass: 'from-rose-500 to-orange-300',
    },
    {
      id: 'codex_bonds',
      label: 'Sổ Tay Sưu Tầm Toàn Đội',
      score: Math.round(codexScore),
      targetAction: 'codex',
      actionLabel: 'Mở Sổ Tay Buff',
      accentClass: 'from-indigo-500 to-violet-300',
    },
  ];

  const sumScore = Math.max(1, rawItems.reduce((s, x) => s + x.score, 0));
  const avgScore = sumScore / rawItems.length;

  const categories: CombatPowerCategoryItem[] = rawItems.map((item) => {
    const sharePct = Math.round((item.score / sumScore) * 100);
    const statusLabel =
      item.score >= avgScore * 1.15
        ? 'Vượt Trội'
        : item.score >= avgScore * 0.72
        ? 'Ổn Định'
        : 'Cần Đột Phá';
    return { ...item, sharePct, statusLabel };
  });

  const weakestCategory = [...categories].sort((a, b) => a.score - b.score)[0];

  const rankLabel =
    totalPower >= 12000
      ? 'Chí Tôn Hoàng Đạo'
      : totalPower >= 6500
      ? 'Chiến Thần Tinh Giới'
      : totalPower >= 3200
      ? 'Đại Hiệp Sĩ Hoàng Kim'
      : totalPower >= 1400
      ? 'Tinh Anh Thánh Điện'
      : 'Tân Binh Khởi Nguyên';

  return {
    totalPower,
    rankLabel,
    categories,
    weakestCategory,
  };
}

export function previewLobbyClaimAll(save: SaveData): ClaimAllPreview {
  const sources: ClaimAllSourceItem[] = [];
  const today = getTodayKey();

  if (canClaimSupremeMonthlyDaily(save)) {
    sources.push({
      id: 'supreme_monthly',
      label: 'Thẻ Tháng Chí Tôn',
      detail: `+${SUPREME_MONTHLY_CONFIG.dailyGems} Ngọc · +${SUPREME_MONTHLY_CONFIG.dailyReforgeStones} Đá Đúc · +${SUPREME_MONTHLY_CONFIG.dailyWarCrests} Huy Hiệu`,
      count: 1,
    });
  }

  const mp = normalizeMonthlyPrivilege(save.monthlyPrivilege);
  let mpCount = 0;
  if (isMonthlyCardActive(mp.silver) && mp.silver.lastClaimDate !== today) mpCount++;
  if (isMonthlyCardActive(mp.royal) && mp.royal.lastClaimDate !== today) mpCount++;
  if (mpCount > 0) {
    sources.push({
      id: 'monthly_cards',
      label: 'Thẻ Tháng Bạc / Hoàng Gia',
      detail: `${mpCount} mốc quà ngày đang chờ`,
      count: mpCount,
    });
  }

  if (canClaimWeekendPassDaily(save)) {
    sources.push({
      id: 'weekend_pass',
      label: 'Thẻ Đặc Quyền Cuối Tuần',
      detail: '+45 Ngọc · +4 Lõi Thần Sủng · +20 Đèn Lồng',
      count: 1,
    });
  }

  const mailCount = (save.mailInbox ?? []).filter((m) => !m.claimed).length;
  if (mailCount > 0) {
    sources.push({
      id: 'mail',
      label: 'Hòm Thư Tinh Giới',
      detail: `${mailCount} thư có quà đính kèm`,
      count: mailCount,
    });
  }

  const codexCount = countClaimableCodexRanks(save);
  if (codexCount > 0) {
    sources.push({
      id: 'codex',
      label: 'Mốc Sổ Tay Sưu Tầm',
      detail: `${codexCount} bậc sưu tầm chưa nhận quà`,
      count: codexCount,
    });
  }

  const festCount = countClaimableFestivalRewards(save);
  if (festCount > 0) {
    sources.push({
      id: 'festival',
      label: 'Lễ Hội Tinh Giới',
      detail: `${festCount} nhiệm vụ & mốc Đèn Lồng`,
      count: festCount,
    });
  }

  const champCount = countClaimableChampionshipMilestones(save);
  if (champCount > 0) {
    sources.push({
      id: 'championship',
      label: 'Cúp Giải Đấu 3 Hiệp',
      detail: `${champCount} mốc Cúp Vinh Quang`,
      count: champCount,
    });
  }

  const vaultCount = countClaimableCrystalVaultMilestones(save);
  if (vaultCount > 0) {
    sources.push({
      id: 'crystal_vault',
      label: 'Mốc Hầm Mỏ Pha Lê 3D',
      detail: `${vaultCount} mốc thưởng phá trụ`,
      count: vaultCount,
    });
  }

  if (hasFreeChainStepReady(save)) {
    sources.push({
      id: 'step_up_free',
      label: 'Chuỗi Nạp Bậc 1 Miễn Phí',
      detail: 'Quà khởi đầu 0 Ngọc',
      count: 1,
    });
  }

  const gemVaultCount = countClaimableVaultRewards(save);
  if (gemVaultCount > 0) {
    sources.push({
      id: 'gem_vault',
      label: 'Quỹ Hoàn Ngọc Tinh Giới',
      detail: `${gemVaultCount} mốc cổ tức sẵn sàng`,
      count: gemVaultCount,
    });
  }

  const wheelMilestoneCount = TREASURE_WHEEL_MILESTONES.filter(
    (m) =>
      (save.treasureWheel?.totalSpins ?? 0) >= m.spins &&
      !(save.treasureWheel?.claimedMilestoneSpins ?? []).includes(m.spins)
  ).length;
  if (wheelMilestoneCount > 0) {
    sources.push({
      id: 'wheel_milestones',
      label: 'Mốc Vòng Quay Kho Báu',
      detail: `${wheelMilestoneCount} mốc quay tích lũy`,
      count: wheelMilestoneCount,
    });
  }

  const carnivalCount = countClaimableCarnivalRewards(save);
  if (carnivalCount > 0) {
    sources.push({
      id: 'carnival_7day',
      label: 'Lộ Trình Quà 7 Ngày',
      detail: `${carnivalCount} nhiệm vụ & mốc điểm 7 ngày`,
      count: carnivalCount,
    });
  }

  const raceCount = countClaimableStarlightMilestones(save);
  if (raceCount > 0) {
    sources.push({
      id: 'starlight_race',
      label: 'Mốc Đường Đua Ánh Sao',
      detail: `${raceCount} mốc thưởng tốc độ sẵn sàng`,
      count: raceCount,
    });
  }

  const dragonCount = countClaimableDragonLairMilestones(save);
  if (dragonCount > 0) {
    sources.push({
      id: 'dragon_lair',
      label: 'Mốc Lãnh Địa Rồng Cổ 3D',
      detail: `${dragonCount} mốc Vảy Rồng Cổ chưa nhận`,
      count: dragonCount,
    });
  }

  const skyCitadelCount = countClaimableSkyCitadelMilestones(save);
  if (skyCitadelCount > 0) {
    sources.push({
      id: 'sky_citadel',
      label: 'Mốc Không Chiến Tinh Giới 3D',
      detail: `${skyCitadelCount} mốc Lông Vũ & Mảnh Thần sẵn sàng`,
      count: skyCitadelCount,
    });
  }

  const astralBoardCount = countClaimableAstralBoardRewards(save);
  if (astralBoardCount > 0) {
    sources.push({
      id: 'astral_board',
      label: 'Bàn Cờ Xúc Xắc Tinh Tú',
      detail: `${astralBoardCount} quà Xúc Xắc ngày & mốc hoàn vòng`,
      count: astralBoardCount,
    });
  }

  const guildSanctuaryCount = countClaimableGuildSanctuaryRewards(save);
  if (guildSanctuaryCount > 0) {
    sources.push({
      id: 'guild_sanctuary',
      label: 'Lãnh Địa & Boss Bang Hội 3D',
      detail: `${guildSanctuaryCount} rương Boss ngày & chúc phúc Lãnh Địa`,
      count: guildSanctuaryCount,
    });
  }

  const totalClaimableCount = sources.reduce((s, x) => s + x.count, 0);
  return { totalClaimableCount, sources };
}

export function getComboTierMeta(comboCount: number): {
  tierLabel: string;
  dmgBonusPct: number;
  barGradient: string;
  textClass: string;
} {
  if (comboCount >= 50) {
    return {
      tierLabel: 'HỎA QUANG CHÍ TÔN',
      dmgBonusPct: 0.3,
      barGradient: 'from-rose-500 via-amber-400 to-yellow-200',
      textClass: 'text-yellow-200',
    };
  }
  if (comboCount >= 25) {
    return {
      tierLabel: 'TINH VÂN BÙNG NỔ',
      dmgBonusPct: 0.18,
      barGradient: 'from-fuchsia-500 via-purple-400 to-amber-300',
      textClass: 'text-fuchsia-200',
    };
  }
  if (comboCount >= 10) {
    return {
      tierLabel: 'HOÀNG KIM LIÊN KÍCH',
      dmgBonusPct: 0.1,
      barGradient: 'from-amber-500 to-yellow-300',
      textClass: 'text-amber-300',
    };
  }
  return {
    tierLabel: 'LIÊN KÍCH',
    dmgBonusPct: 0,
    barGradient: 'from-sky-500 to-cyan-300',
    textClass: 'text-sky-200',
  };
}

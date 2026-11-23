import {
  ArenaShopState,
  ConstellationElement,
  ConstellationId,
  CoopRaidDifficulty,
  CoopRaidState,
  ElementalTowerId,
  ElementalTowersState,
  GrowthFundState,
  HeroDefinition,
  HeroId,
  SaveData,
} from '../types/game';
import { HEROES } from './heroesData';
import { getTodayKey } from './questsData';

// ============================================================================
// 1. QUỸ ĐẦU TƯ TRƯỞNG THÀNH (GROWTH FUND)
// ============================================================================
export const GROWTH_FUND_PREMIUM_GEM_COST = 98;

export interface GrowthFundRewardSpec {
  kind: 'gold' | 'gems' | 'star_dust' | 'pet_essence' | 'socket_gem' | 'gear_s';
  amount: number;
  label: string;
}

export interface GrowthFundMilestone {
  id: string;
  title: string;
  metric: 'chapter' | 'power';
  target: number;
  freeReward: GrowthFundRewardSpec;
  premiumReward: GrowthFundRewardSpec;
}

export const GROWTH_FUND_MILESTONES: GrowthFundMilestone[] = [
  {
    id: 'gf_ch1',
    title: 'Vượt Chương 1 · Thánh Điện Sư Tử',
    metric: 'chapter',
    target: 1,
    freeReward: { kind: 'gold', amount: 280, label: '280 Vàng' },
    premiumReward: { kind: 'gems', amount: 45, label: '45 Ngọc Hồn' },
  },
  {
    id: 'gf_pow_1400',
    title: 'Đạt 1.400 Lực Chiến',
    metric: 'power',
    target: 1400,
    freeReward: { kind: 'star_dust', amount: 60, label: '60 Bụi Tinh Tú' },
    premiumReward: { kind: 'gems', amount: 65, label: '65 Ngọc Hồn' },
  },
  {
    id: 'gf_ch2',
    title: 'Vượt Chương 2 · Đầm Lầy Bạch Dương',
    metric: 'chapter',
    target: 2,
    freeReward: { kind: 'gems', amount: 25, label: '25 Ngọc Hồn' },
    premiumReward: { kind: 'socket_gem', amount: 2, label: 'Bảo Thạch Cấp II' },
  },
  {
    id: 'gf_pow_2000',
    title: 'Đạt 2.000 Lực Chiến',
    metric: 'power',
    target: 2000,
    freeReward: { kind: 'pet_essence', amount: 25, label: '25 Tinh Chất' },
    premiumReward: { kind: 'gems', amount: 90, label: '90 Ngọc Hồn' },
  },
  {
    id: 'gf_ch3',
    title: 'Vượt Chương 3 · Pháo Đài Kim Ngưu',
    metric: 'chapter',
    target: 3,
    freeReward: { kind: 'star_dust', amount: 90, label: '90 Bụi Tinh Tú' },
    premiumReward: { kind: 'gear_s', amount: 1, label: 'Trang Bị [S] Sử Thi' },
  },
  {
    id: 'gf_pow_3000',
    title: 'Đạt 3.000 Lực Chiến',
    metric: 'power',
    target: 3000,
    freeReward: { kind: 'gold', amount: 650, label: '650 Vàng' },
    premiumReward: { kind: 'gems', amount: 140, label: '140 Ngọc Hồn' },
  },
  {
    id: 'gf_ch4',
    title: 'Vượt Chương 4 · Đỉnh Tháp Thiên Bình',
    metric: 'chapter',
    target: 4,
    freeReward: { kind: 'gems', amount: 40, label: '40 Ngọc Hồn' },
    premiumReward: { kind: 'socket_gem', amount: 3, label: 'Bảo Thạch Cấp III' },
  },
  {
    id: 'gf_pow_4500',
    title: 'Đạt 4.500 Lực Chiến',
    metric: 'power',
    target: 4500,
    freeReward: { kind: 'star_dust', amount: 150, label: '150 Bụi Tinh Tú' },
    premiumReward: { kind: 'gems', amount: 220, label: '220 Ngọc Hồn' },
  },
];

export function normalizeGrowthFund(gf?: Partial<GrowthFundState>): GrowthFundState {
  return {
    premiumUnlocked: Boolean(gf?.premiumUnlocked),
    claimedFreeIds: Array.isArray(gf?.claimedFreeIds) ? gf.claimedFreeIds : [],
    claimedPremiumIds: Array.isArray(gf?.claimedPremiumIds) ? gf.claimedPremiumIds : [],
  };
}

export function isGrowthFundMilestoneMet(
  m: GrowthFundMilestone,
  save: SaveData,
  powerRating: number
): boolean {
  if (m.metric === 'chapter') {
    return save.highestChapterCleared >= m.target;
  }
  return powerRating >= m.target;
}

export function countClaimableGrowthFund(save: SaveData, powerRating: number): number {
  const gf = normalizeGrowthFund(save.growthFund);
  let count = 0;
  for (const m of GROWTH_FUND_MILESTONES) {
    if (!isGrowthFundMilestoneMet(m, save, powerRating)) continue;
    if (!gf.claimedFreeIds.includes(m.id)) count++;
    if (gf.premiumUnlocked && !gf.claimedPremiumIds.includes(m.id)) count++;
  }
  return count;
}

// ============================================================================
// 2. CỬA HÀNG XU ARENA (ARENA COIN SHOP)
// ============================================================================
export interface ArenaShopOffer {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  coinCost: number;
  dailyLimit: number;
  rewardKind: 'gear_s' | 'socket_gem_t3' | 'destiny_ticket' | 'star_dust' | 'pet_essence' | 'gems';
  amount: number;
}

export const ARENA_SHOP_OFFERS: ArenaShopOffer[] = [
  {
    id: 'as_stier_relic',
    title: 'Rương Thánh Vật [S] Đấu Trường',
    subtitle: 'Nhận ngay 1 Trang Bị [S] phẩm chất Sử Thi trở lên cho tổ đội.',
    badge: 'GIÁ TRỊ CAO',
    coinCost: 110,
    dailyLimit: 1,
    rewardKind: 'gear_s',
    amount: 1,
  },
  {
    id: 'as_socket_gem_t3',
    title: 'Bảo Thạch Tinh Anh Cấp III',
    subtitle: 'Nhận 1 Bảo Thạch Cấp III ngẫu nhiên khảm vào trang bị.',
    badge: 'HIẾM · CẤP III',
    coinCost: 80,
    dailyLimit: 2,
    rewardKind: 'socket_gem_t3',
    amount: 1,
  },
  {
    id: 'as_gems_pack',
    title: 'Hộp Ngọc Hồn Vinh Quang ×35',
    subtitle: 'Quy đổi trực tiếp Xu Arena sang Ngọc Hồn mua gói VIP / Quỹ.',
    badge: 'TIẾT KIỆM',
    coinCost: 48,
    dailyLimit: 2,
    rewardKind: 'gems',
    amount: 35,
  },
  {
    id: 'as_destiny_tickets',
    title: 'Vé Vòng Quay Vận Mệnh ×2',
    subtitle: 'Tích thêm lượt quay chạm mốc Rương Vận Mệnh [S].',
    badge: 'PHỔ BIẾN',
    coinCost: 34,
    dailyLimit: 3,
    rewardKind: 'destiny_ticket',
    amount: 2,
  },
  {
    id: 'as_star_dust',
    title: 'Bụi Tinh Tú Rèn Đồ ×80',
    subtitle: 'Nguyên liệu nâng cấp 12 Chòm Sao & Đúc Trang Bị [S].',
    badge: 'CHÒM SAO',
    coinCost: 24,
    dailyLimit: 4,
    rewardKind: 'star_dust',
    amount: 80,
  },
  {
    id: 'as_pet_essence',
    title: 'Tinh Chất Tinh Linh ×25',
    subtitle: 'Bồi dưỡng cấp độ Tinh Linh đồng hành trên đấu trường.',
    badge: 'TINH LINH',
    coinCost: 26,
    dailyLimit: 4,
    rewardKind: 'pet_essence',
    amount: 25,
  },
];

export function normalizeArenaShop(s?: Partial<ArenaShopState>): ArenaShopState {
  const today = getTodayKey();
  if (!s || s.date !== today) {
    return { date: today, purchasedCounts: {} };
  }
  return {
    date: today,
    purchasedCounts: s.purchasedCounts ? { ...s.purchasedCounts } : {},
  };
}

// ============================================================================
// 3. GÓI THƯƠNG MẠI CAO CẤP (COMMERCIAL VALUE PACKS)
// ============================================================================
export interface CommercialPackItem {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  highlightLabel: string;
  currency: 'gold' | 'gems';
  cost: number;
  maxClaims: number; // total per save or large cap
  rewards: Array<{
    kind: 'gold' | 'gems' | 'star_dust' | 'pet_essence' | 'socket_gem_t2' | 'gear_s' | 'destiny_ticket';
    amount: number;
    label: string;
  }>;
}

export const COMMERCIAL_VALUE_PACKS: CommercialPackItem[] = [
  {
    id: 'pack_starlight_starter',
    title: 'Gói Khai Mở Tinh Tú',
    subtitle: 'Ưu đãi một lần cho Tân Thủ nâng cấp lực chiến và khảm ngọc tức thì.',
    badge: 'HOÀN 600%',
    highlightLabel: 'MỚI',
    currency: 'gems',
    cost: 22,
    maxClaims: 1,
    rewards: [
      { kind: 'gold', amount: 750, label: '750 Vàng' },
      { kind: 'star_dust', amount: 110, label: '110 Bụi Tinh Tú' },
      { kind: 'socket_gem_t2', amount: 1, label: 'Bảo Thạch II' },
    ],
  },
  {
    id: 'pack_constellation_bundle',
    title: 'Túi Năng Lượng Chòm Sao',
    subtitle: 'Nguồn Bụi Tinh Tú và Vé Vòng Quay chuyên biệt để thắp sáng Hoàng Đạo.',
    badge: 'GIẢM 40%',
    highlightLabel: 'CHÒM SAO',
    currency: 'gems',
    cost: 38,
    maxClaims: 5,
    rewards: [
      { kind: 'star_dust', amount: 220, label: '220 Bụi Tinh Tú' },
      { kind: 'pet_essence', amount: 35, label: '35 Tinh Chất' },
      { kind: 'destiny_ticket', amount: 2, label: '2 Vé Quay' },
    ],
  },
  {
    id: 'pack_oracle_relic_vault',
    title: 'Kho Báu Tinh Quân [S]',
    subtitle: 'Rương thương mại cao cấp đảm bảo Trang Bị [S] + vật phẩm thức tỉnh.',
    badge: 'TỐT NHẤT',
    highlightLabel: 'ĐẶC QUYỀN [S]',
    currency: 'gems',
    cost: 79,
    maxClaims: 3,
    rewards: [
      { kind: 'gear_s', amount: 1, label: 'Trang Bị [S] Sử Thi+' },
      { kind: 'star_dust', amount: 140, label: '140 Bụi Tinh Tú' },
      { kind: 'socket_gem_t2', amount: 2, label: '2 Bảo Thạch II' },
    ],
  },
  {
    id: 'pack_gold_convoy',
    title: 'Đoàn Xe Vàng Tinh Giới',
    subtitle: 'Bổ sung nhanh lượng lớn Vàng cường hóa trang bị và thắp sáng Sao.',
    badge: 'GIẢM 35%',
    highlightLabel: 'TIẾP TẾ',
    currency: 'gems',
    cost: 15,
    maxClaims: 10,
    rewards: [{ kind: 'gold', amount: 900, label: '900 Vàng' }],
  },
];

// ============================================================================
// 4. BẢN ĐỒ 12 CHÒM SAO HOÀNG ĐẠO (CONSTELLATION SYSTEM)
// ============================================================================
export const MAX_CONSTELLATION_LEVEL = 5;

export interface ConstellationDefinition {
  id: ConstellationId;
  name: string;
  symbol: string;
  element: ConstellationElement;
  elementLabel: string;
  angleDeg: number; // Position around celestial wheel
  atkPerStar: number;
  hpPerStar: number;
  critPerStar: number;
  aspdPerStar: number;
  drPerStar: number;
  goldPerStar: number;
  elementBonusLabel: string;
}

export const CONSTELLATION_ELEMENT_META: Record<
  ConstellationElement,
  {
    label: string;
    colorHex: string;
    hexNum: number;
    resonanceDesc: string;
  }
> = {
  fire: {
    label: 'Hỏa Tinh',
    colorHex: '#fb923c',
    hexNum: 0xf97316,
    resonanceDesc: '+15% Sát Thương Hỏa & +45 ATK khi cả 3 cung Hỏa đạt ≥1★ (gấp đôi ở ≥3★).',
  },
  earth: {
    label: 'Địa Tượng',
    colorHex: '#34d399',
    hexNum: 0x10b981,
    resonanceDesc: '+320 HP & +4% Giảm Sát Thương khi cả 3 cung Địa đạt ≥1★ (gấp đôi ở ≥3★).',
  },
  air: {
    label: 'Phong Lôi',
    colorHex: '#c084fc',
    hexNum: 0xa855f7,
    resonanceDesc: '+15% Sát Thương Lôi & +6% Chí Mạng khi cả 3 cung Phong đạt ≥1★ (gấp đôi ở ≥3★).',
  },
  water: {
    label: 'Thủy Băng',
    colorHex: '#38bdf8',
    hexNum: 0x0ea5e9,
    resonanceDesc: '+15% Sát Thương Băng & +15% Vàng rơi khi cả 3 cung Thủy đạt ≥1★ (gấp đôi ở ≥3★).',
  },
};

export const CONSTELLATIONS: ConstellationDefinition[] = [
  {
    id: 'aries',
    name: 'Bạch Dương',
    symbol: '♈',
    element: 'fire',
    elementLabel: 'Hỏa',
    angleDeg: 0,
    atkPerStar: 14,
    hpPerStar: 40,
    critPerStar: 0.008,
    aspdPerStar: 0,
    drPerStar: 0,
    goldPerStar: 0,
    elementBonusLabel: '+5% ST Hỏa / ★',
  },
  {
    id: 'taurus',
    name: 'Kim Ngưu',
    symbol: '♉',
    element: 'earth',
    elementLabel: 'Địa',
    angleDeg: 30,
    atkPerStar: 6,
    hpPerStar: 105,
    critPerStar: 0,
    aspdPerStar: 0,
    drPerStar: 0.008,
    goldPerStar: 0,
    elementBonusLabel: '+105 HP · +0.8% Kháng ST / ★',
  },
  {
    id: 'gemini',
    name: 'Song Tử',
    symbol: '♊',
    element: 'air',
    elementLabel: 'Phong',
    angleDeg: 60,
    atkPerStar: 10,
    hpPerStar: 35,
    critPerStar: 0.006,
    aspdPerStar: 0.015,
    drPerStar: 0,
    goldPerStar: 0,
    elementBonusLabel: '+1.5% Tốc Đánh · +5% ST Lôi / ★',
  },
  {
    id: 'cancer',
    name: 'Cự Giải',
    symbol: '♋',
    element: 'water',
    elementLabel: 'Thủy',
    angleDeg: 90,
    atkPerStar: 7,
    hpPerStar: 85,
    critPerStar: 0,
    aspdPerStar: 0,
    drPerStar: 0.005,
    goldPerStar: 0.03,
    elementBonusLabel: '+5% ST Băng · +3% Vàng / ★',
  },
  {
    id: 'leo',
    name: 'Sư Tử',
    symbol: '♌',
    element: 'fire',
    elementLabel: 'Hỏa',
    angleDeg: 120,
    atkPerStar: 18,
    hpPerStar: 50,
    critPerStar: 0.01,
    aspdPerStar: 0,
    drPerStar: 0,
    goldPerStar: 0,
    elementBonusLabel: '+18 ATK · +5% ST Hỏa / ★',
  },
  {
    id: 'virgo',
    name: 'Xử Nữ',
    symbol: '♍',
    element: 'earth',
    elementLabel: 'Địa',
    angleDeg: 150,
    atkPerStar: 8,
    hpPerStar: 90,
    critPerStar: 0.005,
    aspdPerStar: 0,
    drPerStar: 0.007,
    goldPerStar: 0.02,
    elementBonusLabel: '+90 HP · +2% Vàng / ★',
  },
  {
    id: 'libra',
    name: 'Thiên Bình',
    symbol: '♎',
    element: 'air',
    elementLabel: 'Phong',
    angleDeg: 180,
    atkPerStar: 11,
    hpPerStar: 45,
    critPerStar: 0.01,
    aspdPerStar: 0.012,
    drPerStar: 0,
    goldPerStar: 0,
    elementBonusLabel: '+1% Chí Mạng · +5% ST Lôi / ★',
  },
  {
    id: 'scorpio',
    name: 'Thiên Yết',
    symbol: '♏',
    element: 'water',
    elementLabel: 'Thủy',
    angleDeg: 210,
    atkPerStar: 12,
    hpPerStar: 60,
    critPerStar: 0.008,
    aspdPerStar: 0,
    drPerStar: 0,
    goldPerStar: 0.02,
    elementBonusLabel: '+5% ST Băng · +12 ATK / ★',
  },
  {
    id: 'sagittarius',
    name: 'Nhân Mã',
    symbol: '♐',
    element: 'fire',
    elementLabel: 'Hỏa',
    angleDeg: 240,
    atkPerStar: 15,
    hpPerStar: 40,
    critPerStar: 0.006,
    aspdPerStar: 0.012,
    drPerStar: 0,
    goldPerStar: 0,
    elementBonusLabel: '+15 ATK · +5% ST Hỏa / ★',
  },
  {
    id: 'capricorn',
    name: 'Ma Kết',
    symbol: '♑',
    element: 'earth',
    elementLabel: 'Địa',
    angleDeg: 270,
    atkPerStar: 9,
    hpPerStar: 115,
    critPerStar: 0,
    aspdPerStar: 0,
    drPerStar: 0.01,
    goldPerStar: 0,
    elementBonusLabel: '+115 HP · +1% Kháng ST / ★',
  },
  {
    id: 'aquarius',
    name: 'Bảo Bình',
    symbol: '♒',
    element: 'air',
    elementLabel: 'Phong',
    angleDeg: 300,
    atkPerStar: 12,
    hpPerStar: 55,
    critPerStar: 0.007,
    aspdPerStar: 0.014,
    drPerStar: 0,
    goldPerStar: 0.02,
    elementBonusLabel: '+1.4% Tốc Đánh · +5% ST Lôi / ★',
  },
  {
    id: 'pisces',
    name: 'Song Ngư',
    symbol: '♓',
    element: 'water',
    elementLabel: 'Thủy',
    angleDeg: 330,
    atkPerStar: 8,
    hpPerStar: 80,
    critPerStar: 0.005,
    aspdPerStar: 0,
    drPerStar: 0.006,
    goldPerStar: 0.03,
    elementBonusLabel: '+5% ST Băng · +3% Vàng / ★',
  },
];

export const CONSTELLATION_MAP: Record<ConstellationId, ConstellationDefinition> =
  CONSTELLATIONS.reduce((acc, c) => {
    acc[c.id] = c;
    return acc;
  }, {} as Record<ConstellationId, ConstellationDefinition>);

export function getConstellationUpgradeCost(currentStars: number): {
  starDust: number;
  gold: number;
} {
  return {
    starDust: 24 + currentStars * 20,
    gold: 75 + currentStars * 70,
  };
}

export function normalizeConstellations(
  c?: Partial<Record<ConstellationId, number>>
): Record<ConstellationId, number> {
  const res = {} as Record<ConstellationId, number>;
  for (const def of CONSTELLATIONS) {
    res[def.id] = Math.max(0, Math.min(MAX_CONSTELLATION_LEVEL, c?.[def.id] ?? 0));
  }
  return res;
}

export function computeConstellationBonuses(
  c?: Partial<Record<ConstellationId, number>>
): {
  levels: Record<ConstellationId, number>;
  levelsArray: number[];
  totalStars: number;
  atkFlat: number;
  hpFlat: number;
  critBonus: number;
  aspdBonus: number;
  drBonus: number;
  goldBonus: number;
  fireDmgBonus: number;
  iceDmgBonus: number;
  stormDmgBonus: number;
  elementResonanceTier: Record<ConstellationElement, 0 | 1 | 2>;
} {
  const levels = normalizeConstellations(c);
  const levelsArray: number[] = [];
  let totalStars = 0;
  let atkFlat = 0;
  let hpFlat = 0;
  let critBonus = 0;
  let aspdBonus = 0;
  let drBonus = 0;
  let goldBonus = 0;
  let fireDmgBonus = 0;
  let iceDmgBonus = 0;
  let stormDmgBonus = 0;

  for (const def of CONSTELLATIONS) {
    const lv = levels[def.id];
    levelsArray.push(lv);
    totalStars += lv;
    if (lv > 0) {
      atkFlat += def.atkPerStar * lv;
      hpFlat += def.hpPerStar * lv;
      critBonus += def.critPerStar * lv;
      aspdBonus += def.aspdPerStar * lv;
      drBonus += def.drPerStar * lv;
      goldBonus += def.goldPerStar * lv;
      if (def.element === 'fire') fireDmgBonus += 0.05 * lv;
      if (def.element === 'water') iceDmgBonus += 0.05 * lv;
      if (def.element === 'air') stormDmgBonus += 0.05 * lv;
    }
  }

  const elementResonanceTier: Record<ConstellationElement, 0 | 1 | 2> = {
    fire: 0,
    earth: 0,
    air: 0,
    water: 0,
  };
  (['fire', 'earth', 'air', 'water'] as ConstellationElement[]).forEach((el) => {
    const group = CONSTELLATIONS.filter((d) => d.element === el);
    const minStar = Math.min(...group.map((d) => levels[d.id]));
    const tier: 0 | 1 | 2 = minStar >= 3 ? 2 : minStar >= 1 ? 1 : 0;
    elementResonanceTier[el] = tier;
    if (tier > 0) {
      if (el === 'fire') {
        atkFlat += 45 * tier;
        fireDmgBonus += 0.15 * tier;
      } else if (el === 'earth') {
        hpFlat += 320 * tier;
        drBonus += 0.04 * tier;
      } else if (el === 'air') {
        critBonus += 0.06 * tier;
        stormDmgBonus += 0.15 * tier;
      } else if (el === 'water') {
        goldBonus += 0.15 * tier;
        iceDmgBonus += 0.15 * tier;
      }
    }
  });

  return {
    levels,
    levelsArray,
    totalStars,
    atkFlat,
    hpFlat,
    critBonus,
    aspdBonus,
    drBonus,
    goldBonus,
    fireDmgBonus,
    iceDmgBonus,
    stormDmgBonus,
    elementResonanceTier,
  };
}

// ============================================================================
// 5. PHÓ BẢN HỢP TÁC ĐỒNG HÀNH AI 3D (CO-OP RAID)
// ============================================================================
export const COOP_RAID_MAX_DAILY_REWARDS = 2;

export interface CoopRaidDifficultyDef {
  id: CoopRaidDifficulty;
  name: string;
  badge: string;
  desc: string;
  recommendedPower: number;
  hpMult: number;
  dmgMult: number;
  rewardGold: number;
  rewardGems: number;
  rewardStarDust: number;
  rewardPetEssence: number;
  socketGemTier: 1 | 2 | 3;
}

export const COOP_RAID_DIFFICULTIES: CoopRaidDifficultyDef[] = [
  {
    id: 'normal',
    name: 'Phó Bản Thường · Đền Nguyệt Thực',
    badge: 'TUẦN 2 · TỔ ĐỘI 3 NGƯỜI',
    desc: 'Cùng 2 Đồng Hành AI đối đầu Chúa Tể Hoàng Đạo cấp Tuần 2 (mở từ Chương 4).',
    recommendedPower: 18000,
    hpMult: 16.0,
    dmgMult: 3.5,
    rewardGold: 1650,
    rewardGems: 28,
    rewardStarDust: 120,
    rewardPetEssence: 22,
    socketGemTier: 1,
  },
  {
    id: 'heroic',
    name: 'Phó Bản Anh Hùng · Thánh Vực Hư Không',
    badge: 'TUẦN 3 · BẢO THẠCH II',
    desc: 'Boss có song hộ vệ Tinh Anh, rơi Bảo Thạch Cấp II & nhiều Bụi Tinh Tú cho mốc Chương 7–9.',
    recommendedPower: 75000,
    hpMult: 65.0,
    dmgMult: 8.2,
    rewardGold: 4800,
    rewardGems: 48,
    rewardStarDust: 260,
    rewardPetEssence: 40,
    socketGemTier: 2,
  },
  {
    id: 'mythic',
    name: 'Phó Bản Thần Thoại · Hắc Ám Chí Tôn',
    badge: 'TUẦN 4 · BẢO THẠCH III',
    desc: 'Thử thách cực đại cho bộ ba Anh Hùng Hoàng Đạo mốc Chương 10–12, rơi Bảo Thạch Cấp III.',
    recommendedPower: 185000,
    hpMult: 175.0,
    dmgMult: 15.5,
    rewardGold: 12500,
    rewardGems: 75,
    rewardStarDust: 480,
    rewardPetEssence: 68,
    socketGemTier: 3,
  },
];

export const COOP_DIFFICULTY_MAP: Record<CoopRaidDifficulty, CoopRaidDifficultyDef> =
  COOP_RAID_DIFFICULTIES.reduce((acc, d) => {
    acc[d.id] = d;
    return acc;
  }, {} as Record<CoopRaidDifficulty, CoopRaidDifficultyDef>);

export function selectCoopAiAllies(playerHeroId: HeroId): [HeroDefinition, HeroDefinition] {
  const preferredOrder: HeroId[] = ['aurelia', 'hatsune_miku'];
  const other = preferredOrder
    .filter((id) => id !== playerHeroId)
    .map((id) => HEROES.find((h) => h.id === id))
    .filter((h): h is HeroDefinition => Boolean(h));
  const primaryAlly = other[0] ?? HEROES[0];
  const secondaryAlly = HEROES.find((h) => h.id === playerHeroId) ?? HEROES[1] ?? HEROES[0];
  return [primaryAlly, secondaryAlly];
}

export function normalizeCoopRaid(c?: Partial<CoopRaidState>): CoopRaidState {
  const today = getTodayKey();
  if (!c || c.date !== today) {
    return {
      date: today,
      dailyRewardsLeft: COOP_RAID_MAX_DAILY_REWARDS,
      highestDifficulty: c?.highestDifficulty ?? null,
      bestTeamDamage: c?.bestTeamDamage ?? 0,
      totalClears: c?.totalClears ?? 0,
    };
  }
  return {
    date: today,
    dailyRewardsLeft: Math.max(
      0,
      Math.min(COOP_RAID_MAX_DAILY_REWARDS, c.dailyRewardsLeft ?? COOP_RAID_MAX_DAILY_REWARDS)
    ),
    highestDifficulty: c.highestDifficulty ?? null,
    bestTeamDamage: c.bestTeamDamage ?? 0,
    totalClears: c.totalClears ?? 0,
  };
}

// ============================================================================
// 6. THÁP THÍ LUYỆN NGUYÊN TỐ (HỎA · BĂNG · LÔI)
// ============================================================================
export interface ElementalTowerDef {
  id: ElementalTowerId;
  name: string;
  shortName: string;
  badge: string;
  accentTextClass: string;
  borderClass: string;
  btnClass: string;
  chapterId: number;
  ruleDesc: string;
  synergyDesc: string;
  dropDesc: string;
}

export const ELEMENTAL_TOWERS: ElementalTowerDef[] = [
  {
    id: 'fire',
    name: 'Tháp Liệt Hỏa',
    shortName: 'Hỏa',
    badge: 'NGUYÊN TỐ HỎA',
    accentTextClass: 'text-orange-300',
    borderClass: 'border-orange-400/45',
    btnClass: 'bg-gradient-to-b from-orange-400 via-orange-500 to-red-700 text-white border border-orange-200/70',
    chapterId: 5,
    ruleDesc: 'Đòn Hỏa, Thiên Thạch, Cleo & Phượng Hoàng được +50% sát thương.',
    synergyDesc: 'Cộng dồn Sát Thương Hỏa từ Chòm Sao Bạch Dương / Sư Tử / Nhân Mã.',
    dropDesc: 'Bụi Tinh Tú · Bảo Thạch Hồng Ngọc · Ngọc Hồn',
  },
  {
    id: 'ice',
    name: 'Tháp Băng Sương',
    shortName: 'Băng',
    badge: 'NGUYÊN TỐ BĂNG',
    accentTextClass: 'text-sky-300',
    borderClass: 'border-sky-400/45',
    btnClass: 'bg-gradient-to-b from-sky-400 via-cyan-500 to-blue-700 text-slate-950 border border-sky-200/70',
    chapterId: 8,
    ruleDesc: 'Đòn Băng, Rolla, Cú Tuyết & Kỹ Năng Đóng Băng được +50% sát thương.',
    synergyDesc: 'Cộng dồn Sát Thương Băng từ Chòm Sao Cự Giải / Thiên Yết / Song Ngư.',
    dropDesc: 'Tinh Chất Tinh Linh · Bảo Thạch Lam Ngọc · Vàng',
  },
  {
    id: 'storm',
    name: 'Tháp Cuồng Lôi',
    shortName: 'Lôi',
    badge: 'NGUYÊN TỐ LÔI',
    accentTextClass: 'text-purple-300',
    borderClass: 'border-purple-400/45',
    btnClass: 'bg-gradient-to-b from-purple-400 via-violet-600 to-indigo-800 text-white border border-purple-200/70',
    chapterId: 10,
    ruleDesc: 'Sét Chuỗi, Thor, Rồng Bão Tố & Kiếm Bay được +50% sát thương.',
    synergyDesc: 'Cộng dồn Sát Thương Lôi từ Chòm Sao Song Tử / Thiên Bình / Bảo Bình.',
    dropDesc: 'Bụi Tinh Tú · Bảo Thạch Hoàng Ngọc · Ngọc Hồn',
  },
];

export const ELEMENTAL_TOWER_MAP: Record<ElementalTowerId, ElementalTowerDef> =
  ELEMENTAL_TOWERS.reduce((acc, t) => {
    acc[t.id] = t;
    return acc;
  }, {} as Record<ElementalTowerId, ElementalTowerDef>);

export function normalizeElementalTowers(t?: Partial<ElementalTowersState>): ElementalTowersState {
  return {
    fire: t?.fire ?? 0,
    ice: t?.ice ?? 0,
    storm: t?.storm ?? 0,
  };
}

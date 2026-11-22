import {
  AuctionHouseState,
  AuctionLotItem,
  AvatarFrameDefinition,
  AvatarFrameId,
  CrystalDefenseState,
  GearInstance,
  MonthlyCardTier,
  MonthlyPrivilegeState,
  MythicBadgeDefinition,
  MythicBadgeId,
  Rarity,
  SaveData,
  SocketGemColor,
  SocketGemInstance,
  TopUpEvolutionState,
  WingDefinition,
  WingId,
  WorldBossState,
} from '../types/game';
import { getTodayKey } from './questsData';
import { addDaysToDateKey } from './wave3Data';

// ============================================================================
// 1. CÁNH HOÀNG ĐẠO 3D (ZODIAC WINGS)
// ============================================================================
export const MAX_WING_LEVEL = 15;

export const ZODIAC_WINGS: WingDefinition[] = [
  {
    id: 'solar_zenith',
    name: 'Thần Dực Đỉnh Thái Dương',
    badge: 'CHƯƠNG 1 · THẦN THOẠI 3D',
    rarity: 'Thần Thoại',
    desc: 'Wings of the Solar Zenith — Đôi thần dực hoàng kim rèn từ ánh nắng cực đỉnh của đền Sư Tử với khớp đập 3D thật.',
    featherStyle: 'seraph',
    primaryHex: 0xf59e0b,
    secondaryHex: 0xfef08a,
    spineHex: 0xfffbeb,
    baseAtk: 96,
    baseHp: 440,
    baseCrit: 0.095,
    baseAspd: 0.11,
    atkPerLv: 24,
    hpPerLv: 110,
    unlockGems: 0,
    unlockFeathers: 0,
  },
];

export const WING_MAP: Record<WingId, WingDefinition> = ZODIAC_WINGS.reduce((acc, w) => {
  acc[w.id] = w;
  return acc;
}, {} as Record<WingId, WingDefinition>);

export function getWingStats(wingId: WingId, level: number) {
  const def = WING_MAP[wingId];
  if (!def) {
    return { atk: 0, hp: 0, crit: 0, aspd: 0 };
  }
  const lv = Math.max(1, Math.min(MAX_WING_LEVEL, level));
  return {
    atk: def.baseAtk + (lv - 1) * def.atkPerLv,
    hp: def.baseHp + (lv - 1) * def.hpPerLv,
    crit: def.baseCrit + (lv - 1) * 0.004,
    aspd: def.baseAspd + (lv - 1) * 0.005,
  };
}

export function getWingUpgradeCost(level: number): { feathers: number; gold: number } {
  return {
    feathers: 10 + level * 7,
    gold: 160 + level * 110,
  };
}

// ============================================================================
// 2. HUY HIỆU THẦN THOẠI (KHUNG AVATAR HOÀNG ĐẠO ĐÃ ĐƯỢC TINH GỌN)
// ============================================================================
export const AVATAR_FRAMES: AvatarFrameDefinition[] = [];

export const AVATAR_FRAME_MAP: Record<AvatarFrameId, AvatarFrameDefinition> =
  AVATAR_FRAMES.reduce((acc, f) => {
    acc[f.id] = f;
    return acc;
  }, {} as Record<AvatarFrameId, AvatarFrameDefinition>);

export const MYTHIC_BADGES: MythicBadgeDefinition[] = [
  {
    id: 'badge_power_legend',
    title: 'Chí Tôn Lực Chiến',
    tierLabel: 'THẦN THOẠI I',
    desc: 'Đạt 3.200 Lực Chiến tổng hợp để khắc ấn Chí Tôn.',
    metric: 'powerRating',
    target: 3200,
    atkBonus: 45,
    hpBonus: 180,
    bossDmgBonus: 0.04,
    accentColor: '#fbbf24',
  },
  {
    id: 'badge_world_slayer',
    title: 'Đồ Long Liên Giới',
    tierLabel: 'THẦN THOẠI II',
    desc: 'Gây 120.000 Sát Thương trong 1 lượt Boss Thế Giới.',
    metric: 'worldBossBestDamage',
    target: 120000,
    atkBonus: 60,
    hpBonus: 140,
    bossDmgBonus: 0.08,
    accentColor: '#f43f5e',
  },
  {
    id: 'badge_crystal_shield',
    title: 'Thành Trì Bất Hoại',
    tierLabel: 'SỬ THI',
    desc: 'Bảo vệ Pha Lê Tinh Linh vượt qua Đợt 5.',
    metric: 'crystalBestWave',
    target: 5,
    atkBonus: 32,
    hpBonus: 260,
    bossDmgBonus: 0.03,
    accentColor: '#34d399',
  },
  {
    id: 'badge_wing_lord',
    title: 'Chúa Tể Thiên Dực',
    tierLabel: 'HUYỀN THOẠI',
    desc: 'Tổng cấp cường hóa Cánh Hoàng Đạo đạt cấp 8.',
    metric: 'wingLevelSum',
    target: 8,
    atkBonus: 50,
    hpBonus: 200,
    bossDmgBonus: 0.05,
    accentColor: '#38bdf8',
  },
  {
    id: 'badge_auction_tycoon',
    title: 'Thương Nhân Tinh Giới',
    tierLabel: 'SỬ THI',
    desc: 'Hoàn tất 3 giao dịch trên Sàn Đấu Giá Tinh Giới.',
    metric: 'auctionTrades',
    target: 3,
    atkBonus: 35,
    hpBonus: 150,
    bossDmgBonus: 0.03,
    accentColor: '#c084fc',
  },
  {
    id: 'badge_vip_sovereign',
    title: 'Quân Vương Hoàng Đạo',
    tierLabel: 'TỐI CAO',
    desc: 'Đạt 350 Điểm Tích Lũy Nạp Tiến Hóa.',
    metric: 'topUpPoints',
    target: 350,
    atkBonus: 75,
    hpBonus: 320,
    bossDmgBonus: 0.08,
    accentColor: '#fde047',
  },
];

export const MYTHIC_BADGE_MAP: Record<MythicBadgeId, MythicBadgeDefinition> =
  MYTHIC_BADGES.reduce((acc, b) => {
    acc[b.id] = b;
    return acc;
  }, {} as Record<MythicBadgeId, MythicBadgeDefinition>);

export function getMythicBadgeMetricValue(
  badge: MythicBadgeDefinition,
  save: SaveData,
  powerRating: number
): number {
  switch (badge.metric) {
    case 'powerRating':
      return powerRating;
    case 'worldBossBestDamage':
      return save.worldBoss?.bestSingleDamage ?? 0;
    case 'crystalBestWave':
      return save.crystalDefense?.bestWave ?? 0;
    case 'auctionTrades':
      return save.auctionHouse?.totalTrades ?? 0;
    case 'topUpPoints':
      return save.topUpEvolution?.points ?? 0;
    case 'wingLevelSum': {
      const levels = save.wingLevels ?? {};
      return (save.unlockedWings ?? []).reduce((s, id) => s + (levels[id] ?? 1), 0);
    }
    default:
      return 0;
  }
}

// ============================================================================
// 3. THẺ ĐẶC QUYỀN THÁNG & QUÀ TÍCH LŨY NẠP TIẾN HÓA
// ============================================================================
export interface MonthlyCardDef {
  tier: MonthlyCardTier;
  name: string;
  subtitle: string;
  badge: string;
  gemCost: number;
  durationDays: number;
  instantGems: number;
  instantFeathers: number;
  dailyGems: number;
  dailyGold: number;
  dailyFeathers: number;
  dailyStarDust: number;
  goldBonusPct: number;
  atkBonusPct: number;
  extraDefenseRuns: number;
  extraArenaTickets: number;
  perks: string[];
}

export const MONTHLY_CARDS: MonthlyCardDef[] = [
  {
    tier: 'silver_astral',
    name: 'Thẻ Tinh Tú Bạc (30 Ngày)',
    subtitle: 'Đặc quyền tiết kiệm dành cho cày cuốc hằng ngày & săn Lông Vũ Cánh.',
    badge: 'HOÀN 550%',
    gemCost: 68,
    durationDays: 30,
    instantGems: 68,
    instantFeathers: 15,
    dailyGems: 20,
    dailyGold: 300,
    dailyFeathers: 8,
    dailyStarDust: 25,
    goldBonusPct: 0.2,
    atkBonusPct: 0,
    extraDefenseRuns: 1,
    extraArenaTickets: 0,
    perks: [
      'Hoàn ngay 68 Ngọc Hồn + 15 Lông Vũ',
      'Mỗi ngày: 20 Ngọc + 300 Vàng + 8 Lông Vũ + 25 Bụi',
      '+20% Vàng rơi trong trận & +1 lượt Thủ Thành Pha Lê/ngày',
    ],
  },
  {
    tier: 'royal_zodiac',
    name: 'Thẻ Hoàng Đạo Chí Tôn (30 Ngày)',
    subtitle: 'Thẻ đặc quyền tối thượng: tăng thẳng công lực, tặng Lông Vũ & lượt PvP.',
    badge: 'ĐẶC QUYỀN CAO CẤP',
    gemCost: 148,
    durationDays: 30,
    instantGems: 160,
    instantFeathers: 38,
    dailyGems: 45,
    dailyGold: 620,
    dailyFeathers: 16,
    dailyStarDust: 55,
    goldBonusPct: 0.35,
    atkBonusPct: 0.08,
    extraDefenseRuns: 1,
    extraArenaTickets: 2,
    perks: [
      'Hoàn ngay 160 Ngọc Hồn + 38 Lông Vũ Thần Dực',
      'Mỗi ngày: 45 Ngọc + 620 Vàng + 16 Lông Vũ + 55 Bụi',
      '+8% Công lực toàn đội, +35% Vàng & +2 Vé Arena/ngày',
    ],
  },
];

export const MONTHLY_CARD_MAP: Record<MonthlyCardTier, MonthlyCardDef> = MONTHLY_CARDS.reduce(
  (acc, c) => {
    acc[c.tier] = c;
    return acc;
  },
  {} as Record<MonthlyCardTier, MonthlyCardDef>
);

export function normalizeMonthlyPrivilege(
  mp?: Partial<MonthlyPrivilegeState>
): MonthlyPrivilegeState {
  return {
    silver: {
      activeUntilDate: mp?.silver?.activeUntilDate ?? '',
      lastClaimDate: mp?.silver?.lastClaimDate ?? '',
    },
    royal: {
      activeUntilDate: mp?.royal?.activeUntilDate ?? '',
      lastClaimDate: mp?.royal?.lastClaimDate ?? '',
    },
  };
}

export function isMonthlyCardActive(
  card: { activeUntilDate: string },
  today = getTodayKey()
): boolean {
  return Boolean(card.activeUntilDate) && card.activeUntilDate >= today;
}

export function canClaimMonthlyCardDaily(
  card: { activeUntilDate: string; lastClaimDate: string },
  today = getTodayKey()
): boolean {
  return isMonthlyCardActive(card, today) && card.lastClaimDate !== today;
}

export interface TopUpEvolutionTier {
  id: string;
  tierLabel: string;
  title: string;
  pointsRequired: number;
  rewards: Array<{
    kind:
      | 'gems'
      | 'gold'
      | 'feathers'
      | 'star_dust'
      | 'gear_s'
      | 'wing'
      | 'frame';
    amount: number;
    wingId?: WingId;
    frameId?: AvatarFrameId;
    label: string;
  }>;
}

export const TOPUP_EVOLUTION_MILESTONES: TopUpEvolutionTier[] = [
  {
    id: 'tu_tier_1',
    tierLabel: 'BẬC I',
    title: 'Khởi Động Tài Phú',
    pointsRequired: 30,
    rewards: [
      { kind: 'gems', amount: 35, label: '35 Ngọc Hồn' },
      { kind: 'feathers', amount: 18, label: '18 Lông Vũ' },
    ],
  },
  {
    id: 'tu_tier_2',
    tierLabel: 'BẬC II',
    title: 'Ấn Ký Tinh Tú',
    pointsRequired: 80,
    rewards: [
      { kind: 'star_dust', amount: 140, label: '140 Bụi Tinh Tú' },
      { kind: 'gold', amount: 900, label: '900 Vàng' },
    ],
  },
  {
    id: 'tu_tier_3',
    tierLabel: 'BẬC III',
    title: 'Quà Tiến Hóa Hoàng Gia',
    pointsRequired: 160,
    rewards: [
      { kind: 'gems', amount: 65, label: '65 Ngọc Hồn' },
      { kind: 'feathers', amount: 35, label: '35 Lông Vũ' },
    ],
  },
  {
    id: 'tu_tier_4',
    tierLabel: 'BẬC IV',
    title: 'Thánh Vật [S] Chí Tôn',
    pointsRequired: 260,
    rewards: [
      { kind: 'gear_s', amount: 1, label: 'Trang Bị [S] Huyền Thoại' },
      { kind: 'gems', amount: 90, label: '90 Ngọc Hồn' },
    ],
  },
  {
    id: 'tu_tier_5',
    tierLabel: 'BẬC V',
    title: 'Thần Dực Thức Tỉnh',
    pointsRequired: 400,
    rewards: [
      { kind: 'wing', amount: 1, wingId: 'solar_zenith', label: 'Thần Dực Đỉnh Thái Dương' },
      { kind: 'feathers', amount: 55, label: '55 Lông Vũ' },
    ],
  },
  {
    id: 'tu_tier_6',
    tierLabel: 'BẬC VI',
    title: 'Đỉnh Cao Thánh Quang',
    pointsRequired: 600,
    rewards: [
      { kind: 'star_dust', amount: 260, label: '260 Bụi Tinh Tú' },
      { kind: 'gems', amount: 180, label: '180 Ngọc Hồn' },
    ],
  },
];

export function normalizeTopUpEvolution(
  tu?: Partial<TopUpEvolutionState>
): TopUpEvolutionState {
  return {
    points: Math.max(0, tu?.points ?? 0),
    claimedTierIds: Array.isArray(tu?.claimedTierIds) ? tu.claimedTierIds : [],
  };
}

export function countClaimableWave7Rewards(save: SaveData): number {
  const mp = normalizeMonthlyPrivilege(save.monthlyPrivilege);
  const tu = normalizeTopUpEvolution(save.topUpEvolution);
  let count = 0;
  if (canClaimMonthlyCardDaily(mp.silver)) count++;
  if (canClaimMonthlyCardDaily(mp.royal)) count++;
  for (const ms of TOPUP_EVOLUTION_MILESTONES) {
    if (tu.points >= ms.pointsRequired && !tu.claimedTierIds.includes(ms.id)) count++;
  }
  return count;
}

export function getNextMonthlyExpiryDate(currentUntil: string, durationDays: number): string {
  const today = getTodayKey();
  const base = currentUntil && currentUntil >= today ? currentUntil : today;
  return addDaysToDateKey(base, durationDays);
}

// ============================================================================
// 4. SÀN ĐẤU GIÁ TINH GIỚI (CELESTIAL AUCTION HOUSE)
// ============================================================================
const SELLER_ALIASES = [
  'ThiênLang_99',
  'LụcBảo_KỵSĩ',
  'HồLy_TinhVân',
  'ÁnhTrăng_SưTử',
  'ThươngHội_BạchDương',
  'NgânHà_ThợSăn',
];

const AUCTION_GEAR_POOL: Array<{
  templateId: string;
  label: string;
  rarity: Rarity;
  startBid: number;
  buyout: number;
}> = [
  {
    templateId: 'dragon_knight_crossbow',
    label: 'Nỏ Kỵ Sĩ Rồng [S]',
    rarity: Rarity.EPIC,
    startBid: 42,
    buyout: 68,
  },
  {
    templateId: 'oracle_light_spear',
    label: 'Thương Tiên Tri Oracle [S]',
    rarity: Rarity.LEGENDARY,
    startBid: 75,
    buyout: 118,
  },
  {
    templateId: 'dragon_plate',
    label: 'Giáp Kỵ Sĩ Rồng [S]',
    rarity: Rarity.EPIC,
    startBid: 38,
    buyout: 64,
  },
  {
    templateId: 'oracle_ring',
    label: 'Nhẫn Tiên Tri Oracle [S]',
    rarity: Rarity.EPIC,
    startBid: 34,
    buyout: 56,
  },
  {
    templateId: 'griffin_boots',
    label: 'Giày Điểu Sư Griffin [S]',
    rarity: Rarity.RARE,
    startBid: 22,
    buyout: 38,
  },
  {
    templateId: 'astral_crown',
    label: 'Vương Miện Tiên Tri [S]',
    rarity: Rarity.LEGENDARY,
    startBid: 68,
    buyout: 108,
  },
  {
    templateId: 'beam_staff',
    label: 'Trượng Tia Sáng (Echo)',
    rarity: Rarity.EPIC,
    startBid: 24,
    buyout: 42,
  },
  {
    templateId: 'destruction_ring',
    label: 'Nhẫn Hủy Diệt',
    rarity: Rarity.EPIC,
    startBid: 26,
    buyout: 44,
  },
];

const AUCTION_GEM_COLORS: SocketGemColor[] = ['ruby', 'sapphire', 'topaz', 'emerald'];
const AUCTION_GEM_NAMES: Record<SocketGemColor, string> = {
  ruby: 'Hồng Ngọc Chiến Thần',
  sapphire: 'Lam Ngọc Sinh Mệnh',
  topaz: 'Hoàng Ngọc Bạo Kích',
  emerald: 'Lục Ngọc Thần Tốc',
};

export function generateRotatingAuctionLots(now = Date.now()): AuctionLotItem[] {
  const lots: AuctionLotItem[] = [];
  const shuffledGears = [...AUCTION_GEAR_POOL].sort(() => Math.random() - 0.5).slice(0, 4);

  shuffledGears.forEach((spec, idx) => {
    const uid = `auc_gear_${now}_${idx}`;
    const gear: GearInstance = {
      uid,
      templateId: spec.templateId,
      rarity: spec.rarity,
      level: spec.rarity === Rarity.LEGENDARY ? 5 : 3,
      awakeningLevel: 0,
    };
    lots.push({
      id: `lot_${now}_${idx}`,
      sellerName: SELLER_ALIASES[idx % SELLER_ALIASES.length],
      itemKind: 'gear',
      gear,
      label: spec.label,
      rarity: spec.rarity,
      startingBid: spec.startBid,
      currentBid: spec.startBid,
      buyoutPrice: spec.buyout,
      highestBidderIsPlayer: false,
      playerBidAmount: 0,
      endsAt: now + (120 + idx * 75) * 1000,
      status: 'active',
    });
  });

  for (let i = 0; i < 2; i++) {
    const color = AUCTION_GEM_COLORS[Math.floor(Math.random() * AUCTION_GEM_COLORS.length)];
    const tier: 2 | 3 = i === 1 ? 3 : 2;
    const gem: SocketGemInstance = {
      uid: `auc_gem_${now}_${i}`,
      color,
      tier,
    };
    lots.push({
      id: `lot_gem_${now}_${i}`,
      sellerName: SELLER_ALIASES[(i + 4) % SELLER_ALIASES.length],
      itemKind: 'socket_gem',
      socketGem: gem,
      label: `${AUCTION_GEM_NAMES[color]} Cấp ${tier === 3 ? 'III' : 'II'}`,
      rarity: tier === 3 ? Rarity.LEGENDARY : Rarity.EPIC,
      startingBid: tier === 3 ? 40 : 20,
      currentBid: tier === 3 ? 40 : 20,
      buyoutPrice: tier === 3 ? 65 : 34,
      highestBidderIsPlayer: false,
      playerBidAmount: 0,
      endsAt: now + (180 + i * 90) * 1000,
      status: 'active',
    });
  }

  return lots;
}

export function normalizeAuctionHouse(
  ah?: Partial<AuctionHouseState>,
  now = Date.now()
): AuctionHouseState {
  const existingLots = Array.isArray(ah?.lots) ? ah.lots : [];
  const activeLots = existingLots.filter((l) => l.status === 'active');
  const lots =
    activeLots.length >= 3
      ? existingLots
      : [
          ...existingLots.filter((l) => l.isPlayerListing && l.status === 'active'),
          ...generateRotatingAuctionLots(now),
        ];

  return {
    lastRefreshAt: ah?.lastRefreshAt ?? now,
    lots,
    claimBox: Array.isArray(ah?.claimBox) ? ah.claimBox : [],
    totalTrades: ah?.totalTrades ?? 0,
  };
}

export function resolveExpiredAuctionLots(
  ah: AuctionHouseState,
  now = Date.now()
): AuctionHouseState {
  let changed = false;
  const nextClaimBox = [...ah.claimBox];
  let tradesDelta = 0;

  const nextLots: AuctionLotItem[] = [];
  for (const lot of ah.lots) {
    if (lot.status !== 'active' || lot.endsAt > now) {
      nextLots.push(lot);
      continue;
    }
    changed = true;
    if (lot.isPlayerListing) {
      // Simulated market buyer purchases ~85% of player listings at buyout/start price
      const sold = Math.random() < 0.88;
      if (sold) {
        tradesDelta++;
        nextClaimBox.push({
          id: `claim_${lot.id}_${now}`,
          title: `Bán thành công: ${lot.label}`,
          gems: lot.buyoutPrice,
          reason: 'Người mua trên Sàn Đấu Giá đã thanh toán mua đứt.',
        });
      } else {
        nextClaimBox.push({
          id: `claim_ret_${lot.id}_${now}`,
          title: `Hoàn trả ký gửi: ${lot.label}`,
          gear: lot.gear,
          socketGem: lot.socketGem,
          reason: 'Phiên đấu giá hết hạn chưa có người chốt đơn.',
        });
      }
    } else if (lot.highestBidderIsPlayer) {
      tradesDelta++;
      nextClaimBox.push({
        id: `claim_win_${lot.id}_${now}`,
        title: `Thắng đấu giá: ${lot.label}`,
        gear: lot.gear,
        socketGem: lot.socketGem,
        reason: `Chốt phiên thành công với giá ${lot.currentBid} Ngọc Hồn.`,
      });
    }
  }

  if (!changed) return ah;
  return {
    ...ah,
    lots: nextLots,
    claimBox: nextClaimBox,
    totalTrades: ah.totalTrades + tradesDelta,
  };
}

// ============================================================================
// 5. THỦ THÀNH PHA LÊ TINH LINH 3D (CRYSTAL DEFENSE)
// ============================================================================
export const CRYSTAL_DEFENSE_MAX_DAILY_RUNS = 3;
export const CRYSTAL_DEFENSE_TOTAL_WAVES = 6;

export function normalizeCrystalDefense(
  cd?: Partial<CrystalDefenseState>
): CrystalDefenseState {
  const today = getTodayKey();
  if (!cd || cd.date !== today) {
    return {
      date: today,
      runsRemaining: CRYSTAL_DEFENSE_MAX_DAILY_RUNS,
      bestWave: cd?.bestWave ?? 0,
      totalClears: cd?.totalClears ?? 0,
    };
  }
  return {
    date: today,
    runsRemaining: Math.max(0, Math.min(CRYSTAL_DEFENSE_MAX_DAILY_RUNS + 2, cd.runsRemaining ?? CRYSTAL_DEFENSE_MAX_DAILY_RUNS)),
    bestWave: cd.bestWave ?? 0,
    totalClears: cd.totalClears ?? 0,
  };
}

// ============================================================================
// 6. BOSS THẾ GIỚI LIÊN SERVER & BẢNG XẾP HẠNG VINH DANH
// ============================================================================
export const WORLD_BOSS_MAX_DAILY_RUNS = 2;

export interface WorldBossDamageMilestone {
  id: string;
  damageTarget: number;
  label: string;
  rewardGems: number;
  rewardFeathers: number;
  rewardStarDust: number;
  rewardFrame?: AvatarFrameId;
}

export const WORLD_BOSS_MILESTONES: WorldBossDamageMilestone[] = [
  {
    id: 'wb_20k',
    damageTarget: 20000,
    label: '20.000 Sát Thương',
    rewardGems: 18,
    rewardFeathers: 10,
    rewardStarDust: 40,
  },
  {
    id: 'wb_55k',
    damageTarget: 55000,
    label: '55.000 Sát Thương',
    rewardGems: 28,
    rewardFeathers: 16,
    rewardStarDust: 75,
  },
  {
    id: 'wb_100k',
    damageTarget: 100000,
    label: '100.000 Sát Thương',
    rewardGems: 40,
    rewardFeathers: 24,
    rewardStarDust: 110,
  },
  {
    id: 'wb_150k',
    damageTarget: 150000,
    label: '150.000 Sát Thương',
    rewardGems: 55,
    rewardFeathers: 32,
    rewardStarDust: 150,
  },
  {
    id: 'wb_260k',
    damageTarget: 260000,
    label: '260.000 Sát Thương',
    rewardGems: 75,
    rewardFeathers: 45,
    rewardStarDust: 200,
  },
  {
    id: 'wb_420k',
    damageTarget: 420000,
    label: '420.000 Sát Thương',
    rewardGems: 110,
    rewardFeathers: 65,
    rewardStarDust: 280,
  },
];

export function normalizeWorldBoss(wb?: Partial<WorldBossState>): WorldBossState {
  const today = getTodayKey();
  if (!wb || wb.date !== today) {
    return {
      date: today,
      dailyRunsRemaining: WORLD_BOSS_MAX_DAILY_RUNS,
      bestSingleDamage: wb?.bestSingleDamage ?? 0,
      totalDailyDamage: 0,
      claimedMilestoneIds: Array.isArray(wb?.claimedMilestoneIds) ? wb.claimedMilestoneIds : [],
    };
  }
  return {
    date: today,
    dailyRunsRemaining: Math.max(0, Math.min(WORLD_BOSS_MAX_DAILY_RUNS + 1, wb.dailyRunsRemaining ?? WORLD_BOSS_MAX_DAILY_RUNS)),
    bestSingleDamage: wb.bestSingleDamage ?? 0,
    totalDailyDamage: wb.totalDailyDamage ?? 0,
    claimedMilestoneIds: Array.isArray(wb.claimedMilestoneIds) ? wb.claimedMilestoneIds : [],
  };
}

export interface ServerLeaderEntry {
  id: string;
  rank: number;
  name: string;
  server: string;
  heroName: string;
  frameId: AvatarFrameId;
  badgeTitle: string;
  score: number;
  isPlayer?: boolean;
}

const WORLD_BOSS_BENCHMARKS = [
  { name: 'ThánhQuang_S1', server: 'S1·Bạch Dương', heroName: 'Alice', frameId: 'seraph_crown' as AvatarFrameId, badgeTitle: 'Chí Tôn Lực Chiến', score: 385000 },
  { name: 'LongVương_S3', server: 'S3·Sư Tử', heroName: 'Thor', frameId: 'world_dragon' as AvatarFrameId, badgeTitle: 'Đồ Long Liên Giới', score: 312000 },
  { name: 'NguyệtẢnh_S2', server: 'S2·Thiên Bình', heroName: 'Cleo', frameId: 'royal_vip' as AvatarFrameId, badgeTitle: 'Quân Vương Hoàng Đạo', score: 248000 },
  { name: 'BăngTâm_S5', server: 'S5·Bảo Bình', heroName: 'Rolla', frameId: 'crystal_guardian' as AvatarFrameId, badgeTitle: 'Chúa Tể Thiên Dực', score: 192000 },
  { name: 'HỏaPhượng_S4', server: 'S4·Nhân Mã', heroName: 'Wukong', frameId: 'royal_vip' as AvatarFrameId, badgeTitle: 'Thương Nhân Tinh Giới', score: 146000 },
  { name: 'HuyềnVũ_S1', server: 'S1·Ma Kết', heroName: 'Alex', frameId: 'astral_crescent' as AvatarFrameId, badgeTitle: 'Thành Trì Bất Hoại', score: 98000 },
  { name: 'TinhVân_S6', server: 'S6·Song Ngư', heroName: 'Dracoola', frameId: 'astral_crescent' as AvatarFrameId, badgeTitle: 'Thợ Săn Sao', score: 62000 },
  { name: 'LụcKiếm_S7', server: 'S7·Kim Ngưu', heroName: 'Atreus', frameId: 'default_gold' as AvatarFrameId, badgeTitle: 'Chiến Thần Ánh Sáng', score: 32000 },
];

export function computeWorldBossLiveRank(damage: number): number {
  let rank = 1;
  for (const row of WORLD_BOSS_BENCHMARKS) {
    if (damage < row.score) rank++;
  }
  return rank;
}

export type HonorBoardTab = 'power' | 'world_boss' | 'arena' | 'tower';

export function buildHonorLeaderboard(
  tab: HonorBoardTab,
  save: SaveData,
  powerRating: number,
  heroName: string
): ServerLeaderEntry[] {
  const playerScore =
    tab === 'power'
      ? powerRating
      : tab === 'world_boss'
      ? save.worldBoss?.bestSingleDamage ?? 0
      : tab === 'arena'
      ? save.arena?.rating ?? 1000
      : save.bestTowerFloor ?? 0;

  const mult =
    tab === 'power'
      ? 0.017
      : tab === 'world_boss'
      ? 1
      : tab === 'arena'
      ? 0.0055
      : 0.00012;

  const offset = tab === 'arena' ? 950 : tab === 'tower' ? 4 : 0;

  const entries: Omit<ServerLeaderEntry, 'rank'>[] = WORLD_BOSS_BENCHMARKS.map((b, idx) => ({
    id: `npc_${tab}_${idx}`,
    name: b.name,
    server: b.server,
    heroName: b.heroName,
    frameId: b.frameId,
    badgeTitle: b.badgeTitle,
    score: Math.round(offset + b.score * mult),
  }));

  const badgeTitle = save.equippedMythicBadgeId
    ? MYTHIC_BADGE_MAP[save.equippedMythicBadgeId]?.title ?? save.equippedTitle ?? 'Tân Binh Tinh Giới'
    : save.equippedTitle ?? 'Tân Binh Tinh Giới';

  entries.push({
    id: 'player_self',
    name: 'Bạn (Chiến Binh)',
    server: 'S1·Tinh Giới',
    heroName,
    frameId: save.equippedAvatarFrameId ?? 'default_gold',
    badgeTitle,
    score: playerScore,
    isPlayer: true,
  });

  entries.sort((a, b) => b.score - a.score);
  return entries.map((e, idx) => ({ ...e, rank: idx + 1 }));
}

import { HEROES, HERO_MAP } from './heroesData';
import { getTodayKey } from './questsData';
import {
  ArenaOpponent,
  ArenaState,
  NightMarketOffer,
  NightMarketState,
  NoviceJourneyState,
  Rarity,
  SaveData,
  SocketGemColor,
  SocketGemInstance,
  SocketGemTier,
} from '../types/game';

// =========================================================
// 1. 3-TIER SOCKET GEM SYSTEM
// =========================================================

export interface SocketGemDef {
  color: SocketGemColor;
  name: string;
  statShort: string;
  hex: string;
  textClass: string;
  borderClass: string;
  bgClass: string;
  atkPerTier: number[]; // [T1, T2, T3]
  hpPerTier: number[];
  critPerTier: number[];
  aspdPerTier: number[];
  drPerTier: number[];
}

export const SOCKET_GEM_META: Record<SocketGemColor, SocketGemDef> = {
  ruby: {
    color: 'ruby',
    name: 'Hồng Ngọc Liệt Hỏa',
    statShort: 'ATK',
    hex: '#fb7185',
    textClass: 'text-rose-300',
    borderClass: 'border-rose-400/60',
    bgClass: 'bg-rose-950/60',
    atkPerTier: [16, 36, 74],
    hpPerTier: [0, 0, 0],
    critPerTier: [0, 0, 0],
    aspdPerTier: [0, 0, 0],
    drPerTier: [0, 0, 0],
  },
  sapphire: {
    color: 'sapphire',
    name: 'Lam Bảo Thạch Hộ Mệnh',
    statShort: 'HP',
    hex: '#38bdf8',
    textClass: 'text-sky-300',
    borderClass: 'border-sky-400/60',
    bgClass: 'bg-sky-950/60',
    atkPerTier: [0, 0, 0],
    hpPerTier: [85, 195, 420],
    critPerTier: [0, 0, 0],
    aspdPerTier: [0, 0, 0],
    drPerTier: [0, 0, 0],
  },
  topaz: {
    color: 'topaz',
    name: 'Hoàng Ngọc Thiên Nhãn',
    statShort: 'Crit',
    hex: '#fbbf24',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-400/60',
    bgClass: 'bg-amber-950/60',
    atkPerTier: [0, 0, 0],
    hpPerTier: [0, 0, 0],
    critPerTier: [0.025, 0.055, 0.1],
    aspdPerTier: [0, 0, 0],
    drPerTier: [0, 0, 0],
  },
  emerald: {
    color: 'emerald',
    name: 'Lục Bảo Tinh Phong',
    statShort: 'ASPD & Giáp',
    hex: '#34d399',
    textClass: 'text-emerald-300',
    borderClass: 'border-emerald-400/60',
    bgClass: 'bg-emerald-950/60',
    atkPerTier: [0, 0, 0],
    hpPerTier: [0, 0, 0],
    critPerTier: [0, 0, 0],
    aspdPerTier: [0.04, 0.085, 0.15],
    drPerTier: [0.015, 0.03, 0.055],
  },
};

export const SOCKET_GEM_COLORS: SocketGemColor[] = ['ruby', 'sapphire', 'topaz', 'emerald'];

export function getMaxGemSocketsForRarity(rarity: Rarity): number {
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

export function getSocketGemBonuses(gem: SocketGemInstance) {
  const def = SOCKET_GEM_META[gem.color];
  const idx = Math.max(0, Math.min(2, gem.tier - 1));
  return {
    atk: def.atkPerTier[idx],
    hp: def.hpPerTier[idx],
    critChance: def.critPerTier[idx],
    attackSpeed: def.aspdPerTier[idx],
    damageReduction: def.drPerTier[idx],
  };
}

export function getSocketGemLabel(gem: SocketGemInstance): string {
  const b = getSocketGemBonuses(gem);
  const parts: string[] = [];
  if (b.atk > 0) parts.push(`+${b.atk} ATK`);
  if (b.hp > 0) parts.push(`+${b.hp} HP`);
  if (b.critChance > 0) parts.push(`+${Math.round(b.critChance * 1000) / 10}% Crit`);
  if (b.attackSpeed > 0) parts.push(`+${Math.round(b.attackSpeed * 100)}% ASPD`);
  if (b.damageReduction > 0) parts.push(`+${Math.round(b.damageReduction * 1000) / 10}% Giáp`);
  return parts.join(' · ');
}

export function getSocketGemTierRoman(tier: SocketGemTier): string {
  return tier === 3 ? 'III' : tier === 2 ? 'II' : 'I';
}

export function createSocketGem(color: SocketGemColor, tier: SocketGemTier = 1): SocketGemInstance {
  return {
    uid: `sgem_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    color,
    tier,
  };
}

export function normalizeSocketGems(gems?: SocketGemInstance[]): SocketGemInstance[] {
  if (!Array.isArray(gems)) return [];
  return gems.filter(
    (g) => Boolean(g?.uid) && Boolean(SOCKET_GEM_META[g.color]) && (g.tier === 1 || g.tier === 2 || g.tier === 3)
  );
}

export function getSocketGemCraftCost(tier: SocketGemTier): { starDust: number; gold: number } {
  return tier === 1 ? { starDust: 35, gold: 80 } : { starDust: 85, gold: 180 };
}

// =========================================================
// 2. ZODIAC NIGHT MARKET & CUMULATIVE SPEND MILESTONES
// =========================================================

export const NIGHT_MARKET_POOL: NightMarketOffer[] = [
  {
    id: 'nm_dust_bundle',
    title: 'Hộp Bụi Tinh Tú Đêm Khuya',
    subtitle: '140 Bụi Tinh Tú giúp Tẩy Luyện & Rèn Thánh Vật.',
    badge: 'GIẢM 55%',
    currency: 'gold',
    originalPrice: 480,
    price: 215,
    discountPct: 55,
    maxPurchases: 2,
    rewardKind: 'star_dust',
    amount: 140,
  },
  {
    id: 'nm_gem_t2',
    title: 'Bảo Thạch Tinh Anh Tầng II',
    subtitle: 'Nhận ngẫu nhiên 1 Bảo Thạch Cấp II (Hồng/Lam/Hoàng/Lục).',
    badge: 'GIÁ SỐC',
    currency: 'gems',
    originalPrice: 65,
    price: 28,
    discountPct: 57,
    maxPurchases: 2,
    rewardKind: 'socket_gem_t2',
    amount: 1,
  },
  {
    id: 'nm_destiny_tickets',
    title: 'Cặp Vé Vòng Quay Vận Mệnh',
    subtitle: 'Nhận 2 Vé Quay Vòng Quay Thiên Mệnh (trị giá 40 Ngọc).',
    badge: 'GIẢM 45%',
    currency: 'gems',
    originalPrice: 40,
    price: 22,
    discountPct: 45,
    maxPurchases: 2,
    rewardKind: 'destiny_ticket',
    amount: 2,
  },
  {
    id: 'nm_pet_essence',
    title: 'Bình Tinh Chất Tinh Linh',
    subtitle: '90 Tinh Chất dùng nâng cấp cấp độ Tinh Linh 3D.',
    badge: 'GIẢM 50%',
    currency: 'gold',
    originalPrice: 520,
    price: 260,
    discountPct: 50,
    maxPurchases: 2,
    rewardKind: 'pet_essence',
    amount: 90,
  },
  {
    id: 'nm_arena_tickets',
    title: 'Lệnh Bài Đấu Trường Arena',
    subtitle: 'Bổ sung thêm 3 Vé Thách Đấu Đấu Trường Xếp Hạng.',
    badge: 'ƯU ĐÃI',
    currency: 'gold',
    originalPrice: 360,
    price: 165,
    discountPct: 54,
    maxPurchases: 2,
    rewardKind: 'arena_ticket',
    amount: 3,
  },
  {
    id: 'nm_stier_chest',
    title: 'Rương Thánh Vật [S] Chợ Đêm',
    subtitle: 'Mở ra chắc chắn 1 Trang Bị Sử Thi [S] Hoàng Đạo.',
    badge: 'ĐỘC QUYỀN -60%',
    currency: 'gems',
    originalPrice: 160,
    price: 64,
    discountPct: 60,
    maxPurchases: 1,
    rewardKind: 'gear_s',
    amount: 1,
  },
];

export function getDailyNightMarketOffers(dateKey: string): NightMarketOffer[] {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 37 + dateKey.charCodeAt(i)) % 991;
  }
  const picks: NightMarketOffer[] = [];
  for (let i = 0; i < 4; i++) {
    const idx = (hash + i * 2) % NIGHT_MARKET_POOL.length;
    const candidate = NIGHT_MARKET_POOL[idx];
    if (!picks.some((p) => p.id === candidate.id)) {
      picks.push(candidate);
    } else {
      const alt = NIGHT_MARKET_POOL[(idx + 1) % NIGHT_MARKET_POOL.length];
      if (!picks.some((p) => p.id === alt.id)) picks.push(alt);
    }
  }
  // Always ensure the S-Tier exclusive offer is featured if not already picked
  const sChest = NIGHT_MARKET_POOL[NIGHT_MARKET_POOL.length - 1];
  if (!picks.some((p) => p.id === sChest.id)) {
    picks[picks.length - 1] = sChest;
  }
  return picks;
}

export const CUMULATIVE_SPEND_MILESTONES = [
  {
    gems: 80,
    title: 'Mốc 80 Ngọc Tiêu Dùng',
    rewardLabel: '+120 Bụi Sao + 1 Bảo Thạch Cấp II',
    gold: 280,
    starDust: 120,
    gemTier2: true,
    gearS: false,
    titleUnlock: '',
  },
  {
    gems: 220,
    title: 'Mốc 220 Ngọc Tiêu Dùng',
    rewardLabel: '+2 Vé Quay + 100 Tinh Chất',
    gold: 480,
    starDust: 140,
    destinyTickets: 2,
    petEssence: 100,
    gemTier2: false,
    gearS: false,
    titleUnlock: '',
  },
  {
    gems: 480,
    title: 'Mốc 480 Ngọc Tiêu Dùng',
    rewardLabel: 'Trang Bị [S] Sử Thi + 200 Bụi Sao',
    gold: 750,
    starDust: 200,
    gemTier2: false,
    gearS: true,
    gearRarity: Rarity.EPIC,
    titleUnlock: 'Thương Nhân Tinh Tú',
  },
  {
    gems: 900,
    title: 'Mốc 900 Ngọc Tiêu Dùng',
    rewardLabel: '1 Bảo Thạch Thần Thoại Tầng III + 300 Bụi Sao',
    gold: 1100,
    starDust: 300,
    gemTier3: true,
    gemTier2: false,
    gearS: false,
    titleUnlock: '',
  },
  {
    gems: 1500,
    title: 'Mốc 1.500 Ngọc Tiêu Dùng',
    rewardLabel: 'Thánh Vật [S] Huyền Thoại + Danh Hiệu Chí Tôn',
    gold: 1800,
    starDust: 420,
    gemTier2: false,
    gearS: true,
    gearRarity: Rarity.LEGENDARY,
    titleUnlock: 'Chúa Tể Chợ Đêm',
  },
];

export function normalizeNightMarket(nm?: Partial<NightMarketState>): NightMarketState {
  const today = getTodayKey();
  const sameDay = nm?.date === today;
  return {
    date: today,
    purchasedCounts: sameDay && nm?.purchasedCounts ? nm.purchasedCounts : {},
    totalGemsSpent: nm?.totalGemsSpent ?? 0,
    claimedSpendMilestones: Array.isArray(nm?.claimedSpendMilestones) ? nm.claimedSpendMilestones : [],
  };
}

// =========================================================
// 3. ASYNCHRONOUS RANKED PVP ARENA (3D 1V1 DUEL)
// =========================================================

export const MAX_DAILY_ARENA_TICKETS = 5;
export const ARENA_DURATION_SEC = 45;

export const ARENA_RANK_TIERS = [
  { id: 'ar_bronze', name: 'Đồng Tinh', minRating: 1000, rewardGems: 15, rewardGold: 220, colorClass: 'text-emerald-300' },
  { id: 'ar_silver', name: 'Bạch Ngân', minRating: 1120, rewardGems: 24, rewardGold: 350, colorClass: 'text-sky-300' },
  { id: 'ar_gold', name: 'Hoàng Kim', minRating: 1280, rewardGems: 35, rewardGold: 520, colorClass: 'text-amber-300' },
  { id: 'ar_diamond', name: 'Kim Cương', minRating: 1480, rewardGems: 50, rewardGold: 750, colorClass: 'text-purple-300' },
  { id: 'ar_starlord', name: 'Tinh Quân', minRating: 1750, rewardGems: 70, rewardGold: 1050, colorClass: 'text-rose-300' },
];

export function getArenaRankInfo(rating: number) {
  let matched = ARENA_RANK_TIERS[0];
  for (const t of ARENA_RANK_TIERS) {
    if (rating >= t.minRating) matched = t;
  }
  return matched;
}

export const ARENA_LADDER_RIVALS = [
  { name: 'Thiên Lang Vô Song', title: 'Chiến Thần Ánh Sáng', heroId: 'wukong' as const, rating: 1680, powerRating: 3450 },
  { name: 'Nguyệt Ảnh Linh Cơ', title: 'Chúa Tể Kho Báu', heroId: 'aurelia' as const, rating: 1460, powerRating: 2550 },
  { name: 'Lôi Đế Bất Bại', title: 'Thợ Săn Thủ Lĩnh', heroId: 'thor' as const, rating: 1310, powerRating: 1920 },
  { name: 'Băng Hậu Tinh Vân', title: 'Hộ Vệ Tinh Tú', heroId: 'rolla' as const, rating: 1170, powerRating: 1380 },
  { name: 'Huyết Nguyệt Kỵ Sĩ', title: 'Vũ Điệu Liên Kích', heroId: 'dracoola' as const, rating: 1060, powerRating: 960 },
];

export function normalizeArena(a?: Partial<ArenaState>): ArenaState {
  const today = getTodayKey();
  const sameDay = a?.ticketsDate === today;
  return {
    rating: a?.rating ?? 1000,
    wins: a?.wins ?? 0,
    losses: a?.losses ?? 0,
    streak: a?.streak ?? 0,
    bestRating: a?.bestRating ?? 1000,
    arenaCoins: a?.arenaCoins ?? 0,
    ticketsDate: today,
    ticketsRemaining: sameDay
      ? Math.max(0, Math.min(15, a?.ticketsRemaining ?? MAX_DAILY_ARENA_TICKETS))
      : MAX_DAILY_ARENA_TICKETS,
    claimedRankTiers: Array.isArray(a?.claimedRankTiers) ? a.claimedRankTiers : [],
  };
}

export function generateArenaOpponents(playerRating: number, playerPower: number): ArenaOpponent[] {
  const tiers = [
    { idSuffix: 'easy', label: 'Thử Thách Nhẹ', ratingDelta: -25, powerMult: 0.78, hpScale: 0.92, atkScale: 0.76, rewardPts: 22, coins: 30 },
    { idSuffix: 'even', label: 'Ngang Tài Cân Sức', ratingDelta: 35, powerMult: 1.0, hpScale: 1.15, atkScale: 0.94, rewardPts: 32, coins: 45 },
    { idSuffix: 'hard', label: 'Cao Thủ Đỉnh Cao', ratingDelta: 110, powerMult: 1.24, hpScale: 1.38, atkScale: 1.12, rewardPts: 48, coins: 68 },
  ];

  const poolNames = [
    'Bạch Dương Kiếm Khách',
    'Tinh Vân Xạ Thủ',
    'Nhật Thực Pháp Sư',
    'Hải Vương Du Hiệp',
    'Lôi Minh Đấu Sĩ',
    'Thiên Yết Sát Thủ',
  ];

  return tiers.map((tier, idx) => {
    const hero = HEROES[(Math.floor(playerRating / 25) + idx * 2) % HEROES.length] ?? HERO_MAP.aurelia;
    const weaponArchetype: ArenaOpponent['weaponArchetype'] = 'bow';
    const oppPower = Math.max(420, Math.round(playerPower * tier.powerMult));
    const oppRating = Math.max(920, playerRating + tier.ratingDelta);
    const maxHp = Math.round((560 + oppPower * 0.42) * tier.hpScale);
    const attack = Math.round((26 + oppPower * 0.018) * tier.atkScale);

    return {
      id: `arena_opp_${tier.idSuffix}_${idx}`,
      name: poolNames[(Math.floor(playerRating / 10) + idx) % poolNames.length],
      title: tier.label,
      heroId: hero.id,
      rating: oppRating,
      powerRating: oppPower,
      maxHp,
      attack,
      speedMult: 0.94 + idx * 0.06,
      weaponArchetype,
      accentHex: hero.accentHex,
      cloakHex: hero.cloakHex,
      hairHex: hero.hairHex,
      rewardPoints: tier.rewardPts,
      rewardArenaCoins: tier.coins,
    };
  });
}

// =========================================================
// 4. 7-DAY NOVICE JOURNEY TRACK
// =========================================================

export type JourneyMetric =
  | 'totalRuns'
  | 'totalKills'
  | 'highestChapterCleared'
  | 'totalChestsOpened'
  | 'gearUpgradedLevel'
  | 'socketedCount'
  | 'powerRating'
  | 'arenaWins'
  | 'bestTowerFloor'
  | 'guildTributes'
  | 'destinySpins';

export interface JourneyTaskDef {
  id: string;
  day: number;
  title: string;
  metric: JourneyMetric;
  target: number;
  rewardGold: number;
  rewardGems: number;
  rewardDust: number;
}

export interface JourneyDayDef {
  day: number;
  title: string;
  subtitle: string;
  tasks: JourneyTaskDef[];
  milestoneGold: number;
  milestoneGems: number;
  milestoneDust: number;
  milestoneLabel: string;
  milestoneGearS?: boolean;
}

export const NOVICE_JOURNEY_DAYS: JourneyDayDef[] = [
  {
    day: 1,
    title: 'Ngày 1 · Khởi Hành Tinh Giới',
    subtitle: 'Làm quen chiến trường và tiêu diệt quái vật đầu tiên.',
    tasks: [
      { id: 'j_d1_1', day: 1, title: 'Tham gia ít nhất 1 trận chiến đấu', metric: 'totalRuns', target: 1, rewardGold: 120, rewardGems: 10, rewardDust: 20 },
      { id: 'j_d1_2', day: 1, title: 'Tiêu diệt 25 quái vật Hoàng Đạo', metric: 'totalKills', target: 25, rewardGold: 150, rewardGems: 12, rewardDust: 25 },
      { id: 'j_d1_3', day: 1, title: 'Chinh phục trọn vẹn Chương 1', metric: 'highestChapterCleared', target: 1, rewardGold: 220, rewardGems: 18, rewardDust: 35 },
    ],
    milestoneGold: 250,
    milestoneGems: 25,
    milestoneDust: 50,
    milestoneLabel: 'Rương Ngày 1 · 25 Ngọc + 50 Bụi',
  },
  {
    day: 2,
    title: 'Ngày 2 · Rèn Đúc Trang Bị',
    subtitle: 'Cường hóa trang bị và khai mở Rương Kho Báu.',
    tasks: [
      { id: 'j_d2_1', day: 2, title: 'Đạt cấp trang bị cao nhất ≥ 5', metric: 'gearUpgradedLevel', target: 5, rewardGold: 160, rewardGems: 12, rewardDust: 30 },
      { id: 'j_d2_2', day: 2, title: 'Mở tổng cộng 3 Rương Kho Báu', metric: 'totalChestsOpened', target: 3, rewardGold: 180, rewardGems: 15, rewardDust: 30 },
      { id: 'j_d2_3', day: 2, title: 'Đạt 850 Lực Chiến (LC)', metric: 'powerRating', target: 850, rewardGold: 220, rewardGems: 20, rewardDust: 40 },
    ],
    milestoneGold: 300,
    milestoneGems: 30,
    milestoneDust: 65,
    milestoneLabel: 'Rương Ngày 2 · 30 Ngọc + 65 Bụi',
  },
  {
    day: 3,
    title: 'Ngày 3 · Bảo Thạch & Bang Hội',
    subtitle: 'Khảm Bảo Thạch lên trang bị và đồng hành cùng Bang Hội.',
    tasks: [
      { id: 'j_d3_1', day: 3, title: 'Khảm ít nhất 1 Bảo Thạch vào trang bị', metric: 'socketedCount', target: 1, rewardGold: 180, rewardGems: 15, rewardDust: 35 },
      { id: 'j_d3_2', day: 3, title: 'Cống hiến Bang Hội 1 lần hôm nay', metric: 'guildTributes', target: 1, rewardGold: 200, rewardGems: 16, rewardDust: 35 },
      { id: 'j_d3_3', day: 3, title: 'Tiêu diệt tổng cộng 80 quái vật', metric: 'totalKills', target: 80, rewardGold: 240, rewardGems: 20, rewardDust: 45 },
    ],
    milestoneGold: 360,
    milestoneGems: 35,
    milestoneDust: 80,
    milestoneLabel: 'Rương Ngày 3 · 35 Ngọc + 80 Bụi',
  },
  {
    day: 4,
    title: 'Ngày 4 · Đấu Trường & Vận Mệnh',
    subtitle: 'Thử sức tại Đấu Trường 1v1 và Vòng Quay Vận Mệnh.',
    tasks: [
      { id: 'j_d4_1', day: 4, title: 'Thắng ít nhất 1 trận Đấu Trường Arena', metric: 'arenaWins', target: 1, rewardGold: 220, rewardGems: 18, rewardDust: 40 },
      { id: 'j_d4_2', day: 4, title: 'Quay Vòng Quay Vận Mệnh 2 lần', metric: 'destinySpins', target: 2, rewardGold: 200, rewardGems: 18, rewardDust: 45 },
      { id: 'j_d4_3', day: 4, title: 'Hoàn thành Chương 2: Thánh Điện Thiên Yết', metric: 'highestChapterCleared', target: 2, rewardGold: 260, rewardGems: 24, rewardDust: 55 },
    ],
    milestoneGold: 420,
    milestoneGems: 40,
    milestoneDust: 95,
    milestoneLabel: 'Rương Ngày 4 · 40 Ngọc + 95 Bụi',
  },
  {
    day: 5,
    title: 'Ngày 5 · Leo Tháp Vô Tận',
    subtitle: 'Khẳng định bản lĩnh tại Tháp Vô Tận và khảm thêm ngọc.',
    tasks: [
      { id: 'j_d5_1', day: 5, title: 'Chinh phục Tầng 4 Tháp Vô Tận', metric: 'bestTowerFloor', target: 4, rewardGold: 250, rewardGems: 22, rewardDust: 50 },
      { id: 'j_d5_2', day: 5, title: 'Khảm tối thiểu 2 Bảo Thạch lên đồ', metric: 'socketedCount', target: 2, rewardGold: 240, rewardGems: 20, rewardDust: 50 },
      { id: 'j_d5_3', day: 5, title: 'Đạt 1.350 Lực Chiến (LC)', metric: 'powerRating', target: 1350, rewardGold: 280, rewardGems: 25, rewardDust: 60 },
    ],
    milestoneGold: 500,
    milestoneGems: 50,
    milestoneDust: 115,
    milestoneLabel: 'Rương Ngày 5 · 50 Ngọc + 115 Bụi',
  },
  {
    day: 6,
    title: 'Ngày 6 · Chinh Phạt Đỉnh Cao',
    subtitle: 'Bứt phá sức mạnh cùng Rương & Đấu Trường xếp hạng.',
    tasks: [
      { id: 'j_d6_1', day: 6, title: 'Mở tổng cộng 10 Rương Kho Báu', metric: 'totalChestsOpened', target: 10, rewardGold: 300, rewardGems: 25, rewardDust: 65 },
      { id: 'j_d6_2', day: 6, title: 'Thắng tổng cộng 3 trận Đấu Trường Arena', metric: 'arenaWins', target: 3, rewardGold: 320, rewardGems: 28, rewardDust: 70 },
      { id: 'j_d6_3', day: 6, title: 'Hoàn thành Chương 3 trở lên', metric: 'highestChapterCleared', target: 3, rewardGold: 380, rewardGems: 32, rewardDust: 80 },
    ],
    milestoneGold: 620,
    milestoneGems: 65,
    milestoneDust: 140,
    milestoneLabel: 'Rương Ngày 6 · 65 Ngọc + 140 Bụi',
  },
  {
    day: 7,
    title: 'Ngày 7 · Truyền Nhân Hoàng Đạo',
    subtitle: 'Hoàn tất Hành Trình Tân Thủ để nhận Vũ Khí [S] Độc Quyền!',
    tasks: [
      { id: 'j_d7_1', day: 7, title: 'Đạt 1.800 Lực Chiến (LC) tổng hợp', metric: 'powerRating', target: 1800, rewardGold: 400, rewardGems: 35, rewardDust: 90 },
      { id: 'j_d7_2', day: 7, title: 'Tiêu diệt tổng cộng 220 quái vật', metric: 'totalKills', target: 220, rewardGold: 420, rewardGems: 35, rewardDust: 90 },
      { id: 'j_d7_3', day: 7, title: 'Chinh phục Tầng 7 Tháp Vô Tận', metric: 'bestTowerFloor', target: 7, rewardGold: 480, rewardGems: 45, rewardDust: 110 },
    ],
    milestoneGold: 1000,
    milestoneGems: 120,
    milestoneDust: 220,
    milestoneLabel: 'Đại Thưởng Ngày 7 · Vũ Khí [S] Sử Thi + 120 Ngọc!',
    milestoneGearS: true,
  },
];

export function normalizeNoviceJourney(j?: Partial<NoviceJourneyState>): NoviceJourneyState {
  return {
    claimedTaskIds: Array.isArray(j?.claimedTaskIds) ? j.claimedTaskIds : [],
    claimedDayMilestones: Array.isArray(j?.claimedDayMilestones) ? j.claimedDayMilestones : [],
  };
}

export function getJourneyTaskCurrentValue(
  save: SaveData,
  powerRating: number,
  metric: JourneyMetric
): number {
  switch (metric) {
    case 'totalRuns':
      return save.career?.totalRuns ?? 0;
    case 'totalKills':
      return save.career?.totalKills ?? 0;
    case 'highestChapterCleared':
      return save.highestChapterCleared;
    case 'totalChestsOpened':
      return save.career?.totalChestsOpened ?? 0;
    case 'gearUpgradedLevel':
      return save.inventory.reduce((mx, g) => Math.max(mx, g.level), 1);
    case 'socketedCount':
      return save.inventory.reduce((sum, g) => sum + (g.socketedGems?.length ?? 0), 0);
    case 'powerRating':
      return powerRating;
    case 'arenaWins':
      return save.arena?.wins ?? 0;
    case 'bestTowerFloor':
      return save.bestTowerFloor ?? 0;
    case 'guildTributes':
      return save.guild?.tributeCountToday ?? 0;
    case 'destinySpins':
      return save.destinyWheel?.totalSpins ?? 0;
  }
}

export function countClaimableJourneyRewards(save: SaveData, powerRating: number): number {
  const j = normalizeNoviceJourney(save.noviceJourney);
  const claimedTasks = new Set(j.claimedTaskIds);
  const claimedDays = new Set(j.claimedDayMilestones);
  let count = 0;

  for (const day of NOVICE_JOURNEY_DAYS) {
    let dayDoneCount = 0;
    for (const t of day.tasks) {
      const done = getJourneyTaskCurrentValue(save, powerRating, t.metric) >= t.target;
      if (done) dayDoneCount++;
      if (done && !claimedTasks.has(t.id)) count++;
    }
    if (dayDoneCount >= day.tasks.length && !claimedDays.has(day.day)) {
      count++;
    }
  }
  return count;
}

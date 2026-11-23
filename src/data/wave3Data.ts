import {
  AuraDefinition,
  AuraStyleId,
  DailyRiftMutatorPair,
  DailyRiftState,
  ForgeRecipe,
  GearInstance,
  HeroSkinDefinition,
  HeroSkinId,
  PetDefinition,
  PetId,
  PetInstance,
  Rarity,
  VipState,
} from '../types/game';
import { getTodayKey } from './questsData';

export const PETS_CATALOG: PetDefinition[] = [
  {
    id: 'jade_calf',
    name: 'Tiểu Ngưu Ngọc Bích',
    title: 'Tinh Linh Ngọc Lục Bảo',
    element: 'earth',
    rarity: 'Huyền Thoại',
    desc: 'Tinh linh Kim Ngưu kết tinh từ lõi ngọc bích, bay hộ vệ và bắn tinh tiễn lục bảo tăng chí mạng.',
    skillName: 'Ngọc Tiễn Địa Mạch',
    skillDesc: 'Phóng tia tinh quang lục bảo mỗi 0.90s gây 95% ATK và tăng 6% Chí Mạng.',
    baseAtk: 28,
    baseHp: 135,
    baseCrit: 0.065,
    unlockGems: 0,
    unlockGold: 0,
    primaryHex: 0x10b981,
    secondaryHex: 0xfde68a,
    fireInterval: 0.9,
  },
  {
    id: 'pyro', name: 'Pyro', title: 'Tinh Linh Dương Hỏa', element: 'fire',
    rarity: 'Huyền Thoại',
    desc: 'Dương con hỏa vũ đồng hành với người chinh phục Hỏa Sơn Sừng Đỏ.',
    skillName: 'Hỏa Tiễn', skillDesc: 'Bắn hỏa tiễn vào mục tiêu gần nhất.',
    baseAtk: 26, baseHp: 125, baseCrit: 0.06, unlockGems: 0, unlockGold: 0,
    primaryHex: 0xf97316, secondaryHex: 0xffdd8a, fireInterval: 0.92,
  },
  {
    id: 'astraeo',
    name: 'Astraeo',
    title: 'Tinh Linh Nhật Luân Sư Tử',
    element: 'star',
    rarity: 'Huyền Thoại',
    desc: 'Tinh linh Thái Dương Chương 1 bay hộ vệ sát vai, phóng luồng tia Regulus xuyên phá và tăng bạo kích.',
    skillName: 'Quang Tiễn Regulus',
    skillDesc: 'Phóng tia tinh quang Thái Dương mỗi 0.92s gây 92% ATK và tăng 6% Chí Mạng.',
    baseAtk: 26,
    baseHp: 125,
    baseCrit: 0.06,
    unlockGems: 0,
    unlockGold: 0,
    primaryHex: 0xf59e0b,
    secondaryHex: 0xfef3c7,
    fireInterval: 0.92,
  },
];

export const PET_MAP: Record<PetId, PetDefinition> = Object.fromEntries(
  PETS_CATALOG.map((p) => [p.id, p])
) as Record<PetId, PetDefinition>;

export function getPetStats(petId: PetId, level: number) {
  const def = PET_MAP[petId];
  if (!def) {
    return { atk: 0, hp: 0, crit: 0 };
  }
  const scale = 1 + (Math.max(1, level) - 1) * 0.16;
  return {
    atk: Math.round(def.baseAtk * scale),
    hp: Math.round(def.baseHp * scale),
    crit: def.baseCrit + Math.floor((Math.max(1, level) - 1) / 5) * 0.01,
  };
}

export function getPetUpgradeCost(level: number): { essence: number; gold: number } {
  return {
    essence: 12 + level * 8,
    gold: 60 + level * 45,
  };
}

export const HERO_SKINS: HeroSkinDefinition[] = [
  {
    id: 'venus_incarnate',
    heroId: 'sylvia',
    name: 'Thánh Y Hóa Thân Kim Tinh',
    badge: 'CHƯƠNG 3 · TRANG PHỤC',
    desc: 'Thánh Y Hóa Thân Kim Tinh dát vàng ngọc bích dành riêng cho Thánh Nữ Ngọc Lục Bảo Sylvia.',
    unlockGems: 0,
    unlockGold: 0,
    cloakHex: 0x047857,
    accentHex: 0xfbbf24,
    hairHex: 0xfef3c7,
    atkBonus: 24,
    hpBonus: 120,
  },
  {
    id: 'golden_fleece', heroId: 'bellona', name: 'Hoàng Bào Kim Dương',
    badge: 'CHƯƠNG 2 · TRANG PHỤC', desc: 'Golden Fleece Empress Regalia dành riêng cho Bellona.',
    unlockGems: 0, unlockGold: 0, atkBonus: 0, hpBonus: 0,
  },
  {
    id: 'aurelia_oasis_dancer',
    heroId: 'aurelia',
    name: 'Vũ Công Ốc Đảo Hoàng Kim',
    badge: 'CHƯƠNG 1 · SỬ THI',
    desc: 'Golden Oasis Sun Dancer — Bộ lễ phục lụa vàng ốc đảo sa mạc rực ánh bình minh dành riêng cho Aurelia.',
    unlockGems: 0,
    unlockGold: 0,
    cloakHex: 0xd97706,
    accentHex: 0xfde047,
    hairHex: 0xfef08a,
    atkBonus: 18,
    hpBonus: 75,
  },
  {
    id: 'aurelia_temple_commander',
    heroId: 'aurelia',
    name: 'Thống Soái Đền Mặt Trời',
    badge: 'CHƯƠNG 1 · HUYỀN THOẠI',
    desc: 'Royal Sun-Temple Commander — Chiến giáp hoàng gia Đền Thờ Mặt Trời uy nghiêm của thống soái Sư Tử.',
    unlockGems: 0,
    unlockGold: 0,
    cloakHex: 0x991b1b,
    accentHex: 0xf59e0b,
    hairHex: 0xfde68a,
    atkBonus: 22,
    hpBonus: 95,
  },
  {
    id: 'aurelia_solaris_valkyrie',
    heroId: 'aurelia',
    name: 'Chiến Thần Solaris Valkyrie',
    badge: 'CHƯƠNG 1 · THẦN THOẠI',
    desc: 'Solaris Valkyrie Regalia — Thánh giáp Nữ Thần Chiến Tranh rực lửa nhật hoa tối thượng.',
    unlockGems: 0,
    unlockGold: 0,
    cloakHex: 0xb45309,
    accentHex: 0xfbbf24,
    hairHex: 0xfffbeb,
    atkBonus: 26,
    hpBonus: 110,
  },
  {
    id: 'aurelia_winter_solstice',
    heroId: 'aurelia',
    name: 'Nữ Hoàng Băng Tinh Đông Chí',
    badge: 'CHƯƠNG 1 · CHÍ TÔN',
    desc: 'Winter Solstice Crystal Sovereign — Thánh bào pha lê băng tuyết hoàng kim tỏa hào quang Đông Chí.',
    unlockGems: 0,
    unlockGold: 0,
    cloakHex: 0x0369a1,
    accentHex: 0x7dd3fc,
    hairHex: 0xe0f2fe,
    atkBonus: 24,
    hpBonus: 120,
  },
];

export const SKIN_MAP: Partial<Record<HeroSkinId, HeroSkinDefinition>> = Object.fromEntries(
  HERO_SKINS.map((s) => [s.id, s])
) as Partial<Record<HeroSkinId, HeroSkinDefinition>>;

export const ZODIAC_AURAS: AuraDefinition[] = [];

export const AURA_MAP: Record<AuraStyleId, AuraDefinition> = Object.fromEntries(
  ZODIAC_AURAS.map((a) => [a.id, a])
) as Record<AuraStyleId, AuraDefinition>;

export const VIP_MONTHLY_COST_GEMS = 150;
export const VIP_DURATION_DAYS = 30;
export const VIP_DAILY_GOLD = 240;
export const VIP_DAILY_GEMS = 22;
export const VIP_DAILY_ESSENCE = 15;

export const STARTER_PACK_COST_GEMS = 45;
export const STARTER_PACK_REWARDS = {
  gold: 680,
  essence: 45,
  starDust: 140,
  gearRarity: Rarity.EPIC,
  sTier: true,
};

export const MAX_DAILY_RIFT_RUNS = 2;

const DAILY_RIFT_MUTATORS: DailyRiftMutatorPair[] = [
  {
    id: 'rift_solar_storm',
    title: 'Bí Cảnh Nhật Luân Cuồng Nộ',
    subtitle: 'Trời giáng tia nắng bạo kích nhưng lũ quái mang giáp đá dày.',
    playerBuffTitle: 'Thiên Nhãn Hoàng Đạo',
    playerBuffDesc: '+30% Tấn Công & +18% Chí Mạng toàn trận.',
    enemyChallengeTitle: 'Thiết Giáp Thánh Điện',
    enemyChallengeDesc: 'Quái vật có +35% HP tối đa.',
    atkMult: 1.3,
    playerSpeedMult: 1.0,
    critBonus: 0.18,
    enemyHpMult: 1.35,
    enemySpeedMult: 1.0,
    bossScaleMult: 1.2,
  },
  {
    id: 'rift_wind_trial',
    title: 'Bí Cảnh Cuồng Phong Tinh Vân',
    subtitle: 'Cuộc đua tốc độ cực hạn giữa thợ săn và binh đoàn bóng tối.',
    playerBuffTitle: 'Bước Chân Ngân Hà',
    playerBuffDesc: '+20% Tốc Chạy & +22% Tấn Công.',
    enemyChallengeTitle: 'Xung Kích Cuồng Tốc',
    enemyChallengeDesc: 'Quái vật di chuyển nhanh hơn 22% và Thủ Lĩnh mạnh hơn.',
    atkMult: 1.22,
    playerSpeedMult: 1.2,
    critBonus: 0.08,
    enemyHpMult: 1.15,
    enemySpeedMult: 1.22,
    bossScaleMult: 1.25,
  },
  {
    id: 'rift_eclipse_vault',
    title: 'Bí Cảnh Kho Báu Nhật Thực',
    subtitle: 'Thánh điện ẩn chứa nguồn Bụi Tinh Tú dồi dào dưới sự canh giữ của Boss.',
    playerBuffTitle: 'Chí Mạng Tuyệt Đối',
    playerBuffDesc: '+25% Chí Mạng & +25% Sát Thương Cơ Bản.',
    enemyChallengeTitle: 'Uy Áp Hoàng Đạo',
    enemyChallengeDesc: 'Boss Bí Cảnh có +45% HP và +15% tốc độ ra đòn.',
    atkMult: 1.25,
    playerSpeedMult: 1.06,
    critBonus: 0.25,
    enemyHpMult: 1.25,
    enemySpeedMult: 1.12,
    bossScaleMult: 1.45,
  },
];

export function getDailyRiftPair(dateKey: string): DailyRiftMutatorPair {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 37 + dateKey.charCodeAt(i)) % 991;
  }
  return DAILY_RIFT_MUTATORS[hash % DAILY_RIFT_MUTATORS.length];
}

export function getSalvageValue(item: GearInstance): { starDust: number; gold: number } {
  const baseByRarity: Record<Rarity, { starDust: number; gold: number }> = {
    [Rarity.COMMON]: { starDust: 18, gold: 30 },
    [Rarity.RARE]: { starDust: 42, gold: 65 },
    [Rarity.EPIC]: { starDust: 95, gold: 135 },
    [Rarity.LEGENDARY]: { starDust: 210, gold: 280 },
    [Rarity.MYTHIC]: { starDust: 420, gold: 520 },
  };
  const base = baseByRarity[item.rarity] ?? baseByRarity[Rarity.COMMON];
  const lvBonus = Math.max(0, item.level - 1);
  return {
    starDust: base.starDust + lvBonus * 6,
    gold: base.gold + lvBonus * 22,
  };
}

export const FORGE_RECIPES: ForgeRecipe[] = [
  {
    id: 'forge_epic_random',
    title: 'Rèn Trang Bị Sử Thi',
    subtitle: 'Chế tạo ngay 1 trang bị phẩm chất Sử Thi ngẫu nhiên từ Bụi Tinh Tú.',
    badge: 'PHỔ THÔNG',
    starDustCost: 110,
    goldCost: 120,
    rewardKind: 'gear_epic_any',
    rarity: Rarity.EPIC,
    amount: 1,
  },
  {
    id: 'forge_s_weapon',
    title: 'Rèn Vũ Khí [S] Hoàng Đạo',
    subtitle: 'Đúc đích danh Vũ Khí [S] (Nỏ Rồng / Thương Oracle / Vuốt Griffin) bậc Sử Thi!',
    badge: 'ĐÍCH DANH S-TIER',
    starDustCost: 260,
    goldCost: 350,
    rewardKind: 'gear_s_weapon',
    rarity: Rarity.EPIC,
    amount: 1,
  },
  {
    id: 'forge_s_armor',
    title: 'Rèn Phòng Cụ [S] Thánh Điện',
    subtitle: 'Đúc Giáp, Mũ hoặc Giày [S] Tier bậc Sử Thi để hoàn thiện bộ chống chịu.',
    badge: 'PHÒNG CỤ [S]',
    starDustCost: 220,
    goldCost: 280,
    rewardKind: 'gear_s_armor',
    rarity: Rarity.EPIC,
    amount: 1,
  },
  {
    id: 'forge_s_accessory',
    title: 'Rèn Trang Sức [S] Tinh Tú',
    subtitle: 'Đúc Nhẫn Oracle [S] hoặc Hộ Phù Rồng [S] bậc Huyền Thoại hoặc Sử Thi.',
    badge: 'TRANG SỨC [S]',
    starDustCost: 235,
    goldCost: 300,
    rewardKind: 'gear_s_accessory',
    rarity: Rarity.EPIC,
    amount: 1,
  },
  {
    id: 'forge_pet_essence',
    title: 'Tinh Luyện Tinh Chất ×35',
    subtitle: 'Chuyển hóa Bụi Tinh Tú thành Tinh Chất để nâng cấp Tinh Linh 3D.',
    badge: 'TINH LINH',
    starDustCost: 75,
    goldCost: 80,
    rewardKind: 'pet_essence',
    rarity: Rarity.RARE,
    amount: 35,
  },
];

export function addDaysToDateKey(dateKey: string, days: number): string {
  const parts = dateKey.split('-').map(Number);
  const dt = new Date(parts[0], (parts[1] || 1) - 1, parts[2] || 1);
  dt.setDate(dt.getDate() + days);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const d = String(dt.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeVip(v?: Partial<VipState>): VipState {
  return {
    activeUntilDate: v?.activeUntilDate ?? '',
    lastDailyClaimDate: v?.lastDailyClaimDate ?? '',
    starterPackClaimed: Boolean(v?.starterPackClaimed),
  };
}

export function isVipActive(v?: Partial<VipState>): boolean {
  const vip = normalizeVip(v);
  if (!vip.activeUntilDate) return false;
  return vip.activeUntilDate >= getTodayKey();
}

export function canClaimVipDaily(v?: Partial<VipState>): boolean {
  const vip = normalizeVip(v);
  return isVipActive(vip) && vip.lastDailyClaimDate !== getTodayKey();
}

export function normalizeDailyRift(d?: Partial<DailyRiftState>): DailyRiftState {
  const today = getTodayKey();
  if (!d || d.date !== today) {
    return { date: today, runsRemaining: MAX_DAILY_RIFT_RUNS, clearedToday: false };
  }
  return {
    date: today,
    runsRemaining: Math.max(0, Math.min(MAX_DAILY_RIFT_RUNS, d.runsRemaining ?? MAX_DAILY_RIFT_RUNS)),
    clearedToday: Boolean(d.clearedToday),
  };
}

export function normalizePets(pets?: PetInstance[]): PetInstance[] {
  if (!Array.isArray(pets)) return [];
  return pets.filter((p) => Boolean(PET_MAP[p.petId]));
}

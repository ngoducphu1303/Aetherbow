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
    id: 'solar_phoenix',
    name: 'Phượng Hoàng Nhật Luân',
    title: 'Tinh Linh Lửa Hoàng Đạo',
    element: 'fire',
    rarity: 'Huyền Thoại',
    desc: 'Phượng hoàng rực cháy bay hộ vệ, phóng cầu lửa thiêu đốt gây bạo kích cao.',
    skillName: 'Hỏa Vũ Thần Diễm',
    skillDesc: 'Phóng cầu lửa mỗi 1.15s gây 88% ATK + thiêu đốt mục tiêu.',
    baseAtk: 26,
    baseHp: 110,
    baseCrit: 0.05,
    unlockGems: 95,
    unlockGold: 0,
    primaryHex: 0xf97316,
    secondaryHex: 0xfacc15,
    fireInterval: 1.15,
  },
  {
    id: 'frost_owl',
    name: 'Cú Tuyết Tinh Vân',
    title: 'Tinh Linh Băng Giá',
    element: 'ice',
    rarity: 'Hiếm',
    desc: 'Linh thú trí tuệ của Bạch Dương, phóng tia băng làm chậm bước tiến kẻ địch.',
    skillName: 'Hàn Băng Truy Ảnh',
    skillDesc: 'Bắn tên băng mỗi 1.3s làm chậm địch 25% trong 1.8s.',
    baseAtk: 16,
    baseHp: 90,
    baseCrit: 0.02,
    unlockGems: 0,
    unlockGold: 420,
    primaryHex: 0x38bdf8,
    secondaryHex: 0xe0f2fe,
    fireInterval: 1.3,
  },
  {
    id: 'storm_dragonet',
    name: 'Ấu Long Lôi Đình',
    title: 'Tinh Linh Sấm Sét',
    element: 'storm',
    rarity: 'Sử Thi',
    desc: 'Rồng con mang sừng sét cổ đại, tung tia điện cao áp phá giáp quái tinh anh.',
    skillName: 'Long Lôi Oanh Kích',
    skillDesc: 'Phóng tia sét mỗi 1.05s với hệ số sát thương 75% ATK.',
    baseAtk: 22,
    baseHp: 95,
    baseCrit: 0.04,
    unlockGems: 65,
    unlockGold: 0,
    primaryHex: 0xa855f7,
    secondaryHex: 0x67e8f9,
    fireInterval: 1.05,
  },
  {
    id: 'eclipse_fox',
    name: 'Cửu Vĩ Nguyệt Thực',
    title: 'Tinh Linh Bóng Đêm',
    element: 'shadow',
    rarity: 'Sử Thi',
    desc: 'Hồ ly hai đuôi ẩn mình dưới ánh trăng, bắn cầu bóng tối truy kích chuẩn xác.',
    skillName: 'Huyễn Ảnh Truy Hồn',
    skillDesc: 'Phóng cầu ma thuật đuổi mục tiêu mỗi 1.1s + tăng 4% Chí Mạng.',
    baseAtk: 21,
    baseHp: 80,
    baseCrit: 0.06,
    unlockGems: 72,
    unlockGold: 0,
    primaryHex: 0xf43f5e,
    secondaryHex: 0xc084fc,
    fireInterval: 1.1,
  },
  {
    id: 'jade_turtle',
    name: 'Huyền Vũ Ngọc Bích',
    title: 'Tinh Linh Hộ Mệnh',
    element: 'earth',
    rarity: 'Hiếm',
    desc: 'Linh quy hộ giáp ngọc lục bảo tăng sinh lực tối đa và bắn mảnh pha lê bảo vệ.',
    skillName: 'Ngọc Bích Hộ Thuẫn',
    skillDesc: 'Bắn mảnh ngọc mỗi 1.35s + gia tăng lượng lớn HP cho Anh Hùng.',
    baseAtk: 14,
    baseHp: 185,
    baseCrit: 0.02,
    unlockGems: 0,
    unlockGold: 480,
    primaryHex: 0x10b981,
    secondaryHex: 0xa7f3d0,
    fireInterval: 1.35,
  },
  {
    id: 'star_fairy',
    name: 'Tiên Nữ Ngân Hà',
    title: 'Tinh Linh Ánh Sao',
    element: 'star',
    rarity: 'Huyền Thoại',
    desc: 'Tinh linh thuần khiết tỏa hào quang sao trời, bắn chùm sao tốc độ cao.',
    skillName: 'Tinh Quang Liên Xạ',
    skillDesc: 'Bắn sao băng tốc độ cao mỗi 0.9s với tỷ lệ chí mạng vượt trội.',
    baseAtk: 24,
    baseHp: 120,
    baseCrit: 0.07,
    unlockGems: 110,
    unlockGold: 0,
    primaryHex: 0xfbbf24,
    secondaryHex: 0xfef08a,
    fireInterval: 0.9,
  },
];

export const PET_MAP: Record<PetId, PetDefinition> = Object.fromEntries(
  PETS_CATALOG.map((p) => [p.id, p])
) as Record<PetId, PetDefinition>;

export function getPetStats(petId: PetId, level: number) {
  const def = PET_MAP[petId];
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
    id: 'default',
    name: 'Nguyên Bản Hoàng Đạo',
    badge: 'MẶC ĐỊNH',
    desc: 'Trang phục chiến đấu đặc trưng theo từng Anh Hùng và vũ khí đang trang bị.',
    unlockGems: 0,
    unlockGold: 0,
    atkBonus: 0,
    hpBonus: 0,
  },
  {
    id: 'alice_ao_dai',
    heroId: 'artemis',
    name: 'Áo Dài Hoa Mai',
    badge: 'RIÊNG CHO ALICE',
    desc: 'Áo dài đỏ thêu hoa mai, phối quần lụa và khăn đóng.',
    unlockGems: 0,
    unlockGold: 0,
    atkBonus: 0,
    hpBonus: 0,
  },
  {
    id: 'celestial_gold',
    name: 'Thánh Quang Hoàng Kim',
    badge: 'SỬ THI',
    desc: 'Áo choàng trắng ngà dệt chỉ vàng ròng và tinh thể hào quang Mặt Trời.',
    unlockGems: 55,
    unlockGold: 0,
    cloakHex: 0x92400e,
    accentHex: 0xfacc15,
    hairHex: 0xfef08a,
    atkBonus: 16,
    hpBonus: 90,
  },
  {
    id: 'blood_moon',
    name: 'Huyết Nguyệt Nhật Thực',
    badge: 'HUYỀN THOẠI',
    desc: 'Bào chiến đỏ thẫm pha ánh ruby huyền bí của đêm nhật thực.',
    unlockGems: 75,
    unlockGold: 0,
    cloakHex: 0x7f1d1d,
    accentHex: 0xfb7185,
    hairHex: 0xffe4e6,
    atkBonus: 24,
    hpBonus: 120,
  },
  {
    id: 'jade_nebula',
    name: 'Ngọc Bích Tinh Vân',
    badge: 'HIẾM',
    desc: 'Lụa ngọc lục bảo thanh thoát mang hơi thở rừng thiêng tinh giới.',
    unlockGems: 0,
    unlockGold: 620,
    cloakHex: 0x064e3b,
    accentHex: 0x34d399,
    hairHex: 0xd1fae5,
    atkBonus: 12,
    hpBonus: 80,
  },
  {
    id: 'arctic_frost',
    name: 'Băng Tâm Cực Quang',
    badge: 'SỬ THI',
    desc: 'Giáp choàng xanh lam băng giá phản chiếu ánh sao phương Bắc.',
    unlockGems: 50,
    unlockGold: 0,
    cloakHex: 0x0c4a6e,
    accentHex: 0x38bdf8,
    hairHex: 0xe0f2fe,
    atkBonus: 15,
    hpBonus: 105,
  },
  {
    id: 'thunder_empress',
    name: 'Lôi Ảnh Phán Quyết',
    badge: 'SỬ THI',
    desc: 'Lễ phục thợ săn tử lôi Clorinde với viền tím điện và mũi tên sấm sét.',
    unlockGems: 0,
    unlockGold: 820,
    cloakHex: 0x311042,
    accentHex: 0xc084fc,
    hairHex: 0x1e1b4b,
    atkBonus: 18,
    hpBonus: 95,
  },
  {
    id: 'crimson_phoenix',
    name: 'Pháo Hoa Hạ Chí',
    badge: 'HIẾM',
    desc: 'Chiến bào lễ hội Yoimiya rực rỡ ánh lửa vàng đỏ và dải lụa hỏa phụng.',
    unlockGems: 0,
    unlockGold: 680,
    cloakHex: 0x9a3412,
    accentHex: 0xfb923c,
    hairHex: 0xfde68a,
    atkBonus: 15,
    hpBonus: 85,
  },
  {
    id: 'astral_archon',
    name: 'Thủy Thần Tinh Giới',
    badge: 'HUYỀN THOẠI',
    desc: 'Vương phục Furina xanh ngọc bích vương giả cùng hào quang sóng nước.',
    unlockGems: 85,
    unlockGold: 0,
    cloakHex: 0x0e4f7a,
    accentHex: 0x67e8f9,
    hairHex: 0xe0f2fe,
    atkBonus: 25,
    hpBonus: 130,
  },
  {
    id: 'abyss_duelist',
    name: 'Công Tước Băng Ngục',
    badge: 'SỬ THI',
    desc: 'Áo choàng thép tối Wriothesley kết hợp giáp vai băng lạnh uy mãnh.',
    unlockGems: 60,
    unlockGold: 0,
    cloakHex: 0x1f2937,
    accentHex: 0x94a3b8,
    hairHex: 0x111827,
    atkBonus: 19,
    hpBonus: 115,
  },
  {
    id: 'jade_adeptus',
    name: 'Lưu Vân Tiên Hạc',
    badge: 'HUYỀN THOẠI',
    desc: 'Tiên bào ngọc bích Xianyun uyển chuyển với ánh phong linh thanh khiết.',
    unlockGems: 80,
    unlockGold: 0,
    cloakHex: 0x065f46,
    accentHex: 0x5eead4,
    hairHex: 0x0f172a,
    atkBonus: 22,
    hpBonus: 125,
  },
  {
    id: 'lunar_sovereign',
    name: 'Thẩm Phán Thủy Triều',
    badge: 'HUYỀN THOẠI',
    desc: 'Lễ phục đại thẩm phán Neuvillette ánh bạch kim và lam thẫm tối cao.',
    unlockGems: 95,
    unlockGold: 0,
    cloakHex: 0x172554,
    accentHex: 0x93c5fd,
    hairHex: 0xf8fafc,
    atkBonus: 26,
    hpBonus: 140,
  },
  {
    id: 'verdant_ranger',
    name: 'Kiểm Lâm Rừng Thiêng',
    badge: 'HIẾM',
    desc: 'Trang phục tuần tra Tighnari hòa quyện thảo mộc xanh tươi và vàng nắng.',
    unlockGems: 0,
    unlockGold: 740,
    cloakHex: 0x14532d,
    accentHex: 0xa3e635,
    hairHex: 0x064e3b,
    atkBonus: 14,
    hpBonus: 95,
  },
  {
    id: 'twilight_raven',
    name: 'Công Chúa Hoàng Hôn',
    badge: 'SỬ THI',
    desc: 'Bộ cánh hắc dạ Fischl điểm xuyết sắc tím hoàng gia và ánh sao đêm.',
    unlockGems: 65,
    unlockGold: 0,
    cloakHex: 0x2e1065,
    accentHex: 0xe879f9,
    hairHex: 0xfef08a,
    atkBonus: 20,
    hpBonus: 100,
  },
];

export const SKIN_MAP: Record<HeroSkinId, HeroSkinDefinition> = Object.fromEntries(
  HERO_SKINS.map((s) => [s.id, s])
) as Record<HeroSkinId, HeroSkinDefinition>;

export const ZODIAC_AURAS: AuraDefinition[] = [
  {
    id: 'zodiac_gold',
    name: 'Vòng Tròn Hoàng Kim',
    desc: 'Ấn ký Hoàng Đạo cổ điển tỏa sáng sắc vàng ấm áp.',
    unlockGems: 0,
    unlockGold: 0,
    primaryHex: 0xfbbf24,
    secondaryHex: 0x38bdf8,
    critBonus: 0,
  },
  {
    id: 'arcane_eclipse',
    name: 'Nhật Thực Huyền Bí',
    desc: 'Vòng ma pháp tím lam xoay ngược chiều kim đồng hồ quanh Anh Hùng.',
    unlockGems: 35,
    unlockGold: 0,
    primaryHex: 0xa855f7,
    secondaryHex: 0x67e8f9,
    critBonus: 0.025,
  },
  {
    id: 'aurora_emerald',
    name: 'Cực Quang Ngọc Lục',
    desc: 'Hào quang sinh mệnh xanh lục bảo giúp ổn định nhịp bắn.',
    unlockGems: 0,
    unlockGold: 420,
    primaryHex: 0x10b981,
    secondaryHex: 0xa7f3d0,
    critBonus: 0.015,
  },
  {
    id: 'crimson_corona',
    name: 'Vành Nhật Hoa Đỏ',
    desc: 'Hào quang rực lửa của chiến thần khi bùng nổ sát thương.',
    unlockGems: 48,
    unlockGold: 0,
    primaryHex: 0xf43f5e,
    secondaryHex: 0xf97316,
    critBonus: 0.03,
  },
  {
    id: 'starlight_prism',
    name: 'Lăng Kính Tinh Tú',
    desc: 'Vầng hào quang đa sắc sáng rực như dải ngân hà thu nhỏ.',
    unlockGems: 65,
    unlockGold: 0,
    primaryHex: 0x38bdf8,
    secondaryHex: 0xfef08a,
    critBonus: 0.035,
  },
];

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
  return Array.isArray(pets) ? pets : [];
}

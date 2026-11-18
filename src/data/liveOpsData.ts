import {
  AchievementDefinition,
  BattlePassProgress,
  CareerStats,
  DailyFlashDealState,
  DailySweepState,
  EnemyKind,
  FlashDealItem,
  GameSettings,
  MailItem,
  PityState,
  Rarity,
  SaveData,
} from '../types/game';
import { getTodayKey } from './questsData';

export const DEFAULT_SETTINGS: GameSettings = {
  masterVol: 0.85,
  bgmVol: 0.55,
  sfxVol: 0.9,
  graphicsQuality: 'high',
  screenShake: true,
  showDamageNumbers: true,
  starfallWeather: true,
};

export function normalizeSettings(s?: Partial<GameSettings>): GameSettings {
  return {
    masterVol: s?.masterVol ?? DEFAULT_SETTINGS.masterVol,
    bgmVol: s?.bgmVol ?? DEFAULT_SETTINGS.bgmVol,
    sfxVol: s?.sfxVol ?? DEFAULT_SETTINGS.sfxVol,
    graphicsQuality: s?.graphicsQuality ?? DEFAULT_SETTINGS.graphicsQuality,
    screenShake: s?.screenShake ?? DEFAULT_SETTINGS.screenShake,
    showDamageNumbers: s?.showDamageNumbers ?? DEFAULT_SETTINGS.showDamageNumbers,
    starfallWeather: s?.starfallWeather ?? DEFAULT_SETTINGS.starfallWeather,
  };
}

export const CURRENT_SEASON_ID = 1;
export const SEASON_NAME = 'Mùa 1 · Tinh Giới Khởi Nguyên';
export const BATTLE_PASS_XP_PER_TIER = 100;
export const BATTLE_PASS_MAX_TIER = 20;
export const BATTLE_PASS_PREMIUM_GEM_COST = 120;

export interface BattlePassReward {
  kind: 'gold' | 'gems' | 'gear';
  amount: number;
  rarity?: Rarity;
  sTier?: boolean;
  label: string;
}

export interface BattlePassTier {
  level: number;
  free: BattlePassReward;
  premium: BattlePassReward;
}

export const BATTLE_PASS_TIERS: BattlePassTier[] = Array.from(
  { length: BATTLE_PASS_MAX_TIER },
  (_, idx) => {
    const lv = idx + 1;
    const free: BattlePassReward =
      lv === 20
        ? {
            kind: 'gear',
            amount: 1,
            rarity: Rarity.EPIC,
            sTier: true,
            label: 'Trang Bị [S] Sử Thi',
          }
        : lv % 5 === 0
        ? { kind: 'gems', amount: 15 + lv, label: `${15 + lv} Ngọc Hồn` }
        : { kind: 'gold', amount: 120 + lv * 35, label: `${120 + lv * 35} Vàng` };

    const premium: BattlePassReward =
      lv === 20
        ? {
            kind: 'gear',
            amount: 1,
            rarity: Rarity.LEGENDARY,
            sTier: true,
            label: 'Huyền Thoại [S] Thánh Điện',
          }
        : lv === 10
        ? {
            kind: 'gear',
            amount: 1,
            rarity: Rarity.EPIC,
            sTier: true,
            label: 'Rương [S] Sử Thi',
          }
        : lv % 4 === 0
        ? { kind: 'gems', amount: 28 + lv * 2, label: `${28 + lv * 2} Ngọc Hồn` }
        : { kind: 'gold', amount: 260 + lv * 60, label: `${260 + lv * 60} Vàng` };

    return { level: lv, free, premium };
  }
);

export function normalizeBattlePass(bp?: Partial<BattlePassProgress>): BattlePassProgress {
  if (!bp || bp.seasonId !== CURRENT_SEASON_ID) {
    return {
      seasonId: CURRENT_SEASON_ID,
      xp: 0,
      premiumUnlocked: false,
      claimedFree: [],
      claimedPremium: [],
    };
  }
  return {
    seasonId: CURRENT_SEASON_ID,
    xp: bp.xp ?? 0,
    premiumUnlocked: Boolean(bp.premiumUnlocked),
    claimedFree: Array.isArray(bp.claimedFree) ? bp.claimedFree : [],
    claimedPremium: Array.isArray(bp.claimedPremium) ? bp.claimedPremium : [],
  };
}

export function getBattlePassLevelInfo(xp: number): {
  level: number;
  currentTierXp: number;
  xpPerTier: number;
  isMax: boolean;
} {
  const rawLv = Math.floor(xp / BATTLE_PASS_XP_PER_TIER) + 1;
  const level = Math.min(BATTLE_PASS_MAX_TIER, Math.max(1, rawLv));
  const isMax = xp >= BATTLE_PASS_MAX_TIER * BATTLE_PASS_XP_PER_TIER;
  const currentTierXp = isMax ? BATTLE_PASS_XP_PER_TIER : xp % BATTLE_PASS_XP_PER_TIER;
  return { level, currentTierXp, xpPerTier: BATTLE_PASS_XP_PER_TIER, isMax };
}

export function countClaimableBattlePass(save: SaveData): number {
  const bp = normalizeBattlePass(save.battlePass);
  const { level, isMax } = getBattlePassLevelInfo(bp.xp);
  const unlockedUpTo = isMax ? BATTLE_PASS_MAX_TIER : level;
  let count = 0;
  for (let lv = 1; lv <= unlockedUpTo; lv++) {
    if (!bp.claimedFree.includes(lv)) count++;
    if (bp.premiumUnlocked && !bp.claimedPremium.includes(lv)) count++;
  }
  return count;
}

export function normalizePity(p?: Partial<PityState>): PityState {
  return {
    mythicRollsSinceEpic: p?.mythicRollsSinceEpic ?? 0,
    mythicRollsSinceSTier: p?.mythicRollsSinceSTier ?? 0,
    runeRollsSinceEpic: p?.runeRollsSinceEpic ?? 0,
  };
}

export function normalizeCareer(c?: Partial<CareerStats>): CareerStats {
  return {
    totalKills: c?.totalKills ?? 0,
    totalBossesKilled: c?.totalBossesKilled ?? 0,
    totalRuns: c?.totalRuns ?? 0,
    maxComboEver: c?.maxComboEver ?? 0,
    totalChestsOpened: c?.totalChestsOpened ?? 0,
    seenEnemies: Array.isArray(c?.seenEnemies) ? c.seenEnemies : [],
    seenSkills: Array.isArray(c?.seenSkills) ? c.seenSkills : [],
  };
}

export const ACHIEVEMENTS_CATALOG: AchievementDefinition[] = [
  {
    id: 'ach_first_blood',
    title: 'Chiến Binh Khởi Nguyên',
    desc: 'Hạ gục tổng cộng 25 quái vật trong Hoàng Đạo Tinh Giới.',
    metric: 'totalKills',
    target: 25,
    rewardGold: 220,
    rewardGems: 12,
    unlockTitle: 'Thợ Săn Sao',
  },
  {
    id: 'ach_slayer_200',
    title: 'Đồ Tể Tinh Giới',
    desc: 'Hạ gục tổng cộng 200 quái vật qua các trận chiến.',
    metric: 'totalKills',
    target: 200,
    rewardGold: 550,
    rewardGems: 25,
  },
  {
    id: 'ach_slayer_800',
    title: 'Ác Mộng Bóng Tối',
    desc: 'Hạ gục tổng cộng 800 quái vật trong sự nghiệp.',
    metric: 'totalKills',
    target: 800,
    rewardGold: 1200,
    rewardGems: 55,
    unlockTitle: 'Chiến Thần Ánh Sáng',
  },
  {
    id: 'ach_combo_20',
    title: 'Nhịp Điệu Hủy Diệt',
    desc: 'Đạt chuỗi Liên Kích x20 trong một trận đấu.',
    metric: 'maxComboEver',
    target: 20,
    rewardGold: 260,
    rewardGems: 15,
  },
  {
    id: 'ach_combo_50',
    title: 'Bão Tố Hoàng Đạo',
    desc: 'Đạt chuỗi Liên Kích x50 không ngắt quãng.',
    metric: 'maxComboEver',
    target: 50,
    rewardGold: 650,
    rewardGems: 35,
    unlockTitle: 'Vũ Điệu Liên Kích',
  },
  {
    id: 'ach_boss_1',
    title: 'Kẻ Diệt Thủ Lĩnh',
    desc: 'Hạ gục Thủ Lĩnh (Boss) đầu tiên của Chương hoặc Tháp.',
    metric: 'totalBossesKilled',
    target: 1,
    rewardGold: 350,
    rewardGems: 20,
  },
  {
    id: 'ach_boss_10',
    title: 'Chinh Phục Hộ Vệ',
    desc: 'Đánh bại tổng cộng 10 Thủ Lĩnh trong các Thánh Điện.',
    metric: 'totalBossesKilled',
    target: 10,
    rewardGold: 950,
    rewardGems: 50,
    unlockTitle: 'Thợ Săn Thủ Lĩnh',
  },
  {
    id: 'ach_chest_5',
    title: 'Thợ Săn Kho Báu',
    desc: 'Khai mở tổng cộng 5 Rương hoặc Túi Ngọc Khắc.',
    metric: 'totalChestsOpened',
    target: 5,
    rewardGold: 300,
    rewardGems: 18,
  },
  {
    id: 'ach_chest_25',
    title: 'Triệu Hồi Sư Hoàng Kim',
    desc: 'Khai mở tổng cộng 25 Rương Kho Báu Hoàng Đạo.',
    metric: 'totalChestsOpened',
    target: 25,
    rewardGold: 850,
    rewardGems: 45,
    unlockTitle: 'Chúa Tể Kho Báu',
  },
  {
    id: 'ach_ch_1',
    title: 'Chứng Nhân Sư Tử',
    desc: 'Hoàn thành trọn vẹn Chương 1: Thánh Điện Sư Tử.',
    metric: 'highestChapterCleared',
    target: 1,
    rewardGold: 450,
    rewardGems: 25,
  },
  {
    id: 'ach_ch_4',
    title: 'Người Bảo Hộ Cung Đạo',
    desc: 'Vượt qua Chương 4 trong Thử Thách Chương.',
    metric: 'highestChapterCleared',
    target: 4,
    rewardGold: 1100,
    rewardGems: 60,
    unlockTitle: 'Hộ Vệ Tinh Tú',
  },
  {
    id: 'ach_tower_6',
    title: 'Chinh Phục Tầng Mây',
    desc: 'Chinh phục ít nhất Tầng 6 tại Tháp Vô Tận.',
    metric: 'bestTowerFloor',
    target: 6,
    rewardGold: 600,
    rewardGems: 35,
  },
];

export function getAchievementCurrentValue(
  save: SaveData,
  metric: AchievementDefinition['metric']
): number {
  const career = normalizeCareer(save.career);
  switch (metric) {
    case 'totalKills':
      return career.totalKills;
    case 'totalBossesKilled':
      return career.totalBossesKilled;
    case 'maxComboEver':
      return career.maxComboEver;
    case 'totalChestsOpened':
      return career.totalChestsOpened;
    case 'highestChapterCleared':
      return save.highestChapterCleared;
    case 'bestTowerFloor':
      return save.bestTowerFloor ?? 0;
  }
}

export function countClaimableAchievements(save: SaveData): number {
  const claimed = save.achievementsClaimed ?? [];
  return ACHIEVEMENTS_CATALOG.filter(
    (ach) => !claimed.includes(ach.id) && getAchievementCurrentValue(save, ach.metric) >= ach.target
  ).length;
}

export const EVENT_BANNERS = [
  {
    id: 'event_world_boss',
    badge: 'LIÊN SERVER · TOP 1',
    title: 'Boss Thế Giới Cửu Thiên & Bảng Vinh Danh',
    subtitle: 'Đua Top Sát Thương 60 giây toàn server để nhận Khung Long Hồn, Huy Hiệu & Ngọc Hồn!',
    ctaLabel: 'Đua Top Boss',
    target: 'world_boss' as const,
    accent: 'amber' as const,
  },
  {
    id: 'event_crystal_defense',
    badge: 'THỦ THÀNH 3D',
    title: 'Thủ Thành Pha Lê Tinh Linh · Săn Cánh Hoàng Đạo',
    subtitle: 'Bảo vệ Pha Lê qua 6 đợt quái 3D để thu thập Lông Vũ Tinh Tú mở khóa Đôi Cánh!',
    ctaLabel: 'Thủ Pha Lê',
    target: 'crystal_defense' as const,
    accent: 'emerald' as const,
  },
  {
    id: 'event_auction_house',
    badge: 'GIAO DỊCH TỰ DO',
    title: 'Sàn Đấu Giá Tinh Giới · Mua Bán Trang Bị & Ngọc',
    subtitle: 'Đấu giá, mua đứt Thánh Vật [S] và ký gửi vật phẩm dư lấy Ngọc Hồn mỗi ngày.',
    ctaLabel: 'Mở Sàn Đấu Giá',
    target: 'auction_house' as const,
    accent: 'purple' as const,
  },
  {
    id: 'event_constellation',
    badge: '12 CHÒM SAO',
    title: 'Bản Đồ 12 Chòm Sao · Thức Tỉnh Bệ Tinh Tú 3D',
    subtitle: 'Thắp sáng 12 cung Hoàng Đạo để kích hoạt Cộng Hưởng 4 Nguyên Tố và Hào Quang 3D!',
    ctaLabel: 'Mở 12 Chòm Sao',
    target: 'constellation' as const,
    accent: 'purple' as const,
  },
  {
    id: 'event_coop_raid',
    badge: 'PHÓ BẢN AI 3D',
    title: 'Phó Bản Hợp Tác 3D · 2 Đồng Hành AI Sát Cánh',
    subtitle: 'Lập tổ đội 3 Anh Hùng đối đầu Ma Thú Liên Giới, nhận Bảo Thạch III & đoạt MVP!',
    ctaLabel: 'Vào Co-op Raid',
    target: 'coop_raid' as const,
    accent: 'amber' as const,
  },
  {
    id: 'event_elemental_tower',
    badge: 'THÁP NGUYÊN TỐ',
    title: 'Tháp Thí Luyện Hỏa · Băng · Lôi +50% Khắc Chế',
    subtitle: 'Chinh phục 3 ngọn tháp nguyên tố riêng biệt để cày Bụi Tinh Tú & Bảo Thạch.',
    ctaLabel: 'Chọn Tháp Hệ',
    target: 'elemental_tower' as const,
    accent: 'emerald' as const,
  },
  {
    id: 'event_growth_fund',
    badge: 'QUỸ ĐẦU TƯ · 800%',
    title: 'Quỹ Đầu Tư Trưởng Thành & Cửa Hàng Xu Arena',
    subtitle: 'Nhận hoàn trả hàng trăm Ngọc Hồn theo Chương và đổi Xu Arena lấy Thánh Vật [S]!',
    ctaLabel: 'Mở Quỹ & Shop',
    target: 'shop' as const,
    accent: 'amber' as const,
  },
  {
    id: 'event_night_market',
    badge: 'CHỢ ĐÊM HOÀNG ĐẠO',
    title: 'Chợ Đêm Giảm Đến 60% & Quà Tích Lũy Tiêu Ngọc',
    subtitle: 'Săn Bảo Thạch, Rương [S] giá hời mỗi ngày và mở khóa mốc thưởng tiêu Ngọc!',
    ctaLabel: 'Mở Chợ Đêm',
    target: 'night_market' as const,
    accent: 'purple' as const,
  },
  {
    id: 'event_arena_pvp',
    badge: 'ĐẤU TRƯỜNG XẾP HẠNG',
    title: 'Đấu Trường Arena 1v1 · Leo Hạng Tinh Quân',
    subtitle: 'Khiêu chiến đối thủ 3D trong 45 giây để tích điểm Xếp Hạng và nhận Xu Arena!',
    ctaLabel: 'Vào Đấu Trường',
    target: 'arena' as const,
    accent: 'amber' as const,
  },
  {
    id: 'event_destiny_wheel',
    badge: 'SỰ KIỆN GIỚI HẠN',
    title: 'Vòng Quay Vận Mệnh · Săn Thánh Vật [S]',
    subtitle: 'Quay nhận miễn phí mỗi ngày, mở rương mốc 5/15/30/50 lượt chắc chắn ra [S]!',
    ctaLabel: 'Quay Vận Mệnh',
    target: 'destiny_wheel' as const,
    accent: 'purple' as const,
  },
  {
    id: 'event_guild_boss',
    badge: 'BANG HỘI HOÀNG ĐẠO',
    title: 'Boss Bang Hội 60s · Rương Hạng SS',
    subtitle: 'Cống hiến nâng Công Nghệ Bang và khiêu chiến Cự Thần Tinh Giới mỗi ngày.',
    ctaLabel: 'Vào Bang Hội',
    target: 'guild' as const,
    accent: 'amber' as const,
  },
  {
    id: 'event_daily_rift',
    badge: 'BÍ CẢNH HẰNG NGÀY',
    title: 'Bí Cảnh Biến Hóa · Săn Bụi Tinh Tú & Tinh Chất',
    subtitle: 'Quy tắc biến hóa đổi mỗi ngày: 2 lượt chinh phục nhận nguyên liệu Rèn Thánh Vật.',
    ctaLabel: 'Mở Bí Cảnh',
    target: 'daily_rift' as const,
    accent: 'purple' as const,
  },
  {
    id: 'event_vip_pack',
    badge: 'ĐẶC QUYỀN THÁNG',
    title: 'Thẻ Tháng VIP & Quà Khởi Nghiệp [S]',
    subtitle: 'Nhận Ngọc Hồn + Tinh Chất mỗi ngày, +25% XP Battle Pass và +2 lượt Quét Nhanh.',
    ctaLabel: 'Xem Đặc Quyền',
    target: 'vip' as const,
    accent: 'amber' as const,
  },
  {
    id: 'event_boss_rush',
    badge: 'ĐẤU TRƯỜNG BOSS',
    title: 'Săn Boss Liên Hoàn · Rơi Ngọc Hồn Cực Khủng',
    subtitle: 'Khiêu chiến 5 vòng Thủ Lĩnh liên tiếp để thu hoạch Ngọc Hồn và vinh danh mùa.',
    ctaLabel: 'Vào Săn Boss',
    target: 'boss_rush' as const,
    accent: 'amber' as const,
  },
  {
    id: 'event_stier',
    badge: 'FLASH SALE HÔM NAY',
    title: 'Ưu Đãi Kho Báu & Lò Rèn Thánh Vật [S]',
    subtitle: 'Tách hủy đồ thừa lấy Bụi Tinh Tú để đúc đích danh Vũ Khí [S] Hoàng Đạo.',
    ctaLabel: 'Mở Cửa Hàng',
    target: 'shop' as const,
    accent: 'amber' as const,
  },
  {
    id: 'event_battlepass',
    badge: 'MÙA GIẢI MỚI',
    title: 'Battle Pass Mùa 1 · Tinh Giới Khởi Nguyên',
    subtitle: 'Hoàn thành ải, Quét Nhanh và mở rương để nhận Trang Bị [S] Huyền Thoại.',
    ctaLabel: 'Mở Battle Pass',
    target: 'battlepass' as const,
    accent: 'purple' as const,
  },
  {
    id: 'event_tower',
    badge: 'ĐUA TOP THÁP',
    title: 'Chinh Phục Tháp Vô Tận Hoàng Đạo',
    subtitle: 'Mỗi 3 tầng chạm trán Thủ Lĩnh nhận thưởng lớn Vàng & Ngọc Hồn.',
    ctaLabel: 'Leo Tháp Ngay',
    target: 'tower' as const,
    accent: 'emerald' as const,
  },
];

export const ENEMY_CODEX_LIST: Array<{
  kind: EnemyKind;
  name: string;
  tier: 'Thường' | 'Tinh Anh' | 'Thủ Lĩnh';
  role: string;
  desc: string;
  threat: number; // 1..5
}> = [
  {
    kind: EnemyKind.SKIRMISHER,
    name: 'Lính Đá Tinh Linh',
    tier: 'Thường',
    role: 'Áp sát nhanh',
    desc: 'Chiến binh tuần tra trong các sảnh đá cổ, di chuyển thành bầy để vây ép thợ săn.',
    threat: 1,
  },
  {
    kind: EnemyKind.IMP_ARCHER,
    name: 'Xạ Thủ Quỷ Lùn',
    tier: 'Thường',
    role: 'Tấn công tầm xa',
    desc: 'Bắn cầu năng lượng đỏ từ rìa đấu trường, buộc người chơi phải Lướt hoặc di chuyển né đạn.',
    threat: 2,
  },
  {
    kind: EnemyKind.GOLEM,
    name: 'Golem Đá Cổ Đại',
    tier: 'Tinh Anh',
    role: 'Chống chịu · Đấm Sốc',
    desc: 'Khối đá khổng lồ với lượng HP cao, có thể lao tới dậm đất gây chấn động diện rộng.',
    threat: 3,
  },
  {
    kind: EnemyKind.WISP,
    name: 'Ma Trơi Tinh Vân',
    tier: 'Thường',
    role: 'Phép thuật bay',
    desc: 'Linh hồn ánh sáng bay lơ lửng xuyên qua khe hở, tung đạn ma thuật liên hoàn.',
    threat: 2,
  },
  {
    kind: EnemyKind.DRAGON_WHELP,
    name: 'Tiểu Long Lửa',
    tier: 'Tinh Anh',
    role: 'Khạc đạn hình quạt',
    desc: 'Rồng con canh giữ kho báu, thường phóng chùm cầu lửa 3 tia ở cự ly trung bình.',
    threat: 3,
  },
  {
    kind: EnemyKind.SHADOW_STALKER,
    name: 'Sát Thủ Hư Không',
    tier: 'Tinh Anh',
    role: 'Đột kích tốc độ',
    desc: 'Thợ săn bóng đêm chuyên lao cắt ngang sân với tốc độ cao khi tiếp cận tầm gần.',
    threat: 4,
  },
  {
    kind: EnemyKind.WARDEN_BOSS,
    name: 'Hộ Vệ Thánh Điện',
    tier: 'Thủ Lĩnh',
    role: 'Boss Đa Pha · Xung Kích',
    desc: 'Thủ lĩnh canh cổng các chương đầu. Dưới 55% HP sẽ kích hoạt Pha II Cuồng Nộ tung tia laser và dậm đất.',
    threat: 5,
  },
  {
    kind: EnemyKind.TITAN_BOSS,
    name: 'Chiến Thần Titan',
    tier: 'Thủ Lĩnh',
    role: 'Boss Đa Pha · Mưa Đạn',
    desc: 'Cự nhân khổng lồ triệu hồi vòng xoáy đạn ma thuật kèm các luồng cảnh báo vùng đỏ 3D.',
    threat: 5,
  },
  {
    kind: EnemyKind.ZODIAC_BOSS,
    name: 'Chúa Tể Hoàng Đạo',
    tier: 'Thủ Lĩnh',
    role: 'Boss Tối Thượng · Toàn Năng',
    desc: 'Thực thể tối cao của 12 Cung Hoàng Đạo với tổ hợp đòn xoay xoắn ốc, làn tia hủy diệt và dậm địa chấn.',
    threat: 5,
  },
];

export const CHEST_DROP_RATES: Record<
  'iron' | 'mythic' | 'rune_bag' | 'rune_rare',
  {
    title: string;
    pityNote: string;
    rows: Array<{ label: string; rate: string; colorClass: string }>;
  }
> = {
  iron: {
    title: 'Tỷ Lệ Rương Sắt Chiến Binh',
    pityNote: 'Mở x10 giảm 10% Vàng và đảm bảo tối thiểu 1 trang bị Hiếm trở lên.',
    rows: [
      { label: 'Sử Thi (Epic)', rate: '6.0%', colorClass: 'text-purple-300' },
      { label: 'Hiếm (Rare)', rate: '32.0%', colorClass: 'text-sky-300' },
      { label: 'Thường (Common)', rate: '62.0%', colorClass: 'text-slate-300' },
    ],
  },
  mythic: {
    title: 'Tỷ Lệ Rương Thần Thoại [S]',
    pityNote: 'Bảo hiểm Pity: Sau tối đa 10 lượt chắc chắn nổ Sử Thi+, tối đa 25 lượt chắc chắn nổ trang bị [S]!',
    rows: [
      { label: 'Huyền Thoại (Legendary · Ưu tiên S-Tier)', rate: '14.0%', colorClass: 'text-amber-300' },
      { label: 'Sử Thi (Epic · Cơ hội S-Tier)', rate: '34.0%', colorClass: 'text-purple-300' },
      { label: 'Hiếm (Rare · Bộ Cao Cấp)', rate: '52.0%', colorClass: 'text-sky-300' },
    ],
  },
  rune_bag: {
    title: 'Tỷ Lệ Túi Ngọc Khắc Cổ Đại',
    pityNote: 'Mở x10 giảm 10% Vàng và đảm bảo tối thiểu 1 Ngọc Hiếm trở lên.',
    rows: [
      { label: 'Sử Thi (Epic)', rate: '8.0%', colorClass: 'text-purple-300' },
      { label: 'Hiếm (Rare)', rate: '34.0%', colorClass: 'text-sky-300' },
      { label: 'Thường (Common)', rate: '58.0%', colorClass: 'text-slate-300' },
    ],
  },
  rune_rare: {
    title: 'Tỷ Lệ Rương Ngọc Hiếm',
    pityNote: 'Bảo hiểm Pity: Sau 10 lượt chắc chắn nổ Ngọc Sử Thi/Huyền Thoại (bao gồm Ngọc Valkyrie).',
    rows: [
      { label: 'Huyền Thoại (Legendary)', rate: '14.0%', colorClass: 'text-amber-300' },
      { label: 'Sử Thi (Epic)', rate: '38.0%', colorClass: 'text-purple-300' },
      { label: 'Hiếm (Rare)', rate: '48.0%', colorClass: 'text-sky-300' },
    ],
  },
};

export const MAX_DAILY_SWEEPS = 3;

export function normalizeDailySweeps(
  s?: Partial<DailySweepState>,
  hasVip = false
): DailySweepState {
  const today = getTodayKey();
  const maxSweeps = MAX_DAILY_SWEEPS + (hasVip ? 2 : 0);
  if (!s || s.date !== today) {
    return { date: today, remaining: maxSweeps };
  }
  return {
    date: today,
    remaining: Math.max(0, Math.min(maxSweeps, s.remaining ?? maxSweeps)),
  };
}

export function normalizeFlashDeals(f?: Partial<DailyFlashDealState>): DailyFlashDealState {
  const today = getTodayKey();
  if (!f || f.date !== today) {
    return { date: today, purchasedIds: [] };
  }
  return {
    date: today,
    purchasedIds: Array.isArray(f.purchasedIds) ? f.purchasedIds : [],
  };
}

const ROTATING_DEALS_POOL: FlashDealItem[] = [
  {
    id: 'deal_epic_gear',
    title: 'Bản Thiết Kế Sử Thi',
    subtitle: 'Nhận ngay 1 trang bị ngẫu nhiên bậc Sử Thi (Epic) để ghép đồ.',
    badge: 'GIẢM 40%',
    currency: 'gems',
    originalPrice: 30,
    price: 18,
    discountPct: 40,
    rewardKind: 'gear_epic',
    amount: 1,
  },
  {
    id: 'deal_stier_relic',
    title: 'Thánh Vật [S] Hoàng Đạo',
    subtitle: 'Chắc chắn nhận 1 trang bị [S] Tier phẩm chất Sử Thi trở lên!',
    badge: 'SIÊU HIẾM · -35%',
    currency: 'gems',
    originalPrice: 68,
    price: 44,
    discountPct: 35,
    rewardKind: 'gear_s',
    amount: 1,
  },
  {
    id: 'deal_rune_epic',
    title: 'Ngọc Khắc Cổ Đại Sử Thi',
    subtitle: 'Sở hữu ngay 1 Ngọc Khắc bậc Sử Thi cường hóa sức mạnh.',
    badge: 'GIẢM 35%',
    currency: 'gems',
    originalPrice: 28,
    price: 18,
    discountPct: 35,
    rewardKind: 'rune_epic',
    amount: 1,
  },
  {
    id: 'deal_gold_vault',
    title: 'Túi Vàng Tinh Giới ×500',
    subtitle: 'Đổi nhanh Ngọc Hồn lấy 500 Vàng nâng cấp Bảng Thiên Phú.',
    badge: 'GIẢM 45%',
    currency: 'gems',
    originalPrice: 20,
    price: 11,
    discountPct: 45,
    rewardKind: 'gold',
    amount: 500,
  },
  {
    id: 'deal_gem_exchange',
    title: 'Ngọc Hồn Chi Viện ×20',
    subtitle: 'Ưu đãi đổi Vàng sang 20 Ngọc Hồn mỗi ngày cho thợ săn chăm chỉ.',
    badge: 'ĐỔI BẰNG VÀNG',
    currency: 'gold',
    originalPrice: 360,
    price: 220,
    discountPct: 39,
    rewardKind: 'gems',
    amount: 20,
  },
];

export function getDailyFlashDeals(dateKey: string): FlashDealItem[] {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) % 997;
  }
  const freeDaily: FlashDealItem = {
    id: 'deal_free_daily',
    title: 'Lễ Vật Tiếp Tế Hàng Ngày',
    subtitle: 'Nhận miễn phí 120 Vàng + quà khích lệ mỗi ngày tại Cửa Hàng.',
    badge: 'MIỄN PHÍ 0đ',
    currency: 'free',
    originalPrice: 120,
    price: 0,
    discountPct: 100,
    rewardKind: 'gold',
    amount: 120,
  };
  const picked: FlashDealItem[] = [freeDaily];
  for (let i = 0; i < 3; i++) {
    const idx = (hash + i * 2) % ROTATING_DEALS_POOL.length;
    const candidate = ROTATING_DEALS_POOL[idx];
    if (!picked.some((p) => p.id === candidate.id)) {
      picked.push(candidate);
    } else {
      picked.push(ROTATING_DEALS_POOL[(idx + 1) % ROTATING_DEALS_POOL.length]);
    }
  }
  return picked;
}

export const SYSTEM_MAIL_TEMPLATES: Omit<MailItem, 'claimed'>[] = [
  {
    id: 'mail_grand_launch',
    title: 'Thư Chào Mừng Tinh Giới Hoàng Đạo',
    sender: 'Hội Đồng Hoàng Đạo',
    body: 'Chào mừng Chiến Binh bước vào Hoàng Đạo Tinh Giới! Nhận ngay gói tiếp tế mở đầu gồm Vàng, Ngọc Hồn và Trang Bị Hiếm.',
    date: 'Mùa 1 · Khởi Nguyên',
    rewardGold: 350,
    rewardGems: 25,
    bonusGearRarity: Rarity.RARE,
  },
  {
    id: 'mail_boss_rush_open',
    title: 'Khai Mở Đấu Trường Săn Boss Liên Hoàn',
    sender: 'Đấu Trường Nhật Thực',
    body: 'Chế độ Săn Boss Liên Hoàn 5 vòng đã chính thức khai mở! Sử dụng Ngọc Hồn này để triệu hồi trang bị hoặc mở khóa Anh Hùng.',
    date: 'Sự Kiện Mới',
    rewardGold: 200,
    rewardGems: 30,
  },
  {
    id: 'mail_season1_celebration',
    title: 'Tri Ân Chiến Binh Mùa 1',
    sender: 'Thủ Thư Tinh Tú',
    body: 'Chúc bạn chinh phục đỉnh Tháp Vô Tận và Bảng Vinh Danh Mùa 1! Đừng quên ghé Cửa Hàng Flash Sale mỗi ngày.',
    date: 'Quà Mùa 1',
    rewardGold: 400,
    rewardGems: 20,
    bonusGearRarity: Rarity.EPIC,
    bonusSTier: true,
  },
];

export function normalizeMailInbox(existing?: MailItem[]): MailItem[] {
  const existingMap = new Map((existing ?? []).map((m) => [m.id, m]));
  const merged: MailItem[] = SYSTEM_MAIL_TEMPLATES.map((tpl) => {
    const prev = existingMap.get(tpl.id);
    return prev ? prev : { ...tpl, claimed: false };
  });
  (existing ?? []).forEach((m) => {
    if (!SYSTEM_MAIL_TEMPLATES.some((t) => t.id === m.id)) {
      merged.push(m);
    }
  });
  return merged;
}

export function countUnreadMail(save: SaveData): number {
  return normalizeMailInbox(save.mailInbox).filter((m) => !m.claimed).length;
}

export function computeSeasonScore(save: SaveData, powerRating: number): number {
  const bp = normalizeBattlePass(save.battlePass);
  const career = normalizeCareer(save.career);
  return Math.round(
    powerRating * 0.65 +
      save.highestChapterCleared * 420 +
      (save.bestTowerFloor ?? 0) * 180 +
      (save.bestBossRushRound ?? 0) * 320 +
      bp.xp * 1.2 +
      career.totalBossesKilled * 45
  );
}

export function getSeasonRankInfo(score: number): { tier: string; colorClass: string } {
  if (score >= 9000) return { tier: 'Hoàng Đạo Chí Tôn', colorClass: 'text-rose-300' };
  if (score >= 5800) return { tier: 'Tinh Quân Huyền Thoại', colorClass: 'text-amber-300' };
  if (score >= 3400) return { tier: 'Thủ Hộ Kim Cương', colorClass: 'text-purple-300' };
  if (score >= 1800) return { tier: 'Chiến Binh Bạch Kim', colorClass: 'text-sky-300' };
  return { tier: 'Tân Tinh Đồng', colorClass: 'text-emerald-300' };
}

export const SEASON_HALL_RIVALS: Array<{
  name: string;
  heroName: string;
  title: string;
  score: number;
  chapter: number;
  tower: number;
}> = [
  { name: 'Thiên Lang Vô Song', heroName: 'Wukong', title: 'Chiến Thần Ánh Sáng', score: 9650, chapter: 10, tower: 24 },
  { name: 'Nguyệt Ảnh Linh Cơ', heroName: 'Artemis', title: 'Chúa Tể Kho Báu', score: 7420, chapter: 8, tower: 18 },
  { name: 'Lôi Đế Bất Bại', heroName: 'Thor', title: 'Thợ Săn Thủ Lĩnh', score: 5280, chapter: 6, tower: 14 },
  { name: 'Băng Hậu Tinh Vân', heroName: 'Rolla', title: 'Hộ Vệ Tinh Tú', score: 3450, chapter: 4, tower: 9 },
  { name: 'Huyết Nguyệt Kỵ Sĩ', heroName: 'Dracoola', title: 'Vũ Điệu Liên Kích', score: 2150, chapter: 2, tower: 5 },
  { name: 'Kiếm Sĩ Bình Minh', heroName: 'Alex', title: 'Thợ Săn Sao', score: 1120, chapter: 1, tower: 2 },
];


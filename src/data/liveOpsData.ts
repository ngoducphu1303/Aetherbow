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
import {
  DEFAULT_COMBAT_KEYBINDS,
  normalizeCombatKeybinds,
} from '../engine/aaaWave6Director';
import {
  SYSTEM_MAIL_TEMPLATES,
  countUnclaimedEligibleMail,
} from './earlyProgressionData';

export { SYSTEM_MAIL_TEMPLATES };

export const DEFAULT_SETTINGS: GameSettings = {
  masterVol: 0.85,
  bgmVol: 0.55,
  sfxVol: 0.9,
  graphicsQuality: 'high',
  screenShake: true,
  showDamageNumbers: true,
  starfallWeather: true,
  bloomEnabled: true,
  hapticsEnabled: true,
  highContrastTelegraphs: false,
  hudScale: 'normal',
  combatCameraPreset: 'tactical',
  liveDpsMeter: false,
  photoLightingPreset: 'golden_hall',
  keybinds: { ...DEFAULT_COMBAT_KEYBINDS },
  showFpsOverlay: false,
  adaptiveResolutionGuard: true,
  compactHud: false,
  chapter1MapMode: 'auto',
  lowEndSafetyMode: 'auto',
  reducedMotion: false,
  uiTextScale: 'normal',
};

export function normalizeSettings(s?: Partial<GameSettings>): GameSettings {
  const rawMapMode = s?.chapter1MapMode;
  const chapter1MapMode =
    rawMapMode === 'lite_3d' ||
    rawMapMode === 'light' ||
    rawMapMode === 'high_3d' ||
    rawMapMode === 'auto'
      ? rawMapMode
      : DEFAULT_SETTINGS.chapter1MapMode;
  const rawSafetyMode = s?.lowEndSafetyMode;
  const lowEndSafetyMode =
    rawSafetyMode === 'on' || rawSafetyMode === 'off' || rawSafetyMode === 'auto'
      ? rawSafetyMode
      : DEFAULT_SETTINGS.lowEndSafetyMode;
  const uiTextScale = s?.uiTextScale === 'large' ? 'large' : 'normal';
  return {
    masterVol: s?.masterVol ?? DEFAULT_SETTINGS.masterVol,
    bgmVol: s?.bgmVol ?? DEFAULT_SETTINGS.bgmVol,
    sfxVol: s?.sfxVol ?? DEFAULT_SETTINGS.sfxVol,
    graphicsQuality: s?.graphicsQuality ?? DEFAULT_SETTINGS.graphicsQuality,
    screenShake: s?.screenShake ?? DEFAULT_SETTINGS.screenShake,
    showDamageNumbers: s?.showDamageNumbers ?? DEFAULT_SETTINGS.showDamageNumbers,
    starfallWeather: s?.starfallWeather ?? DEFAULT_SETTINGS.starfallWeather,
    bloomEnabled: s?.bloomEnabled ?? DEFAULT_SETTINGS.bloomEnabled,
    hapticsEnabled: s?.hapticsEnabled ?? DEFAULT_SETTINGS.hapticsEnabled,
    highContrastTelegraphs:
      s?.highContrastTelegraphs ?? DEFAULT_SETTINGS.highContrastTelegraphs,
    hudScale: s?.hudScale ?? DEFAULT_SETTINGS.hudScale,
    combatCameraPreset: s?.combatCameraPreset ?? DEFAULT_SETTINGS.combatCameraPreset,
    liveDpsMeter: s?.liveDpsMeter ?? DEFAULT_SETTINGS.liveDpsMeter,
    photoLightingPreset: s?.photoLightingPreset ?? DEFAULT_SETTINGS.photoLightingPreset,
    keybinds: normalizeCombatKeybinds(s?.keybinds),
    showFpsOverlay: s?.showFpsOverlay ?? DEFAULT_SETTINGS.showFpsOverlay,
    adaptiveResolutionGuard:
      s?.adaptiveResolutionGuard ?? DEFAULT_SETTINGS.adaptiveResolutionGuard,
    compactHud: s?.compactHud ?? DEFAULT_SETTINGS.compactHud,
    chapter1MapMode,
    lowEndSafetyMode,
    reducedMotion: Boolean(s?.reducedMotion ?? DEFAULT_SETTINGS.reducedMotion),
    uiTextScale,
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
    runeRollsSinceLegendary: Math.max(0, Math.floor(p?.runeRollsSinceLegendary ?? 0)),
    ancientRuneShards: Math.max(0, Math.floor(p?.ancientRuneShards ?? 0)),
    forgeRollsSinceEpic: Math.max(0, Math.floor(p?.forgeRollsSinceEpic ?? 0)),
    forgeRollsSinceLegendary: Math.max(0, Math.floor(p?.forgeRollsSinceLegendary ?? 0)),
    forgeRelicShards: Math.max(0, Math.floor(p?.forgeRelicShards ?? 0)),
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
    id: 'event_celestial_festival',
    badge: 'LỄ HỘI TINH GIỚI · GIẢM -80%',
    title: 'Lễ Hội Đèn Lồng Tinh Giới & Hộp Quà Bí Ẩn',
    subtitle: 'Hoàn thành 7 nhiệm vụ nhận Đèn Lồng Tinh Tú, mở Hộp Bí Ẩn giảm tới 80% săn Trang Bị [S] & Lõi Thần Sủng!',
    ctaLabel: 'Vào Lễ Hội',
    target: 'festival' as const,
    accent: 'amber' as const,
  },
  {
    id: 'event_championship_3round',
    badge: 'GIẢI ĐẤU 3 HIỆP 3D · MỚI',
    title: 'Giải Đấu Quán Quân 3 Hiệp & Cúp Vinh Quang',
    subtitle: 'Liên chiến 3 Anh Hùng kình địch kèm chọn Chiến Thuật giữa hiệp để đoạt Cúp Vinh Quang & Lõi Thần Sủng!',
    ctaLabel: 'Đấu 3 Hiệp 3D',
    target: 'championship_3round' as const,
    accent: 'purple' as const,
  },
  {
    id: 'event_spirit_evolution',
    badge: 'THẦN SỦNG 3D · ĐỘT PHÁ',
    title: 'Tiến Hóa Thần Sủng 3D & Gói Đặc Quyền Cuối Tuần',
    subtitle: 'Đột phá Tinh Linh lên Thần Sủng 3D tỏa vòng hào quang nguyên tố, tăng +85% ATK và mở khóa Gói Cuối Tuần!',
    ctaLabel: 'Tiến Hóa Ngay',
    target: 'spirit_evolution' as const,
    accent: 'amber' as const,
  },
  {
    id: 'event_chain_bank',
    badge: 'CHUỖI QUÀ 5 BƯỚC · NGÂN HÀNG NGỌC',
    title: 'Chuỗi Quà Liên Hoàn & Ngân Hàng Hoàn Trả Ngọc Hồn',
    subtitle: 'Nhận MIỄN PHÍ Bước 1 & Bước 3, rút cổ tức Ngân Hàng Tinh Ngân và nhận Thần Tinh nâng Hào Quang Sư Tử Chí Tôn!',
    ctaLabel: 'Nhận Quà Liên Hoàn',
    target: 'chain_bank' as const,
    accent: 'amber' as const,
  },
  {
    id: 'event_divine_halos',
    badge: 'HÀO QUANG 3D · THẦN VỰC',
    title: 'Hào Quang Sư Tử Chí Tôn 3D · Vòng Luân Hoàng Đạo Sau Lưng',
    subtitle: 'Thức tỉnh & thăng cấp Hào Quang Sư Tử Chí Tôn 3D xoay sau lưng Anh Hùng, bùng nổ ATK%, HP% & Sát Thương Bạo Kích!',
    ctaLabel: 'Mở Hào Quang 3D',
    target: 'divine_halo' as const,
    accent: 'amber' as const,
  },
  {
    id: 'event_pantheon_expedition',
    badge: 'ĐIỆN THẦN 3D · MỚI',
    title: 'Viễn Chinh Điện Thần 3D · Săn Thần Tinh & Cổ Thần',
    subtitle: 'Chọn Thần Ấn chúc phúc, liên chiến 3 Cổ Thần Hoàng Đạo để thu hoạch Thần Tinh nâng Hào Quang Sư Tử Chí Tôn!',
    ctaLabel: 'Vào Điện Thần 3D',
    target: 'pantheon_expedition' as const,
    accent: 'purple' as const,
  },
  {
    id: 'event_mythic_artifacts',
    badge: 'THÁNH KHÍ 3D · CHƯƠNG 1',
    title: 'Thánh Khí Tinh Bàn Regulus 3D',
    subtitle: 'Triệu hồi & cường hóa Tinh Bàn Regulus bay hộ vệ bên vai Anh Hùng, tăng mạnh Công Kích, Chí Mạng & Sát Thương Boss!',
    ctaLabel: 'Mở Thánh Khí',
    target: 'mythic_artifact' as const,
    accent: 'amber' as const,
  },
  {
    id: 'event_abyssal_gauntlet',
    badge: 'HỐ SÂU 10 ĐỢT · MỚI',
    title: 'Phó Bản Hố Sâu Đột Biến 3D · Săn Mảnh Thánh Khí',
    subtitle: 'Chinh phục 10 đợt quái đột biến tăng tiến cực hạn để mở khóa 4 mốc thưởng Mảnh Thánh Khí & Ấn Thần Bí!',
    ctaLabel: 'Vào Hố Sâu 3D',
    target: 'abyssal_gauntlet' as const,
    accent: 'purple' as const,
  },
  {
    id: 'event_guild_war',
    badge: 'CHIẾN TRƯỜNG BANG · TUẦN',
    title: 'Chiến Trường Bang Hội 3D · Chiếm Cứ Điểm Vinh Danh',
    subtitle: 'Trấn giữ 3 Trụ Tinh Thể 75s và tiêu diệt Hộ Vệ Chiến Trường để tích Điểm Bang mở Rương Tuần!',
    ctaLabel: 'Chiến Trường Bang',
    target: 'guild_war' as const,
    accent: 'emerald' as const,
  },
  {
    id: 'event_mystic_exchange',
    badge: 'THƯƠNG NHÂN THẦN BÍ',
    title: 'Chợ Đổi Mảnh Dư & Kho Báu Thương Nhân Thần Bí',
    subtitle: 'Chuyển hóa Bụi Tinh Tú, Tinh Chất, Lông Vũ dư thừa thành Ấn Thần Bí, Mảnh Thánh Khí & Thánh Vật [S]!',
    ctaLabel: 'Mở Chợ Thần Bí',
    target: 'mystic_exchange' as const,
    accent: 'amber' as const,
  },
  {
    id: 'event_blood_moon',
    badge: 'SINH TỒN 90S · MỚI',
    title: 'Đêm Trăng Máu 3D · Săn Huyết Long & Báu Vật',
    subtitle: 'Sinh tồn giữa biển quái Huyết Nguyệt 90s để tích Huyết Tinh, đổi Mảnh Thú Cưỡi & Tinh Thể!',
    ctaLabel: 'Vào Trăng Máu',
    target: 'blood_moon' as const,
    accent: 'amber' as const,
  },
  {
    id: 'event_wish_pool',
    badge: 'RATE-UP SSR · X2 NẠP ĐẦU',
    title: 'Hồ Ước Nguyện Thần Thoại & Kho Báu X2 Kim Cương',
    subtitle: 'Chọn mục tiêu SSR yêu thích với bảo hiểm 30 lượt, mở khóa Huyết Long & Gói Nạp X2!',
    ctaLabel: 'Mở Hồ Ước Nguyện',
    target: 'wish_pool' as const,
    accent: 'purple' as const,
  },
  {
    id: 'event_wardrobe_3d',
    badge: 'PHÒNG THỬ ĐỒ 360°',
    title: 'Thử Thú Cưỡi Hoàng Đạo, Cánh & Hào Quang Vũ Khí 3D',
    subtitle: 'Xoay 360 độ ngắm cận cảnh Skin, Đôi Cánh, Thú Cưỡi & Vòng Luân Vũ Khí ngay tại sảnh!',
    ctaLabel: 'Mở Phòng Thử Đồ',
    target: 'wardrobe' as const,
    accent: 'emerald' as const,
  },
  {
    id: 'event_companion_dispatch',
    badge: 'THÁM HIỂM THỤ ĐỘNG',
    title: 'Phái Cử Đồng Hành · Nhận Quà Offline Cực Đã',
    subtitle: 'Giao nhiệm vụ cho các Anh Hùng dự bị thu thập Ngọc Hồn, Mảnh Thú Cưỡi & Tinh Thể.',
    ctaLabel: 'Mở Phái Cử',
    target: 'dispatch' as const,
    accent: 'emerald' as const,
  },
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
    title: 'Túi Vàng Tinh Giới ×450',
    subtitle: 'Đổi nhanh Ngọc Hồn lấy 450 Vàng nâng cấp Bảng Thiên Phú (25 Vàng/Ngọc).',
    badge: 'GIẢM 25%',
    currency: 'gems',
    originalPrice: 24,
    price: 18,
    discountPct: 25,
    rewardKind: 'gold',
    amount: 450,
  },
  {
    id: 'deal_gem_exchange',
    title: 'Ngọc Hồn Chi Viện ×15',
    subtitle: 'Ưu đãi đổi Vàng dư sang 15 Ngọc Hồn mỗi ngày (chống chênh lệch tỷ giá).',
    badge: 'ĐỔI BẰNG VÀNG',
    currency: 'gold',
    originalPrice: 750,
    price: 550,
    discountPct: 27,
    rewardKind: 'gems',
    amount: 15,
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

export function normalizeMailInbox(
  existing?: MailItem[],
  claimedMailIds?: string[],
  deletedMailIds?: string[]
): MailItem[] {
  const claimedSet = new Set<string>(claimedMailIds ?? []);
  const deletedSet = new Set<string>(deletedMailIds ?? []);
  const existingMap = new Map<string, MailItem>();
  for (const m of existing ?? []) {
    if (m.claimed) claimedSet.add(m.id);
    existingMap.set(m.id, m);
  }

  const merged: MailItem[] = [];
  for (const tpl of SYSTEM_MAIL_TEMPLATES) {
    if (deletedSet.has(tpl.id)) continue;
    const prev = existingMap.get(tpl.id);
    merged.push({
      ...tpl,
      claimed: claimedSet.has(tpl.id) || Boolean(prev?.claimed),
    });
  }
  (existing ?? []).forEach((m) => {
    if (deletedSet.has(m.id)) return;
    if (!SYSTEM_MAIL_TEMPLATES.some((t) => t.id === m.id)) {
      merged.push({
        ...m,
        claimed: claimedSet.has(m.id) || m.claimed,
      });
    }
  });
  return merged;
}

export function countUnreadMail(save: SaveData): number {
  return countUnclaimedEligibleMail(save);
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
  { name: 'Nguyệt Ảnh Linh Cơ', heroName: 'Alice', title: 'Chúa Tể Kho Báu', score: 7420, chapter: 8, tower: 18 },
  { name: 'Lôi Đế Bất Bại', heroName: 'Thor', title: 'Thợ Săn Thủ Lĩnh', score: 5280, chapter: 6, tower: 14 },
  { name: 'Băng Hậu Tinh Vân', heroName: 'Rolla', title: 'Hộ Vệ Tinh Tú', score: 3450, chapter: 4, tower: 9 },
  { name: 'Huyết Nguyệt Kỵ Sĩ', heroName: 'Dracoola', title: 'Vũ Điệu Liên Kích', score: 2150, chapter: 2, tower: 5 },
  { name: 'Kiếm Sĩ Bình Minh', heroName: 'Alex', title: 'Thợ Săn Sao', score: 1120, chapter: 1, tower: 2 },
];


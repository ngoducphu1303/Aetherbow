import {
  AbyssalGauntletState,
  AbyssalMilestone,
  ArtifactId,
  ComputedPlayerStats,
  DynamicTitleDef,
  DynamicTitleId,
  GearSlot,
  GuildWarState,
  GuildWarWeeklyBox,
  HeroBondDefinition,
  HeroId,
  MysticCurrencyKind,
  MysticExchangeOffer,
  MysticExchangeState,
  MythicArtifactDefinition,
  SaveData,
} from '../types/game';
import { getTodayKey } from './questsData';

export const MAX_ARTIFACT_LEVEL = 10;

export const MYTHIC_ARTIFACTS: MythicArtifactDefinition[] = [
  {
    id: 'jade_heart_relic',
    name: 'Tâm Ngọc Kim Ngưu',
    badge: 'CHƯƠNG 3 · THÁNH KHÍ 3D',
    elementLabel: 'Kim Ngưu · Thổ Ngọc',
    desc: 'Trái tim kết tinh từ linh mạch ngọc lục bảo, xoay hộ vệ sau vai giúp cường hóa Công, Máu và Sát Thương Boss.',
    primaryHex: 0x10b981,
    secondaryHex: 0xfbbf24,
    baseAtk: 74,
    baseHp: 460,
    baseCrit: 0.07,
    baseBossDmg: 0.15,
    atkPerLv: 24,
    hpPerLv: 135,
    critPerLv: 0.011,
    unlockGems: 0,
    unlockArtifactShards: 0,
  },
  {
    id: 'war_horn', name: 'Chiến Giác Hỏa Tinh', badge: 'CHƯƠNG 2 · THÁNH KHÍ 3D',
    elementLabel: 'Bạch Dương · Hỏa Tinh', desc: 'Chiến giác đúc bằng đồng núi lửa.',
    primaryHex: 0xfc602e, secondaryHex: 0xffcb75,
    baseAtk: 68, baseHp: 420, baseCrit: 0.065, baseBossDmg: 0.14,
    atkPerLv: 22, hpPerLv: 125, critPerLv: 0.011, unlockGems: 0, unlockArtifactShards: 0,
  },
  {
    id: 'astrolabe_regulus',
    name: 'Tinh Bàn Regulus',
    badge: 'CHƯƠNG 1 · THÁNH KHÍ 3D',
    elementLabel: 'Thái Dương · Hoàng Đạo',
    desc: 'Astrolabe of Regulus — Thánh khí chiêm tinh 3D của chòm Sư Tử xoay con quay hộ vệ sau vai, tăng mạnh Công, Chí Mạng & Sát Thương Boss.',
    primaryHex: 0xf59e0b,
    secondaryHex: 0x38bdf8,
    baseAtk: 68,
    baseHp: 420,
    baseCrit: 0.065,
    baseBossDmg: 0.14,
    atkPerLv: 22,
    hpPerLv: 125,
    critPerLv: 0.011,
    unlockGems: 0,
    unlockArtifactShards: 0,
  },
];

export const ARTIFACT_MAP: Record<ArtifactId, MythicArtifactDefinition> = MYTHIC_ARTIFACTS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<ArtifactId, MythicArtifactDefinition>
);

export function getArtifactStats(artifactId: ArtifactId, level: number) {
  const def = ARTIFACT_MAP[artifactId];
  if (!def) {
    return { atk: 0, hp: 0, crit: 0, bossDmg: 0 };
  }
  const lv = Math.max(1, Math.min(MAX_ARTIFACT_LEVEL, level));
  return {
    atk: def.baseAtk + (lv - 1) * def.atkPerLv,
    hp: def.baseHp + (lv - 1) * def.hpPerLv,
    crit: def.baseCrit + (lv - 1) * def.critPerLv,
    bossDmg: def.baseBossDmg + (lv - 1) * 0.015,
  };
}

export function getArtifactUpgradeCost(level: number) {
  const lv = Math.max(1, level);
  return {
    shards: 8 + lv * 5,
    gold: 240 + lv * 150,
  };
}

export const HERO_BONDS: HeroBondDefinition[] = [];

export function evaluateHeroBonds(save: Pick<SaveData, 'unlockedHeroes' | 'heroStars'>) {
  const owned = new Set<HeroId>(save.unlockedHeroes ?? ['aurelia']);
  let atkPct = 0;
  let hpPct = 0;
  let crit = 0;
  let critDmg = 0;
  const activeIds: string[] = [];

  for (const bond of HERO_BONDS) {
    const hasAll = bond.heroIds.every((id) => owned.has(id));
    const totalStars = bond.heroIds.reduce(
      (sum, id) => sum + Math.max(0, save.heroStars?.[id] ?? (owned.has(id) ? 1 : 0)),
      0
    );
    if (hasAll && totalStars >= bond.minTotalStars) {
      activeIds.push(bond.id);
      atkPct += bond.bonusAtkPct;
      hpPct += bond.bonusHpPct;
      crit += bond.bonusCrit;
      critDmg += bond.bonusCritDmg;
    }
  }

  return {
    activeIds,
    activeCount: activeIds.length,
    atkPct,
    hpPct,
    crit,
    critDmg,
  };
}

export function getWeekKey(todayKey = getTodayKey()): string {
  const parts = todayKey.split('-').map((n) => parseInt(n, 10));
  if (parts.length !== 3 || parts.some(Number.isNaN)) return todayKey;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - day + 1);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export const MYSTIC_CURRENCY_LABELS: Record<MysticCurrencyKind, string> = {
  starDust: 'Bụi Tinh Tú',
  petEssence: 'Tinh Chất Pet',
  wingFeathers: 'Lông Vũ',
  mountShards: 'Mảnh Thú Cưỡi',
  awakeningCrystals: 'Tinh Thể Thức Tỉnh',
  mysticTokens: 'Ấn Thần Bí',
};

export const MYSTIC_EXCHANGE_OFFERS: MysticExchangeOffer[] = [
  {
    id: 'ex_dust_to_token',
    title: 'Đổi Bụi Tinh Tú → Ấn Thần Bí',
    desc: 'Quy đổi Bụi Tinh Tú dư từ tách đồ thành Ấn Thần Bí giao dịch cao cấp.',
    badge: 'TÁI CHẾ PHỔ THÔNG',
    inputKind: 'starDust',
    inputAmount: 80,
    outputKind: 'mysticTokens',
    outputAmount: 20,
    weeklyLimit: 10,
  },
  {
    id: 'ex_essence_to_token',
    title: 'Đổi Tinh Chất Pet → Ấn Thần Bí',
    desc: 'Thanh lý Tinh Chất Tinh Linh dư để lấy Ấn Thần Bí.',
    badge: 'TÁI CHẾ PET',
    inputKind: 'petEssence',
    inputAmount: 25,
    outputKind: 'mysticTokens',
    outputAmount: 18,
    weeklyLimit: 8,
  },
  {
    id: 'ex_feather_to_artifact',
    title: 'Đổi Lông Vũ → Mảnh Thánh Khí',
    desc: 'Chế tác Lông Vũ dư thừa thành Mảnh Thánh Khí Thần Thoại.',
    badge: 'CHUYỂN HÓA HIẾM',
    inputKind: 'wingFeathers',
    inputAmount: 10,
    outputKind: 'artifactShards',
    outputAmount: 12,
    weeklyLimit: 6,
  },
  {
    id: 'ex_token_to_artifact',
    title: 'Kho Báu: Rương Mảnh Thánh Khí ×15',
    desc: 'Dùng Ấn Thần Bí mua trực tiếp bộ Mảnh Thánh Khí nâng sao bảo vật 3D.',
    badge: 'THƯƠNG NHÂN ĐỘC QUYỀN',
    inputKind: 'mysticTokens',
    inputAmount: 28,
    outputKind: 'artifactShards',
    outputAmount: 15,
    weeklyLimit: 6,
  },
  {
    id: 'ex_token_to_gems',
    title: 'Túi Ngọc Hồn Thương Nhân (+75 Ngọc)',
    desc: 'Quy đổi Ấn Thần Bí sang Ngọc Hồn nguyên chất mở rương & ước nguyện.',
    badge: 'ƯU ĐÃI TUẦN',
    inputKind: 'mysticTokens',
    inputAmount: 36,
    outputKind: 'gems',
    outputAmount: 75,
    weeklyLimit: 4,
  },
  {
    id: 'ex_token_to_sgear',
    title: 'Kho Báu Tuyệt Mật: Thánh Vật [S] Ngẫu Nhiên',
    desc: 'Đổi Ấn Thần Bí nhận ngay 1 Trang Bị bộ [S] Sử Thi kèm chỉ số phụ.',
    badge: 'TRANG BỊ CẤP [S]',
    inputKind: 'mysticTokens',
    inputAmount: 85,
    outputKind: 's_gear',
    outputAmount: 1,
    weeklyLimit: 2,
  },
];

export function normalizeMysticExchange(raw?: Partial<MysticExchangeState>): MysticExchangeState {
  const weekKey = getWeekKey();
  const sameWeek = raw?.weekKey === weekKey;
  return {
    weekKey,
    mysticTokens: Math.max(0, raw?.mysticTokens ?? 24),
    artifactShards: Math.max(0, raw?.artifactShards ?? 14),
    weeklyClaims: sameWeek && raw?.weeklyClaims ? { ...raw.weeklyClaims } : {},
  };
}

export const ABYSSAL_GAUNTLET_MAX_DAILY_RUNS = 2;
export const ABYSSAL_GAUNTLET_TOTAL_WAVES = 10;

export const ABYSSAL_MILESTONES: AbyssalMilestone[] = [
  { wave: 3, title: 'Đột Phá Tầng Sâu 3', rewardGems: 30, rewardArtifactShards: 8, rewardMysticTokens: 12 },
  { wave: 5, title: 'Chạm Trán Dị Chủ 5', rewardGems: 55, rewardArtifactShards: 14, rewardMysticTokens: 20 },
  { wave: 8, title: 'Vượt Bão Hư Không 8', rewardGems: 85, rewardArtifactShards: 22, rewardMysticTokens: 32 },
  { wave: 10, title: 'Chinh Phục Hố Sâu Tầng 10', rewardGems: 140, rewardArtifactShards: 36, rewardMysticTokens: 50 },
];

export function normalizeAbyssalGauntlet(
  raw?: Partial<AbyssalGauntletState>
): AbyssalGauntletState {
  const today = getTodayKey();
  const sameDay = raw?.date === today;
  return {
    date: today,
    dailyRunsRemaining: sameDay
      ? Math.max(0, raw?.dailyRunsRemaining ?? ABYSSAL_GAUNTLET_MAX_DAILY_RUNS)
      : ABYSSAL_GAUNTLET_MAX_DAILY_RUNS,
    bestWave: Math.max(0, raw?.bestWave ?? 0),
    bestScore: Math.max(0, raw?.bestScore ?? 0),
    totalClears: Math.max(0, raw?.totalClears ?? 0),
    claimedMilestones: Array.isArray(raw?.claimedMilestones) ? raw.claimedMilestones : [],
  };
}

export const GUILD_WAR_MAX_DAILY_RUNS = 2;
export const GUILD_WAR_DURATION_SEC = 75;

export const GUILD_WAR_WEEKLY_BOXES: GuildWarWeeklyBox[] = [
  {
    score: 800,
    title: 'Quà Tiền Đồn Tuần',
    rewardGems: 40,
    rewardGuildCoins: 180,
    rewardArtifactShards: 10,
    rewardMysticTokens: 16,
  },
  {
    score: 2200,
    title: 'Quà Pháo Đài Tuần',
    rewardGems: 75,
    rewardGuildCoins: 320,
    rewardArtifactShards: 18,
    rewardMysticTokens: 28,
  },
  {
    score: 4500,
    title: 'Quà Vinh Danh Bá Chủ Tuần',
    rewardGems: 145,
    rewardGuildCoins: 560,
    rewardArtifactShards: 32,
    rewardMysticTokens: 48,
  },
];

export function normalizeGuildWar(raw?: Partial<GuildWarState>): GuildWarState {
  const today = getTodayKey();
  const weekKey = getWeekKey(today);
  const sameWeek = raw?.weekKey === weekKey;
  const sameDay = raw?.lastRunDate === today;
  return {
    weekKey,
    lastRunDate: today,
    dailyRunsRemaining: sameDay
      ? Math.max(0, raw?.dailyRunsRemaining ?? GUILD_WAR_MAX_DAILY_RUNS)
      : GUILD_WAR_MAX_DAILY_RUNS,
    weeklyScore: sameWeek ? Math.max(0, raw?.weeklyScore ?? 0) : 0,
    totalNodesCaptured: Math.max(0, raw?.totalNodesCaptured ?? 0),
    claimedWeeklyBoxes: sameWeek && Array.isArray(raw?.claimedWeeklyBoxes) ? raw.claimedWeeklyBoxes : [],
  };
}

export const DYNAMIC_TITLES: DynamicTitleDef[] = [
  {
    id: 'none',
    title: 'Không Đeo Danh Hiệu Động',
    unlockHint: 'Mặc định',
    gradientClass: 'text-slate-300',
    borderClass: 'border-slate-700 bg-slate-900/90',
    bonusAtk: 0,
    bonusHp: 0,
  },
  {
    id: 'star_challenger',
    title: 'Tinh Quân Khởi Nguyên',
    unlockHint: 'Đạt 2.500 Lực Chiến trở lên',
    gradientClass: 'a2-title-shimmer-gold',
    borderClass: 'border-amber-300/75 bg-amber-950/55',
    bonusAtk: 18,
    bonusHp: 120,
  },
  {
    id: 'dragon_slayer',
    title: 'Đồ Long Săn Thủ Lĩnh',
    unlockHint: 'Hạ gục tối thiểu 12 Thủ Lĩnh trong sự nghiệp',
    gradientClass: 'a2-title-shimmer-crimson',
    borderClass: 'border-rose-400/75 bg-rose-950/60',
    bonusAtk: 32,
    bonusHp: 210,
  },
  {
    id: 'abyss_conqueror',
    title: 'Bá Chủ Hố Sâu Đột Biến',
    unlockHint: 'Đạt Tầng 5 Hố Sâu Đột Biến 3D',
    gradientClass: 'a2-title-shimmer-arcane',
    borderClass: 'border-purple-400/75 bg-purple-950/60',
    bonusAtk: 46,
    bonusHp: 310,
  },
  {
    id: 'guild_champion',
    title: 'Thống Soái Chiến Trường Bang',
    unlockHint: 'Đạt 2.200 Điểm Tuần Chiến Trường Bang Hội',
    gradientClass: 'a2-title-shimmer-cyan',
    borderClass: 'border-cyan-300/75 bg-cyan-950/60',
    bonusAtk: 54,
    bonusHp: 360,
  },
  {
    id: 'mythic_sovereign',
    title: 'Chí Tôn Hoàng Đạo Vô Địch',
    unlockHint: 'Đạt 8.500 Lực Chiến & sở hữu ít nhất 1 Thánh Khí',
    gradientClass: 'a2-title-shimmer-gold',
    borderClass: 'border-amber-200 bg-gradient-to-r from-amber-950/80 via-rose-950/70 to-amber-950/80',
    bonusAtk: 78,
    bonusHp: 520,
  },
];

export const DYNAMIC_TITLE_MAP: Record<DynamicTitleId, DynamicTitleDef> = DYNAMIC_TITLES.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<DynamicTitleId, DynamicTitleDef>
);

export function evaluateDynamicTitleUnlocks(save: SaveData, powerRating: number): DynamicTitleId[] {
  const unlocked = new Set<DynamicTitleId>(save.unlockedDynamicTitles ?? ['none']);
  unlocked.add('none');
  if (powerRating >= 2500) unlocked.add('star_challenger');
  if ((save.career?.totalBossesKilled ?? 0) >= 12) unlocked.add('dragon_slayer');
  if ((save.abyssalGauntlet?.bestWave ?? 0) >= 5) unlocked.add('abyss_conqueror');
  if ((save.guildWar?.weeklyScore ?? 0) >= 2200) unlocked.add('guild_champion');
  if (powerRating >= 8500 && (save.unlockedArtifacts?.length ?? 0) >= 1) {
    unlocked.add('mythic_sovereign');
  }
  return Array.from(unlocked);
}

export interface PowerRecommendation {
  actionKind:
    | 'gear'
    | 'artifacts'
    | 'halos'
    | 'chain_bank'
    | 'mounts'
    | 'talents'
    | 'constellation'
    | 'mystic_exchange';
  title: string;
  detail: string;
  ctaLabel: string;
  estGainLabel: string;
}

export function computePowerAdvisor(
  save: SaveData,
  stats: ComputedPlayerStats
): PowerRecommendation {
  const mx = normalizeMysticExchange(save.mysticExchange);
  const artifactShards = mx.artifactShards;
  const divineCrystals = save.divineCrystals ?? 0;

  // 0. Wave 10: Free Step-Up Chain Relay or 3D Divine Halo unlock/equip
  const eqHalo = save.equippedHaloId;
  if (!eqHalo && (save.unlockedHalos?.length ?? 0) > 0) {
    return {
      actionKind: 'halos',
      title: 'Trang bị ngay Hào Quang Thần Vực 3D',
      detail: 'Bạn đã sở hữu Hào Quang 3D nhưng chưa kích hoạt sau lưng Anh Hùng.',
      ctaLabel: 'Đeo Hào Quang',
      estGainLabel: '+480 LC',
    };
  }
  if (!eqHalo && divineCrystals >= 20) {
    return {
      actionKind: 'halos',
      title: 'Khai mở Hào Quang Sư Tử Chí Tôn 3D',
      detail: `Đang có ${divineCrystals} Thần Tinh — nâng cấp Hào Quang Sư Tử Chí Tôn tăng mạnh ATK% & Bạo Thương!`,
      ctaLabel: 'Mở Hào Quang',
      estGainLabel: '+520 LC',
    };
  }
  const chainStep = save.stepUpChain?.currentStep ?? 1;
  const chainClaimed = save.stepUpChain?.claimedSteps ?? [];
  if ((chainStep === 1 || chainStep === 3) && !chainClaimed.includes(chainStep)) {
    return {
      actionKind: 'chain_bank',
      title: `Nhận MIỄN PHÍ Bước ${chainStep} Chuỗi Quà Liên Hoàn`,
      detail: 'Nhận ngay Thần Tinh, Ngọc Hồn & Vé Ước Nguyện 0đ tại Trung Tâm Thương Mại.',
      ctaLabel: 'Nhận Quà 0đ',
      estGainLabel: 'Quà Free',
    };
  }

  // 1. Unlocked artifact not equipped or upgradable
  const eqArt = save.equippedArtifactId && ARTIFACT_MAP[save.equippedArtifactId] ? save.equippedArtifactId : null;
  if (!eqArt && (save.unlockedArtifacts?.length ?? 0) > 0) {
    return {
      actionKind: 'artifacts',
      title: 'Trang bị ngay Tinh Bàn Regulus 3D',
      detail: 'Bạn đã sở hữu Thánh Khí nhưng chưa đeo lên vai Anh Hùng.',
      ctaLabel: 'Đeo Thánh Khí',
      estGainLabel: '+320 LC',
    };
  }
  if (!eqArt && artifactShards >= 24) {
    return {
      actionKind: 'artifacts',
      title: 'Mở khóa Thánh Khí Tinh Bàn Regulus',
      detail: `Kho hiện có ${artifactShards} Mảnh Thánh Khí để kích hoạt & nâng cấp Tinh Bàn Regulus.`,
      ctaLabel: 'Mở Thánh Khí',
      estGainLabel: '+420 LC',
    };
  }
  if (eqArt) {
    const artDef = ARTIFACT_MAP[eqArt];
    const lv = Math.max(1, save.artifactLevels?.[eqArt] ?? 1);
    const cost = getArtifactUpgradeCost(lv);
    if (artDef && lv < MAX_ARTIFACT_LEVEL && artifactShards >= cost.shards && save.gold >= cost.gold) {
      return {
        actionKind: 'artifacts',
        title: `Nâng cấp ${artDef.name} lên Lv.${lv + 1}`,
        detail: `Đủ ${cost.shards} Mảnh Thánh Khí & ${cost.gold} Vàng để tăng chỉ số trực tiếp.`,
        ctaLabel: 'Nâng Thánh Khí',
        estGainLabel: `+${Math.round(artDef.atkPerLv * 4.5)} LC`,
      };
    }
  }

  // 2. Equipped gear upgrade check
  for (const slot of [
    GearSlot.WEAPON,
    GearSlot.ARMOR,
    GearSlot.RING,
    GearSlot.NECKLACE,
    GearSlot.HELMET,
    GearSlot.BOOTS,
  ]) {
    const uid = save.equipped[slot];
    const gear = save.inventory.find((g) => g.uid === uid);
    if (gear && gear.level < 30) {
      const goldCost = 40 + gear.level * 28;
      if (save.gold >= goldCost) {
        return {
          actionKind: 'gear',
          title: `Cường hóa Trang Bị lên Lv.${gear.level + 1}`,
          detail: `Chỉ tốn ${goldCost} Vàng để gia tăng trực tiếp Công/Thủ cơ bản.`,
          ctaLabel: 'Cường Hóa Ngay',
          estGainLabel: '+65 LC',
        };
      }
    }
  }

  // 3. Excess StarDust -> Mystic Exchange
  if ((save.starDust ?? 0) >= 80) {
    return {
      actionKind: 'mystic_exchange',
      title: 'Đổi Bụi Tinh Tú dư lấy Ấn Thần Bí & Mảnh Thánh Khí',
      detail: `Đang có ${save.starDust} Bụi Tinh Tú chưa sử dụng tại Chợ Thương Nhân.`,
      ctaLabel: 'Vào Chợ Đổi',
      estGainLabel: 'Tối Ưu Kho',
    };
  }

  // 4. Mount or Talent suggestion
  if ((save.mountShards ?? 0) >= 18 && (save.unlockedMounts?.length ?? 0) === 0) {
    return {
      actionKind: 'mounts',
      title: 'Chiêu mộ Chiến Mã Bạch Dương 3D',
      detail: 'Bạn đã đủ Mảnh Thú Cưỡi để kích hoạt thú cưỡi tăng tốc & ATK.',
      ctaLabel: 'Mở Thú Cưỡi',
      estGainLabel: '+240 LC',
    };
  }

  if (save.gold >= 160) {
    return {
      actionKind: 'talents',
      title: 'Nâng Thiên Phú Hoàng Đạo gia tăng nền tảng',
      detail: `Lực Chiến hiện tại ${stats.powerRating.toLocaleString('vi-VN')} — nâng Thiên Phú để tăng % chỉ số toàn đội.`,
      ctaLabel: 'Mở Thiên Phú',
      estGainLabel: '+90 LC',
    };
  }

  return {
    actionKind: 'constellation',
    title: 'Thắp sáng Bản Đồ 12 Chòm Sao & Hố Sâu Đột Biến',
    detail: 'Chinh phục Hố Sâu Đột Biến hoặc Chiến Trường Bang để gom Mảnh Thánh Khí.',
    ctaLabel: 'Mở 12 Chòm Sao',
    estGainLabel: '+150 LC',
  };
}

export function countClaimableWave9Rewards(save: SaveData): number {
  const ab = normalizeAbyssalGauntlet(save.abyssalGauntlet);
  const abReady = ABYSSAL_MILESTONES.filter(
    (m) => ab.bestWave >= m.wave && !ab.claimedMilestones.includes(m.wave)
  ).length;
  const gw = normalizeGuildWar(save.guildWar);
  const gwReady = GUILD_WAR_WEEKLY_BOXES.filter(
    (b) => gw.weeklyScore >= b.score && !gw.claimedWeeklyBoxes.includes(b.score)
  ).length;
  return abReady + gwReady;
}

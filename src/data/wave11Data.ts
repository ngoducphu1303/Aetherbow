import {
  ChampionshipMilestoneDef,
  ChampionshipState,
  ChampionshipTacticDef,
  CodexRankDef,
  CodexSummary,
  DamageBreakdown,
  FestivalMilestoneDef,
  FestivalQuestDef,
  FestivalState,
  HeroId,
  HonorMarqueeEntry,
  LobbySkyThemeDef,
  LobbySkyThemeId,
  MysteryBoxDef,
  MysteryBoxTierId,
  PetId,
  SaveData,
  WeaponArchetype,
  WeekendPrivilegePackDef,
  WeekendPrivilegeState,
} from '../types/game';
import { getTodayKey } from './questsData';

function getWeekKey(): string {
  const now = new Date();
  const oneJan = new Date(now.getFullYear(), 0, 1);
  const days = Math.floor((now.getTime() - oneJan.getTime()) / 86400000);
  const wk = Math.ceil((days + oneJan.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${String(wk).padStart(2, '0')}`;
}

// ============================================================================
// 1. DYNAMIC 3D LOBBY SKY THEMES & ROYAL CELESTIAL PEDESTAL
// ============================================================================

export const LOBBY_SKY_THEMES: LobbySkyThemeDef[] = [
  {
    id: 'golden_galaxy',
    name: 'Tinh Hà Hoàng Kim',
    badge: 'MẶC ĐỊNH · HOÀNG GIA',
    desc: 'Bầu trời ngân hà trầm ấm ánh vàng hoàng đạo, tôn nổi giáp kim loại và Bệ Đứng Cẩm Thạch Vàng.',
    skyHex: 0x0b1026,
    fogHex: 0x0f1636,
    keyLightHex: 0xffe4b5,
    hemiSkyHex: 0x93c5fd,
    hemiGroundHex: 0x1e1b4b,
    pedestalMarbleHex: 0x1e293b,
    pedestalGoldHex: 0xfbbf24,
    crystalHex: 0xfde047,
    starfallHex: 0xfef08a,
    swatchGradient: 'from-amber-400 via-yellow-500 to-indigo-950',
    unlockGems: 0,
  },
  {
    id: 'dawn_sanctum',
    name: 'Bình Minh Thánh Điện',
    badge: 'MIỄN PHÍ · ÁNH SÁNG',
    desc: 'Ánh nắng bình minh thanh khiết trên đỉnh Olympus với hào quang ngọc bích và bệ đá trắng mạ vàng.',
    skyHex: 0x162447,
    fogHex: 0x1f345e,
    keyLightHex: 0xfff3d6,
    hemiSkyHex: 0xbae6fd,
    hemiGroundHex: 0x1e3a5f,
    pedestalMarbleHex: 0xe2e8f0,
    pedestalGoldHex: 0xf59e0b,
    crystalHex: 0x38bdf8,
    starfallHex: 0xe0f2fe,
    swatchGradient: 'from-sky-300 via-amber-200 to-blue-900',
    unlockGems: 0,
  },
  {
    id: 'lunar_eclipse',
    name: 'Nguyệt Thực Huyền Ảo',
    badge: 'CAO CẤP · TINH VÂN',
    desc: 'Không gian nguyệt thực tử sắc huyền bí cùng trụ tinh thể tử thạch anh xoay quanh bệ đứng.',
    skyHex: 0x120926,
    fogHex: 0x1f1042,
    keyLightHex: 0xe9d5ff,
    hemiSkyHex: 0xc084fc,
    hemiGroundHex: 0x1e1038,
    pedestalMarbleHex: 0x1e1438,
    pedestalGoldHex: 0xc084fc,
    crystalHex: 0xa855f7,
    starfallHex: 0xe879f9,
    swatchGradient: 'from-purple-400 via-fuchsia-600 to-slate-950',
    unlockGems: 90,
    unlockCodexScore: 220,
  },
  {
    id: 'crimson_moon',
    name: 'Huyết Nguyệt Chiến Hồn',
    badge: 'CHÍ TÔN · CHIẾN THẦN',
    desc: 'Đêm Trăng Máu rực lửa chiến hồn, bệ đứng hắc diện thạch viền vàng đỏ tỏa khí chất Vương Giả.',
    skyHex: 0x1a0712,
    fogHex: 0x2d0c1c,
    keyLightHex: 0xfecdd3,
    hemiSkyHex: 0xfb7185,
    hemiGroundHex: 0x290b14,
    pedestalMarbleHex: 0x260c14,
    pedestalGoldHex: 0xf43f5e,
    crystalHex: 0xfb7185,
    starfallHex: 0xfda4af,
    swatchGradient: 'from-rose-500 via-amber-500 to-stone-950',
    unlockGems: 130,
    unlockCodexScore: 420,
  },
];

export const LOBBY_SKY_THEME_MAP: Record<LobbySkyThemeId, LobbySkyThemeDef> =
  LOBBY_SKY_THEMES.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {} as Record<LobbySkyThemeId, LobbySkyThemeDef>);

// ============================================================================
// 2. 3D SPIRIT BEAST EVOLUTION (TIẾN HÓA THẦN SỦNG 3D)
// ============================================================================

export const SPIRIT_BEAST_MIN_LEVEL = 3;
export const SPIRIT_BEAST_EVOLUTION_COST = {
  spiritCores: 8,
  petEssence: 45,
  gold: 600,
};

export const EVOLVED_PET_FORM_NAMES: Record<PetId, string> = {
  solar_phoenix: 'Thái Dương Thần Hoàng (Tiến Hóa)',
  frost_owl: 'Băng Đế Linh Điểu (Tiến Hóa)',
  storm_dragonet: 'Thiên Lôi Cự Long (Tiến Hóa)',
  eclipse_fox: 'Cửu Vĩ Thiên Hồ (Tiến Hóa)',
  jade_turtle: 'Thái Cổ Huyền Vũ (Tiến Hóa)',
  star_fairy: 'Nữ Hoàng Ngân Hà (Tiến Hóa)',
  astraeo: 'Thánh Sư Tử Astraeo (Tiến Hóa)',
  pyro: 'Dương Hỏa Pyro (Tiến Hóa)',
};

export function getSpiritBeastFormName(petId: PetId, isEvolved: boolean, baseName: string): string {
  return isEvolved ? EVOLVED_PET_FORM_NAMES[petId] ?? `${baseName} (Thần Sủng)` : baseName;
}

export function getEvolvedPetMultiplier(isEvolved: boolean): {
  atkMult: number;
  hpMult: number;
  critBonus: number;
  fireRateMult: number;
} {
  if (!isEvolved) {
    return { atkMult: 1, hpMult: 1, critBonus: 0, fireRateMult: 1 };
  }
  return {
    atkMult: 1.85,
    hpMult: 1.75,
    critBonus: 0.04,
    fireRateMult: 0.82,
  };
}

// ============================================================================
// 3. ZODIAC CODEX COLLECTION BUFFS (SỔ TAY SƯU TẦM TĂNG BUFF TOÀN ĐỘI)
// ============================================================================

export const CODEX_COLLECTION_RANKS: CodexRankDef[] = [
  {
    rank: 1,
    title: 'Học Giả Tinh Giới',
    pointsRequired: 40,
    atkPctBonus: 0.02,
    hpPctBonus: 0.02,
    critBonus: 0.005,
    goldPctBonus: 0.03,
    rewardGems: 25,
    rewardSpiritCores: 3,
  },
  {
    rank: 2,
    title: 'Nhà Chiêm Tinh Bạc',
    pointsRequired: 100,
    atkPctBonus: 0.04,
    hpPctBonus: 0.04,
    critBonus: 0.01,
    goldPctBonus: 0.06,
    rewardGems: 35,
    rewardSpiritCores: 4,
  },
  {
    rank: 3,
    title: 'Kỵ Sĩ Sưu Tầm Vàng',
    pointsRequired: 180,
    atkPctBonus: 0.065,
    hpPctBonus: 0.065,
    critBonus: 0.015,
    goldPctBonus: 0.09,
    rewardGems: 50,
    rewardSpiritCores: 6,
  },
  {
    rank: 4,
    title: 'Quản Thủ Kho Báu Hoàng Gia',
    pointsRequired: 280,
    atkPctBonus: 0.09,
    hpPctBonus: 0.09,
    critBonus: 0.022,
    goldPctBonus: 0.12,
    rewardGems: 65,
    rewardSpiritCores: 8,
  },
  {
    rank: 5,
    title: 'Tông Sư Thập Nhị Cung',
    pointsRequired: 400,
    atkPctBonus: 0.12,
    hpPctBonus: 0.12,
    critBonus: 0.03,
    goldPctBonus: 0.15,
    rewardGems: 85,
    rewardSpiritCores: 10,
  },
  {
    rank: 6,
    title: 'Hiền Giả Ngân Hà',
    pointsRequired: 540,
    atkPctBonus: 0.155,
    hpPctBonus: 0.15,
    critBonus: 0.04,
    goldPctBonus: 0.18,
    rewardGems: 110,
    rewardSpiritCores: 12,
  },
  {
    rank: 7,
    title: 'Chúa Tể Bách Khoa Tinh Tú',
    pointsRequired: 700,
    atkPctBonus: 0.19,
    hpPctBonus: 0.185,
    critBonus: 0.05,
    goldPctBonus: 0.22,
    rewardGems: 145,
    rewardSpiritCores: 16,
  },
  {
    rank: 8,
    title: 'Đại Tông Sư Hoàng Đạo Vĩnh Hằng',
    pointsRequired: 900,
    atkPctBonus: 0.24,
    hpPctBonus: 0.23,
    critBonus: 0.065,
    goldPctBonus: 0.28,
    rewardGems: 200,
    rewardSpiritCores: 24,
  },
];

export function computeCodexSummary(save: SaveData): CodexSummary {
  const heroCount = save.unlockedHeroes?.length ?? 1;
  const totalHeroStars = Object.values(save.heroStars ?? {}).reduce((s, v) => s + Math.max(1, v ?? 1), 0);
  const heroPoints = heroCount * 24 + Math.max(0, totalHeroStars - heroCount) * 8;

  const petCount = save.pets?.length ?? 0;
  const evolvedCount = save.evolvedPets?.length ?? 0;
  const petPoints = petCount * 22 + evolvedCount * 42;

  const skinCount = Math.max(0, (save.unlockedSkins?.length ?? 1) - 1);
  const wingCount = save.unlockedWings?.length ?? 0;
  const mountCount = save.unlockedMounts?.length ?? 0;
  const auraCount = Math.max(0, (save.unlockedWeaponAuras?.length ?? 1) - 1);
  const skyCount = Math.max(0, (save.unlockedSkyThemes?.length ?? 2) - 2);
  const cosmeticPoints = skinCount * 16 + wingCount * 30 + mountCount * 35 + auraCount * 22 + skyCount * 25;

  const artifactCount = save.unlockedArtifacts?.length ?? 0;
  const haloCount = save.unlockedHalos?.length ?? 0;
  const badgeCount = save.claimedMythicBadges?.length ?? 0;
  const bannerCount = save.unlockedWarBanners?.length ?? 0;
  const mythicTier = save.mythicWeapon?.tier ?? 0;
  const artifactHaloPoints =
    artifactCount * 36 + haloCount * 42 + badgeCount * 18 + bannerCount * 32 + mythicTier * 28;

  const totalPoints = heroPoints + petPoints + cosmeticPoints + artifactHaloPoints;

  let currentRank: CodexRankDef = {
    rank: 0,
    title: 'Tân Thủ Sưu Tầm',
    pointsRequired: 0,
    atkPctBonus: 0,
    hpPctBonus: 0,
    critBonus: 0,
    goldPctBonus: 0,
    rewardGems: 0,
    rewardSpiritCores: 0,
  };
  let nextRank: CodexRankDef | null = CODEX_COLLECTION_RANKS[0];

  for (let i = 0; i < CODEX_COLLECTION_RANKS.length; i++) {
    const r = CODEX_COLLECTION_RANKS[i];
    if (totalPoints >= r.pointsRequired) {
      currentRank = r;
      nextRank = CODEX_COLLECTION_RANKS[i + 1] ?? null;
    } else {
      nextRank = r;
      break;
    }
  }

  return {
    totalPoints,
    heroPoints,
    petPoints,
    cosmeticPoints,
    artifactHaloPoints,
    currentRank,
    nextRank,
    totalAtkPct: currentRank.atkPctBonus,
    totalHpPct: currentRank.hpPctBonus,
    totalCrit: currentRank.critBonus,
    totalGoldPct: currentRank.goldPctBonus,
  };
}

export function countClaimableCodexRanks(save: SaveData): number {
  const summary = computeCodexSummary(save);
  const claimed = save.codexClaimedRanks ?? [];
  return CODEX_COLLECTION_RANKS.filter(
    (r) => summary.totalPoints >= r.pointsRequired && !claimed.includes(r.rank)
  ).length;
}

// ============================================================================
// 4. CELESTIAL FESTIVAL EVENT HUB & MYSTERY BOXES (LỄ HỘI TINH GIỚI)
// ============================================================================

export const CELESTIAL_FESTIVAL_QUESTS: FestivalQuestDef[] = [
  {
    id: 'fest_q_runs_1',
    title: 'Khai Hội Tinh Giới',
    desc: 'Hoàn thành ít nhất 1 trận chiến bất kỳ trong Tinh Giới.',
    metric: 'runs',
    target: 1,
    rewardLanterns: 20,
    rewardGold: 260,
    rewardGems: 12,
  },
  {
    id: 'fest_q_kills_30',
    title: 'Dẹp Loạn Đêm Hội',
    desc: 'Tiêu diệt tổng cộng 30 quái vật trong sự nghiệp.',
    metric: 'kills',
    target: 30,
    rewardLanterns: 25,
    rewardGold: 340,
    rewardGems: 15,
  },
  {
    id: 'fest_q_chests_3',
    title: 'Thợ Săn Rương Lễ Hội',
    desc: 'Triệu hồi tổng cộng 3 Rương Kho Báu bất kỳ.',
    metric: 'chests',
    target: 3,
    rewardLanterns: 30,
    rewardGold: 420,
    rewardGems: 20,
  },
  {
    id: 'fest_q_heroes_2',
    title: 'Tụ Hội Chiến Binh',
    desc: 'Sở hữu ít nhất 2 Anh Hùng Hoàng Đạo.',
    metric: 'hero_count',
    target: 2,
    rewardLanterns: 35,
    rewardGold: 520,
    rewardGems: 24,
  },
  {
    id: 'fest_q_champ_1',
    title: 'Vinh Quang Đấu Trường 3 Hiệp',
    desc: 'Giành ít nhất 1 danh hiệu Quán Quân Giải Đấu 3 Hiệp.',
    metric: 'championship_wins',
    target: 1,
    rewardLanterns: 45,
    rewardGold: 680,
    rewardGems: 32,
  },
  {
    id: 'fest_q_evolve_1',
    title: 'Thức Tỉnh Thần Sủng',
    desc: 'Tiến hóa thành công ít nhất 1 Tinh Linh lên Thần Sủng 3D.',
    metric: 'evolved_pets',
    target: 1,
    rewardLanterns: 50,
    rewardGold: 800,
    rewardGems: 36,
  },
  {
    id: 'fest_q_codex_180',
    title: 'Kỵ Sĩ Sưu Tầm Lễ Hội',
    desc: 'Đạt tối thiểu 180 Điểm Sưu Tầm trong Sổ Tay Hoàng Đạo.',
    metric: 'codex_score',
    target: 180,
    rewardLanterns: 60,
    rewardGold: 950,
    rewardGems: 45,
  },
];

export const FESTIVAL_MILESTONES: FestivalMilestoneDef[] = [
  {
    lanternsTarget: 40,
    title: 'Đèn Lồng Khởi Nguyên',
    rewardGems: 30,
    rewardSpiritCores: 4,
    rewardDivineCrystals: 8,
    rewardWishTickets: 1,
  },
  {
    lanternsTarget: 100,
    title: 'Đèn Lồng Nguyệt Quang',
    rewardGems: 50,
    rewardSpiritCores: 7,
    rewardDivineCrystals: 14,
    rewardWishTickets: 2,
  },
  {
    lanternsTarget: 180,
    title: 'Đèn Lồng Tinh Hà',
    rewardGems: 80,
    rewardSpiritCores: 11,
    rewardDivineCrystals: 22,
    rewardWishTickets: 3,
  },
  {
    lanternsTarget: 260,
    title: 'Đại Tiệc Hoàng Đạo Chí Tôn',
    rewardGems: 130,
    rewardSpiritCores: 18,
    rewardDivineCrystals: 36,
    rewardWishTickets: 5,
  },
];

export const FESTIVAL_MYSTERY_BOXES: MysteryBoxDef[] = [
  {
    id: 'nebula',
    name: 'Hộp Bí Ẩn Tinh Vân',
    badge: 'GIẢM SÂU -60%',
    discountLabel: '-60%',
    originalGems: 85,
    costGems: 34,
    maxWeeklyPurchases: 5,
    lanternsBonus: 18,
    guaranteedSummary: 'Chắc chắn nhận +18 Đèn Lồng & +3 Lõi Thần Sủng + 1 Quà Bí Ẩn ngẫu nhiên.',
    drops: [
      { label: '550 Vàng + 25 Tinh Chất Tinh Linh', chancePct: 42, rarity: 'rare' },
      { label: '6 Lõi Thần Sủng + 8 Thần Tinh', chancePct: 30, rarity: 'epic' },
      { label: '2 Vé Ước Nguyện + 12 Mảnh Thánh Khí', chancePct: 20, rarity: 'legendary' },
      { label: 'JACKPOT: +120 Ngọc Hồn + Trang Bị [S]', chancePct: 8, rarity: 'mythic' },
    ],
  },
  {
    id: 'eclipse',
    name: 'Hộp Bí Ẩn Nhật Thực',
    badge: 'BÁN CHẠY · -70%',
    discountLabel: '-70%',
    originalGems: 220,
    costGems: 66,
    maxWeeklyPurchases: 4,
    lanternsBonus: 36,
    guaranteedSummary: 'Chắc chắn nhận +36 Đèn Lồng, +6 Lõi Thần Sủng & tỷ lệ cao nổ Đồ [S].',
    drops: [
      { label: '1.200 Vàng + 14 Thần Tinh + 2 Vé Ước', chancePct: 36, rarity: 'epic' },
      { label: '12 Lõi Thần Sủng + 18 Mảnh Thánh Khí', chancePct: 32, rarity: 'legendary' },
      { label: '1 Trang Bị [S] Sử Thi+ & +60 Ngọc Hồn', chancePct: 22, rarity: 'legendary' },
      { label: 'JACKPOT: +220 Ngọc Hồn + 1 Trang Bị [S] + 4 Vé Ước', chancePct: 10, rarity: 'mythic' },
    ],
  },
  {
    id: 'supreme',
    name: 'Hộp Đại Lễ Chí Tôn',
    badge: 'SIÊU ĐỘC QUYỀN · -80%',
    discountLabel: '-80%',
    originalGems: 590,
    costGems: 118,
    maxWeeklyPurchases: 2,
    lanternsBonus: 72,
    guaranteedSummary: 'Chắc chắn nhận Trang Bị [S], +72 Đèn Lồng, +12 Lõi Thần Sủng & Quà Nổ Hũ Chí Tôn.',
    drops: [
      { label: 'Trang Bị [S] + 24 Thần Tinh + 4 Vé Ước', chancePct: 40, rarity: 'legendary' },
      { label: 'Trang Bị [S] + 18 Lõi Thần Sủng + 25 Mảnh Thánh Khí', chancePct: 35, rarity: 'legendary' },
      { label: 'ĐẠI JACKPOT: Trang Bị [S] + 350 Ngọc Hồn + 6 Vé Ước', chancePct: 25, rarity: 'mythic' },
    ],
  },
];

export function normalizeFestivalState(f?: Partial<FestivalState>): FestivalState {
  const wk = getWeekKey();
  if (!f || f.weekKey !== wk) {
    return {
      weekKey: wk,
      lanterns: Math.max(15, f?.lanterns ?? 15),
      claimedQuestIds: [],
      claimedMilestones: [],
      mysteryBoxPurchases: {},
      totalBoxesOpened: Math.max(0, f?.totalBoxesOpened ?? 0),
    };
  }
  return {
    weekKey: wk,
    lanterns: Math.max(0, f.lanterns ?? 0),
    claimedQuestIds: Array.isArray(f.claimedQuestIds) ? f.claimedQuestIds : [],
    claimedMilestones: Array.isArray(f.claimedMilestones) ? f.claimedMilestones : [],
    mysteryBoxPurchases: f.mysteryBoxPurchases ?? {},
    totalBoxesOpened: Math.max(0, f.totalBoxesOpened ?? 0),
  };
}

export function getFestivalQuestProgress(save: SaveData, metric: FestivalQuestDef['metric']): number {
  switch (metric) {
    case 'runs':
      return save.career?.totalRuns ?? 0;
    case 'kills':
      return save.career?.totalKills ?? 0;
    case 'chests':
      return save.career?.totalChestsOpened ?? 0;
    case 'hero_count':
      return save.unlockedHeroes?.length ?? 1;
    case 'championship_wins':
      return save.championship?.championshipTitlesWon ?? 0;
    case 'evolved_pets':
      return save.evolvedPets?.length ?? 0;
    case 'codex_score':
      return computeCodexSummary(save).totalPoints;
  }
}

export function countClaimableFestivalRewards(save: SaveData): number {
  const st = normalizeFestivalState(save.festivalState);
  let count = 0;
  for (const q of CELESTIAL_FESTIVAL_QUESTS) {
    if (!st.claimedQuestIds.includes(q.id) && getFestivalQuestProgress(save, q.metric) >= q.target) {
      count++;
    }
  }
  for (const ms of FESTIVAL_MILESTONES) {
    if (st.lanterns >= ms.lanternsTarget && !st.claimedMilestones.includes(ms.lanternsTarget)) {
      count++;
    }
  }
  return count;
}

// ============================================================================
// 5. 13TH GAME MODE: 3-ROUND 3D CHAMPIONSHIP GAUNTLET & GLORY TROPHIES
// ============================================================================

export const CHAMPIONSHIP_TOTAL_ROUNDS = 3;
export const MAX_DAILY_CHAMPIONSHIP_RUNS = 3;

export interface ChampionshipRivalDef {
  round: number;
  name: string;
  title: string;
  heroId: HeroId;
  weaponArchetype: WeaponArchetype;
  accentHex: number;
  cloakHex: number;
  hairHex: number;
  hpMult: number;
  atkMult: number;
  trophyReward: number;
}

export const CHAMPIONSHIP_RIVALS: ChampionshipRivalDef[] = [
  {
    round: 1,
    name: 'Hiệp 1 · Kaelen Ưng Nhãn',
    title: 'Vòng Tứ Kết Hoàng Đạo',
    heroId: 'aurelia',
    weaponArchetype: 'bow',
    accentHex: 0x38bdf8,
    cloakHex: 0x1e3a8a,
    hairHex: 0xe0f2fe,
    hpMult: 1.15,
    atkMult: 0.92,
    trophyReward: 25,
  },
  {
    round: 2,
    name: 'Hiệp 2 · Lyra Thanh Âm',
    title: 'Vòng Bán Kết Tinh Vân',
    heroId: 'bellona',
    weaponArchetype: 'bow',
    accentHex: 0x39c5bb,
    cloakHex: 0x172b36,
    hairHex: 0x39c5bb,
    hpMult: 1.48,
    atkMult: 1.08,
    trophyReward: 40,
  },
  {
    round: 3,
    name: 'Hiệp 3 · Vương Giả Solarius',
    title: 'CHUNG KẾT CÚP VINH QUANG',
    heroId: 'aurelia',
    weaponArchetype: 'bow',
    accentHex: 0xfbbf24,
    cloakHex: 0x7c2d12,
    hairHex: 0xfef08a,
    hpMult: 1.85,
    atkMult: 1.24,
    trophyReward: 75,
  },
];

export const CHAMPIONSHIP_TACTICS: ChampionshipTacticDef[] = [
  {
    id: 'tactic_fury',
    name: 'Chiến Thuật Cuồng Nộ',
    badge: '+32% CÔNG · ĐÁNH PHỦ ĐẦU',
    desc: 'Gia tăng mạnh Sát Thương Công Kích để kết liễu kình địch hiệp kế tiếp.',
    atkBonusPct: 0.32,
    accentClass: 'border-rose-400/70 bg-rose-950/75 text-rose-200',
  },
  {
    id: 'tactic_vampiric',
    name: 'Hồi Phục Tinh Huyết',
    badge: 'HỒI 45% HP · +15% CÔNG',
    desc: 'Lập tức hồi phục 45% Sinh Lực tối đa và cường hóa thêm 15% Công Kích.',
    healPct: 0.45,
    atkBonusPct: 0.15,
    accentClass: 'border-emerald-400/70 bg-emerald-950/75 text-emerald-200',
  },
  {
    id: 'tactic_executioner',
    name: 'Mũi Tên Trảm Tướng',
    badge: '+24% CHÍ MẠNG · +18% CÔNG',
    desc: 'Đột biến tỷ lệ Chí Mạng cực cao xuyên phá giáp kình địch Chung Kết.',
    critBonus: 0.24,
    atkBonusPct: 0.18,
    accentClass: 'border-amber-400/70 bg-amber-950/75 text-amber-200',
  },
  {
    id: 'tactic_aegis',
    name: 'Khiên Vàng Hoàng Đạo',
    badge: 'KHIÊN 35% HP · +18% GIẢM ST',
    desc: 'Tạo lớp Khiên Năng Lượng dày và tăng khả năng chống chịu trước chiêu cuối đối thủ.',
    shieldPct: 0.35,
    drBonus: 0.18,
    accentClass: 'border-sky-400/70 bg-sky-950/75 text-sky-200',
  },
  {
    id: 'tactic_rapidfire',
    name: 'Liên Xạ Tinh Quang',
    badge: '+30% TỐC BẮN · +12% BẠO',
    desc: 'Đẩy tốc độ xuất chiêu lên cực hạn áp đảo nhịp đấu 3D.',
    aspdBonus: 0.3,
    critBonus: 0.12,
    accentClass: 'border-cyan-400/70 bg-cyan-950/75 text-cyan-200',
  },
  {
    id: 'tactic_spirit_surge',
    name: 'Bùng Nổ Nộ Khí',
    badge: 'ĐẦY 100% TUYỆT KỸ · +20% CÔNG',
    desc: 'Nạp đầy lập tức thanh Tuyệt Kỹ Nộ (Q) để mở màn hiệp sau bằng đại chiêu!',
    ultFill: 100,
    atkBonusPct: 0.2,
    accentClass: 'border-purple-400/70 bg-purple-950/75 text-purple-200',
  },
];

export const CHAMPIONSHIP_CUP_MILESTONES: ChampionshipMilestoneDef[] = [
  {
    trophiesTarget: 60,
    title: 'Cúp Đồng Tân Tinh',
    rewardGems: 30,
    rewardSpiritCores: 5,
    rewardLanterns: 20,
    rewardWishTickets: 1,
  },
  {
    trophiesTarget: 150,
    title: 'Cúp Bạc Đấu Sĩ',
    rewardGems: 50,
    rewardSpiritCores: 8,
    rewardLanterns: 35,
    rewardWishTickets: 2,
  },
  {
    trophiesTarget: 280,
    title: 'Cúp Vàng Quán Quân',
    rewardGems: 75,
    rewardSpiritCores: 12,
    rewardLanterns: 50,
    rewardWishTickets: 3,
  },
  {
    trophiesTarget: 450,
    title: 'Cúp Bạch Kim Tinh Giới',
    rewardGems: 110,
    rewardSpiritCores: 16,
    rewardLanterns: 70,
    rewardWishTickets: 4,
  },
  {
    trophiesTarget: 700,
    title: 'Cúp Chí Tôn Hoàng Đạo',
    rewardGems: 165,
    rewardSpiritCores: 24,
    rewardLanterns: 100,
    rewardWishTickets: 6,
  },
];

export function normalizeChampionshipState(
  c?: Partial<ChampionshipState>,
  hasVip = false
): ChampionshipState {
  const today = getTodayKey();
  const maxRuns = MAX_DAILY_CHAMPIONSHIP_RUNS + (hasVip ? 1 : 0);
  if (!c || c.date !== today) {
    return {
      date: today,
      dailyRunsRemaining: maxRuns,
      gloryTrophies: Math.max(0, c?.gloryTrophies ?? 0),
      bestRoundCleared: Math.max(0, Math.min(3, c?.bestRoundCleared ?? 0)),
      championshipTitlesWon: Math.max(0, c?.championshipTitlesWon ?? 0),
      claimedCupMilestones: Array.isArray(c?.claimedCupMilestones) ? c.claimedCupMilestones : [],
    };
  }
  return {
    date: today,
    dailyRunsRemaining: Math.max(0, Math.min(maxRuns, c.dailyRunsRemaining ?? maxRuns)),
    gloryTrophies: Math.max(0, c.gloryTrophies ?? 0),
    bestRoundCleared: Math.max(0, Math.min(3, c.bestRoundCleared ?? 0)),
    championshipTitlesWon: Math.max(0, c.championshipTitlesWon ?? 0),
    claimedCupMilestones: Array.isArray(c.claimedCupMilestones) ? c.claimedCupMilestones : [],
  };
}

export function countClaimableChampionshipMilestones(save: SaveData): number {
  const st = normalizeChampionshipState(save.championship);
  return CHAMPIONSHIP_CUP_MILESTONES.filter(
    (m) => st.gloryTrophies >= m.trophiesTarget && !st.claimedCupMilestones.includes(m.trophiesTarget)
  ).length;
}

// ============================================================================
// 6. WEEKEND GOLDEN PRIVILEGE & LIVE FLASH SALE TIMER
// ============================================================================

export const WEEKEND_PRIVILEGE_PACKS: WeekendPrivilegePackDef[] = [
  {
    id: 'wk_golden_pass',
    name: 'Thẻ Đặc Quyền Cuối Tuần (3 Ngày)',
    badge: 'BÁN CHẠY NHẤT · LỜI 850%',
    discountLabel: '-75%',
    originalGems: 320,
    costGems: 80,
    isBestSeller: true,
    subtitle: 'Kích hoạt 3 ngày nhận quà cuối tuần liên tiếp (+45 Ngọc & +4 Lõi Thần Sủng mỗi ngày) + nhận ngay 10 Lõi & 40 Đèn Lồng!',
    rewardGold: 1600,
    rewardGems: 50,
    rewardSpiritCores: 10,
    rewardDivineCrystals: 14,
    rewardLanterns: 40,
    rewardWishTickets: 3,
    activatesWeekendPass: true,
    topUpPoints: 120,
  },
  {
    id: 'wk_spirit_evolution_box',
    name: 'Rương Tiến Hóa Thần Sủng 3D',
    badge: 'ƯU ĐÃI CUỐI TUẦN · -68%',
    discountLabel: '-68%',
    originalGems: 290,
    costGems: 92,
    subtitle: 'Đủ trọn bộ Lõi Thần Sủng & Vàng để tiến hóa ngay 1 Tinh Linh lên Thần Sủng 3D tỏa hào quang!',
    rewardGold: 2200,
    rewardGems: 0,
    rewardSpiritCores: 16,
    rewardDivineCrystals: 18,
    rewardLanterns: 45,
    rewardWishTickets: 3,
    topUpPoints: 140,
  },
  {
    id: 'wk_emperor_s_bundle',
    name: 'Kho Báu Hoàng Kim Chí Tôn',
    badge: 'GIỚI HẠN TUẦN · NỔ ĐỒ [S]',
    discountLabel: '-80%',
    originalGems: 780,
    costGems: 156,
    subtitle: 'Chắc chắn nhận 1 Trang Bị [S] Sử Thi+ kèm 20 Lõi Thần Sủng, 30 Thần Tinh, 6 Vé Ước & 80 Đèn Lồng!',
    rewardGold: 3800,
    rewardGems: 65,
    rewardSpiritCores: 20,
    rewardDivineCrystals: 30,
    rewardLanterns: 80,
    rewardWishTickets: 6,
    rewardSGear: true,
    topUpPoints: 260,
  },
];

export function normalizeWeekendPrivilege(w?: Partial<WeekendPrivilegeState>): WeekendPrivilegeState {
  const wk = getWeekKey();
  const basePassActive = Boolean(w?.passActive && (w?.daysRemaining ?? 0) > 0);
  if (!w || w.weekKey !== wk) {
    return {
      passActive: basePassActive,
      daysRemaining: basePassActive ? Math.max(0, w?.daysRemaining ?? 0) : 0,
      lastClaimDate: w?.lastClaimDate ?? '',
      purchasedPackIds: [],
      weekKey: wk,
    };
  }
  return {
    passActive: basePassActive,
    daysRemaining: Math.max(0, w.daysRemaining ?? 0),
    lastClaimDate: w.lastClaimDate ?? '',
    purchasedPackIds: Array.isArray(w.purchasedPackIds) ? w.purchasedPackIds : [],
    weekKey: wk,
  };
}

export function canClaimWeekendPassDaily(save: SaveData): boolean {
  const wp = normalizeWeekendPrivilege(save.weekendPass);
  return wp.passActive && wp.daysRemaining > 0 && wp.lastClaimDate !== getTodayKey();
}

export function getFlashSaleSecondsRemaining(nowMs: number = Date.now()): number {
  const cycleSec = 4 * 3600; // 4-hour rolling Flash Sale commercial cycle
  const elapsed = Math.floor(nowMs / 1000) % cycleSec;
  return Math.max(1, cycleSec - elapsed);
}

export function formatCountdownHMS(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ============================================================================
// 7. HALL OF HONOR MARQUEE FEED & POST-MATCH MVP GRADING
// ============================================================================

export const DEFAULT_HONOR_FEED: HonorMarqueeEntry[] = [
  {
    id: 'hon_1',
    playerName: 'AureliaVN',
    badge: 'THẦN SỦNG 3D',
    message: 'vừa tiến hóa thành công Thái Dương Thần Hoàng (+85% Sát Thương Tinh Linh)!',
    accent: 'gold',
  },
  {
    id: 'hon_2',
    playerName: 'KaitoBạchDương',
    badge: 'QUÁN QUÂN 3 HIỆP',
    message: 'đăng quang Giải Đấu Quán Quân 3 Hiệp 3D và nhận +140 Cúp Vinh Quang!',
    accent: 'emerald',
  },
  {
    id: 'hon_3',
    playerName: 'NữThầnTinhVân',
    badge: 'LỄ HỘI JACKPOT',
    message: 'mở Hộp Đại Lễ Chí Tôn nổ Trang Bị [S] + 350 Ngọc Hồn!',
    accent: 'purple',
  },
  {
    id: 'hon_4',
    playerName: 'LongVươngS1',
    badge: 'TÔNG SƯ SƯU TẦM',
    message: 'đạt Bậc 6 Hiền Giả Ngân Hà mở khóa +15.5% Công Toàn Đội vĩnh viễn!',
    accent: 'rose',
  },
];

export interface MatchMvpReport {
  grade: 'SSS' | 'SS' | 'S' | 'A' | 'B';
  gradeColorClass: string;
  mvpBadgeTitle: string;
  dominantSourceLabel: string;
  recoveryHint: {
    label: string;
    detail: string;
    target: 'gear' | 'pets' | 'halos' | 'festival';
  };
}

export function evaluateMatchMvpReport(params: {
  isVictory: boolean;
  kills: number;
  maxCombo: number;
  damageBreakdown?: DamageBreakdown;
}): MatchMvpReport {
  const bd = params.damageBreakdown;
  const totalDmg = bd ? bd.basic + bd.ultimate + bd.pet + bd.elemental : 0;
  const dps = bd && bd.elapsedSeconds > 0 ? Math.round(totalDmg / bd.elapsedSeconds) : 0;

  let score = 0;
  if (params.isVictory) score += 52;
  score += Math.min(20, Math.floor(params.kills * 0.8));
  score += Math.min(18, Math.floor(params.maxCombo * 0.6));
  score += Math.min(20, Math.floor(dps / 35));

  let grade: MatchMvpReport['grade'] = 'B';
  let gradeColorClass = 'text-sky-300 border-sky-400/60 bg-sky-950/75';
  if (score >= 92 && params.isVictory) {
    grade = 'SSS';
    gradeColorClass = 'text-amber-200 border-amber-300 bg-gradient-to-br from-amber-500/35 to-rose-500/35';
  } else if (score >= 78 && params.isVictory) {
    grade = 'SS';
    gradeColorClass = 'text-amber-300 border-amber-400/80 bg-amber-950/75';
  } else if (score >= 62) {
    grade = 'S';
    gradeColorClass = 'text-purple-200 border-purple-400/75 bg-purple-950/75';
  } else if (score >= 40) {
    grade = 'A';
    gradeColorClass = 'text-emerald-200 border-emerald-400/70 bg-emerald-950/75';
  }

  let mvpBadgeTitle = 'Chiến Binh Tinh Giới';
  let dominantSourceLabel = 'Đòn Thường & Đa Tiễn';
  if (bd && totalDmg > 0) {
    const entries: Array<{ key: 'basic' | 'ultimate' | 'pet' | 'elemental'; val: number }> = [
      { key: 'basic', val: bd.basic },
      { key: 'ultimate', val: bd.ultimate },
      { key: 'pet', val: bd.pet },
      { key: 'elemental', val: bd.elemental },
    ];
    entries.sort((a, b) => b.val - a.val);

    const top = entries[0].key;
    if (top === 'ultimate') {
      mvpBadgeTitle = 'Bậc Thầy Tuyệt Kỹ Nộ';
      dominantSourceLabel = 'Chiêu Cuối Anh Hùng';
    } else if (top === 'pet') {
      mvpBadgeTitle = 'Thần Sủng Gánh Đội';
      dominantSourceLabel = 'Tinh Linh & Thần Sủng 3D';
    } else if (top === 'elemental') {
      mvpBadgeTitle = 'Pháp Sư Nguyên Tố Hoàng Đạo';
      dominantSourceLabel = 'Nguyên Tố & Thiên Thạch';
    } else if (params.maxCombo >= 20) {
      mvpBadgeTitle = 'Xạ Thủ Liên Kích Thần Sầu';
      dominantSourceLabel = 'Đòn Thường & Đa Tiễn';
    } else {
      mvpBadgeTitle = 'Xạ Thủ Chính Xác';
      dominantSourceLabel = 'Đòn Thường & Đa Tiễn';
    }
  }

  const recoveryHint: MatchMvpReport['recoveryHint'] = !params.isVictory
    ? bd && bd.pet < totalDmg * 0.12
      ? {
          label: 'Tiến Hóa Thần Sủng 3D',
          detail: 'Đột phá Tinh Linh để tăng gấp đôi sát thương hỗ trợ & +4% Chí Mạng.',
          target: 'pets',
        }
      : {
          label: 'Cường Hóa & Khảm Bảo Thạch',
          detail: 'Nâng cấp vũ khí chính hoặc mở Hộp Bí Ẩn Lễ Hội để bứt phá Lực Chiến.',
          target: 'gear',
        }
    : {
        label: 'Nhận Quà Lễ Hội Tinh Giới',
        detail: 'Trận chiến vừa tích thêm tiến độ Đèn Lồng & Sổ Tay Sưu Tầm!',
        target: 'festival',
      };

  return {
    grade,
    gradeColorClass,
    mvpBadgeTitle,
    dominantSourceLabel,
    recoveryHint,
  };
}

import {
  AstralBoardLapMilestone,
  AstralBoardState,
  AstralBoardTileDef,
  CelestialWingDef,
  CelestialWingId,
  GuildDailyBossChest,
  GuildMonumentDef,
  GuildMonumentId,
  GuildSanctuaryState,
  MythicShardOfferDef,
  MythicShardShopState,
  Royal3DTitleDef,
  Royal3DTitleId,
  SanctuaryFloorDef,
  SanctuaryFloorId,
  SaveData,
  SkyCitadelMilestone,
  SkyCitadelState,
  ZodiacRelicDef,
  ZodiacRelicId,
  ZodiacRelicState,
} from '../types/game';
import { getTodayKey } from './questsData';

// ============================================================================
// 1. CELESTIAL WINGS 3D EVOLUTION (CÁNH THẦN QUANG 3D TIẾN HÓA 1★→5★)
// ============================================================================

export const CELESTIAL_WING_MAX_STAR = 5;

export const CELESTIAL_WING_DEFS: CelestialWingDef[] = [
  {
    id: 'seraph_azure',
    name: 'Cánh Thiên Sứ Lam Quang',
    badge: 'SỬ THI · TỐC BẮN',
    rarity: 'Sử Thi',
    desc: 'Đôi cánh lông vũ ánh lam thanh thoát có khớp đập 3D linh hoạt, tăng mạnh Công Kích và Tốc Độ Bắn.',
    featherHex: 0x38bdf8,
    tipHex: 0xe0f2fe,
    frameHex: 0xfbbf24,
    emissiveHex: 0x0284c7,
    baseAtkPct: 0.08,
    baseHpPct: 0.06,
    baseAspd: 0.08,
    baseCrit: 0.02,
    atkPctPerStar: 0.03,
    hpPctPerStar: 0.025,
    unlockFeathers: 16,
    unlockGems: 0,
  },
  {
    id: 'phoenix_solar',
    name: 'Cánh Phượng Hoàng Thái Dương',
    badge: 'HUYỀN THOẠI · BẠO KÍCH',
    rarity: 'Huyền Thoại',
    desc: 'Đôi cánh lửa vàng rực cháy mang uy lực phượng hoàng, khuếch đại Tỷ Lệ Chí Mạng và Công Kích.',
    featherHex: 0xf97316,
    tipHex: 0xfef08a,
    frameHex: 0xf59e0b,
    emissiveHex: 0xea580c,
    baseAtkPct: 0.11,
    baseHpPct: 0.08,
    baseAspd: 0.09,
    baseCrit: 0.045,
    atkPctPerStar: 0.036,
    hpPctPerStar: 0.03,
    unlockFeathers: 24,
    unlockGems: 90,
  },
  {
    id: 'nebula_void',
    name: 'Cánh Hư Không Tinh Vân',
    badge: 'THẦN THOẠI · XUYÊN PHÁ',
    rarity: 'Thần Thoại',
    desc: 'Đôi cánh dệt từ bụi ngân hà tím lam lấp lánh, gia tăng vượt trội Sinh Lực và sát thương toàn đội.',
    featherHex: 0xa855f7,
    tipHex: 0x67e8f9,
    frameHex: 0xe2e8f0,
    emissiveHex: 0x7e22ce,
    baseAtkPct: 0.135,
    baseHpPct: 0.115,
    baseAspd: 0.11,
    baseCrit: 0.05,
    atkPctPerStar: 0.042,
    hpPctPerStar: 0.036,
    unlockFeathers: 34,
    unlockGems: 150,
  },
  {
    id: 'sovereign_aurora',
    name: 'Cánh Chí Tôn Cực Quang',
    badge: 'CHÍ TÔN · HOÀNG ĐẠO',
    rarity: 'Chí Tôn',
    desc: 'Tuyệt phẩm cánh thần 6 phiến hoàng kim cực quang, biểu tượng của Chúa Tể Không Chiến Tinh Giới.',
    featherHex: 0xfbbf24,
    tipHex: 0x34d399,
    frameHex: 0xfef9c3,
    emissiveHex: 0xd97706,
    baseAtkPct: 0.17,
    baseHpPct: 0.14,
    baseAspd: 0.14,
    baseCrit: 0.065,
    atkPctPerStar: 0.05,
    hpPctPerStar: 0.042,
    unlockFeathers: 48,
    unlockGems: 220,
  },
];

export const CELESTIAL_WING_MAP: Record<CelestialWingId, CelestialWingDef> = CELESTIAL_WING_DEFS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<CelestialWingId, CelestialWingDef>
);

export function getCelestialWingUpgradeCost(currentStar: number): { feathers: number; gold: number } {
  const star = Math.max(1, Math.min(CELESTIAL_WING_MAX_STAR, Math.floor(currentStar)));
  return {
    feathers: 10 + star * 8,
    gold: 360 + star * 280,
  };
}

export function getCelestialWingStats(
  wingId: CelestialWingId | null | undefined,
  star: number
): { atkPct: number; hpPct: number; aspd: number; crit: number } {
  if (!wingId) return { atkPct: 0, hpPct: 0, aspd: 0, crit: 0 };
  const def = CELESTIAL_WING_MAP[wingId];
  if (!def) return { atkPct: 0, hpPct: 0, aspd: 0, crit: 0 };
  const s = Math.max(1, Math.min(CELESTIAL_WING_MAX_STAR, Math.floor(star || 1)));
  return {
    atkPct: def.baseAtkPct + (s - 1) * def.atkPctPerStar,
    hpPct: def.baseHpPct + (s - 1) * def.hpPctPerStar,
    aspd: def.baseAspd + (s - 1) * 0.015,
    crit: def.baseCrit + (s - 1) * 0.008,
  };
}

// ============================================================================
// 2. SKY CITADEL AERIAL ARENA 3D (KHÔNG CHIẾN TINH GIỚI)
// ============================================================================

export const SKY_CITADEL_MAX_DAILY_RUNS = 3;

export const SKY_CITADEL_MILESTONES: SkyCitadelMilestone[] = [
  {
    scoreTarget: 1500,
    title: 'Mốc 1.500 Điểm Không Chiến',
    rewardGems: 40,
    rewardFeathers: 10,
    rewardMythicShards: 4,
    rewardDice: 2,
  },
  {
    scoreTarget: 4200,
    title: 'Mốc 4.200 Điểm Chiến Thần',
    rewardGems: 75,
    rewardFeathers: 16,
    rewardMythicShards: 8,
    rewardDice: 3,
  },
  {
    scoreTarget: 8500,
    title: 'Mốc 8.500 Điểm Thiên Sứ',
    rewardGems: 120,
    rewardFeathers: 24,
    rewardMythicShards: 12,
    rewardDice: 4,
  },
  {
    scoreTarget: 15000,
    title: 'Mốc 15.000 Điểm Chí Tôn Không Trung',
    rewardGems: 200,
    rewardFeathers: 36,
    rewardMythicShards: 20,
    rewardDice: 6,
  },
];

export function normalizeSkyCitadel(st?: Partial<SkyCitadelState>): SkyCitadelState {
  const today = getTodayKey();
  const sameDay = st?.date === today;
  return {
    date: today,
    dailyRunsRemaining: sameDay
      ? Math.max(0, Math.min(SKY_CITADEL_MAX_DAILY_RUNS, Math.floor(st?.dailyRunsRemaining ?? SKY_CITADEL_MAX_DAILY_RUNS)))
      : SKY_CITADEL_MAX_DAILY_RUNS,
    bestScore: Math.max(0, Math.floor(st?.bestScore ?? 0)),
    totalScore: Math.max(0, Math.floor(st?.totalScore ?? 0)),
    totalClears: Math.max(0, Math.floor(st?.totalClears ?? 0)),
    claimedMilestones: Array.isArray(st?.claimedMilestones) ? st.claimedMilestones : [],
  };
}

export function countClaimableSkyCitadelMilestones(save: SaveData): number {
  const st = normalizeSkyCitadel(save.skyCitadel);
  return SKY_CITADEL_MILESTONES.filter(
    (m) => st.totalScore >= m.scoreTarget && !st.claimedMilestones.includes(m.scoreTarget)
  ).length;
}

// ============================================================================
// 3. ASTRAL DICE BOARD (BÀN CỜ XÚC XẮC TINH TÚ 16 Ô) & ZODIAC RELICS
// ============================================================================

export const ASTRAL_BOARD_SIZE = 16;
export const ASTRAL_DICE_BUY_COST_GEMS = 18;
export const ASTRAL_GOLDEN_DICE_COST_GEMS = 45;

export const ASTRAL_BOARD_TILES: AstralBoardTileDef[] = [
  { index: 0, label: 'Cổng Khởi Nguyên (+60 Ngọc qua vòng)', shortLabel: 'KHỞI ĐIỂM', kind: 'start', amount: 60, accentClass: 'border-amber-300/80 bg-amber-500/20 text-amber-200' },
  { index: 1, label: '650 Vàng Hoàng Đạo', shortLabel: '650 Vàng', kind: 'gold', amount: 650, accentClass: 'border-amber-400/35 bg-[#12182d] text-amber-200' },
  { index: 2, label: '6 Lông Vũ Thần Quang', shortLabel: '+6 Lông Vũ', kind: 'feathers', amount: 6, accentClass: 'border-sky-400/45 bg-sky-950/50 text-sky-200' },
  { index: 3, label: '8 Tinh Hoa Cổ Vật', shortLabel: '+8 Cổ Vật', kind: 'relic_essence', amount: 8, accentClass: 'border-violet-400/45 bg-violet-950/50 text-violet-200' },
  { index: 4, label: '35 Ngọc Hồn', shortLabel: '+35 Ngọc', kind: 'gems', amount: 35, accentClass: 'border-cyan-400/50 bg-cyan-950/50 text-cyan-200' },
  { index: 5, label: 'x2 Phần Thưởng Bước Kế Tiếp', shortLabel: 'X2 BƯỚC SAU', kind: 'double_next', amount: 2, accentClass: 'border-emerald-400/60 bg-emerald-950/55 text-emerald-200' },
  { index: 6, label: '4 Mảnh Thần Thoại', shortLabel: '+4 Mảnh Thần', kind: 'mythic_shards', amount: 4, accentClass: 'border-fuchsia-400/50 bg-fuchsia-950/50 text-fuchsia-200' },
  { index: 7, label: '900 Vàng Hoàng Đạo', shortLabel: '900 Vàng', kind: 'gold', amount: 900, accentClass: 'border-amber-400/35 bg-[#12182d] text-amber-200' },
  { index: 8, label: 'KHO BÁU ĐẠI CÁT (+85 Ngọc & +6 Mảnh Thần)', shortLabel: 'ĐẠI CÁT', kind: 'jackpot', amount: 85, accentClass: 'border-yellow-300/80 bg-amber-500/25 text-yellow-200' },
  { index: 9, label: '8 Lông Vũ Thần Quang', shortLabel: '+8 Lông Vũ', kind: 'feathers', amount: 8, accentClass: 'border-sky-400/45 bg-sky-950/50 text-sky-200' },
  { index: 10, label: '10 Tinh Hoa Cổ Vật', shortLabel: '+10 Cổ Vật', kind: 'relic_essence', amount: 10, accentClass: 'border-violet-400/45 bg-violet-950/50 text-violet-200' },
  { index: 11, label: '45 Ngọc Hồn', shortLabel: '+45 Ngọc', kind: 'gems', amount: 45, accentClass: 'border-cyan-400/50 bg-cyan-950/50 text-cyan-200' },
  { index: 12, label: '5 Mảnh Thần Thoại', shortLabel: '+5 Mảnh Thần', kind: 'mythic_shards', amount: 5, accentClass: 'border-fuchsia-400/50 bg-fuchsia-950/50 text-fuchsia-200' },
  { index: 13, label: 'x2 Phần Thưởng Bước Kế Tiếp', shortLabel: 'X2 BƯỚC SAU', kind: 'double_next', amount: 2, accentClass: 'border-emerald-400/60 bg-emerald-950/55 text-emerald-200' },
  { index: 14, label: '12 Tinh Hoa Cổ Vật', shortLabel: '+12 Cổ Vật', kind: 'relic_essence', amount: 12, accentClass: 'border-violet-400/45 bg-violet-950/50 text-violet-200' },
  { index: 15, label: '10 Lông Vũ Thần Quang', shortLabel: '+10 Lông Vũ', kind: 'feathers', amount: 10, accentClass: 'border-sky-400/45 bg-sky-950/50 text-sky-200' },
];

export const ASTRAL_BOARD_LAP_MILESTONES: AstralBoardLapMilestone[] = [
  { lapsTarget: 1, title: 'Hoàn Thành 1 Vòng Tinh Tú', rewardGems: 50, rewardMythicShards: 5, rewardFeathers: 10, rewardGoldenDice: 1 },
  { lapsTarget: 3, title: 'Hoàn Thành 3 Vòng Hoàng Đạo', rewardGems: 95, rewardMythicShards: 10, rewardFeathers: 16, rewardGoldenDice: 2 },
  { lapsTarget: 5, title: 'Hoàn Thành 5 Vòng Thiên Hà', rewardGems: 150, rewardMythicShards: 16, rewardFeathers: 24, rewardGoldenDice: 2 },
  { lapsTarget: 10, title: 'Hoàn Thành 10 Vòng Chí Tôn', rewardGems: 260, rewardMythicShards: 28, rewardFeathers: 40, rewardGoldenDice: 4 },
];

export function normalizeAstralBoard(st?: Partial<AstralBoardState>): AstralBoardState {
  const today = getTodayKey();
  const sameDay = st?.date === today;
  return {
    date: today,
    position: ((Math.floor(st?.position ?? 0) % ASTRAL_BOARD_SIZE) + ASTRAL_BOARD_SIZE) % ASTRAL_BOARD_SIZE,
    lapsCompleted: Math.max(0, Math.floor(st?.lapsCompleted ?? 0)),
    normalDice: Math.max(0, Math.floor(st?.normalDice ?? 4)),
    goldenDice: Math.max(0, Math.floor(st?.goldenDice ?? 1)),
    doubleNext: Boolean(st?.doubleNext),
    totalRolls: Math.max(0, Math.floor(st?.totalRolls ?? 0)),
    dailyFreeClaimed: sameDay ? Boolean(st?.dailyFreeClaimed) : false,
    claimedLapMilestones: Array.isArray(st?.claimedLapMilestones) ? st.claimedLapMilestones : [],
    lastLog: st?.lastLog ?? 'Tung Xúc Xắc Tinh Tú để thu thập Lông Vũ, Cổ Vật và Mảnh Thần Thoại!',
  };
}

export function resolveAstralBoardRoll(
  state: AstralBoardState,
  steps: number
): {
  nextState: AstralBoardState;
  tile: AstralBoardTileDef;
  passedStart: boolean;
  multiplier: number;
  rewardGold: number;
  rewardGems: number;
  rewardFeathers: number;
  rewardMythicShards: number;
  rewardRelicEssence: number;
} {
  const clampedSteps = Math.max(1, Math.min(6, Math.floor(steps)));
  const rawPos = state.position + clampedSteps;
  const passedStart = rawPos >= ASTRAL_BOARD_SIZE;
  const nextPos = rawPos % ASTRAL_BOARD_SIZE;
  const tile = ASTRAL_BOARD_TILES[nextPos];
  const multiplier = state.doubleNext && tile.kind !== 'double_next' ? 2 : 1;

  let rewardGold = 0;
  let rewardGems = passedStart ? 60 : 0;
  let rewardFeathers = 0;
  let rewardMythicShards = 0;
  let rewardRelicEssence = 0;
  let nextDouble = false;

  switch (tile.kind) {
    case 'start':
      rewardGems += tile.amount * multiplier;
      break;
    case 'gold':
      rewardGold += tile.amount * multiplier;
      break;
    case 'gems':
      rewardGems += tile.amount * multiplier;
      break;
    case 'feathers':
      rewardFeathers += tile.amount * multiplier;
      break;
    case 'mythic_shards':
      rewardMythicShards += tile.amount * multiplier;
      break;
    case 'relic_essence':
      rewardRelicEssence += tile.amount * multiplier;
      break;
    case 'double_next':
      nextDouble = true;
      rewardGold += 250;
      break;
    case 'jackpot':
      rewardGems += tile.amount * multiplier;
      rewardMythicShards += 6 * multiplier;
      rewardRelicEssence += 8 * multiplier;
      break;
  }

  const multText = multiplier > 1 ? ' (x2!)' : '';
  const lapText = passedStart ? ' · Vượt Cổng Khởi Nguyên +60 Ngọc!' : '';
  const nextState: AstralBoardState = {
    ...state,
    position: nextPos,
    lapsCompleted: state.lapsCompleted + (passedStart ? 1 : 0),
    doubleNext: nextDouble,
    totalRolls: state.totalRolls + 1,
    lastLog: `Tung được ${clampedSteps} bước → Ô #${nextPos + 1}: ${tile.label}${multText}${lapText}`,
  };

  return {
    nextState,
    tile,
    passedStart,
    multiplier,
    rewardGold,
    rewardGems,
    rewardFeathers,
    rewardMythicShards,
    rewardRelicEssence,
  };
}

export function countClaimableAstralBoardRewards(save: SaveData): number {
  const st = normalizeAstralBoard(save.astralBoard);
  const lapCount = ASTRAL_BOARD_LAP_MILESTONES.filter(
    (m) => st.lapsCompleted >= m.lapsTarget && !st.claimedLapMilestones.includes(m.lapsTarget)
  ).length;
  return lapCount + (st.dailyFreeClaimed ? 0 : 1);
}

// ============================================================================
// 4. ZODIAC RELICS VAULT (6 CỔ VẬT HOÀNG ĐẠO VĨNH VIỄN)
// ============================================================================

export const ZODIAC_RELIC_MAX_STAR = 5;

export const ZODIAC_RELIC_DEFS: ZodiacRelicDef[] = [
  {
    id: 'relic_aries_horn',
    name: 'Tù Và Bạch Dương Cổ Đại',
    zodiacLabel: 'Bạch Dương · Công Kích',
    rarity: 'Sử Thi',
    desc: 'Khuếch đại tinh thần chiến đấu, tăng vĩnh viễn % Công Kích cho toàn bộ Anh Hùng.',
    accentHex: '#f97316',
    baseAtkPct: 0.04,
    baseHpPct: 0.02,
    baseCrit: 0.01,
    baseBossDmg: 0.02,
    baseGoldPct: 0,
    atkPctPerLv: 0.018,
    hpPctPerLv: 0.01,
    unlockEssence: 14,
  },
  {
    id: 'relic_leo_suncrest',
    name: 'Ấn Ký Thái Dương Sư Tử',
    zodiacLabel: 'Sư Tử · Sát Thương Boss',
    rarity: 'Huyền Thoại',
    desc: 'Huy chương lửa mặt trời của Vua Sư Tử, xuyên phá phòng thủ Boss tinh giới.',
    accentHex: '#fbbf24',
    baseAtkPct: 0.05,
    baseHpPct: 0.025,
    baseCrit: 0.015,
    baseBossDmg: 0.05,
    baseGoldPct: 0,
    atkPctPerLv: 0.022,
    hpPctPerLv: 0.012,
    unlockEssence: 18,
  },
  {
    id: 'relic_libra_scale',
    name: 'Cán Cân Chân Lý Thiên Bình',
    zodiacLabel: 'Thiên Bình · Cân Bằng',
    rarity: 'Sử Thi',
    desc: 'Giữ vững nhịp chiến đấu cân bằng giữa Sinh Lực, Công Kích và Tài Lộc Vàng.',
    accentHex: '#38bdf8',
    baseAtkPct: 0.035,
    baseHpPct: 0.055,
    baseCrit: 0.01,
    baseBossDmg: 0.01,
    baseGoldPct: 0.05,
    atkPctPerLv: 0.015,
    hpPctPerLv: 0.024,
    unlockEssence: 14,
  },
  {
    id: 'relic_scorpio_sting',
    name: 'Độc Châm Ám Ảnh Thiên Yết',
    zodiacLabel: 'Thiên Yết · Chí Mạng',
    rarity: 'Huyền Thoại',
    desc: 'Cổ vật mang sát khí bén ngọt, gia tăng mạnh Tỷ Lệ Chí Mạng và Sát Thương Boss.',
    accentHex: '#c084fc',
    baseAtkPct: 0.048,
    baseHpPct: 0.02,
    baseCrit: 0.03,
    baseBossDmg: 0.045,
    baseGoldPct: 0,
    atkPctPerLv: 0.02,
    hpPctPerLv: 0.01,
    unlockEssence: 20,
  },
  {
    id: 'relic_sagittarius_bow',
    name: 'Tiễn Tinh Tú Nhân Mã',
    zodiacLabel: 'Nhân Mã · Thần Thoại',
    rarity: 'Thần Thoại',
    desc: 'Mũi tên hoàng đạo bất diệt do chính Alice chúc phúc, tăng mạnh mọi chỉ số tấn công.',
    accentHex: '#f43f5e',
    baseAtkPct: 0.065,
    baseHpPct: 0.04,
    baseCrit: 0.028,
    baseBossDmg: 0.06,
    baseGoldPct: 0.03,
    atkPctPerLv: 0.026,
    hpPctPerLv: 0.018,
    unlockEssence: 26,
  },
  {
    id: 'relic_aquarius_chalice',
    name: 'Chén Thánh Bảo Bình',
    zodiacLabel: 'Bảo Bình · Sinh Lực & Vàng',
    rarity: 'Thần Thoại',
    desc: 'Nguồn suối tinh lực vô tận, tăng mạnh Máu tối đa và lượng Vàng thu hoạch mỗi trận.',
    accentHex: '#2dd4bf',
    baseAtkPct: 0.045,
    baseHpPct: 0.075,
    baseCrit: 0.015,
    baseBossDmg: 0.03,
    baseGoldPct: 0.08,
    atkPctPerLv: 0.018,
    hpPctPerLv: 0.03,
    unlockEssence: 24,
  },
];

export function normalizeZodiacRelics(st?: Partial<ZodiacRelicState>): ZodiacRelicState {
  const levels: Partial<Record<ZodiacRelicId, number>> = {};
  for (const def of ZODIAC_RELIC_DEFS) {
    const raw = st?.levels?.[def.id];
    if (typeof raw === 'number' && raw > 0) {
      levels[def.id] = Math.max(1, Math.min(ZODIAC_RELIC_MAX_STAR, Math.floor(raw)));
    }
  }
  return {
    essence: Math.max(0, Math.floor(st?.essence ?? 16)),
    levels,
  };
}

export function getZodiacRelicUpgradeCost(currentLv: number, def: ZodiacRelicDef): { essence: number; gold: number } {
  if (currentLv <= 0) {
    return { essence: def.unlockEssence, gold: 300 };
  }
  return {
    essence: Math.round(def.unlockEssence * (0.7 + currentLv * 0.45)),
    gold: 420 + currentLv * 320,
  };
}

export function computeZodiacRelicBonuses(st?: Partial<ZodiacRelicState>): {
  atkPct: number;
  hpPct: number;
  crit: number;
  bossDmg: number;
  goldPct: number;
  unlockedCount: number;
  totalStars: number;
} {
  const norm = normalizeZodiacRelics(st);
  let atkPct = 0;
  let hpPct = 0;
  let crit = 0;
  let bossDmg = 0;
  let goldPct = 0;
  let unlockedCount = 0;
  let totalStars = 0;
  for (const def of ZODIAC_RELIC_DEFS) {
    const lv = norm.levels[def.id] ?? 0;
    if (lv <= 0) continue;
    unlockedCount++;
    totalStars += lv;
    atkPct += def.baseAtkPct + (lv - 1) * def.atkPctPerLv;
    hpPct += def.baseHpPct + (lv - 1) * def.hpPctPerLv;
    crit += def.baseCrit + (lv - 1) * 0.005;
    bossDmg += def.baseBossDmg + (lv - 1) * 0.015;
    goldPct += def.baseGoldPct + (lv - 1) * 0.015;
  }
  return { atkPct, hpPct, crit, bossDmg, goldPct, unlockedCount, totalStars };
}

// ============================================================================
// 5. GUILD 3D SANCTUARY & DAILY BOSS CHESTS (LÃNH ĐỊA BANG HỘI 3D)
// ============================================================================

export const GUILD_MONUMENT_DEFS: GuildMonumentDef[] = [
  {
    id: 'citadel_hall',
    name: 'Đại Sảnh Hoàng Đạo',
    subtitle: 'Tăng % Công Kích & % Sinh Lực toàn thành viên',
    maxLevel: 10,
    atkPctPerLv: 0.018,
    hpPctPerLv: 0.02,
    bossDmgPerLv: 0.01,
    goldPctPerLv: 0,
    baseGuildCoins: 35,
  },
  {
    id: 'astral_forge',
    name: 'Lò Rèn Tinh Kim Bang',
    subtitle: 'Tăng mạnh % Công Kích và Sát Thương Boss Bang Hội',
    maxLevel: 10,
    atkPctPerLv: 0.024,
    hpPctPerLv: 0,
    bossDmgPerLv: 0.028,
    goldPctPerLv: 0,
    baseGuildCoins: 40,
  },
  {
    id: 'star_spire',
    name: 'Tháp Quan Tinh 3D',
    subtitle: 'Tăng % Sinh Lực tối đa và Sát Thương Phá Giáp Boss',
    maxLevel: 10,
    atkPctPerLv: 0.008,
    hpPctPerLv: 0.028,
    bossDmgPerLv: 0.022,
    goldPctPerLv: 0,
    baseGuildCoins: 40,
  },
  {
    id: 'guild_vault',
    name: 'Kho Báu Đế Chế Bang',
    subtitle: 'Tăng % Vàng chiến lợi phẩm và thưởng cống hiến hàng ngày',
    maxLevel: 10,
    atkPctPerLv: 0.01,
    hpPctPerLv: 0.01,
    bossDmgPerLv: 0,
    goldPctPerLv: 0.035,
    baseGuildCoins: 35,
  },
];

export const GUILD_DAILY_BOSS_CHESTS: GuildDailyBossChest[] = [
  {
    id: 'gdbc_1',
    damageTarget: 1500,
    title: 'Rương Chiến Tích 1.5K',
    rewardGuildCoins: 45,
    rewardGems: 25,
    rewardMythicShards: 3,
    rewardFeathers: 6,
  },
  {
    id: 'gdbc_2',
    damageTarget: 4500,
    title: 'Rương Khải Hoàn 4.5K',
    rewardGuildCoins: 75,
    rewardGems: 45,
    rewardMythicShards: 6,
    rewardFeathers: 10,
  },
  {
    id: 'gdbc_3',
    damageTarget: 10000,
    title: 'Rương Chiến Thần 10K',
    rewardGuildCoins: 110,
    rewardGems: 75,
    rewardMythicShards: 10,
    rewardFeathers: 15,
  },
  {
    id: 'gdbc_4',
    damageTarget: 20000,
    title: 'Rương Chí Tôn Bang 20K',
    rewardGuildCoins: 160,
    rewardGems: 120,
    rewardMythicShards: 16,
    rewardFeathers: 24,
  },
];

export function normalizeGuildSanctuary(st?: Partial<GuildSanctuaryState>): GuildSanctuaryState {
  const today = getTodayKey();
  const sameDay = st?.date === today;
  const raw = st?.monumentLevels ?? ({} as Partial<Record<GuildMonumentId, number>>);
  return {
    date: today,
    monumentLevels: {
      citadel_hall: Math.max(0, Math.min(10, Math.floor(raw.citadel_hall ?? 0))),
      astral_forge: Math.max(0, Math.min(10, Math.floor(raw.astral_forge ?? 0))),
      star_spire: Math.max(0, Math.min(10, Math.floor(raw.star_spire ?? 0))),
      guild_vault: Math.max(0, Math.min(10, Math.floor(raw.guild_vault ?? 0))),
    },
    dailyBossDamage: sameDay ? Math.max(0, Math.floor(st?.dailyBossDamage ?? 0)) : 0,
    claimedDailyBossChestIds:
      sameDay && Array.isArray(st?.claimedDailyBossChestIds) ? st.claimedDailyBossChestIds : [],
    dailySanctuaryBlessingClaimed: sameDay ? Boolean(st?.dailySanctuaryBlessingClaimed) : false,
  };
}

export function getGuildMonumentUpgradeCost(currentLv: number, def: GuildMonumentDef): { guildCoins: number; gold: number } {
  const lv = Math.max(0, currentLv);
  return {
    guildCoins: def.baseGuildCoins + lv * 22,
    gold: 250 + lv * 190,
  };
}

export function computeGuildSanctuaryBonuses(st?: Partial<GuildSanctuaryState>): {
  atkPct: number;
  hpPct: number;
  bossDmg: number;
  goldPct: number;
  totalLevel: number;
} {
  const norm = normalizeGuildSanctuary(st);
  let atkPct = 0;
  let hpPct = 0;
  let bossDmg = 0;
  let goldPct = 0;
  let totalLevel = 0;
  for (const def of GUILD_MONUMENT_DEFS) {
    const lv = norm.monumentLevels[def.id] ?? 0;
    totalLevel += lv;
    atkPct += lv * def.atkPctPerLv;
    hpPct += lv * def.hpPctPerLv;
    bossDmg += lv * def.bossDmgPerLv;
    goldPct += lv * def.goldPctPerLv;
  }
  return { atkPct, hpPct, bossDmg, goldPct, totalLevel };
}

export function countClaimableGuildSanctuaryRewards(save: SaveData): number {
  const gs = normalizeGuildSanctuary(save.guildSanctuary);
  const chestCount = GUILD_DAILY_BOSS_CHESTS.filter(
    (c) => gs.dailyBossDamage >= c.damageTarget && !gs.claimedDailyBossChestIds.includes(c.id)
  ).length;
  return chestCount + (gs.dailySanctuaryBlessingClaimed ? 0 : 1);
}

// ============================================================================
// 6. SEASON IV MYTHIC SHARD EXCHANGE (KHO ĐỔI MẢNH THẦN THOẠI)
// ============================================================================

export const SEASON_IV_TITLE = 'Mùa IV: Thiên Giới Cánh Thần';

export const MYTHIC_SHARD_OFFERS: MythicShardOfferDef[] = [
  {
    id: 'mso_wing_phoenix',
    title: 'Cánh Phượng Hoàng Thái Dương 3D',
    subtitle: 'Mở khóa trực tiếp Cánh Thần Quang Huyền Thoại (+11% Công, +4.5% Crit)',
    badge: 'ĐỘC QUYỀN MÙA IV',
    costShards: 22,
    maxPurchases: 1,
    rewardKind: 'celestial_wing',
    amount: 1,
    targetWingId: 'phoenix_solar',
  },
  {
    id: 'mso_title_seraph',
    title: 'Danh Hiệu 3D: Chí Tôn Cực Quang',
    subtitle: 'Danh hiệu động bay trên đầu 3D (+95 Công, +420 Máu, +3% Crit)',
    badge: 'DANH HIỆU ĐỘNG 3D',
    costShards: 18,
    maxPurchases: 1,
    rewardKind: 'royal_title',
    amount: 1,
    targetTitleId: 'title_aurora_seraph',
  },
  {
    id: 'mso_s_tier_chest',
    title: 'Rương Trang Bị Thần Thoại [S]',
    subtitle: 'Chắc chắn nhận 1 trang bị S-Tier phẩm Sử Thi trở lên',
    badge: '100% TRANG BỊ [S]',
    costShards: 15,
    maxPurchases: 3,
    rewardKind: 's_tier_chest',
    amount: 1,
  },
  {
    id: 'mso_relic_essence',
    title: 'Hộp 24 Tinh Hoa Cổ Vật Hoàng Đạo',
    subtitle: 'Mở khóa & nâng sao Cổ Vật Hoàng Đạo tăng lực chiến vĩnh viễn',
    badge: 'GIÁ TRỊ X5',
    costShards: 10,
    maxPurchases: 5,
    rewardKind: 'zodiac_relic_essence',
    amount: 24,
  },
  {
    id: 'mso_feathers_pack',
    title: 'Túi 22 Lông Vũ Thần Quang',
    subtitle: 'Nguyên liệu đột phá sao Cánh Thần Quang 3D 1★→5★',
    badge: 'TIẾN HÓA CÁNH',
    costShards: 9,
    maxPurchases: 5,
    rewardKind: 'celestial_feathers',
    amount: 22,
  },
  {
    id: 'mso_golden_dice',
    title: 'Bộ 3 Xúc Xắc Vàng Chọn Số',
    subtitle: 'Tự chọn bước 1–6 trên Bàn Cờ Tinh Tú để trúng ô Đại Cát',
    badge: 'BÀN CỜ TINH TÚ',
    costShards: 8,
    maxPurchases: 5,
    rewardKind: 'golden_dice',
    amount: 3,
  },
];

export function normalizeMythicShardShop(st?: Partial<MythicShardShopState>): MythicShardShopState {
  return {
    purchasedCounts: st?.purchasedCounts ? { ...st.purchasedCounts } : {},
  };
}

// ============================================================================
// 7. 3D SANCTUARY FLOORS & ROYAL 3D FLOATING TITLES
// ============================================================================

export const SANCTUARY_FLOOR_DEFS: SanctuaryFloorDef[] = [
  {
    id: 'marble_gold',
    name: 'Thần Điện Cẩm Thạch',
    shortDesc: 'Đá trắng khảm chỉ vàng cổ điển',
    swatchClass: 'from-amber-300 via-yellow-100 to-slate-400',
    floorHex: 0x1e293b,
    ringHex: 0xfbbf24,
    pillarGlowHex: 0xf59e0b,
    roughness: 0.42,
    metalness: 0.25,
  },
  {
    id: 'star_glass',
    name: 'Tinh Hà Lưu Ly',
    shortDesc: 'Mặt kính sao lam tím phản chiếu',
    swatchClass: 'from-sky-400 via-indigo-600 to-slate-900',
    floorHex: 0x0f1b3d,
    ringHex: 0x38bdf8,
    pillarGlowHex: 0x6366f1,
    roughness: 0.18,
    metalness: 0.65,
  },
  {
    id: 'magma_dragon',
    name: 'Hỏa Long Dung Nham',
    shortDesc: 'Đá hắc diện thạch rực mạch lửa',
    swatchClass: 'from-orange-500 via-red-700 to-stone-900',
    floorHex: 0x261215,
    ringHex: 0xf97316,
    pillarGlowHex: 0xef4444,
    roughness: 0.58,
    metalness: 0.3,
  },
  {
    id: 'frost_sanctum',
    name: 'Thánh Địa Băng Tinh',
    shortDesc: 'Sàn pha lê băng tuyết ánh ngọc',
    swatchClass: 'from-cyan-200 via-teal-400 to-slate-800',
    floorHex: 0x122b3a,
    ringHex: 0x67e8f9,
    pillarGlowHex: 0x2dd4bf,
    roughness: 0.22,
    metalness: 0.52,
  },
];

export const SANCTUARY_FLOOR_MAP: Record<SanctuaryFloorId, SanctuaryFloorDef> = SANCTUARY_FLOOR_DEFS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<SanctuaryFloorId, SanctuaryFloorDef>
);

export const ROYAL_3D_TITLE_DEFS: Royal3DTitleDef[] = [
  {
    id: 'title_sky_sovereign',
    label: 'Chúa Tể Không Chiến',
    subLabel: 'HOÀNG GIA · SẢNH 3D',
    gradientClass: 'from-sky-400 via-amber-200 to-cyan-300',
    borderClass: 'border-sky-300/80',
    atkBonus: 45,
    hpBonus: 220,
    critBonus: 0.015,
    unlockMethodLabel: 'Mặc định Wave 14 · Miễn phí',
    unlockGems: 0,
  },
  {
    id: 'title_star_emperor',
    label: 'Tinh Đế Hoàng Đạo',
    subLabel: 'HOÀNG KIM CHÍ TÔN',
    gradientClass: 'from-amber-300 via-yellow-100 to-orange-400',
    borderClass: 'border-amber-300/90',
    atkBonus: 65,
    hpBonus: 310,
    critBonus: 0.02,
    unlockMethodLabel: 'Mở khóa bằng 95 Ngọc',
    unlockGems: 95,
  },
  {
    id: 'title_guild_marshal',
    label: 'Thống Soái Bang Hội',
    subLabel: 'LÃNH ĐỊA 3D',
    gradientClass: 'from-rose-400 via-amber-300 to-orange-300',
    borderClass: 'border-rose-300/80',
    atkBonus: 70,
    hpBonus: 360,
    critBonus: 0.022,
    unlockMethodLabel: 'Mở khóa bằng 110 Ngọc',
    unlockGems: 110,
  },
  {
    id: 'title_zodiac_oracle',
    label: 'Tiên Tri Bàn Cờ Sao',
    subLabel: 'CỔ VẬT HOÀNG ĐẠO',
    gradientClass: 'from-violet-300 via-fuchsia-200 to-sky-300',
    borderClass: 'border-violet-300/85',
    atkBonus: 80,
    hpBonus: 380,
    critBonus: 0.025,
    unlockMethodLabel: 'Mở khóa bằng 130 Ngọc',
    unlockGems: 130,
  },
  {
    id: 'title_aurora_seraph',
    label: 'Chí Tôn Cực Quang',
    subLabel: 'ĐỘC QUYỀN MÙA IV',
    gradientClass: 'from-emerald-300 via-yellow-200 to-amber-400',
    borderClass: 'border-emerald-300/90',
    atkBonus: 95,
    hpBonus: 420,
    critBonus: 0.03,
    unlockMethodLabel: 'Đổi tại Kho Mảnh Thần hoặc 180 Ngọc',
    unlockGems: 180,
  },
];

export const ROYAL_3D_TITLE_MAP: Record<Royal3DTitleId, Royal3DTitleDef> = ROYAL_3D_TITLE_DEFS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<Royal3DTitleId, Royal3DTitleDef>
);

export function computeRoyal3DTitleBonuses(save: SaveData): {
  atk: number;
  hp: number;
  crit: number;
  activeDef: Royal3DTitleDef | null;
} {
  const unlocked = Array.isArray(save.unlockedRoyal3DTitles) ? save.unlockedRoyal3DTitles : [];
  const equipped = save.equippedRoyal3DTitleId ?? null;
  let atk = 0;
  let hp = 0;
  let crit = 0;
  for (const id of unlocked) {
    const def = ROYAL_3D_TITLE_MAP[id];
    if (!def) continue;
    atk += Math.round(def.atkBonus * 0.45);
    hp += Math.round(def.hpBonus * 0.45);
  }
  const activeDef = equipped && unlocked.includes(equipped) ? ROYAL_3D_TITLE_MAP[equipped] ?? null : null;
  if (activeDef) {
    atk += activeDef.atkBonus;
    hp += activeDef.hpBonus;
    crit += activeDef.critBonus;
  }
  return { atk, hp, crit, activeDef };
}

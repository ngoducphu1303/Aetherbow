import {
  AstralSteedDef,
  AstralSteedId,
  BlindBoxSlotReward,
  Carnival7DayState,
  CarnivalDayTaskDef,
  CarnivalPointMilestone,
  DragonLairMilestone,
  DragonLairState,
  EvolvingFirstTopUpState,
  EvolvingFirstTopUpTierDef,
  LobbyWeatherDef,
  LobbyWeatherId,
  RoyalBlindBoxState,
  RoyalDutchAuctionState,
  RoyalDutchLotDef,
  SaveData,
  SoulRingDef,
  SoulRingSlotId,
  SoulRingState,
  StarlightRaceMilestone,
  StarlightRaceState,
  TopPlayerBuildProfile,
  VipAvatarFrameDef,
  VipAvatarFrameId,
} from '../types/game';
import { getTodayKey } from './questsData';

// ============================================================================
// 1. ASTRAL STEEDS 3D (THÚ CƯỠI TINH GIỚI 3D) & STARLIGHT RACE (ĐƯỜNG ĐUA ÁNH SAO)
// ============================================================================

export const ASTRAL_STEED_MAX_STAR = 5;

export const ASTRAL_STEED_DEFS: AstralSteedDef[] = [
  {
    id: 'galaxy_pegasus',
    name: 'Thiên Mã Ngân Hà',
    badge: 'SỬ THI · TỐC ĐỘ SAO',
    rarity: 'Sử Thi',
    desc: 'Chiến mã có cánh bằng vàng tinh tú lướt đi trên dải ngân hà, tăng tốc độ di chuyển và Công Kích toàn đội.',
    bodyHex: 0xf8fafc,
    armorHex: 0xfbbf24,
    accentHex: 0x38bdf8,
    glowHex: 0xfde047,
    baseAtkPct: 0.06,
    baseHpPct: 0.05,
    baseMoveSpeed: 0.08,
    baseCrit: 0.02,
    atkPctPerStar: 0.025,
    hpPctPerStar: 0.02,
    raceSpeedRating: 112,
    unlockGrass: 18,
    unlockGems: 0,
  },
  {
    id: 'frost_starwolf',
    name: 'Chiến Lang Băng Lam',
    badge: 'HUYỀN THOẠI · BẠO KÍCH',
    rarity: 'Huyền Thoại',
    desc: 'Linh lang khoác giáp pha lê băng tinh, bứt tốc cực nhanh trên Đường Đua Ánh Sao và tăng Bạo Kích.',
    bodyHex: 0x1e3a8a,
    armorHex: 0x38bdf8,
    accentHex: 0xe0f2fe,
    glowHex: 0x67e8f9,
    baseAtkPct: 0.09,
    baseHpPct: 0.08,
    baseMoveSpeed: 0.11,
    baseCrit: 0.035,
    atkPctPerStar: 0.032,
    hpPctPerStar: 0.028,
    raceSpeedRating: 128,
    unlockGrass: 30,
    unlockGems: 60,
  },
  {
    id: 'eclipse_phoenix',
    name: 'Phượng Hoàng Nhật Thực',
    badge: 'THẦN THOẠI · HỎA DỰC',
    rarity: 'Thần Thoại',
    desc: 'Thần điểu rực lửa sao chổi sải cánh giữa tinh không, cường hóa mạnh cả Công Kích lẫn Sinh Lực.',
    bodyHex: 0x9a3412,
    armorHex: 0xf59e0b,
    accentHex: 0xfb7185,
    glowHex: 0xf97316,
    baseAtkPct: 0.13,
    baseHpPct: 0.11,
    baseMoveSpeed: 0.13,
    baseCrit: 0.05,
    atkPctPerStar: 0.04,
    hpPctPerStar: 0.035,
    raceSpeedRating: 142,
    unlockGrass: 48,
    unlockGems: 110,
  },
  {
    id: 'golden_sovereign_dragon',
    name: 'Thánh Long Hoàng Kim',
    badge: 'CHÍ TÔN · BÁ CHỦ TINH GIỚI',
    rarity: 'Chí Tôn',
    desc: 'Cổ long hoàng kim khoác giáp hắc diện thạch, đỉnh cao tối thượng cho Sảnh 3D và Đường Đua Ánh Sao.',
    bodyHex: 0x18181b,
    armorHex: 0xfacc15,
    accentHex: 0xfef08a,
    glowHex: 0xfde047,
    baseAtkPct: 0.18,
    baseHpPct: 0.15,
    baseMoveSpeed: 0.16,
    baseCrit: 0.065,
    atkPctPerStar: 0.05,
    hpPctPerStar: 0.042,
    raceSpeedRating: 160,
    unlockGrass: 75,
    unlockGems: 165,
  },
];

export const ASTRAL_STEED_MAP: Record<AstralSteedId, AstralSteedDef> = ASTRAL_STEED_DEFS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<AstralSteedId, AstralSteedDef>
);

export function getAstralSteedStats(
  steedId: AstralSteedId | null | undefined,
  star: number
): { atkPct: number; hpPct: number; moveSpeed: number; crit: number; raceSpeed: number } {
  if (!steedId || !ASTRAL_STEED_MAP[steedId]) {
    return { atkPct: 0, hpPct: 0, moveSpeed: 0, crit: 0, raceSpeed: 100 };
  }
  const def = ASTRAL_STEED_MAP[steedId];
  const s = Math.max(1, Math.min(ASTRAL_STEED_MAX_STAR, Math.floor(star || 1)));
  return {
    atkPct: def.baseAtkPct + (s - 1) * def.atkPctPerStar,
    hpPct: def.baseHpPct + (s - 1) * def.hpPctPerStar,
    moveSpeed: def.baseMoveSpeed + (s - 1) * 0.015,
    crit: def.baseCrit + (s - 1) * 0.01,
    raceSpeed: def.raceSpeedRating + (s - 1) * 14,
  };
}

export function getAstralSteedStarUpCost(currentStar: number): { grass: number; gold: number } {
  const s = Math.max(1, currentStar);
  return {
    grass: 12 + s * 10,
    gold: 550 + s * 420,
  };
}

export const MAX_DAILY_STARLIGHT_RACES = 3;

export const STARLIGHT_RACE_MILESTONES: StarlightRaceMilestone[] = [
  {
    pointsTarget: 300,
    title: 'Kỵ Sĩ Ánh Sao Khởi Hành',
    rewardGems: 35,
    rewardGrass: 14,
    rewardDragonScales: 6,
    rewardBlindBoxTickets: 1,
  },
  {
    pointsTarget: 850,
    title: 'Độc Cô Cầu Tốc Ngân Hà',
    rewardGems: 55,
    rewardGrass: 24,
    rewardDragonScales: 10,
    rewardBlindBoxTickets: 2,
  },
  {
    pointsTarget: 1600,
    title: 'Quán Quân Đường Đua Ánh Sao',
    rewardGems: 85,
    rewardGrass: 38,
    rewardDragonScales: 16,
    rewardBlindBoxTickets: 3,
  },
  {
    pointsTarget: 2600,
    title: 'Thần Tốc Hoàng Đạo Chí Tôn',
    rewardGems: 130,
    rewardGrass: 56,
    rewardDragonScales: 24,
    rewardBlindBoxTickets: 4,
  },
];

export function normalizeStarlightRace(st?: Partial<StarlightRaceState>): StarlightRaceState {
  const today = getTodayKey();
  if (!st || st.date !== today) {
    return {
      date: today,
      dailyRunsRemaining: MAX_DAILY_STARLIGHT_RACES,
      totalRacePoints: Math.max(0, st?.totalRacePoints ?? 0),
      bestLapTimeSec: st?.bestLapTimeSec ?? 0,
      claimedMilestones: Array.isArray(st?.claimedMilestones) ? st.claimedMilestones : [],
      lastRaceLog: st?.lastRaceLog ?? '',
    };
  }
  return {
    date: today,
    dailyRunsRemaining: Math.max(0, Math.min(MAX_DAILY_STARLIGHT_RACES, st.dailyRunsRemaining ?? MAX_DAILY_STARLIGHT_RACES)),
    totalRacePoints: Math.max(0, st.totalRacePoints ?? 0),
    bestLapTimeSec: Math.max(0, st.bestLapTimeSec ?? 0),
    claimedMilestones: Array.isArray(st.claimedMilestones) ? st.claimedMilestones : [],
    lastRaceLog: st.lastRaceLog ?? '',
  };
}

export function simulateStarlightSprint(
  steedId: AstralSteedId | null | undefined,
  steedStar: number,
  seedRoll = Math.random()
): {
  lapTimeSec: number;
  pointsEarned: number;
  rewardGrass: number;
  rewardGold: number;
  rewardGems: number;
  rankLabel: string;
} {
  const stats = getAstralSteedStats(steedId, steedStar);
  const variance = 0.92 + Math.max(0, Math.min(1, seedRoll)) * 0.16;
  const effectiveSpeed = stats.raceSpeed * variance;
  const lapTimeSec = Number(Math.max(14.2, 42 - effectiveSpeed * 0.145).toFixed(2));
  const pointsEarned = Math.round(115 + effectiveSpeed * 1.15);
  const isSss = lapTimeSec <= 20.5;
  const isSs = lapTimeSec <= 24.5;
  const rankLabel = isSss ? 'Hạng SSS · Chớp Sao Băng' : isSs ? 'Hạng SS · Quán Quân' : 'Hạng S · Xuất Sắc';
  return {
    lapTimeSec,
    pointsEarned,
    rewardGrass: isSss ? 14 : isSs ? 10 : 7,
    rewardGold: isSss ? 680 : isSs ? 500 : 360,
    rewardGems: isSss ? 22 : isSs ? 15 : 10,
    rankLabel,
  };
}

export function countClaimableStarlightMilestones(save: SaveData): number {
  const race = normalizeStarlightRace(save.starlightRace);
  return STARLIGHT_RACE_MILESTONES.filter(
    (m) => race.totalRacePoints >= m.pointsTarget && !race.claimedMilestones.includes(m.pointsTarget)
  ).length;
}

// ============================================================================
// 2. MULTI-TIER 3D SOUL RINGS (HỒN HOÀN 3D ĐA TẦNG) & SPIRIT JADE FUSION (3 -> 1)
// ============================================================================

export const SOUL_RING_MAX_LEVEL = 10;

export const SPIRIT_JADE_TIERS: Array<{
  tier: 1 | 2 | 3 | 4 | 5;
  name: string;
  shortName: string;
  colorClass: string;
  badgeClass: string;
}> = [
  {
    tier: 1,
    name: 'Linh Ngọc Bậc I · Bạch Ngân',
    shortName: 'Ngọc Bậc I',
    colorClass: 'text-slate-200',
    badgeClass: 'bg-slate-700/80 border-slate-400/50 text-slate-100',
  },
  {
    tier: 2,
    name: 'Linh Ngọc Bậc II · Hoàng Kim',
    shortName: 'Ngọc Bậc II',
    colorClass: 'text-amber-300',
    badgeClass: 'bg-amber-900/60 border-amber-400/60 text-amber-200',
  },
  {
    tier: 3,
    name: 'Linh Ngọc Bậc III · Tử Tinh',
    shortName: 'Ngọc Bậc III',
    colorClass: 'text-purple-300',
    badgeClass: 'bg-purple-900/60 border-purple-400/60 text-purple-200',
  },
  {
    tier: 4,
    name: 'Linh Ngọc Bậc IV · Hồng Nguyệt',
    shortName: 'Ngọc Bậc IV',
    colorClass: 'text-rose-300',
    badgeClass: 'bg-rose-900/60 border-rose-400/60 text-rose-200',
  },
  {
    tier: 5,
    name: 'Linh Ngọc Bậc V · Thần Giới',
    shortName: 'Ngọc Bậc V',
    colorClass: 'text-cyan-200',
    badgeClass: 'bg-cyan-900/60 border-cyan-300/70 text-cyan-100',
  },
];

export const SOUL_RING_DEFS: SoulRingDef[] = [
  {
    id: 'ring_silver',
    tierIndex: 1,
    name: 'Hồn Hoàn Tầng I · Bạch Ngân',
    badge: 'TẦNG I · CÔNG KÍCH',
    statLabel: '+2.5% Công & +1.5% Máu / cấp',
    ringHex: 0xe2e8f0,
    emissiveHex: 0x94a3b8,
    requiredJadeTier: 1,
    atkPctPerLv: 0.025,
    hpPctPerLv: 0.015,
    critPerLv: 0.004,
    bossDmgPerLv: 0,
    critDmgPerLv: 0,
  },
  {
    id: 'ring_gold',
    tierIndex: 2,
    name: 'Hồn Hoàn Tầng II · Hoàng Kim',
    badge: 'TẦNG II · SINH LỰC',
    statLabel: '+3% Công & +3% Máu / cấp',
    ringHex: 0xfbbf24,
    emissiveHex: 0xd97706,
    requiredJadeTier: 2,
    atkPctPerLv: 0.03,
    hpPctPerLv: 0.03,
    critPerLv: 0.005,
    bossDmgPerLv: 0.01,
    critDmgPerLv: 0,
  },
  {
    id: 'ring_amethyst',
    tierIndex: 3,
    name: 'Hồn Hoàn Tầng III · Tử Tinh',
    badge: 'TẦNG III · BẠO KÍCH',
    statLabel: '+3.5% Công · +1.2% Bạo · +4% ST Bạo / cấp',
    ringHex: 0xc084fc,
    emissiveHex: 0x9333ea,
    requiredJadeTier: 3,
    atkPctPerLv: 0.035,
    hpPctPerLv: 0.022,
    critPerLv: 0.012,
    bossDmgPerLv: 0.015,
    critDmgPerLv: 0.04,
  },
  {
    id: 'ring_crimson',
    tierIndex: 4,
    name: 'Hồn Hoàn Tầng IV · Hồng Nguyệt',
    badge: 'TẦNG IV · DIỆT BOSS',
    statLabel: '+4.5% Công · +3.5% ST Boss · +5% ST Bạo / cấp',
    ringHex: 0xf43f5e,
    emissiveHex: 0xe11d48,
    requiredJadeTier: 4,
    atkPctPerLv: 0.045,
    hpPctPerLv: 0.03,
    critPerLv: 0.01,
    bossDmgPerLv: 0.035,
    critDmgPerLv: 0.05,
  },
  {
    id: 'ring_aurora',
    tierIndex: 5,
    name: 'Hồn Hoàn Tầng V · Thần Giới',
    badge: 'TẦNG V · CHÍ TÔN',
    statLabel: '+6% Công · +5% Máu · +4.5% ST Boss · +7% ST Bạo / cấp',
    ringHex: 0x22d3ee,
    emissiveHex: 0x06b6d4,
    requiredJadeTier: 5,
    atkPctPerLv: 0.06,
    hpPctPerLv: 0.05,
    critPerLv: 0.015,
    bossDmgPerLv: 0.045,
    critDmgPerLv: 0.07,
  },
];

export const SOUL_RING_RESONANCES = [
  { totalLv: 5, title: 'Cộng Hưởng Ngũ Hồn I', atkPct: 0.05, hpPct: 0.05, critDmg: 0.1 },
  { totalLv: 15, title: 'Cộng Hưởng Ngũ Hồn II', atkPct: 0.12, hpPct: 0.1, critDmg: 0.22 },
  { totalLv: 30, title: 'Cộng Hưởng Ngũ Hồn III', atkPct: 0.22, hpPct: 0.18, critDmg: 0.38 },
  { totalLv: 45, title: 'Cộng Hưởng Chí Tôn V', atkPct: 0.36, hpPct: 0.28, critDmg: 0.6 },
];

export function normalizeSoulRings(sr?: Partial<SoulRingState>): SoulRingState {
  const jades = Array.isArray(sr?.spiritJades) && sr.spiritJades.length === 5
    ? ([
        Math.max(0, Math.floor(sr.spiritJades[0] ?? 0)),
        Math.max(0, Math.floor(sr.spiritJades[1] ?? 0)),
        Math.max(0, Math.floor(sr.spiritJades[2] ?? 0)),
        Math.max(0, Math.floor(sr.spiritJades[3] ?? 0)),
        Math.max(0, Math.floor(sr.spiritJades[4] ?? 0)),
      ] as [number, number, number, number, number])
    : ([9, 3, 1, 0, 0] as [number, number, number, number, number]);

  return {
    levels: {
      ring_silver: Math.max(0, Math.min(SOUL_RING_MAX_LEVEL, sr?.levels?.ring_silver ?? 1)),
      ring_gold: Math.max(0, Math.min(SOUL_RING_MAX_LEVEL, sr?.levels?.ring_gold ?? 0)),
      ring_amethyst: Math.max(0, Math.min(SOUL_RING_MAX_LEVEL, sr?.levels?.ring_amethyst ?? 0)),
      ring_crimson: Math.max(0, Math.min(SOUL_RING_MAX_LEVEL, sr?.levels?.ring_crimson ?? 0)),
      ring_aurora: Math.max(0, Math.min(SOUL_RING_MAX_LEVEL, sr?.levels?.ring_aurora ?? 0)),
    },
    spiritJades: jades,
    totalFusions: Math.max(0, sr?.totalFusions ?? 0),
  };
}

export function getSoulRingUpgradeCost(
  slotId: SoulRingSlotId,
  currentLevel: number
): { jadeTier: 1 | 2 | 3 | 4 | 5; jadeCount: number; gold: number } {
  const def = SOUL_RING_DEFS.find((r) => r.id === slotId) ?? SOUL_RING_DEFS[0];
  return {
    jadeTier: def.requiredJadeTier,
    jadeCount: 1 + Math.floor(currentLevel / 2),
    gold: 280 + def.tierIndex * 180 + currentLevel * 190,
  };
}

/** Pure helper: fuse 3 spirit jades of `sourceTier` (1..4) into 1 jade of `sourceTier + 1`. */
export function fuseSpiritJades(
  state: SoulRingState,
  sourceTier: 1 | 2 | 3 | 4,
  count = 1
): { nextState: SoulRingState; fusedCount: number } {
  const idx = sourceTier - 1;
  const available = state.spiritJades[idx] ?? 0;
  const maxPossible = Math.floor(available / 3);
  const actual = Math.max(0, Math.min(count, maxPossible));
  if (actual <= 0) return { nextState: state, fusedCount: 0 };
  const nextJades = [...state.spiritJades] as [number, number, number, number, number];
  nextJades[idx] -= actual * 3;
  nextJades[idx + 1] += actual;
  return {
    nextState: {
      ...state,
      spiritJades: nextJades,
      totalFusions: state.totalFusions + actual,
    },
    fusedCount: actual,
  };
}

export function computeSoulRingBonuses(sr?: Partial<SoulRingState>): {
  atkPct: number;
  hpPct: number;
  crit: number;
  bossDmg: number;
  critDmg: number;
  totalLevel: number;
  activeRingCount: number;
  activeResonanceTitle: string | null;
} {
  const norm = normalizeSoulRings(sr);
  let atkPct = 0;
  let hpPct = 0;
  let crit = 0;
  let bossDmg = 0;
  let critDmg = 0;
  let totalLevel = 0;
  let activeRingCount = 0;

  for (const def of SOUL_RING_DEFS) {
    const lv = norm.levels[def.id] ?? 0;
    if (lv > 0) activeRingCount += 1;
    totalLevel += lv;
    atkPct += lv * def.atkPctPerLv;
    hpPct += lv * def.hpPctPerLv;
    crit += lv * def.critPerLv;
    bossDmg += lv * def.bossDmgPerLv;
    critDmg += lv * def.critDmgPerLv;
  }

  let activeResonanceTitle: string | null = null;
  for (const res of SOUL_RING_RESONANCES) {
    if (totalLevel >= res.totalLv) {
      activeResonanceTitle = res.title;
      atkPct += res.atkPct;
      hpPct += res.hpPct;
      critDmg += res.critDmg;
    }
  }

  return {
    atkPct,
    hpPct,
    crit,
    bossDmg,
    critDmg,
    totalLevel,
    activeRingCount,
    activeResonanceTitle,
  };
}

// ============================================================================
// 3. ROYAL DUTCH AUCTION (HẠ GIÁ DẦN) & LIMITED BLIND BOX (HỘP MÙ 9 Ô)
// ============================================================================

export const ROYAL_DUTCH_DROP_INTERVAL_MS = 15_000;
export const ROYAL_DUTCH_SESSION_DURATION_MS = 180_000; // 3 minutes per round

export const ROYAL_DUTCH_LOTS: RoyalDutchLotDef[] = [
  {
    id: 'dutch_grass_bundle',
    title: 'Rương Cỏ Tinh Tú Hoàng Gia x24',
    subtitle: 'Nguyên liệu nâng sao Thú Cưỡi 3D nhanh chóng',
    rarity: 'epic',
    startGems: 85,
    floorGems: 45,
    dropStepGems: 5,
    rewardKind: 'starlightGrass',
    rewardAmount: 24,
    bonusGold: 600,
  },
  {
    id: 'dutch_dragon_scales',
    title: 'Hộp Vảy Rồng Cổ Nguyên Chất x18',
    subtitle: 'Chế tạo Khung VIP Động & bảo vật Lãnh Địa Rồng',
    rarity: 'legendary',
    startGems: 110,
    floorGems: 58,
    dropStepGems: 6,
    rewardKind: 'dragonScales',
    rewardAmount: 18,
    bonusGold: 900,
  },
  {
    id: 'dutch_jade_t3',
    title: 'Linh Ngọc Tử Tinh Bậc III x3',
    subtitle: 'Trực tiếp hợp thành Linh Ngọc Hồng Nguyệt Bậc IV',
    rarity: 'legendary',
    startGems: 125,
    floorGems: 68,
    dropStepGems: 7,
    rewardKind: 'spiritJadeT3',
    rewardAmount: 3,
    bonusGold: 1100,
  },
  {
    id: 'dutch_mythic_vault',
    title: 'Túi Vé Hộp Mù Hoàng Đạo x4 + Mảnh Thần Binh',
    subtitle: 'Siêu hời khi canh chạm đáy sàn đấu giá!',
    rarity: 'mythic',
    startGems: 155,
    floorGems: 82,
    dropStepGems: 9,
    rewardKind: 'blindBoxTickets',
    rewardAmount: 4,
    bonusGold: 1500,
  },
];

export function normalizeRoyalDutchAuction(
  st?: Partial<RoyalDutchAuctionState>,
  now = Date.now()
): RoyalDutchAuctionState {
  const startedAt = st?.sessionStartedAt ?? now;
  const expired = now - startedAt >= ROYAL_DUTCH_SESSION_DURATION_MS;
  if (!st || expired) {
    return {
      sessionStartedAt: now,
      purchasedLotIds: [],
      refreshCount: st?.refreshCount ?? 0,
    };
  }
  return {
    sessionStartedAt: startedAt,
    purchasedLotIds: Array.isArray(st.purchasedLotIds) ? st.purchasedLotIds : [],
    refreshCount: Math.max(0, st.refreshCount ?? 0),
  };
}

export function getDutchLotLivePrice(
  lot: RoyalDutchLotDef,
  sessionStartedAt: number,
  now = Date.now()
): { currentGems: number; discountPct: number; nextDropInSec: number; isAtFloor: boolean } {
  const elapsed = Math.max(0, now - sessionStartedAt);
  const steps = Math.floor(elapsed / ROYAL_DUTCH_DROP_INTERVAL_MS);
  const rawPrice = lot.startGems - steps * lot.dropStepGems;
  const currentGems = Math.max(lot.floorGems, rawPrice);
  const isAtFloor = currentGems <= lot.floorGems;
  const discountPct = Math.round(((lot.startGems - currentGems) / Math.max(1, lot.startGems)) * 100);
  const msIntoStep = elapsed % ROYAL_DUTCH_DROP_INTERVAL_MS;
  const nextDropInSec = isAtFloor
    ? 0
    : Math.max(1, Math.ceil((ROYAL_DUTCH_DROP_INTERVAL_MS - msIntoStep) / 1000));
  return { currentGems, discountPct, nextDropInSec, isAtFloor };
}

export const BLIND_BOX_COST_GEMS = 35;
export const BLIND_BOX_SESSION_MS = 6 * 3600 * 1000;

export function normalizeRoyalBlindBox(
  st?: Partial<RoyalBlindBoxState>,
  now = Date.now()
): RoyalBlindBoxState {
  if (
    !st ||
    typeof st.grandPrizeIndex !== 'number' ||
    (st.sessionEndsAt && now >= st.sessionEndsAt)
  ) {
    return {
      cycleNumber: Math.max(1, (st?.cycleNumber ?? 0) + (st ? 1 : 1)),
      grandPrizeIndex: Math.floor(Math.random() * 9),
      openedBoxes: {},
      totalBoxesOpened: Math.max(0, st?.totalBoxesOpened ?? 0),
      sessionEndsAt: now + BLIND_BOX_SESSION_MS,
    };
  }
  return {
    cycleNumber: Math.max(1, st.cycleNumber ?? 1),
    grandPrizeIndex: Math.max(0, Math.min(8, st.grandPrizeIndex)),
    openedBoxes: st.openedBoxes ? { ...st.openedBoxes } : {},
    totalBoxesOpened: Math.max(0, st.totalBoxesOpened ?? 0),
    sessionEndsAt: st.sessionEndsAt ?? now + BLIND_BOX_SESSION_MS,
  };
}

export function resolveBlindBoxOpen(
  state: RoyalBlindBoxState,
  boxIndex: number
): { nextState: RoyalBlindBoxState; reward: BlindBoxSlotReward } {
  const safeIdx = Math.max(0, Math.min(8, boxIndex));
  if (state.openedBoxes[safeIdx]) {
    return { nextState: state, reward: state.openedBoxes[safeIdx] };
  }
  const isGrandPrize = safeIdx === state.grandPrizeIndex;
  let reward: BlindBoxSlotReward;
  if (isGrandPrize) {
    reward = {
      boxIndex: safeIdx,
      label: 'ĐẠI THƯỞNG THẦN THOẠI · 120 Ngọc + Ngọc Bậc IV + 25 Cỏ + 15 Vảy Rồng',
      rarity: 'mythic',
      isGrandPrize: true,
      rewardGems: 120,
      rewardGold: 1800,
      rewardGrass: 25,
      rewardDragonScales: 15,
      rewardJadeTier: 4,
      rewardJadeAmount: 1,
    };
  } else {
    const table: Array<Omit<BlindBoxSlotReward, 'boxIndex'>> = [
      {
        label: 'Túi Cỏ Tinh Tú x12 + 450 Vàng',
        rarity: 'epic',
        isGrandPrize: false,
        rewardGems: 0,
        rewardGold: 450,
        rewardGrass: 12,
        rewardDragonScales: 0,
      },
      {
        label: 'Linh Ngọc Hoàng Kim Bậc II x2 + 20 Ngọc',
        rarity: 'legendary',
        isGrandPrize: false,
        rewardGems: 20,
        rewardGold: 300,
        rewardGrass: 0,
        rewardDragonScales: 0,
        rewardJadeTier: 2,
        rewardJadeAmount: 2,
      },
      {
        label: 'Vảy Rồng Cổ x10 + 500 Vàng',
        rarity: 'epic',
        isGrandPrize: false,
        rewardGems: 0,
        rewardGold: 500,
        rewardGrass: 0,
        rewardDragonScales: 10,
      },
      {
        label: 'Linh Ngọc Tử Tinh Bậc III x1 + 25 Ngọc',
        rarity: 'legendary',
        isGrandPrize: false,
        rewardGems: 25,
        rewardGold: 420,
        rewardGrass: 4,
        rewardDragonScales: 0,
        rewardJadeTier: 3,
        rewardJadeAmount: 1,
      },
      {
        label: 'Rương Ngọc Hồn x45 + 6 Cỏ Tinh Tú',
        rarity: 'epic',
        isGrandPrize: false,
        rewardGems: 45,
        rewardGold: 350,
        rewardGrass: 6,
        rewardDragonScales: 0,
      },
      {
        label: 'Linh Ngọc Bậc I x5 + 6 Vảy Rồng Cổ',
        rarity: 'rare',
        isGrandPrize: false,
        rewardGems: 10,
        rewardGold: 380,
        rewardGrass: 0,
        rewardDragonScales: 6,
        rewardJadeTier: 1,
        rewardJadeAmount: 5,
      },
    ];
    const picked = table[(safeIdx + state.cycleNumber * 2) % table.length];
    reward = { boxIndex: safeIdx, ...picked };
  }

  return {
    nextState: {
      ...state,
      openedBoxes: {
        ...state.openedBoxes,
        [safeIdx]: reward,
      },
      totalBoxesOpened: state.totalBoxesOpened + 1,
    },
    reward,
  };
}

// ============================================================================
// 4. 15TH PLAYABLE MODE: ANCIENT DRAGON LAIR 3D (LÃNH ĐỊA RỒNG CỔ 3D)
// ============================================================================

export const MAX_DAILY_DRAGON_LAIR_RUNS = 3;
export const DRAGON_LAIR_DURATION_SEC = 75;

export const DRAGON_LAIR_MILESTONES: DragonLairMilestone[] = [
  {
    scalesTarget: 12,
    title: 'Thợ Săn Long Lân Khởi Nguyên',
    rewardGems: 40,
    rewardDragonScales: 8,
    rewardGrass: 12,
    rewardBlindBoxTickets: 1,
    rewardJadeT3: 1,
  },
  {
    scalesTarget: 32,
    title: 'Kẻ Thách Thức Cổ Long 3D',
    rewardGems: 65,
    rewardDragonScales: 14,
    rewardGrass: 20,
    rewardBlindBoxTickets: 2,
    rewardJadeT3: 2,
  },
  {
    scalesTarget: 65,
    title: 'Đồ Long Tôn Giả Tinh Giới',
    rewardGems: 100,
    rewardDragonScales: 22,
    rewardGrass: 32,
    rewardBlindBoxTickets: 3,
    rewardJadeT3: 3,
  },
  {
    scalesTarget: 120,
    title: 'Chúa Tể Lãnh Địa Rồng Cổ',
    rewardGems: 160,
    rewardDragonScales: 35,
    rewardGrass: 48,
    rewardBlindBoxTickets: 5,
    rewardJadeT3: 4,
  },
];

export function normalizeDragonLair(dl?: Partial<DragonLairState>): DragonLairState {
  const today = getTodayKey();
  if (!dl || dl.date !== today) {
    return {
      date: today,
      dailyRunsRemaining: MAX_DAILY_DRAGON_LAIR_RUNS,
      bestDamage: Math.max(0, dl?.bestDamage ?? 0),
      totalClears: Math.max(0, dl?.totalClears ?? 0),
      totalScalesEarned: Math.max(0, dl?.totalScalesEarned ?? 0),
      claimedMilestones: Array.isArray(dl?.claimedMilestones) ? dl.claimedMilestones : [],
    };
  }
  return {
    date: today,
    dailyRunsRemaining: Math.max(0, Math.min(MAX_DAILY_DRAGON_LAIR_RUNS, dl.dailyRunsRemaining ?? MAX_DAILY_DRAGON_LAIR_RUNS)),
    bestDamage: Math.max(0, dl.bestDamage ?? 0),
    totalClears: Math.max(0, dl.totalClears ?? 0),
    totalScalesEarned: Math.max(0, dl.totalScalesEarned ?? 0),
    claimedMilestones: Array.isArray(dl.claimedMilestones) ? dl.claimedMilestones : [],
  };
}

export function countClaimableDragonLairMilestones(save: SaveData): number {
  const dl = normalizeDragonLair(save.dragonLair);
  return DRAGON_LAIR_MILESTONES.filter(
    (m) => dl.totalScalesEarned >= m.scalesTarget && !dl.claimedMilestones.includes(m.scalesTarget)
  ).length;
}

// ============================================================================
// 5. 3D LOBBY WEATHER & ANIMATED VIP AVATAR FRAMES
// ============================================================================

export const LOBBY_WEATHER_DEFS: LobbyWeatherDef[] = [
  {
    id: 'clear',
    name: 'Quang Đãng',
    shortDesc: 'Bầu trời sao trong trẻo mặc định',
    swatchClass: 'from-slate-600 to-indigo-800',
    particleHex: 0xffffff,
    secondaryHex: 0xfde68a,
  },
  {
    id: 'meteor_shower',
    name: 'Mưa Sao Băng',
    shortDesc: 'Vệt sao băng vàng lam rơi chéo 3D',
    swatchClass: 'from-amber-400 to-sky-500',
    particleHex: 0xfde047,
    secondaryHex: 0x38bdf8,
  },
  {
    id: 'starlight_snow',
    name: 'Tuyết Tinh Tú',
    shortDesc: 'Bông tuyết pha lê lấp lánh nhẹ rơi',
    swatchClass: 'from-cyan-300 to-blue-500',
    particleHex: 0xe0f2fe,
    secondaryHex: 0x7dd3fc,
  },
  {
    id: 'sakura_petals',
    name: 'Hoa Anh Đào',
    shortDesc: 'Cánh hoa hồng phiêu bồng trong gió sao',
    swatchClass: 'from-pink-300 to-rose-500',
    particleHex: 0xf9a8d4,
    secondaryHex: 0xfda4af,
  },
  {
    id: 'golden_embers',
    name: 'Tàn Lửa Rồng',
    shortDesc: 'Đốm lửa hoàng kim bay ngược uy nghi',
    swatchClass: 'from-orange-400 to-red-600',
    particleHex: 0xfb923c,
    secondaryHex: 0xfef08a,
  },
];

export const VIP_AVATAR_FRAME_DEFS: VipAvatarFrameDef[] = [
  {
    id: 'vip_royal_gold',
    name: 'Hào Quang Hoàng Gia',
    tierLabel: 'VIP I · ÁNH KIM ĐỘNG',
    desc: 'Vòng kim quang xoay mượt quanh chân dung anh hùng tại Sảnh Chính & Bảng Vinh Danh.',
    frameClass: 'w13-vip-frame-gold',
    bonusAtk: 35,
    bonusHp: 220,
    unlockVipLevel: 1,
    unlockDragonScales: 8,
    unlockGems: 45,
  },
  {
    id: 'vip_nebula_flow',
    name: 'Tinh Vân Lưu Chuyển',
    tierLabel: 'VIP III · TINH VÂN',
    desc: 'Dải ngân hà lam tím lưu chuyển không ngừng, tỏa sáng đẳng cấp cao thủ Tinh Giới.',
    frameClass: 'w13-vip-frame-nebula',
    bonusAtk: 60,
    bonusHp: 380,
    unlockVipLevel: 2,
    unlockDragonScales: 18,
    unlockGems: 75,
  },
  {
    id: 'vip_diamond_crown',
    name: 'Vương Miện Kim Cương',
    tierLabel: 'VIP V · KIM CƯƠNG',
    desc: 'Ánh khúc xạ kim cương kết hợp vương miện hoàng kim lấp lánh tối thượng.',
    frameClass: 'w13-vip-frame-diamond',
    bonusAtk: 95,
    bonusHp: 560,
    unlockVipLevel: 4,
    unlockDragonScales: 30,
    unlockGems: 115,
  },
  {
    id: 'vip_dragon_soul',
    name: 'Long Hồn Bất Diệt',
    tierLabel: 'CHÍ TÔN · ĐỒ LONG',
    desc: 'Khung huyền thoại rèn từ Vảy Rồng Cổ với hào quang hỏa diệm chuyển động 360°.',
    frameClass: 'w13-vip-frame-dragon',
    bonusAtk: 140,
    bonusHp: 820,
    unlockVipLevel: 6,
    unlockDragonScales: 45,
    unlockGems: 155,
  },
];

export const VIP_AVATAR_FRAME_MAP: Record<VipAvatarFrameId, VipAvatarFrameDef> =
  VIP_AVATAR_FRAME_DEFS.reduce((acc, f) => {
    acc[f.id] = f;
    return acc;
  }, {} as Record<VipAvatarFrameId, VipAvatarFrameDef>);

export function computeVipFrameBonuses(save: SaveData): { atk: number; hp: number } {
  const unlocked = save.unlockedVipFrames ?? [];
  let atk = 0;
  let hp = 0;
  for (const id of unlocked) {
    const def = VIP_AVATAR_FRAME_MAP[id];
    if (def) {
      atk += def.bonusAtk;
      hp += def.bonusHp;
    }
  }
  return { atk, hp };
}

// ============================================================================
// 6. 7-DAY CARNIVAL ROADMAP & 3-TIER EVOLVING FIRST TOP-UP
// ============================================================================

export const CARNIVAL_7DAY_TASKS: CarnivalDayTaskDef[] = [
  // Day 1
  {
    id: 'c7_d1_login',
    day: 1,
    title: 'Điểm Danh Ngày 1 · Quà Tân Thủ',
    desc: 'Đăng nhập ngày đầu nhận ngay Cỏ Tinh Tú và Ngọc Hồn',
    metric: 'login_days',
    target: 1,
    points: 15,
    rewardGold: 600,
    rewardGems: 40,
    rewardGrass: 10,
  },
  {
    id: 'c7_d1_run',
    day: 1,
    title: 'Xuất Kích Chiến Trường Đầu Tiên',
    desc: 'Hoàn thành 1 trận chiến bất kỳ trong Artemis 3D',
    metric: 'runs',
    target: 1,
    points: 15,
    rewardGold: 500,
    rewardGems: 25,
    rewardJadeT1: 3,
  },
  // Day 2
  {
    id: 'c7_d2_ring',
    day: 2,
    title: 'Khai Mở Hồn Hoàn 3D',
    desc: 'Đạt tổng cấp Hồn Hoàn 3D từ cấp 2 trở lên',
    metric: 'soul_ring_lv',
    target: 2,
    points: 20,
    rewardGold: 750,
    rewardGems: 35,
    rewardJadeT1: 4,
  },
  {
    id: 'c7_d2_kills',
    day: 2,
    title: 'Thợ Săn Tinh Giới',
    desc: 'Tiêu diệt tích lũy 25 quái vật trong chiến đấu',
    metric: 'kills',
    target: 25,
    points: 20,
    rewardGold: 800,
    rewardGems: 30,
    rewardGrass: 8,
  },
  // Day 3
  {
    id: 'c7_d3_steed',
    day: 3,
    title: 'Thuần Hóa Thú Cưỡi 3D',
    desc: 'Sở hữu ít nhất 1 Thú Cưỡi Tinh Giới 3D',
    metric: 'steed_count',
    target: 1,
    points: 25,
    rewardGold: 950,
    rewardGems: 45,
    rewardBlindBoxTickets: 1,
  },
  {
    id: 'c7_d3_blindbox',
    day: 3,
    title: 'Thử Vận May Hộp Mù',
    desc: 'Mở ít nhất 1 Hộp Mù Hoàng Đạo',
    metric: 'blind_boxes',
    target: 1,
    points: 20,
    rewardGold: 900,
    rewardGems: 35,
    rewardGrass: 10,
  },
  // Day 4
  {
    id: 'c7_d4_dragon',
    day: 4,
    title: 'Khám Phá Lãnh Địa Rồng Cổ',
    desc: 'Thu thập tích lũy 8 Vảy Rồng Cổ',
    metric: 'dragon_scales',
    target: 8,
    points: 25,
    rewardGold: 1100,
    rewardGems: 50,
    rewardJadeT1: 6,
  },
  {
    id: 'c7_d4_runs',
    day: 4,
    title: 'Chiến Binh Bền Bỉ',
    desc: 'Hoàn thành tổng cộng 3 trận chiến',
    metric: 'runs',
    target: 3,
    points: 20,
    rewardGold: 1000,
    rewardGems: 40,
    rewardBlindBoxTickets: 1,
  },
  // Day 5
  {
    id: 'c7_d5_ring',
    day: 5,
    title: 'Cộng Hưởng Ngũ Hồn I',
    desc: 'Đạt tổng cấp Hồn Hoàn 3D từ cấp 5 trở lên',
    metric: 'soul_ring_lv',
    target: 5,
    points: 30,
    rewardGold: 1300,
    rewardGems: 60,
    rewardGrass: 14,
  },
  // Day 6
  {
    id: 'c7_d6_dragon',
    day: 6,
    title: 'Bản Lĩnh Đồ Long',
    desc: 'Thu thập tích lũy 20 Vảy Rồng Cổ',
    metric: 'dragon_scales',
    target: 20,
    points: 30,
    rewardGold: 1500,
    rewardGems: 75,
    rewardBlindBoxTickets: 2,
  },
  // Day 7
  {
    id: 'c7_d7_grand',
    day: 7,
    title: 'Vinh Quang 7 Ngày Tinh Giới',
    desc: 'Mở 3 Hộp Mù Hoàng Đạo hoặc đạt 100 tiêu diệt',
    metric: 'kills',
    target: 60,
    points: 40,
    rewardGold: 2200,
    rewardGems: 120,
    rewardGrass: 24,
    rewardBlindBoxTickets: 2,
  },
];

export const CARNIVAL_7DAY_MILESTONES: CarnivalPointMilestone[] = [
  {
    pointsTarget: 30,
    title: 'Rương Khởi Nguyên 30đ',
    rewardGems: 45,
    rewardGrass: 14,
    rewardBlindBoxTickets: 1,
  },
  {
    pointsTarget: 75,
    title: 'Tặng Thú Cưỡi Thiên Mã 75đ',
    rewardGems: 65,
    rewardGrass: 20,
    rewardBlindBoxTickets: 2,
    unlockSteedId: 'galaxy_pegasus',
  },
  {
    pointsTarget: 130,
    title: 'Kho Báu Hoàng Gia 130đ',
    rewardGems: 110,
    rewardGrass: 32,
    rewardBlindBoxTickets: 3,
  },
  {
    pointsTarget: 200,
    title: 'Đại Thưởng 7 Ngày · Chiến Lang 3D',
    rewardGems: 180,
    rewardGrass: 48,
    rewardBlindBoxTickets: 4,
    unlockSteedId: 'frost_starwolf',
  },
];

export function normalizeCarnival7Day(st?: Partial<Carnival7DayState>): Carnival7DayState {
  const today = getTodayKey();
  if (!st || !st.startDate) {
    return {
      startDate: today,
      daysLoggedIn: 1,
      lastLoginDate: today,
      claimedTaskIds: [],
      claimedMilestones: [],
    };
  }
  const shouldIncrement = st.lastLoginDate !== today;
  const daysLoggedIn = Math.min(7, Math.max(1, (st.daysLoggedIn ?? 1) + (shouldIncrement ? 1 : 0)));
  return {
    startDate: st.startDate,
    daysLoggedIn,
    lastLoginDate: today,
    claimedTaskIds: Array.isArray(st.claimedTaskIds) ? st.claimedTaskIds : [],
    claimedMilestones: Array.isArray(st.claimedMilestones) ? st.claimedMilestones : [],
  };
}

export function getCarnivalTaskProgress(save: SaveData, task: CarnivalDayTaskDef): number {
  const c7 = normalizeCarnival7Day(save.carnival7Day);
  const sr = computeSoulRingBonuses(save.soulRings);
  const dl = normalizeDragonLair(save.dragonLair);
  const bb = normalizeRoyalBlindBox(save.royalBlindBox);
  switch (task.metric) {
    case 'login_days':
      return c7.daysLoggedIn;
    case 'runs':
      return save.career?.totalRuns ?? save.runHistory?.length ?? 0;
    case 'kills':
      return save.career?.totalKills ?? 0;
    case 'soul_ring_lv':
      return sr.totalLevel;
    case 'steed_count':
      return (save.unlockedAstralSteeds ?? []).length;
    case 'dragon_scales':
      return dl.totalScalesEarned + (save.dragonScales ?? 0);
    case 'blind_boxes':
      return bb.totalBoxesOpened;
    default:
      return 0;
  }
}

export function getCarnivalTotalPoints(save: SaveData): number {
  const c7 = normalizeCarnival7Day(save.carnival7Day);
  let pts = 0;
  for (const t of CARNIVAL_7DAY_TASKS) {
    if (c7.claimedTaskIds.includes(t.id)) pts += t.points;
  }
  return pts;
}

export function countClaimableCarnivalRewards(save: SaveData): number {
  const c7 = normalizeCarnival7Day(save.carnival7Day);
  let count = 0;
  for (const t of CARNIVAL_7DAY_TASKS) {
    if (!c7.claimedTaskIds.includes(t.id) && getCarnivalTaskProgress(save, t) >= t.target) {
      count += 1;
    }
  }
  const pts = getCarnivalTotalPoints(save);
  for (const m of CARNIVAL_7DAY_MILESTONES) {
    if (!c7.claimedMilestones.includes(m.pointsTarget) && pts >= m.pointsTarget) {
      count += 1;
    }
  }
  return count;
}

export const EVOLVING_FIRST_TOPUP_TIERS: EvolvingFirstTopUpTierDef[] = [
  {
    tier: 1,
    id: 'tier_origin',
    title: 'Mốc I · Nạp Đầu Khởi Nguyên',
    subtitle: 'Tặng ngay Thiên Mã Ngân Hà 3D + 120 Ngọc Hồn & Linh Ngọc',
    badge: 'GIÁ TRỊ x12 · HOT',
    valueLabel: 'x12 GIÁ TRỊ',
    costGems: 30,
    rewardGems: 120,
    rewardGold: 1800,
    rewardGrass: 22,
    rewardDragonScales: 10,
    rewardBlindBoxTickets: 2,
    rewardJadeT2: 3,
    rewardMythicShards: 12,
    unlockSteedId: 'galaxy_pegasus',
    topUpPoints: 180,
  },
  {
    tier: 2,
    id: 'tier_golden',
    title: 'Mốc II · Tiến Hóa Hoàng Kim',
    subtitle: 'Mở Khung VIP Động Hào Quang + 260 Ngọc Hồn + 4 Vé Hộp Mù',
    badge: 'GIÁ TRỊ x15 · ĐỀ XUẤT',
    valueLabel: 'x15 GIÁ TRỊ',
    costGems: 75,
    rewardGems: 260,
    rewardGold: 3600,
    rewardGrass: 38,
    rewardDragonScales: 22,
    rewardBlindBoxTickets: 4,
    rewardJadeT2: 6,
    rewardMythicShards: 22,
    unlockVipFrameId: 'vip_royal_gold',
    topUpPoints: 360,
  },
  {
    tier: 3,
    id: 'tier_sovereign',
    title: 'Mốc III · Chí Tôn Thánh Long',
    subtitle: 'Triệu hồi Phượng Hoàng Nhật Thực 3D + 520 Ngọc + 8 Vé Hộp Mù',
    badge: 'GIÁ TRỊ x18 · TỐI THƯỢNG',
    valueLabel: 'x18 GIÁ TRỊ',
    costGems: 140,
    rewardGems: 520,
    rewardGold: 6500,
    rewardGrass: 65,
    rewardDragonScales: 38,
    rewardBlindBoxTickets: 8,
    rewardJadeT2: 12,
    rewardMythicShards: 36,
    unlockSteedId: 'eclipse_phoenix',
    unlockVipFrameId: 'vip_diamond_crown',
    topUpPoints: 720,
  },
];

export function normalizeEvolvingFirstTopUp(
  st?: Partial<EvolvingFirstTopUpState>
): EvolvingFirstTopUpState {
  return {
    claimedTiers: Array.isArray(st?.claimedTiers) ? st.claimedTiers : [],
  };
}

// ============================================================================
// 7. TOP SERVER HALL OF FAME 3D PROFILES (SOI & SAO CHÉP ĐỘI HÌNH TOP 1)
// ============================================================================

export const TOP_SERVER_PROFILES: TopPlayerBuildProfile[] = [
  {
    rank: 1,
    name: 'Thiên Đế · Bạch Dương',
    guild: 'Hoàng Đạo Chí Tôn',
    titleBadge: 'TOP 1 LIÊN SERVER',
    powerRating: 24800,
    heroId: 'wukong',
    heroStar: 5,
    astralSteedId: 'golden_sovereign_dragon',
    steedStar: 5,
    warBannerId: 'banner_phoenix',
    vipFrameId: 'vip_dragon_soul',
    mythicWeaponTier: 5,
    soulRingTotalLv: 46,
    signatureQuote: 'Ngũ Hồn Hoàn cộng hưởng cùng Thánh Long Hoàng Kim phá vỡ mọi giới hạn Lực Chiến!',
  },
  {
    rank: 2,
    name: 'Nguyệt Thần · Artemis',
    guild: 'Tinh Vân Vô Cực',
    titleBadge: 'Á QUÂN TINH GIỚI',
    powerRating: 21400,
    heroId: 'artemis',
    heroStar: 5,
    astralSteedId: 'eclipse_phoenix',
    steedStar: 4,
    warBannerId: 'banner_solar',
    vipFrameId: 'vip_diamond_crown',
    mythicWeaponTier: 4,
    soulRingTotalLv: 38,
    signatureQuote: 'Tốc độ bắn tối đa kết hợp Bạo Kích Tử Tinh giúp hạ Cổ Long chỉ trong 1 nhịp Nộ.',
  },
  {
    rank: 3,
    name: 'Lôi Đế · Song Tử',
    guild: 'Thiên Lôi Hội',
    titleBadge: 'HẠNG 3 ĐỈNH CAO',
    powerRating: 18900,
    heroId: 'thor',
    heroStar: 4,
    astralSteedId: 'frost_starwolf',
    steedStar: 4,
    warBannerId: 'banner_storm',
    vipFrameId: 'vip_nebula_flow',
    mythicWeaponTier: 4,
    soulRingTotalLv: 31,
    signatureQuote: 'Chiến Lang Băng Lam và Cờ Lôi Đình tối ưu hóa lối đánh cơ động né Hơi Thở Rồng.',
  },
];

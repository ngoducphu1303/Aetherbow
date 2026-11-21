import {
  ActiveGearSetBonus,
  ComputedPlayerStats,
  GearInstance,
  GearSetDefinition,
  GearSetId,
  GearSlot,
  GearTemplate,
  PityState,
  Rarity,
  RuneId,
  SaveData,
  SocketGemInstance,
  WeaponArchetype,
} from '../types/game';
import { HERO_MAP } from './heroesData';
import { ACCOUNT_RESET_EPOCH } from '../services/accountHydrationPolicy';
import {
  DEFAULT_SETTINGS,
  MAX_DAILY_SWEEPS,
  normalizeMailInbox,
  normalizePity,
} from './liveOpsData';
import { getTodayKey } from './questsData';
import { RUNES_CATALOG } from './runesData';
import { computeTalentBonuses } from './talentsData';
import {
  AURA_MAP,
  MAX_DAILY_RIFT_RUNS,
  SKIN_MAP,
  getPetStats,
} from './wave3Data';
import {
  SEASON_MEDALS,
  computeGuildTechBonuses,
  getAwakeningMultiplier,
  getEffectiveSubstats,
  normalizeDestinyWheel,
  normalizeGuild,
  reforgeItemSubstats,
  scoreGearForGoal,
} from './wave4Data';
import {
  createSocketGem,
  getSocketGemBonuses,
  normalizeArena,
  normalizeNightMarket,
  normalizeNoviceJourney,
  normalizeSocketGems,
} from './wave5Data';
import {
  computeConstellationBonuses,
  normalizeArenaShop,
  normalizeConstellations,
  normalizeCoopRaid,
  normalizeElementalTowers,
  normalizeGrowthFund,
} from './wave6Data';
import {
  MYTHIC_BADGE_MAP,
  getWingStats,
  isMonthlyCardActive,
  normalizeAuctionHouse,
  normalizeCrystalDefense,
  normalizeMonthlyPrivilege,
  normalizeTopUpEvolution,
  normalizeWorldBoss,
} from './wave7Data';
import {
  getMountStats,
  getWeaponAuraStats,
  normalizeBloodMoon,
  normalizeDispatchState,
  normalizeFirstTopUp,
  normalizeWishPool,
} from './wave8Data';
import {
  DYNAMIC_TITLE_MAP,
  evaluateHeroBonds,
  getArtifactStats,
  normalizeAbyssalGauntlet,
  normalizeGuildWar,
  normalizeMysticExchange,
} from './wave9Data';
import {
  getDivineHaloStats,
  normalizeGemRebateVault,
  normalizePantheonExpedition,
  normalizeStepUpChain,
} from './wave10Data';
import {
  DEFAULT_HONOR_FEED,
  computeCodexSummary,
  getEvolvedPetMultiplier,
  normalizeChampionshipState,
  normalizeFestivalState,
  normalizeWeekendPrivilege,
} from './wave11Data';
import {
  SUPREME_MONTHLY_CONFIG,
  computeAltarBonuses,
  getMythicWeaponBonuses,
  getWarBannerStats,
  isSupremeMonthlyActive,
  normalizeBlessingAltar,
  normalizeCrystalVault,
  normalizeMythicWeapon,
  normalizeSupremeMonthly,
  normalizeTreasureWheel,
} from './wave12Data';
import {
  computeSoulRingBonuses,
  computeVipFrameBonuses,
  getAstralSteedStats,
  normalizeCarnival7Day,
  normalizeDragonLair,
  normalizeEvolvingFirstTopUp,
  normalizeRoyalBlindBox,
  normalizeRoyalDutchAuction,
  normalizeSoulRings,
  normalizeStarlightRace,
} from './wave13Data';
import {
  computeGuildSanctuaryBonuses,
  computeRoyal3DTitleBonuses,
  computeZodiacRelicBonuses,
  getCelestialWingStats,
  normalizeAstralBoard,
  normalizeGuildSanctuary,
  normalizeMythicShardShop,
  normalizeSkyCitadel,
  normalizeZodiacRelics,
} from './wave14Data';
import {
  EARLY_FORGE_COSTS,
  EarlyProgressionPolicy,
  PROGRESSION_SCHEMA_VERSION,
  RARITY_RANK,
  clampRarityToPolicy,
  computeHeroMasteryBonuses,
  getBestCh1Stage,
  getEarlyProgressionPolicy,
  normalizeEarlyForgeProgress,
} from './earlyProgressionData';

export const RARITY_ORDER: Rarity[] = [
  Rarity.COMMON,
  Rarity.RARE,
  Rarity.EPIC,
  Rarity.LEGENDARY,
  Rarity.MYTHIC,
];

export const RARITY_META: Record<
  Rarity,
  {
    label: string;
    multiplier: number;
    maxLevel: number;
    color: string;
    borderClass: string;
    bgClass: string;
    textClass: string;
  }
> = {
  [Rarity.COMMON]: {
    label: 'Thường',
    multiplier: 1.0,
    maxLevel: 15,
    color: '#94a3b8',
    borderClass: 'border-slate-500/40',
    bgClass: 'bg-slate-800/70',
    textClass: 'text-slate-300',
  },
  [Rarity.RARE]: {
    label: 'Hiếm',
    multiplier: 1.38,
    maxLevel: 25,
    color: '#38bdf8',
    borderClass: 'border-sky-400/50',
    bgClass: 'bg-sky-950/50',
    textClass: 'text-sky-300',
  },
  [Rarity.EPIC]: {
    label: 'Sử Thi',
    multiplier: 1.85,
    maxLevel: 40,
    color: '#c084fc',
    borderClass: 'border-purple-400/60',
    bgClass: 'bg-purple-950/50',
    textClass: 'text-purple-300',
  },
  [Rarity.LEGENDARY]: {
    label: 'Huyền Thoại',
    multiplier: 2.55,
    maxLevel: 60,
    color: '#fbbf24',
    borderClass: 'border-amber-400/70',
    bgClass: 'bg-amber-950/45',
    textClass: 'text-amber-300',
  },
  [Rarity.MYTHIC]: {
    label: 'Thần Thoại',
    multiplier: 3.45,
    maxLevel: 80,
    color: '#fb7185',
    borderClass: 'border-rose-400/75',
    bgClass: 'bg-rose-950/50',
    textClass: 'text-rose-300',
  },
};

export const GEAR_TEMPLATES: Record<string, GearTemplate> = {
  // === BỘ KHỞI ĐẦU & CƠ BẢN ===
  rusty_bow: {
    templateId: 'rusty_bow',
    name: 'Cung Khởi Nguyên',
    slot: GearSlot.WEAPON,
    weaponArchetype: 'bow',
    setName: 'Khởi Đầu',
    description: 'Cây cung cân bằng của thợ săn tân thủ vào Hoàng Đạo Tinh Giới.',
    perkLabel: 'Bắn nhanh & chính xác',
    baseAtk: 24,
    baseHp: 0,
    baseCritChance: 0.05,
    baseAttackSpeed: 0.08,
    baseMoveSpeed: 0,
    baseDamageReduction: 0,
    innateArrowSpeed: 1.05,
    visualAccentHex: 0x38bdf8,
  },
  heroic_longbow: {
    templateId: 'heroic_longbow',
    name: 'Trường Cung Anh Dũng',
    slot: GearSlot.WEAPON,
    weaponArchetype: 'bow',
    setName: 'Destruction Set',
    description: 'Trường cung bộ Hủy Diệt, tăng sát thương chí mạng và tốc độ tên.',
    perkLabel: '+10% Crit & Tốc độ tên',
    baseAtk: 38,
    baseHp: 0,
    baseCritChance: 0.1,
    baseAttackSpeed: 0.12,
    baseMoveSpeed: 0,
    baseDamageReduction: 0,
    innateArrowSpeed: 1.15,
    visualAccentHex: 0xfacc15,
  },
  beam_staff: {
    templateId: 'beam_staff',
    name: 'Trượng Tia Sáng (Echo)',
    slot: GearSlot.WEAPON,
    weaponArchetype: 'staff',
    setName: 'Echo Set',
    description: 'Trượng phép Echo phóng cầu năng lượng tự động bẻ lái đuổi mục tiêu.',
    perkLabel: 'Đạn Truy Kích (Homing)',
    baseAtk: 35,
    baseHp: 0,
    baseCritChance: 0.06,
    baseAttackSpeed: 0.08,
    baseMoveSpeed: 0,
    baseDamageReduction: 0,
    innateHoming: true,
    innateArrowSpeed: 0.92,
    visualAccentHex: 0xc084fc,
  },
  agile_knuckles: {
    templateId: 'agile_knuckles',
    name: 'Nắm Đấm Linh Hoạt',
    slot: GearSlot.WEAPON,
    weaponArchetype: 'claw',
    setName: 'Decisiveness Set',
    description: 'Vuốt chiến cận-trung tầm phóng sóng xung kích xuyên mục tiêu.',
    perkLabel: 'Xuyên Thấu (Pierce)',
    baseAtk: 40,
    baseHp: 0,
    baseCritChance: 0.08,
    baseAttackSpeed: 0.16,
    baseMoveSpeed: 0.05,
    baseDamageReduction: 0,
    innatePierce: true,
    innateArrowSpeed: 1.05,
    visualAccentHex: 0xfb7185,
  },

  // === VŨ KHÍ S-TIER ===
  dragon_knight_crossbow: {
    templateId: 'dragon_knight_crossbow',
    name: 'Nỏ Kỵ Sĩ Rồng [S]',
    slot: GearSlot.WEAPON,
    weaponArchetype: 'bow',
    setName: 'Dragon Knight Set',
    isSTier: true,
    description: 'Vũ khí S-Tier Bộ Kỵ Sĩ Rồng: Bắn tên lửa rồng uy lực cực đại +14% Chí mạng.',
    perkLabel: 'S-Tier · +14% Crit & +18% ASPD',
    baseAtk: 56,
    baseHp: 0,
    baseCritChance: 0.14,
    baseAttackSpeed: 0.18,
    baseMoveSpeed: 0.04,
    baseDamageReduction: 0,
    innateArrowSpeed: 1.24,
    visualAccentHex: 0xf97316,
  },
  oracle_light_spear: {
    templateId: 'oracle_light_spear',
    name: 'Thương Tiên Tri Oracle [S]',
    slot: GearSlot.WEAPON,
    weaponArchetype: 'staff',
    setName: 'Oracle Set',
    isSTier: true,
    description: 'Vũ khí S-Tier Bộ Tiên Tri: Cầu Ánh Sáng vừa Truy Kích Homing vừa Xuyên Thấu!',
    perkLabel: 'S-Tier · Homing + Pierce',
    baseAtk: 54,
    baseHp: 0,
    baseCritChance: 0.1,
    baseAttackSpeed: 0.2,
    baseMoveSpeed: 0.04,
    baseDamageReduction: 0,
    innateHoming: true,
    innatePierce: true,
    innateArrowSpeed: 1.05,
    visualAccentHex: 0x38bdf8,
  },
  griffin_claws: {
    templateId: 'griffin_claws',
    name: 'Vuốt Điểu Sư Griffin [S]',
    slot: GearSlot.WEAPON,
    weaponArchetype: 'claw',
    setName: 'Griffin Set',
    isSTier: true,
    description: 'Vũ khí S-Tier Bộ Griffin: Sóng cuồng phong siêu tốc xuyên phá hàng ngũ địch.',
    perkLabel: 'S-Tier · +28% ASPD & Pierce',
    baseAtk: 58,
    baseHp: 0,
    baseCritChance: 0.12,
    baseAttackSpeed: 0.28,
    baseMoveSpeed: 0.08,
    baseDamageReduction: 0,
    innatePierce: true,
    innateArrowSpeed: 1.18,
    visualAccentHex: 0x34d399,
  },

  // === DÂY CHUYỀN (NECKLACE) ===
  wooden_charm: {
    templateId: 'wooden_charm',
    name: 'Bùa Mặt Trăng',
    slot: GearSlot.NECKLACE,
    setName: 'Khởi Đầu',
    description: 'Mảnh bùa gỗ khắc hình trăng khuyết tăng công lực và tốc chạy.',
    perkLabel: 'Cân bằng Công & Tốc',
    baseAtk: 10,
    baseHp: 55,
    baseCritChance: 0.02,
    baseAttackSpeed: 0.04,
    baseMoveSpeed: 0.04,
    baseDamageReduction: 0,
    visualAccentHex: 0x34d399,
  },
  echo_amulet: {
    templateId: 'echo_amulet',
    name: 'Hộ Phù Tiếng Vang',
    slot: GearSlot.NECKLACE,
    setName: 'Echo Set',
    description: 'Hộ phù cộng hưởng gia tăng tốc độ tung chiêu và sát thương.',
    perkLabel: '+10% Tốc Bắn',
    baseAtk: 18,
    baseHp: 90,
    baseCritChance: 0.04,
    baseAttackSpeed: 0.1,
    baseMoveSpeed: 0.05,
    baseDamageReduction: 0.02,
    visualAccentHex: 0xc084fc,
  },
  dragon_amulet: {
    templateId: 'dragon_amulet',
    name: 'Hộ Phù Kỵ Sĩ Rồng [S]',
    slot: GearSlot.NECKLACE,
    setName: 'Dragon Knight Set',
    isSTier: true,
    description: 'Hộ phù S-Tier gia tăng mạnh sức công phá và tỷ lệ bạo kích.',
    perkLabel: 'S-Tier · +8% Crit & +28 ATK',
    baseAtk: 28,
    baseHp: 130,
    baseCritChance: 0.08,
    baseAttackSpeed: 0.1,
    baseMoveSpeed: 0.05,
    baseDamageReduction: 0.04,
    visualAccentHex: 0xf59e0b,
  },

  // === NHẪN (RING) ===
  copper_ring: {
    templateId: 'copper_ring',
    name: 'Nhẫn Đồng Tinh Tú',
    slot: GearSlot.RING,
    setName: 'Khởi Đầu',
    description: 'Nhẫn đồng khắc ấn sao tăng độ chuẩn xác cho mỗi phát bắn.',
    perkLabel: '+5% Chí mạng',
    baseAtk: 9,
    baseHp: 30,
    baseCritChance: 0.05,
    baseAttackSpeed: 0.03,
    baseMoveSpeed: 0,
    baseDamageReduction: 0,
    visualAccentHex: 0xfbbf24,
  },
  destruction_ring: {
    templateId: 'destruction_ring',
    name: 'Nhẫn Hủy Diệt',
    slot: GearSlot.RING,
    setName: 'Destruction Set',
    description: 'Nhẫn chiến đấu khuếch đại sức sát thương và chí mạng.',
    perkLabel: '+10% Crit & +18 ATK',
    baseAtk: 18,
    baseHp: 55,
    baseCritChance: 0.1,
    baseAttackSpeed: 0.06,
    baseMoveSpeed: 0,
    baseDamageReduction: 0,
    visualAccentHex: 0xf97316,
  },
  oracle_ring: {
    templateId: 'oracle_ring',
    name: 'Nhẫn Tiên Tri Oracle [S]',
    slot: GearSlot.RING,
    setName: 'Oracle Set',
    isSTier: true,
    description: 'Nhẫn S-Tier gia tăng tốc độ bắn và tỷ lệ bạo kích đỉnh cao.',
    perkLabel: 'S-Tier · +12% Crit & +14% ASPD',
    baseAtk: 26,
    baseHp: 85,
    baseCritChance: 0.12,
    baseAttackSpeed: 0.14,
    baseMoveSpeed: 0.04,
    baseDamageReduction: 0,
    visualAccentHex: 0x38bdf8,
  },

  // === ÁO GIÁP (ARMOR) ===
  cloth_vest: {
    templateId: 'cloth_vest',
    name: 'Áo Choàng Nguyệt Lâm',
    slot: GearSlot.ARMOR,
    setName: 'Khởi Đầu',
    description: 'Áo choàng thêu viền vàng bảo vệ thợ săn trong màn đêm.',
    perkLabel: 'Tăng Sinh Lực & Giáp',
    baseAtk: 0,
    baseHp: 135,
    baseCritChance: 0,
    baseAttackSpeed: 0,
    baseMoveSpeed: 0.03,
    baseDamageReduction: 0.06,
    visualAccentHex: 0x10b981,
    cloakColorHex: 0x14532d,
  },
  echo_armor: {
    templateId: 'echo_armor',
    name: 'Giáp Tiếng Vang',
    slot: GearSlot.ARMOR,
    setName: 'Echo Set',
    description: 'Giáp tinh vân nhẹ nhàng giúp di chuyển linh hoạt và kháng thương.',
    perkLabel: '+10% Giảm Thương',
    baseAtk: 6,
    baseHp: 210,
    baseCritChance: 0,
    baseAttackSpeed: 0.04,
    baseMoveSpeed: 0.06,
    baseDamageReduction: 0.1,
    visualAccentHex: 0x818cf8,
    cloakColorHex: 0x312e81,
  },
  dragon_plate: {
    templateId: 'dragon_plate',
    name: 'Giáp Kỵ Sĩ Rồng [S]',
    slot: GearSlot.ARMOR,
    setName: 'Dragon Knight Set',
    isSTier: true,
    description: 'Chiến giáp S-Tier bất hoại rèn từ vảy rồng lửa, kháng sát thương vượt trội.',
    perkLabel: 'S-Tier · +320 HP & +16% Giáp',
    baseAtk: 14,
    baseHp: 320,
    baseCritChance: 0.03,
    baseAttackSpeed: 0.06,
    baseMoveSpeed: 0.04,
    baseDamageReduction: 0.16,
    visualAccentHex: 0xf59e0b,
    cloakColorHex: 0x7f1d1d,
  },

  // === MŨ (HELMET) ===
  leather_cap: {
    templateId: 'leather_cap',
    name: 'Mũ Da Thợ Săn',
    slot: GearSlot.HELMET,
    setName: 'Khởi Đầu',
    description: 'Mũ da nhẹ giúp tăng giới hạn sinh lực và độ nhạy bén.',
    perkLabel: '+85 HP & +4% Giáp',
    baseAtk: 4,
    baseHp: 85,
    baseCritChance: 0.02,
    baseAttackSpeed: 0,
    baseMoveSpeed: 0.02,
    baseDamageReduction: 0.04,
    visualAccentHex: 0x94a3b8,
  },
  astral_crown: {
    templateId: 'astral_crown',
    name: 'Vương Miện Tiên Tri [S]',
    slot: GearSlot.HELMET,
    setName: 'Oracle Set',
    isSTier: true,
    description: 'Mũ S-Tier khảm tinh thể sao, tăng mạnh HP và tốc độ thi triển.',
    perkLabel: 'S-Tier · +210 HP & +10% ASPD',
    baseAtk: 14,
    baseHp: 210,
    baseCritChance: 0.05,
    baseAttackSpeed: 0.1,
    baseMoveSpeed: 0.05,
    baseDamageReduction: 0.08,
    visualAccentHex: 0x38bdf8,
  },

  // === GIÀY (BOOTS) ===
  worn_boots: {
    templateId: 'worn_boots',
    name: 'Giày Tuần Rừng',
    slot: GearSlot.BOOTS,
    setName: 'Khởi Đầu',
    description: 'Đôi giày nhẹ bám sàn đá cổ đại, giúp né đòn mượt mà.',
    perkLabel: '+8% Tốc Chạy',
    baseAtk: 2,
    baseHp: 70,
    baseCritChance: 0,
    baseAttackSpeed: 0,
    baseMoveSpeed: 0.08,
    baseDamageReduction: 0.02,
    visualAccentHex: 0x34d399,
  },
  griffin_boots: {
    templateId: 'griffin_boots',
    name: 'Giày Điểu Sư Griffin [S]',
    slot: GearSlot.BOOTS,
    setName: 'Griffin Set',
    isSTier: true,
    description: 'Giày S-Tier ban tốc độ gió lốc, né tránh linh hoạt giữa mưa đạn.',
    perkLabel: 'S-Tier · +18% Tốc Chạy & +170 HP',
    baseAtk: 10,
    baseHp: 170,
    baseCritChance: 0.04,
    baseAttackSpeed: 0.06,
    baseMoveSpeed: 0.18,
    baseDamageReduction: 0.06,
    visualAccentHex: 0x34d399,
  },
};

export const ALL_TEMPLATE_LIST = Object.values(GEAR_TEMPLATES);

// ============================================================================
// GEAR SET BONUSES (5 MID-TO-ENDGAME SETS · STARTER SET EXCLUDED TO PROTECT CH.1)
// ============================================================================

export const GEAR_SET_DEFINITIONS: Record<GearSetId, GearSetDefinition> = {
  'Destruction Set': {
    id: 'Destruction Set',
    displayName: 'Bộ Hủy Diệt',
    accentColor: '#f97316',
    maxPieces: 2,
    tiers: [
      {
        piecesRequired: 2,
        label: '+10% ATK · +12% Sát thương Chí Mạng',
        atkPct: 0.1,
        critDamage: 0.12,
      },
    ],
  },
  'Echo Set': {
    id: 'Echo Set',
    displayName: 'Bộ Tiếng Vang',
    accentColor: '#c084fc',
    maxPieces: 3,
    tiers: [
      {
        piecesRequired: 2,
        label: '+10% Tốc Bắn · +6% Tốc Chạy',
        attackSpeed: 0.1,
        moveSpeed: 0.06,
      },
      {
        piecesRequired: 3,
        label: '+12% ATK · +8% Giảm Thương',
        atkPct: 0.12,
        damageReduction: 0.08,
      },
    ],
  },
  'Dragon Knight Set': {
    id: 'Dragon Knight Set',
    displayName: 'Bộ Kỵ Sĩ Rồng [S]',
    accentColor: '#f59e0b',
    maxPieces: 3,
    tiers: [
      {
        piecesRequired: 2,
        label: '+14% ATK · +12% Max HP',
        atkPct: 0.14,
        hpPct: 0.12,
      },
      {
        piecesRequired: 3,
        label: '+15% Sát thương Chí Mạng · +8% Giảm Thương',
        critDamage: 0.15,
        damageReduction: 0.08,
      },
    ],
  },
  'Oracle Set': {
    id: 'Oracle Set',
    displayName: 'Bộ Tiên Tri Oracle [S]',
    accentColor: '#38bdf8',
    maxPieces: 3,
    tiers: [
      {
        piecesRequired: 2,
        label: '+12% Tốc Bắn · +8% Tỷ lệ Chí Mạng',
        attackSpeed: 0.12,
        critChance: 0.08,
      },
      {
        piecesRequired: 3,
        label: '+16% ATK · +10% Tốc Bắn',
        atkPct: 0.16,
        attackSpeed: 0.1,
      },
    ],
  },
  'Griffin Set': {
    id: 'Griffin Set',
    displayName: 'Bộ Điểu Sư Griffin [S]',
    accentColor: '#34d399',
    maxPieces: 2,
    tiers: [
      {
        piecesRequired: 2,
        label: '+14% Tốc Chạy · +12% Tốc Bắn · +10% ATK',
        moveSpeed: 0.14,
        attackSpeed: 0.12,
        atkPct: 0.1,
      },
    ],
  },
};

export interface EvaluatedGearSetsResult {
  sets: ActiveGearSetBonus[];
  activeTierCount: number;
  atkPct: number;
  hpPct: number;
  critChance: number;
  critDamage: number;
  attackSpeed: number;
  moveSpeed: number;
  damageReduction: number;
  bossDamageBonus: number;
}

export function evaluateEquippedGearSets(
  save: Pick<SaveData, 'equipped' | 'inventory'>
): EvaluatedGearSetsResult {
  const counts: Partial<Record<GearSetId, number>> = {};
  for (const slot of Object.values(GearSlot)) {
    const uid = save.equipped[slot];
    if (!uid) continue;
    const item = save.inventory.find((g) => g.uid === uid);
    if (!item) continue;
    const tpl = GEAR_TEMPLATES[item.templateId];
    if (!tpl) continue;
    const setId = tpl.setName as GearSetId;
    if (GEAR_SET_DEFINITIONS[setId]) {
      counts[setId] = (counts[setId] ?? 0) + 1;
    }
  }

  const sets: ActiveGearSetBonus[] = [];
  let activeTierCount = 0;
  let atkPct = 0;
  let hpPct = 0;
  let critChance = 0;
  let critDamage = 0;
  let attackSpeed = 0;
  let moveSpeed = 0;
  let damageReduction = 0;
  let bossDamageBonus = 0;

  for (const [setIdKey, equippedCount] of Object.entries(counts) as Array<[GearSetId, number]>) {
    if (!equippedCount || equippedCount <= 0) continue;
    const def = GEAR_SET_DEFINITIONS[setIdKey];
    const unlockedTiers = def.tiers.filter((t) => equippedCount >= t.piecesRequired);
    const nextTier = def.tiers.find((t) => equippedCount < t.piecesRequired);
    for (const tier of unlockedTiers) {
      activeTierCount++;
      atkPct += tier.atkPct ?? 0;
      hpPct += tier.hpPct ?? 0;
      critChance += tier.critChance ?? 0;
      critDamage += tier.critDamage ?? 0;
      attackSpeed += tier.attackSpeed ?? 0;
      moveSpeed += tier.moveSpeed ?? 0;
      damageReduction += tier.damageReduction ?? 0;
      bossDamageBonus += tier.bossDamageBonus ?? 0;
    }
    sets.push({
      setId: def.id,
      displayName: def.displayName,
      accentColor: def.accentColor,
      equippedCount,
      maxPieces: def.maxPieces,
      unlockedTiers,
      nextTier,
    });
  }

  sets.sort((a, b) => b.unlockedTiers.length - a.unlockedTiers.length || b.equippedCount - a.equippedCount);

  return {
    sets,
    activeTierCount,
    atkPct,
    hpPct,
    critChance,
    critDamage,
    attackSpeed,
    moveSpeed,
    damageReduction,
    bossDamageBonus,
  };
}

export function getGearStats(item: GearInstance) {
  const tpl = GEAR_TEMPLATES[item.templateId];
  if (!tpl) {
    return { atk: 0, hp: 0, critChance: 0, attackSpeed: 0, moveSpeed: 0, damageReduction: 0 };
  }
  const rMeta = RARITY_META[item.rarity];
  const levelScale = 1 + (item.level - 1) * 0.11;
  const awakenScale = getAwakeningMultiplier(item.awakeningLevel ?? 0);
  const totalScale = rMeta.multiplier * levelScale * awakenScale;

  return {
    atk: Math.round(tpl.baseAtk * totalScale),
    hp: Math.round(tpl.baseHp * totalScale),
    critChance: tpl.baseCritChance * (1 + (rMeta.multiplier - 1) * 0.4) * (1 + (item.awakeningLevel ?? 0) * 0.08),
    attackSpeed: tpl.baseAttackSpeed * (1 + (rMeta.multiplier - 1) * 0.35),
    moveSpeed: tpl.baseMoveSpeed * (1 + (rMeta.multiplier - 1) * 0.25),
    damageReduction: Math.min(0.45, tpl.baseDamageReduction * (1 + (rMeta.multiplier - 1) * 0.3)),
  };
}

export function getUpgradeCost(item: GearInstance): number {
  const rarityFactor = RARITY_ORDER.indexOf(item.rarity) + 1;
  const quadraticTier = Math.pow(Math.max(0, item.level - 6), 1.48) * 11;
  return Math.round((48 * item.level + quadraticTier) * (0.85 + rarityFactor * 0.28));
}

export function getGearPowerScore(
  item: GearInstance,
  socketPool?: SocketGemInstance[]
): number {
  const s = getGearStats(item);
  const tpl = GEAR_TEMPLATES[item.templateId];
  const perkBonus = (tpl?.innatePierce ? 45 : 0) + (tpl?.innateHoming ? 45 : 0) + (tpl?.isSTier ? 35 : 0);
  const substatScore = getEffectiveSubstats(item).reduce((sum, sub) => sum + Math.round(sub.value * 420), 0);
  const awakenBonus = (item.awakeningLevel ?? 0) * 55;
  let socketBonus = 0;
  if (item.socketedGems && item.socketedGems.length > 0) {
    if (socketPool && socketPool.length > 0) {
      for (const gUid of item.socketedGems) {
        const g = socketPool.find((x) => x.uid === gUid);
        if (!g) continue;
        const b = getSocketGemBonuses(g);
        socketBonus += Math.round(
          b.atk * 3.4 + b.hp * 0.42 + b.critChance * 650 + b.attackSpeed * 420 + b.damageReduction * 500
        );
      }
    } else {
      socketBonus = item.socketedGems.length * 60;
    }
  }
  return Math.round(
    s.atk * 3.4 +
      s.hp * 0.42 +
      s.critChance * 650 +
      s.attackSpeed * 420 +
      s.moveSpeed * 220 +
      s.damageReduction * 500 +
      perkBonus +
      substatScore +
      awakenBonus +
      socketBonus
  );
}

export function computePlayerStats(save: SaveData): ComputedPlayerStats {
  const hero = HERO_MAP[save.selectedHeroId] ?? HERO_MAP.artemis;
  const heroStar = save.heroStars[hero.id] ?? 0;
  const starScale = 1 + heroStar * 0.14;

  let attack = Math.round(hero.bonusAtk * starScale);
  let maxHp = Math.round(hero.bonusHp * starScale) + 80;
  let critChance = 0.08 + heroStar * 0.015;
  let critDamage = hero.id === 'wukong' ? 2.01 : 1.85;
  let attackSpeedMult = 1.0 + heroStar * 0.03;
  let moveSpeedMult = 1.0;
  let damageReduction = hero.id === 'wukong' ? 0.08 : 0;
  let arrowSpeed = 24;
  let innatePierce = false;
  let innateHoming = false;
  let weaponArchetype: WeaponArchetype = 'bow';
  let subAtkPct = 0;
  let subHpPct = 0;
  let bossDamageBonus = 0;

  const socketPool = normalizeSocketGems(save.socketGems);
  for (const slot of Object.values(GearSlot)) {
    const uid = save.equipped[slot];
    const item = save.inventory.find((g) => g.uid === uid);
    if (!item) continue;
    const tpl = GEAR_TEMPLATES[item.templateId];
    if (!tpl) continue;
    const stats = getGearStats(item);
    attack += stats.atk;
    maxHp += stats.hp;
    critChance += stats.critChance;
    attackSpeedMult += stats.attackSpeed;
    moveSpeedMult += stats.moveSpeed;
    damageReduction += stats.damageReduction;
    if (tpl.innatePierce) innatePierce = true;
    if (tpl.innateHoming) innateHoming = true;
    if (slot === GearSlot.WEAPON) {
      if (tpl.weaponArchetype) weaponArchetype = tpl.weaponArchetype;
      if (tpl.innateArrowSpeed) arrowSpeed *= tpl.innateArrowSpeed;
    }

    // Apply Gear Reforged Substats
    for (const sub of getEffectiveSubstats(item)) {
      if (sub.kind === 'atk_pct') subAtkPct += sub.value;
      else if (sub.kind === 'hp_pct') subHpPct += sub.value;
      else if (sub.kind === 'crit_pct') critChance += sub.value;
      else if (sub.kind === 'crit_dmg_pct') critDamage += sub.value;
      else if (sub.kind === 'aspd_pct') attackSpeedMult += sub.value;
      else if (sub.kind === 'move_pct') moveSpeedMult += sub.value;
      else if (sub.kind === 'dr_pct') damageReduction += sub.value;
      else if (sub.kind === 'boss_dmg_pct') bossDamageBonus += sub.value;
    }

    // Apply Socketed Gems
    for (const gUid of item.socketedGems ?? []) {
      const gem = socketPool.find((g) => g.uid === gUid);
      if (!gem) continue;
      const b = getSocketGemBonuses(gem);
      attack += b.atk;
      maxHp += b.hp;
      critChance += b.critChance;
      attackSpeedMult += b.attackSpeed;
      damageReduction += b.damageReduction;
    }
  }

  // Apply Equipped Runes bonuses
  const equippedRunes: RuneId[] = [];
  let runeAtkPct = 0;
  let runeHpPct = 0;
  for (const rUid of save.equippedRunes) {
    const rInst = save.runeInventory.find((r) => r.uid === rUid);
    if (!rInst) continue;
    const rDef = RUNES_CATALOG[rInst.runeId];
    if (!rDef) continue;
    equippedRunes.push(rDef.id);
    const tierMult = RARITY_META[rInst.rarity].multiplier;
    runeAtkPct += rDef.atkBonusPct * (0.8 + tierMult * 0.25);
    runeHpPct += rDef.hpBonusPct * (0.8 + tierMult * 0.25);
    critChance += rDef.critBonus * (0.8 + tierMult * 0.2);
    if (rDef.id === 'equinox_bloom') critDamage += 0.25;
    if (rDef.id === 'arrow_rain') attackSpeedMult += 0.15;
  }

  // Apply Equipped Pet (with Wave 11 Spirit Beast Evolution multiplier), Hero Skin, and Zodiac Aura bonuses
  let petAtk = 0;
  let equippedPetEvolved = false;
  const equippedPetId = save.equippedPetId ?? null;
  if (equippedPetId) {
    const petInst = (save.pets ?? []).find((p) => p.petId === equippedPetId);
    if (petInst) {
      const pStats = getPetStats(petInst.petId, petInst.level);
      equippedPetEvolved = (save.evolvedPets ?? []).includes(petInst.petId);
      const evoMult = getEvolvedPetMultiplier(equippedPetEvolved);
      const finalPetAtk = Math.round(pStats.atk * evoMult.atkMult);
      const finalPetHp = Math.round(pStats.hp * evoMult.hpMult);
      attack += finalPetAtk;
      maxHp += finalPetHp;
      critChance += pStats.crit + evoMult.critBonus;
      petAtk = finalPetAtk;
    }
  }

  const activeSkinId = save.equippedSkinByHero?.[hero.id] ?? 'default';
  const skinDef = SKIN_MAP[activeSkinId];
  if (skinDef) {
    attack += skinDef.atkBonus;
    maxHp += skinDef.hpBonus;
  }

  const activeAuraId = save.equippedAuraId ?? 'zodiac_gold';
  const auraDef = AURA_MAP[activeAuraId];
  if (auraDef) {
    critChance += auraDef.critBonus;
  }

  // Apply Claimed Season Honor Medals & Mythic Badges
  const medalSet = new Set(save.seasonMedalsClaimed ?? []);
  for (const m of SEASON_MEDALS) {
    if (medalSet.has(m.id)) {
      attack += m.atkBonus;
      maxHp += m.hpBonus;
    }
  }
  const mythicBadgeSet = new Set(save.claimedMythicBadges ?? []);
  for (const bId of mythicBadgeSet) {
    const bDef = MYTHIC_BADGE_MAP[bId];
    if (bDef) {
      attack += bDef.atkBonus;
      maxHp += bDef.hpBonus;
      bossDamageBonus += bDef.bossDmgBonus;
    }
  }

  // Apply Equipped 3D Zodiac Wings
  const equippedWingId = save.equippedWingId ?? null;
  let wingLevel = 1;
  let wingAspd = 0;
  if (equippedWingId && (save.unlockedWings ?? []).includes(equippedWingId)) {
    wingLevel = Math.max(1, save.wingLevels?.[equippedWingId] ?? 1);
    const wStats = getWingStats(equippedWingId, wingLevel);
    attack += wStats.atk;
    maxHp += wStats.hp;
    critChance += wStats.crit;
    wingAspd = wStats.aspd;
  }

  // Apply Equipped 3D Zodiac Mount & Awakened Weapon Aura
  const equippedMountId =
    save.equippedMountId && (save.unlockedMounts ?? []).includes(save.equippedMountId)
      ? save.equippedMountId
      : null;
  let mountLevel = 1;
  if (equippedMountId) {
    mountLevel = Math.max(1, save.mountLevels?.[equippedMountId] ?? 1);
    const mStats = getMountStats(equippedMountId, mountLevel);
    attack += mStats.atk;
    maxHp += mStats.hp;
    moveSpeedMult += mStats.moveSpeed;
    damageReduction += mStats.dr;
  }

  const equippedWeaponAuraId =
    save.equippedWeaponAuraId && (save.unlockedWeaponAuras ?? ['none']).includes(save.equippedWeaponAuraId)
      ? save.equippedWeaponAuraId
      : 'none';
  const weaponAuraLevel = Math.max(1, save.weaponAuraLevels?.[equippedWeaponAuraId] ?? 1);
  const wAuraStats = getWeaponAuraStats(equippedWeaponAuraId, weaponAuraLevel);
  critDamage += wAuraStats.critDmg;

  // Apply Equipped 3D Mythic Artifact, Hero Bonds & Dynamic Title
  const equippedArtifactId =
    save.equippedArtifactId && (save.unlockedArtifacts ?? []).includes(save.equippedArtifactId)
      ? save.equippedArtifactId
      : null;
  let artifactLevel = 1;
  if (equippedArtifactId) {
    artifactLevel = Math.max(1, save.artifactLevels?.[equippedArtifactId] ?? 1);
    const artStats = getArtifactStats(equippedArtifactId, artifactLevel);
    attack += artStats.atk;
    maxHp += artStats.hp;
    critChance += artStats.crit;
    bossDamageBonus += artStats.bossDmg;
  }

  const bondBonuses = evaluateHeroBonds(save);
  critChance += bondBonuses.crit;
  critDamage += bondBonuses.critDmg;

  const equippedDynamicTitleId =
    save.equippedDynamicTitleId &&
    (save.unlockedDynamicTitles ?? ['none']).includes(save.equippedDynamicTitleId)
      ? save.equippedDynamicTitleId
      : 'none';
  const dynTitleDef = DYNAMIC_TITLE_MAP[equippedDynamicTitleId];
  if (dynTitleDef) {
    attack += dynTitleDef.bonusAtk;
    maxHp += dynTitleDef.bonusHp;
  }

  // Apply Equipped 3D Divine Halo (Wave 10)
  const equippedHaloId =
    save.equippedHaloId && (save.unlockedHalos ?? []).includes(save.equippedHaloId)
      ? save.equippedHaloId
      : null;
  let haloLevel = 1;
  if (equippedHaloId) {
    haloLevel = Math.max(1, save.haloLevels?.[equippedHaloId] ?? 1);
  }
  const haloStats = getDivineHaloStats(equippedHaloId, haloLevel);
  critDamage += haloStats.critDmg;

  // Apply Monthly Privilege Card & Wave 12 Supreme Monthly passive buffs
  const monthlyPriv = normalizeMonthlyPrivilege(save.monthlyPrivilege);
  const hasSilverCard = isMonthlyCardActive(monthlyPriv.silver);
  const hasRoyalCard = isMonthlyCardActive(monthlyPriv.royal);
  const hasSupremeCard = isSupremeMonthlyActive(save.supremeMonthly);
  const cardGoldBonus =
    (hasSilverCard ? 0.2 : 0) +
    (hasRoyalCard ? 0.35 : 0) +
    (hasSupremeCard ? SUPREME_MONTHLY_CONFIG.passiveGoldPct : 0);
  const cardAtkPct =
    (hasRoyalCard ? 0.08 : 0) + (hasSupremeCard ? SUPREME_MONTHLY_CONFIG.passiveAtkPct : 0);

  // Wave 12: Mythic Weapon Transcendence + Golden Reforge + Blessing Altar + 3D War Banner
  const mythicBonuses = getMythicWeaponBonuses(save.mythicWeapon);
  const altarBonuses = computeAltarBonuses(save.blessingAltar);
  const equippedWarBannerId =
    save.equippedWarBannerId && save.unlockedWarBanners?.includes(save.equippedWarBannerId)
      ? save.equippedWarBannerId
      : null;
  const warBannerLevel = equippedWarBannerId
    ? Math.max(1, save.warBannerLevels?.[equippedWarBannerId] ?? 1)
    : 0;
  const warBannerStats = getWarBannerStats(equippedWarBannerId, warBannerLevel);

  // Wave 13: Astral Steeds 3D, Multi-Tier Soul Rings & Animated VIP Frames
  const equippedAstralSteedId =
    save.equippedAstralSteedId &&
    (save.unlockedAstralSteeds ?? []).includes(save.equippedAstralSteedId)
      ? save.equippedAstralSteedId
      : null;
  const astralSteedStar = equippedAstralSteedId
    ? Math.max(1, save.astralSteedStars?.[equippedAstralSteedId] ?? 1)
    : 0;
  const steedStats = getAstralSteedStats(equippedAstralSteedId, astralSteedStar);
  const soulRingBonuses = computeSoulRingBonuses(save.soulRings);
  const vipFrameBonuses = computeVipFrameBonuses(save);

  // Wave 14: Celestial Wings 3D Evolution, Zodiac Relics, Guild 3D Sanctuary & Royal 3D Titles
  const equippedCelestialWingId =
    save.equippedCelestialWingId &&
    (save.unlockedCelestialWings ?? []).includes(save.equippedCelestialWingId)
      ? save.equippedCelestialWingId
      : null;
  const celestialWingStar = equippedCelestialWingId
    ? Math.max(1, save.celestialWingStars?.[equippedCelestialWingId] ?? 1)
    : 0;
  const celWingStats = getCelestialWingStats(equippedCelestialWingId, celestialWingStar);
  const zodiacRelicBonuses = computeZodiacRelicBonuses(save.zodiacRelics);
  const guildSanctuaryBonuses = computeGuildSanctuaryBonuses(save.guildSanctuary);
  const royal3DTitleBonuses = computeRoyal3DTitleBonuses(save);

  attack += vipFrameBonuses.atk + royal3DTitleBonuses.atk;
  maxHp += vipFrameBonuses.hp + royal3DTitleBonuses.hp;
  critDamage += mythicBonuses.critDmgBonus + soulRingBonuses.critDmg;
  bossDamageBonus +=
    mythicBonuses.bossDmgBonus +
    altarBonuses.bossDmgBonus +
    warBannerStats.bossDmg +
    soulRingBonuses.bossDmg +
    zodiacRelicBonuses.bossDmg +
    guildSanctuaryBonuses.bossDmg;

  // Apply Zodiac Guild Tech + 12 Constellations + Talents + Wave 11 Codex + Wave 12-14 Systems + Gear Set Bonuses + Hero Mastery
  const gearSets = evaluateEquippedGearSets(save);
  const heroMastery = computeHeroMasteryBonuses(save.heroMastery, hero.id);
  const guildTech = computeGuildTechBonuses(save.guild);
  const constellation = computeConstellationBonuses(save.constellations);
  const tal = computeTalentBonuses(save.talents);
  const codexSummary = computeCodexSummary(save);
  critDamage += gearSets.critDamage;
  bossDamageBonus += gearSets.bossDamageBonus + heroMastery.bossDamageBonus;
  attack = Math.round(
    (attack + tal.atk + constellation.atkFlat) *
      (1 +
        runeAtkPct +
        subAtkPct +
        gearSets.atkPct +
        heroMastery.atkPct +
        guildTech.atkPct +
        cardAtkPct +
        wAuraStats.atkPct +
        bondBonuses.atkPct +
        haloStats.atkPct +
        codexSummary.totalAtkPct +
        mythicBonuses.atkPct +
        altarBonuses.atkPct +
        warBannerStats.atkPct +
        steedStats.atkPct +
        soulRingBonuses.atkPct +
        celWingStats.atkPct +
        zodiacRelicBonuses.atkPct +
        guildSanctuaryBonuses.atkPct)
  );
  maxHp = Math.round(
    (maxHp + tal.hp + constellation.hpFlat) *
      (1 +
        runeHpPct +
        subHpPct +
        gearSets.hpPct +
        heroMastery.hpPct +
        guildTech.hpPct +
        bondBonuses.hpPct +
        haloStats.hpPct +
        codexSummary.totalHpPct +
        altarBonuses.hpPct +
        warBannerStats.hpPct +
        steedStats.hpPct +
        soulRingBonuses.hpPct +
        celWingStats.hpPct +
        zodiacRelicBonuses.hpPct +
        guildSanctuaryBonuses.hpPct)
  );
  critChance = Math.min(
    0.94,
    critChance +
      gearSets.critChance +
      heroMastery.critChance +
      tal.critChance +
      guildTech.critBonus +
      constellation.critBonus +
      codexSummary.totalCrit +
      mythicBonuses.critBonus +
      altarBonuses.critBonus +
      steedStats.crit +
      soulRingBonuses.crit +
      celWingStats.crit +
      zodiacRelicBonuses.crit +
      royal3DTitleBonuses.crit
  );
  attackSpeedMult +=
    gearSets.attackSpeed +
    tal.aspdMult +
    constellation.aspdBonus +
    wingAspd +
    mythicBonuses.aspdBonus +
    celWingStats.aspd;
  moveSpeedMult += gearSets.moveSpeed + tal.moveSpeedMult + steedStats.moveSpeed;
  damageReduction = Math.min(
    0.72,
    damageReduction + gearSets.damageReduction + tal.damageReduction + constellation.drBonus + haloStats.dr
  );
  const moveSpeed = 7.6 * moveSpeedMult;
  const goldGainMult =
    tal.goldGainMult +
    guildTech.goldPct +
    constellation.goldBonus +
    cardGoldBonus +
    codexSummary.totalGoldPct +
    altarBonuses.goldPct +
    zodiacRelicBonuses.goldPct +
    guildSanctuaryBonuses.goldPct;

  const powerRating = Math.round(
    attack * attackSpeedMult * (1 + critChance * 0.85) * 3.1 +
      maxHp * 0.36 +
      damageReduction * 420 +
      tal.stageHealPct * 600 +
      bossDamageBonus * 450 +
      gearSets.activeTierCount * 110 +
      heroMastery.cpBonus +
      constellation.totalStars * 18 +
      (equippedWingId ? wingLevel * 24 : 0) +
      (equippedMountId ? mountLevel * 32 : 0) +
      (equippedWeaponAuraId !== 'none' ? weaponAuraLevel * 26 : 0) +
      (equippedArtifactId ? artifactLevel * 38 : 0) +
      (equippedHaloId ? haloLevel * 45 : 0) +
      (equippedPetEvolved ? 140 : 0) +
      codexSummary.currentRank.rank * 65 +
      bondBonuses.activeCount * 85 +
      mythicBonuses.tier * 135 +
      altarBonuses.totalLevel * 24 +
      (equippedWarBannerId ? warBannerLevel * 68 : 0) +
      (equippedAstralSteedId ? astralSteedStar * 115 : 0) +
      soulRingBonuses.totalLevel * 48 +
      (save.unlockedVipFrames?.length ?? 0) * 65 +
      (equippedCelestialWingId ? celestialWingStar * 130 : 0) +
      zodiacRelicBonuses.totalStars * 75 +
      guildSanctuaryBonuses.totalLevel * 36 +
      (save.unlockedRoyal3DTitles?.length ?? 0) * 55
  );

  return {
    heroId: hero.id,
    heroName: hero.name,
    heroStar,
    weaponArchetype: hero.id === 'van_tich' ? 'staff' : weaponArchetype,
    attack,
    maxHp,
    critChance,
    critDamage,
    attackSpeedMult,
    moveSpeed,
    damageReduction,
    arrowSpeed,
    innatePierce,
    innateHoming,
    stageHealPct: tal.stageHealPct,
    goldGainMult,
    bossDamageBonus,
    powerRating,
    activeGearSets: gearSets.sets,
    heroMasteryLevel: heroMastery.level,
    heroMasteryBonusLabel: heroMastery.summaryLabel,
    equippedRunes,
    equippedPetId,
    petAtk,
    equippedPetEvolved,
    codexRankLevel: codexSummary.currentRank.rank,
    codexAtkPct: codexSummary.totalAtkPct,
    codexHpPct: codexSummary.totalHpPct,
    mythicWeaponTier: mythicBonuses.tier,
    equippedWarBannerId,
    warBannerLevel,
    altarTotalLevel: altarBonuses.totalLevel,
    lifeStealPct: mythicBonuses.lifeStealPct,
    constellationStars: constellation.totalStars,
    constellationFireBonus: constellation.fireDmgBonus,
    constellationIceBonus: constellation.iceDmgBonus,
    constellationStormBonus: constellation.stormDmgBonus,
    constellationLevels: constellation.levelsArray,
    equippedWingId,
    wingLevel,
    equippedMountId,
    mountLevel,
    equippedWeaponAuraId,
    weaponAuraLevel,
    equippedArtifactId,
    artifactLevel,
    activeBondCount: bondBonuses.activeCount,
    equippedHaloId,
    haloLevel,
  };
}

export function createInitialSaveData(): SaveData {
  const starterWeapon: GearInstance = {
    uid: 'starter_bow_1',
    templateId: 'rusty_bow',
    rarity: Rarity.COMMON,
    level: 1,
  };
  const starterArmor: GearInstance = {
    uid: 'starter_armor_1',
    templateId: 'cloth_vest',
    rarity: Rarity.COMMON,
    level: 1,
  };

  return {
    progressionSchemaVersion: PROGRESSION_SCHEMA_VERSION,
    claimedMailIds: [],
    deletedMailIds: [],
    earlyMilestonesClaimed: [],
    fairRoadmapClaimedIds: [],
    fairActiveDays: { count: 1, lastDate: getTodayKey() },
    earlyForgeProgress: {
      rareShards: 0,
      epicShards: 0,
      sTierBlueprints: 0,
    },
    gold: 40,
    gems: 0,
    starDust: 0,
    petEssence: 0,
    highestChapterCleared: 0,
    bestStagePerChapter: {},
    selectedHeroId: 'artemis',
    aliceDefaultMigrated: true,
    unlockedHeroes: ['artemis', 'alex'],
    heroStars: {
      artemis: 0,
      alex: 0,
      thor: 0,
      wukong: 0,
      cleo: 0,
      rolla: 0,
      atreus: 0,
      dracoola: 0,
      lisa: 0,
    },
    equipped: {
      [GearSlot.WEAPON]: starterWeapon.uid,
      [GearSlot.ARMOR]: starterArmor.uid,
    },
    inventory: [starterWeapon, starterArmor],
    equippedRunes: [],
    runeInventory: [],
    muted: false,
    talents: {},
    bestTowerFloor: 0,
    battlePass: {
      seasonId: 1,
      xp: 0,
      premiumUnlocked: false,
      claimedFree: [],
      claimedPremium: [],
    },
    pity: {
      mythicRollsSinceEpic: 0,
      mythicRollsSinceSTier: 0,
      runeRollsSinceEpic: 0,
    },
    career: {
      totalKills: 0,
      totalBossesKilled: 0,
      totalRuns: 0,
      maxComboEver: 0,
      totalChestsOpened: 0,
      seenEnemies: [],
      seenSkills: [],
    },
    achievementsClaimed: [],
    settings: { ...DEFAULT_SETTINGS },
    onboardingCompleted: false,
    equippedTitle: 'Tân Binh Tinh Giới',
    bestBossRushRound: 0,
    mailInbox: normalizeMailInbox(undefined, [], []),
    flashDeals: { date: getTodayKey(), purchasedIds: [] },
    dailySweeps: { date: getTodayKey(), remaining: MAX_DAILY_SWEEPS },
    runHistory: [],
    pets: [],
    equippedPetId: null,
    unlockedSkins: ['default'],
    equippedSkinByHero: {},
    unlockedAuras: ['zodiac_gold'],
    equippedAuraId: 'zodiac_gold',
    vip: {
      activeUntilDate: '',
      lastDailyClaimDate: '',
      starterPackClaimed: false,
    },
    dailyRift: {
      date: getTodayKey(),
      runsRemaining: MAX_DAILY_RIFT_RUNS,
      clearedToday: false,
    },
    guild: normalizeGuild(),
    destinyWheel: normalizeDestinyWheel(),
    seasonMedalsClaimed: [],
    socketGems: [],
    nightMarket: normalizeNightMarket(),
    arena: normalizeArena(),
    noviceJourney: normalizeNoviceJourney(),
    growthFund: normalizeGrowthFund(),
    arenaShop: normalizeArenaShop(),
    constellations: normalizeConstellations(),
    coopRaid: normalizeCoopRaid(),
    elementalTowers: normalizeElementalTowers(),
    commercialPackClaims: {},
    wingFeathers: 0,
    unlockedWings: [],
    wingLevels: {},
    equippedWingId: null,
    unlockedAvatarFrames: ['default_gold'],
    equippedAvatarFrameId: 'default_gold',
    claimedMythicBadges: [],
    equippedMythicBadgeId: null,
    monthlyPrivilege: normalizeMonthlyPrivilege(),
    topUpEvolution: normalizeTopUpEvolution(),
    auctionHouse: normalizeAuctionHouse(),
    crystalDefense: normalizeCrystalDefense(),
    worldBoss: normalizeWorldBoss(),
    mountShards: 0,
    awakeningCrystals: 0,
    wishTickets: 0,
    unlockedMounts: [],
    mountLevels: {},
    equippedMountId: null,
    unlockedWeaponAuras: ['none'],
    weaponAuraLevels: {},
    equippedWeaponAuraId: 'none',
    wishPool: normalizeWishPool(),
    firstTopUp: normalizeFirstTopUp(),
    claimedHotBundleIds: [],
    dispatch: normalizeDispatchState(),
    bloodMoon: normalizeBloodMoon(),
    artifactShards: 0,
    unlockedArtifacts: [],
    artifactLevels: {},
    equippedArtifactId: null,
    mysticExchange: normalizeMysticExchange(),
    abyssalGauntlet: normalizeAbyssalGauntlet(),
    guildWar: normalizeGuildWar(),
    unlockedDynamicTitles: ['none'],
    equippedDynamicTitleId: 'none',
    divineCrystals: 0,
    unlockedHalos: [],
    haloLevels: {},
    equippedHaloId: null,
    stepUpChain: normalizeStepUpChain(),
    gemRebateVault: normalizeGemRebateVault(),
    pantheonExpedition: normalizePantheonExpedition(),
    lobbySkyTheme: 'golden_galaxy',
    unlockedSkyThemes: ['golden_galaxy', 'dawn_sanctum'],
    spiritCores: 0,
    evolvedPets: [],
    festivalState: normalizeFestivalState(),
    codexClaimedRanks: [],
    championship: normalizeChampionshipState(),
    weekendPass: normalizeWeekendPrivilege(),
    honorFeed: [...DEFAULT_HONOR_FEED],
    reforgeStones: 0,
    mythicShards: 0,
    warCrests: 0,
    mythicWeapon: normalizeMythicWeapon(),
    treasureWheel: normalizeTreasureWheel(),
    supremeMonthly: normalizeSupremeMonthly(),
    blessingAltar: normalizeBlessingAltar(),
    unlockedWarBanners: [],
    warBannerLevels: {},
    equippedWarBannerId: null,
    crystalVault: normalizeCrystalVault(),
    lobbyHeroPose: 'heroic',
    // Wave 13 initial defaults (unlocked progressively via Chapter milestones)
    starlightGrass: 0,
    dragonScales: 0,
    blindBoxTickets: 0,
    unlockedAstralSteeds: [],
    astralSteedStars: {},
    equippedAstralSteedId: null,
    starlightRace: normalizeStarlightRace(),
    soulRings: normalizeSoulRings(),
    royalDutchAuction: normalizeRoyalDutchAuction(),
    royalBlindBox: normalizeRoyalBlindBox(),
    dragonLair: normalizeDragonLair(),
    lobbyWeather: 'meteor_shower',
    unlockedVipFrames: [],
    equippedVipFrameId: null,
    carnival7Day: normalizeCarnival7Day(),
    evolvingFirstTopUp: normalizeEvolvingFirstTopUp(),
    // Wave 14 initial defaults (Celestial Wing & Royal 3D Title earned at Ch.1 & Ch.2 clears)
    celestialFeathers: 0,
    unlockedCelestialWings: [],
    celestialWingStars: {},
    equippedCelestialWingId: null,
    skyCitadel: normalizeSkyCitadel(),
    astralBoard: normalizeAstralBoard(),
    zodiacRelics: normalizeZodiacRelics(),
    guildSanctuary: normalizeGuildSanctuary(),
    mythicShardShop: normalizeMythicShardShop(),
    sanctuaryFloorTheme: 'marble_gold',
    unlockedRoyal3DTitles: [],
    equippedRoyal3DTitleId: null,
    accountResetEpoch: ACCOUNT_RESET_EPOCH,
  };
}

export interface RollGearOptions {
  maxRarity?: Rarity;
  allowSTier?: boolean;
  rng?: () => number;
  preferredSlot?: GearSlot;
}

export function rollChestGear(
  isPremium: boolean,
  forceMinRarity?: Rarity,
  forceSTier?: boolean,
  options?: RollGearOptions
): GearInstance {
  const rng = options?.rng ?? Math.random;
  const allowSTier = options?.allowSTier ?? true;
  const effectiveForceSTier = Boolean(forceSTier && allowSTier);

  let eligibleTemplates = allowSTier
    ? ALL_TEMPLATE_LIST
    : ALL_TEMPLATE_LIST.filter((t) => !t.isSTier);

  if (options?.preferredSlot) {
    const slotFiltered = eligibleTemplates.filter((t) => t.slot === options.preferredSlot);
    if (slotFiltered.length > 0) {
      eligibleTemplates = slotFiltered;
    }
  }

  let pool = isPremium
    ? eligibleTemplates.filter((t) => t.isSTier || t.setName !== 'Khởi Đầu')
    : eligibleTemplates;
  if (pool.length === 0) {
    pool = eligibleTemplates;
  }
  if (effectiveForceSTier) {
    const sPool = eligibleTemplates.filter((t) => t.isSTier);
    if (sPool.length > 0) pool = sPool;
  }

  const template = pool[Math.floor(rng() * pool.length)];
  const r = rng();
  let rarity = Rarity.COMMON;
  if (isPremium) {
    if (r < 0.14) rarity = Rarity.LEGENDARY;
    else if (r < 0.48) rarity = Rarity.EPIC;
    else rarity = Rarity.RARE;
  } else {
    if (r < 0.06) rarity = Rarity.EPIC;
    else if (r < 0.38) rarity = Rarity.RARE;
    else rarity = Rarity.COMMON;
  }

  if (forceMinRarity) {
    const curIdx = RARITY_ORDER.indexOf(rarity);
    const minIdx = RARITY_ORDER.indexOf(forceMinRarity);
    if (curIdx < minIdx) rarity = forceMinRarity;
  }

  if (options?.maxRarity) {
    rarity = clampRarityToPolicy(rarity, options.maxRarity);
  }

  const gear: GearInstance = {
    uid: `gear_${Date.now()}_${Math.floor(rng() * 1e9).toString(36)}`,
    templateId: template.templateId,
    rarity,
    level: 1,
    awakeningLevel: 0,
  };
  gear.substats = reforgeItemSubstats(gear, []);
  return gear;
}

export function rollProgressionGatedGear(
  save: Pick<SaveData, 'highestChapterCleared' | 'bestStagePerChapter'>,
  isPremium: boolean,
  forceMinRarity?: Rarity,
  forceSTier?: boolean,
  rng?: () => number,
  preferredSlot?: GearSlot
): GearInstance {
  const policy = getEarlyProgressionPolicy(save);
  return rollChestGear(isPremium, forceMinRarity, forceSTier, {
    maxRarity: policy.maxGearRarity,
    allowSTier: policy.allowSTier,
    rng,
    preferredSlot,
  });
}

export function rollChestGearBatch(
  isPremium: boolean,
  count: number,
  currentPity?: Partial<PityState>,
  options?: { policy?: EarlyProgressionPolicy; rng?: () => number }
): { items: GearInstance[]; nextPity: PityState } {
  const pity = normalizePity(currentPity);
  const items: GearInstance[] = [];
  let hasRarePlus = false;
  const policy = options?.policy;
  const maxRarity = policy?.maxGearRarity;
  const allowSTier = policy ? policy.allowSTier : true;
  const canRollEpic = !maxRarity || RARITY_RANK[maxRarity] >= RARITY_RANK[Rarity.EPIC];
  const canRollRare = !maxRarity || RARITY_RANK[maxRarity] >= RARITY_RANK[Rarity.RARE];

  for (let i = 0; i < count; i++) {
    if (isPremium) {
      const needSTier = allowSTier && pity.mythicRollsSinceSTier >= 24;
      const needEpic = canRollEpic && pity.mythicRollsSinceEpic >= 9;
      const item = rollChestGear(
        true,
        needEpic ? Rarity.EPIC : undefined,
        needSTier,
        { maxRarity, allowSTier, rng: options?.rng }
      );
      const tpl = GEAR_TEMPLATES[item.templateId];

      // Preserve pity progress when Epic or S-Tier pool is still locked:
      // never reset pity before the pool opens, capping at threshold - 1 so the very first roll
      // after unlocking immediately honors accumulated pity.
      if (canRollEpic) {
        if (
          item.rarity === Rarity.EPIC ||
          item.rarity === Rarity.LEGENDARY ||
          item.rarity === Rarity.MYTHIC
        ) {
          pity.mythicRollsSinceEpic = 0;
        } else {
          pity.mythicRollsSinceEpic++;
        }
      } else {
        pity.mythicRollsSinceEpic = Math.min(9, pity.mythicRollsSinceEpic + 1);
      }

      if (allowSTier) {
        if (tpl?.isSTier) {
          pity.mythicRollsSinceSTier = 0;
        } else {
          pity.mythicRollsSinceSTier++;
        }
      } else {
        pity.mythicRollsSinceSTier = Math.min(24, pity.mythicRollsSinceSTier + 1);
      }

      items.push(item);
    } else {
      const forceRare = canRollRare && count >= 10 && i === count - 1 && !hasRarePlus;
      const item = rollChestGear(false, forceRare ? Rarity.RARE : undefined, false, {
        maxRarity,
        allowSTier,
        rng: options?.rng,
      });
      if (item.rarity !== Rarity.COMMON) hasRarePlus = true;
      items.push(item);
    }
  }

  return { items, nextPity: pity };
}

export function craftEarlyTargetGear(
  save: SaveData,
  tier: 'rare' | 'epic' | 's_tier',
  rng?: () => number,
  targetSlot?: GearSlot
): { ok: boolean; reason?: string; item?: GearInstance; nextSave?: SaveData } {
  const fp = normalizeEarlyForgeProgress(save.earlyForgeProgress);
  const ch = Math.max(0, Math.floor(save.highestChapterCleared ?? 0));
  const st1 = getBestCh1Stage(save);

  if (tier === 'rare') {
    if (ch < 1 && st1 < 4) {
      return { ok: false, reason: 'Cần vượt Phụ Boss Ares (Ải 4 Ch.1) để chế tạo Trang Bị Hiếm.' };
    }
    if (fp.rareShards < EARLY_FORGE_COSTS.rareShards) {
      return {
        ok: false,
        reason: `Cần ${EARLY_FORGE_COSTS.rareShards} Mảnh Hiếm (hiện có ${fp.rareShards}).`,
      };
    }
    const hasRareWeapon = save.inventory.some(
      (g) => GEAR_TEMPLATES[g.templateId]?.slot === GearSlot.WEAPON && RARITY_RANK[g.rarity] >= RARITY_RANK[Rarity.RARE]
    );
    const chosenSlot = targetSlot ?? (hasRareWeapon ? undefined : GearSlot.WEAPON);
    const item = rollChestGear(true, Rarity.RARE, false, {
      maxRarity: Rarity.RARE,
      allowSTier: false,
      rng,
      preferredSlot: chosenSlot,
    });
    return {
      ok: true,
      item,
      nextSave: {
        ...save,
        earlyForgeProgress: { ...fp, rareShards: fp.rareShards - EARLY_FORGE_COSTS.rareShards },
        inventory: [...save.inventory, item],
      },
    };
  }

  if (tier === 'epic') {
    if (ch < 1) {
      return { ok: false, reason: 'Cần vượt Chương 1 để chế tạo Trang Bị Sử Thi.' };
    }
    if (fp.epicShards < EARLY_FORGE_COSTS.epicShards) {
      return {
        ok: false,
        reason: `Cần ${EARLY_FORGE_COSTS.epicShards} Mảnh Sử Thi (hiện có ${fp.epicShards}).`,
      };
    }
    const hasEpicWeapon = save.inventory.some(
      (g) => GEAR_TEMPLATES[g.templateId]?.slot === GearSlot.WEAPON && RARITY_RANK[g.rarity] >= RARITY_RANK[Rarity.EPIC]
    );
    const chosenSlot = targetSlot ?? (hasEpicWeapon ? undefined : GearSlot.WEAPON);
    const item = rollChestGear(true, Rarity.EPIC, false, {
      maxRarity: Rarity.EPIC,
      allowSTier: false,
      rng,
      preferredSlot: chosenSlot,
    });
    return {
      ok: true,
      item,
      nextSave: {
        ...save,
        earlyForgeProgress: { ...fp, epicShards: fp.epicShards - EARLY_FORGE_COSTS.epicShards },
        inventory: [...save.inventory, item],
      },
    };
  }

  // tier === 's_tier'
  const policy = getEarlyProgressionPolicy(save);
  if (!policy.allowSTier) {
    return { ok: false, reason: 'Cần vượt Chương 3 (mở Chương 4) để chế tạo Trang Bị [S].' };
  }
  if (fp.sTierBlueprints < EARLY_FORGE_COSTS.sTierBlueprints) {
    return {
      ok: false,
      reason: `Cần ${EARLY_FORGE_COSTS.sTierBlueprints} Bản Vẽ [S] (hiện có ${fp.sTierBlueprints}).`,
    };
  }
  const hasSWeapon = save.inventory.some(
    (g) => GEAR_TEMPLATES[g.templateId]?.slot === GearSlot.WEAPON && GEAR_TEMPLATES[g.templateId]?.isSTier
  );
  const chosenSlot = targetSlot ?? (hasSWeapon ? undefined : GearSlot.WEAPON);
  const item = rollChestGear(true, Rarity.EPIC, true, {
    maxRarity: policy.maxGearRarity,
    allowSTier: true,
    rng,
    preferredSlot: chosenSlot,
  });
  return {
    ok: true,
    item,
    nextSave: {
      ...save,
      earlyForgeProgress: {
        ...fp,
        sTierBlueprints: fp.sTierBlueprints - EARLY_FORGE_COSTS.sTierBlueprints,
      },
      inventory: [...save.inventory, item],
    },
  };
}

export interface ExcessSalvageResult {
  salvagedCount: number;
  rareShardsGained: number;
  epicShardsGained: number;
  starDustGained: number;
  goldGained: number;
  nextSave: SaveData;
}

/**
 * Wave 5 Pillar 3 (Fair Progression): Safely converts unequipped surplus Common/Rare
 * gear directly into Target-Slot Forge Shards + StarDust + Gold.
 * Strictly protects all equipped items, Epic+, Legendary, and Mythic gear.
 */
export function salvageExcessGearToForgeShards(
  save: SaveData,
  options?: { includeRare?: boolean }
): ExcessSalvageResult {
  const includeRare = options?.includeRare ?? true;
  const equippedSet = new Set(Object.values(save.equipped).filter(Boolean) as string[]);
  const kept: GearInstance[] = [];
  let salvagedCount = 0;
  let rareShardsGained = 0;
  let epicShardsGained = 0;
  let starDustGained = 0;
  let goldGained = 0;

  for (const item of save.inventory) {
    const isEquipped = equippedSet.has(item.uid);
    const tpl = GEAR_TEMPLATES[item.templateId];
    const isSTier = Boolean(tpl?.isSTier);
    const canSalvage =
      !isEquipped &&
      !isSTier &&
      (item.rarity === Rarity.COMMON || (includeRare && item.rarity === Rarity.RARE));

    if (!canSalvage) {
      kept.push(item);
      continue;
    }

    salvagedCount += 1;
    if (item.rarity === Rarity.COMMON) {
      rareShardsGained += 2;
      starDustGained += 10;
      goldGained += 80 + Math.max(0, item.level - 1) * 25;
    } else {
      rareShardsGained += 3;
      epicShardsGained += 1;
      starDustGained += 25;
      goldGained += 220 + Math.max(0, item.level - 1) * 45;
    }
  }

  if (salvagedCount === 0) {
    return {
      salvagedCount: 0,
      rareShardsGained: 0,
      epicShardsGained: 0,
      starDustGained: 0,
      goldGained: 0,
      nextSave: save,
    };
  }

  const fp = normalizeEarlyForgeProgress(save.earlyForgeProgress);
  return {
    salvagedCount,
    rareShardsGained,
    epicShardsGained,
    starDustGained,
    goldGained,
    nextSave: {
      ...save,
      gold: save.gold + goldGained,
      starDust: (save.starDust ?? 0) + starDustGained,
      inventory: kept,
      earlyForgeProgress: {
        ...fp,
        rareShards: fp.rareShards + rareShardsGained,
        epicShards: fp.epicShards + epicShardsGained,
      },
    },
  };
}

export interface AutoOptimizeLoadoutResult {
  goal: 'campaign' | 'boss' | 'arena';
  changedSlots: GearSlot[];
  beforePower: number;
  afterPower: number;
  powerDelta: number;
  nextEquipped: Partial<Record<GearSlot, string>>;
  nextSave: SaveData;
}

/**
 * Wave 6 Pillar 3 (Fair Progression): 1-Click Auto-Optimize across all 6 GearSlots
 * for Campaign, Boss Hunt, or 1v1 Arena without ever modifying or deleting items.
 */
export function computeAutoOptimizeEquipment(
  save: SaveData,
  goal: 'campaign' | 'boss' | 'arena' = 'campaign'
): AutoOptimizeLoadoutResult {
  const beforePower = computePlayerStats(save).powerRating;
  const nextEquipped: Partial<Record<GearSlot, string>> = { ...save.equipped };
  const changedSlots: GearSlot[] = [];

  for (const slot of Object.values(GearSlot)) {
    const candidates = save.inventory.filter((item) => GEAR_TEMPLATES[item.templateId]?.slot === slot);
    if (candidates.length === 0) continue;

    let bestItem = candidates[0];
    let bestScore = -1;
    for (const item of candidates) {
      const tpl = GEAR_TEMPLATES[item.templateId];
      if (!tpl) continue;
      const sc = scoreGearForGoal(
        item,
        goal,
        Boolean(tpl.isSTier),
        tpl.baseAtk,
        tpl.baseHp,
        tpl.baseCritChance,
        tpl.baseDamageReduction
      );
      if (sc > bestScore) {
        bestScore = sc;
        bestItem = item;
      }
    }

    if (bestItem && nextEquipped[slot] !== bestItem.uid) {
      nextEquipped[slot] = bestItem.uid;
      changedSlots.push(slot);
    }
  }

  const nextSave: SaveData =
    changedSlots.length > 0 ? { ...save, equipped: nextEquipped } : save;
  const afterPower = computePlayerStats(nextSave).powerRating;

  return {
    goal,
    changedSlots,
    beforePower,
    afterPower,
    powerDelta: afterPower - beforePower,
    nextEquipped,
    nextSave,
  };
}

export function previewPresetPowerDelta(
  save: SaveData,
  presetEquipped: Partial<Record<GearSlot, string>>,
  presetHeroId: SaveData['selectedHeroId'],
  presetRunes: string[]
): { presetPower: number; currentPower: number; delta: number } {
  const currentPower = computePlayerStats(save).powerRating;
  const validInventory = new Set(save.inventory.map((g) => g.uid));
  const sanitizedEquipped: Partial<Record<GearSlot, string>> = { ...save.equipped };
  for (const [slot, uid] of Object.entries(presetEquipped) as Array<[GearSlot, string | undefined]>) {
    if (uid && validInventory.has(uid)) {
      sanitizedEquipped[slot] = uid;
    }
  }
  const validRunes = new Set(save.runeInventory.map((r) => r.uid));
  const sanitizedRunes = presetRunes.filter((uid) => validRunes.has(uid));
  const simSave: SaveData = {
    ...save,
    selectedHeroId: save.unlockedHeroes.includes(presetHeroId) ? presetHeroId : save.selectedHeroId,
    equipped: sanitizedEquipped,
    equippedRunes: sanitizedRunes.length > 0 ? sanitizedRunes : save.equippedRunes,
  };
  const presetPower = computePlayerStats(simSave).powerRating;
  return {
    presetPower,
    currentPower,
    delta: presetPower - currentPower,
  };
}

/**
 * Wave 7 Pillar 3 (Fair Progression): Finds the highest-level same-slot item that can freely
 * donate its enhancement level to `targetUid` (0 Gold, 0 Gem loss, neither item destroyed).
 */
export function findBestUpgradeTransferSource(
  save: SaveData,
  targetUid: string
): GearInstance | null {
  const target = save.inventory.find((g) => g.uid === targetUid);
  if (!target) return null;
  const targetTpl = GEAR_TEMPLATES[target.templateId];
  if (!targetTpl) return null;

  let best: GearInstance | null = null;
  for (const item of save.inventory) {
    if (item.uid === target.uid) continue;
    const tpl = GEAR_TEMPLATES[item.templateId];
    if (!tpl || tpl.slot !== targetTpl.slot) continue;
    if (item.level <= target.level) continue;
    if (!best || item.level > best.level) {
      best = item;
    }
  }
  return best;
}

/**
 * Wave 7 Pillar 3 (Fair Progression): 100% Free Gear Upgrade Level Swap/Transfer.
 * Transfers the higher enhancement level from `sourceUid` to `targetUid` (swapping levels)
 * with zero currency loss and zero item destruction.
 */
export function transferGearUpgradeLevel(
  save: SaveData,
  sourceUid: string,
  targetUid: string
): {
  ok: boolean;
  reason?: string;
  sourceUid: string;
  targetUid: string;
  previousTargetLevel: number;
  nextTargetLevel: number;
  powerDelta: number;
  nextSave: SaveData;
} {
  if (sourceUid === targetUid) {
    return {
      ok: false,
      reason: 'Không thể kế thừa lên chính trang bị hiện tại.',
      sourceUid,
      targetUid,
      previousTargetLevel: 1,
      nextTargetLevel: 1,
      powerDelta: 0,
      nextSave: save,
    };
  }
  const sourceIdx = save.inventory.findIndex((g) => g.uid === sourceUid);
  const targetIdx = save.inventory.findIndex((g) => g.uid === targetUid);
  if (sourceIdx === -1 || targetIdx === -1) {
    return {
      ok: false,
      reason: 'Không tìm thấy trang bị nguồn hoặc đích.',
      sourceUid,
      targetUid,
      previousTargetLevel: 1,
      nextTargetLevel: 1,
      powerDelta: 0,
      nextSave: save,
    };
  }

  const source = save.inventory[sourceIdx];
  const target = save.inventory[targetIdx];
  const srcTpl = GEAR_TEMPLATES[source.templateId];
  const tgtTpl = GEAR_TEMPLATES[target.templateId];
  if (!srcTpl || !tgtTpl || srcTpl.slot !== tgtTpl.slot) {
    return {
      ok: false,
      reason: 'Chỉ có thể kế thừa cường hóa giữa 2 trang bị cùng ô.',
      sourceUid,
      targetUid,
      previousTargetLevel: target.level,
      nextTargetLevel: target.level,
      powerDelta: 0,
      nextSave: save,
    };
  }

  if (source.level <= target.level) {
    return {
      ok: false,
      reason: 'Trang bị nguồn cần có cấp cường hóa cao hơn trang bị đích.',
      sourceUid,
      targetUid,
      previousTargetLevel: target.level,
      nextTargetLevel: target.level,
      powerDelta: 0,
      nextSave: save,
    };
  }

  const beforePower = computePlayerStats(save).powerRating;
  const nextInventory = [...save.inventory];
  nextInventory[sourceIdx] = { ...source, level: target.level };
  nextInventory[targetIdx] = { ...target, level: source.level };
  const nextSave: SaveData = {
    ...save,
    inventory: nextInventory,
  };
  const afterPower = computePlayerStats(nextSave).powerRating;

  return {
    ok: true,
    sourceUid,
    targetUid,
    previousTargetLevel: target.level,
    nextTargetLevel: source.level,
    powerDelta: afterPower - beforePower,
    nextSave,
  };
}


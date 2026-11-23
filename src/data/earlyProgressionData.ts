import { DEFAULT_HERO_ID, isPlayableHeroId, normalizePlayableHeroId } from './heroesData';
import { grantChapter2Collection } from './chapter2Collection';
import { normalizeChapterEquipmentPresets } from './chapterEquipmentSets';
import {
  ComputedPlayerStats,
  EarlyFeatureId,
  EarlyForgeProgress,
  EndlessTowerFloorScaling,
  GearInstance,
  GearSlot,
  HeroId,
  HeroMasteryBonuses,
  HeroMasteryProgress,
  KpiEvaluationRow,
  LoadoutPreset,
  LoadoutPresetSlotId,
  MailItem,
  PlaytestKpiContext,
  PlaytestMetrics,
  Rarity,
  RuneId,
  SaveData,
  SideModeScaling,
  SkillSynergyId,
} from '../types/game';

export const PROGRESSION_SCHEMA_VERSION = 3;
export const PUNISH_WINDOW_DAMAGE_BONUS = 0.18;
export const PUNISH_WINDOW_PHASE3_BONUS = 0.24;

export const RARITY_RANK: Record<Rarity, number> = {
  [Rarity.COMMON]: 0,
  [Rarity.RARE]: 1,
  [Rarity.EPIC]: 2,
  [Rarity.LEGENDARY]: 3,
  [Rarity.MYTHIC]: 4,
};

export const EARLY_FORGE_COSTS = {
  rareShards: 12,
  epicShards: 20,
  sTierBlueprints: 30,
} as const;

export const SYSTEM_MAIL_TEMPLATES: Omit<MailItem, 'claimed'>[] = [
  {
    id: 'mail_grand_launch',
    title: 'Thư Tiếp Tế Tân Binh Tinh Giới',
    sender: 'Hội Đồng Hoàng Đạo',
    body: 'Chào mừng Chiến Binh bước vào Thánh Điện Nhật Luân! Nhận gói tiếp tế khởi hành để cường hóa vũ khí sau những phòng đầu tiên.',
    date: 'Mùa 1 · Khởi Nguyên',
    rewardGold: 25,
    rewardGems: 10,
    minChapterCleared: 0,
    minCh1Stage: 0,
  },
  {
    id: 'mail_boss_rush_open',
    title: 'Thưởng Vượt Phụ Boss Ares (Ải 4)',
    sender: 'Đấu Trường Nhật Thực',
    body: 'Chúc mừng bạn vượt qua Phụ Boss đầu tiên! Dùng Vàng và Ngọc Hồn này để thử vận may Rương Thần Thoại bậc Hiếm.',
    date: 'Mốc Ải 4 · Chương 1',
    rewardGold: 120,
    rewardGems: 20,
    minChapterCleared: 0,
    minCh1Stage: 4,
  },
  {
    id: 'mail_season1_celebration',
    title: 'Chiến Công Chinh Phục Chương 1',
    sender: 'Thủ Thư Tinh Tú',
    body: 'Bạn đã đánh bại Sư Vương Thái Dương! Nhận ngay phần thưởng Sử Thi đầu tiên và chuẩn bị tiến vào Hỏa Sơn Chương 2.',
    date: 'Mốc Vượt Chương 1',
    rewardGold: 220,
    rewardGems: 25,
    bonusGearRarity: Rarity.EPIC,
    bonusSTier: false,
    minChapterCleared: 1,
    minCh1Stage: 12,
  },
];

export interface EarlyProgressionPolicy {
  highestChapterCleared: number;
  bestCh1Stage: number;
  maxGearRarity: Rarity;
  allowSTier: boolean;
  maxRuneRarity: Rarity;
  stageLabel: string;
}

export function getBestCh1Stage(save: Pick<SaveData, 'highestChapterCleared' | 'bestStagePerChapter'>): number {
  if ((save.highestChapterCleared ?? 0) >= 1) return 12;
  return Math.max(0, Math.floor(save.bestStagePerChapter?.[1] ?? 0));
}

export function getEarlyProgressionPolicy(
  save: Pick<SaveData, 'highestChapterCleared' | 'bestStagePerChapter'>
): EarlyProgressionPolicy {
  const highestChapterCleared = Math.max(0, Math.floor(save.highestChapterCleared ?? 0));
  const bestCh1Stage = getBestCh1Stage(save);

  if (highestChapterCleared >= 8) {
    return {
      highestChapterCleared,
      bestCh1Stage,
      maxGearRarity: Rarity.MYTHIC,
      allowSTier: true,
      maxRuneRarity: Rarity.LEGENDARY,
      stageLabel: 'Chương 9–12 · Mở Khóa Thần Thoại (Mythic) & Đỉnh Cao [S]',
    };
  }
  if (highestChapterCleared >= 4) {
    return {
      highestChapterCleared,
      bestCh1Stage,
      maxGearRarity: Rarity.LEGENDARY,
      allowSTier: true,
      maxRuneRarity: Rarity.LEGENDARY,
      stageLabel: 'Chương 5–8 · Mở Khóa Huyền Thoại (Legendary) & Mẫu [S]',
    };
  }
  if (highestChapterCleared >= 3) {
    return {
      highestChapterCleared,
      bestCh1Stage,
      maxGearRarity: Rarity.EPIC,
      allowSTier: true,
      maxRuneRarity: Rarity.EPIC,
      stageLabel: 'Chương 4 · Mở Khóa Mẫu [S] Bậc Sử Thi',
    };
  }
  if (highestChapterCleared >= 1) {
    return {
      highestChapterCleared,
      bestCh1Stage,
      maxGearRarity: Rarity.EPIC,
      allowSTier: false,
      maxRuneRarity: Rarity.EPIC,
      stageLabel: 'Chương 2–3 · Mở Khóa Sử Thi (Epic)',
    };
  }
  if (bestCh1Stage >= 4) {
    return {
      highestChapterCleared,
      bestCh1Stage,
      maxGearRarity: Rarity.RARE,
      allowSTier: false,
      maxRuneRarity: Rarity.RARE,
      stageLabel: 'Giữa Chương 1 · Mở Khóa Hiếm (Rare)',
    };
  }
  return {
    highestChapterCleared,
    bestCh1Stage,
    maxGearRarity: Rarity.COMMON,
    allowSTier: false,
    maxRuneRarity: Rarity.COMMON,
    stageLabel: 'Khởi Đầu Chương 1 · Trần Thường (Common)',
  };
}

export function clampRarityToPolicy(rarity: Rarity, maxRarity: Rarity): Rarity {
  return RARITY_RANK[rarity] > RARITY_RANK[maxRarity] ? maxRarity : rarity;
}

export interface FeatureUnlockStatus {
  unlocked: boolean;
  minChapterCleared: number;
  minCh1Stage: number;
  requiredLabel: string;
}

export function isEarlyFeatureUnlocked(
  save: Pick<SaveData, 'highestChapterCleared' | 'bestStagePerChapter'>,
  feature: EarlyFeatureId
): FeatureUnlockStatus {
  const ch = Math.max(0, Math.floor(save.highestChapterCleared ?? 0));
  const st1 = getBestCh1Stage(save);

  switch (feature) {
    case 'mail':
    case 'welcome_gift':
    case 'daily_quests':
      return { unlocked: true, minChapterCleared: 0, minCh1Stage: 0, requiredLabel: 'Mở từ đầu' };
    case 'iron_chest':
    case 'talents':
      return {
        unlocked: ch >= 1 || st1 >= 2,
        minChapterCleared: 0,
        minCh1Stage: 2,
        requiredLabel: 'Mở sau Ải 2 Chương 1',
      };
    case 'mythic_chest':
    case 'hero_star':
    case 'flash_deals':
    case 'battle_pass':
    case 'forge':
      return {
        unlocked: ch >= 1 || st1 >= 4,
        minChapterCleared: 0,
        minCh1Stage: 4,
        requiredLabel: 'Mở sau Phụ Boss Ares (Ải 4 Ch.1)',
      };
    case 'sweep':
    case 'runes':
    case 'daily_rift':
    case 'endless_tower':
      return {
        unlocked: ch >= 1,
        minChapterCleared: 1,
        minCh1Stage: 12,
        requiredLabel: 'Mở sau khi vượt Chương 1',
      };
    case 'arena':
    case 'meta_events':
      return {
        unlocked: ch >= 2,
        minChapterCleared: 2,
        minCh1Stage: 12,
        requiredLabel: 'Mở khi vào Chương 3 (Vượt Chương 2)',
      };
    case 'starter_pack':
    case 'late_modes':
    case 'coop_raid':
      return {
        unlocked: ch >= 3,
        minChapterCleared: 3,
        minCh1Stage: 12,
        requiredLabel: 'Mở khi vào Chương 4 (Vượt Chương 3)',
      };
    case 'elemental_towers':
      return {
        unlocked: ch >= 4,
        minChapterCleared: 4,
        minCh1Stage: 12,
        requiredLabel: 'Mở khi vào Chương 5 (Vượt Chương 4)',
      };
    case 'world_boss':
    case 'crystal_defense':
      return {
        unlocked: ch >= 5,
        minChapterCleared: 5,
        minCh1Stage: 12,
        requiredLabel: 'Mở khi vào Chương 6 (Vượt Chương 5)',
      };
    case 'blood_moon':
      return {
        unlocked: ch >= 6,
        minChapterCleared: 6,
        minCh1Stage: 12,
        requiredLabel: 'Mở khi vào Chương 7 (Vượt Chương 6)',
      };
    case 'abyssal_gauntlet':
      return {
        unlocked: ch >= 7,
        minChapterCleared: 7,
        minCh1Stage: 12,
        requiredLabel: 'Mở khi vào Chương 8 (Vượt Chương 7)',
      };
    case 'pantheon_expedition':
    case 'dragon_lair':
      return {
        unlocked: ch >= 8,
        minChapterCleared: 8,
        minCh1Stage: 12,
        requiredLabel: 'Mở khi vào Chương 9 (Vượt Chương 8)',
      };
    case 'crystal_vault':
      return {
        unlocked: ch >= 9,
        minChapterCleared: 9,
        minCh1Stage: 12,
        requiredLabel: 'Mở khi vào Chương 10 (Vượt Chương 9)',
      };
    case 'sky_citadel':
      return {
        unlocked: ch >= 10,
        minChapterCleared: 10,
        minCh1Stage: 12,
        requiredLabel: 'Mở khi vào Chương 11 (Vượt Chương 10)',
      };
  }
}

export function normalizeEarlyForgeProgress(fp?: Partial<EarlyForgeProgress>): EarlyForgeProgress {
  return {
    rareShards: Math.max(0, Math.floor(fp?.rareShards ?? 0)),
    epicShards: Math.max(0, Math.floor(fp?.epicShards ?? 0)),
    sTierBlueprints: Math.max(0, Math.floor(fp?.sTierBlueprints ?? 0)),
  };
}

// ============================================================================
// PERSISTENT MAIL CLAIM LEDGER & LEGACY MIGRATION (SINGLE SOURCE OF TRUTH)
// ============================================================================

export function isMailEligibleByProgression(
  save: Pick<SaveData, 'highestChapterCleared' | 'bestStagePerChapter'>,
  mail: Pick<MailItem, 'minChapterCleared' | 'minCh1Stage'>
): boolean {
  const ch = Math.max(0, Math.floor(save.highestChapterCleared ?? 0));
  const st1 = getBestCh1Stage(save);
  const reqCh = mail.minChapterCleared ?? 0;
  const reqSt1 = mail.minCh1Stage ?? 0;
  if (ch >= reqCh && reqCh > 0) return true;
  if (reqCh > 0 && ch < reqCh) return false;
  return st1 >= reqSt1;
}

export function migrateSaveData(raw: SaveData): SaveData {
  // Always ensure array integrity without removing any legacy player assets!
  const isLegacy = !raw.progressionSchemaVersion || raw.progressionSchemaVersion < PROGRESSION_SCHEMA_VERSION;
  const existingClaimed = new Set<string>(Array.isArray(raw.claimedMailIds) ? raw.claimedMailIds : []);
  const existingDeleted = new Set<string>(Array.isArray(raw.deletedMailIds) ? raw.deletedMailIds : []);

  if (Array.isArray(raw.mailInbox)) {
    const inboxIds = new Set(raw.mailInbox.map((m) => m.id));
    for (const m of raw.mailInbox) {
      if (m.claimed) {
        existingClaimed.add(m.id);
      }
    }
    if (isLegacy) {
      // Legacy Policy (User Confirmed):
      // If a legacy save has a mailInbox array, any SYSTEM_MAIL_TEMPLATES entry missing from it
      // was previously deleted by the player -> mark as BOTH claimed & deleted so it never respawns or re-grants!
      for (const tpl of SYSTEM_MAIL_TEMPLATES) {
        if (!inboxIds.has(tpl.id)) {
          existingClaimed.add(tpl.id);
          existingDeleted.add(tpl.id);
        }
      }
    }
  } else if (isLegacy) {
    // Super-old legacy save with no mailInbox field at all: if it already progressed past Ch.1 or has >6 items,
    // mark legacy launch/celebration mails claimed to prevent retroactive double-granting.
    const hasLegacyProgress =
      (raw.highestChapterCleared ?? 0) > 0 ||
      (raw.career?.totalRuns ?? 0) > 0 ||
      (raw.inventory?.length ?? 0) > 6;
    if (hasLegacyProgress) {
      for (const tpl of SYSTEM_MAIL_TEMPLATES) {
        existingClaimed.add(tpl.id);
        existingDeleted.add(tpl.id);
      }
    }
  }

  const hasClearedAries = (raw.highestChapterCleared ?? 0) >= 2;
  const normalizedUnlockedHeroes: HeroId[] = hasClearedAries ? [DEFAULT_HERO_ID, 'bellona'] : [DEFAULT_HERO_ID];
  const resolvedHeroId = isPlayableHeroId(raw.selectedHeroId) && normalizedUnlockedHeroes.includes(raw.selectedHeroId)
    ? raw.selectedHeroId
    : DEFAULT_HERO_ID;
  const normalizedHeroStars: Partial<Record<HeroId, number>> = {
    aurelia: Math.max(0, Math.floor(raw.heroStars?.aurelia ?? 0)),
    ...(hasClearedAries ? { bellona: Math.max(0, Math.floor(raw.heroStars?.bellona ?? 0)) } : {}),
  };

  // Unlock all 4 Aurelia Solar Leo skins while validating equippedSkinByHero.
  const SOLAR_LEO_SKINS: NonNullable<SaveData['unlockedSkins']> = [
    'aurelia_oasis_dancer',
    'aurelia_temple_commander',
    'aurelia_solaris_valkyrie',
    'aurelia_winter_solstice',
  ];
  const validSkinSet = new Set<string>(['default', ...SOLAR_LEO_SKINS]);
  if (hasClearedAries) validSkinSet.add('golden_fleece');
  const normalizedUnlockedSkins = Array.from(
    new Set([
      ...SOLAR_LEO_SKINS,
      ...(Array.isArray(raw.unlockedSkins)
        ? raw.unlockedSkins.filter((id) => validSkinSet.has(id) && id !== 'default')
        : []),
    ])
  ) as NonNullable<SaveData['unlockedSkins']>;
  const rawEquippedSkins = raw.equippedSkinByHero ?? {};
  const normalizedEquippedSkinByHero: NonNullable<SaveData['equippedSkinByHero']> = {};
  if (rawEquippedSkins.aurelia && validSkinSet.has(rawEquippedSkins.aurelia)) {
    normalizedEquippedSkinByHero.aurelia = rawEquippedSkins.aurelia;
  }

  if (hasClearedAries && rawEquippedSkins.bellona === 'golden_fleece') {
    normalizedEquippedSkinByHero.bellona = 'golden_fleece';
  }

  // Keep Solarius ('solarius') mount; safely migrate legacy Hắc Long saves to Solarius.
  const normalizedUnlockedMounts: NonNullable<SaveData['unlockedMounts']> = ['solarius'];
  const migratedSolariusLv = Math.max(
    1,
    Math.floor(raw.mountLevels?.solarius ?? raw.mountLevels?.black_dragon ?? 1)
  );
  const normalizedMountLevels: NonNullable<SaveData['mountLevels']> = {
    solarius: migratedSolariusLv,
    ...(hasClearedAries ? { vulcan: Math.max(1, Math.floor(raw.mountLevels?.vulcan ?? 1)) } : {}),
  };
  const resolvedEquippedMountId: SaveData['equippedMountId'] =
    hasClearedAries && raw.equippedMountId === 'vulcan' ? 'vulcan' :
    raw.equippedMountId === null || raw.equippedMountId === undefined
      ? null
      : 'solarius';

  // Preserve starter equipment and the Aries collection once Chapter 2 is cleared.
  const existingAstraeo = Array.isArray(raw.pets)
    ? raw.pets.find((p) => p.petId === 'astraeo')
    : undefined;
  const normalizedPets: NonNullable<SaveData['pets']> = [
    {
      petId: 'astraeo',
      level: Math.max(1, Math.floor(existingAstraeo?.level ?? 1)),
    },
  ];
  if (hasClearedAries) {
    const pyro = Array.isArray(raw.pets) ? raw.pets.find((pet) => pet.petId === 'pyro') : undefined;
    normalizedPets.push({ petId: 'pyro', level: Math.max(1, Math.floor(pyro?.level ?? 1)) });
  }
  const resolvedEquippedPetId: SaveData['equippedPetId'] =
    hasClearedAries && raw.equippedPetId === 'pyro' ? 'pyro' : raw.equippedPetId ? 'astraeo' : null;
  const normalizedEvolvedPets: NonNullable<SaveData['evolvedPets']> = (
    Array.isArray(raw.evolvedPets) ? raw.evolvedPets : []
  ).filter((id) => id === 'astraeo' || (hasClearedAries && id === 'pyro'));

  const normalizedUnlockedWings: NonNullable<SaveData['unlockedWings']> = ['solar_zenith'];
  const normalizedWingLevels: NonNullable<SaveData['wingLevels']> = {
    solar_zenith: Math.max(1, Math.floor(raw.wingLevels?.solar_zenith ?? 1)),
    ...(hasClearedAries ? { crimson_ram_wings: Math.max(1, Math.floor(raw.wingLevels?.crimson_ram_wings ?? 1)) } : {}),
  };
  const resolvedEquippedWingId: SaveData['equippedWingId'] =
    hasClearedAries && raw.equippedWingId === 'crimson_ram_wings' ? 'crimson_ram_wings' :
    raw.equippedWingId ? 'solar_zenith' : null;

  const normalizedUnlockedArtifacts: NonNullable<SaveData['unlockedArtifacts']> = [
    'astrolabe_regulus',
  ];
  const normalizedArtifactLevels: NonNullable<SaveData['artifactLevels']> = {
    astrolabe_regulus: Math.max(1, Math.floor(raw.artifactLevels?.astrolabe_regulus ?? 1)),
    ...(hasClearedAries ? { war_horn: Math.max(1, Math.floor(raw.artifactLevels?.war_horn ?? 1)) } : {}),
  };
  const resolvedEquippedArtifactId: SaveData['equippedArtifactId'] =
    hasClearedAries && raw.equippedArtifactId === 'war_horn' ? 'war_horn' :
    raw.equippedArtifactId ? 'astrolabe_regulus' : null;

  const normalizedUnlockedHalos: NonNullable<SaveData['unlockedHalos']> = ['leo_sovereign'];
  const normalizedHaloLevels: NonNullable<SaveData['haloLevels']> = {
    leo_sovereign: Math.max(1, Math.floor(raw.haloLevels?.leo_sovereign ?? 1)),
    ...(hasClearedAries ? { aries_vanguard: Math.max(1, Math.floor(raw.haloLevels?.aries_vanguard ?? 1)) } : {}),
  };
  const resolvedEquippedHaloId: SaveData['equippedHaloId'] =
    hasClearedAries && raw.equippedHaloId === 'aries_vanguard' ? 'aries_vanguard' :
    raw.equippedHaloId ? 'leo_sovereign' : null;

  // Build synchronized visible inbox (never respawning deleted mails, always reflecting claimedMailIds)
  const todayIso = new Date().toISOString().slice(0, 10);
  const rawActiveDays = raw.fairActiveDays;
  const normalizedActiveDays =
    rawActiveDays && typeof rawActiveDays.count === 'number' && rawActiveDays.count >= 1
      ? {
          count: Math.max(1, Math.floor(rawActiveDays.count)),
          lastDate: typeof rawActiveDays.lastDate === 'string' && rawActiveDays.lastDate ? rawActiveDays.lastDate : todayIso,
        }
      : {
          count: Math.max(1, Math.min(30, (raw.highestChapterCleared ?? 0) * 2 + 1)),
          lastDate: todayIso,
        };

  const migratedBase: SaveData = {
    ...raw,
    selectedHeroId: resolvedHeroId,
    aliceDefaultMigrated: true,
    unlockedHeroes: normalizedUnlockedHeroes,
    heroStars: normalizedHeroStars,
    heroMastery: normalizeHeroMastery(raw.heroMastery),
    loadoutPresets: normalizeLoadoutPresets(raw.loadoutPresets),
    chapterEquipmentPresets: normalizeChapterEquipmentPresets(raw.chapterEquipmentPresets),
    pets: normalizedPets,
    equippedPetId: resolvedEquippedPetId,
    evolvedPets: normalizedEvolvedPets,
    unlockedSkins: normalizedUnlockedSkins,
    equippedSkinByHero: normalizedEquippedSkinByHero,
    unlockedAuras: [],
    equippedAuraId: undefined,
    unlockedWings: normalizedUnlockedWings,
    wingLevels: normalizedWingLevels,
    equippedWingId: resolvedEquippedWingId,
    unlockedCelestialWings: [],
    celestialWingStars: {},
    equippedCelestialWingId: null,
    unlockedAvatarFrames: [],
    equippedAvatarFrameId: undefined,
    unlockedMounts: normalizedUnlockedMounts,
    mountLevels: normalizedMountLevels,
    equippedMountId: resolvedEquippedMountId,
    mountAppearance: 'zodiac',
    unlockedWeaponAuras: [],
    weaponAuraLevels: {},
    equippedWeaponAuraId: 'none',
    unlockedArtifacts: normalizedUnlockedArtifacts,
    artifactLevels: normalizedArtifactLevels,
    equippedArtifactId: resolvedEquippedArtifactId,
    unlockedHalos: normalizedUnlockedHalos,
    haloLevels: normalizedHaloLevels,
    equippedHaloId: resolvedEquippedHaloId,
    unlockedAstralSteeds: [],
    astralSteedStars: {},
    equippedAstralSteedId: null,
    progressionSchemaVersion: PROGRESSION_SCHEMA_VERSION,
    claimedMailIds: Array.from(existingClaimed),
    deletedMailIds: Array.from(existingDeleted),
    earlyMilestonesClaimed: Array.isArray(raw.earlyMilestonesClaimed) ? [...raw.earlyMilestonesClaimed] : [],
    earlyForgeProgress: normalizeEarlyForgeProgress(raw.earlyForgeProgress),
    playtestMetrics: normalizePlaytestMetrics(raw.playtestMetrics),
    aiPreferences: normalizeAiPreferences(raw.aiPreferences),
    fairRoadmapClaimedIds: Array.isArray(raw.fairRoadmapClaimedIds) ? [...raw.fairRoadmapClaimedIds] : [],
    fairActiveDays: normalizedActiveDays,
  };

  migratedBase.mailInbox = getVisibleMailInbox(migratedBase);
  return grantChapter2Collection(migratedBase);
}

export function normalizeAiPreferences(
  raw?: SaveData['aiPreferences']
): NonNullable<SaveData['aiPreferences']> {
  const validTactics = new Set(['aggressive', 'balanced', 'evasive']);
  const validRoles = new Set(['vanguard', 'ranger', 'mystic']);
  const validTiers = new Set(['challenger', 'master', 'sovereign', 'mythic']);
  const roles = Array.isArray(raw?.squadRoles)
    ? raw.squadRoles.filter((r): r is 'vanguard' | 'ranger' | 'mystic' => validRoles.has(r)).slice(0, 2)
    : [];
  return {
    autoPilotEnabled: Boolean(raw?.autoPilotEnabled ?? false),
    tactic: raw?.tactic && validTactics.has(raw.tactic) ? raw.tactic : 'balanced',
    autoSkillPick: raw?.autoSkillPick !== undefined ? Boolean(raw.autoSkillPick) : true,
    squadAssistEnabled: Boolean(raw?.squadAssistEnabled ?? false),
    squadRoles: roles.length > 0 ? roles : ['vanguard', 'ranger'],
    liveDuelWins: Math.max(0, Math.floor(Number(raw?.liveDuelWins ?? 0))),
    liveDuelLosses: Math.max(0, Math.floor(Number(raw?.liveDuelLosses ?? 0))),
    liveDuelRating: Math.max(800, Math.floor(Number(raw?.liveDuelRating ?? 1200))),
    aiDuelTier:
      raw?.aiDuelTier && validTiers.has(raw.aiDuelTier) ? raw.aiDuelTier : 'master',
    aiWinStreak: Math.max(0, Math.floor(Number(raw?.aiWinStreak ?? 0))),
    pveChallengeEnabled:
      raw?.pveChallengeEnabled !== undefined ? Boolean(raw.pveChallengeEnabled) : true,
  };
}

export function getVisibleMailInbox(save: SaveData): MailItem[] {
  const claimedSet = new Set<string>(save.claimedMailIds ?? []);
  const deletedSet = new Set<string>(save.deletedMailIds ?? []);
  const existingMap = new Map<string, MailItem>();

  for (const m of save.mailInbox ?? []) {
    if (m.claimed) claimedSet.add(m.id);
    existingMap.set(m.id, m);
  }

  const visible: MailItem[] = [];
  for (const tpl of SYSTEM_MAIL_TEMPLATES) {
    if (deletedSet.has(tpl.id)) continue;
    const prev = existingMap.get(tpl.id);
    const isClaimed = claimedSet.has(tpl.id) || Boolean(prev?.claimed);
    // Keep existing custom fields for legacy unclaimed mail, but synchronize template rewards for new saves
    visible.push({
      ...tpl,
      claimed: isClaimed,
    });
  }

  for (const m of save.mailInbox ?? []) {
    if (deletedSet.has(m.id)) continue;
    if (!SYSTEM_MAIL_TEMPLATES.some((t) => t.id === m.id)) {
      visible.push({
        ...m,
        claimed: claimedSet.has(m.id) || m.claimed,
      });
    }
  }

  return visible;
}

export function countUnclaimedEligibleMail(save: SaveData): number {
  const claimedSet = new Set<string>(save.claimedMailIds ?? []);
  return getVisibleMailInbox(save).filter(
    (m) => !m.claimed && !claimedSet.has(m.id) && isMailEligibleByProgression(save, m)
  ).length;
}

export interface MailClaimResult {
  nextSave: SaveData;
  claimedCount: number;
  goldGained: number;
  gemsGained: number;
  gearsGained: GearInstance[];
}

export type ProgressionGearRoller = (opts: {
  isPremium: boolean;
  minRarity?: Rarity;
  forceSTier?: boolean;
  policy: EarlyProgressionPolicy;
}) => GearInstance;

export function claimMailsUnified(
  save: SaveData,
  mailIds: string[] | 'all',
  rollGear: ProgressionGearRoller
): MailClaimResult {
  const policy = getEarlyProgressionPolicy(save);
  const claimedSet = new Set<string>(save.claimedMailIds ?? []);
  const visible = getVisibleMailInbox(save);
  const targetIdSet = mailIds === 'all' ? null : new Set(mailIds);

  let goldGained = 0;
  let gemsGained = 0;
  const gearsGained: GearInstance[] = [];
  let claimedCount = 0;

  const nextInbox = visible.map((m) => {
    if (m.claimed || claimedSet.has(m.id)) return { ...m, claimed: true };
    if (targetIdSet && !targetIdSet.has(m.id)) return m;
    if (!isMailEligibleByProgression(save, m)) return m;

    claimedSet.add(m.id);
    claimedCount += 1;
    goldGained += m.rewardGold ?? 0;
    gemsGained += m.rewardGems ?? 0;

    if (m.bonusGearRarity) {
      const clampedRarity = clampRarityToPolicy(m.bonusGearRarity, policy.maxGearRarity);
      const allowSTier = Boolean(m.bonusSTier) && policy.allowSTier;
      gearsGained.push(
        rollGear({
          isPremium: RARITY_RANK[clampedRarity] >= RARITY_RANK[Rarity.RARE],
          minRarity: clampedRarity,
          forceSTier: allowSTier,
          policy,
        })
      );
    }

    return { ...m, claimed: true };
  });

  if (claimedCount === 0) {
    return { nextSave: save, claimedCount: 0, goldGained: 0, gemsGained: 0, gearsGained: [] };
  }

  return {
    nextSave: {
      ...save,
      progressionSchemaVersion: PROGRESSION_SCHEMA_VERSION,
      gold: save.gold + goldGained,
      gems: save.gems + gemsGained,
      inventory: gearsGained.length > 0 ? [...save.inventory, ...gearsGained] : save.inventory,
      claimedMailIds: Array.from(claimedSet),
      mailInbox: nextInbox,
    },
    claimedCount,
    goldGained,
    gemsGained,
    gearsGained,
  };
}

export function deleteClaimedMailsUnified(save: SaveData): SaveData {
  const claimedSet = new Set<string>(save.claimedMailIds ?? []);
  const deletedSet = new Set<string>(save.deletedMailIds ?? []);
  const visible = getVisibleMailInbox(save);

  const remaining: MailItem[] = [];
  for (const m of visible) {
    if (m.claimed || claimedSet.has(m.id)) {
      claimedSet.add(m.id);
      deletedSet.add(m.id);
    } else {
      remaining.push(m);
    }
  }

  return {
    ...save,
    progressionSchemaVersion: PROGRESSION_SCHEMA_VERSION,
    claimedMailIds: Array.from(claimedSet),
    deletedMailIds: Array.from(deletedSet),
    mailInbox: remaining,
  };
}

// ============================================================================
// EARLY MILESTONES, TARGET GEAR & PROGRESSIVE UNLOCKS (CH.1–3)
// ============================================================================

export interface EarlyMilestoneRewardSummary {
  milestoneIds: string[];
  titles: string[];
  goldGained: number;
  gemsGained: number;
  rareShardsGained: number;
  epicShardsGained: number;
  sTierBlueprintsGained: number;
  unlockedRune?: boolean;
  unlockedRoyalTitle?: boolean;
  unlockedCelestialWing?: boolean;
}

export function applyEarlyRunMilestones(
  save: SaveData,
  chapterId: number,
  stageReached: number,
  victory: boolean
): { nextSave: SaveData; summary: EarlyMilestoneRewardSummary } {
  const claimed = new Set<string>(save.earlyMilestonesClaimed ?? []);
  const forge = normalizeEarlyForgeProgress(save.earlyForgeProgress);
  const summary: EarlyMilestoneRewardSummary = {
    milestoneIds: [],
    titles: [],
    goldGained: 0,
    gemsGained: 0,
    rareShardsGained: 0,
    epicShardsGained: 0,
    sTierBlueprintsGained: 0,
  };

  let nextGold = save.gold;
  let nextGems = save.gems;
  let nextRuneInv = save.runeInventory;
  let nextEqRunes = save.equippedRunes;
  let nextTitles = [...(save.unlockedRoyal3DTitles ?? [])];
  let nextEqTitle = save.equippedRoyal3DTitleId ?? null;
  let nextCelWings = [...(save.unlockedCelestialWings ?? [])];
  let nextCelWingStars = { ...(save.celestialWingStars ?? {}) };
  let nextEqCelWing = save.equippedCelestialWingId ?? null;

  // Incremental forge shards earned on every meaningful campaign run (clear source visibility!)
  if (chapterId === 1) {
    if (stageReached >= 4) {
      const gained = victory ? 4 : stageReached >= 8 ? 3 : 2;
      forge.rareShards += gained;
      summary.rareShardsGained += gained;
    }
    if (stageReached >= 8) {
      const gained = victory ? 6 : 2;
      forge.epicShards += gained;
      summary.epicShardsGained += gained;
    }
  } else if (chapterId === 2) {
    const gainedEpic = victory ? 6 : stageReached >= 4 ? 3 : 1;
    forge.epicShards += gainedEpic;
    summary.epicShardsGained += gainedEpic;
    if (stageReached >= 8 || victory) {
      const gainedS = victory ? 3 : 1;
      forge.sTierBlueprints += gainedS;
      summary.sTierBlueprintsGained += gainedS;
    }
  } else if (chapterId === 3) {
    const gainedEpic = victory ? 5 : stageReached >= 6 ? 2 : 1;
    forge.epicShards += gainedEpic;
    summary.epicShardsGained += gainedEpic;
    const gainedS = victory ? 5 : stageReached >= 4 ? 2 : 1;
    forge.sTierBlueprints += gainedS;
    summary.sTierBlueprintsGained += gainedS;
  } else if (chapterId >= 4) {
    const gainedS = victory ? 6 + Math.min(4, Math.floor((chapterId - 3) / 2)) : stageReached >= 4 ? 3 : 1;
    forge.sTierBlueprints += gainedS;
    summary.sTierBlueprintsGained += gainedS;
  }

  // One-time progression milestones
  if (chapterId === 1 && stageReached >= 2 && !claimed.has('ms_ch1_stage2')) {
    claimed.add('ms_ch1_stage2');
    forge.rareShards += 2;
    nextGold += 45;
    summary.rareShardsGained += 2;
    summary.goldGained += 45;
    summary.milestoneIds.push('ms_ch1_stage2');
    summary.titles.push('Mở Khóa Rương Sắt (Ải 2 Ch.1)');
  }

  if (chapterId === 1 && (stageReached >= 4 || victory) && !claimed.has('ms_ch1_ares')) {
    claimed.add('ms_ch1_ares');
    forge.rareShards += 8; // Together with stage2 + run shards >= 12 -> guaranteed first Rare!
    nextGold += 80;
    nextGems += 15;
    summary.rareShardsGained += 8;
    summary.goldGained += 80;
    summary.gemsGained += 15;
    summary.milestoneIds.push('ms_ch1_ares');
    summary.titles.push('Hạ Phụ Boss Ares · Mở Khóa Đồ Hiếm (Rare)');
  }

  if (chapterId === 1 && (stageReached >= 8 || victory) && !claimed.has('ms_ch1_boreas')) {
    claimed.add('ms_ch1_boreas');
    forge.epicShards += 6;
    nextGold += 120;
    nextGems += 20;
    summary.epicShardsGained += 6;
    summary.goldGained += 120;
    summary.gemsGained += 20;
    summary.milestoneIds.push('ms_ch1_boreas');
    summary.titles.push('Hạ Phụ Boss Boreas · +6 Mảnh Sử Thi');
  }

  if (chapterId === 1 && victory && !claimed.has('ms_ch1_clear')) {
    claimed.add('ms_ch1_clear');
    forge.epicShards += 8; // 6 + 8 + 6 = 20/20 -> guaranteed first Epic craft!
    nextGold += 180;
    nextGems += 30;
    summary.epicShardsGained += 8;
    summary.goldGained += 180;
    summary.gemsGained += 30;
    // Award moved Rare Rune (arrow_rain) on Chapter 1 Clear!
    if (!nextRuneInv.some((r) => r.runeId === 'arrow_rain')) {
      const earnedRune = {
        uid: `milestone_rune_ch1_${Date.now()}`,
        runeId: 'arrow_rain' as RuneId,
        rarity: Rarity.RARE,
      };
      nextRuneInv = [...nextRuneInv, earnedRune];
      if (nextEqRunes.length < 4) {
        nextEqRunes = [...nextEqRunes, earnedRune.uid];
      }
      summary.unlockedRune = true;
    }
    // Award moved Royal 3D Title on Chapter 1 Clear!
    if (!nextTitles.includes('title_sky_sovereign')) {
      nextTitles.push('title_sky_sovereign');
      if (!nextEqTitle) nextEqTitle = 'title_sky_sovereign';
      summary.unlockedRoyalTitle = true;
    }
    summary.milestoneIds.push('ms_ch1_clear');
    summary.titles.push('Vượt Chương 1 · Mở Khóa Sử Thi, Tháp Vô Tận, Bí Cảnh & Danh Hiệu 3D');
  }

  if (chapterId === 2 && victory && !claimed.has('ms_ch2_clear')) {
    claimed.add('ms_ch2_clear');
    forge.sTierBlueprints += 8;
    nextGold += 280;
    nextGems += 40;
    summary.sTierBlueprintsGained += 8;
    summary.goldGained += 280;
    summary.gemsGained += 40;
    summary.milestoneIds.push('ms_ch2_clear');
    summary.titles.push('Vượt Chương 2 · Mở Khóa Đấu Trường, Sự Kiện & Bản Vẽ [S]');
  }

  if (chapterId === 3 && victory && !claimed.has('ms_ch3_clear')) {
    claimed.add('ms_ch3_clear');
    forge.sTierBlueprints += 12;
    nextGold += 450;
    nextGems += 55;
    summary.sTierBlueprintsGained += 12;
    summary.goldGained += 450;
    summary.gemsGained += 55;
    summary.milestoneIds.push('ms_ch3_clear');
    summary.titles.push('Vượt Chương 3 · Mở Khóa Mẫu [S], Co-op Raid & Gói Khởi Nghiệp');
  }

  if (chapterId === 4 && victory && !claimed.has('ms_ch4_clear')) {
    claimed.add('ms_ch4_clear');
    forge.sTierBlueprints += 10;
    nextGold += 680;
    nextGems += 70;
    summary.sTierBlueprintsGained += 10;
    summary.goldGained += 680;
    summary.gemsGained += 70;
    summary.milestoneIds.push('ms_ch4_clear');
    summary.titles.push('Vượt Chương 4 · Mở Khóa Huyền Thoại (Legendary) & Tháp Nguyên Tố');
  }

  if (chapterId === 8 && victory && !claimed.has('ms_ch8_clear')) {
    claimed.add('ms_ch8_clear');
    forge.sTierBlueprints += 15;
    nextGold += 1400;
    nextGems += 100;
    summary.sTierBlueprintsGained += 15;
    summary.goldGained += 1400;
    summary.gemsGained += 100;
    summary.milestoneIds.push('ms_ch8_clear');
    summary.titles.push('Vượt Chương 8 · Mở Khóa Thần Thoại (Mythic), Hang Rồng & Viễn Chinh');
  }

  return {
    nextSave: {
      ...save,
      gold: nextGold,
      gems: nextGems,
      runeInventory: nextRuneInv,
      equippedRunes: nextEqRunes,
      unlockedRoyal3DTitles: nextTitles,
      equippedRoyal3DTitleId: nextEqTitle,
      unlockedCelestialWings: nextCelWings,
      celestialWingStars: nextCelWingStars,
      equippedCelestialWingId: nextEqCelWing,
      earlyMilestonesClaimed: Array.from(claimed),
      earlyForgeProgress: forge,
    },
    summary,
  };
}

export interface TargetGoalSnapshot {
  tier: 'rare' | 'epic' | 's_tier';
  title: string;
  current: number;
  target: number;
  canCraftNow: boolean;
  unlocked: boolean;
  unlockRequirement: string;
  dropSourceText: string;
}

export function getNextTargetGoal(save: SaveData): TargetGoalSnapshot {
  const policy = getEarlyProgressionPolicy(save);
  const forge = normalizeEarlyForgeProgress(save.earlyForgeProgress);
  const hasRare = save.inventory.some((g) => RARITY_RANK[g.rarity] >= RARITY_RANK[Rarity.RARE]);
  const hasEpic = save.inventory.some((g) => RARITY_RANK[g.rarity] >= RARITY_RANK[Rarity.EPIC]);

  if (!hasRare && policy.highestChapterCleared < 1) {
    return {
      tier: 'rare',
      title: 'Mục Tiêu: Trang Bị Hiếm (Rare) Đầu Tiên',
      current: Math.min(EARLY_FORGE_COSTS.rareShards, forge.rareShards),
      target: EARLY_FORGE_COSTS.rareShards,
      canCraftNow: policy.bestCh1Stage >= 4 && forge.rareShards >= EARLY_FORGE_COSTS.rareShards,
      unlocked: policy.bestCh1Stage >= 4,
      unlockRequirement: 'Hạ Phụ Boss Ares (Ải 4 Ch.1)',
      dropSourceText: 'Nguồn: Phụ Boss Ải 4 Ch.1 · Rương Sắt/Thần Thoại · Mảnh Rèn Hiếm',
    };
  }

  if (!hasEpic && policy.highestChapterCleared < 2) {
    return {
      tier: 'epic',
      title: 'Mục Tiêu: Trang Bị Sử Thi (Epic) Đầu Tiên',
      current: Math.min(EARLY_FORGE_COSTS.epicShards, forge.epicShards),
      target: EARLY_FORGE_COSTS.epicShards,
      canCraftNow: policy.highestChapterCleared >= 1 && forge.epicShards >= EARLY_FORGE_COSTS.epicShards,
      unlocked: policy.highestChapterCleared >= 1,
      unlockRequirement: 'Vượt Chương 1 (Hạ Sư Vương Ải 12)',
      dropSourceText: 'Nguồn: Boss Ải 8 & 12 Ch.1 · Chương 2 · Rương Thần Thoại (Pity 10 bảo toàn)',
    };
  }

  return {
    tier: 's_tier',
    title: 'Mục Tiêu: Thánh Vật Mẫu [S] Hoàng Đạo',
    current: Math.min(EARLY_FORGE_COSTS.sTierBlueprints, forge.sTierBlueprints),
    target: EARLY_FORGE_COSTS.sTierBlueprints,
    canCraftNow: policy.allowSTier && forge.sTierBlueprints >= EARLY_FORGE_COSTS.sTierBlueprints,
    unlocked: policy.allowSTier,
    unlockRequirement: 'Tiến vào Chương 4 (Vượt Chương 3)',
    dropSourceText: 'Nguồn: Boss Chương 3–12 · Bản Vẽ [S] · Rương Thần Thoại (Pity 25 bảo toàn)',
  };
}

/**
 * Expected single-target standing DPS before in-run skills or temporary procs.
 * Formula: attack * attackSpeedMult * (1 + critChance * (critDamage - 1))
 */
export function computeExpectedDps(stats: Pick<ComputedPlayerStats, 'attack' | 'attackSpeedMult' | 'critChance' | 'critDamage'>): number {
  return Number(
    (stats.attack * stats.attackSpeedMult * (1 + stats.critChance * (stats.critDamage - 1))).toFixed(2)
  );
}

// ============================================================================
// REWARD SOURCE AUDIT MATRIX (SECTION 2 OF SPECIFICATION)
// ============================================================================

export interface RewardChannelAuditRow {
  channel: string;
  earliestUnlock: string;
  cost: string;
  claimLimit: string;
  rarityCeiling: string;
  canDropSTier: string;
}

export const EARLY_REWARD_AUDIT_MATRIX: RewardChannelAuditRow[] = [
  {
    channel: 'Hòm Thư Hệ Thống (Mail)',
    earliestUnlock: 'Thư Tân Binh: Ch.1 Ải 0 · Thư Ares: Ải 4 · Thư Ch.1: Vượt Ch.1',
    cost: 'Miễn phí',
    claimLimit: '1 lần / mã thư (khóa vĩnh viễn bằng claimedMailIds)',
    rarityCeiling: 'Ch.1 Ải 0–3: Không đồ · Sau Ch.1: Tối đa Epic',
    canDropSTier: 'Không (đã gỡ [S] khỏi thư Mùa 1)',
  },
  {
    channel: 'Quà Chào Mừng (Welcome Gift)',
    earliestUnlock: 'Ch.1 Ải 0',
    cost: 'Miễn phí',
    claimLimit: '1 lần / tài khoản',
    rarityCeiling: '30 Vàng + 10 Ngọc + 2 Mảnh Rèn Hiếm (không cấp đồ Rare trước trận)',
    canDropSTier: 'Không',
  },
  {
    channel: 'Gói Khởi Nghiệp (Starter Pack [S])',
    earliestUnlock: 'Chương 4 (Vượt Chương 3)',
    cost: '39 Ngọc Hồn',
    claimLimit: '1 lần / tài khoản',
    rarityCeiling: 'Sử Thi (Epic)',
    canDropSTier: 'Có — chỉ khi đã mở Chương 4',
  },
  {
    channel: 'Rương Sắt (Iron Chest)',
    earliestUnlock: 'Sau Ải 2 Chương 1',
    cost: '120 Vàng (x10: 1.080 Vàng)',
    claimLimit: 'Không giới hạn',
    rarityCeiling: 'Ải 2–3: Common · Ải 4–11: Rare · Ch.2–4: Epic',
    canDropSTier: 'Không (loại toàn bộ mẫu S khỏi pool trước Ch.4)',
  },
  {
    channel: 'Rương Thần Thoại (Mythic Chest)',
    earliestUnlock: 'Sau Phụ Boss Ares (Ải 4 Ch.1)',
    cost: '25 Ngọc (x10: 225 Ngọc)',
    claimLimit: 'Không giới hạn (Pity 10 Epic / 25 [S] bảo toàn khi chưa mở pool)',
    rarityCeiling: 'Ải 4–11: Rare · Ch.2–4: Epic · Ch.5–8: Legendary · Ch.9–12: Mythic',
    canDropSTier: 'Chỉ từ Chương 4 (Vượt Chương 3)',
  },
  {
    channel: 'Quét Nhanh (Quick Sweep)',
    earliestUnlock: 'Sau khi vượt Chương 1 (Ch.2+)',
    cost: 'Miễn phí (3 lượt/ngày, VIP +2)',
    claimLimit: '3–5 lượt/ngày',
    rarityCeiling: 'Ch.2: tối đa Rare · Ch.3+: theo trần chương',
    canDropSTier: 'Không',
  },
  {
    channel: 'Sổ Chiến Lệnh (Battle Pass)',
    earliestUnlock: 'Sau Phụ Boss Ares (Ải 4 Ch.1)',
    cost: 'Miễn phí (Premium: 120 Ngọc)',
    claimLimit: '1 lần / bậc (20 bậc)',
    rarityCeiling: 'Bị chặn theo trần chương hiện tại',
    canDropSTier: 'Chỉ khi mở Chương 4 (nếu nhận sớm sẽ giữ lại hoặc yêu cầu Ch.4)',
  },
  {
    channel: 'Flash Sale & Cửa Hàng',
    earliestUnlock: 'Sau Phụ Boss Ares (Ải 4 Ch.1)',
    cost: 'Vàng / Ngọc (1 gói 0đ/ngày)',
    claimLimit: '1 lần / món / ngày',
    rarityCeiling: 'Gói Epic mở sau Ch.1 · Gói [S] mở từ Ch.4',
    canDropSTier: 'Chỉ từ Chương 4',
  },
  {
    channel: 'Sự Kiện Sảnh Wave 3–14 (Vòng Quay, Hộp Mù, Đấu Giá, Bàn Cờ, Lễ Hội)',
    earliestUnlock: 'Chương 3 (Vượt Chương 2)',
    cost: 'Vé / Ngọc / Vàng sự kiện',
    claimLimit: 'Theo chu kỳ ngày / mùa',
    rarityCeiling: 'Khóa trước Ch.3 · Mọi handler đều qua rollProgressionGatedGear',
    canDropSTier: 'Chỉ từ Chương 4',
  },
];

// ============================================================================
// CHAPTER 1–3 CONQUEST ROADMAP (4 CLEAR UNLOCK MILESTONES)
// ============================================================================

export interface EarlyRoadmapStage {
  id: 'ch1_stage2' | 'ch1_ares' | 'ch1_clear' | 'ch2_clear';
  stepNumber: string;
  title: string;
  requirement: string;
  unlocksSummary: string;
  guaranteedReward: string;
  rarityCeilingLabel: string;
  actionTarget?: 'battle' | 'shop' | 'forge' | 'runes';
}

export const EARLY_ROADMAP_STAGES: EarlyRoadmapStage[] = [
  {
    id: 'ch1_stage2',
    stepNumber: '01',
    title: 'Vượt Ải 2 Chương 1',
    requirement: 'Đạt Ải 2 · Thánh Điện Nhật Luân',
    unlocksSummary: 'Mở Rương Sắt & Bảng Thiên Phú',
    guaranteedReward: '+45 Vàng · +2 Mảnh Hiếm',
    rarityCeilingLabel: 'Trần Thường (Common)',
    actionTarget: 'battle',
  },
  {
    id: 'ch1_ares',
    stepNumber: '02',
    title: 'Hạ Phụ Boss Ares (Ải 4 Ch.1)',
    requirement: 'Đánh bại Tướng Quân Hỏa Ngục Ares',
    unlocksSummary: 'Mở Rương Thần Thoại · Lò Rèn · Sổ Chiến Lệnh · Flash Sale',
    guaranteedReward: 'Đủ 10/10 Mảnh rèn Vũ Khí Hiếm (Rare) đầu tiên + Thư Ải 4',
    rarityCeilingLabel: 'Mở khóa Hiếm (Rare)',
    actionTarget: 'forge',
  },
  {
    id: 'ch1_clear',
    stepNumber: '03',
    title: 'Chinh Phục Chương 1 (Sư Vương Ải 12)',
    requirement: 'Hoàn thành Chương 1 · Thánh Điện Nhật Luân',
    unlocksSummary: 'Mở Quét Nhanh · Ngọc Khắc · Chương 2 Hỏa Sơn',
    guaranteedReward: 'Ngọc Khắc Mưa Tên (Rare) · Danh Hiệu 3D · Đủ 15 Mảnh Sử Thi + Thư Epic',
    rarityCeilingLabel: 'Mở khóa Sử Thi (Epic) · Ngọc Khắc tối đa Sử Thi',
    actionTarget: 'runes',
  },
  {
    id: 'ch2_clear',
    stepNumber: '04',
    title: 'Vượt Chương 2 · Bước Vào Chương 3',
    requirement: 'Hoàn thành Chương 2 · Hỏa Sơn Sừng Đỏ',
    unlocksSummary: 'Mở Mẫu [S] · Huyền Thoại · Gói Khởi Nghiệp [S] · Sự kiện Sảnh',
    guaranteedReward: 'Cánh Thần Quang 3D · +10 Bản Vẽ [S] · Kích hoạt Pity [S] đã tích lũy',
    rarityCeilingLabel: 'Mở khóa Mẫu [S] & Huyền Thoại (Legendary)',
    actionTarget: 'shop',
  },
];

export interface EarlyRoadmapStageStatus extends EarlyRoadmapStage {
  completed: boolean;
  isCurrentTarget: boolean;
}

export function getEarlyRoadmapStatus(
  save: Pick<SaveData, 'highestChapterCleared' | 'bestStagePerChapter'>
): EarlyRoadmapStageStatus[] {
  const ch = Math.max(0, Math.floor(save.highestChapterCleared ?? 0));
  const st1 = getBestCh1Stage(save);
  const doneFlags: Record<EarlyRoadmapStage['id'], boolean> = {
    ch1_stage2: ch >= 1 || st1 >= 2,
    ch1_ares: ch >= 1 || st1 >= 4,
    ch1_clear: ch >= 1,
    ch2_clear: ch >= 2,
  };
  let foundCurrent = false;
  return EARLY_ROADMAP_STAGES.map((stage) => {
    const completed = doneFlags[stage.id];
    const isCurrentTarget = !completed && !foundCurrent;
    if (isCurrentTarget) foundCurrent = true;
    return { ...stage, completed, isCurrentTarget };
  });
}

// ============================================================================
// LOCAL PLAYTEST TELEMETRY LEDGER (ZERO HUD CLUTTER · HIDDEN IN SETTINGS)
// ============================================================================

export function createEmptyPlaytestMetrics(now = Date.now()): PlaytestMetrics {
  return {
    createdAt: now,
    totalRuns: 0,
    totalPlaySeconds: 0,
    startedRunAfterFirstDefeat: false,
    stageEntriesByChapter: {},
    stageDefeatsByChapter: {},
    bossAttempts: {},
    milestones: {},
    synergyPickCounts: {},
  };
}

export function normalizePlaytestMetrics(raw?: Partial<PlaytestMetrics>): PlaytestMetrics {
  if (!raw || typeof raw !== 'object') {
    return createEmptyPlaytestMetrics();
  }
  return {
    createdAt: typeof raw.createdAt === 'number' && raw.createdAt > 0 ? raw.createdAt : Date.now(),
    totalRuns: Math.max(0, Math.floor(raw.totalRuns ?? 0)),
    totalPlaySeconds: Math.max(0, Math.round(raw.totalPlaySeconds ?? 0)),
    firstDefeatRunIndex:
      typeof raw.firstDefeatRunIndex === 'number' ? raw.firstDefeatRunIndex : undefined,
    startedRunAfterFirstDefeat: Boolean(raw.startedRunAfterFirstDefeat),
    stageEntriesByChapter:
      raw.stageEntriesByChapter && typeof raw.stageEntriesByChapter === 'object'
        ? { ...raw.stageEntriesByChapter }
        : {},
    stageDefeatsByChapter:
      raw.stageDefeatsByChapter && typeof raw.stageDefeatsByChapter === 'object'
        ? { ...raw.stageDefeatsByChapter }
        : {},
    bossAttempts:
      raw.bossAttempts && typeof raw.bossAttempts === 'object' ? { ...raw.bossAttempts } : {},
    milestones:
      raw.milestones && typeof raw.milestones === 'object' ? { ...raw.milestones } : {},
    synergyPickCounts:
      raw.synergyPickCounts && typeof raw.synergyPickCounts === 'object'
        ? { ...raw.synergyPickCounts }
        : {},
  };
}

export function recordPlaytestRunStart(raw?: Partial<PlaytestMetrics>): PlaytestMetrics {
  const m = normalizePlaytestMetrics(raw);
  const nextTotalRuns = m.totalRuns + 1;
  const startedRunAfterFirstDefeat =
    m.startedRunAfterFirstDefeat ||
    (typeof m.firstDefeatRunIndex === 'number' && nextTotalRuns > m.firstDefeatRunIndex);
  return {
    ...m,
    totalRuns: nextTotalRuns,
    startedRunAfterFirstDefeat,
  };
}

export function getBossTelemetryKey(chapterId: number, stage: number): string | null {
  if (chapterId === 1 && stage === 4) return 'ch1_ares';
  if (chapterId === 1 && stage === 8) return 'ch1_boreas';
  if (chapterId === 1 && stage === 12) return 'ch1_leo_king';
  if (chapterId === 2 && stage === 12) return 'ch2_aries_boss';
  if (chapterId === 3 && stage === 12) return 'ch3_taurus_boss';
  if (chapterId === 4 && stage === 12) return 'ch4_gemini_boss';
  if (chapterId === 5 && stage === 12) return 'ch5_cancer_boss';
  if (chapterId === 6 && stage === 12) return 'ch6_virgo_boss';
  if (chapterId === 7 && stage === 12) return 'ch7_libra_boss';
  if (chapterId === 8 && stage === 12) return 'ch8_scorpio_boss';
  if (chapterId === 9 && stage === 12) return 'ch9_sagittarius_boss';
  if (chapterId === 10 && stage === 12) return 'ch10_capricorn_boss';
  if (chapterId === 11 && stage === 12) return 'ch11_aquarius_boss';
  if (chapterId === 12 && stage === 12) return 'ch12_pisces_boss';
  return null;
}

export function recordPlaytestRunEnd(
  raw: Partial<PlaytestMetrics> | undefined,
  params: {
    chapterId: number;
    stageReached: number;
    victory: boolean;
    elapsedSeconds: number;
    activeSynergies?: SkillSynergyId[];
  }
): PlaytestMetrics {
  const m = normalizePlaytestMetrics(raw);
  const chKey = String(params.chapterId);
  const nextEntries: Record<string, Record<number, number>> = {
    ...m.stageEntriesByChapter,
    [chKey]: { ...(m.stageEntriesByChapter[chKey] ?? {}) },
  };
  const nextDefeats: Record<string, Record<number, number>> = {
    ...m.stageDefeatsByChapter,
    [chKey]: { ...(m.stageDefeatsByChapter[chKey] ?? {}) },
  };
  const clampedStage = Math.max(1, Math.min(12, Math.floor(params.stageReached)));

  for (let s = 1; s <= clampedStage; s++) {
    nextEntries[chKey][s] = (nextEntries[chKey][s] ?? 0) + 1;
  }
  if (!params.victory) {
    nextDefeats[chKey][clampedStage] = (nextDefeats[chKey][clampedStage] ?? 0) + 1;
  }

  const nextBossAttempts = { ...m.bossAttempts };
  for (const bossStage of [4, 8, 12]) {
    if (clampedStage < bossStage) continue;
    const bKey = getBossTelemetryKey(params.chapterId, bossStage);
    if (!bKey) continue;
    const prev = nextBossAttempts[bKey] ?? { attempts: 0, cleared: false };
    const nextCount = prev.attempts + 1;
    const beatThisBoss = params.victory || clampedStage > bossStage;
    nextBossAttempts[bKey] = {
      attempts: nextCount,
      cleared: prev.cleared || beatThisBoss,
      attemptsToFirstClear:
        prev.attemptsToFirstClear ?? (beatThisBoss ? nextCount : undefined),
    };
  }

  const nextTotalPlay = m.totalPlaySeconds + Math.max(0, Math.round(params.elapsedSeconds));
  const nextMilestones = { ...m.milestones };
  if (params.chapterId === 1 && params.victory && !nextMilestones.firstCh1Clear) {
    nextMilestones.firstCh1Clear = {
      runIndex: Math.max(1, m.totalRuns),
      elapsedSec: nextTotalPlay,
    };
  }

  const nextSynergies = { ...m.synergyPickCounts };
  for (const synId of params.activeSynergies ?? []) {
    nextSynergies[synId] = (nextSynergies[synId] ?? 0) + 1;
  }

  return {
    ...m,
    totalPlaySeconds: nextTotalPlay,
    firstDefeatRunIndex:
      !params.victory && m.firstDefeatRunIndex === undefined
        ? Math.max(1, m.totalRuns)
        : m.firstDefeatRunIndex,
    stageEntriesByChapter: nextEntries,
    stageDefeatsByChapter: nextDefeats,
    bossAttempts: nextBossAttempts,
    milestones: nextMilestones,
    synergyPickCounts: nextSynergies,
  };
}

export function recordPlaytestMilestone(
  raw: Partial<PlaytestMetrics> | undefined,
  milestone: 'firstUpgrade' | 'firstRare' | 'firstEpic' | 'firstSTier'
): PlaytestMetrics {
  const m = normalizePlaytestMetrics(raw);
  if (m.milestones[milestone]) return m;
  return {
    ...m,
    milestones: {
      ...m.milestones,
      [milestone]: {
        runIndex: m.totalRuns,
        elapsedSec: m.totalPlaySeconds,
      },
    },
  };
}

export function resetPlaytestMetrics(now = Date.now()): PlaytestMetrics {
  return createEmptyPlaytestMetrics(now);
}

// ============================================================================
// PHASE 3 · SIDE-MODE PROGRESSION SCALING (BOSS RUSH & DAILY RIFT)
// ============================================================================

export function getSideModeScaling(highestChapterCleared: number): SideModeScaling {
  const tier = Math.max(1, Math.min(12, Math.floor(highestChapterCleared ?? 0) + 1));
  const table: Record<number, Omit<SideModeScaling, 'chapterTier' | 'label'>> = {
    1: { enemyHpScale: 1.25, enemyDmgScale: 1.12, goldRewardMult: 1.0, starDustBonus: 22 },
    2: { enemyHpScale: 3.1, enemyDmgScale: 1.55, goldRewardMult: 1.35, starDustBonus: 38 },
    3: { enemyHpScale: 5.4, enemyDmgScale: 2.05, goldRewardMult: 1.75, starDustBonus: 58 },
    4: { enemyHpScale: 8.6, enemyDmgScale: 2.65, goldRewardMult: 2.2, starDustBonus: 82 },
    5: { enemyHpScale: 12.8, enemyDmgScale: 3.35, goldRewardMult: 2.75, starDustBonus: 110 },
    6: { enemyHpScale: 18.2, enemyDmgScale: 4.15, goldRewardMult: 3.4, starDustBonus: 142 },
    7: { enemyHpScale: 24.8, enemyDmgScale: 5.05, goldRewardMult: 4.15, starDustBonus: 178 },
    8: { enemyHpScale: 33.0, enemyDmgScale: 6.1, goldRewardMult: 5.0, starDustBonus: 220 },
    9: { enemyHpScale: 43.0, enemyDmgScale: 7.3, goldRewardMult: 6.0, starDustBonus: 268 },
    10: { enemyHpScale: 54.5, enemyDmgScale: 8.65, goldRewardMult: 7.15, starDustBonus: 320 },
    11: { enemyHpScale: 68.0, enemyDmgScale: 10.2, goldRewardMult: 8.5, starDustBonus: 380 },
    12: { enemyHpScale: 84.0, enemyDmgScale: 12.0, goldRewardMult: 10.0, starDustBonus: 450 },
  };
  const row = table[tier] ?? table[12];
  return {
    chapterTier: tier,
    ...row,
    label: `Bậc Ch.${tier}`,
  };
}

// ============================================================================
// PHASE 3 · PLAYTEST KPI AUTO-GRADING (SETTINGS DIAGNOSTIC PANEL)
// ============================================================================

export function evaluatePlaytestKpis(
  raw?: Partial<PlaytestMetrics>,
  context?: PlaytestKpiContext
): KpiEvaluationRow[] {
  const m = normalizePlaytestMetrics(raw);
  const rows: KpiEvaluationRow[] = [];

  // 1. Run-2 retention after first defeat
  if (m.firstDefeatRunIndex === undefined) {
    rows.push({
      id: 'run2_retention',
      label: 'Quay lại Lượt 2 sau lần thua đầu',
      actualText: m.totalRuns > 0 ? 'Chưa thua trận nào' : '0 lượt',
      targetText: 'Vào trận tiếp theo ngay',
      status: 'insufficient',
      note: 'Ghi nhận khi phát sinh lần thua đầu tiên',
    });
  } else {
    rows.push({
      id: 'run2_retention',
      label: 'Quay lại Lượt 2 sau lần thua đầu',
      actualText: m.startedRunAfterFirstDefeat ? 'Có (100%)' : 'Chưa quay lại (0%)',
      targetText: '≥ 1 lượt sau lần thua đầu',
      status: m.startedRunAfterFirstDefeat ? 'pass' : 'warn',
      note: `Thua đầu ở Lượt #${m.firstDefeatRunIndex}`,
    });
  }

  // 2. Ares (Ch.1-4) attempts to first clear
  const ares = m.bossAttempts.ch1_ares;
  if (!ares || ares.attempts === 0) {
    rows.push({
      id: 'ares_attempts',
      label: 'Số lượt thử hạ Phụ Boss Ares (Ch.1-4)',
      actualText: 'Chưa chạm trán',
      targetText: '1–3 lượt',
      status: 'insufficient',
      note: 'Chưa vào Ải 4 Chương 1',
    });
  } else if (ares.attemptsToFirstClear !== undefined) {
    const ok = ares.attemptsToFirstClear >= 1 && ares.attemptsToFirstClear <= 3;
    rows.push({
      id: 'ares_attempts',
      label: 'Số lượt thử hạ Phụ Boss Ares (Ch.1-4)',
      actualText: `${ares.attemptsToFirstClear} lượt`,
      targetText: '1–3 lượt',
      status: ok ? 'pass' : 'warn',
      note: ok ? 'Nhịp thử thách đầu game chuẩn' : 'Cần rà soát độ khó Ải 4',
    });
  } else {
    rows.push({
      id: 'ares_attempts',
      label: 'Số lượt thử hạ Phụ Boss Ares (Ch.1-4)',
      actualText: `${ares.attempts} lượt (chưa qua)`,
      targetText: '1–3 lượt',
      status: ares.attempts > 3 ? 'warn' : 'insufficient',
      note: ares.attempts > 3 ? 'Vượt 3 lượt thử chưa hạ Ares' : 'Đang tiến hành',
    });
  }

  // 3. Leo King (Ch.1-12) attempts to first clear
  const leo = m.bossAttempts.ch1_leo_king;
  if (!leo || leo.attempts === 0) {
    rows.push({
      id: 'leo_attempts',
      label: 'Số lượt thử hạ Sư Vương (Ch.1-12)',
      actualText: 'Chưa chạm trán',
      targetText: '1–5 lượt',
      status: 'insufficient',
      note: 'Chưa vào Ải 12 Chương 1',
    });
  } else if (leo.attemptsToFirstClear !== undefined) {
    const ok = leo.attemptsToFirstClear >= 1 && leo.attemptsToFirstClear <= 5;
    rows.push({
      id: 'leo_attempts',
      label: 'Số lượt thử hạ Sư Vương (Ch.1-12)',
      actualText: `${leo.attemptsToFirstClear} lượt`,
      targetText: '1–5 lượt',
      status: ok ? 'pass' : 'warn',
      note: ok ? 'Ngưỡng hạ Boss Ch.1 đạt mục tiêu' : 'Hạ Sư Vương mất quá 5 lượt',
    });
  } else {
    rows.push({
      id: 'leo_attempts',
      label: 'Số lượt thử hạ Sư Vương (Ch.1-12)',
      actualText: `${leo.attempts} lượt (chưa qua)`,
      targetText: '1–5 lượt',
      status: leo.attempts > 5 ? 'warn' : 'insufficient',
      note: leo.attempts > 5 ? 'Độ khó Sư Vương cao hơn mục tiêu' : 'Đang tiến hành',
    });
  }

  // 4. First Rare gear pacing
  const firstRare = m.milestones.firstRare;
  if (!firstRare) {
    rows.push({
      id: 'first_rare',
      label: 'Nhịp đạt Trang Bị Hiếm (Rare) đầu tiên',
      actualText: 'Chưa đạt',
      targetText: 'Lượt 1–3',
      status: m.totalRuns >= 4 ? 'warn' : 'insufficient',
      note: m.totalRuns >= 4 ? 'Đã quá 3 lượt vẫn chưa có đồ Hiếm' : 'Mở khóa sau Ải 4 Ch.1',
    });
  } else {
    const ok = firstRare.runIndex >= 1 && firstRare.runIndex <= 3;
    rows.push({
      id: 'first_rare',
      label: 'Nhịp đạt Trang Bị Hiếm (Rare) đầu tiên',
      actualText: `Lượt #${firstRare.runIndex} (${firstRare.elapsedSec}s)`,
      targetText: 'Lượt 1–3',
      status: ok ? 'pass' : 'warn',
      note: ok ? 'Đúng nhịp mở khóa Hiếm' : 'Lệch nhịp mở khóa Hiếm đầu tiên',
    });
  }

  // 5. First Epic gear pacing
  const firstEpic = m.milestones.firstEpic;
  if (!firstEpic) {
    rows.push({
      id: 'first_epic',
      label: 'Nhịp đạt Trang Bị Sử Thi (Epic) đầu tiên',
      actualText: 'Chưa đạt',
      targetText: 'Lượt 2–6',
      status: m.totalRuns >= 7 ? 'warn' : 'insufficient',
      note: m.totalRuns >= 7 ? 'Đã quá 6 lượt chưa chạm mốc Sử Thi' : 'Mở khóa sau khi vượt Ch.1',
    });
  } else {
    const ok = firstEpic.runIndex >= 2 && firstEpic.runIndex <= 6;
    rows.push({
      id: 'first_epic',
      label: 'Nhịp đạt Trang Bị Sử Thi (Epic) đầu tiên',
      actualText: `Lượt #${firstEpic.runIndex} (${firstEpic.elapsedSec}s)`,
      targetText: 'Lượt 2–6',
      status: ok ? 'pass' : 'warn',
      note: ok ? 'Đúng nhịp chuyển tiếp Ch.1 → Ch.2' : 'Cần cân đối nguồn Mảnh Sử Thi',
    });
  }

  // 6. Skill Synergy adoption rate
  const totalSynergyPicks = Object.values(m.synergyPickCounts).reduce((sum, n) => sum + (n ?? 0), 0);
  if (m.totalRuns < 2) {
    rows.push({
      id: 'synergy_adoption',
      label: 'Tỷ lệ kích hoạt Cộng Hưởng kỹ năng',
      actualText: `${totalSynergyPicks} lần / ${m.totalRuns} lượt`,
      targetText: '≥ 0.5 lần / lượt',
      status: 'insufficient',
      note: 'Cần tối thiểu 2 lượt chơi để đánh giá',
    });
  } else {
    const avg = totalSynergyPicks / m.totalRuns;
    const ok = avg >= 0.5;
    rows.push({
      id: 'synergy_adoption',
      label: 'Tỷ lệ kích hoạt Cộng Hưởng kỹ năng',
      actualText: `${avg.toFixed(2)} lần / lượt (${totalSynergyPicks})`,
      targetText: '≥ 0.50 lần / lượt',
      status: ok ? 'pass' : 'warn',
      note: ok ? 'Người chơi ghép Cộng Hưởng đều đặn' : 'Gợi ý ghép cặp chưa đủ nổi bật',
    });
  }

  // 7. Endgame Progression Reach (Ch.4–12 boss progression)
  const lateBossKeys = [
    'ch4_gemini_boss',
    'ch5_cancer_boss',
    'ch6_virgo_boss',
    'ch7_libra_boss',
    'ch8_scorpio_boss',
    'ch9_sagittarius_boss',
    'ch10_capricorn_boss',
    'ch11_aquarius_boss',
    'ch12_pisces_boss',
  ];
  const clearedLateBosses = lateBossKeys.filter((k) => m.bossAttempts[k]?.cleared).length;
  const highestCleared = Math.max(0, context?.highestChapterCleared ?? 0);
  if (m.totalRuns < 4 && highestCleared < 3) {
    rows.push({
      id: 'endgame_reach',
      label: 'Chinh phục trung & hậu cuộc (Ch.4–12)',
      actualText: `Đã vượt Ch.${highestCleared} · ${clearedLateBosses}/9 Boss`,
      targetText: 'Vượt Ch.4+ hoặc hạ ≥ 1 Boss Ch.4–12',
      status: 'insufficient',
      note: 'Ghi nhận sau giai đoạn đầu (từ 4 lượt hoặc vượt Ch.3)',
    });
  } else {
    const ok = highestCleared >= 4 || clearedLateBosses >= 1;
    rows.push({
      id: 'endgame_reach',
      label: 'Chinh phục trung & hậu cuộc (Ch.4–12)',
      actualText: `Ch.${highestCleared}/12 · ${clearedLateBosses}/9 Boss`,
      targetText: 'Vượt Ch.4+ hoặc hạ ≥ 1 Boss Ch.4–12',
      status: ok ? 'pass' : 'warn',
      note: ok
        ? 'Tiến trình trung/hậu cuộc vượt ngưỡng trơn tru'
        : 'Độ dốc Ch.3 → Ch.4 có thể đang cản tiến trình',
    });
  }

  // 8. Build Depth (Gear Sets, Hero Mastery, Synergy Diversity)
  const distinctSynergies = Object.values(m.synergyPickCounts).filter((n) => (n ?? 0) > 0).length;
  const activeSetCount = Math.max(0, context?.activeSetCount ?? 0);
  const maxMasteryLevel = Math.max(1, context?.maxMasteryLevel ?? 1);
  if (m.totalRuns < 3) {
    rows.push({
      id: 'build_depth',
      label: 'Chiều sâu Build (Bộ Đồ · Tinh Thông · Cộng Hưởng)',
      actualText: `${activeSetCount} Bộ · Tinh Thông Lv.${maxMasteryLevel} · ${distinctSynergies} Cộng Hưởng`,
      targetText: '≥ 1 Bộ Đồ hoặc Tinh Thông Lv.3+ hoặc ≥ 2 Cộng Hưởng',
      status: 'insufficient',
      note: 'Cần tối thiểu 3 lượt để đo chiều sâu phối đồ',
    });
  } else {
    const ok = activeSetCount >= 1 || maxMasteryLevel >= 3 || distinctSynergies >= 2;
    rows.push({
      id: 'build_depth',
      label: 'Chiều sâu Build (Bộ Đồ · Tinh Thông · Cộng Hưởng)',
      actualText: `${activeSetCount} Bộ · Lv.${maxMasteryLevel} · ${distinctSynergies} Cộng Hưởng`,
      targetText: '≥ 1 Bộ · Lv.3+ hoặc ≥ 2 Cộng Hưởng',
      status: ok ? 'pass' : 'warn',
      note: ok
        ? 'Hệ thống phối trang bị & Tinh Thông phát huy hiệu quả'
        : 'Người chơi chưa kích hoạt sâu Bộ Đồ / Tinh Thông',
    });
  }

  return rows;
}

// ============================================================================
// PHASE 4 · HERO MASTERY (LV.1–10 PER HERO, LV.1 = +0% STATS)
// ============================================================================

export const HERO_MASTERY_MAX_LEVEL = 10;

export function getHeroMasteryExpRequired(level: number): number {
  const lv = Math.max(1, Math.min(HERO_MASTERY_MAX_LEVEL, Math.floor(level)));
  if (lv >= HERO_MASTERY_MAX_LEVEL) return 0;
  return 100 + (lv - 1) * 85;
}

export function normalizeHeroMastery(
  raw?: Partial<Record<HeroId, HeroMasteryProgress>>
): Partial<Record<HeroId, HeroMasteryProgress>> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Partial<Record<HeroId, HeroMasteryProgress>> = {};
  for (const [k, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== 'object') continue;
    const level = Math.max(1, Math.min(HERO_MASTERY_MAX_LEVEL, Math.floor(entry.level || 1)));
    const nextReq = getHeroMasteryExpRequired(level);
    const exp =
      level >= HERO_MASTERY_MAX_LEVEL
        ? 0
        : Math.max(0, Math.min(Math.max(0, nextReq - 1), Math.floor(entry.exp || 0)));
    result[k as HeroId] = {
      level,
      exp,
      totalRuns: Math.max(0, Math.floor(entry.totalRuns || 0)),
    };
  }
  return result;
}

export function computeHeroMasteryBonuses(
  raw: Partial<Record<HeroId, HeroMasteryProgress>> | undefined,
  heroId: HeroId
): HeroMasteryBonuses {
  const normalized = normalizeHeroMastery(raw);
  const progress = normalized[heroId] ?? { level: 1, exp: 0, totalRuns: 0 };
  const level = progress.level;
  const levelsAboveOne = Math.max(0, level - 1);
  const isMax = level >= HERO_MASTERY_MAX_LEVEL;
  const nextExp = getHeroMasteryExpRequired(level);

  const atkPct = Number((levelsAboveOne * 0.02).toFixed(4));
  const hpPct = Number((levelsAboveOne * 0.025).toFixed(4));
  const critChance = level >= 5 ? 0.04 : 0;
  const bossDamageBonus = level >= 10 ? 0.08 : 0;
  const cpBonus = levelsAboveOne * 45;

  const parts: string[] = [];
  if (levelsAboveOne > 0) {
    parts.push(`+${Math.round(atkPct * 100)}% ATK`);
    parts.push(`+${(hpPct * 100).toFixed(1).replace(/\.0$/, '')}% HP`);
  }
  if (critChance > 0) parts.push(`+${Math.round(critChance * 100)}% Chí Mạng`);
  if (bossDamageBonus > 0) parts.push(`+${Math.round(bossDamageBonus * 100)}% Sát Thương Boss`);

  return {
    level,
    exp: progress.exp,
    nextExp,
    isMax,
    atkPct,
    hpPct,
    critChance,
    bossDamageBonus,
    cpBonus,
    summaryLabel: parts.length > 0 ? parts.join(' · ') : 'Chưa kích hoạt (đạt Lv.2 để mở thưởng)',
  };
}

export function computeRunMasteryExpGain(params: {
  chapterId: number;
  stageReached: number;
  victory: boolean;
  isTowerMode?: boolean;
  towerFloor?: number;
  isBossRushMode?: boolean;
  isDailyRiftMode?: boolean;
}): number {
  if (params.isTowerMode) {
    const floor = Math.max(1, Math.floor(params.towerFloor ?? params.stageReached));
    return Math.round(28 + floor * 6 + (params.victory ? 25 : 0));
  }
  if (params.isBossRushMode) {
    return Math.round(35 + Math.max(1, params.stageReached) * 14 + (params.victory ? 45 : 0));
  }
  if (params.isDailyRiftMode) {
    return Math.round(32 + Math.max(1, params.stageReached) * 10 + (params.victory ? 30 : 0));
  }
  const ch = Math.max(1, Math.min(12, Math.floor(params.chapterId || 1)));
  const stage = Math.max(1, Math.min(12, Math.floor(params.stageReached || 1)));
  return Math.round(18 + ch * 8 + stage * 4 + (params.victory ? 36 : 0));
}

export function grantHeroMasteryExp(
  raw: Partial<Record<HeroId, HeroMasteryProgress>> | undefined,
  heroId: HeroId,
  expGain: number
): {
  nextMap: Partial<Record<HeroId, HeroMasteryProgress>>;
  prevLevel: number;
  nextLevel: number;
  leveledUp: boolean;
  expGained: number;
} {
  const nextMap = normalizeHeroMastery(raw);
  const current = nextMap[heroId] ?? { level: 1, exp: 0, totalRuns: 0 };
  const gain = Math.max(0, Math.floor(expGain));
  let level = current.level;
  let exp = current.exp + gain;

  while (level < HERO_MASTERY_MAX_LEVEL) {
    const req = getHeroMasteryExpRequired(level);
    if (exp < req) break;
    exp -= req;
    level += 1;
  }
  if (level >= HERO_MASTERY_MAX_LEVEL) {
    level = HERO_MASTERY_MAX_LEVEL;
    exp = 0;
  }

  nextMap[heroId] = {
    level,
    exp,
    totalRuns: current.totalRuns + 1,
  };

  return {
    nextMap,
    prevLevel: current.level,
    nextLevel: level,
    leveledUp: level > current.level,
    expGained: gain,
  };
}

// ============================================================================
// PHASE 4 · 3 SAVED LOADOUT PRESETS (CAMPAIGN / BOSS / TOWER)
// ============================================================================

export const DEFAULT_LOADOUT_PRESET_SLOTS: ReadonlyArray<{
  slotId: LoadoutPresetSlotId;
  defaultName: string;
}> = [
  { slotId: 'preset_1', defaultName: 'Bộ 1 · Chiến Dịch' },
  { slotId: 'preset_2', defaultName: 'Bộ 2 · Săn Boss' },
  { slotId: 'preset_3', defaultName: 'Bộ 3 · Leo Tháp' },
];

export function normalizeLoadoutPresets(raw?: LoadoutPreset[]): LoadoutPreset[] {
  if (!Array.isArray(raw)) return [];
  const validSlots = new Set<LoadoutPresetSlotId>(['preset_1', 'preset_2', 'preset_3']);
  const seen = new Set<LoadoutPresetSlotId>();
  const out: LoadoutPreset[] = [];
  for (const p of raw) {
    if (!p || !validSlots.has(p.slotId) || seen.has(p.slotId)) continue;
    seen.add(p.slotId);
    out.push({
      slotId: p.slotId,
      name:
        typeof p.name === 'string' && p.name.trim().length > 0
          ? p.name.trim().slice(0, 28)
          : DEFAULT_LOADOUT_PRESET_SLOTS.find((s) => s.slotId === p.slotId)?.defaultName ?? 'Bộ Trang Bị',
      heroId: normalizePlayableHeroId(p.heroId),
      equipped: { ...(p.equipped ?? {}) },
      equippedRunes: Array.isArray(p.equippedRunes) ? p.equippedRunes.slice(0, 4) : [],
      equippedPetId: p.equippedPetId ?? null,
      equippedWingId: p.equippedWingId ?? null,
      savedAt: typeof p.savedAt === 'number' ? p.savedAt : Date.now(),
    });
  }
  return out;
}

export function captureLoadoutPreset(
  save: SaveData,
  slotId: LoadoutPresetSlotId,
  customName?: string
): LoadoutPreset[] {
  const existing = normalizeLoadoutPresets(save.loadoutPresets);
  const slotMeta = DEFAULT_LOADOUT_PRESET_SLOTS.find((s) => s.slotId === slotId);
  const prev = existing.find((p) => p.slotId === slotId);
  const nextPreset: LoadoutPreset = {
    slotId,
    name: customName?.trim() || prev?.name || slotMeta?.defaultName || 'Bộ Trang Bị',
    heroId: save.selectedHeroId,
    equipped: { ...(save.equipped ?? {}) },
    equippedRunes: [...(save.equippedRunes ?? [])].slice(0, 4),
    equippedPetId: save.equippedPetId ?? null,
    equippedWingId: save.equippedWingId ?? null,
    savedAt: Date.now(),
  };
  const filtered = existing.filter((p) => p.slotId !== slotId);
  return [...filtered, nextPreset].sort((a, b) => a.slotId.localeCompare(b.slotId));
}

export function applyLoadoutPreset(
  save: SaveData,
  slotId: LoadoutPresetSlotId
): {
  nextSave: SaveData;
  appliedGearCount: number;
  skippedGearCount: number;
  preset: LoadoutPreset | null;
} {
  const presets = normalizeLoadoutPresets(save.loadoutPresets);
  const preset = presets.find((p) => p.slotId === slotId) ?? null;
  if (!preset) {
    return { nextSave: save, appliedGearCount: 0, skippedGearCount: 0, preset: null };
  }

  const inventoryUidSet = new Set(save.inventory.map((g) => g.uid));
  const nextEquipped: Partial<Record<GearSlot, string>> = { ...(save.equipped ?? {}) };
  let appliedGearCount = 0;
  let skippedGearCount = 0;

  for (const [slotKey, uid] of Object.entries(preset.equipped)) {
    if (!uid) continue;
    if (inventoryUidSet.has(uid)) {
      nextEquipped[slotKey as GearSlot] = uid;
      appliedGearCount += 1;
    } else {
      skippedGearCount += 1;
    }
  }

  const runeUidSet = new Set((save.runeInventory ?? []).map((r) => r.uid));
  const nextRunes = preset.equippedRunes.filter((uid) => runeUidSet.has(uid)).slice(0, 4);

  // Never silently switch the player's active hero when swapping equipment/rune/pet loadouts.
  const nextHeroId = save.selectedHeroId;

  const ownedPetIds = new Set((save.pets ?? []).map((p) => p.petId));
  const nextPetId =
    preset.equippedPetId && ownedPetIds.has(preset.equippedPetId)
      ? preset.equippedPetId
      : save.equippedPetId ?? null;

  const ownedWingIds = new Set(save.unlockedWings ?? []);
  const nextWingId =
    preset.equippedWingId && ownedWingIds.has(preset.equippedWingId)
      ? preset.equippedWingId
      : save.equippedWingId ?? null;

  return {
    nextSave: {
      ...save,
      selectedHeroId: nextHeroId,
      equipped: nextEquipped,
      equippedRunes: nextRunes.length > 0 || preset.equippedRunes.length === 0 ? nextRunes : save.equippedRunes,
      equippedPetId: nextPetId,
      equippedWingId: nextWingId,
      activeLoadoutPresetId: slotId,
    },
    appliedGearCount,
    skippedGearCount,
    preset,
  };
}

// ============================================================================
// PHASE 4 · STANDARDIZED ENDLESS TOWER SCALING (FLOORS 1–50+)
// ============================================================================

export function getEndlessTowerScaling(
  floor: number,
  highestChapterCleared = 0
): EndlessTowerFloorScaling {
  const f = Math.max(1, Math.floor(floor || 1));
  const chTier = Math.max(0, Math.min(12, Math.floor(highestChapterCleared || 0)));
  // 30-Day Fair Progression curve: Floors 1–10 Week 1, 11–22 Week 2, 23–36 Week 3, 37–50 Week 4
  const chapterAnchorHp = 1 + Math.min(chTier, 6) * 0.1 + Math.max(0, chTier - 6) * 0.18;
  const chapterAnchorDmg = 1 + Math.min(chTier, 6) * 0.06 + Math.max(0, chTier - 6) * 0.1;

  const floorHpGrowth = 1.2 + (f - 1) * 0.42 + Math.pow(Math.max(0, f - 8), 1.48) * 0.19;
  const floorDmgGrowth = 1.12 + (f - 1) * 0.16 + Math.pow(Math.max(0, f - 10), 1.24) * 0.06;

  const enemyHpScale = Number((floorHpGrowth * chapterAnchorHp).toFixed(2));
  const enemyDmgScale = Number((floorDmgGrowth * chapterAnchorDmg).toFixed(2));
  const goldReward = Math.round((48 + f * 24 + Math.floor(f / 5) * 55) * (1 + chTier * 0.12));
  const starDustReward = Math.round(8 + f * 3.5 + (f % 5 === 0 ? 18 : 0));
  const gemReward = f % 5 === 0 ? 12 + Math.floor(f / 5) * 5 : Math.max(2, Math.floor(f / 4) + 1);

  const enableHazards = f >= 10;
  const enableDualAffixElites = f >= 12;
  const enableBossPhaseThree = f >= 20;

  let tierTitle = 'Khởi Hành';
  if (f >= 35) tierTitle = 'Thần Thoại';
  else if (f >= 20) tierTitle = 'Tối Thượng';
  else if (f >= 12) tierTitle = 'Song Ấn';
  else if (f >= 10) tierTitle = 'Nguy Hiểm';

  return {
    floor: f,
    enemyHpScale,
    enemyDmgScale,
    goldReward,
    starDustReward,
    gemReward,
    enableHazards,
    enableDualAffixElites,
    enableBossPhaseThree,
    label: `Tầng ${f} · ${tierTitle}`,
  };
}




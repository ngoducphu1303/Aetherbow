import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { soundEngine } from './audio/soundEngine';
import { AchievementToast } from './components/AchievementToast';
import { ArenaModal } from './components/ArenaModal';
import { AuctionHouseModal } from './components/AuctionHouseModal';
import { BattlePassModal } from './components/BattlePassModal';
import { ChestGachaModal, GachaRevealState } from './components/ChestGachaModal';
import { CombatPowerToast, PowerToastData } from './components/CombatPowerToast';
import { ConstellationModal } from './components/ConstellationModal';
import { DailyRewardsModal } from './components/DailyRewardsModal';
import { DestinyWheelModal } from './components/DestinyWheelModal';
import { DispatchModal } from './components/DispatchModal';
import { GameHUD } from './components/GameHUD';
import { HonorLeaderboardModal } from './components/HonorLeaderboardModal';
import { ShopSectionTab } from './components/LobbyPanels';
import { MailModal } from './components/MailModal';
import { NightMarketModal } from './components/NightMarketModal';
import { OnboardingTour } from './components/OnboardingTour';
import { PauseResultModal } from './components/PauseResultModal';
import { ProfileCodexModal } from './components/ProfileCodexModal';
import {
  QuickSweepResultModal,
  SweepResultState,
} from './components/QuickSweepResultModal';
import { RelicForgeModal } from './components/RelicForgeModal';
import { SettingsModal } from './components/SettingsModal';
import { SkillDraftModal } from './components/SkillDraftModal';
import { SplashGate } from './components/SplashGate';
import { StageTransitionCurtain } from './components/StageTransitionCurtain';
import { TalentsModal } from './components/TalentsModal';
import { LobbyGameMode, LobbyTab, TitleScreen } from './components/TitleScreen';
import { VipPrivilegeModal } from './components/VipPrivilegeModal';
import { WardrobeModal } from './components/WardrobeModal';
import { ZodiacGuildModal } from './components/ZodiacGuildModal';
import { CHAPTERS } from './data/chaptersData';
import {
  ALL_TEMPLATE_LIST,
  GEAR_TEMPLATES,
  RARITY_META,
  RARITY_ORDER,
  computePlayerStats,
  createInitialSaveData,
  getGearPowerScore,
  getUpgradeCost,
  rollChestGear,
  rollChestGearBatch,
} from './data/gearData';
import { HERO_MAP, getHeroStarUpgradeCost } from './data/heroesData';
import {
  ACHIEVEMENTS_CATALOG,
  BATTLE_PASS_MAX_TIER,
  BATTLE_PASS_PREMIUM_GEM_COST,
  BATTLE_PASS_TIERS,
  computeSeasonScore,
  getAchievementCurrentValue,
  getBattlePassLevelInfo,
  normalizeBattlePass,
  normalizeCareer,
  normalizeDailySweeps,
  normalizeFlashDeals,
  normalizeMailInbox,
  normalizeSettings,
} from './data/liveOpsData';
import {
  CHECK_IN_REWARDS,
  DAILY_QUESTS,
  getTodayKey,
  normalizeCheckIn,
  normalizeDailyQuests,
} from './data/questsData';
import { rollRuneChestBatch } from './data/runesData';
import { rollSkillChoices } from './data/skillsData';
import {
  TALENT_MAP,
  getTalentLevel,
  getTalentUpgradeCost,
} from './data/talentsData';
import {
  AURA_MAP,
  PET_MAP,
  SKIN_MAP,
  STARTER_PACK_COST_GEMS,
  STARTER_PACK_REWARDS,
  VIP_DAILY_ESSENCE,
  VIP_DAILY_GEMS,
  VIP_DAILY_GOLD,
  VIP_DURATION_DAYS,
  VIP_MONTHLY_COST_GEMS,
  addDaysToDateKey,
  getDailyRiftPair,
  getPetUpgradeCost,
  getSalvageValue,
  isVipActive,
  normalizeDailyRift,
  normalizePets,
  normalizeVip,
} from './data/wave3Data';
import {
  DESTINY_MILESTONES,
  DESTINY_SPIN5_GEM_COST,
  DESTINY_SPIN_GEM_COST,
  GUILD_BOSS_DAMAGE_TIERS,
  GUILD_TECH_DEFS,
  MAX_DAILY_GUILD_TRIBUTES,
  SEASON_MEDALS,
  getAwakenCost,
  getGuildLevelExpReq,
  getReforgeCost,
  getSeasonMedalCurrentValue,
  normalizeBuildPresets,
  normalizeDestinyWheel,
  normalizeGuild,
  reforgeItemSubstats,
  rollDestinyPrize,
} from './data/wave4Data';
import {
  ARENA_RANK_TIERS,
  CUMULATIVE_SPEND_MILESTONES,
  NOVICE_JOURNEY_DAYS,
  SOCKET_GEM_COLORS,
  createSocketGem,
  getJourneyTaskCurrentValue,
  getMaxGemSocketsForRarity,
  getSocketGemCraftCost,
  normalizeArena,
  normalizeNightMarket,
  normalizeNoviceJourney,
  normalizeSocketGems,
} from './data/wave5Data';
import {
  ArenaShopOffer,
  COOP_DIFFICULTY_MAP,
  CommercialPackItem,
  ELEMENTAL_TOWER_MAP,
  GROWTH_FUND_MILESTONES,
  GROWTH_FUND_PREMIUM_GEM_COST,
  MAX_CONSTELLATION_LEVEL,
  getConstellationUpgradeCost,
  isGrowthFundMilestoneMet,
  normalizeArenaShop,
  normalizeConstellations,
  normalizeCoopRaid,
  normalizeElementalTowers,
  normalizeGrowthFund,
} from './data/wave6Data';
import {
  AVATAR_FRAME_MAP,
  CRYSTAL_DEFENSE_MAX_DAILY_RUNS,
  CRYSTAL_DEFENSE_TOTAL_WAVES,
  MAX_WING_LEVEL,
  MONTHLY_CARD_MAP,
  MYTHIC_BADGE_MAP,
  TOPUP_EVOLUTION_MILESTONES,
  WING_MAP,
  WORLD_BOSS_MILESTONES,
  computeWorldBossLiveRank,
  generateRotatingAuctionLots,
  getMythicBadgeMetricValue,
  getNextMonthlyExpiryDate,
  getWingUpgradeCost,
  isMonthlyCardActive,
  normalizeAuctionHouse,
  normalizeCrystalDefense,
  normalizeMonthlyPrivilege,
  normalizeTopUpEvolution,
  normalizeWorldBoss,
  resolveExpiredAuctionLots,
} from './data/wave7Data';
import {
  BLOOD_MOON_MILESTONES,
  DISPATCH_SPEEDUP_GOLD,
  FIRST_TOPUP_TIERS,
  HOT_FLASH_BUNDLES,
  MAX_MOUNT_LEVEL,
  MAX_WEAPON_AURA_LEVEL,
  MOUNT_MAP,
  WEAPON_AURA_MAP,
  WISH_MILESTONES,
  WISH_POOL_10_COST_GEMS,
  WISH_POOL_COST_GEMS,
  WISH_TARGET_CATALOG,
  getDispatchMissionDef,
  getMountUpgradeCost,
  getWeaponAuraUpgradeCost,
  normalizeBloodMoon,
  normalizeDispatchState,
  normalizeFirstTopUp,
  normalizeWishPool,
  rollWishPoolBatch,
} from './data/wave8Data';
import {
  ABYSSAL_GAUNTLET_TOTAL_WAVES,
  ABYSSAL_MILESTONES,
  ARTIFACT_MAP,
  GUILD_WAR_WEEKLY_BOXES,
  MAX_ARTIFACT_LEVEL,
  MYSTIC_EXCHANGE_OFFERS,
  PowerRecommendation,
  evaluateDynamicTitleUnlocks,
  getArtifactUpgradeCost,
  normalizeAbyssalGauntlet,
  normalizeGuildWar,
  normalizeMysticExchange,
} from './data/wave9Data';
import { GameEngine } from './engine/GameEngine';
import { HeroVisualConfig } from './engine/models';
import {
  AchievementDefinition,
  ArenaOpponent,
  ArtifactId,
  AuctionLotItem,
  AuraStyleId,
  AvatarFrameId,
  ConstellationId,
  CoopRaidDifficulty,
  DamageBreakdown,
  DestinyWheelPrize,
  DynamicTitleId,
  ElementalTowerId,
  EncounterOffer,
  FlashDealItem,
  FloatingDamage,
  ForgeRecipe,
  GamePhase,
  GameSettings,
  GearInstance,
  GearSlot,
  GuildTechId,
  HeroId,
  HeroSkinId,
  HudSnapshot,
  JoystickState,
  LobbyCameraPreset,
  MonthlyCardTier,
  MountId,
  MythicBadgeId,
  NightMarketOffer,
  PetId,
  Rarity,
  RunHistoryEntry,
  RuneInstance,
  SaveData,
  SkillDefinition,
  SkillId,
  SocketGemColor,
  SocketGemInstance,
  TalentId,
  WardrobePreviewOverrides,
  WeaponAuraId,
  WheelOutcome,
  WingId,
} from './types/game';

const STORAGE_KEY = 'artemis_3d_save_v1';

function addGemsSpent(prev: SaveData, spent: number) {
  const nm = normalizeNightMarket(prev.nightMarket);
  if (spent <= 0) return nm;
  return { ...nm, totalGemsSpent: nm.totalGemsSpent + spent };
}

function addTopUpPoints(prev: SaveData, pts: number) {
  const tu = normalizeTopUpEvolution(prev.topUpEvolution);
  if (pts <= 0) return tu;
  return { ...tu, points: tu.points + pts };
}

function loadSaveData(): SaveData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createInitialSaveData();
    const parsed = JSON.parse(raw) as SaveData;
    if (
      !parsed ||
      !Array.isArray(parsed.inventory) ||
      !parsed.equipped ||
      !Array.isArray(parsed.unlockedHeroes) ||
      !Array.isArray(parsed.runeInventory)
    ) {
      return createInitialSaveData();
    }
    return parsed;
  } catch {
    return createInitialSaveData();
  }
}

const INITIAL_HUD: HudSnapshot = {
  hp: 260,
  maxHp: 260,
  shield: 0,
  xp: 0,
  xpToNext: 55,
  level: 1,
  stage: 1,
  totalStages: 12,
  stageName: 'Thánh Điện Nhật Luân · Phòng 1',
  chapterName: '🦁 Sư Tử',
  heroName: 'Artemis',
  enemiesRemaining: 0,
  portalOpen: false,
  isBossStage: false,
  lastPlayerHitAt: 0,
  runGold: 0,
  runGems: 0,
  kills: 0,
  dashCooldownRatio: 0,
  ultCharge: 55,
  ultName: 'Mưa Tên Trăng Bạc',
  revivesLeft: 0,
  bossName: null,
  bossHp: 0,
  bossMaxHp: 0,
  bossPhase: 1,
  isTowerMode: false,
  towerFloor: 0,
  isBossRushMode: false,
  bossRushRound: 0,
  bossRushTotalRounds: 5,
  isGuildBossMode: false,
  guildBossTimeLeft: 60,
  guildBossTotalDamage: 0,
  isArenaMode: false,
  arenaTimeLeft: 45,
  arenaOpponentName: '',
  arenaOpponentHp: 0,
  arenaOpponentMaxHp: 1,
  isCoopRaidMode: false,
  isElementalTowerMode: false,
  activeSkills: {},
  stageBannerText: null,
  comboCount: 0,
  comboTimerRatio: 0,
  comboTierLabel: '',
};

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const transitionTimerRef = useRef<number | null>(null);
  const unlockedToastIdsRef = useRef<Set<string> | null>(null);
  const prevPowerRef = useRef<number | null>(null);
  const activeArenaOpponentRef = useRef<ArenaOpponent | null>(null);

  const [save, setSave] = useState<SaveData>(() => loadSaveData());
  const vipActiveRef = useRef<boolean>(isVipActive(save.vip));
  const [enteredGame, setEnteredGame] = useState<boolean>(false);
  const [phase, setPhase] = useState<GamePhase>(GamePhase.TITLE);
  const [selectedChapterId, setSelectedChapterId] = useState<number>(1);
  const [gameMode, setGameMode] = useState<LobbyGameMode>('chapter');
  const [activeLobbyTab, setActiveLobbyTab] = useState<LobbyTab>('battle');
  const [heroSubTabInitial, setHeroSubTabInitial] = useState<
    'roster' | 'pets' | 'cosmetics' | 'wings' | 'mounts' | 'artifacts'
  >('roster');
  const [shopSection, setShopSection] = useState<ShopSectionTab>('privilege');
  const [selectedCoopDifficulty, setSelectedCoopDifficulty] = useState<CoopRaidDifficulty>('normal');
  const [selectedElementalTower, setSelectedElementalTower] = useState<ElementalTowerId>('fire');
  const [previewHeroId, setPreviewHeroId] = useState<HeroId | null>(null);
  const [cameraPreset, setCameraPreset] = useState<LobbyCameraPreset>('overview');
  const [wardrobeOpen, setWardrobeOpen] = useState<boolean>(false);
  const [dispatchOpen, setDispatchOpen] = useState<boolean>(false);
  const [wardrobePreview, setWardrobePreview] = useState<WardrobePreviewOverrides>({});
  const [wishLastOutcomes, setWishLastOutcomes] = useState<
    Array<{ label: string; rarity: 'R' | 'SR' | 'SSR'; isTargetHit: boolean }>
  >([]);
  const [transitionState, setTransitionState] = useState<{
    chapterId: number;
    isTowerMode: boolean;
    isBossRushMode: boolean;
    isDailyRiftMode?: boolean;
    isGuildBossMode?: boolean;
    isArenaMode?: boolean;
    isCoopRaidMode?: boolean;
    coopDifficulty?: CoopRaidDifficulty;
    isElementalTowerMode?: boolean;
    elementalTowerId?: ElementalTowerId;
    isCrystalDefenseMode?: boolean;
    isWorldBossMode?: boolean;
    isBloodMoonMode?: boolean;
    isAbyssalMode?: boolean;
    isGuildWarMode?: boolean;
    arenaOpponentName?: string;
    dailyRiftTitle?: string;
  } | null>(null);
  const [rewardsModalTab, setRewardsModalTab] = useState<
    'checkin' | 'quests' | 'welcome' | 'journey' | null
  >(null);
  const [talentsModalOpen, setTalentsModalOpen] = useState<boolean>(false);
  const [constellationModalOpen, setConstellationModalOpen] = useState<boolean>(false);
  const [battlePassOpen, setBattlePassOpen] = useState<boolean>(false);
  const [vipModalOpen, setVipModalOpen] = useState<boolean>(false);
  const [forgeConfig, setForgeConfig] = useState<{
    open: boolean;
    subTab: 'salvage' | 'forge' | 'reforge' | 'awaken' | 'sockets';
    gearUid?: string;
  }>({ open: false, subTab: 'salvage' });
  const [guildModalOpen, setGuildModalOpen] = useState<boolean>(false);
  const [destinyWheelOpen, setDestinyWheelOpen] = useState<boolean>(false);
  const [nightMarketOpen, setNightMarketOpen] = useState<boolean>(false);
  const [arenaModalOpen, setArenaModalOpen] = useState<boolean>(false);
  const [auctionModalOpen, setAuctionModalOpen] = useState<boolean>(false);
  const [honorBoardOpen, setHonorBoardOpen] = useState<boolean>(false);
  const [activeArenaOpponent, setActiveArenaOpponent] = useState<ArenaOpponent | null>(null);
  const [profileModalTab, setProfileModalTab] = useState<
    'profile' | 'achievements' | 'history' | 'codex' | null
  >(null);
  const [mailModalOpen, setMailModalOpen] = useState<boolean>(false);
  const [sweepResult, setSweepResult] = useState<SweepResultState | null>(null);
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(false);
  const [activeAchievementToast, setActiveAchievementToast] =
    useState<AchievementDefinition | null>(null);
  const [powerToast, setPowerToast] = useState<PowerToastData | null>(null);
  const [gachaReveal, setGachaReveal] = useState<GachaRevealState | null>(null);

  const [hud, setHud] = useState<HudSnapshot>(INITIAL_HUD);
  const [damages, setDamages] = useState<FloatingDamage[]>([]);
  const [joystick, setJoystick] = useState<JoystickState>({
    active: false,
    originX: 0,
    originY: 0,
    currentX: 0,
    currentY: 0,
  });

  const [draftChoices, setDraftChoices] = useState<SkillDefinition[]>([]);
  const [draftStacks, setDraftStacks] = useState<Partial<Record<SkillId, number>>>({});
  const [rerollUsed, setRerollUsed] = useState<boolean>(false);
  const [encounterOffer, setEncounterOffer] = useState<EncounterOffer | null>(null);
  const [runSummary, setRunSummary] = useState<{
    chapterId: number;
    stageReached: number;
    kills: number;
    gold: number;
    gems: number;
    seasonXp?: number;
    isTowerMode?: boolean;
    towerFloor?: number;
    isBossRushMode?: boolean;
    bossRushRound?: number;
    isDailyRiftMode?: boolean;
    isGuildBossMode?: boolean;
    guildBossDamage?: number;
    isArenaMode?: boolean;
    arenaOpponentName?: string;
    arenaRatingDelta?: number;
    isCoopRaidMode?: boolean;
    coopDifficulty?: CoopRaidDifficulty;
    isElementalTowerMode?: boolean;
    elementalTowerId?: ElementalTowerId;
    elementalTowerFloor?: number;
    isCrystalDefenseMode?: boolean;
    crystalWavesCleared?: number;
    crystalHpPct?: number;
    wingFeathers?: number;
    isWorldBossMode?: boolean;
    worldBossDamage?: number;
    worldBossLiveRank?: number;
    isBloodMoonMode?: boolean;
    bloodMoonScore?: number;
    bloodMoonWave?: number;
    mountShards?: number;
    awakeningCrystals?: number;
    starDust?: number;
    petEssence?: number;
    isAbyssalMode?: boolean;
    abyssalWave?: number;
    abyssalScore?: number;
    artifactShards?: number;
    mysticTokens?: number;
    isGuildWarMode?: boolean;
    guildWarScore?: number;
    guildWarNodes?: number;
    guildCoins?: number;
    maxCombo?: number;
    damageBreakdown?: DamageBreakdown;
  } | null>(null);

  const playerStats = useMemo(() => computePlayerStats(save), [save]);
  const currentSettings = useMemo(() => normalizeSettings(save.settings), [save.settings]);

  const displayHeroId =
    phase === GamePhase.TITLE && activeLobbyTab === 'heroes' && previewHeroId
      ? previewHeroId
      : save.selectedHeroId;

  const heroVisualCfg = useMemo<HeroVisualConfig>(() => {
    const hero = HERO_MAP[displayHeroId] ?? HERO_MAP.artemis;
    const wUid = save.equipped[GearSlot.WEAPON];
    const aUid = save.equipped[GearSlot.ARMOR];
    const wItem = save.inventory.find((g) => g.uid === wUid);
    const aItem = save.inventory.find((g) => g.uid === aUid);
    const wTpl = wItem ? GEAR_TEMPLATES[wItem.templateId] : undefined;
    const aTpl = aItem ? GEAR_TEMPLATES[aItem.templateId] : undefined;
    const isWardrobePreviewActive = phase === GamePhase.TITLE && wardrobeOpen;
    const activeSkinId =
      (isWardrobePreviewActive ? wardrobePreview.skinId : undefined) ??
      save.equippedSkinByHero?.[hero.id] ??
      'default';
    const skinDef = SKIN_MAP[activeSkinId];
    const auraDef = AURA_MAP[save.equippedAuraId ?? 'zodiac_gold'] ?? AURA_MAP.zodiac_gold;
    const selCh = CHAPTERS.find((c) => c.id === selectedChapterId) ?? CHAPTERS[0];
    const equippedWingId =
      save.equippedWingId && (save.unlockedWings ?? []).includes(save.equippedWingId)
        ? save.equippedWingId
        : null;
    const effectiveWingId =
      isWardrobePreviewActive && wardrobePreview.wingId !== undefined
        ? wardrobePreview.wingId
        : equippedWingId;
    const wingLevel = effectiveWingId ? Math.max(1, save.wingLevels?.[effectiveWingId] ?? 1) : 1;

    const equippedMountId =
      save.equippedMountId && (save.unlockedMounts ?? []).includes(save.equippedMountId)
        ? save.equippedMountId
        : null;
    const effectiveMountId =
      isWardrobePreviewActive && wardrobePreview.mountId !== undefined
        ? wardrobePreview.mountId
        : equippedMountId;
    const mountLevel = effectiveMountId
      ? Math.max(1, save.mountLevels?.[effectiveMountId] ?? 1)
      : 1;

    const equippedWeaponAuraId: WeaponAuraId =
      save.equippedWeaponAuraId &&
      (save.unlockedWeaponAuras ?? ['none']).includes(save.equippedWeaponAuraId)
        ? save.equippedWeaponAuraId
        : 'none';
    const effectiveWeaponAuraId: WeaponAuraId =
      isWardrobePreviewActive && wardrobePreview.weaponAuraId !== undefined
        ? wardrobePreview.weaponAuraId
        : equippedWeaponAuraId;
    const weaponAuraLevel =
      effectiveWeaponAuraId !== 'none'
        ? Math.max(1, save.weaponAuraLevels?.[effectiveWeaponAuraId] ?? 1)
        : 1;
    const effectiveArtifactId: ArtifactId | null =
      save.equippedArtifactId && (save.unlockedArtifacts ?? []).includes(save.equippedArtifactId)
        ? save.equippedArtifactId
        : null;
    const artifactLevel = effectiveArtifactId
      ? Math.max(1, save.artifactLevels?.[effectiveArtifactId] ?? 1)
      : 1;

    return {
      weaponAccentHex: skinDef?.accentHex ?? wTpl?.visualAccentHex ?? hero.accentHex,
      cloakColorHex: skinDef?.cloakHex ?? aTpl?.cloakColorHex ?? hero.cloakHex,
      hairColorHex: skinDef?.hairHex ?? hero.hairHex,
      eyeColor: hero.eyeColor,
      cheekColor: hero.cheekColor,
      crownStyle: hero.crownStyle,
      weaponArchetype: wTpl?.weaponArchetype ?? 'bow',
      auraPrimaryHex: auraDef.primaryHex,
      auraSecondaryHex: auraDef.secondaryHex,
      pedestalTintHex: selCh.trimHex,
      constellationLevels: playerStats.constellationLevels,
      wingId: effectiveWingId,
      wingLevel,
      mountId: effectiveMountId,
      mountLevel,
      weaponAuraId: effectiveWeaponAuraId,
      weaponAuraLevel,
      artifactId: effectiveArtifactId,
      artifactLevel,
    };
  }, [
    save,
    displayHeroId,
    selectedChapterId,
    playerStats.constellationLevels,
    phase,
    wardrobeOpen,
    wardrobePreview,
  ]);

  // Reset transient lobby overlays whenever leaving TITLE phase
  useEffect(() => {
    if (phase !== GamePhase.TITLE) {
      setWardrobeOpen(false);
      setWardrobePreview({});
      setDispatchOpen(false);
    }
  }, [phase]);

  // Daily Wave 7 & Wave 8 rollover bonus runs + initial Auction resolution
  useEffect(() => {
    const today = getTodayKey();
    setSave((prev) => {
      const mp = normalizeMonthlyPrivilege(prev.monthlyPrivilege);
      const extraDefense =
        (isMonthlyCardActive(mp.silver, today) ? 1 : 0) +
        (isMonthlyCardActive(mp.royal, today) ? 1 : 0);
      const extraArena = isMonthlyCardActive(mp.royal, today) ? 2 : 0;

      let nextCd = prev.crystalDefense;
      let changed = false;
      if (!prev.crystalDefense || prev.crystalDefense.date !== today) {
        nextCd = {
          date: today,
          runsRemaining: CRYSTAL_DEFENSE_MAX_DAILY_RUNS + extraDefense,
          bestWave: prev.crystalDefense?.bestWave ?? 0,
          totalClears: prev.crystalDefense?.totalClears ?? 0,
        };
        changed = true;
      }

      let nextArena = prev.arena;
      if (extraArena > 0 && (!prev.arena || prev.arena.ticketsDate !== today)) {
        const baseArena = normalizeArena(prev.arena);
        nextArena = {
          ...baseArena,
          ticketsRemaining: baseArena.ticketsRemaining + extraArena,
        };
        changed = true;
      }

      const normBm = normalizeBloodMoon(prev.bloodMoon);
      if (!prev.bloodMoon || prev.bloodMoon.date !== today) {
        changed = true;
      }

      const normAh = normalizeAuctionHouse(prev.auctionHouse);
      const resolvedAh = resolveExpiredAuctionLots(normAh);
      if (resolvedAh !== normAh || !prev.auctionHouse) {
        changed = true;
      }

      const normMx = normalizeMysticExchange(prev.mysticExchange);
      if (!prev.mysticExchange || prev.mysticExchange.weekKey !== normMx.weekKey) {
        changed = true;
      }

      const normAb = normalizeAbyssalGauntlet(prev.abyssalGauntlet);
      if (!prev.abyssalGauntlet || prev.abyssalGauntlet.date !== normAb.date) {
        changed = true;
      }

      const normGw = normalizeGuildWar(prev.guildWar);
      if (
        !prev.guildWar ||
        prev.guildWar.lastRunDate !== normGw.lastRunDate ||
        prev.guildWar.weekKey !== normGw.weekKey
      ) {
        changed = true;
      }

      if (!changed) return prev;
      return {
        ...prev,
        crystalDefense: nextCd,
        bloodMoon: normBm,
        arena: nextArena ?? prev.arena,
        auctionHouse: resolvedAh,
        mysticExchange: normMx,
        abyssalGauntlet: normAb,
        guildWar: normGw,
      };
    });
  }, []);

  // Auto-unlock Wave 9 Dynamic Titles when thresholds are met
  useEffect(() => {
    const nextUnlocked = evaluateDynamicTitleUnlocks(save, playerStats.powerRating);
    const curUnlocked = save.unlockedDynamicTitles ?? ['none'];
    if (nextUnlocked.some((id) => !curUnlocked.includes(id))) {
      setSave((prev) => {
        const latest = evaluateDynamicTitleUnlocks(prev, playerStats.powerRating);
        const existing = prev.unlockedDynamicTitles ?? ['none'];
        if (!latest.some((id) => !existing.includes(id))) return prev;
        return { ...prev, unlockedDynamicTitles: latest };
      });
    }
  }, [save, playerStats.powerRating]);

  // Resolve expired Auction House lots live while the modal is open
  useEffect(() => {
    if (!auctionModalOpen) return;
    const settle = () => {
      setSave((prev) => {
        const cur = normalizeAuctionHouse(prev.auctionHouse);
        const resolved = resolveExpiredAuctionLots(cur);
        if (resolved === cur && prev.auctionHouse) return prev;
        return { ...prev, auctionHouse: normalizeAuctionHouse(resolved) };
      });
    };
    settle();
    const timer = window.setInterval(settle, 2000);
    return () => window.clearInterval(timer);
  }, [auctionModalOpen]);

  // Persist save to localStorage + sync audio volumes + keep VIP ref fresh
  useEffect(() => {
    vipActiveRef.current = isVipActive(save.vip);
    soundEngine.setMuted(save.muted);
    soundEngine.setVolumes(
      currentSettings.masterVol,
      currentSettings.bgmVol,
      currentSettings.sfxVol
    );
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(save));
    } catch {
      // ignore quota errors
    }
  }, [save, currentSettings]);

  // Sync dynamic BGM track to game state
  useEffect(() => {
    if (!enteredGame) {
      soundEngine.setBgmMode('silent');
    } else if (phase === GamePhase.TITLE) {
      soundEngine.setBgmMode('lobby');
    } else if (hud.bossName) {
      soundEngine.setBgmMode('boss');
    } else {
      soundEngine.setBgmMode('combat');
    }
  }, [enteredGame, phase, hud.bossName]);

  // Detect newly unlocked achievements & trigger non-blocking Toast
  useEffect(() => {
    const currentlyUnlocked = ACHIEVEMENTS_CATALOG.filter(
      (ach) => getAchievementCurrentValue(save, ach.metric) >= ach.target
    );
    if (!unlockedToastIdsRef.current) {
      unlockedToastIdsRef.current = new Set(currentlyUnlocked.map((a) => a.id));
      return;
    }
    const newlyUnlocked = currentlyUnlocked.find(
      (a) => !unlockedToastIdsRef.current!.has(a.id)
    );
    if (newlyUnlocked) {
      currentlyUnlocked.forEach((a) => unlockedToastIdsRef.current!.add(a.id));
      setActiveAchievementToast(newlyUnlocked);
      soundEngine.playAchievement();
      const t = window.setTimeout(() => setActiveAchievementToast(null), 3400);
      return () => window.clearTimeout(t);
    }
    return undefined;
  }, [save]);

  // Trigger non-blocking +LC Combat Power Toast whenever player power increases in Lobby
  useEffect(() => {
    const nextPower = playerStats.powerRating;
    if (!enteredGame || phase !== GamePhase.TITLE) {
      prevPowerRef.current = nextPower;
      return;
    }
    if (prevPowerRef.current === null) {
      prevPowerRef.current = nextPower;
      return;
    }
    if (nextPower > prevPowerRef.current) {
      const prevPower = prevPowerRef.current;
      prevPowerRef.current = nextPower;
      setPowerToast({
        id: Date.now(),
        prevPower,
        nextPower,
        delta: nextPower - prevPower,
      });
      soundEngine.playPowerUp();
      const t = window.setTimeout(() => setPowerToast(null), 2600);
      return () => window.clearTimeout(t);
    }
    prevPowerRef.current = nextPower;
    return undefined;
  }, [playerStats.powerRating, enteredGame, phase]);

  // Initialize Three.js engine once
  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    const engine = new GameEngine(
      mount,
      {
        onHudUpdate: (snap) => {
          setHud(snap);
        },
        onFloatingDamage: (dmg) => {
          setDamages((prev) => [...prev.slice(-18), dmg]);
        },
        onJoystickUpdate: (joy) => {
          setJoystick(joy);
        },
        onRequestSkillDraft: (currentSkills) => {
          const rolled = rollSkillChoices(currentSkills, 3);
          if (rolled.length === 0) {
            engine.setPhase(GamePhase.PLAYING);
            return;
          }
          setDraftStacks(currentSkills);
          setDraftChoices(rolled);
          setRerollUsed(false);
          setPhase(GamePhase.SKILL_DRAFT);
        },
        onRequestEncounter: (kind, currentSkills) => {
          if (kind === 'valkyrie') {
            const rolled = rollSkillChoices(currentSkills, 3, 'epic');
            const choices = rolled.length > 0 ? rolled : rollSkillChoices(currentSkills, 3);
            if (choices.length === 0) {
              engine.resumeFromDraft();
              return;
            }
            setDraftStacks(currentSkills);
            setDraftChoices(choices);
            setRerollUsed(false);
            setPhase(GamePhase.VALKYRIE_DRAFT);
          } else if (kind === 'wheel') {
            setPhase(GamePhase.LUCKY_WHEEL);
          } else if (kind === 'angel') {
            setEncounterOffer({ kind: 'angel' });
            setPhase(GamePhase.ANGEL_DEVIL);
          } else if (kind === 'devil') {
            const rolled = rollSkillChoices(currentSkills, 1, 'legend');
            const fallback = rolled.length > 0 ? rolled : rollSkillChoices(currentSkills, 1);
            setEncounterOffer({ kind: 'devil', devilSkill: fallback[0] });
            setPhase(GamePhase.ANGEL_DEVIL);
          } else {
            engine.resumeFromDraft();
          }
        },
        onRunEnded: (victory, summary) => {
          const isTower = Boolean(summary.isTowerMode);
          const isBossRush = Boolean(summary.isBossRushMode);
          const isDailyRift = Boolean(summary.isDailyRiftMode);
          const isGuildBoss = Boolean(summary.isGuildBossMode);
          const isArena = Boolean(summary.isArenaMode);
          const isCoopRaid = Boolean(summary.isCoopRaidMode);
          const isElementalTower = Boolean(summary.isElementalTowerMode);
          const isCrystalDefense = Boolean(summary.isCrystalDefenseMode);
          const isWorldBoss = Boolean(summary.isWorldBossMode);
          const isBloodMoon = Boolean(summary.isBloodMoonMode);
          const isAbyssal = Boolean(summary.isAbyssalMode);
          const isGuildWar = Boolean(summary.isGuildWarMode);
          const opp = activeArenaOpponentRef.current;
          const towerFloor = summary.towerFloor ?? 0;
          const elTowerFloor = summary.elementalTowerFloor ?? 1;
          const elTowerId = summary.elementalTowerId ?? 'fire';
          const coopDiff = summary.coopDifficulty ?? 'normal';
          const bossRound = summary.bossRushRound ?? summary.stageReached ?? 1;
          const guildBossDamage = summary.guildBossDamage ?? 0;
          const crystalWavesCleared = summary.crystalWavesCleared ?? summary.stageReached ?? 0;
          const worldBossDamage = summary.worldBossDamage ?? 0;
          const worldBossLiveRank =
            summary.worldBossLiveRank ?? computeWorldBossLiveRank(worldBossDamage);
          const bloodMoonScore = summary.bloodMoonScore ?? 0;
          const bloodMoonWave = summary.bloodMoonWave ?? summary.stageReached ?? 1;
          const abyssalWave = summary.abyssalWave ?? summary.stageReached ?? 0;
          const abyssalScore = summary.abyssalScore ?? 0;
          const guildWarScore = summary.guildWarScore ?? 0;
          const guildWarNodes = summary.guildWarNodes ?? summary.stageReached ?? 0;
          const artifactShardsGain = summary.artifactShards ?? 0;
          const mysticTokensGain = summary.mysticTokens ?? 0;
          const guildWarCoinsGain = summary.guildCoins ?? 0;
          const mountShardsGain = summary.mountShards ?? 0;
          const awakeningCrystalsGain = summary.awakeningCrystals ?? 0;
          const wingFeathersGain = summary.wingFeathers ?? 0;
          const arenaRatingDelta = isArena ? (victory ? (opp?.rewardPoints ?? 24) : -12) : 0;
          const arenaCoinsGain = isArena ? (victory ? (opp?.rewardArenaCoins ?? 35) : 12) : 0;

          const bonusGold = isArena
            ? victory
              ? 160
              : 55
            : isAbyssal
            ? Math.min(460, 85 + abyssalWave * 35)
            : isGuildWar
            ? Math.min(440, 85 + Math.floor(guildWarScore / 10))
            : isBloodMoon
            ? Math.min(420, 80 + Math.floor(bloodMoonScore / 6))
            : isCrystalDefense || isWorldBoss
            ? 0
            : isCoopRaid
            ? victory
              ? 0
              : 45
            : isElementalTower
            ? elTowerFloor * 22
            : isGuildBoss
            ? Math.min(480, 90 + Math.floor(guildBossDamage / 250))
            : isDailyRift
            ? victory
              ? 160
              : 30
            : isBossRush
            ? bossRound * 70 + (victory ? 180 : 0)
            : isTower
            ? towerFloor * 15
            : victory
            ? 140 * summary.chapterId
            : 20;
          const bonusGems = isArena
            ? victory
              ? 18
              : 4
            : isAbyssal
            ? Math.min(28, 6 + abyssalWave * 2)
            : isGuildWar
            ? Math.min(26, 6 + Math.floor(guildWarScore / 180))
            : isBloodMoon
            ? Math.min(26, 6 + Math.floor(bloodMoonScore / 130))
            : isCrystalDefense || isWorldBoss || isCoopRaid
            ? 0
            : isElementalTower
            ? Math.floor(elTowerFloor / 3) * 5 + 3
            : isGuildBoss
            ? Math.min(24, 4 + Math.floor(guildBossDamage / 4000))
            : isDailyRift
            ? victory
              ? 18
              : 2
            : isBossRush
            ? bossRound * 6 + (victory ? 22 : 0)
            : isTower
            ? Math.floor(towerFloor / 3) * 4 + 2
            : victory
            ? 22 * summary.chapterId
            : 2;
          const totalGold = summary.gold + bonusGold;
          const totalGems = summary.gems + bonusGems;
          const starDustGain = summary.starDust ?? 0;
          const petEssenceGain = summary.petEssence ?? 0;
          const guildCoinGain = isGuildBoss
            ? Math.min(180, 25 + Math.floor(guildBossDamage / 600))
            : isGuildWar
            ? guildWarCoinsGain
            : 0;

          const rawSeasonXp = isArena
            ? victory
              ? 95
              : 40
            : isAbyssal
            ? 90 + abyssalWave * 22 + summary.kills
            : isGuildWar
            ? 95 + Math.min(150, Math.floor(guildWarScore / 20))
            : isBloodMoon
            ? (victory ? 120 : 50) + Math.min(160, Math.floor(bloodMoonScore / 15))
            : isCrystalDefense
            ? (victory ? 130 : crystalWavesCleared * 18) + summary.kills
            : isWorldBoss
            ? 110 + Math.min(150, Math.floor(worldBossDamage / 2000))
            : isCoopRaid
            ? victory
              ? 135
              : 45
            : isElementalTower
            ? elTowerFloor * 24 + summary.kills
            : isGuildBoss
            ? 85 + Math.min(140, Math.floor(guildBossDamage / 500))
            : isDailyRift
            ? (victory ? 120 : summary.stageReached * 28) + summary.kills * 2
            : isBossRush
            ? bossRound * 35 + summary.kills * 2
            : isTower
            ? towerFloor * 22 + summary.kills
            : victory
            ? 85 + summary.kills
            : summary.stageReached * 12 + summary.kills;
          const runSeasonXp = vipActiveRef.current ? Math.round(rawSeasonXp * 1.25) : rawSeasonXp;

          setRunSummary({
            ...summary,
            gold: totalGold,
            gems: totalGems,
            seasonXp: runSeasonXp,
            starDust: starDustGain,
            petEssence: petEssenceGain,
            wingFeathers: wingFeathersGain,
            mountShards: mountShardsGain,
            awakeningCrystals: awakeningCrystalsGain,
            artifactShards: artifactShardsGain,
            mysticTokens: mysticTokensGain,
            guildCoins: isGuildWar ? guildWarCoinsGain : undefined,
            worldBossLiveRank: isWorldBoss ? worldBossLiveRank : undefined,
            arenaRatingDelta: isArena ? arenaRatingDelta : undefined,
          });
          setPhase(victory ? GamePhase.VICTORY : GamePhase.GAME_OVER);

          setSave((prev) => {
            const bp = normalizeBattlePass(prev.battlePass);
            const career = normalizeCareer(prev.career);
            const hasVip = isVipActive(prev.vip);
            const actualXp = hasVip ? Math.round(rawSeasonXp * 1.25) : rawSeasonXp;
            const nextBp = { ...bp, xp: bp.xp + actualXp };
            const nextCareer = { ...career, totalRuns: career.totalRuns + 1 };
            const chName =
              CHAPTERS.find((c) => c.id === summary.chapterId)?.name ?? `Chương ${summary.chapterId}`;
            const elDef = ELEMENTAL_TOWER_MAP[elTowerId];
            const coopDef = COOP_DIFFICULTY_MAP[coopDiff];

            const historyEntry: RunHistoryEntry = {
              id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              mode: isAbyssal
                ? 'abyssal_gauntlet'
                : isGuildWar
                ? 'guild_war'
                : isBloodMoon
                ? 'blood_moon'
                : isCrystalDefense
                ? 'crystal_defense'
                : isWorldBoss
                ? 'world_boss'
                : isArena
                ? 'arena'
                : isCoopRaid
                ? 'coop_raid'
                : isElementalTower
                ? 'elemental_tower'
                : isGuildBoss
                ? 'guild_boss'
                : isDailyRift
                ? 'daily_rift'
                : isBossRush
                ? 'boss_rush'
                : isTower
                ? 'tower'
                : 'chapter',
              label: isAbyssal
                ? `Hố Sâu Đột Biến · Đợt ${abyssalWave}/${ABYSSAL_GAUNTLET_TOTAL_WAVES}`
                : isGuildWar
                ? `Chiến Trường Bang · ${guildWarScore.toLocaleString('vi-VN')} ĐB`
                : isBloodMoon
                ? `Đêm Trăng Máu · ${bloodMoonScore.toLocaleString('vi-VN')} HT`
                : isCrystalDefense
                ? `Thủ Thành Pha Lê · Đợt ${crystalWavesCleared}/${CRYSTAL_DEFENSE_TOTAL_WAVES}`
                : isWorldBoss
                ? `Boss Thế Giới · ${worldBossDamage.toLocaleString('vi-VN')} ST (#${worldBossLiveRank})`
                : isArena
                ? `Đấu Trường · ${summary.arenaOpponentName || opp?.name || 'Kình Địch'}`
                : isCoopRaid
                ? `Co-op Raid · ${coopDef.name}`
                : isElementalTower
                ? `${elDef.name} · Tầng ${elTowerFloor}`
                : isGuildBoss
                ? `Boss Bang Hội · ${guildBossDamage.toLocaleString('vi-VN')} ST`
                : isDailyRift
                ? `Bí Cảnh Hằng Ngày · Ải ${summary.stageReached}/3`
                : isBossRush
                ? `Săn Boss Liên Hoàn · Vòng ${bossRound}/5`
                : isTower
                ? `Tháp Vô Tận · Tầng ${towerFloor}`
                : `Chương ${summary.chapterId} · ${chName}`,
              stageReached: isArena || isGuildBoss || isWorldBoss
                ? 1
                : isAbyssal
                ? abyssalWave
                : isGuildWar
                ? guildWarNodes
                : isBloodMoon
                ? bloodMoonWave
                : isCrystalDefense
                ? crystalWavesCleared
                : isElementalTower
                ? elTowerFloor
                : isBossRush
                ? bossRound
                : isTower
                ? towerFloor
                : summary.stageReached,
              kills: summary.kills,
              maxCombo: summary.maxCombo ?? 0,
              gold: totalGold,
              gems: totalGems,
              victory,
              heroId: prev.selectedHeroId,
              timestamp: Date.now(),
            };
            const nextHistory = [historyEntry, ...(prev.runHistory ?? [])].slice(0, 15);

            if (isAbyssal) {
              const ab = normalizeAbyssalGauntlet(prev.abyssalGauntlet);
              const mx = normalizeMysticExchange(prev.mysticExchange);
              const nextShards = mx.artifactShards + artifactShardsGain;
              const nextTokens = mx.mysticTokens + mysticTokensGain;
              return {
                ...prev,
                gold: prev.gold + totalGold,
                gems: prev.gems + totalGems,
                artifactShards: nextShards,
                mysticExchange: {
                  ...mx,
                  artifactShards: nextShards,
                  mysticTokens: nextTokens,
                },
                abyssalGauntlet: {
                  ...ab,
                  bestWave: Math.max(ab.bestWave, abyssalWave),
                  bestScore: Math.max(ab.bestScore, abyssalScore),
                  totalClears: ab.totalClears + (victory ? 1 : 0),
                },
                battlePass: nextBp,
                career: nextCareer,
                runHistory: nextHistory,
              };
            }

            if (isGuildWar) {
              const gw = normalizeGuildWar(prev.guildWar);
              const mx = normalizeMysticExchange(prev.mysticExchange);
              const g = normalizeGuild(prev.guild);
              const nextShards = mx.artifactShards + artifactShardsGain;
              const nextTokens = mx.mysticTokens + mysticTokensGain;
              return {
                ...prev,
                gold: prev.gold + totalGold,
                gems: prev.gems + totalGems,
                artifactShards: nextShards,
                mysticExchange: {
                  ...mx,
                  artifactShards: nextShards,
                  mysticTokens: nextTokens,
                },
                guild: {
                  ...g,
                  guildCoins: g.guildCoins + guildCoinGain,
                },
                guildWar: {
                  ...gw,
                  weeklyScore: gw.weeklyScore + guildWarScore,
                  totalNodesCaptured: gw.totalNodesCaptured + guildWarNodes,
                },
                battlePass: nextBp,
                career: nextCareer,
                runHistory: nextHistory,
              };
            }

            if (isBloodMoon) {
              const bm = normalizeBloodMoon(prev.bloodMoon);
              return {
                ...prev,
                gold: prev.gold + totalGold,
                gems: prev.gems + totalGems,
                mountShards: (prev.mountShards ?? 0) + mountShardsGain,
                awakeningCrystals: (prev.awakeningCrystals ?? 0) + awakeningCrystalsGain,
                wingFeathers: (prev.wingFeathers ?? 0) + wingFeathersGain,
                bloodMoon: {
                  ...bm,
                  bestScore: Math.max(bm.bestScore, bloodMoonScore),
                  totalClears: bm.totalClears + (victory ? 1 : 0),
                },
                battlePass: nextBp,
                career: nextCareer,
                runHistory: nextHistory,
              };
            }

            if (isCrystalDefense) {
              const cd = normalizeCrystalDefense(prev.crystalDefense);
              return {
                ...prev,
                gold: prev.gold + totalGold,
                gems: prev.gems + totalGems,
                starDust: (prev.starDust ?? 0) + starDustGain,
                wingFeathers: (prev.wingFeathers ?? 0) + wingFeathersGain,
                crystalDefense: {
                  ...cd,
                  bestWave: Math.max(cd.bestWave, crystalWavesCleared),
                  totalClears: cd.totalClears + (victory ? 1 : 0),
                },
                battlePass: nextBp,
                career: nextCareer,
                runHistory: nextHistory,
              };
            }

            if (isWorldBoss) {
              const wb = normalizeWorldBoss(prev.worldBoss);
              return {
                ...prev,
                gold: prev.gold + totalGold,
                gems: prev.gems + totalGems,
                wingFeathers: (prev.wingFeathers ?? 0) + wingFeathersGain,
                worldBoss: {
                  ...wb,
                  bestSingleDamage: Math.max(wb.bestSingleDamage, worldBossDamage),
                  totalDailyDamage: wb.totalDailyDamage + worldBossDamage,
                },
                battlePass: nextBp,
                career: nextCareer,
                runHistory: nextHistory,
              };
            }

            if (isCoopRaid) {
              const coop = normalizeCoopRaid(prev.coopRaid);
              const playerTotal = summary.damageBreakdown
                ? summary.damageBreakdown.basic +
                  summary.damageBreakdown.ultimate +
                  summary.damageBreakdown.pet +
                  summary.damageBreakdown.elemental
                : 0;
              const alliesTotal = (summary.damageBreakdown?.coopAllies ?? []).reduce(
                (s, a) => s + a.damage,
                0
              );
              const teamDamage = Math.round(playerTotal + alliesTotal);
              const canClaimDaily = victory && coop.dailyRewardsLeft > 0;
              const diffRank: Record<CoopRaidDifficulty, number> = {
                normal: 1,
                heroic: 2,
                mythic: 3,
              };
              const prevBestDiff = coop.highestDifficulty ? diffRank[coop.highestDifficulty] : 0;
              const nextHighestDiff =
                victory && diffRank[coopDiff] > prevBestDiff ? coopDiff : coop.highestDifficulty;
              let nextSocketGems = normalizeSocketGems(prev.socketGems);
              if (canClaimDaily) {
                const randColor =
                  SOCKET_GEM_COLORS[Math.floor(Math.random() * SOCKET_GEM_COLORS.length)] ?? 'ruby';
                nextSocketGems = [...nextSocketGems, createSocketGem(randColor, coopDef.socketGemTier)];
              }
              return {
                ...prev,
                gold: prev.gold + totalGold,
                gems: prev.gems + totalGems,
                starDust:
                  (prev.starDust ?? 0) +
                  (canClaimDaily ? starDustGain : Math.round(starDustGain * 0.4)),
                petEssence:
                  (prev.petEssence ?? 0) +
                  (canClaimDaily ? petEssenceGain : Math.round(petEssenceGain * 0.4)),
                socketGems: nextSocketGems,
                coopRaid: {
                  ...coop,
                  dailyRewardsLeft: canClaimDaily
                    ? coop.dailyRewardsLeft - 1
                    : coop.dailyRewardsLeft,
                  highestDifficulty: nextHighestDiff,
                  bestTeamDamage: Math.max(coop.bestTeamDamage, teamDamage),
                  totalClears: coop.totalClears + (victory ? 1 : 0),
                },
                battlePass: nextBp,
                career: nextCareer,
                runHistory: nextHistory,
              };
            }

            if (isElementalTower) {
              const elState = normalizeElementalTowers(prev.elementalTowers);
              return {
                ...prev,
                gold: prev.gold + totalGold,
                gems: prev.gems + totalGems,
                starDust: (prev.starDust ?? 0) + starDustGain,
                petEssence: (prev.petEssence ?? 0) + petEssenceGain,
                elementalTowers: {
                  ...elState,
                  [elTowerId]: Math.max(elState[elTowerId] ?? 0, elTowerFloor),
                },
                battlePass: nextBp,
                career: nextCareer,
                runHistory: nextHistory,
              };
            }

            if (isArena) {
              const ar = normalizeArena(prev.arena);
              const nextRating = Math.max(900, ar.rating + arenaRatingDelta);
              return {
                ...prev,
                gold: prev.gold + totalGold,
                gems: prev.gems + totalGems,
                arena: {
                  ...ar,
                  rating: nextRating,
                  bestRating: Math.max(ar.bestRating, nextRating),
                  wins: ar.wins + (victory ? 1 : 0),
                  losses: ar.losses + (victory ? 0 : 1),
                  streak: victory ? ar.streak + 1 : 0,
                  arenaCoins: ar.arenaCoins + arenaCoinsGain,
                },
                battlePass: nextBp,
                career: nextCareer,
                runHistory: nextHistory,
              };
            }

            if (isGuildBoss) {
              const g = normalizeGuild(prev.guild);
              return {
                ...prev,
                gold: prev.gold + totalGold,
                gems: prev.gems + totalGems,
                starDust: (prev.starDust ?? 0) + starDustGain,
                petEssence: (prev.petEssence ?? 0) + petEssenceGain,
                guild: {
                  ...g,
                  guildCoins: g.guildCoins + guildCoinGain,
                  bestGuildBossDamage: Math.max(g.bestGuildBossDamage, guildBossDamage),
                  totalGuildBossDamage: g.totalGuildBossDamage + guildBossDamage,
                },
                battlePass: nextBp,
                career: nextCareer,
                runHistory: nextHistory,
              };
            }

            if (isDailyRift) {
              const rift = normalizeDailyRift(prev.dailyRift);
              return {
                ...prev,
                gold: prev.gold + totalGold,
                gems: prev.gems + totalGems,
                starDust: (prev.starDust ?? 0) + starDustGain,
                petEssence: (prev.petEssence ?? 0) + petEssenceGain,
                dailyRift: {
                  ...rift,
                  clearedToday: rift.clearedToday || victory,
                },
                battlePass: nextBp,
                career: nextCareer,
                runHistory: nextHistory,
              };
            }

            if (isBossRush) {
              return {
                ...prev,
                gold: prev.gold + totalGold,
                gems: prev.gems + totalGems,
                bestBossRushRound: Math.max(prev.bestBossRushRound ?? 0, bossRound),
                battlePass: nextBp,
                career: nextCareer,
                runHistory: nextHistory,
              };
            }

            if (isTower) {
              return {
                ...prev,
                gold: prev.gold + totalGold,
                gems: prev.gems + totalGems,
                bestTowerFloor: Math.max(prev.bestTowerFloor ?? 0, towerFloor),
                battlePass: nextBp,
                career: nextCareer,
                runHistory: nextHistory,
              };
            }

            const prevBest = prev.bestStagePerChapter[summary.chapterId] ?? 0;
            return {
              ...prev,
              gold: prev.gold + totalGold,
              gems: prev.gems + totalGems,
              highestChapterCleared: victory
                ? Math.max(prev.highestChapterCleared, summary.chapterId)
                : prev.highestChapterCleared,
              bestStagePerChapter: {
                ...prev.bestStagePerChapter,
                [summary.chapterId]: Math.max(prevBest, summary.stageReached),
              },
              battlePass: nextBp,
              career: nextCareer,
              runHistory: nextHistory,
            };
          });
        },
        onProgressEvent: ({ killsDelta, stageCleared, bossKilled, maxCombo, seenEnemyKind }) => {
          setSave((prev) => {
            const dq = normalizeDailyQuests(prev.dailyQuests);
            const career = normalizeCareer(prev.career);
            const bp = normalizeBattlePass(prev.battlePass);
            const rawXp =
              (killsDelta ?? 0) * 2 + (stageCleared ? 16 : 0) + (bossKilled ? 40 : 0);
            const xpGain = isVipActive(prev.vip) ? Math.round(rawXp * 1.25) : rawXp;
            const nextSeen =
              seenEnemyKind && !career.seenEnemies.includes(seenEnemyKind)
                ? [...career.seenEnemies, seenEnemyKind]
                : career.seenEnemies;

            return {
              ...prev,
              dailyQuests: {
                ...dq,
                kills: dq.kills + (killsDelta ?? 0),
                stages: dq.stages + (stageCleared ? 1 : 0),
              },
              career: {
                ...career,
                totalKills: career.totalKills + (killsDelta ?? 0),
                totalBossesKilled: career.totalBossesKilled + (bossKilled ? 1 : 0),
                maxComboEver: Math.max(career.maxComboEver, maxCombo ?? 0),
                seenEnemies: nextSeen,
              },
              battlePass: {
                ...bp,
                xp: bp.xp + xpGain,
              },
            };
          });
        },
      },
      playerStats,
      heroVisualCfg
    );

    engineRef.current = engine;
    engine.applyRuntimeSettings(normalizeSettings(save.settings));
    return () => {
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
      engine.dispose();
      engineRef.current = null;
    };
    // Mount once so React HUD updates never tear down the WebGL canvas
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync hero visual loadout when hero/gear/runes change
  useEffect(() => {
    engineRef.current?.updateLoadoutAppearance(playerStats, heroVisualCfg);
  }, [playerStats, heroVisualCfg]);

  // Sync 3D camera lobby framing with active lobby tab
  useEffect(() => {
    const mode =
      activeLobbyTab === 'battle'
        ? 'battle'
        : activeLobbyTab === 'gear'
        ? 'gear'
        : activeLobbyTab === 'heroes'
        ? 'heroes'
        : 'vault';
    engineRef.current?.setLobbyViewMode(mode);
  }, [activeLobbyTab]);

  // Sync runtime 3D graphics, shake & damage number preferences
  useEffect(() => {
    engineRef.current?.applyRuntimeSettings(currentSettings);
  }, [currentSettings]);

  // Clean up expired floating damage numbers
  useEffect(() => {
    if (damages.length === 0) return;
    const timer = window.setInterval(() => {
      const now = performance.now();
      setDamages((prev) => prev.filter((d) => now - d.createdAt < 640));
    }, 100);
    return () => clearInterval(timer);
  }, [damages.length]);

  const handleStartTrial = useCallback(() => {
    if (selectedChapterId > save.highestChapterCleared + 1) return;
    soundEngine.unlock();
    setEnteredGame(true);
    setRewardsModalTab(null);
    setTalentsModalOpen(false);
    setMailModalOpen(false);
    setGachaReveal(null);
    setPreviewHeroId(null);
    setRunSummary(null);
    setDamages([]);
    setTransitionState({ chapterId: selectedChapterId, isTowerMode: false, isBossRushMode: false });
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = window.setTimeout(() => {
      setTransitionState(null);
    }, 560);
    setPhase(GamePhase.PLAYING);
    engineRef.current?.startChapter(selectedChapterId, playerStats);
  }, [selectedChapterId, save.highestChapterCleared, playerStats]);

  const handleStartTower = useCallback(() => {
    soundEngine.unlock();
    setEnteredGame(true);
    setRewardsModalTab(null);
    setTalentsModalOpen(false);
    setMailModalOpen(false);
    setGachaReveal(null);
    setPreviewHeroId(null);
    setRunSummary(null);
    setDamages([]);
    setTransitionState({ chapterId: 1, isTowerMode: true, isBossRushMode: false });
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = window.setTimeout(() => {
      setTransitionState(null);
    }, 560);
    setPhase(GamePhase.PLAYING);
    engineRef.current?.startEndlessTower(playerStats);
  }, [playerStats]);

  const handleStartBossRush = useCallback(() => {
    soundEngine.unlock();
    setEnteredGame(true);
    setRewardsModalTab(null);
    setTalentsModalOpen(false);
    setMailModalOpen(false);
    setVipModalOpen(false);
    setForgeConfig((prev) => ({ ...prev, open: false }));
    setGuildModalOpen(false);
    setDestinyWheelOpen(false);
    setGachaReveal(null);
    setPreviewHeroId(null);
    setRunSummary(null);
    setDamages([]);
    setTransitionState({ chapterId: 5, isTowerMode: false, isBossRushMode: true });
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = window.setTimeout(() => {
      setTransitionState(null);
    }, 560);
    setPhase(GamePhase.PLAYING);
    engineRef.current?.startBossRush(playerStats);
  }, [playerStats]);

  const handleStartDailyRift = useCallback(() => {
    const riftState = normalizeDailyRift(save.dailyRift);
    if (riftState.runsRemaining <= 0) return;

    const todayPair = getDailyRiftPair(getTodayKey());
    soundEngine.unlock();
    setSave((prev) => {
      const r = normalizeDailyRift(prev.dailyRift);
      if (r.runsRemaining <= 0) return prev;
      return {
        ...prev,
        dailyRift: { ...r, runsRemaining: r.runsRemaining - 1 },
      };
    });

    setEnteredGame(true);
    setRewardsModalTab(null);
    setTalentsModalOpen(false);
    setMailModalOpen(false);
    setVipModalOpen(false);
    setForgeConfig((prev) => ({ ...prev, open: false }));
    setGuildModalOpen(false);
    setDestinyWheelOpen(false);
    setGachaReveal(null);
    setPreviewHeroId(null);
    setRunSummary(null);
    setDamages([]);
    setTransitionState({
      chapterId: 3,
      isTowerMode: false,
      isBossRushMode: false,
      isDailyRiftMode: true,
      dailyRiftTitle: todayPair.title,
    });
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = window.setTimeout(() => {
      setTransitionState(null);
    }, 560);
    setPhase(GamePhase.PLAYING);
    engineRef.current?.startDailyRift(playerStats, todayPair);
  }, [save.dailyRift, playerStats]);

  const handleStartGuildBoss = useCallback(() => {
    const guild = normalizeGuild(save.guild);
    if (guild.bossRunsRemaining <= 0) return;

    soundEngine.unlock();
    setSave((prev) => {
      const g = normalizeGuild(prev.guild);
      if (g.bossRunsRemaining <= 0) return prev;
      return {
        ...prev,
        guild: { ...g, bossRunsRemaining: g.bossRunsRemaining - 1 },
      };
    });

    setEnteredGame(true);
    setRewardsModalTab(null);
    setTalentsModalOpen(false);
    setMailModalOpen(false);
    setVipModalOpen(false);
    setForgeConfig((prev) => ({ ...prev, open: false }));
    setGuildModalOpen(false);
    setDestinyWheelOpen(false);
    setGachaReveal(null);
    setPreviewHeroId(null);
    setRunSummary(null);
    setDamages([]);
    setTransitionState({
      chapterId: 6,
      isTowerMode: false,
      isBossRushMode: false,
      isGuildBossMode: true,
    });
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = window.setTimeout(() => {
      setTransitionState(null);
    }, 560);
    setPhase(GamePhase.PLAYING);
    engineRef.current?.startGuildBossRaid(playerStats);
  }, [save.guild, playerStats]);

  const handleStartArenaDuel = useCallback(
    (opponent: ArenaOpponent) => {
      const ar = normalizeArena(save.arena);
      if (ar.ticketsRemaining <= 0) return;

      soundEngine.unlock();
      setSave((prev) => {
        const cur = normalizeArena(prev.arena);
        if (cur.ticketsRemaining <= 0) return prev;
        return {
          ...prev,
          arena: { ...cur, ticketsRemaining: cur.ticketsRemaining - 1 },
        };
      });

      activeArenaOpponentRef.current = opponent;
      setActiveArenaOpponent(opponent);
      setEnteredGame(true);
      setRewardsModalTab(null);
      setTalentsModalOpen(false);
      setMailModalOpen(false);
      setVipModalOpen(false);
      setForgeConfig((prev) => ({ ...prev, open: false }));
      setGuildModalOpen(false);
      setDestinyWheelOpen(false);
      setNightMarketOpen(false);
      setArenaModalOpen(false);
      setGachaReveal(null);
      setPreviewHeroId(null);
      setRunSummary(null);
      setDamages([]);
      setTransitionState({
        chapterId: 4,
        isTowerMode: false,
        isBossRushMode: false,
        isArenaMode: true,
        arenaOpponentName: opponent.name,
      });
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
      transitionTimerRef.current = window.setTimeout(() => {
        setTransitionState(null);
      }, 560);
      setPhase(GamePhase.PLAYING);
      engineRef.current?.startArenaDuel(playerStats, opponent);
    },
    [save.arena, playerStats]
  );

  const handleStartCoopRaid = useCallback(
    (difficulty: CoopRaidDifficulty) => {
      soundEngine.unlock();
      setSelectedCoopDifficulty(difficulty);
      setEnteredGame(true);
      setRewardsModalTab(null);
      setTalentsModalOpen(false);
      setConstellationModalOpen(false);
      setMailModalOpen(false);
      setVipModalOpen(false);
      setForgeConfig((prev) => ({ ...prev, open: false }));
      setGuildModalOpen(false);
      setDestinyWheelOpen(false);
      setNightMarketOpen(false);
      setArenaModalOpen(false);
      setGachaReveal(null);
      setPreviewHeroId(null);
      setRunSummary(null);
      setDamages([]);
      setTransitionState({
        chapterId: difficulty === 'mythic' ? 11 : difficulty === 'heroic' ? 7 : 4,
        isTowerMode: false,
        isBossRushMode: false,
        isCoopRaidMode: true,
        coopDifficulty: difficulty,
      });
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
      transitionTimerRef.current = window.setTimeout(() => {
        setTransitionState(null);
      }, 560);
      setPhase(GamePhase.PLAYING);
      engineRef.current?.startCoopRaid(playerStats, difficulty);
    },
    [playerStats]
  );

  const handleStartElementalTower = useCallback(
    (towerId: ElementalTowerId) => {
      soundEngine.unlock();
      setSelectedElementalTower(towerId);
      setEnteredGame(true);
      setRewardsModalTab(null);
      setTalentsModalOpen(false);
      setConstellationModalOpen(false);
      setMailModalOpen(false);
      setVipModalOpen(false);
      setForgeConfig((prev) => ({ ...prev, open: false }));
      setGuildModalOpen(false);
      setDestinyWheelOpen(false);
      setNightMarketOpen(false);
      setArenaModalOpen(false);
      setGachaReveal(null);
      setPreviewHeroId(null);
      setRunSummary(null);
      setDamages([]);
      const elDef = ELEMENTAL_TOWER_MAP[towerId];
      setTransitionState({
        chapterId: elDef.chapterId,
        isTowerMode: false,
        isBossRushMode: false,
        isElementalTowerMode: true,
        elementalTowerId: towerId,
      });
      if (transitionTimerRef.current) {
        window.clearTimeout(transitionTimerRef.current);
      }
      transitionTimerRef.current = window.setTimeout(() => {
        setTransitionState(null);
      }, 560);
      setPhase(GamePhase.PLAYING);
      engineRef.current?.startElementalTower(playerStats, towerId, 1);
    },
    [playerStats]
  );

  const handleStartCrystalDefense = useCallback(() => {
    const cd = normalizeCrystalDefense(save.crystalDefense);
    if (cd.runsRemaining <= 0) return;

    soundEngine.unlock();
    setSave((prev) => {
      const cur = normalizeCrystalDefense(prev.crystalDefense);
      if (cur.runsRemaining <= 0) return prev;
      return {
        ...prev,
        crystalDefense: { ...cur, runsRemaining: cur.runsRemaining - 1 },
      };
    });

    setEnteredGame(true);
    setRewardsModalTab(null);
    setTalentsModalOpen(false);
    setConstellationModalOpen(false);
    setMailModalOpen(false);
    setVipModalOpen(false);
    setForgeConfig((prev) => ({ ...prev, open: false }));
    setGuildModalOpen(false);
    setDestinyWheelOpen(false);
    setNightMarketOpen(false);
    setArenaModalOpen(false);
    setAuctionModalOpen(false);
    setHonorBoardOpen(false);
    setGachaReveal(null);
    setPreviewHeroId(null);
    setRunSummary(null);
    setDamages([]);
    setTransitionState({
      chapterId: 3,
      isTowerMode: false,
      isBossRushMode: false,
      isCrystalDefenseMode: true,
    });
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = window.setTimeout(() => {
      setTransitionState(null);
    }, 560);
    setPhase(GamePhase.PLAYING);
    engineRef.current?.startCrystalDefense(playerStats);
  }, [save.crystalDefense, playerStats]);

  const handleStartWorldBoss = useCallback(() => {
    const wb = normalizeWorldBoss(save.worldBoss);
    if (wb.dailyRunsRemaining <= 0) return;

    soundEngine.unlock();
    setSave((prev) => {
      const cur = normalizeWorldBoss(prev.worldBoss);
      if (cur.dailyRunsRemaining <= 0) return prev;
      return {
        ...prev,
        worldBoss: { ...cur, dailyRunsRemaining: cur.dailyRunsRemaining - 1 },
      };
    });

    setEnteredGame(true);
    setRewardsModalTab(null);
    setTalentsModalOpen(false);
    setConstellationModalOpen(false);
    setMailModalOpen(false);
    setVipModalOpen(false);
    setForgeConfig((prev) => ({ ...prev, open: false }));
    setGuildModalOpen(false);
    setDestinyWheelOpen(false);
    setNightMarketOpen(false);
    setArenaModalOpen(false);
    setAuctionModalOpen(false);
    setHonorBoardOpen(false);
    setGachaReveal(null);
    setPreviewHeroId(null);
    setRunSummary(null);
    setDamages([]);
    setTransitionState({
      chapterId: 12,
      isTowerMode: false,
      isBossRushMode: false,
      isWorldBossMode: true,
    });
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = window.setTimeout(() => {
      setTransitionState(null);
    }, 560);
    setPhase(GamePhase.PLAYING);
    engineRef.current?.startWorldBoss(playerStats);
  }, [save.worldBoss, playerStats]);

  const handleStartBloodMoon = useCallback(() => {
    const bm = normalizeBloodMoon(save.bloodMoon);
    if (bm.dailyRunsRemaining <= 0) return;

    soundEngine.unlock();
    setSave((prev) => {
      const cur = normalizeBloodMoon(prev.bloodMoon);
      if (cur.dailyRunsRemaining <= 0) return prev;
      return {
        ...prev,
        bloodMoon: { ...cur, dailyRunsRemaining: cur.dailyRunsRemaining - 1 },
      };
    });

    setEnteredGame(true);
    setWardrobeOpen(false);
    setWardrobePreview({});
    setDispatchOpen(false);
    setRewardsModalTab(null);
    setTalentsModalOpen(false);
    setConstellationModalOpen(false);
    setMailModalOpen(false);
    setVipModalOpen(false);
    setForgeConfig((prev) => ({ ...prev, open: false }));
    setGuildModalOpen(false);
    setDestinyWheelOpen(false);
    setNightMarketOpen(false);
    setArenaModalOpen(false);
    setAuctionModalOpen(false);
    setHonorBoardOpen(false);
    setGachaReveal(null);
    setPreviewHeroId(null);
    setRunSummary(null);
    setDamages([]);
    setTransitionState({
      chapterId: 10,
      isTowerMode: false,
      isBossRushMode: false,
      isBloodMoonMode: true,
    });
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = window.setTimeout(() => {
      setTransitionState(null);
    }, 560);
    setPhase(GamePhase.PLAYING);
    engineRef.current?.startBloodMoonSurvival(playerStats);
  }, [save.bloodMoon, playerStats]);

  const handleStartAbyssalGauntlet = useCallback(() => {
    const ab = normalizeAbyssalGauntlet(save.abyssalGauntlet);
    if (ab.dailyRunsRemaining <= 0) return;

    soundEngine.unlock();
    setSave((prev) => {
      const cur = normalizeAbyssalGauntlet(prev.abyssalGauntlet);
      if (cur.dailyRunsRemaining <= 0) return prev;
      return {
        ...prev,
        abyssalGauntlet: { ...cur, dailyRunsRemaining: cur.dailyRunsRemaining - 1 },
      };
    });

    setEnteredGame(true);
    setWardrobeOpen(false);
    setWardrobePreview({});
    setDispatchOpen(false);
    setRewardsModalTab(null);
    setTalentsModalOpen(false);
    setConstellationModalOpen(false);
    setMailModalOpen(false);
    setVipModalOpen(false);
    setForgeConfig((prev) => ({ ...prev, open: false }));
    setGuildModalOpen(false);
    setDestinyWheelOpen(false);
    setNightMarketOpen(false);
    setArenaModalOpen(false);
    setAuctionModalOpen(false);
    setHonorBoardOpen(false);
    setGachaReveal(null);
    setPreviewHeroId(null);
    setRunSummary(null);
    setDamages([]);
    setTransitionState({
      chapterId: 9,
      isTowerMode: false,
      isBossRushMode: false,
      isAbyssalMode: true,
    });
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = window.setTimeout(() => {
      setTransitionState(null);
    }, 560);
    setPhase(GamePhase.PLAYING);
    engineRef.current?.startAbyssalGauntlet(playerStats);
  }, [save.abyssalGauntlet, playerStats]);

  const handleStartGuildWar = useCallback(() => {
    const gw = normalizeGuildWar(save.guildWar);
    if (gw.dailyRunsRemaining <= 0) return;

    soundEngine.unlock();
    setSave((prev) => {
      const cur = normalizeGuildWar(prev.guildWar);
      if (cur.dailyRunsRemaining <= 0) return prev;
      return {
        ...prev,
        guildWar: { ...cur, dailyRunsRemaining: cur.dailyRunsRemaining - 1 },
      };
    });

    setEnteredGame(true);
    setWardrobeOpen(false);
    setWardrobePreview({});
    setDispatchOpen(false);
    setRewardsModalTab(null);
    setTalentsModalOpen(false);
    setConstellationModalOpen(false);
    setMailModalOpen(false);
    setVipModalOpen(false);
    setForgeConfig((prev) => ({ ...prev, open: false }));
    setGuildModalOpen(false);
    setDestinyWheelOpen(false);
    setNightMarketOpen(false);
    setArenaModalOpen(false);
    setAuctionModalOpen(false);
    setHonorBoardOpen(false);
    setGachaReveal(null);
    setPreviewHeroId(null);
    setRunSummary(null);
    setDamages([]);
    setTransitionState({
      chapterId: 8,
      isTowerMode: false,
      isBossRushMode: false,
      isGuildWarMode: true,
    });
    if (transitionTimerRef.current) {
      window.clearTimeout(transitionTimerRef.current);
    }
    transitionTimerRef.current = window.setTimeout(() => {
      setTransitionState(null);
    }, 560);
    setPhase(GamePhase.PLAYING);
    engineRef.current?.startGuildWarBattle(playerStats);
  }, [save.guildWar, playerStats]);

  const handleQuickSweepChapter = useCallback((chapterId: number) => {
    const ch = CHAPTERS.find((c) => c.id === chapterId);
    if (!ch) return;
    setSave((prev) => {
      if (chapterId > prev.highestChapterCleared) return prev;
      const hasVip = isVipActive(prev.vip);
      const sweeps = normalizeDailySweeps(prev.dailySweeps, hasVip);
      if (sweeps.remaining <= 0) return prev;

      const goldGain = 95 + chapterId * 42;
      const gemsGain = 6 + chapterId * 2;
      const rawXpGain = 55 + chapterId * 8;
      const xpGain = hasVip ? Math.round(rawXpGain * 1.25) : rawXpGain;
      let bonusGear: GearInstance | undefined;
      if (Math.random() < 0.45) {
        bonusGear = rollChestGear(false, chapterId >= 4 ? Rarity.RARE : undefined);
      }

      const bp = normalizeBattlePass(prev.battlePass);
      const dq = normalizeDailyQuests(prev.dailyQuests);
      soundEngine.playVictory();
      setSweepResult({
        chapterName: `Chương ${ch.id} · ${ch.name}`,
        gold: goldGain,
        gems: gemsGain,
        seasonXp: xpGain,
        bonusGear,
      });

      return {
        ...prev,
        gold: prev.gold + goldGain,
        gems: prev.gems + gemsGain,
        inventory: bonusGear ? [...prev.inventory, bonusGear] : prev.inventory,
        dailySweeps: { ...sweeps, remaining: sweeps.remaining - 1 },
        battlePass: { ...bp, xp: bp.xp + xpGain },
        dailyQuests: { ...dq, stages: dq.stages + 3 },
      };
    });
  }, []);

  const handleSelectChapter = useCallback((chapterId: number) => {
    setSelectedChapterId(chapterId);
    engineRef.current?.selectChapterPreview(chapterId);
  }, []);

  const handleToggleMute = useCallback(() => {
    setSave((prev) => {
      const nextMuted = !prev.muted;
      soundEngine.setMuted(nextMuted);
      return { ...prev, muted: nextMuted };
    });
  }, []);

  const handlePause = useCallback(() => {
    if (phase === GamePhase.PLAYING) {
      setPhase(GamePhase.PAUSED);
      engineRef.current?.setPhase(GamePhase.PAUSED);
    } else if (phase === GamePhase.PAUSED) {
      setPhase(GamePhase.PLAYING);
      engineRef.current?.setPhase(GamePhase.PLAYING);
    }
  }, [phase]);

  const handleReturnTitle = useCallback(() => {
    setPhase(GamePhase.TITLE);
    setDamages([]);
    engineRef.current?.setPhase(GamePhase.TITLE);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') {
        if (phase === GamePhase.PLAYING || phase === GamePhase.PAUSED) {
          handlePause();
        }
      } else if (
        (e.code === 'Enter' || e.code === 'Space') &&
        phase === GamePhase.TITLE &&
        enteredGame &&
        activeLobbyTab === 'battle' &&
        !rewardsModalTab &&
        !talentsModalOpen &&
        !constellationModalOpen &&
        !battlePassOpen &&
        !vipModalOpen &&
        !forgeConfig.open &&
        !guildModalOpen &&
        !destinyWheelOpen &&
        !nightMarketOpen &&
        !arenaModalOpen &&
        !auctionModalOpen &&
        !honorBoardOpen &&
        !wardrobeOpen &&
        !dispatchOpen &&
        !profileModalTab &&
        !mailModalOpen &&
        !sweepResult &&
        !settingsOpen &&
        !onboardingOpen &&
        !gachaReveal
      ) {
        e.preventDefault();
        if (gameMode === 'abyssal_gauntlet') {
          handleStartAbyssalGauntlet();
        } else if (gameMode === 'guild_war') {
          handleStartGuildWar();
        } else if (gameMode === 'blood_moon') {
          handleStartBloodMoon();
        } else if (gameMode === 'crystal_defense') {
          handleStartCrystalDefense();
        } else if (gameMode === 'world_boss') {
          handleStartWorldBoss();
        } else if (gameMode === 'coop_raid') {
          handleStartCoopRaid(selectedCoopDifficulty);
        } else if (gameMode === 'elemental_tower') {
          handleStartElementalTower(selectedElementalTower);
        } else if (gameMode === 'daily_rift') {
          handleStartDailyRift();
        } else if (gameMode === 'tower') {
          handleStartTower();
        } else if (gameMode === 'boss_rush') {
          handleStartBossRush();
        } else {
          handleStartTrial();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    phase,
    enteredGame,
    activeLobbyTab,
    rewardsModalTab,
    talentsModalOpen,
    constellationModalOpen,
    battlePassOpen,
    vipModalOpen,
    forgeConfig.open,
    guildModalOpen,
    destinyWheelOpen,
    nightMarketOpen,
    arenaModalOpen,
    auctionModalOpen,
    honorBoardOpen,
    wardrobeOpen,
    dispatchOpen,
    profileModalTab,
    mailModalOpen,
    sweepResult,
    settingsOpen,
    onboardingOpen,
    gachaReveal,
    gameMode,
    selectedCoopDifficulty,
    selectedElementalTower,
    handlePause,
    handleStartTrial,
    handleStartTower,
    handleStartBossRush,
    handleStartDailyRift,
    handleStartCoopRaid,
    handleStartElementalTower,
    handleStartCrystalDefense,
    handleStartWorldBoss,
    handleStartBloodMoon,
    handleStartAbyssalGauntlet,
    handleStartGuildWar,
  ]);

  // Hero Handlers
  const handleSelectHero = (heroId: HeroId) => {
    setSave((prev) => {
      if (!prev.unlockedHeroes.includes(heroId)) return prev;
      return { ...prev, selectedHeroId: heroId };
    });
  };

  const handleUnlockHero = (heroId: HeroId, currency: 'gold' | 'gems') => {
    const hero = HERO_MAP[heroId];
    if (!hero) return;
    setSave((prev) => {
      if (prev.unlockedHeroes.includes(heroId)) return prev;
      if (currency === 'gold' && prev.gold < hero.unlockGold) return prev;
      if (currency === 'gems' && prev.gems < hero.unlockGems) return prev;
      soundEngine.playVictory();
      return {
        ...prev,
        gold: currency === 'gold' ? prev.gold - hero.unlockGold : prev.gold,
        gems: currency === 'gems' ? prev.gems - hero.unlockGems : prev.gems,
        nightMarket: addGemsSpent(prev, currency === 'gems' ? hero.unlockGems : 0),
        unlockedHeroes: [...prev.unlockedHeroes, heroId],
        selectedHeroId: heroId,
      };
    });
  };

  const handleUpgradeHeroStar = (heroId: HeroId) => {
    setSave((prev) => {
      const currentStar = prev.heroStars[heroId] ?? 0;
      if (currentStar >= 5) return prev;
      const cost = getHeroStarUpgradeCost(currentStar);
      if (prev.gold < cost.gold || prev.gems < cost.gems) return prev;
      soundEngine.playLevelUp();
      const dq = normalizeDailyQuests(prev.dailyQuests);
      return {
        ...prev,
        gold: prev.gold - cost.gold,
        gems: prev.gems - cost.gems,
        nightMarket: addGemsSpent(prev, cost.gems),
        heroStars: { ...prev.heroStars, [heroId]: currentStar + 1 },
        dailyQuests: { ...dq, upgrades: dq.upgrades + 1 },
      };
    });
  };

  // Gear Handlers
  const handleEquip = (uid: string) => {
    setSave((prev) => {
      const item = prev.inventory.find((g) => g.uid === uid);
      if (!item) return prev;
      const slot = GEAR_TEMPLATES[item.templateId]?.slot;
      if (!slot) return prev;
      return {
        ...prev,
        equipped: { ...prev.equipped, [slot]: uid },
      };
    });
  };

  const handleUpgrade = (uid: string) => {
    setSave((prev) => {
      const idx = prev.inventory.findIndex((g) => g.uid === uid);
      if (idx === -1) return prev;
      const item = prev.inventory[idx];
      const maxLv = RARITY_META[item.rarity].maxLevel;
      const cost = getUpgradeCost(item);
      if (item.level >= maxLv || prev.gold < cost) return prev;
      const nextInv = [...prev.inventory];
      nextInv[idx] = { ...item, level: item.level + 1 };
      soundEngine.playLevelUp();
      const dq = normalizeDailyQuests(prev.dailyQuests);
      return {
        ...prev,
        gold: prev.gold - cost,
        inventory: nextInv,
        dailyQuests: { ...dq, upgrades: dq.upgrades + 1 },
      };
    });
  };

  const handleFuse = (uid: string) => {
    setSave((prev) => {
      const target = prev.inventory.find((g) => g.uid === uid);
      if (!target) return prev;
      const rIdx = RARITY_ORDER.indexOf(target.rarity);
      if (rIdx >= RARITY_ORDER.length - 1) return prev;

      const matching = prev.inventory.filter(
        (g) => g.templateId === target.templateId && g.rarity === target.rarity
      );
      if (matching.length < 3) return prev;

      const others = matching
        .filter((g) => g.uid !== target.uid)
        .sort((a, b) => {
          const aEq = Object.values(prev.equipped).includes(a.uid) ? 1 : 0;
          const bEq = Object.values(prev.equipped).includes(b.uid) ? 1 : 0;
          return aEq - bEq;
        })
        .slice(0, 2);

      const consumedUids = new Set([target.uid, ...others.map((o) => o.uid)]);
      const maxLv = Math.max(target.level, ...others.map((o) => o.level));
      const upgradedItem: GearInstance = {
        uid: target.uid,
        templateId: target.templateId,
        rarity: RARITY_ORDER[rIdx + 1],
        level: maxLv,
        substats: target.substats,
        awakeningLevel: Math.max(
          target.awakeningLevel ?? 0,
          ...others.map((o) => o.awakeningLevel ?? 0)
        ),
        socketedGems: target.socketedGems,
      };

      const nextInventory = prev.inventory.filter((g) => !consumedUids.has(g.uid));
      nextInventory.push(upgradedItem);

      const slot = GEAR_TEMPLATES[target.templateId].slot;
      const wasAnyEquipped =
        prev.equipped[slot] === target.uid ||
        others.some((o) => prev.equipped[slot] === o.uid);

      soundEngine.playVictory();
      return {
        ...prev,
        inventory: nextInventory,
        equipped: wasAnyEquipped
          ? { ...prev.equipped, [slot]: upgradedItem.uid }
          : prev.equipped,
      };
    });
  };

  const handleAutoEquipBest = useCallback(() => {
    soundEngine.playLevelUp();
    setSave((prev) => {
      const socketPool = normalizeSocketGems(prev.socketGems);
      const nextEquipped = { ...prev.equipped };
      for (const slot of Object.values(GearSlot)) {
        const candidates = prev.inventory.filter(
          (g) => GEAR_TEMPLATES[g.templateId]?.slot === slot
        );
        if (candidates.length === 0) continue;
        candidates.sort(
          (a, b) => getGearPowerScore(b, socketPool) - getGearPowerScore(a, socketPool)
        );
        nextEquipped[slot] = candidates[0].uid;
      }
      return { ...prev, equipped: nextEquipped };
    });
  }, []);

  const handleBulkFuseGear = useCallback(() => {
    setSave((prev) => {
      let inv = [...prev.inventory];
      let eq = { ...prev.equipped };
      let fusedAny = false;

      let progress = true;
      while (progress) {
        progress = false;
        for (const rIdx of [0, 1, 2, 3]) {
          const rarity = RARITY_ORDER[rIdx];
          const nextRarity = RARITY_ORDER[rIdx + 1];
          const groups = new Map<string, GearInstance[]>();
          for (const g of inv) {
            if (g.rarity !== rarity) continue;
            const list = groups.get(g.templateId) ?? [];
            list.push(g);
            groups.set(g.templateId, list);
          }
          for (const [tplId, group] of groups.entries()) {
            if (group.length < 3) continue;
            const eqSet = new Set(Object.values(eq));
            group.sort((a, b) => {
              const aEq = eqSet.has(a.uid) ? 1 : 0;
              const bEq = eqSet.has(b.uid) ? 1 : 0;
              if (bEq !== aEq) return bEq - aEq;
              return b.level - a.level;
            });
            const [main, m2, m3] = group;
            const consumed = new Set([main.uid, m2.uid, m3.uid]);
            const upgraded: GearInstance = {
              uid: main.uid,
              templateId: tplId,
              rarity: nextRarity,
              level: Math.max(main.level, m2.level, m3.level),
              substats: main.substats,
              awakeningLevel: Math.max(
                main.awakeningLevel ?? 0,
                m2.awakeningLevel ?? 0,
                m3.awakeningLevel ?? 0
              ),
              socketedGems: main.socketedGems,
            };
            inv = inv.filter((g) => !consumed.has(g.uid));
            inv.push(upgraded);
            const slot = GEAR_TEMPLATES[tplId]?.slot;
            if (slot && (eq[slot] === m2.uid || eq[slot] === m3.uid)) {
              eq[slot] = upgraded.uid;
            }
            fusedAny = true;
            progress = true;
            break;
          }
          if (progress) break;
        }
      }

      if (!fusedAny) return prev;
      soundEngine.playVictory();
      return { ...prev, inventory: inv, equipped: eq };
    });
  }, []);

  // Welfare & Gacha Chest Handlers
  const handleClaimCheckIn = useCallback(() => {
    const today = getTodayKey();
    setSave((prev) => {
      const ci = normalizeCheckIn(prev.checkIn);
      if (ci.count >= 7 || ci.lastDate === today) return prev;
      const reward = CHECK_IN_REWARDS[ci.count];
      if (!reward) return prev;
      soundEngine.playVictory();
      let nextInventory = prev.inventory;
      if (reward.bonusRarity) {
        const pool =
          reward.bonusRarity === Rarity.EPIC
            ? ALL_TEMPLATE_LIST.filter((t) => t.isSTier)
            : ALL_TEMPLATE_LIST.filter((t) => t.setName !== 'Khởi Đầu');
        const tpl =
          pool[Math.floor(Math.random() * pool.length)] ?? ALL_TEMPLATE_LIST[0];
        const bonusGear: GearInstance = {
          uid: `checkin_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          templateId: tpl.templateId,
          rarity: reward.bonusRarity,
          level: 1,
        };
        nextInventory = [...prev.inventory, bonusGear];
      }
      return {
        ...prev,
        gold: prev.gold + reward.gold,
        gems: prev.gems + reward.gems,
        inventory: nextInventory,
        checkIn: { count: ci.count + 1, lastDate: today },
      };
    });
  }, []);

  const handleClaimDailyQuest = useCallback((questId: string) => {
    const quest = DAILY_QUESTS.find((q) => q.id === questId);
    if (!quest) return;
    setSave((prev) => {
      const dq = normalizeDailyQuests(prev.dailyQuests);
      if (dq.claimedIds.includes(questId) || dq[quest.metric] < quest.target) {
        return prev;
      }
      soundEngine.playVictory();
      return {
        ...prev,
        gold: prev.gold + quest.rewardGold,
        gems: prev.gems + quest.rewardGems,
        dailyQuests: {
          ...dq,
          claimedIds: [...dq.claimedIds, questId],
        },
      };
    });
  }, []);

  const handleClaimWelcomeGift = useCallback(() => {
    setSave((prev) => {
      if (prev.welcomeGiftClaimed) return prev;
      soundEngine.playVictory();
      const pool = ALL_TEMPLATE_LIST.filter((t) => t.setName !== 'Khởi Đầu');
      const tpl =
        pool[Math.floor(Math.random() * pool.length)] ?? ALL_TEMPLATE_LIST[0];
      const giftGear: GearInstance = {
        uid: `welcome_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        templateId: tpl.templateId,
        rarity: Rarity.RARE,
        level: 1,
      };
      return {
        ...prev,
        gold: prev.gold + 300,
        gems: prev.gems + 35,
        inventory: [...prev.inventory, giftGear],
        welcomeGiftClaimed: true,
      };
    });
  }, []);

  const handleOpenChestWithGacha = useCallback(
    (variant: GachaRevealState['chestVariant'], count: 1 | 10 = 1) => {
      const unitCost =
        variant === 'iron'
          ? 120
          : variant === 'mythic'
          ? 25
          : variant === 'rune_bag'
          ? 100
          : 18;
      const totalCost = count === 10 ? Math.round(unitCost * 9) : unitCost;
      const isGemChest = variant === 'mythic' || variant === 'rune_rare';
      if (isGemChest && save.gems < totalCost) return;
      if (!isGemChest && save.gold < totalCost) return;

      soundEngine.unlock();
      soundEngine.playChestRoll();

      if (variant === 'iron' || variant === 'mythic') {
        const isPremium = variant === 'mythic';
        const { items, nextPity } = rollChestGearBatch(isPremium, count, save.pity);
        setSave((prev) => {
          const dq = normalizeDailyQuests(prev.dailyQuests);
          const career = normalizeCareer(prev.career);
          const bp = normalizeBattlePass(prev.battlePass);
          const rawXp = count === 10 ? 120 : 15;
          const xpGain = isVipActive(prev.vip) ? Math.round(rawXp * 1.25) : rawXp;
          return {
            ...prev,
            gold: isGemChest ? prev.gold : prev.gold - totalCost,
            gems: isGemChest ? prev.gems - totalCost : prev.gems,
            nightMarket: addGemsSpent(prev, isGemChest ? totalCost : 0),
            inventory: [...prev.inventory, ...items],
            pity: nextPity,
            dailyQuests: { ...dq, chests: dq.chests + count },
            career: { ...career, totalChestsOpened: career.totalChestsOpened + count },
            battlePass: { ...bp, xp: bp.xp + xpGain },
          };
        });
        setGachaReveal({ chestVariant: variant, count, gears: items });
      } else {
        const isPremium = variant === 'rune_rare';
        const { items, nextPity } = rollRuneChestBatch(isPremium, count, save.pity);
        setSave((prev) => {
          const dq = normalizeDailyQuests(prev.dailyQuests);
          const career = normalizeCareer(prev.career);
          const bp = normalizeBattlePass(prev.battlePass);
          const rawXp = count === 10 ? 120 : 15;
          const xpGain = isVipActive(prev.vip) ? Math.round(rawXp * 1.25) : rawXp;
          return {
            ...prev,
            gold: isGemChest ? prev.gold : prev.gold - totalCost,
            gems: isGemChest ? prev.gems - totalCost : prev.gems,
            nightMarket: addGemsSpent(prev, isGemChest ? totalCost : 0),
            runeInventory: [...prev.runeInventory, ...items],
            pity: nextPity,
            dailyQuests: { ...dq, chests: dq.chests + count },
            career: { ...career, totalChestsOpened: career.totalChestsOpened + count },
            battlePass: { ...bp, xp: bp.xp + xpGain },
          };
        });
        setGachaReveal({ chestVariant: variant, count, runes: items });
      }
    },
    [save.gold, save.gems, save.pity]
  );

  // Battle Pass, Achievements & Settings Handlers
  const handleUnlockBattlePassPremium = useCallback(() => {
    setSave((prev) => {
      const bp = normalizeBattlePass(prev.battlePass);
      if (bp.premiumUnlocked || prev.gems < BATTLE_PASS_PREMIUM_GEM_COST) return prev;
      soundEngine.playVictory();
      return {
        ...prev,
        gems: prev.gems - BATTLE_PASS_PREMIUM_GEM_COST,
        nightMarket: addGemsSpent(prev, BATTLE_PASS_PREMIUM_GEM_COST),
        topUpEvolution: addTopUpPoints(prev, 80),
        battlePass: { ...bp, premiumUnlocked: true },
      };
    });
  }, []);

  const handleClaimBattlePassTier = useCallback(
    (level: number, track: 'free' | 'premium') => {
      const tier = BATTLE_PASS_TIERS.find((t) => t.level === level);
      if (!tier) return;
      setSave((prev) => {
        const bp = normalizeBattlePass(prev.battlePass);
        const info = getBattlePassLevelInfo(bp.xp);
        const maxReached = info.isMax ? BATTLE_PASS_MAX_TIER : info.level;
        if (level > maxReached) return prev;
        if (track === 'free' && bp.claimedFree.includes(level)) return prev;
        if (track === 'premium' && (!bp.premiumUnlocked || bp.claimedPremium.includes(level))) {
          return prev;
        }

        const reward = track === 'free' ? tier.free : tier.premium;
        let goldGain = reward.kind === 'gold' ? reward.amount : 0;
        let gemsGain = reward.kind === 'gems' ? reward.amount : 0;
        let nextInv = prev.inventory;
        if (reward.kind === 'gear') {
          const item = rollChestGear(true, reward.rarity ?? Rarity.EPIC, reward.sTier);
          nextInv = [...prev.inventory, item];
        }
        soundEngine.playVictory();
        return {
          ...prev,
          gold: prev.gold + goldGain,
          gems: prev.gems + gemsGain,
          inventory: nextInv,
          battlePass: {
            ...bp,
            claimedFree: track === 'free' ? [...bp.claimedFree, level] : bp.claimedFree,
            claimedPremium:
              track === 'premium' ? [...bp.claimedPremium, level] : bp.claimedPremium,
          },
        };
      });
    },
    []
  );

  const handleClaimAllBattlePass = useCallback(() => {
    setSave((prev) => {
      const bp = normalizeBattlePass(prev.battlePass);
      const info = getBattlePassLevelInfo(bp.xp);
      const maxReached = info.isMax ? BATTLE_PASS_MAX_TIER : info.level;

      let goldGain = 0;
      let gemsGain = 0;
      const newGear: GearInstance[] = [];
      const nextFree = [...bp.claimedFree];
      const nextPrem = [...bp.claimedPremium];

      for (const tier of BATTLE_PASS_TIERS) {
        if (tier.level > maxReached) break;
        if (!nextFree.includes(tier.level)) {
          nextFree.push(tier.level);
          if (tier.free.kind === 'gold') goldGain += tier.free.amount;
          else if (tier.free.kind === 'gems') gemsGain += tier.free.amount;
          else newGear.push(rollChestGear(true, tier.free.rarity ?? Rarity.EPIC, tier.free.sTier));
        }
        if (bp.premiumUnlocked && !nextPrem.includes(tier.level)) {
          nextPrem.push(tier.level);
          if (tier.premium.kind === 'gold') goldGain += tier.premium.amount;
          else if (tier.premium.kind === 'gems') gemsGain += tier.premium.amount;
          else
            newGear.push(
              rollChestGear(true, tier.premium.rarity ?? Rarity.EPIC, tier.premium.sTier)
            );
        }
      }

      if (goldGain === 0 && gemsGain === 0 && newGear.length === 0) return prev;
      soundEngine.playVictory();
      return {
        ...prev,
        gold: prev.gold + goldGain,
        gems: prev.gems + gemsGain,
        inventory: [...prev.inventory, ...newGear],
        battlePass: {
          ...bp,
          claimedFree: nextFree,
          claimedPremium: nextPrem,
        },
      };
    });
  }, []);

  const handleClaimAchievement = useCallback((id: string) => {
    const ach = ACHIEVEMENTS_CATALOG.find((a) => a.id === id);
    if (!ach) return;
    setSave((prev) => {
      const claimed = prev.achievementsClaimed ?? [];
      if (claimed.includes(id)) return prev;
      if (getAchievementCurrentValue(prev, ach.metric) < ach.target) return prev;
      return {
        ...prev,
        gold: prev.gold + ach.rewardGold,
        gems: prev.gems + ach.rewardGems,
        achievementsClaimed: [...claimed, id],
        equippedTitle: ach.unlockTitle ?? prev.equippedTitle,
      };
    });
  }, []);

  const handleSelectTitle = useCallback((title: string) => {
    setSave((prev) => ({ ...prev, equippedTitle: title }));
  }, []);

  const handleUpdateSettings = useCallback((patch: Partial<GameSettings>) => {
    setSave((prev) => ({
      ...prev,
      settings: { ...normalizeSettings(prev.settings), ...patch },
    }));
  }, []);

  const handleCompleteOnboarding = useCallback(() => {
    setOnboardingOpen(false);
    setSave((prev) => ({ ...prev, onboardingCompleted: true }));
  }, []);

  // Rune Handlers
  const handleEquipRune = (uid: string) => {
    setSave((prev) => {
      if (prev.equippedRunes.includes(uid) || prev.equippedRunes.length >= 4) return prev;
      return { ...prev, equippedRunes: [...prev.equippedRunes, uid] };
    });
  };

  const handleUnequipRune = (uid: string) => {
    setSave((prev) => ({
      ...prev,
      equippedRunes: prev.equippedRunes.filter((id) => id !== uid),
    }));
  };

  const handleFuseRune = (uid: string) => {
    setSave((prev) => {
      const target = prev.runeInventory.find((r) => r.uid === uid);
      if (!target) return prev;
      const rIdx = RARITY_ORDER.indexOf(target.rarity);
      if (rIdx >= RARITY_ORDER.length - 1) return prev;
      const matching = prev.runeInventory.filter(
        (r) => r.runeId === target.runeId && r.rarity === target.rarity
      );
      if (matching.length < 3) return prev;

      const others = matching
        .filter((r) => r.uid !== target.uid)
        .sort((a, b) => {
          const aEq = prev.equippedRunes.includes(a.uid) ? 1 : 0;
          const bEq = prev.equippedRunes.includes(b.uid) ? 1 : 0;
          return aEq - bEq;
        })
        .slice(0, 2);

      const consumedUids = new Set([target.uid, ...others.map((o) => o.uid)]);
      const upgradedRune: RuneInstance = {
        uid: target.uid,
        runeId: target.runeId,
        rarity: RARITY_ORDER[rIdx + 1],
      };

      const nextRunes = prev.runeInventory.filter((r) => !consumedUids.has(r.uid));
      nextRunes.push(upgradedRune);

      const nextEquipped = prev.equippedRunes.map((id) =>
        others.some((o) => o.uid === id) ? upgradedRune.uid : id
      );
      const dedupEquipped = Array.from(new Set(nextEquipped));

      soundEngine.playVictory();
      return {
        ...prev,
        runeInventory: nextRunes,
        equippedRunes: dedupEquipped,
      };
    });
  };

  const handleBulkFuseRunes = useCallback(() => {
    setSave((prev) => {
      let runes = [...prev.runeInventory];
      let eqRunes = [...prev.equippedRunes];
      let fusedAny = false;

      let progress = true;
      while (progress) {
        progress = false;
        for (const rIdx of [0, 1, 2, 3]) {
          const rarity = RARITY_ORDER[rIdx];
          const nextRarity = RARITY_ORDER[rIdx + 1];
          const groups = new Map<string, RuneInstance[]>();
          for (const r of runes) {
            if (r.rarity !== rarity) continue;
            const list = groups.get(r.runeId) ?? [];
            list.push(r);
            groups.set(r.runeId, list);
          }
          for (const [runeId, group] of groups.entries()) {
            if (group.length < 3) continue;
            group.sort((a, b) => {
              const aEq = eqRunes.includes(a.uid) ? 1 : 0;
              const bEq = eqRunes.includes(b.uid) ? 1 : 0;
              return bEq - aEq;
            });
            const [main, m2, m3] = group;
            const consumed = new Set([main.uid, m2.uid, m3.uid]);
            const upgraded: RuneInstance = {
              uid: main.uid,
              runeId: main.runeId,
              rarity: nextRarity,
            };
            runes = runes.filter((r) => !consumed.has(r.uid));
            runes.push(upgraded);
            eqRunes = Array.from(
              new Set(eqRunes.map((id) => (id === m2.uid || id === m3.uid ? upgraded.uid : id)))
            );
            fusedAny = true;
            progress = true;
            break;
          }
          if (progress) break;
        }
      }

      if (!fusedAny) return prev;
      soundEngine.playVictory();
      return { ...prev, runeInventory: runes, equippedRunes: eqRunes };
    });
  }, []);

  // Flash Sale & Mail Inbox Handlers
  const handleBuyFlashDeal = useCallback((deal: FlashDealItem) => {
    setSave((prev) => {
      const flash = normalizeFlashDeals(prev.flashDeals);
      if (flash.purchasedIds.includes(deal.id)) return prev;
      if (deal.currency === 'gold' && prev.gold < deal.price) return prev;
      if (deal.currency === 'gems' && prev.gems < deal.price) return prev;

      let nextGold =
        deal.currency === 'gold' ? prev.gold - deal.price : prev.gold;
      let nextGems =
        deal.currency === 'gems' ? prev.gems - deal.price : prev.gems;
      let nextInv = prev.inventory;
      let nextRunes = prev.runeInventory;

      if (deal.rewardKind === 'gold') nextGold += deal.amount;
      else if (deal.rewardKind === 'gems') nextGems += deal.amount;
      else if (deal.rewardKind === 'gear_epic') {
        nextInv = [...prev.inventory, rollChestGear(true, Rarity.EPIC)];
      } else if (deal.rewardKind === 'gear_s') {
        nextInv = [...prev.inventory, rollChestGear(true, Rarity.EPIC, true)];
      } else if (deal.rewardKind === 'rune_epic') {
        const { items } = rollRuneChestBatch(true, 1, prev.pity);
        const epicRune = items[0]
          ? { ...items[0], rarity: Rarity.EPIC }
          : undefined;
        if (epicRune) nextRunes = [...prev.runeInventory, epicRune];
      }

      soundEngine.playVictory();
      return {
        ...prev,
        gold: nextGold,
        gems: nextGems,
        nightMarket: addGemsSpent(prev, deal.currency === 'gems' ? deal.price : 0),
        inventory: nextInv,
        runeInventory: nextRunes,
        flashDeals: {
          ...flash,
          purchasedIds: [...flash.purchasedIds, deal.id],
        },
      };
    });
  }, []);

  const handleClaimMail = useCallback((mailId: string) => {
    setSave((prev) => {
      const inbox = normalizeMailInbox(prev.mailInbox);
      const target = inbox.find((m) => m.id === mailId);
      if (!target || target.claimed) return prev;

      let nextInv = prev.inventory;
      if (target.bonusGearRarity) {
        nextInv = [
          ...prev.inventory,
          rollChestGear(true, target.bonusGearRarity, target.bonusSTier),
        ];
      }

      soundEngine.playVictory();
      return {
        ...prev,
        gold: prev.gold + target.rewardGold,
        gems: prev.gems + target.rewardGems,
        inventory: nextInv,
        mailInbox: inbox.map((m) => (m.id === mailId ? { ...m, claimed: true } : m)),
      };
    });
  }, []);

  const handleClaimAllMail = useCallback(() => {
    setSave((prev) => {
      const inbox = normalizeMailInbox(prev.mailInbox);
      const unclaimed = inbox.filter((m) => !m.claimed);
      if (unclaimed.length === 0) return prev;

      let goldGain = 0;
      let gemsGain = 0;
      const bonusGears: GearInstance[] = [];
      for (const m of unclaimed) {
        goldGain += m.rewardGold;
        gemsGain += m.rewardGems;
        if (m.bonusGearRarity) {
          bonusGears.push(rollChestGear(true, m.bonusGearRarity, m.bonusSTier));
        }
      }

      soundEngine.playVictory();
      return {
        ...prev,
        gold: prev.gold + goldGain,
        gems: prev.gems + gemsGain,
        inventory: [...prev.inventory, ...bonusGears],
        mailInbox: inbox.map((m) => ({ ...m, claimed: true })),
      };
    });
  }, []);

  const handleDeleteClaimedMail = useCallback(() => {
    setSave((prev) => {
      const inbox = normalizeMailInbox(prev.mailInbox);
      return {
        ...prev,
        mailInbox: inbox.filter((m) => !m.claimed),
      };
    });
  }, []);

  const handleUpgradeTalent = useCallback((id: TalentId) => {
    setSave((prev) => {
      const def = TALENT_MAP[id];
      const level = getTalentLevel(prev.talents, id);
      if (level >= def.maxLevel) return prev;
      const cost = getTalentUpgradeCost(id, level);
      if (prev.gold < cost) return prev;
      soundEngine.playLevelUp();
      const dq = normalizeDailyQuests(prev.dailyQuests);
      return {
        ...prev,
        gold: prev.gold - cost,
        talents: {
          ...prev.talents,
          [id]: level + 1,
        },
        dailyQuests: { ...dq, upgrades: dq.upgrades + 1 },
      };
    });
  }, []);

  // Wave 3 Handlers: Pets, Skins, Auras, VIP & Relic Forge
  const handleUnlockPet = useCallback((petId: PetId, currency: 'gold' | 'gems') => {
    const def = PET_MAP[petId];
    if (!def) return;
    setSave((prev) => {
      const pets = normalizePets(prev.pets);
      if (pets.some((p) => p.petId === petId)) return prev;
      if (currency === 'gold' && (def.unlockGold <= 0 || prev.gold < def.unlockGold)) return prev;
      if (currency === 'gems' && (def.unlockGems <= 0 || prev.gems < def.unlockGems)) return prev;
      soundEngine.playVictory();
      return {
        ...prev,
        gold: currency === 'gold' ? prev.gold - def.unlockGold : prev.gold,
        gems: currency === 'gems' ? prev.gems - def.unlockGems : prev.gems,
        nightMarket: addGemsSpent(prev, currency === 'gems' ? def.unlockGems : 0),
        pets: [...pets, { petId, level: 1 }],
        equippedPetId: petId,
      };
    });
  }, []);

  const handleEquipPet = useCallback((petId: PetId | null) => {
    soundEngine.playUiClick(1.08);
    setSave((prev) => {
      if (petId === null) return { ...prev, equippedPetId: null };
      const pets = normalizePets(prev.pets);
      if (!pets.some((p) => p.petId === petId)) return prev;
      return { ...prev, equippedPetId: petId };
    });
  }, []);

  const handleUpgradePet = useCallback((petId: PetId) => {
    setSave((prev) => {
      const pets = normalizePets(prev.pets);
      const idx = pets.findIndex((p) => p.petId === petId);
      if (idx === -1) return prev;
      const current = pets[idx];
      const cost = getPetUpgradeCost(current.level);
      const essence = prev.petEssence ?? 0;
      if (essence < cost.essence || prev.gold < cost.gold) return prev;
      const nextPets = [...pets];
      nextPets[idx] = { ...current, level: current.level + 1 };
      soundEngine.playLevelUp();
      return {
        ...prev,
        gold: prev.gold - cost.gold,
        petEssence: essence - cost.essence,
        pets: nextPets,
      };
    });
  }, []);

  const handleUnlockSkin = useCallback((skinId: HeroSkinId, currency: 'gold' | 'gems') => {
    const skin = SKIN_MAP[skinId];
    if (!skin) return;
    setSave((prev) => {
      const unlocked = prev.unlockedSkins ?? ['default'];
      if (unlocked.includes(skinId)) return prev;
      if (currency === 'gold' && (skin.unlockGold <= 0 || prev.gold < skin.unlockGold)) return prev;
      if (currency === 'gems' && (skin.unlockGems <= 0 || prev.gems < skin.unlockGems)) return prev;
      const targetHero = prev.selectedHeroId;
      soundEngine.playVictory();
      return {
        ...prev,
        gold: currency === 'gold' ? prev.gold - skin.unlockGold : prev.gold,
        gems: currency === 'gems' ? prev.gems - skin.unlockGems : prev.gems,
        nightMarket: addGemsSpent(prev, currency === 'gems' ? skin.unlockGems : 0),
        unlockedSkins: [...unlocked, skinId],
        equippedSkinByHero: { ...(prev.equippedSkinByHero ?? {}), [targetHero]: skinId },
      };
    });
  }, []);

  const handleEquipSkin = useCallback((heroId: HeroId, skinId: HeroSkinId) => {
    soundEngine.playUiClick(1.1);
    setSave((prev) => {
      const unlocked = prev.unlockedSkins ?? ['default'];
      if (!unlocked.includes(skinId)) return prev;
      return {
        ...prev,
        equippedSkinByHero: { ...(prev.equippedSkinByHero ?? {}), [heroId]: skinId },
      };
    });
  }, []);

  const handleUnlockAura = useCallback((auraId: AuraStyleId, currency: 'gold' | 'gems') => {
    const aura = AURA_MAP[auraId];
    if (!aura) return;
    setSave((prev) => {
      const unlocked = prev.unlockedAuras ?? ['zodiac_gold'];
      if (unlocked.includes(auraId)) return prev;
      if (currency === 'gold' && (aura.unlockGold <= 0 || prev.gold < aura.unlockGold)) return prev;
      if (currency === 'gems' && (aura.unlockGems <= 0 || prev.gems < aura.unlockGems)) return prev;
      soundEngine.playVictory();
      return {
        ...prev,
        gold: currency === 'gold' ? prev.gold - aura.unlockGold : prev.gold,
        gems: currency === 'gems' ? prev.gems - aura.unlockGems : prev.gems,
        nightMarket: addGemsSpent(prev, currency === 'gems' ? aura.unlockGems : 0),
        unlockedAuras: [...unlocked, auraId],
        equippedAuraId: auraId,
      };
    });
  }, []);

  const handleEquipAura = useCallback((auraId: AuraStyleId) => {
    soundEngine.playUiClick(1.1);
    setSave((prev) => {
      const unlocked = prev.unlockedAuras ?? ['zodiac_gold'];
      if (!unlocked.includes(auraId)) return prev;
      return { ...prev, equippedAuraId: auraId };
    });
  }, []);

  const handleActivateVip = useCallback(() => {
    const today = getTodayKey();
    setSave((prev) => {
      if (prev.gems < VIP_MONTHLY_COST_GEMS) return prev;
      const vip = normalizeVip(prev.vip);
      const baseDate = isVipActive(vip) && vip.activeUntilDate >= today ? vip.activeUntilDate : today;
      const nextUntil = addDaysToDateKey(baseDate, VIP_DURATION_DAYS);
      const sweeps = normalizeDailySweeps(prev.dailySweeps, true);
      soundEngine.playVictory();
      return {
        ...prev,
        gems: prev.gems - VIP_MONTHLY_COST_GEMS,
        nightMarket: addGemsSpent(prev, VIP_MONTHLY_COST_GEMS),
        topUpEvolution: addTopUpPoints(prev, 40),
        vip: { ...vip, activeUntilDate: nextUntil },
        dailySweeps: { ...sweeps, remaining: sweeps.remaining + 2 },
      };
    });
  }, []);

  const handleClaimVipDaily = useCallback(() => {
    const today = getTodayKey();
    setSave((prev) => {
      const vip = normalizeVip(prev.vip);
      if (!isVipActive(vip) || vip.lastDailyClaimDate === today) return prev;
      soundEngine.playVictory();
      return {
        ...prev,
        gold: prev.gold + VIP_DAILY_GOLD,
        gems: prev.gems + VIP_DAILY_GEMS,
        petEssence: (prev.petEssence ?? 0) + VIP_DAILY_ESSENCE,
        vip: { ...vip, lastDailyClaimDate: today },
      };
    });
  }, []);

  const handleClaimStarterPack = useCallback(() => {
    setSave((prev) => {
      const vip = normalizeVip(prev.vip);
      if (vip.starterPackClaimed || prev.gems < STARTER_PACK_COST_GEMS) return prev;
      const starterGear = rollChestGear(true, STARTER_PACK_REWARDS.gearRarity, STARTER_PACK_REWARDS.sTier);
      soundEngine.playVictory();
      return {
        ...prev,
        gems: prev.gems - STARTER_PACK_COST_GEMS,
        nightMarket: addGemsSpent(prev, STARTER_PACK_COST_GEMS),
        topUpEvolution: addTopUpPoints(prev, 25),
        gold: prev.gold + STARTER_PACK_REWARDS.gold,
        petEssence: (prev.petEssence ?? 0) + STARTER_PACK_REWARDS.essence,
        starDust: (prev.starDust ?? 0) + STARTER_PACK_REWARDS.starDust,
        inventory: [...prev.inventory, starterGear],
        vip: { ...vip, starterPackClaimed: true },
      };
    });
  }, []);

  const handleSalvageGear = useCallback((uids: string[]) => {
    if (uids.length === 0) return;
    setSave((prev) => {
      const eqSet = new Set(Object.values(prev.equipped));
      const targetSet = new Set(uids);
      let dustGain = 0;
      let goldGain = 0;
      const keptInventory: GearInstance[] = [];

      for (const item of prev.inventory) {
        if (targetSet.has(item.uid) && !eqSet.has(item.uid) && item.rarity !== Rarity.MYTHIC) {
          const val = getSalvageValue(item);
          dustGain += val.starDust;
          goldGain += val.gold;
        } else {
          keptInventory.push(item);
        }
      }

      if (dustGain === 0 && goldGain === 0) return prev;
      soundEngine.playSalvage();
      return {
        ...prev,
        gold: prev.gold + goldGain,
        starDust: (prev.starDust ?? 0) + dustGain,
        inventory: keptInventory,
      };
    });
  }, []);

  const handleCraftForgeRecipe = useCallback((recipe: ForgeRecipe) => {
    setSave((prev) => {
      const currentDust = prev.starDust ?? 0;
      if (currentDust < recipe.starDustCost || prev.gold < recipe.goldCost) return prev;

      let nextInv = prev.inventory;
      let nextEssence = prev.petEssence ?? 0;

      if (recipe.rewardKind === 'pet_essence') {
        nextEssence += recipe.amount;
      } else if (recipe.rewardKind === 'gear_epic_any') {
        nextInv = [...prev.inventory, rollChestGear(true, Rarity.EPIC)];
      } else {
        const pool = ALL_TEMPLATE_LIST.filter((t) => {
          if (!t.isSTier) return false;
          if (recipe.rewardKind === 'gear_s_weapon') return t.slot === GearSlot.WEAPON;
          if (recipe.rewardKind === 'gear_s_armor') {
            return (
              t.slot === GearSlot.ARMOR ||
              t.slot === GearSlot.HELMET ||
              t.slot === GearSlot.BOOTS
            );
          }
          return t.slot === GearSlot.RING || t.slot === GearSlot.NECKLACE;
        });
        const tpl = pool[Math.floor(Math.random() * pool.length)] ?? ALL_TEMPLATE_LIST[0];
        const craftedGear: GearInstance = {
          uid: `forge_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          templateId: tpl.templateId,
          rarity: recipe.rarity,
          level: 1,
        };
        nextInv = [...prev.inventory, craftedGear];
      }

      soundEngine.playForgeCraft();
      return {
        ...prev,
        gold: prev.gold - recipe.goldCost,
        starDust: currentDust - recipe.starDustCost,
        petEssence: nextEssence,
        inventory: nextInv,
      };
    });
  }, []);

  // Wave 4 Handlers: Reforge, Awakening, Build Presets, Guild, Destiny Wheel & Season Medals
  const handleReforgeGear = useCallback((uid: string, lockedIds: string[]) => {
    setSave((prev) => {
      const idx = prev.inventory.findIndex((g) => g.uid === uid);
      if (idx === -1) return prev;
      const item = prev.inventory[idx];
      const cost = getReforgeCost(item, lockedIds.length);
      const currentDust = prev.starDust ?? 0;
      if (currentDust < cost.starDust || prev.gold < cost.gold) return prev;

      const nextSubstats = reforgeItemSubstats(item, lockedIds);
      const nextInventory = [...prev.inventory];
      nextInventory[idx] = { ...item, substats: nextSubstats };
      soundEngine.playForgeCraft();
      return {
        ...prev,
        gold: prev.gold - cost.gold,
        starDust: currentDust - cost.starDust,
        inventory: nextInventory,
      };
    });
  }, []);

  const handleAwakenGear = useCallback((uid: string) => {
    setSave((prev) => {
      const idx = prev.inventory.findIndex((g) => g.uid === uid);
      if (idx === -1) return prev;
      const item = prev.inventory[idx];
      const cur = item.awakeningLevel ?? 0;
      const cost = getAwakenCost(item);
      if (cur >= cost.maxStars) return prev;
      const guild = normalizeGuild(prev.guild);
      const currentDust = prev.starDust ?? 0;
      if (
        currentDust < cost.starDust ||
        prev.gold < cost.gold ||
        guild.guildCoins < cost.guildCoins
      ) {
        return prev;
      }

      const nextInventory = [...prev.inventory];
      nextInventory[idx] = { ...item, awakeningLevel: cur + 1 };
      soundEngine.playVictory();
      return {
        ...prev,
        gold: prev.gold - cost.gold,
        starDust: currentDust - cost.starDust,
        guild: {
          ...guild,
          guildCoins: guild.guildCoins - cost.guildCoins,
        },
        inventory: nextInventory,
      };
    });
  }, []);

  const handleSaveBuildPreset = useCallback((idx: number) => {
    soundEngine.playLevelUp();
    setSave((prev) => {
      const presets = normalizeBuildPresets(prev);
      if (idx < 0 || idx >= presets.length) return prev;
      const nextPresets = [...presets];
      nextPresets[idx] = {
        ...presets[idx],
        heroId: prev.selectedHeroId,
        equipped: { ...prev.equipped },
        equippedRunes: [...prev.equippedRunes],
        equippedPetId: prev.equippedPetId ?? null,
        skinId: prev.equippedSkinByHero?.[prev.selectedHeroId] ?? 'default',
        auraId: prev.equippedAuraId ?? 'zodiac_gold',
      };
      return { ...prev, buildPresets: nextPresets };
    });
  }, []);

  const handleApplyBuildPreset = useCallback((idx: number) => {
    soundEngine.playVictory();
    setSave((prev) => {
      const presets = normalizeBuildPresets(prev);
      const preset = presets[idx];
      if (!preset) return prev;

      const invIds = new Set(prev.inventory.map((g) => g.uid));
      const runeIds = new Set(prev.runeInventory.map((r) => r.uid));
      const nextHeroId = prev.unlockedHeroes.includes(preset.heroId)
        ? preset.heroId
        : prev.selectedHeroId;

      const nextEquipped = { ...prev.equipped };
      for (const slot of Object.values(GearSlot)) {
        const uid = preset.equipped[slot];
        if (uid && invIds.has(uid)) {
          nextEquipped[slot] = uid;
        }
      }

      const nextRunes = preset.equippedRunes.filter((id) => runeIds.has(id)).slice(0, 4);
      const ownedPets = normalizePets(prev.pets);
      const nextPetId =
        preset.equippedPetId && ownedPets.some((p) => p.petId === preset.equippedPetId)
          ? preset.equippedPetId
          : null;

      const unlockedSkins = prev.unlockedSkins ?? ['default'];
      const nextSkinId = unlockedSkins.includes(preset.skinId) ? preset.skinId : 'default';
      const unlockedAuras = prev.unlockedAuras ?? ['zodiac_gold'];
      const nextAuraId = unlockedAuras.includes(preset.auraId)
        ? preset.auraId
        : prev.equippedAuraId ?? 'zodiac_gold';

      return {
        ...prev,
        selectedHeroId: nextHeroId,
        equipped: nextEquipped,
        equippedRunes: nextRunes,
        equippedPetId: nextPetId,
        equippedSkinByHero: {
          ...(prev.equippedSkinByHero ?? {}),
          [nextHeroId]: nextSkinId,
        },
        equippedAuraId: nextAuraId,
      };
    });
  }, []);

  const handleGuildTribute = useCallback((currency: 'gold' | 'gems') => {
    setSave((prev) => {
      const g = normalizeGuild(prev.guild);
      if (g.tributeCountToday >= MAX_DAILY_GUILD_TRIBUTES) return prev;
      const goldCost = currency === 'gold' ? 150 : 0;
      const gemCost = currency === 'gems' ? 20 : 0;
      if (prev.gold < goldCost || prev.gems < gemCost) return prev;

      const coinGain = currency === 'gems' ? 75 : 30;
      const expGain = currency === 'gems' ? 160 : 70;
      let nextLevel = g.level;
      let nextExp = g.exp + expGain;
      while (nextExp >= getGuildLevelExpReq(nextLevel)) {
        nextExp -= getGuildLevelExpReq(nextLevel);
        nextLevel += 1;
      }

      return {
        ...prev,
        gold: prev.gold - goldCost,
        gems: prev.gems - gemCost,
        nightMarket: addGemsSpent(prev, gemCost),
        guild: {
          ...g,
          level: nextLevel,
          exp: nextExp,
          guildCoins: g.guildCoins + coinGain,
          tributeCountToday: g.tributeCountToday + 1,
        },
      };
    });
  }, []);

  const handleUpgradeGuildTech = useCallback((techId: GuildTechId) => {
    const tech = GUILD_TECH_DEFS.find((t) => t.id === techId);
    if (!tech) return;
    setSave((prev) => {
      const g = normalizeGuild(prev.guild);
      const lv = g.techLevels[techId] ?? 0;
      if (lv >= tech.maxLevel) return prev;
      const coinCost = tech.baseCoinCost + lv * tech.stepCoinCost;
      const goldCost = tech.baseGoldCost + lv * tech.stepGoldCost;
      if (g.guildCoins < coinCost || prev.gold < goldCost) return prev;

      return {
        ...prev,
        gold: prev.gold - goldCost,
        guild: {
          ...g,
          guildCoins: g.guildCoins - coinCost,
          techLevels: {
            ...g.techLevels,
            [techId]: lv + 1,
          },
        },
      };
    });
  }, []);

  const handleClaimGuildDamageTier = useCallback((tierId: string) => {
    const tier = GUILD_BOSS_DAMAGE_TIERS.find((t) => t.id === tierId);
    if (!tier) return;
    setSave((prev) => {
      const g = normalizeGuild(prev.guild);
      if (g.bestGuildBossDamage < tier.minDamage || g.claimedDamageTiers.includes(tierId)) {
        return prev;
      }
      return {
        ...prev,
        gems: prev.gems + tier.gems,
        starDust: (prev.starDust ?? 0) + tier.starDust,
        guild: {
          ...g,
          guildCoins: g.guildCoins + tier.guildCoins,
          claimedDamageTiers: [...g.claimedDamageTiers, tierId],
        },
      };
    });
  }, []);

  const handleDestinySpin = useCallback(
    (count: 1 | 5): { prizes: DestinyWheelPrize[]; lastIndex: number } | null => {
      const dw = normalizeDestinyWheel(save.destinyWheel);
      let useFree = false;
      let useTicket = false;
      let gemCost = 0;

      if (count === 1) {
        if (dw.freeSpinsRemaining > 0) {
          useFree = true;
        } else if (dw.tickets > 0) {
          useTicket = true;
        } else if (save.gems >= DESTINY_SPIN_GEM_COST) {
          gemCost = DESTINY_SPIN_GEM_COST;
        } else {
          return null;
        }
      } else {
        if (save.gems < DESTINY_SPIN5_GEM_COST) return null;
        gemCost = DESTINY_SPIN5_GEM_COST;
      }

      const rolls = Array.from({ length: count }, () => rollDestinyPrize());
      const prizes = rolls.map((r) => r.prize);
      const lastIndex = rolls[rolls.length - 1].index;

      setSave((prev) => {
        const curDw = normalizeDestinyWheel(prev.destinyWheel);
        let goldGain = 0;
        let gemsGain = 0;
        let dustGain = 0;
        let essenceGain = 0;
        const newGear: GearInstance[] = [];
        const newHistoryLabels: string[] = [];

        for (const p of prizes) {
          newHistoryLabels.unshift(p.label);
          if (p.kind === 'gold') goldGain += p.amount;
          else if (p.kind === 'gems') gemsGain += p.amount;
          else if (p.kind === 'star_dust') dustGain += p.amount;
          else if (p.kind === 'pet_essence') essenceGain += p.amount;
          else if (p.kind === 'gear_epic') newGear.push(rollChestGear(true, Rarity.EPIC));
          else if (p.kind === 'gear_s') newGear.push(rollChestGear(true, Rarity.EPIC, true));
        }

        return {
          ...prev,
          gold: prev.gold + goldGain,
          gems: Math.max(0, prev.gems - gemCost) + gemsGain,
          nightMarket: addGemsSpent(prev, gemCost),
          starDust: (prev.starDust ?? 0) + dustGain,
          petEssence: (prev.petEssence ?? 0) + essenceGain,
          inventory: newGear.length > 0 ? [...prev.inventory, ...newGear] : prev.inventory,
          destinyWheel: {
            ...curDw,
            freeSpinsRemaining: useFree
              ? Math.max(0, curDw.freeSpinsRemaining - 1)
              : curDw.freeSpinsRemaining,
            tickets: useTicket ? Math.max(0, curDw.tickets - 1) : curDw.tickets,
            totalSpins: curDw.totalSpins + count,
            history: [...newHistoryLabels, ...curDw.history].slice(0, 8),
          },
        };
      });

      return { prizes, lastIndex };
    },
    [save.destinyWheel, save.gems]
  );

  const handleClaimDestinyMilestone = useCallback((spins: number) => {
    const ms = DESTINY_MILESTONES.find((m) => m.spins === spins);
    if (!ms) return;
    setSave((prev) => {
      const curDw = normalizeDestinyWheel(prev.destinyWheel);
      if (curDw.totalSpins < ms.spins || curDw.claimedMilestones.includes(ms.spins)) {
        return prev;
      }
      const nextInv = ms.gearS
        ? [
            ...prev.inventory,
            rollChestGear(true, ms.spins >= 50 ? Rarity.LEGENDARY : Rarity.EPIC, true),
          ]
        : prev.inventory;
      return {
        ...prev,
        gold: prev.gold + ms.gold,
        gems: prev.gems + ms.gems,
        starDust: (prev.starDust ?? 0) + ms.starDust,
        inventory: nextInv,
        destinyWheel: {
          ...curDw,
          claimedMilestones: [...curDw.claimedMilestones, ms.spins],
        },
      };
    });
  }, []);

  const handleClaimSeasonMedal = useCallback((medalId: string) => {
    const medal = SEASON_MEDALS.find((m) => m.id === medalId);
    if (!medal) return;
    setSave((prev) => {
      const claimed = prev.seasonMedalsClaimed ?? [];
      if (claimed.includes(medalId)) return prev;
      const statsNow = computePlayerStats(prev);
      const seasonScore = computeSeasonScore(prev, statsNow.powerRating);
      if (getSeasonMedalCurrentValue(prev, statsNow.powerRating, seasonScore, medal.metric) < medal.target) {
        return prev;
      }
      soundEngine.playAchievement();
      return {
        ...prev,
        gold: prev.gold + medal.rewardGold,
        gems: prev.gems + medal.rewardGems,
        starDust: (prev.starDust ?? 0) + medal.rewardStarDust,
        seasonMedalsClaimed: [...claimed, medalId],
      };
    });
  }, []);

  // Wave 5 Handlers: Night Market, Arena, 3-Tier Socket Gems, 7-Day Novice Journey, Lobby Ultimate 3D Preview
  const handleBuyNightMarketOffer = useCallback((offer: NightMarketOffer) => {
    setSave((prev) => {
      const nm = normalizeNightMarket(prev.nightMarket);
      const bought = nm.purchasedCounts[offer.id] ?? 0;
      if (bought >= offer.maxPurchases) return prev;
      if (offer.currency === 'gold' && prev.gold < offer.price) return prev;
      if (offer.currency === 'gems' && prev.gems < offer.price) return prev;

      let nextDust = prev.starDust ?? 0;
      let nextEssence = prev.petEssence ?? 0;
      let nextInv = prev.inventory;
      let nextSocketGems = normalizeSocketGems(prev.socketGems);
      let nextDestiny = normalizeDestinyWheel(prev.destinyWheel);
      let nextArena = normalizeArena(prev.arena);

      if (offer.rewardKind === 'star_dust') nextDust += offer.amount;
      else if (offer.rewardKind === 'pet_essence') nextEssence += offer.amount;
      else if (offer.rewardKind === 'destiny_ticket') {
        nextDestiny = { ...nextDestiny, tickets: nextDestiny.tickets + offer.amount };
      } else if (offer.rewardKind === 'arena_ticket') {
        nextArena = {
          ...nextArena,
          ticketsRemaining: Math.min(15, nextArena.ticketsRemaining + offer.amount),
        };
      } else if (offer.rewardKind === 'socket_gem_t2') {
        const randColor =
          SOCKET_GEM_COLORS[Math.floor(Math.random() * SOCKET_GEM_COLORS.length)] ?? 'ruby';
        nextSocketGems = [...nextSocketGems, createSocketGem(randColor, 2)];
      } else if (offer.rewardKind === 'gear_s') {
        nextInv = [...prev.inventory, rollChestGear(true, Rarity.EPIC, true)];
      }

      const spentGems = offer.currency === 'gems' ? offer.price : 0;
      return {
        ...prev,
        gold: offer.currency === 'gold' ? prev.gold - offer.price : prev.gold,
        gems: offer.currency === 'gems' ? prev.gems - offer.price : prev.gems,
        starDust: nextDust,
        petEssence: nextEssence,
        inventory: nextInv,
        socketGems: nextSocketGems,
        destinyWheel: nextDestiny,
        arena: nextArena,
        nightMarket: {
          ...nm,
          purchasedCounts: { ...nm.purchasedCounts, [offer.id]: bought + 1 },
          totalGemsSpent: nm.totalGemsSpent + spentGems,
        },
      };
    });
  }, []);

  const handleClaimSpendMilestone = useCallback((gemsThreshold: number) => {
    const ms = CUMULATIVE_SPEND_MILESTONES.find((m) => m.gems === gemsThreshold);
    if (!ms) return;
    setSave((prev) => {
      const nm = normalizeNightMarket(prev.nightMarket);
      if (nm.totalGemsSpent < ms.gems || nm.claimedSpendMilestones.includes(ms.gems)) {
        return prev;
      }

      let nextSocketGems = normalizeSocketGems(prev.socketGems);
      if (ms.gemTier2) {
        const c = SOCKET_GEM_COLORS[Math.floor(Math.random() * SOCKET_GEM_COLORS.length)] ?? 'ruby';
        nextSocketGems = [...nextSocketGems, createSocketGem(c, 2)];
      }
      if ('gemTier3' in ms && ms.gemTier3) {
        const c = SOCKET_GEM_COLORS[Math.floor(Math.random() * SOCKET_GEM_COLORS.length)] ?? 'ruby';
        nextSocketGems = [...nextSocketGems, createSocketGem(c, 3)];
      }

      let nextDestiny = normalizeDestinyWheel(prev.destinyWheel);
      if ('destinyTickets' in ms && ms.destinyTickets) {
        nextDestiny = { ...nextDestiny, tickets: nextDestiny.tickets + ms.destinyTickets };
      }

      const nextInv = ms.gearS
        ? [...prev.inventory, rollChestGear(true, ms.gearRarity ?? Rarity.EPIC, true)]
        : prev.inventory;

      soundEngine.playAchievement();
      return {
        ...prev,
        gold: prev.gold + ms.gold,
        starDust: (prev.starDust ?? 0) + ms.starDust,
        petEssence: (prev.petEssence ?? 0) + ('petEssence' in ms ? ms.petEssence ?? 0 : 0),
        inventory: nextInv,
        socketGems: nextSocketGems,
        destinyWheel: nextDestiny,
        equippedTitle: ms.titleUnlock || prev.equippedTitle,
        nightMarket: {
          ...nm,
          claimedSpendMilestones: [...nm.claimedSpendMilestones, ms.gems],
        },
      };
    });
  }, []);

  const handleBuyArenaTicket = useCallback(() => {
    setSave((prev) => {
      if (prev.gems < 20) return prev;
      const ar = normalizeArena(prev.arena);
      if (ar.ticketsRemaining >= 15) return prev;
      soundEngine.playUiClick(1.1);
      return {
        ...prev,
        gems: prev.gems - 20,
        nightMarket: addGemsSpent(prev, 20),
        arena: {
          ...ar,
          ticketsRemaining: Math.min(15, ar.ticketsRemaining + 2),
        },
      };
    });
  }, []);

  const handleClaimArenaRankTier = useCallback((tierId: string) => {
    const tier = ARENA_RANK_TIERS.find((t) => t.id === tierId);
    if (!tier) return;
    setSave((prev) => {
      const ar = normalizeArena(prev.arena);
      if (ar.bestRating < tier.minRating || ar.claimedRankTiers.includes(tierId)) return prev;
      soundEngine.playVictory();
      return {
        ...prev,
        gold: prev.gold + tier.rewardGold,
        gems: prev.gems + tier.rewardGems,
        arena: {
          ...ar,
          claimedRankTiers: [...ar.claimedRankTiers, tierId],
        },
      };
    });
  }, []);

  const handleCraftSocketGem = useCallback((tier: 1 | 2) => {
    const cost = getSocketGemCraftCost(tier);
    setSave((prev) => {
      const dust = prev.starDust ?? 0;
      if (dust < cost.starDust || prev.gold < cost.gold) return prev;
      const randColor =
        SOCKET_GEM_COLORS[Math.floor(Math.random() * SOCKET_GEM_COLORS.length)] ?? 'ruby';
      const gems = normalizeSocketGems(prev.socketGems);
      return {
        ...prev,
        gold: prev.gold - cost.gold,
        starDust: dust - cost.starDust,
        socketGems: [...gems, createSocketGem(randColor, tier)],
      };
    });
  }, []);

  const handleFuseSocketGem = useCallback((color: SocketGemColor, tier: 1 | 2) => {
    setSave((prev) => {
      const gems = normalizeSocketGems(prev.socketGems);
      const usedSet = new Set<string>();
      for (const item of prev.inventory) {
        for (const gid of item.socketedGems ?? []) {
          usedSet.add(gid);
        }
      }
      const candidates = gems.filter(
        (g) => g.color === color && g.tier === tier && !usedSet.has(g.uid)
      );
      if (candidates.length < 3) return prev;
      const consumed = new Set(candidates.slice(0, 3).map((g) => g.uid));
      const nextGems: SocketGemInstance[] = [
        ...gems.filter((g) => !consumed.has(g.uid)),
        createSocketGem(color, (tier + 1) as 2 | 3),
      ];
      return {
        ...prev,
        socketGems: nextGems,
      };
    });
  }, []);

  const handleSocketGemToGear = useCallback((gearUid: string, gemUid: string) => {
    setSave((prev) => {
      const itemIdx = prev.inventory.findIndex((g) => g.uid === gearUid);
      if (itemIdx === -1) return prev;
      const item = prev.inventory[itemIdx];
      const maxSlots = getMaxGemSocketsForRarity(item.rarity);
      const currentSockets = item.socketedGems ?? [];
      if (currentSockets.length >= maxSlots) return prev;

      const gems = normalizeSocketGems(prev.socketGems);
      if (!gems.some((g) => g.uid === gemUid)) return prev;
      const alreadyUsed = prev.inventory.some((g) => (g.socketedGems ?? []).includes(gemUid));
      if (alreadyUsed) return prev;

      const nextInv = [...prev.inventory];
      nextInv[itemIdx] = { ...item, socketedGems: [...currentSockets, gemUid] };
      return {
        ...prev,
        inventory: nextInv,
      };
    });
  }, []);

  const handleUnsocketGemFromGear = useCallback((gearUid: string, gemUid: string) => {
    setSave((prev) => {
      const itemIdx = prev.inventory.findIndex((g) => g.uid === gearUid);
      if (itemIdx === -1) return prev;
      const item = prev.inventory[itemIdx];
      const nextInv = [...prev.inventory];
      nextInv[itemIdx] = {
        ...item,
        socketedGems: (item.socketedGems ?? []).filter((id) => id !== gemUid),
      };
      return {
        ...prev,
        inventory: nextInv,
      };
    });
  }, []);

  const handleClaimJourneyTask = useCallback((taskId: string) => {
    const task = NOVICE_JOURNEY_DAYS.flatMap((d) => d.tasks).find((t) => t.id === taskId);
    if (!task) return;
    setSave((prev) => {
      const journey = normalizeNoviceJourney(prev.noviceJourney);
      if (journey.claimedTaskIds.includes(taskId)) return prev;
      const statsNow = computePlayerStats(prev);
      if (getJourneyTaskCurrentValue(prev, statsNow.powerRating, task.metric) < task.target) {
        return prev;
      }
      soundEngine.playVictory();
      return {
        ...prev,
        gold: prev.gold + task.rewardGold,
        gems: prev.gems + task.rewardGems,
        starDust: (prev.starDust ?? 0) + task.rewardDust,
        noviceJourney: {
          ...journey,
          claimedTaskIds: [...journey.claimedTaskIds, taskId],
        },
      };
    });
  }, []);

  const handleClaimJourneyDay = useCallback((dayNumber: number) => {
    const dayDef = NOVICE_JOURNEY_DAYS.find((d) => d.day === dayNumber);
    if (!dayDef) return;
    setSave((prev) => {
      const journey = normalizeNoviceJourney(prev.noviceJourney);
      if (journey.claimedDayMilestones.includes(dayNumber)) return prev;
      const statsNow = computePlayerStats(prev);
      const allDone = dayDef.tasks.every(
        (t) => getJourneyTaskCurrentValue(prev, statsNow.powerRating, t.metric) >= t.target
      );
      if (!allDone) return prev;

      let nextInv = prev.inventory;
      if (dayDef.milestoneGearS) {
        const sWeapons = ALL_TEMPLATE_LIST.filter(
          (t) => t.isSTier && t.slot === GearSlot.WEAPON
        );
        const tpl =
          sWeapons[Math.floor(Math.random() * sWeapons.length)] ?? ALL_TEMPLATE_LIST[0];
        nextInv = [
          ...prev.inventory,
          {
            uid: `journey_d7_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            templateId: tpl.templateId,
            rarity: Rarity.EPIC,
            level: 1,
          },
        ];
      }

      soundEngine.playAchievement();
      return {
        ...prev,
        gold: prev.gold + dayDef.milestoneGold,
        gems: prev.gems + dayDef.milestoneGems,
        starDust: (prev.starDust ?? 0) + dayDef.milestoneDust,
        inventory: nextInv,
        noviceJourney: {
          ...journey,
          claimedDayMilestones: [...journey.claimedDayMilestones, dayNumber],
        },
      };
    });
  }, []);

  const handlePreviewLobbyUltimate = useCallback((heroId: HeroId) => {
    setPreviewHeroId(heroId);
    engineRef.current?.previewLobbyUltimate(heroId);
  }, []);

  const handleUpgradeConstellation = useCallback((id: ConstellationId) => {
    setSave((prev) => {
      const levels = normalizeConstellations(prev.constellations);
      const curLv = levels[id] ?? 0;
      if (curLv >= MAX_CONSTELLATION_LEVEL) return prev;
      const cost = getConstellationUpgradeCost(curLv);
      const dust = prev.starDust ?? 0;
      if (dust < cost.starDust || prev.gold < cost.gold) return prev;
      soundEngine.playLevelUp();
      const dq = normalizeDailyQuests(prev.dailyQuests);
      return {
        ...prev,
        gold: prev.gold - cost.gold,
        starDust: dust - cost.starDust,
        constellations: { ...levels, [id]: curLv + 1 },
        dailyQuests: { ...dq, upgrades: dq.upgrades + 1 },
      };
    });
  }, []);

  const handleUnlockGrowthFundPremium = useCallback(() => {
    setSave((prev) => {
      const gf = normalizeGrowthFund(prev.growthFund);
      if (gf.premiumUnlocked || prev.gems < GROWTH_FUND_PREMIUM_GEM_COST) return prev;
      soundEngine.playAchievement();
      return {
        ...prev,
        gems: prev.gems - GROWTH_FUND_PREMIUM_GEM_COST,
        nightMarket: addGemsSpent(prev, GROWTH_FUND_PREMIUM_GEM_COST),
        topUpEvolution: addTopUpPoints(prev, 70),
        growthFund: { ...gf, premiumUnlocked: true },
      };
    });
  }, []);

  const handleClaimGrowthFundReward = useCallback(
    (milestoneId: string, tier: 'free' | 'premium') => {
      const ms = GROWTH_FUND_MILESTONES.find((m) => m.id === milestoneId);
      if (!ms) return;
      setSave((prev) => {
        const gf = normalizeGrowthFund(prev.growthFund);
        const statsNow = computePlayerStats(prev);
        if (!isGrowthFundMilestoneMet(ms, prev, statsNow.powerRating)) return prev;
        if (tier === 'free' && gf.claimedFreeIds.includes(milestoneId)) return prev;
        if (tier === 'premium' && (!gf.premiumUnlocked || gf.claimedPremiumIds.includes(milestoneId))) {
          return prev;
        }

        const spec = tier === 'free' ? ms.freeReward : ms.premiumReward;
        let nextGold = prev.gold;
        let nextGems = prev.gems;
        let nextDust = prev.starDust ?? 0;
        let nextEssence = prev.petEssence ?? 0;
        let nextSocketGems = normalizeSocketGems(prev.socketGems);
        let nextInv = prev.inventory;

        if (spec.kind === 'gold') nextGold += spec.amount;
        else if (spec.kind === 'gems') nextGems += spec.amount;
        else if (spec.kind === 'star_dust') nextDust += spec.amount;
        else if (spec.kind === 'pet_essence') nextEssence += spec.amount;
        else if (spec.kind === 'socket_gem') {
          const randColor =
            SOCKET_GEM_COLORS[Math.floor(Math.random() * SOCKET_GEM_COLORS.length)] ?? 'ruby';
          const gemTier = spec.amount >= 3 ? 3 : spec.amount === 2 ? 2 : 1;
          nextSocketGems = [...nextSocketGems, createSocketGem(randColor, gemTier)];
        } else if (spec.kind === 'gear_s') {
          nextInv = [...nextInv, rollChestGear(true, Rarity.EPIC)];
        }

        soundEngine.playVictory();
        return {
          ...prev,
          gold: nextGold,
          gems: nextGems,
          starDust: nextDust,
          petEssence: nextEssence,
          socketGems: nextSocketGems,
          inventory: nextInv,
          growthFund: {
            ...gf,
            claimedFreeIds:
              tier === 'free' ? [...gf.claimedFreeIds, milestoneId] : gf.claimedFreeIds,
            claimedPremiumIds:
              tier === 'premium' ? [...gf.claimedPremiumIds, milestoneId] : gf.claimedPremiumIds,
          },
        };
      });
    },
    []
  );

  const handleClaimAllGrowthFund = useCallback(() => {
    setSave((prev) => {
      const gf = normalizeGrowthFund(prev.growthFund);
      const statsNow = computePlayerStats(prev);
      let nextGold = prev.gold;
      let nextGems = prev.gems;
      let nextDust = prev.starDust ?? 0;
      let nextEssence = prev.petEssence ?? 0;
      let nextSocketGems = normalizeSocketGems(prev.socketGems);
      let nextInv = prev.inventory;
      const claimedFree = [...gf.claimedFreeIds];
      const claimedPrem = [...gf.claimedPremiumIds];
      let anyClaimed = false;

      const applySpec = (spec: (typeof GROWTH_FUND_MILESTONES)[number]['freeReward']) => {
        if (spec.kind === 'gold') nextGold += spec.amount;
        else if (spec.kind === 'gems') nextGems += spec.amount;
        else if (spec.kind === 'star_dust') nextDust += spec.amount;
        else if (spec.kind === 'pet_essence') nextEssence += spec.amount;
        else if (spec.kind === 'socket_gem') {
          const randColor =
            SOCKET_GEM_COLORS[Math.floor(Math.random() * SOCKET_GEM_COLORS.length)] ?? 'ruby';
          const gemTier = spec.amount >= 3 ? 3 : spec.amount === 2 ? 2 : 1;
          nextSocketGems = [...nextSocketGems, createSocketGem(randColor, gemTier)];
        } else if (spec.kind === 'gear_s') {
          nextInv = [...nextInv, rollChestGear(true, Rarity.EPIC)];
        }
      };

      for (const ms of GROWTH_FUND_MILESTONES) {
        if (!isGrowthFundMilestoneMet(ms, prev, statsNow.powerRating)) continue;
        if (!claimedFree.includes(ms.id)) {
          claimedFree.push(ms.id);
          applySpec(ms.freeReward);
          anyClaimed = true;
        }
        if (gf.premiumUnlocked && !claimedPrem.includes(ms.id)) {
          claimedPrem.push(ms.id);
          applySpec(ms.premiumReward);
          anyClaimed = true;
        }
      }

      if (!anyClaimed) return prev;
      soundEngine.playAchievement();
      return {
        ...prev,
        gold: nextGold,
        gems: nextGems,
        starDust: nextDust,
        petEssence: nextEssence,
        socketGems: nextSocketGems,
        inventory: nextInv,
        growthFund: {
          ...gf,
          claimedFreeIds: claimedFree,
          claimedPremiumIds: claimedPrem,
        },
      };
    });
  }, []);

  const handleBuyArenaShopOffer = useCallback((offer: ArenaShopOffer) => {
    setSave((prev) => {
      const ar = normalizeArena(prev.arena);
      const shop = normalizeArenaShop(prev.arenaShop);
      const bought = shop.purchasedCounts[offer.id] ?? 0;
      if (bought >= offer.dailyLimit || ar.arenaCoins < offer.coinCost) return prev;

      let nextGems = prev.gems;
      let nextDust = prev.starDust ?? 0;
      let nextEssence = prev.petEssence ?? 0;
      let nextSocketGems = normalizeSocketGems(prev.socketGems);
      let nextInv = prev.inventory;
      let nextWheel = normalizeDestinyWheel(prev.destinyWheel);

      if (offer.rewardKind === 'gear_s') {
        nextInv = [...nextInv, rollChestGear(true, Rarity.EPIC)];
      } else if (offer.rewardKind === 'socket_gem_t3') {
        const randColor =
          SOCKET_GEM_COLORS[Math.floor(Math.random() * SOCKET_GEM_COLORS.length)] ?? 'ruby';
        nextSocketGems = [...nextSocketGems, createSocketGem(randColor, 3)];
      } else if (offer.rewardKind === 'gems') {
        nextGems += offer.amount;
      } else if (offer.rewardKind === 'destiny_ticket') {
        nextWheel = { ...nextWheel, tickets: nextWheel.tickets + offer.amount };
      } else if (offer.rewardKind === 'star_dust') {
        nextDust += offer.amount;
      } else if (offer.rewardKind === 'pet_essence') {
        nextEssence += offer.amount;
      }

      soundEngine.playVictory();
      return {
        ...prev,
        gems: nextGems,
        starDust: nextDust,
        petEssence: nextEssence,
        socketGems: nextSocketGems,
        inventory: nextInv,
        destinyWheel: nextWheel,
        arena: {
          ...ar,
          arenaCoins: ar.arenaCoins - offer.coinCost,
        },
        arenaShop: {
          ...shop,
          purchasedCounts: {
            ...shop.purchasedCounts,
            [offer.id]: bought + 1,
          },
        },
      };
    });
  }, []);

  const handleBuyCommercialPack = useCallback((pack: CommercialPackItem) => {
    setSave((prev) => {
      const claims = prev.commercialPackClaims ?? {};
      const count = claims[pack.id] ?? 0;
      if (count >= pack.maxClaims) return prev;
      if (pack.currency === 'gold' && prev.gold < pack.cost) return prev;
      if (pack.currency === 'gems' && prev.gems < pack.cost) return prev;

      let nextGold = pack.currency === 'gold' ? prev.gold - pack.cost : prev.gold;
      let nextGems = pack.currency === 'gems' ? prev.gems - pack.cost : prev.gems;
      let nextDust = prev.starDust ?? 0;
      let nextEssence = prev.petEssence ?? 0;
      let nextSocketGems = normalizeSocketGems(prev.socketGems);
      let nextInv = prev.inventory;
      let nextWheel = normalizeDestinyWheel(prev.destinyWheel);

      for (const rw of pack.rewards) {
        if (rw.kind === 'gold') nextGold += rw.amount;
        else if (rw.kind === 'gems') nextGems += rw.amount;
        else if (rw.kind === 'star_dust') nextDust += rw.amount;
        else if (rw.kind === 'pet_essence') nextEssence += rw.amount;
        else if (rw.kind === 'destiny_ticket') {
          nextWheel = { ...nextWheel, tickets: nextWheel.tickets + rw.amount };
        } else if (rw.kind === 'socket_gem_t2') {
          for (let i = 0; i < rw.amount; i++) {
            const randColor =
              SOCKET_GEM_COLORS[Math.floor(Math.random() * SOCKET_GEM_COLORS.length)] ?? 'ruby';
            nextSocketGems = [...nextSocketGems, createSocketGem(randColor, 2)];
          }
        } else if (rw.kind === 'gear_s') {
          for (let i = 0; i < rw.amount; i++) {
            nextInv = [...nextInv, rollChestGear(true, Rarity.EPIC)];
          }
        }
      }

      const topUpPts = Math.max(
        15,
        pack.currency === 'gems' ? pack.cost : Math.round(pack.cost / 25)
      );

      soundEngine.playAchievement();
      return {
        ...prev,
        gold: nextGold,
        gems: nextGems,
        starDust: nextDust,
        petEssence: nextEssence,
        socketGems: nextSocketGems,
        inventory: nextInv,
        destinyWheel: nextWheel,
        nightMarket: addGemsSpent(prev, pack.currency === 'gems' ? pack.cost : 0),
        topUpEvolution: addTopUpPoints(prev, topUpPts),
        commercialPackClaims: {
          ...claims,
          [pack.id]: count + 1,
        },
      };
    });
  }, []);

  // Wave 7 Handlers: 3D Wings, Avatar Frames, Mythic Badges, Monthly Privilege Cards, Top-Up Evolution, Auction House & World Boss Milestones
  const handleUnlockWing = useCallback((wingId: WingId, currency: 'gems' | 'feathers') => {
    const def = WING_MAP[wingId];
    if (!def) return;
    setSave((prev) => {
      const unlocked = prev.unlockedWings ?? [];
      if (unlocked.includes(wingId)) return prev;
      const feathers = prev.wingFeathers ?? 0;
      if (currency === 'gems' && prev.gems < def.unlockGems) return prev;
      if (currency === 'feathers' && feathers < def.unlockFeathers) return prev;

      const nextUnlockedFrames = new Set<AvatarFrameId>(
        prev.unlockedAvatarFrames ?? ['default_gold']
      );
      if (wingId === 'seraph_zodiac') {
        nextUnlockedFrames.add('seraph_crown');
      }

      soundEngine.playAchievement();
      return {
        ...prev,
        gems: currency === 'gems' ? prev.gems - def.unlockGems : prev.gems,
        wingFeathers: currency === 'feathers' ? feathers - def.unlockFeathers : feathers,
        nightMarket: addGemsSpent(prev, currency === 'gems' ? def.unlockGems : 0),
        unlockedWings: [...unlocked, wingId],
        wingLevels: { ...(prev.wingLevels ?? {}), [wingId]: 1 },
        equippedWingId: wingId,
        unlockedAvatarFrames: Array.from(nextUnlockedFrames),
      };
    });
  }, []);

  const handleEquipWing = useCallback((wingId: WingId | null) => {
    soundEngine.playUiClick(1.08);
    setSave((prev) => {
      if (wingId === null) return { ...prev, equippedWingId: null };
      if (!(prev.unlockedWings ?? []).includes(wingId)) return prev;
      return { ...prev, equippedWingId: wingId };
    });
  }, []);

  const handleUpgradeWing = useCallback((wingId: WingId) => {
    setSave((prev) => {
      if (!(prev.unlockedWings ?? []).includes(wingId)) return prev;
      const curLv = Math.max(1, prev.wingLevels?.[wingId] ?? 1);
      if (curLv >= MAX_WING_LEVEL) return prev;
      const cost = getWingUpgradeCost(curLv);
      const feathers = prev.wingFeathers ?? 0;
      if (feathers < cost.feathers || prev.gold < cost.gold) return prev;
      soundEngine.playLevelUp();
      return {
        ...prev,
        gold: prev.gold - cost.gold,
        wingFeathers: feathers - cost.feathers,
        wingLevels: { ...(prev.wingLevels ?? {}), [wingId]: curLv + 1 },
      };
    });
  }, []);

  const handleUnlockAvatarFrame = useCallback((frameId: AvatarFrameId) => {
    const def = AVATAR_FRAME_MAP[frameId];
    if (!def) return;
    setSave((prev) => {
      const unlocked = new Set<AvatarFrameId>(prev.unlockedAvatarFrames ?? ['default_gold']);
      if (unlocked.has(frameId)) return prev;

      const mp = normalizeMonthlyPrivilege(prev.monthlyPrivilege);
      const wb = normalizeWorldBoss(prev.worldBoss);
      const cd = normalizeCrystalDefense(prev.crystalDefense);
      const hasRoyal = isMonthlyCardActive(mp.royal);
      const canConditionUnlock =
        (frameId === 'royal_vip' && hasRoyal) ||
        (frameId === 'crystal_guardian' && cd.bestWave >= 4) ||
        (frameId === 'world_dragon' && wb.bestSingleDamage >= 150000) ||
        (frameId === 'seraph_crown' && (prev.unlockedWings ?? []).includes('seraph_zodiac'));

      if (canConditionUnlock) {
        unlocked.add(frameId);
        soundEngine.playAchievement();
        return {
          ...prev,
          unlockedAvatarFrames: Array.from(unlocked),
          equippedAvatarFrameId: frameId,
        };
      }

      if (!def.unlockGems || prev.gems < def.unlockGems) return prev;
      unlocked.add(frameId);
      soundEngine.playVictory();
      return {
        ...prev,
        gems: prev.gems - def.unlockGems,
        nightMarket: addGemsSpent(prev, def.unlockGems),
        unlockedAvatarFrames: Array.from(unlocked),
        equippedAvatarFrameId: frameId,
      };
    });
  }, []);

  const handleEquipAvatarFrame = useCallback((frameId: AvatarFrameId) => {
    soundEngine.playUiClick(1.08);
    setSave((prev) => {
      const unlocked = prev.unlockedAvatarFrames ?? ['default_gold'];
      if (!unlocked.includes(frameId)) return prev;
      return { ...prev, equippedAvatarFrameId: frameId };
    });
  }, []);

  const handleClaimMythicBadge = useCallback((badgeId: MythicBadgeId) => {
    const def = MYTHIC_BADGE_MAP[badgeId];
    if (!def) return;
    setSave((prev) => {
      const claimed = prev.claimedMythicBadges ?? [];
      if (claimed.includes(badgeId)) return prev;
      const statsNow = computePlayerStats(prev);
      if (getMythicBadgeMetricValue(def, prev, statsNow.powerRating) < def.target) return prev;
      soundEngine.playAchievement();
      return {
        ...prev,
        claimedMythicBadges: [...claimed, badgeId],
        equippedMythicBadgeId: badgeId,
      };
    });
  }, []);

  const handleEquipMythicBadge = useCallback((badgeId: MythicBadgeId | null) => {
    soundEngine.playUiClick(1.08);
    setSave((prev) => {
      if (badgeId === null) return { ...prev, equippedMythicBadgeId: null };
      if (!(prev.claimedMythicBadges ?? []).includes(badgeId)) return prev;
      return { ...prev, equippedMythicBadgeId: badgeId };
    });
  }, []);

  const handleBuyMonthlyCard = useCallback((tier: MonthlyCardTier) => {
    const def = MONTHLY_CARD_MAP[tier];
    if (!def) return;
    setSave((prev) => {
      if (prev.gems < def.gemCost) return prev;
      const mp = normalizeMonthlyPrivilege(prev.monthlyPrivilege);
      const curSlot = tier === 'silver_astral' ? mp.silver : mp.royal;
      const wasActive = isMonthlyCardActive(curSlot);
      const nextUntil = getNextMonthlyExpiryDate(curSlot.activeUntilDate, def.durationDays);

      const nextMp =
        tier === 'silver_astral'
          ? { ...mp, silver: { ...mp.silver, activeUntilDate: nextUntil } }
          : { ...mp, royal: { ...mp.royal, activeUntilDate: nextUntil } };

      const cd = normalizeCrystalDefense(prev.crystalDefense);
      const ar = normalizeArena(prev.arena);
      const nextFrames = new Set<AvatarFrameId>(prev.unlockedAvatarFrames ?? ['default_gold']);
      if (tier === 'royal_zodiac') {
        nextFrames.add('royal_vip');
      }

      soundEngine.playAchievement();
      return {
        ...prev,
        gems: prev.gems - def.gemCost + def.instantGems,
        wingFeathers: (prev.wingFeathers ?? 0) + def.instantFeathers,
        nightMarket: addGemsSpent(prev, def.gemCost),
        topUpEvolution: addTopUpPoints(prev, def.gemCost),
        monthlyPrivilege: nextMp,
        unlockedAvatarFrames: Array.from(nextFrames),
        crystalDefense: !wasActive
          ? { ...cd, runsRemaining: cd.runsRemaining + def.extraDefenseRuns }
          : cd,
        arena:
          !wasActive && def.extraArenaTickets > 0
            ? { ...ar, ticketsRemaining: ar.ticketsRemaining + def.extraArenaTickets }
            : ar,
      };
    });
  }, []);

  const handleClaimMonthlyCardDaily = useCallback((tier: MonthlyCardTier) => {
    const def = MONTHLY_CARD_MAP[tier];
    if (!def) return;
    const today = getTodayKey();
    setSave((prev) => {
      const mp = normalizeMonthlyPrivilege(prev.monthlyPrivilege);
      const slot = tier === 'silver_astral' ? mp.silver : mp.royal;
      if (!isMonthlyCardActive(slot, today) || slot.lastClaimDate === today) return prev;

      const nextMp =
        tier === 'silver_astral'
          ? { ...mp, silver: { ...mp.silver, lastClaimDate: today } }
          : { ...mp, royal: { ...mp.royal, lastClaimDate: today } };

      soundEngine.playVictory();
      return {
        ...prev,
        gold: prev.gold + def.dailyGold,
        gems: prev.gems + def.dailyGems,
        wingFeathers: (prev.wingFeathers ?? 0) + def.dailyFeathers,
        starDust: (prev.starDust ?? 0) + def.dailyStarDust,
        monthlyPrivilege: nextMp,
      };
    });
  }, []);

  const handleClaimTopUpEvolutionTier = useCallback((tierId: string) => {
    const tier = TOPUP_EVOLUTION_MILESTONES.find((m) => m.id === tierId);
    if (!tier) return;
    setSave((prev) => {
      const tu = normalizeTopUpEvolution(prev.topUpEvolution);
      if (tu.points < tier.pointsRequired || tu.claimedTierIds.includes(tierId)) return prev;

      let nextGold = prev.gold;
      let nextGems = prev.gems;
      let nextFeathers = prev.wingFeathers ?? 0;
      let nextDust = prev.starDust ?? 0;
      let nextInv = prev.inventory;
      const nextWings = new Set<WingId>(prev.unlockedWings ?? []);
      const nextWingLevels = { ...(prev.wingLevels ?? {}) };
      const nextFrames = new Set<AvatarFrameId>(prev.unlockedAvatarFrames ?? ['default_gold']);

      for (const rw of tier.rewards) {
        if (rw.kind === 'gold') nextGold += rw.amount;
        else if (rw.kind === 'gems') nextGems += rw.amount;
        else if (rw.kind === 'feathers') nextFeathers += rw.amount;
        else if (rw.kind === 'star_dust') nextDust += rw.amount;
        else if (rw.kind === 'gear_s') {
          nextInv = [...nextInv, rollChestGear(true, Rarity.LEGENDARY, true)];
        } else if (rw.kind === 'wing' && rw.wingId) {
          if (nextWings.has(rw.wingId)) {
            nextFeathers += 45;
          } else {
            nextWings.add(rw.wingId);
            nextWingLevels[rw.wingId] = nextWingLevels[rw.wingId] ?? 1;
          }
        } else if (rw.kind === 'frame' && rw.frameId) {
          nextFrames.add(rw.frameId);
        }
      }

      soundEngine.playAchievement();
      return {
        ...prev,
        gold: nextGold,
        gems: nextGems,
        wingFeathers: nextFeathers,
        starDust: nextDust,
        inventory: nextInv,
        unlockedWings: Array.from(nextWings),
        wingLevels: nextWingLevels,
        unlockedAvatarFrames: Array.from(nextFrames),
        topUpEvolution: {
          ...tu,
          claimedTierIds: [...tu.claimedTierIds, tierId],
        },
      };
    });
  }, []);

  const handlePlaceAuctionBid = useCallback((lotId: string, bidAmount: number) => {
    setSave((prev) => {
      const ah = normalizeAuctionHouse(prev.auctionHouse);
      const lotIdx = ah.lots.findIndex((l) => l.id === lotId && l.status === 'active');
      if (lotIdx === -1) return prev;
      const lot = ah.lots[lotIdx];
      if (lot.isPlayerListing) return prev;
      const minBid = Math.ceil(lot.currentBid * 1.1);
      const actualBid = Math.max(minBid, bidAmount);
      const deltaGems = actualBid - lot.playerBidAmount;
      if (deltaGems <= 0 || prev.gems < deltaGems) return prev;

      const nextLots = [...ah.lots];
      nextLots[lotIdx] = {
        ...lot,
        currentBid: actualBid,
        playerBidAmount: actualBid,
        highestBidderIsPlayer: true,
      };
      soundEngine.playUiClick(1.1);
      return {
        ...prev,
        gems: prev.gems - deltaGems,
        nightMarket: addGemsSpent(prev, deltaGems),
        auctionHouse: {
          ...ah,
          lots: nextLots,
        },
      };
    });
  }, []);

  const handleBuyoutAuctionLot = useCallback((lotId: string) => {
    setSave((prev) => {
      const ah = normalizeAuctionHouse(prev.auctionHouse);
      const lot = ah.lots.find((l) => l.id === lotId && l.status === 'active');
      if (!lot || lot.isPlayerListing) return prev;
      const deltaGems = Math.max(0, lot.buyoutPrice - lot.playerBidAmount);
      if (prev.gems < deltaGems) return prev;

      const claimEntry = {
        id: `claim_buyout_${lot.id}_${Date.now()}`,
        title: `Mua đứt thành công: ${lot.label}`,
        gear: lot.gear,
        socketGem: lot.socketGem,
        reason: `Đã chốt mua đứt trên Sàn Đấu Giá (${lot.buyoutPrice} Ngọc Hồn).`,
      };

      soundEngine.playVictory();
      return {
        ...prev,
        gems: prev.gems - deltaGems,
        nightMarket: addGemsSpent(prev, deltaGems),
        auctionHouse: {
          ...ah,
          lots: ah.lots.filter((l) => l.id !== lotId),
          claimBox: [claimEntry, ...ah.claimBox],
          totalTrades: ah.totalTrades + 1,
        },
      };
    });
  }, []);

  const handleListAuctionGear = useCallback(
    (gearUid: string, startBid: number, buyoutPrice: number) => {
      setSave((prev) => {
        const eqSet = new Set(Object.values(prev.equipped));
        if (eqSet.has(gearUid)) return prev;
        const item = prev.inventory.find((g) => g.uid === gearUid);
        if (!item) return prev;
        const tpl = GEAR_TEMPLATES[item.templateId];
        if (!tpl) return prev;

        const cleanStart = Math.max(5, Math.round(startBid));
        const cleanBuyout = Math.max(cleanStart + 5, Math.round(buyoutPrice));
        const now = Date.now();
        const ah = normalizeAuctionHouse(prev.auctionHouse, now);
        const lot: AuctionLotItem = {
          id: `player_lot_g_${now}_${Math.random().toString(36).slice(2, 6)}`,
          sellerName: 'Bạn (Ký Gửi)',
          itemKind: 'gear',
          gear: item,
          label: `${tpl.name} (${item.rarity})`,
          rarity: item.rarity,
          startingBid: cleanStart,
          currentBid: cleanStart,
          buyoutPrice: cleanBuyout,
          highestBidderIsPlayer: false,
          playerBidAmount: 0,
          endsAt: now + 90 * 1000,
          status: 'active',
          isPlayerListing: true,
        };

        soundEngine.playUiClick(1.08);
        return {
          ...prev,
          inventory: prev.inventory.filter((g) => g.uid !== gearUid),
          auctionHouse: {
            ...ah,
            lots: [lot, ...ah.lots],
          },
        };
      });
    },
    []
  );

  const handleListAuctionGem = useCallback(
    (gemUid: string, startBid: number, buyoutPrice: number) => {
      setSave((prev) => {
        const socketedSet = new Set<string>();
        prev.inventory.forEach((g) => g.socketedGems?.forEach((id) => socketedSet.add(id)));
        if (socketedSet.has(gemUid)) return prev;

        const gemsPool = normalizeSocketGems(prev.socketGems);
        const gem = gemsPool.find((g) => g.uid === gemUid);
        if (!gem) return prev;

        const cleanStart = Math.max(5, Math.round(startBid));
        const cleanBuyout = Math.max(cleanStart + 5, Math.round(buyoutPrice));
        const now = Date.now();
        const ah = normalizeAuctionHouse(prev.auctionHouse, now);
        const colorName =
          gem.color === 'ruby'
            ? 'Hồng Ngọc'
            : gem.color === 'sapphire'
            ? 'Lam Ngọc'
            : gem.color === 'topaz'
            ? 'Hoàng Ngọc'
            : 'Lục Ngọc';

        const lot: AuctionLotItem = {
          id: `player_lot_m_${now}_${Math.random().toString(36).slice(2, 6)}`,
          sellerName: 'Bạn (Ký Gửi)',
          itemKind: 'socket_gem',
          socketGem: gem,
          label: `${colorName} Cấp ${gem.tier === 3 ? 'III' : gem.tier === 2 ? 'II' : 'I'}`,
          rarity:
            gem.tier === 3 ? Rarity.LEGENDARY : gem.tier === 2 ? Rarity.EPIC : Rarity.RARE,
          startingBid: cleanStart,
          currentBid: cleanStart,
          buyoutPrice: cleanBuyout,
          highestBidderIsPlayer: false,
          playerBidAmount: 0,
          endsAt: now + 90 * 1000,
          status: 'active',
          isPlayerListing: true,
        };

        soundEngine.playUiClick(1.08);
        return {
          ...prev,
          socketGems: gemsPool.filter((g) => g.uid !== gemUid),
          auctionHouse: {
            ...ah,
            lots: [lot, ...ah.lots],
          },
        };
      });
    },
    []
  );

  const handleCancelAuctionListing = useCallback((lotId: string) => {
    setSave((prev) => {
      const ah = normalizeAuctionHouse(prev.auctionHouse);
      const lot = ah.lots.find((l) => l.id === lotId && l.isPlayerListing);
      if (!lot) return prev;

      soundEngine.playUiClick();
      return {
        ...prev,
        inventory: lot.gear ? [...prev.inventory, lot.gear] : prev.inventory,
        socketGems: lot.socketGem
          ? [...normalizeSocketGems(prev.socketGems), lot.socketGem]
          : prev.socketGems,
        auctionHouse: {
          ...ah,
          lots: ah.lots.filter((l) => l.id !== lotId),
        },
      };
    });
  }, []);

  const handleClaimAuctionEntry = useCallback((entryId: string) => {
    setSave((prev) => {
      const ah = normalizeAuctionHouse(prev.auctionHouse);
      const entry = ah.claimBox.find((c) => c.id === entryId);
      if (!entry) return prev;

      soundEngine.playVictory();
      return {
        ...prev,
        gold: prev.gold + (entry.gold ?? 0),
        gems: prev.gems + (entry.gems ?? 0),
        inventory: entry.gear ? [...prev.inventory, entry.gear] : prev.inventory,
        socketGems: entry.socketGem
          ? [...normalizeSocketGems(prev.socketGems), entry.socketGem]
          : prev.socketGems,
        auctionHouse: {
          ...ah,
          claimBox: ah.claimBox.filter((c) => c.id !== entryId),
        },
      };
    });
  }, []);

  const handleClaimAuctionAll = useCallback(() => {
    setSave((prev) => {
      const ah = normalizeAuctionHouse(prev.auctionHouse);
      if (ah.claimBox.length === 0) return prev;

      let goldGain = 0;
      let gemsGain = 0;
      const newGears: GearInstance[] = [];
      const newGems: SocketGemInstance[] = [];
      for (const entry of ah.claimBox) {
        goldGain += entry.gold ?? 0;
        gemsGain += entry.gems ?? 0;
        if (entry.gear) newGears.push(entry.gear);
        if (entry.socketGem) newGems.push(entry.socketGem);
      }

      soundEngine.playVictory();
      return {
        ...prev,
        gold: prev.gold + goldGain,
        gems: prev.gems + gemsGain,
        inventory: newGears.length > 0 ? [...prev.inventory, ...newGears] : prev.inventory,
        socketGems:
          newGems.length > 0
            ? [...normalizeSocketGems(prev.socketGems), ...newGems]
            : prev.socketGems,
        auctionHouse: {
          ...ah,
          claimBox: [],
        },
      };
    });
  }, []);

  const handleRefreshAuctionLots = useCallback(() => {
    setSave((prev) => {
      if (prev.gems < 15) return prev;
      const now = Date.now();
      const ah = normalizeAuctionHouse(prev.auctionHouse, now);
      const keptPlayerLots = ah.lots.filter((l) => l.isPlayerListing && l.status === 'active');
      const freshMarket = generateRotatingAuctionLots(now);
      soundEngine.playUiClick(1.1);
      return {
        ...prev,
        gems: prev.gems - 15,
        nightMarket: addGemsSpent(prev, 15),
        auctionHouse: {
          ...ah,
          lastRefreshAt: now,
          lots: [...keptPlayerLots, ...freshMarket],
        },
      };
    });
  }, []);

  const handleClaimWorldBossMilestone = useCallback((milestoneId: string) => {
    const ms = WORLD_BOSS_MILESTONES.find((m) => m.id === milestoneId);
    if (!ms) return;
    setSave((prev) => {
      const wb = normalizeWorldBoss(prev.worldBoss);
      if (wb.bestSingleDamage < ms.damageTarget || wb.claimedMilestoneIds.includes(milestoneId)) {
        return prev;
      }
      const nextFrames = new Set<AvatarFrameId>(prev.unlockedAvatarFrames ?? ['default_gold']);
      if (ms.rewardFrame) {
        nextFrames.add(ms.rewardFrame);
      }
      soundEngine.playAchievement();
      return {
        ...prev,
        gems: prev.gems + ms.rewardGems,
        wingFeathers: (prev.wingFeathers ?? 0) + ms.rewardFeathers,
        starDust: (prev.starDust ?? 0) + ms.rewardStarDust,
        unlockedAvatarFrames: Array.from(nextFrames),
        worldBoss: {
          ...wb,
          claimedMilestoneIds: [...wb.claimedMilestoneIds, milestoneId],
        },
      };
    });
  }, []);

  // Wave 8 Handlers: Zodiac Mounts, Weapon Auras, Camera Presets, Wardrobe 3D, Wish Pool SSR, First Top-Up X2, Hot Flash Bundles, Companion Dispatch & Blood Moon
  const handleChangeCameraPreset = useCallback((preset: LobbyCameraPreset) => {
    setCameraPreset(preset);
    engineRef.current?.setLobbyCameraPreset(preset);
  }, []);

  const handleOpenWardrobe = useCallback(() => {
    setWardrobeOpen(true);
    setWardrobePreview({});
    setCameraPreset('wardrobe');
    engineRef.current?.setLobbyCameraPreset('wardrobe');
  }, []);

  const handleCloseWardrobe = useCallback(() => {
    setWardrobeOpen(false);
    setWardrobePreview({});
    setCameraPreset('overview');
    engineRef.current?.setLobbyCameraPreset('overview');
  }, []);

  const handleUnlockMount = useCallback((mountId: MountId, currency: 'gems' | 'shards') => {
    const def = MOUNT_MAP[mountId];
    if (!def) return;
    setSave((prev) => {
      const unlocked = prev.unlockedMounts ?? [];
      if (unlocked.includes(mountId)) return prev;
      const shards = prev.mountShards ?? 0;
      if (currency === 'gems' && prev.gems < def.unlockGems) return prev;
      if (currency === 'shards' && shards < def.unlockShards) return prev;

      soundEngine.playAchievement();
      return {
        ...prev,
        gems: currency === 'gems' ? prev.gems - def.unlockGems : prev.gems,
        mountShards: currency === 'shards' ? shards - def.unlockShards : shards,
        nightMarket: addGemsSpent(prev, currency === 'gems' ? def.unlockGems : 0),
        unlockedMounts: [...unlocked, mountId],
        mountLevels: { ...(prev.mountLevels ?? {}), [mountId]: 1 },
        equippedMountId: mountId,
      };
    });
  }, []);

  const handleEquipMount = useCallback((mountId: MountId | null) => {
    soundEngine.playUiClick(1.08);
    setSave((prev) => {
      if (mountId === null) return { ...prev, equippedMountId: null };
      if (!(prev.unlockedMounts ?? []).includes(mountId)) return prev;
      return { ...prev, equippedMountId: mountId };
    });
  }, []);

  const handleUpgradeMount = useCallback((mountId: MountId) => {
    setSave((prev) => {
      if (!(prev.unlockedMounts ?? []).includes(mountId)) return prev;
      const curLv = Math.max(1, prev.mountLevels?.[mountId] ?? 1);
      if (curLv >= MAX_MOUNT_LEVEL) return prev;
      const cost = getMountUpgradeCost(curLv);
      const shards = prev.mountShards ?? 0;
      if (shards < cost.shards || prev.gold < cost.gold) return prev;
      soundEngine.playLevelUp();
      return {
        ...prev,
        gold: prev.gold - cost.gold,
        mountShards: shards - cost.shards,
        mountLevels: { ...(prev.mountLevels ?? {}), [mountId]: curLv + 1 },
      };
    });
  }, []);

  const handleUnlockWeaponAura = useCallback(
    (auraId: WeaponAuraId, currency: 'gems' | 'crystals') => {
      const def = WEAPON_AURA_MAP[auraId];
      if (!def || auraId === 'none') return;
      setSave((prev) => {
        const unlocked = prev.unlockedWeaponAuras ?? ['none'];
        if (unlocked.includes(auraId)) return prev;
        const crystals = prev.awakeningCrystals ?? 0;
        if (currency === 'gems' && prev.gems < def.unlockGems) return prev;
        if (currency === 'crystals' && crystals < def.unlockCrystals) return prev;

        soundEngine.playAchievement();
        return {
          ...prev,
          gems: currency === 'gems' ? prev.gems - def.unlockGems : prev.gems,
          awakeningCrystals: currency === 'crystals' ? crystals - def.unlockCrystals : crystals,
          nightMarket: addGemsSpent(prev, currency === 'gems' ? def.unlockGems : 0),
          unlockedWeaponAuras: [...unlocked, auraId],
          weaponAuraLevels: { ...(prev.weaponAuraLevels ?? {}), [auraId]: 1 },
          equippedWeaponAuraId: auraId,
        };
      });
    },
    []
  );

  const handleEquipWeaponAura = useCallback((auraId: WeaponAuraId) => {
    soundEngine.playUiClick(1.06);
    setSave((prev) => {
      const unlocked = prev.unlockedWeaponAuras ?? ['none'];
      if (!unlocked.includes(auraId)) return prev;
      return { ...prev, equippedWeaponAuraId: auraId };
    });
  }, []);

  const handleUpgradeWeaponAura = useCallback((auraId: WeaponAuraId) => {
    if (auraId === 'none') return;
    setSave((prev) => {
      if (!(prev.unlockedWeaponAuras ?? ['none']).includes(auraId)) return prev;
      const curLv = Math.max(1, prev.weaponAuraLevels?.[auraId] ?? 1);
      if (curLv >= MAX_WEAPON_AURA_LEVEL) return prev;
      const cost = getWeaponAuraUpgradeCost(curLv);
      const crystals = prev.awakeningCrystals ?? 0;
      if (crystals < cost.crystals || prev.gold < cost.gold) return prev;
      soundEngine.playLevelUp();
      return {
        ...prev,
        gold: prev.gold - cost.gold,
        awakeningCrystals: crystals - cost.crystals,
        weaponAuraLevels: { ...(prev.weaponAuraLevels ?? {}), [auraId]: curLv + 1 },
      };
    });
  }, []);

  const handleSelectWishTarget = useCallback((targetId: string) => {
    setSave((prev) => {
      const wp = normalizeWishPool(prev.wishPool);
      return {
        ...prev,
        wishPool: { ...wp, selectedTargetId: targetId },
      };
    });
  }, []);

  const handleWishPoolRoll = useCallback(
    (count: 1 | 10) => {
      const curWp = normalizeWishPool(save.wishPool);
      const tickets = save.wishTickets ?? 0;
      const useTickets = tickets >= count;
      const gemCost = count === 10 ? WISH_POOL_10_COST_GEMS : WISH_POOL_COST_GEMS;
      if (!useTickets && save.gems < gemCost) return;

      const targetDef =
        WISH_TARGET_CATALOG.find((t) => t.id === curWp.selectedTargetId) ?? WISH_TARGET_CATALOG[0];
      const { outcomes, nextPity } = rollWishPoolBatch(count, curWp.pityCount, targetDef.name);
      setWishLastOutcomes(
        outcomes.map((o) => ({ label: o.label, rarity: o.rarity, isTargetHit: o.isTargetHit }))
      );
      soundEngine.playVictory();

      setSave((prev) => {
        const wp = normalizeWishPool(prev.wishPool);
        const curTickets = prev.wishTickets ?? 0;
        const canUseTickets = curTickets >= count;
        if (!canUseTickets && prev.gems < gemCost) return prev;

        let nextGold = prev.gold;
        let nextGems = canUseTickets ? prev.gems : prev.gems - gemCost;
        let nextDust = prev.starDust ?? 0;
        let nextShards = prev.mountShards ?? 0;
        let nextCrystals = prev.awakeningCrystals ?? 0;
        let nextFeathers = prev.wingFeathers ?? 0;
        const nextInv = [...prev.inventory];
        const nextMounts = new Set<MountId>(prev.unlockedMounts ?? []);
        let nextEquippedMount = prev.equippedMountId ?? null;
        const nextMountLevels = { ...(prev.mountLevels ?? {}) };
        const nextWings = new Set<WingId>(prev.unlockedWings ?? []);
        let nextEquippedWing = prev.equippedWingId ?? null;
        const nextWingLevels = { ...(prev.wingLevels ?? {}) };
        const nextHeroes = new Set<HeroId>(prev.unlockedHeroes);
        const nextHeroStars = { ...prev.heroStars };

        for (const out of outcomes) {
          if (out.rewardKind === 'gold') nextGold += out.amount;
          else if (out.rewardKind === 'star_dust') nextDust += out.amount;
          else if (out.rewardKind === 'mount_shards') {
            nextShards += out.amount;
            if (out.rarity === 'SSR') nextCrystals += 10;
          } else if (out.rewardKind === 'awaken_crystals') nextCrystals += out.amount;
          else if (out.rewardKind === 'wing_feathers') nextFeathers += out.amount;
          else if (out.rewardKind === 'epic_gear') {
            nextInv.push(rollChestGear(false, Rarity.EPIC));
          } else if (out.rewardKind === 'target') {
            if (targetDef.kind === 'mount') {
              const mId = targetDef.refId as MountId;
              if (nextMounts.has(mId)) {
                nextShards += 30;
              } else {
                nextMounts.add(mId);
                nextMountLevels[mId] = 1;
                if (!nextEquippedMount) nextEquippedMount = mId;
              }
            } else if (targetDef.kind === 'wing') {
              const wId = targetDef.refId as WingId;
              if (nextWings.has(wId)) {
                nextFeathers += 28;
              } else {
                nextWings.add(wId);
                nextWingLevels[wId] = 1;
                if (!nextEquippedWing) nextEquippedWing = wId;
              }
            } else if (targetDef.kind === 'hero') {
              const hId = targetDef.refId as HeroId;
              if (!nextHeroes.has(hId)) {
                nextHeroes.add(hId);
              } else {
                const curS = nextHeroStars[hId] ?? 0;
                if (curS < 5) nextHeroStars[hId] = curS + 1;
                else nextGems += 25;
              }
            } else {
              nextInv.push(rollChestGear(true, Rarity.LEGENDARY, true));
            }
          }
        }

        const newLogs = [...outcomes.map((o) => o.label).reverse(), ...wp.recentLogs].slice(0, 8);

        return {
          ...prev,
          gold: nextGold,
          gems: nextGems,
          wishTickets: canUseTickets ? curTickets - count : curTickets,
          starDust: nextDust,
          mountShards: nextShards,
          awakeningCrystals: nextCrystals,
          wingFeathers: nextFeathers,
          inventory: nextInv,
          unlockedMounts: Array.from(nextMounts),
          mountLevels: nextMountLevels,
          equippedMountId: nextEquippedMount,
          unlockedWings: Array.from(nextWings),
          wingLevels: nextWingLevels,
          equippedWingId: nextEquippedWing,
          unlockedHeroes: Array.from(nextHeroes),
          heroStars: nextHeroStars,
          nightMarket: addGemsSpent(prev, canUseTickets ? 0 : gemCost),
          wishPool: {
            ...wp,
            pityCount: nextPity,
            totalWishes: wp.totalWishes + count,
            recentLogs: newLogs,
          },
        };
      });
    },
    [save.wishPool, save.wishTickets, save.gems]
  );

  const handleClaimWishMilestone = useCallback((count: number) => {
    const ms = WISH_MILESTONES.find((m) => m.count === count);
    if (!ms) return;
    setSave((prev) => {
      const wp = normalizeWishPool(prev.wishPool);
      if (wp.totalWishes < ms.count || wp.claimedMilestones.includes(ms.count)) return prev;
      soundEngine.playAchievement();
      return {
        ...prev,
        gems: prev.gems + ms.rewardGems,
        mountShards: (prev.mountShards ?? 0) + ms.rewardShards,
        awakeningCrystals: (prev.awakeningCrystals ?? 0) + ms.rewardCrystals,
        wishPool: {
          ...wp,
          claimedMilestones: [...wp.claimedMilestones, ms.count],
        },
      };
    });
  }, []);

  const handleClaimFirstTopUp = useCallback((tierId: string) => {
    const tier = FIRST_TOPUP_TIERS.find((t) => t.id === tierId);
    if (!tier) return;
    setSave((prev) => {
      const ftu = normalizeFirstTopUp(prev.firstTopUp);
      const alreadyClaimed = ftu.claimedTierIds.includes(tier.id);
      const gemGain = alreadyClaimed
        ? tier.baseGems
        : tier.baseGems + tier.bonusGemsFirstTime;
      const nextInv = tier.bonusSGear
        ? [...prev.inventory, rollChestGear(true, Rarity.EPIC, true)]
        : prev.inventory;

      soundEngine.playAchievement();
      return {
        ...prev,
        gems: prev.gems + gemGain,
        mountShards: (prev.mountShards ?? 0) + tier.bonusMountShards,
        awakeningCrystals: (prev.awakeningCrystals ?? 0) + tier.bonusAwakeningCrystals,
        inventory: nextInv,
        topUpEvolution: addTopUpPoints(prev, tier.topUpPoints),
        firstTopUp: alreadyClaimed
          ? ftu
          : { claimedTierIds: [...ftu.claimedTierIds, tier.id] },
      };
    });
  }, []);

  const handleBuyHotBundle = useCallback((bundleId: string) => {
    const bundle = HOT_FLASH_BUNDLES.find((b) => b.id === bundleId);
    if (!bundle) return;
    setSave((prev) => {
      const claimed = prev.claimedHotBundleIds ?? [];
      if (claimed.includes(bundle.id) || prev.gems < bundle.costGems) return prev;
      soundEngine.playVictory();
      return {
        ...prev,
        gems: prev.gems - bundle.costGems + bundle.rewardGems,
        gold: prev.gold + bundle.rewardGold,
        mountShards: (prev.mountShards ?? 0) + bundle.rewardMountShards,
        awakeningCrystals: (prev.awakeningCrystals ?? 0) + bundle.rewardCrystals,
        wishTickets: (prev.wishTickets ?? 0) + bundle.rewardWishTickets,
        wingFeathers: (prev.wingFeathers ?? 0) + bundle.rewardFeathers,
        nightMarket: addGemsSpent(prev, bundle.costGems),
        topUpEvolution: addTopUpPoints(prev, bundle.topUpPoints),
        claimedHotBundleIds: [...claimed, bundle.id],
      };
    });
  }, []);

  const handleStartDispatch = useCallback(
    (slotIndex: number, missionId: string, heroId: HeroId) => {
      const mission = getDispatchMissionDef(missionId);
      if (!mission) return;
      setSave((prev) => {
        if (!prev.unlockedHeroes.includes(heroId)) return prev;
        const dispatch = normalizeDispatchState(prev.dispatch);
        if (slotIndex < 0 || slotIndex >= dispatch.slots.length) return prev;
        if (dispatch.slots[slotIndex].missionId !== null) return prev;
        if (dispatch.slots.some((s) => s.heroId === heroId && s.missionId !== null)) return prev;

        const now = Date.now();
        const nextSlots = [...dispatch.slots];
        nextSlots[slotIndex] = {
          slotIndex,
          missionId: mission.id,
          heroId,
          startedAt: now,
          endsAt: now + mission.durationSec * 1000,
        };
        soundEngine.playUiClick(1.1);
        return {
          ...prev,
          dispatch: { ...dispatch, slots: nextSlots },
        };
      });
    },
    []
  );

  const handleSpeedupDispatch = useCallback((slotIndex: number) => {
    setSave((prev) => {
      if (prev.gold < DISPATCH_SPEEDUP_GOLD) return prev;
      const dispatch = normalizeDispatchState(prev.dispatch);
      const slot = dispatch.slots[slotIndex];
      if (!slot || !slot.missionId) return prev;
      const nextSlots = [...dispatch.slots];
      nextSlots[slotIndex] = { ...slot, endsAt: Date.now() };
      soundEngine.playLevelUp();
      return {
        ...prev,
        gold: prev.gold - DISPATCH_SPEEDUP_GOLD,
        dispatch: { ...dispatch, slots: nextSlots },
      };
    });
  }, []);

  const handleClaimDispatch = useCallback((slotIndex: number) => {
    setSave((prev) => {
      const dispatch = normalizeDispatchState(prev.dispatch);
      const slot = dispatch.slots[slotIndex];
      if (!slot || !slot.missionId || Date.now() < slot.endsAt) return prev;
      const mission = getDispatchMissionDef(slot.missionId);
      if (!mission) return prev;

      const nextSlots = [...dispatch.slots];
      nextSlots[slotIndex] = {
        slotIndex,
        missionId: null,
        heroId: null,
        startedAt: 0,
        endsAt: 0,
      };
      soundEngine.playVictory();
      return {
        ...prev,
        gold: prev.gold + mission.rewardGold,
        gems: prev.gems + mission.rewardGems,
        mountShards: (prev.mountShards ?? 0) + mission.rewardMountShards,
        awakeningCrystals: (prev.awakeningCrystals ?? 0) + mission.rewardCrystals,
        wingFeathers: (prev.wingFeathers ?? 0) + mission.rewardFeathers,
        dispatch: {
          slots: nextSlots,
          completedCount: dispatch.completedCount + 1,
        },
      };
    });
  }, []);

  const handleClaimBloodMoonMilestone = useCallback((score: number) => {
    const ms = BLOOD_MOON_MILESTONES.find((m) => m.score === score);
    if (!ms) return;
    setSave((prev) => {
      const bm = normalizeBloodMoon(prev.bloodMoon);
      if (bm.bestScore < ms.score || bm.claimedMilestones.includes(ms.score)) return prev;
      soundEngine.playAchievement();
      return {
        ...prev,
        gems: prev.gems + ms.rewardGems,
        mountShards: (prev.mountShards ?? 0) + ms.rewardMountShards,
        awakeningCrystals: (prev.awakeningCrystals ?? 0) + ms.rewardCrystals,
        wingFeathers: (prev.wingFeathers ?? 0) + ms.rewardFeathers,
        bloodMoon: {
          ...bm,
          claimedMilestones: [...bm.claimedMilestones, ms.score],
        },
      };
    });
  }, []);

  // Wave 9 Handlers: 3D Mythic Artifacts, Mystic Merchant Exchange, Abyssal Milestones, Guild War Weekly Boxes, Dynamic Titles & Smart Power Advisor
  const handleUnlockArtifact = useCallback(
    (artifactId: ArtifactId, currency: 'gems' | 'shards') => {
      const def = ARTIFACT_MAP[artifactId];
      if (!def) return;
      setSave((prev) => {
        const unlocked = prev.unlockedArtifacts ?? [];
        if (unlocked.includes(artifactId)) return prev;
        const mx = normalizeMysticExchange(prev.mysticExchange);
        if (currency === 'gems' && prev.gems < def.unlockGems) return prev;
        if (currency === 'shards' && mx.artifactShards < def.unlockArtifactShards) return prev;
        const nextShards =
          currency === 'shards' ? mx.artifactShards - def.unlockArtifactShards : mx.artifactShards;

        soundEngine.playAchievement();
        return {
          ...prev,
          gems: currency === 'gems' ? prev.gems - def.unlockGems : prev.gems,
          artifactShards: nextShards,
          mysticExchange: { ...mx, artifactShards: nextShards },
          nightMarket: addGemsSpent(prev, currency === 'gems' ? def.unlockGems : 0),
          unlockedArtifacts: [...unlocked, artifactId],
          artifactLevels: { ...(prev.artifactLevels ?? {}), [artifactId]: 1 },
          equippedArtifactId: artifactId,
        };
      });
    },
    []
  );

  const handleEquipArtifact = useCallback((artifactId: ArtifactId | null) => {
    soundEngine.playUiClick(1.08);
    setSave((prev) => {
      if (artifactId === null) return { ...prev, equippedArtifactId: null };
      if (!(prev.unlockedArtifacts ?? []).includes(artifactId)) return prev;
      return { ...prev, equippedArtifactId: artifactId };
    });
  }, []);

  const handleUpgradeArtifact = useCallback((artifactId: ArtifactId) => {
    setSave((prev) => {
      if (!(prev.unlockedArtifacts ?? []).includes(artifactId)) return prev;
      const curLv = Math.max(1, prev.artifactLevels?.[artifactId] ?? 1);
      if (curLv >= MAX_ARTIFACT_LEVEL) return prev;
      const cost = getArtifactUpgradeCost(curLv);
      const mx = normalizeMysticExchange(prev.mysticExchange);
      if (mx.artifactShards < cost.shards || prev.gold < cost.gold) return prev;
      const nextShards = mx.artifactShards - cost.shards;
      soundEngine.playLevelUp();
      return {
        ...prev,
        gold: prev.gold - cost.gold,
        artifactShards: nextShards,
        mysticExchange: { ...mx, artifactShards: nextShards },
        artifactLevels: { ...(prev.artifactLevels ?? {}), [artifactId]: curLv + 1 },
      };
    });
  }, []);

  const handleMysticExchange = useCallback((offerId: string) => {
    const offer = MYSTIC_EXCHANGE_OFFERS.find((o) => o.id === offerId);
    if (!offer) return;
    setSave((prev) => {
      const mx = normalizeMysticExchange(prev.mysticExchange);
      const claimedCount = mx.weeklyClaims[offer.id] ?? 0;
      if (claimedCount >= offer.weeklyLimit) return prev;

      let nextDust = prev.starDust ?? 0;
      let nextEssence = prev.petEssence ?? 0;
      let nextFeathers = prev.wingFeathers ?? 0;
      let nextShards = prev.mountShards ?? 0;
      let nextCrystals = prev.awakeningCrystals ?? 0;
      let nextTokens = mx.mysticTokens;
      let nextArtShards = mx.artifactShards;
      let nextGems = prev.gems;
      let nextInv = prev.inventory;

      if (offer.inputKind === 'starDust') {
        if (nextDust < offer.inputAmount) return prev;
        nextDust -= offer.inputAmount;
      } else if (offer.inputKind === 'petEssence') {
        if (nextEssence < offer.inputAmount) return prev;
        nextEssence -= offer.inputAmount;
      } else if (offer.inputKind === 'wingFeathers') {
        if (nextFeathers < offer.inputAmount) return prev;
        nextFeathers -= offer.inputAmount;
      } else if (offer.inputKind === 'mountShards') {
        if (nextShards < offer.inputAmount) return prev;
        nextShards -= offer.inputAmount;
      } else if (offer.inputKind === 'awakeningCrystals') {
        if (nextCrystals < offer.inputAmount) return prev;
        nextCrystals -= offer.inputAmount;
      } else if (offer.inputKind === 'mysticTokens') {
        if (nextTokens < offer.inputAmount) return prev;
        nextTokens -= offer.inputAmount;
      }

      if (offer.outputKind === 'mysticTokens') nextTokens += offer.outputAmount;
      else if (offer.outputKind === 'artifactShards') nextArtShards += offer.outputAmount;
      else if (offer.outputKind === 'gems') nextGems += offer.outputAmount;
      else if (offer.outputKind === 'mountShards') nextShards += offer.outputAmount;
      else if (offer.outputKind === 'awakeningCrystals') nextCrystals += offer.outputAmount;
      else if (offer.outputKind === 's_gear') {
        nextInv = [...nextInv, rollChestGear(true, Rarity.EPIC, true)];
      }

      soundEngine.playVictory();
      return {
        ...prev,
        gems: nextGems,
        starDust: nextDust,
        petEssence: nextEssence,
        wingFeathers: nextFeathers,
        mountShards: nextShards,
        awakeningCrystals: nextCrystals,
        artifactShards: nextArtShards,
        inventory: nextInv,
        mysticExchange: {
          ...mx,
          mysticTokens: nextTokens,
          artifactShards: nextArtShards,
          weeklyClaims: {
            ...mx.weeklyClaims,
            [offer.id]: claimedCount + 1,
          },
        },
      };
    });
  }, []);

  const handleClaimAbyssalMilestone = useCallback((wave: number) => {
    const ms = ABYSSAL_MILESTONES.find((m) => m.wave === wave);
    if (!ms) return;
    setSave((prev) => {
      const ab = normalizeAbyssalGauntlet(prev.abyssalGauntlet);
      if (ab.bestWave < ms.wave || ab.claimedMilestones.includes(ms.wave)) return prev;
      const mx = normalizeMysticExchange(prev.mysticExchange);
      const nextShards = mx.artifactShards + ms.rewardArtifactShards;
      soundEngine.playAchievement();
      return {
        ...prev,
        gems: prev.gems + ms.rewardGems,
        artifactShards: nextShards,
        mysticExchange: {
          ...mx,
          artifactShards: nextShards,
          mysticTokens: mx.mysticTokens + ms.rewardMysticTokens,
        },
        abyssalGauntlet: {
          ...ab,
          claimedMilestones: [...ab.claimedMilestones, ms.wave],
        },
      };
    });
  }, []);

  const handleClaimGuildWarBox = useCallback((score: number) => {
    const box = GUILD_WAR_WEEKLY_BOXES.find((b) => b.score === score);
    if (!box) return;
    setSave((prev) => {
      const gw = normalizeGuildWar(prev.guildWar);
      if (gw.weeklyScore < box.score || gw.claimedWeeklyBoxes.includes(box.score)) return prev;
      const mx = normalizeMysticExchange(prev.mysticExchange);
      const g = normalizeGuild(prev.guild);
      const nextShards = mx.artifactShards + box.rewardArtifactShards;
      soundEngine.playAchievement();
      return {
        ...prev,
        gems: prev.gems + box.rewardGems,
        artifactShards: nextShards,
        guild: {
          ...g,
          guildCoins: g.guildCoins + box.rewardGuildCoins,
        },
        mysticExchange: {
          ...mx,
          artifactShards: nextShards,
          mysticTokens: mx.mysticTokens + box.rewardMysticTokens,
        },
        guildWar: {
          ...gw,
          claimedWeeklyBoxes: [...gw.claimedWeeklyBoxes, box.score],
        },
      };
    });
  }, []);

  const handleSelectDynamicTitle = useCallback((id: DynamicTitleId) => {
    soundEngine.playUiClick(1.08);
    setSave((prev) => {
      const unlocked = prev.unlockedDynamicTitles ?? ['none'];
      if (!unlocked.includes(id)) return prev;
      return { ...prev, equippedDynamicTitleId: id };
    });
  }, []);

  const handlePowerAdvisorAction = useCallback((kind: PowerRecommendation['actionKind']) => {
    if (kind === 'gear') {
      setActiveLobbyTab('gear');
    } else if (kind === 'artifacts') {
      setHeroSubTabInitial('artifacts');
      setActiveLobbyTab('heroes');
    } else if (kind === 'mounts') {
      setHeroSubTabInitial('mounts');
      setActiveLobbyTab('heroes');
    } else if (kind === 'talents') {
      setTalentsModalOpen(true);
    } else if (kind === 'constellation') {
      setConstellationModalOpen(true);
    } else if (kind === 'mystic_exchange') {
      setShopSection('mystic_exchange');
      setActiveLobbyTab('shop');
    }
  }, []);

  const activeChapter =
    CHAPTERS.find((c) => c.id === selectedChapterId) ?? CHAPTERS[0];

  const canRollAgainGacha = gachaReveal
    ? (() => {
        const unit =
          gachaReveal.chestVariant === 'iron'
            ? 120
            : gachaReveal.chestVariant === 'mythic'
            ? 25
            : gachaReveal.chestVariant === 'rune_bag'
            ? 100
            : 18;
        const cost = gachaReveal.count === 10 ? Math.round(unit * 9) : unit;
        const isGem =
          gachaReveal.chestVariant === 'mythic' || gachaReveal.chestVariant === 'rune_rare';
        return isGem ? save.gems >= cost : save.gold >= cost;
      })()
    : false;

  const draftModalMode =
    phase === GamePhase.SKILL_DRAFT
      ? 'skill'
      : phase === GamePhase.VALKYRIE_DRAFT
      ? 'valkyrie'
      : phase === GamePhase.LUCKY_WHEEL
      ? 'wheel'
      : phase === GamePhase.ANGEL_DEVIL
      ? encounterOffer?.kind ?? 'angel'
      : null;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#0b0e14]">
      {/* Isolated WebGL Mount */}
      <div ref={canvasMountRef} className="fixed inset-0 z-0" />

      {phase === GamePhase.TITLE && !enteredGame && (
        <SplashGate
          save={save}
          onEnterGame={() => {
            soundEngine.unlock();
            soundEngine.playVictory();
            setEnteredGame(true);
            if (!save.onboardingCompleted) {
              setOnboardingOpen(true);
            }
          }}
          onToggleMute={handleToggleMute}
        />
      )}

      {phase === GamePhase.TITLE && enteredGame && (
        <TitleScreen
          save={save}
          stats={playerStats}
          selectedChapterId={selectedChapterId}
          gameMode={gameMode}
          activeTab={activeLobbyTab}
          heroSubTabInitial={heroSubTabInitial}
          shopSection={shopSection}
          previewHeroId={previewHeroId ?? save.selectedHeroId}
          cameraPreset={cameraPreset}
          wishLastOutcomes={wishLastOutcomes}
          selectedCoopDifficulty={selectedCoopDifficulty}
          selectedElementalTower={selectedElementalTower}
          onSelectCoopDifficulty={(d) => setSelectedCoopDifficulty(d)}
          onSelectElementalTower={(t) => setSelectedElementalTower(t)}
          onChangeCameraPreset={handleChangeCameraPreset}
          onTabChange={(tab) => {
            soundEngine.playUiClick();
            if (tab === 'heroes') {
              setHeroSubTabInitial('roster');
            }
            setActiveLobbyTab(tab);
            if (tab !== 'heroes') {
              setPreviewHeroId(null);
            }
          }}
          onOpenHeroSubTab={(sub) => {
            setHeroSubTabInitial(sub);
            setActiveLobbyTab('heroes');
          }}
          onOpenShopSection={(sec) => {
            setShopSection(sec);
            setActiveLobbyTab('shop');
          }}
          onGameModeChange={(mode) => {
            soundEngine.playUiClick();
            setGameMode(mode);
          }}
          onPreviewHero={(heroId) => setPreviewHeroId(heroId)}
          onSelectChapter={handleSelectChapter}
          onStartTrial={handleStartTrial}
          onStartTower={handleStartTower}
          onStartBossRush={handleStartBossRush}
          onStartDailyRift={handleStartDailyRift}
          onStartCoopRaid={handleStartCoopRaid}
          onStartElementalTower={handleStartElementalTower}
          onStartCrystalDefense={handleStartCrystalDefense}
          onStartWorldBoss={handleStartWorldBoss}
          onStartBloodMoon={handleStartBloodMoon}
          onClaimBloodMoonMilestone={handleClaimBloodMoonMilestone}
          onStartAbyssalGauntlet={handleStartAbyssalGauntlet}
          onClaimAbyssalMilestone={handleClaimAbyssalMilestone}
          onStartGuildWar={handleStartGuildWar}
          onClaimGuildWarBox={handleClaimGuildWarBox}
          onQuickSweepChapter={handleQuickSweepChapter}
          onToggleMute={handleToggleMute}
          onOpenRewardsModal={(tab) => setRewardsModalTab(tab)}
          onOpenTalentsModal={() => setTalentsModalOpen(true)}
          onOpenConstellationModal={() => setConstellationModalOpen(true)}
          onOpenBattlePassModal={() => setBattlePassOpen(true)}
          onOpenVipModal={() => setVipModalOpen(true)}
          onOpenForgeModal={() => setForgeConfig({ open: true, subTab: 'salvage' })}
          onOpenForgeSubTab={(subTab, gearUid) =>
            setForgeConfig({ open: true, subTab, gearUid })
          }
          onOpenGuildModal={() => setGuildModalOpen(true)}
          onOpenDestinyWheelModal={() => setDestinyWheelOpen(true)}
          onOpenNightMarketModal={() => setNightMarketOpen(true)}
          onOpenArenaModal={() => setArenaModalOpen(true)}
          onOpenAuctionModal={() => setAuctionModalOpen(true)}
          onOpenHonorBoard={() => setHonorBoardOpen(true)}
          onOpenWardrobe={handleOpenWardrobe}
          onOpenDispatch={() => setDispatchOpen(true)}
          onOpenProfileModal={(tab = 'profile') => setProfileModalTab(tab)}
          onOpenMailModal={() => setMailModalOpen(true)}
          onOpenSettingsModal={() => setSettingsOpen(true)}
          onSelectHero={handleSelectHero}
          onUnlockHero={handleUnlockHero}
          onUpgradeHeroStar={handleUpgradeHeroStar}
          onPreviewUltimate={handlePreviewLobbyUltimate}
          onUnlockPet={handleUnlockPet}
          onEquipPet={handleEquipPet}
          onUpgradePet={handleUpgradePet}
          onUnlockSkin={handleUnlockSkin}
          onEquipSkin={handleEquipSkin}
          onUnlockAura={handleUnlockAura}
          onEquipAura={handleEquipAura}
          onUnlockWing={handleUnlockWing}
          onEquipWing={handleEquipWing}
          onUpgradeWing={handleUpgradeWing}
          onUnlockAvatarFrame={handleUnlockAvatarFrame}
          onEquipAvatarFrame={handleEquipAvatarFrame}
          onUnlockMount={handleUnlockMount}
          onEquipMount={handleEquipMount}
          onUpgradeMount={handleUpgradeMount}
          onUnlockWeaponAura={handleUnlockWeaponAura}
          onEquipWeaponAura={handleEquipWeaponAura}
          onUpgradeWeaponAura={handleUpgradeWeaponAura}
          onUnlockArtifact={handleUnlockArtifact}
          onEquipArtifact={handleEquipArtifact}
          onUpgradeArtifact={handleUpgradeArtifact}
          onEquipGear={handleEquip}
          onUpgradeGear={handleUpgrade}
          onFuseGear={handleFuse}
          onAutoEquipBest={handleAutoEquipBest}
          onBulkFuseGear={handleBulkFuseGear}
          onSaveBuildPreset={handleSaveBuildPreset}
          onApplyBuildPreset={handleApplyBuildPreset}
          onOpenChestWithGacha={handleOpenChestWithGacha}
          onBuyFlashDeal={handleBuyFlashDeal}
          onUnlockGrowthFundPremium={handleUnlockGrowthFundPremium}
          onClaimGrowthFundReward={handleClaimGrowthFundReward}
          onClaimAllGrowthFund={handleClaimAllGrowthFund}
          onBuyArenaShopOffer={handleBuyArenaShopOffer}
          onBuyCommercialPack={handleBuyCommercialPack}
          onBuyMonthlyCard={handleBuyMonthlyCard}
          onClaimMonthlyCardDaily={handleClaimMonthlyCardDaily}
          onClaimTopUpEvolutionTier={handleClaimTopUpEvolutionTier}
          onSelectWishTarget={handleSelectWishTarget}
          onWishPoolRoll={handleWishPoolRoll}
          onClaimWishMilestone={handleClaimWishMilestone}
          onClaimFirstTopUp={handleClaimFirstTopUp}
          onBuyHotBundle={handleBuyHotBundle}
          onMysticExchange={handleMysticExchange}
          onPowerAdvisorAction={handlePowerAdvisorAction}
          onEquipRune={handleEquipRune}
          onUnequipRune={handleUnequipRune}
          onFuseRune={handleFuseRune}
          onBulkFuseRunes={handleBulkFuseRunes}
          onRotateHero={(deltaRad) => engineRef.current?.rotateLobbyHero(deltaRad)}
          onResetHeroRotation={() => engineRef.current?.resetLobbyHeroRotation()}
        />
      )}

      {phase !== GamePhase.TITLE && (
        <GameHUD
          hud={hud}
          muted={save.muted}
          damages={damages}
          joystick={joystick}
          onToggleMute={handleToggleMute}
          onPause={handlePause}
          onDashClick={() => engineRef.current?.triggerDash()}
          onUltimateClick={() => engineRef.current?.triggerHeroUltimate()}
        />
      )}

      {draftModalMode && (
        <SkillDraftModal
          mode={draftModalMode}
          level={hud.level}
          skillChoices={draftChoices}
          currentStacks={draftStacks}
          rerollUsed={rerollUsed}
          encounterOffer={encounterOffer}
          onPickSkill={(skillId) => {
            setPhase(GamePhase.PLAYING);
            engineRef.current?.applySkillChoice(skillId);
          }}
          onRerollSkills={() => {
            if (rerollUsed) return;
            setRerollUsed(true);
            const minR = phase === GamePhase.VALKYRIE_DRAFT ? 'epic' : undefined;
            const rolled = rollSkillChoices(draftStacks, 3, minR);
            if (rolled.length > 0) setDraftChoices(rolled);
          }}
          onAngelChoice={(choice) => {
            setPhase(GamePhase.PLAYING);
            engineRef.current?.applyAngelChoice(choice);
          }}
          onDevilPact={(acceptSkill) => {
            setPhase(GamePhase.PLAYING);
            engineRef.current?.applyDevilPact(acceptSkill);
          }}
          onWheelComplete={(outcome: WheelOutcome) => {
            setPhase(GamePhase.PLAYING);
            engineRef.current?.applyWheelOutcome(outcome);
          }}
        />
      )}

      {(phase === GamePhase.PAUSED ||
        phase === GamePhase.VICTORY ||
        phase === GamePhase.GAME_OVER) && (
        <PauseResultModal
          phase={phase}
          chapterName={activeChapter.name}
          stageReached={runSummary?.stageReached ?? hud.stage}
          totalStages={
            (runSummary?.isArenaMode ?? hud.isArenaMode) ||
            (runSummary?.isGuildBossMode ?? hud.isGuildBossMode) ||
            (runSummary?.isCoopRaidMode ?? hud.isCoopRaidMode) ||
            (runSummary?.isWorldBossMode ?? hud.isWorldBossMode) ||
            (runSummary?.isGuildWarMode ?? hud.isGuildWarMode)
              ? 1
              : (runSummary?.isAbyssalMode ?? hud.isAbyssalMode)
              ? ABYSSAL_GAUNTLET_TOTAL_WAVES
              : (runSummary?.isCrystalDefenseMode ?? hud.isCrystalDefenseMode)
              ? CRYSTAL_DEFENSE_TOTAL_WAVES
              : (runSummary?.isDailyRiftMode ?? hud.isDailyRiftMode)
              ? 3
              : activeChapter.stages.length
          }
          isTowerMode={runSummary?.isTowerMode ?? hud.isTowerMode}
          towerFloor={runSummary?.towerFloor ?? hud.towerFloor}
          isBossRushMode={runSummary?.isBossRushMode ?? hud.isBossRushMode}
          bossRushRound={runSummary?.bossRushRound ?? hud.bossRushRound}
          isDailyRiftMode={runSummary?.isDailyRiftMode ?? hud.isDailyRiftMode}
          isGuildBossMode={runSummary?.isGuildBossMode ?? hud.isGuildBossMode}
          guildBossDamage={runSummary?.guildBossDamage ?? hud.guildBossTotalDamage ?? 0}
          isArenaMode={runSummary?.isArenaMode ?? hud.isArenaMode}
          arenaOpponentName={
            runSummary?.arenaOpponentName ?? hud.arenaOpponentName ?? activeArenaOpponent?.name ?? ''
          }
          arenaRatingDelta={runSummary?.arenaRatingDelta ?? 0}
          isCoopRaidMode={runSummary?.isCoopRaidMode ?? hud.isCoopRaidMode}
          coopDifficulty={runSummary?.coopDifficulty ?? hud.coopDifficulty ?? selectedCoopDifficulty}
          isElementalTowerMode={runSummary?.isElementalTowerMode ?? hud.isElementalTowerMode}
          elementalTowerId={
            runSummary?.elementalTowerId ?? hud.elementalTowerId ?? selectedElementalTower
          }
          elementalTowerFloor={
            runSummary?.elementalTowerFloor ?? hud.elementalTowerFloor ?? 1
          }
          isCrystalDefenseMode={runSummary?.isCrystalDefenseMode ?? hud.isCrystalDefenseMode}
          crystalWavesCleared={
            runSummary?.crystalWavesCleared ?? hud.crystalWave ?? 0
          }
          crystalHpPct={
            runSummary?.crystalHpPct ??
            Math.round(((hud.crystalHp ?? 0) / Math.max(1, hud.crystalMaxHp ?? 1)) * 100)
          }
          isWorldBossMode={runSummary?.isWorldBossMode ?? hud.isWorldBossMode}
          worldBossDamage={
            runSummary?.worldBossDamage ?? hud.worldBossTotalDamage ?? 0
          }
          worldBossLiveRank={
            runSummary?.worldBossLiveRank ?? hud.worldBossRank ?? 9
          }
          isBloodMoonMode={runSummary?.isBloodMoonMode ?? hud.isBloodMoonMode}
          bloodMoonScore={runSummary?.bloodMoonScore ?? hud.bloodMoonScore ?? 0}
          bloodMoonWave={runSummary?.bloodMoonWave ?? hud.bloodMoonWave ?? 1}
          isAbyssalMode={runSummary?.isAbyssalMode ?? hud.isAbyssalMode}
          abyssalWave={runSummary?.abyssalWave ?? hud.abyssalWave ?? 0}
          abyssalScore={runSummary?.abyssalScore ?? hud.abyssalScore ?? 0}
          isGuildWarMode={runSummary?.isGuildWarMode ?? hud.isGuildWarMode}
          guildWarScore={runSummary?.guildWarScore ?? hud.guildWarScore ?? 0}
          guildWarNodes={runSummary?.guildWarNodes ?? hud.guildWarNodes ?? 0}
          wingFeathersEarned={runSummary?.wingFeathers ?? 0}
          mountShardsEarned={runSummary?.mountShards ?? 0}
          awakeningCrystalsEarned={runSummary?.awakeningCrystals ?? 0}
          artifactShardsEarned={runSummary?.artifactShards ?? 0}
          mysticTokensEarned={runSummary?.mysticTokens ?? 0}
          guildCoinsEarned={runSummary?.guildCoins ?? 0}
          kills={runSummary?.kills ?? hud.kills}
          goldEarned={runSummary?.gold ?? hud.runGold}
          gemsEarned={runSummary?.gems ?? hud.runGems}
          starDustEarned={runSummary?.starDust ?? 0}
          petEssenceEarned={runSummary?.petEssence ?? 0}
          maxCombo={runSummary?.maxCombo ?? hud.comboCount}
          damageBreakdown={runSummary?.damageBreakdown}
          seasonXpEarned={runSummary?.seasonXp ?? 0}
          onResume={phase === GamePhase.PAUSED ? handlePause : undefined}
          onRetry={
            (runSummary?.isAbyssalMode ?? hud.isAbyssalMode)
              ? () => {
                  if (normalizeAbyssalGauntlet(save.abyssalGauntlet).dailyRunsRemaining > 0) {
                    handleStartAbyssalGauntlet();
                  } else {
                    handleReturnTitle();
                  }
                }
              : (runSummary?.isGuildWarMode ?? hud.isGuildWarMode)
              ? () => {
                  if (normalizeGuildWar(save.guildWar).dailyRunsRemaining > 0) {
                    handleStartGuildWar();
                  } else {
                    handleReturnTitle();
                  }
                }
              : (runSummary?.isBloodMoonMode ?? hud.isBloodMoonMode)
              ? () => {
                  if (normalizeBloodMoon(save.bloodMoon).dailyRunsRemaining > 0) {
                    handleStartBloodMoon();
                  } else {
                    handleReturnTitle();
                  }
                }
              : (runSummary?.isCrystalDefenseMode ?? hud.isCrystalDefenseMode)
              ? () => {
                  if (normalizeCrystalDefense(save.crystalDefense).runsRemaining > 0) {
                    handleStartCrystalDefense();
                  } else {
                    handleReturnTitle();
                  }
                }
              : (runSummary?.isWorldBossMode ?? hud.isWorldBossMode)
              ? () => {
                  if (normalizeWorldBoss(save.worldBoss).dailyRunsRemaining > 0) {
                    handleStartWorldBoss();
                  } else {
                    handleReturnTitle();
                  }
                }
              : (runSummary?.isArenaMode ?? hud.isArenaMode)
              ? () => {
                  if (activeArenaOpponent && normalizeArena(save.arena).ticketsRemaining > 0) {
                    handleStartArenaDuel(activeArenaOpponent);
                  } else {
                    handleReturnTitle();
                  }
                }
              : (runSummary?.isCoopRaidMode ?? hud.isCoopRaidMode)
              ? () => handleStartCoopRaid(runSummary?.coopDifficulty ?? hud.coopDifficulty ?? selectedCoopDifficulty)
              : (runSummary?.isElementalTowerMode ?? hud.isElementalTowerMode)
              ? () =>
                  handleStartElementalTower(
                    runSummary?.elementalTowerId ?? hud.elementalTowerId ?? selectedElementalTower
                  )
              : (runSummary?.isGuildBossMode ?? hud.isGuildBossMode)
              ? () => {
                  if (normalizeGuild(save.guild).bossRunsRemaining > 0) {
                    handleStartGuildBoss();
                  } else {
                    handleReturnTitle();
                  }
                }
              : (runSummary?.isDailyRiftMode ?? hud.isDailyRiftMode)
              ? () => {
                  if (normalizeDailyRift(save.dailyRift).runsRemaining > 0) {
                    handleStartDailyRift();
                  } else {
                    handleReturnTitle();
                  }
                }
              : (runSummary?.isBossRushMode ?? hud.isBossRushMode)
              ? handleStartBossRush
              : (runSummary?.isTowerMode ?? hud.isTowerMode)
              ? handleStartTower
              : handleStartTrial
          }
          onReturnTitle={handleReturnTitle}
          onOpenSettings={
            phase === GamePhase.PAUSED ? () => setSettingsOpen(true) : undefined
          }
        />
      )}

      {phase === GamePhase.TITLE && enteredGame && rewardsModalTab && (
        <DailyRewardsModal
          save={save}
          powerRating={playerStats.powerRating}
          initialTab={rewardsModalTab}
          onClose={() => setRewardsModalTab(null)}
          onClaimCheckIn={handleClaimCheckIn}
          onClaimDailyQuest={handleClaimDailyQuest}
          onClaimWelcomeGift={handleClaimWelcomeGift}
          onClaimJourneyTask={handleClaimJourneyTask}
          onClaimJourneyDay={handleClaimJourneyDay}
        />
      )}

      {phase === GamePhase.TITLE && enteredGame && talentsModalOpen && (
        <TalentsModal
          save={save}
          stats={playerStats}
          onUpgradeTalent={handleUpgradeTalent}
          onClose={() => setTalentsModalOpen(false)}
        />
      )}

      {phase === GamePhase.TITLE && enteredGame && constellationModalOpen && (
        <ConstellationModal
          save={save}
          onUpgradeConstellation={handleUpgradeConstellation}
          onClose={() => setConstellationModalOpen(false)}
        />
      )}

      {phase === GamePhase.TITLE && enteredGame && battlePassOpen && (
        <BattlePassModal
          save={save}
          onClose={() => setBattlePassOpen(false)}
          onUnlockPremium={handleUnlockBattlePassPremium}
          onClaimTier={handleClaimBattlePassTier}
          onClaimAll={handleClaimAllBattlePass}
        />
      )}

      {phase === GamePhase.TITLE && enteredGame && vipModalOpen && (
        <VipPrivilegeModal
          save={save}
          onActivateVip={handleActivateVip}
          onClaimVipDaily={handleClaimVipDaily}
          onClaimStarterPack={handleClaimStarterPack}
          onClose={() => setVipModalOpen(false)}
        />
      )}

      {phase === GamePhase.TITLE && enteredGame && forgeConfig.open && (
        <RelicForgeModal
          key={`${forgeConfig.subTab}_${forgeConfig.gearUid ?? 'all'}`}
          save={save}
          initialSubTab={forgeConfig.subTab}
          initialGearUid={forgeConfig.gearUid}
          onSalvageGear={handleSalvageGear}
          onCraftForgeRecipe={handleCraftForgeRecipe}
          onReforgeGear={handleReforgeGear}
          onAwakenGear={handleAwakenGear}
          onCraftSocketGem={handleCraftSocketGem}
          onFuseSocketGem={handleFuseSocketGem}
          onSocketGemToGear={handleSocketGemToGear}
          onUnsocketGemFromGear={handleUnsocketGemFromGear}
          onClose={() => setForgeConfig((prev) => ({ ...prev, open: false }))}
        />
      )}

      {phase === GamePhase.TITLE && enteredGame && guildModalOpen && (
        <ZodiacGuildModal
          save={save}
          powerRating={playerStats.powerRating}
          onTribute={handleGuildTribute}
          onUpgradeTech={handleUpgradeGuildTech}
          onClaimDamageTier={handleClaimGuildDamageTier}
          onStartGuildBoss={handleStartGuildBoss}
          onStartGuildWar={handleStartGuildWar}
          onClaimGuildWarBox={handleClaimGuildWarBox}
          onClose={() => setGuildModalOpen(false)}
        />
      )}

      {phase === GamePhase.TITLE && enteredGame && destinyWheelOpen && (
        <DestinyWheelModal
          save={save}
          onSpin={handleDestinySpin}
          onClaimMilestone={handleClaimDestinyMilestone}
          onClose={() => setDestinyWheelOpen(false)}
        />
      )}

      {phase === GamePhase.TITLE && enteredGame && nightMarketOpen && (
        <NightMarketModal
          save={save}
          onBuyOffer={handleBuyNightMarketOffer}
          onClaimSpendMilestone={handleClaimSpendMilestone}
          onClose={() => setNightMarketOpen(false)}
        />
      )}

      {phase === GamePhase.TITLE && enteredGame && arenaModalOpen && (
        <ArenaModal
          save={save}
          powerRating={playerStats.powerRating}
          onStartDuel={handleStartArenaDuel}
          onBuyTicket={handleBuyArenaTicket}
          onClaimRankTier={handleClaimArenaRankTier}
          onOpenArenaShop={() => {
            setActiveLobbyTab('shop');
            setShopSection('arena_shop');
          }}
          onClose={() => setArenaModalOpen(false)}
        />
      )}

      {phase === GamePhase.TITLE && enteredGame && profileModalTab && (
        <ProfileCodexModal
          save={save}
          stats={playerStats}
          initialTab={profileModalTab}
          onClose={() => setProfileModalTab(null)}
          onClaimAchievement={handleClaimAchievement}
          onClaimSeasonMedal={handleClaimSeasonMedal}
          onSelectTitle={handleSelectTitle}
          onSelectDynamicTitle={handleSelectDynamicTitle}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          settings={currentSettings}
          muted={save.muted}
          onUpdateSettings={handleUpdateSettings}
          onToggleMute={handleToggleMute}
          onReplayTutorial={
            phase === GamePhase.TITLE && enteredGame
              ? () => setOnboardingOpen(true)
              : undefined
          }
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {phase === GamePhase.TITLE && enteredGame && onboardingOpen && (
        <OnboardingTour
          onComplete={handleCompleteOnboarding}
          onJumpToTab={(t) => setActiveLobbyTab(t)}
        />
      )}

      {phase === GamePhase.TITLE && enteredGame && gachaReveal && (
        <ChestGachaModal
          reveal={gachaReveal}
          canEquipRune={save.equippedRunes.length < 4}
          onClose={() => setGachaReveal(null)}
          onEquipGear={handleEquip}
          onEquipRune={handleEquipRune}
          onRollAgain={handleOpenChestWithGacha}
          canRollAgain={canRollAgainGacha}
        />
      )}

      {phase === GamePhase.TITLE && enteredGame && mailModalOpen && (
        <MailModal
          save={save}
          onClose={() => setMailModalOpen(false)}
          onClaimMail={handleClaimMail}
          onClaimAllMail={handleClaimAllMail}
          onDeleteClaimedMail={handleDeleteClaimedMail}
        />
      )}

      {phase === GamePhase.TITLE && enteredGame && sweepResult && (
        <QuickSweepResultModal
          result={sweepResult}
          onClose={() => setSweepResult(null)}
        />
      )}

      {phase === GamePhase.TITLE && enteredGame && auctionModalOpen && (
        <AuctionHouseModal
          save={save}
          onPlaceBid={handlePlaceAuctionBid}
          onBuyoutLot={handleBuyoutAuctionLot}
          onListGear={handleListAuctionGear}
          onListGem={handleListAuctionGem}
          onCancelListing={handleCancelAuctionListing}
          onClaimAll={handleClaimAuctionAll}
          onClaimEntry={handleClaimAuctionEntry}
          onRefreshLots={handleRefreshAuctionLots}
          onClose={() => setAuctionModalOpen(false)}
        />
      )}

      {phase === GamePhase.TITLE && enteredGame && honorBoardOpen && (
        <HonorLeaderboardModal
          save={save}
          powerRating={playerStats.powerRating}
          heroName={(HERO_MAP[save.selectedHeroId] ?? HERO_MAP.artemis).name}
          onUnlockAvatarFrame={handleUnlockAvatarFrame}
          onEquipAvatarFrame={handleEquipAvatarFrame}
          onClaimMythicBadge={handleClaimMythicBadge}
          onEquipMythicBadge={handleEquipMythicBadge}
          onClaimWorldBossMilestone={handleClaimWorldBossMilestone}
          onStartWorldBoss={() => {
            setHonorBoardOpen(false);
            handleStartWorldBoss();
          }}
          onClose={() => setHonorBoardOpen(false)}
        />
      )}

      {phase === GamePhase.TITLE && enteredGame && dispatchOpen && (
        <DispatchModal
          save={save}
          onStartDispatch={handleStartDispatch}
          onSpeedupDispatch={handleSpeedupDispatch}
          onClaimDispatch={handleClaimDispatch}
          onClose={() => setDispatchOpen(false)}
        />
      )}

      {phase === GamePhase.TITLE && enteredGame && wardrobeOpen && (
        <WardrobeModal
          save={save}
          preview={wardrobePreview}
          cameraPreset={cameraPreset}
          onChangePreview={setWardrobePreview}
          onChangeCameraPreset={handleChangeCameraPreset}
          onRotateHero={(deltaRad) => engineRef.current?.rotateLobbyHero(deltaRad)}
          onResetHeroRotation={() => engineRef.current?.resetLobbyHeroRotation()}
          onSelectSkin={(skinId) => handleEquipSkin(save.selectedHeroId, skinId)}
          onUnlockSkin={(skinId) =>
            handleUnlockSkin(skinId, SKIN_MAP[skinId]?.unlockGems > 0 ? 'gems' : 'gold')
          }
          onEquipWing={handleEquipWing}
          onUnlockWing={(wingId) =>
            handleUnlockWing(
              wingId,
              (save.wingFeathers ?? 0) >= (WING_MAP[wingId]?.unlockFeathers ?? Infinity)
                ? 'feathers'
                : 'gems'
            )
          }
          onEquipMount={handleEquipMount}
          onUnlockMount={(mountId) =>
            handleUnlockMount(
              mountId,
              (save.mountShards ?? 0) >= (MOUNT_MAP[mountId]?.unlockShards ?? Infinity)
                ? 'shards'
                : 'gems'
            )
          }
          onEquipWeaponAura={handleEquipWeaponAura}
          onUnlockWeaponAura={(auraId) =>
            handleUnlockWeaponAura(
              auraId,
              (save.awakeningCrystals ?? 0) >= (WEAPON_AURA_MAP[auraId]?.unlockCrystals ?? Infinity)
                ? 'crystals'
                : 'gems'
            )
          }
          onClose={handleCloseWardrobe}
        />
      )}

      <CombatPowerToast toast={powerToast} />
      <AchievementToast achievement={activeAchievementToast} />

      {transitionState !== null && (
        <StageTransitionCurtain
          chapterId={transitionState.chapterId}
          isTowerMode={transitionState.isTowerMode}
          isBossRushMode={transitionState.isBossRushMode}
          isDailyRiftMode={transitionState.isDailyRiftMode}
          isGuildBossMode={transitionState.isGuildBossMode}
          isArenaMode={transitionState.isArenaMode}
          isCoopRaidMode={transitionState.isCoopRaidMode}
          coopDifficulty={transitionState.coopDifficulty}
          isElementalTowerMode={transitionState.isElementalTowerMode}
          elementalTowerId={transitionState.elementalTowerId}
          isCrystalDefenseMode={transitionState.isCrystalDefenseMode}
          isWorldBossMode={transitionState.isWorldBossMode}
          isBloodMoonMode={transitionState.isBloodMoonMode}
          isAbyssalMode={transitionState.isAbyssalMode}
          isGuildWarMode={transitionState.isGuildWarMode}
          arenaOpponentName={transitionState.arenaOpponentName}
          dailyRiftTitle={transitionState.dailyRiftTitle}
        />
      )}
    </div>
  );
}

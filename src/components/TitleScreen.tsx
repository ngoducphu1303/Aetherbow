import React, { useEffect, useState } from 'react';
import {
  BookOpen,
  Camera,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass,
  Crown,
  Dice5,
  Download,
  EyeOff,
  Feather,
  Flag,
  Flame,
  Gavel,
  Gem,
  Gift,
  Hammer,
  HelpCircle,
  History,
  LayoutGrid,
  Lock,
  Mail,
  Map,
  Megaphone,
  Moon,
  RotateCcw,
  ScrollText,
  Send,
  Settings,
  Shield,
  ShoppingBag,
  Skull,
  Sparkles,
  Sun,
  Sword,
  Swords,
  Ticket,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import abyssalGauntletArt from '../assets/images/abyssal_gauntlet_arena_1795010358870.jpg';
import ancientDragonLairArt from '../assets/images/ancient_dragon_lair_1795056419369.jpg';
import bloodMoonArt from '../assets/images/blood_moon_nightmare_1795007597791.jpg';
import bossArenaArt from '../assets/images/boss_rush_arena_emblem_1794973982304.jpg';
import celestialFestivalArt from '../assets/images/celestial_festival_lanterns_1795051178335.jpg';
import celestialWingsArenaArt from '../assets/images/celestial_wings_arena_1795058112061.jpg';
import championshipTrophyArt from '../assets/images/championship_trophy_arena_1795051178175.jpg';
import coopRaidArt from '../assets/images/coop_raid_portal_1795004418576.jpg';
import crystalDefenseArt from '../assets/images/crystal_defense_sanctum_1795005958099.jpg';
import crystalVaultArt from '../assets/images/crystal_vault_raid_1795054761636.jpg';
import dailyRiftArt from '../assets/images/daily_rift_portal_art_1794977270758.jpg';
import elementalTrialsArt from '../assets/images/elemental_trials_spires_1795004418882.jpg';
import eventZodiacBanner from '../assets/images/event_zodiac_banner_1794973981859.jpg';
import guildWarCitadelArt from '../assets/images/guild_war_citadel_1795010358440.jpg';
import pantheonBossArt from '../assets/images/pantheon_expedition_boss_1795018174577.jpg';
import worldBossArt from '../assets/images/world_boss_abyss_1795005956955.jpg';
import { soundEngine } from '../audio/soundEngine';
import { CHAPTERS } from '../data/chaptersData';
import { HERO_MAP } from '../data/heroesData';
import {
  EVENT_BANNERS,
  MAX_DAILY_SWEEPS,
  countClaimableAchievements,
  countClaimableBattlePass,
  countUnreadMail,
  getBattlePassLevelInfo,
  normalizeBattlePass,
  normalizeDailySweeps,
} from '../data/liveOpsData';
import { countClaimableWelfare, getTodayKey } from '../data/questsData';
import { getTotalTalentLevels } from '../data/talentsData';
import {
  MAX_DAILY_RIFT_RUNS,
  canClaimVipDaily,
  getDailyRiftPair,
  isVipActive,
  normalizeDailyRift,
  normalizeVip,
} from '../data/wave3Data';
import {
  normalizeDestinyWheel,
  normalizeGuild,
} from '../data/wave4Data';
import {
  CUMULATIVE_SPEND_MILESTONES,
  countClaimableJourneyRewards,
  normalizeArena,
  normalizeNightMarket,
} from '../data/wave5Data';
import {
  ArenaShopOffer,
  COOP_DIFFICULTY_MAP,
  COOP_RAID_DIFFICULTIES,
  COOP_RAID_MAX_DAILY_REWARDS,
  CommercialPackItem,
  ELEMENTAL_TOWERS,
  ELEMENTAL_TOWER_MAP,
  computeConstellationBonuses,
  countClaimableGrowthFund,
  normalizeCoopRaid,
  normalizeElementalTowers,
  selectCoopAiAllies,
} from '../data/wave6Data';
import {
  CRYSTAL_DEFENSE_MAX_DAILY_RUNS,
  CRYSTAL_DEFENSE_TOTAL_WAVES,
  MYTHIC_BADGE_MAP,
  WORLD_BOSS_MAX_DAILY_RUNS,
  computeWorldBossLiveRank,
  countClaimableWave7Rewards,
  isMonthlyCardActive,
  normalizeAuctionHouse,
  normalizeCrystalDefense,
  normalizeMonthlyPrivilege,
  normalizeWorldBoss,
} from '../data/wave7Data';
import {
  BLOOD_MOON_DURATION_SEC,
  BLOOD_MOON_MAX_DAILY_RUNS,
  BLOOD_MOON_MILESTONES,
  WISH_MILESTONES,
  countClaimableWave8Rewards,
  normalizeBloodMoon,
  normalizeDispatchState,
  normalizeWishPool,
} from '../data/wave8Data';
import {
  ABYSSAL_GAUNTLET_MAX_DAILY_RUNS,
  ABYSSAL_GAUNTLET_TOTAL_WAVES,
  ABYSSAL_MILESTONES,
  DYNAMIC_TITLE_MAP,
  GUILD_WAR_DURATION_SEC,
  GUILD_WAR_MAX_DAILY_RUNS,
  GUILD_WAR_WEEKLY_BOXES,
  PowerRecommendation,
  computePowerAdvisor,
  countClaimableWave9Rewards,
  normalizeAbyssalGauntlet,
  normalizeGuildWar,
} from '../data/wave9Data';
import {
  DIVINE_HALO_CATALOG,
  GEM_VAULT_CAPACITY,
  GEM_VAULT_CLAIM_THRESHOLD,
  MAX_DAILY_PANTHEON_RUNS,
  PANTHEON_BLESSINGS,
  PANTHEON_MILESTONES,
  PANTHEON_TOTAL_STAGES,
  countClaimablePantheonMilestones,
  countClaimableVaultRewards,
  hasFreeChainStepReady,
  normalizeGemRebateVault,
  normalizePantheonExpedition,
  normalizeStepUpChain,
} from '../data/wave10Data';
import {
  CHAMPIONSHIP_CUP_MILESTONES,
  CHAMPIONSHIP_TOTAL_ROUNDS,
  DEFAULT_HONOR_FEED,
  LOBBY_SKY_THEMES,
  MAX_DAILY_CHAMPIONSHIP_RUNS,
  computeCodexSummary,
  countClaimableChampionshipMilestones,
  countClaimableCodexRanks,
  countClaimableFestivalRewards,
  normalizeChampionshipState,
} from '../data/wave11Data';
import {
  CRYSTAL_VAULT_MILESTONES,
  LOBBY_HERO_POSES,
  MAX_DAILY_CRYSTAL_VAULT_RUNS,
  countClaimableCrystalVaultMilestones,
  isSupremeMonthlyActive,
  normalizeCrystalVault,
  previewLobbyClaimAll,
} from '../data/wave12Data';
import {
  DRAGON_LAIR_MILESTONES,
  LOBBY_WEATHER_DEFS,
  MAX_DAILY_DRAGON_LAIR_RUNS,
  VIP_AVATAR_FRAME_MAP,
  countClaimableCarnivalRewards,
  countClaimableDragonLairMilestones,
  countClaimableStarlightMilestones,
  normalizeDragonLair,
} from '../data/wave13Data';
import {
  ROYAL_3D_TITLE_MAP,
  SANCTUARY_FLOOR_DEFS,
  SKY_CITADEL_MAX_DAILY_RUNS,
  SKY_CITADEL_MILESTONES,
  countClaimableAstralBoardRewards,
  countClaimableGuildSanctuaryRewards,
  countClaimableSkyCitadelMilestones,
  normalizeAstralBoard,
  normalizeSkyCitadel,
} from '../data/wave14Data';
import {
  ArtifactId,
  AuraStyleId,
  AvatarFrameId,
  BundlePreviewPayload,
  ComputedPlayerStats,
  CoopRaidDifficulty,
  ElementalTowerId,
  FlashDealItem,
  HaloId,
  HeroId,
  HeroSkinId,
  LobbyCameraPreset,
  LobbyHeroPoseId,
  LobbySkyThemeId,
  LobbyWeatherId,
  MonthlyCardTier,
  MountId,
  PantheonBlessingId,
  PetId,
  SanctuaryFloorId,
  SaveData,
  WeaponAuraId,
  WingId,
} from '../types/game';
import {
  ArtifactRelicIcon,
  AwakenCrystalIcon,
  GoldCoinIcon,
  MountShardIcon,
  MysticTokenIcon,
  PetEssenceIcon,
  SoulGemIcon,
  StarDustIcon,
  WingFeatherIcon,
  ZodiacAvatar,
} from './GameIcons';
import {
  LobbyGearPanel,
  LobbyHeroesPanel,
  LobbyRunesPanel,
  LobbyShopPanel,
  ShopSectionTab,
} from './LobbyPanels';
import { Wave12SanctumTab } from './Wave12SanctumModal';
import { Wave13Tab } from './Wave13TreasuryModal';
import { Wave14Tab } from './Wave14AscensionModal';

export type LobbyTab = 'battle' | 'gear' | 'heroes' | 'runes' | 'shop';
export type LobbyGameMode =
  | 'chapter'
  | 'tower'
  | 'elemental_tower'
  | 'boss_rush'
  | 'daily_rift'
  | 'coop_raid'
  | 'crystal_defense'
  | 'world_boss'
  | 'blood_moon'
  | 'abyssal_gauntlet'
  | 'guild_war'
  | 'pantheon_expedition'
  | 'championship_3round'
  | 'crystal_vault'
  | 'dragon_lair'
  | 'sky_citadel';

interface TitleScreenProps {
  save: SaveData;
  stats: ComputedPlayerStats;
  selectedChapterId: number;
  gameMode: LobbyGameMode;
  activeTab: LobbyTab;
  heroSubTabInitial?: 'roster' | 'pets' | 'cosmetics' | 'wings' | 'mounts' | 'artifacts' | 'halos';
  shopSection?: ShopSectionTab;
  previewHeroId: HeroId;
  cameraPreset?: LobbyCameraPreset;
  wishLastOutcomes?: Array<{ label: string; rarity: 'R' | 'SR' | 'SSR'; isTargetHit: boolean }>;
  selectedCoopDifficulty: CoopRaidDifficulty;
  selectedElementalTower: ElementalTowerId;
  onSelectCoopDifficulty: (d: CoopRaidDifficulty) => void;
  onSelectElementalTower: (t: ElementalTowerId) => void;
  onChangeCameraPreset?: (preset: LobbyCameraPreset) => void;
  onTabChange: (tab: LobbyTab) => void;
  onOpenHeroSubTab?: (
    subTab: 'roster' | 'pets' | 'cosmetics' | 'wings' | 'mounts' | 'artifacts' | 'halos'
  ) => void;
  onOpenShopSection: (section: ShopSectionTab) => void;
  onGameModeChange: (mode: LobbyGameMode) => void;
  onPreviewHero: (heroId: HeroId) => void;
  onSelectChapter: (chapterId: number) => void;
  onStartTrial: () => void;
  onStartTower: () => void;
  onStartBossRush: () => void;
  onStartDailyRift: () => void;
  onStartCoopRaid: (difficulty: CoopRaidDifficulty) => void;
  onStartElementalTower: (towerId: ElementalTowerId) => void;
  onStartCrystalDefense: () => void;
  onStartWorldBoss: () => void;
  onStartBloodMoon?: () => void;
  onClaimBloodMoonMilestone?: (score: number) => void;
  onStartAbyssalGauntlet?: () => void;
  onClaimAbyssalMilestone?: (wave: number) => void;
  onStartGuildWar?: () => void;
  onClaimGuildWarBox?: (score: number) => void;
  onStartPantheon?: () => void;
  onSelectPantheonBlessing?: (blessingId: PantheonBlessingId) => void;
  onClaimPantheonMilestone?: (score: number) => void;
  onStartChampionship?: () => void;
  onClaimChampionshipMilestone?: (trophiesRequired: number) => void;
  onOpenFestivalModal?: () => void;
  onSelectSkyTheme?: (themeId: LobbySkyThemeId) => void;
  onUnlockSkyTheme?: (themeId: LobbySkyThemeId, mode: 'codex' | 'gems') => void;
  honorTickerVisible?: boolean;
  onToggleHonorTicker?: () => void;
  onQuickSweepChapter: (chapterId: number) => void;
  onToggleMute: () => void;
  onOpenRewardsModal: (tab: 'checkin' | 'quests' | 'welcome' | 'journey') => void;
  onOpenTalentsModal: () => void;
  onOpenConstellationModal: () => void;
  onOpenBattlePassModal: () => void;
  onOpenVipModal: () => void;
  onOpenForgeModal: () => void;
  onOpenForgeSubTab: (
    subTab: 'salvage' | 'forge' | 'reforge' | 'awaken' | 'sockets',
    gearUid?: string
  ) => void;
  onOpenGuildModal: () => void;
  onOpenDestinyWheelModal: () => void;
  onOpenNightMarketModal: () => void;
  onOpenArenaModal: () => void;
  onOpenAuctionModal: () => void;
  onOpenHonorBoard: () => void;
  onOpenWardrobe?: () => void;
  onOpenDispatch?: () => void;
  onOpenProfileModal: (tab?: 'profile' | 'achievements' | 'history' | 'codex') => void;
  onOpenMailModal: () => void;
  onOpenSettingsModal: () => void;
  onSelectHero: (heroId: HeroId) => void;
  onUnlockHero: (heroId: HeroId, currency: 'gold' | 'gems') => void;
  onUpgradeHeroStar: (heroId: HeroId) => void;
  onPreviewUltimate: (heroId: HeroId) => void;
  onUnlockPet: (petId: PetId, currency: 'gold' | 'gems') => void;
  onEquipPet: (petId: PetId | null) => void;
  onUpgradePet: (petId: PetId) => void;
  onEvolvePet?: (petId: PetId) => void;
  onUnlockSkin: (skinId: HeroSkinId, currency: 'gold' | 'gems') => void;
  onEquipSkin: (heroId: HeroId, skinId: HeroSkinId) => void;
  onUnlockAura: (auraId: AuraStyleId, currency: 'gold' | 'gems') => void;
  onEquipAura: (auraId: AuraStyleId) => void;
  onUnlockWing: (wingId: WingId, currency: 'gems' | 'feathers') => void;
  onEquipWing: (wingId: WingId | null) => void;
  onUpgradeWing: (wingId: WingId) => void;
  onUnlockAvatarFrame: (frameId: AvatarFrameId) => void;
  onEquipAvatarFrame: (frameId: AvatarFrameId) => void;
  onUnlockMount?: (mountId: MountId, currency: 'gems' | 'shards') => void;
  onEquipMount?: (mountId: MountId | null) => void;
  onUpgradeMount?: (mountId: MountId) => void;
  onUnlockWeaponAura?: (auraId: WeaponAuraId, currency: 'gems' | 'crystals') => void;
  onEquipWeaponAura?: (auraId: WeaponAuraId) => void;
  onUpgradeWeaponAura?: (auraId: WeaponAuraId) => void;
  onUnlockArtifact?: (artifactId: ArtifactId, currency: 'gems' | 'shards') => void;
  onEquipArtifact?: (artifactId: ArtifactId | null) => void;
  onUpgradeArtifact?: (artifactId: ArtifactId) => void;
  onUnlockHalo?: (haloId: HaloId, currency: 'gems' | 'crystals') => void;
  onEquipHalo?: (haloId: HaloId | null) => void;
  onUpgradeHalo?: (haloId: HaloId) => void;
  onEquipGear: (uid: string) => void;
  onUpgradeGear: (uid: string) => void;
  onFuseGear: (uid: string) => void;
  onAutoEquipBest: () => void;
  onBulkFuseGear: () => void;
  onSaveBuildPreset: (idx: number) => void;
  onApplyBuildPreset: (idx: number) => void;
  onOpenChestWithGacha: (
    variant: 'iron' | 'mythic' | 'rune_bag' | 'rune_rare',
    count?: 1 | 10
  ) => void;
  onBuyFlashDeal: (deal: FlashDealItem) => void;
  onUnlockGrowthFundPremium: () => void;
  onClaimGrowthFundReward: (milestoneId: string, tier: 'free' | 'premium') => void;
  onClaimAllGrowthFund: () => void;
  onBuyArenaShopOffer: (offer: ArenaShopOffer) => void;
  onBuyCommercialPack: (pack: CommercialPackItem) => void;
  onBuyMonthlyCard: (tier: MonthlyCardTier) => void;
  onClaimMonthlyCardDaily: (tier: MonthlyCardTier) => void;
  onClaimTopUpEvolutionTier: (tierId: string) => void;
  onSelectWishTarget?: (targetId: string) => void;
  onWishPoolRoll?: (count: 1 | 10) => void;
  onClaimWishMilestone?: (count: number) => void;
  onClaimFirstTopUp?: (tierId: string) => void;
  onBuyHotBundle?: (bundleId: string) => void;
  onMysticExchange?: (offerId: string) => void;
  onClaimChainStep?: (stepNumber: number) => void;
  onResetChainCycle?: () => void;
  onBreakGemVault?: () => void;
  onClaimGemVaultMilestone?: (target: number) => void;
  onBuyWeekendPack?: (packId: string) => void;
  onClaimWeekendPassDaily?: () => void;
  onOpenBundlePreview?: (payload: BundlePreviewPayload, onConfirm?: () => void) => void;
  onPowerAdvisorAction?: (kind: PowerRecommendation['actionKind']) => void;
  onEquipRune: (uid: string) => void;
  onUnequipRune: (uid: string) => void;
  onFuseRune: (uid: string) => void;
  onBulkFuseRunes: () => void;
  onRotateHero?: (deltaRad: number) => void;
  onResetHeroRotation?: () => void;
  photoMode?: boolean;
  photoAngle?: 'full' | 'closeup' | 'hero_wide';
  lobbyHeroPose?: LobbyHeroPoseId;
  onTogglePhotoMode?: (active: boolean) => void;
  onChangePhotoAngle?: (angle: 'full' | 'closeup' | 'hero_wide') => void;
  onSelectHeroPose?: (pose: LobbyHeroPoseId) => void;
  onCapturePhoto?: () => void;
  onOpenWave12Sanctum?: (tab: Wave12SanctumTab) => void;
  onOpenWave13Treasury?: (tab: Wave13Tab) => void;
  onOpenWave13Carnival?: () => void;
  onSelectLobbyWeather?: (weather: LobbyWeatherId) => void;
  onStartDragonLair?: () => void;
  onClaimDragonLairMilestone?: (scalesTarget: number) => void;
  onOpenCpBreakdown?: () => void;
  onOpenClaimAllModal?: () => void;
  onStartCrystalVault?: () => void;
  onClaimCrystalVaultMilestone?: (pillarsTarget: number) => void;
  onActivateSupremeMonthly?: () => void;
  onClaimSupremeMonthlyDaily?: () => void;
  onOpenWave14Ascension?: (tab: Wave14Tab) => void;
  onOpenWave14EventCenter?: () => void;
  onStartSkyCitadel?: () => void;
  onClaimSkyCitadelMilestone?: (scoreTarget: number) => void;
  onSelectSanctuaryFloor?: (floorId: SanctuaryFloorId) => void;
  onResetLobbyOrbit?: () => void;
  onAdjustLobbyZoom?: (delta: number) => void;
  onReplayEntranceVfx?: () => void;
  lobbyHeadPos?: { x: number; y: number; visible: boolean };
}

const NAV_TABS: Array<{
  id: LobbyTab;
  label: string;
  renderIcon: (active: boolean) => React.ReactNode;
}> = [
  {
    id: 'battle',
    label: 'Chiến Đấu',
    renderIcon: (a) => <Swords className={`w-4 h-4 sm:w-5 sm:h-5 ${a ? 'text-amber-300' : 'text-slate-400'}`} />,
  },
  {
    id: 'gear',
    label: 'Trang Bị',
    renderIcon: (a) => <Shield className={`w-4 h-4 sm:w-5 sm:h-5 ${a ? 'text-amber-300' : 'text-slate-400'}`} />,
  },
  {
    id: 'heroes',
    label: 'Anh Hùng',
    renderIcon: (a) => <Users className={`w-4 h-4 sm:w-5 sm:h-5 ${a ? 'text-amber-300' : 'text-slate-400'}`} />,
  },
  {
    id: 'runes',
    label: 'Ngọc Khắc',
    renderIcon: (a) => <Sparkles className={`w-4 h-4 sm:w-5 sm:h-5 ${a ? 'text-amber-300' : 'text-slate-400'}`} />,
  },
  {
    id: 'shop',
    label: 'Kho Báu',
    renderIcon: (a) => <Gem className={`w-4 h-4 sm:w-5 sm:h-5 ${a ? 'text-amber-300' : 'text-slate-400'}`} />,
  },
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  save,
  stats,
  selectedChapterId,
  gameMode,
  activeTab,
  heroSubTabInitial = 'roster',
  shopSection = 'privilege',
  previewHeroId,
  cameraPreset = 'overview',
  wishLastOutcomes = [],
  selectedCoopDifficulty,
  selectedElementalTower,
  onSelectCoopDifficulty,
  onSelectElementalTower,
  onChangeCameraPreset,
  onTabChange,
  onOpenHeroSubTab,
  onOpenShopSection,
  onGameModeChange,
  onPreviewHero,
  onSelectChapter,
  onStartTrial,
  onStartTower,
  onStartBossRush,
  onStartDailyRift,
  onStartCoopRaid,
  onStartElementalTower,
  onStartCrystalDefense,
  onStartWorldBoss,
  onStartBloodMoon,
  onClaimBloodMoonMilestone,
  onStartAbyssalGauntlet,
  onClaimAbyssalMilestone,
  onStartGuildWar,
  onClaimGuildWarBox,
  onStartPantheon,
  onSelectPantheonBlessing,
  onClaimPantheonMilestone,
  onStartChampionship,
  onClaimChampionshipMilestone,
  onOpenFestivalModal,
  onSelectSkyTheme,
  onUnlockSkyTheme,
  honorTickerVisible = true,
  onToggleHonorTicker,
  onQuickSweepChapter,
  onToggleMute,
  onOpenRewardsModal,
  onOpenTalentsModal,
  onOpenConstellationModal,
  onOpenBattlePassModal,
  onOpenVipModal,
  onOpenForgeModal,
  onOpenForgeSubTab,
  onOpenGuildModal,
  onOpenDestinyWheelModal,
  onOpenNightMarketModal,
  onOpenArenaModal,
  onOpenAuctionModal,
  onOpenHonorBoard,
  onOpenWardrobe,
  onOpenDispatch,
  onOpenProfileModal,
  onOpenMailModal,
  onOpenSettingsModal,
  onSelectHero,
  onUnlockHero,
  onUpgradeHeroStar,
  onPreviewUltimate,
  onUnlockPet,
  onEquipPet,
  onUpgradePet,
  onEvolvePet,
  onUnlockSkin,
  onEquipSkin,
  onUnlockAura,
  onEquipAura,
  onUnlockWing,
  onEquipWing,
  onUpgradeWing,
  onUnlockAvatarFrame,
  onEquipAvatarFrame,
  onUnlockMount,
  onEquipMount,
  onUpgradeMount,
  onUnlockWeaponAura,
  onEquipWeaponAura,
  onUpgradeWeaponAura,
  onUnlockArtifact,
  onEquipArtifact,
  onUpgradeArtifact,
  onUnlockHalo,
  onEquipHalo,
  onUpgradeHalo,
  onEquipGear,
  onUpgradeGear,
  onFuseGear,
  onAutoEquipBest,
  onBulkFuseGear,
  onSaveBuildPreset,
  onApplyBuildPreset,
  onOpenChestWithGacha,
  onBuyFlashDeal,
  onUnlockGrowthFundPremium,
  onClaimGrowthFundReward,
  onClaimAllGrowthFund,
  onBuyArenaShopOffer,
  onBuyCommercialPack,
  onBuyMonthlyCard,
  onClaimMonthlyCardDaily,
  onClaimTopUpEvolutionTier,
  onSelectWishTarget,
  onWishPoolRoll,
  onClaimWishMilestone,
  onClaimFirstTopUp,
  onBuyHotBundle,
  onMysticExchange,
  onClaimChainStep,
  onResetChainCycle,
  onBreakGemVault,
  onClaimGemVaultMilestone,
  onBuyWeekendPack,
  onClaimWeekendPassDaily,
  onOpenBundlePreview,
  onPowerAdvisorAction,
  onEquipRune,
  onUnequipRune,
  onFuseRune,
  onBulkFuseRunes,
  onRotateHero,
  onResetHeroRotation,
  photoMode = false,
  photoAngle = 'full',
  lobbyHeroPose = 'heroic',
  onTogglePhotoMode,
  onChangePhotoAngle,
  onSelectHeroPose,
  onCapturePhoto,
  onOpenWave12Sanctum,
  onOpenWave13Treasury,
  onOpenWave13Carnival,
  onSelectLobbyWeather,
  onStartDragonLair,
  onClaimDragonLairMilestone,
  onOpenCpBreakdown,
  onOpenClaimAllModal,
  onStartCrystalVault,
  onClaimCrystalVaultMilestone,
  onActivateSupremeMonthly,
  onClaimSupremeMonthlyDaily,
  onOpenWave14Ascension,
  onOpenWave14EventCenter,
  onStartSkyCitadel,
  onClaimSkyCitadelMilestone,
  onSelectSanctuaryFloor,
  onResetLobbyOrbit,
  onAdjustLobbyZoom,
  onReplayEntranceVfx,
  lobbyHeadPos,
}) => {
  const [chapterPickerOpen, setChapterPickerOpen] = useState(false);
  const [featureDockOpen, setFeatureDockOpen] = useState(false);
  const [skyPickerOpen, setSkyPickerOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [eventIdx, setEventIdx] = useState(0);
  const [eventImgFailed, setEventImgFailed] = useState(false);
  const [bossArenaImgFailed, setBossArenaImgFailed] = useState(false);
  const [riftImgFailed, setRiftImgFailed] = useState(false);
  const [coopImgFailed, setCoopImgFailed] = useState(false);
  const [towerElImgFailed, setTowerElImgFailed] = useState(false);
  const [crystalDefenseImgFailed, setCrystalDefenseImgFailed] = useState(false);
  const [worldBossImgFailed, setWorldBossImgFailed] = useState(false);
  const [bloodMoonImgFailed, setBloodMoonImgFailed] = useState(false);
  const [abyssalImgFailed, setAbyssalImgFailed] = useState(false);
  const [guildWarImgFailed, setGuildWarImgFailed] = useState(false);
  const [pantheonImgFailed, setPantheonImgFailed] = useState(false);
  const [championshipImgFailed, setChampionshipImgFailed] = useState(false);
  const [crystalVaultImgFailed, setCrystalVaultImgFailed] = useState(false);
  const [dragonLairImgFailed, setDragonLairImgFailed] = useState(false);
  const [skyCitadelImgFailed, setSkyCitadelImgFailed] = useState(false);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setEventIdx((v) => (v + 1) % EVENT_BANNERS.length);
    }, 6500);
    return () => window.clearInterval(timer);
  }, []);

  const selectedChapter =
    CHAPTERS.find((c) => c.id === selectedChapterId) ?? CHAPTERS[0];
  const isChapterUnlocked = selectedChapter.id <= save.highestChapterCleared + 1;
  const isChapterCleared = selectedChapter.id <= save.highestChapterCleared;
  const activeHero = HERO_MAP[save.selectedHeroId] ?? HERO_MAP.artemis;
  const heroStar = save.heroStars[activeHero.id] ?? 0;
  const bestStage = save.bestStagePerChapter[selectedChapter.id] ?? 0;
  const powerMet = stats.powerRating >= selectedChapter.recommendedPower;
  const claimableCount = countClaimableWelfare(save);
  const totalTalentLv = getTotalTalentLevels(save.talents);
  const bp = normalizeBattlePass(save.battlePass);
  const bpInfo = getBattlePassLevelInfo(bp.xp);
  const bpClaimable = countClaimableBattlePass(save);
  const achClaimable = countClaimableAchievements(save);
  const unreadMailCount = countUnreadMail(save);
  const vip = normalizeVip(save.vip);
  const hasVip = isVipActive(vip);
  const vipDailyReady = canClaimVipDaily(vip);
  const dailySweeps = normalizeDailySweeps(save.dailySweeps, hasVip);
  const maxSweeps = MAX_DAILY_SWEEPS + (hasVip ? 2 : 0);
  const dailyRift = normalizeDailyRift(save.dailyRift);
  const todayRiftPair = getDailyRiftPair(getTodayKey());
  const activeEvent = EVENT_BANNERS[eventIdx] ?? EVENT_BANNERS[0];
  const guild = normalizeGuild(save.guild);
  const destinyWheel = normalizeDestinyWheel(save.destinyWheel);
  const destinyReadyCount = destinyWheel.freeSpinsRemaining + destinyWheel.tickets;
  const arena = normalizeArena(save.arena);
  const nightMarket = normalizeNightMarket(save.nightMarket);
  const journeyReadyCount = countClaimableJourneyRewards(save, stats.powerRating);
  const spendMilestoneReady = CUMULATIVE_SPEND_MILESTONES.filter(
    (m) =>
      nightMarket.totalGemsSpent >= m.gems &&
      !nightMarket.claimedSpendMilestones.includes(m.gems)
  ).length;
  const constellationSummary = computeConstellationBonuses(save.constellations);
  const claimableGfCount = countClaimableGrowthFund(save, stats.powerRating);
  const coopState = normalizeCoopRaid(save.coopRaid);
  const coopAllies = selectCoopAiAllies(save.selectedHeroId);
  const activeCoopDiff = COOP_DIFFICULTY_MAP[selectedCoopDifficulty] ?? COOP_RAID_DIFFICULTIES[0];
  const elementalTowers = normalizeElementalTowers(save.elementalTowers);
  const activeElTower = ELEMENTAL_TOWER_MAP[selectedElementalTower] ?? ELEMENTAL_TOWERS[0];

  const monthlyPriv = normalizeMonthlyPrivilege(save.monthlyPrivilege);
  const extraDefenseMax =
    (isMonthlyCardActive(monthlyPriv.silver) ? 1 : 0) +
    (isMonthlyCardActive(monthlyPriv.royal) ? 1 : 0);
  const crystalState = normalizeCrystalDefense(save.crystalDefense);
  const crystalMaxRuns = CRYSTAL_DEFENSE_MAX_DAILY_RUNS + extraDefenseMax;
  const wbState = normalizeWorldBoss(save.worldBoss);
  const wbLiveRank = computeWorldBossLiveRank(wbState.bestSingleDamage);
  const auctionState = normalizeAuctionHouse(save.auctionHouse);
  const auctionClaimCount = auctionState.claimBox.length;
  const wave7RewardBadges = countClaimableWave7Rewards(save);
  const bloodMoonState = normalizeBloodMoon(save.bloodMoon);
  const dispatchState = normalizeDispatchState(save.dispatch);
  const dispatchReadyCount = dispatchState.slots.filter(
    (s) => s.missionId && s.endsAt > 0 && Date.now() >= s.endsAt
  ).length;
  const wishPoolState = normalizeWishPool(save.wishPool);
  const wishMilestonesReady = WISH_MILESTONES.filter(
    (m) => wishPoolState.totalWishes >= m.count && !wishPoolState.claimedMilestones.includes(m.count)
  ).length;
  const wave8Badges = countClaimableWave8Rewards(save);
  const wave9Badges = countClaimableWave9Rewards(save);
  const abyssalState = normalizeAbyssalGauntlet(save.abyssalGauntlet);
  const guildWarState = normalizeGuildWar(save.guildWar);
  const activeDynTitle =
    save.equippedDynamicTitleId && save.equippedDynamicTitleId !== 'none'
      ? DYNAMIC_TITLE_MAP[save.equippedDynamicTitleId]
      : undefined;
  const powerRec = computePowerAdvisor(save, stats);
  const equippedBadgeDef = save.equippedMythicBadgeId
    ? MYTHIC_BADGE_MAP[save.equippedMythicBadgeId]
    : undefined;
  const stepUpChain = normalizeStepUpChain(save.stepUpChain);
  const gemVault = normalizeGemRebateVault(save.gemRebateVault);
  const pantheonState = normalizePantheonExpedition(save.pantheonExpedition);
  const freeChainStepReady = hasFreeChainStepReady(save);
  const vaultClaimCount = countClaimableVaultRewards(save);
  const pantheonClaimCount = countClaimablePantheonMilestones(save);
  const wave10Badges = (freeChainStepReady ? 1 : 0) + vaultClaimCount + pantheonClaimCount;
  const codexSummary = computeCodexSummary(save);
  const codexClaimCount = countClaimableCodexRanks(save);
  const festivalClaimCount = countClaimableFestivalRewards(save);
  const championshipState = normalizeChampionshipState(save.championship);
  const championshipClaimCount = countClaimableChampionshipMilestones(save);
  const wave11Badges = codexClaimCount + festivalClaimCount + championshipClaimCount;
  const supremeActive = isSupremeMonthlyActive(save.supremeMonthly);
  const crystalVaultState = normalizeCrystalVault(save.crystalVault, supremeActive);
  const crystalVaultClaimCount = countClaimableCrystalVaultMilestones(save);
  const dragonLairState = normalizeDragonLair(save.dragonLair);
  const dragonLairClaimCount = countClaimableDragonLairMilestones(save);
  const carnivalClaimCount = countClaimableCarnivalRewards(save);
  const starlightRaceClaimCount = countClaimableStarlightMilestones(save);
  const wave13Badges = dragonLairClaimCount + carnivalClaimCount + starlightRaceClaimCount;
  const activeWeatherId: LobbyWeatherId = save.lobbyWeather ?? 'meteor_shower';
  const activeSanctuaryFloorId: SanctuaryFloorId = save.sanctuaryFloorTheme ?? 'marble_gold';
  const equippedRoyalTitleDef = save.equippedRoyal3DTitleId
    ? ROYAL_3D_TITLE_MAP[save.equippedRoyal3DTitleId] ?? null
    : null;
  const skyCitadelState = normalizeSkyCitadel(save.skyCitadel);
  const skyCitadelClaimCount = countClaimableSkyCitadelMilestones(save);
  const astralBoardState = normalizeAstralBoard(save.astralBoard);
  const astralBoardClaimCount = countClaimableAstralBoardRewards(save);
  const guildSanctuaryClaimCount = countClaimableGuildSanctuaryRewards(save);
  const wave14Badges = skyCitadelClaimCount + astralBoardClaimCount + guildSanctuaryClaimCount;
  const equippedVipFrameDef = save.equippedVipFrameId
    ? VIP_AVATAR_FRAME_MAP[save.equippedVipFrameId]
    : null;
  const claimAllPreview = previewLobbyClaimAll(save);
  const activeSkyThemeId: LobbySkyThemeId = save.lobbySkyTheme ?? 'golden_galaxy';
  const unlockedSkyThemes: LobbySkyThemeId[] = save.unlockedSkyThemes ?? [
    'golden_galaxy',
    'dawn_sanctum',
  ];
  const wave14Announcements = [
    {
      id: 'w14_live_1',
      badge: 'MÙA IV',
      playerName: 'Không Chiến Tinh Giới 3D',
      message: 'đã mở cửa · Săn Lông Vũ Thần Quang nâng Cánh 3D 1★→5★!',
      accent: 'amber' as const,
    },
    {
      id: 'w14_live_2',
      badge: 'BÀN CỜ',
      playerName: 'Xúc Xắc Tinh Tú 16 Ô',
      message: 'nhận miễn phí mỗi ngày · Quay ô Đại Cát rinh Mảnh Thần Thoại!',
      accent: 'purple' as const,
    },
    {
      id: 'w14_live_3',
      badge: 'BANG 3D',
      playerName: 'Lãnh Địa Bang Hội 3D',
      message: 'mở 4 công trình kiến trúc & 4 Rương Boss Hàng Ngày!',
      accent: 'emerald' as const,
    },
  ];
  const honorMarqueeItems = [
    ...(save.honorFeed ?? []),
    ...wave14Announcements,
    ...DEFAULT_HONOR_FEED,
  ].slice(0, 12);

  const dockTotalBadges =
    claimableCount +
    bpClaimable +
    (vipDailyReady ? 1 : 0) +
    (!vip.starterPackClaimed ? 1 : 0) +
    destinyReadyCount +
    guild.bossRunsRemaining +
    spendMilestoneReady +
    claimableGfCount +
    auctionClaimCount +
    wave7RewardBadges +
    wave8Badges +
    wave9Badges +
    wave10Badges +
    wave11Badges +
    crystalVaultClaimCount +
    wave13Badges +
    wave14Badges;

  const handleStepChapter = (delta: number) => {
    soundEngine.playUiClick();
    const nextId = Math.max(1, Math.min(CHAPTERS.length, selectedChapterId + delta));
    onSelectChapter(nextId);
  };

  // Wave 12: Clean 3D Lobby Photo Studio Mode (Hides all lobby HUD for hero showcase & PNG capture)
  if (photoMode) {
    return (
      <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <div className="pointer-events-auto cel-panel-ornate rounded-2xl px-3.5 py-2 flex items-center gap-2.5">
            <Camera className="w-4 h-4 text-amber-300 shrink-0" />
            <div>
              <div className="font-display text-xs font-black text-amber-200">
                Studio Chụp Ảnh 3D · {activeHero.name}
              </div>
              <div className="text-[10px] text-slate-300">
                Kéo xoay hoặc chọn Tư Thế &amp; Góc Máy để lưu ảnh PNG độ nét cao
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onTogglePhotoMode?.(false);
            }}
            className="pointer-events-auto a2-slate-btn px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer border border-amber-400/50"
          >
            <X className="w-4 h-4 text-amber-300" />
            <span>Thoát Chụp Ảnh</span>
          </button>
        </div>

        <div className="pointer-events-auto max-w-3xl w-full mx-auto cel-panel-ornate rounded-2xl p-3 sm:p-4 space-y-3 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              {LOBBY_HERO_POSES.map((pose) => {
                const active = lobbyHeroPose === pose.id;
                return (
                  <button
                    key={pose.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      onSelectHeroPose?.(pose.id);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap cursor-pointer transition-colors ${
                      active
                        ? 'a2-yellow-btn'
                        : 'bg-[#090f24] border border-slate-700 text-slate-200 hover:border-amber-300'
                    }`}
                  >
                    {pose.label}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5">
              {([
                ['full', 'Toàn Thân'],
                ['closeup', 'Cận Cảnh'],
                ['hero_wide', 'Góc Rộng'],
              ] as const).map(([angleId, label]) => (
                <button
                  key={angleId}
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onChangePhotoAngle?.(angleId);
                  }}
                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap cursor-pointer ${
                    photoAngle === angleId
                      ? 'bg-sky-400 text-slate-950'
                      : 'bg-[#090f24] border border-slate-700 text-slate-300 hover:border-sky-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {onSelectLobbyWeather && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-amber-400/15">
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 mr-1">
                Thời Tiết 3D:
              </span>
              {LOBBY_WEATHER_DEFS.map((w) => {
                const active = activeWeatherId === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(1.06);
                      onSelectLobbyWeather(w.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black whitespace-nowrap cursor-pointer transition-colors ${
                      active
                        ? 'a2-emerald-btn'
                        : 'bg-[#090f24] border border-slate-700 text-slate-300 hover:border-cyan-300'
                    }`}
                  >
                    {w.name}
                  </button>
                );
              })}
            </div>
          )}

          {onSelectSanctuaryFloor && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-amber-400/15">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 mr-1">
                Sàn Thần Điện 3D:
              </span>
              {SANCTUARY_FLOOR_DEFS.map((fl) => {
                const active = activeSanctuaryFloorId === fl.id;
                return (
                  <button
                    key={fl.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(1.06);
                      onSelectSanctuaryFloor(fl.id);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black whitespace-nowrap cursor-pointer transition-colors ${
                      active
                        ? 'a2-yellow-btn'
                        : 'bg-[#090f24] border border-slate-700 text-slate-300 hover:border-amber-300'
                    }`}
                  >
                    {fl.name}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-400/20">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onRotateHero?.(-0.45)}
                className="a2-slate-btn px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer"
              >
                ↺ Xoay Trái
              </button>
              <button
                type="button"
                onClick={() => onRotateHero?.(0.45)}
                className="a2-slate-btn px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer"
              >
                ↻ Xoay Phải
              </button>
              {onAdjustLobbyZoom && (
                <>
                  <button
                    type="button"
                    onClick={() => onAdjustLobbyZoom(-0.7)}
                    aria-label="Phóng to 3D"
                    className="a2-slate-btn px-2.5 py-2 rounded-xl text-xs font-black flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5 text-sky-300" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdjustLobbyZoom(0.7)}
                    aria-label="Thu nhỏ 3D"
                    className="a2-slate-btn px-2.5 py-2 rounded-xl text-xs font-black flex items-center gap-1 whitespace-nowrap cursor-pointer"
                  >
                    <ZoomOut className="w-3.5 h-3.5 text-sky-300" />
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => {
                  onResetHeroRotation?.();
                  onResetLobbyOrbit?.();
                }}
                className="a2-slate-btn px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer"
              >
                Reset 360°
              </button>
              {onReplayEntranceVfx && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playAchievement();
                    onReplayEntranceVfx();
                  }}
                  className="a2-purple-btn px-3 py-2 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer"
                >
                  ✨ Hiệu Ứng Xuất Hiện
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                soundEngine.playVictory();
                onCapturePhoto?.();
              }}
              className="a2-yellow-btn px-4 py-2 rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Chụp &amp; Lưu Ảnh PNG</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between">
      {/* TOP CELESTIAL RESOURCE BAR */}
      <header className="pointer-events-auto z-20 flex items-center justify-between gap-3 px-3 sm:px-6 py-2 bg-gradient-to-b from-[#060914]/98 via-[#0a0f24]/95 to-[#080d1e]/92 border-b border-amber-400/30 shadow-xl shrink-0">
        {/* Left: Hero Portrait + Power Rating -> Opens Profile/Achievements/Codex */}
        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            onOpenProfileModal('profile');
          }}
          className="relative flex items-center gap-2.5 pr-3 pl-1 py-1 rounded-2xl bg-[#0b1229]/95 border border-amber-400/35 hover:border-amber-300/80 transition-colors cursor-pointer shrink-0"
          title="Mở Hồ Sơ, Thành Tựu & Thư Viện"
        >
          <div
            className={`rounded-full shrink-0 ${
              equippedVipFrameDef ? `${equippedVipFrameDef.frameClass} p-[2.5px]` : ''
            }`}
          >
            <ZodiacAvatar
              heroId={activeHero.id}
              accentHex={activeHero.accentHex}
              cloakHex={activeHero.cloakHex}
              hairHex={activeHero.hairHex}
              frameId={save.equippedAvatarFrameId ?? 'default_gold'}
              sizeClass="w-10 h-10 sm:w-11 sm:h-11"
            />
          </div>
          <div className="text-left leading-tight">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-xs sm:text-sm font-black text-white whitespace-nowrap">
                {activeHero.name}
              </span>
              <span className="text-[10px] font-mono-nums font-bold text-amber-300">
                ★{heroStar}
              </span>
              {hasVip && (
                <span className="px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-300/60 text-[9px] font-black text-amber-300">
                  VIP
                </span>
              )}
              {equippedBadgeDef && (
                <span className="hidden md:inline px-1.5 py-0.5 rounded bg-purple-500/25 border border-purple-300/50 text-[9px] font-black text-purple-200 whitespace-nowrap">
                  {equippedBadgeDef.title}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono-nums mt-0.5">
              <span className="text-[10px] font-extrabold tracking-wider text-amber-400/90">
                LC
              </span>
              <span className="font-black text-amber-200">{stats.powerRating}</span>
              <span aria-hidden="true" className="text-slate-600 hidden sm:inline">·</span>
              <span className="hidden sm:inline text-[10px] font-bold text-sky-300">
                Hồ Sơ
              </span>
            </div>
          </div>
          {achClaimable > 0 && (
            <span className="ml-0.5 px-1.5 py-0.5 rounded bg-emerald-500 text-[9px] font-black text-slate-950 font-mono-nums">
              +{achClaimable}
            </span>
          )}
        </button>

        {/* Wave 12: Quick Clickable CP Breakdown & 1-Tap Claim All */}
        <div className="hidden lg:flex items-center gap-1.5">
          {onOpenCpBreakdown && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onOpenCpBreakdown();
              }}
              title="Phân Tích Lực Chiến 6 Hạng Mục & Gợi Ý Mạnh Hóa 1 Chạm"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#130d29] border border-amber-400/50 hover:border-amber-300 text-[11px] font-black text-amber-200 whitespace-nowrap cursor-pointer transition-colors"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Phân Tích LC</span>
            </button>
          )}
          {onOpenClaimAllModal && claimAllPreview.totalClaimableCount > 0 && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onOpenClaimAllModal();
              }}
              title="Nhận toàn bộ quà đang chờ tại Sảnh trong 1 chạm"
              className="a2-yellow-btn px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5 shrink-0" />
              <span>Nhận Quà (+{claimAllPreview.totalClaimableCount})</span>
            </button>
          )}
        </div>

        {/* Right: Clean Currency Counters & Utility Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenShopSection('gacha');
            }}
            title="Vàng · Nhấn để mở Triệu Hồi & Kho Báu"
            className="flex items-center gap-1.5 bg-[#070b1a]/95 border border-amber-400/35 hover:border-amber-300 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono-nums font-black text-amber-200 cursor-pointer transition-colors"
          >
            <GoldCoinIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{save.gold}</span>
            <span className="hidden sm:inline-flex items-center justify-center w-3.5 h-3.5 rounded bg-amber-400/20 text-amber-300 text-[10px] leading-none">
              +
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenShopSection('chain_bank');
            }}
            title="Ngọc Hồn · Nhấn để mở Chuỗi Quà & Ngân Hàng Tinh Ngân"
            className="flex items-center gap-1.5 bg-[#070b1a]/95 border border-purple-400/40 hover:border-purple-300 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono-nums font-black text-purple-200 cursor-pointer transition-colors"
          >
            <SoulGemIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{save.gems}</span>
            <span className="hidden sm:inline-flex items-center justify-center w-3.5 h-3.5 rounded bg-purple-400/25 text-purple-200 text-[10px] leading-none">
              +
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              if (onOpenHeroSubTab) onOpenHeroSubTab('halos');
              else onTabChange('heroes');
            }}
            title="Thần Tinh · Đúc & Nâng Hào Quang Thần Vực 3D"
            className="hidden sm:flex items-center gap-1.5 bg-[#070b1a]/95 border border-amber-300/45 hover:border-amber-200 px-2.5 py-1.5 rounded-xl text-xs font-mono-nums font-black text-amber-200 cursor-pointer transition-colors"
          >
            <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>{save.divineCrystals ?? 0}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onTabChange('heroes');
            }}
            title="Lông Vũ Tinh Tú · Nâng Cánh 3D"
            className="hidden xl:flex items-center gap-1.5 bg-[#070b1a]/95 border border-cyan-400/35 hover:border-cyan-300 px-2.5 py-1.5 rounded-xl text-xs font-mono-nums font-black text-cyan-200 cursor-pointer transition-colors"
          >
            <WingFeatherIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{save.wingFeathers ?? 0}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenForgeModal();
            }}
            title="Mở Lò Rèn & Tách Đồ"
            className="hidden lg:flex items-center gap-1.5 bg-[#070b1a]/95 border border-sky-400/35 hover:border-sky-300 px-2.5 py-1.5 rounded-xl text-xs font-mono-nums font-black text-sky-200 cursor-pointer transition-colors"
          >
            <StarDustIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{save.starDust ?? 0}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenHonorBoard();
            }}
            title="Bảng Vinh Danh Liên Server & Huy Hiệu Thần Thoại"
            className="hidden md:flex items-center gap-1.5 bg-[#070b1a]/95 border border-amber-400/35 hover:border-amber-300 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-200 cursor-pointer transition-colors whitespace-nowrap"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Vinh Danh</span>
          </button>

          {onTogglePhotoMode && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onTogglePhotoMode(true);
              }}
              aria-label="Chế độ chụp ảnh 3D"
              className="cel-panel w-9 h-9 rounded-xl flex items-center justify-center text-sky-200 hover:border-amber-300 transition-colors cursor-pointer shrink-0"
              title="Chế Độ Chụp Ảnh 3D & Đổi Tư Thế Anh Hùng"
            >
              <Camera className="w-4 h-4" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenMailModal();
            }}
            aria-label="Hộp thư quà tặng"
            className="relative cel-panel w-9 h-9 rounded-xl flex items-center justify-center text-amber-200 hover:border-amber-300 transition-colors cursor-pointer shrink-0"
            title="Hộp Thư Tinh Giới"
          >
            <Mail className="w-4 h-4" />
            {unreadMailCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 border border-white text-[9px] font-mono-nums font-black text-white flex items-center justify-center">
                {unreadMailCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenSettingsModal();
            }}
            aria-label="Cài đặt hệ thống"
            className="cel-panel w-9 h-9 rounded-xl flex items-center justify-center text-slate-200 hover:border-amber-300 transition-colors cursor-pointer shrink-0"
            title="Cài đặt đồ họa & âm thanh"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setGuideOpen(true);
            }}
            aria-label="Cẩm nang chiến đấu"
            className="cel-panel w-9 h-9 rounded-xl flex items-center justify-center text-amber-200 hover:border-amber-300 transition-colors cursor-pointer shrink-0"
            title="Cẩm nang tân thủ"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={save.muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            className="cel-panel w-9 h-9 rounded-xl flex items-center justify-center text-slate-200 hover:border-amber-300 transition-colors cursor-pointer shrink-0"
          >
            {save.muted ? (
              <VolumeX className="w-4 h-4 text-slate-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-amber-300" />
            )}
          </button>
        </div>
      </header>

      {/* HALL OF HONOR & LIVE EVENT MARQUEE TICKER (Wave 14) */}
      {activeTab === 'battle' && honorTickerVisible && (
        <div className="pointer-events-auto z-20 bg-[#070b1a]/95 border-b border-amber-400/25 px-3 sm:px-6 py-1 flex items-center gap-2 shrink-0 overflow-hidden">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(1.06);
              onOpenWave14EventCenter?.();
            }}
            className="px-2 py-0.5 rounded bg-amber-400/20 border border-amber-300/60 hover:border-amber-200 text-[9px] font-black text-amber-200 flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer"
            title="Mở Trung Tâm Sự Kiện Live Wave 14"
          >
            <Megaphone className="w-3 h-3 text-amber-300" />
            <span>SỰ KIỆN LIVE</span>
          </button>
          <div className="flex-1 overflow-hidden">
            <div className="w14-marquee-track gap-7 whitespace-nowrap text-[11px]">
              {honorMarqueeItems.concat(honorMarqueeItems).map((item, idx) => (
                <span key={`${item.id}-${idx}`} className="inline-flex items-center gap-1.5">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                      item.accent === 'emerald'
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : item.accent === 'purple'
                        ? 'bg-purple-500/20 text-purple-300'
                        : item.accent === 'rose'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-amber-400/20 text-amber-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                  <span className="text-amber-200 font-black">{item.playerName}</span>
                  <span className="text-slate-200 font-semibold">{item.message}</span>
                </span>
              ))}
            </div>
          </div>
          {onToggleHonorTicker && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onToggleHonorTicker();
              }}
              title="Ẩn thanh thông báo chạy chữ"
              className="text-slate-400 hover:text-amber-300 p-0.5 cursor-pointer shrink-0"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* MAIN CONTENT AREA */}
      <main key={activeTab} className="flex-1 min-h-0 flex flex-col a2-tab-enter">
        {activeTab === 'battle' && (
          <div className="flex-1 flex flex-col justify-end px-3 sm:px-6 py-2 min-h-0 relative overflow-hidden">
            {/* Wave 14: 3D-Projected Floating Royal Title directly over Hero Head */}
            {equippedRoyalTitleDef && lobbyHeadPos?.visible && (
              <div
                aria-hidden="true"
                style={{
                  left: `${lobbyHeadPos.x}px`,
                  top: `${Math.max(115, lobbyHeadPos.y - 12)}px`,
                }}
                className="fixed z-[12] pointer-events-none w14-title-float"
              >
                <div
                  className={`px-3.5 py-1 rounded-full bg-[#070b1a]/92 border ${equippedRoyalTitleDef.borderClass} shadow-[0_0_20px_rgba(251,191,36,0.35)] text-center whitespace-nowrap`}
                >
                  <div className="text-[8px] font-black uppercase tracking-[0.22em] text-amber-300/90 leading-none">
                    {equippedRoyalTitleDef.subLabel}
                  </div>
                  <div
                    className={`font-display text-xs sm:text-sm font-black bg-gradient-to-r ${equippedRoyalTitleDef.gradientClass} bg-clip-text text-transparent leading-tight mt-0.5`}
                  >
                    ✦ {equippedRoyalTitleDef.label} ✦
                  </div>
                </div>
              </div>
            )}

            {/* Upper Perimeter: Left Journey & Arena | Center Quiet Title | Right Expandable Feature Dock + Event Banner */}
            <div className="absolute inset-x-3 sm:inset-x-6 top-2.5 flex items-start justify-between gap-2 pointer-events-none z-10">
              {/* Left-Edge High-Signal Pillars: 7-Day Journey & Ranked PvP Arena */}
              <div className="pointer-events-auto flex flex-col gap-2 z-10 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setFeatureDockOpen(false);
                    onOpenRewardsModal('journey');
                  }}
                  className="cel-panel-ornate flex items-center gap-2 px-3 py-2 rounded-xl hover:border-amber-200 text-xs font-black text-amber-100 cursor-pointer whitespace-nowrap"
                >
                  <ScrollText className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span className="hidden sm:inline">Hành Trình 7 Ngày</span>
                  {journeyReadyCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black">
                      +{journeyReadyCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    setFeatureDockOpen(false);
                    onOpenArenaModal();
                  }}
                  className="cel-panel-ornate flex items-center gap-2 px-3 py-2 rounded-xl border-rose-400/45 hover:border-amber-200 text-xs font-black text-rose-100 cursor-pointer whitespace-nowrap"
                >
                  <Swords className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="hidden sm:inline">Đấu Trường Arena</span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white font-mono-nums text-[9px] font-black">
                    {arena.ticketsRemaining}
                  </span>
                </button>

                {onOpenDispatch && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      setFeatureDockOpen(false);
                      onOpenDispatch();
                    }}
                    className="cel-panel-ornate flex items-center gap-2 px-3 py-2 rounded-xl border-sky-400/45 hover:border-amber-200 text-xs font-black text-sky-100 cursor-pointer whitespace-nowrap"
                  >
                    <Send className="w-4 h-4 text-sky-300 shrink-0" />
                    <span className="hidden sm:inline">Phái Cử Đồng Hành</span>
                    {dispatchReadyCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black">
                        +{dispatchReadyCount}
                      </span>
                    )}
                  </button>
                )}

                <div className="flex items-center gap-1.5">
                  {onOpenWardrobe && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        setFeatureDockOpen(false);
                        onOpenWardrobe();
                      }}
                      className="cel-panel flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border-amber-300/45 hover:border-amber-200 text-[11px] font-black text-amber-200 cursor-pointer whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span className="hidden sm:inline">Thử Đồ 360°</span>
                    </button>
                  )}

                  {onChangeCameraPreset && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onChangeCameraPreset(cameraPreset === 'closeup' ? 'overview' : 'closeup');
                      }}
                      title="Chuyển góc Camera Sảnh 3D"
                      className="cel-panel flex items-center gap-1 px-2.5 py-1.5 rounded-xl border-sky-400/40 hover:border-sky-300 text-[11px] font-black text-sky-200 cursor-pointer whitespace-nowrap"
                    >
                      <Camera className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                      <span className="hidden sm:inline">
                        {cameraPreset === 'closeup' ? 'Toàn Cảnh' : 'Cận Cảnh'}
                      </span>
                    </button>
                  )}

                  {onSelectSkyTheme && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setSkyPickerOpen((v) => !v);
                        }}
                        title="Đổi Bầu Trời Động & Bệ Đứng Hoàng Gia 3D"
                        className="cel-panel flex items-center gap-1 px-2.5 py-1.5 rounded-xl border-amber-400/45 hover:border-amber-300 text-[11px] font-black text-amber-200 cursor-pointer whitespace-nowrap"
                      >
                        <Sun className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span className="hidden sm:inline">Bầu Trời 3D</span>
                      </button>

                      {skyPickerOpen && (
                        <div className="absolute left-0 top-10 w-72 cel-panel-ornate rounded-2xl p-3 shadow-2xl z-30 space-y-2">
                          <div className="flex items-center justify-between border-b border-amber-400/20 pb-1.5">
                            <span className="font-display text-xs font-black text-amber-200">
                              Bầu Trời Động &amp; Bệ Hoàng Gia 3D
                            </span>
                            <button
                              type="button"
                              onClick={() => setSkyPickerOpen(false)}
                              className="text-slate-400 hover:text-white cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {LOBBY_SKY_THEMES.map((theme) => {
                              const isUnlocked = unlockedSkyThemes.includes(theme.id);
                              const isEquipped = activeSkyThemeId === theme.id;
                              const codexReq = theme.unlockCodexScore ?? 0;
                              const canCodexUnlock =
                                !isUnlocked &&
                                codexReq > 0 &&
                                codexSummary.totalPoints >= codexReq;
                              const canGemUnlock =
                                !isUnlocked &&
                                theme.unlockGems > 0 &&
                                save.gems >= theme.unlockGems;

                              return (
                                <div
                                  key={theme.id}
                                  className={`rounded-xl p-2 border flex items-center justify-between gap-2 ${
                                    isEquipped
                                      ? 'bg-amber-400/15 border-amber-300/75'
                                      : 'bg-[#070b1a] border-amber-400/20'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span
                                      className={`w-6 h-6 rounded-lg border border-white/50 shrink-0 bg-gradient-to-br ${theme.swatchGradient}`}
                                    />
                                    <div className="min-w-0">
                                      <div className="text-[11px] font-black text-white truncate">
                                        {theme.name}
                                      </div>
                                      <div className="text-[9px] text-slate-400 truncate">
                                        {theme.badge}
                                      </div>
                                    </div>
                                  </div>

                                  {isUnlocked ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        soundEngine.playUiClick(1.06);
                                        onSelectSkyTheme(theme.id);
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-black whitespace-nowrap cursor-pointer ${
                                        isEquipped
                                          ? 'bg-emerald-500/25 border border-emerald-400/60 text-emerald-300'
                                          : 'a2-yellow-btn'
                                      }`}
                                    >
                                      {isEquipped ? 'Đang Dùng' : 'Áp Dụng'}
                                    </button>
                                  ) : canCodexUnlock ? (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        soundEngine.playVictory();
                                        onUnlockSkyTheme?.(theme.id, 'codex');
                                      }}
                                      className="a2-emerald-btn px-2 py-1 rounded-lg text-[10px] font-black whitespace-nowrap cursor-pointer"
                                    >
                                      Mở 0đ (Sổ Tay)
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={!canGemUnlock}
                                      onClick={() => {
                                        soundEngine.playVictory();
                                        onUnlockSkyTheme?.(theme.id, 'gems');
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-black whitespace-nowrap cursor-pointer font-mono-nums ${
                                        canGemUnlock
                                          ? 'a2-purple-btn'
                                          : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                                      }`}
                                      title={
                                        codexReq > 0
                                          ? `Hoặc đạt ${codexReq} điểm Sổ Tay`
                                          : undefined
                                      }
                                    >
                                      {theme.unlockGems} Ngọc
                                    </button>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {/* Wave 13: 3D Lobby Weather Switcher */}
                          {onSelectLobbyWeather && (
                            <div className="mt-2.5 pt-2 border-t border-amber-400/20">
                              <div className="text-[10px] font-black uppercase tracking-wider text-cyan-300 mb-1.5">
                                Thời Tiết 3D Sảnh Chính (Miễn Phí)
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                {LOBBY_WEATHER_DEFS.map((w) => {
                                  const active = activeWeatherId === w.id;
                                  return (
                                    <button
                                      key={w.id}
                                      type="button"
                                      onClick={() => {
                                        soundEngine.playUiClick(1.08);
                                        onSelectLobbyWeather(w.id);
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-black text-left flex items-center gap-1.5 cursor-pointer border transition-colors ${
                                        active
                                          ? 'bg-cyan-500/20 border-cyan-300 text-cyan-100'
                                          : 'bg-[#070b1a] border-slate-800 text-slate-300 hover:border-cyan-400/50'
                                      }`}
                                    >
                                      <span
                                        className={`w-2.5 h-2.5 rounded-full shrink-0 bg-gradient-to-br ${w.swatchClass}`}
                                      />
                                      <span className="truncate">{w.name}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                          {/* Wave 14: 3D Sanctuary Floor Theme Switcher & 360° Orbit Reset */}
                          {onSelectSanctuaryFloor && (
                            <div className="mt-2.5 pt-2 border-t border-amber-400/20">
                              <div className="text-[10px] font-black uppercase tracking-wider text-amber-300 mb-1.5">
                                Đổi Sàn Thần Điện 3D (Real-Time PBR)
                              </div>
                              <div className="grid grid-cols-2 gap-1">
                                {SANCTUARY_FLOOR_DEFS.map((fl) => {
                                  const active = activeSanctuaryFloorId === fl.id;
                                  return (
                                    <button
                                      key={fl.id}
                                      type="button"
                                      onClick={() => {
                                        soundEngine.playUiClick(1.08);
                                        onSelectSanctuaryFloor(fl.id);
                                      }}
                                      className={`px-2 py-1 rounded-lg text-[10px] font-black text-left flex items-center gap-1.5 cursor-pointer border transition-colors ${
                                        active
                                          ? 'bg-amber-500/20 border-amber-300 text-amber-100'
                                          : 'bg-[#070b1a] border-slate-800 text-slate-300 hover:border-amber-400/50'
                                      }`}
                                    >
                                      <span
                                        className={`w-2.5 h-2.5 rounded-full shrink-0 bg-gradient-to-br ${fl.swatchClass}`}
                                      />
                                      <span className="truncate">{fl.name}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="mt-2.5 pt-2 border-t border-amber-400/20 flex flex-wrap items-center gap-1.5">
                            {onResetLobbyOrbit && (
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playUiClick();
                                  onResetLobbyOrbit();
                                }}
                                className="a2-slate-btn px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer whitespace-nowrap"
                              >
                                <RotateCcw className="w-3 h-3 text-sky-300" />
                                <span>Reset 360°</span>
                              </button>
                            )}
                            {onAdjustLobbyZoom && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => onAdjustLobbyZoom(-0.75)}
                                  className="a2-slate-btn px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer"
                                  title="Zoom cận cảnh"
                                >
                                  <ZoomIn className="w-3 h-3 text-sky-300" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onAdjustLobbyZoom(0.75)}
                                  className="a2-slate-btn px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer"
                                  title="Zoom toàn cảnh"
                                >
                                  <ZoomOut className="w-3 h-3 text-sky-300" />
                                </button>
                              </>
                            )}
                            {onReplayEntranceVfx && (
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playAchievement();
                                  onReplayEntranceVfx();
                                }}
                                className="a2-purple-btn px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer whitespace-nowrap ml-auto"
                              >
                                ✨ Xuất Hiện Hoàng Gia
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {onOpenWave14EventCenter && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(1.1);
                      setFeatureDockOpen(false);
                      onOpenWave14EventCenter();
                    }}
                    className="a2-yellow-btn flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap shadow-lg"
                    title="Trung Tâm Sự Kiện Live Wave 14 · 8 Sự Kiện Đang Diễn Ra"
                  >
                    <Megaphone className="w-4 h-4 shrink-0" />
                    <span className="hidden sm:inline">Sự Kiện Live</span>
                    {wave14Badges > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 text-amber-300 font-mono-nums text-[9px] font-black">
                        +{wave14Badges}
                      </span>
                    )}
                  </button>
                )}

                {onOpenFestivalModal && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(1.06);
                      setFeatureDockOpen(false);
                      onOpenFestivalModal();
                    }}
                    className="cel-panel-ornate flex items-center gap-2 px-3 py-2 rounded-xl border-amber-300/65 hover:border-amber-200 text-xs font-black text-amber-100 cursor-pointer whitespace-nowrap"
                  >
                    <Gift className="w-4 h-4 text-amber-300 shrink-0" />
                    <span className="hidden sm:inline">Lễ Hội Tinh Giới</span>
                    {festivalClaimCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black">
                        +{festivalClaimCount}
                      </span>
                    )}
                  </button>
                )}

                {onOpenWave13Carnival && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(1.08);
                      setFeatureDockOpen(false);
                      onOpenWave13Carnival();
                    }}
                    className="cel-panel-ornate flex items-center gap-2 px-3 py-2 rounded-xl border-amber-400/60 hover:border-amber-200 text-xs font-black text-amber-100 cursor-pointer whitespace-nowrap"
                    title="Lộ Trình Quà 7 Ngày & Gói Nạp Đầu 3 Mốc Tiến Hóa x18"
                  >
                    <Crown className="w-4 h-4 text-amber-300 shrink-0" />
                    <span className="hidden sm:inline">Quà 7 Ngày &amp; Nạp Đầu</span>
                    {carnivalClaimCount > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black">
                        +{carnivalClaimCount}
                      </span>
                    )}
                  </button>
                )}
              </div>

              {/* Center Celestial Crest & Compact Combat Telemetry Pill */}
              <div className="text-center mx-auto px-3 py-1.5 rounded-2xl bg-[#060a18]/92 border border-amber-400/30 shadow-lg">
                <div className="flex items-center justify-center gap-2">
                  <span className="font-display text-xs sm:text-sm font-black tracking-[0.16em] text-amber-200">
                    HOÀNG ĐẠO TINH GIỚI
                  </span>
                  {activeDynTitle && (
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-black tracking-wide shadow ${activeDynTitle.borderClass}`}
                    >
                      <Crown className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                      <span className={activeDynTitle.gradientClass}>{activeDynTitle.title}</span>
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2.5 sm:gap-3 text-[10px] sm:text-[11px] font-mono-nums text-slate-200/95 mt-0.5">
                  <span className="flex items-center gap-1">
                    <Sword className="w-3 h-3 text-amber-300" />
                    ATK {stats.attack}
                  </span>
                  <span aria-hidden="true" className="text-amber-400/50">·</span>
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3 text-emerald-300" />
                    HP {stats.maxHp}
                  </span>
                  <span aria-hidden="true" className="text-amber-400/50">·</span>
                  <span>Crit {Math.round(stats.critChance * 100)}%</span>
                </div>
              </div>

              {/* Right-Edge Expandable Feature Dock + Featured Event Banner */}
              <div className="pointer-events-auto flex flex-col items-end gap-2 z-20 shrink-0 relative">
                <div className="flex items-center gap-1.5">
                  {onOpenWave14Ascension && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick(1.1);
                        onOpenWave14Ascension('wings');
                      }}
                      className="a2-yellow-btn flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap shadow-lg"
                      title="Cánh Thần Quang 3D Tiến Hóa · Bàn Cờ Xúc Xắc Tinh Tú 16 Ô · Kho Cổ Vật Hoàng Đạo"
                    >
                      <Feather className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden sm:inline">Cánh 3D &amp; Bàn Cờ</span>
                      {astralBoardClaimCount + skyCitadelClaimCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-950 text-amber-300 font-mono-nums text-[9px] font-black">
                          +{astralBoardClaimCount + skyCitadelClaimCount}
                        </span>
                      )}
                    </button>
                  )}
                  {onOpenWave13Treasury && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick(1.08);
                        onOpenWave13Treasury('steeds');
                      }}
                      className="a2-emerald-btn flex items-center gap-1.5 px-3 py-2 rounded-xl border border-cyan-200/75 text-xs font-black cursor-pointer whitespace-nowrap shadow-lg"
                      title="Thú Cưỡi 3D · Đường Đua Ánh Sao · Hồn Hoàn 3D · Đấu Giá & Hộp Mù"
                    >
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span className="hidden lg:inline">Thú Cưỡi &amp; Hồn Hoàn</span>
                      {starlightRaceClaimCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-950 text-emerald-300 font-mono-nums text-[9px] font-black">
                          +{starlightRaceClaimCount}
                        </span>
                      )}
                    </button>
                  )}
                  {onOpenWave12Sanctum && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onOpenWave12Sanctum('mythic');
                      }}
                      className="a2-purple-btn flex items-center gap-1.5 px-3 py-2 rounded-xl border border-amber-300/75 text-xs font-black text-amber-100 cursor-pointer whitespace-nowrap shadow-lg"
                      title="Thần Binh Thức Tỉnh 3D · Vòng Quay Kho Báu · Tế Đàn & Cờ Hiệu 3D"
                    >
                      <Sword className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span className="hidden xl:inline">Thần Binh &amp; Cờ 3D</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      setFeatureDockOpen((v) => !v);
                    }}
                    aria-expanded={featureDockOpen}
                    className="cel-panel-ornate flex items-center gap-2 px-3 py-2 rounded-xl border-amber-300/60 hover:border-amber-200 text-xs font-black text-amber-100 cursor-pointer whitespace-nowrap shadow-lg"
                  >
                    <LayoutGrid className="w-4 h-4 text-amber-300 shrink-0" />
                    <span className="hidden sm:inline">Kho Tính Năng</span>
                    {dockTotalBadges > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black">
                        +{dockTotalBadges}
                      </span>
                    )}
                    {featureDockOpen ? (
                      <ChevronUp className="w-3.5 h-3.5 text-amber-300" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5 text-amber-300" />
                    )}
                  </button>
                </div>

                {featureDockOpen && (
                  <div className="absolute top-11 right-0 w-72 sm:w-80 cel-panel-ornate rounded-2xl p-3 shadow-2xl z-30 a2-dock-enter">
                    <div className="flex items-center justify-between border-b border-amber-400/20 pb-2 mb-2.5">
                      <span className="font-display text-xs font-black text-amber-200 uppercase tracking-wider">
                        Trung Tâm Tính Năng
                      </span>
                      <button
                        type="button"
                        onClick={() => setFeatureDockOpen(false)}
                        aria-label="Đóng Kho Tính Năng"
                        className="text-slate-300 hover:text-white cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setFeatureDockOpen(false);
                          onOpenRewardsModal(!save.welcomeGiftClaimed ? 'welcome' : 'checkin');
                        }}
                        className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-black text-emerald-200 truncate">
                          <Gift className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                          <span className="truncate">Phúc Lợi</span>
                        </span>
                        {claimableCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-mono-nums text-[9px] font-black">
                            +{claimableCount}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setFeatureDockOpen(false);
                          onOpenNightMarketModal();
                        }}
                        className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-black text-purple-200 truncate">
                          <ShoppingBag className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span className="truncate">Chợ Đêm</span>
                        </span>
                        {spendMilestoneReady > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black">
                            +{spendMilestoneReady}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setFeatureDockOpen(false);
                          onOpenGuildModal();
                        }}
                        className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-black text-amber-100 truncate">
                          <Shield className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span className="truncate">Bang Hội</span>
                        </span>
                        {guild.bossRunsRemaining > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white font-mono-nums text-[9px] font-black">
                            {guild.bossRunsRemaining}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setFeatureDockOpen(false);
                          onOpenDestinyWheelModal();
                        }}
                        className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-black text-sky-200 truncate">
                          <Ticket className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span className="truncate">Vòng Quay</span>
                        </span>
                        {destinyReadyCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black">
                            {destinyReadyCount}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setFeatureDockOpen(false);
                          onOpenForgeSubTab('sockets');
                        }}
                        className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-black text-purple-200 truncate">
                          <Gem className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                          <span className="truncate">Lò Rèn &amp; Khảm</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setFeatureDockOpen(false);
                          onOpenBattlePassModal();
                        }}
                        className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-black text-amber-200 truncate">
                          <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span className="truncate">BP Lv.{bpInfo.level}</span>
                        </span>
                        {bpClaimable > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black">
                            +{bpClaimable}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setFeatureDockOpen(false);
                          onOpenVipModal();
                        }}
                        className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-black text-amber-200 truncate">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span className="truncate">{hasVip ? 'VIP Đặc Quyền' : 'VIP & Quà Đầu'}</span>
                        </span>
                        {(vipDailyReady || !vip.starterPackClaimed) && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black">
                            {vipDailyReady ? 'Nhận' : 'Mới'}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setFeatureDockOpen(false);
                          onOpenConstellationModal();
                        }}
                        className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-black text-sky-200 truncate">
                          <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span className="truncate">12 Chòm Sao</span>
                        </span>
                        <span className="text-[9px] font-mono-nums font-black text-amber-300">
                          {constellationSummary.totalStars}★
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setFeatureDockOpen(false);
                          onOpenShopSection('packs');
                        }}
                        className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-black text-amber-200 truncate">
                          <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span className="truncate">Quỹ &amp; Shop Xu</span>
                        </span>
                        {claimableGfCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black">
                            +{claimableGfCount}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setFeatureDockOpen(false);
                          onOpenAuctionModal();
                        }}
                        className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-black text-amber-200 truncate">
                          <Gavel className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span className="truncate">Sàn Đấu Giá</span>
                        </span>
                        {auctionClaimCount > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black">
                            +{auctionClaimCount}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setFeatureDockOpen(false);
                          onOpenHonorBoard();
                        }}
                        className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-black text-amber-100 truncate">
                          <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span className="truncate">Bảng Vinh Danh</span>
                        </span>
                        <span className="text-[9px] font-mono-nums font-black text-amber-300">
                          #{wbLiveRank}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setFeatureDockOpen(false);
                          onOpenShopSection('privilege');
                        }}
                        className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-black text-sky-200 truncate">
                          <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span className="truncate">Thẻ Tháng &amp; Nạp</span>
                        </span>
                        {wave7RewardBadges > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black">
                            +{wave7RewardBadges}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setFeatureDockOpen(false);
                          onOpenTalentsModal();
                        }}
                        className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-black text-amber-200 truncate">
                          <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span className="truncate">Thiên Phú</span>
                        </span>
                        <span className="text-[9px] font-mono-nums font-black text-amber-300">
                          Lv.{totalTalentLv}
                        </span>
                      </button>

                      {onOpenWardrobe && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            setFeatureDockOpen(false);
                            onOpenWardrobe();
                          }}
                          className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5 text-[11px] font-black text-sky-200 truncate">
                            <Sparkles className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                            <span className="truncate">Thử Đồ 360°</span>
                          </span>
                        </button>
                      )}

                      {onOpenDispatch && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            setFeatureDockOpen(false);
                            onOpenDispatch();
                          }}
                          className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5 text-[11px] font-black text-emerald-200 truncate">
                            <Send className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                            <span className="truncate">Phái Cử AI</span>
                          </span>
                          {dispatchReadyCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black">
                              +{dispatchReadyCount}
                            </span>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setFeatureDockOpen(false);
                          onOpenShopSection('wish_topup');
                        }}
                        className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer col-span-2"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-black text-rose-200 truncate">
                          <Gem className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                          <span className="truncate">Hồ Ước SSR &amp; Nạp X2 Kim Cương</span>
                        </span>
                        {wishMilestonesReady > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black">
                            +{wishMilestonesReady}
                          </span>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setFeatureDockOpen(false);
                          if (onOpenHeroSubTab) {
                            onOpenHeroSubTab('artifacts');
                          } else {
                            onTabChange('heroes');
                          }
                        }}
                        className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-black text-amber-200 truncate">
                          <ArtifactRelicIcon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Thánh Khí 3D</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setFeatureDockOpen(false);
                          onOpenShopSection('mystic_exchange');
                        }}
                        className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-black text-cyan-200 truncate">
                          <MysticTokenIcon className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Chợ Mảnh Dư</span>
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setFeatureDockOpen(false);
                          if (onOpenHeroSubTab) {
                            onOpenHeroSubTab('halos');
                          } else {
                            onTabChange('heroes');
                          }
                        }}
                        className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-black text-amber-200 truncate">
                          <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span className="truncate">Hào Quang 3D</span>
                        </span>
                        <span className="text-[9px] font-mono-nums font-black text-amber-300">
                          {save.divineCrystals ?? 0} TT
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setFeatureDockOpen(false);
                          onOpenShopSection('chain_bank');
                        }}
                        className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-black text-emerald-200 truncate">
                          <Gift className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                          <span className="truncate">Chuỗi Quà &amp; Két</span>
                        </span>
                        {(freeChainStepReady || vaultClaimCount > 0) && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black">
                            {freeChainStepReady ? '0Đ' : `+${vaultClaimCount}`}
                          </span>
                        )}
                      </button>

                      {onOpenFestivalModal && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            setFeatureDockOpen(false);
                            onOpenFestivalModal();
                          }}
                          className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5 text-[11px] font-black text-amber-200 truncate">
                            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            <span className="truncate">Lễ Hội Tinh Giới</span>
                          </span>
                          {festivalClaimCount > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black">
                              +{festivalClaimCount}
                            </span>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setFeatureDockOpen(false);
                          onOpenProfileModal('codex');
                        }}
                        className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                      >
                        <span className="flex items-center gap-1.5 text-[11px] font-black text-sky-200 truncate">
                          <BookOpen className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                          <span className="truncate">Sổ Tay Buff</span>
                        </span>
                        {codexClaimCount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black">
                            +{codexClaimCount}
                          </span>
                        ) : (
                          <span className="text-[9px] font-mono-nums font-black text-amber-300">
                            H.{codexSummary.currentRank.rank}
                          </span>
                        )}
                      </button>

                      {onOpenWave12Sanctum && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              setFeatureDockOpen(false);
                              onOpenWave12Sanctum('mythic');
                            }}
                            className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5 text-[11px] font-black text-amber-200 truncate">
                              <Sword className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                              <span className="truncate">Thần Binh 3D</span>
                            </span>
                            <span className="text-[9px] font-mono-nums font-black text-yellow-300">
                              B.{save.mythicWeapon?.tier ?? 0}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              setFeatureDockOpen(false);
                              onOpenWave12Sanctum('wheel');
                            }}
                            className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5 text-[11px] font-black text-rose-200 truncate">
                              <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                              <span className="truncate">Quay Kho Báu</span>
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              setFeatureDockOpen(false);
                              onOpenWave12Sanctum('altar');
                            }}
                            className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5 text-[11px] font-black text-orange-200 truncate">
                              <Flag className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              <span className="truncate">Tế Đàn &amp; Cờ 3D</span>
                            </span>
                          </button>
                        </>
                      )}

                      {onOpenWave13Treasury && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              setFeatureDockOpen(false);
                              onOpenWave13Treasury('steeds');
                            }}
                            className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-cyan-300 cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5 text-[11px] font-black text-cyan-200 truncate">
                              <Sparkles className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                              <span className="truncate">Thú Cưỡi &amp; Đua</span>
                            </span>
                            {starlightRaceClaimCount > 0 && (
                              <span className="px-1 py-0.5 rounded bg-emerald-400 text-slate-950 text-[9px] font-black font-mono-nums">
                                +{starlightRaceClaimCount}
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              setFeatureDockOpen(false);
                              onOpenWave13Treasury('soul_rings');
                            }}
                            className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-purple-300 cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5 text-[11px] font-black text-purple-200 truncate">
                              <Gem className="w-3.5 h-3.5 text-purple-300 shrink-0" />
                              <span className="truncate">Hồn Hoàn 3D</span>
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              setFeatureDockOpen(false);
                              onOpenWave13Treasury('royal_vault');
                            }}
                            className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5 text-[11px] font-black text-amber-200 truncate">
                              <Gift className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                              <span className="truncate">Đấu Giá &amp; Hộp Mù</span>
                            </span>
                          </button>
                        </>
                      )}

                      {onOpenWave14Ascension && (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              setFeatureDockOpen(false);
                              onOpenWave14Ascension('wings');
                            }}
                            className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-sky-300 cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5 text-[11px] font-black text-sky-200 truncate">
                              <Feather className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                              <span className="truncate">Cánh Thần 3D</span>
                            </span>
                            {skyCitadelClaimCount > 0 && (
                              <span className="px-1 py-0.5 rounded bg-emerald-400 text-slate-950 text-[9px] font-black font-mono-nums">
                                +{skyCitadelClaimCount}
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              setFeatureDockOpen(false);
                              onOpenWave14Ascension('board');
                            }}
                            className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5 text-[11px] font-black text-amber-200 truncate">
                              <Dice5 className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                              <span className="truncate">Bàn Cờ Tinh Tú</span>
                            </span>
                            {astralBoardClaimCount > 0 && (
                              <span className="px-1 py-0.5 rounded bg-emerald-400 text-slate-950 text-[9px] font-black font-mono-nums">
                                +{astralBoardClaimCount}
                              </span>
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              setFeatureDockOpen(false);
                              onOpenWave14Ascension('relics');
                            }}
                            className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-violet-300 cursor-pointer"
                          >
                            <span className="flex items-center gap-1.5 text-[11px] font-black text-violet-200 truncate">
                              <Crown className="w-3.5 h-3.5 text-violet-300 shrink-0" />
                              <span className="truncate">Cổ Vật &amp; Danh Hiệu</span>
                            </span>
                          </button>
                        </>
                      )}

                      {onOpenWave14EventCenter && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            setFeatureDockOpen(false);
                            onOpenWave14EventCenter();
                          }}
                          className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5 text-[11px] font-black text-amber-200 truncate">
                            <Megaphone className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            <span className="truncate">Sự Kiện Live</span>
                          </span>
                        </button>
                      )}

                      {onOpenWave13Carnival && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            setFeatureDockOpen(false);
                            onOpenWave13Carnival();
                          }}
                          className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5 text-[11px] font-black text-yellow-200 truncate">
                            <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            <span className="truncate">Quà 7 Ngày</span>
                          </span>
                          {carnivalClaimCount > 0 && (
                            <span className="px-1 py-0.5 rounded bg-emerald-400 text-slate-950 text-[9px] font-black font-mono-nums">
                              +{carnivalClaimCount}
                            </span>
                          )}
                        </button>
                      )}

                      {onOpenCpBreakdown && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            setFeatureDockOpen(false);
                            onOpenCpBreakdown();
                          }}
                          className="cel-panel px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 hover:border-amber-300 cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5 text-[11px] font-black text-sky-200 truncate">
                            <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            <span className="truncate">Phân Tích LC</span>
                          </span>
                        </button>
                      )}

                      {onOpenClaimAllModal && claimAllPreview.totalClaimableCount > 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            setFeatureDockOpen(false);
                            onOpenClaimAllModal();
                          }}
                          className="a2-yellow-btn px-2.5 py-2 rounded-xl text-left flex items-center justify-between gap-1.5 cursor-pointer col-span-2"
                        >
                          <span className="flex items-center gap-1.5 text-[11px] font-black truncate">
                            <Gift className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">Nhận Nhanh Toàn Bộ Quà Sảnh</span>
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-950 text-amber-300 font-mono-nums text-[9px] font-black">
                            +{claimAllPreview.totalClaimableCount}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Rotating Featured Live-Ops Event Banner with Zodiac Art */}
                <div className="hidden md:flex flex-col w-56 cel-panel-ornate rounded-2xl overflow-hidden text-left">
                  <div className="relative h-20 w-full bg-[#0b1229]">
                    {!eventImgFailed ? (
                      <img
                        src={
                          activeEvent.target === 'festival'
                            ? celestialFestivalArt
                            : activeEvent.target === 'championship_3round'
                            ? championshipTrophyArt
                            : eventZodiacBanner
                        }
                        alt={activeEvent.title}
                        referrerPolicy="no-referrer"
                        onError={() => setEventImgFailed(true)}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-amber-500/20 to-purple-500/25 flex items-center justify-center">
                        <Crown className="w-7 h-7 text-amber-300" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#090d1f] via-[#090d1f]/20 to-transparent" />
                    <div className="absolute top-2 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
                      <span className="px-1.5 py-0.5 rounded bg-[#070b18]/92 border border-amber-400/45 text-[8px] font-black tracking-wider text-amber-300 truncate max-w-[125px] whitespace-nowrap">
                        {activeEvent.badge}
                      </span>
                      <div className="flex items-center gap-1 bg-[#070b18]/92 border border-amber-400/35 rounded px-1 py-0.5 shrink-0">
                        <button
                          type="button"
                          aria-label="Sự kiện trước"
                          onClick={() =>
                            setEventIdx((v) => (v - 1 + EVENT_BANNERS.length) % EVENT_BANNERS.length)
                          }
                          className="text-slate-300 hover:text-amber-300 cursor-pointer"
                        >
                          <ChevronLeft className="w-2.5 h-2.5" />
                        </button>
                        <span className="text-[8px] font-mono-nums font-black text-amber-200">
                          {eventIdx + 1}/{EVENT_BANNERS.length}
                        </span>
                        <button
                          type="button"
                          aria-label="Sự kiện tiếp theo"
                          onClick={() => setEventIdx((v) => (v + 1) % EVENT_BANNERS.length)}
                          className="text-slate-300 hover:text-amber-300 cursor-pointer"
                        >
                          <ChevronRight className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 pt-1.5 flex flex-col gap-1.5">
                    <div className="font-display text-xs font-black text-white leading-snug">
                      {activeEvent.title}
                    </div>
                    <p className="text-[10px] text-slate-300 leading-snug line-clamp-2">
                      {activeEvent.subtitle}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick(1.05);
                        if (activeEvent.target === 'festival') {
                          onOpenFestivalModal?.();
                        } else if (activeEvent.target === 'championship_3round') {
                          onGameModeChange('championship_3round');
                        } else if (activeEvent.target === 'spirit_evolution') {
                          if (onOpenHeroSubTab) onOpenHeroSubTab('pets');
                          else onTabChange('heroes');
                        } else if (activeEvent.target === 'chain_bank') {
                          onOpenShopSection('chain_bank');
                        } else if (activeEvent.target === 'divine_halo') {
                          if (onOpenHeroSubTab) onOpenHeroSubTab('halos');
                          else onTabChange('heroes');
                        } else if (activeEvent.target === 'pantheon_expedition') {
                          onGameModeChange('pantheon_expedition');
                        } else if (activeEvent.target === 'mythic_artifact') {
                          if (onOpenHeroSubTab) onOpenHeroSubTab('artifacts');
                          else onTabChange('heroes');
                        } else if (activeEvent.target === 'abyssal_gauntlet') {
                          onGameModeChange('abyssal_gauntlet');
                        } else if (activeEvent.target === 'guild_war') {
                          onGameModeChange('guild_war');
                        } else if (activeEvent.target === 'mystic_exchange') {
                          onOpenShopSection('mystic_exchange');
                        } else if (activeEvent.target === 'blood_moon') onGameModeChange('blood_moon');
                        else if (activeEvent.target === 'wish_pool') onOpenShopSection('wish_topup');
                        else if (activeEvent.target === 'wardrobe') onOpenWardrobe?.();
                        else if (activeEvent.target === 'dispatch') onOpenDispatch?.();
                        else if (activeEvent.target === 'world_boss') onGameModeChange('world_boss');
                        else if (activeEvent.target === 'crystal_defense') onGameModeChange('crystal_defense');
                        else if (activeEvent.target === 'auction_house') onOpenAuctionModal();
                        else if (activeEvent.target === 'constellation') onOpenConstellationModal();
                        else if (activeEvent.target === 'coop_raid') onGameModeChange('coop_raid');
                        else if (activeEvent.target === 'elemental_tower') onGameModeChange('elemental_tower');
                        else if (activeEvent.target === 'night_market') onOpenNightMarketModal();
                        else if (activeEvent.target === 'arena') onOpenArenaModal();
                        else if (activeEvent.target === 'destiny_wheel') onOpenDestinyWheelModal();
                        else if (activeEvent.target === 'guild') onOpenGuildModal();
                        else if (activeEvent.target === 'shop') onOpenShopSection('packs');
                        else if (activeEvent.target === 'battlepass') onOpenBattlePassModal();
                        else if (activeEvent.target === 'vip') onOpenVipModal();
                        else if (activeEvent.target === 'daily_rift') onGameModeChange('daily_rift');
                        else if (activeEvent.target === 'boss_rush') onGameModeChange('boss_rush');
                        else onGameModeChange('tower');
                      }}
                      className="a2-slate-btn mt-0.5 py-1.5 px-2.5 rounded-lg text-[10px] font-black text-amber-200 flex items-center justify-between cursor-pointer whitespace-nowrap"
                    >
                      <span>{activeEvent.ctaLabel}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom-Docked Chapter / Tower Console */}
            <div className="mt-auto w-full max-w-2xl mx-auto flex flex-col gap-1.5 pointer-events-auto relative z-10">
              {/* Commercial Highlight & Quick-Claim Ribbon */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(1.06);
                    onOpenShopSection('chain_bank');
                  }}
                  className={`cel-panel rounded-xl px-2.5 py-1 border flex items-center justify-between gap-1.5 cursor-pointer transition-colors ${
                    freeChainStepReady
                      ? 'border-emerald-400/70 bg-[#071a18]/95 hover:border-emerald-300'
                      : 'border-amber-400/35 bg-[#080f24]/95 hover:border-amber-300'
                  }`}
                >
                  <div className="min-w-0 text-left">
                    <div className="text-[10px] font-black text-amber-200 truncate">
                      Chuỗi Quà Liên Hoàn
                    </div>
                    <div className="text-[9px] font-mono-nums font-bold text-slate-300 truncate">
                      Bước {Math.min(5, stepUpChain.currentStep)}/5 · Vòng {stepUpChain.cycleCount + 1}
                    </div>
                  </div>
                  {freeChainStepReady && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[8px] font-black shrink-0">
                      0Đ
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(1.06);
                    onOpenShopSection('chain_bank');
                  }}
                  className={`cel-panel rounded-xl px-2.5 py-1 border flex items-center justify-between gap-1.5 cursor-pointer transition-colors ${
                    gemVault.storedGems >= GEM_VAULT_CLAIM_THRESHOLD
                      ? 'border-purple-400/70 bg-[#140a28]/95 hover:border-purple-300'
                      : 'border-purple-400/35 bg-[#080f24]/95 hover:border-purple-300'
                  }`}
                >
                  <div className="min-w-0 text-left">
                    <div className="text-[10px] font-black text-purple-200 truncate">
                      Két Tinh Ngân
                    </div>
                    <div className="text-[9px] font-mono-nums font-bold text-amber-300 truncate">
                      {gemVault.storedGems}/{GEM_VAULT_CAPACITY} Ngọc
                    </div>
                  </div>
                  {vaultClaimCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-amber-300 text-slate-950 font-mono-nums text-[8px] font-black shrink-0">
                      MỞ
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(1.06);
                    if (onOpenHeroSubTab) onOpenHeroSubTab('halos');
                    else onTabChange('heroes');
                  }}
                  className="cel-panel rounded-xl px-2.5 py-1 border border-amber-400/40 bg-[#080f24]/95 hover:border-amber-300 flex items-center justify-between gap-1.5 cursor-pointer transition-colors"
                >
                  <div className="min-w-0 text-left">
                    <div className="text-[10px] font-black text-amber-200 truncate">
                      Hào Quang 3D
                    </div>
                    <div className="text-[9px] font-mono-nums font-bold text-sky-300 truncate">
                      {(save.unlockedHalos ?? []).length}/{DIVINE_HALO_CATALOG.length} · {save.divineCrystals ?? 0} TT
                    </div>
                  </div>
                  <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                </button>
              </div>

              {/* Smart Power-Up Advisor Strip */}
              <div className="cel-panel rounded-xl px-3 py-1 border border-emerald-400/35 flex items-center justify-between gap-2.5 bg-[#080f24]/95">
                <div className="min-w-0 flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-[9px] font-mono-nums font-black text-emerald-300 shrink-0">
                    {powerRec.estGainLabel}
                  </span>
                  <div className="min-w-0">
                    <div className="text-[11px] font-black text-amber-100 truncate">
                      {powerRec.title}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(1.08);
                    onPowerAdvisorAction?.(powerRec.actionKind);
                  }}
                  className="a2-emerald-btn px-2.5 py-0.5 rounded-lg text-[10px] font-black shrink-0 whitespace-nowrap cursor-pointer"
                >
                  {powerRec.ctaLabel}
                </button>
              </div>

              {chapterPickerOpen && (
                <div className="cel-panel-ornate rounded-2xl p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-display text-xs font-black text-amber-200 uppercase tracking-wider">
                      Bản Đồ 12 Chương Hoàng Đạo
                    </span>
                    <button
                      type="button"
                      onClick={() => setChapterPickerOpen(false)}
                      className="text-xs font-bold text-slate-300 hover:text-white cursor-pointer"
                    >
                      Thu gọn
                    </button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-40 overflow-y-auto a2-scroll">
                    {CHAPTERS.map((ch) => {
                      const unlocked = ch.id <= save.highestChapterCleared + 1;
                      const active = ch.id === selectedChapterId;
                      return (
                        <button
                          key={ch.id}
                          type="button"
                          onClick={() => {
                            onSelectChapter(ch.id);
                            setChapterPickerOpen(false);
                          }}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center justify-between gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                            active
                              ? 'a2-yellow-btn'
                              : unlocked
                              ? 'bg-[#121c3e] hover:bg-[#1a2858] border border-amber-400/25 text-slate-100'
                              : 'bg-[#080c1c] border border-slate-800 text-slate-500'
                          }`}
                        >
                          <span className="truncate">
                            {ch.zodiacIcon} C.{ch.id}
                          </span>
                          {!unlocked && <Lock className="w-3 h-3 shrink-0 opacity-70" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="cel-panel-ornate rounded-2xl p-2.5 sm:p-3">
                {/* 12-Mode Selector Grid (2 compact rows on desktop) */}
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 bg-[#060914] border border-amber-400/25 rounded-xl p-1 mb-2">
                  <button
                    type="button"
                    onClick={() => onGameModeChange('chapter')}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition-colors ${
                      gameMode === 'chapter'
                        ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Swords className="w-3 h-3 shrink-0" />
                    <span>Thử Thách</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChapterPickerOpen(false);
                      onGameModeChange('tower');
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition-colors ${
                      gameMode === 'tower'
                        ? 'bg-gradient-to-b from-purple-400 to-purple-700 text-white shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Compass className="w-3 h-3 shrink-0" />
                    <span>Tháp Vô Tận</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChapterPickerOpen(false);
                      onGameModeChange('elemental_tower');
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition-colors ${
                      gameMode === 'elemental_tower'
                        ? 'bg-gradient-to-b from-sky-400 to-blue-600 text-slate-950 shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Zap className="w-3 h-3 shrink-0" />
                    <span>Tháp Hệ</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChapterPickerOpen(false);
                      onGameModeChange('boss_rush');
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition-colors ${
                      gameMode === 'boss_rush'
                        ? 'bg-gradient-to-b from-rose-400 to-rose-700 text-white shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Flame className="w-3 h-3 shrink-0" />
                    <span>Săn Boss</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChapterPickerOpen(false);
                      onGameModeChange('daily_rift');
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition-colors ${
                      gameMode === 'daily_rift'
                        ? 'bg-gradient-to-b from-emerald-400 to-teal-600 text-slate-950 shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3 h-3 shrink-0" />
                    <span>Bí Cảnh</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChapterPickerOpen(false);
                      onGameModeChange('coop_raid');
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition-colors ${
                      gameMode === 'coop_raid'
                        ? 'bg-gradient-to-b from-amber-400 via-orange-500 to-rose-600 text-white shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Users className="w-3 h-3 shrink-0" />
                    <span>Co-op AI</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChapterPickerOpen(false);
                      onGameModeChange('crystal_defense');
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition-colors ${
                      gameMode === 'crystal_defense'
                        ? 'bg-gradient-to-b from-cyan-400 to-indigo-600 text-slate-950 shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Gem className="w-3 h-3 shrink-0" />
                    <span>Thủ Pha Lê</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChapterPickerOpen(false);
                      onGameModeChange('world_boss');
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition-colors ${
                      gameMode === 'world_boss'
                        ? 'bg-gradient-to-b from-yellow-300 via-amber-500 to-rose-600 text-slate-950 shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Trophy className="w-3 h-3 shrink-0" />
                    <span>Boss Thế Giới</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChapterPickerOpen(false);
                      onGameModeChange('blood_moon');
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition-colors ${
                      gameMode === 'blood_moon'
                        ? 'bg-gradient-to-b from-rose-500 via-red-600 to-purple-800 text-white shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Moon className="w-3 h-3 shrink-0" />
                    <span>Trăng Máu</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChapterPickerOpen(false);
                      onGameModeChange('abyssal_gauntlet');
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition-colors ${
                      gameMode === 'abyssal_gauntlet'
                        ? 'bg-gradient-to-b from-purple-500 via-fuchsia-600 to-indigo-800 text-white shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Skull className="w-3 h-3 shrink-0" />
                    <span>Hố Sâu 3D</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChapterPickerOpen(false);
                      onGameModeChange('guild_war');
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition-colors ${
                      gameMode === 'guild_war'
                        ? 'bg-gradient-to-b from-emerald-400 via-teal-500 to-cyan-700 text-slate-950 shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Shield className="w-3 h-3 shrink-0" />
                    <span>Chiến Bang</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChapterPickerOpen(false);
                      onGameModeChange('pantheon_expedition');
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition-colors ${
                      gameMode === 'pantheon_expedition'
                        ? 'bg-gradient-to-b from-amber-300 via-yellow-400 to-amber-600 text-slate-950 shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Crown className="w-3 h-3 shrink-0" />
                    <span>Điện Thần 3D</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChapterPickerOpen(false);
                      onGameModeChange('championship_3round');
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition-colors ${
                      gameMode === 'championship_3round'
                        ? 'bg-gradient-to-b from-amber-200 via-amber-400 to-rose-500 text-slate-950 shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Trophy className="w-3 h-3 shrink-0" />
                    <span>Quán Quân 3H</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChapterPickerOpen(false);
                      onGameModeChange('crystal_vault');
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition-colors ${
                      gameMode === 'crystal_vault'
                        ? 'bg-gradient-to-b from-yellow-200 via-amber-400 to-cyan-400 text-slate-950 shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Gem className="w-3 h-3 shrink-0" />
                    <span>Hầm Mỏ 3D</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChapterPickerOpen(false);
                      onGameModeChange('dragon_lair');
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition-colors ${
                      gameMode === 'dragon_lair'
                        ? 'bg-gradient-to-b from-rose-300 via-orange-400 to-amber-400 text-slate-950 shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Flame className="w-3 h-3 shrink-0" />
                    <span>Rồng Cổ 3D</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChapterPickerOpen(false);
                      onGameModeChange('sky_citadel');
                    }}
                    className={`py-1.5 px-1.5 rounded-lg text-[10px] sm:text-[11px] font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer transition-colors ${
                      gameMode === 'sky_citadel'
                        ? 'bg-gradient-to-b from-sky-200 via-cyan-300 to-amber-300 text-slate-950 shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Feather className="w-3 h-3 shrink-0" />
                    <span>Không Chiến 3D</span>
                  </button>
                </div>

                {gameMode === 'chapter' ? (
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        disabled={selectedChapterId <= 1}
                        onClick={() => handleStepChapter(-1)}
                        aria-label="Chương trước"
                        className="cel-panel w-9 h-9 rounded-xl flex items-center justify-center text-slate-200 hover:border-amber-300 disabled:opacity-30 cursor-pointer shrink-0"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <div className="flex-1 min-w-0 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-base">{selectedChapter.zodiacIcon}</span>
                          <h2 className="font-display text-base sm:text-lg font-black text-white truncate">
                            {selectedChapter.name}
                          </h2>
                        </div>
                        <p className="text-[11px] text-slate-300 truncate mt-0.5">
                          {selectedChapter.subtitle}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={selectedChapterId >= CHAPTERS.length}
                        onClick={() => handleStepChapter(1)}
                        aria-label="Chương tiếp theo"
                        className="cel-panel w-9 h-9 rounded-xl flex items-center justify-center text-slate-200 hover:border-amber-300 disabled:opacity-30 cursor-pointer shrink-0"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-nums border-y border-amber-400/15 py-1.5 px-1">
                      <span className="text-amber-300 font-bold">
                        Kỷ lục {bestStage}/{selectedChapter.stages.length} phòng
                      </span>
                      <span className="text-rose-300 font-bold">
                        Trùm: {selectedChapter.bossName}
                      </span>
                      <span
                        className={`font-bold ${
                          powerMet ? 'text-emerald-300' : 'text-orange-300'
                        }`}
                      >
                        Đề xuất LC {selectedChapter.recommendedPower}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap sm:flex-nowrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setChapterPickerOpen((v) => !v)}
                        className="a2-slate-btn px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <Map className="w-4 h-4 text-amber-300 shrink-0" />
                        <span>12 Chương</span>
                      </button>

                      {isChapterCleared && (
                        <button
                          type="button"
                          disabled={dailySweeps.remaining <= 0}
                          onClick={() => onQuickSweepChapter(selectedChapter.id)}
                          className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                            dailySweeps.remaining > 0
                              ? 'a2-emerald-btn'
                              : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5 shrink-0" />
                          <span className="font-mono-nums">
                            Quét Nhanh ({dailySweeps.remaining}/{maxSweeps})
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        data-start="true"
                        disabled={!isChapterUnlocked}
                        onClick={onStartTrial}
                        className={`flex-1 py-2 px-4 rounded-xl font-display font-black text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                          isChapterUnlocked
                            ? 'a2-yellow-btn'
                            : 'bg-slate-900 border border-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {isChapterUnlocked ? (
                          <>
                            <span>CHIẾN ĐẤU</span>
                            <ChevronRight className="w-5 h-5" />
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4" />
                            <span>Thắng Chương {selectedChapter.id - 1} Để Mở</span>
                          </>
                        )}
                      </button>
                    </div>
                  </>
                ) : gameMode === 'tower' ? (
                  <>
                    <div className="text-center">
                      <h2 className="font-display text-base sm:text-lg font-black text-purple-200">
                        Tháp Vô Tận Hoàng Đạo
                      </h2>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Leo tầng bất tận xoay vòng 12 Tinh Giới · Đánh Boss mỗi 3 tầng nhận Vàng &amp; Ngọc Hồn.
                      </p>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-nums border-y border-purple-400/20 py-2 px-1">
                      <span className="text-amber-300 font-bold">
                        Kỷ lục: Tầng {save.bestTowerFloor ?? 0}
                      </span>
                      <span className="text-purple-300 font-bold">
                        Boss: Tầng 3, 6, 9...
                      </span>
                      <span className="text-emerald-300 font-bold">
                        LC hiện tại {stats.powerRating}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={onOpenTalentsModal}
                        className="a2-slate-btn px-3.5 py-3 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                        <span>Thiên Phú</span>
                      </button>

                      <button
                        type="button"
                        onClick={onStartTower}
                        className="a2-purple-btn flex-1 py-3 px-5 rounded-xl font-display font-black text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                      >
                        <span>LEO THÁP VÔ TẬN</span>
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : gameMode === 'boss_rush' ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-14 rounded-xl overflow-hidden border border-rose-400/45 bg-[#090d1f] shrink-0">
                        {!bossArenaImgFailed ? (
                          <img
                            src={bossArenaArt}
                            alt="Đấu Trường Săn Boss"
                            referrerPolicy="no-referrer"
                            onError={() => setBossArenaImgFailed(true)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Skull className="w-6 h-6 text-rose-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 text-left">
                        <h2 className="font-display text-base sm:text-lg font-black text-rose-200 truncate">
                          Săn Boss Liên Hoàn (5 Vòng)
                        </h2>
                        <p className="text-[11px] text-slate-300 leading-snug mt-0.5">
                          Đối đầu liên tiếp các Thủ Lĩnh Hoàng Đạo (Vòng 4 song Boss) · Phần thưởng cực lớn Ngọc Hồn.
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-nums border-y border-rose-400/20 py-2 px-1">
                      <span className="text-amber-300 font-bold">
                        Kỷ lục: Vòng {save.bestBossRushRound ?? 0}/5
                      </span>
                      <span className="text-purple-300 font-bold">
                        Rơi Ngọc Hồn mỗi vòng
                      </span>
                      <span className="text-emerald-300 font-bold">
                        LC hiện tại {stats.powerRating}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => onOpenProfileModal('history')}
                        className="a2-slate-btn px-3.5 py-3 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <History className="w-4 h-4 text-amber-300 shrink-0" />
                        <span>Vinh Danh</span>
                      </button>

                      <button
                        type="button"
                        onClick={onStartBossRush}
                        className="flex-1 py-3 px-5 rounded-xl font-display font-black text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer bg-gradient-to-b from-rose-400 via-rose-500 to-rose-700 text-white border border-rose-200/70 shadow-lg"
                      >
                        <span>VÀO SĂN BOSS</span>
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : gameMode === 'elemental_tower' ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-14 rounded-xl overflow-hidden border border-sky-400/45 bg-[#090d1f] shrink-0">
                        {!towerElImgFailed ? (
                          <img
                            src={elementalTrialsArt}
                            alt={activeElTower.name}
                            referrerPolicy="no-referrer"
                            onError={() => setTowerElImgFailed(true)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Zap className="w-6 h-6 text-sky-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 text-left flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className={`font-display text-sm sm:text-base font-black truncate ${activeElTower.accentTextClass}`}>
                            {activeElTower.name}
                          </h2>
                          <span className="font-mono-nums text-[10px] font-black text-amber-300 shrink-0">
                            Kỷ lục: Tầng {elementalTowers[activeElTower.id] ?? 0}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug mt-0.5 line-clamp-1">
                          {activeElTower.ruleDesc}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                      {ELEMENTAL_TOWERS.map((t) => {
                        const isSel = t.id === activeElTower.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              onSelectElementalTower(t.id);
                            }}
                            className={`px-2 py-1.5 rounded-xl border text-[11px] font-black flex items-center justify-between cursor-pointer ${
                              isSel
                                ? `${t.btnClass} shadow`
                                : 'bg-[#070b1a] border-slate-800 text-slate-300 hover:border-amber-300/60'
                            }`}
                          >
                            <span>Hệ {t.shortName}</span>
                            <span className="font-mono-nums text-[10px] opacity-90">
                              T.{elementalTowers[t.id] ?? 0}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2 flex items-center justify-between text-[10px] text-sky-200 font-semibold px-1">
                      <span className="truncate">{activeElTower.synergyDesc}</span>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onOpenConstellationModal();
                        }}
                        className="a2-slate-btn px-3.5 py-3 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                        <span>12 Chòm Sao</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onStartElementalTower(activeElTower.id)}
                        className={`flex-1 py-3 px-5 rounded-xl font-display font-black text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${activeElTower.btnClass}`}
                      >
                        <span>CHINH PHỤC THÁP HỆ</span>
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : gameMode === 'coop_raid' ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-14 rounded-xl overflow-hidden border border-amber-400/50 bg-[#090d1f] shrink-0">
                        {!coopImgFailed ? (
                          <img
                            src={coopRaidArt}
                            alt="Phó Bản Hợp Tác 3D"
                            referrerPolicy="no-referrer"
                            onError={() => setCoopImgFailed(true)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Users className="w-6 h-6 text-amber-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 text-left flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="font-display text-sm sm:text-base font-black text-amber-200 truncate">
                            Phó Bản Hợp Tác 3D · 2 Đồng Hành AI
                          </h2>
                          <span className="font-mono-nums text-[10px] font-black text-emerald-300 shrink-0">
                            Thưởng chính: {coopState.dailyRewardsLeft}/{COOP_RAID_MAX_DAILY_REWARDS}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug mt-0.5 line-clamp-1">
                          Tổ đội cùng <strong className="text-sky-300">{coopAllies[0].name}</strong> &amp;{' '}
                          <strong className="text-purple-300">{coopAllies[1].name}</strong> săn Boss Liên Giới!
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 grid grid-cols-3 gap-1.5">
                      {COOP_RAID_DIFFICULTIES.map((diff) => {
                        const isSel = diff.id === activeCoopDiff.id;
                        return (
                          <button
                            key={diff.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              onSelectCoopDifficulty(diff.id);
                            }}
                            className={`px-2 py-1.5 rounded-xl border text-[10px] font-black text-center cursor-pointer ${
                              isSel
                                ? 'a2-yellow-btn'
                                : 'bg-[#070b1a] border-slate-800 text-slate-300 hover:border-amber-300/60'
                            }`}
                          >
                            <div className="truncate">
                              {diff.id === 'normal' ? 'Thường' : diff.id === 'heroic' ? 'Anh Hùng' : 'Thần Thoại'}
                            </div>
                            <div className="font-mono-nums text-[9px] opacity-85">
                              Đề xuất {diff.recommendedPower} LC
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono-nums text-amber-200 px-1">
                      <span>Thưởng: +{activeCoopDiff.rewardGold} Vàng · +{activeCoopDiff.rewardGems} Ngọc</span>
                      <span className="text-purple-300 font-bold">
                        +{activeCoopDiff.rewardStarDust} Bụi · Bảo Thạch Cấp {activeCoopDiff.socketGemTier}
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onOpenForgeSubTab('sockets');
                        }}
                        className="a2-slate-btn px-3.5 py-3 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <Gem className="w-4 h-4 text-purple-300 shrink-0" />
                        <span>Bảo Thạch</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onStartCoopRaid(activeCoopDiff.id)}
                        className="flex-1 py-3 px-5 rounded-xl font-display font-black text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer bg-gradient-to-b from-amber-300 via-orange-400 to-rose-600 text-slate-950 border border-amber-100/80 shadow-lg"
                      >
                        <span>VÀO PHÓ BẢN CO-OP</span>
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : gameMode === 'crystal_defense' ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-14 rounded-xl overflow-hidden border border-cyan-400/50 bg-[#090d1f] shrink-0">
                        {!crystalDefenseImgFailed ? (
                          <img
                            src={crystalDefenseArt}
                            alt="Thủ Thành Pha Lê Tinh Linh 3D"
                            referrerPolicy="no-referrer"
                            onError={() => setCrystalDefenseImgFailed(true)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Gem className="w-6 h-6 text-cyan-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 text-left flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="font-display text-sm sm:text-base font-black text-cyan-200 truncate">
                            Thủ Thành Pha Lê Tinh Linh 3D
                          </h2>
                          <span className="font-mono-nums text-[10px] font-black text-amber-300 shrink-0">
                            {crystalState.runsRemaining}/{crystalMaxRuns} lượt
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug mt-0.5 line-clamp-1">
                          Bảo vệ Pha Lê trung tâm qua {CRYSTAL_DEFENSE_TOTAL_WAVES} đợt quái để săn Lông Vũ nâng Cánh 3D!
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-nums border-y border-cyan-400/20 py-2 px-1">
                      <span className="text-cyan-300 font-bold">
                        Kỷ lục: Đợt {crystalState.bestWave}/{CRYSTAL_DEFENSE_TOTAL_WAVES}
                      </span>
                      <span className="text-emerald-300 font-bold">
                        Toàn thắng: {crystalState.totalClears} lần
                      </span>
                      <span className="flex items-center gap-1 text-sky-200 font-bold">
                        <WingFeatherIcon className="w-3.5 h-3.5" /> Rơi Lông Vũ + Bụi
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onTabChange('heroes');
                        }}
                        className="a2-slate-btn px-3.5 py-3 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <WingFeatherIcon className="w-4 h-4 shrink-0" />
                        <span>Cánh 3D</span>
                      </button>

                      <button
                        type="button"
                        disabled={crystalState.runsRemaining <= 0}
                        onClick={onStartCrystalDefense}
                        className={`flex-1 py-3 px-5 rounded-xl font-display font-black text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                          crystalState.runsRemaining > 0
                            ? 'bg-gradient-to-b from-cyan-300 via-sky-400 to-indigo-600 text-slate-950 border border-cyan-100/80 shadow-lg'
                            : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <span>
                          {crystalState.runsRemaining > 0
                            ? 'VÀO THỦ THÀNH PHA LÊ'
                            : 'Đã Hết Lượt Hôm Nay'}
                        </span>
                        {crystalState.runsRemaining > 0 && <ChevronRight className="w-5 h-5" />}
                      </button>
                    </div>
                  </>
                ) : gameMode === 'world_boss' ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-14 rounded-xl overflow-hidden border border-amber-400/55 bg-[#090d1f] shrink-0">
                        {!worldBossImgFailed ? (
                          <img
                            src={worldBossArt}
                            alt="Boss Thế Giới Liên Server"
                            referrerPolicy="no-referrer"
                            onError={() => setWorldBossImgFailed(true)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-amber-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 text-left flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="font-display text-sm sm:text-base font-black text-amber-200 truncate">
                            Boss Thế Giới Liên Server (60s)
                          </h2>
                          <span className="font-mono-nums text-[10px] font-black text-emerald-300 shrink-0">
                            {wbState.dailyRunsRemaining}/{WORLD_BOSS_MAX_DAILY_RUNS} lượt
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug mt-0.5 line-clamp-1">
                          Dồn tổng sát thương trong 60 giây để leo hạng Liên Server &amp; nhận Khung Long Hồn!
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-nums border-y border-amber-400/20 py-2 px-1">
                      <span className="text-amber-300 font-bold">
                        Kỷ lục: {wbState.bestSingleDamage.toLocaleString('vi-VN')} ST
                      </span>
                      <span className="text-rose-300 font-bold">
                        Hạng hiện tại: #{wbLiveRank}
                      </span>
                      <span className="text-purple-300 font-bold">
                        Thưởng: Ngọc · Lông Vũ · Khung
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onOpenHonorBoard();
                        }}
                        className="a2-slate-btn px-3.5 py-3 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
                        <span>Bảng Vinh Danh</span>
                      </button>

                      <button
                        type="button"
                        disabled={wbState.dailyRunsRemaining <= 0}
                        onClick={onStartWorldBoss}
                        className={`flex-1 py-3 px-5 rounded-xl font-display font-black text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                          wbState.dailyRunsRemaining > 0
                            ? 'a2-yellow-btn'
                            : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <span>
                          {wbState.dailyRunsRemaining > 0
                            ? 'KHIÊU CHIẾN BOSS THẾ GIỚI'
                            : 'Đã Hết Lượt Hôm Nay'}
                        </span>
                        {wbState.dailyRunsRemaining > 0 && <ChevronRight className="w-5 h-5" />}
                      </button>
                    </div>
                  </>
                ) : gameMode === 'blood_moon' ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-14 rounded-xl overflow-hidden border border-rose-400/55 bg-[#090d1f] shrink-0">
                        {!bloodMoonImgFailed ? (
                          <img
                            src={bloodMoonArt}
                            alt="Đêm Trăng Máu Sinh Tồn 3D"
                            referrerPolicy="no-referrer"
                            onError={() => setBloodMoonImgFailed(true)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Moon className="w-6 h-6 text-rose-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 text-left flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="font-display text-sm sm:text-base font-black text-rose-200 truncate">
                            Đêm Trăng Máu Sinh Tồn ({BLOOD_MOON_DURATION_SEC}s)
                          </h2>
                          <span className="font-mono-nums text-[10px] font-black text-amber-300 shrink-0">
                            {bloodMoonState.dailyRunsRemaining}/{BLOOD_MOON_MAX_DAILY_RUNS} lượt
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug mt-0.5 line-clamp-1">
                          Săn quái Huyết Nguyệt tích Huyết Tinh để đổi Mảnh Thú Cưỡi, Tinh Thể &amp; Ngọc Hồn!
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-nums border-y border-rose-400/20 py-1.5 px-1">
                      <span className="text-rose-300 font-bold">
                        Kỷ lục: {bloodMoonState.bestScore.toLocaleString('vi-VN')} Huyết Tinh
                      </span>
                      <span className="flex items-center gap-1 text-amber-300 font-bold">
                        <MountShardIcon className="w-3.5 h-3.5" /> Rơi Mảnh Thú Cưỡi
                      </span>
                      <span className="flex items-center gap-1 text-rose-200 font-bold">
                        <AwakenCrystalIcon className="w-3.5 h-3.5" /> Rơi Tinh Thể
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {BLOOD_MOON_MILESTONES.map((ms) => {
                        const met = bloodMoonState.bestScore >= ms.score;
                        const claimed = bloodMoonState.claimedMilestones.includes(ms.score);
                        return (
                          <button
                            key={ms.score}
                            type="button"
                            disabled={!met || claimed}
                            onClick={() => {
                              soundEngine.playVictory();
                              onClaimBloodMoonMilestone?.(ms.score);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono-nums font-black border cursor-pointer whitespace-nowrap ${
                              claimed
                                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                : met
                                ? 'a2-yellow-btn'
                                : 'bg-[#070b1a] border-slate-800 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {claimed
                              ? `✓ ${ms.score}`
                              : met
                              ? `Nhận ${ms.score} (+${ms.rewardGems}N)`
                              : `${ms.score} HT`}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2.5 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onTabChange('heroes');
                        }}
                        className="a2-slate-btn px-3.5 py-3 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <MountShardIcon className="w-4 h-4 shrink-0" />
                        <span>Thú Cưỡi 3D</span>
                      </button>

                      <button
                        type="button"
                        disabled={bloodMoonState.dailyRunsRemaining <= 0}
                        onClick={onStartBloodMoon}
                        className={`flex-1 py-3 px-5 rounded-xl font-display font-black text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                          bloodMoonState.dailyRunsRemaining > 0
                            ? 'bg-gradient-to-b from-rose-400 via-red-600 to-purple-800 text-white border border-rose-200/70 shadow-lg'
                            : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <span>
                          {bloodMoonState.dailyRunsRemaining > 0
                            ? 'VÀO ĐÊM TRĂNG MÁU'
                            : 'Đã Hết Lượt Hôm Nay'}
                        </span>
                        {bloodMoonState.dailyRunsRemaining > 0 && <ChevronRight className="w-5 h-5" />}
                      </button>
                    </div>
                  </>
                ) : gameMode === 'abyssal_gauntlet' ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-14 rounded-xl overflow-hidden border border-purple-400/55 bg-[#090d1f] shrink-0">
                        {!abyssalImgFailed ? (
                          <img
                            src={abyssalGauntletArt}
                            alt="Phó Bản Hố Sâu Đột Biến 3D"
                            referrerPolicy="no-referrer"
                            onError={() => setAbyssalImgFailed(true)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Skull className="w-6 h-6 text-purple-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 text-left flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="font-display text-sm sm:text-base font-black text-purple-200 truncate">
                            Phó Bản Hố Sâu Đột Biến ({ABYSSAL_GAUNTLET_TOTAL_WAVES} Đợt)
                          </h2>
                          <span className="font-mono-nums text-[10px] font-black text-amber-300 shrink-0">
                            {abyssalState.dailyRunsRemaining}/{ABYSSAL_GAUNTLET_MAX_DAILY_RUNS} lượt
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug mt-0.5 line-clamp-1">
                          Vượt 10 đợt quái đột biến tăng tiến cực hạn để săn Mảnh Thánh Khí 3D &amp; Ấn Thần Bí!
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-nums border-y border-purple-400/20 py-1.5 px-1">
                      <span className="text-purple-200 font-bold">
                        Kỷ lục: Đợt {abyssalState.bestWave}/{ABYSSAL_GAUNTLET_TOTAL_WAVES}
                      </span>
                      <span className="flex items-center gap-1 text-amber-300 font-bold">
                        <ArtifactRelicIcon className="w-3.5 h-3.5" /> Rơi Mảnh Thánh Khí
                      </span>
                      <span className="flex items-center gap-1 text-cyan-300 font-bold">
                        <MysticTokenIcon className="w-3.5 h-3.5" /> Ấn Thần Bí
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {ABYSSAL_MILESTONES.map((ms) => {
                        const met = abyssalState.bestWave >= ms.wave;
                        const claimed = abyssalState.claimedMilestones.includes(ms.wave);
                        return (
                          <button
                            key={ms.wave}
                            type="button"
                            disabled={!met || claimed}
                            onClick={() => {
                              soundEngine.playVictory();
                              onClaimAbyssalMilestone?.(ms.wave);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono-nums font-black border cursor-pointer whitespace-nowrap ${
                              claimed
                                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                : met
                                ? 'a2-yellow-btn'
                                : 'bg-[#070b1a] border-slate-800 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {claimed
                              ? `✓ Đợt ${ms.wave}`
                              : met
                              ? `Nhận Đ.${ms.wave} (+${ms.rewardArtifactShards}M)`
                              : `Đợt ${ms.wave}`}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2.5 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          if (onOpenHeroSubTab) onOpenHeroSubTab('artifacts');
                          else onTabChange('heroes');
                        }}
                        className="a2-slate-btn px-3.5 py-3 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <ArtifactRelicIcon className="w-4 h-4 shrink-0" />
                        <span>Thánh Khí</span>
                      </button>

                      <button
                        type="button"
                        disabled={abyssalState.dailyRunsRemaining <= 0}
                        onClick={onStartAbyssalGauntlet}
                        className={`flex-1 py-3 px-5 rounded-xl font-display font-black text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                          abyssalState.dailyRunsRemaining > 0
                            ? 'bg-gradient-to-b from-purple-400 via-fuchsia-600 to-indigo-800 text-white border border-purple-200/70 shadow-lg'
                            : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <span>
                          {abyssalState.dailyRunsRemaining > 0
                            ? 'VÀO HỐ SÂU ĐỘT BIẾN'
                            : 'Đã Hết Lượt Hôm Nay'}
                        </span>
                        {abyssalState.dailyRunsRemaining > 0 && <ChevronRight className="w-5 h-5" />}
                      </button>
                    </div>
                  </>
                ) : gameMode === 'guild_war' ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-14 rounded-xl overflow-hidden border border-emerald-400/55 bg-[#090d1f] shrink-0">
                        {!guildWarImgFailed ? (
                          <img
                            src={guildWarCitadelArt}
                            alt="Chiến Trường Bang Hội 3D"
                            referrerPolicy="no-referrer"
                            onError={() => setGuildWarImgFailed(true)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Shield className="w-6 h-6 text-emerald-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 text-left flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="font-display text-sm sm:text-base font-black text-emerald-200 truncate">
                            Chiến Trường Bang Hội 3D ({GUILD_WAR_DURATION_SEC}s)
                          </h2>
                          <span className="font-mono-nums text-[10px] font-black text-amber-300 shrink-0">
                            {guildWarState.dailyRunsRemaining}/{GUILD_WAR_MAX_DAILY_RUNS} lượt
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug mt-0.5 line-clamp-1">
                          Chiếm 3 Trụ Tinh Thể &amp; hạ Hộ Vệ trong {GUILD_WAR_DURATION_SEC}s để tích Điểm Bang mở Quà Vinh Danh Tuần!
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-nums border-y border-emerald-400/20 py-1.5 px-1">
                      <span className="text-emerald-300 font-bold">
                        Điểm Tuần: {guildWarState.weeklyScore.toLocaleString('vi-VN')}
                      </span>
                      <span className="text-sky-300 font-bold">
                        Cứ Điểm Chiếm: {guildWarState.totalNodesCaptured}
                      </span>
                      <span className="text-amber-300 font-bold">
                        Rơi Xu Bang · Thánh Khí
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {GUILD_WAR_WEEKLY_BOXES.map((box) => {
                        const met = guildWarState.weeklyScore >= box.score;
                        const claimed = guildWarState.claimedWeeklyBoxes.includes(box.score);
                        return (
                          <button
                            key={box.score}
                            type="button"
                            disabled={!met || claimed}
                            onClick={() => {
                              soundEngine.playVictory();
                              onClaimGuildWarBox?.(box.score);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono-nums font-black border cursor-pointer whitespace-nowrap ${
                              claimed
                                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                : met
                                ? 'a2-yellow-btn'
                                : 'bg-[#070b1a] border-slate-800 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {claimed
                              ? `✓ ${box.score}`
                              : met
                              ? `Nhận ${box.score} (+${box.rewardGems}N)`
                              : `${box.score} ĐB`}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2.5 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onOpenGuildModal();
                        }}
                        className="a2-slate-btn px-3.5 py-3 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <Shield className="w-4 h-4 text-emerald-300 shrink-0" />
                        <span>Bang Hội</span>
                      </button>

                      <button
                        type="button"
                        disabled={guildWarState.dailyRunsRemaining <= 0}
                        onClick={onStartGuildWar}
                        className={`flex-1 py-3 px-5 rounded-xl font-display font-black text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                          guildWarState.dailyRunsRemaining > 0
                            ? 'a2-emerald-btn'
                            : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <span>
                          {guildWarState.dailyRunsRemaining > 0
                            ? 'VÀO CHIẾN TRƯỜNG BANG'
                            : 'Đã Hết Lượt Hôm Nay'}
                        </span>
                        {guildWarState.dailyRunsRemaining > 0 && <ChevronRight className="w-5 h-5" />}
                      </button>
                    </div>
                  </>
                ) : gameMode === 'pantheon_expedition' ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-14 rounded-xl overflow-hidden border border-amber-300/65 bg-[#090d1f] shrink-0">
                        {!pantheonImgFailed ? (
                          <img
                            src={pantheonBossArt}
                            alt="Viễn Chinh Điện Thần 3D"
                            referrerPolicy="no-referrer"
                            onError={() => setPantheonImgFailed(true)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Crown className="w-6 h-6 text-amber-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 text-left flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="font-display text-sm sm:text-base font-black text-amber-200 truncate">
                            Viễn Chinh Điện Thần 3D ({PANTHEON_TOTAL_STAGES} Tầng Thần Chủ)
                          </h2>
                          <span className="font-mono-nums text-[10px] font-black text-emerald-300 shrink-0">
                            {pantheonState.dailyRunsRemaining}/{MAX_DAILY_PANTHEON_RUNS} lượt
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug mt-0.5 line-clamp-1">
                          Chọn Chúc Phúc Hoàng Đạo và khiêu chiến 3 Thần Chủ liên hoàn để săn Thần Tinh nâng Hào Quang 3D!
                        </p>
                      </div>
                    </div>

                    {/* 3 Selectable Pantheon Blessings */}
                    <div className="mt-2 grid grid-cols-3 gap-1.5">
                      {PANTHEON_BLESSINGS.map((bl) => {
                        const isSel = pantheonState.selectedBlessingId === bl.id;
                        return (
                          <button
                            key={bl.id}
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              onSelectPantheonBlessing?.(bl.id);
                            }}
                            className={`px-2 py-1.5 rounded-xl border text-left cursor-pointer transition-colors ${
                              isSel
                                ? 'bg-amber-400/15 border-amber-300 text-amber-100 shadow'
                                : 'bg-[#070b1a] border-slate-800 text-slate-300 hover:border-amber-300/60'
                            }`}
                          >
                            <div className="text-[9px] font-black text-amber-300 truncate">
                              {bl.badge}
                            </div>
                            <div className="text-[10px] font-black text-white truncate">
                              {bl.name}
                            </div>
                            <div className="text-[9px] text-slate-300 truncate">{bl.desc}</div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-nums border-y border-amber-400/20 py-1.5 px-1">
                      <span className="text-amber-300 font-bold">
                        Kỷ lục: Tầng {pantheonState.bestDeityStage}/{PANTHEON_TOTAL_STAGES} ({pantheonState.bestScore.toLocaleString('vi-VN')}đ)
                      </span>
                      <span className="text-sky-300 font-bold">
                        Thần Tinh hiện có: {save.divineCrystals ?? 0}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {PANTHEON_MILESTONES.map((ms) => {
                        const met = pantheonState.bestScore >= ms.score;
                        const claimed = pantheonState.claimedMilestones.includes(ms.score);
                        return (
                          <button
                            key={ms.score}
                            type="button"
                            disabled={!met || claimed}
                            onClick={() => {
                              soundEngine.playVictory();
                              onClaimPantheonMilestone?.(ms.score);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono-nums font-black border cursor-pointer whitespace-nowrap ${
                              claimed
                                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                : met
                                ? 'a2-yellow-btn'
                                : 'bg-[#070b1a] border-slate-800 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {claimed
                              ? `✓ ${ms.score}`
                              : met
                              ? `Nhận ${ms.score} (+${ms.rewardDivineCrystals}TT)`
                              : `${ms.score}đ (+${ms.rewardDivineCrystals}TT)`}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2.5 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          if (onOpenHeroSubTab) onOpenHeroSubTab('halos');
                          else onTabChange('heroes');
                        }}
                        className="a2-slate-btn px-3.5 py-3 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <Crown className="w-4 h-4 text-amber-300 shrink-0" />
                        <span>Hào Quang 3D</span>
                      </button>

                      <button
                        type="button"
                        data-start="true"
                        disabled={pantheonState.dailyRunsRemaining <= 0}
                        onClick={onStartPantheon}
                        className={`flex-1 py-3 px-5 rounded-xl font-display font-black text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                          pantheonState.dailyRunsRemaining > 0
                            ? 'a2-yellow-btn'
                            : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <span>
                          {pantheonState.dailyRunsRemaining > 0
                            ? 'VÀO ĐIỆN THẦN 3D'
                            : 'Đã Hết Lượt Hôm Nay'}
                        </span>
                        {pantheonState.dailyRunsRemaining > 0 && <ChevronRight className="w-5 h-5" />}
                      </button>
                    </div>
                  </>
                ) : gameMode === 'championship_3round' ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-14 rounded-xl overflow-hidden border border-amber-300/70 bg-[#090d1f] shrink-0">
                        {!championshipImgFailed ? (
                          <img
                            src={championshipTrophyArt}
                            alt="Giải Đấu Quán Quân 3 Hiệp 3D"
                            referrerPolicy="no-referrer"
                            onError={() => setChampionshipImgFailed(true)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Trophy className="w-6 h-6 text-amber-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 text-left flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="font-display text-sm sm:text-base font-black text-amber-200 truncate">
                            Giải Đấu Quán Quân {CHAMPIONSHIP_TOTAL_ROUNDS} Hiệp 3D
                          </h2>
                          <span className="font-mono-nums text-[10px] font-black text-emerald-300 shrink-0">
                            {championshipState.dailyRunsRemaining}/{MAX_DAILY_CHAMPIONSHIP_RUNS} lượt
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug mt-0.5 line-clamp-1">
                          Đối đầu 3 Quán Quân 3D liên hoàn, chọn Thẻ Chiến Thuật giữa hiệp để săn Cúp Vinh Quang &amp; Lõi Thần Sủng!
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-nums border-y border-amber-400/20 py-1.5 px-1">
                      <span className="text-amber-300 font-bold">
                        Cúp Vinh Quang: {championshipState.gloryTrophies.toLocaleString('vi-VN')} · Đăng quang {championshipState.championshipTitlesWon} lần
                      </span>
                      <span className="text-sky-300 font-bold">
                        Lõi Thần Sủng: {save.spiritCores ?? 0}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {CHAMPIONSHIP_CUP_MILESTONES.map((ms) => {
                        const met = championshipState.gloryTrophies >= ms.trophiesTarget;
                        const claimed = championshipState.claimedCupMilestones.includes(
                          ms.trophiesTarget
                        );
                        return (
                          <button
                            key={ms.trophiesTarget}
                            type="button"
                            disabled={!met || claimed}
                            onClick={() => {
                              soundEngine.playVictory();
                              onClaimChampionshipMilestone?.(ms.trophiesTarget);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono-nums font-black border cursor-pointer whitespace-nowrap ${
                              claimed
                                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                : met
                                ? 'a2-yellow-btn'
                                : 'bg-[#070b1a] border-slate-800 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {claimed
                              ? `✓ ${ms.trophiesTarget} Cúp`
                              : met
                              ? `Nhận ${ms.trophiesTarget} (+${ms.rewardSpiritCores} Lõi)`
                              : `${ms.trophiesTarget} Cúp (+${ms.rewardSpiritCores} Lõi)`}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2.5 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          if (onOpenHeroSubTab) onOpenHeroSubTab('pets');
                          else onTabChange('heroes');
                        }}
                        className="a2-slate-btn px-3.5 py-3 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                        <span>Thần Sủng 3D</span>
                      </button>

                      <button
                        type="button"
                        data-start="true"
                        disabled={championshipState.dailyRunsRemaining <= 0}
                        onClick={onStartChampionship}
                        className={`flex-1 py-3 px-5 rounded-xl font-display font-black text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                          championshipState.dailyRunsRemaining > 0
                            ? 'a2-yellow-btn'
                            : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <span>
                          {championshipState.dailyRunsRemaining > 0
                            ? 'VÀO GIẢI ĐẤU 3 HIỆP 3D'
                            : 'Đã Hết Lượt Hôm Nay'}
                        </span>
                        {championshipState.dailyRunsRemaining > 0 && (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </>
                ) : gameMode === 'crystal_vault' ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-14 rounded-xl overflow-hidden border border-yellow-300/75 bg-[#090d1f] shrink-0">
                        {!crystalVaultImgFailed ? (
                          <img
                            src={crystalVaultArt}
                            alt="Hầm Mỏ Pha Lê Kho Báu 3D"
                            referrerPolicy="no-referrer"
                            onError={() => setCrystalVaultImgFailed(true)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Gem className="w-6 h-6 text-amber-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 text-left flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="font-display text-sm sm:text-base font-black text-yellow-200 truncate">
                            Hầm Mỏ Pha Lê Kho Báu 3D (60 Giây)
                          </h2>
                          <span className="font-mono-nums text-[10px] font-black text-emerald-300 shrink-0">
                            {crystalVaultState.dailyRunsRemaining}/
                            {MAX_DAILY_CRYSTAL_VAULT_RUNS + (supremeActive ? 1 : 0)} lượt
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug mt-0.5 line-clamp-1">
                          Phá hủy Trụ Pha Lê Vàng &amp; Hạ Hộ Vệ Kho Báu săn Ngọc Hồn, Đá Đúc Hoàng Kim, Mảnh Thần Binh &amp; Huy Hiệu!
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-nums border-y border-amber-400/20 py-1.5 px-1">
                      <span className="text-amber-300 font-bold">
                        Kỷ lục: {crystalVaultState.bestPillarsBroken} Trụ/trận · Tổng phá:{' '}
                        {crystalVaultState.totalPillarsBroken} Trụ
                      </span>
                      <span className="text-orange-300 font-bold">
                        🔥 {save.reforgeStones ?? 0} Đá Đúc · ⚔ {save.mythicShards ?? 0} Mảnh
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {CRYSTAL_VAULT_MILESTONES.map((ms) => {
                        const met = crystalVaultState.totalPillarsBroken >= ms.pillarsTarget;
                        const claimed = crystalVaultState.claimedMilestones.includes(
                          ms.pillarsTarget
                        );
                        return (
                          <button
                            key={ms.pillarsTarget}
                            type="button"
                            disabled={!met || claimed}
                            onClick={() => {
                              soundEngine.playVictory();
                              onClaimCrystalVaultMilestone?.(ms.pillarsTarget);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono-nums font-black border cursor-pointer whitespace-nowrap ${
                              claimed
                                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                : met
                                ? 'a2-yellow-btn'
                                : 'bg-[#070b1a] border-slate-800 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {claimed
                              ? `✓ ${ms.pillarsTarget} Trụ`
                              : met
                              ? `Nhận ${ms.pillarsTarget} (+${ms.rewardGems}💎)`
                              : `${ms.pillarsTarget} Trụ (+${ms.rewardMythicShards}⚔)`}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2.5 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onOpenWave12Sanctum?.('mythic');
                        }}
                        className="a2-slate-btn px-3.5 py-3 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <Sword className="w-4 h-4 text-amber-300 shrink-0" />
                        <span>Đúc Thần Binh</span>
                      </button>

                      <button
                        type="button"
                        data-start="true"
                        disabled={crystalVaultState.dailyRunsRemaining <= 0}
                        onClick={onStartCrystalVault}
                        className={`flex-1 py-3 px-5 rounded-xl font-display font-black text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                          crystalVaultState.dailyRunsRemaining > 0
                            ? 'a2-yellow-btn'
                            : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <span>
                          {crystalVaultState.dailyRunsRemaining > 0
                            ? 'KHAI PHÁ HẦM MỎ PHA LÊ 3D'
                            : 'Đã Hết Lượt Hôm Nay'}
                        </span>
                        {crystalVaultState.dailyRunsRemaining > 0 && (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </>
                ) : gameMode === 'dragon_lair' ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-14 rounded-xl overflow-hidden border border-rose-400/80 bg-[#15080f] shrink-0">
                        {!dragonLairImgFailed ? (
                          <img
                            src={ancientDragonLairArt}
                            alt="Lãnh Địa Rồng Cổ 3D"
                            referrerPolicy="no-referrer"
                            onError={() => setDragonLairImgFailed(true)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Flame className="w-6 h-6 text-rose-400" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 text-left flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="font-display text-sm sm:text-base font-black text-rose-200 truncate">
                            Lãnh Địa Rồng Cổ 3D · 3 Pha Đồ Long (75s)
                          </h2>
                          <span className="font-mono-nums text-[10px] font-black text-emerald-300 shrink-0">
                            {dragonLairState.dailyRunsRemaining}/{MAX_DAILY_DRAGON_LAIR_RUNS} lượt
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug mt-0.5 line-clamp-1">
                          Đối đầu Cổ Long Tinh Giới 3D, né vùng đỏ Hơi Thở Rồng để săn Vảy Rồng Cổ, Cỏ Tinh Tú &amp; Linh Ngọc!
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-nums border-y border-rose-400/25 py-1.5 px-1">
                      <span className="text-amber-300 font-bold">
                        Kỷ lục: {dragonLairState.bestDamage.toLocaleString('vi-VN')} ST · Tổng Vảy:{' '}
                        {dragonLairState.totalScalesEarned}
                      </span>
                      <span className="text-rose-300 font-bold">
                        Vảy Rồng Kho: {save.dragonScales ?? 0} · Cỏ Tinh Tú: {save.starlightGrass ?? 0}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {DRAGON_LAIR_MILESTONES.map((ms) => {
                        const met = dragonLairState.totalScalesEarned >= ms.scalesTarget;
                        const claimed = dragonLairState.claimedMilestones.includes(ms.scalesTarget);
                        return (
                          <button
                            key={ms.scalesTarget}
                            type="button"
                            disabled={!met || claimed}
                            onClick={() => {
                              soundEngine.playVictory();
                              onClaimDragonLairMilestone?.(ms.scalesTarget);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono-nums font-black border cursor-pointer whitespace-nowrap ${
                              claimed
                                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                : met
                                ? 'a2-yellow-btn'
                                : 'bg-[#070b1a] border-slate-800 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {claimed
                              ? `✓ ${ms.scalesTarget} Vảy`
                              : met
                              ? `Nhận ${ms.scalesTarget} (+${ms.rewardGems} Ngọc)`
                              : `${ms.scalesTarget} Vảy (+${ms.rewardBlindBoxTickets} Vé)`}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2.5 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onOpenWave13Treasury?.('steeds');
                        }}
                        className="a2-slate-btn px-3.5 py-3 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <Sparkles className="w-4 h-4 text-cyan-300 shrink-0" />
                        <span>Đổi Thú Cưỡi</span>
                      </button>

                      <button
                        type="button"
                        data-start="true"
                        disabled={dragonLairState.dailyRunsRemaining <= 0}
                        onClick={onStartDragonLair}
                        className={`flex-1 py-3 px-5 rounded-xl font-display font-black text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                          dragonLairState.dailyRunsRemaining > 0
                            ? 'a2-yellow-btn'
                            : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <span>
                          {dragonLairState.dailyRunsRemaining > 0
                            ? 'KHAI CHIẾN LÃNH ĐỊA RỒNG CỔ 3D'
                            : 'Đã Hết Lượt Hôm Nay'}
                        </span>
                        {dragonLairState.dailyRunsRemaining > 0 && (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </>
                ) : gameMode === 'sky_citadel' ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-14 rounded-xl overflow-hidden border border-sky-400/80 bg-[#07152a] shrink-0">
                        {!skyCitadelImgFailed ? (
                          <img
                            src={celestialWingsArenaArt}
                            alt="Không Chiến Tinh Giới 3D"
                            referrerPolicy="no-referrer"
                            onError={() => setSkyCitadelImgFailed(true)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Feather className="w-6 h-6 text-sky-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 text-left flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h2 className="font-display text-sm sm:text-base font-black text-sky-200 truncate">
                            Không Chiến Tinh Giới 3D · 3 Đợt Thần Cánh (75s)
                          </h2>
                          <span className="font-mono-nums text-[10px] font-black text-emerald-300 shrink-0">
                            {skyCitadelState.dailyRunsRemaining}/{SKY_CITADEL_MAX_DAILY_RUNS} lượt
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug mt-0.5 line-clamp-1">
                          Tung Cánh Thần Quang 3D hạ Thiên Sứ Thủ Vệ, săn Lông Vũ Thần Quang, Mảnh Thần Thoại &amp; Xúc Xắc Tinh Tú!
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-nums border-y border-sky-400/25 py-1.5 px-1">
                      <span className="text-amber-300 font-bold">
                        Kỷ lục: {skyCitadelState.bestScore.toLocaleString('vi-VN')} đ · Tổng:{' '}
                        {skyCitadelState.totalScore.toLocaleString('vi-VN')} đ
                      </span>
                      <span className="text-sky-300 font-bold">
                        Lông Vũ Thần Quang: {save.celestialFeathers ?? 0} · Xúc Xắc: {astralBoardState.normalDice}
                      </span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {SKY_CITADEL_MILESTONES.map((ms) => {
                        const met = skyCitadelState.totalScore >= ms.scoreTarget;
                        const claimed = skyCitadelState.claimedMilestones.includes(ms.scoreTarget);
                        return (
                          <button
                            key={ms.scoreTarget}
                            type="button"
                            disabled={!met || claimed}
                            onClick={() => {
                              soundEngine.playVictory();
                              onClaimSkyCitadelMilestone?.(ms.scoreTarget);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono-nums font-black border cursor-pointer whitespace-nowrap ${
                              claimed
                                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                                : met
                                ? 'a2-yellow-btn'
                                : 'bg-[#070b1a] border-slate-800 text-slate-400 cursor-not-allowed'
                            }`}
                          >
                            {claimed
                              ? `✓ ${ms.scoreTarget.toLocaleString('vi-VN')}đ`
                              : met
                              ? `Nhận ${ms.scoreTarget.toLocaleString('vi-VN')}đ (+${ms.rewardFeathers} Lông)`
                              : `${ms.scoreTarget.toLocaleString('vi-VN')}đ (+${ms.rewardMythicShards} Mảnh)`}
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-2.5 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onOpenWave14Ascension?.('wings');
                        }}
                        className="a2-slate-btn px-3.5 py-3 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <Feather className="w-4 h-4 text-sky-300 shrink-0" />
                        <span>Nâng Cánh 3D</span>
                      </button>

                      <button
                        type="button"
                        data-start="true"
                        disabled={skyCitadelState.dailyRunsRemaining <= 0}
                        onClick={onStartSkyCitadel}
                        className={`flex-1 py-3 px-5 rounded-xl font-display font-black text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                          skyCitadelState.dailyRunsRemaining > 0
                            ? 'a2-yellow-btn'
                            : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <span>
                          {skyCitadelState.dailyRunsRemaining > 0
                            ? 'KHAI CHIẾN KHÔNG CHIẾN 3D'
                            : 'Đã Hết Lượt Hôm Nay'}
                        </span>
                        {skyCitadelState.dailyRunsRemaining > 0 && (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3">
                      <div className="w-20 h-14 rounded-xl overflow-hidden border border-emerald-400/45 bg-[#090d1f] shrink-0">
                        {!riftImgFailed ? (
                          <img
                            src={dailyRiftArt}
                            alt={todayRiftPair.title}
                            referrerPolicy="no-referrer"
                            onError={() => setRiftImgFailed(true)}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Sparkles className="w-6 h-6 text-emerald-300" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 text-left">
                        <div className="flex items-center gap-1.5">
                          <h2 className="font-display text-sm sm:text-base font-black text-emerald-200 truncate">
                            {todayRiftPair.title}
                          </h2>
                          <span className="font-mono-nums text-[10px] font-black text-amber-300 shrink-0">
                            {dailyRift.runsRemaining}/{MAX_DAILY_RIFT_RUNS} lượt
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug mt-0.5 line-clamp-1">
                          {todayRiftPair.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-left">
                      <div className="rounded-xl bg-emerald-950/40 border border-emerald-400/30 px-2.5 py-1.5">
                        <div className="text-[10px] font-black text-emerald-300">
                          Phước Lành: {todayRiftPair.playerBuffTitle}
                        </div>
                        <div className="text-[10px] text-slate-200 truncate">
                          {todayRiftPair.playerBuffDesc}
                        </div>
                      </div>
                      <div className="rounded-xl bg-rose-950/35 border border-rose-400/30 px-2.5 py-1.5">
                        <div className="text-[10px] font-black text-rose-300">
                          Thử Thách: {todayRiftPair.enemyChallengeTitle}
                        </div>
                        <div className="text-[10px] text-slate-200 truncate">
                          {todayRiftPair.enemyChallengeDesc}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] font-mono-nums text-sky-200 px-1">
                      <span className="flex items-center gap-1 font-bold">
                        <StarDustIcon className="w-3.5 h-3.5" /> Rơi nhiều Bụi Tinh Tú
                      </span>
                      <span className="flex items-center gap-1 font-bold text-emerald-300">
                        <PetEssenceIcon className="w-3.5 h-3.5" /> Rơi Tinh Chất Tinh Linh
                      </span>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onOpenForgeModal();
                        }}
                        className="a2-slate-btn px-3.5 py-3 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <Hammer className="w-4 h-4 text-amber-300 shrink-0" />
                        <span>Lò Rèn [S]</span>
                      </button>

                      <button
                        type="button"
                        disabled={dailyRift.runsRemaining <= 0}
                        onClick={onStartDailyRift}
                        className={`flex-1 py-3 px-5 rounded-xl font-display font-black text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                          dailyRift.runsRemaining > 0
                            ? 'a2-emerald-btn'
                            : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <span>
                          {dailyRift.runsRemaining > 0 ? 'VÀO BÍ CẢNH' : 'Đã Hết Lượt Hôm Nay'}
                        </span>
                        {dailyRift.runsRemaining > 0 && <ChevronRight className="w-5 h-5" />}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'gear' && (
          <LobbyGearPanel
            save={save}
            stats={stats}
            onEquip={onEquipGear}
            onUpgrade={onUpgradeGear}
            onFuse={onFuseGear}
            onAutoEquipBest={onAutoEquipBest}
            onBulkFuseGear={onBulkFuseGear}
            onOpenForge={onOpenForgeModal}
            onOpenForgeSubTab={onOpenForgeSubTab}
            onSaveBuildPreset={onSaveBuildPreset}
            onApplyBuildPreset={onApplyBuildPreset}
            onOpenWardrobe={onOpenWardrobe}
            onRotateHero={onRotateHero}
            onResetHeroRotation={onResetHeroRotation}
            onGoShop={() => onTabChange('shop')}
          />
        )}

        {activeTab === 'heroes' && (
          <LobbyHeroesPanel
            key={heroSubTabInitial}
            save={save}
            previewHeroId={previewHeroId}
            initialSubTab={heroSubTabInitial}
            onPreviewHero={onPreviewHero}
            onSelectHero={onSelectHero}
            onUnlockHero={onUnlockHero}
            onUpgradeHeroStar={onUpgradeHeroStar}
            onUnlockPet={onUnlockPet}
            onEquipPet={onEquipPet}
            onUpgradePet={onUpgradePet}
            onEvolvePet={onEvolvePet}
            onUnlockSkin={onUnlockSkin}
            onEquipSkin={onEquipSkin}
            onUnlockAura={onUnlockAura}
            onEquipAura={onEquipAura}
            onUnlockWing={onUnlockWing}
            onEquipWing={onEquipWing}
            onUpgradeWing={onUpgradeWing}
            onUnlockAvatarFrame={onUnlockAvatarFrame}
            onEquipAvatarFrame={onEquipAvatarFrame}
            onUnlockMount={onUnlockMount}
            onEquipMount={onEquipMount}
            onUpgradeMount={onUpgradeMount}
            onUnlockWeaponAura={onUnlockWeaponAura}
            onEquipWeaponAura={onEquipWeaponAura}
            onUpgradeWeaponAura={onUpgradeWeaponAura}
            onUnlockArtifact={onUnlockArtifact}
            onEquipArtifact={onEquipArtifact}
            onUpgradeArtifact={onUpgradeArtifact}
            onUnlockHalo={onUnlockHalo}
            onEquipHalo={onEquipHalo}
            onUpgradeHalo={onUpgradeHalo}
            onOpenWardrobe={onOpenWardrobe}
            onPreviewUltimate={onPreviewUltimate}
            onRotateHero={onRotateHero}
            onResetHeroRotation={onResetHeroRotation}
          />
        )}

        {activeTab === 'runes' && (
          <LobbyRunesPanel
            save={save}
            onEquipRune={onEquipRune}
            onUnequipRune={onUnequipRune}
            onFuseRune={onFuseRune}
            onBulkFuseRunes={onBulkFuseRunes}
            onGoShop={() => onTabChange('shop')}
          />
        )}

        {activeTab === 'shop' && (
          <LobbyShopPanel
            key={shopSection}
            save={save}
            powerRating={stats.powerRating}
            initialSection={shopSection}
            wishLastOutcomes={wishLastOutcomes}
            onOpenChestWithGacha={onOpenChestWithGacha}
            onBuyFlashDeal={onBuyFlashDeal}
            onUnlockGrowthFundPremium={onUnlockGrowthFundPremium}
            onClaimGrowthFundReward={onClaimGrowthFundReward}
            onClaimAllGrowthFund={onClaimAllGrowthFund}
            onBuyArenaShopOffer={onBuyArenaShopOffer}
            onBuyCommercialPack={onBuyCommercialPack}
            onBuyMonthlyCard={onBuyMonthlyCard}
            onClaimMonthlyCardDaily={onClaimMonthlyCardDaily}
            onClaimTopUpEvolutionTier={onClaimTopUpEvolutionTier}
            onSelectWishTarget={onSelectWishTarget}
            onWishPoolRoll={onWishPoolRoll}
            onClaimWishMilestone={onClaimWishMilestone}
            onClaimFirstTopUp={onClaimFirstTopUp}
            onBuyHotBundle={onBuyHotBundle}
            onMysticExchange={onMysticExchange}
            onClaimChainStep={onClaimChainStep}
            onResetChainCycle={onResetChainCycle}
            onBreakGemVault={onBreakGemVault}
            onClaimGemVaultMilestone={onClaimGemVaultMilestone}
            onBuyWeekendPack={onBuyWeekendPack}
            onClaimWeekendPassDaily={onClaimWeekendPassDaily}
            onActivateSupremeMonthly={onActivateSupremeMonthly}
            onClaimSupremeMonthlyDaily={onClaimSupremeMonthlyDaily}
            onOpenBundlePreview={onOpenBundlePreview}
            onOpenVipModal={onOpenVipModal}
            onOpenArenaModal={onOpenArenaModal}
          />
        )}
      </main>

      {/* CELESTIAL TEMPLE BOTTOM DOCK */}
      <nav
        aria-label="Điều hướng chính"
        className="pointer-events-auto z-20 bg-gradient-to-t from-[#050813] via-[#090e22] to-[#0c132d] border-t border-amber-400/35 shrink-0 shadow-[0_-12px_30px_rgba(0,0,0,0.85)] px-2 sm:px-6"
      >
        <div className="max-w-3xl mx-auto grid grid-cols-5 gap-1">
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`relative py-2.5 sm:py-3 px-1 flex flex-col items-center justify-center gap-1 font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'text-amber-200 bg-gradient-to-b from-amber-400/14 to-transparent'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-3 right-3 h-[2px] bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
                )}
                {tab.renderIcon(isActive)}
                <span className="text-[10px] sm:text-xs tracking-wide truncate max-w-full">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* GUIDE MODAL */}
      {guideOpen && (
        <div className="pointer-events-auto fixed inset-0 z-40 bg-[#040611]/88 flex items-center justify-center p-4">
          <div className="cel-panel-ornate w-full max-w-lg rounded-3xl p-5 sm:p-6 flex flex-col gap-3.5">
            <div className="flex items-center justify-between border-b border-amber-400/25 pb-3">
              <h3 className="font-display text-base sm:text-lg font-black text-amber-300">
                Cẩm Nang Chiến Đấu Artemis 3D
              </h3>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="cel-panel w-8 h-8 rounded-xl flex items-center justify-center text-slate-200 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs sm:text-sm text-slate-200 leading-relaxed max-h-[60vh] overflow-y-auto a2-scroll">
              <p>
                <strong className="text-amber-300">1. Cơ chế Dừng Để Bắn:</strong> Kéo chuột /
                ngón tay hoặc dùng phím <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-amber-400/40 font-mono-nums">WASD</kbd> để né đòn. Khi đứng yên, Anh Hùng sẽ tự động khóa mục tiêu và bắn liên tục.
              </p>
              <p>
                <strong className="text-emerald-300">2. Lướt Né &amp; Chiêu Cuối:</strong> Nhấn{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-amber-400/40 font-mono-nums">Space</kbd> để lướt né đạn (bất tử ngắn), và nhấn{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-amber-400/40 font-mono-nums">Q</kbd> khi Nộ đạt 100% để tung Chiêu Cuối riêng của từng Anh Hùng.
              </p>
              <p>
                <strong className="text-purple-300">3. Thẻ Bài Roguelike &amp; Tháp Vô Tận:</strong>{' '}
                Mỗi lần lên cấp chọn 1 trong 3 thẻ bài kỹ năng Tarot để cộng hưởng sức mạnh. Thử sức tại Tháp Vô Tận với Boss mỗi 3 tầng để thu thập nhiều Vàng và Ngọc Hồn.
              </p>
              <p>
                <strong className="text-sky-300">4. Thiên Phú, Trang Bị &amp; Ngọc Khắc:</strong>{' '}
                Dùng Vàng nâng cấp Bảng Thiên Phú vĩnh viễn, ghép 3 trang bị giống nhau lên bậc Huyền Thoại và khảm 4 Ngọc Khắc lên Đài Hoàng Đạo.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGuideOpen(false)}
              className="a2-yellow-btn w-full py-2.5 rounded-xl font-black text-sm cursor-pointer whitespace-nowrap"
            >
              Đã Hiểu · Tiếp Tục
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

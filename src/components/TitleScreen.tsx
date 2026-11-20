import React, { lazy, Suspense, useEffect, useState } from 'react';
import {
  Bot,
  Camera,
  ChevronLeft,
  ChevronRight,
  Cloud,
  CloudOff,
  Compass,
  Download,
  Eye,
  EyeOff,
  Flame,
  Gem,
  Gift,
  HelpCircle,
  Lock,
  Mail,
  MessageSquare,
  Orbit,
  RefreshCw,
  RotateCw,
  Settings,
  Shield,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Swords,
  Users,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { CHAPTERS } from '../data/chaptersData';
import {
  countUnclaimedEligibleMail,
  getNextTargetGoal,
} from '../data/earlyProgressionData';
import { HERO_MAP } from '../data/heroesData';
import {
  countClaimableAchievements,
  countClaimableBattlePass,
} from '../data/liveOpsData';
import { isNightmareUnlocked } from '../data/phase5Data';
import { countClaimableWelfare, getTodayKey } from '../data/questsData';
import {
  MAX_DAILY_RIFT_RUNS,
  canClaimVipDaily,
  getDailyRiftPair,
  isVipActive,
  normalizeDailyRift,
  normalizeVip,
} from '../data/wave3Data';
import { normalizeDestinyWheel, normalizeGuild } from '../data/wave4Data';
import {
  CUMULATIVE_SPEND_MILESTONES,
  countClaimableJourneyRewards,
  normalizeNightMarket,
} from '../data/wave5Data';
import {
  COOP_DIFFICULTY_MAP,
  COOP_RAID_DIFFICULTIES,
  COOP_RAID_MAX_DAILY_REWARDS,
  ELEMENTAL_TOWERS,
  ELEMENTAL_TOWER_MAP,
  countClaimableGrowthFund,
  normalizeCoopRaid,
  normalizeElementalTowers,
} from '../data/wave6Data';
import {
  CRYSTAL_DEFENSE_MAX_DAILY_RUNS,
  MYTHIC_BADGE_MAP,
  WORLD_BOSS_MAX_DAILY_RUNS,
  countClaimableWave7Rewards,
  isMonthlyCardActive,
  normalizeAuctionHouse,
  normalizeCrystalDefense,
  normalizeMonthlyPrivilege,
  normalizeWorldBoss,
} from '../data/wave7Data';
import {
  BLOOD_MOON_MAX_DAILY_RUNS,
  countClaimableWave8Rewards,
  normalizeBloodMoon,
  normalizeDispatchState,
} from '../data/wave8Data';
import {
  ABYSSAL_GAUNTLET_MAX_DAILY_RUNS,
  GUILD_WAR_MAX_DAILY_RUNS,
  PowerRecommendation,
  countClaimableWave9Rewards,
  normalizeAbyssalGauntlet,
  normalizeGuildWar,
} from '../data/wave9Data';
import {
  MAX_DAILY_PANTHEON_RUNS,
  countClaimablePantheonMilestones,
  countClaimableVaultRewards,
  hasFreeChainStepReady,
  normalizePantheonExpedition,
} from '../data/wave10Data';
import {
  MAX_DAILY_CHAMPIONSHIP_RUNS,
  countClaimableChampionshipMilestones,
  countClaimableCodexRanks,
  countClaimableFestivalRewards,
  normalizeChampionshipState,
} from '../data/wave11Data';
import {
  LOBBY_HERO_POSES,
  MAX_DAILY_CRYSTAL_VAULT_RUNS,
  countClaimableCrystalVaultMilestones,
  isSupremeMonthlyActive,
  normalizeCrystalVault,
  previewLobbyClaimAll,
} from '../data/wave12Data';
import {
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
  countClaimableAstralBoardRewards,
  countClaimableGuildSanctuaryRewards,
  countClaimableSkyCitadelMilestones,
  normalizeSkyCitadel,
} from '../data/wave14Data';
import {
  ArtifactId,
  AuraStyleId,
  AiLiveActivityEvent,
  AiLivePlayerProfile,
  AutoOptimizeGoal,
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
  PhotoLightingPreset,
  SanctuaryFloorId,
  SaveData,
  WeaponAuraId,
  WingId,
} from '../types/game';
import { ArenaShopOffer, CommercialPackItem } from '../data/wave6Data';
import { GoldCoinIcon, SoulGemIcon, ZodiacAvatar } from './GameIcons';
import type { ShopSectionTab } from './LobbyPanels';
import { CloudSyncStatus } from '../services/playerCloudService';
import type { ProfileModalTab } from './ProfileCodexModal';
import type { Wave12SanctumTab } from './Wave12SanctumModal';
import type { Wave13Tab } from './Wave13TreasuryModal';
import type { Wave14Tab } from './Wave14AscensionModal';

const LobbyEventsHubDrawer = lazy(() =>
  import('./LobbyDrawers').then((m) => ({ default: m.LobbyEventsHubDrawer }))
);
const LobbyModeDetailModal = lazy(() =>
  import('./LobbyDrawers').then((m) => ({ default: m.LobbyModeDetailModal }))
);
const LobbyModeDrawer = lazy(() =>
  import('./LobbyDrawers').then((m) => ({ default: m.LobbyModeDrawer }))
);
const LobbySkyPopover = lazy(() =>
  import('./LobbyDrawers').then((m) => ({ default: m.LobbySkyPopover }))
);
const LobbyGearPanel = lazy(() =>
  import('./LobbyPanels').then((m) => ({ default: m.LobbyGearPanel }))
);
const LobbyHeroesPanel = lazy(() =>
  import('./LobbyPanels').then((m) => ({ default: m.LobbyHeroesPanel }))
);
const LobbyRunesPanel = lazy(() =>
  import('./LobbyPanels').then((m) => ({ default: m.LobbyRunesPanel }))
);
const LobbyShopPanel = lazy(() =>
  import('./LobbyPanels').then((m) => ({ default: m.LobbyShopPanel }))
);

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
  onOpenWeeklyBoss?: () => void;
  onOpenLiveAiHub?: () => void;
  onOpenLiveChat?: (channel?: 'lobby' | 'guild') => void;
  liveAiOnlineCount?: number;
  latestAiActivity?: AiLiveActivityEvent | null;
  onlineAiTeammates?: AiLivePlayerProfile[];
  onOpenWardrobe?: () => void;
  onOpenDispatch?: () => void;
  onOpenProfileModal: (tab?: ProfileModalTab) => void;
  playerDisplayName?: string;
  cloudSyncStatus?: CloudSyncStatus;
  onManualCloudSave?: () => void;
  onOpenLinkAccount?: () => void;
  onOpenMailModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenEarlyRoadmap?: () => void;
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
  onTransferGearUpgrade?: (sourceUid: string, targetUid: string) => void;
  onFuseGear: (uid: string) => void;
  onAutoEquipBest: () => void;
  onAutoOptimizeGear?: (goal: AutoOptimizeGoal) => void;
  onBulkFuseGear: () => void;
  onSaveBuildPreset: (idx: number) => void;
  onApplyBuildPreset: (idx: number) => void;
  onSaveLoadoutPreset?: (slotId: 'preset_1' | 'preset_2' | 'preset_3') => void;
  onApplyLoadoutPreset?: (slotId: 'preset_1' | 'preset_2' | 'preset_3') => void;
  onSelectNightmareTier?: (tier: number) => void;
  onStartTrainingGrounds?: () => void;
  onOpenCodexGuide?: () => void;
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
  photoLightingPreset?: PhotoLightingPreset;
  lobbyHeroPose?: LobbyHeroPoseId;
  onTogglePhotoMode?: (active: boolean) => void;
  onChangePhotoAngle?: (angle: 'full' | 'closeup' | 'hero_wide') => void;
  onChangePhotoLighting?: (preset: PhotoLightingPreset) => void;
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
  onTriggerLobbyEmote?: () => void;
  lobbyInspectMode?: boolean;
  lobbyInspectAutoRotate?: boolean;
  onToggleLobbyInspect?: (active: boolean) => void;
  onToggleLobbyAutoRotate?: () => void;
  onCraftEarlyTargetGear?: (tier: 'rare' | 'epic' | 's_tier') => void;
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
    renderIcon: (a) => <Swords className={`w-4 h-4 ${a ? 'text-amber-300' : 'text-slate-400'}`} />,
  },
  {
    id: 'gear',
    label: 'Trang Bị',
    renderIcon: (a) => <Shield className={`w-4 h-4 ${a ? 'text-amber-300' : 'text-slate-400'}`} />,
  },
  {
    id: 'heroes',
    label: 'Anh Hùng',
    renderIcon: (a) => <Users className={`w-4 h-4 ${a ? 'text-amber-300' : 'text-slate-400'}`} />,
  },
  {
    id: 'runes',
    label: 'Ngọc Khắc',
    renderIcon: (a) => <Sparkles className={`w-4 h-4 ${a ? 'text-amber-300' : 'text-slate-400'}`} />,
  },
  {
    id: 'shop',
    label: 'Kho Báu',
    renderIcon: (a) => <Gem className={`w-4 h-4 ${a ? 'text-amber-300' : 'text-slate-400'}`} />,
  },
];

export const TitleScreen: React.FC<TitleScreenProps> = ({
  save,
  stats,
  selectedChapterId,
  gameMode,
  activeTab,
  heroSubTabInitial = 'roster',
  shopSection = 'gacha',
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
  onOpenWeeklyBoss,
  onOpenLiveAiHub,
  onOpenLiveChat,
  liveAiOnlineCount,
  latestAiActivity,
  onlineAiTeammates,
  onOpenWardrobe,
  onOpenDispatch,
  onOpenProfileModal,
  onOpenMailModal,
  onOpenSettingsModal,
  onOpenEarlyRoadmap,
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
  onTransferGearUpgrade,
  onFuseGear,
  onAutoEquipBest,
  onAutoOptimizeGear,
  onBulkFuseGear,
  onSaveBuildPreset,
  onApplyBuildPreset,
  onSaveLoadoutPreset,
  onApplyLoadoutPreset,
  onSelectNightmareTier,
  onStartTrainingGrounds,
  onOpenCodexGuide,
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
  photoLightingPreset = 'golden_hall',
  lobbyHeroPose = 'heroic',
  onTogglePhotoMode,
  onChangePhotoAngle,
  onChangePhotoLighting,
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
  playerDisplayName,
  cloudSyncStatus = 'guest',
  onManualCloudSave,
  onOpenLinkAccount,
  onAdjustLobbyZoom,
  onReplayEntranceVfx,
  onTriggerLobbyEmote,
  lobbyInspectMode = false,
  lobbyInspectAutoRotate = true,
  onToggleLobbyInspect,
  onToggleLobbyAutoRotate,
  onCraftEarlyTargetGear,
  lobbyHeadPos,
}) => {
  const [modeDrawerOpen, setModeDrawerOpen] = useState(false);
  const [modeDetailOpen, setModeDetailOpen] = useState(false);
  const [eventsHubOpen, setEventsHubOpen] = useState(false);
  const [utilityDrawerOpen, setUtilityDrawerOpen] = useState(false);
  const [skyPickerOpen, setSkyPickerOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [uiHidden, setUiHidden] = useState(false);

  useEffect(() => {
    if (activeTab !== 'battle' && uiHidden) {
      setUiHidden(false);
    }
    if (activeTab !== 'battle' && utilityDrawerOpen) {
      setUtilityDrawerOpen(false);
    }
    if (activeTab !== 'battle' && lobbyInspectMode) {
      onToggleLobbyInspect?.(false);
    }
  }, [activeTab, uiHidden, utilityDrawerOpen, lobbyInspectMode, onToggleLobbyInspect]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (lobbyInspectMode) {
        onToggleLobbyInspect?.(false);
      } else if (guideOpen) {
        setGuideOpen(false);
      } else if (modeDetailOpen) {
        setModeDetailOpen(false);
      } else if (modeDrawerOpen) {
        setModeDrawerOpen(false);
      } else if (eventsHubOpen) {
        setEventsHubOpen(false);
      } else if (utilityDrawerOpen) {
        setUtilityDrawerOpen(false);
      } else if (skyPickerOpen) {
        setSkyPickerOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    guideOpen,
    modeDetailOpen,
    modeDrawerOpen,
    eventsHubOpen,
    utilityDrawerOpen,
    skyPickerOpen,
    lobbyInspectMode,
    onToggleLobbyInspect,
  ]);

  const selectedChapter = CHAPTERS.find((c) => c.id === selectedChapterId) ?? CHAPTERS[0];
  const isChapterUnlocked = selectedChapter.id <= save.highestChapterCleared + 1;
  const activeHero = HERO_MAP[save.selectedHeroId] ?? HERO_MAP.artemis;
  const heroStar = save.heroStars[activeHero.id] ?? 0;
  const bestStage = save.bestStagePerChapter[selectedChapter.id] ?? 0;
  const powerMet = stats.powerRating >= selectedChapter.recommendedPower;

  const achClaimable = countClaimableAchievements(save);
  const unreadMailCount = countUnclaimedEligibleMail(save);
  const targetGoal = getNextTargetGoal(save);
  const vip = normalizeVip(save.vip);
  const hasVip = isVipActive(vip);
  const vipDailyReady = canClaimVipDaily(vip);
  const claimableCount = countClaimableWelfare(save);
  const bpClaimable = countClaimableBattlePass(save);
  const guild = normalizeGuild(save.guild);
  const destinyWheel = normalizeDestinyWheel(save.destinyWheel);
  const destinyReadyCount = destinyWheel.freeSpinsRemaining + destinyWheel.tickets;
  const nightMarket = normalizeNightMarket(save.nightMarket);
  const journeyReadyCount = countClaimableJourneyRewards(save, stats.powerRating);
  const spendMilestoneReady = CUMULATIVE_SPEND_MILESTONES.filter(
    (m) =>
      nightMarket.totalGemsSpent >= m.gems &&
      !nightMarket.claimedSpendMilestones.includes(m.gems)
  ).length;
  const claimableGfCount = countClaimableGrowthFund(save, stats.powerRating);
  const auctionClaimCount = normalizeAuctionHouse(save.auctionHouse).claimBox.length;
  const wave7RewardBadges = countClaimableWave7Rewards(save);
  const dispatchReadyCount = normalizeDispatchState(save.dispatch).slots.filter(
    (s) => s.missionId && s.endsAt > 0 && Date.now() >= s.endsAt
  ).length;
  const wave8Badges = countClaimableWave8Rewards(save);
  const wave9Badges = countClaimableWave9Rewards(save);
  const wave10Badges =
    (hasFreeChainStepReady(save) ? 1 : 0) +
    countClaimableVaultRewards(save) +
    countClaimablePantheonMilestones(save);
  const wave11Badges =
    countClaimableCodexRanks(save) +
    countClaimableFestivalRewards(save) +
    countClaimableChampionshipMilestones(save);
  const crystalVaultClaimCount = countClaimableCrystalVaultMilestones(save);
  const wave13Badges =
    countClaimableDragonLairMilestones(save) +
    countClaimableCarnivalRewards(save) +
    countClaimableStarlightMilestones(save);
  const wave14Badges =
    countClaimableSkyCitadelMilestones(save) +
    countClaimableAstralBoardRewards(save) +
    countClaimableGuildSanctuaryRewards(save);

  const eventsHubTotalBadges =
    claimableCount +
    bpClaimable +
    (vipDailyReady ? 1 : 0) +
    journeyReadyCount +
    dispatchReadyCount +
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

  const claimAllPreview = previewLobbyClaimAll(save);
  const equippedBadgeDef = save.equippedMythicBadgeId
    ? MYTHIC_BADGE_MAP[save.equippedMythicBadgeId]
    : undefined;
  const equippedVipFrameDef = save.equippedVipFrameId
    ? VIP_AVATAR_FRAME_MAP[save.equippedVipFrameId]
    : null;
  const equippedRoyalTitleDef = save.equippedRoyal3DTitleId
    ? ROYAL_3D_TITLE_MAP[save.equippedRoyal3DTitleId] ?? null
    : null;
  const activeWeatherId: LobbyWeatherId = save.lobbyWeather ?? 'meteor_shower';
  const activeSanctuaryFloorId: SanctuaryFloorId = save.sanctuaryFloorTheme ?? 'marble_gold';

  const handleStepChapter = (delta: number) => {
    soundEngine.playUiClick();
    const nextId = Math.max(1, Math.min(CHAPTERS.length, selectedChapterId + delta));
    onSelectChapter(nextId);
  };

  // Resolve compact summary + primary launch CTA for the currently active gameMode
  const activeModeMeta = (() => {
    if (gameMode === 'chapter') {
      const nmTier = isNightmareUnlocked(save.highestChapterCleared)
        ? Math.max(0, Math.min(5, save.selectedNightmareTier ?? 0))
        : 0;
      const roman = ['', 'I', 'II', 'III', 'IV', 'V'][nmTier] ?? '';
      return {
        shortLabel: 'Chiến Dịch',
        title: selectedChapter.name,
        subtitle: `Kỷ lục ${bestStage}/${selectedChapter.stages.length} · ${selectedChapter.bossName} · LC ${selectedChapter.recommendedPower}`,
        ctaLabel: !isChapterUnlocked
          ? `Mở C.${selectedChapter.id - 1}`
          : nmTier > 0
          ? `ÁC MỘNG ${roman}`
          : 'VÀO TRẬN NGAY',
        canStart: isChapterUnlocked,
        onStart: onStartTrial,
        detailBadge: targetGoal.canCraftNow ? 'Rèn' : undefined,
      };
    }
    if (gameMode === 'tower') {
      return {
        shortLabel: 'Tháp Vô Tận',
        title: 'Tháp Vô Tận Hoàng Đạo',
        subtitle: `Kỷ lục Tầng ${save.bestTowerFloor ?? 0} · Boss mỗi 3 tầng`,
        ctaLabel: 'LEO THÁP',
        canStart: true,
        onStart: onStartTower,
      };
    }
    if (gameMode === 'elemental_tower') {
      const towers = normalizeElementalTowers(save.elementalTowers);
      const t = ELEMENTAL_TOWER_MAP[selectedElementalTower] ?? ELEMENTAL_TOWERS[0];
      return {
        shortLabel: 'Tháp Hệ',
        title: t.name,
        subtitle: `Hệ ${t.shortName} · Kỷ lục Tầng ${towers[t.id] ?? 0}`,
        ctaLabel: 'CHINH PHỤC',
        canStart: true,
        onStart: () => onStartElementalTower(t.id),
      };
    }
    if (gameMode === 'boss_rush') {
      return {
        shortLabel: 'Săn Boss',
        title: 'Săn Boss Liên Hoàn (5 Vòng)',
        subtitle: `Kỷ lục Vòng ${save.bestBossRushRound ?? 0}/5 · Rơi Ngọc Hồn`,
        ctaLabel: 'SĂN BOSS',
        canStart: true,
        onStart: onStartBossRush,
      };
    }
    if (gameMode === 'daily_rift') {
      const rift = normalizeDailyRift(save.dailyRift);
      const pair = getDailyRiftPair(getTodayKey());
      return {
        shortLabel: 'Bí Cảnh',
        title: pair.title,
        subtitle: `${rift.runsRemaining}/${MAX_DAILY_RIFT_RUNS} lượt · Bụi Sao & Tinh Chất`,
        ctaLabel: rift.runsRemaining > 0 ? 'VÀO BÍ CẢNH' : 'HẾT LƯỢT',
        canStart: rift.runsRemaining > 0,
        onStart: onStartDailyRift,
      };
    }
    if (gameMode === 'coop_raid') {
      const coop = normalizeCoopRaid(save.coopRaid);
      const diff = COOP_DIFFICULTY_MAP[selectedCoopDifficulty] ?? COOP_RAID_DIFFICULTIES[0];
      const diffName = diff.id === 'normal' ? 'Thường' : diff.id === 'heroic' ? 'Anh Hùng' : 'Thần Thoại';
      const liveNames = (onlineAiTeammates ?? []).slice(0, 2).map((p) => p.displayName);
      const squadSuffix =
        liveNames.length > 0 ? ` · Đồng đội [AI Live]: ${liveNames.join(' & ')}` : '';
      return {
        shortLabel: 'Co-op AI',
        title: `Co-op AI · ${diffName}`,
        subtitle: `Thưởng ${coop.dailyRewardsLeft}/${COOP_RAID_MAX_DAILY_REWARDS} · Đề xuất ${diff.recommendedPower} LC${squadSuffix}`,
        ctaLabel: 'VÀO CO-OP',
        canStart: true,
        onStart: () => onStartCoopRaid(diff.id),
      };
    }
    if (gameMode === 'crystal_defense') {
      const mp = normalizeMonthlyPrivilege(save.monthlyPrivilege);
      const extra =
        (isMonthlyCardActive(mp.silver) ? 1 : 0) + (isMonthlyCardActive(mp.royal) ? 1 : 0);
      const st = normalizeCrystalDefense(save.crystalDefense);
      return {
        shortLabel: 'Thủ Pha Lê',
        title: 'Thủ Thành Pha Lê 3D',
        subtitle: `${st.runsRemaining}/${CRYSTAL_DEFENSE_MAX_DAILY_RUNS + extra} lượt · Rơi Lông Vũ`,
        ctaLabel: st.runsRemaining > 0 ? 'THỦ PHA LÊ' : 'HẾT LƯỢT',
        canStart: st.runsRemaining > 0,
        onStart: onStartCrystalDefense,
      };
    }
    if (gameMode === 'world_boss') {
      const wb = normalizeWorldBoss(save.worldBoss);
      return {
        shortLabel: 'Boss TG',
        title: 'Boss Thế Giới Liên Server',
        subtitle: `${wb.dailyRunsRemaining}/${WORLD_BOSS_MAX_DAILY_RUNS} lượt · Kỷ lục ${wb.bestSingleDamage.toLocaleString('vi-VN')} ST`,
        ctaLabel: wb.dailyRunsRemaining > 0 ? 'KHIÊU CHIẾN' : 'HẾT LƯỢT',
        canStart: wb.dailyRunsRemaining > 0,
        onStart: onStartWorldBoss,
      };
    }
    if (gameMode === 'blood_moon') {
      const bm = normalizeBloodMoon(save.bloodMoon);
      return {
        shortLabel: 'Trăng Máu',
        title: 'Đêm Trăng Máu Sinh Tồn',
        subtitle: `${bm.dailyRunsRemaining}/${BLOOD_MOON_MAX_DAILY_RUNS} lượt · Kỷ lục ${bm.bestScore.toLocaleString('vi-VN')} HT`,
        ctaLabel: bm.dailyRunsRemaining > 0 ? 'VÀO TRẬN' : 'HẾT LƯỢT',
        canStart: bm.dailyRunsRemaining > 0,
        onStart: () => onStartBloodMoon?.(),
      };
    }
    if (gameMode === 'abyssal_gauntlet') {
      const ab = normalizeAbyssalGauntlet(save.abyssalGauntlet);
      return {
        shortLabel: 'Hố Sâu 3D',
        title: 'Hố Sâu Đột Biến 3D',
        subtitle: `${ab.dailyRunsRemaining}/${ABYSSAL_GAUNTLET_MAX_DAILY_RUNS} lượt · Kỷ lục Đợt ${ab.bestWave}/10`,
        ctaLabel: ab.dailyRunsRemaining > 0 ? 'VÀO HỐ SÂU' : 'HẾT LƯỢT',
        canStart: ab.dailyRunsRemaining > 0,
        onStart: () => onStartAbyssalGauntlet?.(),
      };
    }
    if (gameMode === 'guild_war') {
      const gw = normalizeGuildWar(save.guildWar);
      return {
        shortLabel: 'Chiến Bang',
        title: 'Chiến Trường Bang Hội 3D',
        subtitle: `${gw.dailyRunsRemaining}/${GUILD_WAR_MAX_DAILY_RUNS} lượt · Điểm Tuần ${gw.weeklyScore.toLocaleString('vi-VN')}`,
        ctaLabel: gw.dailyRunsRemaining > 0 ? 'CHIẾN BANG' : 'HẾT LƯỢT',
        canStart: gw.dailyRunsRemaining > 0,
        onStart: () => onStartGuildWar?.(),
      };
    }
    if (gameMode === 'pantheon_expedition') {
      const pt = normalizePantheonExpedition(save.pantheonExpedition);
      const claim = countClaimablePantheonMilestones(save);
      return {
        shortLabel: 'Điện Thần',
        title: 'Viễn Chinh Điện Thần 3D',
        subtitle: `${pt.dailyRunsRemaining}/${MAX_DAILY_PANTHEON_RUNS} lượt · Tầng ${pt.bestDeityStage}/3`,
        ctaLabel: pt.dailyRunsRemaining > 0 ? 'ĐIỆN THẦN' : 'HẾT LƯỢT',
        canStart: pt.dailyRunsRemaining > 0,
        onStart: () => onStartPantheon?.(),
        detailBadge: claim > 0 ? `+${claim}` : undefined,
      };
    }
    if (gameMode === 'championship_3round') {
      const ch = normalizeChampionshipState(save.championship);
      const claim = countClaimableChampionshipMilestones(save);
      return {
        shortLabel: 'Quán Quân',
        title: 'Giải Quán Quân 3 Hiệp 3D',
        subtitle: `${ch.dailyRunsRemaining}/${MAX_DAILY_CHAMPIONSHIP_RUNS} lượt · ${ch.gloryTrophies.toLocaleString('vi-VN')} Cúp`,
        ctaLabel: ch.dailyRunsRemaining > 0 ? 'VÀO GIẢI' : 'HẾT LƯỢT',
        canStart: ch.dailyRunsRemaining > 0,
        onStart: () => onStartChampionship?.(),
        detailBadge: claim > 0 ? `+${claim}` : undefined,
      };
    }
    if (gameMode === 'crystal_vault') {
      const sup = isSupremeMonthlyActive(save.supremeMonthly);
      const cv = normalizeCrystalVault(save.crystalVault, sup);
      const claim = countClaimableCrystalVaultMilestones(save);
      return {
        shortLabel: 'Hầm Mỏ 3D',
        title: 'Hầm Mỏ Pha Lê Kho Báu 3D',
        subtitle: `${cv.dailyRunsRemaining}/${MAX_DAILY_CRYSTAL_VAULT_RUNS + (sup ? 1 : 0)} lượt · ${cv.totalPillarsBroken} Trụ`,
        ctaLabel: cv.dailyRunsRemaining > 0 ? 'KHAI PHÁ' : 'HẾT LƯỢT',
        canStart: cv.dailyRunsRemaining > 0,
        onStart: () => onStartCrystalVault?.(),
        detailBadge: claim > 0 ? `+${claim}` : undefined,
      };
    }
    if (gameMode === 'dragon_lair') {
      const dl = normalizeDragonLair(save.dragonLair);
      const claim = countClaimableDragonLairMilestones(save);
      return {
        shortLabel: 'Rồng Cổ 3D',
        title: 'Lãnh Địa Rồng Cổ 3D',
        subtitle: `${dl.dailyRunsRemaining}/${MAX_DAILY_DRAGON_LAIR_RUNS} lượt · ${dl.totalScalesEarned} Vảy`,
        ctaLabel: dl.dailyRunsRemaining > 0 ? 'ĐỒ LONG' : 'HẾT LƯỢT',
        canStart: dl.dailyRunsRemaining > 0,
        onStart: () => onStartDragonLair?.(),
        detailBadge: claim > 0 ? `+${claim}` : undefined,
      };
    }
    const sc = normalizeSkyCitadel(save.skyCitadel);
    const skyClaim = countClaimableSkyCitadelMilestones(save);
    return {
      shortLabel: 'Không Chiến',
      title: 'Không Chiến Tinh Giới 3D',
      subtitle: `${sc.dailyRunsRemaining}/${SKY_CITADEL_MAX_DAILY_RUNS} lượt · ${sc.totalScore.toLocaleString('vi-VN')}đ`,
      ctaLabel: sc.dailyRunsRemaining > 0 ? 'KHÔNG CHIẾN' : 'HẾT LƯỢT',
      canStart: sc.dailyRunsRemaining > 0,
      onStart: () => onStartSkyCitadel?.(),
      detailBadge: skyClaim > 0 ? `+${skyClaim}` : undefined,
    };
  })();

  // Clean 3D Lobby Photo Studio Mode
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
                Kéo xoay hoặc chọn Tư Thế &amp; Góc Máy để lưu ảnh PNG
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
            <span>Thoát Studio</span>
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
                Thời Tiết:
              </span>
              {LOBBY_WEATHER_DEFS.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(1.06);
                    onSelectLobbyWeather(w.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black whitespace-nowrap cursor-pointer ${
                    activeWeatherId === w.id
                      ? 'a2-emerald-btn'
                      : 'bg-[#090f24] border border-slate-700 text-slate-300 hover:border-cyan-300'
                  }`}
                >
                  {w.name}
                </button>
              ))}
            </div>
          )}

          {onSelectSanctuaryFloor && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-amber-400/15">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-300 mr-1">
                Sàn 3D:
              </span>
              {SANCTUARY_FLOOR_DEFS.map((fl) => (
                <button
                  key={fl.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(1.06);
                    onSelectSanctuaryFloor(fl.id);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black whitespace-nowrap cursor-pointer ${
                    activeSanctuaryFloorId === fl.id
                      ? 'a2-yellow-btn'
                      : 'bg-[#090f24] border border-slate-700 text-slate-300 hover:border-amber-300'
                  }`}
                >
                  {fl.name}
                </button>
              ))}
            </div>
          )}

          {onChangePhotoLighting && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-amber-400/15">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-200 flex items-center gap-1 mr-1">
                <Sun className="w-3 h-3 text-amber-300 shrink-0" />
                <span>Ánh Sáng Studio:</span>
              </span>
              {([
                ['golden_hall', 'Hoàng Kim Điện'],
                ['moonlit', 'Nguyệt Quang'],
                ['inferno', 'Hỏa Diệm'],
              ] as const).map(([moodId, label]) => (
                <button
                  key={moodId}
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(1.06);
                    onChangePhotoLighting(moodId);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-black whitespace-nowrap cursor-pointer ${
                    photoLightingPreset === moodId
                      ? 'a2-yellow-btn'
                      : 'bg-[#090f24] border border-slate-700 text-slate-300 hover:border-amber-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-400/20">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => onRotateHero?.(-0.45)}
                className="a2-slate-btn px-3 py-2 rounded-xl text-xs font-black cursor-pointer"
              >
                ↺ Xoay Trái
              </button>
              <button
                type="button"
                onClick={() => onRotateHero?.(0.45)}
                className="a2-slate-btn px-3 py-2 rounded-xl text-xs font-black cursor-pointer"
              >
                ↻ Xoay Phải
              </button>
              {onAdjustLobbyZoom && (
                <>
                  <button
                    type="button"
                    onClick={() => onAdjustLobbyZoom(-0.7)}
                    aria-label="Phóng to 3D"
                    className="a2-slate-btn px-2.5 py-2 rounded-xl text-xs font-black cursor-pointer"
                  >
                    <ZoomIn className="w-3.5 h-3.5 text-sky-300" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onAdjustLobbyZoom(0.7)}
                    aria-label="Thu nhỏ 3D"
                    className="a2-slate-btn px-2.5 py-2 rounded-xl text-xs font-black cursor-pointer"
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
                className="a2-slate-btn px-3 py-2 rounded-xl text-xs font-black cursor-pointer"
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
                  className="a2-purple-btn px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>Hiệu Ứng</span>
                </button>
              )}
              {onTriggerLobbyEmote && (
                <button
                  type="button"
                  onClick={() => onTriggerLobbyEmote()}
                  className="a2-slate-btn px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 text-amber-200 cursor-pointer"
                >
                  <Flame className="w-3.5 h-3.5 shrink-0 text-amber-300" />
                  <span>Giương Cung</span>
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

  // AAA Wave 7: Full-Viewport 360° Studio Inspect Mode (Hero & Weapon Turntable)
  if (lobbyInspectMode && activeTab === 'battle') {
    return (
      <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 sm:p-6">
        {/* Minimal top-left identity + top-right exit */}
        <div className="flex items-start justify-between gap-3">
          <div className="pointer-events-auto bg-[#060a18]/90 border border-amber-400/35 rounded-xl px-3.5 py-2 shadow-xl">
            <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
              Soi 360° Anh Hùng &amp; Vũ Khí
            </div>
            <div className="text-sm font-black text-white flex items-center gap-2">
              <span>{activeHero.name}</span>
              <span className="text-amber-400/70">·</span>
              <span className="text-xs font-bold text-slate-300">Kéo ngang để xoay · Cuộn để phóng to</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onToggleLobbyInspect?.(false);
            }}
            className="pointer-events-auto cel-panel-ornate px-3.5 py-2 rounded-xl text-xs font-black text-amber-200 flex items-center gap-1.5 hover:border-amber-200 cursor-pointer whitespace-nowrap shadow-xl"
          >
            <X className="w-4 h-4 text-amber-300 shrink-0" />
            <span>Thoát Soi 360°</span>
          </button>
        </div>

        {/* Sleek single-bar bottom studio dock leaving center 3D hero 100% unobstructed */}
        <div className="pointer-events-auto mx-auto cel-panel-ornate rounded-2xl px-3 py-2 flex flex-wrap items-center justify-center gap-1.5 shadow-2xl">
          {onToggleLobbyAutoRotate && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onToggleLobbyAutoRotate();
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                lobbyInspectAutoRotate ? 'a2-yellow-btn' : 'a2-slate-btn text-slate-200'
              }`}
            >
              <RotateCw className="w-3.5 h-3.5 shrink-0" />
              <span>{lobbyInspectAutoRotate ? 'Tự Xoay: Bật' : 'Tự Xoay: Tắt'}</span>
            </button>
          )}
          {onAdjustLobbyZoom && (
            <>
              <button
                type="button"
                onClick={() => onAdjustLobbyZoom(-0.7)}
                aria-label="Phóng to 3D"
                className="a2-slate-btn px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <ZoomIn className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Phóng To</span>
              </button>
              <button
                type="button"
                onClick={() => onAdjustLobbyZoom(0.7)}
                aria-label="Thu nhỏ 3D"
                className="a2-slate-btn px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 whitespace-nowrap cursor-pointer"
              >
                <ZoomOut className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                <span>Thu Nhỏ</span>
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onResetHeroRotation?.();
              onResetLobbyOrbit?.();
            }}
            className="a2-slate-btn px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer"
          >
            Góc Chuẩn
          </button>
          {onTriggerLobbyEmote && (
            <button
              type="button"
              onClick={() => onTriggerLobbyEmote()}
              className="a2-slate-btn px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 text-amber-200 whitespace-nowrap cursor-pointer"
            >
              <Flame className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Giương Cung</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full-Viewport Clean Showcase Mode (1-Tap Hide UI)
  if (uiHidden && activeTab === 'battle') {
    return (
      <div className="fixed inset-0 z-20 pointer-events-none flex items-end justify-end p-4 sm:p-6">
        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            setUiHidden(false);
          }}
          className="pointer-events-auto cel-panel-ornate px-3.5 py-2 rounded-xl text-xs font-black text-amber-200 flex items-center gap-2 hover:border-amber-200 cursor-pointer shadow-xl"
        >
          <Eye className="w-4 h-4 text-amber-300" />
          <span>Hiện Giao Diện</span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-10 pointer-events-none flex flex-col justify-between">
      {/* SLIM SINGLE-ROW TOP HEADER */}
      <header
        className={`pointer-events-auto z-20 flex items-center justify-between gap-2 px-3 sm:px-5 py-1.5 shrink-0 transition-colors ${
          activeTab === 'shop'
            ? 'bg-[#070b1a] border-b border-amber-400/25 shadow-[0_6px_20px_rgba(0,0,0,0.55)]'
            : 'bg-gradient-to-b from-[#060914]/94 via-[#090e20]/82 to-transparent'
        }`}
      >
        {/* Left: Compact Hero Portrait + Player Account Name + Cloud Sync + Power Rating */}
        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenProfileModal('profile');
            }}
            className="relative flex items-center gap-2 pr-3 pl-1 py-0.5 rounded-2xl bg-[#0a1026]/92 border border-amber-400/30 hover:border-amber-300/80 transition-colors cursor-pointer shrink-0"
            title="Mở Hồ Sơ, Tài Khoản, Thành Tựu & Thư Viện"
          >
            <div
              className={`rounded-full shrink-0 ${
                equippedVipFrameDef ? `${equippedVipFrameDef.frameClass} p-[2px]` : ''
              }`}
            >
              <ZodiacAvatar
                heroId={activeHero.id}
                accentHex={activeHero.accentHex}
                cloakHex={activeHero.cloakHex}
                hairHex={activeHero.hairHex}
                frameId={save.equippedAvatarFrameId ?? 'default_gold'}
                sizeClass="w-9 h-9"
              />
            </div>
            <div className="text-left leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-xs sm:text-sm font-black text-white whitespace-nowrap max-w-[130px] truncate">
                  {playerDisplayName || activeHero.name}
                </span>
                <span className="text-[10px] font-mono-nums font-bold text-amber-300">
                  ★{heroStar}
                </span>
                {hasVip && (
                  <span className="px-1 py-0.5 rounded bg-amber-400/20 border border-amber-300/60 text-[8px] font-black text-amber-300">
                    VIP
                  </span>
                )}
                {equippedBadgeDef && (
                  <span className="hidden lg:inline text-[9px] font-bold text-purple-200 whitespace-nowrap">
                    · {equippedBadgeDef.title}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 text-[11px] font-mono-nums">
                <span className="text-[10px] font-extrabold text-amber-400/90">LC</span>
                <span className="font-black text-amber-200">{stats.powerRating}</span>
              </div>
            </div>
            {achClaimable > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-[9px] font-black text-slate-950 font-mono-nums">
                +{achClaimable}
              </span>
            )}
          </button>

          {/* Compact Cloud Account / Sync Shortcut */}
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              if (cloudSyncStatus === 'guest' && onOpenLinkAccount) {
                onOpenLinkAccount();
              } else if (cloudSyncStatus === 'error' && onManualCloudSave) {
                onManualCloudSave();
              } else {
                onOpenProfileModal('account');
              }
            }}
            title={
              cloudSyncStatus === 'guest'
                ? 'Chế độ Khách · Bấm để đăng nhập hoặc liên kết tài khoản đám mây'
                : cloudSyncStatus === 'syncing'
                ? 'Đang lưu tiến trình lên Firebase Cloud'
                : cloudSyncStatus === 'error'
                ? 'Lỗi đồng bộ · Bấm để thử lưu lại'
                : 'Tài khoản đã đồng bộ đám mây · Bấm để quản lý tài khoản'
            }
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-bold cursor-pointer whitespace-nowrap transition-colors shrink-0 ${
              cloudSyncStatus === 'guest'
                ? 'bg-amber-500/15 border-amber-300/45 text-amber-200 hover:border-amber-200'
                : cloudSyncStatus === 'error'
                ? 'bg-rose-950/80 border-rose-400/50 text-rose-200 hover:border-rose-300'
                : cloudSyncStatus === 'syncing' || cloudSyncStatus === 'pending'
                ? 'bg-[#080d1f]/92 border-sky-400/40 text-sky-200 hover:border-sky-300'
                : 'bg-[#080d1f]/92 border-emerald-400/35 text-emerald-200 hover:border-emerald-300'
            }`}
          >
            {cloudSyncStatus === 'guest' ? (
              <CloudOff className="w-3.5 h-3.5 shrink-0" />
            ) : cloudSyncStatus === 'syncing' ? (
              <RefreshCw className="w-3.5 h-3.5 shrink-0 animate-spin" />
            ) : (
              <Cloud className="w-3.5 h-3.5 shrink-0" />
            )}
            <span className="hidden md:inline">
              {cloudSyncStatus === 'guest'
                ? 'Khách · Lưu TK'
                : cloudSyncStatus === 'syncing'
                ? 'Đang lưu…'
                : cloudSyncStatus === 'pending'
                ? 'Chờ lưu'
                : cloudSyncStatus === 'error'
                ? 'Lỗi lưu'
                : 'Đám mây'}
            </span>
          </button>
        </div>

        {/* Right: 2 Core Currencies + Conditional Quick-Claim + Clean Icon Controls */}
        <div className="flex items-center gap-1.5">
          {onOpenClaimAllModal && claimAllPreview.totalClaimableCount > 0 && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onOpenClaimAllModal();
              }}
              title="Nhận toàn bộ quà đang chờ trong 1 chạm"
              className="a2-yellow-btn px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 whitespace-nowrap cursor-pointer"
            >
              <Gift className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">Nhận Quà</span>
              <span className="font-mono-nums">+{claimAllPreview.totalClaimableCount}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenShopSection('gacha');
            }}
            title="Vàng · Mở Kho Báu"
            className="flex items-center gap-1.5 bg-[#080d1f]/92 border border-amber-400/30 hover:border-amber-300 px-2.5 py-1.5 rounded-xl text-xs font-mono-nums font-black text-amber-200 cursor-pointer"
          >
            <GoldCoinIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{save.gold}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenShopSection('chain_bank');
            }}
            title="Ngọc Hồn · Mở Chuỗi Quà & Két Tinh Ngân"
            className="flex items-center gap-1.5 bg-[#080d1f]/92 border border-purple-400/35 hover:border-purple-300 px-2.5 py-1.5 rounded-xl text-xs font-mono-nums font-black text-purple-200 cursor-pointer"
          >
            <SoulGemIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{save.gems}</span>
          </button>

          {activeTab === 'battle' && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setSkyPickerOpen(false);
                setUtilityDrawerOpen((v) => !v);
              }}
              aria-expanded={utilityDrawerOpen}
              aria-label="Kho và Tiện ích Sảnh 3D"
              title="Kho & Tiện Ích Sảnh 3D (Góc nhìn, Boss Tuần, AI Live, Chat)"
              className={`relative h-8 px-2.5 rounded-xl border flex items-center gap-1.5 text-[11px] font-black cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                utilityDrawerOpen
                  ? 'bg-amber-400/20 border-amber-300 text-amber-100'
                  : 'cel-panel text-amber-200 hover:border-amber-300'
              }`}
            >
              {utilityDrawerOpen ? (
                <X className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
              )}
              <span className="hidden md:inline">Kho &amp; Tiện Ích</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onOpenMailModal();
            }}
            aria-label="Hộp thư quà tặng"
            title="Hộp Thư Tinh Giới"
            className="relative cel-panel w-8 h-8 rounded-xl flex items-center justify-center text-amber-200 hover:border-amber-300 cursor-pointer shrink-0"
          >
            <Mail className="w-3.5 h-3.5" />
            {unreadMailCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-rose-500 border border-white text-[8px] font-mono-nums font-black text-white flex items-center justify-center">
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
            title="Cài Đặt Đồ Họa & Lưu Trữ"
            className="cel-panel w-8 h-8 rounded-xl flex items-center justify-center text-slate-200 hover:border-amber-300 cursor-pointer shrink-0"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setGuideOpen(true);
            }}
            aria-label="Cẩm nang chiến đấu"
            title="Cẩm Nang Tân Thủ"
            className="hidden sm:flex cel-panel w-8 h-8 rounded-xl items-center justify-center text-amber-200 hover:border-amber-300 cursor-pointer shrink-0"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-label={save.muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
            className="cel-panel w-8 h-8 rounded-xl flex items-center justify-center text-slate-200 hover:border-amber-300 cursor-pointer shrink-0"
          >
            {save.muted ? (
              <VolumeX className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-amber-300" />
            )}
          </button>
        </div>
      </header>

      {/* MAIN VIEWPORT AREA */}
      <main key={activeTab} className="flex-1 min-h-0 flex flex-col a2-tab-enter">
        {activeTab === 'battle' && (
          <div className="flex-1 flex flex-col justify-end px-3 sm:px-6 pb-2.5 min-h-0 relative overflow-hidden">
            {/* Optional 3D-Projected Floating Royal Title (only if equipped) */}
            {equippedRoyalTitleDef && lobbyHeadPos?.visible && (
              <div
                aria-hidden="true"
                style={{
                  left: `${lobbyHeadPos.x}px`,
                  top: `${Math.max(66, lobbyHeadPos.y - 16)}px`,
                }}
                className="fixed z-[12] pointer-events-none w14-title-float"
              >
                <div
                  className={`px-3 py-0.5 rounded-full bg-[#070b1a]/88 border ${equippedRoyalTitleDef.borderClass} text-center whitespace-nowrap`}
                >
                  <div
                    className={`font-display text-[11px] sm:text-xs font-black bg-gradient-to-r ${equippedRoyalTitleDef.gradientClass} bg-clip-text text-transparent`}
                  >
                    ✦ {equippedRoyalTitleDef.label} ✦
                  </div>
                </div>
              </div>
            )}

            {/* Collapsible Sky / Weather Popover Anchor */}
            {skyPickerOpen && onSelectSkyTheme && (
              <div className="pointer-events-auto fixed top-14 right-0 z-30">
                <Suspense fallback={null}>
                  <LobbySkyPopover
                    save={save}
                    onClose={() => setSkyPickerOpen(false)}
                    onSelectSkyTheme={onSelectSkyTheme}
                    onUnlockSkyTheme={onUnlockSkyTheme}
                    onSelectLobbyWeather={onSelectLobbyWeather}
                    onSelectSanctuaryFloor={onSelectSanctuaryFloor}
                    onResetLobbyOrbit={onResetLobbyOrbit}
                    onAdjustLobbyZoom={onAdjustLobbyZoom}
                    onReplayEntranceVfx={onReplayEntranceVfx}
                  />
                </Suspense>
              </div>
            )}

            {/* Collapsible Kho & Tiện Ích Drawer (Keeps >80% 3D Sanctuary Clear) */}
            {utilityDrawerOpen && (
              <aside
                aria-label="Kho và Tiện ích Sảnh 3D"
                className="pointer-events-auto fixed top-14 right-3 sm:right-5 z-30 w-[min(21.5rem,calc(100vw-1.5rem))] max-h-[75vh] overflow-y-auto a2-scroll cel-panel-ornate rounded-2xl p-3.5 shadow-2xl space-y-3"
              >
                <div className="flex items-center justify-between border-b border-amber-400/20 pb-2">
                  <div className="flex items-center gap-1.5">
                    <SlidersHorizontal className="w-4 h-4 text-amber-300" />
                    <span className="font-display text-xs font-black tracking-wide text-amber-200 uppercase">
                      Kho &amp; Tiện Ích
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUtilityDrawerOpen(false)}
                    aria-label="Đóng Kho và Tiện ích"
                    className="w-7 h-7 rounded-lg bg-[#0c1430] border border-amber-400/25 text-slate-300 hover:text-white flex items-center justify-center cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Section 1: LiveOps, Weekly Boss & AI Community */}
                <div className="space-y-2">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Đấu Trường &amp; Cộng Đồng Live
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {onOpenWeeklyBoss && (
                      <button
                        type="button"
                        data-weekly-boss-btn="true"
                        onClick={() => {
                          soundEngine.playUiClick(1.06);
                          setUtilityDrawerOpen(false);
                          onOpenWeeklyBoss();
                        }}
                        className="a2-slate-btn px-2.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer border border-amber-400/40 hover:border-amber-200 text-amber-200"
                      >
                        <Shield className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span className="truncate">Boss Tuần</span>
                      </button>
                    )}

                    {onOpenLiveAiHub && (
                      <button
                        type="button"
                        data-live-ai-hub-btn="true"
                        onClick={() => {
                          soundEngine.playUiClick(1.08);
                          setUtilityDrawerOpen(false);
                          onOpenLiveAiHub();
                        }}
                        className="a2-slate-btn px-2.5 py-2 rounded-xl text-xs font-black flex items-center justify-between gap-1 cursor-pointer border border-sky-400/40 hover:border-sky-200 text-sky-200"
                      >
                        <span className="flex items-center gap-1.5 min-w-0">
                          <Bot className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                          <span className="truncate">AI Live</span>
                        </span>
                        {typeof liveAiOnlineCount === 'number' && liveAiOnlineCount > 0 && (
                          <span className="font-mono-nums text-[10px] font-black text-emerald-300 shrink-0">
                            {liveAiOnlineCount}
                          </span>
                        )}
                      </button>
                    )}

                    {onOpenLiveChat && (
                      <button
                        type="button"
                        data-live-chat-btn="true"
                        onClick={() => {
                          soundEngine.playUiClick(1.05);
                          setUtilityDrawerOpen(false);
                          onOpenLiveChat('lobby');
                        }}
                        className="a2-slate-btn px-2.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer border border-amber-400/35 hover:border-amber-200 text-amber-100"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span className="truncate">Chat Sảnh</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        setUtilityDrawerOpen(false);
                        setEventsHubOpen(true);
                      }}
                      className="a2-slate-btn px-2.5 py-2 rounded-xl text-xs font-black flex items-center justify-between gap-1 cursor-pointer border border-emerald-400/35 hover:border-emerald-200 text-emerald-200"
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <Gift className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                        <span className="truncate">Sự Kiện</span>
                      </span>
                      {eventsHubTotalBadges > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black leading-none shrink-0">
                          +{eventsHubTotalBadges}
                        </span>
                      )}
                    </button>
                  </div>

                  {latestAiActivity && onOpenLiveAiHub && (
                    <button
                      type="button"
                      data-live-ai-ticker="true"
                      onClick={() => {
                        soundEngine.playUiClick(1.06);
                        setUtilityDrawerOpen(false);
                        onOpenLiveAiHub();
                      }}
                      className="w-full px-2.5 py-2 rounded-xl bg-[#070d20]/95 border border-sky-400/30 hover:border-sky-300 text-left flex items-center gap-2 transition-colors cursor-pointer"
                    >
                      <Bot className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-black text-sky-300 uppercase">
                          Tin Sảnh AI · {liveAiOnlineCount ?? 18} trực tuyến
                        </div>
                        <div className="text-[11px] font-bold text-slate-200 truncate">
                          {latestAiActivity.actorName}: {latestAiActivity.summary}
                        </div>
                      </div>
                    </button>
                  )}
                </div>

                {/* Section 2: 3D Sanctuary Camera & Showcase */}
                <div className="space-y-2 border-t border-amber-400/15 pt-2.5">
                  <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Không Gian &amp; Góc Ngắm 3D
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {onChangeCameraPreset && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          onChangeCameraPreset(cameraPreset === 'closeup' ? 'overview' : 'closeup');
                        }}
                        className="a2-slate-btn px-2.5 py-2 rounded-xl text-[11px] font-black flex items-center gap-1.5 cursor-pointer border border-amber-400/30 hover:border-amber-300 text-sky-200"
                      >
                        {cameraPreset === 'closeup' ? (
                          <ZoomOut className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <ZoomIn className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span className="truncate">
                          {cameraPreset === 'closeup' ? 'Toàn Thân' : 'Cận Cảnh'}
                        </span>
                      </button>
                    )}

                    {onSelectSkyTheme && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setUtilityDrawerOpen(false);
                          setSkyPickerOpen(true);
                        }}
                        className="a2-slate-btn px-2.5 py-2 rounded-xl text-[11px] font-black flex items-center gap-1.5 cursor-pointer border border-amber-400/30 hover:border-amber-300 text-amber-200"
                      >
                        <Sun className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span className="truncate">Bầu Trời 3D</span>
                      </button>
                    )}

                    {onTriggerLobbyEmote && (
                      <button
                        type="button"
                        onClick={() => {
                          onTriggerLobbyEmote();
                        }}
                        className="a2-slate-btn px-2.5 py-2 rounded-xl text-[11px] font-black flex items-center gap-1.5 cursor-pointer border border-amber-400/30 hover:border-amber-300 text-amber-200"
                      >
                        <Flame className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span className="truncate">Giương Cung</span>
                      </button>
                    )}

                    {onToggleLobbyInspect && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setUtilityDrawerOpen(false);
                          onToggleLobbyInspect(true);
                        }}
                        className="a2-slate-btn px-2.5 py-2 rounded-xl text-[11px] font-black flex items-center gap-1.5 cursor-pointer border border-amber-400/30 hover:border-amber-300 text-amber-100"
                      >
                        <Orbit className="w-3.5 h-3.5 text-amber-200 shrink-0" />
                        <span className="truncate">Soi 360°</span>
                      </button>
                    )}

                    {onOpenWardrobe && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setUtilityDrawerOpen(false);
                          onOpenWardrobe();
                        }}
                        className="a2-slate-btn px-2.5 py-2 rounded-xl text-[11px] font-black flex items-center gap-1.5 cursor-pointer border border-amber-400/30 hover:border-amber-300 text-amber-200"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-amber-200 shrink-0" />
                        <span className="truncate">Thử Đồ 360°</span>
                      </button>
                    )}

                    {onTogglePhotoMode && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setUtilityDrawerOpen(false);
                          onTogglePhotoMode(true);
                        }}
                        className="a2-slate-btn px-2.5 py-2 rounded-xl text-[11px] font-black flex items-center gap-1.5 cursor-pointer border border-amber-400/30 hover:border-amber-300 text-sky-200"
                      >
                        <Camera className="w-3.5 h-3.5 text-sky-200 shrink-0" />
                        <span className="truncate">Studio Ảnh</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        setUtilityDrawerOpen(false);
                        setUiHidden(true);
                      }}
                      className="col-span-2 a2-slate-btn px-2.5 py-2 rounded-xl text-[11px] font-black flex items-center justify-center gap-1.5 cursor-pointer border border-slate-600/50 hover:border-amber-300 text-slate-200"
                    >
                      <EyeOff className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                      <span>Ẩn Giao Diện Ngắm Nhân Vật 360°</span>
                    </button>
                  </div>
                </div>
              </aside>
            )}

            {/* SLIM SINGLE-BAR BOTTOM LAUNCH DOCK (Leaves >80% center completely clear) */}
            <div className="pointer-events-auto w-full max-w-3xl mx-auto z-20">
              <div className="cel-panel-ornate rounded-2xl px-2.5 sm:px-3.5 py-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shadow-2xl">
                {/* Left Pair: Compact Mode Picker + Events Hub */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      setSkyPickerOpen(false);
                      setUtilityDrawerOpen(false);
                      setModeDrawerOpen(true);
                    }}
                    className="flex-1 sm:flex-initial a2-slate-btn px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap border border-amber-400/35 hover:border-amber-300"
                  >
                    <Swords className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>{gameMode === 'chapter' ? 'Chế Độ' : activeModeMeta.shortLabel}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      setSkyPickerOpen(false);
                      setUtilityDrawerOpen(false);
                      setEventsHubOpen(true);
                    }}
                    className="flex-1 sm:flex-initial a2-slate-btn px-3 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap border border-amber-400/35 hover:border-amber-300"
                  >
                    <Gift className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                    <span>Sự Kiện</span>
                    {eventsHubTotalBadges > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black leading-none">
                        +{eventsHubTotalBadges}
                      </span>
                    )}
                  </button>
                </div>

                {/* Center: Compact Active Chapter / Active Mode Bar */}
                <div className="flex-1 min-w-0 flex items-center gap-1.5 px-1 sm:px-2 sm:border-x sm:border-amber-400/18">
                  {gameMode === 'chapter' ? (
                    <>
                      <button
                        type="button"
                        disabled={selectedChapterId <= 1}
                        onClick={() => handleStepChapter(-1)}
                        aria-label="Chương trước"
                        className="w-8 h-8 rounded-xl bg-[#0a1026] border border-amber-400/25 hover:border-amber-300 disabled:opacity-30 flex items-center justify-center text-slate-200 cursor-pointer shrink-0"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setModeDetailOpen(true);
                        }}
                        className="flex-1 min-w-0 text-center px-2 py-0.5 rounded-xl hover:bg-amber-400/10 transition-colors cursor-pointer"
                        title="Nhấn để chọn 12 Chương, Ác Mộng, Loadout & Quét Nhanh"
                      >
                        <div className="flex items-center justify-center gap-1.5">
                          <Compass className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                          <span className="font-display text-xs sm:text-sm font-black text-white truncate">
                            {selectedChapter.name}
                          </span>
                          {isNightmareUnlocked(save.highestChapterCleared) &&
                            (save.selectedNightmareTier ?? 0) > 0 && (
                              <span className="px-1.5 py-0.5 rounded bg-rose-500/25 border border-rose-400/60 text-[9px] font-black text-rose-200 shrink-0 flex items-center gap-0.5">
                                <Flame className="w-2.5 h-2.5" />
                                {['', 'I', 'II', 'III', 'IV', 'V'][save.selectedNightmareTier ?? 0]}
                              </span>
                            )}
                        </div>
                        <div className="flex items-center justify-center gap-2 text-[10px] font-mono-nums text-slate-300 truncate">
                          <span>
                            {bestStage}/{selectedChapter.stages.length} phòng
                          </span>
                          <span aria-hidden="true" className="text-amber-400/50">·</span>
                          <span className={powerMet ? 'text-emerald-300 font-bold' : 'text-orange-300 font-bold'}>
                            LC {selectedChapter.recommendedPower}
                          </span>
                          {targetGoal.canCraftNow && (
                            <>
                              <span aria-hidden="true" className="text-amber-400/50">·</span>
                              <span className="text-emerald-300 font-black">Rèn đồ mới!</span>
                            </>
                          )}
                        </div>
                      </button>

                      <button
                        type="button"
                        disabled={selectedChapterId >= CHAPTERS.length}
                        onClick={() => handleStepChapter(1)}
                        aria-label="Chương tiếp theo"
                        className="w-8 h-8 rounded-xl bg-[#0a1026] border border-amber-400/25 hover:border-amber-300 disabled:opacity-30 flex items-center justify-center text-slate-200 cursor-pointer shrink-0"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        setModeDetailOpen(true);
                      }}
                      className="flex-1 min-w-0 flex items-center justify-between gap-2 px-2.5 py-1 rounded-xl bg-[#090f24]/90 border border-amber-400/20 hover:border-amber-300 cursor-pointer text-left"
                    >
                      <div className="min-w-0">
                        <div className="font-display text-xs sm:text-sm font-black text-amber-100 truncate">
                          {activeModeMeta.title}
                        </div>
                        <div className="text-[10px] font-mono-nums text-slate-300 truncate">
                          {activeModeMeta.subtitle}
                        </div>
                      </div>
                      <span className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#121c3e] border border-amber-400/30 text-[10px] font-black text-amber-200 shrink-0 whitespace-nowrap">
                        <SlidersHorizontal className="w-3 h-3" />
                        <span>Chi Tiết</span>
                        {activeModeMeta.detailBadge && (
                          <span className="px-1 rounded bg-emerald-400 text-slate-950 text-[9px]">
                            {activeModeMeta.detailBadge}
                          </span>
                        )}
                      </span>
                    </button>
                  )}
                </div>

                {/* Right: Single High-Contrast Primary Battle CTA */}
                <button
                  type="button"
                  data-start="true"
                  disabled={!activeModeMeta.canStart}
                  onClick={activeModeMeta.onStart}
                  className={`sm:w-48 py-2.5 px-5 rounded-xl font-display font-black text-sm tracking-wider flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                    activeModeMeta.canStart
                      ? 'a2-yellow-btn'
                      : 'bg-slate-900 border border-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {!activeModeMeta.canStart && <Lock className="w-3.5 h-3.5" />}
                  <span>{activeModeMeta.ctaLabel}</span>
                  {activeModeMeta.canStart && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        )}

        <Suspense fallback={null}>
          {activeTab === 'gear' && (
            <LobbyGearPanel
              save={save}
              stats={stats}
              onEquip={onEquipGear}
              onUpgrade={onUpgradeGear}
              onTransferGearUpgrade={onTransferGearUpgrade}
              onFuse={onFuseGear}
              onAutoEquipBest={onAutoEquipBest}
              onAutoOptimizeGear={onAutoOptimizeGear}
              onBulkFuseGear={onBulkFuseGear}
              onOpenForge={onOpenForgeModal}
              onOpenForgeSubTab={onOpenForgeSubTab}
              onSaveBuildPreset={onSaveBuildPreset}
              onApplyBuildPreset={onApplyBuildPreset}
              onSaveLoadoutPreset={onSaveLoadoutPreset}
              onApplyLoadoutPreset={onApplyLoadoutPreset}
              onStartTrainingGrounds={onStartTrainingGrounds}
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
              onRotateHero={onRotateHero}
              onResetHeroRotation={onResetHeroRotation}
              onGoShop={() => onOpenShopSection('gacha')}
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
        </Suspense>
      </main>

      {/* SLEEK BOTTOM TAB BAR */}
      <nav
        aria-label="Điều hướng chính"
        className="pointer-events-auto z-20 bg-gradient-to-t from-[#050813] via-[#090e22]/96 to-[#0b1128]/92 border-t border-amber-400/25 shrink-0 px-2 sm:px-6"
      >
        <div className="max-w-3xl mx-auto grid grid-cols-5 gap-1">
          {NAV_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onTabChange(tab.id)}
                className={`relative py-2 sm:py-2.5 px-1 flex flex-col items-center justify-center gap-0.5 font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'text-amber-200 bg-gradient-to-b from-amber-400/12 to-transparent'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-4 right-4 h-[2px] bg-gradient-to-r from-transparent via-amber-300 to-transparent" />
                )}
                {tab.renderIcon(isActive)}
                <span className="text-[10px] sm:text-[11px] tracking-wide truncate max-w-full">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* CONSOLIDATED DRAWERS (Lazy-loaded on open) */}
      <Suspense fallback={null}>
        {modeDrawerOpen && (
          <LobbyModeDrawer
            save={save}
            gameMode={gameMode}
            selectedChapterId={selectedChapterId}
            onClose={() => setModeDrawerOpen(false)}
            onSelectMode={(mode, openDetail) => {
              onGameModeChange(mode);
              if (openDetail) setModeDetailOpen(true);
            }}
            onStartTrainingGrounds={onStartTrainingGrounds}
            onOpenArenaModal={onOpenArenaModal}
            onOpenCodexGuide={onOpenCodexGuide}
          />
        )}

        {modeDetailOpen && (
          <LobbyModeDetailModal
            save={save}
            stats={stats}
            gameMode={gameMode}
            selectedChapterId={selectedChapterId}
            selectedCoopDifficulty={selectedCoopDifficulty}
            selectedElementalTower={selectedElementalTower}
            onClose={() => setModeDetailOpen(false)}
            onSelectChapter={onSelectChapter}
            onSelectCoopDifficulty={onSelectCoopDifficulty}
            onSelectElementalTower={onSelectElementalTower}
            onSelectNightmareTier={onSelectNightmareTier}
            onApplyLoadoutPreset={onApplyLoadoutPreset}
            onQuickSweepChapter={onQuickSweepChapter}
            onOpenEarlyRoadmap={onOpenEarlyRoadmap}
            onCraftEarlyTargetGear={onCraftEarlyTargetGear}
            onStartTrial={onStartTrial}
            onStartTower={onStartTower}
            onStartBossRush={onStartBossRush}
            onStartDailyRift={onStartDailyRift}
            onStartCoopRaid={onStartCoopRaid}
            onStartElementalTower={onStartElementalTower}
            onStartCrystalDefense={onStartCrystalDefense}
            onStartWorldBoss={onStartWorldBoss}
            onStartBloodMoon={onStartBloodMoon}
            onClaimBloodMoonMilestone={onClaimBloodMoonMilestone}
            onStartAbyssalGauntlet={onStartAbyssalGauntlet}
            onClaimAbyssalMilestone={onClaimAbyssalMilestone}
            onStartGuildWar={onStartGuildWar}
            onClaimGuildWarBox={onClaimGuildWarBox}
            onStartPantheon={onStartPantheon}
            onSelectPantheonBlessing={onSelectPantheonBlessing}
            onClaimPantheonMilestone={onClaimPantheonMilestone}
            onStartChampionship={onStartChampionship}
            onClaimChampionshipMilestone={onClaimChampionshipMilestone}
            onStartCrystalVault={onStartCrystalVault}
            onClaimCrystalVaultMilestone={onClaimCrystalVaultMilestone}
            onStartDragonLair={onStartDragonLair}
            onClaimDragonLairMilestone={onClaimDragonLairMilestone}
            onStartSkyCitadel={onStartSkyCitadel}
            onClaimSkyCitadelMilestone={onClaimSkyCitadelMilestone}
            onOpenTalentsModal={onOpenTalentsModal}
            onOpenConstellationModal={onOpenConstellationModal}
            onOpenForgeModal={onOpenForgeModal}
            onOpenForgeSubTab={onOpenForgeSubTab}
            onOpenGuildModal={onOpenGuildModal}
            onOpenHonorBoard={onOpenHonorBoard}
            onOpenProfileModal={onOpenProfileModal}
            onTabChange={onTabChange}
            onOpenHeroSubTab={onOpenHeroSubTab}
            onOpenWave12Sanctum={onOpenWave12Sanctum}
            onOpenWave13Treasury={onOpenWave13Treasury}
            onOpenWave14Ascension={onOpenWave14Ascension}
          />
        )}

        {eventsHubOpen && (
          <LobbyEventsHubDrawer
            save={save}
            stats={stats}
            onClose={() => setEventsHubOpen(false)}
            onOpenRewardsModal={onOpenRewardsModal}
            onOpenTalentsModal={onOpenTalentsModal}
            onOpenConstellationModal={onOpenConstellationModal}
            onOpenBattlePassModal={onOpenBattlePassModal}
            onOpenVipModal={onOpenVipModal}
            onOpenForgeSubTab={onOpenForgeSubTab}
            onOpenGuildModal={onOpenGuildModal}
            onOpenDestinyWheelModal={onOpenDestinyWheelModal}
            onOpenNightMarketModal={onOpenNightMarketModal}
            onOpenArenaModal={onOpenArenaModal}
            onOpenAuctionModal={onOpenAuctionModal}
            onOpenHonorBoard={onOpenHonorBoard}
            onOpenWardrobe={onOpenWardrobe}
            onOpenDispatch={onOpenDispatch}
            onOpenProfileModal={onOpenProfileModal}
            onOpenEarlyRoadmap={onOpenEarlyRoadmap}
            onOpenFestivalModal={onOpenFestivalModal}
            onOpenShopSection={onOpenShopSection}
            onTabChange={onTabChange}
            onOpenHeroSubTab={onOpenHeroSubTab}
            onOpenWave12Sanctum={onOpenWave12Sanctum}
            onOpenWave13Treasury={onOpenWave13Treasury}
            onOpenWave13Carnival={onOpenWave13Carnival}
            onOpenWave14Ascension={onOpenWave14Ascension}
            onOpenWave14EventCenter={onOpenWave14EventCenter}
            onOpenCpBreakdown={onOpenCpBreakdown}
            onOpenClaimAllModal={onOpenClaimAllModal}
            onPowerAdvisorAction={onPowerAdvisorAction}
          />
        )}
      </Suspense>

      {/* GUIDE MODAL */}
      {guideOpen && (
        <div
          className="pointer-events-auto fixed inset-0 z-40 bg-[#040611]/88 flex items-center justify-center p-4"
          onClick={() => setGuideOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="cel-panel-ornate w-full max-w-lg rounded-3xl p-5 sm:p-6 flex flex-col gap-3.5"
          >
            <div className="flex items-center justify-between border-b border-amber-400/25 pb-3">
              <h3 className="font-display text-base sm:text-lg font-black text-amber-300">
                Cẩm Nang Chiến Đấu Aetherbow 3D
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
                <strong className="text-amber-300">1. Vừa Di Chuyển Vừa Bắn &amp; Combo 4 Nhịp:</strong> Kéo chuột / ngón tay hoặc dùng{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-amber-400/40 font-mono-nums">WASD</kbd>{' '}
                để thả diều linh hoạt trong khi vẫn xả tên liên tục (đứng yên để đạt tốc độ bắn tối đa). Mỗi phát bắn thứ 4 kích hoạt{' '}
                <strong className="text-amber-200">Đòn Kết Trăng Khuyết (+55% sát thương)</strong> phóng thêm tia kiếm khí bên sườn.
              </p>
              <p>
                <strong className="text-orange-300">2. Phá Giáp Trảm (F / Chuột Phải) &amp; Đòn Quái Chiến Thuật:</strong> Nhấn{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-amber-400/40 font-mono-nums">F</kbd>{' '}
                hoặc <strong className="text-orange-200">Chuột Phải</strong> để quét sóng năng lượng hình nón phá khiên{' '}
                <em>Khiên Vệ Binh</em> và làm choáng quái xung quanh. Nhớ né quái <em>Húc Bò</em> (chúng tự choáng nếu húc trúng tường/cột) và đừng để <em>Quái Nổ</em> áp sát.
              </p>
              <p>
                <strong className="text-emerald-300">3. Né Hoàn Hảo, Kỹ Năng (E) &amp; Chiêu Cuối (Q):</strong> Nhấn{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-amber-400/40 font-mono-nums">Space</kbd>{' '}
                để lướt né đạn,{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-amber-400/40 font-mono-nums">E</kbd>{' '}
                tung Kỹ Năng Chủ Động 3D, và{' '}
                <kbd className="px-1.5 py-0.5 rounded bg-slate-900 border border-amber-400/40 font-mono-nums">Q</kbd>{' '}
                khi Nộ đầy 100%. Khi Boss vào Pha 2 triệu hồi <strong className="text-cyan-300">Trụ Hộ Thuẫn</strong>, hãy ưu tiên bắn vỡ các trụ pha lê để phá giáp Boss!
              </p>
              <p>
                <strong className="text-sky-300">4. Sảnh Anh Hùng Gọn Nhẹ 360°:</strong> Kéo giữa màn hình Sảnh để xoay ngắm Anh Hùng; mở{' '}
                <strong className="text-amber-200">Kho &amp; Tiện Ích</strong> ở góc trên bên phải để xem Boss Tuần, Sảnh AI Live, Bầu Trời 3D hoặc Studio Chụp Ảnh.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setGuideOpen(false)}
              className="a2-yellow-btn w-full py-2.5 rounded-xl font-black text-sm cursor-pointer"
            >
              Đã Hiểu · Tiếp Tục
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Compass,
  Crown,
  Flame,
  Gem,
  Gift,
  Hammer,
  HelpCircle,
  History,
  Lock,
  Mail,
  Map,
  Settings,
  Shield,
  Skull,
  Sparkles,
  Sword,
  Swords,
  Ticket,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  X,
  Zap,
} from 'lucide-react';
import bossArenaArt from '../assets/images/boss_rush_arena_emblem_1794973982304.jpg';
import dailyRiftArt from '../assets/images/daily_rift_portal_art_1794977270758.jpg';
import eventZodiacBanner from '../assets/images/event_zodiac_banner_1794973981859.jpg';
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
  AuraStyleId,
  ComputedPlayerStats,
  FlashDealItem,
  HeroId,
  HeroSkinId,
  PetId,
  SaveData,
} from '../types/game';
import {
  GoldCoinIcon,
  HeroCrestSvg,
  PetEssenceIcon,
  SoulGemIcon,
  StarDustIcon,
} from './GameIcons';
import {
  LobbyGearPanel,
  LobbyHeroesPanel,
  LobbyRunesPanel,
  LobbyShopPanel,
} from './LobbyPanels';

export type LobbyTab = 'battle' | 'gear' | 'heroes' | 'runes' | 'shop';

interface TitleScreenProps {
  save: SaveData;
  stats: ComputedPlayerStats;
  selectedChapterId: number;
  gameMode: 'chapter' | 'tower' | 'boss_rush' | 'daily_rift';
  activeTab: LobbyTab;
  previewHeroId: HeroId;
  onTabChange: (tab: LobbyTab) => void;
  onGameModeChange: (mode: 'chapter' | 'tower' | 'boss_rush' | 'daily_rift') => void;
  onPreviewHero: (heroId: HeroId) => void;
  onSelectChapter: (chapterId: number) => void;
  onStartTrial: () => void;
  onStartTower: () => void;
  onStartBossRush: () => void;
  onStartDailyRift: () => void;
  onQuickSweepChapter: (chapterId: number) => void;
  onToggleMute: () => void;
  onOpenRewardsModal: (tab: 'checkin' | 'quests' | 'welcome') => void;
  onOpenTalentsModal: () => void;
  onOpenBattlePassModal: () => void;
  onOpenVipModal: () => void;
  onOpenForgeModal: () => void;
  onOpenForgeSubTab: (
    subTab: 'salvage' | 'forge' | 'reforge' | 'awaken',
    gearUid?: string
  ) => void;
  onOpenGuildModal: () => void;
  onOpenDestinyWheelModal: () => void;
  onOpenProfileModal: (tab?: 'profile' | 'achievements' | 'history' | 'codex') => void;
  onOpenMailModal: () => void;
  onOpenSettingsModal: () => void;
  onSelectHero: (heroId: HeroId) => void;
  onUnlockHero: (heroId: HeroId, currency: 'gold' | 'gems') => void;
  onUpgradeHeroStar: (heroId: HeroId) => void;
  onUnlockPet: (petId: PetId, currency: 'gold' | 'gems') => void;
  onEquipPet: (petId: PetId | null) => void;
  onUpgradePet: (petId: PetId) => void;
  onUnlockSkin: (skinId: HeroSkinId, currency: 'gold' | 'gems') => void;
  onEquipSkin: (heroId: HeroId, skinId: HeroSkinId) => void;
  onUnlockAura: (auraId: AuraStyleId, currency: 'gold' | 'gems') => void;
  onEquipAura: (auraId: AuraStyleId) => void;
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
  onEquipRune: (uid: string) => void;
  onUnequipRune: (uid: string) => void;
  onFuseRune: (uid: string) => void;
  onBulkFuseRunes: () => void;
  onRotateHero?: (deltaRad: number) => void;
  onResetHeroRotation?: () => void;
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
  previewHeroId,
  onTabChange,
  onGameModeChange,
  onPreviewHero,
  onSelectChapter,
  onStartTrial,
  onStartTower,
  onStartBossRush,
  onStartDailyRift,
  onQuickSweepChapter,
  onToggleMute,
  onOpenRewardsModal,
  onOpenTalentsModal,
  onOpenBattlePassModal,
  onOpenVipModal,
  onOpenForgeModal,
  onOpenForgeSubTab,
  onOpenGuildModal,
  onOpenDestinyWheelModal,
  onOpenProfileModal,
  onOpenMailModal,
  onOpenSettingsModal,
  onSelectHero,
  onUnlockHero,
  onUpgradeHeroStar,
  onUnlockPet,
  onEquipPet,
  onUpgradePet,
  onUnlockSkin,
  onEquipSkin,
  onUnlockAura,
  onEquipAura,
  onEquipGear,
  onUpgradeGear,
  onFuseGear,
  onAutoEquipBest,
  onBulkFuseGear,
  onSaveBuildPreset,
  onApplyBuildPreset,
  onOpenChestWithGacha,
  onBuyFlashDeal,
  onEquipRune,
  onUnequipRune,
  onFuseRune,
  onBulkFuseRunes,
  onRotateHero,
  onResetHeroRotation,
}) => {
  const [chapterPickerOpen, setChapterPickerOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [eventIdx, setEventIdx] = useState(0);
  const [eventImgFailed, setEventImgFailed] = useState(false);
  const [bossArenaImgFailed, setBossArenaImgFailed] = useState(false);
  const [riftImgFailed, setRiftImgFailed] = useState(false);

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

  const handleStepChapter = (delta: number) => {
    soundEngine.playUiClick();
    const nextId = Math.max(1, Math.min(CHAPTERS.length, selectedChapterId + delta));
    onSelectChapter(nextId);
  };

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
          <HeroCrestSvg
            heroId={activeHero.id}
            accentHex={activeHero.accentHex}
            cloakHex={activeHero.cloakHex}
            hairHex={activeHero.hairHex}
            className="w-9 h-9 sm:w-10 sm:h-10 shrink-0"
          />
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

        {/* Right: Clean Currency Counters & Utility Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-1.5 bg-[#070b1a]/95 border border-amber-400/35 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono-nums font-black text-amber-200">
            <GoldCoinIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{save.gold}</span>
          </div>

          <div className="flex items-center gap-1.5 bg-[#070b1a]/95 border border-purple-400/40 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-mono-nums font-black text-purple-200">
            <SoulGemIcon className="w-3.5 h-3.5 shrink-0" />
            <span>{save.gems}</span>
          </div>

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
              onOpenProfileModal('history');
            }}
            title="Bảng Vinh Danh & Lịch Sử Mùa"
            className="hidden md:flex items-center gap-1.5 bg-[#070b1a]/95 border border-sky-400/30 hover:border-amber-300 px-3 py-1.5 rounded-xl text-xs font-mono-nums font-bold text-sky-200 cursor-pointer transition-colors"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>
              {save.highestChapterCleared}/{CHAPTERS.length}
            </span>
          </button>

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

      {/* MAIN CONTENT AREA */}
      <main key={activeTab} className="flex-1 min-h-0 flex flex-col a2-tab-enter">
        {activeTab === 'battle' && (
          <div className="flex-1 flex flex-col justify-between px-3 sm:px-6 py-3 min-h-0 relative">
            {/* Upper Perimeter: Left Welfare | Center Quiet Title | Right Talents */}
            <div className="flex items-start justify-between gap-2">
              {/* Left-Edge Streamlined Welfare Stack (3 High-Signal Triggers) */}
              <div className="pointer-events-auto flex flex-col gap-2 z-10 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onOpenRewardsModal(!save.welcomeGiftClaimed ? 'welcome' : 'checkin');
                  }}
                  className="cel-panel flex items-center gap-2 px-3 py-2 rounded-xl hover:border-amber-300 text-xs font-black text-emerald-100 cursor-pointer whitespace-nowrap"
                >
                  <Gift className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span className="hidden sm:inline">Phúc Lợi</span>
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
                    onOpenBattlePassModal();
                  }}
                  className="cel-panel-ornate flex items-center gap-2 px-3 py-2 rounded-xl hover:border-amber-200 text-xs font-black text-amber-200 cursor-pointer whitespace-nowrap"
                >
                  <Crown className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="hidden sm:inline">Battle Pass</span>
                  <span className="font-mono-nums text-[10px] text-amber-300">
                    Lv.{bpInfo.level}
                  </span>
                  {bpClaimable > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-mono-nums text-[9px] font-black">
                      +{bpClaimable}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onOpenVipModal();
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap border ${
                    hasVip
                      ? 'bg-gradient-to-r from-amber-500/25 to-purple-500/25 border-amber-300/70 text-amber-200'
                      : 'cel-panel border-purple-400/45 hover:border-amber-300 text-purple-100'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="hidden sm:inline">
                    {hasVip ? 'Đặc Quyền VIP' : 'VIP & Quà Đầu'}
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
                    onOpenDestinyWheelModal();
                  }}
                  className="cel-panel-ornate flex items-center gap-2 px-3 py-2 rounded-xl hover:border-amber-200 text-xs font-black text-amber-100 cursor-pointer whitespace-nowrap"
                >
                  <Ticket className="w-4 h-4 text-amber-300 shrink-0" />
                  <span className="hidden sm:inline">Vòng Quay</span>
                  {destinyReadyCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black">
                      {destinyReadyCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Center Celestial Crest & Unboxed Metrics */}
              <div className="text-center mx-auto pt-1 px-2">
                <div className="font-display text-sm sm:text-lg font-black tracking-[0.18em] text-amber-200 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)]">
                  HOÀNG ĐẠO TINH GIỚI
                </div>
                <div className="flex items-center justify-center gap-2.5 sm:gap-3 text-[11px] sm:text-xs font-mono-nums text-slate-200/95 mt-1 drop-shadow">
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

              {/* Right-Edge Guild + Talents Tree + Featured Event Banner */}
              <div className="pointer-events-auto flex flex-col items-end gap-2 z-10 shrink-0">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      onOpenGuildModal();
                    }}
                    className="cel-panel-ornate flex items-center gap-1.5 px-3 py-2 rounded-xl hover:border-amber-200 text-xs font-black text-amber-100 cursor-pointer whitespace-nowrap"
                  >
                    <Shield className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span className="hidden sm:inline">Bang Hội</span>
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
                      onOpenTalentsModal();
                    }}
                    className="cel-panel flex items-center gap-2 px-3 py-2 rounded-xl border-amber-300/60 hover:border-amber-200 text-xs font-bold text-amber-200 cursor-pointer whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span className="hidden sm:inline">Thiên Phú</span>
                    <span className="font-mono-nums text-[11px] font-black text-amber-300">
                      Lv.{totalTalentLv}
                    </span>
                  </button>
                </div>

                {/* Rotating Featured Live-Ops Event Banner with Zodiac Art */}
                <div className="hidden md:flex flex-col w-56 cel-panel-ornate rounded-2xl overflow-hidden text-left">
                  <div className="relative h-20 w-full bg-[#0b1229]">
                    {!eventImgFailed ? (
                      <img
                        src={eventZodiacBanner}
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
                    <div className="absolute top-2 left-2.5 right-2.5 flex items-center justify-between gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-[#070b18]/90 border border-amber-400/40 text-[9px] font-black tracking-wider text-amber-300">
                        {activeEvent.badge}
                      </span>
                      <div className="flex items-center gap-1">
                        {EVENT_BANNERS.map((ev, idx) => (
                          <button
                            key={ev.id}
                            type="button"
                            aria-label={`Sự kiện ${idx + 1}`}
                            onClick={() => setEventIdx(idx)}
                            className={`h-1.5 rounded-full cursor-pointer transition-all ${
                              idx === eventIdx ? 'w-4 bg-amber-300' : 'w-1.5 bg-slate-500'
                            }`}
                          />
                        ))}
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
                        if (activeEvent.target === 'destiny_wheel') onOpenDestinyWheelModal();
                        else if (activeEvent.target === 'guild') onOpenGuildModal();
                        else if (activeEvent.target === 'shop') onTabChange('shop');
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
            <div className="w-full max-w-xl mx-auto flex flex-col gap-2.5 pointer-events-auto">
              {chapterPickerOpen && (
                <div className="cel-panel-ornate rounded-2xl p-3.5">
                  <div className="flex items-center justify-between mb-2.5">
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
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-44 overflow-y-auto a2-scroll">
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
                          className={`px-2.5 py-2 rounded-xl text-[11px] font-black flex items-center justify-between gap-1 cursor-pointer transition-colors whitespace-nowrap ${
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

              <div className="cel-panel-ornate rounded-2xl p-3.5 sm:p-4">
                {/* 4-Mode Selector */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[#060914] border border-amber-400/25 rounded-xl p-1 mb-3">
                  <button
                    type="button"
                    onClick={() => onGameModeChange('chapter')}
                    className={`py-1.5 px-2 rounded-lg text-[11px] sm:text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                      gameMode === 'chapter'
                        ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Swords className="w-3.5 h-3.5 shrink-0" />
                    <span>Thử Thách</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChapterPickerOpen(false);
                      onGameModeChange('tower');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[11px] sm:text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                      gameMode === 'tower'
                        ? 'bg-gradient-to-b from-purple-400 to-purple-700 text-white shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5 shrink-0" />
                    <span>Tháp Vô Tận</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChapterPickerOpen(false);
                      onGameModeChange('boss_rush');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[11px] sm:text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                      gameMode === 'boss_rush'
                        ? 'bg-gradient-to-b from-rose-400 to-rose-700 text-white shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5 shrink-0" />
                    <span>Săn Boss</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setChapterPickerOpen(false);
                      onGameModeChange('daily_rift');
                    }}
                    className={`py-1.5 px-2 rounded-lg text-[11px] sm:text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                      gameMode === 'daily_rift'
                        ? 'bg-gradient-to-b from-emerald-400 to-teal-600 text-slate-950 shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Bí Cảnh</span>
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
                            Chương {selectedChapter.id} · {selectedChapter.name}
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

                    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-nums border-y border-amber-400/15 py-2 px-1">
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

                    <div className="mt-3 flex flex-wrap sm:flex-nowrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setChapterPickerOpen((v) => !v)}
                        className="a2-slate-btn px-3 py-3 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                      >
                        <Map className="w-4 h-4 text-amber-300 shrink-0" />
                        <span>12 Chương</span>
                      </button>

                      {isChapterCleared && (
                        <button
                          type="button"
                          disabled={dailySweeps.remaining <= 0}
                          onClick={() => onQuickSweepChapter(selectedChapter.id)}
                          className={`px-3 py-3 rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
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
                        disabled={!isChapterUnlocked}
                        onClick={onStartTrial}
                        className={`flex-1 py-3 px-4 rounded-xl font-display font-black text-sm sm:text-base tracking-wider flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
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
            onRotateHero={onRotateHero}
            onResetHeroRotation={onResetHeroRotation}
            onGoShop={() => onTabChange('shop')}
          />
        )}

        {activeTab === 'heroes' && (
          <LobbyHeroesPanel
            save={save}
            previewHeroId={previewHeroId}
            onPreviewHero={onPreviewHero}
            onSelectHero={onSelectHero}
            onUnlockHero={onUnlockHero}
            onUpgradeHeroStar={onUpgradeHeroStar}
            onUnlockPet={onUnlockPet}
            onEquipPet={onEquipPet}
            onUpgradePet={onUpgradePet}
            onUnlockSkin={onUnlockSkin}
            onEquipSkin={onEquipSkin}
            onUnlockAura={onUnlockAura}
            onEquipAura={onEquipAura}
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
            save={save}
            onOpenChestWithGacha={onOpenChestWithGacha}
            onBuyFlashDeal={onBuyFlashDeal}
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

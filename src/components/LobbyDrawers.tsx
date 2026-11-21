import React, { useState } from 'react';
import {
  BookOpen,
  ChevronRight,
  Compass,
  Crosshair,
  Crown,
  Dice5,
  Feather,
  Flag,
  Flame,
  Gavel,
  Gem,
  Gift,
  Hammer,
  History,
  Lock,
  Map,
  Megaphone,
  Moon,
  RotateCcw,
  ScrollText,
  Send,
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
  X,
  Zap,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { CHAPTERS } from '../data/chaptersData';
import {
  getEarlyProgressionPolicy,
  getNextTargetGoal,
  isEarlyFeatureUnlocked,
  normalizeLoadoutPresets,
} from '../data/earlyProgressionData';
import {
  computePowerPressure,
  countClaimableFairRoadmapMilestones,
  evaluateMaxStageReadiness,
} from '../data/fairProgression30Day';
import {
  MAX_DAILY_SWEEPS,
  countClaimableBattlePass,
  getBattlePassLevelInfo,
  normalizeBattlePass,
  normalizeDailySweeps,
} from '../data/liveOpsData';
import { getNightmareTierConfig, isNightmareUnlocked } from '../data/phase5Data';
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
import { normalizeDestinyWheel, normalizeGuild } from '../data/wave4Data';
import {
  CUMULATIVE_SPEND_MILESTONES,
  countClaimableJourneyRewards,
  normalizeArena,
  normalizeNightMarket,
} from '../data/wave5Data';
import {
  COOP_DIFFICULTY_MAP,
  COOP_RAID_DIFFICULTIES,
  COOP_RAID_MAX_DAILY_REWARDS,
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
  normalizeBloodMoon,
  normalizeDispatchState,
  normalizeWishPool,
} from '../data/wave8Data';
import {
  ABYSSAL_GAUNTLET_MAX_DAILY_RUNS,
  ABYSSAL_GAUNTLET_TOTAL_WAVES,
  ABYSSAL_MILESTONES,
  GUILD_WAR_DURATION_SEC,
  GUILD_WAR_MAX_DAILY_RUNS,
  GUILD_WAR_WEEKLY_BOXES,
  PowerRecommendation,
  computePowerAdvisor,
  normalizeAbyssalGauntlet,
  normalizeGuildWar,
} from '../data/wave9Data';
import {
  DIVINE_HALO_CATALOG,
  GEM_VAULT_CAPACITY,
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
  countClaimableCarnivalRewards,
  countClaimableDragonLairMilestones,
  countClaimableStarlightMilestones,
  normalizeDragonLair,
} from '../data/wave13Data';
import {
  SANCTUARY_FLOOR_DEFS,
  SKY_CITADEL_MAX_DAILY_RUNS,
  SKY_CITADEL_MILESTONES,
  countClaimableAstralBoardRewards,
  countClaimableSkyCitadelMilestones,
  normalizeAstralBoard,
  normalizeSkyCitadel,
} from '../data/wave14Data';
import {
  ComputedPlayerStats,
  CoopRaidDifficulty,
  EarlyFeatureId,
  ElementalTowerId,
  LobbySkyThemeId,
  LobbyWeatherId,
  PantheonBlessingId,
  SanctuaryFloorId,
  SaveData,
} from '../types/game';
import {
  ArtifactRelicIcon,
  AwakenCrystalIcon,
  MountShardIcon,
  MysticTokenIcon,
  PetEssenceIcon,
  StarDustIcon,
  WingFeatherIcon,
} from './GameIcons';
import { ShopSectionTab } from './LobbyPanels';
import { LobbyGameMode, LobbyTab } from './TitleScreen';
import { Wave12SanctumTab } from './Wave12SanctumModal';
import { Wave13Tab } from './Wave13TreasuryModal';
import { Wave14Tab } from './Wave14AscensionModal';

/* ============================================================================
 * 1. MODE SELECTOR DRAWER (Organizes all 16+ modes cleanly out of the lobby)
 * ========================================================================== */

interface LobbyModeDrawerProps {
  save: SaveData;
  gameMode: LobbyGameMode;
  selectedChapterId: number;
  onClose: () => void;
  onSelectMode: (mode: LobbyGameMode, openDetail?: boolean) => void;
  onStartTrainingGrounds?: () => void;
  onOpenArenaModal: () => void;
  onOpenCodexGuide?: () => void;
}

export const LobbyModeDrawer: React.FC<LobbyModeDrawerProps> = ({
  save,
  gameMode,
  selectedChapterId,
  onClose,
  onSelectMode,
  onStartTrainingGrounds,
  onOpenArenaModal,
  onOpenCodexGuide,
}) => {
  const arena = normalizeArena(save.arena);
  const dailyRift = normalizeDailyRift(save.dailyRift);
  const coopState = normalizeCoopRaid(save.coopRaid);
  const monthlyPriv = normalizeMonthlyPrivilege(save.monthlyPrivilege);
  const extraDefenseMax =
    (isMonthlyCardActive(monthlyPriv.silver) ? 1 : 0) +
    (isMonthlyCardActive(monthlyPriv.royal) ? 1 : 0);
  const crystalState = normalizeCrystalDefense(save.crystalDefense);
  const crystalMaxRuns = CRYSTAL_DEFENSE_MAX_DAILY_RUNS + extraDefenseMax;
  const wbState = normalizeWorldBoss(save.worldBoss);
  const bloodMoonState = normalizeBloodMoon(save.bloodMoon);
  const abyssalState = normalizeAbyssalGauntlet(save.abyssalGauntlet);
  const guildWarState = normalizeGuildWar(save.guildWar);
  const pantheonState = normalizePantheonExpedition(save.pantheonExpedition);
  const championshipState = normalizeChampionshipState(save.championship);
  const supremeActive = isSupremeMonthlyActive(save.supremeMonthly);
  const crystalVaultState = normalizeCrystalVault(save.crystalVault, supremeActive);
  const dragonLairState = normalizeDragonLair(save.dragonLair);
  const skyCitadelState = normalizeSkyCitadel(save.skyCitadel);

  const pantheonClaim = countClaimablePantheonMilestones(save);
  const champClaim = countClaimableChampionshipMilestones(save);
  const vaultClaim = countClaimableCrystalVaultMilestones(save);
  const dragonClaim = countClaimableDragonLairMilestones(save);
  const skyClaim = countClaimableSkyCitadelMilestones(save);

  const arenaUnlock = isEarlyFeatureUnlocked(save, 'arena');

  const renderModeCard = (opts: {
    id: LobbyGameMode;
    label: string;
    sub: string;
    icon: React.ReactNode;
    badge?: string;
    accentClass: string;
    openDetailOnPick?: boolean;
    featureGate?: EarlyFeatureId;
  }) => {
    const active = gameMode === opts.id;
    const gateStatus = opts.featureGate ? isEarlyFeatureUnlocked(save, opts.featureGate) : null;
    const locked = gateStatus ? !gateStatus.unlocked : false;

    return (
      <button
        key={opts.id}
        type="button"
        disabled={locked}
        onClick={() => {
          if (locked) return;
          soundEngine.playUiClick(1.04);
          onSelectMode(opts.id, opts.openDetailOnPick);
          onClose();
        }}
        className={`rounded-2xl p-2.5 text-left border transition-colors flex items-center justify-between gap-2 ${
          locked
            ? 'bg-slate-950/60 border-slate-700/50 opacity-60 cursor-not-allowed'
            : active
            ? 'bg-amber-400/18 border-amber-300 shadow cursor-pointer'
            : 'bg-[#091026] border-amber-400/18 hover:border-amber-300/60 cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-white/10 ${
              locked ? 'bg-slate-900/90' : opts.accentClass
            }`}
          >
            {locked ? <Lock className="w-4 h-4 text-slate-400" /> : opts.icon}
          </div>
          <div className="min-w-0">
            <div className={`text-xs font-black truncate ${locked ? 'text-slate-300' : 'text-white'}`}>
              {opts.label}
            </div>
            <div className="text-[10px] text-slate-400 truncate font-mono-nums">
              {locked && gateStatus ? gateStatus.requiredLabel : opts.sub}
            </div>
          </div>
        </div>
        {!locked && opts.badge && (
          <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black shrink-0">
            {opts.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 bg-[#040611]/82 flex items-end sm:items-center justify-center p-2.5 sm:p-5"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="cel-panel-ornate w-full max-w-3xl max-h-[82vh] rounded-3xl flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-amber-400/20 bg-[#091028]">
          <div className="flex items-center gap-2">
            <Swords className="w-4 h-4 text-amber-300" />
            <h2 className="font-display text-sm sm:text-base font-black text-amber-200 tracking-wide">
              Chọn Chế Độ Chiến Đấu
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chọn chế độ"
            className="cel-panel w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto a2-scroll p-4 sm:p-5 space-y-4">
          {/* Group 1: Campaign & Practice */}
          <section className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300/90">
              Chiến Dịch &amp; Luyện Tập
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {renderModeCard({
                id: 'chapter',
                label: 'Thử Thách 12 Chương',
                sub: `Chương ${selectedChapterId} · Ác Mộng I–V`,
                icon: <Swords className="w-4 h-4 text-amber-200" />,
                accentClass: 'bg-amber-500/20',
              })}
              {onStartTrainingGrounds && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(1.05);
                    onClose();
                    onStartTrainingGrounds();
                  }}
                  className="rounded-2xl p-2.5 text-left border bg-[#091026] border-sky-400/25 hover:border-sky-300 cursor-pointer flex items-center gap-2.5"
                >
                  <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-white/10 flex items-center justify-center shrink-0">
                    <Crosshair className="w-4 h-4 text-sky-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-sky-100 truncate">Sân Tập 3D (DPS)</div>
                    <div className="text-[10px] text-slate-400 truncate">Đo sát thương miễn phí</div>
                  </div>
                </button>
              )}
              {onOpenCodexGuide && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onClose();
                    onOpenCodexGuide();
                  }}
                  className="rounded-2xl p-2.5 text-left border bg-[#091026] border-amber-400/20 hover:border-amber-300 cursor-pointer flex items-center gap-2.5"
                >
                  <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-white/10 flex items-center justify-center shrink-0">
                    <BookOpen className="w-4 h-4 text-amber-300" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-amber-100 truncate">Sổ Tay Chiến Thuật</div>
                    <div className="text-[10px] text-slate-400 truncate">9 Cộng Hưởng · 12 Boss</div>
                  </div>
                </button>
              )}
            </div>
          </section>

          {/* Group 2: Daily Towers & Resource Runs */}
          <section className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-sky-300/90">
              Tháp &amp; Phó Bản Tài Nguyên
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {renderModeCard({
                id: 'tower',
                label: 'Tháp Vô Tận',
                sub: `Kỷ lục Tầng ${save.bestTowerFloor ?? 0}`,
                icon: <Compass className="w-4 h-4 text-purple-300" />,
                accentClass: 'bg-purple-500/20',
                featureGate: 'endless_tower',
              })}
              {renderModeCard({
                id: 'elemental_tower',
                label: 'Tháp Hệ (3 Nguyên Tố)',
                sub: 'Hỏa · Băng · Lôi · Chọn hệ',
                icon: <Zap className="w-4 h-4 text-sky-300" />,
                accentClass: 'bg-sky-500/20',
                openDetailOnPick: true,
                featureGate: 'elemental_towers',
              })}
              {renderModeCard({
                id: 'daily_rift',
                label: 'Bí Cảnh Ngày',
                sub: `${dailyRift.runsRemaining}/${MAX_DAILY_RIFT_RUNS} lượt · Bụi & Tinh Linh`,
                icon: <Sparkles className="w-4 h-4 text-emerald-300" />,
                accentClass: 'bg-emerald-500/20',
                featureGate: 'daily_rift',
              })}
              {renderModeCard({
                id: 'crystal_vault',
                label: 'Hầm Mỏ Pha Lê 3D',
                sub: `${crystalVaultState.dailyRunsRemaining}/${MAX_DAILY_CRYSTAL_VAULT_RUNS + (supremeActive ? 1 : 0)} lượt · 60s`,
                icon: <Gem className="w-4 h-4 text-amber-300" />,
                badge: vaultClaim > 0 ? `+${vaultClaim}` : undefined,
                accentClass: 'bg-amber-500/20',
                featureGate: 'crystal_vault',
              })}
            </div>
          </section>

          {/* Group 3: Boss & Co-op */}
          <section className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-300/90">
              Săn Boss &amp; Tổ Đội
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {renderModeCard({
                id: 'boss_rush',
                label: 'Săn Boss Liên Hoàn',
                sub: `Kỷ lục Vòng ${save.bestBossRushRound ?? 0}/5`,
                icon: <Flame className="w-4 h-4 text-rose-300" />,
                accentClass: 'bg-rose-500/20',
              })}
              {renderModeCard({
                id: 'coop_raid',
                label: 'Co-op AI (3 Anh Hùng)',
                sub: `Thưởng chính ${coopState.dailyRewardsLeft}/${COOP_RAID_MAX_DAILY_REWARDS}`,
                icon: <Users className="w-4 h-4 text-orange-300" />,
                accentClass: 'bg-orange-500/20',
                openDetailOnPick: true,
                featureGate: 'coop_raid',
              })}
              {renderModeCard({
                id: 'crystal_defense',
                label: 'Thủ Pha Lê 3D',
                sub: `${crystalState.runsRemaining}/${crystalMaxRuns} lượt · Rơi Lông Vũ`,
                icon: <Gem className="w-4 h-4 text-cyan-300" />,
                accentClass: 'bg-cyan-500/20',
                featureGate: 'crystal_defense',
              })}
              {renderModeCard({
                id: 'world_boss',
                label: 'Boss Thế Giới',
                sub: `${wbState.dailyRunsRemaining}/${WORLD_BOSS_MAX_DAILY_RUNS} lượt · 60s`,
                icon: <Trophy className="w-4 h-4 text-amber-300" />,
                accentClass: 'bg-amber-500/20',
                featureGate: 'world_boss',
              })}
              {renderModeCard({
                id: 'dragon_lair',
                label: 'Lãnh Địa Rồng Cổ 3D',
                sub: `${dragonLairState.dailyRunsRemaining}/${MAX_DAILY_DRAGON_LAIR_RUNS} lượt · 3 Pha`,
                icon: <Flame className="w-4 h-4 text-rose-400" />,
                badge: dragonClaim > 0 ? `+${dragonClaim}` : undefined,
                accentClass: 'bg-rose-600/25',
                featureGate: 'dragon_lair',
              })}
            </div>
          </section>

          {/* Group 4: Endgame & Competitive */}
          <section className="space-y-2">
            <div className="text-[10px] font-black uppercase tracking-[0.18em] text-purple-300/90">
              Đỉnh Cao &amp; Liên Đấu
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <button
                type="button"
                disabled={!arenaUnlock.unlocked}
                onClick={() => {
                  if (!arenaUnlock.unlocked) return;
                  soundEngine.playUiClick(1.05);
                  onClose();
                  onOpenArenaModal();
                }}
                className={`rounded-2xl p-2.5 text-left border flex items-center justify-between gap-2 ${
                  arenaUnlock.unlocked
                    ? 'bg-[#091026] border-rose-400/30 hover:border-rose-300 cursor-pointer'
                    : 'bg-slate-950/60 border-slate-700/50 opacity-60 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`w-8 h-8 rounded-xl border border-white/10 flex items-center justify-center shrink-0 ${
                      arenaUnlock.unlocked ? 'bg-rose-500/20' : 'bg-slate-900/90'
                    }`}
                  >
                    {arenaUnlock.unlocked ? (
                      <Swords className="w-4 h-4 text-rose-300" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-black truncate ${arenaUnlock.unlocked ? 'text-rose-100' : 'text-slate-300'}`}>
                      Đấu Trường Arena
                    </div>
                    <div className="text-[10px] text-slate-400 truncate font-mono-nums">
                      {arenaUnlock.unlocked
                        ? `Xếp hạng PvP · ${arena.ticketsRemaining} vé`
                        : arenaUnlock.requiredLabel}
                    </div>
                  </div>
                </div>
                {arenaUnlock.unlocked && arena.ticketsRemaining > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-500 text-white font-mono-nums text-[9px] font-black shrink-0">
                    {arena.ticketsRemaining}
                  </span>
                )}
              </button>

              {renderModeCard({
                id: 'blood_moon',
                label: 'Đêm Trăng Máu',
                sub: `${bloodMoonState.dailyRunsRemaining}/${BLOOD_MOON_MAX_DAILY_RUNS} lượt · ${BLOOD_MOON_DURATION_SEC}s`,
                icon: <Moon className="w-4 h-4 text-rose-300" />,
                accentClass: 'bg-rose-500/20',
                featureGate: 'blood_moon',
              })}
              {renderModeCard({
                id: 'abyssal_gauntlet',
                label: 'Hố Sâu Đột Biến 3D',
                sub: `${abyssalState.dailyRunsRemaining}/${ABYSSAL_GAUNTLET_MAX_DAILY_RUNS} lượt · ${ABYSSAL_GAUNTLET_TOTAL_WAVES} đợt`,
                icon: <Skull className="w-4 h-4 text-purple-300" />,
                accentClass: 'bg-purple-500/20',
                featureGate: 'abyssal_gauntlet',
              })}
              {renderModeCard({
                id: 'guild_war',
                label: 'Chiến Trường Bang 3D',
                sub: `${guildWarState.dailyRunsRemaining}/${GUILD_WAR_MAX_DAILY_RUNS} lượt · ${GUILD_WAR_DURATION_SEC}s`,
                icon: <Shield className="w-4 h-4 text-emerald-300" />,
                accentClass: 'bg-emerald-500/20',
                featureGate: 'meta_events',
              })}
              {renderModeCard({
                id: 'pantheon_expedition',
                label: 'Viễn Chinh Điện Thần 3D',
                sub: `${pantheonState.dailyRunsRemaining}/${MAX_DAILY_PANTHEON_RUNS} lượt · 3 Thần Chủ`,
                icon: <Crown className="w-4 h-4 text-amber-300" />,
                badge: pantheonClaim > 0 ? `+${pantheonClaim}` : undefined,
                accentClass: 'bg-amber-500/20',
                openDetailOnPick: true,
                featureGate: 'pantheon_expedition',
              })}
              {renderModeCard({
                id: 'championship_3round',
                label: 'Giải Quán Quân 3 Hiệp',
                sub: `${championshipState.dailyRunsRemaining}/${MAX_DAILY_CHAMPIONSHIP_RUNS} lượt · Cúp`,
                icon: <Trophy className="w-4 h-4 text-amber-200" />,
                badge: champClaim > 0 ? `+${champClaim}` : undefined,
                accentClass: 'bg-amber-500/20',
                featureGate: 'meta_events',
              })}
              {renderModeCard({
                id: 'sky_citadel',
                label: 'Không Chiến Tinh Giới 3D',
                sub: `${skyCitadelState.dailyRunsRemaining}/${SKY_CITADEL_MAX_DAILY_RUNS} lượt · Thần Cánh`,
                icon: <Feather className="w-4 h-4 text-sky-300" />,
                badge: skyClaim > 0 ? `+${skyClaim}` : undefined,
                accentClass: 'bg-sky-500/20',
                featureGate: 'sky_citadel',
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 2. MODE DETAIL / CHAPTER SHEET (Clean modal for chapter map, Nightmare,
 *    Loadout presets, difficulties, blessings, and mode milestones)
 * ========================================================================== */

interface LobbyModeDetailModalProps {
  save: SaveData;
  stats: ComputedPlayerStats;
  gameMode: LobbyGameMode;
  selectedChapterId: number;
  selectedCoopDifficulty: CoopRaidDifficulty;
  selectedElementalTower: ElementalTowerId;
  onClose: () => void;
  onSelectChapter: (chapterId: number) => void;
  onSelectCoopDifficulty: (d: CoopRaidDifficulty) => void;
  onSelectElementalTower: (t: ElementalTowerId) => void;
  onSelectNightmareTier?: (tier: number) => void;
  onApplyLoadoutPreset?: (slotId: 'preset_1' | 'preset_2' | 'preset_3') => void;
  onQuickSweepChapter: (chapterId: number) => void;
  onOpenEarlyRoadmap?: () => void;
  onCraftEarlyTargetGear?: (tier: 'rare' | 'epic' | 's_tier') => void;
  onStartTrial: () => void;
  onStartTower: () => void;
  onStartBossRush: () => void;
  onStartDailyRift: () => void;
  onStartCoopRaid: (d: CoopRaidDifficulty) => void;
  onStartElementalTower: (t: ElementalTowerId) => void;
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
  onClaimChampionshipMilestone?: (trophies: number) => void;
  onStartCrystalVault?: () => void;
  onClaimCrystalVaultMilestone?: (pillars: number) => void;
  onStartDragonLair?: () => void;
  onClaimDragonLairMilestone?: (scales: number) => void;
  onStartSkyCitadel?: () => void;
  onClaimSkyCitadelMilestone?: (score: number) => void;
  onOpenTalentsModal: () => void;
  onOpenConstellationModal: () => void;
  onOpenForgeModal: () => void;
  onOpenForgeSubTab: (subTab: 'salvage' | 'forge' | 'reforge' | 'awaken' | 'sockets') => void;
  onOpenGuildModal: () => void;
  onOpenHonorBoard: () => void;
  onOpenProfileModal: (tab?: 'profile' | 'achievements' | 'history' | 'codex') => void;
  onTabChange: (tab: LobbyTab) => void;
  onOpenHeroSubTab?: (
    subTab: 'roster' | 'pets' | 'cosmetics' | 'wings' | 'mounts' | 'artifacts' | 'halos'
  ) => void;
  onOpenWave12Sanctum?: (tab: Wave12SanctumTab) => void;
  onOpenWave13Treasury?: (tab: Wave13Tab) => void;
  onOpenWave14Ascension?: (tab: Wave14Tab) => void;
}

export const LobbyModeDetailModal: React.FC<LobbyModeDetailModalProps> = ({
  save,
  stats,
  gameMode,
  selectedChapterId,
  selectedCoopDifficulty,
  selectedElementalTower,
  onClose,
  onSelectChapter,
  onSelectCoopDifficulty,
  onSelectElementalTower,
  onSelectNightmareTier,
  onApplyLoadoutPreset,
  onQuickSweepChapter,
  onOpenEarlyRoadmap,
  onCraftEarlyTargetGear,
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
  onStartCrystalVault,
  onClaimCrystalVaultMilestone,
  onStartDragonLair,
  onClaimDragonLairMilestone,
  onStartSkyCitadel,
  onClaimSkyCitadelMilestone,
  onOpenTalentsModal,
  onOpenConstellationModal,
  onOpenForgeModal,
  onOpenForgeSubTab,
  onOpenGuildModal,
  onOpenHonorBoard,
  onOpenProfileModal,
  onTabChange,
  onOpenHeroSubTab,
  onOpenWave12Sanctum,
  onOpenWave13Treasury,
  onOpenWave14Ascension,
}) => {
  const selectedChapter = CHAPTERS.find((c) => c.id === selectedChapterId) ?? CHAPTERS[0];
  const isChapterUnlocked = selectedChapter.id <= save.highestChapterCleared + 1;
  const isChapterCleared = selectedChapter.id <= save.highestChapterCleared;
  const bestStage = save.bestStagePerChapter[selectedChapter.id] ?? 0;
  const earlyPolicy = getEarlyProgressionPolicy(save);
  const targetGoal = getNextTargetGoal(save);
  const sweepUnlock = isEarlyFeatureUnlocked(save, 'sweep');
  const vip = normalizeVip(save.vip);
  const hasVip = isVipActive(vip);
  const dailySweeps = normalizeDailySweeps(save.dailySweeps, hasVip);
  const maxSweeps = MAX_DAILY_SWEEPS + (hasVip ? 2 : 0);
  const savedLoadouts = normalizeLoadoutPresets(save.loadoutPresets);

  const dailyRift = normalizeDailyRift(save.dailyRift);
  const todayRiftPair = getDailyRiftPair(getTodayKey());
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
  const bloodMoonState = normalizeBloodMoon(save.bloodMoon);
  const abyssalState = normalizeAbyssalGauntlet(save.abyssalGauntlet);
  const guildWarState = normalizeGuildWar(save.guildWar);
  const pantheonState = normalizePantheonExpedition(save.pantheonExpedition);
  const championshipState = normalizeChampionshipState(save.championship);
  const supremeActive = isSupremeMonthlyActive(save.supremeMonthly);
  const crystalVaultState = normalizeCrystalVault(save.crystalVault, supremeActive);
  const dragonLairState = normalizeDragonLair(save.dragonLair);
  const skyCitadelState = normalizeSkyCitadel(save.skyCitadel);
  const astralBoardState = normalizeAstralBoard(save.astralBoard);

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 bg-[#040611]/82 flex items-end sm:items-center justify-center p-2.5 sm:p-5"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="cel-panel-ornate w-full max-w-2xl max-h-[82vh] rounded-3xl flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-amber-400/20 bg-[#091028]">
          <div className="flex items-center gap-2 min-w-0">
            <Map className="w-4 h-4 text-amber-300 shrink-0" />
            <h2 className="font-display text-sm sm:text-base font-black text-amber-200 truncate">
              {gameMode === 'chapter'
                ? 'Bản Đồ 12 Chương & Thiết Lập Chiến Dịch'
                : 'Tùy Chọn & Phần Thưởng Chế Độ'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng chi tiết chế độ"
            className="cel-panel w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto a2-scroll p-4 sm:p-5 space-y-4">
          {gameMode === 'chapter' && (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                {CHAPTERS.map((ch) => {
                  const unlocked = ch.id <= save.highestChapterCleared + 1;
                  const active = ch.id === selectedChapterId;
                  return (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onSelectChapter(ch.id);
                      }}
                      className={`px-2.5 py-2 rounded-xl text-[11px] font-black flex items-center justify-between gap-1 cursor-pointer transition-colors whitespace-nowrap ${
                        active
                          ? 'a2-yellow-btn'
                          : unlocked
                          ? 'bg-[#101936] hover:bg-[#192652] border border-amber-400/25 text-slate-100'
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

              {(() => {
                const effectiveRecPower = Math.round(
                  selectedChapter.recommendedPower * (1 + (save.selectedNightmareTier ?? 0) * 0.35)
                );
                const pressure = computePowerPressure(stats.powerRating, effectiveRecPower);
                return (
                  <div className="rounded-2xl bg-[#080f24] border border-amber-400/25 p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-display text-sm sm:text-base font-black text-white">
                        {selectedChapter.zodiacIcon} {selectedChapter.name}
                      </div>
                      <span className="text-[11px] font-mono-nums font-bold text-amber-300">
                        Kỷ lục {bestStage}/{selectedChapter.stages.length}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{selectedChapter.subtitle}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-nums pt-1 border-t border-amber-400/15">
                      <span className="text-rose-300 font-bold">Trùm: {selectedChapter.bossName}</span>
                      <span className={`${pressure.textClass} font-bold`}>
                        Đề xuất LC {effectiveRecPower.toLocaleString('vi-VN')} (Bạn:{' '}
                        {stats.powerRating.toLocaleString('vi-VN')}) · {pressure.shortLabel}
                      </span>
                    </div>
                    {pressure.tier !== 'ready' && (
                      <div className={`text-[11px] leading-relaxed ${pressure.textClass}`}>
                        {pressure.description}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="rounded-2xl bg-[#081026] border border-amber-400/20 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-black text-amber-200">{targetGoal.title}</span>
                  {onOpenEarlyRoadmap && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenEarlyRoadmap();
                      }}
                      className="text-[11px] font-bold text-amber-300 hover:text-amber-100 underline cursor-pointer whitespace-nowrap"
                    >
                      Lộ Trình 30 Ngày
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2 text-[11px] font-mono-nums text-slate-300">
                  <span>
                    {targetGoal.current}/{targetGoal.target} · {earlyPolicy.stageLabel}
                  </span>
                </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(4, Math.round((targetGoal.current / Math.max(1, targetGoal.target)) * 100))
                          )}%`,
                        }}
                      />
                    </div>
                    {targetGoal.canCraftNow && onCraftEarlyTargetGear && (
                      <button
                        type="button"
                        onClick={() => onCraftEarlyTargetGear(targetGoal.tier)}
                        className="a2-emerald-btn px-3 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer"
                      >
                        <Hammer className="w-3 h-3" />
                      <span>Rèn Ngay</span>
                    </button>
                  )}
                </div>
              </div>

              {savedLoadouts.length > 0 && onApplyLoadoutPreset && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#080f24] border border-amber-400/20 px-3.5 py-2.5">
                  <span className="text-xs font-black text-slate-200">Bộ Loadout Nhanh</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {savedLoadouts.map((preset) => {
                      const active = save.activeLoadoutPresetId === preset.slotId;
                      return (
                        <button
                          key={preset.slotId}
                          type="button"
                          onClick={() => onApplyLoadoutPreset(preset.slotId)}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-black border cursor-pointer ${
                            active
                              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                              : 'bg-[#070b1a] border-amber-400/25 text-slate-200 hover:border-amber-300'
                          }`}
                        >
                          {preset.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {isNightmareUnlocked(save.highestChapterCleared) && onSelectNightmareTier && (() => {
                const activeTier = Math.max(0, Math.min(5, save.selectedNightmareTier ?? 0));
                const nmCfg = getNightmareTierConfig(selectedChapter.id, activeTier);
                return (
                  <div className="rounded-2xl bg-[#13091a] border border-rose-400/30 p-3 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-black text-rose-300 flex items-center gap-1.5">
                        <Flame className="w-3.5 h-3.5 text-rose-400" />
                        <span>Bậc Ác Mộng</span>
                      </span>
                      <div className="flex items-center gap-1">
                        {[
                          { tier: 0, label: 'Chuẩn' },
                          { tier: 1, label: 'I' },
                          { tier: 2, label: 'II' },
                          { tier: 3, label: 'III' },
                          { tier: 4, label: 'IV' },
                          { tier: 5, label: 'V' },
                        ].map((btn) => (
                          <button
                            key={btn.tier}
                            type="button"
                            onClick={() => onSelectNightmareTier(btn.tier)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-black border cursor-pointer ${
                              activeTier === btn.tier
                                ? btn.tier === 0
                                  ? 'bg-amber-400/20 border-amber-300 text-amber-200'
                                  : 'bg-rose-500/25 border-rose-400 text-rose-100'
                                : 'bg-[#070b1a] border-slate-700 text-slate-400 hover:text-white'
                            }`}
                          >
                            {btn.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    {activeTier > 0 && (
                      <div className="text-[11px] font-mono-nums text-amber-200">
                        +{Math.round((nmCfg.goldRewardMult - 1) * 100)}% Vàng · +
                        {Math.round((nmCfg.starDustRewardMult - 1) * 100)}% Bụi Sao · +
                        {Math.round((nmCfg.masteryExpMult - 1) * 100)}% Tinh Thông
                        {nmCfg.mutators.length > 0 && (
                          <span className="text-rose-200">
                            {' '}· Biến số: {nmCfg.mutators.map((m) => m.name).join(', ')}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {isChapterCleared && sweepUnlock.unlocked && (
                  <button
                    type="button"
                    disabled={dailySweeps.remaining <= 0}
                    onClick={() => onQuickSweepChapter(selectedChapter.id)}
                    className={`px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                      dailySweeps.remaining > 0
                        ? 'a2-emerald-btn'
                        : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span className="font-mono-nums">
                      Quét Nhanh ({dailySweeps.remaining}/{maxSweeps})
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={!isChapterUnlocked}
                  onClick={() => {
                    onClose();
                    onStartTrial();
                  }}
                  className={`flex-1 py-2.5 px-4 rounded-xl font-display font-black text-sm flex items-center justify-center gap-2 cursor-pointer ${
                    isChapterUnlocked
                      ? 'a2-yellow-btn'
                      : 'bg-slate-900 border border-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <span>
                    {isChapterUnlocked ? 'VÀO CHIẾN ĐẤU' : `Thắng Chương ${selectedChapter.id - 1} Để Mở`}
                  </span>
                  {isChapterUnlocked && <ChevronRight className="w-4 h-4" />}
                </button>
              </div>
            </>
          )}

          {gameMode === 'tower' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                Leo tầng bất tận xoay vòng 12 Tinh Giới · Đánh Boss mỗi 3 tầng nhận Vàng &amp; Ngọc Hồn.
              </p>
              <div className="flex items-center justify-between text-xs font-mono-nums rounded-xl bg-[#080f24] border border-purple-400/25 px-3.5 py-2.5">
                <span className="text-amber-300 font-bold">Kỷ lục: Tầng {save.bestTowerFloor ?? 0}</span>
                <span className="text-purple-300 font-bold">Boss mỗi 3 tầng</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenTalentsModal();
                  }}
                  className="a2-slate-btn px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Thiên Phú</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartTower();
                  }}
                  className="a2-purple-btn flex-1 py-2.5 rounded-xl font-display font-black text-sm cursor-pointer"
                >
                  LEO THÁP VÔ TẬN
                </button>
              </div>
            </div>
          )}

          {gameMode === 'elemental_tower' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
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
                      className={`px-3 py-2 rounded-xl border text-xs font-black flex items-center justify-between cursor-pointer ${
                        isSel
                          ? `${t.btnClass} shadow`
                          : 'bg-[#070b1a] border-slate-800 text-slate-300 hover:border-amber-300/60'
                      }`}
                    >
                      <span>Hệ {t.shortName}</span>
                      <span className="font-mono-nums">T.{elementalTowers[t.id] ?? 0}</span>
                    </button>
                  );
                })}
              </div>
              <div className="rounded-xl bg-[#080f24] border border-sky-400/25 p-3 space-y-1 text-xs">
                <div className={`font-black ${activeElTower.accentTextClass}`}>{activeElTower.name}</div>
                <p className="text-slate-300">{activeElTower.ruleDesc}</p>
                <p className="text-sky-200 font-semibold">{activeElTower.synergyDesc}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenConstellationModal();
                  }}
                  className="a2-slate-btn px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>12 Chòm Sao</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartElementalTower(activeElTower.id);
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-display font-black text-sm cursor-pointer ${activeElTower.btnClass}`}
                >
                  CHINH PHỤC THÁP HỆ
                </button>
              </div>
            </div>
          )}

          {gameMode === 'boss_rush' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                Đối đầu liên tiếp 5 vòng Thủ Lĩnh Hoàng Đạo (Vòng 4 song Boss) · Phần thưởng cực lớn Ngọc Hồn.
              </p>
              <div className="flex items-center justify-between text-xs font-mono-nums rounded-xl bg-[#080f24] border border-rose-400/25 px-3.5 py-2.5">
                <span className="text-amber-300 font-bold">Kỷ lục: Vòng {save.bestBossRushRound ?? 0}/5</span>
                <span className="text-purple-300 font-bold">Rơi Ngọc Hồn mỗi vòng</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenProfileModal('history');
                  }}
                  className="a2-slate-btn px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <History className="w-3.5 h-3.5 text-amber-300" />
                  <span>Lịch Sử</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartBossRush();
                  }}
                  className="flex-1 py-2.5 rounded-xl font-display font-black text-sm bg-gradient-to-b from-rose-400 via-rose-500 to-rose-700 text-white cursor-pointer"
                >
                  VÀO SĂN BOSS
                </button>
              </div>
            </div>
          )}

          {gameMode === 'daily_rift' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-display font-black text-emerald-200">{todayRiftPair.title}</span>
                <span className="font-mono-nums font-bold text-amber-300">
                  {dailyRift.runsRemaining}/{MAX_DAILY_RIFT_RUNS} lượt
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-emerald-950/40 border border-emerald-400/30 p-2.5">
                  <div className="font-black text-emerald-300">Phước Lành: {todayRiftPair.playerBuffTitle}</div>
                  <div className="text-slate-200 mt-0.5">{todayRiftPair.playerBuffDesc}</div>
                </div>
                <div className="rounded-xl bg-rose-950/35 border border-rose-400/30 p-2.5">
                  <div className="font-black text-rose-300">Thử Thách: {todayRiftPair.enemyChallengeTitle}</div>
                  <div className="text-slate-200 mt-0.5">{todayRiftPair.enemyChallengeDesc}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-[11px] font-bold text-sky-200">
                <span className="flex items-center gap-1">
                  <StarDustIcon className="w-3.5 h-3.5" /> Rơi nhiều Bụi Tinh Tú
                </span>
                <span className="flex items-center gap-1 text-emerald-300">
                  <PetEssenceIcon className="w-3.5 h-3.5" /> Rơi Tinh Chất Tinh Linh
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenForgeModal();
                  }}
                  className="a2-slate-btn px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Hammer className="w-3.5 h-3.5 text-amber-300" />
                  <span>Lò Rèn</span>
                </button>
                <button
                  type="button"
                  disabled={dailyRift.runsRemaining <= 0}
                  onClick={() => {
                    onClose();
                    onStartDailyRift();
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-display font-black text-sm cursor-pointer ${
                    dailyRift.runsRemaining > 0
                      ? 'a2-emerald-btn'
                      : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {dailyRift.runsRemaining > 0 ? 'VÀO BÍ CẢNH' : 'Đã Hết Lượt Hôm Nay'}
                </button>
              </div>
            </div>
          )}

          {gameMode === 'coop_raid' && (
            <div className="space-y-3">
              <div className="text-xs text-slate-300">
                Tổ đội cùng <strong className="text-sky-300">{coopAllies[0].name}</strong> &amp;{' '}
                <strong className="text-purple-300">{coopAllies[1].name}</strong> · Thưởng chính còn{' '}
                <strong className="text-emerald-300 font-mono-nums">
                  {coopState.dailyRewardsLeft}/{COOP_RAID_MAX_DAILY_REWARDS}
                </strong>
              </div>
              <div className="grid grid-cols-3 gap-2">
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
                      className={`p-2 rounded-xl border text-xs font-black cursor-pointer ${
                        isSel
                          ? 'a2-yellow-btn'
                          : 'bg-[#070b1a] border-slate-800 text-slate-300 hover:border-amber-300/60'
                      }`}
                    >
                      <div>
                        {diff.id === 'normal' ? 'Thường' : diff.id === 'heroic' ? 'Anh Hùng' : 'Thần Thoại'}
                      </div>
                      <div className="text-[10px] font-mono-nums opacity-85">Đề xuất {diff.recommendedPower} LC</div>
                    </button>
                  );
                })}
              </div>
              <div className="text-xs font-mono-nums text-amber-200 rounded-xl bg-[#080f24] border border-amber-400/20 px-3 py-2">
                Thưởng: +{activeCoopDiff.rewardGold} Vàng · +{activeCoopDiff.rewardGems} Ngọc · +
                {activeCoopDiff.rewardStarDust} Bụi · Bảo Thạch Cấp {activeCoopDiff.socketGemTier}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenForgeSubTab('sockets');
                  }}
                  className="a2-slate-btn px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Gem className="w-3.5 h-3.5 text-purple-300" />
                  <span>Bảo Thạch</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartCoopRaid(activeCoopDiff.id);
                  }}
                  className="flex-1 py-2.5 rounded-xl font-display font-black text-sm a2-yellow-btn cursor-pointer"
                >
                  VÀO PHÓ BẢN CO-OP
                </button>
              </div>
            </div>
          )}

          {gameMode === 'crystal_defense' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                Bảo vệ Pha Lê trung tâm qua {CRYSTAL_DEFENSE_TOTAL_WAVES} đợt quái để săn Lông Vũ nâng Cánh 3D.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-nums rounded-xl bg-[#080f24] border border-cyan-400/25 px-3.5 py-2.5">
                <span className="text-cyan-300 font-bold">
                  Kỷ lục: Đợt {crystalState.bestWave}/{CRYSTAL_DEFENSE_TOTAL_WAVES}
                </span>
                <span className="text-amber-300 font-bold">
                  {crystalState.runsRemaining}/{crystalMaxRuns} lượt
                </span>
                <span className="flex items-center gap-1 text-sky-200 font-bold">
                  <WingFeatherIcon className="w-3.5 h-3.5" /> Rơi Lông Vũ
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenHeroSubTab) onOpenHeroSubTab('wings');
                    else onTabChange('heroes');
                  }}
                  className="a2-slate-btn px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <WingFeatherIcon className="w-4 h-4" />
                  <span>Cánh 3D</span>
                </button>
                <button
                  type="button"
                  disabled={crystalState.runsRemaining <= 0}
                  onClick={() => {
                    onClose();
                    onStartCrystalDefense();
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-display font-black text-sm cursor-pointer ${
                    crystalState.runsRemaining > 0
                      ? 'bg-gradient-to-b from-cyan-300 via-sky-400 to-indigo-600 text-slate-950'
                      : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {crystalState.runsRemaining > 0 ? 'VÀO THỦ THÀNH PHA LÊ' : 'Đã Hết Lượt Hôm Nay'}
                </button>
              </div>
            </div>
          )}

          {gameMode === 'world_boss' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-300">
                Dồn tổng sát thương trong 60 giây để leo hạng Liên Server &amp; nhận Khung Long Hồn.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono-nums rounded-xl bg-[#080f24] border border-amber-400/25 px-3.5 py-2.5">
                <span className="text-amber-300 font-bold">
                  Kỷ lục: {wbState.bestSingleDamage.toLocaleString('vi-VN')} ST
                </span>
                <span className="text-rose-300 font-bold">Hạng #{wbLiveRank}</span>
                <span className="text-emerald-300 font-bold">
                  {wbState.dailyRunsRemaining}/{WORLD_BOSS_MAX_DAILY_RUNS} lượt
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenHonorBoard();
                  }}
                  className="a2-slate-btn px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Trophy className="w-3.5 h-3.5 text-amber-300" />
                  <span>Bảng Vinh Danh</span>
                </button>
                <button
                  type="button"
                  disabled={wbState.dailyRunsRemaining <= 0}
                  onClick={() => {
                    onClose();
                    onStartWorldBoss();
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-display font-black text-sm cursor-pointer ${
                    wbState.dailyRunsRemaining > 0
                      ? 'a2-yellow-btn'
                      : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {wbState.dailyRunsRemaining > 0 ? 'KHIÊU CHIẾN BOSS THẾ GIỚI' : 'Đã Hết Lượt Hôm Nay'}
                </button>
              </div>
            </div>
          )}

          {gameMode === 'blood_moon' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono-nums">
                <span className="text-rose-300 font-bold">
                  Kỷ lục: {bloodMoonState.bestScore.toLocaleString('vi-VN')} Huyết Tinh
                </span>
                <span className="text-amber-300 font-bold">
                  {bloodMoonState.dailyRunsRemaining}/{BLOOD_MOON_MAX_DAILY_RUNS} lượt
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
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
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono-nums font-black border cursor-pointer ${
                        claimed
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : met
                          ? 'a2-yellow-btn'
                          : 'bg-[#070b1a] border-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {claimed ? `✓ ${ms.score}` : met ? `Nhận ${ms.score} (+${ms.rewardGems}N)` : `${ms.score} HT`}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-amber-200 font-bold">
                <MountShardIcon className="w-3.5 h-3.5" /> Rơi Mảnh Thú Cưỡi ·
                <AwakenCrystalIcon className="w-3.5 h-3.5" /> Tinh Thể Thức Tỉnh
              </div>
              <button
                type="button"
                disabled={bloodMoonState.dailyRunsRemaining <= 0}
                onClick={() => {
                  onClose();
                  onStartBloodMoon?.();
                }}
                className={`w-full py-2.5 rounded-xl font-display font-black text-sm cursor-pointer ${
                  bloodMoonState.dailyRunsRemaining > 0
                    ? 'bg-gradient-to-b from-rose-400 via-red-600 to-purple-800 text-white'
                    : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {bloodMoonState.dailyRunsRemaining > 0 ? 'VÀO ĐÊM TRĂNG MÁU' : 'Đã Hết Lượt Hôm Nay'}
              </button>
            </div>
          )}

          {gameMode === 'abyssal_gauntlet' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono-nums">
                <span className="text-purple-200 font-bold">
                  Kỷ lục: Đợt {abyssalState.bestWave}/{ABYSSAL_GAUNTLET_TOTAL_WAVES}
                </span>
                <span className="text-amber-300 font-bold">
                  {abyssalState.dailyRunsRemaining}/{ABYSSAL_GAUNTLET_MAX_DAILY_RUNS} lượt
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
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
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono-nums font-black border cursor-pointer ${
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenHeroSubTab) onOpenHeroSubTab('artifacts');
                    else onTabChange('heroes');
                  }}
                  className="a2-slate-btn px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <ArtifactRelicIcon className="w-4 h-4" />
                  <span>Thánh Khí</span>
                </button>
                <button
                  type="button"
                  disabled={abyssalState.dailyRunsRemaining <= 0}
                  onClick={() => {
                    onClose();
                    onStartAbyssalGauntlet?.();
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-display font-black text-sm cursor-pointer ${
                    abyssalState.dailyRunsRemaining > 0
                      ? 'bg-gradient-to-b from-purple-400 via-fuchsia-600 to-indigo-800 text-white'
                      : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {abyssalState.dailyRunsRemaining > 0 ? 'VÀO HỐ SÂU ĐỘT BIẾN' : 'Đã Hết Lượt Hôm Nay'}
                </button>
              </div>
            </div>
          )}

          {gameMode === 'guild_war' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono-nums">
                <span className="text-emerald-300 font-bold">
                  Điểm Tuần: {guildWarState.weeklyScore.toLocaleString('vi-VN')}
                </span>
                <span className="text-amber-300 font-bold">
                  {guildWarState.dailyRunsRemaining}/{GUILD_WAR_MAX_DAILY_RUNS} lượt
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
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
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono-nums font-black border cursor-pointer ${
                        claimed
                          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                          : met
                          ? 'a2-yellow-btn'
                          : 'bg-[#070b1a] border-slate-800 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {claimed ? `✓ ${box.score}` : met ? `Nhận ${box.score} (+${box.rewardGems}N)` : `${box.score} ĐB`}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenGuildModal();
                  }}
                  className="a2-slate-btn px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-300" />
                  <span>Bang Hội</span>
                </button>
                <button
                  type="button"
                  disabled={guildWarState.dailyRunsRemaining <= 0}
                  onClick={() => {
                    onClose();
                    onStartGuildWar?.();
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-display font-black text-sm cursor-pointer ${
                    guildWarState.dailyRunsRemaining > 0
                      ? 'a2-emerald-btn'
                      : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {guildWarState.dailyRunsRemaining > 0 ? 'VÀO CHIẾN TRƯỜNG BANG' : 'Đã Hết Lượt Hôm Nay'}
                </button>
              </div>
            </div>
          )}

          {gameMode === 'pantheon_expedition' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono-nums">
                <span className="text-amber-300 font-bold">
                  Kỷ lục: Tầng {pantheonState.bestDeityStage}/{PANTHEON_TOTAL_STAGES} ({pantheonState.bestScore.toLocaleString('vi-VN')}đ)
                </span>
                <span className="text-emerald-300 font-bold">
                  {pantheonState.dailyRunsRemaining}/{MAX_DAILY_PANTHEON_RUNS} lượt · {save.divineCrystals ?? 0} TT
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
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
                      className={`p-2 rounded-xl border text-left cursor-pointer ${
                        isSel
                          ? 'bg-amber-400/15 border-amber-300 text-amber-100'
                          : 'bg-[#070b1a] border-slate-800 text-slate-300 hover:border-amber-300/60'
                      }`}
                    >
                      <div className="text-[9px] font-black text-amber-300">{bl.badge}</div>
                      <div className="text-[11px] font-black text-white truncate">{bl.name}</div>
                      <div className="text-[9px] text-slate-300 truncate">{bl.desc}</div>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-wrap gap-1.5">
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
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono-nums font-black border cursor-pointer ${
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenHeroSubTab) onOpenHeroSubTab('halos');
                    else onTabChange('heroes');
                  }}
                  className="a2-slate-btn px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Crown className="w-3.5 h-3.5 text-amber-300" />
                  <span>Hào Quang 3D</span>
                </button>
                <button
                  type="button"
                  disabled={pantheonState.dailyRunsRemaining <= 0}
                  onClick={() => {
                    onClose();
                    onStartPantheon?.();
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-display font-black text-sm cursor-pointer ${
                    pantheonState.dailyRunsRemaining > 0
                      ? 'a2-yellow-btn'
                      : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {pantheonState.dailyRunsRemaining > 0 ? 'VÀO ĐIỆN THẦN 3D' : 'Đã Hết Lượt Hôm Nay'}
                </button>
              </div>
            </div>
          )}

          {gameMode === 'championship_3round' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono-nums">
                <span className="text-amber-300 font-bold">
                  Cúp: {championshipState.gloryTrophies.toLocaleString('vi-VN')} · Đăng quang{' '}
                  {championshipState.championshipTitlesWon} lần
                </span>
                <span className="text-emerald-300 font-bold">
                  {championshipState.dailyRunsRemaining}/{MAX_DAILY_CHAMPIONSHIP_RUNS} lượt
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CHAMPIONSHIP_CUP_MILESTONES.map((ms) => {
                  const met = championshipState.gloryTrophies >= ms.trophiesTarget;
                  const claimed = championshipState.claimedCupMilestones.includes(ms.trophiesTarget);
                  return (
                    <button
                      key={ms.trophiesTarget}
                      type="button"
                      disabled={!met || claimed}
                      onClick={() => {
                        soundEngine.playVictory();
                        onClaimChampionshipMilestone?.(ms.trophiesTarget);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono-nums font-black border cursor-pointer ${
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenHeroSubTab) onOpenHeroSubTab('pets');
                    else onTabChange('heroes');
                  }}
                  className="a2-slate-btn px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Thần Sủng 3D</span>
                </button>
                <button
                  type="button"
                  disabled={championshipState.dailyRunsRemaining <= 0}
                  onClick={() => {
                    onClose();
                    onStartChampionship?.();
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-display font-black text-sm cursor-pointer ${
                    championshipState.dailyRunsRemaining > 0
                      ? 'a2-yellow-btn'
                      : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {championshipState.dailyRunsRemaining > 0
                    ? `VÀO GIẢI ĐẤU ${CHAMPIONSHIP_TOTAL_ROUNDS} HIỆP`
                    : 'Đã Hết Lượt Hôm Nay'}
                </button>
              </div>
            </div>
          )}

          {gameMode === 'crystal_vault' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono-nums">
                <span className="text-amber-300 font-bold">
                  Tổng phá: {crystalVaultState.totalPillarsBroken} Trụ · Kỷ lục {crystalVaultState.bestPillarsBroken}
                </span>
                <span className="text-emerald-300 font-bold">
                  {crystalVaultState.dailyRunsRemaining}/
                  {MAX_DAILY_CRYSTAL_VAULT_RUNS + (supremeActive ? 1 : 0)} lượt
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {CRYSTAL_VAULT_MILESTONES.map((ms) => {
                  const met = crystalVaultState.totalPillarsBroken >= ms.pillarsTarget;
                  const claimed = crystalVaultState.claimedMilestones.includes(ms.pillarsTarget);
                  return (
                    <button
                      key={ms.pillarsTarget}
                      type="button"
                      disabled={!met || claimed}
                      onClick={() => {
                        soundEngine.playVictory();
                        onClaimCrystalVaultMilestone?.(ms.pillarsTarget);
                      }}
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono-nums font-black border cursor-pointer ${
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
                        ? `Nhận ${ms.pillarsTarget} (+${ms.rewardGems} Ngọc)`
                        : `${ms.pillarsTarget} Trụ (+${ms.rewardMythicShards} Mảnh)`}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenWave12Sanctum?.('mythic');
                  }}
                  className="a2-slate-btn px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Sword className="w-3.5 h-3.5 text-amber-300" />
                  <span>Đúc Thần Binh</span>
                </button>
                <button
                  type="button"
                  disabled={crystalVaultState.dailyRunsRemaining <= 0}
                  onClick={() => {
                    onClose();
                    onStartCrystalVault?.();
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-display font-black text-sm cursor-pointer ${
                    crystalVaultState.dailyRunsRemaining > 0
                      ? 'a2-yellow-btn'
                      : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {crystalVaultState.dailyRunsRemaining > 0 ? 'KHAI PHÁ HẦM MỎ 3D' : 'Đã Hết Lượt Hôm Nay'}
                </button>
              </div>
            </div>
          )}

          {gameMode === 'dragon_lair' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono-nums">
                <span className="text-amber-300 font-bold">
                  Tổng Vảy: {dragonLairState.totalScalesEarned} · Kho {save.dragonScales ?? 0} Vảy
                </span>
                <span className="text-emerald-300 font-bold">
                  {dragonLairState.dailyRunsRemaining}/{MAX_DAILY_DRAGON_LAIR_RUNS} lượt
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
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
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono-nums font-black border cursor-pointer ${
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenWave13Treasury?.('steeds');
                  }}
                  className="a2-slate-btn px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                  <span>Đổi Thú Cưỡi</span>
                </button>
                <button
                  type="button"
                  disabled={dragonLairState.dailyRunsRemaining <= 0}
                  onClick={() => {
                    onClose();
                    onStartDragonLair?.();
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-display font-black text-sm cursor-pointer ${
                    dragonLairState.dailyRunsRemaining > 0
                      ? 'a2-yellow-btn'
                      : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {dragonLairState.dailyRunsRemaining > 0 ? 'KHAI CHIẾN RỒNG CỔ 3D' : 'Đã Hết Lượt Hôm Nay'}
                </button>
              </div>
            </div>
          )}

          {gameMode === 'sky_citadel' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono-nums">
                <span className="text-amber-300 font-bold">
                  Tổng: {skyCitadelState.totalScore.toLocaleString('vi-VN')} đ · Xúc Xắc: {astralBoardState.normalDice}
                </span>
                <span className="text-emerald-300 font-bold">
                  {skyCitadelState.dailyRunsRemaining}/{SKY_CITADEL_MAX_DAILY_RUNS} lượt
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
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
                      className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono-nums font-black border cursor-pointer ${
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
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenWave14Ascension?.('wings');
                  }}
                  className="a2-slate-btn px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer"
                >
                  <Feather className="w-3.5 h-3.5 text-sky-300" />
                  <span>Nâng Cánh 3D</span>
                </button>
                <button
                  type="button"
                  disabled={skyCitadelState.dailyRunsRemaining <= 0}
                  onClick={() => {
                    onClose();
                    onStartSkyCitadel?.();
                  }}
                  className={`flex-1 py-2.5 rounded-xl font-display font-black text-sm cursor-pointer ${
                    skyCitadelState.dailyRunsRemaining > 0
                      ? 'a2-yellow-btn'
                      : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {skyCitadelState.dailyRunsRemaining > 0 ? 'KHAI CHIẾN KHÔNG CHIẾN 3D' : 'Đã Hết Lượt Hôm Nay'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 3. EVENTS & FEATURES HUB DRAWER (Consolidates left rail, right rail, promo
 *    banners, and feature dock into 3 crisp tabs)
 * ========================================================================== */

interface LobbyEventsHubDrawerProps {
  save: SaveData;
  stats: ComputedPlayerStats;
  onClose: () => void;
  onOpenRewardsModal: (tab: 'checkin' | 'quests' | 'welcome' | 'journey') => void;
  onOpenTalentsModal: () => void;
  onOpenConstellationModal: () => void;
  onOpenBattlePassModal: () => void;
  onOpenVipModal: () => void;
  onOpenForgeSubTab: (subTab: 'salvage' | 'forge' | 'reforge' | 'awaken' | 'sockets') => void;
  onOpenGuildModal: () => void;
  onOpenDestinyWheelModal: () => void;
  onOpenNightMarketModal: () => void;
  onOpenArenaModal: () => void;
  onOpenAuctionModal: () => void;
  onOpenHonorBoard: () => void;
  onOpenWardrobe?: () => void;
  onOpenDispatch?: () => void;
  onOpenProfileModal: (tab?: 'profile' | 'achievements' | 'history' | 'codex') => void;
  onOpenEarlyRoadmap?: () => void;
  onOpenFestivalModal?: () => void;
  onOpenShopSection: (section: ShopSectionTab) => void;
  onTabChange: (tab: LobbyTab) => void;
  onOpenHeroSubTab?: (
    subTab: 'roster' | 'pets' | 'cosmetics' | 'wings' | 'mounts' | 'artifacts' | 'halos'
  ) => void;
  onOpenWave12Sanctum?: (tab: Wave12SanctumTab) => void;
  onOpenWave13Treasury?: (tab: Wave13Tab) => void;
  onOpenWave13Carnival?: () => void;
  onOpenWave14Ascension?: (tab: Wave14Tab) => void;
  onOpenWave14EventCenter?: () => void;
  onOpenCpBreakdown?: () => void;
  onOpenClaimAllModal?: () => void;
  onPowerAdvisorAction?: (kind: PowerRecommendation['actionKind']) => void;
}

export const LobbyEventsHubDrawer: React.FC<LobbyEventsHubDrawerProps> = ({
  save,
  stats,
  onClose,
  onOpenRewardsModal,
  onOpenTalentsModal,
  onOpenConstellationModal,
  onOpenBattlePassModal,
  onOpenVipModal,
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
  onOpenEarlyRoadmap,
  onOpenFestivalModal,
  onOpenShopSection,
  onTabChange,
  onOpenHeroSubTab,
  onOpenWave12Sanctum,
  onOpenWave13Treasury,
  onOpenWave13Carnival,
  onOpenWave14Ascension,
  onOpenWave14EventCenter,
  onOpenCpBreakdown,
  onOpenClaimAllModal,
  onPowerAdvisorAction,
}) => {
  const [tab, setTab] = useState<'events' | 'activities' | 'power'>('events');

  const claimableCount = countClaimableWelfare(save);
  const totalTalentLv = getTotalTalentLevels(save.talents);
  const bp = normalizeBattlePass(save.battlePass);
  const bpInfo = getBattlePassLevelInfo(bp.xp);
  const bpClaimable = countClaimableBattlePass(save);
  const metaEventsUnlock = isEarlyFeatureUnlocked(save, 'meta_events');
  const battlePassUnlock = isEarlyFeatureUnlocked(save, 'battle_pass');
  const forgeUnlock = isEarlyFeatureUnlocked(save, 'forge');
  const starterPackUnlock = isEarlyFeatureUnlocked(save, 'starter_pack');
  const arenaUnlock = isEarlyFeatureUnlocked(save, 'arena');
  const fairClaimable = countClaimableFairRoadmapMilestones(save, stats);
  const fairReadiness = evaluateMaxStageReadiness(save, stats);
  const vip = normalizeVip(save.vip);
  const hasVip = isVipActive(vip);
  const vipDailyReady = canClaimVipDaily(vip);
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
  const wbState = normalizeWorldBoss(save.worldBoss);
  const wbLiveRank = computeWorldBossLiveRank(wbState.bestSingleDamage);
  const auctionState = normalizeAuctionHouse(save.auctionHouse);
  const auctionClaimCount = auctionState.claimBox.length;
  const wave7RewardBadges = countClaimableWave7Rewards(save);
  const dispatchState = normalizeDispatchState(save.dispatch);
  const dispatchReadyCount = dispatchState.slots.filter(
    (s) => s.missionId && s.endsAt > 0 && Date.now() >= s.endsAt
  ).length;
  const wishPoolState = normalizeWishPool(save.wishPool);
  const wishMilestonesReady = WISH_MILESTONES.filter(
    (m) => wishPoolState.totalWishes >= m.count && !wishPoolState.claimedMilestones.includes(m.count)
  ).length;
  const stepUpChain = normalizeStepUpChain(save.stepUpChain);
  const gemVault = normalizeGemRebateVault(save.gemRebateVault);
  const freeChainStepReady = hasFreeChainStepReady(save);
  const vaultClaimCount = countClaimableVaultRewards(save);
  const codexSummary = computeCodexSummary(save);
  const codexClaimCount = countClaimableCodexRanks(save);
  const festivalClaimCount = countClaimableFestivalRewards(save);
  const carnivalClaimCount = countClaimableCarnivalRewards(save);
  const starlightRaceClaimCount = countClaimableStarlightMilestones(save);
  const skyCitadelClaimCount = countClaimableSkyCitadelMilestones(save);
  const astralBoardClaimCount = countClaimableAstralBoardRewards(save);
  const claimAllPreview = previewLobbyClaimAll(save);
  const powerRec = computePowerAdvisor(save, stats);

  const renderTile = (opts: {
    key: string;
    label: string;
    sub?: string;
    icon: React.ReactNode;
    badge?: string;
    disabled?: boolean;
    onClick: () => void;
  }) => (
    <button
      key={opts.key}
      type="button"
      disabled={opts.disabled}
      onClick={() => {
        soundEngine.playUiClick();
        onClose();
        opts.onClick();
      }}
      className={`rounded-2xl p-2.5 text-left border flex items-center justify-between gap-2 transition-colors ${
        opts.disabled
          ? 'bg-[#070b1a] border-slate-800/80 opacity-55 cursor-not-allowed'
          : 'bg-[#091026] border-amber-400/20 hover:border-amber-300 cursor-pointer'
      }`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-8 h-8 rounded-xl bg-[#111c3d] border border-amber-400/20 flex items-center justify-center shrink-0">
          {opts.disabled ? <Lock className="w-3.5 h-3.5 text-slate-400" /> : opts.icon}
        </div>
        <div className="min-w-0">
          <div className="text-xs font-black text-white truncate">{opts.label}</div>
          {opts.sub && (
            <div className="text-[10px] text-slate-400 truncate font-mono-nums">{opts.sub}</div>
          )}
        </div>
      </div>
      {!opts.disabled && opts.badge && (
        <span className="px-1.5 py-0.5 rounded bg-emerald-400 text-slate-950 font-mono-nums text-[9px] font-black shrink-0">
          {opts.badge}
        </span>
      )}
    </button>
  );

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 bg-[#040611]/82 flex items-end sm:items-center justify-center p-2.5 sm:p-5"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="cel-panel-ornate w-full max-w-3xl max-h-[82vh] rounded-3xl flex flex-col overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between gap-2 px-4 sm:px-5 py-3.5 border-b border-amber-400/20 bg-[#091028]">
          <div className="flex items-center gap-2">
            <Gift className="w-4 h-4 text-amber-300" />
            <h2 className="font-display text-sm sm:text-base font-black text-amber-200">
              Trung Tâm Sự Kiện &amp; Tính Năng
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng trung tâm sự kiện"
            className="cel-panel w-8 h-8 rounded-xl flex items-center justify-center text-slate-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick 1-Tap Claim All + Power Advisor Banner inside Hub (removed from main lobby!) */}
        <div className="px-4 sm:px-5 pt-3 flex flex-col sm:flex-row gap-2">
          {onOpenClaimAllModal && claimAllPreview.totalClaimableCount > 0 && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick(1.06);
                onClose();
                onOpenClaimAllModal();
              }}
              className="a2-yellow-btn px-3.5 py-2 rounded-xl text-xs font-black flex items-center justify-between gap-2 cursor-pointer sm:w-auto"
            >
              <span className="flex items-center gap-1.5">
                <Gift className="w-4 h-4" />
                <span>Nhận Nhanh Toàn Bộ Quà Sảnh</span>
              </span>
              <span className="px-1.5 py-0.5 rounded bg-slate-950 text-amber-300 font-mono-nums text-[10px]">
                +{claimAllPreview.totalClaimableCount}
              </span>
            </button>
          )}
          <div className="flex-1 rounded-xl bg-[#081224] border border-emerald-400/30 px-3 py-1.5 flex items-center justify-between gap-2 min-w-0">
            <div className="min-w-0 flex items-center gap-2">
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-[9px] font-mono-nums font-black text-emerald-300 shrink-0">
                {powerRec.estGainLabel}
              </span>
              <span className="text-[11px] font-bold text-amber-100 truncate">{powerRec.title}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick(1.08);
                onClose();
                onPowerAdvisorAction?.(powerRec.actionKind);
              }}
              className="a2-emerald-btn px-2.5 py-1 rounded-lg text-[10px] font-black shrink-0 cursor-pointer"
            >
              {powerRec.ctaLabel}
            </button>
          </div>
        </div>

        {/* 3 Clean Category Tabs */}
        <div className="px-4 sm:px-5 pt-3">
          <div className="grid grid-cols-3 gap-1.5 bg-[#060a18] border border-amber-400/20 rounded-xl p-1">
            {([
              ['events', 'Sự Kiện & Quà'],
              ['activities', 'Hoạt Động & Hội'],
              ['power', 'Sức Mạnh & 3D'],
            ] as const).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setTab(id);
                }}
                className={`py-2 rounded-lg text-xs font-black cursor-pointer transition-colors ${
                  tab === id
                    ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto a2-scroll p-4 sm:p-5">
          {tab === 'events' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {onOpenWave14EventCenter &&
                renderTile({
                  key: 'w14_events',
                  label: 'Sự Kiện Live Mùa IV',
                  sub: '8 sự kiện đang diễn ra',
                  icon: <Megaphone className="w-4 h-4 text-amber-300" />,
                  badge: astralBoardClaimCount + skyCitadelClaimCount > 0 ? `+${astralBoardClaimCount + skyCitadelClaimCount}` : undefined,
                  onClick: () => onOpenWave14EventCenter(),
                })}
              {renderTile({
                key: 'journey',
                label: 'Hành Trình 7 Ngày',
                sub: 'Quà mốc tân thủ & LC',
                icon: <ScrollText className="w-4 h-4 text-emerald-300" />,
                badge: journeyReadyCount > 0 ? `+${journeyReadyCount}` : undefined,
                onClick: () => onOpenRewardsModal('journey'),
              })}
              {onOpenWave13Carnival &&
                renderTile({
                  key: 'carnival',
                  label: 'Quà 7 Ngày & Nạp Đầu',
                  sub: '3 mốc tiến hóa x18',
                  icon: <Crown className="w-4 h-4 text-amber-300" />,
                  badge: carnivalClaimCount > 0 ? `+${carnivalClaimCount}` : undefined,
                  onClick: () => onOpenWave13Carnival(),
                })}
              {onOpenFestivalModal &&
                renderTile({
                  key: 'festival',
                  label: 'Lễ Hội Tinh Giới',
                  sub: 'Đổi quà đèn lồng',
                  icon: <Sparkles className="w-4 h-4 text-amber-300" />,
                  badge: festivalClaimCount > 0 ? `+${festivalClaimCount}` : undefined,
                  onClick: () => onOpenFestivalModal(),
                })}
              {renderTile({
                key: 'welfare',
                label: 'Phúc Lợi & Điểm Danh',
                sub: 'Quà ngày & nhiệm vụ',
                icon: <Gift className="w-4 h-4 text-emerald-300" />,
                badge: claimableCount > 0 ? `+${claimableCount}` : undefined,
                onClick: () => onOpenRewardsModal(!save.welcomeGiftClaimed ? 'welcome' : 'checkin'),
              })}
              {renderTile({
                key: 'bp',
                label: battlePassUnlock.unlocked ? `Battle Pass Lv.${bpInfo.level}` : 'Battle Pass · Ải 4 Ch.1',
                sub: 'Thưởng mùa giải',
                icon: <Crown className="w-4 h-4 text-amber-300" />,
                badge: bpClaimable > 0 ? `+${bpClaimable}` : undefined,
                disabled: !battlePassUnlock.unlocked,
                onClick: onOpenBattlePassModal,
              })}
              {renderTile({
                key: 'vip',
                label: hasVip ? 'VIP Đặc Quyền' : 'VIP & Quà Đầu',
                sub: 'Quét nhanh & buff hằng ngày',
                icon: <Sparkles className="w-4 h-4 text-amber-300" />,
                badge:
                  vipDailyReady || (starterPackUnlock.unlocked && !vip.starterPackClaimed)
                    ? vipDailyReady
                      ? 'Nhận'
                      : 'Mới'
                    : undefined,
                onClick: onOpenVipModal,
              })}
              {renderTile({
                key: 'chain_bank',
                label: 'Chuỗi Quà & Két Tinh Ngân',
                sub: `Bước ${Math.min(5, stepUpChain.currentStep)}/5 · ${gemVault.storedGems}/${GEM_VAULT_CAPACITY} Ngọc`,
                icon: <Gift className="w-4 h-4 text-emerald-300" />,
                badge: freeChainStepReady ? '0Đ' : vaultClaimCount > 0 ? `+${vaultClaimCount}` : undefined,
                onClick: () => onOpenShopSection('chain_bank'),
              })}
              {renderTile({
                key: 'wish_topup',
                label: 'Hồ Ước SSR & Nạp X2',
                sub: 'Triệu hồi chọn mục tiêu',
                icon: <Gem className="w-4 h-4 text-rose-300" />,
                badge: wishMilestonesReady > 0 ? `+${wishMilestonesReady}` : undefined,
                onClick: () => onOpenShopSection('wish_topup'),
              })}
              {renderTile({
                key: 'privilege',
                label: 'Thẻ Tháng & Tích Nạp',
                sub: 'Đặc quyền nhận Ngọc mỗi ngày',
                icon: <Crown className="w-4 h-4 text-sky-300" />,
                badge: wave7RewardBadges > 0 ? `+${wave7RewardBadges}` : undefined,
                onClick: () => onOpenShopSection('privilege'),
              })}
              {renderTile({
                key: 'packs',
                label: 'Quỹ Trưởng Thành & Shop Xu',
                sub: 'Nhận Ngọc theo mốc LC',
                icon: <Crown className="w-4 h-4 text-amber-300" />,
                badge: claimableGfCount > 0 ? `+${claimableGfCount}` : undefined,
                onClick: () => onOpenShopSection('packs'),
              })}
              {onOpenEarlyRoadmap &&
                renderTile({
                  key: 'roadmap',
                  label: 'Lộ Trình 30 Ngày · Fair Progression',
                  sub: `Ngày ${fairReadiness.activeDay}/30 · ${fairReadiness.overallPercent}% Max Đồ`,
                  icon: <Map className="w-4 h-4 text-amber-300" />,
                  badge: fairClaimable > 0 ? `+${fairClaimable}` : undefined,
                  onClick: () => onOpenEarlyRoadmap(),
                })}
            </div>
          )}

          {tab === 'activities' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {renderTile({
                key: 'arena',
                label: arenaUnlock.unlocked ? 'Đấu Trường Arena' : 'Arena · Ch.3',
                sub: arenaUnlock.unlocked
                  ? `${arena.ticketsRemaining} vé khiêu chiến`
                  : arenaUnlock.requiredLabel,
                icon: <Swords className="w-4 h-4 text-rose-300" />,
                badge:
                  arenaUnlock.unlocked && arena.ticketsRemaining > 0
                    ? `${arena.ticketsRemaining}`
                    : undefined,
                disabled: !arenaUnlock.unlocked,
                onClick: onOpenArenaModal,
              })}
              {onOpenDispatch &&
                renderTile({
                  key: 'dispatch',
                  label: 'Phái Cử Đồng Hành AI',
                  sub: 'Nhận tài nguyên nhàn rỗi',
                  icon: <Send className="w-4 h-4 text-sky-300" />,
                  badge: dispatchReadyCount > 0 ? `+${dispatchReadyCount}` : undefined,
                  onClick: () => onOpenDispatch(),
                })}
              {renderTile({
                key: 'guild',
                label: metaEventsUnlock.unlocked ? 'Bang Hội & Lãnh Địa 3D' : 'Bang Hội · Ch.3',
                sub: '4 công trình & Boss Bang',
                icon: <Shield className="w-4 h-4 text-amber-300" />,
                badge: guild.bossRunsRemaining > 0 ? `${guild.bossRunsRemaining}` : undefined,
                disabled: !metaEventsUnlock.unlocked,
                onClick: onOpenGuildModal,
              })}
              {renderTile({
                key: 'honor',
                label: 'Bảng Vinh Danh',
                sub: `Hạng Boss TG #${wbLiveRank}`,
                icon: <Trophy className="w-4 h-4 text-amber-300" />,
                onClick: onOpenHonorBoard,
              })}
              {onOpenWave14Ascension &&
                renderTile({
                  key: 'astral_board',
                  label: 'Bàn Cờ Xúc Xắc Tinh Tú',
                  sub: '16 ô kho báu & Mảnh Thần Thoại',
                  icon: <Dice5 className="w-4 h-4 text-amber-300" />,
                  badge: astralBoardClaimCount > 0 ? `+${astralBoardClaimCount}` : undefined,
                  onClick: () => onOpenWave14Ascension('board'),
                })}
              {renderTile({
                key: 'wheel',
                label: metaEventsUnlock.unlocked ? 'Vòng Quay Định Mệnh' : 'Vòng Quay · Ch.3',
                sub: `${destinyReadyCount} lượt quay sẵn`,
                icon: <Ticket className="w-4 h-4 text-sky-300" />,
                badge: destinyReadyCount > 0 ? `${destinyReadyCount}` : undefined,
                disabled: !metaEventsUnlock.unlocked,
                onClick: onOpenDestinyWheelModal,
              })}
              {renderTile({
                key: 'night_market',
                label: metaEventsUnlock.unlocked ? 'Chợ Đêm Huyền Bí' : 'Chợ Đêm · Ch.3',
                sub: 'Ưu đãi giới hạn & mốc tiêu',
                icon: <ShoppingBag className="w-4 h-4 text-purple-300" />,
                badge: spendMilestoneReady > 0 ? `+${spendMilestoneReady}` : undefined,
                disabled: !metaEventsUnlock.unlocked,
                onClick: onOpenNightMarketModal,
              })}
              {renderTile({
                key: 'auction',
                label: 'Sàn Đấu Giá Liên Giới',
                sub: 'Đấu giá vật phẩm hiếm',
                icon: <Gavel className="w-4 h-4 text-amber-300" />,
                badge: auctionClaimCount > 0 ? `+${auctionClaimCount}` : undefined,
                onClick: onOpenAuctionModal,
              })}
              {onOpenWave13Treasury &&
                renderTile({
                  key: 'royal_vault',
                  label: 'Đấu Giá & Hộp Mù 3D',
                  sub: 'Kho báu hoàng gia',
                  icon: <Gift className="w-4 h-4 text-amber-300" />,
                  onClick: () => onOpenWave13Treasury('royal_vault'),
                })}
              {onOpenWave12Sanctum &&
                renderTile({
                  key: 'w12_wheel',
                  label: 'Quay Kho Báu Hoàng Kim',
                  sub: 'Thần Binh & Đá Đúc',
                  icon: <Sparkles className="w-4 h-4 text-rose-300" />,
                  onClick: () => onOpenWave12Sanctum('wheel'),
                })}
              {renderTile({
                key: 'mystic_exchange',
                label: 'Chợ Mảnh Dư',
                sub: 'Đổi Ấn Thần Bí',
                icon: <MysticTokenIcon className="w-4 h-4" />,
                onClick: () => onOpenShopSection('mystic_exchange'),
              })}
            </div>
          )}

          {tab === 'power' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {onOpenCpBreakdown &&
                renderTile({
                  key: 'cp_breakdown',
                  label: 'Phân Tích Lực Chiến',
                  sub: `Tổng LC ${stats.powerRating} · 6 hạng mục`,
                  icon: <Zap className="w-4 h-4 text-amber-300" />,
                  onClick: () => onOpenCpBreakdown(),
                })}
              {renderTile({
                key: 'talents',
                label: 'Bảng Thiên Phú',
                sub: `Tổng cấp Lv.${totalTalentLv}`,
                icon: <Zap className="w-4 h-4 text-amber-300" />,
                onClick: onOpenTalentsModal,
              })}
              {renderTile({
                key: 'constellations',
                label: '12 Chòm Sao Hoàng Đạo',
                sub: `${constellationSummary.totalStars}★ đã thắp sáng`,
                icon: <Sparkles className="w-4 h-4 text-sky-300" />,
                onClick: onOpenConstellationModal,
              })}
              {renderTile({
                key: 'forge',
                label: forgeUnlock.unlocked ? 'Lò Rèn & Khảm Bảo Thạch' : 'Lò Rèn · Ải 4 Ch.1',
                sub: `Bụi Sao: ${save.starDust ?? 0}`,
                icon: <Hammer className="w-4 h-4 text-purple-300" />,
                disabled: !forgeUnlock.unlocked,
                onClick: () => onOpenForgeSubTab('sockets'),
              })}
              {onOpenWardrobe &&
                renderTile({
                  key: 'wardrobe',
                  label: 'Phòng Thử Đồ 360°',
                  sub: 'Phối Trang Phục · Cánh · Thú Cưỡi',
                  icon: <Sparkles className="w-4 h-4 text-sky-300" />,
                  onClick: () => onOpenWardrobe(),
                })}
              {renderTile({
                key: 'halos',
                label: 'Hào Quang Thần Vực 3D',
                sub: `${(save.unlockedHalos ?? []).length}/${DIVINE_HALO_CATALOG.length} · ${save.divineCrystals ?? 0} TT`,
                icon: <Crown className="w-4 h-4 text-amber-300" />,
                onClick: () => {
                  if (onOpenHeroSubTab) onOpenHeroSubTab('halos');
                  else onTabChange('heroes');
                },
              })}
              {renderTile({
                key: 'artifacts',
                label: 'Thánh Khí 3D',
                sub: 'Cộng hưởng chỉ số Anh Hùng',
                icon: <ArtifactRelicIcon className="w-4 h-4" />,
                onClick: () => {
                  if (onOpenHeroSubTab) onOpenHeroSubTab('artifacts');
                  else onTabChange('heroes');
                },
              })}
              {onOpenWave14Ascension &&
                renderTile({
                  key: 'w14_wings',
                  label: 'Cánh Thần Quang 3D',
                  sub: `Lông Vũ: ${save.wingFeathers ?? 0}`,
                  icon: <Feather className="w-4 h-4 text-sky-300" />,
                  badge: skyCitadelClaimCount > 0 ? `+${skyCitadelClaimCount}` : undefined,
                  onClick: () => onOpenWave14Ascension('wings'),
                })}
              {onOpenWave13Treasury &&
                renderTile({
                  key: 'w13_steeds',
                  label: 'Thú Cưỡi 3D & Đường Đua',
                  sub: 'Thanh Long & Tọa Kỵ Hoàng Đạo',
                  icon: <Sparkles className="w-4 h-4 text-cyan-300" />,
                  badge: starlightRaceClaimCount > 0 ? `+${starlightRaceClaimCount}` : undefined,
                  onClick: () => onOpenWave13Treasury('steeds'),
                })}
              {onOpenWave13Treasury &&
                renderTile({
                  key: 'w13_soul',
                  label: 'Hồn Hoàn 3D',
                  sub: 'Vòng linh lực chiến đấu',
                  icon: <Gem className="w-4 h-4 text-purple-300" />,
                  onClick: () => onOpenWave13Treasury('soul_rings'),
                })}
              {onOpenWave12Sanctum &&
                renderTile({
                  key: 'w12_mythic',
                  label: 'Thần Binh Thức Tỉnh 3D',
                  sub: `Bậc ${save.mythicWeapon?.tier ?? 0}`,
                  icon: <Sword className="w-4 h-4 text-amber-300" />,
                  onClick: () => onOpenWave12Sanctum('mythic'),
                })}
              {onOpenWave12Sanctum &&
                renderTile({
                  key: 'w12_altar',
                  label: 'Tế Đàn & Cờ Hiệu 3D',
                  sub: 'Cộng hưởng đội hình',
                  icon: <Flag className="w-4 h-4 text-rose-400" />,
                  onClick: () => onOpenWave12Sanctum('altar'),
                })}
              {onOpenWave14Ascension &&
                renderTile({
                  key: 'w14_relics',
                  label: 'Cổ Vật & Danh Hiệu 3D',
                  sub: 'Hiệu ứng danh hiệu trên đầu',
                  icon: <Crown className="w-4 h-4 text-violet-300" />,
                  onClick: () => onOpenWave14Ascension('relics'),
                })}
              {renderTile({
                key: 'codex_buff',
                label: 'Sổ Tay Buff & Thư Viện',
                sub: `Hạng ${codexSummary.currentRank.rank}`,
                icon: <BookOpen className="w-4 h-4 text-sky-300" />,
                badge: codexClaimCount > 0 ? `+${codexClaimCount}` : undefined,
                onClick: () => onOpenProfileModal('codex'),
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ============================================================================
 * 4. 3D ENVIRONMENT POPOVER (Sky Theme + Weather + Sanctuary Floor + Zoom)
 * ========================================================================== */

interface LobbySkyPopoverProps {
  save: SaveData;
  onClose: () => void;
  onSelectSkyTheme?: (themeId: LobbySkyThemeId) => void;
  onUnlockSkyTheme?: (themeId: LobbySkyThemeId, mode: 'codex' | 'gems') => void;
  onSelectLobbyWeather?: (weather: LobbyWeatherId) => void;
  onSelectSanctuaryFloor?: (floorId: SanctuaryFloorId) => void;
  onResetLobbyOrbit?: () => void;
  onAdjustLobbyZoom?: (delta: number) => void;
  onReplayEntranceVfx?: () => void;
}

export const LobbySkyPopover: React.FC<LobbySkyPopoverProps> = ({
  save,
  onClose,
  onSelectSkyTheme,
  onUnlockSkyTheme,
  onSelectLobbyWeather,
  onSelectSanctuaryFloor,
  onResetLobbyOrbit,
  onAdjustLobbyZoom,
  onReplayEntranceVfx,
}) => {
  const codexSummary = computeCodexSummary(save);
  const activeSkyThemeId: LobbySkyThemeId = save.lobbySkyTheme ?? 'golden_galaxy';
  const unlockedSkyThemes: LobbySkyThemeId[] = save.unlockedSkyThemes ?? [
    'golden_galaxy',
    'dawn_sanctum',
  ];
  const activeWeatherId: LobbyWeatherId = save.lobbyWeather ?? 'meteor_shower';
  const activeSanctuaryFloorId: SanctuaryFloorId = save.sanctuaryFloorTheme ?? 'marble_gold';

  return (
    <div className="pointer-events-auto absolute right-12 top-0 w-72 cel-panel-ornate rounded-2xl p-3 shadow-2xl z-30 space-y-2.5 max-h-[68vh] overflow-y-auto a2-scroll">
      <div className="flex items-center justify-between border-b border-amber-400/20 pb-1.5">
        <span className="font-display text-xs font-black text-amber-200 flex items-center gap-1.5">
          <Sun className="w-3.5 h-3.5 text-amber-300" />
          <span>Không Gian 3D &amp; Góc Máy</span>
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng bảng không gian 3D"
          className="text-slate-400 hover:text-white cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {onSelectSkyTheme && (
        <div className="space-y-1.5">
          {LOBBY_SKY_THEMES.map((theme) => {
            const isUnlocked = unlockedSkyThemes.includes(theme.id);
            const isEquipped = activeSkyThemeId === theme.id;
            const codexReq = theme.unlockCodexScore ?? 0;
            const canCodexUnlock = !isUnlocked && codexReq > 0 && codexSummary.totalPoints >= codexReq;
            const canGemUnlock = !isUnlocked && theme.unlockGems > 0 && save.gems >= theme.unlockGems;

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
                    className={`w-5 h-5 rounded-md border border-white/50 shrink-0 bg-gradient-to-br ${theme.swatchGradient}`}
                  />
                  <div className="min-w-0">
                    <div className="text-[11px] font-black text-white truncate">{theme.name}</div>
                    <div className="text-[9px] text-slate-400 truncate">{theme.badge}</div>
                  </div>
                </div>
                {isUnlocked ? (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(1.06);
                      onSelectSkyTheme(theme.id);
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer ${
                      isEquipped
                        ? 'bg-emerald-500/25 border border-emerald-400/60 text-emerald-300'
                        : 'a2-yellow-btn'
                    }`}
                  >
                    {isEquipped ? 'Đang Dùng' : 'Chọn'}
                  </button>
                ) : canCodexUnlock ? (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playVictory();
                      onUnlockSkyTheme?.(theme.id, 'codex');
                    }}
                    className="a2-emerald-btn px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer"
                  >
                    Mở 0đ
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={!canGemUnlock}
                    onClick={() => {
                      soundEngine.playVictory();
                      onUnlockSkyTheme?.(theme.id, 'gems');
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-black font-mono-nums ${
                      canGemUnlock
                        ? 'a2-purple-btn cursor-pointer'
                        : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {theme.unlockGems} Ngọc
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {onSelectLobbyWeather && (
        <div className="pt-2 border-t border-amber-400/20">
          <div className="text-[10px] font-black uppercase tracking-wider text-cyan-300 mb-1.5">
            Thời Tiết 3D
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
                  className={`px-2 py-1 rounded-lg text-[10px] font-black text-left flex items-center gap-1.5 cursor-pointer border ${
                    active
                      ? 'bg-cyan-500/20 border-cyan-300 text-cyan-100'
                      : 'bg-[#070b1a] border-slate-800 text-slate-300 hover:border-cyan-400/50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 bg-gradient-to-br ${w.swatchClass}`} />
                  <span className="truncate">{w.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {onSelectSanctuaryFloor && (
        <div className="pt-2 border-t border-amber-400/20">
          <div className="text-[10px] font-black uppercase tracking-wider text-amber-300 mb-1.5">
            Sàn Thần Điện 3D
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
                  className={`px-2 py-1 rounded-lg text-[10px] font-black text-left flex items-center gap-1.5 cursor-pointer border ${
                    active
                      ? 'bg-amber-500/20 border-amber-300 text-amber-100'
                      : 'bg-[#070b1a] border-slate-800 text-slate-300 hover:border-amber-400/50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full shrink-0 bg-gradient-to-br ${fl.swatchClass}`} />
                  <span className="truncate">{fl.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-amber-400/20 flex flex-wrap items-center gap-1.5">
        {onResetLobbyOrbit && (
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onResetLobbyOrbit();
            }}
            className="a2-slate-btn px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer"
          >
            <RotateCcw className="w-3 h-3 text-sky-300" />
            <span>Reset</span>
          </button>
        )}
        {onAdjustLobbyZoom && (
          <>
            <button
              type="button"
              onClick={() => onAdjustLobbyZoom(-0.75)}
              aria-label="Phóng to"
              className="a2-slate-btn px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer"
            >
              <ZoomIn className="w-3 h-3 text-sky-300" />
            </button>
            <button
              type="button"
              onClick={() => onAdjustLobbyZoom(0.75)}
              aria-label="Thu nhỏ"
              className="a2-slate-btn px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer"
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
            className="a2-purple-btn px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer ml-auto"
          >
            ✨ Hiệu Ứng
          </button>
        )}
      </div>
    </div>
  );
};

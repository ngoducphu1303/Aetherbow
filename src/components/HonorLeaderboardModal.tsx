import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  Check,
  Cloud,
  Copy,
  Crown,
  Eye,
  Frame,
  RefreshCw,
  Sparkles,
  Swords,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import worldBossArt from '../assets/images/world_boss_abyss_1795005956955.jpg';
import { soundEngine } from '../audio/soundEngine';
import { HERO_MAP } from '../data/heroesData';
import {
  MYTHIC_BADGES,
  WORLD_BOSS_MAX_DAILY_RUNS,
  WORLD_BOSS_MILESTONES,
  buildHonorLeaderboard,
  getMythicBadgeMetricValue,
  HonorBoardTab,
  normalizeWorldBoss,
} from '../data/wave7Data';
import { WAR_BANNER_MAP } from '../data/wave12Data';
import {
  ASTRAL_STEED_MAP,
  TOP_SERVER_PROFILES,
  VIP_AVATAR_FRAME_DEFS,
  VIP_AVATAR_FRAME_MAP,
} from '../data/wave13Data';
import {
  CloudLeaderboardRow,
  fetchRealLeaderboard,
  subscribeRealLeaderboard,
} from '../services/playerCloudService';
import {
  getActiveCompetitiveSeason,
  getNextSeasonRankTier,
  normalizeFairProgression,
  resolveSeasonRankTier,
} from '../engine/aaaFivePillarsDirector';
import { liveAiSocket } from '../services/liveAiSocket';
import {
  buildMergedHonorLeaderboard,
  LeaderboardFilterMode,
} from '../data/liveAiLeaderboards';
import {
  AiLivePlayerProfile,
  AvatarFrameId,
  MythicBadgeId,
  SaveData,
  TopPlayerBuildProfile,
  VipAvatarFrameId,
} from '../types/game';
import {
  SoulGemIcon,
  StarDustIcon,
  WingFeatherIcon,
  ZodiacAvatar,
} from './GameIcons';

interface HonorLeaderboardModalProps {
  save: SaveData;
  powerRating: number;
  heroName: string;
  playerDisplayName?: string;
  currentUid?: string | null;
  vipLevel?: number;
  onUnlockAvatarFrame: (frameId: AvatarFrameId) => void;
  onEquipAvatarFrame: (frameId: AvatarFrameId) => void;
  onUnlockVipFrame?: (frameId: VipAvatarFrameId) => void;
  onEquipVipFrame?: (frameId: VipAvatarFrameId | null) => void;
  onCopyTopProfile?: (profile: TopPlayerBuildProfile) => void;
  onClaimMythicBadge: (badgeId: MythicBadgeId) => void;
  onEquipMythicBadge: (badgeId: MythicBadgeId | null) => void;
  onClaimWorldBossMilestone: (milestoneId: string) => void;
  onStartWorldBoss?: () => void;
  onOpenWeeklyBoss?: () => void;
  onChallengeAiPlayer?: (aiPlayerId: string) => void;
  onInspectAiPlayer?: (aiPlayerId: string) => void;
  onClose: () => void;
}

export const HonorLeaderboardModal: React.FC<HonorLeaderboardModalProps> = ({
  save,
  powerRating,
  heroName,
  playerDisplayName,
  currentUid = null,
  vipLevel = 0,
  onUnlockVipFrame,
  onEquipVipFrame,
  onCopyTopProfile,
  onClaimMythicBadge,
  onEquipMythicBadge,
  onClaimWorldBossMilestone,
  onStartWorldBoss,
  onOpenWeeklyBoss,
  onChallengeAiPlayer,
  onInspectAiPlayer,
  onClose,
}) => {
  const [section, setSection] = useState<'rankings' | 'badges' | 'frames'>('rankings');
  const [rankTab, setRankTab] = useState<HonorBoardTab>('power');
  const [boardSource, setBoardSource] = useState<LeaderboardFilterMode>('all');
  const [cloudPlayers, setCloudPlayers] = useState<CloudLeaderboardRow[]>([]);
  const [aiPlayers, setAiPlayers] = useState<AiLivePlayerProfile[]>(
    () => liveAiSocket.getSnapshot()?.players ?? []
  );
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [wbImgErr, setWbImgErr] = useState(false);
  const [inspectedProfile, setInspectedProfile] = useState<TopPlayerBuildProfile | null>(null);
  const [copiedRank, setCopiedRank] = useState<number | null>(null);

  const loadCloudBoard = useCallback(async () => {
    setCloudLoading(true);
    setCloudError(null);
    try {
      const data = await fetchRealLeaderboard(60);
      setCloudPlayers(data);
    } catch (err) {
      setCloudError(
        err instanceof Error && err.message.includes('Quota exceeded')
          ? 'Hạn mức đọc dữ liệu hôm nay đã đạt giới hạn.'
          : 'Không thể tải bảng xếp hạng đám mây lúc này.'
      );
    } finally {
      setCloudLoading(false);
    }
  }, []);

  useEffect(() => {
    setCloudLoading(true);
    const unsub = subscribeRealLeaderboard(
      (data) => {
        setCloudPlayers(data);
        setCloudError(null);
        setCloudLoading(false);
      },
      (err) => {
        setCloudError(
          err.message.includes('Quota exceeded')
            ? 'Hạn mức đọc dữ liệu hôm nay đã đạt giới hạn.'
            : 'Không thể đồng bộ trực tuyến bảng xếp hạng đám mây lúc này.'
        );
        setCloudLoading(false);
      },
      60
    );
    return unsub;
  }, []);

  useEffect(() => {
    liveAiSocket.ensureConnected(playerDisplayName || heroName);
    return liveAiSocket.subscribeSnapshot((snap) => {
      setAiPlayers(snap.players);
    });
  }, [heroName, playerDisplayName]);

  const activeHero = HERO_MAP[save.selectedHeroId] ?? HERO_MAP.artemis;
  const displayHeroLabel = playerDisplayName ? `${playerDisplayName}` : heroName;

  const rows = useMemo(
    () =>
      buildMergedHonorLeaderboard({
        tab: rankTab,
        filter: boardSource,
        cloudPlayers,
        aiPlayers,
        save,
        powerRating,
        playerDisplayName: displayHeroLabel,
        currentUid,
      }),
    [aiPlayers, boardSource, cloudPlayers, currentUid, displayHeroLabel, powerRating, rankTab, save]
  );

  // Keep reference to legacy builder import unused-free if needed
  void buildHonorLeaderboard;

  const wb = normalizeWorldBoss(save.worldBoss);
  const equippedFrame = save.equippedAvatarFrameId;
  const unlockedVipFrames = new Set<VipAvatarFrameId>(save.unlockedVipFrames ?? []);
  const equippedVipFrame = save.equippedVipFrameId ?? null;
  const claimedBadges = new Set<MythicBadgeId>(save.claimedMythicBadges ?? []);
  const equippedBadge = save.equippedMythicBadgeId ?? null;

  const podiumOrder = [TOP_SERVER_PROFILES[1], TOP_SERVER_PROFILES[0], TOP_SERVER_PROFILES[2]];

  const scoreSuffix =
    rankTab === 'power'
      ? 'LC'
      : rankTab === 'world_boss'
      ? 'ST'
      : rankTab === 'arena'
      ? 'Điểm'
      : 'Tầng';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/92 overflow-y-auto">
      <div className="cel-panel-ornate w-full max-w-4xl rounded-3xl p-4 sm:p-6 my-auto max-h-[92vh] overflow-y-auto a2-scroll a2-modal-enter">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/70 flex items-center justify-center shrink-0">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-black text-white truncate">
                Bảng Vinh Danh Liên Server &amp; Huy Hiệu Thần Thoại
              </h2>
              <p className="text-[11px] text-slate-300 truncate">
                Đua Top Liên Server, nhận thưởng Boss Thế Giới, khắc ấn Huy Hiệu &amp; Khung VIP Động!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Bảng Vinh Danh"
            className="a2-slate-btn w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Main Section Switch */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => setSection('rankings')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              section === 'rankings' ? 'a2-yellow-btn' : 'a2-slate-btn'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Bảng Xếp Hạng &amp; Boss Thế Giới</span>
          </button>
          <button
            type="button"
            onClick={() => setSection('badges')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              section === 'badges' ? 'a2-yellow-btn' : 'a2-slate-btn'
            }`}
          >
            <Award className="w-3.5 h-3.5" />
            <span>Huy Hiệu Thần Thoại ({claimedBadges.size}/{MYTHIC_BADGES.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setSection('frames')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              section === 'frames' ? 'a2-yellow-btn' : 'a2-slate-btn'
            }`}
          >
            <Frame className="w-3.5 h-3.5" />
            <span>Khung VIP Động ({unlockedVipFrames.size}/{VIP_AVATAR_FRAME_DEFS.length})</span>
          </button>
          {onOpenWeeklyBoss && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick(1.06);
                onClose();
                onOpenWeeklyBoss();
              }}
              className="a2-slate-btn border border-emerald-400/45 text-emerald-200 hover:border-emerald-300 px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Trophy className="w-3.5 h-3.5 text-emerald-300" />
              <span>Boss Tuần Công Bằng</span>
            </button>
          )}
        </div>

        {/* SECTION 1: LEADERBOARDS & WORLD BOSS MILESTONES */}
        {section === 'rankings' && (
          <div className="space-y-4">
            {/* Pillar 4: Competitive Season Hub Strip (Live Countdown & Rank Tier) */}
            {(() => {
              const activeSeason = getActiveCompetitiveSeason();
              const fairProg = normalizeFairProgression(save.fairProgression);
              const seasonPointsEst = Math.max(
                0,
                Math.round(
                  (save.arena?.wins ?? 0) * 18 +
                    fairProg.equalizedArenaWins * 24 +
                    (save.bestTowerFloor ?? 0) * 6 +
                    (save.highestChapterCleared ?? 0) * 20
                )
              );
              const currentTier = resolveSeasonRankTier(seasonPointsEst);
              const nextTier = getNextSeasonRankTier(seasonPointsEst);
              const remDays = Math.floor(activeSeason.remainingMs / 86400000);
              const remHours = Math.floor((activeSeason.remainingMs % 86400000) / 3600000);
              const progressPct = nextTier
                ? Math.min(
                    100,
                    Math.round(
                      ((seasonPointsEst - currentTier.minPoints) /
                        Math.max(1, nextTier.minPoints - currentTier.minPoints)) *
                        100
                    )
                  )
                : 100;

              return (
                <div className="rounded-2xl border border-cyan-400/35 bg-[#071120]/95 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] font-black">
                      <span className="uppercase tracking-wider text-cyan-300">
                        {activeSeason.title} · Tuần {activeSeason.weekIndexInSeason}/4
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="font-mono-nums text-emerald-300">
                        Còn {remDays} ngày {remHours}g
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className={`font-display font-black ${currentTier.colorClass}`}>
                        Hạng {currentTier.label}
                      </span>
                      <span className="font-mono-nums text-slate-300">
                        ({seasonPointsEst.toLocaleString('vi-VN')} Điểm Mùa · Thắng Công Bằng: {fairProg.equalizedArenaWins})
                      </span>
                    </div>
                    <div className="h-1.5 w-full max-w-sm rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-cyan-400 to-amber-300 transition-all duration-300"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {nextTier ? `Mốc Kế: ${nextTier.label}` : 'Đã Đạt Bậc Tối Thượng'}
                    </div>
                    <div className="font-mono-nums text-xs font-black text-amber-300 mt-0.5">
                      Thưởng Mùa: +{currentTier.rewardGems} Ngọc · +{currentTier.rewardShards} Mảnh [S]
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Wave 13: Đài Vinh Danh Đỉnh Cao 3D · Top 3 Liên Server & Soi Đội Hình */}
            <div className="rounded-2xl border border-amber-300/45 bg-gradient-to-b from-[#171234] via-[#0b1026] to-[#070b18] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                    Đài Vinh Danh Đỉnh Cao 3D · Top 3 Chí Tôn Liên Server
                  </div>
                  <div className="text-xs text-slate-300">
                    Bấm Soi Đội Hình để xem Thú Cưỡi 3D, Hồn Hoàn, Thần Binh &amp; Sao Chép Đội Hình Top 1!
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(1.1);
                    setInspectedProfile(TOP_SERVER_PROFILES[0]);
                  }}
                  className="a2-yellow-btn px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Soi Đội Hình Top 1</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                {podiumOrder.map((profile) => {
                  const pHero = HERO_MAP[profile.heroId] ?? HERO_MAP.artemis;
                  const pVipFrame = VIP_AVATAR_FRAME_MAP[profile.vipFrameId];
                  const isRank1 = profile.rank === 1;
                  return (
                    <div
                      key={profile.rank}
                      className={`rounded-2xl border p-3.5 flex flex-col items-center text-center transition-transform ${
                        isRank1
                          ? 'sm:-mt-3 border-amber-300 bg-gradient-to-b from-amber-500/20 via-[#151232] to-[#080c1d] shadow-[0_0_28px_rgba(251,191,36,0.22)]'
                          : profile.rank === 2
                          ? 'border-sky-300/60 bg-gradient-to-b from-sky-500/15 to-[#080c1d]'
                          : 'border-orange-400/60 bg-gradient-to-b from-orange-500/15 to-[#080c1d]'
                      }`}
                    >
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono-nums mb-2 ${
                          isRank1
                            ? 'bg-amber-300 text-slate-950'
                            : profile.rank === 2
                            ? 'bg-sky-400/20 text-sky-200 border border-sky-300/50'
                            : 'bg-orange-400/20 text-orange-200 border border-orange-300/50'
                        }`}
                      >
                        TOP #{profile.rank} · {profile.titleBadge}
                      </span>

                      <div className={`rounded-full p-[3px] ${pVipFrame?.frameClass ?? ''}`}>
                        <ZodiacAvatar
                          heroId={pHero.id}
                          accentHex={pHero.accentHex}
                          cloakHex={pHero.cloakHex}
                          hairHex={pHero.hairHex}
                          frameId={isRank1 ? 'world_dragon' : 'seraph_crown'}
                          sizeClass={isRank1 ? 'w-14 h-14' : 'w-12 h-12'}
                        />
                      </div>

                      <div className="font-display text-sm font-black text-white mt-2 truncate max-w-full">
                        {profile.name}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-full">
                        Bang {profile.guild} · {pHero.name} {profile.heroStar}★
                      </div>
                      <div className="font-mono-nums text-sm font-black text-amber-300 mt-1">
                        {profile.powerRating.toLocaleString('vi-VN')} LC
                      </div>
                      <div className="text-[10px] text-cyan-200 font-bold mt-0.5 truncate max-w-full">
                        Hắc Long · Hồn Hoàn Lv.{profile.soulRingTotalLv}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick(1.05);
                          setInspectedProfile(profile);
                        }}
                        className="mt-2.5 w-full py-1.5 rounded-xl bg-slate-900/90 hover:bg-amber-400/20 border border-amber-300/45 text-[11px] font-black text-amber-200 flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Soi Đội Hình</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* All (Real + AI Live) vs Real Only Filter + Refresh */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-400/25 bg-[#070b1a] p-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setBoardSource('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                    boardSource === 'all'
                      ? 'bg-sky-500/20 text-sky-200 border border-sky-400/55'
                      : 'text-slate-300 hover:text-white border border-transparent'
                  }`}
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span>Tất Cả (Thật + {aiPlayers.length} AI Live)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBoardSource('real')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors ${
                    boardSource === 'real'
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/50'
                      : 'text-slate-300 hover:text-white border border-transparent'
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5 shrink-0" />
                  <span>Chỉ Người Thật ({Math.max(1, cloudPlayers.length)})</span>
                </button>
              </div>
              <button
                type="button"
                disabled={cloudLoading}
                onClick={() => void loadCloudBoard()}
                className="a2-slate-btn px-3 py-1.5 rounded-xl text-[11px] font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cloudLoading ? 'animate-spin' : ''}`} />
                <span>{cloudLoading ? 'Đang tải…' : 'Làm Mới'}</span>
              </button>
            </div>

            {/* Board Category Tabs */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'power' as const, label: 'Tổng Lực Chiến' },
                { id: 'world_boss' as const, label: 'Boss Thế Giới' },
                { id: 'arena' as const, label: 'Đấu Trường Arena' },
                { id: 'tower' as const, label: 'Tháp Vô Tận' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setRankTab(t.id)}
                  className={`py-2 px-3 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap border transition-colors ${
                    rankTab === t.id
                      ? 'bg-amber-400/20 border-amber-300 text-amber-200'
                      : 'bg-[#070b1a] border-slate-700 text-slate-300 hover:border-amber-400/50'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {cloudError && boardSource === 'real' && (
              <div className="rounded-xl border border-rose-400/35 bg-rose-950/50 px-3.5 py-2.5 text-xs text-rose-200">
                {cloudError}
              </div>
            )}

            {/* Top 3 Podium */}
            {rows.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {rows.slice(0, 3).map((entry) => {
                  const heroDef = HERO_MAP[entry.heroId] ?? HERO_MAP.artemis;
                  const medalColors =
                    entry.rank === 1
                      ? 'border-amber-300 bg-gradient-to-b from-amber-500/20 to-[#090d22]'
                      : entry.rank === 2
                      ? 'border-sky-300/75 bg-gradient-to-b from-sky-500/15 to-[#090d22]'
                      : 'border-orange-400/70 bg-gradient-to-b from-orange-500/15 to-[#090d22]';
                  return (
                    <div
                      key={entry.id}
                      className={`rounded-2xl border p-3.5 flex flex-col items-center text-center gap-1.5 ${medalColors}`}
                    >
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-950/90 border border-amber-300/60 font-mono-nums text-[10px] font-black text-amber-300">
                        HẠNG #{entry.rank}
                      </span>
                      <ZodiacAvatar
                        heroId={heroDef.id}
                        accentHex={heroDef.accentHex}
                        cloakHex={heroDef.cloakHex}
                        hairHex={heroDef.hairHex}
                        frameId={entry.frameId}
                        sizeClass="w-12 h-12"
                      />
                      <div className="font-display text-sm font-black text-white truncate max-w-full flex items-center justify-center gap-1">
                        {entry.isAiLive && (
                          <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
                        )}
                        {entry.isAiLive && entry.aiPlayerId && onInspectAiPlayer ? (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick(1.05);
                              onInspectAiPlayer(entry.aiPlayerId!);
                            }}
                            className="truncate text-sky-200 hover:text-amber-300 underline decoration-sky-400/40 underline-offset-2 cursor-pointer"
                          >
                            {entry.name}
                          </button>
                        ) : (
                          <span className="truncate">
                            {entry.name}
                            {entry.isPlayer ? ' (Bạn)' : ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-center gap-1 flex-wrap">
                        {entry.isAiLive ? (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/45 text-sky-300">
                            [AI Live]
                          </span>
                        ) : (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/45 text-emerald-300">
                            Người Thật
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-amber-200 truncate max-w-full">
                          {entry.badgeTitle}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate max-w-full">
                        {entry.server} · {entry.heroName}
                      </div>
                      <div className="font-mono-nums text-sm font-black text-emerald-300 mt-0.5">
                        {entry.score.toLocaleString('vi-VN')} {scoreSuffix}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Full Leaderboard Table */}
            <div className="rounded-2xl border border-amber-400/25 bg-[#070b1a]/95 divide-y divide-slate-800/80">
              {cloudLoading && boardSource === 'real' && rows.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-300">
                  Đang tải dữ liệu chiến binh từ đám mây…
                </div>
              ) : rows.length === 0 ? (
                <div className="p-6 text-center space-y-2">
                  <div className="text-sm font-bold text-white">
                    Chưa có chiến binh nào ghi danh trên Bảng Đám Mây
                  </div>
                  <p className="text-xs text-slate-400">
                    Đăng nhập tài khoản đám mây để trở thành người đầu tiên dẫn đầu Bảng Xếp Hạng Lực Chiến!
                  </p>
                </div>
              ) : (
                rows.map((entry) => {
                  const rowHero = HERO_MAP[entry.heroId] ?? HERO_MAP.artemis;
                  return (
                    <div
                      key={entry.id}
                      className={`px-3.5 py-2.5 flex items-center justify-between gap-3 ${
                        entry.isPlayer ? 'bg-emerald-500/15' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className={`w-7 text-center font-mono-nums text-xs font-black shrink-0 ${
                            entry.rank <= 3 ? 'text-amber-300' : 'text-slate-400'
                          }`}
                        >
                          #{entry.rank}
                        </span>
                        <ZodiacAvatar
                          heroId={rowHero.id}
                          accentHex={rowHero.accentHex}
                          cloakHex={rowHero.cloakHex}
                          hairHex={rowHero.hairHex}
                          frameId={entry.frameId}
                          sizeClass="w-8 h-8"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-black text-white truncate flex items-center gap-1.5">
                            {entry.isAiLive && (
                              <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
                            )}
                            {entry.isAiLive && entry.aiPlayerId && onInspectAiPlayer ? (
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playUiClick(1.05);
                                  onInspectAiPlayer(entry.aiPlayerId!);
                                }}
                                className="truncate text-sky-200 hover:text-amber-300 underline decoration-sky-400/40 underline-offset-2 cursor-pointer"
                              >
                                {entry.name}
                              </button>
                            ) : (
                              <span className="truncate">
                                {entry.name}
                                {entry.isPlayer ? ' (Bạn)' : ''}
                              </span>
                            )}
                            {entry.isAiLive ? (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/45 text-sky-300 shrink-0">
                                [AI Live]
                              </span>
                            ) : (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/45 text-emerald-300 shrink-0">
                                Người Thật
                              </span>
                            )}
                            <span className="text-[10px] font-bold text-amber-300 truncate hidden sm:inline">
                              · {entry.badgeTitle}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 truncate">
                            {entry.server} · Tướng {entry.heroName}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="font-mono-nums text-xs font-black text-amber-200">
                          {entry.score.toLocaleString('vi-VN')} {scoreSuffix}
                        </div>
                        {entry.isAiLive && entry.aiPlayerId && onChallengeAiPlayer && (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick(1.08);
                              onClose();
                              onChallengeAiPlayer(entry.aiPlayerId!);
                            }}
                            className="px-2 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/45 text-[10px] font-black text-sky-200 cursor-pointer whitespace-nowrap flex items-center gap-1"
                          >
                            <Swords className="w-3 h-3" />
                            <span>1v1</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* World Boss Cross-Server Damage Milestones */}
            <div className="rounded-2xl border border-rose-400/40 bg-[#120718]/95 overflow-hidden">
              <div className="relative p-4 flex flex-wrap items-center justify-between gap-3 border-b border-rose-400/25">
                {!wbImgErr && (
                  <img
                    src={worldBossArt}
                    alt="Boss Thế Giới Liên Server"
                    referrerPolicy="no-referrer"
                    onError={() => setWbImgErr(true)}
                    className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
                  />
                )}
                <div className="relative z-10 min-w-0">
                  <div className="text-[10px] font-black uppercase tracking-widest text-rose-300">
                    Mốc Thưởng Sát Thương Boss Thế Giới
                  </div>
                  <div className="font-display text-base font-black text-white">
                    Kỷ Lục 1 Trận: {wb.bestSingleDamage.toLocaleString('vi-VN')} ST · Lượt Hôm Nay:{' '}
                    {wb.dailyRunsRemaining}/{WORLD_BOSS_MAX_DAILY_RUNS}
                  </div>
                </div>
                {onStartWorldBoss && (
                  <button
                    type="button"
                    disabled={wb.dailyRunsRemaining <= 0}
                    onClick={() => {
                      soundEngine.playUiClick(1.1);
                      onClose();
                      onStartWorldBoss();
                    }}
                    className="relative z-10 a2-yellow-btn px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                  >
                    <Swords className="w-3.5 h-3.5" />
                    <span>Vào Đánh Boss Thế Giới</span>
                  </button>
                )}
              </div>

              <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {WORLD_BOSS_MILESTONES.map((ms) => {
                  const reached = wb.bestSingleDamage >= ms.damageTarget;
                  const claimed = wb.claimedMilestoneIds.includes(ms.id);
                  return (
                    <div
                      key={ms.id}
                      className={`rounded-xl border p-3 flex flex-col justify-between gap-2 ${
                        claimed
                          ? 'bg-[#071512]/90 border-emerald-400/40'
                          : reached
                          ? 'bg-amber-400/10 border-amber-300/80'
                          : 'bg-[#070b1a] border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="text-xs font-black text-white">{ms.label}</div>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono-nums font-bold text-slate-200 mt-1">
                          <span className="flex items-center gap-0.5 text-purple-300">
                            <SoulGemIcon className="w-3 h-3" />+{ms.rewardGems}
                          </span>
                          <span className="flex items-center gap-0.5 text-sky-300">
                            <WingFeatherIcon className="w-3 h-3" />+{ms.rewardFeathers}
                          </span>
                          <span className="flex items-center gap-0.5 text-cyan-300">
                            <StarDustIcon className="w-3 h-3" />+{ms.rewardStarDust}
                          </span>
                        </div>
                        {ms.rewardFrame && (
                          <div className="text-[10px] font-black text-rose-300 mt-1">
                            + Khung Long Hồn Liên Server
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        disabled={!reached || claimed}
                        onClick={() => {
                          soundEngine.playLevelUp();
                          onClaimWorldBossMilestone(ms.id);
                        }}
                        className={`w-full py-1.5 rounded-lg text-[11px] font-black whitespace-nowrap cursor-pointer disabled:cursor-not-allowed ${
                          claimed
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                            : reached
                            ? 'a2-emerald-btn'
                            : 'bg-slate-900 text-slate-500 border border-slate-800'
                        }`}
                      >
                        {claimed ? 'Đã Nhận Mốc' : reached ? 'Nhận Thưởng Mốc' : 'Chưa Đạt'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: MYTHIC BADGES */}
        {section === 'badges' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {MYTHIC_BADGES.map((badge) => {
              const val = getMythicBadgeMetricValue(badge, save, powerRating);
              const pct = Math.min(100, Math.round((val / Math.max(1, badge.target)) * 100));
              const reached = val >= badge.target;
              const claimed = claimedBadges.has(badge.id);
              const equipped = equippedBadge === badge.id;

              return (
                <div
                  key={badge.id}
                  className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 ${
                    equipped
                      ? 'bg-[#1a1308]/95 border-amber-300'
                      : claimed
                      ? 'bg-[#091817]/95 border-emerald-400/50'
                      : 'bg-[#070b1a]/95 border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span
                        className="text-[10px] font-black px-2 py-0.5 rounded border"
                        style={{
                          color: badge.accentColor,
                          borderColor: `${badge.accentColor}88`,
                          backgroundColor: `${badge.accentColor}1a`,
                        }}
                      >
                        {badge.tierLabel}
                      </span>
                      <span className="font-mono-nums text-[11px] font-bold text-slate-300">
                        {Math.min(val, badge.target).toLocaleString('vi-VN')} /{' '}
                        {badge.target.toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <h3 className="font-display text-base font-black text-white">{badge.title}</h3>
                    <p className="text-[11px] text-slate-300 mt-0.5">{badge.desc}</p>

                    <div className="mt-2.5 h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                      <div
                        className="h-full transition-all duration-300"
                        style={{ width: `${pct}%`, backgroundColor: badge.accentColor }}
                      />
                    </div>

                    <div className="flex flex-wrap gap-2 mt-2.5 text-[10px] font-mono-nums font-black text-emerald-300">
                      <span>+{badge.atkBonus} ATK</span>
                      <span>+{badge.hpBonus} HP</span>
                      <span>+{Math.round(badge.bossDmgBonus * 100)}% ST Boss</span>
                    </div>
                  </div>

                  {!claimed ? (
                    <button
                      type="button"
                      disabled={!reached}
                      onClick={() => {
                        soundEngine.playLevelUp();
                        onClaimMythicBadge(badge.id);
                      }}
                      className={`w-full py-2 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer disabled:cursor-not-allowed ${
                        reached
                          ? 'a2-yellow-btn'
                          : 'bg-slate-900 text-slate-500 border border-slate-800'
                      }`}
                    >
                      {reached ? 'Khắc Ấn Huy Hiệu Thần Thoại' : `Tiến Độ ${pct}%`}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick(1.05);
                        onEquipMythicBadge(equipped ? null : badge.id);
                      }}
                      className={`w-full py-2 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
                        equipped ? 'a2-emerald-btn' : 'a2-purple-btn'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{equipped ? 'Đang Đeo Danh Hiệu (Tháo)' : 'Đeo Danh Hiệu Này'}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* SECTION 3: ANIMATED VIP AVATAR FRAMES + ZODIAC AVATAR FRAMES */}
        {section === 'frames' && (
          <div className="space-y-5">
            {/* Wave 13: Animated VIP Avatar Frames */}
            <div className="rounded-2xl border border-amber-300/45 bg-gradient-to-b from-[#1a1335]/95 to-[#070b1a]/95 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Khung Avatar Động VIP · Hào Quang Xoay 360°</span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Mở khóa tăng Công &amp; Máu cộng dồn vĩnh viễn cho toàn đội hình. Hiện có{' '}
                    <span className="font-mono-nums font-black text-rose-300">
                      {save.dragonScales ?? 0} Vảy Rồng Cổ
                    </span>{' '}
                    · VIP {vipLevel}.
                  </p>
                </div>
                {equippedVipFrame && onEquipVipFrame && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(0.95);
                      onEquipVipFrame(null);
                    }}
                    className="a2-slate-btn px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap cursor-pointer"
                  >
                    Tháo Khung Động VIP
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VIP_AVATAR_FRAME_DEFS.map((vf) => {
                  const unlocked = unlockedVipFrames.has(vf.id);
                  const equipped = equippedVipFrame === vf.id;
                  const meetsVip = vipLevel >= vf.unlockVipLevel;
                  const canAfford =
                    meetsVip ||
                    ((save.dragonScales ?? 0) >= vf.unlockDragonScales &&
                      save.gems >= vf.unlockGems);

                  return (
                    <div
                      key={vf.id}
                      className={`rounded-2xl border p-3.5 flex items-center gap-3.5 ${
                        equipped
                          ? 'bg-[#1a1409] border-amber-300'
                          : unlocked
                          ? 'bg-[#091826] border-cyan-400/50'
                          : 'bg-[#070b18] border-slate-800'
                      }`}
                    >
                      <div className={`rounded-full p-[3px] shrink-0 ${vf.frameClass}`}>
                        <ZodiacAvatar
                          heroId={activeHero.id}
                          accentHex={activeHero.accentHex}
                          cloakHex={activeHero.cloakHex}
                          hairHex={activeHero.hairHex}
                          frameId={equippedFrame}
                          sizeClass="w-14 h-14"
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                          {vf.tierLabel}
                        </div>
                        <div className="font-display text-sm font-black text-white truncate">
                          {vf.name}
                        </div>
                        <p className="text-[11px] text-slate-300 leading-snug line-clamp-2 mt-0.5">
                          {vf.desc}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-1.5 text-[10px] font-mono-nums font-black text-emerald-300">
                          <span>+{vf.bonusAtk} ATK</span>
                          <span>+{vf.bonusHp} HP</span>
                        </div>

                        <div className="mt-2">
                          {unlocked ? (
                            <button
                              type="button"
                              disabled={equipped}
                              onClick={() => {
                                soundEngine.playUiClick(1.1);
                                onEquipVipFrame?.(vf.id);
                              }}
                              className={`w-full py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap cursor-pointer disabled:cursor-default ${
                                equipped ? 'a2-emerald-btn' : 'a2-yellow-btn'
                              }`}
                            >
                              {equipped ? 'Đang Trang Bị Khung VIP' : 'Trang Bị Khung Động'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={!canAfford || !onUnlockVipFrame}
                              onClick={() => {
                                soundEngine.playLevelUp();
                                onUnlockVipFrame?.(vf.id);
                              }}
                              className="a2-purple-btn w-full py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                            >
                              {meetsVip
                                ? `Nhận Miễn Phí (VIP ${vf.unlockVipLevel})`
                                : `Mở: ${vf.unlockDragonScales} Vảy + ${vf.unlockGems} Ngọc`}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Wave 13: Top Player Build Inspector Drawer */}
      {inspectedProfile && (() => {
        const heroDef = HERO_MAP[inspectedProfile.heroId] ?? HERO_MAP.artemis;
        const bannerDef = WAR_BANNER_MAP[inspectedProfile.warBannerId];
        const vipFrameDef = VIP_AVATAR_FRAME_MAP[inspectedProfile.vipFrameId];
        const copied = copiedRank === inspectedProfile.rank;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#03050d]/88">
            <div className="cel-panel-ornate w-full max-w-lg rounded-3xl p-5 a2-modal-enter">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`rounded-full p-[3px] shrink-0 ${vipFrameDef?.frameClass ?? ''}`}>
                    <ZodiacAvatar
                      heroId={heroDef.id}
                      accentHex={heroDef.accentHex}
                      cloakHex={heroDef.cloakHex}
                      hairHex={heroDef.hairHex}
                      frameId="world_dragon"
                      sizeClass="w-14 h-14"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                      TOP #{inspectedProfile.rank} · {inspectedProfile.titleBadge}
                    </div>
                    <h3 className="font-display text-lg font-black text-white truncate">
                      {inspectedProfile.name}
                    </h3>
                    <div className="text-[11px] text-slate-300">
                      Bang {inspectedProfile.guild} ·{' '}
                      <span className="font-mono-nums font-black text-amber-300">
                        {inspectedProfile.powerRating.toLocaleString('vi-VN')} LC
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectedProfile(null)}
                  aria-label="Đóng Soi Đội Hình"
                  className="a2-slate-btn w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <p className="text-xs italic text-amber-100/90 bg-[#0b1126] border border-amber-400/25 rounded-2xl px-3.5 py-2.5 mb-3.5">
                “{inspectedProfile.signatureQuote}”
              </p>

              <div className="grid grid-cols-2 gap-2.5 mb-4">
                <div className="rounded-xl bg-[#070b1a] border border-slate-800 p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Anh Hùng Chủ Lực</div>
                  <div className="text-xs font-black text-white mt-0.5">
                    {heroDef.name} · {inspectedProfile.heroStar}★
                  </div>
                  <div className="text-[10px] text-sky-300 mt-0.5">{heroDef.title}</div>
                </div>
                <div className="rounded-xl bg-[#070b1a] border border-slate-800 p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Thú Cưỡi 3D</div>
                  <div className="text-xs font-black text-amber-200 mt-0.5">
                    Hắc Long
                  </div>
                  <div className="text-[10px] text-cyan-300 mt-0.5">Tọa Kỵ Huyền Thoại</div>
                </div>
                <div className="rounded-xl bg-[#070b1a] border border-slate-800 p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Cờ Hiệu &amp; Khung VIP</div>
                  <div className="text-xs font-black text-emerald-200 mt-0.5">
                    {bannerDef?.name ?? 'Cờ Phượng Hoàng'}
                  </div>
                  <div className="text-[10px] text-amber-300 mt-0.5">{vipFrameDef?.name}</div>
                </div>
                <div className="rounded-xl bg-[#070b1a] border border-slate-800 p-3">
                  <div className="text-[10px] font-bold uppercase text-slate-400">Hồn Hoàn &amp; Thần Binh</div>
                  <div className="text-xs font-black text-purple-200 mt-0.5 font-mono-nums">
                    Hồn Hoàn Lv.{inspectedProfile.soulRingTotalLv} · Thần Binh Bậc {inspectedProfile.mythicWeaponTier}
                  </div>
                  <div className="text-[10px] text-slate-300 mt-0.5">Cộng hưởng Ngũ Hồn Chí Tôn</div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                {onCopyTopProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playLevelUp();
                      onCopyTopProfile(inspectedProfile);
                      setCopiedRank(inspectedProfile.rank);
                    }}
                    className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      copied ? 'a2-emerald-btn' : 'a2-yellow-btn'
                    }`}
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>
                      {copied
                        ? 'Đã Đồng Bộ Đội Hình (Các Mục Đã Sở Hữu)!'
                        : 'Sao Chép Đội Hình Cao Thủ'}
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setInspectedProfile(null)}
                  className="a2-slate-btn py-2.5 px-4 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

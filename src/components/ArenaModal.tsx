import React, { useEffect, useMemo, useState } from 'react';
import { Award, Check, Cloud, Crown, Shield, Swords, Ticket, Trophy, Users, X, Zap } from 'lucide-react';
import arenaBannerArt from '../assets/images/arena_colosseum_pvp_1794983175991.jpg';
import { soundEngine } from '../audio/soundEngine';
import { HERO_MAP } from '../data/heroesData';
import {
  ARENA_RANK_TIERS,
  MAX_DAILY_ARENA_TICKETS,
  generateArenaOpponents,
  getArenaRankInfo,
  normalizeArena,
} from '../data/wave5Data';
import {
  buildLiveArenaOpponents,
  buildMergedArenaLeaderboard,
  LeaderboardFilterMode,
} from '../data/liveAiLeaderboards';
import { liveAiSocket } from '../services/liveAiSocket';
import {
  CloudLeaderboardRow,
  subscribeRealLeaderboard,
} from '../services/playerCloudService';
import {
  EQUALIZED_ARENA_BASELINE,
  normalizeFairProgression,
} from '../engine/aaaFivePillarsDirector';
import {
  EQUALIZED_TRIAL_KIT_LIST,
  EQUALIZED_TRIAL_ROUNDS,
  type EqualizedTrialKitId,
} from '../engine/wave10FivePillars';
import {
  EQUALIZED_RIFT_MILESTONES,
  getDailyRiftMutators,
  getUtcDateKeyWave11,
  normalizeEqualizedRiftState,
} from '../engine/wave11FivePillars';
import { AiLivePlayerProfile, AiRivalRecord, ArenaOpponent, SaveData } from '../types/game';
import { GoldCoinIcon, HeroCrestSvg, SoulGemIcon } from './GameIcons';

interface ArenaModalProps {
  save: SaveData;
  powerRating: number;
  playerDisplayName?: string;
  currentUid?: string | null;
  equalizedMode?: boolean;
  rivals?: AiRivalRecord[];
  onToggleEqualizedMode?: (enabled: boolean) => void;
  onStartDuel: (opponent: ArenaOpponent) => void;
  onStartEqualizedTrial?: (kitId: EqualizedTrialKitId, round: 1 | 2 | 3) => void;
  onStartEqualizedRift?: (kitId: EqualizedTrialKitId) => void;
  onClaimEqualizedRiftMilestone?: (floor: number) => void;
  onChallengeLiveAi?: (aiPlayerId: string) => void;
  onInspectAiPlayer?: (aiPlayerId: string) => void;
  onBuyTicket: () => void;
  onClaimRankTier: (tierId: string) => void;
  onOpenArenaShop?: () => void;
  onClose: () => void;
}

export const ArenaModal: React.FC<ArenaModalProps> = ({
  save,
  powerRating,
  playerDisplayName,
  currentUid = null,
  equalizedMode,
  rivals = [],
  onToggleEqualizedMode,
  onStartDuel,
  onStartEqualizedTrial,
  onStartEqualizedRift,
  onClaimEqualizedRiftMilestone,
  onChallengeLiveAi,
  onInspectAiPlayer,
  onBuyTicket,
  onClaimRankTier,
  onOpenArenaShop,
  onClose,
}) => {
  const [subTab, setSubTab] = useState<'duel' | 'trial' | 'rift' | 'ranks' | 'ladder'>('duel');
  const [ladderFilter, setLadderFilter] = useState<LeaderboardFilterMode>('all');
  const [imgErr, setImgErr] = useState(false);
  const [aiPlayers, setAiPlayers] = useState<AiLivePlayerProfile[]>(
    () => liveAiSocket.getSnapshot()?.players ?? []
  );
  const [cloudPlayers, setCloudPlayers] = useState<CloudLeaderboardRow[]>([]);

  const arena = normalizeArena(save.arena);
  const fairProg = normalizeFairProgression(save.fairProgression);
  const [selectedKitId, setSelectedKitId] = useState<EqualizedTrialKitId>(
    (fairProg.selectedTrialKitId as EqualizedTrialKitId) || 'assassin_counter'
  );
  const trialRound: 1 | 2 | 3 =
    fairProg.equalizedTrialRound === 2
      ? 2
      : fairProg.equalizedTrialRound === 3
      ? 3
      : 1;
  const isEqualized = equalizedMode ?? fairProg.arenaEqualizedMode;
  const rankInfo = getArenaRankInfo(arena.rating);
  const activeHero = HERO_MAP[save.selectedHeroId] ?? HERO_MAP.aurelia;
  const displayName = playerDisplayName || `Bạn (${activeHero.name})`;

  useEffect(() => {
    liveAiSocket.ensureConnected(displayName);
    const unsubAi = liveAiSocket.subscribeSnapshot((snap) => {
      setAiPlayers(snap.players);
    });
    const unsubCloud = subscribeRealLeaderboard(
      (rows) => setCloudPlayers(rows),
      () => {},
      40
    );
    return () => {
      unsubAi();
      unsubCloud();
    };
  }, [displayName]);

  const liveOpponents = useMemo(
    () => buildLiveArenaOpponents(aiPlayers, arena.rating, powerRating),
    [aiPlayers, arena.rating, powerRating]
  );

  const fallbackOpponents = useMemo(
    () => generateArenaOpponents(arena.rating, powerRating),
    [arena.rating, powerRating]
  );

  const ladderRows = useMemo(
    () =>
      buildMergedArenaLeaderboard({
        filter: ladderFilter,
        aiPlayers,
        cloudPlayers,
        playerName: displayName,
        playerTitle: save.equippedTitle ?? 'Chiến Binh Tinh Giới',
        playerHeroId: activeHero.id,
        playerRating: arena.rating,
        playerPower: powerRating,
        currentUid,
      }),
    [activeHero.id, aiPlayers, arena.rating, cloudPlayers, currentUid, displayName, ladderFilter, powerRating, save.equippedTitle]
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/90 overflow-y-auto">
      <div className="cel-panel-ornate w-full max-w-4xl rounded-3xl p-4 sm:p-6 my-auto max-h-[92vh] overflow-y-auto a2-scroll a2-modal-enter">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-400/60 flex items-center justify-center shrink-0">
              <Swords className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-black text-white truncate">
                Đấu Trường Arena Xếp Hạng 3D (1v1)
              </h2>
              <p className="text-[11px] text-slate-300 truncate">
                Đối đầu Kẻ Thù Ảo trong 45 giây · Tích điểm Leo Hạng &amp; nhận Ngọc Hồn theo bậc!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-[#070b1a] border border-amber-400/40 text-xs font-mono-nums font-black text-amber-200 flex items-center gap-1.5">
              <Ticket className="w-3.5 h-3.5 text-amber-300" />
              <span>
                {arena.ticketsRemaining}/{MAX_DAILY_ARENA_TICKETS} Vé
              </span>
            </div>
            <button
              type="button"
              disabled={save.gems < 20}
              onClick={() => {
                soundEngine.playUiClick(1.05);
                onBuyTicket();
              }}
              className="a2-purple-btn px-2.5 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              title="Mua thêm 1 Vé Đấu Trường bằng 20 Ngọc Hồn"
            >
              +1 Vé (20 Ngọc)
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng Đấu Trường"
              className="a2-slate-btn w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hero Banner + Player Rank Strip */}
        <div className="relative rounded-2xl overflow-hidden border border-amber-400/40 mb-4 bg-gradient-to-br from-[#190a1c] to-[#081026]">
          {!imgErr && (
            <img
              src={arenaBannerArt}
              alt="Đấu Trường Arena Hoàng Đạo"
              referrerPolicy="no-referrer"
              onError={() => setImgErr(true)}
              className="w-full h-32 sm:h-36 object-cover opacity-70"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#060916]/95 via-[#0b1026]/80 to-[#060916]/75 p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                Hạng Hiện Tại · {rankInfo.name}
              </div>
              <div className="flex items-baseline gap-2.5 mt-0.5">
                <span className={`font-display text-2xl font-black ${rankInfo.colorClass}`}>
                  {arena.rating} Điểm
                </span>
                <span className="text-xs font-mono-nums text-slate-300">
                  (Cao nhất: {Math.max(arena.rating, arena.bestRating)})
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono-nums text-slate-200 mt-1">
                <span className="text-emerald-300 font-bold">Thắng: {arena.wins}</span>
                <span className="text-rose-300 font-bold">Thua: {arena.losses}</span>
                <span className="text-amber-300 font-bold">Chuỗi thắng: ×{arena.streak}</span>
                <span className="text-sky-300 font-bold">Xu Arena: {arena.arenaCoins}</span>
                {onOpenArenaShop && (
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(1.05);
                      onClose();
                      onOpenArenaShop();
                    }}
                    className="px-2.5 py-0.5 rounded-lg bg-sky-500/20 border border-sky-300/65 text-[10px] font-black text-sky-200 hover:bg-sky-500/35 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    Shop Xu Arena →
                  </button>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-[#070b1a]/90 border border-amber-400/35 px-3.5 py-2 text-right">
              <div className="text-[10px] text-slate-400 font-bold uppercase">Lực Chiến Xuất Trận</div>
              <div className="font-mono-nums text-lg font-black text-amber-300">
                {powerRating.toLocaleString('vi-VN')} LC
              </div>
            </div>
          </div>
        </div>

        {/* 5 Sub-Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setSubTab('duel');
            }}
            className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
              subTab === 'duel' ? 'a2-yellow-btn shadow-lg' : 'a2-slate-btn text-slate-300'
            }`}
          >
            <Swords className="w-4 h-4 shrink-0" />
            <span>Khiêu Chiến 3D</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setSubTab('trial');
            }}
            className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
              subTab === 'trial' ? 'a2-emerald-btn shadow-lg' : 'a2-slate-btn text-slate-300'
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" />
            <span>Thử Nghiệm</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setSubTab('rift');
            }}
            className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
              subTab === 'rift' ? 'a2-purple-btn shadow-lg' : 'a2-slate-btn text-slate-300'
            }`}
          >
            <Zap className="w-4 h-4 shrink-0" />
            <span>Tháp Đồng Bộ</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setSubTab('ranks');
            }}
            className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
              subTab === 'ranks' ? 'a2-emerald-btn shadow-lg' : 'a2-slate-btn text-slate-300'
            }`}
          >
            <Award className="w-4 h-4 shrink-0" />
            <span>Thưởng Bậc Hạng</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setSubTab('ladder');
            }}
            className={`py-2.5 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
              subTab === 'ladder' ? 'a2-purple-btn shadow-lg' : 'a2-slate-btn text-slate-300'
            }`}
          >
            <Trophy className="w-4 h-4 shrink-0" />
            <span>Bảng Xếp Hạng</span>
          </button>
        </div>

        {subTab === 'duel' && (
          <div className="space-y-3">
            {/* Pillar 3: Fair-Play Equalized PvP Mode Switcher */}
            <div className="rounded-2xl border border-emerald-400/35 bg-[#06111c]/95 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="min-w-0 space-y-0.5">
                <div className="flex flex-wrap items-center gap-2 text-xs font-black text-emerald-200">
                  <Shield className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>Chế Độ Đấu Trường 1v1</span>
                  <span className="font-mono-nums text-[10px] text-amber-300">
                    · Thắng Công Bằng: {fairProg.equalizedArenaWins} trận
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-snug">
                  {isEqualized
                    ? `Cân Bằng Chỉ Số: Cả hai bên đồng bộ HP ${EQUALIZED_ARENA_BASELINE.maxHp.toLocaleString('vi-VN')} · Công ${EQUALIZED_ARENA_BASELINE.attack} · Chí Mạng ${Math.round(EQUALIZED_ARENA_BASELINE.critChance * 100)}% (+35% Xu Arena).`
                    : 'Tự Do Lực Chiến: Giữ nguyên toàn bộ chỉ số trang bị, Hồn Hoàn & Thần Binh khi xuất trận.'}
                </p>
              </div>
              {onToggleEqualizedMode && (
                <div className="inline-flex items-center gap-1 rounded-xl bg-[#040814] border border-slate-700 p-1 shrink-0 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(1.06);
                      onToggleEqualizedMode(true);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black cursor-pointer whitespace-nowrap transition-colors ${
                      isEqualized
                        ? 'bg-emerald-500/25 border border-emerald-300/70 text-emerald-200'
                        : 'text-slate-400 hover:text-white border border-transparent'
                    }`}
                  >
                    Công Bằng (+35% Xu)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(1.02);
                      onToggleEqualizedMode(false);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black cursor-pointer whitespace-nowrap transition-colors ${
                      !isEqualized
                        ? 'bg-amber-400/20 border border-amber-300/70 text-amber-200'
                        : 'text-slate-400 hover:text-white border border-transparent'
                    }`}
                  >
                    Tự Do Lực Chiến
                  </button>
                </div>
              )}
            </div>

            {(() => {
              const pendingVendetta = rivals.find((r) => r.vendettaPending);
              if (!pendingVendetta || !onChallengeLiveAi) return null;
              return (
                <div className="rounded-2xl border border-rose-400/55 bg-[#1b0914]/95 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs font-black text-rose-200 flex items-center gap-1.5">
                      <Swords className="w-3.5 h-3.5 text-rose-300 shrink-0" />
                      <span className="truncate">
                        Kình Địch Phục Thù: {pendingVendetta.aiDisplayName} [AI Live]
                      </span>
                      <span className="font-mono-nums text-amber-300 shrink-0">
                        +{pendingVendetta.revengeBonusPct ?? 25}% Thưởng
                      </span>
                    </div>
                    <div className="text-[11px] font-mono-nums text-slate-300">
                      Tỷ số {pendingVendetta.winsAgainst}T–{pendingVendetta.lossesAgainst}B · {pendingVendetta.lastEncounterReason}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(1.1);
                      onClose();
                      onChallengeLiveAi(pendingVendetta.aiPlayerId);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-amber-400 text-slate-950 text-xs font-black whitespace-nowrap cursor-pointer shrink-0"
                  >
                    Đáp Trả Phục Thù 1v1
                  </button>
                </div>
              );
            })()}

            {liveOpponents.length > 0 && (
              <div className="text-[11px] text-sky-200/90 flex items-center gap-2 px-1">
                <span className="size-2 rounded-full bg-emerald-400 shrink-0" />
                <span>
                  Đối thủ <strong className="text-sky-300">[AI Live]</strong> trực tuyến thời gian thực · Tự né mũi tên, đón đầu góc bắn &amp; che trụ chiến thuật!
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(liveOpponents.length > 0
                ? liveOpponents
                : fallbackOpponents.map((opp) => ({ opponent: opp, aiProfile: null }))
              ).map(({ opponent: opp, aiProfile }) => {
                const hero = HERO_MAP[opp.heroId] ?? HERO_MAP.aurelia;
                const disabled = !aiProfile && arena.ticketsRemaining <= 0;
                return (
                  <div
                    key={opp.id}
                    className="cel-panel rounded-2xl p-4 flex flex-col justify-between gap-3 border border-amber-400/30 hover:border-amber-300/75 transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2.5">
                        <span className="px-2 py-0.5 rounded-md bg-sky-500/20 border border-sky-400/45 text-[10px] font-black text-sky-200 flex items-center gap-1">
                          {aiProfile && <span className="size-1.5 rounded-full bg-emerald-400" />}
                          <span>{opp.title}</span>
                        </span>
                        <span className="font-mono-nums text-xs font-black text-amber-300">
                          {opp.rating} Điểm
                        </span>
                      </div>

                      <div className="flex items-center gap-3 mb-3">
                        <HeroCrestSvg
                          heroId={hero.id}
                          accentHex={hero.accentHex}
                          cloakHex={hero.cloakHex}
                          hairHex={hero.hairHex}
                          className="w-12 h-12 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-display text-sm font-black text-white truncate">
                            {opp.name}
                          </div>
                          <div className="text-[11px] font-semibold text-sky-300 truncate">
                            {hero.name} · {opp.powerRating.toLocaleString('vi-VN')} LC
                          </div>
                          {aiProfile && (
                            <div className="text-[10px] text-slate-400 font-mono-nums truncate">
                              {aiProfile.duelWins}T-{aiProfile.duelLosses}B · Chuỗi ×{aiProfile.winStreak}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px] font-mono-nums bg-[#060916] border border-slate-800 rounded-xl p-2.5">
                        <div className="flex items-center gap-1 text-emerald-300 font-bold">
                          <Shield className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            HP {isEqualized ? EQUALIZED_ARENA_BASELINE.maxHp : opp.maxHp}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-300 font-bold">
                          <Zap className="w-3.5 h-3.5 shrink-0" />
                          <span>
                            ATK {isEqualized ? EQUALIZED_ARENA_BASELINE.attack : opp.attack}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] font-mono-nums font-bold">
                        <span className="text-emerald-300">Thắng: +{opp.rewardPoints} Điểm</span>
                        <span className="text-amber-300">
                          +
                          {isEqualized
                            ? Math.round(opp.rewardArenaCoins * 1.35)
                            : opp.rewardArenaCoins}{' '}
                          Xu
                        </span>
                      </div>

                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          soundEngine.playUiClick(1.08);
                          if (aiProfile && onChallengeLiveAi) {
                            onClose();
                            onChallengeLiveAi(aiProfile.id);
                          } else {
                            onStartDuel(opp);
                          }
                        }}
                        className={`w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer ${
                          disabled
                            ? 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                            : 'a2-yellow-btn'
                        }`}
                      >
                        <Swords className="w-4 h-4" />
                        <span>
                          {disabled
                            ? 'Hết Vé Hôm Nay'
                            : aiProfile
                            ? 'Thách Đấu 1v1 Live'
                            : 'Khiêu Chiến 3D'}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {subTab === 'ranks' && (
          <div className="space-y-2.5">
            {ARENA_RANK_TIERS.map((tier) => {
              const best = Math.max(arena.rating, arena.bestRating);
              const unlocked = best >= tier.minRating;
              const claimed = arena.claimedRankTiers.includes(tier.id);
              const ready = unlocked && !claimed;

              return (
                <div
                  key={tier.id}
                  className={`rounded-2xl p-3.5 border flex flex-wrap items-center justify-between gap-3 ${
                    claimed
                      ? 'bg-[#08151d]/85 border-emerald-500/40'
                      : ready
                      ? 'bg-gradient-to-r from-[#241b0c] to-[#11172d] border-amber-300'
                      : 'bg-[#070b1a] border-slate-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0d1530] border border-amber-400/35 flex items-center justify-center shrink-0">
                      <Crown className={`w-5 h-5 ${tier.colorClass}`} />
                    </div>
                    <div>
                      <div className={`font-display text-sm font-black ${tier.colorClass}`}>
                        Bậc {tier.name}
                      </div>
                      <div className="text-[11px] font-mono-nums text-slate-300">
                        Đạt {tier.minRating} Điểm Xếp Hạng (Kỷ lục: {best})
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2.5 text-xs font-mono-nums font-black">
                      <span className="flex items-center gap-1 text-purple-300">
                        <SoulGemIcon className="w-3.5 h-3.5" />+{tier.rewardGems}
                      </span>
                      <span className="flex items-center gap-1 text-amber-300">
                        <GoldCoinIcon className="w-3.5 h-3.5" />+{tier.rewardGold}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={!ready}
                      onClick={() => {
                        soundEngine.playVictory();
                        onClaimRankTier(tier.id);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer ${
                        claimed
                          ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 cursor-default'
                          : ready
                          ? 'a2-emerald-btn'
                          : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {claimed && <Check className="w-3.5 h-3.5" />}
                      <span>{claimed ? 'Đã Nhận' : ready ? 'Nhận Thưởng' : 'Chưa Đạt'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {subTab === 'ladder' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/20 bg-[#070b1a] p-2">
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setLadderFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    ladderFilter === 'all'
                      ? 'bg-sky-500/20 text-sky-200 border border-sky-400/50'
                      : 'text-slate-300 hover:text-white border border-transparent'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Tất Cả (Thật + {aiPlayers.length} AI Live)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLadderFilter('real')}
                  className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                    ladderFilter === 'real'
                      ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/50'
                      : 'text-slate-300 hover:text-white border border-transparent'
                  }`}
                >
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Chỉ Người Thật ({Math.max(1, cloudPlayers.length)})</span>
                </button>
              </div>
              <span className="text-[11px] text-slate-400">
                Cập nhật điểm hạng Arena theo thời gian thực
              </span>
            </div>

            <div className="space-y-2">
              {ladderRows.map((row) => {
                const idx = row.rank - 1;
                const hero = HERO_MAP[row.heroId] ?? HERO_MAP.aurelia;
                const tier = getArenaRankInfo(row.rating);
                return (
                  <div
                    key={row.id}
                    className={`rounded-2xl px-4 py-3 border flex items-center justify-between gap-3 ${
                      row.isPlayer
                        ? 'bg-gradient-to-r from-amber-500/20 via-[#101836] to-[#101836] border-amber-300'
                        : 'bg-[#070b1a] border-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono-nums text-xs font-black shrink-0 ${
                          idx === 0
                            ? 'bg-amber-400 text-slate-950'
                            : idx === 1
                            ? 'bg-slate-300 text-slate-950'
                            : idx === 2
                            ? 'bg-amber-700 text-white'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        #{row.rank}
                      </span>
                      <HeroCrestSvg
                        heroId={hero.id}
                        accentHex={hero.accentHex}
                        cloakHex={hero.cloakHex}
                        hairHex={hero.hairHex}
                        className="w-9 h-9 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-black text-white truncate flex items-center gap-1.5">
                          {row.isAiLive && (
                            <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
                          )}
                          {row.isAiLive && row.aiPlayer && onInspectAiPlayer ? (
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playUiClick(1.05);
                                onInspectAiPlayer(row.aiPlayer!.id);
                              }}
                              className="truncate text-sky-200 hover:text-amber-300 underline decoration-sky-400/40 underline-offset-2 cursor-pointer"
                            >
                              {row.name}
                            </button>
                          ) : (
                            <span className="truncate">
                              {row.name}
                              {row.isPlayer ? ' (Bạn)' : ''}
                            </span>
                          )}
                          {row.isAiLive ? (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-sky-500/20 border border-sky-400/45 text-sky-300 shrink-0">
                              [AI Live]
                            </span>
                          ) : (
                            <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/45 text-emerald-300 shrink-0">
                              Người Thật
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {row.title} · {row.powerRating.toLocaleString('vi-VN')} LC
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <div className="text-right">
                        <div className={`text-xs font-black ${tier.colorClass}`}>{tier.name}</div>
                        <div className="font-mono-nums text-sm font-black text-amber-300">
                          {row.rating} Điểm
                        </div>
                      </div>
                      {row.isAiLive && row.aiPlayer && onChallengeLiveAi && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick(1.08);
                            onClose();
                            onChallengeLiveAi(row.aiPlayer!.id);
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/35 border border-sky-400/45 text-[11px] font-black text-sky-200 cursor-pointer whitespace-nowrap flex items-center gap-1"
                        >
                          <Swords className="w-3.5 h-3.5" />
                          <span>Đấu 1v1</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {subTab === 'trial' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-400/40 bg-[#061420]/95 p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                  Đấu Trường Thử Nghiệm Đồng Bộ · Kỹ Năng Thuần Túy
                </div>
                <p className="text-xs text-slate-300 mt-1">
                  Toàn bộ người chơi dùng chỉ số chuẩn hóa ngang nhau — chọn 1 trong 3 Bộ Mẫu và chinh phục 3 Vòng leo thưởng Mùa Giải!
                </p>
              </div>
              <div className="rounded-xl bg-[#070b1a] border border-emerald-400/35 px-3 py-1.5 text-right font-mono-nums">
                <div className="text-[10px] text-slate-400">Vòng Hiện Tại</div>
                <div className="text-sm font-black text-amber-300">
                  Vòng {trialRound}/3 · Thắng {fairProg.equalizedTrialWins ?? 0} trận
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {EQUALIZED_TRIAL_KIT_LIST.map((kit) => {
                const selected = selectedKitId === kit.id;
                const hero = HERO_MAP[kit.heroId] ?? HERO_MAP.aurelia;
                return (
                  <button
                    key={kit.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(1.05);
                      setSelectedKitId(kit.id);
                    }}
                    className={`rounded-2xl p-3.5 text-left border transition-colors cursor-pointer flex flex-col justify-between gap-2 ${
                      selected
                        ? 'bg-emerald-500/15 border-emerald-300 ring-1 ring-emerald-300/60'
                        : 'bg-[#070b1a] border-slate-800 hover:border-emerald-400/45'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] font-black ${kit.accentClass}`}>
                          {kit.badge}
                        </span>
                        {selected && <Check className="w-4 h-4 text-emerald-300 shrink-0" />}
                      </div>
                      <div className="text-sm font-black text-white mt-0.5">{kit.name}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">Mẫu Tướng: {hero.name}</div>
                      <p className="text-[11px] text-slate-300 mt-1.5 leading-snug">{kit.desc}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-800/80 text-[10px] font-mono-nums text-amber-200 space-y-0.5">
                      <div>
                        HP {kit.baseMaxHp.toLocaleString('vi-VN')} · Công {kit.baseAttack} · CM {Math.round(kit.baseCritChance * 100)}%
                      </div>
                      <div className="text-emerald-300 font-bold">{kit.perkSummary}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {EQUALIZED_TRIAL_ROUNDS.map((r) => {
                const isCurrent = trialRound === r.round;
                const isDone = trialRound > r.round;
                return (
                  <div
                    key={r.round}
                    className={`rounded-2xl p-3 border ${
                      isCurrent
                        ? 'bg-amber-400/12 border-amber-300/80'
                        : isDone
                        ? 'bg-emerald-950/35 border-emerald-500/40'
                        : 'bg-[#070b1a] border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-black">
                      <span className={isCurrent ? 'text-amber-200' : 'text-white'}>{r.title}</span>
                      <span className="font-mono-nums text-[10px] text-emerald-300">
                        {isDone ? 'Đã Vượt' : isCurrent ? 'Sẵn Sàng' : 'Khóa'}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">{r.opponentTitle}</div>
                    <div className="mt-2 text-[11px] font-mono-nums font-bold text-sky-200">
                      +{r.seasonPoints} Điểm Mùa · +{r.arenaCoins} Xu Arena · +{r.gems} Ngọc
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              disabled={!onStartEqualizedTrial}
              onClick={() => {
                if (!onStartEqualizedTrial) return;
                soundEngine.playVictory();
                onStartEqualizedTrial(selectedKitId, trialRound);
              }}
              className="a2-emerald-btn w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45"
            >
              <Swords className="w-4 h-4" />
              <span>
                Vào Đấu Thử Nghiệm Đồng Bộ · Vòng {trialRound}/3 (Miễn Phí Vé)
              </span>
            </button>
          </div>
        )}

        {subTab === 'rift' && (() => {
          const todayKey = getUtcDateKeyWave11();
          const dailyMutators = getDailyRiftMutators(todayKey);
          const riftState = normalizeEqualizedRiftState(fairProg.equalizedRift, todayKey);
          return (
            <div className="space-y-4">
              <div className="rounded-2xl border border-purple-400/45 bg-[#0e0b24]/95 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-black text-purple-300 uppercase tracking-wider">
                    Tháp Vô Hạn Đồng Bộ Mutator · Công Bằng 100%
                  </div>
                  <p className="text-xs text-slate-300 mt-1">
                    Chuẩn hóa hoàn toàn sức mạnh nhân vật · 2 Biến Số (Mutator) xoay vòng mỗi ngày · Càng leo cao thưởng Mảnh Thánh Lò &amp; Ngọc Hồn càng lớn!
                  </p>
                </div>
                <div className="rounded-xl bg-[#070b1a] border border-purple-400/35 px-3 py-1.5 text-right font-mono-nums tabular-nums">
                  <div className="text-[10px] text-slate-400">Kỷ Lục Mùa · Hôm Nay ({todayKey})</div>
                  <div className="text-sm font-black text-amber-300">
                    Tầng {riftState.seasonBestFloor} · Hôm nay: Tầng {riftState.bestFloorToday}
                  </div>
                </div>
              </div>

              {/* Today's 2 Daily Rotating Mutators */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dailyMutators.map((mut) => (
                  <div
                    key={mut.id}
                    className="rounded-2xl border border-sky-400/35 bg-[#070b1a] p-3.5 space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-amber-200">{mut.name}</span>
                      <span className="text-[10px] font-bold text-sky-300 uppercase">
                        Biến Số Hôm Nay
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">{mut.desc}</p>
                    <div className="text-[10px] font-mono-nums text-emerald-300 font-bold pt-0.5">
                      ATK ×{mut.playerAtkMult.toFixed(2)} · Thức Tỉnh ×{mut.overdriveChargeMult.toFixed(2)} · Quái HP ×{mut.enemyHpMult.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Kit Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {EQUALIZED_TRIAL_KIT_LIST.map((kit) => {
                  const selected = selectedKitId === kit.id;
                  return (
                    <button
                      key={`rift-kit-${kit.id}`}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick(1.05);
                        setSelectedKitId(kit.id);
                      }}
                      className={`rounded-xl p-3 text-left border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-purple-500/20 border-purple-300 ring-1 ring-purple-300/60'
                          : 'bg-[#070b1a] border-slate-800 hover:border-purple-400/45'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-black text-white">{kit.name}</span>
                        {selected && <Check className="w-3.5 h-3.5 text-purple-300 shrink-0" />}
                      </div>
                      <div className="text-[10px] text-slate-300 mt-1">{kit.perkSummary}</div>
                    </button>
                  );
                })}
              </div>

              {/* 5 Seasonal Floor Milestones */}
              <div className="space-y-2">
                <div className="text-xs font-black text-amber-200">
                  Mốc Thưởng Tháp Vô Hạn Đồng Bộ (Nhận 1 lần/Mùa)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                  {EQUALIZED_RIFT_MILESTONES.map((ms) => {
                    const reached = riftState.seasonBestFloor >= ms.floor;
                    const claimed = riftState.claimedMilestones.includes(ms.floor);
                    return (
                      <div
                        key={ms.floor}
                        className={`rounded-xl p-2.5 border flex flex-col justify-between gap-2 ${
                          claimed
                            ? 'bg-emerald-950/35 border-emerald-500/45'
                            : reached
                            ? 'bg-amber-400/15 border-amber-300/80'
                            : 'bg-[#070b1a] border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-black text-white">Tầng {ms.floor}</div>
                          <div className="text-[10px] text-slate-300 mt-0.5 leading-snug">
                            +{ms.gems} Ngọc · +{ms.forgeRelicShards} Mảnh Lò
                          </div>
                          <div className="text-[10px] font-mono-nums text-amber-200">
                            +{ms.gold.toLocaleString('vi-VN')} Vàng
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!reached || claimed || !onClaimEqualizedRiftMilestone}
                          onClick={() => {
                            soundEngine.playVictory();
                            onClaimEqualizedRiftMilestone?.(ms.floor);
                          }}
                          className={`w-full py-1.5 rounded-lg text-[10px] font-black cursor-pointer disabled:cursor-not-allowed ${
                            claimed
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                              : reached
                              ? 'a2-yellow-btn text-slate-950'
                              : 'bg-slate-900 text-slate-500 border border-slate-800'
                          }`}
                        >
                          {claimed ? 'Đã Nhận' : reached ? 'Nhận Thưởng' : `Đạt T${ms.floor}`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <button
                type="button"
                disabled={!onStartEqualizedRift}
                onClick={() => {
                  if (!onStartEqualizedRift) return;
                  soundEngine.playVictory();
                  onClose();
                  onStartEqualizedRift(selectedKitId);
                }}
                className="a2-purple-btn w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-45"
              >
                <Zap className="w-4 h-4" />
                <span>Vào Tháp Vô Hạn Đồng Bộ (Miễn Phí · Chuẩn Hóa Chỉ Số)</span>
              </button>
            </div>
          );
        })()}
      </div>
    </div>
  );
};

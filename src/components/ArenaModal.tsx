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
import { CloudLeaderboardRow, fetchRealLeaderboard } from '../services/playerCloudService';
import { AiLivePlayerProfile, ArenaOpponent, SaveData } from '../types/game';
import { GoldCoinIcon, HeroCrestSvg, SoulGemIcon } from './GameIcons';

interface ArenaModalProps {
  save: SaveData;
  powerRating: number;
  playerDisplayName?: string;
  currentUid?: string | null;
  onStartDuel: (opponent: ArenaOpponent) => void;
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
  onStartDuel,
  onChallengeLiveAi,
  onInspectAiPlayer,
  onBuyTicket,
  onClaimRankTier,
  onOpenArenaShop,
  onClose,
}) => {
  const [subTab, setSubTab] = useState<'duel' | 'ranks' | 'ladder'>('duel');
  const [ladderFilter, setLadderFilter] = useState<LeaderboardFilterMode>('all');
  const [imgErr, setImgErr] = useState(false);
  const [aiPlayers, setAiPlayers] = useState<AiLivePlayerProfile[]>(
    () => liveAiSocket.getSnapshot()?.players ?? []
  );
  const [cloudPlayers, setCloudPlayers] = useState<CloudLeaderboardRow[]>([]);

  const arena = normalizeArena(save.arena);
  const rankInfo = getArenaRankInfo(arena.rating);
  const activeHero = HERO_MAP[save.selectedHeroId] ?? HERO_MAP.artemis;
  const displayName = playerDisplayName || `Bạn (${activeHero.name})`;

  useEffect(() => {
    liveAiSocket.ensureConnected(displayName);
    const unsub = liveAiSocket.subscribeSnapshot((snap) => {
      setAiPlayers(snap.players);
    });
    void fetchRealLeaderboard(40)
      .then((rows) => setCloudPlayers(rows))
      .catch(() => {});
    return unsub;
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

        {/* 3 Sub-Tabs */}
        <div className="grid grid-cols-3 gap-2 mb-4">
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
            <Swords className="w-4 h-4" />
            <span>Khiêu Chiến 3D</span>
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
            <Award className="w-4 h-4" />
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
            <Trophy className="w-4 h-4" />
            <span>Bảng Xếp Hạng</span>
          </button>
        </div>

        {subTab === 'duel' && (
          <div className="space-y-3">
            {liveOpponents.length > 0 && (
              <div className="text-[11px] text-sky-200/90 flex items-center gap-2 px-1">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>
                  Đối thủ <strong className="text-sky-300">[AI Live]</strong> trực tuyến thời gian thực · Tự né mũi tên &amp; đồng bộ điểm hạng 1v1 lên máy chủ!
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(liveOpponents.length > 0
                ? liveOpponents
                : fallbackOpponents.map((opp) => ({ opponent: opp, aiProfile: null }))
              ).map(({ opponent: opp, aiProfile }) => {
                const hero = HERO_MAP[opp.heroId] ?? HERO_MAP.artemis;
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
                          <span>HP {opp.maxHp}</span>
                        </div>
                        <div className="flex items-center gap-1 text-amber-300 font-bold">
                          <Zap className="w-3.5 h-3.5 shrink-0" />
                          <span>ATK {opp.attack}</span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 space-y-2.5">
                      <div className="flex items-center justify-between text-[11px] font-mono-nums font-bold">
                        <span className="text-emerald-300">Thắng: +{opp.rewardPoints} Điểm</span>
                        <span className="text-amber-300">+{opp.rewardArenaCoins} Xu</span>
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
                const hero = HERO_MAP[row.heroId] ?? HERO_MAP.artemis;
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
      </div>
    </div>
  );
};

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Award,
  CheckCircle2,
  Clock,
  Crown,
  History,
  Lock,
  Play,
  RefreshCw,
  ShieldCheck,
  Swords,
  Trophy,
  X,
} from 'lucide-react';
import {
  WeeklyBossClaimReceipt,
  WeeklyBossSchedule,
  WeeklyBossSeasonClaimReceipt,
  WeeklyBossSeasonStateResponse,
  WeeklyBossStateResponse,
} from '../data/weeklyBossData';
import {
  claimWeeklyBossReward,
  claimWeeklyBossSeasonReward,
  fetchWeeklyBossSeasonState,
  fetchWeeklyBossState,
  startWeeklyBossAttempt,
} from '../services/weeklyBossApi';
import { liveAiSocket } from '../services/liveAiSocket';
import {
  buildMergedWeeklyBossLeaderboard,
  buildMergedWeeklySeasonLeaderboard,
  LeaderboardFilterMode,
} from '../data/liveAiLeaderboards';
import type { AiLivePlayerProfile } from '../types/game';

interface WeeklyRankedBossModalProps {
  isAuthenticated: boolean;
  playerDisplayName: string;
  currentUid?: string;
  onStartVerifiedRun: (params: {
    attemptId: string;
    schedule: WeeklyBossSchedule;
  }) => void;
  onStartPracticeRun?: (schedule: WeeklyBossSchedule) => void;
  onRewardClaimed: (receipt: WeeklyBossClaimReceipt) => void;
  onSeasonRewardClaimed?: (receipt: WeeklyBossSeasonClaimReceipt) => void;
  onInspectAiPlayer?: (aiPlayerId: string) => void;
  onOpenAuthModal?: () => void;
  onClose: () => void;
}

function formatCountdown(endsAtMs: number, nowMs: number): string {
  const diffSec = Math.max(0, Math.floor((endsAtMs - nowMs) / 1000));
  const days = Math.floor(diffSec / 86400);
  const hours = Math.floor((diffSec % 86400) / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  return `${days} ngày ${hours}g ${mins}p`;
}

function formatClearTime(ms: number | null): string {
  if (ms === null || !Number.isFinite(ms)) return 'Chưa hạ';
  return `${(ms / 1000).toFixed(2)}s`;
}

export const WeeklyRankedBossModal: React.FC<WeeklyRankedBossModalProps> = ({
  isAuthenticated,
  playerDisplayName,
  currentUid,
  onStartVerifiedRun,
  onStartPracticeRun,
  onRewardClaimed,
  onSeasonRewardClaimed,
  onInspectAiPlayer,
  onOpenAuthModal,
  onClose,
}) => {
  const [state, setState] = useState<WeeklyBossStateResponse | null>(null);
  const [seasonState, setSeasonState] = useState<WeeklyBossSeasonStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [claimingTierId, setClaimingTierId] = useState<string | null>(null);
  const [claimingSeasonTierId, setClaimingSeasonTierId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'season' | 'history' | 'rewards'>('overview');
  const [boardFilter, setBoardFilter] = useState<LeaderboardFilterMode>('all');
  const [aiPlayers, setAiPlayers] = useState<AiLivePlayerProfile[]>(
    () => liveAiSocket.getSnapshot()?.players ?? []
  );

  const loadState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [next, nextSeason] = await Promise.all([
        fetchWeeklyBossState(),
        fetchWeeklyBossSeasonState().catch(() => null),
      ]);
      setState(next);
      if (nextSeason) setSeasonState(nextSeason);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu Boss Tuần.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState, isAuthenticated]);

  // Real-time WebSocket leaderboard rank updates + live [AI Live] practice benchmarks
  useEffect(() => {
    liveAiSocket.ensureConnected(playerDisplayName);
    const unsubSnap = liveAiSocket.subscribeSnapshot((snap) => {
      setAiPlayers(snap.players);
    });
    const unsubRank = liveAiSocket.subscribeWeeklyRankUpdates((update) => {
      setState((prev) => {
        if (!prev || prev.schedule.weekId !== update.weekId) return prev;
        return {
          ...prev,
          leaderboard: update.leaderboard,
        };
      });
      setStatusMessage(
        `Cập nhật trực tiếp: ${update.displayName} vừa đạt hạng #${update.rank} (${update.verifiedScore.toLocaleString('vi-VN')} điểm xác minh)!`
      );
    });
    return () => {
      unsubSnap();
      unsubRank();
    };
  }, [playerDisplayName]);

  const handleStart = async () => {
    if (!isAuthenticated) {
      onOpenAuthModal?.();
      return;
    }
    if (starting) return;
    setStarting(true);
    setError(null);
    setStatusMessage(null);
    try {
      const res = await startWeeklyBossAttempt(playerDisplayName);
      onStartVerifiedRun({
        attemptId: res.attempt.attemptId,
        schedule: res.schedule,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể bắt đầu lượt tính hạng.');
      await loadState();
    } finally {
      setStarting(false);
    }
  };

  const handleClaim = async (tierId: string) => {
    if (!state || claimingTierId) return;
    setClaimingTierId(tierId);
    setError(null);
    setStatusMessage(null);
    try {
      const idempotencyKey = `claim-${state.schedule.weekId}-${tierId}`;
      const res = await claimWeeklyBossReward({ tierId, idempotencyKey });
      if (!res.alreadyClaimed) {
        onRewardClaimed(res.receipt);
        setStatusMessage(`Đã nhận thưởng: ${res.receipt.rewardTitleLabel}${res.receipt.rewardFrameName ? ` · ${res.receipt.rewardFrameName}` : ''}`);
      } else {
        setStatusMessage('Mốc thưởng này đã được cấp trước đó (máy chủ bảo vệ chống nhận trùng).');
      }
      await loadState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể nhận thưởng hạng tuần.');
    } finally {
      setClaimingTierId(null);
    }
  };

  const handleClaimSeason = async (tierId: string) => {
    if (!seasonState || claimingSeasonTierId) return;
    setClaimingSeasonTierId(tierId);
    setError(null);
    setStatusMessage(null);
    try {
      const idempotencyKey = `season-claim-${seasonState.season.seasonId}-${tierId}`;
      const res = await claimWeeklyBossSeasonReward({ tierId, idempotencyKey });
      if (!res.alreadyClaimed) {
        onSeasonRewardClaimed?.(res.receipt);
        setStatusMessage(
          `Đã nhận thưởng Mùa Giải: ${res.receipt.rewardTitleLabel}${res.receipt.rewardFrameName ? ` · ${res.receipt.rewardFrameName}` : ''}`
        );
      } else {
        setStatusMessage('Mốc thưởng Mùa Giải này đã được cấp trước đó (bảo vệ chống nhận trùng).');
      }
      await loadState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể nhận thưởng Mùa Giải.');
    } finally {
      setClaimingSeasonTierId(null);
    }
  };

  const claimedSet = useMemo(
    () => new Set(state?.player?.claimedTierIds ?? []),
    [state?.player?.claimedTierIds]
  );

  const seasonClaimedSet = useMemo(
    () => new Set(seasonState?.player?.claimedSeasonTierIds ?? []),
    [seasonState?.player?.claimedSeasonTierIds]
  );

  const mergedLeaderboard = useMemo(
    () =>
      buildMergedWeeklyBossLeaderboard({
        verifiedEntries: state?.leaderboard ?? [],
        aiPlayers,
        filter: boardFilter,
        currentUid,
      }),
    [aiPlayers, boardFilter, currentUid, state?.leaderboard]
  );

  const mergedSeasonLeaderboard = useMemo(
    () =>
      buildMergedWeeklySeasonLeaderboard({
        verifiedStandings: seasonState?.standings ?? [],
        aiPlayers,
        filter: boardFilter,
        currentWeekNumberInSeason: seasonState?.season.currentWeekNumberInSeason ?? 1,
        currentUid,
      }),
    [aiPlayers, boardFilter, currentUid, seasonState?.season.currentWeekNumberInSeason, seasonState?.standings]
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/92 overflow-y-auto">
      <div className="cel-panel-ornate w-full max-w-4xl rounded-3xl p-5 sm:p-7 my-auto max-h-[92vh] overflow-y-auto text-left space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-amber-400/20">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Boss Tuần Tính Hạng Công Bằng</span>
              {state && (
                <>
                  <span aria-hidden="true" className="text-amber-400/50">·</span>
                  <span className="font-mono-nums text-slate-200">{state.schedule.weekId}</span>
                </>
              )}
            </div>
            <h2 className="font-display text-2xl sm:text-[28px] font-black text-white mt-1 leading-tight">
              {state ? state.schedule.bossName : 'Đang kết nối Đấu Trường Tuần…'}
            </h2>
            {state && (
              <p className="text-xs text-slate-300 mt-1">
                {state.schedule.bossSubtitle}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => void loadState()}
              aria-label="Làm mới bảng hạng tuần"
              className="a2-slate-btn p-2.5 rounded-xl cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng Boss Tuần"
              className="a2-slate-btn p-2.5 rounded-xl cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 bg-[#060a18] border border-amber-400/20 rounded-xl p-1 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'overview'
                ? 'bg-amber-400/20 text-amber-200'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Tuần Hiện Tại
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'leaderboard'
                ? 'bg-amber-400/20 text-amber-200'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            BXH Tuần ({(state?.leaderboard.length ?? 0) + aiPlayers.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('season')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'season'
                ? 'bg-amber-400/20 text-amber-200'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Mùa Giải (4 Tuần)</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-amber-400/20 text-amber-200'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Lịch Sử Của Tôi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rewards')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'rewards'
                ? 'bg-amber-400/20 text-amber-200'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Thưởng Tuần
          </button>
        </div>

        {error && (
          <div role="alert" className="rounded-xl border border-rose-400/40 bg-rose-950/50 px-4 py-3 text-xs text-rose-200">
            {error}
          </div>
        )}

        {statusMessage && (
          <div role="status" className="rounded-xl border border-emerald-400/40 bg-emerald-950/50 px-4 py-3 text-xs text-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}

        {loading && !state ? (
          <div className="py-12 text-center space-y-3">
            <div className="mx-auto size-7 animate-spin rounded-full border-2 border-amber-300 border-t-transparent" />
            <div className="text-sm text-slate-300">Đang đồng bộ lịch Boss Tuần từ máy chủ xác minh…</div>
          </div>
        ) : state ? (
          <>
            {/* Key Telemetry Strip (Zero-Pill, Tabular) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-amber-400/15">
              <div>
                <div className="text-[11px] text-slate-400 font-semibold">Lượt Miễn Phí Tuần</div>
                <div className="font-mono-nums text-base font-black text-amber-300 mt-0.5">
                  {state.player
                    ? `${state.player.attemptsRemaining}/${state.schedule.maxFreeAttempts} lượt`
                    : `${state.schedule.maxFreeAttempts}/${state.schedule.maxFreeAttempts} lượt`}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-semibold">Điểm Cao Nhất</div>
                <div className="font-mono-nums text-base font-black text-white mt-0.5">
                  {(state.player?.bestScore ?? 0).toLocaleString('vi-VN')}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-semibold">Mã Seed Công Khai</div>
                <div className="font-mono-nums text-xs font-bold text-sky-300 mt-1 truncate" title={state.schedule.seed}>
                  {state.schedule.seed}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400 font-semibold">Kết Thúc Tuần Sau</div>
                <div className="font-mono-nums text-sm font-bold text-emerald-300 mt-0.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>{formatCountdown(state.schedule.endsAt, state.serverNow)}</span>
                </div>
              </div>
            </div>

            {activeTab === 'overview' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Standardized Epic Loaner Gear */}
                <div className="lg:col-span-7 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                      <Swords className="w-4 h-4 text-amber-300" />
                      <span>Bộ Trang Bị Sử Thi +15 Cho Mượn (Chuẩn Hóa)</span>
                    </h3>
                    <span className="font-mono-nums text-xs text-slate-300">
                      Công {state.schedule.loanerStats.attack} · Máu {state.schedule.loanerStats.maxHp}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                    {state.schedule.loanerGear.map((item) => (
                      <div key={item.slotLabel} className="py-2.5 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-white">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            {item.slotLabel} · {item.rarityLabel} · {item.summary}
                          </div>
                        </div>
                        <span className="font-mono-nums text-xs font-bold text-purple-300 shrink-0">
                          +{item.level}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fair-Play Rules + Start CTA */}
                <div className="lg:col-span-5 lg:pl-6 lg:border-l lg:border-amber-400/15 flex flex-col justify-between gap-4">
                  <div className="space-y-2.5">
                    <h3 className="text-sm font-bold text-emerald-300">
                      Luật Tính Hạng Thuần Kỹ Năng
                    </h3>
                    <ul className="space-y-2 text-xs text-slate-300">
                      {state.schedule.fairPlayRules.map((rule) => (
                        <li key={rule} className="flex items-start gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                    {!isAuthenticated ? (
                      <>
                        <p className="text-xs text-amber-200/90">
                          Đăng nhập tài khoản đám mây để máy chủ xác minh lượt chơi và ghi danh Bảng Hạng Tuần.
                        </p>
                        <button
                          type="button"
                          onClick={onOpenAuthModal}
                          className="a2-yellow-btn w-full py-3 px-5 rounded-xl font-display font-black text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
                        >
                          <Lock className="w-4 h-4" />
                          <span>Đăng Nhập Để Tính Hạng</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        disabled={
                          starting ||
                          (state.player !== null &&
                            state.player.attemptsRemaining <= 0 &&
                            !state.player.activeAttemptId)
                        }
                        onClick={() => void handleStart()}
                        className="a2-yellow-btn w-full py-3 px-5 rounded-xl font-display font-black text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        <span>
                          {starting
                            ? 'Đang mở phiên xác minh…'
                            : state.player &&
                              state.player.attemptsRemaining <= 0 &&
                              !state.player.activeAttemptId
                            ? 'Đã hết 3/3 lượt tuần này'
                            : 'Bắt Đầu Lượt Tính Hạng'}
                        </span>
                      </button>
                    )}
                    {onStartPracticeRun && (
                      <button
                        type="button"
                        onClick={() => onStartPracticeRun(state.schedule)}
                        className="a2-slate-btn w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap border border-sky-400/35 text-sky-200 hover:bg-sky-500/15"
                      >
                        <Swords className="w-3.5 h-3.5" />
                        <span>Tập Luyện Miễn Phí (Cùng Seed · Không Tốn Lượt)</span>
                      </button>
                    )}
                    <div className="text-[11px] text-slate-400 text-center">
                      Giới hạn 90 giây · Mô phỏng 60Hz xác định · Khóa AI trong Tính Hạng
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'leaderboard' && (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/20 bg-[#060a18] p-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBoardFilter('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap transition-colors ${
                        boardFilter === 'all'
                          ? 'bg-sky-500/20 text-sky-200 border border-sky-400/50'
                          : 'text-slate-300 hover:text-white border border-transparent'
                      }`}
                    >
                      Tất Cả (Thật + {aiPlayers.length} AI Live)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBoardFilter('real')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap transition-colors ${
                        boardFilter === 'real'
                          ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/50'
                          : 'text-slate-300 hover:text-white border border-transparent'
                      }`}
                    >
                      Chỉ Người Thật ({state.leaderboard.length})
                    </button>
                  </div>
                  <span className="text-[11px] text-emerald-300/90 font-semibold">
                    Thưởng Danh Hiệu &amp; Khung chỉ tính theo hạng Người Thật đã xác minh
                  </span>
                </div>

                {mergedLeaderboard.length === 0 ? (
                  <div className="py-10 text-center border border-dashed border-slate-700/80 rounded-2xl text-xs text-slate-400">
                    Chưa có lượt chơi người thật nào được xác minh trong tuần {state.schedule.weekId}. Hãy là người đầu tiên lập kỷ lục!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                    {mergedLeaderboard.map((entry) => {
                      const rankIdx = entry.displayRank - 1;
                      return (
                        <div
                          key={entry.id}
                          className={`py-2.5 px-3 flex items-center justify-between gap-3 text-xs ${
                            entry.isMe ? 'bg-amber-400/10' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`font-mono-nums w-7 font-black shrink-0 ${
                                rankIdx === 0
                                  ? 'text-amber-300'
                                  : rankIdx === 1
                                  ? 'text-slate-200'
                                  : rankIdx === 2
                                  ? 'text-orange-300'
                                  : 'text-slate-400'
                              }`}
                            >
                              #{entry.displayRank}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-white truncate flex items-center gap-1.5">
                                {entry.isAiLive && (
                                  <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
                                )}
                                {entry.isAiLive && entry.aiPlayerId && onInspectAiPlayer ? (
                                  <button
                                    type="button"
                                    onClick={() => onInspectAiPlayer(entry.aiPlayerId!)}
                                    className="truncate text-sky-200 hover:text-amber-300 underline decoration-sky-400/40 underline-offset-2 cursor-pointer"
                                  >
                                    {entry.displayName}
                                  </button>
                                ) : (
                                  <span className="truncate">
                                    {entry.displayName}
                                    {entry.isMe ? ' (Bạn)' : ''}
                                  </span>
                                )}
                                <span aria-hidden="true" className="text-slate-600">·</span>
                                {entry.isAiLive ? (
                                  <span className="text-[10px] font-bold text-sky-300 shrink-0">
                                    [AI Live · Đối Chiếu]
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-bold text-emerald-300 shrink-0">
                                    Xác Minh · Hạng Thật #{entry.humanRank}
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono-nums">
                                Sát thương {entry.bestDamage.toLocaleString('vi-VN')} ·{' '}
                                {entry.isAiLive
                                  ? 'Tập luyện cùng seed tuần'
                                  : `${entry.attemptsUsed}/3 lượt xác minh`}
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className="font-mono-nums text-sm font-black text-amber-300">
                              {entry.bestScore.toLocaleString('vi-VN')} điểm
                            </div>
                            <div className="font-mono-nums text-[11px] text-sky-300">
                              {formatClearTime(entry.bestClearTimeMs)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'season' && (
              <div className="space-y-4">
                {/* Season Header & Personal CP Summary */}
                <div className="rounded-2xl border border-amber-400/25 bg-[#060a18] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Crown className="w-4 h-4 shrink-0" />
                      <span>{seasonState?.season.seasonName ?? 'Giải Đấu Boss Liên Tuần (4 Tuần)'}</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-1">
                      Tích lũy Điểm Giải Đấu (CP) từ hạng Người Thật mỗi tuần trong chu kỳ 4 tuần để nhận Danh Hiệu &amp; Khung Mùa Giải.
                    </div>
                  </div>
                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                      Điểm Mùa Của Bạn
                    </div>
                    <div className="font-mono-nums tabular-nums text-lg font-black text-amber-300">
                      {(seasonState?.player?.seasonPoints ?? 0).toLocaleString('vi-VN')} CP
                      {seasonState?.player?.seasonRank ? ` · Hạng Thật #${seasonState.player.seasonRank}` : ''}
                    </div>
                  </div>
                </div>

                {/* Season Milestones (Idempotent Cosmetic Claims) */}
                {seasonState && (
                  <div className="space-y-2">
                    <div className="text-xs font-black uppercase tracking-wider text-amber-200">
                      Mốc Thưởng Mùa Giải (Danh Hiệu &amp; Khung · Chống Nhận Trùng)
                    </div>
                    <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                      {seasonState.season.milestones.map((ms) => {
                        const myCp = seasonState.player?.seasonPoints ?? 0;
                        const eligible = isAuthenticated && myCp >= ms.minSeasonPoints;
                        const claimed = seasonClaimedSet.has(ms.tierId);
                        const busy = claimingSeasonTierId === ms.tierId;
                        return (
                          <div
                            key={ms.tierId}
                            className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                          >
                            <div className="min-w-0">
                              <div className="font-bold text-white flex items-center gap-2">
                                <span>{ms.title}</span>
                                <span aria-hidden="true" className="text-slate-600">·</span>
                                <span className="font-mono-nums text-amber-300">
                                  ≥ {ms.minSeasonPoints.toLocaleString('vi-VN')} CP
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-300">
                                Danh hiệu <strong className="text-amber-200">{ms.rewardTitleLabel}</strong>
                                {ms.rewardFrameName ? (
                                  <> · Khung <strong className="text-sky-200">{ms.rewardFrameName}</strong></>
                                ) : null}
                              </div>
                            </div>
                            <div className="shrink-0">
                              {claimed ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-300">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Đã nhận</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  disabled={!eligible || busy}
                                  onClick={() => void handleClaimSeason(ms.tierId)}
                                  className="a2-yellow-btn px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                  {busy
                                    ? 'Đang xác minh…'
                                    : eligible
                                    ? 'Nhận Thưởng Mùa'
                                    : `Cần ${ms.minSeasonPoints} CP`}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Season Merged Leaderboard with Real/All Toggle */}
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-400/20 bg-[#060a18] p-2">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBoardFilter('all')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap transition-colors ${
                        boardFilter === 'all'
                          ? 'bg-sky-500/20 text-sky-200 border border-sky-400/50'
                          : 'text-slate-300 hover:text-white border border-transparent'
                      }`}
                    >
                      Tất Cả (Thật + {aiPlayers.length} AI Live)
                    </button>
                    <button
                      type="button"
                      onClick={() => setBoardFilter('real')}
                      className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer whitespace-nowrap transition-colors ${
                        boardFilter === 'real'
                          ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/50'
                          : 'text-slate-300 hover:text-white border border-transparent'
                      }`}
                    >
                      Chỉ Người Thật ({seasonState?.standings.length ?? 0})
                    </button>
                  </div>
                  <span className="text-[11px] text-emerald-300/90 font-semibold">
                    Điểm CP Mùa Giải chỉ trao cho lượt xác minh thủ công
                  </span>
                </div>

                {mergedSeasonLeaderboard.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-slate-700/80 rounded-2xl text-xs text-slate-400">
                    Chưa có chiến binh người thật nào ghi Điểm Mùa Giải trong chu kỳ 4 tuần này.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                    {mergedSeasonLeaderboard.map((row) => (
                      <div
                        key={row.id}
                        className={`py-2.5 px-3 flex items-center justify-between gap-3 text-xs ${
                          row.isMe ? 'bg-amber-400/10' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span
                            className={`font-mono-nums w-7 font-black shrink-0 ${
                              row.displayRank === 1
                                ? 'text-amber-300'
                                : row.displayRank === 2
                                ? 'text-slate-200'
                                : row.displayRank === 3
                                ? 'text-orange-300'
                                : 'text-slate-400'
                            }`}
                          >
                            #{row.displayRank}
                          </span>
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate flex items-center gap-1.5">
                              {row.isAiLive && (
                                <span className="size-1.5 rounded-full bg-emerald-400 shrink-0" />
                              )}
                              {row.isAiLive && row.aiPlayerId && onInspectAiPlayer ? (
                                <button
                                  type="button"
                                  onClick={() => onInspectAiPlayer(row.aiPlayerId!)}
                                  className="truncate text-sky-200 hover:text-amber-300 underline decoration-sky-400/40 underline-offset-2 cursor-pointer"
                                >
                                  {row.displayName}
                                </button>
                              ) : (
                                <span className="truncate">
                                  {row.displayName}
                                  {row.isMe ? ' (Bạn)' : ''}
                                </span>
                              )}
                              <span aria-hidden="true" className="text-slate-600">·</span>
                              {row.isAiLive ? (
                                <span className="text-[10px] font-bold text-sky-300 shrink-0">
                                  [AI Live · Đối Chiếu]
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold text-emerald-300 shrink-0">
                                  Hạng Thật #{row.humanRank}
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono-nums">
                              Tham gia {row.weeksParticipated}/4 tuần · Tuần đỉnh {row.bestWeeklyScore.toLocaleString('vi-VN')}đ
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono-nums text-sm font-black text-amber-300">
                            {row.seasonPoints.toLocaleString('vi-VN')} CP
                          </div>
                          <div className="font-mono-nums text-[11px] text-sky-300">
                            Đỉnh {row.bestWeeklyScore.toLocaleString('vi-VN')}đ
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'history' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-amber-200">
                    Nhật Ký Lượt Chơi Xác Minh Của Bạn ({seasonState?.player?.history.length ?? 0} lượt)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Lưu trữ điểm xác minh &amp; CP theo từng tuần
                  </span>
                </div>
                {!isAuthenticated ? (
                  <div className="py-10 text-center border border-dashed border-slate-700/80 rounded-2xl text-xs text-slate-400 space-y-2">
                    <div>Đăng nhập tài khoản để xem lịch sử lượt Boss Tuần và Điểm Mùa Giải của bạn.</div>
                    {onOpenAuthModal && (
                      <button
                        type="button"
                        onClick={onOpenAuthModal}
                        className="a2-yellow-btn px-4 py-2 rounded-xl text-xs font-black cursor-pointer"
                      >
                        Đăng Nhập Ngay
                      </button>
                    )}
                  </div>
                ) : !seasonState?.player || seasonState.player.history.length === 0 ? (
                  <div className="py-10 text-center border border-dashed border-slate-700/80 rounded-2xl text-xs text-slate-400">
                    Bạn chưa hoàn thành lượt Boss Tuần xác minh nào. Hãy bấm &ldquo;Bắt Đầu Lượt Tính Hạng&rdquo; ở tab Tuần Hiện Tại!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                    {seasonState.player.history.map((h) => (
                      <div
                        key={h.attemptId}
                        className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-white flex items-center gap-2">
                            <span className="font-mono-nums text-amber-300">{h.weekId}</span>
                            <span aria-hidden="true" className="text-slate-600">·</span>
                            <span className="truncate">{h.bossName}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono-nums mt-0.5">
                            Hạng Người Thật #{h.weekRank} · Sát thương {h.damageDealt.toLocaleString('vi-VN')} · {h.cleared ? `Hạ Boss ${formatClearTime(h.clearTimeMs)}` : 'Chưa hạ Boss'}
                          </div>
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                          <div className="font-mono-nums text-sm font-black text-amber-300">
                            {h.verifiedScore.toLocaleString('vi-VN')} điểm
                          </div>
                          <div className="font-mono-nums text-[11px] font-bold text-emerald-300">
                            +{h.seasonPointsAwarded} CP Mùa Giải
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'rewards' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-300">
                  Phần thưởng xếp hạng tuần tập trung vào <strong className="text-amber-200">Danh Hiệu và Khung Avatar</strong>. Mọi yêu cầu nhận thưởng đều được máy chủ bảo vệ chống cấp trùng.
                </p>
                <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                  {state.schedule.rewardTiers.map((tier) => {
                    const bestScore = state.player?.bestScore ?? 0;
                    const eligible = isAuthenticated && bestScore >= tier.minScore;
                    const claimed = claimedSet.has(tier.tierId);
                    const busy = claimingTierId === tier.tierId;

                    return (
                      <div
                        key={tier.tierId}
                        className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-2 text-sm font-bold text-white">
                            {tier.rewardFrameId ? (
                              <Crown className="w-4 h-4 text-amber-300 shrink-0" />
                            ) : (
                              <Award className="w-4 h-4 text-sky-300 shrink-0" />
                            )}
                            <span>{tier.title}</span>
                            <span aria-hidden="true" className="text-slate-600">·</span>
                            <span className="font-mono-nums text-xs text-amber-300">
                              ≥ {tier.minScore.toLocaleString('vi-VN')} điểm
                            </span>
                          </div>
                          <div className="text-xs text-slate-300">
                            Thưởng: Danh hiệu <strong className="text-amber-200">{tier.rewardTitleLabel}</strong>
                            {tier.rewardFrameName ? (
                              <>
                                {' '}· Khung Avatar <strong className="text-sky-200">{tier.rewardFrameName}</strong>
                              </>
                            ) : null}
                          </div>
                          <div className="text-[11px] text-slate-400">{tier.subtitle}</div>
                        </div>

                        <div className="shrink-0">
                          {claimed ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-300 whitespace-nowrap">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>Đã nhận thưởng</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              disabled={!eligible || busy}
                              onClick={() => void handleClaim(tier.tierId)}
                              className="a2-yellow-btn px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-45 disabled:cursor-not-allowed"
                            >
                              <Trophy className="w-3.5 h-3.5" />
                              <span>
                                {busy
                                  ? 'Đang xác minh…'
                                  : eligible
                                  ? 'Nhận thưởng hạng'
                                  : `Cần ${tier.minScore.toLocaleString('vi-VN')}đ`}
                              </span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

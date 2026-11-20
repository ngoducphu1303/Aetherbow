import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Award,
  CheckCircle2,
  Clock,
  Crown,
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
  WeeklyBossStateResponse,
} from '../data/weeklyBossData';
import {
  claimWeeklyBossReward,
  fetchWeeklyBossState,
  startWeeklyBossAttempt,
} from '../services/weeklyBossApi';
import { liveAiSocket } from '../services/liveAiSocket';

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
  onOpenAuthModal,
  onClose,
}) => {
  const [state, setState] = useState<WeeklyBossStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [claimingTierId, setClaimingTierId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'leaderboard' | 'rewards'>('overview');

  const loadState = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const next = await fetchWeeklyBossState();
      setState(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu Boss Tuần.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState, isAuthenticated]);

  // Real-time WebSocket leaderboard rank updates when any player posts a verified score
  useEffect(() => {
    liveAiSocket.ensureConnected(playerDisplayName);
    const unsub = liveAiSocket.subscribeWeeklyRankUpdates((update) => {
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
    return unsub;
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

  const claimedSet = useMemo(
    () => new Set(state?.player?.claimedTierIds ?? []),
    [state?.player?.claimedTierIds]
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
        <div className="flex items-center gap-1.5 bg-[#060a18] border border-amber-400/20 rounded-xl p-1 w-fit">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'overview'
                ? 'bg-amber-400/20 text-amber-200'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Luật &amp; Bộ Đồ Cho Mượn
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('leaderboard')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'leaderboard'
                ? 'bg-amber-400/20 text-amber-200'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Bảng Hạng Đã Xác Minh ({state?.leaderboard.length ?? 0})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('rewards')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
              activeTab === 'rewards'
                ? 'bg-amber-400/20 text-amber-200'
                : 'text-slate-300 hover:text-white'
            }`}
          >
            Thưởng Danh Hiệu &amp; Khung
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
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span>Xếp hạng ưu tiên Điểm Xác Minh cao nhất, hòa điểm xét Thời Gian Hạ Boss nhanh hơn.</span>
                  <span className="font-mono-nums text-amber-200">
                    {state.leaderboard.length} chiến binh đã xác minh
                  </span>
                </div>

                {state.leaderboard.length === 0 ? (
                  <div className="py-10 text-center border border-dashed border-slate-700/80 rounded-2xl text-xs text-slate-400">
                    Chưa có lượt chơi nào được xác minh trong tuần {state.schedule.weekId}. Hãy là người đầu tiên lập kỷ lục!
                  </div>
                ) : (
                  <div className="divide-y divide-slate-800/80 border-y border-slate-800/80">
                    {state.leaderboard.map((entry, index) => {
                      const isMe = Boolean(currentUid && entry.uid === currentUid);
                      return (
                        <div
                          key={entry.uid}
                          className={`py-2.5 px-3 flex items-center justify-between gap-3 text-xs ${
                            isMe ? 'bg-amber-400/10' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`font-mono-nums w-7 font-black shrink-0 ${
                                index === 0
                                  ? 'text-amber-300'
                                  : index === 1
                                  ? 'text-slate-200'
                                  : index === 2
                                  ? 'text-orange-300'
                                  : 'text-slate-400'
                              }`}
                            >
                              #{index + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="font-bold text-white truncate">
                                {entry.displayName}
                                {isMe ? ' (Bạn)' : ''}
                              </div>
                              <div className="text-[11px] text-slate-400 font-mono-nums">
                                Sát thương {entry.bestDamage.toLocaleString('vi-VN')} · {entry.attemptsUsed}/3 lượt
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

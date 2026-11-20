import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Bot,
  CheckCircle2,
  Cpu,
  Radio,
  Shield,
  Sparkles,
  Swords,
  Users,
  Wifi,
  WifiOff,
  X,
  Zap,
} from 'lucide-react';
import { AI_COMPANION_ROLES, AI_TACTIC_CONFIGS } from '../engine/aiCombatBrain';
import { HERO_MAP } from '../data/heroesData';
import { liveAiSocket, LiveSocketStatus } from '../services/liveAiSocket';
import type {
  AiAutoPilotTactic,
  AiCompanionRole,
  AiLiveHubSnapshot,
  AiLivePlayerProfile,
  AiPreferencesState,
} from '../types/game';

interface LiveAiHubModalProps {
  playerDisplayName: string;
  aiPreferences: AiPreferencesState;
  onUpdateAiPreferences: (next: AiPreferencesState) => void;
  onChallengeAiPlayer: (opponent: AiLivePlayerProfile, duelId: string) => void;
  onClose: () => void;
}

const STATUS_LABEL: Record<AiLivePlayerProfile['status'], { label: string; colorClass: string }> = {
  ready_duel: { label: 'Sẵn Sàng 1v1', colorClass: 'text-emerald-300' },
  campaign: { label: 'Đang Leo Ải', colorClass: 'text-sky-300' },
  weekly_practice: { label: 'Tập Boss Tuần', colorClass: 'text-amber-300' },
  lobby: { label: 'Đang Ở Sảnh', colorClass: 'text-slate-300' },
  in_duel: { label: 'Đang Đấu 1v1', colorClass: 'text-rose-300' },
};

const PERSONALITY_LABEL: Record<AiLivePlayerProfile['personality'], string> = {
  aggressive: 'Hung Hãn',
  tactical: 'Chiến Thuật',
  assassin: 'Sát Thủ',
};

function formatAgo(ts: number, nowMs: number): string {
  const sec = Math.max(1, Math.floor((nowMs - ts) / 1000));
  if (sec < 60) return `${sec}s trước`;
  const min = Math.floor(sec / 60);
  return `${min}p trước`;
}

export const LiveAiHubModal: React.FC<LiveAiHubModalProps> = ({
  playerDisplayName,
  aiPreferences,
  onUpdateAiPreferences,
  onChallengeAiPlayer,
  onClose,
}) => {
  const [snapshot, setSnapshot] = useState<AiLiveHubSnapshot | null>(() =>
    liveAiSocket.getSnapshot()
  );
  const [socketStatus, setSocketStatus] = useState<LiveSocketStatus>(() =>
    liveAiSocket.getStatus()
  );
  const [activeTab, setActiveTab] = useState<'players' | 'feed' | 'autopilot'>('players');
  const [filterMode, setFilterMode] = useState<'all' | 'ready_duel'>('all');
  const [challengingId, setChallengingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    liveAiSocket.ensureConnected(playerDisplayName);
    const unsubSnap = liveAiSocket.subscribeSnapshot((next, status) => {
      setSnapshot(next);
      setSocketStatus(status);
    });
    const unsubDuel = liveAiSocket.subscribeDuelAccepted((accepted) => {
      setChallengingId(null);
      onChallengeAiPlayer(accepted.opponent, accepted.duelId);
    });
    return () => {
      unsubSnap();
      unsubDuel();
    };
  }, [playerDisplayName, onChallengeAiPlayer]);

  const filteredPlayers = useMemo(() => {
    const list = snapshot?.players ?? [];
    if (filterMode === 'ready_duel') {
      return list.filter((p) => p.status === 'ready_duel');
    }
    return list;
  }, [snapshot?.players, filterMode]);

  const handleChallenge = (player: AiLivePlayerProfile) => {
    if (challengingId) return;
    setChallengingId(player.id);
    setFeedback(`Đang gửi lời thách đấu 1v1 tới ${player.displayName} ${player.tag}…`);
    const sent = liveAiSocket.challengeAiPlayer(player.id, playerDisplayName);
    if (!sent) {
      // Fallback local duelId if WebSocket is momentarily reconnecting
      const fallbackId = `local_duel_${Date.now()}`;
      setChallengingId(null);
      onChallengeAiPlayer(player, fallbackId);
    }
  };

  const toggleSquadRole = (role: AiCompanionRole) => {
    const exists = aiPreferences.squadRoles.includes(role);
    let nextRoles: AiCompanionRole[];
    if (exists) {
      if (aiPreferences.squadRoles.length <= 1) return; // keep at least 1 role selected
      nextRoles = aiPreferences.squadRoles.filter((r) => r !== role);
    } else {
      nextRoles = [...aiPreferences.squadRoles, role].slice(-2);
    }
    onUpdateAiPreferences({ ...aiPreferences, squadRoles: nextRoles });
  };

  const isConnected = socketStatus === 'connected';

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/92 overflow-y-auto">
      <div className="cel-panel-ornate w-full max-w-4xl rounded-3xl p-5 sm:p-7 my-auto max-h-[92vh] overflow-y-auto text-left space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-sky-400/20">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold text-sky-300">
              <Radio className="w-4 h-4 shrink-0" />
              <span>Hệ Sinh Thái Người Chơi AI Real-Time</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span
                className={`inline-flex items-center gap-1.5 font-mono-nums ${
                  isConnected ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                <span>
                  {isConnected
                    ? 'WebSocket Trực Tuyến'
                    : socketStatus === 'reconnecting'
                    ? 'Đang kết nối lại…'
                    : 'Đang kết nối…'}
                </span>
              </span>
            </div>
            <h2 className="font-display text-2xl sm:text-[26px] font-black text-white mt-1 leading-tight">
              Trung Tâm Người Chơi AI &amp; Đấu Trường 1v1 Live
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Mọi đối thủ AI được gắn nhãn rõ <strong className="text-sky-200">[AI Live]</strong>, chạy trực tuyến trên máy chủ WebSocket và phản xạ 60Hz trong trận 3D.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Trung Tâm Người Chơi AI"
            className="a2-slate-btn p-2.5 rounded-xl cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Strip (Zero-Pill, Tabular) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3 border-y border-slate-800/80">
          <div>
            <div className="text-[11px] text-slate-400 font-semibold">Người Chơi AI Trực Tuyến</div>
            <div className="font-mono-nums text-base font-black text-sky-300 mt-0.5">
              {snapshot?.onlineAiCount ?? 18} [AI Live]
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold">Chiến Binh Đang Kết Nối</div>
            <div className="font-mono-nums text-base font-black text-emerald-300 mt-0.5">
              {snapshot?.onlineHumanCount ?? 1} trực tuyến
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold">Thành Tích 1v1 Live</div>
            <div className="font-mono-nums text-base font-black text-amber-300 mt-0.5">
              {aiPreferences.liveDuelWins}T - {aiPreferences.liveDuelLosses}B
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-semibold">Điểm Đấu Trường Live</div>
            <div className="font-mono-nums text-base font-black text-white mt-0.5">
              {aiPreferences.liveDuelRating.toLocaleString('vi-VN')} điểm
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 bg-[#060a18] border border-sky-400/20 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setActiveTab('players')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'players'
                  ? 'bg-sky-400/20 text-sky-200'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Đối Thủ AI Live ({snapshot?.players.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('feed')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'feed'
                  ? 'bg-sky-400/20 text-sky-200'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Bảng Tin Thế Giới ({snapshot?.activities.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('autopilot')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                activeTab === 'autopilot'
                  ? 'bg-amber-400/20 text-amber-200'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              AI Tự Chơi &amp; Đồng Đội 3D
            </button>
          </div>

          {activeTab === 'players' && (
            <div className="flex items-center gap-1.5 text-xs">
              <button
                type="button"
                onClick={() => setFilterMode('all')}
                className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap cursor-pointer border ${
                  filterMode === 'all'
                    ? 'border-sky-400/50 bg-sky-500/15 text-sky-200'
                    : 'border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                onClick={() => setFilterMode('ready_duel')}
                className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap cursor-pointer border ${
                  filterMode === 'ready_duel'
                    ? 'border-emerald-400/50 bg-emerald-500/15 text-emerald-200'
                    : 'border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                Sẵn sàng 1v1
              </button>
            </div>
          )}
        </div>

        {feedback && (
          <div className="rounded-xl border border-sky-400/40 bg-sky-950/50 px-4 py-2.5 text-xs text-sky-200 flex items-center gap-2">
            <Activity className="w-4 h-4 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* TAB 1: Live AI Players Directory & 1v1 Challenges */}
        {activeTab === 'players' && (
          <div className="divide-y divide-slate-800/80 border-y border-slate-800/80 max-h-[46vh] overflow-y-auto">
            {filteredPlayers.map((p) => {
              const st = STATUS_LABEL[p.status];
              const heroName = HERO_MAP[p.heroId]?.name ?? 'Alice';
              const busy = challengingId === p.id;
              return (
                <div
                  key={p.id}
                  className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-white/[0.02] transition-colors"
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 text-sm font-bold text-white">
                      <Bot className="w-4 h-4 text-sky-300 shrink-0" />
                      <span className="truncate">{p.displayName}</span>
                      <span className="text-[11px] font-mono-nums font-bold text-sky-300 shrink-0">
                        {p.tag}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className={`text-xs font-bold shrink-0 ${st.colorClass}`}>
                        {st.label}
                      </span>
                    </div>
                    <div className="text-xs text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span>Tướng {heroName}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span>Lối đánh {PERSONALITY_LABEL[p.personality]}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="font-mono-nums text-amber-200">
                        LC {p.powerRating.toLocaleString('vi-VN')}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="font-mono-nums text-slate-400">
                        Hạng 1v1: {p.duelRating} ({p.duelWins}T-{p.duelLosses}B)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400">{p.statusDetail}</div>
                  </div>

                  <div className="shrink-0">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleChallenge(p)}
                      className="a2-yellow-btn px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
                    >
                      <Swords className="w-3.5 h-3.5" />
                      <span>{busy ? 'Đang vào sân…' : 'Thách Đấu 1v1'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: Real-Time World Activity Feed */}
        {activeTab === 'feed' && (
          <div className="divide-y divide-slate-800/80 border-y border-slate-800/80 max-h-[46vh] overflow-y-auto">
            {(snapshot?.activities ?? []).map((ev) => {
              const colorMap = {
                amber: 'text-amber-300',
                sky: 'text-sky-300',
                emerald: 'text-emerald-300',
                rose: 'text-rose-300',
              };
              return (
                <div key={ev.id} className="py-2.5 px-2 flex items-start justify-between gap-3 text-xs">
                  <div className="min-w-0">
                    <span className={`font-bold ${colorMap[ev.accent]}`}>{ev.actorName}</span>{' '}
                    <span className="text-slate-200">{ev.summary}</span>
                  </div>
                  <span className="font-mono-nums text-[11px] text-slate-400 shrink-0">
                    {formatAgo(ev.timestamp, snapshot?.serverNow ?? Date.now())}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 3: AI Auto-Pilot & 3D AI Squad Companion Settings */}
        {activeTab === 'autopilot' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Auto-Pilot Configuration */}
            <div className="lg:col-span-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-amber-200 flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-amber-300" />
                  <span>AI Tự Chơi 1 Chạm (Auto-Pilot 60Hz)</span>
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateAiPreferences({
                      ...aiPreferences,
                      autoPilotEnabled: !aiPreferences.autoPilotEnabled,
                    })
                  }
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black cursor-pointer whitespace-nowrap border ${
                    aiPreferences.autoPilotEnabled
                      ? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-200'
                      : 'border-slate-700 bg-slate-900 text-slate-300'
                  }`}
                >
                  {aiPreferences.autoPilotEnabled ? 'Đang Bật Mặc Định' : 'Đang Tắt Mặc Định'}
                </button>
              </div>

              <div className="space-y-2">
                {(['aggressive', 'balanced', 'evasive'] as AiAutoPilotTactic[]).map((tId) => {
                  const cfg = AI_TACTIC_CONFIGS[tId];
                  const selected = aiPreferences.tactic === tId;
                  return (
                    <button
                      key={tId}
                      type="button"
                      onClick={() => onUpdateAiPreferences({ ...aiPreferences, tactic: tId })}
                      className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                        selected
                          ? 'border-amber-400/70 bg-amber-400/12'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span>Chiến Thuật: {cfg.label}</span>
                        {selected && <CheckCircle2 className="w-4 h-4 text-amber-300" />}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">{cfg.description}</p>
                    </button>
                  );
                })}
              </div>

              <label className="flex items-center justify-between gap-3 pt-2 border-t border-slate-800/80 cursor-pointer">
                <div>
                  <div className="text-xs font-bold text-white">Tự Chọn Kỹ Năng Thông Minh (2.5s)</div>
                  <div className="text-[11px] text-slate-400">
                    Ưu tiên Tiến Hóa &amp; Cộng Hưởng; bạn luôn có thể bấm chọn tay trước khi hết 2.5s.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={aiPreferences.autoSkillPick}
                  onChange={(e) =>
                    onUpdateAiPreferences({
                      ...aiPreferences,
                      autoSkillPick: e.target.checked,
                    })
                  }
                  className="w-4 h-4 accent-amber-400 cursor-pointer"
                />
              </label>

              <p className="text-[11px] text-slate-400">
                Lưu ý Công Bằng: AI Tự Chơi &amp; Đồng Đội AI bị khóa tự động trong lượt Boss Tuần Tính Hạng chính thức (mở bình thường ở Chiến Dịch, Tháp, Tập Boss Tuần).
              </p>
            </div>

            {/* 3D AI Squad Companion Configuration */}
            <div className="lg:col-span-6 lg:pl-6 lg:border-l lg:border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-sky-200 flex items-center gap-2">
                  <Users className="w-4 h-4 text-sky-300" />
                  <span>Đồng Đội AI 3D Thực Chiến (Tối đa 2)</span>
                </h3>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateAiPreferences({
                      ...aiPreferences,
                      squadAssistEnabled: !aiPreferences.squadAssistEnabled,
                    })
                  }
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-black cursor-pointer whitespace-nowrap border ${
                    aiPreferences.squadAssistEnabled
                      ? 'border-sky-400/60 bg-sky-500/20 text-sky-200'
                      : 'border-slate-700 bg-slate-900 text-slate-300'
                  }`}
                >
                  {aiPreferences.squadAssistEnabled ? 'Đang Triển Khai Đội' : 'Tắt Hỗ Trợ Đội'}
                </button>
              </div>

              <div className="space-y-2.5">
                {(['vanguard', 'ranger', 'mystic'] as AiCompanionRole[]).map((roleId) => {
                  const cfg = AI_COMPANION_ROLES[roleId];
                  const active = aiPreferences.squadRoles.includes(roleId);
                  return (
                    <button
                      key={roleId}
                      type="button"
                      onClick={() => toggleSquadRole(roleId)}
                      className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                        active
                          ? 'border-sky-400/70 bg-sky-400/12'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs font-bold text-white">
                        <span className="flex items-center gap-2">
                          {roleId === 'vanguard' ? (
                            <Shield className="w-3.5 h-3.5 text-sky-300" />
                          ) : roleId === 'ranger' ? (
                            <Zap className="w-3.5 h-3.5 text-amber-300" />
                          ) : (
                            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                          )}
                          <span>{cfg.name}</span>
                          <span className="text-[11px] font-semibold text-slate-400">
                            · {cfg.roleLabel}
                          </span>
                        </span>
                        {active && <CheckCircle2 className="w-4 h-4 text-sky-300" />}
                      </div>
                      <p className="text-[11px] text-slate-300 mt-1">{cfg.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

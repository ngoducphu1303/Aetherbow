import React, { useEffect, useRef, useState } from 'react';
import {
  Award,
  Crown,
  Feather,
  Flame,
  MessageSquare,
  Send,
  Shield,
  Sparkles,
  Swords,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { HERO_MAP } from '../data/heroesData';
import type {
  AiLivePlayerProfile,
  AiRivalRecord,
  VirtualBuildCoachResult,
  VirtualPlayerRelationshipMemory,
  VirtualRelationshipTier,
} from '../types/game';
import {
  fetchVirtualPlayerMemory,
  requestVirtualBuildCoach,
  sendVirtualPlayerDm,
} from '../services/nvidiaVirtualPlayerClient';

interface AiPlayerProfileModalProps {
  player: AiLivePlayerProfile | null;
  rivalRecord?: AiRivalRecord | null;
  isPinnedForCoop?: boolean;
  playerDisplayName?: string;
  playerPowerRating?: number;
  currentChapterId?: number;
  playerWeaponName?: string;
  playerArmorName?: string;
  onChallengeDuel: (aiPlayerId: string) => void;
  onTogglePinCoop: (aiPlayerId: string) => void;
  onClose: () => void;
}

const PERSONALITY_META: Record<
  AiLivePlayerProfile['personality'],
  { label: string; colorClass: string; desc: string }
> = {
  aggressive: {
    label: 'Xung Phong Tốc Chiến',
    colorClass: 'text-rose-300',
    desc: 'Áp sát liên hoàn, dồn sát thương chủ động và kết liễu nhanh.',
  },
  tactical: {
    label: 'Chiến Thuật Toàn Diện',
    colorClass: 'text-emerald-300',
    desc: 'Giữ cự ly chuẩn, né đòn Boss tinh tế và phối hợp Tuyệt Kỹ theo nhịp.',
  },
  assassin: {
    label: 'Sát Thủ Chí Mạng',
    colorClass: 'text-amber-300',
    desc: 'Tụ lực đón góc, bùng nổ chí mạng vào khoảnh khắc sơ hở.',
  },
};

const RELATIONSHIP_TIER_META: Record<
  VirtualRelationshipTier,
  { label: string; colorClass: string }
> = {
  stranger: { label: 'Mới Gặp', colorClass: 'text-slate-300' },
  acquaintance: { label: 'Người Quen', colorClass: 'text-sky-300' },
  ally: { label: 'Bạn Đồng Hành', colorClass: 'text-emerald-300' },
  mentor: { label: 'Tiền Bối Chỉ Dẫn', colorClass: 'text-amber-300' },
  rival: { label: 'Đối Thủ Truyền Kiếp', colorClass: 'text-rose-300' },
};

function formatShortTime(ts: number): string {
  const d = new Date(ts);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export const AiPlayerProfileModal: React.FC<AiPlayerProfileModalProps> = ({
  player,
  rivalRecord,
  isPinnedForCoop = false,
  playerDisplayName = 'Xạ Thủ',
  playerPowerRating = 702,
  currentChapterId = 1,
  playerWeaponName,
  playerArmorName,
  onChallengeDuel,
  onTogglePinCoop,
  onClose,
}) => {
  const [activeView, setActiveView] = useState<'profile' | 'dm'>('profile');
  const [memory, setMemory] = useState<VirtualPlayerRelationshipMemory | null>(null);
  const [dmInput, setDmInput] = useState('');
  const [dmSending, setDmSending] = useState(false);
  const [coachLoading, setCoachLoading] = useState(false);
  const [coachResult, setCoachResult] = useState<VirtualBuildCoachResult | null>(null);
  const [lastAffinityDelta, setLastAffinityDelta] = useState<number | null>(null);
  const dmEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!player) return;
    let cancelled = false;
    setCoachResult(null);
    setLastAffinityDelta(null);
    void fetchVirtualPlayerMemory(playerDisplayName, player.id, player.displayName).then(
      (mem) => {
        if (!cancelled) setMemory(mem);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [player?.id, playerDisplayName]);

  useEffect(() => {
    if (activeView === 'dm') {
      dmEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [activeView, memory?.dmMessages.length, coachResult]);

  if (!player) return null;

  const hero = HERO_MAP[player.heroId] ?? HERO_MAP.aurelia;
  const personality = PERSONALITY_META[player.personality] ?? PERSONALITY_META.tactical;
  const build = player.buildSnapshot ?? {
    weaponName: 'Cung Ánh Trăng Thần Thoại',
    armorName: 'Áo Giáp Tinh Giới',
    mountName: 'Bạch Hổ Tinh Linh',
    wingName: 'Cánh Thiên Quang',
    favoriteSkills: ['Đa Tiễn', 'Tăng Tốc Bắn', 'Chí Mạng'],
    tacticSummary: personality.desc,
  };

  const totalDuels = player.duelWins + player.duelLosses;
  const winRate = totalDuels > 0 ? Math.round((player.duelWins / totalDuels) * 100) : 50;
  const tierInfo = RELATIONSHIP_TIER_META[memory?.tier ?? 'stranger'];
  const affinityScore = memory?.affinityScore ?? 0;

  const handleSendDm = async (rawText: string) => {
    const clean = rawText.replace(/\s+/g, ' ').trim();
    if (!clean || dmSending) return;
    setDmSending(true);
    setDmInput('');

    // Optimistic append so user sees message immediately (<=200ms feedback)
    const optimisticId = `dm_opt_${Date.now()}`;
    setMemory((prev) =>
      prev
        ? {
            ...prev,
            dmMessages: [
              ...prev.dmMessages,
              { id: optimisticId, sender: 'player' as const, text: clean, timestampMs: Date.now() },
            ].slice(-12),
          }
        : {
            aiPlayerId: player.id,
            aiName: player.displayName,
            affinityScore: 0,
            tier: 'stranger',
            memories: [],
            dmMessages: [
              { id: optimisticId, sender: 'player' as const, text: clean, timestampMs: Date.now() },
            ],
            updatedAtMs: Date.now(),
          }
    );

    try {
      const res = await sendVirtualPlayerDm({
        aiPlayerId: player.id,
        aiName: player.displayName,
        aiPersonality: player.personality,
        aiTitle: player.titleBadge,
        playerName: playerDisplayName,
        message: clean,
        playerPowerRating,
        playerChapterId: currentChapterId,
        playerWeaponName,
      });
      setLastAffinityDelta(res.affinityDelta);
      if (res.memory) {
        setMemory(res.memory);
      } else {
        setMemory((prev) =>
          prev
            ? {
                ...prev,
                affinityScore: prev.affinityScore + res.affinityDelta,
                dmMessages: [
                  ...prev.dmMessages.filter((m) => m.id !== optimisticId),
                  res.playerMessage,
                  res.aiMessage,
                ].slice(-12),
              }
            : prev
        );
      }
    } finally {
      setDmSending(false);
    }
  };

  const handleAskBuildCoach = async () => {
    if (coachLoading) return;
    setCoachLoading(true);
    setActiveView('dm');
    try {
      const res = await requestVirtualBuildCoach({
        aiPlayerId: player.id,
        aiName: player.displayName,
        aiPersonality: player.personality,
        playerName: playerDisplayName,
        playerPowerRating,
        recommendedPower: currentChapterId * 1350,
        chapterId: currentChapterId,
        stageReached: 1,
        weaponName: playerWeaponName,
        armorName: playerArmorName,
        question: `Tư vấn build và cách qua Chương ${currentChapterId} tối ưu nhất`,
      });
      setCoachResult(res);
      const refreshed = await fetchVirtualPlayerMemory(
        playerDisplayName,
        player.id,
        player.displayName
      );
      setMemory(refreshed);
    } finally {
      setCoachLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/90 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cel-panel-ornate w-full max-w-2xl rounded-3xl p-5 sm:p-6 my-auto text-left space-y-4 bg-[#070d20] border border-amber-400/35 max-h-[90vh] overflow-y-auto a2-scroll">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-amber-400/20">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold text-sky-300">
              <span>Hồ Sơ Chiến Binh</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className={personality.colorClass}>{personality.label}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className={tierInfo.colorClass}>{tierInfo.label}</span>
            </div>
            <h2 className="font-display text-2xl font-black text-white mt-1 truncate">
              {player.displayName}
            </h2>
            <div className="text-xs text-slate-300 mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-amber-200">{hero.name}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span>{player.guildRole}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-emerald-300">{player.statusDetail}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hồ sơ chiến binh"
            className="a2-slate-btn p-2 rounded-xl cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Unboxed Relationship & Memory Bar (Zero-Pill) */}
        <div
          data-testid="ai-profile-relationship-bar"
          className="py-2 border-b border-amber-400/15 space-y-1.5 text-xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-400 font-semibold">Quan hệ:</span>
              <span className={`font-black ${tierInfo.colorClass}`}>{tierInfo.label}</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-slate-400">Điểm gắn kết</span>
              <span className="font-mono-nums tabular-nums font-black text-amber-200">
                {affinityScore >= 0 ? `+${affinityScore}` : affinityScore}
              </span>
              {lastAffinityDelta !== null && (
                <span
                  className={`font-mono-nums tabular-nums font-bold ${
                    lastAffinityDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'
                  }`}
                >
                  ({lastAffinityDelta >= 0 ? `+${lastAffinityDelta}` : lastAffinityDelta})
                </span>
              )}
            </div>
            <span className="font-mono-nums tabular-nums text-[11px] text-slate-400">
              {(memory?.memories.length ?? 0)} ký ức chung
            </span>
          </div>
          {memory && memory.memories.length > 0 && (
            <div className="text-[11px] text-slate-300 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {memory.memories.slice(0, 3).map((m, idx) => (
                <React.Fragment key={m.id}>
                  {idx > 0 && (
                    <span aria-hidden="true" className="text-slate-600">·</span>
                  )}
                  <span className="text-slate-200">{m.summaryVi}</span>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Segmented View Switcher: Profile vs 1-on-1 DM & Build Coach */}
        <div
          className="flex items-center gap-1 p-1 rounded-xl bg-[#050916] border border-amber-400/20"
          role="tablist"
          aria-label="Chế độ xem hồ sơ nhân vật ảo"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'profile'}
            data-testid="ai-profile-tab-info"
            onClick={() => setActiveView('profile')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-black whitespace-nowrap cursor-pointer transition-colors ${
              activeView === 'profile'
                ? 'bg-amber-400/20 text-amber-100 border border-amber-300/60'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            Hồ Sơ &amp; Trang Bị
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeView === 'dm'}
            data-testid="ai-profile-tab-dm"
            onClick={() => setActiveView('dm')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-black whitespace-nowrap cursor-pointer transition-colors flex items-center justify-center gap-1.5 ${
              activeView === 'dm'
                ? 'bg-sky-500/20 text-sky-100 border border-sky-400/65'
                : 'text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span>Nhắn 1-1 &amp; Tư Vấn Build</span>
          </button>
        </div>

        {activeView === 'profile' ? (
          <>
            {/* Multi-BXH Combat Stats Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 py-2 border-b border-amber-400/15">
              <div>
                <div className="text-[11px] font-semibold text-slate-400">Lực Chiến Tổng</div>
                <div className="font-mono-nums tabular-nums text-base font-black text-amber-300 mt-0.5">
                  {player.powerRating.toLocaleString('vi-VN')}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-400">
                  Điểm Arena · Tỷ Lệ Thắng
                </div>
                <div className="font-mono-nums tabular-nums text-base font-black text-sky-300 mt-0.5">
                  {player.duelRating.toLocaleString('vi-VN')} · {winRate}%
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-400">
                  Tháp Vô Tận · Boss Tuần
                </div>
                <div className="font-mono-nums tabular-nums text-base font-black text-emerald-300 mt-0.5">
                  T.{player.bestTowerFloor} · {player.weeklyPracticeBest.toLocaleString('vi-VN')}đ
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-400">Boss Thế Giới</div>
                <div className="font-mono-nums tabular-nums text-sm font-black text-white mt-0.5">
                  {player.worldBossBestDamage.toLocaleString('vi-VN')} ST
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-400">Boss Bang Hội</div>
                <div className="font-mono-nums tabular-nums text-sm font-black text-white mt-0.5">
                  {player.guildBossDamage.toLocaleString('vi-VN')} ST
                </div>
              </div>
              <div>
                <div className="text-[11px] font-semibold text-slate-400">Thành Tích Đấu 1v1</div>
                <div className="font-mono-nums tabular-nums text-sm font-black text-amber-200 mt-0.5">
                  {player.duelWins} Thắng · {player.duelLosses} Thua
                </div>
              </div>
            </div>

            {rivalRecord && (
              <div className="rounded-xl bg-[#180c1c] border border-rose-400/40 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="font-bold text-rose-200">
                  {rivalRecord.rivalryTier === 'nemesis'
                    ? 'Truyền Kiếp'
                    : rivalRecord.rivalryTier === 'archrival'
                    ? 'Kỳ Phùng Địch Thủ'
                    : 'Lịch Sử Đối Đầu'}
                  : <span className="font-mono-nums tabular-nums text-emerald-300">{rivalRecord.winsAgainst} Thắng</span> –{' '}
                  <span className="font-mono-nums tabular-nums text-rose-300">{rivalRecord.lossesAgainst} Thua</span>
                </div>
                <span className="text-[11px] text-amber-200 font-semibold">
                  {rivalRecord.winsAgainst > 0 &&
                  rivalRecord.bountyClaimedDateKey !== new Date().toISOString().slice(0, 10)
                    ? 'Có Thưởng Đòi Nợ ở Trung Tâm AI Live!'
                    : rivalRecord.lastEncounterReason}
                </span>
              </div>
            )}

            {/* Equipped Build Snapshot */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-xs font-black text-amber-200 flex items-center gap-1.5">
                  <Crown className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Bộ Trang Bị &amp; Phong Cách Chiến Đấu</span>
                </h3>
                <span className="text-[11px] font-bold text-purple-300">{player.titleBadge}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                <div className="rounded-xl bg-[#0b132b] border border-amber-400/20 px-3.5 py-2.5 flex items-center gap-2.5">
                  <Swords className="w-4 h-4 text-amber-300 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-400 font-bold">Vũ Khí Chủ Lực</div>
                    <div className="font-bold text-white truncate">{build.weaponName}</div>
                  </div>
                </div>
                <div className="rounded-xl bg-[#0b132b] border border-sky-400/20 px-3.5 py-2.5 flex items-center gap-2.5">
                  <Shield className="w-4 h-4 text-sky-300 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-400 font-bold">Áo Giáp Tinh Giới</div>
                    <div className="font-bold text-white truncate">{build.armorName}</div>
                  </div>
                </div>
                <div className="rounded-xl bg-[#0b132b] border border-emerald-400/20 px-3.5 py-2.5 flex items-center gap-2.5">
                  <Flame className="w-4 h-4 text-emerald-300 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-400 font-bold">Thú Cưỡi Đồng Hành</div>
                    <div className="font-bold text-white truncate">{build.mountName}</div>
                  </div>
                </div>
                <div className="rounded-xl bg-[#0b132b] border border-purple-400/20 px-3.5 py-2.5 flex items-center gap-2.5">
                  <Feather className="w-4 h-4 text-purple-300 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-[10px] text-slate-400 font-bold">Đôi Cánh Huyền Thoại</div>
                    <div className="font-bold text-white truncate">{build.wingName}</div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-[#060a18] border border-slate-800 px-3.5 py-2.5 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-200">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>Kỹ Năng Ưa Chuộng: {build.favoriteSkills.join(' · ')}</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">{build.tacticSummary}</p>
              </div>
            </div>
          </>
        ) : (
          /* 1-on-1 DM & Build Coach Panel */
          <div data-testid="ai-profile-dm-panel" className="space-y-3">
            {/* Quick Suggestion Controls */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                data-testid="ai-profile-ask-coach-btn"
                disabled={coachLoading}
                onClick={() => void handleAskBuildCoach()}
                className="px-3 py-1.5 rounded-lg bg-amber-400/15 border border-amber-400/45 text-[11px] font-bold text-amber-100 hover:bg-amber-400/25 cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                {coachLoading ? 'Đang phân tích build…' : `Tư vấn build Chương ${currentChapterId}`}
              </button>
              <button
                type="button"
                disabled={dmSending}
                onClick={() =>
                  void handleSendDm(
                    `Mình đang có ${playerPowerRating.toLocaleString('vi-VN')} LC ở Chương ${currentChapterId}, nên ưu tiên nâng gì trước?`
                  )
                }
                className="px-3 py-1.5 rounded-lg bg-[#0b132b] border border-sky-400/35 text-[11px] font-bold text-sky-200 hover:border-sky-300 cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                Nên nâng món nào trước?
              </button>
              <button
                type="button"
                disabled={dmSending}
                onClick={() =>
                  void handleSendDm('Hôm nay rảnh đi Co-op săn Boss hay làm ván Arena 1v1 không?')
                }
                className="px-3 py-1.5 rounded-lg bg-[#0b132b] border border-emerald-400/35 text-[11px] font-bold text-emerald-200 hover:border-emerald-300 cursor-pointer whitespace-nowrap disabled:opacity-60"
              >
                Rủ đi Co-op / Tái đấu
              </button>
            </div>

            {/* Structured Build Coach Result Card */}
            {coachResult && (
              <div
                data-testid="ai-profile-coach-card"
                className="rounded-xl bg-[#0a1326] border border-amber-400/35 p-3.5 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-amber-200">
                    Tư vấn từ {coachResult.aiName}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {coachResult.source === 'nvidia_nim' ? 'NVIDIA NIM' : 'Cố vấn nội bộ'}
                  </span>
                </div>
                <p className="font-bold text-white leading-snug">{coachResult.headlineVi}</p>
                <ul className="space-y-1 text-[11px] text-slate-200 list-disc pl-4">
                  {coachResult.tipsVi.map((tip, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {tip}
                    </li>
                  ))}
                </ul>
                <div className="pt-1.5 border-t border-slate-800 text-[11px] text-emerald-300 font-semibold">
                  Hành động ngay: {coachResult.recommendedActionVi}
                </div>
              </div>
            )}

            {/* 1-on-1 DM Message Feed */}
            <div className="h-52 overflow-y-auto a2-scroll rounded-xl bg-[#050915] border border-slate-800 p-3 space-y-2.5">
              {(memory?.dmMessages.length ?? 0) === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center text-xs text-slate-400 px-4 space-y-1">
                  <p className="font-bold text-slate-200">
                    Bắt đầu trò chuyện riêng với {player.displayName}
                  </p>
                  <p className="text-[11px]">
                    Nhân vật ảo ghi nhớ lịch sử đối đầu, đồng đội Co-op và chỉ số thực tế của bạn để trả lời sát ngữ cảnh.
                  </p>
                </div>
              ) : (
                memory!.dmMessages.map((msg) => {
                  const isPlayer = msg.sender === 'player';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isPlayer ? 'items-end' : 'items-start'}`}
                    >
                      <div className="text-[10px] text-slate-400 mb-0.5 flex items-center gap-1.5">
                        <span className={isPlayer ? 'text-amber-200 font-bold' : 'text-sky-300 font-bold'}>
                          {isPlayer ? playerDisplayName : player.displayName}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-nums tabular-nums">
                          {formatShortTime(msg.timestampMs)}
                        </span>
                        {!isPlayer && msg.source === 'nvidia_nim' && (
                          <>
                            <span aria-hidden="true">·</span>
                            <span className="text-emerald-300 font-semibold">NVIDIA NIM</span>
                          </>
                        )}
                      </div>
                      <div
                        className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                          isPlayer
                            ? 'bg-amber-400/15 border border-amber-400/35 text-amber-50'
                            : 'bg-[#0c1630] border border-sky-400/25 text-slate-100'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
              {dmSending && (
                <div className="text-[11px] text-sky-300 font-semibold">
                  {player.displayName} đang trả lời…
                </div>
              )}
              <div ref={dmEndRef} />
            </div>

            {/* DM Input Row */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void handleSendDm(dmInput);
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                data-testid="ai-dm-input"
                value={dmInput}
                onChange={(e) => setDmInput(e.target.value)}
                maxLength={200}
                placeholder={`Nhắn riêng cho ${player.displayName}…`}
                className="flex-1 rounded-xl bg-[#050915] border border-slate-700 focus:border-sky-400 px-3 py-2 text-xs text-white placeholder:text-slate-500 outline-none"
              />
              <button
                type="submit"
                data-testid="ai-dm-send-btn"
                disabled={dmSending || dmInput.trim().length === 0}
                className="px-3.5 py-2 rounded-xl bg-sky-500/25 border border-sky-400/60 text-xs font-black text-sky-100 hover:bg-sky-500/35 flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>Gửi</span>
              </button>
            </form>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-2 border-t border-amber-400/15 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => {
              onChallengeDuel(player.id);
              onClose();
            }}
            className="a2-yellow-btn py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
          >
            <Swords className="w-4 h-4 shrink-0" />
            <span>Thách Đấu 1v1 Ngay</span>
          </button>

          <button
            type="button"
            onClick={() => onTogglePinCoop(player.id)}
            className={`py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
              isPinnedForCoop
                ? 'a2-emerald-btn'
                : 'a2-slate-btn border border-sky-400/45 text-sky-200 hover:bg-sky-500/15'
            }`}
          >
            {isPinnedForCoop ? (
              <>
                <Award className="w-4 h-4 shrink-0" />
                <span>Đã Chọn Đồng Đội Co-op</span>
              </>
            ) : (
              <>
                <Users className="w-4 h-4 shrink-0" />
                <span>Chọn Làm Đồng Đội Co-op</span>
              </>
            )}
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>Chọn đồng đội sẽ ưu tiên ghép chiến binh này khi vào Phó Bản Co-op 3D.</span>
          </span>
        </div>
      </div>
    </div>
  );
};

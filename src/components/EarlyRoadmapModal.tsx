import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  Flame,
  Gift,
  Hammer,
  Lock,
  Shield,
  TrendingUp,
  X,
} from 'lucide-react';
import { ComputedPlayerStats, SaveData } from '../types/game';
import {
  EARLY_FORGE_COSTS,
  getEarlyProgressionPolicy,
  getNextTargetGoal,
  normalizeEarlyForgeProgress,
} from '../data/earlyProgressionData';
import {
  evaluateFairCatchUpMissions,
  evaluateMaxStageReadiness,
  FAIR_30DAY_MILESTONES,
  FAIR_30DAY_WEEKS,
  FairActionTarget,
  FairCatchUpMission,
  getDailyFairRoutine,
  simulate30DayFairProgression,
} from '../data/fairProgression30Day';
import { RARITY_META } from '../data/gearData';
import { LobbyTab } from './TitleScreen';

interface EarlyRoadmapModalProps {
  save: SaveData;
  stats: ComputedPlayerStats;
  onClose: () => void;
  onJumpToTab: (tab: LobbyTab) => void;
  onOpenMode?: (target: FairActionTarget) => void;
  onClaimFairMilestone?: (milestoneId: string) => void;
  onClaimCatchUpMission?: (missionId: FairCatchUpMission['id']) => void;
  onCraftEarlyTargetGear?: (tier: 'rare' | 'epic' | 's_tier') => void;
}

type RoadmapViewTab = 'weeks' | 'daily' | 'simulator';

const SIM_SAMPLE_DAYS = [1, 2, 4, 7, 10, 14, 17, 21, 24, 27, 28, 30];

export const EarlyRoadmapModal: React.FC<EarlyRoadmapModalProps> = ({
  save,
  stats,
  onClose,
  onJumpToTab,
  onOpenMode,
  onClaimFairMilestone,
  onClaimCatchUpMission,
  onCraftEarlyTargetGear,
}) => {
  const [activeTab, setActiveTab] = useState<RoadmapViewTab>('weeks');
  const [simProfile, setSimProfile] = useState<'average' | 'unlucky'>('average');

  const policy = useMemo(() => getEarlyProgressionPolicy(save), [save]);
  const targetGoal = useMemo(() => getNextTargetGoal(save), [save]);
  const forgeProgress = useMemo(
    () => normalizeEarlyForgeProgress(save.earlyForgeProgress),
    [save.earlyForgeProgress]
  );
  const readiness = useMemo(() => evaluateMaxStageReadiness(save, stats), [save, stats]);
  const dailyRoutine = useMemo(() => getDailyFairRoutine(save), [save]);
  const catchUpEval = useMemo(() => evaluateFairCatchUpMissions(save, stats), [save, stats]);
  const claimedSet = useMemo(() => new Set(save.fairRoadmapClaimedIds ?? []), [save.fairRoadmapClaimedIds]);

  const simAverage = useMemo(
    () =>
      activeTab === 'simulator'
        ? simulate30DayFairProgression({ seed: 20260401, luckProfile: 'average', dailyMinutes: 40 })
        : null,
    [activeTab]
  );
  const simUnlucky = useMemo(
    () =>
      activeTab === 'simulator'
        ? simulate30DayFairProgression({ seed: 20260499, luckProfile: 'unlucky', dailyMinutes: 40 })
        : null,
    [activeTab]
  );

  const activeSim = simProfile === 'average' ? simAverage : simUnlucky;

  const handleNavigate = (target: FairActionTarget) => {
    if (onOpenMode) {
      onClose();
      onOpenMode(target);
      return;
    }
    const fallbackTab: LobbyTab =
      target === 'gear' || target === 'runes' || target === 'shop' ? target : 'battle';
    onClose();
    onJumpToTab(fallbackTab);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#040611]/90 p-3 sm:p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Lộ Trình 30 Ngày · Fair Progression"
    >
      <div className="w-full max-w-4xl max-h-[90vh] cel-panel-ornate rounded-2xl border border-[#e6be78]/45 shadow-[0_24px_70px_rgba(0,0,0,0.88)] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-amber-300/20 bg-gradient-to-r from-[#241b12] via-[#17121c] to-[#121622] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-300/40 flex items-center justify-center text-amber-200 shrink-0">
              <Compass className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300/85">
                Fair Progression · 30–45 Phút / Ngày · Ngày {readiness.activeDay}/30
              </div>
              <h2 className="font-display text-lg sm:text-xl font-black text-amber-50 tracking-wide truncate">
                Lộ Trình 30 Ngày · Chinh Phục Chương 1–12 & Max Đồ
              </h2>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Lộ Trình 30 Ngày"
            className="w-9 h-9 rounded-lg bg-slate-900/80 border border-slate-600/60 hover:border-amber-300/70 text-slate-300 hover:text-amber-100 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Readiness Overview Strip (Unboxed inline metadata + 5 pillars) */}
        <div className="px-5 py-3.5 border-b border-white/10 bg-[#10131e]/95 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-amber-100">{readiness.stageLabel}</div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                Trần phẩm hiện tại:{' '}
                <span className="font-bold" style={{ color: RARITY_META[policy.maxGearRarity].color }}>
                  {RARITY_META[policy.maxGearRarity].label}
                </span>
                {' · '}
                Mẫu [S]:{' '}
                <span className={policy.allowSTier ? 'text-emerald-300 font-bold' : 'text-amber-300 font-semibold'}>
                  {policy.allowSTier ? 'Đã mở khóa' : 'Mở ở Chương 4'}
                </span>
                {' · '}
                Bảo toàn 100% tài sản cũ
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                  Tiến Độ Max Giai Đoạn
                </div>
                <div className="text-base font-black text-amber-300 font-mono-nums">
                  {readiness.overallPercent}%
                </div>
              </div>
              <div className="w-28 sm:w-36 h-2.5 rounded-sm bg-slate-950/90 border border-amber-400/30 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-yellow-300 to-emerald-400 transition-all duration-300"
                  style={{ width: `${Math.max(4, Math.min(100, readiness.overallPercent))}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {readiness.pillars.map((pillar) => (
              <div
                key={pillar.id}
                className="rounded-lg bg-slate-900/75 border border-white/10 px-2.5 py-2 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-1 text-[10px] text-slate-400">
                  <span className="font-semibold uppercase tracking-wide">{pillar.label}</span>
                  <span className="font-mono-nums text-amber-200 font-bold">{pillar.percent}%</span>
                </div>
                <div className="text-xs font-bold text-slate-100 font-mono-nums mt-0.5 truncate">
                  {pillar.currentText}
                </div>
                <div className="text-[10px] text-slate-400 font-mono-nums">Mục tiêu: {pillar.targetText}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Segmented Tab Bar */}
        <div className="px-5 pt-3 pb-2 border-b border-white/10 bg-[#0d1019] flex flex-wrap items-center justify-between gap-2">
          <div className="inline-flex rounded-lg bg-slate-950/90 border border-amber-300/25 p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('weeks')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'weeks'
                  ? 'bg-gradient-to-r from-amber-500/30 to-yellow-500/20 text-amber-100 border border-amber-300/50'
                  : 'text-slate-400 hover:text-slate-100 border border-transparent'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Lộ Trình 4 Tuần (8 Mốc)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('daily')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'daily'
                  ? 'bg-gradient-to-r from-amber-500/30 to-yellow-500/20 text-amber-100 border border-amber-300/50'
                  : 'text-slate-400 hover:text-slate-100 border border-transparent'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Nhịp Chơi Hôm Nay ({dailyRoutine.completedCount}/{dailyRoutine.unlockedCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('simulator')}
              className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                activeTab === 'simulator'
                  ? 'bg-gradient-to-r from-amber-500/30 to-yellow-500/20 text-amber-100 border border-amber-300/50'
                  : 'text-slate-400 hover:text-slate-100 border border-transparent'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              Mô Phỏng 30 Ngày
            </button>
          </div>

          <div className="text-[11px] text-slate-400 font-mono-nums">
            Mảnh Rèn: Hiếm {forgeProgress.rareShards}/{EARLY_FORGE_COSTS.rareShards} · Sử Thi{' '}
            {forgeProgress.epicShards}/{EARLY_FORGE_COSTS.epicShards} · Mẫu [S]{' '}
            {forgeProgress.sTierBlueprints}/{EARLY_FORGE_COSTS.sTierBlueprints}
          </div>
        </div>

        {/* Scrollable Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#0b0e17]">
          {/* TAB 1: 4-WEEK ROADMAP & CLAIMABLE MILESTONES */}
          {activeTab === 'weeks' && (
            <>
              {/* Pity Target Forge Banner */}
              <div className="rounded-xl bg-[#141827] border border-sky-400/30 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-200">
                    <Hammer className="w-4 h-4 text-sky-300 shrink-0" />
                    <span>{targetGoal.title}</span>
                    <span className="text-amber-300 font-mono-nums">
                      ({targetGoal.current}/{targetGoal.target})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-300">
                    {targetGoal.dropSourceText} · Bảo hiểm mảnh rèn đảm bảo không kẹt đồ dù vận may xấu.
                  </div>
                </div>
                {onCraftEarlyTargetGear && (
                  <button
                    type="button"
                    disabled={!targetGoal.canCraftNow}
                    onClick={() => onCraftEarlyTargetGear(targetGoal.tier)}
                    className={`px-3.5 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                      targetGoal.canCraftNow
                        ? 'bg-gradient-to-r from-sky-500 to-cyan-400 text-slate-950 hover:brightness-110'
                        : 'bg-slate-800/80 text-slate-400 border border-slate-700/80 cursor-not-allowed'
                    }`}
                  >
                    {targetGoal.canCraftNow
                      ? 'Rèn Bảo Hiểm Ngay'
                      : targetGoal.unlocked
                      ? `Thiếu ${Math.max(0, targetGoal.target - targetGoal.current)} Mảnh`
                      : targetGoal.unlockRequirement}
                  </button>
                )}
              </div>

              {catchUpEval.isBehind && (
                <div className="rounded-xl bg-[#1a1308] border border-amber-300/45 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0 space-y-0.5">
                    <div className="text-xs font-black text-amber-200 flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>
                        Nhiệm Vụ Bắt Kịp Ngày {catchUpEval.activeDay} Đã Mở ({catchUpEval.missions.filter((m) => m.completed && !m.claimedToday).length} mốc sẵn sàng nhận)
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Chuẩn Ngày {catchUpEval.activeDay}: Chương {catchUpEval.expectedChapter} ·{' '}
                      {catchUpEval.expectedPower.toLocaleString('vi-VN')} LC (Có giới hạn ngày chống cày quá mức).
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('daily')}
                    className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 text-xs font-black whitespace-nowrap hover:brightness-110 shrink-0 cursor-pointer"
                  >
                    Xem Nhiệm Vụ Bắt Kịp
                  </button>
                </div>
              )}

              {FAIR_30DAY_WEEKS.map((weekAct) => {
                const weekMilestones = FAIR_30DAY_MILESTONES.filter((m) => m.week === weekAct.week);
                return (
                  <section key={weekAct.week} className="space-y-2.5">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 pb-1.5 border-b border-amber-300/20">
                      <div>
                        <span className="text-[11px] font-mono-nums font-bold text-amber-300 uppercase tracking-wider">
                          {weekAct.dayRange}
                        </span>
                        <h3 className="text-sm font-black text-amber-50">{weekAct.title}</h3>
                      </div>
                      <div className="text-[11px] text-slate-300 font-mono-nums">
                        {weekAct.targetChapters} · {weekAct.targetPowerRange} · {weekAct.rarityMilestone}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {weekMilestones.map((ms) => {
                        const met = ms.isMet(save, stats);
                        const claimed = claimedSet.has(ms.id);
                        const claimable = met && !claimed;

                        return (
                          <div
                            key={ms.id}
                            className={`rounded-xl p-3.5 border flex flex-col justify-between gap-3 transition-colors ${
                              claimed
                                ? 'bg-emerald-950/20 border-emerald-400/35'
                                : claimable
                                ? 'bg-amber-950/25 border-amber-300/60 shadow-[0_0_24px_rgba(245,158,11,0.14)]'
                                : 'bg-slate-900/70 border-white/10'
                            }`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-[10px] font-mono-nums uppercase tracking-wider text-amber-300/90 font-bold">
                                    Mốc {ms.stepNumber} · {ms.dayRange}
                                  </div>
                                  <div className="text-sm font-bold text-slate-50 leading-snug">
                                    {ms.title}
                                  </div>
                                </div>
                                {claimed ? (
                                  <span className="text-[11px] font-bold text-emerald-300 whitespace-nowrap flex items-center gap-1 shrink-0">
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    Đã Nhận
                                  </span>
                                ) : claimable ? (
                                  <span className="text-[11px] font-bold text-amber-200 whitespace-nowrap flex items-center gap-1 shrink-0">
                                    <Gift className="w-3.5 h-3.5" />
                                    Sẵn Sàng
                                  </span>
                                ) : (
                                  <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap shrink-0">
                                    Đang Tiến Hành
                                  </span>
                                )}
                              </div>

                              <div className="text-xs text-slate-200">
                                <span className="text-slate-400">Điều kiện: </span>
                                {ms.requirementText}
                              </div>
                              <div className="text-[11px] text-slate-300/90 leading-relaxed">
                                <span className="text-amber-300/90 font-semibold">Mở khóa: </span>
                                {ms.unlocksText}
                              </div>
                            </div>

                            <div className="pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-2">
                              <div className="text-[11px] text-amber-200/95 font-mono-nums">
                                +{ms.rewardGold.toLocaleString('vi-VN')} Vàng · +{ms.rewardGems} Ngọc · +
                                {ms.rewardStarDust.toLocaleString('vi-VN')} Bụi
                                {ms.rewardEpicShards ? ` · +${ms.rewardEpicShards} Mảnh Epic` : ''}
                                {ms.rewardSTierBlueprints ? ` · +${ms.rewardSTierBlueprints} Bản Vẽ [S]` : ''}
                              </div>

                              {claimable && onClaimFairMilestone ? (
                                <button
                                  type="button"
                                  onClick={() => onClaimFairMilestone(ms.id)}
                                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 text-xs font-black whitespace-nowrap hover:brightness-110 transition-all"
                                >
                                  Nhận Thưởng
                                </button>
                              ) : !claimed ? (
                                <button
                                  type="button"
                                  onClick={() => handleNavigate(ms.actionTarget)}
                                  className="px-2.5 py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 border border-amber-300/30 text-amber-100 text-xs font-bold whitespace-nowrap flex items-center gap-1 transition-colors"
                                >
                                  <span>{ms.actionLabel}</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              ) : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })}
            </>
          )}

          {/* TAB 2: DAILY 30–45 MIN RESOURCE ROUTINE */}
          {activeTab === 'daily' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#131726] border border-amber-300/25 p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-amber-100">
                    Checklist Thu Thập Tài Nguyên Chuẩn (30–45 Phút / Ngày)
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    Hoàn thành đều đặn các lượt ngày đã mở giúp tài khoản tăng sức mạnh bền vững mà không bị kẹt tường lực chiến.
                  </div>
                </div>
                <div className="flex items-center gap-4 font-mono-nums shrink-0">
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-slate-400">Đã Xong</div>
                    <div className="text-sm font-black text-emerald-300">
                      {dailyRoutine.completedCount}/{dailyRoutine.unlockedCount}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[10px] uppercase text-slate-400">Ước Tính Còn Lại</div>
                    <div className="text-sm font-black text-amber-300">
                      ~{dailyRoutine.remainingEstimatedMinutes} phút
                    </div>
                  </div>
                </div>
              </div>

              <div className="divide-y divide-white/10 rounded-xl border border-white/10 bg-slate-900/55 overflow-hidden">
                {dailyRoutine.items.map((item) => (
                  <div
                    key={item.id}
                    className={`px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      !item.unlocked ? 'opacity-65 bg-slate-950/50' : ''
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        {item.completedToday ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : item.unlocked ? (
                          <Flame className="w-4 h-4 text-amber-300 shrink-0" />
                        ) : (
                          <Lock className="w-4 h-4 text-slate-500 shrink-0" />
                        )}
                        <span className="text-sm font-bold text-slate-100 truncate">{item.name}</span>
                        <span className="text-[11px] font-mono-nums text-slate-400 whitespace-nowrap">
                          · ~{item.estimatedMinutes}p
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 pl-6">
                        {item.unlocked ? (
                          <>
                            <span className="text-amber-200/90">Thưởng chính: </span>
                            {item.primaryReward}
                          </>
                        ) : (
                          <span className="text-slate-400">
                            Khóa · Điều kiện mở: {item.unlockRequirementLabel}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-3 pl-6 sm:pl-0 shrink-0">
                      {item.unlocked ? (
                        <>
                          <div className="text-xs font-mono-nums font-bold text-slate-200 whitespace-nowrap">
                            Còn{' '}
                            <span className={item.remainingRuns > 0 ? 'text-amber-300' : 'text-emerald-300'}>
                              {item.remainingRuns}/{item.maxRuns}
                            </span>{' '}
                            lượt
                          </div>
                          <button
                            type="button"
                            onClick={() => handleNavigate(item.actionTarget)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-amber-300/35 text-amber-100 text-xs font-bold whitespace-nowrap flex items-center gap-1 transition-colors"
                          >
                            <span>{item.completedToday ? 'Xem Lại' : 'Đi Tới'}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">
                          {item.unlockRequirementLabel}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Wave 9 Pillar 3: Capped Daily Catch-Up Deficit Missions */}
              <div className="rounded-xl border border-amber-300/35 bg-[#121423] p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-sm font-black text-amber-200 flex items-center gap-2">
                      <Gift className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>Nhiệm Vụ Bắt Kịp Ngày Chơi (Giới Hạn Chống Lạm Dụng)</span>
                    </div>
                    <div className="text-[11px] text-slate-300 mt-0.5">
                      Tự động mở từ Ngày 2 trở đi nếu tài khoản bị tụt nhịp Chương hoặc Lực Chiến so với chuẩn Ngày {catchUpEval.activeDay}.
                    </div>
                  </div>
                  <div className="text-right font-mono-nums text-[11px]">
                    <div className="text-slate-400">Chuẩn Ngày {catchUpEval.activeDay}</div>
                    <div className="font-bold text-amber-200">
                      Chương {catchUpEval.expectedChapter} · {catchUpEval.expectedPower.toLocaleString('vi-VN')} LC
                    </div>
                  </div>
                </div>

                {!catchUpEval.isBehind ? (
                  <div className="rounded-lg bg-slate-900/70 border border-white/10 px-3.5 py-2.5 text-xs text-slate-300 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>{catchUpEval.lockReason}</span>
                  </div>
                ) : (
                  <div className="divide-y divide-white/10 rounded-xl border border-white/10 bg-slate-950/60 overflow-hidden">
                    {catchUpEval.missions.map((mission) => {
                      const canClaim = mission.completed && !mission.claimedToday;
                      return (
                        <div
                          key={mission.id}
                          className="px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              {mission.claimedToday ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : (
                                <Gift className="w-4 h-4 text-amber-300 shrink-0" />
                              )}
                              <span className="text-sm font-bold text-white truncate">
                                {mission.title}
                              </span>
                              <span className="text-[11px] font-mono-nums text-sky-300 shrink-0">
                                · {mission.progressText}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-300 pl-6">{mission.desc}</div>
                            <div className="text-[11px] font-mono-nums text-amber-200 pl-6">
                              Bù tiến độ: +{mission.rewardGold.toLocaleString('vi-VN')} Vàng · +
                              {mission.rewardStarDust} Bụi · +{mission.rewardEpicShards} Mảnh Sử Thi
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pl-6 sm:pl-0 shrink-0">
                            {mission.claimedToday ? (
                              <span className="text-xs font-bold text-emerald-300 whitespace-nowrap">
                                Đã Nhận Hôm Nay
                              </span>
                            ) : canClaim && onClaimCatchUpMission ? (
                              <button
                                type="button"
                                onClick={() => onClaimCatchUpMission(mission.id)}
                                className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-yellow-300 text-slate-950 text-xs font-black whitespace-nowrap hover:brightness-110 cursor-pointer"
                              >
                                Nhận Bù Tiến Độ
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleNavigate(mission.actionTarget)}
                                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-amber-300/35 text-amber-100 text-xs font-bold whitespace-nowrap flex items-center gap-1 cursor-pointer"
                              >
                                <span>{mission.actionLabel}</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: DETERMINISTIC 30-DAY BALANCE SIMULATOR */}
          {activeTab === 'simulator' && activeSim && simAverage && simUnlucky && (
            <div className="space-y-4">
              <div className="rounded-xl bg-[#131726] border border-amber-300/25 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm font-black text-amber-100">
                    <Shield className="w-4 h-4 text-emerald-300 shrink-0" />
                    <span>Kiểm Chứng Cân Bằng 30 Ngày (Chạy Trực Tiếp Từ Công Thức Game)</span>
                  </div>
                  <div className="text-xs text-slate-300">
                    Mô phỏng tài khoản mới (0 nạp, 40 phút/ngày) sử dụng đúng hàm tính chỉ số, chi phí cường hóa, thiên phú, bảo hiểm Pity và mốc lực chiến Chương 1–12.
                  </div>
                </div>
                <div className="inline-flex rounded-lg bg-slate-950 border border-white/15 p-1 gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setSimProfile('average')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-colors ${
                      simProfile === 'average'
                        ? 'bg-amber-400/25 text-amber-100 border border-amber-300/50'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    Nhịp Chuẩn
                  </button>
                  <button
                    type="button"
                    onClick={() => setSimProfile('unlucky')}
                    className={`px-3 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-colors ${
                      simProfile === 'unlucky'
                        ? 'bg-sky-400/25 text-sky-100 border border-sky-300/50'
                        : 'text-slate-400 hover:text-slate-100'
                    }`}
                  >
                    Vận May Xấu (Pity)
                  </button>
                </div>
              </div>

              {/* Key Simulator KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="rounded-xl bg-slate-900/75 border border-white/10 p-3">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold">Vượt Chương 12</div>
                  <div className="text-lg font-black text-amber-300 font-mono-nums mt-0.5">
                    Ngày {activeSim.chapterClearDays[12] ?? '—'}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono-nums">
                    Ch.1: D{activeSim.chapterClearDays[1] ?? '—'} · Ch.6: D{activeSim.chapterClearDays[6] ?? '—'}
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900/75 border border-white/10 p-3">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold">Lực Chiến Ngày 30</div>
                  <div className="text-lg font-black text-emerald-300 font-mono-nums mt-0.5">
                    {activeSim.finalPowerRating.toLocaleString('vi-VN')}
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono-nums">
                    Chuẩn Ch.12: 285.000 LC
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900/75 border border-white/10 p-3">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold">Tháp &amp; Thần Thoại</div>
                  <div className="text-lg font-black text-sky-300 font-mono-nums mt-0.5 whitespace-nowrap">
                    Tầng {activeSim.finalTowerFloor} · {activeSim.finalMythicSlots}/6
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono-nums">
                    T45: D{activeSim.dayReachedTower45 ?? '—'} · TP {activeSim.finalTalentLevels}/160
                  </div>
                </div>
                <div className="rounded-xl bg-slate-900/75 border border-white/10 p-3">
                  <div className="text-[10px] uppercase text-slate-400 font-semibold">Đạt Max Giai Đoạn</div>
                  <div className="text-lg font-black text-amber-200 font-mono-nums mt-0.5">
                    {activeSim.finalMaxStagePct}%
                  </div>
                  <div className="text-[11px] text-slate-400 font-mono-nums">
                    Pity xấu: {simUnlucky.finalMaxStagePct}% (D{simUnlucky.chapterClearDays[12] ?? '—'})
                  </div>
                </div>
              </div>

              {/* Clean Numeric Progression Table */}
              <div className="rounded-xl border border-white/10 overflow-x-auto bg-slate-950/75">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-[10px] uppercase tracking-wider text-slate-400 bg-slate-900/80">
                      <th className="py-2.5 px-3 font-semibold">Ngày</th>
                      <th className="py-2.5 px-3 font-semibold">Chương</th>
                      <th className="py-2.5 px-3 font-semibold">Tháp</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Lực Chiến</th>
                      <th className="py-2.5 px-3 font-semibold">Phẩm / TB Cấp</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Thiên Phú</th>
                      <th className="py-2.5 px-3 font-semibold text-right">Max Stage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono-nums">
                    {activeSim.days
                      .filter((snap) => SIM_SAMPLE_DAYS.includes(snap.day))
                      .map((snap) => (
                        <tr key={snap.day} className="hover:bg-white/[0.03] transition-colors">
                          <td className="py-2 px-3 font-bold text-amber-200 whitespace-nowrap">
                            Ngày {String(snap.day).padStart(2, '0')}
                          </td>
                          <td className="py-2 px-3 text-slate-100 whitespace-nowrap">
                            Ch.{snap.chapterCleared}/12
                          </td>
                          <td className="py-2 px-3 text-sky-200 whitespace-nowrap">
                            Tầng {snap.bestTowerFloor}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-emerald-300 whitespace-nowrap">
                            {snap.powerRating.toLocaleString('vi-VN')}
                          </td>
                          <td className="py-2 px-3 text-slate-200 font-sans whitespace-nowrap">
                            {snap.highestRarityLabel} · TB +{snap.avgGearLevel}
                            {snap.mythicGearCount > 0 ? ` (${snap.mythicGearCount}/6 M)` : ''}
                          </td>
                          <td className="py-2 px-3 text-right text-slate-300 whitespace-nowrap">
                            {snap.talentLevels}/160
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-amber-300 whitespace-nowrap">
                            {snap.maxStagePct}%
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

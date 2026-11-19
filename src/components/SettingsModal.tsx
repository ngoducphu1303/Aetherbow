import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Monitor,
  RotateCcw,
  Sliders,
  Trash2,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import {
  evaluatePlaytestKpis,
  normalizeHeroMastery,
  normalizePlaytestMetrics,
} from '../data/earlyProgressionData';
import { evaluateEquippedGearSets } from '../data/gearData';
import { HERO_MAP } from '../data/heroesData';
import { SKILL_SYNERGIES, SKILL_SYNERGY_MAP } from '../data/skillsData';
import { GameSettings, GraphicsQuality, SaveData } from '../types/game';

interface SettingsModalProps {
  settings: GameSettings;
  muted: boolean;
  save?: SaveData;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onToggleMute: () => void;
  onReplayTutorial?: () => void;
  onResetPlaytestMetrics?: () => void;
  onClose: () => void;
}

const BOSS_LABELS: Array<{ key: string; label: string }> = [
  { key: 'ch1_ares', label: 'Ch.1-4 · Tướng Quân Ares' },
  { key: 'ch1_boreas', label: 'Ch.1-8 · Tướng Quân Boreas' },
  { key: 'ch1_leo_king', label: 'Ch.1-12 · Sư Vương Thái Dương' },
  { key: 'ch2_aries_boss', label: 'Ch.2-12 · Hỏa Dương Chiến Vương' },
  { key: 'ch3_taurus_boss', label: 'Ch.3-12 · Kim Ngưu Cự Thần' },
  { key: 'ch4_gemini_boss', label: 'Ch.4-12 · Song Tử Ảo Ảnh Vương' },
  { key: 'ch5_cancer_boss', label: 'Ch.5-12 · Cự Giải Thiết Giáp Vương' },
  { key: 'ch6_virgo_boss', label: 'Ch.6-12 · Xử Nữ Thánh Kiếm' },
  { key: 'ch7_libra_boss', label: 'Ch.7-12 · Thiên Bình Thẩm Phán' },
  { key: 'ch8_scorpio_boss', label: 'Ch.8-12 · Hổ Cáp Ám Đế' },
  { key: 'ch9_sagittarius_boss', label: 'Ch.9-12 · Nhân Mã Thần Tiễn' },
  { key: 'ch10_capricorn_boss', label: 'Ch.10-12 · Sơn Thần Ma Kết' },
  { key: 'ch11_aquarius_boss', label: 'Ch.11-12 · Thủy Sứ Bảo Bình' },
  { key: 'ch12_pisces_boss', label: 'Ch.12-12 · Song Ngư Mộng Chủ' },
];

const FUNNEL_STAGES = [1, 2, 4, 8, 12];

function formatDurationSec(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}p ${rem.toString().padStart(2, '0')}s`;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  muted,
  save,
  onUpdateSettings,
  onToggleMute,
  onReplayTutorial,
  onResetPlaytestMetrics,
  onClose,
}) => {
  const [showPlaytestKpi, setShowPlaytestKpi] = useState(false);
  const [kpiTab, setKpiTab] = useState<'kpi' | 'history'>('kpi');
  const [copiedJson, setCopiedJson] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  const qualityOptions: Array<{ id: GraphicsQuality; label: string; hint: string }> = [
    { id: 'low', label: 'Thấp', hint: 'Tối ưu FPS' },
    { id: 'medium', label: 'Trung Bình', hint: 'Cân bằng' },
    { id: 'high', label: 'Cao', hint: 'Đổ bóng & Hạt 3D' },
  ];

  const metrics = save ? normalizePlaytestMetrics(save.playtestMetrics) : null;

  const handleCopyJson = async () => {
    if (!metrics) return;
    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        highestChapterCleared: save?.highestChapterCleared ?? 0,
        bestStagePerChapter: save?.bestStagePerChapter ?? {},
        selectedHeroId: save?.selectedHeroId ?? 'artemis',
        playtestMetrics: metrics,
      },
      null,
      2
    );
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payload);
      }
      soundEngine.playUiClick(1.1);
      setCopiedJson(true);
      window.setTimeout(() => setCopiedJson(false), 2200);
    } catch {
      setCopiedJson(true);
      window.setTimeout(() => setCopiedJson(false), 2200);
    }
  };

  if (showPlaytestKpi && metrics) {
    const hasFirstDefeat = typeof metrics.firstDefeatRunIndex === 'number';
    const run2RateLabel = !hasFirstDefeat
      ? 'Chưa ghi nhận thất bại đầu'
      : metrics.startedRunAfterFirstDefeat
      ? '100% (Đã vào Lượt 2)'
      : '0% (Chưa bắt đầu Lượt 2)';

    const milestoneRows = [
      { label: 'Cường hóa đầu tiên', rec: metrics.milestones.firstUpgrade },
      { label: 'Trang bị Hiếm đầu tiên', rec: metrics.milestones.firstRare },
      { label: 'Trang bị Sử Thi đầu tiên', rec: metrics.milestones.firstEpic },
      { label: 'Trang bị Mẫu [S] đầu tiên', rec: metrics.milestones.firstSTier },
      { label: 'Vượt Chương 1', rec: metrics.milestones.firstCh1Clear },
    ];
    const activeSets = save ? evaluateEquippedGearSets(save) : null;
    const masteryMap = save ? normalizeHeroMastery(save.heroMastery) : {};
    const maxMasteryLevel = Math.max(
      1,
      ...Object.values(masteryMap).map((m) => m?.level ?? 1)
    );
    const kpiRows = evaluatePlaytestKpis(metrics, {
      highestChapterCleared: save?.highestChapterCleared ?? 0,
      activeSetCount: activeSets ? activeSets.sets.filter((s) => s.unlockedTiers.length > 0).length : 0,
      maxMasteryLevel,
    });
    const kpiPassCount = kpiRows.filter((r) => r.status === 'pass').length;
    const kpiWarnCount = kpiRows.filter((r) => r.status === 'warn').length;
    const runHistory = (save?.runHistory ?? []).slice(0, 20);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#040611]/90">
        <div className="cel-panel-ornate w-full max-w-xl rounded-3xl p-5 sm:p-6 max-h-[90vh] flex flex-col gap-4">
          <div className="flex items-center justify-between border-b border-amber-400/25 pb-3 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(0.95);
                  setShowPlaytestKpi(false);
                  setConfirmReset(false);
                }}
                aria-label="Quay Lại Cài Đặt"
                className="cel-panel w-8 h-8 rounded-xl flex items-center justify-center text-amber-200 hover:text-white cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div className="min-w-0">
                <h2 className="font-display text-base sm:text-lg font-black text-white truncate">
                  Dữ Liệu Playtest &amp; KPI (Nội Bộ)
                </h2>
                <p className="text-[11px] text-slate-400">
                  Lưu cục bộ trên trình duyệt · Không gửi ra ngoài
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick(0.9);
                onClose();
              }}
              aria-label="Đóng"
              className="cel-panel w-8 h-8 rounded-xl flex items-center justify-center text-slate-200 hover:text-white cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Segmented Tab Switcher: 8-Criteria KPI vs Post-Run Battle Log */}
          <div className="grid grid-cols-2 gap-1.5 bg-[#060916] border border-amber-400/20 rounded-xl p-1 shrink-0">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick(1.02);
                setKpiTab('kpi');
              }}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-black whitespace-nowrap cursor-pointer ${
                kpiTab === 'kpi'
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Đánh Giá KPI ({kpiRows.length} Tiêu Chí)
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick(1.02);
                setKpiTab('history');
              }}
              className={`py-1.5 px-2.5 rounded-lg text-xs font-black whitespace-nowrap cursor-pointer ${
                kpiTab === 'history'
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              Nhật Ký Trận Đấu ({runHistory.length})
            </button>
          </div>

          <div className="overflow-y-auto a2-scroll space-y-4 pr-1 flex-1">
            {kpiTab === 'history' ? (
              runHistory.length === 0 ? (
                <div className="rounded-xl border border-slate-800 bg-[#070b19] px-4 py-8 text-center text-xs text-slate-400">
                  Chưa có trận đấu nào được ghi nhận. Hoàn thành 1 trận để xem Nhật Ký chi tiết.
                </div>
              ) : (
                <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl bg-[#070b19]">
                  {runHistory.map((entry) => {
                    const heroName = HERO_MAP[entry.heroId]?.name ?? entry.heroId;
                    const synNames = (entry.activeSynergies ?? [])
                      .map((id) => SKILL_SYNERGY_MAP[id]?.name ?? id);
                    return (
                      <div key={entry.id} className="px-3 py-2.5 space-y-1 text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white truncate">{entry.label}</span>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-black shrink-0 whitespace-nowrap ${
                              entry.victory ? 'text-emerald-300' : 'text-rose-300'
                            }`}
                          >
                            {entry.victory ? (
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span>{entry.victory ? 'Chiến Thắng' : 'Thất Bại'}</span>
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 font-mono-nums">
                          {heroName} · Ải/Tầng {entry.stageReached} · {entry.kills} Hạ Gục · Combo {entry.maxCombo}
                          {entry.durationSec ? ` · ${formatDurationSec(entry.durationSec)}` : ''}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono-nums">
                          +{entry.gold} Vàng · +{entry.gems} Ngọc
                          {entry.masteryExpGained ? ` · +${entry.masteryExpGained} EXP Tinh Thông` : ''}
                        </div>
                        {((entry.activeSetNames && entry.activeSetNames.length > 0) || synNames.length > 0) && (
                          <div className="text-[10px] text-amber-200/90">
                            {entry.activeSetNames && entry.activeSetNames.length > 0
                              ? `Bộ Đồ: ${entry.activeSetNames.join(', ')}`
                              : ''}
                            {entry.activeSetNames && entry.activeSetNames.length > 0 && synNames.length > 0
                              ? ' · '
                              : ''}
                            {synNames.length > 0 ? `Cộng Hưởng: ${synNames.join(', ')}` : ''}
                          </div>
                        )}
                        {!entry.victory && entry.defeatCauseLabel && (
                          <div className="text-[10px] text-rose-300">
                            Nguyên nhân: {entry.defeatCauseLabel}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <>
            {/* Key Summary Row */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              <div className="bg-[#080d1e] border border-amber-400/20 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Tổng Lượt Chơi
                </div>
                <div className="font-mono-nums text-lg font-black text-white mt-0.5">
                  {metrics.totalRuns}
                </div>
              </div>
              <div className="bg-[#080d1e] border border-amber-400/20 rounded-xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Thời Gian Tích Lũy
                </div>
                <div className="font-mono-nums text-lg font-black text-amber-200 mt-0.5">
                  {formatDurationSec(metrics.totalPlaySeconds)}
                </div>
              </div>
              <div className="bg-[#080d1e] border border-amber-400/20 rounded-xl p-3 col-span-2 sm:col-span-1">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Giữ Nhịp Lượt 2
                </div>
                <div className="text-xs font-black text-emerald-300 mt-1 leading-snug">
                  {run2RateLabel}
                </div>
              </div>
            </div>

            {/* Phase 3: Auto-Graded KPI Threshold Evaluation */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-300">
                  Đánh Giá Ngưỡng KPI Tự Động ({kpiRows.length} Tiêu Chí)
                </span>
                <span className="font-mono-nums text-[11px] font-bold text-slate-300">
                  <span className="text-emerald-300">{kpiPassCount} Đạt</span>
                  {' · '}
                  <span className={kpiWarnCount > 0 ? 'text-amber-300' : 'text-slate-400'}>
                    {kpiWarnCount} Cần chỉnh
                  </span>
                </span>
              </div>
              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl bg-[#070b19]">
                {kpiRows.map((row) => {
                  const statusTone =
                    row.status === 'pass'
                      ? 'text-emerald-300'
                      : row.status === 'warn'
                      ? 'text-amber-300'
                      : 'text-slate-400';
                  const statusLabel =
                    row.status === 'pass'
                      ? 'Đạt chuẩn'
                      : row.status === 'warn'
                      ? 'Cần điều chỉnh'
                      : 'Chưa đủ mẫu';
                  return (
                    <div key={row.id} className="px-3 py-2 flex items-start justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <div className="text-slate-100 font-semibold">{row.label}</div>
                        <div className="text-[11px] text-slate-400 font-mono-nums mt-0.5">
                          Thực tế: <span className="text-slate-200 font-bold">{row.actualText}</span>
                          {' · '}
                          Mục tiêu: {row.targetText}
                        </div>
                        {row.note && (
                          <div className="text-[10px] text-slate-400 mt-0.5">{row.note}</div>
                        )}
                      </div>
                      <span className={`inline-flex items-center gap-1 font-bold text-[11px] shrink-0 whitespace-nowrap ${statusTone}`}>
                        {row.status === 'pass' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        ) : row.status === 'warn' ? (
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{statusLabel}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Boss Attempts-to-First-Clear */}
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-300 mb-2">
                Số Lượt Đánh Boss Đến Khi Hạ Lần Đầu (Chương 1–12)
              </div>
              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl bg-[#070b19]">
                {BOSS_LABELS.map((b) => {
                  const rec = metrics.bossAttempts[b.key];
                  return (
                    <div
                      key={b.key}
                      className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="text-slate-200 font-semibold truncate">{b.label}</span>
                      <span className="font-mono-nums text-slate-300 shrink-0">
                        {rec
                          ? `${rec.attempts} lần gặp · Hạ lần đầu: ${
                              rec.attemptsToFirstClear ? `Lượt #${rec.attemptsToFirstClear}` : 'Chưa'
                            }`
                          : 'Chưa chạm trán'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stage Entry & Defeat Funnel Ch.1-3 */}
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-300 mb-2">
                Phễu Vào Ải / Gục Ngã (Chương 1–3 · Mốc 1/2/4/8/12)
              </div>
              <div className="space-y-2">
                {(['1', '2', '3'] as const).map((chKey) => {
                  const entriesMap = metrics.stageEntriesByChapter[chKey] ?? {};
                  const defeatsMap = metrics.stageDefeatsByChapter[chKey] ?? {};
                  return (
                    <div key={chKey} className="grid grid-cols-6 gap-1.5 items-center">
                      <div className="text-[11px] font-black text-amber-200">Ch.{chKey}</div>
                      {FUNNEL_STAGES.map((st) => {
                        const en = entriesMap[st] ?? 0;
                        const df = defeatsMap[st] ?? 0;
                        return (
                          <div
                            key={`${chKey}_${st}`}
                            className="bg-[#070b19] border border-slate-800 rounded-lg py-1.5 px-1 text-center"
                          >
                            <div className="text-[9px] font-bold text-slate-400">Ải {st}</div>
                            <div className="font-mono-nums text-[11px] font-black text-white">
                              {en}
                              <span
                                className={
                                  df > 0 ? 'text-rose-300 ml-0.5' : 'text-slate-500 ml-0.5'
                                }
                              >
                                /-{df}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Milestones Timing */}
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-300 mb-2">
                Mốc Thời Gian &amp; Số Lượt Đạt Tiến Trình
              </div>
              <div className="divide-y divide-slate-800/80 border border-slate-800 rounded-xl bg-[#070b19]">
                {milestoneRows.map((row) => (
                  <div
                    key={row.label}
                    className="px-3 py-2 flex items-center justify-between gap-2 text-xs"
                  >
                    <span className="text-slate-200 font-semibold">{row.label}</span>
                    <span
                      className={`font-mono-nums shrink-0 ${
                        row.rec ? 'text-emerald-300 font-bold' : 'text-slate-500'
                      }`}
                    >
                      {row.rec
                        ? `Lượt #${row.rec.runIndex} · ${formatDurationSec(row.rec.elapsedSec)}`
                        : 'Chưa đạt'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Synergy Activation Counts */}
            <div>
              <div className="text-[11px] font-black uppercase tracking-wider text-amber-300 mb-2">
                Tần Suất Kích Hoạt {SKILL_SYNERGIES.length} Cộng Hưởng Kỹ Năng
              </div>
              <div className="grid grid-cols-2 gap-2">
                {SKILL_SYNERGIES.map((syn) => {
                  const count = metrics.synergyPickCounts[syn.id] ?? 0;
                  return (
                    <div
                      key={syn.id}
                      className="bg-[#070b19] border border-slate-800 rounded-lg px-3 py-2 flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="text-slate-200 font-semibold truncate">{syn.name}</span>
                      <span className="font-mono-nums font-black text-amber-200 shrink-0">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
              </>
            )}
          </div>

          <div className="pt-2 border-t border-amber-400/20 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyJson}
              className="a2-slate-btn px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
            >
              {copiedJson ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span className="text-emerald-300">Đã Sao Chép JSON</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>Sao Chép JSON</span>
                </>
              )}
            </button>

            {onResetPlaytestMetrics && (
              <button
                type="button"
                onClick={() => {
                  if (!confirmReset) {
                    soundEngine.playUiClick(0.95);
                    setConfirmReset(true);
                    return;
                  }
                  soundEngine.playUiClick(0.8);
                  onResetPlaytestMetrics();
                  setConfirmReset(false);
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer border ${
                  confirmReset
                    ? 'bg-rose-600/90 border-rose-300 text-white'
                    : 'bg-rose-500/10 border-rose-400/40 text-rose-200 hover:bg-rose-500/20'
                }`}
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>{confirmReset ? 'Xác Nhận Xóa KPI?' : 'Đặt Lại KPI'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040611]/90">
      <div className="cel-panel-ornate w-full max-w-md rounded-3xl p-5 sm:p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-amber-400/25 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-amber-300" />
            <h2 className="font-display text-lg font-black text-white">
              Cài Đặt Hệ Thống
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(0.9);
              onClose();
            }}
            aria-label="Đóng Cài Đặt"
            className="cel-panel w-8 h-8 rounded-xl flex items-center justify-center text-slate-200 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Audio Sliders */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4" />
              <span>Âm Thanh &amp; Nhạc Nền</span>
            </span>
            <button
              type="button"
              onClick={onToggleMute}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                muted
                  ? 'bg-rose-500/20 border border-rose-400/50 text-rose-200'
                  : 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-200'
              }`}
            >
              {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              <span>{muted ? 'Đang Tắt Tiếng' : 'Đang Bật Tiếng'}</span>
            </button>
          </div>

          {[
            { key: 'masterVol' as const, label: 'Âm lượng tổng', val: settings.masterVol },
            { key: 'bgmVol' as const, label: 'Nhạc nền (BGM)', val: settings.bgmVol },
            { key: 'sfxVol' as const, label: 'Hiệu ứng chiến đấu (SFX)', val: settings.sfxVol },
          ].map((item) => (
            <div key={item.key} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-200 font-semibold">{item.label}</span>
                <span className="font-mono-nums font-bold text-amber-200">
                  {Math.round(item.val * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(item.val * 100)}
                onChange={(e) =>
                  onUpdateSettings({ [item.key]: Number(e.target.value) / 100 })
                }
                className="w-full accent-amber-400 cursor-pointer h-2 bg-slate-900 rounded-lg"
              />
            </div>
          ))}
        </div>

        <div className="cel-divider-gold" />

        {/* 3D Graphics Quality */}
        <div className="space-y-2.5">
          <div className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
            <Monitor className="w-4 h-4" />
            <span>Chất Lượng Đồ Họa 3D</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {qualityOptions.map((opt) => {
              const active = settings.graphicsQuality === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(1.05);
                    onUpdateSettings({ graphicsQuality: opt.id });
                  }}
                  className={`py-2 px-2 rounded-xl text-center border cursor-pointer transition-colors ${
                    active
                      ? 'a2-yellow-btn'
                      : 'bg-[#080d1e] border-amber-400/25 text-slate-200 hover:border-amber-300'
                  }`}
                >
                  <div className="text-xs font-black">{opt.label}</div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      active ? 'text-slate-900 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {opt.hint}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Combat & 3D Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onUpdateSettings({ screenShake: !settings.screenShake });
            }}
            className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
              settings.screenShake
                ? 'bg-emerald-500/15 border-emerald-400/55 text-emerald-100'
                : 'bg-[#080d1e] border-slate-700 text-slate-400'
            }`}
          >
            <div className="text-xs font-black">Rung Camera</div>
            <div className="text-[11px] mt-0.5 font-semibold">
              {settings.screenShake ? 'Đang bật' : 'Đã tắt'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onUpdateSettings({ showDamageNumbers: !settings.showDamageNumbers });
            }}
            className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
              settings.showDamageNumbers
                ? 'bg-emerald-500/15 border-emerald-400/55 text-emerald-100'
                : 'bg-[#080d1e] border-slate-700 text-slate-400'
            }`}
          >
            <div className="text-xs font-black">Số Sát Thương</div>
            <div className="text-[11px] mt-0.5 font-semibold">
              {settings.showDamageNumbers ? 'Đang hiện' : 'Đã ẩn'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onUpdateSettings({ starfallWeather: settings.starfallWeather === false });
            }}
            className={`p-3 rounded-xl border text-left cursor-pointer transition-colors ${
              settings.starfallWeather !== false
                ? 'bg-emerald-500/15 border-emerald-400/55 text-emerald-100'
                : 'bg-[#080d1e] border-slate-700 text-slate-400'
            }`}
          >
            <div className="text-xs font-black">Mưa Sao Băng 3D</div>
            <div className="text-[11px] mt-0.5 font-semibold">
              {settings.starfallWeather !== false ? 'Đang bật' : 'Đã tắt'}
            </div>
          </button>
        </div>

        <div className="flex flex-col gap-2 pt-1">
          {onReplayTutorial && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                onReplayTutorial();
                onClose();
              }}
              className="a2-slate-btn w-full py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
              <span>Xem Lại Hướng Dẫn Tân Thủ</span>
            </button>
          )}
          {save && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick(1.02);
                setShowPlaytestKpi(true);
              }}
              className="w-full py-2 px-3 rounded-xl text-[11px] font-bold text-slate-300 hover:text-amber-200 border border-slate-800 hover:border-amber-400/35 bg-[#070b18] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap transition-colors"
            >
              <BarChart3 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Dữ Liệu Playtest &amp; KPI</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            className="a2-yellow-btn w-full py-2.5 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
          >
            Lưu &amp; Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

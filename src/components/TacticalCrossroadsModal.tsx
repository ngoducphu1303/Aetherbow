import React, { useEffect, useState } from 'react';
import { Bot, Compass, ShieldAlert, Sparkles } from 'lucide-react';
import type {
  AiAutoPilotTactic,
  AiDraftDecision,
  TacticalCrossroadsId,
  TacticalCrossroadsOption,
  VirtualPlayerPersonaId,
} from '../types/game';
import { requestNvidiaCrossroadsDecision } from '../services/nvidiaVirtualPlayerClient';

interface TacticalCrossroadsModalProps {
  options: [TacticalCrossroadsOption, TacticalCrossroadsOption];
  chapterId: number;
  stageCleared: number;
  autoPilotEnabled?: boolean;
  autoPilotTactic?: AiAutoPilotTactic;
  autoPilotPersona?: VirtualPlayerPersonaId;
  autoSkillPick?: boolean;
  hpRatio?: number;
  onSelect: (optionId: TacticalCrossroadsId) => void;
}

/**
 * Wave 15 + NVIDIA NIM Virtual Player Auto-Picker:
 * Solid surface (0 backdrop-blur for E5430), Zero-Pill typography, colorblind-safe
 * geometric glyphs (◆ / ✦ / ▲), and keyboard shortcuts (1 / 2).
 */
export const TacticalCrossroadsModal: React.FC<TacticalCrossroadsModalProps> = ({
  options,
  chapterId,
  stageCleared,
  autoPilotEnabled = false,
  autoPilotTactic = 'balanced',
  autoPilotPersona = 'natural_balanced',
  autoSkillPick = true,
  hpRatio = 1,
  onSelect,
}) => {
  const [autoCancelled, setAutoCancelled] = useState(false);
  const [autoDecision, setAutoDecision] = useState<AiDraftDecision | null>(null);
  const [countdownMs, setCountdownMs] = useState(2400);

  const autoActive = autoPilotEnabled && autoSkillPick && !autoCancelled;

  useEffect(() => {
    if (!autoActive) {
      setAutoDecision(null);
      return;
    }
    let cancelled = false;
    void requestNvidiaCrossroadsDecision({
      personaId: autoPilotPersona,
      tactic: autoPilotTactic,
      chapterId,
      stageNumber: stageCleared + 1,
      hpRatio,
      options,
    }).then((dec) => {
      if (!cancelled) setAutoDecision(dec);
    });
    return () => {
      cancelled = true;
    };
  }, [autoActive, autoPilotPersona, autoPilotTactic, chapterId, stageCleared, hpRatio, options]);

  const recommendedOption = autoActive
    ? options.find((o) => o.id === autoDecision?.selectedId) ?? options[0]
    : null;

  useEffect(() => {
    if (!recommendedOption) return;
    setCountdownMs(2400);
    const startedAt = Date.now();
    const timer = window.setInterval(() => {
      const left = Math.max(0, 2400 - (Date.now() - startedAt));
      setCountdownMs(left);
      if (left <= 0) {
        window.clearInterval(timer);
        onSelect(recommendedOption.id);
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [recommendedOption, onSelect]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === '1') {
        e.preventDefault();
        onSelect(options[0].id);
      } else if (e.key === '2') {
        e.preventDefault();
        onSelect(options[1].id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [options, onSelect]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Ngã Rẽ Chiến Thuật"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040712]/90"
    >
      <div className="cel-panel-ornate w-full max-w-3xl rounded-3xl p-5 sm:p-6 bg-[#090e1f] border border-amber-400/35 shadow-2xl">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-300/50 flex items-center justify-center shrink-0">
              <Compass className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-black text-white tracking-tight truncate">
                Ngã Rẽ Chiến Thuật · Chương {chapterId}
              </h2>
              <p className="text-xs text-slate-300 truncate">
                Đã vượt Phòng {stageCleared} · Chọn tuyến tiến công tiếp theo (Phím 1 hoặc 2)
              </p>
            </div>
          </div>
          <span className="text-xs font-mono-nums text-amber-300 font-bold whitespace-nowrap">
            Cổng Kế Tiếp #{stageCleared + 1}
          </span>
        </div>

        {recommendedOption && (
          <div
            data-testid="crossroads-ai-autopick-bar"
            className="mb-4 rounded-xl bg-[#0d162c] border border-sky-400/40 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2"
          >
            <div className="flex items-start gap-2 min-w-0">
              <Bot className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-xs font-bold text-sky-200">
                  AI chọn tuyến: {recommendedOption.title} ·{' '}
                  <span className="font-mono-nums tabular-nums text-amber-300">
                    {(countdownMs / 1000).toFixed(1)}s
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 leading-snug">
                  {autoDecision?.reasonVi ?? 'Đang phân tích tuyến đường an toàn nhất.'}{' '}
                  <span className="text-slate-400">
                    · {autoDecision?.source === 'nvidia_nim' ? 'NVIDIA NIM' : 'Bộ Não Nội Bộ'}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAutoCancelled(true)}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-[11px] font-bold text-slate-200 whitespace-nowrap cursor-pointer"
            >
              Tự Chọn Tay
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {options.map((opt, idx) => {
            const isRecommended = recommendedOption?.id === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelect(opt.id)}
                className={`group text-left rounded-2xl p-4 bg-[#0d1429] hover:bg-[#131d3a] border transition-colors cursor-pointer flex flex-col justify-between gap-3 ${
                  isRecommended
                    ? 'border-sky-400/80 ring-1 ring-sky-400/40'
                    : 'border-slate-700/80 hover:border-amber-300/70'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span
                      className="text-sm font-black tracking-wide flex items-center gap-1.5"
                      style={{ color: opt.accentHex }}
                    >
                      <span aria-hidden="true">{opt.glyph}</span>
                      <span>{opt.title}</span>
                    </span>
                    <span className="text-[11px] font-mono-nums text-slate-400 font-bold whitespace-nowrap">
                      {isRecommended ? 'AI Đề Xuất · ' : ''}[{idx + 1}]
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed mb-3">
                    {opt.subtitle}
                  </p>

                  <div className="space-y-1.5 text-[11px] border-t border-slate-800 pt-2.5">
                    <div className="flex items-start gap-1.5 text-rose-300">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-rose-200">{opt.doctrineLabel}:</strong>{' '}
                        {opt.riskSummary}
                      </span>
                    </div>
                    <div className="flex items-start gap-1.5 text-emerald-300">
                      <Sparkles className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-emerald-200">Lợi thế:</strong>{' '}
                        {opt.rewardSummary}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs font-bold text-amber-300 group-hover:text-amber-200">
                  <span>Tiến vào cổng này</span>
                  <span aria-hidden="true">→</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

import React, { useEffect } from 'react';
import { Compass, ShieldAlert, Sparkles } from 'lucide-react';
import type { TacticalCrossroadsId, TacticalCrossroadsOption } from '../types/game';

interface TacticalCrossroadsModalProps {
  options: [TacticalCrossroadsOption, TacticalCrossroadsOption];
  chapterId: number;
  stageCleared: number;
  onSelect: (optionId: TacticalCrossroadsId) => void;
}

/**
 * Wave 15: Tactical Room Crossroads Portal Modal (Chapters 2–12, Stage 4 & Stage 8).
 * Solid surface (0 backdrop-blur for E5430), Zero-Pill typography, colorblind-safe
 * geometric glyphs (◆ / ✦ / ▲), and keyboard shortcuts (1 / 2).
 */
export const TacticalCrossroadsModal: React.FC<TacticalCrossroadsModalProps> = ({
  options,
  chapterId,
  stageCleared,
  onSelect,
}) => {
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {options.map((opt, idx) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onSelect(opt.id)}
              className="group text-left rounded-2xl p-4 bg-[#0d1429] hover:bg-[#131d3a] border border-slate-700/80 hover:border-amber-300/70 transition-colors cursor-pointer flex flex-col justify-between gap-3"
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
                    [{idx + 1}]
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
          ))}
        </div>
      </div>
    </div>
  );
};

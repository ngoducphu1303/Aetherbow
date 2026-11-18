import React from 'react';
import { TrendingUp } from 'lucide-react';

export interface PowerToastData {
  id: number;
  prevPower: number;
  nextPower: number;
  delta: number;
}

interface CombatPowerToastProps {
  toast: PowerToastData | null;
}

export const CombatPowerToast: React.FC<CombatPowerToastProps> = ({ toast }) => {
  if (!toast || toast.delta <= 0) return null;

  return (
    <div
      key={toast.id}
      className="fixed top-16 left-1/2 z-50 pointer-events-none a2-power-toast"
    >
      <div className="cel-panel-ornate rounded-2xl px-4 py-2 border-amber-300/80 shadow-[0_12px_32px_rgba(251,191,36,0.28)] flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-amber-400/20 border border-amber-300/70 flex items-center justify-center shrink-0">
          <TrendingUp className="w-4 h-4 text-amber-300" />
        </div>
        <div className="flex items-baseline gap-2 whitespace-nowrap">
          <span className="text-[11px] font-black uppercase tracking-wider text-amber-200">
            Lực Chiến
          </span>
          <span className="font-mono-nums text-xs text-slate-400 font-bold">
            {toast.prevPower.toLocaleString('vi-VN')} →
          </span>
          <span className="font-mono-nums text-sm sm:text-base font-black text-white">
            {toast.nextPower.toLocaleString('vi-VN')}
          </span>
          <span className="font-mono-nums text-xs sm:text-sm font-black text-emerald-300">
            (+{toast.delta.toLocaleString('vi-VN')} LC)
          </span>
        </div>
      </div>
    </div>
  );
};

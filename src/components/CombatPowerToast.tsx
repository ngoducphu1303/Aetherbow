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
      <div className="cel-panel-ornate rounded-2xl px-4 py-2.5 border-2 border-amber-300/85 bg-gradient-to-r from-[#1c1406]/95 via-[#0d1430]/95 to-[#1c1406]/95 shadow-[0_14px_36px_rgba(251,191,36,0.34)] flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 border border-amber-100 flex items-center justify-center shrink-0 shadow">
          <TrendingUp className="w-4 h-4 text-slate-950" />
        </div>
        <div className="flex items-baseline gap-2 whitespace-nowrap">
          <span className="text-[11px] font-black uppercase tracking-[0.14em] text-amber-300">
            Lực Chiến
          </span>
          <span className="font-mono-nums text-xs text-slate-300 font-bold">
            {toast.prevPower.toLocaleString('vi-VN')} →
          </span>
          <span className="font-mono-nums text-sm sm:text-base font-black text-white">
            {toast.nextPower.toLocaleString('vi-VN')}
          </span>
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-400/60 font-mono-nums text-xs font-black text-emerald-300">
            +{toast.delta.toLocaleString('vi-VN')} LC
          </span>
        </div>
      </div>
    </div>
  );
};

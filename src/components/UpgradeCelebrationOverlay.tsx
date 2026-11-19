import React from 'react';
import { Sparkles } from 'lucide-react';

export interface UpgradeCelebrationState {
  id: number;
  title: string;
  detail: string;
}

interface UpgradeCelebrationOverlayProps {
  celebration: UpgradeCelebrationState | null;
}

export const UpgradeCelebrationOverlay: React.FC<UpgradeCelebrationOverlayProps> = ({
  celebration,
}) => {
  if (!celebration) return null;

  return (
    <div
      key={celebration.id}
      className="pointer-events-none fixed inset-0 z-[80] flex items-center justify-center"
    >
      <div className="relative flex items-center justify-center">
        {/* Expanding golden shimmer ring (compositor-only transform + opacity) */}
        <div className="a2-gold-upgrade-ring absolute h-44 w-44 rounded-full border-2 border-amber-300/80 shadow-[0_0_40px_rgba(251,191,36,0.55)]" />

        {/* Celebratory golden crest plaque */}
        <div className="a2-gold-upgrade-banner relative flex flex-col items-center rounded-2xl border-2 border-amber-300/85 bg-gradient-to-b from-[#2b1d08]/95 via-[#181226]/95 to-[#0d0b1a]/95 px-7 py-4 text-center shadow-[0_14px_50px_rgba(245,158,11,0.45)]">
          <div className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-400/20 px-3 py-0.5 text-[10px] font-black uppercase tracking-widest text-amber-200">
            <Sparkles className="h-3 w-3" />
            Đột Phá Ánh Kim
          </div>
          <div className="font-display text-xl font-black tracking-tight text-amber-100">
            {celebration.title}
          </div>
          <div className="mt-0.5 font-mono-nums text-xs font-extrabold text-emerald-300">
            {celebration.detail}
          </div>
        </div>
      </div>
    </div>
  );
};

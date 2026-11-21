import React from 'react';
import { Award } from 'lucide-react';
import { AchievementDefinition } from '../types/game';

interface AchievementToastProps {
  achievement: AchievementDefinition | null;
}

export const AchievementToast: React.FC<AchievementToastProps> = ({ achievement }) => {
  if (!achievement) return null;

  return (
    <div className="fixed top-[62px] left-3 sm:left-5 z-50 pointer-events-none max-w-[264px]">
      <div className="a2-toast-in cel-panel-ornate rounded-xl px-3 py-2 border border-amber-300/75 bg-[#0e1328]/95 flex items-center gap-2.5 shadow-[0_10px_28px_rgba(2,6,23,0.75)]">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-300 to-amber-500 border border-amber-100 flex items-center justify-center shrink-0 shadow">
          <Award className="w-4 h-4 text-slate-950" />
        </div>
        <div className="min-w-0">
          <div className="text-[9px] font-black uppercase tracking-[0.14em] text-amber-300 leading-tight">
            Thành Tựu Mới
          </div>
          <div className="font-display text-xs font-black text-white truncate">
            {achievement.title}
          </div>
          <div className="text-[10px] font-mono-nums text-emerald-300 font-bold truncate">
            +{achievement.rewardGold} Vàng · +{achievement.rewardGems} Ngọc
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Award } from 'lucide-react';
import { AchievementDefinition } from '../types/game';

interface AchievementToastProps {
  achievement: AchievementDefinition | null;
}

export const AchievementToast: React.FC<AchievementToastProps> = ({ achievement }) => {
  if (!achievement) return null;

  return (
    <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none px-4 w-full max-w-sm flex justify-center">
      <div className="a2-toast-in cel-panel-ornate rounded-2xl px-4 py-2.5 flex items-center gap-3 shadow-[0_12px_32px_rgba(251,191,36,0.28)]">
        <div className="w-10 h-10 rounded-xl bg-amber-400/20 border border-amber-300/75 flex items-center justify-center shrink-0">
          <Award className="w-5 h-5 text-amber-300" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
            Thành Tựu Mở Khóa
          </div>
          <div className="font-display text-sm font-black text-white truncate">
            {achievement.title}
          </div>
          <div className="text-[11px] font-mono-nums text-emerald-300 font-bold">
            +{achievement.rewardGold} Vàng · +{achievement.rewardGems} Ngọc (Vào Hồ Sơ để nhận)
          </div>
        </div>
      </div>
    </div>
  );
};

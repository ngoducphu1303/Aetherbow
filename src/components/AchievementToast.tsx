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
      <div className="a2-toast-in cel-panel-ornate rounded-2xl px-4 py-2.5 border-2 border-amber-300/80 bg-gradient-to-r from-[#1a1308]/95 via-[#0e1532]/95 to-[#1a1308]/95 flex items-center gap-3 shadow-[0_14px_36px_rgba(251,191,36,0.32)]">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-300 to-amber-500 border border-amber-100 flex items-center justify-center shrink-0 shadow">
          <Award className="w-5 h-5 text-slate-950" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
            Chiến Công &amp; Thành Tựu Mới
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

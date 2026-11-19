import React from 'react';
import { ArrowRight, Check, Compass, Lock, X } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import {
  EarlyRoadmapStage,
  getEarlyRoadmapStatus,
  getNextTargetGoal,
} from '../data/earlyProgressionData';
import { SaveData } from '../types/game';
import { LobbyTab } from './TitleScreen';

interface EarlyRoadmapModalProps {
  save: SaveData;
  onClose: () => void;
  onJumpToTab: (tab: LobbyTab) => void;
  onCraftEarlyTargetGear?: (tier: 'rare' | 'epic' | 's_tier') => void;
}

function mapActionTargetToTab(target?: EarlyRoadmapStage['actionTarget']): {
  tab: LobbyTab;
  label: string;
} {
  switch (target) {
    case 'forge':
      return { tab: 'gear', label: 'Mở Trang Bị' };
    case 'runes':
      return { tab: 'runes', label: 'Mở Ngọc Khắc' };
    case 'shop':
      return { tab: 'shop', label: 'Mở Cửa Hàng' };
    default:
      return { tab: 'battle', label: 'Vào Chiến Đấu' };
  }
}

export const EarlyRoadmapModal: React.FC<EarlyRoadmapModalProps> = ({
  save,
  onClose,
  onJumpToTab,
  onCraftEarlyTargetGear,
}) => {
  const milestones = getEarlyRoadmapStatus(save);
  const targetGoal = getNextTargetGoal(save);
  const completedCount = milestones.filter((m) => m.completed).length;

  const handleAction = (tab: LobbyTab) => {
    soundEngine.playUiClick(1.05);
    onJumpToTab(tab);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/90">
      <div className="cel-panel-ornate w-full max-w-xl rounded-3xl p-5 sm:p-6 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-amber-400/25 pb-3.5 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-amber-300">
              <Compass className="w-3.5 h-3.5 shrink-0" />
              <span>Lộ Trình Tân Thủ · Chương 1–3</span>
            </div>
            <h2 className="font-display text-xl sm:text-2xl font-black text-white mt-0.5">
              Cột Mốc Chinh Phục Tinh Giới
            </h2>
            <p className="text-xs text-slate-300 mt-1">
              Hoàn thành từng cột mốc để mở khóa tính năng mới, nâng trần phẩm chất và rèn trang bị mục tiêu.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(0.9);
              onClose();
            }}
            aria-label="Đóng Lộ Trình"
            className="cel-panel w-8 h-8 rounded-xl flex items-center justify-center text-slate-200 hover:text-white cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Summary Progress Strip */}
        <div className="py-3 border-b border-amber-400/15 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold text-amber-200 truncate">{targetGoal.title}</span>
              <span className="font-mono-nums text-slate-300 shrink-0 ml-2">
                {targetGoal.current}/{targetGoal.target} mảnh · {completedCount}/{milestones.length} mốc
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-slate-950 border border-amber-400/20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400"
                style={{
                  width: `${Math.min(
                    100,
                    Math.max(4, Math.round((targetGoal.current / Math.max(1, targetGoal.target)) * 100))
                  )}%`,
                }}
              />
            </div>
          </div>
          {targetGoal.canCraftNow && onCraftEarlyTargetGear && (
            <button
              type="button"
              onClick={() => {
                soundEngine.playForgeCraft();
                onCraftEarlyTargetGear(targetGoal.tier);
              }}
              className="a2-emerald-btn px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap shrink-0 cursor-pointer"
            >
              Rèn Mục Tiêu Ngay
            </button>
          )}
        </div>

        {/* 4 Editorial Milestone Rows */}
        <div className="overflow-y-auto a2-scroll divide-y divide-amber-400/15 py-1 flex-1">
          {milestones.map((ms) => {
            const stateLabel = ms.completed
              ? 'Đã Mở Khóa'
              : ms.isCurrentTarget
              ? 'Mục Tiêu Hiện Tại'
              : 'Chưa Mở';
            const stateTextClass = ms.completed
              ? 'text-emerald-300'
              : ms.isCurrentTarget
              ? 'text-amber-300'
              : 'text-slate-500';
            const action = mapActionTargetToTab(ms.actionTarget);

            return (
              <div
                key={ms.id}
                className={`py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  ms.isCurrentTarget ? 'bg-amber-400/[0.04] -mx-2 px-2 rounded-xl' : ''
                }`}
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center font-mono-nums text-xs font-black shrink-0 mt-0.5 ${
                      ms.completed
                        ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-300'
                        : ms.isCurrentTarget
                        ? 'bg-amber-400/15 border-amber-300/70 text-amber-200'
                        : 'bg-slate-900/90 border-slate-700 text-slate-500'
                    }`}
                  >
                    {ms.completed ? (
                      <Check className="w-4 h-4" />
                    ) : ms.isCurrentTarget ? (
                      ms.stepNumber
                    ) : (
                      <Lock className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono-nums text-[11px] font-bold text-slate-400">
                        {ms.stepNumber}
                      </span>
                      <span className="text-slate-600" aria-hidden="true">·</span>
                      <span className={`text-[11px] font-bold ${stateTextClass}`}>
                        {stateLabel}
                      </span>
                      <span className="text-slate-600" aria-hidden="true">·</span>
                      <span className="text-[11px] font-semibold text-slate-300">
                        {ms.rarityCeilingLabel}
                      </span>
                    </div>
                    <h3 className="font-display text-sm sm:text-base font-black text-white mt-0.5">
                      {ms.title}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                      {ms.unlocksSummary}
                    </p>
                    <p className="text-[11px] font-semibold text-amber-200/90 mt-1">
                      Thưởng đảm bảo: {ms.guaranteedReward}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-end shrink-0">
                  <button
                    type="button"
                    onClick={() => handleAction(action.tab)}
                    className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer ${
                      ms.isCurrentTarget ? 'a2-yellow-btn' : 'a2-slate-btn'
                    }`}
                  >
                    <span>{action.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-amber-400/20 flex justify-end shrink-0">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            className="a2-slate-btn px-5 py-2 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer"
          >
            Đóng Lộ Trình
          </button>
        </div>
      </div>
    </div>
  );
};

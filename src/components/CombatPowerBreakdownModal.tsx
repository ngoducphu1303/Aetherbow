import React from 'react';
import { ArrowUpRight, Crown, Shield, TrendingUp, X, Zap } from 'lucide-react';
import { analyzeCombatPower } from '../data/wave12Data';
import { CombatPowerCategoryItem, SaveData } from '../types/game';

interface CombatPowerBreakdownModalProps {
  save: SaveData;
  totalPower: number;
  onClose: () => void;
  onJumpCategory: (action: CombatPowerCategoryItem['targetAction']) => void;
}

export const CombatPowerBreakdownModal: React.FC<CombatPowerBreakdownModalProps> = ({
  save,
  totalPower,
  onClose,
  onJumpCategory,
}) => {
  const analysis = analyzeCombatPower(save, totalPower);
  const weak = analysis.weakestCategory;

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-3 sm:p-4 bg-[#040611]/92 overflow-y-auto">
      <div className="cel-panel-ornate w-full max-w-2xl rounded-3xl overflow-hidden my-auto max-h-[92vh] flex flex-col a2-modal-enter">
        {/* Header */}
        <div className="px-5 py-4 bg-[#080d22] border-b border-amber-400/35 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 flex items-center justify-center shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                Phân Tích Lực Chiến Trực Tiếp · 1 Chạm Mạnh Hóa
              </div>
              <h2 className="font-display text-lg font-black text-white truncate">
                Tổng Lực Chiến: {analysis.totalPower.toLocaleString('vi-VN')} CP
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-300 text-slate-200 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4 bg-[#050816]">
          {/* Rank & Weakest Link Smart Recommendation */}
          <div className="rounded-2xl bg-gradient-to-r from-[#1f1333] via-[#131838] to-[#23140b] border border-amber-400/55 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-300">
                <Crown className="w-3.5 h-3.5" />
                <span>Danh Hiệu Cảnh Giới: {analysis.rankLabel}</span>
              </div>
              <div className="font-display text-sm sm:text-base font-black text-white mt-1">
                Đề Xuất Mạnh Hóa Nhanh Nhất: <span className="text-amber-300">{weak.label}</span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Hạng mục này hiện mới chiếm <span className="font-mono-nums font-black text-rose-300">{weak.sharePct}%</span> tỷ trọng sức mạnh — nâng cấp ngay sẽ bứt phá Lực Chiến nhanh nhất!
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                onClose();
                onJumpCategory(weak.targetAction);
              }}
              className="a2-yellow-btn px-4 py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>{weak.actionLabel}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 6 Category Breakdown Bars */}
          <div className="space-y-2.5">
            {analysis.categories.map((cat) => {
              const isWeakest = cat.id === weak.id;
              return (
                <div
                  key={cat.id}
                  className={`rounded-2xl border p-3.5 transition-colors ${
                    isWeakest
                      ? 'bg-[#1a1026] border-rose-400/65'
                      : 'bg-[#090f24] border-slate-800'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Shield className="w-4 h-4 text-amber-300 shrink-0" />
                      <span className="font-display text-xs sm:text-sm font-black text-white truncate">
                        {cat.label}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black whitespace-nowrap ${
                          cat.statusLabel === 'Vượt Trội'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : cat.statusLabel === 'Ổn Định'
                            ? 'bg-sky-500/20 text-sky-300'
                            : 'bg-rose-500/25 text-rose-200'
                        }`}
                      >
                        {cat.statusLabel}
                      </span>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="font-mono-nums text-xs font-black text-amber-200">
                        {cat.score.toLocaleString('vi-VN')} điểm ({cat.sharePct}%)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onJumpCategory(cat.targetAction);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-amber-400/40 hover:border-amber-300 text-[11px] font-black text-amber-200 flex items-center gap-1 whitespace-nowrap cursor-pointer"
                      >
                        <span>{cat.actionLabel}</span>
                        <ArrowUpRight className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full bg-gradient-to-r ${cat.accentClass} transition-all duration-300`}
                      style={{ width: `${Math.max(8, Math.min(100, cat.sharePct * 2.4))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

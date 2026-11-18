import React from 'react';
import { Crown, Sparkles, X } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import { GEAR_TEMPLATES, RARITY_META } from '../data/gearData';
import { GearInstance } from '../types/game';
import { GearSlotSvg, GoldCoinIcon, RARITY_FRAME_CLASS, SoulGemIcon } from './GameIcons';

export interface SweepResultState {
  chapterName: string;
  gold: number;
  gems: number;
  seasonXp: number;
  bonusGear?: GearInstance;
}

interface QuickSweepResultModalProps {
  result: SweepResultState;
  onClose: () => void;
}

export const QuickSweepResultModal: React.FC<QuickSweepResultModalProps> = ({
  result,
  onClose,
}) => {
  const tpl = result.bonusGear ? GEAR_TEMPLATES[result.bonusGear.templateId] : null;
  const rMeta = result.bonusGear ? RARITY_META[result.bonusGear.rarity] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#040611]/88">
      <div className="cel-panel-ornate w-full max-w-md rounded-3xl p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-amber-400/25 pb-3">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <h3 className="font-display text-base sm:text-lg font-black text-amber-200">
              Thu Hoạch Quét Nhanh
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            aria-label="Đóng"
            className="cel-panel w-8 h-8 rounded-xl flex items-center justify-center text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-slate-300">
          Hoàn tất quét nhanh <strong className="text-white">{result.chapterName}</strong>. Toàn bộ chiến lợi phẩm đã được chuyển vào kho đồ!
        </p>

        <div className="grid grid-cols-3 gap-2.5 text-center font-mono-nums">
          <div className="cel-panel rounded-2xl p-3">
            <div className="flex items-center justify-center gap-1 text-amber-300 text-sm font-black">
              <GoldCoinIcon className="w-4 h-4" />+{result.gold}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Vàng</div>
          </div>
          <div className="cel-panel rounded-2xl p-3">
            <div className="flex items-center justify-center gap-1 text-purple-300 text-sm font-black">
              <SoulGemIcon className="w-4 h-4" />+{result.gems}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">Ngọc Hồn</div>
          </div>
          <div className="cel-panel rounded-2xl p-3">
            <div className="flex items-center justify-center gap-1 text-emerald-300 text-sm font-black">
              <Crown className="w-4 h-4" />+{result.seasonXp}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">XP Mùa</div>
          </div>
        </div>

        {result.bonusGear && tpl && rMeta && (
          <div className="cel-panel rounded-2xl p-3 flex items-center gap-3">
            <div
              className={`a2-item-card w-14 h-14 shrink-0 ${
                RARITY_FRAME_CLASS[result.bonusGear.rarity]
              }`}
            >
              <div className="a2-item-inner flex items-center justify-center">
                <GearSlotSvg
                  slot={tpl.slot}
                  weaponArchetype={tpl.weaponArchetype}
                  accentHex={tpl.visualAccentHex}
                  className="w-8 h-8"
                />
              </div>
            </div>
            <div className="min-w-0">
              <div className={`text-[11px] font-black ${rMeta.textClass}`}>
                Chiến Lợi Phẩm Rơi Thêm · {rMeta.label}
              </div>
              <div className="font-display text-sm font-black text-white truncate">
                {tpl.name}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            soundEngine.playUiClick();
            onClose();
          }}
          className="a2-yellow-btn w-full py-2.5 rounded-xl font-black text-sm cursor-pointer whitespace-nowrap"
        >
          Tuyệt Vời · Tiếp Tục
        </button>
      </div>
    </div>
  );
};

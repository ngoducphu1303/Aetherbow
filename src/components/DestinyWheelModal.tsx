import React, { useMemo, useRef, useState } from 'react';
import { Check, Gift, Sparkles, Ticket, X } from 'lucide-react';
import destinyWheelArt from '../assets/images/destiny_wheel_event_1794982055394.jpg';
import { soundEngine } from '../audio/soundEngine';
import {
  DESTINY_MILESTONES,
  DESTINY_SPIN5_GEM_COST,
  DESTINY_SPIN_GEM_COST,
  DESTINY_WHEEL_PRIZES,
  normalizeDestinyWheel,
} from '../data/wave4Data';
import { DestinyWheelPrize, SaveData } from '../types/game';
import { SoulGemIcon } from './GameIcons';

interface DestinyWheelModalProps {
  save: SaveData;
  onSpin: (count: 1 | 5) => { prizes: DestinyWheelPrize[]; lastIndex: number } | null;
  onClaimMilestone: (spins: number) => void;
  onClose: () => void;
}

export const DestinyWheelModal: React.FC<DestinyWheelModalProps> = ({
  save,
  onSpin,
  onClaimMilestone,
  onClose,
}) => {
  const [spinning, setSpinning] = useState(false);
  const [rotationDeg, setRotationDeg] = useState(0);
  const [lastResult, setLastResult] = useState<DestinyWheelPrize[] | null>(null);
  const [imgErr, setImgErr] = useState(false);
  const timerRef = useRef<number | null>(null);

  const dw = normalizeDestinyWheel(save.destinyWheel);
  const sliceCount = DESTINY_WHEEL_PRIZES.length;
  const sliceDeg = 360 / sliceCount;

  const conicStops = useMemo(() => {
    return DESTINY_WHEEL_PRIZES.map((p, i) => {
      const start = i * sliceDeg;
      const end = (i + 1) * sliceDeg;
      return `${p.color}33 ${start}deg ${end}deg`;
    }).join(', ');
  }, [sliceDeg]);

  const canSpinOne =
    !spinning && (dw.freeSpinsRemaining > 0 || dw.tickets > 0 || save.gems >= DESTINY_SPIN_GEM_COST);
  const canSpinFive = !spinning && save.gems >= DESTINY_SPIN5_GEM_COST;

  const triggerSpin = (count: 1 | 5) => {
    if (spinning) return;
    const outcome = onSpin(count);
    if (!outcome) return;

    soundEngine.playChestRoll();
    setSpinning(true);
    setLastResult(null);

    const targetCenter = outcome.lastIndex * sliceDeg + sliceDeg / 2;
    const alignedModulo = (360 - targetCenter) % 360;
    const baseMultiple = Math.floor(rotationDeg / 360) * 360;
    const nextDeg = baseMultiple + 360 * 5 + alignedModulo;
    setRotationDeg(nextDeg);

    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setSpinning(false);
      setLastResult(outcome.prizes);
      soundEngine.playVictory();
    }, 3150);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/90 overflow-y-auto">
      <div className="cel-panel-ornate w-full max-w-4xl rounded-3xl overflow-hidden flex flex-col max-h-[92vh] a2-modal-enter">
        {/* Banner Header */}
        <div className="relative shrink-0 border-b border-amber-400/25 bg-[#080c1f]">
          {!imgErr && (
            <img
              src={destinyWheelArt}
              alt="Vòng Quay Vận Mệnh Nhật Thực"
              referrerPolicy="no-referrer"
              onError={() => setImgErr(true)}
              className="w-full h-28 sm:h-32 object-cover opacity-55"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#070b1a]/95 via-[#091028]/80 to-[#070b1a]/75 p-4 sm:p-5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
                SỰ KIỆN GIỚI HẠN MÙA 1 · NHẬT THỰC TINH GIỚI
              </div>
              <h2 className="font-display text-lg sm:text-2xl font-black text-white truncate">
                Vòng Quay Vận Mệnh Thiên Mệnh
              </h2>
              <p className="text-xs text-slate-300 mt-0.5 truncate">
                Quay mỗi ngày 1 lượt miễn phí · Tích lũy 30 &amp; 50 lượt nhận chắc chắn Thánh Vật [S]!
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3 py-1.5 rounded-xl bg-[#070b1a] border border-amber-400/40 flex items-center gap-1.5 text-xs font-mono-nums font-black text-amber-300">
                <Ticket className="w-3.5 h-3.5" />
                <span>{dw.tickets} Vé</span>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-[#070b1a] border border-purple-400/40 flex items-center gap-1.5 text-xs font-mono-nums font-black text-purple-200">
                <SoulGemIcon className="w-3.5 h-3.5" />
                <span>{save.gems}</span>
              </div>
              <button
                type="button"
                disabled={spinning}
                onClick={() => {
                  soundEngine.playUiClick(0.9);
                  onClose();
                }}
                aria-label="Đóng Vòng Quay"
                className="a2-slate-btn w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto a2-scroll p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Interactive Rotating Wheel */}
          <div className="lg:col-span-6 flex flex-col items-center gap-4">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
              {/* Top Golden Pointer */}
              <div
                className="absolute -top-2.5 left-1/2 -translate-x-1/2 z-20 w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-amber-300 drop-shadow-[0_4px_8px_rgba(0,0,0,0.9)]"
                aria-hidden="true"
              />

              {/* Rotating Wheel Disc */}
              <div
                className="relative w-full h-full rounded-full border-4 border-amber-300/85 shadow-[0_0_40px_rgba(251,191,36,0.28)] overflow-hidden bg-[#0a1026]"
                style={{
                  backgroundImage: `conic-gradient(${conicStops})`,
                  transform: `rotate(${rotationDeg}deg)`,
                  transition: 'transform 3.1s cubic-bezier(0.14, 0.86, 0.22, 1)',
                }}
              >
                {DESTINY_WHEEL_PRIZES.map((prize, idx) => {
                  const angle = idx * sliceDeg + sliceDeg / 2;
                  return (
                    <div
                      key={prize.id}
                      style={{
                        transform: `rotate(${angle}deg)`,
                      }}
                      className="absolute inset-0 flex justify-center pt-3 pointer-events-none"
                    >
                      <div className="flex flex-col items-center text-center max-w-[74px]">
                        <span
                          className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#050813]/85 border border-white/20"
                          style={{ color: prize.color }}
                        >
                          {prize.badge}
                        </span>
                        <span className="text-[10px] font-bold text-white leading-tight mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]">
                          {prize.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Center Medallion */}
              <div className="absolute w-16 h-16 rounded-full bg-gradient-to-b from-amber-200 via-amber-400 to-amber-700 border-2 border-white shadow-xl flex flex-col items-center justify-center z-10 pointer-events-none">
                <Sparkles className="w-5 h-5 text-slate-950" />
                <span className="font-mono-nums text-[9px] font-black text-slate-950">
                  {dw.totalSpins} Lượt
                </span>
              </div>
            </div>

            {/* Result Banner */}
            {lastResult && lastResult.length > 0 && (
              <div className="cel-panel-ornate w-full rounded-2xl p-3 text-center a2-gacha-reveal">
                <div className="text-[10px] font-black uppercase tracking-wider text-emerald-300 mb-1">
                  Vật Phẩm Trúng Thưởng
                </div>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {lastResult.map((p, i) => (
                    <span
                      key={`${p.id}_${i}`}
                      className="px-2.5 py-1 rounded-xl bg-[#070b1a] border border-amber-300/60 text-xs font-black text-amber-200"
                    >
                      {p.label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Spin Actions */}
            <div className="w-full grid grid-cols-2 gap-2.5">
              <button
                type="button"
                disabled={!canSpinOne}
                onClick={() => triggerSpin(1)}
                className="a2-emerald-btn py-3 px-4 rounded-xl font-black text-xs sm:text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {dw.freeSpinsRemaining > 0
                  ? 'Quay 1× · MIỄN PHÍ'
                  : dw.tickets > 0
                  ? 'Quay 1× · 1 Vé'
                  : `Quay 1× · ${DESTINY_SPIN_GEM_COST} Ngọc`}
              </button>
              <button
                type="button"
                disabled={!canSpinFive}
                onClick={() => triggerSpin(5)}
                className="a2-yellow-btn py-3 px-4 rounded-xl font-black text-xs sm:text-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Quay 5× · {DESTINY_SPIN5_GEM_COST} Ngọc (-10%)
              </button>
            </div>
          </div>

          {/* Right: Milestone Chests & History */}
          <div className="lg:col-span-6 space-y-4">
            <div className="cel-panel rounded-2xl p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="font-display text-sm font-black text-amber-200 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-300" />
                  <span>Mốc Tích Lũy Vận Mệnh</span>
                </h3>
                <span className="font-mono-nums text-xs font-black text-emerald-300">
                  Đã quay: {dw.totalSpins}/50
                </span>
              </div>

              <div className="space-y-2.5">
                {DESTINY_MILESTONES.map((ms) => {
                  const reached = dw.totalSpins >= ms.spins;
                  const claimed = dw.claimedMilestones.includes(ms.spins);
                  return (
                    <div
                      key={ms.spins}
                      className={`rounded-xl p-3 border flex items-center justify-between gap-3 ${
                        claimed
                          ? 'bg-[#070b18]/75 border-slate-800'
                          : reached
                          ? 'cel-panel-ornate'
                          : 'bg-[#070b1a] border-amber-400/20'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="font-display text-xs font-black text-white">
                          {ms.label}
                        </div>
                        <div className="text-[11px] text-amber-200 font-semibold truncate">
                          {ms.rewardLabel}
                        </div>
                      </div>
                      {claimed ? (
                        <span className="text-xs font-black text-emerald-400 flex items-center gap-1 shrink-0">
                          <Check className="w-3.5 h-3.5" /> Đã Nhận
                        </span>
                      ) : reached ? (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playAchievement();
                            onClaimMilestone(ms.spins);
                          }}
                          className="a2-yellow-btn px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer shrink-0"
                        >
                          Nhận Mốc
                        </button>
                      ) : (
                        <span className="font-mono-nums text-[11px] font-bold text-slate-400 shrink-0">
                          {dw.totalSpins}/{ms.spins}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="cel-panel rounded-2xl p-4">
              <h4 className="font-display text-xs font-black uppercase tracking-wider text-sky-200 mb-2">
                Lịch Sử Vòng Quay Gần Đây
              </h4>
              {dw.history.length === 0 ? (
                <p className="text-xs text-slate-400">
                  Chưa có lượt quay nào. Hãy sử dụng lượt Miễn Phí hằng ngày ngay!
                </p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {dw.history.map((entry, idx) => (
                    <span
                      key={`${entry}_${idx}`}
                      className="px-2.5 py-1 rounded-lg bg-[#070b1a] border border-amber-400/20 text-[11px] font-bold text-slate-200"
                    >
                      {entry}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

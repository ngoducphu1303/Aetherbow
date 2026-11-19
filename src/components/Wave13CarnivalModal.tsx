import React, { useMemo, useState } from 'react';
import { Calendar, Check, Crown, Eye, Gift, Lock, Sparkles, Star, X } from 'lucide-react';
import astralMountsArt from '../assets/images/astral_mounts_race_1795056418828.jpg';
import { soundEngine } from '../audio/soundEngine';
import {
  CARNIVAL_7DAY_MILESTONES,
  CARNIVAL_7DAY_TASKS,
  EVOLVING_FIRST_TOPUP_TIERS,
  getCarnivalTaskProgress,
  getCarnivalTotalPoints,
  normalizeCarnival7Day,
  normalizeEvolvingFirstTopUp,
} from '../data/wave13Data';
import { BundlePreviewPayload, EvolvingFirstTopUpTierDef, SaveData } from '../types/game';
import { SoulGemIcon } from './GameIcons';

interface Wave13CarnivalModalProps {
  save: SaveData;
  initialSection?: 'carnival' | 'first_topup';
  onClaimCarnivalTask: (taskId: string) => void;
  onClaimCarnivalMilestone: (pointsTarget: number) => void;
  onClaimEvolvingTopUp: (tier: 1 | 2 | 3) => void;
  onOpenBundlePreview: (payload: BundlePreviewPayload) => void;
  onClose: () => void;
}

export const Wave13CarnivalModal: React.FC<Wave13CarnivalModalProps> = ({
  save,
  initialSection = 'carnival',
  onClaimCarnivalTask,
  onClaimCarnivalMilestone,
  onClaimEvolvingTopUp,
  onOpenBundlePreview,
  onClose,
}) => {
  const [section, setSection] = useState<'carnival' | 'first_topup'>(initialSection);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [imgErr, setImgErr] = useState(false);

  const carnival = useMemo(() => normalizeCarnival7Day(save.carnival7Day), [save.carnival7Day]);
  const topUpState = useMemo(
    () => normalizeEvolvingFirstTopUp(save.evolvingFirstTopUp),
    [save.evolvingFirstTopUp]
  );
  const totalPoints = useMemo(() => getCarnivalTotalPoints(save), [save]);
  const dayTasks = useMemo(
    () => CARNIVAL_7DAY_TASKS.filter((t) => t.day === selectedDay),
    [selectedDay]
  );

  const openTierPreview = (tierDef: EvolvingFirstTopUpTierDef, canClaim: boolean, isClaimed: boolean, prevMissing: boolean) => {
    const items: BundlePreviewPayload['items'] = [
      { label: 'Ngọc Hồn Hoàng Đạo', quantity: `x${tierDef.rewardGems}`, rarity: 'mythic' },
      { label: 'Vàng Tinh Giới', quantity: `x${tierDef.rewardGold.toLocaleString('vi-VN')}`, rarity: 'epic' },
      { label: 'Cỏ Tinh Tú (Thú Cưỡi 3D)', quantity: `x${tierDef.rewardGrass}`, rarity: 'legendary' },
      { label: 'Vảy Rồng Cổ', quantity: `x${tierDef.rewardDragonScales}`, rarity: 'legendary' },
      { label: 'Vé Hộp Mù Hoàng Đạo', quantity: `x${tierDef.rewardBlindBoxTickets}`, rarity: 'mythic' },
      { label: 'Linh Ngọc Hoàng Kim Bậc II', quantity: `x${tierDef.rewardJadeT2}`, rarity: 'epic' },
      { label: 'Mảnh Thần Binh 3D', quantity: `x${tierDef.rewardMythicShards}`, rarity: 'legendary' },
    ];
    if (tierDef.unlockSteedId) {
      items.unshift({
        label: tierDef.unlockSteedId === 'galaxy_pegasus' ? 'Thú Cưỡi 3D: Thiên Mã Ngân Hà' : 'Thú Cưỡi 3D: Phượng Hoàng Nhật Thực',
        quantity: 'Mở Khóa Vĩnh Viễn',
        rarity: 'mythic',
      });
    }
    if (tierDef.unlockVipFrameId) {
      items.unshift({
        label:
          tierDef.unlockVipFrameId === 'vip_royal_gold'
            ? 'Khung Avatar Động: Hào Quang Hoàng Gia'
            : 'Khung Avatar Động: Vương Miện Kim Cương',
        quantity: 'Động 360°',
        rarity: 'mythic',
      });
    }

    onOpenBundlePreview({
      id: `w13_topup_${tierDef.id}`,
      title: tierDef.title,
      badge: tierDef.badge,
      subtitle: tierDef.subtitle,
      priceLabel: `${tierDef.costGems} Ngọc Hồn`,
      valueTag: tierDef.valueLabel,
      canAfford: canClaim,
      disabledReason: isClaimed
        ? 'Bạn đã nhận mốc tiến hóa này'
        : prevMissing
        ? 'Cần nhận mốc trước đó trước'
        : 'Không đủ Ngọc Hồn',
      items,
      confirmLabel: isClaimed ? 'Đã Nhận Mốc Này' : `Kích Hoạt (${tierDef.costGems} Ngọc)`,
      onConfirm: () => onClaimEvolvingTopUp(tierDef.tier),
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-5 bg-[#040611]/92 overflow-y-auto">
      <div className="cel-panel-ornate w-full max-w-4xl rounded-3xl p-4 sm:p-6 my-auto max-h-[92vh] overflow-y-auto a2-scroll a2-modal-enter">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/70 flex items-center justify-center shrink-0">
              <Gift className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-black text-white truncate">
                Lộ Trình Quà 7 Ngày &amp; Gói Nạp Đầu 3 Mốc Tiến Hóa
              </h2>
              <p className="text-xs text-slate-300 truncate">
                Hoàn thành mục tiêu 7 ngày nhận Thú Cưỡi 3D miễn phí · Bùng nổ đặc quyền Nạp Đầu x18 giá trị.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Sự Kiện 7 Ngày"
            className="a2-slate-btn w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Section Switcher */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setSection('carnival');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              section === 'carnival' ? 'a2-yellow-btn' : 'a2-slate-btn'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Lộ Trình Quà 7 Ngày ({totalPoints}/200đ)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setSection('first_topup');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              section === 'first_topup' ? 'a2-yellow-btn' : 'a2-slate-btn'
            }`}
          >
            <Crown className="w-3.5 h-3.5" />
            <span>Gói Nạp Đầu 3 Mốc Tiến Hóa ({topUpState.claimedTiers.length}/3)</span>
          </button>
        </div>

        {/* ================================================================
            SECTION 1: 7-DAY CARNIVAL ROADMAP
            ================================================================ */}
        {section === 'carnival' && (
          <div className="space-y-4">
            {/* Cumulative Progress Milestones */}
            <div className="rounded-2xl bg-[#090f22] border border-amber-400/40 p-4">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="font-display text-sm font-black text-amber-200">
                  Tiến Độ Tích Điểm 7 Ngày · Tặng Thú Cưỡi 3D Vĩnh Viễn
                </span>
                <span className="font-mono-nums text-xs font-black text-amber-300">
                  {totalPoints} / 200 Điểm
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-900 border border-slate-700 overflow-hidden mb-3">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 via-yellow-300 to-emerald-400 transition-transform origin-left"
                  style={{ width: `${Math.min(100, (totalPoints / 200) * 100)}%` }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {CARNIVAL_7DAY_MILESTONES.map((ms) => {
                  const claimed = carnival.claimedMilestones.includes(ms.pointsTarget);
                  const ready = !claimed && totalPoints >= ms.pointsTarget;
                  return (
                    <div
                      key={ms.pointsTarget}
                      className={`rounded-xl p-3 border flex flex-col justify-between gap-2 ${
                        ready
                          ? 'bg-emerald-950/40 border-emerald-400/65'
                          : ms.unlockSteedId
                          ? 'bg-amber-950/25 border-amber-400/45'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="text-[11px] font-mono-nums font-bold text-amber-300">
                          {ms.pointsTarget} Điểm
                        </div>
                        <div className="text-xs font-black text-white mt-0.5">{ms.title}</div>
                        <div className="text-[11px] text-slate-300 mt-1 tabular-nums">
                          +{ms.rewardGems} Ngọc · +{ms.rewardGrass} Cỏ · +{ms.rewardBlindBoxTickets} Vé Mù
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!ready}
                        onClick={() => onClaimCarnivalMilestone(ms.pointsTarget)}
                        className={`w-full py-1.5 rounded-lg text-xs font-black cursor-pointer ${
                          claimed
                            ? 'bg-slate-800 text-emerald-400 cursor-default'
                            : ready
                            ? 'a2-emerald-btn'
                            : 'bg-slate-900 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {claimed ? 'Đã Nhận' : ready ? 'Nhận Quà Mốc' : 'Chưa Đủ Điểm'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Day 1..7 Selector Bar */}
            <div className="grid grid-cols-7 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7].map((day) => {
                const tasksForDay = CARNIVAL_7DAY_TASKS.filter((t) => t.day === day);
                const hasClaimable = tasksForDay.some(
                  (t) => !carnival.claimedTaskIds.includes(t.id) && getCarnivalTaskProgress(save, t) >= t.target
                );
                const allClaimed =
                  tasksForDay.length > 0 && tasksForDay.every((t) => carnival.claimedTaskIds.includes(t.id));
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      setSelectedDay(day);
                    }}
                    className={`py-2 px-1 rounded-xl text-center border cursor-pointer transition-colors ${
                      selectedDay === day
                        ? 'bg-amber-400/20 border-amber-300 text-amber-200'
                        : 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:border-slate-500'
                    }`}
                  >
                    <div className="text-[11px] font-black whitespace-nowrap">Ngày {day}</div>
                    <div className="text-[10px] mt-0.5 font-bold">
                      {allClaimed ? (
                        <span className="text-emerald-400">Xong</span>
                      ) : hasClaimable ? (
                        <span className="text-amber-300">Nhận!</span>
                      ) : (
                        <span className="text-slate-500">Mở</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Tasks for Selected Day */}
            <div className="space-y-2.5">
              {dayTasks.map((task) => {
                const claimed = carnival.claimedTaskIds.includes(task.id);
                const prog = Math.min(task.target, getCarnivalTaskProgress(save, task));
                const ready = !claimed && prog >= task.target;
                return (
                  <div
                    key={task.id}
                    className={`rounded-2xl p-3.5 border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      ready
                        ? 'bg-emerald-950/35 border-emerald-400/60'
                        : 'bg-[#0b1126] border-slate-700/70'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs font-black text-white">
                        <span>{task.title}</span>
                        <span className="text-[11px] font-mono-nums text-amber-300">+{task.points} Điểm</span>
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">{task.desc}</div>
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300 mt-1.5 tabular-nums">
                        <span>Tiến độ: <strong className="text-sky-300">{prog}/{task.target}</strong></span>
                        <span aria-hidden="true">·</span>
                        <span>
                          Quà: +{task.rewardGems} Ngọc · +{task.rewardGold} Vàng
                          {task.rewardGrass ? ` · +${task.rewardGrass} Cỏ` : ''}
                          {task.rewardJadeT1 ? ` · +${task.rewardJadeT1} Ngọc Bậc I` : ''}
                          {task.rewardBlindBoxTickets ? ` · +${task.rewardBlindBoxTickets} Vé Mù` : ''}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!ready}
                      onClick={() => onClaimCarnivalTask(task.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap shrink-0 ${
                        claimed
                          ? 'bg-slate-800 text-emerald-400 cursor-default'
                          : ready
                          ? 'a2-emerald-btn'
                          : 'bg-slate-900 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {claimed ? 'Đã Nhận' : ready ? 'Nhận Ngay' : 'Chưa Đạt'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================
            SECTION 2: 3-TIER EVOLVING FIRST TOP-UP SHOWCASE
            ================================================================ */}
        {section === 'first_topup' && (
          <div className="space-y-4">
            <div className="relative rounded-2xl overflow-hidden border border-amber-400/50 min-h-[140px] flex items-end">
              {!imgErr ? (
                <img
                  src={astralMountsArt}
                  alt="Gói Nạp Đầu 3 Mốc Tiến Hóa"
                  referrerPolicy="no-referrer"
                  onError={() => setImgErr(true)}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-amber-950 via-indigo-950 to-slate-950" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050813] via-[#050813]/70 to-transparent" />
              <div className="relative z-10 w-full p-4 flex flex-wrap items-end justify-between gap-2">
                <div>
                  <div className="text-[11px] font-bold text-amber-300">
                    Đặc Quyền Nạp Đầu Tiến Hóa 3 Bậc · Nhận Thú Cưỡi 3D + Khung VIP Động + Hoàn Gấp 4 Lần Ngọc
                  </div>
                  <h3 className="font-display text-lg sm:text-xl font-black text-white">
                    Nạp Đầu Tiến Hóa Chí Tôn (x12 → x18 Giá Trị)
                  </h3>
                </div>
                <div className="text-xs font-mono-nums text-sky-300 bg-black/55 border border-sky-400/40 rounded-xl px-3 py-1.5 inline-flex items-center gap-1.5">
                  <SoulGemIcon className="w-3.5 h-3.5" />
                  <span>Hiện có: {save.gems.toLocaleString('vi-VN')} Ngọc</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {EVOLVING_FIRST_TOPUP_TIERS.map((tierDef) => {
                const isClaimed = topUpState.claimedTiers.includes(tierDef.tier);
                const prevMissing = tierDef.tier > 1 && !topUpState.claimedTiers.includes(tierDef.tier - 1);
                const canClaim = !isClaimed && !prevMissing && save.gems >= tierDef.costGems;

                return (
                  <div
                    key={tierDef.id}
                    className={`rounded-2xl p-4 border flex flex-col justify-between gap-3 ${
                      tierDef.tier === 3
                        ? 'bg-gradient-to-b from-amber-950/45 to-[#090e21] border-amber-300/75'
                        : 'bg-[#0b1126] border-amber-400/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-[11px] font-black text-amber-300 mb-1">
                        <span>{tierDef.badge}</span>
                        <span className="font-mono-nums">{tierDef.valueLabel}</span>
                      </div>
                      <h4 className="font-display text-base font-black text-white">{tierDef.title}</h4>
                      <p className="text-xs text-slate-300 mt-1">{tierDef.subtitle}</p>

                      <div className="mt-3 space-y-1.5 text-xs text-slate-200 tabular-nums border-t border-white/10 pt-2.5">
                        {tierDef.unlockSteedId && (
                          <div className="font-black text-amber-200 flex items-center gap-1.5">
                            <Star className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                            <span>
                              {tierDef.unlockSteedId === 'galaxy_pegasus'
                                ? 'Thú Cưỡi 3D: Thiên Mã Ngân Hà'
                                : 'Thú Cưỡi 3D: Phượng Hoàng Nhật Thực'}
                            </span>
                          </div>
                        )}
                        {tierDef.unlockVipFrameId && (
                          <div className="font-black text-fuchsia-200 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-fuchsia-300 shrink-0" />
                            <span>
                              {tierDef.unlockVipFrameId === 'vip_royal_gold'
                                ? 'Khung VIP Động Hoàng Gia'
                                : 'Khung VIP Động Kim Cương'}
                            </span>
                          </div>
                        )}
                        <div>Hoàn Ngọc: <strong className="text-sky-300">+{tierDef.rewardGems} Ngọc Hồn</strong></div>
                        <div>Nguyên liệu: +{tierDef.rewardGrass} Cỏ · +{tierDef.rewardDragonScales} Vảy Rồng</div>
                        <div>Hộp Mù &amp; Ngọc: +{tierDef.rewardBlindBoxTickets} Vé · +{tierDef.rewardJadeT2} Ngọc Bậc II</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => openTierPreview(tierDef, canClaim, isClaimed, prevMissing)}
                        className="a2-slate-btn px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Xem Quà</span>
                      </button>
                      <button
                        type="button"
                        disabled={!canClaim}
                        onClick={() => onClaimEvolvingTopUp(tierDef.tier)}
                        className={`flex-1 py-2 px-3 rounded-xl text-xs font-black cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap ${
                          isClaimed
                            ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-400/40 cursor-default'
                            : canClaim
                            ? 'a2-yellow-btn'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {isClaimed ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Đã Nhận</span>
                          </>
                        ) : prevMissing ? (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Cần Mốc {tierDef.tier - 1}</span>
                          </>
                        ) : (
                          <span>Kích Hoạt · {tierDef.costGems}💎</span>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

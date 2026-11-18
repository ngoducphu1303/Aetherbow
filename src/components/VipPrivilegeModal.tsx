import React, { useState } from 'react';
import { Check, Crown, Gift, Sparkles, X, Zap } from 'lucide-react';
import vipCardArt from '../assets/images/vip_celestial_card_art_1794977270863.jpg';
import { getTodayKey } from '../data/questsData';
import {
  STARTER_PACK_COST_GEMS,
  STARTER_PACK_REWARDS,
  VIP_DAILY_ESSENCE,
  VIP_DAILY_GEMS,
  VIP_DAILY_GOLD,
  VIP_DURATION_DAYS,
  VIP_MONTHLY_COST_GEMS,
  canClaimVipDaily,
  isVipActive,
  normalizeVip,
} from '../data/wave3Data';
import { SaveData } from '../types/game';
import { GoldCoinIcon, PetEssenceIcon, SoulGemIcon, StarDustIcon } from './GameIcons';

interface VipPrivilegeModalProps {
  save: SaveData;
  onActivateVip: () => void;
  onClaimVipDaily: () => void;
  onClaimStarterPack: () => void;
  onClose: () => void;
}

export const VipPrivilegeModal: React.FC<VipPrivilegeModalProps> = ({
  save,
  onActivateVip,
  onClaimVipDaily,
  onClaimStarterPack,
  onClose,
}) => {
  const [imgErr, setImgErr] = useState(false);
  const vip = normalizeVip(save.vip);
  const active = isVipActive(vip);
  const dailyReady = canClaimVipDaily(vip);
  const today = getTodayKey();

  const daysLeft = (() => {
    if (!active || !vip.activeUntilDate) return 0;
    const t1 = new Date(`${today}T00:00:00`).getTime();
    const t2 = new Date(`${vip.activeUntilDate}T00:00:00`).getTime();
    return Math.max(1, Math.round((t2 - t1) / 86400000) + 1);
  })();

  const canAffordVip = save.gems >= VIP_MONTHLY_COST_GEMS;
  const canAffordStarter = save.gems >= STARTER_PACK_COST_GEMS;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/90 overflow-y-auto">
      <div className="cel-panel-ornate w-full max-w-2xl rounded-3xl p-4 sm:p-6 my-auto max-h-[92vh] overflow-y-auto a2-modal-enter">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-300/60 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-black text-white truncate">
                Thẻ Tháng VIP &amp; Quà Khởi Nghiệp
              </h2>
              <p className="text-[11px] text-slate-300 truncate">
                Đặc quyền Tinh Giới mỗi ngày &amp; Gói Trang Bị [S] khởi đầu
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="a2-slate-btn w-9 h-9 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Hero Art Banner */}
        <div className="relative rounded-2xl overflow-hidden border border-amber-300/45 mb-4 bg-gradient-to-br from-[#1b1236] via-[#0d142c] to-[#2b1708]">
          {!imgErr && (
            <img
              src={vipCardArt}
              alt="Thẻ Tháng Đặc Quyền Tinh Giới"
              referrerPolicy="no-referrer"
              onError={() => setImgErr(true)}
              className="w-full h-36 sm:h-44 object-cover opacity-80"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#070b1a]/95 via-[#0b1024]/75 to-transparent p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-300">
                Đặc Quyền Tháng Hoàng Đạo · {VIP_DURATION_DAYS} Ngày
              </span>
              {active && (
                <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-300/60 text-[10px] font-black text-emerald-200 font-mono-nums whitespace-nowrap">
                  CÒN {daysLeft} NGÀY
                </span>
              )}
            </div>
            <div>
              <div className="font-display text-xl sm:text-2xl font-black text-white leading-tight">
                {active ? 'Hội Viên Hoàng Kim Đã Kích Hoạt' : 'Mở Khóa Thẻ Tháng Đặc Quyền'}
              </div>
              <p className="text-xs text-slate-200 mt-1 max-w-md">
                Nhận tiếp tế mỗi ngày + tăng tốc Battle Pass +25% XP và mở khóa +2 lượt Quét Nhanh Ải.
              </p>
            </div>
          </div>
        </div>

        {/* VIP Benefits Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          {/* Card 1: Daily Claim */}
          <div className="rounded-2xl bg-[#070b1a]/95 border border-amber-400/35 p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="text-xs font-black text-amber-200 uppercase tracking-wider mb-2">
                Tiếp Tế VIP Hằng Ngày
              </div>
              <div className="grid grid-cols-3 gap-2 text-center mb-3">
                <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2">
                  <div className="flex justify-center mb-1">
                    <GoldCoinIcon className="w-4 h-4" />
                  </div>
                  <div className="font-mono-nums text-xs font-black text-amber-300">
                    +{VIP_DAILY_GOLD}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold">Vàng/ngày</div>
                </div>
                <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2">
                  <div className="flex justify-center mb-1">
                    <SoulGemIcon className="w-4 h-4" />
                  </div>
                  <div className="font-mono-nums text-xs font-black text-purple-300">
                    +{VIP_DAILY_GEMS}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold">Ngọc/ngày</div>
                </div>
                <div className="rounded-xl bg-slate-900/90 border border-slate-800 p-2">
                  <div className="flex justify-center mb-1">
                    <PetEssenceIcon className="w-4 h-4" />
                  </div>
                  <div className="font-mono-nums text-xs font-black text-emerald-300">
                    +{VIP_DAILY_ESSENCE}
                  </div>
                  <div className="text-[10px] text-slate-400 font-bold">Tinh Chất</div>
                </div>
              </div>
              <ul className="space-y-1 text-[11px] text-slate-300 font-semibold">
                <li className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>+25% XP Battle Pass từ mọi trận đấu</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                  <span>Tăng giới hạn Quét Nhanh Ải lên 5 lượt/ngày</span>
                </li>
              </ul>
            </div>

            {active ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!dailyReady}
                  onClick={onClaimVipDaily}
                  className={`flex-1 py-2.5 px-3 rounded-xl font-black text-xs whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
                    dailyReady
                      ? 'a2-emerald-btn'
                      : 'bg-slate-800/80 border border-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{dailyReady ? 'Nhận Quà Hôm Nay' : 'Đã Nhận Hôm Nay'}</span>
                </button>
                <button
                  type="button"
                  disabled={!canAffordVip}
                  onClick={onActivateVip}
                  className="a2-slate-btn py-2.5 px-3 rounded-xl font-black text-xs whitespace-nowrap flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <span>Gia Hạn</span>
                  <SoulGemIcon className="w-3.5 h-3.5" />
                  <span className="font-mono-nums text-purple-200">{VIP_MONTHLY_COST_GEMS}</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                disabled={!canAffordVip}
                onClick={onActivateVip}
                className="a2-yellow-btn w-full py-2.5 px-4 rounded-xl font-black text-xs whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Crown className="w-4 h-4" />
                <span>Kích Hoạt 30 Ngày</span>
                <span className="flex items-center gap-1 font-mono-nums">
                  <SoulGemIcon className="w-3.5 h-3.5" />
                  {VIP_MONTHLY_COST_GEMS}
                </span>
              </button>
            )}
          </div>

          {/* Card 2: First-Milestone Starter Pack */}
          <div className="rounded-2xl bg-[#070b1a]/95 border border-purple-400/40 p-4 flex flex-col justify-between gap-3">
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-black text-purple-200 uppercase tracking-wider flex items-center gap-1.5">
                  <Gift className="w-3.5 h-3.5 text-amber-300" />
                  <span>Quà Khởi Nghiệp [S]</span>
                </span>
                <span className="text-[10px] font-black text-amber-300">GIÁ TRỊ ×4</span>
              </div>
              <p className="text-[11px] text-slate-300 mb-3">
                Gói trang bị khởi đầu siêu ưu đãi (chỉ mua 1 lần) giúp bứt phá lực chiến ngay lập tức:
              </p>
              <div className="space-y-1.5 text-xs font-bold">
                <div className="flex items-center justify-between rounded-xl bg-slate-900/90 border border-purple-400/30 px-3 py-1.5">
                  <span className="text-purple-200">1 Trang Bị [S] Sử Thi</span>
                  <span className="text-amber-300 text-[10px] font-black">ĐẢM BẢO S-TIER</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="rounded-lg bg-slate-900/90 border border-slate-800 py-1.5">
                    <div className="font-mono-nums text-amber-300 font-black flex items-center justify-center gap-1">
                      <GoldCoinIcon className="w-3 h-3" />+{STARTER_PACK_REWARDS.gold}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-900/90 border border-slate-800 py-1.5">
                    <div className="font-mono-nums text-emerald-300 font-black flex items-center justify-center gap-1">
                      <PetEssenceIcon className="w-3 h-3" />+{STARTER_PACK_REWARDS.essence}
                    </div>
                  </div>
                  <div className="rounded-lg bg-slate-900/90 border border-slate-800 py-1.5">
                    <div className="font-mono-nums text-sky-300 font-black flex items-center justify-center gap-1">
                      <StarDustIcon className="w-3 h-3" />+{STARTER_PACK_REWARDS.starDust}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={vip.starterPackClaimed || !canAffordStarter}
              onClick={onClaimStarterPack}
              className={`w-full py-2.5 px-4 rounded-xl font-black text-xs whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer ${
                vip.starterPackClaimed
                  ? 'bg-slate-800/80 border border-slate-700 text-slate-400 cursor-not-allowed'
                  : 'a2-purple-btn disabled:opacity-50 disabled:cursor-not-allowed'
              }`}
            >
              {vip.starterPackClaimed ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Đã Sở Hữu Gói Khởi Nghiệp</span>
                </>
              ) : (
                <>
                  <Gift className="w-4 h-4" />
                  <span>Mở Gói Ngay</span>
                  <span className="flex items-center gap-1 font-mono-nums">
                    <SoulGemIcon className="w-3.5 h-3.5" />
                    {STARTER_PACK_COST_GEMS}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

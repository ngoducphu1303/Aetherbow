import React, { useState } from 'react';
import { Check, Crown, Gem, Gift, ShoppingBag, Sparkles, X } from 'lucide-react';
import nightMarketBanner from '../assets/images/night_market_bazaar_1794983174708.jpg';
import { soundEngine } from '../audio/soundEngine';
import { getTodayKey } from '../data/questsData';
import {
  CUMULATIVE_SPEND_MILESTONES,
  getDailyNightMarketOffers,
  normalizeNightMarket,
} from '../data/wave5Data';
import { NightMarketOffer, SaveData } from '../types/game';
import { GoldCoinIcon, SoulGemIcon, StarDustIcon } from './GameIcons';

interface NightMarketModalProps {
  save: SaveData;
  onBuyOffer: (offer: NightMarketOffer) => void;
  onClaimSpendMilestone: (gemsThreshold: number) => void;
  onClose: () => void;
}

export const NightMarketModal: React.FC<NightMarketModalProps> = ({
  save,
  onBuyOffer,
  onClaimSpendMilestone,
  onClose,
}) => {
  const [imgErr, setImgErr] = useState(false);
  const today = getTodayKey();
  const nm = normalizeNightMarket(save.nightMarket);
  const dailyOffers = getDailyNightMarketOffers(today);
  const maxSpendMilestone =
    CUMULATIVE_SPEND_MILESTONES[CUMULATIVE_SPEND_MILESTONES.length - 1]?.gems ?? 1500;
  const spendProgressPct = Math.min(100, Math.round((nm.totalGemsSpent / maxSpendMilestone) * 100));

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/90 overflow-y-auto">
      <div className="cel-panel-ornate w-full max-w-4xl rounded-3xl p-4 sm:p-6 my-auto max-h-[92vh] overflow-y-auto a2-scroll a2-modal-enter">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-300/60 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-black text-white truncate">
                Chợ Đêm Hoàng Đạo &amp; Quà Tích Lũy Tiêu Ngọc
              </h2>
              <p className="text-[11px] text-slate-300 truncate">
                4 gian hàng ưu đãi xoay vòng mỗi ngày · Chi tiêu Ngọc Hồn ở mọi tính năng đều tích lũy quà mốc!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#070b1a] border border-amber-400/35 text-xs font-mono-nums font-black text-amber-200">
              <GoldCoinIcon className="w-3.5 h-3.5" />
              <span>{save.gold}</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#070b1a] border border-purple-400/40 text-xs font-mono-nums font-black text-purple-200">
              <SoulGemIcon className="w-3.5 h-3.5" />
              <span>{save.gems}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng Chợ Đêm"
              className="a2-slate-btn w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Hero Art Banner */}
        <div className="relative rounded-2xl overflow-hidden border border-purple-400/40 mb-4 bg-gradient-to-br from-[#120d2a] to-[#081026]">
          {!imgErr && (
            <img
              src={nightMarketBanner}
              alt="Chợ Đêm Hoàng Đạo"
              referrerPolicy="no-referrer"
              onError={() => setImgErr(true)}
              className="w-full h-32 sm:h-36 object-cover opacity-80"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#060916]/95 via-[#0c1028]/70 to-transparent p-4 flex flex-col justify-end">
            <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phiên Chợ Huyền Bí · Làm Mới Hằng Ngày</span>
            </div>
            <div className="font-display text-lg sm:text-xl font-black text-white mt-0.5">
              Giảm Giá Tới 60% Bảo Thạch, Vé Vận Mệnh &amp; Thánh Vật [S]
            </div>
          </div>
        </div>

        {/* 4 Daily Rotating Deals */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="font-display text-sm font-black text-amber-200 uppercase tracking-wider flex items-center gap-1.5">
              <Gem className="w-4 h-4 text-purple-300" />
              <span>Gian Hàng Chợ Đêm Hôm Nay</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-semibold">
              Ngày phiên: {today}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {dailyOffers.map((offer) => {
              const bought = nm.purchasedCounts[offer.id] ?? 0;
              const soldOut = bought >= offer.maxPurchases;
              const canAfford =
                offer.currency === 'gems' ? save.gems >= offer.price : save.gold >= offer.price;

              return (
                <div
                  key={offer.id}
                  className={`rounded-2xl p-3.5 border flex flex-col justify-between gap-3 ${
                    soldOut
                      ? 'bg-[#060915]/80 border-slate-800 opacity-75'
                      : 'bg-[#070b1a]/95 border-amber-400/30 hover:border-amber-300/65 transition-colors'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-display text-sm font-black text-white truncate">
                        {offer.title}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-400/50 text-[10px] font-black text-rose-200 whitespace-nowrap">
                        {offer.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-snug">{offer.subtitle}</p>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2 text-xs font-mono-nums font-black">
                        <span className="text-slate-500 line-through text-[11px]">
                          {offer.originalPrice}
                        </span>
                        <span
                          className={`flex items-center gap-1 ${
                            offer.currency === 'gems' ? 'text-purple-300' : 'text-amber-300'
                          }`}
                        >
                          {offer.currency === 'gems' ? (
                            <SoulGemIcon className="w-3.5 h-3.5" />
                          ) : (
                            <GoldCoinIcon className="w-3.5 h-3.5" />
                          )}
                          <span>{offer.price}</span>
                        </span>
                      </div>
                      <span className="text-[10px] font-mono-nums text-slate-400 mt-0.5">
                        Đã mua: {bought}/{offer.maxPurchases}
                      </span>
                    </div>

                    <button
                      type="button"
                      disabled={soldOut || !canAfford}
                      onClick={() => {
                        soundEngine.playUiClick(1.06);
                        onBuyOffer(offer);
                      }}
                      className={`px-4 py-2 rounded-xl font-black text-xs whitespace-nowrap cursor-pointer ${
                        soldOut
                          ? 'bg-slate-900 border border-slate-700 text-slate-400 cursor-not-allowed'
                          : canAfford
                          ? offer.currency === 'gems'
                            ? 'a2-purple-btn'
                            : 'a2-yellow-btn'
                          : 'bg-slate-900 border border-slate-700 text-rose-300/70 cursor-not-allowed'
                      }`}
                    >
                      {soldOut ? 'Hết Hàng' : canAfford ? 'Mua Ngay' : 'Thiếu Tiền'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cumulative Gem Spend Milestones */}
        <div className="cel-panel rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2">
              <Gift className="w-4 h-4 text-amber-300" />
              <h3 className="font-display text-sm font-black text-white">
                Quà Tích Lũy Tiêu Dùng Ngọc Hồn
              </h3>
            </div>
            <div className="text-xs font-mono-nums font-black text-purple-300 flex items-center gap-1.5">
              <SoulGemIcon className="w-3.5 h-3.5" />
              <span>
                Đã tiêu: {nm.totalGemsSpent.toLocaleString('vi-VN')} /{' '}
                {maxSpendMilestone.toLocaleString('vi-VN')} Ngọc
              </span>
            </div>
          </div>

          <div className="h-2.5 w-full rounded-full bg-[#050814] border border-purple-400/25 overflow-hidden mb-3.5">
            <div
              className="h-full bg-gradient-to-r from-purple-500 via-fuchsia-400 to-amber-300 transition-all duration-300"
              style={{ width: `${spendProgressPct}%` }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
            {CUMULATIVE_SPEND_MILESTONES.map((ms) => {
              const claimed = nm.claimedSpendMilestones.includes(ms.gems);
              const reached = nm.totalGemsSpent >= ms.gems;
              const ready = reached && !claimed;

              return (
                <div
                  key={ms.gems}
                  className={`rounded-xl p-2.5 border flex flex-col justify-between gap-2 ${
                    claimed
                      ? 'bg-[#08151d]/90 border-emerald-500/40'
                      : ready
                      ? 'bg-gradient-to-b from-[#2b1f0f] to-[#12162c] border-amber-300 shadow-lg'
                      : 'bg-[#070b1a] border-slate-800'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between text-[11px] font-mono-nums font-black">
                      <span className="text-purple-300">{ms.gems} Ngọc</span>
                      {ms.titleUnlock && <Crown className="w-3.5 h-3.5 text-amber-300" />}
                    </div>
                    <div className="text-[11px] font-bold text-white leading-snug mt-1">
                      {ms.rewardLabel}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-[10px] font-mono-nums text-slate-300 mt-1">
                      <span className="text-amber-300">+{ms.gold}V</span>
                      <span className="text-sky-300 flex items-center gap-0.5">
                        <StarDustIcon className="w-3 h-3" />
                        {ms.starDust}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={!ready}
                    onClick={() => {
                      soundEngine.playVictory();
                      onClaimSpendMilestone(ms.gems);
                    }}
                    className={`w-full py-1.5 rounded-lg text-[10px] font-black flex items-center justify-center gap-1 cursor-pointer ${
                      claimed
                        ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 cursor-default'
                        : ready
                        ? 'a2-yellow-btn'
                        : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {claimed && <Check className="w-3 h-3" />}
                    <span>{claimed ? 'Đã Nhận' : ready ? 'Nhận Quà' : 'Chưa Đạt'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

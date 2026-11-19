import React, { useState } from 'react';
import { Check, Crown, Lock, ShoppingBag, Sparkles, X } from 'lucide-react';
import seasonTreasuryArt from '../assets/images/royal_season_treasury_1795058108382.jpg';
import { soundEngine } from '../audio/soundEngine';
import {
  BATTLE_PASS_MAX_TIER,
  BATTLE_PASS_PREMIUM_GEM_COST,
  BATTLE_PASS_TIERS,
  countClaimableBattlePass,
  getBattlePassLevelInfo,
  normalizeBattlePass,
} from '../data/liveOpsData';
import {
  MYTHIC_SHARD_OFFERS,
  SEASON_IV_TITLE,
  normalizeMythicShardShop,
} from '../data/wave14Data';
import { SaveData } from '../types/game';
import { GoldCoinIcon, SoulGemIcon } from './GameIcons';

interface BattlePassModalProps {
  save: SaveData;
  onClose: () => void;
  onUnlockPremium: () => void;
  onClaimTier: (level: number, track: 'free' | 'premium') => void;
  onClaimAll: () => void;
  onRedeemMythicShardOffer?: (offerId: string) => void;
}

export const BattlePassModal: React.FC<BattlePassModalProps> = ({
  save,
  onClose,
  onUnlockPremium,
  onClaimTier,
  onClaimAll,
  onRedeemMythicShardOffer,
}) => {
  const [bannerImgFailed, setBannerImgFailed] = useState(false);
  const [activeTab, setActiveTab] = useState<'pass' | 'shard_shop'>('pass');
  const bp = normalizeBattlePass(save.battlePass);
  const shardShop = normalizeMythicShardShop(save.mythicShardShop);
  const mythicShards = save.mythicShards ?? 0;
  const { level, currentTierXp, xpPerTier, isMax } = getBattlePassLevelInfo(bp.xp);
  const claimableCount = countClaimableBattlePass(save);
  const canUnlockPremium = !bp.premiumUnlocked && save.gems >= BATTLE_PASS_PREMIUM_GEM_COST;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/90">
      <div className="cel-panel-ornate w-full max-w-3xl max-h-[88vh] rounded-3xl overflow-hidden flex flex-col a2-modal-enter">
        {/* Top Seasonal Key Art Banner */}
        <div className="relative p-4 sm:p-5 border-b border-amber-400/30 bg-[#080d1f] overflow-hidden shrink-0">
          {!bannerImgFailed && (
            <img
              src={seasonTreasuryArt}
              alt="Sổ Chiến Lệnh Mùa IV & Kho Đổi Mảnh Thần Thoại"
              referrerPolicy="no-referrer"
              onError={() => setBannerImgFailed(true)}
              className="absolute inset-0 w-full h-full object-cover opacity-40"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-[#070b1a]/95 via-[#0b122b]/82 to-[#070b1a]/92 pointer-events-none" />

          <div className="relative z-10 flex items-start justify-between gap-3">
            <div>
              <div className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-300">
                Sổ Chiến Lệnh Mùa Giải &amp; Kho Mảnh Thần Thoại
              </div>
              <h2 className="font-display text-lg sm:text-2xl font-black text-white mt-0.5">
                {SEASON_IV_TITLE}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                Vượt phòng, Không Chiến 3D và mở Rương tích XP Chiến Lệnh &amp; Mảnh Thần Thoại đổi Cánh 3D, Danh Hiệu 3D và Rương [S].
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3 py-1.5 rounded-xl bg-[#070b1a]/95 border border-fuchsia-400/45 flex items-center gap-1.5 text-xs font-mono-nums font-black text-fuchsia-200 whitespace-nowrap">
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-300 shrink-0" />
                <span>{mythicShards} Mảnh Thần</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(0.9);
                  onClose();
                }}
                aria-label="Đóng Sổ Chiến Lệnh"
                className="cel-panel w-9 h-9 rounded-xl flex items-center justify-center text-slate-200 hover:text-white cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Season Progress & Premium Action Row */}
          <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-[220px]">
              <div className="hv2-lv w-11 h-11 rounded-2xl flex flex-col items-center justify-center shrink-0">
                <span className="text-[9px] font-black leading-none">CẤP</span>
                <span className="font-mono-nums text-sm font-black leading-tight">{level}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-amber-200">
                    {isMax ? 'Đạt Cấp Tối Đa 20/20' : `Tiến trình cấp ${level}/${BATTLE_PASS_MAX_TIER}`}
                  </span>
                  <span className="font-mono-nums text-slate-300">
                    {currentTierXp}/{xpPerTier} XP
                  </span>
                </div>
                <div className="h-2.5 w-full rounded-full bg-slate-950/90 border border-amber-400/30 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 via-yellow-300 to-emerald-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, (currentTierXp / xpPerTier) * 100)}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {claimableCount > 0 && activeTab === 'pass' && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(1.1);
                    onClaimAll();
                  }}
                  className="a2-emerald-btn px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Nhận Tất Cả ({claimableCount})</span>
                </button>
              )}

              {bp.premiumUnlocked ? (
                <div className="px-3.5 py-2.5 rounded-xl bg-amber-400/15 border border-amber-300/60 text-xs font-black text-amber-200 flex items-center gap-1.5 whitespace-nowrap">
                  <Crown className="w-4 h-4 text-amber-300" />
                  <span>Đã Kích Hoạt Hoàng Kim</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={!canUnlockPremium}
                  onClick={() => {
                    soundEngine.playUiClick(1.15);
                    onUnlockPremium();
                  }}
                  className={`px-3.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                    canUnlockPremium
                      ? 'a2-yellow-btn'
                      : 'bg-slate-900 border border-slate-700 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <Crown className="w-4 h-4" />
                  <span>Mở Hoàng Kim · {BATTLE_PASS_PREMIUM_GEM_COST}</span>
                  <SoulGemIcon className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 2-Tab Switcher */}
          <div className="relative z-10 mt-3.5 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setActiveTab('pass');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'pass' ? 'a2-yellow-btn' : 'a2-slate-btn text-slate-300'
              }`}
            >
              <Crown className="w-4 h-4 shrink-0" />
              <span>Lộ Trình 20 Cấp Mùa IV</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setActiveTab('shard_shop');
              }}
              className={`py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                activeTab === 'shard_shop' ? 'a2-purple-btn' : 'a2-slate-btn text-slate-300'
              }`}
            >
              <ShoppingBag className="w-4 h-4 shrink-0" />
              <span>Kho Đổi Mảnh Thần Thoại ({mythicShards})</span>
            </button>
          </div>
        </div>

        {activeTab === 'pass' ? (
          <>
            {/* Column Header */}
            <div className="grid grid-cols-[64px_1fr_1fr] gap-2 px-4 sm:px-5 py-2.5 bg-[#060a17] border-b border-amber-400/20 text-[11px] font-black uppercase tracking-wider text-slate-300 shrink-0">
              <div className="text-center">Cấp</div>
              <div>Nhánh Miễn Phí</div>
              <div className="text-amber-300 flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" />
                <span>Nhánh Tinh Tú Hoàng Kim</span>
              </div>
            </div>

            {/* 20-Tier Tracks List */}
            <div className="flex-1 overflow-y-auto a2-scroll p-3 sm:p-4 space-y-2">
              {BATTLE_PASS_TIERS.map((tier) => {
                const reached = isMax ? true : level >= tier.level;
                const freeClaimed = bp.claimedFree.includes(tier.level);
                const premClaimed = bp.claimedPremium.includes(tier.level);
                const isMilestone = tier.level % 5 === 0 || tier.level === 20;

                return (
                  <div
                    key={tier.level}
                    className={`grid grid-cols-[64px_1fr_1fr] gap-2 items-center rounded-2xl p-2 sm:p-2.5 border ${
                      isMilestone
                        ? 'bg-[#10193a]/95 border-amber-300/45'
                        : 'bg-[#090e22]/90 border-amber-400/20'
                    }`}
                  >
                    {/* Level Badge */}
                    <div className="flex flex-col items-center justify-center">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono-nums text-sm font-black border ${
                          reached
                            ? 'bg-amber-400/20 border-amber-300 text-amber-200'
                            : 'bg-slate-900 border-slate-700 text-slate-500'
                        }`}
                      >
                        {tier.level}
                      </div>
                    </div>

                    {/* Free Track Cell */}
                    <button
                      type="button"
                      disabled={!reached || freeClaimed}
                      onClick={() => onClaimTier(tier.level, 'free')}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                        freeClaimed
                          ? 'bg-slate-900/60 border-slate-800 text-slate-500'
                          : reached
                          ? 'bg-[#122142] hover:bg-[#192d59] border-emerald-400/60 text-white cursor-pointer'
                          : 'bg-[#070b1a] border-slate-800/80 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {tier.free.kind === 'gold' ? (
                          <GoldCoinIcon className="w-4 h-4 shrink-0" />
                        ) : tier.free.kind === 'gems' ? (
                          <SoulGemIcon className="w-4 h-4 shrink-0" />
                        ) : (
                          <Sparkles className="w-4 h-4 text-purple-300 shrink-0" />
                        )}
                        <span className="text-xs font-bold truncate">{tier.free.label}</span>
                      </div>
                      <span className="text-[10px] font-black shrink-0 whitespace-nowrap">
                        {freeClaimed ? (
                          <span className="text-emerald-400 flex items-center gap-0.5">
                            <Check className="w-3.5 h-3.5" /> Đã nhận
                          </span>
                        ) : reached ? (
                          <span className="text-emerald-300">Nhận</span>
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-slate-600" />
                        )}
                      </span>
                    </button>

                    {/* Premium Track Cell */}
                    <button
                      type="button"
                      disabled={!reached || !bp.premiumUnlocked || premClaimed}
                      onClick={() => onClaimTier(tier.level, 'premium')}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left transition-colors ${
                        premClaimed
                          ? 'bg-slate-900/60 border-slate-800 text-slate-500'
                          : reached && bp.premiumUnlocked
                          ? 'bg-gradient-to-r from-[#2c1a06] to-[#1d1435] hover:brightness-110 border-amber-300/75 text-amber-100 cursor-pointer'
                          : 'bg-[#080c1c] border-amber-400/20 text-slate-400'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {tier.premium.kind === 'gold' ? (
                          <GoldCoinIcon className="w-4 h-4 shrink-0" />
                        ) : tier.premium.kind === 'gems' ? (
                          <SoulGemIcon className="w-4 h-4 shrink-0" />
                        ) : (
                          <Crown className="w-4 h-4 text-amber-300 shrink-0" />
                        )}
                        <span className="text-xs font-bold truncate">{tier.premium.label}</span>
                      </div>
                      <span className="text-[10px] font-black shrink-0 whitespace-nowrap">
                        {premClaimed ? (
                          <span className="text-amber-300 flex items-center gap-0.5">
                            <Check className="w-3.5 h-3.5" /> Đã nhận
                          </span>
                        ) : !bp.premiumUnlocked ? (
                          <Lock className="w-3.5 h-3.5 text-amber-400/50" />
                        ) : reached ? (
                          <span className="text-amber-300">Nhận</span>
                        ) : (
                          <Lock className="w-3.5 h-3.5 text-slate-600" />
                        )}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <div className="flex-1 overflow-y-auto a2-scroll p-4 sm:p-5 space-y-3">
            <div className="cel-panel rounded-2xl p-3.5 border-fuchsia-400/35 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-fuchsia-300">
                  Kho Đổi Mảnh Thần Thoại Độc Quyền Mùa IV
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Kiếm Mảnh Thần Thoại từ Không Chiến 3D, Bàn Cờ Tinh Tú và Rương Boss Bang Hàng Ngày để đổi bảo vật giới hạn.
                </p>
              </div>
              <div className="px-3.5 py-2 rounded-xl bg-fuchsia-500/15 border border-fuchsia-400/50 font-mono-nums text-sm font-black text-fuchsia-200 whitespace-nowrap">
                Đang có: {mythicShards} Mảnh
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MYTHIC_SHARD_OFFERS.map((offer) => {
                const bought = shardShop.purchasedCounts[offer.id] ?? 0;
                const soldOut = bought >= offer.maxPurchases;
                const alreadyOwnedWing =
                  offer.rewardKind === 'celestial_wing' &&
                  offer.targetWingId &&
                  (save.unlockedCelestialWings ?? []).includes(offer.targetWingId);
                const alreadyOwnedTitle =
                  offer.rewardKind === 'royal_title' &&
                  offer.targetTitleId &&
                  (save.unlockedRoyal3DTitles ?? []).includes(offer.targetTitleId);
                const locked = soldOut || Boolean(alreadyOwnedWing) || Boolean(alreadyOwnedTitle);
                const canAfford = !locked && mythicShards >= offer.costShards;

                return (
                  <div
                    key={offer.id}
                    className={`rounded-2xl p-4 border flex flex-col justify-between gap-3 ${
                      locked ? 'bg-[#070b18]/75 border-slate-800' : 'cel-panel-ornate'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                          {offer.badge}
                        </span>
                        <span className="font-mono-nums text-[11px] font-bold text-slate-400">
                          Đã đổi {bought}/{offer.maxPurchases}
                        </span>
                      </div>
                      <h3 className="font-display text-sm font-black text-white mt-1">
                        {offer.title}
                      </h3>
                      <p className="text-xs text-slate-300 mt-1">{offer.subtitle}</p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-amber-400/15">
                      <span className={`font-mono-nums text-xs font-black flex items-center gap-1 ${mythicShards >= offer.costShards ? 'text-fuchsia-200' : 'text-rose-400'}`}>
                        <Sparkles className="w-3.5 h-3.5 text-fuchsia-300 shrink-0" />
                        {offer.costShards} Mảnh Thần
                      </span>

                      {locked ? (
                        <span className="text-xs font-black text-emerald-400 flex items-center gap-1 whitespace-nowrap">
                          <Check className="w-3.5 h-3.5" />
                          {alreadyOwnedWing || alreadyOwnedTitle ? 'Đã Sở Hữu' : 'Hết Lượt Đổi'}
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={!canAfford || !onRedeemMythicShardOffer}
                          onClick={() => {
                            soundEngine.playAchievement();
                            onRedeemMythicShardOffer?.(offer.id);
                          }}
                          className="a2-yellow-btn px-4 py-2 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Đổi Ngay
                        </button>
                      )}
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


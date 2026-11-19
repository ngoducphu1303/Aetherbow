import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  Crown,
  Flame,
  Flag,
  Gift,
  Lock,
  RefreshCw,
  Shield,
  Sparkles,
  Swords,
  Unlock,
  X,
} from 'lucide-react';
import {
  ALTAR_BLESSING_DEFS,
  computeAltarBonuses,
  formatGoldenStatValue,
  getAltarUpgradeCost,
  getMythicWeaponBonuses,
  getReforgeCost,
  getWarBannerStats,
  getWarBannerUpgradeCost,
  MYTHIC_WEAPON_MAX_TIER,
  MYTHIC_WEAPON_TIERS,
  normalizeBlessingAltar,
  normalizeMythicWeapon,
  normalizeTreasureWheel,
  TREASURE_WHEEL_MILESTONES,
  TREASURE_WHEEL_PITY_MAX,
  TREASURE_WHEEL_SLOTS,
  TREASURE_WHEEL_SPIN_COST_1,
  TREASURE_WHEEL_SPIN_COST_5,
  WAR_BANNER_DEFS,
  WAR_BANNER_MAX_LEVEL,
} from '../data/wave12Data';
import {
  AltarBlessingId,
  GoldenStatTier,
  SaveData,
  TreasureWheelSlotDef,
  WarBannerId,
} from '../types/game';
import { GoldCoinIcon, SoulGemIcon } from './GameIcons';
import mythicForgeImg from '../assets/images/mythic_weapon_forge_1795054759481.jpg';
import treasureWheelImg from '../assets/images/zodiac_treasure_wheel_1795054761720.jpg';
import blessingAltarImg from '../assets/images/blessing_altar_banner_1795054761249.jpg';

export type Wave12SanctumTab = 'mythic' | 'wheel' | 'altar';

interface Wave12SanctumModalProps {
  save: SaveData;
  initialTab: Wave12SanctumTab;
  onClose: () => void;
  onUpgradeMythicWeapon: () => void;
  onToggleGoldenStatLock: (slotIndex: number) => void;
  onReforgeGoldenStats: () => void;
  onSpinTreasureWheel: (count: 1 | 5) => TreasureWheelSlotDef[] | null;
  onClaimWheelMilestone: (spins: number) => void;
  onUpgradeAltar: (altarId: AltarBlessingId) => void;
  onUnlockOrEquipWarBanner: (bannerId: WarBannerId) => void;
  onUpgradeWarBanner: (bannerId: WarBannerId) => void;
}

const GOLDEN_TIER_META: Record<
  GoldenStatTier,
  { badge: string; textClass: string; borderClass: string; bgClass: string }
> = {
  rare: {
    badge: 'HIẾM',
    textClass: 'text-sky-300',
    borderClass: 'border-sky-400/40',
    bgClass: 'bg-sky-500/10',
  },
  epic: {
    badge: 'SỬ THI',
    textClass: 'text-purple-300',
    borderClass: 'border-purple-400/50',
    bgClass: 'bg-purple-500/12',
  },
  legendary: {
    badge: 'HOÀNG KIM',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-400/75',
    bgClass: 'bg-amber-500/15',
  },
  mythic: {
    badge: 'CHÍ TÔN',
    textClass: 'text-rose-200',
    borderClass: 'border-rose-400/85',
    bgClass: 'bg-gradient-to-r from-rose-500/20 via-amber-500/20 to-yellow-400/15',
  },
};

const WHEEL_RARITY_STYLE: Record<
  TreasureWheelSlotDef['rarity'],
  { border: string; badge: string; bg: string; text: string }
> = {
  rare: {
    border: 'border-sky-400/40',
    badge: 'bg-sky-500/20 text-sky-200',
    bg: 'bg-[#0a132b]',
    text: 'text-sky-100',
  },
  epic: {
    border: 'border-purple-400/55',
    badge: 'bg-purple-500/25 text-purple-200',
    bg: 'bg-[#140e2e]',
    text: 'text-purple-100',
  },
  legendary: {
    border: 'border-amber-400/70',
    badge: 'bg-amber-500/25 text-amber-200',
    bg: 'bg-[#211509]',
    text: 'text-amber-100',
  },
  mythic: {
    border: 'border-yellow-300 shadow-[0_0_20px_rgba(250,204,21,0.35)]',
    badge: 'bg-gradient-to-r from-amber-400 to-rose-400 text-slate-950',
    bg: 'bg-gradient-to-br from-[#351708] via-[#270b22] to-[#1a1333]',
    text: 'text-yellow-200',
  },
};

export const Wave12SanctumModal: React.FC<Wave12SanctumModalProps> = ({
  save,
  initialTab,
  onClose,
  onUpgradeMythicWeapon,
  onToggleGoldenStatLock,
  onReforgeGoldenStats,
  onSpinTreasureWheel,
  onClaimWheelMilestone,
  onUpgradeAltar,
  onUnlockOrEquipWarBanner,
  onUpgradeWarBanner,
}) => {
  const [tab, setTab] = useState<Wave12SanctumTab>(initialTab);
  const [imgErr, setImgErr] = useState<Record<string, boolean>>({});
  const [isSpinning, setIsSpinning] = useState(false);
  const [activeWheelIndex, setActiveWheelIndex] = useState<number>(0);
  const [recentSpinResults, setRecentSpinResults] = useState<TreasureWheelSlotDef[]>([]);
  const spinTimerRef = useRef<number | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    return () => {
      if (spinTimerRef.current !== null) {
        window.clearTimeout(spinTimerRef.current);
      }
    };
  }, []);

  const mythic = normalizeMythicWeapon(save.mythicWeapon);
  const curTierDef = MYTHIC_WEAPON_TIERS[mythic.tier] ?? MYTHIC_WEAPON_TIERS[0];
  const nextTierDef =
    mythic.tier < MYTHIC_WEAPON_MAX_TIER ? MYTHIC_WEAPON_TIERS[mythic.tier + 1] : null;
  const mythicTotalBonuses = getMythicWeaponBonuses(mythic);
  const lockedCount = mythic.goldenStats.filter((s) => s.locked).length;
  const reforgeCost = getReforgeCost(lockedCount);

  const reforgeStones = save.reforgeStones ?? 0;
  const mythicShards = save.mythicShards ?? 0;
  const warCrests = save.warCrests ?? 0;

  const canUpgradeMythic = Boolean(
    nextTierDef && mythicShards >= nextTierDef.shardCost && save.gold >= nextTierDef.goldCost
  );
  const canReforge =
    lockedCount < 3 && reforgeStones >= reforgeCost.reforgeStones && save.gold >= reforgeCost.gold;

  const wheel = normalizeTreasureWheel(save.treasureWheel);
  const claimableWheelMilestones = TREASURE_WHEEL_MILESTONES.filter(
    (m) => wheel.totalSpins >= m.spins && !wheel.claimedMilestoneSpins.includes(m.spins)
  ).length;

  const altar = normalizeBlessingAltar(save.blessingAltar);
  const altarBonuses = computeAltarBonuses(altar);
  const unlockedBanners = save.unlockedWarBanners ?? [];
  const bannerLevels = save.warBannerLevels ?? {};
  const equippedBannerId = save.equippedWarBannerId ?? null;

  const handleTriggerSpin = (count: 1 | 5) => {
    if (isSpinning) return;
    const results = onSpinTreasureWheel(count);
    if (!results || results.length === 0) return;
    const targetSlot = results[results.length - 1];
    setIsSpinning(true);
    setRecentSpinResults([]);

    const totalSteps = 14 + ((targetSlot.index - activeWheelIndex + 12) % 12);
    let step = 0;
    const startIdx = activeWheelIndex;

    const tick = () => {
      step += 1;
      setActiveWheelIndex((startIdx + step) % 12);
      if (step < totalSteps) {
        const delay = step > totalSteps - 5 ? 95 + (step - (totalSteps - 5)) * 38 : 48;
        spinTimerRef.current = window.setTimeout(tick, delay);
      } else {
        setIsSpinning(false);
        setRecentSpinResults(results);
      }
    };
    tick();
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center p-2.5 sm:p-4 bg-[#040611]/92 overflow-y-auto">
      <div className="cel-panel-ornate w-full max-w-4xl rounded-3xl overflow-hidden my-auto max-h-[94vh] flex flex-col a2-modal-enter">
        {/* Top Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#080d22] border-b border-amber-400/30 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-slate-950 shrink-0 shadow-lg">
              <Crown className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
                Thánh Điện Hoàng Kim · Thần Binh &amp; Chiến Kỳ 3D
              </div>
              <h2 className="font-display text-base sm:text-lg font-black text-white truncate">
                {tab === 'mythic'
                  ? 'Thần Binh Thức Tỉnh 3D & Đúc Chỉ Số Hoàng Kim'
                  : tab === 'wheel'
                  ? 'Vòng Quay Kho Báu Hoàng Đạo (Bảo Hiểm 10 Lượt)'
                  : 'Tế Đàn Chúc Phúc & Cờ Hiệu Chiến Trận 3D'}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#050816] border border-amber-400/25 text-[11px] font-mono-nums font-black">
              <span className="flex items-center gap-1 text-amber-300" title="Vàng">
                <GoldCoinIcon className="w-3.5 h-3.5" />
                {save.gold.toLocaleString('vi-VN')}
              </span>
              <span className="flex items-center gap-1 text-purple-300" title="Ngọc Hồn">
                <SoulGemIcon className="w-3.5 h-3.5" />
                {save.gems.toLocaleString('vi-VN')}
              </span>
              <span className="text-yellow-200" title="Mảnh Thần Binh">
                ⚔ {mythicShards}
              </span>
              <span className="text-orange-300" title="Đá Đúc Hoàng Kim">
                🔥 {reforgeStones}
              </span>
              <span className="text-rose-300" title="Huy Hiệu Chiến Trận">
                ⚑ {warCrests}
              </span>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700 hover:border-amber-300 text-slate-200 flex items-center justify-center cursor-pointer transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-4 sm:px-6 pt-3 pb-2 bg-[#060a1b] border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setTab('mythic')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
              tab === 'mythic'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg'
                : 'bg-[#0b122b] border border-slate-700/80 text-slate-200 hover:border-amber-400/50'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Thần Binh &amp; Đúc Hoàng Kim</span>
            {canUpgradeMythic && (
              <span className="px-1.5 py-0.5 rounded bg-rose-600 text-white text-[9px]">!</span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab('wheel')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
              tab === 'wheel'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg'
                : 'bg-[#0b122b] border border-slate-700/80 text-slate-200 hover:border-amber-400/50'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Vòng Quay Kho Báu</span>
            {claimableWheelMilestones > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[9px] font-mono-nums">
                +{claimableWheelMilestones}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setTab('altar')}
            className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
              tab === 'altar'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-lg'
                : 'bg-[#0b122b] border border-slate-700/80 text-slate-200 hover:border-amber-400/50'
            }`}
          >
            <Flag className="w-3.5 h-3.5" />
            <span>Tế Đàn &amp; Cờ Hiệu 3D</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-[#050816]">
          {/* ================= TAB 1: MYTHIC WEAPON & GOLDEN REFORGE ================= */}
          {tab === 'mythic' && (
            <>
              {/* Hero Art Banner */}
              <div className="relative rounded-2xl overflow-hidden border border-amber-400/45 min-h-[152px] bg-gradient-to-r from-[#1d1107] via-[#2b1409] to-[#120d26]">
                {!imgErr.mythic && (
                  <img
                    src={mythicForgeImg}
                    alt="Lò Đúc Thần Binh Hoàng Kim 3D"
                    referrerPolicy="no-referrer"
                    onError={() => setImgErr((p) => ({ ...p, mythic: true }))}
                    className="absolute inset-0 w-full h-full object-cover opacity-55"
                  />
                )}
                <div className="relative z-10 p-4 sm:p-5 bg-gradient-to-r from-[#050816]/95 via-[#050816]/75 to-[#050816]/35 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div className="max-w-xl">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400/20 border border-amber-300/60 text-[10px] font-black text-amber-200 mb-2">
                      <Crown className="w-3 h-3" />
                      <span>
                        BẬC HIỆN TẠI: {mythic.tier}/{MYTHIC_WEAPON_MAX_TIER} · {curTierDef.auraLabel}
                      </span>
                    </div>
                    <h3 className="font-display text-lg sm:text-xl font-black text-white">
                      {curTierDef.title}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Thức tỉnh Thần Binh kích hoạt Vương Miện Hào Quang 3D quay trực tiếp quanh Anh
                      Hùng tại Sảnh &amp; Chiến Trường, đồng thời tăng tỷ lệ đúc dòng Hoàng Kim / Chí
                      Tôn.
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2 shrink-0 text-center">
                    <div className="px-3 py-2 rounded-xl bg-[#070d20]/95 border border-amber-400/35">
                      <div className="text-[10px] font-bold text-slate-400">Công Kích</div>
                      <div className="font-mono-nums text-sm font-black text-amber-300">
                        +{Math.round(mythicTotalBonuses.atkPct * 100)}%
                      </div>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-[#070d20]/95 border border-rose-400/35">
                      <div className="text-[10px] font-bold text-slate-400">ST Bạo Kích</div>
                      <div className="font-mono-nums text-sm font-black text-rose-300">
                        +{Math.round(mythicTotalBonuses.critDmgBonus * 100)}%
                      </div>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-[#070d20]/95 border border-sky-400/35">
                      <div className="text-[10px] font-bold text-slate-400">Phá Boss</div>
                      <div className="font-mono-nums text-sm font-black text-sky-300">
                        +{Math.round(mythicTotalBonuses.bossDmgBonus * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Left Card: Tier Transcendence */}
                <div className="rounded-2xl bg-[#090f24] border border-amber-400/35 p-4 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <h4 className="font-display text-sm font-black text-amber-200 flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-orange-400" />
                        <span>Đột Phá Bậc Thần Binh 3D</span>
                      </h4>
                      <span className="font-mono-nums text-xs font-black text-slate-300">
                        Bậc {mythic.tier} / {MYTHIC_WEAPON_MAX_TIER}
                      </span>
                    </div>

                    {/* Tier Progress Dots */}
                    <div className="grid grid-cols-5 gap-1.5 mb-4">
                      {[1, 2, 3, 4, 5].map((lv) => {
                        const unlocked = mythic.tier >= lv;
                        return (
                          <div
                            key={lv}
                            className={`rounded-xl py-2 px-1 text-center border text-[11px] font-mono-nums font-black ${
                              unlocked
                                ? 'bg-amber-400/20 border-amber-300 text-amber-200'
                                : 'bg-slate-950 border-slate-800 text-slate-500'
                            }`}
                          >
                            Bậc {lv}
                          </div>
                        );
                      })}
                    </div>

                    {nextTierDef ? (
                      <div className="rounded-xl bg-[#050917] border border-amber-400/25 p-3.5 space-y-2 text-xs">
                        <div className="font-black text-amber-200">
                          Mục tiêu tiếp theo: {nextTierDef.title}
                        </div>
                        <div className="text-[11px] text-sky-300 font-bold">
                          Hiệu ứng 3D mới: {nextTierDef.auraLabel}
                        </div>
                        <div className="grid grid-cols-3 gap-2 pt-1 font-mono-nums">
                          <div className="rounded-lg bg-slate-900/90 p-2">
                            <div className="text-[10px] text-slate-400">ATK %</div>
                            <div className="text-emerald-300 font-black">
                              +{Math.round(curTierDef.atkPctBonus * 100)}% → +
                              {Math.round(nextTierDef.atkPctBonus * 100)}%
                            </div>
                          </div>
                          <div className="rounded-lg bg-slate-900/90 p-2">
                            <div className="text-[10px] text-slate-400">Crit DMG</div>
                            <div className="text-emerald-300 font-black">
                              +{Math.round(curTierDef.critDmgBonus * 100)}% → +
                              {Math.round(nextTierDef.critDmgBonus * 100)}%
                            </div>
                          </div>
                          <div className="rounded-lg bg-slate-900/90 p-2">
                            <div className="text-[10px] text-slate-400">Boss DMG</div>
                            <div className="text-emerald-300 font-black">
                              +{Math.round(curTierDef.bossDmgBonus * 100)}% → +
                              {Math.round(nextTierDef.bossDmgBonus * 100)}%
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl bg-amber-400/15 border border-amber-300/60 p-4 text-center">
                        <Crown className="w-7 h-7 text-amber-300 mx-auto mb-1" />
                        <div className="font-display text-sm font-black text-amber-200">
                          Đã Đạt Thần Binh Bậc V · Chí Tôn Vĩnh Hằng!
                        </div>
                        <p className="text-xs text-slate-300 mt-1">
                          Toàn bộ hào quang 3D và tỷ lệ may mắn đúc dòng Hoàng Kim đã đạt tối đa.
                        </p>
                      </div>
                    )}
                  </div>

                  {nextTierDef && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-mono-nums px-1">
                        <span
                          className={
                            mythicShards >= nextTierDef.shardCost
                              ? 'text-yellow-200 font-black'
                              : 'text-rose-400 font-black'
                          }
                        >
                          ⚔ Mảnh Thần Binh: {mythicShards}/{nextTierDef.shardCost}
                        </span>
                        <span
                          className={
                            save.gold >= nextTierDef.goldCost
                              ? 'text-amber-300 font-black'
                              : 'text-rose-400 font-black'
                          }
                        >
                          Vàng: {save.gold.toLocaleString('vi-VN')}/
                          {nextTierDef.goldCost.toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={!canUpgradeMythic}
                        onClick={onUpgradeMythicWeapon}
                        className={`w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 whitespace-nowrap ${
                          canUpgradeMythic
                            ? 'a2-yellow-btn cursor-pointer'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Swords className="w-4 h-4" />
                        <span>Thức Tỉnh Lên Bậc {nextTierDef.tier}</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Card: 3-Slot Golden Stat Reforge */}
                <div className="rounded-2xl bg-[#090f24] border border-orange-400/35 p-4 flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-display text-sm font-black text-amber-200 flex items-center gap-1.5">
                        <RefreshCw className="w-4 h-4 text-amber-300" />
                        <span>Đúc 3 Dòng Chỉ Số Hoàng Kim</span>
                      </h4>
                      <span className="font-mono-nums text-[11px] font-bold text-slate-400">
                        Đã đúc: {mythic.totalReforges} lần
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 mb-3">
                      Khóa tối đa 2 dòng ưng ý để giữ nguyên khi Đúc Lại. Bậc Thần Binh càng cao, tỷ
                      lệ ra dòng <span className="text-amber-300 font-bold">HOÀNG KIM</span> &amp;{' '}
                      <span className="text-rose-300 font-bold">CHÍ TÔN</span> càng lớn.
                    </p>

                    <div className="space-y-2.5">
                      {mythic.goldenStats.map((slot) => {
                        const style = GOLDEN_TIER_META[slot.tier];
                        const lockBlocked = !slot.locked && lockedCount >= 2;
                        return (
                          <div
                            key={slot.slotIndex}
                            className={`rounded-xl border px-3 py-2.5 flex items-center justify-between gap-2.5 ${style.borderClass} ${style.bgClass}`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`px-1.5 py-0.5 rounded bg-slate-950/80 text-[9px] font-black ${style.textClass}`}
                                >
                                  {style.badge}
                                </span>
                                <span className="text-[10px] font-bold text-slate-400">
                                  Dòng #{slot.slotIndex + 1}
                                </span>
                              </div>
                              <div className={`font-mono-nums text-xs sm:text-sm font-black mt-1 ${style.textClass}`}>
                                {formatGoldenStatValue(slot.kind, slot.value)}
                              </div>
                            </div>

                            <button
                              type="button"
                              disabled={lockBlocked}
                              onClick={() => onToggleGoldenStatLock(slot.slotIndex)}
                              className={`px-2.5 py-1.5 rounded-lg text-[11px] font-black flex items-center gap-1 whitespace-nowrap shrink-0 transition-colors ${
                                slot.locked
                                  ? 'bg-amber-400 text-slate-950 cursor-pointer'
                                  : lockBlocked
                                  ? 'bg-slate-900 text-slate-600 cursor-not-allowed'
                                  : 'bg-slate-900 border border-slate-700 text-slate-200 hover:border-amber-300 cursor-pointer'
                              }`}
                            >
                              {slot.locked ? (
                                <>
                                  <Lock className="w-3 h-3" />
                                  <span>Đã Khóa</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-3 h-3" />
                                  <span>Khóa</span>
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs font-mono-nums px-1">
                      <span
                        className={
                          reforgeStones >= reforgeCost.reforgeStones
                            ? 'text-orange-300 font-black'
                            : 'text-rose-400 font-black'
                        }
                      >
                        🔥 Đá Đúc: {reforgeStones}/{reforgeCost.reforgeStones} (Khóa {lockedCount}/2)
                      </span>
                      <span
                        className={
                          save.gold >= reforgeCost.gold
                            ? 'text-amber-300 font-black'
                            : 'text-rose-400 font-black'
                        }
                      >
                        Vàng: {reforgeCost.gold.toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={!canReforge}
                      onClick={onReforgeGoldenStats}
                      className={`w-full py-3 px-4 rounded-xl font-black text-xs sm:text-sm flex items-center justify-center gap-2 whitespace-nowrap ${
                        canReforge
                          ? 'a2-purple-btn cursor-pointer'
                          : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Đúc Chỉ Số Hoàng Kim Ngay</span>
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ================= TAB 2: ZODIAC TREASURE WHEEL ================= */}
          {tab === 'wheel' && (
            <>
              {/* Wheel Art Banner */}
              <div className="relative rounded-2xl overflow-hidden border border-amber-400/50 min-h-[138px] bg-gradient-to-r from-[#1c0c2b] via-[#2b140a] to-[#0f1733]">
                {!imgErr.wheel && (
                  <img
                    src={treasureWheelImg}
                    alt="Vòng Quay Kho Báu Hoàng Đạo"
                    referrerPolicy="no-referrer"
                    onError={() => setImgErr((p) => ({ ...p, wheel: true }))}
                    className="absolute inset-0 w-full h-full object-cover opacity-50"
                  />
                )}
                <div className="relative z-10 p-4 sm:p-5 bg-gradient-to-r from-[#050816]/95 via-[#050816]/75 to-[#050816]/35 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-400/20 border border-amber-300/60 text-[10px] font-black text-amber-200 mb-1.5">
                      <Sparkles className="w-3 h-3" />
                      <span>BẢO HIỂM JACKPOT 10 LƯỢT · 12 Ô KHO BÁU</span>
                    </div>
                    <h3 className="font-display text-lg sm:text-xl font-black text-white">
                      Vòng Quay Kho Báu Hoàng Đạo
                    </h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Mỗi 10 lượt quay đảm bảo nổ <span className="text-yellow-300 font-black">ĐẠI JACKPOT 180 Ngọc + 12 Mảnh Thần Binh</span>!
                    </p>
                  </div>

                  {/* Pity Progress Box */}
                  <div className="min-w-[200px] rounded-xl bg-[#070c1f]/95 border border-amber-400/40 px-3.5 py-2.5">
                    <div className="flex items-center justify-between text-[11px] font-black mb-1">
                      <span className="text-amber-200">Bảo Hiểm Jackpot</span>
                      <span className="font-mono-nums text-yellow-300">
                        {wheel.pityCount} / {TREASURE_WHEEL_PITY_MAX}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-950 overflow-hidden border border-amber-400/30">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 via-yellow-300 to-rose-400 transition-all duration-300"
                        style={{
                          width: `${Math.min(100, (wheel.pityCount / TREASURE_WHEEL_PITY_MAX) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1 font-mono-nums">
                      Tổng đã quay: {wheel.totalSpins} lượt
                    </div>
                  </div>
                </div>
              </div>

              {/* 12-Slot Illuminated Treasure Board */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {TREASURE_WHEEL_SLOTS.map((slot) => {
                  const st = WHEEL_RARITY_STYLE[slot.rarity];
                  const isHighlighted = activeWheelIndex === slot.index;
                  const wasWon = recentSpinResults.some((r) => r.index === slot.index);
                  return (
                    <div
                      key={slot.id}
                      className={`relative rounded-xl border p-3 transition-all ${st.bg} ${
                        isHighlighted
                          ? 'border-yellow-300 ring-2 ring-amber-300/90 scale-[1.02] shadow-[0_0_24px_rgba(251,191,36,0.55)]'
                          : wasWon
                          ? 'border-emerald-400 ring-1 ring-emerald-300/70'
                          : st.border
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${st.badge}`}
                        >
                          {slot.rarity === 'mythic'
                            ? 'JACKPOT'
                            : slot.rarity === 'legendary'
                            ? 'HOÀNG KIM'
                            : slot.rarity === 'epic'
                            ? 'SỬ THI'
                            : 'HIẾM'}
                        </span>
                        <span className="font-mono-nums text-[10px] font-bold text-slate-400">
                          #{slot.index + 1}
                        </span>
                      </div>
                      <div className={`font-display text-xs sm:text-sm font-black ${st.text}`}>
                        {slot.shortLabel}
                      </div>
                      <div className="text-[10px] text-slate-300 mt-0.5 line-clamp-1">
                        {slot.label}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Spin Controls + Recent Results */}
              <div className="rounded-2xl bg-[#090f24] border border-amber-400/35 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="min-w-0 text-center sm:text-left">
                  <div className="text-[11px] font-black text-amber-200 uppercase tracking-wider">
                    {isSpinning
                      ? 'Đang Quay Kho Báu Hoàng Đạo...'
                      : recentSpinResults.length > 0
                      ? `Kết Quả Vừa Quay (${recentSpinResults.length} Lượt):`
                      : 'Chọn Số Lượt Quay'}
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    {recentSpinResults.length > 0
                      ? recentSpinResults.map((r) => r.shortLabel).join(' · ')
                      : wheel.lastRewardLabel
                      ? `Gần nhất: ${wheel.lastRewardLabel}`
                      : 'Quay x5 tiết kiệm ngay 20 Ngọc Hồn!'}
                  </div>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 flex-wrap justify-center">
                  <button
                    type="button"
                    disabled={isSpinning || save.gems < TREASURE_WHEEL_SPIN_COST_1}
                    onClick={() => handleTriggerSpin(1)}
                    className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 whitespace-nowrap ${
                      !isSpinning && save.gems >= TREASURE_WHEEL_SPIN_COST_1
                        ? 'a2-purple-btn cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <SoulGemIcon className="w-3.5 h-3.5" />
                    <span>Quay ×1 ({TREASURE_WHEEL_SPIN_COST_1} Ngọc)</span>
                  </button>

                  <button
                    type="button"
                    disabled={isSpinning || save.gems < TREASURE_WHEEL_SPIN_COST_5}
                    onClick={() => handleTriggerSpin(5)}
                    className={`px-4 py-2.5 rounded-xl font-black text-xs flex items-center gap-1.5 whitespace-nowrap ${
                      !isSpinning && save.gems >= TREASURE_WHEEL_SPIN_COST_5
                        ? 'a2-yellow-btn cursor-pointer'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Quay ×5 ({TREASURE_WHEEL_SPIN_COST_5} Ngọc · -15%)</span>
                  </button>
                </div>
              </div>

              {/* Spin Cumulative Milestones */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {TREASURE_WHEEL_MILESTONES.map((m) => {
                  const claimed = wheel.claimedMilestoneSpins.includes(m.spins);
                  const ready = wheel.totalSpins >= m.spins && !claimed;
                  return (
                    <div
                      key={m.spins}
                      className={`rounded-2xl border p-3.5 flex flex-col justify-between gap-2.5 ${
                        ready
                          ? 'bg-amber-500/12 border-amber-300/80'
                          : 'bg-[#090f24] border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-display text-xs font-black text-amber-200">
                            {m.title}
                          </span>
                          <span className="font-mono-nums text-[11px] font-black text-slate-300">
                            {Math.min(wheel.totalSpins, m.spins)}/{m.spins}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-300 mt-1.5 font-mono-nums">
                          +{m.rewardGems} Ngọc · +{m.rewardReforgeStones} Đá Đúc · +
                          {m.rewardMythicShards} Mảnh Thần Binh
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!ready}
                        onClick={() => onClaimWheelMilestone(m.spins)}
                        className={`w-full py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 whitespace-nowrap ${
                          claimed
                            ? 'bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 cursor-default'
                            : ready
                            ? 'a2-yellow-btn cursor-pointer'
                            : 'bg-slate-900 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {claimed ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Đã Nhận Mốc</span>
                          </>
                        ) : ready ? (
                          <>
                            <Gift className="w-3.5 h-3.5" />
                            <span>Nhận Thưởng Mốc</span>
                          </>
                        ) : (
                          <span>Chưa Đạt Mốc</span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* ================= TAB 3: BLESSING ALTAR & 3D WAR BANNERS ================= */}
          {tab === 'altar' && (
            <>
              {/* Altar & War Banner Art Header */}
              <div className="relative rounded-2xl overflow-hidden border border-amber-400/45 min-h-[144px] bg-gradient-to-r from-[#230c10] via-[#1b1026] to-[#0a1428]">
                {!imgErr.altar && (
                  <img
                    src={blessingAltarImg}
                    alt="Tế Đàn Chúc Phúc và Cờ Hiệu Chiến Trận 3D"
                    referrerPolicy="no-referrer"
                    onError={() => setImgErr((p) => ({ ...p, altar: true }))}
                    className="absolute inset-0 w-full h-full object-cover opacity-55"
                  />
                )}
                <div className="relative z-10 p-4 sm:p-5 bg-gradient-to-r from-[#050816]/95 via-[#050816]/75 to-[#050816]/35 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                  <div className="max-w-xl">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-500/20 border border-rose-400/60 text-[10px] font-black text-rose-200 mb-1.5">
                      <Flag className="w-3 h-3" />
                      <span>TỔNG CẤP TẾ ĐÀN: {altarBonuses.totalLevel}/40 · CỜ HIỆU 3D GẮN LƯNG</span>
                    </div>
                    <h3 className="font-display text-lg sm:text-xl font-black text-white">
                      Tế Đàn Chúc Phúc &amp; Cờ Hiệu Chiến Trận 3D
                    </h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Hiến tế Huy Hiệu Chiến Trận tăng Buff vĩnh viễn toàn đội và mở khóa Cờ Hiệu 3D
                      tung bay sau lưng Anh Hùng tại Sảnh Chính lẫn Chiến Trường.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center shrink-0">
                    <div className="px-3 py-1.5 rounded-xl bg-[#070d20]/95 border border-amber-400/35">
                      <div className="text-[10px] text-slate-400 font-bold">Buff ATK / HP</div>
                      <div className="font-mono-nums text-xs font-black text-amber-300">
                        +{Math.round(altarBonuses.atkPct * 100)}% / +
                        {Math.round(altarBonuses.hpPct * 100)}%
                      </div>
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-[#070d20]/95 border border-rose-400/35">
                      <div className="text-[10px] text-slate-400 font-bold">Boss / Vàng</div>
                      <div className="font-mono-nums text-xs font-black text-rose-300">
                        +{Math.round(altarBonuses.bossDmgBonus * 100)}% / +
                        {Math.round(altarBonuses.goldPct * 100)}%
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section A: 4 Blessing Altars */}
              <div>
                <h4 className="font-display text-sm font-black text-amber-200 mb-2.5 flex items-center gap-1.5">
                  <Shield className="w-4 h-4 text-sky-300" />
                  <span>4 Tế Đàn Chúc Phúc Hoàng Đạo</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ALTAR_BLESSING_DEFS.map((def) => {
                    const lv = altar.levels[def.id] ?? 0;
                    const isMax = lv >= def.maxLevel;
                    const cost = getAltarUpgradeCost(lv);
                    const canAfford = !isMax && save.gold >= cost.gold && warCrests >= cost.warCrests;
                    return (
                      <div
                        key={def.id}
                        className="rounded-2xl bg-[#090f24] border border-slate-700/80 p-3.5 flex flex-col justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-display text-sm font-black text-white">
                              {def.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-lg bg-amber-400/15 border border-amber-300/50 font-mono-nums text-[11px] font-black text-amber-200">
                              Lv.{lv}/{def.maxLevel}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-1">{def.subtitle}</p>
                          <div className="mt-2 h-1.5 rounded-full bg-slate-950 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-rose-400 transition-all"
                              style={{ width: `${(lv / def.maxLevel) * 100}%` }}
                            />
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-mono-nums font-bold text-emerald-300">
                            {def.atkPctPerLv > 0 && (
                              <span>ATK +{Math.round(lv * def.atkPctPerLv * 100)}%</span>
                            )}
                            {def.hpPctPerLv > 0 && (
                              <span>HP +{Math.round(lv * def.hpPctPerLv * 100)}%</span>
                            )}
                            {def.bossDmgPerLv > 0 && (
                              <span>Boss +{Math.round(lv * def.bossDmgPerLv * 100)}%</span>
                            )}
                            {def.critPerLv > 0 && (
                              <span>Crit +{(lv * def.critPerLv * 100).toFixed(1)}%</span>
                            )}
                            {def.goldPctPerLv > 0 && (
                              <span>Vàng +{Math.round(lv * def.goldPctPerLv * 100)}%</span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => onUpgradeAltar(def.id)}
                          className={`w-full py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 whitespace-nowrap ${
                            isMax
                              ? 'bg-emerald-500/15 border border-emerald-400/40 text-emerald-300 cursor-default'
                              : canAfford
                              ? 'a2-yellow-btn cursor-pointer'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {isMax ? (
                            <span>Đã Đạt Cấp Tối Đa</span>
                          ) : (
                            <span>
                              Hiến Tế ({cost.warCrests} ⚑ · {cost.gold.toLocaleString('vi-VN')} Vàng)
                            </span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section B: 4 Equippable 3D War Banners */}
              <div>
                <h4 className="font-display text-sm font-black text-amber-200 mb-2.5 flex items-center gap-1.5">
                  <Flag className="w-4 h-4 text-rose-400" />
                  <span>Cờ Hiệu Chiến Trận 3D (Hiển Thị Trực Tiếp Sau Lưng Anh Hùng)</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {WAR_BANNER_DEFS.map((banner) => {
                    const unlocked = unlockedBanners.includes(banner.id);
                    const equipped = equippedBannerId === banner.id;
                    const lv = Math.max(1, bannerLevels[banner.id] ?? 1);
                    const stats = getWarBannerStats(banner.id, lv);
                    const upgCost = getWarBannerUpgradeCost(lv);
                    const canUnlock =
                      !unlocked &&
                      save.gems >= banner.unlockGems &&
                      warCrests >= banner.unlockWarCrests;
                    const canUpgrade =
                      unlocked &&
                      lv < WAR_BANNER_MAX_LEVEL &&
                      save.gold >= upgCost.gold &&
                      warCrests >= upgCost.warCrests;

                    return (
                      <div
                        key={banner.id}
                        className={`rounded-2xl border p-4 flex flex-col justify-between gap-3 ${
                          equipped
                            ? 'bg-[#17112b] border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.2)]'
                            : 'bg-[#090f24] border-slate-700/80'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="inline-block px-2 py-0.5 rounded bg-amber-400/15 border border-amber-300/40 text-[9px] font-black text-amber-200 mb-1">
                                {banner.badge}
                              </span>
                              <h5 className="font-display text-sm font-black text-white">
                                {banner.name}
                              </h5>
                            </div>
                            <span
                              className="w-7 h-7 rounded-lg border-2 shrink-0"
                              style={{
                                backgroundColor: `#${banner.clothHex.toString(16).padStart(6, '0')}`,
                                borderColor: `#${banner.trimHex.toString(16).padStart(6, '0')}`,
                              }}
                              title="Màu Cờ 3D"
                            />
                          </div>
                          <p className="text-[11px] text-slate-300 mt-1">{banner.desc}</p>
                          <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] font-mono-nums font-black">
                            <span className="px-2 py-0.5 rounded bg-slate-950 text-amber-300">
                              ATK +{Math.round(stats.atkPct * 100)}%
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-950 text-emerald-300">
                              HP +{Math.round(stats.hpPct * 100)}%
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-950 text-rose-300">
                              Boss +{Math.round(stats.bossDmg * 100)}%
                            </span>
                            {unlocked && (
                              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-200">
                                Lv.{lv}/{WAR_BANNER_MAX_LEVEL}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={!unlocked && !canUnlock}
                            onClick={() => onUnlockOrEquipWarBanner(banner.id)}
                            className={`flex-1 py-2 px-3 rounded-xl font-black text-xs whitespace-nowrap ${
                              equipped
                                ? 'bg-emerald-500/20 border border-emerald-400/60 text-emerald-200 cursor-pointer'
                                : unlocked
                                ? 'a2-yellow-btn cursor-pointer'
                                : canUnlock
                                ? 'a2-purple-btn cursor-pointer'
                                : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            {equipped
                              ? 'Đang Đeo (Bấm Gỡ)'
                              : unlocked
                              ? 'Đeo Cờ 3D Ngay'
                              : `Mở Khóa (${banner.unlockWarCrests} ⚑${
                                  banner.unlockGems > 0 ? ` · ${banner.unlockGems} Ngọc` : ''
                                })`}
                          </button>

                          {unlocked && lv < WAR_BANNER_MAX_LEVEL && (
                            <button
                              type="button"
                              disabled={!canUpgrade}
                              onClick={() => onUpgradeWarBanner(banner.id)}
                              className={`px-3 py-2 rounded-xl font-black text-xs whitespace-nowrap ${
                                canUpgrade
                                  ? 'a2-slate-btn border border-amber-400/60 text-amber-200 cursor-pointer'
                                  : 'bg-slate-900 text-slate-600 cursor-not-allowed'
                              }`}
                              title={`Cần ${upgCost.warCrests} Huy Hiệu & ${upgCost.gold} Vàng`}
                            >
                              Nâng ({upgCost.warCrests}⚑)
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

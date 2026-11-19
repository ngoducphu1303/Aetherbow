import React, { useEffect, useMemo, useState } from 'react';
import {
  Check,
  Clock,
  Crown,
  Flame,
  Gavel,
  Gift,
  Layers,
  RefreshCw,
  Sparkles,
  Star,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import astralMountsArt from '../assets/images/astral_mounts_race_1795056418828.jpg';
import soulRingsArt from '../assets/images/soul_rings_jade_1795056419045.jpg';
import royalAuctionArt from '../assets/images/royal_blindbox_auction_1795056419153.jpg';
import { soundEngine } from '../audio/soundEngine';
import {
  ASTRAL_STEED_DEFS,
  ASTRAL_STEED_MAX_STAR,
  BLIND_BOX_COST_GEMS,
  ROYAL_DUTCH_LOTS,
  SOUL_RING_DEFS,
  SOUL_RING_MAX_LEVEL,
  SOUL_RING_RESONANCES,
  SPIRIT_JADE_TIERS,
  STARLIGHT_RACE_MILESTONES,
  computeSoulRingBonuses,
  getAstralSteedStarUpCost,
  getAstralSteedStats,
  getDutchLotLivePrice,
  getSoulRingUpgradeCost,
  normalizeRoyalBlindBox,
  normalizeRoyalDutchAuction,
  normalizeSoulRings,
  normalizeStarlightRace,
} from '../data/wave13Data';
import { AstralSteedId, SaveData, SoulRingSlotId } from '../types/game';
import { GoldCoinIcon, SoulGemIcon } from './GameIcons';

export type Wave13Tab = 'steeds' | 'soul_rings' | 'royal_vault';

interface Wave13TreasuryModalProps {
  save: SaveData;
  initialTab?: Wave13Tab;
  onUnlockSteed: (id: AstralSteedId) => void;
  onEquipSteed: (id: AstralSteedId | null) => void;
  onStarUpSteed: (id: AstralSteedId) => void;
  onRunStarlightRace: () => void;
  onClaimRaceMilestone: (pointsTarget: number) => void;
  onUpgradeSoulRing: (slotId: SoulRingSlotId) => void;
  onFuseSpiritJade: (sourceTier: 1 | 2 | 3 | 4, fuseAll?: boolean) => void;
  onBuyDutchLot: (lotId: string, livePriceGems: number) => void;
  onRefreshDutchAuction: () => void;
  onOpenBlindBox: (boxIndex: number) => void;
  onResetBlindBoxBoard: () => void;
  onClose: () => void;
}

function formatMs(ms: number): string {
  const sec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const Wave13TreasuryModal: React.FC<Wave13TreasuryModalProps> = ({
  save,
  initialTab = 'steeds',
  onUnlockSteed,
  onEquipSteed,
  onStarUpSteed,
  onRunStarlightRace,
  onClaimRaceMilestone,
  onUpgradeSoulRing,
  onFuseSpiritJade,
  onBuyDutchLot,
  onRefreshDutchAuction,
  onOpenBlindBox,
  onResetBlindBoxBoard,
  onClose,
}) => {
  const [tab, setTab] = useState<Wave13Tab>(initialTab);
  const [now, setNow] = useState(() => Date.now());
  const [imgErr, setImgErr] = useState<Record<string, boolean>>({});
  const [lastBoxFlashIdx, setLastBoxFlashIdx] = useState<number | null>(null);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const grass = save.starlightGrass ?? 0;
  const scales = save.dragonScales ?? 0;
  const tickets = save.blindBoxTickets ?? 0;
  const unlockedSteeds = useMemo(
    () => new Set<AstralSteedId>(save.unlockedAstralSteeds ?? []),
    [save.unlockedAstralSteeds]
  );
  const equippedSteed = save.equippedAstralSteedId ?? null;
  const raceState = useMemo(() => normalizeStarlightRace(save.starlightRace), [save.starlightRace]);
  const soulRings = useMemo(() => normalizeSoulRings(save.soulRings), [save.soulRings]);
  const soulRingBonuses = useMemo(() => computeSoulRingBonuses(soulRings), [soulRings]);
  const dutchState = useMemo(
    () => normalizeRoyalDutchAuction(save.royalDutchAuction, now),
    [save.royalDutchAuction, now]
  );
  const blindBox = useMemo(
    () => normalizeRoyalBlindBox(save.royalBlindBox, now),
    [save.royalBlindBox, now]
  );

  const openedCount = Object.keys(blindBox.openedBoxes).length;
  const grandPrizeFound = Boolean(blindBox.openedBoxes[blindBox.grandPrizeIndex]);

  const handleBoxClick = (idx: number) => {
    if (blindBox.openedBoxes[idx]) return;
    setLastBoxFlashIdx(idx);
    onOpenBlindBox(idx);
    window.setTimeout(() => setLastBoxFlashIdx(null), 550);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-5 bg-[#040611]/92 overflow-y-auto">
      <div className="cel-panel-ornate w-full max-w-5xl rounded-3xl p-4 sm:p-6 my-auto max-h-[93vh] overflow-y-auto a2-scroll a2-modal-enter">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/20 border border-amber-300/70 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-black text-white truncate">
                Thánh Điện Tinh Giới · Thú Cưỡi 3D · Hồn Hoàn · Hộp Mù Hoàng Gia
              </h2>
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300 tabular-nums">
                <span>Cỏ Tinh Tú: <strong className="text-emerald-300">{grass}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Vảy Rồng Cổ: <strong className="text-orange-300">{scales}</strong></span>
                <span aria-hidden="true">·</span>
                <span>Vé Hộp Mù: <strong className="text-fuchsia-300">{tickets}</strong></span>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1">
                  <SoulGemIcon className="w-3.5 h-3.5" />
                  <strong className="text-sky-300">{save.gems.toLocaleString('vi-VN')}</strong>
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Thánh Điện Tinh Giới"
            className="a2-slate-btn w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setTab('steeds');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              tab === 'steeds' ? 'a2-yellow-btn' : 'a2-slate-btn'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Thú Cưỡi 3D &amp; Đường Đua Ánh Sao</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setTab('soul_rings');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              tab === 'soul_rings' ? 'a2-yellow-btn' : 'a2-slate-btn'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Hồn Hoàn 3D ({soulRingBonuses.totalLevel} Cấp)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setTab('royal_vault');
            }}
            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 ${
              tab === 'royal_vault' ? 'a2-yellow-btn' : 'a2-slate-btn'
            }`}
          >
            <Gavel className="w-3.5 h-3.5" />
            <span>Sàn Đấu Giá Hạ Giá &amp; Hộp Mù 9 Ô</span>
          </button>
        </div>

        {/* ================================================================
            TAB 1: ASTRAL STEEDS 3D & STARLIGHT RACE
            ================================================================ */}
        {tab === 'steeds' && (
          <div className="space-y-4">
            {/* Hero Banner */}
            <div className="relative rounded-2xl overflow-hidden border border-amber-400/40 min-h-[156px] flex items-end">
              {!imgErr.steeds ? (
                <img
                  src={astralMountsArt}
                  alt="Thú Cưỡi Tinh Giới 3D và Đường Đua Ánh Sao"
                  referrerPolicy="no-referrer"
                  onError={() => setImgErr((p) => ({ ...p, steeds: true }))}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-950 via-slate-900 to-amber-950" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050813] via-[#050813]/65 to-transparent" />
              <div className="relative z-10 w-full p-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold text-amber-300 tracking-wide">
                    Hiển thị trực tiếp dưới chân Anh Hùng tại Sảnh Chính 3D &amp; Chiến Đấu
                  </div>
                  <h3 className="font-display text-lg sm:text-xl font-black text-white">
                    Thú Cưỡi Tinh Giới 3D &amp; Đường Đua Ánh Sao
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Nâng sao bằng Cỏ Tinh Tú để bứt phá tốc độ di chuyển, tỷ lệ Bạo Kích và kỷ lục Đường Đua Ánh Sao.
                  </p>
                </div>

                {/* Starlight Race Quick Action */}
                <div className="flex flex-col sm:items-end gap-1.5 shrink-0">
                  <div className="text-[11px] text-slate-300 tabular-nums">
                    Lượt đua hôm nay: <strong className="text-amber-300">{raceState.dailyRunsRemaining}/3</strong>
                    {' · '}Điểm tích lũy: <strong className="text-sky-300">{raceState.totalRacePoints}</strong>
                  </div>
                  <button
                    type="button"
                    disabled={raceState.dailyRunsRemaining <= 0}
                    onClick={onRunStarlightRace}
                    className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                      raceState.dailyRunsRemaining > 0
                        ? 'a2-emerald-btn'
                        : 'bg-slate-800/80 text-slate-500 border border-slate-700 cursor-not-allowed'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>
                      {raceState.dailyRunsRemaining > 0
                        ? 'Bứt Tốc Đường Đua Ánh Sao'
                        : 'Đã Hết Lượt Hôm Nay'}
                    </span>
                  </button>
                </div>
              </div>
            </div>

            {raceState.lastRaceLog && (
              <div className="rounded-xl bg-emerald-950/45 border border-emerald-400/35 px-3.5 py-2.5 text-xs text-emerald-100 flex items-center justify-between gap-2">
                <span>{raceState.lastRaceLog}</span>
                {raceState.bestLapTimeSec > 0 && (
                  <span className="font-mono-nums font-bold text-amber-300 shrink-0">
                    Kỷ lục: {raceState.bestLapTimeSec}s
                  </span>
                )}
              </div>
            )}

            {/* 4 Astral Steed Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {ASTRAL_STEED_DEFS.map((steed) => {
                const isUnlocked = unlockedSteeds.has(steed.id);
                const isEquipped = equippedSteed === steed.id;
                const star = Math.max(1, save.astralSteedStars?.[steed.id] ?? 1);
                const stats = getAstralSteedStats(steed.id, star);
                const cost = getAstralSteedStarUpCost(star);
                const canUnlock = grass >= steed.unlockGrass && save.gems >= steed.unlockGems;
                const canStarUp =
                  isUnlocked && star < ASTRAL_STEED_MAX_STAR && grass >= cost.grass && save.gold >= cost.gold;

                return (
                  <div
                    key={steed.id}
                    className={`rounded-2xl p-4 border transition-colors ${
                      isEquipped
                        ? 'bg-amber-950/30 border-amber-400/75'
                        : 'bg-[#0b1126]/90 border-slate-700/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <div className="text-[11px] font-bold text-amber-300">{steed.badge}</div>
                        <h4 className="font-display text-base font-black text-white">{steed.name}</h4>
                      </div>
                      <div className="text-right tabular-nums">
                        {isUnlocked ? (
                          <div className="flex items-center gap-0.5 text-amber-300 justify-end">
                            {Array.from({ length: ASTRAL_STEED_MAX_STAR }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i < star ? 'fill-amber-300 text-amber-300' : 'text-slate-600'
                                }`}
                              />
                            ))}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Chưa mở khóa</span>
                        )}
                        <div className="text-[11px] text-sky-300 mt-0.5">
                          Tốc độ Đua: {stats.raceSpeed}
                        </div>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 mb-3 leading-relaxed">{steed.desc}</p>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] bg-slate-950/60 rounded-xl p-2.5 mb-3 tabular-nums">
                      <div>
                        <div className="text-slate-400">Công Kích</div>
                        <div className="font-bold text-amber-300">+{Math.round(stats.atkPct * 100)}%</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Sinh Lực</div>
                        <div className="font-bold text-emerald-300">+{Math.round(stats.hpPct * 100)}%</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Tốc Chạy</div>
                        <div className="font-bold text-sky-300">+{Math.round(stats.moveSpeed * 100)}%</div>
                      </div>
                      <div>
                        <div className="text-slate-400">Bạo Kích</div>
                        <div className="font-bold text-fuchsia-300">+{(stats.crit * 100).toFixed(1)}%</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {!isUnlocked ? (
                        <button
                          type="button"
                          disabled={!canUnlock}
                          onClick={() => onUnlockSteed(steed.id)}
                          className={`flex-1 px-3 py-2 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap ${
                            canUnlock
                              ? 'a2-yellow-btn'
                              : 'bg-slate-800/80 text-slate-500 border border-slate-700 cursor-not-allowed'
                          }`}
                        >
                          Mở Khóa ({steed.unlockGrass} Cỏ{steed.unlockGems > 0 ? ` · ${steed.unlockGems} Ngọc` : ''})
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onEquipSteed(isEquipped ? null : steed.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap ${
                              isEquipped ? 'a2-emerald-btn' : 'a2-slate-btn'
                            }`}
                          >
                            {isEquipped ? 'Đang Cưỡi (Tháo)' : 'Cưỡi Ra Sảnh 3D'}
                          </button>
                          <button
                            type="button"
                            disabled={!canStarUp}
                            onClick={() => onStarUpSteed(steed.id)}
                            className={`flex-1 px-3 py-2 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap ${
                              star >= ASTRAL_STEED_MAX_STAR
                                ? 'bg-amber-500/20 text-amber-200 border border-amber-400/40 cursor-default'
                                : canStarUp
                                ? 'a2-yellow-btn'
                                : 'bg-slate-800/80 text-slate-500 border border-slate-700 cursor-not-allowed'
                            }`}
                          >
                            {star >= ASTRAL_STEED_MAX_STAR
                              ? 'Đã Đạt Tối Đa 5★'
                              : `Nâng ${star + 1}★ (${cost.grass} Cỏ · ${cost.gold} Vàng)`}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Starlight Race Cumulative Milestones */}
            <div className="rounded-2xl bg-[#090f22] border border-slate-700/70 p-4">
              <div className="flex items-center justify-between gap-2 mb-3">
                <h4 className="font-display text-sm font-black text-amber-200">
                  Mốc Thưởng Đường Đua Ánh Sao
                </h4>
                <span className="text-xs text-slate-300 tabular-nums">
                  Tổng điểm đua: <strong className="text-sky-300">{raceState.totalRacePoints}</strong>
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {STARLIGHT_RACE_MILESTONES.map((ms) => {
                  const claimed = raceState.claimedMilestones.includes(ms.pointsTarget);
                  const ready = !claimed && raceState.totalRacePoints >= ms.pointsTarget;
                  return (
                    <div
                      key={ms.pointsTarget}
                      className={`rounded-xl p-3 border flex flex-col justify-between gap-2 ${
                        ready
                          ? 'bg-emerald-950/40 border-emerald-400/60'
                          : 'bg-slate-950/60 border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="text-[11px] font-mono-nums text-amber-300 font-bold">
                          Mốc {ms.pointsTarget} Điểm
                        </div>
                        <div className="text-xs font-bold text-white mt-0.5">{ms.title}</div>
                        <div className="text-[11px] text-slate-300 mt-1 tabular-nums">
                          +{ms.rewardGems} Ngọc · +{ms.rewardGrass} Cỏ · +{ms.rewardDragonScales} Vảy · +{ms.rewardBlindBoxTickets} Vé Mù
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!ready}
                        onClick={() => onClaimRaceMilestone(ms.pointsTarget)}
                        className={`w-full py-1.5 rounded-lg text-xs font-black cursor-pointer ${
                          claimed
                            ? 'bg-slate-800 text-emerald-400 cursor-default'
                            : ready
                            ? 'a2-emerald-btn'
                            : 'bg-slate-900 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {claimed ? 'Đã Nhận' : ready ? 'Nhận Mốc Quà' : 'Chưa Đủ Điểm'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            TAB 2: MULTI-TIER 3D SOUL RINGS & SPIRIT JADE FUSION (3 -> 1)
            ================================================================ */}
        {tab === 'soul_rings' && (
          <div className="space-y-4">
            {/* Hero Banner */}
            <div className="relative rounded-2xl overflow-hidden border border-purple-400/45 min-h-[148px] flex items-end">
              {!imgErr.rings ? (
                <img
                  src={soulRingsArt}
                  alt="Hồn Hoàn 3D Đa Tầng và Hợp Thành Linh Ngọc"
                  referrerPolicy="no-referrer"
                  onError={() => setImgErr((p) => ({ ...p, rings: true }))}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-purple-950 via-slate-900 to-cyan-950" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050813] via-[#050813]/65 to-transparent" />
              <div className="relative z-10 w-full p-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold text-purple-300">
                    5 Vòng Hồn Hoàn xoay đa trục quanh Anh Hùng 3D · Tổng cộng hưởng: {soulRingBonuses.totalLevel}/50 Cấp
                  </div>
                  <h3 className="font-display text-lg sm:text-xl font-black text-white">
                    Hồn Hoàn 3D Đa Tầng &amp; Đài Hợp Thành Linh Ngọc
                  </h3>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-200 mt-1 tabular-nums">
                    <span>Công: <strong className="text-amber-300">+{Math.round(soulRingBonuses.atkPct * 100)}%</strong></span>
                    <span>Máu: <strong className="text-emerald-300">+{Math.round(soulRingBonuses.hpPct * 100)}%</strong></span>
                    <span>Bạo: <strong className="text-fuchsia-300">+{(soulRingBonuses.crit * 100).toFixed(1)}%</strong></span>
                    <span>ST Boss: <strong className="text-rose-300">+{Math.round(soulRingBonuses.bossDmg * 100)}%</strong></span>
                  </div>
                </div>
                {soulRingBonuses.activeResonanceTitle && (
                  <div className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-300/60 text-xs font-black text-amber-200 shrink-0">
                    Đang Kích Hoạt: {soulRingBonuses.activeResonanceTitle}
                  </div>
                )}
              </div>
            </div>

            {/* Spirit Jade Inventory & 3 -> 1 Fusion Workbench */}
            <div className="rounded-2xl bg-[#090f22] border border-slate-700/75 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div>
                  <h4 className="font-display text-sm font-black text-white">
                    Kho Linh Ngọc &amp; Hợp Thành 3 → 1
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Ghép 3 Linh Ngọc bậc thấp để luyện thành 1 Linh Ngọc bậc cao mở khóa các tầng Hồn Hoàn 3D rực rỡ hơn.
                  </p>
                </div>
                <span className="text-xs text-slate-300 tabular-nums">
                  Đã hợp thành: <strong className="text-purple-300">{soulRings.totalFusions}</strong> lần
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {SPIRIT_JADE_TIERS.map((jt) => {
                  const count = soulRings.spiritJades[jt.tier - 1] ?? 0;
                  const canFuse = jt.tier < 5 && count >= 3;
                  const fuseMax = Math.floor(count / 3);
                  return (
                    <div
                      key={jt.tier}
                      className={`rounded-xl p-3 border flex flex-col justify-between gap-2 ${jt.badgeClass}`}
                    >
                      <div>
                        <div className="text-[11px] font-bold opacity-85">{jt.shortName}</div>
                        <div className="font-mono-nums text-2xl font-black mt-0.5">{count}</div>
                      </div>
                      {jt.tier < 5 ? (
                        <div className="flex flex-col gap-1">
                          <button
                            type="button"
                            disabled={!canFuse}
                            onClick={() => onFuseSpiritJade(jt.tier as 1 | 2 | 3 | 4, false)}
                            className={`w-full py-1.5 rounded-lg text-[11px] font-black cursor-pointer ${
                              canFuse
                                ? 'a2-yellow-btn'
                                : 'bg-slate-900/70 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            Hợp 3 → 1
                          </button>
                          {fuseMax >= 2 && (
                            <button
                              type="button"
                              onClick={() => onFuseSpiritJade(jt.tier as 1 | 2 | 3 | 4, true)}
                              className="w-full py-1 rounded-lg text-[10px] font-bold bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                            >
                              Hợp Hết (+{fuseMax})
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="text-[10px] text-cyan-200 font-bold">Bậc Tối Thượng</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 5 Soul Ring Upgrade Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {SOUL_RING_DEFS.map((ring) => {
                const lv = soulRings.levels[ring.id] ?? 0;
                const cost = getSoulRingUpgradeCost(ring.id, lv);
                const ownedJades = soulRings.spiritJades[cost.jadeTier - 1] ?? 0;
                const isMax = lv >= SOUL_RING_MAX_LEVEL;
                const canUpgrade = !isMax && ownedJades >= cost.jadeCount && save.gold >= cost.gold;

                return (
                  <div
                    key={ring.id}
                    className={`rounded-2xl p-3.5 border flex items-center justify-between gap-3 ${
                      lv > 0
                        ? 'bg-[#0c132b] border-purple-400/50'
                        : 'bg-[#080d1e] border-slate-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-[11px] font-bold text-amber-300">
                        <span>{ring.badge}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono-nums text-white">Cấp {lv}/{SOUL_RING_MAX_LEVEL}</span>
                      </div>
                      <div className="font-display text-sm font-black text-white truncate mt-0.5">
                        {ring.name}
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">{ring.statLabel}</div>
                      {!isMax && (
                        <div className="text-[11px] text-slate-400 mt-1 tabular-nums">
                          Cần: <strong className={ownedJades >= cost.jadeCount ? 'text-emerald-300' : 'text-rose-300'}>
                            {ownedJades}/{cost.jadeCount} Ngọc Bậc {cost.jadeTier}
                          </strong>
                          {' · '}{cost.gold} Vàng
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={!canUpgrade}
                      onClick={() => onUpgradeSoulRing(ring.id)}
                      className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap shrink-0 ${
                        isMax
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 cursor-default'
                          : canUpgrade
                          ? 'a2-yellow-btn'
                          : 'bg-slate-800/80 text-slate-500 border border-slate-700 cursor-not-allowed'
                      }`}
                    >
                      {isMax ? 'Tối Đa' : lv === 0 ? 'Khai Mở 3D' : 'Nâng Tầng'}
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Resonance Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SOUL_RING_RESONANCES.map((res) => {
                const active = soulRingBonuses.totalLevel >= res.totalLv;
                return (
                  <div
                    key={res.totalLv}
                    className={`rounded-xl p-2.5 border text-xs tabular-nums ${
                      active
                        ? 'bg-amber-950/40 border-amber-400/60 text-amber-100'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-bold flex items-center justify-between">
                      <span>{res.title}</span>
                      {active && <Check className="w-3.5 h-3.5 text-emerald-300" />}
                    </div>
                    <div className="text-[11px] mt-0.5">
                      Tổng {res.totalLv} Cấp · +{Math.round(res.atkPct * 100)}% Công · +{Math.round(res.critDmg * 100)}% ST Bạo
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================================================================
            TAB 3: ROYAL DUTCH AUCTION & 9-BOX LIMITED BLIND BOX
            ================================================================ */}
        {tab === 'royal_vault' && (
          <div className="space-y-4">
            {/* Hero Banner */}
            <div className="relative rounded-2xl overflow-hidden border border-amber-400/45 min-h-[144px] flex items-end">
              {!imgErr.vault ? (
                <img
                  src={royalAuctionArt}
                  alt="Sàn Đấu Giá Hoàng Gia và Hộp Mù Hạn Giờ"
                  referrerPolicy="no-referrer"
                  onError={() => setImgErr((p) => ({ ...p, vault: true }))}
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-r from-amber-950 via-slate-900 to-rose-950" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#050813] via-[#050813]/65 to-transparent" />
              <div className="relative z-10 w-full p-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3">
                <div>
                  <div className="text-[11px] font-bold text-amber-300">
                    Đấu Giá Hạ Giá Dần mỗi 15 giây · Hộp Mù 9 Ô chắc chắn nổ Đại Thưởng Thần Thoại
                  </div>
                  <h3 className="font-display text-lg sm:text-xl font-black text-white">
                    Sàn Đấu Giá Hoàng Gia &amp; Hộp Mù Hạn Giờ
                  </h3>
                </div>
                <div className="flex items-center gap-2 text-xs font-mono-nums text-amber-200 bg-black/55 border border-amber-400/40 rounded-xl px-3 py-1.5 shrink-0">
                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                  <span>Phiên Hộp Mù còn: {formatMs(blindBox.sessionEndsAt - now)}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
              {/* LEFT: Dutch Auction (Price Dropping Live) */}
              <div className="rounded-2xl bg-[#090f22] border border-amber-400/35 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="font-display text-sm font-black text-amber-200 flex items-center gap-1.5">
                      <Gavel className="w-4 h-4 text-amber-300" />
                      <span>Sàn Đấu Giá Hạ Giá Dần</span>
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Giá tự động giảm từng nấc mỗi 15 giây — canh đúng đáy để chốt mua siêu hời!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onRefreshDutchAuction}
                    className="a2-slate-btn px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer whitespace-nowrap"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Phiên Mới</span>
                  </button>
                </div>

                <div className="space-y-2.5">
                  {ROYAL_DUTCH_LOTS.map((lot) => {
                    const bought = dutchState.purchasedLotIds.includes(lot.id);
                    const live = getDutchLotLivePrice(lot, dutchState.sessionStartedAt, now);
                    const canBuy = !bought && save.gems >= live.currentGems;
                    return (
                      <div
                        key={lot.id}
                        className={`rounded-xl p-3 border flex items-center justify-between gap-3 ${
                          bought
                            ? 'bg-slate-950/50 border-slate-800 opacity-65'
                            : 'bg-[#0e1631] border-amber-400/35'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-black text-white truncate">{lot.title}</div>
                          <div className="text-[11px] text-slate-300 truncate">{lot.subtitle}</div>
                          <div className="flex items-center gap-2 text-[11px] mt-1 tabular-nums">
                            <span className="text-slate-400 line-through">{lot.startGems} Ngọc</span>
                            <span className="font-black text-amber-300">{live.currentGems} Ngọc</span>
                            {live.discountPct > 0 && (
                              <span className="text-emerald-300 font-bold">-{live.discountPct}%</span>
                            )}
                            <span className="text-slate-400">
                              {live.isAtFloor ? '· Đã chạm đáy!' : `· Giảm sau ${live.nextDropInSec}s`}
                            </span>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!canBuy}
                          onClick={() => onBuyDutchLot(lot.id, live.currentGems)}
                          className={`px-3 py-2 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap shrink-0 ${
                            bought
                              ? 'bg-slate-800 text-emerald-400 cursor-default'
                              : canBuy
                              ? 'a2-yellow-btn'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {bought ? 'Đã Chốt' : `Chốt ${live.currentGems}💎`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT: 9-Box Royal Blind Box */}
              <div className="rounded-2xl bg-[#090f22] border border-fuchsia-400/40 p-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h4 className="font-display text-sm font-black text-fuchsia-200 flex items-center gap-1.5">
                      <Gift className="w-4 h-4 text-fuchsia-300" />
                      <span>Hộp Mù Hoàng Đạo · Vòng #{blindBox.cycleNumber}</span>
                    </h4>
                    <p className="text-[11px] text-slate-300 tabular-nums">
                      Đã mở {openedCount}/9 hộp · Phí: <strong className="text-fuchsia-300">1 Vé</strong> hoặc <strong className="text-sky-300">{BLIND_BOX_COST_GEMS} Ngọc</strong>
                    </p>
                  </div>
                  {(openedCount >= 9 || grandPrizeFound) && (
                    <button
                      type="button"
                      onClick={onResetBlindBoxBoard}
                      className="a2-emerald-btn px-3 py-1.5 rounded-lg text-[11px] font-black cursor-pointer whitespace-nowrap"
                    >
                      Đổi Bảng Mới
                    </button>
                  )}
                </div>

                {/* Grand Prize Callout */}
                <div className="rounded-xl bg-amber-950/35 border border-amber-400/45 px-3 py-2 text-[11px] text-amber-100 flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>
                      Đại Thưởng: <strong>120 Ngọc + Ngọc Bậc IV + 25 Cỏ + 15 Vảy Rồng</strong>
                    </span>
                  </span>
                  <span className="font-bold text-amber-300 shrink-0">
                    {grandPrizeFound ? 'Đã Nổ!' : `Còn ${9 - openedCount} ô`}
                  </span>
                </div>

                {/* 3x3 Mystery Chest Grid */}
                <div className="grid grid-cols-3 gap-2.5">
                  {Array.from({ length: 9 }).map((_, idx) => {
                    const opened = blindBox.openedBoxes[idx];
                    const canAfford = tickets > 0 || save.gems >= BLIND_BOX_COST_GEMS;
                    const flashing = lastBoxFlashIdx === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={Boolean(opened) || !canAfford}
                        onClick={() => handleBoxClick(idx)}
                        className={`rounded-xl p-2.5 min-h-[86px] border text-left transition-transform flex flex-col justify-between cursor-pointer ${
                          flashing ? 'scale-105' : ''
                        } ${
                          opened
                            ? opened.isGrandPrize
                              ? 'bg-amber-900/50 border-amber-300 text-amber-100 cursor-default'
                              : 'bg-slate-900/80 border-slate-700 text-slate-200 cursor-default'
                            : canAfford
                            ? 'bg-gradient-to-b from-indigo-950 to-slate-950 border-amber-400/50 hover:border-amber-300 hover:-translate-y-0.5'
                            : 'bg-slate-950/70 border-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <div className="flex items-center justify-between text-[10px] font-mono-nums">
                          <span className="text-slate-400">Hộp #{idx + 1}</span>
                          {opened?.isGrandPrize && <Trophy className="w-3.5 h-3.5 text-amber-300" />}
                        </div>
                        {opened ? (
                          <div className="text-[11px] font-bold leading-snug line-clamp-3">
                            {opened.isGrandPrize ? 'ĐẠI THƯỞNG THẦN THOẠI!' : opened.label}
                          </div>
                        ) : (
                          <div className="text-center my-auto">
                            <Gift className="w-5 h-5 mx-auto text-amber-300 mb-1" />
                            <div className="text-[10px] font-black text-amber-200">
                              {tickets > 0 ? 'Mở (1 Vé)' : `Mở (${BLIND_BOX_COST_GEMS}💎)`}
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                <div className="text-[11px] text-slate-400 flex items-center justify-between tabular-nums">
                  <span>Tổng hộp đã mở: <strong className="text-white">{blindBox.totalBoxesOpened}</strong></span>
                  <span className="inline-flex items-center gap-1">
                    <GoldCoinIcon className="w-3.5 h-3.5" />
                    <span>{save.gold.toLocaleString('vi-VN')} Vàng</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

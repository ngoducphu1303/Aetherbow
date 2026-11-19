import React, { useState } from 'react';
import {
  Check,
  Crown,
  Dices,
  Feather,
  Flame,
  Gift,
  Play,
  Sparkles,
  Star,
  Trophy,
  X,
} from 'lucide-react';
import celestialWingsArt from '../assets/images/celestial_wings_arena_1795058112061.jpg';
import astralDiceArt from '../assets/images/astral_dice_relics_1795058110295.jpg';
import { soundEngine } from '../audio/soundEngine';
import {
  ASTRAL_BOARD_LAP_MILESTONES,
  ASTRAL_BOARD_TILES,
  ASTRAL_DICE_BUY_COST_GEMS,
  ASTRAL_GOLDEN_DICE_COST_GEMS,
  CELESTIAL_WING_DEFS,
  CELESTIAL_WING_MAX_STAR,
  ROYAL_3D_TITLE_DEFS,
  SKY_CITADEL_MAX_DAILY_RUNS,
  SKY_CITADEL_MILESTONES,
  ZODIAC_RELIC_DEFS,
  ZODIAC_RELIC_MAX_STAR,
  computeRoyal3DTitleBonuses,
  computeZodiacRelicBonuses,
  countClaimableAstralBoardRewards,
  countClaimableSkyCitadelMilestones,
  getCelestialWingStats,
  getCelestialWingUpgradeCost,
  getZodiacRelicUpgradeCost,
  normalizeAstralBoard,
  normalizeSkyCitadel,
  normalizeZodiacRelics,
} from '../data/wave14Data';
import {
  CelestialWingId,
  Royal3DTitleId,
  SaveData,
  ZodiacRelicId,
} from '../types/game';

export type Wave14Tab = 'wings' | 'board' | 'relics';

interface Wave14AscensionModalProps {
  save: SaveData;
  initialTab?: Wave14Tab;
  onUnlockOrUpgradeWing: (wingId: CelestialWingId) => void;
  onEquipWing: (wingId: CelestialWingId) => void;
  onStartSkyCitadel: () => void;
  onClaimSkyCitadelMilestone: (scoreTarget: number) => void;
  onClaimDailyFreeDice: () => void;
  onRollAstralDice: (chosenSteps?: number) => void;
  onBuyAstralDice: (kind: 'normal' | 'golden') => void;
  onClaimAstralLapMilestone: (lapsTarget: number) => void;
  onUpgradeZodiacRelic: (relicId: ZodiacRelicId) => void;
  onUnlockOrEquipRoyalTitle: (titleId: Royal3DTitleId) => void;
  onReplayEntranceVfx: () => void;
  onClose: () => void;
}

// 5x5 perimeter grid layout for 16 board tiles (row 0..4, col 0..4)
const BOARD_COORDS: Array<[number, number]> = [
  [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
  [1, 4], [2, 4], [3, 4], [4, 4],
  [4, 3], [4, 2], [4, 1], [4, 0],
  [3, 0], [2, 0], [1, 0],
];

export const Wave14AscensionModal: React.FC<Wave14AscensionModalProps> = ({
  save,
  initialTab = 'wings',
  onUnlockOrUpgradeWing,
  onEquipWing,
  onStartSkyCitadel,
  onClaimSkyCitadelMilestone,
  onClaimDailyFreeDice,
  onRollAstralDice,
  onBuyAstralDice,
  onClaimAstralLapMilestone,
  onUpgradeZodiacRelic,
  onUnlockOrEquipRoyalTitle,
  onReplayEntranceVfx,
  onClose,
}) => {
  const [tab, setTab] = useState<'wings' | 'board' | 'relics'>(initialTab);
  const [wingsImgErr, setWingsImgErr] = useState(false);
  const [boardImgErr, setBoardImgErr] = useState(false);
  const [goldenPickerOpen, setGoldenPickerOpen] = useState(false);

  const feathers = save.celestialFeathers ?? 0;
  const unlockedWings = save.unlockedCelestialWings ?? [];
  const wingStars = save.celestialWingStars ?? {};
  const equippedWing = save.equippedCelestialWingId ?? null;
  const sky = normalizeSkyCitadel(save.skyCitadel);
  const board = normalizeAstralBoard(save.astralBoard);
  const relics = normalizeZodiacRelics(save.zodiacRelics);
  const relicBonus = computeZodiacRelicBonuses(relics);
  const titleBonus = computeRoyal3DTitleBonuses(save);
  const unlockedTitles = save.unlockedRoyal3DTitles ?? ['title_sky_sovereign'];
  const equippedTitle = save.equippedRoyal3DTitleId ?? 'title_sky_sovereign';

  const skyClaimable = countClaimableSkyCitadelMilestones(save);
  const boardClaimable = countClaimableAstralBoardRewards(save);

  const heroArt = tab === 'wings' ? celestialWingsArt : astralDiceArt;
  const heroArtErr = tab === 'wings' ? wingsImgErr : boardImgErr;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-5 bg-[#040611]/92 overflow-y-auto">
      <div className="cel-panel-ornate w-full max-w-5xl rounded-3xl overflow-hidden flex flex-col max-h-[92vh] a2-modal-enter">
        {/* Hero Art Header */}
        <div className="relative shrink-0 border-b border-amber-400/25 bg-[#070b1a]">
          {!heroArtErr ? (
            <img
              src={heroArt}
              alt="Thiên Giới Cánh Thần & Bàn Cờ Tinh Tú"
              referrerPolicy="no-referrer"
              onError={() => (tab === 'wings' ? setWingsImgErr(true) : setBoardImgErr(true))}
              className="w-full h-36 sm:h-44 object-cover opacity-55"
            />
          ) : (
            <div className="w-full h-36 sm:h-44 bg-gradient-to-r from-[#0b1332] via-[#131d47] to-[#0a1026]" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#070b1a] via-[#070b1a]/70 to-[#070b1a]/35" />

          <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-amber-300 tracking-wide">
                  Thiên Giới Cánh Thần · Hoàng Đạo Tinh Tú
                </div>
                <h2 className="font-display text-lg sm:text-2xl font-black text-white truncate">
                  {tab === 'wings'
                    ? 'Cánh Thần Quang 3D & Không Chiến'
                    : tab === 'board'
                    ? 'Bàn Cờ Xúc Xắc Tinh Tú 16 Ô'
                    : 'Kho Cổ Vật Hoàng Đạo & Danh Hiệu 3D'}
                </h2>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <div className="hidden sm:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-[#070b1a]/95 border border-amber-400/35 text-xs font-mono-nums font-bold text-slate-200">
                  <span className="text-sky-300">{feathers} Lông Vũ</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-violet-300">{relics.essence} Cổ Vật</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-cyan-300">{save.gems.toLocaleString('vi-VN')} Ngọc</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick(0.9);
                    onClose();
                  }}
                  aria-label="Đóng Thiên Giới Cánh Thần"
                  className="a2-slate-btn w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Clean Segmented Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(1.0);
                  setTab('wings');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  tab === 'wings'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-[#0e1530] text-slate-300 hover:text-white border border-slate-700/70'
                }`}
              >
                <Feather className="w-3.5 h-3.5" />
                <span>Cánh 3D & Không Chiến</span>
                {skyClaimable > 0 && (
                  <span className="ml-1 font-mono-nums text-[10px] font-black text-rose-600 bg-rose-100 px-1.5 rounded">
                    {skyClaimable}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(1.0);
                  setTab('board');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  tab === 'board'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-[#0e1530] text-slate-300 hover:text-white border border-slate-700/70'
                }`}
              >
                <Dices className="w-3.5 h-3.5" />
                <span>Bàn Cờ Xúc Xắc</span>
                {boardClaimable > 0 && (
                  <span className="ml-1 font-mono-nums text-[10px] font-black text-rose-600 bg-rose-100 px-1.5 rounded">
                    {boardClaimable}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick(1.0);
                  setTab('relics');
                }}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  tab === 'relics'
                    ? 'bg-amber-400 text-slate-950'
                    : 'bg-[#0e1530] text-slate-300 hover:text-white border border-slate-700/70'
                }`}
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Cổ Vật & Danh Hiệu 3D</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-[#070b1a] space-y-6">
          {/* TAB 1: CELESTIAL WINGS 3D & SKY CITADEL AERIAL ARENA */}
          {tab === 'wings' && (
            <>
              {/* Sky Citadel Aerial Arena Launch Strip */}
              <div className="rounded-2xl border border-sky-400/35 bg-[#0c142e] p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-sky-300">
                    Phó Bản Không Chiến 3D · 3 Đợt Quái Bay & Boss Thiên Sứ Trưởng
                  </div>
                  <h3 className="font-display text-lg font-black text-white">
                    Không Chiến Tinh Giới — Săn Lông Vũ Thần Quang & Mảnh Thần
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono-nums">
                    <span>Điểm cao nhất: <strong className="text-amber-300">{sky.bestScore.toLocaleString('vi-VN')}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>Tổng điểm tích lũy: <strong className="text-sky-300">{sky.totalScore.toLocaleString('vi-VN')}</strong></span>
                    <span aria-hidden="true">·</span>
                    <span>Lượt hôm nay: <strong className="text-emerald-300">{sky.dailyRunsRemaining}/{SKY_CITADEL_MAX_DAILY_RUNS}</strong></span>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={sky.dailyRunsRemaining <= 0}
                  onClick={() => {
                    soundEngine.playUiClick(1.15);
                    onStartSkyCitadel();
                  }}
                  className={`px-5 py-3 rounded-xl text-sm font-black flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                    sky.dailyRunsRemaining > 0
                      ? 'a2-emerald-btn text-slate-950'
                      : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{sky.dailyRunsRemaining > 0 ? 'Vào Không Chiến 3D' : 'Hết Lượt Hôm Nay'}</span>
                </button>
              </div>

              {/* 4 Sky Citadel Score Milestones */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {SKY_CITADEL_MILESTONES.map((ms) => {
                  const claimed = sky.claimedMilestones.includes(ms.scoreTarget);
                  const ready = !claimed && sky.totalScore >= ms.scoreTarget;
                  const pct = Math.min(100, Math.round((sky.totalScore / ms.scoreTarget) * 100));
                  return (
                    <div
                      key={ms.scoreTarget}
                      className={`rounded-2xl p-3.5 border flex flex-col justify-between gap-2.5 ${
                        ready
                          ? 'border-emerald-400/70 bg-emerald-950/30'
                          : 'border-slate-700/70 bg-[#0c1228]'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                          <span className="truncate">{ms.title}</span>
                          <span className="font-mono-nums text-amber-300">{pct}%</span>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-slate-900 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-sky-400 to-amber-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="mt-2 text-[11px] text-slate-300 font-mono-nums">
                          +{ms.rewardFeathers} Lông Vũ · +{ms.rewardMythicShards} Mảnh Thần · +{ms.rewardGems} Ngọc · +{ms.rewardDice} Xúc Xắc
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={!ready}
                        onClick={() => {
                          soundEngine.playUiClick(1.1);
                          onClaimSkyCitadelMilestone(ms.scoreTarget);
                        }}
                        className={`w-full py-2 rounded-lg text-xs font-black whitespace-nowrap cursor-pointer ${
                          claimed
                            ? 'bg-slate-800/80 text-slate-500 cursor-default'
                            : ready
                            ? 'a2-emerald-btn text-slate-950'
                            : 'bg-slate-800/60 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {claimed ? 'Đã Nhận' : ready ? 'Nhận Quà Mốc' : `Cần ${ms.scoreTarget.toLocaleString('vi-VN')} điểm`}
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* 4 Articulated 3D Celestial Wings */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-base font-black text-white">
                    Bộ Sưu Tập Cánh Thần Quang 3D (Hiển Thị Trực Tiếp Trên Lưng Anh Hùng)
                  </h3>
                  <span className="text-xs font-mono-nums text-sky-300 font-bold">
                    Hiện có: {feathers} Lông Vũ Thần Quang
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {CELESTIAL_WING_DEFS.map((wing) => {
                    const isUnlocked = unlockedWings.includes(wing.id);
                    const star = isUnlocked ? Math.max(1, wingStars[wing.id] ?? 1) : 0;
                    const isEquipped = equippedWing === wing.id;
                    const stats = getCelestialWingStats(wing.id, isUnlocked ? star : 1);
                    const upgCost = getCelestialWingUpgradeCost(star || 1);
                    const isMax = star >= CELESTIAL_WING_MAX_STAR;
                    const canAffordUnlock =
                      !isUnlocked && feathers >= wing.unlockFeathers && save.gems >= wing.unlockGems;
                    const canAffordUpgrade =
                      isUnlocked && !isMax && feathers >= upgCost.feathers && save.gold >= upgCost.gold;

                    return (
                      <div
                        key={wing.id}
                        className={`rounded-2xl p-4 border flex flex-col justify-between gap-3 ${
                          isEquipped
                            ? 'border-amber-300/80 bg-[#131c3d]'
                            : 'border-slate-700/80 bg-[#0c1228]'
                        }`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-[11px] font-bold text-amber-300">
                                {wing.rarity} · {wing.badge}
                              </div>
                              <h4 className="font-display text-base font-black text-white mt-0.5">
                                {wing.name}
                              </h4>
                            </div>
                            <div className="flex items-center gap-0.5 text-amber-300 font-mono-nums text-xs font-black shrink-0">
                              {isUnlocked ? (
                                <>
                                  {Array.from({ length: CELESTIAL_WING_MAX_STAR }).map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-3.5 h-3.5 ${
                                        i < star ? 'fill-amber-300 text-amber-300' : 'text-slate-600'
                                      }`}
                                    />
                                  ))}
                                </>
                              ) : (
                                <span className="text-slate-400">Chưa mở</span>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">{wing.desc}</p>

                          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                            <div className="rounded-lg bg-[#080d1f] p-2 border border-slate-800">
                              <div className="text-[10px] text-slate-400">Công Kích</div>
                              <div className="font-mono-nums text-xs font-black text-amber-300">
                                +{Math.round(stats.atkPct * 100)}%
                              </div>
                            </div>
                            <div className="rounded-lg bg-[#080d1f] p-2 border border-slate-800">
                              <div className="text-[10px] text-slate-400">Sinh Lực</div>
                              <div className="font-mono-nums text-xs font-black text-emerald-300">
                                +{Math.round(stats.hpPct * 100)}%
                              </div>
                            </div>
                            <div className="rounded-lg bg-[#080d1f] p-2 border border-slate-800">
                              <div className="text-[10px] text-slate-400">Tốc Bắn</div>
                              <div className="font-mono-nums text-xs font-black text-sky-300">
                                +{Math.round(stats.aspd * 100)}%
                              </div>
                            </div>
                            <div className="rounded-lg bg-[#080d1f] p-2 border border-slate-800">
                              <div className="text-[10px] text-slate-400">Chí Mạng</div>
                              <div className="font-mono-nums text-xs font-black text-rose-300">
                                +{(stats.crit * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          {isUnlocked ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playUiClick(1.05);
                                  onEquipWing(wing.id);
                                }}
                                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                                  isEquipped
                                    ? 'bg-emerald-500/20 border border-emerald-400/60 text-emerald-200'
                                    : 'a2-slate-btn text-white'
                                }`}
                              >
                                {isEquipped ? 'Đang Đeo 3D' : 'Đeo Cánh 3D'}
                              </button>
                              <button
                                type="button"
                                disabled={isMax || !canAffordUpgrade}
                                onClick={() => {
                                  soundEngine.playUiClick(1.15);
                                  onUnlockOrUpgradeWing(wing.id);
                                }}
                                className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                                  isMax
                                    ? 'bg-slate-800 text-amber-300 cursor-default'
                                    : canAffordUpgrade
                                    ? 'a2-gold-btn text-slate-950'
                                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                }`}
                              >
                                {isMax
                                  ? 'Tối Đa 5★'
                                  : `Tăng ${star + 1}★ (${upgCost.feathers} Lông Vũ)`}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={!canAffordUnlock}
                              onClick={() => {
                                soundEngine.playUiClick(1.15);
                                onUnlockOrUpgradeWing(wing.id);
                              }}
                              className={`w-full py-2.5 px-4 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                                canAffordUnlock
                                  ? 'a2-gold-btn text-slate-950'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              Mở Khóa ({wing.unlockFeathers} Lông Vũ
                              {wing.unlockGems > 0 ? ` + ${wing.unlockGems} Ngọc` : ''})
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

          {/* TAB 2: ASTRAL DICE BOARD (16-TILE PERIMETER RING) */}
          {tab === 'board' && (
            <div className="space-y-5">
              {/* Board Grid + Center Command Hub */}
              <div className="grid grid-cols-5 gap-2 sm:gap-2.5 max-w-3xl mx-auto">
                {Array.from({ length: 25 }).map((_, cellIdx) => {
                  const row = Math.floor(cellIdx / 5);
                  const col = cellIdx % 5;

                  // Center 3x3 area renders once at (row=1, col=1)
                  if (row >= 1 && row <= 3 && col >= 1 && col <= 3) {
                    if (row === 1 && col === 1) {
                      return (
                        <div
                          key="board-center"
                          className="col-span-3 row-span-3 rounded-2xl border border-amber-400/35 bg-[#0c142e] p-3 sm:p-4 flex flex-col justify-between gap-2.5"
                        >
                          <div className="text-center">
                            <div className="text-[11px] font-bold text-amber-300">
                              Vòng hoàn thành: <span className="font-mono-nums">{board.lapsCompleted}</span> · Tổng lượt: <span className="font-mono-nums">{board.totalRolls}</span>
                            </div>
                            <div className="mt-1 text-xs text-slate-200 leading-snug min-h-[2.4rem] flex items-center justify-center">
                              {board.lastLog}
                            </div>
                            {board.doubleNext && (
                              <div className="mt-1 text-[11px] font-black text-emerald-300">
                                Đang kích hoạt X2 Phần Thưởng Bước Kế Tiếp
                              </div>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              disabled={board.normalDice <= 0}
                              onClick={() => {
                                soundEngine.playUiClick(1.15);
                                setGoldenPickerOpen(false);
                                onRollAstralDice();
                              }}
                              className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                                board.normalDice > 0
                                  ? 'a2-emerald-btn text-slate-950'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              <Dices className="w-4 h-4 shrink-0" />
                              <span>Tung ({board.normalDice})</span>
                            </button>

                            <button
                              type="button"
                              disabled={board.goldenDice <= 0}
                              onClick={() => {
                                soundEngine.playUiClick(1.1);
                                setGoldenPickerOpen((v) => !v);
                              }}
                              className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                                board.goldenDice > 0
                                  ? 'a2-gold-btn text-slate-950'
                                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              <Sparkles className="w-4 h-4 shrink-0" />
                              <span>Xúc Xắc Vàng ({board.goldenDice})</span>
                            </button>
                          </div>

                          {goldenPickerOpen && board.goldenDice > 0 && (
                            <div className="rounded-xl bg-[#070b1a] border border-amber-300/60 p-2">
                              <div className="text-[10px] font-bold text-amber-200 text-center mb-1.5">
                                Chọn chính xác số bước (1 – 6):
                              </div>
                              <div className="grid grid-cols-6 gap-1">
                                {[1, 2, 3, 4, 5, 6].map((n) => (
                                  <button
                                    key={n}
                                    type="button"
                                    onClick={() => {
                                      soundEngine.playUiClick(1.2);
                                      setGoldenPickerOpen(false);
                                      onRollAstralDice(n);
                                    }}
                                    className="py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono-nums text-xs font-black cursor-pointer"
                                  >
                                    {n}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1 border-t border-slate-800">
                            {!board.dailyFreeClaimed && (
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playUiClick(1.1);
                                  onClaimDailyFreeDice();
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-400/60 text-emerald-200 text-[11px] font-black whitespace-nowrap cursor-pointer"
                              >
                                Nhận +2 Xúc Xắc Miễn Phí
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={save.gems < ASTRAL_DICE_BUY_COST_GEMS}
                              onClick={() => {
                                soundEngine.playUiClick(1.0);
                                onBuyAstralDice('normal');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-[#141d3d] border border-slate-700 text-slate-200 hover:text-white text-[11px] font-bold whitespace-nowrap cursor-pointer disabled:opacity-45"
                            >
                              +1 Xúc Xắc ({ASTRAL_DICE_BUY_COST_GEMS} Ngọc)
                            </button>
                            <button
                              type="button"
                              disabled={save.gems < ASTRAL_GOLDEN_DICE_COST_GEMS}
                              onClick={() => {
                                soundEngine.playUiClick(1.0);
                                onBuyAstralDice('golden');
                              }}
                              className="px-2.5 py-1.5 rounded-lg bg-[#141d3d] border border-amber-400/40 text-amber-200 hover:text-amber-100 text-[11px] font-bold whitespace-nowrap cursor-pointer disabled:opacity-45"
                            >
                              +1 Xúc Xắc Vàng ({ASTRAL_GOLDEN_DICE_COST_GEMS} Ngọc)
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }

                  const tileIdx = BOARD_COORDS.findIndex(([r, c]) => r === row && c === col);
                  const tile = ASTRAL_BOARD_TILES[tileIdx];
                  if (!tile) return null;
                  const isHere = board.position === tile.index;

                  return (
                    <div
                      key={tile.index}
                      className={`relative rounded-xl border p-2 min-h-[68px] sm:min-h-[76px] flex flex-col items-center justify-center text-center transition-transform ${
                        tile.accentClass
                      } ${isHere ? 'ring-2 ring-amber-300 scale-[1.03] z-10' : ''}`}
                    >
                      <span className="absolute top-1 left-1.5 text-[9px] font-mono-nums opacity-65">
                        #{tile.index + 1}
                      </span>
                      {isHere && (
                        <span className="absolute top-1 right-1.5 text-[10px] font-black text-amber-200">
                          ★ BẠN
                        </span>
                      )}
                      <span className="text-[11px] sm:text-xs font-black leading-tight mt-1">
                        {tile.shortLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* 4 Lap Milestones */}
              <div>
                <h3 className="font-display text-sm font-black text-white mb-2.5 flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-300" />
                  <span>Rương Mốc Hoàn Thành Vòng Tinh Tú</span>
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {ASTRAL_BOARD_LAP_MILESTONES.map((ms) => {
                    const claimed = board.claimedLapMilestones.includes(ms.lapsTarget);
                    const ready = !claimed && board.lapsCompleted >= ms.lapsTarget;
                    return (
                      <div
                        key={ms.lapsTarget}
                        className={`rounded-2xl p-3.5 border flex flex-col justify-between gap-2 ${
                          ready
                            ? 'border-emerald-400/70 bg-emerald-950/30'
                            : 'border-slate-700/70 bg-[#0c1228]'
                        }`}
                      >
                        <div>
                          <div className="text-xs font-black text-white">{ms.title}</div>
                          <div className="text-[11px] text-slate-300 font-mono-nums mt-1">
                            +{ms.rewardGems} Ngọc · +{ms.rewardMythicShards} Mảnh Thần · +{ms.rewardFeathers} Lông Vũ · +{ms.rewardGoldenDice} Xúc Xắc Vàng
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!ready}
                          onClick={() => {
                            soundEngine.playUiClick(1.1);
                            onClaimAstralLapMilestone(ms.lapsTarget);
                          }}
                          className={`w-full py-2 rounded-lg text-xs font-black whitespace-nowrap cursor-pointer ${
                            claimed
                              ? 'bg-slate-800/80 text-slate-500 cursor-default'
                              : ready
                              ? 'a2-emerald-btn text-slate-950'
                              : 'bg-slate-800/60 text-slate-400 cursor-not-allowed'
                          }`}
                        >
                          {claimed
                            ? 'Đã Nhận'
                            : ready
                            ? 'Nhận Thưởng Vòng'
                            : `${board.lapsCompleted}/${ms.lapsTarget} Vòng`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ZODIAC RELICS VAULT & ROYAL 3D FLOATING TITLES */}
          {tab === 'relics' && (
            <div className="space-y-6">
              {/* Zodiac Relics Section */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-display text-base font-black text-white">
                      Kho Cổ Vật Hoàng Đạo ({relicBonus.unlockedCount}/{ZODIAC_RELIC_DEFS.length} Đã Khai Mở)
                    </h3>
                    <div className="text-xs text-slate-300 font-mono-nums mt-0.5">
                      Tổng cộng dồn: +{Math.round(relicBonus.atkPct * 100)}% Công · +{Math.round(relicBonus.hpPct * 100)}% Máu · +{(relicBonus.crit * 100).toFixed(1)}% Crit · +{Math.round(relicBonus.bossDmg * 100)}% ST Boss
                    </div>
                  </div>
                  <div className="text-xs font-mono-nums font-black text-violet-300">
                    Tinh Hoa Cổ Vật: {relics.essence}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {ZODIAC_RELIC_DEFS.map((def) => {
                    const lv = relics.levels[def.id] ?? 0;
                    const isMax = lv >= ZODIAC_RELIC_MAX_STAR;
                    const cost = getZodiacRelicUpgradeCost(lv, def);
                    const canAfford = !isMax && relics.essence >= cost.essence && save.gold >= cost.gold;

                    return (
                      <div
                        key={def.id}
                        className={`rounded-2xl p-4 border flex flex-col justify-between gap-3 ${
                          lv > 0
                            ? 'border-violet-400/50 bg-[#111734]'
                            : 'border-slate-700/75 bg-[#0c1228]'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-bold" style={{ color: def.accentHex }}>
                              {def.zodiacLabel} · {def.rarity}
                            </span>
                            <span className="font-mono-nums text-xs font-black text-amber-300">
                              {lv > 0 ? `${lv}★ / ${ZODIAC_RELIC_MAX_STAR}★` : 'Chưa mở'}
                            </span>
                          </div>
                          <h4 className="font-display text-sm font-black text-white mt-1">{def.name}</h4>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">{def.desc}</p>
                          <div className="mt-2.5 text-[11px] font-mono-nums text-slate-200">
                            +{Math.round((def.baseAtkPct + Math.max(0, lv - 1) * def.atkPctPerLv) * 100)}% Công · +
                            {Math.round((def.baseHpPct + Math.max(0, lv - 1) * def.hpPctPerLv) * 100)}% Máu · +
                            {Math.round((def.baseBossDmg + Math.max(0, lv - 1) * 0.015) * 100)}% Boss
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={isMax || !canAfford}
                          onClick={() => {
                            soundEngine.playUiClick(1.12);
                            onUpgradeZodiacRelic(def.id);
                          }}
                          className={`w-full py-2.5 px-3 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                            isMax
                              ? 'bg-slate-800 text-amber-300 cursor-default'
                              : canAfford
                              ? 'a2-gold-btn text-slate-950'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {isMax
                            ? 'Cổ Vật Tối Đa 5★'
                            : lv === 0
                            ? `Khai Mở (${cost.essence} Cổ Vật · ${cost.gold} Vàng)`
                            : `Tăng ${lv + 1}★ (${cost.essence} Cổ Vật · ${cost.gold} Vàng)`}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Royal 3D Floating Titles Section */}
              <div className="pt-4 border-t border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h3 className="font-display text-base font-black text-white">
                      Danh Hiệu Động 3D Trên Đầu Anh Hùng
                    </h3>
                    <div className="text-xs text-slate-300 font-mono-nums mt-0.5">
                      Cộng dồn từ Danh Hiệu: +{titleBonus.atk} Công · +{titleBonus.hp} Máu · +{(titleBonus.crit * 100).toFixed(1)}% Crit
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(1.15);
                      onReplayEntranceVfx();
                    }}
                    className="px-3.5 py-2 rounded-xl bg-amber-400/15 border border-amber-300/60 text-amber-200 hover:bg-amber-400/25 text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Phát Lại Xuất Hiện Hoàng Gia</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ROYAL_3D_TITLE_DEFS.map((t) => {
                    const isUnlocked = unlockedTitles.includes(t.id);
                    const isEquipped = equippedTitle === t.id;
                    const canBuy = !isUnlocked && save.gems >= t.unlockGems;

                    return (
                      <div
                        key={t.id}
                        className={`rounded-2xl p-3.5 border flex flex-col justify-between gap-3 ${
                          isEquipped
                            ? `${t.borderClass} bg-[#131d40]`
                            : 'border-slate-700/75 bg-[#0c1228]'
                        }`}
                      >
                        <div>
                          <div className="text-[10px] font-bold text-slate-400">{t.subLabel}</div>
                          <div
                            className={`font-display text-base font-black bg-gradient-to-r ${t.gradientClass} bg-clip-text text-transparent mt-0.5`}
                          >
                            {t.label}
                          </div>
                          <div className="mt-2 text-[11px] font-mono-nums text-slate-300">
                            +{t.atkBonus} Công · +{t.hpBonus} Máu · +{(t.critBonus * 100).toFixed(1)}% Crit
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400">{t.unlockMethodLabel}</div>
                        </div>

                        <button
                          type="button"
                          disabled={!isUnlocked && !canBuy}
                          onClick={() => {
                            soundEngine.playUiClick(1.1);
                            onUnlockOrEquipRoyalTitle(t.id);
                          }}
                          className={`w-full py-2 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 ${
                            isEquipped
                              ? 'bg-emerald-500/20 border border-emerald-400/60 text-emerald-200'
                              : isUnlocked
                              ? 'a2-slate-btn text-white'
                              : canBuy
                              ? 'a2-gold-btn text-slate-950'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {isEquipped ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Đang Bay Trên Đầu 3D</span>
                            </>
                          ) : isUnlocked ? (
                            <span>Đeo Danh Hiệu 3D</span>
                          ) : (
                            <span>Mở Khóa ({t.unlockGems} Ngọc)</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

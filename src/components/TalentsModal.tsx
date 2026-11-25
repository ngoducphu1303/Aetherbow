import React from 'react';
import {
  ArrowUpCircle,
  Coins,
  Crosshair,
  Crown,
  Heart,
  Leaf,
  Lock,
  Shield,
  Sparkles,
  Sword,
  Target,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import {
  PARAGON_INFUSION_CHAPTER_THRESHOLD,
  PARAGON_INFUSION_MAX_LEVEL,
  PARAGON_INFUSION_TALENT_THRESHOLD,
  TALENTS,
  computeParagonInfusionBonuses,
  getParagonInfusionCost,
  getParagonInfusionLevel,
  getTalentLevel,
  getTalentUpgradeCost,
  getTotalTalentLevels,
  isParagonInfusionUnlocked,
} from '../data/talentsData';
import { ComputedPlayerStats, SaveData, TalentId } from '../types/game';
import { GoldCoinIcon } from './GameIcons';

interface TalentsModalProps {
  save: SaveData;
  stats: ComputedPlayerStats;
  onUpgradeTalent: (id: TalentId) => void;
  onUpgradeParagonInfusion: () => void;
  onClose: () => void;
}

const TalentNodeIcon: React.FC<{ id: TalentId; className?: string }> = ({
  id,
  className = 'w-5 h-5',
}) => {
  switch (id) {
    case 'might':
      return <Sword className={className} />;
    case 'vitality':
      return <Heart className={className} />;
    case 'swift_bow':
      return <Crosshair className={className} />;
    case 'eagle_eye':
      return <Target className={className} />;
    case 'iron_skin':
      return <Shield className={className} />;
    case 'wind_step':
      return <Wind className={className} />;
    case 'soul_regen':
      return <Leaf className={className} />;
    case 'fortune':
      return <Coins className={className} />;
  }
};

export const TalentsModal: React.FC<TalentsModalProps> = ({
  save,
  stats,
  onUpgradeTalent,
  onUpgradeParagonInfusion,
  onClose,
}) => {
  const totalLevels = getTotalTalentLevels(save.talents);
  const maxTotal = TALENTS.reduce((sum, t) => sum + t.maxLevel, 0);
  const masteryPct = Math.round((totalLevels / Math.max(1, maxTotal)) * 100);

  const paragonUnlocked = isParagonInfusionUnlocked(save.talents, save.highestChapterCleared);
  const paragonLevel = getParagonInfusionLevel(save.paragonInfusionLevel);
  const paragonMaxed = paragonLevel >= PARAGON_INFUSION_MAX_LEVEL;
  const paragonCost = getParagonInfusionCost(paragonLevel);
  const paragonBonuses = computeParagonInfusionBonuses(paragonLevel);
  const canUpgradeParagon = paragonUnlocked && !paragonMaxed && save.gold >= paragonCost;

  let cheapestTalent: { id: TalentId; name: string; cost: number } | null = null;
  for (const t of TALENTS) {
    const lv = getTalentLevel(save.talents, t.id);
    if (lv >= t.maxLevel) continue;
    const cost = getTalentUpgradeCost(t.id, lv);
    if (!cheapestTalent || cost < cheapestTalent.cost) {
      cheapestTalent = { id: t.id, name: t.name, cost };
    }
  }
  const canUpgradeCheapest = cheapestTalent !== null && save.gold >= cheapestTalent.cost;

  return (
    <div className="pointer-events-auto fixed inset-0 z-40 bg-[#040611]/88 flex items-center justify-center p-3 sm:p-5">
      <div className="cel-panel-ornate w-full max-w-3xl max-h-[90vh] rounded-3xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-6 py-4 bg-[#101836] border-b border-amber-400/35 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-300/60 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-base sm:text-xl font-black text-white truncate">
                Bảng Thiên Phú Hoàng Đạo
              </h2>
              <div className="text-[11px] font-semibold text-slate-300 flex flex-wrap items-center gap-2">
                <span>
                  Tinh Tú{' '}
                  <strong className="font-mono-nums text-amber-300">
                    {totalLevels}/{maxTotal} ({masteryPct}%)
                  </strong>
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>
                  Lực Chiến{' '}
                  <strong className="font-mono-nums text-emerald-300">
                    {stats.powerRating.toLocaleString('vi-VN')}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5 bg-[#070b1a] border border-amber-400/45 px-3 py-1.5 rounded-xl text-xs font-mono-nums font-black text-amber-300">
              <GoldCoinIcon className="w-4 h-4 shrink-0" />
              <span>{save.gold.toLocaleString('vi-VN')}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng bảng thiên phú"
              className="cel-panel w-9 h-9 rounded-xl flex items-center justify-center text-slate-200 hover:border-amber-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary & Smart Upgrade Bar */}
        <div className="px-4 sm:px-6 py-3 bg-[#090e22] border-b border-amber-400/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex-1 min-w-[200px] space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-mono-nums">
              <span className="text-slate-300 font-semibold">
                ATK {stats.attack.toLocaleString('vi-VN')} · HP {stats.maxHp.toLocaleString('vi-VN')} · Crit {Math.round(stats.critChance * 100)}%
              </span>
              <span className="text-amber-300 font-black">{masteryPct}% Chòm Sao</span>
            </div>
            <div className="h-1.5 rounded-full bg-slate-900 border border-amber-400/20 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-300 via-yellow-400 to-emerald-400 transition-all"
                style={{ width: `${masteryPct}%` }}
              />
            </div>
          </div>

          {cheapestTalent ? (
            <button
              type="button"
              disabled={!canUpgradeCheapest}
              onClick={() => onUpgradeTalent(cheapestTalent!.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                canUpgradeCheapest
                  ? 'a2-emerald-btn'
                  : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span className="font-mono-nums">
                Nâng Nhanh · {cheapestTalent.cost.toLocaleString('vi-VN')} Vàng
              </span>
            </button>
          ) : (
            paragonUnlocked && !paragonMaxed && (
              <button
                type="button"
                disabled={!canUpgradeParagon}
                onClick={onUpgradeParagonInfusion}
                className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer shrink-0 ${
                  canUpgradeParagon
                    ? 'a2-emerald-btn'
                    : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Crown className="w-3.5 h-3.5 shrink-0" />
                <span className="font-mono-nums">
                  Tinh Luyện · {paragonCost.toLocaleString('vi-VN')} Vàng
                </span>
              </button>
            )
          )}
        </div>

        {/* 8 Talent Cards + Endgame Astral Paragon Infusion Sink */}
        <div className="flex-1 a2-gear-vault-bg overflow-y-auto a2-scroll p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {TALENTS.map((talent) => {
            const level = getTalentLevel(save.talents, talent.id);
            const isMax = level >= talent.maxLevel;
            const cost = getTalentUpgradeCost(talent.id, level);
            const canAfford = !isMax && save.gold >= cost;
            const isCheapest = cheapestTalent?.id === talent.id && canAfford;

            return (
              <div
                key={talent.id}
                className={`rounded-2xl p-4 flex flex-col justify-between gap-3 ${
                  isCheapest ? 'cel-panel-ornate' : 'cel-panel'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-xl bg-gradient-to-b from-[#1e2b5c] to-[#0e1530] border border-amber-300/50 flex items-center justify-center text-amber-300 shrink-0 shadow-inner">
                        <TalentNodeIcon id={talent.id} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-display text-sm font-black text-white truncate">
                          {talent.name}
                        </h3>
                        <div className="text-[11px] font-bold text-emerald-300">
                          {talent.perLevelLabel}
                        </div>
                      </div>
                    </div>

                    <span className="font-mono-nums text-xs font-black text-amber-300 shrink-0">
                      Lv.{level}/{talent.maxLevel}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                    {talent.desc}
                  </p>
                </div>

                <div>
                  {/* 20-pip Constellation Bar */}
                  <div className="grid grid-cols-10 gap-1 mb-3">
                    {Array.from({ length: talent.maxLevel }).map((_, idx) => (
                      <span
                        key={idx}
                        className={`h-1.5 rounded-full ${
                          idx < level
                            ? 'bg-gradient-to-r from-amber-300 to-yellow-500'
                            : 'bg-slate-800/90'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    disabled={!canAfford}
                    onClick={() => onUpgradeTalent(talent.id)}
                    className={`w-full py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      isMax
                        ? 'bg-emerald-950/70 border border-emerald-500/45 text-emerald-300 cursor-default'
                        : canAfford
                        ? 'a2-yellow-btn'
                        : 'bg-slate-900/90 border border-slate-700/80 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {isMax ? (
                      <span>Đã Đạt Tối Đa</span>
                    ) : (
                      <>
                        <ArrowUpCircle className="w-3.5 h-3.5 shrink-0" />
                        <span className="font-mono-nums">
                          Nâng Cấp · {cost.toLocaleString('vi-VN')} Vàng
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}

          {/* Endgame Gold Sink: Tinh Tuý Hoàng Đạo (Astral Paragon Infusion) */}
          <div
            data-testid="paragon-infusion-card"
            className={`sm:col-span-2 rounded-2xl p-4 sm:p-5 flex flex-col gap-3 ${
              paragonUnlocked ? 'cel-panel-ornate' : 'cel-panel opacity-90'
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-11 h-11 rounded-xl border flex items-center justify-center shrink-0 ${
                    paragonUnlocked
                      ? 'bg-amber-400/15 border-amber-300/65 text-amber-300'
                      : 'bg-slate-900 border-slate-700 text-slate-400'
                  }`}
                >
                  {paragonUnlocked ? <Crown className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-sm sm:text-base font-black text-white">
                    Tinh Tuý Hoàng Đạo (Đỉnh Phong)
                  </h3>
                  <div className="text-[11px] font-bold text-amber-300 font-mono-nums">
                    +0.4% ATK · +0.4% Max HP · +0.2% Sát Thương Boss / bậc
                  </div>
                </div>
              </div>

              <span className="font-mono-nums text-xs font-black text-amber-300 shrink-0">
                Bậc {paragonLevel}/{PARAGON_INFUSION_MAX_LEVEL}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {paragonUnlocked
                ? 'Chuyển hóa Vàng dư ở giai đoạn Endgame thành tinh tuý vĩnh viễn cho toàn bộ Anh Hùng khi chinh phục Tháp Vô Tận và Chương 12.'
                : `Mở khóa khi đạt ${PARAGON_INFUSION_TALENT_THRESHOLD}/${PARAGON_INFUSION_TALENT_THRESHOLD} cấp Thiên Phú hoặc vượt Chương ${PARAGON_INFUSION_CHAPTER_THRESHOLD} (hiện tại: ${totalLevels}/${PARAGON_INFUSION_TALENT_THRESHOLD} Thiên Phú · Chương ${save.highestChapterCleared}/${PARAGON_INFUSION_CHAPTER_THRESHOLD}).`}
            </p>

            <div className="grid grid-cols-3 gap-2 text-center bg-[#070b1a] border border-amber-400/20 rounded-xl p-2.5 font-mono-nums">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">ATK Cộng Thêm</div>
                <div className="text-xs sm:text-sm font-black text-amber-300">
                  +{(paragonBonuses.atkPct * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">HP Cộng Thêm</div>
                <div className="text-xs sm:text-sm font-black text-emerald-300">
                  +{(paragonBonuses.hpPct * 100).toFixed(1)}%
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-bold">Sát Thương Boss</div>
                <div className="text-xs sm:text-sm font-black text-rose-300">
                  +{(paragonBonuses.bossDmgBonus * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            <button
              type="button"
              disabled={!canUpgradeParagon}
              onClick={onUpgradeParagonInfusion}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                !paragonUnlocked
                  ? 'bg-slate-900/90 border border-slate-700/80 text-slate-400 cursor-not-allowed'
                  : paragonMaxed
                  ? 'bg-emerald-950/70 border border-emerald-500/45 text-emerald-300 cursor-default'
                  : canUpgradeParagon
                  ? 'a2-yellow-btn'
                  : 'bg-slate-900/90 border border-slate-700/80 text-slate-500 cursor-not-allowed'
              }`}
            >
              {!paragonUnlocked ? (
                <>
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>Cần 160/160 Thiên Phú hoặc Chương 12</span>
                </>
              ) : paragonMaxed ? (
                <span>Đã Đạt Bậc Tối Đa ({PARAGON_INFUSION_MAX_LEVEL})</span>
              ) : (
                <>
                  <Crown className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-mono-nums">
                    Tinh Luyện Bậc {paragonLevel + 1} · {paragonCost.toLocaleString('vi-VN')} Vàng
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


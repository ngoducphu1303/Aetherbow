import React from 'react';
import {
  ArrowUpCircle,
  Coins,
  Crosshair,
  Heart,
  Leaf,
  Shield,
  Sparkles,
  Sword,
  Target,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import {
  TALENTS,
  getTalentLevel,
  getTalentUpgradeCost,
  getTotalTalentLevels,
} from '../data/talentsData';
import { ComputedPlayerStats, SaveData, TalentId } from '../types/game';
import { GoldCoinIcon } from './GameIcons';

interface TalentsModalProps {
  save: SaveData;
  stats: ComputedPlayerStats;
  onUpgradeTalent: (id: TalentId) => void;
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
  onClose,
}) => {
  const totalLevels = getTotalTalentLevels(save.talents);
  const maxTotal = TALENTS.reduce((sum, t) => sum + t.maxLevel, 0);
  const masteryPct = Math.round((totalLevels / Math.max(1, maxTotal)) * 100);

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
                    {stats.powerRating}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5 bg-[#070b1a] border border-amber-400/45 px-3 py-1.5 rounded-xl text-xs font-mono-nums font-black text-amber-300">
              <GoldCoinIcon className="w-4 h-4 shrink-0" />
              <span>{save.gold}</span>
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
                ATK {stats.attack} · HP {stats.maxHp} · Crit {Math.round(stats.critChance * 100)}%
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

          {cheapestTalent && (
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
                Nâng Nhanh · {cheapestTalent.cost} Vàng
              </span>
            </button>
          )}
        </div>

        {/* 8 Talent Cards over Celestial Tapestry */}
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
                  {/* 10-pip Constellation Bar */}
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
                        <span className="font-mono-nums">Nâng Cấp · {cost} Vàng</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

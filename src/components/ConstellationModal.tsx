import React, { useState } from 'react';
import { Check, Flame, Shield, Sparkles, Star, Wind, Droplets, X } from 'lucide-react';
import constellationAtlasArt from '../assets/images/zodiac_constellation_atlas_1795004416174.jpg';
import { soundEngine } from '../audio/soundEngine';
import {
  CONSTELLATIONS,
  CONSTELLATION_ELEMENT_META,
  CONSTELLATION_MAP,
  MAX_CONSTELLATION_LEVEL,
  computeConstellationBonuses,
  getConstellationUpgradeCost,
} from '../data/wave6Data';
import { ConstellationElement, ConstellationId, SaveData } from '../types/game';
import { GoldCoinIcon, StarDustIcon } from './GameIcons';

interface ConstellationModalProps {
  save: SaveData;
  onUpgradeConstellation: (id: ConstellationId) => void;
  onClose: () => void;
}

const ElementIcon: React.FC<{ element: ConstellationElement; className?: string }> = ({
  element,
  className = 'w-4 h-4',
}) => {
  switch (element) {
    case 'fire':
      return <Flame className={className} />;
    case 'earth':
      return <Shield className={className} />;
    case 'air':
      return <Wind className={className} />;
    case 'water':
      return <Droplets className={className} />;
  }
};

export const ConstellationModal: React.FC<ConstellationModalProps> = ({
  save,
  onUpgradeConstellation,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<ConstellationId>('leo');
  const [atlasErr, setAtlasErr] = useState(false);

  const summary = computeConstellationBonuses(save.constellations);
  const selectedDef = CONSTELLATION_MAP[selectedId] ?? CONSTELLATIONS[0];
  const curLv = summary.levels[selectedDef.id] ?? 0;
  const isMax = curLv >= MAX_CONSTELLATION_LEVEL;
  const cost = getConstellationUpgradeCost(curLv);
  const currentDust = save.starDust ?? 0;
  const canAfford = !isMax && currentDust >= cost.starDust && save.gold >= cost.gold;
  const elMeta = CONSTELLATION_ELEMENT_META[selectedDef.element];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/90 overflow-y-auto">
      <div className="cel-panel-ornate w-full max-w-5xl rounded-3xl p-4 sm:p-6 my-auto max-h-[92vh] overflow-y-auto a2-scroll a2-modal-enter">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-amber-300/60 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-black text-white truncate">
                Bản Đồ 12 Chòm Sao Hoàng Đạo
              </h2>
              <p className="text-[11px] text-slate-300 truncate">
                Thắp sáng từng cung sao để cộng dồn sức mạnh vĩnh viễn &amp; thắp sáng Bệ Tinh Tú 3D tại sảnh.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-[#070b1a] border border-sky-400/35 text-xs font-mono-nums font-black text-sky-200 flex items-center gap-1.5">
              <StarDustIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{currentDust}</span>
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-[#070b1a] border border-amber-400/35 text-xs font-mono-nums font-black text-amber-200 flex items-center gap-1.5">
              <GoldCoinIcon className="w-3.5 h-3.5 shrink-0" />
              <span>{save.gold}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng Bản Đồ 12 Chòm Sao"
              className="a2-slate-btn w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Main Celestial Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch mb-4">
          {/* Left: Interactive 12-Node Orbital Constellation Chart */}
          <div className="lg:col-span-7 relative rounded-3xl overflow-hidden border border-amber-400/40 bg-[#050817] min-h-[340px] sm:min-h-[380px] flex items-center justify-center p-4">
            {!atlasErr && (
              <img
                src={constellationAtlasArt}
                alt="Tinh Đồ 12 Chòm Sao"
                referrerPolicy="no-referrer"
                onError={() => setAtlasErr(true)}
                className="absolute inset-0 w-full h-full object-cover opacity-50 pointer-events-none"
              />
            )}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  'radial-gradient(circle at center, rgba(10,16,38,0.35) 0%, rgba(4,6,17,0.88) 85%)',
              }}
            />

            {/* Orbital Ring */}
            <div className="relative w-[290px] h-[290px] sm:w-[340px] sm:h-[340px] shrink-0">
              <div className="absolute inset-7 rounded-full border border-amber-300/30 pointer-events-none" />
              <div className="absolute inset-16 rounded-full border border-dashed border-sky-300/25 pointer-events-none" />

              {/* Center Star Summary */}
              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center w-36 pointer-events-none">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                  Tổng Sao
                </div>
                <div className="font-mono-nums text-2xl sm:text-3xl font-black text-white drop-shadow">
                  {summary.totalStars}/60★
                </div>
                <div className="text-[10px] font-mono-nums text-sky-200 font-bold mt-0.5">
                  +{summary.atkFlat} ATK · +{summary.hpFlat} HP
                </div>
              </div>

              {/* 12 Interactive Star Nodes */}
              {CONSTELLATIONS.map((c) => {
                const lv = summary.levels[c.id] ?? 0;
                const isSel = c.id === selectedDef.id;
                const meta = CONSTELLATION_ELEMENT_META[c.element];
                const rad = ((c.angleDeg - 90) * Math.PI) / 180;
                const radiusPct = 42;
                const leftPct = 50 + radiusPct * Math.cos(rad);
                const topPct = 50 + radiusPct * Math.sin(rad);

                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick(1.06);
                      setSelectedId(c.id);
                    }}
                    style={{
                      left: `${leftPct}%`,
                      top: `${topPct}%`,
                      borderColor: isSel ? '#fde047' : lv > 0 ? meta.colorHex : 'rgba(148,163,184,0.35)',
                      boxShadow: isSel
                        ? `0 0 20px ${meta.colorHex}`
                        : lv > 0
                        ? `0 0 10px ${meta.colorHex}66`
                        : undefined,
                    }}
                    className={`absolute -translate-x-1/2 -translate-y-1/2 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 flex flex-col items-center justify-center transition-transform cursor-pointer ${
                      isSel
                        ? 'scale-110 bg-[#121a3b] z-10'
                        : lv > 0
                        ? 'bg-[#0b122c]/95 hover:scale-105'
                        : 'bg-[#070b18]/90 hover:scale-105'
                    }`}
                    title={`${c.name} (${lv}/5★)`}
                  >
                    <span
                      className="text-base sm:text-lg leading-none font-black"
                      style={{ color: lv > 0 || isSel ? meta.colorHex : '#94a3b8' }}
                    >
                      {c.symbol}
                    </span>
                    <span className="font-mono-nums text-[9px] font-black text-white mt-0.5 leading-none">
                      {lv}★
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Constellation Detail + Upgrade */}
          <div className="lg:col-span-5 cel-panel rounded-3xl p-4 sm:p-5 flex flex-col justify-between gap-4 border border-amber-400/35">
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span
                  className="px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5"
                  style={{
                    color: elMeta.colorHex,
                    borderColor: `${elMeta.colorHex}66`,
                    backgroundColor: 'rgba(7, 11, 26, 0.9)',
                  }}
                >
                  <ElementIcon element={selectedDef.element} className="w-3.5 h-3.5" />
                  <span>Hệ {selectedDef.elementLabel} · {elMeta.label}</span>
                </span>
                <span className="font-mono-nums text-xs font-black text-amber-300">
                  Cấp {curLv}/{MAX_CONSTELLATION_LEVEL}★
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div
                  className="w-14 h-14 rounded-2xl border-2 flex items-center justify-center text-3xl font-black shrink-0 bg-[#060917]"
                  style={{ borderColor: elMeta.colorHex, color: elMeta.colorHex }}
                >
                  {selectedDef.symbol}
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-xl font-black text-white truncate">
                    Chòm Sao {selectedDef.name}
                  </h3>
                  <div className="flex items-center gap-1 mt-1">
                    {Array.from({ length: MAX_CONSTELLATION_LEVEL }).map((_, idx) => (
                      <Star
                        key={idx}
                        className={`w-4 h-4 ${
                          idx < curLv ? 'text-amber-300 fill-amber-300' : 'text-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Current Bonus vs Per-Star */}
              <div className="rounded-2xl bg-[#060916] border border-slate-800 p-3.5 space-y-2 text-xs font-mono-nums">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans font-semibold">Thuộc tính mỗi ★</span>
                  <span className="text-sky-300 font-black">{selectedDef.elementBonusLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans font-semibold">Tấn Công hiện tại</span>
                  <span className="text-amber-300 font-black">
                    +{selectedDef.atkPerStar * curLv} ATK
                    {!isMax && (
                      <span className="text-emerald-300"> (+{selectedDef.atkPerStar})</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-sans font-semibold">Sinh Lực hiện tại</span>
                  <span className="text-emerald-300 font-black">
                    +{selectedDef.hpPerStar * curLv} HP
                    {!isMax && (
                      <span className="text-sky-300"> (+{selectedDef.hpPerStar})</span>
                    )}
                  </span>
                </div>
                {selectedDef.critPerStar > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-sans font-semibold">Tỷ lệ Chí Mạng</span>
                    <span className="text-purple-300 font-black">
                      +{(selectedDef.critPerStar * curLv * 100).toFixed(1)}%
                      {!isMax && ` (+${(selectedDef.critPerStar * 100).toFixed(1)}%)`}
                    </span>
                  </div>
                )}
                {selectedDef.aspdPerStar > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-sans font-semibold">Tốc Độ Bắn</span>
                    <span className="text-cyan-300 font-black">
                      +{(selectedDef.aspdPerStar * curLv * 100).toFixed(1)}%
                      {!isMax && ` (+${(selectedDef.aspdPerStar * 100).toFixed(1)}%)`}
                    </span>
                  </div>
                )}
                {selectedDef.drPerStar > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-sans font-semibold">Giảm Sát Thương</span>
                    <span className="text-emerald-300 font-black">
                      +{(selectedDef.drPerStar * curLv * 100).toFixed(1)}%
                      {!isMax && ` (+${(selectedDef.drPerStar * 100).toFixed(1)}%)`}
                    </span>
                  </div>
                )}
                {selectedDef.goldPerStar > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-sans font-semibold">Vàng Rơi Thêm</span>
                    <span className="text-amber-200 font-black">
                      +{Math.round(selectedDef.goldPerStar * curLv * 100)}%
                      {!isMax && ` (+${Math.round(selectedDef.goldPerStar * 100)}%)`}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Upgrade Action */}
            <div className="space-y-2.5 pt-2 border-t border-amber-400/20">
              {!isMax ? (
                <div className="flex items-center justify-between text-xs font-mono-nums bg-[#070b1a] border border-amber-400/25 rounded-xl px-3 py-2">
                  <span className="text-slate-300 font-sans font-bold">Chi phí nâng lên {curLv + 1}★:</span>
                  <div className="flex items-center gap-3 font-black">
                    <span
                      className={`flex items-center gap-1 ${
                        currentDust >= cost.starDust ? 'text-sky-300' : 'text-rose-400'
                      }`}
                    >
                      <StarDustIcon className="w-3.5 h-3.5" />
                      {cost.starDust}
                    </span>
                    <span
                      className={`flex items-center gap-1 ${
                        save.gold >= cost.gold ? 'text-amber-300' : 'text-rose-400'
                      }`}
                    >
                      <GoldCoinIcon className="w-3.5 h-3.5" />
                      {cost.gold}
                    </span>
                  </div>
                </div>
              ) : null}

              <button
                type="button"
                disabled={!canAfford}
                onClick={() => {
                  soundEngine.playVictory();
                  onUpgradeConstellation(selectedDef.id);
                }}
                className={`w-full py-3 px-4 rounded-xl font-display font-black text-sm flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer ${
                  isMax
                    ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 cursor-default'
                    : canAfford
                    ? 'a2-yellow-btn'
                    : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                {isMax ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Đã Thắp Sáng Tối Đa (5★)</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Thắp Sáng Chòm Sao ({curLv + 1}★)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Bottom: 4 Elemental Resonance Sets */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {(['fire', 'earth', 'air', 'water'] as ConstellationElement[]).map((el) => {
            const meta = CONSTELLATION_ELEMENT_META[el];
            const tier = summary.elementResonanceTier[el];
            const group = CONSTELLATIONS.filter((c) => c.element === el);
            const litCount = group.filter((c) => (summary.levels[c.id] ?? 0) >= 1).length;

            return (
              <div
                key={el}
                className={`rounded-2xl p-3 border ${
                  tier >= 2
                    ? 'bg-[#1a130b] border-amber-300/75'
                    : tier === 1
                    ? 'bg-[#0b1726] border-emerald-400/55'
                    : 'bg-[#070b18] border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span
                    className="text-xs font-black flex items-center gap-1.5"
                    style={{ color: meta.colorHex }}
                  >
                    <ElementIcon element={el} className="w-3.5 h-3.5" />
                    <span>Cộng Hưởng {meta.label}</span>
                  </span>
                  <span
                    className={`font-mono-nums text-[10px] font-black px-1.5 py-0.5 rounded ${
                      tier >= 2
                        ? 'bg-amber-400 text-slate-950'
                        : tier === 1
                        ? 'bg-emerald-500 text-slate-950'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {tier >= 2 ? 'Bậc II' : tier === 1 ? 'Bậc I' : `${litCount}/3`}
                  </span>
                </div>
                <p className="text-[10px] text-slate-300 leading-snug">{meta.resonanceDesc}</p>
                <div className="flex items-center gap-1.5 mt-2">
                  {group.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => setSelectedId(g.id)}
                      className="px-1.5 py-0.5 rounded bg-[#050814] border border-slate-700 hover:border-amber-300 text-[10px] font-mono-nums text-slate-200 cursor-pointer"
                    >
                      {g.symbol} {summary.levels[g.id] ?? 0}★
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

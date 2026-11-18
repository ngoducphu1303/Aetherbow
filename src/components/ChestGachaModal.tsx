import React, { useEffect, useState } from 'react';
import { Layers, Sparkles } from 'lucide-react';
import tarotCardBack from '../assets/images/arcane_tarot_frame_1794971375666.jpg';
import royalChestArt from '../assets/images/royal_zodiac_chest_1794971375438.jpg';
import { soundEngine } from '../audio/soundEngine';
import { GEAR_TEMPLATES, RARITY_META, RARITY_ORDER, getGearStats } from '../data/gearData';
import { RUNES_CATALOG } from '../data/runesData';
import { GearInstance, Rarity, RuneInstance } from '../types/game';
import { ChestSvg, GearSlotSvg, RARITY_FRAME_CLASS } from './GameIcons';

export interface GachaRevealState {
  chestVariant: 'iron' | 'mythic' | 'rune_bag' | 'rune_rare';
  count: 1 | 10;
  gears?: GearInstance[];
  runes?: RuneInstance[];
}

interface ChestGachaModalProps {
  reveal: GachaRevealState;
  canEquipRune: boolean;
  onClose: () => void;
  onEquipGear: (uid: string) => void;
  onEquipRune: (uid: string) => void;
  onRollAgain: (variant: GachaRevealState['chestVariant'], count: 1 | 10) => void;
  canRollAgain: boolean;
}

const RARITY_GLOW_BG: Record<Rarity, string> = {
  [Rarity.COMMON]: 'radial-gradient(circle, rgba(148,163,184,0.3) 0%, transparent 70%)',
  [Rarity.RARE]: 'radial-gradient(circle, rgba(56,189,248,0.42) 0%, transparent 70%)',
  [Rarity.EPIC]: 'radial-gradient(circle, rgba(168,85,247,0.52) 0%, transparent 70%)',
  [Rarity.LEGENDARY]: 'radial-gradient(circle, rgba(250,204,21,0.58) 0%, transparent 70%)',
  [Rarity.MYTHIC]: 'radial-gradient(circle, rgba(244,63,94,0.62) 0%, transparent 70%)',
};

export const ChestGachaModal: React.FC<ChestGachaModalProps> = ({
  reveal,
  canEquipRune,
  onClose,
  onEquipGear,
  onEquipRune,
  onRollAgain,
  canRollAgain,
}) => {
  const [stage, setStage] = useState<'shaking' | 'revealed'>('shaking');
  const [flippedIndices, setFlippedIndices] = useState<Set<number>>(new Set());
  const [chestImgFailed, setChestImgFailed] = useState(false);
  const [cardBackFailed, setCardBackFailed] = useState(false);

  const isBatch = reveal.count === 10;
  const itemsCount = reveal.gears?.length ?? reveal.runes?.length ?? 0;

  useEffect(() => {
    setStage('shaking');
    setFlippedIndices(new Set());
    const delay = isBatch ? 520 : 760;
    const t = window.setTimeout(() => {
      setStage('revealed');
    }, delay);
    return () => window.clearTimeout(t);
  }, [reveal, isBatch]);

  const singleGear = reveal.gears?.[0];
  const singleRune = reveal.runes?.[0];

  const highestRarity: Rarity = (() => {
    const rarities = [
      ...(reveal.gears?.map((g) => g.rarity) ?? []),
      ...(reveal.runes?.map((r) => r.rarity) ?? []),
    ];
    if (rarities.length === 0) return Rarity.COMMON;
    return rarities.reduce((best, r) =>
      RARITY_ORDER.indexOf(r) > RARITY_ORDER.indexOf(best) ? r : best
    );
  })();

  const bestGear = reveal.gears?.reduce<GearInstance | null>((best, g) => {
    if (!best) return g;
    const bScore = RARITY_ORDER.indexOf(best.rarity) * 10 + (GEAR_TEMPLATES[best.templateId]?.isSTier ? 5 : 0);
    const gScore = RARITY_ORDER.indexOf(g.rarity) * 10 + (GEAR_TEMPLATES[g.templateId]?.isSTier ? 5 : 0);
    return gScore > bScore ? g : best;
  }, null);

  const bestRune = reveal.runes?.reduce<RuneInstance | null>((best, r) => {
    if (!best) return r;
    return RARITY_ORDER.indexOf(r.rarity) > RARITY_ORDER.indexOf(best.rarity) ? r : best;
  }, null);

  const rMeta = RARITY_META[highestRarity];
  const gearTpl = singleGear ? GEAR_TEMPLATES[singleGear.templateId] : null;
  const gearStats = singleGear ? getGearStats(singleGear) : null;
  const runeDef = singleRune ? RUNES_CATALOG[singleRune.runeId] : null;

  const useChestArt =
    (reveal.chestVariant === 'mythic' || reveal.chestVariant === 'iron') && !chestImgFailed;

  const flipCard = (idx: number, rarity: Rarity) => {
    if (flippedIndices.has(idx)) return;
    const isHigh = rarity === Rarity.EPIC || rarity === Rarity.LEGENDARY || rarity === Rarity.MYTHIC;
    soundEngine.playCardFlip(isHigh);
    setFlippedIndices((prev) => {
      const next = new Set(prev);
      next.add(idx);
      return next;
    });
  };

  const flipAllCards = () => {
    soundEngine.playCardFlip(
      highestRarity === Rarity.EPIC ||
        highestRarity === Rarity.LEGENDARY ||
        highestRarity === Rarity.MYTHIC
    );
    const all = new Set<number>();
    for (let i = 0; i < itemsCount; i++) all.add(i);
    setFlippedIndices(all);
  };

  const allFlipped = flippedIndices.size >= itemsCount;

  return (
    <div
      onClick={() => {
        if (stage === 'shaking') setStage('revealed');
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/92"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`cel-panel-ornate relative w-full rounded-3xl p-5 sm:p-6 text-center overflow-hidden ${
          isBatch ? 'max-w-3xl max-h-[90vh] flex flex-col' : 'max-w-md'
        }`}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: stage === 'revealed' ? RARITY_GLOW_BG[highestRarity] : undefined }}
        />
        {stage === 'revealed' &&
          (highestRarity === Rarity.EPIC ||
            highestRarity === Rarity.LEGENDARY ||
            highestRarity === Rarity.MYTHIC) && (
            <div
              aria-hidden="true"
              className="absolute -inset-24 pointer-events-none opacity-25"
              style={{
                background: `repeating-conic-gradient(from 0deg, ${rMeta.color}55 0deg 10deg, transparent 10deg 26deg)`,
              }}
            />
          )}

        {stage === 'shaking' ? (
          <div className="relative z-10 py-10 flex flex-col items-center gap-4">
            <div className="a2-chest-shake">
              {useChestArt ? (
                <img
                  src={royalChestArt}
                  alt="Rương Kho Báu Hoàng Đạo"
                  referrerPolicy="no-referrer"
                  onError={() => setChestImgFailed(true)}
                  className="w-36 h-36 rounded-2xl object-cover border border-amber-300/60 shadow-[0_0_32px_rgba(251,191,36,0.4)]"
                />
              ) : (
                <ChestSvg variant={reveal.chestVariant} className="w-28 h-28" />
              )}
            </div>
            <div className="font-display text-lg font-black text-amber-200">
              {isBatch ? 'Đang Triệu Hồi x10 Hoàng Đạo...' : 'Đang Khai Mở Kho Báu...'}
            </div>
            <button
              type="button"
              onClick={() => setStage('revealed')}
              className="text-xs font-bold text-slate-300 underline underline-offset-4 cursor-pointer"
            >
              Chạm để mở ngay
            </button>
          </div>
        ) : isBatch ? (
          /* === 10x INTERACTIVE TAROT FLIP GRID === */
          <div className="relative z-10 flex flex-col gap-4 min-h-0 flex-1 a2-gacha-reveal">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-400/25 pb-3 shrink-0">
              <div className="flex items-center gap-2 text-left">
                <Layers className="w-5 h-5 text-amber-300 shrink-0" />
                <div>
                  <div className="font-display text-base sm:text-lg font-black text-white">
                    Kết Quả Triệu Hồi ×10
                  </div>
                  <div className="text-[11px] text-amber-200 font-semibold">
                    Phẩm chất cao nhất: {rMeta.label} · Chạm từng thẻ hoặc Lật Tất Cả
                  </div>
                </div>
              </div>

              {!allFlipped && (
                <button
                  type="button"
                  onClick={flipAllCards}
                  className="a2-yellow-btn px-4 py-2 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
                >
                  Lật Tất Cả ({itemsCount - flippedIndices.size})
                </button>
              )}
            </div>

            {(() => {
              const allRarities = [
                ...(reveal.gears ?? []).map((g) => g.rarity),
                ...(reveal.runes ?? []).map((r) => r.rarity),
              ];
              const sTierCount = (reveal.gears ?? []).filter(
                (g) => GEAR_TEMPLATES[g.templateId]?.isSTier
              ).length;
              const counts = RARITY_ORDER.map((r) => ({
                rarity: r,
                meta: RARITY_META[r],
                count: allRarities.filter((x) => x === r).length,
              })).filter((c) => c.count > 0);

              return (
                <div className="flex flex-wrap items-center justify-center gap-1.5 shrink-0">
                  {counts.map((c) => (
                    <span
                      key={c.rarity}
                      className={`px-2 py-0.5 rounded-lg border text-[10px] font-mono-nums font-black bg-[#070b1a] ${c.meta.borderClass} ${c.meta.textClass}`}
                    >
                      {c.meta.label} ×{c.count}
                    </span>
                  ))}
                  {sTierCount > 0 && (
                    <span className="px-2 py-0.5 rounded-lg border border-amber-300/70 bg-amber-400/15 text-[10px] font-mono-nums font-black text-amber-300">
                      Trang Bị [S] ×{sTierCount}
                    </span>
                  )}
                </div>
              );
            })()}

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 overflow-y-auto a2-scroll py-1">
              {(reveal.gears ?? []).map((g, idx) => {
                const tpl = GEAR_TEMPLATES[g.templateId];
                const meta = RARITY_META[g.rarity];
                const flipped = flippedIndices.has(idx);
                if (!tpl) return null;

                return (
                  <button
                    key={g.uid}
                    type="button"
                    onClick={() => flipCard(idx, g.rarity)}
                    className="a2-flip-scene min-h-[144px] w-full text-center cursor-pointer"
                  >
                    <div className={`a2-flip-card ${flipped ? 'is-flipped' : ''}`}>
                      <div
                        className="a2-flip-face rounded-2xl border border-amber-300/55 bg-[#080d22] flex flex-col items-center justify-center overflow-hidden hover:border-amber-200"
                        style={{ boxShadow: `0 0 18px ${meta.color}28` }}
                      >
                        {!cardBackFailed && (
                          <img
                            src={tarotCardBack}
                            alt="Thẻ Chưa Lật"
                            referrerPolicy="no-referrer"
                            onError={() => setCardBackFailed(true)}
                            className="absolute inset-0 w-full h-full object-cover opacity-55"
                          />
                        )}
                        <div className="relative z-10 flex flex-col items-center gap-1.5">
                          <span
                            className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black bg-slate-950/90"
                            style={{ borderColor: meta.color, color: meta.color }}
                          >
                            ?
                          </span>
                          <span className="text-[10px] font-black text-amber-200 bg-slate-950/85 px-2 py-0.5 rounded">
                            Chạm Lật
                          </span>
                        </div>
                      </div>

                      <div
                        className={`a2-flip-face a2-flip-face-back rounded-2xl ${RARITY_FRAME_CLASS[g.rarity]} a2-item-card p-1`}
                      >
                        <div className="a2-item-inner p-2 flex flex-col items-center justify-between gap-1.5 w-full h-full">
                          <div className="flex items-center justify-between w-full text-[9px] font-black">
                            <span className={meta.textClass}>{meta.label}</span>
                            {tpl.isSTier && <span className="text-amber-300">[S]</span>}
                          </div>
                          <GearSlotSvg
                            slot={tpl.slot}
                            weaponArchetype={tpl.weaponArchetype}
                            accentHex={tpl.visualAccentHex}
                            className="w-11 h-11"
                          />
                          <div className="text-[11px] font-black text-white line-clamp-2 leading-tight">
                            {tpl.name}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}

              {(reveal.runes ?? []).map((r, idx) => {
                const def = RUNES_CATALOG[r.runeId];
                const meta = RARITY_META[r.rarity];
                const flipped = flippedIndices.has(idx);
                if (!def) return null;

                return (
                  <button
                    key={r.uid}
                    type="button"
                    onClick={() => flipCard(idx, r.rarity)}
                    className="a2-flip-scene min-h-[144px] w-full text-center cursor-pointer"
                  >
                    <div className={`a2-flip-card ${flipped ? 'is-flipped' : ''}`}>
                      <div
                        className="a2-flip-face rounded-2xl border border-purple-300/55 bg-[#080d22] flex flex-col items-center justify-center overflow-hidden hover:border-purple-200"
                        style={{ boxShadow: `0 0 18px ${meta.color}28` }}
                      >
                        {!cardBackFailed && (
                          <img
                            src={tarotCardBack}
                            alt="Ngọc Chưa Lật"
                            referrerPolicy="no-referrer"
                            onError={() => setCardBackFailed(true)}
                            className="absolute inset-0 w-full h-full object-cover opacity-55"
                          />
                        )}
                        <div className="relative z-10 flex flex-col items-center gap-1.5">
                          <span
                            className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-black bg-slate-950/90"
                            style={{ borderColor: meta.color, color: meta.color }}
                          >
                            ?
                          </span>
                          <span className="text-[10px] font-black text-purple-200 bg-slate-950/85 px-2 py-0.5 rounded">
                            Chạm Lật
                          </span>
                        </div>
                      </div>

                      <div
                        className={`a2-flip-face a2-flip-face-back rounded-2xl ${RARITY_FRAME_CLASS[r.rarity]} a2-item-card p-1`}
                      >
                        <div className="a2-item-inner p-2 flex flex-col items-center justify-between gap-1.5 w-full h-full">
                          <div className="flex items-center justify-between w-full text-[9px] font-black">
                            <span className={meta.textClass}>{meta.label}</span>
                            <span className="text-slate-300">{def.archetype}</span>
                          </div>
                          <span
                            className="w-10 h-10 rounded-full border-2 border-white shadow-md"
                            style={{ backgroundColor: def.color }}
                          />
                          <div className="text-[11px] font-black text-white line-clamp-2 leading-tight">
                            {def.name.split('(')[0].trim()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap gap-2.5 pt-1 shrink-0">
              {allFlipped && bestGear && (
                <button
                  type="button"
                  onClick={() => {
                    onEquipGear(bestGear.uid);
                    onClose();
                  }}
                  className="a2-emerald-btn flex-1 py-2.5 px-4 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
                >
                  Trang Bị Món Tốt Nhất
                </button>
              )}
              {allFlipped && bestRune && canEquipRune && (
                <button
                  type="button"
                  onClick={() => {
                    onEquipRune(bestRune.uid);
                    onClose();
                  }}
                  className="a2-purple-btn flex-1 py-2.5 px-4 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
                >
                  Khảm Ngọc Tốt Nhất
                </button>
              )}
              {canRollAgain && (
                <button
                  type="button"
                  onClick={() => onRollAgain(reveal.chestVariant, 10)}
                  className="a2-yellow-btn flex-1 py-2.5 px-4 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
                >
                  Mở Tiếp ×10
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="a2-slate-btn flex-1 py-2.5 px-4 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
              >
                Xác Nhận &amp; Đóng
              </button>
            </div>
          </div>
        ) : (
          /* === SINGLE ROLL 1x 3D CARD FLIP REVEAL === */
          <div className="relative z-10 flex flex-col items-center gap-4 a2-gacha-reveal">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-300 uppercase tracking-wider">
              <Sparkles className="w-4 h-4" />
              <span>
                {flippedIndices.has(0)
                  ? `Triệu Hồi Thành Công · ${rMeta.label}`
                  : 'Chạm Thẻ Bài Hoàng Đạo Để Lật Mở'}
              </span>
            </div>

            {singleGear && gearTpl && (
              <>
                <button
                  type="button"
                  onClick={() => flipCard(0, singleGear.rarity)}
                  className="a2-flip-scene w-32 h-40 cursor-pointer"
                >
                  <div className={`a2-flip-card ${flippedIndices.has(0) ? 'is-flipped' : ''}`}>
                    <div
                      className="a2-flip-face rounded-2xl border-2 border-amber-300/70 bg-[#080d22] flex flex-col items-center justify-center overflow-hidden"
                      style={{ boxShadow: `0 0 28px ${rMeta.color}44` }}
                    >
                      {!cardBackFailed && (
                        <img
                          src={tarotCardBack}
                          alt="Lá Bài Hoàng Đạo"
                          referrerPolicy="no-referrer"
                          onError={() => setCardBackFailed(true)}
                          className="absolute inset-0 w-full h-full object-cover opacity-65"
                        />
                      )}
                      <div className="relative z-10 flex flex-col items-center gap-2">
                        <span
                          className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-black bg-slate-950/90"
                          style={{ borderColor: rMeta.color, color: rMeta.color }}
                        >
                          ?
                        </span>
                        <span className="text-[11px] font-black text-amber-200 bg-slate-950/85 px-2.5 py-0.5 rounded">
                          Chạm Lật Thẻ
                        </span>
                      </div>
                    </div>

                    <div
                      className={`a2-flip-face a2-flip-face-back a2-item-card rounded-2xl ${RARITY_FRAME_CLASS[singleGear.rarity]}`}
                    >
                      <div className="a2-item-inner flex flex-col items-center justify-center gap-1.5 p-2">
                        <GearSlotSvg
                          slot={gearTpl.slot}
                          weaponArchetype={gearTpl.weaponArchetype}
                          accentHex={gearTpl.visualAccentHex}
                          className="w-16 h-16"
                        />
                        <span className={`text-[10px] font-black ${rMeta.textClass}`}>
                          {rMeta.label} {gearTpl.isSTier ? '· [S]' : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {flippedIndices.has(0) ? (
                  <>
                    <div>
                      <h3 className="font-display text-xl font-black text-white">
                        {gearTpl.name}
                      </h3>
                      <div className={`text-xs font-bold mt-0.5 ${rMeta.textClass}`}>
                        {rMeta.label} · {gearTpl.setName}
                      </div>
                      {gearStats && (
                        <div className="flex flex-wrap justify-center gap-2.5 text-xs font-mono-nums text-amber-200 font-bold mt-2">
                          {gearStats.atk > 0 && <span>+{gearStats.atk} ATK</span>}
                          {gearStats.hp > 0 && <span>+{gearStats.hp} HP</span>}
                          {gearStats.critChance > 0 && (
                            <span>+{Math.round(gearStats.critChance * 100)}% Crit</span>
                          )}
                          {gearStats.attackSpeed > 0 && (
                            <span>+{Math.round(gearStats.attackSpeed * 100)}% Tốc bắn</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="w-full flex flex-wrap gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          onEquipGear(singleGear.uid);
                          onClose();
                        }}
                        className="a2-emerald-btn flex-1 py-2.5 px-4 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
                      >
                        Trang Bị Ngay
                      </button>
                      {canRollAgain && (
                        <button
                          type="button"
                          onClick={() => onRollAgain(reveal.chestVariant, 1)}
                          className="a2-yellow-btn flex-1 py-2.5 px-4 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
                        >
                          Mở Thêm 1 Lần
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => flipCard(0, singleGear.rarity)}
                    className="a2-yellow-btn px-6 py-2.5 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
                  >
                    Lật Thẻ Ngay
                  </button>
                )}
              </>
            )}

            {singleRune && runeDef && (
              <>
                <button
                  type="button"
                  onClick={() => flipCard(0, singleRune.rarity)}
                  className="a2-flip-scene w-32 h-40 cursor-pointer"
                >
                  <div className={`a2-flip-card ${flippedIndices.has(0) ? 'is-flipped' : ''}`}>
                    <div
                      className="a2-flip-face rounded-2xl border-2 border-purple-300/70 bg-[#080d22] flex flex-col items-center justify-center overflow-hidden"
                      style={{ boxShadow: `0 0 28px ${rMeta.color}44` }}
                    >
                      {!cardBackFailed && (
                        <img
                          src={tarotCardBack}
                          alt="Thẻ Ngọc Hoàng Đạo"
                          referrerPolicy="no-referrer"
                          onError={() => setCardBackFailed(true)}
                          className="absolute inset-0 w-full h-full object-cover opacity-65"
                        />
                      )}
                      <div className="relative z-10 flex flex-col items-center gap-2">
                        <span
                          className="w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-black bg-slate-950/90"
                          style={{ borderColor: rMeta.color, color: rMeta.color }}
                        >
                          ?
                        </span>
                        <span className="text-[11px] font-black text-purple-200 bg-slate-950/85 px-2.5 py-0.5 rounded">
                          Chạm Lật Thẻ
                        </span>
                      </div>
                    </div>

                    <div
                      className={`a2-flip-face a2-flip-face-back a2-item-card rounded-2xl ${RARITY_FRAME_CLASS[singleRune.rarity]}`}
                    >
                      <div className="a2-item-inner flex flex-col items-center justify-center gap-2 p-2">
                        <span
                          className="w-14 h-14 rounded-full border-2 border-white shadow-lg"
                          style={{ backgroundColor: runeDef.color }}
                        />
                        <span className={`text-[10px] font-black ${rMeta.textClass}`}>
                          {rMeta.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>

                {flippedIndices.has(0) ? (
                  <>
                    <div>
                      <h3 className="font-display text-xl font-black text-white">
                        {runeDef.name}
                      </h3>
                      <div className={`text-xs font-bold mt-0.5 ${rMeta.textClass}`}>
                        {rMeta.label} · {runeDef.archetype}
                      </div>
                      <p className="text-xs text-slate-200 mt-1.5 max-w-xs mx-auto">
                        {runeDef.description}
                      </p>
                    </div>

                    <div className="w-full flex flex-wrap gap-2.5 pt-2">
                      {canEquipRune && (
                        <button
                          type="button"
                          onClick={() => {
                            onEquipRune(singleRune.uid);
                            onClose();
                          }}
                          className="a2-purple-btn flex-1 py-2.5 px-4 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
                        >
                          Khảm Lên Đài
                        </button>
                      )}
                      {canRollAgain && (
                        <button
                          type="button"
                          onClick={() => onRollAgain(reveal.chestVariant, 1)}
                          className="a2-yellow-btn flex-1 py-2.5 px-4 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
                        >
                          Mở Thêm 1 Lần
                        </button>
                      )}
                    </div>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => flipCard(0, singleRune.rarity)}
                    className="a2-purple-btn px-6 py-2.5 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
                  >
                    Lật Thẻ Ngay
                  </button>
                )}
              </>
            )}

            <button
              type="button"
              onClick={onClose}
              className="a2-slate-btn w-full py-2.5 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
            >
              Xác Nhận &amp; Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

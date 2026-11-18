import React, { useRef, useState } from 'react';
import {
  ArrowUpCircle,
  Bookmark,
  Check,
  Crown,
  Flame,
  Hammer,
  Heart,
  Info,
  Layers,
  Lock,
  Palette,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Star,
  Sword,
  Tag,
  UserCheck,
  X,
  Zap,
} from 'lucide-react';
import flashDealVaultArt from '../assets/images/flash_deal_vault_art_1794973982335.jpg';
import petSanctuaryArt from '../assets/images/pet_sanctuary_art_1794977269592.jpg';
import royalChestArt from '../assets/images/royal_zodiac_chest_1794971375438.jpg';
import { soundEngine } from '../audio/soundEngine';
import {
  CHEST_DROP_RATES,
  getDailyFlashDeals,
  normalizeFlashDeals,
  normalizePity,
} from '../data/liveOpsData';
import {
  GEAR_TEMPLATES,
  RARITY_META,
  RARITY_ORDER,
  getGearPowerScore,
  getGearStats,
  getUpgradeCost,
} from '../data/gearData';
import { HEROES, HERO_MAP, getHeroStarUpgradeCost } from '../data/heroesData';
import { getTodayKey } from '../data/questsData';
import { RUNES_CATALOG } from '../data/runesData';
import {
  HERO_SKINS,
  PETS_CATALOG,
  ZODIAC_AURAS,
  getPetStats,
  getPetUpgradeCost,
  normalizePets,
} from '../data/wave3Data';
import {
  SUBSTAT_DEFS,
  getEffectiveSubstats,
  getSubstatTierColor,
  normalizeBuildPresets,
} from '../data/wave4Data';
import {
  AuraStyleId,
  ComputedPlayerStats,
  FlashDealItem,
  GearInstance,
  GearSlot,
  HeroId,
  HeroSkinId,
  PetId,
  Rarity,
  RuneInstance,
  SaveData,
} from '../types/game';
import {
  ChestSvg,
  GearSlotSvg,
  GoldCoinIcon,
  HeroCrestSvg,
  PetEssenceIcon,
  RARITY_FRAME_CLASS,
  SLOT_LABELS,
  SoulGemIcon,
  StarDustIcon,
} from './GameIcons';

interface GearPanelProps {
  save: SaveData;
  stats: ComputedPlayerStats;
  onEquip: (uid: string) => void;
  onUpgrade: (uid: string) => void;
  onFuse: (uid: string) => void;
  onAutoEquipBest: () => void;
  onBulkFuseGear: () => void;
  onOpenForge: () => void;
  onOpenForgeSubTab?: (
    subTab: 'salvage' | 'forge' | 'reforge' | 'awaken',
    gearUid?: string
  ) => void;
  onSaveBuildPreset: (idx: number) => void;
  onApplyBuildPreset: (idx: number) => void;
  onRotateHero?: (deltaRad: number) => void;
  onResetHeroRotation?: () => void;
  onGoShop: () => void;
}

const LEFT_SLOTS: GearSlot[] = [GearSlot.WEAPON, GearSlot.NECKLACE, GearSlot.RING];
const RIGHT_SLOTS: GearSlot[] = [GearSlot.ARMOR, GearSlot.HELMET, GearSlot.BOOTS];

export const LobbyGearPanel: React.FC<GearPanelProps> = ({
  save,
  stats,
  onEquip,
  onUpgrade,
  onFuse,
  onAutoEquipBest,
  onBulkFuseGear,
  onOpenForge,
  onOpenForgeSubTab,
  onSaveBuildPreset,
  onApplyBuildPreset,
  onRotateHero,
  onResetHeroRotation,
  onGoShop,
}) => {
  const [slotFilter, setSlotFilter] = useState<'ALL' | GearSlot>('ALL');
  const [selectedUid, setSelectedUid] = useState<string>(
    save.equipped[GearSlot.WEAPON] || save.inventory[0]?.uid || ''
  );
  const dragRef = useRef<{ active: boolean; lastX: number }>({ active: false, lastX: 0 });
  const buildPresets = normalizeBuildPresets(save);

  const selectedItem =
    save.inventory.find((g) => g.uid === selectedUid) || save.inventory[0];

  const filteredInventory = save.inventory
    .filter((item) => {
      if (slotFilter === 'ALL') return true;
      return GEAR_TEMPLATES[item.templateId]?.slot === slotFilter;
    })
    .sort((a, b) => {
      const ra = RARITY_ORDER.indexOf(a.rarity);
      const rb = RARITY_ORDER.indexOf(b.rarity);
      if (rb !== ra) return rb - ra;
      return b.level - a.level;
    });

  const canFuseItem = (item: GearInstance) => {
    const rIdx = RARITY_ORDER.indexOf(item.rarity);
    if (rIdx >= RARITY_ORDER.length - 1) return false;
    const matches = save.inventory.filter(
      (g) => g.templateId === item.templateId && g.rarity === item.rarity
    );
    return matches.length >= 3;
  };

  // Count how many 3->1 fusable sets exist in inventory
  const fusableSetCount = (() => {
    const counts = new Map<string, number>();
    for (const item of save.inventory) {
      if (item.rarity === Rarity.MYTHIC) continue;
      const key = `${item.templateId}__${item.rarity}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let sets = 0;
    for (const c of counts.values()) {
      sets += Math.floor(c / 3);
    }
    return sets;
  })();

  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { active: true, lastX: e.clientX };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleStagePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.lastX;
    dragRef.current.lastX = e.clientX;
    onRotateHero?.(dx * 0.014);
  };
  const handleStagePointerUp = () => {
    dragRef.current.active = false;
  };

  const renderEquippedSlot = (slot: GearSlot) => {
    const uid = save.equipped[slot];
    const item = save.inventory.find((g) => g.uid === uid);
    if (!item) {
      return (
        <div
          key={slot}
          className="w-[70px] h-[70px] sm:w-[82px] sm:h-[82px] rounded-2xl bg-[#0a0f24]/90 border border-amber-400/25 flex flex-col items-center justify-center text-[10px] font-semibold text-slate-400"
        >
          <span>{SLOT_LABELS[slot]}</span>
        </div>
      );
    }
    const tpl = GEAR_TEMPLATES[item.templateId];
    const rMeta = RARITY_META[item.rarity];
    const isSelected = selectedItem?.uid === item.uid;
    const fuseReady = canFuseItem(item);
    const awkLv = item.awakeningLevel ?? 0;
    const isHolo =
      item.rarity === Rarity.LEGENDARY ||
      item.rarity === Rarity.MYTHIC ||
      Boolean(tpl?.isSTier) ||
      awkLv > 0;

    return (
      <button
        key={slot}
        type="button"
        onClick={() => setSelectedUid(item.uid)}
        className={`a2-item-card w-[70px] h-[70px] sm:w-[82px] sm:h-[82px] cursor-pointer ${
          RARITY_FRAME_CLASS[item.rarity]
        } ${isHolo ? 'a2-holo-foil' : ''} ${
          isSelected ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-[#070b18]' : ''
        }`}
        title={`${tpl?.name} · Lv.${item.level}`}
      >
        <div className="a2-item-inner flex flex-col items-center justify-center p-1">
          <GearSlotSvg
            slot={slot}
            weaponArchetype={tpl?.weaponArchetype}
            accentHex={tpl?.visualAccentHex}
            className="w-9 h-9 sm:w-10 sm:h-10 drop-shadow"
          />
          <span className="text-[10px] font-black text-white leading-none mt-0.5 font-mono-nums">
            Lv.{item.level}{awkLv > 0 ? ` ★${awkLv}` : ''}
          </span>
          {tpl?.setName && (
            <span className="text-[8px] font-bold text-amber-100/90 truncate max-w-full px-1 leading-tight">
              {SLOT_LABELS[slot]}
            </span>
          )}
        </div>
        {fuseReady && (
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-emerald-500 border border-white text-[10px] font-black text-white flex items-center justify-center shadow">
            ▲
          </span>
        )}
        <span className="sr-only" style={{ color: rMeta.color }}>
          {rMeta.label}
        </span>
      </button>
    );
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto a2-scroll pointer-events-auto">
      {/* 1. UPPER PAPER-DOLL STAGE OVER LIVE 3D HERO */}
      <div className="relative px-3 sm:px-6 pt-2 pb-4 shrink-0">
        <div className="max-w-3xl mx-auto grid grid-cols-[auto_1fr_auto] items-center gap-2 sm:gap-6">
          <div className="flex flex-col gap-2 sm:gap-3 items-center z-10">
            {LEFT_SLOTS.map(renderEquippedSlot)}
          </div>

          {/* Center Window (360° Drag-to-Rotate) + Celestial Astrolabe Pedestal */}
          <div
            onPointerDown={handleStagePointerDown}
            onPointerMove={handleStagePointerMove}
            onPointerUp={handleStagePointerUp}
            onPointerCancel={handleStagePointerUp}
            className="flex flex-col items-center justify-between min-h-[210px] sm:min-h-[245px] cursor-grab active:cursor-grabbing touch-none select-none"
          >
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-amber-200/80 tracking-wide bg-[#080d22]/85 border border-amber-400/25 px-2.5 py-0.5 rounded-lg">
                Kéo xoay Anh Hùng 360°
              </span>
              {onResetHeroRotation && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    soundEngine.playUiClick();
                    onResetHeroRotation();
                  }}
                  title="Đặt lại góc nhìn"
                  aria-label="Đặt lại góc nhìn"
                  className="cel-panel w-6 h-6 rounded-lg flex items-center justify-center text-amber-200 hover:border-amber-300 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>

            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="a2-pedestal w-full max-w-[300px] rounded-2xl p-2 flex items-center justify-around gap-2"
            >
              <div className="a2-stat-pill flex-1 rounded-xl px-2.5 py-2 flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-amber-200">
                  <Sword className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>Tấn Công</span>
                </span>
                <span className="text-xs sm:text-sm font-black text-white font-mono-nums">
                  {stats.attack}
                </span>
              </div>
              <div className="a2-stat-pill flex-1 rounded-xl px-2.5 py-2 flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1 text-[10px] sm:text-xs font-bold text-emerald-200">
                  <Heart className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span>Sinh Lực</span>
                </span>
                <span className="text-xs sm:text-sm font-black text-white font-mono-nums">
                  {stats.maxHp}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:gap-3 items-center z-10">
            {RIGHT_SLOTS.map(renderEquippedSlot)}
          </div>
        </div>
      </div>

      {/* 2. LOWER CELESTIAL GEAR VAULT */}
      <div className="flex-1 a2-gear-vault-bg border-t border-amber-400/35 px-3 sm:px-6 py-4 flex flex-col gap-3">
        <div className="max-w-4xl w-full mx-auto flex flex-col gap-3.5">
          {selectedItem && (
            <div className="cel-panel-ornate rounded-2xl p-3.5 sm:p-4">
              {(() => {
                const tpl = GEAR_TEMPLATES[selectedItem.templateId];
                if (!tpl) return null;
                const rMeta = RARITY_META[selectedItem.rarity];
                const gStats = getGearStats(selectedItem);
                const itemScore = getGearPowerScore(selectedItem);
                const upgradeCost = getUpgradeCost(selectedItem);
                const isEquipped = save.equipped[tpl.slot] === selectedItem.uid;
                const atMaxLevel = selectedItem.level >= rMeta.maxLevel;
                const fuseReady = canFuseItem(selectedItem);
                const awkLv = selectedItem.awakeningLevel ?? 0;
                const substats = getEffectiveSubstats(selectedItem);
                const isHolo =
                  selectedItem.rarity === Rarity.LEGENDARY ||
                  selectedItem.rarity === Rarity.MYTHIC ||
                  Boolean(tpl.isSTier) ||
                  awkLv > 0;

                const equippedUid = save.equipped[tpl.slot];
                const equippedItem = !isEquipped
                  ? save.inventory.find((g) => g.uid === equippedUid)
                  : undefined;
                const eqStats = equippedItem ? getGearStats(equippedItem) : null;
                const eqScore = equippedItem ? getGearPowerScore(equippedItem) : 0;
                const atkDiff = eqStats ? gStats.atk - eqStats.atk : 0;
                const hpDiff = eqStats ? gStats.hp - eqStats.hp : 0;
                const scoreDiff = equippedItem ? itemScore - eqScore : 0;

                return (
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className={`a2-item-card w-16 h-16 shrink-0 ${
                          RARITY_FRAME_CLASS[selectedItem.rarity]
                        } ${isHolo ? 'a2-holo-foil' : ''}`}
                      >
                        <div className="a2-item-inner flex items-center justify-center">
                          <GearSlotSvg
                            slot={tpl.slot}
                            weaponArchetype={tpl.weaponArchetype}
                            accentHex={tpl.visualAccentHex}
                            className="w-9 h-9"
                          />
                        </div>
                      </div>

                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 text-[11px] mb-0.5">
                          <span className={`font-black ${rMeta.textClass}`}>
                            {rMeta.label} · {SLOT_LABELS[tpl.slot]}
                          </span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="text-sky-300 font-bold">{tpl.setName}</span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="font-mono-nums text-amber-200 font-bold">
                            Cấp {selectedItem.level}/{rMeta.maxLevel}
                          </span>
                          {awkLv > 0 && (
                            <span className="font-black text-amber-300">
                              {'★'.repeat(awkLv)}
                            </span>
                          )}
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="font-mono-nums text-emerald-300 font-bold">
                            Điểm {itemScore}
                          </span>
                        </div>
                        <h3 className="font-display text-base sm:text-lg font-bold text-white truncate">
                          {tpl.name}
                        </h3>
                        <p className="text-xs text-slate-300 line-clamp-2 mt-0.5">
                          {tpl.description}
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs font-mono-nums text-amber-200 mt-1.5 font-semibold">
                          {gStats.atk > 0 && <span>+{gStats.atk} ATK</span>}
                          {gStats.hp > 0 && <span>+{gStats.hp} HP</span>}
                          {gStats.critChance > 0 && (
                            <span>+{Math.round(gStats.critChance * 100)}% Crit</span>
                          )}
                          {gStats.attackSpeed > 0 && (
                            <span>+{Math.round(gStats.attackSpeed * 100)}% Tốc bắn</span>
                          )}
                          {gStats.moveSpeed > 0 && (
                            <span>+{Math.round(gStats.moveSpeed * 100)}% Tốc chạy</span>
                          )}
                          {gStats.damageReduction > 0 && (
                            <span>+{Math.round(gStats.damageReduction * 100)}% Giáp</span>
                          )}
                        </div>

                        {substats.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {substats.map((sub) => (
                              <span
                                key={sub.id}
                                className={`px-2 py-0.5 rounded-lg bg-[#070b1a] border border-amber-400/20 text-[10px] font-mono-nums font-bold ${getSubstatTierColor(sub.tier)}`}
                              >
                                {SUBSTAT_DEFS[sub.kind].format(sub.value)}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Live Comparison vs Currently Equipped */}
                        {!isEquipped && equippedItem && (
                          <div className="mt-2 inline-flex flex-wrap items-center gap-2.5 bg-[#060916]/90 border border-amber-400/20 rounded-xl px-2.5 py-1 text-[11px] font-mono-nums">
                            <span className="text-slate-400 font-semibold">
                              So với đang mặc:
                            </span>
                            {atkDiff !== 0 && (
                              <span
                                className={`font-black ${
                                  atkDiff > 0 ? 'text-emerald-300' : 'text-rose-400'
                                }`}
                              >
                                {atkDiff > 0 ? `+${atkDiff}` : atkDiff} ATK
                              </span>
                            )}
                            {hpDiff !== 0 && (
                              <span
                                className={`font-black ${
                                  hpDiff > 0 ? 'text-emerald-300' : 'text-rose-400'
                                }`}
                              >
                                {hpDiff > 0 ? `+${hpDiff}` : hpDiff} HP
                              </span>
                            )}
                            <span
                              className={`font-black ${
                                scoreDiff > 0
                                  ? 'text-emerald-300'
                                  : scoreDiff < 0
                                  ? 'text-rose-400'
                                  : 'text-slate-300'
                              }`}
                            >
                              ({scoreDiff >= 0 ? `+${scoreDiff}` : scoreDiff} Điểm)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap md:flex-col gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={isEquipped}
                        onClick={() => onEquip(selectedItem.uid)}
                        className={`px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                          isEquipped
                            ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 cursor-default'
                            : 'a2-emerald-btn'
                        }`}
                      >
                        {isEquipped && <Check className="w-3.5 h-3.5" />}
                        <span>{isEquipped ? 'Đang Trang Bị' : 'Trang Bị'}</span>
                      </button>

                      <button
                        type="button"
                        disabled={atMaxLevel || save.gold < upgradeCost}
                        onClick={() => onUpgrade(selectedItem.uid)}
                        className={`px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                          !atMaxLevel && save.gold >= upgradeCost
                            ? 'a2-yellow-btn'
                            : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <ArrowUpCircle className="w-3.5 h-3.5" />
                        <span className="font-mono-nums">
                          {atMaxLevel ? 'Đã Tối Đa' : `Cường Hóa · ${upgradeCost}`}
                        </span>
                      </button>

                      {selectedItem.rarity !== Rarity.COMMON && (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick();
                            if (onOpenForgeSubTab) {
                              onOpenForgeSubTab('reforge', selectedItem.uid);
                            } else {
                              onOpenForge();
                            }
                          }}
                          className="a2-slate-btn px-4 py-2 rounded-xl text-xs font-black text-sky-200 flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer border border-sky-400/35"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-sky-300" />
                          <span>Tẩy Luyện &amp; Thức Tỉnh</span>
                        </button>
                      )}

                      {selectedItem.rarity !== Rarity.MYTHIC && (
                        <button
                          type="button"
                          disabled={!fuseReady}
                          onClick={() => onFuse(selectedItem.uid)}
                          className={`px-4 py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                            fuseReady
                              ? 'a2-purple-btn'
                              : 'bg-slate-900/90 border border-slate-700 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>{fuseReady ? 'Ghép 3→1 Bậc' : 'Cần 3 món cùng bậc'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* 3-Slot Quick Build Presets */}
          <div className="cel-panel rounded-2xl p-2.5 sm:p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-amber-200 shrink-0">
              <Bookmark className="w-3.5 h-3.5 text-amber-300" />
              <span>Bộ Trang Bị Nhanh:</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
              {buildPresets.map((preset, idx) => {
                const presetHero = HERO_MAP[preset.heroId]?.name ?? 'Anh Hùng';
                return (
                  <div
                    key={preset.id}
                    className="rounded-xl bg-[#070b1a] border border-amber-400/25 px-2.5 py-1.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-[11px] font-black text-white truncate">
                        {preset.name}
                      </div>
                      <div className="text-[9px] text-slate-400 font-semibold truncate">
                        {presetHero} · {preset.equippedRunes.length} Ngọc
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick(1.05);
                          onSaveBuildPreset(idx);
                        }}
                        className="a2-slate-btn px-2 py-1 rounded-lg text-[10px] font-black text-sky-200 cursor-pointer"
                      >
                        Lưu
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playLevelUp();
                          onApplyBuildPreset(idx);
                        }}
                        className="a2-emerald-btn px-2 py-1 rounded-lg text-[10px] font-black cursor-pointer"
                      >
                        Mặc
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Toolbar & Slot Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {(['ALL', ...Object.values(GearSlot)] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSlotFilter(tab)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                    slotFilter === tab
                      ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 font-black shadow'
                      : 'cel-panel text-slate-300 hover:text-white'
                  }`}
                >
                  {tab === 'ALL' ? `Tất Cả (${save.inventory.length})` : SLOT_LABELS[tab]}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="cel-panel px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-mono-nums font-black text-sky-200">
                <StarDustIcon className="w-3.5 h-3.5 shrink-0" />
                <span>{save.starDust ?? 0}</span>
              </div>

              <button
                type="button"
                onClick={onAutoEquipBest}
                className="a2-emerald-btn px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
              >
                <Zap className="w-3.5 h-3.5 shrink-0" />
                <span>Tự Mặc Mạnh Nhất</span>
              </button>

              <button
                type="button"
                disabled={fusableSetCount === 0}
                onClick={onBulkFuseGear}
                className={`px-3 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer ${
                  fusableSetCount > 0
                    ? 'a2-yellow-btn'
                    : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Layers className="w-3.5 h-3.5 shrink-0" />
                <span className="font-mono-nums">
                  {fusableSetCount > 0 ? `Ghép Nhanh (${fusableSetCount})` : 'Ghép Nhanh'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  onOpenForge();
                }}
                className="a2-slate-btn px-3 py-2 rounded-xl text-xs font-black text-amber-200 flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap border border-amber-400/40"
              >
                <Hammer className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Lò Rèn &amp; Tách Đồ</span>
              </button>

              <button
                type="button"
                onClick={onGoShop}
                className="a2-purple-btn px-3 py-2 rounded-xl text-xs font-black cursor-pointer shrink-0 whitespace-nowrap"
              >
                Kho Báu
              </button>
            </div>
          </div>

          {/* Relic Grid */}
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2.5 pb-4">
            {filteredInventory.map((item) => {
              const tpl = GEAR_TEMPLATES[item.templateId];
              if (!tpl) return null;
              const isEquipped = save.equipped[tpl.slot] === item.uid;
              const isSelected = selectedItem?.uid === item.uid;
              const fuseReady = canFuseItem(item);
              const awkLv = item.awakeningLevel ?? 0;
              const isHolo =
                item.rarity === Rarity.LEGENDARY ||
                item.rarity === Rarity.MYTHIC ||
                Boolean(tpl.isSTier) ||
                awkLv > 0;

              return (
                <button
                  key={item.uid}
                  type="button"
                  onClick={() => setSelectedUid(item.uid)}
                  className={`a2-item-card aspect-square cursor-pointer ${
                    RARITY_FRAME_CLASS[item.rarity]
                  } ${isHolo ? 'a2-holo-foil' : ''} ${
                    isSelected ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-[#080c1c]' : ''
                  }`}
                  title={tpl.name}
                >
                  <div className="a2-item-inner flex flex-col items-center justify-center p-1">
                    <GearSlotSvg
                      slot={tpl.slot}
                      weaponArchetype={tpl.weaponArchetype}
                      accentHex={tpl.visualAccentHex}
                      className="w-8 h-8 sm:w-9 sm:h-9"
                    />
                    <span className="text-[10px] font-black text-white font-mono-nums leading-none mt-1">
                      Lv.{item.level}{awkLv > 0 ? ` ★${awkLv}` : ''}
                    </span>
                    <span className="text-[9px] text-white/90 font-bold truncate max-w-full px-1">
                      {tpl.name}
                    </span>
                  </div>
                  {isEquipped && (
                    <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-600 border border-emerald-200/70 text-[8px] font-black text-white shadow">
                      Mặc
                    </span>
                  )}
                  {fuseReady && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 border border-white text-[9px] font-black text-slate-950 flex items-center justify-center shadow">
                      ▲
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

interface HeroesPanelProps {
  save: SaveData;
  previewHeroId: HeroId;
  onPreviewHero: (heroId: HeroId) => void;
  onSelectHero: (heroId: HeroId) => void;
  onUnlockHero: (heroId: HeroId, currency: 'gold' | 'gems') => void;
  onUpgradeHeroStar: (heroId: HeroId) => void;
  onUnlockPet: (petId: PetId, currency: 'gold' | 'gems') => void;
  onEquipPet: (petId: PetId | null) => void;
  onUpgradePet: (petId: PetId) => void;
  onUnlockSkin: (skinId: HeroSkinId, currency: 'gold' | 'gems') => void;
  onEquipSkin: (heroId: HeroId, skinId: HeroSkinId) => void;
  onUnlockAura: (auraId: AuraStyleId, currency: 'gold' | 'gems') => void;
  onEquipAura: (auraId: AuraStyleId) => void;
  onRotateHero?: (deltaRad: number) => void;
  onResetHeroRotation?: () => void;
}

export const LobbyHeroesPanel: React.FC<HeroesPanelProps> = ({
  save,
  previewHeroId,
  onPreviewHero,
  onSelectHero,
  onUnlockHero,
  onUpgradeHeroStar,
  onUnlockPet,
  onEquipPet,
  onUpgradePet,
  onUnlockSkin,
  onEquipSkin,
  onUnlockAura,
  onEquipAura,
  onRotateHero,
  onResetHeroRotation,
}) => {
  const [heroSubTab, setHeroSubTab] = useState<'roster' | 'pets' | 'cosmetics'>('roster');
  const [petBannerErr, setPetBannerErr] = useState(false);

  const hero = HERO_MAP[previewHeroId] ?? HERO_MAP[save.selectedHeroId] ?? HERO_MAP.artemis;
  const unlocked = save.unlockedHeroes.includes(hero.id);
  const selected = save.selectedHeroId === hero.id;
  const star = save.heroStars[hero.id] ?? 0;
  const starCost = getHeroStarUpgradeCost(star);
  const dragRef = useRef<{ active: boolean; lastX: number }>({ active: false, lastX: 0 });

  const ownedPets = normalizePets(save.pets);
  const unlockedSkins = save.unlockedSkins ?? ['default'];
  const activeSkinId = save.equippedSkinByHero?.[hero.id] ?? 'default';
  const unlockedAuras = save.unlockedAuras ?? ['zodiac_gold'];
  const activeAuraId = save.equippedAuraId ?? 'zodiac_gold';
  const petEssence = save.petEssence ?? 0;

  const handleHeroDragDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { active: true, lastX: e.clientX };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleHeroDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.lastX;
    dragRef.current.lastX = e.clientX;
    onRotateHero?.(dx * 0.015);
  };
  const handleHeroDragUp = () => {
    dragRef.current.active = false;
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-y-auto a2-scroll pointer-events-auto">
      {/* Upper Showcase (Live 3D Hero + Pet + Skin + Aura) */}
      <div className="px-3 sm:px-6 pt-2 pb-4 shrink-0">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-3.5 items-end">
          {/* Left: Transparent 3D Hero Window (360° Drag-to-Rotate) + Celestial Nameplate */}
          <div
            onPointerDown={handleHeroDragDown}
            onPointerMove={handleHeroDragMove}
            onPointerUp={handleHeroDragUp}
            onPointerCancel={handleHeroDragUp}
            className="md:col-span-6 flex flex-col items-center justify-between min-h-[205px] sm:min-h-[245px] cursor-grab active:cursor-grabbing touch-none select-none"
          >
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] font-bold text-amber-200/80 tracking-wide bg-[#080d22]/85 border border-amber-400/25 px-2.5 py-0.5 rounded-lg">
                Kéo xoay 360° ngắm Anh Hùng &amp; Tinh Linh
              </span>
              {onResetHeroRotation && (
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => {
                    soundEngine.playUiClick();
                    onResetHeroRotation();
                  }}
                  title="Đặt lại góc nhìn"
                  aria-label="Đặt lại góc nhìn"
                  className="cel-panel w-6 h-6 rounded-lg flex items-center justify-center text-amber-200 hover:border-amber-300 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>
              )}
            </div>

            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="cel-panel-ornate w-full max-w-[300px] text-center rounded-2xl px-4 py-2.5"
            >
              <div className="flex items-center justify-center gap-2">
                <span className="font-display text-lg font-black text-white">
                  {hero.name}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-300">
                  {hero.rarity}
                </span>
              </div>
              <div className="text-[11px] font-semibold text-slate-300 truncate mt-0.5">
                {hero.title} · {unlocked ? `★ ${star}/5` : 'Chưa Chiêu Mộ'}
              </div>
            </div>
          </div>

          {/* Right: Hero Dossier Art-Card */}
          <div className="md:col-span-6 cel-panel-ornate rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-[#121c42] border-b border-amber-400/30 flex items-center justify-between gap-2">
              <h3 className="font-display text-sm font-black text-amber-200 truncate">
                Nội Tại · {hero.skillName}
              </h3>
              <span className="text-xs font-mono-nums font-bold text-amber-300 shrink-0">
                +{hero.bonusAtk} ATK · +{hero.bonusHp} HP
              </span>
            </div>

            <div className="p-4 flex flex-col gap-3">
              <div className="text-xs font-bold text-emerald-300">
                Vai trò: {hero.role}
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {hero.passiveDesc}
              </p>

              {/* Ultimate Callout */}
              <div className="rounded-xl bg-[#141036] border border-purple-400/45 px-3.5 py-2.5">
                <div className="flex items-center gap-1.5 text-[11px] font-black text-purple-300">
                  <Flame className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>Chiêu Cuối (Q) · {hero.ultName}</span>
                </div>
                <p className="text-xs text-slate-200 mt-1 leading-snug">
                  {hero.ultDesc}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-400/15">
                {unlocked ? (
                  <>
                    <button
                      type="button"
                      disabled={selected}
                      onClick={() => onSelectHero(hero.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        selected
                          ? 'bg-emerald-950/80 border border-emerald-400/55 text-emerald-300 cursor-default'
                          : 'a2-emerald-btn'
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>{selected ? 'Đang Ra Trận' : 'Chọn Ra Trận'}</span>
                    </button>

                    {star < 5 ? (
                      <button
                        type="button"
                        disabled={save.gold < starCost.gold || save.gems < starCost.gems}
                        onClick={() => onUpgradeHeroStar(hero.id)}
                        className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                          save.gold >= starCost.gold && save.gems >= starCost.gems
                            ? 'a2-yellow-btn'
                            : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <Star className="w-3.5 h-3.5" />
                        <span className="font-mono-nums">
                          Nâng ★ · {starCost.gold} Vàng + {starCost.gems} Ngọc
                        </span>
                      </button>
                    ) : (
                      <span className="text-xs font-black text-amber-300 px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-400/40">
                        Đã Đạt Tối Đa 5★
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={save.gold < hero.unlockGold}
                      onClick={() => onUnlockHero(hero.id, 'gold')}
                      className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        save.gold >= hero.unlockGold
                          ? 'a2-yellow-btn'
                          : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span className="font-mono-nums">Mở · {hero.unlockGold} Vàng</span>
                    </button>
                    <button
                      type="button"
                      disabled={save.gems < hero.unlockGems}
                      onClick={() => onUnlockHero(hero.id, 'gems')}
                      className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        save.gems >= hero.unlockGems
                          ? 'a2-purple-btn'
                          : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <span className="font-mono-nums">Mở · {hero.unlockGems} Ngọc</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Lower Vault: Sub-Tab Navigation + Content */}
      <div className="flex-1 a2-gear-vault-bg border-t border-amber-400/35 px-3 sm:px-6 py-4">
        <div className="max-w-4xl mx-auto">
          {/* Sub-Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 mb-3.5">
            <div className="flex items-center gap-1 bg-[#060916] border border-amber-400/25 rounded-xl p-1 overflow-x-auto">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setHeroSubTab('roster');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  heroSubTab === 'roster'
                    ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Crown className="w-3.5 h-3.5 shrink-0" />
                <span>Chiêu Mộ &amp; Sao ({save.unlockedHeroes.length}/{HEROES.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setHeroSubTab('pets');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  heroSubTab === 'pets'
                    ? 'bg-gradient-to-b from-emerald-400 to-teal-600 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span>Tinh Linh 3D ({ownedPets.length}/{PETS_CATALOG.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setHeroSubTab('cosmetics');
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  heroSubTab === 'cosmetics'
                    ? 'bg-gradient-to-b from-purple-400 to-fuchsia-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5 shrink-0" />
                <span>Trang Phục &amp; Hào Quang</span>
              </button>
            </div>

            {heroSubTab === 'pets' && (
              <div className="cel-panel px-3 py-1.5 rounded-xl flex items-center gap-1.5 text-xs font-mono-nums font-black text-emerald-300">
                <PetEssenceIcon className="w-3.5 h-3.5 shrink-0" />
                <span>Tinh Chất: {petEssence}</span>
              </div>
            )}
          </div>

          {/* SUB-TAB 1: HERO ROSTER */}
          {heroSubTab === 'roster' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-4">
              {HEROES.map((h) => {
                const isUnlocked = save.unlockedHeroes.includes(h.id);
                const isSelected = save.selectedHeroId === h.id;
                const isPreview = hero.id === h.id;
                const hStar = save.heroStars[h.id] ?? 0;
                const frameRarity =
                  h.rarity === 'Legendary'
                    ? Rarity.LEGENDARY
                    : h.rarity === 'Epic'
                    ? Rarity.EPIC
                    : Rarity.RARE;

                return (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => onPreviewHero(h.id)}
                    className={`a2-item-card text-left cursor-pointer ${
                      RARITY_FRAME_CLASS[frameRarity]
                    } ${
                      isPreview
                        ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-[#080c1c]'
                        : ''
                    }`}
                  >
                    <div className="a2-item-inner p-3 flex flex-col items-center text-center gap-2">
                      <div className={!isUnlocked ? 'opacity-60 grayscale-[35%]' : ''}>
                        <HeroCrestSvg
                          heroId={h.id}
                          accentHex={h.accentHex}
                          cloakHex={h.cloakHex}
                          hairHex={h.hairHex}
                          className="w-16 h-16 drop-shadow"
                        />
                      </div>
                      <div className="w-full">
                        <div className="font-display text-xs font-black text-white truncate">
                          {h.name}
                        </div>
                        <div className="text-[10px] text-amber-100/90 font-mono-nums font-bold mt-0.5">
                          {isUnlocked
                            ? `★ ${hStar}/5 · ${h.rarity}`
                            : `${h.unlockGold} Vàng · ${h.unlockGems} Ngọc`}
                        </div>
                      </div>
                      <div className="text-[10px] font-black tracking-wide">
                        {isSelected ? (
                          <span className="text-emerald-300">Đang Ra Trận</span>
                        ) : !isUnlocked ? (
                          <span className="text-slate-400">Chưa Chiêu Mộ</span>
                        ) : (
                          <span className="text-sky-200">{h.role}</span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* SUB-TAB 2: 3D ZODIAC PET SANCTUARY */}
          {heroSubTab === 'pets' && (
            <div className="space-y-3.5 pb-6">
              <div className="cel-panel-ornate rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-12 items-center">
                <div className="sm:col-span-5 h-28 sm:h-32 bg-[#0b1229] relative overflow-hidden">
                  {!petBannerErr ? (
                    <img
                      src={petSanctuaryArt}
                      alt="Thánh Đường Tinh Linh 3D"
                      referrerPolicy="no-referrer"
                      onError={() => setPetBannerErr(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-emerald-500/20 to-amber-500/20">
                      <Sparkles className="w-8 h-8 text-emerald-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-transparent via-transparent to-[#090d1f]" />
                </div>
                <div className="sm:col-span-7 p-3.5 flex flex-col justify-center gap-1">
                  <div className="text-[10px] font-black uppercase tracking-widest text-emerald-300">
                    ĐỒNG HÀNH CHIẾN ĐẤU 3D
                  </div>
                  <h4 className="font-display text-sm sm:text-base font-black text-white">
                    Thánh Đường Tinh Linh Hoàng Đạo
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Tinh Linh bay hộ vệ bên cạnh Anh Hùng cả ở Sảnh và Trong Trận, tự động phóng đạn nguyên tố và cộng thẳng ATK / HP / Chí Mạng!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PETS_CATALOG.map((pet) => {
                  const inst = ownedPets.find((p) => p.petId === pet.id);
                  const lv = inst?.level ?? 1;
                  const isEquipped = save.equippedPetId === pet.id;
                  const pStats = getPetStats(pet.id, lv);
                  const upCost = getPetUpgradeCost(lv);
                  const canUpgrade = inst && petEssence >= upCost.essence && save.gold >= upCost.gold;
                  const primaryCss = `#${pet.primaryHex.toString(16).padStart(6, '0')}`;
                  const secondaryCss = `#${pet.secondaryHex.toString(16).padStart(6, '0')}`;

                  return (
                    <div
                      key={pet.id}
                      className={`rounded-2xl p-3.5 flex flex-col justify-between gap-3 ${
                        isEquipped ? 'cel-panel-ornate' : 'cel-panel'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className="w-11 h-11 rounded-2xl border-2 border-white/70 shrink-0 flex items-center justify-center shadow-lg"
                              style={{
                                background: `radial-gradient(circle at 30% 30%, ${secondaryCss}, ${primaryCss})`,
                              }}
                            >
                              <Sparkles className="w-5 h-5 text-slate-950" />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 text-[10px] font-black text-amber-300 uppercase">
                                <span>{pet.rarity}</span>
                                <span aria-hidden="true" className="text-slate-600">·</span>
                                <span className="text-emerald-300">
                                  {inst ? `Cấp ${lv}` : 'Chưa Triệu Hồi'}
                                </span>
                              </div>
                              <h5 className="font-display text-sm font-black text-white truncate">
                                {pet.name}
                              </h5>
                            </div>
                          </div>

                          {isEquipped && (
                            <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 border border-emerald-400/60 text-[10px] font-black text-emerald-300 shrink-0">
                              Đang Theo
                            </span>
                          )}
                        </div>

                        <p className="text-[11px] text-slate-300 mt-2 leading-relaxed">
                          {pet.skillDesc}
                        </p>

                        <div className="flex flex-wrap gap-3 text-xs font-mono-nums font-black text-amber-200 mt-2">
                          <span>+{pStats.atk} ATK</span>
                          <span>+{pStats.hp} HP</span>
                          <span>+{Math.round(pStats.crit * 100)}% Crit</span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-amber-400/15">
                        {inst ? (
                          <>
                            <button
                              type="button"
                              onClick={() => onEquipPet(isEquipped ? null : pet.id)}
                              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                                isEquipped ? 'a2-slate-btn text-slate-200' : 'a2-emerald-btn'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isEquipped ? 'Thu Hồi' : 'Cho Ra Trận'}</span>
                            </button>

                            <button
                              type="button"
                              disabled={!canUpgrade}
                              onClick={() => onUpgradePet(pet.id)}
                              className={`py-2 px-3 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer font-mono-nums ${
                                canUpgrade
                                  ? 'a2-yellow-btn'
                                  : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              <ArrowUpCircle className="w-3.5 h-3.5" />
                              <span>
                                +{upCost.essence} Tinh Chất · {upCost.gold} Vàng
                              </span>
                            </button>
                          </>
                        ) : (
                          <>
                            {pet.unlockGold > 0 && (
                              <button
                                type="button"
                                disabled={save.gold < pet.unlockGold}
                                onClick={() => onUnlockPet(pet.id, 'gold')}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer font-mono-nums ${
                                  save.gold >= pet.unlockGold
                                    ? 'a2-yellow-btn'
                                    : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                                }`}
                              >
                                <GoldCoinIcon className="w-3.5 h-3.5" />
                                <span>Triệu Hồi · {pet.unlockGold}</span>
                              </button>
                            )}
                            {pet.unlockGems > 0 && (
                              <button
                                type="button"
                                disabled={save.gems < pet.unlockGems}
                                onClick={() => onUnlockPet(pet.id, 'gems')}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer font-mono-nums ${
                                  save.gems >= pet.unlockGems
                                    ? 'a2-purple-btn'
                                    : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                                }`}
                              >
                                <SoulGemIcon className="w-3.5 h-3.5" />
                                <span>Triệu Hồi · {pet.unlockGems}</span>
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUB-TAB 3: HERO SKINS & ZODIAC AURAS */}
          {heroSubTab === 'cosmetics' && (
            <div className="space-y-5 pb-6">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <h4 className="font-display text-sm font-black text-amber-200">
                    Bộ Sưu Tập Trang Phục · Đang Áp Dụng Cho {hero.name}
                  </h4>
                  <span className="text-[11px] text-slate-400">
                    Đổi trực tiếp trên mô hình 3D
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {HERO_SKINS.map((skin) => {
                    const isOwned = unlockedSkins.includes(skin.id);
                    const isEquipped = activeSkinId === skin.id;
                    const cHex = skin.cloakHex
                      ? `#${skin.cloakHex.toString(16).padStart(6, '0')}`
                      : `#${hero.cloakHex.toString(16).padStart(6, '0')}`;
                    const aHex = skin.accentHex
                      ? `#${skin.accentHex.toString(16).padStart(6, '0')}`
                      : `#${hero.accentHex.toString(16).padStart(6, '0')}`;

                    return (
                      <div
                        key={skin.id}
                        className={`rounded-2xl p-3.5 flex flex-col justify-between gap-3 ${
                          isEquipped ? 'cel-panel-ornate' : 'cel-panel'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="text-[10px] font-black text-purple-300 tracking-wider">
                              {skin.badge}
                            </span>
                            <div className="flex items-center gap-1">
                              <span
                                className="w-4 h-4 rounded-full border border-white/60"
                                style={{ backgroundColor: cHex }}
                              />
                              <span
                                className="w-4 h-4 rounded-full border border-white/60"
                                style={{ backgroundColor: aHex }}
                              />
                            </div>
                          </div>
                          <h5 className="font-display text-sm font-black text-white">
                            {skin.name}
                          </h5>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                            {skin.desc}
                          </p>
                          {(skin.atkBonus > 0 || skin.hpBonus > 0) && (
                            <div className="flex items-center gap-3 text-xs font-mono-nums font-bold text-amber-200 mt-2">
                              <span>+{skin.atkBonus} ATK</span>
                              <span>+{skin.hpBonus} HP</span>
                            </div>
                          )}
                        </div>

                        {isOwned ? (
                          <button
                            type="button"
                            disabled={isEquipped}
                            onClick={() => onEquipSkin(hero.id, skin.id)}
                            className={`w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                              isEquipped
                                ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 cursor-default'
                                : 'a2-emerald-btn'
                            }`}
                          >
                            {isEquipped && <Check className="w-3.5 h-3.5" />}
                            <span>{isEquipped ? 'Đang Mặc' : `Mặc Cho ${hero.name}`}</span>
                          </button>
                        ) : skin.unlockGold > 0 ? (
                          <button
                            type="button"
                            disabled={save.gold < skin.unlockGold}
                            onClick={() => onUnlockSkin(skin.id, 'gold')}
                            className={`w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer font-mono-nums ${
                              save.gold >= skin.unlockGold
                                ? 'a2-yellow-btn'
                                : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <GoldCoinIcon className="w-3.5 h-3.5" />
                            <span>Mở Khóa · {skin.unlockGold}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={save.gems < skin.unlockGems}
                            onClick={() => onUnlockSkin(skin.id, 'gems')}
                            className={`w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer font-mono-nums ${
                              save.gems >= skin.unlockGems
                                ? 'a2-purple-btn'
                                : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <SoulGemIcon className="w-3.5 h-3.5" />
                            <span>Mở Khóa · {skin.unlockGems}</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-amber-400/20">
                <h4 className="font-display text-sm font-black text-sky-200 mb-2.5">
                  Vòng Hào Quang Hoàng Đạo 3D
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ZODIAC_AURAS.map((aura) => {
                    const isOwned = unlockedAuras.includes(aura.id);
                    const isEquipped = activeAuraId === aura.id;
                    const pHex = `#${aura.primaryHex.toString(16).padStart(6, '0')}`;
                    const sHex = `#${aura.secondaryHex.toString(16).padStart(6, '0')}`;

                    return (
                      <div
                        key={aura.id}
                        className={`rounded-2xl p-3.5 flex flex-col justify-between gap-3 ${
                          isEquipped ? 'cel-panel-ornate' : 'cel-panel'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <div
                            className="w-10 h-10 rounded-full shrink-0 border-2 border-white/80 shadow"
                            style={{
                              background: `conic-gradient(${pHex}, ${sHex}, ${pHex})`,
                            }}
                          />
                          <div className="min-w-0">
                            <h5 className="font-display text-sm font-black text-white truncate">
                              {aura.name}
                            </h5>
                            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                              {aura.desc}
                            </p>
                            {aura.critBonus > 0 && (
                              <div className="text-[11px] font-mono-nums font-black text-amber-300 mt-1">
                                +{Math.round(aura.critBonus * 1000) / 10}% Tỷ Lệ Chí Mạng
                              </div>
                            )}
                          </div>
                        </div>

                        {isOwned ? (
                          <button
                            type="button"
                            disabled={isEquipped}
                            onClick={() => onEquipAura(aura.id)}
                            className={`w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                              isEquipped
                                ? 'bg-emerald-950/70 border border-emerald-500/50 text-emerald-300 cursor-default'
                                : 'a2-emerald-btn'
                            }`}
                          >
                            {isEquipped && <Check className="w-3.5 h-3.5" />}
                            <span>{isEquipped ? 'Đang Kích Hoạt' : 'Trang Bị Hào Quang'}</span>
                          </button>
                        ) : aura.unlockGold > 0 ? (
                          <button
                            type="button"
                            disabled={save.gold < aura.unlockGold}
                            onClick={() => onUnlockAura(aura.id, 'gold')}
                            className={`w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer font-mono-nums ${
                              save.gold >= aura.unlockGold
                                ? 'a2-yellow-btn'
                                : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <GoldCoinIcon className="w-3.5 h-3.5" />
                            <span>Mở Khóa · {aura.unlockGold}</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            disabled={save.gems < aura.unlockGems}
                            onClick={() => onUnlockAura(aura.id, 'gems')}
                            className={`w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer font-mono-nums ${
                              save.gems >= aura.unlockGems
                                ? 'a2-purple-btn'
                                : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <SoulGemIcon className="w-3.5 h-3.5" />
                            <span>Mở Khóa · {aura.unlockGems}</span>
                          </button>
                        )}
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

interface RunesPanelProps {
  save: SaveData;
  onEquipRune: (uid: string) => void;
  onUnequipRune: (uid: string) => void;
  onFuseRune: (uid: string) => void;
  onBulkFuseRunes: () => void;
  onGoShop: () => void;
}

const SOCKET_COORDS: Array<{ left: string; top: string; label: string }> = [
  { left: '20%', top: '28%', label: 'Ấn I' },
  { left: '80%', top: '28%', label: 'Ấn II' },
  { left: '20%', top: '72%', label: 'Ấn III' },
  { left: '80%', top: '72%', label: 'Ấn IV' },
];

export const LobbyRunesPanel: React.FC<RunesPanelProps> = ({
  save,
  onEquipRune,
  onUnequipRune,
  onFuseRune,
  onBulkFuseRunes,
  onGoShop,
}) => {
  const [selectedRuneUid, setSelectedRuneUid] = useState<string>(
    save.equippedRunes[0] || save.runeInventory[0]?.uid || ''
  );
  const [catFilter, setCatFilter] = useState<'ALL' | 'ability' | 'enhancement' | 'blessing'>('ALL');

  const selectedRune =
    save.runeInventory.find((r) => r.uid === selectedRuneUid) || save.runeInventory[0];
  const activeHero = HERO_MAP[save.selectedHeroId] ?? HERO_MAP.artemis;

  const canFuseRune = (rune: RuneInstance) => {
    const rIdx = RARITY_ORDER.indexOf(rune.rarity);
    if (rIdx >= RARITY_ORDER.length - 1) return false;
    const matches = save.runeInventory.filter(
      (r) => r.runeId === rune.runeId && r.rarity === rune.rarity
    );
    return matches.length >= 3;
  };

  const fusableRuneSets = (() => {
    const counts = new Map<string, number>();
    for (const r of save.runeInventory) {
      if (r.rarity === Rarity.MYTHIC) continue;
      const key = `${r.runeId}__${r.rarity}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let sets = 0;
    for (const c of counts.values()) {
      sets += Math.floor(c / 3);
    }
    return sets;
  })();

  const filteredRunes = save.runeInventory
    .filter((r) => {
      if (catFilter === 'ALL') return true;
      return RUNES_CATALOG[r.runeId]?.category === catFilter;
    })
    .sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity));

  return (
    <div className="flex-1 a2-gear-vault-bg overflow-y-auto a2-scroll px-3 sm:px-6 py-4 pointer-events-auto">
      <div className="max-w-4xl mx-auto flex flex-col gap-4 pb-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-base sm:text-lg font-black text-amber-200">
              Đài Khắc Ngọc Hoàng Đạo ({save.equippedRunes.length}/4)
            </h2>
            <p className="text-xs text-slate-300">
              Khảm tối đa 4 Ngọc Khắc để mở khóa kỹ năng khởi đầu &amp; cộng hưởng chỉ số.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={fusableRuneSets === 0}
              onClick={onBulkFuseRunes}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                fusableRuneSets > 0
                  ? 'a2-emerald-btn'
                  : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="font-mono-nums">
                {fusableRuneSets > 0
                  ? `Ghép Nhanh (${fusableRuneSets})`
                  : 'Ghép Nhanh Ngọc'}
              </span>
            </button>

            <button
              type="button"
              onClick={onGoShop}
              className="a2-yellow-btn px-4 py-2 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
            >
              Khắc Thêm Ngọc
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
          <div className="lg:col-span-6 flex justify-center">
            <div className="rune-altar w-full max-w-[400px] h-[290px] sm:h-[320px]">
              <div className="rune-altar-ring" />
              <div className="rune-altar-core" />

              <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[2] flex flex-col items-center">
                <HeroCrestSvg
                  heroId={activeHero.id}
                  accentHex={activeHero.accentHex}
                  cloakHex={activeHero.cloakHex}
                  hairHex={activeHero.hairHex}
                  className="w-20 h-20 sm:w-24 sm:h-24 drop-shadow-[0_0_20px_rgba(232,121,249,0.45)]"
                />
                <span className="mt-1 px-2.5 py-0.5 rounded-full bg-[#090d1e]/95 border border-amber-300/60 text-[10px] font-black text-amber-200">
                  {activeHero.name}
                </span>
              </div>

              {SOCKET_COORDS.map((coord, idx) => {
                const rUid = save.equippedRunes[idx];
                const inst = save.runeInventory.find((r) => r.uid === rUid);
                const def = inst ? RUNES_CATALOG[inst.runeId] : null;
                const isSel = inst && selectedRune?.uid === inst.uid;

                return (
                  <button
                    key={idx}
                    type="button"
                    style={{ left: coord.left, top: coord.top }}
                    onClick={() => inst && setSelectedRuneUid(inst.uid)}
                    className={`rune-socket w-16 h-16 sm:w-[70px] sm:h-[70px] rounded-2xl cursor-pointer flex flex-col items-center justify-center p-1 ${
                      inst && def
                        ? `a2-item-card ${RARITY_FRAME_CLASS[inst.rarity]} ${
                            isSel ? 'ring-2 ring-amber-300' : ''
                          }`
                        : 'bg-[#10132d]/95 border border-dashed border-amber-400/45 text-amber-200/75'
                    }`}
                    title={def ? def.name : `${coord.label} Trống`}
                  >
                    {inst && def ? (
                      <div className="a2-item-inner flex flex-col items-center justify-center p-1">
                        <span
                          className="w-5 h-5 rounded-full border-2 border-white shadow"
                          style={{ backgroundColor: def.color }}
                        />
                        <span className="text-[9px] font-black text-white truncate max-w-full mt-1">
                          {def.archetype}
                        </span>
                      </div>
                    ) : (
                      <span className="text-[10px] font-bold">{coord.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="lg:col-span-6">
            {selectedRune ? (
              <div className="cel-panel-ornate rounded-2xl p-4">
                {(() => {
                  const def = RUNES_CATALOG[selectedRune.runeId];
                  if (!def) return null;
                  const rMeta = RARITY_META[selectedRune.rarity];
                  const isEq = save.equippedRunes.includes(selectedRune.uid);
                  const fuseReady = canFuseRune(selectedRune);

                  return (
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className="w-3.5 h-3.5 rounded-full border border-white"
                            style={{ backgroundColor: def.color }}
                          />
                          <span className={`font-black ${rMeta.textClass}`}>
                            {rMeta.label}
                          </span>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span style={{ color: def.color }} className="font-bold">
                            {def.archetype}
                          </span>
                        </div>
                        {isEq && (
                          <span className="text-[11px] font-black text-emerald-300">
                            Đang Khảm
                          </span>
                        )}
                      </div>

                      <h3 className="font-display text-lg font-black text-white">
                        {def.name}
                      </h3>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {def.description}
                      </p>

                      <div className="flex flex-wrap gap-3 text-xs font-mono-nums text-amber-200 font-bold">
                        <span>+{Math.round(def.atkBonusPct * 100)}% ATK</span>
                        <span>+{Math.round(def.hpBonusPct * 100)}% HP</span>
                        <span>+{Math.round(def.critBonus * 100)}% Crit</span>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t border-amber-400/20">
                        <button
                          type="button"
                          onClick={() =>
                            isEq
                              ? onUnequipRune(selectedRune.uid)
                              : onEquipRune(selectedRune.uid)
                          }
                          disabled={!isEq && save.equippedRunes.length >= 4}
                          className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                            isEq
                              ? 'a2-slate-btn'
                              : save.equippedRunes.length < 4
                              ? 'a2-purple-btn'
                              : 'bg-slate-900 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {isEq
                            ? 'Tháo Ngọc'
                            : save.equippedRunes.length >= 4
                            ? 'Đã Đầy 4 Ô Ngọc'
                            : 'Khảm Lên Đài'}
                        </button>

                        {selectedRune.rarity !== Rarity.MYTHIC && (
                          <button
                            type="button"
                            disabled={!fuseReady}
                            onClick={() => onFuseRune(selectedRune.uid)}
                            className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                              fuseReady
                                ? 'a2-yellow-btn'
                                : 'bg-slate-900 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <Layers className="w-3.5 h-3.5" />
                            <span>
                              {fuseReady ? 'Ghép 3→1 Bậc' : 'Cần 3 viên cùng bậc'}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              <div className="cel-panel rounded-2xl p-6 text-center text-xs text-slate-300">
                Chưa có Ngọc Khắc nào. Hãy sang Kho Báu để triệu hồi Ngọc!
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ['ALL', 'Tất cả'],
              ['ability', 'Kỹ năng'],
              ['enhancement', 'Cường hóa'],
              ['blessing', 'Phước lành'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setCatFilter(key)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap cursor-pointer ${
                catFilter === key
                  ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 font-black'
                  : 'cel-panel text-slate-300 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
          {filteredRunes.map((r) => {
            const def = RUNES_CATALOG[r.runeId];
            if (!def) return null;
            const isEq = save.equippedRunes.includes(r.uid);
            const isSel = selectedRune?.uid === r.uid;
            const fuseReady = canFuseRune(r);
            return (
              <button
                key={r.uid}
                type="button"
                onClick={() => setSelectedRuneUid(r.uid)}
                className={`a2-item-card aspect-square cursor-pointer ${
                  RARITY_FRAME_CLASS[r.rarity]
                } ${isSel ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-[#080c1c]' : ''}`}
              >
                <div className="a2-item-inner p-2 flex flex-col items-center justify-center text-center gap-1">
                  <span
                    className="w-7 h-7 rounded-full border-2 border-white shadow"
                    style={{ backgroundColor: def.color }}
                  />
                  <span className="text-[10px] font-black text-white line-clamp-2 leading-tight">
                    {def.name.split('(')[0].trim()}
                  </span>
                  <span className="text-[9px] text-white/80 font-bold">
                    {def.archetype}
                  </span>
                </div>
                {isEq && (
                  <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-emerald-600 border border-emerald-200/70 text-[8px] font-black text-white">
                    Đeo
                  </span>
                )}
                {fuseReady && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-amber-400 border border-white text-[9px] font-black text-slate-950 flex items-center justify-center">
                    ▲
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

interface ShopPanelProps {
  save: SaveData;
  onOpenChestWithGacha: (
    variant: 'iron' | 'mythic' | 'rune_bag' | 'rune_rare',
    count?: 1 | 10
  ) => void;
  onBuyFlashDeal: (deal: FlashDealItem) => void;
}

export const LobbyShopPanel: React.FC<ShopPanelProps> = ({
  save,
  onOpenChestWithGacha,
  onBuyFlashDeal,
}) => {
  const [storeSection, setStoreSection] = useState<'all' | 'deals' | 'gacha'>('all');
  const [chestImgFailed, setChestImgFailed] = useState(false);
  const [vaultBannerFailed, setVaultBannerFailed] = useState(false);
  const [oddsModalVariant, setOddsModalVariant] = useState<
    'iron' | 'mythic' | 'rune_bag' | 'rune_rare' | null
  >(null);

  const pity = normalizePity(save.pity);
  const rollsUntilEpic = Math.max(1, 10 - pity.mythicRollsSinceEpic);
  const rollsUntilSTier = Math.max(1, 25 - pity.mythicRollsSinceSTier);

  const today = getTodayKey();
  const flashState = normalizeFlashDeals(save.flashDeals);
  const dailyDeals = getDailyFlashDeals(today);

  const chests: Array<{
    variant: 'iron' | 'mythic' | 'rune_bag' | 'rune_rare';
    title: string;
    desc: string;
    currency: 'gold' | 'gems';
    cost1: number;
    cost10: number;
    ornate?: boolean;
    useArt?: boolean;
    titleClass: string;
    btnClass: string;
  }> = [
    {
      variant: 'iron',
      title: 'Rương Sắt Chiến Binh',
      desc: 'Rơi trang bị Thường → Sử Thi ngẫu nhiên cho cả 6 ô đồ.',
      currency: 'gold',
      cost1: 120,
      cost10: 1080,
      titleClass: 'text-white',
      btnClass: 'a2-yellow-btn',
    },
    {
      variant: 'mythic',
      title: 'Rương Thần Thoại [S]',
      desc: 'Tỷ lệ cao trang bị S-Tier (Dragon Knight, Oracle, Griffin) bậc Sử Thi – Huyền Thoại.',
      currency: 'gems',
      cost1: 25,
      cost10: 225,
      ornate: true,
      useArt: true,
      titleClass: 'text-amber-200',
      btnClass: 'a2-purple-btn',
    },
    {
      variant: 'rune_bag',
      title: 'Túi Ngọc Khắc Cổ Đại',
      desc: 'Triệu hồi Ngọc Khắc Kỹ năng & Cường hóa nguyên tố ngẫu nhiên.',
      currency: 'gold',
      cost1: 100,
      cost10: 900,
      titleClass: 'text-sky-200',
      btnClass: 'a2-yellow-btn',
    },
    {
      variant: 'rune_rare',
      title: 'Rương Ngọc Hiếm',
      desc: 'Đảm bảo bậc Hiếm trở lên · cơ hội nổ Ngọc Huyền Thoại Valkyrie.',
      currency: 'gems',
      cost1: 18,
      cost10: 162,
      ornate: true,
      titleClass: 'text-purple-200',
      btnClass: 'a2-purple-btn',
    },
  ];

  const oddsData = oddsModalVariant ? CHEST_DROP_RATES[oddsModalVariant] : null;

  return (
    <div className="flex-1 a2-gear-vault-bg overflow-y-auto a2-scroll px-3 sm:px-6 py-4 pointer-events-auto">
      <div className="max-w-4xl mx-auto flex flex-col gap-5 pb-8">
        {/* Commercial Storefront Header + Segmented Section Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-black text-amber-200">
              Thương Hội &amp; Kho Báu Hoàng Đạo
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Ưu đãi Flash Sale làm mới mỗi ngày và triệu hồi rương ×10 kèm bảo hiểm S-Tier.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-[#060916] border border-amber-400/25 rounded-xl p-1">
            {(
              [
                ['all', 'Tất Cả'],
                ['deals', 'Flash Sale'],
                ['gacha', 'Triệu Hồi'],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setStoreSection(k);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap cursor-pointer ${
                  storeSection === k
                    ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* SECTION 1: DAILY FLASH SALE STOREFRONT */}
        {(storeSection === 'all' || storeSection === 'deals') && (
          <section className="space-y-3">
            {/* Art Storefront Hero Banner */}
            <div className="cel-panel-ornate rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-12 items-center">
              <div className="sm:col-span-5 h-32 sm:h-36 bg-[#0b1229] relative overflow-hidden">
                {!vaultBannerFailed ? (
                  <img
                    src={flashDealVaultArt}
                    alt="Kho Báu Ưu Đãi Hoàng Đạo"
                    referrerPolicy="no-referrer"
                    onError={() => setVaultBannerFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-amber-500/25 via-[#131d44] to-purple-500/25 flex items-center justify-center">
                    <Tag className="w-10 h-10 text-amber-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-transparent via-transparent to-[#090d1f]" />
              </div>

              <div className="sm:col-span-7 p-4 flex flex-col justify-center gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Flash Sale Hôm Nay · {today}</span>
                  </span>
                  <span className="font-mono-nums text-[11px] font-bold text-emerald-300">
                    {flashState.purchasedIds.length}/{dailyDeals.length} đã nhận
                  </span>
                </div>
                <h3 className="font-display text-base sm:text-lg font-black text-white">
                  Chợ Tinh Giới &amp; Quà Tiếp Tế Miễn Phí
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Mỗi ngày có 1 gói Quà Vàng miễn phí 0đ và 3 vật phẩm tinh hoa giảm tới 45% giúp nâng lực chiến thần tốc.
                </p>
              </div>
            </div>

            {/* 4 Daily Deal Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {dailyDeals.map((deal) => {
                const isBought = flashState.purchasedIds.includes(deal.id);
                const canAfford =
                  deal.currency === 'free'
                    ? true
                    : deal.currency === 'gold'
                    ? save.gold >= deal.price
                    : save.gems >= deal.price;

                return (
                  <div
                    key={deal.id}
                    className={`rounded-2xl p-3.5 flex flex-col justify-between gap-3 ${
                      deal.currency === 'free' || deal.rewardKind === 'gear_s'
                        ? 'cel-panel-ornate'
                        : 'cel-panel'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span
                          className={`text-[10px] font-black tracking-wider ${
                            deal.currency === 'free'
                              ? 'text-emerald-300'
                              : 'text-amber-300'
                          }`}
                        >
                          {deal.badge}
                        </span>
                        {deal.currency !== 'free' && (
                          <span className="text-[11px] font-mono-nums text-slate-500 line-through">
                            {deal.originalPrice}
                          </span>
                        )}
                      </div>
                      <h4 className="font-display text-sm font-black text-white leading-snug">
                        {deal.title}
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        {deal.subtitle}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isBought || !canAfford}
                      onClick={() => onBuyFlashDeal(deal)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        isBought
                          ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 cursor-default'
                          : !canAfford
                          ? 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                          : deal.currency === 'free'
                          ? 'a2-emerald-btn'
                          : deal.currency === 'gems'
                          ? 'a2-purple-btn'
                          : 'a2-yellow-btn'
                      }`}
                    >
                      {isBought ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Đã Nhận Hôm Nay</span>
                        </>
                      ) : deal.currency === 'free' ? (
                        <span>Nhận Miễn Phí</span>
                      ) : (
                        <>
                          <span>Mua ·</span>
                          <span className="font-mono-nums">{deal.price}</span>
                          {deal.currency === 'gold' ? (
                            <GoldCoinIcon className="w-3.5 h-3.5" />
                          ) : (
                            <SoulGemIcon className="w-3.5 h-3.5" />
                          )}
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SECTION 2: TREASURE CHEST GACHA */}
        {(storeSection === 'all' || storeSection === 'gacha') && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-amber-400/20">
              <div className="text-sm font-display font-black text-amber-200">
                Triệu Hồi Rương Tinh Giới (×10 Giảm 10%)
              </div>
              <div className="cel-panel rounded-xl px-3.5 py-1.5 flex items-center gap-4 text-[11px] font-mono-nums">
                <div>
                  <span className="text-slate-400">Bảo hiểm Sử Thi+: </span>
                  <span className="font-black text-purple-300">còn {rollsUntilEpic}</span>
                </div>
                <span aria-hidden="true" className="text-amber-400/40">|</span>
                <div>
                  <span className="text-slate-400">Bảo hiểm [S]-Tier: </span>
                  <span className="font-black text-amber-300">còn {rollsUntilSTier}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chests.map((c) => {
                const balance = c.currency === 'gold' ? save.gold : save.gems;
                const can1 = balance >= c.cost1;
                const can10 = balance >= c.cost10;
                const CurrencyIcon = c.currency === 'gold' ? GoldCoinIcon : SoulGemIcon;

                return (
                  <div
                    key={c.variant}
                    className={`${
                      c.ornate ? 'cel-panel-ornate' : 'cel-panel'
                    } rounded-2xl p-4 flex flex-col justify-between gap-3.5`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {c.useArt && !chestImgFailed ? (
                          <img
                            src={royalChestArt}
                            alt={c.title}
                            referrerPolicy="no-referrer"
                            onError={() => setChestImgFailed(true)}
                            className="w-16 h-16 rounded-xl object-cover border border-amber-300/60 shrink-0 shadow-lg"
                          />
                        ) : (
                          <ChestSvg variant={c.variant} className="w-16 h-16 shrink-0" />
                        )}
                        <div className="min-w-0">
                          <h3 className={`font-display text-base font-black ${c.titleClass}`}>
                            {c.title}
                          </h3>
                          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                            {c.desc}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setOddsModalVariant(c.variant);
                        }}
                        aria-label={`Xem tỷ lệ ${c.title}`}
                        title="Công bố tỷ lệ rơi"
                        className="cel-panel w-8 h-8 rounded-lg flex items-center justify-center text-slate-300 hover:text-amber-300 cursor-pointer shrink-0"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        disabled={!can1}
                        onClick={() => onOpenChestWithGacha(c.variant, 1)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                          can1
                            ? c.btnClass
                            : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <span>Mở ×1 ·</span>
                        <span className="font-mono-nums">{c.cost1}</span>
                        <CurrencyIcon className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        disabled={!can10}
                        onClick={() => onOpenChestWithGacha(c.variant, 10)}
                        className={`py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                          can10
                            ? 'a2-emerald-btn'
                            : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <span>Mở ×10 ·</span>
                        <span className="font-mono-nums">{c.cost10}</span>
                        <CurrencyIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {oddsData && (
        <div
          onClick={() => setOddsModalVariant(null)}
          className="fixed inset-0 z-50 bg-[#040611]/88 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="cel-panel-ornate w-full max-w-md rounded-3xl p-5 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-amber-400/25 pb-2.5">
              <h3 className="font-display text-base font-black text-amber-200">
                {oddsData.title}
              </h3>
              <button
                type="button"
                onClick={() => setOddsModalVariant(null)}
                className="cel-panel w-8 h-8 rounded-lg flex items-center justify-center text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2 text-xs">
              {oddsData.rows.map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between py-2 px-3 rounded-xl bg-[#070b1a] border border-amber-400/15"
                >
                  <span className={`font-bold ${row.colorClass}`}>{row.label}</span>
                  <span className="font-mono-nums font-black text-white">{row.rate}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-slate-300 leading-relaxed bg-[#080d22] rounded-xl p-3 border border-amber-400/20">
              {oddsData.pityNote}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};


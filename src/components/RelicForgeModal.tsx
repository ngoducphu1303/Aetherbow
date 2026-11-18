import React, { useMemo, useState } from 'react';
import { Crown, Flame, Gem, Hammer, Lock, Plus, Recycle, RefreshCw, Sparkles, Star, Unlock, X } from 'lucide-react';
import awakeningAnvilArt from '../assets/images/awakening_star_anvil_1794982055198.jpg';
import relicForgeArt from '../assets/images/relic_forge_anvil_art_1794977270695.jpg';
import zodiacGemArt from '../assets/images/zodiac_gem_sockets_1794983175988.jpg';
import { soundEngine } from '../audio/soundEngine';
import { GEAR_TEMPLATES, RARITY_META, RARITY_ORDER, getGearPowerScore } from '../data/gearData';
import { FORGE_RECIPES, getSalvageValue } from '../data/wave3Data';
import {
  SUBSTAT_DEFS,
  getAwakenCost,
  getAwakeningMultiplier,
  getEffectiveSubstats,
  getMaxSubstatsForRarity,
  getReforgeCost,
  getSubstatTierColor,
  normalizeGuild,
} from '../data/wave4Data';
import {
  SOCKET_GEM_COLORS,
  SOCKET_GEM_META,
  getMaxGemSocketsForRarity,
  getSocketGemCraftCost,
  getSocketGemLabel,
  getSocketGemTierRoman,
  normalizeSocketGems,
} from '../data/wave5Data';
import { ForgeRecipe, GearInstance, Rarity, SaveData, SocketGemColor } from '../types/game';
import { GearSlotSvg, GoldCoinIcon, RARITY_FRAME_CLASS, StarDustIcon } from './GameIcons';

interface RelicForgeModalProps {
  save: SaveData;
  initialSubTab?: 'salvage' | 'forge' | 'reforge' | 'awaken' | 'sockets';
  initialGearUid?: string;
  onSalvageGear: (uids: string[]) => void;
  onCraftForgeRecipe: (recipe: ForgeRecipe) => void;
  onReforgeGear: (uid: string, lockedIds: string[]) => void;
  onAwakenGear: (uid: string) => void;
  onCraftSocketGem: (tier: 1 | 2) => void;
  onFuseSocketGem: (color: SocketGemColor, tier: 1 | 2) => void;
  onSocketGemToGear: (gearUid: string, gemUid: string) => void;
  onUnsocketGemFromGear: (gearUid: string, gemUid: string) => void;
  onClose: () => void;
}

export const RelicForgeModal: React.FC<RelicForgeModalProps> = ({
  save,
  initialSubTab = 'salvage',
  initialGearUid,
  onSalvageGear,
  onCraftForgeRecipe,
  onReforgeGear,
  onAwakenGear,
  onCraftSocketGem,
  onFuseSocketGem,
  onSocketGemToGear,
  onUnsocketGemFromGear,
  onClose,
}) => {
  const [subTab, setSubTab] = useState<'salvage' | 'forge' | 'reforge' | 'awaken' | 'sockets'>(
    initialSubTab
  );
  const [selectedUids, setSelectedUids] = useState<string[]>([]);
  const [imgErr, setImgErr] = useState(false);
  const [awakenImgErr, setAwakenImgErr] = useState(false);
  const [gemImgErr, setGemImgErr] = useState(false);
  const [lockedSubstatIds, setLockedSubstatIds] = useState<string[]>([]);

  const equippedSet = useMemo(() => new Set(Object.values(save.equipped)), [save.equipped]);
  const allSocketGems = useMemo(() => normalizeSocketGems(save.socketGems), [save.socketGems]);
  const socketedGemUidSet = useMemo(() => {
    const s = new Set<string>();
    for (const item of save.inventory) {
      for (const gid of item.socketedGems ?? []) {
        s.add(gid);
      }
    }
    return s;
  }, [save.inventory]);
  const spareGems = useMemo(
    () => allSocketGems.filter((g) => !socketedGemUidSet.has(g.uid)),
    [allSocketGems, socketedGemUidSet]
  );

  const sortedAllGear = useMemo(() => {
    return [...save.inventory].sort((a, b) => {
      const aEq = equippedSet.has(a.uid) ? 1 : 0;
      const bEq = equippedSet.has(b.uid) ? 1 : 0;
      if (bEq !== aEq) return bEq - aEq;
      const ra = RARITY_ORDER.indexOf(a.rarity);
      const rb = RARITY_ORDER.indexOf(b.rarity);
      if (rb !== ra) return rb - ra;
      return getGearPowerScore(b, allSocketGems) - getGearPowerScore(a, allSocketGems);
    });
  }, [save.inventory, equippedSet, allSocketGems]);

  const [focusGearUid, setFocusGearUid] = useState<string>(
    initialGearUid || sortedAllGear[0]?.uid || ''
  );

  const focusedItem =
    save.inventory.find((g) => g.uid === focusGearUid) || sortedAllGear[0];

  const salvageableItems = useMemo(
    () =>
      save.inventory
        .filter((item) => !equippedSet.has(item.uid) && item.rarity !== Rarity.MYTHIC)
        .sort((a, b) => getGearPowerScore(a) - getGearPowerScore(b)),
    [save.inventory, equippedSet]
  );

  const selectedItems = useMemo(
    () => salvageableItems.filter((item) => selectedUids.includes(item.uid)),
    [salvageableItems, selectedUids]
  );

  const previewReward = useMemo(() => {
    return selectedItems.reduce(
      (acc, item) => {
        const val = getSalvageValue(item);
        acc.starDust += val.starDust;
        acc.gold += val.gold;
        return acc;
      },
      { starDust: 0, gold: 0 }
    );
  }, [selectedItems]);

  const toggleItem = (uid: string) => {
    setSelectedUids((prev) =>
      prev.includes(uid) ? prev.filter((id) => id !== uid) : [...prev, uid]
    );
  };

  const selectAllCommonRare = () => {
    const uids = salvageableItems
      .filter((i) => i.rarity === Rarity.COMMON || i.rarity === Rarity.RARE)
      .map((i) => i.uid);
    setSelectedUids(uids);
  };

  const handleConfirmSalvage = () => {
    if (selectedItems.length === 0) return;
    onSalvageGear(selectedItems.map((i) => i.uid));
    setSelectedUids([]);
  };

  const starDust = save.starDust ?? 0;
  const guildCoins = normalizeGuild(save.guild).guildCoins;

  const focusMaxSubstats = focusedItem ? getMaxSubstatsForRarity(focusedItem.rarity) : 0;
  const focusSubstats = focusedItem ? getEffectiveSubstats(focusedItem) : [];
  const validLockedIds = lockedSubstatIds.filter((id) =>
    focusSubstats.some((s) => s.id === id)
  );
  const maxAllowedLocks = Math.max(0, focusMaxSubstats - 1);
  const reforgeCost = focusedItem
    ? getReforgeCost(focusedItem, validLockedIds.length)
    : { starDust: 0, gold: 0 };

  const awakenCost = focusedItem ? getAwakenCost(focusedItem) : { starDust: 0, gold: 0, guildCoins: 0, maxStars: 0 };
  const focusAwakenLv = focusedItem?.awakeningLevel ?? 0;

  const toggleLockSubstat = (id: string) => {
    soundEngine.playUiClick();
    setLockedSubstatIds((prev) => {
      const cleaned = prev.filter((x) => focusSubstats.some((s) => s.id === x));
      if (cleaned.includes(id)) return cleaned.filter((x) => x !== id);
      if (cleaned.length >= maxAllowedLocks) return cleaned;
      return [...cleaned, id];
    });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/90 overflow-y-auto">
      <div className="cel-panel-ornate w-full max-w-4xl rounded-3xl p-4 sm:p-6 my-auto max-h-[92vh] overflow-y-auto a2-scroll a2-modal-enter">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-300/60 flex items-center justify-center shrink-0">
              <Hammer className="w-5 h-5 text-sky-300" />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-lg sm:text-xl font-black text-white truncate">
                Lò Rèn Tinh Tú · Tẩy Luyện &amp; Thức Tỉnh
              </h2>
              <p className="text-[11px] text-slate-300 truncate">
                Tách đồ dư, đúc Thánh Vật [S], tẩy dòng phụ (Khóa dòng) và Thức Tỉnh ★3 ánh kim
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-3 py-1.5 rounded-xl bg-[#070b1a] border border-sky-400/40 flex items-center gap-1.5 text-xs font-mono-nums font-black text-sky-300">
              <StarDustIcon className="w-4 h-4" />
              <span>{starDust}</span>
            </div>
            <div className="hidden sm:flex px-3 py-1.5 rounded-xl bg-[#070b1a] border border-amber-400/40 items-center gap-1.5 text-xs font-mono-nums font-black text-amber-300">
              <Crown className="w-3.5 h-3.5" />
              <span>{guildCoins} Xu</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="a2-slate-btn w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 5 Sub Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-4">
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setSubTab('salvage');
            }}
            className={`py-2.5 px-3 rounded-xl font-black text-xs whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              subTab === 'salvage'
                ? 'a2-emerald-btn shadow-lg'
                : 'a2-slate-btn text-slate-300'
            }`}
          >
            <Recycle className="w-4 h-4" />
            <span>Tách Đồ ({salvageableItems.length})</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setSubTab('forge');
            }}
            className={`py-2.5 px-3 rounded-xl font-black text-xs whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              subTab === 'forge'
                ? 'a2-yellow-btn shadow-lg'
                : 'a2-slate-btn text-slate-300'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Đúc Thánh Vật [S]</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setSubTab('reforge');
            }}
            className={`py-2.5 px-3 rounded-xl font-black text-xs whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              subTab === 'reforge'
                ? 'a2-purple-btn shadow-lg'
                : 'a2-slate-btn text-slate-300'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Tẩy Luyện Dòng</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setSubTab('awaken');
            }}
            className={`py-2.5 px-3 rounded-xl font-black text-xs whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
              subTab === 'awaken'
                ? 'a2-yellow-btn shadow-lg'
                : 'a2-slate-btn text-slate-300'
            }`}
          >
            <Flame className="w-4 h-4" />
            <span>Thức Tỉnh ★3</span>
          </button>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              setSubTab('sockets');
            }}
            className={`py-2.5 px-3 rounded-xl font-black text-xs whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer transition-all col-span-2 sm:col-span-1 ${
              subTab === 'sockets'
                ? 'a2-emerald-btn shadow-lg'
                : 'a2-slate-btn text-slate-300'
            }`}
          >
            <Gem className="w-4 h-4" />
            <span>Khảm Ngọc ({spareGems.length})</span>
          </button>
        </div>

        {subTab === 'salvage' && (
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <p className="text-[11px] text-slate-300 font-semibold">
                Trang bị đang mặc và bậc Thần Thoại (Mythic) được bảo vệ an toàn.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllCommonRare}
                  disabled={salvageableItems.length === 0}
                  className="a2-slate-btn px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap cursor-pointer disabled:opacity-40"
                >
                  Chọn Nhanh Thường &amp; Hiếm
                </button>
                {selectedUids.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedUids([])}
                    className="a2-slate-btn px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap cursor-pointer"
                  >
                    Bỏ Chọn
                  </button>
                )}
              </div>
            </div>

            {salvageableItems.length === 0 ? (
              <div className="rounded-2xl bg-[#070b1a]/95 border border-slate-800 p-8 text-center text-xs text-slate-400">
                Không có trang bị dư nào chưa mặc để tách hủy. Hãy mở rương hoặc vượt ải để thu thập thêm!
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-h-[44vh] overflow-y-auto a2-scroll pr-1 mb-4">
                {salvageableItems.map((item: GearInstance) => {
                  const tpl = GEAR_TEMPLATES[item.templateId];
                  const rMeta = RARITY_META[item.rarity];
                  const selected = selectedUids.includes(item.uid);
                  const val = getSalvageValue(item);
                  if (!tpl) return null;
                  return (
                    <button
                      key={item.uid}
                      type="button"
                      onClick={() => toggleItem(item.uid)}
                      className={`relative rounded-2xl p-2.5 text-left border transition-all cursor-pointer ${
                        RARITY_FRAME_CLASS[item.rarity]
                      } ${
                        selected
                          ? 'ring-2 ring-emerald-400 border-emerald-300 bg-emerald-950/35'
                          : 'bg-[#080c1d]/95 hover:border-amber-300/60'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className={`text-[10px] font-black ${rMeta.textClass}`}>
                          {rMeta.label}
                        </span>
                        <span className="font-mono-nums text-[10px] font-black text-slate-300">
                          Lv.{item.level}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <GearSlotSvg
                          slot={tpl.slot}
                          weaponArchetype={tpl.weaponArchetype}
                          accentHex={tpl.visualAccentHex}
                          className="w-8 h-8 shrink-0"
                        />
                        <div className="text-[11px] font-bold text-white leading-tight line-clamp-2">
                          {tpl.name}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono-nums font-black pt-1 border-t border-slate-800/80">
                        <span className="text-sky-300">+{val.starDust} Bụi</span>
                        <span className="text-amber-300">+{val.gold} V</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="rounded-2xl bg-[#070b1a]/95 border border-emerald-400/35 p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-xs">
                <div>
                  <span className="text-slate-400 font-bold">Đã chọn: </span>
                  <span className="font-mono-nums font-black text-white">
                    {selectedItems.length} món
                  </span>
                </div>
                <div className="flex items-center gap-1.5 font-mono-nums font-black text-sky-300">
                  <StarDustIcon className="w-4 h-4" />
                  <span>+{previewReward.starDust}</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono-nums font-black text-amber-300">
                  <GoldCoinIcon className="w-4 h-4" />
                  <span>+{previewReward.gold}</span>
                </div>
              </div>

              <button
                type="button"
                disabled={selectedItems.length === 0}
                onClick={handleConfirmSalvage}
                className="a2-emerald-btn py-2.5 px-5 rounded-xl font-black text-xs whitespace-nowrap flex items-center gap-2 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <Recycle className="w-4 h-4" />
                <span>Xác Nhận Tách Hủy</span>
              </button>
            </div>
          </div>
        )}

        {subTab === 'forge' && (
          <div>
            <div className="relative rounded-2xl overflow-hidden border border-sky-400/40 mb-4 bg-gradient-to-br from-[#0e1938] to-[#1a1033]">
              {!imgErr && (
                <img
                  src={relicForgeArt}
                  alt="Lò Rèn Thánh Vật Tinh Giới"
                  referrerPolicy="no-referrer"
                  onError={() => setImgErr(true)}
                  className="w-full h-32 sm:h-36 object-cover opacity-80"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-[#070b1a]/95 via-[#091129]/75 to-transparent p-4 flex flex-col justify-end">
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">
                  Xưởng Đúc Tinh Tú Hoàng Đạo
                </div>
                <div className="font-display text-lg sm:text-xl font-black text-white">
                  Chế Tạo Đích Danh Trang Bị [S] &amp; Tinh Chất
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[42vh] overflow-y-auto a2-scroll pr-1">
              {FORGE_RECIPES.map((recipe) => {
                const canAfford =
                  starDust >= recipe.starDustCost && save.gold >= recipe.goldCost;
                return (
                  <div
                    key={recipe.id}
                    className="rounded-2xl bg-[#070b1a]/95 border border-amber-400/30 p-3.5 flex flex-col justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-display text-sm font-black text-white">
                          {recipe.title}
                        </span>
                        <span className="text-[10px] font-black text-sky-300 whitespace-nowrap">
                          {recipe.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug">
                        {recipe.subtitle}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                      <div className="flex items-center gap-3 text-xs font-mono-nums font-black">
                        <span
                          className={`flex items-center gap-1 ${
                            starDust >= recipe.starDustCost ? 'text-sky-300' : 'text-rose-400'
                          }`}
                        >
                          <StarDustIcon className="w-3.5 h-3.5" />
                          {recipe.starDustCost}
                        </span>
                        <span
                          className={`flex items-center gap-1 ${
                            save.gold >= recipe.goldCost ? 'text-amber-300' : 'text-rose-400'
                          }`}
                        >
                          <GoldCoinIcon className="w-3.5 h-3.5" />
                          {recipe.goldCost}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => onCraftForgeRecipe(recipe)}
                        className="a2-yellow-btn py-2 px-3.5 rounded-xl font-black text-xs whitespace-nowrap flex items-center gap-1.5 cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                      >
                        <Hammer className="w-3.5 h-3.5" />
                        <span>Rèn Ngay</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(subTab === 'reforge' || subTab === 'awaken' || subTab === 'sockets') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* Left Gear Selector */}
            <div className="lg:col-span-5 cel-panel rounded-2xl p-3">
              <div className="text-xs font-black text-amber-200 mb-2">
                Chọn Trang Bị ({sortedAllGear.length})
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-[46vh] overflow-y-auto a2-scroll pr-1">
                {sortedAllGear.map((item) => {
                  const tpl = GEAR_TEMPLATES[item.templateId];
                  if (!tpl) return null;
                  const isFocused = focusedItem?.uid === item.uid;
                  const isEq = equippedSet.has(item.uid);
                  const awk = item.awakeningLevel ?? 0;
                  const sockCount = item.socketedGems?.length ?? 0;
                  const maxSock = getMaxGemSocketsForRarity(item.rarity);
                  const isHolo =
                    item.rarity === Rarity.LEGENDARY ||
                    item.rarity === Rarity.MYTHIC ||
                    tpl.isSTier ||
                    awk > 0;

                  return (
                    <button
                      key={item.uid}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        setFocusGearUid(item.uid);
                        setLockedSubstatIds([]);
                      }}
                      className={`a2-item-card aspect-square cursor-pointer ${
                        RARITY_FRAME_CLASS[item.rarity]
                      } ${isHolo ? 'a2-holo-foil overflow-hidden' : ''} ${
                        isFocused ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-[#070b18]' : ''
                      }`}
                    >
                      <div className="a2-item-inner flex flex-col items-center justify-center p-1">
                        <GearSlotSvg
                          slot={tpl.slot}
                          weaponArchetype={tpl.weaponArchetype}
                          accentHex={tpl.visualAccentHex}
                          className="w-8 h-8"
                        />
                        <span className="text-[9px] font-mono-nums font-black text-white mt-0.5">
                          Lv.{item.level}
                        </span>
                        {awk > 0 && (
                          <span className="text-[9px] font-black text-amber-300 leading-none">
                            {'★'.repeat(awk)}
                          </span>
                        )}
                        {subTab === 'sockets' && maxSock > 0 && (
                          <span className="text-[8px] font-mono-nums font-black text-sky-300 mt-0.5">
                            Ngọc {sockCount}/{maxSock}
                          </span>
                        )}
                      </div>
                      {isEq && (
                        <span className="absolute top-1 left-1 px-1 py-0.5 rounded bg-emerald-600 text-[8px] font-black text-white">
                          Mặc
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Right Active Bench */}
            <div className="lg:col-span-7 space-y-3">
              {focusedItem && GEAR_TEMPLATES[focusedItem.templateId] ? (
                (() => {
                  const tpl = GEAR_TEMPLATES[focusedItem.templateId];
                  const rMeta = RARITY_META[focusedItem.rarity];
                  const isHolo =
                    focusedItem.rarity === Rarity.LEGENDARY ||
                    focusedItem.rarity === Rarity.MYTHIC ||
                    tpl.isSTier ||
                    focusAwakenLv > 0;

                  if (subTab === 'sockets') {
                    const maxSockets = getMaxGemSocketsForRarity(focusedItem.rarity);
                    const equippedGemUids = focusedItem.socketedGems ?? [];
                    const craftT1 = getSocketGemCraftCost(1);
                    const canCraftT1 = starDust >= craftT1.starDust && save.gold >= craftT1.gold;

                    const fusableGroups: Array<{
                      color: SocketGemColor;
                      tier: 1 | 2;
                      count: number;
                    }> = [];
                    for (const color of SOCKET_GEM_COLORS) {
                      for (const t of [1, 2] as const) {
                        const c = spareGems.filter((g) => g.color === color && g.tier === t).length;
                        if (c >= 3) fusableGroups.push({ color, tier: t, count: c });
                      }
                    }

                    return (
                      <div className="cel-panel rounded-2xl overflow-hidden">
                        <div className="relative h-24 bg-[#070b1a] border-b border-emerald-400/25">
                          {!gemImgErr && (
                            <img
                              src={zodiacGemArt}
                              alt="Đài Khảm Bảo Thạch Hoàng Đạo"
                              referrerPolicy="no-referrer"
                              onError={() => setGemImgErr(true)}
                              className="w-full h-full object-cover opacity-55"
                            />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-r from-[#070b1a]/95 via-[#091529]/75 to-transparent p-3.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className={`text-[10px] font-black ${rMeta.textClass}`}>
                                {rMeta.label} · Tối đa {maxSockets} Ổ Khảm Bảo Thạch
                              </div>
                              <h3 className="font-display text-base font-black text-white truncate">
                                {tpl.name}
                              </h3>
                            </div>
                            <button
                              type="button"
                              disabled={!canCraftT1}
                              onClick={() => {
                                soundEngine.playForgeCraft();
                                onCraftSocketGem(1);
                              }}
                              className="a2-yellow-btn px-3 py-2 rounded-xl text-[11px] font-black whitespace-nowrap flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>Đúc Ngọc I ({craftT1.starDust} Bụi · {craftT1.gold} V)</span>
                            </button>
                          </div>
                        </div>

                        <div className="p-4 space-y-3.5">
                          {/* Gear Socket Slots */}
                          {maxSockets === 0 ? (
                            <div className="rounded-xl bg-[#070b1a] border border-slate-800 p-3 text-xs text-slate-400">
                              Trang bị bậc Thường chưa có ổ khảm. Ghép hoặc chọn đồ từ bậc Hiếm trở lên (Hiếm: 1 ổ, Sử Thi: 2 ổ, Huyền Thoại/Thần Thoại: 3 ổ).
                            </div>
                          ) : (
                            <div>
                              <div className="text-[11px] font-black text-amber-200 mb-2">
                                Ổ Khảm Trên Trang Bị (Nhấn vào ngọc đang khảm để tháo miễn phí):
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                {Array.from({ length: maxSockets }).map((_, slotIdx) => {
                                  const gUid = equippedGemUids[slotIdx];
                                  const gem = gUid ? allSocketGems.find((g) => g.uid === gUid) : undefined;
                                  if (!gem) {
                                    return (
                                      <div
                                        key={slotIdx}
                                        className="rounded-xl bg-[#060916] border border-dashed border-slate-700 p-2.5 text-center text-[11px] text-slate-500 font-semibold"
                                      >
                                        Ổ #{slotIdx + 1} · Trống
                                      </div>
                                    );
                                  }
                                  const def = SOCKET_GEM_META[gem.color];
                                  return (
                                    <button
                                      key={gem.uid}
                                      type="button"
                                      onClick={() => {
                                        soundEngine.playUiClick(0.95);
                                        onUnsocketGemFromGear(focusedItem.uid, gem.uid);
                                      }}
                                      className={`rounded-xl p-2.5 border text-left cursor-pointer hover:brightness-110 ${def.bgClass} ${def.borderClass}`}
                                      title="Nhấn để tháo Bảo Thạch khỏi trang bị"
                                    >
                                      <div className="flex items-center justify-between text-[10px] font-black">
                                        <span className={def.textClass}>
                                          {def.name} {getSocketGemTierRoman(gem.tier)}
                                        </span>
                                        <span className="text-slate-300">Tháo</span>
                                      </div>
                                      <div className="text-[11px] font-mono-nums font-bold text-white mt-0.5">
                                        {getSocketGemLabel(gem)}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* 3->1 Gem Synthesis Bar */}
                          {fusableGroups.length > 0 && (
                            <div className="rounded-xl bg-[#091229] border border-purple-400/40 p-2.5 flex flex-wrap items-center gap-2">
                              <span className="text-[11px] font-black text-purple-200">
                                Ghép 3→1 Nâng Tầng:
                              </span>
                              {fusableGroups.map((fg) => {
                                const def = SOCKET_GEM_META[fg.color];
                                return (
                                  <button
                                    key={`${fg.color}_${fg.tier}`}
                                    type="button"
                                    onClick={() => {
                                      soundEngine.playVictory();
                                      onFuseSocketGem(fg.color, fg.tier);
                                    }}
                                    className="a2-purple-btn px-2.5 py-1 rounded-lg text-[10px] font-black cursor-pointer"
                                  >
                                    {def.statShort} {getSocketGemTierRoman(fg.tier)} →{' '}
                                    {getSocketGemTierRoman((fg.tier + 1) as 2 | 3)}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Spare Socket Gems Vault */}
                          <div>
                            <div className="text-[11px] font-black text-slate-300 mb-2">
                              Kho Bảo Thạch Dự Trữ ({spareGems.length} viên):
                            </div>
                            {spareGems.length === 0 ? (
                              <div className="rounded-xl bg-[#070b1a] border border-slate-800 p-4 text-center text-xs text-slate-400">
                                Chưa có Bảo Thạch rảnh. Hãy nhấn Đúc Ngọc I hoặc ghé Chợ Đêm!
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto a2-scroll pr-1">
                                {spareGems.map((gem) => {
                                  const def = SOCKET_GEM_META[gem.color];
                                  const canSocket = equippedGemUids.length < maxSockets;
                                  return (
                                    <div
                                      key={gem.uid}
                                      className={`rounded-xl px-3 py-2 border flex items-center justify-between gap-2 ${def.bgClass} ${def.borderClass}`}
                                    >
                                      <div className="min-w-0">
                                        <div className={`text-xs font-black truncate ${def.textClass}`}>
                                          {def.name} · Tầng {getSocketGemTierRoman(gem.tier)}
                                        </div>
                                        <div className="text-[10px] font-mono-nums font-bold text-slate-200">
                                          {getSocketGemLabel(gem)}
                                        </div>
                                      </div>
                                      <button
                                        type="button"
                                        disabled={!canSocket}
                                        onClick={() => {
                                          soundEngine.playLevelUp();
                                          onSocketGemToGear(focusedItem.uid, gem.uid);
                                        }}
                                        className="a2-emerald-btn px-3 py-1.5 rounded-lg text-[10px] font-black shrink-0 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed"
                                      >
                                        Khảm
                                      </button>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (subTab === 'reforge') {
                    const canReforge =
                      focusMaxSubstats > 0 &&
                      starDust >= reforgeCost.starDust &&
                      save.gold >= reforgeCost.gold;

                    return (
                      <div className="cel-panel rounded-2xl p-4 space-y-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`a2-item-card w-14 h-14 shrink-0 ${
                              RARITY_FRAME_CLASS[focusedItem.rarity]
                            } ${isHolo ? 'a2-holo-foil overflow-hidden' : ''}`}
                          >
                            <div className="a2-item-inner flex items-center justify-center">
                              <GearSlotSvg
                                slot={tpl.slot}
                                weaponArchetype={tpl.weaponArchetype}
                                accentHex={tpl.visualAccentHex}
                                className="w-8 h-8"
                              />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className={`text-[11px] font-black ${rMeta.textClass}`}>
                              {rMeta.label} · Tối đa {focusMaxSubstats} dòng phụ
                            </div>
                            <h3 className="font-display text-base font-black text-white truncate">
                              {tpl.name}
                            </h3>
                          </div>
                        </div>

                        {focusMaxSubstats === 0 ? (
                          <div className="rounded-xl bg-[#070b1a] border border-slate-800 p-4 text-xs text-slate-400">
                            Trang bị bậc Thường chưa có Dòng Phụ. Hãy ghép lên Hiếm, Sử Thi, Huyền Thoại hoặc chọn món phẩm chất cao hơn để Tẩy Luyện!
                          </div>
                        ) : (
                          <>
                            <div className="space-y-2">
                              {focusSubstats.length === 0 ? (
                                <div className="rounded-xl bg-[#070b1a] border border-purple-400/30 p-3 text-xs text-purple-200">
                                  Trang bị này chưa mở dòng phụ — nhấn Tẩy Luyện để kích hoạt ngay {focusMaxSubstats} dòng thuộc tính!
                                </div>
                              ) : (
                                focusSubstats.map((sub) => {
                                  const def = SUBSTAT_DEFS[sub.kind];
                                  const locked = validLockedIds.includes(sub.id);
                                  const canLock = locked || validLockedIds.length < maxAllowedLocks;
                                  return (
                                    <div
                                      key={sub.id}
                                      className={`rounded-xl px-3 py-2.5 border flex items-center justify-between gap-2 ${
                                        locked
                                          ? 'bg-amber-500/15 border-amber-300/70'
                                          : 'bg-[#070b1a] border-amber-400/20'
                                      }`}
                                    >
                                      <div>
                                        <span className={`text-xs font-black ${getSubstatTierColor(sub.tier)}`}>
                                          {def.format(sub.value)}
                                        </span>
                                        <span className="ml-2 text-[10px] text-slate-400 font-semibold">
                                          ({def.label})
                                        </span>
                                      </div>

                                      {maxAllowedLocks > 0 && (
                                        <button
                                          type="button"
                                          disabled={!canLock}
                                          onClick={() => toggleLockSubstat(sub.id)}
                                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer disabled:opacity-35 ${
                                            locked
                                              ? 'a2-yellow-btn'
                                              : 'a2-slate-btn text-slate-300'
                                          }`}
                                        >
                                          {locked ? (
                                            <Lock className="w-3 h-3" />
                                          ) : (
                                            <Unlock className="w-3 h-3" />
                                          )}
                                          <span>{locked ? 'Đã Khóa' : 'Khóa'}</span>
                                        </button>
                                      )}
                                    </div>
                                  );
                                })
                              )}
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-amber-400/20">
                              <div className="flex items-center gap-3 text-xs font-mono-nums font-black">
                                <span className={starDust >= reforgeCost.starDust ? 'text-sky-300' : 'text-rose-400'}>
                                  {reforgeCost.starDust} Bụi Sao
                                </span>
                                <span className={save.gold >= reforgeCost.gold ? 'text-amber-300' : 'text-rose-400'}>
                                  {reforgeCost.gold} Vàng
                                </span>
                              </div>

                              <button
                                type="button"
                                disabled={!canReforge}
                                onClick={() => {
                                  soundEngine.playForgeCraft();
                                  onReforgeGear(focusedItem.uid, validLockedIds);
                                }}
                                className="a2-purple-btn px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <RefreshCw className="w-3.5 h-3.5" />
                                <span>Tẩy Luyện Dòng</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  }

                  // AWAKENING TAB
                  const canAwaken =
                    focusAwakenLv < awakenCost.maxStars &&
                    starDust >= awakenCost.starDust &&
                    save.gold >= awakenCost.gold &&
                    guildCoins >= awakenCost.guildCoins;
                  const curMultPct = Math.round((getAwakeningMultiplier(focusAwakenLv) - 1) * 100);
                  const nextMultPct = Math.round((getAwakeningMultiplier(focusAwakenLv + 1) - 1) * 100);

                  return (
                    <div className="cel-panel rounded-2xl overflow-hidden">
                      <div className="relative h-28 bg-[#070b1a] border-b border-amber-400/25">
                        {!awakenImgErr && (
                          <img
                            src={awakeningAnvilArt}
                            alt="Đài Thức Tỉnh Tinh Tú"
                            referrerPolicy="no-referrer"
                            onError={() => setAwakenImgErr(true)}
                            className="w-full h-full object-cover opacity-55"
                          />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#070b1a]/95 via-[#0b132b]/75 to-transparent p-4 flex items-center gap-3.5">
                          <div
                            className={`a2-item-card w-14 h-14 shrink-0 ${
                              RARITY_FRAME_CLASS[focusedItem.rarity]
                            } ${isHolo ? 'a2-holo-foil overflow-hidden' : ''}`}
                          >
                            <div className="a2-item-inner flex items-center justify-center">
                              <GearSlotSvg
                                slot={tpl.slot}
                                weaponArchetype={tpl.weaponArchetype}
                                accentHex={tpl.visualAccentHex}
                                className="w-8 h-8"
                              />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 text-amber-300 text-xs font-black">
                              <Star className="w-3.5 h-3.5" />
                              <span>
                                Thức Tỉnh ★{focusAwakenLv}/{awakenCost.maxStars} (+{curMultPct}% chỉ số gốc)
                              </span>
                            </div>
                            <h3 className="font-display text-base font-black text-white truncate">
                              {tpl.name}
                            </h3>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        {awakenCost.maxStars === 0 ? (
                          <div className="text-xs text-slate-400">
                            Chỉ trang bị từ bậc Sử Thi trở lên mới có thể Thức Tỉnh (Sử Thi tối đa ★2, Huyền Thoại &amp; Thần Thoại tối đa ★3).
                          </div>
                        ) : focusAwakenLv >= awakenCost.maxStars ? (
                          <div className="rounded-xl bg-amber-500/15 border border-amber-300/60 p-3.5 text-xs font-black text-amber-200">
                            Trang bị đã đạt cảnh giới Thức Tỉnh Tối Đa ★{awakenCost.maxStars} (+{curMultPct}% toàn bộ thuộc tính)!
                          </div>
                        ) : (
                          <>
                            <div className="rounded-xl bg-[#070b1a] border border-amber-400/25 p-3 text-xs flex items-center justify-between">
                              <span className="text-slate-300 font-semibold">
                                Thức Tỉnh lên ★{focusAwakenLv + 1}
                              </span>
                              <span className="font-mono-nums font-black text-emerald-300">
                                +{curMultPct}% → +{nextMultPct}% ATK/HP/Giáp
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                              <div className="flex flex-wrap items-center gap-3 text-xs font-mono-nums font-black">
                                <span className={starDust >= awakenCost.starDust ? 'text-sky-300' : 'text-rose-400'}>
                                  {awakenCost.starDust} Bụi Sao
                                </span>
                                <span className={save.gold >= awakenCost.gold ? 'text-amber-300' : 'text-rose-400'}>
                                  {awakenCost.gold} Vàng
                                </span>
                                {awakenCost.guildCoins > 0 && (
                                  <span className={guildCoins >= awakenCost.guildCoins ? 'text-amber-200' : 'text-rose-400'}>
                                    {awakenCost.guildCoins} Xu Bang
                                  </span>
                                )}
                              </div>

                              <button
                                type="button"
                                disabled={!canAwaken}
                                onClick={() => {
                                  soundEngine.playVictory();
                                  onAwakenGear(focusedItem.uid);
                                }}
                                className="a2-yellow-btn px-4 py-2.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                <Flame className="w-3.5 h-3.5" />
                                <span>Thức Tỉnh ★{focusAwakenLv + 1}</span>
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })()
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

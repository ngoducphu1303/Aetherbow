import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowUpCircle,
  Bookmark,
  Check,
  Clock,
  Crown,
  Eye,
  Flame,
  Gem,
  Hammer,
  Heart,
  Info,
  Layers,
  Lock,
  Palette,
  Play,
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
import celestialPassVaultArt from '../assets/images/celestial_pass_vault_1795018173631.jpg';
import divineHaloArt from '../assets/images/divine_halo_sanctum_1795018170438.jpg';
import firstTopUpArt from '../assets/images/first_topup_treasury_1795007596297.jpg';
import flashDealVaultArt from '../assets/images/flash_deal_vault_art_1794973982335.jpg';
import growthFundVaultArt from '../assets/images/growth_fund_vault_1795004417139.jpg';
import mysticMerchantArt from '../assets/images/mystic_merchant_exchange_1795010358872.jpg';
import mythicArtifactsArt from '../assets/images/mythic_artifacts_sanctum_1795010356581.jpg';
import petSanctuaryArt from '../assets/images/pet_sanctuary_art_1794977269592.jpg';
import privilegeVaultArt from '../assets/images/privilege_royal_vault_1795005956277.jpg';
import royalChestArt from '../assets/images/royal_zodiac_chest_1794971375438.jpg';
import royalPrivilegeArt from '../assets/images/royal_privilege_showcase_1795010357812.jpg';
import spiritBeastEvolutionArt from '../assets/images/spirit_beast_evolution_sanctum_1795051177976.jpg';
import weekendGoldenTreasuryArt from '../assets/images/weekend_golden_treasury_1795051178810.jpg';
import wishPoolArt from '../assets/images/wish_pool_sanctum_1795007596305.jpg';
import zodiacMountsArt from '../assets/images/zodiac_mounts_sanctum_1795007595676.jpg';
import zodiacWingsArt from '../assets/images/zodiac_wings_sanctum_1795005955367.jpg';
import { soundEngine } from '../audio/soundEngine';
import {
  DEFAULT_LOADOUT_PRESET_SLOTS,
  HERO_MASTERY_MAX_LEVEL,
  computeHeroMasteryBonuses,
  getEarlyProgressionPolicy,
  isEarlyFeatureUnlocked,
  normalizeLoadoutPresets,
  RARITY_RANK,
} from '../data/earlyProgressionData';
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
  evaluateEquippedGearSets,
  findBestUpgradeTransferSource,
  getGearPowerScore,
  previewPresetPowerDelta,
  getGearStats,
  getUpgradeCost,
} from '../data/gearData';
import { computeWeeklyFairnessSummary } from '../data/progressionAdvisor';
import { HEROES, HERO_MAP, getHeroStarUpgradeCost } from '../data/heroesData';
import { getTodayKey } from '../data/questsData';
import { RUNES_CATALOG } from '../data/runesData';
import {
  HERO_SKINS,
  PETS_CATALOG,
  ZODIAC_AURAS,
  getPetStats,
  getPetUpgradeCost,
  isVipActive,
  normalizePets,
} from '../data/wave3Data';
import {
  SUBSTAT_DEFS,
  getEffectiveSubstats,
  getSubstatTierColor,
  normalizeBuildPresets,
} from '../data/wave4Data';
import {
  SOCKET_GEM_META,
  getMaxGemSocketsForRarity,
  getSocketGemBonuses,
  getSocketGemLabel,
  getSocketGemTierRoman,
  normalizeArena,
  normalizeSocketGems,
} from '../data/wave5Data';
import {
  ARENA_SHOP_OFFERS,
  ArenaShopOffer,
  COMMERCIAL_VALUE_PACKS,
  CommercialPackItem,
  GROWTH_FUND_MILESTONES,
  GROWTH_FUND_PREMIUM_GEM_COST,
  countClaimableGrowthFund,
  isGrowthFundMilestoneMet,
  normalizeArenaShop,
  normalizeGrowthFund,
} from '../data/wave6Data';
import {
  AVATAR_FRAMES,
  MAX_WING_LEVEL,
  MONTHLY_CARDS,
  TOPUP_EVOLUTION_MILESTONES,
  ZODIAC_WINGS,
  canClaimMonthlyCardDaily,
  countClaimableWave7Rewards,
  getWingStats,
  getWingUpgradeCost,
  isMonthlyCardActive,
  normalizeMonthlyPrivilege,
  normalizeTopUpEvolution,
} from '../data/wave7Data';
import {
  FIRST_TOPUP_TIERS,
  HOT_FLASH_BUNDLES,
  MAX_MOUNT_LEVEL,
  MAX_WEAPON_AURA_LEVEL,
  WEAPON_AURAS,
  WISH_MILESTONES,
  WISH_PITY_LIMIT,
  WISH_POOL_10_COST_GEMS,
  WISH_POOL_COST_GEMS,
  WISH_TARGET_CATALOG,
  ZODIAC_MOUNTS,
  getMountAppearance,
  getMountStats,
  getMountUpgradeCost,
  getWeaponAuraStats,
  getWeaponAuraUpgradeCost,
  normalizeFirstTopUp,
  normalizeWishPool,
} from '../data/wave8Data';
import {
  ARTIFACT_MAP,
  HERO_BONDS,
  MAX_ARTIFACT_LEVEL,
  MYSTIC_CURRENCY_LABELS,
  MYSTIC_EXCHANGE_OFFERS,
  MYTHIC_ARTIFACTS,
  evaluateHeroBonds,
  getArtifactStats,
  getArtifactUpgradeCost,
  normalizeMysticExchange,
} from '../data/wave9Data';
import {
  DIVINE_HALO_CATALOG,
  DIVINE_HALO_MAX_LEVEL,
  GEM_VAULT_CAPACITY,
  GEM_VAULT_CLAIM_THRESHOLD,
  GEM_VAULT_MILESTONES,
  STEP_UP_CHAIN_STEPS,
  countClaimableVaultRewards,
  getDivineHaloStats,
  getDivineHaloUpgradeCost,
  hasFreeChainStepReady,
  normalizeGemRebateVault,
  normalizeStepUpChain,
} from '../data/wave10Data';
import {
  SPIRIT_BEAST_EVOLUTION_COST,
  SPIRIT_BEAST_MIN_LEVEL,
  WEEKEND_PRIVILEGE_PACKS,
  canClaimWeekendPassDaily,
  formatCountdownHMS,
  getEvolvedPetMultiplier,
  getFlashSaleSecondsRemaining,
  getSpiritBeastFormName,
  normalizeWeekendPrivilege,
} from '../data/wave11Data';
import {
  SUPREME_MONTHLY_CONFIG,
  canClaimSupremeMonthlyDaily,
  isSupremeMonthlyActive,
  normalizeSupremeMonthly,
} from '../data/wave12Data';
import {
  ArtifactId,
  AuraStyleId,
  AvatarFrameId,
  BundlePreviewPayload,
  ComputedPlayerStats,
  FirstTopUpTier,
  FlashDealItem,
  GearInstance,
  GearSlot,
  HaloId,
  HeroId,
  HeroSkinId,
  HotFlashBundle,
  MonthlyCardTier,
  MountId,
  MysticCurrencyKind,
  PetId,
  Rarity,
  RuneInstance,
  SaveData,
  WeaponAuraId,
  WingId,
} from '../types/game';
import { getSkinAssetPack } from '../data/assetRegistry';
import {
  ArtifactRelicIcon,
  AwakenCrystalIcon,
  ChestSvg,
  GearSlotSvg,
  GoldCoinIcon,
  HeroCrestSvg,
  MountShardIcon,
  MysticTokenIcon,
  PetEssenceIcon,
  RARITY_FRAME_CLASS,
  ResilientAssetImg,
  SLOT_LABELS,
  SoulGemIcon,
  StarDustIcon,
  WingFeatherIcon,
  ZodiacAvatar,
} from './GameIcons';
import { StatDiffRow, UpgradeStatDiff } from './UpgradeStatDiff';

interface GearPanelProps {
  save: SaveData;
  stats: ComputedPlayerStats;
  onEquip: (uid: string) => void;
  onUpgrade: (uid: string) => void;
  onTransferGearUpgrade?: (sourceUid: string, targetUid: string) => void;
  onFuse: (uid: string) => void;
  onAutoEquipBest: () => void;
  onBulkFuseGear: () => void;
  onOpenForge: () => void;
  onOpenForgeSubTab?: (
    subTab: 'salvage' | 'forge' | 'reforge' | 'awaken' | 'sockets',
    gearUid?: string
  ) => void;
  onSaveBuildPreset: (idx: number) => void;
  onApplyBuildPreset: (idx: number) => void;
  onSaveLoadoutPreset?: (slotId: 'preset_1' | 'preset_2' | 'preset_3') => void;
  onApplyLoadoutPreset?: (slotId: 'preset_1' | 'preset_2' | 'preset_3') => void;
  onAutoOptimizeGear?: (goal: 'campaign' | 'boss' | 'arena') => void;
  onStartTrainingGrounds?: () => void;
  onOpenWardrobe?: () => void;
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
  onTransferGearUpgrade,
  onFuse,
  onAutoEquipBest,
  onBulkFuseGear,
  onOpenForge,
  onOpenForgeSubTab,
  onSaveBuildPreset,
  onApplyBuildPreset,
  onSaveLoadoutPreset,
  onApplyLoadoutPreset,
  onAutoOptimizeGear,
  onStartTrainingGrounds,
  onOpenWardrobe,
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
  const socketPool = normalizeSocketGems(save.socketGems);

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
          className="w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] rounded-2xl bg-[#0a0f24]/90 border border-amber-400/25 flex flex-col items-center justify-center text-[10px] font-semibold text-slate-400"
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
        className={`a2-item-card w-[64px] h-[64px] sm:w-[72px] sm:h-[72px] cursor-pointer ${
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
            className="w-8 h-8 sm:w-9 sm:h-9 drop-shadow"
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
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 border border-white text-[9px] font-black text-white flex items-center justify-center shadow">
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
    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden a2-scroll pointer-events-none">
      {/* LEFT STAGE: FULL-BODY LIVE 3D HERO + 6 FLOATING RELIC SLOTS */}
      <div
        onPointerDown={handleStagePointerDown}
        onPointerMove={handleStagePointerMove}
        onPointerUp={handleStagePointerUp}
        onPointerCancel={handleStagePointerUp}
        className="lg:col-span-5 relative flex flex-col justify-between px-3 sm:px-5 py-3 min-h-[340px] lg:min-h-0 pointer-events-auto cursor-grab active:cursor-grabbing touch-none select-none"
      >
        {/* Top breathing room so hero head & halo never touch header */}
        <div className="h-2 shrink-0" />

        {/* Middle: 3 Left Slots · Unobstructed Full-Body 3D Hero · 3 Right Slots */}
        <div className="flex-1 flex items-center justify-between gap-2 my-1">
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="flex flex-col gap-2.5 items-center z-10"
          >
            {LEFT_SLOTS.map(renderEquippedSlot)}
          </div>

          <div className="flex-1 min-h-[220px]" aria-hidden="true" />

          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="flex flex-col gap-2.5 items-center z-10"
          >
            {RIGHT_SLOTS.map(renderEquippedSlot)}
          </div>
        </div>

        {/* Bottom Compact Stat & 360° Action Pill (tucked cleanly below hero feet) */}
        <div className="flex justify-center pt-1 shrink-0">
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 bg-[#080d20]/92 border border-amber-400/35 rounded-2xl px-3.5 py-1.5 shadow-xl"
          >
            <span className="flex items-center gap-1 text-[11px] font-mono-nums font-black text-amber-200">
              <Sword className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              {stats.attack}
            </span>
            <span aria-hidden="true" className="text-amber-400/35">·</span>
            <span className="flex items-center gap-1 text-[11px] font-mono-nums font-black text-emerald-200">
              <Heart className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              {stats.maxHp}
            </span>
            {onResetHeroRotation && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  onResetHeroRotation();
                }}
                title="Đặt lại góc nhìn 360°"
                aria-label="Đặt lại góc nhìn"
                className="ml-1 w-6 h-6 rounded-lg bg-[#0d1530] border border-amber-400/30 flex items-center justify-center text-amber-200 hover:border-amber-300 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
            {onOpenWardrobe && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  onOpenWardrobe();
                }}
                className="px-2.5 h-6 rounded-lg bg-[#0d1530] border border-sky-400/40 flex items-center gap-1 text-[10px] font-black text-sky-200 hover:border-sky-300 cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-3 h-3 text-amber-300" />
                <span>Thử Đồ 3D</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE DRAWER: INDEPENDENTLY SCROLLABLE CELESTIAL GEAR VAULT */}
      <div className="lg:col-span-7 cel-side-drawer border-t lg:border-t-0 lg:border-l border-amber-400/35 flex flex-col min-h-0 pointer-events-auto">
        <div className="flex-1 min-h-0 overflow-y-auto a2-scroll px-3 sm:px-4 py-3 flex flex-col gap-3">
          {/* Unified Vault Header: Telemetry + Action Toolbar */}
          {(() => {
            const awakenedCount = save.inventory.filter((g) => (g.awakeningLevel ?? 0) > 0).length;
            const equippedGemsCount = Object.values(save.equipped).reduce((sum, uid) => {
              const g = save.inventory.find((x) => x.uid === uid);
              return sum + (g?.socketedGems?.length ?? 0);
            }, 0);
            return (
              <div className="cel-panel rounded-2xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 border border-amber-400/25">
                <div className="flex flex-wrap items-center gap-2.5 text-[11px] font-mono-nums font-bold">
                  <span className="flex items-center gap-1.5 font-display text-xs font-black text-amber-100">
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>Kho Đồ Hoàng Đạo</span>
                  </span>
                  <span className="text-slate-300">
                    Đồ: <strong className="text-white">{save.inventory.length}</strong>
                  </span>
                  <span className="text-amber-300">
                    Thức Tỉnh: <strong>{awakenedCount}</strong>
                  </span>
                  <span className="text-purple-300">
                    Bảo Thạch: <strong>{equippedGemsCount}</strong>
                  </span>
                  <span className="text-sky-200 flex items-center gap-1">
                    <StarDustIcon className="w-3 h-3 shrink-0" />
                    <strong>{save.starDust ?? 0}</strong>
                  </span>
                </div>

                {(() => {
                  const gearSetEval = evaluateEquippedGearSets(save);
                  if (gearSetEval.sets.length === 0) return null;
                  return (
                    <div className="w-full border-t border-amber-400/15 pt-1.5 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
                      <span className="font-black text-amber-300 uppercase tracking-wider text-[10px]">
                        Bộ Trang Bị:
                      </span>
                      {gearSetEval.sets.map((setEntry) => (
                        <span
                          key={setEntry.setId}
                          className="font-mono-nums text-slate-200"
                          title={
                            setEntry.nextTier
                              ? `Mốc ${setEntry.nextTier.piecesRequired} món: ${setEntry.nextTier.label}`
                              : setEntry.unlockedTiers.map((t) => t.label).join(' · ')
                          }
                        >
                          <strong
                            className={
                              setEntry.unlockedTiers.length > 0
                                ? 'text-emerald-300'
                                : 'text-sky-300'
                            }
                          >
                            {setEntry.displayName} ({setEntry.equippedCount}/{setEntry.maxPieces})
                          </strong>
                          {setEntry.unlockedTiers.length > 0 ? (
                            <span className="text-amber-200">
                              {' · '}
                              {setEntry.unlockedTiers.map((t) => t.label).join(' · ')}
                            </span>
                          ) : setEntry.nextTier ? (
                            <span className="text-slate-400">
                              {' · '}Mốc {setEntry.nextTier.piecesRequired}: {setEntry.nextTier.label}
                            </span>
                          ) : null}
                        </span>
                      ))}
                    </div>
                  );
                })()}

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onAutoEquipBest}
                    className="a2-emerald-btn px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <Zap className="w-3 h-3 shrink-0" />
                    <span>Tự Mặc Mạnh Nhất</span>
                  </button>

                  <button
                    type="button"
                    disabled={fusableSetCount === 0}
                    onClick={onBulkFuseGear}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer ${
                      fusableSetCount > 0
                        ? 'a2-yellow-btn'
                        : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    <Layers className="w-3 h-3 shrink-0" />
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
                    className="a2-slate-btn px-2.5 py-1.5 rounded-xl text-[11px] font-black text-amber-200 flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap border border-amber-400/40"
                  >
                    <Hammer className="w-3 h-3 text-amber-300 shrink-0" />
                    <span>Lò Rèn &amp; Tách Đồ</span>
                  </button>

                  <button
                    type="button"
                    onClick={onGoShop}
                    className="a2-purple-btn px-2.5 py-1.5 rounded-xl text-[11px] font-black cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    Kho Báu
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Wave 7 Pillar 3: Compact Fair Progression & Pity Transparency Strip */}
          {(() => {
            const fairness = computeWeeklyFairnessSummary(save);
            return (
              <div className="mb-2.5 rounded-xl bg-[#070d20]/95 border border-emerald-400/25 px-3 py-2 text-[11px] flex flex-wrap items-center justify-between gap-2">
                <div className="text-emerald-200 font-semibold leading-snug">
                  {fairness.highlightNote}
                </div>
                <div className="flex items-center gap-2.5 font-mono-nums tabular-nums text-[10px] font-bold text-slate-300 shrink-0">
                  <span>
                    Pity Sử Thi: <strong className="text-purple-300">{fairness.mythicEpicRemaining}</strong>
                  </span>
                  <span className="text-slate-600">·</span>
                  <span>
                    Dòng Vàng:{' '}
                    <strong className="text-amber-300">
                      {fairness.reforgeGoldPityCount}/{fairness.reforgeGoldPityMax}
                    </strong>
                  </span>
                  <span className="text-slate-600">·</span>
                  <span>
                    Mảnh Sử Thi:{' '}
                    <strong className="text-sky-300">
                      {fairness.epicShards}/{fairness.epicShardsTarget}
                    </strong>
                  </span>
                </div>
              </div>
            );
          })()}

          {/* Vertical Flow inside Right Drawer: Selected Item Inspector → Filters & Relic Grid → Saved Loadouts */}
          <div className="flex flex-col gap-3 pb-4">
            {/* SELECTED ITEM INSPECTOR */}
            <div>
              {selectedItem && (
                <div className="cel-panel-ornate rounded-2xl p-3">
                  {(() => {
                    const tpl = GEAR_TEMPLATES[selectedItem.templateId];
                    if (!tpl) return null;
                    const rMeta = RARITY_META[selectedItem.rarity];
                    const gStats = getGearStats(selectedItem);
                    const itemScore = getGearPowerScore(selectedItem, socketPool);
                    const upgradeCost = getUpgradeCost(selectedItem);
                    const isEquipped = save.equipped[tpl.slot] === selectedItem.uid;
                    const atMaxLevel = selectedItem.level >= rMeta.maxLevel;
                    const fuseReady = canFuseItem(selectedItem);
                    const awkLv = selectedItem.awakeningLevel ?? 0;
                    const substats = getEffectiveSubstats(selectedItem);
                    const maxSockets = getMaxGemSocketsForRarity(selectedItem.rarity);
                    const selectedSockets = (selectedItem.socketedGems ?? [])
                      .map((gid) => socketPool.find((g) => g.uid === gid))
                      .filter((g): g is NonNullable<typeof g> => Boolean(g));
                    const isHolo =
                      selectedItem.rarity === Rarity.LEGENDARY ||
                      selectedItem.rarity === Rarity.MYTHIC ||
                      Boolean(tpl.isSTier) ||
                      awkLv > 0;

                    const equippedUid = save.equipped[tpl.slot];
                    const equippedItem = !isEquipped
                      ? save.inventory.find((g) => g.uid === equippedUid)
                      : undefined;
                    const eqScore = equippedItem ? getGearPowerScore(equippedItem, socketPool) : 0;

                    return (
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-start gap-2.5">
                          <div
                            className={`a2-item-card w-13 h-13 shrink-0 ${
                              RARITY_FRAME_CLASS[selectedItem.rarity]
                            } ${isHolo ? 'a2-holo-foil' : ''}`}
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

                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1 text-[10px]">
                              <span className={`font-black ${rMeta.textClass}`}>
                                {rMeta.label} · {SLOT_LABELS[tpl.slot]}
                              </span>
                              <span aria-hidden="true" className="text-slate-600">·</span>
                              <span className="text-sky-300 font-bold">{tpl.setName}</span>
                              <span aria-hidden="true" className="text-slate-600">·</span>
                              <span className="font-mono-nums text-amber-200 font-bold">
                                Lv.{selectedItem.level}/{rMeta.maxLevel}
                              </span>
                              {awkLv > 0 && (
                                <span className="font-black text-amber-300">
                                  {'★'.repeat(awkLv)}
                                </span>
                              )}
                              <span className="ml-auto font-mono-nums text-emerald-300 font-bold">
                                {itemScore} LC
                              </span>
                            </div>
                            <h3 className="font-display text-sm sm:text-base font-black text-white truncate">
                              {tpl.name}
                            </h3>
                            <div className="flex flex-wrap gap-2.5 text-[11px] font-mono-nums text-amber-200 mt-0.5 font-bold">
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
                          </div>
                        </div>

                        {!atMaxLevel && (() => {
                          const nextStats = getGearStats({
                            ...selectedItem,
                            level: selectedItem.level + 1,
                          });
                          const diffRows: StatDiffRow[] = [];
                          if (nextStats.atk > gStats.atk || gStats.atk > 0) {
                            diffRows.push({
                              label: 'Công Kích (ATK)',
                              current: `+${gStats.atk}`,
                              next: `+${nextStats.atk}`,
                              delta:
                                nextStats.atk > gStats.atk
                                  ? `+${nextStats.atk - gStats.atk}`
                                  : undefined,
                            });
                          }
                          if (nextStats.hp > gStats.hp || gStats.hp > 0) {
                            diffRows.push({
                              label: 'Sinh Lực (HP)',
                              current: `+${gStats.hp}`,
                              next: `+${nextStats.hp}`,
                              delta:
                                nextStats.hp > gStats.hp
                                  ? `+${nextStats.hp - gStats.hp}`
                                  : undefined,
                            });
                          }
                          return diffRows.length > 0 ? (
                            <UpgradeStatDiff
                              title={`Cường hóa Lv.${selectedItem.level} → Lv.${selectedItem.level + 1}`}
                              rows={diffRows}
                            />
                          ) : null;
                        })()}

                        {(substats.length > 0 || maxSockets > 0) && (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {substats.map((sub) => (
                              <span
                                key={sub.id}
                                className={`px-2 py-0.5 rounded-lg bg-[#070b1a] border border-amber-400/20 text-[10px] font-mono-nums font-bold ${getSubstatTierColor(sub.tier)}`}
                              >
                                {SUBSTAT_DEFS[sub.kind].format(sub.value)}
                              </span>
                            ))}
                            {maxSockets > 0 && (
                              <span className="text-[10px] font-bold text-purple-200 flex items-center gap-1">
                                <Gem className="w-3 h-3 text-purple-300" />
                                Ngọc ({selectedSockets.length}/{maxSockets})
                              </span>
                            )}
                          </div>
                        )}

                        {!isEquipped && equippedItem && (() => {
                          const eqTpl = GEAR_TEMPLATES[equippedItem.templateId];
                          const lcDiff = itemScore - eqScore;
                          return (
                            <div className="bg-[#060916]/95 border border-amber-400/25 rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 text-[10px] font-mono-nums">
                              <span className="text-slate-300 truncate">
                                So với đang mặc ({eqTpl?.name ?? equippedItem.templateId} · {eqScore} LC):
                              </span>
                              <span
                                className={`font-black shrink-0 ${
                                  lcDiff > 0
                                    ? 'text-emerald-300'
                                    : lcDiff < 0
                                    ? 'text-rose-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {lcDiff > 0 ? `▲ +${lcDiff} LC` : lcDiff < 0 ? `▼ ${lcDiff} LC` : '= 0 LC'}
                              </span>
                            </div>
                          );
                        })()}

                        <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-amber-400/15">
                          <button
                            type="button"
                            disabled={isEquipped}
                            onClick={() => onEquip(selectedItem.uid)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer ${
                              isEquipped
                                ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 cursor-default'
                                : 'a2-emerald-btn'
                            }`}
                          >
                            {isEquipped && <Check className="w-3.5 h-3.5" />}
                            <span>{isEquipped ? 'Đang Mặc' : 'Trang Bị'}</span>
                          </button>

                          <button
                            type="button"
                            disabled={atMaxLevel || save.gold < upgradeCost}
                            onClick={() => onUpgrade(selectedItem.uid)}
                            className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer ${
                              !atMaxLevel && save.gold >= upgradeCost
                                ? 'a2-yellow-btn'
                                : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            <ArrowUpCircle className="w-3.5 h-3.5" />
                            <span className="font-mono-nums">
                              {atMaxLevel ? 'Cấp Tối Đa' : `Cường Hóa · ${upgradeCost}`}
                            </span>
                          </button>

                          {onTransferGearUpgrade && (() => {
                            const transferSrc = findBestUpgradeTransferSource(save, selectedItem.uid);
                            if (!transferSrc) return null;
                            const srcTpl = GEAR_TEMPLATES[transferSrc.templateId];
                            return (
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playUiClick(1.1);
                                  onTransferGearUpgrade(transferSrc.uid, selectedItem.uid);
                                }}
                                title={`Hoán đổi cấp Cường Hóa miễn phí từ ${srcTpl?.name ?? 'đồ cũ'} (+${transferSrc.level}) — 0 Vàng, không mất vật phẩm`}
                                className="col-span-2 px-3 py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer bg-emerald-500/20 border border-emerald-400/60 text-emerald-200 hover:bg-emerald-500/30 transition-colors"
                              >
                                <RefreshCw className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                                <span className="font-mono-nums tabular-nums">
                                  Kế Thừa Lv.{transferSrc.level} Miễn Phí (0 Vàng · Không mất đồ)
                                </span>
                              </button>
                            );
                          })()}

                          {selectedItem.rarity !== Rarity.COMMON && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playUiClick();
                                  if (onOpenForgeSubTab) {
                                    onOpenForgeSubTab('sockets', selectedItem.uid);
                                  } else {
                                    onOpenForge();
                                  }
                                }}
                                className="a2-slate-btn px-2.5 py-1.5 rounded-xl text-[11px] font-black text-purple-200 flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer border border-purple-400/40"
                              >
                                <Gem className="w-3 h-3 text-purple-300" />
                                <span>
                                  Khảm Ngọc ({selectedSockets.length}/{maxSockets})
                                </span>
                              </button>

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
                                className="a2-slate-btn px-2.5 py-1.5 rounded-xl text-[11px] font-black text-sky-200 flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer border border-sky-400/35"
                              >
                                <RefreshCw className="w-3 h-3 text-sky-300" />
                                <span>Tẩy Luyện &amp; Thức Tỉnh</span>
                              </button>
                            </>
                          )}

                          {selectedItem.rarity !== Rarity.MYTHIC && (
                            <button
                              type="button"
                              disabled={!fuseReady}
                              onClick={() => onFuse(selectedItem.uid)}
                              className={`col-span-2 px-3 py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                                fuseReady
                                  ? 'a2-purple-btn'
                                  : 'bg-slate-900/90 border border-slate-700 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              <Layers className="w-3.5 h-3.5" />
                              <span>{fuseReady ? 'Ghép 3→1 Bậc Cao Hơn' : 'Cần 3 món cùng loại & bậc để ghép'}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* SLOT FILTERS + IMMEDIATE VISIBLE RELIC GRID + QUICK PRESETS */}
            <div className="flex flex-col gap-2.5">
              {/* Slot Filter Pills */}
              <div className="flex flex-wrap items-center gap-1 bg-[#060916] border border-amber-400/25 rounded-xl p-1">
                {(['ALL', ...Object.values(GearSlot)] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setSlotFilter(tab)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                      slotFilter === tab
                        ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 font-black shadow'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {tab === 'ALL' ? `Tất Cả (${save.inventory.length})` : SLOT_LABELS[tab]}
                  </button>
                ))}
              </div>

              {/* Immediate Visible Relic Grid */}
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
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
                          className="w-7 h-7 sm:w-8 sm:h-8"
                        />
                        <span className="text-[10px] font-black text-white font-mono-nums leading-none mt-0.5">
                          Lv.{item.level}{awkLv > 0 ? ` ★${awkLv}` : ''}
                        </span>
                        <span className="text-[8px] text-white/90 font-bold truncate max-w-full px-1">
                          {tpl.name}
                        </span>
                      </div>
                      {isEquipped && (
                        <span className="absolute top-1 left-1 px-1 py-0.5 rounded bg-emerald-600 border border-emerald-200/70 text-[8px] font-black text-white shadow leading-none">
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

              {/* Phase 4, 5 & Wave 6: 3-Slot Saved Loadout Presets (+/- CP Diff) + 1-Click Auto-Optimize */}
              <div className="cel-panel rounded-xl p-2 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-[11px] font-black text-amber-200 whitespace-nowrap">
                      <Bookmark className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                      <span>3 Bộ Trang Bị Nhanh</span>
                    </div>
                    {onStartTrainingGrounds && (
                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick(1.08);
                          onStartTrainingGrounds();
                        }}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-sky-500/15 border border-sky-400/50 text-sky-200 hover:border-sky-300 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Sân Tập 3D
                      </button>
                    )}
                  </div>

                  {onAutoOptimizeGear && (
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap">
                        Tối Ưu 1 Chạm:
                      </span>
                      {(
                        [
                          { id: 'campaign', label: 'Leo Chương' },
                          { id: 'boss', label: 'Săn Boss' },
                          { id: 'arena', label: 'Đấu 1v1' },
                        ] as const
                      ).map((g) => (
                        <button
                          key={g.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playLevelUp();
                            onAutoOptimizeGear(g.id);
                          }}
                          className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-400/15 border border-amber-300/50 text-amber-200 hover:bg-amber-400/25 whitespace-nowrap cursor-pointer"
                        >
                          {g.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {DEFAULT_LOADOUT_PRESET_SLOTS.map((slotMeta, idx) => {
                    const savedLoadouts = normalizeLoadoutPresets(save.loadoutPresets);
                    const savedPreset = savedLoadouts.find((p) => p.slotId === slotMeta.slotId);
                    const legacyPreset = buildPresets[idx];
                    const isActive = save.activeLoadoutPresetId === slotMeta.slotId;
                    const displayHeroId = savedPreset?.heroId ?? legacyPreset?.heroId;
                    const presetHero = displayHeroId ? HERO_MAP[displayHeroId]?.name ?? 'Anh Hùng' : 'Trống';
                    const gearCount = savedPreset
                      ? Object.values(savedPreset.equipped).filter(Boolean).length
                      : 0;
                    const runeCount = savedPreset
                      ? savedPreset.equippedRunes.length
                      : legacyPreset?.equippedRunes.length ?? 0;
                    const cpDiff = savedPreset
                      ? previewPresetPowerDelta(
                          save,
                          savedPreset.equipped,
                          savedPreset.heroId,
                          savedPreset.equippedRunes
                        ).delta
                      : null;

                    return (
                      <div
                        key={slotMeta.slotId}
                        className={`rounded-lg bg-[#070b1a] border px-2 py-1.5 flex items-center justify-between gap-1.5 ${
                          isActive ? 'border-emerald-400/70' : 'border-amber-400/20'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="text-[10px] font-black text-white truncate flex items-center gap-1">
                            <span className="truncate">{savedPreset?.name ?? slotMeta.defaultName}</span>
                            {isActive && <Check className="w-3 h-3 text-emerald-300 shrink-0" />}
                            {cpDiff !== null && cpDiff !== 0 && !isActive && (
                              <span
                                className={`font-mono-nums tabular-nums text-[9px] font-black shrink-0 ${
                                  cpDiff > 0 ? 'text-emerald-300' : 'text-amber-300'
                                }`}
                              >
                                {cpDiff > 0 ? `+${cpDiff}` : cpDiff} LC
                              </span>
                            )}
                          </div>
                          <div className="text-[9px] text-slate-400 font-semibold font-mono-nums truncate">
                            {savedPreset
                              ? `${presetHero} · ${gearCount}/6 đồ · ${runeCount} Ngọc`
                              : 'Chưa lưu · Bấm Lưu'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              if (onSaveLoadoutPreset) {
                                onSaveLoadoutPreset(slotMeta.slotId);
                              } else {
                                soundEngine.playUiClick(1.05);
                                onSaveBuildPreset(idx);
                              }
                            }}
                            className="a2-slate-btn px-1.5 py-0.5 rounded text-[9px] font-black text-sky-200 whitespace-nowrap cursor-pointer"
                          >
                            Lưu
                          </button>
                          <button
                            type="button"
                            disabled={Boolean(onApplyLoadoutPreset) && !savedPreset}
                            onClick={() => {
                              if (onApplyLoadoutPreset) {
                                onApplyLoadoutPreset(slotMeta.slotId);
                              } else {
                                soundEngine.playLevelUp();
                                onApplyBuildPreset(idx);
                              }
                            }}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black whitespace-nowrap ${
                              !onApplyLoadoutPreset || savedPreset
                                ? 'a2-emerald-btn cursor-pointer'
                                : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                            }`}
                          >
                            Dùng
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface HeroesPanelProps {
  save: SaveData;
  previewHeroId: HeroId;
  initialSubTab?: 'roster' | 'pets' | 'cosmetics' | 'wings' | 'mounts' | 'artifacts' | 'halos';
  onPreviewHero: (heroId: HeroId) => void;
  onSelectHero: (heroId: HeroId) => void;
  onUnlockHero: (heroId: HeroId, currency: 'gold' | 'gems') => void;
  onUpgradeHeroStar: (heroId: HeroId) => void;
  onUnlockPet: (petId: PetId, currency: 'gold' | 'gems') => void;
  onEquipPet: (petId: PetId | null) => void;
  onUpgradePet: (petId: PetId) => void;
  onEvolvePet?: (petId: PetId) => void;
  onUnlockSkin: (skinId: HeroSkinId, currency: 'gold' | 'gems') => void;
  onEquipSkin: (heroId: HeroId, skinId: HeroSkinId) => void;
  onUnlockAura: (auraId: AuraStyleId, currency: 'gold' | 'gems') => void;
  onEquipAura: (auraId: AuraStyleId) => void;
  onUnlockWing?: (wingId: WingId, currency: 'gems' | 'feathers') => void;
  onEquipWing?: (wingId: WingId | null) => void;
  onUpgradeWing?: (wingId: WingId) => void;
  onUnlockAvatarFrame?: (frameId: AvatarFrameId) => void;
  onEquipAvatarFrame?: (frameId: AvatarFrameId) => void;
  onUnlockMount?: (mountId: MountId, currency: 'gems' | 'shards') => void;
  onEquipMount?: (mountId: MountId | null) => void;
  onUpgradeMount?: (mountId: MountId) => void;
  onUnlockWeaponAura?: (auraId: WeaponAuraId, currency: 'gems' | 'crystals') => void;
  onEquipWeaponAura?: (auraId: WeaponAuraId) => void;
  onUpgradeWeaponAura?: (auraId: WeaponAuraId) => void;
  onUnlockArtifact?: (artifactId: ArtifactId, currency: 'gems' | 'shards') => void;
  onEquipArtifact?: (artifactId: ArtifactId | null) => void;
  onUpgradeArtifact?: (artifactId: ArtifactId) => void;
  onUnlockHalo?: (haloId: HaloId, currency: 'gems' | 'crystals') => void;
  onEquipHalo?: (haloId: HaloId | null) => void;
  onUpgradeHalo?: (haloId: HaloId) => void;
  onOpenWardrobe?: () => void;
  onPreviewUltimate?: (heroId: HeroId) => void;
  onRotateHero?: (deltaRad: number) => void;
  onResetHeroRotation?: () => void;
}

export const LobbyHeroesPanel: React.FC<HeroesPanelProps> = ({
  save,
  previewHeroId,
  initialSubTab = 'roster',
  onPreviewHero,
  onSelectHero,
  onUnlockHero,
  onUpgradeHeroStar,
  onUnlockPet,
  onEquipPet,
  onUpgradePet,
  onEvolvePet,
  onUnlockSkin,
  onEquipSkin,
  onUnlockAura,
  onEquipAura,
  onUnlockWing,
  onEquipWing,
  onUpgradeWing,
  onUnlockAvatarFrame,
  onEquipAvatarFrame,
  onUnlockMount,
  onEquipMount,
  onUpgradeMount,
  onUnlockWeaponAura,
  onEquipWeaponAura,
  onUpgradeWeaponAura,
  onUnlockArtifact,
  onEquipArtifact,
  onUpgradeArtifact,
  onUnlockHalo,
  onEquipHalo,
  onUpgradeHalo,
  onOpenWardrobe,
  onPreviewUltimate,
  onRotateHero,
  onResetHeroRotation,
}) => {
  const [heroSubTab, setHeroSubTab] = useState<
    'roster' | 'pets' | 'cosmetics' | 'wings' | 'mounts' | 'artifacts' | 'halos'
  >(initialSubTab);
  const [petBannerErr, setPetBannerErr] = useState(false);
  const [spiritBannerErr, setSpiritBannerErr] = useState(false);
  const [wingsBannerErr, setWingsBannerErr] = useState(false);
  const [mountsBannerErr, setMountsBannerErr] = useState(false);
  const [artifactsBannerErr, setArtifactsBannerErr] = useState(false);
  const [halosBannerErr, setHalosBannerErr] = useState(false);

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
  const unlockedWings = save.unlockedWings ?? [];
  const wingLevels = save.wingLevels ?? {};
  const equippedWingId = save.equippedWingId ?? null;
  const wingFeathers = save.wingFeathers ?? 0;
  const unlockedFrames = save.unlockedAvatarFrames ?? ['default_gold'];
  const equippedFrameId = save.equippedAvatarFrameId ?? 'default_gold';
  const unlockedMounts = save.unlockedMounts ?? [];
  const mountLevels = save.mountLevels ?? {};
  const { mountId: equippedMountId } = getMountAppearance(save);
  const mountShards = save.mountShards ?? 0;
  const unlockedWeaponAuras = save.unlockedWeaponAuras ?? ['none'];
  const weaponAuraLevels = save.weaponAuraLevels ?? {};
  const equippedWeaponAuraId = save.equippedWeaponAuraId ?? 'none';
  const awakeningCrystals = save.awakeningCrystals ?? 0;
  const petEssence = save.petEssence ?? 0;
  const unlockedArtifacts = save.unlockedArtifacts ?? [];
  const artifactLevels = save.artifactLevels ?? {};
  const equippedArtifactId = save.equippedArtifactId ?? null;
  const mxState = normalizeMysticExchange(save.mysticExchange);
  const artifactShards = mxState.artifactShards;
  const heroBondsSummary = evaluateHeroBonds(save);
  const unlockedHalos = save.unlockedHalos ?? [];
  const haloLevels = save.haloLevels ?? {};
  const equippedHaloId = save.equippedHaloId ?? null;
  const divineCrystals = save.divineCrystals ?? 0;

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
    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden a2-scroll pointer-events-none">
      {/* LEFT STAGE: WIDE OPEN FULL-BODY 3D HERO SHOWCASE (360° DRAG-TO-ROTATE) */}
      <div
        onPointerDown={handleHeroDragDown}
        onPointerMove={handleHeroDragMove}
        onPointerUp={handleHeroDragUp}
        onPointerCancel={handleHeroDragUp}
        className="lg:col-span-5 relative flex flex-col justify-end p-3 sm:p-5 min-h-[340px] lg:min-h-0 pointer-events-auto cursor-grab active:cursor-grabbing touch-none select-none"
      >
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="cel-panel-ornate self-center lg:self-start flex items-center gap-2.5 rounded-2xl px-3.5 py-2 shadow-2xl"
        >
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-display text-sm sm:text-base font-black text-white">
                {hero.name}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                {hero.rarity}
              </span>
            </div>
            <div className="text-[11px] font-semibold text-slate-300">
              {hero.title} · {unlocked ? `★${star}/5` : 'Chưa Chiêu Mộ'}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {onResetHeroRotation && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  onResetHeroRotation();
                }}
                title="Đặt lại góc nhìn 360°"
                aria-label="Đặt lại góc nhìn"
                className="cel-panel w-7 h-7 rounded-lg flex items-center justify-center text-amber-200 hover:border-amber-300 cursor-pointer shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}
            {onOpenWardrobe && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  onOpenWardrobe();
                }}
                className="a2-slate-btn px-2.5 h-7 rounded-lg text-[10px] font-black flex items-center gap-1 text-sky-200 whitespace-nowrap cursor-pointer"
              >
                <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                <span>Thử Đồ 360°</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE DRAWER: HERO DOSSIER + ROSTER / COSMETICS / MOUNTS / HALOS */}
      <div className="lg:col-span-7 cel-side-drawer border-t lg:border-t-0 lg:border-l border-amber-400/35 flex flex-col min-h-0 pointer-events-auto">
        <div className="flex-1 min-h-0 overflow-y-auto a2-scroll px-3 sm:px-4 py-3 flex flex-col gap-3 pb-5">
          {/* Hero Dossier Art-Card */}
          <div className="cel-panel-ornate rounded-2xl overflow-hidden shrink-0">
            <div className="px-3 py-1.5 bg-[#121c42] border-b border-amber-400/30 flex items-center justify-between gap-2">
              <h3 className="font-display text-xs sm:text-sm font-black text-amber-200 truncate">
                Nội Tại · {hero.skillName}
              </h3>
              <span className="text-xs font-mono-nums font-bold text-amber-300 shrink-0">
                +{hero.bonusAtk} ATK · +{hero.bonusHp} HP
              </span>
            </div>

            <div className="p-2.5 flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2 text-[11px] font-bold text-emerald-300">
                <span>Vai trò: {hero.role}</span>
              </div>
              <p className="text-[11px] text-slate-200 leading-snug line-clamp-2">
                {hero.passiveDesc}
              </p>

              {/* Ultimate Callout + 3D Showcase Button */}
              <div className="rounded-xl bg-[#141036] border border-purple-400/45 px-2.5 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] font-black text-purple-300">
                    <Flame className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>Chiêu Cuối (Q) · {hero.ultName}</span>
                  </div>
                  {onPreviewUltimate && (
                    <button
                      type="button"
                      onClick={() => onPreviewUltimate(hero.id)}
                      className="a2-purple-btn px-2 py-0.5 rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      <Play className="w-3 h-3" />
                      <span>Xem Trước 3D (Q)</span>
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-200 mt-0.5 leading-snug line-clamp-2">
                  {hero.ultDesc}
                </p>
              </div>

              {/* Phase 4: Hero Mastery Lv.1–10 Progress Strip */}
              {(() => {
                const mastery = computeHeroMasteryBonuses(save.heroMastery, hero.id);
                const expPct = mastery.isMax
                  ? 100
                  : Math.max(
                      4,
                      Math.min(100, Math.round((mastery.exp / Math.max(1, mastery.nextExp)) * 100))
                    );
                return (
                  <div className="rounded-xl bg-[#070b1a]/90 border border-amber-400/20 px-2.5 py-2 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[10px] font-black">
                      <span className="text-amber-200 flex items-center gap-1">
                        <Crown className="w-3 h-3 text-amber-300 shrink-0" />
                        <span>
                          Tinh Thông Anh Hùng · Lv.{mastery.level}/{HERO_MASTERY_MAX_LEVEL}
                        </span>
                      </span>
                      <span className="font-mono-nums text-slate-300 shrink-0">
                        {mastery.isMax ? 'Đạt Tối Đa' : `${mastery.exp}/${mastery.nextExp} EXP`}
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400"
                        style={{ width: `${expPct}%` }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] font-mono-nums">
                      <span className={mastery.level > 1 ? 'text-emerald-300 font-bold' : 'text-slate-400'}>
                        {mastery.summaryLabel}
                      </span>
                      <span className="text-slate-400">
                        {mastery.level < 5
                          ? 'Mốc Lv.5: +4% Chí Mạng'
                          : mastery.level < 10
                          ? 'Mốc Lv.10: +8% ST Boss'
                          : 'Đã mở toàn bộ mốc Tinh Thông'}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-400/15">
                {unlocked ? (
                  <>
                    <button
                      type="button"
                      disabled={selected}
                      onClick={() => onSelectHero(hero.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
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
                        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
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
                      className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        save.gold >= hero.unlockGold
                          ? 'a2-yellow-btn'
                          : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Lock className="w-3.5 h-3.5" />
                      <span className="font-mono-nums">
                        {hero.unlockGold === 0 ? 'Chiêu Mộ Miễn Phí' : `Mở · ${hero.unlockGold} Vàng`}
                      </span>
                    </button>
                    {hero.unlockGems > 0 && (
                      <button
                        type="button"
                        disabled={save.gems < hero.unlockGems}
                        onClick={() => onUnlockHero(hero.id, 'gems')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                          save.gems >= hero.unlockGems
                            ? 'a2-purple-btn'
                            : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        <span className="font-mono-nums">Mở · {hero.unlockGems} Ngọc</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Sub-Tabs — Clean Compact Ribbon inside Right Drawer */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 bg-[#060916] border border-amber-400/25 rounded-xl p-1 shrink-0">
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setHeroSubTab('roster');
                }}
                className={`px-2 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  heroSubTab === 'roster'
                    ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Crown className="w-3 h-3 shrink-0" />
                <span>Chiêu Mộ ({save.unlockedHeroes.length}/{HEROES.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setHeroSubTab('pets');
                }}
                className={`px-2 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  heroSubTab === 'pets'
                    ? 'bg-gradient-to-b from-emerald-400 to-teal-600 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3 shrink-0" />
                <span>Tinh Linh ({ownedPets.length}/{PETS_CATALOG.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setHeroSubTab('cosmetics');
                }}
                className={`px-2 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  heroSubTab === 'cosmetics'
                    ? 'bg-gradient-to-b from-purple-400 to-fuchsia-600 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Palette className="w-3 h-3 shrink-0" />
                <span>Trang Phục</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setHeroSubTab('wings');
                }}
                className={`px-2 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  heroSubTab === 'wings'
                    ? 'bg-gradient-to-b from-sky-400 to-indigo-600 text-white shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <WingFeatherIcon className="w-3 h-3 shrink-0" />
                <span>Cánh 3D ({unlockedWings.length}/{ZODIAC_WINGS.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setHeroSubTab('mounts');
                }}
                className={`px-2 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  heroSubTab === 'mounts'
                    ? 'bg-gradient-to-b from-rose-400 to-amber-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <MountShardIcon className="w-3 h-3 shrink-0" />
                <span>Thú Cưỡi ({unlockedMounts.length}/{ZODIAC_MOUNTS.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setHeroSubTab('artifacts');
                }}
                className={`px-2 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  heroSubTab === 'artifacts'
                    ? 'bg-gradient-to-b from-amber-300 via-yellow-400 to-orange-500 text-slate-950 shadow'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <ArtifactRelicIcon className="w-3 h-3 shrink-0" />
                <span>Thánh Khí ({unlockedArtifacts.length}/{MYTHIC_ARTIFACTS.length})</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  setHeroSubTab('halos');
                }}
                className={`px-2 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                  heroSubTab === 'halos'
                    ? 'bg-gradient-to-b from-yellow-300 via-amber-400 to-rose-500 text-slate-950 shadow'
                    : 'text-amber-200 hover:text-white'
                }`}
              >
                <Crown className="w-3 h-3 shrink-0" />
                <span>Hào Quang 3D ({unlockedHalos.length}/{DIVINE_HALO_CATALOG.length})</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {heroSubTab === 'pets' && (
                <div className="px-2 py-1 rounded-lg bg-[#09122a] border border-emerald-400/35 flex items-center gap-1 text-[10px] font-mono-nums font-black text-emerald-300">
                  <PetEssenceIcon className="w-3 h-3 shrink-0" />
                  <span>{petEssence}</span>
                </div>
              )}

              {heroSubTab === 'wings' && (
                <div className="px-2 py-1 rounded-lg bg-[#09122a] border border-sky-400/35 flex items-center gap-1 text-[10px] font-mono-nums font-black text-sky-300">
                  <WingFeatherIcon className="w-3 h-3 shrink-0" />
                  <span>{wingFeathers}</span>
                </div>
              )}

              {heroSubTab === 'mounts' && (
                <div className="flex items-center gap-1">
                  <div className="px-2 py-1 rounded-lg bg-[#09122a] border border-amber-400/35 flex items-center gap-1 text-[10px] font-mono-nums font-black text-amber-300">
                    <MountShardIcon className="w-3 h-3 shrink-0" />
                    <span>{mountShards}</span>
                  </div>
                  <div className="px-2 py-1 rounded-lg bg-[#09122a] border border-rose-400/35 flex items-center gap-1 text-[10px] font-mono-nums font-black text-rose-300">
                    <AwakenCrystalIcon className="w-3 h-3 shrink-0" />
                    <span>{awakeningCrystals}</span>
                  </div>
                </div>
              )}

              {onOpenWardrobe && (
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onOpenWardrobe();
                  }}
                  className="a2-slate-btn px-2 py-1 rounded-lg text-[11px] font-black flex items-center gap-1 text-sky-200 whitespace-nowrap cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                  <span>Thử Đồ 360°</span>
                </button>
              )}
            </div>
          </div>

          {/* SUB-TAB 1: HERO ROSTER */}
          {heroSubTab === 'roster' && (
            <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-2 pb-2">
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
                    <div className="a2-item-inner p-2.5 flex items-center gap-2.5">
                      <div className={`shrink-0 ${!isUnlocked ? 'opacity-60 grayscale-[35%]' : ''}`}>
                        <HeroCrestSvg
                          heroId={h.id}
                          skinId={save.equippedSkinByHero?.[h.id] ?? 'default'}
                          accentHex={h.accentHex}
                          cloakHex={h.cloakHex}
                          hairHex={h.hairHex}
                          className="w-12 h-12 drop-shadow"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-display text-xs font-black text-white truncate">
                            {h.name}
                          </span>
                          {isSelected && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/25 border border-emerald-400/50 text-[8px] font-black text-emerald-300 shrink-0">
                              Ra Trận
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-amber-100/90 font-mono-nums font-bold mt-0.5 truncate">
                          {isUnlocked
                            ? `★ ${hStar}/5 · ${h.rarity}`
                            : h.unlockGold === 0 ? 'Miễn phí' : `${h.unlockGold}V · ${h.unlockGems} Ngọc`}
                        </div>
                        <div className="text-[9px] font-bold truncate mt-0.5">
                          {!isUnlocked ? (
                            <span className="text-slate-400">Chưa Chiêu Mộ</span>
                          ) : (
                            <span className="text-sky-200">{h.role}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* SUB-TAB 2: 3D ZODIAC PET SANCTUARY & SPIRIT BEAST EVOLUTION */}
          {heroSubTab === 'pets' && (
            <div className="space-y-3.5 pb-6">
              <div className="cel-panel-ornate rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-12 items-center">
                <div className="sm:col-span-5 h-32 sm:h-36 bg-[#0b1229] relative overflow-hidden">
                  {!spiritBannerErr ? (
                    <img
                      src={spiritBeastEvolutionArt}
                      alt="Thánh Đường Tiến Hóa Thần Sủng 3D"
                      referrerPolicy="no-referrer"
                      onError={() => setSpiritBannerErr(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : !petBannerErr ? (
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
                <div className="sm:col-span-7 p-3.5 flex flex-col justify-center gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                      TIẾN HÓA THẦN SỦNG 3D
                    </span>
                    <div className="flex items-center gap-2 text-[11px] font-mono-nums font-bold">
                      <span className="px-2 py-0.5 rounded-lg bg-[#070b1a] border border-amber-400/40 text-amber-200">
                        {save.spiritCores ?? 0} Lõi Thần Sủng
                      </span>
                      <span className="px-2 py-0.5 rounded-lg bg-[#070b1a] border border-emerald-400/35 text-emerald-200">
                        {petEssence} Tinh Chất
                      </span>
                    </div>
                  </div>
                  <h4 className="font-display text-sm sm:text-base font-black text-white">
                    Thánh Đường Tinh Linh &amp; Thần Sủng Hoàng Đạo
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Nâng Tinh Linh lên Cấp {SPIRIT_BEAST_MIN_LEVEL}+ để Tiến Hóa thành Thần Sủng 3D có Vòng Hào Quang Kim Cương, tăng +55% ATK/HP, +45% Chí Mạng và tốc bắn đạn trong trận!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {PETS_CATALOG.map((pet) => {
                  const inst = ownedPets.find((p) => p.petId === pet.id);
                  const lv = inst?.level ?? 1;
                  const isEquipped = save.equippedPetId === pet.id;
                  const isEvolved = (save.evolvedPets ?? []).includes(pet.id);
                  const baseStats = getPetStats(pet.id, lv);
                  const evoMult = getEvolvedPetMultiplier(isEvolved);
                  const pStats = {
                    atk: Math.round(baseStats.atk * evoMult.atkMult),
                    hp: Math.round(baseStats.hp * evoMult.hpMult),
                    crit: baseStats.crit + evoMult.critBonus,
                  };
                  const upCost = getPetUpgradeCost(lv);
                  const canUpgrade = inst && petEssence >= upCost.essence && save.gold >= upCost.gold;
                  const spiritCores = save.spiritCores ?? 0;
                  const canEvolve =
                    !!inst &&
                    !isEvolved &&
                    lv >= SPIRIT_BEAST_MIN_LEVEL &&
                    spiritCores >= SPIRIT_BEAST_EVOLUTION_COST.spiritCores &&
                    petEssence >= SPIRIT_BEAST_EVOLUTION_COST.petEssence &&
                    save.gold >= SPIRIT_BEAST_EVOLUTION_COST.gold;
                  const primaryCss = `#${pet.primaryHex.toString(16).padStart(6, '0')}`;
                  const secondaryCss = `#${pet.secondaryHex.toString(16).padStart(6, '0')}`;
                  const displayName = getSpiritBeastFormName(pet.id, isEvolved, pet.name);

                  return (
                    <div
                      key={pet.id}
                      className={`rounded-2xl p-3.5 flex flex-col justify-between gap-3 ${
                        isEquipped || isEvolved ? 'cel-panel-ornate' : 'cel-panel'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-11 h-11 rounded-2xl border-2 shrink-0 flex items-center justify-center shadow-lg ${
                                isEvolved ? 'border-amber-300' : 'border-white/70'
                              }`}
                              style={{
                                background: `radial-gradient(circle at 30% 30%, ${secondaryCss}, ${primaryCss})`,
                              }}
                            >
                              {isEvolved ? (
                                <Crown className="w-5 h-5 text-slate-950" />
                              ) : (
                                <Sparkles className="w-5 h-5 text-slate-950" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-black text-amber-300 uppercase">
                                <span>{pet.rarity}</span>
                                <span aria-hidden="true" className="text-slate-600">·</span>
                                <span className="text-emerald-300">
                                  {inst ? `Cấp ${lv}` : 'Chưa Triệu Hồi'}
                                </span>
                                {isEvolved && (
                                  <span className="px-1.5 py-0.5 rounded bg-amber-400/20 border border-amber-300/60 text-amber-200 text-[9px]">
                                    THẦN SỦNG 3D
                                  </span>
                                )}
                              </div>
                              <h5 className="font-display text-sm font-black text-white truncate">
                                {displayName}
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
                          {isEvolved && (
                            <span className="text-sky-300">+25% Tốc Bắn 3D</span>
                          )}
                        </div>

                        {inst && !isEvolved && (
                          <div className="mt-2.5 rounded-xl bg-[#070b1a] border border-amber-400/25 px-2.5 py-2 flex flex-wrap items-center justify-between gap-2">
                            <div className="text-[10px] text-slate-300">
                              <div className="font-black text-amber-200">
                                Tiến Hóa → {getSpiritBeastFormName(pet.id, true, pet.name)}
                              </div>
                              <div className="font-mono-nums text-slate-400">
                                Cần Cấp {SPIRIT_BEAST_MIN_LEVEL}+ · {SPIRIT_BEAST_EVOLUTION_COST.spiritCores} Lõi Sủng · {SPIRIT_BEAST_EVOLUTION_COST.petEssence} Tinh Chất · {SPIRIT_BEAST_EVOLUTION_COST.gold} Vàng
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={!canEvolve}
                              onClick={() => {
                                soundEngine.playVictory();
                                onEvolvePet?.(pet.id);
                              }}
                              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-1 whitespace-nowrap cursor-pointer ${
                                canEvolve
                                  ? 'a2-purple-btn'
                                  : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                              }`}
                            >
                              <Crown className="w-3.5 h-3.5" />
                              <span>Tiến Hóa Thần Sủng</span>
                            </button>
                          </div>
                        )}
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

                    const assetPack = getSkinAssetPack(skin.id, hero.id);

                    return (
                      <div
                        key={skin.id}
                        className={`rounded-2xl p-3.5 flex flex-col justify-between gap-3 ${
                          isEquipped ? 'cel-panel-ornate' : 'cel-panel'
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-16 h-20 rounded-xl overflow-hidden border border-amber-300/40 bg-[#0d152f] shrink-0">
                            <ResilientAssetImg
                              src={assetPack.portrait}
                              alt={skin.name}
                              className="w-full h-full object-cover object-top"
                              fallback={<Sparkles className="w-5 h-5 text-amber-300 m-auto" />}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <span className="text-[10px] font-black text-purple-300 tracking-wider">
                                {skin.badge}
                              </span>
                              <div className="flex items-center gap-1">
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-white/60"
                                  style={{ backgroundColor: cHex }}
                                />
                                <span
                                  className="w-3.5 h-3.5 rounded-full border border-white/60"
                                  style={{ backgroundColor: aHex }}
                                />
                              </div>
                            </div>
                            <h5 className="font-display text-sm font-black text-white truncate">
                              {skin.name}
                            </h5>
                            <p className="text-[11px] text-slate-300 mt-1 leading-relaxed line-clamp-2">
                              {skin.desc}
                            </p>
                            {(skin.atkBonus > 0 || skin.hpBonus > 0) && (
                              <div className="flex items-center gap-3 text-xs font-mono-nums font-bold text-amber-200 mt-1.5">
                                <span>+{skin.atkBonus} ATK</span>
                                <span>+{skin.hpBonus} HP</span>
                              </div>
                            )}
                          </div>
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

          {/* SUB-TAB 4: 3D ZODIAC WINGS & AVATAR FRAMES */}
          {heroSubTab === 'wings' && (
            <div className="space-y-5 pb-6">
              <div className="cel-panel-ornate rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-12 items-center">
                <div className="sm:col-span-5 h-32 sm:h-36 bg-[#0b1229] relative overflow-hidden">
                  {!wingsBannerErr ? (
                    <img
                      src={zodiacWingsArt}
                      alt="Thánh Địa Cánh Hoàng Đạo 3D"
                      referrerPolicy="no-referrer"
                      onError={() => setWingsBannerErr(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-sky-500/25 to-amber-500/25 flex items-center justify-center">
                      <WingFeatherIcon className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-transparent via-transparent to-[#090d1f]" />
                </div>

                <div className="sm:col-span-7 p-4 flex flex-col justify-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-sky-300">
                    Cánh Hoàng Đạo 3D Gắn Lưng · Lv.1–{MAX_WING_LEVEL}
                  </span>
                  <h4 className="font-display text-base sm:text-lg font-black text-white">
                    Thức Tỉnh Thiên Dực · Đập Cánh Trực Tiếp Trong Sảnh &amp; Trận
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Thu thập Lông Vũ Tinh Tú từ <strong>Thủ Thành Pha Lê 3D</strong> và{' '}
                    <strong>Boss Thế Giới</strong> để mở khóa, đeo lên lưng Anh Hùng và cường hóa tối đa!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {ZODIAC_WINGS.map((w) => {
                  const isOwned = unlockedWings.includes(w.id);
                  const isEquipped = equippedWingId === w.id;
                  const lv = wingLevels[w.id] ?? 1;
                  const stats = getWingStats(w.id, lv);
                  const upCost = getWingUpgradeCost(lv);
                  const maxLv = lv >= MAX_WING_LEVEL;
                  const pColor = `#${w.primaryHex.toString(16).padStart(6, '0')}`;
                  const sColor = `#${w.secondaryHex.toString(16).padStart(6, '0')}`;

                  return (
                    <div
                      key={w.id}
                      className={`rounded-2xl p-4 flex flex-col justify-between gap-3 ${
                        isEquipped ? 'cel-panel-ornate' : 'cel-panel'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-10 h-10 rounded-xl border border-amber-300/60 flex items-center justify-center shrink-0"
                              style={{
                                background: `linear-gradient(135deg, ${pColor}33, ${sColor}22)`,
                              }}
                            >
                              <WingFeatherIcon className="w-5 h-5" />
                            </span>
                            <div>
                              <span className="text-[10px] font-black uppercase text-amber-300">
                                {w.badge} {isOwned ? `· Cấp ${lv}/${MAX_WING_LEVEL}` : ''}
                              </span>
                              <h5 className="font-display text-sm sm:text-base font-black text-white">
                                {w.name}
                              </h5>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">{w.desc}</p>

                        <div className="grid grid-cols-4 gap-1.5 mt-2.5 text-center rounded-xl bg-[#070b1a] border border-amber-400/20 p-2 text-[10px] font-mono-nums font-bold">
                          <div>
                            <div className="text-slate-400">ATK</div>
                            <div className="text-amber-300">+{stats.atk}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">HP</div>
                            <div className="text-emerald-300">+{stats.hp}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Crit</div>
                            <div className="text-rose-300">+{Math.round(stats.crit * 1000) / 10}%</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Tốc</div>
                            <div className="text-sky-300">+{Math.round(stats.aspd * 1000) / 10}%</div>
                          </div>
                        </div>

                        {isOwned && !maxLv && (() => {
                          const nextW = getWingStats(w.id, lv + 1);
                          return (
                            <div className="mt-2">
                              <UpgradeStatDiff
                                title={`Nâng Cấp Lv.${lv} → Lv.${lv + 1}`}
                                rows={[
                                  { label: 'ATK', current: `+${stats.atk}`, next: `+${nextW.atk}`, delta: `+${nextW.atk - stats.atk}` },
                                  { label: 'HP', current: `+${stats.hp}`, next: `+${nextW.hp}`, delta: `+${nextW.hp - stats.hp}` },
                                  {
                                    label: 'Chí Mạng',
                                    current: `+${(stats.crit * 100).toFixed(1)}%`,
                                    next: `+${(nextW.crit * 100).toFixed(1)}%`,
                                    delta: `+${((nextW.crit - stats.crit) * 100).toFixed(1)}%`,
                                  },
                                ]}
                              />
                            </div>
                          );
                        })()}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {isOwned ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playUiClick(1.05);
                                onEquipWing?.(isEquipped ? null : w.id);
                              }}
                              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                                isEquipped ? 'a2-slate-btn' : 'a2-emerald-btn'
                              }`}
                            >
                              {isEquipped ? 'Tháo Cánh' : 'Đeo Cánh 3D'}
                            </button>
                            <button
                              type="button"
                              disabled={maxLv || wingFeathers < upCost.feathers || save.gold < upCost.gold}
                              onClick={() => {
                                soundEngine.playLevelUp();
                                onUpgradeWing?.(w.id);
                              }}
                              className="a2-yellow-btn flex-1 py-2 px-3 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed font-mono-nums"
                            >
                              {maxLv
                                ? 'Cấp Tối Đa'
                                : `Cường Hóa (${upCost.feathers} Lông + ${upCost.gold} Vàng)`}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={wingFeathers < w.unlockFeathers}
                              onClick={() => {
                                soundEngine.playLevelUp();
                                onUnlockWing?.(w.id, 'feathers');
                              }}
                              className="a2-emerald-btn flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed font-mono-nums"
                            >
                              <WingFeatherIcon className="w-3.5 h-3.5" />
                              <span>Mở · {w.unlockFeathers} Lông</span>
                            </button>
                            <button
                              type="button"
                              disabled={save.gems < w.unlockGems}
                              onClick={() => {
                                soundEngine.playLevelUp();
                                onUnlockWing?.(w.id, 'gems');
                              }}
                              className="a2-purple-btn flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed font-mono-nums"
                            >
                              <SoulGemIcon className="w-3.5 h-3.5" />
                              <span>Mở · {w.unlockGems} Ngọc</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Quick Avatar Frame Showcase */}
              <div className="pt-2 border-t border-amber-400/20">
                <h4 className="font-display text-sm font-black text-amber-200 mb-2.5">
                  Khung Avatar Hoàng Đạo
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  {AVATAR_FRAMES.map((frame) => {
                    const owned = unlockedFrames.includes(frame.id);
                    const equipped = equippedFrameId === frame.id;
                    return (
                      <div
                        key={frame.id}
                        className={`rounded-2xl p-3 flex flex-col items-center text-center justify-between gap-2 ${
                          equipped ? 'cel-panel-ornate' : 'cel-panel'
                        }`}
                      >
                        <ZodiacAvatar
                          heroId={hero.id}
                          accentHex={hero.accentHex}
                          cloakHex={hero.cloakHex}
                          hairHex={hero.hairHex}
                          frameId={frame.id}
                          sizeClass="w-11 h-11"
                        />
                        <div className="text-[11px] font-black text-white leading-tight">
                          {frame.name}
                        </div>
                        {owned ? (
                          <button
                            type="button"
                            disabled={equipped}
                            onClick={() => {
                              soundEngine.playUiClick(1.05);
                              onEquipAvatarFrame?.(frame.id);
                            }}
                            className={`w-full py-1.5 rounded-lg text-[10px] font-black cursor-pointer ${
                              equipped ? 'a2-emerald-btn' : 'a2-yellow-btn'
                            }`}
                          >
                            {equipped ? 'Đang Dùng' : 'Chọn'}
                          </button>
                        ) : frame.unlockGems ? (
                          <button
                            type="button"
                            disabled={save.gems < frame.unlockGems}
                            onClick={() => {
                              soundEngine.playLevelUp();
                              onUnlockAvatarFrame?.(frame.id);
                            }}
                            className="a2-purple-btn w-full py-1.5 rounded-lg text-[10px] font-black cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                          >
                            {frame.unlockGems} Ngọc
                          </button>
                        ) : (
                          <span className="text-[9px] font-bold text-slate-400">
                            {frame.tierLabel}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 5: ZODIAC MOUNTS 3D & AWAKENED WEAPON AURAS */}
          {heroSubTab === 'mounts' && (
            <div className="space-y-4 pb-6">
              <div className="cel-panel-ornate rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 items-center">
                <div className="md:col-span-5 h-32 md:h-36 bg-[#0b1229] relative">
                  {!mountsBannerErr ? (
                    <img
                      src={zodiacMountsArt}
                      alt="Thú Cưỡi Hoàng Đạo 3D"
                      referrerPolicy="no-referrer"
                      onError={() => setMountsBannerErr(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-rose-500/20 to-amber-500/20">
                      <MountShardIcon className="w-10 h-10 text-amber-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-transparent via-transparent to-[#090d1f]" />
                </div>
                <div className="md:col-span-7 p-4 flex flex-col gap-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                    Kỵ Sĩ Tinh Giới &amp; Vũ Khí Thức Tỉnh 3D
                  </span>
                  <h4 className="font-display text-base sm:text-lg font-black text-white">
                    Thú Cưỡi Hoàng Đạo 3D &amp; Vòng Luân Vũ Khí
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Thú Cưỡi xuất hiện trực tiếp dưới chân Anh Hùng trong cả Sảnh lẫn Trận Đấu, tăng ATK, HP, Giảm ST và Tốc chạy. Thu thập Mảnh Thú Cưỡi &amp; Tinh Thể từ Đêm Trăng Máu, Phái Cử hoặc Hồ Ước Nguyện!
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ZODIAC_MOUNTS.map((m) => {
                  const isOwned = unlockedMounts.includes(m.id);
                  const isEquipped = equippedMountId === m.id;
                  const lv = Math.max(1, mountLevels[m.id] ?? 1);
                  const maxLv = lv >= MAX_MOUNT_LEVEL;
                  const statsM = getMountStats(m.id, lv);
                  const upCost = getMountUpgradeCost(lv);
                  const pColor = `#${m.bodyHex.toString(16).padStart(6, '0')}`;
                  const gColor = `#${m.glowHex.toString(16).padStart(6, '0')}`;

                  return (
                    <div
                      key={m.id}
                      className={`rounded-2xl p-4 flex flex-col justify-between gap-3 ${
                        isEquipped ? 'cel-panel-ornate' : 'cel-panel'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/40 shadow-inner shrink-0"
                              style={{
                                background: `linear-gradient(135deg, ${pColor}33, ${gColor}44)`,
                              }}
                            >
                              <MountShardIcon className="w-5 h-5" />
                            </span>
                            <div>
                              <span className="text-[10px] font-black uppercase text-amber-300">
                                {m.badge} {isOwned ? `· Cấp ${lv}/${MAX_MOUNT_LEVEL}` : ''}
                              </span>
                              <h5 className="font-display text-sm sm:text-base font-black text-white">
                                {m.name}
                              </h5>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">{m.desc}</p>

                        <div className="grid grid-cols-4 gap-1.5 mt-2.5 text-center rounded-xl bg-[#070b1a] border border-amber-400/20 p-2 text-[10px] font-mono-nums font-bold">
                          <div>
                            <div className="text-slate-400">ATK</div>
                            <div className="text-amber-300">+{statsM.atk}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">HP</div>
                            <div className="text-emerald-300">+{statsM.hp}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Tốc</div>
                            <div className="text-sky-300">+{Math.round(statsM.moveSpeed * 100)}%</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Giảm ST</div>
                            <div className="text-rose-300">+{Math.round(statsM.dr * 100)}%</div>
                          </div>
                        </div>

                        {isOwned && !maxLv && (() => {
                          const nextM = getMountStats(m.id, lv + 1);
                          return (
                            <div className="mt-2">
                              <UpgradeStatDiff
                                title={`Nâng Cấp Lv.${lv} → Lv.${lv + 1}`}
                                rows={[
                                  { label: 'ATK', current: `+${statsM.atk}`, next: `+${nextM.atk}`, delta: `+${nextM.atk - statsM.atk}` },
                                  { label: 'HP', current: `+${statsM.hp}`, next: `+${nextM.hp}`, delta: `+${nextM.hp - statsM.hp}` },
                                  {
                                    label: 'Giảm ST',
                                    current: `+${Math.round(statsM.dr * 100)}%`,
                                    next: `+${Math.round(nextM.dr * 100)}%`,
                                    delta: `+${Math.round((nextM.dr - statsM.dr) * 100)}%`,
                                  },
                                ]}
                              />
                            </div>
                          );
                        })()}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {isOwned ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playUiClick(1.05);
                                onEquipMount?.(isEquipped ? null : m.id);
                              }}
                              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                                isEquipped ? 'a2-slate-btn' : 'a2-emerald-btn'
                              }`}
                            >
                              {isEquipped ? 'Xuống Ngựa' : 'Cưỡi Ra Trận'}
                            </button>
                            <button
                              type="button"
                              disabled={maxLv || mountShards < upCost.shards || save.gold < upCost.gold}
                              onClick={() => {
                                soundEngine.playLevelUp();
                                onUpgradeMount?.(m.id);
                              }}
                              className="a2-yellow-btn flex-1 py-2 px-3 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed font-mono-nums"
                            >
                              {maxLv
                                ? 'Cấp Tối Đa'
                                : `Nâng Cấp (${upCost.shards} Mảnh + ${upCost.gold} Vàng)`}
                            </button>
                          </>
                        ) : (
                          m.unlockShards === 0 && m.unlockGems === 0 ? (
                            <button
                              type="button"
                              onClick={() => onUnlockMount?.(m.id, 'shards')}
                              className="a2-emerald-btn flex-1 py-2 px-3 rounded-xl text-xs font-black cursor-pointer"
                            >
                              Nhận Miễn Phí
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={mountShards < m.unlockShards}
                                onClick={() => {
                                  soundEngine.playLevelUp();
                                  onUnlockMount?.(m.id, 'shards');
                                }}
                                className="a2-emerald-btn flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed font-mono-nums"
                              >
                                <MountShardIcon className="w-3.5 h-3.5" />
                                <span>Mở · {m.unlockShards} Mảnh</span>
                              </button>
                              <button
                                type="button"
                                disabled={save.gems < m.unlockGems}
                                onClick={() => {
                                  soundEngine.playLevelUp();
                                  onUnlockMount?.(m.id, 'gems');
                                }}
                                className="a2-purple-btn flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed font-mono-nums"
                              >
                                <SoulGemIcon className="w-3.5 h-3.5" />
                                <span>Mở · {m.unlockGems} Ngọc</span>
                              </button>
                            </>
                          )
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Awakened Weapon Auras */}
              <div className="pt-2 border-t border-amber-400/20">
                <h4 className="font-display text-sm sm:text-base font-black text-amber-200 mb-2.5">
                  Hào Quang Vũ Khí Thức Tỉnh
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {WEAPON_AURAS.map((wa) => {
                    const isOwned = unlockedWeaponAuras.includes(wa.id);
                    const isEquipped = equippedWeaponAuraId === wa.id;
                    const lv = Math.max(1, weaponAuraLevels[wa.id] ?? 1);
                    const maxLv = lv >= MAX_WEAPON_AURA_LEVEL;
                    const waStats = getWeaponAuraStats(wa.id, lv);
                    const upCost = getWeaponAuraUpgradeCost(lv);

                    return (
                      <div
                        key={wa.id}
                        className={`rounded-2xl p-4 flex flex-col justify-between gap-2.5 ${
                          isEquipped ? 'cel-panel-ornate' : 'cel-panel'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span className="text-[10px] font-black text-rose-300">
                              {wa.badge} {isOwned && wa.id !== 'none' ? `· Cấp ${lv}/${MAX_WEAPON_AURA_LEVEL}` : ''}
                            </span>
                            {isEquipped && (
                              <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-[9px] font-black text-emerald-300">
                                ĐANG KÍCH
                              </span>
                            )}
                          </div>
                          <h5 className="font-display text-sm font-black text-white">{wa.name}</h5>
                          <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">{wa.desc}</p>
                          {wa.id !== 'none' && (
                            <>
                              <div className="flex items-center gap-3 mt-2 text-[11px] font-mono-nums font-bold">
                                <span className="text-amber-300">+{Math.round(waStats.atkPct * 1000) / 10}% ATK</span>
                                <span className="text-rose-300">+{Math.round(waStats.critDmg * 1000) / 10}% ST Chí Mạng</span>
                              </div>
                              {isOwned && !maxLv && (() => {
                                const nextWa = getWeaponAuraStats(wa.id, lv + 1);
                                return (
                                  <div className="mt-2">
                                    <UpgradeStatDiff
                                      title={`Thức Tỉnh Lv.${lv} → Lv.${lv + 1}`}
                                      rows={[
                                        {
                                          label: '% ATK',
                                          current: `+${(waStats.atkPct * 100).toFixed(1)}%`,
                                          next: `+${(nextWa.atkPct * 100).toFixed(1)}%`,
                                          delta: `+${((nextWa.atkPct - waStats.atkPct) * 100).toFixed(1)}%`,
                                        },
                                        {
                                          label: 'ST Chí Mạng',
                                          current: `+${(waStats.critDmg * 100).toFixed(1)}%`,
                                          next: `+${(nextWa.critDmg * 100).toFixed(1)}%`,
                                          delta: `+${((nextWa.critDmg - waStats.critDmg) * 100).toFixed(1)}%`,
                                        },
                                      ]}
                                    />
                                  </div>
                                );
                              })()}
                            </>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {isOwned ? (
                            <>
                              <button
                                type="button"
                                disabled={isEquipped}
                                onClick={() => {
                                  soundEngine.playUiClick(1.05);
                                  onEquipWeaponAura?.(wa.id);
                                }}
                                className={`flex-1 py-2 px-3 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                                  isEquipped ? 'a2-emerald-btn opacity-80 cursor-default' : 'a2-slate-btn'
                                }`}
                              >
                                {isEquipped ? 'Đang Trang Bị' : 'Kích Hoạt'}
                              </button>
                              {wa.id !== 'none' && (
                                <button
                                  type="button"
                                  disabled={
                                    maxLv || awakeningCrystals < upCost.crystals || save.gold < upCost.gold
                                  }
                                  onClick={() => {
                                    soundEngine.playLevelUp();
                                    onUpgradeWeaponAura?.(wa.id);
                                  }}
                                  className="a2-yellow-btn flex-1 py-2 px-3 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed font-mono-nums"
                                >
                                  {maxLv
                                    ? 'Tối Đa'
                                    : `Thức Tỉnh (${upCost.crystals} TT + ${upCost.gold}V)`}
                                </button>
                              )}
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                disabled={awakeningCrystals < wa.unlockCrystals}
                                onClick={() => {
                                  soundEngine.playLevelUp();
                                  onUnlockWeaponAura?.(wa.id, 'crystals');
                                }}
                                className="a2-emerald-btn flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed font-mono-nums"
                              >
                                <AwakenCrystalIcon className="w-3.5 h-3.5" />
                                <span>Mở · {wa.unlockCrystals} TT</span>
                              </button>
                              <button
                                type="button"
                                disabled={save.gems < wa.unlockGems}
                                onClick={() => {
                                  soundEngine.playLevelUp();
                                  onUnlockWeaponAura?.(wa.id, 'gems');
                                }}
                                className="a2-purple-btn flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed font-mono-nums"
                              >
                                <SoulGemIcon className="w-3.5 h-3.5" />
                                <span>Mở · {wa.unlockGems} Ngọc</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 6: MYTHIC ARTIFACTS 3D & HERO SYNERGY BONDS */}
          {heroSubTab === 'artifacts' && (
            <div className="space-y-5 pb-6">
              <div className="cel-panel-ornate rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 items-center">
                <div className="md:col-span-5 h-32 md:h-40 bg-[#0b1229] relative overflow-hidden">
                  {!artifactsBannerErr ? (
                    <img
                      src={mythicArtifactsArt}
                      alt="Thánh Khí Thần Thoại 3D"
                      referrerPolicy="no-referrer"
                      onError={() => setArtifactsBannerErr(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/25 to-purple-500/25">
                      <ArtifactRelicIcon className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-transparent via-transparent to-[#090d1f]" />
                </div>
                <div className="md:col-span-7 p-4 flex flex-col gap-1.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                      Thánh Khí Thần Thoại 3D · Bay Hộ Vệ Sau Vai
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#070b1a] border border-amber-400/40 font-mono-nums text-xs font-black text-amber-200 flex items-center gap-1.5">
                      <ArtifactRelicIcon className="w-3.5 h-3.5" />
                      <span>{artifactShards} Mảnh Thánh Khí</span>
                    </span>
                  </div>
                  <h4 className="font-display text-base sm:text-lg font-black text-white">
                    Thánh Khí Hoàng Đạo 3D &amp; Cộng Hưởng Đội Hình
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Thánh Khí xoay quanh vai Anh Hùng trong cả Sảnh lẫn Chiến Đấu, cộng ATK, HP, Chí Mạng &amp; Sát Thương Boss. Săn Mảnh Thánh Khí từ <strong>Hố Sâu Đột Biến 3D</strong> và <strong>Chợ Thương Nhân</strong>!
                  </p>
                </div>
              </div>

              {/* 4 Mythic Artifacts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {MYTHIC_ARTIFACTS.map((art) => {
                  const isOwned = unlockedArtifacts.includes(art.id);
                  const isEquipped = equippedArtifactId === art.id;
                  const lv = Math.max(1, artifactLevels[art.id] ?? 1);
                  const maxLv = lv >= MAX_ARTIFACT_LEVEL;
                  const aStats = getArtifactStats(art.id, lv);
                  const upCost = getArtifactUpgradeCost(lv);
                  const pColor = `#${art.primaryHex.toString(16).padStart(6, '0')}`;
                  const sColor = `#${art.secondaryHex.toString(16).padStart(6, '0')}`;

                  return (
                    <div
                      key={art.id}
                      className={`rounded-2xl p-4 flex flex-col justify-between gap-3 ${
                        isEquipped ? 'cel-panel-ornate' : 'cel-panel'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-10 h-10 rounded-xl border border-amber-300/60 flex items-center justify-center shrink-0"
                              style={{
                                background: `linear-gradient(135deg, ${pColor}33, ${sColor}22)`,
                              }}
                            >
                              <ArtifactRelicIcon className="w-5 h-5" />
                            </span>
                            <div>
                              <span className="text-[10px] font-black uppercase text-amber-300">
                                {art.badge} {isOwned ? `· Lv.${lv}/${MAX_ARTIFACT_LEVEL}` : ''}
                              </span>
                              <h5 className="font-display text-sm sm:text-base font-black text-white">
                                {art.name}
                              </h5>
                            </div>
                          </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">{art.desc}</p>

                        <div className="grid grid-cols-4 gap-1.5 mt-2.5 text-center rounded-xl bg-[#070b1a] border border-amber-400/20 p-2 text-[10px] font-mono-nums font-bold">
                          <div>
                            <div className="text-slate-400">ATK</div>
                            <div className="text-amber-300">+{aStats.atk}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">HP</div>
                            <div className="text-emerald-300">+{aStats.hp}</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Crit</div>
                            <div className="text-rose-300">+{(aStats.crit * 100).toFixed(1)}%</div>
                          </div>
                          <div>
                            <div className="text-slate-400">ST Boss</div>
                            <div className="text-sky-300">+{Math.round(aStats.bossDmg * 100)}%</div>
                          </div>
                        </div>

                        {isOwned && !maxLv && (() => {
                          const nextA = getArtifactStats(art.id, lv + 1);
                          return (
                            <div className="mt-2">
                              <UpgradeStatDiff
                                title={`Nâng Thánh Khí Lv.${lv} → Lv.${lv + 1}`}
                                rows={[
                                  { label: 'ATK', current: `+${aStats.atk}`, next: `+${nextA.atk}`, delta: `+${nextA.atk - aStats.atk}` },
                                  { label: 'HP', current: `+${aStats.hp}`, next: `+${nextA.hp}`, delta: `+${nextA.hp - aStats.hp}` },
                                  {
                                    label: 'ST Boss',
                                    current: `+${Math.round(aStats.bossDmg * 100)}%`,
                                    next: `+${Math.round(nextA.bossDmg * 100)}%`,
                                    delta: `+${Math.round((nextA.bossDmg - aStats.bossDmg) * 100)}%`,
                                  },
                                ]}
                              />
                            </div>
                          );
                        })()}
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {isOwned ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playUiClick(1.05);
                                onEquipArtifact?.(isEquipped ? null : art.id);
                              }}
                              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                                isEquipped ? 'a2-slate-btn' : 'a2-emerald-btn'
                              }`}
                            >
                              {isEquipped ? 'Thu Hồi Thánh Khí' : 'Triệu Hồi Sau Vai'}
                            </button>
                            <button
                              type="button"
                              disabled={maxLv || artifactShards < upCost.shards || save.gold < upCost.gold}
                              onClick={() => {
                                soundEngine.playLevelUp();
                                onUpgradeArtifact?.(art.id);
                              }}
                              className="a2-yellow-btn flex-1 py-2 px-3 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed font-mono-nums"
                            >
                              {maxLv
                                ? 'Cấp Tối Đa'
                                : `Nâng (${upCost.shards} Mảnh + ${upCost.gold}V)`}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={artifactShards < art.unlockArtifactShards}
                              onClick={() => {
                                soundEngine.playVictory();
                                onUnlockArtifact?.(art.id, 'shards');
                              }}
                              className="a2-emerald-btn flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed font-mono-nums"
                            >
                              <ArtifactRelicIcon className="w-3.5 h-3.5" />
                              <span>Đúc · {art.unlockArtifactShards} Mảnh</span>
                            </button>
                            <button
                              type="button"
                              disabled={save.gems < art.unlockGems}
                              onClick={() => {
                                soundEngine.playVictory();
                                onUnlockArtifact?.(art.id, 'gems');
                              }}
                              className="a2-purple-btn flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed font-mono-nums"
                            >
                              <SoulGemIcon className="w-3.5 h-3.5" />
                              <span>Mở · {art.unlockGems} Ngọc</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hero Synergy Bonds */}
              <div className="pt-2 border-t border-amber-400/20">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="font-display text-sm sm:text-base font-black text-amber-200">
                      Cộng Hưởng Duyên Đội Hình ({heroBondsSummary.activeCount}/{HERO_BONDS.length} Kích Hoạt)
                    </h4>
                    <p className="text-[11px] text-slate-300">
                      Chiêu mộ &amp; tăng sao các cặp Anh Hùng chỉ định để nhận vĩnh viễn % ATK, % HP &amp; Chí Mạng toàn đội.
                    </p>
                  </div>
                  <span className="font-mono-nums text-xs font-black text-emerald-300">
                    +{Math.round(heroBondsSummary.atkPct * 100)}% ATK · +{Math.round(heroBondsSummary.hpPct * 100)}% HP
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {HERO_BONDS.map((bond) => {
                    const active = heroBondsSummary.activeIds.includes(bond.id);
                    const starSum = bond.heroIds.reduce(
                      (s, id) =>
                        s +
                        Math.max(
                          0,
                          save.heroStars?.[id] ?? (save.unlockedHeroes.includes(id) ? 1 : 0)
                        ),
                      0
                    );
                    const allOwned = bond.heroIds.every((id) => save.unlockedHeroes.includes(id));

                    return (
                      <div
                        key={bond.id}
                        className={`rounded-2xl p-4 border flex flex-col justify-between gap-2.5 ${
                          active ? 'cel-panel-ornate' : 'cel-panel'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <h5
                              className="font-display text-sm font-black"
                              style={{ color: bond.accentColor }}
                            >
                              {bond.name}
                            </h5>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black font-mono-nums ${
                                active
                                  ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                                  : 'bg-slate-900 border border-slate-700 text-slate-400'
                              }`}
                            >
                              {active
                                ? 'ĐÃ KÍCH HOẠT'
                                : `Sao ${starSum}/${bond.minTotalStars}`}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300">{bond.subtitle}</p>
                          <div className="flex flex-wrap gap-2 mt-2.5">
                            {bond.heroIds.map((hid) => {
                              const hDef = HERO_MAP[hid];
                              const hOwned = save.unlockedHeroes.includes(hid);
                              const hStar = save.heroStars?.[hid] ?? (hOwned ? 1 : 0);
                              return hDef ? (
                                <button
                                  key={hid}
                                  type="button"
                                  onClick={() => {
                                    onPreviewHero(hid);
                                    setHeroSubTab('roster');
                                  }}
                                  className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ${
                                    hOwned
                                      ? 'bg-[#091229] border-amber-400/35 text-white'
                                      : 'bg-slate-950/80 border-slate-800 text-slate-500'
                                  }`}
                                >
                                  <span>{hDef.name}</span>
                                  <span className="font-mono-nums text-amber-300">
                                    {hOwned ? `★${hStar}` : 'Chưa mở'}
                                  </span>
                                </button>
                              ) : null;
                            })}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-amber-400/15 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-nums font-bold">
                          <span className="text-amber-300">
                            +{Math.round(bond.bonusAtkPct * 100)}% ATK · +{Math.round(bond.bonusHpPct * 100)}% HP
                          </span>
                          <span className="text-sky-300">
                            +{(bond.bonusCrit * 100).toFixed(1)}% Crit · +{Math.round(bond.bonusCritDmg * 100)}% ST Crit
                          </span>
                        </div>
                        {!allOwned && (
                          <div className="text-[10px] text-slate-400">
                            Cần chiêu mộ đủ tất cả Anh Hùng trong duyên để kích hoạt.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SUB-TAB 7: WAVE 10 3D DIVINE ZODIAC HALOS (HÀO QUANG THẦN VỰC 3D) */}
          {heroSubTab === 'halos' && (
            <div className="space-y-4 pb-6">
              <div className="cel-panel-ornate rounded-2xl overflow-hidden grid grid-cols-1 sm:grid-cols-12 items-center">
                <div className="sm:col-span-5 h-32 sm:h-36 bg-[#0b1229] relative overflow-hidden">
                  {!halosBannerErr ? (
                    <img
                      src={divineHaloArt}
                      alt="Thánh Điện Hào Quang Thần Vực 3D"
                      referrerPolicy="no-referrer"
                      onError={() => setHalosBannerErr(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-amber-500/25 to-rose-500/25">
                      <Crown className="w-8 h-8 text-amber-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-transparent via-transparent to-[#090d1f]" />
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-amber-300 text-slate-950 font-mono-nums text-[10px] font-black shadow">
                    VÒNG LUÂN 3D SAU LƯNG
                  </span>
                </div>
                <div className="sm:col-span-7 p-3.5 sm:p-4 flex flex-col justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                        Hào Quang Thần Vực 3D · Đúc Bằng Thần Tinh
                      </span>
                      <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/20 border border-amber-300/45 font-mono-nums text-xs font-black text-amber-200">
                        Thần Tinh: {divineCrystals}
                      </span>
                    </div>
                    <h4 className="font-display text-sm sm:text-base font-black text-white mt-0.5">
                      Xoay Tròn Sau Đầu &amp; Vai Anh Hùng Trong Sảnh Lẫn Thực Chiến 3D
                    </h4>
                    <p className="text-xs text-slate-300 mt-1">
                      Thu thập Thần Tinh từ <strong className="text-amber-300">Viễn Chinh Điện Thần 3D</strong> hoặc <strong className="text-amber-300">Chuỗi Quà Liên Hoàn</strong> để khai mở &amp; thăng cấp 4 Vòng Hào Quang Chí Tôn!
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {DIVINE_HALO_CATALOG.map((halo) => {
                  const isOwned = unlockedHalos.includes(halo.id);
                  const isEquipped = equippedHaloId === halo.id;
                  const lv = Math.max(1, haloLevels[halo.id] ?? 1);
                  const maxLv = lv >= DIVINE_HALO_MAX_LEVEL;
                  const hStats = getDivineHaloStats(halo.id, lv);
                  const upCost = getDivineHaloUpgradeCost(lv);

                  return (
                    <div
                      key={halo.id}
                      className={`rounded-2xl p-4 border flex flex-col justify-between gap-3 ${
                        isEquipped ? 'cel-panel-ornate ring-2 ring-amber-300/70' : 'cel-panel'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: `#${halo.primaryHex.toString(16).padStart(6, '0')}22`,
                                borderColor: `#${halo.secondaryHex.toString(16).padStart(6, '0')}88`,
                                color: `#${halo.secondaryHex.toString(16).padStart(6, '0')}`,
                              }}
                            >
                              <Crown className="w-5 h-5" />
                            </span>
                            <div>
                              <span className="text-[10px] font-black uppercase text-amber-300">
                                {halo.badge} {isOwned ? `· Lv.${lv}/${DIVINE_HALO_MAX_LEVEL}` : ''}
                              </span>
                              <h5 className="font-display text-sm sm:text-base font-black text-white">
                                {halo.name}
                              </h5>
                            </div>
                          </div>
                          {isEquipped && (
                            <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-400/50 text-[10px] font-black text-emerald-300">
                              ĐANG TỎA SÁNG
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">{halo.desc}</p>

                        <div className="grid grid-cols-4 gap-1.5 mt-2.5 text-center rounded-xl bg-[#070b1a] border border-amber-400/20 p-2 text-[10px] font-mono-nums font-bold">
                          <div>
                            <div className="text-slate-400">% ATK</div>
                            <div className="text-amber-300">+{(hStats.atkPct * 100).toFixed(1)}%</div>
                          </div>
                          <div>
                            <div className="text-slate-400">% HP</div>
                            <div className="text-emerald-300">+{(hStats.hpPct * 100).toFixed(1)}%</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Bạo Thương</div>
                            <div className="text-rose-300">+{Math.round(hStats.critDmg * 100)}%</div>
                          </div>
                          <div>
                            <div className="text-slate-400">Giảm Thương</div>
                            <div className="text-sky-300">+{(hStats.dr * 100).toFixed(1)}%</div>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-1">
                        {isOwned ? (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playUiClick(1.05);
                                onEquipHalo?.(isEquipped ? null : halo.id);
                              }}
                              className={`flex-1 py-2 px-3 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                                isEquipped ? 'a2-slate-btn' : 'a2-emerald-btn'
                              }`}
                            >
                              {isEquipped ? 'Thu Hồi Hào Quang' : 'Kích Hoạt Sau Lưng'}
                            </button>
                            <button
                              type="button"
                              disabled={
                                maxLv ||
                                divineCrystals < upCost.divineCrystals ||
                                save.gold < upCost.gold
                              }
                              onClick={() => {
                                soundEngine.playLevelUp();
                                onUpgradeHalo?.(halo.id);
                              }}
                              className="a2-yellow-btn flex-1 py-2 px-3 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed font-mono-nums"
                            >
                              {maxLv
                                ? 'Cấp Tối Đa'
                                : `Nâng (${upCost.divineCrystals} TT + ${upCost.gold}V)`}
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              disabled={divineCrystals < halo.unlockDivineCrystals}
                              onClick={() => {
                                soundEngine.playVictory();
                                onUnlockHalo?.(halo.id, 'crystals');
                              }}
                              className="a2-emerald-btn flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed font-mono-nums"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Đúc · {halo.unlockDivineCrystals} Thần Tinh</span>
                            </button>
                            <button
                              type="button"
                              disabled={save.gems < halo.unlockGems}
                              onClick={() => {
                                soundEngine.playVictory();
                                onUnlockHalo?.(halo.id, 'gems');
                              }}
                              className="a2-purple-btn flex-1 py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed font-mono-nums"
                            >
                              <SoulGemIcon className="w-3.5 h-3.5" />
                              <span>Mở · {halo.unlockGems} Ngọc</span>
                            </button>
                          </>
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
    </div>
  );
};

interface RunesPanelProps {
  save: SaveData;
  onEquipRune: (uid: string) => void;
  onUnequipRune: (uid: string) => void;
  onFuseRune: (uid: string) => void;
  onBulkFuseRunes: () => void;
  onRotateHero?: (deltaRad: number) => void;
  onResetHeroRotation?: () => void;
  onGoShop: () => void;
}

const RUNE_SEAL_SLOTS: Array<{ idx: number; label: string }> = [
  { idx: 0, label: 'Ấn I' },
  { idx: 1, label: 'Ấn II' },
  { idx: 2, label: 'Ấn III' },
  { idx: 3, label: 'Ấn IV' },
];

export const LobbyRunesPanel: React.FC<RunesPanelProps> = ({
  save,
  onEquipRune,
  onUnequipRune,
  onFuseRune,
  onBulkFuseRunes,
  onRotateHero,
  onResetHeroRotation,
  onGoShop,
}) => {
  const [selectedRuneUid, setSelectedRuneUid] = useState<string>(
    save.equippedRunes[0] || save.runeInventory[0]?.uid || ''
  );
  const [catFilter, setCatFilter] = useState<'ALL' | 'ability' | 'enhancement' | 'blessing'>('ALL');
  const dragRef = useRef<{ active: boolean; lastX: number }>({ active: false, lastX: 0 });

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

  const equippedTotals = save.equippedRunes.reduce(
    (acc, uid) => {
      const inst = save.runeInventory.find((r) => r.uid === uid);
      const def = inst ? RUNES_CATALOG[inst.runeId] : null;
      if (def) {
        acc.atk += Math.round(def.atkBonusPct * 100);
        acc.hp += Math.round(def.hpBonusPct * 100);
        acc.crit += Math.round(def.critBonus * 100);
      }
      return acc;
    },
    { atk: 0, hp: 0, crit: 0 }
  );

  const filteredRunes = save.runeInventory
    .filter((r) => {
      if (catFilter === 'ALL') return true;
      return RUNES_CATALOG[r.runeId]?.category === catFilter;
    })
    .sort((a, b) => RARITY_ORDER.indexOf(b.rarity) - RARITY_ORDER.indexOf(a.rarity));

  const handleStageDragDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragRef.current = { active: true, lastX: e.clientX };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handleStageDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const dx = e.clientX - dragRef.current.lastX;
    dragRef.current.lastX = e.clientX;
    onRotateHero?.(dx * 0.014);
  };
  const handleStageDragUp = () => {
    dragRef.current.active = false;
  };

  const renderRuneSeal = (slot: { idx: number; label: string }) => {
    const rUid = save.equippedRunes[slot.idx];
    const inst = save.runeInventory.find((r) => r.uid === rUid);
    const def = inst ? RUNES_CATALOG[inst.runeId] : null;
    const isSel = inst && selectedRune?.uid === inst.uid;

    return (
      <button
        key={slot.idx}
        type="button"
        onClick={() => inst && setSelectedRuneUid(inst.uid)}
        className={`w-[72px] h-[72px] sm:w-[82px] sm:h-[82px] rounded-2xl cursor-pointer flex flex-col items-center justify-center p-1.5 transition-transform hover:scale-105 ${
          inst && def
            ? `a2-item-card ${RARITY_FRAME_CLASS[inst.rarity]} ${
                isSel ? 'ring-2 ring-amber-300 ring-offset-2 ring-offset-[#070b18]' : ''
              }`
            : 'bg-[#090f26]/90 border border-dashed border-amber-400/50 text-amber-200/80 shadow-[0_0_20px_rgba(234,179,8,0.12)] hover:border-amber-300'
        }`}
        title={def ? def.name : `${slot.label} Trống`}
      >
        {inst && def ? (
          <div className="a2-item-inner flex flex-col items-center justify-center p-1 text-center">
            <span
              className="w-5 h-5 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: def.color }}
            />
            <span className="text-[9px] font-black text-white truncate max-w-full mt-1">
              {def.archetype}
            </span>
            <span className="text-[8px] font-bold text-amber-200/90 leading-none">
              {slot.label}
            </span>
          </div>
        ) : (
          <>
            <Sparkles className="w-4 h-4 text-amber-300/65 mb-0.5" />
            <span className="text-[11px] font-bold">{slot.label}</span>
          </>
        )}
      </button>
    );
  };

  return (
    <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto lg:overflow-hidden a2-scroll pointer-events-none">
      {/* LEFT STAGE: LIVE 3D HERO SURROUNDED BY 4 GLOWING CELESTIAL RUNE SEALS */}
      <div
        onPointerDown={handleStageDragDown}
        onPointerMove={handleStageDragMove}
        onPointerUp={handleStageDragUp}
        onPointerCancel={handleStageDragUp}
        className="lg:col-span-5 relative flex flex-col justify-between px-3 sm:px-5 py-3 min-h-[340px] lg:min-h-0 pointer-events-auto cursor-grab active:cursor-grabbing touch-none select-none"
      >
        <div className="h-2 shrink-0" />

        {/* 4 Symmetrical Rune Seals flanking full-body 3D Hero */}
        <div className="flex-1 flex items-center justify-between gap-2 my-1">
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="flex flex-col gap-6 items-center z-10"
          >
            {renderRuneSeal(RUNE_SEAL_SLOTS[0])}
            {renderRuneSeal(RUNE_SEAL_SLOTS[2])}
          </div>

          <div className="flex-1 min-h-[220px]" aria-hidden="true" />

          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="flex flex-col gap-6 items-center z-10"
          >
            {renderRuneSeal(RUNE_SEAL_SLOTS[1])}
            {renderRuneSeal(RUNE_SEAL_SLOTS[3])}
          </div>
        </div>

        {/* Bottom Celestial Rune Resonance Strip */}
        <div className="flex justify-center pt-1 shrink-0">
          <div
            onPointerDown={(e) => e.stopPropagation()}
            className="flex flex-wrap items-center justify-center gap-2 bg-[#080d20]/92 border border-amber-400/35 rounded-2xl px-3.5 py-1.5 shadow-xl text-[11px]"
          >
            <span className="font-display font-black text-amber-200">
              {activeHero.name} · {save.equippedRunes.length}/4 Ấn
            </span>
            <span aria-hidden="true" className="text-amber-400/35">·</span>
            <span className="font-mono-nums font-bold text-slate-200">
              +{equippedTotals.atk}% ATK · +{equippedTotals.hp}% HP · +{equippedTotals.crit}% Crit
            </span>
            {onResetHeroRotation && (
              <button
                type="button"
                onClick={() => {
                  soundEngine.playUiClick();
                  onResetHeroRotation();
                }}
                title="Đặt lại góc nhìn 360°"
                aria-label="Đặt lại góc nhìn"
                className="w-6 h-6 rounded-lg bg-[#0d1530] border border-amber-400/30 flex items-center justify-center text-amber-200 hover:border-amber-300 cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE DRAWER: RUNE ALTAR MANAGEMENT, INSPECTOR & INVENTORY */}
      <div className="lg:col-span-7 cel-side-drawer border-t lg:border-t-0 lg:border-l border-amber-400/35 flex flex-col min-h-0 pointer-events-auto">
        <div className="flex-1 min-h-0 overflow-y-auto a2-scroll px-3 sm:px-4 py-3 flex flex-col gap-3 pb-5">
          {/* Header Banner */}
          <div className="cel-panel rounded-2xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 border border-amber-400/25">
            <div>
              <h2 className="font-display text-sm sm:text-base font-black text-amber-200">
                Đài Khắc Ngọc Hoàng Đạo ({save.equippedRunes.length}/4 Ô)
              </h2>
              <p className="text-[11px] text-slate-400">
                Khảm tối đa 4 Ngọc Khắc để mở khóa kỹ năng khởi đầu &amp; cộng hưởng chỉ số.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                disabled={fusableRuneSets === 0}
                onClick={onBulkFuseRunes}
                className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  fusableRuneSets > 0
                    ? 'a2-emerald-btn'
                    : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span className="font-mono-nums">
                  {fusableRuneSets > 0 ? `Ghép Nhanh (${fusableRuneSets})` : 'Ghép Nhanh Ngọc'}
                </span>
              </button>

              <button
                type="button"
                onClick={onGoShop}
                className="a2-yellow-btn px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
              >
                Khắc Thêm Ngọc
              </button>
            </div>
          </div>

          {/* Selected Rune Inspector or Welcoming Empty CTA */}
          {selectedRune ? (
            <div className="cel-panel-ornate rounded-2xl p-3">
              {(() => {
                const def = RUNES_CATALOG[selectedRune.runeId];
                if (!def) return null;
                const rMeta = RARITY_META[selectedRune.rarity];
                const isEq = save.equippedRunes.includes(selectedRune.uid);
                const fuseReady = canFuseRune(selectedRune);

                return (
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-xs">
                        <span
                          className="w-3 h-3 rounded-full border border-white"
                          style={{ backgroundColor: def.color }}
                        />
                        <span className={`font-black ${rMeta.textClass}`}>{rMeta.label}</span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span style={{ color: def.color }} className="font-bold">
                          {def.archetype}
                        </span>
                      </div>
                      {isEq && (
                        <span className="text-[10px] font-black text-emerald-300">Đang Khảm</span>
                      )}
                    </div>

                    <h3 className="font-display text-base font-black text-white">{def.name}</h3>
                    <p className="text-[11px] text-slate-200 leading-snug">{def.description}</p>

                    <div className="flex flex-wrap gap-2.5 text-[11px] font-mono-nums text-amber-200 font-bold">
                      <span>+{Math.round(def.atkBonusPct * 100)}% ATK</span>
                      <span>+{Math.round(def.hpBonusPct * 100)}% HP</span>
                      <span>+{Math.round(def.critBonus * 100)}% Crit</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1.5 border-t border-amber-400/20">
                      <button
                        type="button"
                        onClick={() =>
                          isEq ? onUnequipRune(selectedRune.uid) : onEquipRune(selectedRune.uid)
                        }
                        disabled={!isEq && save.equippedRunes.length >= 4}
                        className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
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
                          ? 'Đã Đầy 4 Ô'
                          : 'Khảm Lên Đài'}
                      </button>

                      {selectedRune.rarity !== Rarity.MYTHIC && (
                        <button
                          type="button"
                          disabled={!fuseReady}
                          onClick={() => onFuseRune(selectedRune.uid)}
                          className={`flex-1 px-3 py-1.5 rounded-xl text-xs font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer ${
                            fuseReady
                              ? 'a2-yellow-btn'
                              : 'bg-slate-900 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>{fuseReady ? 'Ghép 3→1 Bậc' : 'Cần 3 viên cùng bậc'}</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="cel-panel-ornate rounded-2xl p-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-purple-500/15 border border-purple-400/45 flex items-center justify-center shrink-0">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="font-display text-sm font-black text-amber-200">
                    Chưa có Ngọc Khắc nào trong kho
                  </div>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Mở Túi Ngọc Khắc Cổ Đại hoặc Rương Ngọc Hiếm tại Kho Báu để kích hoạt 4 Ấn Hoàng Đạo quanh {activeHero.name}.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onGoShop}
                className="a2-yellow-btn px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap shrink-0 cursor-pointer"
              >
                Triệu Hồi Ngọc Ngay
              </button>
            </div>
          )}

          {/* Category Filter Ribbon */}
          <div className="flex flex-wrap items-center gap-1 bg-[#060916] border border-amber-400/25 rounded-xl p-1">
            {(
              [
                ['ALL', `Tất cả (${save.runeInventory.length})`],
                ['ability', 'Kỹ năng'],
                ['enhancement', 'Cường hóa'],
                ['blessing', 'Phước lành'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCatFilter(key)}
                className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer ${
                  catFilter === key
                    ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 font-black'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Visible Rune Grid */}
          {filteredRunes.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-2">
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
                        className="w-6 h-6 rounded-full border-2 border-white shadow"
                        style={{ backgroundColor: def.color }}
                      />
                      <span className="text-[10px] font-black text-white line-clamp-2 leading-tight">
                        {def.name.split('(')[0].trim()}
                      </span>
                      <span className="text-[9px] text-white/80 font-bold">{def.archetype}</span>
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
          )}
        </div>
      </div>
    </div>
  );
};

export type ShopSectionTab =
  | 'chain_bank'
  | 'privilege'
  | 'wish_topup'
  | 'packs'
  | 'arena_shop'
  | 'mystic_exchange'
  | 'deals'
  | 'gacha';

interface ShopPanelProps {
  save: SaveData;
  powerRating: number;
  initialSection?: ShopSectionTab;
  wishLastOutcomes?: Array<{ label: string; rarity: 'R' | 'SR' | 'SSR'; isTargetHit: boolean }>;
  onOpenChestWithGacha: (
    variant: 'iron' | 'mythic' | 'rune_bag' | 'rune_rare',
    count?: 1 | 10
  ) => void;
  onBuyFlashDeal: (deal: FlashDealItem) => void;
  onUnlockGrowthFundPremium: () => void;
  onClaimGrowthFundReward: (milestoneId: string, tier: 'free' | 'premium') => void;
  onClaimAllGrowthFund: () => void;
  onBuyArenaShopOffer: (offer: ArenaShopOffer) => void;
  onBuyCommercialPack: (pack: CommercialPackItem) => void;
  onBuyMonthlyCard?: (tier: MonthlyCardTier) => void;
  onClaimMonthlyCardDaily?: (tier: MonthlyCardTier) => void;
  onClaimTopUpEvolutionTier?: (tierId: string) => void;
  onSelectWishTarget?: (targetId: string) => void;
  onWishPoolRoll?: (count: 1 | 10) => void;
  onClaimWishMilestone?: (count: number) => void;
  onClaimFirstTopUp?: (tierId: string) => void;
  onBuyHotBundle?: (bundleId: string) => void;
  onMysticExchange?: (offerId: string) => void;
  onClaimChainStep?: (stepNum: number) => void;
  onResetChainCycle?: () => void;
  onBreakGemVault?: () => void;
  onClaimGemVaultMilestone?: (target: number) => void;
  onBuyWeekendPack?: (packId: string) => void;
  onClaimWeekendPassDaily?: () => void;
  onActivateSupremeMonthly?: () => void;
  onClaimSupremeMonthlyDaily?: () => void;
  onOpenBundlePreview?: (payload: BundlePreviewPayload, onConfirm?: () => void) => void;
  onOpenVipModal: () => void;
  onOpenArenaModal: () => void;
}

export const LobbyShopPanel: React.FC<ShopPanelProps> = ({
  save,
  powerRating,
  initialSection = 'gacha',
  wishLastOutcomes = [],
  onOpenChestWithGacha,
  onBuyFlashDeal,
  onUnlockGrowthFundPremium,
  onClaimGrowthFundReward,
  onClaimAllGrowthFund,
  onBuyArenaShopOffer,
  onBuyCommercialPack,
  onBuyMonthlyCard,
  onClaimMonthlyCardDaily,
  onClaimTopUpEvolutionTier,
  onSelectWishTarget,
  onWishPoolRoll,
  onClaimWishMilestone,
  onClaimFirstTopUp,
  onBuyHotBundle,
  onMysticExchange,
  onClaimChainStep,
  onResetChainCycle,
  onBreakGemVault,
  onClaimGemVaultMilestone,
  onBuyWeekendPack,
  onClaimWeekendPassDaily,
  onActivateSupremeMonthly,
  onClaimSupremeMonthlyDaily,
  onOpenBundlePreview,
  onOpenVipModal,
  onOpenArenaModal,
}) => {
  const [storeSection, setStoreSection] = useState<ShopSectionTab>(initialSection);
  useEffect(() => {
    setStoreSection(initialSection);
  }, [initialSection]);
  const [chestImgFailed, setChestImgFailed] = useState(false);
  const [vaultBannerFailed, setVaultBannerFailed] = useState(false);
  const [weekendBannerFailed, setWeekendBannerFailed] = useState(false);
  const [growthImgFailed, setGrowthImgFailed] = useState(false);
  const [privilegeImgFailed, setPrivilegeImgFailed] = useState(false);
  const [wishBannerFailed, setWishBannerFailed] = useState(false);
  const [topUpBannerFailed, setTopUpBannerFailed] = useState(false);
  const [mysticImgFailed, setMysticImgFailed] = useState(false);
  const [chainBankImgFailed, setChainBankImgFailed] = useState(false);
  const [oddsModalVariant, setOddsModalVariant] = useState<
    'iron' | 'mythic' | 'rune_bag' | 'rune_rare' | null
  >(null);
  const [flashCountdownSec, setFlashCountdownSec] = useState<number>(() =>
    getFlashSaleSecondsRemaining()
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      setFlashCountdownSec(getFlashSaleSecondsRemaining());
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  const pity = normalizePity(save.pity);
  const earlyPolicy = getEarlyProgressionPolicy(save);
  const ironChestUnlock = isEarlyFeatureUnlocked(save, 'iron_chest');
  const mythicChestUnlock = isEarlyFeatureUnlocked(save, 'mythic_chest');
  const runesUnlock = isEarlyFeatureUnlocked(save, 'runes');
  const flashDealsUnlock = isEarlyFeatureUnlocked(save, 'flash_deals');
  const epicPoolOpen = RARITY_RANK[earlyPolicy.maxGearRarity] >= RARITY_RANK[Rarity.EPIC];
  const rollsUntilEpic = Math.max(1, 10 - pity.mythicRollsSinceEpic);
  const rollsUntilSTier = Math.max(1, 25 - pity.mythicRollsSinceSTier);

  const today = getTodayKey();
  const flashState = normalizeFlashDeals(save.flashDeals);
  const dailyDeals = getDailyFlashDeals(today);

  const gf = normalizeGrowthFund(save.growthFund);
  const claimableGfCount = countClaimableGrowthFund(save, powerRating);
  const arena = normalizeArena(save.arena);
  const arenaShop = normalizeArenaShop(save.arenaShop);
  const hasVip = isVipActive(save.vip);
  const packClaims = save.commercialPackClaims ?? {};
  const mp = normalizeMonthlyPrivilege(save.monthlyPrivilege);
  const tu = normalizeTopUpEvolution(save.topUpEvolution);
  const supremePass = normalizeSupremeMonthly(save.supremeMonthly);
  const supremeActive = isSupremeMonthlyActive(supremePass);
  const supremeCanClaim = canClaimSupremeMonthlyDaily(save);
  const claimableWave7Count = countClaimableWave7Rewards(save) + (supremeCanClaim ? 1 : 0);
  const wishPool = normalizeWishPool(save.wishPool);
  const firstTopUp = normalizeFirstTopUp(save.firstTopUp);
  const wishTickets = save.wishTickets ?? 0;
  const claimedHotBundleIds = save.claimedHotBundleIds ?? [];
  const wishMilestonesReady = WISH_MILESTONES.filter(
    (m) => wishPool.totalWishes >= m.count && !wishPool.claimedMilestones.includes(m.count)
  ).length;
  const activeWishTarget =
    WISH_TARGET_CATALOG.find((t) => t.id === wishPool.selectedTargetId) ?? WISH_TARGET_CATALOG[0];
  const stepUpChain = normalizeStepUpChain(save.stepUpChain);
  const gemVault = normalizeGemRebateVault(save.gemRebateVault);
  const chainBankBadge =
    (hasFreeChainStepReady(save) ? 1 : 0) + countClaimableVaultRewards(save);
  const weekendPriv = normalizeWeekendPrivilege(save.weekendPass);
  const weekendPassActive = weekendPriv.passActive && weekendPriv.daysRemaining > 0;
  const weekendPassDailyReady = canClaimWeekendPassDaily(save);
  const dealsBadge = weekendPassDailyReady ? 1 : 0;

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
    <div className="flex-1 a2-gear-vault-bg overflow-y-auto a2-scroll px-3 sm:px-6 py-3 pointer-events-auto">
      <div className="max-w-5xl mx-auto flex flex-col gap-3.5 pb-8">
        {/* Clean Storefront Header */}
        <div className="cel-panel rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5 border border-amber-400/20">
          <div>
            <h2 className="font-display text-base sm:text-lg font-black text-amber-200">
              Kho Báu &amp; Thương Hội
            </h2>
            <p className="text-[11px] text-slate-400">
              Triệu hồi Rương, Chuỗi Quà, Hồ Ước SSR &amp; Thẻ Đặc Quyền.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono-nums font-bold">
            <span className="px-2 py-1 rounded-lg bg-[#070b1a] border border-amber-400/30 text-amber-200 flex items-center gap-1">
              <GoldCoinIcon className="w-3.5 h-3.5" />
              <span>{save.gold}</span>
            </span>
            <span className="px-2 py-1 rounded-lg bg-[#070b1a] border border-purple-400/35 text-purple-200 flex items-center gap-1">
              <SoulGemIcon className="w-3.5 h-3.5" />
              <span>{save.gems}</span>
            </span>
            <span className="px-2 py-1 rounded-lg bg-[#070b1a] border border-amber-300/40 text-amber-200 flex items-center gap-1">
              <Crown className="w-3.5 h-3.5 text-amber-300" />
              <span>{save.divineCrystals ?? 0} Thần Tinh</span>
            </span>
            <span className="px-2 py-1 rounded-lg bg-[#070b1a] border border-sky-400/30 text-sky-200 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-sky-300" />
              <span>{wishTickets} Vé Ước</span>
            </span>
            <span className="px-2 py-1 rounded-lg bg-[#070b1a] border border-emerald-400/30 text-emerald-200 flex items-center gap-1">
              <ArtifactRelicIcon className="w-3.5 h-3.5" />
              <span>{save.artifactShards ?? 0} Mảnh</span>
            </span>
          </div>
        </div>

        {/* 4-Group Consolidated Commercial Navigation (Zero Truncation + Clean Sub-Pills) */}
        {(() => {
          type ShopGroupId = 'summon' | 'chain' | 'privilege' | 'exchange';
          const shopGroups: Array<{
            id: ShopGroupId;
            label: string;
            badge: number;
            subTabs: Array<{ id: ShopSectionTab; label: string; badge: number }>;
          }> = [
            {
              id: 'summon',
              label: 'Triệu Hồi & Hồ Ước',
              badge: wishMilestonesReady,
              subTabs: [
                { id: 'gacha', label: 'Triệu Hồi Rương', badge: 0 },
                { id: 'wish_topup', label: 'Hồ Ước SSR & Nạp X2', badge: wishMilestonesReady },
              ],
            },
            {
              id: 'chain',
              label: 'Chuỗi Quà & Két Ngọc',
              badge: chainBankBadge,
              subTabs: [{ id: 'chain_bank', label: 'Chuỗi Quà & Két Tinh Ngân', badge: chainBankBadge }],
            },
            {
              id: 'privilege',
              label: 'Đặc Quyền & Gói Quà',
              badge: claimableWave7Count + claimableGfCount + dealsBadge,
              subTabs: [
                { id: 'privilege', label: 'Thẻ Tháng & VIP', badge: claimableWave7Count },
                { id: 'packs', label: 'Quỹ & Gói Nạp', badge: claimableGfCount },
                { id: 'deals', label: 'Flash & Cuối Tuần', badge: dealsBadge },
              ],
            },
            {
              id: 'exchange',
              label: 'Cửa Hàng Đổi Thưởng',
              badge: 0,
              subTabs: [
                { id: 'arena_shop', label: 'Shop Xu Arena', badge: 0 },
                { id: 'mystic_exchange', label: 'Chợ Mảnh Dư', badge: 0 },
              ],
            },
          ];

          const activeGroup =
            shopGroups.find((g) => g.subTabs.some((st) => st.id === storeSection)) ?? shopGroups[0];

          return (
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 bg-[#060916] border border-amber-400/25 rounded-xl p-1.5">
                {shopGroups.map((g) => {
                  const isActive = activeGroup.id === g.id;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        if (!isActive) {
                          setStoreSection(g.subTabs[0].id);
                        }
                      }}
                      className={`px-3 py-2 rounded-lg text-xs font-black whitespace-nowrap cursor-pointer flex items-center justify-center gap-1.5 transition-colors ${
                        isActive
                          ? 'bg-gradient-to-b from-amber-300 to-amber-500 text-slate-950 shadow'
                          : 'text-slate-300 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <span>{g.label}</span>
                      {g.badge > 0 && (
                        <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-mono-nums text-[9px] font-black shrink-0 leading-none">
                          +{g.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {activeGroup.subTabs.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {activeGroup.subTabs.map((sub) => {
                    const isSubActive = storeSection === sub.id;
                    return (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => {
                          soundEngine.playUiClick();
                          setStoreSection(sub.id);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black whitespace-nowrap cursor-pointer flex items-center gap-1.5 border transition-colors ${
                          isSubActive
                            ? 'bg-amber-400/18 border-amber-300/80 text-amber-200 shadow'
                            : 'bg-[#080d20] border-amber-400/20 text-slate-300 hover:border-amber-300/50 hover:text-white'
                        }`}
                      >
                        <span>{sub.label}</span>
                        {sub.badge > 0 && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 font-mono-nums text-[9px] font-black leading-none">
                            +{sub.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {/* SECTION WAVE 10: STEP-UP COMMERCIAL CHAIN RELAY + ASTRAL GEM REBATE VAULT */}
        {storeSection === 'chain_bank' && (
          <section className="space-y-5">
            {/* 1. Hero Banner + Astral Gem Rebate Vault */}
            <div className="cel-panel-ornate rounded-2xl overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-12 items-stretch border-b border-amber-400/20">
                <div className="md:col-span-5 relative min-h-[155px] bg-[#0b1229]">
                  {!chainBankImgFailed ? (
                    <img
                      src={celestialPassVaultArt}
                      alt="Chuỗi Quà Liên Hoàn & Ngân Hàng Hoàn Trả Ngọc"
                      referrerPolicy="no-referrer"
                      onError={() => setChainBankImgFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-500/25 to-purple-500/25 flex items-center justify-center">
                      <Crown className="w-10 h-10 text-amber-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-transparent via-transparent to-[#090d1f]" />
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-amber-300 text-slate-950 font-mono-nums text-[10px] font-black shadow">
                    HOÀN TRẢ LÊN TỚI 900%
                  </span>
                </div>

                <div className="md:col-span-7 p-4 flex flex-col justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                        Ngân Hàng Tinh Ngân · Tích Trữ &amp; Sinh Lời Tự Động
                      </span>
                      <span className="font-mono-nums text-xs font-black text-emerald-300">
                        Thần Tinh hiện có: {save.divineCrystals ?? 0}
                      </span>
                    </div>
                    <h3 className="font-display text-base sm:text-lg font-black text-white mt-0.5">
                      Két Tinh Ngân: {gemVault.storedGems}/{GEM_VAULT_CAPACITY} Ngọc Hồn Hoàn Trả
                    </h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Mỗi trận chiến &amp; giao dịch thương mại tự động tích lũy thêm Ngọc Hồn vào Két. Đạt tối thiểu{' '}
                      <strong className="text-amber-300">{GEM_VAULT_CLAIM_THRESHOLD} Ngọc</strong> có thể mở két rút toàn bộ kèm thưởng Thần Tinh!
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[11px] font-mono-nums font-bold">
                      <span className="text-amber-300">
                        Tiến độ Két: {gemVault.storedGems}/{GEM_VAULT_CAPACITY} Ngọc
                      </span>
                      <span className="text-slate-300">
                        Tổng tích lũy: {gemVault.totalDepositedEver} Ngọc · Đã rút {gemVault.vaultBrokenCount} lần
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-950 border border-amber-400/35 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-emerald-400 via-amber-300 to-rose-400 transition-all"
                        style={{
                          width: `${Math.min(100, Math.round((gemVault.storedGems / GEM_VAULT_CAPACITY) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-emerald-300 font-bold">
                        {gemVault.storedGems >= GEM_VAULT_CLAIM_THRESHOLD
                          ? `Sẵn sàng rút ngay +${gemVault.storedGems} Ngọc Hồn & +${Math.max(4, Math.floor(gemVault.storedGems / 15))} Thần Tinh!`
                          : `Cần tích thêm ${GEM_VAULT_CLAIM_THRESHOLD - gemVault.storedGems} Ngọc trong két để mở khóa rút.`}
                      </span>
                      <button
                        type="button"
                        disabled={gemVault.storedGems < GEM_VAULT_CLAIM_THRESHOLD}
                        onClick={() => {
                          soundEngine.playVictory();
                          onBreakGemVault?.();
                        }}
                        className="a2-emerald-btn px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed font-mono-nums"
                      >
                        <SoulGemIcon className="w-3.5 h-3.5" />
                        <span>Rút Két (+{gemVault.storedGems} Ngọc)</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* 4 Cumulative Vault Dividend Milestones */}
              <div className="p-4 bg-[#070b1a]">
                <div className="text-xs font-black text-amber-200 mb-2.5">
                  Cổ Tức Tích Lũy Ngân Hàng Tinh Ngân (Nhận MIỄN PHÍ theo tổng Ngọc đã tích vào Két)
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                  {GEM_VAULT_MILESTONES.map((ms) => {
                    const met = gemVault.totalDepositedEver >= ms.storedTarget;
                    const claimed = gemVault.claimedMilestoneTargets.includes(ms.storedTarget);
                    return (
                      <div
                        key={ms.storedTarget}
                        className={`rounded-xl p-3 border flex flex-col justify-between gap-2 ${
                          met && !claimed
                            ? 'bg-amber-400/12 border-amber-300'
                            : 'bg-[#090f24] border-slate-800'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-1 text-[10px] font-mono-nums font-black">
                            <span className="text-amber-300">MỐC {ms.storedTarget} NGỌC</span>
                            <span className={claimed ? 'text-emerald-300' : 'text-slate-400'}>
                              {claimed ? 'ĐÃ NHẬN' : `${Math.min(ms.storedTarget, gemVault.totalDepositedEver)}/${ms.storedTarget}`}
                            </span>
                          </div>
                          <div className="text-xs font-black text-white mt-0.5">{ms.title}</div>
                          <div className="text-[10px] font-mono-nums text-sky-300 mt-1">
                            +{ms.dividendGems} Ngọc · +{ms.bonusDivineCrystals} Thần Tinh · +{ms.bonusWishTickets} Vé
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!met || claimed}
                          onClick={() => {
                            soundEngine.playVictory();
                            onClaimGemVaultMilestone?.(ms.storedTarget);
                          }}
                          className={`w-full py-1.5 px-2.5 rounded-lg text-[10px] font-black whitespace-nowrap cursor-pointer ${
                            claimed
                              ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                              : met
                              ? 'a2-yellow-btn'
                              : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {claimed ? 'Đã Nhận Cổ Tức' : met ? 'Nhận Cổ Tức Free' : 'Chưa Đạt Mốc'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* 2. 5-Step Commercial Chain Relay (Chuỗi Quà Liên Hoàn 5 Bước) */}
            <div className="cel-panel-ornate rounded-2xl p-4 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                    Chuỗi Quà Liên Hoàn 5 Bước · Mở Theo Thứ Tự 1 → 5
                  </span>
                  <h3 className="font-display text-base sm:text-lg font-black text-white">
                    Bước 1 &amp; Bước 3 MIỄN PHÍ 0Đ · Bước 5 Tặng Hào Quang 3D [Thánh Luân Thái Dương]
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-[#070b1a] border border-amber-400/30 font-mono-nums text-xs font-black text-amber-200">
                    Tiến Độ: {Math.min(5, stepUpChain.claimedSteps.length)}/5 Bước · Chu Kỳ #{stepUpChain.cycleCount + 1}
                  </span>
                  {stepUpChain.currentStep > 5 && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick(1.1);
                        onResetChainCycle?.();
                      }}
                      className="a2-purple-btn px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer"
                    >
                      Làm Mới Chu Kỳ Mới
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
                {STEP_UP_CHAIN_STEPS.map((st) => {
                  const isClaimed = stepUpChain.claimedSteps.includes(st.step);
                  const isCurrent = stepUpChain.currentStep === st.step && !isClaimed;
                  const isLocked = st.step > stepUpChain.currentStep;
                  const canAfford = save.gems >= st.costGems;
                  const isFree = st.costGems === 0;

                  return (
                    <div
                      key={st.step}
                      className={`rounded-2xl p-3.5 border flex flex-col justify-between gap-3 transition-all ${
                        isCurrent
                          ? 'cel-panel-ornate ring-2 ring-amber-300'
                          : isClaimed
                          ? 'bg-emerald-950/25 border-emerald-500/35'
                          : 'bg-[#070b1a] border-slate-800 opacity-85'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black ${
                              isFree
                                ? 'bg-emerald-400 text-slate-950'
                                : st.step === 5
                                ? 'bg-gradient-to-r from-amber-300 to-rose-400 text-slate-950'
                                : 'bg-amber-400/20 border border-amber-300/40 text-amber-200'
                            }`}
                          >
                            {st.badge}
                          </span>
                          <span className="text-[9px] font-mono-nums font-black text-amber-300">
                            {st.valueLabel}
                          </span>
                        </div>

                        <h4 className="font-display text-xs sm:text-sm font-black text-white mt-1">
                          {st.title}
                        </h4>
                        <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                          {st.subtitle}
                        </p>

                        <div className="flex flex-wrap gap-1 mt-2.5 text-[10px] font-mono-nums font-bold">
                          {st.unlockHaloId && (
                            <span className="px-2 py-0.5 rounded bg-gradient-to-r from-amber-500/30 to-rose-500/30 border border-amber-300 text-amber-200 font-black">
                              ★ Hào Quang 3D: Thánh Luân
                            </span>
                          )}
                          {st.rewardSGear && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-400/45 text-amber-200">
                              +1 Trang Bị [S]
                            </span>
                          )}
                          {st.rewardDivineCrystals > 0 && (
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-400/40 text-rose-200">
                              +{st.rewardDivineCrystals} Thần Tinh
                            </span>
                          )}
                          {st.rewardArtifactShards > 0 && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/35 text-amber-200">
                              +{st.rewardArtifactShards} Mảnh Thánh Khí
                            </span>
                          )}
                          {st.rewardGems > 0 && (
                            <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/40 text-sky-200">
                              +{st.rewardGems} Ngọc
                            </span>
                          )}
                          {st.rewardWishTickets > 0 && (
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-400/40 text-purple-200">
                              +{st.rewardWishTickets} Vé Ước
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/35 text-emerald-200">
                            +{st.rewardGold} Vàng
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!isCurrent || !canAfford}
                        onClick={() => {
                          soundEngine.playVictory();
                          onClaimChainStep?.(st.step);
                        }}
                        className={`w-full py-2 px-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer font-mono-nums ${
                          isClaimed
                            ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 cursor-default'
                            : isCurrent && isFree
                            ? 'a2-emerald-btn'
                            : isCurrent && canAfford
                            ? 'a2-yellow-btn'
                            : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {isClaimed ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Đã Nhận Bước {st.step}</span>
                          </>
                        ) : isLocked ? (
                          <>
                            <Lock className="w-3.5 h-3.5" />
                            <span>Mở Bước {st.step - 1} Trước</span>
                          </>
                        ) : isFree ? (
                          <span>Nhận MIỄN PHÍ 0Đ</span>
                        ) : (
                          <>
                            <SoulGemIcon className="w-3.5 h-3.5" />
                            <span>Mở · {st.costGems} Ngọc</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* SECTION WAVE 8: WISH POOL SSR + FIRST TOP-UP X2 + HOT FLASH BUNDLES */}
        {storeSection === 'wish_topup' && (
          <section className="space-y-5">
            {/* 1. First Top-Up X2 Diamonds */}
            <div className="cel-panel-ornate rounded-2xl overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-12 items-stretch border-b border-amber-400/20">
                <div className="md:col-span-5 relative min-h-[140px] bg-[#0b1229]">
                  {!topUpBannerFailed ? (
                    <img
                      src={firstTopUpArt}
                      alt="Nạp Đầu X2 Kim Cương"
                      referrerPolicy="no-referrer"
                      onError={() => setTopUpBannerFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-500/25 to-purple-500/25 flex items-center justify-center">
                      <SoulGemIcon className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-transparent via-transparent to-[#090d1f]" />
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-rose-500 text-white text-[10px] font-black shadow">
                    NẠP ĐẦU X2 NGỌC HỒN
                  </span>
                </div>
                <div className="md:col-span-7 p-4 flex flex-col justify-center gap-1.5">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                    Kho Báu Tiếp Tế Hoàng Gia · Khuyến Mãi 100% Lần Đầu
                  </span>
                  <h3 className="font-display text-base sm:text-lg font-black text-white">
                    Nạp Đầu Nhân Đôi Ngọc Hồn + Tặng Mảnh Thú Cưỡi &amp; Thánh Vật [S]
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Mỗi mốc nạp nhận gấp đôi Ngọc Hồn ở lần kích hoạt đầu tiên và tự động cộng thẳng vào Quà Tích Lũy Nạp Tiến Hóa.
                  </p>
                </div>
              </div>

              <div className="p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3">
                {FIRST_TOPUP_TIERS.map((tier: FirstTopUpTier) => {
                  const firstClaimed = firstTopUp.claimedTierIds.includes(tier.id);
                  const gemYield = firstClaimed
                    ? tier.baseGems
                    : tier.baseGems + tier.bonusGemsFirstTime;

                  return (
                    <div
                      key={tier.id}
                      className="rounded-2xl bg-[#070b1a] border border-amber-400/35 p-3.5 flex flex-col justify-between gap-2.5"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black ${
                              firstClaimed
                                ? 'bg-slate-800 text-slate-300'
                                : 'bg-rose-500 text-white'
                            }`}
                          >
                            {firstClaimed ? 'ĐÃ NHẬN X2' : tier.badge}
                          </span>
                          <span className="font-mono-nums text-xs font-black text-amber-300">
                            {tier.priceLabel}
                          </span>
                        </div>
                        <h4 className="font-display text-sm font-black text-white">{tier.title}</h4>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                          {tier.subtitle}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] font-mono-nums font-bold">
                          <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-400/40 text-purple-200">
                            +{gemYield} Ngọc
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/35 text-amber-200">
                            +{tier.bonusMountShards} Mảnh Thú
                          </span>
                          <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-400/35 text-rose-200">
                            +{tier.bonusAwakeningCrystals} Tinh Thể
                          </span>
                          {tier.bonusSGear && (
                            <span className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-400/50 text-sky-200">
                              +1 Thánh Vật [S]
                            </span>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          soundEngine.playVictory();
                          onClaimFirstTopUp?.(tier.id);
                        }}
                        className="a2-yellow-btn w-full py-2 px-3 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
                      >
                        {firstClaimed ? `Tiếp Tế +${tier.baseGems} Ngọc` : `Nhận Ngay X2 (+${gemYield} Ngọc)`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 2. Hot Flash Bundles */}
            <div className="space-y-2.5">
              <h3 className="font-display text-sm sm:text-base font-black text-amber-200">
                Gói Hot Giảm Giá Sốc (Giới Hạn 1 Lần)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {HOT_FLASH_BUNDLES.map((bundle: HotFlashBundle) => {
                  const bought = claimedHotBundleIds.includes(bundle.id);
                  const canAfford = !bought && save.gems >= bundle.costGems;
                  return (
                    <div
                      key={bundle.id}
                      className="cel-panel-ornate rounded-2xl p-4 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded bg-rose-500 text-white text-[10px] font-black">
                            {bundle.badge}
                          </span>
                          <span className="text-[11px] font-mono-nums text-slate-400 line-through">
                            {bundle.originalGemsLabel}
                          </span>
                        </div>
                        <h4 className="font-display text-sm sm:text-base font-black text-white">
                          {bundle.title}
                        </h4>
                        <p className="text-[11px] text-slate-300 mt-0.5">{bundle.subtitle}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] font-mono-nums font-bold">
                          {bundle.rewardWishTickets > 0 && (
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-400/40 text-purple-200">
                              +{bundle.rewardWishTickets} Vé Ước Nguyện
                            </span>
                          )}
                          {bundle.rewardMountShards > 0 && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/35 text-amber-200">
                              +{bundle.rewardMountShards} Mảnh Thú Cưỡi
                            </span>
                          )}
                          {bundle.rewardCrystals > 0 && (
                            <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-400/35 text-rose-200">
                              +{bundle.rewardCrystals} Tinh Thể
                            </span>
                          )}
                          {bundle.rewardFeathers > 0 && (
                            <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-400/35 text-sky-200">
                              +{bundle.rewardFeathers} Lông Vũ
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/35 text-emerald-200">
                            +{bundle.rewardGold} Vàng
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {onOpenBundlePreview && (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              const items: BundlePreviewPayload['items'] = [];
                              if (bundle.rewardWishTickets > 0) {
                                items.push({
                                  label: 'Vé Ước Nguyện SSR',
                                  quantity: `+${bundle.rewardWishTickets}`,
                                  rarity: 'mythic',
                                });
                              }
                              if (bundle.rewardMountShards > 0) {
                                items.push({
                                  label: 'Mảnh Thú Cưỡi Hoàng Đạo',
                                  quantity: `+${bundle.rewardMountShards}`,
                                  rarity: 'legendary',
                                });
                              }
                              if (bundle.rewardCrystals > 0) {
                                items.push({
                                  label: 'Tinh Thể Thức Tỉnh',
                                  quantity: `+${bundle.rewardCrystals}`,
                                  rarity: 'epic',
                                });
                              }
                              if (bundle.rewardFeathers > 0) {
                                items.push({
                                  label: 'Lông Vũ Cánh 3D',
                                  quantity: `+${bundle.rewardFeathers}`,
                                  rarity: 'epic',
                                });
                              }
                              items.push({
                                label: 'Vàng Hoàng Gia',
                                quantity: `+${bundle.rewardGold}`,
                                rarity: 'rare',
                              });
                              onOpenBundlePreview(
                                {
                                  id: bundle.id,
                                  title: bundle.title,
                                  subtitle: bundle.subtitle,
                                  badge: bundle.badge,
                                  valueTag: 'SIÊU LỜI',
                                  priceLabel: `${bundle.costGems} Ngọc`,
                                  originalPriceLabel: bundle.originalGemsLabel,
                                  canAfford,
                                  disabledReason: bought
                                    ? 'Bạn đã sở hữu gói này'
                                    : save.gems < bundle.costGems
                                    ? 'Không đủ Ngọc Hồn'
                                    : undefined,
                                  items,
                                  confirmLabel: bought
                                    ? 'Đã Sở Hữu'
                                    : `Mua Ngay · ${bundle.costGems} Ngọc`,
                                  onConfirm: () => onBuyHotBundle?.(bundle.id),
                                },
                                canAfford ? () => onBuyHotBundle?.(bundle.id) : undefined
                              );
                            }}
                            className="a2-slate-btn px-2.5 py-2.5 rounded-xl text-xs font-black flex items-center gap-1 whitespace-nowrap cursor-pointer shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-300" />
                            <span>Chi Tiết</span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!canAfford}
                          onClick={() => {
                            soundEngine.playVictory();
                            onBuyHotBundle?.(bundle.id);
                          }}
                          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                            bought
                              ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 cursor-default'
                              : canAfford
                              ? 'a2-purple-btn'
                              : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {bought ? (
                            <span>Đã Sở Hữu Gói Hot</span>
                          ) : (
                            <>
                              <SoulGemIcon className="w-3.5 h-3.5" />
                              <span className="font-mono-nums">Mua Ngay · {bundle.costGems} Ngọc</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. Rate-Up Wish Pool SSR */}
            <div className="cel-panel-ornate rounded-2xl overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-12 items-stretch border-b border-amber-400/20">
                <div className="md:col-span-5 relative min-h-[155px] bg-[#0b1229]">
                  {!wishBannerFailed ? (
                    <img
                      src={wishPoolArt}
                      alt="Hồ Ước Nguyện Rate-Up SSR"
                      referrerPolicy="no-referrer"
                      onError={() => setWishBannerFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-sky-500/25 to-purple-500/25 flex items-center justify-center">
                      <Sparkles className="w-10 h-10 text-sky-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-transparent via-transparent to-[#090d1f]" />
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-sky-400 text-slate-950 font-mono-nums text-[10px] font-black shadow">
                    BẢO HIỂM {WISH_PITY_LIMIT} LƯỢT
                  </span>
                </div>

                <div className="md:col-span-7 p-4 flex flex-col justify-between gap-2.5">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-sky-300">
                        Hồ Ước Nguyện Định Hướng SSR
                      </span>
                      <span className="font-mono-nums text-xs font-black text-purple-200">
                        Vé Ước Nguyện: {wishTickets}
                      </span>
                    </div>
                    <h3 className="font-display text-base sm:text-lg font-black text-white mt-0.5">
                      Mục Tiêu Chọn: {activeWishTarget.name}
                    </h3>
                    <p className="text-xs text-slate-300 mt-1">{activeWishTarget.desc}</p>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono-nums font-bold">
                      <span className="text-amber-300">
                        Tiến độ bảo hiểm SSR: {wishPool.pityCount}/{WISH_PITY_LIMIT}
                      </span>
                      <span className="text-slate-300">
                        Tổng lượt ước: {wishPool.totalWishes}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-slate-950 border border-sky-400/35 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-400 via-purple-400 to-amber-300 transition-all"
                        style={{
                          width: `${Math.min(100, Math.round((wishPool.pityCount / WISH_PITY_LIMIT) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* 4 Selectable Rate-Up Targets */}
                <div>
                  <div className="text-xs font-black text-amber-200 mb-2">
                    1. Chọn Mục Tiêu SSR Tăng Tỷ Lệ Rơi (Rate-Up 65% · 100% khi đủ {WISH_PITY_LIMIT} lượt)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    {WISH_TARGET_CATALOG.map((target) => {
                      const selected = wishPool.selectedTargetId === target.id;
                      return (
                        <button
                          key={target.id}
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick(1.05);
                            onSelectWishTarget?.(target.id);
                          }}
                          className={`rounded-2xl p-3 text-left border transition-colors cursor-pointer ${
                            selected
                              ? 'bg-amber-400/15 border-amber-300 ring-1 ring-amber-300/60'
                              : 'bg-[#070b1a] border-slate-800 hover:border-amber-400/45'
                          }`}
                        >
                          <div className="text-[9px] font-black tracking-wider text-amber-300">
                            {target.badge}
                          </div>
                          <div className="text-xs font-black text-white mt-0.5">{target.name}</div>
                          <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">
                            {target.desc}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Wish Roll Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    disabled={wishTickets < 1 && save.gems < WISH_POOL_COST_GEMS}
                    onClick={() => {
                      soundEngine.playChestRoll();
                      onWishPoolRoll?.(1);
                    }}
                    className="a2-purple-btn py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed font-mono-nums"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>
                      {wishTickets >= 1
                        ? 'Ước Nguyện ×1 · 1 Vé'
                        : `Ước Nguyện ×1 · ${WISH_POOL_COST_GEMS} Ngọc`}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={wishTickets < 10 && save.gems < WISH_POOL_10_COST_GEMS}
                    onClick={() => {
                      soundEngine.playChestRoll();
                      onWishPoolRoll?.(10);
                    }}
                    className="a2-yellow-btn py-3 px-4 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed font-mono-nums"
                  >
                    <Crown className="w-4 h-4" />
                    <span>
                      {wishTickets >= 10
                        ? 'Ước Nguyện ×10 · 10 Vé'
                        : `Ước Nguyện ×10 · ${WISH_POOL_10_COST_GEMS} Ngọc (-10%)`}
                    </span>
                  </button>
                </div>

                {/* Wish Milestones */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {WISH_MILESTONES.map((ms) => {
                    const met = wishPool.totalWishes >= ms.count;
                    const claimed = wishPool.claimedMilestones.includes(ms.count);
                    return (
                      <div
                        key={ms.count}
                        className="rounded-xl bg-[#070b1a] border border-slate-800 p-2.5 flex items-center justify-between gap-2"
                      >
                        <div>
                          <div className="text-xs font-black text-white">{ms.label}</div>
                          <div className="text-[10px] font-mono-nums text-sky-300">
                            +{ms.rewardGems}N · +{ms.rewardShards}M · +{ms.rewardCrystals}TT
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={!met || claimed}
                          onClick={() => {
                            soundEngine.playVictory();
                            onClaimWishMilestone?.(ms.count);
                          }}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black whitespace-nowrap cursor-pointer ${
                            claimed
                              ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                              : met
                              ? 'a2-emerald-btn'
                              : 'bg-slate-900 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {claimed ? 'Đã Nhận' : met ? 'Nhận Mốc' : `${wishPool.totalWishes}/${ms.count}`}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Recent Wish Results */}
                {(wishLastOutcomes.length > 0 || wishPool.recentLogs.length > 0) && (
                  <div className="rounded-2xl bg-[#070b1a] border border-amber-400/25 p-3 space-y-2">
                    <div className="text-[11px] font-black text-amber-200">
                      Kết Quả Triệu Hồi Hồ Ước Nguyện Gần Đây
                    </div>
                    {wishLastOutcomes.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
                        {wishLastOutcomes.map((o, idx) => (
                          <div
                            key={idx}
                            className={`rounded-xl px-2 py-1.5 border text-[10px] font-bold ${
                              o.rarity === 'SSR'
                                ? 'bg-amber-400/15 border-amber-300 text-amber-200'
                                : o.rarity === 'SR'
                                ? 'bg-purple-500/15 border-purple-400/50 text-purple-200'
                                : 'bg-slate-900 border-slate-700 text-slate-300'
                            }`}
                          >
                            {o.label}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {wishPool.recentLogs.map((log, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 rounded-lg bg-slate-900 border border-slate-700 text-[10px] text-slate-200"
                          >
                            {log}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        {/* SECTION 0: MONTHLY PRIVILEGE CARDS & TOP-UP EVOLUTION */}
        {storeSection === 'privilege' && (
          <section className="space-y-4">
            <div className="cel-panel-ornate rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 items-stretch">
              <div className="md:col-span-5 relative min-h-[155px] bg-[#0b1229]">
                {!privilegeImgFailed ? (
                  <img
                    src={royalPrivilegeArt || privilegeVaultArt}
                    alt="Siêu Thị Đặc Quyền Hoàng Gia"
                    referrerPolicy="no-referrer"
                    onError={() => setPrivilegeImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-amber-500/25 to-rose-500/25 flex items-center justify-center">
                    <Crown className="w-10 h-10 text-amber-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-transparent via-transparent to-[#090d1f]" />
                <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono-nums text-[10px] font-black shadow">
                  SIÊU THỊ ĐẶC QUYỀN
                </span>
              </div>

              <div className="md:col-span-7 p-4 flex flex-col justify-between gap-2.5">
                <div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                    Siêu Thị Thẻ Đặc Quyền 30 Ngày &amp; Nạp Tiến Hóa
                  </span>
                  <h3 className="font-display text-base sm:text-lg font-black text-white mt-0.5">
                    Hoàn Trả Ngọc Hồn Hằng Ngày + Tích Điểm Nhận Cánh Phượng Hoàng!
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Mỗi lần mua Thẻ Tháng, Gói Nạp, VIP hoặc Battle Pass đều cộng Điểm Nạp Tiến Hóa để mở khóa Trang Bị [S], Khung VIP &amp; Cánh 3D.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-amber-400/20">
                  <span className="font-mono-nums text-xs font-black text-amber-200">
                    Điểm Tích Lũy Hiện Tại: {tu.points} / 600 Điểm
                  </span>
                  <div className="w-full sm:w-52 h-2 rounded-full bg-slate-950 border border-amber-400/30 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"
                      style={{ width: `${Math.min(100, Math.round((tu.points / 600) * 100))}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Royal Privilege Tier Comparison Matrix (3 Flagship Passes) */}
            <div className="cel-panel rounded-2xl p-3.5 sm:p-4">
              <div className="text-xs font-display font-black text-amber-200 mb-2.5">
                So Sánh 3 Thẻ Đặc Quyền Siêu Thị Hoàng Đạo
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
                <div className="rounded-xl bg-[#070b1a] border border-sky-400/35 p-3">
                  <div className="font-black text-sky-300">Thẻ Tháng Bạc / Hoàng Gia</div>
                  <div className="text-slate-300 mt-1">+25~55 Ngọc/ngày · +15% ATK · +1 lượt Thủ Pha Lê</div>
                </div>
                <div className="rounded-xl bg-[#190a1b] border border-purple-400/55 p-3">
                  <div className="font-black text-purple-300">Thẻ Đặc Quyền Cuối Tuần</div>
                  <div className="text-slate-200 mt-1">+45 Ngọc/ngày · +4 Lõi Thần Sủng · +20 Đèn Lồng</div>
                </div>
                <div className="rounded-xl bg-gradient-to-br from-[#2b1708] to-[#1f0d2b] border border-yellow-300/80 p-3">
                  <div className="font-black text-yellow-200">Thẻ Tháng Chí Tôn 30d (x12)</div>
                  <div className="text-amber-100 mt-1">+{SUPREME_MONTHLY_CONFIG.dailyGems} Ngọc + {SUPREME_MONTHLY_CONFIG.dailyReforgeStones} Đá Đúc/ngày · +10% ATK &amp; +30% Vàng</div>
                </div>
              </div>
            </div>

            {/* Flagship Card: Supreme Monthly Pass (30 Days) */}
            <div className="cel-panel-ornate rounded-2xl p-4 sm:p-5 border-2 border-yellow-300/75 bg-gradient-to-r from-[#241309]/95 via-[#18102b]/95 to-[#0b132b]/95 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-gradient-to-r from-amber-400 to-rose-400 text-slate-950 text-[10px] font-black">
                    {SUPREME_MONTHLY_CONFIG.badge}
                  </span>
                  <span className="font-mono-nums text-[11px] font-black text-emerald-300">
                    {supremeActive
                      ? `Đang Hiệu Lực · Còn ${supremePass.daysRemaining} Ngày`
                      : 'Hoàn Lại Ngay 150 Ngọc Khi Kích Hoạt!'}
                  </span>
                </div>
                <h4 className="font-display text-base sm:text-lg font-black text-yellow-200">
                  {SUPREME_MONTHLY_CONFIG.title}
                </h4>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-200 font-semibold">
                  <span>✓ Nhận ngay: +{SUPREME_MONTHLY_CONFIG.instantGems} Ngọc · +{SUPREME_MONTHLY_CONFIG.instantMythicShards} Mảnh Thần Binh · +{SUPREME_MONTHLY_CONFIG.instantReforgeStones} Đá Đúc</span>
                  <span>✓ Mỗi ngày (30d): +{SUPREME_MONTHLY_CONFIG.dailyGems} Ngọc · +{SUPREME_MONTHLY_CONFIG.dailyReforgeStones} Đá Đúc · +{SUPREME_MONTHLY_CONFIG.dailyWarCrests} Huy Hiệu</span>
                  <span>✓ Nội tại: +10% Công Kích · +30% Vàng · +1 lượt Hầm Mỏ Pha Lê 3D</span>
                </div>
              </div>

              <div className="flex flex-wrap md:flex-col gap-2 shrink-0 min-w-[205px]">
                {supremeActive && (
                  <button
                    type="button"
                    disabled={!supremeCanClaim}
                    onClick={() => {
                      soundEngine.playVictory();
                      onClaimSupremeMonthlyDaily?.();
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-black whitespace-nowrap ${
                      supremeCanClaim
                        ? 'a2-emerald-btn cursor-pointer'
                        : 'bg-slate-900 border border-slate-700 text-slate-400 cursor-default'
                    }`}
                  >
                    {supremeCanClaim ? 'Nhận Quà Chí Tôn Hôm Nay' : 'Đã Nhận Quà Hôm Nay'}
                  </button>
                )}

                <button
                  type="button"
                  disabled={save.gems < SUPREME_MONTHLY_CONFIG.costGems}
                  onClick={() => {
                    if (onOpenBundlePreview) {
                      onOpenBundlePreview(
                        {
                          id: 'supreme_monthly_30d',
                          title: SUPREME_MONTHLY_CONFIG.title,
                          badge: SUPREME_MONTHLY_CONFIG.badge,
                          subtitle: 'Kích hoạt 30 ngày Đặc Quyền Chí Tôn + hoàn lại ngay 150 Ngọc Hồn & Buff +10% ATK.',
                          priceLabel: `${SUPREME_MONTHLY_CONFIG.costGems} Ngọc`,
                          originalPriceLabel: `${SUPREME_MONTHLY_CONFIG.originalGems} Ngọc`,
                          valueTag: 'GIÁ TRỊ X12',
                          canAfford: save.gems >= SUPREME_MONTHLY_CONFIG.costGems,
                          confirmLabel: supremeActive
                            ? `Gia Hạn +30d · ${SUPREME_MONTHLY_CONFIG.costGems} Ngọc`
                            : `Kích Hoạt Ngay · ${SUPREME_MONTHLY_CONFIG.costGems} Ngọc`,
                          onConfirm: () => {
                            soundEngine.playVictory();
                            onActivateSupremeMonthly?.();
                          },
                          items: [
                            { label: 'Ngọc Hồn Nhận Ngay', quantity: `+${SUPREME_MONTHLY_CONFIG.instantGems}`, rarity: 'mythic' },
                            { label: 'Mảnh Thần Binh 3D', quantity: `+${SUPREME_MONTHLY_CONFIG.instantMythicShards}`, rarity: 'legendary' },
                            { label: 'Đá Đúc Hoàng Kim', quantity: `+${SUPREME_MONTHLY_CONFIG.instantReforgeStones}`, rarity: 'epic' },
                            { label: 'Quà Hằng Ngày (30 Ngày)', quantity: `+${SUPREME_MONTHLY_CONFIG.dailyGems}💎 / +${SUPREME_MONTHLY_CONFIG.dailyReforgeStones}🔥 / +${SUPREME_MONTHLY_CONFIG.dailyWarCrests}⚑`, rarity: 'legendary' },
                          ],
                        },
                        () => {
                          soundEngine.playVictory();
                          onActivateSupremeMonthly?.();
                        }
                      );
                    } else {
                      soundEngine.playVictory();
                      onActivateSupremeMonthly?.();
                    }
                  }}
                  className="a2-yellow-btn w-full py-2.5 px-4 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed font-mono-nums"
                >
                  <SoulGemIcon className="w-3.5 h-3.5" />
                  <span>
                    {supremeActive
                      ? `Gia Hạn +30d · ${SUPREME_MONTHLY_CONFIG.costGems} Ngọc`
                      : `Kích Hoạt · ${SUPREME_MONTHLY_CONFIG.costGems} Ngọc`}
                  </span>
                </button>
              </div>
            </div>

            {/* Dual Monthly Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {MONTHLY_CARDS.map((card) => {
                const progress = card.tier === 'silver_astral' ? mp.silver : mp.royal;
                const active = isMonthlyCardActive(progress, today);
                const canClaim = canClaimMonthlyCardDaily(progress, today);

                return (
                  <div
                    key={card.tier}
                    className={`rounded-2xl p-4 flex flex-col justify-between gap-3 ${
                      card.tier === 'royal_zodiac' ? 'cel-panel-ornate' : 'cel-panel'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="px-2 py-0.5 rounded bg-amber-400/20 border border-amber-300/60 text-[10px] font-black text-amber-300">
                          {card.badge}
                        </span>
                        <span className="font-mono-nums text-[10px] font-black text-emerald-300">
                          {active ? `Hiệu lực đến ${progress.activeUntilDate}` : 'Chưa kích hoạt'}
                        </span>
                      </div>
                      <h4 className="font-display text-base font-black text-white">{card.name}</h4>
                      <p className="text-[11px] text-slate-300 mt-0.5">{card.subtitle}</p>
                      <ul className="mt-2.5 space-y-1 text-[11px] text-slate-200">
                        {card.perks.map((p, idx) => (
                          <li key={idx} className="flex items-start gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{p}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {active && (
                        <button
                          type="button"
                          disabled={!canClaim}
                          onClick={() => {
                            soundEngine.playVictory();
                            onClaimMonthlyCardDaily?.(card.tier);
                          }}
                          className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer ${
                            canClaim
                              ? 'a2-emerald-btn'
                              : 'bg-slate-900 border border-slate-700 text-slate-400 cursor-default'
                          }`}
                        >
                          {canClaim ? 'Nhận Quà Hôm Nay' : 'Đã Nhận Hôm Nay'}
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={save.gems < card.gemCost}
                        onClick={() => {
                          soundEngine.playVictory();
                          onBuyMonthlyCard?.(card.tier);
                        }}
                        className="a2-purple-btn flex-1 py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed font-mono-nums"
                      >
                        <SoulGemIcon className="w-3.5 h-3.5" />
                        <span>
                          {active ? `Gia Hạn +30d · ${card.gemCost}` : `Kích Hoạt · ${card.gemCost} Ngọc`}
                        </span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 6-Tier Top-Up Evolution Track */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-sm sm:text-base font-black text-amber-200">
                  Quà Tích Lũy Nạp Tiến Hóa (6 Bậc Hoàng Đạo)
                </h3>
                <span className="font-mono-nums text-xs font-bold text-slate-300">
                  {tu.points} Điểm
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {TOPUP_EVOLUTION_MILESTONES.map((ms) => {
                  const met = tu.points >= ms.pointsRequired;
                  const claimed = tu.claimedTierIds.includes(ms.id);

                  return (
                    <div
                      key={ms.id}
                      className={`rounded-2xl border p-3.5 flex flex-col justify-between gap-2.5 ${
                        claimed
                          ? 'bg-[#071512]/90 border-emerald-400/40'
                          : met
                          ? 'bg-amber-400/10 border-amber-300/80'
                          : 'bg-[#070b1a]/95 border-slate-800'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-black text-amber-300">
                            {ms.tierLabel}
                          </span>
                          <span className="font-mono-nums text-[10px] font-bold text-slate-300">
                            {Math.min(tu.points, ms.pointsRequired)}/{ms.pointsRequired} Điểm
                          </span>
                        </div>
                        <h4 className="font-display text-sm font-black text-white">{ms.title}</h4>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {ms.rewards.map((rw, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-lg bg-[#050814] border border-sky-400/30 text-[10px] font-bold text-sky-200"
                            >
                              {rw.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!met || claimed}
                        onClick={() => {
                          soundEngine.playVictory();
                          onClaimTopUpEvolutionTier?.(ms.id);
                        }}
                        className={`w-full py-2 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer disabled:cursor-not-allowed ${
                          claimed
                            ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                            : met
                            ? 'a2-yellow-btn'
                            : 'bg-slate-900 border border-slate-800 text-slate-500'
                        }`}
                      >
                        {claimed ? 'Đã Nhận Thưởng' : met ? 'Nhận Quà Tiến Hóa' : `Cần ${ms.pointsRequired} Điểm`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* SECTION 1: GROWTH FUND + VIP PASS + COMMERCIAL VALUE PACKS */}
        {storeSection === 'packs' && (
          <section className="space-y-4">
            {/* Growth Fund Hero Card */}
            <div className="cel-panel-ornate rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 items-stretch">
              <div className="md:col-span-5 relative min-h-[155px] bg-[#0b1229]">
                {!growthImgFailed ? (
                  <img
                    src={growthFundVaultArt}
                    alt="Quỹ Đầu Tư Trưởng Thành"
                    referrerPolicy="no-referrer"
                    onError={() => setGrowthImgFailed(true)}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-amber-500/25 to-purple-500/25 flex items-center justify-center">
                    <Crown className="w-10 h-10 text-amber-300" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-transparent via-transparent to-[#090d1f]" />
                <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-mono-nums text-[10px] font-black shadow">
                  HOÀN TRẢ 800%
                </span>
              </div>

              <div className="md:col-span-7 p-4 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                      Quỹ Đầu Tư Trưởng Thành Hoàng Đạo
                    </span>
                    <span className="font-mono-nums text-[11px] font-bold text-emerald-300">
                      Chương {save.highestChapterCleared} · {powerRating.toLocaleString('vi-VN')} LC
                    </span>
                  </div>
                  <h3 className="font-display text-base sm:text-lg font-black text-white">
                    Hoàn Trả Tới 560 Ngọc Hồn + Trang Bị [S] &amp; Bảo Thạch III
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Mọi người chơi đều nhận nhánh Miễn Phí. Mở khóa Quỹ Cao Cấp chỉ với{' '}
                    <strong className="text-purple-300 font-mono-nums">
                      {GROWTH_FUND_PREMIUM_GEM_COST} Ngọc Hồn
                    </strong>{' '}
                    để nhận gấp 8 lần giá trị qua 8 cột mốc!
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {!gf.premiumUnlocked ? (
                    <button
                      type="button"
                      disabled={save.gems < GROWTH_FUND_PREMIUM_GEM_COST}
                      onClick={() => {
                        soundEngine.playVictory();
                        onUnlockGrowthFundPremium();
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        save.gems >= GROWTH_FUND_PREMIUM_GEM_COST
                          ? 'a2-purple-btn'
                          : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <SoulGemIcon className="w-3.5 h-3.5" />
                      <span className="font-mono-nums">
                        Mở Quỹ Cao Cấp · {GROWTH_FUND_PREMIUM_GEM_COST} Ngọc
                      </span>
                    </button>
                  ) : (
                    <span className="px-3 py-2 rounded-xl bg-emerald-950/70 border border-emerald-500/45 text-xs font-black text-emerald-300 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      <span>Đã Kích Hoạt Quỹ Cao Cấp</span>
                    </span>
                  )}

                  {claimableGfCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playVictory();
                        onClaimAllGrowthFund();
                      }}
                      className="a2-yellow-btn px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer font-mono-nums"
                    >
                      Nhận Tất Cả ({claimableGfCount})
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      onOpenVipModal();
                    }}
                    className="a2-slate-btn px-3.5 py-2 rounded-xl text-xs font-black text-amber-200 flex items-center gap-1.5 whitespace-nowrap cursor-pointer border border-amber-400/35 ml-auto"
                  >
                    <Crown className="w-3.5 h-3.5 text-amber-300" />
                    <span>{hasVip ? 'Thẻ Tháng VIP (Đang Bật)' : 'Đặc Quyền VIP'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Growth Fund 8-Milestone Track */}
            <div className="space-y-2">
              {GROWTH_FUND_MILESTONES.map((ms) => {
                const met = isGrowthFundMilestoneMet(ms, save, powerRating);
                const freeClaimed = gf.claimedFreeIds.includes(ms.id);
                const premClaimed = gf.claimedPremiumIds.includes(ms.id);
                const freeReady = met && !freeClaimed;
                const premReady = met && gf.premiumUnlocked && !premClaimed;

                return (
                  <div
                    key={ms.id}
                    className={`rounded-2xl p-3 border flex flex-wrap items-center justify-between gap-3 ${
                      met
                        ? 'bg-[#0a132b]/95 border-amber-400/35'
                        : 'bg-[#070b18]/90 border-slate-800'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                            met
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {met ? 'ĐẠT MỐC' : 'CHƯA ĐẠT'}
                        </span>
                        <span className="font-display text-xs sm:text-sm font-black text-white">
                          {ms.title}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Free Tier */}
                      <button
                        type="button"
                        disabled={!freeReady}
                        onClick={() => onClaimGrowthFundReward(ms.id, 'free')}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                          freeClaimed
                            ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 cursor-default'
                            : freeReady
                            ? 'a2-emerald-btn'
                            : 'bg-slate-900 border border-slate-700 text-slate-400 cursor-not-allowed'
                        }`}
                      >
                        {freeClaimed && <Check className="w-3 h-3" />}
                        <span>Miễn Phí: {ms.freeReward.label}</span>
                      </button>

                      {/* Premium Tier */}
                      <button
                        type="button"
                        disabled={!premReady}
                        onClick={() => onClaimGrowthFundReward(ms.id, 'premium')}
                        className={`px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                          premClaimed
                            ? 'bg-purple-950/60 border border-purple-500/40 text-purple-300 cursor-default'
                            : premReady
                            ? 'a2-yellow-btn'
                            : 'bg-[#0d1124] border border-purple-400/30 text-purple-200/70 cursor-not-allowed'
                        }`}
                      >
                        {premClaimed ? (
                          <Check className="w-3 h-3" />
                        ) : !gf.premiumUnlocked ? (
                          <Lock className="w-3 h-3" />
                        ) : null}
                        <span>Cao Cấp: {ms.premiumReward.label}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Commercial Value Packs */}
            <div className="pt-2 border-t border-amber-400/20 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-display text-sm sm:text-base font-black text-amber-200">
                  Gói Thương Mại &amp; Rương Đặc Quyền
                </h3>
                <span className="text-[11px] text-slate-400">
                  Mọi giao dịch Ngọc Hồn đều được cộng vào Tích Lũy Tiêu Ngọc Chợ Đêm
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {COMMERCIAL_VALUE_PACKS.map((pack) => {
                  const claimed = packClaims[pack.id] ?? 0;
                  const soldOut = claimed >= pack.maxClaims;
                  const canAfford =
                    !soldOut &&
                    (pack.currency === 'gold' ? save.gold >= pack.cost : save.gems >= pack.cost);

                  return (
                    <div
                      key={pack.id}
                      className="cel-panel-ornate rounded-2xl p-4 flex flex-col justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="px-2 py-0.5 rounded bg-amber-400/20 border border-amber-300/60 text-[10px] font-black text-amber-300">
                            {pack.badge}
                          </span>
                          <span className="font-mono-nums text-[10px] font-bold text-slate-300">
                            Đã mua: {claimed}/{pack.maxClaims}
                          </span>
                        </div>
                        <h4 className="font-display text-sm sm:text-base font-black text-white">
                          {pack.title}
                        </h4>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                          {pack.subtitle}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {pack.rewards.map((rw, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-0.5 rounded-lg bg-[#070b1a] border border-sky-400/30 text-[10px] font-mono-nums font-bold text-sky-200"
                            >
                              {rw.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => {
                          soundEngine.playVictory();
                          onBuyCommercialPack(pack);
                        }}
                        className={`w-full py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                          soldOut
                            ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 cursor-default'
                            : canAfford
                            ? 'a2-purple-btn'
                            : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {soldOut ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Đã Mua Tối Đa</span>
                          </>
                        ) : (
                          <>
                            <span>Sở Hữu ·</span>
                            <span className="font-mono-nums">{pack.cost}</span>
                            {pack.currency === 'gold' ? (
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
            </div>
          </section>
        )}

        {/* SECTION 2: ARENA COIN SHOP */}
        {storeSection === 'arena_shop' && (
          <section className="space-y-3">
            <div className="cel-panel-ornate rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-rose-300">
                  Cửa Hàng Vinh Quang Đấu Trường
                </div>
                <h3 className="font-display text-base sm:text-lg font-black text-white mt-0.5">
                  Đổi Xu Arena Lấy Thánh Vật [S] &amp; Bảo Thạch III
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Tham gia Đấu Trường Arena 1v1 mỗi ngày để tích lũy Xu Arena. Giới hạn làm mới hằng ngày.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="px-3.5 py-2 rounded-xl bg-[#070b1a] border border-sky-400/40 text-xs font-mono-nums font-black text-sky-200">
                  Xu Arena: <span className="text-amber-300">{arena.arenaCoins}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    soundEngine.playUiClick();
                    onOpenArenaModal();
                  }}
                  className="a2-yellow-btn px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap cursor-pointer"
                >
                  Vào Đấu Trường
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {ARENA_SHOP_OFFERS.map((offer) => {
                const bought = arenaShop.purchasedCounts[offer.id] ?? 0;
                const soldOut = bought >= offer.dailyLimit;
                const canAfford = !soldOut && arena.arenaCoins >= offer.coinCost;

                return (
                  <div
                    key={offer.id}
                    className={`rounded-2xl p-4 flex flex-col justify-between gap-3 ${
                      offer.rewardKind === 'gear_s' || offer.rewardKind === 'socket_gem_t3'
                        ? 'cel-panel-ornate'
                        : 'cel-panel'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-black tracking-wider text-amber-300">
                          {offer.badge}
                        </span>
                        <span className="font-mono-nums text-[10px] font-bold text-slate-300">
                          Hôm nay: {bought}/{offer.dailyLimit}
                        </span>
                      </div>
                      <h4 className="font-display text-sm font-black text-white">
                        {offer.title}
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                        {offer.subtitle}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={!canAfford}
                      onClick={() => {
                        soundEngine.playVictory();
                        onBuyArenaShopOffer(offer);
                      }}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        soldOut
                          ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 cursor-default'
                          : canAfford
                          ? 'a2-emerald-btn'
                          : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {soldOut ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Hết Lượt Hôm Nay</span>
                        </>
                      ) : (
                        <span className="font-mono-nums">Đổi · {offer.coinCost} Xu Arena</span>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* SECTION 2.5: MYSTIC MERCHANT EXCHANGE (WAVE 9) */}
        {storeSection === 'mystic_exchange' && (() => {
          const mx = normalizeMysticExchange(save.mysticExchange);
          const getBalance = (kind: MysticCurrencyKind) => {
            if (kind === 'starDust') return save.starDust ?? 0;
            if (kind === 'petEssence') return save.petEssence ?? 0;
            if (kind === 'wingFeathers') return save.wingFeathers ?? 0;
            if (kind === 'mountShards') return save.mountShards ?? 0;
            if (kind === 'awakeningCrystals') return save.awakeningCrystals ?? 0;
            return mx.mysticTokens;
          };

          return (
            <section className="space-y-4">
              <div className="cel-panel-ornate rounded-2xl overflow-hidden grid grid-cols-1 md:grid-cols-12 items-stretch">
                <div className="md:col-span-5 relative min-h-[150px] bg-[#0b1229]">
                  {!mysticImgFailed ? (
                    <img
                      src={mysticMerchantArt}
                      alt="Chợ Đổi Mảnh Dư Thương Nhân Thần Bí"
                      referrerPolicy="no-referrer"
                      onError={() => setMysticImgFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-cyan-500/25 to-purple-500/25 flex items-center justify-center">
                      <MysticTokenIcon className="w-10 h-10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-transparent via-transparent to-[#090d1f]" />
                  <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-cyan-400 text-slate-950 font-mono-nums text-[10px] font-black shadow">
                    THƯƠNG NHÂN TUẦN · {mx.weekKey}
                  </span>
                </div>

                <div className="md:col-span-7 p-4 flex flex-col justify-between gap-2.5">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-300">
                      Chợ Đổi Mảnh Dư &amp; Kho Báu Thương Nhân Thần Bí
                    </span>
                    <h3 className="font-display text-base sm:text-lg font-black text-white mt-0.5">
                      Thanh Lý Nguyên Liệu Dư → Ấn Thần Bí, Mảnh Thánh Khí &amp; Đồ [S]
                    </h3>
                    <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                      Tái chế Bụi Tinh Tú, Tinh Chất Pet và Lông Vũ dư thừa để đổi Ấn Thần Bí, Ngọc Hồn, Mảnh Thánh Khí và Thánh Vật [S] giới hạn mỗi tuần.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-cyan-400/20 text-xs font-mono-nums font-black">
                    <span className="px-2.5 py-1 rounded-lg bg-[#070b1a] border border-cyan-400/40 text-cyan-200 flex items-center gap-1">
                      <MysticTokenIcon className="w-3.5 h-3.5" /> {mx.mysticTokens} Ấn Thần Bí
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#070b1a] border border-amber-400/40 text-amber-200 flex items-center gap-1">
                      <ArtifactRelicIcon className="w-3.5 h-3.5" /> {mx.artifactShards} Mảnh Thánh Khí
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-[#070b1a] border border-sky-400/30 text-sky-200 flex items-center gap-1">
                      <StarDustIcon className="w-3.5 h-3.5" /> {save.starDust ?? 0} Bụi
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {MYSTIC_EXCHANGE_OFFERS.map((offer) => {
                  const used = mx.weeklyClaims[offer.id] ?? 0;
                  const soldOut = used >= offer.weeklyLimit;
                  const bal = getBalance(offer.inputKind);
                  const canAfford = !soldOut && bal >= offer.inputAmount;

                  return (
                    <div
                      key={offer.id}
                      className={`rounded-2xl p-4 flex flex-col justify-between gap-3 ${
                        offer.outputKind === 's_gear' || offer.outputKind === 'artifactShards'
                          ? 'cel-panel-ornate'
                          : 'cel-panel'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[10px] font-black tracking-wider text-cyan-300">
                            {offer.badge}
                          </span>
                          <span className="font-mono-nums text-[10px] font-bold text-slate-300">
                            Tuần: {used}/{offer.weeklyLimit}
                          </span>
                        </div>
                        <h4 className="font-display text-sm font-black text-white">
                          {offer.title}
                        </h4>
                        <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                          {offer.desc}
                        </p>
                        <div className="mt-2.5 flex items-center justify-between text-[11px] font-mono-nums font-bold bg-[#070b1a] border border-slate-800 rounded-xl px-2.5 py-1.5">
                          <span className={bal >= offer.inputAmount ? 'text-slate-200' : 'text-rose-400'}>
                            Có: {bal}/{offer.inputAmount} {MYSTIC_CURRENCY_LABELS[offer.inputKind]}
                          </span>
                          <span className="text-emerald-300">
                            +{offer.outputAmount}{' '}
                            {offer.outputKind === 'mysticTokens'
                              ? 'Ấn'
                              : offer.outputKind === 'artifactShards'
                              ? 'Mảnh TK'
                              : offer.outputKind === 'gems'
                              ? 'Ngọc'
                              : 'Đồ [S]'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        disabled={!canAfford}
                        onClick={() => {
                          soundEngine.playVictory();
                          onMysticExchange?.(offer.id);
                        }}
                        className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                          soldOut
                            ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 cursor-default'
                            : canAfford
                            ? 'a2-emerald-btn'
                            : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {soldOut ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Hết Lượt Tuần</span>
                          </>
                        ) : (
                          <span className="font-mono-nums">
                            Đổi · {offer.inputAmount} {MYSTIC_CURRENCY_LABELS[offer.inputKind]}
                          </span>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* SECTION 3: DAILY FLASH SALE + WEEKEND GOLDEN PRIVILEGE TREASURY */}
        {storeSection === 'deals' && (
          <section className="space-y-4">
            {/* Weekend Golden Privilege Treasury Showcase */}
            <div className="cel-panel-ornate rounded-2xl overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-12 items-stretch border-b border-amber-400/20">
                <div className="md:col-span-5 relative min-h-[145px] bg-[#0b1229]">
                  {!weekendBannerFailed ? (
                    <img
                      src={weekendGoldenTreasuryArt}
                      alt="Kho Báu Đặc Quyền Cuối Tuần"
                      referrerPolicy="no-referrer"
                      onError={() => setWeekendBannerFailed(true)}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-amber-500/25 via-[#131d44] to-purple-500/25 flex items-center justify-center">
                      <Crown className="w-10 h-10 text-amber-300" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t md:bg-gradient-to-r from-transparent via-transparent to-[#090d1f]" />
                  <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-[#070b1a]/90 border border-amber-300/60 text-[10px] font-black text-amber-200 flex items-center gap-1.5 font-mono-nums">
                    <Clock className="w-3.5 h-3.5 text-amber-300" />
                    <span>Làm mới: {formatCountdownHMS(flashCountdownSec)}</span>
                  </div>
                </div>

                <div className="md:col-span-7 p-4 flex flex-col justify-between gap-2.5">
                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5" />
                        <span>ĐẶC QUYỀN CUỐI TUẦN HOÀNG KIM</span>
                      </span>
                      <span className="text-[11px] font-mono-nums font-bold text-emerald-300">
                        {weekendPassActive
                          ? `Thẻ Đang Chạy · Còn ${weekendPriv.daysRemaining} ngày`
                          : 'Chưa Kích Hoạt Thẻ 3 Ngày'}
                      </span>
                    </div>
                    <h3 className="font-display text-base sm:text-lg font-black text-white mt-0.5">
                      Kho Báu Đặc Quyền &amp; Lõi Tiến Hóa Thần Sủng
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed mt-0.5">
                      Săn Lõi Thần Sủng 3D, Đèn Tinh Giới Lễ Hội và kích hoạt Thẻ Cuối Tuần 3 Ngày nhận +45 Ngọc, +4 Lõi Sủng &amp; +300 Vàng mỗi ngày!
                    </p>
                  </div>

                  {weekendPassActive && (
                    <div className="rounded-xl bg-[#070b1a] border border-emerald-400/35 px-3 py-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="text-xs text-slate-200 font-bold">
                        Quà Hằng Ngày Thẻ Cuối Tuần: <span className="text-purple-300 font-mono-nums">+45 Ngọc</span> · <span className="text-amber-300 font-mono-nums">+4 Lõi Sủng</span> · <span className="text-emerald-300 font-mono-nums">+300 Vàng</span>
                      </div>
                      <button
                        type="button"
                        disabled={!weekendPassDailyReady}
                        onClick={() => {
                          soundEngine.playVictory();
                          onClaimWeekendPassDaily?.();
                        }}
                        className={`px-3 py-1.5 rounded-lg text-xs font-black whitespace-nowrap cursor-pointer ${
                          weekendPassDailyReady
                            ? 'a2-emerald-btn'
                            : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        {weekendPassDailyReady ? 'Nhận Quà Hôm Nay' : 'Đã Nhận Hôm Nay'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3">
                {WEEKEND_PRIVILEGE_PACKS.map((pack) => {
                  const claimed = weekendPriv.purchasedPackIds.includes(pack.id);
                  const canBuy = !claimed && save.gems >= pack.costGems;
                  return (
                    <div
                      key={pack.id}
                      className={`rounded-2xl p-3.5 flex flex-col justify-between gap-3 border ${
                        pack.isBestSeller
                          ? 'bg-gradient-to-b from-amber-500/15 via-[#101938] to-[#0a1026] border-amber-300/70'
                          : 'bg-[#090f24] border-amber-400/25'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between gap-1.5 mb-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black ${
                              pack.isBestSeller
                                ? 'bg-amber-400 text-slate-950'
                                : 'bg-purple-500/25 border border-purple-400/50 text-purple-200'
                            }`}
                          >
                            {pack.badge}
                          </span>
                          <span className="text-[10px] font-mono-nums font-black text-emerald-300">
                            {pack.discountLabel} · <span className="text-slate-500 line-through">{pack.originalGems}</span>
                          </span>
                        </div>
                        <h4 className="font-display text-sm font-black text-white">
                          {pack.name}
                        </h4>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                          {pack.subtitle}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-2 text-[10px] font-mono-nums font-bold">
                          {pack.rewardSpiritCores > 0 && (
                            <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-400/40 text-amber-200">
                              +{pack.rewardSpiritCores} Lõi Sủng
                            </span>
                          )}
                          {pack.rewardLanterns > 0 && (
                            <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-400/40 text-rose-200">
                              +{pack.rewardLanterns} Đèn Lồng
                            </span>
                          )}
                          {pack.rewardWishTickets > 0 && (
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 border border-purple-400/40 text-purple-200">
                              +{pack.rewardWishTickets} Vé Ước
                            </span>
                          )}
                          {pack.rewardGems > 0 && (
                            <span className="px-2 py-0.5 rounded bg-sky-500/15 border border-sky-400/35 text-sky-200">
                              +{pack.rewardGems} Ngọc
                            </span>
                          )}
                          <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-400/35 text-emerald-200">
                            +{pack.rewardGold} Vàng
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {onOpenBundlePreview && (
                          <button
                            type="button"
                            onClick={() => {
                              soundEngine.playUiClick();
                              const items: BundlePreviewPayload['items'] = [];
                              if (pack.activatesWeekendPass) {
                                items.push({
                                  label: 'Thẻ Cuối Tuần Hoàng Kim (3 Ngày)',
                                  quantity: '+45 Ngọc/ngày',
                                  rarity: 'mythic',
                                });
                              }
                              if (pack.rewardSGear) {
                                items.push({
                                  label: 'Trang Bị Hoàng Đạo [S] Sử Thi+',
                                  quantity: 'x1',
                                  rarity: 'mythic',
                                });
                              }
                              if (pack.rewardSpiritCores > 0) {
                                items.push({
                                  label: 'Lõi Tiến Hóa Thần Sủng 3D',
                                  quantity: `+${pack.rewardSpiritCores}`,
                                  rarity: 'legendary',
                                });
                              }
                              if (pack.rewardDivineCrystals > 0) {
                                items.push({
                                  label: 'Thần Tinh Hào Quang 3D',
                                  quantity: `+${pack.rewardDivineCrystals}`,
                                  rarity: 'epic',
                                });
                              }
                              if (pack.rewardLanterns > 0) {
                                items.push({
                                  label: 'Đèn Tinh Giới Lễ Hội',
                                  quantity: `+${pack.rewardLanterns}`,
                                  rarity: 'epic',
                                });
                              }
                              if (pack.rewardWishTickets > 0) {
                                items.push({
                                  label: 'Vé Ước Nguyện Rate-Up',
                                  quantity: `+${pack.rewardWishTickets}`,
                                  rarity: 'epic',
                                });
                              }
                              if (pack.rewardGems > 0) {
                                items.push({
                                  label: 'Ngọc Hồn Hoàn Trả Ngay',
                                  quantity: `+${pack.rewardGems}`,
                                  rarity: 'rare',
                                });
                              }
                              items.push({
                                label: 'Vàng Hoàng Gia',
                                quantity: `+${pack.rewardGold}`,
                                rarity: 'common',
                              });
                              onOpenBundlePreview(
                                {
                                  id: pack.id,
                                  title: pack.name,
                                  subtitle: pack.subtitle,
                                  badge: pack.badge,
                                  valueTag: pack.discountLabel,
                                  priceLabel: `${pack.costGems} Ngọc`,
                                  originalPriceLabel: `${pack.originalGems} Ngọc`,
                                  canAfford: canBuy,
                                  disabledReason: claimed
                                    ? 'Bạn đã sở hữu gói này trong tuần'
                                    : save.gems < pack.costGems
                                    ? 'Không đủ Ngọc Hồn'
                                    : undefined,
                                  items,
                                  confirmLabel: claimed
                                    ? 'Đã Sở Hữu Tuần Này'
                                    : `Sở Hữu Ngay · ${pack.costGems} Ngọc`,
                                  onConfirm: () => onBuyWeekendPack?.(pack.id),
                                },
                                canBuy ? () => onBuyWeekendPack?.(pack.id) : undefined
                              );
                            }}
                            className="a2-slate-btn px-2.5 py-2 rounded-xl text-[11px] font-black flex items-center gap-1 whitespace-nowrap cursor-pointer shrink-0"
                          >
                            <Eye className="w-3.5 h-3.5 text-amber-300" />
                            <span>Chi Tiết</span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={!canBuy}
                          onClick={() => {
                            soundEngine.playVictory();
                            onBuyWeekendPack?.(pack.id);
                          }}
                          className={`flex-1 py-2 px-2.5 rounded-xl text-[11px] font-black flex items-center justify-center gap-1 whitespace-nowrap cursor-pointer font-mono-nums ${
                            claimed
                              ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 cursor-default'
                              : canBuy
                              ? pack.isBestSeller
                                ? 'a2-yellow-btn'
                                : 'a2-purple-btn'
                              : 'bg-slate-900 border border-slate-700 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {claimed ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Đã Nhận</span>
                            </>
                          ) : (
                            <>
                              <SoulGemIcon className="w-3.5 h-3.5" />
                              <span>Mua · {pack.costGems}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

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
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Flash Sale Hôm Nay · {today}</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg bg-rose-500/20 border border-rose-400/50 text-rose-200 font-mono-nums text-[10px] font-black flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{formatCountdownHMS(flashCountdownSec)}</span>
                    </span>
                    <span className="font-mono-nums text-[11px] font-bold text-emerald-300">
                      {flashState.purchasedIds.length}/{dailyDeals.length} đã nhận
                    </span>
                  </div>
                </div>
                <h3 className="font-display text-base sm:text-lg font-black text-white">
                  Chợ Tinh Giới &amp; Quà Tiếp Tế Miễn Phí
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Mỗi ngày có 1 gói Quà Vàng miễn phí 0đ và 3 vật phẩm tinh hoa giảm tới 45% giúp nâng lực chiến thần tốc.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {dailyDeals.map((deal) => {
                const isBought = flashState.purchasedIds.includes(deal.id);
                const dealLockReason = !flashDealsUnlock.unlocked
                  ? flashDealsUnlock.requiredLabel
                  : deal.rewardKind === 'gear_s' && !earlyPolicy.allowSTier
                  ? 'Mở khi vào Chương 3'
                  : (deal.rewardKind === 'gear_epic' || deal.rewardKind === 'rune_epic') &&
                    !epicPoolOpen
                  ? 'Mở sau khi vượt Chương 1'
                  : null;
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
                            deal.currency === 'free' ? 'text-emerald-300' : 'text-amber-300'
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
                      disabled={isBought || Boolean(dealLockReason) || !canAfford}
                      onClick={() => onBuyFlashDeal(deal)}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                        isBought
                          ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 cursor-default'
                          : dealLockReason || !canAfford
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
                      ) : dealLockReason ? (
                        <>
                          <Lock className="w-3.5 h-3.5 text-amber-400/70" />
                          <span className="truncate">{dealLockReason}</span>
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

        {/* SECTION 4: TREASURE CHEST GACHA */}
        {storeSection === 'gacha' && (
          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div>
                <div className="text-sm font-display font-black text-amber-200">
                  Triệu Hồi Rương Tinh Giới (×10 Giảm 10%)
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  {earlyPolicy.stageLabel} · Bộ đếm Pity luôn được bảo toàn khi pool Sử Thi / [S] chưa mở
                </div>
              </div>
              <div className="cel-panel rounded-xl px-3.5 py-1.5 flex flex-wrap items-center gap-3 text-[11px] font-mono-nums">
                <div>
                  <span className="text-slate-400">Bảo hiểm Sử Thi+: </span>
                  <span className="font-black text-purple-300">
                    {epicPoolOpen
                      ? `còn ${rollsUntilEpic}`
                      : `tích ${pity.mythicRollsSinceEpic}/10 (mở sau Ch.1)`}
                  </span>
                </div>
                <span aria-hidden="true" className="text-amber-400/40">|</span>
                <div>
                  <span className="text-slate-400">Bảo hiểm [S]-Tier: </span>
                  <span className="font-black text-amber-300">
                    {earlyPolicy.allowSTier
                      ? `còn ${rollsUntilSTier}`
                      : `tích ${pity.mythicRollsSinceSTier}/25 (mở ở Ch.3)`}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {chests.map((c) => {
                const unlockState =
                  c.variant === 'iron'
                    ? ironChestUnlock
                    : c.variant === 'mythic'
                    ? mythicChestUnlock
                    : runesUnlock;
                const balance = c.currency === 'gold' ? save.gold : save.gems;
                const can1 = unlockState.unlocked && balance >= c.cost1;
                const can10 = unlockState.unlocked && balance >= c.cost10;
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
                          {!unlockState.unlocked && (
                            <p className="text-[11px] font-bold text-amber-300 mt-1 flex items-center gap-1">
                              <Lock className="w-3 h-3 shrink-0" />
                              <span>{unlockState.requiredLabel}</span>
                            </p>
                          )}
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
                        {!unlockState.unlocked ? (
                          <>
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>Chưa Mở</span>
                          </>
                        ) : (
                          <>
                            <span>Mở ×1 ·</span>
                            <span className="font-mono-nums">{c.cost1}</span>
                            <CurrencyIcon className="w-3.5 h-3.5" />
                          </>
                        )}
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
                        {!unlockState.unlocked ? (
                          <>
                            <Lock className="w-3.5 h-3.5 shrink-0" />
                            <span>Chưa Mở</span>
                          </>
                        ) : (
                          <>
                            <span>Mở ×10 ·</span>
                            <span className="font-mono-nums">{c.cost10}</span>
                            <CurrencyIcon className="w-3.5 h-3.5" />
                          </>
                        )}
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



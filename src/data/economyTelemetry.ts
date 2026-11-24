import { CHAPTERS } from './chaptersData';
import {
  applyEarlyRunMilestones,
  claimMailsUnified,
  getEarlyProgressionPolicy,
  isEarlyFeatureUnlocked,
  RARITY_RANK,
} from './earlyProgressionData';
import {
  computeAutoOptimizeEquipment,
  computePlayerStats,
  createInitialSaveData,
  GEAR_TEMPLATES,
  getUpgradeCost,
  RARITY_META,
  RARITY_ORDER,
  rollProgressionGatedGear,
  salvageExcessGearToForgeShards,
  transferGearUpgradeLevel,
} from './gearData';
import {
  computePowerPressure,
  getTowerRecommendedPower,
  type PowerPressureTier,
} from './fairProgression30Day';
import { getTalentLevel, getTalentUpgradeCost, TALENTS } from './talentsData';
import { grantChapter2Collection } from './chapter2Collection';
import { grantChapter3Collection } from './chapter3Collection';
import { grantChapter4Collection } from './chapter4Collection';
import { normalizeBlessingAltar, normalizeMythicWeapon } from './wave12Data';
import { normalizeSoulRings } from './wave13Data';
import { normalizeGuildSanctuary, normalizeZodiacRelics } from './wave14Data';
import { createSeededRng } from '../engine/fixedTimestep';
import {
  GearSlot,
  Rarity,
  type ConstellationId,
  type GearInstance,
  type RuneId,
  type SaveData,
} from '../types/game';

export type PlaytimeMilestoneId = '5m' | '15m' | '30m' | '1h' | '3h' | '10h' | '30h' | '100h';

export interface PlaytimeMilestoneTarget {
  id: PlaytimeMilestoneId;
  elapsedMinutes: number;
  label: string;
  phaseLabel: string;
}

export const PLAYTIME_MILESTONES: readonly PlaytimeMilestoneTarget[] = [
  { id: '5m', elapsedMinutes: 5, label: '5 phút', phaseLabel: 'FTUE / Mở đầu Ch.1' },
  { id: '15m', elapsedMinutes: 15, label: '15 phút', phaseLabel: 'Early Game · Ch.1' },
  { id: '30m', elapsedMinutes: 30, label: '30 phút', phaseLabel: 'Early Game · Boss Ch.1' },
  { id: '1h', elapsedMinutes: 60, label: '1 giờ', phaseLabel: 'Early-Mid · Ch.1-2' },
  { id: '3h', elapsedMinutes: 180, label: '3 giờ', phaseLabel: 'Mid Game · Ch.2-4' },
  { id: '10h', elapsedMinutes: 600, label: '10 giờ', phaseLabel: 'Mid-Late · Ch.5-7' },
  { id: '30h', elapsedMinutes: 1800, label: '30 giờ', phaseLabel: 'Late Game · Ch.8-11' },
  { id: '100h', elapsedMinutes: 6000, label: '100 giờ', phaseLabel: 'Endgame · Ch.12 & Tháp' },
] as const;

export interface PlaytimeMilestoneSnapshot {
  milestoneId: PlaytimeMilestoneId;
  elapsedMinutes: number;
  phaseLabel: string;
  goldEarnedCumulative: number;
  goldSpentCumulative: number;
  goldBalance: number;
  goldSinkRatioPct: number;
  gemsEarnedCumulative: number;
  gemsSpentCumulative: number;
  gemBalance: number;
  highestChapterCleared: number;
  targetChapterId: number;
  bestTowerFloor: number;
  playerPower: number;
  recommendedPower: number;
  powerRatio: number;
  pressureTier: PowerPressureTier;
  highestRarity: Rarity;
  highestRarityLabel: string;
  avgGearLevel: number;
  totalTalentLevels: number;
  estMobTtkSec: number;
  estBossTtkSec: number;
  estPlayerTtdSec: number;
  endgameSinkStatus: 'healthy' | 'tight' | 'surplus_risk';
  endgameSinkNote: string;
}

export interface PlaytimeEconomyReport {
  seed: number;
  simulationKind: 'deterministic_seeded_model';
  freshBaselinePower: number;
  freshBaselineGold: number;
  freshBaselineGems: number;
  milestones: PlaytimeMilestoneSnapshot[];
  warnings: string[];
}

const ALL_GEAR_SLOTS: readonly GearSlot[] = [
  GearSlot.WEAPON,
  GearSlot.ARMOR,
  GearSlot.HELMET,
  GearSlot.RING,
  GearSlot.NECKLACE,
  GearSlot.BOOTS,
];

const CONSTELLATION_KEYS: readonly ConstellationId[] = [
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'leo',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
];

function makeMergedGearInstance(
  slot: GearSlot,
  rarity: Rarity,
  preferSTier: boolean,
  uidTag: string
): GearInstance {
  const entries = Object.entries(GEAR_TEMPLATES).filter(([, t]) => t.slot === slot);
  const chosen =
    (preferSTier ? entries.find(([, t]) => t.isSTier) : entries.find(([, t]) => !t.isSTier)) ??
    entries[0];
  return {
    uid: `sim_merge_${uidTag}_${slot}`,
    templateId: chosen[0],
    rarity,
    level: 1,
    awakeningLevel: 0,
  };
}

/**
 * Estimates combat TTK (Mob / Boss) and Player TTD (Time-To-Die) from real chapter
 * scaling formulas (`hpScale`, `dmgScale`), `computePlayerStats`, and `computePowerPressure`.
 */
export function estimateCombatTimings(
  save: SaveData,
  targetChapterId: number
): {
  estMobTtkSec: number;
  estBossTtkSec: number;
  estPlayerTtdSec: number;
  powerRatio: number;
  pressureTier: PowerPressureTier;
  recommendedPower: number;
} {
  const stats = computePlayerStats(save);
  const ch = CHAPTERS.find((c) => c.id === targetChapterId) ?? CHAPTERS[0];
  const pressure = computePowerPressure(stats.powerRating, ch.recommendedPower);

  const critMult = 1 + stats.critChance * (stats.critDamage - 1);
  // Base firing cadence (~2.2 arrows/s) * attackSpeedMult * crit expectation * avg skill/synergy uptime (1.22x)
  const effectiveDps = Math.max(
    1,
    stats.attack * 2.2 * stats.attackSpeedMult * critMult * 1.22 * pressure.enemyDamageTakenMult
  );
  const bossDps = effectiveDps * (1 + (stats.bossDamageBonus ?? 0));

  // Representative mid-chapter mob HP & chapter final boss HP matching GameEngine chapter scaling
  const mobHp = Math.round(280 * ch.hpScale * 1.38);
  const bossHp = Math.round(3600 * ch.hpScale * 1.65);

  // Representative incoming boss hit DPS factoring in player DR & enemy DR pierce under Power Pressure
  const effectiveDr = Math.max(0, stats.damageReduction * (1 - pressure.enemyDrPiercePct));
  const rawEnemyHit = 26 * ch.dmgScale * pressure.enemyDamageDealtMult;
  const incomingDps = Math.max(1, rawEnemyHit * (1 - effectiveDr) * 0.85);

  const estMobTtkSec = Number(Math.max(0.2, Math.min(99.9, mobHp / effectiveDps)).toFixed(2));
  const estBossTtkSec = Number(Math.max(1.0, Math.min(240.0, bossHp / bossDps)).toFixed(1));
  const estPlayerTtdSec = Number(Math.max(0.8, Math.min(180.0, stats.maxHp / incomingDps)).toFixed(1));

  return {
    estMobTtkSec,
    estBossTtkSec,
    estPlayerTtdSec,
    powerRatio: Number(pressure.ratio.toFixed(3)),
    pressureTier: pressure.tier,
    recommendedPower: ch.recommendedPower,
  };
}

/**
 * Deterministic 8-milestone playtime economy & progression simulation
 * (`5m, 15m, 30m, 1h, 3h, 10h, 30h, 100h`) built directly on live game formulas.
 * Note: This is a reproducible seeded balance model (NOT a replacement for human playtests).
 */
export function simulatePlaytimeMilestones(seed = 20260410): PlaytimeEconomyReport {
  const rng = createSeededRng(seed);
  const originalMathRandom = Math.random;
  Math.random = () => rng();

  const warnings: string[] = [];
  const milestones: PlaytimeMilestoneSnapshot[] = [];

  try {
    let save = createInitialSaveData();
    const freshStats = computePlayerStats(save);
    const freshBaselinePower = freshStats.powerRating;
    const freshBaselineGold = save.gold;
    const freshBaselineGems = save.gems;

    let goldEarnedCumulative = save.gold;
    let goldSpentCumulative = 0;
    let gemsEarnedCumulative = save.gems;
    let gemsSpentCumulative = 0;
    let elapsedMinutes = 0;
    let simulatedDays = 1;
    let mergeSeq = 0;

    const addGold = (amount: number) => {
      const clean = Math.max(0, Math.round(amount));
      if (clean <= 0) return;
      save = { ...save, gold: save.gold + clean };
      goldEarnedCumulative += clean;
    };

    const spendGold = (amount: number): boolean => {
      const clean = Math.max(0, Math.round(amount));
      if (clean <= 0 || save.gold < clean) return false;
      save = { ...save, gold: save.gold - clean };
      goldSpentCumulative += clean;
      return true;
    };

    const addGems = (amount: number) => {
      const clean = Math.max(0, Math.round(amount));
      if (clean <= 0) return;
      save = { ...save, gems: save.gems + clean };
      gemsEarnedCumulative += clean;
    };

    const spendGems = (amount: number): boolean => {
      const clean = Math.max(0, Math.round(amount));
      if (clean <= 0 || save.gems < clean) return false;
      save = { ...save, gems: save.gems - clean };
      gemsSpentCumulative += clean;
      return true;
    };

    const syncExternalCurrencyDelta = (beforeGold: number, beforeGems: number) => {
      if (save.gold > beforeGold) {
        goldEarnedCumulative += save.gold - beforeGold;
      } else if (save.gold < beforeGold) {
        goldSpentCumulative += beforeGold - save.gold;
      }
      if (save.gems > beforeGems) {
        gemsEarnedCumulative += save.gems - beforeGems;
      } else if (save.gems < beforeGems) {
        gemsSpentCumulative += beforeGems - save.gems;
      }
    };

    const optimizeAndSpendSinks = (isNewDay: boolean) => {
      const policy = getEarlyProgressionPolicy(save);
      const maxRarityRank = RARITY_RANK[policy.maxGearRarity];

      // Auto-equip best items from inventory
      const opt = computeAutoOptimizeEquipment(save);
      if (opt.changedSlots.length > 0) {
        save = { ...save, equipped: opt.nextEquipped };
      }

      // Ensure all 6 slots have at least a starter drop once past 45m
      if (elapsedMinutes >= 45) {
        for (const slot of ALL_GEAR_SLOTS) {
          if (!save.equipped[slot]) {
            const initRarity =
              policy.maxGearRarity === Rarity.COMMON ? Rarity.COMMON : Rarity.RARE;
            const item = makeMergedGearInstance(slot, initRarity, false, `init_${++mergeSeq}`);
            save = {
              ...save,
              inventory: [...save.inventory, item],
              equipped: { ...save.equipped, [slot]: item.uid },
            };
          }
        }
      }

      // Salvage excess inventory beyond 32 items to Forge Shards & Gold
      if (save.inventory.length > 32) {
        const gBefore = save.gold;
        const mBefore = save.gems;
        const salvaged = salvageExcessGearToForgeShards(save, { includeRare: simulatedDays >= 4 });
        if (salvaged.salvagedCount > 0) {
          save = salvaged.nextSave;
          syncExternalCurrencyDelta(gBefore, mBefore);
        }
      }

      // Spend Gems on Mythic/Premium progression-gated gear chests once player saves >= 180 Gems
      while (save.gems >= 180) {
        if (!spendGems(180)) break;
        const rolled = rollProgressionGatedGear(save, true, undefined, false, rng);
        save = {
          ...save,
          inventory: [...save.inventory, rolled],
        };
        const afterChest = computeAutoOptimizeEquipment(save);
        if (afterChest.changedSlots.length > 0) {
          save = { ...save, equipped: afterChest.nextEquipped };
        }
      }

      // Fair 3-of-a-kind Gear Merge / Forge upgrade up to policy rarity ceiling (1 slot per day)
      if (isNewDay && maxRarityRank >= 1) {
        let lowestSlot: GearSlot | null = null;
        let lowestScore = 999;
        let lowestItem: GearInstance | null = null;
        for (const slot of ALL_GEAR_SLOTS) {
          const item = save.inventory.find((g) => g.uid === save.equipped[slot]);
          if (!item) continue;
          const r = RARITY_RANK[item.rarity];
          const isS = Boolean(GEAR_TEMPLATES[item.templateId]?.isSTier);
          if (r >= maxRarityRank && (!policy.allowSTier || isS)) continue;
          const score = r * 2 + (isS ? 1 : 0);
          if (score < lowestScore) {
            lowestScore = score;
            lowestSlot = slot;
            lowestItem = item;
          }
        }
        if (lowestSlot && lowestItem) {
          const curRank = RARITY_RANK[lowestItem.rarity];
          const nextRarity =
            RARITY_ORDER[Math.min(maxRarityRank, curRank < maxRarityRank ? curRank + 1 : curRank)];
          const upgraded = makeMergedGearInstance(
            lowestSlot,
            nextRarity,
            policy.allowSTier,
            `m${++mergeSeq}`
          );
          const withItem: SaveData = { ...save, inventory: [...save.inventory, upgraded] };
          const xfer =
            lowestItem.level > 1
              ? transferGearUpgradeLevel(withItem, lowestItem.uid, upgraded.uid).nextSave
              : withItem;
          save = {
            ...xfer,
            equipped: { ...xfer.equipped, [lowestSlot]: upgraded.uid },
          };
        }
      }

      // Equip progressive Runes (Ch.1 -> 1, Ch.2 -> 2, Ch.5 -> 4)
      const desiredRunes =
        save.highestChapterCleared >= 5
          ? 4
          : save.highestChapterCleared >= 2
          ? 2
          : save.highestChapterCleared >= 1
          ? 1
          : 0;
      if (desiredRunes > 0) {
        const runePool: RuneId[] = ['arrow_rain', 'rune_flame', 'rune_frost', 'giant_meteor'];
        const nextRunes = runePool.slice(0, desiredRunes).map((runeId, idx) => ({
          uid: `sim_rune_${idx}`,
          runeId,
          rarity: policy.maxRuneRarity,
        }));
        save = {
          ...save,
          runeInventory: nextRunes,
          equippedRunes: nextRunes.map((r) => r.uid),
        };
      }

      // Apply Chapter 2-4 Collection grants once cleared
      const gColl = save.gold;
      const mColl = save.gems;
      if (save.highestChapterCleared >= 2) save = grantChapter2Collection(save);
      if (save.highestChapterCleared >= 3) save = grantChapter3Collection(save);
      if (save.highestChapterCleared >= 4) save = grantChapter4Collection(save);
      syncExternalCurrencyDelta(gColl, mColl);

      // Constellations (unlocked Ch.2+)
      if (isNewDay && save.highestChapterCleared >= 2) {
        const nextConst: Partial<Record<ConstellationId, number>> = { ...(save.constellations ?? {}) };
        const key = CONSTELLATION_KEYS[(simulatedDays - 1) % CONSTELLATION_KEYS.length];
        const prevLv = nextConst[key] ?? 0;
        if (prevLv < 5 && spendGold(420 + prevLv * 380)) {
          nextConst[key] = prevLv + 1;
          save = { ...save, constellations: nextConst };
        }
      }

      // Elemental Towers / Blessing Altar / Hero Stars (Ch.4+)
      if (isNewDay && isEarlyFeatureUnlocked(save, 'elemental_towers').unlocked) {
        const curHero = save.selectedHeroId;
        const curStars = save.heroStars?.[curHero] ?? 0;
        if (simulatedDays % 3 === 0 && curStars < 5 && spendGold(1800 + curStars * 1200)) {
          save = {
            ...save,
            heroStars: { ...save.heroStars, [curHero]: curStars + 1 },
          };
        }
        const altar = normalizeBlessingAltar(save.blessingAltar);
        const altarIds = Object.keys(altar.levels) as Array<keyof typeof altar.levels>;
        const targetAltar = altarIds[(simulatedDays - 1) % altarIds.length];
        const curLv = altar.levels[targetAltar] ?? 0;
        if (curLv < 12 && spendGold(650 + curLv * 480)) {
          save = {
            ...save,
            blessingAltar: {
              ...altar,
              levels: { ...altar.levels, [targetAltar]: curLv + 1 },
              totalSacrifices: altar.totalSacrifices + 1,
            },
          };
        }
      }

      // World Boss / Mythic Weapon Transcendence (Ch.5+)
      if (isNewDay && isEarlyFeatureUnlocked(save, 'world_boss').unlocked) {
        const mw = normalizeMythicWeapon(save.mythicWeapon);
        const targetTier = Math.min(5, Math.max(mw.tier, Math.floor((save.highestChapterCleared - 4) / 1.4) + 1));
        if (targetTier > mw.tier && spendGold(2400 + mw.tier * 1800)) {
          save = {
            ...save,
            mythicWeapon: { ...mw, tier: targetTier },
          };
        }
      }

      // Blood Moon / Mount 3D + Gear Awakening (Ch.6+)
      if (isNewDay && isEarlyFeatureUnlocked(save, 'blood_moon').unlocked) {
        const mountId = 'solarius';
        const curMountLv = save.mountLevels?.[mountId] ?? 1;
        if (curMountLv < 10 && spendGold(1200 + curMountLv * 900)) {
          save = {
            ...save,
            mountLevels: { ...(save.mountLevels ?? {}), [mountId]: curMountLv + 1 },
          };
        }
        if (simulatedDays % 2 === 0) {
          const slot = ALL_GEAR_SLOTS[(simulatedDays / 2) % ALL_GEAR_SLOTS.length];
          const uid = save.equipped[slot];
          const target = save.inventory.find((g) => g.uid === uid);
          if (target && (target.awakeningLevel ?? 0) < 5 && spendGold(2200 + (target.awakeningLevel ?? 0) * 1600)) {
            save = {
              ...save,
              inventory: save.inventory.map((g) =>
                g.uid === uid ? { ...g, awakeningLevel: (g.awakeningLevel ?? 0) + 1 } : g
              ),
            };
          }
        }
      }

      // Abyssal Gauntlet / Artifact 3D + Soul Rings (Ch.7+)
      if (isNewDay && isEarlyFeatureUnlocked(save, 'abyssal_gauntlet').unlocked) {
        const artId = 'astrolabe_regulus';
        const unlockedArts = save.unlockedArtifacts ?? [];
        if (!unlockedArts.includes(artId)) {
          save = {
            ...save,
            unlockedArtifacts: [...unlockedArts, artId],
            equippedArtifactId: artId,
            artifactLevels: { ...(save.artifactLevels ?? {}), [artId]: 1 },
          };
        } else {
          const curArtLv = save.artifactLevels?.[artId] ?? 1;
          if (curArtLv < 10 && spendGold(1600 + curArtLv * 1100)) {
            save = {
              ...save,
              artifactLevels: { ...(save.artifactLevels ?? {}), [artId]: curArtLv + 1 },
            };
          }
        }
        const sr = normalizeSoulRings(save.soulRings);
        const ringIds = Object.keys(sr.levels) as Array<keyof typeof sr.levels>;
        const targetRing = ringIds[(simulatedDays - 1) % ringIds.length];
        const curRingLv = sr.levels[targetRing] ?? 0;
        if (curRingLv < 10 && spendGold(2000 + curRingLv * 1400)) {
          save = {
            ...save,
            soulRings: {
              ...sr,
              levels: { ...sr.levels, [targetRing]: curRingLv + 1 },
              totalFusions: sr.totalFusions + 1,
            },
          };
        }
      }

      // Pantheon & Dragon Lair / Halo 3D + Zodiac Relics + Guild Sanctuary (Ch.8+)
      if (isNewDay && isEarlyFeatureUnlocked(save, 'pantheon_expedition').unlocked) {
        const haloId = 'leo_sovereign';
        const unlockedHalos = save.unlockedHalos ?? [];
        if (!unlockedHalos.includes(haloId)) {
          save = {
            ...save,
            unlockedHalos: [...unlockedHalos, haloId],
            equippedHaloId: haloId,
            haloLevels: { ...(save.haloLevels ?? {}), [haloId]: 1 },
          };
        } else {
          const curHaloLv = save.haloLevels?.[haloId] ?? 1;
          if (curHaloLv < 10 && spendGold(2200 + curHaloLv * 1500)) {
            save = {
              ...save,
              haloLevels: { ...(save.haloLevels ?? {}), [haloId]: curHaloLv + 1 },
            };
          }
        }

        const relics = normalizeZodiacRelics(save.zodiacRelics);
        const relicPool = [
          'relic_aries_horn',
          'relic_leo_suncrest',
          'relic_libra_scale',
          'relic_scorpio_sting',
          'relic_sagittarius_bow',
          'relic_aquarius_chalice',
        ] as const;
        const targetRelic = relicPool[(simulatedDays - 1) % relicPool.length];
        const curRelicLv = relics.levels[targetRelic] ?? 0;
        if (curRelicLv < 5 && spendGold(2500 + curRelicLv * 1800)) {
          save = {
            ...save,
            zodiacRelics: {
              ...relics,
              levels: { ...relics.levels, [targetRelic]: curRelicLv + 1 },
            },
          };
        }

        const sanc = normalizeGuildSanctuary(save.guildSanctuary);
        const monIds = Object.keys(sanc.monumentLevels) as Array<keyof typeof sanc.monumentLevels>;
        const targetMon = monIds[(simulatedDays - 1) % monIds.length];
        const curMonLv = sanc.monumentLevels[targetMon] ?? 0;
        if (curMonLv < 10 && spendGold(2800 + curMonLv * 1900)) {
          save = {
            ...save,
            guildSanctuary: {
              ...sanc,
              monumentLevels: { ...sanc.monumentLevels, [targetMon]: curMonLv + 1 },
            },
          };
        }
      }

      // Spend Gold systematically on cheapest Talent or Equipped Gear upgrade respecting real rarity maxLevel
      const talentsUnlocked = isEarlyFeatureUnlocked(save, 'talents').unlocked;
      for (let step = 0; step < 96; step++) {
        let bestTalentId: (typeof TALENTS)[number]['id'] | null = null;
        let bestTalentCost = Infinity;
        let bestTalentLv = 0;

        if (talentsUnlocked) {
          for (const t of TALENTS) {
            const lv = getTalentLevel(save.talents, t.id);
            if (lv >= t.maxLevel) continue;
            const cost = getTalentUpgradeCost(t.id, lv);
            if (cost < bestTalentCost) {
              bestTalentCost = cost;
              bestTalentId = t.id;
              bestTalentLv = lv;
            }
          }
        }

        let bestGearUid: string | null = null;
        let bestGearCost = Infinity;
        for (const slot of ALL_GEAR_SLOTS) {
          const uid = save.equipped[slot];
          const item = save.inventory.find((g) => g.uid === uid);
          if (!item || item.level >= RARITY_META[item.rarity].maxLevel) continue;
          const cost = getUpgradeCost(item);
          if (cost < bestGearCost) {
            bestGearCost = cost;
            bestGearUid = item.uid;
          }
        }

        const canTalent = bestTalentId !== null && save.gold >= bestTalentCost;
        const canGear = bestGearUid !== null && save.gold >= bestGearCost;
        if (!canTalent && !canGear) break;

        if (canTalent && (!canGear || bestTalentCost <= bestGearCost * 1.15)) {
          spendGold(bestTalentCost);
          save = {
            ...save,
            talents: { ...save.talents, [bestTalentId!]: bestTalentLv + 1 },
          };
        } else if (canGear && bestGearUid) {
          spendGold(bestGearCost);
          save = {
            ...save,
            inventory: save.inventory.map((g) =>
              g.uid === bestGearUid ? { ...g, level: g.level + 1 } : g
            ),
          };
        }
      }
    };

    const runSessionChunk = (chunkMinutes: number) => {
      elapsedMinutes += chunkMinutes;
      // Realistic ~45 min active session per calendar day for multi-week 30h-100h progression
      const targetDay = Math.max(1, Math.floor(elapsedMinutes / 45) + 1);
      const isNewDay = targetDay > simulatedDays;
      if (isNewDay) {
        const dayDelta = targetDay - simulatedDays;
        simulatedDays = targetDay;
        const chFactor = 1 + save.highestChapterCleared * 0.65;
        const dailyGold = Math.round((240 + save.highestChapterCleared * 680) * chFactor * dayDelta);
        const dailyGems = (45 + Math.min(75, save.highestChapterCleared * 7)) * dayDelta;
        addGold(dailyGold);
        addGems(dailyGems);
      }

      const targetChId = Math.min(12, save.highestChapterCleared + 1);
      const chapter = CHAPTERS.find((c) => c.id === targetChId) ?? CHAPTERS[CHAPTERS.length - 1];
      const curStats = computePlayerStats(save);
      const pressure = computePowerPressure(curStats.powerRating, chapter.recommendedPower);

      // First 5m is partial Ch.1 run (rooms 1-4); clears chapter once skill band >= 0.85 LC
      const canFinishChapter =
        elapsedMinutes >= 25 &&
        pressure.ratio >= 0.85 &&
        save.highestChapterCleared < targetChId;

      const stageReached = canFinishChapter
        ? 12
        : elapsedMinutes <= 5
        ? Math.min(4, Math.max(2, Math.round(pressure.ratio * 6)))
        : Math.max(3, Math.min(11, Math.round(pressure.ratio * 11)));

      const prevBest = save.bestStagePerChapter[targetChId] ?? 0;
      const runGold = Math.round(
        (stageReached * 36 + (canFinishChapter ? 185 : 25)) *
          chapter.goldBonusMult *
          Math.max(1, chunkMinutes / 10)
      );
      addGold(runGold);

      const dropRolls =
        elapsedMinutes <= 5 ? 1 : Math.min(3, Math.max(1, Math.floor(chunkMinutes / 10)));
      const newDrops: GearInstance[] = [];
      for (let d = 0; d < dropRolls; d++) {
        newDrops.push(rollProgressionGatedGear(save, false, undefined, false, rng));
      }

      save = {
        ...save,
        inventory: [...save.inventory, ...newDrops],
        highestChapterCleared: canFinishChapter
          ? Math.max(save.highestChapterCleared, targetChId)
          : save.highestChapterCleared,
        bestStagePerChapter: {
          ...save.bestStagePerChapter,
          [targetChId]: Math.max(prevBest, stageReached),
        },
      };

      const gMs = save.gold;
      const mMs = save.gems;
      const msRes = applyEarlyRunMilestones(save, targetChId, stageReached, canFinishChapter);
      save = msRes.nextSave;
      syncExternalCurrencyDelta(gMs, mMs);

      const gMail = save.gold;
      const mMail = save.gems;
      const mailRes = claimMailsUnified(save, 'all', ({ isPremium, minRarity, forceSTier }) =>
        rollProgressionGatedGear(save, isPremium, minRarity, forceSTier, rng)
      );
      save = mailRes.nextSave;
      syncExternalCurrencyDelta(gMail, mMail);

      // Endless Tower climb after Ch.1 clear
      if (save.highestChapterCleared >= 1 && elapsedMinutes >= 45) {
        const postStats = computePlayerStats(save);
        let climbed = 0;
        const maxClimbs = Math.min(4, Math.max(1, Math.floor(chunkMinutes / 15)));
        while (climbed < maxClimbs && (save.bestTowerFloor ?? 0) < 60) {
          const nextFloor = (save.bestTowerFloor ?? 0) + 1;
          const towerRec = getTowerRecommendedPower(nextFloor);
          const towerPressure = computePowerPressure(postStats.powerRating, towerRec);
          if (towerPressure.ratio < 0.85) break;
          save = { ...save, bestTowerFloor: nextFloor };
          addGold(120 + nextFloor * 45);
          addGems(nextFloor % 5 === 0 ? 15 : 3);
          climbed++;
        }
      }

      optimizeAndSpendSinks(isNewDay);
    };

    for (const target of PLAYTIME_MILESTONES) {
      while (elapsedMinutes < target.elapsedMinutes) {
        const remaining = target.elapsedMinutes - elapsedMinutes;
        const stepSize =
          elapsedMinutes < 30
            ? Math.min(5, remaining)
            : elapsedMinutes < 180
            ? Math.min(15, remaining)
            : elapsedMinutes < 1800
            ? Math.min(30, remaining)
            : Math.min(45, remaining);
        runSessionChunk(stepSize);
      }

      const snapStats = computePlayerStats(save);
      const targetChapterId = Math.min(12, save.highestChapterCleared + 1);
      const timing = estimateCombatTimings(save, targetChapterId);

      let highestRank = 0;
      let sumLv = 0;
      for (const slot of ALL_GEAR_SLOTS) {
        const item = save.inventory.find((g) => g.uid === save.equipped[slot]);
        if (!item) continue;
        highestRank = Math.max(highestRank, RARITY_RANK[item.rarity]);
        sumLv += item.level;
      }
      const highestRarity = RARITY_ORDER[highestRank] ?? Rarity.COMMON;
      const totalTalentLevels = TALENTS.reduce(
        (sum, t) => sum + getTalentLevel(save.talents, t.id),
        0
      );
      const goldSinkRatioPct =
        goldEarnedCumulative > 0
          ? Number(((goldSpentCumulative / goldEarnedCumulative) * 100).toFixed(1))
          : 0;

      let endgameSinkStatus: PlaytimeMilestoneSnapshot['endgameSinkStatus'] = 'healthy';
      let endgameSinkNote = 'Nguồn thu và tiêu hao Vàng cân bằng.';
      if (goldSinkRatioPct < 60 && target.elapsedMinutes >= 1800) {
        endgameSinkStatus = 'surplus_risk';
        endgameSinkNote =
          'Cảnh báo tồn kho Vàng cao ở giai đoạn cuối (Talent tiến sát trần 160); cần thêm sink tái chế/nâng bậc.';
        warnings.push(
          `[${target.id}] Gold sink ratio ${goldSinkRatioPct}% (<60%) — dư Vàng ở Endgame.`
        );
      } else if (goldSinkRatioPct >= 95 && target.elapsedMinutes <= 60) {
        endgameSinkStatus = 'tight';
        endgameSinkNote = 'Vàng tiêu thụ sát nguồn thu — cảm giác nâng cấp đều đặn đầu game.';
      }

      milestones.push({
        milestoneId: target.id,
        elapsedMinutes: target.elapsedMinutes,
        phaseLabel: target.phaseLabel,
        goldEarnedCumulative,
        goldSpentCumulative,
        goldBalance: save.gold,
        goldSinkRatioPct,
        gemsEarnedCumulative,
        gemsSpentCumulative,
        gemBalance: save.gems,
        highestChapterCleared: save.highestChapterCleared,
        targetChapterId,
        bestTowerFloor: save.bestTowerFloor ?? 0,
        playerPower: snapStats.powerRating,
        recommendedPower: timing.recommendedPower,
        powerRatio: timing.powerRatio,
        pressureTier: timing.pressureTier,
        highestRarity,
        highestRarityLabel: RARITY_META[highestRarity].label,
        avgGearLevel: Math.round(sumLv / ALL_GEAR_SLOTS.length),
        totalTalentLevels,
        estMobTtkSec: timing.estMobTtkSec,
        estBossTtkSec: timing.estBossTtkSec,
        estPlayerTtdSec: timing.estPlayerTtdSec,
        endgameSinkStatus,
        endgameSinkNote,
      });
    }

    return {
      seed,
      simulationKind: 'deterministic_seeded_model',
      freshBaselinePower,
      freshBaselineGold,
      freshBaselineGems,
      milestones,
      warnings,
    };
  } finally {
    Math.random = originalMathRandom;
  }
}

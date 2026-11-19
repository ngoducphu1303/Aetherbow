/**
 * Deterministic Early-Progression & Chapter 1 Combat Simulator
 * Uses Mulberry32 PRNG and actual game progression/stat/chapter modules.
 * Run: node --import tsx tools/simulate-early-progression.ts
 */
import { CHAPTERS } from '../src/data/chaptersData';
import {
  EARLY_FORGE_COSTS,
  PUNISH_WINDOW_DAMAGE_BONUS,
  PUNISH_WINDOW_PHASE3_BONUS,
  RARITY_RANK,
  applyEarlyRunMilestones,
  claimMailsUnified,
  computeExpectedDps,
  computeHeroMasteryBonuses,
  getEarlyProgressionPolicy,
  getEndlessTowerScaling,
  getSideModeScaling,
} from '../src/data/earlyProgressionData';
import {
  GEAR_SET_DEFINITIONS,
  GEAR_TEMPLATES,
  computePlayerStats,
  craftEarlyTargetGear,
  createInitialSaveData,
  evaluateEquippedGearSets,
  getUpgradeCost,
  rollChestGearBatch,
  rollProgressionGatedGear,
} from '../src/data/gearData';
import { HEROES } from '../src/data/heroesData';
import {
  PERFECT_DODGE_BUFF_DURATION,
  PERFECT_DODGE_CD_REDUCTION,
  PERFECT_DODGE_DAMAGE_BONUS,
  getHeroActiveSkill,
  getNightmareTierConfig,
} from '../src/data/phase5Data';
import { CHECK_IN_REWARDS, DAILY_QUESTS } from '../src/data/questsData';
import { rollRuneChestBatch } from '../src/data/runesData';
import { EnemyKind, GearInstance, GearSlot, Rarity, SaveData } from '../src/types/game';

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((p / 100) * (sorted.length - 1))));
  return sorted[idx];
}

function autoEquipBest(save: SaveData): SaveData {
  const bestBySlot: Partial<Record<GearSlot, GearInstance>> = {};
  for (const g of save.inventory) {
    const tpl = GEAR_TEMPLATES[g.templateId];
    if (!tpl) continue;
    const score = RARITY_RANK[g.rarity] * 1000 + (tpl.isSTier ? 500 : 0) + g.level * 15;
    const cur = bestBySlot[tpl.slot];
    const curScore = cur
      ? RARITY_RANK[cur.rarity] * 1000 + (GEAR_TEMPLATES[cur.templateId]?.isSTier ? 500 : 0) + cur.level * 15
      : -1;
    if (score > curScore) {
      bestBySlot[tpl.slot] = g;
    }
  }
  const equipped: Partial<Record<GearSlot, string>> = {};
  for (const [slot, item] of Object.entries(bestBySlot)) {
    if (item) equipped[slot as GearSlot] = item.uid;
  }
  return { ...save, equipped };
}

function upgradeWeaponWhileAffordable(save: SaveData, maxLevels = 20): SaveData {
  let next = save;
  for (let i = 0; i < maxLevels; i++) {
    const uid = next.equipped[GearSlot.WEAPON];
    if (!uid) break;
    const w = next.inventory.find((g) => g.uid === uid);
    if (!w) break;
    const cost = getUpgradeCost(w);
    if (next.gold < cost) break;
    next = {
      ...next,
      gold: next.gold - cost,
      inventory: next.inventory.map((g) => (g.uid === uid ? { ...g, level: g.level + 1 } : g)),
    };
  }
  return next;
}

function countGearTiers(save: SaveData) {
  let common = 0;
  let rare = 0;
  let epic = 0;
  let legendary = 0;
  let sTier = 0;
  for (const g of save.inventory) {
    if (g.rarity === Rarity.COMMON) common++;
    else if (g.rarity === Rarity.RARE) rare++;
    else if (g.rarity === Rarity.EPIC) epic++;
    else if (g.rarity === Rarity.LEGENDARY || g.rarity === Rarity.MYTHIC) legendary++;
    if (GEAR_TEMPLATES[g.templateId]?.isSTier) sTier++;
  }
  return { common, rare, epic, legendary, sTier };
}

// ============================================================================
// PART 1: 3-PROFILE COMPARISON (HEAD BASELINE vs AFTER RE-BALANCE)
// ============================================================================

function buildAfterProfiles() {
  const rng = mulberry32(202604);
  const fresh = createInitialSaveData();

  // Profile 2: All Eligible Lobby Rewards Claimed BEFORE Run 1
  // Welcome (+30g/+10gem/+2 rareShards) + Mail mail_grand_launch (+25g/+10gem) + Day 1 Check-In (+35g/+5gem)
  // Plus upgrading weapon Lv.1->Lv.2, then claiming dq_upgrade_1 (+60g/+5gem) -> Lv.2->Lv.3
  let lobbyClaimed: SaveData = {
    ...fresh,
    welcomeGiftClaimed: true,
    gold: fresh.gold + 30,
    gems: fresh.gems + 10,
    earlyForgeProgress: { rareShards: 2, epicShards: 0, sTierBlueprints: 0 },
  };
  lobbyClaimed = claimMailsUnified(lobbyClaimed, 'all', ({ isPremium, minRarity, forceSTier }) =>
    rollProgressionGatedGear(lobbyClaimed, isPremium, minRarity, forceSTier, rng)
  ).nextSave;
  lobbyClaimed = {
    ...lobbyClaimed,
    gold: lobbyClaimed.gold + CHECK_IN_REWARDS[0].gold,
    gems: lobbyClaimed.gems + CHECK_IN_REWARDS[0].gems,
  };
  // Upgrade Lv.1 -> Lv.2 (50g)
  const lobbyClaimedNoDq = upgradeWeaponWhileAffordable(lobbyClaimed, 1);
  // Also claim dq_upgrade_1 (+60g/+5gem) and upgrade Lv.2 -> Lv.3 (85g)
  const dqUp = DAILY_QUESTS.find((q) => q.id === 'dq_upgrade_1')!;
  const lobbyClaimedMax = upgradeWeaponWhileAffordable(
    {
      ...lobbyClaimedNoDq,
      gold: lobbyClaimedNoDq.gold + dqUp.rewardGold,
      gems: lobbyClaimedNoDq.gems + dqUp.rewardGems,
    },
    1
  );

  // Profile 3: Just Cleared Chapter 1 (realistic optimal progression through Ch.1)
  // Run 1 reaches St.4 (Ares), crafts Rare weapon; Run 2 reaches St.8 (Boreas); Run 3 clears St.12 (Sư Vương),
  // claims Ares + Ch.1 mails, opens 4 Mythic chests with earned gems, crafts Epic weapon, equips best & upgrades.
  let postCh1 = { ...lobbyClaimedMax };
  // Run 1 -> St.4 (approx 95g run drop)
  postCh1 = { ...postCh1, gold: postCh1.gold + 95, bestStagePerChapter: { 1: 4 } };
  postCh1 = applyEarlyRunMilestones(postCh1, 1, 4, false).nextSave;
  const rareCraft = craftEarlyTargetGear(postCh1, 'rare', rng);
  if (rareCraft.ok && rareCraft.nextSave) postCh1 = rareCraft.nextSave;
  // Run 2 -> St.8 (approx 165g run drop)
  postCh1 = { ...postCh1, gold: postCh1.gold + 165, bestStagePerChapter: { 1: 8 } };
  postCh1 = applyEarlyRunMilestones(postCh1, 1, 8, false).nextSave;
  // Run 3 -> St.12 Clear (approx 240g run drop + daily quests dq_kills_20 & dq_stages_5)
  postCh1 = {
    ...postCh1,
    gold: postCh1.gold + 240 + 140 + 160,
    gems: postCh1.gems + 12 + 15,
    highestChapterCleared: 1,
    bestStagePerChapter: { 1: 12 },
  };
  postCh1 = applyEarlyRunMilestones(postCh1, 1, 12, true).nextSave;
  // Claim newly unlocked Ares + Ch.1 clear mails
  postCh1 = claimMailsUnified(postCh1, 'all', ({ isPremium, minRarity, forceSTier }) =>
    rollProgressionGatedGear(postCh1, isPremium, minRarity, forceSTier, rng)
  ).nextSave;
  // Craft Epic weapon with accumulated Epic shards (5 + 6 + 4 = 15)
  const epicCraft = craftEarlyTargetGear(postCh1, 'epic', rng);
  if (epicCraft.ok && epicCraft.nextSave) postCh1 = epicCraft.nextSave;
  // Spend earned gems on Mythic Chests (25 gems each) under Post-Ch.1 policy
  const chestCount = Math.floor(postCh1.gems / 25);
  if (chestCount > 0) {
    const res = rollChestGearBatch(true, chestCount, postCh1.pity, {
      policy: getEarlyProgressionPolicy(postCh1),
      rng,
    });
    postCh1 = {
      ...postCh1,
      gems: postCh1.gems - chestCount * 25,
      inventory: [...postCh1.inventory, ...res.items],
      pity: res.nextPity,
    };
  }
  postCh1 = autoEquipBest(postCh1);
  postCh1 = upgradeWeaponWhileAffordable(postCh1, 5);

  return { fresh, lobbyClaimedNoDq, lobbyClaimedMax, postCh1 };
}

// ============================================================================
// PART 2: SEEDED ECONOMY RNG SIMULATION (500 SEEDS, MULBERRY32)
// ============================================================================

interface EconomyMilestoneRuns {
  firstRare: number;
  firstEpic: number;
  firstSTier: number;
}

function summarizeEconomy(results: EconomyMilestoneRuns[]) {
  const rares = results.map((r) => r.firstRare).sort((a, b) => a - b);
  const epics = results.map((r) => r.firstEpic).sort((a, b) => a - b);
  const sTiers = results.map((r) => r.firstSTier).sort((a, b) => a - b);
  return {
    rare: { p10: percentile(rares, 10), p50: percentile(rares, 50), p90: percentile(rares, 90) },
    epic: { p10: percentile(epics, 10), p50: percentile(epics, 50), p90: percentile(epics, 90) },
    sTier: { p10: percentile(sTiers, 10), p50: percentile(sTiers, 50), p90: percentile(sTiers, 90) },
  };
}

/**
 * Simulates runs needed to reach first Rare, Epic, and [S] item under AFTER progression rules.
 * - Campaign-Only: plays campaign runs sequentially, claims run milestones & target gear forge + campaign mails, NO daily welfare/quests.
 * - Optimal Free: also claims Welcome Gift, Daily Check-In (1 day per ~3 runs), Daily Quests, and opens Mythic/Iron chests with earned gems/gold as soon as unlocked.
 */
function simulateEconomyAfter(seedCount: number, mode: 'campaign_only' | 'optimal_free') {
  const results: EconomyMilestoneRuns[] = [];
  for (let s = 0; s < seedCount; s++) {
    const rng = mulberry32(90000 + s * 37);
    let save = createInitialSaveData();
    let firstRare = -1;
    let firstEpic = -1;
    let firstSTier = -1;

    if (mode === 'optimal_free') {
      save = {
        ...save,
        welcomeGiftClaimed: true,
        gold: save.gold + 30,
        gems: save.gems + 10,
        earlyForgeProgress: { rareShards: 2, epicShards: 0, sTierBlueprints: 0 },
      };
      save = claimMailsUnified(save, 'all', ({ isPremium, minRarity, forceSTier }) =>
        rollProgressionGatedGear(save, isPremium, minRarity, forceSTier, rng)
      ).nextSave;
    }

    const checkMilestones = (runIdx: number) => {
      if (firstRare < 0 && save.inventory.some((g) => RARITY_RANK[g.rarity] >= RARITY_RANK[Rarity.RARE])) {
        firstRare = runIdx;
      }
      if (firstEpic < 0 && save.inventory.some((g) => RARITY_RANK[g.rarity] >= RARITY_RANK[Rarity.EPIC])) {
        firstEpic = runIdx;
      }
      if (firstSTier < 0 && save.inventory.some((g) => GEAR_TEMPLATES[g.templateId]?.isSTier)) {
        firstSTier = runIdx;
      }
    };

    checkMilestones(0);

    // Simulate up to 30 campaign runs
    for (let run = 1; run <= 30 && (firstRare < 0 || firstEpic < 0 || firstSTier < 0); run++) {
      // Realistic campaign progression curve with slight RNG variance in stage reached
      let chapterId = 1;
      let stageReached = 1;
      let victory = false;

      if (save.highestChapterCleared === 0) {
        chapterId = 1;
        // Run 1 usually reaches St.3-5 (Ares), Run 2 St.6-9 (Boreas), Run 3-4 clears Ch.1
        const skillFactor = mode === 'optimal_free' ? 1 : 0;
        const rawStage = Math.min(12, Math.round(2.5 + run * 3.1 + skillFactor * 0.8 + (rng() - 0.5) * 2.2));
        stageReached = Math.max(2, rawStage);
        victory = stageReached >= 12;
      } else if (save.highestChapterCleared === 1) {
        chapterId = 2;
        const ch2Runs = Math.max(1, run - 3);
        const skillFactor = mode === 'optimal_free' ? 1 : 0;
        const rawStage = Math.min(12, Math.round(2 + ch2Runs * 2.6 + skillFactor * 0.9 + (rng() - 0.5) * 2.4));
        stageReached = Math.max(2, rawStage);
        victory = stageReached >= 12;
      } else {
        chapterId = 3;
        const ch3Runs = Math.max(1, run - 7);
        const rawStage = Math.min(12, Math.round(3 + ch3Runs * 2.5 + (rng() - 0.5) * 2.4));
        stageReached = Math.max(3, rawStage);
        victory = stageReached >= 12;
      }

      const prevBest = save.bestStagePerChapter[chapterId] ?? 0;
      const runGold = Math.round((20 + stageReached * 18) * (1 + (chapterId - 1) * 0.35));
      save = {
        ...save,
        gold: save.gold + runGold,
        highestChapterCleared: victory ? Math.max(save.highestChapterCleared, chapterId) : save.highestChapterCleared,
        bestStagePerChapter: {
          ...save.bestStagePerChapter,
          [chapterId]: Math.max(prevBest, stageReached),
        },
      };

      // End-of-run gear drop (~45% chance on Ch.1+ St.4+, clamped to progression policy)
      if (stageReached >= 4 && rng() < 0.45) {
        const drop = rollProgressionGatedGear(save, false, undefined, false, rng);
        save = { ...save, inventory: [...save.inventory, drop] };
      }

      // Apply campaign milestones & shards
      save = applyEarlyRunMilestones(save, chapterId, stageReached, victory).nextSave;

      // Claim newly unlocked campaign mails
      save = claimMailsUnified(save, 'all', ({ isPremium, minRarity, forceSTier }) =>
        rollProgressionGatedGear(save, isPremium, minRarity, forceSTier, rng)
      ).nextSave;

      // Optimal Free extras: daily quests + check-in cadence (1 day per 3 runs)
      if (mode === 'optimal_free') {
        if (run % 3 === 1) {
          const dayIdx = Math.min(6, Math.floor((run - 1) / 3));
          const ci = CHECK_IN_REWARDS[dayIdx];
          save = { ...save, gold: save.gold + ci.gold, gems: save.gems + ci.gems };
          if (ci.bonusRarity) {
            const g = rollProgressionGatedGear(save, true, ci.bonusRarity, false, rng);
            save = { ...save, inventory: [...save.inventory, g] };
          }
          // Daily quests income per day
          save = { ...save, gold: save.gold + 360, gems: save.gems + 32 };
        }
      }

      // Craft target gear whenever unlocked & shards ready
      const policy = getEarlyProgressionPolicy(save);
      if (firstRare < 0 && policy.bestCh1Stage >= 4 && (save.earlyForgeProgress?.rareShards ?? 0) >= EARLY_FORGE_COSTS.rareShards) {
        const res = craftEarlyTargetGear(save, 'rare', rng);
        if (res.ok && res.nextSave) save = res.nextSave;
      }
      if (firstEpic < 0 && policy.highestChapterCleared >= 1 && (save.earlyForgeProgress?.epicShards ?? 0) >= EARLY_FORGE_COSTS.epicShards) {
        const res = craftEarlyTargetGear(save, 'epic', rng);
        if (res.ok && res.nextSave) save = res.nextSave;
      }
      if (firstSTier < 0 && policy.allowSTier && (save.earlyForgeProgress?.sTierBlueprints ?? 0) >= EARLY_FORGE_COSTS.sTierBlueprints) {
        const res = craftEarlyTargetGear(save, 's_tier', rng);
        if (res.ok && res.nextSave) save = res.nextSave;
      }

      // Spend gems on Mythic Chests once Mythic Chest is unlocked (St.4 Ch.1+)
      if (policy.bestCh1Stage >= 4 || policy.highestChapterCleared >= 1) {
        const rolls = Math.floor(save.gems / 25);
        if (rolls > 0) {
          const batch = rollChestGearBatch(true, rolls, save.pity, { policy, rng });
          save = {
            ...save,
            gems: save.gems - rolls * 25,
            inventory: [...save.inventory, ...batch.items],
            pity: batch.nextPity,
          };
        }
      }

      // Optimal free also spends surplus gold (>240g) on Iron Chests after St.2 Ch.1
      if (mode === 'optimal_free' && (policy.bestCh1Stage >= 2 || policy.highestChapterCleared >= 1)) {
        const ironRolls = Math.floor(Math.max(0, save.gold - 200) / 120);
        if (ironRolls > 0) {
          const batch = rollChestGearBatch(false, ironRolls, save.pity, { policy, rng });
          save = {
            ...save,
            gold: save.gold - ironRolls * 120,
            inventory: [...save.inventory, ...batch.items],
            pity: batch.nextPity,
          };
        }
      }

      checkMilestones(run);
    }

    results.push({
      firstRare: firstRare < 0 ? 30 : firstRare,
      firstEpic: firstEpic < 0 ? 30 : firstEpic,
      firstSTier: firstSTier < 0 ? 30 : firstSTier,
    });
  }
  return summarizeEconomy(results);
}

/**
 * Baseline HEAD economy model (for Before vs After comparison):
 * - Optimal Free: before run 1 (run 0), Welcome Gift grants Rare, Mail grants Epic [S] + Rare + Starter Pack [S] + 295+ gems for Mythic chests -> 0 runs for Rare/Epic/[S].
 * - Campaign-Only (ignoring lobby gifts/mails, only run drops + starting 45 gems Mythic chest + run gold Iron chests):
 *   ungated rollChestGear could drop Rare/Epic/Legendary/[S] immediately on run 1.
 */
function simulateEconomyBeforeHead(seedCount: number, mode: 'campaign_only' | 'optimal_free') {
  if (mode === 'optimal_free') {
    return {
      rare: { p10: 0, p50: 0, p90: 0 },
      epic: { p10: 0, p50: 0, p90: 0 },
      sTier: { p10: 0, p50: 0, p90: 0 },
    };
  }
  const results: EconomyMilestoneRuns[] = [];
  for (let s = 0; s < seedCount; s++) {
    const rng = mulberry32(40000 + s * 19);
    let gold = 260;
    let gems = 45;
    let pity = { mythicRollsSinceEpic: 0, mythicRollsSinceSTier: 0, runeRollsSinceEpic: 0 };
    let firstRare = -1;
    let firstEpic = -1;
    let firstSTier = -1;
    const inv: GearInstance[] = [];

    const check = (r: number) => {
      if (firstRare < 0 && inv.some((g) => RARITY_RANK[g.rarity] >= RARITY_RANK[Rarity.RARE])) firstRare = r;
      if (firstEpic < 0 && inv.some((g) => RARITY_RANK[g.rarity] >= RARITY_RANK[Rarity.EPIC])) firstEpic = r;
      if (firstSTier < 0 && inv.some((g) => GEAR_TEMPLATES[g.templateId]?.isSTier)) firstSTier = r;
    };

    // Even campaign-only player starts with 45 gems (1 Mythic Chest ungated) + 260 gold (2 Iron Chests ungated)
    for (let run = 1; run <= 25 && (firstRare < 0 || firstEpic < 0 || firstSTier < 0); run++) {
      gold += 180;
      gems += 18;
      // Ungated Mythic chests
      const mRolls = Math.floor(gems / 25);
      if (mRolls > 0) {
        const batch = rollChestGearBatch(true, mRolls, pity, { rng });
        inv.push(...batch.items);
        pity = batch.nextPity;
        gems -= mRolls * 25;
      }
      // Ungated Iron chests
      const iRolls = Math.floor(gold / 120);
      if (iRolls > 0) {
        const batch = rollChestGearBatch(false, iRolls, pity, { rng });
        inv.push(...batch.items);
        pity = batch.nextPity;
        gold -= iRolls * 120;
      }
      check(run);
    }
    results.push({
      firstRare: firstRare < 0 ? 25 : firstRare,
      firstEpic: firstEpic < 0 ? 25 : firstEpic,
      firstSTier: firstSTier < 0 ? 25 : firstSTier,
    });
  }
  return summarizeEconomy(results);
}

// ============================================================================
// PART 3: SEEDED CHAPTER 1 COMBAT SIMULATION (200 SEEDS, 2 PROFILES x 2 BUILDS)
// Uses exact GameEngine.ts base enemy HP & boss cycle timings!
// ============================================================================

const BASE_ENEMY_HP: Record<EnemyKind, number> = {
  [EnemyKind.SKIRMISHER]: 90,
  [EnemyKind.IMP_ARCHER]: 76,
  [EnemyKind.GOLEM]: 225,
  [EnemyKind.WISP]: 72,
  [EnemyKind.DRAGON_WHELP]: 135,
  [EnemyKind.SHADOW_STALKER]: 115,
  [EnemyKind.WARDEN_BOSS]: 1150,
  [EnemyKind.TITAN_BOSS]: 1950,
  [EnemyKind.ZODIAC_BOSS]: 2750,
};

// Exact Boss cycle duration (windup + recovery) from src/engine/GameEngine.ts:
// Ares (WARDEN_BOSS): avg windup (0.94+0.72)/2 = 0.83s + recovery 1.55s (1.15s <55% HP) => avg ~2.18s / pattern
// Boreas (TITAN_BOSS): avg windup (0.90+0.72+0.94)/3 = 0.85s + recovery 1.50s (1.15s <55% HP) => avg ~2.18s / pattern
// Sư Vương (ZODIAC_BOSS): Phase I avg 0.85+1.45=2.30s; Phase II (<55% HP) avg 0.72+1.15=1.87s => avg ~2.06s / pattern
const BOSS_AVG_CYCLE_SEC = {
  [EnemyKind.WARDEN_BOSS]: 2.18,
  [EnemyKind.TITAN_BOSS]: 2.18,
  [EnemyKind.ZODIAC_BOSS]: 2.06,
};

type BuildArchetype = 'aoe' | 'boss';

interface CombatSimSummary {
  profile: string;
  build: string;
  standingDps: number;
  st1_3AvgSec: number;
  st5_7AvgSec: number;
  st9_11AvgSec: number;
  boss1TtkSec: number;
  boss1Patterns: number;
  boss2TtkSec: number;
  boss2Patterns: number;
  boss3TtkSec: number;
  boss3Patterns: number;
}

function simulateCh1Combat(
  profileLabel: string,
  baseSave: SaveData,
  build: BuildArchetype,
  seedCount: number
): CombatSimSummary {
  const ch1 = CHAPTERS[0];
  const baseStats = computePlayerStats(baseSave);
  const baseStandingDps = computeExpectedDps(baseStats);

  // Stutter-step uptime: during regular rooms player kites ~28% of time (0.72 uptime),
  // during boss rooms player dodges telegraphs ~36% of time (0.64 uptime) & punishes during recovery windows.
  const regularUptime = 0.72;
  const bossUptime = 0.64;

  let st1_3Sum = 0;
  let st5_7Sum = 0;
  let st9_11Sum = 0;
  let b1TtkSum = 0;
  let b2TtkSum = 0;
  let b3TtkSum = 0;

  for (let s = 0; s < seedCount; s++) {
    const rng = mulberry32(55000 + s * 41 + (build === 'aoe' ? 1 : 2));
    // Cumulative in-run skill draft multipliers as player levels up across stages 1..12
    // Typical Ch.1 run grants ~1 skill draft every 1.6 stages (7-8 drafts by Stage 12)
    let singleTargetMult = 1.0;
    let aoeCoverageMult = 1.0;

    for (const stage of ch1.stages) {
      const st = stage.stageNumber;
      // Grant skill draft milestones (St.2, 3, 5, 6, 8, 9, 11) with seeded RNG variance for draft quality
      if (st === 2 || st === 3 || st === 5 || st === 6 || st === 8 || st === 9 || st === 11) {
        const draftRoll = 0.88 + rng() * 0.24; // +/- 12% RNG draft variance
        if (build === 'aoe') {
          // Dọn Nhóm (Ricochet / Piercing / Chain Lightning / Diagonal Arrows / Frost Nova)
          aoeCoverageMult *= 1 + 0.24 * draftRoll;
          singleTargetMult *= 1 + 0.11 * draftRoll;
        } else {
          // Đánh Boss (Front Arrow / Multishot / Rage / Crit Master / Attack Speed / Attack Boost)
          singleTargetMult *= 1 + 0.22 * draftRoll;
          aoeCoverageMult *= 1 + 0.10 * draftRoll;
        }
      }

      // Compute stage enemy HP pool exactly matching GameEngine.ts (hpScale * (1 + (st-1)*0.075), Elite 1.75x)
      const stageHpScale = ch1.hpScale * (1 + (st - 1) * 0.075);
      let stageTime = 0;

      if (stage.isBossStage) {
        let bossHp = 0;
        let addsHp = 0;
        for (const wave of stage.waves) {
          for (const g of wave.enemies) {
            const unitHp = BASE_ENEMY_HP[g.kind] * stageHpScale * (g.isElite ? 1.75 : 1);
            if (
              g.kind === EnemyKind.WARDEN_BOSS ||
              g.kind === EnemyKind.TITAN_BOSS ||
              g.kind === EnemyKind.ZODIAC_BOSS
            ) {
              bossHp += unitHp * g.count;
            } else {
              addsHp += unitHp * g.count;
            }
          }
        }
        const effectiveBossDps = baseStandingDps * singleTargetMult * (1 + baseStats.bossDamageBonus) * bossUptime;
        const effectiveAddsDps = baseStandingDps * singleTargetMult * Math.min(2.4, aoeCoverageMult) * regularUptime;
        // Small target-acquisition & boss intro delay (~1.2s)
        stageTime = 1.2 + bossHp / effectiveBossDps + addsHp / effectiveAddsDps;
        if (st === 4) b1TtkSum += stageTime;
        else if (st === 8) b2TtkSum += stageTime;
        else if (st === 12) b3TtkSum += stageTime;
      } else {
        for (const wave of stage.waves) {
          let totalEnemies = 0;
          let waveHp = 0;
          for (const g of wave.enemies) {
            totalEnemies += g.count;
            waveHp += BASE_ENEMY_HP[g.kind] * stageHpScale * (g.isElite ? 1.75 : 1) * g.count;
          }
          // Effective AoE throughput scales with enemy pack density (capped by enemy count)
          const packEfficiency = Math.min(Math.max(1, totalEnemies * 0.65), aoeCoverageMult);
          const effectiveRoomDps = baseStandingDps * singleTargetMult * packEfficiency * regularUptime;
          // Wave spawn/reposition overhead ~1.1s
          stageTime += 1.1 + waveHp / effectiveRoomDps;
        }
        if (st <= 3) st1_3Sum += stageTime / 3;
        else if (st <= 7) st5_7Sum += stageTime / 3;
        else st9_11Sum += stageTime / 3;
      }
    }
  }

  const b1 = b1TtkSum / seedCount;
  const b2 = b2TtkSum / seedCount;
  const b3 = b3TtkSum / seedCount;

  return {
    profile: profileLabel,
    build: build === 'aoe' ? 'Dọn Nhóm (AoE/Chain)' : 'Đánh Boss (Đơn Mục Tiêu)',
    standingDps: baseStandingDps,
    st1_3AvgSec: Number((st1_3Sum / seedCount).toFixed(1)),
    st5_7AvgSec: Number((st5_7Sum / seedCount).toFixed(1)),
    st9_11AvgSec: Number((st9_11Sum / seedCount).toFixed(1)),
    boss1TtkSec: Number(b1.toFixed(1)),
    boss1Patterns: Number((b1 / BOSS_AVG_CYCLE_SEC[EnemyKind.WARDEN_BOSS]).toFixed(1)),
    boss2TtkSec: Number(b2.toFixed(1)),
    boss2Patterns: Number((b2 / BOSS_AVG_CYCLE_SEC[EnemyKind.TITAN_BOSS]).toFixed(1)),
    boss3TtkSec: Number(b3.toFixed(1)),
    boss3Patterns: Number((b3 / BOSS_AVG_CYCLE_SEC[EnemyKind.ZODIAC_BOSS]).toFixed(1)),
  };
}

// ============================================================================
// MAIN EXECUTION & REPORT OUTPUT
// ============================================================================

const { fresh, lobbyClaimedNoDq, lobbyClaimedMax, postCh1 } = buildAfterProfiles();

const profilesAfter = [
  { name: 'AFTER_FRESH', save: fresh },
  { name: 'AFTER_LOBBY_CLAIMED_BASE', save: lobbyClaimedNoDq },
  { name: 'AFTER_LOBBY_CLAIMED_MAX (+dq_upgrade_1)', save: lobbyClaimedMax },
  { name: 'AFTER_POST_CH1', save: postCh1 },
];

console.log('=== 1. THREE-PROFILE SNAPSHOT (AFTER RE-BALANCE) ===');
console.log('Formula: expectedDps = attack * attackSpeedMult * (1 + critChance * (critDamage - 1))');
for (const p of profilesAfter) {
  const st = computePlayerStats(p.save);
  const dps = computeExpectedDps(st);
  const tiers = countGearTiers(p.save);
  console.log(
    JSON.stringify({
      profile: p.name,
      atk: st.attack,
      hp: st.maxHp,
      critPct: Number((st.critChance * 100).toFixed(2)),
      critDmg: Number(st.critDamage.toFixed(2)),
      aspd: Number(st.attackSpeedMult.toFixed(3)),
      expectedDps: dps,
      powerRating: st.powerRating,
      gold: p.save.gold,
      gems: p.save.gems,
      runes: p.save.runeInventory.length,
      wings3D: p.save.unlockedCelestialWings?.length ?? 0,
      titles3D: p.save.unlockedRoyal3DTitles?.length ?? 0,
      gear: tiers,
    })
  );
}

const freshDps = computeExpectedDps(computePlayerStats(fresh));
const lobbyBaseDps = computeExpectedDps(computePlayerStats(lobbyClaimedNoDq));
const lobbyMaxDps = computeExpectedDps(computePlayerStats(lobbyClaimedMax));
console.log(
  `Pre-run DPS Gap (Base Lobby Claimed): +${(((lobbyBaseDps - freshDps) / freshDps) * 100).toFixed(2)}% (target <= 10%)`
);
console.log(
  `Pre-run DPS Gap (Max Lobby + dq_upgrade_1): +${(((lobbyMaxDps - freshDps) / freshDps) * 100).toFixed(2)}% (target <= 10%)`
);

console.log('\n=== 2. SEEDED ECONOMY RNG SIMULATION (500 SEEDS, MULBERRY32) ===');
console.log('BEFORE (HEAD) - Campaign-Only:', JSON.stringify(simulateEconomyBeforeHead(500, 'campaign_only')));
console.log('BEFORE (HEAD) - Optimal Free :', JSON.stringify(simulateEconomyBeforeHead(500, 'optimal_free')));
console.log('AFTER         - Campaign-Only:', JSON.stringify(simulateEconomyAfter(500, 'campaign_only')));
console.log('AFTER         - Optimal Free :', JSON.stringify(simulateEconomyAfter(500, 'optimal_free')));

console.log('\n=== 3. SEEDED CHAPTER 1 COMBAT SIMULATION (200 SEEDS, MULBERRY32) ===');
const combatRows: CombatSimSummary[] = [
  simulateCh1Combat('Tối Thiểu (Fresh)', fresh, 'aoe', 200),
  simulateCh1Combat('Tối Thiểu (Fresh)', fresh, 'boss', 200),
  simulateCh1Combat('Tối Ưu Hợp Lệ (Lobby-Claimed)', lobbyClaimedMax, 'aoe', 200),
  simulateCh1Combat('Tối Ưu Hợp Lệ (Lobby-Claimed)', lobbyClaimedMax, 'boss', 200),
];
for (const row of combatRows) {
  console.log(JSON.stringify(row));
}

// ============================================================================
// PART 4: 8-HERO CH.1 BASELINE BALANCE ENVELOPE
// ============================================================================
console.log('\n=== 4. EIGHT-HERO CH.1 BASELINE BALANCE ENVELOPE ===');
const artemisBaseDps = computeExpectedDps(
  computePlayerStats({ ...fresh, selectedHeroId: 'artemis' })
);
for (const hero of HEROES) {
  const st = computePlayerStats({ ...fresh, selectedHeroId: hero.id });
  const dps = computeExpectedDps(st);
  const deltaPct = ((dps - artemisBaseDps) / artemisBaseDps) * 100;
  console.log(
    JSON.stringify({
      heroId: hero.id,
      name: hero.name,
      roleTag: hero.roleTag,
      unlockGold: hero.unlockGold,
      unlockGems: hero.unlockGems,
      atk: st.attack,
      hp: st.maxHp,
      critPct: Number((st.critChance * 100).toFixed(1)),
      critDmg: Number(st.critDamage.toFixed(2)),
      aspd: Number(st.attackSpeedMult.toFixed(2)),
      expectedDps: dps,
      deltaVsArtemisPct: Number(deltaPct.toFixed(2)),
    })
  );
}

// ============================================================================
// PART 5: CH.1–3 BOSS COMBAT DEPTH (BASE vs SYNERGY + PUNISH WINDOW, 200 SEEDS)
// ============================================================================
function simulateChapterBossDepth(
  chapterIdx: number,
  profileLabel: string,
  baseSave: SaveData,
  withSynergyAndPunish: boolean,
  seedCount: number
) {
  const chapter = CHAPTERS[chapterIdx];
  const finalStage = chapter.stages[chapter.stages.length - 1];
  const baseStats = computePlayerStats(baseSave);
  const baseDps = computeExpectedDps(baseStats);
  let ttkSum = 0;

  for (let s = 0; s < seedCount; s++) {
    const rng = mulberry32(71000 + chapterIdx * 500 + s * 29);
    // By final boss stage, player has accumulated 7 skill drafts
    let stMult = 1.0;
    for (let d = 0; d < 7; d++) {
      stMult *= 1 + 0.19 * (0.9 + rng() * 0.2);
    }
    // Phase 2 Boss Barrage (+14% boss dmg) + Punish Window (+18% during ~58% recovery uptime)
    const synergyMult = withSynergyAndPunish ? 1.14 : 1.0;
    const punishAvgMult = withSynergyAndPunish ? 1 + PUNISH_WINDOW_DAMAGE_BONUS * 0.58 : 1.0;
    const effectiveDps =
      baseDps * stMult * (1 + baseStats.bossDamageBonus) * synergyMult * punishAvgMult * 0.64;

    const stageHpScale = chapter.hpScale * (1 + (finalStage.stageNumber - 1) * 0.075);
    let bossHp = 0;
    for (const wave of finalStage.waves) {
      for (const g of wave.enemies) {
        if (
          g.kind === EnemyKind.WARDEN_BOSS ||
          g.kind === EnemyKind.TITAN_BOSS ||
          g.kind === EnemyKind.ZODIAC_BOSS
        ) {
          bossHp += BASE_ENEMY_HP[g.kind] * stageHpScale * g.count;
        }
      }
    }
    ttkSum += 1.2 + bossHp / effectiveDps;
  }
  const avgTtk = ttkSum / seedCount;
  return {
    chapter: `Ch.${chapter.id} · ${chapter.bossName}`,
    profile: profileLabel,
    mode: withSynergyAndPunish ? 'Synergy + Punish (+18%)' : 'Base Build',
    avgBossTtkSec: Number(avgTtk.toFixed(1)),
    avgPatterns: Number((avgTtk / BOSS_AVG_CYCLE_SEC[EnemyKind.ZODIAC_BOSS]).toFixed(1)),
  };
}

// Build realistic Ch.2-ready and Ch.3-ready profiles for combat depth validation
const ch2Profile = postCh1;
let ch3Profile: SaveData = {
  ...postCh1,
  highestChapterCleared: 2,
  bestStagePerChapter: { 1: 12, 2: 12 },
  gold: postCh1.gold + 900,
  earlyForgeProgress: { rareShards: 0, epicShards: 0, sTierBlueprints: 20 },
};
const sCraftRes = craftEarlyTargetGear(ch3Profile, 's_tier', mulberry32(3030));
if (sCraftRes.ok && sCraftRes.nextSave) {
  ch3Profile = upgradeWeaponWhileAffordable(autoEquipBest(sCraftRes.nextSave), 6);
}

console.log('\n=== 5. CH.1–3 BOSS COMBAT DEPTH (BASE vs SYNERGY + PUNISH, 200 SEEDS) ===');
const depthRows = [
  simulateChapterBossDepth(0, 'Ch.1 Lobby-Claimed', lobbyClaimedMax, false, 200),
  simulateChapterBossDepth(0, 'Ch.1 Lobby-Claimed', lobbyClaimedMax, true, 200),
  simulateChapterBossDepth(1, 'Ch.2 Post-Ch.1 Epic', ch2Profile, false, 200),
  simulateChapterBossDepth(1, 'Ch.2 Post-Ch.1 Epic', ch2Profile, true, 200),
  simulateChapterBossDepth(2, 'Ch.3 Post-Ch.2 [S]', ch3Profile, false, 200),
  simulateChapterBossDepth(2, 'Ch.3 Post-Ch.2 [S]', ch3Profile, true, 200),
];
for (const row of depthRows) {
  console.log(JSON.stringify(row));
}

// ============================================================================
// PART 6: CH.2 RUNE CHEST POLICY & PITY PRESERVATION (500 SEEDS)
// ============================================================================
console.log('\n=== 6. CH.2–3 RUNE CHEST POLICY & PITY VERIFICATION (500 SEEDS) ===');
let ch2LegendaryLeaks = 0;
let ch2EpicCount = 0;
let ch3LegendaryCount = 0;
let ch2TotalRolls = 0;
let ch3TotalRolls = 0;
const policyCh2Rune = getEarlyProgressionPolicy({
  highestChapterCleared: 1,
  bestStagePerChapter: { 1: 12, 2: 6 },
});
const policyCh3Rune = getEarlyProgressionPolicy({
  highestChapterCleared: 2,
  bestStagePerChapter: { 1: 12, 2: 12 },
});
for (let s = 0; s < 500; s++) {
  const rng = mulberry32(81000 + s * 17);
  const b2 = rollRuneChestBatch(
    true,
    10,
    { mythicRollsSinceEpic: 0, mythicRollsSinceSTier: 0, runeRollsSinceEpic: 0 },
    { policy: policyCh2Rune, rng }
  );
  ch2TotalRolls += b2.items.length;
  for (const r of b2.items) {
    if (r.rarity === Rarity.LEGENDARY) ch2LegendaryLeaks++;
    if (r.rarity === Rarity.EPIC) ch2EpicCount++;
  }
  const b3 = rollRuneChestBatch(true, 10, b2.nextPity, { policy: policyCh3Rune, rng });
  ch3TotalRolls += b3.items.length;
  for (const r of b3.items) {
    if (r.rarity === Rarity.LEGENDARY) ch3LegendaryCount++;
  }
}
console.log(
  JSON.stringify({
    seeds: 500,
    ch2TotalRolls,
    ch2EpicRatePct: Number(((ch2EpicCount / ch2TotalRolls) * 100).toFixed(2)),
    ch2LegendaryLeaks,
    ch3TotalRolls,
    ch3LegendaryRatePct: Number(((ch3LegendaryCount / ch3TotalRolls) * 100).toFixed(2)),
  })
);

// ============================================================================
// PART 7: PHASE 3 · CH.1–6 ON-CURVE BOSS COMBAT DEPTH (200 SEEDS EACH)
// ============================================================================
function buildMidGameProfile(
  base: SaveData,
  highestCleared: number,
  setTemplateIds: string[],
  rarity: Rarity,
  gearLevel: number,
  talentLevels: number,
  heroStar: number
): SaveData {
  const items: GearInstance[] = setTemplateIds.map((tplId, idx) => ({
    uid: `sim_ch${highestCleared}_${idx}_${tplId}`,
    templateId: tplId,
    rarity,
    level: gearLevel,
  }));
  const equipped: Partial<Record<GearSlot, string>> = { ...base.equipped };
  for (const item of items) {
    const tpl = GEAR_TEMPLATES[item.templateId];
    if (tpl) equipped[tpl.slot] = item.uid;
  }
  return {
    ...base,
    highestChapterCleared: highestCleared,
    inventory: [...base.inventory, ...items],
    equipped,
    heroStars: { ...(base.heroStars ?? {}), [base.selectedHeroId]: heroStar },
    talents: {
      ...(base.talents ?? {}),
      might: talentLevels,
      vitality: talentLevels,
      swift_bow: Math.max(1, Math.floor(talentLevels * 0.7)),
      eagle_eye: Math.max(1, Math.floor(talentLevels * 0.7)),
    },
  };
}

const ch4Profile = buildMidGameProfile(
  ch3Profile,
  3,
  ['s_leo_sunbow', 's_leo_aegis', 's_leo_signet', 'echo_amulet', 'titan_helm', 'echo_boots'],
  Rarity.EPIC,
  12,
  4,
  2
);
const ch5Profile = buildMidGameProfile(
  ch4Profile,
  4,
  ['s_leo_sunbow', 's_leo_aegis', 's_leo_signet', 's_sagittarius_ring', 's_oracle_crown', 's_oracle_boots'],
  Rarity.LEGENDARY,
  15,
  6,
  3
);
const ch6Profile = buildMidGameProfile(
  ch5Profile,
  5,
  ['s_leo_sunbow', 's_leo_aegis', 's_leo_signet', 's_griffin_pendant', 's_griffin_helm', 's_griffin_boots'],
  Rarity.LEGENDARY,
  20,
  8,
  4
);

console.log('\n=== 7. PHASE 3 · CH.4–6 ON-CURVE BOSS COMBAT DEPTH (BASE vs SET+SYNERGY+PUNISH, 200 SEEDS) ===');
const midGameDepthRows = [
  simulateChapterBossDepth(3, 'Ch.4 Epic+3pc [S] Lv12', ch4Profile, false, 200),
  simulateChapterBossDepth(3, 'Ch.4 Epic+3pc [S] Lv12', ch4Profile, true, 200),
  simulateChapterBossDepth(4, 'Ch.5 Leg+2Set Lv15', ch5Profile, false, 200),
  simulateChapterBossDepth(4, 'Ch.5 Leg+2Set Lv15', ch5Profile, true, 200),
  simulateChapterBossDepth(5, 'Ch.6 Leg+2x3pc [S] Lv20', ch6Profile, false, 200),
  simulateChapterBossDepth(5, 'Ch.6 Leg+2x3pc [S] Lv20', ch6Profile, true, 200),
];
for (const row of midGameDepthRows) {
  console.log(JSON.stringify(row));
}

// ============================================================================
// PART 8: PHASE 3 · 5 GEAR SET BONUS DELTAS & BOSS RUSH / DAILY RIFT SCALING
// ============================================================================
console.log('\n=== 8. PHASE 3 · 5 GEAR SET BONUS DELTA (FULL SET EPIC LV.10) ===');
for (const def of Object.values(GEAR_SET_DEFINITIONS)) {
  const bySlot = new Map<GearSlot, string>();
  for (const [tplId, t] of Object.entries(GEAR_TEMPLATES)) {
    if (t.setName === def.id && !bySlot.has(t.slot)) {
      bySlot.set(t.slot, tplId);
    }
  }
  const setIds = Array.from(bySlot.values()).slice(0, def.maxPieces);
  const withSetSave = buildMidGameProfile(fresh, 3, setIds, Rarity.EPIC, 10, 2, 1);
  const setEval = evaluateEquippedGearSets(withSetSave);
  const statsWithSet = computePlayerStats(withSetSave);
  console.log(
    JSON.stringify({
      setId: def.id,
      displayName: def.displayName,
      pieces: def.maxPieces,
      activeTiers: setEval.activeTierCount,
      bonuses: setEval.sets[0]?.unlockedTiers.map((t) => t.label) ?? [],
      atk: statsWithSet.attack,
      hp: statsWithSet.maxHp,
      expectedDps: computeExpectedDps(statsWithSet),
      powerRating: statsWithSet.powerRating,
    })
  );
}

console.log('\n=== 9. PHASE 3 · BOSS RUSH & DAILY RIFT SCALING (CH.0–6 CLEARED) ===');
for (let cleared = 0; cleared <= 6; cleared++) {
  const sc = getSideModeScaling(cleared);
  console.log(JSON.stringify({ highestChapterCleared: cleared, ...sc }));
}

// ============================================================================
// PART 10: PHASE 4 · CH.7–12 ENDGAME BOSS COMBAT DEPTH (200 SEEDS EACH)
// ============================================================================
function buildEndgameProfile(
  base: SaveData,
  highestCleared: number,
  setTemplateIds: string[],
  rarity: Rarity,
  gearLevel: number,
  talentLevels: number,
  heroStar: number,
  masteryLevel: number
): SaveData {
  const mid = buildMidGameProfile(
    base,
    highestCleared,
    setTemplateIds,
    rarity,
    gearLevel,
    talentLevels,
    heroStar
  );
  return {
    ...mid,
    heroMastery: {
      ...(mid.heroMastery ?? {}),
      [mid.selectedHeroId]: { level: masteryLevel, exp: 0, totalRuns: masteryLevel * 4 },
    },
  };
}

const ch7Profile = buildEndgameProfile(
  ch6Profile,
  6,
  ['dragon_knight_crossbow', 'dragon_plate', 'dragon_amulet', 'oracle_ring', 'astral_crown', 'griffin_boots'],
  Rarity.LEGENDARY,
  24,
  10,
  4,
  5
);
const ch8Profile = buildEndgameProfile(
  ch7Profile,
  7,
  ['dragon_knight_crossbow', 'dragon_plate', 'dragon_amulet', 'oracle_ring', 'astral_crown', 'griffin_boots'],
  Rarity.LEGENDARY,
  28,
  12,
  4,
  6
);
const ch9Profile = buildEndgameProfile(
  ch8Profile,
  8,
  ['dragon_knight_crossbow', 'dragon_plate', 'dragon_amulet', 'oracle_ring', 'astral_crown', 'griffin_boots'],
  Rarity.MYTHIC,
  30,
  14,
  5,
  7
);
const ch10Profile = buildEndgameProfile(
  ch9Profile,
  9,
  ['oracle_light_spear', 'dragon_plate', 'dragon_amulet', 'oracle_ring', 'astral_crown', 'griffin_boots'],
  Rarity.MYTHIC,
  36,
  16,
  5,
  8
);
const ch11Profile = buildEndgameProfile(
  ch10Profile,
  10,
  ['oracle_light_spear', 'dragon_plate', 'dragon_amulet', 'oracle_ring', 'astral_crown', 'griffin_boots'],
  Rarity.MYTHIC,
  42,
  18,
  5,
  9
);
const ch12Profile = buildEndgameProfile(
  ch11Profile,
  11,
  ['oracle_light_spear', 'dragon_plate', 'dragon_amulet', 'oracle_ring', 'astral_crown', 'griffin_boots'],
  Rarity.MYTHIC,
  48,
  20,
  5,
  10
);

console.log('\n=== 10. PHASE 4 · CH.7–12 ENDGAME BOSS DEPTH (BASE vs SET+MASTERY+SYNERGY+PUNISH, 200 SEEDS) ===');
const endgameSpecs: Array<{ idx: number; label: string; save: SaveData }> = [
  { idx: 6, label: 'Ch.7 Leg Lv24 · Mastery Lv5', save: ch7Profile },
  { idx: 7, label: 'Ch.8 Leg Lv28 · Mastery Lv6', save: ch8Profile },
  { idx: 8, label: 'Ch.9 Mythic Lv30 · Mastery Lv7', save: ch9Profile },
  { idx: 9, label: 'Ch.10 Mythic Lv36 · Mastery Lv8 (Phase III)', save: ch10Profile },
  { idx: 10, label: 'Ch.11 Mythic Lv42 · Mastery Lv9 (Phase III)', save: ch11Profile },
  { idx: 11, label: 'Ch.12 Mythic Lv48 · Mastery Lv10 (Phase III)', save: ch12Profile },
];

for (const spec of endgameSpecs) {
  const baseRow = simulateChapterBossDepth(spec.idx, spec.label, spec.save, false, 200);
  const synRow = simulateChapterBossDepth(spec.idx, spec.label, spec.save, true, 200);
  // Ch.10–12 final 25% HP grants Phase III +24% Punish Window bonus (extra blended TTK shave)
  const phase3AdjustedTtk =
    spec.idx >= 9
      ? Number((synRow.avgBossTtkSec / (1 + (PUNISH_WINDOW_PHASE3_BONUS - PUNISH_WINDOW_DAMAGE_BONUS) * 0.25)).toFixed(1))
      : synRow.avgBossTtkSec;
  console.log(
    JSON.stringify({
      chapter: `Ch.${spec.idx + 1}`,
      profile: spec.label,
      powerRating: computePlayerStats(spec.save).powerRating,
      baseTtkSec: baseRow.avgBossTtkSec,
      depthTtkSec: phase3AdjustedTtk,
      ttkReductionPct: Number((((baseRow.avgBossTtkSec - phase3AdjustedTtk) / baseRow.avgBossTtkSec) * 100).toFixed(1)),
    })
  );
}

// ============================================================================
// PART 11: PHASE 4 · ENDLESS TOWER (FLOORS 1–40) & HERO MASTERY LV.1–10 TABLE
// ============================================================================
console.log('\n=== 11. PHASE 4 · ENDLESS TOWER SCALING (FLOORS 1..40, CH.6 CLEARED) ===');
for (const floor of [1, 5, 10, 12, 15, 20, 30, 40]) {
  console.log(JSON.stringify(getEndlessTowerScaling(floor, 6)));
}

console.log('\n=== 12. PHASE 4 · HERO MASTERY LV.1–10 PROGRESSION TABLE ===');
for (const lv of [1, 2, 5, 8, 10]) {
  const mSave: SaveData = {
    ...fresh,
    heroMastery: { [fresh.selectedHeroId]: { level: lv, exp: 0, totalRuns: lv * 3 } },
  };
  const b = computeHeroMasteryBonuses(mSave.heroMastery, mSave.selectedHeroId);
  const st = computePlayerStats(mSave);
  console.log(
    JSON.stringify({
      level: lv,
      atkPct: b.atkPct,
      hpPct: b.hpPct,
      critChance: b.critChance,
      bossDamageBonus: b.bossDamageBonus,
      freshAtk: st.attack,
      freshHp: st.maxHp,
      freshCp: st.powerRating,
    })
  );
}

// ============================================================================
// PART 13: PHASE 5 · NIGHTMARE ASCENSION TIERS I–V SCALING & BOSS TTK TABLE
// ============================================================================
console.log('\n=== 13. PHASE 5 · NIGHTMARE ASCENSION TIERS I–V (CH.4 / CH.7 / CH.12) ===');
const nightmareBenchmarks: Array<{ chapterId: number; label: string; save: SaveData }> = [
  { chapterId: 4, label: 'Ch.4 Mid', save: ch4Profile },
  { chapterId: 7, label: 'Ch.7 Endgame', save: ch7Profile },
  { chapterId: 12, label: 'Ch.12 Pinnacle', save: ch12Profile },
];

for (const bm of nightmareBenchmarks) {
  const baseSyn = simulateChapterBossDepth(bm.chapterId - 1, bm.label, bm.save, true, 120);
  for (const tier of [0, 1, 2, 3, 4, 5]) {
    const cfg = getNightmareTierConfig(bm.chapterId, tier);
    // Double Punish mutator rewards clean dodges with extra ~6% blended TTK shave
    const punishRelief = cfg.punishBonusMult > 1 ? 0.94 : 1.0;
    const estTtk = Number((baseSyn.avgBossTtkSec * cfg.enemyHpMult * punishRelief).toFixed(1));
    console.log(
      JSON.stringify({
        chapter: `Ch.${bm.chapterId}`,
        tier: cfg.label,
        hpMult: cfg.enemyHpMult,
        dmgMult: cfg.enemyDmgMult,
        goldMult: cfg.goldRewardMult,
        dustMult: cfg.starDustRewardMult,
        masteryMult: cfg.masteryExpMult,
        mutators: cfg.mutators.map((m) => m.name),
        estBossTtkSec: estTtk,
      })
    );
  }
}

// ============================================================================
// PART 14: PHASE 5 · 8-HERO ACTIVE SKILL (E) + PERFECT DODGE DPS COMPARISON
// ============================================================================
console.log('\n=== 14. PHASE 5 · 8-HERO SIGNATURE ACTIVE SKILL (E) + PERFECT DODGE DPS ===');
// Standardized Ch.4 Epic build across all 8 heroes to measure pure kit + Active Skill E + Perfect Dodge uplift
for (const hero of HEROES) {
  const heroSave: SaveData = {
    ...ch4Profile,
    selectedHeroId: hero.id,
    unlockedHeroes: HEROES.map((h) => h.id),
  };
  const st = computePlayerStats(heroSave);
  const baseDps = computeExpectedDps(st);
  const skill = getHeroActiveSkill(hero.id);

  // Active Skill E direct burst + hero tactical buff averaged over cooldown (assuming 1 Perfect Dodge every 12s)
  const dodgeRatePerSec = 1 / 12;
  const effectiveCd = Math.max(
    4.5,
    skill.cooldownSec - PERFECT_DODGE_CD_REDUCTION * (skill.cooldownSec * dodgeRatePerSec)
  );
  const skillDirectDps = (st.attack * skill.damageMult * (1 + st.critChance * (st.critDamage - 1))) / effectiveCd;
  const utilityBuffUptime =
    skill.effectKind === 'valiant_cadence'
      ? (skill.durationSec ?? 3.5) / effectiveCd
      : skill.effectKind === 'moon_fan_mark'
      ? 3.0 / effectiveCd
      : skill.effectKind === 'cudgel_vault'
      ? (skill.durationSec ?? 3.5) / effectiveCd
      : 0;
  const utilityDpsMult =
    skill.effectKind === 'valiant_cadence'
      ? 1 + 0.28 * utilityBuffUptime
      : skill.effectKind === 'moon_fan_mark'
      ? 1 + 0.2 * utilityBuffUptime
      : skill.effectKind === 'cudgel_vault'
      ? 1 + 0.14 * utilityBuffUptime
      : 1;
  const activeSkillDps = Math.round(baseDps * utilityDpsMult + skillDirectDps);

  // Perfect Dodge +20% counter damage uptime (~2.2s every 12s -> +3.7% sustained + faster Skill E rotation)
  const dodgeUptime = Math.min(0.45, PERFECT_DODGE_BUFF_DURATION * dodgeRatePerSec);
  const withPerfectDodgeDps = Math.round(activeSkillDps * (1 + PERFECT_DODGE_DAMAGE_BONUS * dodgeUptime));
  const upliftPct = Number((((withPerfectDodgeDps - baseDps) / Math.max(1, baseDps)) * 100).toFixed(1));

  console.log(
    JSON.stringify({
      heroId: hero.id,
      heroName: hero.name,
      activeSkill: skill.name,
      cooldownSec: skill.cooldownSec,
      baseDps: Math.round(baseDps),
      withActiveSkillDps: activeSkillDps,
      withPerfectDodgeDps,
      totalUpliftPct: upliftPct,
    })
  );
}





import assert from 'node:assert/strict';
import test from 'node:test';
import { computePlayerStats, createInitialSaveData } from './gearData';
import { analyzeCombatPower, previewLobbyClaimAll } from './wave12Data';
import {
  ASTRAL_STEED_DEFS,
  CARNIVAL_7DAY_TASKS,
  DRAGON_LAIR_MILESTONES,
  EVOLVING_FIRST_TOPUP_TIERS,
  LOBBY_WEATHER_DEFS,
  ROYAL_DUTCH_DROP_INTERVAL_MS,
  ROYAL_DUTCH_LOTS,
  SOUL_RING_DEFS,
  STARLIGHT_RACE_MILESTONES,
  TOP_SERVER_PROFILES,
  VIP_AVATAR_FRAME_DEFS,
  computeSoulRingBonuses,
  computeVipFrameBonuses,
  countClaimableCarnivalRewards,
  countClaimableDragonLairMilestones,
  countClaimableStarlightMilestones,
  fuseSpiritJades,
  getAstralSteedStats,
  getDutchLotLivePrice,
  normalizeCarnival7Day,
  normalizeDragonLair,
  normalizeRoyalBlindBox,
  normalizeSoulRings,
  resolveBlindBoxOpen,
  simulateStarlightSprint,
} from './wave13Data';

test('Wave 13: Astral Steeds are pruned and Starlight Race sprint runs cleanly with Hắc Long', () => {
  assert.equal(ASTRAL_STEED_DEFS.length, 0);
  const zeroStats = getAstralSteedStats(null, 1);
  assert.equal(zeroStats.atkPct, 0);
  assert.equal(zeroStats.hpPct, 0);

  const sprint = simulateStarlightSprint(null, 1, 0.5);
  assert.ok(sprint.lapTimeSec > 0);
  assert.ok(sprint.pointsEarned > 0);
});

test('Wave 13: 3->1 Spirit Jade Fusion & Multi-Tier Soul Rings Resonance compute accurately', () => {
  assert.equal(SOUL_RING_DEFS.length, 5);
  const initial = normalizeSoulRings({
    levels: {
      ring_silver: 4,
      ring_gold: 4,
      ring_amethyst: 4,
      ring_crimson: 3,
      ring_aurora: 1,
    },
    spiritJades: [10, 1, 0, 0, 0],
    totalFusions: 0,
  });

  const fused = fuseSpiritJades(initial, 1, 3);
  assert.equal(fused.fusedCount, 3);
  assert.deepEqual(fused.nextState.spiritJades, [1, 4, 0, 0, 0]);
  assert.equal(fused.nextState.totalFusions, 3);

  const bonuses = computeSoulRingBonuses(fused.nextState);
  assert.equal(bonuses.totalLevel, 16);
  assert.equal(bonuses.activeResonanceTitle, 'Cộng Hưởng Ngũ Hồn II');
  assert.ok(bonuses.atkPct > 0.5);
  assert.ok(bonuses.critDmg > 0.3);
});

test('Wave 13: Royal Dutch Auction drops live price every 15s and respects floor price', () => {
  const lot = ROYAL_DUTCH_LOTS[0];
  const startedAt = 1_000_000;
  const p0 = getDutchLotLivePrice(lot, startedAt, startedAt);
  assert.equal(p0.currentGems, lot.startGems);
  assert.equal(p0.isAtFloor, false);

  const p2 = getDutchLotLivePrice(lot, startedAt, startedAt + ROYAL_DUTCH_DROP_INTERVAL_MS * 2 + 100);
  assert.equal(p2.currentGems, lot.startGems - lot.dropStepGems * 2);
  assert.ok(p2.discountPct > 0);

  const pLate = getDutchLotLivePrice(lot, startedAt, startedAt + ROYAL_DUTCH_DROP_INTERVAL_MS * 50);
  assert.equal(pLate.currentGems, lot.floorGems);
  assert.equal(pLate.isAtFloor, true);
});

test('Wave 13: 9-Box Royal Blind Box guarantees Mythic Grand Prize at grandPrizeIndex', () => {
  let state = normalizeRoyalBlindBox({
    cycleNumber: 1,
    grandPrizeIndex: 4,
    openedBoxes: {},
    totalBoxesOpened: 0,
    sessionEndsAt: Date.now() + 60_000,
  });

  let grandFound = false;
  for (let i = 0; i < 9; i++) {
    const res = resolveBlindBoxOpen(state, i);
    state = res.nextState;
    if (i === 4) {
      assert.equal(res.reward.isGrandPrize, true);
      assert.equal(res.reward.rarity, 'mythic');
      assert.equal(res.reward.rewardGems, 120);
      grandFound = true;
    } else {
      assert.equal(res.reward.isGrandPrize, false);
    }
  }
  assert.equal(grandFound, true);
  assert.equal(state.totalBoxesOpened, 9);
});

test('Wave 13: Soul Rings and Animated VIP Frames raise computePlayerStats & CP breakdown', () => {
  const base = createInitialSaveData();
  const baseStats = computePlayerStats(base);

  const boosted = createInitialSaveData();
  boosted.unlockedVipFrames = ['vip_royal_gold', 'vip_dragon_soul'];
  boosted.equippedVipFrameId = 'vip_dragon_soul';
  boosted.soulRings = {
    levels: {
      ring_silver: 6,
      ring_gold: 5,
      ring_amethyst: 4,
      ring_crimson: 3,
      ring_aurora: 2,
    },
    spiritJades: [0, 0, 0, 0, 0],
    totalFusions: 8,
  };

  const vipBonuses = computeVipFrameBonuses(boosted);
  assert.ok(vipBonuses.atk >= 175);
  assert.ok(vipBonuses.hp >= 1000);

  const boostedStats = computePlayerStats(boosted);
  assert.ok(boostedStats.attack > baseStats.attack);
  assert.ok(boostedStats.maxHp > baseStats.maxHp);
  assert.ok(boostedStats.powerRating > baseStats.powerRating);

  const cpReport = analyzeCombatPower(boosted, boostedStats.powerRating);
  assert.equal(cpReport.categories.length, 6);
});

test('Wave 13: 7-Day Carnival, Starlight Race, Dragon Lair milestones flow into previewLobbyClaimAll', () => {
  assert.equal(LOBBY_WEATHER_DEFS.length, 5);
  assert.equal(VIP_AVATAR_FRAME_DEFS.length, 4);
  assert.equal(EVOLVING_FIRST_TOPUP_TIERS.length, 3);
  assert.equal(TOP_SERVER_PROFILES.length, 3);
  assert.ok(CARNIVAL_7DAY_TASKS.length >= 10);

  const save = createInitialSaveData();
  save.highestChapterCleared = 2;
  save.carnival7Day = normalizeCarnival7Day(save.carnival7Day);
  save.starlightRace = {
    date: save.carnival7Day.lastLoginDate,
    dailyRunsRemaining: 2,
    totalRacePoints: STARLIGHT_RACE_MILESTONES[0].pointsTarget + 50,
    bestLapTimeSec: 19.5,
    claimedMilestones: [],
    lastRaceLog: '',
  };
  save.dragonLair = {
    ...normalizeDragonLair(save.dragonLair),
    totalScalesEarned: DRAGON_LAIR_MILESTONES[0].scalesTarget + 4,
    claimedMilestones: [],
  };

  assert.ok(countClaimableCarnivalRewards(save) >= 1);
  assert.equal(countClaimableStarlightMilestones(save), 1);
  assert.equal(countClaimableDragonLairMilestones(save), 1);

  const claimAll = previewLobbyClaimAll(save);
  const sourceIds = new Set(claimAll.sources.map((item) => item.id));
  assert.ok(sourceIds.has('carnival_7day'));
  assert.ok(sourceIds.has('starlight_race'));
  assert.ok(sourceIds.has('dragon_lair'));
});

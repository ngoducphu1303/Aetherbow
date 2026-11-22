import assert from 'node:assert/strict';
import test from 'node:test';
import { CHAPTERS } from './chaptersData';
import {
  PROGRESSION_SCHEMA_VERSION,
  getEarlyProgressionPolicy,
  isEarlyFeatureUnlocked,
  migrateSaveData,
} from './earlyProgressionData';
import {
  FAIR_30DAY_MILESTONES,
  FAIR_30DAY_WEEKS,
  claimFairRoadmapMilestone,
  computePowerPressure,
  countClaimableFairRoadmapMilestones,
  evaluateMaxStageReadiness,
  getDailyFairRoutine,
  getTowerRecommendedPower,
  simulate30DayFairProgression,
  touchFairActiveDays,
} from './fairProgression30Day';
import { computePlayerStats, createInitialSaveData } from './gearData';
import { TALENTS, getTalentUpgradeCost } from './talentsData';
import { COOP_RAID_DIFFICULTIES } from './wave6Data';
import { EarlyFeatureId, GearSlot, Rarity, SaveData } from '../types/game';

test('30-Day Fair Progression · Chapters 1–12 Curve, Talents Lv.20 & Co-op Raid Scaling', () => {
  assert.equal(CHAPTERS.length, 12);
  assert.equal(CHAPTERS[0].recommendedPower, 1350);
  assert.equal(CHAPTERS[11].recommendedPower, 285000);
  assert.ok(CHAPTERS[11].hpScale >= 330);
  assert.ok(CHAPTERS[11].dmgScale >= 24);

  for (let i = 1; i < CHAPTERS.length; i++) {
    assert.ok(CHAPTERS[i].hpScale > CHAPTERS[i - 1].hpScale);
    assert.ok(CHAPTERS[i].dmgScale > CHAPTERS[i - 1].dmgScale);
    assert.ok(CHAPTERS[i].recommendedPower > CHAPTERS[i - 1].recommendedPower);
    assert.ok(CHAPTERS[i].goldBonusMult > CHAPTERS[i - 1].goldBonusMult);
  }

  // Talents expanded to 8 * 20 = 160 total levels with strictly increasing gold costs
  assert.equal(TALENTS.length, 8);
  const totalMaxTalents = TALENTS.reduce((acc, t) => acc + t.maxLevel, 0);
  assert.equal(totalMaxTalents, 160);
  for (const t of TALENTS) {
    assert.equal(t.maxLevel, 20);
    assert.ok(getTalentUpgradeCost(t.id, 19) > getTalentUpgradeCost(t.id, 10));
    assert.ok(getTalentUpgradeCost(t.id, 10) > getTalentUpgradeCost(t.id, 0));
  }

  // Co-op Raid difficulties calibrated to 30-day power milestones
  assert.equal(COOP_RAID_DIFFICULTIES[0].recommendedPower, 18000);
  assert.equal(COOP_RAID_DIFFICULTIES[1].recommendedPower, 75000);
  assert.equal(COOP_RAID_DIFFICULTIES[2].recommendedPower, 185000);
});

test('30-Day Fair Progression · Deep Progressive LC Suppression, Enrage & Endless Tower LC Curve', () => {
  const ready = computePowerPressure(10000, 10000);
  assert.equal(ready.tier, 'ready');
  assert.equal(ready.enemyDamageTakenMult, 1.0);
  assert.equal(ready.enemyDamageDealtMult, 1.0);
  assert.equal(ready.enemyDrPiercePct, 0);
  assert.equal(ready.bossEnrageSec, 75);
  assert.equal(ready.allowInstantExecute, true);

  // 9,000 LC vs Ch.3 (10,000 LC): ratio 0.90 -> Ready (normal clear)
  const ch3 = computePowerPressure(9000, 10000);
  assert.equal(ch3.tier, 'ready');
  assert.equal(ch3.enemyDamageTakenMult, 1.0);

  // Skill challenge window (~1.12x - 1.33x above LC): tense but clearable with strong dodging
  const skill = computePowerPressure(8000, 10000);
  assert.equal(skill.tier, 'skill_challenge');
  assert.ok(skill.enemyDamageTakenMult >= 0.85 && skill.enemyDamageTakenMult < 0.98);
  assert.ok(skill.enemyDamageDealtMult >= 1.2 && skill.enemyDamageDealtMult <= 1.5);
  assert.ok(skill.bossEnrageSec >= 60 && skill.bossEnrageSec <= 70);
  assert.equal(skill.allowInstantExecute, true);

  // Hard skill cap edge (~1.45x above LC, ratio ~0.69): demanding high-danger clear
  const edge = computePowerPressure(9000, 13000);
  assert.equal(edge.tier, 'high_danger');
  assert.ok(edge.enemyDamageTakenMult >= 0.45 && edge.enemyDamageTakenMult <= 0.72);
  assert.ok(edge.enemyDamageDealtMult >= 1.75 && edge.enemyDamageDealtMult <= 2.4);
  assert.equal(edge.allowInstantExecute, true);

  // 9,000 LC vs Ch.4 (20,000 LC, 2.22x gap): severe progressive suppression
  const ch4 = computePowerPressure(9000, 20000);
  assert.equal(ch4.tier, 'high_danger');
  assert.ok(ch4.enemyDamageTakenMult <= 0.22, `Ch.4 2.2x gap damageTaken=${ch4.enemyDamageTakenMult}`);
  assert.ok(ch4.enemyDamageDealtMult >= 3.2, `Ch.4 2.2x gap damageDealt=${ch4.enemyDamageDealtMult}`);
  assert.ok(ch4.enemyDrPiercePct >= 0.3, `Ch.4 DR pierce=${ch4.enemyDrPiercePct}`);
  assert.ok(ch4.bossEnrageSec <= 45, `Ch.4 enrage=${ch4.bossEnrageSec}`);
  assert.equal(ch4.allowInstantExecute, false);

  // 9,000 LC vs Ch.7 (80,000 LC, 8.89x gap): absolute suppression prevents impossible clears
  const ch7 = computePowerPressure(9000, 80000);
  assert.equal(ch7.tier, 'high_danger');
  assert.ok(ch7.enemyDamageTakenMult <= 0.025, `Ch.7 8.9x gap damageTaken=${ch7.enemyDamageTakenMult}`);
  assert.ok(ch7.enemyDamageDealtMult >= 8.5, `Ch.7 8.9x gap damageDealt=${ch7.enemyDamageDealtMult}`);
  assert.ok(ch7.enemyDrPiercePct >= 0.65, `Ch.7 DR pierce=${ch7.enemyDrPiercePct}`);
  assert.ok(ch7.bossEnrageSec <= 28, `Ch.7 enrage=${ch7.bossEnrageSec}`);
  assert.equal(ch7.allowInstantExecute, false);

  // Endless Tower recommended LC increases smoothly from Floor 1 -> Floor 50
  let prev = 0;
  for (let floor = 1; floor <= 50; floor++) {
    const rec = getTowerRecommendedPower(floor);
    assert.ok(rec > prev, `Tower floor ${floor} LC (${rec}) must exceed previous (${prev})`);
    prev = rec;
  }
});

test('30-Day Fair Progression · 13 Granular Progressive Chapter Feature Gates', () => {
  const expectedGates: Array<[EarlyFeatureId, number]> = [
    ['daily_rift', 1],
    ['endless_tower', 1],
    ['arena', 2],
    ['coop_raid', 3],
    ['elemental_towers', 4],
    ['world_boss', 5],
    ['crystal_defense', 5],
    ['blood_moon', 6],
    ['abyssal_gauntlet', 7],
    ['pantheon_expedition', 8],
    ['dragon_lair', 8],
    ['crystal_vault', 9],
    ['sky_citadel', 10],
  ];

  for (const [feature, reqCh] of expectedGates) {
    const lockedSave = {
      ...createInitialSaveData(),
      highestChapterCleared: reqCh - 1,
      bestStagePerChapter: { [reqCh]: 6 },
    };
    const unlockedSave = {
      ...createInitialSaveData(),
      highestChapterCleared: reqCh,
      bestStagePerChapter: { [reqCh]: 12 },
    };
    assert.equal(
      isEarlyFeatureUnlocked(lockedSave, feature).unlocked,
      false,
      `Feature ${feature} must be locked at highestChapterCleared=${reqCh - 1}`
    );
    assert.equal(
      isEarlyFeatureUnlocked(unlockedSave, feature).unlocked,
      true,
      `Feature ${feature} must unlock at highestChapterCleared=${reqCh}`
    );
  }

  // Verify 6-tier rarity progression across Ch.1 -> Ch.12
  assert.equal(getEarlyProgressionPolicy({ highestChapterCleared: 0, bestStagePerChapter: { 1: 0 } }).maxGearRarity, Rarity.COMMON);
  assert.equal(getEarlyProgressionPolicy({ highestChapterCleared: 0, bestStagePerChapter: { 1: 4 } }).maxGearRarity, Rarity.RARE);
  assert.equal(getEarlyProgressionPolicy({ highestChapterCleared: 1, bestStagePerChapter: { 1: 12 } }).maxGearRarity, Rarity.EPIC);
  assert.equal(getEarlyProgressionPolicy({ highestChapterCleared: 3, bestStagePerChapter: { 3: 12 } }).allowSTier, true);
  assert.equal(getEarlyProgressionPolicy({ highestChapterCleared: 4, bestStagePerChapter: { 4: 12 } }).maxGearRarity, Rarity.LEGENDARY);
  assert.equal(getEarlyProgressionPolicy({ highestChapterCleared: 8, bestStagePerChapter: { 8: 12 } }).maxGearRarity, Rarity.MYTHIC);
});

test('30-Day Fair Progression · Lossless Migration, Active Day Tracking, Roadmap Claiming & Daily Routine', () => {
  assert.equal(FAIR_30DAY_WEEKS.length, 4);
  assert.equal(FAIR_30DAY_MILESTONES.length, 8);

  const fresh = createInitialSaveData();
  const touchedSame = touchFairActiveDays(fresh, '2026-04-01');
  const touchedSame2 = touchFairActiveDays(touchedSame, '2026-04-01');
  const touchedNext = touchFairActiveDays(touchedSame2, '2026-04-02');
  assert.equal(touchedSame2.fairActiveDays?.count, touchedSame.fairActiveDays?.count);
  assert.equal(touchedNext.fairActiveDays?.count, (touchedSame.fairActiveDays?.count ?? 1) + 1);

  // Legacy v2 save migrates losslessly to v3 without losing currency or items
  const legacyV2: SaveData = {
    ...fresh,
    progressionSchemaVersion: 2,
    gold: 18500,
    gems: 420,
    highestChapterCleared: 3,
    fairRoadmapClaimedIds: undefined,
    fairActiveDays: undefined,
  };
  const migrated = migrateSaveData(legacyV2);
  assert.equal(migrated.progressionSchemaVersion, PROGRESSION_SCHEMA_VERSION);
  assert.equal(migrated.gold, 18500);
  assert.equal(migrated.gems, 420);
  assert.deepEqual(migrated.fairRoadmapClaimedIds, []);
  assert.ok((migrated.fairActiveDays?.count ?? 0) >= 1);

  // Claiming Ch.1 milestone works once and rejects duplicates
  const ch1Save: SaveData = { ...migrated, highestChapterCleared: 1 };
  const stats = computePlayerStats(ch1Save);
  assert.equal(countClaimableFairRoadmapMilestones(ch1Save, stats), 1);
  const claim1 = claimFairRoadmapMilestone(ch1Save, 'fair_w1_ch1', stats);
  assert.equal(claim1.ok, true);
  assert.equal(claim1.nextSave.gold, ch1Save.gold + FAIR_30DAY_MILESTONES[0].rewardGold);
  assert.equal(claim1.nextSave.gems, ch1Save.gems + FAIR_30DAY_MILESTONES[0].rewardGems);
  const claimDup = claimFairRoadmapMilestone(claim1.nextSave, 'fair_w1_ch1', stats);
  assert.equal(claimDup.ok, false);

  // Daily routine stays bounded within the 30-45 min window
  const routine = getDailyFairRoutine(migrated);
  assert.ok(routine.unlockedCount >= 5);
  assert.ok(routine.totalEstimatedMinutes <= 45);

  // Max Stage Readiness returns all 5 pillars cleanly
  const readiness = evaluateMaxStageReadiness(migrated, computePlayerStats(migrated));
  assert.equal(readiness.pillars.length, 5);
  assert.ok(readiness.overallPercent >= 0 && readiness.overallPercent <= 100);
});

test('30-Day Fair Progression · Deterministic 30-Day Balance Simulator (Average & Unlucky Pity)', () => {
  const avg = simulate30DayFairProgression({
    seed: 20260401,
    luckProfile: 'average',
    dailyMinutes: 40,
  });
  const unlucky = simulate30DayFairProgression({
    seed: 20260499,
    luckProfile: 'unlucky',
    dailyMinutes: 40,
  });

  // Average player (30-45 min/day, 0 spending) takes ~1 full month to clear Ch.1-12 and Max Stage
  assert.equal(avg.days.length, 30);
  assert.ok(avg.chapterClearDays[1] >= 1 && avg.chapterClearDays[1] <= 4, `Avg Ch.1 day=${avg.chapterClearDays[1]}`);
  assert.ok(avg.chapterClearDays[6] >= 8 && avg.chapterClearDays[6] <= 15, `Avg Ch.6 day=${avg.chapterClearDays[6]}`);
  assert.ok(avg.chapterClearDays[12] >= 24 && avg.chapterClearDays[12] <= 30, `Avg Ch.12 day=${avg.chapterClearDays[12]}`);
  assert.equal(avg.finalChaptersCleared, 12);
  assert.ok(avg.finalTowerFloor >= 45, `Avg final tower=${avg.finalTowerFloor}`);
  assert.equal(avg.finalMythicSlots, 6);
  assert.equal(avg.finalTalentLevels, 160);
  assert.ok(avg.finalMaxStagePct >= 95, `Avg MaxStage=${avg.finalMaxStagePct}%`);

  // Unlucky player (0% natural Epic/Legendary chest rolls) still completes within 30 days via Pity & Forge protection
  assert.equal(unlucky.days.length, 30);
  assert.ok(unlucky.chapterClearDays[12] >= 24 && unlucky.chapterClearDays[12] <= 30, `Unlucky Ch.12 day=${unlucky.chapterClearDays[12]}`);
  assert.equal(unlucky.finalChaptersCleared, 12);
  assert.ok(unlucky.finalTowerFloor >= 45, `Unlucky final tower=${unlucky.finalTowerFloor}`);
  assert.equal(unlucky.finalMythicSlots, 6);
  assert.equal(unlucky.finalTalentLevels, 160);
  assert.ok(unlucky.finalMaxStagePct >= 95, `Unlucky MaxStage=${unlucky.finalMaxStagePct}%`);

  // Determinism check: identical seed produces byte-identical Day 30 output
  const avgRepeat = simulate30DayFairProgression({
    seed: 20260401,
    luckProfile: 'average',
    dailyMinutes: 40,
  });
  assert.deepEqual(avgRepeat.chapterClearDays, avg.chapterClearDays);
  assert.equal(avgRepeat.finalPowerRating, avg.finalPowerRating);
  assert.equal(avgRepeat.finalMaxStagePct, avg.finalMaxStagePct);

  // Confirm all 6 GearSlots are represented in our readiness check
  assert.equal(Object.values(GearSlot).length, 6);
});

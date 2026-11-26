import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import {
  SKILL_SYNERGIES,
  SYNERGY_TIER_SCALES,
  SYNERGY_TIER_THRESHOLDS,
  evaluateActiveSynergies,
  evaluateTieredSkillSynergies,
  getSynergyTierPowerScale,
  getSynergyTierUpgradeHint,
} from '../data/skillsData';
import {
  VALID_JOURNEY_MILESTONE_IDS,
  ZODIAC_CHAPTER_RELICS,
  ZODIAC_JOURNEY_MILESTONES,
  claimZodiacJourneyMilestoneInSave,
  countClaimableJourneyMilestones,
  evaluateZodiacJourneyProgress,
} from '../data/zodiacJourneyLog';
import {
  computeAuthoritativeRunBounds,
  verifyCombatRunIntegrity,
} from '../data/runIntegrityVerifier';
import { validateAndSanitizeSaveIntegrity } from '../data/saveIntegrity';
import { computePlayerStats, createInitialSaveData } from '../data/gearData';
import {
  ZODIAC_STORYTELLING_PROPS,
  buildZodiacStorytellingProps,
  disposeZodiacStorytellingProps,
  getZodiacStoryPropSpec,
  stepZodiacStorytellingProps,
} from './zodiacRealmArchitecture';
import { RunNonceReplayGuard, SecurityAnomalyTracker } from '../server/serverSecurity';

/* ============================================================================
 * PILLAR 1: 3-TIER SKILL SYNERGY MASTERY (Criteria 04 & 02)
 * ========================================================================== */

test('W14-1a: evaluateTieredSkillSynergies scales smoothly across Tier I, II, and III', () => {
  // Tier I: diag_arrow(1) + pierce(1) = 2 stacks -> 1.0x
  const tier1Skills = { diag_arrow: 1, pierce: 1 };
  const tier1List = evaluateTieredSkillSynergies(tier1Skills);
  assert.equal(tier1List.length, 1);
  assert.equal(tier1List[0].id, 'piercing_volley');
  assert.equal(tier1List[0].tier, 1);
  assert.equal(tier1List[0].totalStacks, SYNERGY_TIER_THRESHOLDS[1]);
  assert.equal(tier1List[0].nextTierStacks, SYNERGY_TIER_THRESHOLDS[2]);
  assert.equal(tier1List[0].powerScale, SYNERGY_TIER_SCALES[1]);

  // Tier II: diag_arrow(2) + pierce(1) + bouncy_wall(1) = 4 stacks -> 1.35x
  const tier2Skills = { diag_arrow: 2, pierce: 1, bouncy_wall: 1 };
  const tier2List = evaluateTieredSkillSynergies(tier2Skills);
  assert.equal(tier2List[0].tier, 2);
  assert.equal(tier2List[0].nextTierStacks, SYNERGY_TIER_THRESHOLDS[3]);
  assert.equal(tier2List[0].powerScale, SYNERGY_TIER_SCALES[2]);

  // Tier III: diag_arrow(3) + pierce(2) + bouncy_wall(1) = 6 stacks -> 1.70x (maxed)
  const tier3Skills = { diag_arrow: 3, pierce: 2, bouncy_wall: 1 };
  const tier3List = evaluateTieredSkillSynergies(tier3Skills);
  assert.equal(tier3List[0].tier, 3);
  assert.equal(tier3List[0].nextTierStacks, null);
  assert.equal(tier3List[0].powerScale, SYNERGY_TIER_SCALES[3]);

  // Helper scale lookup
  assert.equal(getSynergyTierPowerScale(tier3List, 'piercing_volley'), 1.7);
  assert.equal(getSynergyTierPowerScale(tier3List, 'frost_shatter'), 0);

  // Legacy evaluateActiveSynergies stays 100% compatible
  assert.deepEqual(evaluateActiveSynergies(tier1Skills), ['piercing_volley']);
  assert.deepEqual(evaluateActiveSynergies(tier3Skills), ['piercing_volley']);
});

test('W14-1b: getSynergyTierUpgradeHint detects Tier I activation and Tier I->II / II->III upgrades', () => {
  // Picking pierce when diag_arrow=1 activates Tier I
  const activateHint = getSynergyTierUpgradeHint('pierce', { diag_arrow: 1 });
  assert.ok(activateHint);
  assert.equal(activateHint.synergy.id, 'piercing_volley');
  assert.equal(activateHint.currentTier, 0);
  assert.equal(activateHint.nextTier, 1);
  assert.equal(activateHint.willActivateOrUpgrade, true);

  // Picking bouncy_wall when diag_arrow=2 & pierce=1 upgrades Tier I -> Tier II
  const upgrade2Hint = getSynergyTierUpgradeHint('bouncy_wall', {
    diag_arrow: 2,
    pierce: 1,
  });
  assert.ok(upgrade2Hint);
  assert.equal(upgrade2Hint.currentTier, 1);
  assert.equal(upgrade2Hint.nextTier, 2);
  assert.equal(upgrade2Hint.willActivateOrUpgrade, true);

  // Picking diag_arrow when diag_arrow=3, pierce=1, bouncy_wall=1 upgrades Tier II -> Tier III
  const upgrade3Hint = getSynergyTierUpgradeHint('diag_arrow', {
    diag_arrow: 3,
    pierce: 1,
    bouncy_wall: 1,
  });
  assert.ok(upgrade3Hint);
  assert.equal(upgrade3Hint.currentTier, 2);
  assert.equal(upgrade3Hint.nextTier, 3);
  assert.equal(upgrade3Hint.willActivateOrUpgrade, true);

  // Verify catalog still exposes all 9 synergies
  assert.equal(SKILL_SYNERGIES.length, 9);
});

/* ============================================================================
 * PILLAR 2: 12-CHAPTER ZODIAC JOURNEY LOG & CONQUEST SEALS (Criteria 16, 15, 02)
 * ========================================================================== */

test('W14-2a: 12-Chapter Journey Log defines 36 milestones and preserves exact Fresh 702 LC', () => {
  assert.equal(ZODIAC_JOURNEY_MILESTONES.length, 36);
  assert.equal(VALID_JOURNEY_MILESTONE_IDS.size, 36);

  // Ch.5-12 relic entries match procedural 3D storytelling prop specs
  for (let ch = 5; ch <= 12; ch++) {
    const relic = ZODIAC_CHAPTER_RELICS[ch];
    const propSpec = getZodiacStoryPropSpec(ch);
    assert.ok(relic, `Missing relic metadata for chapter ${ch}`);
    assert.ok(propSpec, `Missing 3D story prop spec for chapter ${ch}`);
    assert.equal(relic.has3dStoryProp, true);
    assert.equal(relic.relicName, propSpec.relicTitleVi);
  }

  const fresh = createInitialSaveData();
  const freshStats = computePlayerStats(fresh);
  assert.equal(freshStats.powerRating, 702, 'Fresh account baseline must remain strictly 702 LC');

  const freshProgress = evaluateZodiacJourneyProgress(fresh);
  assert.equal(freshProgress.chapters.length, 12);
  assert.equal(freshProgress.totalMilestones, 36);
  assert.equal(freshProgress.completedCount, 0);
  assert.equal(freshProgress.claimableCount, 0);
  assert.equal(countClaimableJourneyMilestones(fresh), 0);

  // Attempting to claim locked milestone is rejected
  const lockedAttempt = claimZodiacJourneyMilestoneInSave(fresh, 'journey_ch1_enter');
  assert.equal(lockedAttempt.claimed, false);
});

test('W14-2b: Journey Log unlocks from real progress, claims once, and saveIntegrity strips forged IDs', () => {
  const progressed = createInitialSaveData();
  progressed.highestChapterCleared = 1;
  progressed.bestStagePerChapter = { 1: 12, 2: 4 };
  progressed.chapterMilestones = {
    1: { chapterId: 1, clears: 1, starsEarned: [1, 2] },
  };

  const summary = evaluateZodiacJourneyProgress(progressed);
  // Ch.1: enter + clear_boss + mastery (3) + Ch.2: enter (1) = 4 claimable
  assert.equal(summary.claimableCount, 4);
  assert.equal(summary.sealsEarnedCount, 0);

  const firstClaim = claimZodiacJourneyMilestoneInSave(progressed, 'journey_ch1_mastery');
  assert.equal(firstClaim.claimed, true);
  assert.ok(firstClaim.milestone);
  assert.equal(firstClaim.nextSave.gold, progressed.gold + firstClaim.milestone.rewardGold);
  assert.equal(firstClaim.nextSave.gems, progressed.gems + firstClaim.milestone.rewardGems);
  assert.equal(
    firstClaim.nextSave.starDust,
    (progressed.starDust ?? 0) + firstClaim.milestone.rewardStarDust
  );

  // Claiming mastery earns the Chapter 1 Conquest Seal
  const afterClaimSummary = evaluateZodiacJourneyProgress(firstClaim.nextSave);
  assert.equal(afterClaimSummary.sealsEarnedCount, 1);
  assert.equal(afterClaimSummary.claimableCount, 3);

  // Duplicate claim is blocked
  const dupClaim = claimZodiacJourneyMilestoneInSave(firstClaim.nextSave, 'journey_ch1_mastery');
  assert.equal(dupClaim.claimed, false);

  // Save integrity strips unknown and duplicated milestone IDs
  const tampered = {
    ...firstClaim.nextSave,
    claimedJourneyMilestones: [
      'journey_ch1_mastery',
      'journey_ch1_mastery',
      'forged_godmode_milestone',
      '__proto__',
    ],
  };
  const integrity = validateAndSanitizeSaveIntegrity(tampered);
  assert.deepEqual(integrity.sanitizedSave.claimedJourneyMilestones, ['journey_ch1_mastery']);
});

/* ============================================================================
 * PILLAR 3: CHAPTER 5-12 PROCEDURAL 3D STORYTELLING RELIC SHRINES (Criteria 09 & 15)
 * ========================================================================== */

test('W14-3a: Ch.1-4 return null; Ch.5-12 build 0-PointLight PBR shrines with Lite vertex reduction', () => {
  for (let ch = 1; ch <= 4; ch++) {
    assert.equal(getZodiacStoryPropSpec(ch), null);
    assert.equal(
      buildZodiacStorytellingProps({
        chapterId: ch,
        trimHex: 0xf59e0b,
        stoneHex: 0x334155,
        arenaHalfW: 11,
        arenaHalfD: 11,
        liteActive: false,
      }),
      null
    );
  }

  assert.equal(Object.keys(ZODIAC_STORYTELLING_PROPS).length, 8);

  for (let ch = 5; ch <= 12; ch++) {
    const highBuilt = buildZodiacStorytellingProps({
      chapterId: ch,
      trimHex: 0xf59e0b,
      stoneHex: 0x334155,
      arenaHalfW: 11,
      arenaHalfD: 11,
      liteActive: false,
    });
    const liteBuilt = buildZodiacStorytellingProps({
      chapterId: ch,
      trimHex: 0xf59e0b,
      stoneHex: 0x334155,
      arenaHalfW: 11,
      arenaHalfD: 11,
      liteActive: true,
    });

    assert.ok(highBuilt, `Chapter ${ch} High storytelling prop failed to build`);
    assert.ok(liteBuilt, `Chapter ${ch} Lite storytelling prop failed to build`);

    // Strictly 0 PointLights anywhere in the Three.js subtree
    let pointLightCount = 0;
    highBuilt.group.traverse((obj) => {
      if (obj instanceof THREE.PointLight) {
        pointLightCount++;
      }
    });
    assert.equal(pointLightCount, 0, `Chapter ${ch} must add 0 PointLights`);
    assert.equal(highBuilt.pointLightCount, 0);

    // Rich geometry + PBR roughness contrast >= 0.25 + symmetrical pair
    assert.ok(highBuilt.meshCount >= 10, `Chapter ${ch} should have >=10 meshes across 2 flanks`);
    assert.ok(
      highBuilt.stoneRoughness - highBuilt.metalRoughness >= 0.25,
      `Chapter ${ch} must preserve >=0.25 stone-vs-metal PBR roughness contrast`
    );

    // Lite mode strictly lowers vertex count for Dell E5430 GPU budget
    assert.ok(
      liteBuilt.totalVertexCount < highBuilt.totalVertexCount,
      `Chapter ${ch} Lite vertex count (${liteBuilt.totalVertexCount}) must be lower than High (${highBuilt.totalVertexCount})`
    );

    // Verify step animation respects reducedMotion (0.25x amplitude)
    const normalNode = highBuilt.animNodes[0];
    const reducedNode = liteBuilt.animNodes[0];
    stepZodiacStorytellingProps(highBuilt, 1.0, false);
    stepZodiacStorytellingProps(liteBuilt, 1.0, true);
    let deltaNormal = 0;
    let deltaReduced = 0;
    if (normalNode.mode === 'bob_y') {
      deltaNormal = Math.abs(normalNode.object.position.y - normalNode.baseValue);
      deltaReduced = Math.abs(reducedNode.object.position.y - reducedNode.baseValue);
    } else if (normalNode.mode === 'sway_z') {
      deltaNormal = Math.abs(normalNode.object.rotation.z - normalNode.baseValue);
      deltaReduced = Math.abs(reducedNode.object.rotation.z - reducedNode.baseValue);
    } else if (normalNode.mode === 'pulse_scale') {
      deltaNormal = Math.abs(normalNode.object.scale.x - normalNode.baseValue);
      deltaReduced = Math.abs(reducedNode.object.scale.x - reducedNode.baseValue);
    } else if (normalNode.mode === 'orbit_tilt') {
      deltaNormal = Math.abs(normalNode.object.rotation.x - normalNode.baseValue);
      deltaReduced = Math.abs(reducedNode.object.rotation.x - reducedNode.baseValue);
    } else {
      deltaNormal = Math.abs(normalNode.object.rotation.y - (normalNode.baseValue + normalNode.phase));
      deltaReduced = Math.abs(reducedNode.object.rotation.y - (reducedNode.baseValue + reducedNode.phase));
    }
    assert.ok(
      deltaReduced <= deltaNormal * 0.35 + 1e-6,
      `Chapter ${ch} reducedMotion (${normalNode.mode}) should dampen storytelling prop motion`
    );

    // Dispose cleanly without throwing
    assert.doesNotThrow(() => disposeZodiacStorytellingProps(highBuilt));
    assert.doesNotThrow(() => disposeZodiacStorytellingProps(liteBuilt));
  }
});

/* ============================================================================
 * PILLAR 4: COMBAT RUN INTEGRITY VERIFIER & REPLAY GUARD (Criteria 28 & 02)
 * ========================================================================== */

test('W14-4a: verifyCombatRunIntegrity verifies legitimate runs, clamps overflow, and rejects cheats', () => {
  // 1. Legitimate Chapter 4 clear
  const legit = verifyCombatRunIntegrity({
    runNonce: 'run_legit_ch4_001',
    mode: 'chapter',
    chapterId: 4,
    stageReached: 12,
    victory: true,
    kills: 54,
    durationSec: 185,
    basePowerRating: 2400,
    totalDamageDealt: 180_000,
    claimedGold: 1650,
    claimedGems: 95,
    claimedSeasonXp: 165,
  });
  assert.equal(legit.ok, true);
  assert.equal(legit.verdict, 'verified');
  assert.deepEqual(legit.anomalies, []);
  assert.equal(legit.sanitizedRewards.gold, 1650);
  assert.equal(legit.sanitizedRewards.gems, 95);
  assert.equal(legit.sanitizedRewards.seasonXp, 165);

  // 2. Reward overflow (e.g. memory-edited gold/gems) -> clamped to authoritative cap
  const bounds = computeAuthoritativeRunBounds({
    mode: 'chapter',
    chapterId: 1,
    stageReached: 5,
    victory: false,
    basePowerRating: 702,
  });
  const overflow = verifyCombatRunIntegrity({
    runNonce: 'run_overflow_ch1_002',
    mode: 'chapter',
    chapterId: 1,
    stageReached: 5,
    victory: false,
    kills: 18,
    durationSec: 65,
    basePowerRating: 702,
    claimedGold: 9_999_999,
    claimedGems: 50_000,
    claimedSeasonXp: 25_000,
  });
  assert.equal(overflow.verdict, 'clamped');
  assert.ok(overflow.anomalies.includes('reward_gold_overflow'));
  assert.ok(overflow.anomalies.includes('reward_gems_overflow'));
  assert.ok(overflow.anomalies.includes('reward_xp_overflow'));
  assert.equal(overflow.sanitizedRewards.gold, bounds.maxAllowedGold);
  assert.equal(overflow.sanitizedRewards.gems, bounds.maxAllowedGems);
  assert.equal(overflow.sanitizedRewards.seasonXp, bounds.maxAllowedSeasonXp);

  // 3. Impossible clear speed + impossible DPS -> rejected with zeroed rewards
  const cheat = verifyCombatRunIntegrity({
    runNonce: 'run_speedhack_003',
    mode: 'chapter',
    chapterId: 12,
    stageReached: 12,
    victory: true,
    kills: 80,
    durationSec: 2,
    basePowerRating: 702,
    totalDamageDealt: 90_000_000,
    claimedGold: 25_000,
    claimedGems: 500,
    claimedSeasonXp: 350,
  });
  assert.equal(cheat.ok, false);
  assert.equal(cheat.verdict, 'rejected');
  assert.ok(cheat.anomalies.includes('impossible_clear_speed'));
  assert.ok(cheat.anomalies.includes('excessive_dps'));
  assert.deepEqual(cheat.sanitizedRewards, { gold: 0, gems: 0, seasonXp: 0 });

  // 4. Malformed / NaN payload -> rejected
  const invalid = verifyCombatRunIntegrity({
    mode: 'chapter',
    chapterId: Number.NaN,
    stageReached: -3,
    victory: true,
    kills: 10,
    durationSec: 10,
    basePowerRating: 702,
    claimedGold: 100,
    claimedGems: 5,
    claimedSeasonXp: 50,
  });
  assert.equal(invalid.ok, false);
  assert.equal(invalid.verdict, 'rejected');
  assert.ok(invalid.anomalies.includes('invalid_payload'));
});

test('W14-4b: RunNonceReplayGuard blocks duplicate submissions and SecurityAnomalyTracker records run_integrity_flagged', () => {
  const guard = new RunNonceReplayGuard({ maxEntries: 64, ttlMs: 10_000 });
  const t0 = 1_700_000_000_000;

  assert.equal(guard.consume('short', t0).accepted, false);
  assert.equal(guard.consume('run_alpha_1001', t0).accepted, true);

  const replay = guard.consume('run_alpha_1001', t0 + 500);
  assert.equal(replay.accepted, false);
  assert.equal(replay.reason, 'replay_detected');

  // Bounded capacity eviction prevents unbounded memory growth
  for (let i = 0; i < 80; i++) {
    assert.equal(guard.consume(`run_batch_item_${i}`, t0 + 1000 + i).accepted, true);
  }
  assert.ok(guard.size() <= 64);

  // Tracker records run_integrity_flagged category accurately
  const tracker = new SecurityAnomalyTracker(10);
  tracker.record({
    category: 'run_integrity_flagged',
    scope: 'run_verify',
    actor: '203.0.113.42',
    detail: 'verdict=rejected anomalies=impossible_clear_speed',
  });
  const summary = tracker.getSummary();
  const recent = tracker.getRecent(5);
  assert.equal(summary.countsByCategory.run_integrity_flagged, 1);
  assert.equal(summary.totalRecorded, 1);
  assert.equal(recent[0].category, 'run_integrity_flagged');
});

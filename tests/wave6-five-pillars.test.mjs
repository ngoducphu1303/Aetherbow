import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  BOSS_PACE_THRESHOLDS,
  COOP_AI_ROLE_LIST,
  PERFECT_DODGE_COUNTER_DMG_MULT,
  PERFECT_DODGE_COUNTER_SHOTS,
  PERFECT_DODGE_COUNTER_WINDOW_SEC,
  PERFECT_DODGE_VISUAL_SLOWMO_SEC,
  WEATHER_BIOME_PROFILES,
  computeCoopRoleSynergy,
  computeCounterVisualTimeScale,
  computeWeatherInstanceBudget,
  consumePerfectDodgeCounterShot,
  createBossPaceTracker,
  createPerfectDodgeCounterState,
  resolveWeatherBiome,
  stepPerfectDodgeCounter,
  triggerPerfectDodgeCounter,
  updateBossPaceTracker,
} from '../src/engine/wave6CombatSystems.ts';
import {
  REFORGE_GOLD_PITY_THRESHOLD,
  reforgeItemSubstatsWithPity,
} from '../src/data/wave4Data.ts';
import {
  GEAR_TEMPLATES,
  computeAutoOptimizeEquipment,
  createInitialSaveData,
  previewPresetPowerDelta,
} from '../src/data/gearData.ts';
import { captureLoadoutPreset } from '../src/data/earlyProgressionData.ts';
import { GearSlot, Rarity } from '../src/types/game.ts';
import { WeeklyBossService } from '../src/server/weeklyBossService.ts';
import { LiveAiPlayersService } from '../src/server/liveAiPlayersService.ts';

function makeTmpStoreFile(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  return {
    dir,
    file: path.join(dir, 'store.json'),
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

test('Pillar 1/2: Perfect Dodge Counter-Window determinism, 2-charge empowerment & visual slow-mo pulse', () => {
  const state = createPerfectDodgeCounterState();
  assert.equal(state.windowRemainingSec, 0);
  assert.equal(state.chargesRemaining, 0);
  assert.equal(computeCounterVisualTimeScale(state), 1);

  triggerPerfectDodgeCounter(state);
  assert.equal(state.windowRemainingSec, PERFECT_DODGE_COUNTER_WINDOW_SEC);
  assert.equal(state.chargesRemaining, PERFECT_DODGE_COUNTER_SHOTS);
  assert.equal(state.visualSlowMoRemainingSec, PERFECT_DODGE_VISUAL_SLOWMO_SEC);
  assert.ok(computeCounterVisualTimeScale(state) < 0.45, 'visual slow-mo pulse starts near 0.38x');

  // Consume 2 counter shots -> both empowered +65%, guaranteed crit, piercing
  const shot1 = consumePerfectDodgeCounterShot(state);
  assert.equal(shot1.empowered, true);
  assert.equal(shot1.damageMult, PERFECT_DODGE_COUNTER_DMG_MULT);
  assert.equal(shot1.guaranteedCrit, true);
  assert.equal(shot1.piercing, true);
  assert.equal(state.chargesRemaining, 1);

  const shot2 = consumePerfectDodgeCounterShot(state);
  assert.equal(shot2.empowered, true);
  assert.equal(state.chargesRemaining, 0);
  assert.equal(state.windowRemainingSec, 0);
  assert.equal(state.totalCountersLanded, 2);

  // 3rd shot is normal
  const shot3 = consumePerfectDodgeCounterShot(state);
  assert.equal(shot3.empowered, false);
  assert.equal(shot3.damageMult, 1);
  assert.equal(shot3.piercing, false);

  // Verify fixed-tick decay parity (60Hz vs 30Hz step totals)
  const sim60 = createPerfectDodgeCounterState();
  const sim30 = createPerfectDodgeCounterState();
  triggerPerfectDodgeCounter(sim60);
  triggerPerfectDodgeCounter(sim30);
  for (let i = 0; i < 60; i++) stepPerfectDodgeCounter(sim60, 1 / 60);
  for (let i = 0; i < 30; i++) stepPerfectDodgeCounter(sim30, 1 / 30);
  assert.ok(Math.abs(sim60.windowRemainingSec - sim30.windowRemainingSec) < 1e-6);
  assert.equal(sim60.visualSlowMoRemainingSec, 0);
  assert.equal(computeCounterVisualTimeScale(sim60), 1);
});

test('Pillar 1/2: 3D Arena Weather biome resolution & Adaptive FPS / Software-GL instance budget', () => {
  const ember = resolveWeatherBiome({ chapterIndex: 1, isWeeklyBoss: true });
  const storm = resolveWeatherBiome({ chapterIndex: 3, isWeekendBlitz: true });
  const snow = resolveWeatherBiome({ chapterIndex: 2 });
  const celestial = resolveWeatherBiome({ chapterIndex: 0, isLobby: true });
  assert.equal(ember, 'ember_ash');
  assert.equal(storm, 'storm_rain');
  assert.equal(snow, 'starlight_snow');
  assert.equal(celestial, 'celestial_dust');
  assert.equal(Object.keys(WEATHER_BIOME_PROFILES).length, 4);

  const stormProfile = WEATHER_BIOME_PROFILES.storm_rain;
  const fullBudget = computeWeatherInstanceBudget(stormProfile, 'full', false);
  const balancedBudget = computeWeatherInstanceBudget(stormProfile, 'balanced', false);
  const guardBudget = computeWeatherInstanceBudget(stormProfile, 'performance_guard', false);
  const swglBudget = computeWeatherInstanceBudget(stormProfile, 'full', true);

  assert.equal(fullBudget, stormProfile.baseCount);
  assert.ok(balancedBudget < fullBudget && balancedBudget > guardBudget);
  assert.ok(swglBudget < fullBudget, 'Software WebGL reduces weather instances cleanly');
});

test('Pillar 3: Substat Reroll Lock preserves locked lines and triggers Gold-Tier Pity on 5th roll', () => {
  const sampleItem = {
    uid: 'gear_test_pity_1',
    templateId: 'wpn_solar_bow',
    rarity: Rarity.LEGENDARY,
    level: 10,
    substats: [
      { id: 'sub_lock_1', kind: 'crit_pct', value: 0.06, tier: 'gold' },
      { id: 'sub_roll_2', kind: 'atk_pct', value: 0.04, tier: 'rare' },
      { id: 'sub_roll_3', kind: 'boss_dmg_pct', value: 0.07, tier: 'rare' },
    ],
  };

  // Trigger guaranteed gold pity when currentPityCount reaches REFORGE_GOLD_PITY_THRESHOLD - 1
  const res = reforgeItemSubstatsWithPity(
    sampleItem,
    ['sub_lock_1'],
    REFORGE_GOLD_PITY_THRESHOLD - 1
  );
  assert.equal(res.triggeredGoldPity, true);
  assert.equal(res.rolledGoldLine, true);
  assert.equal(res.nextPityCount, 0);
  assert.equal(res.substats[0].id, 'sub_lock_1', 'locked substat ID must stay intact');
  assert.equal(res.substats[0].value, 0.06, 'locked substat value must stay intact');
  assert.ok(
    res.substats.slice(1).some((s) => s.tier === 'gold'),
    'at least one unlocked substat must roll Gold tier on pity'
  );
});

test('Pillar 3: 1-Click Auto-Optimize by goal (campaign/boss/arena) & Loadout Preset CP diff preview', () => {
  const save = createInitialSaveData();
  const wpnTemplates = Object.values(GEAR_TEMPLATES).filter((t) => t.slot === GearSlot.WEAPON);
  assert.ok(wpnTemplates.length >= 2);

  // Add a high-tier S-grade boss weapon and a weak starter weapon
  const weakWeapon = {
    uid: 'wpn_weak_1',
    templateId: wpnTemplates[0].templateId,
    rarity: Rarity.COMMON,
    level: 1,
  };
  const bossWeapon = {
    uid: 'wpn_boss_s_1',
    templateId: (wpnTemplates.find((t) => t.isSTier) ?? wpnTemplates[1]).templateId,
    rarity: Rarity.MYTHIC,
    level: 25,
    substats: [
      { id: 's1', kind: 'boss_dmg_pct', value: 0.16, tier: 'gold' },
      { id: 's2', kind: 'crit_dmg_pct', value: 0.22, tier: 'gold' },
    ],
  };
  save.inventory.push(weakWeapon, bossWeapon);
  save.equipped[GearSlot.WEAPON] = weakWeapon.uid;

  // Save current weak loadout to preset_1, then auto-optimize for boss
  save.loadoutPresets = captureLoadoutPreset(save, 'preset_1');
  const optBoss = computeAutoOptimizeEquipment(save, 'boss');
  assert.equal(optBoss.nextEquipped[GearSlot.WEAPON], bossWeapon.uid);
  assert.ok(optBoss.powerDelta > 0, 'Auto-optimize must raise CP when superior gear exists');

  // Preview switching from optimized build back to preset_1 should show negative CP delta
  const optimizedSave = optBoss.nextSave;
  const preset1 = optimizedSave.loadoutPresets.find((p) => p.slotId === 'preset_1');
  assert.ok(preset1);
  const diff = previewPresetPowerDelta(
    optimizedSave,
    preset1.equipped,
    preset1.heroId,
    preset1.equippedRunes
  );
  assert.ok(diff.delta < 0, 'Previewing weaker preset shows negative CP delta');
  assert.equal(diff.presetPower, diff.currentPower + diff.delta);
});

test('Pillar 4: Live Boss Split Pace tracker & WeeklyBossService Verified Splits persistence', () => {
  const tracker = createBossPaceTracker({
    top1ClearTimeMs: 40000,
    top1SplitsMs: [10000, 20000, 30000, 40000],
    personalBestClearTimeMs: 48000,
    personalBestSplitsMs: [12000, 24000, 36000, 48000],
    timeLimitSec: 90,
  });
  assert.equal(BOSS_PACE_THRESHOLDS.length, 4);

  // Reach 75% HP at 9.2s (ahead of 10s Top-1 split)
  const snap1 = updateBossPaceTracker(tracker, 0.74, 9200);
  assert.equal(snap1.splitsMs[0], 9200);
  assert.equal(snap1.checkpointsReached, 1);
  assert.equal(snap1.referenceLabel, 'Top 1');
  assert.equal(snap1.ahead, true);
  assert.ok(snap1.deltaSec < 0);

  // Reach 0% HP at 38.5s (1.5s ahead of 40s Top-1 clear)
  updateBossPaceTracker(tracker, 0.49, 19000);
  updateBossPaceTracker(tracker, 0.24, 29000);
  const finalSnap = updateBossPaceTracker(tracker, 0, 38500);
  assert.deepEqual(finalSnap.splitsMs, [9200, 19000, 29000, 38500]);
  assert.equal(finalSnap.checkpointsReached, 4);
  assert.equal(finalSnap.deltaSec, -1.5);
  assert.equal(finalSnap.ahead, true);

  // Verify WeeklyBossService stores bestSplitsMs & top1SplitsMs cleanly
  const tmp = makeTmpStoreFile('wave6-weekly-boss');
  try {
    const svc = new WeeklyBossService(tmp.file);
    const nowMs = Date.now();
    const user = { uid: 'u_wave6_1', displayName: 'Cung Thủ Pace' };
    const start = svc.startAttempt(user, nowMs);
    const sub = svc.submitAttempt(
      user,
      {
        attemptId: start.attempt.attemptId,
        seed: start.attempt.seed,
        displayName: user.displayName,
        cleared: true,
        damageDealt: start.schedule.bossMaxHp,
        simTicks: 2310,
        clearTimeMs: 38500,
        remainingHpPct: 88,
        perfectDodges: 4,
        splitsMs: [9200, 19000, 29000, 38500],
        counterHitsLanded: 6,
      },
      nowMs + 39000
    );
    assert.ok(sub.verifiedScore > 0);
    const state = svc.getState(user, nowMs + 39500);
    assert.deepEqual(state.player.bestSplitsMs, [9200, 19000, 29000, 38500]);
    assert.equal(state.player.lastVerifiedAttemptId, start.attempt.attemptId);
    assert.ok(Array.isArray(state.top1SplitsMs) && state.top1SplitsMs.length === 4);
  } finally {
    tmp.cleanup();
  }
});

test('Pillar 5: Co-op AI Role Synergy, Live Guild Boss War idempotency & 8-Player Mini-Cup full bracket', () => {
  // 1. Co-op Role Synergy presets
  assert.equal(COOP_AI_ROLE_LIST.length, 3);
  const synDpsGuard = computeCoopRoleSynergy(['dps', 'guardian']);
  assert.ok(synDpsGuard.bossDamageBonus > 0);
  assert.ok(synDpsGuard.damageReductionBonus > 0);
  assert.ok(synDpsGuard.periodicHealPct > 0);

  const synDoubleControl = computeCoopRoleSynergy(['control', 'control']);
  assert.ok(synDoubleControl.enemyProjectileSlowPct >= 0.25);

  // 2. Live Guild Boss War + idempotent milestone claim + 8-Player Mini-Cup bracket
  const tmp = makeTmpStoreFile('wave6-live-ai');
  try {
    const svc = new LiveAiPlayersService(tmp.file);
    const playerName = 'Tiên Phong Wave6';
    const initialBoss = svc.getLiveGuildBossState(playerName);
    assert.equal(initialBoss.milestones.length, 3);

    // Highest milestone should not be reached yet on fresh boss
    const topMilestone = initialBoss.milestones[initialBoss.milestones.length - 1];
    const earlyClaim = svc.claimLiveGuildBossMilestone({
      playerName,
      tierId: topMilestone.tierId,
    });
    assert.equal(earlyClaim.ok, false);

    // Record player attacks until top milestone is reached
    const reqDmg = topMilestone.damageRequired;
    let curTotal = initialBoss.totalDamage;
    let guard = 0;
    while (curTotal < reqDmg && guard < 40) {
      const hit = svc.recordHumanGuildBossAttack({
        playerName,
        heroId: 'artemis',
        damage: 80_000,
      });
      curTotal = hit.state.totalDamage;
      guard++;
    }
    assert.ok(curTotal >= reqDmg);

    // First claim succeeds; second claim is idempotent (alreadyClaimed=true, 0 reward)
    const claim1 = svc.claimLiveGuildBossMilestone({
      playerName,
      tierId: topMilestone.tierId,
    });
    assert.equal(claim1.ok, true);
    assert.equal(claim1.alreadyClaimed, false);
    assert.ok(claim1.goldReward > 0 && claim1.gemsReward > 0 && claim1.guildCoinsReward > 0);

    const claim2 = svc.claimLiveGuildBossMilestone({
      playerName,
      tierId: topMilestone.tierId,
    });
    assert.equal(claim2.ok, true);
    assert.equal(claim2.alreadyClaimed, true);
    assert.equal(claim2.goldReward, 0);
    assert.equal(claim2.gemsReward, 0);

    // 3. 8-Player 1v1 Mini-Cup Bracket: QF -> SF -> GF -> Champion -> Idempotent Prize Claim
    const cupStart = svc.startMiniCup({
      playerName,
      heroId: 'artemis',
      powerRating: 24000,
      duelRating: 1350,
    });
    assert.equal(cupStart.cup.status, 'active');
    assert.equal(cupStart.cup.currentRound, 1);
    assert.equal(cupStart.cup.matches.length, 7);

    let currentCup = cupStart.cup;
    for (const round of [1, 2, 3]) {
      const playerMatch = currentCup.matches.find(
        (m) => m.round === round && m.status === 'ready' && (m.fighterA?.isHuman || m.fighterB?.isHuman)
      );
      assert.ok(playerMatch, `Player must have a ready match in round ${round}`);
      const res = svc.reportMiniCupMatchResult({
        playerName,
        matchId: playerMatch.matchId,
        playerWon: true,
      });
      assert.equal(res.ok, true);
      assert.ok(res.cup);
      currentCup = res.cup;
      // Sibling matches in the same round must resolve simultaneously
      const unfinishedRound = currentCup.matches.filter(
        (m) => m.round === round && m.status !== 'completed'
      );
      assert.equal(unfinishedRound.length, 0, `All matches in round ${round} must resolve`);
    }

    assert.equal(currentCup.status, 'champion');
    assert.equal(currentCup.championName, playerName);

    const prize1 = svc.claimMiniCupPrize({ playerName, cupId: currentCup.cupId });
    assert.equal(prize1.ok, true);
    assert.equal(prize1.alreadyClaimed, false);
    assert.equal(prize1.gemsReward, 320);
    assert.equal(prize1.goldReward, 4500);

    const prize2 = svc.claimMiniCupPrize({ playerName, cupId: currentCup.cupId });
    assert.equal(prize2.ok, true);
    assert.equal(prize2.alreadyClaimed, true);
    assert.equal(prize2.gemsReward, 0);
    assert.equal(prize2.goldReward, 0);
  } finally {
    tmp.cleanup();
  }
});

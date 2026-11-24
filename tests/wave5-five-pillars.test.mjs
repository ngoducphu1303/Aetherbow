import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  BOSS_FINISHER_DURATION_SEC,
  BOSS_PHASE_ATMOSPHERE,
  COOP_TACTICAL_ORDERS,
  ELEMENTAL_IMPACT_VFX,
  computeBossFinisherPresentation,
  createAdaptiveFpsGovernor,
  sampleAdaptiveFpsFrame,
  selectCoopAllyTarget,
  shouldCoopAllyHoldUlt,
} from '../src/engine/wave5CombatSystems.ts';
import {
  GEAR_TEMPLATES,
  craftEarlyTargetGear,
  createInitialSaveData,
  salvageExcessGearToForgeShards,
} from '../src/data/gearData.ts';
import { computeDropRateCodex } from '../src/data/progressionAdvisor.ts';
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

test('Pillar 1/2: Adaptive FPS Governor downshifts under sustained lag and recovers smoothly', () => {
  const gov = createAdaptiveFpsGovernor(true);
  assert.equal(gov.tier, 'full');

  // Simulate ~4 seconds of 24 FPS (~0.042s per frame) -> balanced
  for (let i = 0; i < 100; i++) {
    sampleAdaptiveFpsFrame(gov, 1 / 24);
  }
  assert.equal(gov.tier, 'balanced');

  // Continue sustained 22 FPS for another ~4 seconds -> performance_guard
  for (let i = 0; i < 100; i++) {
    sampleAdaptiveFpsFrame(gov, 1 / 22);
  }
  assert.equal(gov.tier, 'performance_guard');

  // Recover with steady 60 FPS for ~15 seconds -> back to balanced then full
  for (let i = 0; i < 900; i++) {
    sampleAdaptiveFpsFrame(gov, 1 / 60);
  }
  assert.equal(gov.tier, 'full');

  // Disabling resets to full immediately
  gov.tier = 'performance_guard';
  gov.enabled = false;
  const offStep = sampleAdaptiveFpsFrame(gov, 1 / 20);
  assert.equal(offStep.modifiers.tier, 'full');
  assert.equal(offStep.modifiers.dprScale, 1.0);
});

test('Pillar 1/2: Boss Finisher 1.15s presentation curve & elemental/phase specs', () => {
  const start = computeBossFinisherPresentation(BOSS_FINISHER_DURATION_SEC, BOSS_FINISHER_DURATION_SEC);
  assert.equal(start.active, true);
  assert.equal(start.visualTimeScale, 0.22);

  const mid = computeBossFinisherPresentation(BOSS_FINISHER_DURATION_SEC * 0.5, BOSS_FINISHER_DURATION_SEC);
  assert.equal(mid.active, true);
  assert.ok(mid.cameraZoomBlend > 0.9, 'camera zoom should peak mid-finisher');
  assert.ok(mid.fovDelta < -3, 'FOV should narrow dramatically during finisher');

  const end = computeBossFinisherPresentation(0, BOSS_FINISHER_DURATION_SEC);
  assert.equal(end.active, false);
  assert.equal(end.visualTimeScale, 1);
  assert.equal(end.fovDelta, 0);

  for (const elem of ['fire', 'ice', 'lightning', 'poison']) {
    assert.ok(ELEMENTAL_IMPACT_VFX[elem].particleCount >= 8);
    assert.ok(ELEMENTAL_IMPACT_VFX[elem].ringRadius > 1.0);
  }
  assert.ok(BOSS_PHASE_ATMOSPHERE[3].rimIntensity > BOSS_PHASE_ATMOSPHERE[2].rimIntensity);
  assert.ok(BOSS_PHASE_ATMOSPHERE[2].rimIntensity > BOSS_PHASE_ATMOSPHERE[1].rimIntensity);
});

test('Pillar 3: Target-Slot Forge crafts exact chosen slot across all 6 GearSlots', () => {
  const slots = Object.values(GearSlot);
  for (const slot of slots) {
    const save = createInitialSaveData();
    save.highestChapterCleared = 2;
    save.earlyForgeProgress = {
      rareShards: 100,
      epicShards: 100,
      sTierBlueprints: 25,
      ch1AresRewardClaimed: true,
      ch1BoreasRewardClaimed: true,
      ch1ClearRewardClaimed: true,
    };
    const res = craftEarlyTargetGear(save, 'epic', () => 0.35, slot);
    assert.equal(res.ok, true, `Expected craft ok for slot ${slot}: ${res.reason ?? ''}`);
    assert.ok(res.item);
    const tpl = GEAR_TEMPLATES[res.item.templateId];
    assert.equal(tpl.slot, slot, `Crafted gear must match targetSlot ${slot}`);
    assert.equal(res.item.rarity, Rarity.EPIC);
  }

  // Verify [S] target-slot craft respects Ch.4 unlock gate (highestChapterCleared >= 3) & 30-blueprint cost
  const earlySave = createInitialSaveData();
  earlySave.highestChapterCleared = 2;
  earlySave.earlyForgeProgress = {
    rareShards: 100,
    epicShards: 100,
    sTierBlueprints: 30,
    ch1AresRewardClaimed: true,
    ch1BoreasRewardClaimed: true,
    ch1ClearRewardClaimed: true,
  };
  const gatedRes = craftEarlyTargetGear(earlySave, 's_tier', () => 0.2, GearSlot.WEAPON);
  assert.equal(gatedRes.ok, false, '[S] craft must remain locked before clearing Chapter 3');

  const sSave = createInitialSaveData();
  sSave.highestChapterCleared = 3;
  sSave.earlyForgeProgress = {
    rareShards: 100,
    epicShards: 100,
    sTierBlueprints: 30,
    ch1AresRewardClaimed: true,
    ch1BoreasRewardClaimed: true,
    ch1ClearRewardClaimed: true,
  };
  const sRes = craftEarlyTargetGear(sSave, 's_tier', () => 0.2, GearSlot.WEAPON);
  assert.equal(sRes.ok, true, `Expected [S] craft ok: ${sRes.reason ?? ''}`);
  assert.ok(sRes.item);
  assert.equal(GEAR_TEMPLATES[sRes.item.templateId].slot, GearSlot.WEAPON);
  assert.equal(GEAR_TEMPLATES[sRes.item.templateId].isSTier, true);
});

test('Pillar 3: Safe Excess Gear Salvage protects equipped, [S], Epic+, and Mythic gear', () => {
  const save = createInitialSaveData();
  const equippedUid = save.equipped[GearSlot.WEAPON];
  assert.ok(equippedUid);

  const commonTpl = Object.values(GEAR_TEMPLATES).find((t) => !t.isSTier && t.slot === GearSlot.RING);
  const sTpl = Object.values(GEAR_TEMPLATES).find((t) => t.isSTier && t.slot === GearSlot.WEAPON);
  assert.ok(commonTpl && sTpl);

  const equippedSet = new Set(Object.values(save.equipped).filter(Boolean));
  save.inventory = save.inventory.filter((g) => equippedSet.has(g.uid));

  save.inventory.push(
    { uid: 'excess_common_1', templateId: commonTpl.templateId, rarity: Rarity.COMMON, level: 1 },
    { uid: 'excess_rare_1', templateId: commonTpl.templateId, rarity: Rarity.RARE, level: 3 },
    { uid: 'protected_epic_1', templateId: commonTpl.templateId, rarity: Rarity.EPIC, level: 5 },
    { uid: 'protected_mythic_1', templateId: commonTpl.templateId, rarity: Rarity.MYTHIC, level: 10 },
    { uid: 'protected_s_1', templateId: sTpl.templateId, rarity: Rarity.RARE, level: 1 }
  );

  const res = salvageExcessGearToForgeShards(save);
  assert.equal(res.salvagedCount, 2, 'Only unequipped non-[S] Common and Rare should be salvaged');
  assert.equal(res.rareShardsGained, 5);
  assert.equal(res.epicShardsGained, 1);
  assert.ok(res.starDustGained >= 35);
  assert.ok(res.goldGained > 0);

  const remainingUids = new Set(res.nextSave.inventory.map((g) => g.uid));
  assert.equal(remainingUids.has(equippedUid), true, 'Equipped gear must be protected');
  assert.equal(remainingUids.has('protected_epic_1'), true, 'Epic gear must be protected');
  assert.equal(remainingUids.has('protected_mythic_1'), true, 'Mythic gear must be protected');
  assert.equal(remainingUids.has('protected_s_1'), true, '[S] gear must be protected');
  assert.equal(remainingUids.has('excess_common_1'), false);
  assert.equal(remainingUids.has('excess_rare_1'), false);
});

test('Pillar 3: Drop-Rate Codex exposes transparent 100% probability rows and live pity', () => {
  const save = createInitialSaveData();
  save.pity.mythicRollsSinceEpic = 4;
  save.pity.mythicRollsSinceSTier = 18;
  const codex = computeDropRateCodex(save);
  assert.equal(codex.protection.mythicEpicPityCurrent, 4);
  assert.equal(codex.protection.mythicEpicRemaining, 6);
  assert.equal(codex.protection.mythicLegendPityCurrent, 18);
  assert.equal(codex.rows.length, 4);

  const baseSum = codex.rows.reduce((acc, r) => acc + parseFloat(r.baseChestPct), 0);
  const mythicSum = codex.rows.reduce((acc, r) => acc + parseFloat(r.mythicChestPct), 0);
  assert.equal(Math.round(baseSum), 100, 'Base chest probabilities must sum to 100%');
  assert.equal(Math.round(mythicSum), 100, 'Mythic chest probabilities must sum to 100%');
});

test('Pillar 4: Weekend Blitz Boss Event verifies run, rejects Auto-Pilot, awards Season CP, and claims idempotently', () => {
  const tmp = makeTmpStoreFile('wave5-weekend');
  try {
    const svc = new WeeklyBossService(tmp.file);
    const user = { uid: 'wave5_wknd_hero', displayName: 'Xạ Thủ Cuối Tuần' };
    const nowMs = Date.now();

    const initialState = svc.getWeekendBlitzState(user, nowMs);
    assert.ok(initialState.schedule.eventId.startsWith('WE-'));
    assert.ok(initialState.schedule.modifier.title.length > 0);
    assert.equal(initialState.player?.attemptsRemaining, 3);

    // Attempt 1: Rejected because autoPilotUsed is true
    const attempt1 = svc.startWeekendBlitzAttempt(user, nowMs);
    assert.ok(attempt1.attempt.attemptId);
    assert.throws(() => {
      svc.submitWeekendBlitzAttempt(
        user,
        {
          attemptId: attempt1.attempt.attemptId,
          seed: attempt1.schedule.seed,
          cleared: true,
          damageDealt: attempt1.schedule.bossMaxHp,
          simTicks: 2400,
          clearTimeMs: 40000,
          remainingHpPct: 0.85,
          perfectDodges: 4,
          autoPilotUsed: true,
        },
        nowMs + 41000
      );
    }, /thủ công|AI Tự Chơi/i);

    // Attempt 2: Clean manual clear
    const attempt2 = svc.startWeekendBlitzAttempt(user, nowMs + 42000);
    const submitted = svc.submitWeekendBlitzAttempt(
      user,
      {
        attemptId: attempt2.attempt.attemptId,
        seed: attempt2.schedule.seed,
        cleared: true,
        damageDealt: attempt2.schedule.bossMaxHp,
        simTicks: 2100,
        clearTimeMs: 35000,
        remainingHpPct: 0.9,
        perfectDodges: 5,
        autoPilotUsed: false,
      },
      nowMs + 78000
    );
    assert.equal(submitted.ok, true);
    assert.ok(submitted.verifiedScore >= 13200, `Expected >= 13200 score, got ${submitted.verifiedScore}`);
    assert.equal(submitted.rank, 1);
    assert.equal(submitted.seasonCpBonusAwarded, 25);

    // Verify Season Standing picked up the verified run
    const season = svc.getSeasonState(user, nowMs + 79000);
    assert.ok((season.player?.seasonPoints ?? 0) > 0);

    // Idempotent reward claim for sovereign tier
    const firstClaim = svc.claimWeekendBlitzReward(
      user,
      'weekend_sovereign',
      'idem-wknd-sovereign-1',
      nowMs + 80000
    );
    assert.equal(firstClaim.alreadyClaimed, false);
    assert.ok(firstClaim.receipt.rewardGems > 0);
    assert.ok(firstClaim.receipt.rewardEpicShards > 0);

    const secondClaim = svc.claimWeekendBlitzReward(
      user,
      'weekend_sovereign',
      'idem-wknd-sovereign-1',
      nowMs + 81000
    );
    assert.equal(secondClaim.alreadyClaimed, true);
  } finally {
    tmp.cleanup();
  }
});

test('Pillar 5: Deterministic Co-op 3D Tactical Orders control target priority and Ult Resonance hold', () => {
  assert.equal(COOP_TACTICAL_ORDERS.length, 3);
  const enemies = [
    { id: 1, x: 1, z: 1, isBoss: false, isElite: false, hp: 100, alive: true },
    { id: 2, x: 10, z: 10, isBoss: true, isElite: false, hp: 5000, alive: true },
    { id: 3, x: 3, z: 2, isBoss: false, isElite: true, hp: 300, alive: true },
  ];

  // Order 1: Focus Boss ignores closer adds
  const bossTarget = selectCoopAllyTarget(enemies, 0, 0, 'focus_boss');
  assert.equal(bossTarget?.id, 2);

  // Order 2: Clear Adds prioritizes closest non-boss add
  const addTarget = selectCoopAllyTarget(enemies, 0, 0, 'clear_adds');
  assert.equal(addTarget?.id, 1);

  // Order 3: Hold Resonance holds ally Ult until player casts Q
  assert.equal(
    shouldCoopAllyHoldUlt({
      order: 'hold_resonance',
      playerUltRecentRemainingSec: 0,
      resonanceRemainingSec: 0,
    }),
    true
  );
  assert.equal(
    shouldCoopAllyHoldUlt({
      order: 'hold_resonance',
      playerUltRecentRemainingSec: 2.5,
      resonanceRemainingSec: 0,
    }),
    false
  );
  assert.equal(
    shouldCoopAllyHoldUlt({
      order: 'focus_boss',
      playerUltRecentRemainingSec: 0,
      resonanceRemainingSec: 0,
    }),
    false
  );
});

test('Pillar 5: Live Invites and Persistent Rival/Nemesis progression & idempotent daily bounty', () => {
  const tmp = makeTmpStoreFile('wave5-liveai');
  try {
    const svc = new LiveAiPlayersService(tmp.file);
    const playerName = 'Wave5Hero';
    const nowMs = Date.now();
    const firstAiId = svc.getSnapshot().players[0].id;

    // Live invite generation + single-use acceptance
    const invite = svc.generateLiveInvite({
      playerName,
      preferredKind: 'coop_raid',
      nowMs,
    });
    assert.ok(invite.inviteId);
    assert.equal(invite.kind, 'coop_raid');

    const acceptRes = svc.respondToInvite({
      inviteId: invite.inviteId,
      action: 'accept',
      playerName,
      nowMs: nowMs + 1000,
    });
    assert.equal(acceptRes.ok, true);
    assert.equal(acceptRes.alreadyProcessed, false);

    const duplicateRes = svc.respondToInvite({
      inviteId: invite.inviteId,
      action: 'accept',
      playerName,
      nowMs: nowMs + 2000,
    });
    assert.equal(duplicateRes.alreadyProcessed, true, 'Invite cannot be processed twice');

    // Rival encounters escalate contender -> archrival -> nemesis
    svc.recordRivalEncounter({ playerName, aiPlayerId: firstAiId, playerWon: true, reason: 'Đấu Trường 1v1', nowMs });
    svc.recordRivalEncounter({ playerName, aiPlayerId: firstAiId, playerWon: false, reason: 'Đấu Trường 1v1', nowMs: nowMs + 1000 });
    let rivals = svc.getRivalsForPlayer(playerName);
    assert.equal(rivals.length, 1);
    assert.equal(rivals[0].rivalryTier, 'archrival');

    svc.recordRivalEncounter({ playerName, aiPlayerId: firstAiId, playerWon: false, reason: 'Đấu Trường 1v1', nowMs: nowMs + 2000 });
    svc.recordRivalEncounter({ playerName, aiPlayerId: firstAiId, playerWon: true, reason: 'Đấu Trường 1v1', nowMs: nowMs + 3000 });
    rivals = svc.getRivalsForPlayer(playerName);
    assert.equal(rivals[0].rivalryTier, 'nemesis');
    assert.equal(rivals[0].winsAgainst, 2);
    assert.equal(rivals[0].lossesAgainst, 2);

    // Daily bounty claim succeeds once, second claim same day is idempotent (alreadyClaimed: true, 0 rewards)
    const bounty1 = svc.claimRivalDailyBounty({ playerName, aiPlayerId: firstAiId, nowMs: nowMs + 4000 });
    assert.equal(bounty1.ok, true);
    assert.equal(bounty1.alreadyClaimed, false);
    assert.equal(bounty1.goldReward, 1800);
    assert.equal(bounty1.gemsReward, 45);

    const bounty2 = svc.claimRivalDailyBounty({ playerName, aiPlayerId: firstAiId, nowMs: nowMs + 5000 });
    assert.equal(bounty2.ok, true);
    assert.equal(bounty2.alreadyClaimed, true);
    assert.equal(bounty2.goldReward, 0);
    assert.equal(bounty2.gemsReward, 0);
  } finally {
    tmp.cleanup();
  }
});

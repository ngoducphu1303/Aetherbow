import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { WebSocketServer, WebSocket } from 'ws';
import {
  createInitialWeaponOverdriveState,
  chargeWeaponOverdrive,
  activateWeaponOverdrive,
  stepWeaponOverdrive,
  generateInteractiveBattlefieldHazards,
  damageInteractiveHazard,
  createIdleCinematicCameraState,
  triggerCinematicCamera,
  stepCinematicCamera,
  FORGE_EPIC_PITY_MAX,
  FORGE_LEGENDARY_PITY_MAX,
  FORGE_SHARD_EXCHANGE_COST,
  computeForgePitySummary,
  rollProtectedForgeGear,
  consumeForgeShardsForDirectCraft,
  getDailyRiftMutators,
  computeEqualizedRiftModifiers,
  recordEqualizedRiftClear,
  normalizeEqualizedRiftState,
  AI_SQUAD_FORMATIONS,
  AI_SQUAD_FORMATION_LIST,
  normalizeAiSquadFormation,
  formatSquadPingBanner,
  createLiveSpectatorMatch,
  stepLiveSpectatorMatch,
  computeSpectatorCheerReward,
} from '../src/engine/wave11FivePillars.ts';
import { LiveAiPlayersService } from '../src/server/liveAiPlayersService.ts';

test('Wave 11 Pillar 1 & 2A: Weapon Overdrive charges with style rank, activates 6s buffs, and fires Finisher Surge on expiry', () => {
  let state = createInitialWeaponOverdriveState('bow');
  assert.equal(state.charge, 0);
  assert.equal(state.active, false);

  // Charging at SSS scales faster than B
  const lowCharge = chargeWeaponOverdrive(state, 10, { styleGrade: 'B' });
  const highCharge = chargeWeaponOverdrive(state, 10, { styleGrade: 'SSS' });
  assert.ok(highCharge.charge > lowCharge.charge);

  // Cannot activate before 100%
  const blocked = activateWeaponOverdrive(highCharge);
  assert.equal(blocked.activated, false);

  // Fill to 100%
  state = chargeWeaponOverdrive(state, 100, { styleGrade: 'SSS' });
  assert.equal(state.charge, 100);

  const act = activateWeaponOverdrive(state);
  assert.equal(act.activated, true);
  assert.equal(act.nextState.active, true);
  assert.equal(act.nextState.charge, 0);
  assert.equal(act.nextState.totalActivations, 1);

  // Mid-duration tick stays active with overdrive buffs
  const mid = stepWeaponOverdrive(act.nextState, 3.0);
  assert.equal(mid.nextState.active, true);
  assert.equal(mid.finisherSurgeTriggered, false);
  assert.ok(mid.buffs.atkMult > 1.2);
  assert.ok(mid.buffs.aspdMult > 1.25);
  assert.ok(mid.buffs.critChanceBonus >= 0.15);

  // Completing remaining 3.5s triggers Finisher Surge & resets buffs
  const end = stepWeaponOverdrive(mid.nextState, 3.5);
  assert.equal(end.nextState.active, false);
  assert.equal(end.finisherSurgeTriggered, true);
  assert.equal(end.buffs.atkMult, 1);
});

test('Wave 11 Pillar 1 & 2B: 3D Interactive Battlefield Hazards spawn on arena flanks and detonate on damage', () => {
  const hazards = generateInteractiveBattlefieldHazards(3, 5, {
    isBossRoom: true,
    arenaHalfW: 11.5,
    arenaHalfD: 13.0,
  });
  assert.equal(hazards.length, 3);
  assert.ok(Math.abs(hazards[0].x) >= 3.0, 'Flank hazards sit off center');
  assert.ok(Math.abs(hazards[1].x) >= 3.0, 'Flank hazards sit off center');
  for (const h of hazards) {
    assert.ok(h.hp >= 40 && h.maxHp >= 40);
    assert.equal(h.detonated, false);
  }

  // Partial damage weakens, lethal damage detonates with AoE, guard break, and overdrive gain
  const target = hazards[0];
  const chip = damageInteractiveHazard(target, 15, 140);
  assert.equal(chip.detonatedNow, false);
  assert.ok(chip.nextHazard.hp < target.hp);

  const detonate = damageInteractiveHazard(chip.nextHazard, target.maxHp + 50, 140);
  assert.equal(detonate.detonatedNow, true);
  assert.equal(detonate.nextHazard.detonated, true);
  assert.ok(detonate.blastDamage >= 300);
  assert.ok(detonate.blastRadius >= 4.0);
  assert.ok(detonate.breakShieldRatio >= 0.15);
  assert.ok(detonate.overdriveChargeGain >= 15);

  // Re-hitting an already detonated hazard is a no-op
  const repeat = damageInteractiveHazard(detonate.nextHazard, 100, 140);
  assert.equal(repeat.detonatedNow, false);
  assert.equal(repeat.blastDamage, 0);
});

test('Wave 11 Pillar 1 & 2C: Cinematic Camera smoothly sweeps on Boss Intro & Execution and honors reducedMotion', () => {
  const idle = createIdleCinematicCameraState();
  assert.equal(idle.mode, 'none');

  // Reduced motion disables sweep immediately
  const reduced = triggerCinematicCamera('boss_intro', 0, -6, true);
  assert.equal(reduced.mode, 'none');

  const bossSweep = triggerCinematicCamera('boss_intro', 2.5, -5.5, false);
  assert.equal(bossSweep.mode, 'boss_intro');
  assert.ok(bossSweep.durationSec > 1.0);

  const mid = stepCinematicCamera(bossSweep, bossSweep.durationSec * 0.5);
  assert.equal(mid.active, true);
  assert.ok(mid.focusBlend > 0.3);
  assert.ok(mid.fovDelta < 0, 'Boss intro should tighten FOV dramatically');

  const done = stepCinematicCamera(mid.nextState, bossSweep.durationSec);
  assert.equal(done.nextState.mode, 'none');
  assert.equal(done.active, false);
  assert.ok(Math.abs(done.focusBlend) < 1e-6);
});

test('Wave 11 Pillar 3: Gear Forge Blueprint Pity enforces 6 Epic, Soft Pity @11, 15 Legendary, and 25-Shard Direct Craft', () => {
  let pity = {
    mythicRollsSinceEpic: 0,
    mythicRollsSinceSTier: 0,
    forgeRollsSinceEpic: 0,
    forgeRollsSinceLegendary: 0,
    forgeRelicShards: 0,
  };

  let sawEpicAt6 = false;
  let sawSoftPityAt11 = false;
  let sawLegAt15 = false;

  for (let roll = 1; roll <= FORGE_LEGENDARY_PITY_MAX; roll++) {
    const summaryBefore = computeForgePitySummary(pity, true);
    if (roll === 11) {
      assert.equal(summaryBefore.isSoftPityActive, true);
      assert.ok(summaryBefore.effectiveLegendaryRatePct >= 25);
      sawSoftPityAt11 = true;
    }

    const res = rollProtectedForgeGear(pity, {
      maxRarity: 'legendary',
      rng: () => 0.999,
    });
    if (roll === FORGE_EPIC_PITY_MAX) {
      assert.equal(res.hitEpicPity, true);
      assert.equal(res.rarity, 'epic');
      sawEpicAt6 = true;
    }
    if (roll === FORGE_LEGENDARY_PITY_MAX) {
      assert.equal(res.hitLegendaryPity, true);
      assert.equal(res.rarity, 'legendary');
      sawLegAt15 = true;
    }
    pity = res.nextPity;
  }

  assert.equal(sawEpicAt6, true);
  assert.equal(sawSoftPityAt11, true);
  assert.equal(sawLegAt15, true);
  assert.ok(pity.forgeRelicShards >= FORGE_SHARD_EXCHANGE_COST);

  const shardsBefore = pity.forgeRelicShards;
  const direct = consumeForgeShardsForDirectCraft(pity, 'weapon', { maxRarity: 'legendary' });
  assert.equal(direct.ok, true);
  assert.equal(direct.rarity, 'legendary');
  assert.equal(direct.targetSlot, 'weapon');
  assert.equal(direct.nextPity.forgeRelicShards, shardsBefore - FORGE_SHARD_EXCHANGE_COST);

  // Day-1 policy clamp (maxRarity = 'epic') respects fairness ceiling
  const clamped = consumeForgeShardsForDirectCraft(
    { ...pity, forgeRelicShards: 30 },
    'armor',
    { maxRarity: 'epic' }
  );
  assert.equal(clamped.ok, true);
  assert.equal(clamped.rarity, 'epic');
});

test('Wave 11 Pillar 4: Equalized Endless Rift rotates 2 deterministic daily mutators & records floor milestones', () => {
  const mutsA = getDailyRiftMutators('2026-11-21');
  const mutsASame = getDailyRiftMutators('2026-11-21');
  assert.equal(mutsA.length, 2);
  assert.notEqual(mutsA[0].id, mutsA[1].id);
  assert.equal(mutsA[0].id, mutsASame[0].id);
  assert.equal(mutsA[1].id, mutsASame[1].id);

  const floor1 = computeEqualizedRiftModifiers(1, mutsA);
  const floor6 = computeEqualizedRiftModifiers(6, mutsA);
  assert.ok(floor6.enemyHpMult > floor1.enemyHpMult);
  assert.ok(floor6.enemyDmgMult > floor1.enemyDmgMult);

  let prog = normalizeEqualizedRiftState(undefined, '2026-11-21');
  prog = recordEqualizedRiftClear(prog, 5, '2026-11-21');
  assert.equal(prog.bestFloorToday, 5);
  assert.equal(prog.seasonBestFloor, 5);
  assert.equal(prog.totalRiftClears, 1);

  // Next day resets bestFloorToday while preserving seasonBestFloor
  const nextDay = recordEqualizedRiftClear(prog, 3, '2026-11-22');
  assert.equal(nextDay.bestFloorToday, 3);
  assert.equal(nextDay.seasonBestFloor, 5);
});

test('Wave 11 Pillar 5A: Tactical AI Squad Formations normalize safely and format callout banners', () => {
  assert.equal(AI_SQUAD_FORMATION_LIST.length, 3);
  assert.equal(normalizeAiSquadFormation('unknown'), 'break_focus');
  assert.equal(normalizeAiSquadFormation('elemental_chain'), 'elemental_chain');
  assert.ok(AI_SQUAD_FORMATIONS.break_focus.allyBreakMult > 1.2);
  assert.ok(AI_SQUAD_FORMATIONS.guard_sustain.sanctuaryCdMult < 0.85);
  assert.ok(AI_SQUAD_FORMATIONS.elemental_chain.primerRateMult > 1.25);

  const ping = formatSquadPingBanner('elemental_chain', 'Lyra');
  assert.ok(ping.includes('Lyra'));
  assert.ok(ping.includes('Cộng Hưởng'));
});

test('Wave 11 Pillar 5B: Live AI Championship Spectator Arena simulates server-authoritative match + WS cheer & idempotent claim', async () => {
  // Pure simulation sanity check
  let simMatch = createLiveSpectatorMatch(
    [
      { id: 'ai_1', displayName: 'Kael', heroId: 'artemis', powerRating: 19200, personality: 'tactical' },
      { id: 'ai_2', displayName: 'Nyx', heroId: 'hatsune_miku', powerRating: 19600, personality: 'aggressive' },
    ],
    Date.now(),
    1
  );
  for (let i = 0; i < 30 && simMatch.status === 'live'; i++) {
    simMatch = stepLiveSpectatorMatch(simMatch, Date.now() + i * 2500).nextMatch;
  }
  assert.equal(simMatch.status, 'finished');
  assert.ok(
    simMatch.winnerId === simMatch.fighterA.aiPlayerId ||
      simMatch.winnerId === simMatch.fighterB.aiPlayerId
  );
  const loserId =
    simMatch.winnerId === simMatch.fighterA.aiPlayerId
      ? simMatch.fighterB.aiPlayerId
      : simMatch.fighterA.aiPlayerId;
  const rewardWin = computeSpectatorCheerReward(simMatch, simMatch.winnerId);
  const rewardMiss = computeSpectatorCheerReward(simMatch, loserId);
  assert.equal(rewardWin.predictedCorrectly, true);
  assert.ok(rewardWin.gemsReward > rewardMiss.gemsReward);

  // Live WebSocket E2E test with LiveAiPlayersService (isolated temp store)
  const svc = new LiveAiPlayersService();
  svc.startNextSpectatorMatch(Date.now());
  const server = http.createServer();
  const wss = new WebSocketServer({ server, path: '/ws/live-ai' });

  wss.on('connection', (ws) => {
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw.toString('utf8'));
      const payload = msg.payload ?? {};
      if (msg.type === 'spectator:sync') {
        ws.send(JSON.stringify({ type: 'spectator:update', match: svc.getLiveSpectatorMatch(payload.playerName) }));
      } else if (msg.type === 'spectator:cheer') {
        const res = svc.cheerSpectatorFighter({
          matchId: payload.matchId,
          fighterId: payload.fighterId,
          playerName: payload.playerName,
        });
        ws.send(JSON.stringify({ type: 'spectator:cheer_ack', ...res }));
      } else if (msg.type === 'spectator:claim_reward') {
        const res = svc.claimSpectatorReward({
          matchId: payload.matchId,
          playerName: payload.playerName,
        });
        ws.send(JSON.stringify({ type: 'spectator:claim_ack', ...res }));
      } else if (msg.type === 'spectator:next_match') {
        svc.startNextSpectatorMatch(Date.now());
        const next = svc.getLiveSpectatorMatch(payload.playerName);
        ws.send(JSON.stringify({ type: 'spectator:update', match: next }));
      }
    });
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;

  const client = new WebSocket(`ws://127.0.0.1:${port}/ws/live-ai`);
  await new Promise((resolve) => client.once('open', resolve));

  const nextEvent = (expectedType) =>
    new Promise((resolve) => {
      const handler = (raw) => {
        const data = JSON.parse(raw.toString('utf8'));
        if (data.type === expectedType) {
          client.off('message', handler);
          resolve(data);
        }
      };
      client.on('message', handler);
    });

  try {
    // 1. Sync match
    const syncPromise = nextEvent('spectator:update');
    client.send(JSON.stringify({ type: 'spectator:sync', payload: { playerName: 'TesterW11' } }));
    const synced = await syncPromise;
    assert.equal(synced.match.status, 'live');
    const firstMatchId = synced.match.matchId;
    const fighterAId = synced.match.fighterA.aiPlayerId;

    // 2. Cheer Fighter A
    const cheerPromise = nextEvent('spectator:cheer_ack');
    client.send(
      JSON.stringify({
        type: 'spectator:cheer',
        payload: { matchId: firstMatchId, fighterId: fighterAId, playerName: 'TesterW11' },
      })
    );
    const cheered = await cheerPromise;
    assert.equal(cheered.ok, true);
    assert.equal(cheered.state.playerCheeredFighterId, fighterAId);

    // 3. Advance server ticks until match finishes
    for (let i = 0; i < 30; i++) {
      svc.simulateServerTick(Date.now() + i * 100);
      if (svc.getLiveSpectatorMatch('TesterW11').status === 'finished') break;
    }
    assert.equal(svc.getLiveSpectatorMatch('TesterW11').status, 'finished');

    // 4. Claim reward (first succeeds, second is idempotent alreadyClaimed)
    const claim1Promise = nextEvent('spectator:claim_ack');
    client.send(
      JSON.stringify({
        type: 'spectator:claim_reward',
        payload: { matchId: firstMatchId, playerName: 'TesterW11' },
      })
    );
    const claim1 = await claim1Promise;
    assert.equal(claim1.ok, true);
    assert.equal(claim1.alreadyClaimed, false);
    assert.ok(claim1.goldReward >= 140);

    const claim2Promise = nextEvent('spectator:claim_ack');
    client.send(
      JSON.stringify({
        type: 'spectator:claim_reward',
        payload: { matchId: firstMatchId, playerName: 'TesterW11' },
      })
    );
    const claim2 = await claim2Promise;
    assert.equal(claim2.ok, true);
    assert.equal(claim2.alreadyClaimed, true);
    assert.equal(claim2.goldReward, 0);

    // 5. Rotate to next match
    const nextPromise = nextEvent('spectator:update');
    client.send(JSON.stringify({ type: 'spectator:next_match', payload: { playerName: 'TesterW11' } }));
    const rotated = await nextPromise;
    assert.notEqual(rotated.match.matchId, firstMatchId);
    assert.equal(rotated.match.status, 'live');
  } finally {
    client.terminate();
    wss.close();
    server.close();
  }
});

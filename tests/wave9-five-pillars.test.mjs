import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';
import {
  ARENA_PROP_CONFIGS,
  BOSS_PHASE_2_HP_RATIO,
  BOSS_PHASE_3_HP_RATIO,
  BOSS_PHASE_COUNTER_WINDOW_SEC,
  COOP_SANCTUARY_COOLDOWN_SEC,
  EXECUTION_FINISHER_DURATION_SEC,
  EXECUTION_FINISHER_HP_THRESHOLD,
  SEASON_LEAGUE_DIVISIONS,
  computeBossPhaseCounterPresentation,
  computeCoopPrimerCallout,
  computeExecutionFinisherPresentation,
  computeSeasonalLeagueBracket,
  computeWave9ArenaPropPlacements,
  evaluateCoopSanctuaryRescue,
  isExecutionFinisherEligible,
  resolveArenaPropActivation,
} from '../src/engine/wave9FivePillars.ts';
import {
  WAVE9_COOP_QUICK_ORDERS,
  selectCoopAllyTarget,
} from '../src/engine/wave5CombatSystems.ts';
import { computeAiCompanionDecision } from '../src/engine/aiCombatBrain.ts';
import { createInitialSaveData } from '../src/data/gearData.ts';
import {
  claimFairCatchUpMission,
  evaluateFairCatchUpMissions,
} from '../src/data/fairProgression30Day.ts';
import { attachLiveAiWebSocketServer } from '../server.ts';
import { LiveAiPlayersService } from '../src/server/liveAiPlayersService.ts';

function makeTempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `artemis-w9-${label}-`));
}

function waitForMessage(ws, predicate, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for WebSocket message'));
    }, timeoutMs);

    const onMessage = (raw) => {
      try {
        const parsed = JSON.parse(String(raw));
        if (predicate(parsed)) {
          cleanup();
          resolve(parsed);
        }
      } catch {
        // ignore non-json
      }
    };

    const onError = (err) => {
      cleanup();
      reject(err);
    };

    const cleanup = () => {
      clearTimeout(timer);
      ws.off('message', onMessage);
      ws.off('error', onError);
    };

    ws.on('message', onMessage);
    ws.on('error', onError);
  });
}

test('Wave 9 Pillar 1 & 2: Boss Phase Transition Counter Window triggers at 65%/30% with FOV surge and counter bonus', () => {
  assert.equal(BOSS_PHASE_2_HP_RATIO, 0.65);
  assert.equal(BOSS_PHASE_3_HP_RATIO, 0.3);
  assert.equal(BOSS_PHASE_COUNTER_WINDOW_SEC, 2.5);

  const inactive = computeBossPhaseCounterPresentation(0, 2);
  assert.equal(inactive.active, false);
  assert.equal(inactive.counterMultiplier, 1);

  const p2Start = computeBossPhaseCounterPresentation(2.2, 2);
  assert.equal(p2Start.active, true);
  assert.equal(p2Start.counterMultiplier, 1.55);
  assert.ok(p2Start.fovPulseDelta > 0);
  assert.ok(p2Start.rimIntensityBoost > 0);

  const p3 = computeBossPhaseCounterPresentation(1.5, 3);
  assert.equal(p3.active, true);
  assert.equal(p3.counterMultiplier, 1.75);
  assert.equal(p3.guardBreakBonusRatio, 0.35);
});

test('Wave 9 Pillar 1 & 2: Execution Finisher eligibility (<=18% HP or guard-broken Boss/Elite) and slow-mo curve', () => {
  assert.equal(EXECUTION_FINISHER_HP_THRESHOLD, 0.18);

  assert.equal(
    isExecutionFinisherEligible({
      hp: 150,
      maxHp: 1000,
      isBoss: true,
      isElite: false,
    }),
    true
  );

  assert.equal(
    isExecutionFinisherEligible({
      hp: 600,
      maxHp: 1000,
      isBoss: false,
      isElite: true,
      guardBroken: true,
    }),
    true
  );

  assert.equal(
    isExecutionFinisherEligible({
      hp: 400,
      maxHp: 1000,
      isBoss: true,
      isElite: false,
      guardBroken: false,
    }),
    false
  );

  assert.equal(
    isExecutionFinisherEligible({
      hp: 50,
      maxHp: 1000,
      isBoss: true,
      isElite: false,
      isTrainingDummy: true,
    }),
    false
  );

  assert.equal(
    isExecutionFinisherEligible({
      hp: 50,
      maxHp: 1000,
      isBoss: false,
      isElite: true,
      isVaultPillar: true,
    }),
    false
  );

  const early = computeExecutionFinisherPresentation(EXECUTION_FINISHER_DURATION_SEC * 0.85);
  assert.equal(early.active, true);
  assert.equal(early.visualTimeScale, 0.2);
  assert.ok(early.fovDelta < 0);

  const late = computeExecutionFinisherPresentation(EXECUTION_FINISHER_DURATION_SEC * 0.1);
  assert.equal(late.active, true);
  assert.ok(late.visualTimeScale > 0.7);
  assert.equal(late.starSpearConverge, 1);
  assert.ok(late.shatterBurst > 0);
});

test('Wave 9 Pillar 1 & 2: 3D Arena Props stay on flanks away from obstacles and grant distinct buffs', () => {
  const obstacles = [
    { x: -6.2, z: -4.6, r: 1.0 },
    { x: 0, z: 0, r: 1.2 },
  ];
  const placements = computeWave9ArenaPropPlacements(42, 11, 11, obstacles, true);
  assert.equal(placements.length, 3);

  for (const prop of placements) {
    assert.ok(Math.abs(prop.x) >= 3.6, `Prop ${prop.id} should stay on flank (x=${prop.x})`);
    const distBlocked = Math.hypot(prop.x - obstacles[0].x, prop.z - obstacles[0].z);
    assert.ok(distBlocked >= obstacles[0].r + 1.85, 'Prop must clear obstacles');
  }

  for (const kind of Object.keys(ARENA_PROP_CONFIGS)) {
    const reward = resolveArenaPropActivation(kind, 2000, 300);
    assert.ok(reward.aoeDamage > 0);
    assert.ok(reward.goldBonus > 0);
    assert.ok(reward.calloutText.length > 0);
  }

  const crate = resolveArenaPropActivation('relic_crate', 2000, 300);
  assert.equal(crate.healAmount, 280);
  assert.equal(crate.shieldAmount, 240);
  const obelisk = resolveArenaPropActivation('celestial_obelisk', 2000, 300);
  assert.equal(obelisk.ultGain, 28);
  assert.equal(obelisk.aspdBonusPct, 18);
});

test('Wave 9 Pillar 3: Capped Daily Catch-Up locks on Day 1 & when on track, unlocks when behind, and claims idempotently', () => {
  const day1Save = createInitialSaveData();
  const day1Eval = evaluateFairCatchUpMissions(day1Save, undefined, '2026-11-21');
  assert.equal(day1Eval.isBehind, false);
  assert.equal(day1Eval.missions.length, 0);
  assert.ok(day1Eval.lockReason && day1Eval.lockReason.includes('Ngày 1'));

  const day1Claim = claimFairCatchUpMission(day1Save, 'catchup_rift', undefined, '2026-11-21');
  assert.equal(day1Claim.ok, false);

  // Day 10 save that stayed at chapter 1 with starter gear -> genuinely behind
  const behindSave = {
    ...day1Save,
    highestChapterCleared: 1,
    fairActiveDays: { count: 10, lastDate: '2026-11-20' },
    dailyRift: { date: '2026-11-21', runsRemaining: 1 },
    career: { ...(day1Save.career ?? {}), totalRuns: 4 },
  };
  const behindEval = evaluateFairCatchUpMissions(behindSave, undefined, '2026-11-21');
  assert.equal(behindEval.isBehind, true);
  assert.ok(behindEval.chapterDeficit >= 3);
  assert.equal(behindEval.missions.length, 3);

  const riftMission = behindEval.missions.find((m) => m.id === 'catchup_rift');
  assert.ok(riftMission && riftMission.completed && !riftMission.claimedToday);
  assert.ok(riftMission.rewardGold <= 3600);
  assert.ok(riftMission.rewardEpicShards <= 18);

  const claim1 = claimFairCatchUpMission(behindSave, 'catchup_rift', undefined, '2026-11-21');
  assert.equal(claim1.ok, true);
  assert.equal(claim1.nextSave.gold, behindSave.gold + riftMission.rewardGold);

  // Idempotent same-day guard
  const claim2 = claimFairCatchUpMission(claim1.nextSave, 'catchup_rift', undefined, '2026-11-21');
  assert.equal(claim2.ok, false);
});

test('Wave 9 Pillar 4: Equalized Seasonal League Brackets map cross-mode points across all 5 Firestore-aligned divisions', () => {
  assert.deepEqual(
    SEASON_LEAGUE_DIVISIONS.map((d) => d.id),
    ['bronze', 'silver', 'gold', 'platinum', 'astral_emperor']
  );

  const bronze = computeSeasonalLeagueBracket({
    weeklyBossSeasonPoints: 60,
    equalizedArenaWins: 1,
    coopSyncRuns: 1,
  });
  assert.equal(bronze.division.id, 'bronze');
  assert.equal(bronze.totalPoints, 60 + 28 + 12);
  assert.equal(bronze.nextDivision?.id, 'silver');
  assert.equal(bronze.pointsToPromote, 80);

  const platinum = computeSeasonalLeagueBracket({
    weeklyBossSeasonPoints: 500,
    equalizedArenaWins: 8,
    coopSyncRuns: 5,
  });
  assert.equal(platinum.totalPoints, 500 + 8 * 28 + 5 * 12);
  assert.equal(platinum.division.id, 'platinum');
  assert.equal(platinum.safeAboveRelegation, true);

  const emperor = computeSeasonalLeagueBracket({
    weeklyBossSeasonPoints: 1000,
    equalizedArenaWins: 10,
    coopSyncRuns: 4,
  });
  assert.equal(emperor.division.id, 'astral_emperor');
  assert.equal(emperor.nextDivision, null);
  assert.equal(emperor.progressToNextPct, 100);
});

test('Wave 9 Pillar 5: Co-op AI Sanctuary rescue (<35% / <50% protect_player), quick orders, and primer callouts work deterministically', () => {
  assert.deepEqual(
    WAVE9_COOP_QUICK_ORDERS.map((o) => o.id),
    ['focus_boss', 'break_guard', 'protect_player']
  );

  // Normal order does not rescue at 42% HP
  const noRescueAt42 = evaluateCoopSanctuaryRescue({
    playerHp: 420,
    playerMaxHp: 1000,
    cooldownSec: 0,
    order: 'focus_boss',
    allyName: 'Hộ Vệ [AI Live]',
  });
  assert.equal(noRescueAt42.triggered, false);

  // protect_player order rescues earlier at <50% HP
  const protectRescue = evaluateCoopSanctuaryRescue({
    playerHp: 420,
    playerMaxHp: 1000,
    cooldownSec: 0,
    order: 'protect_player',
    allyName: 'Hộ Vệ [AI Live]',
  });
  assert.equal(protectRescue.triggered, true);
  assert.equal(protectRescue.healAmount, 220);
  assert.equal(protectRescue.shieldAmount, 280);
  assert.equal(protectRescue.nextCooldownSec, COOP_SANCTUARY_COOLDOWN_SEC - 3.0);

  // Standard <35% HP emergency rescue
  const crisisRescue = evaluateCoopSanctuaryRescue({
    playerHp: 300,
    playerMaxHp: 1000,
    cooldownSec: 0,
    order: 'break_guard',
    allyName: 'Hộ Vệ [AI Live]',
  });
  assert.equal(crisisRescue.triggered, true);
  assert.equal(crisisRescue.nextCooldownSec, COOP_SANCTUARY_COOLDOWN_SEC);

  // Cooldown blocks repeat rescue
  const blocked = evaluateCoopSanctuaryRescue({
    playerHp: 120,
    playerMaxHp: 1000,
    cooldownSec: 5.2,
    order: 'protect_player',
  });
  assert.equal(blocked.triggered, false);

  // Target selection under break_guard and protect_player
  const enemies = [
    { id: 'mob_far', x: 9, z: 9, isBoss: false, isElite: false, hp: 500, alive: true },
    { id: 'elite_1', x: -7, z: -2, isBoss: false, isElite: true, hp: 2000, alive: true },
    { id: 'mob_near_player', x: 0.5, z: 6.2, isBoss: false, isElite: false, hp: 400, alive: true },
  ];
  assert.equal(
    selectCoopAllyTarget(enemies, 0, 0, 'break_guard', 0, 6)?.id,
    'elite_1'
  );
  assert.equal(
    selectCoopAllyTarget(enemies, -8, -8, 'protect_player', 0, 6)?.id,
    'mob_near_player'
  );

  // Primer callouts & companion decision under tactical order
  const breakCallout = computeCoopPrimerCallout({
    order: 'break_guard',
    bossShieldRatio: 0.6,
    allyUltCharge: 55,
    allyName: 'Hỏa Vũ',
  });
  assert.ok(breakCallout && breakCallout.includes('Phá Giáp'));

  const guardDecision = computeAiCompanionDecision({
    role: 'vanguard',
    slotIndex: 0,
    simTimeSec: 5.0,
    x: -6,
    z: -6,
    playerX: 0,
    playerZ: 6,
    arenaHalfW: 11,
    arenaHalfD: 11,
    target: {
      id: 1,
      x: 4,
      z: -4,
      hp: 800,
      maxHp: 1000,
      isBoss: false,
      isElite: false,
    },
    telegraphs: [],
    incomingBullets: [],
    obstacles: [],
    tacticalOrder: 'protect_player',
  });
  assert.ok(guardDecision.steerZ > 0, 'Vanguard under protect_player steers toward hero');
});

test('Wave 9 Pillar 5: Server-authoritative WebSocket Rival Revenge escalates vendetta and launches rematch duel', async () => {
  const dir = makeTempDir('revenge');
  const service = new LiveAiPlayersService(path.join(dir, 'live-ai.json'));

  const httpServer = http.createServer((_req, res) => {
    res.writeHead(200);
    res.end('ok');
  });
  attachLiveAiWebSocketServer(httpServer, service, { tickIntervalMs: 60_000 });
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/live-ai`);

  try {
    const snapMsg = await waitForMessage(ws, (m) => m.type === 'hub:snapshot');
    const ai = snapMsg.payload.players[0];

    // Challenge -> player loses -> AI rival escalates vendetta & emits rival:revenge_challenge
    const duelAcceptedP = waitForMessage(ws, (m) => m.type === 'duel:accepted');
    ws.send(
      JSON.stringify({
        type: 'duel:challenge',
        payload: { aiPlayerId: ai.id, challengerName: 'Tinh Xạ Thủ' },
      })
    );
    const duelAccepted = await duelAcceptedP;

    const revengeP = waitForMessage(ws, (m) => m.type === 'rival:revenge_challenge');
    const resultAckP = waitForMessage(ws, (m) => m.type === 'duel:result_ack');
    ws.send(
      JSON.stringify({
        type: 'duel:complete',
        payload: {
          duelId: duelAccepted.payload.duelId,
          aiPlayerId: ai.id,
          challengerName: 'Tinh Xạ Thủ',
          playerWon: false,
          durationSec: 18,
          aiDuelTier: 'master',
        },
      })
    );

    const [resultAck, revengeEvt] = await Promise.all([resultAckP, revengeP]);
    const trackedRival = resultAck.payload.rivals.find((r) => r.aiPlayerId === ai.id);
    assert.ok(trackedRival);
    assert.equal(trackedRival.vendettaPending, true);
    assert.ok(trackedRival.revengeStreak >= 1);
    assert.ok((trackedRival.revengeBonusPct ?? 0) >= 20);

    assert.equal(revengeEvt.payload.invite.kind, 'rival_revenge');
    assert.equal(revengeEvt.payload.invite.aiPlayerId, ai.id);
    assert.ok((revengeEvt.payload.invite.revengeBonusPct ?? 0) >= 20);

    // Accepting the rival_revenge invite returns invite:ack with a fresh duelId & opponent
    const rematchAckP = waitForMessage(
      ws,
      (m) => m.type === 'invite:ack' && m.payload.inviteId === revengeEvt.payload.invite.inviteId
    );
    ws.send(
      JSON.stringify({
        type: 'invite:respond',
        payload: {
          inviteId: revengeEvt.payload.invite.inviteId,
          action: 'accept',
          playerName: 'Tinh Xạ Thủ',
        },
      })
    );
    const rematch = await rematchAckP;
    assert.equal(rematch.payload.ok, true);
    assert.ok(rematch.payload.duelId);
    assert.notEqual(rematch.payload.duelId, duelAccepted.payload.duelId);
    assert.equal(rematch.payload.opponent.id, ai.id);

    // Winning the rematch settles the active vendetta
    const settledAckP = waitForMessage(
      ws,
      (m) => m.type === 'duel:result_ack' && m.payload.duelId === rematch.payload.duelId
    );
    ws.send(
      JSON.stringify({
        type: 'duel:complete',
        payload: {
          duelId: rematch.payload.duelId,
          aiPlayerId: ai.id,
          challengerName: 'Tinh Xạ Thủ',
          playerWon: true,
          durationSec: 14,
          aiDuelTier: 'master',
        },
      })
    );
    const settledAck = await settledAckP;
    const settledRival = settledAck.payload.rivals.find((r) => r.aiPlayerId === ai.id);
    assert.equal(settledRival?.vendettaPending, false);

    // On-demand rival:request_revenge also triggers revenge challenge cleanly
    const onDemandRevengeP = waitForMessage(ws, (m) => m.type === 'rival:revenge_challenge');
    ws.send(
      JSON.stringify({
        type: 'rival:request_revenge',
        payload: { aiPlayerId: ai.id, playerName: 'Tinh Xạ Thủ' },
      })
    );
    const onDemand = await onDemandRevengeP;
    assert.equal(onDemand.payload.invite.kind, 'rival_revenge');
  } finally {
    ws.close();
    await new Promise((resolve) => httpServer.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

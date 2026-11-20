import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';
import { attachLiveAiWebSocketServer } from '../server.ts';
import { LiveAiPlayersService } from '../src/server/liveAiPlayersService.ts';
import { WeeklyBossService } from '../src/server/weeklyBossService.ts';
import { createInitialSaveData } from '../src/data/gearData.ts';
import { computeDropProtectionSnapshot } from '../src/data/progressionAdvisor.ts';
import { buildMergedWeeklySeasonLeaderboard } from '../src/data/liveAiLeaderboards.ts';
import {
  COOP_RESONANCE_BONUS_PCT,
  createCoopSynergyClock,
  getCoopResonanceDamageMult,
  mapBossTelegraphToHud,
  onCoopAllyUltimateCast,
  onPlayerUltimateCastInCoop,
  stepCoopSynergyClock,
  toHudCoopSynergy,
} from '../src/engine/coopSynergy.ts';
import {
  createFixedTimestepClock,
  FIXED_SIM_DT,
  stepFixedTimestep,
} from '../src/engine/fixedTimestep.ts';

function makeTempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `artemis-w4-${label}-`));
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

test('Pillar 2 & 5: Co-op Ult Resonance Synergy maintains 12/30/60 FPS deterministic parity and Boss Telegraph HUD mapping', () => {
  const runAtFps = (fps) => {
    const fixedClock = createFixedTimestepClock();
    const syn = createCoopSynergyClock();
    const frameDt = 1 / fps;
    let totalElapsed = 0;
    let allyFired = false;
    let playerFired = false;
    let peakMult = 1;

    while (totalElapsed < 7.0 - 1e-6) {
      stepFixedTimestep(fixedClock, frameDt, (dt) => {
        if (!allyFired && fixedClock.totalSimTime >= 0.5) {
          allyFired = true;
          const r = onCoopAllyUltimateCast(syn, 'Thiên Lang');
          assert.equal(r.triggeredResonance, false);
        }
        if (!playerFired && fixedClock.totalSimTime >= 1.5) {
          playerFired = true;
          const r = onPlayerUltimateCastInCoop(syn);
          assert.equal(r.triggeredResonance, true);
          assert.equal(r.partnerName, 'Thiên Lang');
        }
        stepCoopSynergyClock(syn, dt);
        peakMult = Math.max(peakMult, getCoopResonanceDamageMult(syn));
      });
      totalElapsed += frameDt;
    }
    return {
      peakMult,
      totalResonances: syn.totalResonancesTriggered,
      finalResonanceSec: Number(syn.resonanceRemainingSec.toFixed(3)),
      finalMult: getCoopResonanceDamageMult(syn),
    };
  };

  const r60 = runAtFps(60);
  const r30 = runAtFps(30);
  const r12 = runAtFps(12);

  assert.equal(r60.peakMult, 1 + COOP_RESONANCE_BONUS_PCT / 100);
  assert.deepEqual(r30, r60);
  assert.deepEqual(r12, r60);
  assert.equal(r60.totalResonances, 1);
  // Resonance started at 1.5s for 5.0s -> expired by 6.5s -> at 7.0s it is 0
  assert.equal(r60.finalResonanceSec, 0);
  assert.equal(r60.finalMult, 1);

  // Reverse order: player casts Ult first, ally follows within 4s -> triggers resonance
  const synRev = createCoopSynergyClock();
  assert.equal(onPlayerUltimateCastInCoop(synRev).triggeredResonance, false);
  stepCoopSynergyClock(synRev, FIXED_SIM_DT * 60); // +1s
  assert.equal(onCoopAllyUltimateCast(synRev, 'Bạch Hổ').triggeredResonance, true);
  const hudPayload = toHudCoopSynergy(synRev, ['Bạch Hổ']);
  assert.equal(hudPayload.resonanceBonusPct, 25);
  assert.ok(hudPayload.resonanceRemainingSec > 4.5);

  // Boss Telegraph HUD mapping
  assert.equal(
    mapBossTelegraphToHud({ telegraphType: 'none', telegraphTimer: 0, telegraphDuration: 1, bossPhase: 1 }),
    null
  );
  const slamHud = mapBossTelegraphToHud({
    telegraphType: 'slam',
    telegraphTimer: 0.72,
    telegraphDuration: 1.1,
    bossPhase: 2,
  });
  assert.ok(slamHud);
  assert.equal(slamHud.kind, 'slam');
  assert.equal(slamHud.dangerLevel, 'critical');
  assert.match(slamHud.actionHint, /Né/i);

  const laneHud = mapBossTelegraphToHud({
    telegraphType: 'lane',
    telegraphTimer: 0.5,
    telegraphDuration: 0.9,
    bossPhase: 1,
  });
  assert.ok(laneHud);
  assert.equal(laneHud.kind, 'charge');
});

test('Pillar 3: computeDropProtectionSnapshot exposes exact Mythic Pity, Forge Shards, and Bad-Luck Protection thresholds', () => {
  const baseSave = createInitialSaveData();
  const initialSnap = computeDropProtectionSnapshot(baseSave);
  assert.equal(initialSnap.mythicEpicPityMax, 10);
  assert.equal(initialSnap.mythicLegendPityMax, 50);
  assert.equal(initialSnap.mythicEpicPityCurrent, 0);
  assert.equal(initialSnap.badLuckProtectionActive, false);

  // Simulate 7 dry mythic rolls + 3 completed runs without Rare -> Bad-Luck Protection activates
  const drySave = {
    ...baseSave,
    pity: {
      mythicRollsSinceEpic: 7,
      mythicRollsSinceSTier: 22,
      runeRollsSinceEpic: 0,
    },
    earlyForgeProgress: {
      rareShards: 12,
      epicShards: 4,
      claimedMilestones: ['ch1_ares'],
    },
    bestStagePerChapter: { 1: 4 },
    runHistory: [
      { id: 'r1', timestamp: 1, chapterId: 1, stageReached: 2, victory: false, kills: 10, gold: 40 },
      { id: 'r2', timestamp: 2, chapterId: 1, stageReached: 3, victory: false, kills: 18, gold: 65 },
      { id: 'r3', timestamp: 3, chapterId: 1, stageReached: 4, victory: false, kills: 25, gold: 90 },
    ],
  };

  const drySnap = computeDropProtectionSnapshot(drySave);
  assert.equal(drySnap.mythicEpicPityCurrent, 7);
  assert.equal(drySnap.mythicEpicRemaining, 3);
  assert.equal(drySnap.mythicLegendPityCurrent, 22);
  assert.equal(drySnap.mythicLegendRemaining, 28);
  assert.equal(drySnap.badLuckProtectionActive, true);
  assert.equal(drySnap.rareCraftReady, true);
  assert.equal(drySnap.primaryActionTarget, 'forge');
});

test('Pillar 4: WeeklyBossService 4-week Season Championship aggregates CP, enforces idempotent Season claims, and preserves verified humanRank', () => {
  const dir = makeTempDir('season');
  const storePath = path.join(dir, 'weekly-boss.json');
  try {
    const service = new WeeklyBossService(storePath);
    const userA = { uid: 'season-user-a', displayName: 'Cung Thủ Mùa A' };
    const userB = { uid: 'season-user-b', displayName: 'Cung Thủ Mùa B' };

    // Anchor two distinct weeks inside the same 4-week season window
    const week1Ms = Date.UTC(2026, 10, 16, 12, 0, 0); // Monday
    const week2Ms = week1Ms + 7 * 24 * 60 * 60 * 1000; // +7 days

    // Week 1: User A clears in 36s, User B clears in 48s
    const a1 = service.startAttempt(userA, week1Ms);
    service.submitAttempt(
      userA,
      {
        attemptId: a1.attempt.attemptId,
        seed: a1.attempt.seed,
        cleared: true,
        damageDealt: a1.schedule.bossMaxHp,
        simTicks: 2160, // 36s
        clearTimeMs: 36_000,
        remainingHpPct: 0.9,
        perfectDodges: 3,
      },
      week1Ms + 37_000
    );

    const b1 = service.startAttempt(userB, week1Ms + 10_000);
    service.submitAttempt(
      userB,
      {
        attemptId: b1.attempt.attemptId,
        seed: b1.attempt.seed,
        cleared: true,
        damageDealt: b1.schedule.bossMaxHp,
        simTicks: 2880, // 48s
        clearTimeMs: 48_000,
        remainingHpPct: 0.75,
        perfectDodges: 1,
      },
      week1Ms + 59_000
    );

    // Week 2: User A clears again -> accumulates 2 weeks of Season CP
    const a2 = service.startAttempt(userA, week2Ms);
    service.submitAttempt(
      userA,
      {
        attemptId: a2.attempt.attemptId,
        seed: a2.attempt.seed,
        cleared: true,
        damageDealt: a2.schedule.bossMaxHp,
        simTicks: 2220, // 37s
        clearTimeMs: 37_000,
        remainingHpPct: 0.85,
        perfectDodges: 2,
      },
      week2Ms + 38_000
    );

    const seasonStateA = service.getSeasonState(userA, week2Ms + 60_000);
    assert.ok(seasonStateA.player);
    assert.equal(seasonStateA.player.seasonRank, 1);
    assert.equal(seasonStateA.player.weeksParticipated, 2);
    assert.ok(seasonStateA.player.seasonPoints >= 200, 'Expected >= 200 CP across 2 #1 weeks');
    assert.equal(seasonStateA.player.history.length, 2);

    // Claiming Season Milestone 1 (season_contender: 50 CP) -> succeeds first time, idempotent on replay
    const firstClaim = service.claimSeasonReward(
      userA,
      'season_contender',
      'idem-season-contender-1',
      week2Ms + 70_000
    );
    assert.equal(firstClaim.alreadyClaimed, false);
    assert.equal(firstClaim.receipt.tierId, 'season_contender');

    const replaySameKey = service.claimSeasonReward(
      userA,
      'season_contender',
      'idem-season-contender-1',
      week2Ms + 71_000
    );
    assert.equal(replaySameKey.alreadyClaimed, true);

    const replayNewKeySameTier = service.claimSeasonReward(
      userA,
      'season_contender',
      'idem-season-contender-2',
      week2Ms + 72_000
    );
    assert.equal(replayNewKeySameTier.alreadyClaimed, true);

    // Merged Season Leaderboard preserves humanRank #1/#2 while merging [AI Live] in 'all' mode
    const aiService = new LiveAiPlayersService(path.join(dir, 'ai.json'));
    const aiPlayers = aiService.getSnapshot().players;

    const mergedAll = buildMergedWeeklySeasonLeaderboard({
      verifiedStandings: seasonStateA.standings,
      aiPlayers,
      filter: 'all',
      currentWeekNumberInSeason: seasonStateA.season.currentWeekNumberInSeason,
      currentUid: userA.uid,
    });
    const humanRowsInAll = mergedAll.filter((r) => !r.isAiLive);
    assert.equal(humanRowsInAll.length, 2);
    assert.equal(humanRowsInAll.find((r) => r.id === `season_human_${userA.uid}`)?.humanRank, 1);
    assert.equal(humanRowsInAll.find((r) => r.id === `season_human_${userB.uid}`)?.humanRank, 2);
    assert.ok(mergedAll.some((r) => r.isAiLive), 'Expected [AI Live] benchmarks in all mode');

    const mergedReal = buildMergedWeeklySeasonLeaderboard({
      verifiedStandings: seasonStateA.standings,
      aiPlayers,
      filter: 'real',
      currentWeekNumberInSeason: seasonStateA.season.currentWeekNumberInSeason,
      currentUid: userA.uid,
    });
    assert.equal(mergedReal.length, 2);
    assert.ok(mergedReal.every((r) => !r.isAiLive));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Pillar 5: All 18 [AI Live] profiles expose buildSnapshot and WebSocket chat:send broadcasts message + contextual AI Live reply', async () => {
  const dir = makeTempDir('chat');
  const liveAiFile = path.join(dir, 'live-ai.json');

  const httpServer = http.createServer((_req, res) => {
    res.writeHead(200);
    res.end('ok');
  });

  const liveAiService = new LiveAiPlayersService(liveAiFile);
  const wsHub = attachLiveAiWebSocketServer(httpServer, liveAiService, {
    tickIntervalMs: 60_000,
    chatReplyDelayMs: 60, // fast deterministic reply for test
  });

  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const addr = httpServer.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  assert.ok(port > 0);

  const client = new WebSocket(`ws://127.0.0.1:${port}/ws/live-ai`);
  try {
    // 1. Initial snapshot contains 18 players with full buildSnapshot + seeded chatHistory
    const snap = await waitForMessage(client, (m) => m.type === 'hub:snapshot');
    assert.equal(snap.payload.players.length, 18);
    for (const p of snap.payload.players) {
      assert.ok(p.buildSnapshot, `Missing buildSnapshot for ${p.displayName}`);
      assert.ok(p.buildSnapshot.weaponName.length > 0);
      assert.ok(p.buildSnapshot.armorName.length > 0);
      assert.ok(p.buildSnapshot.mountName.length > 0);
      assert.ok(p.buildSnapshot.wingName.length > 0);
      assert.ok(Array.isArray(p.buildSnapshot.favoriteSkills) && p.buildSnapshot.favoriteSkills.length >= 2);
    }
    assert.ok(snap.payload.chatHistory);
    assert.ok(snap.payload.chatHistory.lobby.length >= 1);
    assert.ok(snap.payload.chatHistory.guild.length >= 1);

    // 2. Send a lobby chat message mentioning Co-op -> expect player echo + contextual [AI Live] reply
    const playerMsgPromise = waitForMessage(
      client,
      (m) => m.type === 'chat:message' && m.payload?.senderTag === 'Người Thật'
    );
    const aiReplyPromise = waitForMessage(
      client,
      (m) => m.type === 'chat:message' && m.payload?.senderTag === '[AI Live]'
    );

    client.send(
      JSON.stringify({
        type: 'chat:send',
        payload: {
          channel: 'lobby',
          senderName: 'Cung Thủ Test',
          text: 'Ai đi Co-op Raid Boss Tinh Giới cùng mình không?',
        },
      })
    );

    const playerMsg = await playerMsgPromise;
    const aiReply = await aiReplyPromise;
    assert.equal(playerMsg.payload.channel, 'lobby');
    assert.equal(playerMsg.payload.senderName, 'Cung Thủ Test');
    assert.equal(aiReply.payload.channel, 'lobby');
    assert.equal(aiReply.payload.senderTag, '[AI Live]');
    assert.ok(aiReply.payload.aiPlayerId);
    assert.ok(aiReply.payload.text.length > 8);

    // 3. Respect 700ms anti-spam rate-limit, then verify Guild channel chat works independently
    await new Promise((resolve) => setTimeout(resolve, 750));
    const guildReplyPromise = waitForMessage(
      client,
      (m) =>
        m.type === 'chat:message' &&
        m.payload?.channel === 'guild' &&
        m.payload?.senderTag === '[AI Live]'
    );
    client.send(
      JSON.stringify({
        type: 'chat:send',
        payload: {
          channel: 'guild',
          senderName: 'Cung Thủ Test',
          text: 'Cả bang đánh Boss Bang hôm nay nhé!',
        },
      })
    );
    const guildReply = await guildReplyPromise;
    assert.equal(guildReply.payload.channel, 'guild');
    assert.ok(guildReply.payload.aiPlayerId);
  } finally {
    client.close();
    wsHub.close();
    await new Promise((resolve) => httpServer.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';
import {
  COOP_TACTICAL_PINGS,
  GUARD_BREAK_DURATION_SEC,
  GUARD_BREAK_RECOVERY_ESCALATION,
  GUARD_BREAK_VULN_MULT,
  applyBossStaggerDamage,
  createBossStaggerState,
  createStyleMomentumState,
  getStyleRewardBonusPct,
  pickCoopPingAiReply,
  recordStyleAction,
  recordStyleDamageTaken,
  stepBossStaggerState,
  stepStyleMomentum,
} from '../src/engine/wave7CombatSystems.ts';
import {
  GEAR_TEMPLATES,
  createInitialSaveData,
  findBestUpgradeTransferSource,
  transferGearUpgradeLevel,
} from '../src/data/gearData.ts';
import { computeWeeklyFairnessSummary } from '../src/data/progressionAdvisor.ts';
import { computeWeeklyBossAnalytics } from '../src/data/weeklyBossData.ts';
import { GearSlot, Rarity } from '../src/types/game.ts';
import { WeeklyBossService } from '../src/server/weeklyBossService.ts';
import { LiveAiPlayersService } from '../src/server/liveAiPlayersService.ts';
import { attachLiveAiWebSocketServer } from '../server.ts';

function makeTmpStoreDir(prefix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `${prefix}-`));
  return {
    dir,
    file: path.join(dir, 'store.json'),
    cleanup: () => fs.rmSync(dir, { recursive: true, force: true }),
  };
}

function waitForWsMessage(ws, predicate, timeoutMs = 4000) {
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

test('Wave 7 Pillar 1/2: Deterministic Boss Stagger / Guard-Break (4.0s, +45% vuln, +18% escalation)', () => {
  const state = createBossStaggerState(10_000);
  const initialMax = state.max;
  assert.equal(initialMax, 2200);
  assert.equal(state.current, 0);
  assert.equal(state.breaksTriggered, 0);

  // Normal hit builds 1.0x stagger
  const h1 = applyBossStaggerDamage(state, 500);
  assert.equal(h1.triggeredBreak, false);
  assert.equal(h1.isBroken, false);
  assert.equal(h1.damageMultiplier, 1.0);
  assert.equal(state.current, 500);

  // Crit (+28%) + Counter (+140%) = 2.68x stagger -> 500 * 2.68 = 1340 -> total 1840
  const h2 = applyBossStaggerDamage(state, 500, { isCrit: true, isCounterShot: true });
  assert.equal(h2.triggeredBreak, false);
  assert.ok(Math.abs(state.current - 1840) < 1e-6);

  // Ultimate (+220% -> 3.2x) pushes past 2200 -> triggers Guard Break!
  const h3 = applyBossStaggerDamage(state, 200, { isUltimate: true });
  assert.equal(h3.triggeredBreak, true);
  assert.equal(h3.isBroken, true);
  assert.equal(h3.damageMultiplier, GUARD_BREAK_VULN_MULT);
  assert.equal(state.brokenRemainingSec, GUARD_BREAK_DURATION_SEC);
  assert.equal(state.breaksTriggered, 1);

  // Hits while broken keep +45% vulnerability without double-triggering
  const hWhileBroken = applyBossStaggerDamage(state, 300);
  assert.equal(hWhileBroken.triggeredBreak, false);
  assert.equal(hWhileBroken.isBroken, true);
  assert.equal(hWhileBroken.damageMultiplier, GUARD_BREAK_VULN_MULT);

  // Step fixed 1/60s ticks for 4.0s -> recovers cleanly with +18% higher max stagger bar
  let recoveredTick = false;
  for (let i = 0; i < 245; i++) {
    const step = stepBossStaggerState(state, 1 / 60);
    if (step.recovered) {
      recoveredTick = true;
      break;
    }
  }
  assert.equal(recoveredTick, true);
  assert.equal(state.brokenRemainingSec, 0);
  assert.equal(state.current, 0);
  assert.equal(state.max, Math.round(initialMax * GUARD_BREAK_RECOVERY_ESCALATION));
});

test('Wave 7 Pillar 1/2: Style Momentum (B -> A -> S -> SS -> SSS), damage penalty & decay', () => {
  const st = createStyleMomentumState();
  assert.equal(st.grade, 'B');
  assert.equal(getStyleRewardBonusPct('B'), 0);
  assert.equal(getStyleRewardBonusPct('A'), 5);
  assert.equal(getStyleRewardBonusPct('S'), 10);
  assert.equal(getStyleRewardBonusPct('SS'), 16);
  assert.equal(getStyleRewardBonusPct('SSS'), 22);

  // Climb through A -> S -> SS -> SSS
  const r1 = recordStyleAction(st, 'guard_break'); // +210 -> 210 (B)
  assert.equal(r1.newGrade, 'B');
  const r2 = recordStyleAction(st, 'perfect_dodge'); // +115 -> 325 (A)
  assert.equal(r2.promoted, true);
  assert.equal(r2.newGrade, 'A');

  recordStyleAction(st, 'guard_break'); // +210 -> 535 (S)
  assert.equal(st.grade, 'S');
  recordStyleAction(st, 'guard_break'); // +210 -> 745 (S)
  recordStyleAction(st, 'counter_shot'); // +85 -> 830 (SS)
  assert.equal(st.grade, 'SS');

  recordStyleAction(st, 'guard_break'); // +210 -> 1040 (SS)
  const rSSS = recordStyleAction(st, 'ultimate'); // +130 -> 1170 (SSS)
  assert.equal(rSSS.promoted, true);
  assert.equal(rSSS.newGrade, 'SSS');
  assert.equal(st.peakGrade, 'SSS');

  // Taking damage drops score cleanly while keeping peakGrade intact
  const afterHit = recordStyleDamageTaken(st);
  assert.equal(afterHit, 'SS');
  assert.equal(st.peakGrade, 'SSS');

  // After grace window expires, momentum decays smoothly
  const beforeDecay = st.score;
  for (let i = 0; i < 180; i++) stepStyleMomentum(st, 1 / 60);
  assert.ok(st.score < beforeDecay, 'Style score decays after hold window expires');

  // Co-op 3D Tactical Ping replies for all 3 orders
  for (const order of ['focus_boss', 'clear_adds', 'hold_resonance']) {
    assert.ok(COOP_TACTICAL_PINGS[order].label.length > 0);
    const reply = pickCoopPingAiReply(order, 42);
    assert.ok(typeof reply === 'string' && reply.length > 8);
  }
});

test('Wave 7 Pillar 3: 100% Free Gear Upgrade Transfer & Weekly Fairness Summary', () => {
  const save = createInitialSaveData();
  const wpnTemplates = Object.values(GEAR_TEMPLATES).filter((t) => t.slot === GearSlot.WEAPON);
  const armorTemplates = Object.values(GEAR_TEMPLATES).filter((t) => t.slot === GearSlot.ARMOR);
  assert.ok(wpnTemplates.length >= 2);
  assert.ok(armorTemplates.length >= 1);

  const oldWeapon = {
    uid: 'wpn_old_lv18',
    templateId: wpnTemplates[0].templateId,
    rarity: Rarity.RARE,
    level: 18,
  };
  const newWeapon = {
    uid: 'wpn_new_epic_lv1',
    templateId: wpnTemplates[1].templateId,
    rarity: Rarity.EPIC,
    level: 1,
  };
  const someArmor = {
    uid: 'arm_cross_slot_lv20',
    templateId: armorTemplates[0].templateId,
    rarity: Rarity.EPIC,
    level: 20,
  };

  save.inventory.push(oldWeapon, newWeapon, someArmor);
  save.equipped[GearSlot.WEAPON] = newWeapon.uid;
  save.gold = 500;
  save.gems = 100;
  save.reforgeGoldPityCount = 4;
  save.pity.mythicRollsSinceEpic = 7;

  // Fairness summary detects eligible free transfer + exact pity counters
  const summaryBefore = computeWeeklyFairnessSummary(save);
  assert.equal(summaryBefore.mythicEpicRemaining, 3);
  assert.equal(summaryBefore.reforgeGoldPityCount, 4);
  assert.equal(summaryBefore.reforgeGoldPityMax, 5);
  assert.ok(summaryBefore.freeTransferEligibleCount >= 1);

  const bestSrc = findBestUpgradeTransferSource(save, newWeapon.uid);
  assert.ok(bestSrc && bestSrc.uid === oldWeapon.uid);

  // Reject cross-slot transfer
  const badCross = transferGearUpgradeLevel(save, someArmor.uid, newWeapon.uid);
  assert.equal(badCross.ok, false);

  // Valid same-slot transfer swaps levels for 0 Gold / 0 Gems and destroys 0 items
  const beforeInvCount = save.inventory.length;
  const res = transferGearUpgradeLevel(save, oldWeapon.uid, newWeapon.uid);
  assert.equal(res.ok, true);
  assert.equal(res.previousTargetLevel, 1);
  assert.equal(res.nextTargetLevel, 18);
  assert.ok(res.powerDelta > 0);
  assert.equal(res.nextSave.gold, 500);
  assert.equal(res.nextSave.gems, 100);
  assert.equal(res.nextSave.inventory.length, beforeInvCount);

  const updatedNew = res.nextSave.inventory.find((g) => g.uid === newWeapon.uid);
  const updatedOld = res.nextSave.inventory.find((g) => g.uid === oldWeapon.uid);
  assert.equal(updatedNew?.level, 18);
  assert.equal(updatedOld?.level, 1);
});

test('Wave 7 Pillar 4: Verified Weekly & Weekend Boss Guard-Break / Style Telemetry & Gap Analytics', () => {
  const tmp = makeTmpStoreDir('wave7-weekly-boss');
  try {
    const svc = new WeeklyBossService(tmp.file);
    const nowMs = Date.now();
    const u1 = { uid: 'u_top1', displayName: 'Thần Xạ Top1' };
    const u2 = { uid: 'u_rank2', displayName: 'Cung Thủ Rank2' };

    const s1 = svc.startAttempt(u1, nowMs);
    svc.submitAttempt(
      u1,
      {
        attemptId: s1.attempt.attemptId,
        seed: s1.attempt.seed,
        displayName: u1.displayName,
        cleared: true,
        damageDealt: s1.schedule.bossMaxHp,
        simTicks: 1920,
        clearTimeMs: 32000,
        remainingHpPct: 0.96,
        perfectDodges: 5,
        splitsMs: [8000, 16000, 24000, 32000],
        guardBreaksLanded: 99, // must be clamped to 20
        peakStyleGrade: 'SSS',
      },
      nowMs + 33000
    );

    const s2 = svc.startAttempt(u2, nowMs + 40000);
    svc.submitAttempt(
      u2,
      {
        attemptId: s2.attempt.attemptId,
        seed: s2.attempt.seed,
        displayName: u2.displayName,
        cleared: true,
        damageDealt: s2.schedule.bossMaxHp,
        simTicks: 2400,
        clearTimeMs: 40000,
        remainingHpPct: 0.85,
        perfectDodges: 3,
        splitsMs: [10000, 20000, 30000, 40000],
        guardBreaksLanded: 4,
        peakStyleGrade: 'SS',
      },
      nowMs + 81000
    );

    const stateForU2 = svc.getState(u2, nowMs + 82000);
    assert.equal(stateForU2.leaderboard[0].guardBreaksLanded, 20, 'clamps guardBreaksLanded to 20');
    assert.equal(stateForU2.leaderboard[0].peakStyleGrade, 'SSS');
    assert.equal(stateForU2.leaderboard[1].guardBreaksLanded, 4);
    assert.equal(stateForU2.leaderboard[1].peakStyleGrade, 'SS');

    const analytics = computeWeeklyBossAnalytics(stateForU2);
    assert.equal(analytics.totalRankedPlayers, 2);
    assert.equal(analytics.playerRank, 2);
    assert.equal(analytics.nextRankTargetName, 'Thần Xạ Top1');
    assert.ok(analytics.gapToNextRank !== null && analytics.gapToNextRank > 0);
    assert.equal(analytics.gapToTop1, analytics.gapToNextRank);
    assert.equal(analytics.top3AvgClearTimeMs, 36000);
    assert.equal(analytics.playerGuardBreaks, 4);
    assert.equal(analytics.playerPeakStyleGrade, 'SS');

    // Weekend Blitz also persists bounded telemetry and rejects invalid style grades gracefully
    const wStart = svc.startWeekendBlitzAttempt(u2, nowMs + 90000);
    svc.submitWeekendBlitzAttempt(
      u2,
      {
        attemptId: wStart.attempt.attemptId,
        seed: wStart.attempt.seed,
        displayName: u2.displayName,
        cleared: true,
        damageDealt: wStart.schedule.bossMaxHp,
        simTicks: 2100,
        clearTimeMs: 35000,
        remainingHpPct: 0.9,
        perfectDodges: 4,
        guardBreaksLanded: 3,
        peakStyleGrade: 'INVALID_TIER',
      },
      nowMs + 126000
    );
    const wState = svc.getWeekendBlitzState(u2, nowMs + 127000);
    assert.equal(wState.leaderboard[0].guardBreaksLanded, 3);
    assert.equal(wState.leaderboard[0].peakStyleGrade, undefined);
  } finally {
    tmp.cleanup();
  }
});

test('Wave 7 Pillar 5: Server-Authoritative Live Server-Wide Bounty Board + Real WebSocket Flow', async () => {
  const tmp = makeTmpStoreDir('wave7-bounty-ws');
  const httpServer = http.createServer((_req, res) => {
    res.writeHead(200);
    res.end('ok');
  });

  const liveAiService = new LiveAiPlayersService(tmp.file);
  const wsHub = attachLiveAiWebSocketServer(httpServer, liveAiService, {
    tickIntervalMs: 60_000,
  });

  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  assert.ok(port > 0);

  const client = new WebSocket(`ws://127.0.0.1:${port}/ws/live-ai`);
  const playerName = 'Tiên Phong Wave7';

  try {
    // 1. Initial hub:snapshot includes serverBounty
    const snap = await waitForWsMessage(client, (m) => m.type === 'hub:snapshot');
    assert.ok(snap.payload.serverBounty, 'hub:snapshot must include serverBounty');
    assert.equal(snap.payload.serverBounty.completed, false);
    const initialPoints = snap.payload.serverBounty.currentPoints;
    const targetPoints = snap.payload.serverBounty.targetPoints;

    // 2. Claiming before target is rejected cleanly
    const earlyClaimPromise = waitForWsMessage(client, (m) => m.type === 'bounty:claim_ack');
    client.send(
      JSON.stringify({
        type: 'bounty:claim_reward',
        payload: { playerName, bountyId: snap.payload.serverBounty.bountyId },
      })
    );
    const earlyClaim = await earlyClaimPromise;
    assert.equal(earlyClaim.payload.ok, false);
    assert.equal(earlyClaim.payload.goldReward, 0);

    // 3. Contribute over WebSocket until target is completed
    let latestPoints = initialPoints;
    let completed = false;
    let guard = 0;
    while (!completed && guard < 10) {
      const updatePromise = waitForWsMessage(client, (m) => m.type === 'bounty:update');
      client.send(
        JSON.stringify({
          type: 'bounty:contribute',
          payload: {
            playerName,
            heroId: 'artemis',
            points: 450,
            sourceLabel: 'Phá Giáp Boss',
          },
        })
      );
      const upd = await updatePromise;
      assert.ok(upd.payload.serverBounty.currentPoints > latestPoints);
      latestPoints = upd.payload.serverBounty.currentPoints;
      completed = upd.payload.serverBounty.completed;
      guard++;
    }
    assert.equal(completed, true);
    assert.ok(latestPoints >= targetPoints);

    // 4. First claim succeeds with Gold + Gems + StarDust
    const claim1Promise = waitForWsMessage(client, (m) => m.type === 'bounty:claim_ack');
    client.send(
      JSON.stringify({
        type: 'bounty:claim_reward',
        payload: { playerName, bountyId: snap.payload.serverBounty.bountyId },
      })
    );
    const claim1 = await claim1Promise;
    assert.equal(claim1.payload.ok, true);
    assert.equal(claim1.payload.alreadyClaimed, false);
    assert.ok(claim1.payload.goldReward > 0);
    assert.ok(claim1.payload.gemsReward > 0);
    assert.ok(claim1.payload.starDustReward > 0);
    assert.equal(claim1.payload.state.claimedByPlayer, true);

    // 5. Second claim is strictly idempotent (alreadyClaimed=true, 0 currency)
    const claim2Promise = waitForWsMessage(client, (m) => m.type === 'bounty:claim_ack');
    client.send(
      JSON.stringify({
        type: 'bounty:claim_reward',
        payload: { playerName, bountyId: snap.payload.serverBounty.bountyId },
      })
    );
    const claim2 = await claim2Promise;
    assert.equal(claim2.payload.ok, true);
    assert.equal(claim2.payload.alreadyClaimed, true);
    assert.equal(claim2.payload.goldReward, 0);
    assert.equal(claim2.payload.gemsReward, 0);
    assert.equal(claim2.payload.starDustReward, 0);

    // 6. bounty:sync echoes claimedByPlayer=true for this player
    const syncPromise = waitForWsMessage(client, (m) => m.type === 'bounty:update');
    client.send(JSON.stringify({ type: 'bounty:sync', payload: { playerName } }));
    const synced = await syncPromise;
    assert.equal(synced.payload.serverBounty.claimedByPlayer, true);
  } finally {
    client.close();
    wsHub.close();
    await new Promise((resolve) => httpServer.close(resolve));
    tmp.cleanup();
  }
});

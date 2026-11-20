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

function makeTempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `artemis-ws-${label}-`));
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

test('Real WebSocket /ws/live-ai serves 18 AI Live players, 1v1 duels with idempotent completion, and live Weekly Boss rank broadcasts', async () => {
  const dir = makeTempDir('hub');
  const liveAiFile = path.join(dir, 'live-ai.json');
  const weeklyBossFile = path.join(dir, 'weekly-boss.json');

  const httpServer = http.createServer((_req, res) => {
    res.writeHead(200);
    res.end('ok');
  });

  const liveAiService = new LiveAiPlayersService(liveAiFile);
  const wsHub = attachLiveAiWebSocketServer(httpServer, liveAiService, {
    tickIntervalMs: 60_000, // keep deterministic during assertions
  });

  const weeklyBossService = new WeeklyBossService(weeklyBossFile, (update) => {
    wsHub.broadcastWeeklyBossUpdate({
      weekId: update.weekId,
      displayName: update.displayName,
      rank: update.rank,
      verifiedScore: update.verifiedScore,
      cleared: update.cleared,
      leaderboard: update.leaderboard,
    });
  });

  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  assert.ok(port > 0);

  const client = new WebSocket(`ws://127.0.0.1:${port}/ws/live-ai`);

  try {
    // 1. Initial connection immediately receives hub:snapshot with 18 named [AI Live] players
    const snapshotMsg = await waitForMessage(client, (m) => m.type === 'hub:snapshot');
    assert.equal(snapshotMsg.payload.onlineAiCount, 18);
    assert.equal(snapshotMsg.payload.players.length, 18);
    assert.ok(snapshotMsg.payload.players.every((p) => p.tag === '[AI Live]'));

    const targetAi = snapshotMsg.payload.players[0];

    // 2. Challenge an AI Live player -> receive duel:accepted + hub:activity broadcast
    const duelAcceptedPromise = waitForMessage(client, (m) => m.type === 'duel:accepted');
    const duelActivityPromise = waitForMessage(
      client,
      (m) => m.type === 'hub:activity' && m.payload?.updatedPlayer?.id === targetAi.id
    );
    client.send(
      JSON.stringify({
        type: 'duel:challenge',
        payload: { aiPlayerId: targetAi.id, challengerName: 'Xạ Thủ Kiểm Thử' },
      })
    );

    const accepted = await duelAcceptedPromise;
    const activity = await duelActivityPromise;
    assert.ok(accepted.payload.duelId);
    assert.equal(accepted.payload.opponent.id, targetAi.id);
    assert.equal(activity.payload.updatedPlayer.status, 'in_duel');

    const duelId = accepted.payload.duelId;
    const prevLosses = accepted.payload.opponent.duelLosses;

    // 3. Complete duel once -> processed, updates opponent stats
    const ack1Promise = waitForMessage(
      client,
      (m) => m.type === 'duel:result_ack' && m.payload?.duelId === duelId
    );
    client.send(
      JSON.stringify({
        type: 'duel:complete',
        payload: {
          duelId,
          aiPlayerId: targetAi.id,
          challengerName: 'Xạ Thủ Kiểm Thử',
          playerWon: true,
          durationSec: 22,
        },
      })
    );
    const ack1 = await ack1Promise;
    assert.equal(ack1.payload.alreadyProcessed, false);
    assert.equal(ack1.payload.ratingDelta, 24);
    assert.equal(ack1.payload.opponent.duelLosses, prevLosses + 1);

    // 4. Replay exact same duel:complete -> strictly idempotent (no double loss / rating)
    const ack2Promise = waitForMessage(
      client,
      (m) => m.type === 'duel:result_ack' && m.payload?.duelId === duelId
    );
    client.send(
      JSON.stringify({
        type: 'duel:complete',
        payload: {
          duelId,
          aiPlayerId: targetAi.id,
          challengerName: 'Xạ Thủ Kiểm Thử',
          playerWon: true,
          durationSec: 22,
        },
      })
    );
    const ack2 = await ack2Promise;
    assert.equal(ack2.payload.alreadyProcessed, true);
    assert.equal(ack2.payload.ratingDelta, 0);
    assert.equal(ack2.payload.opponent.duelLosses, prevLosses + 1);

    // 5. Weekly Boss Fair-Play Gate: rejects autoPilotUsed: true with 422 AUTOPILOT_FORBIDDEN_IN_RANKED
    const nowMs = Date.UTC(2026, 10, 18, 16, 0, 0);
    const user = { uid: 'uid-fair-ws', displayName: 'Xạ Thủ Công Bằng' };
    const badStart = weeklyBossService.startAttempt(user, nowMs);
    assert.throws(
      () =>
        weeklyBossService.submitAttempt(
          user,
          {
            attemptId: badStart.attempt.attemptId,
            seed: badStart.attempt.seed,
            cleared: true,
            damageDealt: badStart.schedule.bossMaxHp,
            simTicks: 2400,
            clearTimeMs: 40_000,
            remainingHpPct: 0.9,
            perfectDodges: 2,
            autoPilotUsed: true,
          },
          nowMs + 41_000
        ),
      (err) => err?.statusCode === 422 && err?.code === 'AUTOPILOT_FORBIDDEN_IN_RANKED'
    );

    // 6. Verified manual Weekly Boss run broadcasts live weekly_boss:rank_update over WebSocket!
    const rankPushPromise = waitForMessage(client, (m) => m.type === 'weekly_boss:rank_update');
    const goodStart = weeklyBossService.startAttempt(user, nowMs + 50_000);
    const submitted = weeklyBossService.submitAttempt(
      user,
      {
        attemptId: goodStart.attempt.attemptId,
        seed: goodStart.attempt.seed,
        cleared: true,
        damageDealt: goodStart.schedule.bossMaxHp,
        simTicks: 2100,
        clearTimeMs: 35_000,
        remainingHpPct: 0.9,
        perfectDodges: 3,
        autoPilotUsed: false,
      },
      nowMs + 86_000
    );
    assert.equal(submitted.ok, true);
    assert.equal(submitted.rank, 1);

    const rankPush = await rankPushPromise;
    assert.equal(rankPush.payload.displayName, 'Xạ Thủ Công Bằng');
    assert.equal(rankPush.payload.rank, 1);
    assert.equal(rankPush.payload.verifiedScore, submitted.verifiedScore);
    assert.equal(rankPush.payload.leaderboard.length, 1);
  } finally {
    client.close();
    wsHub.close();
    await new Promise((resolve) => httpServer.close(resolve));
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

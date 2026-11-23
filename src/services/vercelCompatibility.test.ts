import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  claimWeekendBlitzReward,
  claimWeeklyBossReward,
  claimWeeklyBossSeasonReward,
  fetchWeekendBlitzState,
  fetchWeeklyBossSeasonState,
  fetchWeeklyBossState,
  isWeeklyBossStandaloneFallbackActive,
  resetWeeklyBossApiModeForTests,
  startWeekendBlitzAttempt,
  startWeeklyBossAttempt,
  submitWeekendBlitzAttempt,
  submitWeeklyBossAttempt,
} from './weeklyBossApi';
import { resetWeeklyBossStandaloneStoreForTests } from './weeklyBossLocalFallback';
import { LiveAiLocalFallback, type LiveAiServerEnvelope } from './liveAiLocalFallback';
import type {
  AiLiveChatMessage,
  AiLiveHubSnapshot,
  LiveGuildBossState,
  LiveGuildWarSnapshot,
  LiveMiniCupState,
  LiveServerBountyState,
  LiveSpectatorMatchSnapshot,
} from '../types/game';

test('vercel.json is valid and protects static assets, GLB caching, and API routes', () => {
  const raw = fs.readFileSync(path.resolve(process.cwd(), 'vercel.json'), 'utf8');
  const cfg = JSON.parse(raw) as {
    framework: string;
    buildCommand: string;
    outputDirectory: string;
    headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
    rewrites: Array<{ source: string; destination: string }>;
  };

  assert.equal(cfg.framework, 'vite');
  assert.match(cfg.buildCommand, /npm run build$/);
  assert.match(cfg.buildCommand, /VITE_GLB_CDN_BASE_URL.*aetherbow-glb\.puugoo002\.workers\.dev/);
  assert.equal(cfg.outputDirectory, 'dist');

  const glbHeader = cfg.headers.find((h) => h.source.includes('glb'));
  assert.ok(glbHeader, 'vercel.json must configure caching headers for .glb assets');
  const cacheCtl = glbHeader.headers.find((h) => h.key.toLowerCase() === 'cache-control');
  assert.ok(cacheCtl && cacheCtl.value.includes('max-age=86400'), 'GLB assets must be cached');

  const spaRewrite = cfg.rewrites.find((r) => r.destination === '/index.html');
  assert.ok(spaRewrite, 'vercel.json must define an SPA fallback rewrite');

  // Verify the negative lookahead pattern does NOT match /assets, /api, /ws, or file paths
  const innerPattern = spaRewrite.source.replace(/^\//, '');
  const re = new RegExp(`^/${innerPattern}$`);
  assert.equal(re.test('/'), true);
  assert.equal(re.test('/lobby'), true);
  assert.equal(re.test('/chapter/1'), true);
  assert.equal(re.test('/assets/heroes/golden-dress-girl-lite.glb'), false);
  assert.equal(re.test('/api/weekly-boss/state'), false);
  assert.equal(re.test('/ws/live-ai'), false);
  assert.equal(re.test('/favicon.ico'), false);
});

test('weeklyBossApi falls back seamlessly on Vercel 404 for Weekly, Season, and Weekend Blitz', async () => {
  resetWeeklyBossApiModeForTests();
  resetWeeklyBossStandaloneStoreForTests();

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async () =>
    new Response('Not Found', {
      status: 404,
      headers: { 'content-type': 'text/plain' },
    })) as typeof fetch;

  try {
    const initial = await fetchWeeklyBossState();
    assert.equal(isWeeklyBossStandaloneFallbackActive(), true);
    assert.equal(initial.player?.attemptsRemaining, 3);

    const started = await startWeeklyBossAttempt('VercelTester');
    assert.equal(started.attemptsUsed, 1);
    assert.equal(started.attemptsRemaining, 2);

    const submitted = await submitWeeklyBossAttempt({
      attemptId: started.attempt.attemptId,
      seed: started.attempt.seed,
      displayName: 'VercelTester',
      cleared: true,
      damageDealt: started.schedule.bossMaxHp,
      simTicks: 2400,
      clearTimeMs: 42_000,
      remainingHpPct: 0.85,
      perfectDodges: 4,
      splitsMs: [10_000, 21_000, 32_000, 42_000],
      counterHitsLanded: 3,
      guardBreaksLanded: 2,
      peakStyleGrade: 'SS',
    });
    assert.equal(submitted.ok, true);
    assert.ok(submitted.verifiedScore >= 12_000);
    assert.equal(submitted.rank, 1);

    const claim1 = await claimWeeklyBossReward({
      tierId: 'weekly_challenger',
      idempotencyKey: 'idem_test_1',
    });
    assert.equal(claim1.ok, true);
    assert.equal(claim1.alreadyClaimed, false);

    // Idempotent second claim returns alreadyClaimed=true
    const claim2 = await claimWeeklyBossReward({
      tierId: 'weekly_challenger',
      idempotencyKey: 'idem_test_1',
    });
    assert.equal(claim2.alreadyClaimed, true);

    const season = await fetchWeeklyBossSeasonState();
    assert.ok((season.player?.seasonPoints ?? 0) >= 50);

    const seasonClaim = await claimWeeklyBossSeasonReward({
      tierId: 'season_contender',
      idempotencyKey: 'idem_season_1',
    });
    assert.equal(seasonClaim.ok, true);
    assert.equal(seasonClaim.alreadyClaimed, false);

    // Weekend Blitz flow
    const weState = await fetchWeekendBlitzState();
    assert.equal(weState.player?.attemptsRemaining, 3);
    const weStart = await startWeekendBlitzAttempt('VercelTester');
    const weSubmit = await submitWeekendBlitzAttempt({
      attemptId: weStart.attempt.attemptId,
      seed: weStart.attempt.seed,
      displayName: 'VercelTester',
      cleared: true,
      damageDealt: weStart.schedule.bossMaxHp,
      simTicks: 2100,
      clearTimeMs: 36_000,
      remainingHpPct: 0.9,
      perfectDodges: 5,
    });
    assert.equal(weSubmit.ok, true);
    assert.equal(weSubmit.seasonCpBonusAwarded, weStart.schedule.seasonCpBonusOnClear);

    const weClaim = await claimWeekendBlitzReward({
      tierId: 'weekend_striker',
      idempotencyKey: 'idem_we_1',
    });
    assert.equal(weClaim.ok, true);
    assert.equal(weClaim.alreadyClaimed, false);
  } finally {
    globalThis.fetch = originalFetch;
    resetWeeklyBossApiModeForTests();
    resetWeeklyBossStandaloneStoreForTests();
  }
});

test('LiveAiLocalFallback provides full Hub parity (chat, duel, rivals, guild boss, cup, bounty, guild war, spectator)', () => {
  const received: LiveAiServerEnvelope[] = [];
  const fallback = new LiveAiLocalFallback((env) => received.push(env), {
    startTicker: false,
    immediateReplies: true,
    persist: false,
  });

  // 1. Presence & snapshot
  fallback.handleClientMessage({
    type: 'presence:announce',
    payload: { displayName: 'VercelHero' },
  });
  const snapEnv = received.find((e) => e.type === 'hub:snapshot');
  assert.ok(snapEnv);
  const snap = snapEnv.payload as AiLiveHubSnapshot;
  assert.ok(snap.players.length >= 6);
  assert.ok(snap.guildBossLive);
  assert.ok(snap.guildWarLive);
  assert.ok(snap.spectatorMatch);

  // 2. Chat + AI reply
  fallback.handleClientMessage({
    type: 'chat:send',
    payload: { channel: 'lobby', text: 'Ai đánh boss không?', senderName: 'VercelHero' },
  });
  const chatMsgs = received
    .filter((e) => e.type === 'chat:message')
    .map((e) => e.payload as AiLiveChatMessage);
  assert.equal(chatMsgs.length, 2);
  assert.equal(chatMsgs[0].senderTag, 'Người Thật');
  assert.equal(chatMsgs[1].senderTag, '[AI Live]');

  // 3. Duel challenge + complete + rival bounty
  const targetAi = snap.players[0];
  fallback.handleClientMessage({
    type: 'duel:challenge',
    payload: { aiPlayerId: targetAi.id, challengerName: 'VercelHero' },
  });
  const duelAcc = received.find((e) => e.type === 'duel:accepted')?.payload as { duelId: string };
  assert.ok(duelAcc?.duelId);

  fallback.handleClientMessage({
    type: 'duel:complete',
    payload: {
      duelId: duelAcc.duelId,
      aiPlayerId: targetAi.id,
      challengerName: 'VercelHero',
      playerWon: true,
      durationSec: 28,
    },
  });
  const duelAck = received.find((e) => e.type === 'duel:result_ack')?.payload as {
    ratingDelta: number;
    rivals: Array<{ aiPlayerId: string }>;
  };
  assert.ok(duelAck.ratingDelta > 0);
  assert.equal(duelAck.rivals[0].aiPlayerId, targetAi.id);

  fallback.handleClientMessage({
    type: 'rival:claim_bounty',
    payload: { aiPlayerId: targetAi.id },
  });
  const bountyAck = received.find((e) => e.type === 'rival:bounty_ack')?.payload as {
    ok: boolean;
    goldReward: number;
  };
  assert.equal(bountyAck.ok, true);
  assert.ok(bountyAck.goldReward > 0);

  // 4. Guild Boss attack + milestone claim
  fallback.handleClientMessage({
    type: 'guild_boss:attack',
    payload: { playerName: 'VercelHero', heroId: 'artemis', damage: 5000 },
  });
  const gbUpdate = received.filter((e) => e.type === 'guild_boss:update').pop()?.payload as {
    guildBossLive: LiveGuildBossState;
  };
  assert.ok(gbUpdate.guildBossLive.totalDamage >= 60_000);

  fallback.handleClientMessage({
    type: 'guild_boss:claim_milestone',
    payload: { tierId: 'gb_m1' },
  });
  const gbClaim = received.find((e) => e.type === 'guild_boss:claim_ack')?.payload as {
    ok: boolean;
    gemsReward: number;
  };
  assert.equal(gbClaim.ok, true);
  assert.ok(gbClaim.gemsReward > 0);

  // 5. Mini-Cup 8 players: win R1 -> R2 -> R3 -> claim champion prize
  fallback.handleClientMessage({
    type: 'cup:start',
    payload: { playerName: 'VercelHero', heroId: 'artemis', powerRating: 4500, duelRating: 1300 },
  });
  const getLatestCup = () =>
    (received.filter((e) => e.type === 'cup:state').pop()?.payload as { cup: LiveMiniCupState }).cup;

  for (const round of [1, 2, 3] as const) {
    const cup = getLatestCup();
    const activeMatch = cup.matches.find((m) => m.round === round && m.status === 'ready');
    assert.ok(activeMatch, `Round ${round} ready match must exist`);
    fallback.handleClientMessage({
      type: 'cup:report_match',
      payload: { matchId: activeMatch.matchId, playerWon: true },
    });
  }
  assert.equal(getLatestCup().status, 'champion');
  fallback.handleClientMessage({
    type: 'cup:claim_prize',
    payload: { cupId: getLatestCup().cupId },
  });
  const cupPrize = received.find((e) => e.type === 'cup:prize_ack')?.payload as {
    ok: boolean;
    gemsReward: number;
  };
  assert.equal(cupPrize.ok, true);
  assert.ok(cupPrize.gemsReward >= 160);

  // 6. Server Bounty contribute to completion + claim
  fallback.handleClientMessage({
    type: 'bounty:contribute',
    payload: { playerName: 'VercelHero', heroId: 'artemis', points: 1000 },
  });
  fallback.handleClientMessage({
    type: 'bounty:contribute',
    payload: { playerName: 'VercelHero', heroId: 'artemis', points: 500 },
  });
  const latestBounty = (
    received.filter((e) => e.type === 'bounty:update').pop()?.payload as {
      serverBounty: LiveServerBountyState;
    }
  ).serverBounty;
  assert.equal(latestBounty.completed, true);
  fallback.handleClientMessage({ type: 'bounty:claim_reward', payload: {} });
  const srvBountyClaim = received.find((e) => e.type === 'bounty:claim_ack')?.payload as {
    ok: boolean;
    goldReward: number;
  };
  assert.equal(srvBountyClaim.ok, true);
  assert.ok(srvBountyClaim.goldReward > 0);

  // 7. Guild War bastion strike
  fallback.handleClientMessage({
    type: 'guild_war:capture_strike',
    payload: {
      bastionId: 'solar_spire',
      mode: 'assault_3d',
      heroId: 'artemis',
      scoreGain: 160,
      playerName: 'VercelHero',
    },
  });
  const gwState = (
    received.filter((e) => e.type === 'guild_war:update').pop()?.payload as {
      guildWarLive: LiveGuildWarSnapshot;
    }
  ).guildWarLive;
  assert.ok(gwState.zodiacScore > 340);

  // 8. Spectator cheer, advance to completion, claim, and start next match
  const spec = snap.spectatorMatch!;
  fallback.handleClientMessage({
    type: 'spectator:cheer',
    payload: { matchId: spec.matchId, fighterId: spec.fighterA.aiPlayerId },
  });
  const cheerAck = received.find((e) => e.type === 'spectator:cheer_ack')?.payload as {
    ok: boolean;
  };
  assert.equal(cheerAck.ok, true);

  for (let i = 0; i < 20; i++) {
    fallback.runHeartbeatTick(Date.now() + i * 15_000);
  }
  const latestSpec = (
    received.filter((e) => e.type === 'spectator:update').pop()?.payload as {
      spectatorMatch: LiveSpectatorMatchSnapshot;
    }
  ).spectatorMatch;
  assert.equal(latestSpec.status, 'finished');

  fallback.handleClientMessage({ type: 'spectator:claim_reward', payload: {} });
  const specClaim = received.find((e) => e.type === 'spectator:claim_ack')?.payload as {
    ok: boolean;
    goldReward: number;
  };
  assert.equal(specClaim.ok, true);
  assert.ok(specClaim.goldReward > 0);

  fallback.handleClientMessage({ type: 'spectator:next_match', payload: {} });
  const nextSpec = (
    received.filter((e) => e.type === 'spectator:update').pop()?.payload as {
      spectatorMatch: LiveSpectatorMatchSnapshot;
    }
  ).spectatorMatch;
  assert.notEqual(nextSpec.matchId, spec.matchId);
  assert.equal(nextSpec.status, 'live');

  fallback.destroy();
});

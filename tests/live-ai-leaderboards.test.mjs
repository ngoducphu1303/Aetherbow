import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { LiveAiPlayersService } from '../src/server/liveAiPlayersService.ts';
import {
  applyLiveAiAuctionBidEvent,
  buildLiveArenaOpponents,
  buildMergedArenaLeaderboard,
  buildMergedGuildMemberBoard,
  buildMergedHonorLeaderboard,
  buildMergedWeeklyBossLeaderboard,
} from '../src/data/liveAiLeaderboards.ts';
import { createInitialSaveData } from '../src/data/gearData.ts';
import { normalizeAuctionHouse } from '../src/data/wave7Data.ts';

function makeTempFile(name) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `artemis-ai-lb-${name}-`));
  return { dir, file: path.join(dir, 'live-ai.json') };
}

test('LiveAiPlayersService seeds 18 multi-BXH profiles, backfills legacy JSON, and ticks world activities', () => {
  const { dir, file } = makeTempFile('multi-bxh');
  try {
    const svc = new LiveAiPlayersService(file);
    const snap = svc.getSnapshot();
    assert.equal(snap.players.length, 18);
    for (const p of snap.players) {
      assert.equal(p.tag, '[AI Live]');
      assert.ok(p.worldBossBestDamage > 0, `${p.id} should have worldBossBestDamage`);
      assert.ok(p.bestTowerFloor > 0, `${p.id} should have bestTowerFloor`);
      assert.ok(p.guildBossDamage > 0, `${p.id} should have guildBossDamage`);
      assert.ok(p.guildContribution > 0, `${p.id} should have guildContribution`);
      assert.ok(p.weeklyPracticeBest > 0, `${p.id} should have weeklyPracticeBest`);
    }

    // Run 6 ticks to cover all activity branches (world_boss, guild, tower, weekly_practice, ready_duel, campaign)
    const kinds = new Set();
    for (let i = 0; i < 6; i++) {
      const tick = svc.simulateServerTick(Date.now() + i * 5000);
      kinds.add(tick.event.kind);
    }
    assert.ok(kinds.has('world_boss'));
    assert.ok(kinds.has('guild'));
    assert.ok(kinds.has('tower'));
    assert.ok(kinds.has('weekly_practice'));

    // Test backward-compatible backfill on a legacy JSON missing Wave 3 multi-BXH fields
    const legacy = JSON.parse(fs.readFileSync(file, 'utf8'));
    delete legacy.players[0].worldBossBestDamage;
    delete legacy.players[0].bestTowerFloor;
    delete legacy.players[0].guildBossDamage;
    delete legacy.players[0].guildContribution;
    fs.writeFileSync(file, JSON.stringify(legacy), 'utf8');

    const reloaded = new LiveAiPlayersService(file);
    const p0 = reloaded.getSnapshot().players[0];
    assert.ok(p0.worldBossBestDamage > 0);
    assert.ok(p0.bestTowerFloor > 0);
    assert.ok(p0.guildBossDamage > 0);
    assert.ok(p0.guildContribution > 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Honor Leaderboard merges real + 18 [AI Live] players across all 4 tabs and filters cleanly', () => {
  const { dir, file } = makeTempFile('honor');
  try {
    const svc = new LiveAiPlayersService(file);
    const aiPlayers = svc.getSnapshot().players;
    const save = createInitialSaveData();

    for (const tab of ['power', 'world_boss', 'arena', 'tower']) {
      const allRows = buildMergedHonorLeaderboard({
        tab,
        filter: 'all',
        cloudPlayers: [
          {
            uid: 'u1',
            displayName: 'Người Chơi Thật A',
            heroId: 'artemis',
            heroName: 'Alice',
            highestChapterCleared: 5,
            title: 'Thợ Săn Sao',
            equippedAvatarFrameId: 'default_gold',
            powerRating: 4500,
            worldBossBestDamage: 22000,
            arenaRating: 1450,
            bestTowerFloor: 24,
          },
        ],
        aiPlayers,
        save,
        powerRating: 2100,
        playerDisplayName: 'Người Chơi Local',
        currentUid: null,
      });

      assert.equal(allRows.length, 20, `tab=${tab} should have 18 AI + 1 cloud + 1 local`);
      assert.equal(allRows.filter((r) => r.isAiLive).length, 18);
      for (let i = 1; i < allRows.length; i++) {
        assert.ok(allRows[i - 1].score >= allRows[i].score, `tab=${tab} must be sorted desc`);
        assert.equal(allRows[i].rank, i + 1);
      }

      const realOnly = buildMergedHonorLeaderboard({
        tab,
        filter: 'real',
        cloudPlayers: [],
        aiPlayers,
        save,
        powerRating: 2100,
        playerDisplayName: 'Người Chơi Local',
        currentUid: null,
      });
      assert.equal(realOnly.length, 1);
      assert.equal(realOnly[0].isAiLive, false);
      assert.equal(realOnly[0].isPlayer, true);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Weekly Ranked Boss merged leaderboard preserves verified humanRank strictly separate from [AI Live] benchmarks', () => {
  const { dir, file } = makeTempFile('weekly');
  try {
    const svc = new LiveAiPlayersService(file);
    const aiPlayers = svc.getSnapshot().players;

    const verifiedEntries = [
      {
        uid: 'human-1',
        displayName: 'Xạ Thủ Hạng 1',
        bestScore: 9800, // lower than top AI benchmark, yet MUST remain humanRank = 1
        bestDamage: 14000,
        bestClearTimeMs: 42000,
        attemptsUsed: 2,
        updatedAt: Date.now(),
      },
      {
        uid: 'human-2',
        displayName: 'Xạ Thủ Hạng 2',
        bestScore: 8400,
        bestDamage: 12000,
        bestClearTimeMs: 48000,
        attemptsUsed: 1,
        updatedAt: Date.now(),
      },
    ];

    const merged = buildMergedWeeklyBossLeaderboard({
      verifiedEntries,
      aiPlayers,
      filter: 'all',
      currentUid: 'human-1',
    });

    assert.equal(merged.length, 20);
    const human1 = merged.find((r) => r.id === 'human_human-1');
    const human2 = merged.find((r) => r.id === 'human_human-2');
    assert.ok(human1 && human2);
    assert.equal(human1.humanRank, 1, 'Verified player #1 must keep humanRank = 1 regardless of AI scores');
    assert.equal(human2.humanRank, 2, 'Verified player #2 must keep humanRank = 2 regardless of AI scores');
    assert.ok(human1.displayRank >= 1);
    assert.ok(merged.filter((r) => r.isAiLive).every((r) => r.humanRank === null));

    const realOnly = buildMergedWeeklyBossLeaderboard({
      verifiedEntries,
      aiPlayers,
      filter: 'real',
      currentUid: 'human-1',
    });
    assert.equal(realOnly.length, 2);
    assert.equal(realOnly[0].humanRank, 1);
    assert.equal(realOnly[1].humanRank, 2);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('Arena and Guild boards merge live [AI Live] players and generate 3 ready Arena 1v1 rivals', () => {
  const { dir, file } = makeTempFile('arena-guild');
  try {
    const svc = new LiveAiPlayersService(file);
    const aiPlayers = svc.getSnapshot().players;

    const arenaAll = buildMergedArenaLeaderboard({
      filter: 'all',
      aiPlayers,
      playerName: 'Xạ Thủ Test',
      playerTitle: 'Chiến Binh',
      playerHeroId: 'artemis',
      playerRating: 1320,
      playerPower: 3200,
    });
    assert.equal(arenaAll.length, 19);
    assert.equal(arenaAll.filter((r) => r.isAiLive).length, 18);

    const rivals = buildLiveArenaOpponents(aiPlayers, 1320, 3200);
    assert.equal(rivals.length, 3);
    assert.ok(rivals.every((r) => r.opponent.name.includes('[AI Live]')));

    const guildAll = buildMergedGuildMemberBoard({
      filter: 'all',
      aiPlayers,
      playerName: 'Xạ Thủ Test',
      playerHeroId: 'artemis',
      playerContribution: 900,
      playerBossDmg: 25000,
    });
    assert.equal(guildAll.length, 13);
    assert.equal(guildAll.filter((r) => r.isAiLive).length, 12);

    const guildReal = buildMergedGuildMemberBoard({
      filter: 'real',
      aiPlayers,
      playerName: 'Xạ Thủ Test',
      playerHeroId: 'artemis',
      playerContribution: 900,
      playerBossDmg: 25000,
    });
    assert.equal(guildReal.length, 1);
    assert.equal(guildReal[0].isPlayer, true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('applyLiveAiAuctionBidEvent refunds 100% of player escrowed gems when outbid, credits claimBox on consignment sale, and is strictly idempotent', () => {
  const auctionHouse = normalizeAuctionHouse(undefined);
  const marketLot = auctionHouse.lots[0];
  assert.ok(marketLot);

  // Player places a bid of 200 gems on marketLot
  const withPlayerBid = {
    ...auctionHouse,
    lots: [
      {
        ...marketLot,
        currentBid: 200,
        buyoutPrice: 600,
        highestBidderIsPlayer: true,
        playerBidAmount: 200,
        status: 'active',
      },
      {
        id: 'player_listing_1',
        kind: 'gear',
        label: 'Cung Ánh Trăng +5',
        rarity: 'epic',
        sellerName: 'Bạn',
        isPlayerListing: true,
        startingBid: 150,
        currentBid: 150,
        buyoutPrice: 350,
        highestBidderIsPlayer: false,
        playerBidAmount: 0,
        expiresAt: Date.now() + 600_000,
        status: 'active',
      },
    ],
  };

  const processed = new Set();
  const outbidEvent = {
    eventId: 'evt-outbid-1',
    lotId: marketLot.id,
    lotLabel: marketLot.label,
    bidderId: 'ai_01',
    bidderName: 'Thiên Lang',
    bidderTag: '[AI Live]',
    action: 'bid',
    amount: 240,
    isPlayerListing: false,
    timestamp: Date.now(),
  };

  // First application: refunds 200 gems and transfers lead to AI Live bidder
  const res1 = applyLiveAiAuctionBidEvent({
    auctionHouse: withPlayerBid,
    currentGems: 500,
    event: outbidEvent,
    processedEventIds: processed,
  });
  assert.equal(res1.changed, true);
  assert.equal(res1.refundedGems, 200);
  assert.equal(res1.nextGems, 700);
  assert.equal(res1.nextAuctionHouse.lots[0].currentBid, 240);
  assert.equal(res1.nextAuctionHouse.lots[0].highestBidderIsPlayer, false);
  assert.equal(res1.nextAuctionHouse.lots[0].highestBidderIsAiLive, true);
  assert.ok(res1.toastMessage?.includes('200 Ngọc'));

  // Replay exact same eventId -> strictly idempotent (no duplicate refund!)
  const resReplay = applyLiveAiAuctionBidEvent({
    auctionHouse: res1.nextAuctionHouse,
    currentGems: res1.nextGems,
    event: outbidEvent,
    processedEventIds: processed,
  });
  assert.equal(resReplay.changed, false);
  assert.equal(resReplay.refundedGems, 0);
  assert.equal(resReplay.nextGems, 700);

  // Player consignment bought out by [AI Live] -> credited into claimBox
  const buyoutEvent = {
    eventId: 'evt-buyout-2',
    lotId: 'player_listing_1',
    lotLabel: 'Cung Ánh Trăng +5',
    bidderId: 'ai_02',
    bidderName: 'Hàn Băng',
    bidderTag: '[AI Live]',
    action: 'buyout',
    amount: 350,
    isPlayerListing: true,
    timestamp: Date.now(),
  };
  const res2 = applyLiveAiAuctionBidEvent({
    auctionHouse: res1.nextAuctionHouse,
    currentGems: res1.nextGems,
    event: buyoutEvent,
    processedEventIds: processed,
  });
  assert.equal(res2.changed, true);
  assert.equal(res2.nextAuctionHouse.lots[1].status, 'sold');
  assert.equal(res2.nextAuctionHouse.claimBox.length, 1);
  assert.equal(res2.nextAuctionHouse.claimBox[0].gems, 350);
  assert.equal(res2.nextAuctionHouse.totalTrades, withPlayerBid.totalTrades + 1);
});

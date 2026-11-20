import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  WEEKLY_BOSS_LOANER_GEAR,
  WEEKLY_BOSS_LOANER_STATS,
  WEEKLY_BOSS_MAX_FREE_ATTEMPTS,
} from '../src/data/weeklyBossData.ts';
import { WeeklyBossService } from '../src/server/weeklyBossService.ts';

function makeTempStorePath(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `artemis-wb-${label}-`));
  return { dir, file: path.join(dir, 'weekly-boss.json') };
}

test('WeeklyBossService: standardized loaner gear strips VIP/mount/pet and enforces 3 free attempts/week', () => {
  const { dir, file } = makeTempStorePath('attempts');
  try {
    const nowMs = Date.UTC(2026, 10, 18, 12, 0, 0);
    const service = new WeeklyBossService(file);

    // Loaner build verification: 4 standardized Epic +15 items, zero VIP/mount/wing/pet inflation
    assert.equal(WEEKLY_BOSS_LOANER_GEAR.length, 4);
    assert.ok(WEEKLY_BOSS_LOANER_GEAR.every((g) => g.rarityLabel === 'Sử Thi' && g.level === 15));
    assert.equal(WEEKLY_BOSS_LOANER_STATS.equippedMountId, null);
    assert.equal(WEEKLY_BOSS_LOANER_STATS.equippedWingId, null);
    assert.equal(WEEKLY_BOSS_LOANER_STATS.equippedPetId, null);
    assert.equal(WEEKLY_BOSS_LOANER_STATS.equippedHaloId, null);
    assert.equal(WEEKLY_BOSS_MAX_FREE_ATTEMPTS, 3);

    const user = { uid: 'player-fair-1', displayName: 'Cung Thủ A' };
    for (let i = 0; i < 3; i += 1) {
      const startTime = nowMs + i * 60_000;
      const started = service.startAttempt(user, startTime);
      assert.equal(started.attemptsUsed, i + 1);
      assert.equal(started.attemptsRemaining, 3 - (i + 1));

      // Finalize each attempt so next startAttempt opens a new attempt
      service.submitAttempt(
        user,
        {
          attemptId: started.attempt.attemptId,
          seed: started.attempt.seed,
          cleared: false,
          damageDealt: 5000 + i * 500,
          simTicks: 1800,
          clearTimeMs: 30_000,
          remainingHpPct: 0,
          perfectDodges: 1,
        },
        startTime + 31_000
      );
    }

    // 4th attempt in same week MUST be rejected
    assert.throws(
      () => service.startAttempt(user, nowMs + 300_000),
      /hết 3\/3 lượt tính hạng/i
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('WeeklyBossService: verifies fixed-timestep score, rejects tampered runs, and persists leaderboard across restart', () => {
  const { dir, file } = makeTempStorePath('verify');
  try {
    const nowMs = Date.UTC(2026, 10, 18, 13, 0, 0);
    const service = new WeeklyBossService(file);

    const userA = { uid: 'uid-a', displayName: 'Tinh Xạ A' };
    const userB = { uid: 'uid-b', displayName: 'Tinh Xạ B' };

    // Attempt 1 for A: tampered impossible DPS -> rejected
    const badDpsAttempt = service.startAttempt(userA, nowMs);
    assert.throws(
      () =>
        service.submitAttempt(
          userA,
          {
            attemptId: badDpsAttempt.attempt.attemptId,
            seed: badDpsAttempt.attempt.seed,
            cleared: true,
            damageDealt: badDpsAttempt.schedule.bossMaxHp,
            simTicks: 180, // 3s clear with 18500 HP -> 6166 DPS!
            clearTimeMs: 3000,
            remainingHpPct: 1,
            perfectDodges: 0,
          },
          nowMs + 4000
        ),
      /vượt giới hạn bộ trang bị Sử Thi/i
    );

    // Attempt 2 for A: tampered simTicks vs clearTimeMs desync -> rejected
    const badClockAttempt = service.startAttempt(userA, nowMs + 10_000);
    assert.throws(
      () =>
        service.submitAttempt(
          userA,
          {
            attemptId: badClockAttempt.attempt.attemptId,
            seed: badClockAttempt.attempt.seed,
            cleared: true,
            damageDealt: badClockAttempt.schedule.bossMaxHp,
            simTicks: 3000, // 50s ticks
            clearTimeMs: 10000, // claims 10s
            remainingHpPct: 0.8,
            perfectDodges: 2,
          },
          nowMs + 65_000
        ),
      /không khớp số bước cố định 60Hz/i
    );

    // Valid submission A: clears boss in 40s (2400 ticks)
    const startA = service.startAttempt(userA, nowMs + 70_000);
    const subA = service.submitAttempt(
      userA,
      {
        attemptId: startA.attempt.attemptId,
        seed: startA.attempt.seed,
        cleared: true,
        damageDealt: startA.schedule.bossMaxHp,
        simTicks: 2400,
        clearTimeMs: 40_000,
        remainingHpPct: 0.85,
        perfectDodges: 3,
      },
      nowMs + 111_000
    );
    assert.equal(subA.ok, true);
    assert.equal(subA.rank, 1);

    // Valid submission B: clears boss faster in 32s (1920 ticks) -> takes Rank #1
    const startB = service.startAttempt(userB, nowMs + 70_000);
    const subB = service.submitAttempt(
      userB,
      {
        attemptId: startB.attempt.attemptId,
        seed: startB.attempt.seed,
        cleared: true,
        damageDealt: startB.schedule.bossMaxHp,
        simTicks: 1920,
        clearTimeMs: 32_000,
        remainingHpPct: 0.92,
        perfectDodges: 4,
      },
      nowMs + 103_000
    );
    assert.equal(subB.rank, 1);
    assert.ok(subB.verifiedScore > subA.verifiedScore);

    // Reload from disk (simulating server restart) -> leaderboard & scores persist!
    const restarted = new WeeklyBossService(file);
    const state = restarted.getState(userB, nowMs + 120_000);
    assert.equal(state.leaderboard.length, 2);
    assert.equal(state.leaderboard[0].uid, 'uid-b');
    assert.equal(state.leaderboard[1].uid, 'uid-a');
    assert.equal(state.player.bestScore, subB.verifiedScore);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('WeeklyBossService: reward claims are strictly idempotent on repeated requests', () => {
  const { dir, file } = makeTempStorePath('idempotent');
  try {
    const nowMs = Date.UTC(2026, 10, 18, 14, 0, 0);
    const service = new WeeklyBossService(file);
    const champ = { uid: 'uid-champ', displayName: 'Quán Quân' };
    const started = service.startAttempt(champ, nowMs);

    service.submitAttempt(
      champ,
      {
        attemptId: started.attempt.attemptId,
        seed: started.attempt.seed,
        cleared: true,
        damageDealt: started.schedule.bossMaxHp,
        simTicks: 1920,
        clearTimeMs: 32_000,
        remainingHpPct: 0.95,
        perfectDodges: 4,
      },
      nowMs + 33_000
    );

    const first = service.claimReward(champ, 'weekly_sovereign', 'req-key-001', nowMs + 40_000);
    assert.equal(first.alreadyClaimed, false);
    assert.equal(first.receipt.tierId, 'weekly_sovereign');
    assert.equal(first.claimedTierIds.length, 1);

    // Replay with the SAME idempotencyKey -> returns exact original receipt, no duplicate
    const replaySameKey = service.claimReward(
      champ,
      'weekly_sovereign',
      'req-key-001',
      nowMs + 41_000
    );
    assert.equal(replaySameKey.alreadyClaimed, true);
    assert.equal(replaySameKey.receipt.claimedAt, first.receipt.claimedAt);
    assert.equal(replaySameKey.claimedTierIds.length, 1);

    // Replay with a DIFFERENT idempotencyKey -> STILL returns original receipt, never double-grants!
    const replayNewKey = service.claimReward(
      champ,
      'weekly_sovereign',
      'req-key-999',
      nowMs + 42_000
    );
    assert.equal(replayNewKey.alreadyClaimed, true);
    assert.equal(replayNewKey.receipt.idempotencyKey, 'req-key-001');
    assert.equal(replayNewKey.claimedTierIds.length, 1);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

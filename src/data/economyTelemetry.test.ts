import assert from 'node:assert/strict';
import test from 'node:test';
import {
  PLAYTIME_MILESTONES,
  simulatePlaytimeMilestones,
} from './economyTelemetry';
import { Rarity } from '../types/game';

test('EconomyTelemetry: simulates all 8 required playtime milestones deterministically', () => {
  const runA = simulatePlaytimeMilestones(20260410);
  const runB = simulatePlaytimeMilestones(20260410);

  assert.equal(runA.milestones.length, 8);
  assert.deepEqual(
    runA.milestones.map((m) => m.milestoneId),
    PLAYTIME_MILESTONES.map((m) => m.id)
  );
  assert.deepEqual(runA.milestones, runB.milestones, 'Seeded simulation must be 100% deterministic');
  assert.equal(runA.simulationKind, 'deterministic_seeded_model');
});

test('EconomyTelemetry: preserves fresh Ch.1 anti-power-creep and monotonic progression without negative currencies', () => {
  const report = simulatePlaytimeMilestones(20260410);
  assert.ok(report.freshBaselinePower >= 600 && report.freshBaselinePower <= 900);

  const m5 = report.milestones[0];
  const m15 = report.milestones[1];
  const m100h = report.milestones[report.milestones.length - 1];

  // Early game anti-power-creep: 5m player should not jump to Epic/Legendary/Mythic
  assert.ok(
    m5.highestRarity === Rarity.COMMON || m5.highestRarity === Rarity.RARE,
    `5m rarity ${m5.highestRarity} must stay Common/Rare`
  );
  assert.ok(m5.playerPower < 1600, `5m power ${m5.playerPower} should remain below Ch.1 inflated bounds`);
  assert.ok(m15.playerPower >= m5.playerPower, '15m power must not regress vs 5m');

  let prevGoldEarned = 0;
  let prevPower = 0;
  let prevChapter = 0;
  for (const m of report.milestones) {
    assert.ok(m.goldBalance >= 0, `${m.milestoneId} goldBalance must never be negative`);
    assert.ok(m.gemBalance >= 0, `${m.milestoneId} gemBalance must never be negative`);
    assert.ok(m.goldEarnedCumulative >= prevGoldEarned, `${m.milestoneId} goldEarned must be monotonic`);
    assert.ok(m.playerPower >= prevPower, `${m.milestoneId} power must be monotonic`);
    assert.ok(m.highestChapterCleared >= prevChapter, `${m.milestoneId} chapter must be monotonic`);
    assert.ok(m.estMobTtkSec > 0 && m.estBossTtkSec > 0 && m.estPlayerTtdSec > 0);
    prevGoldEarned = m.goldEarnedCumulative;
    prevPower = m.playerPower;
    prevChapter = m.highestChapterCleared;
  }

  // Endgame reachability within 100h
  assert.ok(m100h.highestChapterCleared >= 8, `100h simulation should reach late chapters, got ${m100h.highestChapterCleared}`);
  assert.ok(m100h.bestTowerFloor >= 20, `100h simulation should climb tower >= F20, got F${m100h.bestTowerFloor}`);
});

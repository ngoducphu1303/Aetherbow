import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyLiveOpsRewardMultipliers,
  DEFAULT_LIVEOPS_CONFIG,
  getEffectiveLiveOpsPityThresholds,
  isVerifiedAdminIdentity,
  LIVEOPS_BOUNDS,
  LIVEOPS_PRESETS,
  parseLiveOpsConfigJson,
  sanitizeLiveOpsConfig,
} from '../src/data/liveOpsConfig.ts';

test('LiveOps: sanitizeLiveOpsConfig enforces safe economy and enemy multiplier bounds', () => {
  const extreme = sanitizeLiveOpsConfig({
    goldRewardMult: 999,
    gemRewardMult: -5,
    forgeShardMult: Number.NaN,
    enemyHpMult: 0.01,
    enemyDmgMult: 50,
    chestEpicRateBonus: 0.99,
    pitySoftCapOffset: -99,
    announcementBanner: 'A'.repeat(400),
    maintenanceNotice: 'B'.repeat(400),
  });

  assert.equal(extreme.goldRewardMult, LIVEOPS_BOUNDS.goldRewardMult.max);
  assert.equal(extreme.gemRewardMult, LIVEOPS_BOUNDS.gemRewardMult.min);
  assert.equal(extreme.forgeShardMult, DEFAULT_LIVEOPS_CONFIG.forgeShardMult);
  assert.equal(extreme.enemyHpMult, LIVEOPS_BOUNDS.enemyHpMult.min);
  assert.equal(extreme.enemyDmgMult, LIVEOPS_BOUNDS.enemyDmgMult.max);
  assert.equal(extreme.chestEpicRateBonus, LIVEOPS_BOUNDS.chestEpicRateBonus.max);
  assert.equal(extreme.pitySoftCapOffset, LIVEOPS_BOUNDS.pitySoftCapOffset.min);
  assert.equal(extreme.announcementBanner.length, LIVEOPS_BOUNDS.maxBannerLen);
  assert.equal(extreme.maintenanceNotice.length, LIVEOPS_BOUNDS.maxBannerLen);
});

test('LiveOps: applyLiveOpsRewardMultipliers scales rewards accurately with Double Drop event safety cap', () => {
  const standard = applyLiveOpsRewardMultipliers(
    { gold: 1000, gems: 100, rareShards: 10, epicShards: 4, sTierBlueprints: 2 },
    DEFAULT_LIVEOPS_CONFIG
  );
  assert.equal(standard.gold, 1000);
  assert.equal(standard.gems, 100);
  assert.equal(standard.rareShards, 10);
  assert.equal(standard.epicShards, 4);
  assert.equal(standard.sTierBlueprints, 2);

  const eventCfg = sanitizeLiveOpsConfig({
    goldRewardMult: 1.5,
    gemRewardMult: 1.25,
    forgeShardMult: 1.5,
    doubleDropEventActive: true,
  });
  const boosted = applyLiveOpsRewardMultipliers(
    { gold: 1000, gems: 100, rareShards: 20, epicShards: 8, sTierBlueprints: 4 },
    eventCfg
  );
  assert.equal(boosted.gold, 1500);
  assert.equal(boosted.gems, 125);
  // Shards get forgeShardMult * 1.5 = 2.25x (capped <= 3.0x)
  assert.equal(boosted.appliedShardMult, 2.25);
  assert.equal(boosted.rareShards, 45);
  assert.equal(boosted.epicShards, 18);
  assert.equal(boosted.sTierBlueprints, 9);
});

test('LiveOps: pity threshold computation, presets, JSON rollback parser, and verified admin gate work cleanly', () => {
  const fasterPity = getEffectiveLiveOpsPityThresholds(
    sanitizeLiveOpsConfig({ pitySoftCapOffset: -3 })
  );
  assert.equal(fasterPity.epicPityRolls, 7);
  assert.equal(fasterPity.sTierPityRolls, 22);

  assert.ok(LIVEOPS_PRESETS.length >= 3);
  const serialized = JSON.stringify(LIVEOPS_PRESETS[1].patch);
  const parsed = parseLiveOpsConfigJson(serialized);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.config?.doubleDropEventActive, true);

  const badJson = parseLiveOpsConfigJson('{invalid-json');
  assert.equal(badJson.ok, false);

  assert.equal(
    isVerifiedAdminIdentity({ email: 'ngoducphu1303@gmail.com', emailVerified: true }),
    true
  );
  assert.equal(
    isVerifiedAdminIdentity({ email: 'ngoducphu1303@gmail.com', emailVerified: false }),
    false
  );
  assert.equal(
    isVerifiedAdminIdentity({ email: 'player@gmail.com', emailVerified: true }),
    false
  );
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyLiveOpsRewardMultipliers,
  buildRollbackLiveOpsConfig,
  computeLiveOpsConfigDiff,
  DEFAULT_LIVEOPS_CONFIG,
  MAX_LIVEOPS_SNAPSHOTS,
  recordLiveOpsSnapshot,
  sanitizeLiveOpsConfig,
  type LiveOpsSnapshotEntry,
} from './liveOpsConfig';

test('LiveOpsConfig: clamps out-of-bounds inputs strictly to Firestore Blueprint 5 safety bounds', () => {
  const dirty = sanitizeLiveOpsConfig({
    version: -10,
    goldRewardMult: 99,
    gemRewardMult: 0.1,
    forgeShardMult: 10,
    enemyHpMult: 5.5,
    enemyDmgMult: 0.1,
    chestEpicRateBonus: 0.9,
    pitySoftCapOffset: 42,
    announcementBanner: 'A'.repeat(300),
  });

  assert.equal(dirty.configId, 'global');
  assert.equal(dirty.version, 1);
  assert.equal(dirty.goldRewardMult, 3.0);
  assert.equal(dirty.gemRewardMult, 0.5);
  assert.equal(dirty.forgeShardMult, 3.0);
  assert.equal(dirty.enemyHpMult, 2.0);
  assert.equal(dirty.enemyDmgMult, 0.6);
  assert.equal(dirty.chestEpicRateBonus, 0.2);
  assert.equal(dirty.pitySoftCapOffset, 5);
  assert.equal(dirty.announcementBanner.length, 180);
});

test('LiveOpsConfig: applies reward multipliers + weekend blitz + double drop cleanly', () => {
  const cfg = sanitizeLiveOpsConfig({
    goldRewardMult: 1.5,
    gemRewardMult: 1.2,
    forgeShardMult: 2.0,
    weekendBlitzEnabled: true,
    doubleDropEventActive: true,
  });

  const out = applyLiveOpsRewardMultipliers({ gold: 1000, gems: 100, forgeShards: 40 }, cfg);
  assert.equal(out.gold, 1725); // 1000 * 1.5 * 1.15
  assert.equal(out.gems, 120); // 100 * 1.2
  assert.equal(out.forgeShards, 100); // 40 * 2.0 * 1.25
});

test('LiveOpsRollback: caps snapshot history at 10 entries, diffs changes, and rolls back with monotonic version+1', () => {
  let history: LiveOpsSnapshotEntry[] = [];
  for (let v = 1; v <= 14; v++) {
    const cfg = sanitizeLiveOpsConfig({
      ...DEFAULT_LIVEOPS_CONFIG,
      version: v,
      goldRewardMult: 1 + (v % 4) * 0.1,
      balanceNote: `Đợt cân bằng #${v}`,
      updatedAtMs: 1_700_000_000_000 + v * 10_000,
    });
    history = recordLiveOpsSnapshot(history, cfg, {
      source: 'firestore',
      nowMs: cfg.updatedAtMs,
    });
  }

  assert.equal(history.length, MAX_LIVEOPS_SNAPSHOTS);
  assert.equal(history[0].config.version, 14);
  assert.equal(history[history.length - 1].config.version, 5);

  const currentActive = sanitizeLiveOpsConfig({
    ...DEFAULT_LIVEOPS_CONFIG,
    version: 14,
    goldRewardMult: 2.0,
    enemyHpMult: 1.4,
    weekendBlitzEnabled: true,
  });
  const targetSnap = history[5]; // version 9
  const diffs = computeLiveOpsConfigDiff(currentActive, targetSnap.config);
  assert.ok(diffs.some((d) => d.field === 'goldRewardMult'));
  assert.ok(diffs.some((d) => d.field === 'enemyHpMult'));
  assert.ok(diffs.some((d) => d.field === 'weekendBlitzEnabled'));

  const rollbackCfg = buildRollbackLiveOpsConfig(currentActive, targetSnap, {
    actorLabel: 'Admin Test',
    nowMs: 1_700_999_999_000,
  });
  // Must strictly exceed current active version so Firestore security rules & live clients accept it
  assert.equal(rollbackCfg.version, currentActive.version + 1);
  assert.equal(rollbackCfg.goldRewardMult, targetSnap.config.goldRewardMult);
  assert.equal(rollbackCfg.enemyHpMult, targetSnap.config.enemyHpMult);
  assert.equal(rollbackCfg.weekendBlitzEnabled, targetSnap.config.weekendBlitzEnabled);
  assert.ok(rollbackCfg.balanceNote.includes(`v${targetSnap.config.version}`));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  E5430_LITE_LIMITS,
  validateGlbPipelineManifest,
} from '../src/engine/glbPipelineValidator.ts';
import {
  buildRollbackLiveOpsConfig,
  computeLiveOpsConfigDiff,
  DEFAULT_LIVEOPS_CONFIG,
  MAX_LIVEOPS_SNAPSHOTS,
  recordLiveOpsSnapshot,
  sanitizeLiveOpsConfig,
} from '../src/data/liveOpsConfig.ts';

test('Production scripts/glb-manifest.json passes Dell Latitude E5430 Lite budget with 0 critical issues', () => {
  const manifestPath = path.resolve(process.cwd(), 'scripts', 'glb-manifest.json');
  const doc = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const report = validateGlbPipelineManifest(doc);

  assert.equal(report.status, 'healthy');
  assert.equal(report.e5430Safe, true, `Unexpected critical issues: ${JSON.stringify(report.issues)}`);
  assert.equal(report.pairCoveragePct, 100);
  assert.ok(report.totalManifestFiles >= 100);
  assert.ok(report.activeFilesCount >= 120);
  assert.ok(report.pairedCount >= 60);
  assert.ok(report.maxLiteBytes <= E5430_LITE_LIMITS.maxLiteHeroBytes);
  assert.ok(report.chapters.length >= 4);
});

test('validateGlbPipelineManifest catches oversized Lite GLB, duplicate paths, and forbidden legacy assets', () => {
  const badReport = validateGlbPipelineManifest({
    files: [
      { path: 'public/assets/Chương 2/Runtime/test-lite.glb', size: 3_500_000, runtime: true },
      { path: 'public/assets/Chương 2/Runtime/test-lite.glb', size: 3_500_000, runtime: true },
      { path: 'public/assets/mounts/black-dragon.glb', size: 12_500_000, runtime: true },
    ],
  });
  assert.equal(badReport.status, 'critical');
  assert.equal(badReport.e5430Safe, false);
  const codes = new Set(badReport.issues.map((i) => i.code));
  assert.equal(codes.has('duplicate_path'), true);
  assert.equal(codes.has('forbidden_legacy_asset'), true);
  assert.equal(codes.has('lite_over_e5430_budget'), true);
});

test('LiveOps snapshot history caps at 10 entries and 1-click rollback increments version monotonically', () => {
  let history = [];
  for (let v = 1; v <= 12; v++) {
    const cfg = sanitizeLiveOpsConfig({
      ...DEFAULT_LIVEOPS_CONFIG,
      version: v,
      goldRewardMult: Number((1 + v * 0.05).toFixed(2)),
      balanceNote: `Đợt cân bằng #${v}`,
      updatedAtMs: 1_700_000_000_000 + v * 60_000,
    });
    history = recordLiveOpsSnapshot(history, cfg, { source: 'firestore' });
  }
  assert.equal(history.length, MAX_LIVEOPS_SNAPSHOTS);
  assert.equal(history[0].config.version, 12);

  const active = history[0].config;
  const targetSnap = history[4]; // older v8
  const diffs = computeLiveOpsConfigDiff(active, targetSnap.config);
  assert.ok(diffs.some((d) => d.field === 'goldRewardMult'));

  const rolledBack = buildRollbackLiveOpsConfig(active, targetSnap, {
    actorLabel: 'Admin LiveOps',
    nowMs: 1_700_000_999_000,
  });
  assert.equal(rolledBack.version, active.version + 1);
  assert.equal(rolledBack.goldRewardMult, targetSnap.config.goldRewardMult);
  assert.ok(rolledBack.balanceNote.includes(`v${targetSnap.config.version}`));
});

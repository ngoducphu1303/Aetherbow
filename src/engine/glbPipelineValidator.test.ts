import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import {
  E5430_ENTITY_LITE_CRIT_BYTES,
  E5430_MAP_LITE_CRIT_BYTES,
  validateGlbPipelineManifest,
  type GlbManifestDocument,
} from './glbPipelineValidator';

test('GlbPipelineValidator: audits real scripts/glb-manifest.json and confirms E5430 Lite safety', () => {
  const manifestPath = path.resolve(process.cwd(), 'scripts/glb-manifest.json');
  const raw = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as GlbManifestDocument;
  const report = validateGlbPipelineManifest(raw);

  assert.ok(report.totalManifestFiles >= 100, 'Expected real manifest to contain 100+ GLB entries');
  assert.ok(report.activeFilesCount > 0);
  assert.ok(report.pairedCount > 0, 'Expected active High/Lite pairs in real manifest');
  assert.ok(report.chapters.length >= 4, 'Expected at least Chapters 1-4 in manifest breakdown');
  assert.equal(report.e5430Safe, true, 'Real manifest active Lite assets must stay within E5430 critical cap');
});

test('GlbPipelineValidator: flags unpaired High models, malformed paths, and oversized E5430 Lite assets', () => {
  const synthetic: GlbManifestDocument = {
    files: [
      { path: 'public/assets/Chương 4/Runtime/boss-high.glb', size: 4_500_000, runtime: true },
      { path: 'public/assets/Chương 4/Runtime/boss-lite.glb', size: 1_200_000, runtime: true },
      { path: 'public/assets/Chương 4/Runtime/orphan-high.glb', size: 3_100_000, runtime: true },
      {
        path: 'public/assets/Chương 4/Runtime/too-heavy-lite.glb',
        size: E5430_ENTITY_LITE_CRIT_BYTES + 100_000,
        runtime: true,
      },
      {
        path: 'public/assets/Chương 4/Runtime/heavy-arena-lite.glb',
        size: E5430_MAP_LITE_CRIT_BYTES + 500_000,
        runtime: true,
      },
      { path: 'public/assets/../evil.glb', size: 500_000, runtime: true },
      { path: 'public/assets/Chương 1/legacy-disabled.glb', size: 9_000_000, runtime: false },
    ],
  };

  const report = validateGlbPipelineManifest(synthetic);
  assert.equal(report.status, 'critical');
  assert.equal(report.e5430Safe, false);
  assert.equal(report.inactiveFilesCount, 1);
  assert.equal(report.pairedCount, 1);
  assert.ok(report.issues.some((i) => i.code === 'missing_lite_pair'));
  assert.ok(report.issues.some((i) => i.code === 'oversized_lite_entity'));
  assert.ok(report.issues.some((i) => i.code === 'oversized_lite_map'));
  assert.ok(report.issues.some((i) => i.code === 'malformed_path'));
});

test('GlbPipelineValidator: returns healthy 100% pair coverage when all High/Lite pairs meet E5430 caps', () => {
  const clean: GlbManifestDocument = {
    files: [
      { path: 'public/assets/Chương 4/Runtime/gemini-arena-high.glb', size: 8_200_000, runtime: true },
      { path: 'public/assets/Chương 4/Runtime/gemini-arena-lite.glb', size: 3_400_000, runtime: true },
      { path: 'public/assets/Chương 4/Runtime/gemini-boss-high.glb', size: 4_100_000, runtime: true },
      { path: 'public/assets/Chương 4/Runtime/gemini-boss-lite.glb', size: 980_000, runtime: true },
    ],
  };

  const report = validateGlbPipelineManifest(clean);
  assert.equal(report.status, 'healthy');
  assert.equal(report.e5430Safe, true);
  assert.equal(report.pairCoveragePct, 100);
  assert.equal(report.issues.length, 0);
});

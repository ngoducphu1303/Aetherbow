import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CHAPTERS } from '../data/chaptersData';
import { EnemyKind } from '../types/game';
import { classifyGpuCapability } from './aaaVisualPipeline';
import {
  CHAPTER1_ROSTER_ASSET_IDS,
  CHAPTER1_ROSTER_SPECS,
  clearChapter1RosterDownloadCache,
  computeChapter1RosterMotion,
  downloadChapter1RosterArrayBuffer,
  instantiateChapter1RosterModel,
  prepareChapter1RosterTemplate,
  resolveChapter1RosterAssetId,
  updateChapter1RosterMotion,
} from './chapter1RosterAssets';
import { resolveBoss3dModelVariant } from './gpuSafetyGuard';
import { disposeObjectResources } from './resources';
import { assertValidGlbAssetOrManifest, skipIfGlbOffloadedToCdn } from './testGlbManifestHelper';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

function readGlbHeader(filePath: string) {
  const buf = fs.readFileSync(filePath);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return {
    bytes: buf.byteLength,
    magic: view.getUint32(0, true),
    version: view.getUint32(4, true),
    totalLength: view.getUint32(8, true),
  };
}

test('All 10 Chapter 1 Roster High/Lite GLB variants exist on disk or CDN manifest, are valid glTF 2.0, and stay safe for Dell E5430', () => {
  let totalLiteBytes = 0;

  for (const assetId of CHAPTER1_ROSTER_ASSET_IDS) {
    const spec = CHAPTER1_ROSTER_SPECS[assetId];
    const highPath = path.join(PUBLIC_DIR, ...spec.highPathSegments);
    const litePath = path.join(PUBLIC_DIR, ...spec.litePathSegments);

    const highRes = assertValidGlbAssetOrManifest(highPath, { requireRuntime: true });
    const liteRes = assertValidGlbAssetOrManifest(litePath, {
      maxBytes: spec.maxLiteBytes,
      requireRuntime: true,
    });

    assert.ok(
      liteRes.size < highRes.size,
      `${assetId} Lite (${liteRes.size}) should be smaller than High (${highRes.size})`
    );
    totalLiteBytes += liteRes.size;
  }

  // Combined Lite budget across all 4 mobs + sub-boss stays under 2.2 MiB (down from 427 MiB raw)
  assert.ok(
    totalLiteBytes < 2.2 * 1024 * 1024,
    `Total Lite footprint (${(totalLiteBytes / (1024 * 1024)).toFixed(2)} MiB) must stay < 2.2 MiB`
  );
});

test('Chapter 1 spawns all 4 new mob roles and applies Winged Solar Lion to both Stage 4 & Stage 8 sub-bosses', () => {
  const ch1 = CHAPTERS.find((c) => c.id === 1);
  assert.ok(ch1, 'Chapter 1 must exist');

  assert.ok(ch1.stages[3].bossTitle?.includes('Sư Tử Cánh Ánh Dương'));
  assert.ok(ch1.stages[7].bossTitle?.includes('Sư Tử Cánh Ánh Dương'));

  const seenMobKinds = new Set<EnemyKind>();
  let stage4HasWarden = false;
  let stage8HasTitan = false;

  for (const stage of ch1.stages) {
    for (const wave of stage.waves) {
      for (const entry of wave.enemies) {
        if (stage.stageNumber === 4 && entry.kind === EnemyKind.WARDEN_BOSS) {
          stage4HasWarden = true;
        }
        if (stage.stageNumber === 8 && entry.kind === EnemyKind.TITAN_BOSS) {
          stage8HasTitan = true;
        }
        if (
          entry.kind === EnemyKind.SKIRMISHER ||
          entry.kind === EnemyKind.GOLEM ||
          entry.kind === EnemyKind.IMP_ARCHER ||
          entry.kind === EnemyKind.DRAGON_WHELP
        ) {
          seenMobKinds.add(entry.kind);
        }
      }
    }
  }

  assert.equal(stage4HasWarden, true, 'Stage 4 must spawn WARDEN_BOSS');
  assert.equal(stage8HasTitan, true, 'Stage 8 must spawn TITAN_BOSS');
  assert.deepEqual(
    [...seenMobKinds].sort(),
    [EnemyKind.DRAGON_WHELP, EnemyKind.GOLEM, EnemyKind.IMP_ARCHER, EnemyKind.SKIRMISHER].sort(),
    'Chapter 1 must deploy all 4 new mob archetypes'
  );

  // Scope checks: Chapter 1 campaign matches; Chapter 2+, side modes, dummy & arena rival stay untouched
  assert.equal(resolveChapter1RosterAssetId({ chapterId: 1, enemyKind: EnemyKind.SKIRMISHER }), 'fire_lion');
  assert.equal(resolveChapter1RosterAssetId({ chapterId: 1, enemyKind: EnemyKind.GOLEM }), 'stone_guardian');
  assert.equal(resolveChapter1RosterAssetId({ chapterId: 1, enemyKind: EnemyKind.IMP_ARCHER }), 'flame_spirit');
  assert.equal(resolveChapter1RosterAssetId({ chapterId: 1, enemyKind: EnemyKind.DRAGON_WHELP }), 'sun_spearman');
  assert.equal(resolveChapter1RosterAssetId({ chapterId: 1, enemyKind: EnemyKind.WARDEN_BOSS }), 'winged_solar_lion');
  assert.equal(resolveChapter1RosterAssetId({ chapterId: 1, enemyKind: EnemyKind.TITAN_BOSS }), 'winged_solar_lion');
  assert.equal(resolveChapter1RosterAssetId({ chapterId: 1, enemyKind: EnemyKind.ZODIAC_BOSS }), null);
  assert.equal(resolveChapter1RosterAssetId({ chapterId: 2, enemyKind: EnemyKind.SKIRMISHER }), null);
  assert.equal(
    resolveChapter1RosterAssetId({ chapterId: 1, enemyKind: EnemyKind.SKIRMISHER, isSideModeActive: true }),
    null
  );
  assert.equal(
    resolveChapter1RosterAssetId({ chapterId: 1, enemyKind: EnemyKind.GOLEM, isTrainingDummy: true }),
    null
  );
});

test('Real Lite GLBs parse cleanly, ground flush, share cached Geometry/Textures across clones, and survive per-mob disposal', async (t) => {
  const requiredPaths = CHAPTER1_ROSTER_ASSET_IDS.map((assetId) =>
    path.join(PUBLIC_DIR, ...CHAPTER1_ROSTER_SPECS[assetId].litePathSegments)
  );
  if (skipIfGlbOffloadedToCdn(t, requiredPaths)) return;

  const prevCreateBitmap = (globalThis as Record<string, unknown>).createImageBitmap;
  const prevSelf = (globalThis as Record<string, unknown>).self;
  Object.assign(globalThis, {
    self: globalThis,
    createImageBitmap: async () => ({ width: 1, height: 1, close() {} }),
  });

  const loader = new GLTFLoader();

  try {
    for (const assetId of CHAPTER1_ROSTER_ASSET_IDS) {
    const spec = CHAPTER1_ROSTER_SPECS[assetId];
    const litePath = path.join(PUBLIC_DIR, ...spec.litePathSegments);
    const nodeBuf = fs.readFileSync(litePath);
    const ab = nodeBuf.buffer.slice(nodeBuf.byteOffset, nodeBuf.byteOffset + nodeBuf.byteLength);

    const gltf = await loader.parseAsync(ab, '');
    const template = prepareChapter1RosterTemplate(assetId, gltf.scene, 2, { liteMode: true });

    const height = template.bounds.max.y - template.bounds.min.y;
    assert.ok(
      Math.abs(height - spec.targetHeight) < 0.08,
      `${assetId} normalized height (${height.toFixed(2)}) should match target (${spec.targetHeight})`
    );
    assert.ok(
      Math.abs(template.bounds.min.y - spec.hoverOffsetY) < 0.05,
      `${assetId} min.y (${template.bounds.min.y.toFixed(2)}) should match hoverOffsetY (${spec.hoverOffsetY})`
    );
    assert.ok(template.sharedGeometries.size >= 1, `${assetId} should register shared geometries`);

    // Instantiate two independent combat copies from the same template
    const instA = instantiateChapter1RosterModel(template, { heightMultiplier: 1.0 });
    const instB = instantiateChapter1RosterModel(template, {
      heightMultiplier: assetId === 'winged_solar_lion' ? 1.18 : 1.12,
      emissiveTintHex: 0x7c2d12,
    });

    assert.ok(instA.hitMeshes.length >= 1 && instB.hitMeshes.length >= 1);
    // Geometry is shared (zero VRAM duplication), while Material is cloned per-enemy for independent hit-flash
    assert.equal(instA.hitMeshes[0].geometry, instB.hitMeshes[0].geometry);
    assert.notEqual(instA.hitMeshes[0].material, instB.hitMeshes[0].material);

    // Verify per-instance disposal does NOT dispose the shared cached geometry!
    let sharedGeoDisposed = false;
    const sharedGeo = instA.hitMeshes[0].geometry;
    const origDispose = sharedGeo.dispose.bind(sharedGeo);
    sharedGeo.dispose = () => {
      sharedGeoDisposed = true;
      origDispose();
    };
    disposeObjectResources(instA.group);
    assert.equal(sharedGeoDisposed, false, `${assetId} shared geometry must not be disposed when 1 mob dies`);

    // Verify combat choreography stays finite across states
    const snap = computeChapter1RosterMotion({
      assetId,
      elapsed: 2.4,
      phaseAngle: 0.7,
      speed: 3.6,
      telegraphType: 'lunge',
      telegraphProgress: 0.65,
      burstType: assetId === 'flame_spirit' ? 'cast' : 'lunge',
      burstTimer: 0.25,
      bossPhase: 2,
      stunTimer: 0,
      hitFlashTimer: 0.05,
    });
    assert.ok(Number.isFinite(snap.offsetY) && Number.isFinite(snap.pitchX) && snap.scaleY > 0.5);
    updateChapter1RosterMotion(instB.group, {
      assetId,
      elapsed: 2.5,
      phaseAngle: 0.7,
      speed: 3.6,
      telegraphType: 'none',
      telegraphProgress: 0,
      burstType: 'none',
      burstTimer: 0,
      bossPhase: 1,
      stunTimer: 0,
      hitFlashTimer: 0,
    }, 1.0, 1 / 60);
    assert.ok(Number.isFinite(instB.group.position.y));
    }
  } finally {
    if (prevCreateBitmap === undefined) delete (globalThis as Record<string, unknown>).createImageBitmap;
    else (globalThis as Record<string, unknown>).createImageBitmap = prevCreateBitmap;
    if (prevSelf === undefined) delete (globalThis as Record<string, unknown>).self;
    else (globalThis as Record<string, unknown>).self = prevSelf;
  }
});

test('Dell Latitude E5430 routes to Lite roster variant and High download automatically falls back to Lite on failure', async () => {
  const e5430Profile = classifyGpuCapability('Intel(R) HD Graphics 4000', 8, 4, {
    maxTextureSize: 8192,
  });
  assert.equal(resolveBoss3dModelVariant(e5430Profile, 'auto', 'auto'), 'lite');

  const rtxProfile = classifyGpuCapability('NVIDIA GeForce RTX 3060', 16, 12, {
    maxTextureSize: 16384,
  });
  assert.equal(resolveBoss3dModelVariant(rtxProfile, 'auto', 'auto'), 'high');

  clearChapter1RosterDownloadCache();
  const liteFile = path.join(PUBLIC_DIR, ...CHAPTER1_ROSTER_SPECS.fire_lion.litePathSegments);
  const minimalValidGlb = (() => {
    const out = Buffer.alloc(24);
    out.writeUInt32LE(0x46546c67, 0);
    out.writeUInt32LE(2, 4);
    out.writeUInt32LE(24, 8);
    return out;
  })();
  const liteBytes = fs.existsSync(liteFile) ? fs.readFileSync(liteFile) : minimalValidGlb;
  const requestedUrls: string[] = [];

  const mockFetch = (async (input: string | URL | Request) => {
    const u = String(input);
    requestedUrls.push(u);
    if (u.includes('High.glb')) {
      return new Response('Not Found', { status: 404 });
    }
    return new Response(liteBytes, {
      status: 200,
      headers: { 'content-type': 'model/gltf-binary' },
    });
  }) as unknown as typeof fetch;

  const buf = await downloadChapter1RosterArrayBuffer('fire_lion', 'high', {
    fetchImpl: mockFetch,
  });
  assert.equal(buf.byteLength, liteBytes.byteLength);
  assert.equal(requestedUrls.length, 2, 'Should try High then fall back cleanly to Lite');
  clearChapter1RosterDownloadCache();
});

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  clearSolarLeoDownloadCache,
  disposeSolarLeoTemplateCache,
  downloadSolarLeoArrayBuffer,
  getSolarLeoAssetUrl,
  HUMANOID_HEAD_RIGID_START_NY,
  instantiateSolarLeoModel,
  prepareSolarLeoTemplate,
  resolveSolarLeoHeroAssetId,
  SOLAR_LEO_ARTIFACT_OFFSET,
  SOLAR_LEO_ASSET_IDS,
  SOLAR_LEO_SPECS,
  updateSolarLeoArtifactPose,
  updateSolarLeoHaloPose,
  updateSolarLeoHumanoidPose,
  updateSolarLeoMountPose,
  updateSolarLeoPetPose,
  updateSolarLeoWingsPose,
} from './solarLeoAssets';
import { createHeroModel } from './models';
import { disposeObjectResources } from './resources';
import { createInitialSaveData } from '../data/gearData';
import { migrateSaveData } from '../data/earlyProgressionData';
import { HEROES } from '../data/heroesData';
import { HERO_SKINS, PETS_CATALOG, ZODIAC_AURAS } from '../data/wave3Data';
import { AVATAR_FRAMES, ZODIAC_WINGS } from '../data/wave7Data';
import { WEAPON_AURAS, ZODIAC_MOUNTS } from '../data/wave8Data';
import { HERO_BONDS, MYTHIC_ARTIFACTS } from '../data/wave9Data';
import { DIVINE_HALO_CATALOG } from '../data/wave10Data';
import { CELESTIAL_WING_DEFS } from '../data/wave14Data';
import { getHeroAssetPack, getSkinAssetPack, SOLAR_LEO_ITEM_THUMBNAILS } from '../data/assetRegistry';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

function assertValidGlbHeader(filePath: string): number {
  const buf = fs.readFileSync(filePath);
  assert.ok(buf.byteLength >= 20, `${filePath} must be >= 20 bytes`);
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  assert.equal(view.getUint32(0, true), 0x46546c67, `${filePath} magic must be glTF`);
  assert.equal(view.getUint32(4, true), 2, `${filePath} must be glTF v2`);
  assert.equal(view.getUint32(8, true), buf.byteLength, `${filePath} length header mismatch`);
  return buf.byteLength;
}

async function withNodeGlbLoader<T>(fn: (loader: GLTFLoader) => Promise<T>): Promise<T> {
  const prevCreateBitmap = (globalThis as Record<string, unknown>).createImageBitmap;
  const prevSelf = (globalThis as Record<string, unknown>).self;
  Object.assign(globalThis, {
    self: globalThis,
    createImageBitmap: async () => ({ width: 1, height: 1, close() {} }),
  });

  try {
    return await fn(new GLTFLoader());
  } finally {
    if (prevCreateBitmap === undefined) {
      delete (globalThis as Record<string, unknown>).createImageBitmap;
    } else {
      (globalThis as Record<string, unknown>).createImageBitmap = prevCreateBitmap;
    }
    if (prevSelf === undefined) {
      delete (globalThis as Record<string, unknown>).self;
    } else {
      (globalThis as Record<string, unknown>).self = prevSelf;
    }
  }
}

test('All 10 Solar Leo High GLBs, Lite GLBs, and WebP thumbnails exist, validate as glTF 2.0, and stay inside Dell E5430 Lite budgets', () => {
  assert.equal(SOLAR_LEO_ASSET_IDS.length, 10);

  let totalLiteBytes = 0;
  let totalWebpBytes = 0;

  for (const id of SOLAR_LEO_ASSET_IDS) {
    const spec = SOLAR_LEO_SPECS[id];
    const highPath = path.join(PUBLIC_DIR, ...spec.highPathSegments);
    const litePath = path.join(PUBLIC_DIR, ...spec.litePathSegments);
    const thumbPath = path.join(PUBLIC_DIR, ...spec.thumbnailPathSegments);

    assert.ok(fs.existsSync(highPath), `Missing High GLB: ${highPath}`);
    assert.ok(fs.existsSync(litePath), `Missing Lite GLB: ${litePath}`);
    assert.ok(fs.existsSync(thumbPath), `Missing WebP thumbnail: ${thumbPath}`);

    const highBytes = assertValidGlbHeader(highPath);
    const liteBytes = assertValidGlbHeader(litePath);
    const thumbBytes = fs.statSync(thumbPath).size;

    assert.ok(
      liteBytes <= spec.maxLiteBytes,
      `${id} Lite GLB (${liteBytes} B) exceeded E5430 budget (${spec.maxLiteBytes} B)`
    );
    assert.ok(
      liteBytes < highBytes,
      `${id} Lite GLB (${liteBytes} B) should be smaller than High GLB (${highBytes} B)`
    );
    assert.ok(
      thumbBytes > 1000 && thumbBytes < 150_000,
      `${id} WebP thumbnail (${thumbBytes} B) should be compact (< 150 KB)`
    );

    totalLiteBytes += liteBytes;
    totalWebpBytes += thumbBytes;
  }

  assert.ok(
    totalLiteBytes < 5_800_000,
    `Total Lite pack (${totalLiteBytes} B) should stay well under 5.8 MB (down from 850 MB raw)`
  );
  assert.ok(
    totalWebpBytes < 500_000,
    `Total WebP thumbnails (${totalWebpBytes} B) should stay under 500 KB (down from 48.8 MB raw PNG)`
  );
});

test('All 10 real Solar Leo Lite GLBs calibrate, auto-rig into valid SkinnedMeshes/groups, and produce finite 3D poses', async () => {
  await withNodeGlbLoader(async (loader) => {
    for (const id of SOLAR_LEO_ASSET_IDS) {
      const spec = SOLAR_LEO_SPECS[id];
      const litePath = path.join(PUBLIC_DIR, ...spec.litePathSegments);
      const buf = fs.readFileSync(litePath);
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      const gltf = await loader.parseAsync(ab, '');

      const template = prepareSolarLeoTemplate(id, gltf.scene, 1, { liteMode: true });
      assert.ok(template.parts.length >= 1, `${id} should produce >= 1 geometry part`);
      assert.ok(
        Math.abs(template.size.y - spec.targetHeight) < 0.05,
        `${id} height (${template.size.y}) should match targetHeight (${spec.targetHeight})`
      );

      if (spec.groundAtZero) {
        assert.ok(
          Math.abs(template.bounds.min.y) < 0.03,
          `${id} should be grounded at y=0 (got ${template.bounds.min.y})`
        );
      }

      if (id === 'solarius') {
        assert.ok(
          template.size.z > template.size.x * 1.4,
          `Solarius should face +Z after -PI/2 calibration (size.z=${template.size.z}, size.x=${template.size.x})`
        );
      }

      const instance = instantiateSolarLeoModel(template, { liteMode: true });

      if (spec.rigType === 'humanoid') {
        assert.equal(Object.keys(instance.bones).length, 12, `${id} should have 12 humanoid bones`);
        assert.ok(instance.skinnedMeshes.length >= 1, `${id} should instantiate SkinnedMesh`);
        const geo = instance.skinnedMeshes[0].geometry;
        const pos = geo.attributes.position;
        const indicesAttr = geo.attributes.skinIndex;
        const weights = geo.attributes.skinWeight;
        const headBoneIdx = template.blueprints.findIndex((bp) => bp.name === 'head');
        assert.ok(headBoneIdx >= 0, `${id} should have a head bone`);
        const sx = Math.max(0.1, template.bounds.max.x - template.bounds.min.x);
        const sy = Math.max(0.1, template.bounds.max.y - template.bounds.min.y);
        const y0 = template.bounds.min.y;
        const torsoW = Math.min(sx, sy * 0.44);
        let lockedHeadVerts = 0;
        for (let i = 0; i < weights.count; i++) {
          const sum = weights.getX(i) + weights.getY(i) + weights.getZ(i) + weights.getW(i);
          assert.ok(Math.abs(sum - 1) < 1e-3, `${id} skinWeight sum must equal 1 (got ${sum})`);
          const px = pos.getX(i);
          const py = pos.getY(i);
          const pz = pos.getZ(i);
          const ny = (py - y0) / sy;
          if (
            ny >= HUMANOID_HEAD_RIGID_START_NY &&
            Math.abs(px) <= torsoW * 0.56 &&
            pz >= -torsoW * 0.58 &&
            pz <= torsoW * 0.52
          ) {
            lockedHeadVerts++;
            assert.equal(indicesAttr.getX(i), headBoneIdx, `${id} head vertex ${i} must bind strictly to head bone`);
            assert.equal(weights.getX(i), 1, `${id} head vertex ${i} must have rigid weight 1.0`);
            assert.equal(weights.getY(i), 0, `${id} head vertex ${i} must have zero secondary bleed`);
          }
        }
        assert.ok(lockedHeadVerts > 100, `${id} should rigid-lock face/head vertices (got ${lockedHeadVerts})`);
        updateSolarLeoHumanoidPose(instance, {
          elapsed: 1.5,
          dt: 1 / 60,
          speed: 5.0,
          shooting: true,
          shootRecoil: 0.8,
          dashing: true,
          riding: false,
          ultBurst: 0.9,
        });
        updateSolarLeoHumanoidPose(instance, {
          elapsed: 2.2,
          dt: 1 / 60,
          speed: 0,
          shooting: false,
          shootRecoil: 0,
          dashing: false,
          riding: true,
          ultBurst: 0,
          lobbyPose: 'astral_float',
        });
        assert.ok(Number.isFinite(instance.bones.pelvis.rotation.x));
        assert.ok(Number.isFinite(instance.bones.legL.rotation.x));
      } else if (spec.rigType === 'quadruped_mount') {
        assert.equal(Object.keys(instance.bones).length, 11, 'Solarius should have 11 quadruped bones');
        assert.ok(instance.saddle, 'Solarius should expose a saddle anchor');
        updateSolarLeoMountPose(instance, 1.8, 1 / 60, 5.2, true);
        assert.ok(Number.isFinite(instance.bones.legFL.rotation.x));
      } else if (spec.rigType === 'wings') {
        assert.equal(Object.keys(instance.bones).length, 5, 'Solar Zenith wings should have 5 bones');
        updateSolarLeoWingsPose(instance, 2.0, 1 / 60, 4.5, true, 0.7);
        assert.ok(Number.isFinite(instance.bones.wingL1.rotation.y));
        assert.ok(Number.isFinite(instance.bones.wingR1.rotation.y));
      } else if (spec.rigType === 'pet') {
        // Verify Astraeo head (top 35%) sits forward (+Z) relative to its tail (bottom 35%, -Z)
        const pos = template.parts[0].geometry.attributes.position;
        const y0 = template.bounds.min.y;
        const sy = Math.max(0.1, template.bounds.max.y - y0);
        let headZSum = 0;
        let headCount = 0;
        let tailZSum = 0;
        let tailCount = 0;
        for (let i = 0; i < pos.count; i++) {
          const ny = (pos.getY(i) - y0) / sy;
          const pz = pos.getZ(i);
          if (ny >= 0.65) {
            headZSum += pz;
            headCount++;
          } else if (ny <= 0.35) {
            tailZSum += pz;
            tailCount++;
          }
        }
        assert.ok(
          headZSum / Math.max(1, headCount) > tailZSum / Math.max(1, tailCount),
          'Astraeo head must point forward (+Z) relative to tail (-Z)'
        );
        updateSolarLeoPetPose(instance, 1.4, 1 / 60, 0.85);
        assert.ok(Number.isFinite(instance.visualRoot.position.y));
      } else if (spec.rigType === 'artifact') {
        updateSolarLeoArtifactPose(instance, 1.4, 1 / 60);
        assert.ok(Number.isFinite(instance.visualRoot.rotation.y));
      } else if (spec.rigType === 'halo') {
        updateSolarLeoHaloPose(instance, 1.4, 1 / 60);
        assert.ok(Number.isFinite(instance.visualRoot.rotation.z));
      }

      // Instance disposal must preserve shared cached geometries & textures
      for (const geo of template.sharedGeometries) {
        assert.equal(geo.userData.sharedCachedGeometry, true);
      }
      disposeObjectResources(instance.group);
      for (const geo of template.sharedGeometries) {
        assert.equal(geo.userData.sharedCachedGeometry, true);
      }
      template.sharedGeometries.forEach((g) => g.dispose());
      template.sharedTextures.forEach((t) => t.dispose());
      template.parts.forEach((p) => p.material.dispose());
    }
  });
  disposeSolarLeoTemplateCache();
});

test('downloadSolarLeoArrayBuffer automatically falls back from High to Lite on network error', async () => {
  clearSolarLeoDownloadCache();
  const requested: string[] = [];
  const fakeGlb = new ArrayBuffer(20);
  const view = new DataView(fakeGlb);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, 20, true);

  const bytes = await downloadSolarLeoArrayBuffer('aurelia', 'high', {
    fetchImpl: (async (url: URL | RequestInfo) => {
      const s = String(url);
      requested.push(s);
      if (s.includes('High.glb')) {
        return new Response('not found', { status: 404 });
      }
      return new Response(fakeGlb, { status: 200, headers: { 'content-type': 'model/gltf-binary' } });
    }) as typeof fetch,
  });

  assert.equal(bytes.byteLength, 20);
  assert.equal(requested.length, 2);
  assert.ok(requested[0].includes('High.glb'));
  assert.ok(requested[1].includes('Lite.glb'));
  clearSolarLeoDownloadCache();
});

test('Catalogs, asset registry, initial save, and save migration unlock all 10 Solar Leo items while keeping Alice & Miku intact', () => {
  assert.ok(HEROES.some((h) => h.id === 'artemis'));
  assert.ok(HEROES.some((h) => h.id === 'hatsune_miku'));
  assert.ok(HEROES.some((h) => h.id === 'aurelia'));

  assert.equal(resolveSolarLeoHeroAssetId('aurelia'), 'aurelia');
  assert.equal(resolveSolarLeoHeroAssetId('aurelia', 'aurelia_solaris_valkyrie'), 'aurelia_solaris_valkyrie');
  assert.equal(resolveSolarLeoHeroAssetId('artemis'), null);
  assert.equal(resolveSolarLeoHeroAssetId('hatsune_miku'), null);

  // Pruned catalogs: only the Solar Leo pack survives in each pruned category
  assert.deepEqual(PETS_CATALOG.map((p) => p.id), ['astraeo']);
  assert.deepEqual(ZODIAC_AURAS, []);
  assert.deepEqual(ZODIAC_WINGS.map((w) => w.id), ['solar_zenith']);
  assert.deepEqual(CELESTIAL_WING_DEFS, []);
  assert.deepEqual(AVATAR_FRAMES, []);
  assert.deepEqual(ZODIAC_MOUNTS.map((m) => m.id), ['solarius']);
  assert.deepEqual(WEAPON_AURAS, []);
  assert.deepEqual(MYTHIC_ARTIFACTS.map((a) => a.id), ['astrolabe_regulus']);
  assert.deepEqual(HERO_BONDS, []);
  assert.deepEqual(DIVINE_HALO_CATALOG.map((h) => h.id), ['leo_sovereign']);
  assert.equal(HERO_SKINS.filter((s) => s.heroId === 'aurelia').length, 4);

  // Thumbnails & Hero/Skin asset packs point to lightweight WebP files
  assert.ok(getHeroAssetPack('aurelia').portrait.endsWith('.webp'));
  assert.ok(getSkinAssetPack('aurelia_oasis_dancer', 'aurelia').portrait.endsWith('.webp'));
  assert.ok(SOLAR_LEO_ITEM_THUMBNAILS.astraeo.endsWith('.webp'));
  assert.ok(SOLAR_LEO_ITEM_THUMBNAILS.solar_zenith.endsWith('.webp'));
  assert.ok(SOLAR_LEO_ITEM_THUMBNAILS.solarius.endsWith('.webp'));
  assert.ok(SOLAR_LEO_ITEM_THUMBNAILS.astrolabe_regulus.endsWith('.webp'));
  assert.ok(SOLAR_LEO_ITEM_THUMBNAILS.leo_sovereign.endsWith('.webp'));

  // URL encoder encodes Vietnamese path cleanly
  const url = getSolarLeoAssetUrl('solarius', 'lite');
  assert.ok(url.pathname.includes('Solarius%20Lite.glb'));

  // Fresh save unlocks all 10 items immediately and has no removed cosmetics
  const initial = createInitialSaveData();
  assert.ok(initial.unlockedHeroes.includes('aurelia'));
  assert.ok((initial.unlockedSkins ?? []).includes('aurelia_oasis_dancer'));
  assert.ok((initial.unlockedSkins ?? []).includes('aurelia_temple_commander'));
  assert.ok((initial.unlockedSkins ?? []).includes('aurelia_solaris_valkyrie'));
  assert.ok((initial.unlockedSkins ?? []).includes('aurelia_winter_solstice'));
  assert.ok((initial.pets ?? []).some((p) => p.petId === 'astraeo'));
  assert.ok((initial.unlockedWings ?? []).includes('solar_zenith'));
  assert.deepEqual(initial.unlockedMounts, ['solarius']);
  assert.deepEqual(initial.unlockedAuras, []);
  assert.deepEqual(initial.unlockedAvatarFrames, []);
  assert.deepEqual(initial.unlockedWeaponAuras, []);
  assert.ok((initial.unlockedArtifacts ?? []).includes('astrolabe_regulus'));
  assert.ok((initial.unlockedHalos ?? []).includes('leo_sovereign'));

  // Existing save migration cleans removed cosmetics safely without overwriting selectedHeroId
  const legacySave = {
    ...initial,
    selectedHeroId: 'hatsune_miku' as const,
    unlockedHeroes: ['artemis' as const, 'hatsune_miku' as const],
    unlockedSkins: ['default' as const],
    pets: [{ petId: 'solar_phoenix' as const, level: 4 }],
    equippedPetId: 'solar_phoenix' as const,
    unlockedAuras: ['zodiac_gold' as const, 'crimson_corona' as const],
    equippedAuraId: 'crimson_corona' as const,
    unlockedAvatarFrames: ['default_gold' as const, 'royal_vip' as const],
    equippedAvatarFrameId: 'royal_vip' as const,
    unlockedWings: ['seraph_zodiac' as const],
    equippedWingId: 'seraph_zodiac' as const,
    unlockedCelestialWings: ['seraph_azure' as const],
    equippedCelestialWingId: 'seraph_azure' as const,
    unlockedMounts: ['black_dragon' as const],
    mountLevels: { black_dragon: 5 },
    equippedMountId: 'black_dragon' as const,
    unlockedWeaponAuras: ['none' as const, 'solar_flare' as const],
    equippedWeaponAuraId: 'solar_flare' as const,
    unlockedArtifacts: ['astral_astrolabe' as const],
    equippedArtifactId: 'astral_astrolabe' as const,
    unlockedHalos: ['solar_crown' as const],
    equippedHaloId: 'solar_crown' as const,
  };
  const migrated = migrateSaveData(legacySave);
  assert.equal(migrated.selectedHeroId, 'hatsune_miku');
  assert.equal(migrated.equippedMountId, 'solarius');
  assert.equal(migrated.mountLevels?.solarius, 5);
  assert.deepEqual(migrated.unlockedMounts, ['solarius']);
  assert.deepEqual((migrated.pets ?? []).map((p) => p.petId), ['astraeo']);
  assert.equal(migrated.equippedPetId, 'astraeo');
  assert.deepEqual(migrated.unlockedAuras, []);
  assert.equal(migrated.equippedAuraId, undefined);
  assert.deepEqual(migrated.unlockedAvatarFrames, []);
  assert.equal(migrated.equippedAvatarFrameId, undefined);
  assert.deepEqual(migrated.unlockedWings, ['solar_zenith']);
  assert.equal(migrated.equippedWingId, 'solar_zenith');
  assert.deepEqual(migrated.unlockedCelestialWings, []);
  assert.equal(migrated.equippedCelestialWingId, null);
  assert.deepEqual(migrated.unlockedWeaponAuras, []);
  assert.equal(migrated.equippedWeaponAuraId, 'none');
  assert.deepEqual(migrated.unlockedArtifacts, ['astrolabe_regulus']);
  assert.equal(migrated.equippedArtifactId, 'astrolabe_regulus');
  assert.deepEqual(migrated.unlockedHalos, ['leo_sovereign']);
  assert.equal(migrated.equippedHaloId, 'leo_sovereign');
  assert.ok(migrated.unlockedHeroes.includes('aurelia'));
  assert.ok((migrated.unlockedSkins ?? []).includes('aurelia_winter_solstice'));
});

test('Solar Zenith suppresses duplicate blue Celestial Wings, Astrolabe sits far right & forward, and default skin reverts cleanly', () => {
  assert.equal(resolveSolarLeoHeroAssetId('aurelia', 'default'), 'aurelia');
  assert.equal(resolveSolarLeoHeroAssetId('aurelia', 'aurelia_solaris_valkyrie'), 'aurelia_solaris_valkyrie');

  const aureliaDef = HEROES.find((h) => h.id === 'aurelia');
  assert.ok(aureliaDef, 'Aurelia hero definition exists');

  const prevDoc = (globalThis as Record<string, unknown>).document;
  const noop = () => {};
  const fakeGrad = { addColorStop: noop };
  const fakeCtx = new Proxy(
    {
      createLinearGradient: () => fakeGrad,
      createRadialGradient: () => fakeGrad,
      measureText: () => ({ width: 10 }),
    },
    {
      get(target, prop) {
        if (prop in target) return (target as Record<PropertyKey, unknown>)[prop];
        return noop;
      },
      set() {
        return true;
      },
    }
  );
  Object.assign(globalThis, {
    document: {
      createElement: () => ({ width: 64, height: 64, getContext: () => fakeCtx }),
    },
  });

  try {
    const withSolarWings = createHeroModel({
      heroId: 'aurelia',
      skinId: 'default',
      weaponAccentHex: aureliaDef.accentHex,
      cloakColorHex: aureliaDef.cloakHex,
      hairColorHex: aureliaDef.hairHex,
      eyeColor: aureliaDef.eyeColor,
      cheekColor: aureliaDef.cheekColor,
      crownStyle: aureliaDef.crownStyle,
      weaponArchetype: 'bow',
      wingId: 'solar_zenith',
      wingLevel: 1,
      celestialWingId: 'seraph_azure',
      celestialWingStar: 1,
      weaponAuraId: 'solar_flare',
      weaponAuraLevel: 2,
      artifactId: 'astrolabe_regulus',
      artifactLevel: 1,
    });

    assert.equal(
      withSolarWings.celestialWingGroup,
      undefined,
      'Legacy Celestial Wings must never be instantiated'
    );
    assert.equal(
      withSolarWings.weaponAuraGroup,
      undefined,
      'Removed Weapon Aura 3D overlay must never be instantiated'
    );
    assert.ok(withSolarWings.artifactGroup, 'Artifact group exists');
    assert.ok(
      withSolarWings.artifactGroup.position.x >= SOLAR_LEO_ARTIFACT_OFFSET.x - 1e-4,
      'Astrolabe must sit far right of wings'
    );
    assert.ok(
      withSolarWings.artifactGroup.position.z >= SOLAR_LEO_ARTIFACT_OFFSET.z - 1e-4,
      'Astrolabe must sit forward of wings to prevent occlusion'
    );
    disposeObjectResources(withSolarWings.root);

    // Passing removed wing/mount/artifact/halo IDs never throws
    const withRemovedLegacyIds = createHeroModel({
      heroId: 'aurelia',
      skinId: 'default',
      weaponAccentHex: aureliaDef.accentHex,
      cloakColorHex: aureliaDef.cloakHex,
      hairColorHex: aureliaDef.hairHex,
      eyeColor: aureliaDef.eyeColor,
      cheekColor: aureliaDef.cheekColor,
      crownStyle: aureliaDef.crownStyle,
      weaponArchetype: 'bow',
      wingId: 'seraph_zodiac',
      mountId: 'black_dragon',
      artifactId: 'astral_astrolabe',
      haloId: 'solar_crown',
      celestialWingId: 'seraph_azure',
    });
    assert.equal(withRemovedLegacyIds.wingGroup, undefined);
    assert.equal(withRemovedLegacyIds.mountGroup, undefined);
    assert.equal(withRemovedLegacyIds.artifactGroup, undefined);
    assert.equal(withRemovedLegacyIds.haloGroup, undefined);
    assert.equal(withRemovedLegacyIds.celestialWingGroup, undefined);
    disposeObjectResources(withRemovedLegacyIds.root);
  } finally {
    if (prevDoc === undefined) {
      delete (globalThis as Record<string, unknown>).document;
    } else {
      (globalThis as Record<string, unknown>).document = prevDoc;
    }
  }
});

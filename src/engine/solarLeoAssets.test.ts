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
  evaluateArtifactCelestialAction,
  evaluateHaloSovereignAction,
  evaluateMountRoyalAction,
  evaluatePetPlayfulTrick,
  evaluateSolarLeoHeroAction,
  evaluateWingsShowcasePose,
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
        assert.ok(instance.mountAuraRig, 'Solarius should mount solar ember aura rig');
        assert.equal(instance.mountAuraRig.emberCount, 8, 'Lite Solarius must cap solar embers at 8');
        assert.equal(instance.mountAuraRig.groundRing, undefined, 'Lite Solarius must omit extra ground seal ring');
        updateSolarLeoMountPose(instance, 1.8, 1 / 60, 5.2, true);
        assert.ok(Number.isFinite(instance.bones.legFL.rotation.x));
      } else if (spec.rigType === 'wings') {
        assert.equal(Object.keys(instance.bones).length, 5, 'Solar Zenith wings should have 5 bones');
        assert.ok(instance.wingsAuraRig, 'Solar Zenith wings should mount feather-light aura rig');
        assert.equal(instance.wingsAuraRig.featherCount, 8, 'Lite Solar Zenith must cap feather motes at 8');
        updateSolarLeoWingsPose(instance, 2.0, 1 / 60, 4.5, true, 0.7);
        assert.ok(Number.isFinite(instance.bones.wingL1.rotation.y));
        assert.ok(Number.isFinite(instance.bones.wingR1.rotation.y));
      } else if (spec.rigType === 'pet') {
        assert.equal(Object.keys(instance.bones).length, 7, 'Astraeo should have 7 winged lion-cub bones');
        assert.ok(instance.skinnedMeshes.length >= 1, 'Astraeo should instantiate a real SkinnedMesh');
        assert.ok(instance.petAuraRig, 'Astraeo should mount a sparkling starlight aura rig');
        assert.equal(instance.petAuraRig.moteCount, 8, 'Lite Astraeo must cap sparkle motes at 8');
        assert.equal(instance.petAuraRig.orbitRing, undefined, 'Lite Astraeo must omit extra orbit halo ring');

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
        assert.ok(Number.isFinite(instance.bones.wingL.rotation.z));
        assert.ok(Number.isFinite(instance.bones.tail.rotation.y));
      } else if (spec.rigType === 'artifact') {
        assert.ok(instance.artifactAuraRig, 'Astrolabe should mount celestial star aura rig');
        assert.equal(instance.artifactAuraRig.planetCount, 6, 'Lite Astrolabe must cap orbital planets at 6');
        assert.equal(instance.artifactAuraRig.gyroRing, undefined, 'Lite Astrolabe must omit extra gyro ring');
        updateSolarLeoArtifactPose(instance, 1.4, 1 / 60);
        assert.ok(Number.isFinite(instance.visualRoot.rotation.y));
      } else if (spec.rigType === 'halo') {
        assert.ok(instance.haloAuraRig, 'Leo Sovereign Halo should mount zodiac star corona rig');
        assert.equal(instance.haloAuraRig.starCount, 8, 'Lite Halo must cap zodiac stars at 8');
        assert.equal(instance.haloAuraRig.outerRing, undefined, 'Lite Halo must omit extra outer corona ring');
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

  // The chapter collections remain available without restoring pruned cosmetics.
  assert.deepEqual(PETS_CATALOG.map((p) => p.id), ['pyro', 'astraeo']);
  assert.deepEqual(ZODIAC_AURAS, []);
  assert.deepEqual(ZODIAC_WINGS.map((w) => w.id), ['crimson_ram_wings', 'solar_zenith']);
  assert.deepEqual(CELESTIAL_WING_DEFS, []);
  assert.deepEqual(AVATAR_FRAMES, []);
  assert.deepEqual(ZODIAC_MOUNTS.map((m) => m.id), ['vulcan', 'solarius']);
  assert.deepEqual(WEAPON_AURAS, []);
  assert.deepEqual(MYTHIC_ARTIFACTS.map((a) => a.id), ['war_horn', 'astrolabe_regulus']);
  assert.deepEqual(HERO_BONDS, []);
  assert.deepEqual(DIVINE_HALO_CATALOG.map((h) => h.id), ['aries_vanguard', 'leo_sovereign']);
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

test('Aurelia sculpted bow & arrow stay 100% rigid (zero bend) in riding/shooting poses and mount a calibrated 3D bowstring on both High and Lite', async () => {
  await withNodeGlbLoader(async (loader) => {
    for (const variant of ['lite', 'high'] as const) {
      const spec = SOLAR_LEO_SPECS.aurelia;
      const glbPath = path.join(
        PUBLIC_DIR,
        ...(variant === 'lite' ? spec.litePathSegments : spec.highPathSegments)
      );
      const buf = fs.readFileSync(glbPath);
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      const gltf = await loader.parseAsync(ab, '');

      const tpl = prepareSolarLeoTemplate('aurelia', gltf.scene, 4, {
        liteMode: variant === 'lite',
      });
      assert.equal(tpl.hasSculptedDrawnBow, true, `${variant} Aurelia must detect sculpted drawn bow`);
      assert.ok(tpl.bowStringAnchors, `${variant} Aurelia must calibrate bowstring anchors`);

      const rig = instantiateSolarLeoModel(tpl, { liteMode: variant === 'lite' });
      assert.ok(rig.bowStringRig, `${variant} Aurelia must mount a 3D bowstring rig`);
      assert.equal(
        rig.bowStringRig.group.parent,
        rig.bones.chest,
        `${variant} bowstring must attach directly to chest bone`
      );
      assert.ok(rig.bowStringRig.upperCore.scale.y > 0.45, 'Upper bowstring length must be realistic');
      assert.ok(rig.bowStringRig.lowerCore.scale.y > 0.55, 'Lower bowstring length must be realistic');

      const mesh = rig.skinnedMeshes[0];
      const pos = mesh.geometry.attributes.position;
      const si = mesh.geometry.attributes.skinIndex;
      const sw = mesh.geometry.attributes.skinWeight;
      const chestIdx = tpl.blueprints.findIndex((bp) => bp.name === 'chest');
      assert.ok(chestIdx >= 0);

      const findNearest = (tx: number, ty: number, tz: number) => {
        let bestI = 0;
        let bestD = Infinity;
        for (let i = 0; i < pos.count; i++) {
          const dx = pos.getX(i) - tx;
          const dy = pos.getY(i) - ty;
          const dz = pos.getZ(i) - tz;
          const d = dx * dx + dy * dy + dz * dz;
          if (d < bestD) {
            bestD = d;
            bestI = i;
          }
        }
        return bestI;
      };

      const idxUpperTip = findNearest(-0.18, 2.02, 0.77);
      const idxGrip = findNearest(-0.31, 1.50, 0.85);
      const idxLowerTip = findNearest(-0.15, 0.84, 0.54);
      const idxArrowRear = findNearest(-0.04, 1.54, 0.45);
      const idxArrowFront = findNearest(-0.27, 1.52, 1.08);
      const idxArrowTip = findNearest(-0.37, 1.51, 1.30);

      for (const idx of [idxUpperTip, idxGrip, idxLowerTip, idxArrowRear, idxArrowFront, idxArrowTip]) {
        assert.equal(si.getX(idx), chestIdx, `${variant} bow/arrow vertex ${idx} must bind rigidly to chest`);
        assert.equal(sw.getX(idx), 1, `${variant} bow/arrow vertex ${idx} must have rigid weight 1.0`);
        assert.equal(sw.getY(idx), 0, `${variant} bow/arrow vertex ${idx} must have zero secondary bleed`);
      }

      const bindVec = (i: number) => new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));
      const bindUpperToLower = bindVec(idxUpperTip).distanceTo(bindVec(idxLowerTip));
      const bindUpperToGrip = bindVec(idxUpperTip).distanceTo(bindVec(idxGrip));
      const bindArrowLen = bindVec(idxArrowRear).distanceTo(bindVec(idxArrowTip));

      // Settle into riding Solarius + shooting pose
      for (let step = 0; step < 90; step++) {
        updateSolarLeoHumanoidPose(rig, {
          elapsed: step * 0.016,
          dt: 0.016,
          speed: 0,
          shooting: true,
          shootRecoil: step > 60 ? 0.85 : 0,
          dashing: false,
          riding: true,
          ultBurst: 0,
          lobbyPose: 'heroic',
        });
      }
      rig.group.updateMatrixWorld(true);
      mesh.skeleton.update();

      const posedVec = (i: number) => {
        const v = bindVec(i);
        mesh.applyBoneTransform(i, v);
        return v;
      };

      const pUpper = posedVec(idxUpperTip);
      const pGrip = posedVec(idxGrip);
      const pLower = posedVec(idxLowerTip);
      const pRear = posedVec(idxArrowRear);
      const pTip = posedVec(idxArrowTip);

      assert.ok(
        Math.abs(pUpper.distanceTo(pLower) - bindUpperToLower) < 1e-3,
        `${variant} bow span must not compress or stretch in riding/shooting pose`
      );
      assert.ok(
        Math.abs(pUpper.distanceTo(pGrip) - bindUpperToGrip) < 1e-3,
        `${variant} upper bow limb must not shear relative to grip`
      );
      assert.ok(
        Math.abs(pRear.distanceTo(pTip) - bindArrowLen) < 1e-3,
        `${variant} arrow length must remain 100% rigid`
      );
      assert.ok(
        rig.bowStringRig.currentPull < 0.7,
        `${variant} bowstring should snap forward during shot recoil (got ${rig.bowStringRig.currentPull})`
      );

      // Settle back to idle full-draw
      for (let step = 0; step < 90; step++) {
        updateSolarLeoHumanoidPose(rig, {
          elapsed: 2 + step * 0.016,
          dt: 0.016,
          speed: 0,
          shooting: false,
          shootRecoil: 0,
          dashing: false,
          riding: true,
          ultBurst: 0,
          lobbyPose: 'heroic',
        });
      }
      assert.ok(
        rig.bowStringRig.currentPull > 0.98,
        `${variant} bowstring should return smoothly to full draw at rest`
      );

      disposeObjectResources(rig.group);
      tpl.sharedGeometries.forEach((g) => g.dispose());
      tpl.sharedTextures.forEach((t) => t.dispose());
      tpl.parts.forEach((p) => p.material.dispose());
    }
  });
});

test('Astraeo playful pet choreographer cycles all 5 tricks, rigid-locks face vertices, animates wings/tail/paws, and respects High/Lite aura budgets', async () => {
  // 1. Pure choreographer verifies all 5 distinct playful tricks over one full 23s cycle
  const seenTricks = new Set<string>();
  let maxSpinYaw = 0;
  let maxBarrelRoll = 0;
  for (let t = 0; t < 23.0; t += 0.25) {
    const f = evaluatePetPlayfulTrick(t, 'lobby', false);
    seenTricks.add(f.trick);
    assert.ok(Number.isFinite(f.offsetX) && Number.isFinite(f.offsetY) && Number.isFinite(f.offsetZ));
    assert.ok(Number.isFinite(f.yawOffset) && Number.isFinite(f.rollOffset) && Number.isFinite(f.squashY));
    assert.ok(f.squashY >= 0.88 && f.squashY <= 1.15, `squashY out of organic bounds: ${f.squashY}`);
    if (f.trick === 'happy_spin') maxSpinYaw = Math.max(maxSpinYaw, f.yawOffset);
    if (f.trick === 'playful_barrel_roll') maxBarrelRoll = Math.max(maxBarrelRoll, f.rollOffset);
  }
  assert.deepEqual(
    [...seenTricks].sort(),
    ['curious_peek', 'figure_eight_swoop', 'happy_spin', 'joy_hop_bounce', 'playful_barrel_roll']
  );
  assert.ok(maxSpinYaw > Math.PI * 1.85, `happy_spin must execute full 360° twirl (maxYaw=${maxSpinYaw})`);
  assert.ok(maxBarrelRoll > Math.PI * 1.85, `playful_barrel_roll must execute full 360° roll (maxRoll=${maxBarrelRoll})`);

  // Celebratory mode triggers joyful high-energy spin-hop immediately
  const celeb = evaluatePetPlayfulTrick(0.35, 'lobby', true);
  assert.equal(celeb.trick, 'happy_spin');
  assert.ok(celeb.sparkleBoost >= 1.5);
  assert.ok(celeb.wingSpeedMult >= 1.7);

  // Combat mode keeps crisp figure-8 weaving without spinning away from targets
  const combat = evaluatePetPlayfulTrick(6.5, 'combat', false);
  assert.equal(combat.trick, 'figure_eight_swoop');
  assert.ok(Math.abs(combat.yawOffset) < 0.3);

  // 2. Real Astraeo GLB check on both High and Lite: 7-bone rig, rigid face lock, bone articulation, aura budgets
  await withNodeGlbLoader(async (loader) => {
    const spec = SOLAR_LEO_SPECS.astraeo;
    const litePath = path.join(PUBLIC_DIR, ...spec.litePathSegments);
    const buf = fs.readFileSync(litePath);
    const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
    const gltf = await loader.parseAsync(ab, '');

    const tpl = prepareSolarLeoTemplate('astraeo', gltf.scene, 4, { liteMode: false });
    const headIdx = tpl.blueprints.findIndex((bp) => bp.name === 'head');
    assert.ok(headIdx >= 0, 'Astraeo must have a head bone');

    const geo = tpl.parts[0].geometry;
    const pos = geo.attributes.position;
    const si = geo.attributes.skinIndex;
    const sw = geo.attributes.skinWeight;
    let lockedFaceVerts = 0;
    for (let i = 0; i < pos.count; i++) {
      const sum = sw.getX(i) + sw.getY(i) + sw.getZ(i) + sw.getW(i);
      assert.ok(Math.abs(sum - 1) < 1e-3, `Astraeo skinWeight sum must equal 1 (got ${sum})`);
      const px = pos.getX(i);
      const py = pos.getY(i);
      const pz = pos.getZ(i);
      if (pz >= 0.30 && py >= 0.04 && Math.abs(px) <= 0.19) {
        lockedFaceVerts++;
        assert.equal(si.getX(i), headIdx, `Astraeo face vertex ${i} must bind strictly to head`);
        assert.equal(sw.getX(i), 1, `Astraeo face vertex ${i} must have rigid weight 1.0`);
        assert.equal(sw.getY(i), 0, `Astraeo face vertex ${i} must have zero secondary bleed`);
      }
    }
    assert.ok(lockedFaceVerts > 50, `Astraeo should rigid-lock face vertices (got ${lockedFaceVerts})`);

    const highRig = instantiateSolarLeoModel(tpl, { liteMode: false });
    assert.ok(highRig.petAuraRig, 'High Astraeo must include starlight aura rig');
    assert.equal(highRig.petAuraRig.moteCount, 14, 'High Astraeo must have 14 sparkle motes');
    assert.ok(highRig.petAuraRig.orbitRing, 'High Astraeo must include translucent golden orbit halo');

    const liteRig = instantiateSolarLeoModel(tpl, { liteMode: true });
    assert.ok(liteRig.petAuraRig, 'Lite Astraeo must include starlight aura rig');
    assert.equal(liteRig.petAuraRig.moteCount, 8, 'Lite Astraeo must cap sparkle motes at 8');
    assert.equal(liteRig.petAuraRig.orbitRing, undefined, 'Lite Astraeo must omit extra orbit halo ring');

    // Step across tricks & combat recoil, verifying genuine wing/head/tail/paw articulation & smooth exit from 360° spin
    let maxWingAngle = 0;
    let maxTailWag = 0;
    let maxHeadTilt = 0;
    let maxPawKick = 0;
    for (let step = 0; step < 300; step++) {
      const t = step * 0.04;
      updateSolarLeoPetPose(highRig, t, 0.04, step % 80 === 0 ? 0.9 : 0, { mode: 'lobby' });
      maxWingAngle = Math.max(maxWingAngle, Math.abs(highRig.bones.wingL.rotation.z));
      maxTailWag = Math.max(maxTailWag, Math.abs(highRig.bones.tail.rotation.y));
      maxHeadTilt = Math.max(maxHeadTilt, Math.abs(highRig.bones.head.rotation.z));
      maxPawKick = Math.max(maxPawKick, Math.abs(highRig.bones.paws.rotation.x));
    }
    assert.ok(maxWingAngle > 0.25, `Astraeo wings must visibly flap (max=${maxWingAngle})`);
    assert.ok(maxTailWag > 0.2, `Astraeo tail must visibly wag (max=${maxTailWag})`);
    assert.ok(maxHeadTilt > 0.18, `Astraeo head must visibly tilt playfully (max=${maxHeadTilt})`);
    assert.ok(maxPawKick > 0.15, `Astraeo paws must visibly kick/paddle (max=${maxPawKick})`);

    // Clean disposal preserves cached shared geometries
    disposeObjectResources(highRig.group);
    disposeObjectResources(liteRig.group);
    for (const sharedGeo of tpl.sharedGeometries) {
      assert.equal(sharedGeo.userData.sharedCachedGeometry, true);
    }
    tpl.sharedGeometries.forEach((g) => g.dispose());
    tpl.sharedTextures.forEach((t) => t.dispose());
    tpl.parts.forEach((p) => p.material.dispose());
  });
});

test('Solarius mount royal choreographer and Solar Zenith wing choreographer cycle all showcase behaviors, articulate bones in Lobby idle, and enforce High/Lite GPU budgets', async () => {
  // 1. Solarius pure choreographer covers all 4 distinct royal behaviors over one 22s Lobby cycle
  const seenMountActions = new Set<string>();
  let maxPawStompLift = 0;
  let maxRoarHeadPitch = 0;
  for (let t = 0; t < 22.0; t += 0.2) {
    const f = evaluateMountRoyalAction(t, 'lobby', false);
    seenMountActions.add(f.action);
    assert.ok(Number.isFinite(f.bodyLiftY) && Number.isFinite(f.headPitch) && Number.isFinite(f.legFRPitch));
    if (f.action === 'solar_paw_stomp') maxPawStompLift = Math.max(maxPawStompLift, Math.abs(f.legFRPitch));
    if (f.action === 'majestic_roar') maxRoarHeadPitch = Math.max(maxRoarHeadPitch, Math.abs(f.headPitch));
  }
  assert.deepEqual(
    [...seenMountActions].sort(),
    ['majestic_roar', 'proud_prowl_shift', 'regal_breathe_survey', 'solar_paw_stomp']
  );
  assert.ok(maxPawStompLift > 0.55, `solar_paw_stomp must visibly lift front paw (max=${maxPawStompLift})`);
  assert.ok(maxRoarHeadPitch > 0.22, `majestic_roar must tilt lion head upward (max=${maxRoarHeadPitch})`);

  const mountCeleb = evaluateMountRoyalAction(0.45, 'lobby', true);
  assert.equal(mountCeleb.action, 'majestic_roar');
  assert.ok(mountCeleb.emberBoost >= 1.7);

  // 2. Solar Zenith wings pure choreographer covers all 4 majestic showcase behaviors over one 21s Lobby cycle
  const seenWingShowcases = new Set<string>();
  let maxWingLiftZ = 0;
  let maxWingAsym = 0;
  for (let t = 0; t < 21.0; t += 0.2) {
    const f = evaluateWingsShowcasePose(t, 'lobby', false);
    seenWingShowcases.add(f.showcase);
    assert.ok(Number.isFinite(f.sweepBase) && Number.isFinite(f.liftZ) && Number.isFinite(f.featherTwist));
    maxWingLiftZ = Math.max(maxWingLiftZ, f.liftZ);
    maxWingAsym = Math.max(maxWingAsym, f.asymmetry);
  }
  assert.deepEqual(
    [...seenWingShowcases].sort(),
    ['majestic_unfurl', 'radiant_flourish', 'seraphic_hover', 'sunburst_ripple']
  );
  assert.ok(maxWingLiftZ > 0.24, `Wings must lift grandly during unfurl/flourish (max=${maxWingLiftZ})`);
  assert.ok(maxWingAsym > 0.45, `sunburst_ripple must introduce graceful asymmetric wave (max=${maxWingAsym})`);

  // 3. Real Solarius & Solar Zenith GLBs: High vs Lite aura budgets, active Lobby idle articulation, and clean disposal
  await withNodeGlbLoader(async (loader) => {
    // Solarius check
    const mBuf = fs.readFileSync(path.join(PUBLIC_DIR, ...SOLAR_LEO_SPECS.solarius.litePathSegments));
    const mGltf = await loader.parseAsync(mBuf.buffer.slice(mBuf.byteOffset, mBuf.byteOffset + mBuf.byteLength), '');
    const mTpl = prepareSolarLeoTemplate('solarius', mGltf.scene, 4, { liteMode: false });
    const mHigh = instantiateSolarLeoModel(mTpl, { liteMode: false });
    const mLite = instantiateSolarLeoModel(mTpl, { liteMode: true });

    assert.ok(mHigh.mountAuraRig && mHigh.mountAuraRig.emberCount === 16 && mHigh.mountAuraRig.groundRing);
    assert.ok(mLite.mountAuraRig && mLite.mountAuraRig.emberCount === 8 && mLite.mountAuraRig.groundRing === undefined);

    let maxLobbyLegFR = 0;
    let maxLobbyHeadYaw = 0;
    let maxLobbyTailY = 0;
    for (let step = 0; step < 300; step++) {
      updateSolarLeoMountPose(mHigh, step * 0.06, 0.06, 0, false, { mode: 'lobby' });
      maxLobbyLegFR = Math.max(maxLobbyLegFR, Math.abs(mHigh.bones.legFR.rotation.x));
      maxLobbyHeadYaw = Math.max(maxLobbyHeadYaw, Math.abs(mHigh.bones.head.rotation.y));
      maxLobbyTailY = Math.max(maxLobbyTailY, Math.abs(mHigh.bones.tail2.rotation.y));
    }
    assert.ok(maxLobbyLegFR > 0.35, `Solarius must lift paws during Lobby idle (max=${maxLobbyLegFR})`);
    assert.ok(maxLobbyHeadYaw > 0.2, `Solarius must survey head in Lobby idle (max=${maxLobbyHeadYaw})`);
    assert.ok(maxLobbyTailY > 0.3, `Solarius tail must swish vividly (max=${maxLobbyTailY})`);

    disposeObjectResources(mHigh.group);
    disposeObjectResources(mLite.group);
    for (const g of mTpl.sharedGeometries) assert.equal(g.userData.sharedCachedGeometry, true);
    mTpl.sharedGeometries.forEach((g) => g.dispose());
    mTpl.sharedTextures.forEach((t) => t.dispose());
    mTpl.parts.forEach((p) => p.material.dispose());

    // Solar Zenith Wings check
    const wBuf = fs.readFileSync(path.join(PUBLIC_DIR, ...SOLAR_LEO_SPECS.solar_zenith.litePathSegments));
    const wGltf = await loader.parseAsync(wBuf.buffer.slice(wBuf.byteOffset, wBuf.byteOffset + wBuf.byteLength), '');
    const wTpl = prepareSolarLeoTemplate('solar_zenith', wGltf.scene, 4, { liteMode: false });
    const wHigh = instantiateSolarLeoModel(wTpl, { liteMode: false });
    const wLite = instantiateSolarLeoModel(wTpl, { liteMode: true });

    assert.ok(wHigh.wingsAuraRig && wHigh.wingsAuraRig.featherCount === 16);
    assert.ok(wLite.wingsAuraRig && wLite.wingsAuraRig.featherCount === 8);

    let maxWingYaw = 0;
    let maxWingLift = 0;
    let maxWingTwist = 0;
    for (let step = 0; step < 300; step++) {
      updateSolarLeoWingsPose(wHigh, step * 0.06, 0.06, 0, false, 0, { mode: 'lobby' });
      maxWingYaw = Math.max(maxWingYaw, Math.abs(wHigh.bones.wingL1.rotation.y));
      maxWingLift = Math.max(maxWingLift, Math.abs(wHigh.bones.wingL1.rotation.z));
      maxWingTwist = Math.max(maxWingTwist, Math.abs(wHigh.bones.wingL1.rotation.x));
    }
    assert.ok(maxWingYaw > 0.45, `Solar Zenith must sweep wide in Lobby (max=${maxWingYaw})`);
    assert.ok(maxWingLift > 0.25, `Solar Zenith must lift vertically along Z (max=${maxWingLift})`);
    assert.ok(maxWingTwist > 0.12, `Solar Zenith must twist/cup feathers along X (max=${maxWingTwist})`);

    disposeObjectResources(wHigh.group);
    disposeObjectResources(wLite.group);
    for (const g of wTpl.sharedGeometries) assert.equal(g.userData.sharedCachedGeometry, true);
    wTpl.sharedGeometries.forEach((g) => g.dispose());
    wTpl.sharedTextures.forEach((t) => t.dispose());
    wTpl.parts.forEach((p) => p.material.dispose());
  });
});

test('Astrolabe of Regulus (Artifact) and Halo of the Leo Sovereign (Halo) cycle all celestial behaviors, pulse radiance, and respect High/Lite GPU budgets', async () => {
  // 1. Artifact pure choreographer cycles all 4 celestial behaviors over 20s
  const seenArtifact = new Set<string>();
  let maxGyroSpin = 0;
  let maxCorePulse = 0;
  for (let t = 0; t < 20.0; t += 0.2) {
    const f = evaluateArtifactCelestialAction(t, 'lobby', false);
    seenArtifact.add(f.action);
    assert.ok(Number.isFinite(f.offsetX) && Number.isFinite(f.offsetY) && Number.isFinite(f.spinSpeedY));
    maxGyroSpin = Math.max(maxGyroSpin, f.spinSpeedY);
    maxCorePulse = Math.max(maxCorePulse, f.corePulse);
  }
  assert.deepEqual(
    [...seenArtifact].sort(),
    ['gyroscope_overdrive', 'harmonic_align', 'orbital_drift', 'solar_resonance']
  );
  assert.ok(maxGyroSpin > 4.5, `gyroscope_overdrive must accelerate spin (max=${maxGyroSpin})`);
  assert.ok(maxCorePulse > 1.5, `Astrolabe star core must visibly pulse (max=${maxCorePulse})`);

  const artCeleb = evaluateArtifactCelestialAction(0.3, 'lobby', true);
  assert.equal(artCeleb.action, 'gyroscope_overdrive');
  assert.ok(artCeleb.orbitSpeedMult >= 2.0);

  // 2. Halo pure choreographer cycles all 4 sovereign behaviors over 23s
  const seenHalo = new Set<string>();
  let maxHaloSpin = 0;
  let maxHaloTiltY = 0;
  for (let t = 0; t < 23.0; t += 0.2) {
    const f = evaluateHaloSovereignAction(t, 'lobby', false);
    seenHalo.add(f.action);
    assert.ok(Number.isFinite(f.spinSpeedZ) && Number.isFinite(f.scalePulse) && Number.isFinite(f.tiltY));
    maxHaloSpin = Math.max(maxHaloSpin, f.spinSpeedZ);
    maxHaloTiltY = Math.max(maxHaloTiltY, Math.abs(f.tiltY));
  }
  assert.deepEqual(
    [...seenHalo].sort(),
    ['celestial_tilt', 'corona_flare', 'sovereign_radiance', 'zodiac_pulse']
  );
  assert.ok(maxHaloSpin > 2.2, `corona_flare must accelerate halo spin (max=${maxHaloSpin})`);
  assert.ok(maxHaloTiltY > 0.18, `celestial_tilt must visibly incline halo in 3D (max=${maxHaloTiltY})`);

  const haloCeleb = evaluateHaloSovereignAction(0.4, 'lobby', true);
  assert.equal(haloCeleb.action, 'corona_flare');
  assert.ok(haloCeleb.starOrbitSpeedMult >= 2.0);

  // 3. Real Astrolabe & Halo GLBs: High vs Lite aura caps, multi-axis updates, and safe disposal
  await withNodeGlbLoader(async (loader) => {
    const aBuf = fs.readFileSync(path.join(PUBLIC_DIR, ...SOLAR_LEO_SPECS.astrolabe_regulus.litePathSegments));
    const aGltf = await loader.parseAsync(aBuf.buffer.slice(aBuf.byteOffset, aBuf.byteOffset + aBuf.byteLength), '');
    const aTpl = prepareSolarLeoTemplate('astrolabe_regulus', aGltf.scene, 4, { liteMode: false });
    const aHigh = instantiateSolarLeoModel(aTpl, { liteMode: false });
    const aLite = instantiateSolarLeoModel(aTpl, { liteMode: true });

    assert.ok(aHigh.artifactAuraRig && aHigh.artifactAuraRig.planetCount === 12 && aHigh.artifactAuraRig.gyroRing);
    assert.ok(aLite.artifactAuraRig && aLite.artifactAuraRig.planetCount === 6 && aLite.artifactAuraRig.gyroRing === undefined);

    let maxArtTiltX = 0;
    let maxArtOffsetY = 0;
    for (let step = 0; step < 260; step++) {
      updateSolarLeoArtifactPose(aHigh, step * 0.06, 0.06, { mode: 'lobby' });
      maxArtTiltX = Math.max(maxArtTiltX, Math.abs(aHigh.visualRoot.rotation.x));
      maxArtOffsetY = Math.max(maxArtOffsetY, Math.abs(aHigh.visualRoot.position.y));
    }
    assert.ok(maxArtTiltX > 0.35, `Astrolabe must tilt expressively in 3D (max=${maxArtTiltX})`);
    assert.ok(maxArtOffsetY > 0.1, `Astrolabe must float across orbital arcs (max=${maxArtOffsetY})`);

    disposeObjectResources(aHigh.group);
    disposeObjectResources(aLite.group);
    for (const g of aTpl.sharedGeometries) assert.equal(g.userData.sharedCachedGeometry, true);
    aTpl.sharedGeometries.forEach((g) => g.dispose());
    aTpl.sharedTextures.forEach((t) => t.dispose());
    aTpl.parts.forEach((p) => p.material.dispose());

    const hBuf = fs.readFileSync(path.join(PUBLIC_DIR, ...SOLAR_LEO_SPECS.leo_sovereign.litePathSegments));
    const hGltf = await loader.parseAsync(hBuf.buffer.slice(hBuf.byteOffset, hBuf.byteOffset + hBuf.byteLength), '');
    const hTpl = prepareSolarLeoTemplate('leo_sovereign', hGltf.scene, 4, { liteMode: false });
    const hHigh = instantiateSolarLeoModel(hTpl, { liteMode: false });
    const hLite = instantiateSolarLeoModel(hTpl, { liteMode: true });

    assert.ok(hHigh.haloAuraRig && hHigh.haloAuraRig.starCount === 16 && hHigh.haloAuraRig.outerRing);
    assert.ok(hLite.haloAuraRig && hLite.haloAuraRig.starCount === 8 && hLite.haloAuraRig.outerRing === undefined);

    let maxHaloScale = 0;
    let maxHaloRotY = 0;
    for (let step = 0; step < 300; step++) {
      updateSolarLeoHaloPose(hHigh, step * 0.06, 0.06, { mode: 'lobby' });
      maxHaloScale = Math.max(maxHaloScale, hHigh.visualRoot.scale.x);
      maxHaloRotY = Math.max(maxHaloRotY, Math.abs(hHigh.visualRoot.rotation.y));
    }
    assert.ok(maxHaloScale > 1.07, `Halo must pulse grandly during zodiac_pulse/corona_flare (max=${maxHaloScale})`);
    assert.ok(maxHaloRotY > 0.14, `Halo must incline gracefully in 3D during celestial_tilt (max=${maxHaloRotY})`);

    disposeObjectResources(hHigh.group);
    disposeObjectResources(hLite.group);
    for (const g of hTpl.sharedGeometries) assert.equal(g.userData.sharedCachedGeometry, true);
    hTpl.sharedGeometries.forEach((g) => g.dispose());
    hTpl.sharedTextures.forEach((t) => t.dispose());
    hTpl.parts.forEach((p) => p.material.dispose());
  });
});

test('Aurelia and all 4 Solar Leo outfits cycle unique playful actions, keep Aurelia bow rigid, stay mounted-safe, and respect High/Lite aura budgets', async () => {
  const styles = [
    'aurelia',
    'aurelia_oasis_dancer',
    'aurelia_temple_commander',
    'aurelia_solaris_valkyrie',
    'aurelia_winter_solstice',
  ] as const;

  const allSeenActions = new Set<string>();
  for (const styleId of styles) {
    const styleActions = new Set<string>();
    let maxHeadRoll = 0;
    let maxRootY = 0;
    let maxArmRaise = 0;
    for (let t = 0; t < 20; t += 0.25) {
      const f = evaluateSolarLeoHeroAction(styleId, t, 'lobby', false, false);
      styleActions.add(f.action);
      allSeenActions.add(f.action);
      maxHeadRoll = Math.max(maxHeadRoll, Math.abs(f.headRoll));
      maxRootY = Math.max(maxRootY, f.rootY);
      maxArmRaise = Math.max(maxArmRaise, Math.abs(f.armLPitch), Math.abs(f.armRPitch));
    }
    assert.equal(styleActions.size, 4, `${styleId} must cycle all 4 unique actions`);
    assert.ok(maxHeadRoll > 0.1, `${styleId} must show expressive head tilt (max=${maxHeadRoll})`);
    assert.ok(maxRootY > 0.08, `${styleId} must bounce/levitate joyfully when dismounted (max=${maxRootY})`);
    if (styleId !== 'aurelia') {
      assert.ok(maxArmRaise > 0.75, `${styleId} must perform lively expressive arm gestures (max=${maxArmRaise})`);
    }
    // Mounted safety: rootY stays tightly damped near saddle while upper body still dances
    const mountedFrame = evaluateSolarLeoHeroAction(styleId, 11.2, 'lobby', true, false);
    assert.ok(mountedFrame.rootY <= 0.06, `${styleId} must stay anchored on saddle when riding (y=${mountedFrame.rootY})`);

    // Instant celebration flourish on outfit switch / emote
    const celeb = evaluateSolarLeoHeroAction(styleId, 0.5, 'lobby', false, true);
    assert.ok(celeb.sparkleBoost >= 0.95, `${styleId} celebration must surge sparkle aura`);
  }
  assert.equal(allSeenActions.size, 20, 'All 5 hero/outfit styles must have 20 unique named choreography beats');

  // Verify real Aurelia base + Oasis Dancer Lite GLBs: High/Lite heroAuraRig caps, zero bow bend on Aurelia base, lively arms on Oasis Dancer
  await withNodeGlbLoader(async (loader) => {
    const aBuf = fs.readFileSync(path.join(PUBLIC_DIR, ...SOLAR_LEO_SPECS.aurelia.litePathSegments));
    const aGltf = await loader.parseAsync(aBuf.buffer.slice(aBuf.byteOffset, aBuf.byteOffset + aBuf.byteLength), '');
    const aTpl = prepareSolarLeoTemplate('aurelia', aGltf.scene, 4, { liteMode: false });
    const aHigh = instantiateSolarLeoModel(aTpl, { liteMode: false });
    const aLite = instantiateSolarLeoModel(aTpl, { liteMode: true });

    assert.ok(aHigh.heroAuraRig && aHigh.heroAuraRig.moteCount === 16 && aHigh.heroAuraRig.ribbonRing);
    assert.ok(aLite.heroAuraRig && aLite.heroAuraRig.moteCount === 8 && aLite.heroAuraRig.ribbonRing === undefined);

    let maxChestYaw = 0;
    let maxHeadRoll = 0;
    for (let step = 0; step < 240; step++) {
      updateSolarLeoHumanoidPose(aHigh, {
        elapsed: step * 0.08,
        dt: 0.08,
        speed: 0,
        shooting: false,
        shootRecoil: 0,
        dashing: false,
        riding: true,
        ultBurst: 0,
        mode: 'lobby',
        celebrating: step < 20,
      });
      maxChestYaw = Math.max(maxChestYaw, Math.abs(aHigh.bones.chest.rotation.y));
      maxHeadRoll = Math.max(maxHeadRoll, Math.abs(aHigh.bones.head.rotation.z));
      assert.ok(Math.abs(aHigh.bones.armL.rotation.x) < 1e-5, 'Aurelia sculpted bow armL must remain strictly rigid');
      assert.ok(Math.abs(aHigh.bones.armR.rotation.x) < 1e-5, 'Aurelia sculpted bow armR must remain strictly rigid');
    }
    assert.ok(maxChestYaw > 0.14, `Aurelia Lobby pose must animate chest expressively (max=${maxChestYaw})`);
    assert.ok(maxHeadRoll > 0.1, `Aurelia Lobby pose must animate playful head tilt (max=${maxHeadRoll})`);

    disposeObjectResources(aHigh.group);
    disposeObjectResources(aLite.group);
    aTpl.sharedGeometries.forEach((g) => g.dispose());
    aTpl.sharedTextures.forEach((t) => t.dispose());
    aTpl.parts.forEach((p) => p.material.dispose());

    const dBuf = fs.readFileSync(path.join(PUBLIC_DIR, ...SOLAR_LEO_SPECS.aurelia_oasis_dancer.litePathSegments));
    const dGltf = await loader.parseAsync(dBuf.buffer.slice(dBuf.byteOffset, dBuf.byteOffset + dBuf.byteLength), '');
    const dTpl = prepareSolarLeoTemplate('aurelia_oasis_dancer', dGltf.scene, 4, { liteMode: true });
    const dRig = instantiateSolarLeoModel(dTpl, { liteMode: true });
    assert.ok(dRig.heroAuraRig && dRig.heroAuraRig.styleId === 'aurelia_oasis_dancer' && dRig.heroAuraRig.moteCount === 8);

    let maxDancerArm = 0;
    let maxDancerYaw = 0;
    for (let step = 0; step < 240; step++) {
      updateSolarLeoHumanoidPose(dRig, {
        elapsed: step * 0.08,
        dt: 0.08,
        speed: 0,
        shooting: false,
        shootRecoil: 0,
        dashing: false,
        riding: false,
        ultBurst: 0,
        mode: 'lobby',
      });
      maxDancerArm = Math.max(maxDancerArm, Math.abs(dRig.bones.armL.rotation.x));
      maxDancerYaw = Math.max(maxDancerYaw, Math.abs(dRig.visualRoot.rotation.y));
    }
    assert.ok(maxDancerArm > 0.65, `Oasis Dancer must animate playful ribbon arms (max=${maxDancerArm})`);
    assert.ok(maxDancerYaw > 1.5, `Oasis Dancer must perform joyful pirouette spin (max=${maxDancerYaw})`);

    disposeObjectResources(dRig.group);
    dTpl.sharedGeometries.forEach((g) => g.dispose());
    dTpl.sharedTextures.forEach((t) => t.dispose());
    dTpl.parts.forEach((p) => p.material.dispose());
  });
});






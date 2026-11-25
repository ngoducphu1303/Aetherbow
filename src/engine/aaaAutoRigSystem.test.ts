import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import {
  AUTO_RIG_CALIBRATION,
  AUTO_RIG_SCHEMAS,
  type AutoRigArchetype,
  type AutoRigPoseInput,
  instantiateAutoRigModel,
  prepareAutoRigTemplate,
  updateAutoRigPose,
} from './aaaAutoRigSystem';
import {
  createBoneTrailController,
  disposeBoneTrailController,
  updateBoneTrailController,
} from './aaaBoneTrails';
import { CHAPTER1_BOSS_LITE_PATH_SEGMENTS } from './chapter1Boss';
import { CHAPTER1_ROSTER_SPECS } from './chapter1RosterAssets';
import { skipIfGlbOffloadedToCdn } from './testGlbManifestHelper';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

const ALL_SIX_ARCHETYPES: readonly AutoRigArchetype[] = [
  'fire_lion',
  'stone_guardian',
  'flame_spirit',
  'sun_spearman',
  'winged_solar_lion',
  'solar_lion_boss',
];

const EXPECTED_BONE_COUNTS: Record<AutoRigArchetype, number> = {
  fire_lion: 11,
  stone_guardian: 11,
  flame_spirit: 10,
  sun_spearman: 11,
  winged_solar_lion: 14,
  solar_lion_boss: 13,
};

function getLiteGlbPath(archetype: AutoRigArchetype): string {
  if (archetype === 'solar_lion_boss') {
    return path.join(PUBLIC_DIR, ...CHAPTER1_BOSS_LITE_PATH_SEGMENTS);
  }
  return path.join(PUBLIC_DIR, ...CHAPTER1_ROSTER_SPECS[archetype].litePathSegments);
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

function makeBasePoseInput(overrides?: Partial<AutoRigPoseInput>): AutoRigPoseInput {
  return {
    elapsed: 1.2,
    dt: 1 / 60,
    phaseAngle: 0,
    speed: 0,
    maxSpeed: 5.5,
    lateralSpeed: 0,
    facingYaw: 0,
    targetYaw: 0,
    telegraphType: 'none',
    telegraphProgress: 0,
    burstType: 'none',
    burstTimer: 0,
    bossPhase: 1,
    stunTimer: 0,
    hitFlashTimer: 0,
    recoilPitch: 0,
    recoilRoll: 0,
    isDashing: false,
    ...overrides,
  };
}

test('All 6 real Chapter 1 Lite GLBs auto-rig into valid 10–14 bone SkinnedMeshes with exact normalized skin weights and grounded calibration', async (t) => {
  // Verify facing calibration values for off-axis raw sculpts (always runs!)
  assert.equal(AUTO_RIG_CALIBRATION.fire_lion.facingYawOffset, -0.96);
  assert.equal(AUTO_RIG_CALIBRATION.flame_spirit.facingYawOffset, Math.PI);
  assert.equal(AUTO_RIG_CALIBRATION.sun_spearman.facingYawOffset, -0.14);
  assert.equal(AUTO_RIG_CALIBRATION.stone_guardian.facingYawOffset, 0);
  assert.equal(AUTO_RIG_CALIBRATION.winged_solar_lion.facingYawOffset, 0);
  assert.equal(AUTO_RIG_CALIBRATION.solar_lion_boss.facingYawOffset, 0);

  if (skipIfGlbOffloadedToCdn(t, ALL_SIX_ARCHETYPES.map(getLiteGlbPath))) return;

  await withNodeGlbLoader(async (loader) => {
    for (const archetype of ALL_SIX_ARCHETYPES) {
      const glbPath = getLiteGlbPath(archetype);
      const buf = fs.readFileSync(glbPath);
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      const gltf = await loader.parseAsync(ab, '');

      const template = prepareAutoRigTemplate(archetype, gltf.scene, 4, { liteMode: true });
      const cal = AUTO_RIG_CALIBRATION[archetype];
      const expectedBones = EXPECTED_BONE_COUNTS[archetype];

      assert.equal(
        AUTO_RIG_SCHEMAS[archetype].bones.length,
        expectedBones,
        `${archetype} schema should define ${expectedBones} bones`
      );

      // Verify grounding & target height calibration
      const height = template.bounds.max.y - template.bounds.min.y;
      assert.ok(
        Math.abs(height - cal.targetHeight) < 0.06,
        `${archetype} calibrated height (${height.toFixed(3)}) must match ${cal.targetHeight}`
      );
      assert.ok(
        Math.abs(template.bounds.min.y - cal.hoverOffsetY) < 0.04,
        `${archetype} calibrated min.y (${template.bounds.min.y.toFixed(3)}) must match hoverOffsetY (${cal.hoverOffsetY})`
      );

      // Instantiate with heightMultiplier != 1.0 to verify bind matrix integrity
      const instance = instantiateAutoRigModel(template, { heightMultiplier: 1.15 });
      assert.equal(instance.bones.length, expectedBones, `${archetype} instance bone count`);
      assert.ok(instance.skinnedMeshes.length >= 1, `${archetype} must build SkinnedMesh`);
      assert.ok(instance.rootBone.parent === instance.group, `${archetype} rootBone must stay attached to group`);
      assert.ok(instance.primaryTrailAnchors.length >= 1, `${archetype} must expose primary trail anchors`);

      for (const sm of instance.skinnedMeshes) {
        assert.equal(sm instanceof THREE.SkinnedMesh, true);
        assert.equal(sm.skeleton, instance.skeleton);

        const idxAttr = sm.geometry.getAttribute('skinIndex') as THREE.BufferAttribute;
        const wAttr = sm.geometry.getAttribute('skinWeight') as THREE.BufferAttribute;
        assert.ok(idxAttr && wAttr, `${archetype} geometry must have skinIndex & skinWeight attributes`);
        assert.equal(idxAttr.count, wAttr.count);
        assert.ok(idxAttr.count > 100, `${archetype} real mesh should contain >100 vertices`);

        for (let v = 0; v < idxAttr.count; v++) {
          const i0 = idxAttr.getX(v);
          const i1 = idxAttr.getY(v);
          const i2 = idxAttr.getZ(v);
          const i3 = idxAttr.getW(v);
          const w0 = wAttr.getX(v);
          const w1 = wAttr.getY(v);
          const w2 = wAttr.getZ(v);
          const w3 = wAttr.getW(v);

          assert.ok(
            i0 < expectedBones && i1 < expectedBones && i2 < expectedBones && i3 < expectedBones,
            `${archetype} vertex ${v} has out-of-range skinIndex`
          );
          const sum = w0 + w1 + w2 + w3;
          assert.ok(
            Number.isFinite(sum) && Math.abs(sum - 1.0) < 1e-4,
            `${archetype} vertex ${v} skinWeight sum must equal 1.0, got ${sum}`
          );
        }
      }
    }
  });
});

test('Skeletal choreography drives distinct real-bone articulation across locomotion, attacks, wings, tails, and stagger for all 6 archetypes', async (t) => {
  if (skipIfGlbOffloadedToCdn(t, ALL_SIX_ARCHETYPES.map(getLiteGlbPath))) return;
  await withNodeGlbLoader(async (loader) => {
    const loadInstance = async (archetype: AutoRigArchetype) => {
      const buf = fs.readFileSync(getLiteGlbPath(archetype));
      const ab = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
      const gltf = await loader.parseAsync(ab, '');
      const tpl = prepareAutoRigTemplate(archetype, gltf.scene, 4, { liteMode: true });
      return instantiateAutoRigModel(tpl);
    };

    // 1. Winged Solar Lion: 2-joint phase-delayed wingbeats + roar/slam flare
    {
      const lion = await loadInstance('winged_solar_lion');
      let maxWingDiff = 0;
      let sawPhaseLag = false;
      for (let i = 0; i < 45; i++) {
        updateAutoRigPose(
          lion,
          makeBasePoseInput({ elapsed: i * 0.04, dt: 0.04, speed: 4.5, maxSpeed: 6.0 })
        );
        const l1 = lion.boneMap.wingL1.rotation.z;
        const r1 = lion.boneMap.wingR1.rotation.z;
        const l2 = lion.boneMap.wingL2.rotation.z;
        // Wings must flap symmetrically (opposite Z signs)
        assert.ok(Math.abs(l1 + r1) < 0.08, `Winged lion wings should flap symmetrically: L=${l1}, R=${r1}`);
        maxWingDiff = Math.max(maxWingDiff, Math.abs(l1));
        if (Math.abs(l2 - l1) > 0.04) sawPhaseLag = true;
      }
      assert.ok(maxWingDiff > 0.18, `Winged lion primary wings must visibly flap (max=${maxWingDiff})`);
      assert.equal(sawPhaseLag, true, 'Winged lion outer wing joints must exhibit phase lag');

      // Slam telegraph flares wings upward/outward
      for (let i = 0; i < 20; i++) {
        updateAutoRigPose(
          lion,
          makeBasePoseInput({
            elapsed: 3.0 + i * 0.03,
            dt: 0.03,
            telegraphType: 'slam',
            telegraphProgress: 0.9,
          })
        );
      }
      assert.ok(Math.abs(lion.boneMap.wingL1.rotation.z) > 0.25, 'Slam telegraph must flare wings wide');
    }

    // 2. Fire Lion: rotary quadruped gallop + grounded footstep trigger + crouch/pounce
    {
      const fl = await loadInstance('fire_lion');
      let footstepCount = 0;
      let maxLegSeparation = 0;
      for (let i = 0; i < 50; i++) {
        updateAutoRigPose(
          fl,
          makeBasePoseInput({ elapsed: i * 0.03, dt: 0.03, speed: 5.5, maxSpeed: 6.0 })
        );
        if (fl.state.footstepTriggered) footstepCount++;
        const sep = Math.abs(fl.boneMap.legFL.rotation.x - fl.boneMap.legBL.rotation.x);
        maxLegSeparation = Math.max(maxLegSeparation, sep);
      }
      assert.ok(footstepCount >= 1, 'Fire lion running stride must fire footstepTriggered events');
      assert.ok(maxLegSeparation > 0.25, 'Fire lion front and rear legs must articulate in distinct gallop phases');

      // Telegraph crouch vs strike burst
      for (let i = 0; i < 16; i++) {
        updateAutoRigPose(
          fl,
          makeBasePoseInput({
            elapsed: 2.0 + i * 0.03,
            dt: 0.03,
            telegraphType: 'lunge',
            telegraphProgress: 0.95,
          })
        );
      }
      const crouchPelvisY = fl.boneMap.pelvis.position.y;
      for (let i = 0; i < 12; i++) {
        updateAutoRigPose(
          fl,
          makeBasePoseInput({
            elapsed: 2.6 + i * 0.03,
            dt: 0.03,
            burstType: 'lunge',
            burstTimer: 0.28,
            speed: 7.0,
          })
        );
      }
      assert.ok(
        fl.boneMap.pelvis.position.y > crouchPelvisY,
        'Fire lion must uncoil upward/forward from lunge crouch during strike'
      );
    }

    // 3. Stone Guardian: overhead raise on slam telegraph, heavy drive down on slam burst
    {
      const sg = await loadInstance('stone_guardian');
      for (let i = 0; i < 20; i++) {
        updateAutoRigPose(
          sg,
          makeBasePoseInput({
            elapsed: 1.0 + i * 0.03,
            dt: 0.03,
            telegraphType: 'slam',
            telegraphProgress: 0.95,
          })
        );
      }
      const windupArmR = sg.boneMap.armR.rotation.x;
      for (let i = 0; i < 14; i++) {
        updateAutoRigPose(
          sg,
          makeBasePoseInput({
            elapsed: 1.8 + i * 0.03,
            dt: 0.03,
            burstType: 'slam',
            burstTimer: 0.26,
          })
        );
      }
      const strikeArmR = sg.boneMap.armR.rotation.x;
      assert.ok(
        windupArmR < -0.5,
        `Stone guardian armR must raise high overhead on slam windup (got ${windupArmR})`
      );
      assert.ok(
        strikeArmR > windupArmR + 0.7,
        `Stone guardian armR must slam sharply downward on burst (windup=${windupArmR}, strike=${strikeArmR})`
      );
    }

    // 4. Flame Spirit: 3-segment traveling-wave tail + dual-hand cast thrust
    {
      const fsInst = await loadInstance('flame_spirit');
      let maxTailSpread = 0;
      for (let i = 0; i < 40; i++) {
        updateAutoRigPose(
          fsInst,
          makeBasePoseInput({ elapsed: i * 0.04, dt: 0.04, speed: 3.0, maxSpeed: 5.0 })
        );
        const spread = Math.abs(fsInst.boneMap.tail1.rotation.y - fsInst.boneMap.tail3.rotation.y)
          + Math.abs(fsInst.boneMap.tail1.rotation.z - fsInst.boneMap.tail3.rotation.z);
        maxTailSpread = Math.max(maxTailSpread, spread);
      }
      assert.ok(maxTailSpread > 0.05, 'Flame spirit 3-segment flame tail must ripple in traveling wave');

      for (let i = 0; i < 15; i++) {
        updateAutoRigPose(
          fsInst,
          makeBasePoseInput({
            elapsed: 2.0 + i * 0.03,
            dt: 0.03,
            burstType: 'cast',
            burstTimer: 0.25,
          })
        );
      }
      assert.ok(
        Math.abs(fsInst.boneMap.armL.rotation.x) > 0.25 && Math.abs(fsInst.boneMap.armR.rotation.x) > 0.25,
        'Flame spirit arms must thrust forward during spell cast burst'
      );
    }

    // 5. Sun Spearman: spear coils back during lunge telegraph and thrusts forward on strike/dash
    {
      const sp = await loadInstance('sun_spearman');
      for (let i = 0; i < 20; i++) {
        updateAutoRigPose(
          sp,
          makeBasePoseInput({
            elapsed: 1.0 + i * 0.03,
            dt: 0.03,
            telegraphType: 'lunge',
            telegraphProgress: 0.9,
          })
        );
      }
      const windupChestYaw = sp.boneMap.chest.rotation.y;
      const windupArmR = sp.boneMap.armR.rotation.x;

      for (let i = 0; i < 15; i++) {
        updateAutoRigPose(
          sp,
          makeBasePoseInput({
            elapsed: 1.8 + i * 0.03,
            dt: 0.03,
            burstType: 'lunge',
            burstTimer: 0.25,
            isDashing: true,
            speed: 8.5,
          })
        );
      }
      assert.ok(
        Math.abs(sp.boneMap.chest.rotation.y - windupChestYaw) > 0.18 ||
          Math.abs(sp.boneMap.armR.rotation.x - windupArmR) > 0.35,
        'Sun spearman must uncoil torso and thrust spear forward from lunge windup'
      );
    }

    // 6. Solar Lion Final Boss: roar head pitch, cross-claw strike, and guard-break stagger kneel
    {
      const boss = await loadInstance('solar_lion_boss');
      const restPelvisY = boss.boneRestPos[1].y;

      for (let i = 0; i < 20; i++) {
        updateAutoRigPose(
          boss,
          makeBasePoseInput({
            elapsed: 1.0 + i * 0.03,
            dt: 0.03,
            burstType: 'roar',
            burstTimer: 0.35,
            bossPhase: 2,
          })
        );
      }
      assert.ok(boss.boneMap.head.rotation.x < -0.15, 'Solar Lion Boss must tilt head back during roar');

      // Guard-break stagger kneel
      for (let i = 0; i < 25; i++) {
        updateAutoRigPose(
          boss,
          makeBasePoseInput({
            elapsed: 2.0 + i * 0.03,
            dt: 0.03,
            stunTimer: 1.8,
            bossPhase: 2,
          })
        );
      }
      assert.ok(
        boss.boneMap.pelvis.position.y < restPelvisY - 0.1,
        'Solar Lion Boss must drop pelvis downward into stagger kneel when stunned'
      );
      assert.ok(boss.boneMap.spine.rotation.x > 0.12, 'Solar Lion Boss spine must hunch forward when stunned');

      // Verify all bone rotations and positions remain finite
      for (const b of boss.bones) {
        assert.ok(
          Number.isFinite(b.rotation.x) &&
            Number.isFinite(b.rotation.y) &&
            Number.isFinite(b.rotation.z) &&
            Number.isFinite(b.position.y)
        );
      }
    }
  });
});

test('Bone-attached ribbon trails scale cleanly between High (10 pts) and Lite (6 pts), ignite on strikes, reset on blink, and dispose cleanly', () => {
  const scene = new THREE.Scene();
  const anchorA = new THREE.Object3D();
  const anchorB = new THREE.Object3D();
  anchorA.position.set(0, 1, 0);
  anchorB.position.set(1, 1, 0);
  scene.add(anchorA, anchorB);
  scene.updateMatrixWorld(true);

  const highCtrl = createBoneTrailController([anchorA, anchorB], {
    colorHex: 0xf97316,
    accentHex: 0xfef08a,
    width: 0.35,
    liteMode: false,
  });
  const liteCtrl = createBoneTrailController([anchorA], {
    colorHex: 0xf97316,
    accentHex: 0xfef08a,
    width: 0.35,
    liteMode: true,
  });
  scene.add(highCtrl.group, liteCtrl.group);

  assert.equal(highCtrl.ribbons.length, 2);
  assert.equal(highCtrl.ribbons[0].maxPoints, 10, 'High mode trails should use 10 ribbon points');
  assert.equal(liteCtrl.ribbons[0].maxPoints, 6, 'Lite mode trails should use 6 ribbon points for Dell E5430');

  // Verify ZERO PointLights are created
  let lightCount = 0;
  highCtrl.group.traverse((obj) => {
    if (obj instanceof THREE.Light) lightCount++;
  });
  assert.equal(lightCount, 0, 'Bone trails must never spawn dynamic lights');

  // Sweep anchor smoothly during active strike -> ribbon must ignite & become visible
  for (let i = 1; i <= 8; i++) {
    anchorA.position.set(i * 0.25, 1 + Math.sin(i * 0.4) * 0.2, i * 0.15);
    anchorB.position.set(1 + i * 0.25, 1, i * 0.15);
    scene.updateMatrixWorld(true);
    updateBoneTrailController(highCtrl, 1.0, 1 / 60);
    updateBoneTrailController(liteCtrl, 1.0, 1 / 60);
  }
  assert.equal(highCtrl.ribbons[0].mesh.visible, true);
  assert.equal(liteCtrl.ribbons[0].mesh.visible, true);
  assert.ok(highCtrl.ribbons[0].material.opacity > 0.3);

  // Teleport/blink > 3.2m -> trail must reset immediately to prevent stretched sky-spikes
  anchorA.position.set(25, 1, 25);
  scene.updateMatrixWorld(true);
  updateBoneTrailController(liteCtrl, 1.0, 1 / 60);
  assert.equal(liteCtrl.ribbons[0].mesh.visible, false, 'Teleport jump >3.2m must cleanly reset trail ribbon');
  assert.equal(liteCtrl.ribbons[0].activeEnergy, 0);

  // Clean disposal removes groups from scene
  disposeBoneTrailController(highCtrl);
  disposeBoneTrailController(liteCtrl);
  assert.equal(highCtrl.group.parent, null);
  assert.equal(liteCtrl.group.parent, null);
});

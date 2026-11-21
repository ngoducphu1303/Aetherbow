import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { Box3, SkinnedMesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MOUNT_MAP, ZODIAC_MOUNTS, getMountAppearance, getMountStats } from '../data/wave8Data';
import type { SaveData } from '../types/game';
import { BLACK_DRAGON_ASSET, createBlackDragonRide } from './blackDragonRide';

const asset = new URL('../../public/assets/mounts/black-dragon.glb', import.meta.url);

test('Hắc Long is a distinct free mount in the release roster and saved equipment', () => {
  assert.equal(MOUNT_MAP.black_dragon.name, 'Hắc Long');
  assert.ok(ZODIAC_MOUNTS.some((mount) => mount.id === 'black_dragon' && mount.unlockGems === 0 && mount.unlockShards === 0));
  assert.deepEqual(getMountStats('black_dragon', 1), getMountStats('azure_dragon', 1));
  assert.ok(ZODIAC_MOUNTS.some((mount) => mount.id === 'azure_dragon'));
  const saved = { equippedMountId: 'black_dragon', unlockedMounts: ['black_dragon'], mountAppearance: 'zodiac' } as SaveData;
  assert.equal(getMountAppearance(saved).mountId, 'black_dragon');
  assert.equal(getMountAppearance({ ...saved, unlockedMounts: [] }).mountId, null);
});

test('the published dragon uses its embedded idle and carries a grounded, centered seat', async () => {
  assert.equal(BLACK_DRAGON_ASSET, 'assets/mounts/black-dragon.glb');
  // CPU-only: keep real geometry, skinning and motion; decode textures in browser QA.
  Object.assign(globalThis, { self: globalThis, createImageBitmap: async () => ({ width: 1, height: 1, close() {} }) });
  const bytes = readFileSync(asset);
  const gltf = await new GLTFLoader().parseAsync(Uint8Array.from(bytes).buffer, '');
  assert.ok(gltf.animations[0].duration > 5);
  for (const name of ['Walk', 'Sprint', 'WingFlare']) {
    const clip = gltf.animations.find((candidate) => candidate.name === name);
    assert.ok(clip && clip.duration > 0.4 && clip.tracks.length >= 10, `missing authored ${name}`);
    const tracks = new Set(clip.tracks.map((track) => track.name));
    assert.ok(gltf.animations[0].tracks.every((track) => tracks.has(track.name)), `${name} must preserve unkeyed idle-pose joints`);
    for (const track of clip.tracks) {
      const n = track.getValueSize();
      const end = track.values.length - n;
      assert.ok(track.values.every(Number.isFinite));
      assert.ok(track.values.slice(0, n).every((value, i) => Math.abs(value - track.values[end + i]) < 0.0001), `${name}: ${track.name}`);
    }
  }
  assert.ok(!gltf.scene.getObjectByName('Plane'));
  const ride = createBlackDragonRide(gltf.scene, gltf.animations);
  const first = ride.saddle.getWorldPosition(new Vector3());
  assert.ok(Math.abs(first.x) < 0.05 && Math.abs(first.z) < 0.1 && first.y > 0.8);
  const rest = new Box3().setFromObject(ride.model, true);
  assert.ok(Math.abs(rest.min.y) < 0.03 && rest.max.z > 0.5 && rest.min.z < -2);
  assert.ok(rest.max.x - rest.min.x < 7);
  const head = ride.model.getObjectByName('head_022')!;
  const initialHead = head.getWorldPosition(new Vector3());
  for (let i = 0; i < 36; i++) ride.update(1 / 30, 0);
  assert.ok(head.getWorldPosition(new Vector3()).distanceTo(initialHead) > 0.005);
  assert.ok(ride.saddle.getWorldPosition(new Vector3()).distanceTo(first) > 0.001);
  const foot = ride.model.getObjectByName('ik_underarm_L_end_0196')!;
  const idleFoot = foot.getWorldPosition(new Vector3());
  for (let i = 0; i < 16; i++) ride.update(1 / 60, 4.8);
  assert.equal(ride.motion, 'Walk');
  assert.ok(foot.getWorldPosition(new Vector3()).distanceTo(idleFoot) > 0.03);
  ride.update(1 / 60, 9, true);
  assert.equal(ride.motion, 'Sprint');
  for (let i = 0; i < 510 && ride.motion !== 'WingFlare'; i++) ride.update(1 / 60, 0);
  assert.equal(ride.motion, 'WingFlare');
  ride.update(1 / 60, 4.8);
  assert.equal(ride.motion, 'Walk');
  for (const [name, speed, dash] of [['Walk', 4.8, false], ['Sprint', 9, true]] as const) {
    const left = ride.model.getObjectByName('w_C_L_057')!;
    const right = ride.model.getObjectByName('w_C_R_069')!;
    const paw = ride.model.getObjectByName('Hand_L_0133')!;
    const cycle = gltf.animations.find((clip) => clip.name === name)!.duration;
    for (let i = 0; i < 45; i++) ride.update(1 / 60, speed, dash);
    assert.equal(ride.motion, name);
    const snapshot = () => ({ left: left.quaternion.clone(), right: right.quaternion.clone(), paw: paw.getWorldPosition(new Vector3()) });
    const samples = [snapshot()];
    let simultaneousFlapAndStride = false;
    for (let i = 0; i <= Math.ceil(cycle * 60); i++) {
      ride.update(1 / 60, speed, dash);
      const pose = snapshot();
      simultaneousFlapAndStride ||= samples.some((previous) => previous.left.angleTo(pose.left) > 0.50 &&
        previous.right.angleTo(pose.right) > 0.50 && previous.paw.distanceTo(pose.paw) > 0.07);
      samples.push(pose);
    }
    assert.ok(simultaneousFlapAndStride, `${name}: both wings must flap visibly while the paw is striding`);
  }
  let skinned = 0;
  ride.model.traverse((node) => { if (node instanceof SkinnedMesh) skinned++; });
  assert.equal(skinned, 3);
  ride.dispose();
});

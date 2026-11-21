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
  let skinned = 0;
  ride.model.traverse((node) => { if (node instanceof SkinnedMesh) skinned++; });
  assert.equal(skinned, 3);
  ride.dispose();
});

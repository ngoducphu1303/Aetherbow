import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import test from 'node:test';
import {
  MOUNT_MAP,
  WEAPON_AURAS,
  ZODIAC_MOUNTS,
  getMountAppearance,
  getMountStats,
  getWeaponAuraStats,
} from '../data/wave8Data';
import type { SaveData } from '../types/game';

const blackDragonAsset = new URL('../../public/assets/mounts/black-dragon.glb', import.meta.url);
const legacyDragonAsset = new URL('../../public/assets/mounts/dragon.glb', import.meta.url);

test('Solarius and Vulcan are the 3D Zodiac mounts, Hắc Long and Weapon Auras are removed, and legacy dragon GLBs are deleted', () => {
  assert.deepEqual(new Set(ZODIAC_MOUNTS.map(({ id }) => id)), new Set(['solarius', 'vulcan']));
  assert.equal(MOUNT_MAP.solarius.name, 'Solarius · Sư Tử Thái Dương');
  assert.equal(MOUNT_MAP.black_dragon, undefined);
  assert.ok(MOUNT_MAP.solarius.unlockGems === 0 && MOUNT_MAP.solarius.unlockShards === 0);

  const solariusStats = getMountStats('solarius', 1);
  assert.ok(solariusStats.atk > 0 && solariusStats.hp > 0 && solariusStats.moveSpeed > 0);

  // Removed legacy mount returns zero stats safely
  assert.deepEqual(getMountStats('black_dragon', 3), {
    atk: 0,
    hp: 0,
    dr: 0,
    moveSpeed: 0,
  });

  // Weapon Auras catalog is emptied and guarded
  assert.equal(WEAPON_AURAS.length, 0);
  assert.deepEqual(getWeaponAuraStats('solar_flare', 3), { atkPct: 0, critDmg: 0 });

  const saved = {
    equippedMountId: 'solarius',
    unlockedMounts: ['solarius'],
    mountAppearance: 'zodiac',
  } as SaveData;
  assert.equal(getMountAppearance(saved).mountId, 'solarius');
  assert.equal(getMountAppearance({ ...saved, unlockedMounts: [] }).mountId, null);

  // Heavy Black Dragon GLB files removed from disk to keep bundle lean for Dell E5430
  assert.equal(existsSync(blackDragonAsset), false);
  assert.equal(existsSync(legacyDragonAsset), false);
});

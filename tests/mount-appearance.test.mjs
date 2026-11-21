import assert from 'node:assert/strict';
import test from 'node:test';
import { getMountAppearance } from '../src/data/wave8Data.ts';

const hắcLongSave = {
  equippedMountId: 'black_dragon',
  unlockedMounts: ['black_dragon'],
  equippedAstralSteedId: null,
  unlockedAstralSteeds: [],
};
const blackDragon = { mountId: 'black_dragon', astralSteedId: null };
const noMount = { mountId: null, astralSteedId: null };

test('Hắc Long là thú cưỡi duy nhất còn lại trong hệ thống', () => {
  assert.deepEqual(getMountAppearance(hắcLongSave), blackDragon);
  assert.deepEqual(getMountAppearance({ ...hắcLongSave, equippedMountId: null }), noMount);
  assert.deepEqual(getMountAppearance({ ...hắcLongSave, unlockedMounts: [] }), noMount);
});

test('mặc thử và chọn ngoại hình chỉ cho phép Hắc Long hoặc tháo thú cưỡi', () => {
  assert.deepEqual(getMountAppearance(hắcLongSave, 'black_dragon'), blackDragon);
  assert.deepEqual(getMountAppearance(hắcLongSave, null), noMount);
  assert.deepEqual(getMountAppearance(hắcLongSave, undefined, null), noMount);
  assert.deepEqual(getMountAppearance({ ...hắcLongSave, mountAppearance: 'zodiac' }), blackDragon);
  assert.deepEqual(
    getMountAppearance({ ...hắcLongSave, equippedMountId: null, equippedAstralSteedId: null }),
    noMount
  );
});

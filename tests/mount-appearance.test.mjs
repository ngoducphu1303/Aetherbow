import assert from 'node:assert/strict';
import test from 'node:test';
import { getMountAppearance } from '../src/data/wave8Data.ts';

const mixedSave = {
  equippedMountId: 'azure_dragon',
  unlockedMounts: ['azure_dragon'],
  equippedAstralSteedId: 'galaxy_pegasus',
  unlockedAstralSteeds: ['galaxy_pegasus'],
};
const dragon = { mountId: 'azure_dragon', astralSteedId: null };
const astral = { mountId: null, astralSteedId: 'galaxy_pegasus' };

test('Thanh Long hiện trên save cũ có cả hai thú cưỡi', () => {
  assert.deepEqual(getMountAppearance(mixedSave), dragon);
  assert.deepEqual(getMountAppearance({ ...mixedSave, equippedMountId: null }), astral);
});

test('mặc thử và chọn ngoại hình tôn trọng thú cưỡi được chọn', () => {
  const prefersAstral = { ...mixedSave, mountAppearance: 'astral' };
  assert.deepEqual(getMountAppearance(prefersAstral), astral);
  assert.deepEqual(getMountAppearance(prefersAstral, 'azure_dragon'), dragon);
  assert.deepEqual(getMountAppearance(prefersAstral, null), { mountId: null, astralSteedId: null });
  assert.deepEqual(getMountAppearance({ ...prefersAstral, mountAppearance: 'zodiac' }), dragon);
  assert.deepEqual(getMountAppearance({ ...prefersAstral, unlockedAstralSteeds: [] }), dragon);
});

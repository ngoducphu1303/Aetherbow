import test from 'node:test';
import assert from 'node:assert/strict';
import { HEROES, isPlayableHeroId } from '../src/data/heroesData.ts';
import { getHeroAssetPack } from '../src/data/assetRegistry.ts';

test('retired Alice and Miku IDs cannot add either hero to the playable roster', () => {
  assert.deepEqual(HEROES.map(({ id }) => id), ['aurelia', 'bellona', 'sylvia']);
  for (const id of ['artemis', 'hatsune_miku']) {
    assert.equal(isPlayableHeroId(id), false);
    assert.equal(getHeroAssetPack(id).assetKey, 'aurelia');
  }
});

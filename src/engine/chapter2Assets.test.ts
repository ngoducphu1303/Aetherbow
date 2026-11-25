import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { CHAPTERS } from '../data/chaptersData';
import { grantChapter2Collection } from '../data/chapter2Collection';
import { migrateSaveData } from '../data/earlyProgressionData';
import { createInitialSaveData } from '../data/gearData';
import { EnemyKind } from '../types/game';
import {
  CHAPTER2_ROSTER_ASSET_IDS,
  getChapter1RosterAssetUrl,
  resolveCampaignRosterAssetId,
} from './chapter1RosterAssets';
import { getChapter2MapHighAssetUrl } from './chapter2Map';
import { getSolarLeoAssetUrl, resolveSolarLeoHeroAssetId } from './solarLeoAssets';
import { assertValidGlbAssetOrManifest } from './testGlbManifestHelper';

function verifyRuntimeFile(url: URL, maxBytes: number): void {
  assertValidGlbAssetOrManifest(`public${decodeURIComponent(url.pathname)}`, {
    maxBytes,
    requireRuntime: true,
  });
}

test('every Aries enemy appears in the Chapter 2 campaign and has Lite and High GLBs', () => {
  const chapter = CHAPTERS.find(({id}) => id === 2);
  assert.ok(chapter);
  const ids = new Set(chapter.stages.flatMap(({waves}) => waves.flatMap(({enemies}) =>
    enemies.map(({kind}) => resolveCampaignRosterAssetId({ chapterId: 2, enemyKind: kind }))
  )));
  assert.deepEqual(ids, new Set(CHAPTER2_ROSTER_ASSET_IDS));
  assert.equal(resolveCampaignRosterAssetId({
    chapterId: 2, enemyKind: EnemyKind.ZODIAC_BOSS, isSideModeActive: true,
  }), null);
  for (const id of CHAPTER2_ROSTER_ASSET_IDS) {
    verifyRuntimeFile(getChapter1RosterAssetUrl(id, 'lite'), 1_000_000);
    verifyRuntimeFile(getChapter1RosterAssetUrl(id, 'high'), 2_500_000);
  }
  verifyRuntimeFile(getChapter2MapHighAssetUrl(), 3_000_000);
});

test('Aries collection is awarded once, persists equipment and resolves all GLBs', () => {
  const initial = createInitialSaveData();
  assert.equal(grantChapter2Collection(initial), initial);
  const cleared = grantChapter2Collection({ ...initial, highestChapterCleared: 2 });
  assert.deepEqual(grantChapter2Collection(cleared), cleared);
  assert.ok(cleared.unlockedHeroes.includes('bellona'));
  assert.ok(cleared.unlockedSkins?.includes('golden_fleece'));
  const reloaded = migrateSaveData({
    ...cleared, selectedHeroId: 'bellona', equippedSkinByHero: {bellona: 'golden_fleece'},
    equippedPetId: 'pyro', equippedWingId: 'crimson_ram_wings', equippedMountId: 'vulcan',
    equippedArtifactId: 'war_horn', equippedHaloId: 'aries_vanguard',
    mountLevels: { ...cleared.mountLevels, vulcan: 4 },
  });
  assert.equal(reloaded.selectedHeroId, 'bellona');
  assert.equal(reloaded.equippedSkinByHero?.bellona, 'golden_fleece');
  assert.equal(reloaded.equippedPetId, 'pyro');
  assert.equal(reloaded.equippedWingId, 'crimson_ram_wings');
  assert.equal(reloaded.equippedMountId, 'vulcan');
  assert.equal(reloaded.mountLevels?.vulcan, 4);
  assert.equal(reloaded.equippedArtifactId, 'war_horn');
  assert.equal(reloaded.equippedHaloId, 'aries_vanguard');
  assert.equal(resolveSolarLeoHeroAssetId('bellona'), 'bellona');
  assert.equal(resolveSolarLeoHeroAssetId('bellona', 'golden_fleece'), 'golden_fleece');
  for (const id of ['bellona', 'golden_fleece', 'pyro', 'crimson_ram_wings', 'vulcan', 'war_horn', 'aries_vanguard'] as const) {
    verifyRuntimeFile(getSolarLeoAssetUrl(id, 'lite'), 1_000_000);
    verifyRuntimeFile(getSolarLeoAssetUrl(id, 'high'), 2_500_000);
  }
});

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { CHAPTER_EQUIPMENT_SETS } from '../data/chapterEquipmentSets';
import { CHAPTERS } from '../data/chaptersData';
import { canClaimChapter3Asset, grantChapter3Collection } from '../data/chapter3Collection';
import { migrateSaveData } from '../data/earlyProgressionData';
import { createInitialSaveData } from '../data/gearData';
import { EnemyKind } from '../types/game';
import {
  CHAPTER3_ROSTER_ASSET_IDS,
  getChapter1RosterAssetUrl,
  resolveCampaignRosterAssetId,
} from './chapter1RosterAssets';
import { getChapter3MapHighAssetUrl, getChapter3MapLiteAssetUrl } from './chapter3Map';
import {
  CHAPTER3_SOLAR_LEO_ASSET_IDS,
  getSolarLeoAssetUrl,
  resolveSolarLeoHeroAssetId,
  SOLAR_LEO_SPECS,
} from './solarLeoAssets';
import { assertValidGlbAssetOrManifest } from './testGlbManifestHelper';

function verifyRuntimeFile(url: URL, maxBytes: number): void {
  assertValidGlbAssetOrManifest(`public${decodeURIComponent(url.pathname)}`, {
    maxBytes,
    requireRuntime: true,
  });
}

test('every Taurus enemy appears in the Chapter 3 campaign and has Lite + High GLBs + WebP portrait', () => {
  const chapter = CHAPTERS.find(({ id }) => id === 3);
  assert.ok(chapter);
  const ids = new Set(
    chapter.stages.flatMap(({ waves }) =>
      waves.flatMap(({ enemies }) =>
        enemies.map(({ kind }) => resolveCampaignRosterAssetId({ chapterId: 3, enemyKind: kind }))
      )
    )
  );
  assert.deepEqual(ids, new Set(CHAPTER3_ROSTER_ASSET_IDS));
  assert.equal(
    resolveCampaignRosterAssetId({
      chapterId: 3,
      enemyKind: EnemyKind.ZODIAC_BOSS,
      isSideModeActive: true,
    }),
    null
  );

  for (const id of CHAPTER3_ROSTER_ASSET_IDS) {
    verifyRuntimeFile(getChapter1RosterAssetUrl(id, 'lite'), 1_000_000);
    verifyRuntimeFile(getChapter1RosterAssetUrl(id, 'high'), 2_600_000);
    assert.ok(
      existsSync(`public/assets/Chương 3/Runtime/${id}.webp`),
      `Missing 2D WebP portrait for Chapter 3 enemy ${id}`
    );
  }
  verifyRuntimeFile(getChapter3MapLiteAssetUrl(), 2_200_000);
  verifyRuntimeFile(getChapter3MapHighAssetUrl(), 4_000_000);
});

test('Taurus collection is locked until clearing Chapter 3, awarded once, persists equipment, and resolves all GLBs + portraits', () => {
  const initial = createInitialSaveData();
  assert.equal(canClaimChapter3Asset('sylvia', 2), false);
  assert.equal(canClaimChapter3Asset('jade_bull', 2), false);
  assert.equal(canClaimChapter3Asset('sylvia', 3), true);
  assert.equal(grantChapter3Collection(initial), initial);

  const cleared = grantChapter3Collection({ ...initial, highestChapterCleared: 3 });
  assert.deepEqual(grantChapter3Collection(cleared), cleared);
  assert.ok(cleared.unlockedHeroes.includes('sylvia'));
  assert.ok(cleared.unlockedSkins?.includes('venus_incarnate'));
  assert.ok(cleared.pets?.some((p) => p.petId === 'jade_calf'));
  assert.ok(cleared.unlockedWings?.includes('emerald_taurus_wings'));
  assert.ok(cleared.unlockedMounts?.includes('jade_bull'));
  assert.ok(cleared.unlockedArtifacts?.includes('jade_heart_relic'));
  assert.ok(cleared.unlockedHalos?.includes('emerald_taurus_halo'));

  const reloaded = migrateSaveData({
    ...cleared,
    selectedHeroId: 'sylvia',
    equippedSkinByHero: { sylvia: 'venus_incarnate' },
    equippedPetId: 'jade_calf',
    equippedWingId: 'emerald_taurus_wings',
    equippedMountId: 'jade_bull',
    equippedArtifactId: 'jade_heart_relic',
    equippedHaloId: 'emerald_taurus_halo',
    mountLevels: { ...cleared.mountLevels, jade_bull: 5 },
  });
  assert.equal(reloaded.selectedHeroId, 'sylvia');
  assert.equal(reloaded.equippedSkinByHero?.sylvia, 'venus_incarnate');
  assert.equal(reloaded.equippedPetId, 'jade_calf');
  assert.equal(reloaded.equippedWingId, 'emerald_taurus_wings');
  assert.equal(reloaded.equippedMountId, 'jade_bull');
  assert.equal(reloaded.mountLevels?.jade_bull, 5);
  assert.equal(reloaded.equippedArtifactId, 'jade_heart_relic');
  assert.equal(reloaded.equippedHaloId, 'emerald_taurus_halo');

  assert.equal(resolveSolarLeoHeroAssetId('sylvia'), 'sylvia');
  assert.equal(resolveSolarLeoHeroAssetId('sylvia', 'venus_incarnate'), 'venus_incarnate');
  assert.equal(SOLAR_LEO_SPECS.jade_bull.facingYawOffset, Math.PI / 2);

  const ch3Set = CHAPTER_EQUIPMENT_SETS.find((s) => s.chapterId === 3);
  assert.ok(ch3Set, 'Chapter 3 equipment preset should be registered');
  assert.equal(ch3Set.equipment.selectedHeroId, 'sylvia');
  assert.equal(ch3Set.equipment.equippedMountId, 'jade_bull');

  for (const id of CHAPTER3_SOLAR_LEO_ASSET_IDS) {
    verifyRuntimeFile(getSolarLeoAssetUrl(id, 'lite'), 1_000_000);
    verifyRuntimeFile(getSolarLeoAssetUrl(id, 'high'), 2_600_000);
    const thumbPath = `public/${SOLAR_LEO_SPECS[id].thumbnailPathSegments.join('/')}`;
    assert.ok(existsSync(thumbPath), `Missing 2D WebP portrait at ${thumbPath}`);
  }
});

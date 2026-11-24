import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { CHAPTER_EQUIPMENT_SETS } from '../data/chapterEquipmentSets';
import { CHAPTERS } from '../data/chaptersData';
import { canClaimChapter4Asset, grantChapter4Collection } from '../data/chapter4Collection';
import { migrateSaveData } from '../data/earlyProgressionData';
import { createInitialSaveData } from '../data/gearData';
import { EnemyKind } from '../types/game';
import {
  CHAPTER4_ROSTER_ASSET_IDS,
  getCampaignRosterSpec,
  getChapter1RosterAssetUrl,
  resolveCampaignRosterAssetId,
  resolveCampaignRosterVisualTheme,
} from './chapter1RosterAssets';
import { getChapter4MapHighAssetUrl, getChapter4MapLiteAssetUrl } from './chapter4Map';
import {
  CHAPTER4_SOLAR_LEO_ASSET_IDS,
  getSolarLeoAssetUrl,
  resolveSolarLeoHeroAssetId,
  SOLAR_LEO_SPECS,
} from './solarLeoAssets';

function verifyRuntimeFile(url: URL, maxBytes: number): void {
  const file = readFileSync(`public${decodeURIComponent(url.pathname)}`);
  assert.ok(
    file.length <= maxBytes,
    `${url.pathname} (${file.length} B) exceeds runtime budget ${maxBytes} B`
  );
  assert.equal(file.readUInt32LE(0), 0x46546c67);
  assert.equal(file.readUInt32LE(4), 2);
  assert.equal(file.readUInt32LE(8), file.length);
}

test('every Gemini enemy appears in the Chapter 4 campaign and has Lite + High GLBs + WebP portrait', () => {
  const chapter = CHAPTERS.find(({ id }) => id === 4);
  assert.ok(chapter);
  assert.equal(chapter.bossName, 'Thần Vương Song Tử');
  const ids = new Set(
    chapter.stages.flatMap(({ waves }) =>
      waves.flatMap(({ enemies }) =>
        enemies.map(({ kind }) => resolveCampaignRosterAssetId({ chapterId: 4, enemyKind: kind }))
      )
    )
  );
  assert.deepEqual(ids, new Set(CHAPTER4_ROSTER_ASSET_IDS));
  assert.equal(
    resolveCampaignRosterAssetId({
      chapterId: 4,
      enemyKind: EnemyKind.ZODIAC_BOSS,
      isSideModeActive: true,
    }),
    null
  );
  assert.equal(getCampaignRosterSpec('linh-mieu-ung-gio').facingYawOffset, -Math.PI / 2);
  assert.equal(resolveCampaignRosterVisualTheme('than-vuong-song-tu').chapterId, 4);

  for (const id of CHAPTER4_ROSTER_ASSET_IDS) {
    verifyRuntimeFile(getChapter1RosterAssetUrl(id, 'lite'), 1_000_000);
    verifyRuntimeFile(getChapter1RosterAssetUrl(id, 'high'), 2_600_000);
    assert.ok(
      existsSync(`public/assets/Chương 4/Runtime/${id}.webp`),
      `Missing 2D WebP portrait for Chapter 4 enemy ${id}`
    );
  }
  verifyRuntimeFile(getChapter4MapLiteAssetUrl(), 2_200_000);
  verifyRuntimeFile(getChapter4MapHighAssetUrl(), 4_000_000);
});

test('Gemini collection is locked until clearing Chapter 4, awarded once, persists equipment, and resolves all GLBs + portraits', () => {
  const initial = createInitialSaveData();
  assert.equal(canClaimChapter4Asset('celeste', 3), false);
  assert.equal(canClaimChapter4Asset('celestial_wind_mount', 3), false);
  assert.equal(canClaimChapter4Asset('celeste', 4), true);
  assert.equal(grantChapter4Collection(initial), initial);

  const cleared = grantChapter4Collection({ ...initial, highestChapterCleared: 4 });
  assert.deepEqual(grantChapter4Collection(cleared), cleared);
  assert.ok(cleared.unlockedHeroes.includes('celeste'));
  assert.ok(cleared.unlockedSkins?.includes('astral_mirror_queen'));
  assert.ok(cleared.pets?.some((p) => p.petId === 'twin_astral_spirits'));
  assert.ok(cleared.unlockedWings?.includes('dual_gemini_wings'));
  assert.ok(cleared.unlockedMounts?.includes('celestial_wind_mount'));
  assert.ok(cleared.unlockedArtifacts?.includes('twin_hourglass_relic'));
  assert.ok(cleared.unlockedHalos?.includes('gemini_halo'));

  const reloaded = migrateSaveData({
    ...cleared,
    selectedHeroId: 'celeste',
    equippedSkinByHero: { celeste: 'astral_mirror_queen' },
    equippedPetId: 'twin_astral_spirits',
    equippedWingId: 'dual_gemini_wings',
    equippedMountId: 'celestial_wind_mount',
    equippedArtifactId: 'twin_hourglass_relic',
    equippedHaloId: 'gemini_halo',
    mountLevels: { ...cleared.mountLevels, celestial_wind_mount: 5 },
  });
  assert.equal(reloaded.selectedHeroId, 'celeste');
  assert.equal(reloaded.equippedSkinByHero?.celeste, 'astral_mirror_queen');
  assert.equal(reloaded.equippedPetId, 'twin_astral_spirits');
  assert.equal(reloaded.equippedWingId, 'dual_gemini_wings');
  assert.equal(reloaded.equippedMountId, 'celestial_wind_mount');
  assert.equal(reloaded.mountLevels?.celestial_wind_mount, 5);
  assert.equal(reloaded.equippedArtifactId, 'twin_hourglass_relic');
  assert.equal(reloaded.equippedHaloId, 'gemini_halo');

  assert.equal(resolveSolarLeoHeroAssetId('celeste'), 'celeste');
  assert.equal(resolveSolarLeoHeroAssetId('celeste', 'astral_mirror_queen'), 'astral_mirror_queen');
  assert.equal(SOLAR_LEO_SPECS.celestial_wind_mount.facingYawOffset, -Math.PI / 2);

  const ch4Set = CHAPTER_EQUIPMENT_SETS.find((s) => s.chapterId === 4);
  assert.ok(ch4Set, 'Chapter 4 equipment preset should be registered');
  assert.equal(ch4Set.equipment.selectedHeroId, 'celeste');
  assert.equal(ch4Set.equipment.equippedMountId, 'celestial_wind_mount');

  for (const id of CHAPTER4_SOLAR_LEO_ASSET_IDS) {
    verifyRuntimeFile(getSolarLeoAssetUrl(id, 'lite'), 1_000_000);
    verifyRuntimeFile(getSolarLeoAssetUrl(id, 'high'), 2_600_000);
    const thumbPath = `public/${SOLAR_LEO_SPECS[id].thumbnailPathSegments.join('/')}`;
    assert.ok(existsSync(thumbPath), `Missing 2D WebP portrait at ${thumbPath}`);
  }
});

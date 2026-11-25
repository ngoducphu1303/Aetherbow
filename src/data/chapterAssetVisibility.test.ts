import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getChapterAssetLockState,
  getChapterAssetRequiredChapter,
  sortCollectionByChapterOrder,
} from './chapterAssetVisibility';
import { PETS_CATALOG } from './wave3Data';
import { ZODIAC_WINGS } from './wave7Data';
import { ZODIAC_MOUNTS } from './wave8Data';
import { MYTHIC_ARTIFACTS } from './wave9Data';
import { DIVINE_HALO_CATALOG } from './wave10Data';

const CHAPTER_1_IDS = [
  'astraeo',
  'solar_zenith',
  'solarius',
  'astrolabe_regulus',
  'leo_sovereign',
];

const CHAPTER_2_IDS = [
  'bellona',
  'golden_fleece',
  'pyro',
  'vulcan',
  'crimson_ram_wings',
  'war_horn',
  'aries_vanguard',
];

const CHAPTER_3_IDS = [
  'sylvia',
  'venus_incarnate',
  'jade_calf',
  'jade_bull',
  'emerald_taurus_wings',
  'jade_heart_relic',
  'emerald_taurus_halo',
];

const CHAPTER_4_IDS = [
  'celeste',
  'astral_mirror_queen',
  'twin_astral_spirits',
  'celestial_wind_mount',
  'dual_gemini_wings',
  'twin_hourglass_relic',
  'gemini_halo',
];

test('chapterAssetVisibility identifies exact chapter gate for all Ch.2, Ch.3, and Ch.4 assets', () => {
  for (const id of CHAPTER_2_IDS) {
    assert.equal(getChapterAssetRequiredChapter(id), 2, `${id} should require Chapter 2`);
    assert.equal(getChapterAssetLockState(id, 0).isChapterLocked, true);
    assert.equal(getChapterAssetLockState(id, 1).isChapterLocked, true);
    assert.equal(getChapterAssetLockState(id, 1).lockLabel, 'Vượt Chương 2 để mở');
    assert.equal(getChapterAssetLockState(id, 2).isChapterLocked, false);
    assert.equal(getChapterAssetLockState(id, 2).lockLabel, null);
  }

  for (const id of CHAPTER_3_IDS) {
    assert.equal(getChapterAssetRequiredChapter(id), 3, `${id} should require Chapter 3`);
    assert.equal(getChapterAssetLockState(id, 2).isChapterLocked, true);
    assert.equal(getChapterAssetLockState(id, 2).lockLabel, 'Vượt Chương 3 để mở');
    assert.equal(getChapterAssetLockState(id, 3).isChapterLocked, false);
  }

  for (const id of CHAPTER_4_IDS) {
    assert.equal(getChapterAssetRequiredChapter(id), 4, `${id} should require Chapter 4`);
    assert.equal(getChapterAssetLockState(id, 3).isChapterLocked, true);
    assert.equal(getChapterAssetLockState(id, 3).lockLabel, 'Vượt Chương 4 để mở');
    assert.equal(getChapterAssetLockState(id, 4).isChapterLocked, false);
  }
});

test('chapterAssetVisibility leaves Chapter 1 starter items unlocked at highestChapterCleared = 0', () => {
  for (const id of CHAPTER_1_IDS) {
    assert.equal(getChapterAssetRequiredChapter(id), null, `${id} should have no chapter gate`);
    const lock = getChapterAssetLockState(id, 0);
    assert.equal(lock.isChapterLocked, false);
    assert.equal(lock.lockLabel, null);
    assert.equal(lock.shortLockLabel, null);
  }
});

test('all 5 collection catalogs expose full multi-chapter roster and sort naturally Ch.1 -> Ch.4', () => {
  const catalogs: Array<{ name: string; items: readonly { id: string }[] }> = [
    { name: 'PETS_CATALOG', items: PETS_CATALOG },
    { name: 'ZODIAC_WINGS', items: ZODIAC_WINGS },
    { name: 'ZODIAC_MOUNTS', items: ZODIAC_MOUNTS },
    { name: 'MYTHIC_ARTIFACTS', items: MYTHIC_ARTIFACTS },
    { name: 'DIVINE_HALO_CATALOG', items: DIVINE_HALO_CATALOG },
  ];

  for (const cat of catalogs) {
    assert.ok(cat.items.length >= 4, `${cat.name} should have at least 4 entries`);
    const sorted = sortCollectionByChapterOrder(cat.items);
    const chapters = sorted.map((item) => getChapterAssetRequiredChapter(item.id) ?? 1);
    assert.deepEqual(
      chapters.slice(0, 4),
      [1, 2, 3, 4],
      `${cat.name} should sort Ch.1 -> Ch.2 -> Ch.3 -> Ch.4`
    );
  }
});

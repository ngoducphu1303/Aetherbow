import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { CHAPTERS } from './chaptersData';
import { HEROES } from './heroesData';
import { ENEMY_CODEX_LIST } from './liveOpsData';
import { HERO_SKINS } from './wave3Data';
import { getCurrentWeeklyBossSchedule } from './weeklyBossData';
import {
  WEEKLY_BOSS_CATALOG,
  WEEKLY_BOSS_ID_ASSETS,
  getBossAssetPack,
  getEnemyAssetPack,
  getHeroAssetPack,
  getSkinAssetPack,
} from './assetRegistry';

const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

function assertAssetFileExists(publicPath: string, contextLabel: string) {
  assert.ok(
    publicPath.startsWith('/assets/apiaetherbow/'),
    `${contextLabel}: expected /assets/apiaetherbow/... path, got "${publicPath}"`
  );
  const absPath = path.join(PUBLIC_DIR, publicPath.replace(/^\/+/, ''));
  assert.ok(
    fs.existsSync(absPath),
    `${contextLabel}: asset file missing on disk at ${absPath}`
  );
  const stats = fs.statSync(absPath);
  assert.ok(
    stats.size > 0,
    `${contextLabel}: asset file is empty at ${absPath}`
  );
}

test('Hero roster contains only Alice and Hatsune Miku with valid non-empty assets', () => {
  assert.deepEqual(
    HEROES.map((h) => h.id),
    ['artemis', 'hatsune_miku'],
    'Expected strictly Alice (artemis) and Hatsune Miku (hatsune_miku)'
  );
  for (const hero of HEROES) {
    const pack = getHeroAssetPack(hero.id);
    assertAssetFileExists(pack.icon, `Hero ${hero.id} icon`);
    assertAssetFileExists(pack.portrait, `Hero ${hero.id} portrait`);
    assertAssetFileExists(pack.skill, `Hero ${hero.id} skill`);
    assertAssetFileExists(pack.burst, `Hero ${hero.id} burst`);
  }
});

test('HERO_SKINS is completely cleared while getSkinAssetPack falls back safely to hero assets', () => {
  assert.equal(HERO_SKINS.length, 0, 'Expected zero hero skins');
  const fallbackAlice = getSkinAssetPack('default', 'artemis');
  const fallbackMiku = getSkinAssetPack('default', 'hatsune_miku');
  assertAssetFileExists(fallbackAlice.portrait, 'Alice fallback skin portrait');
  assertAssetFileExists(fallbackMiku.portrait, 'Hatsune Miku fallback skin portrait');
});

test('Every EnemyKind in ENEMY_CODEX_LIST resolves to existing non-empty icon and portrait assets', () => {
  assert.ok(ENEMY_CODEX_LIST.length >= 9, 'Expected all codex enemy kinds');
  for (const enemy of ENEMY_CODEX_LIST) {
    const pack = getEnemyAssetPack(enemy.kind);
    assertAssetFileExists(pack.icon, `Enemy ${enemy.kind} icon`);
    assertAssetFileExists(pack.portrait, `Enemy ${enemy.kind} portrait`);
  }
});

test('All 12 Chapter Bosses and all Weekly Bosses resolve to existing non-empty assets', () => {
  assert.equal(CHAPTERS.length, 12, 'Expected 12 zodiac chapters');
  for (const chapter of CHAPTERS) {
    const pack = getBossAssetPack({
      chapterId: chapter.id,
      bossName: chapter.bossName,
    });
    assertAssetFileExists(pack.icon, `Chapter ${chapter.id} boss icon`);
    assertAssetFileExists(pack.portrait, `Chapter ${chapter.id} boss portrait`);
  }

  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const baseMs = Date.UTC(2025, 0, 6, 0, 0, 0);
  const seenWeeklyIds = new Set<string>();
  for (let w = 0; w < 4; w++) {
    const schedule = getCurrentWeeklyBossSchedule(baseMs + w * WEEK_MS);
    seenWeeklyIds.add(schedule.bossId);
    const pack = getBossAssetPack({
      weeklyBossId: schedule.bossId,
      bossName: schedule.bossName,
    });
    assertAssetFileExists(pack.icon, `Weekly boss ${schedule.bossId} icon`);
    assertAssetFileExists(pack.portrait, `Weekly boss ${schedule.bossId} portrait`);
  }
  assert.equal(seenWeeklyIds.size, 4, 'Expected 4 distinct weekly boss rotations');

  for (const [bossKey, pack] of Object.entries(WEEKLY_BOSS_CATALOG)) {
    assertAssetFileExists(pack.icon, `Catalog boss ${bossKey} icon`);
    assertAssetFileExists(pack.portrait, `Catalog boss ${bossKey} portrait`);
  }

  for (const [weeklyId, pack] of Object.entries(WEEKLY_BOSS_ID_ASSETS)) {
    assertAssetFileExists(pack.icon, `Weekly ID ${weeklyId} icon`);
    assertAssetFileExists(pack.portrait, `Weekly ID ${weeklyId} portrait`);
  }
});

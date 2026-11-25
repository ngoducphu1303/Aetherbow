import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialSaveData } from './gearData';
import { validateAndSanitizeSaveIntegrity } from './saveIntegrity';

test('SaveIntegrity: preserves clean player save with zero false-positive anomalies', () => {
  const clean = createInitialSaveData();
  const report = validateAndSanitizeSaveIntegrity(clean);
  assert.equal(report.hadAnomalies, false);
  assert.deepEqual(report.issuesFixed, []);
  assert.equal(report.sanitizedSave.selectedHeroId, 'aurelia');
});

test('SaveIntegrity: clamps tampered currency, gear level/awakening, heroStars, pity, and dedupes mail/inventory', () => {
  const base = createInitialSaveData();
  const tampered = {
    ...base,
    gold: -500,
    gems: 999_999_999,
    highestChapterCleared: 99,
    starDust: -20,
    paragonInfusionLevel: 9999,
    unlockedHeroes: [],
    heroStars: { aurelia: 99, bellona: -3 },
    pity: { ...(base.pity ?? {}), mythicPulls: -10, sTierPulls: 9999 },
    claimedMailIds: ['m1', 'm1', '', 'm2'],
    deletedMailIds: ['d1', 'd1'],
    inventory: [
      { ...base.inventory[0], level: 999, awakeningLevel: 42 },
      { ...base.inventory[0], level: 5 }, // duplicate uid
    ],
  } as unknown as typeof base;

  const report = validateAndSanitizeSaveIntegrity(tampered);
  assert.equal(report.hadAnomalies, true);
  assert.equal(report.sanitizedSave.gold, 0);
  assert.equal(report.sanitizedSave.gems, 99_999_999);
  assert.equal(report.sanitizedSave.highestChapterCleared, 12);
  assert.equal(report.sanitizedSave.starDust, 0);
  assert.equal(report.sanitizedSave.paragonInfusionLevel, 500);
  assert.deepEqual(report.sanitizedSave.unlockedHeroes, ['aurelia']);
  assert.equal(report.sanitizedSave.selectedHeroId, 'aurelia');
  assert.equal(report.sanitizedSave.heroStars.aurelia, 10);
  assert.equal(report.sanitizedSave.heroStars.bellona, 0);
  assert.equal(report.sanitizedSave.inventory.length, 1);
  assert.equal(report.sanitizedSave.inventory[0].level, 120);
  assert.equal(report.sanitizedSave.inventory[0].awakeningLevel, 10);
  assert.deepEqual(report.sanitizedSave.claimedMailIds, ['m1', 'm2']);
  assert.deepEqual(report.sanitizedSave.deletedMailIds, ['d1']);
});

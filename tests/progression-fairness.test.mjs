import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSaveData } from '../src/data/gearData.ts';
import { EARLY_FORGE_COSTS, migrateSaveData } from '../src/data/earlyProgressionData.ts';
import {
  computeNextUpgradeRecommendation,
  simulateSeededF2pProgression,
} from '../src/data/progressionAdvisor.ts';

test('Fair Progression F2P: seeded runs achieve first Rare in runs 1–3 and first Epic in runs 2–6', () => {
  const seeds = ['f2p-alpha-01', 'f2p-beta-42', 'f2p-gamma-99'];
  for (const seed of seeds) {
    const result = simulateSeededF2pProgression({ seed, worstCaseRng: false });
    assert.ok(
      result.firstRareRun !== null && result.firstRareRun >= 1 && result.firstRareRun <= 3,
      `Seed ${seed}: expected first Rare in runs 1-3, got ${result.firstRareRun}`
    );
    assert.ok(
      result.firstEpicRun !== null && result.firstEpicRun >= 2 && result.firstEpicRun <= 6,
      `Seed ${seed}: expected first Epic in runs 2-6, got ${result.firstEpicRun}`
    );
  }
});

test('Fair Progression F2P Worst-Case RNG: milestones & forge guarantee Rare in runs 1–3 and Epic in runs 2–6 even with 0 lucky drops', () => {
  const result = simulateSeededF2pProgression({
    seed: 'unlucky-streak-000',
    worstCaseRng: true,
  });

  assert.ok(
    result.firstRareRun !== null && result.firstRareRun >= 1 && result.firstRareRun <= 3,
    `Worst-case RNG must still yield Rare in runs 1-3 via milestone/forge, got ${result.firstRareRun}`
  );
  assert.ok(
    result.firstEpicRun !== null && result.firstEpicRun >= 2 && result.firstEpicRun <= 6,
    `Worst-case RNG must still yield Epic in runs 2-6 via milestone/forge, got ${result.firstEpicRun}`
  );
  assert.ok(result.runSnapshots.length >= 6);
});

test('Progression Advisor: always tells player what to upgrade, what is missing, and where to farm', () => {
  const fresh = createInitialSaveData();
  const guide1 = computeNextUpgradeRecommendation(fresh);
  assert.ok(guide1.title.length > 0);
  assert.ok(guide1.targetItemName.length > 0);
  assert.ok(guide1.whatToUpgrade.length > 0);
  assert.ok(guide1.missingText.length > 0);
  assert.ok(guide1.farmWhereText.length > 0);
  assert.ok(guide1.actionLabel.length > 0);

  // When all mail is claimed and player has enough gold to upgrade weapon, advisor surfaces weapon upgrade immediately
  const noMailSave = {
    ...fresh,
    mailInbox: (fresh.mailInbox ?? []).map((m) => ({ ...m, claimed: true })),
    gold: 5000,
  };
  const guide2 = computeNextUpgradeRecommendation(noMailSave);
  assert.equal(guide2.canActNow, true);
  assert.equal(guide2.actionTarget, 'gear');
  assert.match(guide2.title, /Cường hóa/i);

  // When player beat Ares (stage 4 Ch.1) and has enough Rare Shards, advisor highlights forge craft immediately
  const craftReady = {
    ...noMailSave,
    gold: 20,
    bestStagePerChapter: { ...noMailSave.bestStagePerChapter, 1: 5 },
    earlyForgeProgress: {
      rareShards: EARLY_FORGE_COSTS.rareShards,
      epicShards: 0,
      sShards: 0,
      claimedMilestones: [],
      craftedTargets: [],
    },
  };
  const guide3 = computeNextUpgradeRecommendation(craftReady);
  assert.equal(guide3.canActNow, true);
  assert.equal(guide3.actionTarget, 'forge');
});

test('Save Migration: preserves valid unlocked selectedHeroId across version updates', () => {
  const base = createInitialSaveData();
  const legacyThorSave = {
    ...base,
    saveSchemaVersion: 1,
    unlockedHeroes: ['artemis', 'thor'],
    selectedHeroId: 'thor',
  };

  const migratedThor = migrateSaveData(legacyThorSave);
  assert.equal(
    migratedThor.selectedHeroId,
    'thor',
    'Valid unlocked hero selection from old save must NOT be reset to artemis'
  );

  // Invalid / locked hero id should safely fall back to artemis
  const corruptedHeroSave = {
    ...base,
    saveSchemaVersion: 1,
    unlockedHeroes: ['artemis'],
    selectedHeroId: 'nonexistent_hero_xyz',
  };
  const migratedFallback = migrateSaveData(corruptedHeroSave);
  assert.equal(migratedFallback.selectedHeroId, 'artemis');
});

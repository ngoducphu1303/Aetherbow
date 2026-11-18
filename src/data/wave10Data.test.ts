import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialSaveData, computePlayerStats } from './gearData';
import {
  DIVINE_HALO_MAX_LEVEL,
  GEM_VAULT_CAPACITY,
  canClaimCurrentChainStep,
  countClaimablePantheonMilestones,
  countClaimableVaultRewards,
  depositToGemRebateVault,
  getDivineHaloStats,
  getDivineHaloUpgradeCost,
  hasFreeChainStepReady,
  normalizeGemRebateVault,
  normalizePantheonExpedition,
  normalizeStepUpChain,
} from './wave10Data';

test('3D Divine Halo stats scale monotonically with level and clamp to max level', () => {
  const noneStats = getDivineHaloStats(null, 5);
  assert.equal(noneStats.atkPct, 0);
  assert.equal(noneStats.critDmg, 0);

  const lv1 = getDivineHaloStats('solar_crown', 1);
  const lv5 = getDivineHaloStats('solar_crown', 5);
  const lvMax = getDivineHaloStats('solar_crown', DIVINE_HALO_MAX_LEVEL);
  const lvOver = getDivineHaloStats('solar_crown', 99);

  assert.ok(lv1.atkPct > 0);
  assert.ok(lv5.atkPct > lv1.atkPct);
  assert.ok(lv5.critDmg > lv1.critDmg);
  assert.deepEqual(lvMax, lvOver);

  const cost1 = getDivineHaloUpgradeCost(1);
  const cost3 = getDivineHaloUpgradeCost(3);
  assert.ok(cost3.gold > cost1.gold);
  assert.ok(cost3.divineCrystals > cost1.divineCrystals);
});

test('Step-Up Commercial Chain Relay identifies free step 1 and validates gem requirements on step 2', () => {
  const save = createInitialSaveData();
  // Step 1 is free (0 gems) by default
  assert.equal(hasFreeChainStepReady(save), true);
  assert.equal(canClaimCurrentChainStep(save), true);

  // Move to Step 2 (costs 48 gems)
  save.stepUpChain = normalizeStepUpChain({
    currentStep: 2,
    claimedSteps: [1],
    cycleCount: 0,
  });
  save.gems = 20;
  assert.equal(hasFreeChainStepReady(save), false);
  assert.equal(canClaimCurrentChainStep(save), false);

  save.gems = 60;
  assert.equal(canClaimCurrentChainStep(save), true);
});

test('Astral Gem Rebate Vault deposits clamp at capacity and track milestone dividends', () => {
  const save = createInitialSaveData();
  let vault = normalizeGemRebateVault(save.gemRebateVault);
  assert.equal(vault.storedGems, 28);

  vault = depositToGemRebateVault(vault, 40);
  assert.equal(vault.storedGems, 68);
  assert.equal(vault.totalDepositedEver, 68);

  save.gemRebateVault = vault;
  // At 68 stored gems (>= 60 threshold and >= 60 milestone 1), 2 actions are claimable
  assert.equal(countClaimableVaultRewards(save), 2);

  const capped = depositToGemRebateVault(vault, 999);
  assert.equal(capped.storedGems, GEM_VAULT_CAPACITY);
  assert.ok(capped.totalDepositedEver > GEM_VAULT_CAPACITY);
});

test('Celestial Pantheon Boss Expedition normalizes blessings and counts claimable milestones', () => {
  const save = createInitialSaveData();
  const pantheon = normalizePantheonExpedition({
    date: save.dailyRift?.date,
    dailyRunsRemaining: 2,
    selectedBlessingId: 'blessing_wrath',
    bestDeityStage: 2,
    bestScore: 2800,
    totalClears: 1,
    claimedMilestones: [1200],
  });

  save.pantheonExpedition = pantheon;
  assert.equal(pantheon.selectedBlessingId, 'blessing_wrath');
  // Score 2800 qualifies for 1200 (already claimed) and 2600 (unclaimed) -> 1 claimable
  assert.equal(countClaimablePantheonMilestones(save), 1);
});

test('Equipping a 3D Divine Halo increases player attack, maxHp, critDamage, and powerRating', () => {
  const save = createInitialSaveData();
  const baseStats = computePlayerStats(save);

  save.unlockedHalos = ['seraphim_glory'];
  save.haloLevels = { seraphim_glory: 3 };
  save.equippedHaloId = 'seraphim_glory';

  const haloStats = computePlayerStats(save);
  assert.ok(haloStats.attack > baseStats.attack);
  assert.ok(haloStats.maxHp > baseStats.maxHp);
  assert.ok(haloStats.critDamage > baseStats.critDamage);
  assert.ok(haloStats.powerRating > baseStats.powerRating);
  assert.equal(haloStats.equippedHaloId, 'seraphim_glory');
  assert.equal(haloStats.haloLevel, 3);
});

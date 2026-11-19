import assert from 'node:assert/strict';
import test from 'node:test';
import { computePlayerStats, createInitialSaveData } from './gearData';
import {
  CRYSTAL_VAULT_MILESTONES,
  MAX_DAILY_CRYSTAL_VAULT_RUNS,
  TREASURE_WHEEL_PITY_MAX,
  analyzeCombatPower,
  canClaimSupremeMonthlyDaily,
  computeAltarBonuses,
  countClaimableCrystalVaultMilestones,
  getComboTierMeta,
  getMythicWeaponBonuses,
  getReforgeCost,
  getWarBannerStats,
  normalizeCrystalVault,
  normalizeMythicWeapon,
  normalizeTreasureWheel,
  previewLobbyClaimAll,
  rollGoldenStats,
  spinTreasureWheelOnce,
} from './wave12Data';

test('Mythic Weapon transcendence & Golden Stat reforge preserve locked slots and scale costs', () => {
  const base = normalizeMythicWeapon({ tier: 3 });
  assert.equal(base.goldenStats.length, 3);
  assert.deepEqual(getReforgeCost(0), { reforgeStones: 3, gold: 160 });
  assert.deepEqual(getReforgeCost(1), { reforgeStones: 6, gold: 300 });
  assert.deepEqual(getReforgeCost(2), { reforgeStones: 9, gold: 440 });

  const lockedSlots = base.goldenStats.map((s, idx) =>
    idx === 0 ? { ...s, locked: true, kind: 'atk_pct' as const, value: 0.15, tier: 'mythic' as const } : s
  );
  const { nextSlots } = rollGoldenStats(lockedSlots, 4, () => 0.95);
  assert.equal(nextSlots[0].locked, true);
  assert.equal(nextSlots[0].value, 0.15);
  assert.equal(nextSlots[0].tier, 'mythic');
  assert.equal(nextSlots[1].locked, false);
  assert.equal(nextSlots[2].locked, false);

  const bonuses = getMythicWeaponBonuses({ tier: 5, goldenStats: nextSlots, totalReforges: 2 });
  assert.ok(bonuses.atkPct > 0.52);
  assert.ok(bonuses.critDmgBonus >= 0.75);
});

test('Treasure Wheel guarantees Mythic Jackpot on 10th pity spin and resets pity', () => {
  let state = normalizeTreasureWheel({ pityCount: TREASURE_WHEEL_PITY_MAX - 1, totalSpins: 9 });
  const res = spinTreasureWheelOnce(state, () => 0.5);
  assert.equal(res.wasPity, true);
  assert.equal(res.slot.rarity, 'mythic');
  assert.equal(res.slot.rewardKind, 'jackpot_mythic');
  assert.equal(res.nextState.pityCount, 0);
  assert.equal(res.nextState.totalSpins, 10);
});

test('computePlayerStats integrates Mythic Weapon, Blessing Altar, 3D War Banner, and Supreme Monthly Pass', () => {
  const baseSave = createInitialSaveData();
  const baseStats = computePlayerStats(baseSave);

  const boostedSave = {
    ...baseSave,
    mythicWeapon: normalizeMythicWeapon({ tier: 3 }),
    blessingAltar: {
      levels: { altar_fury: 5, altar_aegis: 5, altar_breaker: 5, altar_fortune: 5 },
      totalSacrifices: 20,
    },
    unlockedWarBanners: ['banner_phoenix' as const],
    warBannerLevels: { banner_phoenix: 3 },
    equippedWarBannerId: 'banner_phoenix' as const,
    supremeMonthly: {
      active: true,
      daysRemaining: 25,
      lastClaimDate: '',
      totalActivatedCount: 1,
    },
  };

  const boostedStats = computePlayerStats(boostedSave);
  assert.ok(boostedStats.attack > baseStats.attack);
  assert.ok(boostedStats.maxHp > baseStats.maxHp);
  assert.ok(boostedStats.powerRating > baseStats.powerRating);
  assert.equal(boostedStats.mythicWeaponTier, 3);
  assert.equal(boostedStats.equippedWarBannerId, 'banner_phoenix');
  assert.equal(boostedStats.altarTotalLevel, 20);
  assert.equal(canClaimSupremeMonthlyDaily(boostedSave), true);

  const altarBonuses = computeAltarBonuses(boostedSave.blessingAltar);
  assert.equal(altarBonuses.totalLevel, 20);
  const bannerStats = getWarBannerStats('banner_phoenix', 3);
  assert.ok(bannerStats.atkPct > 0.15);
});

test('Crystal Vault normalization grants bonus attempt for Supreme Monthly and tracks milestones', () => {
  const normal = normalizeCrystalVault(undefined, false);
  assert.equal(normal.dailyRunsRemaining, MAX_DAILY_CRYSTAL_VAULT_RUNS);

  const supreme = normalizeCrystalVault(undefined, true);
  assert.equal(supreme.dailyRunsRemaining, MAX_DAILY_CRYSTAL_VAULT_RUNS + 1);

  const save = createInitialSaveData();
  save.crystalVault = {
    ...normal,
    totalPillarsBroken: CRYSTAL_VAULT_MILESTONES[1].pillarsTarget,
    claimedMilestones: [CRYSTAL_VAULT_MILESTONES[0].pillarsTarget],
  };
  assert.equal(countClaimableCrystalVaultMilestones(save), 1);
});

test('Combat Power Breakdown identifies weakest category and Claim All aggregates multiple lobby reward sources', () => {
  const save = createInitialSaveData();
  save.supremeMonthly = {
    active: true,
    daysRemaining: 20,
    lastClaimDate: '',
    totalActivatedCount: 1,
  };
  save.crystalVault = {
    ...normalizeCrystalVault(save.crystalVault),
    totalPillarsBroken: 10,
    claimedMilestones: [],
  };
  const stats = computePlayerStats(save);
  const analysis = analyzeCombatPower(save, stats.powerRating);
  assert.equal(analysis.categories.length, 6);
  assert.ok(analysis.weakestCategory.score <= Math.min(...analysis.categories.map((c) => c.score)));

  const claimAll = previewLobbyClaimAll(save);
  assert.ok(claimAll.totalClaimableCount >= 2);
  assert.ok(claimAll.sources.some((s) => s.id === 'supreme_monthly'));
  assert.ok(claimAll.sources.some((s) => s.id === 'crystal_vault'));
});

test('Dynamic Combo Tiers escalate damage bonus cleanly at 10, 25, and 50 hits', () => {
  assert.equal(getComboTierMeta(5).dmgBonusPct, 0);
  assert.equal(getComboTierMeta(12).dmgBonusPct, 0.1);
  assert.equal(getComboTierMeta(28).dmgBonusPct, 0.18);
  assert.equal(getComboTierMeta(55).dmgBonusPct, 0.3);
});

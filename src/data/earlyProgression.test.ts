import assert from 'node:assert/strict';
import test from 'node:test';
import { CHAPTERS } from './chaptersData';
import {
  DEFAULT_LOADOUT_PRESET_SLOTS,
  EARLY_FORGE_COSTS,
  HERO_MASTERY_MAX_LEVEL,
  PROGRESSION_SCHEMA_VERSION,
  PUNISH_WINDOW_DAMAGE_BONUS,
  PUNISH_WINDOW_PHASE3_BONUS,
  RARITY_RANK,
  SYSTEM_MAIL_TEMPLATES,
  applyEarlyRunMilestones,
  applyLoadoutPreset,
  captureLoadoutPreset,
  claimMailsUnified,
  computeExpectedDps,
  computeHeroMasteryBonuses,
  computeRunMasteryExpGain,
  countUnclaimedEligibleMail,
  deleteClaimedMailsUnified,
  evaluatePlaytestKpis,
  getBossTelemetryKey,
  getEarlyProgressionPolicy,
  getEarlyRoadmapStatus,
  getEndlessTowerScaling,
  getNextTargetGoal,
  getSideModeScaling,
  getVisibleMailInbox,
  grantHeroMasteryExp,
  isEarlyFeatureUnlocked,
  migrateSaveData,
  normalizePlaytestMetrics,
  recordPlaytestMilestone,
  recordPlaytestRunEnd,
  recordPlaytestRunStart,
  resetPlaytestMetrics,
} from './earlyProgressionData';
import {
  GEAR_SET_DEFINITIONS,
  GEAR_TEMPLATES,
  computePlayerStats,
  craftEarlyTargetGear,
  createInitialSaveData,
  evaluateEquippedGearSets,
  getUpgradeCost,
  rollChestGearBatch,
  rollProgressionGatedGear,
} from './gearData';
import { HEROES } from './heroesData';
import {
  HERO_ACTIVE_SKILLS,
  NIGHTMARE_MAX_TIER,
  PERFECT_DODGE_DAMAGE_BONUS,
  PERFECT_DODGE_INTERNAL_CD,
  SAVE_CODE_PREFIX,
  buildBossCodexEntries,
  buildSynergyCodexEntries,
  computeTrainingDpsSnapshot,
  createTrainingDpsState,
  decodeSaveTransferCode,
  encodeSaveTransferCode,
  getHeroActiveSkill,
  getNightmareTierConfig,
  isNightmareUnlocked,
  recordTrainingHit,
  resolvePerfectDodgeTrigger,
} from './phase5Data';
import { CHECK_IN_REWARDS, DAILY_QUESTS } from './questsData';
import { rollRuneChestBatch } from './runesData';
import {
  SKILLS_CATALOG,
  SKILL_SYNERGIES,
  evaluateActiveSynergies,
  getSynergyHintsForSkill,
  rollSkillChoices,
} from './skillsData';
import { GearInstance, GearSlot, Rarity, SaveData } from '../types/game';

function createMulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

test('Mail Ledger: claim once, claim-all unified, delete claimed, and reload never duplicate or respawn mails', () => {
  const rng = createMulberry32(101);
  let save = createInitialSaveData();
  const roller = ({
    isPremium,
    minRarity,
    forceSTier,
    policy,
  }: {
    isPremium: boolean;
    minRarity?: Rarity;
    forceSTier?: boolean;
    policy: ReturnType<typeof getEarlyProgressionPolicy>;
  }) =>
    rollProgressionGatedGear(save, isPremium, minRarity, forceSTier, rng);

  // Fresh account only has mail_grand_launch eligible (mail_boss_rush_open requires St.4, mail_season1_celebration requires Ch.1)
  assert.equal(countUnclaimedEligibleMail(save), 1);

  // Claim single mail
  const firstClaim = claimMailsUnified(save, ['mail_grand_launch'], roller);
  assert.equal(firstClaim.claimedCount, 1);
  assert.equal(firstClaim.goldGained, 25);
  assert.equal(firstClaim.gemsGained, 10);
  assert.equal(firstClaim.gearsGained.length, 0);
  save = firstClaim.nextSave;

  // Trying to claim same mail again yields 0
  const dupClaim = claimMailsUnified(save, ['mail_grand_launch'], roller);
  assert.equal(dupClaim.claimedCount, 0);
  assert.equal(dupClaim.goldGained, 0);

  // Claim-all at St.0 yields 0 since remaining mails are progression-gated
  const claimAllEarly = claimMailsUnified(save, 'all', roller);
  assert.equal(claimAllEarly.claimedCount, 0);
  assert.equal(countUnclaimedEligibleMail(save), 0);

  // Delete claimed mail
  save = deleteClaimedMailsUnified(save);
  assert.ok(save.claimedMailIds?.includes('mail_grand_launch'));
  assert.ok(save.deletedMailIds?.includes('mail_grand_launch'));
  assert.equal(
    getVisibleMailInbox(save).some((m) => m.id === 'mail_grand_launch'),
    false
  );

  // Simulate full reload through migrateSaveData -> deleted mail MUST NOT respawn or be claimable
  const reloaded = migrateSaveData(JSON.parse(JSON.stringify(save)) as SaveData);
  assert.equal(
    getVisibleMailInbox(reloaded).some((m) => m.id === 'mail_grand_launch'),
    false
  );
  const claimAfterReload = claimMailsUnified(reloaded, 'all', roller);
  assert.equal(claimAfterReload.claimedCount, 0);
  assert.equal(claimAfterReload.goldGained, 0);
  assert.equal(reloaded.gold, save.gold);

  // Progress to Ch.1 Clear -> remaining 2 mails become eligible and grant exactly once
  const ch1Save: SaveData = {
    ...reloaded,
    highestChapterCleared: 1,
    bestStagePerChapter: { 1: 12 },
  };
  assert.equal(countUnclaimedEligibleMail(ch1Save), 2);
  const ch1Claim = claimMailsUnified(ch1Save, 'all', ({ isPremium, minRarity, forceSTier }) =>
    rollProgressionGatedGear(ch1Save, isPremium, minRarity, forceSTier, rng)
  );
  assert.equal(ch1Claim.claimedCount, 2);
  assert.equal(ch1Claim.goldGained, 120 + 220);
  assert.equal(ch1Claim.gemsGained, 20 + 25);
  assert.equal(ch1Claim.gearsGained.length, 1);
  assert.equal(ch1Claim.gearsGained[0].rarity, Rarity.EPIC);
  assert.equal(Boolean(GEAR_TEMPLATES[ch1Claim.gearsGained[0].templateId]?.isSTier), false);

  // Delete all claimed & reload -> inbox empty and remains empty
  const afterDel = deleteClaimedMailsUnified(ch1Claim.nextSave);
  const afterDelReload = migrateSaveData(JSON.parse(JSON.stringify(afterDel)) as SaveData);
  assert.equal(getVisibleMailInbox(afterDelReload).length, 0);
  assert.equal(countUnclaimedEligibleMail(afterDelReload), 0);
});

test('Legacy Save Migration: respects deleted mails and preserves 100% of legacy player assets', () => {
  const base = createInitialSaveData();
  const legacySTierItem: GearInstance = {
    uid: 'legacy_s_bow_99',
    templateId: 's_leo_sunbow',
    rarity: Rarity.LEGENDARY,
    level: 12,
  };
  const legacyEpicArmor: GearInstance = {
    uid: 'legacy_epic_armor_88',
    templateId: 'titan_plate',
    rarity: Rarity.EPIC,
    level: 8,
  };

  // Case A: Legacy save (no progressionSchemaVersion) where player already deleted mail_grand_launch
  // and claimed mail_boss_rush_open, while keeping mail_season1_celebration unclaimed.
  const legacySaveWithDeletedMail: SaveData = {
    ...base,
    progressionSchemaVersion: undefined,
    claimedMailIds: undefined,
    deletedMailIds: undefined,
    gold: 4250,
    gems: 310,
    highestChapterCleared: 1,
    bestStagePerChapter: { 1: 12 },
    inventory: [...base.inventory, legacySTierItem, legacyEpicArmor],
    equipped: {
      ...base.equipped,
      [GearSlot.WEAPON]: legacySTierItem.uid,
      [GearSlot.ARMOR]: legacyEpicArmor.uid,
    },
    runeInventory: [{ uid: 'legacy_rune_1', runeId: 'arrow_rain', rarity: Rarity.EPIC }],
    equippedRunes: ['legacy_rune_1'],
    unlockedCelestialWings: ['seraph_azure'],
    celestialWingStars: { seraph_azure: 2 },
    equippedCelestialWingId: 'seraph_azure',
    unlockedRoyal3DTitles: ['title_sky_sovereign'],
    equippedRoyal3DTitleId: 'title_sky_sovereign',
    achievementsClaimed: ['ach_first_blood'],
    mailInbox: [
      { ...SYSTEM_MAIL_TEMPLATES[1], claimed: true },
      { ...SYSTEM_MAIL_TEMPLATES[2], claimed: false },
    ],
  };

  const migratedA = migrateSaveData(legacySaveWithDeletedMail);
  assert.equal(migratedA.progressionSchemaVersion, PROGRESSION_SCHEMA_VERSION);
  // Deleted mail_grand_launch must be recorded in BOTH claimedMailIds & deletedMailIds and not reappear
  assert.ok(migratedA.claimedMailIds?.includes('mail_grand_launch'));
  assert.ok(migratedA.deletedMailIds?.includes('mail_grand_launch'));
  assert.equal(
    getVisibleMailInbox(migratedA).some((m) => m.id === 'mail_grand_launch'),
    false
  );
  // Already claimed mail_boss_rush_open remains claimed
  assert.ok(migratedA.claimedMailIds?.includes('mail_boss_rush_open'));
  // Unclaimed mail_season1_celebration remains claimable
  assert.equal(countUnclaimedEligibleMail(migratedA), 1);

  // 100% Legacy Asset Preservation check
  assert.equal(migratedA.gold, 4250);
  assert.equal(migratedA.gems, 310);
  assert.equal(migratedA.inventory.length, base.inventory.length + 2);
  assert.ok(migratedA.inventory.some((g) => g.uid === 'legacy_s_bow_99' && g.rarity === Rarity.LEGENDARY));
  assert.ok(migratedA.inventory.some((g) => g.uid === 'legacy_epic_armor_88' && g.rarity === Rarity.EPIC));
  assert.equal(migratedA.equipped[GearSlot.WEAPON], 'legacy_s_bow_99');
  assert.equal(migratedA.runeInventory.length, 1);
  // Legacy Celestial Wings are retired and cleaned safely on migration
  assert.deepEqual(migratedA.unlockedCelestialWings, []);
  assert.deepEqual(migratedA.unlockedRoyal3DTitles, ['title_sky_sovereign']);
  assert.deepEqual(migratedA.achievementsClaimed, ['ach_first_blood']);

  // Case B: Legacy save with ALL system mails intact (unclaimed)
  const legacySaveFreshInbox: SaveData = {
    ...base,
    progressionSchemaVersion: undefined,
    claimedMailIds: undefined,
    deletedMailIds: undefined,
    mailInbox: SYSTEM_MAIL_TEMPLATES.map((t) => ({ ...t, claimed: false })),
  };
  const migratedB = migrateSaveData(legacySaveFreshInbox);
  assert.equal(migratedB.deletedMailIds?.length ?? 0, 0);
  assert.equal(migratedB.claimedMailIds?.length ?? 0, 0);
  assert.equal(getVisibleMailInbox(migratedB).length, SYSTEM_MAIL_TEMPLATES.length);
  assert.equal(countUnclaimedEligibleMail(migratedB), 1); // Only St.0 mail eligible initially
});

test('Progression Gating Ch.1–3: rarity ceilings, feature locks, and progressive milestone rewards', () => {
  const rng = createMulberry32(2026);
  const fresh = createInitialSaveData();

  // Stage 0 Fresh
  const p0 = getEarlyProgressionPolicy(fresh);
  assert.equal(p0.maxGearRarity, Rarity.COMMON);
  assert.equal(p0.allowSTier, false);
  assert.equal(isEarlyFeatureUnlocked(fresh, 'iron_chest').unlocked, false);
  assert.equal(isEarlyFeatureUnlocked(fresh, 'mythic_chest').unlocked, false);
  assert.equal(isEarlyFeatureUnlocked(fresh, 'sweep').unlocked, false);
  assert.equal(isEarlyFeatureUnlocked(fresh, 'starter_pack').unlocked, false);
  assert.equal(isEarlyFeatureUnlocked(fresh, 'meta_events').unlocked, false);

  // Even forcing Legendary & S-Tier on Stage 0 clamps to COMMON & non-S
  for (let i = 0; i < 20; i++) {
    const g = rollProgressionGatedGear(fresh, true, Rarity.LEGENDARY, true, rng);
    assert.equal(g.rarity, Rarity.COMMON);
    assert.equal(Boolean(GEAR_TEMPLATES[g.templateId]?.isSTier), false);
  }

  // Stage 2 Ch.1: Iron Chest & Talents open, rarity still COMMON
  const st2 = { ...fresh, bestStagePerChapter: { 1: 2 } };
  assert.equal(isEarlyFeatureUnlocked(st2, 'iron_chest').unlocked, true);
  assert.equal(isEarlyFeatureUnlocked(st2, 'talents').unlocked, true);
  assert.equal(isEarlyFeatureUnlocked(st2, 'mythic_chest').unlocked, false);
  assert.equal(getEarlyProgressionPolicy(st2).maxGearRarity, Rarity.COMMON);

  // Stage 4 Ch.1 (Ares defeated): Rare unlocks, Mythic Chest & Forge open, S-Tier still locked
  const st4Raw = { ...st2, bestStagePerChapter: { 1: 4 } };
  const { nextSave: st4, summary: sum4 } = applyEarlyRunMilestones(st4Raw, 1, 4, false);
  assert.equal(getEarlyProgressionPolicy(st4).maxGearRarity, Rarity.RARE);
  assert.equal(getEarlyProgressionPolicy(st4).allowSTier, false);
  assert.equal(isEarlyFeatureUnlocked(st4, 'mythic_chest').unlocked, true);
  assert.equal(isEarlyFeatureUnlocked(st4, 'forge').unlocked, true);
  assert.equal(isEarlyFeatureUnlocked(st4, 'sweep').unlocked, false);
  assert.ok(sum4.rareShardsGained >= EARLY_FORGE_COSTS.rareShards);
  assert.equal(getNextTargetGoal(st4).canCraftNow, true);

  // Craft guaranteed first Rare Weapon
  const craftRare = craftEarlyTargetGear(st4, 'rare', rng);
  assert.equal(craftRare.ok, true);
  assert.equal(craftRare.item?.rarity, Rarity.RARE);
  assert.equal(GEAR_TEMPLATES[craftRare.item!.templateId].slot, GearSlot.WEAPON);
  assert.equal(Boolean(GEAR_TEMPLATES[craftRare.item!.templateId].isSTier), false);

  // Post Ch.1 Clear: Epic unlocks, Sweep & Runes unlock, arrow_rain Rune + Royal 3D Title granted
  const ch1Raw: SaveData = {
    ...craftRare.nextSave!,
    highestChapterCleared: 1,
    bestStagePerChapter: { 1: 12 },
  };
  const { nextSave: ch1After, summary: sumCh1 } = applyEarlyRunMilestones(ch1Raw, 1, 12, true);
  assert.equal(getEarlyProgressionPolicy(ch1After).maxGearRarity, Rarity.EPIC);
  assert.equal(getEarlyProgressionPolicy(ch1After).allowSTier, false);
  assert.equal(isEarlyFeatureUnlocked(ch1After, 'sweep').unlocked, true);
  assert.equal(isEarlyFeatureUnlocked(ch1After, 'runes').unlocked, true);
  assert.equal(isEarlyFeatureUnlocked(ch1After, 'starter_pack').unlocked, false);
  assert.equal(sumCh1.unlockedRune, true);
  assert.equal(sumCh1.unlockedRoyalTitle, true);
  assert.ok(ch1After.runeInventory.some((r) => r.runeId === 'arrow_rain'));
  assert.ok(ch1After.unlockedRoyal3DTitles?.includes('title_sky_sovereign'));

  // Craft guaranteed first Epic Weapon
  const craftEpic = craftEarlyTargetGear(ch1After, 'epic', rng);
  assert.equal(craftEpic.ok, true);
  assert.equal(craftEpic.item?.rarity, Rarity.EPIC);
  assert.equal(Boolean(GEAR_TEMPLATES[craftEpic.item!.templateId].isSTier), false);

  // Post Ch.2 Clear (Entering Ch.3): Epic ceiling stays active while Meta Events & Arena & Wing 3D unlock
  const ch2Raw: SaveData = {
    ...craftEpic.nextSave!,
    highestChapterCleared: 2,
    bestStagePerChapter: { 1: 12, 2: 12 },
  };
  const { nextSave: ch2After, summary: sumCh2 } = applyEarlyRunMilestones(ch2Raw, 2, 12, true);
  assert.equal(getEarlyProgressionPolicy(ch2After).maxGearRarity, Rarity.EPIC);
  assert.equal(getEarlyProgressionPolicy(ch2After).allowSTier, false);
  assert.equal(isEarlyFeatureUnlocked(ch2After, 'starter_pack').unlocked, false);
  assert.equal(isEarlyFeatureUnlocked(ch2After, 'meta_events').unlocked, true);
  assert.equal(Boolean(sumCh2.unlockedCelestialWing), false);
  assert.deepEqual(ch2After.unlockedCelestialWings ?? [], []);

  // Post Ch.3 Clear (Entering Ch.4): S-Tier & Starter Pack & Co-op Raid open; Ch.4 clear opens Legendary; Ch.8 clear opens Mythic
  const ch3After: SaveData = { ...ch2After, highestChapterCleared: 3, bestStagePerChapter: { 1: 12, 2: 12, 3: 12 } };
  assert.equal(getEarlyProgressionPolicy(ch3After).maxGearRarity, Rarity.EPIC);
  assert.equal(getEarlyProgressionPolicy(ch3After).allowSTier, true);
  assert.equal(isEarlyFeatureUnlocked(ch3After, 'starter_pack').unlocked, true);
  assert.equal(getEarlyProgressionPolicy({ highestChapterCleared: 4, bestStagePerChapter: { 4: 12 } }).maxGearRarity, Rarity.LEGENDARY);
  assert.equal(getEarlyProgressionPolicy({ highestChapterCleared: 8, bestStagePerChapter: { 8: 12 } }).maxGearRarity, Rarity.MYTHIC);
});

test('Mythic Chest Pity Preservation: never loses accumulated pity when Epic or [S] pools are locked', () => {
  const rng = createMulberry32(777);

  // 1) At Stage 4 Ch.1 (Rare max, Epic & [S] locked), roll 15 Mythic chests
  const policyRare = getEarlyProgressionPolicy({
    highestChapterCleared: 0,
    bestStagePerChapter: { 1: 4 },
  });
  const batch1 = rollChestGearBatch(true, 15, { mythicRollsSinceEpic: 0, mythicRollsSinceSTier: 0 }, {
    policy: policyRare,
    rng,
  });

  // All 15 items must be strictly <= RARE and non-S
  for (const item of batch1.items) {
    assert.ok(RARITY_RANK[item.rarity] <= RARITY_RANK[Rarity.RARE]);
    assert.equal(Boolean(GEAR_TEMPLATES[item.templateId]?.isSTier), false);
  }
  // Epic pity preserved at cap 9 (ready to trigger immediately on Ch.1 clear); S pity at 15
  assert.equal(batch1.nextPity.mythicRollsSinceEpic, 9);
  assert.equal(batch1.nextPity.mythicRollsSinceSTier, 15);

  // 2) Unlock Epic (Post Ch.1, [S] still locked) and roll 1 Mythic chest -> immediate Epic+ pity trigger
  const policyEpic = getEarlyProgressionPolicy({
    highestChapterCleared: 1,
    bestStagePerChapter: { 1: 12 },
  });
  const batch2 = rollChestGearBatch(true, 1, batch1.nextPity, { policy: policyEpic, rng });
  assert.equal(batch2.items[0].rarity, Rarity.EPIC);
  assert.equal(Boolean(GEAR_TEMPLATES[batch2.items[0].templateId]?.isSTier), false);
  assert.equal(batch2.nextPity.mythicRollsSinceEpic, 0);
  assert.equal(batch2.nextPity.mythicRollsSinceSTier, 16);

  // 3) Roll 12 more while [S] still locked -> S pity caps at 24 (never resets to 0)
  const batch3 = rollChestGearBatch(true, 12, batch2.nextPity, { policy: policyEpic, rng });
  assert.equal(batch3.nextPity.mythicRollsSinceSTier, 24);
  for (const item of batch3.items) {
    assert.equal(Boolean(GEAR_TEMPLATES[item.templateId]?.isSTier), false);
  }

  // 4) Unlock Ch.4 (Post Ch.3 Clear, [S] open) and roll 1 Mythic chest -> immediate [S] pity trigger!
  const policyCh4 = getEarlyProgressionPolicy({
    highestChapterCleared: 3,
    bestStagePerChapter: { 1: 12, 2: 12, 3: 12 },
  });
  const batch4 = rollChestGearBatch(true, 1, batch3.nextPity, { policy: policyCh4, rng });
  assert.equal(Boolean(GEAR_TEMPLATES[batch4.items[0].templateId]?.isSTier), true);
  assert.equal(batch4.nextPity.mythicRollsSinceSTier, 0);
});

test('Pre-First-Run Economy Invariant: Fresh vs All Eligible Lobby Rewards Claimed DPS gap <= 10% and 0 Rare+/S items', () => {
  const rng = createMulberry32(42);
  const fresh = createInitialSaveData();
  const freshStats = computePlayerStats(fresh);
  const freshDps = computeExpectedDps(freshStats);

  // Fresh account invariants: 2 Common Lv1 items, 0 runes/wings/titles, 0 S-tier
  assert.equal(fresh.inventory.length, 2);
  assert.equal(fresh.runeInventory.length, 0);
  assert.equal(fresh.unlockedCelestialWings?.length ?? 0, 0);
  assert.equal(fresh.unlockedRoyal3DTitles?.length ?? 0, 0);

  // Claim ALL eligible pre-run lobby rewards on a brand-new account:
  // 1) Welcome Gift: +30g, +10gem, +2 rareShards
  let lobby: SaveData = {
    ...fresh,
    welcomeGiftClaimed: true,
    gold: fresh.gold + 30,
    gems: fresh.gems + 10,
    earlyForgeProgress: {
      rareShards: (fresh.earlyForgeProgress?.rareShards ?? 0) + 2,
      epicShards: 0,
      sTierBlueprints: 0,
    },
  };
  // 2) Eligible Mail (only mail_grand_launch: +25g, +10gem)
  lobby = claimMailsUnified(lobby, 'all', ({ isPremium, minRarity, forceSTier }) =>
    rollProgressionGatedGear(lobby, isPremium, minRarity, forceSTier, rng)
  ).nextSave;
  // 3) Day 1 Check-In (+35g, +5gem)
  const day1 = CHECK_IN_REWARDS[0];
  lobby = {
    ...lobby,
    gold: lobby.gold + day1.gold,
    gems: lobby.gems + day1.gems,
  };

  // Verify no Rare / Epic / Legendary / [S] gear acquired before run 1
  const hasRareOrHigher = lobby.inventory.some((g) => RARITY_RANK[g.rarity] >= RARITY_RANK[Rarity.RARE]);
  const hasSTier = lobby.inventory.some((g) => GEAR_TEMPLATES[g.templateId]?.isSTier);
  assert.equal(hasRareOrHigher, false);
  assert.equal(hasSTier, false);

  // Spend all available pre-run gold on optimal DPS upgrade (Weapon Lv.1 -> Lv.2)
  const weapon1 = lobby.inventory.find((g) => g.uid === lobby.equipped[GearSlot.WEAPON])!;
  const cost1 = getUpgradeCost(weapon1);
  assert.ok(lobby.gold >= cost1);
  lobby = {
    ...lobby,
    gold: lobby.gold - cost1,
    inventory: lobby.inventory.map((g) => (g.uid === weapon1.uid ? { ...g, level: g.level + 1 } : g)),
  };
  const dpsAfterLv2 = computeExpectedDps(computePlayerStats(lobby));
  const gapLv2Pct = ((dpsAfterLv2 - freshDps) / freshDps) * 100;
  assert.ok(gapLv2Pct <= 10, `Expected pre-run DPS gap <= 10%, got ${gapLv2Pct.toFixed(2)}%`);

  // Even after claiming Daily Quest dq_upgrade_1 (+60g, +5gem) and doing a 2nd Weapon upgrade (Lv.2 -> Lv.3)
  const dqUpgrade = DAILY_QUESTS.find((q) => q.id === 'dq_upgrade_1')!;
  lobby = {
    ...lobby,
    gold: lobby.gold + dqUpgrade.rewardGold,
    gems: lobby.gems + dqUpgrade.rewardGems,
  };
  const weapon2 = lobby.inventory.find((g) => g.uid === lobby.equipped[GearSlot.WEAPON])!;
  const cost2 = getUpgradeCost(weapon2);
  if (lobby.gold >= cost2) {
    lobby = {
      ...lobby,
      gold: lobby.gold - cost2,
      inventory: lobby.inventory.map((g) => (g.uid === weapon2.uid ? { ...g, level: g.level + 1 } : g)),
    };
  }
  const dpsAfterMaxPreRun = computeExpectedDps(computePlayerStats(lobby));
  const gapMaxPct = ((dpsAfterMaxPreRun - freshDps) / freshDps) * 100;
  assert.ok(gapMaxPct <= 10, `Expected max pre-run DPS gap (with dq_upgrade_1) <= 10%, got ${gapMaxPct.toFixed(2)}%`);
});

test('Chapter 1 Build Archetypes: SKILLS_CATALOG exposes distinct AoE and Boss build tags', () => {
  const allSkills = Object.values(SKILLS_CATALOG);
  const aoeSkills = allSkills.filter((s) => s.buildTag === 'aoe');
  const bossSkills = allSkills.filter((s) => s.buildTag === 'boss');
  const sustainSkills = allSkills.filter((s) => s.buildTag === 'sustain');
  assert.ok(aoeSkills.length >= 4, 'Expected at least 4 AoE/Chain build skills');
  assert.ok(bossSkills.length >= 4, 'Expected at least 4 Boss/Single-Target build skills');
  assert.ok(sustainSkills.length >= 2, 'Expected at least 2 Sustain skills');
});

test('Phase 2 · Hero Balance Envelope: all heroes stay within ±12% standing DPS of Aurelia on identical Ch.1 loadout', () => {
  assert.equal(HEROES.length, 2);
  const fresh = createInitialSaveData();
  const aureliaDps = computeExpectedDps(
    computePlayerStats(fresh)
  );

  for (const hero of HEROES) {
    assert.ok(
      hero.bonusAtk >= 48 && hero.bonusAtk <= 56,
      `${hero.id} bonusAtk ${hero.bonusAtk} out of [48, 56]`
    );
    assert.ok(
      hero.bonusHp >= 195 && hero.bonusHp <= 225,
      `${hero.id} bonusHp ${hero.bonusHp} out of [195, 225]`
    );
    assert.ok(hero.roleTag, `${hero.id} should declare a roleTag`);
    assert.ok(
      hero.unlockGold <= 700 && hero.unlockGems <= 40,
      `${hero.id} unlock cost should be aligned to Ch.1-3 economy`
    );

    const heroStats = computePlayerStats({ ...fresh, selectedHeroId: hero.id });
    const heroDps = computeExpectedDps(heroStats);
    const deltaPct = Math.abs((heroDps - aureliaDps) / aureliaDps) * 100;
    assert.ok(
      deltaPct <= 12,
      `${hero.id} standing DPS ${heroDps} deviates ${deltaPct.toFixed(2)}% from Aurelia (${aureliaDps})`
    );
  }
});

test('Phase 2 · Rune Chest Ch.2–3 Progression Policy & Pity Preservation', () => {
  const rng = createMulberry32(8881);

  // Stage 4 Ch.1: maxRuneRarity = RARE -> Epic pity caps at 9 and never resets to 0
  const policyRareRune = getEarlyProgressionPolicy({
    highestChapterCleared: 0,
    bestStagePerChapter: { 1: 4 },
  });
  assert.equal(policyRareRune.maxRuneRarity, Rarity.RARE);
  const batchLocked = rollRuneChestBatch(
    true,
    12,
    { mythicRollsSinceEpic: 0, mythicRollsSinceSTier: 0, runeRollsSinceEpic: 0 },
    { policy: policyRareRune, rng }
  );
  for (const rune of batchLocked.items) {
    assert.ok(RARITY_RANK[rune.rarity] <= RARITY_RANK[Rarity.RARE]);
  }
  assert.equal(batchLocked.nextPity.runeRollsSinceEpic, 9);

  // Ch.2 (Post Ch.1 Clear): maxRuneRarity = EPIC -> immediate Epic pity trigger, NEVER drops Legendary
  const policyCh2 = getEarlyProgressionPolicy({
    highestChapterCleared: 1,
    bestStagePerChapter: { 1: 12, 2: 6 },
  });
  assert.equal(policyCh2.maxRuneRarity, Rarity.EPIC);
  const batchFirstCh2 = rollRuneChestBatch(true, 1, batchLocked.nextPity, {
    policy: policyCh2,
    rng,
  });
  assert.equal(batchFirstCh2.items[0].rarity, Rarity.EPIC);
  assert.equal(batchFirstCh2.nextPity.runeRollsSinceEpic, 0);

  const batchCh2Many = rollRuneChestBatch(true, 40, batchFirstCh2.nextPity, {
    policy: policyCh2,
    rng,
  });
  for (const rune of batchCh2Many.items) {
    assert.ok(
      RARITY_RANK[rune.rarity] <= RARITY_RANK[Rarity.EPIC],
      `Ch.2 Rune chest leaked rarity ${rune.rarity}`
    );
  }

  // Ch.5 (Post Ch.4 Clear): maxRuneRarity = LEGENDARY -> Legendary runes unlocked
  const policyCh5 = getEarlyProgressionPolicy({
    highestChapterCleared: 4,
    bestStagePerChapter: { 1: 12, 2: 12, 3: 12, 4: 12 },
  });
  assert.equal(policyCh5.maxRuneRarity, Rarity.LEGENDARY);
  const batchCh5 = rollRuneChestBatch(true, 80, batchCh2Many.nextPity, {
    policy: policyCh5,
    rng,
  });
  assert.ok(
    batchCh5.items.some((r) => r.rarity === Rarity.LEGENDARY),
    'Expected at least 1 Legendary rune in 80 Rare Rune rolls at Ch.5'
  );
});

test('Phase 2 & 3 · 9 Skill Synergies, Completion Hints & Ch.1–3 Smart Valkyrie Drafting', () => {
  assert.equal(SKILL_SYNERGIES.length, 9);
  assert.equal(PUNISH_WINDOW_DAMAGE_BONUS, 0.18);

  // Verify each of the 9 synergies activates with its minimal pair
  for (const syn of SKILL_SYNERGIES) {
    const a = syn.groupA[0];
    const b = syn.groupB[0];
    assert.deepEqual(evaluateActiveSynergies({ [a]: 1 }), []);
    const active = evaluateActiveSynergies({ [a]: 1, [b]: 1 });
    assert.ok(active.includes(syn.id), `Synergy ${syn.id} failed to activate for ${a} + ${b}`);

    // Holding A makes B return this synergy as a completion hint
    const hints = getSynergyHintsForSkill(b, { [a]: 1 });
    assert.ok(
      hints.some((h) => h.id === syn.id),
      `Expected ${b} to hint completion of ${syn.id} when holding ${a}`
    );
  }

  // Smart Valkyrie drafting in Ch.1, Ch.2, and Ch.3 biases toward synergy completion
  const rng = createMulberry32(202607);
  let completionHits = 0;
  for (let i = 0; i < 40; i++) {
    const choices = rollSkillChoices({ front_arrow: 1 }, 3, 'epic', {
      chapterId: (i % 3) + 1,
      stage: i % 2 === 0 ? 6 : 10,
      isValkyrie: true,
      rng,
    });
    assert.equal(choices.length, 3);
    if (choices.some((c) => c.id === 'multishot')) {
      completionHits++;
    }
  }
  assert.ok(
    completionHits >= 20,
    `Expected strong synergy-completion bias across Ch.1-3 Valkyrie drafts, got ${completionHits}/40`
  );
});

test('Phase 2 · Playtest Telemetry Ledger & Early Ch.1–3 Roadmap Status', () => {
  let save = createInitialSaveData();

  // Initial roadmap: step 01 is current, 0 completed
  const r0 = getEarlyRoadmapStatus(save);
  assert.equal(r0.length, 4);
  assert.equal(r0[0].isCurrentTarget, true);
  assert.equal(r0.filter((m) => m.completed).length, 0);

  // Run 1 starts and ends in defeat at Ch.1-4 (Ares) -> records defeat, boss attempt, funnel
  let pm = recordPlaytestRunStart(save.playtestMetrics);
  pm = recordPlaytestRunEnd(pm, {
    chapterId: 1,
    stageReached: 4,
    victory: false,
    elapsedSeconds: 145,
    activeSynergies: ['storm_chain'],
  });
  assert.equal(pm.totalRuns, 1);
  assert.equal(pm.firstDefeatRunIndex, 1);
  assert.equal(pm.startedRunAfterFirstDefeat, false);
  assert.equal(pm.stageEntriesByChapter['1']?.[4], 1);
  assert.equal(pm.stageDefeatsByChapter['1']?.[4], 1);
  assert.equal(pm.bossAttempts.ch1_ares?.attempts, 1);
  assert.equal(pm.bossAttempts.ch1_ares?.cleared, false);
  assert.equal(pm.synergyPickCounts.storm_chain, 1);

  // Record first upgrade milestone & start Run 2 -> flips startedRunAfterFirstDefeat
  pm = recordPlaytestMilestone(pm, 'firstUpgrade');
  pm = recordPlaytestRunStart(pm);
  pm = recordPlaytestRunEnd(pm, {
    chapterId: 1,
    stageReached: 12,
    victory: true,
    elapsedSeconds: 210,
    activeSynergies: ['boss_barrage'],
  });
  assert.equal(pm.startedRunAfterFirstDefeat, true);
  assert.equal(pm.bossAttempts.ch1_ares?.attemptsToFirstClear, 2);
  assert.equal(pm.bossAttempts.ch1_leo_king?.attemptsToFirstClear, 1);
  assert.ok(pm.milestones.firstUpgrade);
  assert.ok(pm.milestones.firstCh1Clear);
  assert.equal(pm.synergyPickCounts.boss_barrage, 1);

  // Roadmap updates cleanly after Ch.1 Clear
  const ch1Save: SaveData = {
    ...save,
    highestChapterCleared: 1,
    bestStagePerChapter: { 1: 12 },
    playtestMetrics: pm,
  };
  const rCh1 = getEarlyRoadmapStatus(ch1Save);
  assert.equal(rCh1.filter((m) => m.completed).length, 3);
  assert.equal(rCh1[3].isCurrentTarget, true);

  // Reset KPI clears metrics cleanly without touching player inventory/gold
  const resetMetrics = resetPlaytestMetrics();
  assert.equal(normalizePlaytestMetrics(resetMetrics).totalRuns, 0);
  assert.equal(Object.keys(normalizePlaytestMetrics(resetMetrics).bossAttempts).length, 0);
});

test('Phase 3 · 5 Gear Set Bonuses: 2pc/3pc activation, CP lift, and 0 impact on Fresh Ch.1 starter gear', () => {
  const allSets = Object.values(GEAR_SET_DEFINITIONS);
  assert.equal(allSets.length, 5);

  // 1) Fresh Ch.1 starter loadout MUST trigger zero Gear Set Bonuses
  const fresh = createInitialSaveData();
  const freshSets = evaluateEquippedGearSets(fresh);
  assert.equal(freshSets.sets.length, 0);
  assert.equal(freshSets.activeTierCount, 0);
  const freshStats = computePlayerStats(fresh);
  assert.equal(freshStats.activeGearSets?.length ?? 0, 0);

  // 2) Equipping 2 pieces of Echo Set activates 2pc tier (+10% ASPD, +6% Move) and 3pc adds (+12% ATK, +8% DR)
  const makeItem = (uid: string, templateId: string, rarity = Rarity.EPIC, level = 5): GearInstance => ({
    uid,
    templateId,
    rarity,
    level,
  });

  const echoWeapon = makeItem('echo_w', 'beam_staff');
  const echoArmor = makeItem('echo_a', 'echo_armor');
  const echoNeck = makeItem('echo_n', 'echo_amulet');
  const nonSetArmor = makeItem('dest_a', 'titan_plate'); // different set -> 1/2 only

  const oneEchoSave: SaveData = {
    ...fresh,
    inventory: [...fresh.inventory, echoWeapon, nonSetArmor],
    equipped: {
      [GearSlot.WEAPON]: echoWeapon.uid,
      [GearSlot.ARMOR]: nonSetArmor.uid,
    },
  };
  const oneEchoEval = evaluateEquippedGearSets(oneEchoSave);
  assert.equal(oneEchoEval.activeTierCount, 0);

  const twoEchoSave: SaveData = {
    ...fresh,
    inventory: [...fresh.inventory, echoWeapon, echoArmor],
    equipped: {
      [GearSlot.WEAPON]: echoWeapon.uid,
      [GearSlot.ARMOR]: echoArmor.uid,
    },
  };
  const twoEchoEval = evaluateEquippedGearSets(twoEchoSave);
  assert.equal(twoEchoEval.activeTierCount, 1);
  assert.equal(twoEchoEval.attackSpeed, 0.1);
  assert.equal(twoEchoEval.moveSpeed, 0.06);

  const threeEchoSave: SaveData = {
    ...fresh,
    inventory: [...fresh.inventory, echoWeapon, echoArmor, echoNeck],
    equipped: {
      [GearSlot.WEAPON]: echoWeapon.uid,
      [GearSlot.ARMOR]: echoArmor.uid,
      [GearSlot.NECKLACE]: echoNeck.uid,
    },
  };
  const threeEchoEval = evaluateEquippedGearSets(threeEchoSave);
  assert.equal(threeEchoEval.activeTierCount, 2);
  assert.equal(threeEchoEval.atkPct, 0.12);
  assert.equal(threeEchoEval.damageReduction, 0.08);

  const stats2 = computePlayerStats(twoEchoSave);
  const stats3 = computePlayerStats(threeEchoSave);
  assert.ok(stats3.powerRating > stats2.powerRating);
  assert.ok(stats3.attack > stats2.attack);

  // 3) Verify all 5 sets activate every declared tier cleanly when maxPieces of that set are equipped
  for (const def of allSets) {
    const bySlot = new Map<GearSlot, string>();
    for (const [tplId, t] of Object.entries(GEAR_TEMPLATES)) {
      if (t.setName === def.id && !bySlot.has(t.slot)) {
        bySlot.set(t.slot, tplId);
      }
    }
    const chosen = Array.from(bySlot.entries()).slice(0, def.maxPieces);
    assert.equal(chosen.length, def.maxPieces, `Set ${def.id} must span ${def.maxPieces} distinct slots`);
    const items = chosen.map(([slot, tplId]) => makeItem(`set_${def.id}_${slot}`, tplId));
    const equipped: Partial<Record<GearSlot, string>> = {};
    chosen.forEach(([slot], idx) => {
      equipped[slot] = items[idx].uid;
    });
    const evalRes = evaluateEquippedGearSets({
      ...fresh,
      inventory: [...fresh.inventory, ...items],
      equipped,
    });
    assert.equal(
      evalRes.activeTierCount,
      def.tiers.length,
      `Set ${def.id} (${def.maxPieces}pc) should activate ${def.tiers.length} tier(s)`
    );
    assert.equal(evalRes.sets[0].unlockedTiers.length, def.tiers.length);
  }
});

test('Phase 3 · 3 New Synergies (Aegis Sanctuary, Solar Orbit, Venom Eclipse) & Ch.4–6 Smart Valkyrie Drafting', () => {
  // Confirm the 3 new Phase 3 synergies activate with exact skill pairs
  assert.ok(
    evaluateActiveSynergies({ sacred_protection: 1, bloodthirst: 1 }).includes('aegis_sanctuary')
  );
  assert.ok(
    evaluateActiveSynergies({ orbit_orbs: 1, atk_boost: 1 }).includes('solar_orbit')
  );
  assert.ok(
    evaluateActiveSynergies({ venom_arrow: 1, bomb_sprite: 1 }).includes('venom_eclipse')
  );

  // Confirm Smart Valkyrie drafting biases toward synergy completion across Ch.4, Ch.5, and Ch.6
  const rng = createMulberry32(202611);
  let ch46CompletionHits = 0;
  for (let i = 0; i < 45; i++) {
    const chId = 4 + (i % 3); // Ch.4, Ch.5, Ch.6
    const choices = rollSkillChoices({ orbit_orbs: 1 }, 3, 'epic', {
      chapterId: chId,
      stage: i % 2 === 0 ? 6 : 10,
      isValkyrie: true,
      rng,
    });
    assert.equal(choices.length, 3);
    if (choices.some((c) => c.id === 'atk_boost' || c.id === 'aspd_boost')) {
      ch46CompletionHits++;
    }
  }
  assert.ok(
    ch46CompletionHits >= 22,
    `Expected strong synergy-completion bias in Ch.4-6 Valkyrie drafts, got ${ch46CompletionHits}/45`
  );
});

test('Phase 3 · Ch.1–12 Strictly Monotonic Chapter Curve & Boss Rush / Daily Rift Scaling', () => {
  // Ch.1 calibrated for 30-day Fair Progression opening challenge
  const ch1 = CHAPTERS[0];
  assert.equal(ch1.hpScale, 1.35);
  assert.equal(ch1.dmgScale, 1.2);
  assert.equal(ch1.recommendedPower, 1350);

  // Ch.1 -> Ch.12 hpScale, dmgScale, recommendedPower strictly monotonic
  for (let i = 1; i < CHAPTERS.length; i++) {
    const prev = CHAPTERS[i - 1];
    const curr = CHAPTERS[i];
    assert.ok(
      curr.hpScale > prev.hpScale,
      `Ch.${curr.id} hpScale (${curr.hpScale}) must exceed Ch.${prev.id} (${prev.hpScale})`
    );
    assert.ok(
      curr.dmgScale > prev.dmgScale,
      `Ch.${curr.id} dmgScale (${curr.dmgScale}) must exceed Ch.${prev.id} (${prev.dmgScale})`
    );
    assert.ok(
      curr.recommendedPower > prev.recommendedPower,
      `Ch.${curr.id} recommendedPower (${curr.recommendedPower}) must exceed Ch.${prev.id} (${prev.recommendedPower})`
    );
  }

  // Boss Rush / Daily Rift scaling grows monotonically from Ch.0 cleared up to Ch.6+
  const scales = [0, 1, 2, 3, 4, 5, 6].map((cleared) => getSideModeScaling(cleared));
  for (let i = 1; i < scales.length; i++) {
    assert.ok(scales[i].enemyHpScale > scales[i - 1].enemyHpScale);
    assert.ok(scales[i].enemyDmgScale > scales[i - 1].enemyDmgScale);
    assert.ok(scales[i].goldRewardMult > scales[i - 1].goldRewardMult);
    assert.ok(scales[i].starDustBonus > scales[i - 1].starDustBonus);
  }
  assert.ok(scales[6].enemyHpScale > scales[0].enemyHpScale * 6);
  assert.ok(scales[6].goldRewardMult > scales[0].goldRewardMult * 3);
});

test('Phase 3 · KPI Auto-Grading Evaluator: insufficient -> warn -> pass transitions', () => {
  // 1) Empty metrics -> all 8 criteria report insufficient sample
  const emptyRows = evaluatePlaytestKpis(resetPlaytestMetrics());
  assert.equal(emptyRows.length, 8);
  assert.ok(emptyRows.every((r) => r.status === 'insufficient'));

  // 2) Healthy progression run sequence -> passes original 6 KPIs
  let pm = recordPlaytestRunStart(resetPlaytestMetrics());
  pm = recordPlaytestRunEnd(pm, {
    chapterId: 1,
    stageReached: 4,
    victory: false,
    elapsedSeconds: 180,
    activeSynergies: ['storm_chain'],
  });
  pm = recordPlaytestMilestone(pm, 'firstUpgrade');
  pm = recordPlaytestMilestone(pm, 'firstRare');
  pm = recordPlaytestRunStart(pm);
  pm = recordPlaytestRunEnd(pm, {
    chapterId: 1,
    stageReached: 8,
    victory: false,
    elapsedSeconds: 210,
    activeSynergies: ['solar_orbit'],
  });
  pm = recordPlaytestRunStart(pm);
  pm = recordPlaytestRunEnd(pm, {
    chapterId: 1,
    stageReached: 12,
    victory: true,
    elapsedSeconds: 240,
    activeSynergies: ['boss_barrage'],
  });
  pm = recordPlaytestMilestone(pm, 'firstEpic');

  const passRows = evaluatePlaytestKpis(pm);
  const byId = Object.fromEntries(passRows.map((r) => [r.id, r]));
  assert.equal(byId.run2_retention.status, 'pass');
  assert.equal(byId.ares_attempts.status, 'pass');
  assert.equal(byId.leo_attempts.status, 'pass');
  assert.equal(byId.first_rare.status, 'pass');
  assert.equal(byId.first_epic.status, 'pass');
  assert.equal(byId.synergy_adoption.status, 'pass');

  // 3) Failing to return after first defeat + zero synergies across 4 runs flags warn
  let warnPm = resetPlaytestMetrics();
  for (let i = 0; i < 4; i++) {
    warnPm = recordPlaytestRunStart(warnPm);
    warnPm = recordPlaytestRunEnd(warnPm, {
      chapterId: 1,
      stageReached: 4,
      victory: false,
      elapsedSeconds: 120,
      activeSynergies: [],
    });
  }
  const warnRows = evaluatePlaytestKpis(warnPm);
  const warnById = Object.fromEntries(warnRows.map((r) => [r.id, r]));
  assert.equal(warnById.ares_attempts.status, 'warn');
  assert.equal(warnById.first_rare.status, 'warn');
  assert.equal(warnById.synergy_adoption.status, 'warn');
});

test('Phase 4 · 3 Saved Loadout Presets: capture, 1-click apply, and graceful skip of fused/missing gear UIDs', () => {
  assert.equal(DEFAULT_LOADOUT_PRESET_SLOTS.length, 3);
  const base = createInitialSaveData();
  const extraWeapon: GearInstance = {
    uid: 'gear_p4_sunbow',
    templateId: 'dragon_knight_crossbow',
    rarity: Rarity.EPIC,
    level: 10,
  };
  const extraArmor: GearInstance = {
    uid: 'gear_p4_aegis',
    templateId: 'dragon_plate',
    rarity: Rarity.EPIC,
    level: 10,
  };
  const save1: SaveData = {
    ...base,
    unlockedHeroes: ['aurelia', 'bellona'],
    selectedHeroId: 'bellona',
    inventory: [...base.inventory, extraWeapon, extraArmor],
    equipped: {
      ...base.equipped,
      [GearSlot.WEAPON]: extraWeapon.uid,
      [GearSlot.ARMOR]: extraArmor.uid,
    },
  };

  // Capture preset_1 with Bellona + Dragon Knight Crossbow + Dragon Plate
  const withPresets: SaveData = {
    ...save1,
    loadoutPresets: captureLoadoutPreset(save1, 'preset_1'),
  };
  assert.equal(withPresets.loadoutPresets?.length, 1);

  // Switch hero and weapon, then delete extraArmor (simulating fusion/salvage)
  const mutated: SaveData = {
    ...withPresets,
    selectedHeroId: base.selectedHeroId,
    inventory: withPresets.inventory.filter((g) => g.uid !== extraArmor.uid),
    equipped: { ...base.equipped },
  };

  const applied = applyLoadoutPreset(mutated, 'preset_1');
  assert.equal(applied.preset?.slotId, 'preset_1');
  // Applying an equipment preset must never silently switch the player's active hero.
  assert.equal(applied.nextSave.selectedHeroId, base.selectedHeroId);
  assert.equal(applied.nextSave.equipped[GearSlot.WEAPON], extraWeapon.uid);
  // Missing extraArmor is skipped without wiping valid starter armor
  assert.equal(applied.skippedGearCount, 1);
  assert.equal(applied.nextSave.equipped[GearSlot.ARMOR], base.equipped[GearSlot.ARMOR]);
  assert.equal(applied.nextSave.activeLoadoutPresetId, 'preset_1');
});

test('Phase 4 · Hero Mastery Lv.1–10: preserves Fresh Ch.1 Lv.1 invariance and scales to Lv.5/Lv.10 perks', () => {
  const fresh = createInitialSaveData();
  const baseStats = computePlayerStats(fresh);
  const lv1Bonuses = computeHeroMasteryBonuses(fresh.heroMastery, fresh.selectedHeroId);
  assert.equal(lv1Bonuses.level, 1);
  assert.equal(lv1Bonuses.atkPct, 0);
  assert.equal(lv1Bonuses.hpPct, 0);
  assert.equal(lv1Bonuses.critChance, 0);
  assert.equal(lv1Bonuses.bossDamageBonus, 0);
  assert.equal(lv1Bonuses.cpBonus, 0);
  assert.equal(baseStats.heroMasteryLevel, 1);

  // Grant EXP to reach Lv.5 (+8% ATK, +10% HP, +4% Crit)
  const lv5Res = grantHeroMasteryExp(fresh.heroMastery, fresh.selectedHeroId, 950);
  assert.ok(lv5Res.nextLevel >= 5, `Expected Lv.5+, got Lv.${lv5Res.nextLevel}`);
  const lv5Bonuses = computeHeroMasteryBonuses(lv5Res.nextMap, fresh.selectedHeroId);
  assert.equal(lv5Bonuses.critChance, 0.04);
  assert.equal(lv5Bonuses.bossDamageBonus, 0);

  // Grant huge EXP -> caps cleanly at Lv.10 (+18% ATK, +22.5% HP, +4% Crit, +8% Boss DMG)
  const lv10Res = grantHeroMasteryExp(lv5Res.nextMap, fresh.selectedHeroId, 25000);
  assert.equal(lv10Res.nextLevel, HERO_MASTERY_MAX_LEVEL);
  const lv10Bonuses = computeHeroMasteryBonuses(lv10Res.nextMap, fresh.selectedHeroId);
  assert.equal(lv10Bonuses.isMax, true);
  assert.equal(lv10Bonuses.atkPct, 0.18);
  assert.equal(lv10Bonuses.hpPct, 0.225);
  assert.equal(lv10Bonuses.critChance, 0.04);
  assert.equal(lv10Bonuses.bossDamageBonus, 0.08);

  const lv10Stats = computePlayerStats({ ...fresh, heroMastery: lv10Res.nextMap });
  assert.ok(lv10Stats.attack > baseStats.attack);
  assert.ok(lv10Stats.maxHp > baseStats.maxHp);
  assert.ok(lv10Stats.bossDamageBonus > baseStats.bossDamageBonus);
  assert.ok(lv10Stats.powerRating > baseStats.powerRating);

  // Mastery EXP gain scales upward with chapter/victory
  const expCh1Loss = computeRunMasteryExpGain({ chapterId: 1, stageReached: 4, victory: false });
  const expCh10Win = computeRunMasteryExpGain({ chapterId: 10, stageReached: 12, victory: true });
  assert.ok(expCh10Win > expCh1Loss * 2);
});

test('Phase 4 · Standardized Endless Tower Floor 1–50 Scaling & Endgame Feature Thresholds', () => {
  const floors = [1, 5, 10, 12, 15, 20, 30, 40, 50];
  const rows = floors.map((f) => getEndlessTowerScaling(f, 6));
  for (let i = 1; i < rows.length; i++) {
    assert.ok(rows[i].enemyHpScale > rows[i - 1].enemyHpScale);
    assert.ok(rows[i].enemyDmgScale > rows[i - 1].enemyDmgScale);
    assert.ok(rows[i].goldReward > rows[i - 1].goldReward);
  }
  const bossMilestoneFloors = [5, 10, 15, 20, 30, 40, 50].map((f) => getEndlessTowerScaling(f, 6));
  for (let i = 1; i < bossMilestoneFloors.length; i++) {
    assert.ok(bossMilestoneFloors[i].starDustReward > bossMilestoneFloors[i - 1].starDustReward);
    assert.ok(bossMilestoneFloors[i].gemReward > bossMilestoneFloors[i - 1].gemReward);
  }
  const f9 = getEndlessTowerScaling(9, 6);
  const f10 = getEndlessTowerScaling(10, 6);
  const f12 = getEndlessTowerScaling(12, 6);
  const f20 = getEndlessTowerScaling(20, 6);
  assert.equal(f9.enableHazards, false);
  assert.equal(f10.enableHazards, true);
  assert.equal(f10.enableDualAffixElites, false);
  assert.equal(f12.enableDualAffixElites, true);
  assert.equal(f12.enableBossPhaseThree, false);
  assert.equal(f20.enableBossPhaseThree, true);
});

test('Phase 4 · Ch.7–12 Boss Telemetry Keys & 8-Criteria Endgame KPI Grading', () => {
  assert.equal(getBossTelemetryKey(7, 12), 'ch7_libra_boss');
  assert.equal(getBossTelemetryKey(8, 12), 'ch8_scorpio_boss');
  assert.equal(getBossTelemetryKey(9, 12), 'ch9_sagittarius_boss');
  assert.equal(getBossTelemetryKey(10, 12), 'ch10_capricorn_boss');
  assert.equal(getBossTelemetryKey(11, 12), 'ch11_aquarius_boss');
  assert.equal(getBossTelemetryKey(12, 12), 'ch12_pisces_boss');

  let pm = resetPlaytestMetrics();
  for (const ch of [1, 4, 7, 10]) {
    pm = recordPlaytestRunStart(pm);
    pm = recordPlaytestRunEnd(pm, {
      chapterId: ch,
      stageReached: 12,
      victory: true,
      elapsedSeconds: 260,
      activeSynergies: ch >= 7 ? ['boss_barrage', 'solar_orbit'] : ['storm_chain'],
    });
  }
  assert.equal(pm.bossAttempts.ch7_libra_boss?.cleared, true);
  assert.equal(pm.bossAttempts.ch10_capricorn_boss?.cleared, true);

  const kpis = evaluatePlaytestKpis(pm, {
    highestChapterCleared: 10,
    activeSetCount: 2,
    maxMasteryLevel: 6,
  });
  assert.equal(kpis.length, 8);
  const byId = Object.fromEntries(kpis.map((r) => [r.id, r]));
  assert.equal(byId.endgame_reach.status, 'pass');
  assert.equal(byId.build_depth.status, 'pass');
});

test('Phase 4 · Ch.7–12 Smart Valkyrie Drafting & Boss Phase III Punish Window Bonus', () => {
  assert.equal(PUNISH_WINDOW_PHASE3_BONUS, 0.24);
  assert.ok(PUNISH_WINDOW_PHASE3_BONUS > PUNISH_WINDOW_DAMAGE_BONUS);

  const rng = createMulberry32(202612);
  let lateCompletionHits = 0;
  for (let i = 0; i < 48; i++) {
    const chId = 7 + (i % 6); // Ch.7..12
    const choices = rollSkillChoices({ sacred_protection: 1 }, 3, 'epic', {
      chapterId: chId,
      stage: i % 2 === 0 ? 6 : 10,
      isValkyrie: true,
      rng,
    });
    assert.equal(choices.length, 3);
    if (choices.some((c) => c.id === 'bloodthirst' || c.id === 'fountain_of_life')) {
      lateCompletionHits++;
    }
  }
  assert.ok(
    lateCompletionHits >= 20,
    `Expected strong synergy-completion bias in Ch.7-12 Valkyrie drafts, got ${lateCompletionHits}/48`
  );
});

test('Phase 5 · Hero Signature Active Skills & Zero Impact on Fresh Ch.1 Baseline', () => {
  assert.equal(HEROES.length, 2);
  const effectKinds = new Set<string>();
  for (const hero of HEROES) {
    const skill = getHeroActiveSkill(hero.id);
    assert.equal(skill.heroId, hero.id);
    assert.ok(HERO_ACTIVE_SKILLS[hero.id], `Missing active skill definition for ${hero.id}`);
    assert.ok(skill.name.length > 0 && skill.desc.length > 0);
    assert.ok(skill.cooldownSec >= 8.0 && skill.cooldownSec <= 10.5);
    assert.ok(skill.damageMult >= 1.2 && skill.damageMult <= 2.0);
    effectKinds.add(skill.effectKind);
  }
  assert.equal(effectKinds.size, HEROES.length, 'Each hero must have a distinct active skill effect kind');

  // Pure Ch.1 static baseline (without pre-unlocked Solar Leo Codex items) stays untouched
  const fresh = createInitialSaveData();
  const pureBaseline = computePlayerStats({
    ...fresh,
    unlockedHeroes: ['aurelia'],
    unlockedSkins: [],
    pets: [],
    unlockedWings: [],
    unlockedMounts: ['black_dragon'],
    unlockedArtifacts: [],
    unlockedHalos: [],
  });
  assert.equal(pureBaseline.attack, 81);
  assert.equal(pureBaseline.maxHp, 442);
  assert.equal(pureBaseline.powerRating, 552);
});

test('Phase 5 · Perfect Dodge Counter Rewards & Internal Cooldown Anti-Spam', () => {
  const ready = resolvePerfectDodgeTrigger({
    internalCooldown: 0,
    activeSkillCooldown: 6.5,
    ultCharge: 75,
  });
  assert.equal(ready.triggered, true);
  assert.equal(ready.damageMultiplier, 1 + PERFECT_DODGE_DAMAGE_BONUS);
  assert.equal(ready.nextActiveSkillCooldown, 4.5);
  assert.equal(ready.nextUltCharge, 87);
  assert.equal(ready.nextInternalCooldown, PERFECT_DODGE_INTERNAL_CD);

  // Clamping at 0s cooldown and 100% ult charge
  const clamped = resolvePerfectDodgeTrigger({
    internalCooldown: 0,
    activeSkillCooldown: 1.0,
    ultCharge: 95,
  });
  assert.equal(clamped.nextActiveSkillCooldown, 0);
  assert.equal(clamped.nextUltCharge, 100);

  // Blocked while internal cooldown is active
  const blocked = resolvePerfectDodgeTrigger({
    internalCooldown: 1.2,
    activeSkillCooldown: 5.0,
    ultCharge: 40,
  });
  assert.equal(blocked.triggered, false);
  assert.equal(blocked.damageMultiplier, 1);
  assert.equal(blocked.nextActiveSkillCooldown, 5.0);
  assert.equal(blocked.nextUltCharge, 40);
});

test('Phase 5 · Nightmare Ascension I–V Unlock Gating, Monotonic Scaling & Distinct Mutators', () => {
  assert.equal(isNightmareUnlocked(0), false);
  assert.equal(isNightmareUnlocked(1), false);
  assert.equal(isNightmareUnlocked(2), false);
  assert.equal(isNightmareUnlocked(3), true);
  assert.equal(isNightmareUnlocked(12), true);

  const configs = Array.from({ length: NIGHTMARE_MAX_TIER + 1 }, (_, tier) =>
    getNightmareTierConfig(6, tier)
  );
  assert.equal(configs[0].mutators.length, 0);

  for (let t = 1; t <= NIGHTMARE_MAX_TIER; t++) {
    const prev = configs[t - 1];
    const cur = configs[t];
    assert.ok(cur.enemyHpMult > prev.enemyHpMult, `Tier ${t} HP mult must strictly increase`);
    assert.ok(cur.enemyDmgMult > prev.enemyDmgMult, `Tier ${t} DMG mult must strictly increase`);
    assert.ok(cur.goldRewardMult > prev.goldRewardMult, `Tier ${t} Gold mult must strictly increase`);
    assert.ok(
      cur.starDustRewardMult > prev.starDustRewardMult,
      `Tier ${t} StarDust mult must strictly increase`
    );
    assert.ok(
      cur.masteryExpMult > prev.masteryExpMult,
      `Tier ${t} Mastery EXP mult must strictly increase`
    );
    const ids = new Set(cur.mutators.map((m) => m.id));
    assert.equal(ids.size, cur.mutators.length, `Tier ${t} mutators must not duplicate`);
    if (t <= 2) {
      assert.equal(cur.mutators.length, 1);
    } else {
      assert.equal(cur.mutators.length, 2);
    }
  }
});

test('Phase 5 · 3D Training Grounds 5s Sliding-Window DPS Tracker', () => {
  const tracker = createTrainingDpsState();
  recordTrainingHit(tracker, 0.0, 200, false);
  recordTrainingHit(tracker, 1.0, 400, true);
  recordTrainingHit(tracker, 2.0, 300, false);
  const midSnap = recordTrainingHit(tracker, 3.0, 500, true);

  assert.equal(midSnap.totalDamage, 1400);
  assert.equal(midSnap.hits, 4);
  assert.equal(midSnap.critRatePct, 50);
  assert.ok(midSnap.dps5s > 0);
  assert.ok(midSnap.peakDps >= midSnap.dps5s);

  // After 5.5s with no new hits, sliding window evicts all stale samples while keeping peak & totals
  const expiredSnap = computeTrainingDpsSnapshot(tracker, 8.6);
  assert.equal(expiredSnap.dps5s, 0);
  assert.equal(expiredSnap.peakDps, midSnap.peakDps);
  assert.equal(expiredSnap.totalDamage, 1400);
  assert.equal(expiredSnap.hits, 4);
});

test('Phase 5 · Save Export/Import Codec (ABW5 Checksum, Tamper Rejection & Legacy JSON Migration)', () => {
  const base = createInitialSaveData();
  const sample: SaveData = {
    ...base,
    gold: 4321,
    gems: 185,
    highestChapterCleared: 5,
    bestTowerFloor: 14,
    nightmareClears: { 4: 2, 5: 1 },
    discoveredSynergies: ['storm_chain', 'frost_shatter'],
  };

  const encoded = encodeSaveTransferCode(sample);
  assert.ok(encoded.startsWith(`${SAVE_CODE_PREFIX}:`));

  const decoded = decodeSaveTransferCode(encoded);
  assert.equal(decoded.ok, true);
  assert.ok(decoded.save && decoded.preview);
  assert.equal(decoded.save.gold, 4321);
  assert.equal(decoded.save.gems, 185);
  assert.equal(decoded.save.highestChapterCleared, 5);
  assert.equal(decoded.save.nightmareClears?.[4], 2);
  assert.deepEqual(decoded.save.discoveredSynergies, ['storm_chain', 'frost_shatter']);
  assert.equal(decoded.preview.bestTowerFloor, 14);
  assert.equal(decoded.preview.version, SAVE_CODE_PREFIX);

  // Tampering with checksum must fail
  const parts = encoded.split(':');
  const badChecksum = `${parts[0]}:00000000:${parts[2]}`;
  assert.equal(decodeSaveTransferCode(badChecksum).ok, false);

  // Truncating base64 payload must fail
  const truncated = `${parts[0]}:${parts[1]}:${parts[2].slice(0, 12)}`;
  assert.equal(decodeSaveTransferCode(truncated).ok, false);

  // Raw legacy JSON without Phase 4/5 optional keys migrates cleanly
  const legacyRaw = JSON.stringify({
    gold: 750,
    gems: 40,
    highestChapterCleared: 2,
    bestStagePerChapter: { 1: 12, 2: 12 },
    inventory: base.inventory,
    equipped: base.equipped,
  });
  const legacyRes = decodeSaveTransferCode(legacyRaw);
  assert.equal(legacyRes.ok, true);
  assert.equal(legacyRes.save?.gold, 750);
  assert.equal(legacyRes.save?.highestChapterCleared, 2);
  assert.equal(legacyRes.preview?.version, 'JSON');
});

test('Phase 5 · Strategy Codex Builders (9 Skill Synergies & 12 Zodiac Bosses)', () => {
  const base = createInitialSaveData();
  const enriched: SaveData = {
    ...base,
    highestChapterCleared: 10,
    nightmareClears: { 4: 3, 10: 2 },
    discoveredSynergies: ['solar_orbit'],
    playtestMetrics: {
      ...resetPlaytestMetrics(),
      synergyPickCounts: { storm_chain: 4 },
    },
    runHistory: [
      {
        id: 'run_1',
        mode: 'chapter',
        label: 'Chương 10',
        stageReached: 12,
        kills: 92,
        maxCombo: 45,
        gold: 900,
        gems: 60,
        victory: true,
        heroId: 'artemis',
        timestamp: 1700000000000,
        activeSynergies: ['frost_shatter'],
      },
    ],
  };

  const synEntries = buildSynergyCodexEntries(enriched);
  assert.equal(synEntries.length, 9);
  const synById = Object.fromEntries(synEntries.map((s) => [s.id, s]));
  assert.equal(synById.solar_orbit.discovered, true);
  assert.equal(synById.storm_chain.discovered, true);
  assert.equal(synById.storm_chain.pickCount, 4);
  assert.equal(synById.frost_shatter.discovered, true);
  assert.equal(synById.aegis_sanctuary.discovered, false);

  const bossEntries = buildBossCodexEntries(enriched);
  assert.equal(bossEntries.length, 12);
  assert.equal(bossEntries[0].chapterId, 1);
  assert.equal(bossEntries[0].hasPhaseThree, false);
  assert.equal(bossEntries[0].punishBonusPct, 18);
  assert.equal(bossEntries[3].highestNightmareTier, 3);
  assert.equal(bossEntries[9].chapterId, 10);
  assert.equal(bossEntries[9].hasPhaseThree, true);
  assert.equal(bossEntries[9].punishBonusPct, 24);
  assert.equal(bossEntries[9].highestNightmareTier, 2);
  assert.equal(bossEntries[11].chapterId, 12);
  assert.equal(bossEntries[11].hasPhaseThree, true);
  assert.equal(bossEntries[11].cleared, false);
});

test('AAA Ch.1–3 Seeded Economy Simulation: P10/P50/P90 Rare/Epic/S-Tier unlock milestones stay strictly gated', () => {
  const percentile = (sorted: number[], p: number): number => {
    const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * p)));
    return sorted[idx];
  };

  // Simulate 120 seeded players progressing across Ch.1 (stage 4/12), Ch.2 (stage 12), and Ch.3
  const rareRolls: number[] = [];
  const epicRolls: number[] = [];
  const sTierRolls: number[] = [];

  const ch1MidPolicy = getEarlyProgressionPolicy({
    highestChapterCleared: 0,
    bestStagePerChapter: { 1: 4 },
  });
  const ch2Policy = getEarlyProgressionPolicy({
    highestChapterCleared: 1,
    bestStagePerChapter: { 1: 12, 2: 6 },
  });
  const ch4Policy = getEarlyProgressionPolicy({
    highestChapterCleared: 3,
    bestStagePerChapter: { 1: 12, 2: 12, 3: 12, 4: 4 },
  });

  for (let seed = 1; seed <= 120; seed++) {
    const rng = createMulberry32(9000 + seed * 37);
    let pity = { mythicRollsSinceEpic: 0, mythicRollsSinceSTier: 0, runeRollsSinceEpic: 0 };

    // 1) First Rare inside Ch.1 mid-chapter (policy caps at RARE, no Epic/S leak)
    let rareHit = -1;
    for (let roll = 1; roll <= 15; roll++) {
      const res = rollChestGearBatch(true, 1, pity, { policy: ch1MidPolicy, rng });
      pity = res.nextPity;
      const item = res.items[0];
      assert.ok(RARITY_RANK[item.rarity] <= RARITY_RANK[Rarity.RARE]);
      assert.equal(Boolean(GEAR_TEMPLATES[item.templateId]?.isSTier), false);
      if (rareHit === -1 && item.rarity === Rarity.RARE) {
        rareHit = roll;
      }
    }
    rareRolls.push(rareHit === -1 ? 15 : rareHit);

    // 2) First Epic once Ch.1 is cleared (pity carried from Ch.1 triggers immediately or within 10)
    let epicHit = -1;
    for (let roll = 1; roll <= 12; roll++) {
      const res = rollChestGearBatch(true, 1, pity, { policy: ch2Policy, rng });
      pity = res.nextPity;
      const item = res.items[0];
      assert.ok(RARITY_RANK[item.rarity] <= RARITY_RANK[Rarity.EPIC]);
      assert.equal(Boolean(GEAR_TEMPLATES[item.templateId]?.isSTier), false);
      if (epicHit === -1 && item.rarity === Rarity.EPIC) {
        epicHit = roll;
      }
    }
    epicRolls.push(epicHit);

    // 3) First S-Tier in Ch.4 (pity guarantees S-tier within <= 30 rolls, carried cleanly)
    let sHit = -1;
    for (let roll = 1; roll <= 35; roll++) {
      const res = rollChestGearBatch(true, 1, pity, { policy: ch4Policy, rng });
      pity = res.nextPity;
      if (sHit === -1 && GEAR_TEMPLATES[res.items[0].templateId]?.isSTier) {
        sHit = roll;
        break;
      }
    }
    sTierRolls.push(sHit);
  }

  rareRolls.sort((a, b) => a - b);
  epicRolls.sort((a, b) => a - b);
  sTierRolls.sort((a, b) => a - b);

  // Every simulated player hits Rare in Ch.1, Epic immediately/fast in Ch.2, and S-tier in Ch.4
  assert.ok(percentile(rareRolls, 0.5) <= 4, `Rare P50 expected <= 4 rolls, got ${percentile(rareRolls, 0.5)}`);
  assert.ok(percentile(epicRolls, 0.5) === 1, `Epic P50 after Ch.1 pity carryover expected 1, got ${percentile(epicRolls, 0.5)}`);
  assert.ok(percentile(epicRolls, 0.9) <= 10, `Epic P90 expected <= 10 rolls, got ${percentile(epicRolls, 0.9)}`);
  assert.ok(sTierRolls.every((r) => r >= 1 && r <= 30), 'All Ch.4 players must hit S-tier within pity window');
  assert.ok(percentile(sTierRolls, 0.5) <= 15, `S-tier P50 expected <= 15 rolls in Ch.4, got ${percentile(sTierRolls, 0.5)}`);
});

test('Aurelia is the starting hero, retired heroes are migrated, and unlocked Bellona stays selected', () => {
  const defaultHero = HEROES.find((h) => h.id === 'aurelia');
  assert.ok(defaultHero, 'Default hero definition must exist');
  assert.equal(defaultHero.name, 'Aurelia');

  const fresh = createInitialSaveData();
  assert.equal(fresh.selectedHeroId, 'aurelia');
  assert.equal(fresh.aliceDefaultMigrated, true);

  // Legacy save that referenced removed heroes, removed mounts, and old skins
  const legacySwitched = {
    ...fresh,
    selectedHeroId: 'alex',
    aliceDefaultMigrated: undefined,
    unlockedHeroes: ['alex', 'thor'],
    unlockedSkins: ['default', 'alice_ao_dai'],
    unlockedMounts: ['azure_dragon', 'aries_steed'],
    equippedMountId: 'azure_dragon',
    unlockedAstralSteeds: ['galaxy_pegasus'],
    equippedAstralSteedId: 'galaxy_pegasus',
  } as unknown as SaveData;
  const restored = migrateSaveData(legacySwitched);
  assert.equal(restored.selectedHeroId, 'aurelia');
  assert.equal(restored.aliceDefaultMigrated, true);
  assert.deepEqual(restored.unlockedHeroes, ['aurelia']);
  assert.deepEqual(restored.unlockedSkins, [
    'aurelia_oasis_dancer',
    'aurelia_temple_commander',
    'aurelia_solaris_valkyrie',
    'aurelia_winter_solstice',
  ]);
  assert.deepEqual(restored.unlockedMounts, ['solarius']);
  assert.equal(restored.equippedMountId, 'solarius');
  assert.deepEqual(restored.unlockedAstralSteeds, []);
  assert.equal(restored.equippedAstralSteedId, null);

  for (const retired of ['artemis', 'hatsune_miku'] as const) {
    const migrated = migrateSaveData({ ...fresh, selectedHeroId: retired, unlockedHeroes: [retired] });
    assert.equal(migrated.selectedHeroId, 'aurelia');
    assert.deepEqual(migrated.unlockedHeroes, ['aurelia']);
    assert.equal(migrated.gold, fresh.gold);
    assert.deepEqual(migrated.inventory, fresh.inventory);
  }
  const afterReload = migrateSaveData({
    ...restored, highestChapterCleared: 2, selectedHeroId: 'bellona',
  });
  assert.equal(afterReload.selectedHeroId, 'bellona');
  assert.deepEqual(afterReload.unlockedHeroes, ['aurelia', 'bellona']);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  ZODIAC_BOSS_REGALIA_SPECS,
  buildZodiacBossRegalia,
  disposeZodiacBossRegalia,
  getZodiacBossRegaliaSpec,
  stepZodiacBossRegalia,
} from './zodiacBossRegalia';
import {
  DEFAULT_AUTO_SALVAGE_FILTER,
  HERO_MASTERY_MILESTONES,
  WEEKLY_CHALLENGES,
  buildPerSkillDamageReport,
  claimHeroMasteryMilestone,
  claimWeeklyChallengeReward,
  collectProtectedGearUids,
  countClaimableHeroMasteryMilestones,
  countClaimableWeeklyChallenges,
  executeSmartSalvage,
  getHeroMasteryMilestoneStates,
  getIsoWeekKey,
  getPresetActiveSetSummary,
  normalizeAutoSalvageFilter,
  normalizeWeeklyChallenges,
  previewSmartSalvage,
  recordWeeklyChallengeRun,
  renameLoadoutPreset,
} from '../data/wave11RetentionSystems';
import { createInitialSaveData } from '../data/gearData';
import { validateAndSanitizeSaveIntegrity } from '../data/saveIntegrity';
import { countClaimableWelfare } from '../data/questsData';
import { GearSlot, Rarity, type GearInstance, type LoadoutPreset, type SaveData } from '../types/game';

function countVertices(root: THREE.Object3D): number {
  let total = 0;
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      const pos = mesh.geometry?.getAttribute('position');
      if (pos) total += pos.count;
    }
  });
  return total;
}

function makeGear(partial: Partial<GearInstance> & { uid: string; templateId: string }): GearInstance {
  return {
    rarity: Rarity.COMMON,
    level: 1,
    ...partial,
  };
}

// ============================================================================
// W11-1: Chapters 5-12 Procedural 3D Zodiac Boss Regalia (Armor, Crowns, Weapons)
// ============================================================================
test('W11-1: Chapters 5-12 Zodiac Boss Regalia produce 8 distinct archetypes with 0 PointLights and Lite budget reduction', () => {
  assert.equal(Object.keys(ZODIAC_BOSS_REGALIA_SPECS).length, 8);

  // Chapters 1-4 already have dedicated GLB/hero boss geometry and must return null
  for (const ch of [1, 2, 3, 4]) {
    assert.equal(getZodiacBossRegaliaSpec(ch), null);
    assert.equal(buildZodiacBossRegalia({ chapterId: ch, liteActive: false }), null);
  }

  const seenArchetypes = new Set<string>();
  const seenWeapons = new Set<string>();

  for (let ch = 5; ch <= 12; ch += 1) {
    const spec = getZodiacBossRegaliaSpec(ch);
    assert.ok(spec, `Expected regalia spec for Chapter ${ch}`);
    seenArchetypes.add(spec.weaponArchetype);
    seenWeapons.add(spec.weaponTitleVi);

    const full = buildZodiacBossRegalia({ chapterId: ch, liteActive: false });
    const lite = buildZodiacBossRegalia({ chapterId: ch, liteActive: true });
    assert.ok(full && lite, `Expected built regalia for Chapter ${ch}`);

    let pointLights = 0;
    let meshCount = 0;
    full.root.traverse((obj) => {
      if ((obj as THREE.Light).isLight) pointLights += 1;
      if ((obj as THREE.Mesh).isMesh) meshCount += 1;
    });

    assert.equal(pointLights, 0, `Chapter ${ch} boss regalia must spawn 0 dynamic lights`);
    assert.equal(full.pointLightCount, 0);
    assert.ok(meshCount >= 7, `Chapter ${ch} boss regalia should compose >= 7 meshes (got ${meshCount})`);
    assert.ok(full.animNodes.length >= 2, `Chapter ${ch} boss regalia should expose animated crown/weapon nodes`);

    const fullVerts = countVertices(full.root);
    const liteVerts = countVertices(lite.root);
    assert.ok(
      liteVerts < fullVerts,
      `Lite mode must reduce vertex count for Chapter ${ch} (lite=${liteVerts} vs full=${fullVerts})`
    );

    // Step animation in Phase 1, Phase 3, and reducedMotion without throwing
    const beforeRotZ = full.animNodes[0].object.rotation.z;
    stepZodiacBossRegalia(full.animNodes, 1.25, 3, false);
    const afterPhase3RotZ = full.animNodes[0].object.rotation.z;
    assert.ok(Number.isFinite(afterPhase3RotZ));
    stepZodiacBossRegalia(full.animNodes, 2.5, 1, true);
    assert.ok(Number.isFinite(beforeRotZ));

    assert.doesNotThrow(() => disposeZodiacBossRegalia(full));
    assert.doesNotThrow(() => disposeZodiacBossRegalia(lite));
  }

  assert.equal(seenArchetypes.size, 8, 'All 8 Chapters 5-12 bosses must have unique weapon archetypes');
  assert.equal(seenWeapons.size, 8, 'All 8 Chapters 5-12 bosses must have unique signature weapons');
});

// ============================================================================
// W11-2: Smart Auto-Salvage Excess Gear Filter & Preset/S-Tier Safety
// ============================================================================
test('W11-2: Smart Auto-Salvage strictly protects equipped, Loadout Preset, Build Preset, S-Tier, and Legendary+ items', () => {
  const base = createInitialSaveData();
  const equippedWeaponUid = base.equipped[GearSlot.WEAPON]!;

  const presetProtected = makeGear({
    uid: 'gear_preset_protected',
    templateId: 'rusty_bow',
    rarity: Rarity.COMMON,
    level: 1,
  });
  const buildProtected = makeGear({
    uid: 'gear_build_protected',
    templateId: 'rusty_bow',
    rarity: Rarity.RARE,
    level: 1,
  });
  const sTierEpic = makeGear({
    uid: 'gear_s_tier',
    templateId: 'dragon_knight_crossbow',
    rarity: Rarity.EPIC,
    level: 1,
  });
  const setPieceRare = makeGear({
    uid: 'gear_set_piece',
    templateId: 'beam_staff',
    rarity: Rarity.RARE,
    level: 1,
  });
  const upgradedCommon = makeGear({
    uid: 'gear_upgraded',
    templateId: 'rusty_bow',
    rarity: Rarity.COMMON,
    level: 5,
  });
  const plainCommon = makeGear({
    uid: 'gear_plain_common',
    templateId: 'rusty_bow',
    rarity: Rarity.COMMON,
    level: 1,
  });
  const plainRare = makeGear({
    uid: 'gear_plain_rare',
    templateId: 'rusty_bow',
    rarity: Rarity.RARE,
    level: 1,
  });
  const plainEpic = makeGear({
    uid: 'gear_plain_epic',
    templateId: 'rusty_bow',
    rarity: Rarity.EPIC,
    level: 1,
  });
  const legendaryGear = makeGear({
    uid: 'gear_legendary',
    templateId: 'rusty_bow',
    rarity: Rarity.LEGENDARY,
    level: 1,
  });

  const save: SaveData = {
    ...base,
    inventory: [
      ...base.inventory,
      presetProtected,
      buildProtected,
      sTierEpic,
      setPieceRare,
      upgradedCommon,
      plainCommon,
      plainRare,
      plainEpic,
      legendaryGear,
    ],
    loadoutPresets: [
      {
        slotId: 'preset_1',
        name: 'Đi Boss',
        heroId: base.selectedHeroId,
        equipped: { [GearSlot.WEAPON]: presetProtected.uid },
        equippedRunes: [],
        savedAt: Date.now(),
      },
    ],
    buildPresets: [
      {
        id: 'bp_1',
        name: 'Bộ 1',
        heroId: base.selectedHeroId,
        equipped: { [GearSlot.ARMOR]: buildProtected.uid },
        equippedRunes: [],
        equippedPetId: null,
        skinId: 'default',
        auraId: 'zodiac_gold',
      },
    ],
  };

  const protectedSet = collectProtectedGearUids(save);
  assert.ok(protectedSet.has(equippedWeaponUid));
  assert.ok(protectedSet.has(presetProtected.uid));
  assert.ok(protectedSet.has(buildProtected.uid));

  // Default filter (maxRarity: RARE, protectSetPieces: true, protectUpgradedOrSocketed: true)
  const previewDefault = previewSmartSalvage(save, DEFAULT_AUTO_SALVAGE_FILTER);
  const candidateUidsDefault = new Set(previewDefault.candidates.map((g) => g.uid));
  assert.ok(candidateUidsDefault.has(plainCommon.uid));
  assert.ok(candidateUidsDefault.has(plainRare.uid));
  assert.ok(!candidateUidsDefault.has(presetProtected.uid));
  assert.ok(!candidateUidsDefault.has(buildProtected.uid));
  assert.ok(!candidateUidsDefault.has(sTierEpic.uid));
  assert.ok(!candidateUidsDefault.has(setPieceRare.uid));
  assert.ok(!candidateUidsDefault.has(upgradedCommon.uid));
  assert.ok(!candidateUidsDefault.has(plainEpic.uid));
  assert.ok(!candidateUidsDefault.has(legendaryGear.uid));

  // Aggressive filter (maxRarity: EPIC, allow salvaging non-S set pieces & upgraded items) still protects S-tier, Legendary, Equipped, and Presets!
  const aggressiveFilter = normalizeAutoSalvageFilter({
    maxRarity: 'EPIC',
    protectSTier: false as unknown as true, // must always force true
    protectSetPieces: false,
    protectUpgradedOrSocketed: false,
    autoRunAfterBattle: true,
  });
  assert.equal(aggressiveFilter.protectSTier, true);

  const execRes = executeSmartSalvage(save, aggressiveFilter);
  assert.ok(execRes.salvagedCount >= 4);
  assert.ok(execRes.goldGained > 0);
  assert.ok(execRes.starDustGained > 0);
  const remainingUids = new Set(execRes.nextSave.inventory.map((g) => g.uid));
  assert.ok(remainingUids.has(equippedWeaponUid));
  assert.ok(remainingUids.has(presetProtected.uid));
  assert.ok(remainingUids.has(buildProtected.uid));
  assert.ok(remainingUids.has(sTierEpic.uid));
  assert.ok(remainingUids.has(legendaryGear.uid));
  assert.ok(!remainingUids.has(plainCommon.uid));
  assert.ok(!remainingUids.has(plainEpic.uid));
});

// ============================================================================
// W11-3: Rotating ISO-Week Weekly Challenges Progression & Claim Gating
// ============================================================================
test('W11-3: Weekly Challenges rotate on ISO week change, accumulate progress, award resources, and prevent double-claim', () => {
  const weekA = getIsoWeekKey(new Date('2026-11-23T12:00:00Z'));
  const weekB = getIsoWeekKey(new Date('2026-11-30T12:00:00Z'));
  assert.notEqual(weekA, weekB);

  let wk = normalizeWeeklyChallenges(undefined, weekA);
  assert.equal(wk.weekKey, weekA);
  assert.equal(wk.runsCompleted, 0);

  for (let i = 0; i < 6; i += 1) {
    wk = recordWeeklyChallengeRun(
      wk,
      {
        runsCompleted: 1,
        bossKills: 1,
        bossInterrupts: 1,
        elementalReactions: 5,
        heroWonId: i % 2 === 0 ? 'aurelia' : 'bellona',
      },
      weekA
    );
  }
  assert.equal(wk.runsCompleted, 6);
  assert.equal(wk.bossKills, 6);
  assert.equal(wk.bossInterrupts, 6);
  assert.equal(wk.elementalReactions, 30);
  assert.equal(wk.heroesUsedToWin.length, 2);

  assert.equal(countClaimableWeeklyChallenges(wk, weekA), WEEKLY_CHALLENGES.length);

  const saveWithWeekly: SaveData = {
    ...createInitialSaveData(),
    weeklyChallenges: wk,
  };
  const welfareCount = countClaimableWelfare(saveWithWeekly);
  assert.ok(welfareCount >= 1);

  const targetChallenge = WEEKLY_CHALLENGES[0];
  const claim1 = claimWeeklyChallengeReward(saveWithWeekly, targetChallenge.id, weekA);
  assert.equal(claim1.claimed, true);
  assert.equal(claim1.nextSave.gold, saveWithWeekly.gold + targetChallenge.rewardGold);
  assert.equal(claim1.nextSave.gems, saveWithWeekly.gems + targetChallenge.rewardGems);

  // Double-claim blocked
  const claim2 = claimWeeklyChallengeReward(claim1.nextSave, targetChallenge.id, weekA);
  assert.equal(claim2.claimed, false);
  assert.equal(claim2.nextSave.gold, claim1.nextSave.gold);

  // ISO week rollover resets progress cleanly
  const rolled = normalizeWeeklyChallenges(claim1.nextSave.weeklyChallenges, weekB);
  assert.equal(rolled.weekKey, weekB);
  assert.equal(rolled.runsCompleted, 0);
  assert.deepEqual(rolled.claimedIds, []);
});

// ============================================================================
// W11-4: Claimable Hero Mastery Milestones + Loadout Preset Rename & Set Preview
// ============================================================================
test('W11-4: Hero Mastery Milestones gate by level, unlock Lv.10 unique title, and Loadout Presets support rename + active set preview', () => {
  const base = createInitialSaveData();
  const saveLv10: SaveData = {
    ...base,
    heroMastery: {
      aurelia: { level: 10, exp: 99999, totalRuns: 40 },
    },
  };

  const states = getHeroMasteryMilestoneStates(saveLv10, 'aurelia');
  assert.equal(states.length, HERO_MASTERY_MILESTONES.length);
  assert.ok(states.every((s) => s.claimable));
  assert.equal(countClaimableHeroMasteryMilestones(saveLv10), HERO_MASTERY_MILESTONES.length);

  const resLv10 = claimHeroMasteryMilestone(saveLv10, 'aurelia', 10);
  assert.equal(resLv10.claimed, true);
  assert.ok(resLv10.rewardTitle && resLv10.rewardTitle.length > 0);
  assert.ok(resLv10.nextSave.gold > saveLv10.gold);
  assert.ok((resLv10.nextSave.starDust ?? 0) > (saveLv10.starDust ?? 0));

  // Duplicate claim prevented
  const dup = claimHeroMasteryMilestone(resLv10.nextSave, 'aurelia', 10);
  assert.equal(dup.claimed, false);

  // Low-level hero cannot claim Lv.2
  const blocked = claimHeroMasteryMilestone(base, 'bellona', 2);
  assert.equal(blocked.claimed, false);

  // Preset rename + sanitization
  const saveWithPreset: SaveData = {
    ...base,
    loadoutPresets: [
      {
        slotId: 'preset_1',
        name: 'Bộ 1',
        heroId: 'aurelia',
        equipped: base.equipped,
        equippedRunes: [],
        savedAt: 1,
      },
    ],
  };
  const renamedSave = renameLoadoutPreset(
    saveWithPreset,
    'preset_1',
    '  Săn Boss Hỏa Tốc Quá Dài Sẽ Bị Cắt Gọn  '
  );
  const preset1 = renamedSave.loadoutPresets?.find((p) => p.slotId === 'preset_1');
  assert.ok(preset1);
  assert.equal(preset1.name.length <= 22, true);
  assert.ok(preset1.name.startsWith('Săn Boss Hỏa Tốc'));

  // Active Gear Set preview detects 2pc Echo set
  const echoSave: SaveData = {
    ...base,
    inventory: [
      ...base.inventory,
      makeGear({ uid: 'echo_1', templateId: 'beam_staff', rarity: Rarity.EPIC }),
      makeGear({ uid: 'echo_2', templateId: 'echo_armor', rarity: Rarity.EPIC }),
    ],
  };
  const echoPreset: LoadoutPreset = {
    slotId: 'preset_2',
    name: 'Vang Vọng',
    heroId: 'aurelia',
    equipped: {
      [GearSlot.WEAPON]: 'echo_1',
      [GearSlot.ARMOR]: 'echo_2',
    },
    equippedRunes: [],
    savedAt: 2,
  };
  const setLabel = getPresetActiveSetSummary(echoSave, echoPreset);
  assert.ok(setLabel && setLabel.includes('(2/'), `Expected 2pc set preview, got ${setLabel}`);
});

// ============================================================================
// W11-5: Per-Skill Combat Damage Breakdown & SaveIntegrity Wave 11 Hardening
// ============================================================================
test('W11-5: Per-Skill Combat Damage Breakdown sorts rows with % share and saveIntegrity repairs corrupted Wave 11 fields', () => {
  const report = buildPerSkillDamageReport({
    basic: 25000,
    ultimate: 18000,
    pet: 6000,
    elemental: 11000,
    peakCrit: 4200,
    elapsedSeconds: 45,
    skillDamageMap: {
      basic_volley: 20000,
      weapon_overdrive: 5000,
      hero_ultimate: 12000,
      hero_active: 6000,
      elemental_reaction: 7000,
      meteor_shower: 4000,
      pet_companion: 6000,
    },
  });

  assert.equal(report.totalAttributed, 60000);
  assert.equal(report.rows.length, 7);
  assert.equal(report.mvpSkill?.key, 'basic_volley');
  assert.equal(report.rows[0].damage >= report.rows[1].damage, true);
  assert.ok(report.buildAdviceVi.length > 10);

  // Legacy DamageBreakdown fallback (without skillDamageMap) still works cleanly
  const legacyReport = buildPerSkillDamageReport({
    basic: 5000,
    ultimate: 3000,
    pet: 1000,
    elemental: 1000,
    peakCrit: 800,
    elapsedSeconds: 20,
  });
  assert.equal(legacyReport.totalAttributed, 10000);
  assert.equal(legacyReport.rows.length, 4);

  // SaveIntegrity repairs corrupted Wave 11 fields
  const validWeek = getIsoWeekKey();
  const corrupted: SaveData = {
    ...createInitialSaveData(),
    autoSalvageFilter: {
      maxRarity: 'MYTHIC' as unknown as 'RARE',
      protectSTier: false as unknown as true,
      protectSetPieces: true,
      protectUpgradedOrSocketed: true,
      autoRunAfterBattle: false,
    },
    weeklyChallenges: {
      weekKey: validWeek,
      runsCompleted: -10,
      bossKills: Number.NaN,
      bossInterrupts: 999_999_999,
      elementalReactions: 5,
      heroesUsedToWin: ['aurelia', 'aurelia'],
      claimedIds: ['wk_runs_6', 'wk_runs_6'],
    },
    claimedHeroMasteryMilestones: {
      aurelia: [2, 2, 99, 10],
    },
  };

  const integrity = validateAndSanitizeSaveIntegrity(corrupted);
  assert.equal(integrity.hadAnomalies, true);
  assert.equal(integrity.sanitizedSave.autoSalvageFilter?.protectSTier, true);
  assert.equal(integrity.sanitizedSave.autoSalvageFilter?.maxRarity, 'RARE');
  assert.equal(integrity.sanitizedSave.weeklyChallenges?.runsCompleted, 0);
  assert.deepEqual(integrity.sanitizedSave.weeklyChallenges?.heroesUsedToWin, ['aurelia']);
  assert.deepEqual(integrity.sanitizedSave.weeklyChallenges?.claimedIds, ['wk_runs_6']);
  assert.deepEqual(integrity.sanitizedSave.claimedHeroMasteryMilestones?.aurelia, [2, 10]);
});

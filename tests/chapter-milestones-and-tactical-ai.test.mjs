import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSaveData, computePlayerStats } from '../src/data/gearData.ts';
import { migrateSaveData } from '../src/data/earlyProgressionData.ts';
import {
  applyChapterCollectionMilestones,
  getChapterMilestoneSummary,
  normalizeChapterMilestones,
} from '../src/data/chapterCollectionMilestones.ts';
import { grantChapter4Collection } from '../src/data/chapter4Collection.ts';
import {
  computeSquadCoordinationVector,
  evaluateCastInterrupt,
  getChapterBossPhasePlan,
  resolveEnemyTacticalArchetype,
} from '../src/engine/tacticalCombatChoreography.ts';
import { EnemyKind } from '../src/types/game.ts';

test('Chapter Collection Milestones: Ch.2 unlocks progressively across ★1–★4 instead of dumping all 7 items on first clear', () => {
  const fresh = createInitialSaveData();
  const basePower = computePlayerStats(fresh).powerRating;

  // Clear 1: bare victory (low HP, 1 revive, 0 dodges/breaks) -> ONLY ★1 (Bellona + Pyro)
  const run1 = applyChapterCollectionMilestones(
    { ...fresh, highestChapterCleared: 2 },
    {
      chapterId: 2,
      victory: true,
      stageReached: 12,
      endHpRatio: 0.22,
      revivesUsed: 1,
      perfectDodges: 0,
      bossGuardBreaks: 0,
      castInterrupts: 0,
    }
  );
  assert.deepEqual(
    run1.newlyEarnedStars.map((s) => s.star),
    [1]
  );
  assert.ok(run1.nextSave.unlockedHeroes.includes('bellona'));
  assert.ok(run1.nextSave.pets?.some((p) => p.petId === 'pyro'));
  assert.equal(run1.nextSave.unlockedSkins?.includes('golden_fleece'), false);
  assert.equal(run1.nextSave.unlockedWings?.includes('crimson_ram_wings'), false);
  assert.equal(run1.nextSave.unlockedMounts?.includes('vulcan'), false);
  assert.equal(run1.nextSave.unlockedArtifacts?.includes('war_horn'), false);
  assert.equal(run1.nextSave.unlockedHalos?.includes('aries_vanguard'), false);

  const afterStar1Power = computePlayerStats(run1.nextSave).powerRating;
  assert.ok(
    afterStar1Power < basePower * 1.6,
    `★1 should avoid early-game power explosion (base=${basePower}, after★1=${afterStar1Power})`
  );

  // Clear 2: clean mastery run (HP >= 50%, 0 revives, 2 perfect dodges) -> earns ★2 & ★3
  const run2 = applyChapterCollectionMilestones(run1.nextSave, {
    chapterId: 2,
    victory: true,
    stageReached: 12,
    endHpRatio: 0.72,
    revivesUsed: 0,
    perfectDodges: 2,
    bossGuardBreaks: 1,
    castInterrupts: 1,
  });
  assert.deepEqual(
    run2.newlyEarnedStars.map((s) => s.star),
    [2, 3]
  );
  assert.ok(run2.nextSave.unlockedSkins?.includes('golden_fleece'));
  assert.ok(run2.nextSave.unlockedWings?.includes('crimson_ram_wings'));
  assert.ok(run2.nextSave.unlockedMounts?.includes('vulcan'));
  assert.ok(run2.nextSave.unlockedArtifacts?.includes('war_horn'));
  assert.equal(run2.nextSave.unlockedHalos?.includes('aries_vanguard'), false);

  // Reach Tower floor 16 or Ch.3 Stage 6 -> unlocks ★4 Halo
  const run3 = applyChapterCollectionMilestones(
    { ...run2.nextSave, bestTowerFloor: 16 },
    {
      chapterId: 3,
      victory: false,
      stageReached: 6,
    }
  );
  assert.ok(run3.nextSave.unlockedHalos?.includes('aries_vanguard'));
  const summaryCh2 = getChapterMilestoneSummary(run3.nextSave, 2);
  assert.equal(summaryCh2?.starCount, 4);
  assert.equal(summaryCh2?.nextStar, null);
});

test('Migration & Legacy Backfill: migrateSaveData preserves all Ch.2–Ch.4 heroes, cosmetics, mounts, presets & backfills ★1–★4', () => {
  const base = createInitialSaveData();
  const legacyFullCh4 = grantChapter4Collection({
    ...base,
    highestChapterCleared: 4,
    unlockedHeroes: ['aurelia', 'bellona', 'sylvia', 'celeste'],
    selectedHeroId: 'celeste',
    unlockedMounts: ['solarius', 'vulcan', 'jade_bull', 'celestial_wind_mount'],
    equippedMountId: 'celestial_wind_mount',
    unlockedWings: ['sun_seraph', 'crimson_ram_wings', 'emerald_taurus_wings', 'dual_gemini_wings'],
    equippedWingId: 'dual_gemini_wings',
    chapterEquipmentPresets: [
      {
        chapterId: 4,
        skinId: 'astral_mirror_queen',
        equipped: { ...base.equipped },
      },
    ],
  });

  const migrated = migrateSaveData(legacyFullCh4);
  assert.equal(migrated.selectedHeroId, 'celeste');
  assert.ok(migrated.unlockedHeroes.includes('bellona'));
  assert.ok(migrated.unlockedHeroes.includes('sylvia'));
  assert.ok(migrated.unlockedHeroes.includes('celeste'));
  assert.ok(migrated.unlockedMounts?.includes('celestial_wind_mount'));
  assert.equal(migrated.equippedMountId, 'celestial_wind_mount');
  assert.ok(migrated.unlockedWings?.includes('dual_gemini_wings'));
  assert.ok(migrated.unlockedArtifacts?.includes('twin_hourglass_relic'));
  assert.ok(migrated.unlockedHalos?.includes('gemini_halo'));
  assert.equal(migrated.chapterEquipmentPresets?.length, 1);

  const normalized = normalizeChapterMilestones(migrated);
  assert.deepEqual(normalized[4]?.starsEarned, [1, 2, 3, 4]);
});

test('Tactical AI: squad coordination separates overlapping mobs and enforces archetype flanking / standoff', () => {
  assert.equal(resolveEnemyTacticalArchetype(EnemyKind.GOLEM), 'vanguard');
  assert.equal(resolveEnemyTacticalArchetype(EnemyKind.SHADOW_STALKER), 'flanker');
  assert.equal(resolveEnemyTacticalArchetype(EnemyKind.IMP_ARCHER), 'ranged');
  assert.equal(resolveEnemyTacticalArchetype(EnemyKind.WISP), 'caster');

  // Overlapping neighbor triggers anti-clump separation
  const separated = computeSquadCoordinationVector({
    selfId: 1,
    kind: EnemyKind.GOLEM,
    x: 0,
    z: 6,
    radius: 0.9,
    baseSpeed: 3.0,
    playerX: 0,
    playerZ: 0,
    flankSign: 1,
    neighbors: [{ id: 2, x: 0.4, z: 6, radius: 0.9 }],
  });
  assert.equal(separated.separationApplied, true);
  assert.ok(separated.vx < 0, 'Vanguard must separate left away from right neighbor');

  // Ranged archer too close to hero retreats away from player
  const retreat = computeSquadCoordinationVector({
    selfId: 3,
    kind: EnemyKind.IMP_ARCHER,
    x: 0,
    z: 3.0,
    radius: 0.6,
    baseSpeed: 3.2,
    playerX: 0,
    playerZ: 0,
    flankSign: 1,
    neighbors: [],
  });
  assert.ok(retreat.vz > 0, 'Ranged mob inside 5.2u should kite away from player');
});

test('Combat Cast Interrupt: interrupts telegraphing mobs/bosses on Ultimate, Counter, or Elemental Crit while respecting cooldown', () => {
  const basicNoInterrupt = evaluateCastInterrupt({
    isBoss: false,
    isElite: false,
    telegraphType: 'shot',
    telegraphTimer: 0.4,
    interruptCooldownSec: 0,
    dmgSource: 'basic',
    isCrit: false,
    isElemental: false,
    isCounterShot: false,
  });
  assert.equal(basicNoInterrupt.interrupted, false);

  const mobInterrupt = evaluateCastInterrupt({
    isBoss: false,
    isElite: true,
    telegraphType: 'lane',
    telegraphTimer: 0.5,
    interruptCooldownSec: 0,
    dmgSource: 'ultimate',
    isCrit: true,
    isElemental: true,
    isCounterShot: false,
  });
  assert.equal(mobInterrupt.interrupted, true);
  assert.equal(mobInterrupt.cancelTelegraph, true);
  assert.ok(mobInterrupt.stunDurationSec >= 1.0);
  assert.ok(mobInterrupt.exposedDamageBonus >= 0.2);

  const bossInterrupt = evaluateCastInterrupt({
    isBoss: true,
    isElite: false,
    telegraphType: 'lunge',
    telegraphTimer: 0.45,
    interruptCooldownSec: 0,
    dmgSource: 'basic',
    isCrit: true,
    isElemental: false,
    isCounterShot: true,
  });
  assert.equal(bossInterrupt.interrupted, true);
  assert.ok(bossInterrupt.bossStaggerBonusRatio >= 0.2);
  assert.equal(bossInterrupt.floatingLabel, 'NGẮT CHIÊU BOSS!');

  const onCooldown = evaluateCastInterrupt({
    isBoss: true,
    isElite: false,
    telegraphType: 'lunge',
    telegraphTimer: 0.45,
    interruptCooldownSec: 3.0,
    dmgSource: 'ultimate',
    isCrit: true,
    isElemental: true,
    isCounterShot: true,
  });
  assert.equal(onCooldown.interrupted, false);
});

test('Boss 3-Phase Choreography: Chapters 1–4 define distinct 100%/65%/30% phases with escalating cadence and punish bonuses', () => {
  for (const chId of [1, 2, 3, 4]) {
    const p1 = getChapterBossPhasePlan(chId, 0.9);
    const p2 = getChapterBossPhasePlan(chId, 0.55);
    const p3 = getChapterBossPhasePlan(chId, 0.22);

    assert.equal(p1.phase, 1);
    assert.equal(p2.phase, 2);
    assert.equal(p3.phase, 3);
    assert.ok(p2.telegraphCadenceMult < p1.telegraphCadenceMult);
    assert.ok(p3.telegraphCadenceMult < p2.telegraphCadenceMult);
    assert.ok(p2.punishDamageBonus > p1.punishDamageBonus);
    assert.ok(p3.punishDamageBonus > p2.punishDamageBonus);
    assert.ok(p3.punishWindowDurationSec >= p1.punishWindowDurationSec);
  }
});

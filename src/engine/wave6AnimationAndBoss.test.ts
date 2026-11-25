import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyDodgeBank,
  applySkillCastPulse,
  applySpawnSettle,
  createCombatKinematicPose,
  resolveCombatAnimState,
  stepCombatKinematicPose,
  type CombatAnimState,
} from './combatAnimationKinematics';
import {
  canBossEnterPhaseThree,
  getChapterBossPhasePlan,
  ZODIAC_BOSS_PHASE_SIGNATURES,
} from './tacticalCombatChoreography';
import { LootOrbVisualCache, type LootOrbVisualKind } from './vfxPoolManager';

test('resolveCombatAnimState resolves all 12 Criterion 05 combat animation states with strict priority', () => {
  const cases: Array<[Parameters<typeof resolveCombatAnimState>[0], CombatAnimState]> = [
    [{}, 'idle'],
    [{ moveSpeedRatio: 0.25 }, 'walk'],
    [{ moveSpeedRatio: 0.85 }, 'run'],
    [{ isAttacking: true, moveSpeedRatio: 0.9 }, 'attack'],
    [{ isHitReacting: true, isAttacking: true }, 'hit_reaction'],
    [{ isCastingSkill: true, isHitReacting: true }, 'skill_cast'],
    [{ isDodging: true, isCastingSkill: true }, 'dodge'],
    [{ isKnockedBack: true, isDodging: true }, 'knockback'],
    [{ isStunned: true, isKnockedBack: true }, 'stun'],
    [{ isSpawning: true, isStunned: true }, 'spawn'],
    [{ isVictory: true, isSpawning: true }, 'victory'],
    [{ isDead: true, isVictory: true, isStunned: true }, 'death'],
  ];

  const seen = new Set<CombatAnimState>();
  for (const [input, expected] of cases) {
    const res = resolveCombatAnimState(input);
    assert.equal(res.state, expected);
    assert.ok(res.fadeSec >= 0.05 && res.fadeSec <= 0.25, `fadeSec out of range for ${expected}`);
    seen.add(res.state);
  }
  assert.equal(seen.size, 12, 'Must cover all 12 combat animation states');
});

test('stepCombatKinematicPose blends dodge lean, skill cast lift, spawn settle, death collapse, and reducedMotion damping', () => {
  const pose = createCombatKinematicPose();
  const out = { offsetY: 0, rotX: 0, rotZ: 0, scaleY: 1 };

  applySpawnSettle(pose, false);
  stepCombatKinematicPose(pose, 0.016, { reducedMotion: false }, out);
  assert.ok(out.offsetY > 0.2, 'spawn settle should start with elevated settle drop');
  assert.equal(pose.active, true);

  const dodgePose = createCombatKinematicPose();
  applyDodgeBank(dodgePose, 1.0, false);
  stepCombatKinematicPose(dodgePose, 0.016, { reducedMotion: false }, out);
  assert.ok(out.rotX > 0.15, 'dodge bank should lean body forward');

  const reducedDodgePose = createCombatKinematicPose();
  applyDodgeBank(reducedDodgePose, 1.0, true);
  const reducedOut = { offsetY: 0, rotX: 0, rotZ: 0, scaleY: 1 };
  stepCombatKinematicPose(reducedDodgePose, 0.016, { reducedMotion: true }, reducedOut);
  assert.ok(reducedOut.rotX < out.rotX * 0.4, 'reducedMotion must dampen dodge lean');

  const castPose = createCombatKinematicPose();
  applySkillCastPulse(castPose, 1.15, false);
  stepCombatKinematicPose(castPose, 0.016, { reducedMotion: false }, out);
  assert.ok(out.offsetY > 0.1, 'skill cast pulse should lift character cleanly');
  assert.ok(out.scaleY > 1.02, 'skill cast pulse should apply upward stretch');

  const deathPose = createCombatKinematicPose();
  for (let i = 0; i < 15; i++) {
    stepCombatKinematicPose(deathPose, 0.05, { isDead: true, reducedMotion: false }, out);
  }
  assert.ok(out.offsetY < -0.15, 'death pose should collapse vertically');
  assert.ok(out.rotX > 0.25, 'death pose should pitch down cleanly');
});

test('canBossEnterPhaseThree enables Phase III for Ch.1-4 & Ch.10-12 final Zodiac Bosses and Tower Floor 20+', () => {
  for (const ch of [1, 2, 3, 4, 10, 11, 12]) {
    assert.equal(
      canBossEnterPhaseThree(ch, false, 1, true),
      true,
      `Chapter ${ch} final Zodiac Boss should support Phase III`
    );
    assert.equal(
      canBossEnterPhaseThree(ch, false, 1, false),
      false,
      `Chapter ${ch} non-final sub-boss must not trigger Phase III`
    );
  }

  for (const ch of [5, 6, 7, 8, 9]) {
    assert.equal(
      canBossEnterPhaseThree(ch, false, 1, true),
      false,
      `Chapter ${ch} story boss remains 2-phase`
    );
  }

  assert.equal(canBossEnterPhaseThree(1, true, 19, true), false);
  assert.equal(canBossEnterPhaseThree(1, true, 20, true), true);
  assert.equal(canBossEnterPhaseThree(6, true, 25, false), true);
});

test('all 12 Zodiac Bosses have bespoke Phase II & Phase III titles and counterplay hints', () => {
  const phase2Titles = new Set<string>();
  const phase3Titles = new Set<string>();

  for (let ch = 1; ch <= 12; ch++) {
    const sig = ZODIAC_BOSS_PHASE_SIGNATURES[ch];
    assert.ok(sig, `Missing Zodiac signature for chapter ${ch}`);

    const p2 = getChapterBossPhasePlan(ch, 0.5);
    assert.equal(p2.phase, 2);
    assert.equal(p2.phaseTitle, sig.phase2Title);
    assert.equal(p2.counterplayHint, sig.phase2Counterplay);
    assert.ok(p2.counterplayHint.length >= 20, `Ch.${ch} Phase II counterplay hint too short`);
    phase2Titles.add(p2.phaseTitle);

    const p3 = getChapterBossPhasePlan(ch, 0.2);
    assert.equal(p3.phase, 3);
    assert.equal(p3.phaseTitle, sig.phase3Title);
    assert.equal(p3.counterplayHint, sig.phase3Counterplay);
    assert.equal(p3.supportsPhaseThree, ch <= 4 || ch >= 10);
    phase3Titles.add(p3.phaseTitle);
  }

  assert.equal(phase2Titles.size, 12, 'All 12 chapters must have unique Phase II titles');
  assert.equal(phase3Titles.size, 12, 'All 12 chapters must have unique Phase III titles');
});

test('LootOrbVisualCache shares geometry and material instances across 100 drops and disposes cleanly', () => {
  const cache = new LootOrbVisualCache();
  const kinds: LootOrbVisualKind[] = ['xp', 'gold', 'gem', 'heal'];
  const meshes = [];
  for (let i = 0; i < 100; i++) {
    meshes.push(cache.createMesh(kinds[i % kinds.length]));
  }

  const geometries = new Set(meshes.map((m) => m.geometry));
  const materials = new Set(meshes.map((m) => m.material));
  assert.equal(geometries.size, 2, 'Should share exactly 2 OctahedronGeometry instances (standard & gem)');
  assert.equal(materials.size, 4, 'Should share exactly 4 MeshStandardMaterial instances (xp, gold, gem, heal)');

  // Verify same-kind meshes point to identical GPU material & geometry references
  assert.equal(meshes[0].geometry, meshes[4].geometry);
  assert.equal(meshes[0].material, meshes[4].material);
  assert.notEqual(meshes[0].geometry, meshes[2].geometry); // xp vs gem radius

  cache.dispose();

  // Re-creating after dispose allocates fresh valid GPU resources without throwing
  const postDisposeMesh = cache.createMesh('gold');
  assert.notEqual(postDisposeMesh.geometry, meshes[1].geometry);
  assert.notEqual(postDisposeMesh.material, meshes[1].material);
  cache.dispose();
});

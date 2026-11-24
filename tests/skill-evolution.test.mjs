import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SKILL_EVOLUTIONS,
  SKILL_EVOLUTION_BASE_LINES,
  buildEvolutionCodexEntries,
  getEligibleEvolutionOffers,
  isCoreSkillReadyForEvolution,
  resolveEvolutionCombatModifiers,
  sanitizeDiscoveredEvolutions,
  selectAiEvolutionBranch,
} from '../src/engine/skillEvolutionEngine.ts';
import { createInitialSaveData } from '../src/data/gearData.ts';

test('Skill Evolution catalog defines 12 branching evolutions across 6 core lines', () => {
  assert.equal(SKILL_EVOLUTION_BASE_LINES.length, 6);
  assert.equal(SKILL_EVOLUTIONS.length, 12);
  for (const baseId of SKILL_EVOLUTION_BASE_LINES) {
    const branches = SKILL_EVOLUTIONS.filter((e) => e.baseSkillId === baseId);
    assert.equal(branches.length, 2, `Expected 2 branches for ${baseId}`);
    assert.ok(branches.some((b) => b.branch === 'boss'));
    assert.ok(branches.some((b) => b.branch === 'aoe'));
  }
});

test('Skill Evolution unlocks at stack >= 2 or with super counterpart and enforces mutual exclusivity', () => {
  assert.equal(isCoreSkillReadyForEvolution('fire_arrow', { fire_arrow: 1 }), false);
  assert.equal(isCoreSkillReadyForEvolution('fire_arrow', { fire_arrow: 2 }), true);
  assert.equal(
    isCoreSkillReadyForEvolution('fire_arrow', { fire_arrow: 1, super_blaze: 1 }),
    true
  );

  const offers = getEligibleEvolutionOffers({ fire_arrow: 2, ice_arrow: 2 }, []);
  assert.equal(offers.length, 2);
  assert.equal(offers[0].baseSkillId, 'fire_arrow');

  // Once Boss branch is chosen for fire_arrow, neither fire_arrow branch is offered again
  const afterPick = getEligibleEvolutionOffers(
    { fire_arrow: 2, ice_arrow: 2 },
    ['evo_fire_solar_lance']
  );
  assert.equal(afterPick.length, 1);
  assert.equal(afterPick[0].baseSkillId, 'ice_arrow');
});

test('Skill Evolution combat modifiers mutate real Boss and AoE combat mechanics', () => {
  const bossMods = resolveEvolutionCombatModifiers([
    'evo_fire_solar_lance',
    'evo_ice_brittle_shatter',
    'evo_bolt_overload_arc',
    'evo_multi_deadeye_rail',
    'evo_orbs_sentinel_bastion',
    'evo_sword_boss_executioner',
  ]);
  assert.ok(bossMods.bossDamageMult > 1.2);
  assert.ok(bossMods.burnDamageMult > 1.4);
  assert.ok(bossMods.chilledTargetDamageMult > 1.25);
  assert.ok(bossMods.bossShieldBreakMult > 1.2);
  assert.ok(bossMods.lightningDamageMult > 1.3);
  assert.ok(bossMods.attackSpeedMult > 1.15);
  assert.ok(bossMods.critDamageBonus >= 0.3);
  assert.ok(bossMods.roomStartShieldRatio >= 0.18);
  assert.ok(bossMods.damageTakenMult < 0.9);
  assert.ok(bossMods.swordBossDamageMult > 1.4);

  const aoeMods = resolveEvolutionCombatModifiers([
    'evo_fire_inferno_ring',
    'evo_ice_glacier_nova',
    'evo_bolt_storm_web',
    'evo_multi_tempest_fan',
    'evo_orbs_sawblade_vortex',
    'evo_sword_blade_storm',
  ]);
  assert.ok(aoeMods.fireAoeRadius >= 3.0);
  assert.ok(aoeMods.iceNovaRadius >= 3.5);
  assert.equal(aoeMods.lightningExtraJumps, 3);
  assert.equal(aoeMods.extraDiagonalArrows, 2);
  assert.equal(aoeMods.extraRicochet, 1);
  assert.ok(aoeMods.orbitSpeedMult > 1.5);
  assert.equal(aoeMods.extraFlyingSwords, 2);
  assert.ok(aoeMods.swordCooldownMult < 0.75);
});

test('AI Auto-Pilot branch selection & Evolution Codex sanitization work deterministically', () => {
  const offers = getEligibleEvolutionOffers({ fire_arrow: 2, orbit_orbs: 2 }, []);
  const bossPick = selectAiEvolutionBranch(offers[0], 'balanced', true);
  assert.equal(bossPick.branch, 'boss');
  const aoePick = selectAiEvolutionBranch(offers[0], 'balanced', false);
  assert.equal(aoePick.branch, 'aoe');
  const evasiveOrbPick = selectAiEvolutionBranch(offers[1], 'evasive', false);
  assert.equal(evasiveOrbPick.id, 'evo_orbs_sentinel_bastion');

  const clean = sanitizeDiscoveredEvolutions([
    'evo_fire_solar_lance',
    'evo_fire_solar_lance',
    'invalid_id',
    123,
  ]);
  assert.deepEqual(clean, ['evo_fire_solar_lance']);

  const save = { ...createInitialSaveData(), discoveredEvolutions: clean };
  const codex = buildEvolutionCodexEntries(save);
  assert.equal(codex.length, 12);
  assert.equal(codex.filter((c) => c.discovered).length, 1);
});

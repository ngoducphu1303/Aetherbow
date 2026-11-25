import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAaaMobSteering,
  resolveMobRecoveryDuration,
  type AaaMobSteeringResult,
} from './aaaEnemyCombatEngine';
import {
  getSkillEvolutionPreview,
  SKILL_EVOLUTION_BASE_LINES,
} from './skillEvolutionEngine';
import {
  computeGearComparison,
  createInitialSaveData,
  GEAR_TEMPLATES,
} from '../data/gearData';
import { Rarity, type GearInstance } from '../types/game';

function makeOut(): AaaMobSteeringResult {
  return {
    vx: 0,
    vz: 0,
    desiredDirX: 0,
    desiredDirZ: 1,
    targetYaw: 0,
    lateralSpeed: 0,
    forwardSpeed: 0,
    bankRoll: 0,
    bankPitch: 0,
    isSkidding: false,
    aiState: 'chase',
  };
}

test('W8-1a: Enemy AI resolves all 7 tactical states (patrol, chase, flank, attack, retreat, dodge, recovery)', () => {
  const base = {
    selfId: 10,
    vx: 0,
    vz: 0,
    radius: 0.75,
    baseSpeed: 4.2,
    facingYaw: 0,
    playerX: 0,
    playerZ: 0,
    flankSign: 1,
    isTelegraphing: false,
    activeSkill: '' as const,
    sideHopTimer: 0,
    sideHopDirX: 1,
    sideHopDirZ: 0,
    elapsedTime: 1.5,
    dt: 0.05,
    currentBankRoll: 0,
    currentBankPitch: 0,
  };

  // 1. Patrol at long range (>15.5u)
  const patrol = computeAaaMobSteering({ ...base, kind: 'GOLEM', x: 0, z: 18 }, makeOut());
  assert.equal(patrol.aiState, 'patrol');

  // 2. Chase at mid range with attack token
  const chase = computeAaaMobSteering(
    { ...base, kind: 'GOLEM', x: 0, z: 8, hasAttackToken: true },
    makeOut()
  );
  assert.equal(chase.aiState, 'chase');

  // 3. Flank when waiting for an attack token from EnemySquadDirector
  const flank = computeAaaMobSteering(
    { ...base, kind: 'GOLEM', x: 0, z: 7, hasAttackToken: false },
    makeOut()
  );
  assert.equal(flank.aiState, 'flank');

  // 4. Attack while telegraphing
  const attack = computeAaaMobSteering(
    { ...base, kind: 'SKIRMISHER', x: 0, z: 4, isTelegraphing: true, activeSkill: 'flank_crescent_swipe' },
    makeOut()
  );
  assert.equal(attack.aiState, 'attack');

  // 5. Retreat when ranged mob is crowded or low HP (<35%)
  const retreat = computeAaaMobSteering(
    { ...base, kind: 'IMP_ARCHER', x: 0, z: 8.5, hpRatio: 0.25 },
    makeOut()
  );
  assert.equal(retreat.aiState, 'retreat');
  assert.ok(retreat.desiredDirZ > 0.2, 'Retreating ranged mob must back away from player at origin');

  // 6. Dodge during lateral evasive hop
  const dodge = computeAaaMobSteering(
    { ...base, kind: 'SHADOW_STALKER', x: 0, z: 4, sideHopTimer: 0.2, sideHopDirX: 1, sideHopDirZ: 0 },
    makeOut()
  );
  assert.equal(dodge.aiState, 'dodge');

  // 7. Recovery post-attack opening slows movement cleanly for player counterplay
  const recovery = computeAaaMobSteering(
    { ...base, kind: 'GOLEM', x: 0, z: 6, recoveryTimer: 0.45 },
    makeOut()
  );
  assert.equal(recovery.aiState, 'recovery');
  const chaseSpeed = Math.hypot(chase.vx, chase.vz);
  const recoverySpeed = Math.hypot(recovery.vx, recovery.vz);
  assert.ok(
    recoverySpeed < chaseSpeed * 0.65,
    `Recovery speed (${recoverySpeed.toFixed(2)}) must be slower than chase speed (${chaseSpeed.toFixed(2)})`
  );

  // Recovery duration scales monotonically from early chapters (generous) to late chapters (brisker)
  assert.ok(resolveMobRecoveryDuration('GOLEM', 1) > resolveMobRecoveryDuration('GOLEM', 12));
  assert.ok(resolveMobRecoveryDuration('GOLEM', 1) > resolveMobRecoveryDuration('SHADOW_STALKER', 1));
});

test('W8-1b: Retreating ranged/caster units screen behind nearby allied Vanguard tanks', () => {
  // Player at (0,0); Imp Archer at (0, 5) retreating; allied Vanguard tank at (3, 3.2)
  const withoutVanguard = computeAaaMobSteering(
    {
      kind: 'IMP_ARCHER',
      selfId: 2,
      x: 0,
      z: 5,
      vx: 0,
      vz: 0,
      radius: 0.65,
      baseSpeed: 4.0,
      facingYaw: 0,
      playerX: 0,
      playerZ: 0,
      flankSign: -1, // normal tangent points -X
      isTelegraphing: false,
      sideHopTimer: 0,
      sideHopDirX: 0,
      sideHopDirZ: 0,
      elapsedTime: 2,
      dt: 0.05,
      currentBankRoll: 0,
      currentBankPitch: 0,
      hpRatio: 0.3,
      neighbors: [],
    },
    makeOut()
  );

  const withVanguard = computeAaaMobSteering(
    {
      kind: 'IMP_ARCHER',
      selfId: 2,
      x: 0,
      z: 5,
      vx: 0,
      vz: 0,
      radius: 0.65,
      baseSpeed: 4.0,
      facingYaw: 0,
      playerX: 0,
      playerZ: 0,
      flankSign: -1,
      isTelegraphing: false,
      sideHopTimer: 0,
      sideHopDirX: 0,
      sideHopDirZ: 0,
      elapsedTime: 2,
      dt: 0.05,
      currentBankRoll: 0,
      currentBankPitch: 0,
      hpRatio: 0.3,
      neighbors: [
        { id: 1, x: 3.2, z: 3.2, radius: 1.0, archetype: 'vanguard' },
      ],
    },
    makeOut()
  );

  assert.equal(withVanguard.aiState, 'retreat');
  assert.ok(
    withVanguard.desiredDirX > withoutVanguard.desiredDirX + 0.25,
    `Archer should pull toward +X behind the allied vanguard (${withVanguard.desiredDirX.toFixed(2)} vs ${withoutVanguard.desiredDirX.toFixed(2)})`
  );
});

test('W8-2: getSkillEvolutionPreview accurately predicts 1/2 progress, immediate evolution trigger, and already-evolved state', () => {
  for (const baseSkill of SKILL_EVOLUTION_BASE_LINES) {
    const firstPick = getSkillEvolutionPreview(baseSkill, {}, []);
    assert.ok(firstPick, `${baseSkill} should return evolution preview on first pick`);
    assert.equal(firstPick.status, 'one_away');
    assert.ok(firstPick.branchBossName.length > 0 && firstPick.branchAoeName.length > 0);

    const secondPick = getSkillEvolutionPreview(baseSkill, { [baseSkill]: 1 }, []);
    assert.ok(secondPick, `${baseSkill} should return triggers_now on second pick`);
    assert.equal(secondPick.status, 'triggers_now');
  }

  // Super counterpart + 1 base stack also triggers immediately
  const superTrigger = getSkillEvolutionPreview('super_blaze', { fire_arrow: 1 }, []);
  assert.equal(superTrigger?.status, 'triggers_now');
  assert.equal(superTrigger?.baseSkillId, 'fire_arrow');

  // Once evolved, status is already_evolved and no longer shows triggers_now
  const already = getSkillEvolutionPreview('fire_arrow', { fire_arrow: 2 }, ['evo_fire_solar_lance']);
  assert.equal(already?.status, 'already_evolved');
  assert.equal(already?.evolvedName, 'Thương Nhật Luân');
});

test('W8-3: computeGearComparison calculates exact stat-by-stat deltas and 2-piece Set Bonus gain/loss transitions', () => {
  const save = createInitialSaveData();
  // Find two templates from Echo Set (e.g., Weapon + Armor) to verify 2pc Set Bonus gain/loss
  const echoTemplates = Object.values(GEAR_TEMPLATES).filter((t) => t.setName === 'Echo Set');
  assert.ok(echoTemplates.length >= 2, 'Echo Set must have at least 2 gear slots');
  const echoSlotA = echoTemplates[0];
  const echoSlotB = echoTemplates.find((t) => t.slot !== echoSlotA.slot)!;

  const pieceA: GearInstance = {
    uid: 'test_echo_a',
    templateId: echoSlotA.templateId,
    rarity: Rarity.EPIC,
    level: 10,
  };
  const pieceB: GearInstance = {
    uid: 'test_echo_b',
    templateId: echoSlotB.templateId,
    rarity: Rarity.EPIC,
    level: 12,
  };
  const starterInSlotB = save.inventory.find((g) => g.uid === save.equipped[echoSlotB.slot]);

  save.inventory.push(pieceA, pieceB);
  save.equipped[echoSlotA.slot] = pieceA.uid;

  const cmpGain = computeGearComparison(pieceB, starterInSlotB, save, save.socketGems);
  assert.ok(cmpGain.powerDelta > 0, 'Epic Lv.12 piece should exceed starter gear LC');
  assert.equal(cmpGain.recommendation, 'upgrade');
  assert.ok(
    cmpGain.statDeltas.atk !== 0 || cmpGain.statDeltas.hp !== 0,
    'At least one primary combat stat delta must be non-zero'
  );
  const gainedEcho2pc = cmpGain.setChanges.find(
    (c) => c.setId === 'Echo Set' && c.piecesRequired === 2 && c.direction === 'gained'
  );
  assert.ok(gainedEcho2pc, 'Swapping second Echo Set piece must report gaining 2-piece Echo Set bonus');

  // Equip pieceB, then compare swapping back to starter -> must warn about losing 2-piece Echo Set!
  save.equipped[echoSlotB.slot] = pieceB.uid;
  if (starterInSlotB) {
    const cmpLoss = computeGearComparison(starterInSlotB, pieceB, save, save.socketGems);
    assert.ok(cmpLoss.powerDelta < 0);
    assert.equal(cmpLoss.recommendation, 'downgrade');
    const lostEcho2pc = cmpLoss.setChanges.find(
      (c) => c.setId === 'Echo Set' && c.piecesRequired === 2 && c.direction === 'lost'
    );
    assert.ok(lostEcho2pc, 'Swapping out an Echo Set piece must warn about losing 2-piece Echo Set bonus');
  }
});

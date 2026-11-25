import test from 'node:test';
import assert from 'node:assert/strict';
import { EnemyKind } from '../types/game';
import {
  classifySquadRole,
  computeSquadWaitingFlankImpulse,
  createEnemySquadDirectorState,
  pruneSquadAttackTokens,
  releaseSquadAttackToken,
  requestSquadAttackToken,
  resolveCrowdAttackTokenBudget,
} from './enemySquadDirector';

test('resolveCrowdAttackTokenBudget scales 2..5 by chapter, Lite Mode, and Boss presence', () => {
  assert.equal(
    resolveCrowdAttackTokenBudget({ chapterId: 1, isLiteMode: false, hasActiveBoss: false }),
    3
  );
  assert.equal(
    resolveCrowdAttackTokenBudget({ chapterId: 6, isLiteMode: false, hasActiveBoss: false }),
    4
  );
  assert.equal(
    resolveCrowdAttackTokenBudget({ chapterId: 12, isLiteMode: false, hasActiveBoss: false }),
    5
  );
  // Dell Latitude E5430 Lite Mode strictly caps <= 3 concurrent attackers
  assert.equal(
    resolveCrowdAttackTokenBudget({ chapterId: 12, isLiteMode: true, hasActiveBoss: false }),
    3
  );
  // Boss room reduces non-boss add pressure by 1 down to floor 2
  assert.equal(
    resolveCrowdAttackTokenBudget({ chapterId: 12, isLiteMode: true, hasActiveBoss: true }),
    2
  );
  assert.equal(
    resolveCrowdAttackTokenBudget({ chapterId: 12, isLiteMode: false, hasActiveBoss: true }),
    4
  );
});

test('requestSquadAttackToken strictly caps concurrent attackers and releases cleanly', () => {
  const state = createEnemySquadDirectorState();
  const budget = 3;
  const now = 10.0;

  const r1 = requestSquadAttackToken(
    state,
    { enemyId: 101, kind: EnemyKind.SKIRMISHER, distToPlayer: 4.0 },
    budget,
    now,
    1.5
  );
  const r2 = requestSquadAttackToken(
    state,
    { enemyId: 102, kind: EnemyKind.GOLEM, distToPlayer: 5.0 },
    budget,
    now,
    1.5
  );
  const r3 = requestSquadAttackToken(
    state,
    { enemyId: 103, kind: EnemyKind.IMP_ARCHER, distToPlayer: 9.0 },
    budget,
    now,
    1.5
  );
  const r4 = requestSquadAttackToken(
    state,
    { enemyId: 104, kind: EnemyKind.SHADOW_STALKER, distToPlayer: 6.0 },
    budget,
    now,
    1.5
  );

  assert.equal(r1.granted, true);
  assert.equal(r2.granted, true);
  assert.equal(r3.granted, true);
  assert.equal(r4.granted, false);
  assert.equal(r4.reason, 'budget_full');
  assert.ok(r4.retryDelaySec >= 0.25 && r4.retryDelaySec <= 0.65);

  // Releasing enemy 101 immediately frees a token for enemy 104
  releaseSquadAttackToken(state, 101);
  const r4Retry = requestSquadAttackToken(
    state,
    { enemyId: 104, kind: EnemyKind.SHADOW_STALKER, distToPlayer: 6.0 },
    budget,
    now + 0.4,
    1.5
  );
  assert.equal(r4Retry.granted, true);
  assert.equal(r4Retry.activeTokens, 3);

  // Pruning dead enemies frees tokens immediately
  pruneSquadAttackTokens(state, new Set([104]), now + 0.5);
  assert.equal(state.activeTokens.size, 1);
});

test('ranged role balance reserves 1 melee slot when budget >= 3 unless ranged unit waited long', () => {
  const state = createEnemySquadDirectorState();
  const budget = 3;
  const now = 20.0;

  assert.equal(classifySquadRole(EnemyKind.IMP_ARCHER), 'ranged');
  assert.equal(classifySquadRole(EnemyKind.WISP), 'ranged');

  assert.equal(
    requestSquadAttackToken(state, { enemyId: 1, kind: EnemyKind.IMP_ARCHER, distToPlayer: 10 }, budget, now, 2).granted,
    true
  );
  assert.equal(
    requestSquadAttackToken(state, { enemyId: 2, kind: EnemyKind.WISP, distToPlayer: 9 }, budget, now, 2).granted,
    true
  );

  // Third ranged mob with fresh history is deferred to preserve 1 melee slot
  state.lastGrantedAtSec.set(3, now - 1.0);
  const thirdRanged = requestSquadAttackToken(
    state,
    { enemyId: 3, kind: EnemyKind.IMP_ARCHER, distToPlayer: 8 },
    budget,
    now,
    2
  );
  assert.equal(thirdRanged.granted, false);
  assert.equal(thirdRanged.reason, 'role_reserved');

  // A vanguard melee unit gets the reserved slot cleanly
  const meleeSlot = requestSquadAttackToken(
    state,
    { enemyId: 4, kind: EnemyKind.GOLEM, distToPlayer: 4 },
    budget,
    now,
    2
  );
  assert.equal(meleeSlot.granted, true);
});

test('computeSquadWaitingFlankImpulse backs off close ranged enemies and orbits smoothly', () => {
  // Ranged unit too close (dist=3 vs preferred 9.2) should retreat away from player (-x) while orbiting
  const impulse = computeSquadWaitingFlankImpulse({
    enemyX: 3,
    enemyZ: 0,
    playerX: 0,
    playerZ: 0,
    role: 'ranged',
    flankSign: 1,
    baseSpeed: 5,
  });
  assert.ok(impulse.vx > 0, `Expected ranged enemy at x=3 to retreat +x away from player at x=0, got vx=${impulse.vx}`);
  assert.ok(Math.abs(impulse.vz) > 0.5, 'Expected lateral orbit component while waiting for token');
});

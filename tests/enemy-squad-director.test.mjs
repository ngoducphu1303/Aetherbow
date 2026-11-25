import test from 'node:test';
import assert from 'node:assert/strict';
import { EnemyKind } from '../src/types/game.ts';
import {
  classifySquadRole,
  computeSquadWaitingFlankImpulse,
  createEnemySquadDirectorState,
  pruneSquadAttackTokens,
  releaseSquadAttackToken,
  requestSquadAttackToken,
  resolveCrowdAttackTokenBudget,
} from '../src/engine/enemySquadDirector.ts';

test('EnemySquadDirector caps simultaneous mob attacks and lets Boss rooms stay readable', () => {
  const state = createEnemySquadDirectorState();
  const budget = resolveCrowdAttackTokenBudget({
    chapterId: 2,
    isLiteMode: false,
    hasActiveBoss: false,
  });
  assert.equal(budget.maxTotalConcurrent, 2);

  const a = requestSquadAttackToken(
    state,
    { enemyId: 1, kind: EnemyKind.SKIRMISHER, distToPlayer: 4.0 },
    budget,
    10.0,
    1.5
  );
  const b = requestSquadAttackToken(
    state,
    { enemyId: 2, kind: EnemyKind.IMP_ARCHER, distToPlayer: 8.5 },
    budget,
    10.1,
    1.5
  );
  const c = requestSquadAttackToken(
    state,
    { enemyId: 3, kind: EnemyKind.GOLEM, distToPlayer: 5.0 },
    budget,
    10.2,
    1.5
  );

  assert.equal(a.granted, true);
  assert.equal(b.granted, true);
  assert.equal(c.granted, false);
  assert.ok(c.retryDelaySec >= 0.45);

  // Releasing enemy 1 frees a token immediately
  releaseSquadAttackToken(state, 1);
  const cRetry = requestSquadAttackToken(
    state,
    { enemyId: 3, kind: EnemyKind.GOLEM, distToPlayer: 5.0 },
    budget,
    10.5,
    1.5
  );
  assert.equal(cRetry.granted, true);

  // Boss room reduces concurrent minion attacks
  const bossBudget = resolveCrowdAttackTokenBudget({
    chapterId: 4,
    isLiteMode: true,
    hasActiveBoss: true,
  });
  assert.equal(bossBudget.maxMeleeConcurrent, 1);
  assert.equal(bossBudget.maxRangedConcurrent, 1);
});

test('EnemySquadDirector prunes dead/expired tokens and computes tangential waiting flank vectors', () => {
  const state = createEnemySquadDirectorState();
  const budget = resolveCrowdAttackTokenBudget({
    chapterId: 6,
    isLiteMode: false,
    hasActiveBoss: false,
  });
  requestSquadAttackToken(state, { enemyId: 11, kind: EnemyKind.WISP, distToPlayer: 7 }, budget, 1.0, 1.0);
  requestSquadAttackToken(state, { enemyId: 12, kind: EnemyKind.GOLEM, distToPlayer: 4 }, budget, 1.0, 3.0);

  pruneSquadAttackTokens(state, new Set([12]), 2.5);
  assert.equal(state.activeTokens.has(11), false);
  assert.equal(state.activeTokens.has(12), true);

  assert.equal(classifySquadRole(EnemyKind.WISP), 'caster');
  assert.equal(classifySquadRole(EnemyKind.IMP_ARCHER), 'ranged');
  assert.equal(classifySquadRole(EnemyKind.SKIRMISHER), 'melee');

  const orbit = computeSquadWaitingFlankImpulse({
    enemyX: 5,
    enemyZ: 0,
    playerX: 0,
    playerZ: 0,
    role: 'melee',
    flankSign: 1,
    baseSpeed: 4,
  });
  assert.ok(Math.abs(orbit.vz) > 1.5, 'Waiting enemy should orbit tangentially around player');
});

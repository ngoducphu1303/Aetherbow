import test from 'node:test';
import assert from 'node:assert/strict';
import { EnemyKind } from '../src/types/game.ts';
import {
  clampKnockbackInsideArena,
  computeSquadCoordinationVector,
  resolveEnemyTacticalArchetype,
  resolveObstacleFreeSpawnPosition,
} from '../src/engine/tacticalCombatChoreography.ts';

test('Obstacle-Aware Steering routes enemies cleanly around nearby pillars', () => {
  const res = computeSquadCoordinationVector({
    selfId: 10,
    kind: EnemyKind.SKIRMISHER,
    x: 0,
    z: 3.1,
    radius: 0.6,
    baseSpeed: 4.0,
    playerX: 0,
    playerZ: 0,
    flankSign: 1,
    neighbors: [],
    obstacles: [{ x: 0, z: 1.8, radius: 1.0 }],
  });
  assert.equal(res.obstacleAvoidanceApplied, true);
  assert.ok(Math.hypot(res.vx, res.vz) > 0.1);
});

test('Coordinated Squad Formation Synergy pairs Vanguards with allied Ranged/Casters', () => {
  const casterVec = computeSquadCoordinationVector({
    selfId: 2,
    kind: EnemyKind.WISP,
    x: 1.5,
    z: 5.5,
    radius: 0.55,
    baseSpeed: 3.6,
    playerX: 0,
    playerZ: 0,
    flankSign: -1,
    neighbors: [
      {
        id: 1,
        x: 0.4,
        z: 4.0,
        radius: 0.85,
        archetype: resolveEnemyTacticalArchetype(EnemyKind.GOLEM),
      },
    ],
    obstacles: [],
  });
  assert.equal(casterVec.archetype, 'caster');
  assert.equal(casterVec.formationSynergyActive, true);
});

test('resolveObstacleFreeSpawnPosition pushes trapped spawn coordinates outside pillars and walls', () => {
  const obstacles = [{ x: 4, z: 4, radius: 1.5 }];
  const fixed = resolveObstacleFreeSpawnPosition(4.1, 4.1, 0.7, 10, 10, obstacles);
  assert.equal(fixed.adjusted, true);
  assert.ok(Math.hypot(fixed.x - 4, fixed.z - 4) >= 1.5 + 0.7 + 0.5);
  assert.ok(Math.abs(fixed.x) <= 10 - 0.7);
  assert.ok(Math.abs(fixed.z) <= 10 - 0.7);
});

test('clampKnockbackInsideArena prevents wall tunneling and pillar clipping', () => {
  const wallHit = clampKnockbackInsideArena(8.5, 0, 6.0, 0, 0.7, 10, 10, []);
  assert.equal(wallHit.hitWall, true);
  assert.ok(wallHit.x <= 10 - 0.7 - 0.5 + 0.001);

  const pillarHit = clampKnockbackInsideArena(2.5, 0, -2.0, 0, 0.6, 10, 10, [
    { x: 0, z: 0, radius: 1.2 },
  ]);
  assert.equal(pillarHit.hitWall, true);
  assert.ok(Math.hypot(pillarHit.x, pillarHit.z) >= 1.2 + 0.6 + 0.14);
});

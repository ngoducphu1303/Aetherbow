import test from 'node:test';
import assert from 'node:assert/strict';
import { SpatialHashGrid } from './spatialHashGrid';
import {
  queryAoeEnemiesInGrid,
  queryProjectileEnemyHits,
  resolveProjectileArenaBoundaryAndObstacles,
  stepProjectileHomingVelocity,
  type ProjectileKinematicsBody,
  type TargetableEnemyBody,
} from './projectilePhysicsSystem';

test('stepProjectileHomingVelocity steers smoothly while preserving exact projectile speed', () => {
  const proj: ProjectileKinematicsBody = {
    x: 0,
    z: 0,
    vx: 0,
    vz: 18,
    radius: 0.25,
    wallBounceLeft: 0,
  };
  const turned = stepProjectileHomingVelocity(proj, 10, 0, 0.05);
  assert.equal(turned, true);
  assert.ok(proj.vx > 0, 'Projectile should bend toward +X target');
  assert.ok(Math.abs(Math.hypot(proj.vx, proj.vz) - 18) < 1e-6, 'Speed magnitude must remain invariant');
});

test('resolveProjectileArenaBoundaryAndObstacles reflects off arena walls and intact obstacles safely', () => {
  const proj: ProjectileKinematicsBody = {
    x: 11.2,
    z: 0,
    vx: 14,
    vz: 2,
    radius: 0.22,
    wallBounceLeft: 2,
  };
  const wallOutcome = resolveProjectileArenaBoundaryAndObstacles(proj, 11, 11, []);
  assert.equal(wallOutcome, 'bounced');
  assert.equal(proj.wallBounceLeft, 1);
  assert.ok(proj.vx < 0, 'X velocity should invert on east wall');
  assert.ok(proj.x <= 10.9, 'X coordinate must stay clamped inside arena');

  // Hit intact circular obstacle with 1 bounce left
  const pillarProj: ProjectileKinematicsBody = {
    x: 1.0,
    z: 0,
    vx: -12,
    vz: 0,
    radius: 0.25,
    wallBounceLeft: 1,
  };
  const pillarOutcome = resolveProjectileArenaBoundaryAndObstacles(pillarProj, 11, 11, [
    { x: 0, z: 0, radius: 1.0, intact: true },
  ]);
  assert.equal(pillarOutcome, 'bounced');
  assert.equal(pillarProj.wallBounceLeft, 0);
  assert.ok(pillarProj.vx > 0, 'Velocity should reflect outward from obstacle normal');
  assert.ok(pillarProj.x >= 1.29, 'Projectile must be pushed clear of obstacle surface');

  // Shattered obstacle (intact === false) must never block projectiles
  const passProj: ProjectileKinematicsBody = {
    x: 0.2,
    z: 0,
    vx: 10,
    vz: 0,
    radius: 0.25,
    wallBounceLeft: 0,
  };
  const passOutcome = resolveProjectileArenaBoundaryAndObstacles(passProj, 11, 11, [
    { x: 0, z: 0, radius: 1.0, intact: false },
  ]);
  assert.equal(passOutcome, 'continue');
});

test('queryProjectileEnemyHits detects giant Zodiac Bosses (>2.5u radius) and skips dead/spawning/already-hit enemies', () => {
  const grid = new SpatialHashGrid<TargetableEnemyBody>(3.0);
  const giantBoss: TargetableEnemyBody = { id: 1, x: 0, z: 0, radius: 2.6, dead: false, spawnTimer: 0 };
  const deadMob: TargetableEnemyBody = { id: 2, x: 2.5, z: 0, radius: 0.7, dead: true, spawnTimer: 0 };
  const spawningMob: TargetableEnemyBody = { id: 3, x: 2.5, z: 0, radius: 0.7, dead: false, spawnTimer: 0.3 };
  grid.insert(giantBoss);
  grid.insert(deadMob);
  grid.insert(spawningMob);

  const scratch: TargetableEnemyBody[] = [];
  const hits: TargetableEnemyBody[] = [];
  const hitIds = new Set<number>();

  // Projectile at x=2.75 (2.75u from Boss center; Boss radius 2.6 + proj radius 0.25 = 2.85u -> MUST HIT!)
  queryProjectileEnemyHits(grid, 2.75, 0, 0.25, hitIds, scratch, hits);
  assert.deepEqual(
    hits.map((e) => e.id),
    [1],
    'Giant Boss outer hitbox must be detected accurately even across multiple grid cells'
  );

  // Already hit -> zero duplicate damage
  hitIds.add(1);
  queryProjectileEnemyHits(grid, 2.75, 0, 0.25, hitIds, scratch, hits);
  assert.equal(hits.length, 0);
});

test('Zero-GC SpatialHashGrid projectile & AoE queries achieve 100% parity with brute force across 300 projectiles x 40 enemies', () => {
  const enemies: TargetableEnemyBody[] = [];
  for (let i = 0; i < 40; i++) {
    const angle = i * 2.399963;
    const dist = 1.5 + (i % 9) * 1.1;
    enemies.push({
      id: i + 1,
      x: Math.cos(angle) * dist,
      z: Math.sin(angle) * dist,
      radius: i === 0 ? 2.4 : 0.65 + (i % 3) * 0.15,
      dead: i % 13 === 0 && i > 0,
      spawnTimer: i % 17 === 0 && i > 0 ? 0.2 : 0,
    });
  }

  const grid = new SpatialHashGrid<TargetableEnemyBody>(3.0);
  for (const e of enemies) {
    if (!e.dead) grid.insert(e);
  }

  const scratch: TargetableEnemyBody[] = [];
  const gridHits: TargetableEnemyBody[] = [];
  const hitIds = new Set<number>();

  for (let p = 0; p < 300; p++) {
    const px = ((p * 73) % 220) / 10 - 11;
    const pz = ((p * 137) % 220) / 10 - 11;
    const pr = 0.28;

    const expected = enemies
      .filter(
        (e) =>
          !e.dead &&
          e.spawnTimer <= 0 &&
          !hitIds.has(e.id) &&
          Math.hypot(px - e.x, pz - e.z) < e.radius + pr
      )
      .map((e) => e.id)
      .sort((a, b) => a - b);

    queryProjectileEnemyHits(grid, px, pz, pr, hitIds, scratch, gridHits);
    const actual = gridHits.map((e) => e.id).sort((a, b) => a - b);
    assert.deepEqual(actual, expected, `Exact parity mismatch at projectile #${p}`);
  }

  // Verify AoE blast parity as well
  const aoeOut: TargetableEnemyBody[] = [];
  queryAoeEnemiesInGrid(grid, 1.5, -1.2, 3.6, true, scratch, aoeOut);
  const expectedAoe = enemies
    .filter((e) => !e.dead && e.spawnTimer <= 0 && Math.hypot(e.x - 1.5, e.z + 1.2) <= 3.6 + e.radius)
    .map((e) => e.id)
    .sort((a, b) => a - b);
  assert.deepEqual(
    aoeOut.map((e) => e.id).sort((a, b) => a - b),
    expectedAoe
  );
});

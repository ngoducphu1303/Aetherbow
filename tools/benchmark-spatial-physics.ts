import { performance } from 'node:perf_hooks';
import { SpatialHashGrid } from '../src/engine/spatialHashGrid';
import {
  queryProjectileEnemyHits,
  type TargetableEnemyBody,
} from '../src/engine/projectilePhysicsSystem';

/**
 * Reproducible Physics & Zero-GC Performance Benchmark (Criterion 11 & Criterion 22).
 * Compares the legacy GameEngine per-projectile O(P*E) `[...enemies]` spread scan against the
 * new Zero-GC SpatialHashGrid broadphase across 300 active projectiles x 40 enemies x 600 frames
 * (10 seconds of intense 60 FPS Endgame bullet-hell combat).
 */
const ENEMY_COUNT = 40;
const PROJECTILE_COUNT = 300;
const FRAMES = 600;

const enemies: TargetableEnemyBody[] = [];
for (let i = 0; i < ENEMY_COUNT; i++) {
  const angle = i * 2.399963;
  const dist = 1.5 + (i % 9) * 1.1;
  enemies.push({
    id: i + 1,
    x: Math.cos(angle) * dist,
    z: Math.sin(angle) * dist,
    radius: i === 0 ? 2.4 : 0.7,
    dead: false,
    spawnTimer: 0,
  });
}

const projectiles = Array.from({ length: PROJECTILE_COUNT }, (_, i) => ({
  x: ((i * 73) % 220) / 10 - 11,
  z: ((i * 137) % 220) / 10 - 11,
  vx: Math.cos(i) * 0.22,
  vz: Math.sin(i) * 0.22,
  radius: 0.25,
  hitIds: new Set<number>(),
}));

// Warm up JIT
for (let w = 0; w < 20; w++) {
  for (const p of projectiles) {
    for (const e of [...enemies]) {
      if (Math.hypot(p.x - e.x, p.z - e.z) < e.radius + p.radius) break;
    }
  }
}

// 1. Legacy O(P*E) + [...enemies] snapshot allocation per projectile
let legacyHits = 0;
const tLegacyStart = performance.now();
for (let f = 0; f < FRAMES; f++) {
  for (let pi = 0; pi < projectiles.length; pi++) {
    const p = projectiles[pi];
    const px = ((p.x + p.vx * f + 11) % 22 + 22) % 22 - 11;
    const pz = ((p.z + p.vz * f + 11) % 22 + 22) % 22 - 11;
    for (const e of [...enemies]) {
      if (!e || e.dead || e.spawnTimer > 0 || p.hitIds.has(e.id)) continue;
      if (Math.hypot(px - e.x, pz - e.z) < e.radius + p.radius) {
        legacyHits += 1;
      }
    }
  }
}
const legacyMs = performance.now() - tLegacyStart;

// 2. Zero-GC SpatialHashGrid broadphase (cellSize = 3.0)
const grid = new SpatialHashGrid<TargetableEnemyBody>(3.0);
const scratchCandidates: TargetableEnemyBody[] = [];
const scratchHits: TargetableEnemyBody[] = [];

// Warm up grid JIT
for (let w = 0; w < 20; w++) {
  grid.clear();
  for (let i = 0; i < enemies.length; i++) grid.insert(enemies[i]);
  for (let pi = 0; pi < projectiles.length; pi++) {
    queryProjectileEnemyHits(
      grid,
      projectiles[pi].x,
      projectiles[pi].z,
      projectiles[pi].radius,
      projectiles[pi].hitIds,
      scratchCandidates,
      scratchHits
    );
  }
}

let spatialHits = 0;
const tSpatialStart = performance.now();
for (let f = 0; f < FRAMES; f++) {
  grid.clear();
  for (let i = 0; i < enemies.length; i++) {
    grid.insert(enemies[i]);
  }
  for (let pi = 0; pi < projectiles.length; pi++) {
    const p = projectiles[pi];
    const px = ((p.x + p.vx * f + 11) % 22 + 22) % 22 - 11;
    const pz = ((p.z + p.vz * f + 11) % 22 + 22) % 22 - 11;
    queryProjectileEnemyHits(
      grid,
      px,
      pz,
      p.radius,
      p.hitIds,
      scratchCandidates,
      scratchHits
    );
    spatialHits += scratchHits.length;
  }
}
const spatialMs = performance.now() - tSpatialStart;

if (legacyHits !== spatialHits) {
  throw new Error(`Hit parity mismatch! legacy=${legacyHits} vs spatial=${spatialHits}`);
}

const speedup = legacyMs / Math.max(0.001, spatialMs);
const eliminatedAllocs = PROJECTILE_COUNT * FRAMES;

console.log(
  JSON.stringify(
    {
      scenario: `${PROJECTILE_COUNT} projectiles x ${ENEMY_COUNT} enemies x ${FRAMES} frames`,
      hitParityVerified: legacyHits === spatialHits,
      totalExactHits: spatialHits,
      legacyTotalMs: Number(legacyMs.toFixed(2)),
      legacyAvgMsPerFrame: Number((legacyMs / FRAMES).toFixed(4)),
      spatialTotalMs: Number(spatialMs.toFixed(2)),
      spatialAvgMsPerFrame: Number((spatialMs / FRAMES).toFixed(4)),
      speedupFactor: Number(speedup.toFixed(2)),
      eliminatedArrayAllocations: eliminatedAllocs,
      eliminatedAllocsPerSecondAt60Fps: PROJECTILE_COUNT * 60,
    },
    null,
    2
  )
);

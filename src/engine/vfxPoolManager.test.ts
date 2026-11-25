import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VfxFrameBudgetCache,
  countActivePooled,
  stepDashScorchPool,
  stepGroundMistSeeds,
  stepParticlePool,
  stepShockwavePool,
  stepWindRingPool,
  type GroundMistSeed,
  type PooledDashScorchEntry,
  type PooledParticleEntry,
  type PooledShockwaveEntry,
  type PooledWindRingEntry,
} from './vfxPoolManager';

test('stepParticlePool applies gravity, floor clamp, scaling, and deactivates expired particles', () => {
  const posCalls: Array<[number, number, number]> = [];
  let lastScale = 1;
  const pool: PooledParticleEntry[] = [
    {
      active: true,
      x: 1,
      y: 0.1,
      z: 2,
      vx: 2,
      vy: -5,
      vz: -1,
      life: 0.5,
      maxLife: 1.0,
      scale: 2.0,
      mesh: {
        visible: true,
        position: { set: (x, y, z) => posCalls.push([x, y, z]) },
        scale: { setScalar: (s) => { lastScale = s; } },
      },
    },
    {
      active: true,
      x: 0,
      y: 1,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      life: 0.05,
      maxLife: 0.5,
      scale: 1,
      mesh: {
        visible: true,
        position: { set: () => {} },
        scale: { setScalar: () => {} },
      },
    },
  ];

  const remaining = stepParticlePool(pool, 0.1);
  assert.equal(remaining, 1);
  assert.equal(pool[0].y, 0.05, 'Particle y must clamp cleanly to floor >= 0.05');
  assert.ok(Math.abs(lastScale - 0.8) < 1e-6);
  assert.equal(pool[1].active, false);
  assert.equal(pool[1].mesh.visible, false);
  assert.equal(posCalls.length, 1);
});

test('stepShockwavePool, stepDashScorchPool, and stepWindRingPool ease smoothly and clean up at expiry', () => {
  const swMat = { opacity: 1 };
  let swScale = 0;
  const shockwaves: PooledShockwaveEntry[] = [
    {
      active: true,
      x: 0,
      z: 0,
      life: 0.4,
      maxLife: 0.4,
      maxRadius: 4.0,
      mesh: {
        visible: true,
        scale: { setScalar: (s) => { swScale = s; } },
        material: swMat,
      },
    },
  ];
  assert.equal(stepShockwavePool(shockwaves, 0.2), 1);
  assert.ok(swScale > 2.5, 'Quad-eased shockwave expands quickly past midpoint');
  assert.ok(swMat.opacity > 0.3 && swMat.opacity < 0.5);
  assert.equal(stepShockwavePool(shockwaves, 0.25), 0);
  assert.equal(shockwaves[0].mesh.visible, false);

  const scorchMat = { opacity: 0.62 };
  const scorches: PooledDashScorchEntry[] = [
    {
      active: true,
      life: 0.2,
      maxLife: 0.4,
      mesh: {
        visible: true,
        scale: { set: () => {} },
        material: scorchMat,
      },
    },
  ];
  assert.equal(stepDashScorchPool(scorches, 0.1), 1);
  assert.ok(scorchMat.opacity < 0.2);

  const wr: PooledWindRingEntry[] = [
    {
      active: true,
      life: 0.2,
      maxLife: 0.4,
      maxRadius: 2.2,
      group: { visible: true, scale: { setScalar: () => {} }, rotation: { y: 0 } },
      ringMat: { opacity: 0.85 },
      wispMat: { opacity: 0.72 },
    },
  ];
  assert.equal(stepWindRingPool(wr, 0.1), 1);
  assert.ok(wr[0].group.rotation.y > 1.0);
});

test('stepGroundMistSeeds wraps cleanly on all 4 arena edges including -Z', () => {
  const seeds: GroundMistSeed[] = [
    { x: 10.9, z: 0, vx: 2, vz: 0, scale: 1, phase: 0 },
    { x: -10.9, z: 0, vx: -2, vz: 0, scale: 1, phase: 0 },
    { x: 0, z: 10.9, vx: 0, vz: 2, scale: 1, phase: 0 },
    { x: 0, z: -10.9, vx: 0, vz: -2, scale: 1, phase: 0 },
  ];
  stepGroundMistSeeds(seeds, seeds.length, 0.2, 11, 11);
  assert.equal(seeds[0].x, -11);
  assert.equal(seeds[1].x, 11);
  assert.equal(seeds[2].z, -11);
  assert.equal(seeds[3].z, 11, '-Z drift must wrap back to +arenaHalfD');
});

test('VfxFrameBudgetCache caches identical frame stamps and enforces Dell E5430 Lite caps', () => {
  const cache = new VfxFrameBudgetCache();
  const arrows = [{ active: true }, { active: false }, { active: true }];
  assert.equal(countActivePooled(arrows), 2);

  const b1 = cache.getForFrame(100, {
    watchdogStage: 2,
    isLowEndGpu: true,
    reducedMotion: false,
    activeEnemies: 20,
    arrowPool: arrows,
  });
  const b2 = cache.getForFrame(100, {
    watchdogStage: 0,
    isLowEndGpu: false,
    reducedMotion: false,
    activeEnemies: 1,
    arrowPool: arrows,
  });
  assert.strictEqual(b1, b2, 'Same frame stamp returns cached VFX budget without recomputing');
  assert.ok(b1.maxActiveShockwaves <= 5, 'E5430 Lite / Watchdog >= 2 must cap shockwaves tightly');

  const bNext = cache.getForFrame(101, {
    watchdogStage: 0,
    isLowEndGpu: false,
    reducedMotion: false,
    activeEnemies: 2,
    arrowPool: arrows,
  });
  assert.notStrictEqual(bNext, b1, 'Next frame stamp refreshes VFX budget');
});

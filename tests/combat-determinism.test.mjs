import test from 'node:test';
import assert from 'node:assert/strict';
import {
  VOLLEY_STAGGER_SECONDS,
  buildPlayerVolley,
  drainReadyVolleyShots,
  resolvePrimaryArrowEnhancement,
} from '../src/engine/volleySystem.ts';
import {
  FIXED_SIM_DT,
  createFixedTimestepClock,
  simulateDeterministicCombatRun,
  stepFixedTimestep,
} from '../src/engine/fixedTimestep.ts';

test('VolleySystem: Bắn Đôi (front_arrow = 1) tags exactly one primary arrow so Tụ Lực fires instead of stalling at 100%', () => {
  const queue = buildPlayerVolley({
    front_arrow: 1,
    multishot: 0,
    diag_arrow: 0,
    rear_arrow: 0,
  });

  assert.equal(queue.length, 2);
  assert.equal(queue.filter((s) => s.isPrimary).length, 1);
  assert.equal(queue[0].isPrimary, true);
  assert.equal(queue[1].isPrimary, false);
  // Both arrows are laterally offset (neither is 0), proving center-offset checks would have failed
  assert.ok(Math.abs(queue[0].lateral) > 0.1);
  assert.ok(Math.abs(queue[1].lateral) > 0.1);

  let overcharge = 1.0;
  let counterTimer = 0;
  let firedOverchargeCount = 0;

  for (const shot of queue) {
    const res = resolvePrimaryArrowEnhancement({
      isPrimary: shot.isPrimary,
      dmgSource: 'basic',
      astralOvercharge: overcharge,
      counterShotTimer: counterTimer,
    });
    overcharge = res.nextAstralOvercharge;
    counterTimer = res.nextCounterShotTimer;
    if (res.isOvercharge) firedOverchargeCount += 1;
  }

  assert.equal(firedOverchargeCount, 1, 'Dual offset front arrows must discharge Overcharge once');
  assert.equal(overcharge, 0, 'Overcharge must reset cleanly to 0 after primary fires');
});

test('VolleySystem: Diagonal + Rear + Đa Tiễn never steal Tụ Lực before the primary front arrow', () => {
  const queue = buildPlayerVolley({
    front_arrow: 2, // Bắn Ba
    multishot: 2, // Đa Tiễn x3 bursts
    diag_arrow: 1,
    rear_arrow: 1,
  });

  // Burst 0 primary arrow is strictly index 0, delay 0, forward, angle 0
  assert.equal(queue[0].isPrimary, true);
  assert.equal(queue[0].delay, 0);
  assert.equal(queue[0].angleOffset, 0);
  assert.equal(queue[0].backward, undefined);
  assert.equal(queue.filter((s) => s.isPrimary).length, 1);

  // Drain burst 0 in strict FIFO order
  const step0 = drainReadyVolleyShots(queue, 0.01);
  assert.equal(step0.ready[0].isPrimary, true);

  let overcharge = 1.0;
  const enhancedShots = [];
  for (const shot of step0.ready) {
    const res = resolvePrimaryArrowEnhancement({
      isPrimary: shot.isPrimary,
      dmgSource: 'basic',
      astralOvercharge: overcharge,
      counterShotTimer: 0,
    });
    overcharge = res.nextAstralOvercharge;
    if (res.isOvercharge) {
      enhancedShots.push({ angleOffset: shot.angleOffset, backward: Boolean(shot.backward), isPrimary: shot.isPrimary });
    }
  }

  assert.deepEqual(enhancedShots, [{ angleOffset: 0, backward: false, isPrimary: true }]);
  assert.equal(overcharge, 0);

  // Remaining bursts (1 and 2) arrive later in FIFO order and none are primary
  const step1 = drainReadyVolleyShots(step0.remaining, VOLLEY_STAGGER_SECONDS);
  assert.ok(step1.ready.length > 0);
  assert.ok(step1.ready.every((s) => !s.isPrimary));
  const step2 = drainReadyVolleyShots(step1.remaining, VOLLEY_STAGGER_SECONDS);
  assert.ok(step2.ready.length > 0);
  assert.ok(step2.ready.every((s) => !s.isPrimary));
  assert.equal(step2.remaining.length, 0);
});

test('VolleySystem: Phản Tiễn + Tụ Lực together preserves Tụ Lực while Phản Tiễn triggers on primary arrow', () => {
  const queue = buildPlayerVolley({
    front_arrow: 1,
    multishot: 1,
    diag_arrow: 1,
    rear_arrow: 1,
  });

  let overcharge = 1.0;
  let counterTimer = 2.5;
  let counterTriggered = 0;
  let overchargeTriggered = 0;

  for (const shot of queue) {
    const res = resolvePrimaryArrowEnhancement({
      isPrimary: shot.isPrimary,
      dmgSource: 'basic',
      astralOvercharge: overcharge,
      counterShotTimer: counterTimer,
    });
    overcharge = res.nextAstralOvercharge;
    counterTimer = res.nextCounterShotTimer;
    if (res.isCounterShot) counterTriggered += 1;
    if (res.isOvercharge) overchargeTriggered += 1;
  }

  assert.equal(counterTriggered, 1, 'Phản Tiễn must trigger exactly once on primary arrow');
  assert.equal(counterTimer, 0, 'Phản Tiễn timer consumed');
  assert.equal(overchargeTriggered, 0, 'Tụ Lực must not be wasted on the same arrow as Phản Tiễn');
  assert.equal(overcharge, 1.0, 'Tụ Lực stays charged at 100% for the next volley');
});

test('FixedTimestep: 12 FPS, 30 FPS, and 60 FPS produce exact bit-for-bit identical combat outcomes', () => {
  const baseConfig = {
    seed: 'WEEKLY-2026-W47-FROST-DRAGON',
    durationSeconds: 12,
    attackDamage: 225,
    attackCooldown: 0.48,
    critChance: 0.28,
    critDamage: 1.85,
    bossMaxHp: 18500,
    skills: {
      front_arrow: 1,
      multishot: 1,
      diag_arrow: 1,
      rear_arrow: 1,
    },
    inputs: [
      { atTick: 60, kind: 'move_start', dirX: 1, dirZ: 0 },
      { atTick: 120, kind: 'perfect_dodge' },
      { atTick: 135, kind: 'move_stop' },
      { atTick: 360, kind: 'move_start', dirX: -1, dirZ: 0.4 },
      { atTick: 420, kind: 'move_stop' },
    ],
  };

  const run12 = simulateDeterministicCombatRun({ ...baseConfig, fps: 12 });
  const run30 = simulateDeterministicCombatRun({ ...baseConfig, fps: 30 });
  const run60 = simulateDeterministicCombatRun({ ...baseConfig, fps: 60 });

  assert.equal(run12.totalTicks, run60.totalTicks);
  assert.equal(run30.totalTicks, run60.totalTicks);
  assert.equal(run12.clearTimeSeconds, run60.clearTimeSeconds);
  assert.equal(run30.clearTimeSeconds, run60.clearTimeSeconds);
  assert.equal(run12.totalDamage, run60.totalDamage);
  assert.equal(run30.totalDamage, run60.totalDamage);
  assert.equal(run12.shotsFired, run60.shotsFired);
  assert.equal(run30.shotsFired, run60.shotsFired);
  assert.equal(run12.overchargeShots, run60.overchargeShots);
  assert.equal(run30.overchargeShots, run60.overchargeShots);
  assert.equal(run12.counterShots, run60.counterShots);
  assert.equal(run30.counterShots, run60.counterShots);
  assert.equal(run12.playerX, run60.playerX);
  assert.equal(run30.playerX, run60.playerX);
  assert.equal(run12.playerZ, run60.playerZ);
  assert.equal(run30.playerZ, run60.playerZ);
  assert.equal(run12.checksum, run60.checksum);
  assert.equal(run30.checksum, run60.checksum);
  assert.ok(run60.overchargeShots >= 1, 'Overcharge should fire across 12s');
  assert.ok(run60.counterShots >= 1, 'CounterShot should trigger cleanly');
});

test('FixedTimestep: stepFixedTimestep advances exact 1/60s ticks even under 12 FPS (83.33ms) frame deltas', () => {
  const clock = createFixedTimestepClock();
  let ticksRun = 0;
  // 12 frames at 12 FPS = 1.000s total -> must yield exactly 60 simulation ticks
  for (let i = 0; i < 12; i += 1) {
    stepFixedTimestep(clock, 1 / 12, (fixedDt) => {
      assert.equal(fixedDt, FIXED_SIM_DT);
      ticksRun += 1;
    });
  }
  assert.equal(ticksRun, 60);
  assert.equal(clock.totalTicks, 60);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  BOSS_ENTRANCE_MAJOR_DURATION_SEC,
  BOSS_ENTRANCE_MAX_DURATION_SEC,
  BOSS_ENTRANCE_MIN_DURATION_SEC,
  BOSS_ENTRANCE_SUB_DURATION_SEC,
  canDamageEnemyDuringEntrance,
  canPlayerExecuteAttack,
  computeBossEntranceCameraBlend,
  evaluateBossEntranceState,
  isBossEntranceAttackLocked,
  resolveBossEntranceDurationSec,
} from './bossEntrance';

test('Boss entrance durations stay strictly inside the 5–10s cinematic window', () => {
  const subSec = resolveBossEntranceDurationSec(false);
  const majorSec = resolveBossEntranceDurationSec(true);

  assert.equal(subSec, BOSS_ENTRANCE_SUB_DURATION_SEC);
  assert.equal(majorSec, BOSS_ENTRANCE_MAJOR_DURATION_SEC);
  assert.ok(
    subSec >= BOSS_ENTRANCE_MIN_DURATION_SEC && subSec <= BOSS_ENTRANCE_MAX_DURATION_SEC,
    `Sub-boss entrance ${subSec}s must be in [5, 10]s`
  );
  assert.ok(
    majorSec >= BOSS_ENTRANCE_MIN_DURATION_SEC && majorSec <= BOSS_ENTRANCE_MAX_DURATION_SEC,
    `Major boss entrance ${majorSec}s must be in [5, 10]s`
  );
  assert.ok(majorSec >= subSec);
});

test('Boss entrance strictly locks player attacks and enemy damage until timer reaches 0', () => {
  // Active entrance: attacks and damage MUST be blocked
  assert.equal(isBossEntranceAttackLocked(6.5), true);
  assert.equal(isBossEntranceAttackLocked(0.05), true);
  assert.equal(
    canPlayerExecuteAttack({ isPlaying: true, bossEntranceRemainingSec: 5.0 }),
    false
  );
  assert.equal(
    canPlayerExecuteAttack({ isPlaying: true, bossEntranceRemainingSec: 0.1 }),
    false
  );
  assert.equal(
    canDamageEnemyDuringEntrance({ enemySpawnTimer: 0, bossEntranceRemainingSec: 3.2 }),
    false
  );
  assert.equal(
    canDamageEnemyDuringEntrance({ enemySpawnTimer: 2.0, bossEntranceRemainingSec: 0 }),
    false
  );

  // Training dummy remains targetable even if timer is tested
  assert.equal(
    canDamageEnemyDuringEntrance({
      enemySpawnTimer: 0,
      bossEntranceRemainingSec: 4.0,
      isTrainingDummy: true,
    }),
    true
  );

  // Entrance complete: combat unlocks cleanly
  assert.equal(isBossEntranceAttackLocked(0), false);
  assert.equal(
    canPlayerExecuteAttack({ isPlaying: true, bossEntranceRemainingSec: 0 }),
    true
  );
  assert.equal(
    canPlayerExecuteAttack({ isPlaying: true, bossEntranceRemainingSec: 0, isDashing: true }),
    false
  );
  assert.equal(
    canPlayerExecuteAttack({ isPlaying: false, bossEntranceRemainingSec: 0 }),
    false
  );
  assert.equal(
    canDamageEnemyDuringEntrance({ enemySpawnTimer: 0, bossEntranceRemainingSec: 0 }),
    true
  );
});

test('evaluateBossEntranceState progresses cleanly through all 4 choreography beats and lands at y=0', () => {
  const total = 7.0;
  const rift = evaluateBossEntranceState(total * 0.9, total); // progress = 0.10
  const descent = evaluateBossEntranceState(total * 0.55, total); // progress = 0.45
  const roar = evaluateBossEntranceState(total * 0.25, total); // progress = 0.75
  const readyLock = evaluateBossEntranceState(total * 0.05, total); // progress = 0.95
  const done = evaluateBossEntranceState(0, total);

  assert.equal(rift.active, true);
  assert.equal(rift.stage, 'summon_rift');
  assert.equal(rift.hasLanded, false);
  assert.ok(rift.elevationY > 5.0, `Expected high rift elevation, got ${rift.elevationY}`);

  assert.equal(descent.active, true);
  assert.equal(descent.stage, 'descent');
  assert.equal(descent.hasLanded, false);
  assert.ok(descent.elevationY < rift.elevationY && descent.elevationY > 0);

  assert.equal(roar.active, true);
  assert.equal(roar.stage, 'landing_roar');
  assert.equal(roar.hasLanded, true);
  assert.equal(roar.elevationY, 0);

  assert.equal(readyLock.active, true);
  assert.equal(readyLock.stage, 'ready_lock');
  assert.equal(readyLock.hasLanded, true);
  assert.equal(readyLock.elevationY, 0);

  assert.equal(done.active, false);
  assert.equal(done.stage, 'complete');
  assert.equal(done.elevationY, 0);
  assert.equal(done.scaleXZ, 1);
  assert.equal(done.scaleY, 1);
  assert.equal(done.cameraBlend, 0);

  // Verify camera blend eases in, holds peak at 1, and eases back to 0 cleanly
  assert.equal(computeBossEntranceCameraBlend(total, total), 0);
  const rampIn = computeBossEntranceCameraBlend(total * 0.93, total);
  assert.ok(rampIn > 0.1 && rampIn < 1, `Expected smooth ramp-in, got ${rampIn}`);
  assert.equal(computeBossEntranceCameraBlend(total * 0.5, total), 1);
  const rampOut = computeBossEntranceCameraBlend(total * 0.08, total);
  assert.ok(rampOut > 0 && rampOut < 1, `Expected smooth ramp-out, got ${rampOut}`);
  assert.equal(computeBossEntranceCameraBlend(0, total), 0);
});

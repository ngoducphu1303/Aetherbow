import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_COMBAT_KEYBINDS,
  computeBrazierFlamePose,
  computeCompanionSynergyOrbit,
  computeMountBankTilt,
  createFpsSampler,
  createRoomBounty,
  cycleCombatCameraPreset,
  formatKeybindShortLabel,
  getZodiacConstellationGeometry,
  normalizeCombatKeybinds,
  pushFpsSample,
  readFpsMetrics,
  remapCombatKeybind,
  stepAstralOvercharge,
  toRoomBountySnapshot,
  updateRoomBountyProgress,
} from './aaaWave6Director';

test('Pillar 1: stepAstralOvercharge ramps faster while aiming and fires one-shot justCharged', () => {
  const idleStep = stepAstralOvercharge(0, 0.1, false, false, false);
  assert.equal(idleStep.charge, 0);
  assert.equal(idleStep.justCharged, false);

  const aimingStep = stepAstralOvercharge(0, 0.1, false, true, true);
  const movingStep = stepAstralOvercharge(0, 0.1, true, false, true);
  assert.ok(aimingStep.charge > movingStep.charge, 'Aiming should charge faster than kiting');

  const crossing = stepAstralOvercharge(0.99, 0.1, false, true, true);
  assert.equal(crossing.charge, 1);
  assert.equal(crossing.ready, true);
  assert.equal(crossing.justCharged, true);
  assert.equal(crossing.ringColorHex, 0xfde047);

  const alreadyFull = stepAstralOvercharge(1, 0.1, false, true, true);
  assert.equal(alreadyFull.ready, true);
  assert.equal(alreadyFull.justCharged, false);
});

test('Pillar 2: computeCompanionSynergyOrbit arcs to impact apex and returns to hero', () => {
  const start = computeCompanionSynergyOrbit(0, 0, 2, 0, 0, 0, -10);
  const apex = computeCompanionSynergyOrbit(0.52, 0, 2, 0, 0, 0, -10);
  const end = computeCompanionSynergyOrbit(1, 0, 2, 0, 0, 0, -10);

  assert.ok(Math.hypot(start.x, start.z) < 0.01);
  assert.equal(apex.isImpactApex, true);
  assert.ok(apex.z < -8.5, 'Companion should reach target vicinity at impact apex');
  assert.ok(Math.hypot(end.x, end.z) < 0.05, 'Companion should return smoothly to origin');
});

test('Pillar 2: computeMountBankTilt produces bounded damped roll and dash pitch', () => {
  const turning = computeMountBankTilt(0, 0.9, 7, false, 0.016, 0);
  assert.ok(turning.tiltZ < 0 && turning.tiltZ >= -0.28);
  assert.ok(turning.pitchX > 0 && turning.pitchX < 0.1);

  const dashing = computeMountBankTilt(0, 0, 8, true, 0.016, turning.tiltZ);
  assert.equal(dashing.pitchX, 0.16);
  assert.ok(Math.abs(dashing.tiltZ) < Math.abs(turning.tiltZ), 'Bank roll should relax when straight');
});

test('Pillar 3: getZodiacConstellationGeometry covers all 12 zodiacs with valid edges and fallback', () => {
  const zodiacs = [
    'aries',
    'taurus',
    'gemini',
    'cancer',
    'leo',
    'virgo',
    'libra',
    'scorpio',
    'sagittarius',
    'capricorn',
    'aquarius',
    'pisces',
  ];
  for (const id of zodiacs) {
    const spec = getZodiacConstellationGeometry(id);
    assert.equal(spec.zodiacId, id);
    assert.ok(spec.stars.length >= 4, `${id} should have at least 4 stars`);
    assert.ok(spec.edges.length >= 3, `${id} should have connecting edges`);
    for (const [a, b] of spec.edges) {
      assert.ok(a >= 0 && a < spec.stars.length);
      assert.ok(b >= 0 && b < spec.stars.length);
    }
    for (const [, y] of spec.stars) {
      assert.ok(y > 12, 'Constellation stars should sit high overhead');
    }
  }
  const fallback = getZodiacConstellationGeometry('unknown_sign');
  assert.equal(fallback.zodiacId, 'leo');
});

test('Pillar 3: computeBrazierFlamePose escalates height and color in Boss Phase II & III', () => {
  const p1 = computeBrazierFlamePose(1.2, 0, 1);
  const p2 = computeBrazierFlamePose(1.2, 0, 2);
  const p3 = computeBrazierFlamePose(1.2, 0, 3);

  assert.equal(p1.colorHex, 0xfbbf24);
  assert.equal(p2.colorHex, 0xf97316);
  assert.equal(p3.colorHex, 0xf43f5e);
  assert.ok(p3.scaleY > p1.scaleY, 'Phase III flames should burn taller than Phase I');
});

test('Pillar 4: Room Bounty lifecycle handles no_hit, elemental_reactions, fast_clear, and boss_break', () => {
  // Boss break bounty (even seed)
  const bossBounty = createRoomBounty(4, true, true);
  assert.equal(bossBounty.kind, 'boss_break');
  const breakRes = updateRoomBountyProgress(bossBounty, { type: 'boss_break' });
  assert.equal(breakRes.justCompleted, true);
  assert.equal(breakRes.goldReward, 60);
  assert.equal(breakRes.ultChargeReward, 25);
  assert.equal(toRoomBountySnapshot(breakRes.next)?.status, 'completed');

  // No-hit bounty fails on hit, passes on room_clear
  const noHit = createRoomBounty(0, false, false);
  assert.equal(noHit.kind, 'no_hit');
  const failed = updateRoomBountyProgress(noHit, { type: 'player_hit' });
  assert.equal(failed.next.status, 'failed');
  assert.equal(failed.justCompleted, false);

  const cleared = updateRoomBountyProgress(noHit, { type: 'room_clear' });
  assert.equal(cleared.justCompleted, true);
  assert.ok(cleared.goldReward > 0);

  // Elemental reactions bounty needs 2 triggers
  const elem = createRoomBounty(1, false, true);
  assert.equal(elem.kind, 'elemental_reactions');
  const step1 = updateRoomBountyProgress(elem, { type: 'elemental_reaction' });
  assert.equal(step1.justCompleted, false);
  assert.equal(toRoomBountySnapshot(step1.next)?.progressLabel, '1/2');
  const step2 = updateRoomBountyProgress(step1.next, { type: 'elemental_reaction' });
  assert.equal(step2.justCompleted, true);

  // Fast clear fails after timeLimitSec
  const fast = createRoomBounty(1, false, false);
  assert.equal(fast.kind, 'fast_clear');
  const tickLate = updateRoomBountyProgress(fast, { type: 'tick', dt: 25 });
  assert.equal(tickLate.next.status, 'failed');
});

test('Pillar 5: Keybind normalization, duplicate auto-swap, forbidden keys, camera cycle & FPS ring buffer', () => {
  const defaults = normalizeCombatKeybinds(undefined);
  assert.deepEqual(defaults, DEFAULT_COMBAT_KEYBINDS);

  // Duplicate auto-swap: assigning Space (dash) to activeSkill swaps Space <-> KeyE
  const swapped = remapCombatKeybind(defaults, 'activeSkill', 'Space');
  assert.equal(swapped.activeSkill, 'Space');
  assert.equal(swapped.dash, 'KeyE');

  // Forbidden movement keys are ignored
  const rejected = remapCombatKeybind(defaults, 'dash', 'KeyW');
  assert.equal(rejected.dash, 'Space');

  assert.equal(formatKeybindShortLabel('Space'), 'SPACE');
  assert.equal(formatKeybindShortLabel('KeyC'), 'C');
  assert.equal(formatKeybindShortLabel('ShiftLeft'), 'SHIFT');

  // Camera cycle loops tactical -> action -> wide -> tactical
  const c1 = cycleCombatCameraPreset('tactical');
  assert.equal(c1.next, 'action');
  const c2 = cycleCombatCameraPreset(c1.next);
  assert.equal(c2.next, 'wide');
  const c3 = cycleCombatCameraPreset(c2.next);
  assert.equal(c3.next, 'tactical');

  // Zero-GC FPS ring buffer computes 60 FPS accurately
  const sampler = createFpsSampler(10);
  for (let i = 0; i < 12; i++) {
    pushFpsSample(sampler, 1 / 60);
  }
  const metrics = readFpsMetrics(sampler);
  assert.equal(metrics.fps, 60);
  assert.ok(Math.abs(metrics.frameTimeMs - 16.7) <= 0.2);
});

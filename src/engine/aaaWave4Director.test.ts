import assert from 'node:assert/strict';
import {
  computeVictoryOrbitCamera,
  evaluateElementalReaction,
  GamepadPrevButtons,
  resolveHudScaleFactor,
  resolveTelegraphPalette,
  sampleGamepadInput,
  triggerHapticPulse,
} from './aaaWave4Director';

// 1. Elemental Reactions: Melt, Superconduct, Overload, Venom Detonation & Cooldown Gating
{
  const meltFireOnIce = evaluateElementalReaction(
    { burning: false, chilled: true, poisoned: false },
    'fire',
    200,
    0
  );
  assert.ok(meltFireOnIce, 'Fire hitting chilled enemy should trigger Melt');
  assert.equal(meltFireOnIce.id, 'melt');
  assert.equal(meltFireOnIce.bonusDamage, 90);
  assert.equal(meltFireOnIce.cooldownSec, 1.6);

  const meltIceOnFire = evaluateElementalReaction(
    { burning: true, chilled: false, poisoned: false },
    'ice',
    100,
    0
  );
  assert.ok(meltIceOnFire, 'Ice hitting burning enemy should also trigger Melt');
  assert.equal(meltIceOnFire.id, 'melt');

  const superconduct = evaluateElementalReaction(
    { burning: false, chilled: true, poisoned: false },
    'storm',
    200,
    0
  );
  assert.ok(superconduct, 'Storm hitting chilled enemy should trigger Superconduct');
  assert.equal(superconduct.id, 'superconduct');
  assert.equal(superconduct.breakShieldBonusRatio, 0.22);

  const overload = evaluateElementalReaction(
    { burning: true, chilled: false, poisoned: false },
    'storm',
    200,
    0
  );
  assert.ok(overload, 'Storm hitting burning enemy should trigger Overload');
  assert.equal(overload.id, 'overload');
  assert.ok(overload.knockbackForce > 1.0, 'Overload should produce strong radial knockback');

  const venom = evaluateElementalReaction(
    { burning: false, chilled: false, poisoned: true },
    'fire',
    150,
    0
  );
  assert.ok(venom, 'Fire hitting poisoned enemy should trigger Venom Detonation');
  assert.equal(venom.id, 'venom_detonation');

  const gated = evaluateElementalReaction(
    { burning: false, chilled: true, poisoned: false },
    'fire',
    200,
    0.45
  );
  assert.equal(gated, null, 'Active internal cooldown must prevent reaction spam');

  const noElement = evaluateElementalReaction(
    { burning: true, chilled: true, poisoned: true },
    null,
    200,
    0
  );
  assert.equal(noElement, null, 'Non-elemental hit must not trigger a reaction');
}

// 2. Gamepad Input Sampling: Deadzone, D-Pad fallback, and Rising-Edge Button Detection
{
  const initialPrev: GamepadPrevButtons = {
    dash: false,
    activeSkill: false,
    ultimate: false,
    pause: false,
  };

  const makeBtn = (pressed: boolean) => ({ pressed, value: pressed ? 1 : 0 });
  const buttons = Array.from({ length: 16 }, () => makeBtn(false));
  buttons[0] = makeBtn(true); // A -> Dash
  buttons[2] = makeBtn(true); // X -> Active Skill
  buttons[3] = makeBtn(true); // Y -> Ultimate
  buttons[9] = makeBtn(true); // Start -> Pause

  // Deadzone test (0.12, -0.1 -> magnitude ~0.156 < 0.18 -> clamped to 0)
  const s1 = sampleGamepadInput([0.12, -0.1], buttons, initialPrev);
  assert.equal(s1.moveX, 0);
  assert.equal(s1.moveZ, 0);
  assert.equal(s1.dashPressed, true);
  assert.equal(s1.activeSkillPressed, true);
  assert.equal(s1.ultimatePressed, true);
  assert.equal(s1.pausePressed, true);

  // Holding the same buttons next frame must NOT re-trigger rising edges
  const s2 = sampleGamepadInput([0.12, -0.1], buttons, s1.nextPrev);
  assert.equal(s2.dashPressed, false);
  assert.equal(s2.activeSkillPressed, false);
  assert.equal(s2.ultimatePressed, false);
  assert.equal(s2.pausePressed, false);

  // Diagonal D-pad normalization test
  const dpadButtons = Array.from({ length: 16 }, () => makeBtn(false));
  dpadButtons[12] = makeBtn(true); // Up -> -Z
  dpadButtons[15] = makeBtn(true); // Right -> +X
  const s3 = sampleGamepadInput([0, 0], dpadButtons, initialPrev);
  const mag = Math.hypot(s3.moveX, s3.moveZ);
  assert.ok(Math.abs(mag - 1) < 0.002, 'Diagonal D-pad vector must be normalized to unit length');
  assert.ok(s3.moveX > 0 && s3.moveZ < 0);
}

// 3. 3D Victory Showcase Orbit Camera (Animated vs Reduced-Motion)
{
  const poseA = computeVictoryOrbitCamera(1.5, -2.0, 0, false);
  const poseB = computeVictoryOrbitCamera(1.5, -2.0, 2.0, false);
  assert.notEqual(
    Math.round(poseA.camX * 100),
    Math.round(poseB.camX * 100),
    'Orbit camera should rotate around hero over time'
  );
  assert.equal(poseA.lookX, 1.5);
  assert.equal(poseA.lookZ, -2.0);

  const reducedA = computeVictoryOrbitCamera(0, 0, 0, true);
  const reducedB = computeVictoryOrbitCamera(0, 0, 5.0, true);
  assert.deepEqual(
    reducedA,
    reducedB,
    'prefers-reduced-motion must lock Victory camera to static heroic portrait angle'
  );
}

// 4. High-Contrast Telegraph Palette & HUD Scale Factor & Safe Haptics
{
  const std = resolveTelegraphPalette(false);
  const hc = resolveTelegraphPalette(true);
  assert.notEqual(std.fillHex, hc.fillHex);
  assert.notEqual(std.laneHex, hc.laneHex);
  assert.notEqual(std.ringHex, hc.ringHex);

  assert.equal(resolveHudScaleFactor('compact'), 0.88);
  assert.equal(resolveHudScaleFactor('normal'), 1.0);
  assert.equal(resolveHudScaleFactor('large'), 1.12);
  assert.equal(resolveHudScaleFactor(undefined), 1.0);

  // Disabled or Node SSR environment returns false safely without throwing
  assert.equal(triggerHapticPulse('boss_break', false), false);
  assert.equal(triggerHapticPulse('forge', true), false);
}

console.log('aaaWave4Director.test.ts: all assertions passed');

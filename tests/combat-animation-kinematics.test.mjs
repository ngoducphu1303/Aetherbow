import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAttackReleaseRecoil,
  applyDirectionalHitRecoil,
  createCombatKinematicPose,
  stepCombatKinematicPose,
} from '../src/engine/combatAnimationKinematics.ts';

test('Directional hit recoil tilts away from impact vector and smoothly recovers to neutral', () => {
  const pose = createCombatKinematicPose();
  const out = { offsetY: 0, rotX: 0, rotZ: 0, scaleY: 1 };

  applyDirectionalHitRecoil(pose, 0, 1, 0, 1.0, false);
  assert.ok(pose.recoilPitch > 0.1, 'Hit from front-to-back should produce positive pitch tilt');

  stepCombatKinematicPose(pose, 0.016, {}, out);
  const initialRotX = out.rotX;
  for (let i = 0; i < 40; i++) {
    stepCombatKinematicPose(pose, 0.016, {}, out);
  }
  assert.ok(Math.abs(out.rotX) < Math.abs(initialRotX) * 0.1, 'Spring damp must decay smoothly');
});

test('Attack release recoil, stagger knee-drop, and victory flourish produce distinct readable poses', () => {
  const pose = createCombatKinematicPose();
  const out = { offsetY: 0, rotX: 0, rotZ: 0, scaleY: 1 };

  applyAttackReleaseRecoil(pose, 1.0, false);
  stepCombatKinematicPose(pose, 0.016, {}, out);
  assert.ok(out.rotX < -0.05 && out.scaleY < 0.99);

  // Boss/mob staggered knee-drop posture
  for (let i = 0; i < 20; i++) {
    stepCombatKinematicPose(pose, 0.02, { isStunnedOrStaggered: true }, out);
  }
  assert.ok(out.offsetY < -0.1, 'Staggered pose should drop vertically');
  assert.ok(out.rotX > 0.1, 'Staggered pose should pitch forward');

  // Victory flourish lift
  for (let i = 0; i < 15; i++) {
    stepCombatKinematicPose(pose, 0.02, { isVictory: true }, out);
  }
  assert.ok(out.offsetY > 0.02, 'Victory flourish should lift gently');
});

test('reducedMotion scales kinematic recoil and stagger amplitudes to <= 30% for accessibility', () => {
  const normalPose = createCombatKinematicPose();
  const reducedPose = createCombatKinematicPose();
  applyDirectionalHitRecoil(normalPose, 1, 0, 0, 1.0, false);
  applyDirectionalHitRecoil(reducedPose, 1, 0, 0, 1.0, true);

  assert.ok(Math.abs(reducedPose.recoilRoll) <= Math.abs(normalPose.recoilRoll) * 0.35);
});

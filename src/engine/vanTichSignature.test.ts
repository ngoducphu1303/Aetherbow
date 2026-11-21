import test from 'node:test';
import assert from 'node:assert/strict';
import { computeVanTichPose } from './artemisMotion.ts';

test('Van Tich idle stance hovers gently with subtle wind breeze sway', () => {
  const idle = computeVanTichPose({
    elapsed: 1.2,
    moving: 0,
    aiming: 0,
    dash: 0,
    turnRate: 0,
    castRatio: 0,
    mounted: false,
  });

  assert.ok(idle.hoverY > 0.005 && idle.hoverY < 0.08, `unexpected idle hoverY: ${idle.hoverY}`);
  assert.ok(idle.torsoPitch > 0 && idle.torsoPitch < 0.1, `unexpected idle torsoPitch: ${idle.torsoPitch}`);
});

test('Van Tich locomotion leans forward and elevates into wind-glider hover', () => {
  const idle = computeVanTichPose({
    elapsed: 0.5,
    moving: 0,
    aiming: 0,
    dash: 0,
    turnRate: 0,
    castRatio: 0,
    mounted: false,
  });
  const moving = computeVanTichPose({
    elapsed: 0.5,
    moving: 1,
    aiming: 0,
    dash: 0,
    turnRate: 0,
    castRatio: 0,
    mounted: false,
  });

  assert.ok(moving.torsoPitch > idle.torsoPitch + 0.12, 'moving torso should pitch forward');
  assert.ok(moving.hoverY > idle.hoverY + 0.03, 'moving stance should glide higher');
  assert.ok(moving.rightArmPitch > idle.rightArmPitch + 0.2, 'trailing arm should sweep back in wind glide');
});

test('Van Tich turn banking tilts torso into turns and clamps extremes', () => {
  const turnLeft = computeVanTichPose({
    elapsed: 0.8,
    moving: 1,
    aiming: 0,
    dash: 0,
    turnRate: 3.0,
    castRatio: 0,
    mounted: false,
  });
  const turnRight = computeVanTichPose({
    elapsed: 0.8,
    moving: 1,
    aiming: 0,
    dash: 0,
    turnRate: -3.0,
    castRatio: 0,
    mounted: false,
  });
  const extremeTurn = computeVanTichPose({
    elapsed: 0.8,
    moving: 1,
    aiming: 0,
    dash: 0,
    turnRate: 50.0,
    castRatio: 0,
    mounted: false,
  });

  assert.ok(turnLeft.torsoRoll < 0, 'positive turn rate should bank left');
  assert.ok(turnRight.torsoRoll > 0, 'negative turn rate should bank right');
  assert.ok(Math.abs(extremeTurn.torsoRoll) <= 0.35, `torsoRoll must stay clamped: ${extremeTurn.torsoRoll}`);
});

test('Van Tich dash tucks forward with aerodynamic glide surge', () => {
  const run = computeVanTichPose({
    elapsed: 1.0,
    moving: 1,
    aiming: 0,
    dash: 0,
    turnRate: 0,
    castRatio: 0,
    mounted: false,
  });
  const dash = computeVanTichPose({
    elapsed: 1.0,
    moving: 1,
    aiming: 0,
    dash: 1,
    turnRate: 0,
    castRatio: 0,
    mounted: false,
  });

  assert.ok(dash.torsoPitch > run.torsoPitch + 0.15, 'dash should tuck torso further forward');
  assert.ok(dash.hoverY > run.hoverY + 0.05, 'dash should elevate wind hover');
  assert.ok(dash.leftShinPitch > run.leftShinPitch + 0.2, 'dash should sweep trailing shin');
});

test('Van Tich cast gesture raises casting arm and keeps mounted saddle anchored', () => {
  const neutral = computeVanTichPose({
    elapsed: 1.0,
    moving: 0,
    aiming: 0,
    dash: 0,
    turnRate: 0,
    castRatio: 0,
    mounted: false,
  });
  const casting = computeVanTichPose({
    elapsed: 1.0,
    moving: 0,
    aiming: 0,
    dash: 0,
    turnRate: 0,
    castRatio: 0.5,
    mounted: false,
  });
  const mounted = computeVanTichPose({
    elapsed: 1.0,
    moving: 1,
    aiming: 0,
    dash: 0,
    turnRate: 1.5,
    castRatio: 0,
    mounted: true,
  });

  assert.ok(casting.rightArmPitch < neutral.rightArmPitch - 0.8, 'cast gesture should raise right casting arm');
  assert.equal(mounted.hoverY, 0, 'mounted stance must remain anchored on saddle');
  assert.ok(mounted.leftThighPitch <= -0.9 && mounted.leftShinPitch >= 1.1, 'mounted thighs/shins must bend cleanly');
});

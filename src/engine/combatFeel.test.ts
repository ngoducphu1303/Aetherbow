import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeCameraSightline,
  computeTraumaShake,
  projectFloatingScreenPos,
  yawToRadarDegrees,
} from './combatFeel';

test('yawToRadarDegrees maps Three.js facing yaw to cardinal minimap directions', () => {
  assert.equal(yawToRadarDegrees(Math.PI), 0); // North (-Z) points UP
  assert.equal(yawToRadarDegrees(Math.PI / 2), 90); // East (+X) points RIGHT
  assert.equal(yawToRadarDegrees(0), 180); // South (+Z) points DOWN
  assert.equal(yawToRadarDegrees(-Math.PI / 2), 270); // West (-X) points LEFT
});

test('computeCameraSightline biases look target smoothly toward active enemy or boss', () => {
  const idle = computeCameraSightline(0, 6, 0, -6, false);
  const locked = computeCameraSightline(0, 6, 0, -6, true, false);
  const boss = computeCameraSightline(0, 6, 0, -6, true, true);

  assert.ok(locked.lookZ < idle.lookZ, 'Combat sightline should lead north toward enemy');
  assert.ok(boss.lookZ < locked.lookZ, 'Boss sightline should give stronger framing weight');
  assert.ok(boss.lookZ >= -8.2 && boss.lookZ <= 6.5, 'Look target must stay clamped inside arena');
});

test('computeTraumaShake scales quadratically and returns zero below threshold', () => {
  const rest = computeTraumaShake(0, 1.2);
  assert.equal(rest.offsetX, 0);
  assert.equal(rest.offsetY, 0);
  assert.equal(rest.rollZ, 0);

  const half = computeTraumaShake(0.5, 0.7);
  const full = computeTraumaShake(1.0, 0.7);
  assert.ok(
    Math.abs(full.offsetX) > Math.abs(half.offsetX) * 3.5,
    'Quadratic trauma should scale ~4x from 0.5 to 1.0'
  );
  assert.ok(Math.abs(full.rollZ) <= 0.025, 'Micro-roll stays cinematic and bounded');
});

test('projectFloatingScreenPos rejects behind-camera NDC and clamps with spread jitter', () => {
  const behind = projectFloatingScreenPos(0, 0, 1.2, 1440, 900, 1);
  assert.equal(behind.visible, false);

  const clipNear = projectFloatingScreenPos(0, 0, -1.05, 1440, 900, 1);
  assert.equal(clipNear.visible, false);

  const a = projectFloatingScreenPos(0, 0, 0.5, 1440, 900, 1);
  const b = projectFloatingScreenPos(0, 0, 0.5, 1440, 900, 2);
  assert.equal(a.visible, true);
  assert.notEqual(a.x, b.x, 'Sequential hits should spread horizontally for readability');

  const edge = projectFloatingScreenPos(1.5, -1.5, 0.2, 1440, 900, 3);
  assert.equal(edge.visible, true);
  assert.ok(edge.x <= 1440 - 44 && edge.y <= 900 - 54);
});

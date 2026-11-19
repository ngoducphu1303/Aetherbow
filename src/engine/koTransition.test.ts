import test from 'node:test';
import assert from 'node:assert/strict';
import { computeKoPose } from './koTransition';

test('computeKoPose starts upright at full baseScale', () => {
  const start = computeKoPose(0, 1.38);
  assert.equal(start.t, 0);
  assert.equal(start.pitchX, 0);
  assert.equal(start.offsetY, 0);
  assert.ok(Math.abs(start.scale - 1.38) < 1e-6);
  assert.equal(start.velocityFactor, 1);
});

test('computeKoPose preserves readable topple silhouette mid-transition and peaks emissive flash', () => {
  const mid = computeKoPose(0.45, 1.24);
  assert.ok(mid.pitchX < -0.9 && mid.pitchX > -1.32, `Expected substantial pitch topple, got ${mid.pitchX}`);
  assert.ok(Math.abs(mid.scale - 1.24) < 1e-6, 'Should stay full scale until dissolve phase starts');
  assert.ok(mid.emissiveFlash > 1.2, 'Should emit bright dissolve glow');
});

test('computeKoPose dissolves cleanly to minimal scale at end and clamps out-of-range inputs', () => {
  const end = computeKoPose(1.5, 1.38);
  assert.equal(end.t, 1);
  assert.ok(Math.abs(end.pitchX - -1.32) < 1e-6);
  assert.ok(end.scale <= 0.04, `Expected dissolved scale, got ${end.scale}`);
  assert.ok(end.scale >= 0.02);

  const neg = computeKoPose(-0.4, 1.0);
  assert.equal(neg.t, 0);
  assert.equal(neg.scale, 1.0);
});

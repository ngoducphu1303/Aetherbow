import test from 'node:test';
import assert from 'node:assert/strict';
import { computeComboHitPitch, stepGhostRatio } from './audioCurves';

test('computeComboHitPitch scales smoothly with combo streak and caps at 1.35x', () => {
  assert.equal(computeComboHitPitch(-2), 1);
  assert.equal(computeComboHitPitch(0), 1);
  assert.equal(computeComboHitPitch(1), 1);
  const mid = computeComboHitPitch(18);
  assert.ok(mid > 1.15 && mid < 1.2, `Expected mid combo pitch around 1.175, got ${mid}`);
  assert.equal(computeComboHitPitch(35), 1.35);
  assert.equal(computeComboHitPitch(99), 1.35);
});

test('stepGhostRatio snaps upward on heal and trails smoothly downward on damage', () => {
  assert.equal(stepGhostRatio(0.4, 0.85, 0.016), 0.85);
  const afterOneFrame = stepGhostRatio(1.0, 0.5, 0.05);
  assert.ok(afterOneFrame < 1.0 && afterOneFrame > 0.5, `Expected smooth trail, got ${afterOneFrame}`);
  const afterLongWait = stepGhostRatio(1.0, 0.5, 2.0);
  assert.equal(afterLongWait, 0.5);
});

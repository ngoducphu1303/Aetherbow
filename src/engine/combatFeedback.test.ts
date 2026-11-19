import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAimSightlineTransform,
  computeHitIndicatorAngleDeg,
  computeImpactDecalState,
  resolveEnemyStatusTint,
} from './combatFeedback';

test('resolveEnemyStatusTint obeys combat priority hierarchy', () => {
  const hit = resolveEnemyStatusTint({
    hitFlashTimer: 0.08,
    stunTimer: 2,
    chillTimer: 2,
    burnTimer: 2,
    poisonDps: 10,
    isMarked: true,
    elapsed: 1,
  });
  assert.equal(hit.hex, 0xfff3c4);
  assert.equal(hit.intensity, 1.15);

  const stun = resolveEnemyStatusTint({
    hitFlashTimer: 0,
    stunTimer: 1.5,
    chillTimer: 2,
    burnTimer: 2,
    poisonDps: 0,
    isMarked: false,
    elapsed: 0.5,
  });
  assert.equal(stun.hex, 0xfde047);
  assert.ok(stun.intensity >= 0.55 && stun.intensity <= 0.92);

  const chill = resolveEnemyStatusTint({
    hitFlashTimer: 0,
    chillTimer: 1.2,
    burnTimer: 2,
    poisonDps: 5,
    isMarked: true,
    elapsed: 1,
  });
  assert.equal(chill.hex, 0x22d3ee);

  const burn = resolveEnemyStatusTint({
    hitFlashTimer: 0,
    chillTimer: 0,
    burnTimer: 1.8,
    poisonDps: 5,
    isMarked: true,
    elapsed: 1,
  });
  assert.equal(burn.hex, 0xf97316);

  const poison = resolveEnemyStatusTint({
    hitFlashTimer: 0,
    chillTimer: 0,
    burnTimer: 0,
    poisonDps: 12,
    isMarked: true,
    elapsed: 1,
  });
  assert.equal(poison.hex, 0x4ade80);

  const marked = resolveEnemyStatusTint({
    hitFlashTimer: 0,
    chillTimer: 0,
    burnTimer: 0,
    poisonDps: 0,
    isMarked: true,
    elapsed: 1,
  });
  assert.equal(marked.hex, 0x34d399);

  const none = resolveEnemyStatusTint({
    hitFlashTimer: 0,
    chillTimer: 0,
    burnTimer: 0,
    poisonDps: 0,
    isMarked: false,
    elapsed: 1,
  });
  assert.equal(none.intensity, 0);
});

test('computeHitIndicatorAngleDeg maps world directions to clockwise screen bearings', () => {
  assert.equal(computeHitIndicatorAngleDeg(0, 0, 0, -5), 0); // North (top)
  assert.equal(computeHitIndicatorAngleDeg(0, 0, 5, 0), 90); // East (right)
  assert.equal(computeHitIndicatorAngleDeg(0, 0, 0, 5), 180); // South (bottom)
  assert.equal(computeHitIndicatorAngleDeg(0, 0, -5, 0), 270); // West (left)
  assert.equal(computeHitIndicatorAngleDeg(2, 3, 2.01, 3.01), null);
});

test('computeAimSightlineTransform hides at point-blank range and ramps opacity with bow draw', () => {
  const tooClose = computeAimSightlineTransform(0, 0, 0.3, 0.3, 0.5);
  assert.equal(tooClose.visible, false);

  const startDraw = computeAimSightlineTransform(0, 0, 0, -6, 0);
  const fullDraw = computeAimSightlineTransform(0, 0, 0, -6, 1);
  assert.equal(startDraw.visible, true);
  assert.ok(startDraw.length > 4.5 && startDraw.length < 6);
  assert.ok(fullDraw.opacity > startDraw.opacity);
  assert.ok(fullDraw.opacity <= 0.65);
});

test('computeImpactDecalState expands on pop-in and fades smoothly to zero', () => {
  const early = computeImpactDecalState(1.5, 1.6, 2.0);
  const mid = computeImpactDecalState(0.9, 1.6, 2.0);
  const late = computeImpactDecalState(0.1, 1.6, 2.0);
  const ended = computeImpactDecalState(0, 1.6, 2.0);

  assert.ok(early.scale < mid.scale);
  assert.ok(mid.opacity > late.opacity);
  assert.equal(ended.opacity, 0);
});

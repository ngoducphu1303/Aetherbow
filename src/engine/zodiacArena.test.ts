import assert from 'node:assert/strict';
import test from 'node:test';
import {
  computeBossBgmStepDuration,
  computeBossIntroBlend,
  computeCountdownRingScale,
  resolveZodiacArenaStyle,
} from './zodiacArena';

test('resolveZodiacArenaStyle covers all 12 zodiac signs across 4 distinct elemental styles', () => {
  const fire = ['leo', 'aries', 'sagittarius'];
  const water = ['cancer', 'pisces', 'scorpio'];
  const air = ['gemini', 'libra', 'aquarius'];
  const earth = ['taurus', 'virgo', 'capricorn'];

  for (const z of fire) {
    assert.equal(resolveZodiacArenaStyle(z).style, 'solar_obelisk');
  }
  for (const z of water) {
    assert.equal(resolveZodiacArenaStyle(z).style, 'frost_lotus');
  }
  for (const z of air) {
    assert.equal(resolveZodiacArenaStyle(z).style, 'astral_orrery');
  }
  for (const z of earth) {
    assert.equal(resolveZodiacArenaStyle(z).style, 'earth_monolith');
  }
});

test('computeBossIntroBlend ramps smoothly in, holds peak, and returns to 0 cleanly', () => {
  assert.equal(computeBossIntroBlend(0, 1.55), 0);
  assert.equal(computeBossIntroBlend(1.55, 1.55), 0);
  const rampIn = computeBossIntroBlend(1.55 * 0.88, 1.55);
  assert.ok(rampIn > 0.2 && rampIn < 1, `Expected smooth ramp-in, got ${rampIn}`);
  const holdPeak = computeBossIntroBlend(1.55 * 0.55, 1.55);
  assert.equal(holdPeak, 1);
  const easeOut = computeBossIntroBlend(1.55 * 0.15, 1.55);
  assert.ok(easeOut > 0 && easeOut < 1, `Expected smooth ease-out, got ${easeOut}`);
});

test('computeCountdownRingScale contracts monotonically and triggers imminent flash near impact', () => {
  const start = computeCountdownRingScale(0);
  const mid = computeCountdownRingScale(0.5);
  const imminent = computeCountdownRingScale(0.88);
  const end = computeCountdownRingScale(1.0);

  assert.ok(start.scale > mid.scale && mid.scale > imminent.scale && imminent.scale >= end.scale);
  assert.equal(start.isImminent, false);
  assert.equal(mid.isImminent, false);
  assert.equal(imminent.isImminent, true);
  assert.equal(end.isImminent, true);
});

test('computeBossBgmStepDuration accelerates across Boss phases I -> II -> III', () => {
  const p1 = computeBossBgmStepDuration(1);
  const p2 = computeBossBgmStepDuration(2);
  const p3 = computeBossBgmStepDuration(3);
  assert.ok(p1 > p2 && p2 > p3);
  assert.equal(p1, 0.21);
  assert.equal(p2, 0.185);
  assert.equal(p3, 0.165);
});

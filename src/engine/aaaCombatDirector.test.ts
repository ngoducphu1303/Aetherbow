import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeBossKillSlowMoState,
  computeBowStringPose,
  computeCloakWavePose,
  computeComboStyleRank,
  computeZodiacUrnPlacements,
  evaluateElementalZoneEffect,
} from './aaaCombatDirector';

test('computeComboStyleRank escalates smoothly across all 6 Action-RPG grades C through SSS', () => {
  assert.equal(computeComboStyleRank(0).grade, 'C');
  assert.equal(computeComboStyleRank(7).grade, 'C');
  assert.equal(computeComboStyleRank(8).grade, 'B');
  assert.equal(computeComboStyleRank(16).grade, 'A');
  assert.equal(computeComboStyleRank(28).grade, 'S');
  assert.equal(computeComboStyleRank(45).grade, 'SS');
  const sss = computeComboStyleRank(65);
  assert.equal(sss.grade, 'SSS');
  assert.equal(sss.nextThreshold, null);
  assert.equal(computeComboStyleRank(-10).grade, 'C');
});

test('computeBossKillSlowMoState holds deep slow-mo early and eases cleanly back to real-time', () => {
  const inactive = computeBossKillSlowMoState(0, 0.85);
  assert.equal(inactive.active, false);
  assert.equal(inactive.timeScale, 1);
  assert.equal(inactive.letterboxRatio, 0);

  const peak = computeBossKillSlowMoState(0.55, 0.85);
  assert.equal(peak.active, true);
  assert.equal(peak.timeScale, 0.22);
  assert.equal(peak.cameraBlend, 1);
  assert.ok(peak.fovBoost < -3.5);
  assert.equal(peak.letterboxRatio, 1);

  const tail = computeBossKillSlowMoState(0.08, 0.85);
  assert.equal(tail.active, true);
  assert.ok(tail.timeScale > 0.65 && tail.timeScale <= 1);
  assert.ok(tail.cameraBlend < 0.5);
});

test('computeBowStringPose stretches and angles V-string symmetrically as draw increases', () => {
  const rest = computeBowStringPose(0);
  assert.equal(rest.topRotX, 0);
  assert.equal(rest.bottomRotX, 0);
  assert.equal(rest.segmentScaleY, 1);
  assert.equal(rest.nockZ, 0.2);

  const full = computeBowStringPose(1);
  assert.ok(full.topRotX > 0.35);
  assert.equal(full.bottomRotX, -full.topRotX);
  assert.ok(full.segmentScaleY > 1.08);
  assert.ok(full.nockZ < rest.nockZ);
  assert.ok(full.tipEmissiveIntensity > rest.tipEmissiveIntensity);
});

test('computeCloakWavePose reacts to movement speed and amplifies dramatically on dash', () => {
  const idle = computeCloakWavePose({
    elapsed: 1.0,
    speedMag: 0,
    isDashing: false,
    stridePhase: 0,
  });
  const run = computeCloakWavePose({
    elapsed: 1.0,
    speedMag: 6.5,
    isDashing: false,
    stridePhase: 1.2,
  });
  const dash = computeCloakWavePose({
    elapsed: 1.0,
    speedMag: 14,
    isDashing: true,
    stridePhase: 1.2,
  });

  assert.ok(run.rotX > idle.rotX);
  assert.ok(dash.rotX > run.rotX + 0.45);
  assert.ok(dash.scaleZ > run.scaleZ);
});

test('computeZodiacUrnPlacements returns up to 3 distinct tactical urns clear of spawn, portal, and pillars', () => {
  const obstacles = [
    { x: -5.2, z: -2.5, radius: 0.92 },
    { x: 5.2, z: -2.5, radius: 0.92 },
    { x: -5.2, z: 4.2, radius: 0.92 },
    { x: 5.2, z: 4.2, radius: 0.92 },
  ];
  const urns = computeZodiacUrnPlacements(38, obstacles);
  assert.equal(urns.length, 3);
  const variants = new Set(urns.map((u) => u.variant));
  assert.deepEqual(variants, new Set(['heal', 'ult', 'gold']));

  for (const urn of urns) {
    assert.ok(Math.hypot(urn.x, urn.z - 8.2) >= 3.6, 'urn must stay clear of hero spawn');
    assert.ok(Math.hypot(urn.x, urn.z + 10.5) >= 3.4, 'urn must stay clear of north portal');
    for (const obs of obstacles) {
      assert.ok(
        Math.hypot(urn.x - obs.x, urn.z - obs.z) >= obs.radius + 1.35,
        'urn must stay clear of pillar obstacles'
      );
    }
  }
});

test('evaluateElementalZoneEffect applies Ember burn and Frost chill accurately within radius', () => {
  const outside = evaluateElementalZoneEffect('ember', 100, 3.1, 2.2);
  assert.equal(outside.inside, false);
  assert.equal(outside.tickDamage, 0);
  assert.equal(outside.applyBurn, false);

  const ember = evaluateElementalZoneEffect('ember', 100, 1.4, 2.2);
  assert.equal(ember.inside, true);
  assert.equal(ember.tickDamage, 28);
  assert.equal(ember.applyBurn, true);
  assert.equal(ember.applyChill, false);

  const frost = evaluateElementalZoneEffect('frost', 100, 0.8, 2.2);
  assert.equal(frost.inside, true);
  assert.equal(frost.tickDamage, 14);
  assert.equal(frost.applyBurn, false);
  assert.equal(frost.applyChill, true);
});

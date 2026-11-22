import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AaaMobKind,
  computeAaaMobSteering,
  computeDirectionalHitImpulse,
  computeHadesTelegraphCue,
  computeProceduralEnemyAaaPose,
  computeSafeFlankBlinkTarget,
  dampShortestYaw,
  getAaaMobVfxBudget,
  planAaaMobSkill,
  stepDirectionalRecoil,
  stepMobPhysicalDash,
} from './aaaEnemyCombatEngine';

const ALL_MOB_KINDS: AaaMobKind[] = [
  'SKIRMISHER',
  'GOLEM',
  'IMP_ARCHER',
  'DRAGON_WHELP',
  'WISP',
  'SHADOW_STALKER',
];

test('Lite vs High VFX budgets protect Dell Latitude E5430 while keeping strike cues crisp', () => {
  const high = getAaaMobVfxBudget(false);
  const lite = getAaaMobVfxBudget(true);

  assert.equal(high.maxMobMortarCircles, 5);
  assert.equal(lite.maxMobMortarCircles, 2);
  assert.ok(lite.footstepDustChance < high.footstepDustChance);
  assert.ok(lite.trailParticleScale < high.trailParticleScale);
  assert.equal(high.allowSkidDust, true);
  assert.equal(lite.allowSkidDust, false);
  assert.equal(lite.allowFissureSparks, false);
  assert.equal(lite.allowStrikeRingFlash, true);
});

test('dampShortestYaw rotates smoothly across the +/-PI wrap boundary', () => {
  const current = Math.PI - 0.1;
  const target = -Math.PI + 0.1; // shortest delta is +0.2 rad
  const next = dampShortestYaw(current, target, 10, 0.05);
  // Must step forward across PI (either slightly > current or wrapped slightly > -PI)
  const distToTargetBefore = Math.abs(0.2);
  let distAfter = Math.abs(next - target);
  if (distAfter > Math.PI) distAfter = Math.PI * 2 - distAfter;
  assert.ok(distAfter < distToTargetBefore, `expected shorter arc, got next=${next}`);
});

test('computeAaaMobSteering provides smooth inertia, squad separation, obstacle avoidance, and ranged kiting', () => {
  // 1. Acceleration inertia (does not snap to full speed in a single 16ms frame)
  const firstStep = computeAaaMobSteering({
    kind: 'GOLEM',
    selfId: 1,
    x: 0,
    z: 8,
    vx: 0,
    vz: 0,
    radius: 0.9,
    baseSpeed: 3.6,
    facingYaw: Math.PI,
    playerX: 0,
    playerZ: 0,
    flankSign: 1,
    isTelegraphing: false,
    sideHopTimer: 0,
    sideHopDirX: 0,
    sideHopDirZ: 0,
    elapsedTime: 1.0,
    dt: 0.016,
    currentBankRoll: 0,
    currentBankPitch: 0,
  });
  const speedAfterOneFrame = Math.hypot(firstStep.vx, firstStep.vz);
  assert.ok(speedAfterOneFrame > 0.05 && speedAfterOneFrame < 1.2);

  // 2. Squad separation: two stacked skirmishers diverge cleanly instead of overlapping
  const mobA = {
    x: 0,
    z: 6,
    radius: 0.65,
    id: 10,
    dead: false,
  };
  const mobB = {
    x: 0.3,
    z: 6.0,
    radius: 0.65,
    id: 11,
    dead: false,
  };
  const steerA = computeAaaMobSteering(
    {
      kind: 'SKIRMISHER',
      selfId: 10,
      x: mobA.x,
      z: mobA.z,
      vx: 0,
      vz: 0,
      radius: mobA.radius,
      baseSpeed: 4.5,
      facingYaw: Math.PI,
      playerX: 0,
      playerZ: 0,
      flankSign: -1,
      isTelegraphing: false,
      sideHopTimer: 0,
      sideHopDirX: 0,
      sideHopDirZ: 0,
      elapsedTime: 2.0,
      dt: 0.05,
      currentBankRoll: 0,
      currentBankPitch: 0,
      neighbors: [mobA, mobB],
    },
    { vx: 0, vz: 0, desiredDirX: 0, desiredDirZ: 0, targetYaw: 0, lateralSpeed: 0, forwardSpeed: 0, bankRoll: 0, bankPitch: 0, isSkidding: false }
  );
  const steerB = computeAaaMobSteering(
    {
      kind: 'SKIRMISHER',
      selfId: 11,
      x: mobB.x,
      z: mobB.z,
      vx: 0,
      vz: 0,
      radius: mobB.radius,
      baseSpeed: 4.5,
      facingYaw: Math.PI,
      playerX: 0,
      playerZ: 0,
      flankSign: 1,
      isTelegraphing: false,
      sideHopTimer: 0,
      sideHopDirX: 0,
      sideHopDirZ: 0,
      elapsedTime: 2.0,
      dt: 0.05,
      currentBankRoll: 0,
      currentBankPitch: 0,
      neighbors: [mobA, mobB],
    },
    { vx: 0, vz: 0, desiredDirX: 0, desiredDirZ: 0, targetYaw: 0, lateralSpeed: 0, forwardSpeed: 0, bankRoll: 0, bankPitch: 0, isSkidding: false }
  );
  assert.ok(steerA.vx < 0 && steerB.vx > 0, 'adjacent melee mobs must fan apart laterally');

  // 3. Proactive obstacle tangent avoidance
  const avoidRes = computeAaaMobSteering({
    kind: 'SKIRMISHER',
    selfId: 2,
    x: 0,
    z: 4.0,
    vx: 0,
    vz: -2,
    radius: 0.65,
    baseSpeed: 4.5,
    facingYaw: Math.PI,
    playerX: 0,
    playerZ: 0,
    flankSign: 1,
    isTelegraphing: false,
    sideHopTimer: 0,
    sideHopDirX: 0,
    sideHopDirZ: 0,
    elapsedTime: 1.0,
    dt: 0.05,
    currentBankRoll: 0,
    currentBankPitch: 0,
    obstacles: [{ x: 0, z: 2.5, radius: 1.1, intact: true }],
  });
  assert.ok(Math.abs(avoidRes.desiredDirX) > 0.25, 'should steer laterally around blocking pillar');

  // 4. Ranged tactical kiting when hero crowds IMP_ARCHER
  const kiteRes = computeAaaMobSteering({
    kind: 'IMP_ARCHER',
    selfId: 3,
    x: 0,
    z: 3.5,
    vx: 0,
    vz: 0,
    radius: 0.65,
    baseSpeed: 3.8,
    facingYaw: Math.PI,
    playerX: 0,
    playerZ: 0,
    flankSign: 1,
    isTelegraphing: false,
    sideHopTimer: 0,
    sideHopDirX: 0,
    sideHopDirZ: 0,
    elapsedTime: 1.0,
    dt: 0.08,
    currentBankRoll: 0,
    currentBankPitch: 0,
  });
  assert.ok(kiteRes.vz > 0.2, 'IMP_ARCHER must backpedal away when hero is closer than 6.4m');
});

test('Zero-root telegraph mobility keeps all 6 mob archetypes moving fluidly during telegraphs', () => {
  for (const kind of ALL_MOB_KINDS) {
    const res = computeAaaMobSteering({
      kind,
      selfId: 7,
      x: 4,
      z: 6,
      vx: 0,
      vz: 0,
      radius: 0.7,
      baseSpeed: 4.0,
      facingYaw: 0,
      playerX: 0,
      playerZ: 0,
      flankSign: 1,
      isTelegraphing: true,
      sideHopTimer: 0,
      sideHopDirX: 0,
      sideHopDirZ: 0,
      elapsedTime: 2.5,
      dt: 0.08,
      currentBankRoll: 0,
      currentBankPitch: 0,
    });
    const spd = Math.hypot(res.vx, res.vz);
    assert.ok(spd > 0.3, `${kind} should retain smooth telegraph mobility, got speed=${spd}`);
  }
});

test('planAaaMobSkill rotates 2 distinct Hades-style skills for every mob archetype (12 total) and honors Lite mortar cap', () => {
  const seenSkills = new Set<string>();
  for (const kind of ALL_MOB_KINDS) {
    const p0 = planAaaMobSkill(
      {
        kind,
        skillCycle: 0,
        enemyX: 0,
        enemyZ: 6,
        playerX: 0,
        playerZ: 0,
        playerVx: 4.5,
        playerVz: 0,
        baseCooldown: 1.85,
        allowMortar: true,
        chapterIndex: 1,
      },
      {
        skillId: 'pounce_lunge',
        telegraphDuration: 0,
        nextCooldown: 0,
        aimX: 0,
        aimZ: 0,
        targetX: 0,
        targetZ: 0,
        telegraphColorHex: 0,
        telegraphRadius: 0,
        telegraphType: 'circle',
        telegraphRange: 0,
        telegraphWidth: 0,
        nextSkillCycle: 0,
        shouldFlipFlank: false,
      }
    );
    const p1 = planAaaMobSkill(
      {
        kind,
        skillCycle: 1,
        enemyX: 0,
        enemyZ: 6,
        playerX: 0,
        playerZ: 0,
        playerVx: 4.5,
        playerVz: 0,
        baseCooldown: 1.85,
        allowMortar: true,
        chapterIndex: 1,
      },
      {
        skillId: 'pounce_lunge',
        telegraphDuration: 0,
        nextCooldown: 0,
        aimX: 0,
        aimZ: 0,
        targetX: 0,
        targetZ: 0,
        telegraphColorHex: 0,
        telegraphRadius: 0,
        telegraphType: 'circle',
        telegraphRange: 0,
        telegraphWidth: 0,
        nextSkillCycle: 0,
        shouldFlipFlank: false,
      }
    );
    assert.notEqual(p0.skillId, p1.skillId, `${kind} must rotate between 2 distinct skills`);
    assert.ok(p0.aimX > 0.05, `${kind} should lead slightly toward moving player`);
    seenSkills.add(p0.skillId);
    seenSkills.add(p1.skillId);
  }
  assert.equal(seenSkills.size, 12, 'expected 12 unique AAA regular mob skills');

  // Lite mortar cap fallback
  const cappedArcher = planAaaMobSkill({
    kind: 'IMP_ARCHER',
    skillCycle: 1,
    enemyX: 0,
    enemyZ: 8,
    playerX: 0,
    playerZ: 0,
    playerVx: 0,
    playerVz: 0,
    baseCooldown: 1.85,
    allowMortar: false,
    chapterIndex: 1,
  });
  assert.equal(cappedArcher.skillId, 'arcane_tri_volley');
});

test('stepMobPhysicalDash advances smoothly over time with parabolic hop height and no 1-frame teleport', () => {
  let x = 0;
  let z = 6;
  let elapsed = 0;
  let maxHop = 0;
  let steps = 0;
  let finished = false;

  while (!finished && steps < 40) {
    const res = stepMobPhysicalDash({
      x,
      z,
      dirX: 0,
      dirZ: -1,
      speed: 16.5,
      elapsed,
      duration: 0.28,
      hopHeight: 0.85,
      radius: 0.65,
      arenaHalfW: 16,
      arenaHalfD: 16,
      dt: 0.02,
      obstacles: [{ x: 0, z: 4, radius: 1.0, intact: false }], // shattered pillar ignored
    });
    const frameDist = Math.hypot(res.x - x, res.z - z);
    assert.ok(frameDist < 0.6, `dash must never teleport in a single frame, moved ${frameDist}`);
    x = res.x;
    z = res.z;
    elapsed = res.elapsed;
    maxHop = Math.max(maxHop, res.hopHeightY);
    finished = res.finished;
    steps += 1;
  }

  assert.equal(finished, true);
  assert.ok(steps >= 13 && steps <= 15);
  assert.ok(maxHop > 0.75 && maxHop <= 0.86, `expected parabolic hop apex ~0.85, got ${maxHop}`);
  assert.ok(z < 2.2, `expected solid forward pounce distance, landed at z=${z}`);
});

test('computeHadesTelegraphCue triggers final-20% strike flash cue cleanly', () => {
  const early = computeHadesTelegraphCue(0.35, 0.5); // 30% progress
  assert.equal(early.inStrikeWindow, false);
  assert.equal(early.flashIntensity, 0);
  assert.equal(early.ringScaleBoost, 1);
  const earlyOpacity = early.fillOpacity;

  const strike = computeHadesTelegraphCue(0.06, 0.5); // 88% progress (final 20%)
  assert.equal(strike.inStrikeWindow, true);
  assert.ok(strike.flashIntensity > 0.5);
  assert.ok(strike.ringScaleBoost > 1.0);
  assert.ok(strike.fillOpacity > earlyOpacity);
});

test('Directional hit-recoil pushes away from attacker, respects boss weight, and decays smoothly', () => {
  const mobHit = computeDirectionalHitImpulse(0, 5, 0, 0, false, false, { impulseX: 0, impulseZ: 0 });
  const mobCrit = computeDirectionalHitImpulse(0, 5, 0, 0, true, false, { impulseX: 0, impulseZ: 0 });
  const bossHit = computeDirectionalHitImpulse(0, 5, 0, 0, false, true, { impulseX: 0, impulseZ: 0 });

  assert.ok(mobHit.impulseZ > 0, 'hit from z=0 onto enemy at z=5 must push +Z away');
  assert.ok(mobCrit.impulseZ > mobHit.impulseZ, 'critical hit must trigger stronger recoil');
  assert.ok(bossHit.impulseZ < mobHit.impulseZ, 'boss recoil must be heavier/smaller than regular mob');

  const decayed = stepDirectionalRecoil(mobCrit.impulseX, mobCrit.impulseZ, Math.PI, 0.05);
  assert.ok(decayed.recoilZ > 0 && decayed.recoilZ < mobCrit.impulseZ);
  assert.ok(decayed.recoilPitch < 0, 'frontal hit while facing player (-Z) pitches enemy back');
});

test('computeSafeFlankBlinkTarget always preserves >= 3.4m fair safety buffer and stays in arena', () => {
  const dest = computeSafeFlankBlinkTarget({
    enemyX: 1.0,
    enemyZ: 1.0,
    playerX: 0,
    playerZ: 0,
    flankSign: 1,
    desiredDistance: 5.0,
    minSafeDistance: 3.5,
    radius: 0.7,
    arenaHalfW: 16,
    arenaHalfD: 16,
    obstacles: [{ x: 4.5, z: 0, radius: 1.2, intact: true }],
  });
  const distToPlayer = Math.hypot(dest.x, dest.z);
  assert.ok(distToPlayer >= 3.45, `blink must stay >= 3.45m from hero, got ${distToPlayer}`);
  assert.ok(Math.abs(dest.x) <= 15.0 && Math.abs(dest.z) <= 15.0);
});

test('computeProceduralEnemyAaaPose outputs distinct anticipation crouch and active strike lunge for Chapters 2-12', () => {
  const telePose = computeProceduralEnemyAaaPose(
    {
      speedRatio: 0.4,
      isTelegraphing: true,
      telegraphProgress: 0.85,
      burstTimer: 0,
      bankRoll: 0.08,
      bankPitch: 0.05,
      recoilPitch: 0,
      recoilRoll: 0,
      hitSquash: 0,
      isBoss: false,
    },
    { scaleX: 1, scaleY: 1, scaleZ: 1, pitchX: 0, rollZ: 0, lungeOffsetZ: 0, crouchOffsetY: 0 }
  );
  const strikePose = computeProceduralEnemyAaaPose(
    {
      speedRatio: 0.9,
      isTelegraphing: false,
      telegraphProgress: 0,
      burstTimer: 0.16,
      bankRoll: 0,
      bankPitch: 0.1,
      recoilPitch: 0,
      recoilRoll: 0,
      hitSquash: 0,
      isBoss: false,
    },
    { scaleX: 1, scaleY: 1, scaleZ: 1, pitchX: 0, rollZ: 0, lungeOffsetZ: 0, crouchOffsetY: 0 }
  );
  assert.ok(telePose.crouchOffsetY < 0 && telePose.scaleY < 1, 'telegraph should coil/crouch down');
  assert.ok(strikePose.lungeOffsetZ > 0 && strikePose.pitchX > 0.15, 'strike burst should lunge forward');
});

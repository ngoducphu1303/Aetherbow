import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_TACTIC_CONFIGS,
  advanceKinestheticsTick,
  computeAiCompanionDecision,
  computeAiRivalDuelDecision,
  computeAutoPilotDecision,
  createDeterministicKinestheticsClock,
  selectBestSkillChoice,
  shouldManualOverride,
  triggerDeterministicHitStop,
  triggerDeterministicPerfectDodgeBurst,
} from '../src/engine/aiCombatBrain.ts';
import { createFixedTimestepClock, stepFixedTimestep } from '../src/engine/fixedTimestep.ts';
import { migrateSaveData } from '../src/data/earlyProgressionData.ts';
import { SKILLS_CATALOG } from '../src/data/skillsData.ts';

test('AI Auto-Pilot actively dodges Boss slam, lane, and lunge telegraphs and triggers urgent dash', () => {
  // 1. Urgent Boss Slam directly on player -> must steer out + dash
  const slamDecision = computeAutoPilotDecision({
    tactic: 'balanced',
    simTimeSec: 4.2,
    playerX: 0.4,
    playerZ: 0.2,
    hpRatio: 0.9,
    ultCharge: 40,
    dashReady: true,
    activeSkillReady: false,
    overchargeRatio: 0.5,
    portalOpen: false,
    portalX: 0,
    portalZ: -11,
    arenaHalfW: 11,
    arenaHalfD: 12,
    enemies: [{ id: 1, x: 0, z: -4, hp: 5000, maxHp: 5000, isBoss: true, radius: 1.4 }],
    telegraphs: [{ kind: 'slam', x: 0, z: 0, radius: 3.4, timeRemainingSec: 0.25 }],
    incomingBullets: [],
  });
  assert.equal(slamDecision.evadingDanger, true);
  assert.equal(slamDecision.wantDash, true);
  assert.ok(Math.hypot(slamDecision.moveX, slamDecision.moveZ) > 0.95);
  assert.ok(slamDecision.moveX > 0.4, 'Should flee away from slam center');

  // 2. Boss linear lane telegraph across z=0 -> must step perpendicular off the lane
  const laneDecision = computeAutoPilotDecision({
    tactic: 'balanced',
    simTimeSec: 6.1,
    playerX: 0.3,
    playerZ: 0.5,
    hpRatio: 0.85,
    ultCharge: 20,
    dashReady: true,
    activeSkillReady: false,
    overchargeRatio: 0.2,
    portalOpen: false,
    portalX: 0,
    portalZ: -11,
    arenaHalfW: 11,
    arenaHalfD: 12,
    enemies: [{ id: 1, x: 0, z: -8, hp: 5000, maxHp: 5000, isBoss: true, radius: 1.4 }],
    telegraphs: [
      { kind: 'lane', x: 0, z: -8, endX: 0, endZ: 8, radius: 1.8, timeRemainingSec: 0.55 },
    ],
    incomingBullets: [],
  });
  assert.equal(laneDecision.evadingDanger, true);
  assert.ok(laneDecision.moveX > 0.7, 'Should side-step laterally out of vertical Boss lane');

  // 3. Incoming high-speed enemy projectile aimed at player -> perpendicular sidestep
  const bulletDecision = computeAutoPilotDecision({
    tactic: 'evasive',
    simTimeSec: 2.0,
    playerX: 0.25,
    playerZ: 4.0,
    hpRatio: 0.9,
    ultCharge: 0,
    dashReady: false,
    activeSkillReady: false,
    overchargeRatio: 0.1,
    portalOpen: false,
    portalX: 0,
    portalZ: -11,
    arenaHalfW: 11,
    arenaHalfD: 12,
    enemies: [{ id: 2, x: 0, z: -4, hp: 500, maxHp: 500, isBoss: false, radius: 0.8 }],
    telegraphs: [],
    incomingBullets: [{ x: 0, z: 0, vx: 0, vz: 14, radius: 0.4 }],
  });
  assert.equal(bulletDecision.evadingDanger, true);
  assert.ok(Math.abs(bulletDecision.moveX) > 0.7, 'Should sidestep perpendicular to bullet path');
});

test('AI Auto-Pilot 3 tactics produce measurably distinct engagement ranges & thresholds', () => {
  assert.ok(AI_TACTIC_CONFIGS.aggressive.preferredMinDist < AI_TACTIC_CONFIGS.balanced.preferredMinDist);
  assert.ok(AI_TACTIC_CONFIGS.balanced.preferredMinDist < AI_TACTIC_CONFIGS.evasive.preferredMinDist);
  assert.ok(AI_TACTIC_CONFIGS.evasive.telegraphPadding > AI_TACTIC_CONFIGS.aggressive.telegraphPadding);
  assert.ok(AI_TACTIC_CONFIGS.evasive.dashUrgencySec > AI_TACTIC_CONFIGS.aggressive.dashUrgencySec);

  // At distance 5.0 from enemy (no telegraphs): Aggressive stands/fires or engages, Evasive backpedals
  const common = {
    simTimeSec: 0.9,
    playerX: 0,
    playerZ: 5.0,
    hpRatio: 0.9,
    ultCharge: 0,
    dashReady: true,
    activeSkillReady: false,
    overchargeRatio: 0.3,
    portalOpen: false,
    portalX: 0,
    portalZ: -11,
    arenaHalfW: 11,
    arenaHalfD: 12,
    enemies: [{ id: 3, x: 0, z: 0, hp: 1000, maxHp: 1000, isBoss: false, radius: 0.8 }],
    telegraphs: [],
    incomingBullets: [],
  };

  const agg = computeAutoPilotDecision({ ...common, tactic: 'aggressive' });
  const eva = computeAutoPilotDecision({ ...common, tactic: 'evasive' });
  assert.equal(agg.moveX, 0);
  assert.equal(agg.moveZ, 0, 'Aggressive stands & fires at sweet-spot 5.0m');
  assert.ok(eva.moveZ > 0.4, 'Evasive backpedals away from 5.0m enemy to open safe margin');
});

test('Manual override triggers instantaneously on WASD/joystick input and Skill Draft prioritizes evolutions', () => {
  assert.equal(shouldManualOverride(0, 0), false);
  assert.equal(shouldManualOverride(0.05, 0.05), false);
  assert.equal(shouldManualOverride(0.8, 0), true);
  assert.equal(shouldManualOverride(0, -0.5), true);

  const byId = (id) => {
    const found = SKILLS_CATALOG[id];
    assert.ok(found, `Skill ${id} must exist`);
    return found;
  };

  // When player already has fire_arrow, super_blaze evolution must beat basic skills
  const choices = [byId('atk_boost'), byId('super_blaze'), byId('aspd_boost')];
  const pick = selectBestSkillChoice(choices, { fire_arrow: 1 }, 'balanced');
  assert.equal(pick?.id, 'super_blaze');
});

test('3D AI Squad Companions differentiate Vanguard / Ranger / Mystic positioning and dodge Boss slams', () => {
  const boss = { id: 10, x: 0, z: -6, hp: 9000, maxHp: 9000, isBoss: true, radius: 1.4 };

  // Vanguard positioned at (0, 2) moves forward between player (0, 5) and boss (0, -6)
  const vanguard = computeAiCompanionDecision({
    role: 'vanguard',
    slotIndex: 0,
    simTimeSec: 1.0,
    x: 0,
    z: 2.0,
    playerX: 0,
    playerZ: 5.0,
    arenaHalfW: 11,
    arenaHalfD: 12,
    target: boss,
    telegraphs: [],
    incomingBullets: [],
  });
  assert.equal(vanguard.evading, false);
  assert.ok(vanguard.steerZ < -0.5, 'Vanguard advances toward frontline between player and boss');

  // Mystic too close to boss at (0, -3) retreats to safe backline
  const mystic = computeAiCompanionDecision({
    role: 'mystic',
    slotIndex: 1,
    simTimeSec: 1.0,
    x: 0,
    z: -3.0,
    playerX: 0,
    playerZ: 5.0,
    arenaHalfW: 11,
    arenaHalfD: 12,
    target: boss,
    telegraphs: [],
    incomingBullets: [],
  });
  assert.ok(mystic.steerZ > 0.4, 'Mystic backs off to maintain ranged support distance');

  // Ranger inside Boss slam telegraph immediately switches to evasion
  const rangerDodge = computeAiCompanionDecision({
    role: 'ranger',
    slotIndex: 0,
    simTimeSec: 2.0,
    x: 0.6,
    z: 0.1,
    playerX: 0,
    playerZ: 6.0,
    arenaHalfW: 11,
    arenaHalfD: 12,
    target: boss,
    telegraphs: [{ kind: 'slam', x: 0, z: 0, radius: 3.0, timeRemainingSec: 0.3 }],
    incomingBullets: [],
  });
  assert.equal(rangerDodge.evading, true);
  assert.ok(rangerDodge.steerX > 0.6);
});

test('Real-time 1v1 AI Rival dodges incoming player arrows', () => {
  const dodge = computeAiRivalDuelDecision({
    personality: 'assassin',
    simTimeSec: 3.1,
    rivalX: 0.2,
    rivalZ: -5.0,
    playerX: 0,
    playerZ: 4.0,
    rivalHpRatio: 0.8,
    arenaHalfW: 11,
    arenaHalfD: 12,
    playerBullets: [{ x: 0, z: -1.0, vx: 0, vz: -18, radius: 0.35 }],
  });
  assert.equal(dodge.evadingArrow, true);
  assert.equal(dodge.wantFire, false);
  assert.ok(Math.abs(dodge.moveX) > 0.75, 'AI Rival sidesteps incoming player arrow');
});

test('Deterministic Kinesthetics Clock (Hit-Stop + Perfect Dodge) maintains bit-for-bit 12 / 30 / 60 FPS parity', () => {
  function runAtFps(fps) {
    const fixedClock = createFixedTimestepClock();
    const kinClock = createDeterministicKinestheticsClock();
    const frameDt = 1 / fps;
    const totalSeconds = 5;
    const totalFrames = fps * totalSeconds;

    let simTicks = 0;
    let effectiveEntityTime = 0;
    let hitStopTicks = 0;
    let slowTicks = 0;

    for (let f = 0; f < totalFrames; f += 1) {
      stepFixedTimestep(fixedClock, frameDt, (dt) => {
        simTicks += 1;
        if (simTicks === 60 || simTicks === 180) {
          triggerDeterministicHitStop(kinClock, 3);
        }
        if (simTicks === 120) {
          triggerDeterministicPerfectDodgeBurst(kinClock, 12);
        }
        const k = advanceKinestheticsTick(kinClock);
        if (k.inHitStop) hitStopTicks += 1;
        if (k.inPerfectDodgeSlow) slowTicks += 1;
        effectiveEntityTime += dt * k.entityTimeScale;
      });
    }
    return {
      simTicks,
      hitStopTicks,
      slowTicks,
      effectiveEntityTime: Number(effectiveEntityTime.toFixed(6)),
      totalHitStopTriggers: kinClock.totalHitStopTriggers,
      totalPerfectDodgeBursts: kinClock.totalPerfectDodgeBursts,
    };
  }

  const r12 = runAtFps(12);
  const r30 = runAtFps(30);
  const r60 = runAtFps(60);

  assert.deepEqual(r12, r60);
  assert.deepEqual(r30, r60);
  assert.equal(r60.simTicks, 300);
  assert.equal(r60.hitStopTicks, 6);
  assert.equal(r60.slowTicks, 12);
  assert.equal(r60.totalHitStopTriggers, 2);
  assert.equal(r60.totalPerfectDodgeBursts, 1);
});

test('migrateSaveData safely initializes aiPreferences while preserving legacy hero selection', () => {
  const legacySave = {
    version: 3,
    selectedHeroId: 'dracoola',
    unlockedHeroes: ['artemis', 'dracoola'],
    gold: 1200,
  };
  const migrated = migrateSaveData(legacySave);
  assert.equal(migrated.selectedHeroId, 'dracoola', 'Legacy selected hero must be preserved');
  assert.ok(migrated.aiPreferences, 'aiPreferences must be initialized on legacy saves');
  assert.equal(migrated.aiPreferences.autoPilotEnabled, false);
  assert.equal(migrated.aiPreferences.tactic, 'balanced');
  assert.deepEqual(migrated.aiPreferences.squadRoles, ['vanguard', 'ranger']);
});

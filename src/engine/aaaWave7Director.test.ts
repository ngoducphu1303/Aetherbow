import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RESONANCE_TRAP_CONFIGS,
  checkBossWeakPointHit,
  computeResonanceTrapPlacements,
  computeSanctuaryAtmosphereWave,
  computeStuckArrowLocalOffset,
  createBossWeakPointWindow,
  evaluateRunCombatMedals,
  evaluateTargetLockState,
  getBossWeakPointWorldPos,
  getChapterWeatherProfile,
  renderAaaMedalCardPngDataUrl,
  stepBossWeakPointWindow,
  stepFootstepRippleDistance,
  stepLobbyInspectRig,
} from './aaaWave7Director';

describe('AAA Wave 7 — Pillar 1: 3D Target Lock, Boss Weak-Point & Stuck Arrows', () => {
  it('classifies normal cyan, Boss gold, and Execute crimson thresholds accurately', () => {
    const normal = evaluateTargetLockState(800, 1000, false);
    assert.equal(normal.isExecuteThreshold, false);
    assert.equal(normal.reticleColorHex, 0x38bdf8);

    const bossHealthy = evaluateTargetLockState(4500, 10000, true);
    assert.equal(bossHealthy.isExecuteThreshold, false);
    assert.equal(bossHealthy.reticleColorHex, 0xfbbf24);
    assert.ok(bossHealthy.ringScale > normal.ringScale);

    const bossExecute = evaluateTargetLockState(2000, 10000, true);
    assert.equal(bossExecute.isExecuteThreshold, true);
    assert.equal(bossExecute.reticleColorHex, 0xf43f5e);
    assert.ok(bossExecute.pulseSpeed > bossHealthy.pulseSpeed);
  });

  it('opens, orbits, detects hits, and expires Boss Weak-Point windows cleanly', () => {
    let wp = createBossWeakPointWindow(1.25, 0);
    assert.equal(wp.active, true);
    assert.equal(wp.remainingSec, 3.6);
    assert.ok(wp.orbitRadius >= 1.8);

    const p0 = getBossWeakPointWorldPos(2, -3, wp);
    assert.ok(checkBossWeakPointHit(p0.x, p0.z, p0.x + 0.4, p0.z - 0.3));
    assert.equal(checkBossWeakPointHit(p0.x, p0.z, p0.x + 3.0, p0.z), false);

    // Step forward by 1s (10 × 0.1s)
    for (let i = 0; i < 10; i++) {
      wp = stepBossWeakPointWindow(wp, 0.1);
    }
    assert.equal(wp.active, true);
    assert.ok(wp.orbitAngle > 1.0);
    assert.ok(wp.remainingSec < 2.7 && wp.remainingSec > 2.5);

    // Expire the remaining window
    for (let i = 0; i < 40; i++) {
      wp = stepBossWeakPointWindow(wp, 0.1);
    }
    assert.equal(wp.active, false);
    assert.equal(wp.remainingSec, 0);
  });

  it('computes deterministic surface-embedded stuck arrow local offsets', () => {
    const a0 = computeStuckArrowLocalOffset(0.5, 1.1, 2.2, 0);
    const a1 = computeStuckArrowLocalOffset(0.5, 1.1, 2.2, 1);
    assert.ok(a0.y >= 0.55);
    assert.notEqual(a0.x, a1.x);
    assert.equal(a0.yaw, 0.5);
  });
});

describe('AAA Wave 7 — Pillar 2: Interactive 3D Arena Resonance Traps', () => {
  it('places spaced traps clear of spawn, portal, and obstacles', () => {
    const obstacles = [
      { x: -4.2, z: -1.1, r: 1.4 },
      { x: 4.5, z: 2.0, r: 1.2 },
    ];
    const bossTraps = computeResonanceTrapPlacements(7, 10, 12, obstacles, true);
    assert.equal(bossTraps.length, 2);

    for (const trap of bossTraps) {
      assert.ok(RESONANCE_TRAP_CONFIGS[trap.kind]);
      assert.ok(trap.z <= 12 - 4.2 && trap.z >= -12 + 3.6);
      for (const obs of obstacles) {
        assert.ok(Math.hypot(trap.x - obs.x, trap.z - obs.z) >= obs.r + 2.0);
      }
    }
    assert.ok(
      Math.hypot(bossTraps[0].x - bossTraps[1].x, bossTraps[0].z - bossTraps[1].z) >= 4.5
    );
  });

  it('defines distinct cooldowns and effects for all 3 trap kinds', () => {
    assert.ok(RESONANCE_TRAP_CONFIGS.storm_pylon.aoeRadius > 4);
    assert.ok(RESONANCE_TRAP_CONFIGS.ember_crucible.damageMultiplier > 1.8);
    assert.ok(RESONANCE_TRAP_CONFIGS.wind_beacon.heroSpeedBoostSec >= 3.0);
  });
});

describe('AAA Wave 7 — Pillar 3: Chapter 3D Weather & Footstep Ripples', () => {
  it('maps chapters to 4 distinct weather modes and scales count by graphics quality', () => {
    assert.equal(getChapterWeatherProfile(1, 'medium').mode, 'embers');
    assert.equal(getChapterWeatherProfile(5, 'medium').mode, 'snow');
    assert.equal(getChapterWeatherProfile(8, 'medium').mode, 'storm_sparks');
    assert.equal(getChapterWeatherProfile(6, 'medium').mode, 'starlight');

    const low = getChapterWeatherProfile(1, 'low').particleCount;
    const med = getChapterWeatherProfile(1, 'medium').particleCount;
    const high = getChapterWeatherProfile(1, 'high').particleCount;
    assert.ok(low < med && med < high);
  });

  it('emits footstep ripples at stride cadence and adjusts for mounted stride', () => {
    const step1 = stepFootstepRippleDistance(0, 0.8, false);
    assert.equal(step1.shouldEmit, false);
    const step2 = stepFootstepRippleDistance(step1.nextAccum, 0.7, false);
    assert.equal(step2.shouldEmit, true);
    assert.ok(step2.nextAccum < 0.25);

    const mountedStep = stepFootstepRippleDistance(0, 1.5, true);
    assert.equal(mountedStep.shouldEmit, false);
    const mountedEmit = stepFootstepRippleDistance(mountedStep.nextAccum, 0.5, true);
    assert.equal(mountedEmit.shouldEmit, true);
  });
});

describe('AAA Wave 7 — Pillar 4: Living 3D Sanctuary & 360° Inspect Turntable', () => {
  it('damps smoothly into 360° Inspect Mode, boosts rim light, and auto-rotates when enabled', () => {
    let rig = { blend: 0, autoRotateYaw: 0, rimLightIntensity: 0.85 };
    for (let i = 0; i < 40; i++) {
      rig = stepLobbyInspectRig(rig, true, true, 0.033);
    }
    assert.ok(rig.blend > 0.98);
    assert.ok(rig.autoRotateYaw > 0.5);
    assert.ok(rig.rimLightIntensity > 2.1);

    const pausedYaw = rig.autoRotateYaw;
    const pausedRig = stepLobbyInspectRig(rig, true, false, 0.033);
    assert.equal(pausedRig.autoRotateYaw, pausedYaw);

    for (let i = 0; i < 45; i++) {
      rig = stepLobbyInspectRig(rig, false, false, 0.033);
    }
    assert.equal(rig.blend, 0);
  });

  it('computes continuous sanctuary nebula and sun breathing wave', () => {
    const w0 = computeSanctuaryAtmosphereWave(0);
    const w1 = computeSanctuaryAtmosphereWave(2.5);
    assert.ok(w1.nebulaYaw > w0.nebulaYaw);
    assert.ok(w1.sunBreathIntensity >= 0.85 && w1.sunBreathIntensity <= 1.15);
    assert.ok(w1.rimColorShift >= 0 && w1.rimColorShift <= 1);
  });
});

describe('AAA Wave 7 — Pillar 5: Post-Run Honor Medals & PNG Card Safety', () => {
  it('awards up to 3 authentic combat medals and builds highlight summary parts', () => {
    const res = evaluateRunCombatMedals({
      isVictory: true,
      kills: 28,
      maxCombo: 48,
      elapsedSeconds: 85,
      highlights: {
        peakCritDamage: 18450,
        weakPointHits: 3,
        trapsTriggered: 4,
        perfectDodgesCount: 5,
        elementalReactionsCount: 7,
        bountiesCompleted: 2,
        damageTakenCount: 0,
      },
    });
    assert.equal(res.medals.length, 3);
    assert.equal(res.medals[0].id, 'untouchable');
    assert.equal(res.medals[1].id, 'weakpoint_hunter');
    assert.equal(res.medals[2].id, 'arena_tactician');
    assert.equal(res.highlightSummaryParts.length, 4);
    assert.ok(res.highlightSummaryParts[0].includes('Chí Mạng Đỉnh'));
  });

  it('provides fallback archer badge on short run and safely returns null in headless Node', () => {
    const shortRun = evaluateRunCombatMedals({
      isVictory: false,
      kills: 4,
      maxCombo: 6,
      elapsedSeconds: 32,
      highlights: { damageTakenCount: 4 },
    });
    assert.equal(shortRun.medals.length, 1);
    assert.equal(shortRun.medals[0].id, 'zodiac_archer');

    const headlessResult = renderAaaMedalCardPngDataUrl({
      isVictory: false,
      chapterName: 'Chương 1',
      stageLabel: 'Ải 2/10',
      heroName: 'Artemis',
      kills: 4,
      maxCombo: 6,
      goldEarned: 120,
      gemsEarned: 5,
      medals: shortRun.medals,
    });
    assert.equal(headlessResult, null);
  });
});

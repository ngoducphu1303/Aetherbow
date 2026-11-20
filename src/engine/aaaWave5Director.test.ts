import assert from 'node:assert/strict';
import {
  ELEMENTAL_REACTION_GUIDE,
  buildPersonalRecordsSummary,
  computeRollingDpsMetrics,
  createRollingDpsTracker,
  recordRollingDpsSample,
  resetRollingDpsTracker,
  resolveBossAudioLayers,
  resolveCombatCameraConfig,
  resolvePhotoLightingMood,
  stepArmorShardPhysics,
} from './aaaWave5Director';
import { SaveData } from '../types/game';

// 1. Combat Camera Presets (Action / Tactical / Wide)
{
  const action = resolveCombatCameraConfig('action');
  const tactical = resolveCombatCameraConfig('tactical');
  const wide = resolveCombatCameraConfig('wide');

  assert.equal(action.preset, 'action');
  assert.equal(tactical.preset, 'tactical');
  assert.equal(wide.preset, 'wide');
  assert.ok(action.camY < tactical.camY && tactical.camY < wide.camY, 'camY should scale action < tactical < wide');
  assert.ok(
    action.camZOffset < tactical.camZOffset && tactical.camZOffset < wide.camZOffset,
    'camZOffset should scale action < tactical < wide'
  );
  assert.ok(action.lookLeadMult > tactical.lookLeadMult && tactical.lookLeadMult > wide.lookLeadMult);
}

// 2. Photo Studio Lighting Moods (Golden Hall / Moonlit / Inferno)
{
  const golden = resolvePhotoLightingMood('golden_hall');
  const moonlit = resolvePhotoLightingMood('moonlit');
  const inferno = resolvePhotoLightingMood('inferno');

  assert.equal(golden.id, 'golden_hall');
  assert.equal(moonlit.id, 'moonlit');
  assert.equal(inferno.id, 'inferno');
  assert.notEqual(golden.keyHex, moonlit.keyHex);
  assert.notEqual(moonlit.rimHex, inferno.rimHex);
  assert.ok(golden.exposure >= 1.0 && moonlit.exposure >= 1.0 && inferno.exposure >= 1.0);
}

// 3. Adaptive Boss Audio Layering (Phase 1 -> 2 -> 3 + Low HP + High Combo)
{
  const p1Low = resolveBossAudioLayers(1, 5, 0.9);
  const p1Combo = resolveBossAudioLayers(1, 28, 0.9);
  const p2 = resolveBossAudioLayers(2, 12, 0.65);
  const p3Clutch = resolveBossAudioLayers(3, 30, 0.25);

  assert.equal(p1Low.choirGain, 0);
  assert.ok(p1Combo.choirGain > 0, 'High combo should bring in subtle choir swell even in Phase 1');
  assert.ok(p2.choirGain > p1Combo.choirGain);
  assert.ok(p3Clutch.choirGain > p2.choirGain);
  assert.ok(p3Clutch.hihatDrive > p2.hihatDrive && p2.hihatDrive > p1Low.hihatDrive);
  assert.ok(p3Clutch.filterPeakHz > p2.filterPeakHz && p2.filterPeakHz > p1Low.filterPeakHz);
}

// 4. Physical 3D Armor-Shatter Shard Kinematics (gravity, floor bounce, lifetime expiry)
{
  const shard = {
    x: 0,
    y: 1.2,
    z: 0,
    vx: 3.0,
    vy: 2.0,
    vz: -1.5,
    rx: 0,
    ry: 0,
    rz: 0,
    vrx: 8,
    vry: -6,
    vrz: 4,
    bounces: 0,
    life: 1.0,
    maxLife: 1.0,
  };

  let alive = true;
  for (let i = 0; i < 40; i++) {
    alive = stepArmorShardPhysics(shard, 0.02);
  }
  assert.equal(alive, true);
  assert.ok(shard.bounces >= 1, 'Shard must bounce off the arena floor');
  assert.ok(shard.y >= 0.09, 'Shard must never clip below arena floor');
  assert.ok(shard.rx !== 0 && shard.ry !== 0, 'Shard must tumble while airborne');

  // Step past remaining lifetime
  let expired = false;
  for (let i = 0; i < 20; i++) {
    if (!stepArmorShardPhysics(shard, 0.02)) {
      expired = true;
      break;
    }
  }
  assert.equal(expired, true, 'Shard must return false when lifetime expires');
}

// 5. Zero-GC Rolling 5s DPS Ring Buffer (wrap-around, window expiry, peak crit, reset)
{
  const tracker = createRollingDpsTracker(8);
  for (let i = 0; i < 10; i++) {
    recordRollingDpsSample(tracker, 10 + i * 0.4, 200 + i * 50, i % 3 === 0);
  }
  const snap = computeRollingDpsMetrics(tracker, 14.0, 5.0);
  assert.equal(snap.recentHits, 8, 'Ring buffer capacity should cap retained samples at 8');
  assert.ok(snap.dps5s > 0, 'Rolling DPS should be positive');
  assert.equal(snap.peakCrit, 650, 'Peak crit should track highest critical hit (i=9 => 650)');

  // After 5s window expires
  const coldSnap = computeRollingDpsMetrics(tracker, 25.0, 5.0);
  assert.equal(coldSnap.recentHits, 0);
  assert.equal(coldSnap.dps5s, 0);
  assert.equal(coldSnap.peakCrit, 650, 'Peak crit remains preserved for the run');

  resetRollingDpsTracker(tracker);
  const resetSnap = computeRollingDpsMetrics(tracker, 1.0, 5.0);
  assert.equal(resetSnap.dps5s, 0);
  assert.equal(resetSnap.peakCrit, 0);
}

// 6. Elemental Reaction Codex Guide & Personal Records Aggregation (strictly from SaveData)
{
  assert.equal(ELEMENTAL_REACTION_GUIDE.length, 4);
  const ids = new Set(ELEMENTAL_REACTION_GUIDE.map((e) => e.id));
  assert.ok(ids.has('melt') && ids.has('superconduct') && ids.has('overload') && ids.has('venom_detonation'));

  const mockSave = {
    highestChapterCleared: 5,
    bestTowerFloor: 18,
    career: {
      totalKills: 1240,
      totalBossesKilled: 14,
      totalRuns: 29,
      maxComboEver: 64,
      totalChestsOpened: 11,
      seenEnemies: [],
      seenSkills: [],
    },
    playtestMetrics: {
      createdAt: 0,
      totalRuns: 29,
      totalPlaySeconds: 3600,
      startedRunAfterFirstDefeat: true,
      stageEntriesByChapter: {},
      stageDefeatsByChapter: {},
      bossAttempts: {
        ch1_leo_king: { attempts: 2, cleared: true, attemptsToFirstClear: 1 },
        ch2_aries_boss: { attempts: 3, cleared: true, attemptsToFirstClear: 2 },
        ch3_taurus_boss: { attempts: 1, cleared: false },
      },
      milestones: {},
      synergyPickCounts: {
        storm_barrage: 3,
        frost_shatter: 1,
        solar_inferno: 0,
      },
    },
  } as unknown as SaveData;

  const summary = buildPersonalRecordsSummary(mockSave);
  assert.equal(summary.highestChapterCleared, 5);
  assert.equal(summary.bestTowerFloor, 18);
  assert.equal(summary.totalKills, 1240);
  assert.equal(summary.totalBossesKilled, 14);
  assert.equal(summary.maxComboEver, 64);
  assert.equal(summary.clearedBossCount, 2);
  assert.equal(summary.discoveredSynergiesCount, 2);
  assert.equal(summary.totalChestsOpened, 11);
}

console.log('aaaWave5Director tests passed (6/6).');

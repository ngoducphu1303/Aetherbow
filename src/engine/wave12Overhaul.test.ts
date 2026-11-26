import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';

import {
  computeDissolveCap,
  createEnemyChoreographyDelta,
  createEnemyChoreographyState,
  DYING_CORPSE_CAP_HIGH,
  DYING_CORPSE_CAP_LITE,
  stepEnemyChoreography,
} from './combatAnimationKinematics';
import {
  countScenePointLights,
  getSignatureDefaultColor,
  HeroAndBossSignatureVfxPool,
  resolveHeroSignatureKind,
} from './heroAndBossSignatureVfx';
import {
  computeFrameBenchmarkReport,
  computeTrainingPresetComparison,
  FrameBenchmarkSampler,
} from './frameBenchmarkSampler';
import { SfxPriorityMixer } from '../audio/sfxPriorityMixer';
import { resolveDynamicMusicLayers } from '../audio/zodiacMusicDirector';
import type { TrainingPresetDpsRecord } from '../types/game';

test('W12-1: Enemy/Boss Choreography windup anticipation, stagger kneel/tremor, reducedMotion & Zero-GC', () => {
  const state = createEnemyChoreographyState();
  const out = createEnemyChoreographyDelta();

  // 1) Idle starts neutral
  const idleRef = stepEnemyChoreography(
    state,
    { dt: 0.016, telegraphProgress: 0, isStaggeredOrBroken: false, isBoss: true, reducedMotion: false },
    out
  );
  assert.equal(idleRef, out, 'stepEnemyChoreography must mutate and return out (Zero-GC)');
  assert.equal(out.phase, 'idle');
  assert.equal(out.offsetY, 0);

  // 2) Telegraph windup anticipation (coil back -> lift up)
  for (let i = 0; i < 20; i++) {
    stepEnemyChoreography(
      state,
      { dt: 0.016, telegraphProgress: 0.55, isStaggeredOrBroken: false, isBoss: true, reducedMotion: false },
      out
    );
  }
  assert.equal(out.phase, 'windup');
  assert.ok(out.rotX < -0.05, `Expected rear-back anticipation pitch < -0.05, got ${out.rotX}`);
  assert.ok(out.offsetY > 0.02, `Expected upward anticipation lift > 0.02, got ${out.offsetY}`);
  assert.ok(out.emissiveBoost > 0.1, 'Expected positive windup emissive boost');

  // 3) Strike lunge near end of telegraph (>= 0.85)
  for (let i = 0; i < 25; i++) {
    stepEnemyChoreography(
      state,
      { dt: 0.016, telegraphProgress: 0.96, isStaggeredOrBroken: false, isBoss: true, reducedMotion: false },
      out
    );
  }
  assert.ok(out.rotX > 0.05, `Expected forward lunge pitch > 0.05 near strike release, got ${out.rotX}`);

  // 4) Guard-Break / Stagger Kneel + Tremor overrides windup
  for (let i = 0; i < 25; i++) {
    stepEnemyChoreography(
      state,
      { dt: 0.016, telegraphProgress: 0.9, isStaggeredOrBroken: true, isBoss: true, reducedMotion: false },
      out
    );
  }
  assert.equal(out.phase, 'stagger_kneel');
  assert.ok(out.offsetY < -0.08, `Expected kneel downward offsetY < -0.08, got ${out.offsetY}`);
  assert.ok(out.rotX > 0.1, `Expected forward stagger kneel pitch > 0.1, got ${out.rotX}`);

  // 5) Reduced motion dampens amplitude to 0.25x
  const normalOffsetY = Math.abs(out.offsetY);
  const reducedState = createEnemyChoreographyState();
  const reducedOut = createEnemyChoreographyDelta();
  for (let i = 0; i < 25; i++) {
    stepEnemyChoreography(
      reducedState,
      { dt: 0.016, telegraphProgress: 0.9, isStaggeredOrBroken: true, isBoss: true, reducedMotion: true },
      reducedOut
    );
  }
  assert.ok(
    Math.abs(reducedOut.offsetY) <= normalOffsetY * 0.3,
    `Reduced motion offsetY (${Math.abs(reducedOut.offsetY)}) should be <= 30% of normal (${normalOffsetY})`
  );

  // 6) Dissolve cap respects Lite budget
  assert.equal(computeDissolveCap(false), DYING_CORPSE_CAP_HIGH);
  assert.equal(computeDissolveCap(true), DYING_CORPSE_CAP_LITE);
  assert.ok(DYING_CORPSE_CAP_LITE < DYING_CORPSE_CAP_HIGH);
});

test('W12-2: Hero & Boss Signature VFX Pool uses strictly 0 PointLights, Lite reduction & clean GPU disposal', () => {
  const highScene = new THREE.Scene();
  const highPool = new HeroAndBossSignatureVfxPool(highScene, false);

  const liteScene = new THREE.Scene();
  const litePool = new HeroAndBossSignatureVfxPool(liteScene, true);

  assert.equal(countScenePointLights(highScene), 0, 'High signature VFX pool must add 0 PointLights');
  assert.equal(countScenePointLights(liteScene), 0, 'Lite signature VFX pool must add 0 PointLights');
  assert.ok(litePool.getPoolCapacity() < highPool.getPoolCapacity(), 'Lite pool must cap slot capacity');

  // Verify mapping for all 4 playable heroes
  assert.equal(resolveHeroSignatureKind('aurelia', 'ember_nova'), 'aurelia');
  assert.equal(resolveHeroSignatureKind('bellona', 'thunder_arc'), 'bellona');
  assert.equal(resolveHeroSignatureKind('sylvia', 'jade_bastion'), 'sylvia');
  assert.equal(resolveHeroSignatureKind('celeste', 'moon_fan_mark'), 'celeste');

  // Colorblind palette returns distinct non-zero hex colors
  assert.notEqual(
    getSignatureDefaultColor('bellona', true),
    getSignatureDefaultColor('bellona', false)
  );

  // Spawn all 4 hero signature VFX + Boss Phase II/III aura ring
  const baseOpts = {
    liteActive: false,
    reducedMotion: false,
    reduceScreenFlash: false,
    colorblindTelegraphs: false,
  };
  highPool.spawnHeroSignature({ heroId: 'aurelia', effectKind: 'ember_nova', x: 0, z: 0, options: baseOpts });
  highPool.spawnHeroSignature({ heroId: 'bellona', effectKind: 'thunder_arc', x: 1, z: 0, targetX: 4, targetZ: -2, options: baseOpts });
  highPool.spawnHeroSignature({ heroId: 'sylvia', effectKind: 'jade_bastion', x: -1, z: 1, options: baseOpts });
  highPool.spawnHeroSignature({ heroId: 'celeste', effectKind: 'moon_fan_mark', x: 0, z: -2, options: baseOpts });
  assert.equal(highPool.getActiveBurstCount(), 4);

  // Boss Phase I keeps aura hidden; Phase II & III activate it
  highPool.syncBossPhaseAura({ active: true, x: 0, z: -4, phase: 1, baseRadius: 2.5, accentHex: 0xf59e0b, options: baseOpts });
  assert.equal(highPool.isBossAuraActive(), false);

  highPool.syncBossPhaseAura({ active: true, x: 0, z: -4, phase: 2, baseRadius: 2.5, accentHex: 0xf59e0b, options: baseOpts });
  assert.equal(highPool.isBossAuraActive(), true);
  assert.equal(highPool.getBossAuraPhase(), 2);

  highPool.syncBossPhaseAura({ active: true, x: 0, z: -4, phase: 3, baseRadius: 2.5, accentHex: 0xef4444, options: baseOpts });
  assert.equal(highPool.getBossAuraPhase(), 3);

  // Step through full burst lifetime -> bursts recycle cleanly to 0 active
  for (let i = 0; i < 20; i++) {
    highPool.step(0.05, i * 0.05);
  }
  assert.equal(highPool.getActiveBurstCount(), 0);
  assert.equal(countScenePointLights(highScene), 0, 'Active VFX + Boss Aura must maintain strictly 0 PointLights');

  // Dispose removes root cleanly
  highPool.dispose();
  litePool.dispose();
  assert.equal(highScene.children.length, 0);
  assert.equal(liteScene.children.length, 0);
});

test('W12-3: Wave 12 SFX Priority Categories & Dynamic Phase-Layered Music Director', () => {
  const mixer = new SfxPriorityMixer();
  mixer.setLowEndMode(true);

  const dTele = mixer.requestPlay('boss_telegraph_ping', 1000, 6);
  const dMythic = mixer.requestPlay('loot_rarity_mythic', 1020, 0);
  const dLegend = mixer.requestPlay('loot_rarity_legendary', 1040, 0);
  const dEpic = mixer.requestPlay('loot_rarity_epic', 1060, 0);
  const dExec = mixer.requestPlay('execution_finisher_drop', 1080, 0);

  assert.equal(dTele.allowed, true);
  assert.equal(dMythic.allowed, true);
  assert.equal(dLegend.allowed, true);
  assert.equal(dEpic.allowed, true);
  assert.equal(dExec.allowed, true);
  assert.ok(dMythic.priority > dLegend.priority && dLegend.priority > dEpic.priority);

  // Dedupe guards rapid duplicate spam
  const dDup = mixer.requestPlay('boss_telegraph_ping', 1010, 6);
  assert.equal(dDup.allowed, false);
  assert.equal(dDup.reason, 'deduped');

  // Dynamic phase-layered music escalates Boss Phase I -> II -> III and caps oscillators in lowEndMode
  const bossP1 = resolveDynamicMusicLayers({ mode: 'boss', bossPhase: 1, hpRatio: 1, combo: 5, lowEndMode: false });
  const bossP2 = resolveDynamicMusicLayers({ mode: 'boss', bossPhase: 2, hpRatio: 1, combo: 16, lowEndMode: false });
  const bossP3 = resolveDynamicMusicLayers({ mode: 'boss', bossPhase: 3, hpRatio: 0.2, combo: 32, lowEndMode: false });
  const bossP3LowEnd = resolveDynamicMusicLayers({ mode: 'boss', bossPhase: 3, hpRatio: 0.2, combo: 32, lowEndMode: true });

  assert.ok(bossP1.percussionDrive < bossP2.percussionDrive && bossP2.percussionDrive < bossP3.percussionDrive);
  assert.ok(bossP3.filterCutoffHz > bossP2.filterCutoffHz);
  assert.equal(bossP3.enableLowHpHeartbeat, true);
  assert.ok(bossP3LowEnd.maxExtraOscillators <= 1, 'Low-end mode must cap extra music oscillators to <= 1');
  assert.ok(bossP3LowEnd.percussionDrive < bossP3.percussionDrive);
});

test('W12-4: Sân Tập 3D Loadout Preset DPS Comparison computes exact % ΔDPS and leader', () => {
  const records: TrainingPresetDpsRecord[] = [
    {
      slotId: 'preset_1',
      presetName: 'Bộ Đi Ải',
      dps5s: 4000,
      peakDps: 5200,
      critRatePct: 35,
      totalDamage: 24000,
      hits: 30,
      mvpSkillLabel: 'Đòn Cơ Bản',
      recordedAt: 1000,
    },
    {
      slotId: 'preset_2',
      presetName: 'Bộ Săn Boss',
      dps5s: 5000,
      peakDps: 6800,
      critRatePct: 52,
      totalDamage: 30000,
      hits: 32,
      mvpSkillLabel: 'Chiêu Chủ Động (E)',
      recordedAt: 2000,
    },
    {
      slotId: 'preset_3',
      presetName: 'Bộ Thủ Vững',
      dps5s: 3600,
      peakDps: 4400,
      critRatePct: 28,
      totalDamage: 21600,
      hits: 29,
      mvpSkillLabel: 'Hiệu Ứng Bộ Trang Bị',
      recordedAt: 3000,
    },
  ];

  const rows = computeTrainingPresetComparison(records, 'preset_1');
  assert.equal(rows.length, 3);
  assert.equal(rows[0].isBaseline, true);
  assert.equal(rows[0].deltaDpsPct, 0);
  assert.equal(rows[1].deltaDpsPct, 25);
  assert.equal(rows[1].isLeader, true);
  assert.equal(rows[2].deltaDpsPct, -10);
  assert.equal(rows[2].isLeader, false);
});

test('W12-5: Zero-GC 60s E5430 FrameBenchmarkSampler computes exact 1% Low FPS, P95, P99 & JSON report', () => {
  const sampler = new FrameBenchmarkSampler(4000);
  assert.equal(sampler.getCapacity(), 4000);
  sampler.start(15);
  assert.equal(sampler.isRunning(), true);

  // Push 99 smooth frames at 16.67ms (~60 FPS) + 1 spike frame at 40ms (~25 FPS)
  for (let i = 0; i < 99; i++) {
    sampler.recordFrame(16.67, 48, 22000);
  }
  sampler.recordFrame(40.0, 62, 28000);

  const live = sampler.getLiveSnapshot(0, true, 0);
  assert.equal(live.running, true);
  assert.equal(live.sampleCount, 100);
  assert.equal(live.activePointLights, 0);

  const report = sampler.finalizeReport({
    activePointLights: 0,
    liteActive: true,
    watchdogStage: 0,
    gpuRenderer: 'Intel(R) HD Graphics 4000',
    chapterId: 1,
    heroId: 'aurelia',
  });

  assert.equal(sampler.isRunning(), false);
  assert.equal(report.sampleCount, 100);
  assert.equal(report.fps1Low, 25); // 1000 / 40.0 = 25.0 FPS 1% Low
  assert.ok(report.avgFps >= 58 && report.avgFps <= 60, `Expected avgFps ~59.2, got ${report.avgFps}`);
  assert.equal(report.maxFrameMs, 40);
  assert.equal(report.jankFramesOver33ms, 1);
  assert.equal(report.peakDrawCalls, 62);
  assert.equal(report.activePointLights, 0);
  assert.equal(report.verdict, 'DAT_E5430_30FPS_ON_DINH');

  // Verify high-performance 60 FPS E5430 verdict
  const smoothSamples = new Float32Array(200).fill(16.5);
  const smoothReport = computeFrameBenchmarkReport(smoothSamples, 200, {
    durationRequestedSec: 60,
    elapsedSec: 60,
    avgDrawCalls: 42,
    peakDrawCalls: 54,
    avgTriangles: 19000,
    peakTriangles: 24000,
    activePointLights: 0,
    liteActive: true,
    watchdogStage: 0,
    gpuRenderer: 'Intel(R) HD Graphics 4000',
    chapterId: 1,
    heroId: 'aurelia',
  });
  assert.equal(smoothReport.verdict, 'DAT_E5430_60FPS');
  assert.ok(JSON.stringify(smoothReport).includes('wave12.e5430.v1'));
});

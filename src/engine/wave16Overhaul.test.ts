import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as THREE from 'three';
import {
  AUDIO_CAPTION_DEDUPE_MS,
  AUDIO_CAPTION_MAX_ACTIVE,
  AUDIO_CAPTION_TTL_MS,
  COMBAT_AUDIO_CAPTION_CATALOG,
  CombatAudioCaptionQueue,
  ZODIAC_BOSS_ENTRANCE_PROFILES,
  buildCelestialPortalArch,
  createBossEntrancePoseScratch,
  disposeCelestialPortalArch,
  resolveBossEntranceProfile,
  stepBossEntrancePose,
  stepCelestialPortalArch,
} from './wave16BossAndPortal';
import {
  HeroAndBossSignatureVfxPool,
  countScenePointLights,
} from './heroAndBossSignatureVfx';
import {
  auditChapterAssetReadiness,
  buildPlayerLiveOpsSchedule,
  buildPreBattleTacticalBriefing,
  formatLiveOpsCountdown,
} from '../data/wave16TacticalAndLiveOps';
import { computePlayerStats, createInitialSaveData } from '../data/gearData';
import { DEFAULT_LIVEOPS_CONFIG, type LiveOpsConfig } from '../data/liveOpsConfig';
import { normalizeSettings } from '../data/liveOpsData';
import type { GlbManifestDocument } from './glbPipelineValidator';

test('W16-1: 12-Zodiac Boss Entrance profiles + Zero-GC pose curve & reducedMotion damping', () => {
  const keys = Object.keys(ZODIAC_BOSS_ENTRANCE_PROFILES).map(Number).sort((a, b) => a - b);
  assert.deepEqual(keys, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);

  const seenNames = new Set<string>();
  const seenCallouts = new Set<string>();
  for (let ch = 1; ch <= 12; ch++) {
    const profile = resolveBossEntranceProfile(ch);
    assert.equal(profile.chapterId, ch);
    assert.ok(profile.bossName.length > 4);
    assert.ok(profile.epithet.length > 4);
    assert.ok(profile.entranceCallout.length > 10);
    assert.ok(profile.counterplayHint.length > 10);
    assert.ok(profile.dropHeight >= 3.0);
    assert.equal(profile.entranceDurationSec, 0.9);
    seenNames.add(profile.bossName);
    seenCallouts.add(profile.entranceCallout);
  }
  assert.equal(seenNames.size, 12, 'All 12 Zodiac bosses must have distinct names');
  assert.equal(seenCallouts.size, 12, 'All 12 Zodiac bosses must have distinct entrance callouts');

  // Clamping out-of-range chapter IDs
  assert.equal(resolveBossEntranceProfile(0).chapterId, 1);
  assert.equal(resolveBossEntranceProfile(99).chapterId, 12);

  // Zero-GC scratch reuse across descent, impact squash, settle, and completion
  const profile1 = resolveBossEntranceProfile(1);
  const scratch = createBossEntrancePoseScratch();
  const startPose = stepBossEntrancePose(0.05, profile1, false, scratch);
  assert.strictEqual(startPose, scratch, 'Must mutate and return the same scratch object');
  assert.equal(startPose.active, true);
  assert.ok(startPose.yOffset > 2.5, 'Boss should descend from elevated dropHeight');

  // Impact squash window (~0.56s / 0.9s = 0.62)
  const impactPose = stepBossEntrancePose(0.56, profile1, false, scratch);
  assert.equal(impactPose.active, true);
  assert.equal(impactPose.yOffset, 0);
  assert.ok(impactPose.scaleY < 1.0 && impactPose.scaleXZ > 1.0, 'Impact should squash Y and expand XZ');
  assert.ok(impactPose.regaliaFlare > 0.5, 'Regalia flare should peak on landing');

  // Reduced motion must damp vertical drop and squash displacement significantly
  const normalStartY = stepBossEntrancePose(0.05, profile1, false, createBossEntrancePoseScratch()).yOffset;
  const reducedStartY = stepBossEntrancePose(0.05, profile1, true, createBossEntrancePoseScratch()).yOffset;
  assert.ok(reducedStartY < normalStartY * 0.4, 'reducedMotion must dampen drop height');

  // Completed entrance resets cleanly to neutral combat pose
  const donePose = stepBossEntrancePose(1.0, profile1, false, scratch);
  assert.equal(donePose.active, false);
  assert.equal(donePose.yOffset, 0);
  assert.equal(donePose.scaleY, 1);
  assert.equal(donePose.scaleXZ, 1);
  assert.equal(donePose.cameraFocusWeight, 0);
});

test('W16-2: Pooled 0-PointLight Tactical Impact VFX (Riposte, Wall-Slam, Phase III Eruption)', () => {
  const highScene = new THREE.Scene();
  const highPool = new HeroAndBossSignatureVfxPool(highScene, false);
  assert.equal(countScenePointLights(highScene), 0, 'High pool must create 0 PointLights');

  highPool.spawnTacticalImpactVfx({
    kind: 'riposte_lance',
    x: 0,
    z: 2,
    targetX: 0,
    targetZ: -4,
    options: {
      liteActive: false,
      reducedMotion: false,
      reduceScreenFlash: false,
      colorblindTelegraphs: false,
    },
  });
  highPool.spawnTacticalImpactVfx({
    kind: 'wall_slam_burst',
    x: -7,
    z: 1,
    options: {
      liteActive: false,
      reducedMotion: false,
      reduceScreenFlash: true,
      colorblindTelegraphs: false,
    },
  });
  highPool.spawnTacticalImpactVfx({
    kind: 'boss_phase3_eruption',
    x: 0,
    z: -5,
    radius: 7.4,
    options: {
      liteActive: false,
      reducedMotion: false,
      reduceScreenFlash: false,
      colorblindTelegraphs: true,
    },
  });

  assert.equal(highPool.getActiveBurstCount(), 3);
  assert.equal(countScenePointLights(highScene), 0, 'Spawning tactical bursts must add 0 PointLights');

  // Stepping past max duration releases all slots cleanly
  highPool.step(0.05, 0.05);
  assert.equal(highPool.getActiveBurstCount(), 3);
  for (let i = 0; i < 12; i++) {
    highPool.step(0.1, 0.1 + i * 0.1);
  }
  assert.equal(highPool.getActiveBurstCount(), 0);
  highPool.dispose();

  // Lite mode enforces MAX_SLOTS_LITE (3) cap even under heavy burst spam
  const liteScene = new THREE.Scene();
  const litePool = new HeroAndBossSignatureVfxPool(liteScene, true);
  assert.equal(litePool.getPoolCapacity(), 3);
  for (let i = 0; i < 6; i++) {
    litePool.spawnTacticalImpactVfx({
      kind: i % 2 === 0 ? 'wall_slam_burst' : 'riposte_lance',
      x: i,
      z: 0,
      options: {
        liteActive: true,
        reducedMotion: true,
        reduceScreenFlash: true,
        colorblindTelegraphs: false,
      },
    });
  }
  assert.ok(litePool.getActiveBurstCount() <= 3, 'Lite mode must cap active slots to <= 3');
  assert.equal(countScenePointLights(liteScene), 0);
  litePool.dispose();
});

test('W16-3: 3D Celestial Portal Waypoint Arch (Ch.1-12, 0 PointLight) & Unified Asset Readiness Auditor', () => {
  const highArch = buildCelestialPortalArch({
    chapterId: 1,
    accentHex: 0xf5b83d,
    liteActive: false,
    arenaHalfD: 11,
  });
  const liteArch = buildCelestialPortalArch({
    chapterId: 1,
    accentHex: 0xf5b83d,
    liteActive: true,
    arenaHalfD: 11,
  });

  assert.ok(highArch.partCount >= 8, `Expected >= 8 composite parts, got ${highArch.partCount}`);
  assert.equal(highArch.pointLightCount, 0, 'Portal Arch must contain 0 PointLights');
  assert.equal(countScenePointLights(highArch.group), 0);
  assert.ok(
    Math.abs(highArch.stoneRoughness - highArch.gildedRoughness) >= 0.25,
    'Stone vs gilded PBR roughness delta must be >= 0.25'
  );

  // Verify Lite geometry vertex reduction compared to High
  const countVertices = (root: THREE.Object3D): number => {
    let total = 0;
    root.traverse((obj) => {
      const mesh = obj as THREE.Mesh;
      if (mesh.isMesh && mesh.geometry?.attributes?.position) {
        total += mesh.geometry.attributes.position.count;
      }
    });
    return total;
  };
  assert.ok(
    countVertices(liteArch.group) < countVertices(highArch.group),
    'Lite portal arch must reduce vertex count for Dell E5430'
  );

  // Verify locked -> unlocked visual state transition & clean disposal
  stepCelestialPortalArch(highArch, 0.1, 1.0, false, false);
  const lockedVeilOp = highArch.portalVeilMat.opacity;
  for (let i = 0; i < 8; i++) {
    stepCelestialPortalArch(highArch, 0.1, 2.0 + i * 0.1, true, false);
  }
  assert.ok(
    highArch.portalVeilMat.opacity > lockedVeilOp,
    'Unlocked portal veil opacity must increase noticeably'
  );
  assert.ok(highArch.beaconRibbons.every((r) => r.visible), 'Unlocked portal must reveal beacon ribbons');

  disposeCelestialPortalArch(highArch);
  disposeCelestialPortalArch(liteArch);

  // Unified Ch.1-12 Asset Pipeline Readiness Audit against real scripts/glb-manifest.json
  const manifestPath = path.resolve(process.cwd(), 'scripts/glb-manifest.json');
  const rawManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as GlbManifestDocument;
  const audit = auditChapterAssetReadiness(rawManifest);

  assert.equal(audit.e5430Safe, true, 'Real glb-manifest.json must pass E5430 Lite safety budget');
  assert.equal(audit.totalChapters, 12);
  assert.equal(audit.readyChaptersCount, 12, 'All 12 Zodiac chapters must report ready');
  assert.equal(audit.allTwelveChaptersReady, true);
  assert.equal(audit.totalProceduralPointLights, 0);
  assert.equal(audit.chapters.filter((c) => c.tier === 'glb_high_lite').length, 4);
  assert.equal(audit.chapters.filter((c) => c.tier === 'procedural_3d_zodiac').length, 8);
});

test('W16-4: Pre-Battle Tactical Briefing preserves Fresh 702 LC & Ch.1 FTUE protection', () => {
  const freshSave = createInitialSaveData();
  const lcBefore = computePlayerStats(freshSave).powerRating;
  assert.equal(lcBefore, 702, 'Fresh account baseline must remain strictly 702 LC');

  const ch1Briefing = buildPreBattleTacticalBriefing(freshSave, 1);
  const lcAfter = computePlayerStats(freshSave).powerRating;
  assert.equal(lcAfter, 702, 'Pre-battle briefing must never mutate save or alter 702 LC');

  assert.equal(ch1Briefing.chapterId, 1);
  assert.equal(ch1Briefing.playerPower, 702);
  assert.equal(ch1Briefing.readinessTier, 'underpowered');
  assert.equal(ch1Briefing.weakestBottleneck.target, 'gear');
  assert.equal(ch1Briefing.crossroadsPreview.enabled, false, 'Ch.1 must preserve FTUE protection');
  assert.ok(ch1Briefing.bossPhase2Counterplay.length > 10);
  assert.ok(ch1Briefing.arenaMechanismName.length > 4);

  // Ch.4 with strong stats should report ready + Crossroads enabled
  const strongStats = { ...computePlayerStats(freshSave), powerRating: 35000 };
  const ch4Briefing = buildPreBattleTacticalBriefing(freshSave, 4, strongStats);
  assert.equal(ch4Briefing.readinessTier, 'ready');
  assert.equal(ch4Briefing.crossroadsPreview.enabled, true, 'Ch.2-12 must preview Tactical Crossroads');
});

test('W16-5: Combat Audio Captions Queue + audioCaptions Setting + Player LiveOps Schedule States', () => {
  // 1. Settings normalization backward compatibility
  const defaultNorm = normalizeSettings(undefined);
  assert.equal(defaultNorm.audioCaptions, false);
  const enabledNorm = normalizeSettings({ audioCaptions: true });
  assert.equal(enabledNorm.audioCaptions, true);

  // 2. CombatAudioCaptionQueue dedupe, max cap (2), and expiry TTL
  assert.equal(Object.keys(COMBAT_AUDIO_CAPTION_CATALOG).length, 6);
  const queue = new CombatAudioCaptionQueue();
  const t0 = 1_700_000_000_000;

  const c1 = queue.push('boss_telegraph', t0);
  assert.ok(c1 && c1.glyph === '◆');
  // Duplicate within 350ms cooldown must be dropped
  const dup = queue.push('boss_telegraph', t0 + AUDIO_CAPTION_DEDUPE_MS - 50);
  assert.equal(dup, null, 'Duplicate cue inside 350ms window must be deduped');

  // Different kinds push up to max 2 active items (FIFO eviction)
  queue.push('riposte_ready', t0 + 100);
  queue.push('wall_slam', t0 + 200);
  const active = queue.getActive(t0 + 250);
  assert.equal(active.length, AUDIO_CAPTION_MAX_ACTIVE);
  assert.equal(active[0].kind, 'riposte_ready');
  assert.equal(active[1].kind, 'wall_slam');

  // After TTL expires, active list empties cleanly
  assert.equal(queue.getActive(t0 + 200 + AUDIO_CAPTION_TTL_MS + 10).length, 0);

  // 3. Player LiveOps Schedule across all 4 states
  const now = Date.UTC(2026, 4, 15, 12, 0, 0);
  const alwaysOn = buildPlayerLiveOpsSchedule(DEFAULT_LIVEOPS_CONFIG, now);
  assert.equal(alwaysOn.status, 'always_on');
  assert.equal(alwaysOn.hasActiveBoosts, false);
  assert.ok(alwaysOn.upcomingEvents.length >= 3);
  assert.ok(alwaysOn.weeklyResetRemainingMs > 0);

  const activeCfg: LiveOpsConfig = {
    ...DEFAULT_LIVEOPS_CONFIG,
    goldRewardMult: 1.35,
    weekendBlitzEnabled: true,
    doubleDropEventActive: true,
    scheduledStartMs: now - 3600_000,
    scheduledEndMs: now + 7200_000,
    announcementBanner: 'Lễ Hội Tinh Giới Đang Mở!',
  };
  const activeView = buildPlayerLiveOpsSchedule(activeCfg, now);
  assert.equal(activeView.status, 'active');
  assert.equal(activeView.hasActiveBoosts, true);
  assert.ok(activeView.activeBonuses.some((b) => b.key === 'gold'));
  assert.equal(formatLiveOpsCountdown(7200_000), '02:00:00');
  assert.equal(formatLiveOpsCountdown(90_000_000), '1n 01g 00p');

  const upcomingCfg: LiveOpsConfig = {
    ...activeCfg,
    scheduledStartMs: now + 3600_000,
    scheduledEndMs: now + 10_800_000,
  };
  const upcomingView = buildPlayerLiveOpsSchedule(upcomingCfg, now);
  assert.equal(upcomingView.status, 'upcoming');
  assert.equal(upcomingView.hasActiveBoosts, false, 'Upcoming event must not grant boosts early');

  const expiredCfg: LiveOpsConfig = {
    ...activeCfg,
    scheduledStartMs: now - 10_800_000,
    scheduledEndMs: now - 3600_000,
  };
  const expiredView = buildPlayerLiveOpsSchedule(expiredCfg, now);
  assert.equal(expiredView.status, 'expired');
  assert.equal(expiredView.hasActiveBoosts, false, 'Expired event must revert to 1.0x');
});

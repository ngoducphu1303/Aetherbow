import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampParticleBurstCount,
  resolveDynamicPointLightPolicy,
  resolveDynamicVfxBudget,
  resolveZodiacChapterLighting,
  ZODIAC_CHAPTER_LIGHTING,
} from '../src/engine/zodiacLightingVfxDirector.ts';

test('All 12 Zodiac chapters resolve distinct lighting & readable faction VFX profiles', () => {
  assert.equal(ZODIAC_CHAPTER_LIGHTING.length, 12);
  const seenBackdrops = new Set();
  for (let ch = 1; ch <= 12; ch++) {
    const profile = resolveZodiacChapterLighting(ch);
    assert.equal(profile.chapterId, ch);
    assert.ok(profile.keyIntensity >= 1.4 && profile.keyIntensity <= 1.9);
    assert.ok(profile.hemiIntensity >= 0.65 && profile.hemiIntensity <= 0.9);
    assert.notEqual(profile.playerVfxHex, profile.enemyVfxHex);
    assert.notEqual(profile.playerVfxHex, profile.bossVfxHex);
    seenBackdrops.add(profile.backdropHex);
  }
  assert.ok(seenBackdrops.size >= 10, 'Chapters should have distinct backdrop/atmosphere identities');
});

test('Dell Latitude E5430 Lite / SoftwareGL / Watchdog >= 2 strictly enforce 0 dynamic PointLights', () => {
  const e5430 = resolveDynamicPointLightPolicy({
    lowEndGpu: true,
    isSoftwareGl: false,
    liteActive: true,
    graphicsQuality: 'medium',
    watchdogStage: 2,
    reducedMotion: false,
    reduceScreenFlash: false,
  });
  assert.equal(e5430.enableHeroLight, false);
  assert.equal(e5430.maxImpactPointLights, 0);
  assert.equal(e5430.flashScale, 0);
  assert.equal(e5430.zeroPointLightEnforced, true);

  const highDesktop = resolveDynamicPointLightPolicy({
    lowEndGpu: false,
    isSoftwareGl: false,
    liteActive: false,
    graphicsQuality: 'high',
    watchdogStage: 0,
    reducedMotion: false,
    reduceScreenFlash: false,
  });
  assert.equal(highDesktop.enableHeroLight, true);
  assert.equal(highDesktop.maxImpactPointLights, 2);
  assert.equal(highDesktop.zeroPointLightEnforced, false);
});

test('Dynamic VFX budget throttles particle bursts and shockwaves under crowd load, E5430 Lite, or reducedMotion', () => {
  const desktopCalm = resolveDynamicVfxBudget({
    watchdogStage: 0,
    isLowEndGpu: false,
    reducedMotion: false,
    activeEnemies: 4,
    activeProjectiles: 4,
  });
  const e5430Crowded = resolveDynamicVfxBudget({
    watchdogStage: 3,
    isLowEndGpu: true,
    reducedMotion: false,
    activeEnemies: 16,
    activeProjectiles: 20,
  });
  const reduced = resolveDynamicVfxBudget({
    watchdogStage: 0,
    isLowEndGpu: false,
    reducedMotion: true,
    activeEnemies: 4,
    activeProjectiles: 4,
  });

  assert.equal(e5430Crowded.crowdThrottleActive, true);
  assert.ok(e5430Crowded.maxParticlesPerBurst < desktopCalm.maxParticlesPerBurst);
  assert.ok(e5430Crowded.maxActiveShockwaves < desktopCalm.maxActiveShockwaves);
  assert.ok(clampParticleBurstCount(20, e5430Crowded) <= e5430Crowded.maxParticlesPerBurst);
  assert.ok(clampParticleBurstCount(16, reduced) < clampParticleBurstCount(16, desktopCalm));
});

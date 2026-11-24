import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampParticleBurstCount,
  resolveDynamicVfxBudget,
  resolveFactionVfxPalette,
  resolveZodiacChapterLighting,
  ZODIAC_CHAPTER_LIGHTING_PALETTES,
} from './zodiacLightingVfxDirector';

test('ZodiacLightingVfxDirector: defines 12 distinct chapter palettes with strictly 0 new PointLights', () => {
  assert.equal(ZODIAC_CHAPTER_LIGHTING_PALETTES.length, 12);

  const uniqueKeys = new Set<string>();
  for (let ch = 1; ch <= 12; ch++) {
    const p = resolveZodiacChapterLighting(ch);
    assert.equal(p.chapterId, ch);
    assert.equal(p.newPointLightsAdded, 0, `Chapter ${ch} must add strictly 0 new PointLights`);
    assert.ok(p.zodiacName.length > 0);
    assert.ok(p.keyIntensity > 0 && p.hemiIntensity > 0);
    assert.ok(p.fogFar > p.fogNear);
    uniqueKeys.add(`${p.keyLightHex}_${p.hemiSkyHex}_${p.fogHex}`);
  }
  assert.equal(uniqueKeys.size, 12, 'All 12 chapters should have distinct lighting/fog signatures');

  // Out-of-bounds chapter IDs clamp safely
  assert.equal(resolveZodiacChapterLighting(0).chapterId, 1);
  assert.equal(resolveZodiacChapterLighting(99).chapterId, 12);
});

test('ZodiacLightingVfxDirector: enforces colorblind-safe faction VFX separation (Player vs Enemy vs Boss)', () => {
  for (const cbSafe of [false, true]) {
    const player = resolveFactionVfxPalette('player', cbSafe);
    const enemy = resolveFactionVfxPalette('enemy', cbSafe);
    const boss = resolveFactionVfxPalette('boss', cbSafe);

    assert.notEqual(player.primaryHex, enemy.primaryHex);
    assert.notEqual(player.primaryHex, boss.primaryHex);
    assert.notEqual(enemy.primaryHex, boss.primaryHex);
    assert.equal(player.shapeToken, 'crisp_diamond');
    assert.equal(enemy.shapeToken, 'crimson_ring');
    assert.equal(boss.shapeToken, 'imperial_octagon');
  }
});

test('ZodiacLightingVfxDirector: dynamically scales particle & shockwave caps across Watchdog stages 0->4', () => {
  const highBudget = resolveDynamicVfxBudget({
    watchdogStage: 0,
    isLowEndGpu: false,
    reducedMotion: false,
    activeEnemies: 4,
    activeProjectiles: 4,
  });
  const e5430Budget = resolveDynamicVfxBudget({
    watchdogStage: 0,
    isLowEndGpu: true,
    reducedMotion: false,
    activeEnemies: 16,
    activeProjectiles: 20,
  });
  const criticalBudget = resolveDynamicVfxBudget({
    watchdogStage: 4,
    isLowEndGpu: true,
    reducedMotion: true,
    activeEnemies: 30,
    activeProjectiles: 40,
  });

  assert.equal(highBudget.newPointLightsAdded, 0);
  assert.equal(e5430Budget.newPointLightsAdded, 0);
  assert.equal(e5430Budget.watchdogStage, 2, 'Low-end GPU starts at minimum Watchdog Stage 2');
  assert.ok(e5430Budget.maxParticlesPerBurst < highBudget.maxParticlesPerBurst);
  assert.ok(e5430Budget.maxActiveShockwaves < highBudget.maxActiveShockwaves);
  assert.ok(criticalBudget.maxParticlesPerBurst <= 4);
  assert.ok(criticalBudget.maxActiveShockwaves <= 2);
  assert.equal(criticalBudget.allowSecondaryTrails, false);
  assert.equal(criticalBudget.allowScreenFlash, false);

  assert.ok(clampParticleBurstCount(24, criticalBudget) <= criticalBudget.maxParticlesPerBurst);
  assert.equal(clampParticleBurstCount(0, highBudget), 0);
});

test('ZodiacLightingVfxDirector: enforces true 0-PointLight shader mode on Dell E5430 / Lite / Watchdog >= 2 and supports Anti-Flash', async () => {
  const { resolveDynamicPointLightPolicy } = await import('./zodiacLightingVfxDirector');

  const e5430Lite = resolveDynamicPointLightPolicy({
    lowEndGpu: true,
    isSoftwareGl: false,
    liteActive: true,
    graphicsQuality: 'low',
    watchdogStage: 0,
  });
  assert.equal(e5430Lite.enableHeroLight, false);
  assert.equal(e5430Lite.maxImpactPointLights, 0);
  assert.equal(e5430Lite.totalScenePointLights, 0);
  assert.equal(e5430Lite.flashScale, 0);

  const watchdogStressed = resolveDynamicPointLightPolicy({
    lowEndGpu: false,
    isSoftwareGl: false,
    liteActive: false,
    graphicsQuality: 'high',
    watchdogStage: 2,
  });
  assert.equal(watchdogStressed.totalScenePointLights, 0);

  const highEndNormal = resolveDynamicPointLightPolicy({
    lowEndGpu: false,
    isSoftwareGl: false,
    liteActive: false,
    graphicsQuality: 'high',
    watchdogStage: 0,
    reduceScreenFlash: false,
  });
  assert.equal(highEndNormal.enableHeroLight, true);
  assert.equal(highEndNormal.maxImpactPointLights, 2);
  assert.equal(highEndNormal.totalScenePointLights, 3);
  assert.equal(highEndNormal.flashScale, 1.0);

  const highEndAntiFlash = resolveDynamicPointLightPolicy({
    lowEndGpu: false,
    isSoftwareGl: false,
    liteActive: false,
    graphicsQuality: 'high',
    watchdogStage: 0,
    reduceScreenFlash: true,
  });
  assert.equal(highEndAntiFlash.enableHeroLight, true);
  assert.equal(highEndAntiFlash.maxImpactPointLights, 1);
  assert.equal(highEndAntiFlash.flashScale, 0.25);
});

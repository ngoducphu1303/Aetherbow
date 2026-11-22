import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyGpuCapability,
  computeEffectiveRenderPixelRatio,
  MythicZodiacGradeShader,
  resolvePostFxConfig,
  resolveSystemLiteBudget,
} from './aaaVisualPipeline';
import {
  computeHitstopMicroJitter,
  computeImpactLightPulse,
  computeKnockbackImpulse,
  computePostFxImpulse,
} from './aaaCombatJuice';
import {
  computeAdaptiveCombatIntensity,
  computeSpatialPan,
  computeTimeScaleAudioFilter,
} from '../audio/aaaAudioMix';
import { DEFAULT_SETTINGS, normalizeSettings } from '../data/liveOpsData';

test('AAA GPU Auto-Detection classifies software, integrated, and discrete GPUs into 3 tiers', () => {
  const sw = classifyGpuCapability('Google SwiftShader', 8, 8);
  assert.equal(sw.tier, 'software');
  assert.equal(sw.recommendedQuality, 'low');
  assert.equal(sw.bloomSupported, false);
  assert.equal(sw.shadowMapSize, 0);
  assert.equal(sw.targetCombatFps, 12);

  const emptySw = classifyGpuCapability('', 16, 12);
  assert.equal(emptySw.tier, 'software');
  assert.equal(emptySw.bloomSupported, false);

  const igpu = classifyGpuCapability('ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11)', 16, 8);
  assert.equal(igpu.tier, 'integrated');
  assert.equal(igpu.recommendedQuality, 'medium');
  assert.equal(igpu.bloomSupported, false);
  assert.equal(igpu.shadowMapSize, 1024);
  assert.equal(igpu.targetCombatFps, 30);

  const lowMemDiscrete = classifyGpuCapability('ANGLE (NVIDIA, NVIDIA GeForce RTX 3060)', 4, 8);
  assert.equal(lowMemDiscrete.tier, 'integrated');
  assert.equal(lowMemDiscrete.bloomSupported, false);

  const discrete = classifyGpuCapability('ANGLE (NVIDIA, NVIDIA GeForce RTX 4070 Direct3D11)', 16, 12);
  assert.equal(discrete.tier, 'discrete');
  assert.equal(discrete.recommendedQuality, 'high');
  assert.equal(discrete.bloomSupported, true);
  assert.equal(discrete.shadowMapSize, 2048);
  assert.equal(discrete.targetCombatFps, 60);
});

test('AAA Post-FX Config enforces strict software/low-end bypass and clamps bloom & chromatic impulses', () => {
  const swCfg = resolvePostFxConfig({
    quality: 'high',
    bloomEnabled: true,
    isSoftwareGl: true,
    lowEndGpu: false,
    bloomImpulse: 0.9,
    chromaticImpulse: 0.05,
  });
  assert.equal(swCfg.enabled, false);
  assert.equal(swCfg.bloomStrength, 0);
  assert.equal(swCfg.chromaticAmount, 0);
  assert.equal(swCfg.shadowMapSize, 0);

  const lowQualityCfg = resolvePostFxConfig({
    quality: 'low',
    bloomEnabled: true,
    isSoftwareGl: false,
    lowEndGpu: false,
    bloomImpulse: 0.4,
    chromaticImpulse: 0.008,
  });
  assert.equal(lowQualityCfg.enabled, false);
  assert.equal(lowQualityCfg.bloomStrength, 0);

  const highBloomOff = resolvePostFxConfig({
    quality: 'high',
    bloomEnabled: false,
    isSoftwareGl: false,
    lowEndGpu: false,
    bloomImpulse: 0.5,
  });
  assert.equal(highBloomOff.enabled, false);
  assert.equal(highBloomOff.bloomStrength, 0);
  assert.equal(highBloomOff.shadowMapSize, 2048);

  const highBoss = resolvePostFxConfig({
    quality: 'high',
    bloomEnabled: true,
    isSoftwareGl: false,
    lowEndGpu: false,
    bloomImpulse: 5.0, // oversized -> clamped to 0.65
    chromaticImpulse: 0.5, // oversized -> clamped to 0.012
    isBossStage: true,
    screenShakeEnabled: true,
  });
  assert.equal(highBoss.enabled, true);
  assert.ok(highBoss.bloomStrength > 0.52 && highBoss.bloomStrength <= 1.05);
  assert.equal(highBoss.chromaticAmount, 0.012);
  assert.equal(highBoss.vignetteStrength, 0.38);

  // Respect screenShakeEnabled === false by suppressing chromatic shock
  const noShake = resolvePostFxConfig({
    quality: 'high',
    bloomEnabled: true,
    isSoftwareGl: false,
    lowEndGpu: false,
    chromaticImpulse: 0.01,
    screenShakeEnabled: false,
  });
  assert.equal(noShake.chromaticAmount, 0);

  // Verify shader uniforms exist for EffectComposer ShaderPass (including CAS sharpening)
  assert.ok(MythicZodiacGradeShader.uniforms.uVignette);
  assert.ok(MythicZodiacGradeShader.uniforms.uChromatic);
  assert.ok(MythicZodiacGradeShader.uniforms.uGoldWarmth);
  assert.ok(MythicZodiacGradeShader.uniforms.uSharpness);
  assert.ok(MythicZodiacGradeShader.uniforms.uTexelSize);
  assert.ok(highBoss.sharpness > 0.25 && highBoss.sharpness <= 0.5);
  assert.equal(swCfg.sharpness, 0);
  assert.equal(lowQualityCfg.sharpness, 0);
});

test('Sharpness & DPR pipeline: Lobby renders 100% native even on Dell E5430 Lite while Combat stays GPU-safe, and Standard+Lite3D stays High', () => {
  const e5430 = classifyGpuCapability(
    'ANGLE (Intel, Intel(R) HD Graphics 4000 Direct3D11 vs_5_0 ps_5_0)',
    8,
    4,
    { maxTextureSize: 8192 }
  );
  const liteBudget = resolveSystemLiteBudget(e5430, 'auto', 'auto');

  // Dell E5430 Lobby at 1366x768 & 1920x1080 MUST render at crisp 1.0x native DPR (not blurry 0.63x!)
  const e5430Lobby1366 = computeEffectiveRenderPixelRatio({
    viewportWidth: 1366,
    viewportHeight: 768,
    devicePixelRatio: 1,
    budget: liteBudget,
    graphicsQuality: 'low',
    isSoftwareGl: false,
    isLobby: true,
    adaptiveResolutionGuard: true,
    adaptiveResScale: 0.72,
    governorDprScale: 0.75,
  });
  assert.equal(e5430Lobby1366, 1.0);

  const e5430Lobby1080 = computeEffectiveRenderPixelRatio({
    viewportWidth: 1920,
    viewportHeight: 1080,
    devicePixelRatio: 1,
    budget: liteBudget,
    graphicsQuality: 'low',
    isSoftwareGl: false,
    isLobby: true,
    adaptiveResolutionGuard: true,
    adaptiveResScale: 0.72,
    governorDprScale: 0.75,
  });
  assert.equal(e5430Lobby1080, 1.0);

  // Dell E5430 Combat at 1920x1080 strictly enforces <= 820k pixel fillrate cap so GPU never overheats
  const e5430Combat1080 = computeEffectiveRenderPixelRatio({
    viewportWidth: 1920,
    viewportHeight: 1080,
    devicePixelRatio: 1,
    budget: liteBudget,
    graphicsQuality: 'low',
    isSoftwareGl: false,
    isLobby: false,
    adaptiveResolutionGuard: false,
    adaptiveResScale: 1,
    governorDprScale: 1,
  });
  assert.ok(e5430Combat1080 < 0.7, `Expected Lite combat DPR < 0.7 at 1080p, got ${e5430Combat1080}`);

  // Standard ('off') + Chapter 1 3D Lite ('lite_3d') + stale crash guard must NOT trap the user in blurry ultra_lite
  const guardedE5430 = classifyGpuCapability(
    'ANGLE (Intel, Intel(R) HD Graphics 4000 Direct3D11)',
    8,
    4,
    { maxTextureSize: 8192, crashGuardTripped: true, crashReason: 'stale crash' }
  );
  const standardWithLiteMap = resolveSystemLiteBudget(guardedE5430, 'off', 'lite_3d');
  assert.equal(standardWithLiteMap.liteActive, false);
  assert.equal(standardWithLiteMap.assetVariant, 'high');
  assert.equal(standardWithLiteMap.bloomAllowed, true);
  assert.equal(standardWithLiteMap.environmentReflections, true);

  // HiDPI desktop on High mode renders sharper than 1.0x (not capped to 1.09x by an overly tight pixel budget)
  const highHiDpi = computeEffectiveRenderPixelRatio({
    viewportWidth: 1440,
    viewportHeight: 900,
    devicePixelRatio: 2,
    budget: standardWithLiteMap,
    graphicsQuality: 'high',
    isSoftwareGl: false,
    isLobby: true,
    adaptiveResolutionGuard: true,
    adaptiveResScale: 1,
    governorDprScale: 1,
  });
  assert.ok(highHiDpi >= 1.75, `Expected HiDPI High DPR >= 1.75, got ${highHiDpi}`);

  // Software WebGL stays ultra_lite even if lowEndSafetyMode === 'off'
  const swift = classifyGpuCapability('Google SwiftShader', 8, 4);
  const swiftBudget = resolveSystemLiteBudget(swift, 'off', 'high_3d');
  assert.equal(swiftBudget.deviceTier, 'ultra_lite');
  assert.equal(swiftBudget.liteActive, true);
});

test('AAA Combat Juice: hit-stop micro-jitter, directional knockback recoil, dynamic lights & post-FX impulses', () => {
  assert.deepEqual(computeHitstopMicroJitter(0, 1.0), { x: 0, z: 0 });
  const j = computeHitstopMicroJitter(0.05, 0.123, 1.0);
  assert.ok(Math.abs(j.x) <= 0.12 && Math.abs(j.z) <= 0.09);
  assert.ok(Math.abs(j.x) > 0 || Math.abs(j.z) > 0);

  const mobCrit = computeKnockbackImpulse({
    dirX: 3,
    dirZ: 4,
    isCrit: true,
    isSuperCrit: false,
    isBoss: false,
    isElite: false,
  });
  const eliteCrit = computeKnockbackImpulse({
    dirX: 3,
    dirZ: 4,
    isCrit: true,
    isSuperCrit: false,
    isBoss: false,
    isElite: true,
  });
  const bossSuper = computeKnockbackImpulse({
    dirX: 3,
    dirZ: 4,
    isCrit: true,
    isSuperCrit: true,
    isBoss: true,
    isElite: false,
  });
  assert.ok(Math.hypot(mobCrit.impulseX, mobCrit.impulseZ) > Math.hypot(eliteCrit.impulseX, eliteCrit.impulseZ));
  assert.ok(Math.hypot(eliteCrit.impulseX, eliteCrit.impulseZ) > Math.hypot(bossSuper.impulseX, bossSuper.impulseZ));
  assert.ok(mobCrit.squashY < 1 && mobCrit.stretchXZ > 1);
  assert.ok(bossSuper.squashY < 1 && bossSuper.squashY > 0.9);

  const ultLight = computeImpactLightPulse('ultimate');
  const critLight = computeImpactLightPulse('crit');
  assert.ok(ultLight.peakIntensity > critLight.peakIntensity);
  assert.ok(ultLight.distance > critLight.distance);

  const bossBreakFx = computePostFxImpulse('boss_break');
  const hurtFx = computePostFxImpulse('player_hurt');
  const slamFx = computePostFxImpulse('boss_slam');
  assert.ok(bossBreakFx.bloomBoost > hurtFx.bloomBoost);
  assert.ok(hurtFx.fovKick < 0);
  assert.ok(slamFx.fovKick > 0 && slamFx.chromaticBoost > 0);
});

test('AAA Adaptive Audio Mix: spatial stereo pan clamping, 4-tier combo layering & slow-mo filter', () => {
  assert.equal(computeSpatialPan(0, 10.5), 0);
  assert.equal(computeSpatialPan(10.5, 10.5), 0.68);
  assert.equal(computeSpatialPan(-10.5, 10.5), -0.68);
  assert.equal(computeSpatialPan(999, 10.5), 0.68);
  assert.equal(computeSpatialPan(-999, 10.5), -0.68);

  const t0 = computeAdaptiveCombatIntensity(0, 0.9);
  const t1 = computeAdaptiveCombatIntensity(12, 0.8);
  const t2 = computeAdaptiveCombatIntensity(30, 0.5);
  const t3 = computeAdaptiveCombatIntensity(60, 0.2);

  assert.equal(t0.tier, 0);
  assert.equal(t0.lowHpPulse, false);
  assert.equal(t1.tier, 1);
  assert.equal(t2.tier, 2);
  assert.equal(t3.tier, 3);
  assert.equal(t3.lowHpPulse, true);
  assert.ok(t3.filterCutoffHz > t2.filterCutoffHz);
  assert.ok(t2.filterCutoffHz > t1.filterCutoffHz);
  assert.ok(t1.filterCutoffHz > t0.filterCutoffHz);
  assert.ok(t3.harmonicGain > t1.harmonicGain);

  assert.equal(computeTimeScaleAudioFilter(true, 0.9), 1450);
  assert.equal(computeTimeScaleAudioFilter(false, 0.18), 6200);
  assert.equal(computeTimeScaleAudioFilter(false, 0.8), 18000);

  // Settings normalization preserves bloomEnabled default and explicit false
  assert.equal(DEFAULT_SETTINGS.bloomEnabled, true);
  assert.equal(normalizeSettings(undefined).bloomEnabled, true);
  assert.equal(normalizeSettings({ bloomEnabled: false }).bloomEnabled, false);
});

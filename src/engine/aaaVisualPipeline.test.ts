import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyGpuCapability,
  MythicZodiacGradeShader,
  resolvePostFxConfig,
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

  // Verify shader uniforms exist for EffectComposer ShaderPass
  assert.ok(MythicZodiacGradeShader.uniforms.uVignette);
  assert.ok(MythicZodiacGradeShader.uniforms.uChromatic);
  assert.ok(MythicZodiacGradeShader.uniforms.uGoldWarmth);
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

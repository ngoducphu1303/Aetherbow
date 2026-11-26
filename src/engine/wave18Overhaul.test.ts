import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import * as THREE from 'three';
import {
  computeComboPitchStep,
  SFX_CATEGORY_SPECS,
  SfxPriorityMixer,
} from '../audio/sfxPriorityMixer';
import { resolveBossPhaseTransitionStinger } from '../audio/zodiacMusicDirector';
import { computePlayerStats, createInitialSaveData } from '../data/gearData';
import { normalizeSettings } from '../data/liveOpsData';
import { computeAuthoritativeRunBounds, verifyCombatRunIntegrity } from '../data/runIntegrityVerifier';
import {
  getSkillDraftFocusBadge,
  rollSkillChoices,
} from '../data/skillsData';
import { auditChapterAssetReadiness } from '../data/wave16TacticalAndLiveOps';
import type { GlbManifestDocument } from './glbPipelineValidator';
import {
  applyCriticalStaggerSnap,
  applyFinisherFollowThrough,
  createCombatKinematicPose,
  stepCombatKinematicPose,
  stepFinisherFollowThrough,
} from './combatAnimationKinematics';
import {
  countScenePointLights,
  getImprintAspectVfxColor,
  HeroAndBossSignatureVfxPool,
} from './heroAndBossSignatureVfx';
import {
  ACCESSIBILITY_PRESETS,
  applyAccessibilityPreset,
  buildZodiacArenaAtmosphereBand,
  canRegisterProjectileEnemyHit,
  computeRicochetResonanceMult,
  computeZodiacVowAggregate,
  createSquadComboSynergyScratch,
  detectActiveAccessibilityPreset,
  disposeZodiacArenaAtmosphereBand,
  evaluateSquadComboSynergy,
  getZodiacAtmospherePalette,
  sanitizeZodiacVowsForRun,
  stepZodiacArenaAtmosphereBand,
  ZODIAC_ATMOSPHERE_PALETTES,
  ZODIAC_VOW_CATALOG,
} from './wave18TacticalAndAtmosphere';
import type { GameSettings } from '../types/game';

function countVertices(root: THREE.Object3D): number {
  let total = 0;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) {
      const pos = mesh.geometry.getAttribute('position');
      if (pos) total += pos.count;
    }
  });
  return total;
}

test('W18-1: Zodiac Vow Ch.1 lock, Ch.2-12 multiplier, authoritative integrity bounds & Skill Draft Focus Pity', () => {
  assert.equal(ZODIAC_VOW_CATALOG.length, 3);

  // Chapter 1 & non-campaign/tower modes (Training/Boss Practice/Arena) are strictly locked to zero vows
  assert.deepEqual(
    sanitizeZodiacVowsForRun(['vow_ferocity', 'vow_haste', 'vow_austerity'], 1, true),
    []
  );
  assert.deepEqual(
    sanitizeZodiacVowsForRun(['vow_ferocity'], 6, false),
    []
  );

  // Chapter 2-12 & Endless Tower accept deduplicated valid vows
  const ch6Vows = sanitizeZodiacVowsForRun(
    ['vow_ferocity', 'vow_haste', 'vow_austerity', 'vow_ferocity', 'invalid_vow'],
    6,
    true
  );
  assert.deepEqual(ch6Vows, ['vow_ferocity', 'vow_haste', 'vow_austerity']);

  const agg = computeZodiacVowAggregate(ch6Vows, 6, true);
  assert.equal(agg.goldBonusPct, 67);
  assert.equal(agg.starDustBonusPct, 60);
  assert.equal(agg.enemyHpMult, 1.18);
  assert.equal(agg.enemyDmgMult, 1.12);
  assert.equal(agg.enemyCadenceMult, 0.85);
  assert.equal(agg.healEffectivenessMult, 0.7);

  // Authoritative Run Integrity: Ch.1 strictly ignores zodiacVowGoldMult; Ch.6 allows it cleanly
  const ch1NoVowBounds = computeAuthoritativeRunBounds({
    mode: 'chapter',
    chapterId: 1,
    stageReached: 12,
    victory: true,
    basePowerRating: 702,
    zodiacVowGoldMult: 1.0,
  });
  const ch1TamperedVowBounds = computeAuthoritativeRunBounds({
    mode: 'chapter',
    chapterId: 1,
    stageReached: 12,
    victory: true,
    basePowerRating: 702,
    zodiacVowGoldMult: 1.67,
  });
  assert.equal(ch1NoVowBounds.maxAllowedGold, ch1TamperedVowBounds.maxAllowedGold);

  const ch6BaseBounds = computeAuthoritativeRunBounds({
    mode: 'chapter',
    chapterId: 6,
    stageReached: 12,
    victory: true,
    basePowerRating: 4500,
    zodiacVowGoldMult: 1.0,
  });
  const ch6VowBounds = computeAuthoritativeRunBounds({
    mode: 'chapter',
    chapterId: 6,
    stageReached: 12,
    victory: true,
    basePowerRating: 4500,
    zodiacVowGoldMult: agg.goldMult,
  });
  assert.ok(ch6VowBounds.maxAllowedGold > ch6BaseBounds.maxAllowedGold);
  const vowVerdict = verifyCombatRunIntegrity({
    mode: 'chapter',
    chapterId: 6,
    stageReached: 12,
    victory: true,
    kills: 110,
    durationSec: 260,
    basePowerRating: 4500,
    totalDamageDealt: 120000,
    claimedGold: Math.min(ch6VowBounds.maxAllowedGold, Math.round(ch6BaseBounds.maxAllowedGold * 1.35)),
    claimedGems: 25,
    claimedSeasonXp: 160,
    zodiacVowGoldMult: agg.goldMult,
  });
  assert.equal(vowVerdict.verdict, 'verified');

  // Skill Draft Focus Pity: Reroll with half a Synergy pair guarantees a focus/synergy card across deterministic seeds
  let seed = 1337;
  const detRng = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const halfPairStacks = { ricochet: 1 } as const;
  for (let trial = 0; trial < 12; trial++) {
    const rerolled = rollSkillChoices(halfPairStacks, 3, undefined, {
      chapterId: 3,
      isReroll: true,
      rng: detRng,
    });
    assert.equal(rerolled.length, 3);
    assert.ok(
      rerolled.some((s) => getSkillDraftFocusBadge(s.id, halfPairStacks) !== null),
      'Reroll Focus Pity must guarantee at least 1 synergy or build-focus card'
    );
  }

  // Chapter 1 Valkyrie 3-lane contract remains intact with Focus Pity
  const valkChoices = rollSkillChoices({ ricochet: 1 }, 3, 'epic', {
    chapterId: 1,
    stage: 2,
    isValkyrie: true,
    isReroll: true,
    rng: detRng,
  });
  assert.equal(valkChoices.length, 3);
  assert.ok(valkChoices.some((s) => getSkillDraftFocusBadge(s.id, { ricochet: 1 }) !== null));
});

test('W18-2: Zero-GC Tactical Squad Combo AI (Ch.1 neutral, Ch.2+ active) & Projectile Ricochet Resonance', () => {
  const scratch = createSquadComboSynergyScratch();

  // Chapter 1 strictly neutral (protects FTUE)
  const ch1Res = evaluateSquadComboSynergy(
    {
      chapterId: 1,
      role: 'ranged',
      aliveVanguardCount: 1,
      aliveCasterCount: 1,
      aliveSquadCount: 4,
      liteActive: false,
    },
    scratch
  );
  assert.equal(ch1Res, scratch, 'Zero-GC: must return caller scratch object');
  assert.equal(ch1Res.vanguardCoverDamageReduction, 0);
  assert.equal(ch1Res.flankerSyncSpeedMult, 1);
  assert.equal(ch1Res.casterRallyCadenceMult, 1);
  assert.equal(ch1Res.activeLinkLabel, null);

  // Chapter 4: Ranged behind Vanguard gets 14% cover DR + Caster rally cadence (0.90x High, 0.94x Lite)
  const rangedRes = evaluateSquadComboSynergy(
    {
      chapterId: 4,
      role: 'ranged',
      aliveVanguardCount: 1,
      aliveCasterCount: 1,
      aliveSquadCount: 4,
      liteActive: false,
    },
    scratch
  );
  assert.equal(rangedRes, scratch);
  assert.equal(rangedRes.vanguardCoverDamageReduction, 0.14);
  assert.equal(rangedRes.casterRallyCadenceMult, 0.9);
  assert.ok(rangedRes.activeLinkLabel !== null);

  // Chapter 4 Lite: Flanker near Vanguard gets 1.12x speed surge + softer Lite caster cadence (0.94x)
  const flankerLiteRes = evaluateSquadComboSynergy(
    {
      chapterId: 4,
      role: 'flanker',
      aliveVanguardCount: 1,
      aliveCasterCount: 1,
      aliveSquadCount: 4,
      liteActive: true,
    },
    scratch
  );
  assert.equal(flankerLiteRes.flankerSyncSpeedMult, 1.12);
  assert.equal(flankerLiteRes.casterRallyCadenceMult, 0.94);

  // Projectile Ricochet Resonance multiplier + 0.12s duplicate-hit guard
  assert.equal(computeRicochetResonanceMult(0), 1.0);
  assert.equal(computeRicochetResonanceMult(1), 1.15);
  assert.equal(computeRicochetResonanceMult(2), 1.3);
  assert.equal(computeRicochetResonanceMult(5), 1.3);

  assert.equal(canRegisterProjectileEnemyHit(undefined, 10.0), true);
  assert.equal(canRegisterProjectileEnemyHit(10.0, 10.05), false);
  assert.equal(canRegisterProjectileEnemyHit(10.0, 10.13), true);
});

test('W18-3: Crit Stagger Snap, Finisher Follow-Through, Imprint Resonance VFX & 12-Chapter Atmosphere Band (0 PointLights)', () => {
  // Kinematics: reducedMotion strictly scales to 0.25x
  const normalPose = createCombatKinematicPose();
  const reducedPose = createCombatKinematicPose();
  applyCriticalStaggerSnap(normalPose, 1.0, false);
  applyCriticalStaggerSnap(reducedPose, 1.0, true);
  assert.ok((normalPose.criticalSnap ?? 0) > 0);
  assert.ok(Math.abs((reducedPose.criticalSnap ?? 0) - (normalPose.criticalSnap ?? 0) * 0.25) < 1e-6);

  applyFinisherFollowThrough(normalPose, 1.0, false);
  const delta = { offsetY: 0, rotX: 0, rotZ: 0, scaleY: 1 };
  stepCombatKinematicPose(normalPose, 0.016, {}, delta);
  assert.ok(Number.isFinite(delta.offsetY) && Number.isFinite(delta.rotX));
  const liftBefore = stepFinisherFollowThrough(normalPose, 0.016, false);
  const liftAfter = stepFinisherFollowThrough(normalPose, 0.08, false);
  assert.ok(liftBefore > liftAfter && liftAfter >= 0);

  // Imprint Resonance VFX: 0 PointLights & Lite cap <= 3 slots
  const vfxScene = new THREE.Scene();
  const litePool = new HeroAndBossSignatureVfxPool(vfxScene, true);
  assert.equal(litePool.getPoolCapacity(), 3);
  for (let i = 0; i < 6; i++) {
    litePool.spawnTacticalImpactVfx({
      kind: 'imprint_resonance',
      x: i,
      z: -i,
      accentHex: getImprintAspectVfxColor('solar_sunder', i % 2 === 1),
      options: {
        liteActive: true,
        reducedMotion: false,
        reduceScreenFlash: false,
        colorblindTelegraphs: i % 2 === 1,
      },
    });
  }
  assert.ok(litePool.getActiveBurstCount() <= 3);
  assert.equal(countScenePointLights(vfxScene), 0);
  litePool.step(0.1, 0.1);
  litePool.dispose();

  // 12-Chapter Atmospheric Horizon Band: all 12 unique chapters, 0 PointLights, PBR contrast, Lite < High verts
  assert.equal(ZODIAC_ATMOSPHERE_PALETTES.length, 12);
  for (let ch = 1; ch <= 12; ch++) {
    const pal = getZodiacAtmospherePalette(ch);
    assert.equal(pal.chapterId, ch);

    const highBand = buildZodiacArenaAtmosphereBand(ch, 11.5, 14, false);
    const liteBand = buildZodiacArenaAtmosphereBand(ch, 11.5, 14, true);
    assert.ok(
      highBand.stoneRoughness - highBand.goldRoughness >= 0.25,
      `Chapter ${ch} PBR roughness delta must be >= 0.25`
    );
    assert.equal(highBand.pointLightCount, 0);
    assert.equal(liteBand.pointLightCount, 0);
    assert.equal(countScenePointLights(highBand.group), 0);
    assert.equal(countScenePointLights(liteBand.group), 0);
    assert.ok(
      countVertices(liteBand.group) < countVertices(highBand.group),
      `Chapter ${ch} Lite atmosphere band must have fewer vertices than High`
    );

    const rotBefore = highBand.celestialBandRing.rotation.y;
    stepZodiacArenaAtmosphereBand(highBand, 0.5, false);
    const highDelta = highBand.celestialBandRing.rotation.y - rotBefore;

    const liteRotBefore = liteBand.celestialBandRing.rotation.y;
    stepZodiacArenaAtmosphereBand(liteBand, 0.5, true);
    const reducedDelta = liteBand.celestialBandRing.rotation.y - liteRotBefore;
    assert.ok(Math.abs(reducedDelta - highDelta * 0.25) < 1e-6, 'reducedMotion must scale rotation by 0.25x');

    disposeZodiacArenaAtmosphereBand(highBand);
    disposeZodiacArenaAtmosphereBand(liteBand);
  }
});

test('W18-4: Combo Pitch Staircase, Wave 18 SFX Mixer Categories & 12-Chapter Modal Boss Phase Stinger', () => {
  // Monotonic pentatonic combo pitch staircase (1.00 .. 1.24)
  assert.equal(computeComboPitchStep(0), 1.0);
  assert.ok(computeComboPitchStep(6) > computeComboPitchStep(0));
  assert.ok(computeComboPitchStep(15) > computeComboPitchStep(6));
  assert.equal(computeComboPitchStep(30), 1.24);
  assert.equal(computeComboPitchStep(999), 1.24);

  // Wave 18 SFX priority categories
  assert.equal(SFX_CATEGORY_SPECS.ricochet_ping.priority, 72);
  assert.equal(SFX_CATEGORY_SPECS.vow_seal_chime.priority, 84);
  const mixer = new SfxPriorityMixer();
  const ricochetDec = mixer.requestPlay('ricochet_ping', 100);
  const vowDec = mixer.requestPlay('vow_seal_chime', 110);
  assert.equal(ricochetDec.allowed, true);
  assert.equal(vowDec.allowed, true);

  // 12-chapter Boss Phase II & III modal transition stingers (distinct scales, low-end CPU cap)
  const seenScales = new Set<string>();
  for (let ch = 1; ch <= 12; ch++) {
    const p2 = resolveBossPhaseTransitionStinger(ch, 2, false);
    const p3 = resolveBossPhaseTransitionStinger(ch, 3, false);
    const p3Low = resolveBossPhaseTransitionStinger(ch, 3, true);

    assert.equal(p2.chapterId, ch);
    assert.equal(p2.notes.length, 3);
    assert.equal(p3.notes.length, 3);
    assert.ok(p3.notes[2].freq > p2.notes[2].freq, `Ch.${ch} Phase III climax must exceed Phase II`);
    assert.equal(p3Low.maxOscillators, 1);
    assert.equal(p3Low.notes[0].wave, 'triangle');
    seenScales.add(p2.musicalScale);
  }
  assert.ok(seenScales.size >= 8, '12 chapters must span distinct modal scales');
});

test('W18-5: 1-Click Accessibility Presets, 12-Chapter Asset Readiness Audit & Fresh 702 LC Invariant', () => {
  assert.equal(ACCESSIBILITY_PRESETS.length, 4);

  const baseSettings: GameSettings = normalizeSettings({
    masterVol: 0.77,
    bgmVol: 0.55,
    sfxVol: 0.88,
    graphicsQuality: 'medium',
  });

  for (const preset of ACCESSIBILITY_PRESETS) {
    const applied = applyAccessibilityPreset(baseSettings, preset.id);
    assert.equal(applied.masterVol, 0.77, 'Preset must preserve unrelated master volume');
    assert.equal(applied.bgmVol, 0.55, 'Preset must preserve unrelated BGM volume');
    assert.equal(applied.sfxVol, 0.88, 'Preset must preserve unrelated SFX volume');
    assert.equal(applied.graphicsQuality, 'medium', 'Preset must preserve graphics quality');
    assert.equal(detectActiveAccessibilityPreset(applied), preset.id);
  }

  // Custom mixed combination returns 'custom'
  const customSettings: GameSettings = {
    ...baseSettings,
    colorblindTelegraphs: true,
    highContrastTelegraphs: false,
    reducedMotion: true,
    reduceScreenFlash: false,
  };
  assert.equal(detectActiveAccessibilityPreset(customSettings), 'custom');

  // Real 12-Chapter Asset Readiness Audit from scripts/glb-manifest.json
  const manifestPath = path.resolve(process.cwd(), 'scripts/glb-manifest.json');
  const rawManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8')) as GlbManifestDocument;
  const audit = auditChapterAssetReadiness(rawManifest);
  assert.equal(audit.allTwelveChaptersReady, true);
  assert.equal(audit.readyChaptersCount, 12);
  assert.equal(audit.totalProceduralPointLights, 0);
  assert.equal(audit.e5430Safe, true);

  // Hard Economy Invariant: Fresh Account remains strictly 702 LC
  const freshSave = createInitialSaveData();
  const freshStats = computePlayerStats(freshSave);
  assert.equal(freshStats.powerRating, 702);
});

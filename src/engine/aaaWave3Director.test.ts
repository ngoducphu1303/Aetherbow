import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeArenaEntryFlyBlend,
  computeEdgeThreatIndicators,
  computeLobbyEmotePose,
  computePostRunDamageShares,
  computeSkillSynergyProgress,
  computeUltimateCutinState,
  resolveChapterBiomeAtmosphere,
} from './aaaWave3Director';
import { SKILL_SYNERGIES } from '../data/skillsData';

test('resolveChapterBiomeAtmosphere maps 4 zodiac biomes and boss phase II/III shifts', () => {
  const solar = resolveChapterBiomeAtmosphere('leo', 1);
  const frost = resolveChapterBiomeAtmosphere('pisces', 1);
  const astral = resolveChapterBiomeAtmosphere('aquarius', 1);
  const verdant = resolveChapterBiomeAtmosphere('taurus', 1);

  assert.equal(solar.weatherKind, 'embers');
  assert.equal(frost.weatherKind, 'snow');
  assert.equal(astral.weatherKind, 'stardust');
  assert.equal(verdant.weatherKind, 'petals');
  assert.ok(solar.weatherSpeedY > 0);
  assert.ok(frost.weatherSpeedY < 0);

  const phase2 = resolveChapterBiomeAtmosphere('pisces', 2);
  const phase3 = resolveChapterBiomeAtmosphere('pisces', 3);
  assert.equal(phase2.weatherKind, 'snow');
  assert.equal(phase2.rimLightHex, 0xf59e0b);
  assert.ok(phase2.fogDensity > frost.fogDensity);
  assert.equal(phase3.rimLightHex, 0xf43f5e);
  assert.ok(phase3.fogDensity >= phase2.fogDensity);
});

test('computeUltimateCutinState ramps cleanly without locking movement', () => {
  const idle = computeUltimateCutinState(0, 0.75);
  assert.equal(idle.active, false);
  assert.equal(idle.eclipseDarken, 0);
  assert.equal(idle.fovPunch, 0);

  const peak = computeUltimateCutinState(0.45, 0.75); // progress = 0.40 (hold window)
  assert.equal(peak.active, true);
  assert.equal(peak.eclipseDarken, 0.44);
  assert.equal(peak.fovPunch, -3.4);

  const release = computeUltimateCutinState(0.08, 0.75);
  assert.equal(release.active, true);
  assert.ok(release.eclipseDarken > 0 && release.eclipseDarken < peak.eclipseDarken);
  assert.ok(release.fovPunch < 0 && release.fovPunch > peak.fovPunch);
});

test('computeArenaEntryFlyBlend eases smoothly from 1 to 0', () => {
  assert.equal(computeArenaEntryFlyBlend(0, 0.55), 0);
  assert.equal(computeArenaEntryFlyBlend(0.55, 0.55), 1);
  const mid = computeArenaEntryFlyBlend(0.275, 0.55);
  assert.equal(mid, 0.5);
  const late = computeArenaEntryFlyBlend(0.1, 0.55);
  assert.ok(late > 0 && late < mid);
});

test('computeLobbyEmotePose drives smooth bow draw, lift arc, and glow boost', () => {
  const idle = computeLobbyEmotePose(0, 1.05);
  assert.equal(idle.active, false);
  assert.equal(idle.drawProgress, 0);

  // p = 0.55 (hold peak window 0.45..0.72)
  const hold = computeLobbyEmotePose(1.05 * (1 - 0.55), 1.05);
  assert.equal(hold.active, true);
  assert.equal(hold.drawProgress, 1);
  assert.equal(hold.glowBoost, 1);
  assert.ok(hold.liftY > 0.1);

  const end = computeLobbyEmotePose(0.02, 1.05);
  assert.equal(end.active, true);
  assert.ok(end.drawProgress < 0.2);
});

test('computeEdgeThreatIndicators prioritizes urgent threats, computes compass angles, and deduplicates', () => {
  const arrows = computeEdgeThreatIndicators(
    0,
    0,
    [
      { x: 0, z: -10, kind: 'boss_charge', urgent: true }, // North -> 0 deg
      { x: 1, z: -10, kind: 'orb' },                        // ~6 deg -> deduped within 28 deg
      { x: 10, z: 0, kind: 'orb' },                         // East -> 90 deg
      { x: 0, z: 8, kind: 'orb' },                          // South -> 180 deg
      { x: -7, z: 0, kind: 'boss_charge', urgent: true },   // West -> 270 deg
      { x: 0, z: -1, kind: 'orb' },                         // Too close (< 2.2) -> ignored
      { x: 30, z: 0, kind: 'orb' },                         // Too far (> 19.5) -> ignored
      { x: 11, z: 11, kind: 'orb' },                        // 5th direction (farther) -> capped by maxCount=4
    ],
    4
  );

  assert.equal(arrows.length, 4);
  assert.equal(arrows[0].severity, 'high');
  assert.ok(arrows.some((a) => a.angleDeg === 0 && a.kind === 'boss_charge'));
  assert.ok(arrows.some((a) => a.angleDeg === 270 && a.kind === 'boss_charge'));
  assert.ok(arrows.some((a) => a.angleDeg === 90));
  assert.ok(arrows.some((a) => a.angleDeg === 180));
});

test('computeSkillSynergyProgress tracks 0/2 -> 1/2 activation preview -> 2/2 active', () => {
  const firstSyn = SKILL_SYNERGIES[0];
  const skillA = firstSyn.groupA[0];
  const skillB = firstSyn.groupB[0];

  const none = computeSkillSynergyProgress(skillA, {}, SKILL_SYNERGIES);
  assert.ok(none);
  assert.equal(none.matchedCount, 0);
  assert.equal(none.willActivateNow, false);
  assert.equal(none.alreadyActive, false);

  const ready = computeSkillSynergyProgress(skillB, { [skillA]: 1 }, SKILL_SYNERGIES);
  assert.ok(ready);
  assert.equal(ready.synergyId, firstSyn.id);
  assert.equal(ready.matchedCount, 1);
  assert.equal(ready.willActivateNow, true);
  assert.equal(ready.alreadyActive, false);

  const active = computeSkillSynergyProgress(skillB, { [skillA]: 1, [skillB]: 1 }, SKILL_SYNERGIES);
  assert.ok(active);
  assert.equal(active.matchedCount, 2);
  assert.equal(active.alreadyActive, true);
  assert.equal(active.willActivateNow, false);
});

test('computePostRunDamageShares normalizes breakdown percentages and identifies dominant pillar', () => {
  const empty = computePostRunDamageShares(undefined);
  assert.equal(empty.total, 0);

  const shares = computePostRunDamageShares({
    basic: 2500,
    ultimate: 4500,
    elemental: 2000,
    pet: 1000,
    peakCrit: 1200,
    elapsedSeconds: 85,
    perfectDodges: 4,
    punishHits: 7,
  });

  assert.equal(shares.total, 10000);
  assert.equal(shares.basicPct + shares.ultimatePct + shares.elementalPct + shares.petPct, 100);
  assert.equal(shares.ultimatePct, 45);
  assert.equal(shares.dominantLabel, 'Chiêu Cuối');
});

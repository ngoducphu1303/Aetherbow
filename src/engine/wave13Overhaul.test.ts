import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';

import { computePlayerStats, createInitialSaveData } from '../data/gearData';
import {
  getRuneRefinementCost,
  getRuneRefinementMultiplier,
  getRuneRefinementTier,
  polishGearSubstatInSave,
  previewGearSubstatPolish,
  previewRuneRefinement,
  refineRuneInSave,
  RUNE_REFINEMENT_MAX_TIER,
} from '../data/runeAndAffixRefining';
import { validateAndSanitizeSaveIntegrity } from '../data/saveIntegrity';
import { SUBSTAT_DEFS } from '../data/wave4Data';
import { EnemyKind, GearInstance, Rarity, RuneId, SaveData } from '../types/game';
import {
  advanceElementalReactionChain,
  createElementalChainState,
  evaluateElementalReaction,
  stepElementalChainState,
} from './aaaWave4Director';
import {
  ELEMENTAL_REACTION_GUIDE,
  EXTENDED_ELEMENTAL_REACTION_GUIDE,
} from './aaaWave5Director';
import { countScenePointLights } from './heroAndBossSignatureVfx';
import {
  computeLeylineConduitPosition,
  computeVanguardLinkDamageMultiplier,
  evaluatePillarShatterShockwave,
  isPhalanxVanguardKind,
  PillarShatterHit,
  QUAKE_PULSE_CONFIG,
  resolveEligibleEliteAffixes,
  resolveTacticalRoomModifier,
  TACTICAL_ROOM_MODIFIERS,
  toTacticalRoomModifierSnapshot,
} from './tacticalRoomModifiers';
import {
  buildZodiacArenaFloorMedallion,
  disposeZodiacFloorMedallion,
  stepZodiacRealmLandmarks,
} from './zodiacRealmArchitecture';

function countGeometryVertices(root: THREE.Object3D): number {
  let verts = 0;
  root.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) {
      const pos = mesh.geometry.getAttribute('position');
      if (pos) verts += pos.count;
    }
  });
  return verts;
}

// =============================================================================
// W13-1: Tactical Room Modifiers & Pillar Shatter Physics
// =============================================================================
test('W13-1: Tactical Room Modifiers stay strictly off for Ch.1 Stages 1-5 and special modes, deterministic for Ch.2+ and Tower', () => {
  assert.equal(Object.keys(TACTICAL_ROOM_MODIFIERS).length, 5);

  // Ch.1 Stages 1-5 FTUE protection
  for (let stage = 1; stage <= 5; stage++) {
    const mod = resolveTacticalRoomModifier({
      chapterId: 1,
      stageIndex: stage,
      isBossStage: false,
      isTower: false,
      towerFloor: 0,
      isTraining: false,
      isArena: false,
    });
    assert.equal(mod, null, `Ch.1 Stage ${stage} must NOT spawn tactical room modifier`);
  }

  // Training, Arena, World Boss, and Ch.1-5 Boss rooms must be null
  assert.equal(
    resolveTacticalRoomModifier({
      chapterId: 4,
      stageIndex: 3,
      isBossStage: true,
    }),
    null
  );
  assert.equal(
    resolveTacticalRoomModifier({
      chapterId: 4,
      stageIndex: 3,
      isBossStage: false,
      isTraining: true,
    }),
    null
  );
  assert.equal(
    resolveTacticalRoomModifier({
      chapterId: 4,
      stageIndex: 3,
      isBossStage: false,
      isArena: true,
    }),
    null
  );
  assert.equal(
    resolveTacticalRoomModifier({
      chapterId: 4,
      stageIndex: 3,
      isBossStage: false,
      isWorldBoss: true,
    }),
    null
  );

  // Ch.2+ must deterministically rotate through all 5 modifiers
  const seen = new Set<string>();
  for (let ch = 2; ch <= 8; ch++) {
    for (let st = 1; st <= 6; st++) {
      const m1 = resolveTacticalRoomModifier({
        chapterId: ch,
        stageIndex: st,
        isBossStage: false,
        hasObstacles: true,
      });
      const m2 = resolveTacticalRoomModifier({
        chapterId: ch,
        stageIndex: st,
        isBossStage: false,
        hasObstacles: true,
      });
      assert.ok(m1, `Ch.${ch} S${st} should have a tactical modifier`);
      assert.equal(m1.id, m2?.id, 'Modifier selection must be deterministic');
      seen.add(m1.id);
    }
  }
  assert.equal(seen.size, 5, 'All 5 tactical room modifiers should appear across Ch.2-8');

  const snap = toTacticalRoomModifierSnapshot(TACTICAL_ROOM_MODIFIERS.leyline_conduit, true);
  assert.ok(snap);
  assert.equal(snap.buffActive, true);
  assert.equal(snap.symbol, '◈');
  assert.equal(snap.accentHex, '#38bdf8');

  // Leyline Conduit position stays safely inside arena margins & clears obstacles
  const ley = computeLeylineConduitPosition(
    10.5,
    13.5,
    [{ x: 2.9, z: 2.6, radius: 1.0 }],
    5
  );
  assert.ok(Math.abs(ley.x) <= 7.0 && Math.abs(ley.z) <= 9.5);
  assert.ok(Math.hypot(ley.x - 2.9, ley.z - 2.6) >= 2.0);
});

test('W13-1b: Pillar Shatter Shockwave stuns & knocks back enemies within 3.4m Zero-GC', () => {
  const enemies = [
    { id: 1, x: 1.5, z: 0, radius: 0.6, isBoss: false },
    { id: 2, x: 2.5, z: 0, radius: 0.9, isBoss: true },
    { id: 3, x: 8.0, z: 0, radius: 0.6, isBoss: false },
  ];
  const outHits: PillarShatterHit[] = [];

  const count = evaluatePillarShatterShockwave({ x: 0, z: 0 }, enemies, 100, outHits);
  assert.equal(count, 2, 'Should hit living enemies within 3.4m + radius only');
  const mobHit = outHits.find((h) => h.id === 1)!;
  const bossHit = outHits.find((h) => h.id === 2)!;
  assert.equal(mobHit.stunSec, 1.1);
  assert.ok(mobHit.knockX > 0, 'Should push enemy away from pillar center');
  assert.ok(mobHit.damage > 0);
  assert.ok(bossHit.stunSec < mobHit.stunSec, 'Bosses receive reduced shatter stun');
  assert.ok(bossHit.knockX < mobHit.knockX, 'Bosses receive reduced knockback');

  assert.equal(isPhalanxVanguardKind(EnemyKind.GOLEM), true);
  assert.equal(isPhalanxVanguardKind(EnemyKind.SKIRMISHER), true);
  assert.equal(isPhalanxVanguardKind(EnemyKind.IMP_ARCHER), false);
});

// =============================================================================
// W13-2: Complete 6-Pair Elemental Reaction Matrix & Elemental Chain Resonance
// =============================================================================
test('W13-2: All 6 elemental pairs resolve cleanly and Elemental Chain Resonance triggers on 2+ distinct reactions within 6s', () => {
  assert.equal(ELEMENTAL_REACTION_GUIDE.length, 4, 'Legacy 4-entry guide must stay intact');
  assert.equal(EXTENDED_ELEMENTAL_REACTION_GUIDE.length, 6, 'Extended guide exposes all 6 pairs');

  const melt = evaluateElementalReaction({ burning: false, chilled: true, poisoned: false }, 'fire', 100, 0);
  assert.equal(melt?.id, 'melt');

  const superc = evaluateElementalReaction({ burning: false, chilled: true, poisoned: false }, 'storm', 100, 0);
  assert.equal(superc?.id, 'superconduct');

  const overload = evaluateElementalReaction({ burning: true, chilled: false, poisoned: false }, 'storm', 100, 0);
  assert.equal(overload?.id, 'overload');

  const venomDet = evaluateElementalReaction({ burning: false, chilled: false, poisoned: true }, 'fire', 100, 0);
  assert.equal(venomDet?.id, 'venom_detonation');

  // NEW 5: Electro-Venom (Storm + Poison, both orders)
  const ev1 = evaluateElementalReaction({ burning: false, chilled: false, poisoned: true }, 'storm', 100, 0);
  const ev2 = evaluateElementalReaction({ burning: false, chilled: false, poisoned: false, shocked: true }, 'poison', 100, 0);
  assert.equal(ev1?.id, 'electro_venom');
  assert.equal(ev2?.id, 'electro_venom');
  assert.ok((ev1?.chainTargets ?? 0) >= 2);

  // NEW 6: Cryo-Blight (Ice + Poison, both orders)
  const cb1 = evaluateElementalReaction({ burning: false, chilled: true, poisoned: false }, 'poison', 100, 0);
  const cb2 = evaluateElementalReaction({ burning: false, chilled: false, poisoned: true }, 'ice', 100, 0);
  assert.equal(cb1?.id, 'cryo_blight');
  assert.equal(cb2?.id, 'cryo_blight');
  assert.ok((cb1?.sunderDurationSec ?? 0) >= 2.5);

  // Zero-GC Elemental Chain Resonance
  const chain = createElementalChainState();
  const r1 = advanceElementalReactionChain(chain, 'melt');
  assert.equal(r1.chainCount, 1);
  assert.equal(r1.triggeredChainResonance, false);
  assert.equal(r1.damageMultiplier, 1.0);

  // Repeating same reaction does not increment chain
  const rSame = advanceElementalReactionChain(chain, 'melt');
  assert.equal(rSame.chainCount, 1);
  assert.equal(rSame.triggeredChainResonance, false);

  // Distinct reaction within 6s triggers Resonance x2 (+18% dmg, +15% Break Shield)
  stepElementalChainState(chain, 2.5);
  const r2 = advanceElementalReactionChain(chain, 'electro_venom');
  assert.equal(r2.chainCount, 2);
  assert.equal(r2.triggeredChainResonance, true);
  assert.equal(r2.damageMultiplier, 1.18);
  assert.equal(r2.extraBreakShieldRatio, 0.15);
  assert.ok(r2.calloutLabel?.includes('×2'));

  // Expiring 6s window resets chain cleanly
  stepElementalChainState(chain, 6.2);
  assert.equal(chain.chainCount, 0);
  assert.equal(chain.lastReactionId, null);
});

// =============================================================================
// W13-3: New Tactical Elite Affixes (vanguard_link & quake_pulse)
// =============================================================================
test('W13-3: vanguard_link & quake_pulse unlock at Ch.4+ or Tower F12+ and expose clear counterplay constants', () => {
  const ch2 = resolveEligibleEliteAffixes(2, false, 0);
  assert.equal(ch2.length, 4);
  assert.equal(ch2.includes('vanguard_link'), false);
  assert.equal(ch2.includes('quake_pulse'), false);

  const ch4 = resolveEligibleEliteAffixes(4, false, 0);
  assert.equal(ch4.length, 6);
  assert.equal(ch4.includes('vanguard_link'), true);
  assert.equal(ch4.includes('quake_pulse'), true);

  const tower12 = resolveEligibleEliteAffixes(1, true, 12);
  assert.equal(tower12.length, 6);
  assert.equal(tower12.includes('vanguard_link'), true);
  assert.equal(tower12.includes('quake_pulse'), true);

  // Vanguard Link grants 18% DR (0.82x) while linker is alive & unstunned within 6.2u
  const peers = [
    { id: 10, x: 2, z: 0, hp: 500, hasVanguardLink: true, stunTimer: 0 },
  ];
  assert.equal(computeVanguardLinkDamageMultiplier(20, 0, 0, peers), 0.82);
  // Stunning the linker breaks the aura immediately (counterplay!)
  assert.equal(
    computeVanguardLinkDamageMultiplier(20, 0, 0, [
      { id: 10, x: 2, z: 0, hp: 500, hasVanguardLink: true, stunTimer: 1.0 },
    ]),
    1.0
  );
  assert.equal(QUAKE_PULSE_CONFIG.interruptExposedSec, 2.5);
  assert.ok(QUAKE_PULSE_CONFIG.radius >= 3.5 && QUAKE_PULSE_CONFIG.telegraphDurationSec >= 1.0);
});

// =============================================================================
// W13-4: Ancient Rune Refinement (+0 -> +5) & Targeted Gear Substat Polishing
// =============================================================================
test('W13-4: Ancient Rune Refinement & Substat Polishing obey unlock rules, deduct resources accurately, preserve 702 LC fresh start, and sanitize safely', () => {
  const fresh = createInitialSaveData();
  const freshStats = computePlayerStats(fresh);
  assert.equal(freshStats.powerRating, 702, 'Fresh account baseline must remain strictly 702 LC');

  // Rune Refinement locked before Ch.3 (highestChapterCleared < 2)
  const lockedPreview = previewRuneRefinement(fresh, 'rune_flame');
  assert.equal(lockedPreview.unlocked, false);
  assert.equal(lockedPreview.canAfford, false);

  // Unlock at Ch.3 (highestChapterCleared >= 2) and equip a valid RuneId from RUNES_CATALOG
  const unlockedSave: SaveData = {
    ...fresh,
    highestChapterCleared: 2,
    gold: 200_000,
    starDust: 1000,
    pity: {
      mythicRollsSinceEpic: fresh.pity?.mythicRollsSinceEpic ?? 0,
      mythicRollsSinceSTier: fresh.pity?.mythicRollsSinceSTier ?? 0,
      runeRollsSinceEpic: fresh.pity?.runeRollsSinceEpic ?? 0,
      ...fresh.pity,
      ancientRuneShards: 400,
    },
    runeInventory: [
      { uid: 'r_test_1', runeId: 'rune_flame' as RuneId, rarity: Rarity.EPIC },
    ],
    equippedRunes: ['r_test_1'],
  };
  const statsBeforeRefine = computePlayerStats(unlockedSave);
  let curSave: SaveData = unlockedSave;
  for (let expectedTier = 1; expectedTier <= RUNE_REFINEMENT_MAX_TIER; expectedTier++) {
    const cost = getRuneRefinementCost(expectedTier - 1);
    const prevDust = curSave.starDust ?? 0;
    const prevShards = curSave.pity?.ancientRuneShards ?? 0;
    const res = refineRuneInSave(curSave, 'rune_flame');
    assert.equal(res.ok, true, res.message);
    assert.equal(res.newTier, expectedTier);
    assert.equal(curSave.gold - res.nextSave.gold, cost.gold);
    assert.equal(prevDust - (res.nextSave.starDust ?? 0), cost.starDust);
    assert.equal(prevShards - (res.nextSave.pity?.ancientRuneShards ?? 0), cost.ancientRuneShards);
    assert.equal(getRuneRefinementTier(res.nextSave, 'rune_flame'), expectedTier);
    curSave = res.nextSave;
  }
  assert.equal(getRuneRefinementMultiplier(curSave, 'rune_flame'), 1.3);
  const statsAfterMaxRefine = computePlayerStats(curSave);
  assert.ok(
    statsAfterMaxRefine.powerRating > statsBeforeRefine.powerRating,
    'Refined equipped rune must boost real player power rating'
  );
  // Cannot refine past +5
  assert.equal(refineRuneInSave(curSave, 'rune_flame').ok, false);

  // Targeted Substat Polishing
  const testGear: GearInstance = {
    uid: 'gear_polish_1',
    templateId: 'wpn_sunbow',
    rarity: Rarity.EPIC,
    level: 10,
    substats: [{ id: 'sub_1', kind: 'atk_pct', value: 0.04, tier: 'rare' }],
  };
  const polishSave: SaveData = {
    ...unlockedSave,
    inventory: [...unlockedSave.inventory, testGear],
  };
  const prevPolish = previewGearSubstatPolish(testGear, 'sub_1', polishSave)!;
  assert.ok(prevPolish.canAfford);
  assert.ok(prevPolish.nextValue > 0.04);

  let pSave: SaveData = polishSave;
  let steps = 0;
  while (steps < 12) {
    const beforeVal = pSave.inventory.find((g) => g.uid === 'gear_polish_1')!.substats![0].value;
    const res = polishGearSubstatInSave(pSave, 'gear_polish_1', 'sub_1');
    if (!res.ok) break;
    const afterVal = res.nextSave.inventory.find((g) => g.uid === 'gear_polish_1')!.substats![0].value;
    assert.ok(afterVal > beforeVal);
    pSave = res.nextSave;
    steps += 1;
  }
  assert.ok(steps >= 3 && steps <= 6, `Substat should reach cap deterministically in 3-6 steps (got ${steps})`);
  const finalItem = pSave.inventory.find((g) => g.uid === 'gear_polish_1')!;
  assert.equal(finalItem.substats![0].value, SUBSTAT_DEFS.atk_pct.maxPct);
  assert.equal(finalItem.substats![0].tier, 'gold');

  // saveIntegrity clamps tampered runeRefinements & substats
  const tampered = {
    ...pSave,
    runeRefinements: {
      rune_flame: 99,
      invalid_rune_id: 3,
    } as unknown as typeof pSave.runeRefinements,
  };
  tampered.inventory = tampered.inventory.map((g) =>
    g.uid === 'gear_polish_1'
      ? { ...g, substats: [{ id: 'sub_1', kind: 'atk_pct', value: 999, tier: 'gold' }] }
      : g
  );
  const { sanitizedSave } = validateAndSanitizeSaveIntegrity(tampered);
  assert.equal(sanitizedSave.runeRefinements?.rune_flame, RUNE_REFINEMENT_MAX_TIER);
  assert.equal((sanitizedSave.runeRefinements as Record<string, number>)?.invalid_rune_id, undefined);
  const repairedGear = sanitizedSave.inventory.find((g) => g.uid === 'gear_polish_1')!;
  assert.equal(repairedGear.substats![0].value, SUBSTAT_DEFS.atk_pct.maxPct);
});

// =============================================================================
// W13-5: Chapter 5-12 Procedural Celestial Arena Floor Medallions (0 PointLights)
// =============================================================================
test('W13-5: Chapter 5-12 procedural floor medallions build with 0 PointLights, polygonOffset, Lite vertex reduction, and clean disposal', () => {
  // Chapters 1-4 return null
  for (let ch = 1; ch <= 4; ch++) {
    const m = buildZodiacArenaFloorMedallion({
      chapterId: ch,
      trimHex: 0xfbbf24,
      arenaHalfW: 10.5,
      arenaHalfD: 13.5,
      liteActive: false,
    });
    assert.equal(m, null, `Chapter ${ch} should not create a Ch.5-12 medallion`);
  }

  for (let ch = 5; ch <= 12; ch++) {
    const full = buildZodiacArenaFloorMedallion({
      chapterId: ch,
      trimHex: 0xfbbf24,
      arenaHalfW: 10.5,
      arenaHalfD: 13.5,
      liteActive: false,
    });
    const lite = buildZodiacArenaFloorMedallion({
      chapterId: ch,
      trimHex: 0xfbbf24,
      arenaHalfW: 10.5,
      arenaHalfD: 13.5,
      liteActive: true,
    });
    assert.ok(full && lite, `Chapter ${ch} must produce full and lite medallions`);
    assert.equal(countScenePointLights(full.group), 0, `Ch.${ch} medallion must add 0 PointLights`);
    assert.equal(countScenePointLights(lite.group), 0, `Ch.${ch} lite medallion must add 0 PointLights`);
    assert.equal(full.pointLightCount, 0);
    assert.ok(full.meshCount >= 3, `Ch.${ch} medallion must have multi-part geometry`);
    const fullVerts = countGeometryVertices(full.group);
    const liteVerts = countGeometryVertices(lite.group);
    assert.ok(
      liteVerts < fullVerts,
      `Ch.${ch} lite medallion must reduce geometry vertices (${liteVerts} < ${fullVerts})`
    );
    assert.ok(full.animNodes.length >= 1, `Ch.${ch} medallion must have a Zero-GC spin node`);

    // Verify all medallion materials use polygonOffset & depthWrite=false to avoid z-fighting
    full.group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mat = (obj as THREE.Mesh).material as THREE.MeshBasicMaterial;
        assert.equal(mat.polygonOffset, true, `Ch.${ch} medallion mesh must enable polygonOffset`);
        assert.equal(mat.depthWrite, false, `Ch.${ch} medallion mesh must set depthWrite=false`);
      }
    });

    // Stepping animNodes updates rotation without throwing
    stepZodiacRealmLandmarks(full.animNodes, 1.5, false);

    // Clean GPU disposal
    disposeZodiacFloorMedallion(full);
    disposeZodiacFloorMedallion(lite);
  }
});

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  WALL_SLAM_BONUS_DAMAGE_MULT,
  WALL_SLAM_COOLDOWN_SEC,
  WALL_SLAM_MIN_IMPULSE,
  WALL_SLAM_STUN_SEC,
  applyCrossroadsRewardBonus,
  computeRiposteArrowEnhancement,
  createWallSlamResultScratch,
  evaluateWallSlamImpact,
  resolveFormationDoctrineProfile,
  rollTacticalCrossroadsPair,
} from './wave15CombatSystems';
import {
  GEAR_SET_TRANSMUTATION_COSTS,
  GEAR_SET_TRANSMUTATION_MIN_CHAPTER,
  computeWave15TransmutationSinkAudit,
  previewGearSetTransmutation,
  resolveEffectiveGearSetId,
  transmuteGearSetInSave,
} from '../data/gearSetTransmutation';
import {
  GEAR_TEMPLATES,
  computePlayerStats,
  createInitialSaveData,
  evaluateEquippedGearSets,
} from '../data/gearData';
import { validateAndSanitizeSaveIntegrity } from '../data/saveIntegrity';
import { SfxPriorityMixer, SFX_CATEGORY_SPECS } from '../audio/sfxPriorityMixer';
import { computeTimeScaleAudioFilter } from '../audio/aaaAudioMix';
import { resolveChapterEndingCadence } from '../audio/zodiacMusicDirector';
import { GearSlot, Rarity, type GearInstance, type GearSetId } from '../types/game';

test('W15-1: Zodiac Counter-Volley Riposte grants pierce, guard-break, knockback & respects reducedMotion', () => {
  const normal = computeRiposteArrowEnhancement({
    activeSynergyMaxScale: 2,
    reducedMotion: false,
  });
  assert.equal(normal.extraPierce, 1);
  assert.equal(normal.bossGuardBreakMult, 1.45);
  assert.equal(normal.knockbackMult, 1.35);
  assert.equal(normal.hitStopSec, 0.032);
  assert.ok(normal.damageBonusMult > 1.1);
  assert.equal(normal.label, 'PHẢN TIỄN CỘNG HƯỞNG!');

  const reduced = computeRiposteArrowEnhancement({
    activeSynergyMaxScale: 0,
    reducedMotion: true,
  });
  assert.equal(reduced.hitStopSec, 0);
  assert.equal(reduced.damageBonusMult, 1);
  assert.equal(reduced.label, 'PHẢN TIỄN HOÀNG ĐẠO!');
});

test('W15-2: Zero-GC Wall-Slam Impact Physics detects arena walls & stone pillars, enforces cooldown and Boss stagger immunity', () => {
  const scratch = createWallSlamResultScratch();

  // 1. Arena wall slam on regular enemy
  const wallRes = evaluateWallSlamImpact(
    {
      nextX: 11.2,
      nextZ: -2.0,
      clampedX: 9.8,
      clampedZ: -2.0,
      knockbackImpulse: 0.85,
      arenaHalfW: 10.6,
      arenaHalfD: 10.6,
      enemyRadius: 0.45,
      isBoss: false,
      isDummy: false,
      wallSlamCooldownRemaining: 0,
      pillars: [],
    },
    scratch
  );
  assert.strictEqual(wallRes, scratch); // Zero-GC identity check
  assert.equal(wallRes.triggered, true);
  assert.equal(wallRes.source, 'wall');
  assert.equal(wallRes.stunDurationSec, WALL_SLAM_STUN_SEC);
  assert.equal(wallRes.bonusDamageMultiplier, WALL_SLAM_BONUS_DAMAGE_MULT);
  assert.equal(wallRes.bossStaggerOnly, false);
  assert.equal(wallRes.nextCooldownSec, WALL_SLAM_COOLDOWN_SEC);

  // 2. Active cooldown blocks rapid re-slam
  const cdBlocked = evaluateWallSlamImpact(
    {
      nextX: 11.2,
      nextZ: -2.0,
      clampedX: 9.8,
      clampedZ: -2.0,
      knockbackImpulse: 1.0,
      arenaHalfW: 10.6,
      arenaHalfD: 10.6,
      enemyRadius: 0.45,
      isBoss: false,
      isDummy: false,
      wallSlamCooldownRemaining: 0.9,
      pillars: [],
    },
    scratch
  );
  assert.equal(cdBlocked.triggered, false);

  // 3. Stone pillar slam on Boss -> bonus damage & stagger-only (no hard stun)
  const bossPillarRes = evaluateWallSlamImpact(
    {
      nextX: 3.1,
      nextZ: -1.1,
      clampedX: 3.1,
      clampedZ: -1.1,
      knockbackImpulse: 0.72,
      arenaHalfW: 10.6,
      arenaHalfD: 10.6,
      enemyRadius: 0.9,
      isBoss: true,
      isDummy: false,
      wallSlamCooldownRemaining: 0,
      pillars: [{ x: 3.5, z: -1.2, radius: 0.8 }],
    },
    scratch
  );
  assert.equal(bossPillarRes.triggered, true);
  assert.equal(bossPillarRes.source, 'pillar');
  assert.equal(bossPillarRes.bossStaggerOnly, true);
  assert.equal(bossPillarRes.stunDurationSec, 0);

  // 4. Weak knockback below threshold never triggers
  const weakRes = evaluateWallSlamImpact(
    {
      nextX: 11.2,
      nextZ: 0,
      clampedX: 9.8,
      clampedZ: 0,
      knockbackImpulse: WALL_SLAM_MIN_IMPULSE - 0.1,
      arenaHalfW: 10.6,
      arenaHalfD: 10.6,
      enemyRadius: 0.45,
      isBoss: false,
      isDummy: false,
      wallSlamCooldownRemaining: 0,
      pillars: [],
    },
    scratch
  );
  assert.equal(weakRes.triggered, false);
});

test('W15-3: Tactical Room Crossroads protects Ch.1 FTUE, offers deterministic pairs on Ch.2-12 Stage 4/8, and scales doctrines & rewards', () => {
  // Disabled on Ch.1 and special modes
  assert.equal(
    rollTacticalCrossroadsPair({
      chapterId: 1,
      stageCleared: 4,
      isCampaignMode: true,
      runSeed: 101,
    }),
    null
  );
  assert.equal(
    rollTacticalCrossroadsPair({
      chapterId: 5,
      stageCleared: 4,
      isCampaignMode: false,
      runSeed: 101,
    }),
    null
  );
  assert.equal(
    rollTacticalCrossroadsPair({
      chapterId: 5,
      stageCleared: 3,
      isCampaignMode: true,
      runSeed: 101,
    }),
    null
  );

  // Enabled deterministically on Ch.2..12 at Stage 4 & Stage 8
  for (let ch = 2; ch <= 12; ch++) {
    for (const st of [4, 8]) {
      const pairA = rollTacticalCrossroadsPair({
        chapterId: ch,
        stageCleared: st,
        isCampaignMode: true,
        runSeed: ch * 97 + st,
      });
      const pairB = rollTacticalCrossroadsPair({
        chapterId: ch,
        stageCleared: st,
        isCampaignMode: true,
        runSeed: ch * 97 + st,
      });
      assert.ok(pairA !== null);
      assert.equal(pairA.length, 2);
      assert.notEqual(pairA[0].id, pairA[1].id);
      assert.deepEqual(pairA, pairB);
    }
  }

  const pincer = resolveFormationDoctrineProfile('pincer_flank');
  const shield = resolveFormationDoctrineProfile('shield_wall');
  assert.ok(pincer.flankSpreadX > 1.2);
  assert.ok(shield.vanguardHpMult >= 1.2);

  const reward = applyCrossroadsRewardBonus({ gold: 1000, starDust: 40 }, 'ambush_vault');
  assert.equal(reward.gold, 1350);
  assert.equal(reward.starDust, 50);
  assert.equal(reward.bonusGold, 350);
});

test('W15-4: Deterministic Gear Set Transmutation preserves 702 LC Fresh Start, unlocks at Ch.3+, activates Set Bonus, and is hardened in saveIntegrity', () => {
  const fresh = createInitialSaveData();
  const freshStats = computePlayerStats(fresh);
  assert.equal(freshStats.powerRating, 702);

  // Locked before Chapter 2 is cleared
  const starterWeaponUid = fresh.equipped[GearSlot.WEAPON]!;
  const lockedPreview = previewGearSetTransmutation(fresh, starterWeaponUid, 'Destruction Set');
  assert.equal(lockedPreview.unlocked, false);
  assert.equal(lockedPreview.canTransmute, false);

  // Prepare an unlocked Ch.3+ account with 2 Epic items (1 Destruction, 1 Echo -> transmute Echo to Destruction for 2-piece Set Bonus!)
  const destructionTpl = Object.values(GEAR_TEMPLATES).find(
    (t) => t.setName === 'Destruction Set' && t.slot === GearSlot.WEAPON
  )!;
  const echoArmorTpl = Object.values(GEAR_TEMPLATES).find(
    (t) => t.setName === 'Echo Set' && t.slot === GearSlot.ARMOR
  )!;
  const rareRingTpl = Object.values(GEAR_TEMPLATES).find((t) => t.slot === GearSlot.RING)!;

  const epicWeapon: GearInstance = {
    uid: 'w15_epic_wpn',
    templateId: destructionTpl.templateId,
    rarity: Rarity.EPIC,
    level: 10,
  };
  const epicArmor: GearInstance = {
    uid: 'w15_epic_arm',
    templateId: echoArmorTpl.templateId,
    rarity: Rarity.EPIC,
    level: 10,
  };
  const rareRing: GearInstance = {
    uid: 'w15_rare_ring',
    templateId: rareRingTpl.templateId,
    rarity: Rarity.RARE,
    level: 5,
  };

  const unlockedSave = {
    ...fresh,
    highestChapterCleared: GEAR_SET_TRANSMUTATION_MIN_CHAPTER,
    gold: 50_000,
    starDust: 500,
    pity: {
      mythicRollsSinceEpic: 0,
      mythicRollsSinceSTier: 0,
      runeRollsSinceEpic: 0,
      forgeRelicShards: 100,
    },
    inventory: [epicWeapon, epicArmor, rareRing],
    equipped: {
      [GearSlot.WEAPON]: epicWeapon.uid,
      [GearSlot.ARMOR]: epicArmor.uid,
      [GearSlot.RING]: rareRing.uid,
    },
  };

  // Rare item must be rejected
  const rarePreview = previewGearSetTransmutation(unlockedSave, rareRing.uid, 'Destruction Set');
  assert.equal(rarePreview.canTransmute, false);

  // Before transmute: 0 active set tiers
  const beforeEval = evaluateEquippedGearSets(unlockedSave);
  assert.equal(beforeEval.activeTierCount, 0);

  // Transmute Epic Echo Armor -> Destruction Set
  const res = transmuteGearSetInSave(unlockedSave, epicArmor.uid, 'Destruction Set');
  assert.equal(res.ok, true);
  const epicCost = GEAR_SET_TRANSMUTATION_COSTS[Rarity.EPIC];
  assert.equal(res.nextSave.gold, unlockedSave.gold - epicCost.gold);
  assert.equal(res.nextSave.starDust, unlockedSave.starDust - epicCost.starDust);
  assert.equal(
    res.nextSave.pity?.forgeRelicShards,
    100 - epicCost.forgeRelicShards
  );

  const transmutedItem = res.nextSave.inventory.find((g) => g.uid === epicArmor.uid)!;
  assert.equal(resolveEffectiveGearSetId(transmutedItem), 'Destruction Set');

  // After transmute: 2-piece Destruction Set bonus is active!
  const afterEval = evaluateEquippedGearSets(res.nextSave);
  assert.ok(afterEval.activeTierCount >= 1);
  assert.ok(
    afterEval.sets.some((s) => s.setId === 'Destruction Set' && s.equippedCount === 2)
  );

  // Security Audit: forged invalid setId or low-rarity transmutedSetId is stripped by saveIntegrity
  const forgedSave = {
    ...res.nextSave,
    inventory: [
      { ...epicWeapon, transmutedSetId: 'Hacked God Set' as unknown as GearSetId },
      { ...rareRing, transmutedSetId: 'Destruction Set' as GearSetId },
    ],
  };
  const integrity = validateAndSanitizeSaveIntegrity(forgedSave);
  assert.equal(integrity.ok, false);
  assert.ok(integrity.issuesFixed.includes('inventory_bounds'));
  assert.equal(integrity.sanitizedSave.inventory[0].transmutedSetId, undefined);
  assert.equal(integrity.sanitizedSave.inventory[1].transmutedSetId, undefined);

  const sinkAudit = computeWave15TransmutationSinkAudit();
  assert.ok(sinkAudit.total100hTransmutationGoldSink > 100_000);
});

test('W15-5: Adaptive Audio Low-Pass Filter, Wave 15 SFX Priority Mixer & 12-Chapter Modal Ending Cadences', () => {
  // Low-pass filter sweep
  assert.equal(computeTimeScaleAudioFilter(false, 1.0, false), 18000);
  assert.equal(computeTimeScaleAudioFilter(true, 1.0, false), 820);
  assert.equal(computeTimeScaleAudioFilter(true, 1.0, true), 2400);

  // SFX Priority Mixer accepts new Wave 15 categories and preserves priority ordering
  assert.equal(SFX_CATEGORY_SPECS.wall_slam_impact.priority, 88);
  assert.equal(SFX_CATEGORY_SPECS.boss_weakpoint_shatter.priority, 99);

  const mixer = new SfxPriorityMixer({ lowEndMode: true });
  const slamDecision = mixer.requestPlay('wall_slam_impact', 1000, 5);
  assert.equal(slamDecision.allowed, true);
  assert.equal(slamDecision.priority, 88);

  const shatterDecision = mixer.requestPlay('boss_weakpoint_shatter', 1020);
  assert.equal(shatterDecision.allowed, true);
  assert.equal(shatterDecision.priority, 99);

  // All 12 chapters have scale-matched ascending victory and descending defeat cadences
  const uniqueVictorySignatures = new Set<string>();
  for (let ch = 1; ch <= 12; ch++) {
    const win = resolveChapterEndingCadence(ch, true);
    const lose = resolveChapterEndingCadence(ch, false);
    assert.equal(win.chapterId, ch);
    assert.equal(win.notes.length, 4);
    assert.ok(win.notes[3].freq > win.notes[0].freq);
    assert.equal(lose.notes.length, 4);
    assert.ok(lose.notes[3].freq < lose.notes[0].freq);
    uniqueVictorySignatures.add(win.notes.map((n) => n.freq.toFixed(1)).join(','));
  }
  assert.ok(uniqueVictorySignatures.size >= 10);
});

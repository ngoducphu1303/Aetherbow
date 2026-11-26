import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  computePlayerStats,
  createInitialSaveData,
  GEAR_TEMPLATES,
  getGearPowerScore,
} from '../data/gearData';
import { validateAndSanitizeSaveIntegrity } from '../data/saveIntegrity';
import {
  applyMythicImprint,
  computeSmartUpgradeRoi,
  computeSnapshotChecksum,
  computeWave17MythicImprintSinkAudit,
  MYTHIC_IMPRINT_MAX_TIER,
  previewMythicImprint,
  pushSaveRollbackSnapshot,
  restoreSaveRollbackSnapshot,
  SAVE_ROLLBACK_MAX_SNAPSHOTS,
  type SaveRollbackVaultEntry,
} from '../data/wave17EndgameAndBackup';
import {
  buildInterruptCounterSurgeHud,
  createInterruptCounterSurgeState,
  enforceZeroBossPracticeRewards,
  getBossPracticeCatalog,
  getInterruptSurgeBossDamageMult,
  INTERRUPT_SURGE_DURATION_SEC,
  isBossPracticeChapterUnlocked,
  resolveBossPracticeConfig,
  stepInterruptCounterSurge,
  triggerInterruptCounterSurge,
} from './wave17CombatAndPractice';
import {
  countScenePointLights,
  HeroAndBossSignatureVfxPool,
} from './heroAndBossSignatureVfx';
import { GearSlot, Rarity, type SaveData } from '../types/game';

test('W17-1: Boss Interrupt Counter-Surge trims active CD (-35%), grants +18 Ult, applies +25% Boss mult, and decays Zero-GC', () => {
  const surge = createInterruptCounterSurgeState();
  assert.equal(surge.active, false);
  assert.equal(getInterruptSurgeBossDamageMult(surge, true), 1.0);

  // Non-boss interrupt must NOT trigger Boss Counter-Surge
  const nonBoss = triggerInterruptCounterSurge(surge, {
    isBoss: false,
    currentActiveSkillCooldown: 10,
    currentUltCharge: 40,
  });
  assert.equal(nonBoss.triggered, false);
  assert.equal(nonBoss.nextActiveSkillCooldown, 10);
  assert.equal(nonBoss.nextUltCharge, 40);
  assert.equal(surge.active, false);

  // Boss interrupt triggers full Counter-Surge and respects reducedMotion pulse scaling
  const bossTrigger = triggerInterruptCounterSurge(surge, {
    isBoss: true,
    currentActiveSkillCooldown: 10,
    currentUltCharge: 90,
    reducedMotion: true,
  });
  assert.equal(bossTrigger.triggered, true);
  assert.equal(bossTrigger.nextActiveSkillCooldown, 6.5);
  assert.equal(bossTrigger.nextUltCharge, 100);
  assert.equal(bossTrigger.ultGained, 10);
  assert.equal(bossTrigger.bossWeakpointBonusPct, 25);
  assert.equal(bossTrigger.pulseScale, 0.35);
  assert.equal(surge.active, true);
  assert.equal(surge.remainingSec, INTERRUPT_SURGE_DURATION_SEC);
  assert.equal(getInterruptSurgeBossDamageMult(surge, true), 1.25);
  assert.equal(getInterruptSurgeBossDamageMult(surge, false), 1.0);

  const hud = buildInterruptCounterSurgeHud(surge);
  assert.ok(hud && hud.active && hud.bossWeakpointBonusPct === 25);

  // Step through full duration without allocating a replacement state object
  const sameRef = surge;
  for (let i = 0; i < 40; i++) {
    stepInterruptCounterSurge(surge, 0.1);
  }
  assert.equal(surge, sameRef);
  assert.equal(surge.active, false);
  assert.equal(surge.remainingSec, 0);
  assert.equal(getInterruptSurgeBossDamageMult(surge, true), 1.0);
  assert.equal(buildInterruptCounterSurgeHud(surge), null);
});

test('W17-2: interrupt_surge VFX maintains 0 PointLights & Lite cap <= 3; Boss Practice locks 12-chapter unlock & 0 farm rewards', () => {
  const scene = new THREE.Scene();
  const pool = new HeroAndBossSignatureVfxPool(scene, true);
  for (let i = 0; i < 6; i++) {
    pool.spawnTacticalImpactVfx({
      kind: 'interrupt_surge',
      x: i * 1.1,
      z: -2.0,
      options: {
        liteActive: true,
        reducedMotion: false,
        reduceScreenFlash: true,
        colorblindTelegraphs: true,
      },
    });
  }
  assert.equal(countScenePointLights(scene), 0, 'interrupt_surge VFX must spawn strictly 0 PointLights');
  assert.ok(pool.getActiveBurstCount() <= 3, 'Lite VFX pool must stay capped at <= 3 active slots');
  pool.step(0.15, 1.0);
  pool.dispose();

  // Boss Practice 12-chapter unlock gates
  const ch0Catalog = getBossPracticeCatalog(0);
  assert.equal(ch0Catalog.length, 12);
  assert.equal(ch0Catalog.filter((e) => e.unlocked).length, 1);
  assert.equal(isBossPracticeChapterUnlocked(1, 0), true);
  assert.equal(isBossPracticeChapterUnlocked(2, 0), false);

  const ch5Catalog = getBossPracticeCatalog(5);
  assert.equal(ch5Catalog.filter((e) => e.unlocked).length, 6);
  assert.equal(isBossPracticeChapterUnlocked(12, 12), true);

  const cfg = resolveBossPracticeConfig(6, 4200);
  assert.equal(cfg.chapterId, 6);
  assert.equal(cfg.zeroRewardLocked, true);
  assert.ok(cfg.bossHp > 10000);

  // Strict 0-farm reward lock
  const locked = enforceZeroBossPracticeRewards({
    gold: 99999,
    gems: 500,
    forgeShards: 40,
    xp: 50000,
    lootDroppedCount: 12,
    questProgressDelta: 3,
    careerBossKillsDelta: 1,
  });
  assert.deepEqual(locked, {
    gold: 0,
    gems: 0,
    forgeShards: 0,
    xp: 0,
    lootDroppedCount: 0,
    questProgressDelta: 0,
    careerBossKillsDelta: 0,
  });
});

test('W17-3: Mythic Zodiac Imprint enforces Ch.4+ & MYTHIC gate, raises real LC, sanitizes tampered saves, and keeps Fresh 702 LC intact', () => {
  const fresh = createInitialSaveData();
  assert.equal(
    computePlayerStats(fresh).powerRating,
    702,
    'Fresh account baseline must strictly remain 702 LC'
  );

  // Build an endgame test save with a real Mythic weapon & Epic armor from GEAR_TEMPLATES
  const weaponTplId = Object.entries(GEAR_TEMPLATES).find(([, t]) => t.slot === GearSlot.WEAPON)![0];
  const armorTplId = Object.entries(GEAR_TEMPLATES).find(([, t]) => t.slot === GearSlot.ARMOR)![0];
  const mythicWeaponUid = 'w17_mythic_bow_1';
  const epicArmorUid = 'w17_epic_armor_1';
  const baseSave: SaveData = {
    ...fresh,
    highestChapterCleared: 3,
    gold: 500000,
    starDust: 50000,
    spiritCores: 5000,
    pity: {
      mythicRollsSinceEpic: fresh.pity?.mythicRollsSinceEpic ?? 0,
      mythicRollsSinceSTier: fresh.pity?.mythicRollsSinceSTier ?? 0,
      runeRollsSinceEpic: fresh.pity?.runeRollsSinceEpic ?? 0,
      ...(fresh.pity ?? {}),
      forgeRelicShards: 5000,
    },
    inventory: [
      ...fresh.inventory,
      {
        uid: mythicWeaponUid,
        templateId: weaponTplId,
        rarity: Rarity.MYTHIC,
        level: 35,
      },
      {
        uid: epicArmorUid,
        templateId: armorTplId,
        rarity: Rarity.EPIC,
        level: 20,
      },
    ],
    equipped: {
      ...fresh.equipped,
      [GearSlot.WEAPON]: mythicWeaponUid,
      [GearSlot.ARMOR]: epicArmorUid,
    },
  };

  // Blocked before Ch.4
  const blockedCh3 = previewMythicImprint(baseSave, mythicWeaponUid, 'solar_sunder');
  assert.equal(blockedCh3.eligible, false);

  // Unlock Ch.4
  let workingSave: SaveData = { ...baseSave, highestChapterCleared: 4 };

  // Blocked on non-Mythic gear
  const blockedEpic = previewMythicImprint(workingSave, epicArmorUid, 'jade_aegis');
  assert.equal(blockedEpic.eligible, false);

  // Upgrade Mythic weapon +1 -> +5 and verify power & score climb deterministically
  const basePower = computePlayerStats(workingSave).powerRating;
  const baseGearScore = getGearPowerScore(
    workingSave.inventory.find((g) => g.uid === mythicWeaponUid)!
  );

  for (let expectedTier = 1; expectedTier <= MYTHIC_IMPRINT_MAX_TIER; expectedTier++) {
    const res = applyMythicImprint(workingSave, mythicWeaponUid, 'solar_sunder');
    assert.equal(res.ok, true, `Tier +${expectedTier} imprint must succeed`);
    assert.ok(res.powerDelta > 0, `Tier +${expectedTier} must raise player powerRating`);
    workingSave = res.save;
    const item = workingSave.inventory.find((g) => g.uid === mythicWeaponUid)!;
    assert.equal(item.mythicImprint?.tier, expectedTier);
    assert.equal(item.mythicImprint?.aspectId, 'solar_sunder');
  }

  const maxPower = computePlayerStats(workingSave).powerRating;
  const maxGearScore = getGearPowerScore(
    workingSave.inventory.find((g) => g.uid === mythicWeaponUid)!
  );
  assert.ok(maxPower > basePower);
  assert.ok(maxGearScore > baseGearScore);

  // Cannot exceed +5 on same aspect
  const capped = applyMythicImprint(workingSave, mythicWeaponUid, 'solar_sunder');
  assert.equal(capped.ok, false);

  // saveIntegrity strips forged imprint from non-Mythic gear and clamps tier 99 -> 5
  const tampered: SaveData = {
    ...workingSave,
    inventory: workingSave.inventory.map((g) => {
      if (g.uid === epicArmorUid) {
        return { ...g, mythicImprint: { aspectId: 'solar_sunder', tier: 5 } };
      }
      if (g.uid === mythicWeaponUid) {
        return { ...g, mythicImprint: { aspectId: 'solar_sunder', tier: 99 } };
      }
      return g;
    }),
  };
  const integrity = validateAndSanitizeSaveIntegrity(tampered);
  const cleanEpic = integrity.sanitizedSave.inventory.find((g) => g.uid === epicArmorUid)!;
  const cleanMythic = integrity.sanitizedSave.inventory.find((g) => g.uid === mythicWeaponUid)!;
  assert.equal(cleanEpic.mythicImprint, undefined, 'Non-Mythic forged imprint must be stripped');
  assert.equal(cleanMythic.mythicImprint?.tier, 5, 'Out-of-range Mythic imprint tier must clamp to 5');

  // Sink audit returns positive endgame numbers
  const sinkAudit = computeWave17MythicImprintSinkAudit();
  assert.ok(sinkAudit.full6SlotGoldSink > 300000);
  assert.ok(sinkAudit.full6SlotSpiritCoresSink > 500);
});

test('W17-4: Smart Upgrade ROI Advisor ranks top upgrades by +LC/1,000 Gold without mutating save', () => {
  const fresh = createInitialSaveData();
  const snapshotBefore = JSON.stringify(fresh);
  const roiFresh = computeSmartUpgradeRoi(fresh, 3);
  assert.equal(JSON.stringify(fresh), snapshotBefore, 'computeSmartUpgradeRoi must be strictly read-only');
  assert.equal(computePlayerStats(fresh).powerRating, 702);
  assert.ok(roiFresh.length >= 1 && roiFresh.length <= 3);
  for (let i = 1; i < roiFresh.length; i++) {
    assert.ok(
      roiFresh[i - 1].lcPer1000Gold >= roiFresh[i].lcPer1000Gold,
      'ROI entries must be sorted descending by lcPer1000Gold'
    );
  }
  assert.ok(roiFresh.every((e) => e.estimatedLcGain > 0 && e.lcPer1000Gold > 0));
});

test('W17-5: Automatic Save Rollback Vault enforces max 5 ring-buffer, FNV-1a tamper detection, and integrity restore', () => {
  const fresh = createInitialSaveData();
  let vault: SaveRollbackVaultEntry[] = [];

  for (let i = 1; i <= 7; i++) {
    const saveVariant: SaveData = {
      ...fresh,
      highestChapterCleared: i,
      gold: i * 1000,
    };
    vault = pushSaveRollbackSnapshot(vault, saveVariant, 'manual', 1_700_000_000_000 + i * 1000);
  }

  assert.equal(
    vault.length,
    SAVE_ROLLBACK_MAX_SNAPSHOTS,
    'Rollback vault must stay strictly bounded to 5 snapshots'
  );
  assert.equal(vault[0].meta.highestChapterCleared, 7, 'Newest snapshot must be first');
  assert.equal(vault[4].meta.highestChapterCleared, 3, 'Oldest retained snapshot must be Ch.3');

  // Valid restore succeeds cleanly
  const targetId = vault[1].meta.id;
  const restored = restoreSaveRollbackSnapshot(vault, targetId);
  assert.equal(restored.ok, true);
  assert.equal(restored.save?.highestChapterCleared, 6);
  assert.equal(restored.save?.gold, 6000);

  // Tampered JSON payload is rejected by FNV-1a checksum mismatch
  const tamperedVault: SaveRollbackVaultEntry[] = vault.map((entry, idx) =>
    idx === 0
      ? {
          ...entry,
          payloadJson: entry.payloadJson.replace('"gold":7000', '"gold":99999999'),
        }
      : entry
  );
  assert.notEqual(
    computeSnapshotChecksum(tamperedVault[0].payloadJson),
    tamperedVault[0].meta.checksum
  );
  const rejected = restoreSaveRollbackSnapshot(tamperedVault, tamperedVault[0].meta.id);
  assert.equal(rejected.ok, false);
  assert.ok(rejected.error && rejected.error.includes('FNV-1a'));
});

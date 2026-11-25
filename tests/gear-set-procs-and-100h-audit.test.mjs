import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSaveData, evaluateEquippedGearSets } from '../src/data/gearData.ts';
import {
  ACHIEVEMENTS_CATALOG,
  getAchievementCurrentValue,
  normalizeCareer,
} from '../src/data/liveOpsData.ts';
import { validateAndSanitizeSaveIntegrity } from '../src/data/saveIntegrity.ts';
import {
  createGearSetProcRuntime,
  evaluateGearSetProcEvent,
  GEAR_SET_COMBAT_PROCS,
  resolveActiveGearSetProcs,
  stepGearSetProcCooldowns,
} from '../src/engine/gearSetCombatProcs.ts';
import {
  evaluateFirstHourRoadmap,
  evaluatePass3EconomyAndSetBalance,
} from '../src/data/onboardingAndMasteryData.ts';
import { GearSlot, Rarity } from '../src/types/game.ts';

test('All 5 Mid-to-Endgame Gear Sets trigger Unique Combat Procs with ICD gating while Starter Set has 0 procs', () => {
  const freshSave = createInitialSaveData();
  const freshSets = evaluateEquippedGearSets(freshSave);
  assert.equal(resolveActiveGearSetProcs(freshSets.sets).length, 0);

  // Destruction Set 2pc triggers on 4th crit and enforces ICD
  const destRuntime = createGearSetProcRuntime([
    {
      setId: 'Destruction Set',
      displayName: 'Bộ Hủy Diệt',
      accentColor: '#f97316',
      equippedCount: 2,
      maxPieces: 2,
      unlockedTiers: [{ piecesRequired: 2, label: '+10% ATK' }],
    },
  ]);
  assert.equal(evaluateGearSetProcEvent(destRuntime, 'crit_hit'), null);
  assert.equal(evaluateGearSetProcEvent(destRuntime, 'crit_hit'), null);
  assert.equal(evaluateGearSetProcEvent(destRuntime, 'crit_hit'), null);
  const proc = evaluateGearSetProcEvent(destRuntime, 'crit_hit');
  assert.ok(proc && proc.procId === 'destruction_nova');
  assert.ok(proc.aoeDamageAtkMult >= 1.3 && proc.aoeRadius >= 3.5);

  // On cooldown: cannot fire even after 4 more crits until ICD expires
  for (let i = 0; i < 4; i++) {
    assert.equal(evaluateGearSetProcEvent(destRuntime, 'crit_hit'), null);
  }
  stepGearSetProcCooldowns(destRuntime, GEAR_SET_COMBAT_PROCS['Destruction Set'].internalCooldownSec + 0.1);
  // Needs 4 fresh crits after cooldown
  let fired = null;
  for (let i = 0; i < 4; i++) {
    fired = evaluateGearSetProcEvent(destRuntime, 'crit_hit');
  }
  assert.ok(fired && fired.procId === 'destruction_nova');

  // Verify remaining 4 mid-to-endgame sets fire their unique combat procs
  const echoRuntime = createGearSetProcRuntime([
    {
      setId: 'Echo Set',
      displayName: 'Bộ Vọng Âm',
      accentColor: '#c084fc',
      equippedCount: 2,
      maxPieces: 3,
      unlockedTiers: [{ piecesRequired: 2, label: '+10% ASPD' }],
    },
  ]);
  let echoProc = null;
  for (let i = 0; i < 5; i++) echoProc = evaluateGearSetProcEvent(echoRuntime, 'basic_volley');
  assert.ok(echoProc && echoProc.procId === 'echo_phantom_volley' && echoProc.extraPierceArrowAtkMult >= 0.85);

  const dragonRuntime = createGearSetProcRuntime([
    {
      setId: 'Dragon Knight Set',
      displayName: 'Bộ Long Kỵ [S]',
      accentColor: '#f59e0b',
      equippedCount: 2,
      maxPieces: 3,
      unlockedTiers: [{ piecesRequired: 2, label: '+12% HP' }],
    },
  ]);
  const dragonProc = evaluateGearSetProcEvent(dragonRuntime, 'perfect_dodge');
  assert.ok(dragonProc && dragonProc.procId === 'dragon_knight_aegis' && dragonProc.shieldMaxHpPct >= 0.14);

  const oracleRuntime = createGearSetProcRuntime([
    {
      setId: 'Oracle Set',
      displayName: 'Bộ Tiên Tri Oracle [S]',
      accentColor: '#38bdf8',
      equippedCount: 2,
      maxPieces: 3,
      unlockedTiers: [{ piecesRequired: 2, label: '+12% ASPD' }],
    },
  ]);
  const oracleProc = evaluateGearSetProcEvent(oracleRuntime, 'cast_interrupt');
  assert.ok(oracleProc && oracleProc.procId === 'oracle_astral_surge' && oracleProc.ultChargeGain >= 0.12);

  const griffinRuntime = createGearSetProcRuntime([
    {
      setId: 'Griffin Set',
      displayName: 'Bộ Điểu Sư [S]',
      accentColor: '#34d399',
      equippedCount: 2,
      maxPieces: 2,
      unlockedTiers: [{ piecesRequired: 2, label: '+10% Crit' }],
    },
  ]);
  const griffinProc = evaluateGearSetProcEvent(griffinRuntime, 'dash_used');
  assert.ok(griffinProc && griffinProc.procId === 'griffin_gale_stride' && griffinProc.tempMoveSpeedBonus >= 0.2);
});

test('3-piece S-Tier Gear Sets empower Unique Combat Procs over 2-piece versions', () => {
  const twoPc = resolveActiveGearSetProcs([
    {
      setId: 'Oracle Set',
      displayName: 'Bộ Tiên Tri Oracle [S]',
      accentColor: '#38bdf8',
      equippedCount: 2,
      maxPieces: 3,
      unlockedTiers: [{ piecesRequired: 2, label: '+12% ASPD' }],
    },
  ]);
  const threePc = resolveActiveGearSetProcs([
    {
      setId: 'Oracle Set',
      displayName: 'Bộ Tiên Tri Oracle [S]',
      accentColor: '#38bdf8',
      equippedCount: 3,
      maxPieces: 3,
      unlockedTiers: [
        { piecesRequired: 2, label: '+12% ASPD' },
        { piecesRequired: 3, label: '+16% ATK' },
      ],
    },
  ]);
  assert.equal(twoPc.length, 1);
  assert.equal(threePc.length, 1);
  assert.ok(threePc[0].ultChargeGain > twoPc[0].ultChargeGain);
});

test('First 60-Minute Roadmap and Long-Term Mastery Achievements track real save progress & sanitize safely', () => {
  const save = createInitialSaveData();
  const initialFtue = evaluateFirstHourRoadmap(save);
  assert.equal(initialFtue.totalCount, 4);
  assert.equal(initialFtue.completedCount, 0);
  assert.equal(initialFtue.nextMilestone?.id, 'ftue_5m');

  // Simulate completing 5m & 15m & 30m & 60m milestones
  save.career = {
    ...normalizeCareer(save.career),
    totalKills: 45,
    arenaMechanismsTriggered: 16,
    bossInterruptsTotal: 12,
    setProcsTriggered: 30,
  };
  save.inventory.push({
    uid: 'test_rare_1',
    templateId: 'rusty_bow',
    rarity: Rarity.RARE,
    level: 4,
  });
  save.equipped[GearSlot.WEAPON] = 'test_rare_1';
  save.highestChapterCleared = 1;
  save.bestTowerFloor = 3;
  save.discoveredEvolutions = ['fire_solar_lance', 'ice_frostbite_piercer', 'multi_focus_barrage'];

  const fullFtue = evaluateFirstHourRoadmap(save);
  assert.equal(fullFtue.completedCount, 4);
  assert.equal(fullFtue.nextMilestone, null);

  assert.equal(getAchievementCurrentValue(save, 'arenaMechanismsTriggered'), 16);
  assert.equal(getAchievementCurrentValue(save, 'bossInterruptsTotal'), 12);
  assert.equal(getAchievementCurrentValue(save, 'setProcsTriggered'), 30);
  assert.equal(getAchievementCurrentValue(save, 'discoveredEvolutions'), 3);
  assert.ok(ACHIEVEMENTS_CATALOG.length >= 18);

  // Corrupted negative career values get safely repaired
  const corrupted = {
    ...save,
    career: {
      ...normalizeCareer(save.career),
      arenaMechanismsTriggered: -9,
      bossInterruptsTotal: Number.NaN,
      setProcsTriggered: 9_999_999,
    },
  };
  const report = validateAndSanitizeSaveIntegrity(corrupted);
  assert.equal(report.ok, false);
  assert.equal(report.sanitizedSave.career?.arenaMechanismsTriggered, 0);
  assert.equal(report.sanitizedSave.career?.bossInterruptsTotal, 0);
  assert.equal(report.sanitizedSave.career?.setProcsTriggered, 1_000_000);
});

test('Pass 3 100-Hour Economy & Gear-Set Balance Audit preserves 702 CP start, fair procs, and healthy sinks', () => {
  const audit = evaluatePass3EconomyAndSetBalance();
  assert.equal(audit.freshAccountPowerRating, 702);
  assert.equal(audit.freshAccountActiveSetProcs, 0);
  assert.equal(audit.gearSetProcCount, 5);
  assert.equal(audit.setProcsBalanced, true);
  assert.equal(audit.journey100hMilestonesCount, 8);
  assert.equal(audit.flashDealArbitrageDetected, false);
  assert.equal(audit.chapter12TtkHealthy, true);
  assert.equal(audit.skillBuildsBalanced, true);
  assert.ok(audit.totalEndgameGoldSink > audit.hour100GoldEarned, 'Endgame gold sinks must prevent 100h inflation');
});

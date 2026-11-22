import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialSaveData, computePlayerStats } from './gearData';
import { getTodayKey } from './questsData';
import {
  CHAMPIONSHIP_CUP_MILESTONES,
  CODEX_COLLECTION_RANKS,
  FESTIVAL_MILESTONES,
  MAX_DAILY_CHAMPIONSHIP_RUNS,
  canClaimWeekendPassDaily,
  computeCodexSummary,
  countClaimableChampionshipMilestones,
  countClaimableCodexRanks,
  countClaimableFestivalRewards,
  evaluateMatchMvpReport,
  formatCountdownHMS,
  getEvolvedPetMultiplier,
  getFestivalQuestProgress,
  getFlashSaleSecondsRemaining,
  getSpiritBeastFormName,
  normalizeChampionshipState,
  normalizeFestivalState,
  normalizeWeekendPrivilege,
} from './wave11Data';

test('Codex Collection ranks compute points accurately and permanently boost computePlayerStats', () => {
  const baseSave = createInitialSaveData();
  const baseSummary = computeCodexSummary(baseSave);
  const baseStats = computePlayerStats(baseSave);

  // Add heroes, evolved pet, wings, artifacts, halos, and sky theme to climb Codex ranks
  const richSave = createInitialSaveData();
  richSave.unlockedHeroes = ['artemis', 'hatsune_miku'];
  richSave.heroStars = {
    ...richSave.heroStars,
    artemis: 5,
    hatsune_miku: 5,
  };
  richSave.pets = [{ petId: 'astraeo', level: 4 }];
  richSave.evolvedPets = ['astraeo'];
  richSave.unlockedWings = ['solar_zenith'];
  richSave.unlockedArtifacts = ['astrolabe_regulus'];
  richSave.unlockedHalos = ['leo_sovereign'];
  richSave.unlockedSkyThemes = ['golden_galaxy', 'dawn_sanctum', 'lunar_eclipse'];
  richSave.codexClaimedRanks = [];

  const richSummary = computeCodexSummary(richSave);
  assert.ok(richSummary.totalPoints > baseSummary.totalPoints);
  assert.ok(richSummary.currentRank.rank >= 3);
  assert.ok(richSummary.totalAtkPct > baseSummary.totalAtkPct);
  assert.ok(richSummary.totalHpPct > baseSummary.totalHpPct);
  assert.ok(richSummary.totalCrit > baseSummary.totalCrit);

  const claimable = countClaimableCodexRanks(richSave);
  assert.equal(claimable, richSummary.currentRank.rank);

  // Claim rank 1 & verify count drops by 1
  richSave.codexClaimedRanks = [CODEX_COLLECTION_RANKS[0].rank];
  assert.equal(countClaimableCodexRanks(richSave), claimable - 1);

  // Verify permanent Codex stat buffs flow into computePlayerStats even without equipping the extras
  const richStats = computePlayerStats(richSave);
  assert.ok(richStats.attack > baseStats.attack);
  assert.ok(richStats.maxHp > baseStats.maxHp);
  assert.ok(richStats.critChance > baseStats.critChance);
  assert.ok(richStats.powerRating > baseStats.powerRating);
});

test('3D Spirit Beast Evolution multiplies pet power and boosts equipped player stats', () => {
  const baseMult = getEvolvedPetMultiplier(false);
  const evolvedMult = getEvolvedPetMultiplier(true);
  assert.equal(baseMult.atkMult, 1);
  assert.equal(baseMult.critBonus, 0);
  assert.ok(evolvedMult.atkMult > 1.5);
  assert.ok(evolvedMult.hpMult > 1.5);
  assert.ok(evolvedMult.critBonus > 0);
  assert.ok(evolvedMult.fireRateMult < 1);

  assert.equal(
    getSpiritBeastFormName('astraeo', false, 'Astraeo · Sư Tử Tinh Linh'),
    'Astraeo · Sư Tử Tinh Linh'
  );
  assert.ok(
    getSpiritBeastFormName('astraeo', true, 'Astraeo · Sư Tử Tinh Linh').includes('Tiến Hóa')
  );

  const save = createInitialSaveData();
  save.pets = [{ petId: 'astraeo', level: 3 }];
  save.equippedPetId = 'astraeo';
  save.evolvedPets = [];
  const beforeStats = computePlayerStats(save);

  save.evolvedPets = ['astraeo'];
  const afterStats = computePlayerStats(save);

  assert.ok(afterStats.attack > beforeStats.attack);
  assert.ok(afterStats.maxHp > beforeStats.maxHp);
  assert.ok(afterStats.critChance > beforeStats.critChance);
  assert.equal(afterStats.equippedPetEvolved, true);
});

test('Celestial Festival tracks quest metrics, milestones, and claimable badges', () => {
  const save = createInitialSaveData();
  save.career = {
    totalRuns: 2,
    totalKills: 45,
    totalBossesKilled: 1,
    maxComboEver: 12,
    totalChestsOpened: 0,
    seenEnemies: [],
    seenSkills: [],
  };
  save.festivalState = normalizeFestivalState({
    ...save.festivalState,
    lanterns: FESTIVAL_MILESTONES[1].lanternsTarget,
    claimedQuestIds: [],
    claimedMilestones: [FESTIVAL_MILESTONES[0].lanternsTarget],
  });

  assert.equal(getFestivalQuestProgress(save, 'runs'), 2);
  assert.equal(getFestivalQuestProgress(save, 'kills'), 45);
  // Runs >= 1 (1 quest), Kills >= 30 (1 quest), plus 1 unclaimed milestone (100 lanterns)
  assert.ok(countClaimableFestivalRewards(save) >= 3);
});

test('3-Round Championship normalizes daily attempts (VIP bonus) and counts cup milestones', () => {
  const normal = normalizeChampionshipState(undefined, false);
  const vip = normalizeChampionshipState(undefined, true);
  assert.equal(normal.dailyRunsRemaining, MAX_DAILY_CHAMPIONSHIP_RUNS);
  assert.equal(vip.dailyRunsRemaining, MAX_DAILY_CHAMPIONSHIP_RUNS + 1);

  const save = createInitialSaveData();
  save.championship = normalizeChampionshipState(
    {
      date: getTodayKey(),
      dailyRunsRemaining: 2,
      gloryTrophies: CHAMPIONSHIP_CUP_MILESTONES[1].trophiesTarget,
      bestRoundCleared: 3,
      championshipTitlesWon: 2,
      claimedCupMilestones: [CHAMPIONSHIP_CUP_MILESTONES[0].trophiesTarget],
    },
    false
  );
  // Trophies qualify for milestone 0 (claimed) & milestone 1 (unclaimed) => 1
  assert.equal(countClaimableChampionshipMilestones(save), 1);
});

test('Weekend Golden Privilege daily claim and Flash Sale countdown formatter work accurately', () => {
  const save = createInitialSaveData();
  save.weekendPass = normalizeWeekendPrivilege({
    passActive: true,
    daysRemaining: 3,
    lastClaimDate: '',
    purchasedPackIds: ['wk_golden_pass'],
  });
  assert.equal(canClaimWeekendPassDaily(save), true);

  save.weekendPass.lastClaimDate = getTodayKey();
  assert.equal(canClaimWeekendPassDaily(save), false);

  assert.equal(formatCountdownHMS(3661), '01:01:01');
  assert.equal(formatCountdownHMS(0), '00:00:00');
  const rem = getFlashSaleSecondsRemaining(Date.now());
  assert.ok(rem >= 1 && rem <= 4 * 3600);
});

test('Post-match MVP report grades Victory SSS/SS and suggests smart recovery on Defeat', () => {
  const winReport = evaluateMatchMvpReport({
    isVictory: true,
    kills: 42,
    maxCombo: 35,
    damageBreakdown: {
      basic: 12000,
      ultimate: 28000,
      pet: 9500,
      elemental: 6000,
      peakCrit: 4200,
      elapsedSeconds: 40,
    },
  });
  assert.equal(winReport.grade, 'SSS');
  assert.equal(winReport.recoveryHint.target, 'festival');

  const defeatLowPet = evaluateMatchMvpReport({
    isVictory: false,
    kills: 8,
    maxCombo: 6,
    damageBreakdown: {
      basic: 6000,
      ultimate: 1500,
      pet: 200,
      elemental: 500,
      peakCrit: 850,
      elapsedSeconds: 30,
    },
  });
  assert.equal(defeatLowPet.recoveryHint.target, 'pets');

  const defeatHighPet = evaluateMatchMvpReport({
    isVictory: false,
    kills: 10,
    maxCombo: 8,
    damageBreakdown: {
      basic: 4000,
      ultimate: 1000,
      pet: 2500,
      elemental: 500,
      peakCrit: 720,
      elapsedSeconds: 30,
    },
  });
  assert.equal(defeatHighPet.recoveryHint.target, 'gear');
});

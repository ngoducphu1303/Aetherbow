import assert from 'node:assert/strict';
import test from 'node:test';
import { computePlayerStats, createInitialSaveData } from './gearData';
import { analyzeCombatPower, previewLobbyClaimAll } from './wave12Data';
import {
  ASTRAL_BOARD_LAP_MILESTONES,
  ASTRAL_BOARD_SIZE,
  ASTRAL_BOARD_TILES,
  CELESTIAL_WING_DEFS,
  GUILD_DAILY_BOSS_CHESTS,
  GUILD_MONUMENT_DEFS,
  MYTHIC_SHARD_OFFERS,
  ROYAL_3D_TITLE_DEFS,
  SANCTUARY_FLOOR_DEFS,
  SKY_CITADEL_MILESTONES,
  ZODIAC_RELIC_DEFS,
  computeGuildSanctuaryBonuses,
  computeRoyal3DTitleBonuses,
  computeZodiacRelicBonuses,
  countClaimableAstralBoardRewards,
  countClaimableGuildSanctuaryRewards,
  countClaimableSkyCitadelMilestones,
  getCelestialWingStats,
  getCelestialWingUpgradeCost,
  normalizeAstralBoard,
  normalizeGuildSanctuary,
  normalizeSkyCitadel,
  resolveAstralBoardRoll,
} from './wave14Data';

test('Wave 14: Legacy Celestial Wings are retired cleanly and stat/cost helpers stay safe', () => {
  assert.equal(CELESTIAL_WING_DEFS.length, 0);

  assert.deepEqual(getCelestialWingStats('sovereign_aurora', 5), {
    atkPct: 0,
    hpPct: 0,
    aspd: 0,
    crit: 0,
  });

  const cost1 = getCelestialWingUpgradeCost(1);
  const cost4 = getCelestialWingUpgradeCost(4);
  assert.ok(cost4.feathers > cost1.feathers);
  assert.ok(cost4.gold > cost1.gold);

  const empty = getCelestialWingStats(null, 3);
  assert.deepEqual(empty, { atkPct: 0, hpPct: 0, aspd: 0, crit: 0 });
});

test('Wave 14: Astral Dice Board 16-tile wrap-around, pass-start Gems, and x2 next step', () => {
  assert.equal(ASTRAL_BOARD_TILES.length, ASTRAL_BOARD_SIZE);

  // Land on tile 5 (double_next) from position 1 with 4 steps
  let board = normalizeAstralBoard({ position: 1, lapsCompleted: 0, doubleNext: false, totalRolls: 0 });
  const rDouble = resolveAstralBoardRoll(board, 4);
  assert.equal(rDouble.nextState.position, 5);
  assert.equal(rDouble.tile.kind, 'double_next');
  assert.equal(rDouble.nextState.doubleNext, true);
  assert.equal(rDouble.rewardGold, 250);

  // Next roll 3 steps -> tile 8 (jackpot), doubled!
  board = rDouble.nextState;
  const rJackpot = resolveAstralBoardRoll(board, 3);
  assert.equal(rJackpot.nextState.position, 8);
  assert.equal(rJackpot.tile.kind, 'jackpot');
  assert.equal(rJackpot.multiplier, 2);
  assert.equal(rJackpot.nextState.doubleNext, false);
  assert.equal(rJackpot.rewardGems, ASTRAL_BOARD_TILES[8].amount * 2);
  assert.equal(rJackpot.rewardMythicShards, 12);
  assert.equal(rJackpot.rewardRelicEssence, 16);

  // Wrap around from position 14 with 4 steps -> position 2 (feathers) + pass-start 60 Gems
  board = normalizeAstralBoard({ position: 14, lapsCompleted: 0, doubleNext: false, totalRolls: 2 });
  const rWrap = resolveAstralBoardRoll(board, 4);
  assert.equal(rWrap.passedStart, true);
  assert.equal(rWrap.nextState.position, 2);
  assert.equal(rWrap.nextState.lapsCompleted, 1);
  assert.equal(rWrap.rewardGems, 60);
  assert.equal(rWrap.rewardFeathers, ASTRAL_BOARD_TILES[2].amount);
});

test('Wave 14: Zodiac Relics, Guild Sanctuary, and Royal 3D Titles boost computePlayerStats', () => {
  assert.equal(ZODIAC_RELIC_DEFS.length, 6);
  assert.equal(GUILD_MONUMENT_DEFS.length, 4);
  assert.equal(ROYAL_3D_TITLE_DEFS.length, 5);
  assert.equal(SANCTUARY_FLOOR_DEFS.length, 4);
  assert.equal(MYTHIC_SHARD_OFFERS.length, 5);

  const base = createInitialSaveData();
  const baseStats = computePlayerStats(base);

  const boosted = createInitialSaveData();
  boosted.zodiacRelics = {
    essence: 20,
    levels: {
      relic_aries_horn: 3,
      relic_sagittarius_bow: 4,
      relic_aquarius_chalice: 2,
    },
  };
  boosted.guildSanctuary = {
    ...normalizeGuildSanctuary(boosted.guildSanctuary),
    monumentLevels: {
      citadel_hall: 5,
      astral_forge: 4,
      star_spire: 3,
      guild_vault: 3,
    },
  };
  boosted.unlockedRoyal3DTitles = ['title_sky_sovereign', 'title_aurora_seraph'];
  boosted.equippedRoyal3DTitleId = 'title_aurora_seraph';

  const relicBonuses = computeZodiacRelicBonuses(boosted.zodiacRelics);
  assert.equal(relicBonuses.unlockedCount, 3);
  assert.equal(relicBonuses.totalStars, 9);
  assert.ok(relicBonuses.atkPct > 0.2);

  const guildBonuses = computeGuildSanctuaryBonuses(boosted.guildSanctuary);
  assert.equal(guildBonuses.totalLevel, 15);
  assert.ok(guildBonuses.atkPct > 0.2);

  const titleBonuses = computeRoyal3DTitleBonuses(boosted);
  assert.equal(titleBonuses.activeDef?.id, 'title_aurora_seraph');
  assert.ok(titleBonuses.atk > 120);

  const boostedStats = computePlayerStats(boosted);
  assert.ok(boostedStats.attack > baseStats.attack);
  assert.ok(boostedStats.maxHp > baseStats.maxHp);
  assert.ok(boostedStats.critChance > baseStats.critChance);
  assert.ok(boostedStats.powerRating > baseStats.powerRating);

  const cpReport = analyzeCombatPower(boosted, boostedStats.powerRating);
  assert.equal(cpReport.categories.length, 6);
});

test('Wave 14: Sky Citadel, Astral Board, and Guild Sanctuary flow into previewLobbyClaimAll and clear when claimed', () => {
  const save = createInitialSaveData();
  save.highestChapterCleared = 2;
  save.skyCitadel = {
    ...normalizeSkyCitadel(save.skyCitadel),
    totalScore: SKY_CITADEL_MILESTONES[0].scoreTarget + 200,
    claimedMilestones: [],
  };
  save.astralBoard = {
    ...normalizeAstralBoard(save.astralBoard),
    lapsCompleted: ASTRAL_BOARD_LAP_MILESTONES[0].lapsTarget,
    dailyFreeClaimed: false,
    claimedLapMilestones: [],
  };
  save.guildSanctuary = {
    ...normalizeGuildSanctuary(save.guildSanctuary),
    dailyBossDamage: GUILD_DAILY_BOSS_CHESTS[0].damageTarget + 300,
    dailySanctuaryBlessingClaimed: false,
    claimedDailyBossChestIds: [],
  };

  assert.equal(countClaimableSkyCitadelMilestones(save), 1);
  assert.equal(countClaimableAstralBoardRewards(save), 2);
  assert.equal(countClaimableGuildSanctuaryRewards(save), 2);

  const claimAll = previewLobbyClaimAll(save);
  const sourceIds = new Set(claimAll.sources.map((item) => item.id));
  assert.ok(sourceIds.has('sky_citadel'));
  assert.ok(sourceIds.has('astral_board'));
  assert.ok(sourceIds.has('guild_sanctuary'));

  // Mark all Wave 14 claimables as claimed -> removed from previewLobbyClaimAll
  save.skyCitadel.claimedMilestones = [SKY_CITADEL_MILESTONES[0].scoreTarget];
  save.astralBoard.dailyFreeClaimed = true;
  save.astralBoard.claimedLapMilestones = [ASTRAL_BOARD_LAP_MILESTONES[0].lapsTarget];
  save.guildSanctuary.dailySanctuaryBlessingClaimed = true;
  save.guildSanctuary.claimedDailyBossChestIds = [GUILD_DAILY_BOSS_CHESTS[0].id];

  assert.equal(countClaimableSkyCitadelMilestones(save), 0);
  assert.equal(countClaimableAstralBoardRewards(save), 0);
  assert.equal(countClaimableGuildSanctuaryRewards(save), 0);

  const afterClaim = previewLobbyClaimAll(save);
  const afterIds = new Set(afterClaim.sources.map((item) => item.id));
  assert.equal(afterIds.has('sky_citadel'), false);
  assert.equal(afterIds.has('astral_board'), false);
  assert.equal(afterIds.has('guild_sanctuary'), false);
});

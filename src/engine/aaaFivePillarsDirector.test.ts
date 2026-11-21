import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ASTRAL_SHARD_EXCHANGE_CATALOG,
  COMBAT_INPUT_BUFFER_WINDOW_MS,
  EQUALIZED_ARENA_BASELINE,
  appendGachaPullHistory,
  clearCombatInputBuffer,
  computeAstralShardsAwarded,
  computeEqualizedArenaStats,
  computeTransparentPitySummary,
  consumeBufferedAction,
  createCombatInputBuffer,
  createCombatLightingState,
  evaluateAdaptiveResolutionScale,
  evaluateComboRankPromotion,
  explainAiSkillChoice,
  getActiveCompetitiveSeason,
  getNextSeasonRankTier,
  getWeaponKineticSignature,
  normalizeFairProgression,
  queueBufferedAction,
  resolveSeasonRankTier,
  stepCombatLightingMood,
} from './aaaFivePillarsDirector';
import {
  computeAiCompanionDecision,
  computeAiRivalDuelDecision,
  computeAutoPilotDecision,
} from './aiCombatBrain';
import { ArenaOpponent, ComputedPlayerStats, Rarity, SkillDefinition } from '../types/game';

test('Pillar 1: Dynamic combat lighting mood transitions smoothly between normal, boss_enrage, and victory_golden', () => {
  let state = createCombatLightingState();
  for (let i = 0; i < 40; i++) {
    state = stepCombatLightingMood(state, 'boss_enrage', 0.05);
  }
  assert.ok(state.enrageBlend > 0.95);
  assert.ok(state.rimIntensity > 1.45);
  assert.ok(state.fogDensityMult > 1.25);

  for (let i = 0; i < 40; i++) {
    state = stepCombatLightingMood(state, 'victory_golden', 0.05);
  }
  assert.ok(state.victoryBlend > 0.95);
  assert.ok(state.enrageBlend < 0.05);
  assert.ok(state.fogDensityMult < 0.9);
});

test('Pillar 1: Adaptive resolution guard scales down on heavy frames and recovers smoothly', () => {
  assert.equal(evaluateAdaptiveResolutionScale(30, 1.0, false), 1.0);
  assert.equal(evaluateAdaptiveResolutionScale(30, 1.0, true), 0.95);
  assert.equal(evaluateAdaptiveResolutionScale(30, 0.75, true), 0.75);
  assert.equal(evaluateAdaptiveResolutionScale(12, 0.85, true), 0.9);
});

test('Pillar 2: 120ms Combat Input Buffer queues, consumes once, and expires cleanly', () => {
  const buf = createCombatInputBuffer();
  queueBufferedAction(buf, 'dash', 1000);
  assert.equal(consumeBufferedAction(buf, 'dash', 1080), true);
  // Consumed once -> cannot double-fire
  assert.equal(consumeBufferedAction(buf, 'dash', 1090), false);

  queueBufferedAction(buf, 'ultimate', 2000);
  assert.equal(
    consumeBufferedAction(buf, 'ultimate', 2000 + COMBAT_INPUT_BUFFER_WINDOW_MS + 15),
    false
  );

  queueBufferedAction(buf, 'activeSkill', 3000);
  clearCombatInputBuffer(buf);
  assert.equal(consumeBufferedAction(buf, 'activeSkill', 3010), false);
});

test('Pillar 2: Weapon signatures and Combo Rank promotion detect milestone lift', () => {
  const bow = getWeaponKineticSignature('bow');
  const staff = getWeaponKineticSignature('staff');
  const claw = getWeaponKineticSignature('claw');
  assert.notEqual(bow.impactHex, staff.impactHex);
  assert.ok(claw.recoilKick > staff.recoilKick);

  const promoted = evaluateComboRankPromotion(7, 8);
  assert.equal(promoted.promoted, true);
  assert.equal(promoted.grade, 'B');
  assert.ok(promoted.pitchBoost >= 1.0);

  const flat = evaluateComboRankPromotion(8, 9);
  assert.equal(flat.promoted, false);
});

test('Pillar 3: Transparent Pity summary computes soft-pity ramp, hard pity, and Astral Shards', () => {
  const early = computeTransparentPitySummary(
    { mythicRollsSinceEpic: 4, mythicRollsSinceSTier: 12, runeRollsSinceEpic: 2 },
    'mythic'
  );
  assert.equal(early.epicRemaining, 6);
  assert.equal(early.sTierRemaining, 38);
  assert.equal(early.softPityActive, false);

  const soft = computeTransparentPitySummary(
    { mythicRollsSinceEpic: 9, mythicRollsSinceSTier: 42, runeRollsSinceEpic: 0 },
    'mythic'
  );
  assert.equal(soft.softPityActive, true);
  assert.ok(soft.effectiveSTierRatePct > 10);

  const shards = computeAstralShardsAwarded([Rarity.COMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY]);
  assert.equal(shards, 11);
  assert.ok(ASTRAL_SHARD_EXCHANGE_CATALOG.length >= 6);

  const fp = normalizeFairProgression({ astralShards: 30 });
  const hist = appendGachaPullHistory(fp.pullHistory, [
    {
      id: 'p1',
      timestampMs: 123,
      chestVariant: 'mythic',
      itemName: 'Trường Thương Tiên Tri [S]',
      rarity: Rarity.EPIC,
      isSTier: true,
      shardsGained: 3,
    },
  ]);
  assert.equal(hist.length, 1);
});

test('Pillar 3: Equalized Fair-Play PvP normalizes both player and rival to identical competitive baseline', () => {
  const whaleStats = {
    maxHp: 28000,
    attack: 4200,
    attackSpeed: 2.2,
    moveSpeed: 8.5,
    critChance: 0.72,
    critMultiplier: 3.1,
    damageReduction: 0.45,
    dodgeChance: 0.15,
    lifesteal: 0.1,
    arrowSpeed: 1.3,
    shieldOnStageStart: 5000,
    reviveCount: 2,
    weaponArchetype: 'bow',
    weaponAccentHex: 0xfacc15,
    heroId: 'artemis',
    powerRating: 95000,
    activeGearSets: [],
  } as unknown as ComputedPlayerStats;

  const opponent: ArenaOpponent = {
    id: 'rival_1',
    name: 'Kình Địch',
    title: 'Chiến Thần',
    heroId: 'hatsune_miku',
    rating: 1400,
    powerRating: 12000,
    maxHp: 5500,
    attack: 220,
    speedMult: 1.15,
    weaponArchetype: 'staff',
    accentHex: 0x38bdf8,
    cloakHex: 0x1e3a8a,
    hairHex: 0xfef08a,
    rewardPoints: 28,
    rewardArenaCoins: 100,
  };

  const eq = computeEqualizedArenaStats(whaleStats, opponent);
  assert.equal(eq.playerStats.maxHp, EQUALIZED_ARENA_BASELINE.maxHp);
  assert.equal(eq.opponent.maxHp, EQUALIZED_ARENA_BASELINE.maxHp);
  assert.equal(eq.playerStats.attack, eq.opponent.attack);
  assert.equal(eq.playerStats.attackSpeedMult, EQUALIZED_ARENA_BASELINE.attackSpeed);
  assert.equal(eq.opponent.rewardArenaCoins, 135);
});

test('Pillar 4: Competitive Season hub computes active season, rank tiers, and next milestone', () => {
  const season = getActiveCompetitiveSeason(Date.UTC(2026, 2, 10));
  assert.ok(season.seasonNumber >= 1);
  assert.ok(season.weekIndexInSeason >= 1 && season.weekIndexInSeason <= 4);
  assert.equal(resolveSeasonRankTier(0).id, 'bronze');
  assert.equal(resolveSeasonRankTier(280).id, 'gold');
  assert.equal(getNextSeasonRankTier(280)?.id, 'platinum');
  assert.equal(getNextSeasonRankTier(999), null);
});

test('Pillar 5: 60Hz Auto-Pilot exploits Resonance Traps, Boss Weak-Points, Counter-Shots, and Rival AI leads moving player', () => {
  const trapDecision = computeAutoPilotDecision({
    tactic: 'balanced',
    simTimeSec: 5.0,
    playerX: 0,
    playerZ: 6,
    hpRatio: 0.9,
    ultCharge: 40,
    dashReady: true,
    activeSkillReady: false,
    overchargeRatio: 0.2,
    portalOpen: false,
    portalX: 0,
    portalZ: -10,
    arenaHalfW: 11,
    arenaHalfD: 12,
    enemies: [{ id: 1, x: -4.2, z: 0.5, hp: 500, maxHp: 500, isBoss: false, radius: 0.8 }],
    telegraphs: [],
    incomingBullets: [],
    resonanceTraps: [
      { x: -4.0, z: 0.0, ready: true, aoeRadius: 4.8, label: 'Trụ Lôi Cộng Hưởng' },
    ],
  });
  assert.equal(trapDecision.moveX, 0);
  assert.equal(trapDecision.moveZ, 0);
  assert.match(trapDecision.statusLabel, /Trụ Lôi/);

  const counterDecision = computeAutoPilotDecision({
    tactic: 'balanced',
    simTimeSec: 6.0,
    playerX: 0,
    playerZ: 6,
    hpRatio: 0.9,
    ultCharge: 20,
    dashReady: true,
    activeSkillReady: false,
    overchargeRatio: 0.1,
    counterShotReady: true,
    portalOpen: false,
    portalX: 0,
    portalZ: -10,
    arenaHalfW: 11,
    arenaHalfD: 12,
    enemies: [{ id: 2, x: 0, z: -1, hp: 5000, maxHp: 5000, isBoss: true, radius: 1.5 }],
    telegraphs: [],
    incomingBullets: [],
  });
  assert.match(counterDecision.statusLabel, /Phản Tiễn/);

  const companion = computeAiCompanionDecision({
    role: 'ranger',
    slotIndex: 0,
    simTimeSec: 3,
    x: -3,
    z: 4,
    playerX: 0,
    playerZ: 6,
    arenaHalfW: 11,
    arenaHalfD: 12,
    target: { id: 2, x: 0, z: -2, hp: 5000, maxHp: 5000, isBoss: true, radius: 1.5 },
    telegraphs: [],
    incomingBullets: [],
    bossWeakPoint: { x: 1.8, z: -2.0, active: true },
  });
  assert.match(companion.tacticalHint ?? '', /Điểm Yếu/);

  const rival = computeAiRivalDuelDecision({
    personality: 'tactical',
    simTimeSec: 1.75,
    rivalX: 0,
    rivalZ: -5,
    playerX: 0,
    playerZ: 3,
    playerVx: 6.0,
    playerVz: 0,
    rivalHpRatio: 0.8,
    arenaHalfW: 11,
    arenaHalfD: 12,
    playerBullets: [],
  });
  assert.ok(rival.aimTargetX > 0.5);

  const skill: SkillDefinition = {
    id: 'super_blaze',
    name: 'Thiên Hỏa Cực Đạo',
    description: 'Tiến hóa Hỏa Tiễn',
    category: 'elemental',
    rarity: 'legend',
    maxStacks: 1,
    accentColor: '#f97316',
    buildTag: 'boss',
  };
  assert.match(explainAiSkillChoice(skill, { fire_arrow: 1 }, 'aggressive'), /Tiến Hóa/);
});

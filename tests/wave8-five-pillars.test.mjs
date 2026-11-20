import test from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import {
  AI_DIFFICULTY_TIER_ORDER,
  AI_DIFFICULTY_TIERS,
  buildLethalDefeatReport,
  computeAdaptiveAiEscalation,
  computeArenaSuddenDeath,
  computeLeadAimTarget,
  computeLethalArenaMatchConfig,
  computePvEIntensityProfile,
  createAiRivalCombatState,
  stepAiRivalCombatBrain,
} from '../src/engine/wave8LethalAiSystems.ts';
import { LiveAiPlayersService } from '../src/server/liveAiPlayersService.ts';

function makeMockStats(overrides = {}) {
  return {
    heroId: 'artemis',
    maxHp: 4200,
    attack: 320,
    attackSpeedMult: 1.3,
    moveSpeed: 6.5,
    critChance: 0.28,
    critDamage: 1.9,
    damageReduction: 0.72, // Tanky DR-stacking player trying to be immortal
    powerRating: 18500,
    stageHealPct: 0.1,
    bossDamageBonus: 0.35,
    ...overrides,
  };
}

function makeMockOpponent(overrides = {}) {
  return {
    id: 'ai_te_thien',
    name: 'Tề Thiên [AI Live]',
    title: 'Sát Thủ Real-Time',
    heroId: 'wukong',
    rating: 1620,
    powerRating: 19200,
    maxHp: 8000,
    attack: 400,
    speedMult: 1.15,
    weaponArchetype: 'claw',
    accentHex: 0xfbbf24,
    cloakHex: 0xb91c1c,
    hairHex: 0xfde047,
    rewardPoints: 24,
    rewardArenaCoins: 85,
    ...overrides,
  };
}

test('Wave 8 Pillar 5: Lethal 60Hz AI Rival genuinely defeats a stationary / non-dodging player before timeout', () => {
  const playerStats = makeMockStats();
  const opponent = makeMockOpponent();

  for (const tier of ['master', 'sovereign', 'mythic']) {
    const cfg = computeLethalArenaMatchConfig({
      playerStats,
      opponent,
      tier,
      playerWinStreak: 0,
      equalized: false,
    });
    const brain = createAiRivalCombatState(tier, 'assassin', cfg.startingRivalUltCharge, cfg.rivalShieldHp);

    let playerHp = playerStats.maxHp;
    const effectiveDr = Math.min(cfg.playerArenaDrCap, playerStats.damageReduction);
    let attackTimer = 0.65;
    let telegraphTimer = 0;
    let activeDamageMult = 1;
    let nextCd = 0.8;
    let snipesFired = 0;
    let ultsFired = 0;
    let rivalX = 0;
    let rivalZ = -6;
    const dt = 1 / 60;

    for (let tick = 0; tick < 45 * 60 && playerHp > 0; tick++) {
      const simTime = tick * dt;
      const timeLeft = Math.max(0, 45 - simTime);
      const isTelegraphing = telegraphTimer > 0;

      if (isTelegraphing) {
        telegraphTimer -= dt;
        if (telegraphTimer <= 0) {
          // Player stands still and eats the attack
          const sd = computeArenaSuddenDeath(timeLeft);
          const raw = cfg.rivalAttack * activeDamageMult * sd.damageMult;
          const dmg = Math.max(2, Math.round(raw * (1 - effectiveDr)));
          playerHp = Math.max(0, playerHp - dmg);
          attackTimer = nextCd;
        }
      } else {
        attackTimer -= dt;
      }

      const step = stepAiRivalCombatBrain(brain, {
        dt,
        simTimeSec: simTime,
        rivalX,
        rivalZ,
        rivalHpRatio: 0.65,
        playerX: 0,
        playerZ: 6,
        playerVx: 0, // Player standing completely still
        playerVz: 0,
        arenaHalfW: 11,
        arenaHalfD: 11,
        incomingArrows: [],
        attackReady: !isTelegraphing && attackTimer <= 0,
        isTelegraphing,
        escalation: cfg.escalation,
      });

      rivalX = Math.max(-10, Math.min(10, rivalX + step.moveX * 5.2 * step.speedMult * dt));
      rivalZ = Math.max(-10, Math.min(10, rivalZ + step.moveZ * 5.2 * step.speedMult * dt));

      if (step.patternPlan) {
        telegraphTimer = step.patternPlan.telegraphDuration;
        activeDamageMult = step.patternPlan.damageMult;
        nextCd = step.patternPlan.nextCooldown;
        if (step.patternPlan.pattern === 'crimson_snipe') snipesFired += 1;
        if (step.patternPlan.pattern === 'ai_ultimate') ultsFired += 1;
      }
    }

    assert.equal(playerHp, 0, `Expected non-dodging player to be defeated on tier=${tier}`);
    assert.ok(snipesFired >= 1, `Expected AI on tier=${tier} to punish camping with crimson_snipe`);
    assert.ok(ultsFired >= 1 || tier === 'mythic', `Expected AI on tier=${tier} to unleash Ultimate or kill rapidly`);
  }
});

test('Wave 8 Pillar 5: AI Rival executes active Dash I-Frames against incoming player arrows and triggers Phase-2 Enrage at <=50% HP', () => {
  const brain = createAiRivalCombatState('sovereign', 'tactical', 20, 400);
  brain.dashCooldown = 0;

  // Arrow flying directly at rival (0, -6) from (0, -2) at vz = -24 (impact in ~0.16s)
  const dodgeStep = stepAiRivalCombatBrain(brain, {
    dt: 1 / 60,
    simTimeSec: 1.5,
    rivalX: 0,
    rivalZ: -6,
    rivalHpRatio: 0.85,
    playerX: 0,
    playerZ: 4,
    playerVx: 0,
    playerVz: 0,
    arenaHalfW: 11,
    arenaHalfD: 11,
    incomingArrows: [{ x: 0, z: -2.2, vx: 0, vz: -24, radius: 0.42 }],
    attackReady: false,
    isTelegraphing: false,
  });

  assert.equal(dodgeStep.triggeredDash, true);
  assert.equal(dodgeStep.isInvulnerable, true);
  assert.equal(brain.aiDodgesPerformed, 1);

  // Trigger Phase-2 Enrage when HP drops below 50%
  const ultBefore = brain.ultCharge;
  const enrageStep = stepAiRivalCombatBrain(brain, {
    dt: 1 / 60,
    simTimeSec: 2.0,
    rivalX: 0,
    rivalZ: -6,
    rivalHpRatio: 0.48,
    playerX: 0,
    playerZ: 4,
    playerVx: 3.5,
    playerVz: 0,
    arenaHalfW: 11,
    arenaHalfD: 11,
    incomingArrows: [],
    attackReady: false,
    isTelegraphing: false,
  });

  assert.equal(enrageStep.triggeredPhase2Enrage, true);
  assert.equal(brain.enraged, true);
  assert.ok(brain.ultCharge >= ultBefore + 30);
});

test('Wave 8 Pillar 4 & 5: Difficulty tiers scale monotonically, enforce fair 1v1 DR/revive rules, and Sudden Death escalates past 22s', () => {
  const stats = makeMockStats();
  const opp = makeMockOpponent();
  const configs = AI_DIFFICULTY_TIER_ORDER.map((tier) =>
    computeLethalArenaMatchConfig({ playerStats: stats, opponent: opp, tier })
  );

  for (let i = 1; i < configs.length; i++) {
    assert.ok(configs[i].rivalAttack > configs[i - 1].rivalAttack);
    assert.ok(configs[i].rivalMaxHp > configs[i - 1].rivalMaxHp);
    assert.ok(configs[i].rewardBonusPct > configs[i - 1].rewardBonusPct);
    assert.ok(configs[i].ratingBonus > configs[i - 1].ratingBonus);
  }

  for (const cfg of configs) {
    assert.equal(cfg.disableFreeRevives, true);
    assert.equal(cfg.disableCompanionsInDuel, true);
    assert.ok(cfg.playerArenaDrCap <= 0.35);
  }

  // Sudden Death checks
  const early = computeArenaSuddenDeath(38, 45);
  assert.equal(early.active, false);
  assert.equal(early.damageMult, 1.0);

  const late = computeArenaSuddenDeath(10, 45);
  assert.equal(late.active, true);
  assert.ok(late.damageMult >= 1.8);
  assert.ok(late.healReductionPct >= 50);

  // Adaptive win streak escalation
  const esc0 = computeAdaptiveAiEscalation(0);
  const esc6 = computeAdaptiveAiEscalation(6);
  assert.equal(esc0.threatLevel, 0);
  assert.equal(esc6.threatLevel, 3);
  assert.ok(esc6.attackBonusMult > esc0.attackBonusMult);
  assert.ok(esc6.cooldownScale < esc0.cooldownScale);
});

test('Wave 8 Pillar 2 & 3: Lead-aim prediction, PvE Challenge Profile, and Fair Defeat Breakdown work accurately', () => {
  const lead = computeLeadAimTarget(0, -6, 0, 4, 6.0, 0, 20, 1.0, 11, 11);
  assert.ok(lead.x > 1.5, 'Lead aim should aim ahead of a rightward-moving player');
  assert.ok(lead.dirX > 0.15);

  const pveOff = computePvEIntensityProfile('sovereign', false);
  assert.equal(pveOff.enemyDamageMult, 1.0);
  assert.equal(pveOff.enemyCooldownMult, 1.0);

  const pveOn = computePvEIntensityProfile('sovereign', true);
  assert.ok(pveOn.enemyDamageMult > 1.4);
  assert.ok(pveOn.enemyCooldownMult < 0.8);
  assert.ok(pveOn.enemyProjectileSpeedMult > 1.2);

  const defeat = buildLethalDefeatReport({
    rivalName: 'Tề Thiên [AI Live]',
    rivalRemainingHpPct: 12,
    tier: 'sovereign',
    lastPattern: 'ai_ultimate',
    perfectDodges: 0,
    durationSec: 26,
  });
  assert.ok(defeat.cause.label.includes('Tuyệt Kỹ'));
  assert.ok(defeat.consolationGold >= 60);
  assert.ok(defeat.consolationStarDust >= 3);
  assert.ok(defeat.coachingNote.includes('12%'));
});

test('Wave 8 Server Integration: LiveAiPlayersService.completeDuel tracks AI tier rating bonuses and AI victories', () => {
  const tmpFile = path.join(os.tmpdir(), `wave8-live-ai-${Date.now()}.json`);
  try {
    const svc = new LiveAiPlayersService(tmpFile);
    const snap = svc.getSnapshot(1);
    const target = snap.players[0];
    const winsBefore = target.duelWins;
    const ratingBefore = target.duelRating;

    // Case 1: AI defeats the player on Sovereign tier
    const lossRes = svc.completeDuel({
      duelId: `duel_loss_${Date.now()}`,
      aiPlayerId: target.id,
      challengerName: 'Tester',
      playerWon: false,
      durationSec: 21,
      aiDuelTier: 'sovereign',
    });
    assert.equal(lossRes.alreadyProcessed, false);
    assert.equal(lossRes.ratingDelta, -8);
    assert.equal(lossRes.opponent?.duelWins, winsBefore + 1);
    assert.ok((lossRes.opponent?.duelRating ?? 0) > ratingBefore);
    assert.ok(lossRes.event?.summary.includes('Đế Vương'));

    // Case 2: Player beats AI on Mythic tier -> receives +48 ratingDelta
    const winRes = svc.completeDuel({
      duelId: `duel_win_${Date.now()}`,
      aiPlayerId: target.id,
      challengerName: 'Tester',
      playerWon: true,
      durationSec: 29,
      aiDuelTier: 'mythic',
    });
    assert.equal(winRes.alreadyProcessed, false);
    assert.equal(winRes.ratingDelta, 48);
    assert.ok(winRes.event?.summary.includes('Thần Thoại'));
  } finally {
    if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { WebSocket } from 'ws';
import {
  ANCIENT_RUNE_EXCHANGE_COST,
  EQUALIZED_TRIAL_KIT_LIST,
  EQUALIZED_TRIAL_KITS,
  EQUALIZED_TRIAL_ROUNDS,
  GUILD_WAR_TARGET_SCORE,
  RUNE_EPIC_PITY_MAX,
  RUNE_LEGENDARY_PITY_MAX,
  RUNE_LEGENDARY_SOFT_PITY_START,
  advanceElementalResonance,
  applyBossPartDamage,
  applyGuildWarBastionStrike,
  computeAdaptiveAiCounterAdjustments,
  computeAncientRunePitySummary,
  computeDynamicSkyShaderTargets,
  createBossBreakableParts,
  createInitialElementalResonanceState,
  createInitialLiveGuildWarState,
  derivePlayerAdaptationProfile,
  pickComplementaryElement,
  tickElementalResonanceTimers,
  tickLiveGuildWarAiSkirmish,
} from '../src/engine/wave10FivePillars.ts';
import { craftSelectedRuneFromShards, rollRuneChestBatch } from '../src/data/runesData.ts';
import { createInitialSaveData } from '../src/data/gearData.ts';
import { getEarlyProgressionPolicy } from '../src/data/earlyProgressionData.ts';
import { attachLiveAiWebSocketServer } from '../server.ts';
import { LiveAiPlayersService } from '../src/server/liveAiPlayersService.ts';
import { Rarity } from '../src/types/game.ts';

function makeTempDir(label) {
  return fs.mkdtempSync(path.join(os.tmpdir(), `artemis-w10-${label}-`));
}

function waitForMessage(ws, predicate, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for WebSocket message'));
    }, timeoutMs);

    const onMessage = (raw) => {
      try {
        const parsed = JSON.parse(String(raw));
        if (predicate(parsed)) {
          cleanup();
          resolve(parsed);
        }
      } catch {
        // ignore non-json
      }
    };

    const onError = (err) => {
      cleanup();
      reject(err);
    };

    const cleanup = () => {
      clearTimeout(timer);
      ws.off('message', onMessage);
      ws.off('error', onError);
    };

    ws.on('message', onMessage);
    ws.on('error', onError);
  });
}

test('Wave 10 Pillar 1 & 2A: Boss Breakable Parts target predictably, shatter cleanly, and grant permanent debuffs & bonus loot', () => {
  const miniParts = createBossBreakableParts(5000, false);
  assert.equal(miniParts.length, 2);

  const majorParts = createBossBreakableParts(10000, true);
  assert.equal(majorParts.length, 3);
  assert.deepEqual(
    majorParts.map((p) => p.id),
    ['armor_horn', 'arcane_core', 'astral_wing']
  );

  let current = majorParts;
  let brokenCount = 0;
  let hornBroken = null;
  for (let i = 0; i < 20; i++) {
    const res = applyBossPartDamage(current, 900, { isCrit: true, isBreakerSkill: i % 2 === 0 });
    current = res.parts;
    if (res.brokenPartNow) {
      brokenCount++;
      if (res.brokenPartNow.id === 'armor_horn') hornBroken = res.brokenPartNow;
      break;
    }
  }

  assert.equal(brokenCount, 1);
  assert.ok(hornBroken);
  assert.equal(hornBroken.atkReductionPct, 0.18);
  assert.ok(hornBroken.bonusGold > 0 && hornBroken.bonusStarDust > 0);
});

test('Wave 10 Pillar 1 & 2B: Elemental Resonance accumulates 3 stacks, triggers Tam Nguyên Hợp Kích burst, and decays cleanly', () => {
  let state = createInitialElementalResonanceState();
  assert.equal(state.stack, 0);
  assert.equal(state.maxStack, 3);

  const s1 = advanceElementalResonance(state, 'fire', 200);
  assert.equal(s1.burstTriggered, false);
  assert.equal(s1.nextState.stack, 1);

  const s2 = advanceElementalResonance(s1.nextState, 'ice', 200);
  assert.equal(s2.burstTriggered, false);
  assert.equal(s2.nextState.stack, 2);

  const s3 = advanceElementalResonance(s2.nextState, 'storm', 200);
  assert.equal(s3.burstTriggered, true);
  assert.ok(s3.burstDamage >= 420);
  assert.equal(s3.aoeRadius, 5.4);
  assert.equal(s3.breakShieldRatio, 0.3);
  assert.equal(s3.stylePointsBonus, 180);
  assert.ok(s3.calloutText && s3.calloutText.includes('TAM NGUYÊN'));
  assert.equal(s3.nextState.stack, 0);
  assert.equal(s3.nextState.totalBurstsTriggered, 1);

  // Decay resets banner and decrements stack when window expires
  const decayed = tickElementalResonanceTimers(s3.nextState, 2.5);
  assert.equal(decayed.burstBannerText, null);
  const sStack = advanceElementalResonance(decayed, 'fire', 150).nextState;
  const expired = tickElementalResonanceTimers(sStack, 9.0);
  assert.equal(expired.stack, 0);
});

test('Wave 10 Pillar 1 & 2C: Dynamic 3D Skybox shader targets intensify by Boss Phase and Elemental Resonance', () => {
  const p1 = computeDynamicSkyShaderTargets({
    skyHex: 0x0f172a,
    fogHex: 0x1e293b,
    rimLightHex: 0x38bdf8,
    bossPhase: 1,
    resonanceRatio: 0,
  });
  const p3 = computeDynamicSkyShaderTargets({
    skyHex: 0x0f172a,
    fogHex: 0x1e293b,
    rimLightHex: 0x38bdf8,
    bossPhase: 3,
    resonanceRatio: 0.9,
  });

  assert.equal(p1.zenithHex, 0x0f172a);
  assert.ok(p3.turbulence > p1.turbulence);
  assert.ok(p3.phaseIntensity > p1.phaseIntensity);
  assert.equal(p3.nebulaHex, 0xf43f5e);
  assert.equal(p3.auroraHex, 0x38bdf8);
});

test('Wave 10 Pillar 3: Ancient Rune Pity guarantees Epic @10, Soft Pity @22, Legendary @30, and 35-Shard direct rune crafting', () => {
  assert.equal(RUNE_EPIC_PITY_MAX, 10);
  assert.equal(RUNE_LEGENDARY_PITY_MAX, 30);
  assert.equal(RUNE_LEGENDARY_SOFT_PITY_START, 22);
  assert.equal(ANCIENT_RUNE_EXCHANGE_COST, 35);

  // Soft pity summary check at 23 rolls
  const softSummary = computeAncientRunePitySummary(
    {
      mythicRollsSinceEpic: 0,
      mythicRollsSinceSTier: 0,
      runeRollsSinceEpic: 4,
      runeRollsSinceLegendary: 23,
      ancientRuneShards: 38,
    },
    true
  );
  assert.equal(softSummary.softPityActive, true);
  assert.ok(softSummary.effectiveLegendaryRatePct > 10);
  assert.equal(softSummary.canDirectSelectRune, true);

  // Hard pity Epic @10 even with worst RNG
  const epicTrigger = rollRuneChestBatch(
    true,
    1,
    {
      mythicRollsSinceEpic: 0,
      mythicRollsSinceSTier: 0,
      runeRollsSinceEpic: 9,
      runeRollsSinceLegendary: 9,
      ancientRuneShards: 0,
    },
    { rng: () => 0.99 }
  );
  assert.equal(epicTrigger.items[0].rarity, Rarity.EPIC);
  assert.equal(epicTrigger.nextPity.runeRollsSinceEpic, 0);
  assert.ok(epicTrigger.ancientRuneShardsGained >= 4);

  // Hard pity Legendary @30 even with worst RNG
  const legTrigger = rollRuneChestBatch(
    true,
    1,
    {
      mythicRollsSinceEpic: 0,
      mythicRollsSinceSTier: 0,
      runeRollsSinceEpic: 2,
      runeRollsSinceLegendary: 29,
      ancientRuneShards: 10,
    },
    { rng: () => 0.99 }
  );
  assert.equal(legTrigger.items[0].rarity, Rarity.LEGENDARY);
  assert.equal(legTrigger.nextPity.runeRollsSinceLegendary, 0);
  assert.equal(legTrigger.nextPity.ancientRuneShards, 18);

  // Early-progression rarity cap preserves Legendary pity counter without losing progress
  const ch0Save = createInitialSaveData();
  const ch0Policy = getEarlyProgressionPolicy(ch0Save);
  const ch0Roll = rollRuneChestBatch(
    true,
    1,
    {
      mythicRollsSinceEpic: 0,
      mythicRollsSinceSTier: 0,
      runeRollsSinceEpic: 9,
      runeRollsSinceLegendary: 29,
      ancientRuneShards: 5,
    },
    { policy: ch0Policy, rng: () => 0.99 }
  );
  assert.equal(ch0Roll.items[0].rarity, ch0Policy.maxRuneRarity);
  assert.equal(ch0Roll.nextPity.runeRollsSinceLegendary, 29);

  // 35-shard direct rune selector craft
  const craftFail = craftSelectedRuneFromShards({ ancientRuneShards: 20 }, 'arrow_rain');
  assert.equal(craftFail.ok, false);

  const craftOk = craftSelectedRuneFromShards({ ancientRuneShards: 40 }, 'arrow_rain');
  assert.equal(craftOk.ok, true);
  assert.equal(craftOk.rune?.runeId, 'arrow_rain');
  assert.equal(craftOk.rune?.rarity, Rarity.LEGENDARY);
  assert.equal(craftOk.nextPity.ancientRuneShards, 5);
});

test('Wave 10 Pillar 4: Equalized Trial Gauntlet exposes 3 standardized kits and 3 progressive round rewards', () => {
  assert.equal(EQUALIZED_TRIAL_KIT_LIST.length, 3);
  assert.ok(EQUALIZED_TRIAL_KITS.assassin_counter);
  assert.ok(EQUALIZED_TRIAL_KITS.rapid_ranger);
  assert.ok(EQUALIZED_TRIAL_KITS.elemental_sage);
  assert.equal(EQUALIZED_TRIAL_ROUNDS.length, 3);
  assert.ok(EQUALIZED_TRIAL_ROUNDS[2].seasonPoints > EQUALIZED_TRIAL_ROUNDS[0].seasonPoints);
  assert.ok(EQUALIZED_TRIAL_ROUNDS[2].arenaCoins > EQUALIZED_TRIAL_ROUNDS[0].arenaCoins);
});

test('Wave 10 Pillar 5A: Adaptive AI learns dodge bias, spacing, and complementary Co-op element', () => {
  assert.equal(pickComplementaryElement('fire'), 'ice');
  assert.equal(pickComplementaryElement('ice'), 'storm');
  assert.equal(pickComplementaryElement('storm'), 'fire');

  const profile = derivePlayerAdaptationProfile(null, 'XạThủTest', {
    leftDodges: 9,
    rightDodges: 1,
    avgDistance: 9.2,
    dashCount: 7,
    durationSec: 25,
    dominantElement: 'fire',
    elementalReactions: 4,
    won: true,
  });

  assert.equal(profile.dodgeBias, 'left');
  assert.equal(profile.rangeStyle, 'kiter');
  assert.equal(profile.preferredElement, 'fire');
  assert.equal(profile.coopComplementaryElement, 'ice');
  assert.equal(profile.samplesAnalyzed, 1);

  const adj = computeAdaptiveAiCounterAdjustments(profile);
  assert.ok(adj.shotLeadAngleOffsetRad < 0, 'Should lead left when player dodges left');
  assert.ok(adj.dashInterceptCooldownMult < 1, 'Should close gap faster vs kiter');
  assert.equal(adj.complementaryCoopElement, 'ice');
  assert.ok(adj.badgeText && adj.badgeText.includes('AI Thích Nghi'));
});

test('Wave 10 Pillar 5B & WebSocket E2E: Live AI adapts on server and 3-Bastion Guild War syncs strikes & War Chest claims', async () => {
  const guildWar0 = createInitialLiveGuildWarState('2026-11-21', 1000);
  assert.equal(guildWar0.bastions.length, 3);
  assert.equal(guildWar0.targetScore, GUILD_WAR_TARGET_SCORE);

  const strike = applyGuildWarBastionStrike(guildWar0, {
    actorId: 'human:tester',
    actorName: 'ThủLĩnhTest',
    heroId: 'artemis',
    isHuman: true,
    faction: 'zodiac_guild',
    bastionId: 'void_shrine',
    mode: 'assault_3d',
    scoreGain: 150,
    nowMs: 2000,
  });
  assert.ok(strike.nextState.zodiacScore > guildWar0.zodiacScore);
  assert.ok(strike.bastion.controlScore > -28);

  const aiSkirmish = tickLiveGuildWarAiSkirmish(strike.nextState, {
    aiId: 'ai_player_01',
    aiDisplayName: 'ThiênXạSư',
    heroId: 'artemis',
    tickSeed: 6,
    nowMs: 3000,
  });
  assert.ok(aiSkirmish.pointsAwarded > 0);

  // Full WebSocket integration test with LiveAiPlayersService + server.ts
  const tmpDir = makeTempDir('ws');
  const service = new LiveAiPlayersService(path.join(tmpDir, 'live-ai.json'));
  const httpServer = http.createServer((_req, res) => {
    res.writeHead(200);
    res.end('ok');
  });
  const wss = attachLiveAiWebSocketServer(httpServer, service, { tickIntervalMs: 60_000 });
  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve));
  const address = httpServer.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  const ws = new WebSocket(`ws://127.0.0.1:${port}/ws/live-ai`);
  try {
    const snapMsg = await waitForMessage(ws, (m) => m.type === 'hub:snapshot');
    assert.ok(snapMsg.payload.guildWarLive);
    assert.equal(snapMsg.payload.guildWarLive.bastions.length, 3);

    const announceP = waitForMessage(ws, (m) => m.type === 'hub:snapshot');
    ws.send(
      JSON.stringify({
        type: 'presence:announce',
        payload: { displayName: 'W10Tester' },
      })
    );
    await announceP;

    // 1. Send combat telemetry -> verify ai:adaptation_update response
    const adaptP = waitForMessage(ws, (m) => m.type === 'ai:adaptation_update');
    ws.send(
      JSON.stringify({
        type: 'ai:learn_telemetry',
        payload: {
          playerName: 'W10Tester',
          telemetry: {
            leftDodges: 8,
            rightDodges: 2,
            avgDistance: 8.6,
            dashCount: 5,
            durationSec: 22,
            dominantElement: 'storm',
            elementalReactions: 3,
            won: true,
          },
        },
      })
    );
    const adaptEvt = await adaptP;
    assert.equal(adaptEvt.payload.adaptationProfile.dodgeBias, 'left');
    assert.equal(adaptEvt.payload.adaptationProfile.coopComplementaryElement, 'fire');

    // 2. Strike a Guild War bastion until Zodiac Guild reaches victory -> claim reward idempotently
    for (let i = 0; i < 6; i++) {
      const updateP = waitForMessage(ws, (m) => m.type === 'guild_war:update');
      ws.send(
        JSON.stringify({
          type: 'guild_war:capture_strike',
          payload: {
            bastionId: 'void_shrine',
            mode: 'assault_3d',
            heroId: 'artemis',
            scoreGain: 240,
            playerName: 'W10Tester',
          },
        })
      );
      await updateP;
    }

    const claim1P = waitForMessage(ws, (m) => m.type === 'guild_war:claim_ack');
    ws.send(
      JSON.stringify({
        type: 'guild_war:claim_reward',
        payload: { playerName: 'W10Tester' },
      })
    );
    const claim1 = await claim1P;
    assert.equal(claim1.payload.ok, true);
    assert.equal(claim1.payload.alreadyClaimed, false);
    assert.ok(claim1.payload.goldReward >= 2800);
    assert.ok(claim1.payload.guildCoinsReward >= 180);

    // Second claim must be idempotent
    const claim2P = waitForMessage(ws, (m) => m.type === 'guild_war:claim_ack');
    ws.send(
      JSON.stringify({
        type: 'guild_war:claim_reward',
        payload: { playerName: 'W10Tester' },
      })
    );
    const claim2 = await claim2P;
    assert.equal(claim2.payload.alreadyClaimed, true);

    // 3. Reset adaptation profile cleanly
    const resetP = waitForMessage(
      ws,
      (m) => m.type === 'ai:adaptation_update' && m.payload.adaptationProfile === null
    );
    ws.send(
      JSON.stringify({
        type: 'ai:reset_adaptation',
        payload: { playerName: 'W10Tester' },
      })
    );
    const resetEvt = await resetP;
    assert.equal(resetEvt.payload.adaptationProfile, null);
  } finally {
    ws.close();
    wss.close();
    httpServer.close();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
});

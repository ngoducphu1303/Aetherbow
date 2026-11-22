import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS } from '../data/chaptersData';
import { EnemyKind } from '../types/game';
import { mapBossTelegraphToHud } from './coopSynergy';
import {
  BOSS_GUARD_BREAK_STUN_SEC,
  BOSS_STUN_IMMUNITY_SEC,
  ZODIAC_BOSS_PROFILES,
  ZODIAC_PROFILE_ORDER,
  clampBossChillSlowMult,
  clearBossAiTransientCombat,
  computeBossEnrageModifiers,
  computeBossInnateArmorReduction,
  computeBossPhaseDamageMult,
  computeCappedLeadTarget,
  computeSafeBlinkDestination,
  createBossAiRuntimeState,
  getBossPerformanceBudget,
  getBossRecoveryDuration,
  planNextBossSkill,
  resolveBossProfileId,
  scaleOrbCountForBudget,
  stepBossMovement,
} from './zodiacBossAi';

test('All 12 Zodiac chapters plus Warden and Titan sub-bosses have distinct, complete skill kits', () => {
  assert.equal(CHAPTERS.length, 12);
  assert.equal(ZODIAC_PROFILE_ORDER.length, 12);

  const seenFirstSkillLabels = new Set<string>();
  const seenSkillKindSignatures = new Set<string>();

  for (const ch of CHAPTERS) {
    const profileId = resolveBossProfileId({
      enemyKind: EnemyKind.ZODIAC_BOSS,
      chapterId: ch.id,
      zodiacId: ch.zodiacId,
    });
    assert.equal(profileId, ch.zodiacId, `Chapter ${ch.id} should resolve to ${ch.zodiacId}`);

    const profile = ZODIAC_BOSS_PROFILES[profileId];
    assert.ok(profile, `Missing profile for ${profileId}`);
    assert.ok(profile.mobilitySpeedMult >= 1.3, `${profileId} must be actively mobile`);
    assert.ok(profile.phase1Cycle.length >= 3, `${profileId} must have at least 3 Phase 1 skills`);
    assert.ok(profile.phase2Cycle.length >= 3, `${profileId} must have at least 3 Phase 2 skills`);

    for (const id of [...profile.phase1Cycle, ...profile.phase2Cycle]) {
      const skill = profile.skills[id];
      assert.ok(skill, `Skill ${id} missing on ${profileId}`);
      assert.ok(skill.label.length >= 4, `Skill ${id} needs readable Vietnamese label`);
      assert.ok(skill.actionHint.length >= 8, `Skill ${id} needs readable dodge cue`);
      assert.ok(skill.telegraphDuration >= 0.48, `Skill ${id} telegraph must be dodgeable`);
    }

    const firstLabel = profile.skills[profile.phase1Cycle[0]].label;
    assert.equal(
      seenFirstSkillLabels.has(firstLabel),
      false,
      `Duplicate signature skill label across chapters: ${firstLabel}`
    );
    seenFirstSkillLabels.add(firstLabel);

    const kindSig = profile.phase1Cycle.map((id) => profile.skills[id].kind).join('>');
    seenSkillKindSignatures.add(`${profile.movementStyle}:${kindSig}`);
  }

  // Every chapter has a unique movement+skill combination
  assert.equal(seenSkillKindSignatures.size, 12);

  // Warden & Titan sub-bosses resolve properly and inherit chapter accent/hazard flavor
  const wardenCh10 = createBossAiRuntimeState({ enemyKind: EnemyKind.WARDEN_BOSS, chapterId: 10 });
  assert.equal(wardenCh10.profileId, 'warden');
  assert.equal(wardenCh10.hazardFlavor, 'frost');

  const titanCh8 = createBossAiRuntimeState({ enemyKind: EnemyKind.TITAN_BOSS, chapterId: 8 });
  assert.equal(titanCh8.profileId, 'titan');
  assert.equal(titanCh8.hazardFlavor, 'poison');
});

test('Weekly Ranked Boss, Tower floors, and Boss Rush map across Zodiac archetypes cleanly', () => {
  assert.equal(
    resolveBossProfileId({
      enemyKind: EnemyKind.ZODIAC_BOSS,
      chapterId: 1,
      weeklyBossId: 'weekly_solar_leo',
    }),
    'leo'
  );
  assert.equal(
    resolveBossProfileId({
      enemyKind: EnemyKind.ZODIAC_BOSS,
      chapterId: 1,
      weeklyBossId: 'weekly_solar_leo_blitz',
    }),
    'leo'
  );

  // Tower floors 3, 6, 9, 12 ... rotate across distinct Zodiac profiles
  const towerSet = new Set<string>();
  for (let floor = 3; floor <= 36; floor += 3) {
    towerSet.add(
      resolveBossProfileId({
        enemyKind: EnemyKind.ZODIAC_BOSS,
        chapterId: 1,
        isTowerMode: true,
        towerFloor: floor,
      })
    );
  }
  assert.equal(towerSet.size, 12, 'Endless Tower boss floors should cycle through all 12 Zodiac kits');

  // Boss Rush rounds 1..5 use 5 different Zodiac profiles
  const rushSet = new Set<string>();
  for (let round = 1; round <= 5; round++) {
    rushSet.add(
      resolveBossProfileId({
        enemyKind: EnemyKind.ZODIAC_BOSS,
        chapterId: 1,
        isBossRushMode: true,
        bossRushStage: round,
      })
    );
  }
  assert.equal(rushSet.size, 5);
});

test('All bosses stay actively mobile during combat navigation and never freeze at zero speed', () => {
  for (const profileId of ZODIAC_PROFILE_ORDER) {
    const state = createBossAiRuntimeState({
      enemyKind: EnemyKind.ZODIAC_BOSS,
      chapterId: ZODIAC_PROFILE_ORDER.indexOf(profileId) + 1,
      zodiacId: profileId,
    });

    let totalSpeed = 0;
    let x = 0;
    let z = -5;
    for (let step = 0; step < 40; step++) {
      const vel = stepBossMovement(state, {
        dt: 0.1,
        elapsed: step * 0.1,
        bossX: x,
        bossZ: z,
        playerX: 2.5,
        playerZ: 3.0,
        baseSpeed: 2.75,
        slowMult: 1.0,
        bossPhase: 1,
        arenaHalfW: 10.5,
        arenaHalfD: 12.2,
        isTelegraphing: false,
        telegraphMoveMult: 1.0,
      });
      const spd = Math.hypot(vel.vx, vel.vz);
      assert.ok(Number.isFinite(spd), `${profileId} velocity must be finite`);
      totalSpeed += spd;
      x += vel.vx * 0.1;
      z += vel.vz * 0.1;
    }
    const avgSpeed = totalSpeed / 40;
    // Old boss speed was 2.75 * 0.68 = 1.87 (and 0 while telegraphing). New bosses must average > 3.5!
    assert.ok(
      avgSpeed > 3.5,
      `${profileId} average combat speed (${avgSpeed.toFixed(2)}) should stay actively mobile (> 3.5)`
    );
  }
});

test('Phase II unlocks 2-step combo chains and Phase III unlocks 3-step crescendos with dodgeable windows', () => {
  // Leo Phase II: flame_mane_charge -> solar_pounce
  const leoState = createBossAiRuntimeState({
    enemyKind: EnemyKind.ZODIAC_BOSS,
    chapterId: 1,
    zodiacId: 'leo',
  });
  const p2First = planNextBossSkill(leoState, {
    bossX: 0,
    bossZ: -5,
    playerX: 1,
    playerZ: 4,
    playerVx: 4,
    playerVz: 0,
    bossPhase: 2,
    arenaHalfW: 10.5,
    arenaHalfD: 12.2,
    lowEndGpu: false,
  });
  assert.equal(p2First.skill.id, 'flame_mane_charge');
  assert.equal(p2First.hasFollowUp, true);
  assert.ok(p2First.telegraphDuration >= 0.44);

  const p2Second = planNextBossSkill(leoState, {
    bossX: 0,
    bossZ: 0,
    playerX: 2,
    playerZ: 4,
    playerVx: 3,
    playerVz: -1,
    bossPhase: 2,
    arenaHalfW: 10.5,
    arenaHalfD: 12.2,
    lowEndGpu: false,
  });
  assert.equal(p2Second.skill.id, 'solar_pounce');
  assert.equal(p2Second.isComboStep, true);
  assert.equal(p2Second.hasFollowUp, false);

  // Pisces Phase III: dream_blink_cross -> astral_cascade -> dream_nova_leap (3-step crescendo!)
  const piscesState = createBossAiRuntimeState({
    enemyKind: EnemyKind.ZODIAC_BOSS,
    chapterId: 12,
    zodiacId: 'pisces',
  });
  const s1 = planNextBossSkill(piscesState, {
    bossX: 0,
    bossZ: -5,
    playerX: 0,
    playerZ: 5,
    playerVx: 3,
    playerVz: 0,
    bossPhase: 3,
    arenaHalfW: 10.5,
    arenaHalfD: 12.2,
    lowEndGpu: false,
  });
  assert.equal(s1.skill.id, 'dream_blink_cross');
  const s2 = planNextBossSkill(piscesState, {
    bossX: 0,
    bossZ: 0,
    playerX: 0,
    playerZ: 5,
    playerVx: 3,
    playerVz: 0,
    bossPhase: 3,
    arenaHalfW: 10.5,
    arenaHalfD: 12.2,
    lowEndGpu: false,
  });
  assert.equal(s2.skill.id, 'astral_cascade');
  assert.equal(s2.multiSlamPoints.length, 4);
  const s3 = planNextBossSkill(piscesState, {
    bossX: 0,
    bossZ: 0,
    playerX: 0,
    playerZ: 5,
    playerVx: 3,
    playerVz: 0,
    bossPhase: 3,
    arenaHalfW: 10.5,
    arenaHalfD: 12.2,
    lowEndGpu: false,
  });
  assert.equal(s3.skill.id, 'dream_nova_leap');
  assert.equal(s3.hasFollowUp, false);

  // Guard break / phase shift clears transient state cleanly
  clearBossAiTransientCombat(piscesState);
  assert.equal(piscesState.comboQueue.length, 0);
  assert.equal(piscesState.activeAction, null);
  assert.equal(piscesState.visualHeightY, 0);
});

test('Capped lead-aiming and safe blink destinations never exceed arena bounds or tele-frag hero', () => {
  const lead = computeCappedLeadTarget({
    playerX: 9.8,
    playerZ: 11.5,
    playerVx: 12,
    playerVz: 12,
    leadTimeSec: 2.0, // oversized request gets safely capped
    arenaHalfW: 10.5,
    arenaHalfD: 12.2,
  });
  assert.ok(Math.abs(lead.x) <= 10.5 - 1.5);
  assert.ok(Math.abs(lead.z) <= 12.2 - 1.5);

  const blink = computeSafeBlinkDestination({
    bossX: 0,
    bossZ: -6,
    playerX: 9.2,
    playerZ: 10.5,
    playerVx: 4,
    playerVz: 2,
    strafeDir: 1,
    arenaHalfW: 10.5,
    arenaHalfD: 12.2,
  });
  assert.ok(Math.abs(blink.x) <= 10.5 - 2.0);
  assert.ok(Math.abs(blink.z) <= 12.2 - 2.0);
  const distToPlayer = Math.hypot(blink.x - 9.2, blink.z - 10.5);
  assert.ok(distToPlayer >= 3.8, `Blink must keep safe reaction spacing (got ${distToPlayer.toFixed(2)})`);
});

test('Low-End / Lite GPU budget caps hazards, multi-slams, and secondary projectiles while preserving full kits', () => {
  const highBudget = getBossPerformanceBudget(false);
  const liteBudget = getBossPerformanceBudget(true);
  assert.equal(highBudget.maxActiveHazards, 6);
  assert.equal(liteBudget.maxActiveHazards, 3);
  assert.ok(liteBudget.orbCountScale < highBudget.orbCountScale);
  assert.ok(liteBudget.particleScale < highBudget.particleScale);

  const highOrbs = scaleOrbCountForBudget(10, 2, false);
  const liteOrbs = scaleOrbCountForBudget(10, 2, true);
  assert.ok(liteOrbs < highOrbs && liteOrbs >= 4);

  // Sagittarius meteor cascade respects Lite multi-slam cap (3 instead of 4)
  const sagState = createBossAiRuntimeState({
    enemyKind: EnemyKind.ZODIAC_BOSS,
    chapterId: 9,
    zodiacId: 'sagittarius',
  });
  sagState.cycleIndex = 1; // starfall_trail
  const litePlan = planNextBossSkill(sagState, {
    bossX: 0,
    bossZ: -4,
    playerX: 0,
    playerZ: 3,
    playerVx: 4,
    playerVz: 0,
    bossPhase: 2,
    arenaHalfW: 10.5,
    arenaHalfD: 12.2,
    lowEndGpu: true,
  });
  assert.equal(litePlan.skill.id, 'starfall_trail');
  assert.equal(litePlan.multiSlamPoints.length, 3);

  // Recovery window stays readable yet crisp
  const rec = getBossRecoveryDuration(sagState, 1, 1.0);
  assert.ok(rec >= 0.85 && rec <= 1.25, `Expected crisp readable recovery, got ${rec}`);
});

test('HUD telegraph mapper surfaces signature Zodiac skill name and dodge cue while keeping legacy fallback', () => {
  const custom = mapBossTelegraphToHud({
    telegraphType: 'slam',
    telegraphTimer: 0.52,
    telegraphDuration: 0.74,
    bossPhase: 1,
    skillLabel: 'Vồ Mặt Trời',
    actionHint: 'Lướt Khỏi Vòng Lửa!',
  });
  assert.ok(custom);
  assert.equal(custom.label, 'Vồ Mặt Trời');
  assert.equal(custom.actionHint, 'Lướt Khỏi Vòng Lửa!');

  const legacy = mapBossTelegraphToHud({
    telegraphType: 'slam',
    telegraphTimer: 0.52,
    telegraphDuration: 0.74,
    bossPhase: 1,
  });
  assert.ok(legacy);
  assert.equal(legacy.label, 'Đập Trời Chấn Động');
});

test('Zero-root boss skills: every skill moves actively during telegraph, micro-dashes trigger, and anti-kiting gap-closes', () => {
  for (const [profileId, profile] of Object.entries(ZODIAC_BOSS_PROFILES)) {
    for (const [skillId, skill] of Object.entries(profile.skills)) {
      assert.ok(
        (skill.telegraphMoveMult ?? 0) >= 0.55,
        `${profileId}.${skillId} telegraphMoveMult (${skill.telegraphMoveMult}) must be >= 0.55 to prevent standing still`
      );
    }
  }

  // Verify boss stays briskly mobile even while telegraphing a skill
  const leo = createBossAiRuntimeState({
    enemyKind: EnemyKind.ZODIAC_BOSS,
    chapterId: 1,
    zodiacId: 'leo',
  });
  const teleVel = stepBossMovement(leo, {
    dt: 0.1,
    elapsed: 1.0,
    bossX: 0,
    bossZ: -4,
    playerX: 4,
    playerZ: 3,
    baseSpeed: 2.75,
    slowMult: 1.0,
    bossPhase: 2,
    arenaHalfW: 10.5,
    arenaHalfD: 12.2,
    isTelegraphing: true,
    telegraphMoveMult: 0.55,
  });
  const teleSpeed = Math.hypot(teleVel.vx, teleVel.vz);
  assert.ok(teleSpeed >= 2.2, `Boss telegraph speed (${teleSpeed.toFixed(2)}) must stay brisk (>= 2.2)`);

  // Verify Tactical Micro-Dash triggers during normal movement once cooldown elapses
  let microDashTriggered = false;
  let bx = -4;
  let bz = -6;
  for (let step = 0; step < 60; step++) {
    const v = stepBossMovement(leo, {
      dt: 0.1,
      elapsed: step * 0.1,
      bossX: bx,
      bossZ: bz,
      playerX: 3.5,
      playerZ: 4.0,
      baseSpeed: 2.75,
      slowMult: 1.0,
      bossPhase: 2,
      arenaHalfW: 10.5,
      arenaHalfD: 12.2,
      isTelegraphing: false,
      telegraphMoveMult: 1.0,
    });
    if (v.microDashTriggered) {
      microDashTriggered = true;
      assert.ok(Math.hypot(v.vx, v.vz) > 7.5, 'Micro-dash must burst faster than standard stride');
      break;
    }
    bx += v.vx * 0.1;
    bz += v.vz * 0.1;
  }
  assert.equal(microDashTriggered, true, 'Tactical Micro-Dash must trigger during combat navigation');

  // Verify Anti-Kiting Gap-Closer Override forces a gap-closer when player kites far away
  const leoKite = createBossAiRuntimeState({
    enemyKind: EnemyKind.ZODIAC_BOSS,
    chapterId: 1,
    zodiacId: 'leo',
  });
  leoKite.cycleIndex = 2; // normally solar_flare_cross (non-gap-closer)
  const antiKitePlan = planNextBossSkill(leoKite, {
    bossX: -8,
    bossZ: -9,
    playerX: 8,
    playerZ: 9, // ~24m away, way beyond preferredRangeMax + 1.5m
    playerVx: 2,
    playerVz: 2,
    bossPhase: 1,
    arenaHalfW: 10.5,
    arenaHalfD: 12.2,
    lowEndGpu: false,
  });
  assert.equal(antiKitePlan.antiKiteTriggered, true);
  assert.ok(
    ['leap_slam', 'dash_charge', 'blink_strike'].includes(antiKitePlan.skill.kind),
    `Expected gap-closer skill on anti-kite override, got ${antiKitePlan.skill.kind}`
  );
});

test('Boss CC resistance, innate astral armor, phase lethality, and Timed Enrage scale cleanly', () => {
  // Chill slow is clamped to max 15% slow (0.85 speed floor) for bosses, untouched for regular mobs
  assert.equal(clampBossChillSlowMult(0.42, true), 0.85);
  assert.equal(clampBossChillSlowMult(0.65, true), 0.85);
  assert.equal(clampBossChillSlowMult(0.92, true), 0.92);
  assert.equal(clampBossChillSlowMult(0.42, false), 0.42);

  // Guard Break stun cap + immunity constants
  assert.equal(BOSS_GUARD_BREAK_STUN_SEC, 2.0);
  assert.equal(BOSS_STUN_IMMUNITY_SEC, 10.0);

  // Innate Astral Armor increases from Ch.1 (16%) -> Ch.12 (26%) for bosses, 0 for regular mobs
  const arm1 = computeBossInnateArmorReduction(1, true);
  const arm6 = computeBossInnateArmorReduction(6, true);
  const arm12 = computeBossInnateArmorReduction(12, true);
  assert.ok(arm1 >= 0.15 && arm1 <= 0.17);
  assert.ok(arm6 > arm1 && arm12 > arm6);
  assert.ok(arm12 <= 0.27);
  assert.equal(computeBossInnateArmorReduction(6, false), 0);

  // Phase damage lethality escalates across Phase I / II / III
  assert.equal(computeBossPhaseDamageMult(1), 1.0);
  assert.ok(computeBossPhaseDamageMult(2) >= 1.15);
  assert.ok(computeBossPhaseDamageMult(3) >= 1.3);

  // Timed Enrage stays dormant before limit and escalates sharply once triggered
  const calm = computeBossEnrageModifiers(30, 60);
  assert.equal(calm.active, false);
  assert.equal(calm.remainingSec, 30);
  assert.equal(calm.damageMult, 1.0);

  const enragedAtTrigger = computeBossEnrageModifiers(60, 60);
  assert.equal(enragedAtTrigger.active, true);
  assert.equal(enragedAtTrigger.remainingSec, 0);
  assert.ok(enragedAtTrigger.damageMult >= 1.7);
  assert.ok(enragedAtTrigger.speedMult >= 1.3);
  assert.ok(enragedAtTrigger.cooldownMult <= 0.72);

  const enragedLate = computeBossEnrageModifiers(80, 60);
  assert.ok(enragedLate.damageMult > enragedAtTrigger.damageMult + 0.45);
});

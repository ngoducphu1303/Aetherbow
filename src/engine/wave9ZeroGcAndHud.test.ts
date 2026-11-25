import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CombatFrameScratchPool,
  type EnemySourceLike,
} from './combatScratchBuffers';
import {
  resolveHudVisualFeedbackPolicy,
  resolveTopCombatBanner,
} from './combatHudBanners';
import { ZODIAC_BOSS_PHASE_SIGNATURES } from './tacticalCombatChoreography';

interface MockEnemy extends EnemySourceLike {
  name: string;
}

function makeEnemy(id: number, overrides: Partial<MockEnemy> = {}): MockEnemy {
  return {
    id,
    name: `Mob-${id}`,
    x: id * 1.5,
    z: -id,
    hp: 400,
    maxHp: 500,
    isBoss: false,
    isElite: false,
    isTrainingDummy: false,
    dead: false,
    radius: 0.7,
    spawnTimer: 0,
    stunTimer: 0,
    telegraphType: 'none',
    telegraphTimer: 0,
    slamX: 0,
    slamZ: 0,
    slamRadius: 0,
    aimX: 0,
    aimZ: 1,
    ...overrides,
  };
}

test('W9-1: CombatFrameScratchPool reuses backing objects across 600 frames with zero per-frame allocations', () => {
  const pool = new CombatFrameScratchPool<MockEnemy>();

  const arrows = [
    { active: true, x: 1, z: 2, vx: 10, vz: 0 },
    { active: false, x: 9, z: 9, vx: 0, vz: 0 },
    { active: true, x: -3, z: 4, vx: 0, vz: -12 },
  ];
  const orbs = [
    { active: true, x: 2, z: -2, vx: -5, vz: 3 },
    { active: false, x: 0, z: 0, vx: 0, vz: 0 },
  ];
  const lootOrbs = [
    { active: true, kind: 'heal', x: 3, z: 1 },
    { active: true, kind: 'gold', x: -1, z: -1 },
  ];
  const obstacles = [
    { x: 4, z: 4, radius: 1.1, intact: true },
    { x: -4, z: -4, radius: 1.1, intact: false },
  ];
  const enemies = [
    makeEnemy(1, { telegraphType: 'slam', telegraphTimer: 0.9, slamX: 2, slamZ: 3, slamRadius: 2.8 }),
    makeEnemy(2, { telegraphType: 'lane', telegraphTimer: 1.1, laneAngles: [0, Math.PI / 2], isBoss: true }),
    makeEnemy(3, { spawnTimer: 0.4 }),
  ];
  const traps = [{ x: 1, z: -3, cooldown: 0, kind: 'solar_crystal' }];

  // Frame 1 warmup
  pool.fillActiveArrows(arrows);
  pool.fillCoopFrameSnapshots(enemies, orbs, obstacles);
  pool.fillAutoPilotFrameSnapshots(enemies, orbs, lootOrbs, obstacles, traps, () => ({
    aoeRadius: 4.5,
    label: 'Trụ Nhật Tinh',
  }));

  const arrowRef0 = pool.activeArrows[0];
  const bulletRef0 = pool.incomingBullets[0];
  const coopTeleRef0 = pool.coopTelegraphs[0];
  const coopCandRef0 = pool.coopCandidates[0];
  const autoEnemyRef0 = pool.autoEnemies[0];
  const autoTeleRef0 = pool.autoTelegraphs[0];
  const autoHealRef0 = pool.autoHealOrbs[0];
  const autoTrapRef0 = pool.autoTraps[0];
  const obstacleRef0 = pool.intactObstacles[0];

  assert.equal(pool.activeArrows.length, 2);
  assert.equal(pool.coopTelegraphs.length, 1);
  assert.equal(pool.coopCandidates.length, 3);
  assert.equal(pool.autoEnemies.length, 2);
  assert.equal(pool.autoTelegraphs.length, 3); // 1 slam + 2 lanes
  assert.equal(pool.autoHealOrbs.length, 1);
  assert.equal(pool.intactObstacles.length, 1);
  assert.equal(pool.autoTraps.length, 1);

  // Run 600 frames mutating coordinates and verify every single object reference is reused in-place
  for (let frame = 0; frame < 600; frame++) {
    arrows[0].x = frame * 0.1;
    orbs[0].z = -frame * 0.05;
    enemies[0].slamX = frame * 0.02;

    pool.fillActiveArrows(arrows);
    pool.fillCoopFrameSnapshots(enemies, orbs, obstacles);
    pool.fillAutoPilotFrameSnapshots(enemies, orbs, lootOrbs, obstacles, traps, () => ({
      aoeRadius: 4.5,
      label: 'Trụ Nhật Tinh',
    }));

    assert.strictEqual(pool.activeArrows[0], arrowRef0);
    assert.strictEqual(pool.incomingBullets[0], bulletRef0);
    assert.strictEqual(pool.coopTelegraphs[0], coopTeleRef0);
    assert.strictEqual(pool.coopCandidates[0], coopCandRef0);
    assert.strictEqual(pool.autoEnemies[0], autoEnemyRef0);
    assert.strictEqual(pool.autoTelegraphs[0], autoTeleRef0);
    assert.strictEqual(pool.autoHealOrbs[0], autoHealRef0);
    assert.strictEqual(pool.autoTraps[0], autoTrapRef0);
    assert.strictEqual(pool.intactObstacles[0], obstacleRef0);
  }

  assert.equal(pool.activeArrows[0].x, 599 * 0.1);
  assert.equal(pool.coopTelegraphs[0].x, 599 * 0.02);

  // Verify isolated AoE scan scratch arrays never alias each other
  pool.copyEnemiesInto(enemies, pool.reactionScanScratch);
  pool.copyEnemiesInto(enemies.slice(0, 1), pool.chainScanScratch);
  assert.equal(pool.reactionScanScratch.length, 3);
  assert.equal(pool.chainScanScratch.length, 1);
});

test('W9-2: resolveHudVisualFeedbackPolicy enforces Anti-Flash, Reduced Motion, and Colorblind safety cleanly', () => {
  const normalLow = resolveHudVisualFeedbackPolicy({
    hp: 120,
    hpPct: 24,
    reduceScreenFlash: false,
    reducedMotion: false,
    colorblindTelegraphs: false,
  });
  assert.equal(normalLow.showLowHpVignette, true);
  assert.equal(normalLow.isCriticalLowHp, false);
  assert.equal(normalLow.animateLowHpVignette, true);
  assert.equal(normalLow.suppressFullscreenFlash, false);
  assert.equal(normalLow.flashOpacityScale, 1.0);
  assert.ok(normalLow.lowHpBoxShadow.includes('rgba(225, 29, 72'));

  const antiFlashCrit = resolveHudVisualFeedbackPolicy({
    hp: 40,
    hpPct: 10,
    reduceScreenFlash: true,
    reducedMotion: false,
    colorblindTelegraphs: true,
  });
  assert.equal(antiFlashCrit.showLowHpVignette, true);
  assert.equal(antiFlashCrit.isCriticalLowHp, true);
  assert.equal(antiFlashCrit.animateLowHpVignette, false);
  assert.equal(antiFlashCrit.suppressFullscreenFlash, true);
  assert.equal(antiFlashCrit.flashOpacityScale, 0.24);
  assert.equal(antiFlashCrit.showDirectionalHitArc, true);
  assert.equal(antiFlashCrit.useColorblindSymbols, true);
  assert.ok(
    antiFlashCrit.lowHpBoxShadow.includes('rgba(245, 158, 11'),
    'Colorblind mode must switch low-HP vignette away from pure red to high-contrast amber'
  );

  const reducedOnly = resolveHudVisualFeedbackPolicy({
    hp: 90,
    hpPct: 20,
    reduceScreenFlash: false,
    reducedMotion: true,
    colorblindTelegraphs: false,
  });
  assert.equal(reducedOnly.animateLowHpVignette, false);
  assert.equal(reducedOnly.suppressFullscreenFlash, false);

  const healthy = resolveHudVisualFeedbackPolicy({ hp: 500, hpPct: 80 });
  assert.equal(healthy.showLowHpVignette, false);
  assert.equal(healthy.animateLowHpVignette, false);
});

test('W9-3: resolveTopCombatBanner reflects custom PC keybinds, colorblind symbols, and all 12 Zodiac Boss Phase II/III signatures', () => {
  // Custom keybinds on Phase Counter & Execution Finisher banners
  const counterBanner = resolveTopCombatBanner(
    {
      heroName: 'Aurelia',
      phaseCounterReady: true,
      phaseCounterWindowSec: 2.0,
      phaseCounterWindowTotalSec: 2.5,
    },
    null,
    false,
    { ultKeyLabel: 'R', heavyBreakKeyLabel: 'G', colorblindTelegraphs: true }
  );
  assert.ok(counterBanner);
  assert.ok(counterBanner.title.includes('R'), `Expected custom ult key R in "${counterBanner.title}"`);
  assert.equal(counterBanner.colorblindSymbol, '◈');

  const finisherBanner = resolveTopCombatBanner(
    {
      heroName: 'Aurelia',
      finisherReadyTargetName: 'Aries Hỏa Ngục',
      finisherTargetHpPct: 14,
    },
    null,
    false,
    { ultKeyLabel: 'R', heavyBreakKeyLabel: 'G', colorblindTelegraphs: true }
  );
  assert.ok(finisherBanner);
  assert.equal(finisherBanner.detail, '14% · Bấm G / R');
  assert.equal(finisherBanner.colorblindSymbol, '✦');

  // All 12 chapters render their bespoke Zodiac Boss Phase II & III signatures
  const seenP2 = new Set<string>();
  const seenP3 = new Set<string>();
  for (let ch = 1; ch <= 12; ch++) {
    const p2 = resolveTopCombatBanner(
      { heroName: 'Aurelia', chapterId: ch, bossPhaseTwoBannerTimer: 2.0 },
      null,
      false
    );
    const p3 = resolveTopCombatBanner(
      { heroName: 'Aurelia', chapterId: ch, bossPhaseThreeBannerTimer: 2.0 },
      null,
      false,
      { colorblindTelegraphs: true }
    );
    assert.ok(p2 && p3);
    assert.ok(
      p2.kicker.startsWith(ZODIAC_BOSS_PHASE_SIGNATURES[ch].phase2Title.slice(0, 12)),
      `Ch.${ch} Phase II banner should use bespoke signature`
    );
    assert.ok(
      p3.kicker.startsWith(ZODIAC_BOSS_PHASE_SIGNATURES[ch].phase3Title.slice(0, 12)),
      `Ch.${ch} Phase III banner should use bespoke signature`
    );
    assert.equal(p3.colorblindSymbol, '⚡');
    seenP2.add(p2.kicker);
    seenP3.add(p3.kicker);
  }
  assert.equal(seenP2.size, 12);
  assert.equal(seenP3.size, 12);
});

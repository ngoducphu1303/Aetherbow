import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ARENA_MECHANISM_SPECS,
  getChapterArenaMechanismSpec,
  resolveChapterArenaMechanismKind,
  resolveMechanismRenderBudget,
  spawnChapterArenaMechanisms,
  stepArenaMechanisms,
  tryTriggerArenaMechanism,
} from '../src/engine/chapterArenaMechanisms.ts';

test('Chapters 1-12 map deterministically to 4 distinct Zodiac Arena Mechanisms', () => {
  assert.equal(resolveChapterArenaMechanismKind(1), 'solar_obelisk');
  assert.equal(resolveChapterArenaMechanismKind(2), 'magma_vent');
  assert.equal(resolveChapterArenaMechanismKind(3), 'emerald_crystal');
  assert.equal(resolveChapterArenaMechanismKind(4), 'astral_prism');
  for (let ch = 1; ch <= 12; ch++) {
    const spec = getChapterArenaMechanismSpec(ch);
    assert.ok(spec.name.length > 0);
    assert.ok(spec.cooldownSec >= 10 && spec.cooldownSec <= 20);
  }
});

test('spawnChapterArenaMechanisms avoids center spawn, arena walls, and all obstacles', () => {
  const obstacles = [
    { x: -4.5, z: -2.0, radius: 1.4 },
    { x: 4.5, z: 2.0, radius: 1.4 },
    { x: 0, z: -4.5, radius: 1.2 },
  ];
  const spawned = spawnChapterArenaMechanisms({
    chapterId: 3,
    stageIndex: 4,
    arenaHalfW: 11,
    arenaHalfD: 11,
    obstacles,
    isBossStage: true,
  });
  assert.equal(spawned.length, 2);
  for (const m of spawned) {
    assert.ok(Math.hypot(m.x, m.z) >= 3.0, 'Must stay clear of center player spawn');
    assert.ok(Math.abs(m.x) <= 9.0 && Math.abs(m.z) <= 9.0, 'Must stay inside arena walls');
    for (const obs of obstacles) {
      assert.ok(
        Math.hypot(m.x - obs.x, m.z - obs.z) >= obs.radius + 1.5,
        'Must stay clear of obstacle pillars'
      );
    }
  }
});

test('Arena Mechanism trigger, cooldown enforcement, and recharge lifecycle work deterministically', () => {
  const mechs = spawnChapterArenaMechanisms({
    chapterId: 2,
    stageIndex: 1,
    arenaHalfW: 11,
    arenaHalfD: 11,
    obstacles: [],
    count: 1,
  });
  const m = mechs[0];
  const spec = ARENA_MECHANISM_SPECS[m.kind];

  const miss = tryTriggerArenaMechanism(mechs, m.x + 8, m.z + 8);
  assert.equal(miss, null);

  const hit = tryTriggerArenaMechanism(mechs, m.x + 0.5, m.z);
  assert.ok(hit && hit.triggered);
  assert.equal(hit.kind, 'magma_vent');
  assert.equal(m.state, 'cooldown');
  assert.equal(m.triggerCount, 1);

  // Cannot re-trigger while on cooldown
  assert.equal(tryTriggerArenaMechanism(mechs, m.x, m.z), null);

  // Advances past cooldown and becomes ready again
  stepArenaMechanisms(mechs, spec.cooldownSec + 0.2);
  assert.equal(m.state, 'ready');
  assert.equal(m.cooldownRemaining, 0);
});

test('Dell Latitude E5430 Lite & Watchdog Stage >= 2 enforce zero extra PointLights and low-poly budget', () => {
  const highBudget = resolveMechanismRenderBudget({ isLiteMode: false, watchdogStage: 0 });
  const e5430Budget = resolveMechanismRenderBudget({ isLiteMode: true, watchdogStage: 2 });
  assert.equal(highBudget.allowPointLight, false);
  assert.equal(e5430Budget.allowPointLight, false);
  assert.equal(e5430Budget.allowAmbientOrbiters, false);
  assert.ok(e5430Budget.cylinderSegments < highBudget.cylinderSegments);
  assert.ok(e5430Budget.ringSegments < highBudget.ringSegments);
});

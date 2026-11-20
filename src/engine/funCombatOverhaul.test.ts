import test from 'node:test';
import assert from 'node:assert/strict';
import { EnemyKind } from '../types/game';
import {
  advanceComboBeat,
  computeBossPhase2TotemPositions,
  computeChainDetonationSplash,
  computeHeavyBreakStrikeSpec,
  isHitBlockedByFrontShield,
  resolveEnemyTacticalRole,
  resolveMoveShootIntervalMult,
  rollRoomChaosEvent,
  shouldTriggerSurpriseAmbush,
} from './funCombatOverhaul';

test('resolveMoveShootIntervalMult enables kiting fire while moving', () => {
  assert.equal(resolveMoveShootIntervalMult(false), 1.0);
  assert.ok(resolveMoveShootIntervalMult(true) > 1.0 && resolveMoveShootIntervalMult(true) < 1.6);
});

test('advanceComboBeat cycles 1 -> 2 -> 3 -> 4(finisher) -> 1 with damage & FOV punch', () => {
  const b1 = advanceComboBeat(1);
  assert.equal(b1.isFinisher, false);
  assert.equal(b1.nextBeat, 2);

  const b3 = advanceComboBeat(3);
  assert.equal(b3.isFinisher, false);
  assert.equal(b3.nextBeat, 4);

  const b4 = advanceComboBeat(4);
  assert.equal(b4.firedBeat, 4);
  assert.equal(b4.isFinisher, true);
  assert.equal(b4.nextBeat, 1);
  assert.ok(b4.damageMult >= 1.5);
  assert.ok(b4.fovKick < 0);
});

test('computeHeavyBreakStrikeSpec scales with combo and breaks boss stagger gauge', () => {
  const spec = computeHeavyBreakStrikeSpec(200, 30, true);
  assert.ok(spec.damage >= 480);
  assert.ok(spec.bossShieldDamageRatio >= 0.35);
  assert.ok(spec.radius >= 4.5);
  assert.ok(spec.hitstopSec > 0.03);
});

test('computeChainDetonationSplash amplifies elite & finisher chain blasts', () => {
  const normal = computeChainDetonationSplash(100, false, false);
  const elite = computeChainDetonationSplash(100, true, true);
  assert.ok(normal.triggered && normal.splashDamage > 0);
  assert.ok(elite.splashDamage > normal.splashDamage);
  assert.ok(elite.radius > normal.radius);
});

test('resolveEnemyTacticalRole diversifies golems, skirmishers, and snipers cleanly', () => {
  assert.equal(resolveEnemyTacticalRole(EnemyKind.GOLEM, false, false, 0), 'shield_bearer');
  assert.equal(resolveEnemyTacticalRole(EnemyKind.GOLEM, false, false, 1), 'charger');
  assert.equal(resolveEnemyTacticalRole(EnemyKind.SHADOW_STALKER, false, false, 0), 'arcane_sniper');
  assert.equal(resolveEnemyTacticalRole(EnemyKind.ZODIAC_BOSS, true, false, 0), 'standard');
});

test('isHitBlockedByFrontShield blocks frontal arrows but allows flanks and Heavy Break bypass', () => {
  // Enemy at origin facing +Z (yaw = 0); projectile coming from +Z (front)
  assert.equal(isHitBlockedByFrontShield(0, 0, 4, 0, 0, false), true);
  // Projectile flanking from behind (-Z)
  assert.equal(isHitBlockedByFrontShield(0, 0, -4, 0, 0, false), false);
  // Heavy Break / Counter bypasses frontal guard
  assert.equal(isHitBlockedByFrontShield(0, 0, 4, 0, 0, true), false);
});

test('rollRoomChaosEvent guarantees energetic stage 1 opening and boss storm', () => {
  const opening = rollRoomChaosEvent(1, 0, false, 0.25);
  assert.ok(opening && (opening.id === 'wind_frenzy' || opening.id === 'solar_orb_surge'));

  const bossEv = rollRoomChaosEvent(3, 3, true, 0.99);
  assert.equal(bossEv?.id, 'chaos_lightning');
});

test('shouldTriggerSurpriseAmbush never fires on boss stages or stage 0', () => {
  assert.equal(shouldTriggerSurpriseAmbush(true, 3, false, 0.0), false);
  assert.equal(shouldTriggerSurpriseAmbush(false, 0, false, 0.0), false);
  assert.equal(shouldTriggerSurpriseAmbush(false, 1, false, 0.3), true);
});

test('computeBossPhase2TotemPositions stays safely inside arena bounds', () => {
  const pts = computeBossPhase2TotemPositions(7.5, -6, 9, 10);
  assert.equal(pts.length, 2);
  pts.forEach((p) => {
    assert.ok(Math.abs(p.x) <= 7.0);
    assert.ok(Math.abs(p.z) <= 7.6);
  });
});

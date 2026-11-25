import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSpatialDistanceGain,
  SFX_CATEGORY_SPECS,
  SfxPriorityMixer,
} from './sfxPriorityMixer';

describe('Wave 5 Spatial Distance SFX & Attack-Dodged Priority Mixing', () => {
  it('computes smooth distance roll-off inside range and culls beyond maxRadius', () => {
    assert.equal(computeSpatialDistanceGain(0), 1);
    assert.equal(computeSpatialDistanceGain(4), 1);

    const mid = computeSpatialDistanceGain(15);
    assert.ok(mid > 0.55 && mid < 0.66, `expected midpoint gain ~0.61, got ${mid}`);

    const farEdge = computeSpatialDistanceGain(25.9);
    assert.ok(farEdge >= 0.22 && farEdge <= 0.24, `expected near-max gain ~0.22, got ${farEdge}`);

    assert.equal(computeSpatialDistanceGain(26), 0);
    assert.equal(computeSpatialDistanceGain(40), 0);
  });

  it('culls out-of-range impacts without consuming dedupe window or active voices', () => {
    const mixer = new SfxPriorityMixer();
    const culled = mixer.requestPlay('hit', 1000, 30);
    assert.equal(culled.allowed, false);
    assert.equal(culled.reason, 'out_of_range');
    assert.equal(culled.gainScale, 0);
    assert.equal(culled.activeVoices, 0);

    // Immediately playing a nearby hit at the exact same timestamp must succeed (not deduped)
    const nearby = mixer.requestPlay('hit', 1000, 2);
    assert.equal(nearby.allowed, true);
    assert.equal(nearby.reason, 'played');
    assert.equal(nearby.gainScale, 1);
    assert.equal(nearby.activeVoices, 1);
  });

  it('scales gainScale smoothly by distance while staying 100% backward compatible when omitted', () => {
    const mixer = new SfxPriorityMixer();
    const closeHit = mixer.requestPlay('shield_hit', 1000);
    assert.equal(closeHit.allowed, true);
    assert.equal(closeHit.gainScale, 1);

    const distantHit = mixer.requestPlay('shield_hit', 1300, 20);
    assert.equal(distantHit.allowed, true);
    assert.ok(
      distantHit.gainScale < closeHit.gainScale && distantHit.gainScale >= 0.35,
      `expected attenuated gainScale, got ${distantHit.gainScale}`
    );
  });

  it('supports attack_dodged voice gating with higher priority than basic hits', () => {
    assert.ok(SFX_CATEGORY_SPECS.attack_dodged.priority > SFX_CATEGORY_SPECS.hit.priority);
    const mixer = new SfxPriorityMixer({ lowEndMode: true });
    const first = mixer.requestPlay('attack_dodged', 2000, 3);
    assert.equal(first.allowed, true);
    assert.equal(first.category, 'attack_dodged');

    // Immediate duplicate within dedupeMs is suppressed
    const dup = mixer.requestPlay('attack_dodged', 2020, 3);
    assert.equal(dup.allowed, false);
    assert.equal(dup.reason, 'deduped');
  });
});

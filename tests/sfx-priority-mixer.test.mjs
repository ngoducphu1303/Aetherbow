import test from 'node:test';
import assert from 'node:assert/strict';
import { SFX_CATEGORY_SPECS, SfxPriorityMixer } from '../src/audio/sfxPriorityMixer.ts';

test('SfxPriorityMixer enforces short dedupe windows and produces deterministic pitch/filter variants', () => {
  const mixer = new SfxPriorityMixer();
  const first = mixer.requestPlay('bow_shoot', 1000);
  assert.equal(first.allowed, true);
  assert.equal(first.reason, 'played');
  assert.ok(first.gainScale > 0 && first.gainScale <= 1);

  // Immediately repeating within dedupe window gets cleanly dropped
  const dup = mixer.requestPlay('bow_shoot', 1015);
  assert.equal(dup.allowed, false);
  assert.equal(dup.reason, 'deduped');

  // After dedupe expires, next shot plays with a distinct pitch/filter variant
  const second = mixer.requestPlay('bow_shoot', 1060);
  assert.equal(second.allowed, true);
  assert.equal(second.variantIndex, 2);
  assert.notEqual(second.pitchMult, first.pitchMult);
});

test('SfxPriorityMixer preempts lower-priority SFX when voice cap is full (Boss Interrupt beats footsteps/hits)', () => {
  const mixer = new SfxPriorityMixer({ lowEndMode: true });
  assert.equal(mixer.getMaxVoices(), 10);

  // Fill all 10 voices using low/mid priority categories spaced beyond dedupe
  const fillCategories = [
    'footstep',
    'pickup',
    'pickup',
    'hit',
    'hit',
    'hit',
    'bow_shoot',
    'bow_shoot',
    'shield_hit',
    'dash',
  ];
  let t = 100;
  for (let i = 0; i < fillCategories.length; i++) {
    t += 8;
    // ensure different timestamps past dedupe for repeated categories
    const res = mixer.requestPlay(fillCategories[i], t + i * 65);
    assert.equal(res.allowed, true, `Expected slot ${i} (${fillCategories[i]}) to play`);
  }

  // Now push a fresh burst at t2 while voices are still active
  const fullMixer = new SfxPriorityMixer({ lowEndMode: true });
  const cats = [
    'pickup',
    'hit',
    'bow_shoot',
    'dash',
    'shield_hit',
    'enemy_defeated',
    'sword_strike',
    'crit_hit',
    'shockwave',
    'meteor_impact',
  ];
  for (let i = 0; i < cats.length; i++) {
    assert.equal(fullMixer.requestPlay(cats[i], 500 + i).allowed, true);
  }
  assert.equal(fullMixer.getStats(515).activeVoices, 10);

  // Footstep (priority 15) must be rejected when full
  const blockedFootstep = fullMixer.requestPlay('footstep', 515);
  assert.equal(blockedFootstep.allowed, false);
  assert.equal(blockedFootstep.reason, 'voice_capped');

  // Boss Interrupt (priority 100) must preempt the lowest active voice and play immediately
  const interrupt = fullMixer.requestPlay('boss_interrupt', 516);
  assert.equal(interrupt.allowed, true);
  assert.equal(interrupt.reason, 'preempted_lower');
  assert.ok(interrupt.priority > SFX_CATEGORY_SPECS.pickup.priority);
  assert.equal(fullMixer.getStats(516).totalPreempted, 1);
});

test('SfxPriorityMixer reduces gain smoothly under heavy voice load and respects low-end mode', () => {
  const mixer = new SfxPriorityMixer();
  const solo = mixer.requestPlay('crit_hit', 100);
  mixer.requestPlay('shockwave', 105);
  mixer.requestPlay('meteor_impact', 110);
  mixer.requestPlay('sword_strike', 115);
  mixer.requestPlay('enemy_defeated', 120);
  const crowded = mixer.requestPlay('hit', 125);
  assert.equal(solo.allowed, true);
  assert.equal(crowded.allowed, true);
  assert.ok(crowded.gainScale < solo.gainScale, 'Crowded low-priority hit should attenuate to prevent clipping');

  mixer.setLowEndMode(true);
  assert.equal(mixer.getMaxVoices(), 10);
});

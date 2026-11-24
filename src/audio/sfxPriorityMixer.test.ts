import assert from 'node:assert/strict';
import test from 'node:test';
import { SfxPriorityMixer } from './sfxPriorityMixer';

test('SfxPriorityMixer: enforces dedupe window on rapid hit bursts without dropping critical interrupts', () => {
  const mixer = new SfxPriorityMixer({ maxVoices: 8, lowEndMode: false });

  const h1 = mixer.requestPlay('hit', 1000);
  assert.equal(h1.allowed, true);
  assert.equal(h1.reason, 'ok');

  // Within 34ms dedupe window -> rejected cleanly
  const h2 = mixer.requestPlay('hit', 1015);
  assert.equal(h2.allowed, false);
  assert.equal(h2.reason, 'deduped');

  // After dedupe window -> accepted with next pitch variant
  const h3 = mixer.requestPlay('hit', 1045);
  assert.equal(h3.allowed, true);
  assert.notEqual(h3.variantIndex, h1.variantIndex);
  assert.notEqual(h3.pitchMult, h1.pitchMult);

  // Critical boss_interrupt has 0ms dedupe and always plays
  const bi1 = mixer.requestPlay('boss_interrupt', 1050);
  const bi2 = mixer.requestPlay('boss_interrupt', 1051);
  assert.equal(bi1.allowed, true);
  assert.equal(bi2.allowed, true);
});

test('SfxPriorityMixer: high-priority Boss Interrupt preempts low-priority voices at voice cap', () => {
  const mixer = new SfxPriorityMixer({ maxVoices: 4, lowEndMode: false });

  // Fill all 4 voices with low/normal priority sounds spaced past dedupe windows
  assert.equal(mixer.requestPlay('footstep', 1000).allowed, true);
  assert.equal(mixer.requestPlay('pickup', 1005).allowed, true);
  assert.equal(mixer.requestPlay('hit', 1010).allowed, true);
  assert.equal(mixer.requestPlay('bow_shoot', 1015).allowed, true);
  assert.equal(mixer.getStats(1020).activeVoices, 4);

  // Another low-priority sound is dropped cleanly by voice_cap
  const dropped = mixer.requestPlay('ui_click', 1020);
  assert.equal(dropped.allowed, false);
  assert.equal(dropped.reason, 'voice_cap');

  // Critical boss_interrupt steals lowest-priority voice ('footstep')
  const stolen = mixer.requestPlay('boss_interrupt', 1022);
  assert.equal(stolen.allowed, true);
  assert.equal(stolen.reason, 'stolen_voice');
  assert.equal(stolen.stolenCategory, 'footstep');
  assert.equal(mixer.getStats(1022).activeVoices, 4);
  assert.equal(mixer.getStats(1022).stolenVoiceCount, 1);
});

test('SfxPriorityMixer: low-end mode tightens voice cap for Dell Latitude E5430 CPU safety', () => {
  const mixer = new SfxPriorityMixer({ lowEndMode: true });
  assert.equal(mixer.getStats().maxVoices, 6);

  mixer.setLowEndMode(false);
  assert.equal(mixer.getStats().maxVoices, 10);

  mixer.setLowEndMode(true);
  assert.equal(mixer.getStats().maxVoices, 6);
});

test('SfxPriorityMixer: expires finished voices automatically and cycles hit variants deterministically', () => {
  const mixer = new SfxPriorityMixer({ maxVoices: 3 });

  const pitches = new Set<number>();
  for (let i = 0; i < 5; i++) {
    const res = mixer.requestPlay('crit_hit', 2000 + i * 200);
    assert.equal(res.allowed, true);
    pitches.add(res.pitchMult);
  }
  assert.ok(pitches.size >= 4, 'Expected at least 4 distinct crit hit pitch variants');
  assert.equal(mixer.getStats(5000).activeVoices, 0);
});

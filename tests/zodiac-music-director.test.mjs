import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInterruptFanfareNotes,
  resolveChapterBossStepDuration,
  resolveZodiacChapterMusic,
} from '../src/audio/zodiacMusicDirector.ts';

test('Chapters 1-4 have distinct Zodiac musical themes, melodies, and tempos', () => {
  const ch1 = resolveZodiacChapterMusic(1);
  const ch2 = resolveZodiacChapterMusic(2);
  const ch3 = resolveZodiacChapterMusic(3);
  const ch4 = resolveZodiacChapterMusic(4);

  assert.equal(ch1.zodiacName, 'Sư Tử');
  assert.equal(ch2.zodiacName, 'Bạch Dương');
  assert.equal(ch3.zodiacName, 'Kim Ngưu');
  assert.equal(ch4.zodiacName, 'Song Tử');

  const signatures = new Set([
    ch1.combatMelody.join(','),
    ch2.combatMelody.join(','),
    ch3.combatMelody.join(','),
    ch4.combatMelody.join(','),
  ]);
  assert.equal(signatures.size, 4, 'Chapters 1-4 must have 4 distinct combat melodies');
});

test('Chapters 1-12 all have 12 distinct bespoke Zodiac musical themes, melodies, and boss phase acceleration', () => {
  const combatSignatures = new Set();
  const bossSignatures = new Set();
  const keys = new Set();
  for (let ch = 1; ch <= 12; ch++) {
    const profile = resolveZodiacChapterMusic(ch);
    assert.equal(profile.chapterId, ch);
    assert.equal(profile.combatMelody.length, 16);
    assert.equal(profile.bossMelody.length, 16);
    assert.equal(profile.combatBass.length, 4);
    assert.equal(profile.bossBass.length, 4);
    assert.ok(profile.musicalScale.length > 0);
    combatSignatures.add(profile.combatMelody.join(','));
    bossSignatures.add(profile.bossMelody.join(','));
    keys.add(profile.zodiacKey);

    const p1 = resolveChapterBossStepDuration(ch, 1);
    const p2 = resolveChapterBossStepDuration(ch, 2);
    const p3 = resolveChapterBossStepDuration(ch, 3);
    assert.ok(p1 > p2 && p2 > p3, `Chapter ${ch} boss tempo should accelerate across phases 1->2->3`);
  }
  assert.equal(combatSignatures.size, 12, 'All 12 chapters must have 12 distinct combat melodies');
  assert.equal(bossSignatures.size, 12, 'All 12 chapters must have 12 distinct boss melodies');
  assert.equal(keys.size, 12, 'All 12 chapters must have unique zodiac keys');
});

test('Interrupt fanfare produces ascending multi-note brass/chime stinger', () => {
  const notes = buildInterruptFanfareNotes();
  assert.ok(notes.length >= 4);
  for (let i = 1; i < notes.length; i++) {
    assert.ok(notes[i].freq > notes[i - 1].freq);
    assert.ok(notes[i].delay > notes[i - 1].delay);
  }
});

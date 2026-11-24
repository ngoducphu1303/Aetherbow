export interface ZodiacChapterMusicProfile {
  chapterId: number;
  zodiacKey: string;
  combatStepSec: number;
  bossBaseStepSec: number;
  leadWave: OscillatorType;
  bossWave: OscillatorType;
  phase3HarmonicRatio: number;
  combatMelody: number[];
  combatBass: number[];
  bossMelody: number[];
}

export interface InterruptFanfareNote {
  freq: number;
  delay: number;
  dur: number;
  gain: number;
  wave: OscillatorType;
}

const CHAPTER_PROFILES: Record<number, ZodiacChapterMusicProfile> = {
  1: {
    chapterId: 1,
    zodiacKey: 'leo_solar',
    combatStepSec: 0.23,
    bossBaseStepSec: 0.21,
    leadWave: 'triangle',
    bossWave: 'sawtooth',
    phase3HarmonicRatio: 1.498,
    combatMelody: [293.66, 0, 349.23, 440.0, 523.25, 0, 440.0, 392.0, 293.66, 0, 349.23, 440.0, 587.33, 523.25, 440.0, 392.0],
    combatBass: [146.83, 146.83, 110.0, 130.81],
    bossMelody: [220, 220, 261.63, 220, 293.66, 220, 329.63, 293.66, 196, 196, 246.94, 196, 261.63, 246.94, 220, 196],
  },
  2: {
    chapterId: 2,
    zodiacKey: 'aries_volcanic',
    combatStepSec: 0.215,
    bossBaseStepSec: 0.195,
    leadWave: 'sawtooth',
    bossWave: 'sawtooth',
    phase3HarmonicRatio: 1.5,
    combatMelody: [329.63, 0, 349.23, 440.0, 493.88, 0, 440.0, 349.23, 329.63, 0, 392.0, 493.88, 659.25, 587.33, 493.88, 440.0],
    combatBass: [164.81, 146.83, 130.81, 123.47],
    bossMelody: [246.94, 246.94, 261.63, 246.94, 329.63, 293.66, 261.63, 246.94, 220.0, 220.0, 246.94, 220.0, 293.66, 261.63, 246.94, 220.0],
  },
  3: {
    chapterId: 3,
    zodiacKey: 'taurus_sanctum',
    combatStepSec: 0.245,
    bossBaseStepSec: 0.22,
    leadWave: 'triangle',
    bossWave: 'square',
    phase3HarmonicRatio: 1.498,
    combatMelody: [261.63, 0, 311.13, 392.0, 466.16, 0, 392.0, 349.23, 261.63, 0, 311.13, 392.0, 523.25, 466.16, 392.0, 311.13],
    combatBass: [130.81, 116.54, 103.83, 116.54],
    bossMelody: [196.0, 196.0, 233.08, 196.0, 261.63, 233.08, 196.0, 174.61, 196.0, 196.0, 261.63, 233.08, 293.66, 261.63, 233.08, 196.0],
  },
  4: {
    chapterId: 4,
    zodiacKey: 'gemini_astral',
    combatStepSec: 0.21,
    bossBaseStepSec: 0.19,
    leadWave: 'triangle',
    bossWave: 'sawtooth',
    phase3HarmonicRatio: 1.5,
    combatMelody: [349.23, 440.0, 523.25, 0, 659.25, 587.33, 523.25, 440.0, 349.23, 440.0, 587.33, 0, 698.46, 659.25, 523.25, 440.0],
    combatBass: [174.61, 164.81, 146.83, 130.81],
    bossMelody: [261.63, 329.63, 293.66, 261.63, 392.0, 329.63, 349.23, 293.66, 246.94, 293.66, 261.63, 246.94, 349.23, 329.63, 293.66, 246.94],
  },
};

export function resolveZodiacChapterMusic(chapterId: number): ZodiacChapterMusicProfile {
  const clamped = Math.max(1, Math.min(12, Math.floor(chapterId || 1)));
  if (CHAPTER_PROFILES[clamped]) return CHAPTER_PROFILES[clamped];
  const baseIdx = ((clamped - 1) % 4) + 1;
  const base = CHAPTER_PROFILES[baseIdx];
  const semitoneShift = Math.floor((clamped - 1) / 4);
  const pitchMult = Math.pow(2, semitoneShift / 12);
  return {
    ...base,
    chapterId: clamped,
    zodiacKey: `chapter_${clamped}`,
    combatStepSec: Math.max(0.185, base.combatStepSec - semitoneShift * 0.008),
    bossBaseStepSec: Math.max(0.17, base.bossBaseStepSec - semitoneShift * 0.007),
    combatMelody: base.combatMelody.map((f) => (f > 0 ? Math.round(f * pitchMult * 100) / 100 : 0)),
    combatBass: base.combatBass.map((f) => Math.round(f * pitchMult * 100) / 100),
    bossMelody: base.bossMelody.map((f) => Math.round(f * pitchMult * 100) / 100),
  };
}

export function resolveChapterBossStepDuration(chapterId: number, phase: 1 | 2 | 3): number {
  const profile = resolveZodiacChapterMusic(chapterId);
  const mult = phase === 3 ? 0.84 : phase === 2 ? 0.92 : 1.0;
  return Math.max(0.145, Math.round(profile.bossBaseStepSec * mult * 1000) / 1000);
}

export function buildInterruptFanfareNotes(): InterruptFanfareNote[] {
  return [
    { freq: 523.25, delay: 0, dur: 0.14, gain: 0.13, wave: 'triangle' },
    { freq: 659.25, delay: 0.045, dur: 0.16, gain: 0.12, wave: 'triangle' },
    { freq: 783.99, delay: 0.09, dur: 0.2, gain: 0.12, wave: 'sawtooth' },
    { freq: 1046.5, delay: 0.14, dur: 0.28, gain: 0.11, wave: 'triangle' },
  ];
}

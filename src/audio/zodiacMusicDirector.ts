export interface ZodiacChapterMusicProfile {
  chapterId: number;
  zodiacKey: string;
  zodiacName: string;
  musicalScale: string;
  combatStepSec: number;
  bossBaseStepSec: number;
  leadWave: OscillatorType;
  bossWave: OscillatorType;
  phase3HarmonicRatio: number;
  combatMelody: number[];
  combatBass: number[];
  bossMelody: number[];
  bossBass: number[];
}

export interface InterruptFanfareNote {
  freq: number;
  delay: number;
  dur: number;
  gain: number;
  wave: OscillatorType;
}

/**
 * 12 Bespoke Zodiac Musical Profiles (Chapters 1–12):
 * Each chapter uses a distinct modal scale, tempo, oscillator pairing, bassline,
 * combat lead motif, and 3-phase boss motif so no two chapters share recycled melodies.
 */
const CHAPTER_PROFILES: Record<number, ZodiacChapterMusicProfile> = {
  1: {
    chapterId: 1,
    zodiacKey: 'leo_solar',
    zodiacName: 'Sư Tử',
    musicalScale: 'D Dorian Heroic',
    combatStepSec: 0.23,
    bossBaseStepSec: 0.21,
    leadWave: 'triangle',
    bossWave: 'sawtooth',
    phase3HarmonicRatio: 1.498,
    combatMelody: [293.66, 0, 349.23, 440.0, 523.25, 0, 440.0, 392.0, 293.66, 0, 349.23, 440.0, 587.33, 523.25, 440.0, 392.0],
    combatBass: [146.83, 146.83, 110.0, 130.81],
    bossMelody: [220, 220, 261.63, 220, 293.66, 220, 329.63, 293.66, 196, 196, 246.94, 196, 261.63, 246.94, 220, 196],
    bossBass: [110.0, 110.0, 98.0, 103.83],
  },
  2: {
    chapterId: 2,
    zodiacKey: 'aries_volcanic',
    zodiacName: 'Bạch Dương',
    musicalScale: 'E Phrygian War-March',
    combatStepSec: 0.215,
    bossBaseStepSec: 0.195,
    leadWave: 'sawtooth',
    bossWave: 'sawtooth',
    phase3HarmonicRatio: 1.5,
    combatMelody: [329.63, 0, 349.23, 440.0, 493.88, 0, 440.0, 349.23, 329.63, 0, 392.0, 493.88, 659.25, 587.33, 493.88, 440.0],
    combatBass: [164.81, 146.83, 130.81, 123.47],
    bossMelody: [246.94, 246.94, 261.63, 246.94, 329.63, 293.66, 261.63, 246.94, 220.0, 220.0, 246.94, 220.0, 293.66, 261.63, 246.94, 220.0],
    bossBass: [123.47, 116.54, 110.0, 98.0],
  },
  3: {
    chapterId: 3,
    zodiacKey: 'taurus_sanctum',
    zodiacName: 'Kim Ngưu',
    musicalScale: 'C Aeolian Citadel',
    combatStepSec: 0.245,
    bossBaseStepSec: 0.22,
    leadWave: 'triangle',
    bossWave: 'square',
    phase3HarmonicRatio: 1.498,
    combatMelody: [261.63, 0, 311.13, 392.0, 466.16, 0, 392.0, 349.23, 261.63, 0, 311.13, 392.0, 523.25, 466.16, 392.0, 311.13],
    combatBass: [130.81, 116.54, 103.83, 116.54],
    bossMelody: [196.0, 196.0, 233.08, 196.0, 261.63, 233.08, 196.0, 174.61, 196.0, 196.0, 261.63, 233.08, 293.66, 261.63, 233.08, 196.0],
    bossBass: [98.0, 98.0, 87.31, 92.5],
  },
  4: {
    chapterId: 4,
    zodiacKey: 'gemini_astral',
    zodiacName: 'Song Tử',
    musicalScale: 'F Lydian Twin-Arpeggio',
    combatStepSec: 0.21,
    bossBaseStepSec: 0.19,
    leadWave: 'triangle',
    bossWave: 'sawtooth',
    phase3HarmonicRatio: 1.5,
    combatMelody: [349.23, 440.0, 523.25, 0, 659.25, 587.33, 523.25, 440.0, 349.23, 440.0, 587.33, 0, 698.46, 659.25, 523.25, 440.0],
    combatBass: [174.61, 164.81, 146.83, 130.81],
    bossMelody: [261.63, 329.63, 293.66, 261.63, 392.0, 329.63, 349.23, 293.66, 246.94, 293.66, 261.63, 246.94, 349.23, 329.63, 293.66, 246.94],
    bossBass: [130.81, 123.47, 116.54, 110.0],
  },
  5: {
    chapterId: 5,
    zodiacKey: 'cancer_lunar_tide',
    zodiacName: 'Cự Giải',
    musicalScale: 'G Harmonic Minor Tide',
    combatStepSec: 0.235,
    bossBaseStepSec: 0.205,
    leadWave: 'sine',
    bossWave: 'triangle',
    phase3HarmonicRatio: 1.5,
    combatMelody: [392.0, 466.16, 0, 587.33, 622.25, 587.33, 466.16, 0, 392.0, 466.16, 587.33, 739.99, 783.99, 622.25, 587.33, 466.16],
    combatBass: [196.0, 155.56, 146.83, 185.0],
    bossMelody: [196.0, 233.08, 293.66, 311.13, 293.66, 233.08, 185.0, 196.0, 293.66, 311.13, 369.99, 392.0, 311.13, 293.66, 233.08, 196.0],
    bossBass: [98.0, 116.54, 92.5, 98.0],
  },
  6: {
    chapterId: 6,
    zodiacKey: 'virgo_celestial_loom',
    zodiacName: 'Xử Nữ',
    musicalScale: 'A Mixolydian Sanctum',
    combatStepSec: 0.22,
    bossBaseStepSec: 0.198,
    leadWave: 'triangle',
    bossWave: 'square',
    phase3HarmonicRatio: 1.498,
    combatMelody: [440.0, 493.88, 554.37, 659.25, 0, 783.99, 659.25, 554.37, 440.0, 554.37, 659.25, 739.99, 880.0, 0, 783.99, 659.25],
    combatBass: [110.0, 146.83, 164.81, 196.0],
    bossMelody: [220.0, 277.18, 329.63, 277.18, 392.0, 329.63, 277.18, 246.94, 220.0, 329.63, 392.0, 440.0, 392.0, 329.63, 293.66, 246.94],
    bossBass: [110.0, 98.0, 130.81, 123.47],
  },
  7: {
    chapterId: 7,
    zodiacKey: 'libra_equinox_scales',
    zodiacName: 'Thiên Bình',
    musicalScale: 'B Dorian Counterpoint',
    combatStepSec: 0.225,
    bossBaseStepSec: 0.202,
    leadWave: 'sine',
    bossWave: 'sawtooth',
    phase3HarmonicRatio: 1.5,
    combatMelody: [246.94, 369.99, 293.66, 440.0, 329.63, 493.88, 440.0, 0, 246.94, 369.99, 440.0, 554.37, 493.88, 440.0, 369.99, 293.66],
    combatBass: [123.47, 164.81, 146.83, 185.0],
    bossMelody: [246.94, 293.66, 369.99, 293.66, 329.63, 369.99, 440.0, 369.99, 246.94, 329.63, 415.3, 493.88, 440.0, 369.99, 329.63, 246.94],
    bossBass: [123.47, 110.0, 146.83, 138.59],
  },
  8: {
    chapterId: 8,
    zodiacKey: 'scorpio_venom_abyss',
    zodiacName: 'Bọ Cạp',
    musicalScale: 'F# Phrygian Dominant',
    combatStepSec: 0.205,
    bossBaseStepSec: 0.185,
    leadWave: 'sawtooth',
    bossWave: 'square',
    phase3HarmonicRatio: 1.5,
    combatMelody: [369.99, 392.0, 466.16, 0, 554.37, 466.16, 392.0, 369.99, 369.99, 466.16, 554.37, 587.33, 739.99, 587.33, 554.37, 466.16],
    combatBass: [185.0, 196.0, 146.83, 138.59],
    bossMelody: [185.0, 196.0, 185.0, 233.08, 277.18, 233.08, 196.0, 185.0, 277.18, 293.66, 369.99, 293.66, 277.18, 233.08, 196.0, 185.0],
    bossBass: [92.5, 98.0, 116.54, 92.5],
  },
  9: {
    chapterId: 9,
    zodiacKey: 'sagittarius_starfall_hunt',
    zodiacName: 'Nhân Mã',
    musicalScale: 'D Mixolydian Gallop',
    combatStepSec: 0.198,
    bossBaseStepSec: 0.182,
    leadWave: 'triangle',
    bossWave: 'sawtooth',
    phase3HarmonicRatio: 1.498,
    combatMelody: [293.66, 293.66, 440.0, 369.99, 523.25, 440.0, 587.33, 0, 440.0, 523.25, 587.33, 659.25, 739.99, 659.25, 587.33, 440.0],
    combatBass: [146.83, 130.81, 110.0, 146.83],
    bossMelody: [293.66, 369.99, 440.0, 369.99, 523.25, 440.0, 392.0, 329.63, 293.66, 440.0, 523.25, 587.33, 523.25, 440.0, 369.99, 293.66],
    bossBass: [146.83, 130.81, 123.47, 110.0],
  },
  10: {
    chapterId: 10,
    zodiacKey: 'capricorn_obsidian_peak',
    zodiacName: 'Ma Kết',
    musicalScale: 'C# Minor Monolith',
    combatStepSec: 0.23,
    bossBaseStepSec: 0.205,
    leadWave: 'square',
    bossWave: 'square',
    phase3HarmonicRatio: 1.5,
    combatMelody: [277.18, 0, 329.63, 415.3, 493.88, 415.3, 369.99, 0, 277.18, 329.63, 415.3, 554.37, 493.88, 440.0, 415.3, 329.63],
    combatBass: [138.59, 123.47, 110.0, 103.83],
    bossMelody: [277.18, 277.18, 329.63, 277.18, 369.99, 329.63, 277.18, 246.94, 207.65, 246.94, 277.18, 329.63, 415.3, 369.99, 329.63, 277.18],
    bossBass: [138.59, 110.0, 103.83, 92.5],
  },
  11: {
    chapterId: 11,
    zodiacKey: 'aquarius_tempest_nexus',
    zodiacName: 'Bảo Bình',
    musicalScale: 'Eb Lydian Storm-Synth',
    combatStepSec: 0.195,
    bossBaseStepSec: 0.178,
    leadWave: 'sawtooth',
    bossWave: 'sawtooth',
    phase3HarmonicRatio: 1.5,
    combatMelody: [311.13, 392.0, 466.16, 622.25, 0, 554.37, 466.16, 392.0, 311.13, 440.0, 523.25, 622.25, 783.99, 698.46, 622.25, 466.16],
    combatBass: [155.56, 174.61, 138.59, 116.54],
    bossMelody: [311.13, 349.23, 440.0, 466.16, 440.0, 392.0, 349.23, 311.13, 466.16, 523.25, 622.25, 587.33, 466.16, 440.0, 392.0, 311.13],
    bossBass: [155.56, 146.83, 130.81, 116.54],
  },
  12: {
    chapterId: 12,
    zodiacKey: 'pisces_eclipse_finale',
    zodiacName: 'Song Ngư',
    musicalScale: 'E Harmonic Minor Apocalypse',
    combatStepSec: 0.19,
    bossBaseStepSec: 0.174,
    leadWave: 'triangle',
    bossWave: 'sawtooth',
    phase3HarmonicRatio: 1.5,
    combatMelody: [329.63, 392.0, 493.88, 622.25, 659.25, 0, 587.33, 493.88, 329.63, 493.88, 622.25, 659.25, 783.99, 739.99, 659.25, 622.25],
    combatBass: [164.81, 130.81, 123.47, 155.56],
    bossMelody: [329.63, 311.13, 329.63, 392.0, 493.88, 466.16, 392.0, 329.63, 622.25, 659.25, 783.99, 659.25, 622.25, 493.88, 392.0, 329.63],
    bossBass: [82.41, 98.0, 123.47, 116.54],
  },
};

export function resolveZodiacChapterMusic(chapterId: number): ZodiacChapterMusicProfile {
  const clamped = Math.max(1, Math.min(12, Math.floor(chapterId || 1)));
  return CHAPTER_PROFILES[clamped] ?? CHAPTER_PROFILES[1];
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

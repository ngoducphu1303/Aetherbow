/**
 * Adaptive Zodiac Music Director (100% Web Audio Procedural)
 * Provides distinct musical identity per Chapter 1-12 biome + Boss Phase 1-3 escalation,
 * zero external audio fetches, and full compatibility with low-end CPUs (Dell E5430).
 */

export interface ZodiacChapterMusicProfile {
  chapterId: number;
  zodiacName: string;
  themeTitle: string;
  combatStepSec: number;
  bossPhaseSteps: [number, number, number];
  leadWave: OscillatorType;
  bossWave: OscillatorType;
  /** 16-step combat melody frequencies in Hz (0 = rest) */
  combatMelody: number[];
  /** 4-bar combat bassline roots in Hz */
  combatBass: [number, number, number, number];
  /** 16-step boss melody frequencies in Hz */
  bossMelody: number[];
  /** 4-bar boss bassline roots in Hz */
  bossBass: [number, number, number, number];
  /** Bright harmonic fifth/octave interval multiplier for Boss Phase 2/3 tension */
  phase3HarmonicRatio: number;
}

const CHAPTER_MUSIC_PROFILES: Record<number, ZodiacChapterMusicProfile> = {
  // Ch.1 Leo — Solar Phrygian Radiant Fanfare (D Phrygian Dominant)
  1: {
    chapterId: 1,
    zodiacName: 'Sư Tử',
    themeTitle: 'Thánh Điện Thái Dương',
    combatStepSec: 0.235,
    bossPhaseSteps: [0.19, 0.165, 0.145],
    leadWave: 'triangle',
    bossWave: 'sawtooth',
    combatMelody: [
      293.66, 0, 311.13, 369.99, 440.0, 0, 369.99, 311.13,
      293.66, 0, 369.99, 440.0, 587.33, 466.16, 440.0, 369.99,
    ],
    combatBass: [146.83, 155.56, 110.0, 146.83],
    bossMelody: [
      293.66, 369.99, 440.0, 466.16, 587.33, 466.16, 440.0, 369.99,
      311.13, 369.99, 440.0, 587.33, 622.25, 587.33, 466.16, 440.0,
    ],
    bossBass: [73.42, 77.78, 82.41, 110.0],
    phase3HarmonicRatio: 1.5,
  },

  // Ch.2 Aries — Magma War-Forge Drums (E Minor Aggressive March)
  2: {
    chapterId: 2,
    zodiacName: 'Bạch Dương',
    themeTitle: 'Lò Rèn Hỏa Dương',
    combatStepSec: 0.215,
    bossPhaseSteps: [0.175, 0.155, 0.135],
    leadWave: 'sawtooth',
    bossWave: 'square',
    combatMelody: [
      329.63, 329.63, 0, 392.0, 493.88, 0, 440.0, 392.0,
      329.63, 0, 392.0, 493.88, 659.25, 587.33, 493.88, 392.0,
    ],
    combatBass: [164.81, 130.81, 146.83, 123.47],
    bossMelody: [
      329.63, 392.0, 493.88, 523.25, 659.25, 523.25, 493.88, 392.0,
      349.23, 440.0, 523.25, 659.25, 698.46, 659.25, 523.25, 493.88,
    ],
    bossBass: [82.41, 87.31, 98.0, 123.47],
    phase3HarmonicRatio: 2.0,
  },

  // Ch.3 Taurus — Emerald Sanctuary Resonance (G Lydian Noble Pulse)
  3: {
    chapterId: 3,
    zodiacName: 'Kim Ngưu',
    themeTitle: 'Thánh Địa Ngọc Lục Bảo',
    combatStepSec: 0.25,
    bossPhaseSteps: [0.205, 0.178, 0.155],
    leadWave: 'triangle',
    bossWave: 'sawtooth',
    combatMelody: [
      392.0, 0, 440.0, 493.88, 554.37, 0, 493.88, 440.0,
      392.0, 0, 493.88, 587.33, 739.99, 587.33, 554.37, 493.88,
    ],
    combatBass: [196.0, 146.83, 164.81, 185.0],
    bossMelody: [
      196.0, 293.66, 392.0, 440.0, 554.37, 493.88, 440.0, 392.0,
      246.94, 369.99, 493.88, 587.33, 739.99, 587.33, 493.88, 392.0,
    ],
    bossBass: [98.0, 92.5, 82.41, 110.0],
    phase3HarmonicRatio: 1.5,
  },

  // Ch.4 Gemini — Astral Mirror Arpeggio (C Dorian Crystalline Twin Motifs)
  4: {
    chapterId: 4,
    zodiacName: 'Song Tử',
    themeTitle: 'Gương Tinh Tú Song Ảnh',
    combatStepSec: 0.22,
    bossPhaseSteps: [0.18, 0.158, 0.138],
    leadWave: 'sine',
    bossWave: 'triangle',
    combatMelody: [
      261.63, 311.13, 392.0, 466.16, 523.25, 466.16, 392.0, 311.13,
      293.66, 349.23, 440.0, 523.25, 587.33, 523.25, 440.0, 349.23,
    ],
    combatBass: [130.81, 146.83, 155.56, 174.61],
    bossMelody: [
      261.63, 392.0, 311.13, 523.25, 466.16, 622.25, 523.25, 392.0,
      293.66, 440.0, 349.23, 587.33, 622.25, 587.33, 466.16, 392.0,
    ],
    bossBass: [65.41, 73.42, 77.78, 87.31],
    phase3HarmonicRatio: 2.0,
  },
};

const LATE_CHAPTER_ARCHETYPES: Record<number, { zodiacName: string; themeTitle: string; baseId: 1 | 2 | 3 | 4; pitchShift: number }> = {
  5: { zodiacName: 'Cự Giải', themeTitle: 'Thành Trì Nguyệt Giáp', baseId: 3, pitchShift: 0.94387 },
  6: { zodiacName: 'Xử Nữ', themeTitle: 'Thánh Điện Tinh Kiếm', baseId: 4, pitchShift: 1.05946 },
  7: { zodiacName: 'Thiên Bình', themeTitle: 'Pháp Trường Công Lý', baseId: 1, pitchShift: 1.05946 },
  8: { zodiacName: 'Hổ Cáp', themeTitle: 'Vực Độc Ám Đế', baseId: 2, pitchShift: 0.94387 },
  9: { zodiacName: 'Nhân Mã', themeTitle: 'Thảo Nguyên Thần Tiễn', baseId: 1, pitchShift: 1.12246 },
  10: { zodiacName: 'Ma Kết', themeTitle: 'Đỉnh Sơn Thần Cổ Đại', baseId: 3, pitchShift: 0.8909 },
  11: { zodiacName: 'Bảo Bình', themeTitle: 'Lưu Vực Băng Hà', baseId: 4, pitchShift: 1.12246 },
  12: { zodiacName: 'Song Ngư', themeTitle: 'Mộng Cảnh Hoàng Đạo', baseId: 2, pitchShift: 1.05946 },
};

function scaleFreq(f: number, mult: number): number {
  return f <= 0 ? 0 : Math.round(f * mult * 100) / 100;
}

/**
 * Resolves the distinct musical scale, tempo, and harmonic profile for any Chapter 1..12.
 */
export function resolveZodiacChapterMusic(chapterId: number): ZodiacChapterMusicProfile {
  const clamped = Math.max(1, Math.min(12, Math.floor(chapterId || 1)));
  if (CHAPTER_MUSIC_PROFILES[clamped]) {
    return CHAPTER_MUSIC_PROFILES[clamped];
  }
  const late = LATE_CHAPTER_ARCHETYPES[clamped] ?? LATE_CHAPTER_ARCHETYPES[5];
  const base = CHAPTER_MUSIC_PROFILES[late.baseId];
  return {
    ...base,
    chapterId: clamped,
    zodiacName: late.zodiacName,
    themeTitle: late.themeTitle,
    combatMelody: base.combatMelody.map((f) => scaleFreq(f, late.pitchShift)),
    combatBass: [
      scaleFreq(base.combatBass[0], late.pitchShift),
      scaleFreq(base.combatBass[1], late.pitchShift),
      scaleFreq(base.combatBass[2], late.pitchShift),
      scaleFreq(base.combatBass[3], late.pitchShift),
    ],
    bossMelody: base.bossMelody.map((f) => scaleFreq(f, late.pitchShift)),
    bossBass: [
      scaleFreq(base.bossBass[0], late.pitchShift),
      scaleFreq(base.bossBass[1], late.pitchShift),
      scaleFreq(base.bossBass[2], late.pitchShift),
      scaleFreq(base.bossBass[3], late.pitchShift),
    ],
  };
}

export function resolveChapterBossStepDuration(
  chapterId: number,
  bossPhase: 1 | 2 | 3
): number {
  const profile = resolveZodiacChapterMusic(chapterId);
  const idx = Math.max(0, Math.min(2, bossPhase - 1));
  return profile.bossPhaseSteps[idx];
}

export interface InterruptFanfareNote {
  freq: number;
  delay: number;
  dur: number;
  gain: number;
  wave: OscillatorType;
}

/**
 * Crisp triumphant brass/chime stinger triggered when the player interrupts a Boss Cast ("Ngắt Chiêu").
 */
export function buildInterruptFanfareNotes(): InterruptFanfareNote[] {
  return [
    { freq: 523.25, delay: 0.0, dur: 0.14, gain: 0.16, wave: 'triangle' },
    { freq: 659.25, delay: 0.06, dur: 0.16, gain: 0.18, wave: 'triangle' },
    { freq: 783.99, delay: 0.12, dur: 0.22, gain: 0.2, wave: 'sawtooth' },
    { freq: 1046.5, delay: 0.18, dur: 0.34, gain: 0.22, wave: 'sine' },
  ];
}

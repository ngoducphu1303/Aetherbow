export interface AdaptiveCombatAudioState {
  tier: 0 | 1 | 2 | 3;
  filterCutoffHz: number;
  harmonicGain: number;
  percGain: number;
  lowHpPulse: boolean;
}

/**
 * Maps an arena world X coordinate into subtle, headphone-friendly stereo pan [-0.68, 0.68].
 */
export function computeSpatialPan(worldX: number, arenaHalfW = 10.5): number {
  if (!Number.isFinite(worldX) || arenaHalfW <= 0) return 0;
  const norm = worldX / arenaHalfW;
  const clamped = Math.max(-0.68, Math.min(0.68, norm * 0.68));
  return Math.round(clamped * 1000) / 1000;
}

/**
 * Evolves adaptive combat BGM layering across 4 combo tiers (0 / 10+ / 25+ / 50+)
 * and detects low-HP tension below 25% health.
 */
export function computeAdaptiveCombatIntensity(
  comboCount: number,
  hpRatio: number
): AdaptiveCombatAudioState {
  const c = Math.max(0, Math.floor(comboCount));
  const clampedHp = Math.max(0, Math.min(1, hpRatio));
  const lowHpPulse = clampedHp > 0 && clampedHp <= 0.25;

  if (c >= 50) {
    return {
      tier: 3,
      filterCutoffHz: 3200,
      harmonicGain: 0.085,
      percGain: 0.078,
      lowHpPulse,
    };
  }
  if (c >= 25) {
    return {
      tier: 2,
      filterCutoffHz: 2650,
      harmonicGain: 0.062,
      percGain: 0.056,
      lowHpPulse,
    };
  }
  if (c >= 10) {
    return {
      tier: 1,
      filterCutoffHz: 2280,
      harmonicGain: 0.04,
      percGain: 0.036,
      lowHpPulse,
    };
  }
  return {
    tier: 0,
    filterCutoffHz: 1950,
    harmonicGain: 0,
    percGain: 0,
    lowHpPulse,
  };
}

/**
 * Computes the master dynamic low-pass filter cutoff for cinematic Perfect Dodge
 * slow-motion focus (820 Hz immersive sweep, or 2400 Hz gentler sweep under
 * reducedMotion) and subtle low-HP tunnel tension.
 */
export function computeTimeScaleAudioFilter(
  slowMoActive: boolean,
  hpRatio: number,
  reducedMotion = false
): number {
  if (slowMoActive) {
    return reducedMotion ? 2400 : 820;
  }
  if (hpRatio > 0 && hpRatio <= 0.22) {
    return 6200;
  }
  return 18000;
}

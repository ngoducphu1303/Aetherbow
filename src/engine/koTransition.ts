export interface KoPoseSample {
  /** Normalized progress clamped to [0, 1]. */
  t: number;
  /** Backward topple pitch in radians (0 -> ~-1.32 rad). */
  pitchX: number;
  /** Vertical arc lift/drop offset in world units. */
  offsetY: number;
  /** Uniform dissolve scale multiplier relative to baseScale. */
  scale: number;
  /** Emissive flash intensity during starlight dissolve. */
  emissiveFlash: number;
  /** Velocity damping factor for knockback deceleration. */
  velocityFactor: number;
}

/**
 * Pure deterministic curve for 3D enemy KO topple + golden starlight dissolve.
 * Decoupled from Three.js for fast unit testing.
 */
export function computeKoPose(progress: number, baseScale = 1): KoPoseSample {
  const t = Math.max(0, Math.min(1, progress));
  const safeBase = Math.max(0.1, baseScale);

  // Smooth ease-out topple backward to ~76 degrees (-1.32 rad)
  const toppleEase = 1 - Math.pow(1 - t, 3);
  const pitchX = toppleEase === 0 ? 0 : -1.32 * toppleEase;

  // Brief impact pop upward in first 35%, then settle onto temple floor
  const hop = Math.sin(Math.min(1, t / 0.55) * Math.PI) * 0.28;
  const offsetY = Math.max(0, hop * (1 - t * 0.4));

  // Stay solid during first 45% for readable topple silhouette, then shrink cleanly to 0.02
  const shrinkPhase = t <= 0.45 ? 0 : (t - 0.45) / 0.55;
  const shrinkEase = shrinkPhase * shrinkPhase;
  const scale = Math.max(0.02, safeBase * (1 - shrinkEase * 0.98));

  // Luminous dissolve surge peaking around t = 0.35
  const emissiveFlash = Math.sin(t * Math.PI) * 1.45;

  // Knockback friction decelerating smoothly
  const velocityFactor = Math.max(0, 1 - t * 0.85);

  return {
    t,
    pitchX,
    offsetY,
    scale,
    emissiveFlash,
    velocityFactor,
  };
}

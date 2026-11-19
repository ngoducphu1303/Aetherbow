/**
 * Computes a musical combo pitch multiplier for consecutive hit impacts.
 * Rises gently from 1.0x up to 1.35x across a 35-hit combo streak.
 */
export function computeComboHitPitch(comboCount: number): number {
  const safeCombo = Math.max(0, comboCount);
  if (safeCombo <= 1) return 1;
  const climb = Math.min(1, (safeCombo - 1) / 34);
  return Math.round((1 + climb * 0.35) * 1000) / 1000;
}

/**
 * Advances a 3D/HUD trailing damage ghost bar ratio toward the live HP ratio.
 * Snaps upward immediately on healing and decays smoothly downward on damage.
 */
export function stepGhostRatio(
  currentGhost: number,
  targetHpRatio: number,
  dt: number,
  decayRate = 4.8
): number {
  const target = Math.max(0, Math.min(1, targetHpRatio));
  const current = Math.max(0, Math.min(1, currentGhost));
  if (target >= current) return target;
  const alpha = 1 - Math.exp(-Math.max(0.1, decayRate) * Math.max(0, dt));
  const next = current + (target - current) * alpha;
  return next - target < 0.004 ? target : next;
}

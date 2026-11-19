export interface CameraSightlineTarget {
  lookX: number;
  lookZ: number;
  camZBias: number;
}

export interface TraumaShakeOffset {
  offsetX: number;
  offsetY: number;
  rollZ: number;
}

export interface ProjectedHudPoint {
  visible: boolean;
  x: number;
  y: number;
}

/**
 * Converts Three.js horizontal facing yaw (`Math.atan2(dx, dz)`) to clockwise
 * CSS degrees where 0deg points North (-Z, top of minimap) and 90deg points East (+X).
 */
export function yawToRadarDegrees(yawRad: number): number {
  const raw = 180 - (yawRad * 180) / Math.PI;
  const normalized = ((raw % 360) + 360) % 360;
  return Math.round(normalized * 10) / 10;
}

/**
 * Computes a tactical ARPG camera lookAt point that gently leads toward the active
 * enemy or boss so both Artemis and incoming telegraphs sit in the viewport sweet spot.
 */
export function computeCameraSightline(
  playerX: number,
  playerZ: number,
  targetX: number,
  targetZ: number,
  hasTarget: boolean,
  isBossTarget = false
): CameraSightlineTarget {
  let leadX = 0;
  let leadZ = 0;
  if (hasTarget) {
    const weight = isBossTarget ? 0.24 : 0.18;
    leadX = Math.max(-2.1, Math.min(2.1, (targetX - playerX) * weight));
    leadZ = Math.max(-2.6, Math.min(1.6, (targetZ - playerZ) * weight));
  }

  const lookX = Math.max(-4.5, Math.min(4.5, playerX * 0.45 + leadX));
  const lookZ = Math.max(-8.2, Math.min(6.5, playerZ * 0.72 - 1.55 + leadZ));
  const camZBias = hasTarget ? Math.max(-1.4, Math.min(0.8, leadZ * 0.45)) : 0;

  return { lookX, lookZ, camZBias };
}

/**
 * Quadratic trauma^2 camera shake with deterministic high-frequency harmonic roll
 * so heavy hits feel cinematic and punchy without harsh single-frame noise snaps.
 */
export function computeTraumaShake(trauma: number, elapsed: number): TraumaShakeOffset {
  const t = Math.max(0, Math.min(1, trauma));
  if (t <= 0.005) {
    return { offsetX: 0, offsetY: 0, rollZ: 0 };
  }
  const sq = t * t;
  const offsetX = Math.sin(elapsed * 53.7) * 0.58 * sq + Math.cos(elapsed * 89.3) * 0.24 * sq;
  const offsetY = Math.cos(elapsed * 61.1) * 0.44 * sq + Math.sin(elapsed * 97.1) * 0.18 * sq;
  const rollZ = Math.sin(elapsed * 43.9) * 0.022 * sq;
  return { offsetX, offsetY, rollZ };
}

/**
 * Projects normalized device coordinates to clamped HUD pixels with a strict
 * camera frustum Z guard and deterministic horizontal spread to avoid overlapping numbers.
 */
export function projectFloatingScreenPos(
  ndcX: number,
  ndcY: number,
  ndcZ: number,
  viewportW: number,
  viewportH: number,
  salt = 0
): ProjectedHudPoint {
  if (ndcZ < -1 || ndcZ > 1 || viewportW <= 0 || viewportH <= 0) {
    return { visible: false, x: 0, y: 0 };
  }
  const jitterX = (((salt * 37) % 11) - 5) * 3.4;
  const jitterY = (((salt * 19) % 5) - 2) * 2.5;
  const rawX = ((ndcX + 1) / 2) * viewportW + jitterX;
  const rawY = ((-ndcY + 1) / 2) * viewportH + jitterY;
  const padX = Math.min(44, viewportW * 0.08);
  const padY = Math.min(54, viewportH * 0.1);
  return {
    visible: true,
    x: Math.max(padX, Math.min(viewportW - padX, rawX)),
    y: Math.max(padY, Math.min(viewportH - padY, rawY)),
  };
}

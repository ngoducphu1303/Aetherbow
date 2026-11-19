export interface EnemyStatusTintInput {
  hitFlashTimer: number;
  stunTimer?: number;
  chillTimer: number;
  burnTimer: number;
  poisonDps: number;
  isMarked: boolean;
  elapsed: number;
}

export interface EnemyStatusTint {
  hex: number;
  intensity: number;
}

export interface AimSightlineTransform {
  visible: boolean;
  midX: number;
  midZ: number;
  length: number;
  yaw: number;
  opacity: number;
}

export interface ImpactDecalState {
  scale: number;
  opacity: number;
}

/**
 * Resolves the highest-priority 3D emissive tint for an enemy based on active
 * combat states (Hit Flash > Boss Break Stun > Frost > Burn > Poison > Artemis Mark).
 */
export function resolveEnemyStatusTint(input: EnemyStatusTintInput): EnemyStatusTint {
  if (input.hitFlashTimer > 0) {
    return { hex: 0xfff3c4, intensity: 1.15 };
  }
  if ((input.stunTimer ?? 0) > 0) {
    return {
      hex: 0xfde047,
      intensity: 0.55 + Math.abs(Math.sin(input.elapsed * 14)) * 0.36,
    };
  }
  if (input.chillTimer > 0) {
    return { hex: 0x22d3ee, intensity: 0.42 };
  }
  if (input.burnTimer > 0) {
    return {
      hex: 0xf97316,
      intensity: 0.34 + Math.abs(Math.sin(input.elapsed * 18)) * 0.18,
    };
  }
  if (input.poisonDps > 0) {
    return {
      hex: 0x4ade80,
      intensity: 0.32 + Math.abs(Math.sin(input.elapsed * 11)) * 0.12,
    };
  }
  if (input.isMarked) {
    return { hex: 0x34d399, intensity: 0.24 };
  }
  return { hex: 0x000000, intensity: 0 };
}

/**
 * Computes clockwise screen-space degrees from player to an incoming damage source:
 * 0° = Top (North, -Z), 90° = Right (East, +X), 180° = Bottom (South, +Z), 270° = Left (West, -X).
 * Returns null if the source coincides with the player.
 */
export function computeHitIndicatorAngleDeg(
  playerX: number,
  playerZ: number,
  sourceX: number,
  sourceZ: number
): number | null {
  const dx = sourceX - playerX;
  const dz = sourceZ - playerZ;
  if (Math.hypot(dx, dz) < 0.05) {
    return null;
  }
  const rad = Math.atan2(dx, -dz);
  const deg = ((rad * 180) / Math.PI + 360) % 360;
  return Math.round(deg * 10) / 10;
}

/**
 * Computes midpoint, length, yaw, and draw-progress opacity for the 3D ground
 * aim sightline linking Artemis to the currently locked target.
 */
export function computeAimSightlineTransform(
  playerX: number,
  playerZ: number,
  targetX: number,
  targetZ: number,
  drawProgress: number
): AimSightlineTransform {
  const dx = targetX - playerX;
  const dz = targetZ - playerZ;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.75) {
    return { visible: false, midX: playerX, midZ: playerZ, length: 0, yaw: 0, opacity: 0 };
  }
  const trimmedDist = Math.max(0.25, dist - 0.85);
  const ux = dx / dist;
  const uz = dz / dist;
  const startX = playerX + ux * 0.55;
  const startZ = playerZ + uz * 0.55;
  const midX = startX + ux * (trimmedDist * 0.5);
  const midZ = startZ + uz * (trimmedDist * 0.5);
  const clampedDraw = Math.max(0, Math.min(1, drawProgress));
  return {
    visible: true,
    midX,
    midZ,
    length: trimmedDist,
    yaw: Math.atan2(dx, dz),
    opacity: 0.16 + clampedDraw * 0.44,
  };
}

/**
 * Computes scale and opacity for a pooled 3D ground impact scorch decal
 * that stamps on heavy slams/meteors and dissolves gracefully.
 */
export function computeImpactDecalState(
  life: number,
  maxLife: number,
  baseRadius: number
): ImpactDecalState {
  if (maxLife <= 0 || life <= 0) {
    return { scale: baseRadius, opacity: 0 };
  }
  const progress = Math.max(0, Math.min(1, 1 - life / maxLife));
  const popIn = Math.min(1, progress / 0.12);
  const scale = baseRadius * (0.72 + popIn * 0.28 + progress * 0.08);
  const fade = progress < 0.35 ? 1 : Math.pow(1 - (progress - 0.35) / 0.65, 1.4);
  return {
    scale,
    opacity: Math.max(0, Math.min(0.68, 0.54 * fade)),
  };
}

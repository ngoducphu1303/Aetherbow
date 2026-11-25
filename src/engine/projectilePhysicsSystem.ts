import { SpatialEntity2D, SpatialHashGrid } from './spatialHashGrid';

/**
 * Pure, Zero-GC Projectile Physics & Spatial Collision Module (P2-3 Modular Architecture).
 *
 * Extracted from GameEngine.ts to decouple projectile kinematics, arena wall/obstacle bounce
 * reflection math, homing steering, and O(1) SpatialHashGrid enemy collision queries from Three.js
 * rendering & combat side effects.
 */
export interface ProjectileKinematicsBody {
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
  wallBounceLeft: number;
}

export interface ArenaObstacleCircle {
  x: number;
  z: number;
  radius: number;
  intact?: boolean;
}

export interface TargetableEnemyBody extends SpatialEntity2D {
  dead?: boolean;
  spawnTimer: number;
}

export interface ProjectileBoundaryOutcome {
  status: 'continue' | 'bounced' | 'expired';
  bounced: boolean;
}

/**
 * Steers a homing projectile's (vx, vz) smoothly toward (targetX, targetZ) while preserving
 * constant travel speed. Mutates `proj` in-place with zero allocations.
 */
export function stepProjectileHomingVelocity(
  proj: ProjectileKinematicsBody,
  targetX: number,
  targetZ: number,
  dt: number,
  turnRate = 8.5
): boolean {
  const speed = Math.hypot(proj.vx, proj.vz);
  if (speed <= 1e-5) return false;
  const dx = targetX - proj.x;
  const dz = targetZ - proj.z;
  const dist = Math.hypot(dx, dz);
  if (dist <= 0.1) return false;

  const desiredVx = (dx / dist) * speed;
  const desiredVz = (dz / dist) * speed;
  const turn = Math.min(1, Math.max(0, dt) * turnRate);
  const blendedVx = proj.vx + (desiredVx - proj.vx) * turn;
  const blendedVz = proj.vz + (desiredVz - proj.vz) * turn;
  const blendedSpd = Math.hypot(blendedVx, blendedVz);
  if (blendedSpd <= 1e-5) return false;

  proj.vx = (blendedVx / blendedSpd) * speed;
  proj.vz = (blendedVz / blendedSpd) * speed;
  return true;
}

/**
 * Resolves arena wall containment and circular pillar/obstacle collisions for a projectile.
 * Reflects velocity and decrements `wallBounceLeft` when bounces remain, or returns `'expired'`.
 * Mutates `proj` in-place with zero allocations (returns a caller-owned outcome or small enum tag).
 */
export function resolveProjectileArenaBoundaryAndObstacles(
  proj: ProjectileKinematicsBody,
  arenaHalfW: number,
  arenaHalfD: number,
  obstacles: readonly ArenaObstacleCircle[]
): 'continue' | 'bounced' | 'expired' {
  let bounced = false;

  if (Math.abs(proj.x) >= arenaHalfW) {
    if (proj.wallBounceLeft > 0) {
      proj.wallBounceLeft -= 1;
      proj.vx = -proj.vx;
      const limitX = Math.max(0.1, arenaHalfW - 0.1);
      proj.x = Math.max(-limitX, Math.min(limitX, proj.x));
      bounced = true;
    } else {
      return 'expired';
    }
  }

  if (Math.abs(proj.z) >= arenaHalfD) {
    if (proj.wallBounceLeft > 0) {
      proj.wallBounceLeft -= 1;
      proj.vz = -proj.vz;
      const limitZ = Math.max(0.1, arenaHalfD - 0.1);
      proj.z = Math.max(-limitZ, Math.min(limitZ, proj.z));
      bounced = true;
    } else {
      return 'expired';
    }
  }

  for (let i = 0; i < obstacles.length; i++) {
    const obs = obstacles[i];
    if (obs.intact === false) continue;
    const dx = proj.x - obs.x;
    const dz = proj.z - obs.z;
    const minDist = obs.radius + proj.radius;
    const distSq = dx * dx + dz * dz;
    if (distSq < minDist * minDist) {
      if (proj.wallBounceLeft > 0) {
        proj.wallBounceLeft -= 1;
        const d = Math.sqrt(distSq);
        const nx = d > 0.01 ? dx / d : 1;
        const nz = d > 0.01 ? dz / d : 0;
        const dot = proj.vx * nx + proj.vz * nz;
        proj.vx -= 2 * dot * nx;
        proj.vz -= 2 * dot * nz;
        proj.x = obs.x + nx * (minDist + 0.05);
        proj.z = obs.z + nz * (minDist + 0.05);
        bounced = true;
        break;
      }
      return 'expired';
    }
  }

  return bounced ? 'bounced' : 'continue';
}

/**
 * Zero-GC SpatialHashGrid broadphase + exact narrowphase enemy hit query for projectiles.
 * Writes eligible live targets into caller-owned `out` array (no per-call heap allocations).
 * Strictly enforces strict `< (enemy.radius + projRadius)` and skips dead, spawning, or
 * already-hit enemy IDs to guarantee zero duplicate damage on a single flight.
 */
export function queryProjectileEnemyHits<T extends TargetableEnemyBody>(
  grid: SpatialHashGrid<T>,
  projX: number,
  projZ: number,
  projRadius: number,
  alreadyHitIds: ReadonlySet<number>,
  scratchCandidates: T[],
  outHits: T[]
): T[] {
  outHits.length = 0;
  grid.queryRadius(projX, projZ, projRadius, scratchCandidates);
  for (let i = 0; i < scratchCandidates.length; i++) {
    const e = scratchCandidates[i];
    if (!e || e.dead || e.spawnTimer > 0 || alreadyHitIds.has(e.id)) continue;
    const dx = projX - e.x;
    const dz = projZ - e.z;
    const hitR = e.radius + projRadius;
    if (dx * dx + dz * dz < hitR * hitR) {
      outHits.push(e);
    }
  }
  return outHits;
}

/**
 * Zero-GC SpatialHashGrid AoE query for explosions, solar bursts, elemental zones, and orbital hits.
 * Uses `<= (aoeRadius + enemy.radius)` when `includeEnemyRadius` is true, or `<= aoeRadius` when false.
 */
export function queryAoeEnemiesInGrid<T extends TargetableEnemyBody>(
  grid: SpatialHashGrid<T>,
  centerX: number,
  centerZ: number,
  aoeRadius: number,
  includeEnemyRadius: boolean,
  scratchCandidates: T[],
  outTargets: T[]
): T[] {
  outTargets.length = 0;
  grid.queryRadius(centerX, centerZ, aoeRadius, scratchCandidates);
  for (let i = 0; i < scratchCandidates.length; i++) {
    const e = scratchCandidates[i];
    if (!e || e.dead || e.spawnTimer > 0) continue;
    const dx = e.x - centerX;
    const dz = e.z - centerZ;
    const threshold = includeEnemyRadius ? aoeRadius + e.radius : aoeRadius;
    if (dx * dx + dz * dz <= threshold * threshold) {
      outTargets.push(e);
    }
  }
  return outTargets;
}

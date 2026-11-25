import * as THREE from 'three';
import { computeImpactDecalState } from './combatFeedback';
import { ArmorShardKinematics, stepArmorShardPhysics } from './aaaWave5Director';
import { DynamicVfxBudget, resolveDynamicVfxBudget } from './zodiacLightingVfxDirector';

/**
 * Modular Zero-GC VFX Pool Manager & Per-Frame Budget Cache (P2-3b Code Architecture).
 *
 * Extracted from GameEngine.ts to decouple transient particle/shockwave/decal/portal/shard/scorch/
 * wind-ring/mist pool stepping and per-frame VFX budget caching from the core combat orchestrator.
 * Designed for Dell Latitude E5430 / Intel HD 4000:
 * - Zero heap allocations in steady-state update loops.
 * - Per-frame cached VFX budget eliminates repeated `arrowPool.reduce(...)` scans on every burst.
 */

export interface PooledParticleEntry {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  maxLife: number;
  scale: number;
  mesh: {
    visible: boolean;
    position: { set(x: number, y: number, z: number): unknown };
    scale: { setScalar(s: number): unknown };
  };
}

export interface PooledShockwaveEntry {
  active: boolean;
  x: number;
  z: number;
  life: number;
  maxLife: number;
  maxRadius: number;
  mesh: {
    visible: boolean;
    scale: { setScalar(s: number): unknown };
    material: unknown;
  };
}

export interface PooledImpactDecalEntry {
  active: boolean;
  life: number;
  maxLife: number;
  baseRadius: number;
  mesh: {
    visible: boolean;
    scale: { setScalar(s: number): unknown };
    material: unknown;
  };
  ring: {
    visible: boolean;
    scale: { setScalar(s: number): unknown };
    material: unknown;
  };
}

export interface PooledSummonPortalEntry {
  active: boolean;
  life: number;
  maxLife: number;
  baseRadius: number;
  group: {
    visible: boolean;
    scale: { setScalar(s: number): unknown };
  };
  outerRing: {
    rotation: { z: number };
    material: unknown;
  };
  innerRing: {
    rotation: { z: number };
    material: unknown;
  };
  coreDisc: {
    material: unknown;
  };
}

export interface PooledArmorShardEntry {
  active: boolean;
  kin: ArmorShardKinematics;
  mesh: {
    visible: boolean;
    position: { set(x: number, y: number, z: number): unknown };
    rotation: { set(x: number, y: number, z: number): unknown };
    scale: { setScalar(s: number): unknown };
  };
}

export interface PooledDashScorchEntry {
  active: boolean;
  life: number;
  maxLife: number;
  mesh: {
    visible: boolean;
    scale: { set(x: number, y: number, z: number): unknown };
    material: unknown;
  };
}

export interface PooledWindRingEntry {
  active: boolean;
  life: number;
  maxLife: number;
  maxRadius: number;
  group: {
    visible: boolean;
    scale: { setScalar(s: number): unknown };
    rotation: { y: number };
  };
  ringMat: { opacity: number };
  wispMat: { opacity: number };
}

export interface GroundMistSeed {
  x: number;
  z: number;
  vx: number;
  vz: number;
  scale: number;
  phase: number;
}

/**
 * Counts active items in any pooled array using a simple index loop (zero closure allocations).
 */
export function countActivePooled<T extends { active: boolean }>(pool: readonly T[]): number {
  let count = 0;
  for (let i = 0; i < pool.length; i++) {
    if (pool[i].active) count += 1;
  }
  return count;
}

/**
 * Per-frame VFX budget cache that computes `resolveDynamicVfxBudget` at most once per frame stamp
 * instead of re-reducing `arrowPool` on every `spawnParticles` / `spawnShockwave` call.
 */
export class VfxFrameBudgetCache {
  private lastFrameStamp = -1;
  private cachedBudget: DynamicVfxBudget | null = null;

  public getForFrame(
    frameStamp: number,
    params: {
      watchdogStage: number;
      isLowEndGpu: boolean;
      reducedMotion: boolean;
      activeEnemies: number;
      arrowPool: readonly { active: boolean }[];
    }
  ): DynamicVfxBudget {
    if (this.cachedBudget && this.lastFrameStamp === frameStamp) {
      return this.cachedBudget;
    }
    this.lastFrameStamp = frameStamp;
    this.cachedBudget = resolveDynamicVfxBudget({
      watchdogStage: params.watchdogStage,
      isLowEndGpu: params.isLowEndGpu,
      reducedMotion: params.reducedMotion,
      activeEnemies: params.activeEnemies,
      activeProjectiles: countActivePooled(params.arrowPool),
    });
    return this.cachedBudget;
  }

  public invalidate(): void {
    this.lastFrameStamp = -1;
    this.cachedBudget = null;
  }
}

export function stepParticlePool(pool: readonly PooledParticleEntry[], dt: number): number {
  let activeCount = 0;
  for (let i = 0; i < pool.length; i++) {
    const pt = pool[i];
    if (!pt.active) continue;
    pt.life -= dt;
    if (pt.life <= 0) {
      pt.active = false;
      pt.mesh.visible = false;
      continue;
    }
    pt.vy -= 14 * dt;
    pt.x += pt.vx * dt;
    pt.y = Math.max(0.05, pt.y + pt.vy * dt);
    pt.z += pt.vz * dt;
    pt.mesh.position.set(pt.x, pt.y, pt.z);
    pt.mesh.scale.setScalar(pt.scale * (pt.life / pt.maxLife));
    activeCount += 1;
  }
  return activeCount;
}

export function stepShockwavePool(pool: readonly PooledShockwaveEntry[], dt: number): number {
  let activeCount = 0;
  for (let i = 0; i < pool.length; i++) {
    const ring = pool[i];
    if (!ring.active) continue;
    ring.life -= dt;
    if (ring.life <= 0) {
      ring.active = false;
      ring.mesh.visible = false;
      continue;
    }
    const p = 1 - ring.life / ring.maxLife;
    const eased = 1 - Math.pow(1 - p, 2);
    ring.mesh.scale.setScalar(0.3 + eased * ring.maxRadius);
    (ring.mesh.material as THREE.MeshBasicMaterial).opacity = 0.85 * (1 - p);
    activeCount += 1;
  }
  return activeCount;
}

export function stepImpactDecalPool(pool: readonly PooledImpactDecalEntry[] | null | undefined, dt: number): number {
  if (!pool) return 0;
  let activeCount = 0;
  for (let i = 0; i < pool.length; i++) {
    const d = pool[i];
    if (!d.active) continue;
    d.life -= dt;
    if (d.life <= 0) {
      d.active = false;
      d.mesh.visible = false;
      d.ring.visible = false;
      continue;
    }
    const state = computeImpactDecalState(d.life, d.maxLife, d.baseRadius);
    d.mesh.scale.setScalar(state.scale);
    d.ring.scale.setScalar(state.scale);
    (d.mesh.material as THREE.MeshBasicMaterial).opacity = state.opacity * 0.78;
    (d.ring.material as THREE.MeshBasicMaterial).opacity = state.opacity;
    activeCount += 1;
  }
  return activeCount;
}

export function stepSummonPortalPool(
  pool: readonly PooledSummonPortalEntry[] | null | undefined,
  dt: number
): number {
  if (!pool) return 0;
  let activeCount = 0;
  for (let i = 0; i < pool.length; i++) {
    const sp = pool[i];
    if (!sp.active) continue;
    sp.life -= dt;
    if (sp.life <= 0) {
      sp.active = false;
      sp.group.visible = false;
      continue;
    }
    const p = 1 - sp.life / sp.maxLife;
    const grow = p < 0.35 ? p / 0.35 : 1 - ((p - 0.35) / 0.65) * 0.25;
    const fade = p < 0.7 ? 1 : 1 - (p - 0.7) / 0.3;
    sp.group.scale.setScalar(Math.max(0.08, sp.baseRadius * grow));
    sp.outerRing.rotation.z += dt * 4.2;
    sp.innerRing.rotation.z -= dt * 6.5;
    (sp.outerRing.material as THREE.MeshBasicMaterial).opacity = 0.85 * fade;
    (sp.innerRing.material as THREE.MeshBasicMaterial).opacity = 0.9 * fade;
    (sp.coreDisc.material as THREE.MeshBasicMaterial).opacity = 0.34 * fade;
    activeCount += 1;
  }
  return activeCount;
}

export function stepArmorShardPool(
  pool: readonly PooledArmorShardEntry[] | null | undefined,
  dt: number
): number {
  if (!pool) return 0;
  let activeCount = 0;
  for (let i = 0; i < pool.length; i++) {
    const sh = pool[i];
    if (!sh.active) continue;
    if (!stepArmorShardPhysics(sh.kin, dt)) {
      sh.active = false;
      sh.mesh.visible = false;
      continue;
    }
    sh.mesh.position.set(sh.kin.x, sh.kin.y, sh.kin.z);
    sh.mesh.rotation.set(sh.kin.rx, sh.kin.ry, sh.kin.rz);
    const fadeScale = sh.kin.life < 0.25 ? Math.max(0.05, sh.kin.life / 0.25) : 1;
    sh.mesh.scale.setScalar(fadeScale);
    activeCount += 1;
  }
  return activeCount;
}

export function stepDashScorchPool(
  pool: readonly PooledDashScorchEntry[] | null | undefined,
  dt: number
): number {
  if (!pool) return 0;
  let activeCount = 0;
  for (let i = 0; i < pool.length; i++) {
    const ds = pool[i];
    if (!ds.active) continue;
    ds.life -= dt;
    if (ds.life <= 0) {
      ds.active = false;
      ds.mesh.visible = false;
      continue;
    }
    const ratio = ds.life / ds.maxLife;
    (ds.mesh.material as THREE.MeshBasicMaterial).opacity = 0.62 * ratio;
    ds.mesh.scale.set(0.6 + ratio * 0.4, 1, 1 + (1 - ratio) * 0.3);
    activeCount += 1;
  }
  return activeCount;
}

export function stepWindRingPool(
  pool: readonly PooledWindRingEntry[] | null | undefined,
  dt: number
): number {
  if (!pool) return 0;
  let activeCount = 0;
  for (let i = 0; i < pool.length; i++) {
    const wr = pool[i];
    if (!wr.active) continue;
    wr.life -= dt;
    if (wr.life <= 0) {
      wr.active = false;
      wr.group.visible = false;
      continue;
    }
    const t = 1 - wr.life / wr.maxLife;
    const sc = 0.38 + t * (wr.maxRadius - 0.38);
    wr.group.scale.setScalar(sc);
    wr.group.rotation.y += dt * 11.5;
    wr.ringMat.opacity = 0.85 * (1 - t);
    wr.wispMat.opacity = 0.72 * (1 - t);
    activeCount += 1;
  }
  return activeCount;
}

/**
 * Advances instanced ground-mist drift seeds with full 4-edge toroidal wrapping
 * (`+X`, `-X`, `+Z`, and `-Z`) so mist never drifts permanently off the arena.
 */
export function stepGroundMistSeeds(
  seeds: readonly GroundMistSeed[],
  count: number,
  dt: number,
  arenaHalfW: number,
  arenaHalfD: number
): void {
  const limit = Math.min(count, seeds.length);
  for (let i = 0; i < limit; i++) {
    const s = seeds[i];
    s.x += s.vx * dt;
    s.z += s.vz * dt;
    if (s.x > arenaHalfW) s.x = -arenaHalfW;
    else if (s.x < -arenaHalfW) s.x = arenaHalfW;
    if (s.z > arenaHalfD) s.z = -arenaHalfD;
    else if (s.z < -arenaHalfD) s.z = arenaHalfD;
  }
}

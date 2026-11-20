import { stepAstralOvercharge } from './aaaWave6Director';
import {
  buildPlayerVolley,
  drainReadyVolleyShots,
  resolvePrimaryArrowEnhancement,
  VolleyShotEntry,
  VolleySkillCounts,
} from './volleySystem';

export const FIXED_SIM_DT = 1 / 60;
export const MAX_FRAME_DT = 0.25;
export const MAX_SIM_SUBSTEPS = 15;

export interface FixedTimestepClock {
  accumulator: number;
  totalSimTime: number;
  totalTicks: number;
}

export function createFixedTimestepClock(): FixedTimestepClock {
  return {
    accumulator: 0,
    totalSimTime: 0,
    totalTicks: 0,
  };
}

/**
 * Decouples simulation stepping from display FPS (12 / 30 / 60 FPS).
 * Accumulates real elapsed frame time (clamped to `MAX_FRAME_DT` = 250ms so 12 FPS's
 * 83.33ms frame never loses time) and runs exact `FIXED_SIM_DT` (1/60s) simulation ticks.
 */
export function stepFixedTimestep(
  clock: FixedTimestepClock,
  rawFrameDt: number,
  onStep: (fixedDt: number, tickIndex: number) => void,
  fixedDt = FIXED_SIM_DT,
  maxSubsteps = MAX_SIM_SUBSTEPS
): number {
  const safeDt = Number.isFinite(rawFrameDt)
    ? Math.min(Math.max(rawFrameDt, 0), MAX_FRAME_DT)
    : 0;
  clock.accumulator += safeDt;

  let steps = 0;
  // Tiny epsilon prevents floating-point drift when 12 FPS (5 * 1/60) or 30 FPS (2 * 1/60)
  // accumulates exact multiples of 1/60s (e.g. 0.08333333333333333 vs 5/60).
  const eps = fixedDt * 1e-6;
  while (clock.accumulator + eps >= fixedDt && steps < maxSubsteps) {
    clock.accumulator = Math.max(0, clock.accumulator - fixedDt);
    clock.totalTicks += 1;
    clock.totalSimTime = clock.totalTicks * fixedDt;
    onStep(fixedDt, clock.totalTicks);
    steps += 1;
  }

  if (steps === maxSubsteps && clock.accumulator > fixedDt * maxSubsteps) {
    clock.accumulator = 0;
  }

  return steps;
}

/**
 * Deterministic 32-bit FNV-1a string hash for turning weekly seeds into numeric PRNG seeds.
 */
export function hashSeedString(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Mulberry32 deterministic PRNG returning values in [0, 1).
 */
export function createSeededRng(seed: number | string): () => number {
  let state = typeof seed === 'string' ? hashSeedString(seed) : seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface DeterministicCombatInputEvent {
  atTick: number;
  kind: 'move_start' | 'move_stop' | 'perfect_dodge';
  dirX?: number;
  dirZ?: number;
}

export interface DeterministicCombatSimConfig {
  seed: string | number;
  fps: 12 | 30 | 60;
  durationSeconds: number;
  attackDamage: number;
  attackCooldown: number;
  critChance: number;
  critDamage: number;
  bossMaxHp: number;
  skills: VolleySkillCounts;
  inputs: DeterministicCombatInputEvent[];
}

export interface DeterministicCombatSimResult {
  totalTicks: number;
  elapsedSimSeconds: number;
  clearTimeSeconds: number | null;
  bossRemainingHp: number;
  totalDamage: number;
  shotsFired: number;
  overchargeShots: number;
  counterShots: number;
  playerX: number;
  playerZ: number;
  checksum: number;
}

/**
 * Runs a complete fixed-timestep combat simulation driven by render frames at the given FPS
 * (12, 30, or 60 FPS). Because simulation advances strictly in `FIXED_SIM_DT` (1/60s) steps
 * with seeded RNG, identical seed + inputs produce identical outcomes regardless of render FPS.
 */
export function simulateDeterministicCombatRun(
  config: DeterministicCombatSimConfig
): DeterministicCombatSimResult {
  const rng = createSeededRng(config.seed);
  const clock = createFixedTimestepClock();
  const frameDt = 1 / config.fps;
  const totalFrames = Math.round(config.durationSeconds * config.fps);

  const inputByTick = new Map<number, DeterministicCombatInputEvent[]>();
  for (const ev of config.inputs) {
    const list = inputByTick.get(ev.atTick) ?? [];
    list.push(ev);
    inputByTick.set(ev.atTick, list);
  }

  let px = 0;
  let pz = 6;
  let moveX = 0;
  let moveZ = 0;
  let attackTimer = 0;
  let astralOvercharge = 0;
  let counterShotTimer = 0;
  let bossHp = config.bossMaxHp;
  let totalDamage = 0;
  let shotsFired = 0;
  let overchargeShots = 0;
  let counterShots = 0;
  let clearTimeSeconds: number | null = null;
  let volleyQueue: VolleyShotEntry[] = [];

  for (let frame = 0; frame < totalFrames; frame++) {
    stepFixedTimestep(clock, frameDt, (dt, tickIndex) => {
      if (clearTimeSeconds !== null) return;

      const tickEvents = inputByTick.get(tickIndex);
      if (tickEvents) {
        for (const ev of tickEvents) {
          if (ev.kind === 'move_start') {
            moveX = ev.dirX ?? 1;
            moveZ = ev.dirZ ?? 0;
          } else if (ev.kind === 'move_stop') {
            moveX = 0;
            moveZ = 0;
          } else if (ev.kind === 'perfect_dodge') {
            counterShotTimer = 3.5;
          }
        }
      }

      const isMoving = Math.abs(moveX) > 0.01 || Math.abs(moveZ) > 0.01;
      if (isMoving) {
        const len = Math.hypot(moveX, moveZ) || 1;
        px = Math.max(-7.5, Math.min(7.5, px + (moveX / len) * 5.2 * dt));
        pz = Math.max(-9.5, Math.min(9.5, pz + (moveZ / len) * 5.2 * dt));
      }

      if (counterShotTimer > 0) {
        counterShotTimer = Math.max(0, counterShotTimer - dt);
      }

      const ocStep = stepAstralOvercharge(astralOvercharge, dt, isMoving, !isMoving, bossHp > 0);
      astralOvercharge = ocStep.charge;

      attackTimer -= dt;
      if (!isMoving && attackTimer <= 0 && bossHp > 0) {
        attackTimer = config.attackCooldown;
        volleyQueue.push(...buildPlayerVolley(config.skills));
      }

      if (volleyQueue.length > 0 && bossHp > 0) {
        const drained = drainReadyVolleyShots(volleyQueue, dt);
        volleyQueue = drained.remaining;
        for (const shot of drained.ready) {
          if (bossHp <= 0) break;
          const enh = resolvePrimaryArrowEnhancement({
            isPrimary: shot.isPrimary,
            dmgSource: 'basic',
            counterShotTimer,
            astralOvercharge,
          });
          counterShotTimer = enh.nextCounterShotTimer;
          astralOvercharge = enh.nextAstralOvercharge;
          if (enh.isCounterShot) counterShots += 1;
          if (enh.isOvercharge) overchargeShots += 1;

          // Only forward shots hit the single boss in front of the player
          if (!shot.backward && Math.abs(shot.angleOffset) < 0.05) {
            const isCrit = enh.isCounterShot || enh.isOvercharge || rng() < config.critChance;
            const mult = enh.isCounterShot ? 1.35 : enh.isOvercharge ? 1.22 : 1.0;
            const dmg = Math.round(
              config.attackDamage * mult * (isCrit ? config.critDamage : 1.0)
            );
            bossHp = Math.max(0, bossHp - dmg);
            totalDamage += dmg;
          }
          shotsFired += 1;
          if (bossHp <= 0) {
            clearTimeSeconds = Number(clock.totalSimTime.toFixed(4));
            break;
          }
        }
      }
    });
  }

  const checksum =
    (Math.round(totalDamage) * 31 +
      shotsFired * 17 +
      overchargeShots * 131 +
      counterShots * 257 +
      Math.round(px * 1000) * 7 +
      Math.round(pz * 1000) * 11) |
    0;

  return {
    totalTicks: clock.totalTicks,
    elapsedSimSeconds: Number(clock.totalSimTime.toFixed(4)),
    clearTimeSeconds,
    bossRemainingHp: bossHp,
    totalDamage,
    shotsFired,
    overchargeShots,
    counterShots,
    playerX: Number(px.toFixed(4)),
    playerZ: Number(pz.toFixed(4)),
    checksum,
  };
}

export type EnemyTacticalArchetype = 'vanguard' | 'flanker' | 'ranged' | 'caster';

export interface SquadNeighborSample {
  id: number;
  x: number;
  z: number;
  radius: number;
  archetype?: EnemyTacticalArchetype;
}

export interface SquadCoordinationInput {
  selfId: number;
  kind: string;
  x: number;
  z: number;
  radius: number;
  baseSpeed: number;
  playerX: number;
  playerZ: number;
  flankSign: number;
  neighbors: SquadNeighborSample[];
  obstacles?: Array<{ x: number; z: number; radius: number }>;
}

export interface SquadCoordinationResult {
  vx: number;
  vz: number;
  archetype: EnemyTacticalArchetype;
  separationApplied: boolean;
  obstacleAvoidanceApplied: boolean;
  formationSynergyActive: boolean;
}

export interface CastInterruptInput {
  isBoss: boolean;
  isElite: boolean;
  isTrainingDummy?: boolean;
  telegraphType: string;
  telegraphTimer: number;
  interruptCooldownSec: number;
  dmgSource: 'basic' | 'ultimate' | 'pet' | 'elemental';
  isCrit: boolean;
  isElemental: boolean;
  isCounterShot: boolean;
}

export interface CastInterruptOutcome {
  interrupted: boolean;
  cancelTelegraph: boolean;
  stunDurationSec: number;
  exposedDurationSec: number;
  exposedDamageBonus: number;
  bossStaggerBonusRatio: number;
  nextInterruptCooldownSec: number;
  floatingLabel: string;
}

export interface ChapterBossPhasePlan {
  chapterId: number;
  phase: 1 | 2 | 3;
  telegraphCadenceMult: number;
  punishDamageBonus: number;
  punishWindowDurationSec: number;
  aggressionMult: number;
  label: string;
}

export function resolveEnemyTacticalArchetype(kind: string): EnemyTacticalArchetype {
  const k = (kind || '').toLowerCase();
  if (
    k.includes('wisp') ||
    k.includes('mage') ||
    k.includes('caster') ||
    k.includes('necromancer') ||
    k.includes('oracle') ||
    k.includes('shaman') ||
    k.includes('priest')
  ) {
    return 'caster';
  }
  if (
    k.includes('archer') ||
    k.includes('sniper') ||
    k.includes('turret') ||
    k.includes('bomber') ||
    k.includes('ranger') ||
    k.includes('spitter')
  ) {
    return 'ranged';
  }
  if (
    k.includes('stalker') ||
    k.includes('skirmisher') ||
    k.includes('charger') ||
    k.includes('assassin') ||
    k.includes('dash') ||
    k.includes('wolf') ||
    k.includes('bat')
  ) {
    return 'flanker';
  }
  return 'vanguard';
}

export function computeSquadCoordinationVector(
  input: SquadCoordinationInput
): SquadCoordinationResult {
  const archetype = resolveEnemyTacticalArchetype(input.kind);
  const toPx = input.playerX - input.x;
  const toPz = input.playerZ - input.z;
  const dist = Math.hypot(toPx, toPz) || 0.001;
  const dirX = toPx / dist;
  const dirZ = toPz / dist;

  const preferredRange =
    archetype === 'ranged'
      ? 7.8
      : archetype === 'caster'
      ? 8.4
      : archetype === 'flanker'
      ? 3.8
      : 2.2;

  let moveX = 0;
  let moveZ = 0;

  if (dist > preferredRange + 0.8) {
    moveX += dirX;
    moveZ += dirZ;
  } else if ((archetype === 'ranged' || archetype === 'caster') && dist < 5.2) {
    moveX -= dirX * 1.15;
    moveZ -= dirZ * 1.15;
  }

  // Flank tangential orbit so mobs surround instead of single-file stacking
  const flankWeight = archetype === 'flanker' ? 0.68 : archetype === 'ranged' || archetype === 'caster' ? 0.34 : 0.22;
  const perpX = -dirZ * (input.flankSign >= 0 ? 1 : -1);
  const perpZ = dirX * (input.flankSign >= 0 ? 1 : -1);
  moveX += perpX * flankWeight;
  moveZ += perpZ * flankWeight;

  // Separation & Formation Synergy (Vanguards screen for allied Ranged/Casters)
  let separationApplied = false;
  let formationSynergyActive = false;
  for (const nb of input.neighbors) {
    if (nb.id === input.selfId) continue;
    const dx = input.x - nb.x;
    const dz = input.z - nb.z;
    const d = Math.hypot(dx, dz);
    const minSep = input.radius + nb.radius + 0.95;
    if (d > 0.001 && d < minSep) {
      const push = (minSep - d) / minSep;
      moveX += (dx / d) * push * 1.75;
      moveZ += (dz / d) * push * 1.75;
      separationApplied = true;
    }
    if (
      (archetype === 'ranged' || archetype === 'caster') &&
      nb.archetype === 'vanguard' &&
      d < 6.5
    ) {
      // Position behind allied Vanguard relative to the player
      const nbDistToPlayer = Math.hypot(input.playerX - nb.x, input.playerZ - nb.z);
      if (nbDistToPlayer <= dist + 0.5) {
        formationSynergyActive = true;
        moveX -= dirX * 0.25;
        moveZ -= dirZ * 0.25;
      }
    }
  }

  // Obstacle-aware steering
  let obstacleAvoidanceApplied = false;
  const obstacles = input.obstacles ?? [];
  for (const ob of obstacles) {
    const dx = input.x - ob.x;
    const dz = input.z - ob.z;
    const d = Math.hypot(dx, dz);
    const avoidR = input.radius + ob.radius + 1.25;
    if (d > 0.001 && d < avoidR) {
      const push = (avoidR - d) / avoidR;
      const nx = dx / d;
      const nz = dz / d;
      // Push outward + tangent slide so enemy smoothly curves around pillars
      moveX += nx * push * 1.9 - nz * (input.flankSign >= 0 ? 0.55 : -0.55) * push;
      moveZ += nz * push * 1.9 + nx * (input.flankSign >= 0 ? 0.55 : -0.55) * push;
      obstacleAvoidanceApplied = true;
    }
  }

  const len = Math.hypot(moveX, moveZ);
  if (len < 0.001) {
    return {
      vx: 0,
      vz: 0,
      archetype,
      separationApplied,
      obstacleAvoidanceApplied,
      formationSynergyActive,
    };
  }
  const speed = Math.max(0.5, input.baseSpeed);
  return {
    vx: (moveX / len) * speed,
    vz: (moveZ / len) * speed,
    archetype,
    separationApplied,
    obstacleAvoidanceApplied,
    formationSynergyActive,
  };
}

export function resolveObstacleFreeSpawnPosition(
  rawX: number,
  rawZ: number,
  entityRadius: number,
  arenaHalfW: number,
  arenaHalfD: number,
  obstacles: Array<{ x: number; z: number; radius: number }>
): { x: number; z: number; adjusted: boolean } {
  const safeR = Math.max(0.2, entityRadius);
  const maxW = Math.max(1, arenaHalfW - safeR);
  const maxD = Math.max(1, arenaHalfD - safeR);
  let x = Math.max(-maxW, Math.min(maxW, rawX));
  let z = Math.max(-maxD, Math.min(maxD, rawZ));
  let adjusted = x !== rawX || z !== rawZ;

  for (let iter = 0; iter < 6; iter++) {
    let pushed = false;
    for (const ob of obstacles) {
      const minClear = ob.radius + safeR + 0.55;
      const dx = x - ob.x;
      const dz = z - ob.z;
      const dist = Math.hypot(dx, dz);
      if (dist < minClear) {
        const angle = dist > 0.001 ? Math.atan2(dz, dx) : (iter * Math.PI) / 3;
        x = ob.x + Math.cos(angle) * (minClear + 0.05);
        z = ob.z + Math.sin(angle) * (minClear + 0.05);
        x = Math.max(-maxW, Math.min(maxW, x));
        z = Math.max(-maxD, Math.min(maxD, z));
        adjusted = true;
        pushed = true;
      }
    }
    if (!pushed) break;
  }

  return { x, z, adjusted };
}

export function clampKnockbackInsideArena(
  startX: number,
  startZ: number,
  deltaX: number,
  deltaZ: number,
  entityRadius: number,
  arenaHalfW: number,
  arenaHalfD: number,
  obstacles: Array<{ x: number; z: number; radius: number }>
): { x: number; z: number; hitWall: boolean } {
  const safeR = Math.max(0.2, entityRadius);
  const wallMargin = 0.5;
  const maxX = Math.max(0.5, arenaHalfW - safeR - wallMargin);
  const maxZ = Math.max(0.5, arenaHalfD - safeR - wallMargin);

  let x = startX + deltaX;
  let z = startZ + deltaZ;
  let hitWall = false;

  if (x > maxX) {
    x = maxX;
    hitWall = true;
  } else if (x < -maxX) {
    x = -maxX;
    hitWall = true;
  }
  if (z > maxZ) {
    z = maxZ;
    hitWall = true;
  } else if (z < -maxZ) {
    z = -maxZ;
    hitWall = true;
  }

  // Check pillar collision along knockback path and endpoint
  const steps = Math.max(1, Math.min(8, Math.ceil(Math.hypot(deltaX, deltaZ) / 0.5)));
  for (let s = 1; s <= steps; s++) {
    const t = s / steps;
    const px = startX + (x - startX) * t;
    const pz = startZ + (z - startZ) * t;
    for (const ob of obstacles) {
      const minClear = ob.radius + safeR + 0.16;
      const dx = px - ob.x;
      const dz = pz - ob.z;
      const dist = Math.hypot(dx, dz);
      if (dist < minClear) {
        const pushAngle =
          dist > 0.001
            ? Math.atan2(dz, dx)
            : Math.atan2(startZ - ob.z, startX - ob.x);
        x = Math.max(-maxX, Math.min(maxX, ob.x + Math.cos(pushAngle) * minClear));
        z = Math.max(-maxZ, Math.min(maxZ, ob.z + Math.sin(pushAngle) * minClear));
        hitWall = true;
      }
    }
  }

  return { x, z, hitWall };
}

export function evaluateCastInterrupt(input: CastInterruptInput): CastInterruptOutcome {
  const noInterrupt: CastInterruptOutcome = {
    interrupted: false,
    cancelTelegraph: false,
    stunDurationSec: 0,
    exposedDurationSec: 0,
    exposedDamageBonus: 0,
    bossStaggerBonusRatio: 0,
    nextInterruptCooldownSec: input.interruptCooldownSec,
    floatingLabel: '',
  };

  if (
    input.isTrainingDummy ||
    input.telegraphType === 'none' ||
    input.telegraphTimer <= 0 ||
    input.interruptCooldownSec > 0
  ) {
    return noInterrupt;
  }

  const qualifies =
    input.dmgSource === 'ultimate' ||
    input.isCounterShot ||
    (input.isCrit && input.isElemental);

  if (!qualifies) return noInterrupt;

  if (input.isBoss) {
    return {
      interrupted: true,
      cancelTelegraph: true,
      stunDurationSec: 1.15,
      exposedDurationSec: 3.4,
      exposedDamageBonus: 0.28,
      bossStaggerBonusRatio: 0.24,
      nextInterruptCooldownSec: 5.5,
      floatingLabel: 'NGẮT CHIÊU BOSS!',
    };
  }

  return {
    interrupted: true,
    cancelTelegraph: true,
    stunDurationSec: input.isElite ? 1.35 : 1.6,
    exposedDurationSec: 2.8,
    exposedDamageBonus: 0.22,
    bossStaggerBonusRatio: 0,
    nextInterruptCooldownSec: 3.2,
    floatingLabel: 'NGẮT CHIÊU!',
  };
}

export function getChapterBossPhasePlan(chapterId: number, hpRatio: number): ChapterBossPhasePlan {
  const clampedChapter = Math.max(1, Math.min(12, Math.floor(chapterId || 1)));
  const clampedHp = Math.max(0, Math.min(1, hpRatio));
  const phase: 1 | 2 | 3 = clampedHp <= 0.3 ? 3 : clampedHp <= 0.65 ? 2 : 1;
  const chapterScale = Math.min(0.12, (clampedChapter - 1) * 0.01);

  return {
    chapterId: clampedChapter,
    phase,
    telegraphCadenceMult: phase === 3 ? 0.78 : phase === 2 ? 0.88 : 1.0,
    punishDamageBonus: (phase === 3 ? 0.3 : phase === 2 ? 0.23 : 0.18) + chapterScale * 0.5,
    punishWindowDurationSec: phase === 3 ? 2.4 : phase === 2 ? 2.15 : 2.0,
    aggressionMult: phase === 3 ? 1.24 : phase === 2 ? 1.12 : 1.0,
    label:
      phase === 3
        ? 'Giai Đoạn III · Hủy Diệt'
        : phase === 2
        ? 'Giai Đoạn II · Cuồng Nộ'
        : 'Giai Đoạn I · Khai Chiến',
  };
}

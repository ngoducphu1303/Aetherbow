import { EnemyKind } from '../types/game';

export type EnemyTacticalArchetype = 'vanguard' | 'flanker' | 'ranged' | 'caster';

export interface SquadNeighborSample {
  id: number;
  x: number;
  z: number;
  radius: number;
  archetype?: EnemyTacticalArchetype;
}

export interface ArenaPhysicsObstacle {
  x: number;
  z: number;
  radius: number;
}

export interface SquadCoordinationInput {
  selfId: number;
  kind: EnemyKind;
  x: number;
  z: number;
  radius: number;
  baseSpeed: number;
  playerX: number;
  playerZ: number;
  flankSign: number;
  neighbors: readonly SquadNeighborSample[];
  obstacles?: readonly ArenaPhysicsObstacle[];
}

export interface SquadCoordinationVector {
  archetype: EnemyTacticalArchetype;
  vx: number;
  vz: number;
  separationApplied: boolean;
  obstacleAvoidanceApplied: boolean;
  formationSynergyActive: boolean;
}

export interface CastInterruptInput {
  isBoss: boolean;
  isElite: boolean;
  isTrainingDummy?: boolean;
  telegraphType: 'none' | 'shot' | 'lunge' | 'slam' | 'spiral' | 'lane';
  telegraphTimer: number;
  interruptCooldownSec: number;
  dmgSource: 'basic' | 'ultimate' | 'pet' | 'elemental';
  isCrit: boolean;
  isElemental: boolean;
  isCounterShot: boolean;
}

export interface CastInterruptResult {
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
  bossArchetype: string;
  phase: 1 | 2 | 3;
  phaseTitle: string;
  telegraphCadenceMult: number;
  punishWindowDurationSec: number;
  punishDamageBonus: number;
  interruptStaggerRatio: number;
  counterplayHint: string;
}

const VANGUARD_KINDS = new Set<EnemyKind>([
  EnemyKind.GOLEM,
  EnemyKind.WARDEN_BOSS,
  EnemyKind.TITAN_BOSS,
]);

const FLANKER_KINDS = new Set<EnemyKind>([
  EnemyKind.SKIRMISHER,
  EnemyKind.SHADOW_STALKER,
  EnemyKind.ZODIAC_BOSS,
]);

const CASTER_KINDS = new Set<EnemyKind>([
  EnemyKind.WISP,
  EnemyKind.DRAGON_WHELP,
]);

/**
 * Classifies every Chapter 1-4+ enemy into a clear tactical squad role
 * so mobs coordinate spacing, flanking arcs, and standoff range.
 */
export function resolveEnemyTacticalArchetype(kind: EnemyKind): EnemyTacticalArchetype {
  if (VANGUARD_KINDS.has(kind)) return 'vanguard';
  if (FLANKER_KINDS.has(kind)) return 'flanker';
  if (CASTER_KINDS.has(kind)) return 'caster';
  return 'ranged';
}

/**
 * Computes anti-clump squad coordination velocity for regular enemies:
 * - Soft separation keeps enemies readable instead of stacking on one pixel.
 * - Flankers arc at ~38° around the player to create pincer pressure.
 * - Ranged & casters hold optimal standoff bands (retreating if cornered close).
 * - Vanguards march steadily on center-line to anchor the formation.
 */
export function computeSquadCoordinationVector(
  input: SquadCoordinationInput
): SquadCoordinationVector {
  const archetype = resolveEnemyTacticalArchetype(input.kind);
  const dx = input.playerX - input.x;
  const dz = input.playerZ - input.z;
  const dist = Math.hypot(dx, dz) || 0.001;
  const dirX = dx / dist;
  const dirZ = dz / dist;
  const tangentX = -dirZ * (input.flankSign >= 0 ? 1 : -1);
  const tangentZ = dirX * (input.flankSign >= 0 ? 1 : -1);

  let desiredX = dirX;
  let desiredZ = dirZ;

  if (archetype === 'flanker') {
    const flankWeight = dist > 2.8 && dist < 9.5 ? 0.62 : 0.25;
    desiredX = dirX * 0.78 + tangentX * flankWeight;
    desiredZ = dirZ * 0.78 + tangentZ * flankWeight;
  } else if (archetype === 'ranged') {
    if (dist < 5.2) {
      desiredX = -dirX * 0.68 + tangentX * 0.55;
      desiredZ = -dirZ * 0.68 + tangentZ * 0.55;
    } else if (dist <= 9.2) {
      desiredX = tangentX * 0.85;
      desiredZ = tangentZ * 0.85;
    } else {
      desiredX = dirX * 0.9 + tangentX * 0.2;
      desiredZ = dirZ * 0.9 + tangentZ * 0.2;
    }
  } else if (archetype === 'caster') {
    if (dist < 6.4) {
      desiredX = -dirX * 0.72 + tangentX * 0.45;
      desiredZ = -dirZ * 0.72 + tangentZ * 0.45;
    } else if (dist <= 10.8) {
      desiredX = tangentX * 0.75 + dirX * 0.12;
      desiredZ = tangentZ * 0.75 + dirZ * 0.12;
    } else {
      desiredX = dirX * 0.85 + tangentX * 0.25;
      desiredZ = dirZ * 0.85 + tangentZ * 0.25;
    }
  } else {
    // Vanguard presses front-line directly with slight spacing bias
    desiredX = dirX * 0.95 + tangentX * 0.1;
    desiredZ = dirZ * 0.95 + tangentZ * 0.1;
  }

  let sepX = 0;
  let sepZ = 0;
  let separationApplied = false;
  let formX = 0;
  let formZ = 0;
  let formationSynergyActive = false;

  for (let i = 0; i < input.neighbors.length; i++) {
    const nb = input.neighbors[i];
    if (nb.id === input.selfId) continue;
    const nx = input.x - nb.x;
    const nz = input.z - nb.z;
    const nd = Math.hypot(nx, nz);
    const minSep = input.radius + nb.radius + 0.95;
    if (nd > 0.0001 && nd < minSep) {
      const push = ((minSep - nd) / minSep) * 1.45;
      sepX += (nx / nd) * push;
      sepZ += (nz / nd) * push;
      separationApplied = true;
    }

    // Coordinated Squad Formation Synergy:
    // - Ranged & Casters seek shelter behind nearby friendly Vanguards relative to the player.
    // - Vanguards step toward the intercept line between the player and nearby allied backline units.
    if (nb.archetype && nd > 0.5 && nd < 7.8) {
      if ((archetype === 'ranged' || archetype === 'caster') && nb.archetype === 'vanguard') {
        const anchorX = nb.x - dirX * 2.8;
        const anchorZ = nb.z - dirZ * 2.8;
        const ax = anchorX - input.x;
        const az = anchorZ - input.z;
        const ad = Math.hypot(ax, az);
        if (ad > 0.4) {
          formX += (ax / ad) * 0.42;
          formZ += (az / ad) * 0.42;
          formationSynergyActive = true;
        }
      } else if (archetype === 'vanguard' && (nb.archetype === 'ranged' || nb.archetype === 'caster')) {
        const shieldX = nb.x + dirX * 2.4;
        const shieldZ = nb.z + dirZ * 2.4;
        const sx = shieldX - input.x;
        const sz = shieldZ - input.z;
        const sd = Math.hypot(sx, sz);
        if (sd > 0.5) {
          formX += (sx / sd) * 0.28;
          formZ += (sz / sd) * 0.28;
          formationSynergyActive = true;
        }
      }
    }
  }

  // Obstacle-Aware Steering (smooth tangential detour around arena pillars)
  let obsX = 0;
  let obsZ = 0;
  let obstacleAvoidanceApplied = false;
  if (input.obstacles && input.obstacles.length > 0) {
    for (let i = 0; i < input.obstacles.length; i++) {
      const ob = input.obstacles[i];
      const ox = input.x - ob.x;
      const oz = input.z - ob.z;
      const od = Math.hypot(ox, oz);
      const safeDist = ob.radius + input.radius + 1.35;
      if (od > 0.0001 && od < safeDist) {
        const weight = ((safeDist - od) / safeDist) * 1.9;
        const radX = ox / od;
        const radZ = oz / od;
        // Blend outward push + tangential slide so mobs smoothly route around pillars
        const slideSign = input.flankSign >= 0 ? 1 : -1;
        obsX += (radX * 0.85 - radZ * 0.55 * slideSign) * weight;
        obsZ += (radZ * 0.85 + radX * 0.55 * slideSign) * weight;
        obstacleAvoidanceApplied = true;
      }
    }
  }

  const combX = desiredX + sepX + formX + obsX;
  const combZ = desiredZ + sepZ + formZ + obsZ;
  const mag = Math.hypot(combX, combZ) || 1;
  const speedFactor =
    archetype === 'vanguard' ? 0.96 : archetype === 'flanker' ? 1.08 : 0.92;

  return {
    archetype,
    vx: (combX / mag) * input.baseSpeed * speedFactor,
    vz: (combZ / mag) * input.baseSpeed * speedFactor,
    separationApplied,
    obstacleAvoidanceApplied,
    formationSynergyActive,
  };
}

/**
 * Guarantees an enemy or prop spawn point is strictly inside the playable arena and outside
 * every obstacle pillar with safety margin (zero trapped-in-wall spawns).
 */
export function resolveObstacleFreeSpawnPosition(
  targetX: number,
  targetZ: number,
  entityRadius: number,
  arenaHalfW: number,
  arenaHalfD: number,
  obstacles: readonly ArenaPhysicsObstacle[]
): { x: number; z: number; adjusted: boolean } {
  const maxX = Math.max(1, arenaHalfW - entityRadius - 0.65);
  const maxZ = Math.max(1, arenaHalfD - entityRadius - 0.65);
  let x = Math.max(-maxX, Math.min(maxX, targetX));
  let z = Math.max(-maxZ, Math.min(maxZ, targetZ));
  let adjusted = x !== targetX || z !== targetZ;

  for (let pass = 0; pass < 3; pass++) {
    let pushedThisPass = false;
    for (let i = 0; i < obstacles.length; i++) {
      const ob = obstacles[i];
      const dx = x - ob.x;
      const dz = z - ob.z;
      const dist = Math.hypot(dx, dz);
      const minDist = ob.radius + entityRadius + 0.55;
      if (dist < minDist) {
        const angle = dist > 0.001 ? Math.atan2(dz, dx) : (pass + i + 1) * 1.1;
        x = ob.x + Math.cos(angle) * (minDist + 0.15);
        z = ob.z + Math.sin(angle) * (minDist + 0.15);
        x = Math.max(-maxX, Math.min(maxX, x));
        z = Math.max(-maxZ, Math.min(maxZ, z));
        adjusted = true;
        pushedThisPass = true;
      }
    }
    if (!pushedThisPass) break;
  }

  return { x, z, adjusted };
}

/**
 * Applies knockback displacement while guaranteeing zero wall-tunneling and zero obstacle clipping.
 */
export function clampKnockbackInsideArena(
  x: number,
  z: number,
  impulseX: number,
  impulseZ: number,
  entityRadius: number,
  arenaHalfW: number,
  arenaHalfD: number,
  obstacles: readonly ArenaPhysicsObstacle[]
): { x: number; z: number; hitWall: boolean } {
  const maxX = Math.max(1, arenaHalfW - entityRadius - 0.5);
  const maxZ = Math.max(1, arenaHalfD - entityRadius - 0.5);
  const rawX = x + impulseX;
  const rawZ = z + impulseZ;
  let clampedX = Math.max(-maxX, Math.min(maxX, rawX));
  let clampedZ = Math.max(-maxZ, Math.min(maxZ, rawZ));
  let hitWall = clampedX !== rawX || clampedZ !== rawZ;

  for (let i = 0; i < obstacles.length; i++) {
    const ob = obstacles[i];
    const dx = clampedX - ob.x;
    const dz = clampedZ - ob.z;
    const dist = Math.hypot(dx, dz);
    const minDist = ob.radius + entityRadius + 0.15;
    if (dist < minDist) {
      const nx = dist > 0.001 ? dx / dist : 1;
      const nz = dist > 0.001 ? dz / dist : 0;
      clampedX = Math.max(-maxX, Math.min(maxX, ob.x + nx * minDist));
      clampedZ = Math.max(-maxZ, Math.min(maxZ, ob.z + nz * minDist));
      hitWall = true;
    }
  }

  return { x: clampedX, z: clampedZ, hitWall };
}

/**
 * Evaluates Cast Interrupt ("Ngắt Chiêu") when the player hits a telegraphing enemy/boss
 * with a high-impact counter tool (Ultimate, Counter-Shot, or Critical Elemental burst).
 */
export function evaluateCastInterrupt(input: CastInterruptInput): CastInterruptResult {
  const noOp: CastInterruptResult = {
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
    input.telegraphTimer <= 0.04 ||
    input.interruptCooldownSec > 0
  ) {
    return noOp;
  }

  const heavyInterruptHit =
    input.dmgSource === 'ultimate' ||
    input.isCounterShot ||
    (input.isCrit && input.isElemental);

  if (!heavyInterruptHit) {
    return noOp;
  }

  if (input.isBoss) {
    // Bosses reward timed interrupts with a major stagger chunk + Exposed punish window
    // and cancel standard shot/lunge/lane windups while respecting lethal arena-wide spirals.
    const cancelBossTelegraph = input.telegraphType !== 'spiral';
    return {
      interrupted: true,
      cancelTelegraph: cancelBossTelegraph,
      stunDurationSec: cancelBossTelegraph ? 0.65 : 0,
      exposedDurationSec: 1.85,
      exposedDamageBonus: 0.2,
      bossStaggerBonusRatio: 0.22,
      nextInterruptCooldownSec: 5.5,
      floatingLabel: 'NGẮT CHIÊU BOSS!',
    };
  }

  // Regular & Elite mobs get fully interrupted and stunned briefly for clean counterplay
  return {
    interrupted: true,
    cancelTelegraph: true,
    stunDurationSec: input.isElite ? 1.0 : 1.25,
    exposedDurationSec: 1.8,
    exposedDamageBonus: 0.2,
    bossStaggerBonusRatio: 0,
    nextInterruptCooldownSec: input.isElite ? 3.5 : 2.2,
    floatingLabel: 'NGẮT CHIÊU!',
  };
}

/**
 * Canonical 3-Phase Boss Choreography Blueprint for Chapters 1–4 (100% / 65% / 30% HP).
 * Provides readable telegraph cadence, punish window tuning, and chapter-specific counterplay.
 */
export function getChapterBossPhasePlan(
  chapterId: number,
  hpRatio: number
): ChapterBossPhasePlan {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(hpRatio) ? hpRatio : 1));
  const phase: 1 | 2 | 3 = clamped <= 0.3 ? 3 : clamped <= 0.65 ? 2 : 1;

  switch (chapterId) {
    case 2:
      if (phase === 1) {
        return {
          chapterId: 2,
          bossArchetype: 'Kratos · Hỏa Sơn Bạch Dương',
          phase: 1,
          phaseTitle: 'Giai Đoạn 1 · Chùy Dung Nham',
          telegraphCadenceMult: 1.0,
          punishWindowDurationSec: 1.75,
          punishDamageBonus: 0.18,
          interruptStaggerRatio: 0.22,
          counterplayHint: 'Né ngang đường xung kích dung nham để mở cửa sổ phản công.',
        };
      }
      if (phase === 2) {
        return {
          chapterId: 2,
          bossArchetype: 'Kratos · Hỏa Sơn Bạch Dương',
          phase: 2,
          phaseTitle: 'Giai Đoạn 2 · Lò Rèn Phẫn Nộ',
          telegraphCadenceMult: 0.9,
          punishWindowDurationSec: 1.9,
          punishDamageBonus: 0.22,
          interruptStaggerRatio: 0.24,
          counterplayHint: 'Ngắt chiêu khi Kratos gồng chùy lửa để phá nhanh thanh giáp.',
        };
      }
      return {
        chapterId: 2,
        bossArchetype: 'Kratos · Hỏa Sơn Bạch Dương',
        phase: 3,
        phaseTitle: 'Giai Đoạn 3 · Nhật Thực Chiến Thần',
        telegraphCadenceMult: 0.82,
        punishWindowDurationSec: 2.15,
        punishDamageBonus: 0.26,
        interruptStaggerRatio: 0.26,
        counterplayHint: 'Giữ Tuyệt Kỹ để ngắt chuỗi thiên thạch và kết liễu trong 2.15s Suy Yếu.',
      };

    case 3:
      if (phase === 1) {
        return {
          chapterId: 3,
          bossArchetype: 'Địa Thần Kim Ngưu',
          phase: 1,
          phaseTitle: 'Giai Đoạn 1 · Thành Lũy Lục Bảo',
          telegraphCadenceMult: 1.04,
          punishWindowDurationSec: 1.85,
          punishDamageBonus: 0.18,
          interruptStaggerRatio: 0.22,
          counterplayHint: 'Lướt né sóng địa chấn hướng tâm rồi đánh từ mạn sườn.',
        };
      }
      if (phase === 2) {
        return {
          chapterId: 3,
          bossArchetype: 'Địa Thần Kim Ngưu',
          phase: 2,
          phaseTitle: 'Giai Đoạn 2 · Rạn Nứt Ngọc Thạch',
          telegraphCadenceMult: 0.92,
          punishWindowDurationSec: 2.0,
          punishDamageBonus: 0.22,
          interruptStaggerRatio: 0.24,
          counterplayHint: 'Phá Trụ Ngọc hoặc ngắt chiêu gầm rú để gỡ giảm sát thương vỏ giáp.',
        };
      }
      return {
        chapterId: 3,
        bossArchetype: 'Địa Thần Kim Ngưu',
        phase: 3,
        phaseTitle: 'Giai Đoạn 3 · Đại Địa Phán Quyết',
        telegraphCadenceMult: 0.84,
        punishWindowDurationSec: 2.2,
        punishDamageBonus: 0.26,
        interruptStaggerRatio: 0.26,
        counterplayHint: 'Tận dụng Né Hoàn Hảo sau cú giậm 3 nhịp để kích hoạt Phản Đòn Tối Thượng.',
      };

    case 4:
      if (phase === 1) {
        return {
          chapterId: 4,
          bossArchetype: 'Nữ Hoàng Gương Tinh Giới',
          phase: 1,
          phaseTitle: 'Giai Đoạn 1 · Khúc Xạ Song Ảnh',
          telegraphCadenceMult: 0.96,
          punishWindowDurationSec: 1.75,
          punishDamageBonus: 0.19,
          interruptStaggerRatio: 0.22,
          counterplayHint: 'Quan sát tia gương đôi và di chuyển chéo trục để tránh bị kẹp góc.',
        };
      }
      if (phase === 2) {
        return {
          chapterId: 4,
          bossArchetype: 'Nữ Hoàng Gương Tinh Giới',
          phase: 2,
          phaseTitle: 'Giai Đoạn 2 · Mê Cung Phản Chiếu',
          telegraphCadenceMult: 0.88,
          punishWindowDurationSec: 1.95,
          punishDamageBonus: 0.23,
          interruptStaggerRatio: 0.25,
          counterplayHint: 'Ngắt chiêu biến ảnh bằng đòn Bạo kích Nguyên tố hoặc Tuyệt Kỹ.',
        };
      }
      return {
        chapterId: 4,
        bossArchetype: 'Nữ Hoàng Gương Tinh Giới',
        phase: 3,
        phaseTitle: 'Giai Đoạn 3 · Song Tử Vỡ Mộng',
        telegraphCadenceMult: 0.8,
        punishWindowDurationSec: 2.25,
        punishDamageBonus: 0.27,
        interruptStaggerRatio: 0.28,
        counterplayHint: 'Giữ nhịp né xoáy tinh giới rồi dồn sát thương vào cửa sổ Suy Yếu +27%.',
      };

    case 1:
    default:
      if (phase === 1) {
        return {
          chapterId: Math.max(1, chapterId),
          bossArchetype: 'Vệ Thần Sư Tử Nhật Luân',
          phase: 1,
          phaseTitle: 'Giai Đoạn 1 · Sư Tử Quang Minh',
          telegraphCadenceMult: 1.05,
          punishWindowDurationSec: 1.85,
          punishDamageBonus: 0.18,
          interruptStaggerRatio: 0.22,
          counterplayHint: 'Né vùng sáng đỏ trước khi nhảy bổ để mở Phản Đòn.',
        };
      }
      if (phase === 2) {
        return {
          chapterId: Math.max(1, chapterId),
          bossArchetype: 'Vệ Thần Sư Tử Nhật Luân',
          phase: 2,
          phaseTitle: 'Giai Đoạn 2 · Bờm Lửa Thái Dương',
          telegraphCadenceMult: 0.92,
          punishWindowDurationSec: 2.0,
          punishDamageBonus: 0.22,
          interruptStaggerRatio: 0.24,
          counterplayHint: 'Ngắt chiêu khi Boss nạp quang cầu để tăng nhanh thanh Phá Giáp.',
        };
      }
      return {
        chapterId: Math.max(1, chapterId),
        bossArchetype: 'Vệ Thần Sư Tử Nhật Luân',
        phase: 3,
        phaseTitle: 'Giai Đoạn 3 · Bùng Nổ Nhật Luân',
        telegraphCadenceMult: 0.84,
        punishWindowDurationSec: 2.2,
        punishDamageBonus: 0.26,
        interruptStaggerRatio: 0.26,
        counterplayHint: 'Kết hợp Né Hoàn Hảo + Tuyệt Kỹ trong cửa sổ Phản Đòn Tối Thượng.',
      };
  }
}

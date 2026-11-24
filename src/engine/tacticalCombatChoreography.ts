export type EnemyTacticalArchetype = 'vanguard' | 'skirmisher' | 'artillery' | 'juggernaut';

export interface SquadNeighborSample {
  id: number;
  x: number;
  z: number;
  radius: number;
  archetype: EnemyTacticalArchetype;
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
  obstacles: Array<{ x: number; z: number; radius: number }>;
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
  punishDamageBonus: number;
  aggressionMult: number;
  label: string;
}

export function resolveEnemyTacticalArchetype(kind: string): EnemyTacticalArchetype {
  const k = (kind || '').toLowerCase();
  if (k.includes('archer') || k.includes('mage') || k.includes('sniper') || k.includes('caster') || k.includes('turret')) {
    return 'artillery';
  }
  if (k.includes('charger') || k.includes('assassin') || k.includes('dash') || k.includes('stalker')) {
    return 'skirmisher';
  }
  if (k.includes('golem') || k.includes('titan') || k.includes('guardian') || k.includes('tank') || k.includes('brute')) {
    return 'juggernaut';
  }
  return 'vanguard';
}

export function computeSquadCoordinationVector(input: SquadCoordinationInput): { vx: number; vz: number } {
  const archetype = resolveEnemyTacticalArchetype(input.kind);
  const toPx = input.playerX - input.x;
  const toPz = input.playerZ - input.z;
  const dist = Math.hypot(toPx, toPz) || 0.001;
  const dirX = toPx / dist;
  const dirZ = toPz / dist;

  const preferredRange =
    archetype === 'artillery'
      ? 9.2
      : archetype === 'skirmisher'
      ? 4.6
      : archetype === 'juggernaut'
      ? 2.2
      : 2.6;

  let moveX = 0;
  let moveZ = 0;

  if (dist > preferredRange + 0.9) {
    moveX += dirX;
    moveZ += dirZ;
  } else if (archetype === 'artillery' && dist < preferredRange - 1.8) {
    moveX -= dirX * 0.72;
    moveZ -= dirZ * 0.72;
  }

  // Flank tangential orbit so mobs surround instead of single-file stacking
  const flankWeight = archetype === 'skirmisher' ? 0.65 : archetype === 'artillery' ? 0.42 : 0.28;
  const perpX = -dirZ * (input.flankSign >= 0 ? 1 : -1);
  const perpZ = dirX * (input.flankSign >= 0 ? 1 : -1);
  moveX += perpX * flankWeight;
  moveZ += perpZ * flankWeight;

  // Separation from squad neighbors
  for (const nb of input.neighbors) {
    if (nb.id === input.selfId) continue;
    const dx = input.x - nb.x;
    const dz = input.z - nb.z;
    const d = Math.hypot(dx, dz);
    const minSep = input.radius + nb.radius + 0.95;
    if (d > 0.001 && d < minSep) {
      const push = (minSep - d) / minSep;
      moveX += (dx / d) * push * 1.45;
      moveZ += (dz / d) * push * 1.45;
    }
  }

  // Obstacle avoidance
  for (const ob of input.obstacles) {
    const dx = input.x - ob.x;
    const dz = input.z - ob.z;
    const d = Math.hypot(dx, dz);
    const avoidR = input.radius + ob.radius + 1.1;
    if (d > 0.001 && d < avoidR) {
      const push = (avoidR - d) / avoidR;
      moveX += (dx / d) * push * 1.8;
      moveZ += (dz / d) * push * 1.8;
    }
  }

  const len = Math.hypot(moveX, moveZ);
  if (len < 0.001) return { vx: 0, vz: 0 };
  const speed = Math.max(0.5, input.baseSpeed);
  return {
    vx: (moveX / len) * speed,
    vz: (moveZ / len) * speed,
  };
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
  const phase: 1 | 2 | 3 = clampedHp <= 0.35 ? 3 : clampedHp <= 0.7 ? 2 : 1;
  const chapterScale = Math.min(0.12, (clampedChapter - 1) * 0.01);

  return {
    chapterId: clampedChapter,
    phase,
    punishDamageBonus: (phase === 3 ? 0.28 : phase === 2 ? 0.22 : 0.18) + chapterScale * 0.5,
    aggressionMult: phase === 3 ? 1.24 : phase === 2 ? 1.12 : 1.0,
    label:
      phase === 3
        ? 'Giai Đoạn III · Hủy Diệt'
        : phase === 2
        ? 'Giai Đoạn II · Cuồng Nộ'
        : 'Giai Đoạn I · Khai Chiến',
  };
}

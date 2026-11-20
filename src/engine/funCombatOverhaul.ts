import { EnemyKind } from '../types/game';

export const HEAVY_BREAK_COOLDOWN_SEC = 3.5;
export const COMBO_BEAT_TOTAL = 4;

export type EnemyTacticalRole =
  | 'standard'
  | 'charger'
  | 'detonator'
  | 'shield_bearer'
  | 'arcane_sniper';

export type RoomChaosEventKind =
  | 'chaos_lightning'
  | 'wind_frenzy'
  | 'solar_orb_surge'
  | 'gold_meteor_shower';

export interface RoomChaosEventDef {
  id: RoomChaosEventKind;
  title: string;
  subtitle: string;
  accentHex: string;
  colorHex: number;
}

export const ROOM_CHAOS_EVENT_CATALOG: Record<RoomChaosEventKind, RoomChaosEventDef> = {
  chaos_lightning: {
    id: 'chaos_lightning',
    title: 'BÃO SÉT HỖN MANG',
    subtitle: 'Thiên lôi đánh ngẫu nhiên cả quái lẫn vòng cảnh báo mỗi 3.2s!',
    accentHex: '#38bdf8',
    colorHex: 0x38bdf8,
  },
  wind_frenzy: {
    id: 'wind_frenzy',
    title: 'CUỒNG PHONG TỐC CHIẾN',
    subtitle: '+35% Tốc Độ Bắn & +22% Tốc Chạy cho toàn đội trong phòng này!',
    accentHex: '#34d399',
    colorHex: 0x34d399,
  },
  solar_orb_surge: {
    id: 'solar_orb_surge',
    title: 'MƯA CẦU TINH QUANG',
    subtitle: 'Quái rơi thêm Cầu Năng Lượng hồi Máu & +22% Nộ Tuyệt Kỹ!',
    accentHex: '#fbbf24',
    colorHex: 0xfbbf24,
  },
  gold_meteor_shower: {
    id: 'gold_meteor_shower',
    title: 'THIÊN THẠCH HOÀNG KIM',
    subtitle: 'Thiên thạch nổ giáng xuống bầy quái kèm +35% Vàng rơi!',
    accentHex: '#fb923c',
    colorHex: 0xfb923c,
  },
};

export interface ComboBeatStepResult {
  firedBeat: 1 | 2 | 3 | 4;
  nextBeat: 1 | 2 | 3 | 4;
  isFinisher: boolean;
  damageMult: number;
  fovKick: number;
}

/**
 * Allows mobile strafe-kiting shots at ~68% cadence while moving,
 * and 100% full speed when planted. Eliminates rigid stop-to-shoot downtime.
 */
export function resolveMoveShootIntervalMult(isMoving: boolean): number {
  return isMoving ? 1.46 : 1.0;
}

/**
 * Advances the 4-beat attack cadence (1 -> 2 -> 3 -> 4 FINISHER -> 1).
 * Beat 4 unleashes a Crescent Starfall Finisher with +55% damage and FOV punch.
 */
export function advanceComboBeat(currentBeat: 1 | 2 | 3 | 4): ComboBeatStepResult {
  const firedBeat = currentBeat;
  const isFinisher = firedBeat === 4;
  const nextBeat = (firedBeat === 4 ? 1 : firedBeat + 1) as 1 | 2 | 3 | 4;
  return {
    firedBeat,
    nextBeat,
    isFinisher,
    damageMult: isFinisher ? 1.55 : firedBeat === 3 ? 1.12 : 1.0,
    fovKick: isFinisher ? -2.2 : 0,
  };
}

export interface HeavyBreakStrikeSpec {
  damage: number;
  radius: number;
  lungeDistance: number;
  knockbackForce: number;
  bossShieldDamageRatio: number;
  fovKick: number;
  hitstopSec: number;
}

/**
 * Computes parameters for the active Guard-Break / Crescent Cleave strike [F / Right-Click].
 */
export function computeHeavyBreakStrikeSpec(
  attackPower: number,
  comboCount: number,
  isTargetBoss: boolean
): HeavyBreakStrikeSpec {
  const comboBoost = 1 + Math.min(0.45, Math.floor(comboCount / 10) * 0.06);
  return {
    damage: Math.max(12, Math.round(attackPower * 2.4 * comboBoost)),
    radius: 4.8,
    lungeDistance: isTargetBoss ? 2.1 : 2.6,
    knockbackForce: 15.5,
    bossShieldDamageRatio: 0.38,
    fovKick: -3.4,
    hitstopSec: 0.048,
  };
}

export interface ChainDetonationResult {
  triggered: boolean;
  splashDamage: number;
  radius: number;
  knockbackForce: number;
}

/**
 * Triggers an explosive crystal shatter AoE when an enemy is slain,
 * turning crowd clears into juicy chain-reaction bursts.
 */
export function computeChainDetonationSplash(
  attackPower: number,
  wasFinisherOrSkill: boolean,
  isElite: boolean
): ChainDetonationResult {
  const radius = isElite ? 4.4 : wasFinisherOrSkill ? 3.8 : 3.2;
  const mult = isElite ? 0.95 : wasFinisherOrSkill ? 0.72 : 0.48;
  return {
    triggered: true,
    splashDamage: Math.max(8, Math.round(attackPower * mult)),
    radius,
    knockbackForce: isElite ? 11.5 : 8.2,
  };
}

/**
 * Assigns distinct tactical behaviors to enemies so every wave demands active positioning.
 */
export function resolveEnemyTacticalRole(
  kind: EnemyKind,
  isBoss: boolean,
  isElite: boolean,
  spawnOrdinal: number
): EnemyTacticalRole {
  if (isBoss) return 'standard';
  if (kind === EnemyKind.GOLEM) {
    return spawnOrdinal % 2 === 0 ? 'shield_bearer' : 'charger';
  }
  if (kind === EnemyKind.SKIRMISHER) {
    if (spawnOrdinal % 4 === 1) return 'charger';
    if (spawnOrdinal % 5 === 2) return 'detonator';
    return 'standard';
  }
  if (kind === EnemyKind.SHADOW_STALKER) {
    return 'arcane_sniper';
  }
  if (kind === EnemyKind.IMP_ARCHER && isElite) {
    return 'arcane_sniper';
  }
  if (kind === EnemyKind.WISP && spawnOrdinal % 3 === 1) {
    return 'detonator';
  }
  return 'standard';
}

/**
 * Checks if a frontal arrow hits a Shield-Bearer's forward guard arc.
 * Bypassed by flanking (> 65° off front), piercing/counter shots, or Heavy Break Strike.
 */
export function isHitBlockedByFrontShield(
  enemyFacingYaw: number,
  projectileX: number,
  projectileZ: number,
  enemyX: number,
  enemyZ: number,
  isBypassingGuard: boolean
): boolean {
  if (isBypassingGuard) return false;
  const toProjX = projectileX - enemyX;
  const toProjZ = projectileZ - enemyZ;
  const dist = Math.hypot(toProjX, toProjZ);
  if (dist < 0.05) return false;
  const faceX = Math.sin(enemyFacingYaw);
  const faceZ = Math.cos(enemyFacingYaw);
  const dot = (faceX * toProjX + faceZ * toProjZ) / dist;
  return dot > 0.42;
}

/**
 * Rolls an exciting arena chaos event for rooms so combat never feels static.
 */
export function rollRoomChaosEvent(
  chapterId: number,
  stageIndex: number,
  isBossStage: boolean,
  seedRoll: number
): RoomChaosEventDef | null {
  if (stageIndex <= 0) {
    // Stage 1 immediately pops Wind Frenzy or Solar Orb Surge so opening pace slaps!
    return seedRoll < 0.5
      ? ROOM_CHAOS_EVENT_CATALOG.wind_frenzy
      : ROOM_CHAOS_EVENT_CATALOG.solar_orb_surge;
  }
  if (isBossStage) {
    return ROOM_CHAOS_EVENT_CATALOG.chaos_lightning;
  }
  const threshold = chapterId >= 2 ? 0.78 : 0.68;
  if (seedRoll > threshold) return null;
  const order: RoomChaosEventKind[] = [
    'chaos_lightning',
    'wind_frenzy',
    'solar_orb_surge',
    'gold_meteor_shower',
  ];
  const idx = Math.abs(chapterId * 7 + stageIndex * 3 + Math.floor(seedRoll * 100)) % order.length;
  return ROOM_CHAOS_EVENT_CATALOG[order[idx]];
}

/**
 * Determines if a Surprise Bounty Mini-Boss ambushes mid-room.
 */
export function shouldTriggerSurpriseAmbush(
  isBossStage: boolean,
  stageIndex: number,
  alreadyAmbushedInRun: boolean,
  rngVal: number
): boolean {
  if (isBossStage || stageIndex < 1) return false;
  const chance = alreadyAmbushedInRun ? 0.24 : 0.58;
  return rngVal < chance;
}

/**
 * Computes symmetric 3D positions for Boss Phase 2 Shield Totems inside arena bounds.
 */
export function computeBossPhase2TotemPositions(
  bossX: number,
  bossZ: number,
  arenaHalfW: number,
  arenaHalfD: number
): Array<{ x: number; z: number }> {
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  const rawZ = clamp(bossZ + 1.8, -arenaHalfD + 2.4, arenaHalfD - 2.6);
  return [
    { x: clamp(bossX - 4.6, -arenaHalfW + 2.0, arenaHalfW - 2.0), z: rawZ },
    { x: clamp(bossX + 4.6, -arenaHalfW + 2.0, arenaHalfW - 2.0), z: rawZ },
  ];
}

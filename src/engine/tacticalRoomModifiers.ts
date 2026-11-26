import {
  EliteAffix,
  EnemyKind,
  TacticalRoomModifierId,
  TacticalRoomModifierSnapshot,
} from '../types/game';

/**
 * Wave 13 Pillar 1 & 2: Tactical Room Modifiers, Destructible Cover Physics,
 * and Tactical Elite Affix Counterplay Helpers.
 *
 * Design Guarantees:
 * - Deterministic per (chapterId, stageIndex, towerFloor) — zero unfair RNG spikes.
 * - Strictly disabled on Chapter 1 Stages 1–3, Training, Equalized Arena, and World Boss
 *   so early-game FTUE (5m–15m) stays crisp and approachable.
 * - 100% Zero-GC out-parameter helpers safe for 60Hz combat updates on Dell Latitude E5430.
 * - ZERO PointLights created anywhere (visuals reuse GroundTelegraphVisualPool).
 */

export interface TacticalRoomModifierDef {
  id: TacticalRoomModifierId;
  name: string;
  shortRule: string;
  symbol: string;
  accentHex: string;
  accentNum: number;
  minChapter: number;
  /** Leyline zone attack speed bonus when hero stands inside */
  leylineAspdBonus: number;
  /** Leyline zone ultimate charge rate bonus when hero stands inside */
  leylineUltChargeMult: number;
  /** Elemental reaction damage multiplier in this room */
  elementalReactionDmgMult: number;
  /** Elemental reaction AoE radius multiplier in this room */
  elementalReactionAoeMult: number;
  /** Hero dash cooldown multiplier (< 1 = faster dash) */
  dashCooldownMult: number;
  /** Flanker/melee lunge speed multiplier */
  flankerSpeedMult: number;
  /** Destructible pillar shatter radius & stun */
  pillarShatterRadius: number;
  pillarShatterStunSec: number;
  pillarShatterAtkMult: number;
  /** Vanguard Phalanx expose duration & bonus when Vanguard dies */
  phalanxExposeSec: number;
  phalanxExposeBonus: number;
}

export const TACTICAL_ROOM_MODIFIERS: Record<TacticalRoomModifierId, TacticalRoomModifierDef> = {
  leyline_conduit: {
    id: 'leyline_conduit',
    name: 'Mạch Tinh Lực',
    shortRule: 'Đứng trong vòng sáng: +18% Tốc đánh · +20% Hồi Nộ',
    symbol: '◈',
    accentHex: '#38bdf8',
    accentNum: 0x38bdf8,
    minChapter: 1,
    leylineAspdBonus: 0.18,
    leylineUltChargeMult: 1.2,
    elementalReactionDmgMult: 1.0,
    elementalReactionAoeMult: 1.0,
    dashCooldownMult: 1.0,
    flankerSpeedMult: 1.0,
    pillarShatterRadius: 0,
    pillarShatterStunSec: 0,
    pillarShatterAtkMult: 0,
    phalanxExposeSec: 0,
    phalanxExposeBonus: 0,
  },
  fragile_sanctuary: {
    id: 'fragile_sanctuary',
    name: 'Trụ Đá Rạn Nứt',
    shortRule: 'Phá trụ chắn gây sóng choáng 3.4m & đẩy lùi quái',
    symbol: '▲',
    accentHex: '#f59e0b',
    accentNum: 0xf59e0b,
    minChapter: 2,
    leylineAspdBonus: 0,
    leylineUltChargeMult: 1.0,
    elementalReactionDmgMult: 1.0,
    elementalReactionAoeMult: 1.0,
    dashCooldownMult: 1.0,
    flankerSpeedMult: 1.0,
    pillarShatterRadius: 3.4,
    pillarShatterStunSec: 1.1,
    pillarShatterAtkMult: 1.85,
    phalanxExposeSec: 0,
    phalanxExposeBonus: 0,
  },
  vanguard_phalanx: {
    id: 'vanguard_phalanx',
    name: 'Đội Hình Liên Hoàn',
    shortRule: 'Hạ Tiên Phong trước để làm Suy Yếu tuyến sau (+20% ST)',
    symbol: '◆',
    accentHex: '#fb7185',
    accentNum: 0xfb7185,
    minChapter: 2,
    leylineAspdBonus: 0,
    leylineUltChargeMult: 1.0,
    elementalReactionDmgMult: 1.0,
    elementalReactionAoeMult: 1.0,
    dashCooldownMult: 1.0,
    flankerSpeedMult: 1.0,
    pillarShatterRadius: 0,
    pillarShatterStunSec: 0,
    pillarShatterAtkMult: 0,
    phalanxExposeSec: 4.0,
    phalanxExposeBonus: 0.2,
  },
  elemental_resonance: {
    id: 'elemental_resonance',
    name: 'Cộng Hưởng Nguyên Tố',
    shortRule: 'Phản ứng Nguyên Tố +25% ST & +20% vùng nổ',
    symbol: '✦',
    accentHex: '#c084fc',
    accentNum: 0xc084fc,
    minChapter: 1,
    leylineAspdBonus: 0,
    leylineUltChargeMult: 1.0,
    elementalReactionDmgMult: 1.25,
    elementalReactionAoeMult: 1.2,
    dashCooldownMult: 1.0,
    flankerSpeedMult: 1.0,
    pillarShatterRadius: 0,
    pillarShatterStunSec: 0,
    pillarShatterAtkMult: 0,
    phalanxExposeSec: 0,
    phalanxExposeBonus: 0,
  },
  haste_currents: {
    id: 'haste_currents',
    name: 'Luồng Khí Tốc Hành',
    shortRule: 'Giảm 15% hồi Lướt Né · Quái áp sát tăng 12% tốc độ',
    symbol: '⚡',
    accentHex: '#34d399',
    accentNum: 0x34d399,
    minChapter: 2,
    leylineAspdBonus: 0,
    leylineUltChargeMult: 1.0,
    elementalReactionDmgMult: 1.0,
    elementalReactionAoeMult: 1.0,
    dashCooldownMult: 0.85,
    flankerSpeedMult: 1.12,
    pillarShatterRadius: 0,
    pillarShatterStunSec: 0,
    pillarShatterAtkMult: 0,
    phalanxExposeSec: 0,
    phalanxExposeBonus: 0,
  },
};

const FULL_MODIFIER_ROTATION: readonly TacticalRoomModifierId[] = [
  'leyline_conduit',
  'fragile_sanctuary',
  'elemental_resonance',
  'vanguard_phalanx',
  'haste_currents',
];

const CH1_FRIENDLY_MODIFIERS: readonly TacticalRoomModifierId[] = [
  'leyline_conduit',
  'elemental_resonance',
];

export interface ResolveTacticalRoomModifierInput {
  chapterId: number;
  stageIndex: number; // 1-indexed stage
  isBossStage: boolean;
  isTower?: boolean;
  towerFloor?: number;
  isTraining?: boolean;
  isArena?: boolean;
  isWorldBoss?: boolean;
  hasObstacles?: boolean;
}

/**
 * Deterministically picks a Tactical Room Modifier for the active room.
 * Returns null on Ch.1 stages 1–5 (FTUE safety), Boss rooms where Boss phases already lead,
 * and specialized modes (Training, Equalized Arena, World Boss).
 */
export function resolveTacticalRoomModifier(
  input: ResolveTacticalRoomModifierInput
): TacticalRoomModifierDef | null {
  if (input.isTraining || input.isArena || input.isWorldBoss) return null;

  if (input.isTower) {
    const floor = Math.max(1, Math.floor(input.towerFloor ?? 1));
    if (floor < 3) return null;
    const idx = (floor - 3) % FULL_MODIFIER_ROTATION.length;
    let id = FULL_MODIFIER_ROTATION[idx];
    if (id === 'fragile_sanctuary' && input.hasObstacles === false) {
      id = 'leyline_conduit';
    }
    return TACTICAL_ROOM_MODIFIERS[id];
  }

  const ch = Math.max(1, Math.floor(input.chapterId));
  const stage = Math.max(1, Math.floor(input.stageIndex));

  // Protect Chapter 1 FTUE opening rooms (stages 1-5) so new players learn core controls first
  if (ch === 1) {
    if (stage < 6 || input.isBossStage) return null;
    const id = CH1_FRIENDLY_MODIFIERS[(stage - 6) % CH1_FRIENDLY_MODIFIERS.length];
    return TACTICAL_ROOM_MODIFIERS[id];
  }

  // From Chapter 2+, apply tactical room variety on non-opening rooms and tower challenges;
  // boss rooms stay focused on Boss 3-phase choreography except Ch.6+ where Leyline/Elemental enrich tactics.
  if (input.isBossStage) {
    if (ch < 6) return null;
    return TACTICAL_ROOM_MODIFIERS[ch % 2 === 0 ? 'leyline_conduit' : 'elemental_resonance'];
  }

  const seed = (ch - 2) * 7 + (stage - 1);
  let id = FULL_MODIFIER_ROTATION[seed % FULL_MODIFIER_ROTATION.length];
  if (id === 'fragile_sanctuary' && input.hasObstacles === false) {
    id = 'leyline_conduit';
  }
  return TACTICAL_ROOM_MODIFIERS[id];
}

export function toTacticalRoomModifierSnapshot(
  def: TacticalRoomModifierDef | null,
  buffActive = false
): TacticalRoomModifierSnapshot | null {
  if (!def) return null;
  return {
    id: def.id,
    name: def.name,
    shortRule: def.shortRule,
    symbol: def.symbol,
    accentHex: def.accentHex,
    buffActive,
  };
}

export interface ObstacleFootprint {
  x: number;
  z: number;
  radius: number;
  destroyed?: boolean;
}

/**
 * Computes a deterministic safe placement for the Leyline Conduit ring clear of
 * center player spawn, walls, and arena obstacle pillars.
 */
export function computeLeylineConduitPosition(
  arenaHalfW: number,
  arenaHalfD: number,
  obstacles: readonly ObstacleFootprint[],
  stageIndex: number
): { x: number; z: number; radius: number } {
  const radius = 2.65;
  const maxX = Math.max(2.6, arenaHalfW - 3.6);
  const maxZ = Math.max(2.6, arenaHalfD - 4.0);
  const side = stageIndex % 2 === 0 ? -1 : 1;
  const candidates: ReadonlyArray<readonly [number, number]> = [
    [side * maxX * 0.42, maxZ * 0.28],
    [-side * maxX * 0.42, maxZ * 0.28],
    [0, maxZ * 0.45],
    [side * maxX * 0.35, -maxZ * 0.15],
    [0, 1.8],
  ];

  for (let c = 0; c < candidates.length; c++) {
    const cx = candidates[c][0];
    const cz = candidates[c][1];
    let blocked = false;
    for (let i = 0; i < obstacles.length; i++) {
      const ob = obstacles[i];
      if (ob.destroyed) continue;
      if (Math.hypot(cx - ob.x, cz - ob.z) < ob.radius + 1.45) {
        blocked = true;
        break;
      }
    }
    if (!blocked) {
      return {
        x: Math.round(cx * 100) / 100,
        z: Math.round(cz * 100) / 100,
        radius,
      };
    }
  }
  return { x: 0, z: Math.min(2.2, maxZ * 0.35), radius };
}

export interface PillarShatterTarget {
  id: number;
  x: number;
  z: number;
  radius: number;
  isBoss?: boolean;
}

export interface PillarShatterHit {
  id: number;
  damage: number;
  stunSec: number;
  knockX: number;
  knockZ: number;
}

/**
 * Zero-GC physics helper computing shockwave damage, stun, and outward knockback
 * when a Fragile Sanctuary cover pillar shatters.
 */
export function evaluatePillarShatterShockwave(
  pillar: { x: number; z: number },
  enemies: readonly PillarShatterTarget[],
  baseAtk: number,
  outHits: PillarShatterHit[]
): number {
  outHits.length = 0;
  const spec = TACTICAL_ROOM_MODIFIERS.fragile_sanctuary;
  const maxR = spec.pillarShatterRadius;
  const dmgBase = Math.max(12, Math.round(baseAtk * spec.pillarShatterAtkMult));

  for (let i = 0; i < enemies.length; i++) {
    const e = enemies[i];
    const dx = e.x - pillar.x;
    const dz = e.z - pillar.z;
    const dist = Math.hypot(dx, dz);
    if (dist > maxR + e.radius) continue;
    const falloff = Math.max(0.55, 1 - (dist / (maxR + e.radius + 0.01)) * 0.45);
    const inv = dist > 0.001 ? 1 / dist : 1;
    const push = (e.isBoss ? 0.55 : 1.85) * falloff;
    outHits.push({
      id: e.id,
      damage: Math.max(1, Math.round(dmgBase * falloff)),
      stunSec: e.isBoss ? spec.pillarShatterStunSec * 0.45 : spec.pillarShatterStunSec,
      knockX: (dist > 0.001 ? dx * inv : 1) * push,
      knockZ: (dist > 0.001 ? dz * inv : 0) * push,
    });
  }
  return outHits.length;
}

/**
 * Identifies whether an enemy kind acts as a frontline Vanguard in Vanguard Phalanx rooms.
 */
export function isPhalanxVanguardKind(kind: EnemyKind): boolean {
  return kind === EnemyKind.GOLEM || kind === EnemyKind.SKIRMISHER;
}

/**
 * Resolves eligible Elite Affix pool for a given chapter/tower depth so new tactical
 * affixes (`vanguard_link`, `quake_pulse`) unlock progressively from Ch.4+ or Tower F12+.
 */
export function resolveEligibleEliteAffixes(
  chapterId: number,
  isTower = false,
  towerFloor = 1
): readonly EliteAffix[] {
  const advancedUnlocked = isTower ? towerFloor >= 12 : chapterId >= 4;
  if (advancedUnlocked) {
    return ['aegis', 'haste', 'volatile', 'frost', 'vanguard_link', 'quake_pulse'];
  }
  return ['aegis', 'haste', 'volatile', 'frost'];
}

export interface VanguardLinkPeer {
  id: number;
  x: number;
  z: number;
  hp: number;
  hasVanguardLink: boolean;
  stunTimer: number;
}

/**
 * Evaluates whether a non-linker ally currently benefits from an active Vanguard Link Elite
 * within 6.2u (18% damage reduction — counterplay: focus or interrupt the Vanguard Link Elite).
 */
export function computeVanguardLinkDamageMultiplier(
  targetId: number,
  targetX: number,
  targetZ: number,
  peers: readonly VanguardLinkPeer[]
): number {
  const linkRangeSq = 6.2 * 6.2;
  for (let i = 0; i < peers.length; i++) {
    const p = peers[i];
    if (p.id === targetId || p.hp <= 0 || !p.hasVanguardLink || p.stunTimer > 0) continue;
    const dx = p.x - targetX;
    const dz = p.z - targetZ;
    if (dx * dx + dz * dz <= linkRangeSq) {
      return 0.82; // 18% DR while link is unbroken
    }
  }
  return 1.0;
}

export const QUAKE_PULSE_CONFIG = {
  intervalSec: 7.5,
  telegraphDurationSec: 1.15,
  radius: 4.3,
  damageMult: 1.18,
  interruptExposedSec: 2.5,
  interruptExposedBonus: 0.25,
  vanguardLinkShatterRadius: 6.4,
  vanguardLinkShatterStunSec: 1.05,
} as const;

import type {
  AiAutoPilotTactic,
  AiCompanionRole,
  AiLivePlayerPersonality,
  HeroId,
  SkillDefinition,
  SkillId,
} from '../types/game';

export interface AiVec2 {
  x: number;
  z: number;
}

export interface AiThreatTelegraph {
  kind: 'slam' | 'lunge' | 'lane' | 'spiral' | 'shot';
  x: number;
  z: number;
  radius: number;
  /** Remaining seconds until detonation (<= 0.35 triggers urgent dash) */
  timeRemainingSec: number;
  /** Optional end point for linear lane/lunge telegraphs */
  endX?: number;
  endZ?: number;
}

export interface AiIncomingBullet {
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius?: number;
}

export interface AiEnemySnapshot {
  id: number;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  isBoss: boolean;
  radius: number;
  staggerBroken?: boolean;
}

export interface AiHealOrbSnapshot {
  x: number;
  z: number;
}

export interface AiObstacleSnapshot {
  x: number;
  z: number;
  radius: number;
}

export interface AutoPilotInput {
  tactic: AiAutoPilotTactic;
  simTimeSec: number;
  playerX: number;
  playerZ: number;
  hpRatio: number;
  ultCharge: number;
  dashReady: boolean;
  activeSkillReady: boolean;
  overchargeRatio: number;
  portalOpen: boolean;
  portalX: number;
  portalZ: number;
  arenaHalfW: number;
  arenaHalfD: number;
  enemies: AiEnemySnapshot[];
  telegraphs: AiThreatTelegraph[];
  incomingBullets: AiIncomingBullet[];
  healOrbs?: AiHealOrbSnapshot[];
  obstacles?: AiObstacleSnapshot[];
}

export interface AutoPilotDecision {
  moveX: number;
  moveZ: number;
  wantDash: boolean;
  wantUltimate: boolean;
  wantActiveSkill: boolean;
  /** Concise Vietnamese tactical status text for HUD readout */
  statusLabel: string;
  /** True when actively evading a Boss telegraph or incoming projectile */
  evadingDanger: boolean;
}

export interface AiTacticConfig {
  id: AiAutoPilotTactic;
  label: string;
  shortLabel: string;
  description: string;
  preferredMinDist: number;
  preferredMaxDist: number;
  telegraphPadding: number;
  bulletLookaheadSec: number;
  dashUrgencySec: number;
  healSeekHpRatio: number;
  stutterMoveDuty: number; // fraction of cycle spent moving vs standing still to fire
  ultMinEnemyCountOrBoss: number;
}

export const AI_TACTIC_CONFIGS: Record<AiAutoPilotTactic, AiTacticConfig> = {
  aggressive: {
    id: 'aggressive',
    label: 'Tấn Công',
    shortLabel: 'Công',
    description: 'Áp sát tầm tối ưu, xả Tụ Lực & Tuyệt Kỹ liên tục khi Boss hở giáp.',
    preferredMinDist: 3.9,
    preferredMaxDist: 6.1,
    telegraphPadding: 0.75,
    bulletLookaheadSec: 0.45,
    dashUrgencySec: 0.28,
    healSeekHpRatio: 0.32,
    stutterMoveDuty: 0.34,
    ultMinEnemyCountOrBoss: 1,
  },
  balanced: {
    id: 'balanced',
    label: 'Cân Bằng',
    shortLabel: 'Cân Bằng',
    description: 'Thả diều đều nhịp giữa bắn và di chuyển, giữ Lướt để né đòn Boss.',
    preferredMinDist: 5.4,
    preferredMaxDist: 8.0,
    telegraphPadding: 1.15,
    bulletLookaheadSec: 0.62,
    dashUrgencySec: 0.36,
    healSeekHpRatio: 0.48,
    stutterMoveDuty: 0.48,
    ultMinEnemyCountOrBoss: 2,
  },
  evasive: {
    id: 'evasive',
    label: 'Né Bảo Toàn',
    shortLabel: 'Né',
    description: 'Ưu tiên tuyệt đối khoảng trống an toàn, mở rộng biên né vòng đỏ & đạn.',
    preferredMinDist: 7.2,
    preferredMaxDist: 10.4,
    telegraphPadding: 1.75,
    bulletLookaheadSec: 0.82,
    dashUrgencySec: 0.48,
    healSeekHpRatio: 0.65,
    stutterMoveDuty: 0.62,
    ultMinEnemyCountOrBoss: 2,
  },
};

export interface AiCompanionRoleConfig {
  role: AiCompanionRole;
  name: string;
  roleLabel: string;
  heroId: HeroId;
  accentHex: number;
  preferredMinDist: number;
  preferredMaxDist: number;
  moveSpeed: number;
  attackCooldownSec: number;
  damageScale: number;
  supportEffect: 'shield' | 'volley' | 'heal_slow';
  description: string;
}

export const AI_COMPANION_ROLES: Record<AiCompanionRole, AiCompanionRoleConfig> = {
  vanguard: {
    role: 'vanguard',
    name: 'Hộ Vệ Tinh Giáp',
    roleLabel: 'Hộ Vệ',
    heroId: 'thor',
    accentHex: 0x38bdf8,
    preferredMinDist: 2.3,
    preferredMaxDist: 4.2,
    moveSpeed: 6.2,
    attackCooldownSec: 0.62,
    damageScale: 0.62,
    supportEffect: 'shield',
    description: 'Chặn tuyến trước, thu hút quái thường & dựng khiên năng lượng cho đội.',
  },
  ranger: {
    role: 'ranger',
    name: 'Xạ Thủ Ngân Hà',
    roleLabel: 'Xạ Thủ',
    heroId: 'artemis',
    accentHex: 0xfbbf24,
    preferredMinDist: 5.5,
    preferredMaxDist: 8.2,
    moveSpeed: 6.8,
    attackCooldownSec: 0.48,
    damageScale: 0.76,
    supportEffect: 'volley',
    description: 'Đánh sườn linh hoạt, thả diều né Boss & bắn loạt tiễn cộng hưởng.',
  },
  mystic: {
    role: 'mystic',
    name: 'Pháp Sư Tinh Tú',
    roleLabel: 'Pháp Sư',
    heroId: 'rolla',
    accentHex: 0x34d399,
    preferredMinDist: 6.8,
    preferredMaxDist: 9.8,
    moveSpeed: 6.4,
    attackCooldownSec: 0.58,
    damageScale: 0.66,
    supportEffect: 'heal_slow',
    description: 'Giữ tầm xa an toàn, làm chậm quái & hồi phục HP định kỳ cho người chơi.',
  },
};

function clampVal(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function normalizeVec(x: number, z: number): AiVec2 {
  const len = Math.hypot(x, z);
  if (len < 1e-5) return { x: 0, z: 0 };
  return { x: x / len, z: z / len };
}

/**
 * Closest point on a 2D line segment AB to point P. Used for Boss lane/lunge telegraph evasion.
 */
function closestPointOnSegment(
  px: number,
  pz: number,
  ax: number,
  az: number,
  bx: number,
  bz: number
): AiVec2 {
  const abx = bx - ax;
  const abz = bz - az;
  const abLenSq = abx * abx + abz * abz;
  if (abLenSq < 1e-6) return { x: ax, z: az };
  const t = clampVal(((px - ax) * abx + (pz - az) * abz) / abLenSq, 0, 1);
  return { x: ax + abx * t, z: az + abz * t };
}

/**
 * Computes combined threat repulsion vector from Boss telegraphs, incoming bullets,
 * obstacles, and arena walls. Guarantees the escape vector pushes back inside arena bounds.
 */
export function computeDangerAvoidanceVector(params: {
  x: number;
  z: number;
  arenaHalfW: number;
  arenaHalfD: number;
  telegraphs: AiThreatTelegraph[];
  incomingBullets: AiIncomingBullet[];
  obstacles?: AiObstacleSnapshot[];
  telegraphPadding: number;
  bulletLookaheadSec: number;
}): { escapeX: number; escapeZ: number; dangerScore: number; urgentTelegraphSec: number } {
  let escapeX = 0;
  let escapeZ = 0;
  let dangerScore = 0;
  let urgentTelegraphSec = Number.POSITIVE_INFINITY;

  // 1. Boss & Elite telegraphs (circles, lanes, lunges, spirals)
  for (const tg of params.telegraphs) {
    let cx = tg.x;
    let cz = tg.z;
    if ((tg.kind === 'lane' || tg.kind === 'lunge') && tg.endX !== undefined && tg.endZ !== undefined) {
      const closest = closestPointOnSegment(params.x, params.z, tg.x, tg.z, tg.endX, tg.endZ);
      cx = closest.x;
      cz = closest.z;
    }

    const dx = params.x - cx;
    const dz = params.z - cz;
    const dist = Math.hypot(dx, dz);
    const safeRadius = tg.radius + params.telegraphPadding;

    if (dist < safeRadius) {
      const penetration = (safeRadius - dist) / Math.max(0.5, safeRadius);
      // If standing dead-center on a telegraph, steer perpendicular/toward arena center
      let dirX = 0;
      let dirZ = 0;
      if (dist > 0.05) {
        dirX = dx / dist;
        dirZ = dz / dist;
      } else {
        const toCenter = normalizeVec(-params.x, -params.z);
        dirX = toCenter.x || 1;
        dirZ = toCenter.z || 0;
      }
      const weight = (2.6 + penetration * 3.4) * (tg.timeRemainingSec <= 0.45 ? 1.55 : 1.0);
      escapeX += dirX * weight;
      escapeZ += dirZ * weight;
      dangerScore = Math.max(dangerScore, 1 + penetration);
      urgentTelegraphSec = Math.min(urgentTelegraphSec, Math.max(0, tg.timeRemainingSec));
    }
  }

  // 2. Incoming enemy projectiles (predictive perpendicular side-step)
  for (const b of params.incomingBullets) {
    const speed = Math.hypot(b.vx, b.vz);
    if (speed < 0.2) continue;
    const relX = params.x - b.x;
    const relZ = params.z - b.z;
    const bDirX = b.vx / speed;
    const bDirZ = b.vz / speed;
    const along = relX * bDirX + relZ * bDirZ;
    const maxLookDist = speed * params.bulletLookaheadSec;

    if (along >= -0.4 && along <= maxLookDist) {
      // Signed lateral distance from bullet trajectory
      const perpX = -bDirZ;
      const perpZ = bDirX;
      const lateral = relX * perpX + relZ * perpZ;
      const avoidWidth = (b.radius ?? 0.35) + 1.25;
      if (Math.abs(lateral) < avoidWidth) {
        const sideSign = lateral >= 0 ? 1 : -1;
        const timeToHit = Math.max(0.05, along / speed);
        const urgency = clampVal(1.3 - timeToHit, 0.35, 1.35);
        escapeX += perpX * sideSign * urgency * 2.2;
        escapeZ += perpZ * sideSign * urgency * 2.2;
        dangerScore = Math.max(dangerScore, 0.75 + urgency * 0.5);
        if (timeToHit < 0.22 && Math.abs(lateral) < 0.7) {
          urgentTelegraphSec = Math.min(urgentTelegraphSec, timeToHit);
        }
      }
    }
  }

  // 3. Soft wall repulsion so AI never pins itself into corners while dodging
  const wallMargin = 1.65;
  const maxX = Math.max(2, params.arenaHalfW - 0.85);
  const maxZ = Math.max(2, params.arenaHalfD - 0.85);

  if (params.x > maxX - wallMargin) {
    escapeX -= ((params.x - (maxX - wallMargin)) / wallMargin) * 2.8;
  } else if (params.x < -maxX + wallMargin) {
    escapeX += ((-maxX + wallMargin - params.x) / wallMargin) * 2.8;
  }

  if (params.z > maxZ - wallMargin) {
    escapeZ -= ((params.z - (maxZ - wallMargin)) / wallMargin) * 2.8;
  } else if (params.z < -maxZ + wallMargin) {
    escapeZ += ((-maxZ + wallMargin - params.z) / wallMargin) * 2.8;
  }

  // 4. Obstacle separation
  if (params.obstacles) {
    for (const obs of params.obstacles) {
      const dx = params.x - obs.x;
      const dz = params.z - obs.z;
      const dist = Math.hypot(dx, dz);
      const avoidR = obs.radius + 1.05;
      if (dist < avoidR && dist > 0.01) {
        const push = ((avoidR - dist) / avoidR) * 1.9;
        escapeX += (dx / dist) * push;
        escapeZ += (dz / dist) * push;
      }
    }
  }

  return { escapeX, escapeZ, dangerScore, urgentTelegraphSec };
}

/**
 * Core 60Hz deterministic AI Auto-Pilot controller for the player hero.
 * Zero random jitter -> 100% deterministic at 12 / 30 / 60 FPS with identical seed/input.
 */
export function computeAutoPilotDecision(input: AutoPilotInput): AutoPilotDecision {
  const cfg = AI_TACTIC_CONFIGS[input.tactic];

  // 1. Check active dangers first (Boss telegraphs + enemy bullets)
  const avoidance = computeDangerAvoidanceVector({
    x: input.playerX,
    z: input.playerZ,
    arenaHalfW: input.arenaHalfW,
    arenaHalfD: input.arenaHalfD,
    telegraphs: input.telegraphs,
    incomingBullets: input.incomingBullets,
    obstacles: input.obstacles,
    telegraphPadding: cfg.telegraphPadding,
    bulletLookaheadSec: cfg.bulletLookaheadSec,
  });

  // Check if a boss is present or staggered
  const boss = input.enemies.find((e) => e.isBoss && e.hp > 0) ?? null;
  let nearest: AiEnemySnapshot | null = null;
  let nearestDist = Number.POSITIVE_INFINITY;
  for (const e of input.enemies) {
    if (e.hp <= 0) continue;
    const d = Math.hypot(e.x - input.playerX, e.z - input.playerZ);
    if (d < nearestDist) {
      nearestDist = d;
      nearest = e;
    }
  }

  const hasTargets = nearest !== null;
  const wantUltimate =
    input.ultCharge >= 100 &&
    hasTargets &&
    (Boolean(boss) || input.enemies.length >= cfg.ultMinEnemyCountOrBoss || input.hpRatio < 0.45);

  const wantActiveSkill =
    input.activeSkillReady &&
    hasTargets &&
    (Boolean(boss && (boss.staggerBroken || nearestDist < 11)) ||
      input.tactic === 'aggressive' ||
      input.hpRatio < 0.55);

  // Urgent danger evasion always overrides standing still
  if (avoidance.dangerScore >= 0.72) {
    const dir = normalizeVec(avoidance.escapeX, avoidance.escapeZ);
    const wantDash = input.dashReady && avoidance.urgentTelegraphSec <= cfg.dashUrgencySec;
    return {
      moveX: dir.x,
      moveZ: dir.z,
      wantDash,
      wantUltimate,
      wantActiveSkill,
      statusLabel: wantDash ? 'Lướt né đòn Boss!' : 'Đang né vùng nguy hiểm',
      evadingDanger: true,
    };
  }

  // 2. Room cleared -> walk smoothly to open portal (or pick up heal orb first)
  if (!hasTargets) {
    if (input.healOrbs && input.healOrbs.length > 0 && input.hpRatio < 0.85) {
      const orb = input.healOrbs[0];
      const d = normalizeVec(orb.x - input.playerX, orb.z - input.playerZ);
      return {
        moveX: d.x,
        moveZ: d.z,
        wantDash: false,
        wantUltimate: false,
        wantActiveSkill: false,
        statusLabel: 'Nhặt cầu hồi máu',
        evadingDanger: false,
      };
    }
    if (input.portalOpen) {
      const dx = input.portalX - input.playerX;
      const dz = input.portalZ - input.playerZ;
      const dist = Math.hypot(dx, dz);
      if (dist > 0.35) {
        const dir = normalizeVec(dx, dz);
        return {
          moveX: dir.x,
          moveZ: dir.z,
          wantDash: false,
          wantUltimate: false,
          wantActiveSkill: false,
          statusLabel: 'Tiến vào cổng ải kế',
          evadingDanger: false,
        };
      }
    }
    return {
      moveX: 0,
      moveZ: 0,
      wantDash: false,
      wantUltimate: false,
      wantActiveSkill: false,
      statusLabel: 'Chờ mục tiêu mới',
      evadingDanger: false,
    };
  }

  // 3. Low-HP heal orb priority (especially for Evasive/Balanced)
  if (input.healOrbs && input.healOrbs.length > 0 && input.hpRatio < cfg.healSeekHpRatio) {
    let bestOrb = input.healOrbs[0];
    let bestOrbDist = Math.hypot(bestOrb.x - input.playerX, bestOrb.z - input.playerZ);
    for (let i = 1; i < input.healOrbs.length; i++) {
      const d = Math.hypot(input.healOrbs[i].x - input.playerX, input.healOrbs[i].z - input.playerZ);
      if (d < bestOrbDist) {
        bestOrbDist = d;
        bestOrb = input.healOrbs[i];
      }
    }
    if (bestOrbDist > 0.5) {
      const dir = normalizeVec(
        bestOrb.x - input.playerX + avoidance.escapeX * 0.45,
        bestOrb.z - input.playerZ + avoidance.escapeZ * 0.45
      );
      return {
        moveX: dir.x,
        moveZ: dir.z,
        wantDash: false,
        wantUltimate,
        wantActiveSkill,
        statusLabel: 'Di chuyển nhặt hồi máu',
        evadingDanger: false,
      };
    }
  }

  // 4. Stutter-step kiting: stop briefly to unleash shots / Astral Overcharge when in safe sweet spot
  const target = boss ?? nearest!;
  const dx = target.x - input.playerX;
  const dz = target.z - input.playerZ;
  const dist = Math.hypot(dx, dz);
  const toTarget = normalizeVec(dx, dz);

  // If Overcharge is nearly full (>= 0.88) and safely outside danger, hold brief firing stance to fire Overcharge!
  const inSweetSpot = dist >= cfg.preferredMinDist && dist <= cfg.preferredMaxDist;
  const cyclePhase = (input.simTimeSec * 0.85) % 1;
  const shouldStandAndFire =
    (inSweetSpot && cyclePhase >= cfg.stutterMoveDuty) ||
    (input.overchargeRatio >= 0.88 && dist >= cfg.preferredMinDist * 0.78);

  if (shouldStandAndFire) {
    return {
      moveX: 0,
      moveZ: 0,
      wantDash: false,
      wantUltimate,
      wantActiveSkill,
      statusLabel:
        input.overchargeRatio >= 0.88
          ? 'Đứng trụ xả Tụ Lực'
          : boss?.staggerBroken
          ? 'Xả sát thương Boss vỡ giáp'
          : 'Ngắm bắn mục tiêu',
      evadingDanger: false,
    };
  }

  // Compute desired tactical positioning vector (kiting + lateral strafe + wall safety)
  let steerX = avoidance.escapeX * 0.75;
  let steerZ = avoidance.escapeZ * 0.75;

  if (dist < cfg.preferredMinDist) {
    // Backpedal away from close enemies
    steerX -= toTarget.x * 1.45;
    steerZ -= toTarget.z * 1.45;
  } else if (dist > cfg.preferredMaxDist) {
    // Advance into effective bow range
    steerX += toTarget.x * 1.15;
    steerZ += toTarget.z * 1.15;
  }

  // Deterministic alternating strafe orbit around target
  const strafeSign = Math.sin(input.simTimeSec * 0.65) >= 0 ? 1 : -1;
  steerX += -toTarget.z * strafeSign * 0.95;
  steerZ += toTarget.x * strafeSign * 0.95;

  const finalDir = normalizeVec(steerX, steerZ);
  return {
    moveX: finalDir.x,
    moveZ: finalDir.z,
    wantDash: false,
    wantUltimate,
    wantActiveSkill,
    statusLabel: dist < cfg.preferredMinDist ? 'Lùi thả diều giữ tầm' : 'Di chuyển chọn góc bắn',
    evadingDanger: false,
  };
}

/**
 * Returns true if the player is actively providing manual WASD / joystick input,
 * yielding zero-latency manual control immediately.
 */
export function shouldManualOverride(manualX: number, manualZ: number): boolean {
  return Math.hypot(manualX, manualZ) > 0.12;
}

/**
 * Smart AI Skill Draft advisor: prioritizes Skill Evolutions, weapon multi-shot core,
 * elemental synergies, and tactic-appropriate survivability.
 */
export function selectBestSkillChoice(
  choices: SkillDefinition[],
  currentStacks: Partial<Record<SkillId, number>>,
  tactic: AiAutoPilotTactic
): SkillDefinition | null {
  if (choices.length === 0) return null;

  const has = (id: SkillId) => (currentStacks[id] ?? 0) > 0;
  let best = choices[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const skill of choices) {
    let score = 10;

    // Rarity weight
    if (skill.rarity === 'legend') score += 34;
    else if (skill.rarity === 'epic') score += 22;
    else if (skill.rarity === 'rare') score += 12;

    // Evolution match bonus
    if (
      (skill.id === 'super_blaze' && has('fire_arrow')) ||
      (skill.id === 'super_freeze' && has('ice_arrow')) ||
      (skill.id === 'super_bolt' && has('lightning_arrow')) ||
      (skill.id === 'super_circle' && has('orbit_orbs')) ||
      (skill.id === 'twin_strike' && has('flying_swords')) ||
      (skill.id === 'super_meteor' && has('meteor_shower'))
    ) {
      score += 48;
    }

    // Core Archero DPS multipliers
    if (
      skill.id === 'multishot' ||
      skill.id === 'front_arrow' ||
      skill.id === 'ricochet' ||
      skill.id === 'tracking_eye'
    ) {
      score += 28;
    }

    // Tactic bias
    if (tactic === 'aggressive' && (skill.buildTag === 'boss' || skill.category === 'weapon')) {
      score += 14;
    } else if (tactic === 'evasive' && (skill.buildTag === 'sustain' || skill.category === 'circle')) {
      score += 18;
    } else if (tactic === 'balanced' && (skill.buildTag === 'hybrid' || skill.buildTag === 'aoe')) {
      score += 10;
    }

    if (score > bestScore) {
      bestScore = score;
      best = skill;
    }
  }

  return best;
}

/**
 * 60Hz deterministic steering for 3D AI Squad Companions (Vanguard, Ranger, Mystic).
 */
export function computeAiCompanionDecision(params: {
  role: AiCompanionRole;
  slotIndex: number;
  simTimeSec: number;
  x: number;
  z: number;
  playerX: number;
  playerZ: number;
  arenaHalfW: number;
  arenaHalfD: number;
  target: AiEnemySnapshot | null;
  telegraphs: AiThreatTelegraph[];
  incomingBullets: AiIncomingBullet[];
  obstacles?: AiObstacleSnapshot[];
}): { steerX: number; steerZ: number; evading: boolean } {
  const cfg = AI_COMPANION_ROLES[params.role];
  const avoidance = computeDangerAvoidanceVector({
    x: params.x,
    z: params.z,
    arenaHalfW: params.arenaHalfW,
    arenaHalfD: params.arenaHalfD,
    telegraphs: params.telegraphs,
    incomingBullets: params.incomingBullets,
    obstacles: params.obstacles,
    telegraphPadding: params.role === 'vanguard' ? 0.85 : 1.35,
    bulletLookaheadSec: 0.55,
  });

  if (avoidance.dangerScore >= 0.8) {
    const dir = normalizeVec(avoidance.escapeX, avoidance.escapeZ);
    return { steerX: dir.x, steerZ: dir.z, evading: true };
  }

  if (!params.target) {
    // Formation follow behind/beside player
    const flankOffset = params.slotIndex === 0 ? -2.4 : 2.4;
    const fx = params.playerX + flankOffset - params.x;
    const fz = params.playerZ + 1.4 - params.z;
    if (Math.hypot(fx, fz) < 0.7) return { steerX: 0, steerZ: 0, evading: false };
    const dir = normalizeVec(fx, fz);
    return { steerX: dir.x, steerZ: dir.z, evading: false };
  }

  const dx = params.target.x - params.x;
  const dz = params.target.z - params.z;
  const dist = Math.hypot(dx, dz);
  const toTarget = normalizeVec(dx, dz);

  let sx = avoidance.escapeX * 0.6;
  let sz = avoidance.escapeZ * 0.6;

  if (dist < cfg.preferredMinDist) {
    sx -= toTarget.x * 1.15;
    sz -= toTarget.z * 1.15;
  } else if (dist > cfg.preferredMaxDist) {
    sx += toTarget.x * 1.15;
    sz += toTarget.z * 1.15;
  }

  // Distinct role geometry: Vanguard anchors between player & boss; Ranger flanks wide; Mystic stays near player's backline
  if (params.role === 'vanguard') {
    const midX = (params.playerX + params.target.x) * 0.52;
    const midZ = (params.playerZ + params.target.z) * 0.52;
    const toGuard = normalizeVec(midX - params.x, midZ - params.z);
    sx += toGuard.x * 0.7;
    sz += toGuard.z * 0.7;
  } else {
    const strafeSign = params.slotIndex % 2 === 0 ? 1 : -1;
    const wave = Math.cos(params.simTimeSec * 1.15 + params.slotIndex * 2.1);
    sx += -toTarget.z * strafeSign * wave * 0.9;
    sz += toTarget.x * strafeSign * wave * 0.9;
  }

  const dir = normalizeVec(sx, sz);
  return { steerX: dir.x, steerZ: dir.z, evading: false };
}

/**
 * 60Hz deterministic real-time AI Rival 1v1 Duel controller.
 * Dodges incoming player arrows, stutter-steps, and adapts by personality.
 */
export function computeAiRivalDuelDecision(params: {
  personality: AiLivePlayerPersonality;
  simTimeSec: number;
  rivalX: number;
  rivalZ: number;
  playerX: number;
  playerZ: number;
  rivalHpRatio: number;
  arenaHalfW: number;
  arenaHalfD: number;
  playerBullets: AiIncomingBullet[];
  obstacles?: AiObstacleSnapshot[];
}): { moveX: number; moveZ: number; wantFire: boolean; wantDashBurst: boolean; evadingArrow: boolean } {
  const avoidance = computeDangerAvoidanceVector({
    x: params.rivalX,
    z: params.rivalZ,
    arenaHalfW: params.arenaHalfW,
    arenaHalfD: params.arenaHalfD,
    telegraphs: [],
    incomingBullets: params.playerBullets,
    obstacles: params.obstacles,
    telegraphPadding: 0.9,
    bulletLookaheadSec: params.personality === 'assassin' ? 0.78 : 0.62,
  });

  if (avoidance.dangerScore >= 0.78) {
    const dir = normalizeVec(avoidance.escapeX, avoidance.escapeZ);
    return {
      moveX: dir.x,
      moveZ: dir.z,
      wantFire: false,
      wantDashBurst: avoidance.urgentTelegraphSec <= 0.24,
      evadingArrow: true,
    };
  }

  const dx = params.playerX - params.rivalX;
  const dz = params.playerZ - params.rivalZ;
  const dist = Math.hypot(dx, dz);
  const toPlayer = normalizeVec(dx, dz);

  const prefMin =
    params.personality === 'aggressive' ? 4.2 : params.personality === 'assassin' ? 5.0 : 6.4;
  const prefMax =
    params.personality === 'aggressive' ? 6.8 : params.personality === 'assassin' ? 8.2 : 9.4;

  // Stutter-step window so rival visibly pauses to loose volleys like a real human player
  const cadence = (params.simTimeSec * (params.personality === 'aggressive' ? 1.1 : 0.85)) % 1;
  const inRange = dist >= prefMin * 0.85 && dist <= prefMax * 1.15;
  if (inRange && cadence > 0.56) {
    return {
      moveX: 0,
      moveZ: 0,
      wantFire: true,
      wantDashBurst: false,
      evadingArrow: false,
    };
  }

  let sx = avoidance.escapeX * 0.75;
  let sz = avoidance.escapeZ * 0.75;
  if (dist < prefMin) {
    sx -= toPlayer.x * 1.3;
    sz -= toPlayer.z * 1.3;
  } else if (dist > prefMax) {
    sx += toPlayer.x * 1.25;
    sz += toPlayer.z * 1.25;
  }

  const strafeSign =
    params.personality === 'assassin'
      ? Math.sin(params.simTimeSec * 2.1) >= 0
        ? 1
        : -1
      : Math.sin(params.simTimeSec * 0.9) >= 0
      ? 1
      : -1;
  sx += -toPlayer.z * strafeSign * 1.05;
  sz += toPlayer.x * strafeSign * 1.05;

  const dir = normalizeVec(sx, sz);
  return {
    moveX: dir.x,
    moveZ: dir.z,
    wantFire: false,
    wantDashBurst: params.personality === 'assassin' && dist > 8.5 && cadence < 0.08,
    evadingArrow: false,
  };
}

/**
 * Deterministic Fixed-Tick Kinesthetics Clock (Pillar 2):
 * Runs purely in integer 60Hz simulation ticks so Hit-Stop and Perfect Dodge
 * slow-mo micro-bursts produce identical simulation outcomes at 12, 30, and 60 FPS!
 */
export interface DeterministicKinestheticsClock {
  hitStopTicksRemaining: number;
  perfectDodgeSlowTicksRemaining: number;
  totalHitStopTriggers: number;
  totalPerfectDodgeBursts: number;
}

export function createDeterministicKinestheticsClock(): DeterministicKinestheticsClock {
  return {
    hitStopTicksRemaining: 0,
    perfectDodgeSlowTicksRemaining: 0,
    totalHitStopTriggers: 0,
    totalPerfectDodgeBursts: 0,
  };
}

export function triggerDeterministicHitStop(
  clock: DeterministicKinestheticsClock,
  ticks = 3
): void {
  const clamped = Math.max(1, Math.min(5, Math.floor(ticks)));
  if (clock.hitStopTicksRemaining === 0) {
    clock.totalHitStopTriggers += 1;
  }
  clock.hitStopTicksRemaining = Math.max(clock.hitStopTicksRemaining, clamped);
}

export function triggerDeterministicPerfectDodgeBurst(
  clock: DeterministicKinestheticsClock,
  ticks = 12
): void {
  clock.perfectDodgeSlowTicksRemaining = Math.max(
    clock.perfectDodgeSlowTicksRemaining,
    Math.max(4, Math.min(18, Math.floor(ticks)))
  );
  clock.totalPerfectDodgeBursts += 1;
}

/**
 * Advances the kinesthetics clock by exactly one 60Hz tick and returns the
 * effective deterministic time scale for combat entities:
 * - Hit-Stop tick -> 0.08 (micro-freeze impact punch while preserving tick count)
 * - Perfect Dodge micro-burst -> 0.48 (tactile bullet-time window)
 * - Normal tick -> 1.0
 */
export function advanceKinestheticsTick(clock: DeterministicKinestheticsClock): {
  entityTimeScale: number;
  inHitStop: boolean;
  inPerfectDodgeSlow: boolean;
} {
  if (clock.hitStopTicksRemaining > 0) {
    clock.hitStopTicksRemaining -= 1;
    return { entityTimeScale: 0.08, inHitStop: true, inPerfectDodgeSlow: false };
  }
  if (clock.perfectDodgeSlowTicksRemaining > 0) {
    clock.perfectDodgeSlowTicksRemaining -= 1;
    return { entityTimeScale: 0.48, inHitStop: false, inPerfectDodgeSlow: true };
  }
  return { entityTimeScale: 1.0, inHitStop: false, inPerfectDodgeSlow: false };
}

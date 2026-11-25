import { EnemyKind } from '../types/game';

/**
 * Fair Crowd-Combat Attack Token Director.
 * Ensures mobs coordinate attack windows instead of overlapping lethal strikes
 * on the same frame, while waiting enemies orbit/flank cleanly around the player.
 */

export type SquadRole = 'melee' | 'ranged' | 'caster';

export interface SquadTokenEntry {
  enemyId: number;
  role: SquadRole;
  expiresAtSec: number;
  isElite: boolean;
}

export interface EnemySquadDirectorState {
  activeTokens: Map<number, SquadTokenEntry>;
  flankFlipCounter: number;
  totalGranted: number;
  totalDeferred: number;
}

export interface CrowdAttackTokenBudget {
  maxTotalConcurrent: number;
  maxMeleeConcurrent: number;
  maxRangedConcurrent: number;
}

export interface SquadTokenRequest {
  enemyId: number;
  kind: EnemyKind;
  distToPlayer: number;
  isElite?: boolean;
}

export interface SquadTokenDecision {
  granted: boolean;
  role: SquadRole;
  retryDelaySec: number;
  flankSignSuggestion: 1 | -1;
}

export function createEnemySquadDirectorState(): EnemySquadDirectorState {
  return {
    activeTokens: new Map<number, SquadTokenEntry>(),
    flankFlipCounter: 0,
    totalGranted: 0,
    totalDeferred: 0,
  };
}

export function classifySquadRole(kind: EnemyKind): SquadRole {
  switch (kind) {
    case EnemyKind.WISP:
    case EnemyKind.DRAGON_WHELP:
      return 'caster';
    case EnemyKind.IMP_ARCHER:
      return 'ranged';
    case EnemyKind.GOLEM:
    case EnemyKind.SKIRMISHER:
    case EnemyKind.SHADOW_STALKER:
    default:
      return 'melee';
  }
}

export function resolveCrowdAttackTokenBudget(params: {
  chapterId: number;
  isLiteMode: boolean;
  hasActiveBoss: boolean;
}): CrowdAttackTokenBudget {
  const ch = Math.max(1, Math.min(12, Math.floor(params.chapterId || 1)));
  let maxTotal = ch >= 7 ? 4 : ch >= 3 ? 3 : 2;
  let maxMelee = ch >= 5 ? 2 : 2;
  let maxRanged = ch >= 4 ? 2 : 1;

  if (params.hasActiveBoss) {
    // Keep Boss readability clear by curbing concurrent minion strikes
    maxTotal = Math.max(1, maxTotal - 1);
    maxMelee = 1;
    maxRanged = 1;
  }

  if (params.isLiteMode) {
    // Slightly gentler concurrent projectile/telegraph density on E5430 Lite
    maxTotal = Math.min(maxTotal, 3);
  }

  return {
    maxTotalConcurrent: maxTotal,
    maxMeleeConcurrent: maxMelee,
    maxRangedConcurrent: maxRanged,
  };
}

export function pruneSquadAttackTokens(
  state: EnemySquadDirectorState,
  aliveEnemyIds: ReadonlySet<number>,
  nowSec: number
): void {
  for (const [enemyId, entry] of state.activeTokens.entries()) {
    if (!aliveEnemyIds.has(enemyId) || entry.expiresAtSec <= nowSec) {
      state.activeTokens.delete(enemyId);
    }
  }
}

export function releaseSquadAttackToken(state: EnemySquadDirectorState, enemyId: number): void {
  state.activeTokens.delete(enemyId);
}

export function requestSquadAttackToken(
  state: EnemySquadDirectorState,
  req: SquadTokenRequest,
  budget: CrowdAttackTokenBudget,
  nowSec: number,
  holdDurationSec = 1.5
): SquadTokenDecision {
  const role = classifySquadRole(req.kind);
  const existing = state.activeTokens.get(req.enemyId);
  if (existing && existing.expiresAtSec > nowSec) {
    return {
      granted: true,
      role,
      retryDelaySec: 0,
      flankSignSuggestion: (req.enemyId % 2 === 0 ? 1 : -1) as 1 | -1,
    };
  }

  // Clean expired tokens lazily
  for (const [id, entry] of state.activeTokens.entries()) {
    if (entry.expiresAtSec <= nowSec) {
      state.activeTokens.delete(id);
    }
  }

  let meleeCount = 0;
  let rangedOrCasterCount = 0;
  for (const entry of state.activeTokens.values()) {
    if (entry.role === 'melee') meleeCount += 1;
    else rangedOrCasterCount += 1;
  }

  const eliteSlack = req.isElite ? 1 : 0;
  const totalLimit = budget.maxTotalConcurrent + eliteSlack;
  const roleLimit =
    role === 'melee'
      ? budget.maxMeleeConcurrent + (req.isElite ? 1 : 0)
      : budget.maxRangedConcurrent + (req.isElite ? 1 : 0);
  const roleCount = role === 'melee' ? meleeCount : rangedOrCasterCount;

  if (state.activeTokens.size < totalLimit && roleCount < roleLimit) {
    state.activeTokens.set(req.enemyId, {
      enemyId: req.enemyId,
      role,
      expiresAtSec: nowSec + Math.max(0.4, holdDurationSec),
      isElite: Boolean(req.isElite),
    });
    state.totalGranted += 1;
    return {
      granted: true,
      role,
      retryDelaySec: 0,
      flankSignSuggestion: (req.enemyId % 2 === 0 ? 1 : -1) as 1 | -1,
    };
  }

  state.totalDeferred += 1;
  state.flankFlipCounter += 1;
  const flankSignSuggestion: 1 | -1 = (state.flankFlipCounter + req.enemyId) % 2 === 0 ? 1 : -1;
  const distJitter = Math.min(0.45, Math.max(0, req.distToPlayer * 0.02));
  const retryDelaySec = Number((0.45 + distJitter).toFixed(2));

  return {
    granted: false,
    role,
    retryDelaySec,
    flankSignSuggestion,
  };
}

export function computeSquadWaitingFlankImpulse(params: {
  enemyX: number;
  enemyZ: number;
  playerX: number;
  playerZ: number;
  role: SquadRole;
  flankSign: number;
  baseSpeed: number;
}): { vx: number; vz: number } {
  const dx = params.playerX - params.enemyX;
  const dz = params.playerZ - params.enemyZ;
  const dist = Math.hypot(dx, dz) || 0.001;
  const toX = dx / dist;
  const toZ = dz / dist;

  const sign = params.flankSign >= 0 ? 1 : -1;
  const tangentX = -toZ * sign;
  const tangentZ = toX * sign;

  const desiredRadius = params.role === 'melee' ? 4.4 : params.role === 'ranged' ? 8.2 : 7.4;
  const radialError = dist - desiredRadius;
  const radialPull = Math.max(-0.55, Math.min(0.65, radialError * 0.22));

  const rawX = tangentX * 0.85 + toX * radialPull;
  const rawZ = tangentZ * 0.85 + toZ * radialPull;
  const rawLen = Math.hypot(rawX, rawZ) || 1;
  const orbitSpeed = Math.max(0.5, params.baseSpeed * 0.72);

  return {
    vx: (rawX / rawLen) * orbitSpeed,
    vz: (rawZ / rawLen) * orbitSpeed,
  };
}

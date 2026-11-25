import { EnemyKind } from '../types/game';

export type SquadCombatRole = 'vanguard' | 'skirmisher' | 'ranged' | 'flanker';

export interface CrowdTokenBudgetInput {
  chapterId: number;
  isLiteMode: boolean;
  hasActiveBoss: boolean;
}

export interface SquadTokenCandidate {
  enemyId: number;
  kind: EnemyKind;
  distToPlayer: number;
  isElite?: boolean;
}

export interface SquadTokenDecision {
  granted: boolean;
  activeTokens: number;
  budget: number;
  retryDelaySec: number;
  flankSignSuggestion: 1 | -1;
  reason: 'granted' | 'renewed' | 'budget_full' | 'role_reserved';
}

export interface ActiveTokenEntry {
  role: SquadCombatRole;
  expiresAtSec: number;
}

export interface EnemySquadDirectorState {
  activeTokens: Map<number, ActiveTokenEntry>;
  lastGrantedAtSec: Map<number, number>;
  grantCounter: number;
}

export function createEnemySquadDirectorState(): EnemySquadDirectorState {
  return {
    activeTokens: new Map<number, ActiveTokenEntry>(),
    lastGrantedAtSec: new Map<number, number>(),
    grantCounter: 0,
  };
}

export function resetEnemySquadDirectorState(state: EnemySquadDirectorState): void {
  state.activeTokens.clear();
  state.lastGrantedAtSec.clear();
  state.grantCounter = 0;
}

export function classifySquadRole(kind: EnemyKind): SquadCombatRole {
  switch (kind) {
    case EnemyKind.GOLEM:
      return 'vanguard';
    case EnemyKind.IMP_ARCHER:
    case EnemyKind.WISP:
      return 'ranged';
    case EnemyKind.SHADOW_STALKER:
    case EnemyKind.DRAGON_WHELP:
      return 'flanker';
    default:
      return 'skirmisher';
  }
}

/**
 * Resolves the concurrent non-boss attack token ceiling (strictly 2..5)
 * balancing crisp combat readability with Dell Latitude E5430 Lite safety.
 */
export function resolveCrowdAttackTokenBudget(input: CrowdTokenBudgetInput): number {
  const ch = Math.max(1, Math.min(12, Math.floor(input.chapterId || 1)));
  let budget: number;
  if (ch <= 3) {
    budget = 3;
  } else if (ch <= 8) {
    budget = 4;
  } else {
    budget = 5;
  }

  if (input.isLiteMode) {
    budget = Math.min(budget, 3);
  }
  if (input.hasActiveBoss) {
    budget = Math.max(2, budget - 1);
  }

  return Math.max(2, Math.min(5, budget));
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
  if (state.lastGrantedAtSec.size > 96) {
    for (const enemyId of state.lastGrantedAtSec.keys()) {
      if (!aliveEnemyIds.has(enemyId)) {
        state.lastGrantedAtSec.delete(enemyId);
      }
    }
  }
}

export function releaseSquadAttackToken(
  state: EnemySquadDirectorState,
  enemyId: number
): void {
  state.activeTokens.delete(enemyId);
}

/**
 * Requests a shared crowd attack token for a non-boss enemy.
 * Prevents unfair simultaneous mob dogpiling while rotating flank/ranged pressure smoothly.
 */
export function requestSquadAttackToken(
  state: EnemySquadDirectorState,
  candidate: SquadTokenCandidate,
  budget: number,
  nowSec: number,
  holdDurationSec = 1.65
): SquadTokenDecision {
  const clampedBudget = Math.max(2, Math.min(5, Math.floor(budget)));
  const role = classifySquadRole(candidate.kind);
  const clampedHold = Math.max(0.35, Math.min(4.0, holdDurationSec));
  const flankSignSuggestion: 1 | -1 = (candidate.enemyId + state.grantCounter) % 2 === 0 ? 1 : -1;

  const existing = state.activeTokens.get(candidate.enemyId);
  if (existing) {
    existing.expiresAtSec = nowSec + clampedHold;
    return {
      granted: true,
      activeTokens: state.activeTokens.size,
      budget: clampedBudget,
      retryDelaySec: 0,
      flankSignSuggestion,
      reason: 'renewed',
    };
  }

  // Sweep expired slots lazily in case caller skipped explicit prune
  for (const [id, entry] of state.activeTokens.entries()) {
    if (entry.expiresAtSec <= nowSec) {
      state.activeTokens.delete(id);
    }
  }

  if (state.activeTokens.size >= clampedBudget) {
    // Fair retry jitter based on id so waiting enemies stagger smoothly
    const stagger = 0.28 + ((candidate.enemyId * 37) % 10) * 0.025;
    return {
      granted: false,
      activeTokens: state.activeTokens.size,
      budget: clampedBudget,
      retryDelaySec: stagger,
      flankSignSuggestion,
      reason: 'budget_full',
    };
  }

  // Role balance guard: when budget >= 3, avoid letting ranged-only enemies consume 100% of tokens
  // unless this unit is an Elite or has waited > 3.2s since its last attack.
  if (clampedBudget >= 3 && role === 'ranged' && !candidate.isElite) {
    let activeRanged = 0;
    for (const entry of state.activeTokens.values()) {
      if (entry.role === 'ranged') activeRanged += 1;
    }
    const maxRangedShare = clampedBudget - 1;
    const lastGrant = state.lastGrantedAtSec.get(candidate.enemyId) ?? -999;
    const waitedSec = nowSec - lastGrant;
    if (activeRanged >= maxRangedShare && waitedSec < 3.2) {
      return {
        granted: false,
        activeTokens: state.activeTokens.size,
        budget: clampedBudget,
        retryDelaySec: 0.36,
        flankSignSuggestion,
        reason: 'role_reserved',
      };
    }
  }

  state.activeTokens.set(candidate.enemyId, {
    role,
    expiresAtSec: nowSec + clampedHold,
  });
  state.lastGrantedAtSec.set(candidate.enemyId, nowSec);
  state.grantCounter += 1;

  return {
    granted: true,
    activeTokens: state.activeTokens.size,
    budget: clampedBudget,
    retryDelaySec: 0,
    flankSignSuggestion,
    reason: 'granted',
  };
}

/**
 * Computes a gentle tactical flank/spacing drift when an enemy is waiting for an attack token,
 * ensuring crowds circle and pressure naturally instead of clumping statically in one line.
 */
export function computeSquadWaitingFlankImpulse(params: {
  enemyX: number;
  enemyZ: number;
  playerX: number;
  playerZ: number;
  role: SquadCombatRole;
  flankSign: 1 | -1;
  baseSpeed: number;
}): { vx: number; vz: number } {
  const dx = params.playerX - params.enemyX;
  const dz = params.playerZ - params.enemyZ;
  const dist = Math.hypot(dx, dz);
  if (dist < 0.001) return { vx: 0, vz: 0 };

  const dirX = dx / dist;
  const dirZ = dz / dist;
  // Perpendicular tangent vector for flank orbit
  const tanX = -dirZ * params.flankSign;
  const tanZ = dirX * params.flankSign;

  const preferredBand =
    params.role === 'ranged'
      ? 9.2
      : params.role === 'flanker'
      ? 6.4
      : params.role === 'vanguard'
      ? 4.6
      : 5.4;

  // Radial pull/push toward tactical waiting ring
  let radialWeight = 0;
  if (dist < preferredBand - 1.2) {
    radialWeight = -0.55; // Back off slightly (ranged kite / spacing)
  } else if (dist > preferredBand + 1.4) {
    radialWeight = 0.45; // Close into ready ring
  }

  const orbitWeight = 0.72;
  const mag = Math.hypot(dirX * radialWeight + tanX * orbitWeight, dirZ * radialWeight + tanZ * orbitWeight) || 1;
  const speed = params.baseSpeed * 0.68;

  return {
    vx: ((dirX * radialWeight + tanX * orbitWeight) / mag) * speed,
    vz: ((dirZ * radialWeight + tanZ * orbitWeight) / mag) * speed,
  };
}

export type CombatAnimState =
  | 'idle'
  | 'walk'
  | 'run'
  | 'attack'
  | 'skill_cast'
  | 'hit_reaction'
  | 'dodge'
  | 'stun'
  | 'knockback'
  | 'death'
  | 'spawn'
  | 'victory';

export interface CombatAnimStateInput {
  isDead?: boolean;
  isVictory?: boolean;
  isSpawning?: boolean;
  isStunned?: boolean;
  isKnockedBack?: boolean;
  isDodging?: boolean;
  isCastingSkill?: boolean;
  isHitReacting?: boolean;
  isAttacking?: boolean;
  moveSpeedRatio?: number;
}

export interface CombatAnimStateResolution {
  state: CombatAnimState;
  fadeSec: number;
  priority: number;
}

/**
 * Deterministic 12-state Combat Animation State Machine covering all Criterion 05 states:
 * Idle, Walk, Run, Attack, Skill Cast, Hit Reaction, Dodge, Stun, Knockback, Death, Spawn, Victory.
 */
export function resolveCombatAnimState(input: CombatAnimStateInput): CombatAnimStateResolution {
  if (input.isDead) return { state: 'death', fadeSec: 0.08, priority: 100 };
  if (input.isVictory) return { state: 'victory', fadeSec: 0.18, priority: 95 };
  if (input.isSpawning) return { state: 'spawn', fadeSec: 0.16, priority: 90 };
  if (input.isStunned) return { state: 'stun', fadeSec: 0.1, priority: 85 };
  if (input.isKnockedBack) return { state: 'knockback', fadeSec: 0.07, priority: 80 };
  if (input.isDodging) return { state: 'dodge', fadeSec: 0.06, priority: 75 };
  if (input.isCastingSkill) return { state: 'skill_cast', fadeSec: 0.08, priority: 70 };
  if (input.isHitReacting) return { state: 'hit_reaction', fadeSec: 0.06, priority: 65 };
  if (input.isAttacking) return { state: 'attack', fadeSec: 0.08, priority: 55 };
  const speed = input.moveSpeedRatio ?? 0;
  if (speed >= 0.58) return { state: 'run', fadeSec: 0.14, priority: 30 };
  if (speed >= 0.08) return { state: 'walk', fadeSec: 0.16, priority: 20 };
  return { state: 'idle', fadeSec: 0.22, priority: 10 };
}

export interface CombatKinematicPose {
  active: boolean;
  recoilPitch: number;
  recoilRoll: number;
  squashImpulse: number;
  staggerBlend: number;
  victoryPhase: number;
  dodgeLean?: number;
  skillCastPulse?: number;
  spawnSettle?: number;
  deathBlend?: number;
  criticalSnap?: number;
  finisherFollowThrough?: number;
}

export interface CombatKinematicTransformDelta {
  offsetY: number;
  rotX: number;
  rotZ: number;
  scaleY: number;
}

export function createCombatKinematicPose(): CombatKinematicPose {
  return {
    active: false,
    recoilPitch: 0,
    recoilRoll: 0,
    squashImpulse: 0,
    staggerBlend: 0,
    victoryPhase: 0,
    dodgeLean: 0,
    skillCastPulse: 0,
    spawnSettle: 0,
    deathBlend: 0,
    criticalSnap: 0,
    finisherFollowThrough: 0,
  };
}

export function applyAttackReleaseRecoil(
  pose: CombatKinematicPose,
  strength = 0.85,
  reducedMotion = false
): void {
  const motionScale = reducedMotion ? 0.25 : 1.0;
  const clamped = Math.max(0.1, Math.min(1.5, strength)) * motionScale;
  pose.active = true;
  pose.recoilPitch = Math.max(-0.28, pose.recoilPitch - 0.14 * clamped);
  pose.squashImpulse = Math.max(-0.14, pose.squashImpulse - 0.065 * clamped);
}

export function applyDodgeBank(
  pose: CombatKinematicPose,
  strength = 1.0,
  reducedMotion = false
): void {
  const motionScale = reducedMotion ? 0.25 : 1.0;
  const clamped = Math.max(0.2, Math.min(1.4, strength)) * motionScale;
  pose.active = true;
  pose.dodgeLean = Math.min(0.32, (pose.dodgeLean ?? 0) + 0.24 * clamped);
  pose.squashImpulse = Math.min(0.14, (pose.squashImpulse ?? 0) + 0.08 * clamped);
}

export function applySkillCastPulse(
  pose: CombatKinematicPose,
  strength = 1.0,
  reducedMotion = false
): void {
  const motionScale = reducedMotion ? 0.25 : 1.0;
  const clamped = Math.max(0.2, Math.min(1.5, strength)) * motionScale;
  pose.active = true;
  pose.skillCastPulse = Math.min(0.35, (pose.skillCastPulse ?? 0) + 0.26 * clamped);
  pose.recoilPitch = Math.max(-0.3, pose.recoilPitch - 0.12 * clamped);
}

export function applySpawnSettle(
  pose: CombatKinematicPose,
  reducedMotion = false
): void {
  const motionScale = reducedMotion ? 0.25 : 1.0;
  pose.active = true;
  pose.spawnSettle = 0.42 * motionScale;
  pose.squashImpulse = -0.1 * motionScale;
}

export function applyDirectionalHitRecoil(
  pose: CombatKinematicPose,
  dx: number,
  dz: number,
  facingYaw: number,
  strength = 1.0,
  reducedMotion = false
): void {
  const dist = Math.hypot(dx, dz) || 1;
  const nx = dx / dist;
  const nz = dz / dist;
  const fwdX = Math.sin(facingYaw);
  const fwdZ = Math.cos(facingYaw);
  const rightX = Math.cos(facingYaw);
  const rightZ = -Math.sin(facingYaw);
  const fwdDot = nx * fwdX + nz * fwdZ;
  const rightDot = nx * rightX + nz * rightZ;
  const motionScale = reducedMotion ? 0.25 : 1.0;
  const clamped = Math.max(0.2, Math.min(1.6, strength)) * motionScale;

  pose.active = true;
  pose.recoilPitch = Math.max(-0.34, Math.min(0.34, pose.recoilPitch + fwdDot * 0.22 * clamped));
  pose.recoilRoll = Math.max(-0.32, Math.min(0.32, pose.recoilRoll - rightDot * 0.2 * clamped));
  pose.squashImpulse = Math.max(-0.16, pose.squashImpulse - 0.08 * clamped);
}

export function stepCombatKinematicPose(
  pose: CombatKinematicPose,
  dt: number,
  options: {
    isVictory?: boolean;
    isStunnedOrStaggered?: boolean;
    isDead?: boolean;
    reducedMotion?: boolean;
  },
  out: CombatKinematicTransformDelta
): CombatKinematicTransformDelta {
  const safeDt = Math.max(0, Math.min(0.1, dt));
  const damp = Math.exp(-11 * safeDt);
  const slowDamp = Math.exp(-8.5 * safeDt);
  pose.recoilPitch *= damp;
  pose.recoilRoll *= damp;
  pose.squashImpulse *= damp;
  pose.dodgeLean = (pose.dodgeLean ?? 0) * damp;
  pose.skillCastPulse = (pose.skillCastPulse ?? 0) * slowDamp;
  pose.spawnSettle = (pose.spawnSettle ?? 0) * slowDamp;
  pose.criticalSnap = (pose.criticalSnap ?? 0) * damp;
  pose.finisherFollowThrough = (pose.finisherFollowThrough ?? 0) * slowDamp;

  const targetStagger = options.isStunnedOrStaggered ? 1 : 0;
  const staggerRate = targetStagger > pose.staggerBlend ? 10 : 8;
  pose.staggerBlend += (targetStagger - pose.staggerBlend) * (1 - Math.exp(-staggerRate * safeDt));
  if (pose.staggerBlend < 0.001) pose.staggerBlend = 0;

  const targetDeath = options.isDead ? 1 : 0;
  const currentDeath = pose.deathBlend ?? 0;
  pose.deathBlend = currentDeath + (targetDeath - currentDeath) * (1 - Math.exp(-7 * safeDt));
  if (pose.deathBlend < 0.001) pose.deathBlend = 0;

  const motionScale = options.reducedMotion ? 0.25 : 1.0;

  let victoryBounce = 0;
  if (options.isVictory && !options.isDead) {
    pose.victoryPhase += safeDt * 5.2;
    victoryBounce = (Math.abs(Math.sin(pose.victoryPhase)) * 0.1 + 0.04) * motionScale;
  } else {
    pose.victoryPhase = 0;
  }

  const staggerOffsetY = -0.22 * pose.staggerBlend * motionScale;
  const staggerRotX = 0.26 * pose.staggerBlend * motionScale;
  const staggerSquash = -0.1 * pose.staggerBlend * motionScale;

  const castLiftY = (pose.skillCastPulse ?? 0) * 0.65;
  const spawnDropY = (pose.spawnSettle ?? 0) * 0.85;
  const finisherLiftY = (pose.finisherFollowThrough ?? 0) * 0.48;
  const critSnapRotX = -(pose.criticalSnap ?? 0) * 0.28;
  const deathOffsetY = -0.26 * (pose.deathBlend ?? 0) * motionScale;
  const deathRotX = 0.42 * (pose.deathBlend ?? 0) * motionScale;

  pose.active =
    Boolean(options.isVictory) ||
    Boolean(options.isStunnedOrStaggered) ||
    Boolean(options.isDead) ||
    pose.staggerBlend > 0.002 ||
    (pose.deathBlend ?? 0) > 0.002 ||
    Math.abs(pose.recoilPitch) > 0.002 ||
    Math.abs(pose.recoilRoll) > 0.002 ||
    Math.abs(pose.squashImpulse) > 0.002 ||
    Math.abs(pose.dodgeLean ?? 0) > 0.002 ||
    Math.abs(pose.skillCastPulse ?? 0) > 0.002 ||
    Math.abs(pose.spawnSettle ?? 0) > 0.002 ||
    Math.abs(pose.criticalSnap ?? 0) > 0.002 ||
    Math.abs(pose.finisherFollowThrough ?? 0) > 0.002;

  out.offsetY =
    victoryBounce + staggerOffsetY + castLiftY + spawnDropY + finisherLiftY + deathOffsetY;
  out.rotX =
    pose.recoilPitch + staggerRotX + (pose.dodgeLean ?? 0) + critSnapRotX + deathRotX;
  out.rotZ = pose.recoilRoll;
  out.scaleY = Math.max(
    0.76,
    Math.min(
      1.18,
      1 +
        pose.squashImpulse +
        staggerSquash +
        victoryBounce * 0.25 +
        (pose.skillCastPulse ?? 0) * 0.22 +
        (pose.finisherFollowThrough ?? 0) * 0.16
    )
  );
  return out;
}

/**
 * Wave 18: Zero-GC Critical Stagger Snap impulse on heavy crits / ripostes.
 * Respects reducedMotion (0.25x amplitude).
 */
export function applyCriticalStaggerSnap(
  pose: CombatKinematicPose,
  strength = 1.0,
  reducedMotion = false
): void {
  const motionScale = reducedMotion ? 0.25 : 1.0;
  const clamped = Math.max(0.2, Math.min(1.5, strength)) * motionScale;
  pose.active = true;
  pose.criticalSnap = Math.min(0.45, (pose.criticalSnap ?? 0) + 0.3 * clamped);
  pose.recoilPitch = Math.max(-0.36, pose.recoilPitch - 0.16 * clamped);
  pose.squashImpulse = Math.max(-0.18, pose.squashImpulse - 0.09 * clamped);
}

/**
 * Wave 18: Zero-GC Finisher Follow-Through trigger on Boss / Elite kills or Riposte executions.
 */
export function applyFinisherFollowThrough(
  pose: CombatKinematicPose,
  strength = 1.0,
  reducedMotion = false
): void {
  const motionScale = reducedMotion ? 0.25 : 1.0;
  const clamped = Math.max(0.2, Math.min(1.5, strength)) * motionScale;
  pose.active = true;
  pose.finisherFollowThrough = Math.min(0.46, (pose.finisherFollowThrough ?? 0) + 0.34 * clamped);
  pose.squashImpulse = Math.min(0.16, pose.squashImpulse + 0.08 * clamped);
}

/**
 * Wave 18: Standalone Zero-GC step for Finisher Follow-Through arc (for callers
 * or unit tests stepping finisher recovery directly without allocating).
 */
export function stepFinisherFollowThrough(
  pose: CombatKinematicPose,
  dt: number,
  reducedMotion = false
): number {
  const safeDt = Math.max(0, Math.min(0.1, dt));
  const current = pose.finisherFollowThrough ?? 0;
  if (current <= 0.001) {
    pose.finisherFollowThrough = 0;
    return 0;
  }
  const damp = Math.exp(-7.5 * safeDt);
  const next = current * damp;
  pose.finisherFollowThrough = next < 0.001 ? 0 : next;
  const motionScale = reducedMotion ? 0.25 : 1.0;
  return pose.finisherFollowThrough * 0.48 * motionScale;
}

// ============================================================================
// WAVE 12: ZERO-GC ENEMY & BOSS CHOREOGRAPHY KINEMATICS
// (Attack Windup Anticipation, Guard-Break/Stagger Kneel & Tremor, Death Dissolve)
// ============================================================================

export type EnemyChoreographyPhase = 'idle' | 'windup' | 'stagger_kneel' | 'dissolve';

export interface EnemyChoreographyState {
  phase: EnemyChoreographyPhase;
  windupBlend: number;
  staggerBlend: number;
  tremorPhase: number;
}

export interface EnemyChoreographyInput {
  dt: number;
  /** Normalized 0..1 telegraph / attack windup progress */
  telegraphProgress: number;
  /** True when enemy is stunned or Boss guard-broken */
  isStaggeredOrBroken: boolean;
  /** True for Bosses (stronger anticipation lift & deeper kneel) */
  isBoss: boolean;
  /** Accessibility reduced motion flag */
  reducedMotion: boolean;
}

export interface EnemyChoreographyDelta {
  offsetY: number;
  rotX: number;
  rotZ: number;
  scaleYMult: number;
  scaleXZMult: number;
  emissiveBoost: number;
  phase: EnemyChoreographyPhase;
}

export const DYING_CORPSE_CAP_HIGH = 12;
export const DYING_CORPSE_CAP_LITE = 5;

export function computeDissolveCap(liteActive: boolean): number {
  return liteActive ? DYING_CORPSE_CAP_LITE : DYING_CORPSE_CAP_HIGH;
}

export function createEnemyChoreographyState(): EnemyChoreographyState {
  return {
    phase: 'idle',
    windupBlend: 0,
    staggerBlend: 0,
    tremorPhase: 0,
  };
}

export function createEnemyChoreographyDelta(): EnemyChoreographyDelta {
  return {
    offsetY: 0,
    rotX: 0,
    rotZ: 0,
    scaleYMult: 1,
    scaleXZMult: 1,
    emissiveBoost: 0,
    phase: 'idle',
  };
}

/**
 * Pure Zero-GC enemy/boss procedural kinematics step writing directly into `out`.
 * Syncs telegraph windup anticipation lean/lift and guard-break/stun stagger kneel + tremor.
 */
export function stepEnemyChoreography(
  state: EnemyChoreographyState,
  input: EnemyChoreographyInput,
  out: EnemyChoreographyDelta
): EnemyChoreographyDelta {
  const safeDt = Math.max(0, Math.min(0.1, input.dt));
  const motionScale = input.reducedMotion ? 0.25 : 1.0;
  const clampedTele = Math.max(0, Math.min(1, input.telegraphProgress || 0));

  const targetStagger = input.isStaggeredOrBroken ? 1 : 0;
  const staggerRate = targetStagger > state.staggerBlend ? 12 : 8;
  state.staggerBlend += (targetStagger - state.staggerBlend) * (1 - Math.exp(-staggerRate * safeDt));
  if (state.staggerBlend < 0.001) state.staggerBlend = 0;

  const targetWindup = input.isStaggeredOrBroken ? 0 : clampedTele;
  const windupRate = targetWindup > state.windupBlend ? 15 : 10;
  state.windupBlend += (targetWindup - state.windupBlend) * (1 - Math.exp(-windupRate * safeDt));
  if (state.windupBlend < 0.001) state.windupBlend = 0;

  if (state.staggerBlend > 0.05) {
    state.tremorPhase += safeDt * (input.isBoss ? 22 : 28);
  } else {
    state.tremorPhase = 0;
  }

  const bossWeight = input.isBoss ? 1.25 : 1.0;

  // Anticipation curve: coil back 0..0.72, snap forward 0.72..1.0
  let windupPitch = 0;
  let windupLiftY = 0;
  let windupScaleY = 0;
  let windupScaleXZ = 0;
  if (state.windupBlend > 0.001) {
    const w = state.windupBlend;
    if (w < 0.72) {
      const coil = w / 0.72;
      windupPitch = -0.22 * coil * bossWeight * motionScale; // rear back
      windupLiftY = 0.14 * coil * bossWeight * motionScale;
      windupScaleY = 0.07 * coil * motionScale;
      windupScaleXZ = -0.04 * coil * motionScale;
    } else {
      const strike = (w - 0.72) / 0.28;
      windupPitch = (-0.22 + strike * 0.44) * bossWeight * motionScale; // lunge forward
      windupLiftY = (0.14 * (1 - strike)) * bossWeight * motionScale;
      windupScaleY = (0.07 - strike * 0.12) * motionScale;
      windupScaleXZ = (-0.04 + strike * 0.09) * motionScale;
    }
  }

  // Guard-break / stun kneel + rhythmic tremor
  const kneelOffsetY = -0.24 * state.staggerBlend * bossWeight * motionScale;
  const kneelPitch = 0.28 * state.staggerBlend * bossWeight * motionScale;
  const tremorRoll =
    state.staggerBlend > 0.05
      ? Math.sin(state.tremorPhase) * 0.095 * state.staggerBlend * motionScale
      : 0;
  const staggerSquashY = -0.11 * state.staggerBlend * motionScale;
  const staggerStretchXZ = 0.07 * state.staggerBlend * motionScale;

  let phase: EnemyChoreographyPhase = 'idle';
  if (state.staggerBlend > 0.12) {
    phase = 'stagger_kneel';
  } else if (state.windupBlend > 0.08) {
    phase = 'windup';
  }
  state.phase = phase;

  out.phase = phase;
  out.offsetY = windupLiftY + kneelOffsetY;
  out.rotX = windupPitch + kneelPitch;
  out.rotZ = tremorRoll;
  out.scaleYMult = Math.max(0.74, Math.min(1.18, 1 + windupScaleY + staggerSquashY));
  out.scaleXZMult = Math.max(0.84, Math.min(1.18, 1 + windupScaleXZ + staggerStretchXZ));
  out.emissiveBoost =
    state.windupBlend > 0.15
      ? state.windupBlend * (input.isBoss ? 0.55 : 0.35)
      : state.staggerBlend * 0.28;
  return out;
}


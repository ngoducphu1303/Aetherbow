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
    Math.abs(pose.spawnSettle ?? 0) > 0.002;

  out.offsetY = victoryBounce + staggerOffsetY + castLiftY + spawnDropY + deathOffsetY;
  out.rotX = pose.recoilPitch + staggerRotX + (pose.dodgeLean ?? 0) + deathRotX;
  out.rotZ = pose.recoilRoll;
  out.scaleY = Math.max(
    0.76,
    Math.min(
      1.16,
      1 +
        pose.squashImpulse +
        staggerSquash +
        victoryBounce * 0.25 +
        (pose.skillCastPulse ?? 0) * 0.22
    )
  );
  return out;
}

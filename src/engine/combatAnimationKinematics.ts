/**
 * Zero-GC Procedural Combat Animation Blending & Spring Kinematics.
 * Provides frame-rate independent exponential damping for:
 * - Directional hit-reaction recoil tilt (away from incoming impact vector)
 * - Attack anticipation windup & bow-release recoil
 * - Boss stagger / cast-interrupt knee-drop posture
 * - Stage-clear / victory flourish pulse
 *
 * Fully respects `reducedMotion` by scaling tilt/bob amplitudes to subtle 25% cues.
 */

export interface CombatKinematicPose {
  recoilPitch: number;
  recoilRoll: number;
  windupScaleY: number;
  windupLeanPitch: number;
  staggerDropY: number;
  staggerPitch: number;
  victoryLiftY: number;
  victoryPhase: number;
  active: boolean;
}

export interface CombatKinematicTransformDelta {
  offsetY: number;
  rotX: number;
  rotZ: number;
  scaleY: number;
}

export function createCombatKinematicPose(): CombatKinematicPose {
  return {
    recoilPitch: 0,
    recoilRoll: 0,
    windupScaleY: 1,
    windupLeanPitch: 0,
    staggerDropY: 0,
    staggerPitch: 0,
    victoryLiftY: 0,
    victoryPhase: 0,
    active: false,
  };
}

/**
 * Frame-rate independent exponential damp (equivalent to THREE.MathUtils.damp without importing Three.js).
 */
export function dampScalar(current: number, target: number, lambda: number, dt: number): number {
  if (!Number.isFinite(dt) || dt <= 0) return current;
  const alpha = 1 - Math.exp(-Math.max(0.01, lambda) * dt);
  return current + (target - current) * alpha;
}

/**
 * Applies a directional hit-recoil impulse tilted away from the incoming projectile/strike vector.
 * Converts world-space knock direction into entity-local pitch/roll using the entity's facing yaw.
 */
export function applyDirectionalHitRecoil(
  pose: CombatKinematicPose,
  impactDirX: number,
  impactDirZ: number,
  entityYaw: number,
  intensity = 1.0,
  reducedMotion = false
): void {
  const mag = Math.hypot(impactDirX, impactDirZ);
  const nx = mag > 0.0001 ? impactDirX / mag : 0;
  const nz = mag > 0.0001 ? impactDirZ / mag : 1;

  // Entity forward = (sin(yaw), cos(yaw)), right = (cos(yaw), -sin(yaw))
  const sinY = Math.sin(entityYaw);
  const cosY = Math.cos(entityYaw);
  const forwardDot = nx * sinY + nz * cosY;
  const rightDot = nx * cosY - nz * sinY;

  const scale = Math.max(0.2, Math.min(1.6, intensity)) * (reducedMotion ? 0.25 : 1.0);
  const maxAngle = reducedMotion ? 0.08 : 0.28;

  pose.recoilPitch = Math.max(
    -maxAngle,
    Math.min(maxAngle, pose.recoilPitch + forwardDot * 0.22 * scale)
  );
  pose.recoilRoll = Math.max(
    -maxAngle,
    Math.min(maxAngle, pose.recoilRoll - rightDot * 0.22 * scale)
  );
  pose.active = true;
}

/**
 * Applies bow-release or heavy attack kickback impulse.
 */
export function applyAttackReleaseRecoil(
  pose: CombatKinematicPose,
  intensity = 1.0,
  reducedMotion = false
): void {
  const scale = Math.max(0.25, Math.min(1.5, intensity)) * (reducedMotion ? 0.25 : 1.0);
  pose.windupLeanPitch = Math.max(-0.22, pose.windupLeanPitch - 0.14 * scale);
  pose.windupScaleY = Math.max(0.88, 1 - 0.06 * scale);
  pose.active = true;
}

/**
 * Advances the combat kinematic pose in-place (zero allocations) and writes the
 * blended transform delta into the caller-provided output object.
 */
export function stepCombatKinematicPose(
  pose: CombatKinematicPose,
  dt: number,
  state: {
    isTelegraphing?: boolean;
    telegraphProgress?: number;
    isStunnedOrStaggered?: boolean;
    isVictory?: boolean;
    reducedMotion?: boolean;
  },
  out: CombatKinematicTransformDelta
): CombatKinematicTransformDelta {
  const safeDt = Math.max(0, Math.min(0.1, Number.isFinite(dt) ? dt : 0));
  const motionMult = state.reducedMotion ? 0.25 : 1.0;

  // Smooth exponential spring return for directional hit recoil
  pose.recoilPitch = dampScalar(pose.recoilPitch, 0, 14, safeDt);
  pose.recoilRoll = dampScalar(pose.recoilRoll, 0, 14, safeDt);

  // Attack anticipation crouch & forward lean during telegraph windup
  const telegraphProg = Math.max(0, Math.min(1, state.telegraphProgress ?? 0));
  const targetWindupScale = state.isTelegraphing
    ? 1 - (0.08 * telegraphProg) * motionMult
    : 1;
  const targetWindupPitch = state.isTelegraphing
    ? 0.16 * telegraphProg * motionMult
    : 0;

  pose.windupScaleY = dampScalar(pose.windupScaleY, targetWindupScale, 12, safeDt);
  pose.windupLeanPitch = dampScalar(pose.windupLeanPitch, targetWindupPitch, 12, safeDt);

  // Stagger / Cast Interrupt knee-drop posture
  const targetStaggerDrop = state.isStunnedOrStaggered ? -0.18 * motionMult : 0;
  const targetStaggerPitch = state.isStunnedOrStaggered ? 0.24 * motionMult : 0;
  pose.staggerDropY = dampScalar(pose.staggerDropY, targetStaggerDrop, 11, safeDt);
  pose.staggerPitch = dampScalar(pose.staggerPitch, targetStaggerPitch, 11, safeDt);

  // Victory flourish bounce
  if (state.isVictory) {
    pose.victoryPhase += safeDt * 5.2;
    const targetLift = Math.max(0, Math.sin(pose.victoryPhase)) * 0.22 * motionMult;
    pose.victoryLiftY = dampScalar(pose.victoryLiftY, targetLift, 14, safeDt);
  } else {
    pose.victoryLiftY = dampScalar(pose.victoryLiftY, 0, 12, safeDt);
  }

  out.offsetY = pose.staggerDropY + pose.victoryLiftY;
  out.rotX = pose.recoilPitch + pose.windupLeanPitch + pose.staggerPitch;
  out.rotZ = pose.recoilRoll;
  out.scaleY = pose.windupScaleY;

  pose.active =
    Math.abs(out.offsetY) > 0.002 ||
    Math.abs(out.rotX) > 0.002 ||
    Math.abs(out.rotZ) > 0.002 ||
    Math.abs(out.scaleY - 1) > 0.002;

  return out;
}

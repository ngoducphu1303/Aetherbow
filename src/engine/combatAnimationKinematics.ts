export interface CombatKinematicPose {
  active: boolean;
  recoilPitch: number;
  recoilRoll: number;
  squashImpulse: number;
  staggerBlend: number;
  victoryPhase: number;
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
  options: { isVictory?: boolean; isStunnedOrStaggered?: boolean; reducedMotion?: boolean },
  out: CombatKinematicTransformDelta
): CombatKinematicTransformDelta {
  const safeDt = Math.max(0, Math.min(0.1, dt));
  const damp = Math.exp(-11 * safeDt);
  pose.recoilPitch *= damp;
  pose.recoilRoll *= damp;
  pose.squashImpulse *= damp;

  const targetStagger = options.isStunnedOrStaggered ? 1 : 0;
  const staggerRate = targetStagger > pose.staggerBlend ? 10 : 8;
  pose.staggerBlend += (targetStagger - pose.staggerBlend) * (1 - Math.exp(-staggerRate * safeDt));
  if (pose.staggerBlend < 0.001) pose.staggerBlend = 0;

  const motionScale = options.reducedMotion ? 0.25 : 1.0;

  let victoryBounce = 0;
  if (options.isVictory) {
    pose.victoryPhase += safeDt * 5.2;
    victoryBounce = (Math.abs(Math.sin(pose.victoryPhase)) * 0.1 + 0.04) * motionScale;
  } else {
    pose.victoryPhase = 0;
  }

  const staggerOffsetY = -0.22 * pose.staggerBlend * motionScale;
  const staggerRotX = 0.26 * pose.staggerBlend * motionScale;
  const staggerSquash = -0.1 * pose.staggerBlend * motionScale;

  pose.active =
    Boolean(options.isVictory) ||
    Boolean(options.isStunnedOrStaggered) ||
    pose.staggerBlend > 0.002 ||
    Math.abs(pose.recoilPitch) > 0.002 ||
    Math.abs(pose.recoilRoll) > 0.002 ||
    Math.abs(pose.squashImpulse) > 0.002;

  out.offsetY = victoryBounce + staggerOffsetY;
  out.rotX = pose.recoilPitch + staggerRotX;
  out.rotZ = pose.recoilRoll;
  out.scaleY = Math.max(
    0.76,
    Math.min(1.16, 1 + pose.squashImpulse + staggerSquash + victoryBounce * 0.25)
  );
  return out;
}

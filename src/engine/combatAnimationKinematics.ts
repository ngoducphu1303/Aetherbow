export interface CombatKinematicPose {
  active: boolean;
  recoilPitch: number;
  recoilRoll: number;
  squashImpulse: number;
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
    victoryPhase: 0,
  };
}

export function applyAttackReleaseRecoil(
  pose: CombatKinematicPose,
  strength = 0.85,
  reducedMotion = false
): void {
  if (reducedMotion) return;
  const clamped = Math.max(0.1, Math.min(1.5, strength));
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
  if (reducedMotion) return;
  const dist = Math.hypot(dx, dz) || 1;
  const nx = dx / dist;
  const nz = dz / dist;
  const fwdX = Math.sin(facingYaw);
  const fwdZ = Math.cos(facingYaw);
  const rightX = Math.cos(facingYaw);
  const rightZ = -Math.sin(facingYaw);
  const fwdDot = nx * fwdX + nz * fwdZ;
  const rightDot = nx * rightX + nz * rightZ;
  const clamped = Math.max(0.2, Math.min(1.6, strength));

  pose.active = true;
  pose.recoilPitch = Math.max(-0.34, Math.min(0.34, pose.recoilPitch + fwdDot * 0.22 * clamped));
  pose.recoilRoll = Math.max(-0.32, Math.min(0.32, pose.recoilRoll - rightDot * 0.2 * clamped));
  pose.squashImpulse = Math.max(-0.16, pose.squashImpulse - 0.08 * clamped);
}

export function stepCombatKinematicPose(
  pose: CombatKinematicPose,
  dt: number,
  options: { isVictory?: boolean; reducedMotion?: boolean },
  out: CombatKinematicTransformDelta
): CombatKinematicTransformDelta {
  const safeDt = Math.max(0, Math.min(0.1, dt));
  const damp = Math.exp(-11 * safeDt);
  pose.recoilPitch *= damp;
  pose.recoilRoll *= damp;
  pose.squashImpulse *= damp;

  if (options.reducedMotion) {
    pose.active = false;
    out.offsetY = 0;
    out.rotX = 0;
    out.rotZ = 0;
    out.scaleY = 1;
    return out;
  }

  let victoryBounce = 0;
  if (options.isVictory) {
    pose.victoryPhase += safeDt * 5.2;
    victoryBounce = Math.abs(Math.sin(pose.victoryPhase)) * 0.12;
  } else {
    pose.victoryPhase = 0;
  }

  pose.active =
    Boolean(options.isVictory) ||
    Math.abs(pose.recoilPitch) > 0.002 ||
    Math.abs(pose.recoilRoll) > 0.002 ||
    Math.abs(pose.squashImpulse) > 0.002;

  out.offsetY = victoryBounce;
  out.rotX = pose.recoilPitch;
  out.rotZ = pose.recoilRoll;
  out.scaleY = Math.max(0.84, Math.min(1.16, 1 + pose.squashImpulse + victoryBounce * 0.25));
  return out;
}

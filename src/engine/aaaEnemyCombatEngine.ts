export type AaaMobKind =
  | 'SKIRMISHER'
  | 'GOLEM'
  | 'IMP_ARCHER'
  | 'DRAGON_WHELP'
  | 'WISP'
  | 'SHADOW_STALKER';

export type AaaMobSkillId =
  | 'pounce_lunge'
  | 'flank_crescent_swipe'
  | 'seismic_fissure_slam'
  | 'juggernaut_advance_slam'
  | 'arcane_tri_volley'
  | 'solar_rune_mortar'
  | 'spear_thrust_dash'
  | 'sweeping_lance_fan'
  | 'phase_dart_blink'
  | 'spiral_pulse_ring'
  | 'shadow_step_ambush'
  | 'twin_shadow_knives';

export type AaaTelegraphVisualType = 'circle' | 'lane' | 'cone' | 'ring';

export interface AaaMobVfxBudget {
  readonly maxMobMortarCircles: number;
  readonly footstepDustChance: number;
  readonly trailParticleScale: number;
  readonly allowSkidDust: boolean;
  readonly allowFissureSparks: boolean;
  readonly allowStrikeRingFlash: boolean;
}

const HIGH_GPU_VFX_BUDGET: AaaMobVfxBudget = Object.freeze({
  maxMobMortarCircles: 5,
  footstepDustChance: 0.42,
  trailParticleScale: 1.0,
  allowSkidDust: true,
  allowFissureSparks: true,
  allowStrikeRingFlash: true,
});

const LITE_GPU_VFX_BUDGET: AaaMobVfxBudget = Object.freeze({
  maxMobMortarCircles: 2,
  footstepDustChance: 0.14,
  trailParticleScale: 0.4,
  allowSkidDust: false,
  allowFissureSparks: false,
  allowStrikeRingFlash: true,
});

export function getAaaMobVfxBudget(lowEndGpu: boolean): AaaMobVfxBudget {
  return lowEndGpu ? LITE_GPU_VFX_BUDGET : HIGH_GPU_VFX_BUDGET;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function normalizeAngle(angle: number): number {
  let a = angle;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

/**
 * Smoothly interpolates yaw along the shortest angular arc with frame-rate-independent damping.
 */
export function dampShortestYaw(
  currentYaw: number,
  targetYaw: number,
  lambda: number,
  dt: number
): number {
  const safeDt = clamp(dt, 0, 0.1);
  const delta = normalizeAngle(targetYaw - currentYaw);
  const alpha = 1 - Math.exp(-Math.max(0.1, lambda) * safeDt);
  return normalizeAngle(currentYaw + delta * alpha);
}

export interface AaaSpatialBody {
  readonly x: number;
  readonly z: number;
  readonly radius: number;
  readonly alive?: boolean;
  readonly dead?: boolean;
  readonly intact?: boolean;
  readonly id?: number;
}

export interface AaaMobSteeringInput {
  readonly kind: AaaMobKind;
  readonly selfId?: number;
  readonly x: number;
  readonly z: number;
  readonly vx: number;
  readonly vz: number;
  readonly radius: number;
  readonly baseSpeed: number;
  readonly facingYaw: number;
  readonly playerX: number;
  readonly playerZ: number;
  readonly flankSign: number;
  readonly isTelegraphing: boolean;
  readonly activeSkill?: AaaMobSkillId | '';
  readonly sideHopTimer: number;
  readonly sideHopDirX: number;
  readonly sideHopDirZ: number;
  readonly elapsedTime: number;
  readonly dt: number;
  readonly currentBankRoll: number;
  readonly currentBankPitch: number;
  readonly neighbors?: ReadonlyArray<AaaSpatialBody>;
  readonly obstacles?: ReadonlyArray<AaaSpatialBody>;
}

export interface AaaMobSteeringResult {
  vx: number;
  vz: number;
  desiredDirX: number;
  desiredDirZ: number;
  targetYaw: number;
  lateralSpeed: number;
  forwardSpeed: number;
  bankRoll: number;
  bankPitch: number;
  isSkidding: boolean;
}

const _steeringOut: AaaMobSteeringResult = {
  vx: 0,
  vz: 0,
  desiredDirX: 0,
  desiredDirZ: 1,
  targetYaw: 0,
  lateralSpeed: 0,
  forwardSpeed: 0,
  bankRoll: 0,
  bankPitch: 0,
  isSkidding: false,
};

function getTelegraphMobilityScale(kind: AaaMobKind, activeSkill?: AaaMobSkillId | ''): number {
  if (activeSkill === 'juggernaut_advance_slam') return 0.52;
  if (activeSkill === 'flank_crescent_swipe') return 0.48;
  if (activeSkill === 'sweeping_lance_fan') return 0.45;
  if (activeSkill === 'twin_shadow_knives') return 0.46;
  switch (kind) {
    case 'SKIRMISHER':
      return 0.36;
    case 'SHADOW_STALKER':
      return 0.42;
    case 'GOLEM':
      return 0.28;
    case 'DRAGON_WHELP':
      return 0.34;
    case 'IMP_ARCHER':
      return 0.30;
    case 'WISP':
      return 0.38;
  }
}

/**
 * Computes AAA Hades-style steering for regular mobs:
 * - Role-specific flanking arcs, ranged kite/orbit bands, and proactive chase
 * - Soft squad separation so mobs fan out instead of stacking
 * - Proactive obstacle tangent avoidance
 * - Telegraph mobility retention (never statically rooted)
 * - Exponential velocity inertia and velocity-coupled roll/pitch banking
 */
export function computeAaaMobSteering(
  input: AaaMobSteeringInput,
  out: AaaMobSteeringResult = _steeringOut
): AaaMobSteeringResult {
  const dt = clamp(input.dt, 0.001, 0.1);
  const dx = input.playerX - input.x;
  const dz = input.playerZ - input.z;
  const distSq = dx * dx + dz * dz;
  const dist = Math.sqrt(Math.max(0.0001, distSq));
  const toPlayerX = dx / dist;
  const toPlayerZ = dz / dist;
  const flankSign = input.flankSign >= 0 ? 1 : -1;
  // Tangent perpendicular to player vector for flanking / strafing
  const tanX = -toPlayerZ * flankSign;
  const tanZ = toPlayerX * flankSign;

  let goalX = 0;
  let goalZ = 0;
  let speedScale = 1.0;

  switch (input.kind) {
    case 'SKIRMISHER': {
      // Aggressive curved flank-in approach
      const flankWeight = dist > 5.5 ? 0.42 : dist > 2.4 ? 0.58 : 0.72;
      const radialWeight = dist > 1.7 ? 0.92 : -0.25;
      goalX = toPlayerX * radialWeight + tanX * flankWeight;
      goalZ = toPlayerZ * radialWeight + tanZ * flankWeight;
      speedScale = dist > 6.5 ? 1.12 : 1.0;
      break;
    }
    case 'SHADOW_STALKER': {
      // Fast predatory circling that closes sharply from off-angles
      const weave = Math.sin(input.elapsedTime * 3.1 + (input.selfId ?? 0) * 1.3) * 0.25;
      const flankWeight = (dist > 4.5 ? 0.55 : 0.75) + weave;
      const radialWeight = dist > 2.0 ? 0.85 : -0.35;
      goalX = toPlayerX * radialWeight + tanX * flankWeight;
      goalZ = toPlayerZ * radialWeight + tanZ * flankWeight;
      speedScale = 1.08;
      break;
    }
    case 'GOLEM': {
      // Heavy relentless pressure with gentle arc so multiple golems bracket the hero
      const flankWeight = dist > 3.2 ? 0.24 : 0.34;
      const radialWeight = dist > 1.85 ? 0.96 : 0.12;
      goalX = toPlayerX * radialWeight + tanX * flankWeight;
      goalZ = toPlayerZ * radialWeight + tanZ * flankWeight;
      speedScale = input.activeSkill === 'juggernaut_advance_slam' ? 1.05 : 0.96;
      break;
    }
    case 'IMP_ARCHER': {
      // Tactical skirmish mage: backpedals if crowded, orbits fluidly at 7-12m
      if (dist < 6.4) {
        goalX = -toPlayerX * 0.86 + tanX * 0.54;
        goalZ = -toPlayerZ * 0.86 + tanZ * 0.54;
        speedScale = 1.04;
      } else if (dist > 12.2) {
        goalX = toPlayerX * 0.9 + tanX * 0.36;
        goalZ = toPlayerZ * 0.9 + tanZ * 0.36;
        speedScale = 1.05;
      } else {
        const microInOut = Math.sin(input.elapsedTime * 1.9 + (input.selfId ?? 0)) * 0.22;
        goalX = tanX * 0.92 + toPlayerX * microInOut;
        goalZ = tanZ * 0.92 + toPlayerZ * microInOut;
        speedScale = 0.88;
      }
      break;
    }
    case 'DRAGON_WHELP': {
      // Spear lancer / mid-range duelist: orbits at 5.5-9.5m looking for clear thrust lanes
      if (dist < 4.8) {
        goalX = -toPlayerX * 0.72 + tanX * 0.7;
        goalZ = -toPlayerZ * 0.72 + tanZ * 0.7;
        speedScale = 1.02;
      } else if (dist > 9.8) {
        goalX = toPlayerX * 0.92 + tanX * 0.34;
        goalZ = toPlayerZ * 0.92 + tanZ * 0.34;
        speedScale = 1.08;
      } else {
        goalX = tanX * 0.88 + toPlayerX * 0.22;
        goalZ = tanZ * 0.88 + toPlayerZ * 0.22;
        speedScale = 0.94;
      }
      break;
    }
    case 'WISP': {
      // Floating arcane orbiter: smooth figure-eight sway at 6.5-11m
      const sway = Math.cos(input.elapsedTime * 2.4 + (input.selfId ?? 0) * 0.9) * 0.32;
      if (dist < 5.6) {
        goalX = -toPlayerX * 0.8 + tanX * 0.65;
        goalZ = -toPlayerZ * 0.8 + tanZ * 0.65;
        speedScale = 1.05;
      } else if (dist > 11.4) {
        goalX = toPlayerX * 0.88 + tanX * 0.45;
        goalZ = toPlayerZ * 0.88 + tanZ * 0.45;
        speedScale = 1.05;
      } else {
        goalX = tanX * 0.95 + toPlayerX * sway;
        goalZ = tanZ * 0.95 + toPlayerZ * sway;
        speedScale = 0.92;
      }
      break;
    }
  }

  // Telegraph mobility retention: keep gliding smoothly into flanking / pressure angles
  if (input.isTelegraphing) {
    const mobScale = getTelegraphMobilityScale(input.kind, input.activeSkill);
    speedScale *= mobScale;
    if (input.activeSkill === 'flank_crescent_swipe' || input.activeSkill === 'sweeping_lance_fan') {
      goalX = tanX * 0.88 + toPlayerX * 0.35;
      goalZ = tanZ * 0.88 + toPlayerZ * 0.35;
    } else if (input.activeSkill === 'juggernaut_advance_slam') {
      goalX = toPlayerX * 0.95 + tanX * 0.2;
      goalZ = toPlayerZ * 0.95 + tanZ * 0.2;
    }
  }

  // Soft squad separation (zero allocation loop)
  let sepX = 0;
  let sepZ = 0;
  if (input.neighbors && input.neighbors.length > 0) {
    const desiredSepBase = input.radius * 2.35 + 0.95;
    for (let i = 0; i < input.neighbors.length; i++) {
      const other = input.neighbors[i];
      if (other.alive === false || other.dead === true) continue;
      if (input.selfId !== undefined && other.id === input.selfId) continue;
      const ox = input.x - other.x;
      const oz = input.z - other.z;
      const dSq = ox * ox + oz * oz;
      const minSep = Math.max(desiredSepBase, input.radius + other.radius + 0.9);
      if (dSq > 0.0001 && dSq < minSep * minSep) {
        const d = Math.sqrt(dSq);
        const push = (1 - d / minSep) * 1.55;
        sepX += (ox / d) * push;
        sepZ += (oz / d) * push;
      } else if (dSq <= 0.0001) {
        sepX += flankSign * 0.9;
        sepZ += 0.45;
      }
    }
  }

  // Proactive obstacle tangent avoidance
  let avoidX = 0;
  let avoidZ = 0;
  if (input.obstacles && input.obstacles.length > 0) {
    for (let i = 0; i < input.obstacles.length; i++) {
      const obs = input.obstacles[i];
      if (obs.intact === false) continue;
      const ox = input.x - obs.x;
      const oz = input.z - obs.z;
      const dSq = ox * ox + oz * oz;
      const clearDist = input.radius + obs.radius + 1.45;
      if (dSq > 0.0001 && dSq < clearDist * clearDist) {
        const d = Math.sqrt(dSq);
        const weight = (1 - d / clearDist) * 2.1;
        const nx = ox / d;
        const nz = oz / d;
        // Combine radial push + tangent glide around pillar so mobs don't stall on corners
        const obsTanX = -nz * flankSign;
        const obsTanZ = nx * flankSign;
        avoidX += (nx * 0.85 + obsTanX * 0.72) * weight;
        avoidZ += (nz * 0.85 + obsTanZ * 0.72) * weight;
      }
    }
  }

  let combX = goalX + sepX + avoidX;
  let combZ = goalZ + sepZ + avoidZ;
  const combLen = Math.hypot(combX, combZ);
  if (combLen > 0.001) {
    combX /= combLen;
    combZ /= combLen;
  } else {
    combX = toPlayerX;
    combZ = toPlayerZ;
  }

  let targetVx = combX * input.baseSpeed * speedScale;
  let targetVz = combZ * input.baseSpeed * speedScale;

  // Post-cast Hades-style lateral hop impulse
  if (input.sideHopTimer > 0) {
    const hopBoost = input.baseSpeed * 1.55 * clamp(input.sideHopTimer / 0.22, 0.25, 1.0);
    targetVx = input.sideHopDirX * hopBoost + targetVx * 0.25;
    targetVz = input.sideHopDirZ * hopBoost + targetVz * 0.25;
  }

  // Archetype-tuned exponential inertia (heavy golems accelerate slower, stalkers snap faster)
  const accelLambda =
    input.kind === 'GOLEM'
      ? 5.2
      : input.kind === 'SHADOW_STALKER'
      ? 10.5
      : input.kind === 'SKIRMISHER'
      ? 9.2
      : 7.8;

  const velAlpha = 1 - Math.exp(-accelLambda * dt);
  const nextVx = input.vx + (targetVx - input.vx) * velAlpha;
  const nextVz = input.vz + (targetVz - input.vz) * velAlpha;

  // Local forward/lateral decomposition for banking & stride animations
  const fwdX = Math.sin(input.facingYaw);
  const fwdZ = Math.cos(input.facingYaw);
  const rightX = Math.cos(input.facingYaw);
  const rightZ = -Math.sin(input.facingYaw);

  const forwardSpeed = nextVx * fwdX + nextVz * fwdZ;
  const lateralSpeed = nextVx * rightX + nextVz * rightZ;

  // Target facing: look toward player when close or telegraphing, otherwise blend toward velocity
  const speed = Math.hypot(nextVx, nextVz);
  let targetYaw = Math.atan2(toPlayerX, toPlayerZ);
  if (!input.isTelegraphing && speed > input.baseSpeed * 0.35 && dist > 3.2) {
    const velYaw = Math.atan2(nextVx, nextVz);
    const blend = input.kind === 'IMP_ARCHER' || input.kind === 'WISP' ? 0.28 : 0.52;
    targetYaw = normalizeAngle(targetYaw + normalizeAngle(velYaw - targetYaw) * blend);
  }

  // Smooth velocity-coupled banking
  const normSpeed = Math.max(1.5, input.baseSpeed);
  const maxRoll = input.kind === 'GOLEM' ? 0.14 : 0.24;
  const maxPitch = input.kind === 'GOLEM' ? 0.10 : 0.16;
  const targetBankRoll = clamp((-lateralSpeed / normSpeed) * maxRoll, -maxRoll, maxRoll);
  const targetBankPitch = clamp((forwardSpeed / normSpeed) * maxPitch, -maxPitch * 0.55, maxPitch);
  const bankAlpha = 1 - Math.exp(-9.5 * dt);
  const bankRoll = input.currentBankRoll + (targetBankRoll - input.currentBankRoll) * bankAlpha;
  const bankPitch = input.currentBankPitch + (targetBankPitch - input.currentBankPitch) * bankAlpha;

  // Detect sharp cornering / braking for skid dust VFX
  const dvx = targetVx - input.vx;
  const dvz = targetVz - input.vz;
  const isSkidding = speed > normSpeed * 0.55 && Math.hypot(dvx, dvz) > normSpeed * 0.95;

  out.vx = nextVx;
  out.vz = nextVz;
  out.desiredDirX = combX;
  out.desiredDirZ = combZ;
  out.targetYaw = targetYaw;
  out.lateralSpeed = lateralSpeed;
  out.forwardSpeed = forwardSpeed;
  out.bankRoll = bankRoll;
  out.bankPitch = bankPitch;
  out.isSkidding = isSkidding;
  return out;
}

export interface AaaMobSkillPlanInput {
  readonly kind: AaaMobKind;
  readonly skillCycle: number;
  readonly enemyX: number;
  readonly enemyZ: number;
  readonly playerX: number;
  readonly playerZ: number;
  readonly playerVx: number;
  readonly playerVz: number;
  readonly baseCooldown: number;
  readonly allowMortar: boolean;
  readonly chapterIndex: number;
}

export interface AaaMobSkillPlan {
  skillId: AaaMobSkillId;
  telegraphDuration: number;
  nextCooldown: number;
  aimX: number;
  aimZ: number;
  targetX: number;
  targetZ: number;
  telegraphColorHex: number;
  telegraphRadius: number;
  telegraphType: AaaTelegraphVisualType;
  telegraphRange: number;
  telegraphWidth: number;
  nextSkillCycle: number;
  shouldFlipFlank: boolean;
}

const _skillPlanOut: AaaMobSkillPlan = {
  skillId: 'pounce_lunge',
  telegraphDuration: 0.45,
  nextCooldown: 1.6,
  aimX: 0,
  aimZ: 1,
  targetX: 0,
  targetZ: 0,
  telegraphColorHex: 0xff6b35,
  telegraphRadius: 2.2,
  telegraphType: 'circle',
  telegraphRange: 6,
  telegraphWidth: 1.5,
  nextSkillCycle: 1,
  shouldFlipFlank: false,
};

/**
 * Selects the next Hades-style skill for any of the 6 regular mob archetypes,
 * rotating between 2 distinct readable attacks with fair capped lead-aiming.
 */
export function planAaaMobSkill(
  input: AaaMobSkillPlanInput,
  out: AaaMobSkillPlan = _skillPlanOut
): AaaMobSkillPlan {
  const dx = input.playerX - input.enemyX;
  const dz = input.playerZ - input.enemyZ;
  const dist = Math.hypot(dx, dz) || 1;
  const baseDirX = dx / dist;
  const baseDirZ = dz / dist;

  // Higher chapters tighten telegraph cadence slightly while staying strictly fair & readable
  const paceScale = clamp(1 - Math.max(0, input.chapterIndex - 1) * 0.015, 0.84, 1.0);
  const useAlt = input.skillCycle % 2 === 1;

  // Fair capped lead-aiming (Hades style: rewards dodging perpendicularly)
  const leadTime =
    input.kind === 'IMP_ARCHER'
      ? 0.24
      : input.kind === 'DRAGON_WHELP'
      ? 0.22
      : input.kind === 'SKIRMISHER' || input.kind === 'SHADOW_STALKER'
      ? 0.16
      : 0.14;
  const maxLeadOffset = input.kind === 'IMP_ARCHER' ? 2.1 : 1.55;
  let leadX = input.playerVx * leadTime;
  let leadZ = input.playerVz * leadTime;
  const leadMag = Math.hypot(leadX, leadZ);
  if (leadMag > maxLeadOffset) {
    leadX = (leadX / leadMag) * maxLeadOffset;
    leadZ = (leadZ / leadMag) * maxLeadOffset;
  }

  const predX = input.playerX + leadX;
  const predZ = input.playerZ + leadZ;
  const pdx = predX - input.enemyX;
  const pdz = predZ - input.enemyZ;
  const pDist = Math.hypot(pdx, pdz);
  const aimX = pDist > 0.05 ? pdx / pDist : baseDirX;
  const aimZ = pDist > 0.05 ? pdz / pDist : baseDirZ;

  let skillId: AaaMobSkillId;
  let telegraphDuration = 0.5;
  let nextCooldown = Math.max(1.15, input.baseCooldown);
  let telegraphColorHex = 0xff6b35;
  let telegraphRadius = 2.4;
  let telegraphType: AaaTelegraphVisualType = 'circle';
  let telegraphRange = 6.0;
  let telegraphWidth = 1.6;
  let shouldFlipFlank = false;

  switch (input.kind) {
    case 'SKIRMISHER': {
      if (!useAlt) {
        skillId = 'pounce_lunge';
        telegraphDuration = 0.44 * paceScale;
        nextCooldown = Math.max(1.35, input.baseCooldown * 0.92);
        telegraphColorHex = 0xff6b2b;
        telegraphRadius = 2.0;
        telegraphType = 'lane';
        telegraphRange = 5.4;
        telegraphWidth = 1.65;
      } else {
        skillId = 'flank_crescent_swipe';
        telegraphDuration = 0.42 * paceScale;
        nextCooldown = Math.max(1.25, input.baseCooldown * 0.85);
        telegraphColorHex = 0xffaa2b;
        telegraphRadius = 2.75;
        telegraphType = 'cone';
        telegraphRange = 3.2;
        telegraphWidth = 2.1;
        shouldFlipFlank = true;
      }
      break;
    }
    case 'GOLEM': {
      if (!useAlt) {
        skillId = 'seismic_fissure_slam';
        telegraphDuration = 0.72 * paceScale;
        nextCooldown = Math.max(2.15, input.baseCooldown * 1.02);
        telegraphColorHex = 0xff4433;
        telegraphRadius = 3.55;
        telegraphType = 'circle';
        telegraphRange = 7.5;
        telegraphWidth = 2.2;
      } else {
        skillId = 'juggernaut_advance_slam';
        telegraphDuration = 0.62 * paceScale;
        nextCooldown = Math.max(1.9, input.baseCooldown * 0.9);
        telegraphColorHex = 0xf59e0b;
        telegraphRadius = 2.85;
        telegraphType = 'circle';
        telegraphRange = 3.2;
        telegraphWidth = 2.4;
        shouldFlipFlank = true;
      }
      break;
    }
    case 'IMP_ARCHER': {
      if (useAlt && input.allowMortar) {
        skillId = 'solar_rune_mortar';
        telegraphDuration = 0.52 * paceScale;
        nextCooldown = Math.max(2.05, input.baseCooldown * 1.05);
        telegraphColorHex = 0xf59e0b;
        telegraphRadius = 2.15;
        telegraphType = 'circle';
        telegraphRange = Math.min(13.5, dist + 1.2);
        telegraphWidth = 2.15;
        shouldFlipFlank = true;
      } else {
        skillId = 'arcane_tri_volley';
        telegraphDuration = 0.56 * paceScale;
        nextCooldown = Math.max(1.75, input.baseCooldown * 0.95);
        telegraphColorHex = 0xc084fc;
        telegraphRadius = 1.85;
        telegraphType = 'cone';
        telegraphRange = 11.5;
        telegraphWidth = 2.0;
      }
      break;
    }
    case 'DRAGON_WHELP': {
      if (!useAlt && dist <= 10.5) {
        skillId = 'spear_thrust_dash';
        telegraphDuration = 0.50 * paceScale;
        nextCooldown = Math.max(1.85, input.baseCooldown * 0.96);
        telegraphColorHex = 0x38bdf8;
        telegraphRadius = 1.9;
        telegraphType = 'lane';
        telegraphRange = 6.6;
        telegraphWidth = 1.55;
      } else {
        skillId = 'sweeping_lance_fan';
        telegraphDuration = 0.54 * paceScale;
        nextCooldown = Math.max(1.7, input.baseCooldown * 0.9);
        telegraphColorHex = 0xf97316;
        telegraphRadius = 2.1;
        telegraphType = 'cone';
        telegraphRange = 10.5;
        telegraphWidth = 2.2;
        shouldFlipFlank = true;
      }
      break;
    }
    case 'WISP': {
      if (!useAlt) {
        skillId = 'phase_dart_blink';
        telegraphDuration = 0.46 * paceScale;
        nextCooldown = Math.max(1.8, input.baseCooldown * 0.95);
        telegraphColorHex = 0x22d3ee;
        telegraphRadius = 2.0;
        telegraphType = 'ring';
        telegraphRange = 9.0;
        telegraphWidth = 1.8;
        shouldFlipFlank = true;
      } else {
        skillId = 'spiral_pulse_ring';
        telegraphDuration = 0.56 * paceScale;
        nextCooldown = Math.max(1.95, input.baseCooldown * 1.0);
        telegraphColorHex = 0x38bdf8;
        telegraphRadius = 2.6;
        telegraphType = 'ring';
        telegraphRange = 7.5;
        telegraphWidth = 2.2;
      }
      break;
    }
    case 'SHADOW_STALKER': {
      if (!useAlt) {
        skillId = 'shadow_step_ambush';
        telegraphDuration = 0.44 * paceScale;
        nextCooldown = Math.max(1.65, input.baseCooldown * 0.94);
        telegraphColorHex = 0xa855f7;
        telegraphRadius = 2.1;
        telegraphType = 'lane';
        telegraphRange = 5.2;
        telegraphWidth = 1.6;
        shouldFlipFlank = true;
      } else {
        skillId = 'twin_shadow_knives';
        telegraphDuration = 0.42 * paceScale;
        nextCooldown = Math.max(1.5, input.baseCooldown * 0.88);
        telegraphColorHex = 0xc084fc;
        telegraphRadius = 2.0;
        telegraphType = 'cone';
        telegraphRange = 9.5;
        telegraphWidth = 1.9;
      }
      break;
    }
  }

  out.skillId = skillId;
  out.telegraphDuration = telegraphDuration;
  out.nextCooldown = nextCooldown;
  out.aimX = aimX;
  out.aimZ = aimZ;
  out.targetX = predX;
  out.targetZ = predZ;
  out.telegraphColorHex = telegraphColorHex;
  out.telegraphRadius = telegraphRadius;
  out.telegraphType = telegraphType;
  out.telegraphRange = telegraphRange;
  out.telegraphWidth = telegraphWidth;
  out.nextSkillCycle = input.skillCycle + 1;
  out.shouldFlipFlank = shouldFlipFlank;
  return out;
}

export interface AaaMobDashInput {
  readonly x: number;
  readonly z: number;
  readonly dirX: number;
  readonly dirZ: number;
  readonly speed: number;
  readonly elapsed: number;
  readonly duration: number;
  readonly hopHeight: number;
  readonly radius: number;
  readonly arenaHalfW: number;
  readonly arenaHalfD: number;
  readonly dt: number;
  readonly obstacles?: ReadonlyArray<AaaSpatialBody>;
}

export interface AaaMobDashStepResult {
  x: number;
  z: number;
  vx: number;
  vz: number;
  elapsed: number;
  hopHeightY: number;
  progress: number;
  finished: boolean;
  trailIntensity: number;
}

const _dashStepOut: AaaMobDashStepResult = {
  x: 0,
  z: 0,
  vx: 0,
  vz: 0,
  elapsed: 0,
  hopHeightY: 0,
  progress: 0,
  finished: false,
  trailIntensity: 0,
};

/**
 * Advances a continuous, ease-out physical dash/pounce curve with parabolic hop height.
 * Completely eliminates 1-frame teleport lunges.
 */
export function stepMobPhysicalDash(
  input: AaaMobDashInput,
  out: AaaMobDashStepResult = _dashStepOut
): AaaMobDashStepResult {
  const dt = clamp(input.dt, 0.001, 0.08);
  const safeDur = Math.max(0.08, input.duration);
  const nextElapsed = input.elapsed + dt;
  const progress = clamp(nextElapsed / safeDur, 0, 1);

  // Smooth ease-out velocity curve: fast explosive launch, controlled deceleration
  const speedCurve = Math.pow(Math.max(0.08, 1 - progress * 0.82), 0.7) * 1.28;
  const curSpeed = input.speed * speedCurve;
  const vx = input.dirX * curSpeed;
  const vz = input.dirZ * curSpeed;

  const limitX = Math.max(1.5, input.arenaHalfW - input.radius - 0.5);
  const limitZ = Math.max(1.5, input.arenaHalfD - input.radius - 0.5);
  let nx = clamp(input.x + vx * dt, -limitX, limitX);
  let nz = clamp(input.z + vz * dt, -limitZ, limitZ);

  // Slide cleanly around obstacles during physical dash
  if (input.obstacles && input.obstacles.length > 0) {
    for (let i = 0; i < input.obstacles.length; i++) {
      const obs = input.obstacles[i];
      if (obs.intact === false) continue;
      const ox = nx - obs.x;
      const oz = nz - obs.z;
      const minD = input.radius + obs.radius + 0.08;
      const dSq = ox * ox + oz * oz;
      if (dSq < minD * minD) {
        const d = Math.sqrt(Math.max(0.0001, dSq));
        nx = obs.x + (ox / d) * minD;
        nz = obs.z + (oz / d) * minD;
      }
    }
    nx = clamp(nx, -limitX, limitX);
    nz = clamp(nz, -limitZ, limitZ);
  }

  const finished = nextElapsed >= safeDur;
  const hopHeightY = finished ? 0 : Math.sin(progress * Math.PI) * Math.max(0, input.hopHeight);
  const trailIntensity = finished ? 0 : clamp(1 - progress * 0.75, 0.15, 1.0);

  out.x = nx;
  out.z = nz;
  out.vx = finished ? vx * 0.25 : vx;
  out.vz = finished ? vz * 0.25 : vz;
  out.elapsed = nextElapsed;
  out.hopHeightY = hopHeightY;
  out.progress = progress;
  out.finished = finished;
  out.trailIntensity = trailIntensity;
  return out;
}

export interface HadesTelegraphCue {
  progress: number;
  inStrikeWindow: boolean;
  flashIntensity: number;
  ringScaleBoost: number;
  fillOpacity: number;
  ringOpacity: number;
  countdownScale: number;
}

const _telegraphCueOut: HadesTelegraphCue = {
  progress: 0,
  inStrikeWindow: false,
  flashIntensity: 0,
  ringScaleBoost: 1,
  fillOpacity: 0.15,
  ringOpacity: 0.55,
  countdownScale: 1,
};

/**
 * Computes crisp Hades-style telegraph readability cues.
 * In the final 20% before impact (progress >= 0.80), triggers a bright white-gold strike flash
 * and ring pop so players can time Perfect Dodges consistently.
 */
export function computeHadesTelegraphCue(
  telegraphTimer: number,
  telegraphDuration: number,
  out: HadesTelegraphCue = _telegraphCueOut
): HadesTelegraphCue {
  const safeDur = Math.max(0.05, telegraphDuration);
  const progress = clamp(1 - telegraphTimer / safeDur, 0, 1);
  const inStrikeWindow = progress >= 0.8;
  const strikeT = inStrikeWindow ? clamp((progress - 0.8) / 0.2, 0, 1) : 0;
  const flashIntensity = inStrikeWindow
    ? clamp(0.48 + strikeT * 0.52, 0, 1)
    : 0;
  const ringScaleBoost = inStrikeWindow ? 1 + Math.sin(strikeT * Math.PI) * 0.13 : 1;
  const fillOpacity = 0.14 + progress * 0.28 + flashIntensity * 0.22;
  const ringOpacity = 0.52 + progress * 0.34 + flashIntensity * 0.14;
  const countdownScale = Math.max(0.08, 1 - progress * 0.92);

  out.progress = progress;
  out.inStrikeWindow = inStrikeWindow;
  out.flashIntensity = flashIntensity;
  out.ringScaleBoost = ringScaleBoost;
  out.fillOpacity = clamp(fillOpacity, 0, 0.92);
  out.ringOpacity = clamp(ringOpacity, 0, 1);
  out.countdownScale = countdownScale;
  return out;
}

export interface DirectionalHitImpulse {
  impulseX: number;
  impulseZ: number;
}

const _hitImpulseOut: DirectionalHitImpulse = {
  impulseX: 0,
  impulseZ: 0,
};

/**
 * Computes a directional recoil impulse pointing away from the incoming projectile/attacker.
 */
export function computeDirectionalHitImpulse(
  enemyX: number,
  enemyZ: number,
  attackerX: number,
  attackerZ: number,
  isCrit: boolean,
  isBoss: boolean,
  out: DirectionalHitImpulse = _hitImpulseOut
): DirectionalHitImpulse {
  const dx = enemyX - attackerX;
  const dz = enemyZ - attackerZ;
  const len = Math.hypot(dx, dz);
  const nx = len > 0.001 ? dx / len : 0;
  const nz = len > 0.001 ? dz / len : 1;
  const baseMag = isBoss ? 0.34 : 0.78;
  const mag = baseMag * (isCrit ? 1.45 : 1.0);

  out.impulseX = nx * mag;
  out.impulseZ = nz * mag;
  return out;
}

export interface DirectionalRecoilStep {
  recoilX: number;
  recoilZ: number;
  recoilPitch: number;
  recoilRoll: number;
}

const _recoilStepOut: DirectionalRecoilStep = {
  recoilX: 0,
  recoilZ: 0,
  recoilPitch: 0,
  recoilRoll: 0,
};

/**
 * Exponentially decays world-space directional recoil and projects it into local pitch/roll tilt.
 */
export function stepDirectionalRecoil(
  recoilX: number,
  recoilZ: number,
  facingYaw: number,
  dt: number,
  out: DirectionalRecoilStep = _recoilStepOut
): DirectionalRecoilStep {
  const safeDt = clamp(dt, 0, 0.1);
  const decay = Math.exp(-12.5 * safeDt);
  const nextX = Math.abs(recoilX * decay) < 0.002 ? 0 : recoilX * decay;
  const nextZ = Math.abs(recoilZ * decay) < 0.002 ? 0 : recoilZ * decay;

  const fwdX = Math.sin(facingYaw);
  const fwdZ = Math.cos(facingYaw);
  const rightX = Math.cos(facingYaw);
  const rightZ = -Math.sin(facingYaw);

  // Recoil away from frontal hit pushes enemy backward (negative forward dot -> lean head back)
  const localFwd = nextX * fwdX + nextZ * fwdZ;
  const localRight = nextX * rightX + nextZ * rightZ;

  out.recoilX = nextX;
  out.recoilZ = nextZ;
  out.recoilPitch = clamp(localFwd * 0.36, -0.34, 0.34);
  out.recoilRoll = clamp(-localRight * 0.34, -0.34, 0.34);
  return out;
}

export interface ProceduralEnemyAaaPoseInput {
  readonly speedRatio: number;
  readonly isTelegraphing: boolean;
  readonly telegraphProgress: number;
  readonly burstTimer: number;
  readonly bankRoll: number;
  readonly bankPitch: number;
  readonly recoilPitch: number;
  readonly recoilRoll: number;
  readonly hitSquash: number;
  readonly isBoss: boolean;
}

export interface ProceduralEnemyAaaPose {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  pitchX: number;
  rollZ: number;
  lungeOffsetZ: number;
  crouchOffsetY: number;
}

const _proceduralPoseOut: ProceduralEnemyAaaPose = {
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
  pitchX: 0,
  rollZ: 0,
  lungeOffsetZ: 0,
  crouchOffsetY: 0,
};

/**
 * Computes AAA anticipation / active-strike / recovery squash-stretch and tilt
 * for procedural enemies & bosses across Chapters 2–12 and Endless Tower.
 */
export function computeProceduralEnemyAaaPose(
  input: ProceduralEnemyAaaPoseInput,
  out: ProceduralEnemyAaaPose = _proceduralPoseOut
): ProceduralEnemyAaaPose {
  const speed = clamp(input.speedRatio, 0, 1.5);
  let sx = 1;
  let sy = 1;
  let sz = 1;
  let pitchX = input.bankPitch;
  let rollZ = input.bankRoll;
  let lungeOffsetZ = 0;
  let crouchOffsetY = 0;

  // Anticipation coil during telegraph
  if (input.isTelegraphing) {
    const t = clamp(input.telegraphProgress, 0, 1);
    const coil = Math.sin(t * Math.PI * 0.5);
    const coilAmp = input.isBoss ? 0.14 : 0.18;
    sy -= coil * coilAmp;
    sx += coil * coilAmp * 0.55;
    sz += coil * coilAmp * 0.45;
    pitchX -= coil * (input.isBoss ? 0.16 : 0.24);
    crouchOffsetY -= coil * (input.isBoss ? 0.16 : 0.12);
    lungeOffsetZ -= coil * 0.12;
  }

  // Active strike snap stretch
  if (input.burstTimer > 0) {
    const burst = clamp(input.burstTimer / 0.28, 0, 1);
    const snap = Math.sin(burst * Math.PI);
    sy += snap * 0.14;
    sx -= snap * 0.07;
    sz += snap * 0.12;
    pitchX += snap * (input.isBoss ? 0.22 : 0.30);
    lungeOffsetZ += snap * (input.isBoss ? 0.32 : 0.24);
  }

  // Hit-squash & directional flinch
  if (input.hitSquash > 0) {
    const hit = clamp(input.hitSquash / 0.12, 0, 1);
    sx += hit * 0.16;
    sy -= hit * 0.14;
    sz += hit * 0.14;
  }

  // Add subtle speed stride stretch
  sz += speed * 0.04;
  pitchX += input.recoilPitch;
  rollZ += input.recoilRoll;

  out.scaleX = clamp(sx, 0.72, 1.32);
  out.scaleY = clamp(sy, 0.72, 1.32);
  out.scaleZ = clamp(sz, 0.72, 1.35);
  out.pitchX = clamp(pitchX, -0.55, 0.55);
  out.rollZ = clamp(rollZ, -0.52, 0.52);
  out.lungeOffsetZ = lungeOffsetZ;
  out.crouchOffsetY = crouchOffsetY;
  return out;
}

export interface SafeFlankBlinkInput {
  readonly enemyX: number;
  readonly enemyZ: number;
  readonly playerX: number;
  readonly playerZ: number;
  readonly flankSign: number;
  readonly desiredDistance: number;
  readonly minSafeDistance: number;
  readonly radius: number;
  readonly arenaHalfW: number;
  readonly arenaHalfD: number;
  readonly obstacles?: ReadonlyArray<AaaSpatialBody>;
}

export interface SafeFlankBlinkResult {
  x: number;
  z: number;
}

const _blinkOut: SafeFlankBlinkResult = { x: 0, z: 0 };

/**
 * Picks a fair Hades-style flanking blink destination guaranteed to remain >= minSafeDistance
 * from the player (default >= 3.4m), inside arena bounds, and clear of obstacles.
 */
export function computeSafeFlankBlinkTarget(
  input: SafeFlankBlinkInput,
  out: SafeFlankBlinkResult = _blinkOut
): SafeFlankBlinkResult {
  const minSafe = Math.max(3.4, input.minSafeDistance);
  const desired = Math.max(minSafe + 0.4, input.desiredDistance);
  const dx = input.enemyX - input.playerX;
  const dz = input.enemyZ - input.playerZ;
  const baseAngle = Math.atan2(dx, dz);
  const flankSign = input.flankSign >= 0 ? 1 : -1;

  const limitX = Math.max(1.5, input.arenaHalfW - input.radius - 0.8);
  const limitZ = Math.max(1.5, input.arenaHalfD - input.radius - 0.8);

  // Try flanking arcs (105°, 145°, -105°, 75°, 180°) to find the cleanest unobstructed spot
  const angleOffsets = [
    flankSign * 1.83,
    flankSign * 2.52,
    -flankSign * 1.83,
    flankSign * 1.28,
    Math.PI,
  ];

  let bestX = clamp(input.enemyX, -limitX, limitX);
  let bestZ = clamp(input.enemyZ, -limitZ, limitZ);
  let bestScore = -1e9;

  for (let i = 0; i < angleOffsets.length; i++) {
    const a = baseAngle + angleOffsets[i];
    let cx = clamp(input.playerX + Math.sin(a) * desired, -limitX, limitX);
    let cz = clamp(input.playerZ + Math.cos(a) * desired, -limitZ, limitZ);

    // Push away from obstacles if needed
    let blocked = false;
    if (input.obstacles && input.obstacles.length > 0) {
      for (let j = 0; j < input.obstacles.length; j++) {
        const obs = input.obstacles[j];
        if (obs.intact === false) continue;
        const ox = cx - obs.x;
        const oz = cz - obs.z;
        const minD = input.radius + obs.radius + 0.45;
        const dSq = ox * ox + oz * oz;
        if (dSq < minD * minD) {
          const d = Math.sqrt(Math.max(0.0001, dSq));
          cx = clamp(obs.x + (ox / d) * minD, -limitX, limitX);
          cz = clamp(obs.z + (oz / d) * minD, -limitZ, limitZ);
          blocked = true;
        }
      }
    }

    const distToPlayer = Math.hypot(cx - input.playerX, cz - input.playerZ);
    if (distToPlayer < minSafe) {
      // Push outward along vector from player to enforce fair minimum safety buffer
      const px = cx - input.playerX;
      const pz = cz - input.playerZ;
      const plen = Math.hypot(px, pz) || 1;
      cx = clamp(input.playerX + (px / plen) * minSafe, -limitX, limitX);
      cz = clamp(input.playerZ + (pz / plen) * minSafe, -limitZ, limitZ);
    }

    const finalDist = Math.hypot(cx - input.playerX, cz - input.playerZ);
    const travelDist = Math.hypot(cx - input.enemyX, cz - input.enemyZ);
    const score =
      (finalDist >= minSafe ? 100 : -100 + finalDist * 20) +
      Math.min(travelDist, 8) * 3 -
      Math.abs(finalDist - desired) * 6 -
      (blocked ? 25 : 0) -
      i * 2;

    if (score > bestScore) {
      bestScore = score;
      bestX = cx;
      bestZ = cz;
    }
  }

  out.x = bestX;
  out.z = bestZ;
  return out;
}

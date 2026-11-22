import * as THREE from 'three';

interface Joint {
  bone: THREE.Bone;
  rest: THREE.Quaternion;
  pitchAxis: THREE.Vector3;
  yawAxis: THREE.Vector3;
  rollAxis: THREE.Vector3;
}

export interface VanTichMotionInput {
  elapsed: number;
  moving: number;
  aiming: number;
  dash: number;
  turnRate: number;
  castRatio: number;
  mounted: boolean;
}

export interface VanTichMotionPose {
  hoverY: number;
  torsoPitch: number;
  torsoYaw: number;
  torsoRoll: number;
  leftArmPitch: number;
  leftArmYaw: number;
  leftArmRoll: number;
  leftForearmPitch: number;
  rightArmPitch: number;
  rightArmRoll: number;
  rightForearmPitch: number;
  leftThighPitch: number;
  rightThighPitch: number;
  leftThighRoll: number;
  rightThighRoll: number;
  leftShinPitch: number;
  rightShinPitch: number;
}

export function computeVanTichPose(input: VanTichMotionInput): VanTichMotionPose {
  const { elapsed, moving, aiming, dash, turnRate, castRatio, mounted } = input;
  const breathing = Math.sin(elapsed * 2.35) * 0.028;
  const gesture = castRatio > 0 ? Math.sin(Math.PI * (1 - castRatio)) : 0;
  const bankRoll = THREE.MathUtils.clamp(-turnRate * 0.065, -0.24, 0.24);

  if (mounted) {
    return {
      hoverY: 0,
      torsoPitch: 0.08 * moving + 0.14 * dash - gesture * 0.14,
      torsoYaw: gesture * 0.2,
      torsoRoll: bankRoll * 0.65 + Math.cos(elapsed * 1.8) * 0.02,
      leftArmPitch: breathing - 0.28 - aiming * 0.42 - gesture * 0.48,
      leftArmYaw: gesture * 0.16,
      leftArmRoll: -0.1,
      leftForearmPitch: -0.35 - aiming * 0.26 - gesture * 0.32,
      rightArmPitch: -breathing + 0.16 * moving - gesture * 1.08,
      rightArmRoll: 0.1 + gesture * 0.3,
      rightForearmPitch: -0.18 - gesture * 0.55,
      leftThighPitch: -0.94,
      rightThighPitch: -0.94,
      leftThighRoll: -0.44,
      rightThighRoll: 0.44,
      leftShinPitch: 1.22,
      rightShinPitch: 1.22,
    };
  }

  const idleSway = (1 - Math.min(1, moving)) * Math.sin(elapsed * 1.2) * 0.055;
  const hoverWave = Math.sin(elapsed * (moving > 0.15 ? 7.2 : 2.2));
  const hoverY =
    0.032 +
    0.068 * moving +
    0.082 * dash +
    hoverWave * (0.02 + 0.012 * moving);

  const glideOsc = Math.sin(elapsed * 11.2) * moving * (1 - dash * 0.65);

  return {
    hoverY,
    torsoPitch: 0.035 + 0.21 * moving + 0.24 * dash - gesture * 0.16,
    torsoYaw: idleSway + Math.sin(elapsed * 4.2) * 0.045 * moving + gesture * 0.24,
    torsoRoll: bankRoll + Math.cos(elapsed * (moving > 0.15 ? 5.2 : 1.35)) * (0.026 + 0.018 * moving),
    leftArmPitch: breathing - 0.28 - aiming * 0.4 - 0.12 * moving - 0.08 * dash - gesture * 0.5,
    leftArmYaw: gesture * 0.22 - bankRoll * 0.25,
    leftArmRoll: -0.12 - 0.06 * moving,
    leftForearmPitch: -0.34 - aiming * 0.24 - 0.1 * moving - gesture * 0.34,
    rightArmPitch: -breathing + 0.36 * moving + 0.4 * dash - gesture * 1.12,
    rightArmRoll: 0.14 + 0.14 * moving + 0.1 * dash + gesture * 0.32,
    rightForearmPitch: -0.16 - 0.18 * moving - 0.12 * dash - gesture * 0.55,
    leftThighPitch: glideOsc * 0.28 - 0.14 * moving - 0.22 * dash,
    rightThighPitch: -glideOsc * 0.28 + 0.24 * moving + 0.36 * dash,
    leftThighRoll: -0.04 * moving - 0.05 * dash,
    rightThighRoll: 0.04 * moving + 0.05 * dash,
    leftShinPitch: 0.14 + 0.24 * moving + 0.42 * dash + Math.max(0, glideOsc) * 0.36,
    rightShinPitch: 0.08 + 0.22 * moving + 0.34 * dash + Math.max(0, -glideOsc) * 0.36,
  };
}

/**
 * Rest drop applied to the shoulders of the Hatsune Miku rig. The supplied model is
 * authored in a horizontal T-pose, so the bow/staff poses above are calibrated against
 * a lowered-arm baseline instead of the raw rest pose.
 */
const T_POSE_ARM_DROP = 1.37;

export type PlayfulArcherPersona = 'alice' | 'miku';

export type PlayfulArcherActionKind =
  | 'joyful_wave_bounce'
  | 'archer_twirl_peek'
  | 'playful_cheer_hop'
  | 'graceful_curtsy_bow'
  | 'idol_rhythm_bounce'
  | 'stage_wave_cheer'
  | 'melody_twirl_spin'
  | 'star_concert_pose';

export interface PlayfulArcherMotionInput {
  persona: PlayfulArcherPersona;
  mode: 'lobby' | 'combat';
  elapsed: number;
  moving: number;
  aiming: number;
  pull: number;
  dash: number;
  turnRate: number;
  mounted: boolean;
  celebrating: boolean;
}

export interface PlayfulArcherMotionPose {
  action: PlayfulArcherActionKind;
  hoverY: number;
  modelYaw: number;
  torsoPitch: number;
  torsoYaw: number;
  torsoRoll: number;
  leftArmPitch: number;
  leftArmYaw: number;
  leftArmRoll: number;
  leftForearmPitch: number;
  rightArmPitch: number;
  rightArmYaw: number;
  rightArmRoll: number;
  rightForearmPitch: number;
  leftThighPitch: number;
  rightThighPitch: number;
  leftThighRoll: number;
  rightThighRoll: number;
  leftShinPitch: number;
  rightShinPitch: number;
  sparkleBoost: number;
}

const ALICE_ACTION_CYCLE: readonly PlayfulArcherActionKind[] = [
  'joyful_wave_bounce',
  'archer_twirl_peek',
  'playful_cheer_hop',
  'graceful_curtsy_bow',
];

const MIKU_ACTION_CYCLE: readonly PlayfulArcherActionKind[] = [
  'idol_rhythm_bounce',
  'stage_wave_cheer',
  'melody_twirl_spin',
  'star_concert_pose',
];

function smoothstep01(x: number): number {
  const t = Math.max(0, Math.min(1, x));
  return t * t * (3 - 2 * t);
}

/**
 * Pure deterministic choreographer for Alice ('alice') and Hatsune Miku ('miku').
 * Delivers lively, playful Lobby dances/waves/hops/twirls & expressive Combat kinetics
 * while keeping mounted saddle seating stable and aiming readability crystal-clear.
 */
export function evaluatePlayfulArcherMotion(
  input: PlayfulArcherMotionInput
): PlayfulArcherMotionPose {
  const { persona, mode, elapsed, moving, aiming, pull, dash, turnRate, mounted, celebrating } =
    input;
  const safeT = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);
  const breathing = Math.sin(safeT * 2.5) * 0.028;
  const bankRoll = THREE.MathUtils.clamp(-turnRate * 0.06, -0.22, 0.22);
  const step = Math.sin(safeT * 16) * moving;
  const cycle = persona === 'miku' ? MIKU_ACTION_CYCLE : ALICE_ACTION_CYCLE;
  const duration = persona === 'miku' ? 4.4 : 4.6;
  const isLobbyShowcase = mode === 'lobby' && moving < 0.08 && aiming < 0.12;

  if (!isLobbyShowcase) {
    // Expressive combat & aiming posture: dynamic run bounce, turn bank, dash tuck, bow-draw torso twist
    const runBounce = mounted ? 0 : Math.abs(step) * 0.065;
    const combatSway = (1 - Math.min(1, moving)) * (1 - aiming) * Math.sin(safeT * 2.1) * 0.05;
    return {
      action: cycle[0],
      hoverY: runBounce + (mounted ? 0 : dash * 0.05),
      modelYaw: 0,
      torsoPitch: 0.1 * moving + 0.2 * dash - aiming * 0.04,
      torsoYaw: combatSway - step * 0.09 + aiming * (0.18 - pull * 0.08),
      torsoRoll: bankRoll + (mounted ? 0 : step * 0.045),
      leftArmPitch: breathing - step * 0.24 - aiming * 0.97,
      leftArmYaw: aiming * 0.24,
      leftArmRoll: 0,
      leftForearmPitch: -Math.abs(step) * 0.14 - aiming * 0.14,
      rightArmPitch: -breathing + step * 0.24 - aiming * (0.77 - pull * 0.33),
      rightArmYaw: -aiming * (0.39 + pull * 0.18),
      rightArmRoll: 0,
      rightForearmPitch: -Math.abs(step) * 0.14 - aiming * (0.26 + pull * 0.36),
      leftThighPitch: mounted ? -0.75 : step * 0.48,
      rightThighPitch: mounted ? -0.75 : -step * 0.48,
      leftThighRoll: mounted ? -0.76 : 0,
      rightThighRoll: mounted ? 0.76 : 0,
      leftShinPitch: mounted ? 0.86 : Math.max(0, step) * 0.65,
      rightShinPitch: mounted ? 0.86 : Math.max(0, -step) * 0.65,
      sparkleBoost: 0.25 + dash * 0.55 + aiming * 0.2,
    };
  }

  const rideScale = mounted ? 0.2 : 1.0;

  if (celebrating) {
    const p = (safeT * 1.1) % 1;
    const hop = Math.sin(p * Math.PI);
    const wave = Math.sin(p * Math.PI * 4);
    return {
      action: cycle[2],
      hoverY: hop * 0.18 * rideScale,
      modelYaw: Math.sin(p * Math.PI * 2) * (mounted ? 0.2 : 0.45),
      torsoPitch: -0.08 * hop,
      torsoYaw: Math.sin(p * Math.PI * 2) * 0.18,
      torsoRoll: wave * 0.11,
      leftArmPitch: -1.15 - Math.abs(wave) * 0.25,
      leftArmYaw: 0.22,
      leftArmRoll: -0.34,
      leftForearmPitch: -0.42 - Math.abs(wave) * 0.28,
      rightArmPitch: -1.18 - hop * 0.28,
      rightArmYaw: -0.22,
      rightArmRoll: 0.34,
      rightForearmPitch: -0.45 - Math.abs(wave) * 0.28,
      leftThighPitch: mounted ? -0.75 : -0.18 * hop,
      rightThighPitch: mounted ? -0.75 : 0.18 * hop,
      leftThighRoll: mounted ? -0.76 : 0,
      rightThighRoll: mounted ? 0.76 : 0,
      leftShinPitch: mounted ? 0.86 : 0.28 * hop,
      rightShinPitch: mounted ? 0.86 : 0.24 * hop,
      sparkleBoost: 1.0,
    };
  }

  const slot = Math.floor(safeT / duration) % cycle.length;
  const action = cycle[slot];
  const p = (safeT % duration) / duration;
  const env = smoothstep01(Math.min(p / 0.15, (1 - p) / 0.15));
  const wave2 = Math.sin(p * Math.PI * 2);
  const wave4 = Math.sin(p * Math.PI * 4);
  const wave6 = Math.sin(p * Math.PI * 6);
  const arc = Math.sin(p * Math.PI);

  let hoverY = 0;
  let modelYaw = 0;
  let torsoPitch = 0;
  let torsoYaw = 0;
  let torsoRoll = 0;
  let leftArmPitch = breathing - 0.08;
  let leftArmYaw = 0;
  let leftArmRoll = -0.06;
  let leftForearmPitch = -0.12;
  let rightArmPitch = -breathing - 0.08;
  let rightArmYaw = 0;
  let rightArmRoll = 0.06;
  let rightForearmPitch = -0.12;
  let leftThighPitch = mounted ? -0.75 : 0;
  let rightThighPitch = mounted ? -0.75 : 0;
  let leftThighRoll = mounted ? -0.76 : 0;
  let rightThighRoll = mounted ? 0.76 : 0;
  let leftShinPitch = mounted ? 0.86 : 0;
  let rightShinPitch = mounted ? 0.86 : 0;
  let sparkleBoost = 0.45;

  switch (action) {
    // ── ALICE (Playful Fairy-Archer Charm) ────────────────────────────────────
    case 'joyful_wave_bounce': {
      hoverY = Math.abs(wave4) * 0.075 * env * rideScale;
      torsoYaw = wave2 * 0.18 * env;
      torsoRoll = wave4 * 0.09 * env;
      rightArmPitch = -1.25 * env + wave6 * 0.14 * env;
      rightArmRoll = 0.34 * env + wave6 * 0.24 * env;
      rightForearmPitch = -0.58 * env + wave6 * 0.28 * env;
      leftArmPitch = -0.22 * env;
      leftArmRoll = -0.16 * env;
      leftForearmPitch = -0.35 * env;
      sparkleBoost = 0.72;
      break;
    }
    case 'archer_twirl_peek': {
      hoverY = Math.abs(wave2) * 0.065 * env * rideScale;
      modelYaw = wave2 * (mounted ? 0.16 : 0.32) * env;
      torsoYaw = wave2 * 0.22 * env;
      torsoRoll = -wave2 * 0.1 * env;
      leftArmPitch = -0.45 * env + wave2 * 0.22 * env;
      rightArmPitch = -0.45 * env - wave2 * 0.22 * env;
      leftArmRoll = -0.24 * env;
      rightArmRoll = 0.24 * env;
      leftForearmPitch = -0.3 * env;
      rightForearmPitch = -0.3 * env;
      sparkleBoost = 0.62;
      break;
    }
    case 'playful_cheer_hop': {
      const dblHop = Math.abs(Math.sin(p * Math.PI * 2));
      hoverY = dblHop * 0.16 * env * rideScale;
      torsoPitch = -0.08 * dblHop * env;
      torsoRoll = wave4 * 0.08 * env;
      leftArmPitch = -1.12 * dblHop * env;
      rightArmPitch = -1.12 * dblHop * env;
      leftArmRoll = -0.34 * dblHop * env;
      rightArmRoll = 0.34 * dblHop * env;
      leftForearmPitch = -0.36 * dblHop * env;
      rightForearmPitch = -0.36 * dblHop * env;
      if (!mounted) {
        leftThighPitch = -0.22 * dblHop * env;
        rightThighPitch = 0.22 * dblHop * env;
        leftShinPitch = 0.34 * dblHop * env;
        rightShinPitch = 0.28 * dblHop * env;
      }
      sparkleBoost = 0.95;
      break;
    }
    case 'graceful_curtsy_bow': {
      hoverY = -0.06 * arc * env * rideScale;
      torsoPitch = 0.14 * arc * env;
      torsoRoll = 0.08 * arc * env;
      leftArmPitch = -0.24 * arc * env;
      leftArmRoll = -0.42 * arc * env;
      rightArmPitch = -0.24 * arc * env;
      rightArmRoll = 0.42 * arc * env;
      if (!mounted) {
        leftThighPitch = -0.2 * arc * env;
        rightThighPitch = 0.26 * arc * env;
        leftShinPitch = 0.24 * arc * env;
        rightShinPitch = 0.32 * arc * env;
      }
      sparkleBoost = 0.7;
      break;
    }

    // ── HATSUNE MIKU (Energetic Musical Virtual-Idol Dance) ───────────────────
    case 'idol_rhythm_bounce': {
      const beat = Math.sin(p * Math.PI * 6);
      hoverY = Math.abs(beat) * 0.095 * env * rideScale;
      torsoYaw = beat * 0.18 * env;
      torsoRoll = beat * 0.11 * env;
      leftArmPitch = -0.56 * env - beat * 0.48 * env;
      rightArmPitch = -0.56 * env + beat * 0.48 * env;
      leftArmRoll = -0.28 * env;
      rightArmRoll = 0.28 * env;
      leftForearmPitch = -0.52 * env;
      rightForearmPitch = -0.52 * env;
      if (!mounted) {
        leftThighPitch = beat * 0.22 * env;
        rightThighPitch = -beat * 0.22 * env;
        leftShinPitch = Math.max(0, beat) * 0.34 * env;
        rightShinPitch = Math.max(0, -beat) * 0.34 * env;
      }
      sparkleBoost = 0.78;
      break;
    }
    case 'stage_wave_cheer': {
      hoverY = Math.abs(wave4) * 0.085 * env * rideScale;
      torsoYaw = wave2 * 0.24 * env;
      torsoRoll = -wave4 * 0.12 * env;
      leftArmPitch = -1.24 * env + wave4 * 0.22 * env;
      rightArmPitch = -1.24 * env - wave4 * 0.22 * env;
      leftArmRoll = -0.34 * env - wave4 * 0.22 * env;
      rightArmRoll = 0.34 * env - wave4 * 0.22 * env;
      leftForearmPitch = -0.32 * env;
      rightForearmPitch = -0.32 * env;
      sparkleBoost = 0.92;
      break;
    }
    case 'melody_twirl_spin': {
      hoverY = arc * 0.17 * env * rideScale;
      modelYaw = mounted ? Math.sin(p * Math.PI * 2) * 0.32 * env : smoothstep01(p) * Math.PI * 2;
      torsoPitch = -0.07 * arc * env;
      leftArmPitch = -1.04 * arc * env;
      rightArmPitch = -0.68 * arc * env;
      leftArmRoll = -0.45 * arc * env;
      rightArmRoll = 0.45 * arc * env;
      leftForearmPitch = -0.42 * arc * env;
      rightForearmPitch = -0.42 * arc * env;
      if (!mounted) {
        leftThighPitch = -0.18 * arc * env;
        rightThighPitch = 0.24 * arc * env;
        leftShinPitch = 0.3 * arc * env;
      }
      sparkleBoost = 1.0;
      break;
    }
    case 'star_concert_pose': {
      const pop = Math.abs(Math.sin(p * Math.PI * 2));
      hoverY = pop * 0.12 * env * rideScale;
      torsoPitch = -0.09 * pop * env;
      torsoYaw = 0.16 * arc * env;
      torsoRoll = -0.1 * arc * env;
      leftArmPitch = -1.32 * pop * env;
      leftArmRoll = -0.3 * pop * env;
      leftForearmPitch = -0.25 * pop * env;
      rightArmPitch = -0.38 * pop * env;
      rightArmRoll = 0.42 * pop * env;
      rightForearmPitch = -0.78 * pop * env;
      sparkleBoost = 0.95;
      break;
    }
  }

  return {
    action,
    hoverY,
    modelYaw,
    torsoPitch,
    torsoYaw,
    torsoRoll,
    leftArmPitch,
    leftArmYaw,
    leftArmRoll,
    leftForearmPitch,
    rightArmPitch,
    rightArmYaw,
    rightArmRoll,
    rightForearmPitch,
    leftThighPitch,
    rightThighPitch,
    leftThighRoll,
    rightThighRoll,
    leftShinPitch,
    rightShinPitch,
    sparkleBoost,
  };
}

interface ArcherSparkleAuraRig {
  group: THREE.Group;
  motes: THREE.InstancedMesh;
  moteCount: number;
}

const _archerAuraDummy = new THREE.Object3D();
const _archerAuraCol = new THREE.Color();

function createArcherSparkleAuraRig(
  persona: PlayfulArcherPersona,
  liteMode: boolean
): ArcherSparkleAuraRig {
  const group = new THREE.Group();
  group.name = `HeroSparkleAura_${persona}`;
  const moteCount = liteMode ? 8 : 14;
  const geo = new THREE.OctahedronGeometry(0.036, 0);
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const motes = new THREE.InstancedMesh(geo, mat, moteCount);
  motes.name = `HeroSparkleMotes_${persona}`;
  motes.frustumCulled = false;

  const palette =
    persona === 'miku'
      ? [0x22d3ee, 0x67e8f9, 0xa855f7, 0xffffff]
      : [0xfde047, 0xfbbf24, 0xf472b6, 0xfffbeb];
  for (let i = 0; i < moteCount; i++) {
    _archerAuraCol.setHex(palette[i % palette.length]);
    motes.setColorAt(i, _archerAuraCol);
    _archerAuraDummy.position.set(0.45, 0.9, 0);
    _archerAuraDummy.scale.setScalar(0.75);
    _archerAuraDummy.updateMatrix();
    motes.setMatrixAt(i, _archerAuraDummy.matrix);
  }
  if (motes.instanceColor) motes.instanceColor.needsUpdate = true;
  motes.instanceMatrix.needsUpdate = true;
  group.add(motes);
  return { group, motes, moteCount };
}

function findJoint(model: THREE.Group, name: string): Joint | undefined {
  const bone = model.getObjectByName(name);
  if (!(bone instanceof THREE.Bone)) return undefined;
  const inverse = bone.getWorldQuaternion(new THREE.Quaternion()).invert();
  return {
    bone,
    rest: bone.quaternion.clone(),
    pitchAxis: new THREE.Vector3(1, 0, 0).applyQuaternion(inverse),
    yawAxis: new THREE.Vector3(0, 1, 0).applyQuaternion(inverse),
    rollAxis: new THREE.Vector3(0, 0, 1).applyQuaternion(inverse),
  };
}

export function createArtemisMotion(
  model: THREE.Group,
  weapon: 'bow' | 'staff' = 'bow',
  tPose = false,
  options?: { persona?: PlayfulArcherPersona; liteMode?: boolean }
) {
  if (tPose) {
    // Bone quaternions are captured as the rest baseline right below, so this offset is
    // folded into every later pose rather than applied once and overwritten.
    for (const [name, angle] of [['UpperArmL', -T_POSE_ARM_DROP], ['UpperArmR', T_POSE_ARM_DROP]] as const) {
      const shoulder = findJoint(model, name);
      shoulder?.bone.quaternion.multiply(
        new THREE.Quaternion().setFromAxisAngle(shoulder.rollAxis, angle),
      );
    }
  }
  const leftArm = findJoint(model, 'UpperArmL');
  const rightArm = findJoint(model, 'UpperArmR');
  const leftForearm = findJoint(model, 'ForearmL');
  const rightForearm = findJoint(model, 'ForearmR');
  const leftThigh = findJoint(model, 'ThighL');
  const rightThigh = findJoint(model, 'ThighR');
  const leftShin = findJoint(model, 'ShinL');
  const rightShin = findJoint(model, 'ShinR');
  const torso = findJoint(model, 'Torso');
  const grip = model.getObjectByName(weapon === 'staff' ? 'PalmL' : 'GripL');
  if (!leftArm || !rightArm || !leftForearm || !rightForearm ||
      !leftThigh || !rightThigh || !leftShin || !rightShin || !grip) return undefined;

  const persona: PlayfulArcherPersona = options?.persona ?? (tPose ? 'miku' : 'alice');
  const liteMode = Boolean(options?.liteMode);
  const auraRig = weapon === 'bow' ? createArcherSparkleAuraRig(persona, liteMode) : undefined;
  if (auraRig) {
    // Attach in unscaled local coordinates compensated by model.scale so sparkles stay true-to-size
    const invScale = model.scale.x > 0.001 ? 1 / model.scale.x : 1;
    auraRig.group.scale.setScalar(invScale);
    model.add(auraRig.group);
  }

  const baseModelY = model.position.y;
  const baseModelYaw = model.rotation.y;
  const rotation = new THREE.Quaternion();
  const gripPosition = new THREE.Vector3();
  let moving = 0;
  let aiming = 0;
  let pull = 0;
  let dashBlend = 0;
  let turnRateBlend = 0;
  let castTimer = 0;
  let castDuration = 0;
  let smoothedHoverY = 0;
  let smoothedModelYaw = 0;

  function pose(joint: Joint, pitch: number, yaw = 0, roll = 0) {
    joint.bone.quaternion.copy(joint.rest)
      .multiply(rotation.setFromAxisAngle(joint.rollAxis, roll))
      .multiply(rotation.setFromAxisAngle(joint.yawAxis, yaw))
      .multiply(rotation.setFromAxisAngle(joint.pitchAxis, pitch));
  }

  return {
    cast(duration: number) {
      castDuration = Math.max(0.01, duration);
      castTimer = duration;
    },
    update(
      dt: number,
      elapsed: number,
      stride: number,
      aimingBow: boolean,
      draw: number,
      bow: THREE.Group,
      mounted = false,
      isDashing = false,
      turnRate = 0,
      mode: 'lobby' | 'combat' = 'combat',
      celebrating = false
    ) {
      moving = THREE.MathUtils.damp(moving, stride, 14, dt);
      aiming = THREE.MathUtils.damp(aiming, aimingBow ? 1 : 0, 20, dt);
      pull = THREE.MathUtils.damp(pull, draw, 28, dt);
      dashBlend = THREE.MathUtils.damp(dashBlend, isDashing ? 1 : 0, 22, dt);
      turnRateBlend = THREE.MathUtils.damp(turnRateBlend, turnRate, 14, dt);

      if (weapon === 'staff') {
        const castRatio = castTimer > 0 && castDuration > 0 ? castTimer / castDuration : 0;
        castTimer = Math.max(0, castTimer - dt);
        const p = computeVanTichPose({
          elapsed,
          moving,
          aiming,
          dash: dashBlend,
          turnRate: turnRateBlend,
          castRatio,
          mounted,
        });
        model.position.y = baseModelY + p.hoverY;
        if (torso) pose(torso, p.torsoPitch, p.torsoYaw, p.torsoRoll);
        pose(leftThigh, p.leftThighPitch, 0, p.leftThighRoll);
        pose(rightThigh, p.rightThighPitch, 0, p.rightThighRoll);
        pose(leftShin, p.leftShinPitch);
        pose(rightShin, p.rightShinPitch);
        pose(leftArm, p.leftArmPitch, p.leftArmYaw, p.leftArmRoll);
        pose(leftForearm, p.leftForearmPitch);
        pose(rightArm, p.rightArmPitch, 0, p.rightArmRoll);
        pose(rightForearm, p.rightForearmPitch);
      } else {
        const p = evaluatePlayfulArcherMotion({
          persona,
          mode,
          elapsed,
          moving,
          aiming,
          pull,
          dash: dashBlend,
          turnRate: turnRateBlend,
          mounted,
          celebrating,
        });
        smoothedHoverY = THREE.MathUtils.damp(smoothedHoverY, p.hoverY, 12, dt);
        smoothedModelYaw = THREE.MathUtils.damp(smoothedModelYaw, p.modelYaw, 10, dt);
        model.position.y = baseModelY + smoothedHoverY;
        model.rotation.y = baseModelYaw + smoothedModelYaw;
        if (torso) pose(torso, p.torsoPitch, p.torsoYaw, p.torsoRoll);
        pose(leftThigh, p.leftThighPitch, 0, p.leftThighRoll);
        pose(rightThigh, p.rightThighPitch, 0, p.rightThighRoll);
        pose(leftShin, p.leftShinPitch);
        pose(rightShin, p.rightShinPitch);
        pose(leftArm, p.leftArmPitch, p.leftArmYaw, p.leftArmRoll);
        pose(leftForearm, p.leftForearmPitch);
        pose(rightArm, p.rightArmPitch, p.rightArmYaw, p.rightArmRoll);
        pose(rightForearm, p.rightForearmPitch, -aiming * 0.12);

        if (auraRig) {
          const { motes, moteCount } = auraRig;
          const speedMult = persona === 'miku' ? 1.85 : 1.4;
          const energy = Math.min(1.4, p.sparkleBoost + (celebrating ? 0.55 : 0));
          for (let i = 0; i < moteCount; i++) {
            const frac = i / moteCount;
            const a = elapsed * speedMult * (i % 2 === 0 ? 1 : -0.82) + frac * Math.PI * 2;
            const r = 0.58 + Math.sin(elapsed * 2.9 + i * 1.6) * 0.13 + energy * 0.08;
            const rise = (elapsed * 0.36 + frac * 1.25) % 1;
            const twinkle =
              (0.55 + Math.abs(Math.sin(elapsed * 5.2 + i * 1.9)) * 0.65) * (0.75 + energy * 0.35);
            _archerAuraDummy.position.set(
              Math.cos(a) * r,
              0.24 + rise * 1.65 + Math.sin(elapsed * 3.5 + i) * 0.05,
              Math.sin(a) * r
            );
            _archerAuraDummy.rotation.set(elapsed * 2.3 + i, elapsed * 2.8, i);
            _archerAuraDummy.scale.set(twinkle * 0.76, twinkle * 1.32, twinkle * 0.76);
            _archerAuraDummy.updateMatrix();
            motes.setMatrixAt(i, _archerAuraDummy.matrix);
          }
          motes.instanceMatrix.needsUpdate = true;
        }
      }

      if (bow.visible && bow.parent) {
        grip.getWorldPosition(gripPosition);
        bow.parent.worldToLocal(gripPosition);
        // The procedural bow's grip is 0.19 units ahead of its pivot.
        bow.position.copy(gripPosition);
        if (weapon === 'bow') bow.position.z -= 0.19;
      }
    },
  };
}

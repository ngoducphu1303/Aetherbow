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

export function createArtemisMotion(model: THREE.Group, weapon: 'bow' | 'staff' = 'bow') {
  const leftArm = findJoint(model, 'UpperArmL');
  const rightArm = findJoint(model, 'UpperArmR');
  const leftForearm = findJoint(model, 'ForearmL');
  const rightForearm = findJoint(model, 'ForearmR');
  const leftThigh = findJoint(model, 'ThighL');
  const rightThigh = findJoint(model, 'ThighR');
  const leftShin = findJoint(model, 'ShinL');
  const rightShin = findJoint(model, 'ShinR');
  const torso = weapon === 'staff' ? findJoint(model, 'Torso') : undefined;
  const grip = model.getObjectByName(weapon === 'staff' ? 'PalmL' : 'GripL');
  if (!leftArm || !rightArm || !leftForearm || !rightForearm ||
      !leftThigh || !rightThigh || !leftShin || !rightShin || !grip) return undefined;

  const baseModelY = model.position.y;
  const rotation = new THREE.Quaternion();
  const gripPosition = new THREE.Vector3();
  let moving = 0;
  let aiming = 0;
  let pull = 0;
  let dashBlend = 0;
  let turnRateBlend = 0;
  let castTimer = 0;
  let castDuration = 0;

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
      turnRate = 0
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
        const step = Math.sin(elapsed * 16) * moving;
        const breathing = Math.sin(elapsed * 2.5) * 0.025;
        pose(leftThigh, mounted ? -0.75 : step * 0.44, 0, mounted ? -0.76 : 0);
        pose(rightThigh, mounted ? -0.75 : -step * 0.44, 0, mounted ? 0.76 : 0);
        pose(leftShin, mounted ? 0.86 : Math.max(0, step) * 0.62);
        pose(rightShin, mounted ? 0.86 : Math.max(0, -step) * 0.62);
        pose(leftArm, breathing - step * 0.22 - aiming * 0.97, aiming * 0.24);
        pose(leftForearm, -Math.abs(step) * 0.12 - aiming * 0.14);
        pose(rightArm, -breathing + step * 0.22 - aiming * (0.77 - pull * 0.33), -aiming * (0.39 + pull * 0.18));
        pose(rightForearm, -Math.abs(step) * 0.12 - aiming * (0.26 + pull * 0.36), -aiming * 0.12);
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

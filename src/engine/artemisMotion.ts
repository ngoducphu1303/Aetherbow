import * as THREE from 'three';

interface Joint {
  bone: THREE.Bone;
  rest: THREE.Quaternion;
  pitchAxis: THREE.Vector3;
  yawAxis: THREE.Vector3;
  rollAxis: THREE.Vector3;
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
  const grip = model.getObjectByName(weapon === 'staff' ? 'PalmL' : 'GripL');
  if (!leftArm || !rightArm || !leftForearm || !rightForearm ||
      !leftThigh || !rightThigh || !leftShin || !rightShin || !grip) return undefined;

  const rotation = new THREE.Quaternion();
  const gripPosition = new THREE.Vector3();
  let moving = 0;
  let aiming = 0;
  let pull = 0;
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
      castDuration = duration;
      castTimer = duration;
    },
    update(dt: number, elapsed: number, stride: number, aimingBow: boolean, draw: number, bow: THREE.Group, mounted = false) {
      moving = THREE.MathUtils.damp(moving, stride, 14, dt);
      aiming = THREE.MathUtils.damp(aiming, aimingBow ? 1 : 0, 20, dt);
      pull = THREE.MathUtils.damp(pull, draw, 28, dt);
      const step = Math.sin(elapsed * 16) * moving;
      const breathing = Math.sin(elapsed * 2.5) * 0.025;
      const saddlePitch = weapon === 'staff' ? -0.94 : -0.75;
      const saddleSpread = weapon === 'staff' ? 0.44 : 0.76;
      const saddleKnee = weapon === 'staff' ? 1.22 : 0.86;
      pose(leftThigh, mounted ? saddlePitch : step * 0.44, 0, mounted ? -saddleSpread : 0);
      pose(rightThigh, mounted ? saddlePitch : -step * 0.44, 0, mounted ? saddleSpread : 0);
      pose(leftShin, mounted ? saddleKnee : Math.max(0, step) * 0.62);
      pose(rightShin, mounted ? saddleKnee : Math.max(0, -step) * 0.62);
      if (weapon === 'staff') {
        const gesture = castTimer > 0 ? Math.sin(Math.PI * (1 - castTimer / castDuration)) : 0;
        castTimer = Math.max(0, castTimer - dt);
        pose(leftArm, breathing - step * 0.14 - 0.28 - aiming * .42 - gesture * .48, 0, -.10);
        pose(leftForearm, -.35 - aiming * .26 - gesture * .32);
        pose(rightArm, -breathing + step * .24 - gesture * 1.08, 0, gesture * .30);
        pose(rightForearm, -Math.abs(step) * .18 - gesture * .55);
      } else {
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

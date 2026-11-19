import * as THREE from 'three';

const STANCE = 0.52;
const STEP_LENGTH = 0.119;
const SWING_HEIGHT = 0.032;

type LegName = 'FrontL' | 'FrontR' | 'RearL' | 'RearR';
interface Leg {
  upper: THREE.Bone;
  lower: THREE.Bone;
  foot: THREE.Bone;
  upperRest: THREE.Quaternion;
  lowerRest: THREE.Quaternion;
  upperDirection: THREE.Vector3;
  lowerDirection: THREE.Vector3;
  footRest: THREE.Quaternion;
  anchor: THREE.Vector3;
  bend: THREE.Vector3;
  phase: number;
}

function findBone(model: THREE.Group, name: string): THREE.Bone {
  const bone = model.getObjectByName(name);
  if (!(bone instanceof THREE.Bone)) throw new Error(`Missing Thanh Long joint ${name}`);
  return bone;
}

function makeLeg(model: THREE.Group, restInverse: THREE.Quaternion, name: LegName, phase: number): Leg {
  const upper = findBone(model, name + 'Upper');
  const lower = findBone(model, name + 'Lower');
  const foot = findBone(model, name + 'Foot');
  const upperRest = upper.quaternion.clone();
  const lowerRest = lower.quaternion.clone();
  const hip = model.worldToLocal(upper.getWorldPosition(new THREE.Vector3()));
  const knee = model.worldToLocal(lower.getWorldPosition(new THREE.Vector3()));
  return {
    upper, lower, foot, upperRest, lowerRest, phase,
    upperDirection: lower.position.clone().normalize().applyQuaternion(upperRest),
    lowerDirection: foot.position.clone().normalize().applyQuaternion(lowerRest),
    footRest: restInverse.clone().multiply(foot.getWorldQuaternion(new THREE.Quaternion())),
    anchor: model.worldToLocal(foot.getWorldPosition(new THREE.Vector3())),
    bend: knee.sub(hip).normalize(),
  };
}

export function createDragonMountMotion(model: THREE.Group) {
  const body = findBone(model, 'DragonBody');
  const neck = findBone(model, 'DragonNeck');
  const tail = findBone(model, 'DragonTailBase');
  const tailTip = findBone(model, 'DragonTailTip');
  const saddle = findBone(model, 'DragonSaddle');
  const worldRotation = model.getWorldQuaternion(new THREE.Quaternion());
  const restInverse = worldRotation.clone().invert();
  const legs = [
    makeLeg(model, restInverse, 'FrontL', 0),
    makeLeg(model, restInverse, 'FrontR', 0.5),
    makeLeg(model, restInverse, 'RearL', 0.57),
    makeLeg(model, restInverse, 'RearR', 0.07),
  ];

  const bodyRest = body.quaternion.clone();
  const bodyY = body.position.y;
  const neckRest = neck.quaternion.clone();
  const tailRest = tail.quaternion.clone();
  const tailTipRest = tailTip.quaternion.clone();
  const axisX = new THREE.Vector3(1, 0, 0);
  const axisY = new THREE.Vector3(0, 1, 0);
  const neckPitch = axisX.clone().applyQuaternion(neck.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(worldRotation));
  const tailYaw = axisY.clone().applyQuaternion(tail.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(worldRotation));
  const tipYaw = axisY.clone().applyQuaternion(tailTip.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(worldRotation));

  const hip = new THREE.Vector3();
  const knee = new THREE.Vector3();
  const ankle = new THREE.Vector3();
  const axis = new THREE.Vector3();
  const bend = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const rotation = new THREE.Quaternion();
  const inverse = new THREE.Quaternion();
  let cycle = 0;
  let speed = 0;

  function aim(bone: THREE.Bone, rest: THREE.Quaternion, restDirection: THREE.Vector3, toward: THREE.Vector3) {
    bone.parent!.getWorldQuaternion(inverse).invert();
    direction.copy(toward).normalize().applyQuaternion(inverse);
    bone.quaternion.copy(rotation.setFromUnitVectors(restDirection, direction)).multiply(rest);
  }

  function poseLeg(leg: Leg, stride: number) {
    const t = (cycle + leg.phase) % 1;
    const swing = t >= STANCE;
    const progress = swing ? (t - STANCE) / (1 - STANCE) : t / STANCE;
    const advance = swing
      ? THREE.MathUtils.smoothstep(progress, 0, 1) - 0.5
      : 0.5 - progress;
    ankle.copy(leg.anchor);
    ankle.y += swing ? SWING_HEIGHT * Math.sin(progress * Math.PI) * stride : 0;
    ankle.z += advance * STEP_LENGTH * stride;
    model.localToWorld(ankle);

    leg.upper.getWorldPosition(hip);
    axis.subVectors(ankle, hip);
    const upperLength = leg.lower.position.length() * scale.y;
    const lowerLength = leg.foot.position.length() * scale.y;
    const distance = THREE.MathUtils.clamp(axis.length(), 0.002, upperLength + lowerLength - 0.002);
    axis.normalize();
    ankle.copy(hip).addScaledVector(axis, distance);

    bend.copy(leg.bend).transformDirection(model.matrixWorld);
    bend.addScaledVector(axis, -bend.dot(axis)).normalize();
    const along = (upperLength ** 2 - lowerLength ** 2 + distance ** 2) / (2 * distance);
    const height = Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2));
    knee.copy(hip).addScaledVector(axis, along).addScaledVector(bend, height);

    aim(leg.upper, leg.upperRest, leg.upperDirection, knee.sub(hip));
    leg.lower.getWorldPosition(knee);
    aim(leg.lower, leg.lowerRest, leg.lowerDirection, ankle.sub(knee));

    // Keep planted paws level even while the body pitches and the knees bend.
    leg.lower.getWorldQuaternion(inverse).invert();
    leg.foot.quaternion.copy(inverse).multiply(worldRotation);
    if (swing) leg.foot.quaternion.multiply(rotation.setFromAxisAngle(axisX, -Math.sin(progress * Math.PI * 2) * 0.24 * stride));
    leg.foot.quaternion.multiply(leg.footRest);
  }

  return {
    saddle,
    update(dt: number, elapsed: number, moveSpeed: number) {
      speed = THREE.MathUtils.damp(speed, moveSpeed, 12, dt);
      const stride = THREE.MathUtils.smoothstep(speed, 0.06, 2.4);
      model.getWorldScale(scale);
      model.getWorldQuaternion(worldRotation);
      cycle = (cycle + Math.min(speed, 9.5) * dt / (STEP_LENGTH * scale.y / STANCE)) % 1;

      const stepWave = cycle * Math.PI * 2;
      const breathing = Math.sin(elapsed * 2.9) * 0.0012;
      body.position.y = bodyY + breathing + (0.001 + Math.cos(2 * stepWave) * 0.0034) * stride;
      body.quaternion.copy(bodyRest).premultiply(rotation.setFromAxisAngle(axisX, Math.sin(2 * stepWave) * 0.026 * stride));
      neck.quaternion.copy(neckRest).multiply(rotation.setFromAxisAngle(neckPitch, -Math.sin(2 * stepWave) * 0.033 * stride + breathing * 12));
      tail.quaternion.copy(tailRest).multiply(rotation.setFromAxisAngle(tailYaw, Math.sin(elapsed * 2.4) * (0.07 + stride * 0.11)));
      tailTip.quaternion.copy(tailTipRest).multiply(rotation.setFromAxisAngle(tipYaw, Math.sin(elapsed * 2.4 - 0.8) * 0.14));

      for (const leg of legs) poseLeg(leg, stride);
    },
  };
}

import { AnimationClip, AnimationMixer, Bone, Box3, Group, MathUtils, Mesh, Object3D, SkinnedMesh, Vector3 } from 'three';

export const BLACK_DRAGON_ASSET = 'assets/mounts/black-dragon.glb';
const SCALE = 0.24;

export function createBlackDragonRide(scene: Group, clips: AnimationClip[]) {
  const idle = clips.find((clip) => clip.name === 'Scene' && clip.duration > 0);
  const spine = scene.getObjectByName('breast_018');
  if (!idle || !(spine instanceof Bone)) throw new Error('Hắc Long thiếu xương yên hoặc hoạt ảnh.');

  const model = new Group();
  model.name = 'Hắc Long';
  model.add(scene);
  const mixer = new AnimationMixer(scene);
  const action = mixer.clipAction(idle).play();
  mixer.update(0);
  model.updateMatrixWorld(true);

  // The supplied skeleton faces +Z. This point is on the back just behind the neck.
  const seatPoint = new Vector3(0, 3.72, 0.28);
  const saddle = new Object3D();
  saddle.name = 'BlackDragonRiderSeat';
  saddle.position.copy(spine.worldToLocal(seatPoint.clone()));
  spine.add(saddle);

  const floor = new Box3().setFromObject(scene, true).min.y;
  model.scale.setScalar(SCALE);
  model.position.set(0, -floor * SCALE, -seatPoint.z * SCALE);
  model.updateMatrixWorld(true);
  scene.traverse((node) => {
    if (node instanceof Mesh) node.castShadow = true;
    if (node instanceof SkinnedMesh) node.frustumCulled = false;
  });

  return {
    model,
    saddle,
    // The source has no walk cycle; use the same authored motion at a slightly faster rate while moving.
    update(dt: number, speed: number) {
      action.timeScale = MathUtils.damp(action.timeScale, speed > 0.06 ? 1.35 : 1, 8, dt);
      mixer.update(dt);
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(scene);
    },
  };
}

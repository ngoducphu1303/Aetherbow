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
  const motions = ['Walk', 'Sprint', 'WingFlare'] as const;
  const actions = Object.fromEntries(motions.flatMap((name) => {
    const clip = clips.find((item) => item.name === name && item.duration > 0);
    return clip ? [[name, mixer.clipAction(clip).setEffectiveWeight(0).play()] as const] : [];
  }));
  const entries = [['Scene', action], ...Object.entries(actions)] as const;
  let current: 'Scene' | typeof motions[number] = 'Scene';
  let idleTime = 0;
  let flareTime = 0;
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
    get motion() { return current; },
    update(dt: number, speed: number, sprint = false) {
      idleTime = speed > 0.06 ? 0 : idleTime + dt;
      flareTime = Math.max(0, flareTime - dt);
      if (speed > 0.06) flareTime = 0;
      const flare = actions.WingFlare;
      if (idleTime >= 7 && flare && flareTime === 0) {
        flareTime = flare.getClip().duration;
        idleTime = 0;
      }
      const next = sprint && speed > 0.06 && actions.Sprint ? 'Sprint'
        : speed > 0.06 && actions.Walk ? 'Walk'
        : flareTime > 0 ? 'WingFlare' : 'Scene';
      if (next !== current && next === 'WingFlare' && flare) flare.time = 0;
      current = next;
      if (actions.Walk) actions.Walk.timeScale = MathUtils.clamp(speed / 4.8, 0.7, 1.65);
      for (const [name, clipAction] of entries) {
        clipAction.setEffectiveWeight(MathUtils.damp(clipAction.getEffectiveWeight(), name === current ? 1 : 0, 14, dt));
      }
      mixer.update(dt);
    },
    dispose() {
      mixer.stopAllAction();
      mixer.uncacheRoot(scene);
    },
  };
}

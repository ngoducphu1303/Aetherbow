import * as THREE from 'three';

export interface LobbyCityPose { x: number; y: number; z: number }
export const LOBBY_CITY_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);
export const LOBBY_CITY_ASSET = 'assets/lobby-local/street-city.glb';
export const LOBBY_CITY_SCALE = 2.4;
const radius = 0.32;
const floorName = /^Plane(?:\.00[3567])?_Material\.009_0$/;

export function lobbyCityDirection(keys: Readonly<Record<string, boolean>>, stickX: number, stickZ: number) {
  const x = Number(!!(keys.KeyD || keys.ArrowRight)) - Number(!!(keys.KeyA || keys.ArrowLeft)) + stickX;
  const z = Number(!!(keys.KeyS || keys.ArrowDown)) - Number(!!(keys.KeyW || keys.ArrowUp)) + stickZ;
  const length = Math.max(1, Math.hypot(x, z));
  return [x / length, z / length] as const;
}

/** The source GLB has named street surfaces but no authored collision or navigation mesh. */
export function createLobbyCityNavigation(scene: THREE.Object3D) {
  scene.updateMatrixWorld(true);
  const floors: THREE.Mesh[] = [];
  const obstacles: THREE.Box3[] = [];
  scene.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const name = object.userData.name ?? object.name;
    if (floorName.test(name)) {
      floors.push(object);
      return;
    }
    if (!/^(Cube|Plane\.|node_0)/.test(name)) return;
    const box = new THREE.Box3().setFromObject(object);
    if (box.min.y < 1.1 && box.max.y > 0.45) obstacles.push(box);
  });
  if (!floors.length) return null;
  const ray = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(0, -1, 0), 0, 24);
  const hits: THREE.Intersection[] = [];
  const footOffsets = [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius]] as const;

  function groundAt(x: number, z: number): number | null {
    if (obstacles.some((b) => x >= b.min.x - radius && x <= b.max.x + radius && z >= b.min.z - radius && z <= b.max.z + radius)) return null;
    let y: number | null = null;
    for (const [dx, dz] of footOffsets) {
      ray.ray.origin.set(x + dx, 12, z + dz);
      hits.length = 0;
      ray.intersectObjects(floors, false, hits);
      if (!hits.length) return null;
      if (y === null) y = hits[0].point.y;
      else if (Math.abs(y - hits[0].point.y) > 0.45) return null;
    }
    return y;
  }

  function move(pose: LobbyCityPose, dx: number, dz: number): void {
    const steps = Math.ceil(Math.hypot(dx, dz) / 0.18);
    if (!steps || !Number.isFinite(steps)) return;
    function step(x: number, z: number): boolean {
      const y = groundAt(x, z);
      if (y === null || Math.abs(y - pose.y) > 0.36) return false;
      Object.assign(pose, { x, y, z });
      return true;
    }
    for (let i = 0; i < steps; i++) {
      if (step(pose.x + dx / steps, pose.z + dz / steps)) continue;
      if (dx) step(pose.x + dx / steps, pose.z);
      if (dz) step(pose.x, pose.z + dz / steps);
    }
  }

  return { groundAt, move };
}

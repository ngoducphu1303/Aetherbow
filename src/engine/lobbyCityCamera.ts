import * as THREE from 'three';

export const LOBBY_CITY_CAMERA_OPTIONS = [
  { id: 'street', label: 'Sát đường', height: 3.25, back: 4.9, ahead: 1.4, fov: 53 },
  { id: 'follow', label: 'Theo nhân vật', height: 6.1, back: 6.0, ahead: 0.8, fov: 48 },
  { id: 'wide', label: 'Góc rộng', height: 10.8, back: 9.2, ahead: 1.2, fov: 57 },
  { id: 'overhead', label: 'Từ trên cao', height: 16.5, back: 1.7, ahead: 0, fov: 52 },
] as const;
export type LobbyCityCameraId = typeof LOBBY_CITY_CAMERA_OPTIONS[number]['id'];
export const DEFAULT_LOBBY_CITY_CAMERA: LobbyCityCameraId = 'follow';

export function frameLobbyCityCamera(
  id: LobbyCityCameraId, hero: THREE.Vector3, aspect: number, zoom: number, mount: number,
  eye: THREE.Vector3, focus: THREE.Vector3, yaw = 0, tilt = 0,
): number {
  const view = LOBBY_CITY_CAMERA_OPTIONS.find((preset) => preset.id === id)!;
  const scale = 1 + zoom * 0.105;
  const portrait = Math.max(0, 1.15 - aspect);
  const height = view.height * scale + portrait * 1.7;
  const back = view.back * scale;
  const radius = Math.hypot(back, height - 1.05);
  const pitch = THREE.MathUtils.clamp(Math.atan2(height - 1.05, back) + tilt, 0.06, 1.49);
  const depth = radius * Math.cos(pitch);
  const sin = Math.sin(yaw), cos = Math.cos(yaw);
  eye.set(hero.x + depth * sin, hero.y + 1.05 + mount + radius * Math.sin(pitch), hero.z + depth * cos);
  focus.set(hero.x - view.ahead * sin, hero.y + 1.05 + mount, hero.z - view.ahead * cos);
  return view.fov;
}

// Cache padded bounds once; neither the frame loop nor a zoom allocates a ray per building.
export function createLobbyCameraClearance(blockers: readonly THREE.Box3[]) {
  const boxes = blockers.map((b) => b.clone().expandByScalar(0.18));
  const ray = new THREE.Ray(), hit = new THREE.Vector3();
  return (focus: THREE.Vector3, eye: THREE.Vector3): boolean => {
    ray.origin.copy(focus);
    ray.direction.subVectors(eye, focus);
    const length = ray.direction.length();
    if (length < 0.001) return false;
    ray.direction.multiplyScalar(1 / length);
    let limit = length;
    for (const b of boxes) {
      if (b.containsPoint(focus) || !ray.intersectBox(b, hit)) continue;
      limit = Math.min(limit, hit.distanceTo(focus));
    }
    if (limit >= length) return false;
    eye.copy(focus).addScaledVector(ray.direction, Math.max(0.08, limit - 0.15));
    return true;
  };
}

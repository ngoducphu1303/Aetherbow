import * as THREE from 'three';

/**
 * Uncompressed custom 3D arena map for Chapter 1 (Thánh Điện Nhật Luân).
 * Stored verbatim under public/assets/Chương 1/Map mới/Chương 1.glb.
 */
export const CHAPTER1_MAP_PATH_SEGMENTS = [
  'assets',
  'Chương 1',
  'Map mới',
  'Chương 1.glb',
] as const;

export const CHAPTER1_MAP_VERSION = '1';

/**
 * Measured from Chương 1.glb (after node_0 +90° X rotation):
 * - Flat inner walkable courtyard spans |x|, |z| <= 0.363 at y ≈ 0.2744 (max 0.2798)
 * - Outer sculpted temple walls/pillars extend to |x|, |z| ≈ 0.595 and y ≈ 0.4783
 * Uniformly scaling by TARGET_INNER_HALF / INNER_HALF keeps the central sun emblem
 * circular while enclosing the full ARENA_HALF_W (10.5) × ARENA_HALF_D (12.2) zone.
 */
export const CHAPTER1_MAP_INNER_HALF = 0.363;
export const CHAPTER1_MAP_TARGET_INNER_HALF = 12.8;
export const CHAPTER1_MAP_FLOOR_Y_RAW = 0.2755;
export const CHAPTER1_MAP_FLOOR_OFFSET_Y = -0.02;

export function getChapter1MapAssetUrl(
  baseUrl = '/',
  baseUri = 'http://localhost:3000/'
): URL {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const encodedPath = CHAPTER1_MAP_PATH_SEGMENTS.map((seg) => encodeURIComponent(seg)).join('/');
  const url = new URL(`${normalizedBase}${encodedPath}`, baseUri);
  url.searchParams.set('v', CHAPTER1_MAP_VERSION);
  return url;
}

export interface PreparedChapter1Map {
  group: THREE.Group;
  scale: number;
  bounds: THREE.Box3;
}

/**
 * Normalizes scale, floor elevation (y ≈ -0.02 so ground decals at y >= 0.01 never Z-fight),
 * PBR texture color space / anisotropy, and shadow settings for Chương 1.glb.
 */
export function prepareChapter1MapModel(
  gltfScene: THREE.Object3D,
  maxAnisotropy = 4
): PreparedChapter1Map {
  const group = new THREE.Group();
  group.name = 'Chapter1MapGLB';

  gltfScene.updateMatrixWorld(true);
  const rawBox = new THREE.Box3().setFromObject(gltfScene);
  const rawSize = new THREE.Vector3();
  const rawCenter = new THREE.Vector3();
  rawBox.getSize(rawSize);
  rawBox.getCenter(rawCenter);

  const horizontalSpan = Math.max(0.001, Math.min(rawSize.x, rawSize.z));
  // Expected raw horizontal span is ~1.186; preserve exact inner courtyard alignment
  // while remaining resilient if the asset is ever swapped for another scale.
  const isCanonicalUnitScale = horizontalSpan > 0.8 && horizontalSpan < 1.6;
  const scale = isCanonicalUnitScale
    ? CHAPTER1_MAP_TARGET_INNER_HALF / CHAPTER1_MAP_INNER_HALF
    : (CHAPTER1_MAP_TARGET_INNER_HALF * 2 * (1.186 / (CHAPTER1_MAP_INNER_HALF * 2))) / horizontalSpan;

  const rawFloorY = isCanonicalUnitScale
    ? CHAPTER1_MAP_FLOOR_Y_RAW
    : rawBox.min.y + rawSize.y * 0.575;

  gltfScene.scale.setScalar(scale);
  gltfScene.position.set(
    -rawCenter.x * scale,
    -rawFloorY * scale + CHAPTER1_MAP_FLOOR_OFFSET_Y,
    -rawCenter.z * scale
  );

  const aniso = Math.max(1, Math.min(8, Math.floor(maxAnisotropy || 1)));
  gltfScene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    // Receiving shadows from hero/enemies/bosses onto the 3D stone floor looks crisp,
    // while keeping castShadow=false avoids rendering 942k terrain vertices twice per frame.
    obj.receiveShadow = true;
    obj.castShadow = false;
    obj.frustumCulled = false;

    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat) continue;
      if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
        if (mat.map) {
          mat.map.colorSpace = THREE.SRGBColorSpace;
          mat.map.anisotropy = aniso;
          mat.map.needsUpdate = true;
        }
        if (mat.normalMap) {
          mat.normalMap.anisotropy = aniso;
        }
        if (mat.roughnessMap) {
          mat.roughnessMap.anisotropy = aniso;
        }
        if (mat.metalnessMap) {
          mat.metalnessMap.anisotropy = aniso;
        }
        mat.envMapIntensity = Math.max(mat.envMapIntensity ?? 1, 1.05);
        mat.needsUpdate = true;
      }
    }
  });

  group.add(gltfScene);
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  return { group, scale, bounds };
}

import * as THREE from 'three';

// remove() chỉ gỡ node khỏi cảnh; tài nguyên WebGL phải được giải phóng riêng.
export function disposeObjectResources(
  root: THREE.Object3D,
  retainedTextures: ReadonlySet<THREE.Texture> = new Set(),
  retainedGeometries: ReadonlySet<THREE.BufferGeometry> = new Set()
): void {
  const geometries = new Set<THREE.BufferGeometry>();
  const materials = new Set<THREE.Material>();
  const textures = new Set<THREE.Texture>();
  const skeletons = new Set<THREE.Skeleton>();
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (
      mesh.geometry &&
      !retainedGeometries.has(mesh.geometry) &&
      !mesh.geometry.userData?.sharedCachedGeometry
    ) {
      geometries.add(mesh.geometry);
    }
    if (mesh.material) {
      for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
        materials.add(material);
        for (const value of Object.values(material)) {
          if (
            value instanceof THREE.Texture &&
            !retainedTextures.has(value) &&
            !value.userData?.sharedCachedTexture
          ) {
            textures.add(value);
          }
        }
      }
    }
    if (object instanceof THREE.InstancedMesh) object.dispose();
    if (object instanceof THREE.SkinnedMesh) skeletons.add(object.skeleton);
  });
  root.removeFromParent();
  geometries.forEach((geometry) => geometry.dispose());
  materials.forEach((material) => material.dispose());
  textures.forEach((texture) => texture.dispose());
  skeletons.forEach((skeleton) => skeleton.dispose());
}

import * as THREE from 'three';

// Coordinates are in the source GLB's units, before the lobby scene is scaled.
const perimeter = [
  [-20, -31], [14, -31], [21, -15], [43, -15], [43, 12],
  [15, 12], [15, 31], [-20, 31],
] as const;
const roadY = -0.12;
export const LOBBY_CITY_EXTENSION_FLOOR = 'AetherbowCityStreetExtension';

function asphaltTexture() {
  const size = 64;
  const pixels = new Uint8Array(size * size * 4);
  let seed = 12941;
  for (let i = 0; i < pixels.length; i += 4) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    const grit = (seed >>> 27) - 16;
    pixels.set([58 + grit, 61 + grit, 65 + grit, 255], i);
  }
  const texture = new THREE.DataTexture(pixels, size, size);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.repeat.setScalar(0.75);
  texture.needsUpdate = true;
  return texture;
}

/** Give the facades and disconnected perimeter of the imported city a connected street level. */
export function addLobbyCityStreets(scene: THREE.Group): void {
  const outline = new THREE.Shape(perimeter.map(([x, z]) => new THREE.Vector2(x, -z)));
  const floor = new THREE.Mesh(
    new THREE.ShapeGeometry(outline).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ map: asphaltTexture(), roughness: 0.98, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
  );
  floor.name = LOBBY_CITY_EXTENSION_FLOOR;
  floor.position.y = roadY;
  floor.receiveShadow = true;
  scene.add(floor);

  const dummy = new THREE.Object3D();
  const curbs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.13, 0.22),
    new THREE.MeshStandardMaterial({ color: 0x89847c, roughness: 0.96 }), perimeter.length);
  for (let i = 0; i < perimeter.length; i++) {
    const [x0, z0] = perimeter[i];
    const [x1, z1] = perimeter[(i + 1) % perimeter.length];
    dummy.position.set((x0 + x1) * 0.5, roadY + 0.04, (z0 + z1) * 0.5);
    dummy.rotation.set(0, -Math.atan2(z1 - z0, x1 - x0), 0);
    dummy.scale.set(Math.hypot(x1 - x0, z1 - z0) + 0.14, 1, 1);
    dummy.updateMatrix();
    curbs.setMatrixAt(i, dummy.matrix);
  }
  curbs.instanceMatrix.needsUpdate = true;
  scene.add(curbs);

  // One long pavement in front of the shop row, with room for pedestrians on both sides.
  const storefrontPavement = new THREE.Mesh(new THREE.PlaneGeometry(23, 1.6).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x77716a, roughness: 0.92 }));
  storefrontPavement.position.set(29, roadY + 0.009, 1.4);
  scene.add(storefrontPavement);

  // Painted dashes lead out of the original street and around the perimeter/shop block.
  // The apron stays below the original sidewalk so its terrain remains visible.
  const loop = [[-17.6, -27], [11.3, -27], [19.5, -11], [40, -11], [40, 3.8],
    [16, 3.8], [12, 8], [12, 27], [-17.6, 27], [-17.6, -27]];
  const dashes: [number, number, number][] = [];
  for (let i = 1; i < loop.length; i++) {
    const [x0, z0] = loop[i - 1];
    const [x1, z1] = loop[i];
    const length = Math.hypot(x1 - x0, z1 - z0);
    for (let d = 1; d < length - 0.7; d += 2.65) {
      dashes.push([x0 + (x1 - x0) * d / length, z0 + (z1 - z0) * d / length, -Math.atan2(z1 - z0, x1 - x0)]);
    }
  }
  const paint = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.94, 0.067).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0xb0a280, roughness: 1 }), dashes.length);
  dummy.scale.setScalar(1);
  dashes.forEach(([x, z, angle], i) => {
    dummy.position.set(x, roadY + 0.004, z);
    dummy.rotation.set(0, angle, 0);
    dummy.updateMatrix();
    paint.setMatrixAt(i, dummy.matrix);
  });
  paint.instanceMatrix.needsUpdate = true;
  scene.add(paint);
}

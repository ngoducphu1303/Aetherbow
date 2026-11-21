import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createLobbyCityNavigation, LOBBY_CITY_ASSET, LOBBY_CITY_SCALE, lobbyCityDirection } from './lobbyCity';
import { addLobbyCityStreets } from './lobbyCityStreets';

function makeStreet() {
  const scene = new THREE.Group();
  const street = new THREE.Mesh(new THREE.PlaneGeometry(10, 10), new THREE.MeshBasicMaterial());
  street.userData.name = 'Plane_Material.009_0';
  street.rotation.x = -Math.PI / 2;
  scene.add(street);
  const building = new THREE.Mesh(new THREE.BoxGeometry(2, 4, 3), new THREE.MeshBasicMaterial());
  building.userData.name = 'Cube.001_Material.006_0';
  building.position.set(0, 2, 0);
  scene.add(building);
  const nav = createLobbyCityNavigation(scene);
  assert.ok(nav);
  return nav;
}

test('city walking blocks buildings and open edges, including fast moves', () => {
  const nav = makeStreet();
  assert.equal(nav.groundAt(0, 0), null);
  assert.equal(nav.groundAt(5.1, 0), null);
  assert.ok(Math.abs(nav.groundAt(-3, 0) ?? Infinity) < 0.001);
  const pose = { x: -3, y: 0, z: 0 };
  nav.move(pose, 7, 0);
  assert.ok(pose.x < -1.25 && pose.x > -2);
  nav.move(pose, 0, 15);
  assert.ok(pose.z < 5 && pose.z > 4);
});

test('city direction supports arrows/WASD and clamps combined input', () => {
  const [x, z] = lobbyCityDirection({ KeyW: true, ArrowRight: true }, 0, 0);
  assert.ok(x > 0 && z === -x && Math.abs(Math.hypot(x, z) - 1) < 1e-12);
  assert.deepEqual(lobbyCityDirection({ KeyD: true, KeyA: true }, 0, 0.5), [0, 0.5]);
});

const assetPath = `public/${LOBBY_CITY_ASSET}`;
test('city GLB: a continuous loop reaches the outer streets and the detached storefronts', {
  skip: !existsSync(assetPath) && 'Optional local city asset is not installed',
}, async () => {
  const bytes = readFileSync(assetPath);
  const { scene } = await new GLTFLoader()
    .register(() => ({ name: 'test-geometry-only', loadTexture: async () => new THREE.Texture() }))
    .parseAsync(Uint8Array.from(bytes).buffer, '');
  scene.scale.setScalar(LOBBY_CITY_SCALE);
  addLobbyCityStreets(scene);
  const nav = createLobbyCityNavigation(scene);
  assert.ok(nav);
  const start = [-7, 19] as const;
  const queue: (readonly [number, number])[] = [start];
  const reached = new Set([start.join(',')]);
  for (const [x, z] of queue) {
    const y = nav.groundAt(x, z);
    assert.ok(y !== null);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const next = [x + dx, z + dz] as const;
      const key = next.join(',');
      if (reached.has(key)) continue;
      const pose = { x, y, z };
      nav.move(pose, dx, dz);
      if (Math.hypot(pose.x - next[0], pose.z - next[1]) > 0.01) continue;
      reached.add(key);
      queue.push(next);
    }
  }
  assert.ok(queue.some(([x, z]) => x >= 14 && z <= -23), 'eastern street must be reachable');
  assert.ok(queue.some(([, z]) => z <= -30), 'northern street must be reachable');
  assert.ok(queue.some(([, z]) => z >= 24), 'southern end must be reachable');
  for (const point of [[-43, 56], [-43, -65], [20, -65], [95, -20], [95, 17], [43, 17], [27, 63]]) {
    assert.ok(reached.has(point.join(',')), `outer route must reach ${point}`);
  }
  assert.equal(nav.groundAt(109, 0), null, 'no walking beyond the finished edge');
  assert.equal(nav.groundAt(62, -3), null, 'detached storefronts remain solid');
});

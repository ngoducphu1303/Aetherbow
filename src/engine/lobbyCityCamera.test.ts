import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { LOBBY_CITY_CAMERA_OPTIONS, frameLobbyCityCamera, createLobbyCameraClearance } from './lobbyCityCamera';
import { lobbyCityDirection } from './lobbyCity';

test('four street cameras give distinct compositions and keep the hero on screen', () => {
  const hero = new THREE.Vector3(14, 0, -25);
  const eye = new THREE.Vector3(), focus = new THREE.Vector3();
  const offsets = new Set<string>();
  for (const { id } of LOBBY_CITY_CAMERA_OPTIONS) {
    for (const aspect of [0.47, 1.33, 1.78]) {
      const camera = new THREE.PerspectiveCamera(frameLobbyCityCamera(id, hero, aspect, 0, 0, eye, focus), aspect, 0.1, 100);
      if (aspect === 1.33) offsets.add(eye.clone().sub(hero).toArray().join(','));
      camera.position.copy(eye);
      camera.lookAt(focus);
      camera.updateMatrixWorld();
      for (const height of [0, 2.1]) {
        const projected = hero.clone().add(new THREE.Vector3(0, height, 0)).project(camera);
        assert.ok(Math.abs(projected.x) < 0.8 && Math.abs(projected.y) < 0.85, `${id} clips at ${aspect}`);
      }
    }
  }
  assert.equal(offsets.size, 4);
});

test('camera pulls forward of an intervening wall, then releases in the open', () => {
  const wall = new THREE.Box3(new THREE.Vector3(-1, 0, 3), new THREE.Vector3(1, 8, 4));
  const clear = createLobbyCameraClearance([wall]);
  const focus = new THREE.Vector3(0, 1, 0);
  const eye = new THREE.Vector3(0, 4, 7);
  assert.equal(clear(focus, eye), true);
  assert.ok(eye.z < 3 && eye.z > 1);
  eye.set(5, 4, 0);
  assert.equal(clear(focus, eye), false);
  assert.deepEqual(eye.toArray(), [5, 4, 0]);
});

test('orbit faces all four sides and movement follows the screen axes', () => {
  const hero = new THREE.Vector3(3, 0, 7);
  const eye = new THREE.Vector3(), focus = new THREE.Vector3();
  const sides = [[0, 1], [1, 0], [0, -1], [-1, 0]];
  for (const [i, [x, z]] of sides.entries()) {
    const yaw = i * Math.PI / 2;
    frameLobbyCityCamera('street', hero, 1.6, 0, 0, eye, focus, yaw, 0);
    assert.ok(Math.abs(eye.x - hero.x - x * 4.9) < 1e-9);
    assert.ok(Math.abs(eye.z - hero.z - z * 4.9) < 1e-9);
    const [forwardX, forwardZ] = lobbyCityDirection({ KeyW: true }, 0, 0, yaw);
    assert.ok(Math.abs(forwardX + x) < 1e-9 && Math.abs(forwardZ + z) < 1e-9);
  }
  frameLobbyCityCamera('street', hero, 1.6, 0, 0, eye, focus, 0, 0);
  const y = eye.y;
  frameLobbyCityCamera('street', hero, 1.6, 0, 0, eye, focus, 0, 0.4);
  assert.ok(eye.y > y + 1);
});

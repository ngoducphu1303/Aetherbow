import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { LOBBY_CITY_CAMERA_OPTIONS, frameLobbyCityCamera, createLobbyCameraClearance } from './lobbyCityCamera';

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

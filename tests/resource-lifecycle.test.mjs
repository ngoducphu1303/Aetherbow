import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { GameEngine } from '../src/engine/GameEngine.ts';

test('cập nhật tiến độ không dựng lại model nhân vật nếu ngoại hình không đổi', () => {
  const engine = Object.create(GameEngine.prototype);
  const visual = {heroId: 'artemis', weaponAccentHex: 123};
  const stats = {heroId: 'artemis', equippedPetId: null, equippedRunes: []};
  let rebuilds = 0;
  Object.assign(engine, {baseStats: stats, heroVisualCfg: visual, buildHero() {rebuilds++;}, rebuildCompanions() {}});
  for (let n = 0; n < 100; n++) engine.updateLoadoutAppearance({...stats, attack: n + 1}, {...visual});
  assert.equal(rebuilds, 0);
  assert.equal(engine.baseStats.attack, 100, 'vẫn cập nhật chỉ số chiến đấu');
  engine.updateLoadoutAppearance(stats, {...visual, weaponAccentHex: 456});
  assert.equal(rebuilds, 1, 'ngoại hình thay đổi phải được dựng lại');
});

test('đổi phòng giải phóng GPU của thực thể, giữ texture bóng dùng chung', () => {
  const engine = Object.create(GameEngine.prototype);
  const group = new THREE.Group();
  let geometryDisposals = 0, materialDisposals = 0, sharedDisposals = 0;
  const texture = new THREE.Texture();
  texture.addEventListener('dispose', () => sharedDisposals++);
  Object.assign(engine, {
    entitiesGroup: group, contactShadowTex: texture,
    arrowPool: [], enemyOrbPool: [], meteorPool: [], shockwavePool: [],
    dangerLanePool: [], orbitOrbMeshes: [], particlePool: [], lightningPool: [],
  });
  for (let round = 0; round < 100; round++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({map: texture}));
    mesh.geometry.addEventListener('dispose', () => geometryDisposals++);
    mesh.material.addEventListener('dispose', () => materialDisposals++);
    group.add(mesh);
    Object.assign(engine, {obstacles: [{mesh}], urns: [], enemies: [], lootOrbs: [], shrineGroup: null});
    engine.clearCombatEntities();
  }
  assert.equal(group.children.length, 0);
  assert.equal(geometryDisposals, 100, 'geometry bị bỏ khỏi cảnh nhưng chưa dispose');
  assert.equal(materialDisposals, 100);
  assert.equal(sharedDisposals, 0, 'không hủy texture còn được thực thể khác dùng');
});

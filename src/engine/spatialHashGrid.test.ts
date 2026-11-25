import test from 'node:test';
import assert from 'node:assert/strict';
import { SpatialHashGrid, type SpatialEntity2D } from './spatialHashGrid';

test('SpatialHashGrid returns exact nearby entities and excludes self and far entities', () => {
  const grid = new SpatialHashGrid<SpatialEntity2D>(4.0);
  const entities: SpatialEntity2D[] = [
    { id: 1, x: 0, z: 0, radius: 0.6 },
    { id: 2, x: 1.8, z: 0.5, radius: 0.6 },
    { id: 3, x: -2.2, z: -1.0, radius: 0.8 },
    { id: 4, x: 9.5, z: 8.5, radius: 0.6 },
  ];
  for (const e of entities) grid.insert(e);

  const out: SpatialEntity2D[] = [];
  grid.queryRadius(0, 0, 3.0, out, 1);

  const ids = out.map((e) => e.id).sort((a, b) => a - b);
  assert.deepEqual(ids, [2, 3]);
});

test('SpatialHashGrid reuses caller scratch array and resets cleanly across frames', () => {
  const grid = new SpatialHashGrid<SpatialEntity2D>(3.5);
  const scratch: SpatialEntity2D[] = [];

  grid.insert({ id: 10, x: -4.2, z: 3.8, radius: 0.7 });
  grid.insert({ id: 11, x: -3.5, z: 4.1, radius: 0.7 });
  assert.ok(grid.activeBucketCount >= 1);

  const ref1 = grid.queryRadius(-4.0, 4.0, 2.0, scratch);
  assert.equal(ref1, scratch, 'Must return the same scratch array reference');
  assert.equal(scratch.length, 2);

  grid.clear();
  assert.equal(grid.activeBucketCount, 0);
  grid.queryRadius(-4.0, 4.0, 2.0, scratch);
  assert.equal(scratch.length, 0);
});

test('SpatialHashGrid matches brute-force distance checks across 120 dense arena entities', () => {
  const grid = new SpatialHashGrid<SpatialEntity2D>(4.0);
  const entities: SpatialEntity2D[] = [];
  for (let i = 0; i < 120; i++) {
    const x = ((i * 37) % 240) / 10 - 12;
    const z = ((i * 73) % 240) / 10 - 12;
    const e = { id: i + 1, x, z, radius: 0.55 + (i % 3) * 0.15 };
    entities.push(e);
    grid.insert(e);
  }

  const scratch: SpatialEntity2D[] = [];
  const queryRadius = 4.5;
  for (let idx = 0; idx < 20; idx++) {
    const probe = entities[idx * 5];
    grid.queryRadius(probe.x, probe.z, queryRadius, scratch, probe.id);
    const gridIds = scratch.map((e) => e.id).sort((a, b) => a - b);

    const bruteIds = entities
      .filter((e) => {
        if (e.id === probe.id) return false;
        const maxD = queryRadius + e.radius;
        return Math.hypot(e.x - probe.x, e.z - probe.z) <= maxD + 1e-9;
      })
      .map((e) => e.id)
      .sort((a, b) => a - b);

    assert.deepEqual(gridIds, bruteIds);
  }
});

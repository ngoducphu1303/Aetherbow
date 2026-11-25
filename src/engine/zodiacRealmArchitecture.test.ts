import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  buildZodiacRealmLandmarks,
  getZodiacMonumentSpec,
  stepZodiacRealmLandmarks,
  ZODIAC_REALM_MONUMENTS,
} from './zodiacRealmArchitecture';
import { GroundTelegraphVisualPool } from './vfxPoolManager';
import {
  clearCombatInputBuffer,
  COMBAT_INPUT_BUFFER_WINDOW_MS,
  consumeBufferedAction,
  createCombatInputBuffer,
  queueBufferedAction,
} from './aaaFivePillarsDirector';
import {
  COMBAT_KEYBIND_META,
  DEFAULT_COMBAT_KEYBINDS,
  normalizeCombatKeybinds,
  remapCombatKeybind,
} from './aaaWave6Director';

test('Wave 7: Chapters 5-12 each build unique multi-part Zodiac monuments with 0 PointLights and outside-arena placement', () => {
  const seenArchetypes = new Set<string>();
  const seenTitles = new Set<string>();
  const arenaHalfW = 12;
  const arenaHalfD = 12;

  for (let ch = 1; ch <= 4; ch++) {
    assert.equal(getZodiacMonumentSpec(ch), null, `Ch.${ch} uses custom GLB arena and should return null`);
    assert.equal(
      buildZodiacRealmLandmarks({
        chapterId: ch,
        trimHex: 0xfbbf24,
        stoneHex: 0x334155,
        arenaHalfW,
        arenaHalfD,
        liteActive: false,
      }),
      null
    );
  }

  for (let ch = 5; ch <= 12; ch++) {
    const spec = getZodiacMonumentSpec(ch);
    assert.ok(spec, `Chapter ${ch} must define a Zodiac monument spec`);
    assert.equal(seenArchetypes.has(spec.archetype), false, `Duplicate archetype for Ch.${ch}`);
    assert.equal(seenTitles.has(spec.titleVi), false, `Duplicate Vietnamese title for Ch.${ch}`);
    seenArchetypes.add(spec.archetype);
    seenTitles.add(spec.titleVi);

    const high = buildZodiacRealmLandmarks({
      chapterId: ch,
      trimHex: 0x38bdf8,
      stoneHex: 0x1e293b,
      arenaHalfW,
      arenaHalfD,
      liteActive: false,
    });
    assert.ok(high);
    assert.equal(high.pointLightCount, 0, `Ch.${ch} landmarks must add 0 PointLights for E5430 safety`);
    assert.ok(high.meshCount >= 18, `Ch.${ch} composite landmark assembly should have >= 18 meshes (got ${high.meshCount})`);
    assert.ok(high.animNodes.length >= 3, `Ch.${ch} should have animated kinetic nodes`);

    // Verify all 3 monument roots sit strictly outside the playable combat rectangle
    assert.equal(high.group.children.length, 3);
    for (const child of high.group.children) {
      const outsideX = Math.abs(child.position.x) > arenaHalfW + 1.8;
      const outsideNorthZ = child.position.z < -arenaHalfD - 3.0;
      assert.equal(
        outsideX || outsideNorthZ,
        true,
        `Ch.${ch} landmark at (${child.position.x}, ${child.position.z}) must stay outside combat floor`
      );
    }

    // Verify Lite variant also has 0 PointLights and lower total vertex count
    const lite = buildZodiacRealmLandmarks({
      chapterId: ch,
      trimHex: 0x38bdf8,
      stoneHex: 0x1e293b,
      arenaHalfW,
      arenaHalfD,
      liteActive: true,
    });
    assert.ok(lite);
    assert.equal(lite.pointLightCount, 0);
    const countVertices = (group: THREE.Group): number => {
      let verts = 0;
      group.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.isMesh && mesh.geometry) {
          const pos = mesh.geometry.getAttribute('position');
          if (pos) verts += pos.count;
        }
      });
      return verts;
    };
    assert.ok(
      countVertices(lite.group) < countVertices(high.group),
      `Ch.${ch} Lite landmarks should have fewer vertices than High`
    );
  }

  assert.equal(Object.keys(ZODIAC_REALM_MONUMENTS).length, 8);
});

test('Wave 7: stepZodiacRealmLandmarks animates deterministically and dampens motion under reducedMotion', () => {
  const built = buildZodiacRealmLandmarks({
    chapterId: 7, // Libra golden scales (sway_z)
    trimHex: 0xfbbf24,
    stoneHex: 0x1e293b,
    arenaHalfW: 12,
    arenaHalfD: 12,
    liteActive: false,
  });
  assert.ok(built);
  const swayNode = built.animNodes.find((n) => n.mode === 'sway_z');
  assert.ok(swayNode);

  stepZodiacRealmLandmarks(built.animNodes, 1.35, false);
  const fullAngle = swayNode.object.rotation.z;
  stepZodiacRealmLandmarks(built.animNodes, 1.35, true);
  const reducedAngle = swayNode.object.rotation.z;

  assert.ok(Math.abs(fullAngle) > 0.01);
  assert.ok(Math.abs(reducedAngle - fullAngle * 0.25) < 1e-6);
});

test('Wave 7: GroundTelegraphVisualPool reuses 2 shared unit geometries across 40 hazard/volatile spawns', () => {
  const pool = new GroundTelegraphVisualPool(8);
  const parent = new THREE.Group();

  const active: Array<{ ring: THREE.Mesh; fill: THREE.Mesh }> = [];
  for (let i = 0; i < 40; i++) {
    const slot = pool.acquire({
      colorHex: i % 2 === 0 ? 0xf97316 : 0x38bdf8,
      x: (i % 5) - 2,
      z: (i % 4) - 2,
      radius: 2.4 + (i % 3) * 0.35,
      parent,
    });
    active.push({ ring: slot.ring, fill: slot.fill });
    if (active.length >= 4) {
      const oldest = active.shift()!;
      pool.release(oldest.ring, oldest.fill);
    }
  }

  const stats = pool.getStats();
  assert.equal(stats.sharedGeometries, 2, 'Pool must share exactly 1 RingGeometry and 1 CircleGeometry');
  assert.ok(stats.allocatedSlots <= 8, 'Pool must never exceed maxCapacity');
  assert.equal(stats.activeSlots, active.length);

  pool.releaseAll();
  assert.equal(pool.getStats().activeSlots, 0);
  assert.equal(parent.children.length, 0);

  pool.dispose();
  assert.equal(pool.getStats().allocatedSlots, 0);
  assert.equal(pool.getStats().sharedGeometries, 0);
});

test('Wave 7: 5-action CombatInputBuffer buffers heavyBreak and overdrive within window and flushes cleanly', () => {
  const buf = createCombatInputBuffer();
  queueBufferedAction(buf, 'heavyBreak', 5000);
  queueBufferedAction(buf, 'overdrive', 5000);

  assert.equal(consumeBufferedAction(buf, 'heavyBreak', 5100), true);
  assert.equal(consumeBufferedAction(buf, 'heavyBreak', 5105), false, 'Should only consume once');

  assert.equal(
    consumeBufferedAction(buf, 'overdrive', 5000 + COMBAT_INPUT_BUFFER_WINDOW_MS + 20),
    false,
    'Expired overdrive input must not trigger'
  );

  queueBufferedAction(buf, 'heavyBreak', 6000);
  queueBufferedAction(buf, 'overdrive', 6000);
  clearCombatInputBuffer(buf);
  assert.equal(consumeBufferedAction(buf, 'heavyBreak', 6010), false);
  assert.equal(consumeBufferedAction(buf, 'overdrive', 6010), false);
});

test('Wave 7: 8-action CombatKeybinds supports heavyBreak & overdrive with backward compatibility and conflict swap', () => {
  assert.equal(COMBAT_KEYBIND_META.length, 8);
  assert.equal(DEFAULT_COMBAT_KEYBINDS.heavyBreak, 'KeyF');
  assert.equal(DEFAULT_COMBAT_KEYBINDS.overdrive, 'KeyX');

  // Legacy 6-key save migrates cleanly with defaults for heavyBreak & overdrive
  const migrated = normalizeCombatKeybinds({
    dash: 'Space',
    activeSkill: 'KeyE',
    ultimate: 'KeyQ',
    pause: 'Escape',
    cycleCamera: 'KeyC',
    toggleAutoPilot: 'KeyV',
  });
  assert.equal(migrated.heavyBreak, 'KeyF');
  assert.equal(migrated.overdrive, 'KeyX');

  // Remapping heavyBreak onto overdrive's key swaps them cleanly with zero duplicates
  const swapped = remapCombatKeybind(migrated, 'heavyBreak', 'KeyX');
  assert.equal(swapped.heavyBreak, 'KeyX');
  assert.equal(swapped.overdrive, 'KeyF');

  // Movement keys remain protected
  const blocked = remapCombatKeybind(swapped, 'overdrive', 'KeyW');
  assert.equal(blocked.overdrive, 'KeyF');
});

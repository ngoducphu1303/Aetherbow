import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// Contract guard for the Hatsune Miku hero. The runtime silently skips posing when
// createArtemisMotion cannot find a required bone, so the asset itself is asserted here.
const ROOT = process.cwd();
const GLB = path.join(ROOT, 'public/assets/heroes/hatsune-miku.glb');
const REQUIRED_BONES = [
  'Torso',
  'UpperArmL',
  'UpperArmR',
  'ForearmL',
  'ForearmR',
  'GripL',
  'ThighL',
  'ThighR',
  'ShinL',
  'ShinR',
];

function readGlbJson(file) {
  const buf = fs.readFileSync(file);
  assert.equal(buf.toString('ascii', 0, 4), 'glTF', 'GLB magic');
  assert.equal(buf.readUInt32LE(4), 2, 'GLB version 2');
  assert.equal(buf.readUInt32LE(8), buf.byteLength, 'GLB header length must match file size');
  const jsonLength = buf.readUInt32LE(12);
  assert.equal(buf.toString('ascii', 16, 20), 'JSON', 'first chunk must be JSON');
  return JSON.parse(buf.toString('utf8', 20, 20 + jsonLength));
}

test('Hatsune Miku: roster entry, rigged asset registry and skin contract', async () => {
  const { HEROES, HERO_MAP } = await import('../src/data/heroesData.ts');
  const { getHeroAssetPack } = await import('../src/data/assetRegistry.ts');
  const { MODEL_LABELS } = await import('../src/engine/modelAssets.ts');

  const hero = HERO_MAP.hatsune_miku;
  assert.ok(hero, 'Hatsune Miku must exist in the hero roster');
  assert.ok(HEROES.some((h) => h.id === 'hatsune_miku'));
  assert.equal(hero.accentHex, 0x39c5bb, 'canonical Miku teal accent');
  assert.ok(hero.unlockGold <= 700 && hero.unlockGems <= 40, 'aligned with the Ch.1-3 unlock economy');

  const pack = getHeroAssetPack('hatsune_miku');
  for (const key of ['icon', 'portrait', 'skill', 'burst']) {
    assert.match(pack[key], /^\/assets\/apiaetherbow\//, `${key} must live under the character asset tree`);
    assert.ok(fs.existsSync(path.join(ROOT, 'public', pack[key])), `${key} asset missing: ${pack[key]}`);
  }

  assert.equal(MODEL_LABELS['heroes/hatsune-miku.glb'], 'Hatsune Miku 3D');

  const json = readGlbJson(GLB);
  assert.equal(json.skins?.length, 1, 'the model must carry exactly one skin');
  const jointNames = new Set(json.skins[0].joints.map((index) => json.nodes[index].name));
  for (const bone of REQUIRED_BONES) {
    assert.ok(jointNames.has(bone), `missing bone ${bone} required by createArtemisMotion`);
  }

  const primitive = json.meshes[0].primitives[0];
  for (const attribute of ['POSITION', 'NORMAL', 'TEXCOORD_0', 'JOINTS_0', 'WEIGHTS_0']) {
    assert.ok(primitive.attributes[attribute] !== undefined, `missing vertex attribute ${attribute}`);
  }
  assert.ok(json.images?.length >= 1, 'the model must ship its textures');
});

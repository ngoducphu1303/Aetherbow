import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  CHAPTER3_ASSET_SPECS,
  DELL_E5430_LITE_PROFILE,
  inspectGlbBuffer,
  inspectGlbFile,
  parseCliArgs,
  parseImageDimensions,
  resolveSelectedSpecs,
  syncChapter3ManifestEntries,
  validateAssetVariant,
  validateChapter3Pack,
} from '../scripts/chapter3-asset-pipeline.mjs';

function makeMinimalPng(width, height) {
  // Valid PNG signature + IHDR chunk (enough for header parsing; full valid PNG via ImageMagick for build test)
  const buf = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buf, 0);
  buf.writeUInt32BE(13, 8);
  buf.write('IHDR', 12, 'ascii');
  buf.writeUInt32BE(width, 16);
  buf.writeUInt32BE(height, 20);
  return buf;
}

function makeMinimalJpeg(width, height) {
  return Buffer.from([
    0xff, 0xd8, // SOI
    0xff, 0xc0, // SOF0
    0x00, 0x11, // length = 17
    0x08, // precision
    (height >> 8) & 0xff, height & 0xff,
    (width >> 8) & 0xff, width & 0xff,
    0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
    0xff, 0xd9, // EOI
  ]);
}

function pad4(buf, fill = 0) {
  const len = (buf.length + 3) & ~3;
  if (len === buf.length) return buf;
  const out = Buffer.alloc(len, fill);
  buf.copy(out);
  return out;
}

function buildSyntheticRawGridGlb(gridSide, texturePngBytes) {
  const vertsPerSide = gridSide + 1;
  const vertCount = vertsPerSide * vertsPerSide;
  const triCount = gridSide * gridSide * 2;
  const positions = new Float32Array(vertCount * 3);
  const normals = new Float32Array(vertCount * 3);
  const uvs = new Float32Array(vertCount * 2);
  const indices = new Uint32Array(triCount * 3);

  for (let z = 0; z < vertsPerSide; z++) {
    for (let x = 0; x < vertsPerSide; x++) {
      const i = z * vertsPerSide + x;
      const u = x / gridSide;
      const v = z / gridSide;
      positions[i * 3] = (u - 0.5) * 2;
      positions[i * 3 + 1] = Math.sin(u * Math.PI * 2) * 0.25 + Math.cos(v * Math.PI * 2) * 0.25;
      positions[i * 3 + 2] = (v - 0.5) * 2;
      normals[i * 3] = 0;
      normals[i * 3 + 1] = 1;
      normals[i * 3 + 2] = 0;
      uvs[i * 2] = u;
      uvs[i * 2 + 1] = v;
    }
  }

  let k = 0;
  for (let z = 0; z < gridSide; z++) {
    for (let x = 0; x < gridSide; x++) {
      const a = z * vertsPerSide + x;
      const b = a + 1;
      const c = a + vertsPerSide;
      const d = c + 1;
      indices[k++] = a;
      indices[k++] = c;
      indices[k++] = b;
      indices[k++] = b;
      indices[k++] = c;
      indices[k++] = d;
    }
  }

  const posBuf = Buffer.from(positions.buffer);
  const normBuf = Buffer.from(normals.buffer);
  const uvBuf = Buffer.from(uvs.buffer);
  const idxBuf = Buffer.from(indices.buffer);

  const parts = [];
  let offset = 0;
  const push = (b, target) => {
    const bv = { buffer: 0, byteOffset: offset, byteLength: b.length };
    if (target) bv.target = target;
    const p = pad4(b, 0x00);
    parts.push(p);
    offset += p.length;
    return bv;
  };

  const bufferViews = [
    push(posBuf, 34962),
    push(normBuf, 34962),
    push(uvBuf, 34962),
    push(idxBuf, 34963),
    push(texturePngBytes),
    push(texturePngBytes),
    push(texturePngBytes),
  ];
  const bin = Buffer.concat(parts);

  const gltf = {
    asset: { version: '2.0', generator: 'Synthetic Raw Test Mesh' },
    scene: 0,
    scenes: [{ nodes: [0] }],
    nodes: [{ mesh: 0 }],
    materials: [
      {
        name: 'RawPbrMat',
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicRoughnessTexture: { index: 1 },
        },
        normalTexture: { index: 2 },
      },
    ],
    meshes: [
      {
        primitives: [
          {
            attributes: { POSITION: 0, NORMAL: 1, TEXCOORD_0: 2 },
            indices: 3,
            material: 0,
          },
        ],
      },
    ],
    textures: [
      { source: 0 },
      { source: 1 },
      { source: 2 },
    ],
    images: [
      { mimeType: 'image/png', bufferView: 4 },
      { mimeType: 'image/png', bufferView: 5 },
      { mimeType: 'image/png', bufferView: 6 },
    ],
    accessors: [
      { bufferView: 0, componentType: 5126, count: vertCount, type: 'VEC3', min: [-1, -1, -1], max: [1, 1, 1] },
      { bufferView: 1, componentType: 5126, count: vertCount, type: 'VEC3' },
      { bufferView: 2, componentType: 5126, count: vertCount, type: 'VEC2' },
      { bufferView: 3, componentType: 5125, count: indices.length, type: 'SCALAR' },
    ],
    bufferViews,
    buffers: [{ byteLength: bin.length }],
  };

  const jsonChunk = pad4(Buffer.from(JSON.stringify(gltf), 'utf8'), 0x20);
  const binChunk = pad4(bin, 0x00);
  const total = 12 + 8 + jsonChunk.length + 8 + binChunk.length;
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0);
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(total, 8);
  const jh = Buffer.alloc(8);
  jh.writeUInt32LE(jsonChunk.length, 0);
  jh.writeUInt32LE(0x4e4f534a, 4);
  const bh = Buffer.alloc(8);
  bh.writeUInt32LE(binChunk.length, 0);
  bh.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, jh, jsonChunk, bh, binChunk]);
}

test('parseImageDimensions decodes PNG IHDR and JPEG SOF0 pixel sizes accurately', () => {
  assert.deepEqual(parseImageDimensions(makeMinimalPng(1024, 512), 'image/png'), {
    width: 1024,
    height: 512,
  });
  assert.deepEqual(parseImageDimensions(makeMinimalJpeg(1536, 1536), 'image/jpeg'), {
    width: 1536,
    height: 1536,
  });
});

test('validateAssetVariant enforces Dell Latitude E5430 Lite hardware ceilings', () => {
  const mobSpec = CHAPTER3_ASSET_SPECS.find((s) => s.id === 'nguu-ngoc-xung-kich');
  assert.ok(mobSpec);

  const goodLite = {
    valid: true,
    bytes: 260 * 1024,
    materialCount: 1,
    imageCount: 1,
    vertexCount: 4400,
    triangleCount: 4800,
    usesUint32Indices: false,
    extensionsRequired: [],
    extensionsUsed: [],
    maxTextureDimension: 512,
    images: [{ mimeType: 'image/jpeg', width: 512, height: 512 }],
    estimatedVramMb: 1.5,
  };
  assert.equal(validateAssetVariant(mobSpec, 'lite', goodLite).ok, true);

  const oversizedTex = { ...goodLite, maxTextureDimension: 2048 };
  const texRes = validateAssetVariant(mobSpec, 'lite', oversizedTex);
  assert.equal(texRes.ok, false);
  assert.ok(texRes.violations.some((v) => v.includes('maxTextureDimension=2048px')));

  const leakedPbrMaps = { ...goodLite, imageCount: 3 };
  assert.equal(validateAssetVariant(mobSpec, 'lite', leakedPbrMaps).ok, false);

  const dracoRequired = { ...goodLite, extensionsRequired: ['KHR_draco_mesh_compression'] };
  assert.equal(validateAssetVariant(mobSpec, 'lite', dracoRequired).ok, false);

  const uint32Overflow = { ...goodLite, vertexCount: 70_000, usesUint32Indices: true };
  assert.equal(validateAssetVariant(mobSpec, 'lite', uint32Overflow).ok, false);

  const tooManyTris = { ...goodLite, triangleCount: 18_000 };
  assert.equal(validateAssetVariant(mobSpec, 'lite', tooManyTris).ok, false);
});

test('validateChapter3Pack enforces aggregate Dell Latitude E5430 disk and VRAM budgets', () => {
  const okPack = validateChapter3Pack(
    [
      {
        id: 'taurus-arena',
        tier: 'lite',
        metrics: { valid: true, bytes: 1_700_000, estimatedVramMb: 6.5 },
        validation: { ok: true, violations: [] },
      },
    ],
    'lite'
  );
  assert.equal(okPack.ok, true);

  const blownVramPack = validateChapter3Pack(
    [
      {
        id: 'taurus-arena',
        tier: 'lite',
        metrics: {
          valid: true,
          bytes: 2_000_000,
          estimatedVramMb: DELL_E5430_LITE_PROFILE.maxPackVramMb + 20,
        },
        validation: { ok: true, violations: [] },
      },
    ],
    'lite'
  );
  assert.equal(blownVramPack.ok, false);
  assert.ok(blownVramPack.violations.some((v) => v.includes('GPU VRAM')));
});

test('parseCliArgs and resolveSelectedSpecs parse all automation flags safely', () => {
  const parsed = parseCliArgs([
    '--verify',
    '--tier',
    'lite',
    '--source-dir',
    './tmp-src',
    '--update-manifest',
    '--only',
    'taurus-arena,sylvia',
  ]);
  assert.equal(parsed.verifyOnly, true);
  assert.equal(parsed.tier, 'lite');
  assert.equal(parsed.updateManifest, true);
  assert.deepEqual(parsed.ids, ['taurus-arena', 'sylvia']);
  assert.equal(resolveSelectedSpecs(parsed.ids).length, 2);

  assert.throws(() => parseCliArgs(['--tier', 'ultra']), /Invalid --tier/);
  assert.throws(() => resolveSelectedSpecs(['unknown-model']), /Unknown Chapter 3 asset ID/);
});

test('syncChapter3ManifestEntries updates sizes, inserts new entries, and preserves other chapters', () => {
  const base = {
    cdnBaseUrl: 'https://aetherbow-glb.puugoo002.workers.dev/',
    files: [
      { path: 'public/assets/Chương 1/Runtime/a.glb', size: 100, runtime: true },
      { path: 'public/assets/Chương 3/Runtime/sylvia-lite.glb', size: 123, runtime: false },
    ],
  };
  const synced = syncChapter3ManifestEntries(base, [
    { path: 'public/assets/Chương 3/Runtime/sylvia-lite.glb', size: 555 },
    { path: 'public/assets/Chương 3/Runtime/sylvia-high.glb', size: 2222 },
  ]);
  assert.equal(synced.updated, 1);
  assert.equal(synced.inserted, 1);
  assert.equal(synced.manifest.files.length, 3);
  const lite = synced.manifest.files.find((f) => f.path.endsWith('sylvia-lite.glb'));
  assert.equal(lite.size, 555);
  assert.equal(lite.runtime, true);
});

test('inspectGlbBuffer rejects corrupted headers', () => {
  assert.equal(inspectGlbBuffer(Buffer.from('not-a-glb')).valid, false);
});

test('end-to-end build-chapter3-variants.mjs compresses a raw PBR GLB into compliant High and E5430 Lite GLBs', () => {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ch3-pipeline-test-'));
  const srcDir = path.join(tmpRoot, 'src');
  const outDir = path.join(tmpRoot, 'out');
  const reportPath = path.join(tmpRoot, 'report.json');
  fs.mkdirSync(srcDir, { recursive: true });
  fs.mkdirSync(outDir, { recursive: true });

  try {
    // Generate a genuine 2048x2048 PNG using ImageMagick so the real resize pipeline executes end-to-end
    const rawPng = execFileSync('/usr/bin/convert', ['-size', '2048x2048', 'xc:#10b981', 'png:-'], {
      maxBuffer: 16 * 1024 * 1024,
    });
    // 85x85 grid = 14,450 triangles (> High 10,000 and Lite 4,000 targets for jade-heart-relic)
    const rawGlb = buildSyntheticRawGridGlb(85, rawPng);
    fs.writeFileSync(path.join(srcDir, 'thanh_khi_tam_ngoc_kim_nguu.glb'), rawGlb);

    execFileSync(
      process.execPath,
      [
        'scripts/build-chapter3-variants.mjs',
        '--source-dir',
        srcDir,
        '--out-dir',
        outDir,
        '--report',
        reportPath,
        '--only',
        'jade-heart-relic',
      ],
      { cwd: process.cwd(), stdio: 'pipe' }
    );

    const spec = CHAPTER3_ASSET_SPECS.find((s) => s.id === 'jade-heart-relic');
    const highMetrics = inspectGlbFile(path.join(outDir, 'jade-heart-relic-high.glb'));
    const liteMetrics = inspectGlbFile(path.join(outDir, 'jade-heart-relic-lite.glb'));

    assert.equal(highMetrics.valid, true);
    assert.equal(liteMetrics.valid, true);
    assert.equal(highMetrics.imageCount, 3, 'High tier should retain Albedo + MR + Normal');
    assert.equal(liteMetrics.imageCount, 1, 'Lite tier must strip PBR data maps to 1 albedo image');
    assert.equal(highMetrics.maxTextureDimension, 1024);
    assert.equal(liteMetrics.maxTextureDimension, 512);
    assert.ok(liteMetrics.triangleCount <= spec.liteMaxTris);
    assert.ok(highMetrics.triangleCount <= spec.highMaxTris);
    assert.ok(liteMetrics.bytes < highMetrics.bytes);
    assert.equal(liteMetrics.usesUint32Indices, false);
    assert.match(String(liteMetrics.generator), /Chapter 3 Lite Pipeline/);

    assert.equal(validateAssetVariant(spec, 'high', highMetrics).ok, true);
    assert.equal(validateAssetVariant(spec, 'lite', liteMetrics).ok, true);

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
    assert.equal(report.pack.ok, true);
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
});

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { MeshoptSimplifier } from 'meshoptimizer';

const BOSS_DIR = path.resolve(process.cwd(), 'public/assets/Chương 1/Boss mới');
const SRC_GLB = path.join(BOSS_DIR, 'Sư tử boss mới.glb');
const HIGH_GLB = path.join(BOSS_DIR, 'Sư tử boss mới High.glb');
const LITE_GLB = path.join(BOSS_DIR, 'Sư tử boss mới Lite.glb');

function align4(n) {
  return (n + 3) & ~3;
}

function padBuffer(buf, padByte) {
  const paddedLen = align4(buf.length);
  if (paddedLen === buf.length) return buf;
  const out = Buffer.alloc(paddedLen, padByte);
  buf.copy(out);
  return out;
}

function resizeImage(inputBuf, size, format, quality = 88) {
  const args =
    format === 'jpeg'
      ? [
          'png:-',
          '-filter',
          'Lanczos',
          '-resize',
          `${size}x${size}!`,
          '-sampling-factor',
          '4:2:0',
          '-quality',
          String(quality),
          '-strip',
          'jpg:-',
        ]
      : [
          'png:-',
          '-filter',
          'Lanczos',
          '-resize',
          `${size}x${size}!`,
          '-strip',
          'png:-',
        ];
  return execFileSync('/usr/bin/convert', args, {
    input: inputBuf,
    maxBuffer: 64 * 1024 * 1024,
  });
}

function buildVariant({
  label,
  outPath,
  targetTriangles,
  maxAllowedTriangles,
  positions,
  normals,
  uvs,
  indices,
  attrs,
  srcNode,
  texturesSpec,
}) {
  const targetIndexCount = targetTriangles * 3;
  const attrWeights = [0.35, 0.35, 0.35, 0.9, 0.9];

  let [simplifiedIndices, simplifyErr] = MeshoptSimplifier.simplifyWithAttributes(
    indices,
    positions,
    3,
    attrs,
    5,
    attrWeights,
    null,
    targetIndexCount,
    0.04,
    ['LockBorder']
  );

  if (simplifiedIndices.length > maxAllowedTriangles * 3) {
    console.log(
      `[${label}] Pass 1 yielded ${(simplifiedIndices.length / 3).toLocaleString()} tris (err=${simplifyErr.toFixed(4)}); running permissive pass...`
    );
    [simplifiedIndices, simplifyErr] = MeshoptSimplifier.simplifyWithAttributes(
      indices,
      positions,
      3,
      attrs,
      5,
      attrWeights,
      null,
      targetIndexCount,
      0.08,
      ['Permissive']
    );
  }

  const [remap, uniqueVerts] = MeshoptSimplifier.compactMesh(simplifiedIndices);
  console.log(
    `[${label}] Simplified: ${uniqueVerts.toLocaleString()} verts | ${(simplifiedIndices.length / 3).toLocaleString()} tris | err=${simplifyErr.toFixed(5)}`
  );

  const outPositions = new Float32Array(uniqueVerts * 3);
  const outNormals = new Float32Array(uniqueVerts * 3);
  const outUvs = new Float32Array(uniqueVerts * 2);

  const minPos = [Infinity, Infinity, Infinity];
  const maxPos = [-Infinity, -Infinity, -Infinity];

  for (let oldIdx = 0; oldIdx < remap.length; oldIdx++) {
    const newIdx = remap[oldIdx];
    if (newIdx === 0xffffffff || newIdx >= uniqueVerts) continue;

    const px = positions[oldIdx * 3];
    const py = positions[oldIdx * 3 + 1];
    const pz = positions[oldIdx * 3 + 2];
    outPositions[newIdx * 3] = px;
    outPositions[newIdx * 3 + 1] = py;
    outPositions[newIdx * 3 + 2] = pz;

    if (px < minPos[0]) minPos[0] = px;
    if (py < minPos[1]) minPos[1] = py;
    if (pz < minPos[2]) minPos[2] = pz;
    if (px > maxPos[0]) maxPos[0] = px;
    if (py > maxPos[1]) maxPos[1] = py;
    if (pz > maxPos[2]) maxPos[2] = pz;

    const nx = normals[oldIdx * 3];
    const ny = normals[oldIdx * 3 + 1];
    const nz = normals[oldIdx * 3 + 2];
    const nLen = Math.hypot(nx, ny, nz) || 1;
    outNormals[newIdx * 3] = nx / nLen;
    outNormals[newIdx * 3 + 1] = ny / nLen;
    outNormals[newIdx * 3 + 2] = nz / nLen;

    outUvs[newIdx * 2] = uvs[oldIdx * 2];
    outUvs[newIdx * 2 + 1] = uvs[oldIdx * 2 + 1];
  }

  const useUint16 = uniqueVerts <= 65_535;
  const outIndices = useUint16
    ? Uint16Array.from(simplifiedIndices)
    : new Uint32Array(simplifiedIndices);

  const posBuf = Buffer.from(outPositions.buffer, outPositions.byteOffset, outPositions.byteLength);
  const normBuf = Buffer.from(outNormals.buffer, outNormals.byteOffset, outNormals.byteLength);
  const uvBuf = Buffer.from(outUvs.buffer, outUvs.byteOffset, outUvs.byteLength);
  const idxBuf = Buffer.from(outIndices.buffer, outIndices.byteOffset, outIndices.byteLength);

  const parts = [];
  let cursor = 0;
  const pushPart = (rawBuf, target) => {
    const byteOffset = cursor;
    const byteLength = rawBuf.length;
    const padded = padBuffer(rawBuf, 0x00);
    parts.push(padded);
    cursor += padded.length;
    const bv = { buffer: 0, byteOffset, byteLength };
    if (target) bv.target = target;
    return bv;
  };

  const bufferViews = [
    pushPart(posBuf, 34962),
    pushPart(normBuf, 34962),
    pushPart(uvBuf, 34962),
    pushPart(idxBuf, 34963),
  ];

  const images = [];
  const textures = [];
  for (const tex of texturesSpec.entries) {
    const bvIdx = bufferViews.length;
    bufferViews.push(pushPart(tex.bytes));
    const imgIdx = images.length;
    images.push({
      name: tex.name,
      mimeType: tex.mimeType,
      bufferView: bvIdx,
    });
    textures.push({ sampler: 0, source: imgIdx });
  }

  const outBin = Buffer.concat(parts);

  const material = texturesSpec.includePbrMaps
    ? {
        name: 'Chapter1SolarLionHighMaterial',
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicRoughnessTexture: { index: 1 },
          metallicFactor: 1.0,
          roughnessFactor: 1.0,
        },
        normalTexture: { index: 2 },
      }
    : {
        name: 'Chapter1SolarLionLiteMaterial',
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicFactor: 0.28,
          roughnessFactor: 0.62,
        },
      };

  const outGltf = {
    asset: {
      version: '2.0',
      generator: `Aetherbow Chapter 1 Boss ${label} Pipeline (meshoptimizer)`,
    },
    scene: 0,
    scenes: [{ name: 'Scene', nodes: [0] }],
    nodes: [
      {
        name: srcNode.name || 'node_0',
        mesh: 0,
        ...(srcNode.rotation ? { rotation: srcNode.rotation } : {}),
        ...(srcNode.translation ? { translation: srcNode.translation } : {}),
        ...(srcNode.scale ? { scale: srcNode.scale } : {}),
      },
    ],
    materials: [material],
    meshes: [
      {
        name: `Chapter1SolarLionBoss${label}`,
        primitives: [
          {
            attributes: {
              POSITION: 0,
              NORMAL: 1,
              TEXCOORD_0: 2,
            },
            indices: 3,
            material: 0,
          },
        ],
      },
    ],
    textures,
    samplers: [
      {
        magFilter: 9729,
        minFilter: 9987,
        wrapS: 10497,
        wrapT: 10497,
      },
    ],
    images,
    accessors: [
      {
        bufferView: 0,
        componentType: 5126,
        count: uniqueVerts,
        type: 'VEC3',
        min: minPos,
        max: maxPos,
      },
      {
        bufferView: 1,
        componentType: 5126,
        count: uniqueVerts,
        type: 'VEC3',
      },
      {
        bufferView: 2,
        componentType: 5126,
        count: uniqueVerts,
        type: 'VEC2',
      },
      {
        bufferView: 3,
        componentType: useUint16 ? 5123 : 5125,
        count: outIndices.length,
        type: 'SCALAR',
      },
    ],
    bufferViews,
    buffers: [{ byteLength: outBin.length }],
  };

  const jsonChunk = padBuffer(Buffer.from(JSON.stringify(outGltf), 'utf8'), 0x20);
  const binChunk = padBuffer(outBin, 0x00);
  const totalByteLength = 12 + 8 + jsonChunk.length + 8 + binChunk.length;

  const glbHeader = Buffer.alloc(12);
  glbHeader.writeUInt32LE(0x46546c67, 0);
  glbHeader.writeUInt32LE(2, 4);
  glbHeader.writeUInt32LE(totalByteLength, 8);

  const jsonHeader = Buffer.alloc(8);
  jsonHeader.writeUInt32LE(jsonChunk.length, 0);
  jsonHeader.writeUInt32LE(0x4e4f534a, 4);

  const binHeader = Buffer.alloc(8);
  binHeader.writeUInt32LE(binChunk.length, 0);
  binHeader.writeUInt32LE(0x004e4942, 4);

  const finalGlb = Buffer.concat([glbHeader, jsonHeader, jsonChunk, binHeader, binChunk]);
  fs.writeFileSync(outPath, finalGlb);

  const outStat = fs.statSync(outPath);
  console.log(
    `[${label}] Wrote ${outPath} -> ${(outStat.size / (1024 * 1024)).toFixed(2)} MiB (${outStat.size.toLocaleString()} bytes) | ` +
      `Index: ${useUint16 ? 'UINT16' : 'UINT32'} | Images: ${images.length}`
  );
}

async function main() {
  const srcStat = fs.statSync(SRC_GLB);
  const srcBuf = fs.readFileSync(SRC_GLB);

  const magic = srcBuf.readUInt32LE(0);
  const version = srcBuf.readUInt32LE(4);
  if (magic !== 0x46546c67 || version !== 2) {
    throw new Error('Source boss GLB is not a valid glTF 2.0 binary.');
  }

  const jsonLen = srcBuf.readUInt32LE(12);
  const gltf = JSON.parse(srcBuf.subarray(20, 20 + jsonLen).toString('utf8'));
  const binOffset = 20 + jsonLen;
  const binLen = srcBuf.readUInt32LE(binOffset);
  const binData = srcBuf.subarray(binOffset + 8, binOffset + 8 + binLen);

  const prim = gltf.meshes[0].primitives[0];
  const posAcc = gltf.accessors[prim.attributes.POSITION];
  const normAcc = gltf.accessors[prim.attributes.NORMAL];
  const uvAcc = gltf.accessors[prim.attributes.TEXCOORD_0];
  const idxAcc = gltf.accessors[prim.indices];

  const sliceBv = (bvIndex) => {
    const bv = gltf.bufferViews[bvIndex];
    const start = bv.byteOffset || 0;
    return binData.subarray(start, start + bv.byteLength);
  };

  const vertexCount = posAcc.count;
  const positions = new Float32Array(
    binData.buffer,
    binData.byteOffset + (gltf.bufferViews[posAcc.bufferView].byteOffset || 0),
    vertexCount * 3
  );
  const normals = new Float32Array(
    binData.buffer,
    binData.byteOffset + (gltf.bufferViews[normAcc.bufferView].byteOffset || 0),
    vertexCount * 3
  );
  const uvs = new Float32Array(
    binData.buffer,
    binData.byteOffset + (gltf.bufferViews[uvAcc.bufferView].byteOffset || 0),
    vertexCount * 2
  );
  const indices = new Uint32Array(
    binData.buffer,
    binData.byteOffset + (gltf.bufferViews[idxAcc.bufferView].byteOffset || 0),
    idxAcc.count
  );

  console.log(
    `Source Boss GLB: ${(srcStat.size / (1024 * 1024)).toFixed(2)} MiB | ` +
      `${vertexCount.toLocaleString()} verts | ${(indices.length / 3).toLocaleString()} tris`
  );

  const attrs = new Float32Array(vertexCount * 5);
  for (let i = 0; i < vertexCount; i++) {
    const o5 = i * 5;
    const o3 = i * 3;
    const o2 = i * 2;
    attrs[o5] = normals[o3];
    attrs[o5 + 1] = normals[o3 + 1];
    attrs[o5 + 2] = normals[o3 + 2];
    attrs[o5 + 3] = uvs[o2];
    attrs[o5 + 4] = uvs[o2 + 1];
  }

  const srcMat = gltf.materials[0];
  const getImgBuf = (texRef) => {
    const imgIdx = gltf.textures[texRef.index].source;
    return sliceBv(gltf.images[imgIdx].bufferView);
  };

  const baseColorPng = getImgBuf(srcMat.pbrMetallicRoughness.baseColorTexture);
  const mrPng = getImgBuf(srcMat.pbrMetallicRoughness.metallicRoughnessTexture);
  const normalPng = getImgBuf(srcMat.normalTexture);

  console.log('Resizing PBR textures for High (2K albedo + 1K MR/Normal) & Lite (1K albedo)...');
  const highAlbedoJpg = resizeImage(baseColorPng, 2048, 'jpeg', 88);
  const highMrJpg = resizeImage(mrPng, 1024, 'jpeg', 88);
  const highNormalPng = resizeImage(normalPng, 1024, 'png');
  const liteAlbedoJpg = resizeImage(baseColorPng, 1024, 'jpeg', 84);

  console.log(
    `Textures ready: High(albedo=${(highAlbedoJpg.length / 1024).toFixed(0)}KB, mr=${(highMrJpg.length / 1024).toFixed(0)}KB, normal=${(highNormalPng.length / 1024).toFixed(0)}KB) | ` +
      `Lite(albedo=${(liteAlbedoJpg.length / 1024).toFixed(0)}KB)`
  );

  await MeshoptSimplifier.ready;

  buildVariant({
    label: 'High',
    outPath: HIGH_GLB,
    targetTriangles: 38_000,
    maxAllowedTriangles: 46_000,
    positions,
    normals,
    uvs,
    indices,
    attrs,
    srcNode: gltf.nodes[0],
    texturesSpec: {
      includePbrMaps: true,
      entries: [
        { name: 'solar_lion_high_albedo_2048', mimeType: 'image/jpeg', bytes: highAlbedoJpg },
        { name: 'solar_lion_high_mr_1024', mimeType: 'image/jpeg', bytes: highMrJpg },
        { name: 'solar_lion_high_normal_1024', mimeType: 'image/png', bytes: highNormalPng },
      ],
    },
  });

  buildVariant({
    label: 'Lite',
    outPath: LITE_GLB,
    targetTriangles: 12_000,
    maxAllowedTriangles: 16_000,
    positions,
    normals,
    uvs,
    indices,
    attrs,
    srcNode: gltf.nodes[0],
    texturesSpec: {
      includePbrMaps: false,
      entries: [
        { name: 'solar_lion_lite_albedo_1024', mimeType: 'image/jpeg', bytes: liteAlbedoJpg },
      ],
    },
  });

  const srcStatAfter = fs.statSync(SRC_GLB);
  console.log(`Original 83 MB source untouched: ${srcStatAfter.size === srcStat.size}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

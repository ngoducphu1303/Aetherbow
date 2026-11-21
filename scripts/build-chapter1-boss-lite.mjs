import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { MeshoptSimplifier } from 'meshoptimizer';

const BOSS_DIR = path.resolve(process.cwd(), 'public/assets/Chương 1/Boss');
const SRC_GLB = path.join(BOSS_DIR, 'Sư Vương Thái Dương (Boss Cuối).glb');
const OUT_GLB = path.join(BOSS_DIR, 'Sư Vương Thái Dương Lite.glb');

const TARGET_TRIANGLES = 4_400;
const TEXTURE_SIZE = 1024;
const JPEG_QUALITY = 82;

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

async function main() {
  const srcStat = fs.statSync(SRC_GLB);
  const srcBuf = fs.readFileSync(SRC_GLB);

  const magic = srcBuf.readUInt32LE(0);
  const version = srcBuf.readUInt32LE(4);
  if (magic !== 0x46546c67 || version !== 2) {
    throw new Error('Source Boss GLB is not a valid glTF 2.0 binary.');
  }

  const jsonLen = srcBuf.readUInt32LE(12);
  const jsonType = srcBuf.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a) {
    throw new Error('Missing JSON chunk in source Boss GLB.');
  }
  const gltf = JSON.parse(srcBuf.subarray(20, 20 + jsonLen).toString('utf8'));

  const binChunkOffset = 20 + jsonLen;
  const binLen = srcBuf.readUInt32LE(binChunkOffset);
  const binType = srcBuf.readUInt32LE(binChunkOffset + 4);
  if (binType !== 0x004e4942) {
    throw new Error('Missing BIN chunk in source Boss GLB.');
  }
  const binData = srcBuf.subarray(binChunkOffset + 8, binChunkOffset + 8 + binLen);

  const prim = gltf.meshes[0].primitives[0];
  const posAcc = gltf.accessors[prim.attributes.POSITION];
  const normAcc = gltf.accessors[prim.attributes.NORMAL];
  const uvAcc = gltf.accessors[prim.attributes.TEXCOORD_0];
  const idxAcc = gltf.accessors[prim.indices];

  const getAccessorSlice = (acc) => {
    const bv = gltf.bufferViews[acc.bufferView];
    const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
    return { byteOffset };
  };

  const vertexCount = posAcc.count;
  const positions = new Float32Array(
    binData.buffer,
    binData.byteOffset + getAccessorSlice(posAcc).byteOffset,
    vertexCount * 3
  );
  const normals = new Float32Array(
    binData.buffer,
    binData.byteOffset + getAccessorSlice(normAcc).byteOffset,
    vertexCount * 3
  );
  const uvs = new Float32Array(
    binData.buffer,
    binData.byteOffset + getAccessorSlice(uvAcc).byteOffset,
    vertexCount * 2
  );
  const idxOff = getAccessorSlice(idxAcc).byteOffset;
  const indices =
    idxAcc.componentType === 5123
      ? Uint32Array.from(
          new Uint16Array(binData.buffer, binData.byteOffset + idxOff, idxAcc.count)
        )
      : new Uint32Array(binData.buffer, binData.byteOffset + idxOff, idxAcc.count);

  console.log(
    `Source Boss GLB: ${(srcStat.size / (1024 * 1024)).toFixed(2)} MiB | ` +
      `${vertexCount.toLocaleString()} verts | ${(indices.length / 3).toLocaleString()} tris`
  );

  // Interleave NORMAL (3) + TEXCOORD_0 (2) to preserve silhouette & UV seams
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

  await MeshoptSimplifier.ready;
  const targetIndexCount = TARGET_TRIANGLES * 3;
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

  if (simplifiedIndices.length > 5_200 * 3) {
    [simplifiedIndices, simplifyErr] = MeshoptSimplifier.simplifyWithAttributes(
      indices,
      positions,
      3,
      attrs,
      5,
      attrWeights,
      null,
      targetIndexCount,
      0.07,
      ['Permissive']
    );
  }

  const [remap, uniqueVerts] = MeshoptSimplifier.compactMesh(simplifiedIndices);
  console.log(
    `Simplified Boss: ${uniqueVerts.toLocaleString()} verts | ${(simplifiedIndices.length / 3).toLocaleString()} tris | err=${simplifyErr.toFixed(5)}`
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

  // Extract BaseColor texture only and downscale 2048 -> 1024 JPEG
  const srcMat = gltf.materials[0];
  const baseColorTexIdx = srcMat.pbrMetallicRoughness.baseColorTexture.index;
  const baseColorImgIdx = gltf.textures[baseColorTexIdx].source;
  const baseColorImg = gltf.images[baseColorImgIdx];
  const baseColorBv = gltf.bufferViews[baseColorImg.bufferView];
  const baseColorSrc = binData.subarray(
    baseColorBv.byteOffset || 0,
    (baseColorBv.byteOffset || 0) + baseColorBv.byteLength
  );
  const srcFmt = baseColorImg.mimeType === 'image/png' ? 'png:-' : 'jpg:-';

  console.log(
    `Resizing BaseColor (${(baseColorSrc.length / (1024 * 1024)).toFixed(2)} MiB) -> ${TEXTURE_SIZE}x${TEXTURE_SIZE} JPEG q=${JPEG_QUALITY}...`
  );
  const baseColorJpg = execFileSync(
    '/usr/bin/convert',
    [
      srcFmt,
      '-filter',
      'Lanczos',
      '-resize',
      `${TEXTURE_SIZE}x${TEXTURE_SIZE}!`,
      '-sampling-factor',
      '4:2:0',
      '-quality',
      String(JPEG_QUALITY),
      '-strip',
      'jpg:-',
    ],
    {
      input: baseColorSrc,
      maxBuffer: 32 * 1024 * 1024,
    }
  );
  console.log(`Lite BaseColor JPEG: ${(baseColorJpg.length / 1024).toFixed(1)} KB`);

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

  const bvPos = pushPart(posBuf, 34962);
  const bvNorm = pushPart(normBuf, 34962);
  const bvUv = pushPart(uvBuf, 34962);
  const bvIdx = pushPart(idxBuf, 34963);
  const bvImg = pushPart(baseColorJpg);

  const outBin = Buffer.concat(parts);
  const outGltf = {
    asset: {
      version: '2.0',
      generator: 'Aetherbow Solar Lion Boss Lite Pipeline (meshoptimizer)',
    },
    scene: 0,
    scenes: [{ name: 'Scene', nodes: [0] }],
    nodes: [
      {
        name: 'SolarLionBossLite',
        mesh: 0,
      },
    ],
    materials: [
      {
        name: 'SolarLionBossLiteMaterial',
        doubleSided: true,
        pbrMetallicRoughness: {
          baseColorTexture: { index: 0 },
          metallicFactor: 0.28,
          roughnessFactor: 0.58,
        },
      },
    ],
    meshes: [
      {
        name: 'SolarLionBossLiteMesh',
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
    textures: [{ sampler: 0, source: 0 }],
    samplers: [
      {
        magFilter: 9729,
        minFilter: 9987,
        wrapS: 10497,
        wrapT: 10497,
      },
    ],
    images: [
      {
        name: 'solar_lion_boss_lite_albedo_1024',
        mimeType: 'image/jpeg',
        bufferView: 4,
      },
    ],
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
    bufferViews: [bvPos, bvNorm, bvUv, bvIdx, bvImg],
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
  fs.writeFileSync(OUT_GLB, finalGlb);

  const outStat = fs.statSync(OUT_GLB);
  const srcStatAfter = fs.statSync(SRC_GLB);
  console.log(`Wrote ${OUT_GLB}`);
  console.log(
    `Output Lite GLB: ${(outStat.size / 1024).toFixed(1)} KB (${outStat.size.toLocaleString()} bytes) | ` +
      `Reduction: ${(srcStat.size / outStat.size).toFixed(1)}x smaller`
  );
  console.log(`Original untouched: ${srcStatAfter.size === srcStat.size}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

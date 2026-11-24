import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MeshoptSimplifier } from 'meshoptimizer';

const RAW_TMP_DIR = '/tmp/aetherbow-ch1-roster-raw';
const MOBS_OUT_DIR = path.resolve(process.cwd(), 'public/assets/Chương 1/Quái mới');
const SUBBOSS_OUT_DIR = path.resolve(process.cwd(), 'public/assets/Chương 1/Boss phụ mới');

const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/ngoducphu1303/Aetherbow/main';

const ASSETS = [
  {
    id: 'fire_lion',
    kind: 'mob',
    remotePath: 'public/assets/Chương 1/Quái mới/1. Sư Tử Lửa Đền Thờ (cận chiến tốc độ cao).glb',
    outDir: MOBS_OUT_DIR,
    highFile: '1. Sư Tử Lửa Đền Thờ High.glb',
    liteFile: '1. Sư Tử Lửa Đền Thờ Lite.glb',
    highTris: 14_000,
    highMaxTris: 18_000,
    liteTris: 4_800,
    liteMaxTris: 6_500,
    highAlbedoSize: 1024,
    highDataSize: 512,
    liteAlbedoSize: 512,
  },
  {
    id: 'stone_guardian',
    kind: 'mob',
    remotePath: 'public/assets/Chương 1/Quái mới/2. Vệ Binh Đá Mặt Trời (tank giáp nặng).glb',
    outDir: MOBS_OUT_DIR,
    highFile: '2. Vệ Binh Đá Mặt Trời High.glb',
    liteFile: '2. Vệ Binh Đá Mặt Trời Lite.glb',
    highTris: 14_000,
    highMaxTris: 18_000,
    liteTris: 4_800,
    liteMaxTris: 6_500,
    highAlbedoSize: 1024,
    highDataSize: 512,
    liteAlbedoSize: 512,
  },
  {
    id: 'flame_spirit',
    kind: 'mob',
    remotePath: 'public/assets/Chương 1/Quái mới/3. Linh Hồn Lửa Hoàng Đạo (pháp sư tầm xa).glb',
    outDir: MOBS_OUT_DIR,
    highFile: '3. Linh Hồn Lửa Hoàng Đạo High.glb',
    liteFile: '3. Linh Hồn Lửa Hoàng Đạo Lite.glb',
    highTris: 14_000,
    highMaxTris: 18_000,
    liteTris: 4_800,
    liteMaxTris: 6_500,
    highAlbedoSize: 1024,
    highDataSize: 512,
    liteAlbedoSize: 512,
  },
  {
    id: 'sun_spearman',
    kind: 'mob',
    remotePath: 'public/assets/Chương 1/Quái mới/4. Chiến Binh Thương Ánh Dương (lính gác tầm trung).glb',
    outDir: MOBS_OUT_DIR,
    highFile: '4. Chiến Binh Thương Ánh Dương High.glb',
    liteFile: '4. Chiến Binh Thương Ánh Dương Lite.glb',
    highTris: 14_000,
    highMaxTris: 18_000,
    liteTris: 4_800,
    liteMaxTris: 6_500,
    highAlbedoSize: 1024,
    highDataSize: 512,
    liteAlbedoSize: 512,
  },
  {
    id: 'winged_solar_lion',
    kind: 'subboss',
    remotePath: 'public/assets/Chương 1/Boss phụ mới/1. Sư Tử Cánh Ánh Dương.glb',
    outDir: SUBBOSS_OUT_DIR,
    highFile: '1. Sư Tử Cánh Ánh Dương High.glb',
    liteFile: '1. Sư Tử Cánh Ánh Dương Lite.glb',
    highTris: 28_000,
    highMaxTris: 35_000,
    liteTris: 9_500,
    liteMaxTris: 12_500,
    highAlbedoSize: 2048,
    highDataSize: 1024,
    liteAlbedoSize: 1024,
  },
];

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

function encodeGithubPath(relPath) {
  return relPath
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

function downloadRawGlb(asset) {
  fs.mkdirSync(RAW_TMP_DIR, { recursive: true });
  const localPath = path.join(RAW_TMP_DIR, `${asset.id}.glb`);
  if (fs.existsSync(localPath) && fs.statSync(localPath).size > 1_000_000) {
    console.log(`[${asset.id}] Using cached download ${localPath}`);
    return localPath;
  }
  const url = `${GITHUB_RAW_BASE}/${encodeGithubPath(asset.remotePath)}`;
  console.log(`[${asset.id}] Downloading ${url} ...`);
  execFileSync('curl', ['-fL', '--retry', '3', '--retry-delay', '2', '-o', localPath, url], {
    stdio: 'inherit',
  });
  return localPath;
}

function resizeImage(inputBuf, mimeType, size, outFormat, quality = 86) {
  const inputPrefix =
    mimeType === 'image/jpeg' || mimeType === 'image/jpg'
      ? 'jpg:-'
      : mimeType === 'image/webp'
      ? 'webp:-'
      : 'png:-';
  const args =
    outFormat === 'jpeg'
      ? [
          inputPrefix,
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
          inputPrefix,
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

function readAccessorAsFloat32(gltf, binData, accessorIndex) {
  const acc = gltf.accessors[accessorIndex];
  const bv = gltf.bufferViews[acc.bufferView];
  const compCount =
    acc.type === 'SCALAR' ? 1 : acc.type === 'VEC2' ? 2 : acc.type === 'VEC3' ? 3 : 4;
  const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const stride = bv.byteStride || compCount * 4;
  if (acc.componentType === 5126 && stride === compCount * 4) {
    const slice = binData.subarray(byteOffset, byteOffset + acc.count * compCount * 4);
    const out = new Float32Array(acc.count * compCount);
    Buffer.from(out.buffer).set(slice);
    return out;
  }
  const out = new Float32Array(acc.count * compCount);
  const dv = new DataView(binData.buffer, binData.byteOffset + byteOffset, acc.count * stride);
  for (let i = 0; i < acc.count; i++) {
    for (let c = 0; c < compCount; c++) {
      out[i * compCount + c] = dv.getFloat32(i * stride + c * 4, true);
    }
  }
  return out;
}

function readIndicesAsUint32(gltf, binData, accessorIndex) {
  const acc = gltf.accessors[accessorIndex];
  const bv = gltf.bufferViews[acc.bufferView];
  const byteOffset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const out = new Uint32Array(acc.count);
  const dv = new DataView(binData.buffer, binData.byteOffset + byteOffset);
  if (acc.componentType === 5125) {
    for (let i = 0; i < acc.count; i++) out[i] = dv.getUint32(i * 4, true);
  } else if (acc.componentType === 5123) {
    for (let i = 0; i < acc.count; i++) out[i] = dv.getUint16(i * 2, true);
  } else if (acc.componentType === 5121) {
    for (let i = 0; i < acc.count; i++) out[i] = dv.getUint8(i);
  } else {
    throw new Error(`Unsupported index componentType ${acc.componentType}`);
  }
  return out;
}

function buildVariant({
  assetId,
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
  chapterPrefix = 'Ch1',
  generatorChapterLabel = 'Chapter 1 Roster',
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
  const texIndexByRole = {};
  for (const tex of texturesSpec.entries) {
    const bvIdx = bufferViews.length;
    bufferViews.push(pushPart(tex.bytes));
    const imgIdx = images.length;
    images.push({
      name: tex.name,
      mimeType: tex.mimeType,
      bufferView: bvIdx,
    });
    texIndexByRole[tex.role] = textures.length;
    textures.push({ sampler: 0, source: imgIdx });
  }

  const outBin = Buffer.concat(parts);

  const pbrMetallicRoughness = {
    ...(texIndexByRole.albedo !== undefined
      ? { baseColorTexture: { index: texIndexByRole.albedo } }
      : {}),
    ...(texturesSpec.includePbrMaps && texIndexByRole.mr !== undefined
      ? {
          metallicRoughnessTexture: { index: texIndexByRole.mr },
          metallicFactor: 1.0,
          roughnessFactor: 1.0,
        }
      : {
          metallicFactor: 0.26,
          roughnessFactor: 0.64,
        }),
  };

  const material = {
    name: `${chapterPrefix}_${assetId}_${label}_Material`,
    doubleSided: true,
    pbrMetallicRoughness,
    ...(texturesSpec.includePbrMaps && texIndexByRole.normal !== undefined
      ? { normalTexture: { index: texIndexByRole.normal } }
      : {}),
  };

  const outGltf = {
    asset: {
      version: '2.0',
      generator: `Aetherbow ${generatorChapterLabel} ${label} Pipeline (meshoptimizer)`,
    },
    scene: 0,
    scenes: [{ name: 'Scene', nodes: [0] }],
    nodes: [
      {
        name: srcNode?.name || 'node_0',
        mesh: 0,
        ...(srcNode?.rotation ? { rotation: srcNode.rotation } : {}),
        ...(srcNode?.translation ? { translation: srcNode.translation } : {}),
        ...(srcNode?.scale ? { scale: srcNode.scale } : {}),
      },
    ],
    materials: [material],
    meshes: [
      {
        name: `${chapterPrefix}_${assetId}_${label}`,
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
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const tmpOutPath = `${outPath}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(tmpOutPath, finalGlb);
    fs.renameSync(tmpOutPath, outPath);
  } catch (err) {
    fs.rmSync(tmpOutPath, { force: true });
    throw err;
  }

  const outStat = fs.statSync(outPath);
  const sizeX = (maxPos[0] - minPos[0]).toFixed(2);
  const sizeY = (maxPos[1] - minPos[1]).toFixed(2);
  const sizeZ = (maxPos[2] - minPos[2]).toFixed(2);
  console.log(
    `[${assetId}:${label}] ${(outStat.size / (1024 * 1024)).toFixed(2)} MiB | ` +
      `${uniqueVerts.toLocaleString()} verts | ${(outIndices.length / 3).toLocaleString()} tris | ` +
      `err=${simplifyErr.toFixed(4)} | bbox=(${sizeX}, ${sizeY}, ${sizeZ}) | imgs=${images.length}`
  );
}

function recoverDamagedPng(input) {
  const repair = `
import io, sys
from PIL import Image, ImageFile
ImageFile.LOAD_TRUNCATED_IMAGES = True
image = Image.open(io.BytesIO(sys.stdin.buffer.read())).convert("RGB")
bottom = image.getbbox()[3]
if bottom < image.height:
    valid = image.crop((0, 0, image.width, max(1, bottom - 24)))
    fill = valid.resize((1, 1), Image.Resampling.BOX).getpixel((0, 0))
    image = Image.new("RGB", image.size, fill)
    image.paste(valid, (0, 0))
image.save(sys.stdout.buffer, "PNG")
`;
  return execFileSync('python', ['-c', repair], { input, maxBuffer: 64 * 1024 * 1024 });
}

export async function processAsset(asset) {
  const rawPath = asset.sourcePath ?? downloadRawGlb(asset);
  const srcStat = fs.statSync(rawPath);
  const srcBuf = fs.readFileSync(rawPath);

  const magic = srcBuf.readUInt32LE(0);
  const version = srcBuf.readUInt32LE(4);
  if (magic !== 0x46546c67 || version !== 2) {
    throw new Error(`[${asset.id}] Source GLB is not a valid glTF 2.0 binary.`);
  }

  const jsonLen = srcBuf.readUInt32LE(12);
  const gltf = JSON.parse(srcBuf.subarray(20, 20 + jsonLen).toString('utf8'));
  const binOffset = 20 + jsonLen;
  const binLen = srcBuf.readUInt32LE(binOffset);
  const binData = srcBuf.subarray(binOffset + 8, binOffset + 8 + binLen);

  console.log(
    `\n=== [${asset.id}] Raw ${(srcStat.size / (1024 * 1024)).toFixed(2)} MiB | ` +
      `meshes=${gltf.meshes?.length ?? 0} | prims=${gltf.meshes?.[0]?.primitives?.length ?? 0} | ` +
      `materials=${gltf.materials?.length ?? 0} | images=${gltf.images?.length ?? 0} | ` +
      `anims=${gltf.animations?.length ?? 0} ===`
  );

  const prim = gltf.meshes[0].primitives[0];
  const positions = readAccessorAsFloat32(gltf, binData, prim.attributes.POSITION);
  const vertexCount = positions.length / 3;
  const normals =
    prim.attributes.NORMAL !== undefined
      ? readAccessorAsFloat32(gltf, binData, prim.attributes.NORMAL)
      : new Float32Array(vertexCount * 3);
  const uvs =
    prim.attributes.TEXCOORD_0 !== undefined
      ? readAccessorAsFloat32(gltf, binData, prim.attributes.TEXCOORD_0)
      : new Float32Array(vertexCount * 2);
  const indices =
    prim.indices !== undefined
      ? readIndicesAsUint32(gltf, binData, prim.indices)
      : Uint32Array.from({ length: vertexCount }, (_, i) => i);

  console.log(
    `[${asset.id}] Source geometry: ${vertexCount.toLocaleString()} verts | ${(indices.length / 3).toLocaleString()} tris | node=${JSON.stringify(gltf.nodes?.[0] || {})}`
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

  const sliceBv = (bvIndex) => {
    const bv = gltf.bufferViews[bvIndex];
    const start = bv.byteOffset || 0;
    return binData.subarray(start, start + bv.byteLength);
  };

  const getImg = (texRef) => {
    if (!texRef || texRef.index === undefined) return null;
    const imgIdx = gltf.textures?.[texRef.index]?.source;
    if (imgIdx === undefined) return null;
    const imgDef = gltf.images?.[imgIdx];
    if (!imgDef || imgDef.bufferView === undefined) return null;
    return {
      bytes: sliceBv(imgDef.bufferView),
      mimeType: imgDef.mimeType || 'image/png',
    };
  };

  const srcMat = gltf.materials?.[prim.material ?? 0] || gltf.materials?.[0] || {};
  const baseColorImg = getImg(srcMat.pbrMetallicRoughness?.baseColorTexture);
  if (baseColorImg && asset.recoverAlbedo) {
    baseColorImg.bytes = recoverDamagedPng(baseColorImg.bytes);
    baseColorImg.mimeType = 'image/png';
  }
  const mrImg = getImg(srcMat.pbrMetallicRoughness?.metallicRoughnessTexture);
  const normalImg = getImg(srcMat.normalTexture);

  const highEntries = [];
  const liteEntries = [];

  if (baseColorImg) {
    highEntries.push({
      role: 'albedo',
      name: `${asset.id}_high_albedo_${asset.highAlbedoSize}`,
      mimeType: 'image/jpeg',
      bytes: resizeImage(baseColorImg.bytes, baseColorImg.mimeType, asset.highAlbedoSize, 'jpeg', 86),
    });
    if (!asset.skipLite) {
      liteEntries.push({
        role: 'albedo',
        name: `${asset.id}_lite_albedo_${asset.liteAlbedoSize}`,
        mimeType: 'image/jpeg',
        bytes: resizeImage(baseColorImg.bytes, baseColorImg.mimeType, asset.liteAlbedoSize, 'jpeg', 82),
      });
    }
  }
  if (mrImg) {
    highEntries.push({
      role: 'mr',
      name: `${asset.id}_high_mr_${asset.highDataSize}`,
      mimeType: 'image/jpeg',
      bytes: resizeImage(mrImg.bytes, mrImg.mimeType, asset.highDataSize, 'jpeg', 85),
    });
  }
  if (normalImg) {
    highEntries.push({
      role: 'normal',
      name: `${asset.id}_high_normal_${asset.highDataSize}`,
      mimeType: 'image/png',
      bytes: resizeImage(normalImg.bytes, normalImg.mimeType, asset.highDataSize, 'png'),
    });
  }

  if (!asset.skipHigh) {
    buildVariant({
      assetId: asset.id,
      label: 'High',
      outPath: path.join(asset.outDir, asset.highFile),
      targetTriangles: asset.highTris,
      maxAllowedTriangles: asset.highMaxTris,
      positions,
      normals,
      uvs,
      indices,
      attrs,
      srcNode: gltf.nodes?.[0],
      chapterPrefix: asset.chapterPrefix,
      generatorChapterLabel: asset.generatorChapterLabel,
      texturesSpec: {
        includePbrMaps: true,
        entries: highEntries,
      },
    });
  }

  if (!asset.skipLite) {
    buildVariant({
      assetId: asset.id,
      label: 'Lite',
      outPath: path.join(asset.outDir, asset.liteFile),
      targetTriangles: asset.liteTris,
      maxAllowedTriangles: asset.liteMaxTris,
      positions,
      normals,
      uvs,
      indices,
      attrs,
      srcNode: gltf.nodes?.[0],
      chapterPrefix: asset.chapterPrefix,
      generatorChapterLabel: asset.generatorChapterLabel,
      texturesSpec: {
        includePbrMaps: false,
        entries: liteEntries,
      },
    });
  }

  // Remove the ~85MB raw staging file right away to keep /tmp lean
  if (!asset.sourcePath) fs.rmSync(rawPath, { force: true });
}

async function main() {
  await MeshoptSimplifier.ready;
  for (const asset of ASSETS) {
    await processAsset(asset);
  }
  fs.rmSync(RAW_TMP_DIR, { recursive: true, force: true });
  console.log('\nAll 5 Chapter 1 Roster assets (10 High/Lite GLB variants) built cleanly!');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

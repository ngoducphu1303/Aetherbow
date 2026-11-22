import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { MeshoptSimplifier } from 'meshoptimizer';

const RAW_TMP_DIR = '/tmp/aetherbow-ch1-char-raw';
const BASE_OUT_DIR = path.resolve(process.cwd(), 'public/assets/Chương 1/Nhân vật');
const GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/ngoducphu1303/Aetherbow/main';

const FORCE_HUMANOIDS = process.argv.includes('--force-humanoids');
const FORCE_ALL = process.argv.includes('--force-all');
const LITE_FROM_HIGH = process.argv.includes('--lite-from-high');

const ASSETS = [
  {
    id: 'aurelia',
    category: 'hero',
    subDir: '1. Anh hùng',
    baseName: 'Aurelia',
    highTris: 36_000,
    highMaxTris: 44_000,
    liteTris: 12_500,
    liteMaxTris: 15_500,
    highAlbedoSize: 1536,
    highDataSize: 768,
    liteAlbedoSize: 1024,
  },
  {
    id: 'astraeo',
    category: 'pet',
    subDir: '2. Tinh linh',
    baseName: 'Astraeo',
    highTris: 14_000,
    highMaxTris: 18_000,
    liteTris: 5_000,
    liteMaxTris: 6_800,
    highAlbedoSize: 1024,
    highDataSize: 512,
    liteAlbedoSize: 512,
  },
  {
    id: 'solar_zenith_wings',
    category: 'wings',
    subDir: '3. Cánh',
    baseName: 'Wings of the Solar Zenith',
    highTris: 16_000,
    highMaxTris: 20_000,
    liteTris: 6_000,
    liteMaxTris: 8_000,
    highAlbedoSize: 1024,
    highDataSize: 512,
    liteAlbedoSize: 512,
  },
  {
    id: 'solarius',
    category: 'mount',
    subDir: '4. Thú cưỡi',
    baseName: 'Solarius',
    highTris: 24_000,
    highMaxTris: 30_000,
    liteTris: 8_500,
    liteMaxTris: 11_000,
    highAlbedoSize: 1024,
    highDataSize: 512,
    liteAlbedoSize: 512,
  },
  {
    id: 'astrolabe_regulus',
    category: 'relic',
    subDir: '5. Thánh khí',
    baseName: 'Astrolabe of Regulus',
    highTris: 14_000,
    highMaxTris: 18_000,
    liteTris: 5_000,
    liteMaxTris: 6_800,
    highAlbedoSize: 1024,
    highDataSize: 512,
    liteAlbedoSize: 512,
  },
  {
    id: 'leo_sovereign_halo',
    category: 'halo',
    subDir: '6. Hào quang',
    baseName: 'Halo of the Leo Sovereign',
    highTris: 14_000,
    highMaxTris: 18_000,
    liteTris: 5_000,
    liteMaxTris: 6_800,
    highAlbedoSize: 1024,
    highDataSize: 512,
    liteAlbedoSize: 512,
  },
  {
    id: 'aurelia_oasis_dancer',
    category: 'skin',
    subDir: '7. Trang phục',
    baseName: 'Golden Oasis Sun Dancer',
    highTris: 36_000,
    highMaxTris: 44_000,
    liteTris: 12_500,
    liteMaxTris: 15_500,
    highAlbedoSize: 1536,
    highDataSize: 768,
    liteAlbedoSize: 1024,
  },
  {
    id: 'aurelia_temple_commander',
    category: 'skin',
    subDir: '7. Trang phục',
    baseName: 'Royal Sun-Temple Commander',
    highTris: 36_000,
    highMaxTris: 44_000,
    liteTris: 12_500,
    liteMaxTris: 15_500,
    highAlbedoSize: 1536,
    highDataSize: 768,
    liteAlbedoSize: 1024,
  },
  {
    id: 'aurelia_solaris_valkyrie',
    category: 'skin',
    subDir: '7. Trang phục',
    baseName: 'Solaris Valkyrie Regalia',
    highTris: 36_000,
    highMaxTris: 44_000,
    liteTris: 12_500,
    liteMaxTris: 15_500,
    highAlbedoSize: 1536,
    highDataSize: 768,
    liteAlbedoSize: 1024,
  },
  {
    id: 'aurelia_winter_solstice',
    category: 'skin',
    subDir: '7. Trang phục',
    baseName: 'Winter Solstice Crystal Sovereign',
    highTris: 36_000,
    highMaxTris: 44_000,
    liteTris: 12_500,
    liteMaxTris: 15_500,
    highAlbedoSize: 1536,
    highDataSize: 768,
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
  const remotePath = `public/assets/Chương 1/Nhân vật/${asset.subDir}/${asset.baseName}.glb`;
  const url = `${GITHUB_RAW_BASE}/${encodeGithubPath(remotePath)}`;
  console.log(`[${asset.id}] Downloading ${asset.baseName}.glb ...`);
  execFileSync('curl', ['-fsSL', '--retry', '3', '--retry-delay', '2', '-o', localPath, url], {
    stdio: 'inherit',
  });
  return localPath;
}

function buildThumbnailWebp(asset) {
  const outDir = path.join(BASE_OUT_DIR, asset.subDir);
  const pngPath = path.join(outDir, `${asset.baseName}.png`);
  const webpPath = path.join(outDir, `${asset.baseName}.webp`);
  if (!fs.existsSync(pngPath)) {
    const remotePath = `public/assets/Chương 1/Nhân vật/${asset.subDir}/${asset.baseName}.png`;
    const url = `${GITHUB_RAW_BASE}/${encodeGithubPath(remotePath)}`;
    fs.mkdirSync(outDir, { recursive: true });
    execFileSync('curl', ['-fsSL', '--retry', '3', '-o', pngPath, url], { stdio: 'inherit' });
  }
  execFileSync('/usr/bin/convert', [
    pngPath,
    '-filter',
    'Lanczos',
    '-resize',
    '512x512>',
    '-quality',
    '84',
    '-strip',
    webpPath,
  ]);
  const webpStat = fs.statSync(webpPath);
  console.log(`[${asset.id}:thumb] ${(webpStat.size / 1024).toFixed(1)} KiB -> ${asset.baseName}.webp`);
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

function buildHumanoidFaceLockMask(positions, srcNode) {
  const vertexCount = positions.length / 3;
  const lock = new Uint8Array(vertexCount);
  const rot = srcNode?.rotation || [0, 0, 0, 1];
  const [qx, qy, qz, qw] = rot;

  const world = new Float32Array(vertexCount * 3);
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (let i = 0; i < vertexCount; i++) {
    const x = positions[i * 3];
    const y = positions[i * 3 + 1];
    const z = positions[i * 3 + 2];
    const tx = 2 * (qy * z - qz * y);
    const ty = 2 * (qz * x - qx * z);
    const tz = 2 * (qx * y - qy * x);
    const wx = x + qw * tx + (qy * tz - qz * ty);
    const wy = y + qw * ty + (qz * tx - qx * tz);
    const wz = z + qw * tz + (qx * ty - qy * tx);
    world[i * 3] = wx;
    world[i * 3 + 1] = wy;
    world[i * 3 + 2] = wz;
    if (wx < minX) minX = wx; if (wx > maxX) maxX = wx;
    if (wy < minY) minY = wy; if (wy > maxY) maxY = wy;
    if (wz < minZ) minZ = wz; if (wz > maxZ) maxZ = wz;
  }

  const sx = Math.max(1e-4, maxX - minX);
  const sy = Math.max(1e-4, maxY - minY);
  const torsoW = Math.min(sx, sy * 0.44);

  // Compute upper-torso centroid (same anchor as runtime normalization)
  let sumX = 0, sumZ = 0, coreCount = 0;
  for (let i = 0; i < vertexCount; i++) {
    const ny = (world[i * 3 + 1] - minY) / sy;
    if (ny >= 0.38 && ny <= 0.92) {
      sumX += world[i * 3];
      sumZ += world[i * 3 + 2];
      coreCount++;
    }
  }
  const cx = coreCount > 0 ? sumX / coreCount : (minX + maxX) * 0.5;
  const cz = coreCount > 0 ? sumZ / coreCount : (minZ + maxZ) * 0.5;

  let locked = 0;
  for (let i = 0; i < vertexCount; i++) {
    const ny = (world[i * 3 + 1] - minY) / sy;
    const dx = world[i * 3] - cx;
    const dz = world[i * 3 + 2] - cz;
    // Protect face/eyes/nose/lips/chin/crown while allowing body/cloak/bow to decimate cleanly
    if (ny >= 0.775 && Math.abs(dx) <= torsoW * 0.42 && dz >= -torsoW * 0.36 && dz <= torsoW * 0.44) {
      lock[i] = 1;
      locked++;
    }
  }
  return { lock, locked };
}

function buildVariant({
  assetId,
  label,
  outPath,
  targetTriangles,
  maxAllowedTriangles,
  preserveFaceDetail = false,
  vertexLock = null,
  positions,
  normals,
  uvs,
  indices,
  attrs,
  srcNode,
  texturesSpec,
}) {
  const targetIndexCount = targetTriangles * 3;
  const attrWeights =
    preserveFaceDetail && label === 'High'
      ? [0.75, 0.75, 0.75, 1.5, 1.5]
      : [0.45, 0.45, 0.45, 1.0, 1.0];
  const primaryErr = preserveFaceDetail && label === 'High' ? 0.025 : 0.04;
  const fallbackErr = preserveFaceDetail && label === 'High' ? 0.05 : 0.1;
  const primaryFlags = label === 'Lite' && vertexLock ? [] : ['LockBorder'];
  const fallbackFlags = label === 'Lite' && vertexLock ? ['Permissive'] : ['Permissive'];

  let [simplifiedIndices, simplifyErr] = MeshoptSimplifier.simplifyWithAttributes(
    indices,
    positions,
    3,
    attrs,
    5,
    attrWeights,
    vertexLock,
    targetIndexCount,
    primaryErr,
    primaryFlags
  );

  if (simplifiedIndices.length > maxAllowedTriangles * 3) {
    [simplifiedIndices, simplifyErr] = MeshoptSimplifier.simplifyWithAttributes(
      indices,
      positions,
      3,
      attrs,
      5,
      attrWeights,
      vertexLock,
      targetIndexCount,
      fallbackErr,
      fallbackFlags
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
          metallicFactor: 0.24,
          roughnessFactor: 0.62,
        }),
  };

  const material = {
    name: `SolarLeo_${assetId}_${label}_Material`,
    doubleSided: true,
    pbrMetallicRoughness,
    ...(texturesSpec.includePbrMaps && texIndexByRole.normal !== undefined
      ? { normalTexture: { index: texIndexByRole.normal } }
      : {}),
  };

  const outGltf = {
    asset: {
      version: '2.0',
      generator: `Aetherbow Solar Leo ${label} Pipeline (meshoptimizer)`,
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
        name: `SolarLeo_${assetId}_${label}`,
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
  fs.writeFileSync(outPath, finalGlb);

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

async function processAsset(asset) {
  buildThumbnailWebp(asset);

  const outDir = path.join(BASE_OUT_DIR, asset.subDir);
  const highPath = path.join(outDir, `${asset.baseName} High.glb`);
  const litePath = path.join(outDir, `${asset.baseName} Lite.glb`);

  const isHumanoid = asset.category === 'hero' || asset.category === 'skin';
  const liteOnlyFromHigh = LITE_FROM_HIGH && isHumanoid && fs.existsSync(highPath);
  const shouldForce = FORCE_ALL || (FORCE_HUMANOIDS && isHumanoid) || liteOnlyFromHigh;

  if (
    !shouldForce &&
    fs.existsSync(highPath) &&
    fs.existsSync(litePath) &&
    fs.statSync(highPath).size > 200_000 &&
    fs.statSync(litePath).size > 80_000
  ) {
    console.log(`[${asset.id}] High & Lite GLBs already built — skipping download.`);
    return;
  }

  const rawPath = liteOnlyFromHigh ? highPath : downloadRawGlb(asset);
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
    `\n=== [${asset.id}] Source ${(srcStat.size / (1024 * 1024)).toFixed(2)} MiB | ` +
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
  const mrImg = getImg(srcMat.pbrMetallicRoughness?.metallicRoughnessTexture);
  const normalImg = getImg(srcMat.normalTexture);

  const highEntries = [];
  const liteEntries = [];

  if (baseColorImg) {
    if (!liteOnlyFromHigh) {
      highEntries.push({
        role: 'albedo',
        name: `${asset.id}_high_albedo_${asset.highAlbedoSize}`,
        mimeType: 'image/jpeg',
        bytes: resizeImage(
          baseColorImg.bytes,
          baseColorImg.mimeType,
          asset.highAlbedoSize,
          'jpeg',
          isHumanoid ? 90 : 86
        ),
      });
    }
    liteEntries.push({
      role: 'albedo',
      name: `${asset.id}_lite_albedo_${asset.liteAlbedoSize}`,
      mimeType: 'image/jpeg',
      bytes: resizeImage(
        baseColorImg.bytes,
        baseColorImg.mimeType,
        asset.liteAlbedoSize,
        'jpeg',
        isHumanoid ? 84 : 82
      ),
    });
  }
  if (!liteOnlyFromHigh && mrImg) {
    highEntries.push({
      role: 'mr',
      name: `${asset.id}_high_mr_${asset.highDataSize}`,
      mimeType: 'image/jpeg',
      bytes: resizeImage(mrImg.bytes, mrImg.mimeType, asset.highDataSize, 'jpeg', 85),
    });
  }
  if (!liteOnlyFromHigh && normalImg) {
    highEntries.push({
      role: 'normal',
      name: `${asset.id}_high_normal_${asset.highDataSize}`,
      mimeType: 'image/png',
      bytes: resizeImage(normalImg.bytes, normalImg.mimeType, asset.highDataSize, 'png'),
    });
  }

  let faceLock = null;
  if (isHumanoid) {
    const builtMask = buildHumanoidFaceLockMask(positions, gltf.nodes?.[0]);
    faceLock = builtMask.lock;
    console.log(`[${asset.id}] Face vertex_lock protected ${builtMask.locked.toLocaleString()} head/face verts`);
  }

  if (!liteOnlyFromHigh) {
    buildVariant({
      assetId: asset.id,
      label: 'High',
      outPath: highPath,
      targetTriangles: asset.highTris,
      maxAllowedTriangles: asset.highMaxTris,
      preserveFaceDetail: isHumanoid,
      positions,
      normals,
      uvs,
      indices,
      attrs,
      srcNode: gltf.nodes?.[0],
      texturesSpec: {
        includePbrMaps: true,
        entries: highEntries,
      },
    });
  }

  buildVariant({
    assetId: asset.id,
    label: 'Lite',
    outPath: litePath,
    targetTriangles: asset.liteTris,
    maxAllowedTriangles: asset.liteMaxTris,
    preserveFaceDetail: isHumanoid,
    vertexLock: faceLock,
    positions,
    normals,
    uvs,
    indices,
    attrs,
    srcNode: gltf.nodes?.[0],
    texturesSpec: {
      includePbrMaps: false,
      entries: liteEntries,
    },
  });

  if (!liteOnlyFromHigh) {
    fs.rmSync(rawPath, { force: true });
  }
}

async function main() {
  await MeshoptSimplifier.ready;
  for (const asset of ASSETS) {
    await processAsset(asset);
  }
  fs.rmSync(RAW_TMP_DIR, { recursive: true, force: true });
  console.log('\nAll 10 Solar Leo assets (20 High/Lite GLBs + 10 WebP thumbnails) built cleanly!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

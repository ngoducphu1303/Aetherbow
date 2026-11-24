import fs from 'node:fs';
import path from 'node:path';

/**
 * Hardware compatibility profile aligned with Dell Latitude E5430
 * (Intel Core i7-3520M / 4 threads, Intel HD Graphics 4000, ~512 MB shared WebGL VRAM,
 * WebGL maxTextureSize capped at 1024px in Lite mode per src/engine/aaaVisualPipeline.ts).
 */
export const DELL_E5430_LITE_PROFILE = Object.freeze({
  deviceLabel: 'Dell Latitude E5430 (Intel HD Graphics 4000 · ~512 MB shared VRAM)',
  maxTextureSize: 1024,
  maxMobTextureSize: 512,
  maxMaterials: 1,
  maxImages: 1,
  maxVerticesUint16: 65_535,
  allowExtensions: false,
  allowedMimeTypes: Object.freeze(['image/jpeg', 'image/png']),
  maxPackBytes: 8 * 1024 * 1024, // 8 MiB across all 14 Lite GLBs
  maxPackVramMb: 96, // Uncompressed RGBA+mipmap textures + geometry across full Ch.3 cast
});

export const HIGH_QUALITY_PROFILE = Object.freeze({
  deviceLabel: 'Desktop / Dedicated GPU (High PBR Tier)',
  maxTextureSize: 2048,
  maxMaterials: 1,
  maxImages: 3, // Albedo + MetallicRoughness + Normal
  maxVerticesUint16: 65_535,
  allowExtensions: false,
  allowedMimeTypes: Object.freeze(['image/jpeg', 'image/png']),
  maxPackBytes: 32 * 1024 * 1024, // 32 MiB across all 14 High GLBs
  maxPackVramMb: 256,
});

export const CHAPTER3_RUNTIME_REL_DIR = 'public/assets/Chương 3/Runtime';

export const CHAPTER3_ASSET_SPECS = Object.freeze([
  {
    id: 'taurus-arena',
    role: 'arena',
    match: 'dau_truong_thanh_dia_ngoc_luc_bao.glb',
    highTris: 60_000,
    highMaxTris: 81_000,
    liteTris: 28_000,
    liteMaxTris: 37_800,
    highAlbedo: 1536,
    highDataSize: 512,
    liteAlbedo: 1024,
    highMaxBytes: 4.5 * 1024 * 1024,
    liteMaxBytes: 2.2 * 1024 * 1024,
    isArena: true,
  },
  {
    id: 'dia-than-kim-nguu',
    role: 'boss',
    match: 'boss_chinh_dia_than_kim_nguu.glb',
    highTris: 24_000,
    highMaxTris: 32_400,
    liteTris: 9_000,
    liteMaxTris: 12_150,
    highAlbedo: 1536,
    highDataSize: 512,
    liteAlbedo: 1024,
    highMaxBytes: 3.0 * 1024 * 1024,
    liteMaxBytes: 900 * 1024,
  },
  {
    id: 'ngoc-nguu-duc-thu',
    role: 'subboss',
    match: 'boss_phu_ngoc_nguu_duc_thu.glb',
    highTris: 20_000,
    highMaxTris: 27_000,
    liteTris: 7_000,
    liteMaxTris: 9_450,
    highAlbedo: 1536,
    highDataSize: 512,
    liteAlbedo: 1024,
    highMaxBytes: 3.0 * 1024 * 1024,
    liteMaxBytes: 900 * 1024,
  },
  {
    id: 'nguu-ngoc-xung-kich',
    role: 'mob',
    match: 'quai_01_nguu_ngoc_xung_kich.glb',
    highTris: 12_000,
    highMaxTris: 16_200,
    liteTris: 4_800,
    liteMaxTris: 6_480,
    highAlbedo: 1024,
    highDataSize: 512,
    liteAlbedo: 512,
    highMaxBytes: 1.8 * 1024 * 1024,
    liteMaxBytes: 450 * 1024,
  },
  {
    id: 've-binh-ngoc-luc-bao',
    role: 'mob',
    match: 'quai_02_ve_binh_ngoc_luc_bao.glb',
    highTris: 12_000,
    highMaxTris: 16_200,
    liteTris: 4_800,
    liteMaxTris: 6_480,
    highAlbedo: 1024,
    highDataSize: 512,
    liteAlbedo: 512,
    highMaxBytes: 1.8 * 1024 * 1024,
    liteMaxBytes: 450 * 1024,
  },
  {
    id: 'linh-hon-luc-bao',
    role: 'mob',
    match: 'quai_03_linh_hon_luc_bao.glb',
    highTris: 12_000,
    highMaxTris: 16_200,
    liteTris: 4_800,
    liteMaxTris: 6_480,
    highAlbedo: 1024,
    highDataSize: 512,
    liteAlbedo: 512,
    highMaxBytes: 1.8 * 1024 * 1024,
    liteMaxBytes: 450 * 1024,
  },
  {
    id: 'chien-binh-kich-luc-bao',
    role: 'mob',
    match: 'quai_04_chien_binh_kich_luc_bao.glb',
    highTris: 12_000,
    highMaxTris: 16_200,
    liteTris: 4_800,
    liteMaxTris: 6_480,
    highAlbedo: 1024,
    highDataSize: 512,
    liteAlbedo: 512,
    highMaxBytes: 1.8 * 1024 * 1024,
    liteMaxBytes: 450 * 1024,
  },
  {
    id: 'sylvia',
    role: 'hero',
    match: 'nu_chinh_thanh_nu_luc_bao.glb',
    highTris: 25_000,
    highMaxTris: 33_750,
    liteTris: 9_000,
    liteMaxTris: 12_150,
    highAlbedo: 1536,
    highDataSize: 512,
    liteAlbedo: 1024,
    highMaxBytes: 3.0 * 1024 * 1024,
    liteMaxBytes: 900 * 1024,
  },
  {
    id: 'venus-incarnate',
    role: 'skin',
    match: 'skin_01_thanh_y_hoa_than_kim_tinh.glb',
    highTris: 25_000,
    highMaxTris: 33_750,
    liteTris: 9_000,
    liteMaxTris: 12_150,
    highAlbedo: 1536,
    highDataSize: 512,
    liteAlbedo: 1024,
    highMaxBytes: 3.0 * 1024 * 1024,
    liteMaxBytes: 900 * 1024,
  },
  {
    id: 'jade-calf',
    role: 'companion',
    match: 'tinh_linh_tieu_nguu_ngoc_bich.glb',
    highTris: 11_000,
    highMaxTris: 14_850,
    liteTris: 4_500,
    liteMaxTris: 6_075,
    highAlbedo: 1024,
    highDataSize: 512,
    liteAlbedo: 512,
    highMaxBytes: 1.8 * 1024 * 1024,
    liteMaxBytes: 450 * 1024,
  },
  {
    id: 'jade-bull',
    role: 'mount',
    match: 'thu_cuoi_chien_nguu_ngoc_bich.glb',
    highTris: 20_000,
    highMaxTris: 27_000,
    liteTris: 7_500,
    liteMaxTris: 10_125,
    highAlbedo: 1536,
    highDataSize: 512,
    liteAlbedo: 1024,
    highMaxBytes: 2.8 * 1024 * 1024,
    liteMaxBytes: 850 * 1024,
  },
  {
    id: 'emerald-taurus-wings',
    role: 'accessory',
    match: 'canh_luc_bao_kim_nguu_duc.glb',
    highTris: 11_000,
    highMaxTris: 14_850,
    liteTris: 4_500,
    liteMaxTris: 6_075,
    highAlbedo: 1024,
    highDataSize: 512,
    liteAlbedo: 512,
    highMaxBytes: 1.8 * 1024 * 1024,
    liteMaxBytes: 450 * 1024,
  },
  {
    id: 'jade-heart-relic',
    role: 'accessory',
    match: 'thanh_khi_tam_ngoc_kim_nguu.glb',
    highTris: 10_000,
    highMaxTris: 13_500,
    liteTris: 4_000,
    liteMaxTris: 5_400,
    highAlbedo: 1024,
    highDataSize: 512,
    liteAlbedo: 512,
    highMaxBytes: 1.6 * 1024 * 1024,
    liteMaxBytes: 450 * 1024,
  },
  {
    id: 'emerald-taurus-halo',
    role: 'accessory',
    match: 'hao_quang_phap_tran_luc_bao_kim_nguu.glb',
    highTris: 10_000,
    highMaxTris: 13_500,
    liteTris: 4_000,
    liteMaxTris: 5_400,
    highAlbedo: 1024,
    highDataSize: 512,
    liteAlbedo: 512,
    highMaxBytes: 1.6 * 1024 * 1024,
    liteMaxBytes: 450 * 1024,
  },
]);

export function parseImageDimensions(buf, mimeType) {
  if (!buf || buf.length < 16) return { width: 0, height: 0 };

  if (
    mimeType === 'image/png' ||
    (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47)
  ) {
    if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47) {
      return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
    }
  }

  if (
    mimeType === 'image/jpeg' ||
    mimeType === 'image/jpg' ||
    (buf[0] === 0xff && buf[1] === 0xd8)
  ) {
    if (buf[0] === 0xff && buf[1] === 0xd8) {
      let i = 2;
      while (i + 9 < buf.length) {
        if (buf[i] !== 0xff) {
          i += 1;
          continue;
        }
        while (i < buf.length && buf[i] === 0xff) i += 1;
        if (i >= buf.length) break;
        const marker = buf[i];
        i += 1;
        if (marker === 0xd8 || marker === 0xd9 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
          continue;
        }
        if (i + 2 > buf.length) break;
        const segLen = buf.readUInt16BE(i);
        if (segLen < 2 || i + segLen > buf.length) break;
        const isSof =
          (marker >= 0xc0 && marker <= 0xc3) ||
          (marker >= 0xc5 && marker <= 0xc7) ||
          (marker >= 0xc9 && marker <= 0xcb) ||
          (marker >= 0xcd && marker <= 0xcf);
        if (isSof && segLen >= 7) {
          return {
            height: buf.readUInt16BE(i + 3),
            width: buf.readUInt16BE(i + 5),
          };
        }
        i += segLen;
      }
    }
  }

  return { width: 0, height: 0 };
}

function applyQuat(v, q) {
  const [vx, vy, vz] = v;
  const [qx, qy, qz, qw] = q;
  const ix = qw * vx + qy * vz - qz * vy;
  const iy = qw * vy + qz * vx - qx * vz;
  const iz = qw * vz + qx * vy - qy * vx;
  const iw = -qx * vx - qy * vy - qz * vz;
  return [
    ix * qw + iw * -qx + iy * -qz - iz * -qy,
    iy * qw + iw * -qy + iz * -qx - ix * -qz,
    iz * qw + iw * -qz + ix * -qy - iy * -qx,
  ];
}

export function inspectGlbBuffer(buf, options = {}) {
  const { includeBounds = false, isArena = false } = options;
  if (!Buffer.isBuffer(buf) || buf.length < 28) {
    return { valid: false, error: 'GLB buffer too small (< 28 bytes)' };
  }

  const magic = buf.readUInt32LE(0);
  const version = buf.readUInt32LE(4);
  const declaredByteLength = buf.readUInt32LE(8);
  if (magic !== 0x46546c67) {
    return { valid: false, error: `Invalid GLB magic 0x${magic.toString(16)}` };
  }
  if (version !== 2) {
    return { valid: false, error: `Unsupported glTF version ${version}` };
  }
  if (declaredByteLength !== buf.length) {
    return {
      valid: false,
      error: `GLB length mismatch (header=${declaredByteLength}, actual=${buf.length})`,
    };
  }

  const jsonLen = buf.readUInt32LE(12);
  const jsonType = buf.readUInt32LE(16);
  if (jsonType !== 0x4e4f534a || 20 + jsonLen > buf.length) {
    return { valid: false, error: 'Invalid or truncated GLB JSON chunk' };
  }

  let gltf;
  try {
    gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  } catch (err) {
    return { valid: false, error: `Malformed GLB JSON: ${err.message}` };
  }

  const binOffset = 20 + jsonLen;
  let bin = Buffer.alloc(0);
  if (binOffset + 8 <= buf.length) {
    const binLen = buf.readUInt32LE(binOffset);
    const binType = buf.readUInt32LE(binOffset + 4);
    if (binType === 0x004e4942 && binOffset + 8 + binLen <= buf.length) {
      bin = buf.subarray(binOffset + 8, binOffset + 8 + binLen);
    }
  }

  let vertexCount = 0;
  let triangleCount = 0;
  let usesUint32Indices = false;
  let primitiveCount = 0;

  for (const mesh of gltf.meshes || []) {
    for (const prim of mesh.primitives || []) {
      primitiveCount += 1;
      const posAcc = prim.attributes?.POSITION !== undefined ? gltf.accessors?.[prim.attributes.POSITION] : null;
      if (posAcc) vertexCount += posAcc.count;
      if (prim.indices !== undefined) {
        const idxAcc = gltf.accessors?.[prim.indices];
        if (idxAcc) {
          triangleCount += Math.floor(idxAcc.count / 3);
          if (idxAcc.componentType === 5125) usesUint32Indices = true;
        }
      } else if (posAcc) {
        triangleCount += Math.floor(posAcc.count / 3);
      }
    }
  }

  const images = [];
  let maxTextureDimension = 0;
  let textureVramBytes = 0;

  for (const img of gltf.images || []) {
    const mimeType = img.mimeType || 'unknown';
    let dims = { width: 0, height: 0 };
    let byteLength = 0;
    if (img.bufferView !== undefined && gltf.bufferViews?.[img.bufferView]) {
      const bv = gltf.bufferViews[img.bufferView];
      const start = bv.byteOffset || 0;
      byteLength = bv.byteLength || 0;
      if (start + byteLength <= bin.length) {
        dims = parseImageDimensions(bin.subarray(start, start + byteLength), mimeType);
      }
    }
    const maxDim = Math.max(dims.width, dims.height);
    if (maxDim > maxTextureDimension) maxTextureDimension = maxDim;
    // Uncompressed RGBA8 + ~33% mipmap chain on GPU
    const gpuBytes = dims.width > 0 && dims.height > 0 ? Math.round(dims.width * dims.height * 4 * (4 / 3)) : 0;
    textureVramBytes += gpuBytes;
    images.push({
      name: img.name || null,
      mimeType,
      width: dims.width,
      height: dims.height,
      byteLength,
      estimatedGpuBytes: gpuBytes,
    });
  }

  // Position (12B) + Normal (12B) + UV (8B) = 32B/vertex + index buffer (2B or 4B per index)
  const indexBytesPerElem = usesUint32Indices ? 4 : 2;
  const geometryVramBytes = vertexCount * 32 + triangleCount * 3 * indexBytesPerElem;
  const estimatedVramBytes = textureVramBytes + geometryVramBytes;
  const estimatedVramMb = Number((estimatedVramBytes / (1024 * 1024)).toFixed(2));

  const result = {
    valid: true,
    bytes: buf.length,
    generator: gltf.asset?.generator || null,
    meshCount: gltf.meshes?.length ?? 0,
    primitiveCount,
    materialCount: gltf.materials?.length ?? 0,
    imageCount: images.length,
    vertexCount,
    triangleCount,
    usesUint32Indices,
    extensionsRequired: gltf.extensionsRequired || [],
    extensionsUsed: gltf.extensionsUsed || [],
    maxTextureDimension,
    images,
    estimatedVramBytes,
    estimatedVramMb,
  };

  if (includeBounds && gltf.meshes?.[0]?.primitives?.[0]) {
    const node = gltf.nodes?.[0] || {};
    const q = node.rotation || [0, 0, 0, 1];
    const t = node.translation || [0, 0, 0];
    const s = node.scale || [1, 1, 1];
    const prim = gltf.meshes[0].primitives[0];
    const acc = gltf.accessors?.[prim.attributes?.POSITION];
    const bv = acc ? gltf.bufferViews?.[acc.bufferView] : null;
    if (acc && bv) {
      const offset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
      const dv = new DataView(bin.buffer, bin.byteOffset + offset, acc.count * 12);
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      const worldPts = isArena ? new Float32Array(acc.count * 3) : null;

      for (let i = 0; i < acc.count; i++) {
        const x = dv.getFloat32(i * 12, true) * s[0];
        const y = dv.getFloat32(i * 12 + 4, true) * s[1];
        const z = dv.getFloat32(i * 12 + 8, true) * s[2];
        const [rx, ry, rz] = applyQuat([x, y, z], q);
        const wx = rx + t[0];
        const wy = ry + t[1];
        const wz = rz + t[2];
        if (wx < min[0]) min[0] = wx;
        if (wy < min[1]) min[1] = wy;
        if (wz < min[2]) min[2] = wz;
        if (wx > max[0]) max[0] = wx;
        if (wy > max[1]) max[1] = wy;
        if (wz > max[2]) max[2] = wz;
        if (worldPts) {
          worldPts[i * 3] = wx;
          worldPts[i * 3 + 1] = wy;
          worldPts[i * 3 + 2] = wz;
        }
      }

      const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
      const center = [(min[0] + max[0]) / 2, (min[1] + max[1]) / 2, (min[2] + max[2]) / 2];
      const bounds = {
        nodeRotation: node.rotation || null,
        min: min.map((v) => Number(v.toFixed(4))),
        max: max.map((v) => Number(v.toFixed(4))),
        size: size.map((v) => Number(v.toFixed(4))),
        center: center.map((v) => Number(v.toFixed(4))),
      };

      if (isArena && worldPts) {
        const radialBuckets = [];
        const maxR = Math.min(size[0], size[2]) * 0.5;
        for (let b = 0; b < 10; b++) {
          const r0 = (b / 10) * maxR;
          const r1 = ((b + 1) / 10) * maxR;
          const ys = [];
          for (let i = 0; i < acc.count; i++) {
            const dx = worldPts[i * 3] - center[0];
            const dz = worldPts[i * 3 + 2] - center[2];
            const r = Math.hypot(dx, dz);
            if (r >= r0 && r < r1) ys.push(worldPts[i * 3 + 1]);
          }
          ys.sort((a, b2) => a - b2);
          const q50 = ys.length ? ys[Math.floor(ys.length * 0.5)] : null;
          const q90 = ys.length ? ys[Math.floor(ys.length * 0.9)] : null;
          const q95 = ys.length ? ys[Math.floor(ys.length * 0.95)] : null;
          const q99 = ys.length ? ys[Math.floor(ys.length * 0.99)] : null;
          radialBuckets.push({
            rRange: `${r0.toFixed(3)}..${r1.toFixed(3)}`,
            count: ys.length,
            p50: q50 !== null ? Number(q50.toFixed(4)) : null,
            p90: q90 !== null ? Number(q90.toFixed(4)) : null,
            p95: q95 !== null ? Number(q95.toFixed(4)) : null,
            p99: q99 !== null ? Number(q99.toFixed(4)) : null,
          });
        }
        bounds.radialBuckets = radialBuckets;
      }

      result.bounds = bounds;
    }
  }

  return result;
}

export function inspectGlbFile(filePath, options = {}) {
  if (!fs.existsSync(filePath)) {
    return { valid: false, error: `File not found: ${filePath}` };
  }
  return inspectGlbBuffer(fs.readFileSync(filePath), options);
}

export function validateAssetVariant(spec, tier, metrics) {
  const isLite = tier === 'lite';
  const profile = isLite ? DELL_E5430_LITE_PROFILE : HIGH_QUALITY_PROFILE;
  const violations = [];
  const warnings = [];

  if (!metrics || !metrics.valid) {
    return {
      ok: false,
      tier,
      id: spec.id,
      violations: [metrics?.error || 'Invalid GLB binary'],
      warnings,
    };
  }

  if (!profile.allowExtensions) {
    if (metrics.extensionsRequired.length > 0) {
      violations.push(
        `extensionsRequired must be empty for native WebGL/E5430 compatibility (found: ${metrics.extensionsRequired.join(', ')})`
      );
    }
    if (metrics.extensionsUsed.length > 0) {
      violations.push(
        `extensionsUsed must be empty for zero-decoder runtime loading (found: ${metrics.extensionsUsed.join(', ')})`
      );
    }
  }

  if (metrics.materialCount > profile.maxMaterials) {
    violations.push(
      `materialCount=${metrics.materialCount} exceeds ${tier} budget (max ${profile.maxMaterials})`
    );
  }

  if (metrics.imageCount > profile.maxImages) {
    violations.push(
      `imageCount=${metrics.imageCount} exceeds ${tier} budget (max ${profile.maxImages})`
    );
  }

  if (metrics.vertexCount > profile.maxVerticesUint16 || metrics.usesUint32Indices) {
    violations.push(
      `vertexCount=${metrics.vertexCount} / Uint32 indices exceeds 16-bit index safety ceiling (${profile.maxVerticesUint16} verts)`
    );
  }

  const maxTris = isLite ? spec.liteMaxTris : spec.highMaxTris;
  if (metrics.triangleCount > maxTris) {
    violations.push(
      `triangleCount=${metrics.triangleCount} exceeds ${tier} ceiling (${maxTris})`
    );
  }
  if (metrics.triangleCount <= 0) {
    violations.push('triangleCount must be > 0');
  }

  const maxBytes = isLite ? spec.liteMaxBytes : spec.highMaxBytes;
  if (metrics.bytes > maxBytes) {
    violations.push(
      `fileSize=${(metrics.bytes / 1024).toFixed(0)}KB exceeds ${tier} budget (${(maxBytes / 1024).toFixed(0)}KB)`
    );
  }

  const maxTexDim = Math.min(profile.maxTextureSize, isLite ? spec.liteAlbedo : spec.highAlbedo);
  if (metrics.maxTextureDimension > maxTexDim) {
    violations.push(
      `maxTextureDimension=${metrics.maxTextureDimension}px exceeds ${tier} ceiling (${maxTexDim}px)`
    );
  }

  for (const img of metrics.images) {
    if (!profile.allowedMimeTypes.includes(img.mimeType)) {
      violations.push(`Unsupported embedded image MIME type: ${img.mimeType}`);
    }
    if (img.width === 0 || img.height === 0) {
      warnings.push(`Could not decode pixel dimensions for embedded image (${img.mimeType})`);
    }
  }

  return {
    ok: violations.length === 0,
    tier,
    id: spec.id,
    violations,
    warnings,
  };
}

export function validateChapter3Pack(variantEntries, tierFilter = 'both') {
  const violations = [];
  let totalLiteBytes = 0;
  let totalLiteVramMb = 0;
  let totalHighBytes = 0;
  let totalHighVramMb = 0;
  let liteCount = 0;
  let highCount = 0;

  for (const entry of variantEntries) {
    if (!entry.validation.ok) {
      for (const v of entry.validation.violations) {
        violations.push(`[${entry.id}:${entry.tier}] ${v}`);
      }
    }
    if (entry.metrics?.valid) {
      if (entry.tier === 'lite') {
        liteCount += 1;
        totalLiteBytes += entry.metrics.bytes;
        totalLiteVramMb += entry.metrics.estimatedVramMb;
      } else {
        highCount += 1;
        totalHighBytes += entry.metrics.bytes;
        totalHighVramMb += entry.metrics.estimatedVramMb;
      }
    }
  }

  if (tierFilter === 'both' || tierFilter === 'lite') {
    if (totalLiteBytes > DELL_E5430_LITE_PROFILE.maxPackBytes) {
      violations.push(
        `Total Lite pack size ${(totalLiteBytes / (1024 * 1024)).toFixed(2)} MiB exceeds Dell E5430 budget (${(DELL_E5430_LITE_PROFILE.maxPackBytes / (1024 * 1024)).toFixed(2)} MiB)`
      );
    }
    if (totalLiteVramMb > DELL_E5430_LITE_PROFILE.maxPackVramMb) {
      violations.push(
        `Total Lite GPU VRAM ${totalLiteVramMb.toFixed(2)} MB exceeds Dell E5430 budget (${DELL_E5430_LITE_PROFILE.maxPackVramMb} MB)`
      );
    }
  }

  if (tierFilter === 'both' || tierFilter === 'high') {
    if (totalHighBytes > HIGH_QUALITY_PROFILE.maxPackBytes) {
      violations.push(
        `Total High pack size ${(totalHighBytes / (1024 * 1024)).toFixed(2)} MiB exceeds High budget (${(HIGH_QUALITY_PROFILE.maxPackBytes / (1024 * 1024)).toFixed(2)} MiB)`
      );
    }
  }

  return {
    ok: violations.length === 0,
    violations,
    totals: {
      liteCount,
      highCount,
      totalLiteBytes,
      totalLiteMiB: Number((totalLiteBytes / (1024 * 1024)).toFixed(2)),
      totalLiteVramMb: Number(totalLiteVramMb.toFixed(2)),
      totalHighBytes,
      totalHighMiB: Number((totalHighBytes / (1024 * 1024)).toFixed(2)),
      totalHighVramMb: Number(totalHighVramMb.toFixed(2)),
    },
  };
}

export function syncChapter3ManifestEntries(manifestObj, fileEntries) {
  const byPath = new Map(
    (manifestObj.files || []).map((entry) => [entry.path, { ...entry }])
  );
  let updated = 0;
  let inserted = 0;

  for (const item of fileEntries) {
    const normalizedPath = item.path.replace(/\\/g, '/');
    const existing = byPath.get(normalizedPath);
    if (existing) {
      if (existing.size !== item.size || existing.runtime !== true) {
        existing.size = item.size;
        existing.runtime = true;
        updated += 1;
      }
    } else {
      byPath.set(normalizedPath, {
        path: normalizedPath,
        size: item.size,
        runtime: true,
      });
      inserted += 1;
    }
  }

  const files = Array.from(byPath.values()).sort((a, b) =>
    a.path.localeCompare(b.path, 'en')
  );

  return {
    manifest: {
      ...manifestObj,
      files,
    },
    updated,
    inserted,
  };
}

export function parseCliArgs(argv) {
  const options = {
    verifyOnly: false,
    dryRun: false,
    tier: 'both',
    sourceDir: null,
    outDir: path.resolve(process.cwd(), CHAPTER3_RUNTIME_REL_DIR),
    reportPath: '/tmp/ch3-geometry-report.json',
    updateManifest: false,
    keepRaw: false,
    help: false,
    ids: [],
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--verify' || arg === '--check') {
      options.verifyOnly = true;
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--update-manifest') {
      options.updateManifest = true;
    } else if (arg === '--keep-raw') {
      options.keepRaw = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--tier') {
      const value = argv[i + 1];
      if (!value || !['both', 'high', 'lite'].includes(value)) {
        throw new Error(`Invalid --tier value "${value ?? ''}". Expected: both | high | lite.`);
      }
      options.tier = value;
      i += 1;
    } else if (arg === '--source-dir') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('Missing path after --source-dir.');
      options.sourceDir = path.resolve(process.cwd(), value);
      i += 1;
    } else if (arg === '--out-dir') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('Missing path after --out-dir.');
      options.outDir = path.resolve(process.cwd(), value);
      i += 1;
    } else if (arg === '--report') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('Missing path after --report.');
      options.reportPath = path.resolve(process.cwd(), value);
      i += 1;
    } else if (arg === '--only') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('Missing asset ID(s) after --only.');
      for (const id of value.split(',').map((s) => s.trim()).filter(Boolean)) {
        options.ids.push(id);
      }
      i += 1;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      options.ids.push(arg);
    }
  }

  return options;
}

export function resolveSelectedSpecs(ids) {
  if (!ids || ids.length === 0) return [...CHAPTER3_ASSET_SPECS];
  const known = new Map(CHAPTER3_ASSET_SPECS.map((s) => [s.id, s]));
  const selected = [];
  for (const id of ids) {
    const spec = known.get(id);
    if (!spec) {
      throw new Error(
        `Unknown Chapter 3 asset ID "${id}". Valid IDs: ${CHAPTER3_ASSET_SPECS.map((s) => s.id).join(', ')}`
      );
    }
    if (!selected.includes(spec)) selected.push(spec);
  }
  return selected;
}

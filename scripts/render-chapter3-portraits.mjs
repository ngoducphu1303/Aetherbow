import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const RUNTIME_DIR = path.resolve(process.cwd(), 'public/assets/Chương 3/Runtime');
const CHECK_DIR = '/tmp/ch3-facing-check';

/**
 * Per-asset camera framing overrides (degrees).
 * yawDeg rotates the model around Y before projecting onto the +Z camera.
 * framing: 'portrait' focuses upper 72% for tall humanoids, 'full' fits entire bounding box.
 */
const ASSET_CAMERA = {
  'taurus-arena': { yawDeg: 25, pitchDeg: 34, zoom: 1.08, framing: 'full', bgInner: [22, 54, 38], bgOuter: [6, 15, 11] },
  'dia-than-kim-nguu': { yawDeg: 14, pitchDeg: 8, zoom: 1.12, framing: 'full', bgInner: [24, 58, 36], bgOuter: [7, 14, 10] },
  'ngoc-nguu-duc-thu': { yawDeg: -22, pitchDeg: 10, zoom: 1.12, framing: 'full', bgInner: [22, 56, 38], bgOuter: [6, 14, 11] },
  'nguu-ngoc-xung-kich': { yawDeg: 34, pitchDeg: 10, zoom: 1.12, framing: 'full', bgInner: [26, 54, 34], bgOuter: [8, 15, 10] },
  've-binh-ngoc-luc-bao': { yawDeg: 16, pitchDeg: 8, zoom: 1.12, framing: 'full', bgInner: [20, 52, 38], bgOuter: [6, 13, 10] },
  'linh-hon-luc-bao': { yawDeg: 14, pitchDeg: 8, zoom: 1.12, framing: 'full', bgInner: [16, 62, 46], bgOuter: [5, 16, 14] },
  'chien-binh-kich-luc-bao': { yawDeg: 16, pitchDeg: 8, zoom: 1.10, framing: 'full', bgInner: [24, 54, 34], bgOuter: [7, 14, 10] },
  'sylvia': { yawDeg: 10, pitchDeg: 6, zoom: 1.18, framing: 'portrait', bgInner: [22, 62, 44], bgOuter: [7, 17, 14] },
  'venus-incarnate': { yawDeg: 10, pitchDeg: 6, zoom: 1.18, framing: 'portrait', bgInner: [38, 60, 34], bgOuter: [11, 16, 10] },
  'jade-calf': { yawDeg: 18, pitchDeg: 10, zoom: 1.12, framing: 'full', bgInner: [20, 64, 48], bgOuter: [6, 16, 14] },
  'jade-bull': { yawDeg: 62, pitchDeg: 10, zoom: 1.12, framing: 'full', bgInner: [22, 58, 38], bgOuter: [6, 14, 10] },
  'emerald-taurus-wings': { yawDeg: 8, pitchDeg: 6, zoom: 1.10, framing: 'full', bgInner: [18, 58, 44], bgOuter: [5, 15, 12] },
  'jade-heart-relic': { yawDeg: 14, pitchDeg: 10, zoom: 1.14, framing: 'full', bgInner: [26, 60, 42], bgOuter: [7, 15, 12] },
  'emerald-taurus-halo': { yawDeg: 6, pitchDeg: 6, zoom: 1.10, framing: 'full', bgInner: [24, 62, 42], bgOuter: [6, 15, 11] },
};

function applyQuat(vx, vy, vz, q) {
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

function readAccessorFloat32(gltf, bin, accIdx) {
  const acc = gltf.accessors[accIdx];
  const bv = gltf.bufferViews[acc.bufferView];
  const comps = acc.type === 'VEC2' ? 2 : acc.type === 'VEC3' ? 3 : 4;
  const offset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const stride = bv.byteStride || comps * 4;
  const out = new Float32Array(acc.count * comps);
  const dv = new DataView(bin.buffer, bin.byteOffset + offset, acc.count * stride);
  for (let i = 0; i < acc.count; i++) {
    for (let c = 0; c < comps; c++) {
      out[i * comps + c] = dv.getFloat32(i * stride + c * 4, true);
    }
  }
  return out;
}

function readIndices(gltf, bin, accIdx) {
  const acc = gltf.accessors[accIdx];
  const bv = gltf.bufferViews[acc.bufferView];
  const offset = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const out = new Uint32Array(acc.count);
  const dv = new DataView(bin.buffer, bin.byteOffset + offset);
  if (acc.componentType === 5125) {
    for (let i = 0; i < acc.count; i++) out[i] = dv.getUint32(i * 4, true);
  } else if (acc.componentType === 5123) {
    for (let i = 0; i < acc.count; i++) out[i] = dv.getUint16(i * 2, true);
  } else {
    for (let i = 0; i < acc.count; i++) out[i] = dv.getUint8(i);
  }
  return out;
}

function loadGlbMeshAndTexture(glbPath) {
  const buf = fs.readFileSync(glbPath);
  const jsonLen = buf.readUInt32LE(12);
  const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString('utf8'));
  const binOffset = 20 + jsonLen;
  const binLen = buf.readUInt32LE(binOffset);
  const bin = buf.subarray(binOffset + 8, binOffset + 8 + binLen);

  const node = gltf.nodes?.[0] || {};
  const q = node.rotation || [0, 0, 0, 1];
  const t = node.translation || [0, 0, 0];
  const s = node.scale || [1, 1, 1];

  const prim = gltf.meshes[0].primitives[0];
  const rawPos = readAccessorFloat32(gltf, bin, prim.attributes.POSITION);
  const rawNorm = readAccessorFloat32(gltf, bin, prim.attributes.NORMAL);
  const uvs = readAccessorFloat32(gltf, bin, prim.attributes.TEXCOORD_0);
  const indices = readIndices(gltf, bin, prim.indices);
  const vCount = rawPos.length / 3;

  const pos = new Float32Array(vCount * 3);
  const norm = new Float32Array(vCount * 3);
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (let i = 0; i < vCount; i++) {
    const [rx, ry, rz] = applyQuat(rawPos[i * 3] * s[0], rawPos[i * 3 + 1] * s[1], rawPos[i * 3 + 2] * s[2], q);
    const wx = rx + t[0];
    const wy = ry + t[1];
    const wz = rz + t[2];
    pos[i * 3] = wx;
    pos[i * 3 + 1] = wy;
    pos[i * 3 + 2] = wz;
    if (wx < minX) minX = wx; if (wx > maxX) maxX = wx;
    if (wy < minY) minY = wy; if (wy > maxY) maxY = wy;
    if (wz < minZ) minZ = wz; if (wz > maxZ) maxZ = wz;

    const [nx, ny, nz] = applyQuat(rawNorm[i * 3], rawNorm[i * 3 + 1], rawNorm[i * 3 + 2], q);
    const nLen = Math.hypot(nx, ny, nz) || 1;
    norm[i * 3] = nx / nLen;
    norm[i * 3 + 1] = ny / nLen;
    norm[i * 3 + 2] = nz / nLen;
  }

  // Decode baseColor image to 512x512 raw RGB via ImageMagick
  const mat = gltf.materials?.[prim.material ?? 0] || gltf.materials?.[0] || {};
  const texIdx = mat.pbrMetallicRoughness?.baseColorTexture?.index;
  const imgIdx = texIdx !== undefined ? gltf.textures?.[texIdx]?.source : undefined;
  let texRgb = null;
  const texSize = 1024;
  if (imgIdx !== undefined) {
    const imgDef = gltf.images[imgIdx];
    const bv = gltf.bufferViews[imgDef.bufferView];
    const imgBytes = bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength);
    const prefix = imgDef.mimeType?.includes('jpeg') ? 'jpg:-' : 'png:-';
    texRgb = execFileSync(
      '/usr/bin/convert',
      [prefix, '-resize', `${texSize}x${texSize}!`, '-depth', '8', 'rgb:-'],
      { input: imgBytes, maxBuffer: 16 * 1024 * 1024 }
    );
  }

  return {
    pos,
    norm,
    uvs,
    indices,
    vCount,
    bounds: { minX, minY, minZ, maxX, maxY, maxZ },
    texRgb,
    texSize,
  };
}

function renderPortrait(mesh, opts, width = 768, height = 768) {
  const { pos, norm, uvs, indices, vCount, bounds, texRgb, texSize } = mesh;
  const cx = (bounds.minX + bounds.maxX) * 0.5;
  const cy = (bounds.minY + bounds.maxY) * 0.5;
  const cz = (bounds.minZ + bounds.maxZ) * 0.5;
  const sx = bounds.maxX - bounds.minX;
  const sy = bounds.maxY - bounds.minY;
  const sz = bounds.maxZ - bounds.minZ;

  // Frame target: upper-body focus for portrait mode, full center otherwise
  const targetY = opts.framing === 'portrait' ? bounds.minY + sy * 0.62 : cy;
  const yaw = (opts.yawDeg * Math.PI) / 180;
  const pitch = (opts.pitchDeg * Math.PI) / 180;
  const cyaw = Math.cos(yaw), syaw = Math.sin(yaw);
  const cp = Math.cos(pitch), sp = Math.sin(pitch);

  // Transform all vertices into camera view space (camera at +Z looking toward origin)
  const vx = new Float32Array(vCount);
  const vy = new Float32Array(vCount);
  const vz = new Float32Array(vCount);
  const vnx = new Float32Array(vCount);
  const vny = new Float32Array(vCount);
  const vnz = new Float32Array(vCount);

  let maxSpan = 0.001;
  for (let i = 0; i < vCount; i++) {
    const px = pos[i * 3] - cx;
    const py = pos[i * 3 + 1] - targetY;
    const pz = pos[i * 3 + 2] - cz;

    // Rotate Y (yaw), then X (pitch)
    const x1 = px * cyaw + pz * syaw;
    const z1 = -px * syaw + pz * cyaw;
    const y2 = py * cp - z1 * sp;
    const z2 = py * sp + z1 * cp;

    vx[i] = x1;
    vy[i] = y2;
    vz[i] = z2;

    if (opts.framing === 'portrait') {
      // Measure span using upper 68% of height so heroine face & torso fill the frame
      if (pos[i * 3 + 1] >= bounds.minY + sy * 0.28) {
        const a = Math.max(Math.abs(x1), Math.abs(y2));
        if (a > maxSpan) maxSpan = a;
      }
    } else {
      const a = Math.max(Math.abs(x1), Math.abs(y2));
      if (a > maxSpan) maxSpan = a;
    }

    const nx = norm[i * 3], ny = norm[i * 3 + 1], nz = norm[i * 3 + 2];
    const nx1 = nx * cyaw + nz * syaw;
    const nz1 = -nx * syaw + nz * cyaw;
    const ny2 = ny * cp - nz1 * sp;
    const nz2 = ny * sp + nz1 * cp;
    vnx[i] = nx1;
    vny[i] = ny2;
    vnz[i] = nz2;
  }

  const radius = Math.max(sx, sy, sz) * 0.5;
  const camDist = radius * 3.4;
  const fovScale = (width * 0.43 * (opts.zoom || 1.0)) / maxSpan;
  const halfW = width * 0.5;
  const halfH = height * 0.5;

  const sxArr = new Float32Array(vCount);
  const syArr = new Float32Array(vCount);
  const invZArr = new Float32Array(vCount);
  for (let i = 0; i < vCount; i++) {
    const depth = camDist - vz[i];
    const persp = camDist / Math.max(0.01, depth);
    sxArr[i] = halfW + vx[i] * persp * fovScale;
    syArr[i] = halfH - vy[i] * persp * fovScale;
    invZArr[i] = 1 / Math.max(0.01, depth);
  }

  // Paint emerald-gold studio radial vignette background
  const rgb = new Uint8Array(width * height * 3);
  const zbuf = new Float32Array(width * height);
  zbuf.fill(-1e9);

  const bgIn = opts.bgInner || [22, 58, 40];
  const bgOut = opts.bgOuter || [6, 15, 11];
  for (let y = 0; y < height; y++) {
    const dy = (y - height * 0.45) / (height * 0.62);
    for (let x = 0; x < width; x++) {
      const dx = (x - halfW) / (width * 0.62);
      const d = Math.min(1, Math.hypot(dx, dy));
      const t = 1 - d * d;
      // Subtle golden zodiac aura ring glow behind subject
      const ring = Math.exp(-Math.pow((d - 0.52) * 8.5, 2)) * 0.14;
      const idx = (y * width + x) * 3;
      rgb[idx] = Math.min(255, Math.round(bgOut[0] + (bgIn[0] - bgOut[0]) * t + ring * 180));
      rgb[idx + 1] = Math.min(255, Math.round(bgOut[1] + (bgIn[1] - bgOut[1]) * t + ring * 215));
      rgb[idx + 2] = Math.min(255, Math.round(bgOut[2] + (bgIn[2] - bgOut[2]) * t + ring * 110));
    }
  }

  // 3-point studio lighting vectors (normalized, in camera space)
  const keyLen = Math.hypot(0.48, 0.62, 0.62);
  const klx = 0.48 / keyLen, kly = 0.62 / keyLen, klz = 0.62 / keyLen;
  const fillLen = Math.hypot(-0.65, 0.25, 0.55);
  const flx = -0.65 / fillLen, fly = 0.25 / fillLen, flz = 0.55 / fillLen;
  const rimLen = Math.hypot(-0.35, 0.55, -0.75);
  const rlx = -0.35 / rimLen, rly = 0.55 / rimLen, rlz = -0.75 / rimLen;

  const triCount = indices.length / 3;
  const tMask = texSize - 1;

  for (let tIdx = 0; tIdx < triCount; tIdx++) {
    const i0 = indices[tIdx * 3];
    const i1 = indices[tIdx * 3 + 1];
    const i2 = indices[tIdx * 3 + 2];

    const x0 = sxArr[i0], y0 = syArr[i0];
    const x1 = sxArr[i1], y1 = syArr[i1];
    const x2 = sxArr[i2], y2 = syArr[i2];

    const area = (x1 - x0) * (y2 - y0) - (y1 - y0) * (x2 - x0);
    if (Math.abs(area) < 1e-4) continue;
    const invArea = 1 / area;

    const minPx = Math.max(0, Math.floor(Math.min(x0, x1, x2)));
    const maxPx = Math.min(width - 1, Math.ceil(Math.max(x0, x1, x2)));
    const minPy = Math.max(0, Math.floor(Math.min(y0, y1, y2)));
    const maxPy = Math.min(height - 1, Math.ceil(Math.max(y0, y1, y2)));
    if (minPx > maxPx || minPy > maxPy) continue;

    const iz0 = invZArr[i0], iz1 = invZArr[i1], iz2 = invZArr[i2];
    const u0 = uvs[i0 * 2] * iz0, v0 = uvs[i0 * 2 + 1] * iz0;
    const u1 = uvs[i1 * 2] * iz1, v1 = uvs[i1 * 2 + 1] * iz1;
    const u2 = uvs[i2 * 2] * iz2, v2 = uvs[i2 * 2 + 1] * iz2;

    const n0x = vnx[i0], n0y = vny[i0], n0z = vnz[i0];
    const n1x = vnx[i1], n1y = vny[i1], n1z = vnz[i1];
    const n2x = vnx[i2], n2y = vny[i2], n2z = vnz[i2];

    for (let py = minPy; py <= maxPy; py++) {
      const fy = py + 0.5;
      for (let px = minPx; px <= maxPx; px++) {
        const fx = px + 0.5;
        const w0 = ((x1 - fx) * (y2 - fy) - (y1 - fy) * (x2 - fx)) * invArea;
        if (w0 < -1e-5) continue;
        const w1 = ((x2 - fx) * (y0 - fy) - (y2 - fy) * (x0 - fx)) * invArea;
        if (w1 < -1e-5) continue;
        const w2 = 1 - w0 - w1;
        if (w2 < -1e-5) continue;

        const iz = w0 * iz0 + w1 * iz1 + w2 * iz2;
        const pIdx = py * width + px;
        if (iz <= zbuf[pIdx]) continue;
        zbuf[pIdx] = iz;

        // Perspective-correct UV
        const invIz = 1 / iz;
        const u = (w0 * u0 + w1 * u1 + w2 * u2) * invIz;
        const v = (w0 * v0 + w1 * v1 + w2 * v2) * invIz;

        let ar = 180, ag = 210, ab = 185;
        if (texRgb) {
          const fu = ((u % 1) + 1) % 1;
          const fv = ((v % 1) + 1) % 1;
          const tx = Math.min(tMask, Math.floor(fu * texSize));
          const ty = Math.min(tMask, Math.floor(fv * texSize));
          const ti = (ty * texSize + tx) * 3;
          ar = texRgb[ti];
          ag = texRgb[ti + 1];
          ab = texRgb[ti + 2];
        }

        // Interpolated normal (flip if facing away for doubleSided meshes)
        let nx = w0 * n0x + w1 * n1x + w2 * n2x;
        let ny = w0 * n0y + w1 * n1y + w2 * n2y;
        let nz = w0 * n0z + w1 * n1z + w2 * n2z;
        const nLen = Math.hypot(nx, ny, nz) || 1;
        nx /= nLen; ny /= nLen; nz /= nLen;
        if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }

        const ndKey = Math.max(0, nx * klx + ny * kly + nz * klz);
        const ndFill = Math.max(0, nx * flx + ny * fly + nz * flz);
        const ndRim = Math.max(0, nx * rlx + ny * rly + nz * rlz);
        const fresnel = Math.pow(Math.max(0, 1 - nz), 2.4);

        // Specular highlight (Blinn-Phong half-vector with view=(0,0,1))
        const hx = klx, hy = kly, hz = klz + 1;
        const hLen = Math.hypot(hx, hy, hz) || 1;
        const spec = Math.pow(Math.max(0, (nx * hx + ny * hy + nz * hz) / hLen), 24) * 0.24;

        const lr = 0.34 + ndKey * 0.84 + ndFill * 0.16 + fresnel * (0.22 + ndRim * 0.35);
        const lg = 0.37 + ndKey * 0.82 + ndFill * 0.26 + fresnel * (0.34 + ndRim * 0.38);
        const lb = 0.33 + ndKey * 0.72 + ndFill * 0.22 + fresnel * (0.20 + ndRim * 0.22);

        const outIdx = pIdx * 3;
        rgb[outIdx] = Math.min(255, Math.round(ar * lr + spec * 255));
        rgb[outIdx + 1] = Math.min(255, Math.round(ag * lg + spec * 245));
        rgb[outIdx + 2] = Math.min(255, Math.round(ab * lb + spec * 195));
      }
    }
  }

  return rgb;
}

function saveWebp(rgb, width, height, outPath, outSize = 512) {
  execFileSync(
    '/usr/bin/convert',
    [
      '-size', `${width}x${height}`,
      '-depth', '8',
      'rgb:-',
      '-filter', 'Lanczos',
      '-resize', `${outSize}x${outSize}!`,
      '-strip',
      '-quality', '88',
      `webp:${outPath}`,
    ],
    { input: Buffer.from(rgb.buffer), maxBuffer: 16 * 1024 * 1024 }
  );
}

function main() {
  const mode = process.argv[2];
  const filter = mode === '--facing-check' ? process.argv.slice(3) : process.argv.slice(2);

  if (mode === '--facing-check') {
    fs.mkdirSync(CHECK_DIR, { recursive: true });
    const targets = filter.length > 0 ? filter : Object.keys(ASSET_CAMERA);
    for (const id of targets) {
      const glbPath = path.join(RUNTIME_DIR, `${id}-lite.glb`);
      if (!fs.existsSync(glbPath)) continue;
      const mesh = loadGlbMeshAndTexture(glbPath);
      const angles = [0, 90, 180, -90];
      const tiles = [];
      for (const yawDeg of angles) {
        const rgb = renderPortrait(mesh, { yawDeg, pitchDeg: 10, zoom: 1.05, framing: 'full' }, 256, 256);
        const tilePath = path.join(CHECK_DIR, `${id}_${yawDeg}.png`);
        execFileSync('/usr/bin/convert', ['-size', '256x256', '-depth', '8', 'rgb:-', tilePath], {
          input: Buffer.from(rgb.buffer),
          maxBuffer: 8 * 1024 * 1024,
        });
        tiles.push(tilePath);
      }
      const stripPath = path.join(CHECK_DIR, `${id}_strip.webp`);
      execFileSync('/usr/bin/convert', [...tiles, '+append', '-quality', '86', stripPath]);
      for (const t of tiles) fs.rmSync(t, { force: true });
      console.log(`Rendered facing check: ${stripPath}`);
    }
    return;
  }

  const ids = filter.length > 0 ? filter : Object.keys(ASSET_CAMERA);
  for (const id of ids) {
    const cam = ASSET_CAMERA[id];
    if (!cam) continue;
    const highPath = path.join(RUNTIME_DIR, `${id}-high.glb`);
    const litePath = path.join(RUNTIME_DIR, `${id}-lite.glb`);
    const glbPath = fs.existsSync(highPath) ? highPath : litePath;
    if (!fs.existsSync(glbPath)) {
      console.warn(`Skipping ${id}: ${glbPath} not found`);
      continue;
    }
    const t0 = Date.now();
    const mesh = loadGlbMeshAndTexture(glbPath);
    const rgb = renderPortrait(mesh, cam, 768, 768);
    const outPath = path.join(RUNTIME_DIR, `${id}.webp`);
    saveWebp(rgb, 768, 768, outPath, 512);
    const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
    console.log(`[${id}] Rendered 512x512 WebP (${sizeKb} KB) in ${Date.now() - t0} ms`);
  }
}

main();

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const HEROES_DIR = path.resolve(process.cwd(), 'public/assets/heroes');

const HERO_TARGETS = [
  { src: 'golden-dress-girl.glb', out: 'golden-dress-girl-lite.glb', albedoMax: 768, dataMax: 256 },
  { src: 'alice-ao-dai-hoa-mai.glb', out: 'alice-ao-dai-hoa-mai-lite.glb', albedoMax: 768, dataMax: 256 },
  { src: 'van-tich.glb', out: 'van-tich-lite.glb', albedoMax: 768, dataMax: 256 },
  { src: 'hatsune-miku.glb', out: 'hatsune-miku-lite.glb', albedoMax: 640, dataMax: 256 },
];

function align4(n) {
  return (n + 3) & ~3;
}

function padBuffer(buf, padByte) {
  const padded = align4(buf.length);
  if (padded === buf.length) return buf;
  const out = Buffer.alloc(padded, padByte);
  buf.copy(out);
  return out;
}

function detectAlphaWithPython(filePath) {
  try {
    const out = execFileSync(
      'python3',
      [
        '-c',
        `
import sys
from PIL import Image
im = Image.open(sys.argv[1])
if im.mode in ('RGBA', 'LA') or (im.mode == 'P' and 'transparency' in im.info):
    alpha = im.convert('RGBA').getchannel('A')
    lo, hi = alpha.getextrema()
    print('ALPHA' if lo < 250 else 'OPAQUE')
else:
    print('OPAQUE')
`,
        filePath,
      ],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
    ).trim();
    return out === 'ALPHA';
  } catch {
    return false;
  }
}

function recompressImageBuffer(imgBuf, mimeType, maxDim, isDataMap) {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aetherbow-hero-lite-'));
  const ext = mimeType === 'image/png' ? 'png' : 'jpg';
  const inPath = path.join(tmpDir, `in.${ext}`);
  fs.writeFileSync(inPath, imgBuf);

  try {
    const needsAlpha = !isDataMap && mimeType === 'image/png' && detectAlphaWithPython(inPath);
    const scaleFilter = `scale='min(${maxDim},iw)':'min(${maxDim},ih)':force_original_aspect_ratio=decrease`;

    if (needsAlpha) {
      const outPath = path.join(tmpDir, 'out.png');
      execFileSync(
        'ffmpeg',
        ['-y', '-loglevel', 'error', '-i', inPath, '-vf', scaleFilter, '-compression_level', '9', outPath],
        { stdio: 'ignore' }
      );
      const outBuf = fs.readFileSync(outPath);
      if (outBuf.length < imgBuf.length) {
        return { buf: outBuf, mimeType: 'image/png' };
      }
      return { buf: imgBuf, mimeType };
    }

    const outPath = path.join(tmpDir, 'out.jpg');
    const q = isDataMap ? '9' : '5';
    execFileSync(
      'ffmpeg',
      ['-y', '-loglevel', 'error', '-i', inPath, '-vf', scaleFilter, '-q:v', q, outPath],
      { stdio: 'ignore' }
    );
    const outBuf = fs.readFileSync(outPath);
    if (outBuf.length < imgBuf.length) {
      return { buf: outBuf, mimeType: 'image/jpeg' };
    }
    return { buf: imgBuf, mimeType };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

function classifyImageRoles(gltf) {
  const dataMapImageIndices = new Set();
  const baseColorImageIndices = new Set();
  const texToImg = (texInfo) => {
    if (!texInfo || typeof texInfo.index !== 'number') return -1;
    const tex = gltf.textures?.[texInfo.index];
    return typeof tex?.source === 'number' ? tex.source : -1;
  };

  for (const mat of gltf.materials || []) {
    const bc = texToImg(mat.pbrMetallicRoughness?.baseColorTexture);
    if (bc >= 0) baseColorImageIndices.add(bc);
    const mr = texToImg(mat.pbrMetallicRoughness?.metallicRoughnessTexture);
    if (mr >= 0) dataMapImageIndices.add(mr);
    const nm = texToImg(mat.normalTexture);
    if (nm >= 0) dataMapImageIndices.add(nm);
    const ao = texToImg(mat.occlusionTexture);
    if (ao >= 0) dataMapImageIndices.add(ao);
  }

  // If an image is used for both baseColor and data, treat as albedo
  for (const idx of baseColorImageIndices) {
    dataMapImageIndices.delete(idx);
  }
  return { dataMapImageIndices };
}

function buildLiteGlb(cfg) {
  const srcPath = path.join(HEROES_DIR, cfg.src);
  const outPath = path.join(HEROES_DIR, cfg.out);
  const srcBuf = fs.readFileSync(srcPath);

  if (srcBuf.readUInt32LE(0) !== 0x46546c67 || srcBuf.readUInt32LE(4) !== 2) {
    throw new Error(`Invalid glTF 2.0 binary: ${cfg.src}`);
  }
  const jsonLen = srcBuf.readUInt32LE(12);
  const gltf = JSON.parse(srcBuf.subarray(20, 20 + jsonLen).toString('utf8'));
  const binOff = 20 + jsonLen;
  const binLen = srcBuf.readUInt32LE(binOff);
  const binData = srcBuf.subarray(binOff + 8, binOff + 8 + binLen);

  const { dataMapImageIndices } = classifyImageRoles(gltf);

  // Map bufferView index -> replacement bytes for embedded images
  const imageViewMap = new Map();
  const images = gltf.images || [];
  for (let i = 0; i < images.length; i += 1) {
    const im = images[i];
    if (typeof im.bufferView !== 'number') continue;
    const bv = gltf.bufferViews[im.bufferView];
    const start = bv.byteOffset || 0;
    const slice = binData.subarray(start, start + bv.byteLength);
    const isDataMap = dataMapImageIndices.has(i);
    const maxDim = isDataMap ? cfg.dataMax : cfg.albedoMax;
    const { buf: nextBuf, mimeType } = recompressImageBuffer(
      slice,
      im.mimeType || 'image/png',
      maxDim,
      isDataMap
    );
    im.mimeType = mimeType;
    imageViewMap.set(im.bufferView, nextBuf);
  }

  // Repack all buffer 0 slices sequentially with 4-byte alignment, preserving EXT_meshopt_compression
  const chunks = [];
  let cursor = 0;
  for (let i = 0; i < (gltf.bufferViews || []).length; i += 1) {
    const bv = gltf.bufferViews[i];
    const meshoptExt = bv.extensions?.EXT_meshopt_compression;

    if (meshoptExt && (meshoptExt.buffer ?? 0) === 0) {
      const extStart = meshoptExt.byteOffset || 0;
      const extSlice = binData.subarray(extStart, extStart + meshoptExt.byteLength);
      const padded = padBuffer(extSlice, 0x00);
      meshoptExt.byteOffset = cursor;
      meshoptExt.byteLength = extSlice.length;
      chunks.push(padded);
      cursor += padded.length;
      continue;
    }

    if ((bv.buffer ?? 0) !== 0) {
      // Leave virtual/external bufferViews untouched
      continue;
    }

    let rawSlice;
    if (imageViewMap.has(i)) {
      rawSlice = imageViewMap.get(i);
    } else {
      const start = bv.byteOffset || 0;
      rawSlice = binData.subarray(start, start + bv.byteLength);
    }
    const padded = padBuffer(rawSlice, 0x00);
    bv.byteOffset = cursor;
    bv.byteLength = rawSlice.length;
    chunks.push(padded);
    cursor += padded.length;
  }

  const newBin = Buffer.concat(chunks);
  if (gltf.buffers && gltf.buffers[0]) {
    gltf.buffers[0].byteLength = newBin.length;
  }

  const jsonChunk = padBuffer(Buffer.from(JSON.stringify(gltf), 'utf8'), 0x20);
  const binChunk = padBuffer(newBin, 0x00);
  const totalLen = 12 + 8 + jsonChunk.length + 8 + binChunk.length;

  const outBuf = Buffer.alloc(totalLen);
  outBuf.writeUInt32LE(0x46546c67, 0);
  outBuf.writeUInt32LE(2, 4);
  outBuf.writeUInt32LE(totalLen, 8);

  outBuf.writeUInt32LE(jsonChunk.length, 12);
  outBuf.writeUInt32LE(0x4e4f534a, 16);
  jsonChunk.copy(outBuf, 20);

  const binHeaderOff = 20 + jsonChunk.length;
  outBuf.writeUInt32LE(binChunk.length, binHeaderOff);
  outBuf.writeUInt32LE(0x004e4942, binHeaderOff + 4);
  binChunk.copy(outBuf, binHeaderOff + 8);

  fs.writeFileSync(outPath, outBuf);
  const savedPct = (((srcBuf.length - outBuf.length) / srcBuf.length) * 100).toFixed(1);
  console.log(
    `${cfg.src} -> ${cfg.out}: ${(srcBuf.length / 1024).toFixed(0)} KB -> ${(outBuf.length / 1024).toFixed(0)} KB (-${savedPct}%)`
  );
}

for (const target of HERO_TARGETS) {
  buildLiteGlb(target);
}

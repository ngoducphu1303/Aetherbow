import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { MeshoptSimplifier } from 'meshoptimizer';
import { processAsset } from './build-chapter1-roster-variants.mjs';

const WORKER_BASE = process.env.GLB_CDN_BASE_URL || 'https://aetherbow-glb.puugoo002.workers.dev';
const RAW_TMP_DIR = '/tmp/ch3-raw';
const OUT_DIR = path.resolve(process.cwd(), 'public/assets/Chương 3/Runtime');
const REPORT_PATH = '/tmp/ch3-geometry-report.json';

const ASSETS = [
  { id: 'taurus-arena', match: 'dau_truong_thanh_dia_ngoc_luc_bao.glb', highTris: 60_000, liteTris: 28_000, highAlbedo: 1536, liteAlbedo: 1024, isArena: true },
  { id: 'dia-than-kim-nguu', match: 'boss_chinh_dia_than_kim_nguu.glb', highTris: 24_000, liteTris: 9_000, highAlbedo: 1536, liteAlbedo: 1024 },
  { id: 'ngoc-nguu-duc-thu', match: 'boss_phu_ngoc_nguu_duc_thu.glb', highTris: 20_000, liteTris: 7_000, highAlbedo: 1536, liteAlbedo: 1024 },
  { id: 'nguu-ngoc-xung-kich', match: 'quai_01_nguu_ngoc_xung_kich.glb', highTris: 12_000, liteTris: 4_800, highAlbedo: 1024, liteAlbedo: 512 },
  { id: 've-binh-ngoc-luc-bao', match: 'quai_02_ve_binh_ngoc_luc_bao.glb', highTris: 12_000, liteTris: 4_800, highAlbedo: 1024, liteAlbedo: 512 },
  { id: 'linh-hon-luc-bao', match: 'quai_03_linh_hon_luc_bao.glb', highTris: 12_000, liteTris: 4_800, highAlbedo: 1024, liteAlbedo: 512 },
  { id: 'chien-binh-kich-luc-bao', match: 'quai_04_chien_binh_kich_luc_bao.glb', highTris: 12_000, liteTris: 4_800, highAlbedo: 1024, liteAlbedo: 512 },
  { id: 'sylvia', match: 'nu_chinh_thanh_nu_luc_bao.glb', highTris: 25_000, liteTris: 9_000, highAlbedo: 1536, liteAlbedo: 1024 },
  { id: 'venus-incarnate', match: 'skin_01_thanh_y_hoa_than_kim_tinh.glb', highTris: 25_000, liteTris: 9_000, highAlbedo: 1536, liteAlbedo: 1024 },
  { id: 'jade-calf', match: 'tinh_linh_tieu_nguu_ngoc_bich.glb', highTris: 11_000, liteTris: 4_500, highAlbedo: 1024, liteAlbedo: 512 },
  { id: 'jade-bull', match: 'thu_cuoi_chien_nguu_ngoc_bich.glb', highTris: 20_000, liteTris: 7_500, highAlbedo: 1536, liteAlbedo: 1024 },
  { id: 'emerald-taurus-wings', match: 'canh_luc_bao_kim_nguu_duc.glb', highTris: 11_000, liteTris: 4_500, highAlbedo: 1024, liteAlbedo: 512 },
  { id: 'jade-heart-relic', match: 'thanh_khi_tam_ngoc_kim_nguu.glb', highTris: 10_000, liteTris: 4_000, highAlbedo: 1024, liteAlbedo: 512 },
  { id: 'emerald-taurus-halo', match: 'hao_quang_phap_tran_luc_bao_kim_nguu.glb', highTris: 10_000, liteTris: 4_000, highAlbedo: 1024, liteAlbedo: 512 },
];

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

function inspectGlbWorldBounds(filePath, isArena = false) {
  const buf = fs.readFileSync(filePath);
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
  const acc = gltf.accessors[prim.attributes.POSITION];
  const bv = gltf.bufferViews[acc.bufferView];
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
  const info = {
    vertexCount: acc.count,
    nodeRotation: node.rotation || null,
    min: min.map((v) => Number(v.toFixed(4))),
    max: max.map((v) => Number(v.toFixed(4))),
    size: size.map((v) => Number(v.toFixed(4))),
    center: center.map((v) => Number(v.toFixed(4))),
    materials: gltf.materials?.length ?? 0,
    images: gltf.images?.length ?? 0,
  };

  if (isArena && worldPts) {
    // Measure radial height profile from arena center to calibrate flat walkable floor Y and inner radius
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
    info.radialBuckets = radialBuckets;
  }

  return info;
}

function toCdnUrl(assetPath) {
  const encoded = assetPath.slice(1).split('/').map(encodeURIComponent).join('/');
  return new URL(encoded, `${WORKER_BASE.replace(/\/$/, '')}/`).href;
}

async function fetchChapter3Inbox() {
  const url = `${WORKER_BASE.replace(/\/$/, '')}/__asset-inbox?chapter=3`;
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Inbox fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  return (data.files || []).map((f) => ({
    ...f,
    fileName: f.name,
    url: f.url || toCdnUrl(f.path),
  }));
}

async function main() {
  const filter = process.argv.slice(2);
  fs.mkdirSync(RAW_TMP_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const inbox = await fetchChapter3Inbox();
  console.log(`Fetched ${inbox.length} Chapter 3 assets from Worker inbox.`);

  await MeshoptSimplifier.ready;
  const report = {};

  for (const spec of ASSETS) {
    if (filter.length > 0 && !filter.includes(spec.id)) continue;
    const entry = inbox.find((a) => a.fileName === spec.match);
    if (!entry) {
      throw new Error(`Missing Chapter 3 asset in inbox: ${spec.match}`);
    }
    const rawPath = path.join(RAW_TMP_DIR, `${spec.id}.glb`);
    const highPath = path.join(OUT_DIR, `${spec.id}-high.glb`);
    const litePath = path.join(OUT_DIR, `${spec.id}-lite.glb`);

    if (!fs.existsSync(rawPath)) {
      console.log(`\n[${spec.id}] Downloading ${(entry.size / (1024 * 1024)).toFixed(1)} MiB from ${entry.url} ...`);
      execFileSync('curl', ['-fL', '--retry', '3', '--retry-delay', '2', '-sS', '-o', rawPath, entry.url], {
        stdio: 'inherit',
      });
    }

    await processAsset({
      id: spec.id,
      sourcePath: rawPath,
      outDir: OUT_DIR,
      highFile: `${spec.id}-high.glb`,
      liteFile: `${spec.id}-lite.glb`,
      highTris: spec.highTris,
      highMaxTris: Math.ceil(spec.highTris * 1.35),
      liteTris: spec.liteTris,
      liteMaxTris: Math.ceil(spec.liteTris * 1.35),
      highAlbedoSize: spec.highAlbedo,
      highDataSize: 512,
      liteAlbedoSize: spec.liteAlbedo,
    });

    const highStat = fs.statSync(highPath);
    const liteStat = fs.statSync(litePath);
    const bounds = inspectGlbWorldBounds(litePath, Boolean(spec.isArena));

    report[spec.id] = {
      sourceFileName: entry.fileName,
      sourceBytes: entry.size,
      highBytes: highStat.size,
      liteBytes: liteStat.size,
      bounds,
    };

    // Delete ~90 MB raw staging file immediately to keep /tmp lean
    fs.rmSync(rawPath, { force: true });
  }

  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
  console.log(`\nDone! Saved geometry report to ${REPORT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

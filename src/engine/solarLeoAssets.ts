import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { HeroId, HeroSkinId } from '../types/game';

export type SolarLeoAssetId =
  | 'aurelia'
  | 'aurelia_oasis_dancer'
  | 'aurelia_temple_commander'
  | 'aurelia_solaris_valkyrie'
  | 'aurelia_winter_solstice'
  | 'astraeo'
  | 'solar_zenith'
  | 'solarius'
  | 'astrolabe_regulus'
  | 'leo_sovereign';

export type SolarLeoVariant = 'high' | 'lite';

export type SolarLeoRigType =
  | 'humanoid'
  | 'quadruped_mount'
  | 'wings'
  | 'pet'
  | 'artifact'
  | 'halo';

export interface SolarLeoAssetSpec {
  id: SolarLeoAssetId;
  displayName: string;
  rigType: SolarLeoRigType;
  highPathSegments: readonly string[];
  litePathSegments: readonly string[];
  thumbnailPathSegments: readonly string[];
  targetHeight: number;
  facingYawOffset: number;
  groundAtZero: boolean;
  maxLiteBytes: number;
}

export const SOLAR_LEO_ASSET_VERSION = '2';

/**
 * Calibrated anchor offset on hero bodyGroup for Astrolabe of Regulus so it floats
 * clearly to the right and slightly forward of wide wings (e.g., Wings of the Solar Zenith).
 */
export const SOLAR_LEO_ARTIFACT_OFFSET = {
  x: 1.18,
  y: 1.54,
  z: 0.36,
} as const;

/** Normalized vertical threshold above which humanoid head/face vertices are 100% rigid-locked to the head bone. */
export const HUMANOID_HEAD_RIGID_START_NY = 0.785;
export const HUMANOID_NECK_BLEND_START_NY = 0.745;

export const SOLAR_LEO_SPECS: Record<SolarLeoAssetId, SolarLeoAssetSpec> = {
  aurelia: {
    id: 'aurelia',
    displayName: 'Aurelia · Nữ Hoàng Thái Dương',
    rigType: 'humanoid',
    highPathSegments: ['assets', 'Chương 1', 'Nhân vật', '1. Anh hùng', 'Aurelia High.glb'],
    litePathSegments: ['assets', 'Chương 1', 'Nhân vật', '1. Anh hùng', 'Aurelia Lite.glb'],
    thumbnailPathSegments: ['assets', 'Chương 1', 'Nhân vật', '1. Anh hùng', 'Aurelia.webp'],
    targetHeight: 2.04,
    facingYawOffset: 0,
    groundAtZero: true,
    maxLiteBytes: 780_000,
  },
  aurelia_oasis_dancer: {
    id: 'aurelia_oasis_dancer',
    displayName: 'Vũ Công Ốc Đảo Hoàng Kim',
    rigType: 'humanoid',
    highPathSegments: ['assets', 'Chương 1', 'Nhân vật', '7. Trang phục', 'Golden Oasis Sun Dancer High.glb'],
    litePathSegments: ['assets', 'Chương 1', 'Nhân vật', '7. Trang phục', 'Golden Oasis Sun Dancer Lite.glb'],
    thumbnailPathSegments: ['assets', 'Chương 1', 'Nhân vật', '7. Trang phục', 'Golden Oasis Sun Dancer.webp'],
    targetHeight: 2.04,
    facingYawOffset: 0,
    groundAtZero: true,
    maxLiteBytes: 780_000,
  },
  aurelia_temple_commander: {
    id: 'aurelia_temple_commander',
    displayName: 'Thống Soái Đền Mặt Trời',
    rigType: 'humanoid',
    highPathSegments: ['assets', 'Chương 1', 'Nhân vật', '7. Trang phục', 'Royal Sun-Temple Commander High.glb'],
    litePathSegments: ['assets', 'Chương 1', 'Nhân vật', '7. Trang phục', 'Royal Sun-Temple Commander Lite.glb'],
    thumbnailPathSegments: ['assets', 'Chương 1', 'Nhân vật', '7. Trang phục', 'Royal Sun-Temple Commander.webp'],
    targetHeight: 2.04,
    facingYawOffset: 0,
    groundAtZero: true,
    maxLiteBytes: 780_000,
  },
  aurelia_solaris_valkyrie: {
    id: 'aurelia_solaris_valkyrie',
    displayName: 'Chiến Thần Solaris Valkyrie',
    rigType: 'humanoid',
    highPathSegments: ['assets', 'Chương 1', 'Nhân vật', '7. Trang phục', 'Solaris Valkyrie Regalia High.glb'],
    litePathSegments: ['assets', 'Chương 1', 'Nhân vật', '7. Trang phục', 'Solaris Valkyrie Regalia Lite.glb'],
    thumbnailPathSegments: ['assets', 'Chương 1', 'Nhân vật', '7. Trang phục', 'Solaris Valkyrie Regalia.webp'],
    targetHeight: 2.04,
    facingYawOffset: 0,
    groundAtZero: true,
    maxLiteBytes: 780_000,
  },
  aurelia_winter_solstice: {
    id: 'aurelia_winter_solstice',
    displayName: 'Nữ Hoàng Băng Tinh Đông Chí',
    rigType: 'humanoid',
    highPathSegments: ['assets', 'Chương 1', 'Nhân vật', '7. Trang phục', 'Winter Solstice Crystal Sovereign High.glb'],
    litePathSegments: ['assets', 'Chương 1', 'Nhân vật', '7. Trang phục', 'Winter Solstice Crystal Sovereign Lite.glb'],
    thumbnailPathSegments: ['assets', 'Chương 1', 'Nhân vật', '7. Trang phục', 'Winter Solstice Crystal Sovereign.webp'],
    targetHeight: 2.04,
    facingYawOffset: 0,
    groundAtZero: true,
    maxLiteBytes: 780_000,
  },
  astraeo: {
    id: 'astraeo',
    displayName: 'Astraeo · Tinh Linh Sư Tử',
    rigType: 'pet',
    highPathSegments: ['assets', 'Chương 1', 'Nhân vật', '2. Tinh linh', 'Astraeo High.glb'],
    litePathSegments: ['assets', 'Chương 1', 'Nhân vật', '2. Tinh linh', 'Astraeo Lite.glb'],
    thumbnailPathSegments: ['assets', 'Chương 1', 'Nhân vật', '2. Tinh linh', 'Astraeo.webp'],
    targetHeight: 0.88,
    facingYawOffset: 0,
    groundAtZero: false,
    maxLiteBytes: 420_000,
  },
  solar_zenith: {
    id: 'solar_zenith',
    displayName: 'Thần Dực Đỉnh Thái Dương',
    rigType: 'wings',
    highPathSegments: ['assets', 'Chương 1', 'Nhân vật', '3. Cánh', 'Wings of the Solar Zenith High.glb'],
    litePathSegments: ['assets', 'Chương 1', 'Nhân vật', '3. Cánh', 'Wings of the Solar Zenith Lite.glb'],
    thumbnailPathSegments: ['assets', 'Chương 1', 'Nhân vật', '3. Cánh', 'Wings of the Solar Zenith.webp'],
    targetHeight: 1.58,
    facingYawOffset: 0,
    groundAtZero: false,
    maxLiteBytes: 460_000,
  },
  solarius: {
    id: 'solarius',
    displayName: 'Solarius · Sư Tử Thái Dương',
    rigType: 'quadruped_mount',
    highPathSegments: ['assets', 'Chương 1', 'Nhân vật', '4. Thú cưỡi', 'Solarius High.glb'],
    litePathSegments: ['assets', 'Chương 1', 'Nhân vật', '4. Thú cưỡi', 'Solarius Lite.glb'],
    thumbnailPathSegments: ['assets', 'Chương 1', 'Nhân vật', '4. Thú cưỡi', 'Solarius.webp'],
    targetHeight: 1.62,
    // Solarius head/mane extends along +X in source export; -PI/2 aligns head cleanly to +Z forward.
    facingYawOffset: -Math.PI / 2,
    groundAtZero: true,
    maxLiteBytes: 520_000,
  },
  astrolabe_regulus: {
    id: 'astrolabe_regulus',
    displayName: 'Tinh Bàn Regulus',
    rigType: 'artifact',
    highPathSegments: ['assets', 'Chương 1', 'Nhân vật', '5. Thánh khí', 'Astrolabe of Regulus High.glb'],
    litePathSegments: ['assets', 'Chương 1', 'Nhân vật', '5. Thánh khí', 'Astrolabe of Regulus Lite.glb'],
    thumbnailPathSegments: ['assets', 'Chương 1', 'Nhân vật', '5. Thánh khí', 'Astrolabe of Regulus.webp'],
    targetHeight: 0.62,
    facingYawOffset: 0,
    groundAtZero: false,
    maxLiteBytes: 420_000,
  },
  leo_sovereign: {
    id: 'leo_sovereign',
    displayName: 'Hào Quang Sư Tử Chí Tôn',
    rigType: 'halo',
    highPathSegments: ['assets', 'Chương 1', 'Nhân vật', '6. Hào quang', 'Halo of the Leo Sovereign High.glb'],
    litePathSegments: ['assets', 'Chương 1', 'Nhân vật', '6. Hào quang', 'Halo of the Leo Sovereign Lite.glb'],
    thumbnailPathSegments: ['assets', 'Chương 1', 'Nhân vật', '6. Hào quang', 'Halo of the Leo Sovereign.webp'],
    targetHeight: 1.48,
    facingYawOffset: 0,
    groundAtZero: false,
    maxLiteBytes: 420_000,
  },
};

export const SOLAR_LEO_ASSET_IDS: readonly SolarLeoAssetId[] = [
  'aurelia',
  'aurelia_oasis_dancer',
  'aurelia_temple_commander',
  'aurelia_solaris_valkyrie',
  'aurelia_winter_solstice',
  'astraeo',
  'solar_zenith',
  'solarius',
  'astrolabe_regulus',
  'leo_sovereign',
];

export function resolveSolarLeoHeroAssetId(
  heroId: HeroId | undefined,
  skinId?: HeroSkinId
): SolarLeoAssetId | null {
  if (heroId !== 'aurelia') return null;
  if (
    skinId === 'aurelia_oasis_dancer' ||
    skinId === 'aurelia_temple_commander' ||
    skinId === 'aurelia_solaris_valkyrie' ||
    skinId === 'aurelia_winter_solstice'
  ) {
    return skinId;
  }
  return 'aurelia';
}

export function getSolarLeoAssetUrl(
  assetId: SolarLeoAssetId,
  variant: SolarLeoVariant,
  baseUrl = '/',
  baseUri = 'http://localhost:3000/'
): URL {
  const spec = SOLAR_LEO_SPECS[assetId];
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const segments = variant === 'lite' ? spec.litePathSegments : spec.highPathSegments;
  const encodedPath = segments.map((seg) => encodeURIComponent(seg)).join('/');
  const url = new URL(`${normalizedBase}${encodedPath}`, baseUri);
  url.searchParams.set('v', SOLAR_LEO_ASSET_VERSION);
  return url;
}

function validateGlbBuffer(data: ArrayBuffer, label: string): void {
  const header = new DataView(data);
  if (
    data.byteLength < 20 ||
    header.getUint32(0, true) !== 0x46546c67 ||
    header.getUint32(4, true) !== 2 ||
    header.getUint32(8, true) !== data.byteLength
  ) {
    throw new Error(`Tệp GLB ${label} không hợp lệ.`);
  }
}

export interface DownloadSolarLeoOptions {
  baseUrl?: string;
  baseUri?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

const downloadCache = new Map<string, Promise<ArrayBuffer>>();

function cacheKey(assetId: SolarLeoAssetId, variant: SolarLeoVariant): string {
  return `${assetId}:${variant}`;
}

export function clearSolarLeoDownloadCache(): void {
  downloadCache.clear();
}

async function fetchSolarLeoVariantBytes(
  assetId: SolarLeoAssetId,
  variant: SolarLeoVariant,
  options: DownloadSolarLeoOptions
): Promise<ArrayBuffer> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? '/';
  const baseUri =
    options.baseUri ?? (typeof document !== 'undefined' ? document.baseURI : 'http://localhost:3000/');
  const url = getSolarLeoAssetUrl(assetId, variant, baseUrl, baseUri);
  const res = await fetchImpl(url, { signal: options.signal });
  if (!res.ok || res.headers.get('content-type')?.includes('text/html')) {
    throw new Error(`Không tải được mô hình ${assetId} (${variant}, HTTP ${res.status}).`);
  }
  const buf = await res.arrayBuffer();
  validateGlbBuffer(buf, `${assetId}:${variant}`);
  return buf;
}

/**
 * Downloads and caches a Solar Leo GLB on demand. Automatically falls back High -> Lite on failure.
 */
export function downloadSolarLeoArrayBuffer(
  assetId: SolarLeoAssetId,
  variant: SolarLeoVariant,
  options: DownloadSolarLeoOptions = {}
): Promise<ArrayBuffer> {
  const key = cacheKey(assetId, variant);
  const existing = downloadCache.get(key);
  if (existing) return existing;

  const task = (async () => {
    try {
      return await fetchSolarLeoVariantBytes(assetId, variant, options);
    } catch (error) {
      if (variant === 'high' && !options.signal?.aborted) {
        return await fetchSolarLeoVariantBytes(assetId, 'lite', options);
      }
      throw error;
    }
  })().catch((err) => {
    downloadCache.delete(key);
    throw err;
  });

  downloadCache.set(key, task);
  return task;
}

// ============================================================================
// SKELETON BLUEPRINTS & CAPSULE SKINNING WEIGHTS (ZERO-ALLOC RUNTIME)
// ============================================================================

interface BoneBlueprint {
  name: string;
  parent: number;
  head: [number, number, number];
  tail: [number, number, number];
  radius: number;
  sideBias?: 'left' | 'right' | 'center' | 'back';
  weightBoost?: number;
}

function buildBoneBlueprints(
  rigType: SolarLeoRigType,
  box: THREE.Box3
): BoneBlueprint[] {
  const sx = Math.max(0.1, box.max.x - box.min.x);
  const sy = Math.max(0.1, box.max.y - box.min.y);
  const sz = Math.max(0.1, box.max.z - box.min.z);
  const y0 = box.min.y;

  if (rigType === 'humanoid') {
    // Clamp anatomical torso width so wide bows/cloaks never inflate bone radii into the head/face
    const torsoW = Math.min(sx, sy * 0.44);
    const legX = torsoW * 0.17;
    const armX = torsoW * 0.28;
    const handX = Math.max(torsoW * 0.52, sx * 0.42);
    return [
      // 0: root
      { name: 'root', parent: -1, head: [0, y0, 0], tail: [0, y0 + sy * 0.08, 0], radius: torsoW * 0.16, weightBoost: 0.15 },
      // 1: pelvis
      { name: 'pelvis', parent: 0, head: [0, y0 + sy * 0.44, 0], tail: [0, y0 + sy * 0.56, 0], radius: torsoW * 0.28, sideBias: 'center', weightBoost: 1.25 },
      // 2: spine
      { name: 'spine', parent: 1, head: [0, y0 + sy * 0.56, 0], tail: [0, y0 + sy * 0.67, 0], radius: torsoW * 0.26, sideBias: 'center', weightBoost: 1.2 },
      // 3: chest
      { name: 'chest', parent: 2, head: [0, y0 + sy * 0.67, 0], tail: [0, y0 + sy * 0.76, 0], radius: torsoW * 0.26, sideBias: 'center', weightBoost: 1.3 },
      // 4: head (100% rigid-locked in bakeSkinWeightsOnGeometry above HUMANOID_HEAD_RIGID_START_NY)
      { name: 'head', parent: 3, head: [0, y0 + sy * 0.785, 0], tail: [0, y0 + sy * 0.99, 0], radius: torsoW * 0.22, sideBias: 'center', weightBoost: 1.85 },
      // 5: armL (+X)
      { name: 'armL', parent: 3, head: [armX * 0.85, y0 + sy * 0.73, 0], tail: [armX * 1.25, y0 + sy * 0.58, sz * 0.05], radius: torsoW * 0.18, sideBias: 'left', weightBoost: 1.2 },
      // 6: handL (+X)
      { name: 'handL', parent: 5, head: [armX * 1.25, y0 + sy * 0.58, sz * 0.05], tail: [handX, y0 + sy * 0.48, sz * 0.24], radius: torsoW * 0.24, sideBias: 'left', weightBoost: 1.4 },
      // 7: armR (-X)
      { name: 'armR', parent: 3, head: [-armX * 0.85, y0 + sy * 0.73, 0], tail: [-armX * 1.25, y0 + sy * 0.58, sz * 0.05], radius: torsoW * 0.18, sideBias: 'right', weightBoost: 1.2 },
      // 8: handR (-X)
      { name: 'handR', parent: 7, head: [-armX * 1.25, y0 + sy * 0.58, sz * 0.05], tail: [-handX, y0 + sy * 0.48, sz * 0.24], radius: torsoW * 0.24, sideBias: 'right', weightBoost: 1.4 },
      // 9: legL (+X)
      { name: 'legL', parent: 1, head: [legX, y0 + sy * 0.46, 0.02], tail: [legX * 1.05, y0 + sy * 0.02, 0.04], radius: torsoW * 0.24, sideBias: 'left', weightBoost: 1.45 },
      // 10: legR (-X)
      { name: 'legR', parent: 1, head: [-legX, y0 + sy * 0.46, 0.02], tail: [-legX * 1.05, y0 + sy * 0.02, 0.04], radius: torsoW * 0.24, sideBias: 'right', weightBoost: 1.45 },
      // 11: cloak (trailing -Z)
      { name: 'cloak', parent: 2, head: [0, y0 + sy * 0.62, -sz * 0.14], tail: [0, y0 + sy * 0.06, -sz * 0.46], radius: torsoW * 0.32, sideBias: 'back', weightBoost: 1.35 },
    ];
  }

  if (rigType === 'quadruped_mount') {
    const legX = sx * 0.28;
    return [
      // 0: root
      { name: 'root', parent: -1, head: [0, y0, 0], tail: [0, y0 + sy * 0.08, 0], radius: sx * 0.16, weightBoost: 0.12 },
      // 1: pelvis
      { name: 'pelvis', parent: 0, head: [0, y0 + sy * 0.56, -sz * 0.16], tail: [0, y0 + sy * 0.58, -sz * 0.02], radius: sx * 0.36, sideBias: 'center', weightBoost: 1.25 },
      // 2: spine (saddle anchor mounts here)
      { name: 'spine', parent: 1, head: [0, y0 + sy * 0.58, -sz * 0.02], tail: [0, y0 + sy * 0.64, sz * 0.14], radius: sx * 0.36, sideBias: 'center', weightBoost: 1.3 },
      // 3: chest
      { name: 'chest', parent: 2, head: [0, y0 + sy * 0.64, sz * 0.14], tail: [0, y0 + sy * 0.72, sz * 0.28], radius: sx * 0.40, sideBias: 'center', weightBoost: 1.35 },
      // 4: head
      { name: 'head', parent: 3, head: [0, y0 + sy * 0.72, sz * 0.28], tail: [0, y0 + sy * 0.86, sz * 0.48], radius: sx * 0.36, sideBias: 'center', weightBoost: 1.65 },
      // 5: tail1
      { name: 'tail1', parent: 1, head: [0, y0 + sy * 0.54, -sz * 0.22], tail: [0, y0 + sy * 0.46, -sz * 0.36], radius: sx * 0.22, sideBias: 'back', weightBoost: 1.3 },
      // 6: tail2
      { name: 'tail2', parent: 5, head: [0, y0 + sy * 0.46, -sz * 0.36], tail: [0, y0 + sy * 0.34, -sz * 0.50], radius: sx * 0.22, sideBias: 'back', weightBoost: 1.45 },
      // 7: legFL (+X front)
      { name: 'legFL', parent: 3, head: [legX, y0 + sy * 0.54, sz * 0.22], tail: [legX, y0 + sy * 0.02, sz * 0.26], radius: sx * 0.24, sideBias: 'left', weightBoost: 1.55 },
      // 8: legFR (-X front)
      { name: 'legFR', parent: 3, head: [-legX, y0 + sy * 0.54, sz * 0.22], tail: [-legX, y0 + sy * 0.02, sz * 0.26], radius: sx * 0.24, sideBias: 'right', weightBoost: 1.55 },
      // 9: legBL (+X back)
      { name: 'legBL', parent: 1, head: [legX, y0 + sy * 0.52, -sz * 0.18], tail: [legX, y0 + sy * 0.02, -sz * 0.22], radius: sx * 0.24, sideBias: 'left', weightBoost: 1.55 },
      // 10: legBR (-X back)
      { name: 'legBR', parent: 1, head: [-legX, y0 + sy * 0.52, -sz * 0.18], tail: [-legX, y0 + sy * 0.02, -sz * 0.22], radius: sx * 0.24, sideBias: 'right', weightBoost: 1.55 },
    ];
  }

  if (rigType === 'wings') {
    const midY = (box.min.y + box.max.y) * 0.5;
    return [
      // 0: root spine hub
      { name: 'root', parent: -1, head: [0, midY - sy * 0.12, 0], tail: [0, midY + sy * 0.14, 0], radius: sx * 0.12, sideBias: 'center', weightBoost: 1.5 },
      // 1: wingL1 inner (+X)
      { name: 'wingL1', parent: 0, head: [sx * 0.05, midY, 0], tail: [sx * 0.26, midY + sy * 0.08, 0], radius: sy * 0.42, sideBias: 'left', weightBoost: 1.35 },
      // 2: wingL2 outer (+X)
      { name: 'wingL2', parent: 1, head: [sx * 0.26, midY + sy * 0.08, 0], tail: [sx * 0.49, midY + sy * 0.14, 0], radius: sy * 0.45, sideBias: 'left', weightBoost: 1.5 },
      // 3: wingR1 inner (-X)
      { name: 'wingR1', parent: 0, head: [-sx * 0.05, midY, 0], tail: [-sx * 0.26, midY + sy * 0.08, 0], radius: sy * 0.42, sideBias: 'right', weightBoost: 1.35 },
      // 4: wingR2 outer (-X)
      { name: 'wingR2', parent: 3, head: [-sx * 0.26, midY + sy * 0.08, 0], tail: [-sx * 0.49, midY + sy * 0.14, 0], radius: sy * 0.45, sideBias: 'right', weightBoost: 1.5 },
    ];
  }

  return [];
}

function pointSegmentDistanceSq(
  px: number, py: number, pz: number,
  ax: number, ay: number, az: number,
  bx: number, by: number, bz: number
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const abz = bz - az;
  const apx = px - ax;
  const apy = py - ay;
  const apz = pz - az;
  const lenSq = abx * abx + aby * aby + abz * abz;
  const t = lenSq > 1e-8 ? Math.max(0, Math.min(1, (apx * abx + apy * aby + apz * abz) / lenSq)) : 0;
  const cx = ax + abx * t - px;
  const cy = ay + aby * t - py;
  const cz = az + abz * t - pz;
  return cx * cx + cy * cy + cz * cz;
}

function bakeSkinWeightsOnGeometry(
  geometry: THREE.BufferGeometry,
  blueprints: BoneBlueprint[],
  rigType: SolarLeoRigType,
  bounds: THREE.Box3
): void {
  const pos = geometry.attributes.position;
  const count = pos.count;
  const skinIndices = new Uint16Array(count * 4);
  const skinWeights = new Float32Array(count * 4);

  const sx = Math.max(0.1, bounds.max.x - bounds.min.x);
  const sy = Math.max(0.1, bounds.max.y - bounds.min.y);
  const y0 = bounds.min.y;
  const torsoW = Math.min(sx, sy * 0.44);
  const headBoneIdx = blueprints.findIndex((bp) => bp.name === 'head');
  const chestBoneIdx = blueprints.findIndex((bp) => bp.name === 'chest');
  const lockHumanoidHead = rigType === 'humanoid' && headBoneIdx >= 0 && chestBoneIdx >= 0;

  const topIdx = [0, 0, 0, 0];
  const topW = [0, 0, 0, 0];

  for (let i = 0; i < count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    const base = i * 4;

    if (lockHumanoidHead) {
      const ny = (py - y0) / sy;
      // Central head/face/hair/crown column (excludes far-outstretched bow tips at +Z or wide staves)
      const inHeadColumn =
        Math.abs(px) <= torsoW * 0.56 &&
        pz >= -torsoW * 0.58 &&
        pz <= torsoW * 0.52;

      if (inHeadColumn && ny >= HUMANOID_HEAD_RIGID_START_NY) {
        // 100% rigid head lock: zero weight bleed from chest/arms/cloak -> face never shears or warps
        skinIndices[base] = headBoneIdx;
        skinIndices[base + 1] = 0;
        skinIndices[base + 2] = 0;
        skinIndices[base + 3] = 0;
        skinWeights[base] = 1;
        skinWeights[base + 1] = 0;
        skinWeights[base + 2] = 0;
        skinWeights[base + 3] = 0;
        continue;
      }

      if (inHeadColumn && ny >= HUMANOID_NECK_BLEND_START_NY) {
        // Clean narrow neck hinge strictly between chest & head
        const t = Math.max(
          0,
          Math.min(
            1,
            (ny - HUMANOID_NECK_BLEND_START_NY) /
              (HUMANOID_HEAD_RIGID_START_NY - HUMANOID_NECK_BLEND_START_NY)
          )
        );
        skinIndices[base] = headBoneIdx;
        skinIndices[base + 1] = chestBoneIdx;
        skinIndices[base + 2] = 0;
        skinIndices[base + 3] = 0;
        skinWeights[base] = t;
        skinWeights[base + 1] = 1 - t;
        skinWeights[base + 2] = 0;
        skinWeights[base + 3] = 0;
        continue;
      }
    }

    topIdx[0] = 0; topIdx[1] = 0; topIdx[2] = 0; topIdx[3] = 0;
    topW[0] = 0; topW[1] = 0; topW[2] = 0; topW[3] = 0;
    const ny = (py - y0) / sy;

    for (let b = 0; b < blueprints.length; b++) {
      // Never allow the humanoid head bone to pull shoulders, bow, or chest below the neck band
      if (lockHumanoidHead && b === headBoneIdx && ny < HUMANOID_NECK_BLEND_START_NY - 0.015) {
        continue;
      }
      const bp = blueprints[b];
      const dSq = pointSegmentDistanceSq(
        px, py, pz,
        bp.head[0], bp.head[1], bp.head[2],
        bp.tail[0], bp.tail[1], bp.tail[2]
      );
      const r = Math.max(0.03, bp.radius);
      let w = Math.exp(-dSq / (2 * r * r)) * (bp.weightBoost ?? 1.0);

      // Clean bilateral & front/back anatomical separation
      if (bp.sideBias === 'left' && px < -0.02) w *= 0.04;
      else if (bp.sideBias === 'right' && px > 0.02) w *= 0.04;
      else if (bp.sideBias === 'back' && pz > 0.04) w *= 0.05;

      if (w > topW[3]) {
        let slot = 3;
        while (slot > 0 && w > topW[slot - 1]) {
          topW[slot] = topW[slot - 1];
          topIdx[slot] = topIdx[slot - 1];
          slot--;
        }
        topW[slot] = w;
        topIdx[slot] = b;
      }
    }

    let sum = topW[0] + topW[1] + topW[2] + topW[3];
    if (!Number.isFinite(sum) || sum <= 1e-8) {
      topIdx[0] = blueprints.length > 1 ? 1 : 0;
      topW[0] = 1;
      topW[1] = 0; topW[2] = 0; topW[3] = 0;
      sum = 1;
    }

    skinIndices[base] = topIdx[0];
    skinIndices[base + 1] = topIdx[1];
    skinIndices[base + 2] = topIdx[2];
    skinIndices[base + 3] = topIdx[3];
    skinWeights[base] = topW[0] / sum;
    skinWeights[base + 1] = topW[1] / sum;
    skinWeights[base + 2] = topW[2] / sum;
    skinWeights[base + 3] = topW[3] / sum;
  }

  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
}

export interface PreparedSolarLeoPart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

export interface PreparedSolarLeoTemplate {
  assetId: SolarLeoAssetId;
  variant: SolarLeoVariant;
  rigType: SolarLeoRigType;
  parts: PreparedSolarLeoPart[];
  blueprints: BoneBlueprint[];
  bounds: THREE.Box3;
  size: THREE.Vector3;
  sharedGeometries: Set<THREE.BufferGeometry>;
  sharedTextures: Set<THREE.Texture>;
}

export interface InstantiatedSolarLeoModel {
  assetId: SolarLeoAssetId;
  rigType: SolarLeoRigType;
  group: THREE.Group;
  visualRoot: THREE.Group;
  bones: Record<string, THREE.Bone>;
  skeleton?: THREE.Skeleton;
  skinnedMeshes: THREE.SkinnedMesh[];
  hitMeshes: THREE.Mesh[];
  saddle?: THREE.Object3D;
  bounds: THREE.Box3;
  size: THREE.Vector3;
  gaitPhase: number;
}

function configureTextureForQuality(
  tex: THREE.Texture | null | undefined,
  maxAnisotropy: number,
  liteMode: boolean,
  sharedTextures: Set<THREE.Texture>
): void {
  if (!tex) return;
  tex.anisotropy = liteMode ? 1 : Math.min(4, Math.max(1, maxAnisotropy));
  tex.userData = { ...(tex.userData ?? {}), sharedCachedTexture: true };
  sharedTextures.add(tex);
}

/**
 * Normalizes a loaded Solar Leo GLB into canonical coordinates (+Z forward, calibrated pivot,
 * grounded at y=0 for characters/mounts or centered at origin for wings/halo/artifact/pet),
 * bakes real 4-bone capsule GPU skinning weights for humanoids/Solarius/Wings, and marks
 * BufferGeometries & Textures as shared cached resources for Dell E5430 VRAM safety.
 */
export function prepareSolarLeoTemplate(
  assetId: SolarLeoAssetId,
  gltfScene: THREE.Object3D,
  maxAnisotropy = 4,
  options?: { liteMode?: boolean }
): PreparedSolarLeoTemplate {
  const spec = SOLAR_LEO_SPECS[assetId];
  const liteMode = Boolean(options?.liteMode);
  const variant: SolarLeoVariant = liteMode ? 'lite' : 'high';

  gltfScene.updateMatrixWorld(true);

  const yawMatrix = new THREE.Matrix4().makeRotationY(spec.facingYawOffset);
  const rawMeshes: Array<{ mesh: THREE.Mesh; worldMat: THREE.Matrix4 }> = [];
  gltfScene.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry) {
      rawMeshes.push({ mesh: obj, worldMat: obj.matrixWorld.clone() });
    }
  });

  // First pass: measure post-yaw bounding box & torso centroid (so forward bows or trailing capes stay centered)
  const rawBox = new THREE.Box3();
  const tmpV = new THREE.Vector3();
  const allBakedTmp: THREE.BufferGeometry[] = [];

  for (const entry of rawMeshes) {
    const g = entry.mesh.geometry.clone();
    g.applyMatrix4(entry.worldMat);
    g.applyMatrix4(yawMatrix);
    g.computeBoundingBox();
    if (g.boundingBox) rawBox.union(g.boundingBox);
    allBakedTmp.push(g);
  }

  const rawSize = new THREE.Vector3();
  const rawCenter = new THREE.Vector3();
  rawBox.getSize(rawSize);
  rawBox.getCenter(rawCenter);

  let pivotX = rawCenter.x;
  let pivotZ = rawCenter.z;
  if (spec.rigType === 'humanoid') {
    // Use upper-body core (y 38%..92%) centroid so Aurelia's forward bow or long capes never push her off-center
    let sumX = 0;
    let sumZ = 0;
    let count = 0;
    for (const g of allBakedTmp) {
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        tmpV.fromBufferAttribute(pos, i);
        const ny = (tmpV.y - rawBox.min.y) / Math.max(0.001, rawSize.y);
        if (ny >= 0.38 && ny <= 0.92) {
          sumX += tmpV.x;
          sumZ += tmpV.z;
          count++;
        }
      }
    }
    if (count > 0) {
      pivotX = sumX / count;
      pivotZ = sumZ / count;
    }
  }

  const scale = spec.targetHeight / Math.max(0.001, rawSize.y);
  const pivotY = spec.groundAtZero ? rawBox.min.y : rawCenter.y;
  const normalizeMat = new THREE.Matrix4()
    .makeScale(scale, scale, scale)
    .multiply(new THREE.Matrix4().makeTranslation(-pivotX, -pivotY, -pivotZ));

  const sharedGeometries = new Set<THREE.BufferGeometry>();
  const sharedTextures = new Set<THREE.Texture>();
  const normalizedBox = new THREE.Box3();
  const parts: PreparedSolarLeoPart[] = [];

  for (let i = 0; i < rawMeshes.length; i++) {
    const geo = allBakedTmp[i];
    geo.applyMatrix4(normalizeMat);
    // Preserve sculpted smooth GLB normals so faces retain their original shading & contours
    if (!geo.attributes.normal) {
      geo.computeVertexNormals();
    }
    geo.computeBoundingBox();
    geo.computeBoundingSphere();
    if (geo.boundingBox) normalizedBox.union(geo.boundingBox);
    geo.userData = { ...(geo.userData ?? {}), sharedCachedGeometry: true };
    sharedGeometries.add(geo);

    const rawMat = rawMeshes[i].mesh.material;
    const srcMat = Array.isArray(rawMat) ? rawMat[0] : rawMat;
    const mat =
      srcMat instanceof THREE.MeshStandardMaterial
        ? srcMat.clone()
        : new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.55, metalness: 0.25 });

    if (mat instanceof THREE.MeshStandardMaterial) {
      configureTextureForQuality(mat.map, maxAnisotropy, liteMode, sharedTextures);
      configureTextureForQuality(mat.normalMap, maxAnisotropy, liteMode, sharedTextures);
      configureTextureForQuality(mat.roughnessMap, maxAnisotropy, liteMode, sharedTextures);
      configureTextureForQuality(mat.metalnessMap, maxAnisotropy, liteMode, sharedTextures);
      configureTextureForQuality(mat.emissiveMap, maxAnisotropy, liteMode, sharedTextures);
      if (liteMode) {
        mat.normalMap = null;
        mat.roughnessMap = null;
        mat.metalnessMap = null;
        mat.roughness = Math.max(0.55, mat.roughness);
        mat.metalness = Math.min(0.45, mat.metalness);
      }
      if (spec.rigType === 'halo' || spec.rigType === 'artifact' || spec.rigType === 'wings') {
        mat.emissive = new THREE.Color(0x451a03);
        mat.emissiveIntensity = liteMode ? 0.14 : 0.22;
      }
      mat.needsUpdate = true;
    }

    parts.push({ geometry: geo, material: mat });
  }

  // Dispose temporary source geometries from parsed GLTF scene (keep textures retained in sharedTextures)
  gltfScene.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry && !sharedGeometries.has(obj.geometry)) {
      obj.geometry.dispose();
    }
  });

  const blueprints = buildBoneBlueprints(spec.rigType, normalizedBox);
  if (blueprints.length > 0) {
    for (const part of parts) {
      bakeSkinWeightsOnGeometry(part.geometry, blueprints, spec.rigType, normalizedBox);
    }
  }

  const size = new THREE.Vector3();
  normalizedBox.getSize(size);

  return {
    assetId,
    variant,
    rigType: spec.rigType,
    parts,
    blueprints,
    bounds: normalizedBox,
    size,
    sharedGeometries,
    sharedTextures,
  };
}

/**
 * Instantiates a live 3D rig (SkinnedMesh Skeleton for Aurelia/4 Skins/Solarius/Wings,
 * or calibrated Group for Astraeo/Astrolabe/Halo) sharing GPU geometry & textures cleanly.
 */
export function instantiateSolarLeoModel(
  template: PreparedSolarLeoTemplate,
  options?: { liteMode?: boolean; scaleMultiplier?: number }
): InstantiatedSolarLeoModel {
  const liteMode = Boolean(options?.liteMode ?? template.variant === 'lite');
  const scaleMult = options?.scaleMultiplier ?? 1;

  const group = new THREE.Group();
  group.name = `SolarLeo_${template.assetId}`;
  const visualRoot = new THREE.Group();
  visualRoot.name = `SolarLeoVisual_${template.assetId}`;
  if (scaleMult !== 1) visualRoot.scale.setScalar(scaleMult);
  group.add(visualRoot);

  const bones: Record<string, THREE.Bone> = {};
  const skinnedMeshes: THREE.SkinnedMesh[] = [];
  const hitMeshes: THREE.Mesh[] = [];
  let skeleton: THREE.Skeleton | undefined;
  let saddle: THREE.Object3D | undefined;

  if (template.blueprints.length > 0) {
    const boneList: THREE.Bone[] = [];
    for (let i = 0; i < template.blueprints.length; i++) {
      const bp = template.blueprints[i];
      const bone = new THREE.Bone();
      bone.name = bp.name;
      if (bp.parent < 0) {
        bone.position.set(bp.head[0], bp.head[1], bp.head[2]);
        visualRoot.add(bone);
      } else {
        const parentBp = template.blueprints[bp.parent];
        bone.position.set(
          bp.head[0] - parentBp.head[0],
          bp.head[1] - parentBp.head[1],
          bp.head[2] - parentBp.head[2]
        );
        boneList[bp.parent].add(bone);
      }
      boneList.push(bone);
      bones[bp.name] = bone;
    }

    if (template.rigType === 'quadruped_mount' && bones.spine) {
      saddle = new THREE.Object3D();
      saddle.name = 'solarius_saddle';
      // Seat rider comfortably atop Solarius's armored mid-back right behind the golden mane
      saddle.position.set(0, template.size.y * 0.25, -template.size.z * 0.03);
      bones.spine.add(saddle);
    }

    visualRoot.updateMatrixWorld(true);
    skeleton = new THREE.Skeleton(boneList);

    for (const part of template.parts) {
      const mat = part.material.clone();
      const skinned = new THREE.SkinnedMesh(part.geometry, mat);
      skinned.castShadow = !liteMode;
      skinned.receiveShadow = false;
      skinned.frustumCulled = false;
      skinned.bind(skeleton);
      visualRoot.add(skinned);
      skinnedMeshes.push(skinned);
      hitMeshes.push(skinned);
    }
  } else {
    for (const part of template.parts) {
      const mat = part.material.clone();
      const mesh = new THREE.Mesh(part.geometry, mat);
      mesh.castShadow = !liteMode && template.rigType === 'pet';
      mesh.receiveShadow = false;
      visualRoot.add(mesh);
      hitMeshes.push(mesh);
    }
  }

  return {
    assetId: template.assetId,
    rigType: template.rigType,
    group,
    visualRoot,
    bones,
    skeleton,
    skinnedMeshes,
    hitMeshes,
    saddle,
    bounds: template.bounds.clone(),
    size: template.size.clone(),
    gaitPhase: 0,
  };
}

// ============================================================================
// TEMPLATE LOADING CACHE & TEARDOWN
// ============================================================================

const parsedTemplateCache = new Map<string, Promise<PreparedSolarLeoTemplate>>();
const resolvedTemplates = new Map<string, PreparedSolarLeoTemplate>();

export function getCachedSolarLeoTemplateSync(
  assetId: SolarLeoAssetId,
  variant: SolarLeoVariant
): PreparedSolarLeoTemplate | null {
  return resolvedTemplates.get(cacheKey(assetId, variant)) ?? null;
}

export function loadSolarLeoTemplate(
  assetId: SolarLeoAssetId,
  variant: SolarLeoVariant,
  maxAnisotropy: number,
  options: DownloadSolarLeoOptions = {}
): Promise<PreparedSolarLeoTemplate> {
  const key = cacheKey(assetId, variant);
  const existing = parsedTemplateCache.get(key);
  if (existing) return existing;

  const task = (async () => {
    const baseUrl = options.baseUrl ?? '/';
    const baseUri =
      options.baseUri ?? (typeof document !== 'undefined' ? document.baseURI : 'http://localhost:3000/');
    const assetUrl = getSolarLeoAssetUrl(assetId, variant, baseUrl, baseUri);
    const bytes = await downloadSolarLeoArrayBuffer(assetId, variant, options);
    const gltf = await new GLTFLoader().parseAsync(bytes, new URL('.', assetUrl).href);
    const prepared = prepareSolarLeoTemplate(assetId, gltf.scene, maxAnisotropy, {
      liteMode: variant === 'lite',
    });
    resolvedTemplates.set(key, prepared);
    return prepared;
  })().catch((err) => {
    parsedTemplateCache.delete(key);
    throw err;
  });

  parsedTemplateCache.set(key, task);
  return task;
}

export function disposeSolarLeoTemplateCache(): void {
  for (const tpl of resolvedTemplates.values()) {
    tpl.sharedGeometries.forEach((geo) => {
      if (geo.userData) delete geo.userData.sharedCachedGeometry;
      geo.dispose();
    });
    tpl.sharedTextures.forEach((tex) => {
      if (tex.userData) delete tex.userData.sharedCachedTexture;
      tex.dispose();
    });
    tpl.parts.forEach((part) => part.material.dispose());
  }
  resolvedTemplates.clear();
  parsedTemplateCache.clear();
}

// ============================================================================
// ZERO-GC REAL SKELETAL & 3D PROCEDURAL ANIMATION UPDATERS
// ============================================================================

export interface SolarLeoHeroAnimInput {
  elapsed: number;
  dt: number;
  speed: number;
  shooting: boolean;
  shootRecoil: number;
  dashing: boolean;
  riding: boolean;
  ultBurst: number;
  lobbyPose?: 'heroic' | 'aim_ready' | 'astral_float' | 'victory_salute';
}

export function updateSolarLeoHumanoidPose(
  rig: InstantiatedSolarLeoModel,
  input: SolarLeoHeroAnimInput
): void {
  const { elapsed, dt, speed, shooting, shootRecoil, dashing, riding, ultBurst, lobbyPose } = input;
  const b = rig.bones;
  if (!b.pelvis || !b.chest) return;

  const moveFactor = riding ? 0 : Math.min(1, speed / 5.5);
  rig.gaitPhase += dt * (2.6 + moveFactor * 9.8);
  const g = rig.gaitPhase;
  const s = Math.sin(g);
  const c = Math.cos(g);
  const breath = Math.sin(elapsed * 2.5);
  const lam = 14;

  let rootY = 0;
  let pelvisPitch = 0;
  let pelvisRoll = 0;
  let spinePitch = 0;
  let chestYaw = 0;
  let chestPitch = breath * 0.025;
  let headPitch = -breath * 0.015;
  let headYaw = Math.sin(elapsed * 1.1) * 0.04;

  let legLPitch = 0;
  let legRPitch = 0;
  let legLRoll = 0;
  let legRRoll = 0;

  let armLPitch = -0.06 + breath * 0.03;
  let armRPitch = -0.06 - breath * 0.03;
  let armLRoll = 0.05;
  let armRRoll = -0.05;
  let handLPitch = 0;
  let handRPitch = 0;

  let cloakPitch = 0.08 + Math.sin(elapsed * 2.8) * 0.06;
  let cloakRoll = Math.cos(elapsed * 1.9) * 0.04;

  if (riding) {
    // Mounted saddle posture: legs straddle cleanly, torso upright & stabilized
    pelvisPitch = -0.06;
    legLPitch = -0.78;
    legRPitch = -0.78;
    legLRoll = 0.34;
    legRRoll = -0.34;
    cloakPitch = 0.28 + Math.min(0.45, speed * 0.05) + Math.sin(elapsed * 5.2) * 0.06;
    armLPitch = -0.22;
    armRPitch = -0.22;
  } else if (moveFactor > 0.08) {
    // Distance-driven stride with weight & counter-swing
    rootY = Math.abs(s) * 0.075 * moveFactor;
    pelvisPitch = 0.09 * moveFactor;
    pelvisRoll = s * 0.055 * moveFactor;
    spinePitch = 0.06 * moveFactor;
    chestYaw = -s * 0.11 * moveFactor;
    legLPitch = s * 0.56 * moveFactor;
    legRPitch = -s * 0.56 * moveFactor;
    armLPitch = -s * 0.36 * moveFactor;
    armRPitch = s * 0.36 * moveFactor;
    cloakPitch = 0.24 * moveFactor + Math.abs(c) * 0.14 * moveFactor;
    cloakRoll = s * 0.08 * moveFactor;
  } else if (lobbyPose === 'aim_ready') {
    chestYaw = 0.18;
    armLPitch = -0.58;
    armRPitch = -0.42;
    headYaw = -0.1;
  } else if (lobbyPose === 'astral_float') {
    rootY = 0.14 + Math.sin(elapsed * 2.2) * 0.07;
    legLPitch = 0.16;
    legRPitch = 0.24;
    armLRoll = 0.28;
    armRRoll = -0.28;
    cloakPitch = 0.22 + Math.sin(elapsed * 3.1) * 0.1;
  } else if (lobbyPose === 'victory_salute') {
    armRPitch = -0.82;
    armRRoll = -0.22;
    chestPitch = -0.06;
  }

  if (shooting || shootRecoil > 0.01) {
    const recoil = Math.min(1, shootRecoil);
    chestYaw += 0.2 - recoil * 0.1;
    chestPitch -= 0.05 + recoil * 0.08;
    armLPitch = -0.62 - recoil * 0.16;
    handLPitch = -0.22;
    armRPitch = -0.54 + recoil * 0.32;
    handRPitch = 0.18 * recoil;
    headYaw = -0.1;
  }

  if (dashing) {
    pelvisPitch += 0.22;
    spinePitch += 0.14;
    cloakPitch += 0.42;
  }

  if (ultBurst > 0.01) {
    const u = Math.min(1, ultBurst);
    rootY += 0.22 * u;
    chestPitch -= 0.14 * u;
    armLRoll += 0.42 * u;
    armRRoll -= 0.42 * u;
    cloakPitch += 0.35 * u;
  }

  rig.visualRoot.position.y = THREE.MathUtils.damp(rig.visualRoot.position.y, rootY, lam, dt);
  b.pelvis.rotation.x = THREE.MathUtils.damp(b.pelvis.rotation.x, pelvisPitch, lam, dt);
  b.pelvis.rotation.z = THREE.MathUtils.damp(b.pelvis.rotation.z, pelvisRoll, lam, dt);
  if (b.spine) b.spine.rotation.x = THREE.MathUtils.damp(b.spine.rotation.x, spinePitch, lam, dt);
  b.chest.rotation.x = THREE.MathUtils.damp(b.chest.rotation.x, chestPitch, lam, dt);
  b.chest.rotation.y = THREE.MathUtils.damp(b.chest.rotation.y, chestYaw, lam, dt);
  if (b.head) {
    b.head.rotation.x = THREE.MathUtils.damp(b.head.rotation.x, headPitch, lam, dt);
    b.head.rotation.y = THREE.MathUtils.damp(b.head.rotation.y, headYaw, lam, dt);
  }
  if (b.armL) {
    b.armL.rotation.x = THREE.MathUtils.damp(b.armL.rotation.x, armLPitch, lam, dt);
    b.armL.rotation.z = THREE.MathUtils.damp(b.armL.rotation.z, armLRoll, lam, dt);
  }
  if (b.handL) b.handL.rotation.x = THREE.MathUtils.damp(b.handL.rotation.x, handLPitch, lam, dt);
  if (b.armR) {
    b.armR.rotation.x = THREE.MathUtils.damp(b.armR.rotation.x, armRPitch, lam, dt);
    b.armR.rotation.z = THREE.MathUtils.damp(b.armR.rotation.z, armRRoll, lam, dt);
  }
  if (b.handR) b.handR.rotation.x = THREE.MathUtils.damp(b.handR.rotation.x, handRPitch, lam, dt);
  if (b.legL) {
    b.legL.rotation.x = THREE.MathUtils.damp(b.legL.rotation.x, legLPitch, lam, dt);
    b.legL.rotation.z = THREE.MathUtils.damp(b.legL.rotation.z, legLRoll, lam, dt);
  }
  if (b.legR) {
    b.legR.rotation.x = THREE.MathUtils.damp(b.legR.rotation.x, legRPitch, lam, dt);
    b.legR.rotation.z = THREE.MathUtils.damp(b.legR.rotation.z, legRRoll, lam, dt);
  }
  if (b.cloak) {
    b.cloak.rotation.x = THREE.MathUtils.damp(b.cloak.rotation.x, cloakPitch, lam, dt);
    b.cloak.rotation.z = THREE.MathUtils.damp(b.cloak.rotation.z, cloakRoll, lam, dt);
  }
}

export function updateSolarLeoMountPose(
  rig: InstantiatedSolarLeoModel,
  elapsed: number,
  dt: number,
  speed: number,
  sprint = false
): void {
  const b = rig.bones;
  if (!b.pelvis || !b.chest) return;

  const moveFactor = Math.min(1, speed / 5.2);
  const tempo = sprint ? 1.32 : 1.0;
  rig.gaitPhase += dt * (2.4 + moveFactor * 10.6 * tempo);
  const g = rig.gaitPhase;
  const breath = Math.sin(elapsed * 2.4);
  const lam = 13;

  // Rotary quadruped gallop (paired diagonal-offset front & rear legs)
  const gallopBounce = moveFactor > 0.06 ? Math.abs(Math.sin(g)) * 0.13 * moveFactor : 0;
  const spineFlex = moveFactor > 0.06 ? Math.cos(g) * 0.11 * moveFactor : breath * 0.02;

  const fl = moveFactor > 0.06 ? Math.sin(g) * 0.62 * moveFactor : 0;
  const fr = moveFactor > 0.06 ? Math.sin(g + 0.65) * 0.62 * moveFactor : 0;
  const bl = moveFactor > 0.06 ? Math.sin(g + Math.PI) * 0.58 * moveFactor : 0;
  const br = moveFactor > 0.06 ? Math.sin(g + Math.PI + 0.65) * 0.58 * moveFactor : 0;

  rig.visualRoot.position.y = THREE.MathUtils.damp(rig.visualRoot.position.y, gallopBounce, lam, dt);
  b.pelvis.rotation.x = THREE.MathUtils.damp(b.pelvis.rotation.x, spineFlex * 0.55, lam, dt);
  if (b.spine) b.spine.rotation.x = THREE.MathUtils.damp(b.spine.rotation.x, -spineFlex * 0.75, lam, dt);
  b.chest.rotation.x = THREE.MathUtils.damp(b.chest.rotation.x, spineFlex * 0.5 + breath * 0.025, lam, dt);
  if (b.head) {
    b.head.rotation.x = THREE.MathUtils.damp(b.head.rotation.x, -spineFlex * 0.35 - breath * 0.03, lam, dt);
    b.head.rotation.y = THREE.MathUtils.damp(b.head.rotation.y, Math.sin(elapsed * 1.4) * 0.08 * (1 - moveFactor * 0.6), lam, dt);
  }
  if (b.legFL) b.legFL.rotation.x = THREE.MathUtils.damp(b.legFL.rotation.x, fl, lam, dt);
  if (b.legFR) b.legFR.rotation.x = THREE.MathUtils.damp(b.legFR.rotation.x, fr, lam, dt);
  if (b.legBL) b.legBL.rotation.x = THREE.MathUtils.damp(b.legBL.rotation.x, bl, lam, dt);
  if (b.legBR) b.legBR.rotation.x = THREE.MathUtils.damp(b.legBR.rotation.x, br, lam, dt);
  if (b.tail1) {
    b.tail1.rotation.y = THREE.MathUtils.damp(b.tail1.rotation.y, Math.sin(elapsed * (3.2 + moveFactor * 4)) * 0.24, lam, dt);
    b.tail1.rotation.x = THREE.MathUtils.damp(b.tail1.rotation.x, 0.08 + moveFactor * 0.16, lam, dt);
  }
  if (b.tail2) {
    b.tail2.rotation.y = THREE.MathUtils.damp(b.tail2.rotation.y, Math.sin(elapsed * (3.2 + moveFactor * 4) - 0.8) * 0.32, lam, dt);
  }
}

export function updateSolarLeoWingsPose(
  rig: InstantiatedSolarLeoModel,
  elapsed: number,
  dt: number,
  speed: number,
  dashing = false,
  ultBurst = 0
): void {
  const b = rig.bones;
  if (!b.wingL1 || !b.wingR1) return;

  const moveFactor = Math.min(1, speed / 5.5);
  const boost = dashing ? 1.55 : ultBurst > 0.01 ? 1.45 : 1.0;
  rig.gaitPhase += dt * (2.8 + moveFactor * 4.2) * boost;
  const g = rig.gaitPhase;

  const innerFlap = Math.sin(g) * (0.24 + moveFactor * 0.18 + (dashing ? 0.16 : 0));
  const outerFlap = Math.sin(g - 0.72) * (0.18 + moveFactor * 0.16);
  const sweepBack = 0.18 + moveFactor * 0.16 + (dashing ? 0.22 : 0);
  const lam = 14;

  b.wingL1.rotation.y = THREE.MathUtils.damp(b.wingL1.rotation.y, -sweepBack - innerFlap, lam, dt);
  b.wingL1.rotation.z = THREE.MathUtils.damp(b.wingL1.rotation.z, Math.cos(g) * 0.08, lam, dt);
  if (b.wingL2) b.wingL2.rotation.y = THREE.MathUtils.damp(b.wingL2.rotation.y, -outerFlap, lam, dt);

  b.wingR1.rotation.y = THREE.MathUtils.damp(b.wingR1.rotation.y, sweepBack + innerFlap, lam, dt);
  b.wingR1.rotation.z = THREE.MathUtils.damp(b.wingR1.rotation.z, -Math.cos(g) * 0.08, lam, dt);
  if (b.wingR2) b.wingR2.rotation.y = THREE.MathUtils.damp(b.wingR2.rotation.y, outerFlap, lam, dt);

  rig.visualRoot.position.y = Math.sin(elapsed * 2.8) * 0.035;
}

export function updateSolarLeoPetPose(
  rig: InstantiatedSolarLeoModel,
  elapsed: number,
  dt: number,
  attackRecoil = 0
): void {
  const lam = 12;
  const bob = Math.sin(elapsed * 3.8) * 0.09;
  const roll = Math.sin(elapsed * 2.3) * 0.1;
  const pitch = 0.06 + Math.cos(elapsed * 3.1) * 0.06 + attackRecoil * 0.28;
  const lungeZ = attackRecoil * 0.22;
  rig.visualRoot.position.y = THREE.MathUtils.damp(rig.visualRoot.position.y, bob, lam, dt);
  rig.visualRoot.position.z = THREE.MathUtils.damp(rig.visualRoot.position.z, lungeZ, lam, dt);
  rig.visualRoot.rotation.x = THREE.MathUtils.damp(rig.visualRoot.rotation.x, pitch, lam, dt);
  rig.visualRoot.rotation.z = THREE.MathUtils.damp(rig.visualRoot.rotation.z, roll, lam, dt);
}

export function updateSolarLeoArtifactPose(
  rig: InstantiatedSolarLeoModel,
  elapsed: number,
  dt: number
): void {
  rig.visualRoot.rotation.y += dt * 1.45;
  rig.visualRoot.rotation.x = Math.sin(elapsed * 1.8) * 0.24;
  rig.visualRoot.rotation.z = Math.cos(elapsed * 1.35) * 0.18;
  rig.visualRoot.position.y = Math.sin(elapsed * 2.9) * 0.06;
}

export function updateSolarLeoHaloPose(
  rig: InstantiatedSolarLeoModel,
  elapsed: number,
  dt: number
): void {
  rig.visualRoot.rotation.z += dt * 0.52;
  rig.visualRoot.rotation.x = Math.sin(elapsed * 1.6) * 0.06;
  const pulse = 1 + Math.sin(elapsed * 3.2) * 0.03;
  rig.visualRoot.scale.setScalar(pulse);
}

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

/**
 * Spatial predicate identifying Aurelia's sculpted forward drawn bow, arrow shaft,
 * arrowhead, and outstretched bow-holding forearm in canonical normalized coordinates.
 * Locking this entire assembly 100% rigidly to `chest` prevents cross-bone shear from
 * `head`, `legR`, `pelvis`, and `handR` from bending the bow limbs or arrow shaft.
 */
export function isAureliaSculptedBowOrArrowVertex(px: number, py: number, pz: number): boolean {
  // 1. Entire bow (upper limb, riser/grip, lower limb) + front arrow shaft + arrowhead
  if (pz >= 0.37 && py >= 0.77) return true;
  // 2. Rear arrow shaft & drawing hand fingers (below chin y<=1.60, in front of torso z>=0.28)
  if (pz >= 0.28 && py >= 1.44 && py <= 1.60 && px <= 0.09) return true;
  // 3. Outstretched right bow-arm connecting shoulder to bow grip
  if (pz >= 0.16 && py >= 1.32 && py <= 1.60 && px <= -0.14) return true;
  return false;
}

export interface SculptedBowStringAnchors {
  /** Upper bow tip nock in `chest` bone local space */
  upperNockLocal: THREE.Vector3;
  /** Lower bow tip nock in `chest` bone local space */
  lowerNockLocal: THREE.Vector3;
  /** Drawn arrow rear nock (inside drawing hand) in `chest` bone local space */
  drawnNockLocal: THREE.Vector3;
  /** Straight brace chord midpoint (at shot release) in `chest` bone local space */
  braceNockLocal: THREE.Vector3;
}

export interface SolarLeoBowStringRig {
  group: THREE.Group;
  upperCore: THREE.Mesh;
  lowerCore: THREE.Mesh;
  upperGlow?: THREE.Mesh;
  lowerGlow?: THREE.Mesh;
  nockSpark: THREE.Mesh;
  anchors: SculptedBowStringAnchors;
  currentPull: number;
}

export type SolarLeoPetTrickKind =
  | 'curious_peek'
  | 'happy_spin'
  | 'playful_barrel_roll'
  | 'figure_eight_swoop'
  | 'joy_hop_bounce';

export interface SolarLeoPetPoseOptions {
  mode?: 'lobby' | 'combat';
  speed?: number;
  bankAngle?: number;
  dashing?: boolean;
  celebrating?: boolean;
}

export interface SolarLeoPetTrickFrame {
  trick: SolarLeoPetTrickKind;
  phase: number;
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  yawOffset: number;
  pitchOffset: number;
  rollOffset: number;
  headTiltZ: number;
  headYaw: number;
  headPitch: number;
  wingSpeedMult: number;
  wingAmpMult: number;
  tailWagSpeedMult: number;
  squashY: number;
  sparkleBoost: number;
}

export interface SolarLeoPetAuraRig {
  group: THREE.Group;
  motes: THREE.InstancedMesh;
  moteCount: number;
  orbitRing?: THREE.Mesh;
}

export type SolarLeoMountActionKind =
  | 'regal_breathe_survey'
  | 'solar_paw_stomp'
  | 'majestic_roar'
  | 'proud_prowl_shift';

export interface SolarLeoMountPoseOptions {
  mode?: 'lobby' | 'combat';
  bankAngle?: number;
  celebrating?: boolean;
}

export interface SolarLeoMountActionFrame {
  action: SolarLeoMountActionKind;
  phase: number;
  bodyLiftY: number;
  pelvisPitch: number;
  spinePitch: number;
  chestPitch: number;
  headPitch: number;
  headYaw: number;
  headRoll: number;
  legFLPitch: number;
  legFRPitch: number;
  legBLPitch: number;
  legBRPitch: number;
  tailWagSpeedMult: number;
  tailWagAmpMult: number;
  emberBoost: number;
  stompPulse: number;
}

export interface SolarLeoMountAuraRig {
  group: THREE.Group;
  embers: THREE.InstancedMesh;
  emberCount: number;
  groundRing?: THREE.Mesh;
}

export type SolarLeoWingShowcaseKind =
  | 'majestic_unfurl'
  | 'seraphic_hover'
  | 'sunburst_ripple'
  | 'radiant_flourish';

export interface SolarLeoWingsPoseOptions {
  mode?: 'lobby' | 'combat';
  bankAngle?: number;
  celebrating?: boolean;
}

export interface SolarLeoWingShowcaseFrame {
  showcase: SolarLeoWingShowcaseKind;
  phase: number;
  flapSpeedMult: number;
  innerAmpMult: number;
  outerAmpMult: number;
  sweepBase: number;
  liftZ: number;
  featherTwist: number;
  asymmetry: number;
  hoverY: number;
  rollZ: number;
  sparkleBoost: number;
}

export interface SolarLeoWingsAuraRig {
  group: THREE.Group;
  feathers: THREE.InstancedMesh;
  featherCount: number;
}

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

  if (rigType === 'pet') {
    // Expressive 7-bone winged celestial lion-cub rig (Astraeo):
    // flapping left/right wings, curious tilting head (rigid face lock), wagging tail, and kicking paws.
    return [
      // 0: root
      { name: 'root', parent: -1, head: [0, 0, 0], tail: [0, sy * 0.05, 0], radius: sx * 0.14, sideBias: 'center', weightBoost: 0.12 },
      // 1: torso (chest & body core)
      { name: 'torso', parent: 0, head: [0, 0, 0.02], tail: [0, sy * 0.06, sz * 0.16], radius: sx * 0.24, sideBias: 'center', weightBoost: 1.35 },
      // 2: head (cute lion cub head + mane, face vertices rigid-locked)
      { name: 'head', parent: 1, head: [0, sy * 0.12, sz * 0.22], tail: [0, sy * 0.34, sz * 0.44], radius: sx * 0.24, sideBias: 'center', weightBoost: 1.65 },
      // 3: wingL (+X feathered wing)
      { name: 'wingL', parent: 1, head: [sx * 0.18, sy * 0.06, sz * 0.17], tail: [sx * 0.48, sy * 0.08, sz * 0.26], radius: sx * 0.18, sideBias: 'left', weightBoost: 1.8 },
      // 4: wingR (-X feathered wing)
      { name: 'wingR', parent: 1, head: [-sx * 0.18, sy * 0.02, sz * 0.08], tail: [-sx * 0.48, sy * 0.00, sz * 0.12], radius: sx * 0.18, sideBias: 'right', weightBoost: 1.8 },
      // 5: tail (-Z curly celestial tail)
      { name: 'tail', parent: 1, head: [-sx * 0.10, -sy * 0.20, -sz * 0.15], tail: [-sx * 0.20, -sy * 0.36, -sz * 0.48], radius: sx * 0.19, sideBias: 'back', weightBoost: 1.85 },
      // 6: paws (lower floating paws)
      { name: 'paws', parent: 1, head: [-sx * 0.05, -sy * 0.20, sz * 0.13], tail: [-sx * 0.10, -sy * 0.43, sz * 0.20], radius: sx * 0.20, sideBias: 'center', weightBoost: 1.5 },
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
  bounds: THREE.Box3,
  lockSculptedDrawnBow = false
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
  const petWingLIdx = rigType === 'pet' ? blueprints.findIndex((bp) => bp.name === 'wingL') : -1;
  const petWingRIdx = rigType === 'pet' ? blueprints.findIndex((bp) => bp.name === 'wingR') : -1;
  const petTailIdx = rigType === 'pet' ? blueprints.findIndex((bp) => bp.name === 'tail') : -1;
  const petPawsIdx = rigType === 'pet' ? blueprints.findIndex((bp) => bp.name === 'paws') : -1;
  const lockHumanoidHead = rigType === 'humanoid' && headBoneIdx >= 0 && chestBoneIdx >= 0;
  const lockPetHead = rigType === 'pet' && headBoneIdx >= 0;
  const lockBowRigid = lockSculptedDrawnBow && rigType === 'humanoid' && chestBoneIdx >= 0;

  const topIdx = [0, 0, 0, 0];
  const topW = [0, 0, 0, 0];

  for (let i = 0; i < count; i++) {
    const px = pos.getX(i);
    const py = pos.getY(i);
    const pz = pos.getZ(i);
    const base = i * 4;

    if (lockPetHead) {
      // Rigid-lock Astraeo's adorable lion-cub face & golden eyes to `head` so cute head-tilts never warp his face
      if (pz >= 0.30 && py >= 0.04 && Math.abs(px) <= 0.19) {
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
      // Clean outer wingtip isolation so rapid wingbeats flutter cleanly without pulling face/tail
      if (petWingLIdx >= 0 && px >= 0.26 && py >= -0.22) {
        skinIndices[base] = petWingLIdx;
        skinIndices[base + 1] = 0;
        skinIndices[base + 2] = 0;
        skinIndices[base + 3] = 0;
        skinWeights[base] = 1;
        skinWeights[base + 1] = 0;
        skinWeights[base + 2] = 0;
        skinWeights[base + 3] = 0;
        continue;
      }
      if (petWingRIdx >= 0 && px <= -0.26 && pz >= -0.14 && py >= -0.24) {
        skinIndices[base] = petWingRIdx;
        skinIndices[base + 1] = 0;
        skinIndices[base + 2] = 0;
        skinIndices[base + 3] = 0;
        skinWeights[base] = 1;
        skinWeights[base + 1] = 0;
        skinWeights[base + 2] = 0;
        skinWeights[base + 3] = 0;
        continue;
      }
    }

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

      if (lockBowRigid && isAureliaSculptedBowOrArrowVertex(px, py, pz)) {
        // 100% rigid chest lock for sculpted bow limbs, grip, and arrow shaft so head/legR/handR never bend them
        skinIndices[base] = chestBoneIdx;
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
    } else if (lockBowRigid && isAureliaSculptedBowOrArrowVertex(px, py, pz)) {
      skinIndices[base] = chestBoneIdx;
      skinIndices[base + 1] = 0;
      skinIndices[base + 2] = 0;
      skinIndices[base + 3] = 0;
      skinWeights[base] = 1;
      skinWeights[base + 1] = 0;
      skinWeights[base + 2] = 0;
      skinWeights[base + 3] = 0;
      continue;
    }

    topIdx[0] = 0; topIdx[1] = 0; topIdx[2] = 0; topIdx[3] = 0;
    topW[0] = 0; topW[1] = 0; topW[2] = 0; topW[3] = 0;
    const ny = (py - y0) / sy;

    for (let b = 0; b < blueprints.length; b++) {
      // Never allow the humanoid head bone to pull shoulders, bow, or chest below the neck band
      if (lockHumanoidHead && b === headBoneIdx && ny < HUMANOID_NECK_BLEND_START_NY - 0.015) {
        continue;
      }
      // Keep Astraeo's tail strictly isolated from head/wings/paws
      if (lockPetHead && pz <= -0.22 && (b === headBoneIdx || b === petWingLIdx || b === petPawsIdx)) {
        continue;
      }
      if (lockPetHead && pz >= 0.24 && b === petTailIdx) {
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
  hasSculptedDrawnBow?: boolean;
  bowStringAnchors?: SculptedBowStringAnchors;
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
  hasSculptedDrawnBow?: boolean;
  bowStringRig?: SolarLeoBowStringRig;
  petAuraRig?: SolarLeoPetAuraRig;
  mountAuraRig?: SolarLeoMountAuraRig;
  wingsAuraRig?: SolarLeoWingsAuraRig;
  bounds: THREE.Box3;
  size: THREE.Vector3;
  gaitPhase: number;
}

/**
 * Calibrates exact upper nock, lower nock, drawn arrow nock, and brace chord midpoint
 * directly from Aurelia's normalized mesh vertices and converts them into `chest`-local space.
 */
function calibrateSculptedBowStringAnchors(
  parts: PreparedSolarLeoPart[],
  chestHead: [number, number, number]
): SculptedBowStringAnchors {
  let maxUpperY = -Infinity;
  let minLowerY = Infinity;

  for (const part of parts) {
    const pos = part.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (z > 0.60 && y > maxUpperY) maxUpperY = y;
      if (z > 0.45 && x < -0.05 && y > 0.77 && y < minLowerY) minLowerY = y;
    }
  }

  let ux = 0, uy = 0, uz = 0, uCount = 0;
  let lx = 0, ly = 0, lz = 0, lCount = 0;
  for (const part of parts) {
    const pos = part.geometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const z = pos.getZ(i);
      if (z > 0.60 && y >= maxUpperY - 0.04) {
        ux += x; uy += y; uz += z; uCount++;
      }
      if (z > 0.45 && x < -0.05 && y >= minLowerY && y <= minLowerY + 0.05) {
        lx += x; ly += y; lz += z; lCount++;
      }
    }
  }

  // Fallback to canonical measured Aurelia High coordinates if mesh bounds are degenerate
  const upperWorld = uCount > 0
    ? new THREE.Vector3(ux / uCount, uy / uCount - 0.022, uz / uCount - 0.008)
    : new THREE.Vector3(-0.180, 2.002, 0.764);
  // Seat lower nock squarely inside the solid lower recurve horn (above the thin decorative tail tip)
  const lowerWorld = lCount > 0
    ? new THREE.Vector3(lx / lCount - 0.014, ly / lCount + 0.072, lz / lCount + 0.024)
    : new THREE.Vector3(-0.161, 0.892, 0.561);

  const arrowY = 1.546;
  const spanY = Math.max(0.1, upperWorld.y - lowerWorld.y);
  const tArrow = THREE.MathUtils.clamp((arrowY - lowerWorld.y) / spanY, 0.25, 0.75);
  const braceWorld = new THREE.Vector3().lerpVectors(lowerWorld, upperWorld, tArrow);
  // Exact rear arrow nock seated inside Aurelia's left drawing hand relative to the bow chord
  const drawnWorld = braceWorld.clone().add(new THREE.Vector3(0.162, 0.0, -0.314));

  const chestOrigin = new THREE.Vector3(chestHead[0], chestHead[1], chestHead[2]);
  return {
    upperNockLocal: upperWorld.sub(chestOrigin),
    lowerNockLocal: lowerWorld.sub(chestOrigin),
    drawnNockLocal: drawnWorld.sub(chestOrigin),
    braceNockLocal: braceWorld.sub(chestOrigin),
  };
}

const _bsUp = new THREE.Vector3(0, 1, 0);
const _bsDir = new THREE.Vector3();
const _bsMid = new THREE.Vector3();
const _bsActiveNock = new THREE.Vector3();

function orientStringSegment(mesh: THREE.Mesh, a: THREE.Vector3, b: THREE.Vector3): void {
  _bsMid.addVectors(a, b).multiplyScalar(0.5);
  _bsDir.subVectors(b, a);
  const len = _bsDir.length();
  mesh.position.copy(_bsMid);
  if (len > 1e-5) {
    _bsDir.divideScalar(len);
    mesh.quaternion.setFromUnitVectors(_bsUp, _bsDir);
    mesh.scale.set(1, len, 1);
  }
}

function updateSolarLeoBowStringGeometry(rig: SolarLeoBowStringRig, pullFactor: number, twangOffset = 0): void {
  const { upperNockLocal, lowerNockLocal, drawnNockLocal, braceNockLocal } = rig.anchors;
  const clampedPull = THREE.MathUtils.clamp(pullFactor, 0, 1.05);
  _bsActiveNock.lerpVectors(braceNockLocal, drawnNockLocal, clampedPull);
  if (twangOffset !== 0) {
    _bsActiveNock.x += twangOffset * 0.018;
    _bsActiveNock.z += twangOffset * 0.024;
  }
  orientStringSegment(rig.upperCore, upperNockLocal, _bsActiveNock);
  orientStringSegment(rig.lowerCore, lowerNockLocal, _bsActiveNock);
  if (rig.upperGlow) orientStringSegment(rig.upperGlow, upperNockLocal, _bsActiveNock);
  if (rig.lowerGlow) orientStringSegment(rig.lowerGlow, lowerNockLocal, _bsActiveNock);
  rig.nockSpark.position.copy(_bsActiveNock);
  rig.currentPull = clampedPull;
}

function createSolarLeoBowStringRig(
  anchors: SculptedBowStringAnchors,
  liteMode: boolean
): SolarLeoBowStringRig {
  const group = new THREE.Group();
  group.name = 'AureliaBowStringRig';

  const radialSegs = liteMode ? 6 : 8;
  // Unit-length cylinder along +Y scaled dynamically to exact nock-to-nock distance
  const coreGeo = new THREE.CylinderGeometry(0.0068, 0.0068, 1, radialSegs, 1, false);
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0xfffbeb,
    emissive: new THREE.Color(0xfde68a),
    emissiveIntensity: liteMode ? 0.95 : 1.15,
    roughness: 0.22,
    metalness: 0.15,
  });

  const upperCore = new THREE.Mesh(coreGeo, coreMat);
  upperCore.name = 'bowStringUpperCore';
  upperCore.castShadow = false;
  upperCore.receiveShadow = false;

  const lowerCore = new THREE.Mesh(coreGeo, coreMat);
  lowerCore.name = 'bowStringLowerCore';
  lowerCore.castShadow = false;
  lowerCore.receiveShadow = false;

  group.add(upperCore, lowerCore);

  let upperGlow: THREE.Mesh | undefined;
  let lowerGlow: THREE.Mesh | undefined;
  if (!liteMode) {
    const glowGeo = new THREE.CylinderGeometry(0.0135, 0.0135, 1, 6, 1, true);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.28,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    upperGlow = new THREE.Mesh(glowGeo, glowMat);
    upperGlow.name = 'bowStringUpperGlow';
    lowerGlow = new THREE.Mesh(glowGeo, glowMat);
    lowerGlow.name = 'bowStringLowerGlow';
    group.add(upperGlow, lowerGlow);
  }

  // Subtle golden nock-fastener knots at both recurve bow tips + starlight nock glint at arrow tail
  const tipKnotGeo = new THREE.SphereGeometry(0.015, 6, 6);
  const tipKnotMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: new THREE.Color(0xf59e0b),
    emissiveIntensity: 0.6,
    roughness: 0.3,
    metalness: 0.75,
  });
  const upperKnot = new THREE.Mesh(tipKnotGeo, tipKnotMat);
  upperKnot.position.copy(anchors.upperNockLocal);
  const lowerKnot = new THREE.Mesh(tipKnotGeo, tipKnotMat);
  lowerKnot.position.copy(anchors.lowerNockLocal);

  const nockSpark = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.017, 0),
    new THREE.MeshBasicMaterial({
      color: 0xfffbeb,
      transparent: true,
      opacity: 0.85,
    })
  );
  nockSpark.name = 'bowStringArrowNock';

  group.add(upperKnot, lowerKnot, nockSpark);

  const rig: SolarLeoBowStringRig = {
    group,
    upperCore,
    lowerCore,
    upperGlow,
    lowerGlow,
    nockSpark,
    anchors,
    currentPull: 1,
  };
  updateSolarLeoBowStringGeometry(rig, 1, 0);
  return rig;
}

function configureTextureForQuality(
  tex: THREE.Texture | null | undefined,
  maxAnisotropy: number,
  liteMode: boolean,
  sharedTextures: Set<THREE.Texture>
): void {
  if (!tex) return;
  tex.anisotropy = liteMode
    ? Math.min(2, Math.max(1, maxAnisotropy))
    : Math.min(8, Math.max(1, maxAnisotropy));
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
  const hasSculptedDrawnBow = assetId === 'aurelia' && normalizedBox.max.z > 0.95;
  if (blueprints.length > 0) {
    for (const part of parts) {
      bakeSkinWeightsOnGeometry(part.geometry, blueprints, spec.rigType, normalizedBox, hasSculptedDrawnBow);
    }
  }

  const chestBp = blueprints.find((bp) => bp.name === 'chest');
  const bowStringAnchors =
    hasSculptedDrawnBow && chestBp
      ? calibrateSculptedBowStringAnchors(parts, chestBp.head)
      : undefined;

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
    hasSculptedDrawnBow,
    bowStringAnchors,
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

  let bowStringRig: SolarLeoBowStringRig | undefined;
  if (template.hasSculptedDrawnBow && template.bowStringAnchors && bones.chest) {
    bowStringRig = createSolarLeoBowStringRig(template.bowStringAnchors, liteMode);
    bones.chest.add(bowStringRig.group);
  }

  let petAuraRig: SolarLeoPetAuraRig | undefined;
  if (template.rigType === 'pet') {
    petAuraRig = createSolarLeoPetAuraRig(liteMode);
    group.add(petAuraRig.group);
  }

  let mountAuraRig: SolarLeoMountAuraRig | undefined;
  if (template.rigType === 'quadruped_mount') {
    mountAuraRig = createSolarLeoMountAuraRig(liteMode);
    group.add(mountAuraRig.group);
  }

  let wingsAuraRig: SolarLeoWingsAuraRig | undefined;
  if (template.rigType === 'wings') {
    wingsAuraRig = createSolarLeoWingsAuraRig(liteMode);
    group.add(wingsAuraRig.group);
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
    hasSculptedDrawnBow: template.hasSculptedDrawnBow,
    bowStringRig,
    petAuraRig,
    mountAuraRig,
    wingsAuraRig,
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

  // For Aurelia's sculpted full-draw bow GLB, keep arm/hand bones strictly aligned with `chest`
  // so her arms, bow limbs, riser, arrow shaft, and bowstring move as one rigid archer assembly
  // without ever bending the bow or curving the arrow.
  if (rig.hasSculptedDrawnBow) {
    armLPitch = 0;
    armRPitch = 0;
    armLRoll = 0;
    armRRoll = 0;
    handLPitch = 0;
    handRPitch = 0;
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

  if (rig.bowStringRig) {
    const recoil = Math.min(1, Math.max(0, shootRecoil));
    // Taut full-draw (1.0) at rest/aim; snaps forward toward brace chord on shot release with damped twang
    const targetPull = recoil > 0.02 ? Math.max(0.08, 1 - recoil * 0.92) : 1.0;
    const nextPull = THREE.MathUtils.damp(rig.bowStringRig.currentPull, targetPull, recoil > 0.02 ? 28 : 14, dt);
    const twang = recoil > 0.02 ? Math.sin(elapsed * 55) * recoil * 0.65 : 0;
    updateSolarLeoBowStringGeometry(rig.bowStringRig, nextPull, twang);
  }
}

const _mountEmberDummy = new THREE.Object3D();
const _mountEmberGold = new THREE.Color(0xfef08a);
const _mountEmberAmber = new THREE.Color(0xf59e0b);
const _mountEmberFlare = new THREE.Color(0xfb923c);
const _mountEmberWhite = new THREE.Color(0xfffbeb);

const MOUNT_ACTION_CYCLE: readonly SolarLeoMountActionKind[] = [
  'regal_breathe_survey',
  'solar_paw_stomp',
  'majestic_roar',
  'proud_prowl_shift',
];

const MOUNT_ACTION_DURATION_SEC = 5.4;

function createSolarLeoMountAuraRig(liteMode: boolean): SolarLeoMountAuraRig {
  const group = new THREE.Group();
  group.name = 'SolariusSolarEmberAura';

  // Single InstancedMesh = 1 draw call (8 embers in Lite for Dell E5430, 16 embers in High)
  const emberCount = liteMode ? 8 : 16;
  const emberGeo = new THREE.OctahedronGeometry(0.052, 0);
  const emberMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const embers = new THREE.InstancedMesh(emberGeo, emberMat, emberCount);
  embers.name = 'SolariusManeEmbers';
  embers.frustumCulled = false;

  for (let i = 0; i < emberCount; i++) {
    const col =
      i % 4 === 0
        ? _mountEmberGold
        : i % 4 === 1
          ? _mountEmberAmber
          : i % 4 === 2
            ? _mountEmberFlare
            : _mountEmberWhite;
    embers.setColorAt(i, col);
    _mountEmberDummy.position.set(0, 0.5, 0);
    _mountEmberDummy.scale.setScalar(0.6);
    _mountEmberDummy.updateMatrix();
    embers.setMatrixAt(i, _mountEmberDummy.matrix);
  }
  if (embers.instanceColor) embers.instanceColor.needsUpdate = true;
  embers.instanceMatrix.needsUpdate = true;
  group.add(embers);

  let groundRing: THREE.Mesh | undefined;
  if (!liteMode) {
    const ringGeo = new THREE.TorusGeometry(0.95, 0.018, 6, 36);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.44,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    groundRing = new THREE.Mesh(ringGeo, ringMat);
    groundRing.name = 'SolariusSolarGroundSeal';
    groundRing.rotation.x = Math.PI * 0.5;
    groundRing.position.y = 0.035;
    group.add(groundRing);
  }

  return { group, embers, emberCount, groundRing };
}

/**
 * Pure deterministic choreographer for Solarius's living lion behaviors:
 * regal chest breathing & survey, proud front-paw solar stomp, majestic roaring mane flare,
 * and feline shoulder-prowl shift (plus immediate celebratory roar-prance on tap/victory).
 */
export function evaluateMountRoyalAction(
  elapsed: number,
  mode: 'lobby' | 'combat' = 'lobby',
  celebrating = false
): SolarLeoMountActionFrame {
  const safeT = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);

  if (celebrating) {
    const p = (safeT * 1.15) % 1;
    const arch = Math.sin(p * Math.PI);
    const prance = Math.sin(safeT * 7.5);
    return {
      action: 'majestic_roar',
      phase: p,
      bodyLiftY: 0.07 + arch * 0.14,
      pelvisPitch: -0.08 * arch,
      spinePitch: -0.1 * arch,
      chestPitch: -0.18 * arch,
      headPitch: -0.26 * arch,
      headYaw: Math.sin(safeT * 3.8) * 0.14,
      headRoll: Math.sin(safeT * 5.2) * 0.08,
      legFLPitch: -0.52 * arch + prance * 0.18,
      legFRPitch: -0.52 * arch - prance * 0.18,
      legBLPitch: 0.16 * arch,
      legBRPitch: 0.16 * arch,
      tailWagSpeedMult: 2.1,
      tailWagAmpMult: 1.65,
      emberBoost: 1.85,
      stompPulse: arch,
    };
  }

  if (mode === 'combat') {
    const breathe = Math.sin(safeT * 3.1);
    return {
      action: 'regal_breathe_survey',
      phase: (safeT / 3.0) % 1,
      bodyLiftY: 0,
      pelvisPitch: 0,
      spinePitch: breathe * 0.025,
      chestPitch: breathe * 0.03,
      headPitch: -breathe * 0.03,
      headYaw: Math.sin(safeT * 1.6) * 0.07,
      headRoll: 0,
      legFLPitch: 0,
      legFRPitch: 0,
      legBLPitch: 0,
      legBRPitch: 0,
      tailWagSpeedMult: 1.45,
      tailWagAmpMult: 1.25,
      emberBoost: 1.25,
      stompPulse: 0,
    };
  }

  const slot = Math.floor(safeT / MOUNT_ACTION_DURATION_SEC) % MOUNT_ACTION_CYCLE.length;
  const action = MOUNT_ACTION_CYCLE[slot];
  const p = (safeT % MOUNT_ACTION_DURATION_SEC) / MOUNT_ACTION_DURATION_SEC;
  const env = smoothstep01(Math.min(p / 0.16, (1 - p) / 0.16));

  switch (action) {
    case 'regal_breathe_survey': {
      // Deep lion breath, scanning majestically left & right with subtle regal head tilt
      const scan = Math.sin(p * Math.PI * 2);
      const breath = Math.sin(p * Math.PI * 4);
      return {
        action,
        phase: p,
        bodyLiftY: Math.max(0, breath) * 0.03 * env,
        pelvisPitch: -0.02 * breath * env,
        spinePitch: 0.045 * breath * env,
        chestPitch: -0.05 * breath * env,
        headPitch: -0.08 * env - 0.05 * breath * env,
        headYaw: scan * 0.3 * env,
        headRoll: -scan * 0.11 * env,
        legFLPitch: 0.05 * Math.max(0, scan) * env,
        legFRPitch: 0.05 * Math.max(0, -scan) * env,
        legBLPitch: -0.03 * env,
        legBRPitch: -0.03 * env,
        tailWagSpeedMult: 1.15,
        tailWagAmpMult: 1.35,
        emberBoost: 1.1,
        stompPulse: 0.15 * env,
      };
    }
    case 'solar_paw_stomp': {
      // Lifts front-right paw proudly high, holds briefly, then stomps down with golden shockwave pulse
      const liftUp = smoothstep01((p - 0.1) / 0.26);
      const stompDrop = smoothstep01((p - 0.44) / 0.14);
      const pawHeight = Math.max(0, liftUp - stompDrop);
      const impactRing = Math.sin(smoothstep01((p - 0.52) / 0.28) * Math.PI);
      const secondPaw = Math.sin(smoothstep01((p - 0.6) / 0.28) * Math.PI);
      return {
        action,
        phase: p,
        bodyLiftY: pawHeight * 0.11 + impactRing * 0.035,
        pelvisPitch: -0.07 * pawHeight,
        spinePitch: -0.09 * pawHeight + 0.07 * impactRing,
        chestPitch: -0.2 * pawHeight + 0.11 * impactRing,
        headPitch: -0.2 * pawHeight + 0.14 * impactRing,
        headYaw: -0.24 * pawHeight + 0.18 * secondPaw,
        headRoll: 0.14 * pawHeight,
        legFLPitch: -0.46 * secondPaw * env,
        legFRPitch: -0.88 * pawHeight + 0.12 * impactRing,
        legBLPitch: 0.15 * pawHeight,
        legBRPitch: 0.17 * pawHeight,
        tailWagSpeedMult: 1.65,
        tailWagAmpMult: 1.6,
        emberBoost: 1.3 + impactRing * 1.05,
        stompPulse: impactRing,
      };
    }
    case 'majestic_roar': {
      // Shifts back onto haunches, lifts chest & front paws, roars skyward with blazing solar mane embers
      const windup = smoothstep01((p - 0.08) / 0.16);
      const roarPeak = Math.sin(smoothstep01((p - 0.2) / 0.58) * Math.PI);
      const shake = Math.sin(p * Math.PI * 14) * roarPeak;
      return {
        action,
        phase: p,
        bodyLiftY: roarPeak * 0.16,
        pelvisPitch: 0.1 * windup * (1 - roarPeak) - 0.09 * roarPeak,
        spinePitch: -0.14 * roarPeak,
        chestPitch: -0.26 * roarPeak,
        headPitch: 0.12 * windup * (1 - roarPeak) - 0.36 * roarPeak,
        headYaw: shake * 0.11,
        headRoll: shake * 0.08,
        legFLPitch: -0.62 * roarPeak,
        legFRPitch: -0.54 * roarPeak,
        legBLPitch: 0.24 * roarPeak,
        legBRPitch: 0.24 * roarPeak,
        tailWagSpeedMult: 2.35,
        tailWagAmpMult: 1.85,
        emberBoost: 1.25 + roarPeak * 1.45,
        stompPulse: roarPeak * 0.95,
      };
    }
    case 'proud_prowl_shift': {
      // Sleek feline shoulder stretch & alternating front-paw weight shift with confident nod
      const wave = Math.sin(p * Math.PI * 2);
      const stretch = Math.sin(p * Math.PI);
      return {
        action,
        phase: p,
        bodyLiftY: -0.04 * stretch * env + Math.abs(wave) * 0.045 * env,
        pelvisPitch: -0.09 * stretch * env,
        spinePitch: 0.12 * stretch * env,
        chestPitch: 0.1 * stretch * env,
        headPitch: -0.14 * stretch * env + Math.sin(p * Math.PI * 4) * 0.07 * env,
        headYaw: -wave * 0.22 * env,
        headRoll: wave * 0.1 * env,
        legFLPitch: Math.max(0, wave) * -0.42 * env + 0.14 * stretch * env,
        legFRPitch: Math.max(0, -wave) * -0.42 * env + 0.14 * stretch * env,
        legBLPitch: -0.14 * stretch * env,
        legBRPitch: -0.14 * stretch * env,
        tailWagSpeedMult: 1.45,
        tailWagAmpMult: 1.55,
        emberBoost: 1.25,
        stompPulse: 0.25 * stretch * env,
      };
    }
  }
}

export function updateSolarLeoMountPose(
  rig: InstantiatedSolarLeoModel,
  elapsed: number,
  dt: number,
  speed: number,
  sprint = false,
  options?: SolarLeoMountPoseOptions
): void {
  const b = rig.bones;
  if (!b.pelvis || !b.chest) return;

  const mode = options?.mode ?? (speed > 0.15 ? 'combat' : 'lobby');
  const bankAngle = THREE.MathUtils.clamp(options?.bankAngle ?? 0, -0.45, 0.45);
  const celebrating = Boolean(options?.celebrating);

  const moveFactor = Math.min(1, speed / 5.2);
  const tempo = sprint ? 1.38 : 1.0;
  rig.gaitPhase += dt * (2.6 + moveFactor * 11.2 * tempo);
  const g = rig.gaitPhase;
  const breath = Math.sin(elapsed * 2.5);
  const lam = 12;

  const royal = evaluateMountRoyalAction(elapsed, mode, celebrating);
  const idleWeight = 1 - moveFactor;

  // Rotary quadruped gallop blended seamlessly with living royal lion behaviors when standing
  const gallopBounce = moveFactor > 0.06 ? Math.abs(Math.sin(g)) * (sprint ? 0.17 : 0.14) * moveFactor : 0;
  const spineFlex = moveFactor > 0.06 ? Math.cos(g) * (sprint ? 0.15 : 0.12) * moveFactor : 0;
  const strideAmp = (sprint ? 0.78 : 0.66) * moveFactor;

  const gallopFL = moveFactor > 0.06 ? Math.sin(g) * strideAmp : 0;
  const gallopFR = moveFactor > 0.06 ? Math.sin(g + 0.65) * strideAmp : 0;
  const gallopBL = moveFactor > 0.06 ? Math.sin(g + Math.PI) * (strideAmp * 0.92) : 0;
  const gallopBR = moveFactor > 0.06 ? Math.sin(g + Math.PI + 0.65) * (strideAmp * 0.92) : 0;

  const targetY = gallopBounce + royal.bodyLiftY * idleWeight;
  const targetPelvisX = spineFlex * 0.55 + royal.pelvisPitch * idleWeight;
  const targetSpineX = -spineFlex * 0.78 + royal.spinePitch * idleWeight;
  const targetChestX = spineFlex * 0.52 + breath * 0.025 + royal.chestPitch * idleWeight + (sprint ? 0.08 : 0);
  const targetHeadX = -spineFlex * 0.36 - breath * 0.03 + royal.headPitch * idleWeight;
  const targetHeadY = royal.headYaw * idleWeight + bankAngle * 0.45;
  const targetHeadZ = royal.headRoll * idleWeight - bankAngle * 0.28;

  rig.visualRoot.position.y = THREE.MathUtils.damp(rig.visualRoot.position.y, targetY, lam, dt);
  rig.visualRoot.rotation.z = THREE.MathUtils.damp(rig.visualRoot.rotation.z, bankAngle * 0.55, lam, dt);

  b.pelvis.rotation.x = THREE.MathUtils.damp(b.pelvis.rotation.x, targetPelvisX, lam, dt);
  b.pelvis.rotation.z = THREE.MathUtils.damp(b.pelvis.rotation.z, Math.sin(g) * 0.04 * moveFactor, lam, dt);
  if (b.spine) b.spine.rotation.x = THREE.MathUtils.damp(b.spine.rotation.x, targetSpineX, lam, dt);
  b.chest.rotation.x = THREE.MathUtils.damp(b.chest.rotation.x, targetChestX, lam, dt);
  if (b.head) {
    b.head.rotation.x = THREE.MathUtils.damp(b.head.rotation.x, targetHeadX, lam, dt);
    b.head.rotation.y = THREE.MathUtils.damp(b.head.rotation.y, targetHeadY, lam, dt);
    b.head.rotation.z = THREE.MathUtils.damp(b.head.rotation.z, targetHeadZ, lam, dt);
  }
  if (b.legFL) b.legFL.rotation.x = THREE.MathUtils.damp(b.legFL.rotation.x, gallopFL + royal.legFLPitch * idleWeight, lam, dt);
  if (b.legFR) b.legFR.rotation.x = THREE.MathUtils.damp(b.legFR.rotation.x, gallopFR + royal.legFRPitch * idleWeight, lam, dt);
  if (b.legBL) b.legBL.rotation.x = THREE.MathUtils.damp(b.legBL.rotation.x, gallopBL + royal.legBLPitch * idleWeight, lam, dt);
  if (b.legBR) b.legBR.rotation.x = THREE.MathUtils.damp(b.legBR.rotation.x, gallopBR + royal.legBRPitch * idleWeight, lam, dt);

  const tailFreq = (3.4 + moveFactor * 4.5) * royal.tailWagSpeedMult;
  const tailAmp = 0.28 * royal.tailWagAmpMult;
  if (b.tail1) {
    b.tail1.rotation.y = THREE.MathUtils.damp(b.tail1.rotation.y, Math.sin(elapsed * tailFreq) * tailAmp, lam, dt);
    b.tail1.rotation.x = THREE.MathUtils.damp(
      b.tail1.rotation.x,
      0.1 + moveFactor * 0.2 + royal.stompPulse * 0.16,
      lam,
      dt
    );
  }
  if (b.tail2) {
    b.tail2.rotation.y = THREE.MathUtils.damp(
      b.tail2.rotation.y,
      Math.sin(elapsed * tailFreq - 0.9) * (tailAmp * 1.35),
      lam,
      dt
    );
    b.tail2.rotation.x = THREE.MathUtils.damp(
      b.tail2.rotation.x,
      0.12 + Math.cos(elapsed * tailFreq - 0.5) * 0.12,
      lam,
      dt
    );
  }

  // Update Solarius rising golden solar mane embers & ground stomp seal (single InstancedMesh, zero allocations)
  if (rig.mountAuraRig) {
    const { embers, emberCount, groundRing } = rig.mountAuraRig;
    const energy = royal.emberBoost + moveFactor * 0.5 + (sprint ? 0.75 : 0);
    const sz = rig.size.z;
    const sy = rig.size.y;
    for (let i = 0; i < emberCount; i++) {
      const cycle = ((elapsed * (0.68 * energy) + i / emberCount) % 1 + 1) % 1;
      const isMane = i % 3 !== 0;
      const angle = elapsed * 1.8 + i * 2.17;
      if (isMane) {
        // Warm solar sparks rising off Solarius's fiery golden mane and streaming back when galloping
        const radius = 0.34 + (1 - cycle) * 0.16;
        const mx = Math.cos(angle) * radius;
        const my = sy * 0.56 + cycle * 0.72 + rig.visualRoot.position.y;
        const mz = sz * 0.24 + Math.sin(angle) * 0.22 - cycle * (0.28 + moveFactor * 0.85 + (sprint ? 0.45 : 0));
        const sc = Math.sin(cycle * Math.PI) * (0.62 + Math.min(0.65, (energy - 1) * 0.45));
        _mountEmberDummy.position.set(mx, my, mz);
        _mountEmberDummy.rotation.set(elapsed * 2.5 + i, elapsed * 3.1, i);
        _mountEmberDummy.scale.set(sc * 0.75, sc * 1.4, sc * 0.75);
      } else {
        // Golden pawstep embers flaring softly around Solarius's paws on stomps & gallop
        const pawRingR = 0.48 + cycle * (0.36 + royal.stompPulse * 0.28);
        const mx = Math.cos(angle * 1.3) * pawRingR;
        const my = 0.08 + Math.sin(cycle * Math.PI) * (0.28 + royal.stompPulse * 0.24);
        const mz = Math.sin(angle * 1.3) * (pawRingR * 1.15) - cycle * moveFactor * 0.65;
        const sc = Math.sin(cycle * Math.PI) * (0.55 + royal.stompPulse * 0.55 + (sprint ? 0.35 : 0));
        _mountEmberDummy.position.set(mx, my, mz);
        _mountEmberDummy.rotation.set(elapsed * 2.0, elapsed * 2.8 + i, 0);
        _mountEmberDummy.scale.set(sc, sc * 1.15, sc);
      }
      _mountEmberDummy.updateMatrix();
      embers.setMatrixAt(i, _mountEmberDummy.matrix);
    }
    embers.instanceMatrix.needsUpdate = true;

    if (groundRing) {
      groundRing.rotation.z = elapsed * (0.8 + moveFactor * 1.4 + royal.stompPulse * 1.2);
      const pulseScale = 0.94 + Math.sin(elapsed * 2.8) * 0.04 + royal.stompPulse * 0.22 + (sprint ? 0.12 : 0);
      groundRing.scale.setScalar(pulseScale);
      const ringMat = groundRing.material as THREE.MeshBasicMaterial;
      ringMat.opacity = THREE.MathUtils.clamp(0.32 + royal.stompPulse * 0.38 + (sprint ? 0.2 : 0), 0.25, 0.85);
    }
  }
}

const _wingMoteDummy = new THREE.Object3D();
const _wingMoteGold = new THREE.Color(0xfef08a);
const _wingMoteAmber = new THREE.Color(0xfbbf24);
const _wingMoteWhite = new THREE.Color(0xffffff);
const _wingMoteRose = new THREE.Color(0xfde68a);

const WING_SHOWCASE_CYCLE: readonly SolarLeoWingShowcaseKind[] = [
  'majestic_unfurl',
  'seraphic_hover',
  'sunburst_ripple',
  'radiant_flourish',
];

const WING_SHOWCASE_DURATION_SEC = 5.2;

function createSolarLeoWingsAuraRig(liteMode: boolean): SolarLeoWingsAuraRig {
  const group = new THREE.Group();
  group.name = 'SolarZenithFeatherLightAura';

  // Single InstancedMesh = 1 draw call (8 feather sparkles in Lite for Dell E5430, 16 in High)
  const featherCount = liteMode ? 8 : 16;
  const featherGeo = new THREE.OctahedronGeometry(0.046, 0);
  const featherMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.92,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const feathers = new THREE.InstancedMesh(featherGeo, featherMat, featherCount);
  feathers.name = 'SolarZenithFeatherMotes';
  feathers.frustumCulled = false;

  for (let i = 0; i < featherCount; i++) {
    const col =
      i % 4 === 0
        ? _wingMoteGold
        : i % 4 === 1
          ? _wingMoteAmber
          : i % 4 === 2
            ? _wingMoteWhite
            : _wingMoteRose;
    feathers.setColorAt(i, col);
    _wingMoteDummy.position.set(0, 0, 0);
    _wingMoteDummy.scale.setScalar(0.7);
    _wingMoteDummy.updateMatrix();
    feathers.setMatrixAt(i, _wingMoteDummy.matrix);
  }
  if (feathers.instanceColor) feathers.instanceColor.needsUpdate = true;
  feathers.instanceMatrix.needsUpdate = true;
  group.add(feathers);

  return { group, feathers, featherCount };
}

/**
 * Pure deterministic choreographer for Wings of the Solar Zenith:
 * majestic solar unfurl, seraphic deep hover-flap with feather pronation/supination,
 * graceful alternating sunburst ripple, and radiant double-wingbeat flourish.
 */
export function evaluateWingsShowcasePose(
  elapsed: number,
  mode: 'lobby' | 'combat' = 'lobby',
  celebrating = false
): SolarLeoWingShowcaseFrame {
  const safeT = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);

  if (celebrating) {
    const p = (safeT * 1.4) % 1;
    const surge = Math.sin(p * Math.PI);
    return {
      showcase: 'radiant_flourish',
      phase: p,
      flapSpeedMult: 1.85,
      innerAmpMult: 1.5,
      outerAmpMult: 1.65,
      sweepBase: 0.04,
      liftZ: 0.22 + surge * 0.18,
      featherTwist: 0.22 * surge,
      asymmetry: 0,
      hoverY: 0.05 + surge * 0.08,
      rollZ: Math.sin(safeT * 4.2) * 0.04,
      sparkleBoost: 1.9,
    };
  }

  if (mode === 'combat') {
    return {
      showcase: 'seraphic_hover',
      phase: (safeT / 3.2) % 1,
      flapSpeedMult: 1.25,
      innerAmpMult: 1.2,
      outerAmpMult: 1.35,
      sweepBase: 0.16,
      liftZ: 0.08,
      featherTwist: 0.16,
      asymmetry: 0,
      hoverY: Math.sin(safeT * 3.4) * 0.04,
      rollZ: 0,
      sparkleBoost: 1.25,
    };
  }

  const slot = Math.floor(safeT / WING_SHOWCASE_DURATION_SEC) % WING_SHOWCASE_CYCLE.length;
  const showcase = WING_SHOWCASE_CYCLE[slot];
  const p = (safeT % WING_SHOWCASE_DURATION_SEC) / WING_SHOWCASE_DURATION_SEC;
  const env = smoothstep01(Math.min(p / 0.18, (1 - p) / 0.18));

  switch (showcase) {
    case 'majestic_unfurl': {
      // Sweeps grandly wide open & forward like a golden sunburst, lifting outer feathers with proud poise
      const spread = Math.sin(p * Math.PI);
      return {
        showcase,
        phase: p,
        flapSpeedMult: 0.95,
        innerAmpMult: 1.05,
        outerAmpMult: 1.28,
        sweepBase: 0.14 - 0.34 * spread * env,
        liftZ: 0.34 * spread * env,
        featherTwist: 0.24 * spread * env,
        asymmetry: 0,
        hoverY: 0.08 * spread * env,
        rollZ: Math.sin(p * Math.PI * 2) * 0.035 * env,
        sparkleBoost: 1.25 + spread * 0.75,
      };
    }
    case 'seraphic_hover': {
      // Deep, majestic angelic hover beats with pronounced feather curl & trailing outer wingtips
      return {
        showcase,
        phase: p,
        flapSpeedMult: 1.38,
        innerAmpMult: 1.55,
        outerAmpMult: 1.7,
        sweepBase: 0.08,
        liftZ: 0.16 * env,
        featherTwist: 0.26 * env,
        asymmetry: 0,
        hoverY: Math.sin(p * Math.PI * 4) * 0.065 * env,
        rollZ: Math.cos(p * Math.PI * 2) * 0.045 * env,
        sparkleBoost: 1.45,
      };
    }
    case 'sunburst_ripple': {
      // Elegant asymmetric breeze sway — left wing catches the golden current slightly before right
      const sway = Math.sin(p * Math.PI * 2);
      return {
        showcase,
        phase: p,
        flapSpeedMult: 1.18,
        innerAmpMult: 1.38,
        outerAmpMult: 1.6,
        sweepBase: 0.06,
        liftZ: 0.14 * env,
        featherTwist: 0.22 * env,
        asymmetry: 0.72 * env,
        hoverY: Math.sin(p * Math.PI * 4) * 0.05 * env,
        rollZ: sway * 0.075 * env,
        sparkleBoost: 1.5,
      };
    }
    case 'radiant_flourish': {
      // Crisp double wingbeat burst lifting luminous solar feather motes outward
      const burstWave = Math.abs(Math.sin(smoothstep01((p - 0.12) / 0.76) * Math.PI * 2));
      return {
        showcase,
        phase: p,
        flapSpeedMult: 1.5 + burstWave * 0.8,
        innerAmpMult: 1.35 + burstWave * 0.5,
        outerAmpMult: 1.5 + burstWave * 0.6,
        sweepBase: 0.12 - burstWave * 0.24 * env,
        liftZ: (0.14 + burstWave * 0.28) * env,
        featherTwist: (0.18 + burstWave * 0.16) * env,
        asymmetry: 0,
        hoverY: burstWave * 0.09 * env,
        rollZ: Math.sin(p * Math.PI * 4) * 0.04 * env,
        sparkleBoost: 1.35 + burstWave * 0.9,
      };
    }
  }
}

export function updateSolarLeoWingsPose(
  rig: InstantiatedSolarLeoModel,
  elapsed: number,
  dt: number,
  speed: number,
  dashing = false,
  ultBurst = 0,
  options?: SolarLeoWingsPoseOptions
): void {
  const b = rig.bones;
  if (!b.wingL1 || !b.wingR1) return;

  const mode = options?.mode ?? (speed > 0.15 || dashing ? 'combat' : 'lobby');
  const bankAngle = THREE.MathUtils.clamp(options?.bankAngle ?? 0, -0.45, 0.45);
  const celebrating = Boolean(options?.celebrating) || ultBurst > 0.25;
  const ult = THREE.MathUtils.clamp(ultBurst, 0, 1);

  const show = evaluateWingsShowcasePose(elapsed, mode, celebrating);
  const moveFactor = Math.min(1, speed / 5.5);
  const boost = (dashing ? 1.6 : ult > 0.01 ? 1.5 : 1.0) * show.flapSpeedMult;
  rig.gaitPhase += dt * (2.9 + moveFactor * 4.4) * boost;
  const gL = rig.gaitPhase;
  const gR = rig.gaitPhase - show.asymmetry;

  // Double-harmonic feathered wingbeat: crisp buoyant power stroke + graceful arched recovery
  const innerAmp = (0.31 + moveFactor * 0.2 + (dashing ? 0.18 : 0) + ult * 0.16) * show.innerAmpMult;
  const outerAmp = (0.26 + moveFactor * 0.2 + (dashing ? 0.16 : 0) + ult * 0.18) * show.outerAmpMult;

  const innerFlapL = (Math.sin(gL) + Math.sin(gL * 2) * 0.16) * innerAmp;
  const innerFlapR = (Math.sin(gR) + Math.sin(gR * 2) * 0.16) * innerAmp;
  const outerFlapL = Math.sin(gL - 0.85) * outerAmp;
  const outerFlapR = Math.sin(gR - 0.85) * outerAmp;

  const sweepBack = show.sweepBase + moveFactor * 0.18 + (dashing ? 0.3 : 0) - ult * 0.2;
  const liftZ = show.liftZ + ult * 0.18 - (dashing ? 0.1 : 0);
  const twistL = Math.cos(gL) * show.featherTwist;
  const twistR = Math.cos(gR) * show.featherTwist;
  const lam = 13;

  b.wingL1.rotation.y = THREE.MathUtils.damp(b.wingL1.rotation.y, -sweepBack - innerFlapL, lam, dt);
  b.wingL1.rotation.z = THREE.MathUtils.damp(b.wingL1.rotation.z, liftZ + Math.cos(gL) * 0.14 + bankAngle * 0.25, lam, dt);
  b.wingL1.rotation.x = THREE.MathUtils.damp(b.wingL1.rotation.x, twistL, lam, dt);
  if (b.wingL2) {
    b.wingL2.rotation.y = THREE.MathUtils.damp(b.wingL2.rotation.y, -outerFlapL, lam, dt);
    b.wingL2.rotation.z = THREE.MathUtils.damp(b.wingL2.rotation.z, Math.cos(gL - 0.85) * 0.15, lam, dt);
    b.wingL2.rotation.x = THREE.MathUtils.damp(b.wingL2.rotation.x, Math.cos(gL - 0.7) * (show.featherTwist * 0.8), lam, dt);
  }

  b.wingR1.rotation.y = THREE.MathUtils.damp(b.wingR1.rotation.y, sweepBack + innerFlapR, lam, dt);
  b.wingR1.rotation.z = THREE.MathUtils.damp(b.wingR1.rotation.z, -liftZ - Math.cos(gR) * 0.14 + bankAngle * 0.25, lam, dt);
  b.wingR1.rotation.x = THREE.MathUtils.damp(b.wingR1.rotation.x, twistR, lam, dt);
  if (b.wingR2) {
    b.wingR2.rotation.y = THREE.MathUtils.damp(b.wingR2.rotation.y, outerFlapR, lam, dt);
    b.wingR2.rotation.z = THREE.MathUtils.damp(b.wingR2.rotation.z, -Math.cos(gR - 0.85) * 0.15, lam, dt);
    b.wingR2.rotation.x = THREE.MathUtils.damp(b.wingR2.rotation.x, Math.cos(gR - 0.7) * (show.featherTwist * 0.8), lam, dt);
  }

  rig.visualRoot.position.y = THREE.MathUtils.damp(
    rig.visualRoot.position.y,
    Math.sin(elapsed * 2.8) * 0.04 + show.hoverY,
    lam,
    dt
  );
  rig.visualRoot.rotation.z = THREE.MathUtils.damp(
    rig.visualRoot.rotation.z,
    show.rollZ + bankAngle * 0.22,
    lam,
    dt
  );

  // Subtle living solar radiance pulse on wing plumage during flourishes, dashes & Ultimates
  const targetEmissive = 0.16 + Math.sin(elapsed * 3.1) * 0.05 + (show.sparkleBoost - 1) * 0.16 + ult * 0.35 + (dashing ? 0.18 : 0);
  for (let m = 0; m < rig.skinnedMeshes.length; m++) {
    const mat = rig.skinnedMeshes[m].material as THREE.MeshStandardMaterial;
    if (mat && typeof mat.emissiveIntensity === 'number') {
      mat.emissiveIntensity = THREE.MathUtils.clamp(targetEmissive, 0.1, 0.72);
    }
  }

  // Update drifting golden feather-light sparkles shedding from left & right wingtips (1 InstancedMesh, zero allocations)
  if (rig.wingsAuraRig) {
    const { feathers, featherCount } = rig.wingsAuraRig;
    const boostSparkle = show.sparkleBoost + (dashing ? 0.7 : 0) + ult * 0.9;
    const spanX = Math.max(0.8, rig.size.x * 0.5);
    const spanY = Math.max(0.6, rig.size.y * 0.45);
    for (let i = 0; i < featherCount; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const cycle = ((elapsed * (0.44 * boostSparkle) + i / featherCount) % 1 + 1) % 1;
      const flutter = Math.sin(elapsed * 4.8 + i * 2.1);
      const wingWave = Math.sin((side > 0 ? gL : gR) - 0.6);
      const fx = side * (spanX * (0.38 + (i % 4) * 0.16) + cycle * 0.38 + flutter * 0.08);
      const fy = spanY * 0.32 + wingWave * 0.16 - cycle * 0.78 + Math.cos(elapsed * 3.6 + i) * 0.07;
      const fz = -0.14 - cycle * (0.32 + moveFactor * 0.55 + (dashing ? 0.5 : 0)) + wingWave * 0.12;
      const fade = Math.sin(cycle * Math.PI);
      const sc = fade * (0.65 + Math.min(0.7, (boostSparkle - 1) * 0.45));
      _wingMoteDummy.position.set(fx, fy, fz);
      _wingMoteDummy.rotation.set(elapsed * 2.4 + i, elapsed * 3.2 + side, flutter * 0.6);
      // Graceful slender golden feather-spark silhouette
      _wingMoteDummy.scale.set(sc * 0.62, sc * 1.58, sc * 0.48);
      _wingMoteDummy.updateMatrix();
      feathers.setMatrixAt(i, _wingMoteDummy.matrix);
    }
    feathers.instanceMatrix.needsUpdate = true;
  }
}

const _petMoteDummy = new THREE.Object3D();
const _petMoteColorGold = new THREE.Color(0xfef08a);
const _petMoteColorCyan = new THREE.Color(0x7dd3fc);
const _petMoteColorWhite = new THREE.Color(0xffffff);
const _petMoteColorPeach = new THREE.Color(0xfdba74);

const PET_TRICK_CYCLE: readonly SolarLeoPetTrickKind[] = [
  'curious_peek',
  'happy_spin',
  'figure_eight_swoop',
  'joy_hop_bounce',
  'playful_barrel_roll',
];

const PET_TRICK_DURATION_SEC = 4.6;

function createSolarLeoPetAuraRig(liteMode: boolean): SolarLeoPetAuraRig {
  const group = new THREE.Group();
  group.name = 'AstraeoStarlightAura';

  // Single InstancedMesh = 1 draw call on both Lite (8 motes) and High (14 motes):
  // front half orbits Astraeo as twinkling starlight diamonds; tail motes form a shimmering motion trail.
  const moteCount = liteMode ? 8 : 14;
  const moteGeo = new THREE.OctahedronGeometry(0.048, 0);
  const moteMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.94,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const motes = new THREE.InstancedMesh(moteGeo, moteMat, moteCount);
  motes.name = 'AstraeoSparkleMotes';
  motes.frustumCulled = false;

  for (let i = 0; i < moteCount; i++) {
    const col =
      i % 4 === 0
        ? _petMoteColorGold
        : i % 4 === 1
          ? _petMoteColorCyan
          : i % 4 === 2
            ? _petMoteColorWhite
            : _petMoteColorPeach;
    motes.setColorAt(i, col);
    _petMoteDummy.position.set(0, 0, 0);
    _petMoteDummy.scale.setScalar(0.8);
    _petMoteDummy.updateMatrix();
    motes.setMatrixAt(i, _petMoteDummy.matrix);
  }
  if (motes.instanceColor) motes.instanceColor.needsUpdate = true;
  motes.instanceMatrix.needsUpdate = true;
  group.add(motes);

  let orbitRing: THREE.Mesh | undefined;
  if (!liteMode) {
    const ringGeo = new THREE.TorusGeometry(0.48, 0.013, 6, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.52,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    orbitRing = new THREE.Mesh(ringGeo, ringMat);
    orbitRing.name = 'AstraeoOrbitHalo';
    orbitRing.rotation.x = Math.PI * 0.44;
    group.add(orbitRing);
  }

  return { group, motes, moteCount, orbitRing };
}

function smoothstep01(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/**
 * Pure deterministic choreographer for Astraeo's playful tricks (curious head-tilt peek,
 * 360° celebratory spin, infinity figure-8 swoop, double joy hop, and aerial barrel roll).
 */
export function evaluatePetPlayfulTrick(
  elapsed: number,
  mode: 'lobby' | 'combat' = 'lobby',
  celebrating = false
): SolarLeoPetTrickFrame {
  const safeT = Math.max(0, Number.isFinite(elapsed) ? elapsed : 0);

  if (celebrating) {
    const p = (safeT * 1.45) % 1;
    const hop = Math.sin(p * Math.PI);
    return {
      trick: 'happy_spin',
      phase: p,
      offsetX: Math.sin(safeT * 5.2) * 0.14,
      offsetY: 0.08 + hop * 0.28,
      offsetZ: Math.cos(safeT * 5.2) * 0.1,
      yawOffset: smoothstep01(p) * Math.PI * 2,
      pitchOffset: -0.14 * hop,
      rollOffset: Math.sin(safeT * 7.5) * 0.2,
      headTiltZ: Math.sin(safeT * 6.0) * 0.24,
      headYaw: 0,
      headPitch: -0.18 * hop,
      wingSpeedMult: 1.85,
      wingAmpMult: 1.45,
      tailWagSpeedMult: 2.2,
      squashY: 1 + (hop - 0.35) * 0.09,
      sparkleBoost: 1.65,
    };
  }

  if (mode === 'combat') {
    // In combat, focus on crisp figure-8 weaving & eager wing/tail energy without spinning away from targets
    const p = (safeT / 3.8) % 1;
    const a = safeT * 1.9;
    return {
      trick: 'figure_eight_swoop',
      phase: p,
      offsetX: Math.sin(a) * 0.16,
      offsetY: Math.sin(a * 2) * 0.09,
      offsetZ: Math.cos(a) * 0.08,
      yawOffset: Math.sin(a) * 0.12,
      pitchOffset: Math.cos(a * 2) * 0.08,
      rollOffset: -Math.cos(a) * 0.22,
      headTiltZ: Math.sin(a * 1.5) * 0.14,
      headYaw: Math.sin(a * 1.1) * 0.1,
      headPitch: -0.05,
      wingSpeedMult: 1.35,
      wingAmpMult: 1.2,
      tailWagSpeedMult: 1.6,
      squashY: 1 + Math.sin(a * 2) * 0.035,
      sparkleBoost: 1.2,
    };
  }

  const slot = Math.floor(safeT / PET_TRICK_DURATION_SEC) % PET_TRICK_CYCLE.length;
  const trick = PET_TRICK_CYCLE[slot];
  const p = (safeT % PET_TRICK_DURATION_SEC) / PET_TRICK_DURATION_SEC;
  // Bell envelope so each trick enters & exits smoothly with zero snapping between slots
  const env = smoothstep01(Math.min(p / 0.18, (1 - p) / 0.18));

  switch (trick) {
    case 'curious_peek': {
      // Drifts inquisitively forward/inward, tilts head left then right, rapid cute tail wag
      const tiltWave = Math.sin(p * Math.PI * 2);
      return {
        trick,
        phase: p,
        offsetX: 0.16 * env + Math.sin(p * Math.PI * 2) * 0.08 * env,
        offsetY: 0.1 * env + Math.sin(p * Math.PI * 4) * 0.05 * env,
        offsetZ: 0.22 * env,
        yawOffset: 0.26 * env + tiltWave * 0.14 * env,
        pitchOffset: 0.1 * env,
        rollOffset: tiltWave * 0.14 * env,
        headTiltZ: tiltWave * 0.4 * env,
        headYaw: 0.22 * env,
        headPitch: -0.12 * env + Math.abs(tiltWave) * 0.09 * env,
        wingSpeedMult: 1.2,
        wingAmpMult: 1.1,
        tailWagSpeedMult: 2.0,
        squashY: 1 + Math.sin(p * Math.PI * 4) * 0.035 * env,
        sparkleBoost: 1.25,
      };
    }
    case 'happy_spin': {
      // Anticipation dip -> joyful 360° mid-air twirl with upward float -> soft settle
      const spinWindow = smoothstep01((p - 0.16) / 0.56);
      const lift = Math.sin(spinWindow * Math.PI);
      return {
        trick,
        phase: p,
        offsetX: Math.sin(spinWindow * Math.PI * 2) * 0.14 * env,
        offsetY: -0.06 * (1 - lift) * env + lift * 0.34,
        offsetZ: Math.sin(spinWindow * Math.PI) * 0.16,
        yawOffset: spinWindow * Math.PI * 2,
        pitchOffset: -0.18 * lift,
        rollOffset: Math.sin(spinWindow * Math.PI * 2) * 0.22,
        headTiltZ: Math.sin(spinWindow * Math.PI) * 0.26,
        headYaw: 0,
        headPitch: -0.2 * lift,
        wingSpeedMult: 1.15 + lift * 1.0,
        wingAmpMult: 1.05 + lift * 0.48,
        tailWagSpeedMult: 1.6 + lift * 1.15,
        squashY: 1 + (lift - 0.25) * 0.09 * env,
        sparkleBoost: 1.1 + lift * 0.9,
      };
    }
    case 'figure_eight_swoop': {
      // Graceful infinity loop gliding beside the hero with playful banked turns
      const theta = p * Math.PI * 2;
      const sx = Math.sin(theta);
      const s2 = Math.sin(theta * 2);
      return {
        trick,
        phase: p,
        offsetX: sx * 0.32 * env,
        offsetY: s2 * 0.19 * env + 0.08 * env,
        offsetZ: Math.cos(theta) * 0.18 * env,
        yawOffset: Math.cos(theta) * 0.34 * env,
        pitchOffset: -Math.cos(theta * 2) * 0.14 * env,
        rollOffset: -Math.cos(theta) * 0.34 * env,
        headTiltZ: -Math.cos(theta) * 0.22 * env,
        headYaw: sx * 0.26 * env,
        headPitch: -s2 * 0.14 * env,
        wingSpeedMult: 1.4,
        wingAmpMult: 1.28,
        tailWagSpeedMult: 1.55,
        squashY: 1 + s2 * 0.045 * env,
        sparkleBoost: 1.45,
      };
    }
    case 'joy_hop_bounce': {
      // Two lively mid-air pounce hops with squash & stretch and happy wing burst
      const hopPhase = Math.max(0, Math.min(1, (p - 0.12) / 0.76));
      const doubleHop = Math.abs(Math.sin(hopPhase * Math.PI * 2));
      const squash = doubleHop > 0.25 ? 1 + (doubleHop - 0.25) * 0.1 : 1 - (0.25 - doubleHop) * 0.16;
      return {
        trick,
        phase: p,
        offsetX: Math.sin(hopPhase * Math.PI * 2) * 0.14 * env,
        offsetY: doubleHop * 0.34 * env,
        offsetZ: doubleHop * 0.16 * env,
        yawOffset: Math.sin(hopPhase * Math.PI * 2) * 0.22 * env,
        pitchOffset: (doubleHop - 0.45) * -0.24 * env,
        rollOffset: Math.cos(hopPhase * Math.PI * 2) * 0.19 * env,
        headTiltZ: Math.sin(hopPhase * Math.PI * 4) * 0.26 * env,
        headYaw: Math.sin(hopPhase * Math.PI * 2) * 0.18 * env,
        headPitch: -doubleHop * 0.22 * env,
        wingSpeedMult: 1.25 + doubleHop * 0.9,
        wingAmpMult: 1.15 + doubleHop * 0.42,
        tailWagSpeedMult: 2.2,
        squashY: THREE.MathUtils.lerp(1, squash, env),
        sparkleBoost: 1.2 + doubleHop * 0.75,
      };
    }
    case 'playful_barrel_roll': {
      // Cheeky corkscrew aerial barrel roll with tucked paws & celebratory sparkle flare
      const rollWindow = smoothstep01((p - 0.18) / 0.54);
      const peak = Math.sin(rollWindow * Math.PI);
      return {
        trick,
        phase: p,
        offsetX: Math.sin(rollWindow * Math.PI) * 0.28,
        offsetY: peak * 0.28,
        offsetZ: peak * 0.14,
        yawOffset: Math.sin(rollWindow * Math.PI) * 0.26,
        pitchOffset: -0.12 * peak,
        rollOffset: rollWindow * Math.PI * 2,
        headTiltZ: 0.18 * peak,
        headYaw: 0.15 * peak,
        headPitch: -0.16 * peak,
        wingSpeedMult: 1.25 + peak * 0.95,
        wingAmpMult: 1.1 + peak * 0.38,
        tailWagSpeedMult: 1.95,
        squashY: 1 + peak * 0.065,
        sparkleBoost: 1.2 + peak * 0.95,
      };
    }
  }
}

export function updateSolarLeoPetPose(
  rig: InstantiatedSolarLeoModel,
  elapsed: number,
  dt: number,
  attackRecoil = 0,
  options?: SolarLeoPetPoseOptions
): void {
  const mode = options?.mode ?? 'lobby';
  const speed = options?.speed ?? 0;
  const bankAngle = options?.bankAngle ?? 0;
  const dashing = Boolean(options?.dashing);
  const celebrating = Boolean(options?.celebrating);
  const recoil = THREE.MathUtils.clamp(attackRecoil, 0, 1);

  const trick = evaluatePetPlayfulTrick(elapsed, mode, celebrating);
  const speedFactor = Math.min(1, speed / 6.0);
  const energy = 1 + speedFactor * 0.45 + (dashing ? 0.55 : 0) + recoil * 0.75;

  rig.gaitPhase += dt * (7.2 * trick.wingSpeedMult * energy);
  const wg = rig.gaitPhase;

  const lam = 12;
  const baseBob = Math.sin(elapsed * 3.6) * 0.085;
  const baseRoll = Math.sin(elapsed * 2.2) * 0.08;
  const basePitch = 0.05 + Math.cos(elapsed * 2.9) * 0.05;

  const targetX = trick.offsetX;
  const targetY = baseBob + trick.offsetY + recoil * 0.08;
  const targetZ = trick.offsetZ + recoil * 0.28 + (dashing ? 0.1 : 0);

  const targetPitch =
    basePitch + trick.pitchOffset + speedFactor * 0.16 + (dashing ? 0.22 : 0) + recoil * 0.32;
  const targetRoll = baseRoll + trick.rollOffset + THREE.MathUtils.clamp(bankAngle, -0.55, 0.55);
  const targetYaw = trick.yawOffset;

  rig.visualRoot.position.x = THREE.MathUtils.damp(rig.visualRoot.position.x, targetX, lam, dt);
  rig.visualRoot.position.y = THREE.MathUtils.damp(rig.visualRoot.position.y, targetY, lam, dt);
  rig.visualRoot.position.z = THREE.MathUtils.damp(rig.visualRoot.position.z, targetZ, lam, dt);
  rig.visualRoot.rotation.x = THREE.MathUtils.damp(rig.visualRoot.rotation.x, targetPitch, lam, dt);
  // Direct follow on full-revolution trick axes when spinning/rolling to avoid damp wrap-around jitter
  if (trick.trick === 'happy_spin' || celebrating) {
    rig.visualRoot.rotation.y = targetYaw;
  } else {
    const curY = ((rig.visualRoot.rotation.y + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    rig.visualRoot.rotation.y = THREE.MathUtils.damp(curY, targetYaw, lam, dt);
  }
  if (trick.trick === 'playful_barrel_roll') {
    rig.visualRoot.rotation.z = targetRoll;
  } else {
    const curZ = ((rig.visualRoot.rotation.z + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;
    rig.visualRoot.rotation.z = THREE.MathUtils.damp(curZ, targetRoll, lam, dt);
  }

  // Organic volume-preserving squash & stretch
  const sy = THREE.MathUtils.clamp(trick.squashY + recoil * 0.06, 0.92, 1.12);
  const sxz = 1 / Math.sqrt(sy);
  rig.visualRoot.scale.set(
    THREE.MathUtils.damp(rig.visualRoot.scale.x, sxz, 14, dt),
    THREE.MathUtils.damp(rig.visualRoot.scale.y, sy, 14, dt),
    THREE.MathUtils.damp(rig.visualRoot.scale.z, sxz, 14, dt)
  );

  // Expressive 7-bone skeletal animation (flapping wings, curious head-tilt, wagging tail, kicking paws)
  const b = rig.bones;
  if (b.torso) {
    b.torso.rotation.x = THREE.MathUtils.damp(b.torso.rotation.x, Math.sin(wg * 0.5) * 0.07 + recoil * 0.14, 14, dt);
  }
  if (b.head) {
    const curiousRoll = trick.headTiltZ + Math.sin(elapsed * 2.1) * 0.08;
    const headPitch = trick.headPitch - recoil * 0.16 + Math.sin(elapsed * 3.4) * 0.05;
    const headYaw = trick.headYaw + Math.sin(elapsed * 1.65) * 0.12;
    b.head.rotation.z = THREE.MathUtils.damp(b.head.rotation.z, curiousRoll, 12, dt);
    b.head.rotation.x = THREE.MathUtils.damp(b.head.rotation.x, headPitch, 12, dt);
    b.head.rotation.y = THREE.MathUtils.damp(b.head.rotation.y, headYaw, 12, dt);
  }
  if (b.wingL && b.wingR) {
    // Double-harmonic lively feathered wingbeat (crisp downstroke + buoyant upstroke)
    const flapWave = (Math.sin(wg) + Math.sin(wg * 2) * 0.18) * 0.54 * trick.wingAmpMult;
    const sweepBack = 0.14 + speedFactor * 0.18 + (dashing ? 0.24 : 0) + recoil * 0.22;
    b.wingL.rotation.z = THREE.MathUtils.damp(b.wingL.rotation.z, flapWave, 18, dt);
    b.wingL.rotation.y = THREE.MathUtils.damp(b.wingL.rotation.y, -sweepBack - flapWave * 0.38, 18, dt);
    b.wingR.rotation.z = THREE.MathUtils.damp(b.wingR.rotation.z, -flapWave, 18, dt);
    b.wingR.rotation.y = THREE.MathUtils.damp(b.wingR.rotation.y, sweepBack + flapWave * 0.38, 18, dt);
  }
  if (b.tail) {
    const wagFreq = 6.4 * trick.tailWagSpeedMult + recoil * 5.0;
    const wagYaw = Math.sin(elapsed * wagFreq) * (0.42 + recoil * 0.22);
    const wagPitch = 0.14 + Math.cos(elapsed * wagFreq * 0.5) * 0.16;
    b.tail.rotation.y = THREE.MathUtils.damp(b.tail.rotation.y, wagYaw, 16, dt);
    b.tail.rotation.x = THREE.MathUtils.damp(b.tail.rotation.x, wagPitch, 16, dt);
  }
  if (b.paws) {
    const paddle = Math.sin(wg * 0.85) * 0.3 + recoil * 0.34;
    b.paws.rotation.x = THREE.MathUtils.damp(b.paws.rotation.x, paddle, 15, dt);
    b.paws.rotation.z = THREE.MathUtils.damp(b.paws.rotation.z, Math.cos(wg * 0.85) * 0.14, 15, dt);
  }

  // Update sparkling starlight motes, comet-tail fairy dust & celestial orbit halo (single InstancedMesh, zero GPU overhead)
  if (rig.petAuraRig) {
    const { motes, moteCount, orbitRing } = rig.petAuraRig;
    const boost = trick.sparkleBoost + recoil * 0.8 + (dashing ? 0.6 : 0);
    const orbitSpeed = 1.75 * boost;
    const trailCount = moteCount >= 12 ? 5 : 3;
    const orbitCount = moteCount - trailCount;
    for (let i = 0; i < moteCount; i++) {
      if (i < orbitCount) {
        const a = elapsed * orbitSpeed + (i / orbitCount) * Math.PI * 2;
        const layer = (i % 3) - 1;
        const radius = 0.46 + Math.sin(elapsed * 2.5 + i * 1.7) * 0.11 + recoil * 0.14;
        const mx = rig.visualRoot.position.x + Math.cos(a) * radius;
        const my = rig.visualRoot.position.y + layer * 0.17 + Math.sin(a * 2.0 + i) * 0.14;
        const mz = rig.visualRoot.position.z + Math.sin(a) * radius;
        const twinkle = 0.55 + Math.abs(Math.sin(elapsed * 5.4 + i * 2.1)) * (0.75 * Math.min(1.65, boost));
        _petMoteDummy.position.set(mx, my, mz);
        _petMoteDummy.rotation.set(elapsed * 2.2 + i, elapsed * 3.1 + i, 0);
        // Elongated star-diamond silhouette reads clearly as fairy starlight
        _petMoteDummy.scale.set(twinkle * 0.78, twinkle * 1.38, twinkle * 0.78);
      } else {
        // Comet-tail fairy dust trailing behind Astraeo's swoop & spin trajectory
        const tIdx = i - orbitCount + 1;
        const lagT = Math.max(0, elapsed - tIdx * 0.11);
        const lagTrick = evaluatePetPlayfulTrick(lagT, mode, celebrating);
        const fade = Math.max(0.28, 1 - tIdx / (trailCount + 1));
        const swirlA = elapsed * 4.5 + tIdx * 1.9;
        const mx = lagTrick.offsetX + Math.cos(swirlA) * (0.06 * tIdx);
        const my = Math.sin(lagT * 3.6) * 0.085 + lagTrick.offsetY - 0.06 + Math.sin(swirlA) * 0.05;
        const mz = lagTrick.offsetZ - 0.22 - tIdx * 0.09;
        const twinkle = fade * (0.65 + Math.abs(Math.sin(elapsed * 6.8 + tIdx * 1.6)) * 0.55);
        _petMoteDummy.position.set(mx, my, mz);
        _petMoteDummy.rotation.set(elapsed * 3.0 + tIdx, elapsed * 2.4, tIdx);
        _petMoteDummy.scale.set(twinkle * 0.85, twinkle * 1.25, twinkle * 0.85);
      }
      _petMoteDummy.updateMatrix();
      motes.setMatrixAt(i, _petMoteDummy.matrix);
    }
    motes.instanceMatrix.needsUpdate = true;

    if (orbitRing) {
      orbitRing.position.set(
        rig.visualRoot.position.x,
        rig.visualRoot.position.y - 0.14,
        rig.visualRoot.position.z
      );
      orbitRing.rotation.z = elapsed * (1.3 * boost);
      orbitRing.rotation.x = Math.PI * 0.44 + Math.sin(elapsed * 2.3) * 0.18;
      const ringScale = 0.96 + Math.sin(elapsed * 3.4) * 0.07 + recoil * 0.18;
      orbitRing.scale.setScalar(ringScale);
    }
  }
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

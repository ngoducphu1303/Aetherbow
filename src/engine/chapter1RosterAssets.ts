import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EnemyKind } from '../types/game';

export type Chapter1RosterAssetId =
  | 'fire_lion'
  | 'stone_guardian'
  | 'flame_spirit'
  | 'sun_spearman'
  | 'winged_solar_lion';

export type Chapter1RosterVariant = 'high' | 'lite';

export type Chapter1RosterBurstType = 'none' | 'lunge' | 'slam' | 'cast' | 'roar';

export interface Chapter1RosterSpec {
  id: Chapter1RosterAssetId;
  displayName: string;
  roleLabel: string;
  isSubBoss: boolean;
  enemyKinds: readonly EnemyKind[];
  highPathSegments: readonly string[];
  litePathSegments: readonly string[];
  targetHeight: number;
  hoverOffsetY: number;
  facingYawOffset: number;
  maxLiteBytes: number;
}

export const CHAPTER1_ROSTER_ASSET_VERSION = '1';

export const CHAPTER1_ROSTER_SPECS: Record<Chapter1RosterAssetId, Chapter1RosterSpec> = {
  fire_lion: {
    id: 'fire_lion',
    displayName: 'Sư Tử Lửa Đền Thờ',
    roleLabel: 'Cận chiến tốc độ cao',
    isSubBoss: false,
    enemyKinds: [EnemyKind.SKIRMISHER],
    highPathSegments: ['assets', 'Chương 1', 'Quái mới', '1. Sư Tử Lửa Đền Thờ High.glb'],
    litePathSegments: ['assets', 'Chương 1', 'Quái mới', '1. Sư Tử Lửa Đền Thờ Lite.glb'],
    targetHeight: 1.55,
    hoverOffsetY: 0,
    facingYawOffset: 0,
    maxLiteBytes: 520_000,
  },
  stone_guardian: {
    id: 'stone_guardian',
    displayName: 'Vệ Binh Đá Mặt Trời',
    roleLabel: 'Tank giáp nặng',
    isSubBoss: false,
    enemyKinds: [EnemyKind.GOLEM],
    highPathSegments: ['assets', 'Chương 1', 'Quái mới', '2. Vệ Binh Đá Mặt Trời High.glb'],
    litePathSegments: ['assets', 'Chương 1', 'Quái mới', '2. Vệ Binh Đá Mặt Trời Lite.glb'],
    targetHeight: 2.25,
    hoverOffsetY: 0,
    facingYawOffset: 0,
    maxLiteBytes: 520_000,
  },
  flame_spirit: {
    id: 'flame_spirit',
    displayName: 'Linh Hồn Lửa Hoàng Đạo',
    roleLabel: 'Pháp sư tầm xa',
    isSubBoss: false,
    enemyKinds: [EnemyKind.IMP_ARCHER],
    highPathSegments: ['assets', 'Chương 1', 'Quái mới', '3. Linh Hồn Lửa Hoàng Đạo High.glb'],
    litePathSegments: ['assets', 'Chương 1', 'Quái mới', '3. Linh Hồn Lửa Hoàng Đạo Lite.glb'],
    targetHeight: 1.75,
    hoverOffsetY: 0.26,
    facingYawOffset: 0,
    maxLiteBytes: 520_000,
  },
  sun_spearman: {
    id: 'sun_spearman',
    displayName: 'Chiến Binh Thương Ánh Dương',
    roleLabel: 'Lính gác tầm trung',
    isSubBoss: false,
    enemyKinds: [EnemyKind.DRAGON_WHELP],
    highPathSegments: ['assets', 'Chương 1', 'Quái mới', '4. Chiến Binh Thương Ánh Dương High.glb'],
    litePathSegments: ['assets', 'Chương 1', 'Quái mới', '4. Chiến Binh Thương Ánh Dương Lite.glb'],
    targetHeight: 1.85,
    hoverOffsetY: 0,
    facingYawOffset: 0,
    maxLiteBytes: 520_000,
  },
  winged_solar_lion: {
    id: 'winged_solar_lion',
    displayName: 'Sư Tử Cánh Ánh Dương',
    roleLabel: 'Boss Phụ Chương 1',
    isSubBoss: true,
    enemyKinds: [EnemyKind.WARDEN_BOSS, EnemyKind.TITAN_BOSS],
    highPathSegments: ['assets', 'Chương 1', 'Boss phụ mới', '1. Sư Tử Cánh Ánh Dương High.glb'],
    litePathSegments: ['assets', 'Chương 1', 'Boss phụ mới', '1. Sư Tử Cánh Ánh Dương Lite.glb'],
    targetHeight: 2.65,
    hoverOffsetY: 0.08,
    facingYawOffset: 0,
    maxLiteBytes: 900_000,
  },
};

export const CHAPTER1_ROSTER_ASSET_IDS: readonly Chapter1RosterAssetId[] = [
  'fire_lion',
  'stone_guardian',
  'flame_spirit',
  'sun_spearman',
  'winged_solar_lion',
];

export interface Chapter1RosterEncounterContext {
  chapterId: number;
  enemyKind: EnemyKind;
  isSideModeActive?: boolean;
  isTrainingDummy?: boolean;
  isArenaRival?: boolean;
}

/**
 * Maps Chapter 1 campaign regular mobs and both sub-boss milestones (Stage 4 Warden & Stage 8 Titan)
 * to their dedicated Solar Temple 3D models. Leaves Chapters 2–12 and side modes untouched.
 */
export function resolveChapter1RosterAssetId(
  ctx: Chapter1RosterEncounterContext
): Chapter1RosterAssetId | null {
  if (ctx.chapterId !== 1) return null;
  if (ctx.isSideModeActive || ctx.isTrainingDummy || ctx.isArenaRival) return null;

  switch (ctx.enemyKind) {
    case EnemyKind.SKIRMISHER:
      return 'fire_lion';
    case EnemyKind.GOLEM:
      return 'stone_guardian';
    case EnemyKind.IMP_ARCHER:
      return 'flame_spirit';
    case EnemyKind.DRAGON_WHELP:
      return 'sun_spearman';
    case EnemyKind.WARDEN_BOSS:
    case EnemyKind.TITAN_BOSS:
      return 'winged_solar_lion';
    default:
      return null;
  }
}

export function getChapter1RosterAssetUrl(
  assetId: Chapter1RosterAssetId,
  variant: Chapter1RosterVariant,
  baseUrl = '/',
  baseUri = 'http://localhost:3000/'
): URL {
  const spec = CHAPTER1_ROSTER_SPECS[assetId];
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const segments = variant === 'lite' ? spec.litePathSegments : spec.highPathSegments;
  const encodedPath = segments.map((seg) => encodeURIComponent(seg)).join('/');
  const url = new URL(`${normalizedBase}${encodedPath}`, baseUri);
  url.searchParams.set('v', CHAPTER1_ROSTER_ASSET_VERSION);
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

export interface DownloadChapter1RosterOptions {
  baseUrl?: string;
  baseUri?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

const downloadCache = new Map<string, Promise<ArrayBuffer>>();

function cacheKey(assetId: Chapter1RosterAssetId, variant: Chapter1RosterVariant): string {
  return `${assetId}:${variant}`;
}

export function clearChapter1RosterDownloadCache(): void {
  downloadCache.clear();
}

async function fetchRosterVariantBytes(
  assetId: Chapter1RosterAssetId,
  variant: Chapter1RosterVariant,
  options: DownloadChapter1RosterOptions
): Promise<ArrayBuffer> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? '/';
  const baseUri =
    options.baseUri ?? (typeof document !== 'undefined' ? document.baseURI : 'http://localhost:3000/');
  const url = getChapter1RosterAssetUrl(assetId, variant, baseUrl, baseUri);
  const res = await fetchImpl(url, { signal: options.signal });
  if (!res.ok || res.headers.get('content-type')?.includes('text/html')) {
    throw new Error(`Không tải được mô hình ${assetId} (${variant}, HTTP ${res.status}).`);
  }
  const buf = await res.arrayBuffer();
  validateGlbBuffer(buf, `${assetId}:${variant}`);
  return buf;
}

/**
 * Downloads and caches the compressed GLB bytes. If 'high' fails, automatically falls back to 'lite'.
 */
export function downloadChapter1RosterArrayBuffer(
  assetId: Chapter1RosterAssetId,
  variant: Chapter1RosterVariant,
  options: DownloadChapter1RosterOptions = {}
): Promise<ArrayBuffer> {
  const key = cacheKey(assetId, variant);
  const existing = downloadCache.get(key);
  if (existing) return existing;

  const task = (async () => {
    try {
      return await fetchRosterVariantBytes(assetId, variant, options);
    } catch (error) {
      if (variant === 'high' && !options.signal?.aborted) {
        return await fetchRosterVariantBytes(assetId, 'lite', options);
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

export interface PreparedChapter1RosterTemplate {
  assetId: Chapter1RosterAssetId;
  variant: Chapter1RosterVariant;
  root: THREE.Group;
  scale: number;
  bounds: THREE.Box3;
  sharedGeometries: Set<THREE.BufferGeometry>;
  sharedTextures: Set<THREE.Texture>;
}

export interface InstantiatedChapter1RosterModel {
  assetId: Chapter1RosterAssetId;
  group: THREE.Group;
  hitMeshes: THREE.Mesh[];
  bounds: THREE.Box3;
}

/**
 * Normalizes scale, grounds feet flush at y = 0 (+ hoverOffsetY for floating spirits),
 * centers X/Z around the entity pivot, sets SRGB / anisotropy limits, and flags all
 * BufferGeometries & Textures as shared cached resources so multiple enemy instances
 * never duplicate GPU memory or dispose each other's buffers.
 */
export function prepareChapter1RosterTemplate(
  assetId: Chapter1RosterAssetId,
  gltfScene: THREE.Object3D,
  maxAnisotropy = 4,
  options?: { liteMode?: boolean; facingYawOffset?: number }
): PreparedChapter1RosterTemplate {
  const spec = CHAPTER1_ROSTER_SPECS[assetId];
  const liteMode = Boolean(options?.liteMode);
  const variant: Chapter1RosterVariant = liteMode ? 'lite' : 'high';

  const root = new THREE.Group();
  root.name = `Ch1RosterTemplate_${assetId}_${variant}`;

  const pivot = new THREE.Group();
  pivot.name = `Ch1RosterPivot_${assetId}`;
  pivot.rotation.y = options?.facingYawOffset ?? spec.facingYawOffset;
  pivot.add(gltfScene);
  root.add(pivot);

  root.updateMatrixWorld(true);
  const rawBox = new THREE.Box3().setFromObject(gltfScene);
  const rawSize = new THREE.Vector3();
  const rawCenter = new THREE.Vector3();
  rawBox.getSize(rawSize);
  rawBox.getCenter(rawCenter);

  const rawHeight = Math.max(0.001, rawSize.y);
  const scale = spec.targetHeight / rawHeight;

  gltfScene.scale.setScalar(scale);
  gltfScene.position.set(
    -rawCenter.x * scale,
    -rawBox.min.y * scale + spec.hoverOffsetY,
    -rawCenter.z * scale
  );

  const anisoCap = liteMode ? 2 : 8;
  const aniso = Math.max(1, Math.min(anisoCap, Math.floor(maxAnisotropy || 1)));
  const sharedGeometries = new Set<THREE.BufferGeometry>();
  const sharedTextures = new Set<THREE.Texture>();

  gltfScene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.castShadow = !liteMode;
    obj.receiveShadow = true;
    obj.frustumCulled = false;

    if (obj.geometry) {
      obj.geometry.userData = {
        ...(obj.geometry.userData ?? {}),
        sharedCachedGeometry: true,
      };
      sharedGeometries.add(obj.geometry);
    }

    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat) continue;
      if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
        const registerTex = (tex: THREE.Texture | null | undefined, isSrgb: boolean) => {
          if (!tex) return;
          if (isSrgb) {
            tex.colorSpace = THREE.SRGBColorSpace;
          }
          tex.anisotropy = aniso;
          tex.userData = {
            ...(tex.userData ?? {}),
            sharedCachedTexture: true,
          };
          tex.needsUpdate = true;
          sharedTextures.add(tex);
        };
        registerTex(mat.map, true);
        registerTex(mat.normalMap, false);
        registerTex(mat.roughnessMap, false);
        registerTex(mat.metalnessMap, false);
        mat.envMapIntensity = liteMode ? 1.0 : 1.28;
        mat.needsUpdate = true;
      }
    }
  });

  root.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(root);
  return {
    assetId,
    variant,
    root,
    scale,
    bounds,
    sharedGeometries,
    sharedTextures,
  };
}

/**
 * Instantiates a lightweight combat-ready clone from a cached template.
 * Shares BufferGeometry and GPU Textures across all enemies of the same type;
 * only clones the lightweight Material descriptor so each enemy can flash on hit
 * or glow for Elite/Stage-8 Titan distinction independently.
 */
export function instantiateChapter1RosterModel(
  template: PreparedChapter1RosterTemplate,
  options?: {
    heightMultiplier?: number;
    emissiveTintHex?: number;
    emissiveIntensity?: number;
  }
): InstantiatedChapter1RosterModel {
  const group = template.root.clone(true);
  group.name = `Ch1RosterInstance_${template.assetId}`;
  const heightMult = options?.heightMultiplier ?? 1.0;
  if (Math.abs(heightMult - 1.0) > 0.001) {
    group.scale.setScalar(heightMult);
  }

  const hitMeshes: THREE.Mesh[] = [];
  group.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.frustumCulled = false;

    const cloneMat = (src: THREE.Material): THREE.Material => {
      const cloned = src.clone();
      if (
        (cloned instanceof THREE.MeshStandardMaterial ||
          cloned instanceof THREE.MeshPhysicalMaterial) &&
        options?.emissiveTintHex !== undefined
      ) {
        cloned.emissive.setHex(options.emissiveTintHex);
        cloned.emissiveIntensity = options.emissiveIntensity ?? 0.22;
      }
      return cloned;
    };

    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map(cloneMat);
    } else if (obj.material) {
      obj.material = cloneMat(obj.material);
    }
    hitMeshes.push(obj);
  });

  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  return {
    assetId: template.assetId,
    group,
    hitMeshes,
    bounds,
  };
}

const parsedTemplateCache = new Map<string, Promise<PreparedChapter1RosterTemplate>>();
const resolvedTemplates = new Map<string, PreparedChapter1RosterTemplate>();

export function getCachedChapter1RosterTemplateSync(
  assetId: Chapter1RosterAssetId,
  variant: Chapter1RosterVariant
): PreparedChapter1RosterTemplate | null {
  return resolvedTemplates.get(cacheKey(assetId, variant)) ?? null;
}

export function loadChapter1RosterTemplate(
  assetId: Chapter1RosterAssetId,
  variant: Chapter1RosterVariant,
  maxAnisotropy: number,
  options: DownloadChapter1RosterOptions = {}
): Promise<PreparedChapter1RosterTemplate> {
  const key = cacheKey(assetId, variant);
  const existing = parsedTemplateCache.get(key);
  if (existing) return existing;

  const task = (async () => {
    const baseUrl = options.baseUrl ?? '/';
    const baseUri =
      options.baseUri ?? (typeof document !== 'undefined' ? document.baseURI : 'http://localhost:3000/');
    const assetUrl = getChapter1RosterAssetUrl(assetId, variant, baseUrl, baseUri);
    const bytes = await downloadChapter1RosterArrayBuffer(assetId, variant, options);
    const gltf = await new GLTFLoader().parseAsync(bytes, new URL('.', assetUrl).href);
    const prepared = prepareChapter1RosterTemplate(assetId, gltf.scene, maxAnisotropy, {
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

/**
 * Releases all cached shared geometries, textures, and template materials on full engine teardown.
 */
export function disposeChapter1RosterTemplateCache(): void {
  for (const tpl of resolvedTemplates.values()) {
    tpl.sharedGeometries.forEach((geo) => {
      if (geo.userData) delete geo.userData.sharedCachedGeometry;
      geo.dispose();
    });
    tpl.sharedTextures.forEach((tex) => {
      if (tex.userData) delete tex.userData.sharedCachedTexture;
      tex.dispose();
    });
    tpl.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m.dispose());
      }
    });
  }
  resolvedTemplates.clear();
  parsedTemplateCache.clear();
}

export interface Chapter1RosterMotionInput {
  assetId: Chapter1RosterAssetId;
  elapsed: number;
  phaseAngle: number;
  speed: number;
  telegraphType: 'none' | 'shot' | 'lunge' | 'slam' | 'spiral' | 'lane';
  telegraphProgress: number;
  burstType: Chapter1RosterBurstType;
  burstTimer: number;
  bossPhase: 1 | 2 | 3;
  stunTimer: number;
  hitFlashTimer: number;
  isSubBossTitan?: boolean;
}

export interface Chapter1RosterMotionSnapshot {
  offsetY: number;
  offsetX: number;
  offsetZ: number;
  pitchX: number;
  rollZ: number;
  yawOffset: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

const _motionSnap: Chapter1RosterMotionSnapshot = {
  offsetY: 0,
  offsetX: 0,
  offsetZ: 0,
  pitchX: 0,
  rollZ: 0,
  yawOffset: 0,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
};

/**
 * Computes distinct, zero-allocation procedural combat choreography for all 5 new Chapter 1 models.
 */
export function computeChapter1RosterMotion(
  input: Chapter1RosterMotionInput
): Chapter1RosterMotionSnapshot {
  const {
    assetId,
    elapsed,
    phaseAngle,
    speed,
    telegraphType,
    telegraphProgress,
    burstType,
    burstTimer,
    bossPhase,
    stunTimer,
    hitFlashTimer,
  } = input;

  const moveFactor = Math.min(1, speed / 3.4);
  const t = elapsed + phaseAngle;

  let offsetY = 0;
  let offsetX = 0;
  let offsetZ = 0;
  let pitchX = 0;
  let rollZ = 0;
  let yawOffset = 0;
  let scaleX = 1;
  let scaleY = 1;
  let scaleZ = 1;

  if (stunTimer > 0) {
    offsetY = -0.05;
    pitchX = 0.2;
    rollZ = Math.sin(elapsed * 15 + phaseAngle) * 0.14;
    scaleY = 0.94;
    scaleX = 1.05;
    scaleZ = 1.05;
  } else if (assetId === 'fire_lion') {
    // Fast quadrupedal hunter: quick bounding stride + low predatory pounce crouch
    const gait = elapsed * (8.8 + moveFactor * 4.2) + phaseAngle;
    const bounce = Math.abs(Math.sin(gait));
    offsetY = moveFactor > 0.08 ? bounce * 0.16 * moveFactor : Math.sin(t * 3.4) * 0.03;
    pitchX = moveFactor > 0.08 ? 0.12 * moveFactor + Math.cos(gait) * 0.09 * moveFactor : 0;
    rollZ = Math.sin(gait * 0.5) * 0.08 * moveFactor;
    scaleY = 1 + Math.sin(t * 3.6) * 0.025 + bounce * 0.04 * moveFactor;
    scaleZ = 1 + moveFactor * 0.05;
    scaleX = 1 - moveFactor * 0.02;
  } else if (assetId === 'stone_guardian') {
    // Heavy armored golem tank: thunderous low stomp + shoulder sway
    const stomp = elapsed * (4.6 + moveFactor * 2.1) + phaseAngle;
    const stepLift = Math.abs(Math.sin(stomp));
    offsetY = moveFactor > 0.08 ? stepLift * 0.1 * moveFactor : 0;
    rollZ = moveFactor > 0.08 ? Math.sin(stomp) * 0.11 * moveFactor : Math.sin(t * 1.9) * 0.02;
    pitchX = moveFactor > 0.08 ? 0.05 * moveFactor : 0;
    scaleY = 1 - stepLift * 0.035 * moveFactor + Math.sin(t * 2.0) * 0.015;
    scaleX = 1 + stepLift * 0.03 * moveFactor;
    scaleZ = scaleX;
  } else if (assetId === 'flame_spirit') {
    // Floating zodiac fire mage: smooth levitation + arcane tilt
    offsetY = Math.sin(elapsed * 3.8 + phaseAngle) * 0.16;
    rollZ = Math.cos(elapsed * 2.4 + phaseAngle) * 0.1;
    pitchX = 0.08 * moveFactor + Math.sin(elapsed * 3.1 + phaseAngle) * 0.05;
    yawOffset = Math.sin(elapsed * 1.9 + phaseAngle) * 0.09;
    const pulse = Math.sin(elapsed * 5.2 + phaseAngle) * 0.035;
    scaleX = 1 + pulse;
    scaleY = 1 - pulse * 0.6;
    scaleZ = 1 + pulse;
  } else if (assetId === 'sun_spearman') {
    // Mid-range solar spear sentinel: disciplined martial march + thrust readiness
    const march = elapsed * (7.2 + moveFactor * 3.0) + phaseAngle;
    offsetY = moveFactor > 0.08 ? Math.abs(Math.sin(march)) * 0.11 * moveFactor : Math.sin(t * 2.6) * 0.02;
    pitchX = moveFactor > 0.08 ? 0.08 * moveFactor : 0.02;
    rollZ = Math.sin(march) * 0.07 * moveFactor;
    yawOffset = Math.cos(march) * 0.06 * moveFactor;
    scaleY = 1 + Math.sin(t * 3.0) * 0.02;
  } else {
    // Winged Solar Lion Sub-Boss: aerial wing-glide lift + regal predatory power
    const phaseTempo = bossPhase === 3 ? 1.32 : bossPhase === 2 ? 1.16 : 1.0;
    const wingCycle = elapsed * 4.4 * phaseTempo + phaseAngle;
    const stride = elapsed * (6.8 * phaseTempo) + phaseAngle;
    offsetY =
      Math.sin(wingCycle) * 0.14 +
      (moveFactor > 0.08 ? Math.abs(Math.sin(stride)) * 0.11 * moveFactor : 0);
    pitchX = moveFactor * 0.11 + Math.sin(wingCycle) * 0.05;
    rollZ = Math.sin(stride * 0.5) * 0.08 * (0.4 + moveFactor * 0.6);
    scaleX = 1 + Math.sin(wingCycle) * 0.03;
    scaleY = 1 + Math.cos(wingCycle) * 0.028;
    scaleZ = 1 + moveFactor * 0.03;
  }

  // Telegraph windup anticipation (clear, readable silhouette)
  if (stunTimer <= 0 && telegraphType !== 'none') {
    const p = Math.max(0, Math.min(1, telegraphProgress));
    if (telegraphType === 'lunge' || telegraphType === 'lane') {
      offsetZ -= 0.22 * p;
      pitchX -= 0.16 * p;
      scaleY *= 1 - 0.09 * p;
      scaleZ *= 1 + 0.1 * p;
    } else if (telegraphType === 'slam' || telegraphType === 'spiral') {
      offsetY += 0.24 * p;
      pitchX -= 0.18 * p;
      scaleY *= 1 + 0.09 * p;
    } else if (telegraphType === 'shot') {
      offsetY += assetId === 'flame_spirit' ? 0.16 * p : 0.07 * p;
      pitchX -= 0.12 * p;
      scaleX *= 1 + 0.07 * p;
      scaleZ *= 1 + 0.07 * p;
    }
  }

  // Attack release burst impulse
  if (stunTimer <= 0 && burstType !== 'none' && burstTimer > 0) {
    const b = Math.min(1, burstTimer / 0.36);
    if (burstType === 'lunge') {
      offsetZ += 0.34 * b;
      pitchX += 0.24 * b;
      scaleZ *= 1 + 0.14 * b;
      scaleY *= 1 - 0.08 * b;
    } else if (burstType === 'slam') {
      offsetY -= 0.1 * b;
      pitchX += 0.28 * b;
      scaleX *= 1 + 0.16 * b;
      scaleZ *= 1 + 0.16 * b;
      scaleY *= 1 - 0.14 * b;
    } else if (burstType === 'cast') {
      offsetZ += 0.18 * b;
      offsetY += 0.12 * b;
      scaleX *= 1 + 0.12 * b;
      scaleY *= 1 + 0.12 * b;
      scaleZ *= 1 + 0.12 * b;
    } else if (burstType === 'roar') {
      offsetY += 0.14 * b;
      pitchX -= 0.18 * b;
      scaleX *= 1 + 0.1 * b;
      scaleY *= 1 + 0.12 * b;
      scaleZ *= 1 + 0.1 * b;
    }
  }

  // Hit-recoil micro-jolt
  if (hitFlashTimer > 0) {
    const h = Math.min(1, hitFlashTimer / 0.12);
    offsetX += Math.sin(elapsed * 58 + phaseAngle) * 0.055 * h;
    offsetZ -= 0.08 * h;
    scaleX *= 1 + 0.05 * h;
    scaleY *= 1 - 0.05 * h;
  }

  _motionSnap.offsetY = offsetY;
  _motionSnap.offsetX = offsetX;
  _motionSnap.offsetZ = offsetZ;
  _motionSnap.pitchX = pitchX;
  _motionSnap.rollZ = rollZ;
  _motionSnap.yawOffset = yawOffset;
  _motionSnap.scaleX = scaleX;
  _motionSnap.scaleY = scaleY;
  _motionSnap.scaleZ = scaleZ;
  return _motionSnap;
}

/**
 * Smoothly applies archetype-specific procedural combat animation onto an attached Chapter 1 3D visual group.
 */
export function updateChapter1RosterMotion(
  visualGroup: THREE.Group,
  input: Chapter1RosterMotionInput,
  baseScale: number,
  dt: number
): void {
  const snap = computeChapter1RosterMotion(input);
  const lambda = 13;
  visualGroup.position.x = THREE.MathUtils.damp(visualGroup.position.x, snap.offsetX, lambda, dt);
  visualGroup.position.y = THREE.MathUtils.damp(visualGroup.position.y, snap.offsetY, lambda, dt);
  visualGroup.position.z = THREE.MathUtils.damp(visualGroup.position.z, snap.offsetZ, lambda, dt);
  visualGroup.rotation.x = THREE.MathUtils.damp(visualGroup.rotation.x, snap.pitchX, lambda, dt);
  visualGroup.rotation.z = THREE.MathUtils.damp(visualGroup.rotation.z, snap.rollZ, lambda, dt);
  visualGroup.rotation.y = THREE.MathUtils.damp(visualGroup.rotation.y, snap.yawOffset, lambda, dt);
  visualGroup.scale.x = THREE.MathUtils.damp(visualGroup.scale.x, baseScale * snap.scaleX, lambda, dt);
  visualGroup.scale.y = THREE.MathUtils.damp(visualGroup.scale.y, baseScale * snap.scaleY, lambda, dt);
  visualGroup.scale.z = THREE.MathUtils.damp(visualGroup.scale.z, baseScale * snap.scaleZ, lambda, dt);
}

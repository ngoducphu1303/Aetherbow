import { getGlbAssetUrl } from './glbAssetUrl';
import * as THREE from 'three';

/**
 * Optimized 3D arena map for Chapter 3 (Thánh Địa Ngọc Lục Bảo · Taurus Emerald Sanctuary).
 * Generated via scripts/build-chapter3-variants.mjs:
 * - Lite: ~1.69 MB (~38.6k verts, 1024px JPEG albedo, single material) for Dell Latitude E5430
 * - High: ~3.26 MB (~90k tris, 2048px albedo + normal + roughness) for discrete GPUs
 */
export const CHAPTER3_MAP_LITE_PATH_SEGMENTS = [
  'assets',
  'Chương 3',
  'Runtime',
  'taurus-arena-lite.glb',
] as const;

export const CHAPTER3_MAP_HIGH_PATH_SEGMENTS = [
  'assets',
  'Chương 3',
  'Runtime',
  'taurus-arena-high.glb',
] as const;

export const CHAPTER3_MAP_VERSION = '1';
export const CHAPTER3_MAP_HIGH_TIMEOUT_MS = 60_000;
export const CHAPTER3_MAP_LITE_TIMEOUT_MS = 30_000;

/**
 * Measured directly from dau_truong_thanh_dia_ngoc_luc_bao.glb (after node_0 +90° X rotation):
 * - World X in [-0.4709, 0.4526] (span 0.9235), World Z in [-0.4402, 0.4891] (span 0.9293),
 *   World Y in [0.0003, 0.7287]
 * - Flat central emerald marble combat platform spans radius r <= 0.335 at y ≈ 0.5135 (p95 ≈ 0.512..0.519)
 * - Outer emerald sanctuary curbs, marble pillars & glowing crystal spires rise around r ≈ 0.35..0.46 up to y = 0.7287
 * Scaling inner radius 0.335 -> 16.2 keeps the full rectangular combat arena
 * (±10.5 × ±12.2, corner diagonal 16.09) flush on flat walkable emerald marble while framing
 * the sanctuary columns & crystal spires cleanly around r ≈ 17.5..22.4.
 */
export const CHAPTER3_MAP_INNER_RADIUS = 0.335;
export const CHAPTER3_MAP_TARGET_INNER_RADIUS = 16.2;
export const CHAPTER3_MAP_FLOOR_Y_RAW = 0.5135;
export const CHAPTER3_MAP_FLOOR_OFFSET_Y = -0.02;

export function getChapter3MapLiteAssetUrl(
  baseUrl = '/',
  baseUri = 'http://localhost:3000/'
): URL {
  return getGlbAssetUrl(CHAPTER3_MAP_LITE_PATH_SEGMENTS, CHAPTER3_MAP_VERSION, baseUrl, baseUri);
}

export function getChapter3MapHighAssetUrl(
  baseUrl = '/',
  baseUri = 'http://localhost:3000/'
): URL {
  return getGlbAssetUrl(CHAPTER3_MAP_HIGH_PATH_SEGMENTS, CHAPTER3_MAP_VERSION, baseUrl, baseUri);
}

function getChapter3MapLocalAssetUrl(
  variant: 'lite' | 'full',
  baseUrl = '/',
  baseUri = 'http://localhost:3000/'
): URL {
  const segments =
    variant === 'lite' ? CHAPTER3_MAP_LITE_PATH_SEGMENTS : CHAPTER3_MAP_HIGH_PATH_SEGMENTS;
  const localBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = new URL(segments.map(encodeURIComponent).join('/'), new URL(localBase, baseUri));
  url.searchParams.set('v', CHAPTER3_MAP_VERSION);
  return url;
}

export function isValidChapter3GlbBuffer(data: ArrayBuffer): boolean {
  if (data.byteLength < 20) return false;
  const header = new DataView(data);
  return (
    header.getUint32(0, true) === 0x46546c67 &&
    header.getUint32(4, true) === 2 &&
    header.getUint32(8, true) === data.byteLength
  );
}

export interface FetchChapter3MapOptions {
  variant: 'lite' | 'full';
  baseUrl?: string;
  baseUri?: string;
  cdnUrl?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  onProgress?: (loadedBytes: number, totalBytes: number) => void;
}

export interface FetchChapter3MapResult {
  buffer: ArrayBuffer;
  resolvedVariant: 'lite' | 'full';
  fallbackUsed: boolean;
}

async function readResponseBufferWithProgress(
  response: Response,
  onProgress?: (loadedBytes: number, totalBytes: number) => void
): Promise<ArrayBuffer> {
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('text/html')) {
    throw new Error('Phản hồi không phải tệp GLB hợp lệ');
  }
  const encoding = response.headers.get('content-encoding');
  const totalBytes =
    !encoding || encoding === 'identity'
      ? Number(response.headers.get('content-length')) || 0
      : 0;
  const reader = response.body?.getReader();
  if (!reader) {
    const buf = await response.arrayBuffer();
    onProgress?.(buf.byteLength, totalBytes || buf.byteLength);
    return buf;
  }

  const chunks: Uint8Array<ArrayBuffer>[] = [];
  let loadedBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      loadedBytes += value.byteLength;
      onProgress?.(loadedBytes, totalBytes);
    }
  } finally {
    reader.releaseLock();
  }
  const combined = new Uint8Array(loadedBytes);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return combined.buffer;
}

async function fetchGlbWithTimeout(
  fetchImpl: typeof fetch,
  url: URL | string,
  timeoutMs: number,
  externalSignal?: AbortSignal,
  onProgress?: (loadedBytes: number, totalBytes: number) => void
): Promise<ArrayBuffer> {
  const controller = new AbortController();
  let timedOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const resetTimeout = () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
  };
  const onExternalAbort = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }
  resetTimeout();
  try {
    const response = await fetchImpl(url, { signal: controller.signal });
    const buffer = await readResponseBufferWithProgress(response, (loaded, total) => {
      resetTimeout();
      onProgress?.(loaded, total);
    });
    if (!isValidChapter3GlbBuffer(buffer)) {
      throw new Error('Tệp GLB Bản Đồ Chương 3 không hợp lệ');
    }
    return buffer;
  } catch (error) {
    if (timedOut) {
      throw new Error('Hết thời gian tải Bản Đồ 3D Chương 3');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

async function fetchVariantWithLocalFallback(
  fetchImpl: typeof fetch,
  primaryUrl: URL | string,
  localUrl: URL,
  timeoutMs: number,
  signal?: AbortSignal,
  onProgress?: (loadedBytes: number, totalBytes: number) => void
): Promise<ArrayBuffer> {
  try {
    return await fetchGlbWithTimeout(fetchImpl, primaryUrl, timeoutMs, signal, onProgress);
  } catch (error) {
    if (signal?.aborted) throw error;
    const primaryHref = typeof primaryUrl === 'string' ? primaryUrl : primaryUrl.href;
    if (primaryHref === localUrl.href) {
      throw error;
    }
    return fetchGlbWithTimeout(fetchImpl, localUrl, timeoutMs, signal, onProgress);
  }
}

/**
 * Loads the Chapter 3 Taurus Emerald Sanctuary GLB:
 * - 'lite': tries CDN Lite GLB, falling back automatically to bundled local Lite GLB if CDN returns 404.
 * - 'full': tries CDN/local High GLB, falling back to Lite GLB on failure so low-end GPUs & offline builds stay playable.
 */
export async function fetchChapter3MapArrayBuffer(
  options: FetchChapter3MapOptions
): Promise<FetchChapter3MapResult> {
  const baseUrl = options.baseUrl ?? '/';
  const baseUri = options.baseUri ?? 'http://localhost:3000/';
  const fetchImpl = options.fetchImpl ?? fetch;
  const signal = options.signal;
  const liteUrl = getChapter3MapLiteAssetUrl(baseUrl, baseUri);
  const liteLocalUrl = getChapter3MapLocalAssetUrl('lite', baseUrl, baseUri);

  if (options.variant === 'lite') {
    const buffer = await fetchVariantWithLocalFallback(
      fetchImpl,
      liteUrl,
      liteLocalUrl,
      CHAPTER3_MAP_LITE_TIMEOUT_MS,
      signal,
      options.onProgress
    );
    return { buffer, resolvedVariant: 'lite', fallbackUsed: false };
  }

  const highUrl = options.cdnUrl ?? getChapter3MapHighAssetUrl(baseUrl, baseUri);
  const highLocalUrl = getChapter3MapLocalAssetUrl('full', baseUrl, baseUri);
  try {
    const buffer = await fetchVariantWithLocalFallback(
      fetchImpl,
      highUrl,
      highLocalUrl,
      CHAPTER3_MAP_HIGH_TIMEOUT_MS,
      signal,
      options.onProgress
    );
    return { buffer, resolvedVariant: 'full', fallbackUsed: false };
  } catch (error) {
    if (signal?.aborted) throw error;
    const liteBuffer = await fetchVariantWithLocalFallback(
      fetchImpl,
      liteUrl,
      liteLocalUrl,
      CHAPTER3_MAP_LITE_TIMEOUT_MS,
      signal,
      options.onProgress
    );
    return { buffer: liteBuffer, resolvedVariant: 'lite', fallbackUsed: true };
  }
}

export interface PreparedChapter3Map {
  group: THREE.Group;
  scale: number;
  bounds: THREE.Box3;
}

/**
 * Normalizes scale, floor elevation (y ≈ -0.02 so ground decals, rings, shadows,
 * and boss entrance seals at y >= 0.01 sit cleanly on the emerald marble with zero Z-fighting),
 * PBR texture color space / anisotropy, and shadow flags for Taurus Emerald Sanctuary.
 */
export function prepareChapter3MapModel(
  gltfScene: THREE.Object3D,
  maxAnisotropy = 4,
  options?: { liteMode?: boolean }
): PreparedChapter3Map {
  const group = new THREE.Group();
  group.name = options?.liteMode ? 'Chapter3MapLiteGLB' : 'Chapter3MapGLB';

  gltfScene.updateMatrixWorld(true);
  const rawBox = new THREE.Box3().setFromObject(gltfScene);
  const rawSize = new THREE.Vector3();
  const rawCenter = new THREE.Vector3();
  rawBox.getSize(rawSize);
  rawBox.getCenter(rawCenter);

  const horizontalSpan = Math.max(0.001, Math.min(rawSize.x, rawSize.z));
  // Expected raw horizontal span is ~0.9235; preserve exact circular inner floor calibration
  // while remaining resilient if a custom asset uses another unit scale.
  const isCanonicalUnitScale = horizontalSpan > 0.7 && horizontalSpan < 1.5;
  const scale = isCanonicalUnitScale
    ? CHAPTER3_MAP_TARGET_INNER_RADIUS / CHAPTER3_MAP_INNER_RADIUS
    : (CHAPTER3_MAP_TARGET_INNER_RADIUS * 2 * (0.924 / (CHAPTER3_MAP_INNER_RADIUS * 2))) /
      horizontalSpan;

  const rawFloorY = isCanonicalUnitScale
    ? CHAPTER3_MAP_FLOOR_Y_RAW
    : rawBox.min.y + rawSize.y * 0.705;

  gltfScene.scale.setScalar(scale);
  gltfScene.position.set(
    -rawCenter.x * scale,
    -rawFloorY * scale + CHAPTER3_MAP_FLOOR_OFFSET_Y,
    -rawCenter.z * scale
  );

  const anisoCap = options?.liteMode ? 2 : 8;
  const aniso = Math.max(1, Math.min(anisoCap, Math.floor(maxAnisotropy || 1)));
  gltfScene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.receiveShadow = true;
    obj.castShadow = false;
    obj.frustumCulled = false;

    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat) continue;
      if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
        if (mat.map) {
          mat.map.colorSpace = THREE.SRGBColorSpace;
          mat.map.anisotropy = aniso;
          mat.map.needsUpdate = true;
        }
        if (mat.normalMap) {
          mat.normalMap.anisotropy = aniso;
        }
        if (mat.roughnessMap) {
          mat.roughnessMap.anisotropy = aniso;
        }
        if (mat.metalnessMap) {
          mat.metalnessMap.anisotropy = aniso;
        }
        mat.envMapIntensity = Math.max(mat.envMapIntensity ?? 1, 1.14);
        // Subtle emerald sanctuary stone bounce so shaded jade pillars & marble retain clarity under arena lights
        if (!mat.emissiveMap && mat.emissive.getHex() === 0x000000) {
          mat.emissive.setHex(0x062414);
          mat.emissiveIntensity = 0.2;
        }
        mat.needsUpdate = true;
      }
    }
  });

  group.add(gltfScene);
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  return { group, scale, bounds };
}

export interface Chapter3SanctuaryAtmosphereBudget {
  moteCount: number;
  pollenCount: number;
  sanctuaryLightCount: number;
  enableFloorRuneRings: boolean;
}

/**
 * Hardware-aware cap for Chapter 3 Emerald Sanctuary atmosphere so Dell Latitude E5430 Lite
 * maintains 30 FPS with zero GC churn while discrete GPUs get fuller crystal motes & shrine lighting.
 */
export function resolveChapter3SanctuaryAtmosphereBudget(
  liteActive: boolean,
  isSoftwareGl: boolean
): Chapter3SanctuaryAtmosphereBudget {
  if (isSoftwareGl) {
    return {
      moteCount: 14,
      pollenCount: 10,
      sanctuaryLightCount: 0,
      enableFloorRuneRings: true,
    };
  }
  if (liteActive) {
    return {
      moteCount: 24,
      pollenCount: 12,
      sanctuaryLightCount: 1,
      enableFloorRuneRings: true,
    };
  }
  return {
    moteCount: 56,
    pollenCount: 30,
    sanctuaryLightCount: 3,
    enableFloorRuneRings: true,
  };
}

interface SanctuaryParticleSeed {
  angle: number;
  radius: number;
  baseY: number;
  heightSpan: number;
  riseSpeed: number;
  swirlSpeed: number;
  phase: number;
  scale: number;
}

export interface Chapter3SanctuaryAtmosphereRig {
  group: THREE.Group;
  budget: Chapter3SanctuaryAtmosphereBudget;
  sanctuaryLights: Array<{ light: THREE.PointLight; baseIntensity: number; phase: number }>;
  runeRings: Array<{ mesh: THREE.Mesh; baseOpacity: number; phase: number }>;
  moteMesh: THREE.InstancedMesh | null;
  moteSeeds: SanctuaryParticleSeed[];
  pollenMesh: THREE.InstancedMesh | null;
  pollenSeeds: SanctuaryParticleSeed[];
}

const _sanctuaryDummy = new THREE.Object3D();

/**
 * Builds the Chapter 3 Taurus Emerald Sanctuary atmospheric overlay:
 * - Soft pulsing emerald & gold sanctuary perimeter rune rings + non-shadow PointLights
 * - Floating emerald crystal motes (single InstancedMesh, zero per-frame allocation)
 * - Drifting golden sanctuary pollen (single InstancedMesh, zero per-frame allocation)
 */
export function createChapter3EmeraldSanctuaryAtmosphere(options: {
  liteActive: boolean;
  isSoftwareGl: boolean;
}): Chapter3SanctuaryAtmosphereRig {
  const budget = resolveChapter3SanctuaryAtmosphereBudget(
    options.liteActive,
    options.isSoftwareGl
  );
  const group = new THREE.Group();
  group.name = 'Chapter3EmeraldSanctuaryAtmosphere';

  const sanctuaryLights: Chapter3SanctuaryAtmosphereRig['sanctuaryLights'] = [];
  const runeRings: Chapter3SanctuaryAtmosphereRig['runeRings'] = [];
  const moteSeeds: SanctuaryParticleSeed[] = [];
  const pollenSeeds: SanctuaryParticleSeed[] = [];

  // 1. Subtle emerald & gilded perimeter aura rings framing the walkable sanctuary stone
  if (budget.enableFloorRuneRings) {
    const outerRingGeo = new THREE.RingGeometry(15.6, 18.6, options.liteActive ? 28 : 48);
    outerRingGeo.rotateX(-Math.PI / 2);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.position.set(0, 0.035, 0);
    outerRing.renderOrder = 1;
    group.add(outerRing);
    runeRings.push({ mesh: outerRing, baseOpacity: 0.13, phase: 0 });

    const innerRuneGeo = new THREE.RingGeometry(13.8, 15.5, options.liteActive ? 28 : 48);
    innerRuneGeo.rotateX(-Math.PI / 2);
    const innerRuneMat = new THREE.MeshBasicMaterial({
      color: 0xfacc15,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const innerRune = new THREE.Mesh(innerRuneGeo, innerRuneMat);
    innerRune.position.set(0, 0.03, 0);
    innerRune.renderOrder = 1;
    group.add(innerRune);
    runeRings.push({ mesh: innerRune, baseOpacity: 0.08, phase: 1.9 });
  }

  // 2. Non-shadow emerald & golden sanctuary PointLights positioned around the temple columns
  const lightSpecs: Array<[number, number, number, number, number, number]> = [
    [0, 3.6, -14.0, 0x34d399, 2.0, 34],
    [-13.4, 2.8, 4.2, 0xfbbf24, 1.55, 28],
    [13.4, 2.8, 4.2, 0x10b981, 1.55, 28],
  ];
  for (let i = 0; i < Math.min(budget.sanctuaryLightCount, lightSpecs.length); i++) {
    const [lx, ly, lz, hex, intensity, dist] = lightSpecs[i];
    const light = new THREE.PointLight(hex, intensity, dist, 2);
    light.position.set(lx, ly, lz);
    light.castShadow = false;
    group.add(light);
    sanctuaryLights.push({ light, baseIntensity: intensity, phase: i * 2.05 });
  }

  // 3. Rising emerald crystal motes (single InstancedMesh)
  let moteMesh: THREE.InstancedMesh | null = null;
  if (budget.moteCount > 0) {
    const moteGeo = new THREE.OctahedronGeometry(0.072, 0);
    const moteMat = new THREE.MeshBasicMaterial({
      color: 0x34d399,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    moteMesh = new THREE.InstancedMesh(moteGeo, moteMat, budget.moteCount);
    moteMesh.frustumCulled = false;
    const jadeColors = [
      new THREE.Color(0x10b981),
      new THREE.Color(0x34d399),
      new THREE.Color(0xa7f3d0),
    ];
    for (let i = 0; i < budget.moteCount; i++) {
      const onRim = i % 10 < 7;
      const radius = onRim ? 11.4 + ((i * 2.13) % 7.0) : 2.4 + ((i * 3.37) % 9.0);
      moteSeeds.push({
        angle: (i * 2.399963) % (Math.PI * 2),
        radius,
        baseY: (i * 0.59) % 7.4,
        heightSpan: 7.4 + (i % 4) * 1.05,
        riseSpeed: 0.54 + (i % 5) * 0.16,
        swirlSpeed: (i % 2 === 0 ? 1 : -1) * (0.1 + (i % 3) * 0.045),
        phase: i * 1.41,
        scale: 0.65 + (i % 4) * 0.25,
      });
      moteMesh.setColorAt(i, jadeColors[i % jadeColors.length]);
    }
    if (moteMesh.instanceColor) {
      moteMesh.instanceColor.needsUpdate = true;
    }
    group.add(moteMesh);
  }

  // 4. Drifting golden sanctuary pollen (single InstancedMesh)
  let pollenMesh: THREE.InstancedMesh | null = null;
  if (budget.pollenCount > 0) {
    const pollenGeo = new THREE.PlaneGeometry(0.095, 0.095);
    const pollenMat = new THREE.MeshBasicMaterial({
      color: 0xfde047,
      transparent: true,
      opacity: 0.48,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    pollenMesh = new THREE.InstancedMesh(pollenGeo, pollenMat, budget.pollenCount);
    pollenMesh.frustumCulled = false;
    for (let i = 0; i < budget.pollenCount; i++) {
      pollenSeeds.push({
        angle: (i * 1.913) % (Math.PI * 2),
        radius: 3.2 + ((i * 2.79) % 14.2),
        baseY: (i * 0.71) % 7.8,
        heightSpan: 8.0,
        riseSpeed: 0.2 + (i % 4) * 0.06,
        swirlSpeed: (i % 2 === 0 ? 1 : -1) * (0.075 + (i % 3) * 0.028),
        phase: i * 1.87,
        scale: 0.65 + (i % 3) * 0.28,
      });
    }
    group.add(pollenMesh);
  }

  const rig: Chapter3SanctuaryAtmosphereRig = {
    group,
    budget,
    sanctuaryLights,
    runeRings,
    moteMesh,
    moteSeeds,
    pollenMesh,
    pollenSeeds,
  };
  updateChapter3EmeraldSanctuaryAtmosphere(rig, 0);
  return rig;
}

/**
 * Per-frame zero-allocation update for Chapter 3 emerald rune pulses, floating crystal motes, and golden pollen.
 */
export function updateChapter3EmeraldSanctuaryAtmosphere(
  rig: Chapter3SanctuaryAtmosphereRig,
  elapsed: number
): void {
  for (let i = 0; i < rig.sanctuaryLights.length; i++) {
    const entry = rig.sanctuaryLights[i];
    const pulse =
      1 +
      Math.sin(elapsed * 1.65 + entry.phase) * 0.14 +
      Math.sin(elapsed * 3.8 + entry.phase * 1.5) * 0.05;
    entry.light.intensity = entry.baseIntensity * pulse;
  }

  for (let i = 0; i < rig.runeRings.length; i++) {
    const entry = rig.runeRings[i];
    const mat = entry.mesh.material as THREE.MeshBasicMaterial;
    if (mat && 'opacity' in mat) {
      mat.opacity =
        entry.baseOpacity * (0.76 + Math.sin(elapsed * 1.45 + entry.phase) * 0.24);
    }
  }

  if (rig.moteMesh && rig.moteMesh.visible && rig.moteSeeds.length > 0) {
    for (let i = 0; i < rig.moteSeeds.length; i++) {
      const s = rig.moteSeeds[i];
      const normY = ((s.baseY + elapsed * s.riseSpeed) % s.heightSpan) / s.heightSpan;
      const y = normY * s.heightSpan + 0.16;
      const theta = s.angle + elapsed * s.swirlSpeed;
      const wobble = Math.sin(elapsed * 1.6 + s.phase) * 0.5;
      const r = s.radius + wobble;
      const fade = Math.sin(normY * Math.PI);
      const scale = s.scale * (0.35 + fade * 0.85);
      _sanctuaryDummy.position.set(Math.cos(theta) * r, y, Math.sin(theta) * r);
      _sanctuaryDummy.rotation.set(elapsed * 1.4 + s.phase, elapsed * 1.9, s.phase);
      _sanctuaryDummy.scale.set(scale * 0.72, scale * 1.55, scale * 0.72);
      _sanctuaryDummy.updateMatrix();
      rig.moteMesh.setMatrixAt(i, _sanctuaryDummy.matrix);
    }
    rig.moteMesh.instanceMatrix.needsUpdate = true;
  }

  if (rig.pollenMesh && rig.pollenMesh.visible && rig.pollenSeeds.length > 0) {
    for (let i = 0; i < rig.pollenSeeds.length; i++) {
      const s = rig.pollenSeeds[i];
      const normY = ((s.baseY + elapsed * s.riseSpeed) % s.heightSpan) / s.heightSpan;
      const y = normY * s.heightSpan + 0.35;
      const theta = s.angle + elapsed * s.swirlSpeed;
      const driftX = Math.cos(theta) * s.radius + Math.sin(elapsed * 0.78 + s.phase) * 0.85;
      const driftZ = Math.sin(theta) * s.radius + Math.cos(elapsed * 0.66 + s.phase) * 0.85;
      const fade = Math.sin(normY * Math.PI);
      const scale = s.scale * (0.4 + fade * 0.72);
      _sanctuaryDummy.position.set(driftX, y, driftZ);
      _sanctuaryDummy.rotation.set(
        elapsed * 0.9 + s.phase,
        elapsed * 0.8 + s.phase * 0.5,
        elapsed * 1.1
      );
      _sanctuaryDummy.scale.setScalar(scale);
      _sanctuaryDummy.updateMatrix();
      rig.pollenMesh.setMatrixAt(i, _sanctuaryDummy.matrix);
    }
    rig.pollenMesh.instanceMatrix.needsUpdate = true;
  }
}

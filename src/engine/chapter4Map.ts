import { getGlbAssetUrl } from './glbAssetUrl';
import * as THREE from 'three';

/**
 * Optimized 3D arena map for Chapter 4 (Đấu Trường Song Tử · Gemini Astral Mirror Arena).
 * Generated via scripts/build-chapter4-variants.mjs:
 * - Lite: ~1.78 MiB (~36.9k verts, 1024px JPEG albedo, single material) for Dell Latitude E5430
 * - High: ~3.20 MiB (~90k tris, 2048px albedo + normal + roughness) for discrete GPUs
 */
export const CHAPTER4_MAP_LITE_PATH_SEGMENTS = [
  'assets',
  'Chương 4',
  'Runtime',
  'gemini-arena-lite.glb',
] as const;

export const CHAPTER4_MAP_HIGH_PATH_SEGMENTS = [
  'assets',
  'Chương 4',
  'Runtime',
  'gemini-arena-high.glb',
] as const;

export const CHAPTER4_MAP_VERSION = '1';
export const CHAPTER4_MAP_HIGH_TIMEOUT_MS = 60_000;
export const CHAPTER4_MAP_LITE_TIMEOUT_MS = 30_000;

/**
 * Measured directly from 01_Dau_Truong_Song_Tu_Gemini_Arena.glb (after node_0 +90° X rotation):
 * - World X in [-0.5501, 0.5307] (span 1.0808), World Z in [-0.5294, 0.5512] (span 1.0806),
 *   World Y in [0.0004, 0.4082]
 * - Flat central astral mirror floor spans radius r <= 0.425 at y ≈ 0.1748 (p50 ≈ 0.173..0.175)
 * - Outer twin mirror arches, celestial pillars & raised rim rise past r ≈ 0.432 up to y = 0.4082
 * Scaling inner radius 0.425 -> 16.2 keeps the full rectangular combat arena
 * (±10.5 × ±12.2, corner diagonal 16.09) flush on flat walkable astral marble while framing
 * the twin mirror pillars & arches cleanly around r ≈ 16.8..20.6.
 */
export const CHAPTER4_MAP_INNER_RADIUS = 0.425;
export const CHAPTER4_MAP_TARGET_INNER_RADIUS = 16.2;
export const CHAPTER4_MAP_FLOOR_Y_RAW = 0.1748;
export const CHAPTER4_MAP_FLOOR_OFFSET_Y = -0.02;

export function getChapter4MapLiteAssetUrl(
  baseUrl = '/',
  baseUri = 'http://localhost:3000/'
): URL {
  return getGlbAssetUrl(CHAPTER4_MAP_LITE_PATH_SEGMENTS, CHAPTER4_MAP_VERSION, baseUrl, baseUri);
}

export function getChapter4MapHighAssetUrl(
  baseUrl = '/',
  baseUri = 'http://localhost:3000/'
): URL {
  return getGlbAssetUrl(CHAPTER4_MAP_HIGH_PATH_SEGMENTS, CHAPTER4_MAP_VERSION, baseUrl, baseUri);
}

function getChapter4MapLocalAssetUrl(
  variant: 'lite' | 'full',
  baseUrl = '/',
  baseUri = 'http://localhost:3000/'
): URL {
  const segments =
    variant === 'lite' ? CHAPTER4_MAP_LITE_PATH_SEGMENTS : CHAPTER4_MAP_HIGH_PATH_SEGMENTS;
  const localBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = new URL(segments.map(encodeURIComponent).join('/'), new URL(localBase, baseUri));
  url.searchParams.set('v', CHAPTER4_MAP_VERSION);
  return url;
}

export function isValidChapter4GlbBuffer(data: ArrayBuffer): boolean {
  if (data.byteLength < 20) return false;
  const header = new DataView(data);
  return (
    header.getUint32(0, true) === 0x46546c67 &&
    header.getUint32(4, true) === 2 &&
    header.getUint32(8, true) === data.byteLength
  );
}

export interface FetchChapter4MapOptions {
  variant: 'lite' | 'full';
  baseUrl?: string;
  baseUri?: string;
  cdnUrl?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  onProgress?: (loadedBytes: number, totalBytes: number) => void;
}

export interface FetchChapter4MapResult {
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
    if (!isValidChapter4GlbBuffer(buffer)) {
      throw new Error('Tệp GLB Bản Đồ Chương 4 không hợp lệ');
    }
    return buffer;
  } catch (error) {
    if (timedOut) {
      throw new Error('Hết thời gian tải Bản Đồ 3D Chương 4');
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
 * Loads the Chapter 4 Gemini Astral Mirror Arena GLB:
 * - 'lite': tries CDN Lite GLB, falling back automatically to bundled local Lite GLB if CDN returns 404.
 * - 'full': tries CDN/local High GLB, falling back to Lite GLB on failure so low-end GPUs & offline builds stay playable.
 */
export async function fetchChapter4MapArrayBuffer(
  options: FetchChapter4MapOptions
): Promise<FetchChapter4MapResult> {
  const baseUrl = options.baseUrl ?? '/';
  const baseUri = options.baseUri ?? 'http://localhost:3000/';
  const fetchImpl = options.fetchImpl ?? fetch;
  const signal = options.signal;
  const liteUrl = getChapter4MapLiteAssetUrl(baseUrl, baseUri);
  const liteLocalUrl = getChapter4MapLocalAssetUrl('lite', baseUrl, baseUri);

  if (options.variant === 'lite') {
    const buffer = await fetchVariantWithLocalFallback(
      fetchImpl,
      liteUrl,
      liteLocalUrl,
      CHAPTER4_MAP_LITE_TIMEOUT_MS,
      signal,
      options.onProgress
    );
    return { buffer, resolvedVariant: 'lite', fallbackUsed: false };
  }

  const highUrl = options.cdnUrl ?? getChapter4MapHighAssetUrl(baseUrl, baseUri);
  const highLocalUrl = getChapter4MapLocalAssetUrl('full', baseUrl, baseUri);
  try {
    const buffer = await fetchVariantWithLocalFallback(
      fetchImpl,
      highUrl,
      highLocalUrl,
      CHAPTER4_MAP_HIGH_TIMEOUT_MS,
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
      CHAPTER4_MAP_LITE_TIMEOUT_MS,
      signal,
      options.onProgress
    );
    return { buffer: liteBuffer, resolvedVariant: 'lite', fallbackUsed: true };
  }
}

export interface PreparedChapter4Map {
  group: THREE.Group;
  scale: number;
  bounds: THREE.Box3;
}

/**
 * Normalizes scale, floor elevation (y ≈ -0.02 so ground decals, rings, shadows,
 * and boss entrance seals at y >= 0.01 sit cleanly on the astral mirror marble with zero Z-fighting),
 * PBR texture color space / anisotropy, and shadow flags for Gemini Astral Mirror Arena.
 */
export function prepareChapter4MapModel(
  gltfScene: THREE.Object3D,
  maxAnisotropy = 4,
  options?: { liteMode?: boolean }
): PreparedChapter4Map {
  const group = new THREE.Group();
  group.name = options?.liteMode ? 'Chapter4MapLiteGLB' : 'Chapter4MapGLB';

  gltfScene.updateMatrixWorld(true);
  const rawBox = new THREE.Box3().setFromObject(gltfScene);
  const rawSize = new THREE.Vector3();
  const rawCenter = new THREE.Vector3();
  rawBox.getSize(rawSize);
  rawBox.getCenter(rawCenter);

  const horizontalSpan = Math.max(0.001, Math.min(rawSize.x, rawSize.z));
  // Expected raw horizontal span is ~1.0806; preserve exact circular inner floor calibration
  // while remaining resilient if a custom asset uses another unit scale.
  const isCanonicalUnitScale = horizontalSpan > 0.7 && horizontalSpan < 1.5;
  const scale = isCanonicalUnitScale
    ? CHAPTER4_MAP_TARGET_INNER_RADIUS / CHAPTER4_MAP_INNER_RADIUS
    : (CHAPTER4_MAP_TARGET_INNER_RADIUS * 2 * (1.0806 / (CHAPTER4_MAP_INNER_RADIUS * 2))) /
      horizontalSpan;

  const rawFloorY = isCanonicalUnitScale
    ? CHAPTER4_MAP_FLOOR_Y_RAW
    : rawBox.min.y + rawSize.y * 0.4287;

  gltfScene.scale.setScalar(scale);
  gltfScene.position.set(
    -rawCenter.x * scale,
    -rawFloorY * scale + CHAPTER4_MAP_FLOOR_OFFSET_Y,
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
        mat.envMapIntensity = Math.max(mat.envMapIntensity ?? 1, 1.18);
        // Subtle astral indigo-cyan bounce so shaded mirror arches & marble retain clarity under arena lights
        if (!mat.emissiveMap && mat.emissive.getHex() === 0x000000) {
          mat.emissive.setHex(0x0c1b3a);
          mat.emissiveIntensity = 0.22;
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

export interface Chapter4GeminiAtmosphereBudget {
  shardCount: number;
  stardustCount: number;
  sanctuaryLightCount: number;
  enableFloorRuneRings: boolean;
}

/**
 * Hardware-aware cap for Chapter 4 Gemini Astral Mirror atmosphere so Dell Latitude E5430 Lite
 * maintains 30 FPS with zero GC churn while discrete GPUs get fuller mirror shards & twin aura lighting.
 */
export function resolveChapter4GeminiAtmosphereBudget(
  liteActive: boolean,
  isSoftwareGl: boolean
): Chapter4GeminiAtmosphereBudget {
  if (isSoftwareGl) {
    return {
      shardCount: 14,
      stardustCount: 10,
      sanctuaryLightCount: 0,
      enableFloorRuneRings: true,
    };
  }
  if (liteActive) {
    return {
      shardCount: 24,
      stardustCount: 12,
      sanctuaryLightCount: 1,
      enableFloorRuneRings: true,
    };
  }
  return {
    shardCount: 56,
    stardustCount: 30,
    sanctuaryLightCount: 3,
    enableFloorRuneRings: true,
  };
}

interface GeminiParticleSeed {
  angle: number;
  radius: number;
  baseY: number;
  heightSpan: number;
  riseSpeed: number;
  swirlSpeed: number;
  phase: number;
  scale: number;
}

export interface Chapter4GeminiAtmosphereRig {
  group: THREE.Group;
  budget: Chapter4GeminiAtmosphereBudget;
  sanctuaryLights: Array<{ light: THREE.PointLight; baseIntensity: number; phase: number }>;
  runeRings: Array<{ mesh: THREE.Mesh; baseOpacity: number; phase: number }>;
  shardMesh: THREE.InstancedMesh | null;
  shardSeeds: GeminiParticleSeed[];
  stardustMesh: THREE.InstancedMesh | null;
  stardustSeeds: GeminiParticleSeed[];
}

const _geminiDummy = new THREE.Object3D();

/**
 * Builds the Chapter 4 Gemini Astral Mirror atmospheric overlay:
 * - Soft pulsing cyan & violet dual perimeter rune rings + non-shadow PointLights
 * - Floating twin mirror shards (single InstancedMesh, zero per-frame allocation)
 * - Drifting celestial stardust motes (single InstancedMesh, zero per-frame allocation)
 */
export function createChapter4GeminiSanctuaryAtmosphere(options: {
  liteActive: boolean;
  isSoftwareGl: boolean;
}): Chapter4GeminiAtmosphereRig {
  const budget = resolveChapter4GeminiAtmosphereBudget(
    options.liteActive,
    options.isSoftwareGl
  );
  const group = new THREE.Group();
  group.name = 'Chapter4GeminiSanctuaryAtmosphere';

  const sanctuaryLights: Chapter4GeminiAtmosphereRig['sanctuaryLights'] = [];
  const runeRings: Chapter4GeminiAtmosphereRig['runeRings'] = [];
  const shardSeeds: GeminiParticleSeed[] = [];
  const stardustSeeds: GeminiParticleSeed[] = [];

  // 1. Dual cyan & astral-violet perimeter mirror rings framing the walkable arena marble
  if (budget.enableFloorRuneRings) {
    const outerRingGeo = new THREE.RingGeometry(15.6, 18.6, options.liteActive ? 28 : 48);
    outerRingGeo.rotateX(-Math.PI / 2);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.position.set(0, 0.035, 0);
    outerRing.renderOrder = 1;
    group.add(outerRing);
    runeRings.push({ mesh: outerRing, baseOpacity: 0.14, phase: 0 });

    const innerRuneGeo = new THREE.RingGeometry(13.8, 15.5, options.liteActive ? 28 : 48);
    innerRuneGeo.rotateX(-Math.PI / 2);
    const innerRuneMat = new THREE.MeshBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0.09,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const innerRune = new THREE.Mesh(innerRuneGeo, innerRuneMat);
    innerRune.position.set(0, 0.03, 0);
    innerRune.renderOrder = 1;
    group.add(innerRune);
    runeRings.push({ mesh: innerRune, baseOpacity: 0.09, phase: Math.PI });
  }

  // 2. Non-shadow cyan & violet sanctuary PointLights around the twin mirror arches
  const lightSpecs: Array<[number, number, number, number, number, number]> = [
    [0, 3.8, -14.2, 0x38bdf8, 2.05, 34],
    [-13.6, 2.9, 4.0, 0xa78bfa, 1.6, 28],
    [13.6, 2.9, 4.0, 0x67e8f9, 1.6, 28],
  ];
  for (let i = 0; i < Math.min(budget.sanctuaryLightCount, lightSpecs.length); i++) {
    const [lx, ly, lz, hex, intensity, dist] = lightSpecs[i];
    const light = new THREE.PointLight(hex, intensity, dist, 2);
    light.position.set(lx, ly, lz);
    light.castShadow = false;
    group.add(light);
    sanctuaryLights.push({ light, baseIntensity: intensity, phase: i * 2.1 });
  }

  // 3. Floating astral mirror shards (single InstancedMesh)
  let shardMesh: THREE.InstancedMesh | null = null;
  if (budget.shardCount > 0) {
    const shardGeo = new THREE.OctahedronGeometry(0.075, 0);
    const shardMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.86,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    shardMesh = new THREE.InstancedMesh(shardGeo, shardMat, budget.shardCount);
    shardMesh.frustumCulled = false;
    const geminiColors = [
      new THREE.Color(0x38bdf8),
      new THREE.Color(0xa78bfa),
      new THREE.Color(0xe0f2fe),
    ];
    for (let i = 0; i < budget.shardCount; i++) {
      const onRim = i % 10 < 7;
      const radius = onRim ? 11.6 + ((i * 2.17) % 6.8) : 2.6 + ((i * 3.41) % 8.8);
      shardSeeds.push({
        angle: (i * 2.399963) % (Math.PI * 2),
        radius,
        baseY: (i * 0.61) % 7.4,
        heightSpan: 7.4 + (i % 4) * 1.1,
        riseSpeed: 0.56 + (i % 5) * 0.16,
        swirlSpeed: (i % 2 === 0 ? 1 : -1) * (0.12 + (i % 3) * 0.05),
        phase: i * 1.47,
        scale: 0.66 + (i % 4) * 0.25,
      });
      shardMesh.setColorAt(i, geminiColors[i % geminiColors.length]);
    }
    if (shardMesh.instanceColor) {
      shardMesh.instanceColor.needsUpdate = true;
    }
    group.add(shardMesh);
  }

  // 4. Drifting celestial stardust (single InstancedMesh)
  let stardustMesh: THREE.InstancedMesh | null = null;
  if (budget.stardustCount > 0) {
    const dustGeo = new THREE.PlaneGeometry(0.095, 0.095);
    const dustMat = new THREE.MeshBasicMaterial({
      color: 0xc4b5fd,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    stardustMesh = new THREE.InstancedMesh(dustGeo, dustMat, budget.stardustCount);
    stardustMesh.frustumCulled = false;
    for (let i = 0; i < budget.stardustCount; i++) {
      stardustSeeds.push({
        angle: (i * 1.913) % (Math.PI * 2),
        radius: 3.0 + ((i * 2.83) % 14.2),
        baseY: (i * 0.73) % 7.8,
        heightSpan: 8.0,
        riseSpeed: 0.22 + (i % 4) * 0.06,
        swirlSpeed: (i % 2 === 0 ? 1 : -1) * (0.085 + (i % 3) * 0.03),
        phase: i * 1.93,
        scale: 0.65 + (i % 3) * 0.28,
      });
    }
    group.add(stardustMesh);
  }

  const rig: Chapter4GeminiAtmosphereRig = {
    group,
    budget,
    sanctuaryLights,
    runeRings,
    shardMesh,
    shardSeeds,
    stardustMesh,
    stardustSeeds,
  };
  updateChapter4GeminiSanctuaryAtmosphere(rig, 0);
  return rig;
}

/**
 * Per-frame zero-allocation update for Chapter 4 dual rune pulses, floating mirror shards, and stardust.
 */
export function updateChapter4GeminiSanctuaryAtmosphere(
  rig: Chapter4GeminiAtmosphereRig,
  elapsed: number
): void {
  for (let i = 0; i < rig.sanctuaryLights.length; i++) {
    const entry = rig.sanctuaryLights[i];
    const pulse =
      1 +
      Math.sin(elapsed * 1.8 + entry.phase) * 0.15 +
      Math.sin(elapsed * 4.0 + entry.phase * 1.4) * 0.05;
    entry.light.intensity = entry.baseIntensity * pulse;
  }

  for (let i = 0; i < rig.runeRings.length; i++) {
    const entry = rig.runeRings[i];
    const mat = entry.mesh.material as THREE.MeshBasicMaterial;
    if (mat && 'opacity' in mat) {
      mat.opacity =
        entry.baseOpacity * (0.76 + Math.sin(elapsed * 1.6 + entry.phase) * 0.24);
    }
  }

  if (rig.shardMesh && rig.shardMesh.visible && rig.shardSeeds.length > 0) {
    for (let i = 0; i < rig.shardSeeds.length; i++) {
      const s = rig.shardSeeds[i];
      const normY = ((s.baseY + elapsed * s.riseSpeed) % s.heightSpan) / s.heightSpan;
      const y = normY * s.heightSpan + 0.16;
      const theta = s.angle + elapsed * s.swirlSpeed;
      const wobble = Math.sin(elapsed * 1.7 + s.phase) * 0.5;
      const r = s.radius + wobble;
      const fade = Math.sin(normY * Math.PI);
      const scale = s.scale * (0.35 + fade * 0.85);
      _geminiDummy.position.set(Math.cos(theta) * r, y, Math.sin(theta) * r);
      _geminiDummy.rotation.set(elapsed * 1.5 + s.phase, elapsed * 2.0, s.phase);
      _geminiDummy.scale.set(scale * 0.68, scale * 1.6, scale * 0.68);
      _geminiDummy.updateMatrix();
      rig.shardMesh.setMatrixAt(i, _geminiDummy.matrix);
    }
    rig.shardMesh.instanceMatrix.needsUpdate = true;
  }

  if (rig.stardustMesh && rig.stardustMesh.visible && rig.stardustSeeds.length > 0) {
    for (let i = 0; i < rig.stardustSeeds.length; i++) {
      const s = rig.stardustSeeds[i];
      const normY = ((s.baseY + elapsed * s.riseSpeed) % s.heightSpan) / s.heightSpan;
      const y = normY * s.heightSpan + 0.35;
      const theta = s.angle + elapsed * s.swirlSpeed;
      const driftX = Math.cos(theta) * s.radius + Math.sin(elapsed * 0.82 + s.phase) * 0.85;
      const driftZ = Math.sin(theta) * s.radius + Math.cos(elapsed * 0.7 + s.phase) * 0.85;
      const fade = Math.sin(normY * Math.PI);
      const scale = s.scale * (0.4 + fade * 0.72);
      _geminiDummy.position.set(driftX, y, driftZ);
      _geminiDummy.rotation.set(
        elapsed * 0.95 + s.phase,
        elapsed * 0.85 + s.phase * 0.5,
        elapsed * 1.15
      );
      _geminiDummy.scale.setScalar(scale);
      _geminiDummy.updateMatrix();
      rig.stardustMesh.setMatrixAt(i, _geminiDummy.matrix);
    }
    rig.stardustMesh.instanceMatrix.needsUpdate = true;
  }
}

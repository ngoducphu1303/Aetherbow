import { getGlbAssetUrl } from './glbAssetUrl';
import * as THREE from 'three';

/**
 * Local Lite 3D arena map for Chapter 2 (Hỏa Sơn Sừng Đỏ · Aries War-Forge Arena).
 * Generated via scripts/build-chapter2-lite.mjs (~1.31 MB, 30k tris, 1024px JPEG albedo).
 */
export const CHAPTER2_MAP_LITE_PATH_SEGMENTS = [
  'assets',
  'Chương 2',
  'Map mới',
  'Aries War-Forge Arena Lite.glb',
] as const;

const CHAPTER2_MAP_HIGH_PATH_SEGMENTS = ['assets', 'Chương 2', 'Runtime', 'aries-arena-high.glb'];

export const CHAPTER2_MAP_LITE_VERSION = '1';
export const CHAPTER2_MAP_HIGH_TIMEOUT_MS = 60_000;
export const CHAPTER2_MAP_LITE_TIMEOUT_MS = 30_000;

/**
 * Measured directly from Aries War-Forge Arena.glb (after node_0 +90° X rotation):
 * - World X in [-0.5400, 0.5368], World Z in [-0.5434, 0.5345], World Y in [0, 0.6622]
 * - Flat central volcanic stone combat floor spans radius r <= 0.39 at y ≈ 0.4315 (p95 ≈ 0.4325)
 * - Outer forge curbs & horned war-forge spires rise around r ≈ 0.41..0.52 up to y = 0.6622
 * Scaling inner radius 0.39 -> 16.2 keeps the full rectangular combat arena
 * (±10.5 × ±12.2, corner diagonal 16.09) flush on flat walkable stone while framing
 * the horned forge spires cleanly around r ≈ 18.7..21.2.
 */
export const CHAPTER2_MAP_INNER_RADIUS = 0.39;
export const CHAPTER2_MAP_TARGET_INNER_RADIUS = 16.2;
export const CHAPTER2_MAP_FLOOR_Y_RAW = 0.4325;
export const CHAPTER2_MAP_FLOOR_OFFSET_Y = -0.02;

export function getChapter2MapLiteAssetUrl(
  baseUrl = '/',
  baseUri = 'http://localhost:3000/'
): URL {
  return getGlbAssetUrl(CHAPTER2_MAP_LITE_PATH_SEGMENTS, CHAPTER2_MAP_LITE_VERSION, baseUrl, baseUri);
}

export function getChapter2MapHighAssetUrl(
  baseUrl = '/', baseUri = 'http://localhost:3000/'
): URL {
  return getGlbAssetUrl(CHAPTER2_MAP_HIGH_PATH_SEGMENTS, '1', baseUrl, baseUri);
}

export function isValidGlbBuffer(data: ArrayBuffer): boolean {
  if (data.byteLength < 20) return false;
  const header = new DataView(data);
  return (
    header.getUint32(0, true) === 0x46546c67 &&
    header.getUint32(4, true) === 2 &&
    header.getUint32(8, true) === data.byteLength
  );
}

export interface FetchChapter2MapOptions {
  variant: 'lite' | 'full';
  baseUrl?: string;
  baseUri?: string;
  cdnUrl?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  onProgress?: (loadedBytes: number, totalBytes: number) => void;
}

export interface FetchChapter2MapResult {
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
    if (!isValidGlbBuffer(buffer)) {
      throw new Error('Tệp GLB Bản Đồ Chương 2 không hợp lệ');
    }
    return buffer;
  } catch (error) {
    if (timedOut) {
      throw new Error('Hết thời gian tải Bản Đồ 3D Chương 2');
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener('abort', onExternalAbort);
  }
}

/**
 * Loads the Chapter 2 Aries War-Forge Arena GLB:
 * - 'lite': loads the bundled ~1.31 MB local Lite GLB directly.
 * - 'full': loads the bundled high-quality GLB, falling back to Lite on failure.
 */
export async function fetchChapter2MapArrayBuffer(
  options: FetchChapter2MapOptions
): Promise<FetchChapter2MapResult> {
  const baseUrl = options.baseUrl ?? '/';
  const baseUri = options.baseUri ?? 'http://localhost:3000/';
  const fetchImpl = options.fetchImpl ?? fetch;
  const signal = options.signal;
  const liteUrl = getChapter2MapLiteAssetUrl(baseUrl, baseUri);

  if (options.variant === 'lite') {
    const buffer = await fetchGlbWithTimeout(
      fetchImpl,
      liteUrl,
      CHAPTER2_MAP_LITE_TIMEOUT_MS,
      signal,
      options.onProgress
    );
    return { buffer, resolvedVariant: 'lite', fallbackUsed: false };
  }

  const highUrl = options.cdnUrl ?? getChapter2MapHighAssetUrl(baseUrl, baseUri);
  try {
    const buffer = await fetchGlbWithTimeout(
      fetchImpl,
      highUrl,
      CHAPTER2_MAP_HIGH_TIMEOUT_MS,
      signal,
      options.onProgress
    );
    return { buffer, resolvedVariant: 'full', fallbackUsed: false };
  } catch (error) {
    if (signal?.aborted) throw error;
    const liteBuffer = await fetchGlbWithTimeout(
      fetchImpl,
      liteUrl,
      CHAPTER2_MAP_LITE_TIMEOUT_MS,
      signal,
      options.onProgress
    );
    return { buffer: liteBuffer, resolvedVariant: 'lite', fallbackUsed: true };
  }
}

export interface PreparedChapter2Map {
  group: THREE.Group;
  scale: number;
  bounds: THREE.Box3;
}

/**
 * Normalizes scale, floor elevation (y ≈ -0.02 so ground decals, rings, shadows,
 * and boss entrance seals at y >= 0.01 sit cleanly on the volcanic stone with zero Z-fighting),
 * PBR texture color space / anisotropy, and shadow flags for Aries War-Forge Arena.glb.
 */
export function prepareChapter2MapModel(
  gltfScene: THREE.Object3D,
  maxAnisotropy = 4,
  options?: { liteMode?: boolean }
): PreparedChapter2Map {
  const group = new THREE.Group();
  group.name = options?.liteMode ? 'Chapter2MapLiteGLB' : 'Chapter2MapGLB';

  gltfScene.updateMatrixWorld(true);
  const rawBox = new THREE.Box3().setFromObject(gltfScene);
  const rawSize = new THREE.Vector3();
  const rawCenter = new THREE.Vector3();
  rawBox.getSize(rawSize);
  rawBox.getCenter(rawCenter);

  const horizontalSpan = Math.max(0.001, Math.min(rawSize.x, rawSize.z));
  // Expected raw horizontal span is ~1.077; preserve exact circular inner floor calibration
  // while remaining resilient if a custom asset uses another unit scale.
  const isCanonicalUnitScale = horizontalSpan > 0.8 && horizontalSpan < 1.6;
  const scale = isCanonicalUnitScale
    ? CHAPTER2_MAP_TARGET_INNER_RADIUS / CHAPTER2_MAP_INNER_RADIUS
    : (CHAPTER2_MAP_TARGET_INNER_RADIUS * 2 * (1.077 / (CHAPTER2_MAP_INNER_RADIUS * 2))) /
      horizontalSpan;

  const rawFloorY = isCanonicalUnitScale
    ? CHAPTER2_MAP_FLOOR_Y_RAW
    : rawBox.min.y + rawSize.y * 0.653;

  gltfScene.scale.setScalar(scale);
  gltfScene.position.set(
    -rawCenter.x * scale,
    -rawFloorY * scale + CHAPTER2_MAP_FLOOR_OFFSET_Y,
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
        mat.envMapIntensity = Math.max(mat.envMapIntensity ?? 1, 1.12);
        // Subtle warm volcanic bounce so dark basalt/forged iron retains detail under arena lights
        if (!mat.emissiveMap && mat.emissive.getHex() === 0x000000) {
          mat.emissive.setHex(0x2a0c04);
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

export interface Chapter2ForgeAtmosphereBudget {
  emberCount: number;
  ashCount: number;
  lavaLightCount: number;
  enableFloorGlowRings: boolean;
}

/**
 * Hardware-aware cap for Chapter 2 War-Forge atmosphere so Dell Latitude E5430 Lite
 * maintains 30 FPS with zero GC churn while discrete GPUs get richer magma glow & embers.
 */
export function resolveChapter2ForgeAtmosphereBudget(
  liteActive: boolean,
  isSoftwareGl: boolean
): Chapter2ForgeAtmosphereBudget {
  if (isSoftwareGl) {
    return {
      emberCount: 14,
      ashCount: 10,
      lavaLightCount: 0,
      enableFloorGlowRings: true,
    };
  }
  if (liteActive) {
    return {
      emberCount: 24,
      ashCount: 12,
      lavaLightCount: 1,
      enableFloorGlowRings: true,
    };
  }
  return {
    emberCount: 60,
    ashCount: 32,
    lavaLightCount: 3,
    enableFloorGlowRings: true,
  };
}

interface ForgeParticleSeed {
  angle: number;
  radius: number;
  baseY: number;
  heightSpan: number;
  riseSpeed: number;
  swirlSpeed: number;
  phase: number;
  scale: number;
}

export interface Chapter2ForgeAtmosphereRig {
  group: THREE.Group;
  budget: Chapter2ForgeAtmosphereBudget;
  lavaLights: Array<{ light: THREE.PointLight; baseIntensity: number; phase: number }>;
  lavaRings: Array<{ mesh: THREE.Mesh; baseOpacity: number; phase: number }>;
  emberMesh: THREE.InstancedMesh | null;
  emberSeeds: ForgeParticleSeed[];
  ashMesh: THREE.InstancedMesh | null;
  ashSeeds: ForgeParticleSeed[];
}

const _forgeDummy = new THREE.Object3D();

/**
 * Builds the Chapter 2 Aries War-Forge atmospheric overlay:
 * - Warm pulsing lava perimeter glow rings & non-shadow forge PointLights
 * - Rising glowing embers (single InstancedMesh, zero per-frame allocation)
 * - Drifting volcanic ash flakes (single InstancedMesh, zero per-frame allocation)
 */
export function createChapter2WarForgeAtmosphere(options: {
  liteActive: boolean;
  isSoftwareGl: boolean;
}): Chapter2ForgeAtmosphereRig {
  const budget = resolveChapter2ForgeAtmosphereBudget(options.liteActive, options.isSoftwareGl);
  const group = new THREE.Group();
  group.name = 'Chapter2WarForgeAtmosphere';

  const lavaLights: Chapter2ForgeAtmosphereRig['lavaLights'] = [];
  const lavaRings: Chapter2ForgeAtmosphereRig['lavaRings'] = [];
  const emberSeeds: ForgeParticleSeed[] = [];
  const ashSeeds: ForgeParticleSeed[] = [];

  // 1. Subtle molten lava rim glow arcs outside the walkable combat perimeter (zero shadow cost)
  if (budget.enableFloorGlowRings) {
    const outerRingGeo = new THREE.RingGeometry(15.6, 18.8, options.liteActive ? 28 : 48);
    outerRingGeo.rotateX(-Math.PI / 2);
    const outerRingMat = new THREE.MeshBasicMaterial({
      color: 0xff5a1f,
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
    lavaRings.push({ mesh: outerRing, baseOpacity: 0.14, phase: 0 });

    const innerHeatGeo = new THREE.RingGeometry(13.6, 15.6, options.liteActive ? 28 : 48);
    innerHeatGeo.rotateX(-Math.PI / 2);
    const innerHeatMat = new THREE.MeshBasicMaterial({
      color: 0xff922b,
      transparent: true,
      opacity: 0.085,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const innerHeat = new THREE.Mesh(innerHeatGeo, innerHeatMat);
    innerHeat.position.set(0, 0.03, 0);
    innerHeat.renderOrder = 1;
    group.add(innerHeat);
    lavaRings.push({ mesh: innerHeat, baseOpacity: 0.085, phase: 1.7 });
  }

  // 2. Non-shadow warm forge lava PointLights positioned around the war-forge perimeter
  const lightSpecs: Array<[number, number, number, number, number, number]> = [
    // [x, y, z, colorHex, intensity, distance]
    [0, 3.2, -14.2, 0xff5a1f, 2.2, 34],
    [-13.5, 2.6, 4.0, 0xff7b29, 1.65, 28],
    [13.5, 2.6, 4.0, 0xff4d1a, 1.65, 28],
  ];
  for (let i = 0; i < Math.min(budget.lavaLightCount, lightSpecs.length); i++) {
    const [lx, ly, lz, hex, intensity, dist] = lightSpecs[i];
    const light = new THREE.PointLight(hex, intensity, dist, 2);
    light.position.set(lx, ly, lz);
    light.castShadow = false;
    group.add(light);
    lavaLights.push({ light, baseIntensity: intensity, phase: i * 2.1 });
  }

  // 3. Rising glowing forge embers (single InstancedMesh)
  let emberMesh: THREE.InstancedMesh | null = null;
  if (budget.emberCount > 0) {
    const emberGeo = new THREE.OctahedronGeometry(0.068, 0);
    const emberMat = new THREE.MeshBasicMaterial({
      color: 0xff8c2b,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    emberMesh = new THREE.InstancedMesh(emberGeo, emberMat, budget.emberCount);
    emberMesh.frustumCulled = false;
    const warmColors = [
      new THREE.Color(0xff551a),
      new THREE.Color(0xff8c2b),
      new THREE.Color(0xffd166),
    ];
    for (let i = 0; i < budget.emberCount; i++) {
      // Cluster 70% around the lava rim (r=11..18) and 30% drifting softly across the forge floor
      const onRim = i % 10 < 7;
      const radius = onRim ? 11.2 + ((i * 2.17) % 7.2) : 2.2 + ((i * 3.41) % 9.2);
      emberSeeds.push({
        angle: (i * 2.399963) % (Math.PI * 2),
        radius,
        baseY: (i * 0.61) % 7.5,
        heightSpan: 7.5 + (i % 4) * 1.1,
        riseSpeed: 0.72 + (i % 5) * 0.22,
        swirlSpeed: (i % 2 === 0 ? 1 : -1) * (0.12 + (i % 3) * 0.05),
        phase: i * 1.37,
        scale: 0.65 + (i % 4) * 0.28,
      });
      emberMesh.setColorAt(i, warmColors[i % warmColors.length]);
    }
    if (emberMesh.instanceColor) {
      emberMesh.instanceColor.needsUpdate = true;
    }
    group.add(emberMesh);
  }

  // 4. Drifting volcanic ash flakes (single InstancedMesh)
  let ashMesh: THREE.InstancedMesh | null = null;
  if (budget.ashCount > 0) {
    const ashGeo = new THREE.PlaneGeometry(0.1, 0.075);
    const ashMat = new THREE.MeshBasicMaterial({
      color: 0xb8968a,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    ashMesh = new THREE.InstancedMesh(ashGeo, ashMat, budget.ashCount);
    ashMesh.frustumCulled = false;
    for (let i = 0; i < budget.ashCount; i++) {
      ashSeeds.push({
        angle: (i * 1.913) % (Math.PI * 2),
        radius: 3.5 + ((i * 2.83) % 14.5),
        baseY: (i * 0.73) % 8.0,
        heightSpan: 8.2,
        riseSpeed: 0.24 + (i % 4) * 0.07,
        swirlSpeed: (i % 2 === 0 ? 1 : -1) * (0.08 + (i % 3) * 0.03),
        phase: i * 1.91,
        scale: 0.7 + (i % 3) * 0.3,
      });
    }
    group.add(ashMesh);
  }

  const rig: Chapter2ForgeAtmosphereRig = {
    group,
    budget,
    lavaLights,
    lavaRings,
    emberMesh,
    emberSeeds,
    ashMesh,
    ashSeeds,
  };
  updateChapter2WarForgeAtmosphere(rig, 0);
  return rig;
}

/**
 * Per-frame zero-allocation update for Chapter 2 lava glow pulses, rising embers, and drifting ash.
 */
export function updateChapter2WarForgeAtmosphere(
  rig: Chapter2ForgeAtmosphereRig,
  elapsed: number
): void {
  for (let i = 0; i < rig.lavaLights.length; i++) {
    const entry = rig.lavaLights[i];
    const pulse =
      1 +
      Math.sin(elapsed * 2.2 + entry.phase) * 0.16 +
      Math.sin(elapsed * 5.1 + entry.phase * 1.7) * 0.06;
    entry.light.intensity = entry.baseIntensity * pulse;
  }

  for (let i = 0; i < rig.lavaRings.length; i++) {
    const entry = rig.lavaRings[i];
    const mat = entry.mesh.material as THREE.MeshBasicMaterial;
    if (mat && 'opacity' in mat) {
      mat.opacity =
        entry.baseOpacity * (0.78 + Math.sin(elapsed * 1.85 + entry.phase) * 0.22);
    }
  }

  if (rig.emberMesh && rig.emberMesh.visible && rig.emberSeeds.length > 0) {
    for (let i = 0; i < rig.emberSeeds.length; i++) {
      const s = rig.emberSeeds[i];
      const normY = ((s.baseY + elapsed * s.riseSpeed) % s.heightSpan) / s.heightSpan;
      const y = normY * s.heightSpan + 0.12;
      const theta = s.angle + elapsed * s.swirlSpeed;
      const wobble = Math.sin(elapsed * 1.9 + s.phase) * 0.55;
      const r = s.radius + wobble;
      const fade = Math.sin(normY * Math.PI);
      const scale = s.scale * (0.35 + fade * 0.85);
      _forgeDummy.position.set(Math.cos(theta) * r, y, Math.sin(theta) * r);
      _forgeDummy.rotation.set(elapsed * 2.1 + s.phase, elapsed * 1.7, s.phase);
      _forgeDummy.scale.set(scale * 0.75, scale * 1.45, scale * 0.75);
      _forgeDummy.updateMatrix();
      rig.emberMesh.setMatrixAt(i, _forgeDummy.matrix);
    }
    rig.emberMesh.instanceMatrix.needsUpdate = true;
  }

  if (rig.ashMesh && rig.ashMesh.visible && rig.ashSeeds.length > 0) {
    for (let i = 0; i < rig.ashSeeds.length; i++) {
      const s = rig.ashSeeds[i];
      const normY = ((s.baseY + elapsed * s.riseSpeed) % s.heightSpan) / s.heightSpan;
      const y = normY * s.heightSpan + 0.35;
      const theta = s.angle + elapsed * s.swirlSpeed;
      const driftX = Math.cos(theta) * s.radius + Math.sin(elapsed * 0.85 + s.phase) * 0.9;
      const driftZ = Math.sin(theta) * s.radius + Math.cos(elapsed * 0.72 + s.phase) * 0.9;
      const fade = Math.sin(normY * Math.PI);
      const scale = s.scale * (0.4 + fade * 0.7);
      _forgeDummy.position.set(driftX, y, driftZ);
      _forgeDummy.rotation.set(
        elapsed * 1.1 + s.phase,
        elapsed * 0.9 + s.phase * 0.5,
        elapsed * 1.3
      );
      _forgeDummy.scale.setScalar(scale);
      _forgeDummy.updateMatrix();
      rig.ashMesh.setMatrixAt(i, _forgeDummy.matrix);
    }
    rig.ashMesh.instanceMatrix.needsUpdate = true;
  }
}

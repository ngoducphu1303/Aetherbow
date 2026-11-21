import * as THREE from 'three';

/**
 * Uncompressed custom 3D arena map for Chapter 1 (Thánh Điện Nhật Luân).
 * Stored verbatim under public/assets/Chương 1/Map mới/Chương 1.glb.
 */
export const CHAPTER1_MAP_PATH_SEGMENTS = [
  'assets',
  'Chương 1',
  'Map mới',
  'Chương 1.glb',
] as const;

export const CHAPTER1_MAP_VERSION = '2';
export const CHAPTER1_MAP_CHUNK_BYTES = 6 * 1024 * 1024;
export const CHAPTER1_MAP_MAX_SAFE_CHUNK_BYTES = 8 * 1024 * 1024;

/**
 * Measured from Chương 1.glb (after node_0 +90° X rotation):
 * - Flat inner walkable courtyard spans |x|, |z| <= 0.363 at y ≈ 0.2744 (max 0.2798)
 * - Outer sculpted temple walls/pillars extend to |x|, |z| ≈ 0.595 and y ≈ 0.4783
 * Uniformly scaling by TARGET_INNER_HALF / INNER_HALF keeps the central sun emblem
 * circular while enclosing the full ARENA_HALF_W (10.5) × ARENA_HALF_D (12.2) zone.
 */
export const CHAPTER1_MAP_INNER_HALF = 0.363;
export const CHAPTER1_MAP_TARGET_INNER_HALF = 12.8;
export const CHAPTER1_MAP_FLOOR_Y_RAW = 0.2755;
export const CHAPTER1_MAP_FLOOR_OFFSET_Y = -0.02;

export function getChapter1MapAssetUrl(
  baseUrl = '/',
  baseUri = 'http://localhost:3000/'
): URL {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const encodedPath = CHAPTER1_MAP_PATH_SEGMENTS.map((seg) => encodeURIComponent(seg)).join('/');
  const url = new URL(`${normalizedBase}${encodedPath}`, baseUri);
  url.searchParams.set('v', CHAPTER1_MAP_VERSION);
  return url;
}

export function getChapter1MapMetaUrl(
  baseUrl = '/',
  baseUri = 'http://localhost:3000/'
): URL {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = new URL(`${normalizedBase}api/assets/chapter1-map/meta`, baseUri);
  url.searchParams.set('v', CHAPTER1_MAP_VERSION);
  return url;
}

export function getChapter1MapChunkUrl(
  start: number,
  end: number,
  baseUrl = '/',
  baseUri = 'http://localhost:3000/',
  etag?: string
): URL {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const url = new URL(`${normalizedBase}api/assets/chapter1-map/chunk`, baseUri);
  url.searchParams.set('start', String(start));
  url.searchParams.set('end', String(end));
  url.searchParams.set('v', etag || CHAPTER1_MAP_VERSION);
  return url;
}

export interface FetchChapter1MapOptions {
  baseUrl?: string;
  baseUri?: string;
  signal?: AbortSignal;
  concurrency?: number;
  fetchImpl?: typeof fetch;
  onProgress?: (loadedBytes: number, totalBytes: number) => void;
}

async function fetchWithRetry(
  fetchImpl: typeof fetch,
  input: URL | string,
  init: RequestInit,
  maxAttempts = 3
): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetchImpl(input, init);
      if (response.ok || response.status === 206) {
        return response;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (init.signal?.aborted) throw error;
      lastError = error;
    }
    if (attempt + 1 < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Tải phân đoạn Map Chương 1 thất bại.');
}

async function downloadByteRangesInParallel(
  totalSize: number,
  chunkSize: number,
  fetchChunk: (start: number, end: number) => Promise<Uint8Array>,
  options: {
    concurrency: number;
    signal?: AbortSignal;
    onProgress?: (loadedBytes: number, totalBytes: number) => void;
  }
): Promise<ArrayBuffer> {
  const safeChunkSize = Math.max(
    1024 * 1024,
    Math.min(CHAPTER1_MAP_MAX_SAFE_CHUNK_BYTES, Math.floor(chunkSize || CHAPTER1_MAP_CHUNK_BYTES))
  );
  const ranges: Array<{ start: number; end: number }> = [];
  for (let start = 0; start < totalSize; start += safeChunkSize) {
    const end = Math.min(totalSize - 1, start + safeChunkSize - 1);
    ranges.push({ start, end });
  }

  const combined = new Uint8Array(totalSize);
  let nextIndex = 0;
  let loadedBytes = 0;
  const workerCount = Math.max(1, Math.min(options.concurrency, ranges.length));

  const runWorker = async (): Promise<void> => {
    while (nextIndex < ranges.length) {
      if (options.signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      const range = ranges[nextIndex++];
      const expectedLength = range.end - range.start + 1;
      const bytes = await fetchChunk(range.start, range.end);
      if (bytes.byteLength !== expectedLength) {
        throw new Error(
          `Kích thước phân đoạn không khớp (${bytes.byteLength} != ${expectedLength}).`
        );
      }
      combined.set(bytes, range.start);
      loadedBytes += bytes.byteLength;
      options.onProgress?.(loadedBytes, totalSize);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return combined.buffer;
}

/**
 * Downloads the uncompressed 90.3 MB Chương 1.glb in <= 6 MiB byte chunks so it
 * never hits Cloud Run's 32 MiB HTTP/1.1 single-response cap. Falls back to HTTP
 * Range requests on the static asset URL when the chunk API is not mounted.
 */
export async function fetchChapter1MapArrayBuffer(
  options: FetchChapter1MapOptions = {}
): Promise<ArrayBuffer> {
  const baseUrl = options.baseUrl ?? '/';
  const baseUri = options.baseUri ?? 'http://localhost:3000/';
  const concurrency = options.concurrency ?? 4;
  const fetchImpl = options.fetchImpl ?? fetch;
  const signal = options.signal;

  // 1. Primary path: Express chunk API (immune to reverse-proxy Range stripping & 32 MiB response caps)
  try {
    const metaUrl = getChapter1MapMetaUrl(baseUrl, baseUri);
    const metaRes = await fetchImpl(metaUrl, { signal });
    if (metaRes.ok && metaRes.headers.get('content-type')?.includes('application/json')) {
      const meta = (await metaRes.json()) as {
        size?: number;
        chunkSize?: number;
        etag?: string;
      };
      if (typeof meta.size === 'number' && Number.isFinite(meta.size) && meta.size > 0) {
        const chunkSize = Math.min(
          CHAPTER1_MAP_MAX_SAFE_CHUNK_BYTES,
          Math.max(1024 * 1024, Number(meta.chunkSize) || CHAPTER1_MAP_CHUNK_BYTES)
        );
        return await downloadByteRangesInParallel(
          meta.size,
          chunkSize,
          async (start, end) => {
            const chunkUrl = getChapter1MapChunkUrl(start, end, baseUrl, baseUri, meta.etag);
            const res = await fetchWithRetry(fetchImpl, chunkUrl, { signal });
            if (res.headers.get('content-type')?.includes('text/html')) {
              throw new Error('Phân đoạn Map Chương 1 trả về HTML không hợp lệ.');
            }
            return new Uint8Array(await res.arrayBuffer());
          },
          { concurrency, signal, onProgress: options.onProgress }
        );
      }
    }
  } catch (error) {
    if (signal?.aborted) throw error;
    // Fall through to HTTP Range fallback on the static asset URL
  }

  // 2. Fallback path: Standard HTTP Range requests against the static GLB file
  const assetUrl = getChapter1MapAssetUrl(baseUrl, baseUri);
  const firstEnd = CHAPTER1_MAP_CHUNK_BYTES - 1;
  const probeRes = await fetchWithRetry(fetchImpl, assetUrl, {
    signal,
    headers: { Range: `bytes=0-${firstEnd}` },
  });
  if (probeRes.headers.get('content-type')?.includes('text/html')) {
    throw new Error(`Không tải được Map Chương 1 (HTTP ${probeRes.status}).`);
  }

  const contentRange = probeRes.headers.get('content-range');
  const rangeMatch = contentRange?.match(/^bytes\s+(\d+)-(\d+)\/(\d+)$/i);
  if (probeRes.status === 206 && rangeMatch) {
    const firstBytes = new Uint8Array(await probeRes.arrayBuffer());
    const totalSize = Number(rangeMatch[3]);
    if (firstBytes.byteLength >= totalSize) {
      options.onProgress?.(firstBytes.byteLength, totalSize);
      return firstBytes.buffer.slice(
        firstBytes.byteOffset,
        firstBytes.byteOffset + totalSize
      );
    }
    const combined = new Uint8Array(totalSize);
    combined.set(firstBytes, 0);
    let loadedBytes = firstBytes.byteLength;
    options.onProgress?.(loadedBytes, totalSize);

    const remainingRanges: Array<{ start: number; end: number }> = [];
    for (let start = firstBytes.byteLength; start < totalSize; start += CHAPTER1_MAP_CHUNK_BYTES) {
      remainingRanges.push({
        start,
        end: Math.min(totalSize - 1, start + CHAPTER1_MAP_CHUNK_BYTES - 1),
      });
    }
    let nextIdx = 0;
    const workerCount = Math.max(1, Math.min(concurrency, remainingRanges.length));
    const runRangeWorker = async (): Promise<void> => {
      while (nextIdx < remainingRanges.length) {
        if (signal?.aborted) {
          throw new DOMException('Aborted', 'AbortError');
        }
        const range = remainingRanges[nextIdx++];
        const res = await fetchWithRetry(fetchImpl, assetUrl, {
          signal,
          headers: { Range: `bytes=${range.start}-${range.end}` },
        });
        const chunkBytes = new Uint8Array(await res.arrayBuffer());
        combined.set(chunkBytes, range.start);
        loadedBytes += chunkBytes.byteLength;
        options.onProgress?.(loadedBytes, totalSize);
      }
    };
    await Promise.all(Array.from({ length: workerCount }, () => runRangeWorker()));
    return combined.buffer;
  }

  const fullBuffer = await probeRes.arrayBuffer();
  options.onProgress?.(fullBuffer.byteLength, fullBuffer.byteLength);
  return fullBuffer;
}

export interface PreparedChapter1Map {
  group: THREE.Group;
  scale: number;
  bounds: THREE.Box3;
}

/**
 * Normalizes scale, floor elevation (y ≈ -0.02 so ground decals at y >= 0.01 never Z-fight),
 * PBR texture color space / anisotropy, and shadow settings for Chương 1.glb.
 */
export function prepareChapter1MapModel(
  gltfScene: THREE.Object3D,
  maxAnisotropy = 4
): PreparedChapter1Map {
  const group = new THREE.Group();
  group.name = 'Chapter1MapGLB';

  gltfScene.updateMatrixWorld(true);
  const rawBox = new THREE.Box3().setFromObject(gltfScene);
  const rawSize = new THREE.Vector3();
  const rawCenter = new THREE.Vector3();
  rawBox.getSize(rawSize);
  rawBox.getCenter(rawCenter);

  const horizontalSpan = Math.max(0.001, Math.min(rawSize.x, rawSize.z));
  // Expected raw horizontal span is ~1.186; preserve exact inner courtyard alignment
  // while remaining resilient if the asset is ever swapped for another scale.
  const isCanonicalUnitScale = horizontalSpan > 0.8 && horizontalSpan < 1.6;
  const scale = isCanonicalUnitScale
    ? CHAPTER1_MAP_TARGET_INNER_HALF / CHAPTER1_MAP_INNER_HALF
    : (CHAPTER1_MAP_TARGET_INNER_HALF * 2 * (1.186 / (CHAPTER1_MAP_INNER_HALF * 2))) / horizontalSpan;

  const rawFloorY = isCanonicalUnitScale
    ? CHAPTER1_MAP_FLOOR_Y_RAW
    : rawBox.min.y + rawSize.y * 0.575;

  gltfScene.scale.setScalar(scale);
  gltfScene.position.set(
    -rawCenter.x * scale,
    -rawFloorY * scale + CHAPTER1_MAP_FLOOR_OFFSET_Y,
    -rawCenter.z * scale
  );

  const aniso = Math.max(1, Math.min(8, Math.floor(maxAnisotropy || 1)));
  gltfScene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    // Receiving shadows from hero/enemies/bosses onto the 3D stone floor looks crisp,
    // while keeping castShadow=false avoids rendering 942k terrain vertices twice per frame.
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
        mat.envMapIntensity = Math.max(mat.envMapIntensity ?? 1, 1.05);
        mat.needsUpdate = true;
      }
    }
  });

  group.add(gltfScene);
  group.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(group);
  return { group, scale, bounds };
}

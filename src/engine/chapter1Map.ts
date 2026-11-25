import { getGlbAssetUrl, useGlbCdn } from './glbAssetUrl';
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

export const CHAPTER1_MAP_LITE_PATH_SEGMENTS = [
  'assets',
  'Chương 1',
  'Map mới',
  'Chương 1 Lite.glb',
] as const;

export const CHAPTER1_MAP_VERSION = '2';
export const CHAPTER1_MAP_LITE_VERSION = '1';
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
  return getGlbAssetUrl(CHAPTER1_MAP_PATH_SEGMENTS, CHAPTER1_MAP_VERSION, baseUrl, baseUri);
}

export function getChapter1MapLiteAssetUrl(
  baseUrl = '/',
  baseUri = 'http://localhost:3000/'
): URL {
  return getGlbAssetUrl(CHAPTER1_MAP_LITE_PATH_SEGMENTS, CHAPTER1_MAP_LITE_VERSION, baseUrl, baseUri);
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

async function readResponseBytesWithProgress(
  response: Response,
  onBytesDelta?: (delta: number) => void
): Promise<Uint8Array<ArrayBuffer>> {
  const reader = response.body?.getReader();
  if (!reader) {
    const raw = await response.arrayBuffer();
    const bytes = new Uint8Array(raw);
    if (bytes.byteLength > 0) {
      onBytesDelta?.(bytes.byteLength);
    }
    return bytes;
  }

  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value && value.byteLength > 0) {
        chunks.push(value);
        total += value.byteLength;
        onBytesDelta?.(value.byteLength);
      }
    }
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(new ArrayBuffer(total));
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return merged;
}

async function downloadByteRangesInParallel(
  totalSize: number,
  chunkSize: number,
  fetchChunk: (
    start: number,
    end: number,
    onChunkDelta: (delta: number) => void
  ) => Promise<Uint8Array>,
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
      let streamedForRange = 0;
      const bytes = await fetchChunk(range.start, range.end, (delta) => {
        streamedForRange += delta;
        loadedBytes = Math.max(0, Math.min(totalSize, loadedBytes + delta));
        options.onProgress?.(loadedBytes, totalSize);
      });
      if (bytes.byteLength !== expectedLength) {
        loadedBytes = Math.max(0, loadedBytes - streamedForRange);
        throw new Error(
          `Kích thước phân đoạn không khớp (${bytes.byteLength} != ${expectedLength}).`
        );
      }
      combined.set(bytes, range.start);
      if (streamedForRange !== bytes.byteLength) {
        loadedBytes = Math.max(
          0,
          Math.min(totalSize, loadedBytes + (bytes.byteLength - streamedForRange))
        );
        options.onProgress?.(loadedBytes, totalSize);
      }
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return combined.buffer;
}

/**
 * Downloads the uncompressed 90.3 MB Chương 1.glb in <= 6 MiB byte chunks so it
 * never hits Cloud Run's 32 MiB HTTP/1.1 single-response cap and stays 100% aligned
 * with the Cloudflare Worker 6 MiB edge cache. Streams every network chunk incrementally
 * so progress and inactivity timeouts stay responsive on slower connections.
 */
export async function fetchChapter1MapArrayBuffer(
  options: FetchChapter1MapOptions = {}
): Promise<ArrayBuffer> {
  const baseUrl = options.baseUrl ?? '/';
  const baseUri = options.baseUri ?? 'http://localhost:3000/';
  const concurrency = options.concurrency ?? 2;
  const fetchImpl = options.fetchImpl ?? fetch;
  const signal = options.signal;

  // The chunk API only reads the local file. CDN builds use the origin's Range support.
  if (!useGlbCdn) {
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
            async (start, end, onChunkDelta) => {
              const chunkUrl = getChapter1MapChunkUrl(start, end, baseUrl, baseUri, meta.etag);
              let lastError: unknown;
              for (let attempt = 0; attempt < 3; attempt++) {
                let attemptStreamed = 0;
                try {
                  const res = await fetchWithRetry(fetchImpl, chunkUrl, { signal }, 1);
                  if (res.headers.get('content-type')?.includes('text/html')) {
                    throw new Error('Phân đoạn Map Chương 1 trả về HTML không hợp lệ.');
                  }
                  return await readResponseBytesWithProgress(res, (delta) => {
                    attemptStreamed += delta;
                    onChunkDelta(delta);
                  });
                } catch (err) {
                  if (attemptStreamed > 0) onChunkDelta(-attemptStreamed);
                  if (signal?.aborted) throw err;
                  lastError = err;
                  if (attempt + 1 < 3) {
                    await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
                  }
                }
              }
              throw lastError instanceof Error
                ? lastError
                : new Error('Tải phân đoạn Map Chương 1 thất bại.');
            },
            { concurrency, signal, onProgress: options.onProgress }
          );
        }
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      // Fall through to HTTP Range fallback on the static asset URL
    }
  }

  // Load from the CDN, or use HTTP Range as the fallback for a local build.
  const assetUrl = getChapter1MapAssetUrl(baseUrl, baseUri);
  const firstEnd = CHAPTER1_MAP_CHUNK_BYTES - 1;
  let probeRes: Response | null = null;
  try {
    probeRes = await fetchWithRetry(fetchImpl, assetUrl, {
      signal,
      headers: { Range: `bytes=0-${firstEnd}` },
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    probeRes = null;
  }

  if (!probeRes || probeRes.headers.get('content-type')?.includes('text/html')) {
    // 3. Final fallback: Load bundled Chương 1 Lite.glb (~1.3 MB) when the full 90.3 MB file is absent
    const liteUrl = getChapter1MapLiteAssetUrl(baseUrl, baseUri);
    const liteRes = await fetchWithRetry(fetchImpl, liteUrl, { signal });
    if (liteRes.headers.get('content-type')?.includes('text/html')) {
      throw new Error(`Không tải được Map Chương 1 (HTTP ${probeRes?.status ?? liteRes.status}).`);
    }
    const liteLength = Number(liteRes.headers.get('content-length')) || 0;
    let liteLoaded = 0;
    const liteBytes = await readResponseBytesWithProgress(liteRes, (delta) => {
      liteLoaded += delta;
      options.onProgress?.(liteLoaded, liteLength || liteLoaded);
    });
    const liteBuf = liteBytes.buffer.slice(
      liteBytes.byteOffset,
      liteBytes.byteOffset + liteBytes.byteLength
    );
    options.onProgress?.(liteBuf.byteLength, liteBuf.byteLength);
    return liteBuf;
  }

  const contentRange = probeRes.headers.get('content-range');
  const rangeMatch = contentRange?.match(/^bytes\s+(\d+)-(\d+)\/(\d+)$/i);
  if (probeRes.status === 206 && rangeMatch) {
    const totalSize = Number(rangeMatch[3]);
    let loadedBytes = 0;
    const firstBytes = await readResponseBytesWithProgress(probeRes, (delta) => {
      loadedBytes = Math.min(totalSize, loadedBytes + delta);
      options.onProgress?.(loadedBytes, totalSize);
    });
    if (firstBytes.byteLength >= totalSize) {
      options.onProgress?.(totalSize, totalSize);
      return firstBytes.buffer.slice(
        firstBytes.byteOffset,
        firstBytes.byteOffset + totalSize
      );
    }
    const combined = new Uint8Array(totalSize);
    combined.set(firstBytes, 0);
    loadedBytes = firstBytes.byteLength;
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
        const expectedLen = range.end - range.start + 1;
        const expectedRange = `bytes ${range.start}-${range.end}/${totalSize}`;
        let chunkBytes: Uint8Array | null = null;
        let lastChunkError: unknown;

        for (let attempt = 0; attempt < 3; attempt++) {
          let attemptStreamed = 0;
          try {
            const res = await fetchWithRetry(
              fetchImpl,
              assetUrl,
              {
                signal,
                headers: { Range: `bytes=${range.start}-${range.end}` },
              },
              1
            );
            if (res.status !== 206 || res.headers.get('content-range') !== expectedRange) {
              await res.body?.cancel();
              throw new Error('Phản hồi Range không khớp với phân đoạn Map Chương 1.');
            }
            const streamed = await readResponseBytesWithProgress(res, (delta) => {
              attemptStreamed += delta;
              loadedBytes = Math.min(totalSize, loadedBytes + delta);
              options.onProgress?.(loadedBytes, totalSize);
            });
            if (streamed.byteLength !== expectedLen) {
              throw new Error('Kích thước phân đoạn Map Chương 1 không hợp lệ.');
            }
            chunkBytes = streamed;
            break;
          } catch (err) {
            if (attemptStreamed > 0) {
              loadedBytes = Math.max(0, loadedBytes - attemptStreamed);
              options.onProgress?.(loadedBytes, totalSize);
            }
            if (signal?.aborted) throw err;
            lastChunkError = err;
            if (attempt + 1 < 3) {
              await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
            }
          }
        }

        if (!chunkBytes) {
          throw lastChunkError instanceof Error
            ? lastChunkError
            : new Error('Tải phân đoạn Map Chương 1 thất bại.');
        }
        combined.set(chunkBytes, range.start);
      }
    };
    await Promise.all(Array.from({ length: workerCount }, () => runRangeWorker()));
    options.onProgress?.(totalSize, totalSize);
    return combined.buffer;
  }

  if (probeRes.status === 206) {
    await probeRes.body?.cancel();
    // A CDN may omit Content-Range from its CORS expose list. Retrieve the whole
    // object instead of treating the partial response as a complete GLB.
    probeRes = await fetchWithRetry(fetchImpl, assetUrl, { signal });
  }
  const fullLength = Number(probeRes.headers.get('content-length')) || 0;
  let fullLoaded = 0;
  const fullBytes = await readResponseBytesWithProgress(probeRes, (delta) => {
    fullLoaded += delta;
    options.onProgress?.(fullLoaded, fullLength || fullLoaded);
  });
  const fullBuffer = fullBytes.buffer.slice(
    fullBytes.byteOffset,
    fullBytes.byteOffset + fullBytes.byteLength
  );
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
  maxAnisotropy = 4,
  options?: { liteMode?: boolean }
): PreparedChapter1Map {
  const group = new THREE.Group();
  group.name = options?.liteMode ? 'Chapter1MapLiteGLB' : 'Chapter1MapGLB';

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

  const anisoCap = options?.liteMode ? 2 : 8;
  const aniso = Math.max(1, Math.min(anisoCap, Math.floor(maxAnisotropy || 1)));
  gltfScene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    // Receiving shadows from hero/enemies/bosses onto the 3D stone floor looks crisp,
    // while keeping castShadow=false avoids rendering terrain vertices twice per frame.
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

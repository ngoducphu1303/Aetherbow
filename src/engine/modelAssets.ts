import type { Chapter1MapVariant, HeroId } from '../types/game';
import {
  fetchChapter1MapArrayBuffer,
  getChapter1MapLiteAssetUrl,
} from './chapter1Map';

export const CHAPTER1_MAP_MODEL_ASSET = 'Chương 1/Map mới/Chương 1.glb' as const;
export const CHAPTER1_MAP_LITE_LABEL = 'Bản Đồ 3D Chương 1 Lite · Tối Ưu Máy Yếu';

const MODEL_VERSIONS = {
  'heroes/golden-dress-girl.glb': 3,
  'heroes/alice-ao-dai-hoa-mai.glb': 2,
  'heroes/van-tich.glb': 2,
  'heroes/hatsune-miku.glb': 2,
  [CHAPTER1_MAP_MODEL_ASSET]: 2,
} as const;

export const HERO_LITE_VARIANT_PATHS: Partial<Record<ModelAsset, string>> = {
  'heroes/golden-dress-girl.glb': 'heroes/golden-dress-girl-lite.glb',
  'heroes/alice-ao-dai-hoa-mai.glb': 'heroes/alice-ao-dai-hoa-mai-lite.glb',
  'heroes/van-tich.glb': 'heroes/van-tich-lite.glb',
  'heroes/hatsune-miku.glb': 'heroes/hatsune-miku-lite.glb',
};

export const MODEL_LABELS: Record<keyof typeof MODEL_VERSIONS, string> = {
  'heroes/golden-dress-girl.glb': 'Mô hình Anh Hùng Alice 3D',
  'heroes/alice-ao-dai-hoa-mai.glb': 'Áo Dài Hoa Mai của Alice',
  'heroes/van-tich.glb': 'Vân Tịch 3D',
  'heroes/hatsune-miku.glb': 'Hatsune Miku 3D',
  [CHAPTER1_MAP_MODEL_ASSET]: 'Bản Đồ 3D Chương 1 · Thánh Điện Nhật Luân',
};

export type ModelAsset = keyof typeof MODEL_VERSIONS;
export type ModelDownloadStatus = 'loading' | 'ready' | 'error';

export interface ModelFileProgress {
  path: ModelAsset;
  label: string;
  status: ModelDownloadStatus;
  percent: number;
  received: number;
  length: number;
  error?: string;
}

export interface ModelDownloadSnapshot {
  status: ModelDownloadStatus;
  percent: number;
  completed: number;
  total: number;
  files: ModelFileProgress[];
}

interface Download {
  pending?: Promise<ArrayBuffer>;
  received: number;
  length: number;
  data?: ArrayBuffer;
  failed: boolean;
  error?: string;
}

const models = Object.keys(MODEL_VERSIONS) as ModelAsset[];
const downloads = new Map<string, Download>();
const listeners = new Set<() => void>();
let chapter1MapPreloadVariant: Chapter1MapVariant = 'full';
let globalLiteHeroAssets = false;
let lazyPreloadOnlyActiveHero = false;
let activePreloadHeroId: HeroId = 'artemis';

function getCacheKeyForChapter1Variant(variant: 'lite' | 'full'): string {
  return variant === 'lite' ? `${CHAPTER1_MAP_MODEL_ASSET}::lite` : CHAPTER1_MAP_MODEL_ASSET;
}

function getCacheKeyForActiveModel(path: ModelAsset): string {
  if (path === CHAPTER1_MAP_MODEL_ASSET) {
    return getCacheKeyForChapter1Variant(chapter1MapPreloadVariant === 'lite' ? 'lite' : 'full');
  }
  if (globalLiteHeroAssets && HERO_LITE_VARIANT_PATHS[path]) {
    return `${path}::lite`;
  }
  return path;
}

function getLabelForActiveModel(path: ModelAsset): string {
  if (path === CHAPTER1_MAP_MODEL_ASSET && chapter1MapPreloadVariant === 'lite') {
    return CHAPTER1_MAP_LITE_LABEL;
  }
  if (globalLiteHeroAssets && HERO_LITE_VARIANT_PATHS[path]) {
    return `${MODEL_LABELS[path]} (Lite)`;
  }
  return MODEL_LABELS[path];
}

function getHeroPreloadAssetForHeroId(heroId: HeroId): ModelAsset | null {
  if (heroId === 'hatsune_miku') return 'heroes/hatsune-miku.glb';
  if (heroId === 'aurelia') return null; // Aurelia loads on-demand through solarLeoAssets Lite/High pipeline
  return 'heroes/golden-dress-girl.glb';
}

function getActiveModels(): ModelAsset[] {
  if (lazyPreloadOnlyActiveHero) {
    const selected: ModelAsset[] = [];
    const heroAsset = getHeroPreloadAssetForHeroId(activePreloadHeroId);
    if (heroAsset) selected.push(heroAsset);
    if (chapter1MapPreloadVariant !== 'none') {
      selected.push(CHAPTER1_MAP_MODEL_ASSET);
    }
    return selected;
  }
  return chapter1MapPreloadVariant === 'none'
    ? models.filter((path) => path !== CHAPTER1_MAP_MODEL_ASSET)
    : models;
}

export function setGlobalAssetPreloadMode(options: {
  liteMode: boolean;
  activeHeroId?: HeroId;
  lazyPreloadOnlyActiveHero?: boolean;
}): void {
  const nextLite = Boolean(options.liteMode);
  const nextHero = options.activeHeroId ?? activePreloadHeroId;
  const nextLazy =
    options.lazyPreloadOnlyActiveHero !== undefined
      ? options.lazyPreloadOnlyActiveHero
      : lazyPreloadOnlyActiveHero;
  if (
    globalLiteHeroAssets === nextLite &&
    activePreloadHeroId === nextHero &&
    lazyPreloadOnlyActiveHero === nextLazy
  ) {
    return;
  }
  globalLiteHeroAssets = nextLite;
  activePreloadHeroId = nextHero;
  lazyPreloadOnlyActiveHero = nextLazy;
  publishProgress();
}

export function isGlobalLiteHeroAssetsEnabled(): boolean {
  return globalLiteHeroAssets;
}

export function getChapter1MapPreloadVariant(): Chapter1MapVariant {
  return chapter1MapPreloadVariant;
}

export function setChapter1MapPreloadVariant(variant: Chapter1MapVariant): void {
  if (chapter1MapPreloadVariant === variant) return;
  chapter1MapPreloadVariant = variant;
  publishProgress();
}

export function isChapter1MapPreloadEnabled(): boolean {
  return chapter1MapPreloadVariant !== 'none';
}

export function setChapter1MapPreloadEnabled(enabled: boolean): void {
  setChapter1MapPreloadVariant(enabled ? 'full' : 'none');
}

function buildFileSnapshots(): ModelFileProgress[] {
  return getActiveModels().map((path) => {
    const dl = downloads.get(getCacheKeyForActiveModel(path));
    const label = getLabelForActiveModel(path);
    if (!dl) {
      return {
        path,
        label,
        status: 'loading',
        percent: 0,
        received: 0,
        length: 0,
      };
    }
    if (dl.data) {
      return {
        path,
        label,
        status: 'ready',
        percent: 100,
        received: dl.data.byteLength,
        length: dl.length || dl.data.byteLength,
      };
    }
    if (dl.failed) {
      return {
        path,
        label,
        status: 'error',
        percent: dl.length > 0 ? Math.min(99, Math.floor((dl.received / dl.length) * 100)) : 0,
        received: dl.received,
        length: dl.length,
        error: dl.error || 'Lỗi tải tệp mô hình',
      };
    }
    const pct = dl.length > 0 ? Math.min(99, Math.floor((dl.received / dl.length) * 100)) : 0;
    return {
      path,
      label,
      status: 'loading',
      percent: pct,
      received: dl.received,
      length: dl.length,
    };
  });
}

let progress: ModelDownloadSnapshot = {
  status: 'loading',
  percent: 0,
  completed: 0,
  total: models.length,
  files: buildFileSnapshots(),
};

export function getModelAssetUrl(path: ModelAsset, preferLite = globalLiteHeroAssets): URL {
  const baseUrl =
    (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const effectivePath =
    preferLite && HERO_LITE_VARIANT_PATHS[path] ? HERO_LITE_VARIANT_PATHS[path]! : path;
  const encodedPath = effectivePath
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return new URL(`${normalizedBase}assets/${encodedPath}?v=${MODEL_VERSIONS[path]}`, document.baseURI);
}

export function subscribeToModelDownloads(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export const getModelDownloadProgress = (): ModelDownloadSnapshot => progress;
export const getModelDownloadStatus = (): ModelDownloadStatus => progress.status;

function publishProgress() {
  const activeModels = getActiveModels();
  if (activeModels.length === 0) {
    progress = { status: 'ready', percent: 100, completed: 0, total: 0, files: [] };
    listeners.forEach((listener) => listener());
    return;
  }
  let completed = 0;
  let fraction = 0;
  let failed = false;
  for (const model of activeModels) {
    const download = downloads.get(getCacheKeyForActiveModel(model));
    if (!download) continue;
    if (download.data) {
      completed++;
      fraction += 1;
    } else if (download.length > 0) {
      fraction += Math.min(0.99, download.received / download.length);
    }
    failed ||= download.failed;
  }
  const total = Math.max(1, activeModels.length);
  const percent = Math.floor((fraction / total) * 100);
  const status: ModelDownloadStatus = failed
    ? 'error'
    : completed === activeModels.length
    ? 'ready'
    : 'loading';
  const files = buildFileSnapshots();
  progress = { status, percent, completed, total: activeModels.length, files };
  listeners.forEach((listener) => listener());
}

async function readStreamUrl(url: URL, download: Download): Promise<ArrayBuffer> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  function resetTimeout() {
    clearTimeout(timeout);
    timeout = setTimeout(() => controller.abort(), 45_000);
  }

  resetTimeout();
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error('Phản hồi không phải tệp GLB hợp lệ');
    }
    const encoding = response.headers.get('content-encoding');
    if (!encoding || encoding === 'identity') {
      download.length = Number(response.headers.get('content-length')) || 0;
    }
    const reader = response.body?.getReader();
    if (!reader) return await response.arrayBuffer();

    const chunks: Uint8Array<ArrayBuffer>[] = [];
    resetTimeout();
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        resetTimeout();
        chunks.push(value);
        download.received += value.byteLength;
        publishProgress();
      }
    } finally {
      reader.releaseLock();
    }
    return new Blob(chunks).arrayBuffer();
  } finally {
    clearTimeout(timeout);
  }
}

async function readChapter1Map(variant: 'lite' | 'full', download: Download): Promise<ArrayBuffer> {
  const baseUrl =
    (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  if (variant === 'lite') {
    const liteUrl = getChapter1MapLiteAssetUrl(baseUrl, document.baseURI);
    return readStreamUrl(liteUrl, download);
  }

  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  function resetTimeout() {
    clearTimeout(timeout);
    timeout = setTimeout(() => controller.abort(), 45_000);
  }

  resetTimeout();
  try {
    return await fetchChapter1MapArrayBuffer({
      baseUrl,
      baseUri: document.baseURI,
      signal: controller.signal,
      concurrency: 4,
      onProgress: (loadedBytes, totalBytes) => {
        resetTimeout();
        download.received = loadedBytes;
        if (totalBytes > 0) {
          download.length = totalBytes;
        }
        publishProgress();
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

function startCachedDownload(
  cacheKey: string,
  loader: (download: Download) => Promise<ArrayBuffer>
): Promise<ArrayBuffer> {
  const existing = downloads.get(cacheKey);
  if (existing?.data) return Promise.resolve(existing.data);
  if (existing?.pending) return existing.pending;

  const download: Download = { received: 0, length: 0, failed: false };
  downloads.set(cacheKey, download);
  download.pending = loader(download)
    .then((data) => {
      const header = new DataView(data);
      if (
        data.byteLength < 20 ||
        header.getUint32(0, true) !== 0x46546c67 ||
        header.getUint32(4, true) !== 2 ||
        header.getUint32(8, true) !== data.byteLength
      ) {
        throw new Error(`Tệp GLB không hợp lệ`);
      }
      download.data = data;
      download.failed = false;
      download.error = undefined;
      publishProgress();
      return data;
    })
    .catch((error: unknown) => {
      download.pending = undefined;
      download.failed = true;
      download.error =
        error instanceof DOMException && error.name === 'AbortError'
          ? 'Hết thời gian tải'
          : error instanceof Error
          ? error.message
          : 'Lỗi mạng';
      publishProgress();
      throw error;
    });
  publishProgress();
  return download.pending;
}

export function downloadChapter1Map(variant: 'lite' | 'full'): Promise<ArrayBuffer> {
  const cacheKey = getCacheKeyForChapter1Variant(variant);
  return startCachedDownload(cacheKey, (download) => readChapter1Map(variant, download));
}

export function discardChapter1MapDownload(variant: 'lite' | 'full', data: ArrayBuffer): void {
  const cacheKey = getCacheKeyForChapter1Variant(variant);
  if (downloads.get(cacheKey)?.data !== data) return;
  downloads.delete(cacheKey);
  publishProgress();
}

export function downloadModel(path: ModelAsset): Promise<ArrayBuffer> {
  if (path === CHAPTER1_MAP_MODEL_ASSET) {
    return downloadChapter1Map(chapter1MapPreloadVariant === 'lite' ? 'lite' : 'full');
  }
  const useLite = globalLiteHeroAssets && Boolean(HERO_LITE_VARIANT_PATHS[path]);
  const cacheKey = getCacheKeyForActiveModel(path);
  return startCachedDownload(cacheKey, async (download) => {
    if (useLite) {
      try {
        return await readStreamUrl(getModelAssetUrl(path, true), download);
      } catch {
        download.received = 0;
        download.length = 0;
        return await readStreamUrl(getModelAssetUrl(path, false), download);
      }
    }
    return readStreamUrl(getModelAssetUrl(path, false), download);
  });
}

/**
 * Retries a single failed model file without discarding already-completed model files.
 */
export function retryModelDownload(path: ModelAsset): Promise<ArrayBuffer> {
  const cacheKey = getCacheKeyForActiveModel(path);
  const existing = downloads.get(cacheKey);
  if (existing?.data) return Promise.resolve(existing.data);
  if (existing?.pending) return existing.pending;
  downloads.delete(cacheKey);
  publishProgress();
  return downloadModel(path);
}

export function discardModelDownload(path: ModelAsset, data: ArrayBuffer): void {
  const cacheKey = getCacheKeyForActiveModel(path);
  if (downloads.get(cacheKey)?.data !== data) return;
  downloads.delete(cacheKey);
  publishProgress();
}

export function preloadGameModels(): void {
  for (const model of getActiveModels()) {
    // Only starts models that haven't completed yet; already-loaded files stay cached.
    void downloadModel(model).catch(() => {});
  }
}

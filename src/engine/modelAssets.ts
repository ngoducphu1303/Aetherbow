const MODEL_VERSIONS = {
  'heroes/golden-dress-girl.glb': 2,
  'mounts/dragon.glb': 3,
} as const;

export type ModelAsset = keyof typeof MODEL_VERSIONS;
export type ModelDownloadStatus = 'loading' | 'ready' | 'error';

interface Download {
  pending?: Promise<ArrayBuffer>;
  received: number;
  length: number;
  data?: ArrayBuffer;
  failed: boolean;
}

const models = Object.keys(MODEL_VERSIONS) as ModelAsset[];
const downloads = new Map<ModelAsset, Download>();
const listeners = new Set<() => void>();
let progress = { status: 'loading' as ModelDownloadStatus, percent: 0, completed: 0, total: models.length };

export function getModelAssetUrl(path: ModelAsset): URL {
  return new URL(`${import.meta.env.BASE_URL}assets/${path}?v=${MODEL_VERSIONS[path]}`, document.baseURI);
}

export function subscribeToModelDownloads(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export const getModelDownloadProgress = () => progress;
export const getModelDownloadStatus = () => progress.status;

function publishProgress() {
  let completed = 0;
  let fraction = 0;
  let failed = false;
  for (const download of downloads.values()) {
    if (download.data) {
      completed++;
      fraction += 1;
    } else if (download.length > 0) {
      fraction += Math.min(0.99, download.received / download.length);
    }
    failed ||= download.failed;
  }
  const percent = Math.floor((fraction / models.length) * 100);
  const status = failed ? 'error' : completed === models.length ? 'ready' : 'loading';
  if (status === progress.status && percent === progress.percent && completed === progress.completed) return;
  progress = { status, percent, completed, total: models.length };
  listeners.forEach((listener) => listener());
}

async function readModel(path: ModelAsset, download: Download): Promise<ArrayBuffer> {
  const controller = new AbortController();
  let timeout: ReturnType<typeof setTimeout> | undefined;
  function resetTimeout() {
    clearTimeout(timeout);
    timeout = setTimeout(() => controller.abort(), 45_000);
  }

  resetTimeout();
  try {
    const response = await fetch(getModelAssetUrl(path), { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${path}`);
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

export function downloadModel(path: ModelAsset): Promise<ArrayBuffer> {
  const cached = downloads.get(path)?.pending;
  if (cached) return cached;

  const download: Download = { received: 0, length: 0, failed: false };
  downloads.set(path, download);
  download.pending = readModel(path, download)
    .then((data) => {
      const header = new DataView(data);
      if (data.byteLength < 20 || header.getUint32(0, true) !== 0x46546c67 ||
          header.getUint32(4, true) !== 2 || header.getUint32(8, true) !== data.byteLength) {
        throw new Error(`Invalid GLB: ${path}`);
      }
      download.data = data;
      publishProgress();
      return data;
    })
    .catch((error: unknown) => {
      download.pending = undefined;
      download.failed = true;
      publishProgress();
      throw error;
    });
  publishProgress();
  return download.pending;
}

export function discardModelDownload(path: ModelAsset, data: ArrayBuffer): void {
  if (downloads.get(path)?.data !== data) return;
  downloads.delete(path);
  publishProgress();
}

export function preloadGameModels(): void {
  for (const model of models) {
    // The progress store reports download errors and allows retrying individual failed files.
    void downloadModel(model).catch(() => {});
  }
}

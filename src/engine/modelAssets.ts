const MODEL_VERSIONS = {
  'heroes/golden-dress-girl.glb': 2,
  'heroes/van-tich.glb': 1,
  'mounts/dragon.glb': 3,
} as const;

export const MODEL_LABELS: Record<keyof typeof MODEL_VERSIONS, string> = {
  'heroes/golden-dress-girl.glb': 'Mô hình Anh Hùng Alice 3D',
  'mounts/dragon.glb': 'Thú Cưỡi Thanh Long 3D',
  'heroes/van-tich.glb': 'Vân Tịch 3D',
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
const downloads = new Map<ModelAsset, Download>();
const listeners = new Set<() => void>();

function buildFileSnapshots(): ModelFileProgress[] {
  return models.map((path) => {
    const dl = downloads.get(path);
    if (!dl) {
      return {
        path,
        label: MODEL_LABELS[path],
        status: 'loading',
        percent: 0,
        received: 0,
        length: 0,
      };
    }
    if (dl.data) {
      return {
        path,
        label: MODEL_LABELS[path],
        status: 'ready',
        percent: 100,
        received: dl.data.byteLength,
        length: dl.length || dl.data.byteLength,
      };
    }
    if (dl.failed) {
      return {
        path,
        label: MODEL_LABELS[path],
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
      label: MODEL_LABELS[path],
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

export function getModelAssetUrl(path: ModelAsset): URL {
  const baseUrl =
    (import.meta as ImportMeta & { env?: { BASE_URL?: string } }).env?.BASE_URL ?? '/';
  return new URL(`${baseUrl}assets/${path}?v=${MODEL_VERSIONS[path]}`, document.baseURI);
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
  let completed = 0;
  let fraction = 0;
  let failed = false;
  for (const model of models) {
    const download = downloads.get(model);
    if (!download) continue;
    if (download.data) {
      completed++;
      fraction += 1;
    } else if (download.length > 0) {
      fraction += Math.min(0.99, download.received / download.length);
    }
    failed ||= download.failed;
  }
  const percent = Math.floor((fraction / models.length) * 100);
  const status: ModelDownloadStatus = failed
    ? 'error'
    : completed === models.length
    ? 'ready'
    : 'loading';
  const files = buildFileSnapshots();
  progress = { status, percent, completed, total: models.length, files };
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
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
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
  const existing = downloads.get(path);
  if (existing?.data) return Promise.resolve(existing.data);
  if (existing?.pending) return existing.pending;

  const download: Download = { received: 0, length: 0, failed: false };
  downloads.set(path, download);
  download.pending = readModel(path, download)
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

/**
 * Retries a single failed model file without discarding already-completed model files.
 */
export function retryModelDownload(path: ModelAsset): Promise<ArrayBuffer> {
  const existing = downloads.get(path);
  if (existing?.data) return Promise.resolve(existing.data);
  if (existing?.pending) return existing.pending;
  downloads.delete(path);
  publishProgress();
  return downloadModel(path);
}

export function discardModelDownload(path: ModelAsset, data: ArrayBuffer): void {
  if (downloads.get(path)?.data !== data) return;
  downloads.delete(path);
  publishProgress();
}

export function preloadGameModels(): void {
  for (const model of models) {
    // Only starts models that haven't completed yet; already-loaded files stay cached.
    void downloadModel(model).catch(() => {});
  }
}

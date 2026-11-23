import type { User } from 'firebase/auth';
import manifest from '../../scripts/glb-manifest.json';

export const MAX_BYTES = 120_000_000;

class UploadRequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

function endpoint(action: string, path?: string, query?: Record<string, string>) {
  const url = new URL('__admin/' + action, manifest.cdnBaseUrl);
  if (path) url.searchParams.set('path', path);
  for (const [key, value] of Object.entries(query ?? {})) url.searchParams.set(key, value);
  return url;
}

export async function api<T>(user: User, action: string, options: { path?: string; query?: Record<string, string>; body?: object; signal?: AbortSignal } = {}): Promise<T> {
  const headers: Record<string, string> = { Authorization: 'Bearer ' + await user.getIdToken() };
  if (options.body) headers['Content-Type'] = 'application/json';
  const response = await fetch(endpoint(action, options.path, options.query), {
    method: options.body ? 'POST' : 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });
  const result = await response.json().catch(() => null);
  if (!response.ok || !result) {
    throw new UploadRequestError(result?.error ?? 'Worker không phản hồi. Hãy thử lại.', response.status);
  }
  return result as T;
}

export function previewUrl(path: string, revision?: { id: string } | null) {
  const url = new URL(path.slice(1).split('/').map(encodeURIComponent).join('/'), manifest.cdnBaseUrl);
  if (revision) url.searchParams.set('rev', revision.id);
  return url.href;
}

function putGlb<T>(url: URL, token: string, body: Blob, onProgress: (value: number) => void, timeout = 110_000) {
  return new Promise<T>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', url.href);
    request.responseType = 'json';
    request.timeout = timeout;
    request.setRequestHeader('Authorization', 'Bearer ' + token);
    request.setRequestHeader('X-GLB-Size', String(body.size));
    request.upload.onprogress = ({ loaded, total }) => {
      if (total) onProgress(Math.min(100, Math.round(loaded / total * 100)));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300 && request.response) resolve(request.response);
      else reject(new UploadRequestError(request.response?.error ?? 'Upload thất bại. Hãy thử lại.', request.status));
    };
    request.onerror = () => reject(new UploadRequestError('Mất kết nối trong lúc upload.', 0));
    request.ontimeout = () => reject(new UploadRequestError('Hết thời gian upload.', 0));
    request.send(body);
  });
}

type AssetTransfer = { id: string };
const assetTransfers = new WeakMap<File, Map<string, AssetTransfer>>();
const ETAG = /^[a-f0-9]{32}$/;
const SESSION_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function savedUploadId(key: string) {
  try {
    const id = sessionStorage.getItem(key);
    if (id && SESSION_ID.test(id)) return id;
  } catch { /* Browser storage unavailable. */ }
  return crypto.randomUUID();
}

function rememberUpload(key: string, id: string) {
  try { sessionStorage.setItem(key, id); } catch { /* Use in-memory state. */ }
}

function forgetUpload(key: string) {
  try { sessionStorage.removeItem(key); } catch { /* Ignore unavailable storage. */ }
}

async function retryUpload<T>(operation: () => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await operation();
    } catch (cause) {
      const retryable = cause instanceof TypeError || (cause instanceof DOMException && cause.name === 'TimeoutError') ||
        (cause instanceof UploadRequestError && (cause.status === 0 || cause.status === 408 || cause.status === 429 || cause.status >= 500));
      if (!retryable || attempt >= 3) throw cause;
      await new Promise((resolve) => setTimeout(resolve, 500 * 2 ** attempt));
    }
  }
}

export async function uploadAdminGlb<T extends {id: string}>(
  user: User, target: 'inbox-upload' | 'model-upload', query: Record<string, string>, file: File, onProgress: (value: number) => void,
) {
  if (!file.name.toLowerCase().endsWith('.glb') || file.size < 24 || file.size > MAX_BYTES) {
    throw new Error('Chọn tệp .glb hợp lệ, tối đa 120 MB.');
  }
  const destination = JSON.stringify([target, query]);
  // The same file can resume after reselecting it on a refreshed admin page.
  const storageKey = 'aetherbow:upload:v1:' + JSON.stringify([target, query, file.name, file.size, file.lastModified]);
  const files = assetTransfers.get(file) ?? new Map<string, AssetTransfer>();
  assetTransfers.set(file, files);
  const transfer = files.get(destination) ?? { id: savedUploadId(storageKey) };
  files.set(destination, transfer);
  const { id } = transfer;
  rememberUpload(storageKey, id);

  const start = await retryUpload(() => api<{partSize: number; completed: T | null; uploadedParts: Record<string, string>}>(user, target + '/start', {
    query: { ...query, id, size: String(file.size) }, body: {}, signal: AbortSignal.timeout(35000),
  }));
  if (start.completed) {
    files.delete(destination);
    forgetUpload(storageKey);
    onProgress(100);
    return start.completed;
  }
  const { partSize, uploadedParts } = start;
  if (!Number.isInteger(partSize) || partSize < 5_000_000 || partSize > 8 * 1024 * 1024 ||
      !uploadedParts || typeof uploadedParts !== 'object') {
    throw new Error('Phiên tải không hợp lệ.');
  }
  const count = Math.ceil(file.size / partSize);
  const etags: string[] = Array(count);
  let confirmed = 0;
  for (let i = 0; i < count; i += 1) {
    const tag = uploadedParts[String(i + 1)];
    if (typeof tag === 'string' && ETAG.test(tag)) {
      etags[i] = tag;
      confirmed += Math.min(partSize, file.size - i * partSize);
    }
  }
  onProgress(Math.min(99, Math.round(100 * confirmed / file.size)));

  for (let index = 0; index < count; index += 1) {
    if (etags[index]) continue;
    const startByte = index * partSize;
    const part = file.slice(startByte, Math.min(startByte + partSize, file.size));
    const partNumber = String(index + 1);
    try {
      const response = await retryUpload(async () => {
        const token = await user.getIdToken();
        return putGlb<{etag: string}>(endpoint(target + '/part', undefined, { id, part: partNumber }), token, part,
          (progress) => onProgress(Math.min(99, Math.round(100 * (confirmed + part.size * progress / 100) / file.size))));
      });
      if (!ETAG.test(response.etag)) throw new Error('Worker chưa xác nhận phần tải.');
      etags[index] = response.etag;
      confirmed += part.size;
      onProgress(Math.min(99, Math.round(100 * confirmed / file.size)));
    } catch (cause) {
      throw new Error('Phần ' + partNumber + ' chưa tải xong. ' + message(cause) + ' Hãy bấm Tải lên để tiếp tục.');
    }
  }

  // 100% means the B2 object AND the catalog were successfully committed.
  const completed = await retryUpload(() => api<T>(user, target + '/finish', {
    query: { id }, body: { etags }, signal: AbortSignal.timeout(70000),
  }));
  files.delete(destination);
  forgetUpload(storageKey);
  onProgress(100);
  return completed;
}

export function message(error: unknown) {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi.';
}

export const primary = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40';
export const secondary = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40';

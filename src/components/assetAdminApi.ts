import type { User } from 'firebase/auth';
import manifest from '../../scripts/glb-manifest.json';

export const MAX_BYTES = 96_000_000;

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

export async function uploadGlb<T extends {id: string}>(user: User, action: string, query: Record<string, string>, file: File, onProgress: (value: number) => void) {
  const token = await user.getIdToken();
  return putGlb<T>(endpoint(action, undefined, query), token, file, onProgress, 150_000);
}

type InboxTransfer = { id: string; etags: string[] };
const inboxTransfers = new WeakMap<File, Map<string, InboxTransfer>>();

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

export async function uploadInboxGlb<T extends {id: string}>(
  user: User, query: Record<string, string>, file: File, onProgress: (value: number) => void,
) {
  const destination = JSON.stringify(query);
  const files = inboxTransfers.get(file) ?? new Map<string, InboxTransfer>();
  inboxTransfers.set(file, files);
  const transfer = files.get(destination) ?? { id: crypto.randomUUID(), etags: [] };
  files.set(destination, transfer);
  const {id, etags} = transfer;

  const start = await retryUpload(() => api<{partSize: number; completed: T | null}>(user, 'inbox-upload/start', {
    query: { ...query, id, size: String(file.size) }, body: {}, signal: AbortSignal.timeout(35000),
  }));
  if (start.completed) {
    files.delete(destination);
    onProgress(100);
    return start.completed;
  }
  const {partSize} = start;
  if (!Number.isInteger(partSize) || partSize <= 0) throw new Error('Phiên tải không hợp lệ.');

  for (let startByte = etags.length * partSize; startByte < file.size; startByte += partSize) {
    const part = file.slice(startByte, Math.min(startByte + partSize, file.size));
    const partNumber = String(1 + Math.floor(startByte / partSize));
    try {
      const response = await retryUpload(async () => {
        const token = await user.getIdToken();
        return putGlb<{etag: string}>(endpoint('inbox-upload/part', undefined, { id, part: partNumber }), token, part,
          (progress) => onProgress(Math.min(99, Math.round(100 * (startByte + part.size * progress / 100) / file.size))));
      });
      if (!/^[a-f0-9]{32}$/.test(response.etag)) throw new Error('Worker chưa xác nhận phần tải.');
      etags.push(response.etag);
    } catch (cause) {
      throw new Error(`Phần ${partNumber} chưa tải xong. ${message(cause)} Hãy bấm Tải lên để tiếp tục.`);
    }
  }
  onProgress(100);
  const completed = await retryUpload(() => api<T>(user, 'inbox-upload/finish', {
    query: { id }, body: { etags }, signal: AbortSignal.timeout(70000),
  }));
  files.delete(destination);
  return completed;
}

export function message(error: unknown) {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi.';
}

export const primary = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40';
export const secondary = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40';

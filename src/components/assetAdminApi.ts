import type { User } from 'firebase/auth';
import manifest from '../../scripts/glb-manifest.json';

export const MAX_BYTES = 96_000_000;

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
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Worker không phản hồi. Hãy thử lại.');
  return result as T;
}

export function previewUrl(path: string, revision?: { id: string } | null) {
  const url = new URL(path.slice(1).split('/').map(encodeURIComponent).join('/'), manifest.cdnBaseUrl);
  if (revision) url.searchParams.set('rev', revision.id);
  return url.href;
}

export async function uploadGlb<T extends {id: string}>(user: User, action: string, query: Record<string, string>, file: File, onProgress: (value: number) => void) {
  const token = await user.getIdToken();
  return new Promise<T>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('PUT', endpoint(action, undefined, query).href);
    request.responseType = 'json';
    request.timeout = 150_000;
    request.setRequestHeader('Authorization', 'Bearer ' + token);
    request.setRequestHeader('X-GLB-Size', String(file.size));
    request.upload.onprogress = ({ loaded, total }) => {
      if (total) onProgress(Math.min(100, Math.round(loaded / total * 100)));
    };
    request.onload = () => {
      if (request.status === 201 && request.response?.id) resolve(request.response);
      else reject(new Error(request.response?.error ?? 'Upload thất bại. Hãy thử lại.'));
    };
    request.onerror = () => reject(new Error('Mất kết nối trong lúc upload.'));
    request.ontimeout = () => reject(new Error('Hết thời gian upload.'));
    request.send(file);
  });
}

export function message(error: unknown) {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi.';
}

export const primary = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-40';
export const secondary = 'inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40';

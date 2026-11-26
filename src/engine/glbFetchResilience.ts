/**
 * Universal GLB Network Resilience & Static-Host API Policy (Wave 10)
 *
 * Provides:
 * - Strict GLB v2 binary header verification
 * - Packet-level streaming idle-timeout fetcher (prevents infinite hangs on slow mobile/CDN links
 *   so High -> Lite fallback triggers reliably instead of stalling)
 * - Shared static-SPA host detection (`VITE_STATIC_SPA=true` or Vercel/Netlify/Pages domains)
 *   so browser clients never emit guaranteed-404 calls to Node-only `/api/*` endpoints.
 */

export const DEFAULT_GLB_HIGH_IDLE_TIMEOUT_MS = 28_000;
export const DEFAULT_GLB_LITE_IDLE_TIMEOUT_MS = 18_000;

export function isValidGlbBinary(data: ArrayBuffer): boolean {
  if (data.byteLength < 20) return false;
  const header = new DataView(data);
  return (
    header.getUint32(0, true) === 0x46546c67 &&
    header.getUint32(4, true) === 2 &&
    header.getUint32(8, true) === data.byteLength
  );
}

export interface FetchGlbWithIdleTimeoutOptions {
  url: URL | string;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
  idleTimeoutMs?: number;
  assetLabel?: string;
  onProgress?: (loadedBytes: number, totalBytes: number) => void;
}

/**
 * Downloads a binary GLB with packet-level idle timeout protection, HTML-404 guard,
 * and strict GLB v2 binary header verification.
 */
export async function fetchGlbWithIdleTimeout(
  options: FetchGlbWithIdleTimeoutOptions
): Promise<ArrayBuffer> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const idleTimeoutMs = Math.max(50, Math.floor(options.idleTimeoutMs ?? DEFAULT_GLB_HIGH_IDLE_TIMEOUT_MS));
  const label = options.assetLabel ?? 'GLB';

  const controller = new AbortController();
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const resetTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, idleTimeoutMs);
  };

  const onExternalAbort = () => controller.abort();
  if (options.signal) {
    if (options.signal.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    options.signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  resetTimer();
  try {
    const response = await fetchImpl(options.url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Không tải được ${label} (HTTP ${response.status}).`);
    }
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error(`Phản hồi ${label} không phải tệp GLB hợp lệ.`);
    }

    const encoding = response.headers.get('content-encoding');
    const totalBytes =
      !encoding || encoding === 'identity'
        ? Number(response.headers.get('content-length')) || 0
        : 0;

    let buffer: ArrayBuffer;
    const reader = response.body?.getReader();
    if (!reader) {
      buffer = await response.arrayBuffer();
      resetTimer();
      options.onProgress?.(buffer.byteLength, totalBytes || buffer.byteLength);
    } else {
      const chunks: Uint8Array<ArrayBuffer>[] = [];
      let loadedBytes = 0;
      resetTimer();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          resetTimer();
          if (value && value.byteLength > 0) {
            const copy = new Uint8Array(new ArrayBuffer(value.byteLength));
            copy.set(value);
            chunks.push(copy);
            loadedBytes += value.byteLength;
            options.onProgress?.(loadedBytes, totalBytes);
          }
        }
      } finally {
        reader.releaseLock();
      }
      const combined = new Uint8Array(new ArrayBuffer(loadedBytes));
      let offset = 0;
      for (let i = 0; i < chunks.length; i++) {
        combined.set(chunks[i], offset);
        offset += chunks[i].byteLength;
      }
      buffer = combined.buffer;
    }

    if (!isValidGlbBinary(buffer)) {
      throw new Error(`Tệp GLB ${label} không hợp lệ (${buffer.byteLength} bytes).`);
    }
    return buffer;
  } catch (error) {
    if (timedOut) {
      throw new Error(`Hết thời gian tải ${label} (${Math.round(idleTimeoutMs / 1000)}s không nhận dữ liệu).`);
    }
    throw error;
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    options.signal?.removeEventListener('abort', onExternalAbort);
  }
}

const STATIC_SPA_HOST_PATTERN = /\.(vercel\.app|netlify\.app|pages\.dev|github\.io)$/i;

export interface StaticSpaCheckInput {
  envStaticSpa?: string;
  hostname?: string;
}

/**
 * Returns true when running on a static SPA deployment (e.g. Vercel / Netlify / Cloudflare Pages
 * or built with `VITE_STATIC_SPA=true`) where Node-only `/api/*` routes do not exist.
 */
export function shouldSkipNodeApiEndpoints(input?: StaticSpaCheckInput): boolean {
  const envFlag =
    input?.envStaticSpa ??
    (import.meta as ImportMeta & { env?: { VITE_STATIC_SPA?: string } }).env?.VITE_STATIC_SPA;
  if (envFlag === 'true') return true;
  if (envFlag === 'false') return false;

  const host =
    input?.hostname ?? (typeof window !== 'undefined' ? window.location.hostname : '');
  if (!host) return false;
  return STATIC_SPA_HOST_PATTERN.test(host.trim());
}

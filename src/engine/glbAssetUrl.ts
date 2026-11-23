import { cdnBaseUrl } from '../../scripts/glb-manifest.json';

const viteEnv = (import.meta as ImportMeta & {
  env?: { VITE_GLB_CDN_BASE_URL?: string };
}).env;
const configuredBase = viteEnv ? viteEnv.VITE_GLB_CDN_BASE_URL ?? cdnBaseUrl : undefined;

export function parseGlbCdnBase(value: string | undefined): URL | undefined {
  const input = value?.trim();
  if (!input) return undefined;
  const url = new URL(input);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) {
    throw new Error('VITE_GLB_CDN_BASE_URL must be an HTTPS base URL without credentials, query or fragment.');
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}

const cdnBase = parseGlbCdnBase(configuredBase);
export const useGlbCdn = Boolean(cdnBase);

const revisions = new Map<string, string>();
const revisionId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

export async function loadGlbRevisionIndex(): Promise<void> {
  if (!cdnBase) return;
  try {
    const response = await fetch(new URL('__asset-versions', cdnBase), {
      cache: 'no-store', signal: AbortSignal.timeout(1600),
    });
    if (!response.ok) return;
    const snapshot = await response.json() as Record<string, unknown>;
    revisions.clear();
    for (const [path, value] of Object.entries(snapshot)) {
      if (path.startsWith('/assets/') && typeof value === 'string' && revisionId.test(value)) {
        revisions.set(path, value);
      }
    }
  } catch {
    // The canonical asset URLs can still load when the catalog is unavailable.
  }
}

export function getGlbAssetUrl(
  segments: readonly string[],
  version: string | number,
  baseUrl: string,
  baseUri: string,
  remoteBase = cdnBase
): URL {
  const localBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const base = remoteBase ?? new URL(localBase, baseUri);
  const url = new URL(segments.map(encodeURIComponent).join('/'), base);
  url.searchParams.set('v', String(version));
  const revision = remoteBase && revisions.get('/' + segments.join('/'));
  if (revision) url.searchParams.set('rev', revision);
  return url;
}

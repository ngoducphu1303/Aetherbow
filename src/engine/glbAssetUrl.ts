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
  return url;
}

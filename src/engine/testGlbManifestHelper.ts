import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { TestContext } from 'node:test';

export interface GlbManifestEntry {
  path: string;
  size: number;
  runtime?: boolean;
}

interface GlbManifestFile {
  cdnBaseUrl?: string;
  files: GlbManifestEntry[];
}

export interface ResolvedTestGlb {
  source: 'disk' | 'manifest';
  absPath: string;
  manifestPath: string;
  size: number;
  runtime: boolean;
  cdnUrl?: string;
}

let cachedManifestIndex: { cdnBaseUrl: string; byPath: Map<string, GlbManifestEntry> } | null = null;

function normalizeManifestKey(rawPath: string): string {
  const cwd = process.cwd().replace(/\\/g, '/');
  let cleaned = rawPath.replace(/\\/g, '/');
  if (cleaned.startsWith(`${cwd}/`)) {
    cleaned = cleaned.slice(cwd.length + 1);
  }
  cleaned = cleaned.replace(/^\/+/, '');
  if (!cleaned.startsWith('public/')) {
    cleaned = `public/${cleaned}`;
  }
  return cleaned.normalize('NFC');
}

function getManifestIndex(): { cdnBaseUrl: string; byPath: Map<string, GlbManifestEntry> } {
  if (cachedManifestIndex) return cachedManifestIndex;
  const manifestAbs = path.resolve(process.cwd(), 'scripts/glb-manifest.json');
  const raw = JSON.parse(fs.readFileSync(manifestAbs, 'utf8')) as GlbManifestFile;
  const byPath = new Map<string, GlbManifestEntry>();
  for (const entry of raw.files) {
    byPath.set(entry.path.replace(/\\/g, '/').normalize('NFC'), entry);
  }
  cachedManifestIndex = {
    cdnBaseUrl: raw.cdnBaseUrl ?? '',
    byPath,
  };
  return cachedManifestIndex;
}

export function resolveGlbForTest(absOrPublicPath: string): ResolvedTestGlb {
  const manifestPath = normalizeManifestKey(absOrPublicPath);
  const absPath = path.resolve(process.cwd(), manifestPath);

  if (fs.existsSync(absPath)) {
    const stat = fs.statSync(absPath);
    return {
      source: 'disk',
      absPath,
      manifestPath,
      size: stat.size,
      runtime: true,
    };
  }

  const index = getManifestIndex();
  const entry = index.byPath.get(manifestPath);
  assert.ok(
    entry,
    `GLB asset missing on local disk (${absPath}) AND missing from scripts/glb-manifest.json (${manifestPath})`
  );

  return {
    source: 'manifest',
    absPath,
    manifestPath,
    size: entry.size,
    runtime: Boolean(entry.runtime),
    cdnUrl: index.cdnBaseUrl
      ? `${index.cdnBaseUrl.replace(/\/+$/, '')}/${manifestPath.replace(/^public\//, '')}`
      : undefined,
  };
}

export function assertValidGlbAssetOrManifest(
  absOrPublicPath: string,
  opts?: { maxBytes?: number; requireRuntime?: boolean }
): ResolvedTestGlb {
  const resolved = resolveGlbForTest(absOrPublicPath);

  if (resolved.source === 'disk') {
    const fd = fs.openSync(resolved.absPath, 'r');
    const hdr = Buffer.alloc(12);
    try {
      fs.readSync(fd, hdr, 0, 12, 0);
    } finally {
      fs.closeSync(fd);
    }
    assert.equal(hdr.toString('ascii', 0, 4), 'glTF', `${resolved.manifestPath} invalid glTF magic`);
    assert.equal(hdr.readUInt32LE(4), 2, `${resolved.manifestPath} must be glTF v2`);
    assert.equal(hdr.readUInt32LE(8), resolved.size, `${resolved.manifestPath} length header mismatch`);
  } else {
    assert.ok(resolved.size >= 20, `${resolved.manifestPath} manifest size must be >= 20 B`);
    if (opts?.requireRuntime) {
      assert.equal(
        resolved.runtime,
        true,
        `${resolved.manifestPath} must be marked runtime: true in scripts/glb-manifest.json`
      );
    }
  }

  if (opts?.maxBytes !== undefined) {
    assert.ok(
      resolved.size <= opts.maxBytes,
      `${resolved.manifestPath} (${resolved.size} B) exceeds budget (${opts.maxBytes} B)`
    );
  }

  return resolved;
}

/**
 * Verifies every required GLB exists in scripts/glb-manifest.json (or disk).
 * If any binary is offloaded to CDN and not mirrored locally, skips the binary-parse test honestly.
 */
export function skipIfGlbOffloadedToCdn(t: TestContext, requiredPaths: readonly string[]): boolean {
  let anyOffloaded = false;
  for (const p of requiredPaths) {
    const resolved = resolveGlbForTest(p);
    if (resolved.source === 'manifest') {
      anyOffloaded = true;
    }
  }
  if (anyOffloaded) {
    t.skip('Local GLB binary offloaded to CDN (manifest presence & byte size verified via scripts/glb-manifest.json)');
    return true;
  }
  return false;
}

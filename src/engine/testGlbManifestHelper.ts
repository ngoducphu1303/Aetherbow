import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { TestContext } from 'node:test';

interface ManifestFileRecord {
  path: string;
  size: number;
  runtime?: boolean;
}

interface ManifestJson {
  cdnBaseUrl?: string;
  files?: ManifestFileRecord[];
}

export interface AssertGlbAssetOptions {
  maxBytes?: number;
  minBytes?: number;
  requireRuntime?: boolean;
}

export interface ValidatedGlbAssetResult {
  source: 'disk' | 'manifest';
  absPath: string;
  manifestPath: string;
  size: number;
  runtime: boolean;
}

let cachedManifestMap: Map<string, ManifestFileRecord> | null = null;

function loadManifestMap(): Map<string, ManifestFileRecord> {
  if (cachedManifestMap) return cachedManifestMap;
  const map = new Map<string, ManifestFileRecord>();
  const manifestPath = path.resolve(process.cwd(), 'scripts', 'glb-manifest.json');
  if (fs.existsSync(manifestPath)) {
    const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as ManifestJson;
    for (const entry of parsed.files ?? []) {
      const normalized = String(entry.path || '').replace(/\\/g, '/').replace(/^\/+/, '');
      if (normalized) {
        map.set(normalized, {
          path: normalized,
          size: Number(entry.size || 0),
          runtime: Boolean(entry.runtime),
        });
      }
    }
  }
  cachedManifestMap = map;
  return map;
}

function toManifestKey(inputPath: string): { absPath: string; manifestPath: string } {
  const cwd = process.cwd();
  const absPath = path.isAbsolute(inputPath) ? inputPath : path.resolve(cwd, inputPath);
  const rel = path.relative(cwd, absPath).replace(/\\/g, '/').replace(/^\/+/, '');
  return { absPath, manifestPath: rel };
}

export function assertValidGlbAssetOrManifest(
  inputPath: string,
  options?: AssertGlbAssetOptions
): ValidatedGlbAssetResult {
  const { absPath, manifestPath } = toManifestKey(inputPath);
  const minBytes = options?.minBytes ?? 20;

  if (fs.existsSync(absPath)) {
    const stat = fs.statSync(absPath);
    assert.ok(stat.size >= minBytes, `GLB too small (${stat.size} bytes): ${manifestPath}`);
    if (options?.maxBytes !== undefined) {
      assert.ok(
        stat.size <= options.maxBytes,
        `GLB exceeds maxBytes (${stat.size} > ${options.maxBytes}): ${manifestPath}`
      );
    }

    // Validate binary glTF v2 header
    const fd = fs.openSync(absPath, 'r');
    try {
      const hdr = Buffer.alloc(12);
      fs.readSync(fd, hdr, 0, 12, 0);
      assert.equal(hdr.toString('ascii', 0, 4), 'glTF', `Invalid GLB magic header: ${manifestPath}`);
      assert.equal(hdr.readUInt32LE(4), 2, `Unsupported GLB version: ${manifestPath}`);
      assert.equal(hdr.readUInt32LE(8), stat.size, `Truncated GLB length: ${manifestPath}`);
    } finally {
      fs.closeSync(fd);
    }

    const manifestEntry = loadManifestMap().get(manifestPath);
    if (options?.requireRuntime && manifestEntry) {
      assert.equal(
        manifestEntry.runtime,
        true,
        `Expected manifest entry to be marked runtime=true: ${manifestPath}`
      );
    }

    return {
      source: 'disk',
      absPath,
      manifestPath,
      size: stat.size,
      runtime: manifestEntry ? Boolean(manifestEntry.runtime) : true,
    };
  }

  const manifestEntry = loadManifestMap().get(manifestPath);
  assert.ok(
    manifestEntry,
    `GLB missing on disk and not registered in scripts/glb-manifest.json: ${manifestPath}`
  );
  assert.ok(
    manifestEntry.size >= minBytes,
    `Manifest GLB size too small (${manifestEntry.size}): ${manifestPath}`
  );
  if (options?.maxBytes !== undefined) {
    assert.ok(
      manifestEntry.size <= options.maxBytes,
      `Manifest GLB exceeds maxBytes (${manifestEntry.size} > ${options.maxBytes}): ${manifestPath}`
    );
  }
  if (options?.requireRuntime) {
    assert.equal(
      manifestEntry.runtime,
      true,
      `Manifest GLB must be marked runtime=true: ${manifestPath}`
    );
  }

  return {
    source: 'manifest',
    absPath,
    manifestPath,
    size: manifestEntry.size,
    runtime: Boolean(manifestEntry.runtime),
  };
}

export function skipIfGlbOffloadedToCdn(t: TestContext, paths: ReadonlyArray<string>): boolean {
  const manifestMap = loadManifestMap();
  const missingOnDisk: string[] = [];
  for (const p of paths) {
    const { absPath, manifestPath } = toManifestKey(p);
    if (!fs.existsSync(absPath)) {
      if (!manifestMap.has(manifestPath)) {
        return false;
      }
      missingOnDisk.push(manifestPath);
    }
  }
  if (missingOnDisk.length > 0) {
    t.skip(`Offloaded ${missingOnDisk.length} GLB(s) to CDN manifest (${missingOnDisk[0]})`);
    return true;
  }
  return false;
}

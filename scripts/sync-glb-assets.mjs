import fs from 'node:fs';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import manifest from './glb-manifest.json' with { type: 'json' };

const MAX_RUNTIME_SIZE_BYTES = 25 * 1024 * 1024;
const RANGE_BYTES = 6 * 1024 * 1024;
const EXTRA_RUNTIME_GLBS = new Set([
  'public/assets/Chương 1/Map mới/Chương 1.glb',
]);

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  const getFlagValue = (name, fallback) => {
    const idx = argv.indexOf(name);
    return idx >= 0 && argv[idx + 1] ? argv[idx + 1] : fallback;
  };
  return {
    checkOnly: args.has('--check'),
    includeAllRaw: args.has('--all'),
    cdn: getFlagValue('--cdn', process.env.VITE_GLB_CDN_BASE_URL || manifest.cdnBaseUrl),
    file: getFlagValue('--file', undefined),
    concurrency: Math.max(1, Math.min(6, Number(getFlagValue('--concurrency', '4')) || 4)),
  };
}

function isValidGlbFile(absPath, expectedSize) {
  if (!fs.existsSync(absPath)) return { ok: false, reason: 'missing' };
  const stat = fs.statSync(absPath);
  if (stat.size < 20) return { ok: false, reason: `too_small (${stat.size}B)` };
  if (expectedSize && stat.size !== expectedSize) {
    return { ok: false, reason: `size_mismatch (${stat.size} != ${expectedSize})` };
  }
  const header = Buffer.alloc(12);
  const fd = fs.openSync(absPath, 'r');
  try {
    fs.readSync(fd, header, 0, 12, 0);
  } finally {
    fs.closeSync(fd);
  }
  const magic = header.toString('ascii', 0, 4);
  const version = header.readUInt32LE(4);
  const declaredLen = header.readUInt32LE(8);
  if (magic !== 'glTF' || version !== 2 || declaredLen !== stat.size) {
    return {
      ok: false,
      reason: `invalid_glb_header (magic=${JSON.stringify(magic)}, v=${version}, len=${declaredLen}/${stat.size})`,
    };
  }
  return { ok: true, size: stat.size };
}

function buildCdnUrl(base, repoPath) {
  const normalized = base.endsWith('/') ? base : `${base}/`;
  const key = repoPath.slice('public/'.length).split('/').map(encodeURIComponent).join('/');
  return new URL(key, normalized);
}

async function downloadFile(url, tmpPath, expectedSize) {
  if (expectedSize < MAX_RUNTIME_SIZE_BYTES) {
    const response = await fetch(url, { signal: AbortSignal.timeout(90_000) });
    if (!response.ok || !response.body) throw new Error(`HTTP ${response.status}`);
    await pipeline(Readable.fromWeb(response.body), fs.createWriteStream(tmpPath));
    return;
  }

  // Keep large raw models and the full Chapter 1 map inside per-request limits.
  const file = await fs.promises.open(tmpPath, 'w');
  try {
    for (let start = 0; start < expectedSize; start += RANGE_BYTES) {
      const end = Math.min(expectedSize - 1, start + RANGE_BYTES - 1);
      const response = await fetch(url, {
        headers: { Range: `bytes=${start}-${end}` },
        signal: AbortSignal.timeout(45_000),
      });
      if (response.status !== 206 || response.headers.get('content-range') !== `bytes ${start}-${end}/${expectedSize}`) {
        await response.body?.cancel();
        throw new Error(`Invalid CDN range ${start}-${end} (HTTP ${response.status})`);
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (bytes.length !== end - start + 1) throw new Error('Incomplete CDN range');
      await file.writeFile(bytes);
    }
  } finally {
    await file.close();
  }
}

async function downloadFileWithRetry(url, absPath, expectedSize, maxAttempts = 3) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  const tmpPath = `${absPath}.sync.tmp`;

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await downloadFile(url, tmpPath, expectedSize);
      const check = isValidGlbFile(tmpPath, expectedSize);
      if (!check.ok) {
        throw new Error(`Integrity check failed: ${check.reason}`);
      }
      fs.renameSync(tmpPath, absPath);
      return check.size;
    } catch (error) {
      lastError = error;
      if (fs.existsSync(tmpPath)) {
        try {
          fs.unlinkSync(tmpPath);
        } catch {
          // ignore cleanup error
        }
      }
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 500 * attempt));
      }
    }
  }
  throw lastError;
}

function formatMB(bytes) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

async function main() {
  const opts = parseArgs(process.argv);
  const allGlbs = opts.file ? manifest.files.filter(({ path }) => path === opts.file) : manifest.files;
  if (allGlbs.length === 0) throw new Error('No GLB matches the requested path in the manifest.');
  const targetGlbs = opts.includeAllRaw || opts.file
    ? allGlbs
    : allGlbs.filter((entry) => entry.size < MAX_RUNTIME_SIZE_BYTES || EXTRA_RUNTIME_GLBS.has(entry.path));

  const skippedRawCount = allGlbs.length - targetGlbs.length;
  const toDownload = [];
  let validCount = 0;

  for (const entry of targetGlbs) {
    const absPath = path.resolve(process.cwd(), entry.path);
    const check = isValidGlbFile(absPath, entry.size);
    if (check.ok) {
      validCount++;
    } else {
      toDownload.push({ ...entry, absPath, reason: check.reason });
    }
  }

  console.log(
    `[glb-sync] CDN: ${opts.cdn} | Target: ${targetGlbs.length} GLB(s) ` +
      `(${validCount} ok, ${toDownload.length} missing/corrupt` +
      `${skippedRawCount > 0 ? `, ${skippedRawCount} raw source GLBs >= 25MB skipped unless --all` : ''})`
  );

  if (toDownload.length === 0) {
    console.log('[glb-sync] All target GLB assets are present and verified (glTF v2 header + exact byte size).');
    return;
  }

  if (opts.checkOnly) {
    for (const item of toDownload) {
      console.log(`  MISSING/INVALID [${formatMB(item.size)}] ${item.path} (${item.reason})`);
    }
    process.exitCode = 1;
    return;
  }

  let cursor = 0;
  let downloadedBytes = 0;
  let downloadedCount = 0;
  const failures = [];

  const worker = async () => {
    while (cursor < toDownload.length) {
      const item = toDownload[cursor++];
      const url = buildCdnUrl(opts.cdn, item.path);
      try {
        const bytes = await downloadFileWithRetry(url, item.absPath, item.size);
        downloadedBytes += bytes;
        downloadedCount++;
        console.log(
          `  [OK ${downloadedCount}/${toDownload.length}] ${formatMB(bytes).padStart(9)}  ${item.path}`
        );
      } catch (err) {
        failures.push({ path: item.path, error: err instanceof Error ? err.message : String(err) });
        console.error(`  [FAIL] ${item.path}: ${err instanceof Error ? err.message : err}`);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(opts.concurrency, toDownload.length) }, () => worker()));

  console.log(
    `[glb-sync] Finished: ${downloadedCount}/${toDownload.length} synced (${formatMB(downloadedBytes)}).`
  );
  if (failures.length > 0) {
    console.error(`[glb-sync] ${failures.length} file(s) failed to download.`);
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('[glb-sync] Fatal error:', err);
  process.exit(1);
});

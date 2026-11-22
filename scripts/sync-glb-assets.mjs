import fs from 'node:fs';
import path from 'node:path';

const DEFAULT_REPO = process.env.GITHUB_REPO || 'ngoducphu1303/Aetherbow';
const DEFAULT_BRANCH = process.env.GITHUB_BRANCH || 'main';
const MAX_RUNTIME_SIZE_BYTES = 25 * 1024 * 1024; // 25 MiB threshold for regular runtime GLBs

// Explicitly whitelisted large (>25 MiB) GLBs that are actively used by runtime or tests
const EXTRA_RUNTIME_GLBS = new Set([
  'public/assets/Chương 1/Map mới/Chương 1.glb',
]);

// Removed / deprecated GLB asset prefixes that must not be synced back
const EXCLUDED_GLB_PREFIXES = [
  'public/assets/lobby-local/',
];

function isExcludedGlb(repoPath) {
  return EXCLUDED_GLB_PREFIXES.some((prefix) => repoPath.startsWith(prefix));
}

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  const getFlagValue = (name, fallback) => {
    const idx = argv.indexOf(name);
    return idx >= 0 && argv[idx + 1] ? argv[idx + 1] : fallback;
  };
  return {
    checkOnly: args.has('--check'),
    includeAllRaw: args.has('--all'),
    repo: getFlagValue('--repo', DEFAULT_REPO),
    branch: getFlagValue('--branch', DEFAULT_BRANCH),
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

function buildRawGithubUrl(repo, branch, repoPath) {
  const encoded = repoPath
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
  return `https://raw.githubusercontent.com/${repo}/${encodeURIComponent(branch)}/${encoded}`;
}

async function fetchRepoGlbList(repo, branch) {
  const treeUrl = `https://api.github.com/repos/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`;
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'aetherbow-glb-sync',
  };
  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  const res = await fetch(treeUrl, { headers });
  if (!res.ok) {
    throw new Error(`GitHub Trees API failed (${res.status}): ${await res.text()}`);
  }
  const payload = await res.json();
  return (payload.tree || [])
    .filter((entry) => entry.type === 'blob' && entry.path.toLowerCase().endsWith('.glb'))
    .map((entry) => ({
      path: entry.path,
      size: Number(entry.size) || 0,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

async function downloadFileWithRetry(url, absPath, expectedSize, maxAttempts = 3) {
  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  const tmpPath = `${absPath}.sync.tmp`;

  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
      }
      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      fs.writeFileSync(tmpPath, buf);
      const check = isValidGlbFile(tmpPath, expectedSize);
      if (!check.ok) {
        throw new Error(`Integrity check failed: ${check.reason}`);
      }
      fs.renameSync(tmpPath, absPath);
      return buf.byteLength;
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
  const allGlbs = (await fetchRepoGlbList(opts.repo, opts.branch)).filter(
    (entry) => !isExcludedGlb(entry.path)
  );
  const targetGlbs = opts.includeAllRaw
    ? allGlbs
    : allGlbs.filter(
        (entry) => entry.size < MAX_RUNTIME_SIZE_BYTES || EXTRA_RUNTIME_GLBS.has(entry.path)
      );

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
    `[glb-sync] Repo: ${opts.repo}@${opts.branch} | Target: ${targetGlbs.length} GLB(s) ` +
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
      const url = buildRawGithubUrl(opts.repo, opts.branch, item.path);
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

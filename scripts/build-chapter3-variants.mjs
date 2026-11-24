import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MeshoptSimplifier } from 'meshoptimizer';
import { processAsset } from './build-chapter1-roster-variants.mjs';
import {
  CHAPTER3_RUNTIME_REL_DIR,
  DELL_E5430_LITE_PROFILE,
  HIGH_QUALITY_PROFILE,
  inspectGlbFile,
  parseCliArgs,
  resolveSelectedSpecs,
  syncChapter3ManifestEntries,
  validateAssetVariant,
  validateChapter3Pack,
} from './chapter3-asset-pipeline.mjs';

const WORKER_BASE = process.env.GLB_CDN_BASE_URL || 'https://aetherbow-glb.puugoo002.workers.dev';
const RAW_TMP_DIR = '/tmp/ch3-raw';
const MANIFEST_PATH = path.resolve(process.cwd(), 'scripts/glb-manifest.json');

function printHelp() {
  console.log(`
Chapter 3 High & Lite 3D Asset Automation Pipeline
Target Low-End Profile: ${DELL_E5430_LITE_PROFILE.deviceLabel}

Usage:
  node scripts/build-chapter3-variants.mjs [options] [asset-id ...]

Options:
  --verify, --check     Verify existing High/Lite GLBs against Dell Latitude E5430 & High budgets
  --dry-run             Preview asset targets, source resolution, and hardware budgets without writing
  --tier <mode>         both (default) | high | lite
  --source-dir <dir>    Read raw GLBs from a local folder instead of downloading from Worker inbox
  --out-dir <dir>       Output directory (default: ${CHAPTER3_RUNTIME_REL_DIR})
  --report <path>       JSON report output path (default: /tmp/ch3-geometry-report.json)
  --update-manifest     Sync generated file sizes into scripts/glb-manifest.json
  --keep-raw            Keep temporary downloaded raw GLBs in ${RAW_TMP_DIR}
  --only <id1,id2>      Process or verify only the listed asset ID(s)
  -h, --help            Show this help message
`.trim());
}

function toCdnUrl(assetPath) {
  const encoded = assetPath.slice(1).split('/').map(encodeURIComponent).join('/');
  return new URL(encoded, `${WORKER_BASE.replace(/\/$/, '')}/`).href;
}

async function fetchChapter3Inbox() {
  const url = `${WORKER_BASE.replace(/\/$/, '')}/__asset-inbox?chapter=3`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`Inbox fetch failed: HTTP ${res.status}`);
  const data = await res.json();
  return (data.files || []).map((f) => ({
    ...f,
    fileName: f.name,
    url: f.url || toCdnUrl(f.path),
  }));
}

function findLocalSource(sourceDir, spec) {
  const candidates = [
    path.join(sourceDir, spec.match),
    path.join(sourceDir, `${spec.id}.glb`),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function activeTiers(tierOption) {
  if (tierOption === 'high') return ['high'];
  if (tierOption === 'lite') return ['lite'];
  return ['high', 'lite'];
}

function formatVariantSummary(id, tier, metrics, validation) {
  if (!metrics.valid) {
    return `FAIL [${id}:${tier}] ${metrics.error}`;
  }
  const kb = (metrics.bytes / 1024).toFixed(0).padStart(5);
  const verts = String(metrics.vertexCount).padStart(5);
  const tris = String(metrics.triangleCount).padStart(5);
  const tex = metrics.images.map((img) => `${img.width}x${img.height}`).join(', ');
  const status = validation.ok ? 'PASS' : 'FAIL';
  return `${status} [${`${id}:${tier}`.padEnd(28)}] ${kb}KB | ${verts}v | ${tris}t | VRAM~${metrics.estimatedVramMb.toFixed(2).padStart(5)}MB | tex=[${tex}]`;
}

function verifyExistingAssets(specs, options) {
  const tiers = activeTiers(options.tier);
  const variantEntries = [];
  const report = {
    mode: 'verify',
    generatedAt: new Date().toISOString(),
    hardwareProfiles: {
      lite: DELL_E5430_LITE_PROFILE,
      high: HIGH_QUALITY_PROFILE,
    },
    outDir: options.outDir,
    assets: {},
  };

  console.log(`\nVerifying ${specs.length} Chapter 3 asset(s) (${tiers.join(' + ')}) in ${options.outDir}`);
  console.log(`Low-End Target: ${DELL_E5430_LITE_PROFILE.deviceLabel}\n`);

  for (const spec of specs) {
    report.assets[spec.id] = { role: spec.role, sourceFileName: spec.match, variants: {} };
    for (const tier of tiers) {
      const filePath = path.join(options.outDir, `${spec.id}-${tier}.glb`);
      const metrics = inspectGlbFile(filePath, {
        includeBounds: tier === 'lite',
        isArena: Boolean(spec.isArena),
      });
      const validation = validateAssetVariant(spec, tier, metrics);
      variantEntries.push({ id: spec.id, tier, filePath, metrics, validation });
      report.assets[spec.id].variants[tier] = {
        file: path.basename(filePath),
        metrics,
        validation,
      };
      console.log(formatVariantSummary(spec.id, tier, metrics, validation));
      if (!validation.ok) {
        for (const v of validation.violations) console.error(`   ↳ ${v}`);
      }
    }
  }

  const packCheck = validateChapter3Pack(variantEntries, options.tier);
  report.pack = packCheck;

  fs.mkdirSync(path.dirname(options.reportPath), { recursive: true });
  fs.writeFileSync(options.reportPath, JSON.stringify(report, null, 2));

  console.log('\n--- Pack Summary ---');
  if (tiers.includes('lite')) {
    console.log(
      `Lite (${packCheck.totals.liteCount} files): ${packCheck.totals.totalLiteMiB} MiB disk | ~${packCheck.totals.totalLiteVramMb} MB GPU VRAM ` +
        `(E5430 cap: ${(DELL_E5430_LITE_PROFILE.maxPackBytes / (1024 * 1024)).toFixed(0)} MiB / ${DELL_E5430_LITE_PROFILE.maxPackVramMb} MB)`
    );
  }
  if (tiers.includes('high')) {
    console.log(
      `High (${packCheck.totals.highCount} files): ${packCheck.totals.totalHighMiB} MiB disk | ~${packCheck.totals.totalHighVramMb} MB GPU VRAM`
    );
  }
  console.log(`Report saved: ${options.reportPath}`);

  if (!packCheck.ok) {
    console.error(`\nVerification FAILED (${packCheck.violations.length} violation(s)):`);
    for (const v of packCheck.violations) console.error(` - ${v}`);
    process.exitCode = 1;
  } else {
    console.log('\nVerification PASSED — all Chapter 3 assets meet High & Dell Latitude E5430 Lite compatibility budgets.');
  }
}

async function runBuild(specs, options) {
  const tiers = activeTiers(options.tier);
  const skipHigh = !tiers.includes('high');
  const skipLite = !tiers.includes('lite');

  if (options.dryRun) {
    console.log(`\n[DRY RUN] Chapter 3 Asset Build Plan (${specs.length} assets · tier=${options.tier})`);
    console.log(`Source: ${options.sourceDir ? `local directory (${options.sourceDir})` : `Worker inbox (${WORKER_BASE})`}`);
    console.log(`Output: ${options.outDir}`);
    console.log(`Low-End Target: ${DELL_E5430_LITE_PROFILE.deviceLabel}\n`);
    for (const spec of specs) {
      const localMatch = options.sourceDir ? findLocalSource(options.sourceDir, spec) : null;
      const srcLabel = options.sourceDir ? (localMatch ? path.basename(localMatch) : `MISSING (${spec.match})`) : spec.match;
      console.log(
        `- ${spec.id.padEnd(24)} [${spec.role.padEnd(9)}] src=${srcLabel} | ` +
          `High=${spec.highTris}t/${spec.highAlbedo}px | Lite=${spec.liteTris}t/${spec.liteAlbedo}px`
      );
    }
    return;
  }

  fs.mkdirSync(options.outDir, { recursive: true });
  if (!options.sourceDir) fs.mkdirSync(RAW_TMP_DIR, { recursive: true });

  const inbox = options.sourceDir ? [] : await fetchChapter3Inbox();
  if (!options.sourceDir) {
    console.log(`Fetched ${inbox.length} Chapter 3 source assets from Worker inbox.`);
  }

  await MeshoptSimplifier.ready;
  const variantEntries = [];
  const manifestUpdates = [];
  const report = {
    mode: 'build',
    generatedAt: new Date().toISOString(),
    hardwareProfiles: {
      lite: DELL_E5430_LITE_PROFILE,
      high: HIGH_QUALITY_PROFILE,
    },
    outDir: options.outDir,
    assets: {},
  };

  for (const spec of specs) {
    let rawPath;
    let shouldDeleteRaw = false;
    let sourceBytes = 0;
    let sourceFileName = spec.match;

    if (options.sourceDir) {
      rawPath = findLocalSource(options.sourceDir, spec);
      if (!rawPath) {
        throw new Error(`Missing local source GLB for "${spec.id}" in ${options.sourceDir} (expected ${spec.match} or ${spec.id}.glb)`);
      }
      sourceBytes = fs.statSync(rawPath).size;
      sourceFileName = path.basename(rawPath);
    } else {
      const entry = inbox.find((a) => a.fileName === spec.match);
      if (!entry) {
        throw new Error(`Missing Chapter 3 asset in Worker inbox: ${spec.match}`);
      }
      rawPath = path.join(RAW_TMP_DIR, `${spec.id}.glb`);
      sourceBytes = entry.size;
      sourceFileName = entry.fileName;
      if (!fs.existsSync(rawPath)) {
        console.log(`\n[${spec.id}] Downloading ${(entry.size / (1024 * 1024)).toFixed(1)} MiB from ${entry.url} ...`);
        execFileSync('curl', ['-fL', '--retry', '3', '--retry-delay', '2', '-sS', '-o', rawPath, entry.url], {
          stdio: 'inherit',
        });
      }
      shouldDeleteRaw = !options.keepRaw;
    }

    try {
      await processAsset({
        id: spec.id,
        sourcePath: rawPath,
        outDir: options.outDir,
        highFile: `${spec.id}-high.glb`,
        liteFile: `${spec.id}-lite.glb`,
        highTris: spec.highTris,
        highMaxTris: spec.highMaxTris,
        liteTris: spec.liteTris,
        liteMaxTris: spec.liteMaxTris,
        highAlbedoSize: spec.highAlbedo,
        highDataSize: spec.highDataSize,
        liteAlbedoSize: spec.liteAlbedo,
        skipHigh,
        skipLite,
        chapterPrefix: 'Ch3',
        generatorChapterLabel: 'Chapter 3',
      });
    } finally {
      if (shouldDeleteRaw) {
        fs.rmSync(rawPath, { force: true });
      }
    }

    report.assets[spec.id] = {
      role: spec.role,
      sourceFileName,
      sourceBytes,
      variants: {},
    };

    for (const tier of tiers) {
      const outPath = path.join(options.outDir, `${spec.id}-${tier}.glb`);
      const metrics = inspectGlbFile(outPath, {
        includeBounds: tier === 'lite',
        isArena: Boolean(spec.isArena),
      });
      const validation = validateAssetVariant(spec, tier, metrics);
      variantEntries.push({ id: spec.id, tier, filePath: outPath, metrics, validation });
      report.assets[spec.id].variants[tier] = {
        file: path.basename(outPath),
        metrics,
        validation,
      };
      console.log(formatVariantSummary(spec.id, tier, metrics, validation));
      if (!validation.ok) {
        for (const v of validation.violations) console.error(`   ↳ ${v}`);
      }
      if (metrics.valid) {
        const relPath = path.relative(process.cwd(), outPath).replace(/\\/g, '/');
        if (relPath.startsWith('public/assets/')) {
          manifestUpdates.push({ path: relPath, size: metrics.bytes });
        }
      }
    }
  }

  const packCheck = validateChapter3Pack(variantEntries, options.tier);
  report.pack = packCheck;

  if (options.updateManifest && manifestUpdates.length > 0 && packCheck.ok) {
    const currentManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const synced = syncChapter3ManifestEntries(currentManifest, manifestUpdates);
    fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(synced.manifest, null, 2)}\n`);
    console.log(
      `\nManifest synced (${MANIFEST_PATH}): ${synced.updated} updated, ${synced.inserted} inserted.`
    );
  }

  fs.mkdirSync(path.dirname(options.reportPath), { recursive: true });
  fs.writeFileSync(options.reportPath, JSON.stringify(report, null, 2));
  console.log(`\nSaved Chapter 3 geometry & E5430 compatibility report to ${options.reportPath}`);

  if (!packCheck.ok) {
    throw new Error(
      `Chapter 3 build failed hardware budget validation (${packCheck.violations.length} violation(s)):\n - ${packCheck.violations.join('\n - ')}`
    );
  }
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseCliArgs(argv);
  if (options.help) {
    printHelp();
    return;
  }
  const specs = resolveSelectedSpecs(options.ids);
  if (options.verifyOnly) {
    verifyExistingAssets(specs, options);
    return;
  }
  await runBuild(specs, options);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}

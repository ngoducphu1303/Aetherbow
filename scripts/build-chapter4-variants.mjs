import { execFileSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MeshoptSimplifier } from 'meshoptimizer';
import { processAsset } from './build-chapter1-roster-variants.mjs';
import {
  CHAPTER4_DRIVE_FOLDER_URL,
  CHAPTER4_RUNTIME_REL_DIR,
  DELL_E5430_LITE_PROFILE,
  HIGH_QUALITY_PROFILE,
  buildDriveDownloadUrl,
  inspectGlbFile,
  parseChapter4CliArgs,
  resolveSelectedChapter4Specs,
  syncChapter4ManifestEntries,
  validateAssetVariant,
  validateChapter4Pack,
} from './chapter4-asset-pipeline.mjs';

const RAW_TMP_DIR = path.join('/tmp', `ch4-raw-${process.pid}-${Date.now().toString(36)}`);
const MANIFEST_PATH = path.resolve(process.cwd(), 'scripts/glb-manifest.json');

function printHelp() {
  console.log(`
Chapter 4 (Song Tử · Gemini) High & Lite 3D Asset Automation Pipeline
Google Drive Source: ${CHAPTER4_DRIVE_FOLDER_URL}
Target Low-End Profile: ${DELL_E5430_LITE_PROFILE.deviceLabel}

Usage:
  node scripts/build-chapter4-variants.mjs [options] [asset-id ...]

Options:
  --verify, --check     Verify existing High/Lite GLBs against Dell Latitude E5430 & High budgets
  --dry-run             Preview asset targets, source resolution, and hardware budgets without writing
  --tier <mode>         both (default) | high | lite
  --source-dir <dir>    Read raw GLBs from a local folder instead of downloading from Google Drive
  --out-dir <dir>       Output directory (default: ${CHAPTER4_RUNTIME_REL_DIR})
  --report <path>       JSON report output path (default: /tmp/ch4-geometry-report.json)
  --update-manifest     Sync generated file sizes into scripts/glb-manifest.json
  --skip-portraits      Skip downloading & converting 512x512 WebP portraits from Drive PNGs
  --keep-raw            Keep temporary downloaded raw GLBs in ${RAW_TMP_DIR}
  --only <id1,id2>      Process or verify only the listed asset ID(s)
  -h, --help            Show this help message
`.trim());
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
  return `${status} [${`${id}:${tier}`.padEnd(34)}] ${kb}KB | ${verts}v | ${tris}t | VRAM~${metrics.estimatedVramMb.toFixed(2).padStart(5)}MB | tex=[${tex}]`;
}

function downloadDriveFile(fileId, destPath, label) {
  const url = buildDriveDownloadUrl(fileId);
  console.log(`\n[${label}] Downloading from Google Drive (${fileId}) ...`);
  execFileSync(
    'curl',
    ['-fL', '--retry', '3', '--retry-delay', '2', '-sS', '-o', destPath, url],
    { stdio: 'inherit' }
  );
  const stat = fs.statSync(destPath);
  if (stat.size < 1024) {
    throw new Error(`[${label}] Downloaded file too small (${stat.size} bytes) — check Drive permissions.`);
  }
  return stat.size;
}

function buildPortraitWebp(spec, outDir) {
  const outWebpPath = path.join(outDir, `${spec.id}.webp`);
  const tmpPngPath = path.join(RAW_TMP_DIR, `${spec.id}.png`);
  try {
    downloadDriveFile(spec.drivePngId, tmpPngPath, `${spec.id}:portrait`);
    const tmpWebp = `${outWebpPath}.tmp-${process.pid}.webp`;
    execFileSync(
      '/usr/bin/convert',
      [
        tmpPngPath,
        '-filter',
        'Lanczos',
        '-resize',
        '512x512>',
        '-strip',
        '-quality',
        '86',
        `webp:${tmpWebp}`,
      ],
      { stdio: 'inherit' }
    );
    fs.renameSync(tmpWebp, outWebpPath);
    const stat = fs.statSync(outWebpPath);
    console.log(`[${spec.id}:portrait] Saved ${path.basename(outWebpPath)} (${(stat.size / 1024).toFixed(1)} KB)`);
  } finally {
    fs.rmSync(tmpPngPath, { force: true });
  }
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

  console.log(`\nVerifying ${specs.length} Chapter 4 asset(s) (${tiers.join(' + ')}) in ${options.outDir}`);
  console.log(`Low-End Target: ${DELL_E5430_LITE_PROFILE.deviceLabel}\n`);

  for (const spec of specs) {
    const portraitPath = path.join(options.outDir, `${spec.id}.webp`);
    report.assets[spec.id] = {
      role: spec.role,
      sourceFileName: spec.match,
      portraitPresent: fs.existsSync(portraitPath),
      variants: {},
    };
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

  const packCheck = validateChapter4Pack(variantEntries, options.tier);
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
    if (options.updateManifest) {
      const manifestUpdates = variantEntries
        .filter((entry) => entry.metrics.valid)
        .map((entry) => ({
          path: path.relative(process.cwd(), entry.filePath).replace(/\\/g, '/'),
          size: entry.metrics.bytes,
        }))
        .filter((entry) => entry.path.startsWith('public/assets/'));
      if (manifestUpdates.length > 0) {
        const currentManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
        const synced = syncChapter4ManifestEntries(currentManifest, manifestUpdates);
        fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(synced.manifest, null, 2)}\n`);
        console.log(
          `\nManifest synced (${MANIFEST_PATH}): ${synced.updated} updated, ${synced.inserted} inserted.`
        );
      }
    }
    console.log('\nVerification PASSED — all Chapter 4 assets meet High & Dell Latitude E5430 Lite compatibility budgets.');
  }
}

function isAssetAlreadyBuilt(spec, tiers, outDir) {
  for (const tier of tiers) {
    const outPath = path.join(outDir, `${spec.id}-${tier}.glb`);
    if (!fs.existsSync(outPath)) return false;
    const metrics = inspectGlbFile(outPath, { includeBounds: false, isArena: Boolean(spec.isArena) });
    const validation = validateAssetVariant(spec, tier, metrics);
    if (!validation.ok) return false;
  }
  return true;
}

async function runParallelWorkers(specs, options) {
  const tiers = activeTiers(options.tier);
  const pendingSpecs = options.skipExisting
    ? specs.filter((spec) => {
        if (isAssetAlreadyBuilt(spec, tiers, options.outDir)) {
          console.log(`[${spec.id}] Already built & verified — skipping download.`);
          return false;
        }
        return true;
      })
    : specs;

  if (pendingSpecs.length === 0) {
    console.log('All requested Chapter 4 GLB variants already exist and pass validation.');
    verifyExistingAssets(specs, options);
    return;
  }

  console.log(
    `Building ${pendingSpecs.length}/${specs.length} Chapter 4 asset(s) with concurrency=${options.concurrency}...`
  );
  const scriptPath = fileURLToPathCompat(import.meta.url);
  let cursor = 0;
  let completed = 0;
  const failures = [];

  async function spawnSingle(spec) {
    const workerReport = path.join('/tmp', `ch4-worker-${process.pid}-${spec.id}.json`);
    const childArgs = [
      scriptPath,
      '--only',
      spec.id,
      '--tier',
      options.tier,
      '--out-dir',
      options.outDir,
      '--report',
      workerReport,
    ];
    if (options.sourceDir) childArgs.push('--source-dir', options.sourceDir);
    if (options.skipPortraits) childArgs.push('--skip-portraits');
    if (options.skipExisting) childArgs.push('--skip-existing');
    if (options.keepRaw) childArgs.push('--keep-raw');
    try {
      await new Promise((resolve, reject) => {
        const child = spawn(process.execPath, childArgs, {
          cwd: process.cwd(),
          stdio: 'inherit',
        });
        child.on('error', reject);
        child.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`Worker for "${spec.id}" exited with code ${code}`));
        });
      });
    } finally {
      fs.rmSync(workerReport, { force: true });
    }
    completed += 1;
    console.log(`[Progress] Completed ${completed}/${pendingSpecs.length} (${spec.id})`);
  }

  async function workerLoop() {
    while (cursor < pendingSpecs.length) {
      const spec = pendingSpecs[cursor++];
      try {
        await spawnSingle(spec);
      } catch (err) {
        failures.push(err instanceof Error ? err.message : String(err));
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(options.concurrency, pendingSpecs.length) }, () => workerLoop())
  );

  if (failures.length > 0) {
    throw new Error(`Chapter 4 parallel build failed:\n - ${failures.join('\n - ')}`);
  }

  verifyExistingAssets(specs, options);
}

function fileURLToPathCompat(url) {
  return decodeURIComponent(new URL(url).pathname);
}

async function runBuild(specs, options) {
  const tiers = activeTiers(options.tier);
  const skipHigh = !tiers.includes('high');
  const skipLite = !tiers.includes('lite');

  if (options.dryRun) {
    console.log(`\n[DRY RUN] Chapter 4 Asset Build Plan (${specs.length} assets · tier=${options.tier})`);
    console.log(`Source: ${options.sourceDir ? `local directory (${options.sourceDir})` : `Google Drive (${CHAPTER4_DRIVE_FOLDER_URL})`}`);
    console.log(`Output: ${options.outDir}`);
    console.log(`Low-End Target: ${DELL_E5430_LITE_PROFILE.deviceLabel}\n`);
    for (const spec of specs) {
      console.log(
        `- ${spec.id.padEnd(30)} [${spec.role.padEnd(9)}] drive=${spec.driveGlbId} | ` +
          `High=${spec.highTris}t/${spec.highAlbedo}px | Lite=${spec.liteTris}t/${spec.liteAlbedo}px`
      );
    }
    return;
  }

  fs.mkdirSync(options.outDir, { recursive: true });

  if (options.concurrency > 1 && specs.length > 1) {
    await runParallelWorkers(specs, options);
    return;
  }

  fs.mkdirSync(RAW_TMP_DIR, { recursive: true });

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
    const alreadyBuilt = options.skipExisting && isAssetAlreadyBuilt(spec, tiers, options.outDir);
    let sourceBytes = 0;
    let sourceFileName = spec.match;

    if (alreadyBuilt) {
      console.log(`[${spec.id}] Already built & verified — skipping download.`);
    } else {
      let rawPath;
      let shouldDeleteRaw = false;

      if (options.sourceDir) {
        rawPath = findLocalSource(options.sourceDir, spec);
        if (!rawPath) {
          throw new Error(`Missing local source GLB for "${spec.id}" in ${options.sourceDir}`);
        }
        sourceBytes = fs.statSync(rawPath).size;
        sourceFileName = path.basename(rawPath);
      } else {
        rawPath = path.join(RAW_TMP_DIR, `${spec.id}.glb`);
        if (!fs.existsSync(rawPath)) {
          sourceBytes = downloadDriveFile(spec.driveGlbId, rawPath, spec.id);
        } else {
          sourceBytes = fs.statSync(rawPath).size;
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
          chapterPrefix: 'Ch4',
          generatorChapterLabel: 'Chapter 4',
        });
      } finally {
        if (shouldDeleteRaw) {
          fs.rmSync(rawPath, { force: true });
        }
      }
    }

    if (!options.skipPortraits && spec.drivePngId) {
      buildPortraitWebp(spec, options.outDir);
    }

    report.assets[spec.id] = {
      role: spec.role,
      sourceFileName,
      sourceBytes,
      portraitPresent: fs.existsSync(path.join(options.outDir, `${spec.id}.webp`)),
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

  if (!options.keepRaw) {
    fs.rmSync(RAW_TMP_DIR, { recursive: true, force: true });
  }

  const packCheck = validateChapter4Pack(variantEntries, options.tier);
  report.pack = packCheck;

  if (options.updateManifest && manifestUpdates.length > 0 && packCheck.ok) {
    const currentManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    const synced = syncChapter4ManifestEntries(currentManifest, manifestUpdates);
    fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(synced.manifest, null, 2)}\n`);
    console.log(
      `\nManifest synced (${MANIFEST_PATH}): ${synced.updated} updated, ${synced.inserted} inserted.`
    );
  }

  fs.mkdirSync(path.dirname(options.reportPath), { recursive: true });
  fs.writeFileSync(options.reportPath, JSON.stringify(report, null, 2));
  console.log(`\nSaved Chapter 4 geometry & E5430 compatibility report to ${options.reportPath}`);

  if (!packCheck.ok) {
    throw new Error(
      `Chapter 4 build failed hardware budget validation (${packCheck.violations.length} violation(s)):\n - ${packCheck.violations.join('\n - ')}`
    );
  }
}

export async function main(argv = process.argv.slice(2)) {
  const options = parseChapter4CliArgs(argv);
  if (options.help) {
    printHelp();
    return;
  }
  const specs = resolveSelectedChapter4Specs(options.ids);
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

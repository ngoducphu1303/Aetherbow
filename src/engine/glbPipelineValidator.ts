/**
 * GLB Asset Pipeline Health & Dell Latitude E5430 Lite Budget Validator.
 * Audits scripts/glb-manifest.json deterministically for High/Lite pairing,
 * per-chapter memory budgets, duplicate entries, and legacy junk paths.
 */

export interface GlbManifestFileEntry {
  path: string;
  size: number;
  runtime?: boolean;
}

export interface GlbManifestDocument {
  cdnBaseUrl?: string;
  files: GlbManifestFileEntry[];
}

export interface GlbValidationIssue {
  severity: 'critical' | 'warning';
  code:
    | 'empty_manifest'
    | 'duplicate_path'
    | 'invalid_size'
    | 'forbidden_legacy_asset'
    | 'lite_over_e5430_budget'
    | 'missing_lite_pair'
    | 'total_lite_over_budget';
  path: string;
  message: string;
}

export interface GlbChapterSummary {
  chapterLabel: string;
  activeCount: number;
  highCount: number;
  liteCount: number;
  pairedCount: number;
  maxLiteBytes: number;
  totalLiteBytes: number;
}

export interface GlbPipelineValidationReport {
  status: 'healthy' | 'warning' | 'critical';
  e5430Safe: boolean;
  totalManifestFiles: number;
  activeFilesCount: number;
  highCount: number;
  liteCount: number;
  pairedCount: number;
  pairCoveragePct: number;
  maxLiteBytes: number;
  maxLitePath: string | null;
  totalActiveLiteBytes: number;
  chapters: GlbChapterSummary[];
  issues: GlbValidationIssue[];
}

export const E5430_LITE_LIMITS = {
  /** Max allowed size for an individual runtime Lite arena map GLB (2.5 MB). */
  maxLiteMapBytes: 2_621_440,
  /** Max allowed size for an individual runtime Lite skeletal hero GLB (4.0 MB). */
  maxLiteHeroBytes: 4_194_304,
  /** Max allowed size for an individual runtime Lite actor/boss/prop GLB (2.0 MB). */
  maxLiteActorBytes: 2_097_152,
  /** Max allowed aggregate active Lite payload across the entire game (48 MB). */
  maxTotalActiveLiteBytes: 48 * 1024 * 1024,
} as const;

const FORBIDDEN_LEGACY_PATTERNS = [/public\/assets\/mounts\/black-dragon\.glb$/i];

function classifyChapterLabel(filePath: string): string {
  if (/Chương 1\//i.test(filePath)) return 'Chương 1 · Sư Tử';
  if (/Chương 2\//i.test(filePath)) return 'Chương 2 · Bạch Dương';
  if (/Chương 3\//i.test(filePath)) return 'Chương 3 · Kim Ngưu';
  if (/Chương 4\//i.test(filePath)) return 'Chương 4 · Song Tử';
  if (/public\/assets\/heroes\//i.test(filePath)) return 'Kho Tướng Chung';
  return 'Tài Nguyên Khác';
}

function isMapGlb(filePath: string): boolean {
  return /(Map mới|arena|Chương \d+(\s+Lite)?\.glb$)/i.test(filePath);
}

function isHeroLibraryGlb(filePath: string): boolean {
  return /^public\/assets\/heroes\//i.test(filePath);
}

function classifyVariant(filePath: string): 'lite' | 'high' | 'other' {
  if (/(?:[\s_-]lite)\.glb$/i.test(filePath)) return 'lite';
  if (/(?:[\s_-]high)\.glb$/i.test(filePath)) return 'high';
  return 'other';
}

function extractPairKey(filePath: string): string {
  const normalized = filePath.replace(/\\/g, '/');
  // Canonical Chapter 2 Arena High/Lite pair spans Runtime/ and Map mới/
  if (
    /Chương 2\/(?:Map mới\/Aries War-Forge Arena Lite|Runtime\/aries-arena-high)\.glb$/i.test(
      normalized
    )
  ) {
    return 'public/assets/chương 2/aries-arena';
  }
  return normalized
    .replace(/(?:[\s_-](?:high|lite))\.glb$/i, '')
    .replace(/\.glb$/i, '')
    .toLowerCase();
}

export function validateGlbPipelineManifest(
  doc: GlbManifestDocument | null | undefined
): GlbPipelineValidationReport {
  const files = Array.isArray(doc?.files) ? doc.files : [];
  const issues: GlbValidationIssue[] = [];

  if (files.length === 0) {
    issues.push({
      severity: 'critical',
      code: 'empty_manifest',
      path: 'scripts/glb-manifest.json',
      message: 'Manifest GLB rỗng — không có tài nguyên 3D nào được khai báo.',
    });
  }

  const seenPaths = new Set<string>();
  const chapterMap = new Map<
    string,
    {
      activeCount: number;
      highCount: number;
      liteCount: number;
      maxLiteBytes: number;
      totalLiteBytes: number;
      pairMap: Map<string, { hasHigh: boolean; hasLite: boolean; highPath?: string }>;
    }
  >();

  let activeFilesCount = 0;
  let highCount = 0;
  let liteCount = 0;
  let maxLiteBytes = 0;
  let maxLitePath: string | null = null;
  let totalActiveLiteBytes = 0;

  for (const entry of files) {
    const rawPath = String(entry?.path ?? '').trim().replace(/\\/g, '/');
    const size = Number(entry?.size ?? 0);

    if (!rawPath || !rawPath.toLowerCase().endsWith('.glb')) {
      issues.push({
        severity: 'critical',
        code: 'invalid_size',
        path: rawPath || '(trống)',
        message: `Đường dẫn GLB không hợp lệ: "${rawPath}".`,
      });
      continue;
    }

    if (seenPaths.has(rawPath)) {
      issues.push({
        severity: 'critical',
        code: 'duplicate_path',
        path: rawPath,
        message: `Đường dẫn bị trùng lặp trong manifest: ${rawPath}`,
      });
    } else {
      seenPaths.add(rawPath);
    }

    if (!Number.isFinite(size) || size <= 0) {
      issues.push({
        severity: 'critical',
        code: 'invalid_size',
        path: rawPath,
        message: `Kích thước tệp không hợp lệ (${size} bytes): ${rawPath}`,
      });
    }

    if (!entry.runtime) continue;

    for (const pattern of FORBIDDEN_LEGACY_PATTERNS) {
      if (pattern.test(rawPath)) {
        issues.push({
          severity: 'critical',
          code: 'forbidden_legacy_asset',
          path: rawPath,
          message: `Phát hiện tài nguyên cũ thừa đang được đánh dấu runtime: ${rawPath}`,
        });
      }
    }

    activeFilesCount += 1;
    const chapterLabel = classifyChapterLabel(rawPath);
    let bucket = chapterMap.get(chapterLabel);
    if (!bucket) {
      bucket = {
        activeCount: 0,
        highCount: 0,
        liteCount: 0,
        maxLiteBytes: 0,
        totalLiteBytes: 0,
        pairMap: new Map(),
      };
      chapterMap.set(chapterLabel, bucket);
    }

    bucket.activeCount += 1;
    const variant = classifyVariant(rawPath);
    const pairKey = extractPairKey(rawPath);
    const pairRec = bucket.pairMap.get(pairKey) ?? { hasHigh: false, hasLite: false };

    if (variant === 'lite') {
      liteCount += 1;
      bucket.liteCount += 1;
      totalActiveLiteBytes += size;
      bucket.totalLiteBytes += size;
      if (size > bucket.maxLiteBytes) bucket.maxLiteBytes = size;
      if (size > maxLiteBytes) {
        maxLiteBytes = size;
        maxLitePath = rawPath;
      }
      pairRec.hasLite = true;

      const limit = isHeroLibraryGlb(rawPath)
        ? E5430_LITE_LIMITS.maxLiteHeroBytes
        : isMapGlb(rawPath)
        ? E5430_LITE_LIMITS.maxLiteMapBytes
        : E5430_LITE_LIMITS.maxLiteActorBytes;
      if (size > limit) {
        issues.push({
          severity: 'critical',
          code: 'lite_over_e5430_budget',
          path: rawPath,
          message: `Bản Lite vượt trần Dell E5430 (${(size / 1_048_576).toFixed(2)} MB > ${(limit / 1_048_576).toFixed(2)} MB): ${rawPath}`,
        });
      }
    } else if (variant === 'high') {
      highCount += 1;
      bucket.highCount += 1;
      pairRec.hasHigh = true;
      pairRec.highPath = rawPath;
    } else {
      // Unlabeled active runtime file (e.g. Chương 1.glb paired with Chương 1 Lite.glb)
      highCount += 1;
      bucket.highCount += 1;
      pairRec.hasHigh = true;
      pairRec.highPath = rawPath;
    }

    bucket.pairMap.set(pairKey, pairRec);
  }

  let pairedCount = 0;
  let totalHighGroups = 0;
  const chapters: GlbChapterSummary[] = [];

  for (const [chapterLabel, bucket] of chapterMap.entries()) {
    let chapterPaired = 0;
    for (const pair of bucket.pairMap.values()) {
      if (pair.hasHigh && pair.hasLite) {
        chapterPaired += 1;
        pairedCount += 1;
        totalHighGroups += 1;
      } else if (pair.hasHigh && !pair.hasLite) {
        totalHighGroups += 1;
        issues.push({
          severity: 'warning',
          code: 'missing_lite_pair',
          path: pair.highPath ?? chapterLabel,
          message: `Tệp High hoạt động chưa có đối cặp Lite tương ứng: ${pair.highPath ?? chapterLabel}`,
        });
      }
    }
    chapters.push({
      chapterLabel,
      activeCount: bucket.activeCount,
      highCount: bucket.highCount,
      liteCount: bucket.liteCount,
      pairedCount: chapterPaired,
      maxLiteBytes: bucket.maxLiteBytes,
      totalLiteBytes: bucket.totalLiteBytes,
    });
  }

  chapters.sort((a, b) => a.chapterLabel.localeCompare(b.chapterLabel, 'vi'));

  if (totalActiveLiteBytes > E5430_LITE_LIMITS.maxTotalActiveLiteBytes) {
    issues.push({
      severity: 'critical',
      code: 'total_lite_over_budget',
      path: 'scripts/glb-manifest.json',
      message: `Tổng gói Lite vượt trần ${(E5430_LITE_LIMITS.maxTotalActiveLiteBytes / 1_048_576).toFixed(0)} MB (${(totalActiveLiteBytes / 1_048_576).toFixed(2)} MB).`,
    });
  }

  const pairCoveragePct =
    totalHighGroups > 0 ? Number(((pairedCount / totalHighGroups) * 100).toFixed(1)) : 100;

  const hasCritical = issues.some((i) => i.severity === 'critical');
  const hasWarning = issues.some((i) => i.severity === 'warning');
  const status: GlbPipelineValidationReport['status'] = hasCritical
    ? 'critical'
    : hasWarning
    ? 'warning'
    : 'healthy';

  return {
    status,
    e5430Safe: !hasCritical,
    totalManifestFiles: files.length,
    activeFilesCount,
    highCount,
    liteCount,
    pairedCount,
    pairCoveragePct,
    maxLiteBytes,
    maxLitePath,
    totalActiveLiteBytes,
    chapters,
    issues,
  };
}

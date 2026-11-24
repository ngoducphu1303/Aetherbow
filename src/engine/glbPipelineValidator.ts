export interface GlbManifestEntry {
  path: string;
  size: number;
  runtime?: boolean;
}

export interface GlbManifestDocument {
  cdnBaseUrl?: string;
  files: GlbManifestEntry[];
}

export interface GlbPipelineIssue {
  severity: 'warning' | 'critical';
  code:
    | 'oversized_lite_entity'
    | 'oversized_lite_map'
    | 'missing_lite_pair'
    | 'missing_high_pair'
    | 'malformed_path'
    | 'zero_byte_file';
  path: string;
  message: string;
}

export interface GlbChapterHealthRow {
  chapterLabel: string;
  activeCount: number;
  highCount: number;
  liteCount: number;
  pairedCount: number;
  maxLiteBytes: number;
  totalLiteBytes: number;
}

export interface GlbPipelineHealthReport {
  status: 'healthy' | 'warning' | 'critical';
  e5430Safe: boolean;
  totalManifestFiles: number;
  activeFilesCount: number;
  inactiveFilesCount: number;
  highCount: number;
  liteCount: number;
  pairedCount: number;
  pairCoveragePct: number;
  maxLiteBytes: number;
  maxLitePath: string | null;
  totalActiveLiteBytes: number;
  entityLiteCapBytes: number;
  mapLiteCapBytes: number;
  chapters: GlbChapterHealthRow[];
  issues: GlbPipelineIssue[];
}

/** Dell Latitude E5430 (Intel HD 4000 / 4–8GB RAM) Lite GLB size ceilings */
export const E5430_ENTITY_LITE_WARN_BYTES = 2_621_440; // 2.5 MB
export const E5430_ENTITY_LITE_CRIT_BYTES = 4_194_304; // 4.0 MB
export const E5430_MAP_LITE_WARN_BYTES = 6_291_456; // 6.0 MB
export const E5430_MAP_LITE_CRIT_BYTES = 10_485_760; // 10.0 MB

function detectChapterLabel(normalizedPath: string): string {
  const m = normalizedPath.match(/Chương\s+(\d+)/i);
  if (m) return `Chương ${m[1]}`;
  return 'Khác';
}

function isMapAssetPath(normalizedPath: string): boolean {
  const lower = normalizedPath.toLowerCase();
  return (
    lower.includes('/map/') ||
    lower.includes('arena') ||
    lower.includes('sanctum') ||
    lower.includes('citadel') ||
    lower.includes('city') ||
    lower.includes('environment') ||
    lower.includes('đấu trường')
  );
}

function classifyVariant(normalizedPath: string): {
  variant: 'high' | 'lite' | 'neutral';
  pairKey: string | null;
} {
  if (/([ _-])high\.glb$/i.test(normalizedPath)) {
    return {
      variant: 'high',
      pairKey: normalizedPath.replace(/([ _-])high\.glb$/i, '').toLowerCase(),
    };
  }
  if (/([ _-])lite\.glb$/i.test(normalizedPath)) {
    return {
      variant: 'lite',
      pairKey: normalizedPath.replace(/([ _-])lite\.glb$/i, '').toLowerCase(),
    };
  }
  return { variant: 'neutral', pairKey: null };
}

/**
 * Pure GLB High/Lite Pipeline Health Validator (Phase 4 Pillar 4).
 * Audits scripts/glb-manifest.json for High/Lite pairing coverage, Dell Latitude E5430
 * Lite memory caps, path hygiene, and per-chapter breakdown.
 */
export function validateGlbPipelineManifest(
  manifest: GlbManifestDocument | null | undefined
): GlbPipelineHealthReport {
  const rawFiles = Array.isArray(manifest?.files) ? manifest.files : [];
  const issues: GlbPipelineIssue[] = [];

  const activeEntries: GlbManifestEntry[] = [];
  let inactiveFilesCount = 0;

  for (const entry of rawFiles) {
    if (!entry || typeof entry.path !== 'string') continue;
    const normPath = entry.path.normalize('NFC').replace(/\\/g, '/');
    const isActive = entry.runtime !== false;
    if (!isActive) {
      inactiveFilesCount += 1;
      continue;
    }
    activeEntries.push({ ...entry, path: normPath });
  }

  const highByKey = new Map<string, GlbManifestEntry>();
  const liteByKey = new Map<string, GlbManifestEntry>();
  const chapterMap = new Map<
    string,
    {
      activeCount: number;
      highCount: number;
      liteCount: number;
      highKeys: Set<string>;
      liteKeys: Set<string>;
      maxLiteBytes: number;
      totalLiteBytes: number;
    }
  >();

  let highCount = 0;
  let liteCount = 0;
  let maxLiteBytes = 0;
  let maxLitePath: string | null = null;
  let totalActiveLiteBytes = 0;

  for (const entry of activeEntries) {
    const p = entry.path;
    const size = typeof entry.size === 'number' && Number.isFinite(entry.size) ? entry.size : 0;

    if (p.includes('..') || !p.toLowerCase().endsWith('.glb') || !p.startsWith('public/assets/')) {
      issues.push({
        severity: 'critical',
        code: 'malformed_path',
        path: p,
        message: `Đường dẫn GLB không hợp chuẩn: ${p}`,
      });
    }
    if (size <= 0) {
      issues.push({
        severity: 'critical',
        code: 'zero_byte_file',
        path: p,
        message: `Tệp GLB rỗng (0 byte): ${p}`,
      });
    }

    const chLabel = detectChapterLabel(p);
    let chRow = chapterMap.get(chLabel);
    if (!chRow) {
      chRow = {
        activeCount: 0,
        highCount: 0,
        liteCount: 0,
        highKeys: new Set<string>(),
        liteKeys: new Set<string>(),
        maxLiteBytes: 0,
        totalLiteBytes: 0,
      };
      chapterMap.set(chLabel, chRow);
    }
    chRow.activeCount += 1;

    const { variant, pairKey } = classifyVariant(p);
    if (variant === 'high' && pairKey) {
      highCount += 1;
      chRow.highCount += 1;
      highByKey.set(pairKey, entry);
      chRow.highKeys.add(pairKey);
    } else if (variant === 'lite' && pairKey) {
      liteCount += 1;
      chRow.liteCount += 1;
      liteByKey.set(pairKey, entry);
      chRow.liteKeys.add(pairKey);
      totalActiveLiteBytes += size;
      chRow.totalLiteBytes += size;
      if (size > chRow.maxLiteBytes) chRow.maxLiteBytes = size;
      if (size > maxLiteBytes) {
        maxLiteBytes = size;
        maxLitePath = p;
      }

      const isMap = isMapAssetPath(p);
      const warnCap = isMap ? E5430_MAP_LITE_WARN_BYTES : E5430_ENTITY_LITE_WARN_BYTES;
      const critCap = isMap ? E5430_MAP_LITE_CRIT_BYTES : E5430_ENTITY_LITE_CRIT_BYTES;
      if (size > critCap) {
        issues.push({
          severity: 'critical',
          code: isMap ? 'oversized_lite_map' : 'oversized_lite_entity',
          path: p,
          message: `Bản Lite vượt trần an toàn E5430 (${(size / 1048576).toFixed(2)} MB > ${(
            critCap / 1048576
          ).toFixed(1)} MB).`,
        });
      } else if (size > warnCap) {
        issues.push({
          severity: 'warning',
          code: isMap ? 'oversized_lite_map' : 'oversized_lite_entity',
          path: p,
          message: `Bản Lite sát ngưỡng E5430 (${(size / 1048576).toFixed(2)} MB > ${(
            warnCap / 1048576
          ).toFixed(1)} MB khuyến nghị).`,
        });
      }
    }
  }

  let pairedCount = 0;
  for (const [key, highEntry] of highByKey.entries()) {
    if (liteByKey.has(key)) {
      pairedCount += 1;
    } else {
      issues.push({
        severity: 'warning',
        code: 'missing_lite_pair',
        path: highEntry.path,
        message: `Thiếu cặp bản Lite cho model High: ${highEntry.path}`,
      });
    }
  }
  for (const [key, liteEntry] of liteByKey.entries()) {
    if (!highByKey.has(key)) {
      issues.push({
        severity: 'warning',
        code: 'missing_high_pair',
        path: liteEntry.path,
        message: `Bản Lite chưa có cặp High tương ứng: ${liteEntry.path}`,
      });
    }
  }

  const totalUniquePairSlots = new Set([...highByKey.keys(), ...liteByKey.keys()]).size;
  const pairCoveragePct =
    totalUniquePairSlots > 0 ? Math.round((pairedCount / totalUniquePairSlots) * 1000) / 10 : 100;

  const chapters: GlbChapterHealthRow[] = [...chapterMap.entries()]
    .map(([chapterLabel, row]) => {
      let chPaired = 0;
      for (const k of row.highKeys) {
        if (row.liteKeys.has(k)) chPaired += 1;
      }
      return {
        chapterLabel,
        activeCount: row.activeCount,
        highCount: row.highCount,
        liteCount: row.liteCount,
        pairedCount: chPaired,
        maxLiteBytes: row.maxLiteBytes,
        totalLiteBytes: row.totalLiteBytes,
      };
    })
    .sort((a, b) => {
      if (a.chapterLabel === 'Khác') return 1;
      if (b.chapterLabel === 'Khác') return -1;
      return a.chapterLabel.localeCompare(b.chapterLabel, 'vi', { numeric: true });
    });

  const hasCritical = issues.some((i) => i.severity === 'critical');
  const hasWarning = issues.some((i) => i.severity === 'warning');
  const status: 'healthy' | 'warning' | 'critical' = hasCritical
    ? 'critical'
    : hasWarning
    ? 'warning'
    : 'healthy';
  const e5430Safe = !issues.some(
    (i) =>
      i.severity === 'critical' &&
      (i.code === 'oversized_lite_entity' || i.code === 'oversized_lite_map')
  );

  return {
    status,
    e5430Safe,
    totalManifestFiles: rawFiles.length,
    activeFilesCount: activeEntries.length,
    inactiveFilesCount,
    highCount,
    liteCount,
    pairedCount,
    pairCoveragePct,
    maxLiteBytes,
    maxLitePath,
    totalActiveLiteBytes,
    entityLiteCapBytes: E5430_ENTITY_LITE_WARN_BYTES,
    mapLiteCapBytes: E5430_MAP_LITE_WARN_BYTES,
    chapters,
    issues,
  };
}

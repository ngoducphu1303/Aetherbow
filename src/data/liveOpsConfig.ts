export interface LiveOpsConfig {
  configId: 'global';
  version: number;
  goldRewardMult: number;
  gemRewardMult: number;
  forgeShardMult: number;
  enemyHpMult: number;
  enemyDmgMult: number;
  chestEpicRateBonus: number;
  pitySoftCapOffset: number;
  weekendBlitzEnabled: boolean;
  doubleDropEventActive: boolean;
  announcementBanner: string;
  maintenanceNotice: string;
  balanceNote: string;
  updatedAtMs: number;
  updatedByEmail: string;
}

export interface LiveOpsSnapshotEntry {
  snapshotId: string;
  savedAtMs: number;
  label: string;
  source: 'firestore' | 'server' | 'local';
  config: LiveOpsConfig;
}

export interface LiveOpsDiffItem {
  field: string;
  label: string;
  before: string;
  after: string;
}

export const MAX_LIVEOPS_SNAPSHOTS = 10;

export const LIVEOPS_BOUNDS = {
  goldRewardMult: { min: 0.5, max: 3.0 },
  gemRewardMult: { min: 0.5, max: 2.5 },
  forgeShardMult: { min: 0.5, max: 3.0 },
  enemyHpMult: { min: 0.6, max: 2.0 },
  enemyDmgMult: { min: 0.6, max: 2.0 },
  chestEpicRateBonus: { min: -0.05, max: 0.2 },
  pitySoftCapOffset: { min: -5, max: 5 },
  version: { min: 1, max: 100000 },
} as const;

export const DEFAULT_LIVEOPS_CONFIG: LiveOpsConfig = {
  configId: 'global',
  version: 1,
  goldRewardMult: 1.0,
  gemRewardMult: 1.0,
  forgeShardMult: 1.0,
  enemyHpMult: 1.0,
  enemyDmgMult: 1.0,
  chestEpicRateBonus: 0,
  pitySoftCapOffset: 0,
  weekendBlitzEnabled: false,
  doubleDropEventActive: false,
  announcementBanner: '',
  maintenanceNotice: '',
  balanceNote: 'Cân bằng tiêu chuẩn Mùa Tinh Giới.',
  updatedAtMs: 0,
  updatedByEmail: 'Hệ thống',
};

function clampNum(raw: unknown, min: number, max: number, fallback: number, digits = 2): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  const clamped = Math.max(min, Math.min(max, n));
  const factor = Math.pow(10, digits);
  return Math.round(clamped * factor) / factor;
}

function clampInt(raw: unknown, min: number, max: number, fallback: number): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function cleanText(raw: unknown, maxLen: number, fallback = ''): string {
  if (typeof raw !== 'string') return fallback;
  return raw.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maxLen);
}

export function sanitizeLiveOpsConfig(raw: Partial<LiveOpsConfig> | Record<string, unknown> | null | undefined): LiveOpsConfig {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    configId: 'global',
    version: clampInt(src.version, LIVEOPS_BOUNDS.version.min, LIVEOPS_BOUNDS.version.max, DEFAULT_LIVEOPS_CONFIG.version),
    goldRewardMult: clampNum(src.goldRewardMult, LIVEOPS_BOUNDS.goldRewardMult.min, LIVEOPS_BOUNDS.goldRewardMult.max, 1.0, 2),
    gemRewardMult: clampNum(src.gemRewardMult, LIVEOPS_BOUNDS.gemRewardMult.min, LIVEOPS_BOUNDS.gemRewardMult.max, 1.0, 2),
    forgeShardMult: clampNum(src.forgeShardMult, LIVEOPS_BOUNDS.forgeShardMult.min, LIVEOPS_BOUNDS.forgeShardMult.max, 1.0, 2),
    enemyHpMult: clampNum(src.enemyHpMult, LIVEOPS_BOUNDS.enemyHpMult.min, LIVEOPS_BOUNDS.enemyHpMult.max, 1.0, 2),
    enemyDmgMult: clampNum(src.enemyDmgMult, LIVEOPS_BOUNDS.enemyDmgMult.min, LIVEOPS_BOUNDS.enemyDmgMult.max, 1.0, 2),
    chestEpicRateBonus: clampNum(src.chestEpicRateBonus, LIVEOPS_BOUNDS.chestEpicRateBonus.min, LIVEOPS_BOUNDS.chestEpicRateBonus.max, 0, 3),
    pitySoftCapOffset: clampInt(src.pitySoftCapOffset, LIVEOPS_BOUNDS.pitySoftCapOffset.min, LIVEOPS_BOUNDS.pitySoftCapOffset.max, 0),
    weekendBlitzEnabled: Boolean(src.weekendBlitzEnabled),
    doubleDropEventActive: Boolean(src.doubleDropEventActive),
    announcementBanner: cleanText(src.announcementBanner, 180, ''),
    maintenanceNotice: cleanText(src.maintenanceNotice, 180, ''),
    balanceNote: cleanText(src.balanceNote, 240, DEFAULT_LIVEOPS_CONFIG.balanceNote),
    updatedAtMs:
      typeof src.updatedAtMs === 'number' && Number.isFinite(src.updatedAtMs) && src.updatedAtMs >= 0
        ? Math.floor(src.updatedAtMs)
        : 0,
    updatedByEmail: cleanText(src.updatedByEmail ?? src.updatedByLabel, 32, 'Admin LiveOps') || 'Admin LiveOps',
  };
}

export function applyLiveOpsRewardMultipliers(
  rewards: { gold: number; gems: number; forgeShards?: number },
  config: LiveOpsConfig
): { gold: number; gems: number; forgeShards: number } {
  const safeCfg = sanitizeLiveOpsConfig(config);
  const doubleDropBoost = safeCfg.doubleDropEventActive ? 1.25 : 1.0;
  const weekendGoldBoost = safeCfg.weekendBlitzEnabled ? 1.15 : 1.0;

  const gold = Math.max(0, Math.round(Math.max(0, rewards.gold) * safeCfg.goldRewardMult * weekendGoldBoost));
  const gems = Math.max(0, Math.round(Math.max(0, rewards.gems) * safeCfg.gemRewardMult));
  const forgeShards = Math.max(
    0,
    Math.round(Math.max(0, rewards.forgeShards ?? 0) * safeCfg.forgeShardMult * doubleDropBoost)
  );
  return { gold, gems, forgeShards };
}

// ============================================================================
// PHASE 4 PILLAR 5: LIVEOPS SNAPSHOT HISTORY & 1-CLICK ROLLBACK (PURE)
// ============================================================================

const NUMERIC_DIFF_FIELDS: Array<{
  key: keyof Pick<
    LiveOpsConfig,
    | 'goldRewardMult'
    | 'gemRewardMult'
    | 'forgeShardMult'
    | 'enemyHpMult'
    | 'enemyDmgMult'
    | 'chestEpicRateBonus'
    | 'pitySoftCapOffset'
  >;
  label: string;
  format: (v: number) => string;
}> = [
  { key: 'goldRewardMult', label: 'Hệ số Vàng', format: (v) => `×${v.toFixed(2)}` },
  { key: 'gemRewardMult', label: 'Hệ số Ngọc', format: (v) => `×${v.toFixed(2)}` },
  { key: 'forgeShardMult', label: 'Mảnh Rèn', format: (v) => `×${v.toFixed(2)}` },
  { key: 'enemyHpMult', label: 'HP Quái/Boss', format: (v) => `×${v.toFixed(2)}` },
  { key: 'enemyDmgMult', label: 'Sát thương Quái', format: (v) => `×${v.toFixed(2)}` },
  {
    key: 'chestEpicRateBonus',
    label: 'Tỷ lệ Sử Thi Rương',
    format: (v) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`,
  },
  {
    key: 'pitySoftCapOffset',
    label: 'Dịch chuyển Pity',
    format: (v) => `${v >= 0 ? '+' : ''}${v}`,
  },
];

export function computeLiveOpsConfigDiff(
  current: LiveOpsConfig,
  target: LiveOpsConfig
): LiveOpsDiffItem[] {
  const a = sanitizeLiveOpsConfig(current);
  const b = sanitizeLiveOpsConfig(target);
  const diffs: LiveOpsDiffItem[] = [];

  for (const spec of NUMERIC_DIFF_FIELDS) {
    const beforeVal = a[spec.key];
    const afterVal = b[spec.key];
    if (Math.abs(beforeVal - afterVal) > 0.0005) {
      diffs.push({
        field: spec.key,
        label: spec.label,
        before: spec.format(beforeVal),
        after: spec.format(afterVal),
      });
    }
  }

  if (a.weekendBlitzEnabled !== b.weekendBlitzEnabled) {
    diffs.push({
      field: 'weekendBlitzEnabled',
      label: 'Tăng tốc Cuối tuần',
      before: a.weekendBlitzEnabled ? 'Bật' : 'Tắt',
      after: b.weekendBlitzEnabled ? 'Bật' : 'Tắt',
    });
  }
  if (a.doubleDropEventActive !== b.doubleDropEventActive) {
    diffs.push({
      field: 'doubleDropEventActive',
      label: 'Nhân đôi Rơi đồ',
      before: a.doubleDropEventActive ? 'Bật' : 'Tắt',
      after: b.doubleDropEventActive ? 'Bật' : 'Tắt',
    });
  }
  if (a.announcementBanner !== b.announcementBanner) {
    diffs.push({
      field: 'announcementBanner',
      label: 'Thông báo sự kiện',
      before: a.announcementBanner || '(Trống)',
      after: b.announcementBanner || '(Trống)',
    });
  }
  if (a.maintenanceNotice !== b.maintenanceNotice) {
    diffs.push({
      field: 'maintenanceNotice',
      label: 'Cảnh báo bảo trì',
      before: a.maintenanceNotice || '(Trống)',
      after: b.maintenanceNotice || '(Trống)',
    });
  }

  return diffs;
}

export function sanitizeLiveOpsSnapshotHistory(raw: unknown): LiveOpsSnapshotEntry[] {
  if (!Array.isArray(raw)) return [];
  const valid: LiveOpsSnapshotEntry[] = [];
  const seenIds = new Set<string>();
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const cfg = sanitizeLiveOpsConfig(rec.config as Record<string, unknown>);
    const savedAtMs =
      typeof rec.savedAtMs === 'number' && Number.isFinite(rec.savedAtMs) && rec.savedAtMs > 0
        ? Math.floor(rec.savedAtMs)
        : cfg.updatedAtMs || Date.now();
    const snapshotId =
      typeof rec.snapshotId === 'string' && rec.snapshotId.trim().length > 0
        ? rec.snapshotId.trim().slice(0, 64)
        : `v${cfg.version}_${savedAtMs}`;
    if (seenIds.has(snapshotId)) continue;
    seenIds.add(snapshotId);
    const sourceRaw = rec.source;
    const source: 'firestore' | 'server' | 'local' =
      sourceRaw === 'firestore' || sourceRaw === 'server' ? sourceRaw : 'local';
    valid.push({
      snapshotId,
      savedAtMs,
      label: cleanText(rec.label, 96, `Bản v${cfg.version}`) || `Bản v${cfg.version}`,
      source,
      config: cfg,
    });
  }
  valid.sort((a, b) => b.savedAtMs - a.savedAtMs || b.config.version - a.config.version);
  return valid.slice(0, MAX_LIVEOPS_SNAPSHOTS);
}

export function recordLiveOpsSnapshot(
  history: LiveOpsSnapshotEntry[],
  publishedConfig: LiveOpsConfig,
  options?: {
    source?: 'firestore' | 'server' | 'local';
    label?: string;
    nowMs?: number;
  }
): LiveOpsSnapshotEntry[] {
  const safeCfg = sanitizeLiveOpsConfig(publishedConfig);
  const savedAtMs = options?.nowMs ?? (safeCfg.updatedAtMs > 0 ? safeCfg.updatedAtMs : Date.now());
  const source = options?.source ?? 'local';
  const entry: LiveOpsSnapshotEntry = {
    snapshotId: `v${safeCfg.version}_${savedAtMs}`,
    savedAtMs,
    label:
      cleanText(options?.label, 96, '') ||
      (safeCfg.balanceNote ? `v${safeCfg.version} · ${safeCfg.balanceNote.slice(0, 56)}` : `Bản v${safeCfg.version}`),
    source,
    config: safeCfg,
  };
  const filtered = sanitizeLiveOpsSnapshotHistory(history).filter(
    (s) => s.snapshotId !== entry.snapshotId
  );
  return [entry, ...filtered].slice(0, MAX_LIVEOPS_SNAPSHOTS);
}

/**
 * Builds a validated rollback LiveOpsConfig from a historical snapshot,
 * strictly incrementing version monotonically (`current.version + 1`) so
 * existing Firestore security rules (`incoming().version >= existing().version`)
 * accept the publish cleanly and all live clients immediately converge.
 */
export function buildRollbackLiveOpsConfig(
  currentActive: LiveOpsConfig,
  snapshot: LiveOpsSnapshotEntry,
  options?: {
    actorLabel?: string;
    nowMs?: number;
  }
): LiveOpsConfig {
  const cur = sanitizeLiveOpsConfig(currentActive);
  const target = sanitizeLiveOpsConfig(snapshot.config);
  const nextVersion = Math.min(LIVEOPS_BOUNDS.version.max, Math.max(cur.version + 1, target.version + 1));
  const actor = cleanText(options?.actorLabel, 32, 'Admin LiveOps') || 'Admin LiveOps';
  const baseNote = target.balanceNote || 'Cấu hình ổn định';
  const rollbackNote = cleanText(`Khôi phục từ v${target.version}: ${baseNote}`, 240);
  return sanitizeLiveOpsConfig({
    ...target,
    configId: 'global',
    version: nextVersion,
    balanceNote: rollbackNote,
    updatedAtMs: options?.nowMs ?? Date.now(),
    updatedByEmail: actor,
  });
}

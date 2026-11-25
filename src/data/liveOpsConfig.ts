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
  /** Optional UTC epoch ms when timed event modifiers activate (0 = always active). */
  scheduledStartMs: number;
  /** Optional UTC epoch ms when timed event modifiers expire (0 = no auto-expiry). */
  scheduledEndMs: number;
  announcementBanner: string;
  maintenanceNotice: string;
  balanceNote: string;
  updatedAtMs: number;
  updatedByEmail: string;
}

export interface LiveOpsPreset {
  id: string;
  name: string;
  description: string;
  patch: Partial<LiveOpsConfig>;
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

export type LiveOpsScheduleStatus = 'always_on' | 'upcoming' | 'active' | 'expired';

export interface EffectiveLiveOpsResolution {
  config: LiveOpsConfig;
  scheduleStatus: LiveOpsScheduleStatus;
  remainingMs: number | null;
}

export const VERIFIED_LIVEOPS_ADMIN_EMAIL = 'ngoducphu1303@gmail.com';
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
  maxBannerLen: 180,
  maxNoteLen: 240,
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
  scheduledStartMs: 0,
  scheduledEndMs: 0,
  announcementBanner: '',
  maintenanceNotice: '',
  balanceNote: 'Cân bằng tiêu chuẩn Mùa Tinh Giới.',
  updatedAtMs: 0,
  updatedByEmail: 'Hệ thống',
};

export const LIVEOPS_PRESETS: readonly LiveOpsPreset[] = [
  {
    id: 'standard_season',
    name: 'Mùa Tiêu Chuẩn',
    description: 'Khôi phục toàn bộ hệ số thưởng và quái về mức 1.0x chuẩn cân bằng.',
    patch: {
      goldRewardMult: 1.0,
      gemRewardMult: 1.0,
      forgeShardMult: 1.0,
      enemyHpMult: 1.0,
      enemyDmgMult: 1.0,
      chestEpicRateBonus: 0,
      pitySoftCapOffset: 0,
      weekendBlitzEnabled: false,
      doubleDropEventActive: false,
      scheduledStartMs: 0,
      scheduledEndMs: 0,
      announcementBanner: '',
      balanceNote: 'Cấu hình tiêu chuẩn Mùa Tinh Giới.',
    },
  },
  {
    id: 'weekend_double_drop',
    name: 'Cuối Tuần Nhân Đôi Rơi Đồ',
    description: '+25% Vàng, +50% Mảnh Rèn, kích hoạt Tăng tốc Cuối tuần & Nhân đôi Rơi đồ.',
    patch: {
      goldRewardMult: 1.25,
      gemRewardMult: 1.1,
      forgeShardMult: 1.5,
      enemyHpMult: 1.0,
      enemyDmgMult: 1.0,
      chestEpicRateBonus: 0.03,
      pitySoftCapOffset: -1,
      weekendBlitzEnabled: true,
      doubleDropEventActive: true,
      announcementBanner: 'Sự Kiện Cuối Tuần: +25% Vàng & Nhân Đôi Mảnh Rèn Tinh Giới!',
      balanceNote: 'Gói sự kiện cuối tuần tăng tốc tài nguyên an toàn.',
    },
  },
  {
    id: 'zodiac_festival_rush',
    name: 'Lễ Hội Hoàng Đạo (+Pity)',
    description: 'Tăng +5% tỷ lệ Sử Thi Rương, giảm 2 lượt Pity và thưởng 1.35x Vàng.',
    patch: {
      goldRewardMult: 1.35,
      gemRewardMult: 1.2,
      forgeShardMult: 1.25,
      enemyHpMult: 1.05,
      enemyDmgMult: 1.0,
      chestEpicRateBonus: 0.05,
      pitySoftCapOffset: -2,
      weekendBlitzEnabled: true,
      doubleDropEventActive: false,
      announcementBanner: 'Lễ Hội Hoàng Đạo: Giảm 2 lượt Pity & +5% Tỷ lệ Rương Sử Thi!',
      balanceNote: 'Sự kiện Lễ Hội Hoàng Đạo kéo dài 72 giờ.',
    },
  },
  {
    id: 'endgame_challenge_week',
    name: 'Tuần Lễ Thử Thách Cao Thủ',
    description: 'Quái & Boss mạnh hơn +15% đổi lấy +45% Vàng và +30% Ngọc.',
    patch: {
      goldRewardMult: 1.45,
      gemRewardMult: 1.3,
      forgeShardMult: 1.4,
      enemyHpMult: 1.15,
      enemyDmgMult: 1.15,
      chestEpicRateBonus: 0.04,
      pitySoftCapOffset: 0,
      weekendBlitzEnabled: false,
      doubleDropEventActive: true,
      announcementBanner: 'Tuần Lễ Thử Thách: Quái +15% Sức Mạnh · Thưởng +45% Vàng & +30% Ngọc!',
      balanceNote: 'Chế độ thử thách cạnh tranh cho người chơi Endgame.',
    },
  },
] as const;

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

function clampEpochMs(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n) || n <= 0) return 0;
  // Cap at year ~2200 to prevent overflow
  return Math.min(7_258_118_400_000, Math.floor(n));
}

function cleanText(raw: unknown, maxLen: number, fallback = ''): string {
  if (typeof raw !== 'string') return fallback;
  return raw.replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, maxLen);
}

export function isVerifiedAdminIdentity(identity?: {
  email?: string | null;
  emailVerified?: boolean;
} | null): boolean {
  if (!identity || !identity.email) return false;
  return (
    identity.email.trim().toLowerCase() === VERIFIED_LIVEOPS_ADMIN_EMAIL &&
    identity.emailVerified === true
  );
}

export function sanitizeLiveOpsConfig(
  raw: Partial<LiveOpsConfig> | Record<string, unknown> | null | undefined
): LiveOpsConfig {
  const src = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const scheduledStartMs = clampEpochMs(src.scheduledStartMs);
  let scheduledEndMs = clampEpochMs(src.scheduledEndMs);
  if (scheduledStartMs > 0 && scheduledEndMs > 0 && scheduledEndMs < scheduledStartMs) {
    scheduledEndMs = scheduledStartMs;
  }
  return {
    configId: 'global',
    version: clampInt(
      src.version,
      LIVEOPS_BOUNDS.version.min,
      LIVEOPS_BOUNDS.version.max,
      DEFAULT_LIVEOPS_CONFIG.version
    ),
    goldRewardMult: clampNum(
      src.goldRewardMult,
      LIVEOPS_BOUNDS.goldRewardMult.min,
      LIVEOPS_BOUNDS.goldRewardMult.max,
      1.0,
      2
    ),
    gemRewardMult: clampNum(
      src.gemRewardMult,
      LIVEOPS_BOUNDS.gemRewardMult.min,
      LIVEOPS_BOUNDS.gemRewardMult.max,
      1.0,
      2
    ),
    forgeShardMult: clampNum(
      src.forgeShardMult,
      LIVEOPS_BOUNDS.forgeShardMult.min,
      LIVEOPS_BOUNDS.forgeShardMult.max,
      1.0,
      2
    ),
    enemyHpMult: clampNum(
      src.enemyHpMult,
      LIVEOPS_BOUNDS.enemyHpMult.min,
      LIVEOPS_BOUNDS.enemyHpMult.max,
      1.0,
      2
    ),
    enemyDmgMult: clampNum(
      src.enemyDmgMult,
      LIVEOPS_BOUNDS.enemyDmgMult.min,
      LIVEOPS_BOUNDS.enemyDmgMult.max,
      1.0,
      2
    ),
    chestEpicRateBonus: clampNum(
      src.chestEpicRateBonus,
      LIVEOPS_BOUNDS.chestEpicRateBonus.min,
      LIVEOPS_BOUNDS.chestEpicRateBonus.max,
      0,
      3
    ),
    pitySoftCapOffset: clampInt(
      src.pitySoftCapOffset,
      LIVEOPS_BOUNDS.pitySoftCapOffset.min,
      LIVEOPS_BOUNDS.pitySoftCapOffset.max,
      0
    ),
    weekendBlitzEnabled: Boolean(src.weekendBlitzEnabled),
    doubleDropEventActive: Boolean(src.doubleDropEventActive),
    scheduledStartMs,
    scheduledEndMs,
    announcementBanner: cleanText(src.announcementBanner, LIVEOPS_BOUNDS.maxBannerLen, ''),
    maintenanceNotice: cleanText(src.maintenanceNotice, LIVEOPS_BOUNDS.maxBannerLen, ''),
    balanceNote: cleanText(
      src.balanceNote,
      LIVEOPS_BOUNDS.maxNoteLen,
      DEFAULT_LIVEOPS_CONFIG.balanceNote
    ),
    updatedAtMs: clampEpochMs(src.updatedAtMs),
    updatedByEmail:
      cleanText(src.updatedByEmail ?? src.updatedByLabel, 32, 'Admin LiveOps') || 'Admin LiveOps',
  };
}

/**
 * Evaluates whether timed LiveOps event modifiers are currently active based on
 * `scheduledStartMs` and `scheduledEndMs`. Outside the active window, gameplay
 * multipliers & event toggles automatically fall back to safe 1.0x defaults while
 * preserving `maintenanceNotice`, `version`, and metadata.
 */
export function resolveEffectiveLiveOpsConfig(
  rawConfig: LiveOpsConfig,
  nowMs = Date.now()
): EffectiveLiveOpsResolution {
  const cfg = sanitizeLiveOpsConfig(rawConfig);
  const hasStart = cfg.scheduledStartMs > 0;
  const hasEnd = cfg.scheduledEndMs > 0;

  if (!hasStart && !hasEnd) {
    return { config: cfg, scheduleStatus: 'always_on', remainingMs: null };
  }

  if (hasStart && nowMs < cfg.scheduledStartMs) {
    return {
      config: {
        ...DEFAULT_LIVEOPS_CONFIG,
        version: cfg.version,
        scheduledStartMs: cfg.scheduledStartMs,
        scheduledEndMs: cfg.scheduledEndMs,
        maintenanceNotice: cfg.maintenanceNotice,
        balanceNote: cfg.balanceNote,
        updatedAtMs: cfg.updatedAtMs,
        updatedByEmail: cfg.updatedByEmail,
      },
      scheduleStatus: 'upcoming',
      remainingMs: Math.max(0, cfg.scheduledStartMs - nowMs),
    };
  }

  if (hasEnd && nowMs > cfg.scheduledEndMs) {
    return {
      config: {
        ...DEFAULT_LIVEOPS_CONFIG,
        version: cfg.version,
        scheduledStartMs: cfg.scheduledStartMs,
        scheduledEndMs: cfg.scheduledEndMs,
        maintenanceNotice: cfg.maintenanceNotice,
        balanceNote: cfg.balanceNote,
        updatedAtMs: cfg.updatedAtMs,
        updatedByEmail: cfg.updatedByEmail,
      },
      scheduleStatus: 'expired',
      remainingMs: 0,
    };
  }

  return {
    config: cfg,
    scheduleStatus: 'active',
    remainingMs: hasEnd ? Math.max(0, cfg.scheduledEndMs - nowMs) : null,
  };
}

export function getEffectiveLiveOpsPityThresholds(
  config: LiveOpsConfig,
  baseEpicPityRolls = 10,
  baseSTierPityRolls = 25
): { epicPityRolls: number; sTierPityRolls: number } {
  const safeCfg = sanitizeLiveOpsConfig(config);
  return {
    epicPityRolls: Math.max(5, Math.min(15, baseEpicPityRolls + safeCfg.pitySoftCapOffset)),
    sTierPityRolls: Math.max(15, Math.min(35, baseSTierPityRolls + safeCfg.pitySoftCapOffset)),
  };
}

export function parseLiveOpsConfigJson(
  rawJson: string
): { ok: true; config: LiveOpsConfig } | { ok: false; error: string } {
  if (typeof rawJson !== 'string' || !rawJson.trim()) {
    return { ok: false, error: 'Chuỗi JSON cấu hình trống.' };
  }
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'JSON cấu hình phải là đối tượng hợp lệ.' };
    }
    return { ok: true, config: sanitizeLiveOpsConfig(parsed as Record<string, unknown>) };
  } catch {
    return { ok: false, error: 'Cú pháp JSON không hợp lệ.' };
  }
}

export function applyLiveOpsRewardMultipliers(
  rewards: {
    gold: number;
    gems: number;
    forgeShards?: number;
    rareShards?: number;
    epicShards?: number;
    sTierBlueprints?: number;
  },
  config: LiveOpsConfig,
  nowMs?: number
): {
  gold: number;
  gems: number;
  forgeShards: number;
  rareShards: number;
  epicShards: number;
  sTierBlueprints: number;
  appliedShardMult: number;
} {
  const effectiveCfg =
    nowMs !== undefined
      ? resolveEffectiveLiveOpsConfig(config, nowMs).config
      : sanitizeLiveOpsConfig(config);

  const weekendGoldBoost = effectiveCfg.weekendBlitzEnabled ? 1.15 : 1.0;
  const rawShardMult = effectiveCfg.forgeShardMult * (effectiveCfg.doubleDropEventActive ? 1.5 : 1.0);
  const appliedShardMult = Math.round(Math.min(3.0, Math.max(0.5, rawShardMult)) * 100) / 100;

  const gold = Math.max(
    0,
    Math.round(Math.max(0, rewards.gold) * effectiveCfg.goldRewardMult * weekendGoldBoost)
  );
  const gems = Math.max(0, Math.round(Math.max(0, rewards.gems) * effectiveCfg.gemRewardMult));
  const forgeShards = Math.max(
    0,
    Math.round(Math.max(0, rewards.forgeShards ?? 0) * appliedShardMult)
  );
  const rareShards = Math.max(
    0,
    Math.round(Math.max(0, rewards.rareShards ?? 0) * appliedShardMult)
  );
  const epicShards = Math.max(
    0,
    Math.round(Math.max(0, rewards.epicShards ?? 0) * appliedShardMult)
  );
  const sTierBlueprints = Math.max(
    0,
    Math.round(Math.max(0, rewards.sTierBlueprints ?? 0) * appliedShardMult)
  );

  return {
    gold,
    gems,
    forgeShards,
    rareShards,
    epicShards,
    sTierBlueprints,
    appliedShardMult,
  };
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

function formatScheduleLabel(ms: number): string {
  if (!ms || ms <= 0) return 'Không giới hạn';
  try {
    return new Date(ms).toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(ms);
  }
}

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
  if (a.scheduledStartMs !== b.scheduledStartMs) {
    diffs.push({
      field: 'scheduledStartMs',
      label: 'Bắt đầu lịch sự kiện',
      before: formatScheduleLabel(a.scheduledStartMs),
      after: formatScheduleLabel(b.scheduledStartMs),
    });
  }
  if (a.scheduledEndMs !== b.scheduledEndMs) {
    diffs.push({
      field: 'scheduledEndMs',
      label: 'Kết thúc lịch sự kiện',
      before: formatScheduleLabel(a.scheduledEndMs),
      after: formatScheduleLabel(b.scheduledEndMs),
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
      (safeCfg.balanceNote
        ? `v${safeCfg.version} · ${safeCfg.balanceNote.slice(0, 56)}`
        : `Bản v${safeCfg.version}`),
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
  const nextVersion = Math.min(
    LIVEOPS_BOUNDS.version.max,
    Math.max(cur.version + 1, target.version + 1)
  );
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

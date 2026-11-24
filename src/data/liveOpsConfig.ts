export const LIVEOPS_CONFIG_DOC_ID = 'global' as const;
export const LIVEOPS_STORAGE_KEY = 'artemis_3d_liveops_config_v1';

export const LIVEOPS_ADMIN_EMAILS: ReadonlySet<string> = new Set([
  'ngoducphu1303@gmail.com',
]);

export interface LiveOpsConfig {
  version: number;
  goldRewardMult: number; // 0.5 .. 3.0
  gemRewardMult: number; // 0.5 .. 2.5
  forgeShardMult: number; // 0.5 .. 3.0
  enemyHpMult: number; // 0.6 .. 2.0
  enemyDmgMult: number; // 0.6 .. 2.0
  chestEpicRateBonus: number; // -0.05 .. 0.20
  pitySoftCapOffset: number; // -5 .. +5
  weekendBlitzEnabled: boolean;
  doubleDropEventActive: boolean;
  announcementBanner: string;
  maintenanceNotice: string;
  balanceNote: string;
  updatedByEmail: string;
  updatedAtMs: number;
}

export const LIVEOPS_BOUNDS = {
  goldRewardMult: { min: 0.5, max: 3.0 },
  gemRewardMult: { min: 0.5, max: 2.5 },
  forgeShardMult: { min: 0.5, max: 3.0 },
  enemyHpMult: { min: 0.6, max: 2.0 },
  enemyDmgMult: { min: 0.6, max: 2.0 },
  chestEpicRateBonus: { min: -0.05, max: 0.2 },
  pitySoftCapOffset: { min: -5, max: 5 },
  maxBannerLen: 180,
  maxNoteLen: 240,
} as const;

export const DEFAULT_LIVEOPS_CONFIG: LiveOpsConfig = {
  version: 1,
  goldRewardMult: 1.0,
  gemRewardMult: 1.0,
  forgeShardMult: 1.0,
  enemyHpMult: 1.0,
  enemyDmgMult: 1.0,
  chestEpicRateBonus: 0,
  pitySoftCapOffset: 0,
  weekendBlitzEnabled: true,
  doubleDropEventActive: false,
  announcementBanner: '',
  maintenanceNotice: '',
  balanceNote: 'Cấu hình cân bằng chuẩn AAA Mùa 1 (1.0x).',
  updatedByEmail: 'system',
  updatedAtMs: 0,
};

export interface LiveOpsPreset {
  id: string;
  label: string;
  summary: string;
  patch: Partial<LiveOpsConfig>;
}

export const LIVEOPS_PRESETS: LiveOpsPreset[] = [
  {
    id: 'balanced_default',
    label: 'Chuẩn Cân Bằng (1.0x)',
    summary: 'Đưa toàn bộ hệ số thưởng, rơi đồ và độ khó về mức chuẩn thiết kế.',
    patch: {
      goldRewardMult: 1.0,
      gemRewardMult: 1.0,
      forgeShardMult: 1.0,
      enemyHpMult: 1.0,
      enemyDmgMult: 1.0,
      chestEpicRateBonus: 0,
      pitySoftCapOffset: 0,
      weekendBlitzEnabled: true,
      doubleDropEventActive: false,
      announcementBanner: '',
      maintenanceNotice: '',
      balanceNote: 'Chuẩn cân bằng AAA Mùa 1 (1.0x).',
    },
  },
  {
    id: 'weekend_festival',
    label: 'Lễ Hội Cuối Tuần (x1.5 Vàng · x2 Rơi Mảnh)',
    summary: 'Kích hoạt thưởng cuối tuần x1.5 Vàng, +5% tỷ lệ Sử Thi và sự kiện x2 rơi mảnh rèn.',
    patch: {
      goldRewardMult: 1.5,
      gemRewardMult: 1.2,
      forgeShardMult: 1.5,
      enemyHpMult: 1.0,
      enemyDmgMult: 1.0,
      chestEpicRateBonus: 0.05,
      pitySoftCapOffset: -2,
      weekendBlitzEnabled: true,
      doubleDropEventActive: true,
      announcementBanner: 'Sự Kiện Cuối Tuần: +50% Vàng, +5% Sử Thi & Rơi Mảnh Rèn tăng cường!',
      balanceNote: 'Preset Lễ Hội Cuối Tuần (kiểm soát trần <= 1.5x chống lạm phát).',
    },
  },
  {
    id: 'hardcore_season',
    label: 'Thử Thách Chiến Thần (+25% HP/ATK · +40% Thưởng)',
    summary: 'Tăng thử thách chiến thuật cho người chơi kỳ cựu kèm phần thưởng tương xứng.',
    patch: {
      goldRewardMult: 1.4,
      gemRewardMult: 1.25,
      forgeShardMult: 1.35,
      enemyHpMult: 1.25,
      enemyDmgMult: 1.2,
      chestEpicRateBonus: 0.04,
      pitySoftCapOffset: -1,
      weekendBlitzEnabled: true,
      doubleDropEventActive: false,
      announcementBanner: 'Mùa Thử Thách Chiến Thần: Quái +25% HP / +20% ATK · Thưởng +40% Vàng!',
      balanceNote: 'Preset Thử Thách Chiến Thần — cân bằng rủi ro & phần thưởng.',
    },
  },
];

function clampNumber(val: unknown, fallback: number, min: number, max: number, decimals = 2): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  const clamped = Math.max(min, Math.min(max, n));
  const factor = Math.pow(10, decimals);
  return Math.round(clamped * factor) / factor;
}

function cleanText(val: unknown, fallback: string, maxLen: number): string {
  if (typeof val !== 'string') return fallback;
  return val.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, maxLen);
}

export function isVerifiedAdminIdentity(identity: {
  email?: string | null;
  emailVerified?: boolean | null;
} | null | undefined): boolean {
  if (!identity || typeof identity.email !== 'string') return false;
  if (identity.emailVerified !== true) return false;
  return LIVEOPS_ADMIN_EMAILS.has(identity.email.trim().toLowerCase());
}

export function sanitizeLiveOpsConfig(raw?: Partial<LiveOpsConfig> | null): LiveOpsConfig {
  const src = raw && typeof raw === 'object' ? raw : {};
  const rawVer = Number(src.version);
  const version =
    Number.isFinite(rawVer) && rawVer >= 1 ? Math.min(1_000_000, Math.floor(rawVer)) : 1;

  return {
    version,
    goldRewardMult: clampNumber(
      src.goldRewardMult,
      DEFAULT_LIVEOPS_CONFIG.goldRewardMult,
      LIVEOPS_BOUNDS.goldRewardMult.min,
      LIVEOPS_BOUNDS.goldRewardMult.max,
      2
    ),
    gemRewardMult: clampNumber(
      src.gemRewardMult,
      DEFAULT_LIVEOPS_CONFIG.gemRewardMult,
      LIVEOPS_BOUNDS.gemRewardMult.min,
      LIVEOPS_BOUNDS.gemRewardMult.max,
      2
    ),
    forgeShardMult: clampNumber(
      src.forgeShardMult,
      DEFAULT_LIVEOPS_CONFIG.forgeShardMult,
      LIVEOPS_BOUNDS.forgeShardMult.min,
      LIVEOPS_BOUNDS.forgeShardMult.max,
      2
    ),
    enemyHpMult: clampNumber(
      src.enemyHpMult,
      DEFAULT_LIVEOPS_CONFIG.enemyHpMult,
      LIVEOPS_BOUNDS.enemyHpMult.min,
      LIVEOPS_BOUNDS.enemyHpMult.max,
      2
    ),
    enemyDmgMult: clampNumber(
      src.enemyDmgMult,
      DEFAULT_LIVEOPS_CONFIG.enemyDmgMult,
      LIVEOPS_BOUNDS.enemyDmgMult.min,
      LIVEOPS_BOUNDS.enemyDmgMult.max,
      2
    ),
    chestEpicRateBonus: clampNumber(
      src.chestEpicRateBonus,
      DEFAULT_LIVEOPS_CONFIG.chestEpicRateBonus,
      LIVEOPS_BOUNDS.chestEpicRateBonus.min,
      LIVEOPS_BOUNDS.chestEpicRateBonus.max,
      3
    ),
    pitySoftCapOffset: Math.round(
      clampNumber(
        src.pitySoftCapOffset,
        DEFAULT_LIVEOPS_CONFIG.pitySoftCapOffset,
        LIVEOPS_BOUNDS.pitySoftCapOffset.min,
        LIVEOPS_BOUNDS.pitySoftCapOffset.max,
        0
      )
    ),
    weekendBlitzEnabled:
      typeof src.weekendBlitzEnabled === 'boolean'
        ? src.weekendBlitzEnabled
        : DEFAULT_LIVEOPS_CONFIG.weekendBlitzEnabled,
    doubleDropEventActive:
      typeof src.doubleDropEventActive === 'boolean'
        ? src.doubleDropEventActive
        : DEFAULT_LIVEOPS_CONFIG.doubleDropEventActive,
    announcementBanner: cleanText(
      src.announcementBanner,
      DEFAULT_LIVEOPS_CONFIG.announcementBanner,
      LIVEOPS_BOUNDS.maxBannerLen
    ),
    maintenanceNotice: cleanText(
      src.maintenanceNotice,
      DEFAULT_LIVEOPS_CONFIG.maintenanceNotice,
      LIVEOPS_BOUNDS.maxBannerLen
    ),
    balanceNote: cleanText(
      src.balanceNote,
      DEFAULT_LIVEOPS_CONFIG.balanceNote,
      LIVEOPS_BOUNDS.maxNoteLen
    ),
    updatedByEmail: cleanText(src.updatedByEmail, DEFAULT_LIVEOPS_CONFIG.updatedByEmail, 80),
    updatedAtMs:
      typeof src.updatedAtMs === 'number' && Number.isFinite(src.updatedAtMs) && src.updatedAtMs >= 0
        ? Math.floor(src.updatedAtMs)
        : 0,
  };
}

export interface LiveOpsRewardInput {
  gold: number;
  gems: number;
  rareShards?: number;
  epicShards?: number;
  sTierBlueprints?: number;
}

export interface LiveOpsRewardOutput {
  gold: number;
  gems: number;
  rareShards: number;
  epicShards: number;
  sTierBlueprints: number;
  appliedGoldMult: number;
  appliedGemMult: number;
  appliedShardMult: number;
}

/**
 * Applies active LiveOps multipliers deterministically to post-run rewards.
 */
export function applyLiveOpsRewardMultipliers(
  input: LiveOpsRewardInput,
  config: LiveOpsConfig
): LiveOpsRewardOutput {
  const safe = sanitizeLiveOpsConfig(config);
  const effectiveShardMult = safe.doubleDropEventActive
    ? Math.min(LIVEOPS_BOUNDS.forgeShardMult.max, Number((safe.forgeShardMult * 1.5).toFixed(2)))
    : safe.forgeShardMult;

  return {
    gold: Math.max(0, Math.round(Math.max(0, input.gold) * safe.goldRewardMult)),
    gems: Math.max(0, Math.round(Math.max(0, input.gems) * safe.gemRewardMult)),
    rareShards: Math.max(0, Math.round(Math.max(0, input.rareShards ?? 0) * effectiveShardMult)),
    epicShards: Math.max(0, Math.round(Math.max(0, input.epicShards ?? 0) * effectiveShardMult)),
    sTierBlueprints: Math.max(
      0,
      Math.round(Math.max(0, input.sTierBlueprints ?? 0) * effectiveShardMult)
    ),
    appliedGoldMult: safe.goldRewardMult,
    appliedGemMult: safe.gemRewardMult,
    appliedShardMult: effectiveShardMult,
  };
}

export function getEffectiveLiveOpsPityThresholds(config: LiveOpsConfig): {
  epicPityRolls: number;
  sTierPityRolls: number;
} {
  const safe = sanitizeLiveOpsConfig(config);
  return {
    epicPityRolls: Math.max(6, Math.min(15, 10 + safe.pitySoftCapOffset)),
    sTierPityRolls: Math.max(18, Math.min(30, 25 + safe.pitySoftCapOffset)),
  };
}

export function parseLiveOpsConfigJson(
  rawJson: string
): { ok: true; config: LiveOpsConfig } | { ok: false; error: string } {
  try {
    const parsed = JSON.parse(rawJson);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { ok: false, error: 'Định dạng JSON cấu hình LiveOps không hợp lệ.' };
    }
    return { ok: true, config: sanitizeLiveOpsConfig(parsed as Partial<LiveOpsConfig>) };
  } catch {
    return { ok: false, error: 'Không thể phân tích cú pháp JSON LiveOps.' };
  }
}

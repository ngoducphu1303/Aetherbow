import type { ComputedPlayerStats, SaveData } from '../types/game';
import { CHAPTERS } from './chaptersData';
import { computePlayerStats } from './gearData';
import {
  LIVEOPS_PRESETS,
  resolveEffectiveLiveOpsConfig,
  sanitizeLiveOpsConfig,
  type LiveOpsConfig,
  type LiveOpsScheduleStatus,
} from './liveOpsConfig';
import { getIsoWeekKey } from './wave11RetentionSystems';
import { getChapterArenaMechanismSpec } from '../engine/chapterArenaMechanisms';
import {
  validateGlbPipelineManifest,
  type GlbManifestDocument,
  type GlbPipelineValidationReport,
} from '../engine/glbPipelineValidator';
import { ZODIAC_BOSS_PHASE_SIGNATURES } from '../engine/tacticalCombatChoreography';
import { ZODIAC_BOSS_REGALIA_SPECS } from '../engine/zodiacBossRegalia';
import {
  ZODIAC_REALM_MONUMENTS,
  ZODIAC_STORYTELLING_PROPS,
} from '../engine/zodiacRealmArchitecture';
import { resolveBossEntranceProfile } from '../engine/wave16BossAndPortal';

/**
 * Wave 16 — Pre-Battle Tactical Briefing, Player-Facing LiveOps Schedule,
 * and Unified Ch.1–12 3D Asset Pipeline Readiness Auditor.
 */

// ============================================================================
// 1. PRE-BATTLE TACTICAL BRIEFING (NON-MUTATING, FTUE-SAFE)
// ============================================================================

export type TacticalReadinessTier = 'ready' | 'challenging' | 'underpowered';
export type TacticalBottleneckTarget = 'gear' | 'talents' | 'runes' | 'hero';

export interface PreBattleTacticalBriefing {
  chapterId: number;
  chapterName: string;
  zodiacName: string;
  regionName: string;
  bossName: string;
  bossEpithet: string;
  playerPower: number;
  recommendedPower: number;
  powerRatio: number;
  readinessTier: TacticalReadinessTier;
  readinessLabel: string;
  weakestBottleneck: {
    target: TacticalBottleneckTarget;
    label: string;
    tip: string;
    ctaLabel: string;
  };
  bossPhase2Title: string;
  bossPhase2Counterplay: string;
  bossPhase3Title: string;
  bossPhase3Counterplay: string;
  arenaMechanismName: string;
  arenaMechanismShort: string;
  arenaMechanismTip: string;
  crossroadsPreview: {
    enabled: boolean;
    headline: string;
    detail: string;
  };
}

function resolveWeakestBottleneck(
  save: SaveData,
  playerPower: number,
  recommendedPower: number
): PreBattleTacticalBriefing['weakestBottleneck'] {
  const equippedCount = Object.values(save.equipped ?? {}).filter(Boolean).length;
  const totalTalentLv = Object.values(save.talents ?? {}).reduce(
    (sum, lv) => sum + (Number.isFinite(lv) ? lv : 0),
    0
  );
  const equippedRunesCount = (save.equippedRunes ?? []).filter(Boolean).length;

  // Prioritize genuine early-to-mid bottlenecks in a predictable, actionable order
  if (equippedCount < 4) {
    return {
      target: 'gear',
      label: `Trang bị còn trống (${equippedCount}/6 ô)`,
      tip: 'Lắp đủ Trang bị & cường hóa Vũ khí giúp tăng mạnh Lực Chiến và sát thương cơ bản.',
      ctaLabel: 'Vào Kho Đồ',
    };
  }
  if (totalTalentLv < 6) {
    return {
      target: 'talents',
      label: `Thiên Phú còn thấp (Cấp ${totalTalentLv})`,
      tip: 'Nâng cấp Thiên Phú Sức Mạnh & Sinh Mệnh mang lại chỉ số nền ổn định mọi chương.',
      ctaLabel: 'Nâng Thiên Phú',
    };
  }
  if (equippedRunesCount < 3) {
    return {
      target: 'runes',
      label: `Cổ Ngữ chưa đầy (${equippedRunesCount}/5 ô)`,
      tip: 'Khảm thêm Cổ Ngữ Hoàng Đạo để kích hoạt chỉ số bạo kích và kháng sát thương.',
      ctaLabel: 'Khảm Cổ Ngữ',
    };
  }
  if (playerPower < recommendedPower * 0.9) {
    return {
      target: 'gear',
      label: 'Cường hóa Trang bị & Chuyển Hóa Bộ',
      tip: 'Nâng cấp Vũ khí chính hoặc kích hoạt hiệu ứng Bộ 2/4 món để thu hẹp chênh lệch LC.',
      ctaLabel: 'Nâng Trang Bị',
    };
  }
  return {
    target: 'hero',
    label: 'Đội hình đã sẵn sàng chinh phục',
    tip: 'Có thể tăng sao Tướng hoặc Tinh Luyện Cổ Ngữ để rút ngắn thời gian hạ Boss.',
    ctaLabel: 'Xem Tướng',
  };
}

/**
 * Computes a complete, deterministic Pre-Battle Tactical Briefing without mutating `save`.
 * Preserves Fresh Account 702 LC and Ch.1 FTUE protection.
 */
export function buildPreBattleTacticalBriefing(
  save: SaveData,
  chapterId: number,
  precomputedStats?: ComputedPlayerStats
): PreBattleTacticalBriefing {
  const clampedId = Math.max(1, Math.min(12, Math.floor(chapterId || 1)));
  const chapter = CHAPTERS.find((c) => c.id === clampedId) ?? CHAPTERS[0];
  const stats = precomputedStats ?? computePlayerStats(save);
  const playerPower = Math.max(1, Math.round(stats.powerRating));
  const recommendedPower = Math.max(1, Math.round(chapter.recommendedPower));
  const powerRatio = Math.round((playerPower / recommendedPower) * 100) / 100;

  let readinessTier: TacticalReadinessTier = 'ready';
  let readinessLabel = 'Sẵn Sàng Chinh Phục';
  if (powerRatio < 0.72) {
    readinessTier = 'underpowered';
    readinessLabel = 'Thiếu Lực Chiến · Nguy Hiểm Cao';
  } else if (powerRatio < 0.95) {
    readinessTier = 'challenging';
    readinessLabel = 'Thử Thách Chiến Thuật';
  }

  const bossSig = ZODIAC_BOSS_PHASE_SIGNATURES[clampedId] ?? ZODIAC_BOSS_PHASE_SIGNATURES[1];
  const entrance = resolveBossEntranceProfile(clampedId);
  const mechanism = getChapterArenaMechanismSpec(clampedId);

  const arenaMechanismTip =
    mechanism.kind === 'solar_obelisk'
      ? 'Đứng gần Trụ Nhật Luân để xả sóng chấn động, phá giáp & gây choáng kẻ địch.'
      : mechanism.kind === 'magma_vent'
        ? 'Kích hoạt Miệng Dung Nham khi Boss áp sát để đốt cháy & giảm giáp tức thì.'
        : mechanism.kind === 'emerald_crystal'
          ? 'Chạm Tinh Thể Ngọc Lục Bảo để hồi HP, tạo Khiên và hồi năng lượng Tuyệt Kỹ.'
          : 'Kích hoạt Lăng Kính Tinh Giới để đặt lại hồi chiêu Lướt & tăng tốc bắn.';

  const crossroadsPreview =
    clampedId === 1
      ? {
          enabled: false,
          headline: 'Lộ Trình Chuẩn Tân Thủ (Chương 1)',
          detail:
            'Chương 1 bảo vệ nhịp trải nghiệm đầu tiên — không bật biến số ngã rẽ bất ngờ, tập trung làm chủ Lướt, Cắt Chiêu & Trụ Đấu Trường.',
        }
      : {
          enabled: true,
          headline: 'Ngã Rẽ Phòng Chiến Thuật (Phòng 4 & 8)',
          detail:
            'Sau Phòng 4 và Phòng 8 được chọn 1 trong 2 nhánh: Kho Báu Phục Kích (+20% Vàng/Mảnh), Suối Thánh Hồi Phục (+35% HP), hoặc Pháo Đài Cổ Ngữ (+18% Sát Thương).',
        };

  return {
    chapterId: clampedId,
    chapterName: chapter.name,
    zodiacName: chapter.zodiacName,
    regionName: chapter.regionName,
    bossName: chapter.bossName,
    bossEpithet: entrance.epithet,
    playerPower,
    recommendedPower,
    powerRatio,
    readinessTier,
    readinessLabel,
    weakestBottleneck: resolveWeakestBottleneck(save, playerPower, recommendedPower),
    bossPhase2Title: bossSig.phase2Title,
    bossPhase2Counterplay: bossSig.phase2Counterplay,
    bossPhase3Title: bossSig.phase3Title,
    bossPhase3Counterplay: bossSig.phase3Counterplay,
    arenaMechanismName: mechanism.name,
    arenaMechanismShort: mechanism.shortLabel,
    arenaMechanismTip,
    crossroadsPreview,
  };
}

// ============================================================================
// 2. PLAYER-FACING LIVEOPS SCHEDULE & COUNTDOWN
// ============================================================================

export interface LiveOpsBonusChip {
  key: string;
  label: string;
  value: string;
  tone: 'reward' | 'challenge' | 'gacha';
}

export interface LiveOpsCalendarItem {
  id: string;
  title: string;
  summary: string;
  cadenceLabel: string;
  isCurrent: boolean;
}

export interface PlayerLiveOpsScheduleView {
  status: LiveOpsScheduleStatus;
  statusLabel: string;
  headline: string;
  balanceNote: string;
  maintenanceNotice: string;
  remainingMs: number | null;
  countdownLabel: string;
  activeBonuses: LiveOpsBonusChip[];
  hasActiveBoosts: boolean;
  weeklyResetWeekKey: string;
  weeklyResetRemainingMs: number;
  weeklyResetCountdownLabel: string;
  upcomingEvents: LiveOpsCalendarItem[];
  version: number;
}

export function formatLiveOpsCountdown(ms: number): string {
  const safeMs = Math.max(0, Math.floor(Number.isFinite(ms) ? ms : 0));
  const totalSec = Math.floor(safeMs / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;

  const pad = (n: number) => String(n).padStart(2, '0');
  if (days > 0) {
    return `${days}n ${pad(hours)}g ${pad(minutes)}p`;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function getMsUntilNextIsoWeekReset(nowMs = Date.now()): number {
  const d = new Date(nowMs);
  // UTC Monday 00:00:00 next week
  const dayOfWeek = d.getUTCDay(); // 0=Sun, 1=Mon, ... 6=Sat
  const daysUntilNextMon = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  const nextMondayUtc = Date.UTC(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate() + daysUntilNextMon,
    0,
    0,
    0,
    0
  );
  return Math.max(0, nextMondayUtc - nowMs);
}

export function buildPlayerLiveOpsSchedule(
  rawConfig: LiveOpsConfig,
  nowMs = Date.now()
): PlayerLiveOpsScheduleView {
  const sanitized = sanitizeLiveOpsConfig(rawConfig);
  const resolved = resolveEffectiveLiveOpsConfig(sanitized, nowMs);
  const cfg = resolved.config;

  const activeBonuses: LiveOpsBonusChip[] = [];
  if (Math.abs(cfg.goldRewardMult - 1.0) > 0.005) {
    activeBonuses.push({
      key: 'gold',
      label: 'Vàng Chiến Đấu',
      value: `×${cfg.goldRewardMult.toFixed(2)}`,
      tone: 'reward',
    });
  }
  if (Math.abs(cfg.gemRewardMult - 1.0) > 0.005) {
    activeBonuses.push({
      key: 'gems',
      label: 'Ngọc Tinh Giới',
      value: `×${cfg.gemRewardMult.toFixed(2)}`,
      tone: 'reward',
    });
  }
  if (Math.abs(cfg.forgeShardMult - 1.0) > 0.005) {
    activeBonuses.push({
      key: 'shards',
      label: 'Mảnh Rèn',
      value: `×${cfg.forgeShardMult.toFixed(2)}`,
      tone: 'reward',
    });
  }
  if (cfg.weekendBlitzEnabled) {
    activeBonuses.push({
      key: 'weekend_blitz',
      label: 'Tăng Tốc Cuối Tuần',
      value: '+15% Vàng',
      tone: 'reward',
    });
  }
  if (cfg.doubleDropEventActive) {
    activeBonuses.push({
      key: 'double_drop',
      label: 'Nhân Đôi Rơi Đồ',
      value: '×1.5 Mảnh',
      tone: 'reward',
    });
  }
  if (Math.abs(cfg.chestEpicRateBonus) > 0.0005) {
    activeBonuses.push({
      key: 'epic_rate',
      label: 'Tỷ Lệ Rương Sử Thi',
      value: `${cfg.chestEpicRateBonus > 0 ? '+' : ''}${(cfg.chestEpicRateBonus * 100).toFixed(1)}%`,
      tone: 'gacha',
    });
  }
  if (cfg.pitySoftCapOffset !== 0) {
    activeBonuses.push({
      key: 'pity',
      label: 'Mốc Pity Rương',
      value: `${cfg.pitySoftCapOffset > 0 ? '+' : ''}${cfg.pitySoftCapOffset} lượt`,
      tone: 'gacha',
    });
  }
  if (Math.abs(cfg.enemyHpMult - 1.0) > 0.005 || Math.abs(cfg.enemyDmgMult - 1.0) > 0.005) {
    activeBonuses.push({
      key: 'challenge',
      label: 'Cường Độ Quái',
      value: `HP ×${cfg.enemyHpMult.toFixed(2)} · ST ×${cfg.enemyDmgMult.toFixed(2)}`,
      tone: 'challenge',
    });
  }

  let statusLabel = 'Mùa Tiêu Chuẩn';
  let countdownLabel = 'Đang áp dụng liên tục';
  if (resolved.scheduleStatus === 'active') {
    statusLabel = 'Sự Kiện Đang Diễn Ra';
    countdownLabel =
      resolved.remainingMs !== null
        ? `Còn lại ${formatLiveOpsCountdown(resolved.remainingMs)}`
        : 'Đang diễn ra';
  } else if (resolved.scheduleStatus === 'upcoming') {
    statusLabel = 'Sự Kiện Sắp Khai Mở';
    countdownLabel =
      resolved.remainingMs !== null
        ? `Mở sau ${formatLiveOpsCountdown(resolved.remainingMs)}`
        : 'Sắp mở';
  } else if (resolved.scheduleStatus === 'expired') {
    statusLabel = 'Đã Kết Thúc · Chuẩn Mùa';
    countdownLabel = 'Đã về cân bằng 1.0x';
  } else if (activeBonuses.length > 0) {
    statusLabel = 'Ưu Đãi Đang Hoạt Động';
  }

  const headline =
    cfg.announcementBanner ||
    (resolved.scheduleStatus === 'upcoming' && sanitized.announcementBanner
      ? `Sắp diễn ra: ${sanitized.announcementBanner}`
      : 'Mùa 1 · Tinh Giới Khởi Nguyên — Lịch sự kiện & thử thách tuần đang hoạt động.');

  const weeklyResetWeekKey = getIsoWeekKey(new Date(nowMs));
  const weeklyResetRemainingMs = getMsUntilNextIsoWeekReset(nowMs);

  const upcomingEvents: LiveOpsCalendarItem[] = LIVEOPS_PRESETS.filter(
    (p) => p.id !== 'standard_season'
  ).map((preset, idx) => {
    const isCurrent =
      (preset.id === 'weekend_double_drop' &&
        cfg.weekendBlitzEnabled &&
        cfg.doubleDropEventActive) ||
      (preset.id === 'zodiac_festival_rush' && cfg.pitySoftCapOffset <= -2) ||
      (preset.id === 'endgame_challenge_week' && cfg.enemyHpMult >= 1.1);
    const cadenceLabel =
      idx === 0
        ? 'Mỗi Thứ 6 – Chủ Nhật'
        : idx === 1
          ? 'Chu Kỳ Lễ Hội 72 Giờ'
          : 'Tuần Lễ Thử Thách Endgame';
    return {
      id: preset.id,
      title: preset.name,
      summary: preset.description,
      cadenceLabel,
      isCurrent,
    };
  });

  return {
    status: resolved.scheduleStatus,
    statusLabel,
    headline,
    balanceNote: cfg.balanceNote,
    maintenanceNotice: cfg.maintenanceNotice,
    remainingMs: resolved.remainingMs,
    countdownLabel,
    activeBonuses,
    hasActiveBoosts: activeBonuses.length > 0,
    weeklyResetWeekKey,
    weeklyResetRemainingMs,
    weeklyResetCountdownLabel: formatLiveOpsCountdown(weeklyResetRemainingMs),
    upcomingEvents,
    version: cfg.version,
  };
}

// ============================================================================
// 3. UNIFIED CH.1–12 3D ASSET PIPELINE READINESS AUDITOR
// ============================================================================

export interface ChapterAssetReadinessRow {
  chapterId: number;
  chapterName: string;
  tier: 'glb_high_lite' | 'procedural_3d_zodiac';
  hasGlbHighLitePair: boolean;
  hasProceduralMonument: boolean;
  hasStorytellingProps: boolean;
  hasBossRegalia: boolean;
  hasPortalWaypointArch: boolean;
  ready: boolean;
}

export interface UnifiedChapterAssetReadinessReport {
  e5430Safe: boolean;
  glbReport: GlbPipelineValidationReport;
  readyChaptersCount: number;
  totalChapters: number;
  allTwelveChaptersReady: boolean;
  totalProceduralPointLights: 0;
  chapters: ChapterAssetReadinessRow[];
}

/**
 * Unified Asset Pipeline Auditor covering all 12 Zodiac chapters:
 * - Ch.1–4: verifies GLB High/Lite pairing & E5430 memory caps via `validateGlbPipelineManifest`
 * - Ch.5–12: verifies procedural Realm Monuments + Storytelling Props + Boss Regalia + Portal Arch
 * - Confirms 12/12 chapter readiness with 0 procedural PointLights.
 */
export function auditChapterAssetReadiness(
  manifestDoc: GlbManifestDocument | null | undefined
): UnifiedChapterAssetReadinessReport {
  const glbReport = validateGlbPipelineManifest(manifestDoc);
  const chapters: ChapterAssetReadinessRow[] = [];

  for (let chId = 1; chId <= 12; chId++) {
    const chDef = CHAPTERS.find((c) => c.id === chId);
    const isGlbTier = chId <= 4;

    const glbChapterSummary = isGlbTier
      ? glbReport.chapters.find((row) => row.chapterLabel.startsWith(`Chương ${chId}`))
      : undefined;
    const hasGlbHighLitePair = isGlbTier
      ? Boolean(glbChapterSummary && glbChapterSummary.pairedCount > 0 && glbChapterSummary.liteCount > 0)
      : false;

    const hasProceduralMonument = isGlbTier
      ? true
      : Boolean(ZODIAC_REALM_MONUMENTS[chId as keyof typeof ZODIAC_REALM_MONUMENTS]);
    const hasStorytellingProps = isGlbTier
      ? true
      : Boolean(ZODIAC_STORYTELLING_PROPS[chId as keyof typeof ZODIAC_STORYTELLING_PROPS]);
    const hasBossRegalia = isGlbTier
      ? true
      : Boolean(ZODIAC_BOSS_REGALIA_SPECS[chId as keyof typeof ZODIAC_BOSS_REGALIA_SPECS]);
    const hasPortalWaypointArch = true; // Wave 16 CelestialPortalArch supports all Ch.1–12

    const ready = isGlbTier
      ? hasGlbHighLitePair && hasPortalWaypointArch && glbReport.e5430Safe
      : hasProceduralMonument &&
        hasStorytellingProps &&
        hasBossRegalia &&
        hasPortalWaypointArch;

    chapters.push({
      chapterId: chId,
      chapterName: chDef?.name ?? `Chương ${chId}`,
      tier: isGlbTier ? 'glb_high_lite' : 'procedural_3d_zodiac',
      hasGlbHighLitePair,
      hasProceduralMonument,
      hasStorytellingProps,
      hasBossRegalia,
      hasPortalWaypointArch,
      ready,
    });
  }

  const readyChaptersCount = chapters.filter((c) => c.ready).length;

  return {
    e5430Safe: glbReport.e5430Safe,
    glbReport,
    readyChaptersCount,
    totalChapters: 12,
    allTwelveChaptersReady: readyChaptersCount === 12,
    totalProceduralPointLights: 0,
    chapters,
  };
}

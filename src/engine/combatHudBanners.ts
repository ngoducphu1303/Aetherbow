import type { HudSnapshot } from '../types/game';

export type TopCombatBannerTone = 'cyan' | 'amber' | 'rose' | 'gold' | 'emerald' | 'crimson';

export type TopCombatBannerKind =
  | 'phase_counter'
  | 'finisher_ready'
  | 'boss_telegraph'
  | 'boss_finisher'
  | 'boss_broken'
  | 'boss_phase_3'
  | 'boss_phase_2'
  | 'boss_punish'
  | 'boss_warning'
  | 'boss_entrance'
  | 'boss_intro'
  | 'boss_part_broken'
  | 'ult_cutin';

export interface TopCombatBanner {
  readonly id: string;
  readonly kind: TopCombatBannerKind;
  readonly tone: TopCombatBannerTone;
  readonly kicker: string;
  readonly title: string;
  readonly detail?: string;
  readonly timerText?: string;
  readonly progressRatio?: number;
  readonly priority: number;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function shortenBannerText(text: string | null | undefined, maxLen: number): string | undefined {
  if (!text) return undefined;
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, Math.max(1, maxLen - 1)).trimEnd()}…`;
}

/**
 * Computes the vertical safe boundary (px from top viewport edge) reserved for the
 * top perimeter bar, Boss HP strip, and single-slot priority banner so floating
 * combat numbers never overlap Boss health or alert text.
 */
export function computeTopHudSafeZoneY(hasBossBar: boolean, isCompact: boolean): number {
  if (hasBossBar) {
    return isCompact ? 96 : 124;
  }
  return isCompact ? 62 : 76;
}

/**
 * Resolves ALL simultaneous Boss / Finisher / Telegraph / Phase / Ultimate alerts
 * into AT MOST ONE slim top-perimeter priority strip so banners never stack vertically
 * or block the center arena and Boss sightlines.
 */
export function resolveTopCombatBanner(
  hud: Pick<
    HudSnapshot,
    | 'phaseCounterReady'
    | 'phaseCounterWindowSec'
    | 'phaseCounterWindowTotalSec'
    | 'finisherReadyTargetName'
    | 'finisherTargetHpPct'
    | 'activeBossTelegraph'
    | 'bossStunTimer'
    | 'bossFinisherTimer'
    | 'bossFinisherName'
    | 'bossBrokenBannerTimer'
    | 'bossPhaseThreeBannerTimer'
    | 'bossPhaseTwoBannerTimer'
    | 'bossPunishActive'
    | 'bossPunishBonusPct'
    | 'bossPunishRatio'
    | 'bossWarningTitle'
    | 'bossWarningSubtitle'
    | 'bossEntranceActive'
    | 'bossEntranceRemainingSec'
    | 'bossEntranceTotalSec'
    | 'bossEntranceBossName'
    | 'bossEntranceStageLabel'
    | 'bossPartBrokenBanner'
    | 'ultCutinTimer'
    | 'ultCutinTitle'
    | 'ultCutinHeroName'
    | 'heroName'
  >,
  bossIntroTitle: string | null,
  isCompact: boolean
): TopCombatBanner | null {
  // 0. Boss Entrance sequence (5-10s arrival — player attacks are locked until Boss finishes appearing)
  if (hud.bossEntranceActive && (hud.bossEntranceRemainingSec ?? 0) > 0) {
    const rem = Math.max(0, hud.bossEntranceRemainingSec ?? 0);
    const total = Math.max(1, hud.bossEntranceTotalSec ?? 6.0);
    const stageText =
      shortenBannerText(
        hud.bossEntranceStageLabel || 'Boss đang giáng lâm · Khóa tấn công',
        isCompact ? 28 : 42
      ) ?? 'Boss đang giáng lâm · Khóa tấn công';
    return {
      id: 'boss_entrance_active',
      kind: 'boss_entrance',
      tone: 'crimson',
      kicker: 'BOSS XUẤT HIỆN',
      title: stageText,
      timerText: `${rem.toFixed(1)}s`,
      progressRatio: clamp01(1 - rem / total),
      priority: 105,
    };
  }

  // 1. Urgent interactive window: Phase transition counter-attack
  if (hud.phaseCounterReady && (hud.phaseCounterWindowSec ?? 0) > 0) {
    const rem = Math.max(0, hud.phaseCounterWindowSec ?? 0);
    const total = Math.max(0.5, hud.phaseCounterWindowTotalSec ?? 2.5);
    return {
      id: 'phase_counter',
      kind: 'phase_counter',
      tone: 'cyan',
      kicker: 'PHẢN CÔNG PHA',
      title: isCompact ? 'Bắn Chí Mạng / Q' : 'Bắn Chí Mạng hoặc bấm Q ngay',
      timerText: `${rem.toFixed(1)}s`,
      progressRatio: clamp01(rem / total),
      priority: 100,
    };
  }

  // 2. Urgent interactive window: Execution finisher ready
  if (hud.finisherReadyTargetName) {
    const hpPct = hud.finisherTargetHpPct ?? 18;
    return {
      id: `finisher_ready_${hud.finisherReadyTargetName}`,
      kind: 'finisher_ready',
      tone: 'amber',
      kicker: 'KẾT LIỄU',
      title: shortenBannerText(hud.finisherReadyTargetName, isCompact ? 20 : 28) ?? 'Mục Tiêu',
      detail: `${hpPct}% · Bấm F / Q`,
      priority: 95,
    };
  }

  // 3. Active boss attack telegraph (critical dodge cue)
  if (hud.activeBossTelegraph && (hud.bossStunTimer ?? 0) <= 0.05) {
    const tg = hud.activeBossTelegraph;
    const isCritical = tg.dangerLevel === 'critical';
    const ratio = clamp01(tg.remainingSec / Math.max(0.25, tg.durationSec));
    return {
      id: `telegraph_${tg.label}`,
      kind: 'boss_telegraph',
      tone: isCritical ? 'rose' : 'amber',
      kicker: shortenBannerText(tg.label, isCompact ? 18 : 26) ?? 'CẢNH BÁO',
      title: shortenBannerText(tg.actionHint, isCompact ? 22 : 34) ?? 'Né đòn!',
      timerText: `${Math.max(0, tg.remainingSec).toFixed(1)}s`,
      progressRatio: ratio,
      priority: 90,
    };
  }

  // 4. Boss execution slow-mo callout (compact top edge, never over Boss HP bar)
  if ((hud.bossFinisherTimer ?? 0) > 0 && hud.bossFinisherName) {
    return {
      id: `boss_finisher_${hud.bossFinisherName}`,
      kind: 'boss_finisher',
      tone: 'amber',
      kicker: 'KẾT LIỄU HOÀNG ĐẠO',
      title: shortenBannerText(hud.bossFinisherName, isCompact ? 22 : 32) ?? hud.bossFinisherName,
      priority: 85,
    };
  }

  // 5. Boss guard-break burst
  if ((hud.bossBrokenBannerTimer ?? 0) > 0) {
    return {
      id: 'boss_broken',
      kind: 'boss_broken',
      tone: 'gold',
      kicker: 'PHÁ GIÁP',
      title: '+45% Sát Thương',
      priority: 80,
    };
  }

  // 6. Boss Phase III shift
  if ((hud.bossPhaseThreeBannerTimer ?? 0) > 0) {
    return {
      id: 'boss_phase_3',
      kind: 'boss_phase_3',
      tone: 'rose',
      kicker: 'PHA III TỐI THƯỢNG',
      title: '+24% Sát Thương Phản Đòn',
      priority: 75,
    };
  }

  // 7. Boss Phase II shift
  if ((hud.bossPhaseTwoBannerTimer ?? 0) > 0) {
    return {
      id: 'boss_phase_2',
      kind: 'boss_phase_2',
      tone: 'rose',
      kicker: 'PHA II CUỒNG NỘ',
      title: 'Boss Tăng Tốc',
      priority: 70,
    };
  }

  // 8. Boss punish window
  if (hud.bossPunishActive && (hud.bossStunTimer ?? 0) <= 0.05) {
    return {
      id: 'boss_punish',
      kind: 'boss_punish',
      tone: 'emerald',
      kicker: 'SƠ HỞ',
      title: `+${hud.bossPunishBonusPct ?? 18}% Sát Thương`,
      progressRatio: clamp01(hud.bossPunishRatio ?? 0),
      priority: 65,
    };
  }

  // 9. Boss warning / spawn intro (moved from center arena up to single slim top strip)
  if (hud.bossWarningTitle) {
    return {
      id: `boss_warning_${hud.bossWarningTitle}`,
      kind: 'boss_warning',
      tone: 'crimson',
      kicker: 'THỦ LĨNH',
      title: shortenBannerText(hud.bossWarningTitle, isCompact ? 22 : 32) ?? hud.bossWarningTitle,
      detail: isCompact ? undefined : shortenBannerText(hud.bossWarningSubtitle, 38),
      priority: 60,
    };
  }

  if (bossIntroTitle) {
    return {
      id: `boss_intro_${bossIntroTitle}`,
      kind: 'boss_intro',
      tone: 'crimson',
      kicker: 'KHAI CHIẾN',
      title: shortenBannerText(bossIntroTitle, isCompact ? 22 : 32) ?? bossIntroTitle,
      priority: 58,
    };
  }

  // 10. Breakable Boss part shattered
  if (hud.bossPartBrokenBanner) {
    const cleanText = hud.bossPartBrokenBanner.replace(/^PHÁ VỠ\s+/i, '').trim();
    return {
      id: `boss_part_${cleanText}`,
      kind: 'boss_part_broken',
      tone: 'amber',
      kicker: 'VỠ BỘ PHẬN',
      title: shortenBannerText(cleanText, isCompact ? 24 : 38) ?? cleanText,
      priority: 55,
    };
  }

  // 11. Hero Ultimate cut-in strip
  if ((hud.ultCutinTimer ?? 0) > 0 && hud.ultCutinTitle) {
    return {
      id: `ult_cutin_${hud.ultCutinTitle}`,
      kind: 'ult_cutin',
      tone: 'amber',
      kicker: 'TUYỆT KỸ',
      title: shortenBannerText(hud.ultCutinTitle, isCompact ? 22 : 30) ?? hud.ultCutinTitle,
      detail: isCompact ? undefined : hud.ultCutinHeroName || hud.heroName,
      priority: 50,
    };
  }

  return null;
}

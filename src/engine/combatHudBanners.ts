import type { HudSnapshot } from '../types/game';
import { ZODIAC_BOSS_PHASE_SIGNATURES } from './tacticalCombatChoreography';

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
  /** Geometric non-color cue populated when colorblindTelegraphs is enabled. */
  readonly colorblindSymbol?: string;
}

export interface ResolveTopCombatBannerOptions {
  chapterId?: number;
  ultKeyLabel?: string;
  heavyBreakKeyLabel?: string;
  colorblindTelegraphs?: boolean;
}

export interface HudVisualFeedbackInput {
  hpPct: number;
  hp: number;
  reduceScreenFlash?: boolean;
  reducedMotion?: boolean;
  colorblindTelegraphs?: boolean;
}

export interface HudVisualFeedbackPolicy {
  /** Whether the single unified low-HP perimeter danger vignette should render. */
  readonly showLowHpVignette: boolean;
  /** True only when <=15% HP for intensified critical border framing. */
  readonly isCriticalLowHp: boolean;
  /** False when reduceScreenFlash or reducedMotion is active (prevents photosensitive pulsing). */
  readonly animateLowHpVignette: boolean;
  /** Box-shadow CSS string for the unified single-pass low-HP vignette. */
  readonly lowHpBoxShadow: string;
  /** Suppresses full-screen flashing animations (Boss Phase shift / Player Hit flash). */
  readonly suppressFullscreenFlash: boolean;
  /** Opacity multiplier (0.24 under Anti-Flash, 1.0 normally) for edge tint feedback. */
  readonly flashOpacityScale: number;
  /** Directional hit arc remains visible even under Anti-Flash for fair tactical readability. */
  readonly showDirectionalHitArc: boolean;
  /** Enables geometric symbol prefixes on status banners so color is never the sole channel. */
  readonly useColorblindSymbols: boolean;
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

function resolveColorblindSymbol(kind: TopCombatBannerKind): string {
  switch (kind) {
    case 'phase_counter':
      return '◈';
    case 'finisher_ready':
    case 'boss_finisher':
      return '✦';
    case 'boss_telegraph':
    case 'boss_warning':
    case 'boss_entrance':
      return '▲';
    case 'boss_broken':
    case 'boss_part_broken':
      return '◆';
    case 'boss_phase_2':
    case 'boss_phase_3':
      return '⚡';
    case 'boss_punish':
      return '◎';
    default:
      return '★';
  }
}

/**
 * Resolves unified HUD edge/flash/vignette accessibility policy so `reduceScreenFlash`,
 * `reducedMotion`, and `colorblindTelegraphs` apply consistently across React HUD overlays
 * AND eliminates duplicate full-screen low-HP vignette overdraw on low-end GPUs.
 */
export function resolveHudVisualFeedbackPolicy(
  input: HudVisualFeedbackInput
): HudVisualFeedbackPolicy {
  const antiFlash = Boolean(input.reduceScreenFlash);
  const reducedMotion = Boolean(input.reducedMotion);
  const colorblind = Boolean(input.colorblindTelegraphs);
  const showLowHpVignette = input.hp > 0 && input.hpPct <= 30;
  const isCriticalLowHp = input.hp > 0 && input.hpPct <= 15;
  const animateLowHpVignette = showLowHpVignette && !antiFlash && !reducedMotion;

  const lowHpAlpha = antiFlash
    ? isCriticalLowHp
      ? 0.24
      : 0.16
    : isCriticalLowHp
    ? 0.56
    : 0.38;
  const lowHpSpread = isCriticalLowHp ? '96px 22px' : '78px 16px';
  const lowHpColor = colorblind
    ? `rgba(245, 158, 11, ${lowHpAlpha})` // High-contrast amber-gold edge for deuteranopia/protanopia safety
    : `rgba(225, 29, 72, ${lowHpAlpha})`;

  return {
    showLowHpVignette,
    isCriticalLowHp,
    animateLowHpVignette,
    lowHpBoxShadow: `inset 0 0 ${lowHpSpread} ${lowHpColor}`,
    suppressFullscreenFlash: antiFlash,
    flashOpacityScale: antiFlash ? 0.24 : 1.0,
    showDirectionalHitArc: true,
    useColorblindSymbols: colorblind,
  };
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
    | 'chapterId'
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
  isCompact: boolean,
  options?: ResolveTopCombatBannerOptions
): TopCombatBanner | null {
  const ultKey = (options?.ultKeyLabel || 'Q').trim();
  const heavyKey = (options?.heavyBreakKeyLabel || 'F').trim();
  const useCbSymbol = Boolean(options?.colorblindTelegraphs);
  const rawCh = options?.chapterId ?? hud.chapterId;
  const zodiacSig =
    typeof rawCh === 'number' && Number.isFinite(rawCh)
      ? ZODIAC_BOSS_PHASE_SIGNATURES[Math.max(1, Math.min(12, Math.floor(rawCh)))]
      : undefined;

  const finalize = (banner: TopCombatBanner): TopCombatBanner =>
    useCbSymbol ? { ...banner, colorblindSymbol: resolveColorblindSymbol(banner.kind) } : banner;

  // 0. Boss Entrance sequence (5-10s arrival — player attacks are locked until Boss finishes appearing)
  if (hud.bossEntranceActive && (hud.bossEntranceRemainingSec ?? 0) > 0) {
    const rem = Math.max(0, hud.bossEntranceRemainingSec ?? 0);
    const total = Math.max(1, hud.bossEntranceTotalSec ?? 6.0);
    const stageText =
      shortenBannerText(
        hud.bossEntranceStageLabel || 'Boss đang giáng lâm · Khóa tấn công',
        isCompact ? 28 : 42
      ) ?? 'Boss đang giáng lâm · Khóa tấn công';
    return finalize({
      id: 'boss_entrance_active',
      kind: 'boss_entrance',
      tone: 'crimson',
      kicker: 'BOSS XUẤT HIỆN',
      title: stageText,
      timerText: `${rem.toFixed(1)}s`,
      progressRatio: clamp01(1 - rem / total),
      priority: 105,
    });
  }

  // 1. Urgent interactive window: Phase transition counter-attack
  if (hud.phaseCounterReady && (hud.phaseCounterWindowSec ?? 0) > 0) {
    const rem = Math.max(0, hud.phaseCounterWindowSec ?? 0);
    const total = Math.max(0.5, hud.phaseCounterWindowTotalSec ?? 2.5);
    return finalize({
      id: 'phase_counter',
      kind: 'phase_counter',
      tone: 'cyan',
      kicker: 'PHẢN CÔNG PHA',
      title: isCompact ? `Bắn Chí Mạng / ${ultKey}` : `Bắn Chí Mạng hoặc bấm ${ultKey} ngay`,
      timerText: `${rem.toFixed(1)}s`,
      progressRatio: clamp01(rem / total),
      priority: 100,
    });
  }

  // 2. Urgent interactive window: Execution finisher ready
  if (hud.finisherReadyTargetName) {
    const hpPct = hud.finisherTargetHpPct ?? 18;
    return finalize({
      id: `finisher_ready_${hud.finisherReadyTargetName}`,
      kind: 'finisher_ready',
      tone: 'amber',
      kicker: 'KẾT LIỄU',
      title: shortenBannerText(hud.finisherReadyTargetName, isCompact ? 20 : 28) ?? 'Mục Tiêu',
      detail: `${hpPct}% · Bấm ${heavyKey} / ${ultKey}`,
      priority: 95,
    });
  }

  // 3. Active boss attack telegraph (critical dodge cue)
  if (hud.activeBossTelegraph && (hud.bossStunTimer ?? 0) <= 0.05) {
    const tg = hud.activeBossTelegraph;
    const isCritical = tg.dangerLevel === 'critical';
    const ratio = clamp01(tg.remainingSec / Math.max(0.25, tg.durationSec));
    return finalize({
      id: `telegraph_${tg.label}`,
      kind: 'boss_telegraph',
      tone: isCritical ? 'rose' : 'amber',
      kicker: shortenBannerText(tg.label, isCompact ? 18 : 26) ?? 'CẢNH BÁO',
      title: shortenBannerText(tg.actionHint, isCompact ? 22 : 34) ?? 'Né đòn!',
      timerText: `${Math.max(0, tg.remainingSec).toFixed(1)}s`,
      progressRatio: ratio,
      priority: 90,
    });
  }

  // 4. Boss execution slow-mo callout (compact top edge, never over Boss HP bar)
  if ((hud.bossFinisherTimer ?? 0) > 0 && hud.bossFinisherName) {
    return finalize({
      id: `boss_finisher_${hud.bossFinisherName}`,
      kind: 'boss_finisher',
      tone: 'amber',
      kicker: 'KẾT LIỄU HOÀNG ĐẠO',
      title: shortenBannerText(hud.bossFinisherName, isCompact ? 22 : 32) ?? hud.bossFinisherName,
      priority: 85,
    });
  }

  // 5. Boss guard-break burst
  if ((hud.bossBrokenBannerTimer ?? 0) > 0) {
    return finalize({
      id: 'boss_broken',
      kind: 'boss_broken',
      tone: 'gold',
      kicker: 'PHÁ GIÁP',
      title: '+45% Sát Thương',
      priority: 80,
    });
  }

  // 6. Boss Phase III shift (chapter-bespoke Zodiac signature + counterplay hint)
  if ((hud.bossPhaseThreeBannerTimer ?? 0) > 0) {
    return finalize({
      id: 'boss_phase_3',
      kind: 'boss_phase_3',
      tone: 'rose',
      kicker: shortenBannerText(zodiacSig?.phase3Title, isCompact ? 22 : 32) ?? 'PHA III TỐI THƯỢNG',
      title: zodiacSig
        ? shortenBannerText(zodiacSig.phase3Counterplay, isCompact ? 24 : 44) ?? '+24% Sát Thương Phản Đòn'
        : '+24% Sát Thương Phản Đòn',
      priority: 75,
    });
  }

  // 7. Boss Phase II shift (chapter-bespoke Zodiac signature + counterplay hint)
  if ((hud.bossPhaseTwoBannerTimer ?? 0) > 0) {
    return finalize({
      id: 'boss_phase_2',
      kind: 'boss_phase_2',
      tone: 'rose',
      kicker: shortenBannerText(zodiacSig?.phase2Title, isCompact ? 22 : 32) ?? 'PHA II CUỒNG NỘ',
      title: zodiacSig
        ? shortenBannerText(zodiacSig.phase2Counterplay, isCompact ? 24 : 44) ?? 'Boss Tăng Tốc'
        : 'Boss Tăng Tốc',
      priority: 70,
    });
  }

  // 8. Boss punish window
  if (hud.bossPunishActive && (hud.bossStunTimer ?? 0) <= 0.05) {
    return finalize({
      id: 'boss_punish',
      kind: 'boss_punish',
      tone: 'emerald',
      kicker: 'SƠ HỞ',
      title: `+${hud.bossPunishBonusPct ?? 18}% Sát Thương`,
      progressRatio: clamp01(hud.bossPunishRatio ?? 0),
      priority: 65,
    });
  }

  // 9. Boss warning / spawn intro (moved from center arena up to single slim top strip)
  if (hud.bossWarningTitle) {
    return finalize({
      id: `boss_warning_${hud.bossWarningTitle}`,
      kind: 'boss_warning',
      tone: 'crimson',
      kicker: 'THỦ LĨNH',
      title: shortenBannerText(hud.bossWarningTitle, isCompact ? 22 : 32) ?? hud.bossWarningTitle,
      detail: isCompact ? undefined : shortenBannerText(hud.bossWarningSubtitle, 38),
      priority: 60,
    });
  }

  if (bossIntroTitle) {
    return finalize({
      id: `boss_intro_${bossIntroTitle}`,
      kind: 'boss_intro',
      tone: 'crimson',
      kicker: 'KHAI CHIẾN',
      title: shortenBannerText(bossIntroTitle, isCompact ? 22 : 32) ?? bossIntroTitle,
      priority: 58,
    });
  }

  // 10. Breakable Boss part shattered
  if (hud.bossPartBrokenBanner) {
    const cleanText = hud.bossPartBrokenBanner.replace(/^PHÁ VỠ\s+/i, '').trim();
    return finalize({
      id: `boss_part_${cleanText}`,
      kind: 'boss_part_broken',
      tone: 'amber',
      kicker: 'VỠ BỘ PHẬN',
      title: shortenBannerText(cleanText, isCompact ? 24 : 38) ?? cleanText,
      priority: 55,
    });
  }

  // 11. Hero Ultimate cut-in strip
  if ((hud.ultCutinTimer ?? 0) > 0 && hud.ultCutinTitle) {
    return finalize({
      id: `ult_cutin_${hud.ultCutinTitle}`,
      kind: 'ult_cutin',
      tone: 'amber',
      kicker: 'TUYỆT KỸ',
      title: shortenBannerText(hud.ultCutinTitle, isCompact ? 22 : 30) ?? hud.ultCutinTitle,
      detail: isCompact ? undefined : hud.ultCutinHeroName || hud.heroName,
      priority: 50,
    });
  }

  return null;
}


import type { AdaptiveFpsTier, CoopTacticalOrder } from '../types/game';

/**
 * ============================================================================
 * WAVE 5 — PILLAR 1, 2 & 5 PURE COMBAT PRESENTATION & DETERMINISTIC SYSTEMS
 * ============================================================================
 * - Adaptive FPS Governor (adjusts DPR & particle budget smoothly without WebGL reset)
 * - Boss Finisher Presentation Director (1.15s cinematic slow-mo + zoom strictly after kill tick lock)
 * - Elemental Impact VFX & Boss Phase Atmosphere profiles
 * - Deterministic Co-op 3D Tactical Orders (Focus Boss / Clear Adds / Hold Resonance)
 */

export interface AdaptiveFpsModifiers {
  tier: AdaptiveFpsTier;
  dprScale: number;
  particleScale: number;
  label: string;
}

export interface AdaptiveFpsGovernor {
  enabled: boolean;
  tier: AdaptiveFpsTier;
  avgFps: number;
  lowFpsStreakSec: number;
  highFpsStreakSec: number;
  sampleCount: number;
}

export const ADAPTIVE_FPS_PROFILES: Record<AdaptiveFpsTier, AdaptiveFpsModifiers> = {
  full: {
    tier: 'full',
    dprScale: 1.0,
    particleScale: 1.0,
    label: 'Hiệu Năng Tối Đa',
  },
  balanced: {
    tier: 'balanced',
    dprScale: 0.85,
    particleScale: 0.72,
    label: 'Cân Bằng Mượt',
  },
  performance_guard: {
    tier: 'performance_guard',
    dprScale: 0.72,
    particleScale: 0.45,
    label: 'Bảo Vệ FPS',
  },
};

export function createAdaptiveFpsGovernor(enabled = true): AdaptiveFpsGovernor {
  return {
    enabled,
    tier: 'full',
    avgFps: 60,
    lowFpsStreakSec: 0,
    highFpsStreakSec: 0,
    sampleCount: 0,
  };
}

/**
 * Feeds real wall-clock frame delta into the sliding FPS monitor.
 * Evaluates against the device's target FPS (e.g. 30 FPS on Lite vs 60 FPS on discrete GPU)
 * so low-end laptops step down smoothly when struggling without false-triggering at their normal cap.
 */
export function sampleAdaptiveFpsFrame(
  gov: AdaptiveFpsGovernor,
  rawDtSec: number,
  targetFps = 60
): { tierChanged: boolean; modifiers: AdaptiveFpsModifiers } {
  const safeDt = Math.max(1 / 240, Math.min(0.25, rawDtSec));
  const instFps = Math.min(144, 1 / safeDt);
  gov.avgFps = gov.sampleCount === 0 ? instFps : gov.avgFps * 0.92 + instFps * 0.08;
  gov.sampleCount += 1;

  if (!gov.enabled) {
    const changed = gov.tier !== 'full';
    gov.tier = 'full';
    gov.lowFpsStreakSec = 0;
    gov.highFpsStreakSec = 0;
    return { tierChanged: changed, modifiers: ADAPTIVE_FPS_PROFILES.full };
  }

  const clampedTarget = Math.max(12, Math.min(60, targetFps));
  const warnFps = clampedTarget === 60 ? 38 : clampedTarget * 0.72;
  const criticalFps = clampedTarget === 60 ? 30 : clampedTarget * 0.56;
  const recoverFps = clampedTarget === 60 ? 52 : clampedTarget * 0.88;

  const prevTier = gov.tier;
  if (gov.avgFps < warnFps) {
    gov.lowFpsStreakSec += safeDt;
    gov.highFpsStreakSec = 0;
    if (gov.lowFpsStreakSec >= 2.5) {
      if (gov.tier === 'full') gov.tier = 'balanced';
      else if (gov.tier === 'balanced' && gov.avgFps < criticalFps) gov.tier = 'performance_guard';
      gov.lowFpsStreakSec = 0;
    }
  } else if (gov.avgFps >= recoverFps) {
    gov.highFpsStreakSec += safeDt;
    gov.lowFpsStreakSec = 0;
    if (gov.highFpsStreakSec >= 5.5) {
      if (gov.tier === 'performance_guard') gov.tier = 'balanced';
      else if (gov.tier === 'balanced') gov.tier = 'full';
      gov.highFpsStreakSec = 0;
    }
  } else {
    gov.lowFpsStreakSec = Math.max(0, gov.lowFpsStreakSec - safeDt * 0.5);
    gov.highFpsStreakSec = Math.max(0, gov.highFpsStreakSec - safeDt * 0.5);
  }

  return {
    tierChanged: prevTier !== gov.tier,
    modifiers: ADAPTIVE_FPS_PROFILES[gov.tier],
  };
}

export function getAdaptiveFpsModifiers(gov: AdaptiveFpsGovernor): AdaptiveFpsModifiers {
  return gov.enabled ? ADAPTIVE_FPS_PROFILES[gov.tier] : ADAPTIVE_FPS_PROFILES.full;
}

/**
 * Cinematic Boss Finisher presentation state (1.15s total).
 * Strictly visual — triggered AFTER Boss HP reaches 0 and verified run time is locked.
 */
export const BOSS_FINISHER_DURATION_SEC = 1.15;

export interface BossFinisherPresentation {
  active: boolean;
  progress: number; // 0 -> 1
  visualTimeScale: number; // dips to 0.22x then eases smoothly back to 1.0x
  cameraZoomBlend: number; // 0 -> 1 smooth exponential ease
  fovDelta: number; // narrows FOV slightly for dramatic impact
  shockwavePulse: number; // 0 -> 1 burst envelope
}

export function computeBossFinisherPresentation(
  remainingSec: number,
  durationSec = BOSS_FINISHER_DURATION_SEC
): BossFinisherPresentation {
  if (remainingSec <= 0 || durationSec <= 0) {
    return {
      active: false,
      progress: 1,
      visualTimeScale: 1,
      cameraZoomBlend: 0,
      fovDelta: 0,
      shockwavePulse: 0,
    };
  }
  const progress = Math.max(0, Math.min(1, 1 - remainingSec / durationSec));
  // Slow-mo holds crisp at 0.22x for first 45%, then ramps smoothly to 1.0x
  let visualTimeScale: number;
  if (progress < 0.45) {
    visualTimeScale = 0.22;
  } else {
    const t = (progress - 0.45) / 0.55;
    const smooth = t * t * (3 - 2 * t);
    visualTimeScale = 0.22 + 0.78 * smooth;
  }

  // Camera glides in smoothly then releases cleanly
  const cameraZoomBlend =
    progress < 0.3
      ? Math.sin((progress / 0.3) * (Math.PI / 2))
      : progress < 0.75
      ? 1
      : Math.cos(((progress - 0.75) / 0.25) * (Math.PI / 2));

  const fovDelta = -4.2 * cameraZoomBlend;
  const shockwavePulse = Math.max(0, 1 - progress * 1.45);

  return {
    active: true,
    progress: Number(progress.toFixed(4)),
    visualTimeScale: Number(visualTimeScale.toFixed(4)),
    cameraZoomBlend: Number(Math.max(0, Math.min(1, cameraZoomBlend)).toFixed(4)),
    fovDelta: Number(fovDelta.toFixed(3)),
    shockwavePulse: Number(shockwavePulse.toFixed(4)),
  };
}

export type CombatElementKind = 'fire' | 'ice' | 'lightning' | 'poison';

export const ELEMENTAL_IMPACT_VFX: Record<
  CombatElementKind,
  { primaryHex: number; secondaryHex: number; particleCount: number; ringRadius: number; label: string }
> = {
  fire: {
    primaryHex: 0xf97316,
    secondaryHex: 0xfde047,
    particleCount: 10,
    ringRadius: 1.55,
    label: 'Thiêu Đốt',
  },
  ice: {
    primaryHex: 0x38bdf8,
    secondaryHex: 0xe0f2fe,
    particleCount: 9,
    ringRadius: 1.45,
    label: 'Đóng Băng',
  },
  lightning: {
    primaryHex: 0xa855f7,
    secondaryHex: 0xf0abfc,
    particleCount: 12,
    ringRadius: 1.75,
    label: 'Lôi Đình',
  },
  poison: {
    primaryHex: 0x22c55e,
    secondaryHex: 0xbef264,
    particleCount: 9,
    ringRadius: 1.4,
    label: 'Kịch Độc',
  },
};

export const BOSS_PHASE_ATMOSPHERE: Record<
  1 | 2 | 3,
  { rimHex: number; rimIntensity: number; shockHex: number; bannerAccent: string }
> = {
  1: { rimHex: 0x38bdf8, rimIntensity: 1.15, shockHex: 0x38bdf8, bannerAccent: '#38bdf8' },
  2: { rimHex: 0xf59e0b, rimIntensity: 1.55, shockHex: 0xf59e0b, bannerAccent: '#f59e0b' },
  3: { rimHex: 0xf43f5e, rimIntensity: 1.95, shockHex: 0xf43f5e, bannerAccent: '#fb7185' },
};

/**
 * Co-op 3D Tactical Orders — deterministic targeting & Ult synchronization
 * Runs inside the 1/60s fixed simulation loop for 12/30/60 FPS bit-for-bit parity.
 */
export interface CoopTacticalOrderMeta {
  id: CoopTacticalOrder;
  hotkey: '1' | '2' | '3';
  shortLabel: string;
  callout: string;
  desc: string;
}

export const COOP_TACTICAL_ORDERS: CoopTacticalOrderMeta[] = [
  {
    id: 'focus_boss',
    hotkey: '1',
    shortLabel: 'Dồn Boss',
    callout: 'Lệnh Tổ Đội: Dồn toàn lực hạ Boss!',
    desc: '2 đồng đội khóa mục tiêu Boss và xoay góc tránh vùng đỏ.',
  },
  {
    id: 'clear_adds',
    hotkey: '2',
    shortLabel: 'Dọn Quái',
    callout: 'Lệnh Tổ Đội: Ưu tiên quét sạch quái phụ!',
    desc: 'Đồng đội dọn quái nhỏ/quái bắn xa để mở khoảng trống an toàn.',
  },
  {
    id: 'hold_resonance',
    hotkey: '3',
    shortLabel: 'Giữ Chiêu',
    callout: 'Lệnh Tổ Đội: Giữ Tuyệt Kỹ chờ Cộng Hưởng Liên Kích!',
    desc: 'Đồng đội giữ Tuyệt Kỹ 100% và tung ngay khi bạn bấm Q (+25% ST Boss).',
  },
];

export const WAVE9_COOP_QUICK_ORDERS: CoopTacticalOrderMeta[] = [
  {
    id: 'focus_boss',
    hotkey: '1',
    shortLabel: 'Tập Trung Boss',
    callout: 'Lệnh Tổ Đội: Dồn toàn lực hạ Boss!',
    desc: 'Đồng đội khóa mục tiêu Boss và xoay góc tránh vùng đỏ.',
  },
  {
    id: 'break_guard',
    hotkey: '2',
    shortLabel: 'Phá Giáp',
    callout: 'Lệnh Tổ Đội: Tập trung phá giáp & mồi Liên Kích!',
    desc: 'Đồng đội ưu tiên bào thanh giáp Boss/Tinh Anh và hô lệnh khi sắp tung Tuyệt Kỹ.',
  },
  {
    id: 'protect_player',
    hotkey: '3',
    shortLabel: 'Hộ Vệ',
    callout: 'Lệnh Tổ Đội: Hộ Vệ & Sẵn sàng thả Vòng Hộ Mệnh!',
    desc: 'Đồng đội áp sát bảo vệ bạn, hạ quái áp sát và mở Vòng Hộ Mệnh sớm hơn (<50% HP).',
  },
];

export interface CoopTargetCandidate {
  id: string | number;
  x: number;
  z: number;
  isBoss: boolean;
  isElite: boolean;
  hp: number;
  alive: boolean;
}

export function selectCoopAllyTarget<T extends CoopTargetCandidate>(
  enemies: readonly T[],
  allyX: number,
  allyZ: number,
  order: CoopTacticalOrder,
  playerX = 0,
  playerZ = 0
): T | null {
  const living = enemies.filter((e) => e.alive && e.hp > 0);
  if (living.length === 0) return null;

  if (order === 'focus_boss' || order === 'break_guard') {
    const boss = living.find((e) => e.isBoss);
    if (boss) return boss;
    if (order === 'break_guard') {
      const elite = living.find((e) => e.isElite);
      if (elite) return elite;
    }
  } else if (order === 'protect_player') {
    let closestToPlayer = living[0];
    let bestDistSq =
      (closestToPlayer.x - playerX) ** 2 + (closestToPlayer.z - playerZ) ** 2;
    for (let i = 1; i < living.length; i++) {
      const dSq = (living[i].x - playerX) ** 2 + (living[i].z - playerZ) ** 2;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        closestToPlayer = living[i];
      }
    }
    return closestToPlayer;
  } else if (order === 'clear_adds') {
    const adds = living.filter((e) => !e.isBoss);
    if (adds.length > 0) {
      let closestAdd = adds[0];
      let bestDistSq = (closestAdd.x - allyX) ** 2 + (closestAdd.z - allyZ) ** 2;
      for (let i = 1; i < adds.length; i++) {
        const dSq = (adds[i].x - allyX) ** 2 + (adds[i].z - allyZ) ** 2;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          closestAdd = adds[i];
        }
      }
      return closestAdd;
    }
  }

  // Default / fallback (including hold_resonance): prioritize boss if close or nearest enemy
  let best = living[0];
  let bestScore = Infinity;
  for (const e of living) {
    const dist = Math.hypot(e.x - allyX, e.z - allyZ);
    const score = e.isBoss && order === 'hold_resonance' ? dist * 0.65 : dist;
    if (score < bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return best;
}

/**
 * Determines whether a Co-op AI teammate at 100% Ult should hold their cast
 * waiting for the player's Q cast so they trigger +25% Co-op Ult Resonance!
 */
export function shouldCoopAllyHoldUlt(params: {
  order: CoopTacticalOrder;
  playerUltRecentRemainingSec: number;
  resonanceRemainingSec: number;
}): boolean {
  if (params.order !== 'hold_resonance') return false;
  // If player just cast Q within the 4s resonance window, fire immediately to trigger +25% Resonance!
  if (params.playerUltRecentRemainingSec > 0) return false;
  // Otherwise hold until player casts Q (or resonance is already active, keep holding for next cycle)
  return true;
}

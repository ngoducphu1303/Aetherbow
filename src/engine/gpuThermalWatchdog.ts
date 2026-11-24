import type { GpuProfileSummary, GpuWatchdogStage } from '../types/game';

/**
 * Real-Time GPU Thermal & Frame-Time Auto-Downgrade Watchdog
 * Protects low-end laptops (e.g. Dell Latitude E5430 / Intel HD 4000) across ALL chapters
 * and future content updates by stepping down GPU load mid-run before TDR black screens or crashes.
 */

export interface GpuWatchdogBudget {
  stage: GpuWatchdogStage;
  label: string;
  bloomAllowed: boolean;
  starfallAllowed: boolean;
  shadowsAllowed: boolean;
  particleBudgetScale: number;
  dprCap: number;
  dynamicArenaLights: boolean;
  forceLiteSafety: boolean;
}

export const GPU_WATCHDOG_STAGE_BUDGETS: Record<GpuWatchdogStage, GpuWatchdogBudget> = {
  0: {
    stage: 0,
    label: 'Chuẩn',
    bloomAllowed: true,
    starfallAllowed: true,
    shadowsAllowed: true,
    particleBudgetScale: 1.0,
    dprCap: 2.0,
    dynamicArenaLights: true,
    forceLiteSafety: false,
  },
  1: {
    stage: 1,
    label: 'Hạ Bậc 1 (Tắt Bloom & Thời Tiết)',
    bloomAllowed: false,
    starfallAllowed: false,
    shadowsAllowed: true,
    particleBudgetScale: 0.8,
    dprCap: 1.5,
    dynamicArenaLights: true,
    forceLiteSafety: false,
  },
  2: {
    stage: 2,
    label: 'Hạ Bậc 2 (Tắt Đổ Bóng & Giảm 50% Hạt)',
    bloomAllowed: false,
    starfallAllowed: false,
    shadowsAllowed: false,
    particleBudgetScale: 0.5,
    dprCap: 1.15,
    dynamicArenaLights: true,
    forceLiteSafety: false,
  },
  3: {
    stage: 3,
    label: 'Hạ Bậc 3 (DPR 0.75x & Tắt Đèn Động)',
    bloomAllowed: false,
    starfallAllowed: false,
    shadowsAllowed: false,
    particleBudgetScale: 0.3,
    dprCap: 0.75,
    dynamicArenaLights: false,
    forceLiteSafety: false,
  },
  4: {
    stage: 4,
    label: 'Bảo Vệ Khẩn Cấp Lite (Chống Treo GPU)',
    bloomAllowed: false,
    starfallAllowed: false,
    shadowsAllowed: false,
    particleBudgetScale: 0.18,
    dprCap: 0.65,
    dynamicArenaLights: false,
    forceLiteSafety: true,
  },
};

export interface GpuWatchdogState {
  enabled: boolean;
  stage: GpuWatchdogStage;
  minFloorStage: GpuWatchdogStage;
  lagAccumSec: number;
  healthyAccumSec: number;
  contextLostCount: number;
  ewmaFrameMs: number;
  lastTransitionReason: string | null;
}

export interface GpuWatchdogStepResult {
  next: GpuWatchdogState;
  changed: boolean;
  direction: 'none' | 'downgrade' | 'recover';
  budget: GpuWatchdogBudget;
  notice: string | null;
  shouldPersistSafeLatch: boolean;
}

const LAG_TRIGGER_FRAME_MS = 38.0; // < ~26.3 FPS sustained
const SEVERE_LAG_FRAME_MS = 65.0; // < ~15.4 FPS severe stall
const DOWNGRADE_WINDOW_SEC = 3.5;
const SEVERE_DOWNGRADE_WINDOW_SEC = 1.6;
const RECOVERY_FRAME_MS = 19.5; // >= ~51.3 FPS sustained
const RECOVERY_WINDOW_SEC = 10.0;

export function createGpuWatchdogState(
  profile?: GpuProfileSummary | null,
  enabled = true
): GpuWatchdogState {
  let minFloorStage: GpuWatchdogStage = 0;
  if (profile) {
    if (profile.tier === 'software' || profile.crashGuardTripped) {
      minFloorStage = 4;
    } else if (profile.lowPowerLegacyGpu || profile.deviceTier === 'ultra_lite') {
      // Dell Latitude E5430 / Intel HD 4000 begins directly at Stage 2 safety floor
      minFloorStage = 2;
    } else if (profile.deviceTier === 'lite') {
      minFloorStage = 1;
    }
  }
  return {
    enabled,
    stage: minFloorStage,
    minFloorStage,
    lagAccumSec: 0,
    healthyAccumSec: 0,
    contextLostCount: 0,
    ewmaFrameMs: 16.7,
    lastTransitionReason: null,
  };
}

export function getGpuWatchdogBudget(stage: GpuWatchdogStage): GpuWatchdogBudget {
  return GPU_WATCHDOG_STAGE_BUDGETS[stage];
}

/**
 * Feeds one real frame duration (in ms) into the watchdog.
 * Uses EWMA smoothing + hysteresis windows so single GC spikes never cause flicker,
 * while genuine sustained GPU overload steps down smoothly across all chapters.
 */
export function stepGpuThermalWatchdog(
  state: GpuWatchdogState,
  rawFrameMs: number
): GpuWatchdogStepResult {
  const clampedMs = Math.max(4, Math.min(250, Number.isFinite(rawFrameMs) ? rawFrameMs : 16.7));
  const dtSec = Math.min(0.25, clampedMs / 1000);
  const ewmaFrameMs = state.ewmaFrameMs * 0.88 + clampedMs * 0.12;

  if (!state.enabled) {
    const unchanged: GpuWatchdogState = {
      ...state,
      ewmaFrameMs,
      lagAccumSec: 0,
      healthyAccumSec: 0,
    };
    return {
      next: unchanged,
      changed: false,
      direction: 'none',
      budget: getGpuWatchdogBudget(unchanged.stage),
      notice: null,
      shouldPersistSafeLatch: false,
    };
  }

  let lagAccumSec = state.lagAccumSec;
  let healthyAccumSec = state.healthyAccumSec;

  if (ewmaFrameMs >= LAG_TRIGGER_FRAME_MS || clampedMs >= SEVERE_LAG_FRAME_MS) {
    lagAccumSec += dtSec;
    healthyAccumSec = 0;
  } else if (ewmaFrameMs <= RECOVERY_FRAME_MS) {
    healthyAccumSec += dtSec;
    lagAccumSec = Math.max(0, lagAccumSec - dtSec * 0.5);
  } else {
    lagAccumSec = Math.max(0, lagAccumSec - dtSec * 0.25);
    healthyAccumSec = 0;
  }

  const requiredLagWindow =
    ewmaFrameMs >= SEVERE_LAG_FRAME_MS ? SEVERE_DOWNGRADE_WINDOW_SEC : DOWNGRADE_WINDOW_SEC;

  if (lagAccumSec >= requiredLagWindow && state.stage < 4) {
    const nextStage = (state.stage + 1) as GpuWatchdogStage;
    const budget = getGpuWatchdogBudget(nextStage);
    const estFps = Math.max(1, Math.round(1000 / ewmaFrameMs));
    const notice =
      nextStage === 4
        ? `Watchdog GPU (${estFps} FPS): Đã bật Chế Độ Lite Khẩn Cấp để bảo vệ thiết bị.`
        : `Watchdog GPU (${estFps} FPS): Tự động chuyển sang ${budget.label}.`;
    return {
      next: {
        ...state,
        stage: nextStage,
        lagAccumSec: 0,
        healthyAccumSec: 0,
        ewmaFrameMs,
        lastTransitionReason: notice,
      },
      changed: true,
      direction: 'downgrade',
      budget,
      notice,
      shouldPersistSafeLatch: nextStage === 4,
    };
  }

  if (healthyAccumSec >= RECOVERY_WINDOW_SEC && state.stage > state.minFloorStage && state.contextLostCount === 0) {
    const nextStage = (state.stage - 1) as GpuWatchdogStage;
    const budget = getGpuWatchdogBudget(nextStage);
    const notice = `Watchdog GPU: Hiệu năng ổn định, khôi phục về ${budget.label}.`;
    return {
      next: {
        ...state,
        stage: nextStage,
        lagAccumSec: 0,
        healthyAccumSec: 0,
        ewmaFrameMs,
        lastTransitionReason: notice,
      },
      changed: true,
      direction: 'recover',
      budget,
      notice,
      shouldPersistSafeLatch: false,
    };
  }

  return {
    next: {
      ...state,
      lagAccumSec,
      healthyAccumSec,
      ewmaFrameMs,
    },
    changed: false,
    direction: 'none',
    budget: getGpuWatchdogBudget(state.stage),
    notice: null,
    shouldPersistSafeLatch: false,
  };
}

/**
 * Handles WebGL context loss immediately by jumping to Emergency Stage 4 Lite Mode
 * and requesting a persistent crash-safe latch for subsequent boots.
 */
export function handleGpuWatchdogContextLost(
  state: GpuWatchdogState
): GpuWatchdogStepResult {
  const budget = getGpuWatchdogBudget(4);
  const notice =
    'Phát hiện mất ngữ cảnh GPU (WebGL Context Lost) · Watchdog đã kích hoạt Chế Độ Lite An Toàn.';
  return {
    next: {
      ...state,
      stage: 4,
      minFloorStage: 4,
      lagAccumSec: 0,
      healthyAccumSec: 0,
      contextLostCount: state.contextLostCount + 1,
      lastTransitionReason: notice,
    },
    changed: state.stage !== 4,
    direction: state.stage !== 4 ? 'downgrade' : 'none',
    budget,
    notice,
    shouldPersistSafeLatch: true,
  };
}

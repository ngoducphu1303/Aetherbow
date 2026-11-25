import type { GpuProfileSummary } from '../types/game';

export type GpuWatchdogStage = 0 | 1 | 2 | 3 | 4;

export interface GpuWatchdogBudget {
  stage: GpuWatchdogStage;
  dprCap: number;
  shadowsAllowed: boolean;
  bloomAllowed: boolean;
  starfallAllowed: boolean;
  dynamicArenaLights: boolean;
  particleScale: number;
  particleBudgetScale: number;
  forceLiteSafety: boolean;
  label: string;
}

export interface GpuWatchdogState {
  stage: GpuWatchdogStage;
  floorStage: GpuWatchdogStage;
  minFloorStage: GpuWatchdogStage;
  enabled: boolean;
  emaFrameMs: number;
  ewmaFrameMs: number;
  lagAccumSec: number;
  healthyAccumSec: number;
  highLagStreakSec: number;
  recoveryStreakSec: number;
  contextLostCount: number;
}

export interface GpuWatchdogStepResult {
  next: GpuWatchdogState;
  changed: boolean;
  direction: 'none' | 'downgrade' | 'recover';
  shouldPersistSafeLatch: boolean;
  budget: GpuWatchdogBudget;
  notice?: string;
}

const BUDGETS: Record<GpuWatchdogStage, GpuWatchdogBudget> = {
  0: {
    stage: 0,
    dprCap: 1.5,
    shadowsAllowed: true,
    bloomAllowed: true,
    starfallAllowed: true,
    dynamicArenaLights: true,
    particleScale: 1.0,
    particleBudgetScale: 1.0,
    forceLiteSafety: false,
    label: 'Mức 0 · Chuẩn Đầy Đủ',
  },
  1: {
    stage: 1,
    dprCap: 1.25,
    shadowsAllowed: true,
    bloomAllowed: false,
    starfallAllowed: true,
    dynamicArenaLights: true,
    particleScale: 0.8,
    particleBudgetScale: 0.8,
    forceLiteSafety: false,
    label: 'Mức 1 · Tắt Bloom',
  },
  2: {
    stage: 2,
    dprCap: 1.0,
    shadowsAllowed: false,
    bloomAllowed: false,
    starfallAllowed: false,
    dynamicArenaLights: false,
    particleScale: 0.6,
    particleBudgetScale: 0.6,
    forceLiteSafety: false,
    label: 'Mức 2 · E5430 An Toàn',
  },
  3: {
    stage: 3,
    dprCap: 0.85,
    shadowsAllowed: false,
    bloomAllowed: false,
    starfallAllowed: false,
    dynamicArenaLights: false,
    particleScale: 0.4,
    particleBudgetScale: 0.4,
    forceLiteSafety: false,
    label: 'Mức 3 · Tiết Kiệm GPU',
  },
  4: {
    stage: 4,
    dprCap: 0.7,
    shadowsAllowed: false,
    bloomAllowed: false,
    starfallAllowed: false,
    dynamicArenaLights: false,
    particleScale: 0.25,
    particleBudgetScale: 0.25,
    forceLiteSafety: true,
    label: 'Mức 4 · An Toàn Tối Đa Lite',
  },
};

export function createGpuWatchdogState(
  profile: Partial<GpuProfileSummary> | null | undefined,
  enabled = true
): GpuWatchdogState {
  const isLegacyOrLowEnd = Boolean(
    profile &&
      (profile.lowPowerLegacyGpu ||
        profile.tier === 'software' ||
        profile.deviceTier === 'ultra_lite' ||
        profile.deviceTier === 'lite' ||
        profile.recommendedQuality === 'low' ||
        profile.crashGuardTripped)
  );
  const floorStage: GpuWatchdogStage = isLegacyOrLowEnd ? 2 : 0;
  return {
    stage: floorStage,
    floorStage,
    minFloorStage: floorStage,
    enabled,
    emaFrameMs: 16.7,
    ewmaFrameMs: 16.7,
    lagAccumSec: 0,
    healthyAccumSec: 0,
    highLagStreakSec: 0,
    recoveryStreakSec: 0,
    contextLostCount: 0,
  };
}

export function getGpuWatchdogBudget(stage: GpuWatchdogStage): GpuWatchdogBudget {
  return BUDGETS[stage] ?? BUDGETS[2];
}

export const resolveGpuWatchdogBudget = getGpuWatchdogBudget;

export function stepGpuThermalWatchdog(
  state: GpuWatchdogState,
  rawFrameMs: number
): GpuWatchdogStepResult {
  const clampedMs = Math.max(4, Math.min(250, Number.isFinite(rawFrameMs) ? rawFrameMs : 16.7));
  const dtSec = clampedMs / 1000;
  const baseEma = Number.isFinite(state.ewmaFrameMs) ? state.ewmaFrameMs : state.emaFrameMs;
  const ema = baseEma * 0.82 + clampedMs * 0.18;

  const effectiveFloor = Math.max(state.floorStage, state.minFloorStage) as GpuWatchdogStage;

  if (!state.enabled) {
    const next: GpuWatchdogState = {
      ...state,
      floorStage: effectiveFloor,
      minFloorStage: effectiveFloor,
      emaFrameMs: ema,
      ewmaFrameMs: ema,
    };
    return {
      next,
      changed: false,
      direction: 'none',
      shouldPersistSafeLatch: false,
      budget: getGpuWatchdogBudget(state.stage),
    };
  }

  let stage = state.stage;
  let lagAccumSec = state.lagAccumSec;
  let healthyAccumSec = state.healthyAccumSec;
  let changed = false;
  let direction: 'none' | 'downgrade' | 'recover' = 'none';
  let shouldPersistSafeLatch = false;
  let notice: string | undefined;

  if (ema >= 38) {
    lagAccumSec += dtSec;
    healthyAccumSec = 0;
    if (lagAccumSec >= 2.2 && stage < 4) {
      stage = (stage + 1) as GpuWatchdogStage;
      lagAccumSec = 0;
      changed = true;
      direction = 'downgrade';
      if (stage === 4) {
        shouldPersistSafeLatch = true;
      }
      notice = `Bảo vệ GPU tự động chuyển sang ${BUDGETS[stage].label}`;
    }
  } else if (ema <= 22) {
    healthyAccumSec += dtSec;
    lagAccumSec = Math.max(0, lagAccumSec - dtSec * 0.5);
    if (healthyAccumSec >= 10 && stage > effectiveFloor) {
      stage = (stage - 1) as GpuWatchdogStage;
      healthyAccumSec = 0;
      changed = true;
      direction = 'recover';
      notice = `GPU ổn định · Khôi phục ${BUDGETS[stage].label}`;
    }
  } else {
    lagAccumSec = Math.max(0, lagAccumSec - dtSec * 0.25);
    healthyAccumSec = Math.max(0, healthyAccumSec - dtSec * 0.25);
  }

  const next: GpuWatchdogState = {
    ...state,
    stage,
    floorStage: effectiveFloor,
    minFloorStage: effectiveFloor,
    emaFrameMs: ema,
    ewmaFrameMs: ema,
    lagAccumSec,
    healthyAccumSec,
    highLagStreakSec: lagAccumSec,
    recoveryStreakSec: healthyAccumSec,
  };

  return {
    next,
    changed,
    direction,
    shouldPersistSafeLatch,
    budget: getGpuWatchdogBudget(next.stage),
    notice,
  };
}

export function handleGpuWatchdogContextLost(state: GpuWatchdogState): {
  next: GpuWatchdogState;
  budget: GpuWatchdogBudget;
  shouldPersistSafeLatch: boolean;
  notice: string;
} {
  const next: GpuWatchdogState = {
    ...state,
    stage: 4,
    floorStage: 4,
    minFloorStage: 4,
    lagAccumSec: 0,
    healthyAccumSec: 0,
    highLagStreakSec: 0,
    recoveryStreakSec: 0,
    contextLostCount: state.contextLostCount + 1,
  };
  return {
    next,
    budget: getGpuWatchdogBudget(4),
    shouldPersistSafeLatch: true,
    notice: 'Phát hiện mất ngữ cảnh WebGL · Đã kích hoạt Chế Độ Lite An Toàn (Mức 4).',
  };
}

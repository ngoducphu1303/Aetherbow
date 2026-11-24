import type { GpuWatchdogStage } from '../types/game';

export interface WatchdogGpuProfileInput {
  isLowEnd?: boolean;
  tier?: string;
}

export interface GpuWatchdogBudget {
  stage: GpuWatchdogStage;
  dprCap: number;
  bloomAllowed: boolean;
  starfallAllowed: boolean;
  shadowsAllowed: boolean;
  dynamicArenaLights: boolean;
  particleBudgetScale: number;
}

export interface GpuWatchdogState {
  enabled: boolean;
  stage: GpuWatchdogStage;
  lowEndStart: boolean;
  slowFrameStreakMs: number;
  healthyFrameStreakMs: number;
  contextLostCount: number;
  latchPersisted: boolean;
}

export interface GpuWatchdogStepResult {
  next: GpuWatchdogState;
  changed: boolean;
  budget: GpuWatchdogBudget;
  notice: string | null;
  shouldPersistSafeLatch: boolean;
}

const STAGE_BUDGETS: Record<GpuWatchdogStage, GpuWatchdogBudget> = {
  0: {
    stage: 0,
    dprCap: 1.5,
    bloomAllowed: true,
    starfallAllowed: true,
    shadowsAllowed: true,
    dynamicArenaLights: true,
    particleBudgetScale: 1.0,
  },
  1: {
    stage: 1,
    dprCap: 1.25,
    bloomAllowed: false,
    starfallAllowed: true,
    shadowsAllowed: true,
    dynamicArenaLights: true,
    particleBudgetScale: 0.78,
  },
  2: {
    stage: 2,
    dprCap: 1.0,
    bloomAllowed: false,
    starfallAllowed: false,
    shadowsAllowed: false,
    dynamicArenaLights: true,
    particleBudgetScale: 0.56,
  },
  3: {
    stage: 3,
    dprCap: 0.85,
    bloomAllowed: false,
    starfallAllowed: false,
    shadowsAllowed: false,
    dynamicArenaLights: false,
    particleBudgetScale: 0.36,
  },
  4: {
    stage: 4,
    dprCap: 0.75,
    bloomAllowed: false,
    starfallAllowed: false,
    shadowsAllowed: false,
    dynamicArenaLights: false,
    particleBudgetScale: 0.22,
  },
};

export function resolveGpuWatchdogBudget(stage: GpuWatchdogStage): GpuWatchdogBudget {
  return STAGE_BUDGETS[stage] ?? STAGE_BUDGETS[2];
}

export function createGpuWatchdogState(
  profile: WatchdogGpuProfileInput | null,
  enabled = true
): GpuWatchdogState {
  const lowEndStart = Boolean(profile?.isLowEnd || profile?.tier === 'low');
  const initialStage: GpuWatchdogStage = lowEndStart ? 2 : 0;
  return {
    enabled: Boolean(enabled),
    stage: initialStage,
    lowEndStart,
    slowFrameStreakMs: 0,
    healthyFrameStreakMs: 0,
    contextLostCount: 0,
    latchPersisted: false,
  };
}

export function stepGpuThermalWatchdog(
  state: GpuWatchdogState,
  rawFrameMs: number
): GpuWatchdogStepResult {
  if (!state.enabled || !Number.isFinite(rawFrameMs) || rawFrameMs <= 0) {
    return {
      next: state,
      changed: false,
      budget: resolveGpuWatchdogBudget(state.stage),
      notice: null,
      shouldPersistSafeLatch: false,
    };
  }

  const clampedMs = Math.min(250, rawFrameMs);
  const next: GpuWatchdogState = { ...state };
  const slowThresholdMs = state.stage >= 2 ? 44 : 38;
  const healthyThresholdMs = 24;

  if (clampedMs >= slowThresholdMs) {
    next.slowFrameStreakMs += clampedMs;
    next.healthyFrameStreakMs = 0;
  } else if (clampedMs <= healthyThresholdMs) {
    next.healthyFrameStreakMs += clampedMs;
    next.slowFrameStreakMs = Math.max(0, next.slowFrameStreakMs - clampedMs * 0.5);
  } else {
    next.slowFrameStreakMs = Math.max(0, next.slowFrameStreakMs - clampedMs * 0.25);
  }

  let changed = false;
  let notice: string | null = null;
  let shouldPersistSafeLatch = false;

  if (next.slowFrameStreakMs >= 1600 && next.stage < 4) {
    next.stage = (next.stage + 1) as GpuWatchdogStage;
    next.slowFrameStreakMs = 0;
    next.healthyFrameStreakMs = 0;
    changed = true;
    notice = `Watchdog GPU (Bậc ${next.stage}/4): Đã tự động hạ hiệu ứng để giữ khung hình ổn định.`;
    if (next.stage >= 3 && !next.latchPersisted) {
      next.latchPersisted = true;
      shouldPersistSafeLatch = true;
    }
  } else {
    const floorStage: GpuWatchdogStage = next.lowEndStart ? 2 : 0;
    if (next.healthyFrameStreakMs >= 9000 && next.stage > floorStage) {
      next.stage = (next.stage - 1) as GpuWatchdogStage;
      next.healthyFrameStreakMs = 0;
      changed = true;
      notice = null;
    }
  }

  return {
    next,
    changed,
    budget: resolveGpuWatchdogBudget(next.stage),
    notice,
    shouldPersistSafeLatch,
  };
}

export function handleGpuWatchdogContextLost(state: GpuWatchdogState): {
  next: GpuWatchdogState;
  notice: string;
} {
  const next: GpuWatchdogState = {
    ...state,
    stage: 4,
    contextLostCount: state.contextLostCount + 1,
    slowFrameStreakMs: 0,
    healthyFrameStreakMs: 0,
    latchPersisted: true,
  };
  return {
    next,
    notice: 'Phát hiện gián đoạn WebGL · Watchdog GPU đã khóa Chế Độ Lite Bậc 4 để bảo vệ thiết bị.',
  };
}

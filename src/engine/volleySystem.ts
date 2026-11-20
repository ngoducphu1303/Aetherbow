export interface VolleySkillCounts {
  multishot?: number;
  front_arrow?: number;
  diag_arrow?: number;
  rear_arrow?: number;
}

export interface VolleyShotEntry {
  delay: number;
  angleOffset: number;
  backward?: boolean;
  lateral: number;
  isPrimary: boolean;
}

export type ArrowDamageSource = 'basic' | 'ultimate' | 'pet' | 'elemental';

export interface PrimaryArrowEnhancementInput {
  isPrimary: boolean;
  dmgSource: ArrowDamageSource;
  counterShotTimer: number;
  astralOvercharge: number;
}

export interface PrimaryArrowEnhancementResult {
  isCounterShot: boolean;
  isOvercharge: boolean;
  nextCounterShotTimer: number;
  nextAstralOvercharge: number;
}

export const VOLLEY_STAGGER_SECONDS = 0.065;
export const FRONT_ARROW_LATERAL_STEP = 0.42;
export const DIAGONAL_ARROW_ANGLE_STEP = 0.45;

/**
 * Builds a deterministic volley queue where exactly ONE front arrow in the first
 * burst (`v === 0`) is tagged `isPrimary: true`.
 *
 * - Single front arrow (`front_arrow = 0`): `f = 0`, `lateral = 0`, `isPrimary = true`.
 * - Dual front arrows (`front_arrow = 1`, Bắn Đôi): `f = 0` (`lateral = -0.21`) is
 *   designated primary so Overcharge / CounterShot always triggers cleanly instead of
 *   being skipped by a center-offset check.
 * - Triple front arrows (`front_arrow = 2`): center arrow (`f = 1`, `lateral = 0`) is primary.
 * - Diagonal, rear, and `v > 0` (Đa Tiễn) shots are always `isPrimary = false`.
 */
export function buildPlayerVolley(skills: VolleySkillCounts): VolleyShotEntry[] {
  const multi = Math.max(0, Math.floor(skills.multishot ?? 0));
  const front = Math.max(0, Math.floor(skills.front_arrow ?? 0));
  const diag = Math.max(0, Math.floor(skills.diag_arrow ?? 0));
  const rear = Math.max(0, Math.floor(skills.rear_arrow ?? 0));

  const entries: VolleyShotEntry[] = [];
  const volleys = 1 + multi;
  const frontCount = 1 + front;
  const primaryFrontIndex = Math.floor((frontCount - 1) / 2);

  for (let v = 0; v < volleys; v++) {
    const delay = v * VOLLEY_STAGGER_SECONDS;
    // Push primary front arrow first within burst 0 so FIFO draining guarantees
    // the primary shot resolves before any secondary/diagonal/rear arrows.
    const frontOrder: number[] = [];
    if (v === 0) {
      frontOrder.push(primaryFrontIndex);
      for (let f = 0; f < frontCount; f++) {
        if (f !== primaryFrontIndex) frontOrder.push(f);
      }
    } else {
      for (let f = 0; f < frontCount; f++) {
        frontOrder.push(f);
      }
    }

    for (const f of frontOrder) {
      const lateral = (f - (frontCount - 1) / 2) * FRONT_ARROW_LATERAL_STEP;
      entries.push({
        delay,
        angleOffset: 0,
        lateral,
        isPrimary: v === 0 && f === primaryFrontIndex,
      });
    }

    for (let d = 1; d <= diag; d++) {
      const ang = d * DIAGONAL_ARROW_ANGLE_STEP;
      entries.push({ delay, angleOffset: ang, lateral: 0, isPrimary: false });
      entries.push({ delay, angleOffset: -ang, lateral: 0, isPrimary: false });
    }

    if (rear > 0) {
      entries.push({ delay, angleOffset: 0, backward: true, lateral: 0, isPrimary: false });
    }
  }

  return entries;
}

/**
 * Advances every queued shot by `dt` and returns ready shots in strict FIFO order.
 * Never reverses queue order, preventing tail diagonal/rear arrows from firing before
 * the designated primary front arrow.
 */
export function drainReadyVolleyShots(
  queue: VolleyShotEntry[],
  dt: number
): { ready: VolleyShotEntry[]; remaining: VolleyShotEntry[] } {
  const ready: VolleyShotEntry[] = [];
  const remaining: VolleyShotEntry[] = [];

  for (let i = 0; i < queue.length; i++) {
    const entry = queue[i];
    const nextDelay = entry.delay - dt;
    if (nextDelay <= 0) {
      ready.push({ ...entry, delay: 0 });
    } else {
      remaining.push({ ...entry, delay: nextDelay });
    }
  }

  return { ready, remaining };
}

/**
 * Resolves CounterShot (Phản Tiễn) and Astral Overcharge (Tụ Lực) consumption for a
 * single launched arrow.
 *
 * Rules:
 * 1. Only basic arrows explicitly tagged `isPrimary === true` may consume CounterShot
 *    or Astral Overcharge.
 * 2. CounterShot takes precedence and preserves Astral Overcharge for the next volley.
 * 3. Secondary front arrows, diagonal arrows, rear arrows, and later multishot bursts
 *    never steal either resource.
 */
export function resolvePrimaryArrowEnhancement(
  input: PrimaryArrowEnhancementInput
): PrimaryArrowEnhancementResult {
  if (input.dmgSource !== 'basic' || !input.isPrimary) {
    return {
      isCounterShot: false,
      isOvercharge: false,
      nextCounterShotTimer: input.counterShotTimer,
      nextAstralOvercharge: input.astralOvercharge,
    };
  }

  if (input.counterShotTimer > 0) {
    return {
      isCounterShot: true,
      isOvercharge: false,
      nextCounterShotTimer: 0,
      nextAstralOvercharge: input.astralOvercharge,
    };
  }

  if (input.astralOvercharge >= 1) {
    return {
      isCounterShot: false,
      isOvercharge: true,
      nextCounterShotTimer: input.counterShotTimer,
      nextAstralOvercharge: 0,
    };
  }

  return {
    isCounterShot: false,
    isOvercharge: false,
    nextCounterShotTimer: input.counterShotTimer,
    nextAstralOvercharge: input.astralOvercharge,
  };
}

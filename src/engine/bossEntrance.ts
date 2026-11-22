export type BossEntranceStage =
  | 'summon_rift'
  | 'descent'
  | 'landing_roar'
  | 'ready_lock'
  | 'complete';

/** Standard Boss entrance duration (seconds) — within user-requested 5–10s window. */
export const BOSS_ENTRANCE_SUB_DURATION_SEC = 6.0;

/** Major / Zodiac / Dragon / Seraph Boss entrance duration (seconds) — within 5–10s window. */
export const BOSS_ENTRANCE_MAJOR_DURATION_SEC = 7.0;

export const BOSS_ENTRANCE_MIN_DURATION_SEC = 5.0;
export const BOSS_ENTRANCE_MAX_DURATION_SEC = 10.0;

export interface BossEntrancePoseState {
  readonly active: boolean;
  readonly stage: BossEntranceStage;
  /** Normalized progress in [0, 1], where 0 is spawn start and 1 is combat unlocked. */
  readonly progress: number;
  readonly remainingSec: number;
  /** Vertical elevation offset above the arena floor (meters). */
  readonly elevationY: number;
  /** Horizontal (X/Z) scale multiplier relative to boss baseScale. */
  readonly scaleXZ: number;
  /** Vertical (Y) scale multiplier relative to boss baseScale. */
  readonly scaleY: number;
  /** Emissive summoning glow intensity [0, 1.35]. */
  readonly auraIntensity: number;
  /** Ground contact shadow scale multiplier [0.25, 1.15]. */
  readonly shadowScale: number;
  /** Ground contact shadow opacity [0.15, 0.72]. */
  readonly shadowOpacity: number;
  /** Camera focus blend [0, 1] for framing the appearing Boss smoothly. */
  readonly cameraBlend: number;
  /** True once the Boss has reached or passed the touchdown moment (progress >= 0.62). */
  readonly hasLanded: boolean;
  /** Short Vietnamese HUD status label for the current entrance beat. */
  readonly stageLabel: string;
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/**
 * Resolves the entrance duration (5–10s) based on whether the boss is a major/chapter boss
 * or a sub-boss/warden. Always clamped inside [5.0, 10.0] seconds.
 */
export function resolveBossEntranceDurationSec(isMajorBoss: boolean): number {
  const raw = isMajorBoss
    ? BOSS_ENTRANCE_MAJOR_DURATION_SEC
    : BOSS_ENTRANCE_SUB_DURATION_SEC;
  return Math.max(
    BOSS_ENTRANCE_MIN_DURATION_SEC,
    Math.min(BOSS_ENTRANCE_MAX_DURATION_SEC, raw)
  );
}

/**
 * True while any real Boss is performing its entrance sequence and attacks must stay locked.
 */
export function isBossEntranceAttackLocked(bossEntranceRemainingSec: number): boolean {
  return Number.isFinite(bossEntranceRemainingSec) && bossEntranceRemainingSec > 0.001;
}

/**
 * Unified player attack permission gate: player cannot shoot, cast skills, cast ultimate,
 * or perform heavy break strikes until the Boss finishes appearing.
 */
export function canPlayerExecuteAttack(params: {
  isPlaying: boolean;
  bossEntranceRemainingSec: number;
  isDashing?: boolean;
}): boolean {
  if (!params.isPlaying) return false;
  if (isBossEntranceAttackLocked(params.bossEntranceRemainingSec)) return false;
  if (params.isDashing) return false;
  return true;
}

/**
 * Unified damage gate: neither the appearing Boss nor wave enemies during a Boss entrance
 * may take damage until the Boss entrance sequence finishes completely.
 */
export function canDamageEnemyDuringEntrance(params: {
  enemySpawnTimer: number;
  bossEntranceRemainingSec: number;
  isTrainingDummy?: boolean;
}): boolean {
  if (params.isTrainingDummy) return true;
  if (params.enemySpawnTimer > 0.001) return false;
  if (isBossEntranceAttackLocked(params.bossEntranceRemainingSec)) return false;
  return true;
}

/**
 * Smooth cinematic camera focus blend for a 5–10s Boss entrance:
 * ramps smoothly onto the Boss over the opening 14%, holds majestic focus during
 * summoning, descent, and landing roar (14% -> 80%), then glides cleanly back to the
 * player combat sightline over the final 20% before combat unlocks.
 */
export function computeBossEntranceCameraBlend(
  remainingSec: number,
  totalSec = BOSS_ENTRANCE_SUB_DURATION_SEC
): number {
  if (!Number.isFinite(remainingSec) || !Number.isFinite(totalSec)) return 0;
  if (remainingSec <= 0 || totalSec <= 0) return 0;
  const progress = clamp01(1 - remainingSec / totalSec);
  if (progress < 0.14) {
    return smoothstep(progress / 0.14);
  }
  if (progress < 0.80) {
    return 1;
  }
  return 1 - smoothstep((progress - 0.80) / 0.20);
}

/**
 * Evaluates the deterministic 4-beat 3D Boss Entrance choreography pose for any frame.
 * Pure, zero-allocation friendly math suitable for 60 FPS desktop & 30 FPS Dell E5430 Lite.
 */
export function evaluateBossEntranceState(
  remainingSec: number,
  totalSec = BOSS_ENTRANCE_SUB_DURATION_SEC
): BossEntrancePoseState {
  if (!Number.isFinite(remainingSec) || !Number.isFinite(totalSec) || remainingSec <= 0 || totalSec <= 0) {
    return {
      active: false,
      stage: 'complete',
      progress: 1,
      remainingSec: 0,
      elevationY: 0,
      scaleXZ: 1,
      scaleY: 1,
      auraIntensity: 0,
      shadowScale: 1,
      shadowOpacity: 0.45,
      cameraBlend: 0,
      hasLanded: true,
      stageLabel: 'KHAI CHIẾN!',
    };
  }

  const clampedRem = Math.max(0, Math.min(totalSec, remainingSec));
  const progress = clamp01(1 - clampedRem / totalSec);
  const cameraBlend = computeBossEntranceCameraBlend(clampedRem, totalSec);

  // Beat 1: Summon Rift opens & Boss coalesces above the celestial seal (0.00 -> 0.25)
  if (progress < 0.25) {
    const t = smoothstep(progress / 0.25);
    const hoverWave = Math.sin(progress * Math.PI * 10) * 0.16;
    const scale = 0.22 + t * 0.44;
    return {
      active: true,
      stage: 'summon_rift',
      progress,
      remainingSec: clampedRem,
      elevationY: 7.4 - t * 1.0 + hoverWave,
      scaleXZ: scale,
      scaleY: scale * (1.06 + (1 - t) * 0.14),
      auraIntensity: 0.45 + t * 0.65,
      shadowScale: 0.35 + t * 0.25,
      shadowOpacity: 0.18 + t * 0.14,
      cameraBlend,
      hasLanded: false,
      stageLabel: 'Đang triệu hồi · Khóa tấn công',
    };
  }

  // Beat 2: Celestial Descent from rift to arena floor (0.25 -> 0.62)
  if (progress < 0.62) {
    const rawT = (progress - 0.25) / 0.37;
    // Accelerating dramatic descent curve into impact
    const fallT = Math.pow(clamp01(rawT), 1.65);
    const elevationY = Math.max(0, 6.4 * (1 - fallT));
    const scale = 0.66 + smoothstep(rawT) * 0.34;
    const stretchY = rawT > 0.72 ? 1 + ((rawT - 0.72) / 0.28) * 0.14 : 1.04;
    const stretchXZ = 1 / Math.sqrt(stretchY);
    return {
      active: true,
      stage: 'descent',
      progress,
      remainingSec: clampedRem,
      elevationY,
      scaleXZ: scale * stretchXZ,
      scaleY: scale * stretchY,
      auraIntensity: 0.95 + rawT * 0.4,
      shadowScale: 0.6 + fallT * 0.52,
      shadowOpacity: 0.32 + fallT * 0.36,
      cameraBlend,
      hasLanded: false,
      stageLabel: 'Boss đang giáng lâm · Chờ khai chiến',
    };
  }

  // Beat 3: Heavy Touchdown Squash -> Imperial Battle Roar (0.62 -> 0.88)
  if (progress < 0.88) {
    const rawT = (progress - 0.62) / 0.26;
    let scaleY = 1;
    let scaleXZ = 1;
    if (rawT < 0.24) {
      // Heavy landing squash
      const sq = Math.sin((rawT / 0.24) * Math.PI);
      scaleY = 1 - sq * 0.18;
      scaleXZ = 1 + sq * 0.14;
    } else {
      // Majestic chest-puffing roar swell
      const roarT = (rawT - 0.24) / 0.76;
      const swell = Math.sin(roarT * Math.PI);
      scaleY = 1 + swell * 0.1;
      scaleXZ = 1 + swell * 0.06;
    }
    return {
      active: true,
      stage: 'landing_roar',
      progress,
      remainingSec: clampedRem,
      elevationY: 0,
      scaleXZ,
      scaleY,
      auraIntensity: 1.25 - rawT * 0.55,
      shadowScale: 1.12 - rawT * 0.1,
      shadowOpacity: 0.68 - rawT * 0.18,
      cameraBlend,
      hasLanded: true,
      stageLabel: 'Boss gầm vang · Chuẩn bị khai chiến',
    };
  }

  // Beat 4: Final Combat Lock-in & Camera Return (0.88 -> 1.00)
  const rawT = (progress - 0.88) / 0.12;
  const settle = smoothstep(rawT);
  return {
    active: true,
    stage: 'ready_lock',
    progress,
    remainingSec: clampedRem,
    elevationY: 0,
    scaleXZ: 1,
    scaleY: 1,
    auraIntensity: (1 - settle) * 0.55,
    shadowScale: 1,
    shadowOpacity: 0.5 - settle * 0.05,
    cameraBlend,
    hasLanded: true,
    stageLabel: 'Sắp mở khóa tấn công · Sẵn sàng!',
  };
}

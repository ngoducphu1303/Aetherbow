import {
  CombatCameraPreset,
  CombatKeybindAction,
  CombatKeybinds,
  RoomBountyKind,
  RoomBountySnapshot,
} from '../types/game';

export const DEFAULT_COMBAT_KEYBINDS: CombatKeybinds = {
  dash: 'Space',
  activeSkill: 'KeyE',
  heavyBreak: 'KeyF',
  ultimate: 'KeyQ',
  overdrive: 'KeyX',
  pause: 'Escape',
  cycleCamera: 'KeyC',
  toggleAutoPilot: 'KeyV',
};

const COMBAT_KEYBIND_ACTIONS: CombatKeybindAction[] = [
  'dash',
  'activeSkill',
  'heavyBreak',
  'ultimate',
  'overdrive',
  'pause',
  'cycleCamera',
  'toggleAutoPilot',
];

export const COMBAT_KEYBIND_META: Array<{
  action: CombatKeybindAction;
  label: string;
  hint: string;
}> = [
  { action: 'dash', label: 'Lướt Né (Dash)', hint: 'Miễn thương & Né Hoàn Hảo' },
  { action: 'activeSkill', label: 'Kỹ Năng Chủ Động', hint: 'Chiêu đặc trưng của Anh Hùng' },
  { action: 'heavyBreak', label: 'Phá Giáp Trảm / Kết Liễu', hint: 'Lao chém phá khiên & kết liễu Boss/Tinh Anh' },
  { action: 'ultimate', label: 'Tuyệt Kỹ (Chiêu Cuối)', hint: 'Kích hoạt khi đầy 100% nộ' },
  { action: 'overdrive', label: 'Thức Tỉnh Vũ Khí', hint: 'Kích hoạt Overdrive khi đầy 100% thanh vũ khí' },
  { action: 'cycleCamera', label: 'Đổi Góc Camera Nhanh', hint: 'Chiến Thuật · Cận Cảnh · Toàn Cảnh' },
  { action: 'toggleAutoPilot', label: 'Bật/Tắt Tự Động Chiến Đấu', hint: 'Chuyển nhanh tay chơi và AI hỗ trợ' },
  { action: 'pause', label: 'Tạm Dừng Trận', hint: 'Mở bảng tạm dừng & cài đặt' },
];

export interface AstralOverchargeStepResult {
  charge: number;
  justCharged: boolean;
  ready: boolean;
  ringScale: number;
  ringColorHex: number;
  ringOpacity: number;
}

export interface CompanionSynergyPose {
  x: number;
  y: number;
  z: number;
  scale: number;
  isImpactApex: boolean;
}

export interface MountBankPose {
  tiltZ: number;
  pitchX: number;
}

export interface ZodiacConstellationSpec {
  zodiacId: string;
  label: string;
  stars: Array<[number, number, number]>;
  edges: Array<[number, number]>;
}

export interface BrazierFlamePose {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  swayX: number;
  swayZ: number;
  colorHex: number;
  coreColorHex: number;
  opacity: number;
}

export interface RoomBountyState {
  id: string;
  kind: RoomBountyKind;
  title: string;
  target: number;
  progress: number;
  timeLimitSec: number;
  elapsedSec: number;
  status: 'active' | 'completed' | 'failed';
  goldReward: number;
  ultChargeReward: number;
  rewardLabel: string;
}

export type RoomBountyEvent =
  | { type: 'tick'; dt: number }
  | { type: 'player_hit' }
  | { type: 'elemental_reaction' }
  | { type: 'boss_break' }
  | { type: 'room_clear' };

export interface RoomBountyUpdateResult {
  next: RoomBountyState;
  justCompleted: boolean;
  goldReward: number;
  ultChargeReward: number;
  bannerText: string | null;
}

export interface FpsSampler {
  samples: Float32Array;
  head: number;
  count: number;
  capacity: number;
}

export interface FpsMetrics {
  fps: number;
  frameTimeMs: number;
}

// ============================================================================
// PILLAR 1: ASTRAL OVERCHARGE SHOT & DIEGETIC BOW CHARGE RING
// ============================================================================

/**
 * Steps the hero's automatic Astral Overcharge gauge (0..1) while in combat.
 * Charges faster while standing and drawing the bow, slower while kiting,
 * and signals `justCharged` once on crossing 1.0 for the harmonic chime.
 */
export function stepAstralOvercharge(
  currentCharge: number,
  dt: number,
  isMoving: boolean,
  isAiming: boolean,
  hasLiveEnemies: boolean
): AstralOverchargeStepResult {
  const safeDt = Math.max(0, Math.min(0.1, dt));
  const clampedCur = Math.max(0, Math.min(1, currentCharge));
  if (!hasLiveEnemies) {
    return {
      charge: clampedCur,
      justCharged: false,
      ready: clampedCur >= 1,
      ringScale: 0.45 + clampedCur * 0.55,
      ringColorHex: clampedCur >= 1 ? 0xfde047 : 0x38bdf8,
      ringOpacity: clampedCur >= 1 ? 0.88 : clampedCur * 0.45,
    };
  }

  const rate = isAiming ? 0.25 : isMoving ? 0.16 : 0.12;
  const nextCharge = Math.min(1, clampedCur + safeDt * rate);
  const justCharged = clampedCur < 1 && nextCharge >= 1;
  const ready = nextCharge >= 1;

  const ringColorHex = ready
    ? 0xfde047
    : nextCharge >= 0.72
    ? 0xfbbf24
    : 0x38bdf8;
  const ringScale = ready ? 1.16 : 0.42 + nextCharge * 0.62;
  const ringOpacity = ready ? 0.94 : 0.18 + nextCharge * 0.52;

  return {
    charge: nextCharge,
    justCharged,
    ready,
    ringScale,
    ringColorHex,
    ringOpacity,
  };
}

// ============================================================================
// PILLAR 2: COMPANION SYNERGY SWOOP & MOUNT BANKING KINEMATICS
// ============================================================================

/**
 * Computes a dramatic 3D swoop/dive trajectory for companions performing a
 * synchronized strike during Hero Ultimate or Counter-Shot.
 */
export function computeCompanionSynergyOrbit(
  progress: number,
  index: number,
  total: number,
  originX: number,
  originZ: number,
  targetX: number,
  targetZ: number
): CompanionSynergyPose {
  const t = Math.max(0, Math.min(1, progress));
  const spreadAngle = ((index + 0.5) / Math.max(1, total) - 0.5) * Math.PI * 0.9;
  const dx = targetX - originX;
  const dz = targetZ - originZ;
  const dist = Math.hypot(dx, dz) || 1;
  const perpX = -dz / dist;
  const perpZ = dx / dist;

  if (t < 0.55) {
    // Outbound curved dive toward the target
    const u = t / 0.55;
    const ease = 1 - Math.pow(1 - u, 2.2);
    const arcOut = Math.sin(u * Math.PI) * 2.1 * Math.sin(spreadAngle + 0.6);
    const x = originX + dx * ease + perpX * arcOut;
    const z = originZ + dz * ease + perpZ * arcOut;
    const y = 1.15 + Math.sin(u * Math.PI) * 2.25;
    return {
      x,
      y,
      z,
      scale: 1 + Math.sin(u * Math.PI) * 0.32,
      isImpactApex: u >= 0.88,
    };
  }

  // Return glide back to hero escort orbit
  const r = (t - 0.55) / 0.45;
  const easeBack = r * r * (3 - 2 * r);
  const arcBack = Math.sin(r * Math.PI) * 1.45 * -Math.sin(spreadAngle + 0.6);
  const x = targetX + (originX - targetX) * easeBack + perpX * arcBack;
  const z = targetZ + (originZ - targetZ) * easeBack + perpZ * arcBack;
  const y = 1.2 + Math.sin(r * Math.PI) * 1.25;
  return {
    x,
    y,
    z,
    scale: 1 + (1 - easeBack) * 0.18,
    isImpactApex: false,
  };
}

/**
 * Computes damped banking roll (`tiltZ`) and lunge pitch (`pitchX`) for the
 * hero's 3D mount while turning and dashing.
 */
export function computeMountBankTilt(
  currentYaw: number,
  targetYaw: number,
  speedMag: number,
  isDashing: boolean,
  dt: number,
  currentTiltZ: number
): MountBankPose {
  const safeDt = Math.max(0.001, Math.min(0.05, dt));
  let diff = ((targetYaw - currentYaw + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (diff < -Math.PI) diff += Math.PI * 2;

  const speedFactor = Math.min(1, Math.max(0, speedMag / 6.5));
  const rawBank = Math.max(-0.28, Math.min(0.28, -diff * 0.65 * speedFactor));
  const alpha = 1 - Math.exp(-10 * safeDt);
  const tiltZ = currentTiltZ + (rawBank - currentTiltZ) * alpha;
  const pitchX = isDashing ? 0.16 : speedFactor * 0.055;
  return { tiltZ, pitchX };
}

// ============================================================================
// PILLAR 3: 12 OVERHEAD 3D ZODIAC CONSTELLATIONS & DYNAMIC BRAZIER FLAMES
// ============================================================================

interface RawConstellation2D {
  label: string;
  pts: Array<[number, number]>; // normalized [-1..1, -1..1]
  edges: Array<[number, number]>;
}

const ZODIAC_CONSTELLATION_2D: Record<string, RawConstellation2D> = {
  aries: {
    label: 'Chòm Sao Bạch Dương',
    pts: [[-0.85, -0.35], [-0.2, -0.15], [0.42, 0.08], [0.78, 0.42]],
    edges: [[0, 1], [1, 2], [2, 3]],
  },
  taurus: {
    label: 'Chòm Sao Kim Ngưu',
    pts: [[-0.9, 0.55], [-0.25, 0.12], [0.0, 0.0], [0.35, -0.22], [0.85, -0.58], [-0.2, -0.45], [-0.78, -0.68]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6]],
  },
  gemini: {
    label: 'Chòm Sao Song Tử',
    pts: [[-0.45, 0.8], [0.42, 0.78], [-0.52, 0.15], [0.35, 0.12], [-0.62, -0.65], [0.48, -0.68]],
    edges: [[0, 1], [0, 2], [2, 4], [1, 3], [3, 5], [2, 3]],
  },
  cancer: {
    label: 'Chòm Sao Cự Giải',
    pts: [[0.0, 0.85], [0.02, 0.2], [0.0, -0.1], [-0.55, -0.75], [0.58, -0.68]],
    edges: [[0, 1], [1, 2], [2, 3], [2, 4]],
  },
  leo: {
    label: 'Chòm Sao Sư Tử',
    pts: [[-0.82, 0.52], [-0.55, 0.78], [-0.22, 0.55], [-0.36, 0.18], [-0.15, -0.15], [0.45, 0.08], [0.88, -0.12], [0.38, -0.42]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 4]],
  },
  virgo: {
    label: 'Chòm Sao Xử Nữ',
    pts: [[-0.8, 0.35], [-0.35, 0.55], [0.1, 0.22], [0.65, 0.45], [0.22, -0.25], [-0.35, -0.48], [0.72, -0.62]],
    edges: [[0, 1], [1, 2], [2, 3], [2, 4], [4, 5], [4, 6]],
  },
  libra: {
    label: 'Chòm Sao Thiên Bình',
    pts: [[0.0, 0.78], [-0.68, 0.15], [0.68, 0.12], [-0.42, -0.62], [0.46, -0.58]],
    edges: [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4]],
  },
  scorpio: {
    label: 'Chòm Sao Hổ Cáp',
    pts: [[-0.78, 0.65], [-0.52, 0.38], [-0.25, 0.12], [0.0, -0.2], [0.28, -0.52], [0.62, -0.65], [0.82, -0.38], [0.7, -0.15]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]],
  },
  sagittarius: {
    label: 'Chòm Sao Nhân Mã',
    pts: [[-0.65, -0.25], [-0.18, 0.32], [0.35, 0.35], [0.72, -0.18], [0.18, -0.52], [-0.28, -0.52], [0.05, 0.78]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0], [1, 6], [2, 6]],
  },
  capricorn: {
    label: 'Chòm Sao Ma Kết',
    pts: [[-0.82, 0.42], [-0.2, 0.15], [0.42, 0.22], [0.82, 0.48], [0.35, -0.42], [-0.38, -0.48]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 0]],
  },
  aquarius: {
    label: 'Chòm Sao Bảo Bình',
    pts: [[-0.85, 0.45], [-0.42, 0.22], [0.05, 0.48], [0.45, 0.15], [0.82, 0.32], [-0.18, -0.35], [0.38, -0.55]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [1, 5], [3, 6], [5, 6]],
  },
  pisces: {
    label: 'Chòm Sao Song Ngư',
    pts: [[-0.8, 0.55], [-0.45, 0.18], [0.0, -0.45], [0.48, -0.12], [0.82, 0.35], [0.62, 0.58], [0.42, 0.32]],
    edges: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]],
  },
};

/**
 * Generates high-dome 3D star coordinates & connecting edges for a Chapter's Zodiac constellation.
 */
export function getZodiacConstellationGeometry(zodiacId: string): ZodiacConstellationSpec {
  const key = (zodiacId || 'leo').toLowerCase();
  const def = ZODIAC_CONSTELLATION_2D[key] ?? ZODIAC_CONSTELLATION_2D.leo;
  const radiusX = 16.5;
  const radiusZ = 14.5;
  const stars: Array<[number, number, number]> = def.pts.map(([nx, nz], idx) => {
    const x = nx * radiusX;
    const z = nz * radiusZ - 4.5;
    const rNorm = Math.min(1, Math.hypot(nx, nz));
    const y = 17.8 - rNorm * 2.2 + ((idx % 3) - 1) * 0.42;
    return [x, y, z];
  });
  return {
    zodiacId: key in ZODIAC_CONSTELLATION_2D ? key : 'leo',
    label: def.label,
    stars,
    edges: def.edges.map(([a, b]) => [a, b]),
  };
}

/**
 * Evaluates dynamic multi-harmonic flickering pose & rage color for arena corner braziers.
 */
export function computeBrazierFlamePose(
  elapsed: number,
  index: number,
  bossPhase: 1 | 2 | 3
): BrazierFlamePose {
  const phaseSeed = index * 1.73;
  const rageBoost = bossPhase === 3 ? 1.48 : bossPhase === 2 ? 1.24 : 1.0;
  const flickerA = Math.sin(elapsed * (8.5 + bossPhase * 2.2) + phaseSeed);
  const flickerB = Math.cos(elapsed * (14.2 + bossPhase * 3.0) + phaseSeed * 1.6);
  const pulse = 0.88 + flickerA * 0.14 + flickerB * 0.08;

  const colorHex =
    bossPhase === 3 ? 0xf43f5e : bossPhase === 2 ? 0xf97316 : 0xfbbf24;
  const coreColorHex =
    bossPhase === 3 ? 0xfde047 : bossPhase === 2 ? 0xfef08a : 0xfffbeb;

  return {
    scaleX: (0.88 + flickerB * 0.1) * (bossPhase === 3 ? 1.18 : 1.04),
    scaleY: pulse * rageBoost,
    scaleZ: (0.88 - flickerB * 0.1) * (bossPhase === 3 ? 1.18 : 1.04),
    swayX: flickerA * 0.065 * rageBoost,
    swayZ: flickerB * 0.055 * rageBoost,
    colorHex,
    coreColorHex,
    opacity: Math.min(0.95, 0.72 + (bossPhase - 1) * 0.1 + flickerA * 0.06),
  };
}

// ============================================================================
// PILLAR 4: IN-RUN TACTICAL ROOM BOUNTIES (OPTIONAL, INSTANT REWARD)
// ============================================================================

export function createRoomBounty(
  seed: number,
  isBossStage: boolean,
  hasElementalSkill: boolean
): RoomBountyState {
  const s = Math.abs(Math.floor(seed));
  if (isBossStage) {
    if (s % 2 === 0) {
      return {
        id: `bounty_boss_break_${s}`,
        kind: 'boss_break',
        title: 'Phá Giáp Thủ Lĩnh 1 lần',
        target: 1,
        progress: 0,
        timeLimitSec: 0,
        elapsedSec: 0,
        status: 'active',
        goldReward: 60,
        ultChargeReward: 25,
        rewardLabel: '+60 Vàng · +25% Nộ',
      };
    }
    return {
      id: `bounty_boss_nohit_${s}`,
      kind: 'no_hit',
      title: 'Hạ Boss Không Trúng Đòn',
      target: 1,
      progress: 0,
      timeLimitSec: 0,
      elapsedSec: 0,
      status: 'active',
      goldReward: 75,
      ultChargeReward: 30,
      rewardLabel: '+75 Vàng · +30% Nộ',
    };
  }

  const pool: RoomBountyKind[] = hasElementalSkill
    ? ['no_hit', 'elemental_reactions', 'fast_clear']
    : ['no_hit', 'fast_clear'];
  const kind = pool[s % pool.length];

  if (kind === 'elemental_reactions') {
    return {
      id: `bounty_elem_${s}`,
      kind,
      title: 'Kích 2 Phản Ứng Nguyên Tố',
      target: 2,
      progress: 0,
      timeLimitSec: 0,
      elapsedSec: 0,
      status: 'active',
      goldReward: 45,
      ultChargeReward: 22,
      rewardLabel: '+45 Vàng · +22% Nộ',
    };
  }
  if (kind === 'fast_clear') {
    return {
      id: `bounty_fast_${s}`,
      kind,
      title: 'Dọn Phòng Trong 22 Giây',
      target: 1,
      progress: 0,
      timeLimitSec: 22,
      elapsedSec: 0,
      status: 'active',
      goldReward: 40,
      ultChargeReward: 20,
      rewardLabel: '+40 Vàng · +20% Nộ',
    };
  }
  return {
    id: `bounty_nohit_${s}`,
    kind: 'no_hit',
    title: 'Dọn Phòng Không Trúng Đòn',
    target: 1,
    progress: 0,
    timeLimitSec: 0,
    elapsedSec: 0,
    status: 'active',
    goldReward: 50,
    ultChargeReward: 22,
    rewardLabel: '+50 Vàng · +22% Nộ',
  };
}

export function updateRoomBountyProgress(
  state: RoomBountyState,
  event: RoomBountyEvent
): RoomBountyUpdateResult {
  if (state.status !== 'active') {
    return {
      next: state,
      justCompleted: false,
      goldReward: 0,
      ultChargeReward: 0,
      bannerText: null,
    };
  }

  const complete = (progressVal: number): RoomBountyUpdateResult => {
    const next: RoomBountyState = {
      ...state,
      progress: progressVal,
      status: 'completed',
    };
    return {
      next,
      justCompleted: true,
      goldReward: state.goldReward,
      ultChargeReward: state.ultChargeReward,
      bannerText: `HOÀN TẤT THỬ THÁCH · ${state.rewardLabel}`,
    };
  };

  if (event.type === 'tick') {
    const nextElapsed = state.elapsedSec + Math.max(0, event.dt);
    if (state.kind === 'fast_clear' && state.timeLimitSec > 0 && nextElapsed > state.timeLimitSec) {
      return {
        next: { ...state, elapsedSec: nextElapsed, status: 'failed' },
        justCompleted: false,
        goldReward: 0,
        ultChargeReward: 0,
        bannerText: null,
      };
    }
    return {
      next: { ...state, elapsedSec: nextElapsed },
      justCompleted: false,
      goldReward: 0,
      ultChargeReward: 0,
      bannerText: null,
    };
  }

  if (event.type === 'player_hit' && state.kind === 'no_hit') {
    return {
      next: { ...state, status: 'failed' },
      justCompleted: false,
      goldReward: 0,
      ultChargeReward: 0,
      bannerText: null,
    };
  }

  if (event.type === 'elemental_reaction' && state.kind === 'elemental_reactions') {
    const nextProg = Math.min(state.target, state.progress + 1);
    if (nextProg >= state.target) {
      return complete(nextProg);
    }
    return {
      next: { ...state, progress: nextProg },
      justCompleted: false,
      goldReward: 0,
      ultChargeReward: 0,
      bannerText: null,
    };
  }

  if (event.type === 'boss_break' && state.kind === 'boss_break') {
    return complete(1);
  }

  if (event.type === 'room_clear') {
    if (state.kind === 'no_hit') {
      return complete(1);
    }
    if (state.kind === 'fast_clear' && state.elapsedSec <= state.timeLimitSec) {
      return complete(1);
    }
  }

  return {
    next: state,
    justCompleted: false,
    goldReward: 0,
    ultChargeReward: 0,
    bannerText: null,
  };
}

export function toRoomBountySnapshot(
  state: RoomBountyState | null
): RoomBountySnapshot | null {
  if (!state) return null;
  let progressLabel = '';
  if (state.status === 'completed') {
    progressLabel = 'ĐÃ HOÀN TẤT';
  } else if (state.status === 'failed') {
    progressLabel = 'CHƯA ĐẠT';
  } else if (state.kind === 'fast_clear') {
    const remain = Math.max(0, Math.ceil(state.timeLimitSec - state.elapsedSec));
    progressLabel = `Còn ${remain}s`;
  } else if (state.kind === 'elemental_reactions') {
    progressLabel = `${state.progress}/${state.target}`;
  } else if (state.kind === 'boss_break') {
    progressLabel = `${state.progress}/${state.target}`;
  } else {
    progressLabel = 'Chưa trúng đòn';
  }

  return {
    id: state.id,
    kind: state.kind,
    title: state.title,
    progressLabel,
    status: state.status,
    rewardLabel: state.rewardLabel,
  };
}

// ============================================================================
// PILLAR 5: PC KEYBINDS, QUICK CAMERA CYCLE & ZERO-GC FPS SAMPLER
// ============================================================================

const FORBIDDEN_REMAP_CODES = new Set([
  'Unidentified',
  'MetaLeft',
  'MetaRight',
  'OSLeft',
  'OSRight',
  'CapsLock',
  'Tab',
  'KeyW',
  'KeyA',
  'KeyS',
  'KeyD',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

export function normalizeCombatKeybinds(
  raw?: Partial<CombatKeybinds>
): CombatKeybinds {
  const result: CombatKeybinds = { ...DEFAULT_COMBAT_KEYBINDS };
  if (!raw) return result;
  const used = new Set<string>();

  for (const action of COMBAT_KEYBIND_ACTIONS) {
    const candidate = raw[action];
    if (
      typeof candidate === 'string' &&
      candidate.length > 0 &&
      !FORBIDDEN_REMAP_CODES.has(candidate) &&
      !used.has(candidate)
    ) {
      result[action] = candidate;
      used.add(candidate);
    }
  }

  // Ensure no collisions with defaults if partial overrides stole a default key
  const finalUsed = new Set<string>();
  for (const action of COMBAT_KEYBIND_ACTIONS) {
    if (finalUsed.has(result[action])) {
      const fallback = Object.values(DEFAULT_COMBAT_KEYBINDS).find(
        (code) => !finalUsed.has(code)
      );
      if (fallback) result[action] = fallback;
    }
    finalUsed.add(result[action]);
  }
  return result;
}

export function remapCombatKeybind(
  current: CombatKeybinds,
  action: CombatKeybindAction,
  nextCode: string
): CombatKeybinds {
  const normalized = normalizeCombatKeybinds(current);
  if (!nextCode || FORBIDDEN_REMAP_CODES.has(nextCode)) {
    return normalized;
  }
  if (normalized[action] === nextCode) {
    return normalized;
  }

  const next: CombatKeybinds = { ...normalized };
  const prevCode = normalized[action];
  for (const other of COMBAT_KEYBIND_ACTIONS) {
    if (other !== action && next[other] === nextCode) {
      next[other] = prevCode;
    }
  }
  next[action] = nextCode;
  return next;
}

export function formatKeybindShortLabel(code: string): string {
  if (!code) return '—';
  if (code === 'Space') return 'SPACE';
  if (code === 'Escape') return 'ESC';
  if (code === 'ShiftLeft' || code === 'ShiftRight') return 'SHIFT';
  if (code === 'ControlLeft' || code === 'ControlRight') return 'CTRL';
  if (code === 'AltLeft' || code === 'AltRight') return 'ALT';
  if (code === 'Enter') return 'ENTER';
  if (code === 'Backspace') return 'BKSP';
  if (code.startsWith('Key') && code.length === 4) {
    return code.slice(3).toUpperCase();
  }
  if (code.startsWith('Digit') && code.length === 6) {
    return code.slice(5);
  }
  if (code.startsWith('F') && code.length <= 3) {
    return code.toUpperCase();
  }
  return code.toUpperCase().slice(0, 6);
}

const CAMERA_CYCLE_ORDER: CombatCameraPreset[] = ['tactical', 'action', 'wide'];
const CAMERA_CYCLE_LABELS: Record<CombatCameraPreset, string> = {
  tactical: 'Chiến Thuật',
  action: 'Cận Cảnh Hành Động',
  wide: 'Toàn Cảnh Sân Đấu',
};

export function cycleCombatCameraPreset(
  current: CombatCameraPreset = 'tactical'
): { next: CombatCameraPreset; toastLabel: string } {
  const idx = CAMERA_CYCLE_ORDER.indexOf(current);
  const next = CAMERA_CYCLE_ORDER[(idx + 1) % CAMERA_CYCLE_ORDER.length];
  return {
    next,
    toastLabel: `Camera · ${CAMERA_CYCLE_LABELS[next]}`,
  };
}

export function createFpsSampler(capacity = 45): FpsSampler {
  const cap = Math.max(8, Math.floor(capacity));
  return {
    samples: new Float32Array(cap),
    head: 0,
    count: 0,
    capacity: cap,
  };
}

export function pushFpsSample(sampler: FpsSampler | undefined | null, rawDtSec: number): void {
  if (!sampler || !sampler.samples) return;
  if (!Number.isFinite(rawDtSec) || rawDtSec <= 0.0005 || rawDtSec > 0.5) return;
  sampler.samples[sampler.head] = rawDtSec;
  sampler.head = (sampler.head + 1) % sampler.capacity;
  if (sampler.count < sampler.capacity) {
    sampler.count += 1;
  }
}

export function readFpsMetrics(sampler: FpsSampler | undefined | null): FpsMetrics {
  if (!sampler || !sampler.samples || sampler.count === 0) {
    return { fps: 60, frameTimeMs: 16.7 };
  }
  let sum = 0;
  for (let i = 0; i < sampler.count; i++) {
    sum += sampler.samples[i];
  }
  const avgDt = sum / sampler.count;
  const fps = Math.max(1, Math.min(240, Math.round(1 / Math.max(0.001, avgDt))));
  const frameTimeMs = Math.round(avgDt * 10000) / 10;
  return { fps, frameTimeMs };
}

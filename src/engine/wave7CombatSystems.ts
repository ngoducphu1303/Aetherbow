/**
 * Wave 7 — Five Pillars Deterministic Combat Systems
 * - Pillar 1/2: Boss Guard-Break / Stagger System (+45% Vulnerability, 4.0s break, +18% escalation)
 * - Pillar 1/2: Combat Style Momentum (B -> A -> S -> SS -> SSS) with fixed-tick decay & reward bonus
 * - Pillar 5: Co-op 3D Tactical Ping Callouts & Squad Response Spec
 */

import type { CombatStyleGrade, CoopTacticalOrder } from '../types/game';

// ---------------------------------------------------------------------------
// 1. BOSS STAGGER / GUARD-BREAK SYSTEM (1/60s FIXED-TICK DETERMINISTIC)
// ---------------------------------------------------------------------------

export const GUARD_BREAK_DURATION_SEC = 4.0;
export const GUARD_BREAK_VULN_MULT = 1.45;
export const GUARD_BREAK_RECOVERY_ESCALATION = 1.18;
export const GUARD_BREAK_SLOW_FACTOR = 0.24;

export interface BossStaggerState {
  current: number;
  max: number;
  brokenRemainingSec: number;
  breaksTriggered: number;
  decayCooldownSec: number;
}

export function createBossStaggerState(bossMaxHp: number): BossStaggerState {
  // Stagger bar scales proportionally with Boss HP (~22% of HP in stagger points)
  const baseMax = Math.max(450, Math.round(bossMaxHp * 0.22));
  return {
    current: 0,
    max: baseMax,
    brokenRemainingSec: 0,
    breaksTriggered: 0,
    decayCooldownSec: 0,
  };
}

export interface StaggerHitResult {
  triggeredBreak: boolean;
  isBroken: boolean;
  damageMultiplier: number;
  staggerRatio: number;
}

/**
 * Applies stagger buildup on a Boss hit.
 * Crit (+28%), Counter-Window (+140%), and Ultimate (+220%) deal bonus Guard damage.
 */
export function applyBossStaggerDamage(
  state: BossStaggerState,
  rawDamage: number,
  flags?: { isCrit?: boolean; isCounterShot?: boolean; isUltimate?: boolean }
): StaggerHitResult {
  const safeDmg = Math.max(0, rawDamage);
  if (state.brokenRemainingSec > 0) {
    return {
      triggeredBreak: false,
      isBroken: true,
      damageMultiplier: GUARD_BREAK_VULN_MULT,
      staggerRatio: 1,
    };
  }

  let staggerMult = 1.0;
  if (flags?.isCrit) staggerMult += 0.28;
  if (flags?.isCounterShot) staggerMult += 1.4;
  if (flags?.isUltimate) staggerMult += 2.2;

  state.current = Math.min(state.max, state.current + safeDmg * staggerMult);
  state.decayCooldownSec = 2.6;

  if (state.current >= state.max) {
    state.brokenRemainingSec = GUARD_BREAK_DURATION_SEC;
    state.breaksTriggered += 1;
    return {
      triggeredBreak: true,
      isBroken: true,
      damageMultiplier: GUARD_BREAK_VULN_MULT,
      staggerRatio: 1,
    };
  }

  return {
    triggeredBreak: false,
    isBroken: false,
    damageMultiplier: 1.0,
    staggerRatio: Math.max(0, Math.min(1, state.current / Math.max(1, state.max))),
  };
}

/**
 * Steps Boss Stagger state inside the fixed 1/60s simulation tick.
 * Returns { recovered: true } on the exact tick the Boss recovers from Guard Break.
 */
export function stepBossStaggerState(
  state: BossStaggerState,
  dtSec: number
): { recovered: boolean; isBroken: boolean; ratio: number } {
  const dt = Math.max(0, dtSec);
  if (state.brokenRemainingSec > 0) {
    state.brokenRemainingSec = Math.max(0, state.brokenRemainingSec - dt);
    if (state.brokenRemainingSec <= 0) {
      // Recover cleanly with +18% higher stagger bar to prevent infinite stunlock
      state.current = 0;
      state.max = Math.round(state.max * GUARD_BREAK_RECOVERY_ESCALATION);
      return { recovered: true, isBroken: false, ratio: 0 };
    }
    return {
      recovered: false,
      isBroken: true,
      ratio: Math.max(0, Math.min(1, state.brokenRemainingSec / GUARD_BREAK_DURATION_SEC)),
    };
  }

  if (state.decayCooldownSec > 0) {
    state.decayCooldownSec = Math.max(0, state.decayCooldownSec - dt);
  } else if (state.current > 0) {
    // Gentle 4.5%/sec poise regeneration if boss isn't pressured
    state.current = Math.max(0, state.current - state.max * 0.045 * dt);
  }

  return {
    recovered: false,
    isBroken: false,
    ratio: Math.max(0, Math.min(1, state.current / Math.max(1, state.max))),
  };
}

// ---------------------------------------------------------------------------
// 2. COMBAT STYLE MOMENTUM (B -> A -> S -> SS -> SSS)
// ---------------------------------------------------------------------------

export const STYLE_GRADE_THRESHOLDS: ReadonlyArray<{
  grade: CombatStyleGrade;
  minScore: number;
  label: string;
  rewardBonusPct: number;
  pitchBoost: number;
}> = [
  { grade: 'B', minScore: 0, label: 'B · Ổn Định', rewardBonusPct: 0, pitchBoost: 0.96 },
  { grade: 'A', minScore: 220, label: 'A · Chuẩn Xác', rewardBonusPct: 5, pitchBoost: 1.05 },
  { grade: 'S', minScore: 480, label: 'S · Thượng Hạng', rewardBonusPct: 10, pitchBoost: 1.15 },
  { grade: 'SS', minScore: 780, label: 'SS · Tuyệt Kỹ', rewardBonusPct: 16, pitchBoost: 1.28 },
  { grade: 'SSS', minScore: 1120, label: 'SSS · Thần Xạ', rewardBonusPct: 22, pitchBoost: 1.42 },
];

export const STYLE_MAX_SCORE = 1320;

export type StyleActionKind =
  | 'hit'
  | 'crit'
  | 'kill'
  | 'perfect_dodge'
  | 'counter_shot'
  | 'guard_break'
  | 'ultimate';

const STYLE_ACTION_POINTS: Record<StyleActionKind, number> = {
  hit: 9,
  crit: 18,
  kill: 55,
  perfect_dodge: 115,
  counter_shot: 85,
  guard_break: 210,
  ultimate: 130,
};

export interface StyleMomentumState {
  score: number;
  grade: CombatStyleGrade;
  peakGrade: CombatStyleGrade;
  decayHoldSec: number;
}

const GRADE_ORDER: Record<CombatStyleGrade, number> = {
  B: 0,
  A: 1,
  S: 2,
  SS: 3,
  SSS: 4,
};

export function resolveStyleGrade(score: number): CombatStyleGrade {
  for (let i = STYLE_GRADE_THRESHOLDS.length - 1; i >= 0; i--) {
    if (score >= STYLE_GRADE_THRESHOLDS[i].minScore) {
      return STYLE_GRADE_THRESHOLDS[i].grade;
    }
  }
  return 'B';
}

export function getStyleRewardBonusPct(grade: CombatStyleGrade): number {
  const row = STYLE_GRADE_THRESHOLDS.find((t) => t.grade === grade);
  return row ? row.rewardBonusPct : 0;
}

export function getStyleFillRatio(score: number): number {
  const grade = resolveStyleGrade(score);
  const idx = GRADE_ORDER[grade];
  const curMin = STYLE_GRADE_THRESHOLDS[idx].minScore;
  const nextMin =
    idx + 1 < STYLE_GRADE_THRESHOLDS.length
      ? STYLE_GRADE_THRESHOLDS[idx + 1].minScore
      : STYLE_MAX_SCORE;
  return Math.max(0, Math.min(1, (score - curMin) / Math.max(1, nextMin - curMin)));
}

export function createStyleMomentumState(): StyleMomentumState {
  return {
    score: 0,
    grade: 'B',
    peakGrade: 'B',
    decayHoldSec: 0,
  };
}

export function recordStyleAction(
  state: StyleMomentumState,
  action: StyleActionKind
): { promoted: boolean; newGrade: CombatStyleGrade; pitchBoost: number } {
  const prevRank = GRADE_ORDER[state.grade];
  state.score = Math.min(STYLE_MAX_SCORE, state.score + STYLE_ACTION_POINTS[action]);
  state.decayHoldSec = action === 'guard_break' || action === 'perfect_dodge' ? 4.2 : 2.8;
  const nextGrade = resolveStyleGrade(state.score);
  state.grade = nextGrade;
  if (GRADE_ORDER[nextGrade] > GRADE_ORDER[state.peakGrade]) {
    state.peakGrade = nextGrade;
  }
  const promoted = GRADE_ORDER[nextGrade] > prevRank;
  const meta = STYLE_GRADE_THRESHOLDS[GRADE_ORDER[nextGrade]];
  return {
    promoted,
    newGrade: nextGrade,
    pitchBoost: meta.pitchBoost,
  };
}

export function recordStyleDamageTaken(state: StyleMomentumState): CombatStyleGrade {
  // Taking damage drops momentum by ~240 points (at most ~1 grade step)
  state.score = Math.max(0, state.score - 240);
  state.grade = resolveStyleGrade(state.score);
  state.decayHoldSec = 1.2;
  return state.grade;
}

export function stepStyleMomentum(state: StyleMomentumState, dtSec: number): void {
  const dt = Math.max(0, dtSec);
  if (state.decayHoldSec > 0) {
    state.decayHoldSec = Math.max(0, state.decayHoldSec - dt);
    return;
  }
  if (state.score > 0) {
    // Higher style tiers decay slightly faster to keep high-skill rhythm exciting
    const decayPerSec = 26 + GRADE_ORDER[state.grade] * 12;
    state.score = Math.max(0, state.score - decayPerSec * dt);
    state.grade = resolveStyleGrade(state.score);
  }
}

// ---------------------------------------------------------------------------
// 3. CO-OP 3D TACTICAL PING CALLOUTS (PILLAR 5)
// ---------------------------------------------------------------------------

export interface CoopTacticalPingSpec {
  order: CoopTacticalOrder;
  hotkey: '1' | '2' | '3';
  label: string;
  calloutLine: string;
  aiReplyPool: readonly string[];
}

export const COOP_TACTICAL_PINGS: Record<CoopTacticalOrder, CoopTacticalPingSpec> = {
  focus_boss: {
    order: 'focus_boss',
    hotkey: '1',
    label: 'Dồn Boss',
    calloutLine: 'Tập trung phá giáp Boss ngay!',
    aiReplyPool: [
      'Đã khóa mục tiêu Boss, đang dồn sát thương!',
      'Rõ! Đang dồn toàn lực phá giáp Boss!',
      'Bắn bọc sườn Boss ngay lập tức!',
    ],
  },
  clear_adds: {
    order: 'clear_adds',
    hotkey: '2',
    label: 'Dọn Quái',
    calloutLine: 'Dọn sạch quái phụ quanh đấu trường!',
    aiReplyPool: [
      'Để tôi dọn quái phụ mở góc bắn cho bạn!',
      'Đã chuyển mục tiêu sang quái vệ tinh!',
      'Đang quét sạch đám lính cản đường!',
    ],
  },
  hold_resonance: {
    order: 'hold_resonance',
    hotkey: '3',
    label: 'Cộng Hưởng Ult',
    calloutLine: 'Giữ Chiêu Cuối — xả cộng hưởng cùng lúc!',
    aiReplyPool: [
      'Đã giữ Ult 100%, chờ bạn kích hoạt Cộng Hưởng!',
      'Sẵn sàng xả Ult đồng bộ +25% ST Boss!',
      'Ult đã nạp đầy, ra hiệu là nổ ngay!',
    ],
  },
  break_guard: {
    order: 'break_guard',
    hotkey: '2',
    label: 'Phá Giáp',
    calloutLine: 'Tập trung bào Giáp Boss & mồi Liên Kích!',
    aiReplyPool: [
      'Đang Phá Giáp Boss — Bấm F hoặc Q Liên Kích!',
      'Rõ! Dồn toàn lực bào thanh giáp Boss ngay!',
      'Giáp Boss sắp vỡ — chuẩn bị đòn Kết Liễu!',
    ],
  },
  protect_player: {
    order: 'protect_player',
    hotkey: '3',
    label: 'Hộ Vệ',
    calloutLine: 'Áp sát Hộ Vệ & sẵn sàng thả Vòng Hộ Mệnh!',
    aiReplyPool: [
      'Đang lùi về Hộ Vệ quanh bạn!',
      'Vòng Hộ Mệnh sẵn sàng — đừng ngại áp sát!',
      'Đã khóa tuyến bảo vệ, để tôi đỡ đòn cho bạn!',
    ],
  },
};

export function pickCoopPingAiReply(
  order: CoopTacticalOrder,
  seedOrResponder: number | string
): string {
  const pool = COOP_TACTICAL_PINGS[order].aiReplyPool;
  if (typeof seedOrResponder === 'string') {
    const hash = seedOrResponder
      .split('')
      .reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0, 0);
    const line = pool[Math.abs(hash) % pool.length];
    return `${seedOrResponder}: "${line}"`;
  }
  const idx = Math.abs(Math.floor(seedOrResponder)) % pool.length;
  return pool[idx];
}

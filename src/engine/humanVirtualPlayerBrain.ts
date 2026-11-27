import type {
  AiAutoPilotTactic,
  AiDraftDecision,
  AiTacticalDirective,
  AiTacticalTargetPriority,
  SkillDefinition,
  SkillId,
  TacticalCrossroadsOption,
  VirtualPlayerPersonaId,
} from '../types/game';
import {
  computeAutoPilotDecision,
  selectBestSkillChoice,
  type AutoPilotDecision,
  type AutoPilotInput,
} from './aiCombatBrain';

export interface VirtualPlayerPersonaProfile {
  id: VirtualPlayerPersonaId;
  label: string;
  shortLabel: string;
  summary: string;
  defaultTactic: AiAutoPilotTactic;
  reactionDelaySec: number;
  steeringResponsiveness: number;
  arcOrbitAmplitude: number;
  kitingRangeDelta: number;
  dashAggression: number;
  holdUltForBreakDefault: boolean;
  manualResumeGraceSec: number;
  promptStyleVi: string;
}

export const VIRTUAL_PLAYER_PERSONAS: Readonly<
  Record<VirtualPlayerPersonaId, VirtualPlayerPersonaProfile>
> = {
  natural_balanced: {
    id: 'natural_balanced',
    label: 'Cân Bằng Tự Nhiên',
    shortLabel: 'Tự Nhiên',
    summary: 'Nhịp thả diều mượt, giữ Lướt né đòn Boss và chuyển nhịp công/thủ như người chơi kinh nghiệm.',
    defaultTactic: 'balanced',
    reactionDelaySec: 0.17,
    steeringResponsiveness: 9.5,
    arcOrbitAmplitude: 0.24,
    kitingRangeDelta: 0.0,
    dashAggression: 1.0,
    holdUltForBreakDefault: true,
    manualResumeGraceSec: 0.8,
    promptStyleVi: 'Người chơi cân bằng, linh hoạt thả diều, ưu tiên giữ mạng và tối ưu nhịp bắn.',
  },
  boss_hunter: {
    id: 'boss_hunter',
    label: 'Sát Thủ Săn Boss',
    shortLabel: 'Săn Boss',
    summary: 'Phản xạ nhanh 140ms, áp sát giữ áp lực DPS, canh thời điểm phá giáp Boss để dồn Tuyệt Kỹ.',
    defaultTactic: 'aggressive',
    reactionDelaySec: 0.14,
    steeringResponsiveness: 12.2,
    arcOrbitAmplitude: 0.3,
    kitingRangeDelta: -0.65,
    dashAggression: 1.22,
    holdUltForBreakDefault: true,
    manualResumeGraceSec: 0.65,
    promptStyleVi: 'Cao thủ săn Boss, áp sát quyết đoán, thích phá giáp và dứt điểm nhanh.',
  },
  cautious_kiter: {
    id: 'cautious_kiter',
    label: 'Xạ Thủ Thận Trọng',
    shortLabel: 'Thận Trọng',
    summary: 'Mở rộng vòng lượn sớm, ưu tiên nhặt cầu hồi máu và né xa mọi đòn diện rộng của Boss.',
    defaultTactic: 'evasive',
    reactionDelaySec: 0.21,
    steeringResponsiveness: 8.2,
    arcOrbitAmplitude: 0.34,
    kitingRangeDelta: 1.15,
    dashAggression: 0.85,
    holdUltForBreakDefault: false,
    manualResumeGraceSec: 0.9,
    promptStyleVi: 'Xạ thủ thận trọng, luôn ưu tiên giữ HP cao, giữ cự ly rộng và né đòn sớm.',
  },
  synergy_architect: {
    id: 'synergy_architect',
    label: 'Bậc Thầy Cộng Hưởng',
    shortLabel: 'Cộng Hưởng',
    summary: 'Ưu tiên hoàn thiện cặp Cộng Hưởng Kỹ Năng, tận dụng Trụ Cộng Hưởng và bắn góc nảy.',
    defaultTactic: 'balanced',
    reactionDelaySec: 0.16,
    steeringResponsiveness: 10.4,
    arcOrbitAmplitude: 0.26,
    kitingRangeDelta: 0.25,
    dashAggression: 1.05,
    holdUltForBreakDefault: true,
    manualResumeGraceSec: 0.75,
    promptStyleVi: 'Người chơi chiến thuật, tập trung kích hoạt Cộng Hưởng nguyên tố và Trụ Đấu Trường.',
  },
};

export const VIRTUAL_PLAYER_PERSONA_LIST: readonly VirtualPlayerPersonaProfile[] = [
  VIRTUAL_PLAYER_PERSONAS.natural_balanced,
  VIRTUAL_PLAYER_PERSONAS.boss_hunter,
  VIRTUAL_PLAYER_PERSONAS.cautious_kiter,
  VIRTUAL_PLAYER_PERSONAS.synergy_architect,
];

export function normalizeVirtualPlayerPersonaId(raw: unknown): VirtualPlayerPersonaId {
  if (
    raw === 'natural_balanced' ||
    raw === 'boss_hunter' ||
    raw === 'cautious_kiter' ||
    raw === 'synergy_architect'
  ) {
    return raw;
  }
  return 'natural_balanced';
}

export interface HumanReflexRuntimeState {
  smoothMoveX: number;
  smoothMoveZ: number;
  dangerSeenDurationSec: number;
  manualGraceRemainingSec: number;
  orbitPhaseSign: 1 | -1;
  orbitFlipTimerSec: number;
  lastStatusLabel: string;
  outDecision: AutoPilotDecision;
}

export function createHumanReflexRuntimeState(): HumanReflexRuntimeState {
  return {
    smoothMoveX: 0,
    smoothMoveZ: 0,
    dangerSeenDurationSec: 0,
    manualGraceRemainingSec: 0,
    orbitPhaseSign: 1,
    orbitFlipTimerSec: 2.6,
    lastStatusLabel: 'Quan sát đấu trường',
    outDecision: {
      moveX: 0,
      moveZ: 0,
      wantDash: false,
      wantUltimate: false,
      wantActiveSkill: false,
      statusLabel: 'Quan sát đấu trường',
      evadingDanger: false,
    },
  };
}

export function resetHumanReflexRuntimeState(runtime: HumanReflexRuntimeState): void {
  runtime.smoothMoveX = 0;
  runtime.smoothMoveZ = 0;
  runtime.dangerSeenDurationSec = 0;
  runtime.manualGraceRemainingSec = 0;
  runtime.orbitPhaseSign = 1;
  runtime.orbitFlipTimerSec = 2.6;
  runtime.lastStatusLabel = 'Quan sát đấu trường';
}

export function notifyManualTakeover(
  runtime: HumanReflexRuntimeState,
  personaId: VirtualPlayerPersonaId
): void {
  const persona = VIRTUAL_PLAYER_PERSONAS[normalizeVirtualPlayerPersonaId(personaId)];
  runtime.manualGraceRemainingSec = persona.manualResumeGraceSec;
  runtime.smoothMoveX = 0;
  runtime.smoothMoveZ = 0;
}

function clampNum(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * System 1 (60Hz Zero-GC): Wraps the core tactical auto-pilot with human-like
 * steering inertia, curved arc-kiting, reaction cadence (140–220ms), manual
 * grace recovery, and dynamic System 2 (NVIDIA NIM) strategic directives.
 */
export function stepHumanLikeAutoPilotDecision(
  input: AutoPilotInput,
  directive: AiTacticalDirective | null,
  personaId: VirtualPlayerPersonaId,
  runtime: HumanReflexRuntimeState,
  dt: number,
  nowMs: number
): AutoPilotDecision {
  const safeDt = clampNum(Number.isFinite(dt) ? dt : 0.016, 0.004, 0.1);
  const persona = VIRTUAL_PLAYER_PERSONAS[normalizeVirtualPlayerPersonaId(personaId)];
  const activeDirective = directive && nowMs <= directive.expiresAtMs ? directive : null;

  // 1. Human pause grace right after manual WASD/Joystick release so takeover feels natural
  if (runtime.manualGraceRemainingSec > 0) {
    runtime.manualGraceRemainingSec = Math.max(0, runtime.manualGraceRemainingSec - safeDt);
    const out = runtime.outDecision;
    out.moveX = 0;
    out.moveZ = 0;
    out.wantDash = false;
    out.wantUltimate = false;
    out.wantActiveSkill = false;
    out.evadingDanger = false;
    out.statusLabel = 'Chuyển nhịp về AI Tự Chơi...';
    return out;
  }

  // 2. Effective tactic from NVIDIA NIM directive (if fresh) or user/persona tactic
  const effectiveTactic: AiAutoPilotTactic = activeDirective ? activeDirective.tactic : input.tactic;
  const effectiveInput: AutoPilotInput =
    effectiveTactic === input.tactic ? input : { ...input, tactic: effectiveTactic };

  const base = computeAutoPilotDecision(effectiveInput);

  // 3. Human reaction delay on freshly-appeared non-lethal danger telegraphs
  let desiredX = base.moveX;
  let desiredZ = base.moveZ;
  let wantDash = base.wantDash;
  let statusLabel = base.statusLabel;

  if (base.evadingDanger) {
    runtime.dangerSeenDurationSec += safeDt;
    const isImminentEmergency = base.wantDash || input.hpRatio < 0.3;
    if (!isImminentEmergency && runtime.dangerSeenDurationSec < persona.reactionDelaySec) {
      // Brief natural human reaction window before snapping into full dodge velocity
      const ramp = clampNum(runtime.dangerSeenDurationSec / Math.max(0.05, persona.reactionDelaySec), 0.25, 1);
      desiredX *= ramp;
      desiredZ *= ramp;
    }
    const dashAgg = activeDirective ? activeDirective.dashAggression : persona.dashAggression;
    if (dashAgg >= 1.15 && input.dashReady && runtime.dangerSeenDurationSec >= persona.reactionDelaySec * 0.8) {
      // Aggressive Boss Hunter persona uses dash slightly earlier on dense telegraphs
      wantDash = wantDash || input.telegraphs.some((tg) => tg.timeRemainingSec <= 0.42);
    }
  } else {
    runtime.dangerSeenDurationSec = Math.max(0, runtime.dangerSeenDurationSec - safeDt * 2.5);
  }

  // 4. Curved human arc-kiting & directive kiting range offset when maneuvering
  runtime.orbitFlipTimerSec -= safeDt;
  if (runtime.orbitFlipTimerSec <= 0) {
    runtime.orbitPhaseSign = runtime.orbitPhaseSign === 1 ? -1 : 1;
    runtime.orbitFlipTimerSec = 2.2 + ((Math.floor(input.simTimeSec * 10) % 7) * 0.25);
  }

  const moveLen = Math.hypot(desiredX, desiredZ);
  if (moveLen > 0.05 && !base.evadingDanger && input.enemies.length > 0) {
    // Organic curved strafe instead of rigid straight-line kiting
    const arcBlend = persona.arcOrbitAmplitude * Math.sin(input.simTimeSec * 1.15) * runtime.orbitPhaseSign;
    const perpX = -desiredZ / moveLen;
    const perpZ = desiredX / moveLen;
    desiredX += perpX * arcBlend;
    desiredZ += perpZ * arcBlend;

    // Apply System 2 kiting range bias relative to nearest threat
    const rangeDelta = activeDirective ? activeDirective.kitingRangeDelta : persona.kitingRangeDelta;
    if (Math.abs(rangeDelta) > 0.1) {
      const target = input.enemies[0];
      const toX = target.x - input.playerX;
      const toZ = target.z - input.playerZ;
      const toDist = Math.hypot(toX, toZ);
      if (toDist > 0.2) {
        // Positive kitingRangeDelta -> bias slightly farther away; negative -> bias closer
        const radialWeight = clampNum(-rangeDelta * 0.22, -0.35, 0.35);
        desiredX += (toX / toDist) * radialWeight;
        desiredZ += (toZ / toDist) * radialWeight;
      }
    }

    const norm = Math.hypot(desiredX, desiredZ);
    if (norm > 1e-4) {
      desiredX /= norm;
      desiredZ /= norm;
    }
  }

  // 5. Steering inertia (smooth human acceleration/turn curve; snappy during danger dodge)
  const responsiveness = base.evadingDanger
    ? persona.steeringResponsiveness * 1.65
    : moveLen < 0.05
    ? persona.steeringResponsiveness * 1.9
    : persona.steeringResponsiveness;
  const alpha = 1 - Math.exp(-responsiveness * safeDt);
  runtime.smoothMoveX += (desiredX - runtime.smoothMoveX) * alpha;
  runtime.smoothMoveZ += (desiredZ - runtime.smoothMoveZ) * alpha;

  // Clean zero-snap when stopping to fire (Archero stand-to-shoot mechanic must remain crisp!)
  if (moveLen < 0.02 && Math.hypot(runtime.smoothMoveX, runtime.smoothMoveZ) < 0.14) {
    runtime.smoothMoveX = 0;
    runtime.smoothMoveZ = 0;
  }

  // 6. Smart Boss Guard-Break Ultimate Hold (human veteran discipline)
  let wantUltimate = base.wantUltimate;
  const holdUltForBreak = activeDirective
    ? activeDirective.holdUltForBreak
    : persona.holdUltForBreakDefault;
  if (wantUltimate && holdUltForBreak && input.hpRatio > 0.42) {
    const boss = input.enemies.find((e) => e.isBoss && e.hp > 0);
    if (boss && !boss.staggerBroken && !input.bossWeakPoint?.active) {
      // Wait for Boss stagger break or weak point unless boss is almost dead (< 18% HP)
      if (boss.hp / Math.max(1, boss.maxHp) > 0.18) {
        wantUltimate = false;
        if (!base.evadingDanger && moveLen < 0.05) {
          statusLabel = 'Giữ Tuyệt Kỹ chờ Boss vỡ giáp';
        }
      }
    }
  }

  const out = runtime.outDecision;
  out.moveX = clampNum(runtime.smoothMoveX, -1, 1);
  out.moveZ = clampNum(runtime.smoothMoveZ, -1, 1);
  out.wantDash = wantDash;
  out.wantUltimate = wantUltimate;
  out.wantActiveSkill = base.wantActiveSkill;
  out.statusLabel = statusLabel;
  out.evadingDanger = base.evadingDanger;
  runtime.lastStatusLabel = statusLabel;
  return out;
}

export interface TacticalPlanRequestPayload {
  personaId: VirtualPlayerPersonaId;
  chapterId: number;
  stageNumber: number;
  hpRatio: number;
  ultCharge: number;
  enemyCount: number;
  hasBoss: boolean;
  bossName?: string;
  bossHpRatio?: number;
  bossPhase?: number;
  bossStaggerBroken?: boolean;
  activeSynergies?: string[];
  eventReason: 'stage_start' | 'boss_phase' | 'low_hp' | 'persona_switch' | 'periodic';
}

export function computeLocalFallbackTacticalDirective(
  input: TacticalPlanRequestPayload,
  nowMs = Date.now()
): AiTacticalDirective {
  const personaId = normalizeVirtualPlayerPersonaId(input.personaId);
  const persona = VIRTUAL_PLAYER_PERSONAS[personaId];

  let tactic: AiAutoPilotTactic = persona.defaultTactic;
  let targetPriority: AiTacticalTargetPriority = input.hasBoss ? 'boss' : 'caster';
  let holdUltForBreak = persona.holdUltForBreakDefault;
  let kitingRangeDelta = persona.kitingRangeDelta;
  let dashAggression = persona.dashAggression;
  let thoughtVi = 'Giữ nhịp thả diều đều tay, canh khoảng trống an toàn.';

  if (input.hpRatio < 0.36) {
    tactic = 'evasive';
    holdUltForBreak = false;
    kitingRangeDelta = Math.max(kitingRangeDelta, 1.25);
    dashAggression = 1.2;
    thoughtVi = 'Máu thấp, ưu tiên giãn cự ly tìm cầu hồi máu và né đòn sớm.';
  } else if (input.hasBoss && input.bossStaggerBroken) {
    tactic = 'aggressive';
    targetPriority = 'boss';
    holdUltForBreak = false;
    kitingRangeDelta = -0.6;
    thoughtVi = 'Boss đang vỡ giáp! Áp sát xả toàn lực Tuyệt Kỹ ngay.';
  } else if (input.hasBoss && (input.bossPhase ?? 1) >= 2) {
    tactic = personaId === 'boss_hunter' ? 'balanced' : 'evasive';
    targetPriority = 'boss';
    holdUltForBreak = true;
    kitingRangeDelta = Math.max(kitingRangeDelta, 0.75);
    thoughtVi = `Boss vào Pha ${input.bossPhase}, mở rộng vòng né và giữ Tuyệt Kỹ chờ hở giáp.`;
  } else if (personaId === 'boss_hunter') {
    tactic = 'aggressive';
    targetPriority = input.hasBoss ? 'boss' : 'low_hp';
    thoughtVi = input.hasBoss
      ? 'Ép nhịp sát thương lên Boss, canh Lướt phản công chính xác.'
      : 'Áp sát dọn nhanh mục tiêu yếu để giữ chuỗi Combo cao.';
  } else if (personaId === 'synergy_architect') {
    tactic = 'balanced';
    targetPriority = input.hasBoss ? 'boss' : 'traps';
    thoughtVi = 'Lựa góc kéo quái qua Trụ Cộng Hưởng và tối ưu sát thương lan.';
  } else if (personaId === 'cautious_kiter') {
    tactic = 'evasive';
    targetPriority = input.hasBoss ? 'boss' : 'caster';
    thoughtVi = 'Giữ vòng lượn xa, ưu tiên hạ pháp sư tầm xa trước.';
  } else if (input.enemyCount >= 5) {
    tactic = 'balanced';
    targetPriority = 'caster';
    thoughtVi = 'Đông quái trong phòng, lượn vòng biên hạ quái bắn xa trước.';
  }

  return {
    tactic,
    targetPriority,
    holdUltForBreak,
    kitingRangeDelta: Number(clampNum(kitingRangeDelta, -1.6, 2.2).toFixed(2)),
    dashAggression: Number(clampNum(dashAggression, 0.65, 1.35).toFixed(2)),
    thoughtVi,
    personaId,
    source: 'local_fallback',
    model: 'local-human-reflex-v1',
    expiresAtMs: nowMs + 18_000,
  };
}

export function computeLocalFallbackSkillDraftDecision(params: {
  choices: SkillDefinition[];
  currentStacks: Partial<Record<SkillId, number>>;
  personaId: VirtualPlayerPersonaId;
  tactic: AiAutoPilotTactic;
}): AiDraftDecision {
  const persona = VIRTUAL_PLAYER_PERSONAS[normalizeVirtualPlayerPersonaId(params.personaId)];
  const effectiveTactic = persona.defaultTactic || params.tactic;
  const picked = selectBestSkillChoice(params.choices, params.currentStacks, effectiveTactic) ?? params.choices[0];
  const reasonByPersona: Record<VirtualPlayerPersonaId, string> = {
    natural_balanced: `Chọn ${picked?.name ?? 'kỹ năng này'} để cân bằng sát thương và sinh tồn trong chương hiện tại.`,
    boss_hunter: `Ưu tiên ${picked?.name ?? 'kỹ năng này'} để tối đa hóa sát thương đơn mục tiêu dứt điểm Boss.`,
    cautious_kiter: `Chọn ${picked?.name ?? 'kỹ năng này'} giúp giữ nhịp thả diều an toàn và giảm áp lực né đòn.`,
    synergy_architect: `Lấy ${picked?.name ?? 'kỹ năng này'} để đẩy nhanh chuỗi Cộng Hưởng build hiện tại.`,
  };
  return {
    selectedId: picked?.id ?? '',
    reasonVi: reasonByPersona[persona.id],
    source: 'local_fallback',
    model: 'local-draft-heuristic-v1',
  };
}

export function computeLocalFallbackCrossroadsDecision(params: {
  options: [TacticalCrossroadsOption, TacticalCrossroadsOption];
  hpRatio: number;
  personaId: VirtualPlayerPersonaId;
}): AiDraftDecision {
  const personaId = normalizeVirtualPlayerPersonaId(params.personaId);
  const [optA, optB] = params.options;
  const scoreOption = (opt: TacticalCrossroadsOption): number => {
    let score = 0;
    const isSafe = opt.enemyHpMult <= 1.05 && opt.enemyDmgMult <= 1.05;
    const isHighReward = opt.goldBonusPct >= 25 || opt.bonusCritPct > 0 || opt.bonusAtkPct > 0;
    if (params.hpRatio < 0.52) {
      score += isSafe ? 30 : -15;
    }
    if (personaId === 'boss_hunter') {
      score += isHighReward ? 24 : 5;
    } else if (personaId === 'cautious_kiter') {
      score += isSafe ? 26 : 0;
    } else if (personaId === 'synergy_architect') {
      score += opt.bonusCritPct > 0 || opt.bonusAtkPct > 0 ? 22 : 12;
    } else {
      score += isHighReward && params.hpRatio >= 0.65 ? 18 : 14;
    }
    return score;
  };
  const chosen = scoreOption(optA) >= scoreOption(optB) ? optA : optB;
  const reasonVi =
    params.hpRatio < 0.52
      ? `HP đang thấp, chọn ${chosen.title} để giữ an toàn qua phòng kế.`
      : `Chọn ${chosen.title} phù hợp phong cách ${VIRTUAL_PLAYER_PERSONAS[personaId].shortLabel}.`;
  return {
    selectedId: chosen.id,
    reasonVi,
    source: 'local_fallback',
    model: 'local-crossroads-heuristic-v1',
  };
}

import type {
  AiAutoPilotTactic,
  AiDraftDecision,
  AiLivePlayerPersonality,
  AiTacticalDirective,
  NvidiaAiStatusSnapshot,
  SkillDefinition,
  SkillId,
  TacticalCrossroadsOption,
  VirtualBuildCoachResult,
  VirtualCompanionCalloutResult,
  VirtualCompanionCommandId,
  VirtualDmMessage,
  VirtualPlayerPersonaId,
  VirtualPlayerRelationshipMemory,
  VirtualPostMatchCommentaryResult,
} from '../types/game';
import { shouldSkipNodeApiEndpoints } from '../engine/glbFetchResilience';
import {
  computeLocalFallbackCrossroadsDecision,
  computeLocalFallbackSkillDraftDecision,
  computeLocalFallbackTacticalDirective,
  normalizeVirtualPlayerPersonaId,
  type TacticalPlanRequestPayload,
} from '../engine/humanVirtualPlayerBrain';

const TACTICAL_MIN_INTERVAL_MS = 4_500;
const TACTICAL_TIMEOUT_MS = 6_500;
const DRAFT_TIMEOUT_MS = 2_300;
const STATUS_TIMEOUT_MS = 2_500;

let lastTacticalCallAtMs = 0;
let tacticalInFlight = false;

async function fetchJsonWithTimeout<T>(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<T | null> {
  if (typeof fetch !== 'function' || shouldSkipNodeApiEndpoints()) {
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchNvidiaAiStatus(): Promise<NvidiaAiStatusSnapshot> {
  const fallback: NvidiaAiStatusSnapshot = {
    configured: false,
    mode: 'local_fallback',
    primaryModel: 'nvidia/nemotron-3.5-lightning-30b-a3b',
    fastModel: 'nvidia/nemotron-3.5-bolt-e4b',
    rpmBudget: 30,
    remainingRpm: 0,
  };
  const data = await fetchJsonWithTimeout<NvidiaAiStatusSnapshot>(
    '/api/ai/nvidia/status',
    { method: 'GET' },
    STATUS_TIMEOUT_MS
  );
  if (!data || typeof data.configured !== 'boolean') {
    return fallback;
  }
  return data;
}

/**
 * Non-blocking System 2 tactical directive request for the Virtual Player AI.
 * Rate-paced client-side (>= 4.5s between calls) and falls back immediately
 * to local human-like heuristics if offline, unconfigured, or rate-limited.
 */
export async function requestNvidiaTacticalPlan(
  payload: TacticalPlanRequestPayload,
  force = false
): Promise<AiTacticalDirective> {
  const nowMs = Date.now();
  const localFallback = computeLocalFallbackTacticalDirective(payload, nowMs);

  if (
    !force &&
    (tacticalInFlight || nowMs - lastTacticalCallAtMs < TACTICAL_MIN_INTERVAL_MS)
  ) {
    return localFallback;
  }

  tacticalInFlight = true;
  lastTacticalCallAtMs = nowMs;
  try {
    const remote = await fetchJsonWithTimeout<AiTacticalDirective>(
      '/api/ai/nvidia/tactical-plan',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
      TACTICAL_TIMEOUT_MS
    );
    if (
      remote &&
      (remote.tactic === 'aggressive' ||
        remote.tactic === 'balanced' ||
        remote.tactic === 'evasive') &&
      typeof remote.thoughtVi === 'string' &&
      remote.thoughtVi.length > 0
    ) {
      return remote;
    }
    return localFallback;
  } finally {
    tacticalInFlight = false;
  }
}

export async function requestNvidiaSkillDraftDecision(params: {
  personaId: VirtualPlayerPersonaId;
  tactic: AiAutoPilotTactic;
  chapterId: number;
  stageNumber: number;
  hpRatio: number;
  isBossStage: boolean;
  choices: SkillDefinition[];
  currentStacks: Partial<Record<SkillId, number>>;
  synergyHintsBySkillId?: Record<string, string>;
}): Promise<AiDraftDecision> {
  const personaId = normalizeVirtualPlayerPersonaId(params.personaId);
  const localFallback = computeLocalFallbackSkillDraftDecision({
    choices: params.choices,
    currentStacks: params.currentStacks,
    personaId,
    tactic: params.tactic,
  });

  if (params.choices.length === 0) return localFallback;

  const currentSkillSummary = Object.entries(params.currentStacks)
    .filter(([, count]) => typeof count === 'number' && count > 0)
    .slice(0, 8)
    .map(([id, count]) => `${id} x${count}`);

  const remote = await fetchJsonWithTimeout<AiDraftDecision>(
    '/api/ai/nvidia/draft-decision',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'skill',
        personaId,
        tactic: params.tactic,
        chapterId: params.chapterId,
        stageNumber: params.stageNumber,
        hpRatio: params.hpRatio,
        isBossStage: params.isBossStage,
        currentSkillSummary,
        choices: params.choices.map((s) => ({
          id: s.id,
          name: s.name,
          rarity: s.rarity,
          summary: s.description,
          synergyHint: params.synergyHintsBySkillId?.[s.id] ?? '',
        })),
      }),
    },
    DRAFT_TIMEOUT_MS
  );

  if (
    remote &&
    typeof remote.selectedId === 'string' &&
    params.choices.some((c) => c.id === remote.selectedId)
  ) {
    return remote;
  }
  return localFallback;
}

export async function requestNvidiaCrossroadsDecision(params: {
  personaId: VirtualPlayerPersonaId;
  tactic: AiAutoPilotTactic;
  chapterId: number;
  stageNumber: number;
  hpRatio: number;
  options: [TacticalCrossroadsOption, TacticalCrossroadsOption];
}): Promise<AiDraftDecision> {
  const personaId = normalizeVirtualPlayerPersonaId(params.personaId);
  const localFallback = computeLocalFallbackCrossroadsDecision({
    options: params.options,
    hpRatio: params.hpRatio,
    personaId,
  });

  const remote = await fetchJsonWithTimeout<AiDraftDecision>(
    '/api/ai/nvidia/draft-decision',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        kind: 'crossroads',
        personaId,
        tactic: params.tactic,
        chapterId: params.chapterId,
        stageNumber: params.stageNumber,
        hpRatio: params.hpRatio,
        isBossStage: false,
        currentSkillSummary: [],
        choices: params.options.map((opt) => ({
          id: opt.id,
          name: opt.title,
          rarity: 'epic',
          summary: `${opt.riskSummary} | ${opt.rewardSummary}`,
          synergyHint: opt.doctrineLabel,
        })),
      }),
    },
    DRAFT_TIMEOUT_MS
  );

  if (
    remote &&
    typeof remote.selectedId === 'string' &&
    params.options.some((o) => o.id === remote.selectedId)
  ) {
    return remote;
  }
  return localFallback;
}

// ============================================================================
// PHASE 2 CLIENT BRIDGE: MEMORY, 1-ON-1 DM, BUILD COACH, POST-MATCH & CALLOUTS
// ============================================================================

const DM_TIMEOUT_MS = 7_500;
const COACH_TIMEOUT_MS = 7_500;
const POST_MATCH_TIMEOUT_MS = 5_000;
const CALLOUT_TIMEOUT_MS = 3_500;
const AUTO_CALLOUT_MIN_INTERVAL_MS = 18_000;

let lastAutoCalloutAtMs = 0;

export async function fetchVirtualPlayerMemory(
  playerName: string,
  aiPlayerId: string,
  aiNameFallback = 'Linh Vũ'
): Promise<VirtualPlayerRelationshipMemory> {
  const fallback: VirtualPlayerRelationshipMemory = {
    aiPlayerId,
    aiName: aiNameFallback,
    affinityScore: 0,
    tier: 'stranger',
    memories: [],
    dmMessages: [],
    updatedAtMs: Date.now(),
  };
  const qs = encodeURIComponent(playerName.trim() || 'Xạ Thủ');
  const remote = await fetchJsonWithTimeout<VirtualPlayerRelationshipMemory>(
    `/api/ai/nvidia/memory/${encodeURIComponent(aiPlayerId)}?playerName=${qs}`,
    { method: 'GET' },
    STATUS_TIMEOUT_MS
  );
  if (remote && typeof remote.affinityScore === 'number' && Array.isArray(remote.memories)) {
    return remote;
  }
  return fallback;
}

export async function sendVirtualPlayerDm(params: {
  aiPlayerId: string;
  aiName: string;
  aiPersonality: AiLivePlayerPersonality;
  aiTitle?: string;
  playerName: string;
  message: string;
  playerPowerRating: number;
  playerChapterId: number;
  playerWeaponName?: string;
}): Promise<{
  playerMessage: VirtualDmMessage;
  aiMessage: VirtualDmMessage;
  affinityDelta: number;
  source: 'nvidia_nim' | 'local_fallback';
  memory: VirtualPlayerRelationshipMemory | null;
}> {
  const nowMs = Date.now();
  const cleanMsg = params.message.replace(/\s+/g, ' ').trim().slice(0, 200);
  const localFallback = {
    playerMessage: {
      id: `dm_local_p_${nowMs}`,
      sender: 'player' as const,
      text: cleanMsg,
      timestampMs: nowMs,
    },
    aiMessage: {
      id: `dm_local_a_${nowMs + 1}`,
      sender: 'ai' as const,
      text: `Với ${params.playerPowerRating.toLocaleString('vi-VN')} LC ở Chương ${params.playerChapterId}, ưu tiên nâng Vũ Khí và chọn thẻ Cộng Hưởng nhé!`,
      timestampMs: nowMs + 1,
      source: 'local_fallback' as const,
    },
    affinityDelta: 2,
    source: 'local_fallback' as const,
    memory: null,
  };

  const remote = await fetchJsonWithTimeout<{
    playerMessage: VirtualDmMessage;
    aiMessage: VirtualDmMessage;
    affinityDelta: number;
    source: 'nvidia_nim' | 'local_fallback';
    memory: VirtualPlayerRelationshipMemory;
  }>(
    '/api/ai/nvidia/dm',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    DM_TIMEOUT_MS
  );

  if (remote && remote.aiMessage && typeof remote.aiMessage.text === 'string') {
    return remote;
  }
  return localFallback;
}

export async function requestVirtualBuildCoach(params: {
  aiPlayerId?: string;
  aiName?: string;
  aiPersonality?: AiLivePlayerPersonality;
  playerName: string;
  playerPowerRating: number;
  recommendedPower?: number;
  chapterId: number;
  stageReached: number;
  weaponName?: string;
  armorName?: string;
  activeSkills?: string[];
  defeatCause?: string;
  question?: string;
}): Promise<VirtualBuildCoachResult> {
  const fallback: VirtualBuildCoachResult = {
    aiPlayerId: params.aiPlayerId ?? 'ai_mentor',
    aiName: params.aiName ?? 'Linh Vũ',
    headlineVi: `Phân tích nhanh build Chương ${params.chapterId} (${params.playerPowerRating.toLocaleString('vi-VN')} LC).`,
    tipsVi: [
      `Ưu tiên cường hóa ${params.weaponName || 'Vũ Khí chính'} trước để tăng DPS vượt ngưỡng Boss.`,
      'Ghép thẻ Đa Tiễn + Bắn Nảy hoặc Băng Tiễn để kiểm soát phòng đông quái.',
      'Giữ Tuyệt Kỹ tới lúc Boss vỡ giáp và dùng lệnh Bảo Vệ cho đồng đội khi máu dưới 45%.',
    ],
    recommendedActionVi: 'Cường hóa Vũ Khí hoặc vào trận canh Né Hoàn Hảo phản đòn.',
    source: 'local_fallback',
    model: 'local-build-coach-v1',
  };

  const remote = await fetchJsonWithTimeout<VirtualBuildCoachResult>(
    '/api/ai/nvidia/build-coach',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    COACH_TIMEOUT_MS
  );
  if (remote && typeof remote.headlineVi === 'string' && Array.isArray(remote.tipsVi)) {
    return remote;
  }
  return fallback;
}

export async function requestVirtualPostMatchCommentary(params: {
  aiPlayerId?: string;
  aiName?: string;
  playerName: string;
  mode: 'campaign' | 'arena' | 'coop' | 'boss';
  isVictory: boolean;
  chapterId: number;
  stageReached: number;
  kills: number;
  maxCombo: number;
  defeatCause?: string;
}): Promise<VirtualPostMatchCommentaryResult> {
  const fallback: VirtualPostMatchCommentaryResult = {
    aiPlayerId: params.aiPlayerId ?? 'ai_01',
    aiName: params.aiName ?? 'Linh Vũ',
    aiTitle: 'Cao Thủ Tinh Giới',
    relationshipTier: 'acquaintance',
    affinityScore: 5,
    affinityDelta: params.isVictory ? 3 : 1,
    commentVi: params.isVictory
      ? `Đánh quá mượt! Chuỗi combo ×${params.maxCombo} ở Chương ${params.chapterId} rất ấn tượng.`
      : `Dừng ở phòng ${params.stageReached} cũng rất sát rồi, chỉnh nhẹ thẻ kỹ năng là qua ngay!`,
    source: 'local_fallback',
    model: 'local-postmatch-v1',
  };

  const remote = await fetchJsonWithTimeout<VirtualPostMatchCommentaryResult>(
    '/api/ai/nvidia/post-match',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    POST_MATCH_TIMEOUT_MS
  );
  if (remote && typeof remote.commentVi === 'string' && remote.commentVi.length > 0) {
    return remote;
  }
  return fallback;
}

export async function requestVirtualCompanionCallout(params: {
  allyName: string;
  allyRole: string;
  command: VirtualCompanionCommandId;
  trigger: 'player_command' | 'boss_break' | 'boss_phase' | 'low_hp';
  chapterId: number;
  hpRatio: number;
  bossName?: string;
}): Promise<VirtualCompanionCalloutResult> {
  const fallbackByCmd: Record<VirtualCompanionCommandId, string> = {
    focus_boss: params.bossName
      ? `Rõ! Tập trung hỏa lực vào ${params.bossName}!`
      : 'Rõ! Dồn toàn lực mục tiêu chính!',
    protect_player: 'Đang áp sát che chắn và dọn quái quanh bạn!',
    sync_burst: 'Đồng loạt xả Tuyệt Kỹ liên kích ngay!',
  };
  const fallback: VirtualCompanionCalloutResult = {
    allyName: params.allyName,
    command: params.command,
    calloutVi:
      params.trigger === 'low_hp'
        ? 'Máu bạn thấp rồi, để mình chắn đòn!'
        : params.trigger === 'boss_break'
        ? 'Boss vỡ giáp rồi, dồn sát thương ngay!'
        : fallbackByCmd[params.command],
    source: 'local_fallback',
    model: 'local-callout-v1',
  };

  const nowMs = Date.now();
  if (params.trigger !== 'player_command' && nowMs - lastAutoCalloutAtMs < AUTO_CALLOUT_MIN_INTERVAL_MS) {
    return fallback;
  }
  if (params.trigger !== 'player_command') {
    lastAutoCalloutAtMs = nowMs;
  }

  const remote = await fetchJsonWithTimeout<VirtualCompanionCalloutResult>(
    '/api/ai/nvidia/callout',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    CALLOUT_TIMEOUT_MS
  );
  if (remote && typeof remote.calloutVi === 'string' && remote.calloutVi.length > 0) {
    return remote;
  }
  return fallback;
}


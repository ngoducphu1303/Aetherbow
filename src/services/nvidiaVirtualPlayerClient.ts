import type {
  AiAutoPilotTactic,
  AiDraftDecision,
  AiLivePlayerPersonality,
  AiTacticalDirective,
  NvidiaAiStatusSnapshot,
  SkillDefinition,
  SkillId,
  TacticalCrossroadsOption,
  VirtualAuctionPsychReaction,
  VirtualBuildCoachResult,
  VirtualCompanionCalloutResult,
  VirtualCompanionCommandId,
  VirtualContractObjectiveKind,
  VirtualDmMessage,
  VirtualGuildWarBriefing,
  VirtualHaggleOfferItem,
  VirtualNemesisChallengeLetter,
  VirtualPlayerContract,
  VirtualPlayerPersonaId,
  VirtualPlayerRelationshipMemory,
  VirtualPostMatchCommentaryResult,
  VirtualSpectatorCastingBundle,
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

// ============================================================================
// PHASE 3 CLIENT BRIDGE: NEMESIS, CONTRACTS, CASTING, AUCTION/HAGGLE & WAR-ROOM
// ============================================================================

const PHASE3_TIMEOUT_MS = 7_500;

export async function requestNemesisChallengeLetter(params: {
  playerName: string;
  aiPlayerId?: string;
  aiName?: string;
  forceRefresh?: boolean;
}): Promise<VirtualNemesisChallengeLetter> {
  const nowMs = Date.now();
  const fallback: VirtualNemesisChallengeLetter = {
    id: `nem_local_${nowMs}`,
    aiPlayerId: params.aiPlayerId ?? 'ai_01',
    aiName: params.aiName ?? 'Huyết Ưng',
    aiTitle: 'Cao Thủ Đấu Trường',
    rivalTier: 'contender',
    rivalryScore: 25,
    counterStyle: 'anti_kite',
    counterLabelVi: 'Khóa Góc Áp Sát',
    letterVi: `${params.playerName}, ta đã phân tích lối đánh của bạn và đổi sang chiến thuật áp sát mới. Vào Đấu Trường so tài lại ngay!`,
    counterHintVi: 'Giữ Dash cho pha áp sát đầu tiên và phản công bằng Tuyệt Kỹ khi đối thủ vừa hụt chiêu.',
    createdAtMs: nowMs,
    expiresAtMs: nowMs + 6 * 3_600_000,
    source: 'local_fallback',
    model: 'local-nemesis-v1',
  };

  const remote = await fetchJsonWithTimeout<VirtualNemesisChallengeLetter>(
    '/api/ai/nvidia/nemesis-letter',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    PHASE3_TIMEOUT_MS
  );
  if (remote && typeof remote.letterVi === 'string' && remote.letterVi.length > 0) {
    return remote;
  }
  return fallback;
}

export async function acceptNemesisChallengeLetter(params: {
  playerName: string;
  aiPlayerId: string;
}): Promise<boolean> {
  const remote = await fetchJsonWithTimeout<{ ok: boolean }>(
    '/api/ai/nvidia/nemesis-letter/accept',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    STATUS_TIMEOUT_MS
  );
  return Boolean(remote?.ok);
}

export async function fetchVirtualContracts(
  playerName: string
): Promise<VirtualPlayerContract[]> {
  const qs = encodeURIComponent(playerName.trim() || 'Xạ Thủ');
  const remote = await fetchJsonWithTimeout<{ contracts: VirtualPlayerContract[] }>(
    `/api/ai/nvidia/contracts?playerName=${qs}`,
    { method: 'GET' },
    STATUS_TIMEOUT_MS
  );
  return Array.isArray(remote?.contracts) ? remote.contracts : [];
}

export async function generateVirtualContract(params: {
  playerName: string;
  aiPlayerId?: string;
  chapterId: number;
  playerPowerRating: number;
}): Promise<{
  ok: boolean;
  contract?: VirtualPlayerContract;
  contracts: VirtualPlayerContract[];
  message?: string;
}> {
  const remote = await fetchJsonWithTimeout<{
    ok: boolean;
    contract?: VirtualPlayerContract;
    contracts?: VirtualPlayerContract[];
    message?: string;
  }>(
    '/api/ai/nvidia/contracts/generate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    PHASE3_TIMEOUT_MS
  );
  if (remote && Array.isArray(remote.contracts)) {
    return {
      ok: Boolean(remote.ok),
      contract: remote.contract,
      contracts: remote.contracts,
      message: remote.message,
    };
  }
  return {
    ok: false,
    contracts: await fetchVirtualContracts(params.playerName),
    message: 'Không thể tạo kèo mới lúc này (hoặc bạn đã đạt tối đa 3 kèo đang chạy).',
  };
}

export async function reportVirtualContractProgress(params: {
  playerName: string;
  objectiveKind: VirtualContractObjectiveKind;
  delta?: number;
  chapterId?: number;
  hpRatio?: number;
}): Promise<VirtualPlayerContract[]> {
  const remote = await fetchJsonWithTimeout<{ ok: boolean; contracts?: VirtualPlayerContract[] }>(
    '/api/ai/nvidia/contracts/progress',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    STATUS_TIMEOUT_MS
  );
  return Array.isArray(remote?.contracts) ? remote.contracts : [];
}

export async function claimVirtualContractReward(params: {
  playerName: string;
  contractId: string;
}): Promise<{
  ok: boolean;
  alreadyClaimed: boolean;
  goldReward: number;
  gemsReward: number;
  affinityDelta: number;
  message: string;
  contracts: VirtualPlayerContract[];
}> {
  const remote = await fetchJsonWithTimeout<{
    ok: boolean;
    alreadyClaimed: boolean;
    goldReward: number;
    gemsReward: number;
    affinityDelta: number;
    message: string;
    contracts: VirtualPlayerContract[];
  }>(
    '/api/ai/nvidia/contracts/claim',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    STATUS_TIMEOUT_MS
  );
  if (remote) return remote;
  return {
    ok: false,
    alreadyClaimed: false,
    goldReward: 0,
    gemsReward: 0,
    affinityDelta: 0,
    message: 'Không thể kết nối máy chủ để nhận thưởng kèo.',
    contracts: [],
  };
}

export async function requestSpectatorCasting(params: {
  playerName: string;
  matchId?: string;
  fighterAName?: string;
  fighterAPower?: number;
  fighterAHpPct?: number;
  fighterBName?: string;
  fighterBPower?: number;
  fighterBHpPct?: number;
  winnerName?: string;
}): Promise<VirtualSpectatorCastingBundle> {
  const nowMs = Date.now();
  const favored =
    (params.fighterAPower ?? 1000) >= (params.fighterBPower ?? 1000)
      ? params.fighterAName ?? 'Cao Thủ A'
      : params.fighterBName ?? 'Cao Thủ B';
  const fallback: VirtualSpectatorCastingBundle = {
    matchId: params.matchId ?? 'spec_local',
    scoutingSummaryVi: `${favored} nhỉnh hơn nhẹ về lực chiến, nhưng nhịp Né Hoàn Hảo có thể xoay chuyển cục diện.`,
    favoredFighterName: favored,
    lines: [
      {
        id: `cast_local_${nowMs}`,
        matchId: params.matchId ?? 'spec_local',
        moment: params.winnerName ? 'finish' : 'opening',
        speakerName: 'BLV Tinh Giới',
        textVi: params.winnerName
          ? `${params.winnerName} đã tung đòn quyết định khép lại trận đấu nghẹt thở!`
          : `Hai cao thủ đang thăm dò nhau từng nhịp bắn trên Khán Đài Tinh Giới!`,
        timestampMs: nowMs,
        source: 'local_fallback',
      },
    ],
    updatedAtMs: nowMs,
    source: 'local_fallback',
    model: 'local-caster-v1',
  };

  const remote = await fetchJsonWithTimeout<VirtualSpectatorCastingBundle>(
    '/api/ai/nvidia/spectator-cast',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    PHASE3_TIMEOUT_MS
  );
  if (remote && typeof remote.scoutingSummaryVi === 'string' && Array.isArray(remote.lines)) {
    return remote;
  }
  return fallback;
}

export async function requestAuctionPsychReaction(params: {
  lotId: string;
  lotLabel: string;
  aiPlayerId?: string;
  aiName: string;
  currentBid: number;
  buyoutPrice: number;
  playerJustBid: boolean;
}): Promise<VirtualAuctionPsychReaction> {
  const nowMs = Date.now();
  const fallback: VirtualAuctionPsychReaction = {
    id: `auc_local_${nowMs}`,
    lotId: params.lotId,
    aiPlayerId: params.aiPlayerId ?? 'ai_01',
    aiName: params.aiName,
    stance: 'testing',
    stanceLabelVi: 'Thăm dò giá',
    tauntVi: `Mức ${params.currentBid} Ngọc cho ${params.lotLabel} khá căng rồi đấy, bạn có theo tiếp không?`,
    timestampMs: nowMs,
    source: 'local_fallback',
    model: 'local-auction-psych-v1',
  };

  const remote = await fetchJsonWithTimeout<VirtualAuctionPsychReaction>(
    '/api/ai/nvidia/auction-react',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    POST_MATCH_TIMEOUT_MS
  );
  if (remote && typeof remote.tauntVi === 'string' && remote.tauntVi.length > 0) {
    return remote;
  }
  return fallback;
}

export async function fetchVirtualHaggleOffers(
  playerName: string
): Promise<VirtualHaggleOfferItem[]> {
  const qs = encodeURIComponent(playerName.trim() || 'Xạ Thủ');
  const remote = await fetchJsonWithTimeout<{ offers: VirtualHaggleOfferItem[] }>(
    `/api/ai/nvidia/haggle/offers?playerName=${qs}`,
    { method: 'GET' },
    STATUS_TIMEOUT_MS
  );
  return Array.isArray(remote?.offers) ? remote.offers : [];
}

export async function negotiateVirtualHaggleOffer(params: {
  playerName: string;
  offerId: string;
  offeredGems: number;
  playerMessage?: string;
}): Promise<{
  ok: boolean;
  decision: 'accept' | 'counter' | 'reject';
  finalPriceGems: number;
  counterPriceGems: number;
  replyVi: string;
  source: 'nvidia_nim' | 'local_fallback';
  offer: VirtualHaggleOfferItem | null;
  offers: VirtualHaggleOfferItem[];
  error?: string;
}> {
  const remote = await fetchJsonWithTimeout<{
    ok: boolean;
    decision: 'accept' | 'counter' | 'reject';
    finalPriceGems: number;
    counterPriceGems: number;
    replyVi: string;
    source: 'nvidia_nim' | 'local_fallback';
    offer: VirtualHaggleOfferItem | null;
    offers: VirtualHaggleOfferItem[];
    error?: string;
  }>(
    '/api/ai/nvidia/haggle/negotiate',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    PHASE3_TIMEOUT_MS
  );
  if (remote) return remote;
  return {
    ok: false,
    decision: 'reject',
    finalPriceGems: 0,
    counterPriceGems: 0,
    replyVi: 'Không thể kết nối quầy thương lượng lúc này.',
    source: 'local_fallback',
    offer: null,
    offers: [],
    error: 'NETWORK_ERROR',
  };
}

export async function requestGuildWarBriefing(params: {
  playerName: string;
  mode: 'guild_boss' | 'guild_war';
  forceRefresh?: boolean;
}): Promise<VirtualGuildWarBriefing | null> {
  const remote = await fetchJsonWithTimeout<VirtualGuildWarBriefing>(
    '/api/ai/nvidia/guild-briefing',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    PHASE3_TIMEOUT_MS
  );
  if (remote && typeof remote.briefingVi === 'string') return remote;
  return null;
}

export async function confirmGuildWarBriefing(params: {
  playerName: string;
  mode: 'guild_boss' | 'guild_war';
  sessionId: string;
}): Promise<VirtualGuildWarBriefing | null> {
  const remote = await fetchJsonWithTimeout<{
    ok: boolean;
    briefing: VirtualGuildWarBriefing | null;
  }>(
    '/api/ai/nvidia/guild-briefing/confirm',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    },
    STATUS_TIMEOUT_MS
  );
  return remote?.briefing ?? null;
}



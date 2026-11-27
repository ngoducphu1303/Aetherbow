import type {
  AiAutoPilotTactic,
  AiDraftDecision,
  AiLivePlayerPersonality,
  AiTacticalDirective,
  AiTacticalTargetPriority,
  NvidiaAiStatusSnapshot,
  VirtualBuildCoachResult,
  VirtualCompanionCalloutResult,
  VirtualCompanionCommandId,
  VirtualDmMessage,
  VirtualMemoryEntry,
  VirtualPlayerPersonaId,
  VirtualPostMatchCommentaryResult,
  VirtualRelationshipTier,
} from '../types/game.ts';
import {
  computeLocalFallbackTacticalDirective,
  normalizeVirtualPlayerPersonaId,
  VIRTUAL_PLAYER_PERSONAS,
  type TacticalPlanRequestPayload,
} from '../engine/humanVirtualPlayerBrain.ts';

/**
 * Official NVIDIA NIM OpenAI-compatible chat completions endpoint.
 * Hardcoded allowlisted host prevents SSRF from untrusted client payloads.
 */
export const NVIDIA_NIM_CHAT_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
export const DEFAULT_NVIDIA_PRIMARY_MODEL = 'nvidia/nemotron-3.5-lightning-30b-a3b';
export const DEFAULT_NVIDIA_FAST_MODEL = 'nvidia/nemotron-3.5-bolt-e4b';
export const DEFAULT_NVIDIA_BACKUP_MODEL = 'google/gemma-3-12b-it';
const DEPRECATED_NVIDIA_MODELS = new Set([
  'meta/llama-3.3-70b-instruct',
  'meta/llama-3.1-8b-instruct',
  'meta/llama-3.1-70b-instruct',
]);
export const DEFAULT_NVIDIA_RPM_BUDGET = 30;
export const BACKGROUND_RPM_RESERVE = 10;
const REQUEST_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 15_000;
const MAX_CACHE_ENTRIES = 80;

export interface NvidiaDraftChoiceInput {
  id: string;
  name: string;
  rarity?: string;
  summary: string;
  synergyHint?: string;
}

export interface NvidiaDraftRequestPayload {
  kind: 'skill' | 'crossroads';
  personaId: VirtualPlayerPersonaId;
  tactic: AiAutoPilotTactic;
  chapterId: number;
  stageNumber: number;
  hpRatio: number;
  isBossStage: boolean;
  currentSkillSummary: string[];
  choices: NvidiaDraftChoiceInput[];
}

export interface NvidiaVirtualChatRequestPayload {
  channel: 'lobby' | 'guild' | 'arena' | 'coop';
  aiName: string;
  aiPersonality: AiLivePlayerPersonality;
  aiTitle?: string;
  senderName: string;
  userText: string;
  contextSummary?: string;
}

export interface NvidiaVirtualChatResult {
  replyVi: string;
  source: 'nvidia_nim' | 'local_fallback';
  model: string;
}

export interface NvidiaDirectMessageRequestPayload {
  aiPlayerId: string;
  aiName: string;
  aiPersonality: AiLivePlayerPersonality;
  aiTitle?: string;
  aiFavoriteSkills?: string[];
  playerName: string;
  playerMessage: string;
  playerPowerRating: number;
  playerChapterId: number;
  playerWeaponName?: string;
  relationshipTier: VirtualRelationshipTier;
  affinityScore: number;
  recentMemories: VirtualMemoryEntry[];
  recentDmMessages: VirtualDmMessage[];
}

export interface NvidiaDirectMessageResult {
  replyVi: string;
  affinityDelta: number;
  source: 'nvidia_nim' | 'local_fallback';
  model: string;
}

export interface NvidiaBuildCoachRequestPayload {
  aiPlayerId: string;
  aiName: string;
  aiPersonality: AiLivePlayerPersonality;
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
}

export interface NvidiaPostMatchRequestPayload {
  aiPlayerId: string;
  aiName: string;
  aiPersonality: AiLivePlayerPersonality;
  aiTitle?: string;
  mode: 'campaign' | 'arena' | 'coop' | 'boss';
  isVictory: boolean;
  chapterId: number;
  stageReached: number;
  kills: number;
  maxCombo: number;
  relationshipTier: VirtualRelationshipTier;
  affinityScore: number;
  recentMemories: VirtualMemoryEntry[];
  defeatCause?: string;
}

export interface NvidiaCompanionCalloutRequestPayload {
  allyName: string;
  allyRole: string;
  command: VirtualCompanionCommandId;
  trigger: 'player_command' | 'boss_break' | 'boss_phase' | 'low_hp';
  chapterId: number;
  hpRatio: number;
  bossName?: string;
}

export interface NvidiaAutonomousBanterRequestPayload {
  channel: 'lobby' | 'guild';
  eventSummary: string;
  speakerA: { id: string; name: string; personality: AiLivePlayerPersonality; title?: string };
  speakerB: { id: string; name: string; personality: AiLivePlayerPersonality; title?: string };
}

export interface NvidiaAutonomousBanterResult {
  lineA: string;
  lineB: string;
  source: 'nvidia_nim' | 'local_fallback';
  model: string;
}

export interface NvidiaNimServiceOptions {
  apiKey?: string;
  primaryModel?: string;
  fastModel?: string;
  rpmBudget?: number;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

interface CacheEntry<T> {
  value: T;
  expiresAtMs: number;
}

/**
 * Strips control characters, prompt-injection delimiters, and caps length
 * before passing any user-provided text to the NVIDIA NIM model.
 */
export function sanitizePromptText(raw: unknown, maxLen: number): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/```+/g, ' ')
    .replace(/\b(ignore\s+previous|system\s*:|assistant\s*:|developer\s*:)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

/**
 * Strips any accidental markdown/HTML tags from model text output before returning
 * plain Vietnamese copy to React text bindings.
 */
export function sanitizeAiOutputText(raw: unknown, maxLen: number, fallback: string): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
  if (/[\u1100-\u11ff\u3040-\u30ff\u3130-\u318f\u3400-\u9fff\uac00-\ud7af\u0400-\u04ff]/.test(cleaned)) {
    return fallback;
  }
  return cleaned.length >= 2 ? cleaned : fallback;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function extractJsonObject(rawContent: string): Record<string, unknown> | null {
  const withoutThink = rawContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const trimmed = withoutThink.length > 0 ? withoutThink : rawContent.trim();
  const candidates: string[] = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced && fenced[1]) {
    candidates.unshift(fenced[1].trim());
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    candidates.push(trimmed.slice(firstBrace, lastBrace + 1));
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

export class NvidiaNimAiService {
  private readonly explicitApiKey?: string;
  private readonly primaryModel: string;
  private readonly fastModel: string;
  private readonly rpmBudget: number;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;
  private readonly requestTimestampsMs: number[] = [];
  private readonly responseCache = new Map<string, CacheEntry<unknown>>();
  private cooldownUntilMs = 0;

  constructor(options?: NvidiaNimServiceOptions) {
    this.explicitApiKey = options?.apiKey;
    const rawEnvModel = sanitizePromptText(process.env.NVIDIA_AI_MODEL ?? '', 80);
    const envModel = DEPRECATED_NVIDIA_MODELS.has(rawEnvModel) ? '' : rawEnvModel;
    this.primaryModel = options?.primaryModel || envModel || DEFAULT_NVIDIA_PRIMARY_MODEL;
    this.fastModel = options?.fastModel || DEFAULT_NVIDIA_FAST_MODEL;
    this.rpmBudget = Math.max(4, Math.min(38, options?.rpmBudget ?? DEFAULT_NVIDIA_RPM_BUDGET));
    this.timeoutMs = Math.max(1_000, Math.min(12_000, options?.timeoutMs ?? REQUEST_TIMEOUT_MS));
    this.fetchImpl = options?.fetchImpl ?? fetch;
  }

  private getApiKey(): string {
    const raw = this.explicitApiKey !== undefined ? this.explicitApiKey : process.env.NVIDIA_API_KEY ?? '';
    return raw.trim();
  }

  public isConfigured(): boolean {
    return this.getApiKey().length >= 8;
  }

  private pruneWindow(nowMs: number): void {
    const cutoff = nowMs - 60_000;
    while (this.requestTimestampsMs.length > 0 && this.requestTimestampsMs[0] < cutoff) {
      this.requestTimestampsMs.shift();
    }
  }

  private tryConsumeRpmSlot(nowMs: number, priority: 'user' | 'background' = 'user'): boolean {
    if (nowMs < this.cooldownUntilMs) return false;
    this.pruneWindow(nowMs);
    const remaining = this.rpmBudget - this.requestTimestampsMs.length;
    if (priority === 'background' && remaining <= BACKGROUND_RPM_RESERVE) {
      return false;
    }
    if (this.requestTimestampsMs.length >= this.rpmBudget) {
      return false;
    }
    this.requestTimestampsMs.push(nowMs);
    return true;
  }

  public getRemainingRpm(nowMs = Date.now()): number {
    this.pruneWindow(nowMs);
    if (!this.isConfigured() || nowMs < this.cooldownUntilMs) return 0;
    return Math.max(0, this.rpmBudget - this.requestTimestampsMs.length);
  }

  public getStatus(nowMs = Date.now()): NvidiaAiStatusSnapshot {
    this.pruneWindow(nowMs);
    const configured = this.isConfigured();
    const coolingDown = nowMs < this.cooldownUntilMs;
    const remainingRpm = Math.max(0, this.rpmBudget - this.requestTimestampsMs.length);
    return {
      configured,
      mode: configured && !coolingDown && remainingRpm > 0 ? 'nvidia_nim' : 'local_fallback',
      primaryModel: this.primaryModel,
      fastModel: this.fastModel,
      rpmBudget: this.rpmBudget,
      remainingRpm: configured ? remainingRpm : 0,
    };
  }

  private getCached<T>(key: string, nowMs: number): T | null {
    const entry = this.responseCache.get(key);
    if (!entry) return null;
    if (nowMs > entry.expiresAtMs) {
      this.responseCache.delete(key);
      return null;
    }
    return entry.value as T;
  }

  private setCached<T>(key: string, value: T, nowMs: number): void {
    if (this.responseCache.size >= MAX_CACHE_ENTRIES) {
      const oldestKey = this.responseCache.keys().next().value;
      if (oldestKey) this.responseCache.delete(oldestKey);
    }
    this.responseCache.set(key, { value, expiresAtMs: nowMs + CACHE_TTL_MS });
  }

  private async callChatJson(params: {
    systemPrompt: string;
    userPrompt: string;
    temperature: number;
    maxTokens: number;
    preferFast?: boolean;
    priority?: 'user' | 'background';
  }): Promise<{ json: Record<string, unknown>; model: string } | null> {
    const apiKey = this.getApiKey();
    if (apiKey.length < 8) return null;

    const nowMs = Date.now();
    if (!this.tryConsumeRpmSlot(nowMs, params.priority ?? 'user')) return null;

    const orderedCandidates = params.preferFast
      ? [this.fastModel, this.primaryModel, DEFAULT_NVIDIA_BACKUP_MODEL]
      : [this.primaryModel, this.fastModel, DEFAULT_NVIDIA_BACKUP_MODEL];
    const modelsToTry = Array.from(new Set(orderedCandidates.filter((m) => m.length > 0)));
    const safeMaxTokens = Math.max(params.maxTokens, 320);

    for (const model of modelsToTry) {
      const isNemotron = model.toLowerCase().includes('nemotron');
      const isGemma = model.toLowerCase().includes('gemma');

      const buildRequestBody = (strictMode: boolean): Record<string, unknown> => {
        const body: Record<string, unknown> = {
          model,
          messages: [
            { role: 'system', content: params.systemPrompt },
            { role: 'user', content: params.userPrompt },
          ],
          temperature: params.temperature,
          top_p: 0.85,
          max_tokens: safeMaxTokens,
        };
        if (strictMode && !isGemma) {
          body.response_format = { type: 'json_object' };
        }
        if (strictMode && isNemotron) {
          body.chat_template_kwargs = { enable_thinking: false };
        }
        return body;
      };

      for (const strictMode of [true, false]) {
        // Gemma does not need a second pass because strictMode already sends the standard body
        if (!strictMode && isGemma) break;

        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.timeoutMs);
        try {
          const res = await this.fetchImpl(NVIDIA_NIM_CHAT_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(buildRequestBody(strictMode)),
            signal: controller.signal,
          });

          if (res.status === 429) {
            // Back off smoothly so free-tier quota recovers without stalling gameplay
            this.cooldownUntilMs = Date.now() + 20_000;
            break;
          }
          if ((res.status === 400 || res.status === 422) && strictMode) {
            // Retry the same model once without optional structured/template flags
            continue;
          }
          if (!res.ok) {
            console.warn(`[NVIDIA NIM] model=${model} status=${res.status}`);
            break;
          }
          const data = (await res.json()) as {
            choices?: Array<{
              message?: { content?: string | null; reasoning_content?: string | null };
            }>;
          };
          const msg = data?.choices?.[0]?.message;
          const primaryText = typeof msg?.content === 'string' ? msg.content.trim() : '';
          const fallbackReasoning =
            typeof msg?.reasoning_content === 'string' ? msg.reasoning_content.trim() : '';
          const candidateText = primaryText.length > 0 ? primaryText : fallbackReasoning;

          if (candidateText.length === 0) {
            console.warn(`[NVIDIA NIM] model=${model} returned empty message content`);
            if (strictMode) continue;
            break;
          }
          const parsed = extractJsonObject(candidateText);
          if (parsed) {
            return { json: parsed, model };
          }
          console.warn(`[NVIDIA NIM] model=${model} returned non-JSON content`);
          break;
        } catch (err) {
          const errName = err instanceof Error ? err.name : 'Error';
          console.warn(`[NVIDIA NIM] model=${model} failed (${errName})`);
          break;
        } finally {
          clearTimeout(timer);
        }
      }
    }

    return null;
  }

  public async planTacticalDirective(
    rawInput: TacticalPlanRequestPayload
  ): Promise<AiTacticalDirective> {
    const nowMs = Date.now();
    const personaId = normalizeVirtualPlayerPersonaId(rawInput.personaId);
    const persona = VIRTUAL_PLAYER_PERSONAS[personaId];
    const sanitizedInput: TacticalPlanRequestPayload = {
      personaId,
      chapterId: Math.max(1, Math.min(12, Math.floor(Number(rawInput.chapterId) || 1))),
      stageNumber: Math.max(1, Math.min(100, Math.floor(Number(rawInput.stageNumber) || 1))),
      hpRatio: clamp(Number(rawInput.hpRatio) || 1, 0.05, 1),
      ultCharge: clamp(Number(rawInput.ultCharge) || 0, 0, 100),
      enemyCount: Math.max(0, Math.min(40, Math.floor(Number(rawInput.enemyCount) || 0))),
      hasBoss: Boolean(rawInput.hasBoss),
      bossName: sanitizePromptText(rawInput.bossName ?? '', 40) || undefined,
      bossHpRatio:
        rawInput.bossHpRatio !== undefined
          ? clamp(Number(rawInput.bossHpRatio) || 0, 0, 1)
          : undefined,
      bossPhase:
        rawInput.bossPhase !== undefined
          ? Math.max(1, Math.min(3, Math.floor(Number(rawInput.bossPhase) || 1)))
          : undefined,
      bossStaggerBroken: Boolean(rawInput.bossStaggerBroken),
      activeSynergies: Array.isArray(rawInput.activeSynergies)
        ? rawInput.activeSynergies.slice(0, 6).map((s) => sanitizePromptText(s, 32)).filter(Boolean)
        : [],
      eventReason:
        rawInput.eventReason === 'boss_phase' ||
        rawInput.eventReason === 'low_hp' ||
        rawInput.eventReason === 'persona_switch' ||
        rawInput.eventReason === 'periodic'
          ? rawInput.eventReason
          : 'stage_start',
    };

    const fallback = computeLocalFallbackTacticalDirective(sanitizedInput, nowMs);
    const cacheKey = `tactic:${personaId}:${sanitizedInput.chapterId}:${sanitizedInput.stageNumber}:${Math.round(sanitizedInput.hpRatio * 5)}:${sanitizedInput.hasBoss ? 1 : 0}:${sanitizedInput.bossPhase ?? 0}:${sanitizedInput.bossStaggerBroken ? 1 : 0}`;
    const cached = this.getCached<AiTacticalDirective>(cacheKey, nowMs);
    if (cached) {
      return { ...cached, expiresAtMs: nowMs + 18_000 };
    }

    const aiRes = await this.callChatJson({
      systemPrompt:
        'Bạn là bộ não chiến thuật của Người Chơi Ảo trong game hành động bắn cung roguelite 3D Aetherbow. ' +
        'Hãy trả về DUY NHẤT một JSON hợp lệ gồm các trường: ' +
        '{"tactic":"aggressive"|"balanced"|"evasive","targetPriority":"boss"|"caster"|"low_hp"|"traps"|"nearest","holdUltForBreak":boolean,"kitingRangeDelta":number(-1.5..2.0),"dashAggression":number(0.7..1.35),"thoughtVi":"câu suy nghĩ tự nhiên như game thủ Việt tối đa 14 từ"}.',
      userPrompt: JSON.stringify({
        persona: persona.label,
        style: persona.promptStyleVi,
        state: sanitizedInput,
      }),
      temperature: 0.25,
      maxTokens: 170,
      preferFast: sanitizedInput.eventReason === 'low_hp',
    });

    if (!aiRes) {
      return fallback;
    }

    const rawTactic = aiRes.json.tactic;
    const tactic: AiAutoPilotTactic =
      rawTactic === 'aggressive' || rawTactic === 'balanced' || rawTactic === 'evasive'
        ? rawTactic
        : fallback.tactic;

    const rawPriority = aiRes.json.targetPriority;
    const targetPriority: AiTacticalTargetPriority =
      rawPriority === 'boss' ||
      rawPriority === 'caster' ||
      rawPriority === 'low_hp' ||
      rawPriority === 'traps' ||
      rawPriority === 'nearest'
        ? rawPriority
        : fallback.targetPriority;

    const holdUltForBreak =
      typeof aiRes.json.holdUltForBreak === 'boolean'
        ? aiRes.json.holdUltForBreak
        : fallback.holdUltForBreak;

    const kitingRangeDelta = Number(
      clamp(
        typeof aiRes.json.kitingRangeDelta === 'number' && Number.isFinite(aiRes.json.kitingRangeDelta)
          ? aiRes.json.kitingRangeDelta
          : fallback.kitingRangeDelta,
        -1.6,
        2.2
      ).toFixed(2)
    );

    const dashAggression = Number(
      clamp(
        typeof aiRes.json.dashAggression === 'number' && Number.isFinite(aiRes.json.dashAggression)
          ? aiRes.json.dashAggression
          : fallback.dashAggression,
        0.65,
        1.35
      ).toFixed(2)
    );

    const directive: AiTacticalDirective = {
      tactic,
      targetPriority,
      holdUltForBreak,
      kitingRangeDelta,
      dashAggression,
      thoughtVi: sanitizeAiOutputText(aiRes.json.thoughtVi, 96, fallback.thoughtVi),
      personaId,
      source: 'nvidia_nim',
      model: aiRes.model,
      expiresAtMs: nowMs + 20_000,
    };

    this.setCached(cacheKey, directive, nowMs);
    return directive;
  }

  public async decideDraftChoice(rawInput: NvidiaDraftRequestPayload): Promise<AiDraftDecision> {
    const nowMs = Date.now();
    const personaId = normalizeVirtualPlayerPersonaId(rawInput.personaId);
    const persona = VIRTUAL_PLAYER_PERSONAS[personaId];

    const validChoices = (Array.isArray(rawInput.choices) ? rawInput.choices : [])
      .slice(0, 4)
      .map((c) => ({
        id: sanitizePromptText(c?.id, 48),
        name: sanitizePromptText(c?.name, 48),
        rarity: sanitizePromptText(c?.rarity ?? '', 20),
        summary: sanitizePromptText(c?.summary, 110),
        synergyHint: sanitizePromptText(c?.synergyHint ?? '', 48),
      }))
      .filter((c) => c.id.length > 0 && c.name.length > 0);

    if (validChoices.length === 0) {
      return {
        selectedId: '',
        reasonVi: 'Không có lựa chọn hợp lệ.',
        source: 'local_fallback',
        model: 'local-draft-heuristic-v1',
      };
    }

    const fallbackChoice =
      validChoices.find((c) => c.synergyHint.length > 0) ??
      validChoices.find((c) => c.rarity === 'legend' || c.rarity === 'epic') ??
      validChoices[0];

    const fallbackDecision: AiDraftDecision = {
      selectedId: fallbackChoice.id,
      reasonVi:
        fallbackChoice.synergyHint.length > 0
          ? `Ưu tiên ${fallbackChoice.name} để đẩy Cộng Hưởng (${fallbackChoice.synergyHint}).`
          : `Chọn ${fallbackChoice.name} hợp phong cách ${persona.shortLabel}.`,
      source: 'local_fallback',
      model: 'local-draft-heuristic-v1',
    };

    const cacheKey = `draft:${rawInput.kind}:${personaId}:${validChoices.map((c) => c.id).join(',')}:${Math.round(clamp(Number(rawInput.hpRatio) || 1, 0, 1) * 4)}`;
    const cached = this.getCached<AiDraftDecision>(cacheKey, nowMs);
    if (cached && validChoices.some((c) => c.id === cached.selectedId)) {
      return cached;
    }

    const aiRes = await this.callChatJson({
      systemPrompt:
        'Bạn là Người Chơi Ảo thông minh đang chơi Aetherbow. Hãy chọn ĐÚNG 1 lựa chọn tối ưu từ danh sách choices. ' +
        'Trả về DUY NHẤT JSON: {"selectedId":"id khớp chính xác 1 phần tử trong choices","reasonVi":"lý do ngắn gọn bằng tiếng Việt tối đa 16 từ"}.',
      userPrompt: JSON.stringify({
        kind: rawInput.kind === 'crossroads' ? 'crossroads' : 'skill',
        persona: persona.label,
        style: persona.promptStyleVi,
        chapterId: Math.max(1, Math.min(12, Math.floor(Number(rawInput.chapterId) || 1))),
        stageNumber: Math.max(1, Math.min(100, Math.floor(Number(rawInput.stageNumber) || 1))),
        hpRatio: Number(clamp(Number(rawInput.hpRatio) || 1, 0.05, 1).toFixed(2)),
        isBossStage: Boolean(rawInput.isBossStage),
        currentBuild: (Array.isArray(rawInput.currentSkillSummary) ? rawInput.currentSkillSummary : [])
          .slice(0, 8)
          .map((s) => sanitizePromptText(s, 36)),
        choices: validChoices,
      }),
      temperature: 0.2,
      maxTokens: 140,
      preferFast: false,
    });

    if (!aiRes) {
      return fallbackDecision;
    }

    const rawSelected = typeof aiRes.json.selectedId === 'string' ? aiRes.json.selectedId.trim() : '';
    const matched = validChoices.find((c) => c.id === rawSelected);
    if (!matched) {
      // Strictly reject hallucinated IDs outside the real offered choices
      return fallbackDecision;
    }

    const decision: AiDraftDecision = {
      selectedId: matched.id,
      reasonVi: sanitizeAiOutputText(
        aiRes.json.reasonVi,
        110,
        `Chọn ${matched.name} tối ưu cho đội hình hiện tại.`
      ),
      source: 'nvidia_nim',
      model: aiRes.model,
    };

    this.setCached(cacheKey, decision, nowMs);
    return decision;
  }

  public async generateVirtualPlayerChat(
    rawInput: NvidiaVirtualChatRequestPayload,
    fallbackText: string
  ): Promise<NvidiaVirtualChatResult> {
    const channel =
      rawInput.channel === 'guild' ||
      rawInput.channel === 'arena' ||
      rawInput.channel === 'coop'
        ? rawInput.channel
        : 'lobby';
    const aiName = sanitizePromptText(rawInput.aiName, 28) || 'Linh Vũ';
    const aiTitle = sanitizePromptText(rawInput.aiTitle ?? '', 36);
    const senderName = sanitizePromptText(rawInput.senderName, 24) || 'Chiến Binh';
    const userText = sanitizePromptText(rawInput.userText, 180);
    const contextSummary = sanitizePromptText(rawInput.contextSummary ?? '', 140);
    const personality =
      rawInput.aiPersonality === 'assassin' || rawInput.aiPersonality === 'aggressive'
        ? rawInput.aiPersonality
        : 'tactical';

    const personalityNote =
      personality === 'assassin'
        ? 'lạnh lùng, sắc sảo, tự tin, hay nhắc né hoàn hảo và phá giáp'
        : personality === 'aggressive'
        ? 'nhiệt huyết, máu chiến, thích rủ săn Boss và solo Arena'
        : 'điềm tĩnh, am hiểu chiến thuật build kỹ năng và cộng hưởng nguyên tố';

    const aiRes = await this.callChatJson({
      systemPrompt:
        `Bạn đang nhập vai người chơi ảo "${aiName}" (${aiTitle || 'Cao thủ Tinh Giới'}) trong game bắn cung roguelite 3D Aetherbow. ` +
        `Tính cách: ${personalityNote}. ` +
        'Hãy trả lời tự nhiên như một game thủ Việt thực thụ trong khung chat, thân thiện, ngắn gọn 1 câu tối đa 24 từ, không nhắc tới AI hay mô hình ngôn ngữ. ' +
        'Trả về DUY NHẤT JSON: {"replyVi":"câu chat tiếng Việt tự nhiên"}.',
      userPrompt: JSON.stringify({
        channel,
        playerName: senderName,
        playerMessage: userText,
        context: contextSummary,
      }),
      temperature: 0.65,
      maxTokens: 110,
      preferFast: true,
    });

    if (!aiRes) {
      return {
        replyVi: fallbackText,
        source: 'local_fallback',
        model: 'local-chat-persona-v1',
      };
    }

    return {
      replyVi: sanitizeAiOutputText(aiRes.json.replyVi, 160, fallbackText),
      source: 'nvidia_nim',
      model: aiRes.model,
    };
  }

  public async generateDirectMessageReply(
    rawInput: NvidiaDirectMessageRequestPayload
  ): Promise<NvidiaDirectMessageResult> {
    const aiName = sanitizePromptText(rawInput.aiName, 28) || 'Linh Vũ';
    const aiTitle = sanitizePromptText(rawInput.aiTitle ?? '', 40);
    const playerName = sanitizePromptText(rawInput.playerName, 24) || 'Xạ Thủ';
    const playerMessage = sanitizePromptText(rawInput.playerMessage, 200);
    const playerWeapon = sanitizePromptText(rawInput.playerWeaponName ?? '', 48);
    const power = Math.max(100, Math.min(9_999_999, Math.round(Number(rawInput.playerPowerRating) || 702)));
    const chapterId = Math.max(1, Math.min(12, Math.floor(Number(rawInput.playerChapterId) || 1)));
    const personality =
      rawInput.aiPersonality === 'assassin' || rawInput.aiPersonality === 'aggressive'
        ? rawInput.aiPersonality
        : 'tactical';

    const tierLabel =
      rawInput.relationshipTier === 'rival'
        ? 'Đối Thủ Truyền Kiếp'
        : rawInput.relationshipTier === 'ally'
        ? 'Bạn Đồng Hành Thân Thiết'
        : rawInput.relationshipTier === 'mentor'
        ? 'Tiền Bối Chỉ Dẫn'
        : rawInput.relationshipTier === 'acquaintance'
        ? 'Người Quen'
        : 'Mới Gặp';

    const fallbackReply =
      rawInput.relationshipTier === 'rival'
        ? `Nhớ trận trước lắm đấy ${playerName}, với ${power.toLocaleString('vi-VN')} LC hiện tại hẹn gặp lại ở Arena!`
        : personality === 'aggressive'
        ? `Cứ nâng mạnh Vũ Khí rồi vào Chương ${chapterId} đánh thẳng tay đi ${playerName}, cần Co-op cứ gọi mình!`
        : `Với ${power.toLocaleString('vi-VN')} LC ở Chương ${chapterId}, bạn ưu tiên gom bộ Cộng Hưởng và canh né vòng đỏ Boss là qua mượt.`;

    const recentMemories = (rawInput.recentMemories ?? [])
      .slice(0, 6)
      .map((m) => sanitizePromptText(m.summaryVi, 90))
      .filter(Boolean);
    const recentChat = (rawInput.recentDmMessages ?? [])
      .slice(-6)
      .map((m) => `${m.sender === 'player' ? playerName : aiName}: ${sanitizePromptText(m.text, 100)}`);

    const aiRes = await this.callChatJson({
      systemPrompt:
        `Bạn đang nhập vai người chơi ảo "${aiName}" (${aiTitle || 'Cao thủ Hoàng Đạo'}) nhắn tin riêng 1-1 với người chơi "${playerName}" trong game bắn cung roguelite 3D Aetherbow. ` +
        `Mối quan hệ hiện tại: ${tierLabel} (điểm thân thiết ${rawInput.affinityScore}). ` +
        'Hãy trả lời tự nhiên bằng tiếng Việt chuẩn có dấu như game thủ thật, tuyệt đối không lẫn ký tự Trung/Hàn/Nhật, nhắc tới ký ức/chỉ số thật khi phù hợp, tối đa 2 câu (dưới 36 từ), không nhắc tới AI hay mô hình ngôn ngữ. ' +
        'Trả về DUY NHẤT JSON: {"replyVi":"câu trả lời tự nhiên","affinityDelta":number(-3..5)}.',
      userPrompt: JSON.stringify({
        personality,
        favoriteSkills: (rawInput.aiFavoriteSkills ?? []).slice(0, 4),
        playerStats: { chapterId, powerRating: power, weapon: playerWeapon || 'Cung Khởi Đầu' },
        sharedMemories: recentMemories,
        recentConversation: recentChat,
        newMessage: playerMessage,
      }),
      temperature: 0.55,
      maxTokens: 240,
      preferFast: false,
      priority: 'user',
    });

    if (!aiRes) {
      return {
        replyVi: fallbackReply,
        affinityDelta: 2,
        source: 'local_fallback',
        model: 'local-dm-memory-v1',
      };
    }

    const rawDelta =
      typeof aiRes.json.affinityDelta === 'number' && Number.isFinite(aiRes.json.affinityDelta)
        ? Math.round(clamp(aiRes.json.affinityDelta, -3, 5))
        : 2;

    return {
      replyVi: sanitizeAiOutputText(aiRes.json.replyVi, 200, fallbackReply),
      affinityDelta: rawDelta,
      source: 'nvidia_nim',
      model: aiRes.model,
    };
  }

  public async generateBuildCoachAdvice(
    rawInput: NvidiaBuildCoachRequestPayload
  ): Promise<VirtualBuildCoachResult> {
    const aiName = sanitizePromptText(rawInput.aiName, 28) || 'Linh Vũ';
    const chapterId = Math.max(1, Math.min(12, Math.floor(Number(rawInput.chapterId) || 1)));
    const stageReached = Math.max(1, Math.min(60, Math.floor(Number(rawInput.stageReached) || 1)));
    const power = Math.max(100, Math.min(9_999_999, Math.round(Number(rawInput.playerPowerRating) || 702)));
    const recPower = Math.max(
      700,
      Math.min(9_999_999, Math.round(Number(rawInput.recommendedPower) || chapterId * 1350))
    );
    const weaponName = sanitizePromptText(rawInput.weaponName ?? '', 48) || 'Cung hiện tại';
    const armorName = sanitizePromptText(rawInput.armorName ?? '', 48) || 'Giáp hiện tại';
    const defeatCause = sanitizePromptText(rawInput.defeatCause ?? '', 100);
    const question = sanitizePromptText(rawInput.question ?? '', 140);
    const activeSkills = (rawInput.activeSkills ?? [])
      .slice(0, 8)
      .map((s) => sanitizePromptText(s, 32))
      .filter(Boolean);

    const powerGap = recPower - power;
    const fallback: VirtualBuildCoachResult = {
      aiPlayerId: rawInput.aiPlayerId,
      aiName,
      headlineVi:
        powerGap > 150
          ? `Chương ${chapterId} cần bổ sung thêm khoảng ${powerGap.toLocaleString('vi-VN')} LC để áp đảo Boss.`
          : `Lực chiến ${power.toLocaleString('vi-VN')} đã đủ sức chinh phục Chương ${chapterId}!`,
      tipsVi: [
        `Ưu tiên cường hóa ${weaponName} và ghép cộng hưởng Đa Tiễn + Bắn Nảy để dọn quái nhanh.`,
        defeatCause
          ? `Tránh lặp lại lỗi "${defeatCause}" bằng cách giữ Dash cho vòng báo đỏ lớn của Boss.`
          : `Giữ Tuyệt Kỹ tới lúc Boss vỡ giáp (Guard Break) để nhân tối đa sát thương dứt điểm.`,
        `Bật Đồng Đội AI chế độ Bảo Vệ khi máu dưới 45% để giữ nhịp hồi phục an toàn.`,
      ],
      recommendedActionVi:
        powerGap > 150
          ? `Cường hóa ${weaponName} & nâng Thiên Phú trước khi tái chiến.`
          : `Vào trận ưu tiên thẻ Cộng Hưởng và canh Né Hoàn Hảo phản đòn.`,
      source: 'local_fallback',
      model: 'local-build-coach-v1',
    };

    const cacheKey = `coach:${rawInput.aiPlayerId}:${chapterId}:${stageReached}:${Math.round(power / 100)}:${question.slice(0, 24)}:${defeatCause.slice(0, 24)}`;
    const nowMs = Date.now();
    const cached = this.getCached<VirtualBuildCoachResult>(cacheKey, nowMs);
    if (cached) return cached;

    const aiRes = await this.callChatJson({
      systemPrompt:
        `Bạn là cao thủ "${aiName}" trong game bắn cung roguelite 3D Aetherbow đang tư vấn build & cách qua ải cho người chơi. ` +
        'Phân tích sát chỉ số thật (Lực Chiến, Chương, Trang Bị, Kỹ Năng, nguyên nhân thua). Chỉ dùng chữ tiếng Việt chuẩn có dấu, tuyệt đối không lẫn ký tự Trung/Hàn/Nhật. ' +
        'Trả về DUY NHẤT JSON: {"headlineVi":"1 câu nhận định ngắn tối đa 18 từ","tipsVi":["mẹo 1 tối đa 20 từ","mẹo 2 tối đa 20 từ","mẹo 3 tối đa 20 từ"],"recommendedActionVi":"1 hành động nên làm ngay tối đa 16 từ"}.',
      userPrompt: JSON.stringify({
        chapterId,
        stageReached,
        playerPowerRating: power,
        recommendedPower: recPower,
        weaponName,
        armorName,
        activeSkills,
        defeatCause,
        question,
      }),
      temperature: 0.3,
      maxTokens: 340,
      preferFast: false,
      priority: 'user',
    });

    if (!aiRes) return fallback;

    const rawTips = Array.isArray(aiRes.json.tipsVi) ? aiRes.json.tipsVi : [];
    const tipsVi = rawTips
      .slice(0, 3)
      .map((t, idx) => sanitizeAiOutputText(t, 130, fallback.tipsVi[idx] ?? ''))
      .filter((t) => t.length > 0);

    const result: VirtualBuildCoachResult = {
      aiPlayerId: rawInput.aiPlayerId,
      aiName,
      headlineVi: sanitizeAiOutputText(aiRes.json.headlineVi, 130, fallback.headlineVi),
      tipsVi: tipsVi.length >= 2 ? tipsVi : fallback.tipsVi,
      recommendedActionVi: sanitizeAiOutputText(
        aiRes.json.recommendedActionVi,
        120,
        fallback.recommendedActionVi
      ),
      source: 'nvidia_nim',
      model: aiRes.model,
    };

    this.setCached(cacheKey, result, nowMs);
    return result;
  }

  public async generatePostMatchCommentary(
    rawInput: NvidiaPostMatchRequestPayload
  ): Promise<VirtualPostMatchCommentaryResult> {
    const aiName = sanitizePromptText(rawInput.aiName, 28) || 'Linh Vũ';
    const aiTitle = sanitizePromptText(rawInput.aiTitle ?? '', 40) || 'Cao Thủ Tinh Giới';
    const chapterId = Math.max(1, Math.min(12, Math.floor(Number(rawInput.chapterId) || 1)));
    const stageReached = Math.max(1, Math.min(60, Math.floor(Number(rawInput.stageReached) || 1)));
    const kills = Math.max(0, Math.min(5000, Math.floor(Number(rawInput.kills) || 0)));
    const maxCombo = Math.max(0, Math.min(999, Math.floor(Number(rawInput.maxCombo) || 0)));
    const defeatCause = sanitizePromptText(rawInput.defeatCause ?? '', 90);

    const defaultDelta =
      rawInput.mode === 'arena'
        ? rawInput.isVictory
          ? -4
          : 3
        : rawInput.mode === 'coop'
        ? rawInput.isVictory
          ? 6
          : 2
        : rawInput.isVictory
        ? 3
        : 1;

    const fallbackComment =
      rawInput.mode === 'arena'
        ? rawInput.isVictory
          ? `Pha xử lý combo ×${maxCombo} của bạn gắt thật! Để mình chỉnh lại build rồi hẹn tái đấu!`
          : `Trận Arena này mình nhỉnh hơn chút thôi, nâng thêm Vũ Khí rồi vào tái đấu nhé!`
        : rawInput.mode === 'coop'
        ? rawInput.isVictory
          ? `Phối hợp tổ đội quá ăn ý, dọn sạch ${kills} mục tiêu gọn gàng!`
          : `Boss Co-op pha cuối rát quá, lượt sau mình giữ khiên sát bạn hơn nhé!`
        : rawInput.isVictory
        ? `Chúc mừng vượt Chương ${chapterId} cực mượt với chuỗi combo ×${maxCombo}!`
        : `Dừng ở phòng ${stageReached} Chương ${chapterId} cũng rất sát rồi, chỉnh nhẹ kỹ năng là qua ngay!`;

    const aiRes = await this.callChatJson({
      systemPrompt:
        `Bạn là nhân vật ảo "${aiName}" (${aiTitle}) trong Aetherbow vừa chứng kiến/tham gia trận đấu cùng người chơi. ` +
        'Viết đúng 1 câu bình luận tiếng Việt tự nhiên như game thủ thật (tối đa 24 từ), khớp kết quả thắng/thua và mối quan hệ. ' +
        'Trả về DUY NHẤT JSON: {"commentVi":"câu bình luận tự nhiên"}.',
      userPrompt: JSON.stringify({
        mode: rawInput.mode,
        isVictory: rawInput.isVictory,
        chapterId,
        stageReached,
        kills,
        maxCombo,
        relationshipTier: rawInput.relationshipTier,
        recentMemories: (rawInput.recentMemories ?? []).slice(0, 3).map((m) => m.summaryVi),
        defeatCause,
      }),
      temperature: 0.6,
      maxTokens: 160,
      preferFast: true,
      priority: 'user',
    });

    return {
      aiPlayerId: rawInput.aiPlayerId,
      aiName,
      aiTitle,
      relationshipTier: rawInput.relationshipTier,
      affinityScore: rawInput.affinityScore,
      affinityDelta: defaultDelta,
      commentVi: aiRes
        ? sanitizeAiOutputText(aiRes.json.commentVi, 170, fallbackComment)
        : fallbackComment,
      source: aiRes ? 'nvidia_nim' : 'local_fallback',
      model: aiRes ? aiRes.model : 'local-postmatch-v1',
    };
  }

  public async generateCompanionCallout(
    rawInput: NvidiaCompanionCalloutRequestPayload
  ): Promise<VirtualCompanionCalloutResult> {
    const allyName = sanitizePromptText(rawInput.allyName, 28) || 'Đồng Đội AI';
    const allyRole = sanitizePromptText(rawInput.allyRole, 28) || 'Chiến Binh';
    const bossName = sanitizePromptText(rawInput.bossName ?? '', 40);
    const command: VirtualCompanionCommandId =
      rawInput.command === 'protect_player' || rawInput.command === 'sync_burst'
        ? rawInput.command
        : 'focus_boss';

    const fallbackByCmd: Record<VirtualCompanionCommandId, string> = {
      focus_boss: bossName
        ? `Rõ! Tập trung toàn bộ hỏa lực vào ${bossName}!`
        : 'Rõ! Dồn toàn bộ hỏa lực vào mục tiêu chính!',
      protect_player: 'Đang áp sát che chắn và dọn quái quanh bạn!',
      sync_burst: 'Đếm 3-2-1, đồng loạt xả Tuyệt Kỹ liên kích!',
    };

    const fallbackText =
      rawInput.trigger === 'low_hp'
        ? 'Máu bạn thấp rồi, lùi lại để mình chắn đòn!'
        : rawInput.trigger === 'boss_break'
        ? 'Boss vỡ giáp rồi! Dồn sát thương ngay!'
        : fallbackByCmd[command];

    const cacheKey = `callout:${allyName}:${command}:${rawInput.trigger}:${bossName}`;
    const nowMs = Date.now();
    const cached = this.getCached<VirtualCompanionCalloutResult>(cacheKey, nowMs);
    if (cached) return cached;

    const aiRes = await this.callChatJson({
      systemPrompt:
        `Bạn là đồng đội AI "${allyName}" (vai trò ${allyRole}) đang chiến đấu cùng người chơi trong Aetherbow. ` +
        'Hô 1 câu callout chiến thuật tiếng Việt cực ngắn gọn (tối đa 12 từ), khí thế như đồng đội thật. ' +
        'Trả về DUY NHẤT JSON: {"calloutVi":"câu hô ngắn"}.',
      userPrompt: JSON.stringify({
        command,
        trigger: rawInput.trigger,
        chapterId: rawInput.chapterId,
        hpPct: Math.round(clamp(Number(rawInput.hpRatio) || 1, 0, 1) * 100),
        bossName,
      }),
      temperature: 0.55,
      maxTokens: 120,
      preferFast: true,
      priority: rawInput.trigger === 'player_command' ? 'user' : 'background',
    });

    const result: VirtualCompanionCalloutResult = {
      allyName,
      command,
      calloutVi: aiRes
        ? sanitizeAiOutputText(aiRes.json.calloutVi, 96, fallbackText)
        : fallbackText,
      source: aiRes ? 'nvidia_nim' : 'local_fallback',
      model: aiRes ? aiRes.model : 'local-callout-v1',
    };

    this.setCached(cacheKey, result, nowMs);
    return result;
  }

  public async generateAutonomousBanter(
    rawInput: NvidiaAutonomousBanterRequestPayload
  ): Promise<NvidiaAutonomousBanterResult> {
    const summary = sanitizePromptText(rawInput.eventSummary, 160);
    const nameA = sanitizePromptText(rawInput.speakerA.name, 28) || 'Linh Vũ';
    const nameB = sanitizePromptText(rawInput.speakerB.name, 28) || 'Lôi Đế';

    const fallback: NvidiaAutonomousBanterResult = {
      lineA: `Vừa thấy tin mới ở sảnh: ${summary.slice(0, 70)} — căng thật sự!`,
      lineB: `Đỉnh đấy, ai rảnh lập tổ đội Co-op săn mảnh Thần Thoại chung không?`,
      source: 'local_fallback',
      model: 'local-banter-v1',
    };

    const aiRes = await this.callChatJson({
      systemPrompt:
        'Bạn viết 2 câu trò chuyện cực tự nhiên bằng tiếng Việt giữa 2 game thủ trong sảnh game Aetherbow phản ứng với một sự kiện vừa xảy ra trên server. ' +
        'Mỗi câu tối đa 18 từ, thân thiện, có chất game thủ, không nhắc tới AI. ' +
        'Trả về DUY NHẤT JSON: {"lineA":"câu của người 1","lineB":"câu đáp lại của người 2"}.',
      userPrompt: JSON.stringify({
        channel: rawInput.channel,
        eventSummary: summary,
        speakerA: { name: nameA, personality: rawInput.speakerA.personality },
        speakerB: { name: nameB, personality: rawInput.speakerB.personality },
      }),
      temperature: 0.7,
      maxTokens: 200,
      preferFast: true,
      priority: 'background',
    });

    if (!aiRes) return fallback;

    return {
      lineA: sanitizeAiOutputText(aiRes.json.lineA, 150, fallback.lineA),
      lineB: sanitizeAiOutputText(aiRes.json.lineB, 150, fallback.lineB),
      source: 'nvidia_nim',
      model: aiRes.model,
    };
  }
}

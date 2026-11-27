import express from 'express';
import fs from 'fs';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocket, WebSocketServer } from 'ws';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import {
  WeeklyBossService,
  WeeklyBossServiceError,
} from './src/server/weeklyBossService.ts';
import { LiveAiPlayersService } from './src/server/liveAiPlayersService.ts';
import { NvidiaNimAiService } from './src/server/nvidiaNimAiService.ts';
import type { WeeklyBossLeaderboardEntry } from './src/data/weeklyBossData.ts';
import {
  applySecurityHeadersMiddleware,
  clampWsBountyPoints,
  clampWsDuelDurationSec,
  clampWsGuildBossDamage,
  clampWsGuildWarScore,
  createApiRateLimitMiddleware,
  isVerifiedAdminClaims,
  RunNonceReplayGuard,
  SecurityAnomalyTracker,
  SlidingWindowRateLimiter,
  WS_SECURITY_LIMITS,
} from './src/server/serverSecurity.ts';
import {
  verifyCombatRunIntegrity,
  type RunIntegrityReportInput,
} from './src/data/runIntegrityVerifier.ts';
import {
  DEFAULT_LIVEOPS_CONFIG,
  sanitizeLiveOpsConfig,
  type LiveOpsConfig,
} from './src/data/liveOpsConfig.ts';
import { verifyWorkerAdminSession } from './src/server/assetDeployService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const securityAnomalies = new SecurityAnomalyTracker(200);
const runNonceReplayGuard = new RunNonceReplayGuard({ maxEntries: 2000, ttlMs: 6 * 3_600_000 });
const recordApiRateLimit = (info: { scope: string; ip: string; retryAfterMs: number }) => {
  securityAnomalies.record({
    category: 'rate_limit',
    scope: `api:${info.scope}`,
    actor: info.ip,
    detail: `HTTP 429 rate limit exceeded (retryAfter=${Math.ceil(info.retryAfterMs / 1000)}s)`,
  });
};

interface FirebaseAppletConfig {
  projectId?: string;
}

function loadFirebaseProjectId(): string | null {
  try {
    const cfgPath = path.resolve(__dirname, 'firebase-applet-config.json');
    if (!fs.existsSync(cfgPath)) return null;
    const raw = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as FirebaseAppletConfig;
    if (!raw.projectId || raw.projectId === 'remixed-project-id') return null;
    return raw.projectId;
  } catch {
    return null;
  }
}

const projectId = loadFirebaseProjectId();
if (projectId) {
  // Verifying Firebase ID tokens with verifyIdToken(token) requires no IAM and works on any project.
  if (getApps().length === 0) {
    initializeApp({ projectId });
  }
}

interface VerifiedRequestUser {
  uid: string;
  displayName: string;
  email?: string;
  emailVerified?: boolean;
}

function sanitizeServerDisplayName(raw: unknown, fallbackEmail?: string): string {
  if (typeof raw === 'string') {
    const trimmed = raw.trim().replace(/\s+/g, ' ');
    if (trimmed.length >= 2) return trimmed.slice(0, 24);
  }
  if (fallbackEmail && fallbackEmail.includes('@')) {
    return fallbackEmail.split('@')[0].slice(0, 24);
  }
  return 'Chiến Binh Tinh Giới';
}

async function resolveBearerUser(
  req: express.Request,
  bodyDisplayName?: unknown
): Promise<VerifiedRequestUser | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) return null;

  if (!projectId || getApps().length === 0) {
    throw new WeeklyBossServiceError(
      503,
      'FIREBASE_PROJECT_UNCONFIGURED',
      'Hệ thống xác thực Firebase chưa sẵn sàng trên máy chủ.'
    );
  }

  try {
    const decoded = await getAuth(getApp()).verifyIdToken(token);
    const displayName = sanitizeServerDisplayName(
      bodyDisplayName ?? decoded.name,
      decoded.email
    );
    return {
      uid: decoded.uid,
      displayName,
      email: typeof decoded.email === 'string' ? decoded.email : undefined,
      emailVerified: decoded.email_verified === true,
    };
  } catch {
    throw new WeeklyBossServiceError(
      401,
      'INVALID_AUTH_TOKEN',
      'Phiên đăng nhập Firebase không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.'
    );
  }
}

export function createWeeklyBossRouter(service: WeeklyBossService): express.Router {
  const router = express.Router();

  router.get('/state', async (req, res) => {
    try {
      let user: VerifiedRequestUser | null = null;
      if (req.headers.authorization?.startsWith('Bearer ')) {
        try {
          user = await resolveBearerUser(req);
        } catch {
          user = null;
        }
      }
      const state = service.getState(user);
      res.json(state);
    } catch (err) {
      handleApiError(res, err);
    }
  });

  router.post('/start', async (req, res) => {
    try {
      const user = await resolveBearerUser(req, req.body?.displayName);
      if (!user) {
        throw new WeeklyBossServiceError(
          401,
          'AUTH_REQUIRED',
          'Bạn cần đăng nhập tài khoản đám mây để tham gia Boss Tuần Tính Hạng.'
        );
      }
      const result = service.startAttempt(user);
      res.json(result);
    } catch (err) {
      handleApiError(res, err);
    }
  });

  router.post('/submit', async (req, res) => {
    try {
      const user = await resolveBearerUser(req, req.body?.displayName);
      if (!user) {
        throw new WeeklyBossServiceError(
          401,
          'AUTH_REQUIRED',
          'Bạn cần đăng nhập tài khoản đám mây để gửi kết quả xếp hạng tuần.'
        );
      }
      const result = service.submitAttempt(user, {
        attemptId: String(req.body?.attemptId ?? ''),
        seed: String(req.body?.seed ?? ''),
        cleared: Boolean(req.body?.cleared),
        damageDealt: Number(req.body?.damageDealt ?? 0),
        simTicks: Number(req.body?.simTicks ?? 0),
        clearTimeMs: Number(req.body?.clearTimeMs ?? 0),
        remainingHpPct: Number(req.body?.remainingHpPct ?? 0),
        perfectDodges: Number(req.body?.perfectDodges ?? 0),
        autoPilotUsed: Boolean(req.body?.autoPilotUsed ?? false),
        splitsMs: Array.isArray(req.body?.splitsMs) ? req.body.splitsMs : undefined,
        counterHitsLanded: Number(req.body?.counterHitsLanded ?? 0),
        guardBreaksLanded: Number(req.body?.guardBreaksLanded ?? 0),
        peakStyleGrade: typeof req.body?.peakStyleGrade === 'string' ? (req.body.peakStyleGrade as any) : undefined,
      });
      res.json(result);
    } catch (err) {
      handleApiError(res, err);
    }
  });

  router.post('/claim', async (req, res) => {
    try {
      const user = await resolveBearerUser(req);
      if (!user) {
        throw new WeeklyBossServiceError(
          401,
          'AUTH_REQUIRED',
          'Bạn cần đăng nhập tài khoản đám mây để nhận thưởng xếp hạng tuần.'
        );
      }
      const tierId = String(req.body?.tierId ?? '').trim();
      const idempotencyKey =
        typeof req.body?.idempotencyKey === 'string' && req.body.idempotencyKey.trim()
          ? req.body.idempotencyKey.trim().slice(0, 80)
          : undefined;
      const result = service.claimReward(user, tierId, idempotencyKey);
      res.json(result);
    } catch (err) {
      handleApiError(res, err);
    }
  });

  router.get('/season', async (req, res) => {
    try {
      const user = await resolveBearerUser(req);
      res.json(service.getSeasonState(user));
    } catch (err) {
      handleApiError(res, err);
    }
  });

  router.post('/season/claim', async (req, res) => {
    try {
      const user = await resolveBearerUser(req);
      if (!user) {
        throw new WeeklyBossServiceError(
          401,
          'AUTH_REQUIRED',
          'Bạn cần đăng nhập tài khoản đám mây để nhận thưởng Mùa Giải.'
        );
      }
      const tierId = String(req.body?.tierId ?? '').trim();
      const idempotencyKey =
        typeof req.body?.idempotencyKey === 'string' && req.body.idempotencyKey.trim()
          ? req.body.idempotencyKey.trim().slice(0, 80)
          : undefined;
      const result = service.claimSeasonReward(user, tierId, idempotencyKey);
      res.json(result);
    } catch (err) {
      handleApiError(res, err);
    }
  });

  // Wave 5 — Pillar 4: Weekend Blitz Competitive Event endpoints
  router.get('/weekend/state', async (req, res) => {
    try {
      let user: VerifiedRequestUser | null = null;
      if (req.headers.authorization?.startsWith('Bearer ')) {
        try {
          user = await resolveBearerUser(req);
        } catch {
          user = null;
        }
      }
      res.json(service.getWeekendBlitzState(user));
    } catch (err) {
      handleApiError(res, err);
    }
  });

  router.post('/weekend/start', async (req, res) => {
    try {
      const user = await resolveBearerUser(req, req.body?.displayName);
      if (!user) {
        throw new WeeklyBossServiceError(
          401,
          'AUTH_REQUIRED',
          'Bạn cần đăng nhập tài khoản đám mây để tham gia Sự Kiện Boss Cuối Tuần.'
        );
      }
      res.json(service.startWeekendBlitzAttempt(user));
    } catch (err) {
      handleApiError(res, err);
    }
  });

  router.post('/weekend/submit', async (req, res) => {
    try {
      const user = await resolveBearerUser(req, req.body?.displayName);
      if (!user) {
        throw new WeeklyBossServiceError(
          401,
          'AUTH_REQUIRED',
          'Bạn cần đăng nhập tài khoản đám mây để gửi kết quả Boss Cuối Tuần.'
        );
      }
      const result = service.submitWeekendBlitzAttempt(user, {
        attemptId: String(req.body?.attemptId ?? ''),
        seed: String(req.body?.seed ?? ''),
        cleared: Boolean(req.body?.cleared),
        damageDealt: Number(req.body?.damageDealt ?? 0),
        simTicks: Number(req.body?.simTicks ?? 0),
        clearTimeMs: Number(req.body?.clearTimeMs ?? 0),
        remainingHpPct: Number(req.body?.remainingHpPct ?? 0),
        perfectDodges: Number(req.body?.perfectDodges ?? 0),
        autoPilotUsed: Boolean(req.body?.autoPilotUsed ?? false),
        splitsMs: Array.isArray(req.body?.splitsMs) ? req.body.splitsMs : undefined,
        counterHitsLanded: Number(req.body?.counterHitsLanded ?? 0),
        guardBreaksLanded: Number(req.body?.guardBreaksLanded ?? 0),
        peakStyleGrade: typeof req.body?.peakStyleGrade === 'string' ? (req.body.peakStyleGrade as any) : undefined,
      });
      res.json(result);
    } catch (err) {
      handleApiError(res, err);
    }
  });

  router.post('/weekend/claim', async (req, res) => {
    try {
      const user = await resolveBearerUser(req);
      if (!user) {
        throw new WeeklyBossServiceError(
          401,
          'AUTH_REQUIRED',
          'Bạn cần đăng nhập tài khoản đám mây để nhận thưởng Boss Cuối Tuần.'
        );
      }
      const tierId = String(req.body?.tierId ?? '').trim();
      const idempotencyKey =
        typeof req.body?.idempotencyKey === 'string' && req.body.idempotencyKey.trim()
          ? req.body.idempotencyKey.trim().slice(0, 80)
          : undefined;
      res.json(service.claimWeekendBlitzReward(user, tierId, idempotencyKey));
    } catch (err) {
      handleApiError(res, err);
    }
  });

  return router;
}

export interface LiveAiWsHubHandle {
  wss: WebSocketServer;
  broadcastWeeklyBossUpdate: (payload: {
    weekId: string;
    displayName: string;
    rank: number;
    verifiedScore: number;
    cleared: boolean;
    leaderboard: WeeklyBossLeaderboardEntry[];
  }) => void;
  close: () => void;
}

/**
 * Attaches the real server-authoritative WebSocket hub at `/ws/live-ai`
 * on the same HTTP server (port 3000) to broadcast real-time AI player presence,
 * live activities, 1v1 duel matchmaking, and verified Weekly Boss rank shifts.
 */
export function createNvidiaAiRouter(
  nvidiaAiService: NvidiaNimAiService,
  liveAiService?: LiveAiPlayersService
): express.Router {
  const router = express.Router();

  router.get('/status', (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json(nvidiaAiService.getStatus());
  });

  router.post('/tactical-plan', async (req, res) => {
    try {
      const body =
        req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
      if (!body) {
        res.status(400).json({ error: 'INVALID_BODY' });
        return;
      }
      const directive = await nvidiaAiService.planTacticalDirective({
        personaId: body.personaId as any,
        chapterId: Number(body.chapterId ?? 1),
        stageNumber: Number(body.stageNumber ?? 1),
        hpRatio: Number(body.hpRatio ?? 1),
        ultCharge: Number(body.ultCharge ?? 0),
        enemyCount: Number(body.enemyCount ?? 0),
        hasBoss: Boolean(body.hasBoss),
        bossName: typeof body.bossName === 'string' ? body.bossName : undefined,
        bossHpRatio:
          body.bossHpRatio !== undefined ? Number(body.bossHpRatio) : undefined,
        bossPhase: body.bossPhase !== undefined ? Number(body.bossPhase) : undefined,
        bossStaggerBroken: Boolean(body.bossStaggerBroken),
        activeSynergies: Array.isArray(body.activeSynergies)
          ? body.activeSynergies.map((s) => String(s))
          : [],
        eventReason: body.eventReason as any,
      });
      res.setHeader('Cache-Control', 'no-store');
      res.json(directive);
    } catch {
      res.status(500).json({ error: 'AI_TACTICAL_PLAN_FAILED' });
    }
  });

  router.post('/draft-decision', async (req, res) => {
    try {
      const body =
        req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
      if (!body || !Array.isArray(body.choices) || body.choices.length === 0) {
        res.status(400).json({ error: 'INVALID_CHOICES' });
        return;
      }
      const decision = await nvidiaAiService.decideDraftChoice({
        kind: body.kind === 'crossroads' ? 'crossroads' : 'skill',
        personaId: body.personaId as any,
        tactic:
          body.tactic === 'aggressive' || body.tactic === 'evasive' ? body.tactic : 'balanced',
        chapterId: Number(body.chapterId ?? 1),
        stageNumber: Number(body.stageNumber ?? 1),
        hpRatio: Number(body.hpRatio ?? 1),
        isBossStage: Boolean(body.isBossStage),
        currentSkillSummary: Array.isArray(body.currentSkillSummary)
          ? body.currentSkillSummary.map((s) => String(s))
          : [],
        choices: body.choices.slice(0, 4).map((c: any) => ({
          id: String(c?.id ?? ''),
          name: String(c?.name ?? ''),
          rarity: typeof c?.rarity === 'string' ? c.rarity : '',
          summary: String(c?.summary ?? ''),
          synergyHint: typeof c?.synergyHint === 'string' ? c.synergyHint : '',
        })),
      });
      res.setHeader('Cache-Control', 'no-store');
      res.json(decision);
    } catch {
      res.status(500).json({ error: 'AI_DRAFT_DECISION_FAILED' });
    }
  });

  router.post('/virtual-chat', async (req, res) => {
    try {
      const body =
        req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
      if (!body) {
        res.status(400).json({ error: 'INVALID_BODY' });
        return;
      }
      const fallback =
        typeof body.fallbackText === 'string' && body.fallbackText.trim().length > 0
          ? body.fallbackText.trim().slice(0, 160)
          : 'Cùng vào trận thử đội hình mới thôi!';
      const result = await nvidiaAiService.generateVirtualPlayerChat(
        {
          channel: body.channel as any,
          aiName: String(body.aiName ?? 'Linh Vũ'),
          aiPersonality: body.aiPersonality as any,
          aiTitle: typeof body.aiTitle === 'string' ? body.aiTitle : undefined,
          senderName: String(body.senderName ?? 'Chiến Binh'),
          userText: String(body.userText ?? ''),
          contextSummary:
            typeof body.contextSummary === 'string' ? body.contextSummary : undefined,
        },
        fallback
      );
      res.setHeader('Cache-Control', 'no-store');
      res.json(result);
    } catch {
      res.status(500).json({ error: 'AI_VIRTUAL_CHAT_FAILED' });
    }
  });

  // Phase 2: Persistent Relationship Memory & 1-on-1 DM
  router.get('/memory/:aiPlayerId', (req, res) => {
    const aiPlayerId = String(req.params.aiPlayerId ?? '').trim().slice(0, 48);
    const playerName = sanitizeServerDisplayName(req.query.playerName ?? 'Xạ Thủ');
    if (!aiPlayerId) {
      res.status(400).json({ error: 'INVALID_AI_PLAYER_ID' });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    if (liveAiService) {
      res.json(liveAiService.getRelationshipMemory(playerName, aiPlayerId));
      return;
    }
    res.json({
      aiPlayerId,
      aiName: 'Linh Vũ',
      affinityScore: 0,
      tier: 'stranger',
      memories: [],
      dmMessages: [],
      updatedAtMs: Date.now(),
    });
  });

  router.post('/dm', async (req, res) => {
    try {
      const body =
        req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
      if (!body || typeof body.message !== 'string' || body.message.trim().length === 0) {
        res.status(400).json({ error: 'INVALID_MESSAGE' });
        return;
      }
      const aiPlayerId = String(body.aiPlayerId ?? '').trim().slice(0, 48);
      const playerName = sanitizeServerDisplayName(body.playerName ?? 'Xạ Thủ');
      const cleanMessage = body.message.replace(/\s+/g, ' ').trim().slice(0, 200);
      const aiProfile = liveAiService?.findPlayerByNameOrId(aiPlayerId) ?? null;

      let currentMemory = liveAiService
        ? liveAiService.getRelationshipMemory(playerName, aiProfile?.id ?? aiPlayerId)
        : {
            aiPlayerId: aiPlayerId || 'ai_01',
            aiName: String(body.aiName ?? 'Linh Vũ').slice(0, 28),
            affinityScore: 0,
            tier: 'stranger' as const,
            memories: [],
            dmMessages: [],
            updatedAtMs: Date.now(),
          };

      const playerMsgRes = liveAiService
        ? liveAiService.appendDirectMessage({
            playerName,
            aiPlayerId: currentMemory.aiPlayerId,
            sender: 'player',
            text: cleanMessage,
          })
        : {
            memory: currentMemory,
            message: {
              id: `dm_p_${Date.now()}`,
              sender: 'player' as const,
              text: cleanMessage,
              timestampMs: Date.now(),
            },
          };
      currentMemory = playerMsgRes.memory;

      const reply = await nvidiaAiService.generateDirectMessageReply({
        aiPlayerId: currentMemory.aiPlayerId,
        aiName: aiProfile?.displayName ?? String(body.aiName ?? currentMemory.aiName),
        aiPersonality: (aiProfile?.personality ?? body.aiPersonality ?? 'tactical') as any,
        aiTitle: aiProfile?.titleBadge ?? (typeof body.aiTitle === 'string' ? body.aiTitle : undefined),
        aiFavoriteSkills: aiProfile?.buildSnapshot?.favoriteSkills ?? [],
        playerName,
        playerMessage: cleanMessage,
        playerPowerRating: Number(body.playerPowerRating ?? 702),
        playerChapterId: Number(body.playerChapterId ?? 1),
        playerWeaponName:
          typeof body.playerWeaponName === 'string' ? body.playerWeaponName : undefined,
        relationshipTier: currentMemory.tier,
        affinityScore: currentMemory.affinityScore,
        recentMemories: currentMemory.memories,
        recentDmMessages: currentMemory.dmMessages,
      });

      const aiMsgRes = liveAiService
        ? liveAiService.appendDirectMessage({
            playerName,
            aiPlayerId: currentMemory.aiPlayerId,
            sender: 'ai',
            text: reply.replyVi,
            source: reply.source,
            affinityDelta: reply.affinityDelta,
          })
        : {
            memory: {
              ...currentMemory,
              affinityScore: currentMemory.affinityScore + reply.affinityDelta,
              dmMessages: [
                ...currentMemory.dmMessages,
                playerMsgRes.message,
                {
                  id: `dm_a_${Date.now()}`,
                  sender: 'ai' as const,
                  text: reply.replyVi,
                  timestampMs: Date.now(),
                  source: reply.source,
                },
              ].slice(-12),
            },
            message: {
              id: `dm_a_${Date.now()}`,
              sender: 'ai' as const,
              text: reply.replyVi,
              timestampMs: Date.now(),
              source: reply.source,
            },
          };

      if (liveAiService && currentMemory.memories.length === 0) {
        liveAiService.recordRelationshipInteraction({
          playerName,
          aiPlayerId: currentMemory.aiPlayerId,
          kind: 'dm_chat',
          summaryVi: `Bắt đầu trò chuyện riêng cùng ${playerName}`,
          affinityDelta: 1,
        });
      }

      res.setHeader('Cache-Control', 'no-store');
      res.json({
        playerMessage: playerMsgRes.message,
        aiMessage: aiMsgRes.message,
        affinityDelta: reply.affinityDelta,
        source: reply.source,
        model: reply.model,
        memory: liveAiService
          ? liveAiService.getRelationshipMemory(playerName, currentMemory.aiPlayerId)
          : aiMsgRes.memory,
      });
    } catch {
      res.status(500).json({ error: 'AI_DM_FAILED' });
    }
  });

  // Phase 2: Build & Stage Clear Coach
  router.post('/build-coach', async (req, res) => {
    try {
      const body =
        req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
      if (!body) {
        res.status(400).json({ error: 'INVALID_BODY' });
        return;
      }
      const chapterId = Math.max(1, Math.min(12, Math.floor(Number(body.chapterId ?? 1))));
      const playerName = sanitizeServerDisplayName(body.playerName ?? 'Xạ Thủ');
      const requestedAi = liveAiService?.findPlayerByNameOrId(
        typeof body.aiPlayerId === 'string' ? body.aiPlayerId : undefined
      );
      const mentor = requestedAi ?? liveAiService?.pickContextualMentor(chapterId) ?? null;

      const advice = await nvidiaAiService.generateBuildCoachAdvice({
        aiPlayerId: mentor?.id ?? String(body.aiPlayerId ?? 'ai_mentor'),
        aiName: mentor?.displayName ?? String(body.aiName ?? 'Linh Vũ'),
        aiPersonality: (mentor?.personality ?? body.aiPersonality ?? 'tactical') as any,
        playerName,
        playerPowerRating: Number(body.playerPowerRating ?? 702),
        recommendedPower:
          body.recommendedPower !== undefined ? Number(body.recommendedPower) : undefined,
        chapterId,
        stageReached: Number(body.stageReached ?? 1),
        weaponName: typeof body.weaponName === 'string' ? body.weaponName : undefined,
        armorName: typeof body.armorName === 'string' ? body.armorName : undefined,
        activeSkills: Array.isArray(body.activeSkills)
          ? body.activeSkills.map((s) => String(s))
          : [],
        defeatCause: typeof body.defeatCause === 'string' ? body.defeatCause : undefined,
        question: typeof body.question === 'string' ? body.question : undefined,
      });

      if (liveAiService && mentor) {
        liveAiService.recordRelationshipInteraction({
          playerName,
          aiPlayerId: mentor.id,
          kind: 'coach_advice',
          summaryVi: `Tư vấn build Chương ${chapterId} cho ${playerName}`,
          affinityDelta: 2,
        });
      }

      res.setHeader('Cache-Control', 'no-store');
      res.json(advice);
    } catch {
      res.status(500).json({ error: 'AI_BUILD_COACH_FAILED' });
    }
  });

  // Phase 2: Post-Match Virtual Player Commentary + Memory Update
  router.post('/post-match', async (req, res) => {
    try {
      const body =
        req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
      if (!body) {
        res.status(400).json({ error: 'INVALID_BODY' });
        return;
      }
      const chapterId = Math.max(1, Math.min(12, Math.floor(Number(body.chapterId ?? 1))));
      const playerName = sanitizeServerDisplayName(body.playerName ?? 'Xạ Thủ');
      const mode: 'campaign' | 'arena' | 'coop' | 'boss' =
        body.mode === 'arena' || body.mode === 'coop' || body.mode === 'boss'
          ? body.mode
          : 'campaign';
      const isVictory = Boolean(body.isVictory);

      const matchedAi =
        liveAiService?.findPlayerByNameOrId(
          typeof body.aiPlayerId === 'string'
            ? body.aiPlayerId
            : typeof body.aiName === 'string'
            ? body.aiName
            : undefined
        ) ?? liveAiService?.pickContextualMentor(chapterId) ?? null;

      const aiId = matchedAi?.id ?? String(body.aiPlayerId ?? 'ai_01');
      const aiName = matchedAi?.displayName ?? String(body.aiName ?? 'Linh Vũ');
      const aiTitle = matchedAi?.titleBadge ?? 'Cao Thủ Tinh Giới';

      let mem = liveAiService
        ? liveAiService.getRelationshipMemory(playerName, aiId)
        : {
            aiPlayerId: aiId,
            aiName,
            affinityScore: 0,
            tier: 'acquaintance' as const,
            memories: [],
            dmMessages: [],
            updatedAtMs: Date.now(),
          };

      const result = await nvidiaAiService.generatePostMatchCommentary({
        aiPlayerId: aiId,
        aiName,
        aiPersonality: matchedAi?.personality ?? 'tactical',
        aiTitle,
        mode,
        isVictory,
        chapterId,
        stageReached: Number(body.stageReached ?? 1),
        kills: Number(body.kills ?? 0),
        maxCombo: Number(body.maxCombo ?? 0),
        relationshipTier: mem.tier,
        affinityScore: mem.affinityScore,
        recentMemories: mem.memories,
        defeatCause: typeof body.defeatCause === 'string' ? body.defeatCause : undefined,
      });

      if (liveAiService && matchedAi && (mode === 'coop' || mode === 'campaign' || mode === 'boss')) {
        const summaryVi =
          mode === 'coop'
            ? isVictory
              ? `Cùng bạn chinh phục Phó Bản Co-op (${Number(body.kills ?? 0)} quái)`
              : `Cùng bạn sát cánh Phó Bản Co-op`
            : isVictory
            ? `Chứng kiến bạn vượt Chương ${chapterId}`
            : `Động viên bạn ở phòng ${Number(body.stageReached ?? 1)} Chương ${chapterId}`;
        mem = liveAiService.recordRelationshipInteraction({
          playerName,
          aiPlayerId: matchedAi.id,
          kind: mode === 'coop' ? 'coop_clear' : 'coach_advice',
          summaryVi,
          affinityDelta: result.affinityDelta,
        });
      }

      res.setHeader('Cache-Control', 'no-store');
      res.json({
        ...result,
        relationshipTier: mem.tier,
        affinityScore: mem.affinityScore,
      });
    } catch {
      res.status(500).json({ error: 'AI_POST_MATCH_FAILED' });
    }
  });

  // Phase 2: In-Match Tactical Companion Callout
  router.post('/callout', async (req, res) => {
    try {
      const body =
        req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
      if (!body) {
        res.status(400).json({ error: 'INVALID_BODY' });
        return;
      }
      const command =
        body.command === 'protect_player' || body.command === 'sync_burst'
          ? body.command
          : 'focus_boss';
      const trigger =
        body.trigger === 'boss_break' ||
        body.trigger === 'boss_phase' ||
        body.trigger === 'low_hp'
          ? body.trigger
          : 'player_command';
      const result = await nvidiaAiService.generateCompanionCallout({
        allyName: String(body.allyName ?? 'Đồng Đội AI'),
        allyRole: String(body.allyRole ?? 'Chiến Binh'),
        command,
        trigger,
        chapterId: Number(body.chapterId ?? 1),
        hpRatio: Number(body.hpRatio ?? 1),
        bossName: typeof body.bossName === 'string' ? body.bossName : undefined,
      });
      res.setHeader('Cache-Control', 'no-store');
      res.json(result);
    } catch {
      res.status(500).json({ error: 'AI_CALLOUT_FAILED' });
    }
  });

  // ============================================================================
  // PHASE 3: NEMESIS LETTER, DYNAMIC CONTRACTS, SPECTATOR CASTING, HAGGLE & WAR-ROOM
  // ============================================================================

  // Pillar 1: Nemesis Challenge Letter & Counter-Tactic
  router.post('/nemesis-letter', async (req, res) => {
    try {
      const body =
        req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
      if (!body) {
        res.status(400).json({ error: 'INVALID_BODY' });
        return;
      }
      const playerName = sanitizeServerDisplayName(body.playerName ?? 'Xạ Thủ');
      const requestedAi = liveAiService?.findPlayerByNameOrId(
        typeof body.aiPlayerId === 'string' ? body.aiPlayerId : undefined
      );
      const rivals = liveAiService?.getRivalsForPlayer(playerName) ?? [];
      const topRival =
        (requestedAi ? rivals.find((r) => r.aiPlayerId === requestedAi.id) : rivals[0]) ?? null;
      const aiProfile =
        requestedAi ??
        (topRival ? liveAiService?.getPlayerById(topRival.aiPlayerId) : null) ??
        liveAiService?.getSnapshot(1).players[0] ??
        null;

      const aiId = aiProfile?.id ?? String(body.aiPlayerId ?? 'ai_01');
      const forceRefresh = Boolean(body.forceRefresh);
      if (liveAiService && !forceRefresh) {
        const cached = liveAiService.getNemesisLetter(playerName, aiId);
        if (cached) {
          res.setHeader('Cache-Control', 'no-store');
          res.json(cached);
          return;
        }
      }

      const counterProfile = liveAiService
        ? liveAiService.deriveNemesisCounterProfile(playerName)
        : {
            counterStyle: 'anti_kite' as const,
            counterLabelVi: 'Khóa Góc Áp Sát',
            playerStyleSummary: 'Lối đánh cân bằng, giữ cự ly trung bình.',
            playerWeakness: 'Hở sườn khi bị ép góc nhanh.',
          };
      const mem = liveAiService?.getRelationshipMemory(playerName, aiId);
      const generated = await nvidiaAiService.generateNemesisChallengeLetter({
        aiPlayerId: aiId,
        aiName: aiProfile?.displayName ?? String(body.aiName ?? 'Huyết Ưng'),
        aiTitle: aiProfile?.titleBadge ?? 'Cao Thủ Đấu Trường',
        aiPersonality: aiProfile?.personality ?? 'aggressive',
        rivalTier: topRival?.rivalryTier ?? 'contender',
        rivalryScore: topRival?.rivalryScore ?? 25,
        playerName,
        playerStyleSummary: counterProfile.playerStyleSummary,
        playerWeakness: counterProfile.playerWeakness,
        counterStyle: counterProfile.counterStyle,
        counterLabelVi: counterProfile.counterLabelVi,
        winsAgainstAi: topRival?.winsAgainst ?? 0,
        lossesAgainstAi: topRival?.lossesAgainst ?? 0,
        recentMemories: mem?.memories ?? [],
      });

      const nowMs = Date.now();
      const letter = {
        id: `nem_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
        aiPlayerId: aiId,
        aiName: aiProfile?.displayName ?? String(body.aiName ?? 'Huyết Ưng'),
        aiTitle: aiProfile?.titleBadge ?? 'Cao Thủ Đấu Trường',
        rivalTier: topRival?.rivalryTier ?? ('contender' as const),
        rivalryScore: topRival?.rivalryScore ?? 25,
        counterStyle: counterProfile.counterStyle,
        counterLabelVi: counterProfile.counterLabelVi,
        letterVi: generated.letterVi,
        counterHintVi: generated.counterHintVi,
        createdAtMs: nowMs,
        expiresAtMs: nowMs + 6 * 3_600_000,
        source: generated.source,
        model: generated.model,
      };

      const saved = liveAiService ? liveAiService.saveNemesisLetter(playerName, letter) : letter;
      res.setHeader('Cache-Control', 'no-store');
      res.json(saved);
    } catch {
      res.status(500).json({ error: 'AI_NEMESIS_LETTER_FAILED' });
    }
  });

  router.post('/nemesis-letter/accept', (req, res) => {
    const body =
      req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
    if (!body || typeof body.aiPlayerId !== 'string') {
      res.status(400).json({ error: 'INVALID_BODY' });
      return;
    }
    const playerName = sanitizeServerDisplayName(body.playerName ?? 'Xạ Thủ');
    const accepted = liveAiService?.acceptNemesisLetter(
      playerName,
      body.aiPlayerId.trim().slice(0, 48)
    );
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: Boolean(accepted), letter: accepted ?? null });
  });

  // Pillar 2: Dynamic Virtual Player Contracts (Side-Quests)
  router.get('/contracts', (req, res) => {
    const playerName = sanitizeServerDisplayName(req.query.playerName ?? 'Xạ Thủ');
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      contracts: liveAiService ? liveAiService.getPlayerContracts(playerName) : [],
    });
  });

  router.post('/contracts/generate', async (req, res) => {
    try {
      const body =
        req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
      if (!body || !liveAiService) {
        res.status(400).json({ error: 'SERVICE_UNAVAILABLE' });
        return;
      }
      const playerName = sanitizeServerDisplayName(body.playerName ?? 'Xạ Thủ');
      const chapterId = Math.max(1, Math.min(12, Math.floor(Number(body.chapterId ?? 1))));
      const playerPowerRating = Math.max(100, Math.min(9_999_999, Math.round(Number(body.playerPowerRating ?? 702))));
      const aiPlayerId = typeof body.aiPlayerId === 'string' ? body.aiPlayerId.trim().slice(0, 48) : undefined;

      const spec = liveAiService.prepareContractSpec({
        playerName,
        aiPlayerId,
        chapterId,
        playerPowerRating,
      });
      if (!spec.canCreate) {
        res.status(409).json({
          ok: false,
          error: 'CONTRACT_LIMIT_REACHED',
          message: spec.reason,
          contracts: liveAiService.getPlayerContracts(playerName),
        });
        return;
      }

      const pitch = await nvidiaAiService.generateVirtualContractPitch({
        aiName: spec.issuer.displayName,
        aiPersonality: spec.issuer.personality,
        relationshipTier: spec.relationshipTier,
        playerName,
        chapterId,
        playerPowerRating,
        objectiveKind: spec.objectiveKind,
        objectiveLabelVi: spec.objectiveLabelVi,
      });

      const nowMs = Date.now();
      const created = liveAiService.createPlayerContract(playerName, {
        id: `ctr_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
        aiPlayerId: spec.issuer.id,
        aiName: spec.issuer.displayName,
        aiTitle: spec.issuer.titleBadge,
        relationshipTier: spec.relationshipTier,
        titleVi: pitch.titleVi,
        pitchVi: pitch.pitchVi,
        objectiveKind: spec.objectiveKind,
        objectiveLabelVi: spec.objectiveLabelVi,
        targetCount: spec.targetCount,
        currentCount: 0,
        chapterTarget: spec.chapterTarget,
        rewardGold: spec.rewardGold,
        rewardGems: spec.rewardGems,
        rewardAffinity: spec.rewardAffinity,
        status: 'active',
        createdAtMs: nowMs,
        source: pitch.source,
        model: pitch.model,
      });

      res.setHeader('Cache-Control', 'no-store');
      res.json({
        ok: true,
        contract: created,
        contracts: liveAiService.getPlayerContracts(playerName),
      });
    } catch {
      res.status(500).json({ error: 'AI_CONTRACT_GENERATE_FAILED' });
    }
  });

  router.post('/contracts/progress', (req, res) => {
    const body =
      req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
    if (!body || !liveAiService) {
      res.status(400).json({ error: 'INVALID_BODY' });
      return;
    }
    const playerName = sanitizeServerDisplayName(body.playerName ?? 'Xạ Thủ');
    const validKinds = new Set([
      'clear_chapter',
      'win_duel',
      'guild_boss_strike',
      'arena_win',
      'survive_hp_ratio',
    ]);
    const kind = String(body.objectiveKind ?? '');
    if (!validKinds.has(kind)) {
      res.status(400).json({ error: 'INVALID_OBJECTIVE_KIND' });
      return;
    }
    const contracts = liveAiService.recordContractProgress({
      playerName,
      objectiveKind: kind as any,
      delta: Number(body.delta ?? 1),
      chapterId: body.chapterId !== undefined ? Number(body.chapterId) : undefined,
      hpRatio: body.hpRatio !== undefined ? Number(body.hpRatio) : undefined,
    });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: true, contracts });
  });

  router.post('/contracts/claim', (req, res) => {
    const body =
      req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
    if (!body || !liveAiService || typeof body.contractId !== 'string') {
      res.status(400).json({ error: 'INVALID_BODY' });
      return;
    }
    const playerName = sanitizeServerDisplayName(body.playerName ?? 'Xạ Thủ');
    const result = liveAiService.claimContractReward({
      playerName,
      contractId: body.contractId.trim().slice(0, 64),
    });
    res.setHeader('Cache-Control', 'no-store');
    res.json(result);
  });

  // Pillar 3: Live AI Spectator Match Casting
  router.post('/spectator-cast', async (req, res) => {
    try {
      const body =
        req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
      if (!body) {
        res.status(400).json({ error: 'INVALID_BODY' });
        return;
      }
      const playerName = sanitizeServerDisplayName(body.playerName ?? 'Xạ Thủ');
      const liveMatch = liveAiService?.getLiveSpectatorMatch(playerName) ?? null;
      const matchId = liveMatch?.matchId ?? String(body.matchId ?? 'spec_local');
      const fA = liveMatch?.fighterA;
      const fB = liveMatch?.fighterB;

      const hpAPct = fA && fA.maxHp > 0 ? (fA.hp / fA.maxHp) * 100 : Number(body.fighterAHpPct ?? 100);
      const hpBPct = fB && fB.maxHp > 0 ? (fB.hp / fB.maxHp) * 100 : Number(body.fighterBHpPct ?? 100);
      const isFinished = liveMatch?.status === 'finished' || Boolean(body.winnerName);
      const minHp = Math.min(hpAPct, hpBPct);
      const moment: 'pre_match' | 'opening' | 'swing' | 'finish' | 'post_match' = isFinished
        ? 'finish'
        : minHp <= 65
        ? 'swing'
        : liveMatch && liveMatch.tickCount > 0
        ? 'opening'
        : 'pre_match';

      const existing = liveAiService?.getSpectatorCasting(matchId);
      if (existing && existing.lines.some((l) => l.moment === moment)) {
        res.setHeader('Cache-Control', 'no-store');
        res.json(existing);
        return;
      }

      const winnerName = liveMatch?.winnerId
        ? liveMatch.winnerId === fA?.aiPlayerId
          ? fA.displayName
          : fB?.displayName
        : typeof body.winnerName === 'string'
        ? body.winnerName
        : undefined;

      const cast = await nvidiaAiService.generateSpectatorCasting({
        matchId,
        moment,
        fighterAName: fA?.displayName ?? String(body.fighterAName ?? 'Linh Vũ'),
        fighterAPower: fA?.powerRating ?? Number(body.fighterAPower ?? 4200),
        fighterAHpPct: hpAPct,
        fighterBName: fB?.displayName ?? String(body.fighterBName ?? 'Lôi Đế'),
        fighterBPower: fB?.powerRating ?? Number(body.fighterBPower ?? 4100),
        fighterBHpPct: hpBPct,
        winnerName,
        latestPlayNote: liveMatch?.tickerLog?.[0]?.text ?? undefined,
      });

      const nowMs = Date.now();
      const bundle = {
        matchId,
        scoutingSummaryVi: cast.scoutingSummaryVi,
        favoredFighterName: cast.favoredFighterName,
        lines: [
          {
            id: `cast_${matchId}_${moment}_${nowMs}`,
            matchId,
            moment,
            speakerName: 'BLV Tinh Giới',
            textVi: cast.castLineVi,
            timestampMs: nowMs,
            source: cast.source,
          },
        ],
        postMatchQuoteVi: cast.postMatchQuoteVi,
        updatedAtMs: nowMs,
        source: cast.source,
        model: cast.model,
      };
      const saved = liveAiService ? liveAiService.saveSpectatorCasting(bundle) : bundle;
      res.setHeader('Cache-Control', 'no-store');
      res.json(saved);
    } catch {
      res.status(500).json({ error: 'AI_SPECTATOR_CAST_FAILED' });
    }
  });

  // Pillar 4A: Auction House Psychological Reaction
  router.post('/auction-react', async (req, res) => {
    try {
      const body =
        req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
      if (!body) {
        res.status(400).json({ error: 'INVALID_BODY' });
        return;
      }
      const aiProfile =
        liveAiService?.findPlayerByNameOrId(
          typeof body.aiPlayerId === 'string'
            ? body.aiPlayerId
            : typeof body.aiName === 'string'
            ? body.aiName
            : undefined
        ) ?? liveAiService?.getSnapshot(1).players[0] ?? null;

      const reaction = await nvidiaAiService.generateAuctionPsychReaction({
        lotId: String(body.lotId ?? 'lot_1').slice(0, 64),
        lotLabel: String(body.lotLabel ?? 'Vật Phẩm Đấu Giá').slice(0, 64),
        aiName: aiProfile?.displayName ?? String(body.aiName ?? 'Lôi Đế'),
        aiPersonality: aiProfile?.personality ?? 'aggressive',
        currentBid: Math.max(1, Math.round(Number(body.currentBid ?? 20))),
        buyoutPrice: Math.max(2, Math.round(Number(body.buyoutPrice ?? 50))),
        playerJustBid: Boolean(body.playerJustBid),
      });

      const nowMs = Date.now();
      res.setHeader('Cache-Control', 'no-store');
      res.json({
        id: `auc_psych_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
        lotId: String(body.lotId ?? 'lot_1').slice(0, 64),
        aiPlayerId: aiProfile?.id ?? 'ai_01',
        aiName: aiProfile?.displayName ?? String(body.aiName ?? 'Lôi Đế'),
        ...reaction,
        timestampMs: nowMs,
      });
    } catch {
      res.status(500).json({ error: 'AI_AUCTION_REACT_FAILED' });
    }
  });

  // Pillar 4B: 1-on-1 Haggle Desk (Server-Clamped Economy Floors)
  router.get('/haggle/offers', (req, res) => {
    const playerName = sanitizeServerDisplayName(req.query.playerName ?? 'Xạ Thủ');
    res.setHeader('Cache-Control', 'no-store');
    res.json({
      offers: liveAiService ? liveAiService.getHaggleOffers(playerName) : [],
    });
  });

  router.post('/haggle/negotiate', async (req, res) => {
    try {
      const body =
        req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
      if (!body || !liveAiService || typeof body.offerId !== 'string') {
        res.status(400).json({ error: 'INVALID_BODY' });
        return;
      }
      const playerName = sanitizeServerDisplayName(body.playerName ?? 'Xạ Thủ');
      const offerId = body.offerId.trim().slice(0, 64);
      const offeredGems = Math.max(1, Math.min(9999, Math.round(Number(body.offeredGems ?? 1))));
      const playerMessage = typeof body.playerMessage === 'string' ? body.playerMessage.slice(0, 120) : undefined;

      const evalStep = liveAiService.evaluateServerHaggleStep({
        playerName,
        offerId,
        offeredGems,
      });
      if (!evalStep.ok || !evalStep.offer) {
        res.status(409).json({
          ok: false,
          error: evalStep.error ?? 'HAGGLE_CLOSED',
          offer: evalStep.offer ?? null,
          offers: liveAiService.getHaggleOffers(playerName),
        });
        return;
      }

      const aiReply = await nvidiaAiService.evaluateHaggleNegotiation({
        sellerName: evalStep.offer.sellerName,
        sellerPersonality: evalStep.offer.sellerPersonality,
        relationshipTier: evalStep.offer.relationshipTier,
        affinityScore: evalStep.offer.affinityScore,
        itemName: evalStep.offer.itemName,
        listPriceGems: evalStep.offer.listPriceGems,
        minFloorGems: evalStep.offer.minFloorGems,
        currentAskGems: evalStep.offer.currentAskGems,
        offeredGems,
        roundsUsed: evalStep.offer.roundsUsed + 1,
        maxRounds: evalStep.offer.maxRounds,
        playerMessage,
        serverDecision: evalStep.decision,
        serverCounterGems: evalStep.serverCounterGems,
      });

      const updated = liveAiService.commitHaggleTurn({
        playerName,
        offerId,
        decision: evalStep.decision,
        finalPriceGems: evalStep.finalPriceGems,
        serverCounterGems: evalStep.serverCounterGems,
        replyVi: aiReply.replyVi,
        source: aiReply.source,
      });

      res.setHeader('Cache-Control', 'no-store');
      res.json({
        ok: true,
        decision: evalStep.decision,
        finalPriceGems: evalStep.finalPriceGems,
        counterPriceGems: evalStep.serverCounterGems,
        replyVi: aiReply.replyVi,
        source: aiReply.source,
        model: aiReply.model,
        offer: updated,
        offers: liveAiService.getHaggleOffers(playerName),
      });
    } catch {
      res.status(500).json({ error: 'AI_HAGGLE_FAILED' });
    }
  });

  // Pillar 5: AI Guild War-Room Coordinator
  router.post('/guild-briefing', async (req, res) => {
    try {
      const body =
        req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
      if (!body || !liveAiService) {
        res.status(400).json({ error: 'INVALID_BODY' });
        return;
      }
      const playerName = sanitizeServerDisplayName(body.playerName ?? 'Xạ Thủ');
      const mode: 'guild_boss' | 'guild_war' =
        body.mode === 'guild_war' ? 'guild_war' : 'guild_boss';

      let sessionId = '';
      let priorityTargetId = '';
      let priorityTargetName = '';
      let targetHpPct = 100;
      let topContributorName: string | undefined;
      let topContributorScore: number | undefined;

      if (mode === 'guild_war') {
        const war = liveAiService.getLiveGuildWarState(playerName);
        sessionId = war.warId;
        const vulnerableBastion =
          [...war.bastions].sort((a, b) => a.controlScore - b.controlScore)[0] ?? war.bastions[0];
        priorityTargetId = vulnerableBastion?.id ?? 'solar_spire';
        priorityTargetName = vulnerableBastion?.name ?? 'Tháp Thái Dương';
        const controlPct = vulnerableBastion
          ? Math.round(((vulnerableBastion.controlScore + 100) / 200) * 100)
          : 50;
        targetHpPct = Math.max(5, 100 - controlPct);
        topContributorName = war.contributors[0]?.displayName;
        topContributorScore = war.contributors[0]?.points;
      } else {
        const boss = liveAiService.getLiveGuildBossState(playerName);
        sessionId = boss.dateKey;
        priorityTargetId = boss.dateKey;
        priorityTargetName = boss.bossName;
        targetHpPct = boss.maxHp > 0 ? (boss.currentHp / boss.maxHp) * 100 : 100;
        topContributorName = boss.contributors[0]?.displayName;
        topContributorScore = boss.contributors[0]?.damage;
      }

      const forceRefresh = Boolean(body.forceRefresh);
      const cached = !forceRefresh
        ? liveAiService.getGuildWarBriefing(mode, sessionId, playerName)
        : null;
      if (cached) {
        res.setHeader('Cache-Control', 'no-store');
        res.json(cached);
        return;
      }

      const snapPlayers = liveAiService.getSnapshot(1).players;
      const leader = snapPlayers[0]?.displayName ?? 'Tề Thiên';
      const officers = [
        snapPlayers[1]?.displayName ?? 'Linh Vũ',
        snapPlayers[2]?.displayName ?? 'Lôi Đế',
      ];

      const gen = await nvidiaAiService.generateGuildWarBriefing({
        mode,
        sessionId,
        leaderName: leader,
        officerNames: officers,
        playerName,
        priorityTargetId,
        priorityTargetName,
        targetHpPct,
        topContributorName,
        topContributorScore,
      });

      const nowMs = Date.now();
      const briefing = liveAiService.saveGuildWarBriefing(playerName, {
        id: `brief_${mode}_${sessionId}_${nowMs}`,
        mode,
        sessionId,
        leaderName: leader,
        priorityTargetId,
        priorityTargetName,
        briefingVi: gen.briefingVi,
        roleOrders: gen.roleOrders,
        bonusPct: 8,
        confirmedByPlayer: false,
        mvpSummaryVi: gen.mvpSummaryVi,
        updatedAtMs: nowMs,
        source: gen.source,
        model: gen.model,
      });

      res.setHeader('Cache-Control', 'no-store');
      res.json(briefing);
    } catch {
      res.status(500).json({ error: 'AI_GUILD_BRIEFING_FAILED' });
    }
  });

  router.post('/guild-briefing/confirm', (req, res) => {
    const body =
      req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
    if (!body || !liveAiService) {
      res.status(400).json({ error: 'INVALID_BODY' });
      return;
    }
    const playerName = sanitizeServerDisplayName(body.playerName ?? 'Xạ Thủ');
    const mode: 'guild_boss' | 'guild_war' =
      body.mode === 'guild_war' ? 'guild_war' : 'guild_boss';
    const sessionId = String(body.sessionId ?? '').trim().slice(0, 64);
    const confirmed = liveAiService.confirmGuildWarBriefing({
      mode,
      sessionId,
      playerName,
    });
    res.setHeader('Cache-Control', 'no-store');
    res.json({ ok: Boolean(confirmed), briefing: confirmed });
  });

  return router;
}

export function attachLiveAiWebSocketServer(
  server: http.Server,
  liveAiService: LiveAiPlayersService,
  options?: {
    tickIntervalMs?: number;
    chatReplyDelayMs?: number;
    nvidiaAiService?: NvidiaNimAiService;
  }
): LiveAiWsHubHandle {
  const wss = new WebSocketServer({
    server,
    path: '/ws/live-ai',
    maxPayload: WS_SECURITY_LIMITS.maxPayloadBytes,
  });
  const clientNames = new Map<WebSocket, string>();
  const clientLastChatAt = new Map<WebSocket, number>();
  const clientMsgLimiter = new SlidingWindowRateLimiter({
    maxRequests: WS_SECURITY_LIMITS.generalMaxMsgsPer10s,
    windowMs: 10_000,
    maxBuckets: 1000,
  });
  const clientActionLimiter = new SlidingWindowRateLimiter({
    maxRequests: WS_SECURITY_LIMITS.actionBurstMaxPer10s,
    windowMs: 10_000,
    maxBuckets: 2000,
  });
  const clientSocketIds = new Map<WebSocket, string>();
  let nextSocketSeq = 1;
  const clientAuctionLots = new Map<
    WebSocket,
    Array<{
      id: string;
      label: string;
      currentBid: number;
      buyoutPrice: number;
      highestBidderIsPlayer: boolean;
      isPlayerListing: boolean;
      endsAt: number;
    }>
  >();

  const sendJson = (ws: WebSocket, msg: unknown) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  };

  const broadcast = (msg: unknown) => {
    const serialized = JSON.stringify(msg);
    for (const client of wss.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(serialized);
      }
    }
  };

  const emitSnapshotTo = (ws: WebSocket) => {
    const playerName = clientNames.get(ws) ?? 'Chiến Binh Tinh Giới';
    const baseSnap = liveAiService.getSnapshot(wss.clients.size);
    sendJson(ws, {
      type: 'hub:snapshot',
      payload: {
        ...baseSnap,
        rivals: liveAiService.getRivalsForPlayer(playerName),
        guildBossLive: liveAiService.getLiveGuildBossState(playerName),
        miniCup: liveAiService.getMiniCupForPlayer(playerName),
        serverBounty: liveAiService.getServerBountyState(playerName),
        adaptationProfile: liveAiService.getAdaptationForPlayer(playerName),
        guildWarLive: liveAiService.getLiveGuildWarState(playerName),
        spectatorMatch: liveAiService.getLiveSpectatorMatch(playerName),
      },
    });
  };

  const triggerAuctionForClient = (ws: WebSocket, forceLotId?: string) => {
    const lots = clientAuctionLots.get(ws);
    if (!lots || lots.length === 0) return;
    const result = liveAiService.evaluateAuctionCompetition(lots, Date.now(), forceLotId);
    if (!result) return;
    // Update cached server copy of that lot so repeated ticks escalate realistically
    const matched = lots.find((l) => l.id === result.bidEvent.lotId);
    if (matched) {
      matched.currentBid = result.bidEvent.amount;
      matched.highestBidderIsPlayer = false;
      if (result.bidEvent.action === 'buyout') {
        clientAuctionLots.set(
          ws,
          lots.filter((l) => l.id !== result.bidEvent.lotId)
        );
      }
    }
    sendJson(ws, {
      type: 'auction:bid_event',
      payload: result.bidEvent,
    });
    broadcast({
      type: 'hub:activity',
      payload: {
        event: result.activity,
        updatedPlayer: result.bidder,
        onlineHumanCount: Math.max(1, wss.clients.size),
      },
    });
  };

  wss.on('connection', (ws) => {
    const socketId = `ws_${nextSocketSeq++}`;
    clientSocketIds.set(ws, socketId);
    clientNames.set(ws, 'Chiến Binh Tinh Giới');
    emitSnapshotTo(ws);

    ws.on('message', (raw) => {
      try {
        const msgVerdict = clientMsgLimiter.consume(socketId);
        if (!msgVerdict.allowed) {
          sendJson(ws, {
            type: 'security:rate_limited',
            payload: { retryAfterMs: msgVerdict.retryAfterMs },
          });
          return;
        }
        const parsed = JSON.parse(String(raw)) as {
          type?: string;
          payload?: Record<string, unknown>;
        };
        const type = parsed?.type;
        const payload = parsed?.payload ?? {};

        if (type === 'presence:announce') {
          const cleanName = sanitizeServerDisplayName(payload.displayName);
          clientNames.set(ws, cleanName);
          emitSnapshotTo(ws);
          return;
        }

        if (type === 'hub:ping') {
          sendJson(ws, { type: 'hub:pong', serverNow: Date.now() });
          return;
        }

        if (type === 'auction:sync_lots') {
          const rawLots = Array.isArray(payload.lots) ? payload.lots : [];
          const cleanLots = rawLots
            .slice(0, 16)
            .map((item) => {
              const obj = item as Record<string, unknown>;
              return {
                id: String(obj.id ?? '').slice(0, 64),
                label: String(obj.label ?? 'Vật phẩm Tinh Giới').slice(0, 64),
                currentBid: Math.max(1, Math.floor(Number(obj.currentBid ?? 1))),
                buyoutPrice: Math.max(2, Math.floor(Number(obj.buyoutPrice ?? 2))),
                highestBidderIsPlayer: Boolean(obj.highestBidderIsPlayer),
                isPlayerListing: Boolean(obj.isPlayerListing),
                endsAt: Number(obj.endsAt ?? 0),
              };
            })
            .filter((l) => l.id.length > 0 && l.endsAt > Date.now());
          clientAuctionLots.set(ws, cleanLots);
          if (payload.requestImmediateEvaluation && cleanLots.length > 0) {
            const focusId =
              typeof payload.focusLotId === 'string' ? payload.focusLotId : undefined;
            triggerAuctionForClient(ws, focusId);
          }
          return;
        }

        if (type === 'duel:challenge') {
          const aiPlayerId = String(payload.aiPlayerId ?? '').trim();
          const challengerName = sanitizeServerDisplayName(
            payload.challengerName ?? clientNames.get(ws)
          );
          const started = liveAiService.startDuelChallenge(aiPlayerId, challengerName);
          if (!started) {
            sendJson(ws, {
              type: 'duel:error',
              payload: { message: 'Không tìm thấy người chơi AI để thách đấu.' },
            });
            return;
          }
          sendJson(ws, {
            type: 'duel:accepted',
            payload: {
              duelId: started.duelId,
              opponent: started.opponent,
            },
          });
          broadcast({
            type: 'hub:activity',
            payload: {
              event: started.event,
              updatedPlayer: started.opponent,
              onlineHumanCount: Math.max(1, wss.clients.size),
            },
          });
          return;
        }

        if (type === 'chat:send') {
          const channel = payload.channel === 'guild' ? 'guild' : 'lobby';
          const text = String(payload.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 180);
          if (text.length === 0) return;
          const now = Date.now();
          const lastAt = clientLastChatAt.get(ws) ?? 0;
          if (now - lastAt < 700) return;
          clientLastChatAt.set(ws, now);

          const senderName = sanitizeServerDisplayName(
            payload.senderName ?? clientNames.get(ws)
          );
          const msg = liveAiService.addPlayerChatMessage({
            channel,
            senderName,
            text,
            nowMs: now,
          });
          broadcast({
            type: 'chat:message',
            payload: msg,
          });

          const replyDelay = Math.max(20, options?.chatReplyDelayMs ?? 850);
          const replyTimer = setTimeout(() => {
            void (async () => {
              const fallbackReply = liveAiService.generateContextualAiChatReply({
                channel,
                senderName,
                userText: text,
              });
              let finalReply = fallbackReply;
              if (options?.nvidiaAiService?.isConfigured()) {
                const speakerProfile = liveAiService
                  .getSnapshot(Math.max(1, wss.clients.size))
                  .players.find((p) => p.id === fallbackReply.aiPlayerId);
                const llmChat = await options.nvidiaAiService.generateVirtualPlayerChat(
                  {
                    channel,
                    aiName: fallbackReply.senderName,
                    aiPersonality: speakerProfile?.personality ?? 'tactical',
                    aiTitle: speakerProfile?.titleBadge,
                    senderName,
                    userText: text,
                    contextSummary: speakerProfile
                      ? `LC ${speakerProfile.powerRating}, Chương ${speakerProfile.highestChapterCleared}`
                      : undefined,
                  },
                  fallbackReply.text
                );
                if (llmChat.source === 'nvidia_nim' && llmChat.replyVi.trim().length > 0) {
                  fallbackReply.text = llmChat.replyVi;
                  finalReply = fallbackReply;
                }
              }
              broadcast({
                type: 'chat:message',
                payload: finalReply,
              });
            })();
          }, replyDelay);
          replyTimer.unref?.();
          return;
        }

        if (type === 'duel:complete') {
          const duelId = String(payload.duelId ?? '').trim();
          const aiPlayerId = String(payload.aiPlayerId ?? '').trim();
          const challengerName = sanitizeServerDisplayName(
            payload.challengerName ?? clientNames.get(ws)
          );
          const playerWon = Boolean(payload.playerWon);
          const durationSec = clampWsDuelDurationSec(payload.durationSec);
          if (typeof payload.durationSec === 'number' && Number.isFinite(payload.durationSec) && Math.round(payload.durationSec) !== durationSec) {
            securityAnomalies.record({
              category: 'ws_clamped',
              scope: 'ws:duel:complete',
              actor: challengerName,
              detail: `durationSec clamped ${payload.durationSec} -> ${durationSec}`,
            });
          }
          const rawTier = String(payload.aiDuelTier ?? 'challenger');
          const aiDuelTier: 'challenger' | 'master' | 'sovereign' | 'mythic' =
            rawTier === 'challenger' ||
            rawTier === 'master' ||
            rawTier === 'sovereign' ||
            rawTier === 'mythic'
              ? rawTier
              : 'challenger';
          if (!duelId || !aiPlayerId) return;

          const res = liveAiService.completeDuel({
            duelId,
            aiPlayerId,
            challengerName,
            playerWon,
            durationSec,
            aiDuelTier,
          });
          sendJson(ws, {
            type: 'duel:result_ack',
            payload: {
              duelId,
              alreadyProcessed: res.alreadyProcessed,
              ratingDelta: res.ratingDelta,
              opponent: res.opponent,
              rivals: liveAiService.getRivalsForPlayer(challengerName),
            },
          });
          if (!res.alreadyProcessed && res.event && res.opponent) {
            broadcast({
              type: 'hub:activity',
              payload: {
                event: res.event,
                updatedPlayer: res.opponent,
                onlineHumanCount: Math.max(1, wss.clients.size),
              },
            });
            if (res.rival?.vendettaPending) {
              const rev = liveAiService.issueRivalRevengeChallenge({
                playerName: challengerName,
                aiPlayerId: res.rival.aiPlayerId,
              });
              if (rev.ok && rev.invite) {
                sendJson(ws, {
                  type: 'rival:revenge_challenge',
                  payload: {
                    invite: rev.invite,
                    rival: rev.rival,
                    rivals: liveAiService.getRivalsForPlayer(challengerName),
                  },
                });
              }
            }
          }
          return;
        }

        if (type === 'invite:request_now') {
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          const preferredKind =
            payload.kind === 'arena_duel'
              ? 'arena_duel'
              : payload.kind === 'coop_raid'
              ? 'coop_raid'
              : undefined;
          const invite = liveAiService.generateLiveInvite({
            playerName,
            preferredKind,
          });
          sendJson(ws, {
            type: 'invite:received',
            payload: invite,
          });
          return;
        }

        if (type === 'rival:request_revenge') {
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          const aiPlayerId =
            typeof payload.aiPlayerId === 'string' ? payload.aiPlayerId.trim() : undefined;
          const rev = liveAiService.issueRivalRevengeChallenge({
            playerName,
            aiPlayerId,
          });
          if (rev.ok && rev.invite) {
            sendJson(ws, {
              type: 'rival:revenge_challenge',
              payload: {
                invite: rev.invite,
                rival: rev.rival,
                rivals: liveAiService.getRivalsForPlayer(playerName),
              },
            });
            sendJson(ws, {
              type: 'invite:received',
              payload: rev.invite,
            });
          }
          return;
        }

        if (type === 'invite:respond') {
          const inviteId = String(payload.inviteId ?? '').trim();
          const action = payload.action === 'accept' ? 'accept' : 'decline';
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          if (!inviteId) return;
          const res = liveAiService.respondToInvite({
            inviteId,
            action,
            playerName,
          });
          sendJson(ws, {
            type: 'invite:ack',
            payload: {
              inviteId,
              action,
              ok: res.ok,
              alreadyProcessed: res.alreadyProcessed,
              invite: res.invite,
              duelId: res.duelId,
              opponent: res.opponent,
            },
          });
          if (!res.alreadyProcessed && res.event && res.opponent) {
            broadcast({
              type: 'hub:activity',
              payload: {
                event: res.event,
                updatedPlayer: res.opponent,
                onlineHumanCount: Math.max(1, wss.clients.size),
              },
            });
          }
          return;
        }

        if (type === 'rival:claim_bounty') {
          const aiPlayerId = String(payload.aiPlayerId ?? '').trim();
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          if (!aiPlayerId) return;
          const claimed = liveAiService.claimRivalDailyBounty({
            playerName,
            aiPlayerId,
          });
          sendJson(ws, {
            type: 'rival:bounty_ack',
            payload: {
              ...claimed,
              rivals: liveAiService.getRivalsForPlayer(playerName),
            },
          });
          return;
        }

        if (type === 'guild_boss:sync') {
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          sendJson(ws, {
            type: 'guild_boss:update',
            payload: {
              guildBossLive: liveAiService.getLiveGuildBossState(playerName),
            },
          });
          return;
        }

        if (type === 'guild_boss:attack') {
          if (!clientActionLimiter.consume(`${socketId}:guild_boss`).allowed) {
            securityAnomalies.record({
              category: 'rate_limit',
              scope: 'ws:guild_boss:attack',
              actor: clientNames.get(ws) ?? socketId,
              detail: 'WS guild_boss:attack burst limit exceeded',
            });
            sendJson(ws, { type: 'security:rate_limited', payload: { action: 'guild_boss:attack' } });
            return;
          }
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          const damage = clampWsGuildBossDamage(payload.damage);
          if (typeof payload.damage === 'number' && Number.isFinite(payload.damage) && Math.round(payload.damage) !== damage) {
            securityAnomalies.record({
              category: 'ws_clamped',
              scope: 'ws:guild_boss:attack',
              actor: playerName,
              detail: `damage clamped ${payload.damage} -> ${damage}`,
            });
          }
          const heroId = typeof payload.heroId === 'string' ? payload.heroId : 'artemis';
          if (damage === null) return;
          const res = liveAiService.recordHumanGuildBossAttack({
            playerName,
            heroId: heroId as any,
            damage,
          });
          broadcast({
            type: 'guild_boss:update',
            payload: {
              guildBossLive: res.state,
              event: res.event,
            },
          });
          return;
        }

        if (type === 'guild_boss:claim_milestone') {
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          const tierId = String(payload.tierId ?? '').trim();
          if (!tierId) return;
          const claimed = liveAiService.claimLiveGuildBossMilestone({
            playerName,
            tierId,
          });
          sendJson(ws, {
            type: 'guild_boss:claim_ack',
            payload: claimed,
          });
          return;
        }

        if (type === 'cup:sync') {
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          sendJson(ws, {
            type: 'cup:state',
            payload: {
              cup: liveAiService.getMiniCupForPlayer(playerName),
            },
          });
          return;
        }

        if (type === 'cup:start') {
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          const started = liveAiService.startMiniCup({
            playerName,
            playerHeroId: typeof payload.heroId === 'string' ? (payload.heroId as any) : 'artemis',
            playerPowerRating: Number(payload.powerRating ?? 1800),
            playerDuelRating: Number(payload.duelRating ?? 1200),
          });
          sendJson(ws, {
            type: 'cup:state',
            payload: {
              cup: started.cup,
            },
          });
          broadcast({
            type: 'hub:activity',
            payload: {
              event: started.event,
              updatedPlayer: liveAiService.getSnapshot(wss.clients.size).players[0],
              onlineHumanCount: Math.max(1, wss.clients.size),
            },
          });
          return;
        }

        if (type === 'cup:report_match') {
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          const matchId = String(payload.matchId ?? '').trim();
          const playerWon = Boolean(payload.playerWon);
          if (!matchId) return;
          const res = liveAiService.reportMiniCupMatchResult({
            playerName,
            matchId,
            playerWon,
          });
          sendJson(ws, {
            type: 'cup:state',
            payload: {
              cup: res.cup,
              rivals: liveAiService.getRivalsForPlayer(playerName),
            },
          });
          if (!res.alreadyProcessed && res.event) {
            broadcast({
              type: 'hub:activity',
              payload: {
                event: res.event,
                updatedPlayer: liveAiService.getSnapshot(wss.clients.size).players[0],
                onlineHumanCount: Math.max(1, wss.clients.size),
              },
            });
          }
          return;
        }

        if (type === 'cup:claim_prize') {
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          const cupId = String(payload.cupId ?? '').trim();
          if (!cupId) return;
          const claimed = liveAiService.claimMiniCupPrize({
            playerName,
            cupId,
          });
          sendJson(ws, {
            type: 'cup:prize_ack',
            payload: claimed,
          });
          return;
        }

        if (type === 'bounty:sync') {
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          sendJson(ws, {
            type: 'bounty:update',
            payload: {
              serverBounty: liveAiService.getServerBountyState(playerName),
            },
          });
          return;
        }

        if (type === 'bounty:contribute') {
          if (!clientActionLimiter.consume(`${socketId}:bounty`).allowed) {
            securityAnomalies.record({
              category: 'rate_limit',
              scope: 'ws:bounty:contribute',
              actor: clientNames.get(ws) ?? socketId,
              detail: 'WS bounty:contribute burst limit exceeded',
            });
            sendJson(ws, { type: 'security:rate_limited', payload: { action: 'bounty:contribute' } });
            return;
          }
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          const points = clampWsBountyPoints(payload.points);
          if (typeof payload.points === 'number' && Number.isFinite(payload.points) && Math.round(payload.points) !== points) {
            securityAnomalies.record({
              category: 'ws_clamped',
              scope: 'ws:bounty:contribute',
              actor: playerName,
              detail: `points clamped ${payload.points} -> ${points}`,
            });
          }
          const heroId = typeof payload.heroId === 'string' ? payload.heroId : 'artemis';
          const sourceLabel =
            typeof payload.sourceLabel === 'string'
              ? payload.sourceLabel.slice(0, 48)
              : undefined;
          if (points === null) return;
          const res = liveAiService.recordHumanBountyContribution({
            playerName,
            heroId: heroId as any,
            points,
            sourceLabel,
          });
          for (const client of wss.clients) {
            if (client.readyState === WebSocket.OPEN) {
              const pName = clientNames.get(client);
              sendJson(client, {
                type: 'bounty:update',
                payload: {
                  serverBounty: liveAiService.getServerBountyState(pName),
                  event: res.event,
                },
              });
            }
          }
          return;
        }

        if (type === 'bounty:claim_reward') {
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          const bountyId =
            typeof payload.bountyId === 'string' ? payload.bountyId.trim() : undefined;
          const claimed = liveAiService.claimServerBountyReward({
            playerName,
            bountyId,
          });
          sendJson(ws, {
            type: 'bounty:claim_ack',
            payload: claimed,
          });
          return;
        }

        if (type === 'ai:learn_telemetry') {
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          const rawTel = (payload.telemetry ?? payload) as Record<string, unknown>;
          const rawEl = String(rawTel.dominantElement ?? 'fire');
          const dominantElement =
            rawEl === 'ice' || rawEl === 'storm' || rawEl === 'poison' ? rawEl : 'fire';
          const profile = liveAiService.recordPlayerCombatTelemetry({
            playerName,
            telemetry: {
              leftDodges: Math.max(0, Math.min(200, Math.round(Number(rawTel.leftDodges ?? 0)))),
              rightDodges: Math.max(0, Math.min(200, Math.round(Number(rawTel.rightDodges ?? 0)))),
              avgDistance: Math.max(1.5, Math.min(14, Number(rawTel.avgDistance ?? 6.2))),
              dashCount: Math.max(0, Math.min(200, Math.round(Number(rawTel.dashCount ?? 0)))),
              durationSec: Math.max(4, Math.min(300, Number(rawTel.durationSec ?? 20))),
              dominantElement,
              elementalReactions: Math.max(
                0,
                Math.min(200, Math.round(Number(rawTel.elementalReactions ?? 0)))
              ),
              won: typeof rawTel.won === 'boolean' ? rawTel.won : undefined,
            },
          });
          sendJson(ws, {
            type: 'ai:adaptation_update',
            payload: { adaptationProfile: profile },
          });
          return;
        }

        if (type === 'ai:reset_adaptation') {
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          liveAiService.resetPlayerAdaptation(playerName);
          sendJson(ws, {
            type: 'ai:adaptation_update',
            payload: { adaptationProfile: null },
          });
          return;
        }

        if (type === 'guild_war:sync') {
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          sendJson(ws, {
            type: 'guild_war:update',
            payload: {
              guildWarLive: liveAiService.getLiveGuildWarState(playerName),
            },
          });
          return;
        }

        if (type === 'guild_war:capture_strike') {
          if (!clientActionLimiter.consume(`${socketId}:guild_war`).allowed) {
            sendJson(ws, {
              type: 'security:rate_limited',
              payload: { action: 'guild_war:capture_strike' },
            });
            return;
          }
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          const rawBastion = String(payload.bastionId ?? 'solar_spire');
          const bastionId =
            rawBastion === 'astral_citadel' || rawBastion === 'void_shrine'
              ? rawBastion
              : 'solar_spire';
          const mode = payload.mode === 'assault_3d' ? 'assault_3d' : 'quick_strike';
          const heroId = typeof payload.heroId === 'string' ? payload.heroId : 'artemis';
          const scoreGain = clampWsGuildWarScore(payload.scoreGain, mode);
          if (typeof payload.scoreGain === 'number' && Number.isFinite(payload.scoreGain) && Math.round(payload.scoreGain) !== scoreGain) {
            securityAnomalies.record({
              category: 'ws_clamped',
              scope: 'ws:guild_war:strike',
              actor: playerName,
              detail: `scoreGain clamped ${payload.scoreGain} -> ${scoreGain} (${mode})`,
            });
          }
          const res = liveAiService.strikeGuildWarBastion({
            playerName,
            heroId: heroId as any,
            bastionId,
            mode,
            scoreGain,
          });
          for (const client of wss.clients) {
            if (client.readyState === WebSocket.OPEN) {
              const pName = clientNames.get(client);
              sendJson(client, {
                type: 'guild_war:update',
                payload: {
                  guildWarLive: liveAiService.getLiveGuildWarState(pName),
                  event: res.event,
                },
              });
            }
          }
          return;
        }

        if (type === 'guild_war:claim_reward') {
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          const warId =
            typeof payload.warId === 'string' ? payload.warId.trim() : undefined;
          const claimed = liveAiService.claimLiveGuildWarReward({
            playerName,
            warId,
          });
          sendJson(ws, {
            type: 'guild_war:claim_ack',
            payload: claimed,
          });
          return;
        }

        if (type === 'spectator:sync') {
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          sendJson(ws, {
            type: 'spectator:update',
            payload: {
              spectatorMatch: liveAiService.getLiveSpectatorMatch(playerName),
            },
          });
          return;
        }

        if (type === 'spectator:cheer') {
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          const fighterId = String(payload.fighterId ?? '').trim();
          const matchId =
            typeof payload.matchId === 'string' ? payload.matchId.trim() : undefined;
          const res = liveAiService.cheerSpectatorFighter({
            playerName,
            matchId,
            fighterId,
          });
          sendJson(ws, {
            type: 'spectator:cheer_ack',
            payload: res,
          });
          for (const client of wss.clients) {
            if (client.readyState === WebSocket.OPEN) {
              const pName = clientNames.get(client);
              sendJson(client, {
                type: 'spectator:update',
                payload: {
                  spectatorMatch: liveAiService.getLiveSpectatorMatch(pName),
                },
              });
            }
          }
          return;
        }

        if (type === 'spectator:claim_reward') {
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          const matchId =
            typeof payload.matchId === 'string' ? payload.matchId.trim() : undefined;
          const claimed = liveAiService.claimSpectatorReward({
            playerName,
            matchId,
          });
          sendJson(ws, {
            type: 'spectator:claim_ack',
            payload: claimed,
          });
          return;
        }

        if (type === 'spectator:next_match') {
          liveAiService.startNextSpectatorMatch();
          for (const client of wss.clients) {
            if (client.readyState === WebSocket.OPEN) {
              const pName = clientNames.get(client);
              sendJson(client, {
                type: 'spectator:update',
                payload: {
                  spectatorMatch: liveAiService.getLiveSpectatorMatch(pName),
                },
              });
            }
          }
        }
      } catch {
        // Ignore malformed frames safely
      }
    });

    ws.on('close', () => {
      const closedId = clientSocketIds.get(ws);
      if (closedId) {
        clientMsgLimiter.reset(closedId);
        clientActionLimiter.reset(`${closedId}:guild_boss`);
        clientActionLimiter.reset(`${closedId}:bounty`);
        clientActionLimiter.reset(`${closedId}:guild_war`);
        clientSocketIds.delete(ws);
      }
      clientNames.delete(ws);
      clientAuctionLots.delete(ws);
      clientLastChatAt.delete(ws);
    });
  });

  let wsTickCount = 0;
  const tickIntervalMs = options?.tickIntervalMs ?? 4500;
  const timer = setInterval(() => {
    wsTickCount += 1;
    const tick = liveAiService.simulateServerTick();
    if (wss.clients.size > 0) {
      broadcast({
        type: 'hub:activity',
        payload: {
          event: tick.event,
          updatedPlayer: tick.updatedPlayer,
          onlineHumanCount: Math.max(1, wss.clients.size),
        },
      });
      if (tick.event.kind === 'guild') {
        for (const client of wss.clients) {
          if (client.readyState === WebSocket.OPEN) {
            const pName = clientNames.get(client);
            sendJson(client, {
              type: 'guild_boss:update',
              payload: {
                guildBossLive: liveAiService.getLiveGuildBossState(pName),
              },
            });
          }
        }
      }
      if (tick.event.kind === 'world_boss') {
        for (const client of wss.clients) {
          if (client.readyState === WebSocket.OPEN) {
            const pName = clientNames.get(client);
            sendJson(client, {
              type: 'bounty:update',
              payload: {
                serverBounty: liveAiService.getServerBountyState(pName),
              },
            });
          }
        }
      }
      if ((tick as { guildWarUpdated?: boolean }).guildWarUpdated) {
        for (const client of wss.clients) {
          if (client.readyState === WebSocket.OPEN) {
            const pName = clientNames.get(client);
            sendJson(client, {
              type: 'guild_war:update',
              payload: {
                guildWarLive: liveAiService.getLiveGuildWarState(pName),
              },
            });
          }
        }
      }
      if ((tick as { spectatorUpdated?: boolean }).spectatorUpdated) {
        for (const client of wss.clients) {
          if (client.readyState === WebSocket.OPEN) {
            const pName = clientNames.get(client);
            sendJson(client, {
              type: 'spectator:update',
              payload: {
                spectatorMatch: liveAiService.getLiveSpectatorMatch(pName),
              },
            });
          }
        }
      }
      // Every 2nd server tick (~9s), let [AI Live] players actively compete on open auction lots
      if (wsTickCount % 2 === 0) {
        for (const client of wss.clients) {
          if (client.readyState === WebSocket.OPEN && clientAuctionLots.has(client)) {
            triggerAuctionForClient(client);
          }
        }
      }
      // Every 12th server tick (~54s), run Balanced Autonomous Server-Event Banter via NVIDIA NIM
      // (strictly gated by active WebSocket clients + >10 remaining RPM reserve)
      if (
        wsTickCount % 12 === 0 &&
        options?.nvidiaAiService?.isConfigured() &&
        options.nvidiaAiService.getRemainingRpm() > 10
      ) {
        const snap = liveAiService.getSnapshot(Math.max(1, wss.clients.size));
        if (snap.players.length >= 2) {
          const idxA = wsTickCount % snap.players.length;
          const idxB = (wsTickCount * 3 + 5) % snap.players.length;
          const speakerA = snap.players[idxA];
          const speakerB = snap.players[idxB === idxA ? (idxA + 1) % snap.players.length : idxB];
          const channel: 'lobby' | 'guild' =
            tick.event.kind === 'guild' ? 'guild' : 'lobby';
          const eventSummary = `${tick.event.actorName} ${tick.event.summary}`;
          void options.nvidiaAiService
            .generateAutonomousBanter({
              channel,
              eventSummary,
              speakerA: {
                id: speakerA.id,
                name: speakerA.displayName,
                personality: speakerA.personality,
                title: speakerA.titleBadge,
              },
              speakerB: {
                id: speakerB.id,
                name: speakerB.displayName,
                personality: speakerB.personality,
                title: speakerB.titleBadge,
              },
            })
            .then((banter) => {
              if (wss.clients.size === 0) return;
              const msgA = liveAiService.addAutonomousAiChatMessage({
                channel,
                aiPlayerId: speakerA.id,
                text: banter.lineA,
              });
              if (msgA) {
                broadcast({ type: 'chat:message', payload: msgA });
              }
              const followTimer = setTimeout(() => {
                if (wss.clients.size === 0) return;
                const msgB = liveAiService.addAutonomousAiChatMessage({
                  channel,
                  aiPlayerId: speakerB.id,
                  text: banter.lineB,
                });
                if (msgB) {
                  broadcast({ type: 'chat:message', payload: msgB });
                }
              }, 2400);
              followTimer.unref?.();
            })
            .catch(() => {
              // Silent fallback on background banter
            });
        }
      } else if (wsTickCount % 5 === 0) {
        // Organic periodic Lobby/Guild chat note when not running autonomous NIM banter
        const aiChat = liveAiService.generatePeriodicAiChat();
        broadcast({
          type: 'chat:message',
          payload: aiChat,
        });
      }
      // Every 7th server tick (~31s), an [AI Live] teammate or rival sends a live Co-op / 1v1 invite
      if (wsTickCount % 7 === 0) {
        for (const client of wss.clients) {
          if (client.readyState === WebSocket.OPEN) {
            const pName = clientNames.get(client) ?? 'Chiến Binh Tinh Giới';
            const invite = liveAiService.generateLiveInvite({ playerName: pName });
            sendJson(client, {
              type: 'invite:received',
              payload: invite,
            });
          }
        }
      }
    }
  }, tickIntervalMs);
  timer.unref?.();

  return {
    wss,
    broadcastWeeklyBossUpdate(payload) {
      const event = liveAiService.recordWeeklyBossRankEvent({
        displayName: payload.displayName,
        rank: payload.rank,
        verifiedScore: payload.verifiedScore,
        cleared: payload.cleared,
      });
      broadcast({
        type: 'weekly_boss:rank_update',
        payload: {
          ...payload,
          event,
        },
      });
    },
    close() {
      clearInterval(timer);
      wss.close();
    },
  };
}

function handleApiError(res: express.Response, err: unknown): void {
  if (err instanceof WeeklyBossServiceError) {
    res.status(err.statusCode).json({ error: err.code, message: err.message });
    return;
  }
  console.error('[weekly-boss-api]', err);
  res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: 'Máy chủ xác minh Boss Tuần gặp sự cố tạm thời.',
  });
}

async function startServer() {
  const app = express();
  app.disable('x-powered-by');
  app.use(applySecurityHeadersMiddleware);
  app.use(express.json({ limit: '128kb' }));

  const liveOpsConfigPath = path.resolve(__dirname, '.data/liveops-config.json');
  const readServerLiveOpsConfig = (): LiveOpsConfig => {
    try {
      if (fs.existsSync(liveOpsConfigPath)) {
        const raw = JSON.parse(fs.readFileSync(liveOpsConfigPath, 'utf8'));
        return sanitizeLiveOpsConfig(raw);
      }
    } catch {
      // Fallback safely to default LiveOps config
    }
    return { ...DEFAULT_LIVEOPS_CONFIG };
  };
  const writeServerLiveOpsConfig = (config: LiveOpsConfig): void => {
    const dir = path.dirname(liveOpsConfigPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpPath = `${liveOpsConfigPath}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(config, null, 2), 'utf8');
    fs.renameSync(tmpPath, liveOpsConfigPath);
  };

  const liveAiService = new LiveAiPlayersService(
    path.resolve(__dirname, '.data/live-ai-players.json')
  );
  const nvidiaAiService = new NvidiaNimAiService();
  let wsHub: LiveAiWsHubHandle | null = null;

  const weeklyBossService = new WeeklyBossService(
    path.resolve(__dirname, '.data/weekly-ranked-boss.json'),
    (update) => {
      wsHub?.broadcastWeeklyBossUpdate({
        weekId: update.weekId,
        displayName: update.displayName,
        rank: update.rank,
        verifiedScore: update.verifiedScore,
        cleared: update.cleared,
        leaderboard: update.leaderboard,
      });
    }
  );
  app.use(
    '/api/weekly-boss',
    createApiRateLimitMiddleware({
      scope: 'weekly-boss',
      maxRequests: 60,
      windowMs: 60_000,
      onRateLimited: recordApiRateLimit,
    }),
    createWeeklyBossRouter(weeklyBossService)
  );

  app.use(
    '/api/liveops',
    createApiRateLimitMiddleware({
      scope: 'liveops',
      maxRequests: 60,
      windowMs: 60_000,
      onRateLimited: recordApiRateLimit,
    })
  );
  app.get('/api/liveops/config', (_req, res) => {
    res.setHeader('Cache-Control', 'no-cache');
    res.json({ ok: true, config: readServerLiveOpsConfig() });
  });
  app.put('/api/liveops/config', async (req, res) => {
    try {
      const user = await resolveBearerUser(req);
      if (!user) {
        securityAnomalies.record({
          category: 'auth_invalid',
          scope: 'api:liveops:put',
          actor: req.ip || 'unknown',
          detail: 'Missing or invalid Bearer token on PUT /api/liveops/config',
        });
        res.status(401).json({
          error: 'AUTH_REQUIRED',
          message: 'Cần đăng nhập tài khoản quản trị để cập nhật cấu hình LiveOps.',
        });
        return;
      }
      const rawAuthHeader = req.headers.authorization;
      const bearerToken =
        typeof rawAuthHeader === 'string' && rawAuthHeader.startsWith('Bearer ')
          ? rawAuthHeader.slice('Bearer '.length).trim()
          : '';
      const isGoogleAdmin = isVerifiedAdminClaims({
        email: user.email,
        emailVerified: user.emailVerified,
      });
      const isLinkedWorkerAdmin =
        !isGoogleAdmin && bearerToken.length > 0 && (await verifyWorkerAdminSession(bearerToken));
      if (!isGoogleAdmin && !isLinkedWorkerAdmin) {
        securityAnomalies.record({
          category: 'admin_denied',
          scope: 'api:liveops:put',
          actor: user.email || user.uid || 'unknown',
          detail: 'Non-admin attempted PUT /api/liveops/config',
        });
        res.status(403).json({
          error: 'ADMIN_FORBIDDEN',
          message: 'Tài khoản này không có quyền quản trị LiveOps.',
        });
        return;
      }
      const prev = readServerLiveOpsConfig();
      const rawBody =
        req.body && typeof req.body === 'object' && 'config' in req.body
          ? (req.body as { config: unknown }).config
          : req.body;
      const sanitized = sanitizeLiveOpsConfig({
        ...prev,
        ...(rawBody && typeof rawBody === 'object' ? (rawBody as Record<string, unknown>) : {}),
        version: Math.max(prev.version + 1, Number((rawBody as Record<string, unknown>)?.version ?? 1)),
        updatedAtMs: Date.now(),
        updatedByEmail: 'Admin LiveOps',
      });
      writeServerLiveOpsConfig(sanitized);
      res.json({ ok: true, config: sanitized });
    } catch (err) {
      handleApiError(res, err);
    }
  });

  app.get(
    '/api/admin/security-anomalies',
    createApiRateLimitMiddleware({
      scope: 'admin-security',
      maxRequests: 60,
      windowMs: 60_000,
      onRateLimited: recordApiRateLimit,
    }),
    async (req, res) => {
      try {
        const user = await resolveBearerUser(req);
        if (!user) {
          securityAnomalies.record({
            category: 'auth_invalid',
            scope: 'api:admin:security-anomalies',
            actor: req.ip || 'unknown',
            detail: 'Missing or invalid Bearer token on GET /api/admin/security-anomalies',
          });
          res.status(401).json({
            error: 'AUTH_REQUIRED',
            message: 'Cần đăng nhập tài khoản quản trị để xem giám sát an ninh.',
          });
          return;
        }
        const rawAuthHeader = req.headers.authorization;
        const bearerToken =
          typeof rawAuthHeader === 'string' && rawAuthHeader.startsWith('Bearer ')
            ? rawAuthHeader.slice('Bearer '.length).trim()
            : '';
        const isGoogleAdmin = isVerifiedAdminClaims({
          email: user.email,
          emailVerified: user.emailVerified,
        });
        const isLinkedWorkerAdmin =
          !isGoogleAdmin && bearerToken.length > 0 && (await verifyWorkerAdminSession(bearerToken));
        if (!isGoogleAdmin && !isLinkedWorkerAdmin) {
          securityAnomalies.record({
            category: 'admin_denied',
            scope: 'api:admin:security-anomalies',
            actor: user.email || user.uid || 'unknown',
            detail: 'Non-admin attempted GET /api/admin/security-anomalies',
          });
          res.status(403).json({
            error: 'ADMIN_FORBIDDEN',
            message: 'Tài khoản này không có quyền xem nhật ký an ninh máy chủ.',
          });
          return;
        }
        const limitRaw = Number(req.query.limit ?? 25);
        const limit = Number.isFinite(limitRaw) ? Math.max(1, Math.min(100, Math.round(limitRaw))) : 25;
        res.setHeader('Cache-Control', 'no-store');
        res.json({
          ok: true,
          summary: securityAnomalies.getSummary(),
          recent: securityAnomalies.getRecent(limit),
        });
      } catch (err) {
        handleApiError(res, err);
      }
    }
  );

  app.get(
    '/api/live-ai/snapshot',
    createApiRateLimitMiddleware({
      scope: 'live-ai',
      maxRequests: 120,
      windowMs: 60_000,
      onRateLimited: recordApiRateLimit,
    }),
    (_req, res) => {
      const humanCount = wsHub ? Math.max(1, wsHub.wss.clients.size) : 1;
      res.json(liveAiService.getSnapshot(humanCount));
    }
  );

  app.use(
    '/api/ai/nvidia',
    createApiRateLimitMiddleware({
      scope: 'nvidia-ai',
      maxRequests: 30,
      windowMs: 60_000,
      onRateLimited: recordApiRateLimit,
    }),
    createNvidiaAiRouter(nvidiaAiService, liveAiService)
  );

  app.post(
    '/api/runs/verify',
    createApiRateLimitMiddleware({
      scope: 'runs-verify',
      maxRequests: 45,
      windowMs: 60_000,
      onRateLimited: recordApiRateLimit,
    }),
    async (req, res) => {
      try {
        let actorLabel = req.ip || 'anonymous';
        const authHeader = req.headers.authorization;
        if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
          try {
            const verifiedUser = await resolveBearerUser(req);
            if (verifiedUser) {
              actorLabel = verifiedUser.email || verifiedUser.uid;
            }
          } catch {
            securityAnomalies.record({
              category: 'auth_invalid',
              scope: 'api:runs:verify',
              actor: actorLabel,
              detail: 'Invalid Bearer token submitted to POST /api/runs/verify',
            });
            res.status(401).json({
              ok: false,
              error: 'AUTH_INVALID',
              message: 'Phiên đăng nhập không hợp lệ.',
            });
            return;
          }
        }

        const body = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
        if (!body) {
          res.status(400).json({ ok: false, error: 'INVALID_BODY' });
          return;
        }

        const nonceVerdict = runNonceReplayGuard.consume(body.runNonce);
        if (!nonceVerdict.accepted) {
          securityAnomalies.record({
            category: 'run_integrity_flagged',
            scope: 'api:runs:verify',
            actor: actorLabel,
            detail:
              nonceVerdict.reason === 'replay_detected'
                ? `Duplicate runNonce replay blocked (${String(body.runNonce ?? '').slice(0, 32)})`
                : 'Invalid or missing runNonce on POST /api/runs/verify',
          });
          res.status(nonceVerdict.reason === 'replay_detected' ? 409 : 400).json({
            ok: false,
            verdict: 'rejected',
            anomalies: [nonceVerdict.reason === 'replay_detected' ? 'replay_nonce' : 'invalid_payload'],
          });
          return;
        }

        const liveCfg = readServerLiveOpsConfig();
        const reportInput: RunIntegrityReportInput = {
          runNonce: String(body.runNonce),
          mode: body.mode as RunIntegrityReportInput['mode'],
          chapterId: Number(body.chapterId),
          stageReached: Number(body.stageReached),
          victory: Boolean(body.victory),
          kills: Number(body.kills),
          durationSec: Number(body.durationSec),
          basePowerRating: Number(body.basePowerRating),
          totalDamageDealt:
            body.totalDamageDealt !== undefined ? Number(body.totalDamageDealt) : undefined,
          peakDps: body.peakDps !== undefined ? Number(body.peakDps) : undefined,
          claimedGold: Number(body.claimedGold),
          claimedGems: Number(body.claimedGems),
          claimedSeasonXp: Number(body.claimedSeasonXp),
          nightmareTier: body.nightmareTier !== undefined ? Number(body.nightmareTier) : 0,
          // Authoritative server-side LiveOps multipliers (never trust client-supplied multipliers)
          liveOpsGoldMult: liveCfg.goldRewardMult * (liveCfg.weekendBlitzEnabled ? 1.15 : 1),
          liveOpsGemMult: liveCfg.gemRewardMult,
        };

        const verdict = verifyCombatRunIntegrity(reportInput);
        if (!verdict.ok) {
          securityAnomalies.record({
            category: 'run_integrity_flagged',
            scope: `run:${String(reportInput.mode)}`,
            actor: actorLabel,
            detail: `${verdict.verdict.toUpperCase()} ch=${reportInput.chapterId} st=${reportInput.stageReached} flags=${verdict.anomalies.join(',')}`,
          });
        }

        res.setHeader('Cache-Control', 'no-store');
        res.json({
          ok: verdict.ok,
          verdict: verdict.verdict,
          anomalies: verdict.anomalies,
          sanitizedRewards: verdict.sanitizedRewards,
        });
      } catch (err) {
        handleApiError(res, err);
      }
    }
  );

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      mode: process.env.NODE_ENV || 'development',
      wsClients: wsHub?.wss.clients.size ?? 0,
    });
  });

  app.use(
    '/api/assets',
    createApiRateLimitMiddleware({
      scope: 'assets',
      maxRequests: 240,
      windowMs: 60_000,
      onRateLimited: recordApiRateLimit,
    })
  );

  // Stream the uncompressed 90.3 MB Chapter 1 GLB map in <= 6 MiB byte chunks so
  // every HTTP/1.1 response stays safely under Cloud Run's 32 MiB response limit.
  const CHAPTER1_MAP_DEFAULT_CHUNK_BYTES = 6 * 1024 * 1024;
  const CHAPTER1_MAP_MAX_CHUNK_BYTES = 12 * 1024 * 1024;
  const resolveChapter1MapFile = (): {
    filePath: string;
    stat: fs.Stats;
    variant: 'full' | 'lite-fallback';
  } | null => {
    const candidates: Array<{ filePath: string; variant: 'full' | 'lite-fallback' }> = [
      {
        filePath: path.resolve(__dirname, 'public', 'assets', 'Chương 1', 'Map mới', 'Chương 1.glb'),
        variant: 'full',
      },
      {
        filePath: path.resolve(__dirname, 'dist', 'assets', 'Chương 1', 'Map mới', 'Chương 1.glb'),
        variant: 'full',
      },
      {
        filePath: path.resolve(__dirname, 'public', 'assets', 'Chương 1', 'Map mới', 'Chương 1 Lite.glb'),
        variant: 'lite-fallback',
      },
      {
        filePath: path.resolve(__dirname, 'dist', 'assets', 'Chương 1', 'Map mới', 'Chương 1 Lite.glb'),
        variant: 'lite-fallback',
      },
    ];
    for (const candidate of candidates) {
      try {
        const stat = fs.statSync(candidate.filePath);
        if (stat.isFile() && stat.size > 0) {
          return { filePath: candidate.filePath, stat, variant: candidate.variant };
        }
      } catch {
        // Try next candidate
      }
    }
    return null;
  };

  app.get('/api/assets/chapter1-map/meta', (_req, res) => {
    const resolved = resolveChapter1MapFile();
    if (!resolved) {
      res.status(404).json({ error: 'CHAPTER1_MAP_NOT_FOUND' });
      return;
    }
    const etag = `"${resolved.stat.size}-${Math.floor(resolved.stat.mtimeMs)}"`;
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('ETag', etag);
    res.json({
      size: resolved.stat.size,
      chunkSize: CHAPTER1_MAP_DEFAULT_CHUNK_BYTES,
      etag,
      variant: resolved.variant,
    });
  });

  app.get('/api/assets/chapter1-map/chunk', (req, res) => {
    const resolved = resolveChapter1MapFile();
    if (!resolved) {
      res.status(404).json({ error: 'CHAPTER1_MAP_NOT_FOUND' });
      return;
    }
    const totalSize = resolved.stat.size;
    const start = Number(req.query.start);
    const end = Number(req.query.end);
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      end < start ||
      end >= totalSize
    ) {
      res.status(400).json({ error: 'INVALID_BYTE_RANGE', totalSize });
      return;
    }
    const byteLength = end - start + 1;
    if (byteLength > CHAPTER1_MAP_MAX_CHUNK_BYTES) {
      res.status(400).json({
        error: 'CHUNK_TOO_LARGE',
        maxChunkBytes: CHAPTER1_MAP_MAX_CHUNK_BYTES,
      });
      return;
    }
    const etag = `"${totalSize}-${Math.floor(resolved.stat.mtimeMs)}-${start}-${end}"`;
    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Length', String(byteLength));
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('ETag', etag);
    res.setHeader('X-Chapter1-Total-Bytes', String(totalSize));

    const stream = fs.createReadStream(resolved.filePath, { start, end });
    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(500).end();
      } else {
        res.destroy();
      }
    });
    res.on('close', () => {
      stream.destroy();
    });
    stream.pipe(res);
  });

  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(
      express.static(distDir, {
        maxAge: '7d',
        setHeaders(res, filePath) {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      })
    );
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/') || req.path.startsWith('/ws/')) return next();
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const httpServer = http.createServer(app);
  wsHub = attachLiveAiWebSocketServer(httpServer, liveAiService, {
    nvidiaAiService,
  });

  const port = Number(process.env.PORT) || 3000;
  httpServer.listen(port, '0.0.0.0', () => {
    console.log(
      `Artemis 3D server + Live AI WebSocket listening on http://0.0.0.0:${port} (${isProd ? 'production' : 'development'})`
    );
  });
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);
if (isDirectRun) {
  void startServer();
}

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
export function attachLiveAiWebSocketServer(
  server: http.Server,
  liveAiService: LiveAiPlayersService,
  options?: { tickIntervalMs?: number; chatReplyDelayMs?: number }
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
            const reply = liveAiService.generateContextualAiChatReply({
              channel,
              senderName,
              userText: text,
            });
            broadcast({
              type: 'chat:message',
              payload: reply,
            });
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
      // Every 5th server tick (~22s), an [AI Live] player posts an organic Lobby/Guild chat note
      if (wsTickCount % 5 === 0) {
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
  wsHub = attachLiveAiWebSocketServer(httpServer, liveAiService);

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

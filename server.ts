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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  const wss = new WebSocketServer({ server, path: '/ws/live-ai' });
  const clientNames = new Map<WebSocket, string>();
  const clientLastChatAt = new Map<WebSocket, number>();
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
    clientNames.set(ws, 'Chiến Binh Tinh Giới');
    emitSnapshotTo(ws);

    ws.on('message', (raw) => {
      try {
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
          const durationSec = Math.max(1, Number(payload.durationSec ?? 15));
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
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          const damage = Number(payload.damage ?? 0);
          const heroId = typeof payload.heroId === 'string' ? payload.heroId : 'artemis';
          if (!Number.isFinite(damage) || damage <= 0) return;
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
          const playerName = sanitizeServerDisplayName(
            payload.playerName ?? clientNames.get(ws)
          );
          const points = Number(payload.points ?? 0);
          const heroId = typeof payload.heroId === 'string' ? payload.heroId : 'artemis';
          const sourceLabel =
            typeof payload.sourceLabel === 'string'
              ? payload.sourceLabel.slice(0, 48)
              : undefined;
          if (!Number.isFinite(points) || points <= 0) return;
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
        }
      } catch {
        // Ignore malformed frames safely
      }
    });

    ws.on('close', () => {
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
  app.use(express.json({ limit: '128kb' }));

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
  app.use('/api/weekly-boss', createWeeklyBossRouter(weeklyBossService));

  app.get('/api/live-ai/snapshot', (_req, res) => {
    const humanCount = wsHub ? Math.max(1, wsHub.wss.clients.size) : 1;
    res.json(liveAiService.getSnapshot(humanCount));
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      ok: true,
      mode: process.env.NODE_ENV || 'development',
      wsClients: wsHub?.wss.clients.size ?? 0,
    });
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

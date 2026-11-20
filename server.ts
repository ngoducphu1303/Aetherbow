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
  options?: { tickIntervalMs?: number }
): LiveAiWsHubHandle {
  const wss = new WebSocketServer({ server, path: '/ws/live-ai' });
  const clientNames = new Map<WebSocket, string>();

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
    sendJson(ws, {
      type: 'hub:snapshot',
      payload: liveAiService.getSnapshot(wss.clients.size),
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

        if (type === 'duel:complete') {
          const duelId = String(payload.duelId ?? '').trim();
          const aiPlayerId = String(payload.aiPlayerId ?? '').trim();
          const challengerName = sanitizeServerDisplayName(
            payload.challengerName ?? clientNames.get(ws)
          );
          const playerWon = Boolean(payload.playerWon);
          const durationSec = Math.max(1, Number(payload.durationSec ?? 15));
          if (!duelId || !aiPlayerId) return;

          const res = liveAiService.completeDuel({
            duelId,
            aiPlayerId,
            challengerName,
            playerWon,
            durationSec,
          });
          sendJson(ws, {
            type: 'duel:result_ack',
            payload: {
              duelId,
              alreadyProcessed: res.alreadyProcessed,
              ratingDelta: res.ratingDelta,
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
        }
      } catch {
        // Ignore malformed frames safely
      }
    });

    ws.on('close', () => {
      clientNames.delete(ws);
    });
  });

  const tickIntervalMs = options?.tickIntervalMs ?? 4500;
  const timer = setInterval(() => {
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

import type {
  AiLiveActivityEvent,
  AiLiveHubSnapshot,
  AiLivePlayerProfile,
} from '../types/game';
import type { WeeklyBossLeaderboardEntry } from '../data/weeklyBossData';

export type LiveSocketStatus = 'connecting' | 'connected' | 'reconnecting' | 'offline';

export interface WeeklyBossLiveRankUpdate {
  weekId: string;
  displayName: string;
  rank: number;
  verifiedScore: number;
  cleared: boolean;
  leaderboard: WeeklyBossLeaderboardEntry[];
  event?: AiLiveActivityEvent;
}

export interface LiveDuelAcceptedPayload {
  duelId: string;
  opponent: AiLivePlayerProfile;
}

export interface LiveDuelResultAckPayload {
  duelId: string;
  alreadyProcessed: boolean;
  ratingDelta: number;
  opponent: AiLivePlayerProfile | null;
}

type SnapshotListener = (snapshot: AiLiveHubSnapshot, status: LiveSocketStatus) => void;
type WeeklyRankListener = (update: WeeklyBossLiveRankUpdate) => void;
type DuelAcceptedListener = (payload: LiveDuelAcceptedPayload) => void;
type DuelResultAckListener = (payload: LiveDuelResultAckPayload) => void;

class LiveAiSocketClient {
  private ws: WebSocket | null = null;
  private status: LiveSocketStatus = 'offline';
  private snapshot: AiLiveHubSnapshot | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private announcedDisplayName = 'Chiến Binh Tinh Giới';
  private started = false;

  private snapshotListeners = new Set<SnapshotListener>();
  private weeklyRankListeners = new Set<WeeklyRankListener>();
  private duelAcceptedListeners = new Set<DuelAcceptedListener>();
  private duelResultAckListeners = new Set<DuelResultAckListener>();

  public getStatus(): LiveSocketStatus {
    return this.status;
  }

  public getSnapshot(): AiLiveHubSnapshot | null {
    return this.snapshot;
  }

  public ensureConnected(displayName?: string): void {
    if (displayName && displayName.trim().length >= 2) {
      this.announcedDisplayName = displayName.trim().slice(0, 24);
    }
    if (typeof window === 'undefined') return;
    if (!this.started) {
      this.started = true;
      void this.fetchInitialRestFallback();
      this.connect();
    } else if (this.ws && this.ws.readyState === WebSocket.OPEN && displayName) {
      this.send({
        type: 'presence:announce',
        payload: { displayName: this.announcedDisplayName },
      });
    }
  }

  private async fetchInitialRestFallback(): Promise<void> {
    try {
      const res = await fetch('/api/live-ai/snapshot');
      if (!res.ok) return;
      const data = (await res.json()) as AiLiveHubSnapshot;
      if (!this.snapshot && data && Array.isArray(data.players)) {
        this.snapshot = data;
        this.emitSnapshot();
      }
    } catch {
      // WebSocket connection will populate once ready
    }
  }

  private connect(): void {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/live-ai`;
    this.status = this.reconnectAttempt > 0 ? 'reconnecting' : 'connecting';
    this.emitSnapshot();

    try {
      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        this.reconnectAttempt = 0;
        this.status = 'connected';
        this.send({
          type: 'presence:announce',
          payload: { displayName: this.announcedDisplayName },
        });
        this.emitSnapshot();
      };

      socket.onmessage = (ev) => {
        try {
          const msg = JSON.parse(String(ev.data)) as {
            type?: string;
            payload?: unknown;
          };
          if (msg.type === 'hub:snapshot' && msg.payload) {
            this.snapshot = msg.payload as AiLiveHubSnapshot;
            this.emitSnapshot();
            return;
          }
          if (msg.type === 'hub:activity' && msg.payload) {
            const data = msg.payload as {
              event: AiLiveActivityEvent;
              updatedPlayer: AiLivePlayerProfile;
              onlineHumanCount: number;
            };
            if (this.snapshot) {
              const nextPlayers = this.snapshot.players.map((p) =>
                p.id === data.updatedPlayer.id ? data.updatedPlayer : p
              );
              const dedupedActivities = [
                data.event,
                ...this.snapshot.activities.filter((a) => a.id !== data.event.id),
              ].slice(0, 20);
              this.snapshot = {
                ...this.snapshot,
                serverNow: Date.now(),
                onlineHumanCount: Math.max(1, data.onlineHumanCount),
                players: nextPlayers,
                activities: dedupedActivities,
              };
              this.emitSnapshot();
            }
            return;
          }
          if (msg.type === 'weekly_boss:rank_update' && msg.payload) {
            const update = msg.payload as WeeklyBossLiveRankUpdate;
            if (update.event && this.snapshot) {
              this.snapshot = {
                ...this.snapshot,
                activities: [
                  update.event,
                  ...this.snapshot.activities.filter((a) => a.id !== update.event!.id),
                ].slice(0, 20),
              };
              this.emitSnapshot();
            }
            for (const cb of this.weeklyRankListeners) cb(update);
            return;
          }
          if (msg.type === 'duel:accepted' && msg.payload) {
            const accepted = msg.payload as LiveDuelAcceptedPayload;
            for (const cb of this.duelAcceptedListeners) cb(accepted);
            return;
          }
          if (msg.type === 'duel:result_ack' && msg.payload) {
            const ack = msg.payload as LiveDuelResultAckPayload;
            for (const cb of this.duelResultAckListeners) cb(ack);
          }
        } catch {
          // Ignore invalid JSON message
        }
      };

      socket.onclose = () => {
        this.ws = null;
        this.status = 'reconnecting';
        this.emitSnapshot();
        this.scheduleReconnect();
      };

      socket.onerror = () => {
        try {
          socket.close();
        } catch {
          // ignore
        }
      };
    } catch {
      this.status = 'offline';
      this.emitSnapshot();
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer !== null) return;
    this.reconnectAttempt += 1;
    const delayMs = Math.min(12_000, 1200 * Math.pow(1.6, Math.min(5, this.reconnectAttempt - 1)));
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delayMs);
  }

  private send(msg: unknown): boolean {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
      return true;
    }
    return false;
  }

  private emitSnapshot(): void {
    if (!this.snapshot) return;
    for (const cb of this.snapshotListeners) {
      cb(this.snapshot, this.status);
    }
  }

  public subscribeSnapshot(cb: SnapshotListener): () => void {
    this.snapshotListeners.add(cb);
    if (this.snapshot) {
      cb(this.snapshot, this.status);
    }
    return () => {
      this.snapshotListeners.delete(cb);
    };
  }

  public subscribeWeeklyRankUpdates(cb: WeeklyRankListener): () => void {
    this.weeklyRankListeners.add(cb);
    return () => {
      this.weeklyRankListeners.delete(cb);
    };
  }

  public subscribeDuelAccepted(cb: DuelAcceptedListener): () => void {
    this.duelAcceptedListeners.add(cb);
    return () => {
      this.duelAcceptedListeners.delete(cb);
    };
  }

  public subscribeDuelResultAck(cb: DuelResultAckListener): () => void {
    this.duelResultAckListeners.add(cb);
    return () => {
      this.duelResultAckListeners.delete(cb);
    };
  }

  public challengeAiPlayer(aiPlayerId: string, challengerName: string): boolean {
    this.ensureConnected(challengerName);
    return this.send({
      type: 'duel:challenge',
      payload: { aiPlayerId, challengerName },
    });
  }

  public reportDuelComplete(params: {
    duelId: string;
    aiPlayerId: string;
    challengerName: string;
    playerWon: boolean;
    durationSec: number;
  }): boolean {
    return this.send({
      type: 'duel:complete',
      payload: params,
    });
  }
}

export const liveAiSocket = new LiveAiSocketClient();

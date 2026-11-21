import type {
  AiAdaptationSummarySnapshot,
  AiLiveActivityEvent,
  AiLiveAuctionBidEvent,
  AiLiveAuctionSyncLot,
  AiLiveChatChannel,
  AiLiveChatMessage,
  AiLiveHubSnapshot,
  AiLiveInvite,
  AiLivePlayerProfile,
  AiRivalRecord,
  HeroId,
  LiveGuildBossState,
  LiveGuildWarSnapshot,
  LiveMiniCupState,
  LiveServerBountyState,
  LiveSpectatorMatchSnapshot,
} from '../types/game';
import type {
  GuildWarBastionId,
  PlayerCombatTelemetryInput,
} from '../engine/wave10FivePillars';
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
  rivals?: AiRivalRecord[];
}

export interface LiveInviteAckPayload {
  inviteId: string;
  action: 'accept' | 'decline';
  ok: boolean;
  alreadyProcessed: boolean;
  invite: AiLiveInvite | null;
  duelId?: string;
  opponent?: AiLivePlayerProfile;
}

export interface LiveRivalBountyAckPayload {
  ok: boolean;
  alreadyClaimed: boolean;
  goldReward: number;
  gemsReward: number;
  rival: AiRivalRecord | null;
  message: string;
  rivals?: AiRivalRecord[];
}

export interface LiveGuildBossClaimAckPayload {
  ok: boolean;
  alreadyClaimed: boolean;
  goldReward: number;
  gemsReward: number;
  guildCoinsReward: number;
  message: string;
  state: LiveGuildBossState;
}

export interface LiveMiniCupPrizeAckPayload {
  ok: boolean;
  alreadyClaimed: boolean;
  goldReward: number;
  gemsReward: number;
  titleLabel?: string;
  cup: LiveMiniCupState | null;
  message: string;
}

export interface LiveServerBountyClaimAckPayload {
  ok: boolean;
  alreadyClaimed: boolean;
  goldReward: number;
  gemsReward: number;
  starDustReward: number;
  message: string;
  state: LiveServerBountyState;
}

export interface LiveGuildWarClaimAckPayload {
  ok: boolean;
  alreadyClaimed: boolean;
  goldReward: number;
  gemsReward: number;
  guildCoinsReward: number;
  starDustReward: number;
  message: string;
  state: LiveGuildWarSnapshot;
}

export interface LiveSpectatorCheerAckPayload {
  ok: boolean;
  message: string;
  state: LiveSpectatorMatchSnapshot;
}

export interface LiveSpectatorClaimAckPayload {
  ok: boolean;
  alreadyClaimed: boolean;
  predictedCorrectly: boolean;
  goldReward: number;
  gemsReward: number;
  starDustReward: number;
  message: string;
  state: LiveSpectatorMatchSnapshot;
}

type SnapshotListener = (snapshot: AiLiveHubSnapshot, status: LiveSocketStatus) => void;
type WeeklyRankListener = (update: WeeklyBossLiveRankUpdate) => void;
type DuelAcceptedListener = (payload: LiveDuelAcceptedPayload) => void;
type DuelResultAckListener = (payload: LiveDuelResultAckPayload) => void;
type AuctionBidListener = (event: AiLiveAuctionBidEvent) => void;
type ChatListener = (channels: { lobby: AiLiveChatMessage[]; guild: AiLiveChatMessage[] }) => void;
type InviteListener = (invite: AiLiveInvite) => void;
type InviteAckListener = (ack: LiveInviteAckPayload) => void;
type RivalBountyAckListener = (ack: LiveRivalBountyAckPayload) => void;
type RivalRevengeChallengeListener = (payload: {
  invite: AiLiveInvite;
  rival: AiRivalRecord | null;
  rivals?: AiRivalRecord[];
}) => void;
type GuildBossClaimAckListener = (ack: LiveGuildBossClaimAckPayload) => void;
type MiniCupPrizeAckListener = (ack: LiveMiniCupPrizeAckPayload) => void;
type ServerBountyClaimAckListener = (ack: LiveServerBountyClaimAckPayload) => void;
type GuildWarClaimAckListener = (ack: LiveGuildWarClaimAckPayload) => void;
type SpectatorCheerAckListener = (ack: LiveSpectatorCheerAckPayload) => void;
type SpectatorClaimAckListener = (ack: LiveSpectatorClaimAckPayload) => void;

class LiveAiSocketClient {
  private ws: WebSocket | null = null;
  private status: LiveSocketStatus = 'offline';
  private snapshot: AiLiveHubSnapshot | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: number | null = null;
  private announcedDisplayName = 'Chiến Binh Tinh Giới';
  private started = false;
  private recentAuctionEvents: AiLiveAuctionBidEvent[] = [];
  private chatChannels: { lobby: AiLiveChatMessage[]; guild: AiLiveChatMessage[] } = {
    lobby: [],
    guild: [],
  };

  private snapshotListeners = new Set<SnapshotListener>();
  private weeklyRankListeners = new Set<WeeklyRankListener>();
  private duelAcceptedListeners = new Set<DuelAcceptedListener>();
  private duelResultAckListeners = new Set<DuelResultAckListener>();
  private auctionBidListeners = new Set<AuctionBidListener>();
  private chatListeners = new Set<ChatListener>();
  private inviteListeners = new Set<InviteListener>();
  private inviteAckListeners = new Set<InviteAckListener>();
  private rivalBountyAckListeners = new Set<RivalBountyAckListener>();
  private rivalRevengeListeners = new Set<RivalRevengeChallengeListener>();
  private guildBossClaimAckListeners = new Set<GuildBossClaimAckListener>();
  private miniCupPrizeAckListeners = new Set<MiniCupPrizeAckListener>();
  private serverBountyClaimAckListeners = new Set<ServerBountyClaimAckListener>();
  private guildWarClaimAckListeners = new Set<GuildWarClaimAckListener>();
  private spectatorCheerAckListeners = new Set<SpectatorCheerAckListener>();
  private spectatorClaimAckListeners = new Set<SpectatorClaimAckListener>();

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
        this.mergeChatHistory(data.chatHistory);
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
            this.mergeChatHistory(this.snapshot.chatHistory);
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
            if (ack.rivals && this.snapshot) {
              this.snapshot = { ...this.snapshot, rivals: ack.rivals };
              this.emitSnapshot();
            }
            for (const cb of this.duelResultAckListeners) cb(ack);
            return;
          }
          if (msg.type === 'auction:bid_event' && msg.payload) {
            const evt = msg.payload as AiLiveAuctionBidEvent;
            this.recentAuctionEvents = [
              evt,
              ...this.recentAuctionEvents.filter((e) => e.eventId !== evt.eventId),
            ].slice(0, 12);
            for (const cb of this.auctionBidListeners) cb(evt);
            return;
          }
          if (msg.type === 'chat:message' && msg.payload) {
            const chatMsg = msg.payload as AiLiveChatMessage;
            this.appendChatMessage(chatMsg);
            return;
          }
          if (msg.type === 'invite:received' && msg.payload) {
            const invite = msg.payload as AiLiveInvite;
            for (const cb of this.inviteListeners) cb(invite);
            return;
          }
          if (msg.type === 'invite:ack' && msg.payload) {
            const ack = msg.payload as LiveInviteAckPayload;
            for (const cb of this.inviteAckListeners) cb(ack);
            return;
          }
          if (msg.type === 'rival:bounty_ack' && msg.payload) {
            const ack = msg.payload as LiveRivalBountyAckPayload;
            if (ack.rivals && this.snapshot) {
              this.snapshot = { ...this.snapshot, rivals: ack.rivals };
              this.emitSnapshot();
            }
            for (const cb of this.rivalBountyAckListeners) cb(ack);
            return;
          }
          if (msg.type === 'rival:revenge_challenge' && msg.payload) {
            const data = msg.payload as {
              invite: AiLiveInvite;
              rival: AiRivalRecord | null;
              rivals?: AiRivalRecord[];
            };
            if (data.rivals && this.snapshot) {
              this.snapshot = { ...this.snapshot, rivals: data.rivals };
              this.emitSnapshot();
            }
            for (const cb of this.rivalRevengeListeners) cb(data);
            return;
          }
          if (msg.type === 'ai:adaptation_update' && msg.payload) {
            const data = msg.payload as {
              adaptationProfile: AiAdaptationSummarySnapshot | null;
            };
            if (this.snapshot) {
              this.snapshot = {
                ...this.snapshot,
                adaptationProfile: data.adaptationProfile ?? null,
              };
              this.emitSnapshot();
            }
            return;
          }
          if (msg.type === 'guild_war:update' && msg.payload) {
            const data = msg.payload as {
              guildWarLive: LiveGuildWarSnapshot;
              event?: AiLiveActivityEvent;
            };
            if (this.snapshot && data.guildWarLive) {
              const dedupedActivities = data.event
                ? [
                    data.event,
                    ...this.snapshot.activities.filter((a) => a.id !== data.event!.id),
                  ].slice(0, 20)
                : this.snapshot.activities;
              this.snapshot = {
                ...this.snapshot,
                guildWarLive: data.guildWarLive,
                activities: dedupedActivities,
              };
              this.emitSnapshot();
            }
            return;
          }
          if (msg.type === 'guild_war:claim_ack' && msg.payload) {
            const ack = msg.payload as LiveGuildWarClaimAckPayload;
            if (this.snapshot && ack.state) {
              this.snapshot = {
                ...this.snapshot,
                guildWarLive: ack.state,
              };
              this.emitSnapshot();
            }
            for (const cb of this.guildWarClaimAckListeners) cb(ack);
            return;
          }
          if (msg.type === 'spectator:update' && msg.payload) {
            const data = msg.payload as {
              spectatorMatch: LiveSpectatorMatchSnapshot;
            };
            if (this.snapshot && data.spectatorMatch) {
              this.snapshot = {
                ...this.snapshot,
                spectatorMatch: data.spectatorMatch,
              };
              this.emitSnapshot();
            }
            return;
          }
          if (msg.type === 'spectator:cheer_ack' && msg.payload) {
            const ack = msg.payload as LiveSpectatorCheerAckPayload;
            if (this.snapshot && ack.state) {
              this.snapshot = {
                ...this.snapshot,
                spectatorMatch: ack.state,
              };
              this.emitSnapshot();
            }
            for (const cb of this.spectatorCheerAckListeners) cb(ack);
            return;
          }
          if (msg.type === 'spectator:claim_ack' && msg.payload) {
            const ack = msg.payload as LiveSpectatorClaimAckPayload;
            if (this.snapshot && ack.state) {
              this.snapshot = {
                ...this.snapshot,
                spectatorMatch: ack.state,
              };
              this.emitSnapshot();
            }
            for (const cb of this.spectatorClaimAckListeners) cb(ack);
            return;
          }
          if (msg.type === 'guild_boss:update' && msg.payload) {
            const data = msg.payload as {
              guildBossLive: LiveGuildBossState;
              event?: AiLiveActivityEvent;
            };
            if (this.snapshot && data.guildBossLive) {
              this.snapshot = {
                ...this.snapshot,
                guildBossLive: data.guildBossLive,
                activities: data.event
                  ? [
                      data.event,
                      ...this.snapshot.activities.filter((a) => a.id !== data.event!.id),
                    ].slice(0, 20)
                  : this.snapshot.activities,
              };
              this.emitSnapshot();
            }
            return;
          }
          if (msg.type === 'guild_boss:claim_ack' && msg.payload) {
            const ack = msg.payload as LiveGuildBossClaimAckPayload;
            if (this.snapshot && ack.state) {
              this.snapshot = { ...this.snapshot, guildBossLive: ack.state };
              this.emitSnapshot();
            }
            for (const cb of this.guildBossClaimAckListeners) cb(ack);
            return;
          }
          if (msg.type === 'cup:state' && msg.payload) {
            const data = msg.payload as {
              cup: LiveMiniCupState | null;
              rivals?: AiRivalRecord[];
            };
            if (this.snapshot) {
              this.snapshot = {
                ...this.snapshot,
                miniCup: data.cup,
                rivals: data.rivals ?? this.snapshot.rivals,
              };
              this.emitSnapshot();
            }
            return;
          }
          if (msg.type === 'cup:prize_ack' && msg.payload) {
            const ack = msg.payload as LiveMiniCupPrizeAckPayload;
            if (this.snapshot && ack.cup) {
              this.snapshot = { ...this.snapshot, miniCup: ack.cup };
              this.emitSnapshot();
            }
            for (const cb of this.miniCupPrizeAckListeners) cb(ack);
            return;
          }
          if (msg.type === 'bounty:update' && msg.payload) {
            const data = msg.payload as {
              serverBounty: LiveServerBountyState;
              event?: AiLiveActivityEvent;
            };
            if (this.snapshot && data.serverBounty) {
              this.snapshot = {
                ...this.snapshot,
                serverBounty: data.serverBounty,
                activities: data.event
                  ? [
                      data.event,
                      ...this.snapshot.activities.filter((a) => a.id !== data.event!.id),
                    ].slice(0, 20)
                  : this.snapshot.activities,
              };
              this.emitSnapshot();
            }
            return;
          }
          if (msg.type === 'bounty:claim_ack' && msg.payload) {
            const ack = msg.payload as LiveServerBountyClaimAckPayload;
            if (this.snapshot && ack.state) {
              this.snapshot = { ...this.snapshot, serverBounty: ack.state };
              this.emitSnapshot();
            }
            for (const cb of this.serverBountyClaimAckListeners) cb(ack);
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

  public subscribeAuctionEvents(cb: AuctionBidListener): () => void {
    this.auctionBidListeners.add(cb);
    return () => {
      this.auctionBidListeners.delete(cb);
    };
  }

  private mergeChatHistory(history?: {
    lobby: AiLiveChatMessage[];
    guild: AiLiveChatMessage[];
  }): void {
    if (!history) return;
    let changed = false;
    for (const channel of ['lobby', 'guild'] as const) {
      const incoming = history[channel] ?? [];
      if (incoming.length === 0) continue;
      const byId = new Map<string, AiLiveChatMessage>();
      for (const m of this.chatChannels[channel]) byId.set(m.id, m);
      for (const m of incoming) {
        if (!byId.has(m.id)) {
          byId.set(m.id, m);
          changed = true;
        }
      }
      this.chatChannels[channel] = Array.from(byId.values())
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-40);
    }
    if (changed) this.emitChat();
  }

  private appendChatMessage(msg: AiLiveChatMessage): void {
    const channel: AiLiveChatChannel = msg.channel === 'guild' ? 'guild' : 'lobby';
    if (this.chatChannels[channel].some((m) => m.id === msg.id)) return;
    this.chatChannels[channel] = [...this.chatChannels[channel], msg].slice(-40);
    this.emitChat();
  }

  private emitChat(): void {
    const payload = {
      lobby: this.chatChannels.lobby,
      guild: this.chatChannels.guild,
    };
    for (const cb of this.chatListeners) cb(payload);
  }

  public getChatMessages(): { lobby: AiLiveChatMessage[]; guild: AiLiveChatMessage[] } {
    return {
      lobby: this.chatChannels.lobby,
      guild: this.chatChannels.guild,
    };
  }

  public subscribeChat(cb: ChatListener): () => void {
    this.chatListeners.add(cb);
    cb(this.getChatMessages());
    return () => {
      this.chatListeners.delete(cb);
    };
  }

  public sendChatMessage(
    channel: AiLiveChatChannel,
    text: string,
    senderName?: string
  ): boolean {
    const clean = text.replace(/\s+/g, ' ').trim().slice(0, 180);
    if (!clean) return false;
    this.ensureConnected(senderName);
    return this.send({
      type: 'chat:send',
      payload: {
        channel,
        text: clean,
        senderName: senderName || this.announcedDisplayName,
      },
    });
  }

  public getRecentAuctionEvents(): AiLiveAuctionBidEvent[] {
    return this.recentAuctionEvents;
  }

  public syncAuctionLots(
    lots: AiLiveAuctionSyncLot[],
    options?: { requestImmediateEvaluation?: boolean; focusLotId?: string }
  ): boolean {
    return this.send({
      type: 'auction:sync_lots',
      payload: {
        lots,
        requestImmediateEvaluation: Boolean(options?.requestImmediateEvaluation),
        focusLotId: options?.focusLotId,
      },
    });
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
    aiDuelTier?: 'challenger' | 'master' | 'sovereign' | 'mythic';
  }): boolean {
    return this.send({
      type: 'duel:complete',
      payload: params,
    });
  }

  public subscribeInvites(cb: InviteListener): () => void {
    this.inviteListeners.add(cb);
    return () => {
      this.inviteListeners.delete(cb);
    };
  }

  public subscribeInviteAck(cb: InviteAckListener): () => void {
    this.inviteAckListeners.add(cb);
    return () => {
      this.inviteAckListeners.delete(cb);
    };
  }

  public subscribeRivalBountyAck(cb: RivalBountyAckListener): () => void {
    this.rivalBountyAckListeners.add(cb);
    return () => {
      this.rivalBountyAckListeners.delete(cb);
    };
  }

  public respondToInvite(
    inviteId: string,
    action: 'accept' | 'decline',
    playerName?: string
  ): boolean {
    return this.send({
      type: 'invite:respond',
      payload: {
        inviteId,
        action,
        playerName: playerName || this.announcedDisplayName,
      },
    });
  }

  public claimRivalBounty(aiPlayerId: string, playerName?: string): boolean {
    this.ensureConnected(playerName);
    return this.send({
      type: 'rival:claim_bounty',
      payload: {
        aiPlayerId,
        playerName: playerName || this.announcedDisplayName,
      },
    });
  }

  public subscribeRivalRevengeChallenge(cb: RivalRevengeChallengeListener): () => void {
    this.rivalRevengeListeners.add(cb);
    return () => {
      this.rivalRevengeListeners.delete(cb);
    };
  }

  public requestRivalRevenge(aiPlayerId?: string, playerName?: string): boolean {
    this.ensureConnected(playerName);
    return this.send({
      type: 'rival:request_revenge',
      payload: {
        aiPlayerId,
        playerName: playerName || this.announcedDisplayName,
      },
    });
  }

  public subscribeGuildBossClaimAck(cb: GuildBossClaimAckListener): () => void {
    this.guildBossClaimAckListeners.add(cb);
    return () => {
      this.guildBossClaimAckListeners.delete(cb);
    };
  }

  public subscribeMiniCupPrizeAck(cb: MiniCupPrizeAckListener): () => void {
    this.miniCupPrizeAckListeners.add(cb);
    return () => {
      this.miniCupPrizeAckListeners.delete(cb);
    };
  }

  public syncGuildBossLive(playerName?: string): boolean {
    this.ensureConnected(playerName);
    return this.send({
      type: 'guild_boss:sync',
      payload: { playerName: playerName || this.announcedDisplayName },
    });
  }

  public submitGuildBossLiveAttack(params: {
    playerName?: string;
    heroId: HeroId;
    damage: number;
  }): boolean {
    this.ensureConnected(params.playerName);
    return this.send({
      type: 'guild_boss:attack',
      payload: {
        playerName: params.playerName || this.announcedDisplayName,
        heroId: params.heroId,
        damage: params.damage,
      },
    });
  }

  public claimGuildBossLiveMilestone(tierId: string, playerName?: string): boolean {
    this.ensureConnected(playerName);
    return this.send({
      type: 'guild_boss:claim_milestone',
      payload: {
        tierId,
        playerName: playerName || this.announcedDisplayName,
      },
    });
  }

  public syncMiniCup(playerName?: string): boolean {
    this.ensureConnected(playerName);
    return this.send({
      type: 'cup:sync',
      payload: { playerName: playerName || this.announcedDisplayName },
    });
  }

  public startMiniCup(params: {
    playerName?: string;
    heroId: HeroId;
    powerRating: number;
    duelRating: number;
  }): boolean {
    this.ensureConnected(params.playerName);
    return this.send({
      type: 'cup:start',
      payload: {
        playerName: params.playerName || this.announcedDisplayName,
        heroId: params.heroId,
        powerRating: params.powerRating,
        duelRating: params.duelRating,
      },
    });
  }

  public reportMiniCupMatch(params: {
    playerName?: string;
    matchId: string;
    playerWon: boolean;
  }): boolean {
    return this.send({
      type: 'cup:report_match',
      payload: {
        playerName: params.playerName || this.announcedDisplayName,
        matchId: params.matchId,
        playerWon: params.playerWon,
      },
    });
  }

  public claimMiniCupPrize(cupId: string, playerName?: string): boolean {
    this.ensureConnected(playerName);
    return this.send({
      type: 'cup:claim_prize',
      payload: {
        cupId,
        playerName: playerName || this.announcedDisplayName,
      },
    });
  }

  public subscribeServerBountyClaimAck(cb: ServerBountyClaimAckListener): () => void {
    this.serverBountyClaimAckListeners.add(cb);
    return () => {
      this.serverBountyClaimAckListeners.delete(cb);
    };
  }

  public syncServerBounty(playerName?: string): boolean {
    this.ensureConnected(playerName);
    return this.send({
      type: 'bounty:sync',
      payload: { playerName: playerName || this.announcedDisplayName },
    });
  }

  public contributeServerBounty(params: {
    playerName?: string;
    heroId: HeroId;
    points: number;
    sourceLabel?: string;
  }): boolean {
    this.ensureConnected(params.playerName);
    return this.send({
      type: 'bounty:contribute',
      payload: {
        playerName: params.playerName || this.announcedDisplayName,
        heroId: params.heroId,
        points: params.points,
        sourceLabel: params.sourceLabel,
      },
    });
  }

  public claimServerBountyReward(bountyId?: string, playerName?: string): boolean {
    this.ensureConnected(playerName);
    return this.send({
      type: 'bounty:claim_reward',
      payload: {
        bountyId,
        playerName: playerName || this.announcedDisplayName,
      },
    });
  }

  public submitCombatTelemetry(
    telemetry: PlayerCombatTelemetryInput,
    playerName?: string
  ): boolean {
    this.ensureConnected(playerName);
    return this.send({
      type: 'ai:learn_telemetry',
      payload: {
        playerName: playerName || this.announcedDisplayName,
        telemetry,
      },
    });
  }

  public resetAiAdaptation(playerName?: string): boolean {
    this.ensureConnected(playerName);
    return this.send({
      type: 'ai:reset_adaptation',
      payload: {
        playerName: playerName || this.announcedDisplayName,
      },
    });
  }

  public subscribeGuildWarClaimAck(cb: GuildWarClaimAckListener): () => void {
    this.guildWarClaimAckListeners.add(cb);
    return () => {
      this.guildWarClaimAckListeners.delete(cb);
    };
  }

  public syncGuildWar(playerName?: string): boolean {
    this.ensureConnected(playerName);
    return this.send({
      type: 'guild_war:sync',
      payload: {
        playerName: playerName || this.announcedDisplayName,
      },
    });
  }

  public strikeGuildWarBastion(params: {
    bastionId: GuildWarBastionId;
    mode: 'assault_3d' | 'quick_strike';
    heroId: HeroId;
    scoreGain?: number;
    playerName?: string;
  }): boolean {
    this.ensureConnected(params.playerName);
    return this.send({
      type: 'guild_war:capture_strike',
      payload: {
        playerName: params.playerName || this.announcedDisplayName,
        bastionId: params.bastionId,
        mode: params.mode,
        heroId: params.heroId,
        scoreGain: params.scoreGain,
      },
    });
  }

  public claimGuildWarReward(warId?: string, playerName?: string): boolean {
    this.ensureConnected(playerName);
    return this.send({
      type: 'guild_war:claim_reward',
      payload: {
        warId,
        playerName: playerName || this.announcedDisplayName,
      },
    });
  }

  public subscribeSpectatorCheerAck(cb: SpectatorCheerAckListener): () => void {
    this.spectatorCheerAckListeners.add(cb);
    return () => {
      this.spectatorCheerAckListeners.delete(cb);
    };
  }

  public subscribeSpectatorClaimAck(cb: SpectatorClaimAckListener): () => void {
    this.spectatorClaimAckListeners.add(cb);
    return () => {
      this.spectatorClaimAckListeners.delete(cb);
    };
  }

  public syncSpectatorMatch(playerName?: string): boolean {
    this.ensureConnected(playerName);
    return this.send({
      type: 'spectator:sync',
      payload: {
        playerName: playerName || this.announcedDisplayName,
      },
    });
  }

  public cheerSpectatorFighter(params: {
    matchId?: string;
    fighterId: string;
    playerName?: string;
  }): boolean {
    this.ensureConnected(params.playerName);
    return this.send({
      type: 'spectator:cheer',
      payload: {
        matchId: params.matchId,
        fighterId: params.fighterId,
        playerName: params.playerName || this.announcedDisplayName,
      },
    });
  }

  public claimSpectatorReward(matchId?: string, playerName?: string): boolean {
    this.ensureConnected(playerName);
    return this.send({
      type: 'spectator:claim_reward',
      payload: {
        matchId,
        playerName: playerName || this.announcedDisplayName,
      },
    });
  }

  public requestNextSpectatorMatch(playerName?: string): boolean {
    this.ensureConnected(playerName);
    return this.send({
      type: 'spectator:next_match',
      payload: {
        playerName: playerName || this.announcedDisplayName,
      },
    });
  }
}

export const liveAiSocket = new LiveAiSocketClient();

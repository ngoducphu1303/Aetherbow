import { normalizePlayableHeroId } from '../data/heroesData';
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
  LiveMiniCupMatch,
  LiveMiniCupParticipant,
  LiveMiniCupState,
  LiveServerBountyState,
  LiveSpectatorMatchSnapshot,
} from '../types/game';
import {
  applyGuildWarBastionStrike,
  createInitialLiveGuildWarState,
  derivePlayerAdaptationProfile,
  tickLiveGuildWarAiSkirmish,
  type GuildWarBastionId,
  type PlayerCombatTelemetryInput,
} from '../engine/wave10FivePillars';
import {
  computeSpectatorCheerReward,
  createLiveSpectatorMatch,
  stepLiveSpectatorMatch,
} from '../engine/wave11FivePillars';

const STORAGE_KEY = 'artemis_live_ai_standalone_v1';

export interface LiveAiServerEnvelope {
  type: string;
  payload: unknown;
}

interface PersistedFallbackState {
  dateKey: string;
  players: AiLivePlayerProfile[];
  activities: AiLiveActivityEvent[];
  chatHistory: {
    lobby: AiLiveChatMessage[];
    guild: AiLiveChatMessage[];
  };
  pendingInvites: AiLiveInvite[];
  rivals: AiRivalRecord[];
  guildBossLive: LiveGuildBossState;
  miniCup: LiveMiniCupState | null;
  serverBounty: LiveServerBountyState;
  adaptationProfile: AiAdaptationSummarySnapshot | null;
  guildWarLive: LiveGuildWarSnapshot;
  spectatorMatch: LiveSpectatorMatchSnapshot;
  spectatorMatchNumber: number;
  processedDuels: string[];
  processedInvites: string[];
}

function getUtcDateKey(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

function createInitialAiPlayers(nowMs: number): AiLivePlayerProfile[] {
  return [
    {
      id: 'ai_player_01',
      displayName: 'ThiênXạSư',
      tag: '[AI Live]',
      heroId: 'aurelia',
      powerRating: 5840,
      highestChapterCleared: 8,
      worldBossBestDamage: 24500,
      bestTowerFloor: 24,
      weeklyPracticeBest: 13850,
      weeklyPracticeClearTimeMs: 41200,
      guildRole: 'Đội Trưởng',
      guildContribution: 920,
      guildBossDamage: 18200,
      titleBadge: 'Thần Xạ Tinh Giới',
      frameId: 'default_gold',
      personality: 'tactical',
      status: 'ready_duel',
      statusDetail: 'Sẵn sàng giao đấu 1v1 tại Đấu Trường',
      duelRating: 1380,
      duelWins: 19,
      duelLosses: 7,
      winStreak: 3,
      lastActiveAt: nowMs - 15_000,
      buildSnapshot: {
        weaponName: 'Tinh Cung Nhật Luân +14',
        armorName: 'Chiến Giáp Hoàng Đạo +12',
        mountName: 'Solarius Thái Dương',
        wingName: 'Thần Dực Đỉnh Thái Dương',
        tacticSummary: 'Giữ nhịp trung cự & phản đòn chuẩn xác',
        favoriteSkills: ['Đa Tiễn', 'Tia Xuyên Phá', 'Tăng Tốc Bắn'],
      },
    },
    {
      id: 'ai_player_02',
      displayName: 'BăngTinhLinh',
      tag: '[AI Live]',
      heroId: 'bellona',
      powerRating: 5620,
      highestChapterCleared: 7,
      worldBossBestDamage: 21900,
      bestTowerFloor: 21,
      weeklyPracticeBest: 12940,
      weeklyPracticeClearTimeMs: 46800,
      guildRole: 'Phó Bang',
      guildContribution: 815,
      guildBossDamage: 16400,
      titleBadge: 'Nhạc Sư Tinh Tú',
      frameId: 'default_gold',
      personality: 'assassin',
      status: 'campaign',
      statusDetail: 'Đang chinh phục Chương 7 · Băng Đế Boreas',
      duelRating: 1320,
      duelWins: 16,
      duelLosses: 9,
      winStreak: 2,
      lastActiveAt: nowMs - 28_000,
      buildSnapshot: {
        weaponName: 'Trượng Tinh Âm +13',
        armorName: 'Áo Choàng Lam Sương +12',
        mountName: 'Solarius Thái Dương',
        wingName: 'Thần Dực Đỉnh Thái Dương',
        tacticSummary: 'Lướt né cơ động & kích Cộng Hưởng Băng-Lôi',
        favoriteSkills: ['Băng Tiễn', 'Lôi Điện Liên Hoàn', 'Hồi Máu'],
      },
    },
    {
      id: 'ai_player_03',
      displayName: 'TháiDươngVương',
      tag: '[AI Live]',
      heroId: 'aurelia',
      powerRating: 6150,
      highestChapterCleared: 9,
      worldBossBestDamage: 27400,
      bestTowerFloor: 28,
      weeklyPracticeBest: 14620,
      weeklyPracticeClearTimeMs: 38900,
      guildRole: 'Tinh Anh',
      guildContribution: 1040,
      guildBossDamage: 21500,
      titleBadge: 'Chí Tôn Sư Tử',
      frameId: 'default_gold',
      personality: 'aggressive',
      status: 'weekly_practice',
      statusDetail: 'Đang luyện tốc độ Boss Tuần chuẩn hóa',
      duelRating: 1445,
      duelWins: 24,
      duelLosses: 6,
      winStreak: 4,
      lastActiveAt: nowMs - 10_000,
      buildSnapshot: {
        weaponName: 'Nhật Luân Thần Cung +15',
        armorName: 'Hộ Giáp Sư Vương +14',
        mountName: 'Solarius Thái Dương',
        wingName: 'Thần Dực Đỉnh Thái Dương',
        tacticSummary: 'Áp sát phá giáp & dứt điểm bằng Tuyệt Kỹ',
        favoriteSkills: ['Hỏa Tiễn', 'Chí Mạng Đỉnh Cao', 'Bắn Liên Thanh'],
      },
    },
    {
      id: 'ai_player_04',
      displayName: 'NgânHàKiếm',
      tag: '[AI Live]',
      heroId: 'aurelia',
      powerRating: 4980,
      highestChapterCleared: 6,
      worldBossBestDamage: 18400,
      bestTowerFloor: 18,
      weeklyPracticeBest: 11200,
      weeklyPracticeClearTimeMs: 52100,
      guildRole: 'Thành Viên',
      guildContribution: 640,
      guildBossDamage: 12900,
      titleBadge: 'Tuần Tra Tinh Vực',
      frameId: 'default_gold',
      personality: 'tactical',
      status: 'lobby',
      statusDetail: 'Đang tinh chỉnh Cổ Ngữ tại Điện Thần',
      duelRating: 1210,
      duelWins: 11,
      duelLosses: 10,
      winStreak: 1,
      lastActiveAt: nowMs - 45_000,
    },
    {
      id: 'ai_player_05',
      displayName: 'LôiẢnhSát',
      tag: '[AI Live]',
      heroId: 'bellona',
      powerRating: 5340,
      highestChapterCleared: 7,
      worldBossBestDamage: 20100,
      bestTowerFloor: 20,
      weeklyPracticeBest: 12350,
      weeklyPracticeClearTimeMs: 48400,
      guildRole: 'Tinh Anh',
      guildContribution: 730,
      guildBossDamage: 14600,
      titleBadge: 'Ảnh Sát Hoàng Đạo',
      frameId: 'default_gold',
      personality: 'assassin',
      status: 'ready_duel',
      statusDetail: 'Đang chờ kèo giao hữu 1v1 nhanh',
      duelRating: 1295,
      duelWins: 14,
      duelLosses: 8,
      winStreak: 2,
      lastActiveAt: nowMs - 22_000,
    },
    {
      id: 'ai_player_06',
      displayName: 'NhậtQuangTử',
      tag: '[AI Live]',
      heroId: 'aurelia',
      powerRating: 5120,
      highestChapterCleared: 6,
      worldBossBestDamage: 19200,
      bestTowerFloor: 19,
      weeklyPracticeBest: 11880,
      weeklyPracticeClearTimeMs: 50500,
      guildRole: 'Thành Viên',
      guildContribution: 685,
      guildBossDamage: 13800,
      titleBadge: 'Hộ Vệ Thánh Điện',
      frameId: 'default_gold',
      personality: 'aggressive',
      status: 'campaign',
      statusDetail: 'Đang đánh Boss Chương 6 · Đền Thiên Bình',
      duelRating: 1240,
      duelWins: 12,
      duelLosses: 11,
      winStreak: 0,
      lastActiveAt: nowMs - 36_000,
    },
    {
      id: 'ai_player_07',
      displayName: 'MộngTinhVũ',
      tag: '[AI Live]',
      heroId: 'aurelia',
      powerRating: 4720,
      highestChapterCleared: 5,
      worldBossBestDamage: 16800,
      bestTowerFloor: 16,
      weeklyPracticeBest: 10450,
      weeklyPracticeClearTimeMs: 56200,
      guildRole: 'Thành Viên',
      guildContribution: 590,
      guildBossDamage: 11200,
      titleBadge: 'Xạ Thủ Tập Sự',
      frameId: 'default_gold',
      personality: 'tactical',
      status: 'lobby',
      statusDetail: 'Đang xem giải Đấu Trường AI Live',
      duelRating: 1165,
      duelWins: 9,
      duelLosses: 10,
      winStreak: 1,
      lastActiveAt: nowMs - 52_000,
    },
  ];
}

function createInitialGuildBoss(dateKey: string, nowMs: number): LiveGuildBossState {
  const maxHp = 220_000;
  const initialDamage = 58_400;
  return {
    dateKey,
    bossName: 'Hắc Tinh Cự Thú · Boss Bang Hội',
    bossTitle: 'Chiến Dịch Hợp Sức Bang Hội Toàn Máy Chủ',
    maxHp,
    currentHp: maxHp - initialDamage,
    totalDamage: initialDamage,
    defeatedCount: 0,
    contributors: [
      {
        id: 'ai_player_03',
        displayName: 'TháiDươngVương [AI Live]',
        isHuman: false,
        heroId: 'aurelia',
        damage: 24_200,
        attacks: 3,
        lastHitAt: nowMs - 35_000,
      },
      {
        id: 'ai_player_01',
        displayName: 'ThiênXạSư [AI Live]',
        isHuman: false,
        heroId: 'aurelia',
        damage: 19_500,
        attacks: 3,
        lastHitAt: nowMs - 48_000,
      },
      {
        id: 'ai_player_02',
        displayName: 'BăngTinhLinh [AI Live]',
        isHuman: false,
        heroId: 'bellona',
        damage: 14_700,
        attacks: 2,
        lastHitAt: nowMs - 65_000,
      },
    ],
    milestones: [
      {
        tierId: 'gb_m1',
        label: 'Mốc 60.000 Sát Thương Bang',
        damageRequired: 60_000,
        rewardGold: 1200,
        rewardGems: 40,
        rewardGuildCoins: 80,
      },
      {
        tierId: 'gb_m2',
        label: 'Mốc 140.000 Sát Thương Bang',
        damageRequired: 140_000,
        rewardGold: 2400,
        rewardGems: 85,
        rewardGuildCoins: 150,
      },
      {
        tierId: 'gb_m3',
        label: 'Hạ Gục Boss Bang (220.000 ST)',
        damageRequired: 220_000,
        rewardGold: 4200,
        rewardGems: 150,
        rewardGuildCoins: 260,
      },
    ],
    claimedMilestoneIds: [],
    lastUpdatedAt: nowMs,
  };
}

function createInitialServerBounty(dateKey: string, nowMs: number): LiveServerBountyState {
  return {
    bountyId: `bounty_${dateKey}`,
    dateKey,
    title: 'Lệnh Truy Nã Tinh Giới Hằng Ngày',
    subtitle: 'Toàn bộ chiến binh & AI Live cùng tích điểm phá ấn tinh vực',
    objectiveLabel: 'Tích lũy 2.000 điểm chiến công toàn máy chủ',
    targetPoints: 2000,
    currentPoints: 760,
    completed: false,
    rewardGold: 2600,
    rewardGems: 95,
    rewardStarDust: 140,
    claimedByPlayer: false,
    contributors: [
      {
        id: 'ai_player_03',
        displayName: 'TháiDươngVương [AI Live]',
        isHuman: false,
        heroId: 'aurelia',
        points: 310,
        lastContributedAt: nowMs - 40_000,
      },
      {
        id: 'ai_player_01',
        displayName: 'ThiênXạSư [AI Live]',
        isHuman: false,
        heroId: 'aurelia',
        points: 260,
        lastContributedAt: nowMs - 55_000,
      },
      {
        id: 'ai_player_02',
        displayName: 'BăngTinhLinh [AI Live]',
        isHuman: false,
        heroId: 'bellona',
        points: 190,
        lastContributedAt: nowMs - 70_000,
      },
    ],
    lastUpdatedAt: nowMs,
  };
}

function createInitialState(nowMs = Date.now()): PersistedFallbackState {
  const dateKey = getUtcDateKey(nowMs);
  const players = createInitialAiPlayers(nowMs);
  const spectatorMatch = createLiveSpectatorMatch(
    players.map((p) => ({
      id: p.id,
      displayName: p.displayName,
      heroId: p.heroId,
      powerRating: p.powerRating,
      personality: p.personality,
    })),
    nowMs,
    1
  );

  return {
    dateKey,
    players,
    activities: [
      {
        id: `act_init_1_${nowMs}`,
        timestamp: nowMs - 25_000,
        kind: 'weekly_practice',
        actorName: 'TháiDươngVương [AI Live]',
        summary: 'vừa luyện Boss Tuần đạt 14.620 điểm bằng bộ Sử Thi chuẩn hóa.',
        accent: 'amber',
      },
      {
        id: `act_init_2_${nowMs}`,
        timestamp: nowMs - 55_000,
        kind: 'guild',
        actorName: 'ThiênXạSư [AI Live]',
        summary: 'vừa mở đợt tổng công kích Boss Bang Hội (-19.500 HP).',
        accent: 'emerald',
      },
      {
        id: `act_init_3_${nowMs}`,
        timestamp: nowMs - 85_000,
        kind: 'campaign',
        actorName: 'BăngTinhLinh [AI Live]',
        summary: 'đang săn trang bị Cổ Ngữ tại Chương 7 · Băng Đế Boreas.',
        accent: 'sky',
      },
    ],
    chatHistory: {
      lobby: [
        {
          id: `chat_init_lobby_1`,
          channel: 'lobby',
          senderName: 'ThiênXạSư',
          senderTag: '[AI Live]',
          aiPlayerId: 'ai_player_01',
          heroId: 'aurelia',
          text: 'Chào mừng tới Điện Thần Tinh Giới! Ai muốn thử giao hữu 1v1 hoặc đi Boss Bang thì gọi mình nhé.',
          timestamp: nowMs - 90_000,
        },
        {
          id: `chat_init_lobby_2`,
          channel: 'lobby',
          senderName: 'BăngTinhLinh',
          senderTag: '[AI Live]',
          aiPlayerId: 'ai_player_02',
          heroId: 'bellona',
          text: 'Hôm nay Boss Tuần chuẩn hóa công bằng khá căng, nhớ né chuẩn nhịp để lấy thêm điểm kỹ năng!',
          timestamp: nowMs - 45_000,
        },
      ],
      guild: [
        {
          id: `chat_init_guild_1`,
          channel: 'guild',
          senderName: 'TháiDươngVương',
          senderTag: '[AI Live]',
          aiPlayerId: 'ai_player_03',
          heroId: 'aurelia',
          text: 'Cả bang tập trung đánh Boss Bang & chiếm Tháp Thái Dương để giữ buff +15% ST nhé!',
          timestamp: nowMs - 60_000,
        },
      ],
    },
    pendingInvites: [],
    rivals: [],
    guildBossLive: createInitialGuildBoss(dateKey, nowMs),
    miniCup: null,
    serverBounty: createInitialServerBounty(dateKey, nowMs),
    adaptationProfile: null,
    guildWarLive: createInitialLiveGuildWarState(dateKey, nowMs),
    spectatorMatch,
    spectatorMatchNumber: 1,
    processedDuels: [],
    processedInvites: [],
  };
}

export class LiveAiLocalFallback {
  private state: PersistedFallbackState;
  private emit: (envelope: LiveAiServerEnvelope) => void;
  private playerDisplayName = 'Chiến Binh Tinh Giới';
  private tickTimer: ReturnType<typeof setInterval> | null = null;
  private replyTimers: Array<ReturnType<typeof setTimeout>> = [];
  private tickCounter = 0;
  private immediateReplies: boolean;

  constructor(
    emit: (envelope: LiveAiServerEnvelope) => void,
    options?: { startTicker?: boolean; immediateReplies?: boolean; persist?: boolean }
  ) {
    this.emit = emit;
    this.immediateReplies = Boolean(options?.immediateReplies);
    this.state = options?.persist === false ? createInitialState() : this.loadPersistedState();
    if (options?.startTicker !== false) {
      this.startTicker();
    }
  }

  private loadPersistedState(): PersistedFallbackState {
    const today = getUtcDateKey();
    if (typeof localStorage === 'undefined') {
      return createInitialState();
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createInitialState();
      const parsed = JSON.parse(raw) as PersistedFallbackState;
      if (!parsed || !Array.isArray(parsed.players) || parsed.players.length < 4) {
        return createInitialState();
      }
      if (parsed.dateKey !== today) {
        const fresh = createInitialState();
        fresh.rivals = Array.isArray(parsed.rivals) ? parsed.rivals : [];
        fresh.adaptationProfile = parsed.adaptationProfile ?? null;
        return fresh;
      }
      return {
        ...parsed,
        players: parsed.players.map((profile) => ({
          ...profile,
          heroId: normalizePlayableHeroId(profile.heroId),
        })),
      };
    } catch {
      return createInitialState();
    }
  }

  private persist(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Ignore storage quota errors
    }
  }

  public getSnapshot(nowMs = Date.now()): AiLiveHubSnapshot {
    return {
      serverNow: nowMs,
      onlineHumanCount: 1,
      onlineAiCount: this.state.players.length,
      players: this.state.players,
      activities: this.state.activities,
      chatHistory: this.state.chatHistory,
      pendingInvites: this.state.pendingInvites,
      rivals: this.state.rivals,
      guildBossLive: this.state.guildBossLive,
      miniCup: this.state.miniCup,
      serverBounty: this.state.serverBounty,
      adaptationProfile: this.state.adaptationProfile,
      guildWarLive: this.state.guildWarLive,
      spectatorMatch: this.state.spectatorMatch,
    };
  }

  public startTicker(): void {
    if (this.tickTimer !== null || typeof setInterval === 'undefined') return;
    // Lightweight 15s simulation heartbeat, completely paused when tab is hidden to save CPU on low-end laptops
    this.tickTimer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      this.runHeartbeatTick();
    }, 15_000);
  }

  public destroy(): void {
    if (this.tickTimer !== null) {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
    }
    for (const t of this.replyTimers) clearTimeout(t);
    this.replyTimers = [];
  }

  public runHeartbeatTick(nowMs = Date.now()): void {
    this.tickCounter += 1;
    const ai = this.state.players[this.tickCounter % this.state.players.length];
    if (!ai) return;

    // 1. Live activity heartbeat
    const summaries = [
      `vừa vượt qua ải Tinh Anh Chương ${Math.max(1, ai.highestChapterCleared)}.`,
      `đạt ${ai.weeklyPracticeBest.toLocaleString('vi-VN')} điểm luyện tập Boss Tuần.`,
      `vừa leo lên Tầng ${ai.bestTowerFloor} Tháp Thử Thách.`,
      `đang sẵn sàng tổ đội săn Boss Bang cùng ${this.playerDisplayName}.`,
    ];
    const event: AiLiveActivityEvent = {
      id: `act_tick_${nowMs}_${this.tickCounter}`,
      timestamp: nowMs,
      kind: this.tickCounter % 2 === 0 ? 'campaign' : 'tower',
      actorName: `${ai.displayName} [AI Live]`,
      summary: summaries[this.tickCounter % summaries.length],
      accent: this.tickCounter % 2 === 0 ? 'sky' : 'amber',
    };
    const updatedPlayer: AiLivePlayerProfile = {
      ...ai,
      lastActiveAt: nowMs,
    };
    this.state.players = this.state.players.map((p) => (p.id === ai.id ? updatedPlayer : p));
    this.state.activities = [event, ...this.state.activities].slice(0, 20);
    this.emit({
      type: 'hub:activity',
      payload: {
        event,
        updatedPlayer,
        onlineHumanCount: 1,
      },
    });

    // 2. Step Spectator Match (AI vs AI Championship)
    if (this.state.spectatorMatch) {
      if (this.state.spectatorMatch.status !== 'finished') {
        const stepped = stepLiveSpectatorMatch(this.state.spectatorMatch, nowMs);
        this.state.spectatorMatch = stepped.nextMatch;
        this.emit({
          type: 'spectator:update',
          payload: { spectatorMatch: this.state.spectatorMatch },
        });
      }
    }

    // 3. Step Guild War AI skirmish every 2nd tick
    if (this.tickCounter % 2 === 0 && this.state.guildWarLive.status === 'active') {
      const warTick = tickLiveGuildWarAiSkirmish(this.state.guildWarLive, {
        aiId: ai.id,
        aiDisplayName: ai.displayName,
        heroId: ai.heroId,
        tickSeed: this.tickCounter,
        nowMs,
      });
      this.state.guildWarLive = warTick.nextState;
      this.emit({
        type: 'guild_war:update',
        payload: { guildWarLive: this.state.guildWarLive },
      });
    }

    // 4. Gentle AI contribution to Server Bounty
    if (!this.state.serverBounty.completed && this.tickCounter % 3 === 0) {
      const gain = 25 + (this.tickCounter % 20);
      const nextPts = Math.min(
        this.state.serverBounty.targetPoints,
        this.state.serverBounty.currentPoints + gain
      );
      this.state.serverBounty = {
        ...this.state.serverBounty,
        currentPoints: nextPts,
        completed: nextPts >= this.state.serverBounty.targetPoints,
        lastUpdatedAt: nowMs,
      };
      this.emit({
        type: 'bounty:update',
        payload: { serverBounty: this.state.serverBounty },
      });
    }

    this.persist();
  }

  public handleClientMessage(raw: unknown): void {
    const msg = raw as { type?: string; payload?: Record<string, unknown> };
    if (!msg || typeof msg.type !== 'string') return;
    const payload = msg.payload ?? {};
    const nowMs = Date.now();

    switch (msg.type) {
      case 'presence:announce': {
        const name = typeof payload.displayName === 'string' ? payload.displayName.trim() : '';
        if (name.length >= 2) this.playerDisplayName = name.slice(0, 24);
        this.emit({ type: 'hub:snapshot', payload: this.getSnapshot(nowMs) });
        return;
      }

      case 'chat:send': {
        this.handleChatSend(payload, nowMs);
        return;
      }

      case 'auction:sync_lots': {
        this.handleAuctionSync(payload, nowMs);
        return;
      }

      case 'duel:challenge': {
        this.handleDuelChallenge(payload, nowMs);
        return;
      }

      case 'duel:complete': {
        this.handleDuelComplete(payload, nowMs);
        return;
      }

      case 'invite:respond': {
        this.handleInviteRespond(payload, nowMs);
        return;
      }

      case 'rival:claim_bounty': {
        this.handleRivalClaimBounty(payload, nowMs);
        return;
      }

      case 'rival:request_revenge': {
        this.handleRivalRequestRevenge(payload, nowMs);
        return;
      }

      case 'guild_boss:sync': {
        this.emit({
          type: 'guild_boss:update',
          payload: { guildBossLive: this.state.guildBossLive },
        });
        return;
      }

      case 'guild_boss:attack': {
        this.handleGuildBossAttack(payload, nowMs);
        return;
      }

      case 'guild_boss:claim_milestone': {
        this.handleGuildBossClaim(payload);
        return;
      }

      case 'cup:sync': {
        this.emit({
          type: 'cup:state',
          payload: { cup: this.state.miniCup, rivals: this.state.rivals },
        });
        return;
      }

      case 'cup:start': {
        this.handleCupStart(payload, nowMs);
        return;
      }

      case 'cup:report_match': {
        this.handleCupReportMatch(payload, nowMs);
        return;
      }

      case 'cup:claim_prize': {
        this.handleCupClaimPrize();
        return;
      }

      case 'bounty:sync': {
        this.emit({
          type: 'bounty:update',
          payload: { serverBounty: this.state.serverBounty },
        });
        return;
      }

      case 'bounty:contribute': {
        this.handleBountyContribute(payload, nowMs);
        return;
      }

      case 'bounty:claim_reward': {
        this.handleBountyClaim();
        return;
      }

      case 'ai:learn_telemetry': {
        const playerName =
          typeof payload.playerName === 'string' && payload.playerName.trim()
            ? payload.playerName.trim().slice(0, 24)
            : this.playerDisplayName;
        const telemetry = payload.telemetry as PlayerCombatTelemetryInput | undefined;
        if (telemetry) {
          this.state.adaptationProfile = derivePlayerAdaptationProfile(
            this.state.adaptationProfile,
            playerName,
            telemetry,
            nowMs
          );
          this.persist();
          this.emit({
            type: 'ai:adaptation_update',
            payload: { adaptationProfile: this.state.adaptationProfile },
          });
        }
        return;
      }

      case 'ai:reset_adaptation': {
        this.state.adaptationProfile = null;
        this.persist();
        this.emit({
          type: 'ai:adaptation_update',
          payload: { adaptationProfile: null },
        });
        return;
      }

      case 'guild_war:sync': {
        this.emit({
          type: 'guild_war:update',
          payload: { guildWarLive: this.state.guildWarLive },
        });
        return;
      }

      case 'guild_war:capture_strike': {
        this.handleGuildWarStrike(payload, nowMs);
        return;
      }

      case 'guild_war:claim_reward': {
        this.handleGuildWarClaim();
        return;
      }

      case 'spectator:sync': {
        this.emit({
          type: 'spectator:update',
          payload: { spectatorMatch: this.state.spectatorMatch },
        });
        return;
      }

      case 'spectator:cheer': {
        this.handleSpectatorCheer(payload);
        return;
      }

      case 'spectator:claim_reward': {
        this.handleSpectatorClaim();
        return;
      }

      case 'spectator:next_match': {
        this.handleSpectatorNextMatch(nowMs);
        return;
      }
    }
  }

  private handleChatSend(payload: Record<string, unknown>, nowMs: number): void {
    const channel: AiLiveChatChannel = payload.channel === 'guild' ? 'guild' : 'lobby';
    const text = String(payload.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 180);
    if (!text) return;
    const senderName =
      typeof payload.senderName === 'string' && payload.senderName.trim()
        ? payload.senderName.trim().slice(0, 24)
        : this.playerDisplayName;

    const playerMsg: AiLiveChatMessage = {
      id: `chat_p_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
      channel,
      senderName,
      senderTag: 'Người Thật',
      text,
      timestamp: nowMs,
    };
    this.state.chatHistory[channel] = [...this.state.chatHistory[channel], playerMsg].slice(-40);
    this.persist();
    this.emit({ type: 'chat:message', payload: playerMsg });

    // Generate contextual AI reply
    const responder =
      this.state.players[Math.floor((nowMs / 1000) % this.state.players.length)] ??
      this.state.players[0];
    const lower = text.toLowerCase();
    let replyText = `Nghe rõ rồi ${senderName}! Mình sẵn sàng hỗ trợ nếu bạn cần tổ đội hoặc giao hữu 1v1.`;
    if (lower.includes('boss')) {
      replyText = `${senderName} ơi, đánh Boss nhớ căn nhịp Né Hoàn Hảo để phá giáp nhanh hơn nhé!`;
    } else if (lower.includes('duel') || lower.includes('pvp') || lower.includes('solo') || lower.includes('đấu')) {
      replyText = `Kèo 1v1 nghe hấp dẫn đấy ${senderName}! Chọn mình trong danh sách AI Live để vào sàn ngay!`;
    } else if (channel === 'guild') {
      replyText = `Đồng đội ${senderName} điểm danh! Cùng đẩy điểm Chiến Trường Bang và hạ Boss Bang nào!`;
    }

    const sendReply = () => {
      const replyMsg: AiLiveChatMessage = {
        id: `chat_ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        channel,
        senderName: responder.displayName,
        senderTag: '[AI Live]',
        aiPlayerId: responder.id,
        heroId: responder.heroId,
        text: replyText,
        timestamp: Date.now(),
      };
      this.state.chatHistory[channel] = [...this.state.chatHistory[channel], replyMsg].slice(-40);
      this.persist();
      this.emit({ type: 'chat:message', payload: replyMsg });
    };

    if (this.immediateReplies) {
      sendReply();
    } else {
      const timer = setTimeout(sendReply, 700);
      this.replyTimers.push(timer);
    }
  }

  private handleAuctionSync(payload: Record<string, unknown>, nowMs: number): void {
    const lots = Array.isArray(payload.lots) ? (payload.lots as AiLiveAuctionSyncLot[]) : [];
    const immediate = Boolean(payload.requestImmediateEvaluation);
    if (!immediate || lots.length === 0) return;

    const focusId = typeof payload.focusLotId === 'string' ? payload.focusLotId : null;
    const candidate =
      lots.find((l) => l.id === focusId && l.endsAt > nowMs) ??
      lots.find((l) => l.isPlayerListing && l.endsAt > nowMs) ??
      lots.find((l) => l.highestBidderIsPlayer && l.endsAt > nowMs);

    if (!candidate) return;
    const bidder =
      this.state.players[Math.floor((nowMs / 100) % this.state.players.length)] ??
      this.state.players[0];
    const nextAmount = Math.min(
      candidate.buyoutPrice,
      Math.max(candidate.currentBid + 25, Math.round(candidate.currentBid * 1.08))
    );
    const isBuyout = nextAmount >= candidate.buyoutPrice;
    const evt: AiLiveAuctionBidEvent = {
      eventId: `auc_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
      lotId: candidate.id,
      lotLabel: candidate.label,
      bidderId: bidder.id,
      bidderName: bidder.displayName,
      bidderTag: '[AI Live]',
      action: isBuyout ? 'buyout' : 'bid',
      amount: nextAmount,
      isPlayerListing: candidate.isPlayerListing,
      timestamp: nowMs,
    };
    this.emit({ type: 'auction:bid_event', payload: evt });
  }

  private handleDuelChallenge(payload: Record<string, unknown>, nowMs: number): void {
    const aiPlayerId = String(payload.aiPlayerId ?? '');
    const opponent =
      this.state.players.find((p) => p.id === aiPlayerId) ?? this.state.players[0];
    if (!opponent) return;
    const duelId = `duel_local_${nowMs}_${Math.random().toString(36).slice(2, 7)}`;
    this.emit({
      type: 'duel:accepted',
      payload: { duelId, opponent },
    });
  }

  private handleDuelComplete(payload: Record<string, unknown>, nowMs: number): void {
    const duelId = String(payload.duelId ?? '');
    const aiPlayerId = String(payload.aiPlayerId ?? '');
    const playerWon = Boolean(payload.playerWon);
    const challengerName =
      typeof payload.challengerName === 'string' && payload.challengerName.trim()
        ? payload.challengerName.trim()
        : this.playerDisplayName;

    const alreadyProcessed = duelId !== '' && this.state.processedDuels.includes(duelId);
    const opponent = this.state.players.find((p) => p.id === aiPlayerId) ?? null;

    if (alreadyProcessed) {
      this.emit({
        type: 'duel:result_ack',
        payload: {
          duelId,
          alreadyProcessed: true,
          ratingDelta: 0,
          opponent,
          rivals: this.state.rivals,
        },
      });
      return;
    }

    if (duelId) {
      this.state.processedDuels = [...this.state.processedDuels, duelId].slice(-60);
    }

    const ratingDelta = playerWon ? 24 : -14;
    let updatedOpponent = opponent;
    if (opponent) {
      updatedOpponent = {
        ...opponent,
        duelRating: Math.max(900, opponent.duelRating + (playerWon ? -16 : 20)),
        duelWins: opponent.duelWins + (playerWon ? 0 : 1),
        duelLosses: opponent.duelLosses + (playerWon ? 1 : 0),
        winStreak: playerWon ? 0 : opponent.winStreak + 1,
        lastActiveAt: nowMs,
      };
      this.state.players = this.state.players.map((p) =>
        p.id === opponent.id ? updatedOpponent! : p
      );

      // Update Rival Nemesis record
      const existingIdx = this.state.rivals.findIndex((r) => r.aiPlayerId === opponent.id);
      const prev = existingIdx >= 0 ? this.state.rivals[existingIdx] : null;
      const winsAgainst = (prev?.winsAgainst ?? 0) + (playerWon ? 1 : 0);
      const lossesAgainst = (prev?.lossesAgainst ?? 0) + (playerWon ? 0 : 1);
      const rivalryScore = (prev?.rivalryScore ?? 0) + (playerWon ? 35 : 25);
      const rivalryTier: AiRivalRecord['rivalryTier'] =
        rivalryScore >= 120 ? 'nemesis' : rivalryScore >= 60 ? 'archrival' : 'contender';
      const nextRival: AiRivalRecord = {
        aiPlayerId: opponent.id,
        aiDisplayName: opponent.displayName,
        aiHeroId: opponent.heroId,
        aiPowerRating: opponent.powerRating,
        winsAgainst,
        lossesAgainst,
        rivalryScore,
        rivalryTier,
        lastEncounterReason: playerWon
          ? `${challengerName} chiến thắng 1v1`
          : `${opponent.displayName} hạ gục ${challengerName} trong 1v1`,
        lastEncounterAt: nowMs,
        bountyClaimedDateKey: prev?.bountyClaimedDateKey,
        vendettaPending: playerWon,
        revengeStreak: playerWon ? (prev?.revengeStreak ?? 0) + 1 : 0,
        revengeBonusPct: Math.min(60, ((prev?.revengeStreak ?? 0) + 1) * 15),
        lastOutcome: playerWon ? 'player_won' : 'ai_won',
      };
      if (existingIdx >= 0) {
        this.state.rivals[existingIdx] = nextRival;
      } else {
        this.state.rivals = [nextRival, ...this.state.rivals].slice(0, 12);
      }

      const event: AiLiveActivityEvent = {
        id: `act_duel_${nowMs}`,
        timestamp: nowMs,
        kind: 'duel_result',
        actorName: challengerName,
        summary: playerWon
          ? `vừa đánh bại ${opponent.displayName} [AI Live] trong trận 1v1!`
          : `đã chạm trán căng thẳng cùng ${opponent.displayName} [AI Live].`,
        accent: playerWon ? 'emerald' : 'rose',
      };
      this.state.activities = [event, ...this.state.activities].slice(0, 20);
      this.emit({
        type: 'hub:activity',
        payload: { event, updatedPlayer: updatedOpponent, onlineHumanCount: 1 },
      });
    }

    this.persist();
    this.emit({
      type: 'duel:result_ack',
      payload: {
        duelId,
        alreadyProcessed: false,
        ratingDelta,
        opponent: updatedOpponent,
        rivals: this.state.rivals,
      },
    });
  }

  private handleInviteRespond(payload: Record<string, unknown>, nowMs: number): void {
    const inviteId = String(payload.inviteId ?? '');
    const action = payload.action === 'accept' ? 'accept' : 'decline';
    const alreadyProcessed = this.state.processedInvites.includes(inviteId);
    const invite = this.state.pendingInvites.find((i) => i.inviteId === inviteId) ?? null;

    if (!alreadyProcessed && inviteId) {
      this.state.processedInvites = [...this.state.processedInvites, inviteId].slice(-60);
      this.state.pendingInvites = this.state.pendingInvites.filter((i) => i.inviteId !== inviteId);
      this.persist();
    }

    const opponent = invite
      ? this.state.players.find((p) => p.id === invite.aiPlayerId)
      : undefined;

    this.emit({
      type: 'invite:ack',
      payload: {
        inviteId,
        action,
        ok: Boolean(invite),
        alreadyProcessed,
        invite,
        duelId: action === 'accept' && invite ? `duel_inv_${nowMs}` : undefined,
        opponent: action === 'accept' ? opponent : undefined,
      },
    });
  }

  private handleRivalClaimBounty(payload: Record<string, unknown>, nowMs: number): void {
    const aiPlayerId = String(payload.aiPlayerId ?? '');
    const rival = this.state.rivals.find((r) => r.aiPlayerId === aiPlayerId) ?? null;
    const today = getUtcDateKey(nowMs);
    if (!rival) {
      this.emit({
        type: 'rival:bounty_ack',
        payload: {
          ok: false,
          alreadyClaimed: false,
          goldReward: 0,
          gemsReward: 0,
          rival: null,
          message: 'Không tìm thấy đối thủ truyền kiếp tương ứng.',
          rivals: this.state.rivals,
        },
      });
      return;
    }
    if (rival.bountyClaimedDateKey === today) {
      this.emit({
        type: 'rival:bounty_ack',
        payload: {
          ok: true,
          alreadyClaimed: true,
          goldReward: 0,
          gemsReward: 0,
          rival,
          message: 'Bạn đã nhận thưởng truy nã đối thủ này hôm nay.',
          rivals: this.state.rivals,
        },
      });
      return;
    }
    rival.bountyClaimedDateKey = today;
    const goldReward = rival.rivalryTier === 'nemesis' ? 1600 : rival.rivalryTier === 'archrival' ? 1100 : 750;
    const gemsReward = rival.rivalryTier === 'nemesis' ? 60 : rival.rivalryTier === 'archrival' ? 40 : 25;
    this.persist();
    this.emit({
      type: 'rival:bounty_ack',
      payload: {
        ok: true,
        alreadyClaimed: false,
        goldReward,
        gemsReward,
        rival,
        message: `Đã nhận thưởng truy nã ${rival.aiDisplayName}!`,
        rivals: this.state.rivals,
      },
    });
  }

  private handleRivalRequestRevenge(payload: Record<string, unknown>, nowMs: number): void {
    const requestedId = typeof payload.aiPlayerId === 'string' ? payload.aiPlayerId : '';
    const rival =
      this.state.rivals.find((r) => r.aiPlayerId === requestedId) ??
      this.state.rivals[0] ??
      null;
    const ai =
      (rival ? this.state.players.find((p) => p.id === rival.aiPlayerId) : null) ??
      this.state.players[0];
    if (!ai) return;

    const invite: AiLiveInvite = {
      inviteId: `inv_rev_${nowMs}_${Math.random().toString(36).slice(2, 6)}`,
      kind: 'rival_revenge',
      aiPlayerId: ai.id,
      aiDisplayName: ai.displayName,
      aiHeroId: ai.heroId,
      aiPowerRating: ai.powerRating,
      message: `${ai.displayName} gửi thư khiêu chiến phục thù (+${rival?.revengeBonusPct ?? 20}% thưởng)!`,
      createdAt: nowMs,
      expiresAt: nowMs + 120_000,
      revengeBonusPct: rival?.revengeBonusPct ?? 20,
      revengeStreak: rival?.revengeStreak ?? 1,
    };
    this.state.pendingInvites = [invite, ...this.state.pendingInvites].slice(0, 5);
    this.persist();
    this.emit({
      type: 'rival:revenge_challenge',
      payload: { invite, rival, rivals: this.state.rivals },
    });
  }

  private handleGuildBossAttack(payload: Record<string, unknown>, nowMs: number): void {
    const playerName =
      typeof payload.playerName === 'string' && payload.playerName.trim()
        ? payload.playerName.trim().slice(0, 24)
        : this.playerDisplayName;
    const heroId = normalizePlayableHeroId(payload.heroId);
    const damage = Math.max(100, Math.min(250_000, Math.round(Number(payload.damage) || 0)));

    const boss = this.state.guildBossLive;
    const nextTotal = boss.totalDamage + damage;
    let nextHp = boss.currentHp - damage;
    let defeatedCount = boss.defeatedCount;
    if (nextHp <= 0) {
      defeatedCount += 1;
      nextHp = boss.maxHp;
    }

    const contributors = [...boss.contributors];
    const idx = contributors.findIndex((c) => c.id === 'human_player');
    if (idx >= 0) {
      contributors[idx] = {
        ...contributors[idx],
        displayName: playerName,
        heroId,
        damage: contributors[idx].damage + damage,
        attacks: contributors[idx].attacks + 1,
        lastHitAt: nowMs,
      };
    } else {
      contributors.push({
        id: 'human_player',
        displayName: playerName,
        isHuman: true,
        heroId,
        damage,
        attacks: 1,
        lastHitAt: nowMs,
      });
    }
    contributors.sort((a, b) => b.damage - a.damage);

    this.state.guildBossLive = {
      ...boss,
      currentHp: nextHp,
      totalDamage: nextTotal,
      defeatedCount,
      contributors: contributors.slice(0, 15),
      lastUpdatedAt: nowMs,
    };
    const event: AiLiveActivityEvent = {
      id: `act_gb_${nowMs}`,
      timestamp: nowMs,
      kind: 'guild',
      actorName: playerName,
      summary: `vừa gây ${damage.toLocaleString('vi-VN')} sát thương lên Boss Bang Hội!`,
      accent: 'emerald',
    };
    this.state.activities = [event, ...this.state.activities].slice(0, 20);
    this.persist();
    this.emit({
      type: 'guild_boss:update',
      payload: { guildBossLive: this.state.guildBossLive, event },
    });
  }

  private handleGuildBossClaim(payload: Record<string, unknown>): void {
    const tierId = String(payload.tierId ?? '');
    const boss = this.state.guildBossLive;
    const milestone = boss.milestones.find((m) => m.tierId === tierId);
    if (!milestone) {
      this.emit({
        type: 'guild_boss:claim_ack',
        payload: {
          ok: false,
          alreadyClaimed: false,
          goldReward: 0,
          gemsReward: 0,
          guildCoinsReward: 0,
          message: 'Mốc thưởng Boss Bang không tồn tại.',
          state: boss,
        },
      });
      return;
    }
    if (boss.claimedMilestoneIds.includes(tierId)) {
      this.emit({
        type: 'guild_boss:claim_ack',
        payload: {
          ok: true,
          alreadyClaimed: true,
          goldReward: 0,
          gemsReward: 0,
          guildCoinsReward: 0,
          message: 'Bạn đã nhận mốc thưởng này rồi.',
          state: boss,
        },
      });
      return;
    }
    if (boss.totalDamage < milestone.damageRequired) {
      this.emit({
        type: 'guild_boss:claim_ack',
        payload: {
          ok: false,
          alreadyClaimed: false,
          goldReward: 0,
          gemsReward: 0,
          guildCoinsReward: 0,
          message: 'Chưa đủ tổng sát thương Bang Hội cho mốc này.',
          state: boss,
        },
      });
      return;
    }

    this.state.guildBossLive = {
      ...boss,
      claimedMilestoneIds: [...boss.claimedMilestoneIds, tierId],
    };
    this.persist();
    this.emit({
      type: 'guild_boss:claim_ack',
      payload: {
        ok: true,
        alreadyClaimed: false,
        goldReward: milestone.rewardGold,
        gemsReward: milestone.rewardGems,
        guildCoinsReward: milestone.rewardGuildCoins,
        message: `Đã nhận thưởng ${milestone.label}!`,
        state: this.state.guildBossLive,
      },
    });
  }

  private handleCupStart(payload: Record<string, unknown>, nowMs: number): void {
    const playerName =
      typeof payload.playerName === 'string' && payload.playerName.trim()
        ? payload.playerName.trim().slice(0, 24)
        : this.playerDisplayName;
    const heroId = normalizePlayableHeroId(payload.heroId);
    const powerRating = Math.max(500, Math.round(Number(payload.powerRating) || 2400));
    const duelRating = Math.max(800, Math.round(Number(payload.duelRating) || 1200));

    const human: LiveMiniCupParticipant = {
      id: 'human_player',
      displayName: playerName,
      isHuman: true,
      heroId,
      powerRating,
      duelRating,
    };
    const aiSeeds: LiveMiniCupParticipant[] = this.state.players.slice(0, 7).map((p) => ({
      id: p.id,
      displayName: p.displayName,
      isHuman: false,
      heroId: p.heroId,
      powerRating: p.powerRating,
      duelRating: p.duelRating,
    }));

    const pickWinner = (a: LiveMiniCupParticipant, b: LiveMiniCupParticipant) =>
      a.duelRating + a.powerRating * 0.05 >= b.duelRating + b.powerRating * 0.05 ? a : b;

    const r1m2Winner = pickWinner(aiSeeds[1], aiSeeds[2]);
    const r1m3Winner = pickWinner(aiSeeds[3], aiSeeds[4]);
    const r1m4Winner = pickWinner(aiSeeds[5], aiSeeds[6]);
    const r2m2Winner = pickWinner(r1m3Winner, r1m4Winner);

    const matches: LiveMiniCupMatch[] = [
      {
        matchId: `cup_r1_0_${nowMs}`,
        round: 1,
        slotIndex: 0,
        fighterA: human,
        fighterB: aiSeeds[0],
        winnerId: null,
        status: 'ready',
      },
      {
        matchId: `cup_r1_1_${nowMs}`,
        round: 1,
        slotIndex: 1,
        fighterA: aiSeeds[1],
        fighterB: aiSeeds[2],
        winnerId: r1m2Winner.id,
        status: 'completed',
        summary: `${r1m2Winner.displayName} thắng Tứ Kết`,
      },
      {
        matchId: `cup_r1_2_${nowMs}`,
        round: 1,
        slotIndex: 2,
        fighterA: aiSeeds[3],
        fighterB: aiSeeds[4],
        winnerId: r1m3Winner.id,
        status: 'completed',
        summary: `${r1m3Winner.displayName} thắng Tứ Kết`,
      },
      {
        matchId: `cup_r1_3_${nowMs}`,
        round: 1,
        slotIndex: 3,
        fighterA: aiSeeds[5],
        fighterB: aiSeeds[6],
        winnerId: r1m4Winner.id,
        status: 'completed',
        summary: `${r1m4Winner.displayName} thắng Tứ Kết`,
      },
      {
        matchId: `cup_r2_0_${nowMs}`,
        round: 2,
        slotIndex: 0,
        fighterA: null,
        fighterB: r1m2Winner,
        winnerId: null,
        status: 'pending',
      },
      {
        matchId: `cup_r2_1_${nowMs}`,
        round: 2,
        slotIndex: 1,
        fighterA: r1m3Winner,
        fighterB: r1m4Winner,
        winnerId: r2m2Winner.id,
        status: 'completed',
        summary: `${r2m2Winner.displayName} vào Chung Kết`,
      },
      {
        matchId: `cup_r3_0_${nowMs}`,
        round: 3,
        slotIndex: 0,
        fighterA: null,
        fighterB: r2m2Winner,
        winnerId: null,
        status: 'pending',
      },
    ];

    this.state.miniCup = {
      cupId: `cup_${nowMs}`,
      playerName,
      createdAt: nowMs,
      status: 'active',
      currentRound: 1,
      matches,
      prizeClaimed: false,
      rewardGems: 160,
      rewardGold: 3200,
      rewardTitleLabel: 'Quán Quân Mini-Cup 8 Người',
    };
    this.persist();
    this.emit({
      type: 'cup:state',
      payload: { cup: this.state.miniCup, rivals: this.state.rivals },
    });
  }

  private handleCupReportMatch(payload: Record<string, unknown>, _nowMs: number): void {
    const cup = this.state.miniCup;
    if (!cup || cup.status !== 'active') return;
    const matchId = String(payload.matchId ?? '');
    const playerWon = Boolean(payload.playerWon);

    const match = cup.matches.find((m) => m.matchId === matchId);
    if (!match || match.status === 'completed' || !match.fighterA || !match.fighterB) return;

    const winner = playerWon ? match.fighterA : match.fighterB;
    match.winnerId = winner.id;
    match.status = 'completed';
    match.summary = `${winner.displayName} giành chiến thắng`;

    if (!playerWon) {
      cup.status = 'eliminated';
      const finalMatch = cup.matches.find((m) => m.round === 3);
      cup.championName = finalMatch?.fighterB?.displayName || match.fighterB.displayName;
    } else if (match.round === 1) {
      const semi = cup.matches.find((m) => m.round === 2 && m.slotIndex === 0);
      if (semi) {
        semi.fighterA = match.fighterA;
        semi.status = 'ready';
      }
      cup.currentRound = 2;
    } else if (match.round === 2) {
      const finalMatch = cup.matches.find((m) => m.round === 3 && m.slotIndex === 0);
      if (finalMatch) {
        finalMatch.fighterA = match.fighterA;
        finalMatch.status = 'ready';
      }
      cup.currentRound = 3;
    } else {
      cup.status = 'champion';
      cup.championName = match.fighterA.displayName;
    }

    this.persist();
    this.emit({
      type: 'cup:state',
      payload: { cup: this.state.miniCup, rivals: this.state.rivals },
    });
  }

  private handleCupClaimPrize(): void {
    const cup = this.state.miniCup;
    if (!cup || cup.status === 'active') {
      this.emit({
        type: 'cup:prize_ack',
        payload: {
          ok: false,
          alreadyClaimed: false,
          goldReward: 0,
          gemsReward: 0,
          cup,
          message: 'Giải đấu vẫn đang diễn ra.',
        },
      });
      return;
    }
    if (cup.prizeClaimed) {
      this.emit({
        type: 'cup:prize_ack',
        payload: {
          ok: true,
          alreadyClaimed: true,
          goldReward: 0,
          gemsReward: 0,
          cup,
          message: 'Bạn đã nhận thưởng Mini-Cup này rồi.',
        },
      });
      return;
    }
    cup.prizeClaimed = true;
    const isChampion = cup.status === 'champion';
    const goldReward = isChampion ? cup.rewardGold : Math.round(cup.rewardGold * 0.4);
    const gemsReward = isChampion ? cup.rewardGems : Math.round(cup.rewardGems * 0.35);
    this.persist();
    this.emit({
      type: 'cup:prize_ack',
      payload: {
        ok: true,
        alreadyClaimed: false,
        goldReward,
        gemsReward,
        titleLabel: isChampion ? cup.rewardTitleLabel : undefined,
        cup,
        message: isChampion
          ? 'Chúc mừng Quán Quân Mini-Cup 8 Người!'
          : 'Đã nhận thưởng tham gia Mini-Cup!',
      },
    });
  }

  private handleBountyContribute(payload: Record<string, unknown>, nowMs: number): void {
    const playerName =
      typeof payload.playerName === 'string' && payload.playerName.trim()
        ? payload.playerName.trim().slice(0, 24)
        : this.playerDisplayName;
    const heroId = normalizePlayableHeroId(payload.heroId);
    const points = Math.max(5, Math.min(1000, Math.round(Number(payload.points) || 0)));

    const b = this.state.serverBounty;
    const nextPts = Math.min(b.targetPoints, b.currentPoints + points);
    const contributors = [...b.contributors];
    const idx = contributors.findIndex((c) => c.id === 'human_player');
    if (idx >= 0) {
      contributors[idx] = {
        ...contributors[idx],
        displayName: playerName,
        heroId,
        points: contributors[idx].points + points,
        lastContributedAt: nowMs,
      };
    } else {
      contributors.push({
        id: 'human_player',
        displayName: playerName,
        isHuman: true,
        heroId,
        points,
        lastContributedAt: nowMs,
      });
    }
    contributors.sort((a, b2) => b2.points - a.points);

    this.state.serverBounty = {
      ...b,
      currentPoints: nextPts,
      completed: nextPts >= b.targetPoints,
      contributors: contributors.slice(0, 15),
      lastUpdatedAt: nowMs,
    };
    this.persist();
    this.emit({
      type: 'bounty:update',
      payload: { serverBounty: this.state.serverBounty },
    });
  }

  private handleBountyClaim(): void {
    const b = this.state.serverBounty;
    if (!b.completed) {
      this.emit({
        type: 'bounty:claim_ack',
        payload: {
          ok: false,
          alreadyClaimed: false,
          goldReward: 0,
          gemsReward: 0,
          starDustReward: 0,
          message: 'Lệnh Truy Nã Toàn Máy Chủ chưa hoàn thành 100%.',
          state: b,
        },
      });
      return;
    }
    if (b.claimedByPlayer) {
      this.emit({
        type: 'bounty:claim_ack',
        payload: {
          ok: true,
          alreadyClaimed: true,
          goldReward: 0,
          gemsReward: 0,
          starDustReward: 0,
          message: 'Bạn đã nhận thưởng Truy Nã hôm nay rồi.',
          state: b,
        },
      });
      return;
    }
    this.state.serverBounty = { ...b, claimedByPlayer: true };
    this.persist();
    this.emit({
      type: 'bounty:claim_ack',
      payload: {
        ok: true,
        alreadyClaimed: false,
        goldReward: b.rewardGold,
        gemsReward: b.rewardGems,
        starDustReward: b.rewardStarDust,
        message: 'Đã nhận thưởng Lệnh Truy Nã Toàn Máy Chủ!',
        state: this.state.serverBounty,
      },
    });
  }

  private handleGuildWarStrike(payload: Record<string, unknown>, nowMs: number): void {
    const playerName =
      typeof payload.playerName === 'string' && payload.playerName.trim()
        ? payload.playerName.trim().slice(0, 24)
        : this.playerDisplayName;
    const bastionId = (payload.bastionId as GuildWarBastionId) || 'solar_spire';
    const mode = payload.mode === 'assault_3d' ? 'assault_3d' : 'quick_strike';
    const heroId = normalizePlayableHeroId(payload.heroId);
    const scoreGain = typeof payload.scoreGain === 'number' ? payload.scoreGain : undefined;

    const result = applyGuildWarBastionStrike(this.state.guildWarLive, {
      actorId: 'human_player',
      actorName: playerName,
      heroId,
      isHuman: true,
      faction: 'zodiac_guild',
      bastionId,
      mode,
      scoreGain,
      nowMs,
    });
    this.state.guildWarLive = result.nextState;
    const event: AiLiveActivityEvent = {
      id: `act_gw_${nowMs}`,
      timestamp: nowMs,
      kind: 'guild',
      actorName: playerName,
      summary: `đột kích ${result.bastion.name} mang về +${result.pointsAwarded} điểm Chiến Trường Bang!`,
      accent: 'amber',
    };
    this.state.activities = [event, ...this.state.activities].slice(0, 20);
    this.persist();
    this.emit({
      type: 'guild_war:update',
      payload: { guildWarLive: this.state.guildWarLive, event },
    });
  }

  private handleGuildWarClaim(): void {
    const war = this.state.guildWarLive;
    if (war.status === 'active') {
      this.emit({
        type: 'guild_war:claim_ack',
        payload: {
          ok: false,
          alreadyClaimed: false,
          goldReward: 0,
          gemsReward: 0,
          guildCoinsReward: 0,
          starDustReward: 0,
          message: 'Chiến Trường Bang vẫn đang giao tranh.',
          state: war,
        },
      });
      return;
    }
    if (war.claimedByPlayer) {
      this.emit({
        type: 'guild_war:claim_ack',
        payload: {
          ok: true,
          alreadyClaimed: true,
          goldReward: 0,
          gemsReward: 0,
          guildCoinsReward: 0,
          starDustReward: 0,
          message: 'Bạn đã nhận thưởng Chiến Trường Bang hôm nay.',
          state: war,
        },
      });
      return;
    }
    const mult = war.status === 'zodiac_victory' ? 1 : 0.6;
    this.state.guildWarLive = { ...war, claimedByPlayer: true };
    this.persist();
    this.emit({
      type: 'guild_war:claim_ack',
      payload: {
        ok: true,
        alreadyClaimed: false,
        goldReward: Math.round(war.rewardGold * mult),
        gemsReward: Math.round(war.rewardGems * mult),
        guildCoinsReward: Math.round(war.rewardGuildCoins * mult),
        starDustReward: Math.round(war.rewardStarDust * mult),
        message: 'Đã nhận thưởng Chiến Trường Bang Hội!',
        state: this.state.guildWarLive,
      },
    });
  }

  private handleSpectatorCheer(payload: Record<string, unknown>): void {
    const fighterId = String(payload.fighterId ?? '');
    const match = this.state.spectatorMatch;
    if (!match || match.status === 'finished') {
      this.emit({
        type: 'spectator:cheer_ack',
        payload: {
          ok: false,
          message: 'Trận đấu đã kết thúc, hãy chuyển sang trận tiếp theo.',
          state: match,
        },
      });
      return;
    }
    if (fighterId !== match.fighterA.aiPlayerId && fighterId !== match.fighterB.aiPlayerId) {
      this.emit({
        type: 'spectator:cheer_ack',
        payload: {
          ok: false,
          message: 'Tuyển thủ cổ vũ không hợp lệ.',
          state: match,
        },
      });
      return;
    }
    const updated: LiveSpectatorMatchSnapshot = {
      ...match,
      playerCheeredFighterId: fighterId,
      fighterA:
        fighterId === match.fighterA.aiPlayerId
          ? { ...match.fighterA, cheersCount: match.fighterA.cheersCount + 1 }
          : match.fighterA,
      fighterB:
        fighterId === match.fighterB.aiPlayerId
          ? { ...match.fighterB, cheersCount: match.fighterB.cheersCount + 1 }
          : match.fighterB,
    };
    this.state.spectatorMatch = updated;
    this.persist();
    this.emit({
      type: 'spectator:cheer_ack',
      payload: {
        ok: true,
        message: 'Đã ghi nhận phiếu cổ vũ của bạn!',
        state: updated,
      },
    });
  }

  private handleSpectatorClaim(): void {
    const match = this.state.spectatorMatch;
    if (!match || match.status !== 'finished') {
      this.emit({
        type: 'spectator:claim_ack',
        payload: {
          ok: false,
          alreadyClaimed: false,
          predictedCorrectly: false,
          goldReward: 0,
          gemsReward: 0,
          starDustReward: 0,
          message: 'Trận đấu chưa kết thúc.',
          state: match,
        },
      });
      return;
    }
    if (match.playerClaimedReward) {
      this.emit({
        type: 'spectator:claim_ack',
        payload: {
          ok: true,
          alreadyClaimed: true,
          predictedCorrectly: match.winnerId === match.playerCheeredFighterId,
          goldReward: 0,
          gemsReward: 0,
          starDustReward: 0,
          message: 'Bạn đã nhận thưởng cổ vũ trận này rồi.',
          state: match,
        },
      });
      return;
    }
    const reward = computeSpectatorCheerReward(match, match.playerCheeredFighterId);
    const updated: LiveSpectatorMatchSnapshot = {
      ...match,
      playerClaimedReward: true,
    };
    this.state.spectatorMatch = updated;
    this.persist();
    this.emit({
      type: 'spectator:claim_ack',
      payload: {
        ok: true,
        alreadyClaimed: false,
        predictedCorrectly: reward.predictedCorrectly,
        goldReward: reward.goldReward,
        gemsReward: reward.gemsReward,
        starDustReward: reward.starDustReward,
        message: reward.predictedCorrectly
          ? 'Dự đoán chính xác! Đã nhận 100% thưởng cổ vũ!'
          : 'Đã nhận thưởng cổ vũ khích lệ (50%)!',
        state: updated,
      },
    });
  }

  private handleSpectatorNextMatch(nowMs: number): void {
    this.state.spectatorMatchNumber += 1;
    this.state.spectatorMatch = createLiveSpectatorMatch(
      this.state.players.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        heroId: p.heroId,
        powerRating: p.powerRating,
        personality: p.personality,
      })),
      nowMs,
      this.state.spectatorMatchNumber
    );
    this.persist();
    this.emit({
      type: 'spectator:update',
      payload: { spectatorMatch: this.state.spectatorMatch },
    });
  }
}

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  AiLiveActivityEvent,
  AiLiveHubSnapshot,
  AiLivePlayerPersonality,
  AiLivePlayerProfile,
  AiLivePlayerStatus,
  HeroId,
} from '../types/game.ts';

interface LiveAiStoreData {
  version: 1;
  players: AiLivePlayerProfile[];
  activities: AiLiveActivityEvent[];
  processedDuelIds: Record<string, number>;
}

const INITIAL_AI_ROSTER: Array<{
  id: string;
  displayName: string;
  heroId: HeroId;
  powerRating: number;
  personality: AiLivePlayerPersonality;
  duelRating: number;
  weeklyPracticeBest: number;
}> = [
  { id: 'ai_linh_vu', displayName: 'Linh Vũ', heroId: 'artemis', powerRating: 4820, personality: 'tactical', duelRating: 1420, weeklyPracticeBest: 13850 },
  { id: 'ai_hao_thien', displayName: 'Hạo Thiên', heroId: 'alex', powerRating: 5340, personality: 'aggressive', duelRating: 1510, weeklyPracticeBest: 14920 },
  { id: 'ai_bach_tuyet', displayName: 'Bạch Tuyết', heroId: 'rolla', powerRating: 4190, personality: 'tactical', duelRating: 1365, weeklyPracticeBest: 12410 },
  { id: 'ai_sat_tinh', displayName: 'Sát Tinh', heroId: 'dracoola', powerRating: 5680, personality: 'assassin', duelRating: 1585, weeklyPracticeBest: 15380 },
  { id: 'ai_loi_de', displayName: 'Lôi Đế', heroId: 'thor', powerRating: 4980, personality: 'aggressive', duelRating: 1475, weeklyPracticeBest: 14120 },
  { id: 'ai_thanh_van', displayName: 'Thanh Vân', heroId: 'atreus', powerRating: 4460, personality: 'tactical', duelRating: 1390, weeklyPracticeBest: 13040 },
  { id: 'ai_hoa_phuong', displayName: 'Hỏa Phượng', heroId: 'cleo', powerRating: 4610, personality: 'aggressive', duelRating: 1440, weeklyPracticeBest: 13560 },
  { id: 'ai_te_thien', displayName: 'Tề Thiên', heroId: 'wukong', powerRating: 5910, personality: 'assassin', duelRating: 1620, weeklyPracticeBest: 15740 },
  { id: 'ai_nguyet_anh', displayName: 'Nguyệt Ảnh', heroId: 'artemis', powerRating: 3650, personality: 'tactical', duelRating: 1280, weeklyPracticeBest: 11200 },
  { id: 'ai_cuu_thien', displayName: 'Cửu Thiên', heroId: 'thor', powerRating: 5490, personality: 'aggressive', duelRating: 1540, weeklyPracticeBest: 14680 },
  { id: 'ai_kiet_tac', displayName: 'Kiệt Tác', heroId: 'dracoola', powerRating: 4320, personality: 'aggressive', duelRating: 1340, weeklyPracticeBest: 12650 },
  { id: 'ai_tinh_ha', displayName: 'Tinh Hà', heroId: 'rolla', powerRating: 3880, personality: 'tactical', duelRating: 1310, weeklyPracticeBest: 11890 },
  { id: 'ai_minh_triet', displayName: 'Minh Triết', heroId: 'atreus', powerRating: 3290, personality: 'tactical', duelRating: 1215, weeklyPracticeBest: 10450 },
  { id: 'ai_phong_van', displayName: 'Phong Vân', heroId: 'wukong', powerRating: 4720, personality: 'assassin', duelRating: 1460, weeklyPracticeBest: 13940 },
  { id: 'ai_duong_quang', displayName: 'Dương Quang', heroId: 'alex', powerRating: 3960, personality: 'aggressive', duelRating: 1325, weeklyPracticeBest: 12100 },
  { id: 'ai_han_bang', displayName: 'Hàn Băng', heroId: 'rolla', powerRating: 4510, personality: 'tactical', duelRating: 1410, weeklyPracticeBest: 13290 },
  { id: 'ai_kiem_thanh', displayName: 'Kiếm Thánh', heroId: 'wukong', powerRating: 5120, personality: 'assassin', duelRating: 1495, weeklyPracticeBest: 14350 },
  { id: 'ai_thien_duyen', displayName: 'Thiên Duyên', heroId: 'cleo', powerRating: 3420, personality: 'tactical', duelRating: 1245, weeklyPracticeBest: 10860 },
];

const STATUS_DETAILS: Record<AiLivePlayerStatus, string[]> = {
  lobby: ['Đang chỉnh đội hình tại Sảnh', 'Đang rèn trang bị Sử Thi', 'Đang xem Bảng Hạng Tuần'],
  campaign: ['Đang leo Chương 1 · Ải 8', 'Đang săn Sư Vương Chương 1', 'Đang vượt Chương 2 · Ải 6', 'Đang đánh Tháp Nguyên Tố'],
  weekly_practice: ['Đang tập né đòn Boss Tuần', 'Đang thử chuỗi Tụ Lực Boss Tuần'],
  ready_duel: ['Sẵn sàng nhận thách đấu 1v1', 'Đang tìm đối thủ 1v1 trực tiếp'],
  in_duel: ['Đang giao tranh 1v1 Đấu Trường'],
};

const MAX_ACTIVITY_HISTORY = 24;

export class LiveAiPlayersService {
  private readonly storePath: string;
  private store: LiveAiStoreData;
  private tickCounter = 0;

  constructor(storePath = path.resolve(process.cwd(), '.data/live-ai-players.json')) {
    this.storePath = storePath;
    this.store = this.loadStore();
  }

  private createSeededInitialStore(nowMs = Date.now()): LiveAiStoreData {
    const statuses: AiLivePlayerStatus[] = [
      'ready_duel',
      'campaign',
      'ready_duel',
      'weekly_practice',
      'ready_duel',
      'lobby',
    ];
    const players: AiLivePlayerProfile[] = INITIAL_AI_ROSTER.map((seed, idx) => {
      const status = statuses[idx % statuses.length];
      const details = STATUS_DETAILS[status];
      return {
        id: seed.id,
        displayName: seed.displayName,
        tag: '[AI Live]',
        heroId: seed.heroId,
        powerRating: seed.powerRating,
        personality: seed.personality,
        status,
        statusDetail: details[idx % details.length],
        weeklyPracticeBest: seed.weeklyPracticeBest,
        duelRating: seed.duelRating,
        duelWins: 8 + (idx % 14),
        duelLosses: 4 + (idx % 9),
        winStreak: idx % 4,
        lastActiveAt: nowMs - idx * 14_000,
      };
    });

    const activities: AiLiveActivityEvent[] = [
      {
        id: `evt_init_1`,
        timestamp: nowMs - 45_000,
        kind: 'weekly_practice',
        actorName: 'Tề Thiên [AI Live]',
        summary: 'hoàn thành lượt Tập Boss Tuần với 15.740 điểm ước lượng (0 lần dính Slam).',
        accent: 'amber',
      },
      {
        id: `evt_init_2`,
        timestamp: nowMs - 24_000,
        kind: 'campaign',
        actorName: 'Linh Vũ [AI Live]',
        summary: 'vừa hạ Sư Vương Thái Dương và mở khóa trang bị Sử Thi mới.',
        accent: 'emerald',
      },
      {
        id: `evt_init_3`,
        timestamp: nowMs - 9_000,
        kind: 'status',
        actorName: 'Sát Tinh [AI Live]',
        summary: 'đã vào hàng chờ Đấu Trường 1v1 · Sẵn sàng nhận thách đấu!',
        accent: 'sky',
      },
    ];

    return {
      version: 1,
      players,
      activities,
      processedDuelIds: {},
    };
  }

  private loadStore(): LiveAiStoreData {
    try {
      if (!fs.existsSync(this.storePath)) {
        return this.createSeededInitialStore();
      }
      const raw = fs.readFileSync(this.storePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<LiveAiStoreData>;
      if (parsed && parsed.version === 1 && Array.isArray(parsed.players) && parsed.players.length >= 8) {
        return {
          version: 1,
          players: parsed.players,
          activities: Array.isArray(parsed.activities) ? parsed.activities.slice(0, MAX_ACTIVITY_HISTORY) : [],
          processedDuelIds: parsed.processedDuelIds && typeof parsed.processedDuelIds === 'object' ? parsed.processedDuelIds : {},
        };
      }
      return this.createSeededInitialStore();
    } catch {
      return this.createSeededInitialStore();
    }
  }

  private persistStore(): void {
    try {
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const tmpPath = `${this.storePath}.${process.pid}.${Date.now()}.tmp`;
      fs.writeFileSync(tmpPath, JSON.stringify(this.store, null, 2), 'utf8');
      fs.renameSync(tmpPath, this.storePath);
    } catch {
      // Non-fatal in read-only or ephemeral test environments
    }
  }

  private pushActivity(event: AiLiveActivityEvent): AiLiveActivityEvent {
    this.store.activities = [event, ...this.store.activities].slice(0, MAX_ACTIVITY_HISTORY);
    return event;
  }

  public getSnapshot(onlineHumanCount: number, nowMs = Date.now()): AiLiveHubSnapshot {
    const sortedPlayers = [...this.store.players].sort((a, b) => {
      const aReady = a.status === 'ready_duel' ? 1 : 0;
      const bReady = b.status === 'ready_duel' ? 1 : 0;
      if (bReady !== aReady) return bReady - aReady;
      return b.duelRating - a.duelRating;
    });
    return {
      serverNow: nowMs,
      onlineHumanCount: Math.max(1, onlineHumanCount),
      onlineAiCount: this.store.players.length,
      players: sortedPlayers,
      activities: this.store.activities.slice(0, 18),
    };
  }

  public getPlayerById(aiPlayerId: string): AiLivePlayerProfile | null {
    return this.store.players.find((p) => p.id === aiPlayerId) ?? null;
  }

  /**
   * Advances the server-authoritative real-time AI player ecosystem by one simulation step.
   * Returns the newly generated live event to broadcast over WebSocket.
   */
  public simulateServerTick(nowMs = Date.now()): {
    updatedPlayer: AiLivePlayerProfile;
    event: AiLiveActivityEvent;
  } {
    this.tickCounter += 1;
    const idx = (this.tickCounter * 5 + Math.floor(nowMs / 1000)) % this.store.players.length;
    const player = this.store.players[idx];

    // Keep at least ~45% of AI players ready for instant 1v1 duels
    const readyCount = this.store.players.filter((p) => p.status === 'ready_duel').length;
    const cycle: AiLivePlayerStatus[] =
      readyCount < 7
        ? ['ready_duel', 'ready_duel', 'campaign', 'weekly_practice']
        : ['campaign', 'weekly_practice', 'ready_duel', 'lobby'];

    const nextStatus = cycle[(this.tickCounter + idx) % cycle.length];
    const details = STATUS_DETAILS[nextStatus];
    player.status = nextStatus;
    player.statusDetail = details[(this.tickCounter + idx) % details.length];
    player.lastActiveAt = nowMs;

    let event: AiLiveActivityEvent;
    if (nextStatus === 'weekly_practice') {
      const delta = ((this.tickCounter * 73) % 320) - 80;
      const runScore = Math.max(8500, Math.min(16800, player.weeklyPracticeBest + delta));
      if (runScore > player.weeklyPracticeBest) {
        player.weeklyPracticeBest = runScore;
      }
      event = this.pushActivity({
        id: `evt_${nowMs}_${crypto.randomBytes(3).toString('hex')}`,
        timestamp: nowMs,
        kind: 'weekly_practice',
        actorName: `${player.displayName} ${player.tag}`,
        summary: `vừa hoàn tất Tập Boss Tuần đạt ${runScore.toLocaleString('vi-VN')} điểm ước lượng.`,
        accent: 'amber',
      });
    } else if (nextStatus === 'campaign') {
      player.powerRating = Math.min(9999, player.powerRating + ((this.tickCounter % 3) === 0 ? 15 : 0));
      event = this.pushActivity({
        id: `evt_${nowMs}_${crypto.randomBytes(3).toString('hex')}`,
        timestamp: nowMs,
        kind: 'campaign',
        actorName: `${player.displayName} ${player.tag}`,
        summary: `${player.statusDetail.toLowerCase()} (Lực Chiến ${player.powerRating.toLocaleString('vi-VN')}).`,
        accent: 'emerald',
      });
    } else if (nextStatus === 'ready_duel') {
      event = this.pushActivity({
        id: `evt_${nowMs}_${crypto.randomBytes(3).toString('hex')}`,
        timestamp: nowMs,
        kind: 'status',
        actorName: `${player.displayName} ${player.tag}`,
        summary: `mở khiêu chiến 1v1 Đấu Trường (Điểm hạng ${player.duelRating}).`,
        accent: 'sky',
      });
    } else {
      event = this.pushActivity({
        id: `evt_${nowMs}_${crypto.randomBytes(3).toString('hex')}`,
        timestamp: nowMs,
        kind: 'status',
        actorName: `${player.displayName} ${player.tag}`,
        summary: `${player.statusDetail.toLowerCase()}.`,
        accent: 'sky',
      });
    }

    if (this.tickCounter % 4 === 0) {
      this.persistStore();
    }

    return { updatedPlayer: player, event };
  }

  public recordWeeklyBossRankEvent(params: {
    displayName: string;
    rank: number;
    verifiedScore: number;
    cleared: boolean;
    nowMs?: number;
  }): AiLiveActivityEvent {
    const nowMs = params.nowMs ?? Date.now();
    const event = this.pushActivity({
      id: `evt_wb_${nowMs}_${crypto.randomBytes(3).toString('hex')}`,
      timestamp: nowMs,
      kind: 'weekly_rank',
      actorName: params.displayName,
      summary: `lập kỷ lục Boss Tuần Tính Hạng #${params.rank} với ${params.verifiedScore.toLocaleString('vi-VN')} điểm xác minh${params.cleared ? ' (Hạ Boss!)' : ''}!`,
      accent: 'amber',
    });
    this.persistStore();
    return event;
  }

  public startDuelChallenge(
    aiPlayerId: string,
    challengerName: string,
    nowMs = Date.now()
  ): {
    duelId: string;
    opponent: AiLivePlayerProfile;
    event: AiLiveActivityEvent;
  } | null {
    const opponent = this.getPlayerById(aiPlayerId);
    if (!opponent) return null;
    opponent.status = 'in_duel';
    opponent.statusDetail = `Đang đấu 1v1 với ${challengerName}`;
    opponent.lastActiveAt = nowMs;

    const duelId = `duel_${nowMs}_${crypto.randomBytes(4).toString('hex')}`;
    const event = this.pushActivity({
      id: `evt_${duelId}`,
      timestamp: nowMs,
      kind: 'duel_result',
      actorName: challengerName,
      summary: `vừa gửi lời thách đấu 1v1 trực tiếp tới ${opponent.displayName} ${opponent.tag}!`,
      accent: 'sky',
    });
    return { duelId, opponent, event };
  }

  public completeDuel(params: {
    duelId: string;
    aiPlayerId: string;
    challengerName: string;
    playerWon: boolean;
    durationSec: number;
    nowMs?: number;
  }): {
    alreadyProcessed: boolean;
    opponent: AiLivePlayerProfile | null;
    ratingDelta: number;
    event?: AiLiveActivityEvent;
  } {
    const nowMs = params.nowMs ?? Date.now();
    const opponent = this.getPlayerById(params.aiPlayerId);
    if (!opponent) {
      return { alreadyProcessed: false, opponent: null, ratingDelta: 0 };
    }

    if (this.store.processedDuelIds[params.duelId]) {
      return { alreadyProcessed: true, opponent, ratingDelta: 0 };
    }

    this.store.processedDuelIds[params.duelId] = nowMs;
    const ratingDelta = params.playerWon ? 24 : -10;
    if (params.playerWon) {
      opponent.duelLosses += 1;
      opponent.winStreak = 0;
      opponent.duelRating = Math.max(950, opponent.duelRating - 12);
    } else {
      opponent.duelWins += 1;
      opponent.winStreak += 1;
      opponent.duelRating += 16;
    }
    opponent.status = 'ready_duel';
    opponent.statusDetail = 'Sẵn sàng nhận thách đấu 1v1';
    opponent.lastActiveAt = nowMs;

    const cleanDur = Math.max(1, Math.round(params.durationSec));
    const event = this.pushActivity({
      id: `evt_res_${params.duelId}`,
      timestamp: nowMs,
      kind: 'duel_result',
      actorName: params.challengerName,
      summary: params.playerWon
        ? `đánh bại ${opponent.displayName} ${opponent.tag} trong ${cleanDur}s (+${ratingDelta} điểm 1v1)!`
        : `thất thủ trước ${opponent.displayName} ${opponent.tag} sau ${cleanDur}s giao tranh căng thẳng.`,
      accent: params.playerWon ? 'emerald' : 'rose',
    });

    this.persistStore();
    return { alreadyProcessed: false, opponent, ratingDelta, event };
  }
}

import { isPlayableHeroId, normalizePlayableHeroId } from '../data/heroesData';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import type {
  AiLiveActivityEvent,
  AiLiveAuctionBidEvent,
  AiLiveAuctionSyncLot,
  AiLiveBuildSnapshot,
  AiLiveChatChannel,
  AiLiveChatMessage,
  AiLiveHubSnapshot,
  AiLiveInvite,
  AiLivePlayerPersonality,
  AiLivePlayerProfile,
  AiLivePlayerStatus,
  AiRivalRecord,
  AiRivalTier,
  AvatarFrameId,
  HeroId,
  LiveGuildBossContributor,
  LiveGuildBossMilestone,
  LiveGuildBossState,
  LiveMiniCupMatch,
  LiveMiniCupParticipant,
  LiveMiniCupState,
  LiveServerBountyContributor,
  LiveServerBountyState,
} from '../types/game.ts';
import {
  applyGuildWarBastionStrike,
  createInitialLiveGuildWarState,
  derivePlayerAdaptationProfile,
  tickLiveGuildWarAiSkirmish,
  type AiPlayerAdaptationProfile,
  type GuildWarBastionId,
  type LiveGuildWarState,
  type PlayerCombatTelemetryInput,
} from '../engine/wave10FivePillars.ts';
import {
  computeSpectatorCheerReward,
  createLiveSpectatorMatch,
  stepLiveSpectatorMatch,
  type LiveSpectatorMatchState,
} from '../engine/wave11FivePillars.ts';

import { ACCOUNT_RESET_EPOCH } from '../services/accountHydrationPolicy.ts';

interface LiveAiStoreData {
  version: 1;
  resetEpoch?: number;
  players: AiLivePlayerProfile[];
  activities: AiLiveActivityEvent[];
  processedDuelIds: Record<string, number>;
  chatHistory?: {
    lobby: AiLiveChatMessage[];
    guild: AiLiveChatMessage[];
  };
  rivalsByPlayer?: Record<string, Record<string, AiRivalRecord>>;
  respondedInviteIds?: Record<string, 'accepted' | 'declined'>;
  guildBossLive?: LiveGuildBossState;
  guildBossClaimsByPlayer?: Record<string, Record<string, boolean>>;
  miniCupsByPlayer?: Record<string, LiveMiniCupState>;
  serverBounty?: LiveServerBountyState;
  serverBountyClaimsByPlayer?: Record<string, boolean>;
  adaptationByPlayer?: Record<string, AiPlayerAdaptationProfile>;
  guildWarLive?: LiveGuildWarState;
  guildWarClaimsByPlayer?: Record<string, boolean>;
  spectatorMatch?: LiveSpectatorMatchState;
  spectatorMatchSeq?: number;
  spectatorCheersByMatch?: Record<string, Record<string, string>>;
  spectatorClaimsByMatch?: Record<string, Record<string, boolean>>;
}

const MAX_CHAT_PER_CHANNEL = 40;

function buildDefaultAiBuildSnapshot(seed: RosterSeed): AiLiveBuildSnapshot {
  const weaponByHero: Record<HeroId, string> = {
    artemis: 'Cung Ngân Hà Tinh Tú +20',
    hatsune_miku: 'Cung Nhịp Điệu +20',
    aurelia: 'Cung Thái Dương Regulus +20',
    bellona: 'Cung Hỏa Sơn Bạch Dương',
  };
  const mountPool = ['Hắc Long'];
  const wingPool = [
    'Cánh Thiên Sứ Hoàng Đạo',
    'Cánh Nhật Thực Bóng Đêm',
    'Cánh Phượng Hoàng Lửa',
    'Cánh Tinh Tú Pha Lê',
  ];
  const hash = seed.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const tacticSummary =
    seed.personality === 'assassin'
      ? 'Áp sát dứt điểm nhanh, ưu tiên Né Hoàn Hảo phản đòn Chí Mạng.'
      : seed.personality === 'aggressive'
      ? 'Ép nhịp bắn liên hoàn, tối ưu Tụ Lực + Đa Tiễn phá giáp Boss.'
      : 'Giữ cự ly chuẩn, đọc vòng báo đòn Boss và phối hợp Liên Kích Co-op.';
  const favoriteSkills =
    seed.personality === 'assassin'
      ? ['Bắn Đôi', 'Phản Tiễn', 'Chí Mạng Đột Biến']
      : seed.personality === 'aggressive'
      ? ['Đa Tiễn', 'Tụ Lực Cực Đại', 'Mưa Tên Lôi Đình']
      : ['Bắn Đôi', 'Khiên Tinh Tú', 'Băng Tiễn Làm Chậm'];

  return {
    weaponName: weaponByHero[seed.heroId] ?? 'Cung Tinh Giới Sử Thi +18',
    armorName: seed.powerRating >= 5000 ? 'Thần Giáp Chí Tôn +20' : 'Chiến Giáp Hoàng Đạo +16',
    mountName: mountPool[hash % mountPool.length],
    wingName: wingPool[hash % wingPool.length],
    tacticSummary,
    favoriteSkills,
  };
}

function createInitialChatHistory(nowMs: number): {
  lobby: AiLiveChatMessage[];
  guild: AiLiveChatMessage[];
} {
  return {
    lobby: [
      {
        id: 'chat_init_lobby_1',
        channel: 'lobby',
        senderName: 'Tề Thiên',
        senderTag: '[AI Live]',
        aiPlayerId: 'ai_te_thien',
        heroId: 'aurelia',
        text: 'Ai vào Co-op 3D Thần Thoại săn mảnh Sử Thi cùng mình không?',
        timestamp: nowMs - 115_000,
      },
      {
        id: 'chat_init_lobby_2',
        channel: 'lobby',
        senderName: 'Linh Vũ',
        senderTag: '[AI Live]',
        aiPlayerId: 'ai_linh_vu',
        heroId: 'aurelia',
        text: 'Boss Tuần này đọc vòng Quét Vòng né đúng nhịp ăn thêm +125 điểm Né Hoàn Hảo ngon lắm!',
        timestamp: nowMs - 68_000,
      },
      {
        id: 'chat_init_lobby_3',
        channel: 'lobby',
        senderName: 'Cửu Thiên',
        senderTag: '[AI Live]',
        aiPlayerId: 'ai_cuu_thien',
        heroId: 'bellona',
        text: 'Đang mở phòng Arena 1v1 trực tiếp, anh em vào giao lưu kiểm tra đội hình nhé!',
        timestamp: nowMs - 24_000,
      },
    ],
    guild: [
      {
        id: 'chat_init_guild_1',
        channel: 'guild',
        senderName: 'Tề Thiên',
        senderTag: '[AI Live]',
        aiPlayerId: 'ai_te_thien',
        heroId: 'aurelia',
        text: 'Anh em Bang Hoàng Đạo nhớ đánh đủ lượt Boss Bang Thái Cổ Ma Long lấy rương ngày nhé!',
        timestamp: nowMs - 95_000,
      },
      {
        id: 'chat_init_guild_2',
        channel: 'guild',
        senderName: 'Sát Tinh',
        senderTag: '[AI Live]',
        aiPlayerId: 'ai_sat_tinh',
        heroId: 'bellona',
        text: 'Mình vừa đẩy mốc Boss Bang lên 129.400 ST, còn 1 mốc rương nữa là full tuần!',
        timestamp: nowMs - 41_000,
      },
    ],
  };
}

interface RosterSeed {
  id: string;
  displayName: string;
  heroId: HeroId;
  powerRating: number;
  highestChapterCleared: number;
  worldBossBestDamage: number;
  bestTowerFloor: number;
  personality: AiLivePlayerPersonality;
  duelRating: number;
  weeklyPracticeBest: number;
  weeklyPracticeClearTimeMs: number | null;
  guildRole: string;
  guildContribution: number;
  guildBossDamage: number;
  titleBadge: string;
  frameId: AvatarFrameId;
}

const INITIAL_AI_ROSTER: RosterSeed[] = [
  { id: 'ai_te_thien', displayName: 'Tề Thiên', heroId: 'aurelia', powerRating: 5910, highestChapterCleared: 10, worldBossBestDamage: 168400, bestTowerFloor: 48, personality: 'assassin', duelRating: 1620, weeklyPracticeBest: 15740, weeklyPracticeClearTimeMs: 31200, guildRole: 'Bang Chủ', guildContribution: 9850, guildBossDamage: 142600, titleBadge: 'Chí Tôn Tinh Giới', frameId: 'world_dragon' },
  { id: 'ai_sat_tinh', displayName: 'Sát Tinh', heroId: 'bellona', powerRating: 5680, highestChapterCleared: 9, worldBossBestDamage: 154200, bestTowerFloor: 45, personality: 'assassin', duelRating: 1585, weeklyPracticeBest: 15380, weeklyPracticeClearTimeMs: 33400, guildRole: 'Phó Bang', guildContribution: 8620, guildBossDamage: 129400, titleBadge: 'Ảnh Sát Hoàng Đạo', frameId: 'royal_vip' },
  { id: 'ai_cuu_thien', displayName: 'Cửu Thiên', heroId: 'bellona', powerRating: 5490, highestChapterCleared: 9, worldBossBestDamage: 146800, bestTowerFloor: 43, personality: 'aggressive', duelRating: 1540, weeklyPracticeBest: 14680, weeklyPracticeClearTimeMs: 36100, guildRole: 'Phó Bang', guildContribution: 8140, guildBossDamage: 121800, titleBadge: 'Lôi Thần Chinh Phạt', frameId: 'seraph_crown' },
  { id: 'ai_hao_thien', displayName: 'Hạo Thiên', heroId: 'aurelia', powerRating: 5340, highestChapterCleared: 8, worldBossBestDamage: 138500, bestTowerFloor: 41, personality: 'aggressive', duelRating: 1510, weeklyPracticeBest: 14920, weeklyPracticeClearTimeMs: 35300, guildRole: 'Tinh Anh', guildContribution: 7490, guildBossDamage: 114200, titleBadge: 'Hạo Nhật Thần Xạ', frameId: 'royal_vip' },
  { id: 'ai_kiem_thanh', displayName: 'Kiếm Thánh', heroId: 'bellona', powerRating: 5120, highestChapterCleared: 8, worldBossBestDamage: 129600, bestTowerFloor: 39, personality: 'assassin', duelRating: 1495, weeklyPracticeBest: 14350, weeklyPracticeClearTimeMs: 38200, guildRole: 'Tinh Anh', guildContribution: 6980, guildBossDamage: 108500, titleBadge: 'Vô Song Kiếm Ảnh', frameId: 'crystal_guardian' },
  { id: 'ai_loi_de', displayName: 'Lôi Đế', heroId: 'aurelia', powerRating: 4980, highestChapterCleared: 7, worldBossBestDamage: 122400, bestTowerFloor: 37, personality: 'aggressive', duelRating: 1475, weeklyPracticeBest: 14120, weeklyPracticeClearTimeMs: 39400, guildRole: 'Tinh Anh', guildContribution: 6420, guildBossDamage: 99800, titleBadge: 'Lôi Đình Hộ Pháp', frameId: 'seraph_crown' },
  { id: 'ai_linh_vu', displayName: 'Linh Vũ', heroId: 'aurelia', powerRating: 4820, highestChapterCleared: 7, worldBossBestDamage: 118900, bestTowerFloor: 35, personality: 'tactical', duelRating: 1420, weeklyPracticeBest: 13850, weeklyPracticeClearTimeMs: 41100, guildRole: 'Tinh Anh', guildContribution: 6150, guildBossDamage: 94200, titleBadge: 'Thần Xạ Ngân Hà', frameId: 'astral_crescent' },
  { id: 'ai_phong_van', displayName: 'Phong Vân', heroId: 'bellona', powerRating: 4720, highestChapterCleared: 6, worldBossBestDamage: 110500, bestTowerFloor: 33, personality: 'assassin', duelRating: 1460, weeklyPracticeBest: 13940, weeklyPracticeClearTimeMs: 40600, guildRole: 'Tinh Vệ', guildContribution: 5640, guildBossDamage: 87400, titleBadge: 'Liệt Phong Săn Boss', frameId: 'crystal_guardian' },
  { id: 'ai_hoa_phuong', displayName: 'Hỏa Phượng', heroId: 'aurelia', powerRating: 4610, highestChapterCleared: 6, worldBossBestDamage: 104200, bestTowerFloor: 31, personality: 'aggressive', duelRating: 1440, weeklyPracticeBest: 13560, weeklyPracticeClearTimeMs: 43200, guildRole: 'Tinh Vệ', guildContribution: 5210, guildBossDamage: 82900, titleBadge: 'Phượng Hoàng Cháy Rực', frameId: 'royal_vip' },
  { id: 'ai_han_bang', displayName: 'Hàn Băng', heroId: 'bellona', powerRating: 4510, highestChapterCleared: 6, worldBossBestDamage: 98400, bestTowerFloor: 30, personality: 'tactical', duelRating: 1410, weeklyPracticeBest: 13290, weeklyPracticeClearTimeMs: 44800, guildRole: 'Tinh Vệ', guildContribution: 4890, guildBossDamage: 78600, titleBadge: 'Hàn Sương Thánh Nữ', frameId: 'astral_crescent' },
  { id: 'ai_thanh_van', displayName: 'Thanh Vân', heroId: 'aurelia', powerRating: 4460, highestChapterCleared: 5, worldBossBestDamage: 93200, bestTowerFloor: 28, personality: 'tactical', duelRating: 1390, weeklyPracticeBest: 13040, weeklyPracticeClearTimeMs: 46500, guildRole: 'Tinh Vệ', guildContribution: 4560, guildBossDamage: 74200, titleBadge: 'Thanh Vân Vệ Sĩ', frameId: 'default_gold' },
  { id: 'ai_kiet_tac', displayName: 'Kiệt Tác', heroId: 'bellona', powerRating: 4320, highestChapterCleared: 5, worldBossBestDamage: 88600, bestTowerFloor: 26, personality: 'aggressive', duelRating: 1340, weeklyPracticeBest: 12650, weeklyPracticeClearTimeMs: 48900, guildRole: 'Tinh Vệ', guildContribution: 4180, guildBossDamage: 69500, titleBadge: 'Huyết Nguyệt Kỵ Sĩ', frameId: 'crystal_guardian' },
  { id: 'ai_bach_tuyet', displayName: 'Bạch Tuyết', heroId: 'aurelia', powerRating: 4190, highestChapterCleared: 5, worldBossBestDamage: 84100, bestTowerFloor: 25, personality: 'tactical', duelRating: 1365, weeklyPracticeBest: 12410, weeklyPracticeClearTimeMs: 50200, guildRole: 'Thành Viên', guildContribution: 3920, guildBossDamage: 65100, titleBadge: 'Băng Tuyết Pháp Sư', frameId: 'astral_crescent' },
  { id: 'ai_duong_quang', displayName: 'Dương Quang', heroId: 'bellona', powerRating: 3960, highestChapterCleared: 4, worldBossBestDamage: 76500, bestTowerFloor: 22, personality: 'aggressive', duelRating: 1325, weeklyPracticeBest: 12100, weeklyPracticeClearTimeMs: 52600, guildRole: 'Thành Viên', guildContribution: 3480, guildBossDamage: 58900, titleBadge: 'Nhật Luân Cung Thủ', frameId: 'default_gold' },
  { id: 'ai_tinh_ha', displayName: 'Tinh Hà', heroId: 'aurelia', powerRating: 3880, highestChapterCleared: 4, worldBossBestDamage: 71900, bestTowerFloor: 20, personality: 'tactical', duelRating: 1310, weeklyPracticeBest: 11890, weeklyPracticeClearTimeMs: 54100, guildRole: 'Thành Viên', guildContribution: 3190, guildBossDamage: 54300, titleBadge: 'Tinh Hà Chiêm Tinh', frameId: 'astral_crescent' },
  { id: 'ai_nguyet_anh', displayName: 'Nguyệt Ảnh', heroId: 'aurelia', powerRating: 3650, highestChapterCleared: 3, worldBossBestDamage: 64800, bestTowerFloor: 18, personality: 'tactical', duelRating: 1280, weeklyPracticeBest: 11200, weeklyPracticeClearTimeMs: 57900, guildRole: 'Thành Viên', guildContribution: 2840, guildBossDamage: 48600, titleBadge: 'Nguyệt Quang Xạ Thủ', frameId: 'default_gold' },
  { id: 'ai_thien_duyen', displayName: 'Thiên Duyên', heroId: 'bellona', powerRating: 3420, highestChapterCleared: 3, worldBossBestDamage: 58200, bestTowerFloor: 15, personality: 'tactical', duelRating: 1245, weeklyPracticeBest: 10860, weeklyPracticeClearTimeMs: 61400, guildRole: 'Thành Viên', guildContribution: 2510, guildBossDamage: 43200, titleBadge: 'Thiên Duyên Hỏa Vũ', frameId: 'default_gold' },
  { id: 'ai_minh_triet', displayName: 'Minh Triết', heroId: 'bellona', powerRating: 3290, highestChapterCleared: 2, worldBossBestDamage: 52400, bestTowerFloor: 13, personality: 'tactical', duelRating: 1215, weeklyPracticeBest: 10450, weeklyPracticeClearTimeMs: null, guildRole: 'Thành Viên', guildContribution: 2180, guildBossDamage: 38900, titleBadge: 'Tân Tinh Hoàng Đạo', frameId: 'default_gold' },
];

const SEED_BY_ID = new Map<string, RosterSeed>(INITIAL_AI_ROSTER.map((s) => [s.id, s]));

const STATUS_DETAILS: Record<AiLivePlayerStatus, string[]> = {
  lobby: ['Đang chỉnh đội hình tại Sảnh', 'Đang theo dõi Sàn Đấu Giá', 'Đang xem Bảng Vinh Danh'],
  campaign: [
    'Đang leo Tháp Vô Tận',
    'Đang săn Boss Thế Giới Liên Server',
    'Đang đánh Boss Bang Thái Cổ Ma Long',
    'Đang vượt Chương cao · Săn đồ Sử Thi',
  ],
  weekly_practice: ['Đang tập né đòn Boss Tuần', 'Đang tối ưu chuỗi Tụ Lực Boss Tuần'],
  ready_duel: ['Sẵn sàng nhận thách đấu 1v1', 'Đang tìm đối thủ Arena 1v1 trực tiếp'],
  in_duel: ['Đang giao tranh 1v1 Đấu Trường'],
};

const MAX_ACTIVITY_HISTORY = 28;

function normalizeAiPlayerProfile(
  raw: Partial<AiLivePlayerProfile> & { id: string },
  fallbackIndex: number,
  nowMs: number
): AiLivePlayerProfile {
  const seed = SEED_BY_ID.get(raw.id) ?? INITIAL_AI_ROSTER[fallbackIndex % INITIAL_AI_ROSTER.length];
  const heroId = isPlayableHeroId(raw.heroId) ? raw.heroId : seed.heroId;
  return {
    id: raw.id || seed.id,
    displayName: raw.displayName || seed.displayName,
    tag: '[AI Live]',
    heroId,
    powerRating: typeof raw.powerRating === 'number' && raw.powerRating > 0 ? raw.powerRating : seed.powerRating,
    highestChapterCleared:
      typeof raw.highestChapterCleared === 'number' && raw.highestChapterCleared >= 1
        ? raw.highestChapterCleared
        : seed.highestChapterCleared,
    worldBossBestDamage:
      typeof raw.worldBossBestDamage === 'number' && raw.worldBossBestDamage > 0
        ? raw.worldBossBestDamage
        : seed.worldBossBestDamage,
    bestTowerFloor:
      typeof raw.bestTowerFloor === 'number' && raw.bestTowerFloor > 0
        ? raw.bestTowerFloor
        : seed.bestTowerFloor,
    weeklyPracticeBest:
      typeof raw.weeklyPracticeBest === 'number' && raw.weeklyPracticeBest > 0
        ? raw.weeklyPracticeBest
        : seed.weeklyPracticeBest,
    weeklyPracticeClearTimeMs:
      typeof raw.weeklyPracticeClearTimeMs === 'number'
        ? raw.weeklyPracticeClearTimeMs
        : raw.weeklyPracticeClearTimeMs === null
        ? null
        : seed.weeklyPracticeClearTimeMs,
    guildRole: raw.guildRole || seed.guildRole,
    guildContribution:
      typeof raw.guildContribution === 'number' && raw.guildContribution > 0
        ? raw.guildContribution
        : seed.guildContribution,
    guildBossDamage:
      typeof raw.guildBossDamage === 'number' && raw.guildBossDamage > 0
        ? raw.guildBossDamage
        : seed.guildBossDamage,
    titleBadge: raw.titleBadge || seed.titleBadge,
    frameId: (raw.frameId as AvatarFrameId) || seed.frameId,
    personality: raw.personality || seed.personality,
    status: raw.status || 'ready_duel',
    statusDetail: raw.statusDetail || STATUS_DETAILS.ready_duel[0],
    duelRating: typeof raw.duelRating === 'number' && raw.duelRating > 0 ? raw.duelRating : seed.duelRating,
    duelWins: typeof raw.duelWins === 'number' ? raw.duelWins : 8 + (fallbackIndex % 14),
    duelLosses: typeof raw.duelLosses === 'number' ? raw.duelLosses : 4 + (fallbackIndex % 9),
    winStreak: typeof raw.winStreak === 'number' ? raw.winStreak : fallbackIndex % 4,
    lastActiveAt: typeof raw.lastActiveAt === 'number' ? raw.lastActiveAt : nowMs - fallbackIndex * 14_000,
    buildSnapshot: {
      ...(raw.buildSnapshot ?? buildDefaultAiBuildSnapshot(seed)),
      mountName: 'Hắc Long',
    },
  };
}

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
        ...seed,
        tag: '[AI Live]',
        status,
        statusDetail: details[idx % details.length],
        duelWins: 8 + (idx % 14),
        duelLosses: 4 + (idx % 9),
        winStreak: idx % 4,
        lastActiveAt: nowMs - idx * 14_000,
        buildSnapshot: buildDefaultAiBuildSnapshot(seed),
      };
    });

    const activities: AiLiveActivityEvent[] = [
      {
        id: 'evt_init_1',
        timestamp: nowMs - 48_000,
        kind: 'world_boss',
        actorName: 'Tề Thiên [AI Live]',
        summary: 'gây 168.400 ST lên Boss Thế Giới Liên Server, giữ vững Top 1!',
        accent: 'rose',
      },
      {
        id: 'evt_init_2',
        timestamp: nowMs - 32_000,
        kind: 'guild',
        actorName: 'Sát Tinh [AI Live]',
        summary: 'công phá Boss Bang Thái Cổ Ma Long đạt 129.400 ST (+320 Cống Hiến).',
        accent: 'amber',
      },
      {
        id: 'evt_init_3',
        timestamp: nowMs - 18_000,
        kind: 'weekly_practice',
        actorName: 'Linh Vũ [AI Live]',
        summary: 'hoàn thành lượt Tập Boss Tuần đạt 13.850 điểm đối chiếu (41.1s).',
        accent: 'emerald',
      },
      {
        id: 'evt_init_4',
        timestamp: nowMs - 7_000,
        kind: 'status',
        actorName: 'Cửu Thiên [AI Live]',
        summary: 'đang mở khiêu chiến Arena 1v1 trực tiếp (1.540 Điểm).',
        accent: 'sky',
      },
    ];

    return {
      version: 1,
      resetEpoch: ACCOUNT_RESET_EPOCH,
      players,
      activities,
      processedDuelIds: {},
      chatHistory: createInitialChatHistory(nowMs),
    };
  }

  private loadStore(): LiveAiStoreData {
    const nowMs = Date.now();
    try {
      if (!fs.existsSync(this.storePath)) {
        return this.createSeededInitialStore(nowMs);
      }
      const raw = fs.readFileSync(this.storePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<LiveAiStoreData>;
      if (
        parsed &&
        parsed.version === 1 &&
        (parsed.resetEpoch ?? 0) >= ACCOUNT_RESET_EPOCH &&
        Array.isArray(parsed.players) &&
        parsed.players.length >= 8
      ) {
        const normalizedPlayers = parsed.players.map((p, idx) =>
          normalizeAiPlayerProfile(p, idx, nowMs)
        );
        const seededChat = createInitialChatHistory(nowMs);
        const sanitizeChatHero = <T extends { heroId?: string }>(items: T[]): T[] =>
          items.map((msg, idx) => ({
            ...msg,
            heroId:
              isPlayableHeroId(msg.heroId)
                ? msg.heroId
                : idx % 2 === 0
                ? 'aurelia'
                : 'bellona',
          }));
        const chatHistory = {
          lobby:
            Array.isArray(parsed.chatHistory?.lobby) && parsed.chatHistory.lobby.length > 0
              ? sanitizeChatHero(parsed.chatHistory.lobby.slice(-MAX_CHAT_PER_CHANNEL))
              : seededChat.lobby,
          guild:
            Array.isArray(parsed.chatHistory?.guild) && parsed.chatHistory.guild.length > 0
              ? sanitizeChatHero(parsed.chatHistory.guild.slice(-MAX_CHAT_PER_CHANNEL))
              : seededChat.guild,
        };
        return {
          version: 1,
          resetEpoch: parsed.resetEpoch ?? ACCOUNT_RESET_EPOCH,
          players: normalizedPlayers,
          activities: Array.isArray(parsed.activities) ? parsed.activities.slice(0, MAX_ACTIVITY_HISTORY) : [],
          processedDuelIds:
            parsed.processedDuelIds && typeof parsed.processedDuelIds === 'object'
              ? parsed.processedDuelIds
              : {},
          chatHistory,
          rivalsByPlayer:
            parsed.rivalsByPlayer && typeof parsed.rivalsByPlayer === 'object'
              ? parsed.rivalsByPlayer
              : {},
          respondedInviteIds:
            parsed.respondedInviteIds && typeof parsed.respondedInviteIds === 'object'
              ? parsed.respondedInviteIds
              : {},
          guildBossLive: parsed.guildBossLive,
          guildBossClaimsByPlayer:
            parsed.guildBossClaimsByPlayer && typeof parsed.guildBossClaimsByPlayer === 'object'
              ? parsed.guildBossClaimsByPlayer
              : {},
          miniCupsByPlayer:
            parsed.miniCupsByPlayer && typeof parsed.miniCupsByPlayer === 'object'
              ? parsed.miniCupsByPlayer
              : {},
          serverBounty: parsed.serverBounty,
          serverBountyClaimsByPlayer:
            parsed.serverBountyClaimsByPlayer &&
            typeof parsed.serverBountyClaimsByPlayer === 'object'
              ? parsed.serverBountyClaimsByPlayer
              : {},
          adaptationByPlayer:
            parsed.adaptationByPlayer && typeof parsed.adaptationByPlayer === 'object'
              ? parsed.adaptationByPlayer
              : {},
          guildWarLive: parsed.guildWarLive,
          guildWarClaimsByPlayer:
            parsed.guildWarClaimsByPlayer &&
            typeof parsed.guildWarClaimsByPlayer === 'object'
              ? parsed.guildWarClaimsByPlayer
              : {},
          spectatorMatch: parsed.spectatorMatch,
          spectatorMatchSeq: Number(parsed.spectatorMatchSeq ?? 1),
          spectatorCheersByMatch:
            parsed.spectatorCheersByMatch &&
            typeof parsed.spectatorCheersByMatch === 'object'
              ? parsed.spectatorCheersByMatch
              : {},
          spectatorClaimsByMatch:
            parsed.spectatorClaimsByMatch &&
            typeof parsed.spectatorClaimsByMatch === 'object'
              ? parsed.spectatorClaimsByMatch
              : {},
        };
      }
      return this.createSeededInitialStore(nowMs);
    } catch {
      return this.createSeededInitialStore(nowMs);
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
    const chat = this.store.chatHistory ?? createInitialChatHistory(nowMs);
    return {
      serverNow: nowMs,
      onlineHumanCount: Math.max(1, onlineHumanCount),
      onlineAiCount: this.store.players.length,
      players: sortedPlayers,
      activities: this.store.activities.slice(0, 20),
      chatHistory: {
        lobby: chat.lobby.slice(-MAX_CHAT_PER_CHANNEL),
        guild: chat.guild.slice(-MAX_CHAT_PER_CHANNEL),
      },
      guildBossLive: this.getLiveGuildBossState(undefined, nowMs),
      serverBounty: this.getServerBountyState(undefined, nowMs),
      guildWarLive: this.getLiveGuildWarState(undefined, nowMs),
      spectatorMatch: this.getLiveSpectatorMatch(undefined, nowMs),
    };
  }

  private appendChat(msg: AiLiveChatMessage): AiLiveChatMessage {
    if (!this.store.chatHistory) {
      this.store.chatHistory = createInitialChatHistory(msg.timestamp);
    }
    const bucket = this.store.chatHistory[msg.channel];
    if (!bucket.some((m) => m.id === msg.id)) {
      bucket.push(msg);
      if (bucket.length > MAX_CHAT_PER_CHANNEL) {
        this.store.chatHistory[msg.channel] = bucket.slice(-MAX_CHAT_PER_CHANNEL);
      }
    }
    return msg;
  }

  public addPlayerChatMessage(params: {
    channel: AiLiveChatChannel;
    senderName: string;
    text: string;
    nowMs?: number;
  }): AiLiveChatMessage {
    const nowMs = params.nowMs ?? Date.now();
    const cleanText = String(params.text ?? '').replace(/\s+/g, ' ').trim().slice(0, 180);
    const msg: AiLiveChatMessage = {
      id: `chat_${params.channel}_${nowMs}_${crypto.randomBytes(3).toString('hex')}`,
      channel: params.channel,
      senderName: params.senderName,
      senderTag: 'Người Thật',
      text: cleanText,
      timestamp: nowMs,
    };
    this.appendChat(msg);
    this.persistStore();
    return msg;
  }

  public generateContextualAiChatReply(params: {
    channel: AiLiveChatChannel;
    senderName: string;
    userText: string;
    nowMs?: number;
  }): AiLiveChatMessage {
    const nowMs = params.nowMs ?? Date.now();
    const lower = params.userText.toLowerCase();
    const pool = params.channel === 'guild' ? this.store.players.slice(0, 10) : this.store.players;
    const responder = pool[(this.tickCounter + Math.floor(nowMs / 500)) % pool.length];

    let replyText: string;
    if (lower.includes('1v1') || lower.includes('đấu') || lower.includes('arena') || lower.includes('solo')) {
      replyText = `@${params.senderName} mình đang rảnh đây (${responder.duelRating} điểm Arena), bấm vào tên mình để thách đấu 1v1 ngay nhé!`;
    } else if (lower.includes('co-op') || lower.includes('coop') || lower.includes('đội') || lower.includes('pt')) {
      replyText = `@${params.senderName} sẵn sàng vào Co-op 3D! Khi mình báo đủ Tuyệt Kỹ bạn nhớ bấm Q để kích hoạt Liên Kích +25% ST Boss nhé!`;
    } else if (lower.includes('boss') || lower.includes('bang') || lower.includes('tuần')) {
      replyText =
        params.channel === 'guild'
          ? `@${params.senderName} triển Boss Bang ngay thôi! Mình vừa góp ${responder.guildBossDamage.toLocaleString('vi-VN')} ST rồi.`
          : `@${params.senderName} Boss Tuần này chuẩn hóa đồ Sử Thi công bằng lắm, cứ giữ Tụ Lực + Né Hoàn Hảo là leo Top Mùa Giải ngay!`;
    } else if (lower.includes('đấu giá') || lower.includes('ngọc') || lower.includes('rương')) {
      replyText = `@${params.senderName} Sàn Đấu Giá đang sôi động lắm, mình cũng đang canh vài món Sử Thi giá tốt!`;
    } else if (lower.includes('chúc') || lower.includes('gg') || lower.includes('hay') || lower.includes('tuyệt')) {
      replyText = `Cảm ơn @${params.senderName}! Chúc bạn sớm nổ đồ Sử Thi và leo hạng thật cao mùa này!`;
    } else {
      replyText =
        params.channel === 'guild'
          ? `Chào @${params.senderName}! Cả Bang đang tích cực cày cống hiến và Boss Bang, cần đi Co-op cứ gọi mình nhé.`
          : `Chào @${params.senderName}! Bấm vào tên mình để xem Build tướng hoặc giao hữu 1v1 bất cứ lúc nào nhé!`;
    }

    const msg: AiLiveChatMessage = {
      id: `chat_ai_${params.channel}_${nowMs}_${crypto.randomBytes(3).toString('hex')}`,
      channel: params.channel,
      senderName: responder.displayName,
      senderTag: '[AI Live]',
      aiPlayerId: responder.id,
      heroId: responder.heroId,
      text: replyText,
      timestamp: nowMs,
    };
    this.appendChat(msg);
    return msg;
  }

  public generatePeriodicAiChat(nowMs = Date.now()): AiLiveChatMessage {
    const channel: AiLiveChatChannel = this.tickCounter % 2 === 0 ? 'lobby' : 'guild';
    const responder = this.store.players[(this.tickCounter * 5) % this.store.players.length];
    const lobbyLines = [
      `Mình vừa vượt Tầng ${responder.bestTowerFloor} Tháp Vô Tận, ai muốn xem Build thì bấm vào hồ sơ mình nhé!`,
      `Đang trực phòng Arena 1v1 (${responder.duelRating} điểm), nhận mọi kèo giao lưu real-time!`,
      `Ai đi Co-op 3D săn mảnh rèn bù xui không? Mình hỗ trợ kích hoạt Liên Kích Tuyệt Kỹ luôn!`,
      `Đang săn điểm Mùa Giải Boss Tuần, thử kèo né đòn hoàn hảo căng phết anh em ạ!`,
    ];
    const guildLines = [
      `Vừa hoàn thành lượt Boss Bang đạt ${responder.guildBossDamage.toLocaleString('vi-VN')} ST, anh em vào dứt điểm nhận rương nhé!`,
      `Điểm cống hiến Bang mình đã chạm ${responder.guildContribution.toLocaleString('vi-VN')}, cùng nâng Công Nghệ Bang nào!`,
    ];
    const lines = channel === 'guild' ? guildLines : lobbyLines;
    const msg: AiLiveChatMessage = {
      id: `chat_tick_${channel}_${nowMs}_${crypto.randomBytes(3).toString('hex')}`,
      channel,
      senderName: responder.displayName,
      senderTag: '[AI Live]',
      aiPlayerId: responder.id,
      heroId: responder.heroId,
      text: lines[this.tickCounter % lines.length],
      timestamp: nowMs,
    };
    this.appendChat(msg);
    return msg;
  }

  public getPlayerById(aiPlayerId: string): AiLivePlayerProfile | null {
    return this.store.players.find((p) => p.id === aiPlayerId) ?? null;
  }

  /**
   * Advances the server-authoritative real-time AI player ecosystem by one simulation step
   * across ALL leaderboards (Power, World Boss, Tower, Guild Boss, Weekly Boss Practice, Arena 1v1).
   */
  public simulateServerTick(nowMs = Date.now()): {
    updatedPlayer: AiLivePlayerProfile;
    event: AiLiveActivityEvent;
  } {
    this.tickCounter += 1;
    const idx = (this.tickCounter * 5 + Math.floor(nowMs / 1000)) % this.store.players.length;
    const player = this.store.players[idx];

    const readyCount = this.store.players.filter((p) => p.status === 'ready_duel').length;
    const activityKindCycle: Array<'world_boss' | 'guild' | 'tower' | 'weekly_practice' | 'ready_duel' | 'campaign'> =
      readyCount < 7
        ? ['ready_duel', 'world_boss', 'guild', 'ready_duel', 'tower', 'weekly_practice']
        : ['world_boss', 'guild', 'tower', 'weekly_practice', 'ready_duel', 'campaign'];

    const actionKind = activityKindCycle[(this.tickCounter - 1) % activityKindCycle.length];
    player.lastActiveAt = nowMs;

    let event: AiLiveActivityEvent;

    if (actionKind === 'world_boss') {
      player.status = 'campaign';
      player.statusDetail = 'Đang săn Boss Thế Giới Liên Server';
      const boost = 900 + ((this.tickCounter * 317) % 2400);
      player.worldBossBestDamage = Math.min(350_000, player.worldBossBestDamage + boost);
      this.applyServerBountyContributionInternal({
        id: player.id,
        displayName: `${player.displayName} ${player.tag}`,
        isHuman: false,
        heroId: player.heroId,
        points: 35 + ((this.tickCounter * 19) % 55),
        nowMs,
      });
      event = this.pushActivity({
        id: `evt_wbai_${nowMs}_${crypto.randomBytes(3).toString('hex')}`,
        timestamp: nowMs,
        kind: 'world_boss',
        actorName: `${player.displayName} ${player.tag}`,
        summary: `vừa lập kỷ lục Boss Thế Giới mới: ${player.worldBossBestDamage.toLocaleString('vi-VN')} ST!`,
        accent: 'rose',
      });
    } else if (actionKind === 'guild') {
      player.status = 'campaign';
      player.statusDetail = 'Đang công phá Boss Bang Hội';
      const dmgGain = 650 + ((this.tickCounter * 223) % 1900);
      const contribGain = 60 + ((this.tickCounter * 41) % 120);
      player.guildBossDamage = Math.min(280_000, player.guildBossDamage + dmgGain);
      player.guildContribution += contribGain;
      this.applyGuildBossHitInternal({
        id: player.id,
        displayName: `${player.displayName} ${player.tag}`,
        isHuman: false,
        heroId: player.heroId,
        damage: dmgGain,
        nowMs,
      });
      event = this.pushActivity({
        id: `evt_guild_${nowMs}_${crypto.randomBytes(3).toString('hex')}`,
        timestamp: nowMs,
        kind: 'guild',
        actorName: `${player.displayName} ${player.tag}`,
        summary: `công phá Boss Bang Live gây +${dmgGain.toLocaleString('vi-VN')} ST (+${contribGain} Cống Hiến).`,
        accent: 'amber',
      });
    } else if (actionKind === 'tower') {
      player.status = 'campaign';
      player.statusDetail = `Đang leo Tháp Vô Tận · Tầng ${player.bestTowerFloor + 1}`;
      if (this.tickCounter % 2 === 0 && player.bestTowerFloor < 65) {
        player.bestTowerFloor += 1;
      }
      player.powerRating = Math.min(12_000, player.powerRating + 18);
      event = this.pushActivity({
        id: `evt_tower_${nowMs}_${crypto.randomBytes(3).toString('hex')}`,
        timestamp: nowMs,
        kind: 'tower',
        actorName: `${player.displayName} ${player.tag}`,
        summary: `chinh phục Tháp Vô Tận Tầng ${player.bestTowerFloor} (Lực Chiến ${player.powerRating.toLocaleString('vi-VN')}).`,
        accent: 'emerald',
      });
    } else if (actionKind === 'weekly_practice') {
      player.status = 'weekly_practice';
      player.statusDetail = STATUS_DETAILS.weekly_practice[this.tickCounter % STATUS_DETAILS.weekly_practice.length];
      const delta = ((this.tickCounter * 73) % 360) - 90;
      const runScore = Math.max(9200, Math.min(16850, player.weeklyPracticeBest + delta));
      if (runScore > player.weeklyPracticeBest) {
        player.weeklyPracticeBest = runScore;
        player.weeklyPracticeClearTimeMs = Math.max(
          27_500,
          (player.weeklyPracticeClearTimeMs ?? 48_000) - 450
        );
      }
      event = this.pushActivity({
        id: `evt_wp_${nowMs}_${crypto.randomBytes(3).toString('hex')}`,
        timestamp: nowMs,
        kind: 'weekly_practice',
        actorName: `${player.displayName} ${player.tag}`,
        summary: `hoàn tất Tập Boss Tuần đạt ${runScore.toLocaleString('vi-VN')} điểm đối chiếu.`,
        accent: 'amber',
      });
    } else if (actionKind === 'ready_duel') {
      player.status = 'ready_duel';
      player.statusDetail = STATUS_DETAILS.ready_duel[this.tickCounter % STATUS_DETAILS.ready_duel.length];
      event = this.pushActivity({
        id: `evt_rd_${nowMs}_${crypto.randomBytes(3).toString('hex')}`,
        timestamp: nowMs,
        kind: 'status',
        actorName: `${player.displayName} ${player.tag}`,
        summary: `mở khiêu chiến Arena 1v1 trực tiếp (Hạng ${player.duelRating} điểm).`,
        accent: 'sky',
      });
    } else {
      player.status = 'campaign';
      player.statusDetail = 'Đang vượt Chương cao · Cường hóa trang bị';
      player.powerRating = Math.min(12_000, player.powerRating + 22);
      event = this.pushActivity({
        id: `evt_camp_${nowMs}_${crypto.randomBytes(3).toString('hex')}`,
        timestamp: nowMs,
        kind: 'campaign',
        actorName: `${player.displayName} ${player.tag}`,
        summary: `nâng Lực Chiến lên ${player.powerRating.toLocaleString('vi-VN')} LC tại Chương ${player.highestChapterCleared}.`,
        accent: 'emerald',
      });
    }

    let guildWarUpdated = false;
    if (actionKind === 'guild' || this.tickCounter % 2 === 0) {
      const war = this.ensureLiveGuildWar(nowMs);
      if (war.status === 'active') {
        const skirmish = tickLiveGuildWarAiSkirmish(war, {
          aiId: player.id,
          aiDisplayName: player.displayName,
          heroId: player.heroId,
          tickSeed: this.tickCounter,
          nowMs,
        });
        this.store.guildWarLive = skirmish.nextState;
        guildWarUpdated = true;
      }
    }

    let spectatorUpdated = false;
    const specMatch = this.ensureLiveSpectatorMatch(nowMs);
    if (specMatch.status === 'live') {
      const stepped = stepLiveSpectatorMatch(specMatch, nowMs);
      this.store.spectatorMatch = stepped.nextMatch;
      spectatorUpdated = true;
    } else if (nowMs - specMatch.updatedAt >= 24_000) {
      // Auto-rotate to next live AI Championship bout after players had time to claim
      this.startNextSpectatorMatch(nowMs);
      spectatorUpdated = true;
    }

    if (this.tickCounter % 4 === 0) {
      this.persistStore();
    }

    return { updatedPlayer: player, event, guildWarUpdated, spectatorUpdated } as {
      updatedPlayer: AiLivePlayerProfile;
      event: AiLiveActivityEvent;
      guildWarUpdated?: boolean;
      spectatorUpdated?: boolean;
    };
  }

  /**
   * Server-authoritative real-time Auction House competition:
   * Picks an active lot (either a player's consignment or an open market lot) and lets an
   * online [AI Live] player place a realistic bid or buyout.
   */
  public evaluateAuctionCompetition(
    openLots: AiLiveAuctionSyncLot[],
    nowMs = Date.now(),
    forceLotId?: string
  ): {
    bidEvent: AiLiveAuctionBidEvent;
    activity: AiLiveActivityEvent;
    bidder: AiLivePlayerProfile;
  } | null {
    const candidates = openLots.filter(
      (lot) =>
        lot &&
        typeof lot.id === 'string' &&
        lot.endsAt > nowMs + 4_000 &&
        lot.buyoutPrice > lot.currentBid
    );
    if (candidates.length === 0) return null;

    // Prefer player listings or lots where player currently leads so real-time competition is tangible
    const target =
      (forceLotId ? candidates.find((c) => c.id === forceLotId) : null) ??
      candidates.find((c) => c.isPlayerListing) ??
      candidates.find((c) => c.highestBidderIsPlayer) ??
      candidates[(this.tickCounter + candidates.length) % candidates.length];

    if (!target) return null;

    const bidder =
      this.store.players[(this.tickCounter * 3 + Math.floor(nowMs / 1000)) % this.store.players.length];
    bidder.status = 'lobby';
    bidder.statusDetail = 'Đang đấu giá trên Sàn Tinh Giới';
    bidder.lastActiveAt = nowMs;

    const nextBid = Math.max(target.currentBid + 2, Math.ceil(target.currentBid * 1.1) + 1);
    const shouldBuyout = target.isPlayerListing && (nextBid >= target.buyoutPrice || this.tickCounter % 2 === 0);
    const action: 'bid' | 'buyout' = shouldBuyout ? 'buyout' : 'bid';
    const amount = action === 'buyout' ? target.buyoutPrice : Math.min(target.buyoutPrice - 1, nextBid);

    if (action === 'bid' && amount <= target.currentBid) {
      return null;
    }

    const eventId = `auc_${nowMs}_${crypto.randomBytes(4).toString('hex')}`;
    const bidEvent: AiLiveAuctionBidEvent = {
      eventId,
      lotId: target.id,
      lotLabel: target.label,
      bidderId: bidder.id,
      bidderName: bidder.displayName,
      bidderTag: '[AI Live]',
      action,
      amount,
      isPlayerListing: target.isPlayerListing,
      timestamp: nowMs,
    };

    const activity = this.pushActivity({
      id: `evt_${eventId}`,
      timestamp: nowMs,
      kind: 'auction',
      actorName: `${bidder.displayName} ${bidder.tag}`,
      summary:
        action === 'buyout'
          ? `vừa mua đứt "${target.label}" trên Sàn Đấu Giá với giá ${amount} Ngọc Hồn!`
          : `vừa trả giá ${amount} Ngọc Hồn cho "${target.label}" trên Sàn Đấu Giá!`,
      accent: 'amber',
    });

    return { bidEvent, activity, bidder };
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
    aiDuelTier?: 'challenger' | 'master' | 'sovereign' | 'mythic';
    nowMs?: number;
  }): {
    alreadyProcessed: boolean;
    opponent: AiLivePlayerProfile | null;
    ratingDelta: number;
    event?: AiLiveActivityEvent;
    rival?: AiRivalRecord | null;
  } {
    const nowMs = params.nowMs ?? Date.now();
    const opponent = this.getPlayerById(params.aiPlayerId);
    if (!opponent) {
      return { alreadyProcessed: false, opponent: null, ratingDelta: 0 };
    }

    if (this.store.processedDuelIds[params.duelId]) {
      return { alreadyProcessed: true, opponent, ratingDelta: 0 };
    }

    const tier = params.aiDuelTier ?? 'challenger';
    const tierMeta: Record<
      'challenger' | 'master' | 'sovereign' | 'mythic',
      { label: string; winRating: number; lossRating: number }
    > = {
      challenger: { label: 'Thách Đấu', winRating: 24, lossRating: -10 },
      master: { label: 'Cao Thủ', winRating: 30, lossRating: -10 },
      sovereign: { label: 'Đế Vương', winRating: 38, lossRating: -8 },
      mythic: { label: 'Thần Thoại', winRating: 48, lossRating: -6 },
    };
    const meta = tierMeta[tier] ?? tierMeta.challenger;

    this.store.processedDuelIds[params.duelId] = nowMs;
    const ratingDelta = params.playerWon ? meta.winRating : meta.lossRating;
    if (params.playerWon) {
      opponent.duelLosses += 1;
      opponent.winStreak = 0;
      opponent.duelRating = Math.max(950, opponent.duelRating - 12);
    } else {
      opponent.duelWins += 1;
      opponent.winStreak += 1;
      opponent.duelRating += 18;
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
        ? `hạ gục ${opponent.displayName} ${opponent.tag} [${meta.label}] trong ${cleanDur}s (+${ratingDelta} điểm 1v1)!`
        : `bị ${opponent.displayName} ${opponent.tag} [${meta.label}] đánh bại sau ${cleanDur}s giao tranh nảy lửa!`,
      accent: params.playerWon ? 'emerald' : 'rose',
    });

    const rival = this.recordRivalEncounter({
      playerName: params.challengerName,
      aiPlayerId: opponent.id,
      playerWon: params.playerWon,
      reason: `Đấu Trường 1v1 · ${meta.label}`,
      nowMs,
    });

    this.persistStore();
    return { alreadyProcessed: false, opponent, ratingDelta, event, rival };
  }

  // ============================================================================
  // WAVE 5 — PILLAR 5: LIVE CO-OP/DUEL INVITES & PERSISTENT RIVAL (NEMESIS)
  // ============================================================================

  private activeInvites: Map<string, AiLiveInvite> = new Map();

  private normalizePlayerKey(playerName: string): string {
    const clean = playerName.trim().toLowerCase().replace(/\s+/g, '_').slice(0, 32);
    return clean || 'guest_player';
  }

  private resolveRivalryTier(score: number): AiRivalTier {
    if (score >= 90) return 'nemesis';
    if (score >= 45) return 'archrival';
    return 'contender';
  }

  public recordRivalEncounter(params: {
    playerName: string;
    aiPlayerId: string;
    playerWon?: boolean;
    reason: string;
    scoreDelta?: number;
    nowMs?: number;
  }): AiRivalRecord | null {
    const opponent = this.getPlayerById(params.aiPlayerId);
    if (!opponent) return null;
    const nowMs = params.nowMs ?? Date.now();
    const pKey = this.normalizePlayerKey(params.playerName);
    if (!this.store.rivalsByPlayer) this.store.rivalsByPlayer = {};
    if (!this.store.rivalsByPlayer[pKey]) this.store.rivalsByPlayer[pKey] = {};

    const prev = this.store.rivalsByPlayer[pKey][opponent.id];
    const winsAgainst = (prev?.winsAgainst ?? 0) + (params.playerWon === true ? 1 : 0);
    const lossesAgainst = (prev?.lossesAgainst ?? 0) + (params.playerWon === false ? 1 : 0);
    const baseDelta = params.scoreDelta ?? (params.playerWon === false ? 30 : 25);
    const rivalryScore = Math.min(250, (prev?.rivalryScore ?? 0) + baseDelta);

    let revengeStreak = prev?.revengeStreak ?? 0;
    let vendettaPending = Boolean(prev?.vendettaPending);
    let revengeBonusPct = prev?.revengeBonusPct ?? 0;
    let lastOutcome = prev?.lastOutcome;

    if (params.playerWon === false) {
      revengeStreak = Math.min(4, revengeStreak + 1);
      vendettaPending = true;
      revengeBonusPct = Math.min(60, 15 + revengeStreak * 15);
      lastOutcome = 'ai_won';
    } else if (params.playerWon === true) {
      lastOutcome = 'player_won';
      if (prev?.vendettaPending) {
        // Player settled the pending revenge duel -> reset active vendetta
        vendettaPending = false;
        revengeStreak = 0;
        revengeBonusPct = 0;
      } else if (winsAgainst >= 2) {
        revengeStreak = Math.min(3, Math.max(1, revengeStreak + 1));
        vendettaPending = true;
        revengeBonusPct = Math.min(60, 15 + Math.floor(rivalryScore / 45) * 15);
      }
    }

    const updated: AiRivalRecord = {
      aiPlayerId: opponent.id,
      aiDisplayName: opponent.displayName,
      aiHeroId: opponent.heroId,
      aiPowerRating: opponent.powerRating,
      winsAgainst,
      lossesAgainst,
      rivalryScore,
      rivalryTier: this.resolveRivalryTier(rivalryScore),
      lastEncounterReason: params.reason,
      lastEncounterAt: nowMs,
      bountyClaimedDateKey: prev?.bountyClaimedDateKey,
      vendettaPending,
      revengeStreak,
      revengeBonusPct,
      lastOutcome,
    };

    this.store.rivalsByPlayer[pKey][opponent.id] = updated;
    this.persistStore();
    return updated;
  }

  public issueRivalRevengeChallenge(params: {
    playerName: string;
    aiPlayerId?: string;
    nowMs?: number;
  }): {
    ok: boolean;
    invite: AiLiveInvite | null;
    rival: AiRivalRecord | null;
    event?: AiLiveActivityEvent;
  } {
    const nowMs = params.nowMs ?? Date.now();
    const pKey = this.normalizePlayerKey(params.playerName);
    let rivals = this.getRivalsForPlayer(params.playerName);

    let targetRival: AiRivalRecord | undefined;
    if (params.aiPlayerId) {
      targetRival = rivals.find((r) => r.aiPlayerId === params.aiPlayerId);
    }
    if (!targetRival) {
      targetRival =
        rivals.find((r) => r.vendettaPending) ??
        rivals[0];
    }

    // If the player hasn't encountered any rival yet, promote top ready contender into an active rival
    if (!targetRival) {
      const seedProfile =
        this.store.players.find((p) => p.id === params.aiPlayerId) ??
        this.store.players[0];
      if (!seedProfile) {
        return { ok: false, invite: null, rival: null };
      }
      targetRival =
        this.recordRivalEncounter({
          playerName: params.playerName,
          aiPlayerId: seedProfile.id,
          playerWon: false,
          reason: 'Thư Chiến Phục Thù Sảnh Chính',
          scoreDelta: 30,
          nowMs,
        }) ?? undefined;
      rivals = this.getRivalsForPlayer(params.playerName);
    }

    if (!targetRival) {
      return { ok: false, invite: null, rival: null };
    }

    const aiProfile = this.getPlayerById(targetRival.aiPlayerId) ?? this.store.players[0];
    const streak = Math.max(1, targetRival.revengeStreak ?? 1);
    const bonusPct = Math.min(60, Math.max(20, targetRival.revengeBonusPct ?? 20));
    targetRival.vendettaPending = true;
    targetRival.revengeStreak = streak;
    targetRival.revengeBonusPct = bonusPct;

    if (!this.store.rivalsByPlayer) this.store.rivalsByPlayer = {};
    if (!this.store.rivalsByPlayer[pKey]) this.store.rivalsByPlayer[pKey] = {};
    this.store.rivalsByPlayer[pKey][targetRival.aiPlayerId] = targetRival;

    const inviteId = `rev_${nowMs}_${crypto.randomBytes(4).toString('hex')}`;
    const invite: AiLiveInvite = {
      inviteId,
      kind: 'rival_revenge',
      aiPlayerId: targetRival.aiPlayerId,
      aiDisplayName: targetRival.aiDisplayName,
      aiHeroId: targetRival.aiHeroId,
      aiPowerRating: aiProfile?.powerRating ?? targetRival.aiPowerRating,
      message: `Kình Địch Phục Thù (Chuỗi ×${streak}): Vào 1v1 thanh toán duyên nợ để nhận +${bonusPct}% Thưởng Vàng & Xu Arena!`,
      createdAt: nowMs,
      expiresAt: nowMs + 60_000,
      revengeBonusPct: bonusPct,
      revengeStreak: streak,
    };
    this.activeInvites.set(inviteId, invite);

    const event = this.pushActivity({
      id: `evt_${inviteId}`,
      timestamp: nowMs,
      kind: 'duel_result',
      actorName: `${targetRival.aiDisplayName} [AI Live]`,
      summary: `gửi Thư Chiến Phục Thù tới ${params.playerName} (+${bonusPct}% thưởng truy nã)!`,
      accent: 'rose',
    });

    this.persistStore();
    return { ok: true, invite, rival: targetRival, event };
  }

  public getRivalsForPlayer(playerName: string): AiRivalRecord[] {
    const pKey = this.normalizePlayerKey(playerName);
    const bucket = this.store.rivalsByPlayer?.[pKey];
    if (!bucket) return [];
    return Object.values(bucket)
      .sort((a, b) => b.rivalryScore - a.rivalryScore || b.lastEncounterAt - a.lastEncounterAt)
      .slice(0, 12);
  }

  public claimRivalDailyBounty(params: {
    playerName: string;
    aiPlayerId: string;
    nowMs?: number;
  }): {
    ok: boolean;
    alreadyClaimed: boolean;
    goldReward: number;
    gemsReward: number;
    rival: AiRivalRecord | null;
    message: string;
  } {
    const nowMs = params.nowMs ?? Date.now();
    const dateKey = new Date(nowMs).toISOString().slice(0, 10);
    const pKey = this.normalizePlayerKey(params.playerName);
    const rival = this.store.rivalsByPlayer?.[pKey]?.[params.aiPlayerId] ?? null;

    if (!rival || rival.winsAgainst <= 0) {
      return {
        ok: false,
        alreadyClaimed: false,
        goldReward: 0,
        gemsReward: 0,
        rival,
        message: 'Cần đánh bại đối thủ Truyền Kiếp này ít nhất 1 trận 1v1 để nhận thưởng đòi nợ.',
      };
    }

    if (rival.bountyClaimedDateKey === dateKey) {
      return {
        ok: true,
        alreadyClaimed: true,
        goldReward: 0,
        gemsReward: 0,
        rival,
        message: 'Phần thưởng đòi nợ Truyền Kiếp hôm nay đã được nhận.',
      };
    }

    const goldReward = rival.rivalryTier === 'nemesis' ? 1800 : rival.rivalryTier === 'archrival' ? 1200 : 800;
    const gemsReward = rival.rivalryTier === 'nemesis' ? 45 : rival.rivalryTier === 'archrival' ? 30 : 20;
    rival.bountyClaimedDateKey = dateKey;
    this.persistStore();

    return {
      ok: true,
      alreadyClaimed: false,
      goldReward,
      gemsReward,
      rival,
      message: `Nhận thưởng đòi nợ Truyền Kiếp ${rival.aiDisplayName}: +${goldReward} Vàng · +${gemsReward} Ngọc Hồn!`,
    };
  }

  public generateLiveInvite(params: {
    playerName: string;
    preferredKind?: 'coop_raid' | 'arena_duel';
    nowMs?: number;
  }): AiLiveInvite {
    const nowMs = params.nowMs ?? Date.now();
    // Prune expired invites
    for (const [id, inv] of this.activeInvites.entries()) {
      if (inv.expiresAt <= nowMs) this.activeInvites.delete(id);
    }

    const rivals = this.getRivalsForPlayer(params.playerName);
    const kind: 'coop_raid' | 'arena_duel' =
      params.preferredKind ??
      (rivals.length > 0 && nowMs % 2 === 0 ? 'arena_duel' : 'coop_raid');

    const candidatePool =
      kind === 'arena_duel' && rivals.length > 0
        ? rivals
            .map((r) => this.getPlayerById(r.aiPlayerId))
            .filter((p): p is AiLivePlayerProfile => Boolean(p))
        : this.store.players.filter((p) => p.status !== 'in_duel');

    const picked =
      candidatePool[Math.floor(nowMs / 1000) % Math.max(1, candidatePool.length)] ??
      this.store.players[0];

    const inviteId = `inv_${nowMs}_${crypto.randomBytes(4).toString('hex')}`;
    const message =
      kind === 'coop_raid'
        ? `Mời bạn ghép tổ đội Co-op 3D săn mảnh Sử Thi! Mình sẽ giữ Tuyệt Kỹ chờ Liên Kích.`
        : rivals.some((r) => r.aiPlayerId === picked.id)
        ? `Tái đấu 1v1 Truyền Kiếp ngay nào! Lần này mình đã đổi nhịp phản đòn mới.`
        : `Phòng Đấu Trường 1v1 đã mở — vào giao lưu kiểm tra đội hình không?`;

    const invite: AiLiveInvite = {
      inviteId,
      kind,
      aiPlayerId: picked.id,
      aiDisplayName: picked.displayName,
      aiHeroId: picked.heroId,
      aiPowerRating: picked.powerRating,
      message,
      createdAt: nowMs,
      expiresAt: nowMs + 45_000,
    };

    this.activeInvites.set(inviteId, invite);
    return invite;
  }

  public respondToInvite(params: {
    inviteId: string;
    action: 'accept' | 'decline';
    playerName: string;
    nowMs?: number;
  }): {
    ok: boolean;
    alreadyProcessed: boolean;
    invite: AiLiveInvite | null;
    duelId?: string;
    opponent?: AiLivePlayerProfile;
    event?: AiLiveActivityEvent;
  } {
    const nowMs = params.nowMs ?? Date.now();
    if (!this.store.respondedInviteIds) this.store.respondedInviteIds = {};

    if (this.store.respondedInviteIds[params.inviteId]) {
      return {
        ok: true,
        alreadyProcessed: true,
        invite: this.activeInvites.get(params.inviteId) ?? null,
      };
    }

    const invite = this.activeInvites.get(params.inviteId) ?? null;
    this.store.respondedInviteIds[params.inviteId] =
      params.action === 'accept' ? 'accepted' : 'declined';
    this.activeInvites.delete(params.inviteId);

    if (!invite) {
      this.persistStore();
      return { ok: false, alreadyProcessed: false, invite: null };
    }

    if (params.action === 'decline') {
      this.persistStore();
      return { ok: true, alreadyProcessed: false, invite };
    }

    const opponent = this.getPlayerById(invite.aiPlayerId) ?? undefined;
    if ((invite.kind === 'arena_duel' || invite.kind === 'rival_revenge') && opponent) {
      const started = this.startDuelChallenge(opponent.id, params.playerName, nowMs);
      this.persistStore();
      return {
        ok: true,
        alreadyProcessed: false,
        invite,
        duelId: started?.duelId,
        opponent: started?.opponent,
        event: started?.event,
      };
    }

    const event = this.pushActivity({
      id: `evt_inv_${invite.inviteId}`,
      timestamp: nowMs,
      kind: 'status',
      actorName: params.playerName,
      summary: `đã nhận lời mời tổ đội Co-op 3D cùng ${invite.aiDisplayName} [AI Live]!`,
      accent: 'emerald',
    });
    this.persistStore();
    return {
      ok: true,
      alreadyProcessed: false,
      invite,
      opponent,
      event,
    };
  }

  // ============================================================================
  // WAVE 6 — PILLAR 5: LIVE AI GUILD BOSS WAR CONTRIBUTION
  // ============================================================================

  private createFreshLiveGuildBoss(dateKey: string, nowMs: number): LiveGuildBossState {
    const seededContributors: LiveGuildBossContributor[] = this.store.players
      .slice(0, 5)
      .map((p, idx) => ({
        id: p.id,
        displayName: `${p.displayName} ${p.tag}`,
        isHuman: false,
        heroId: p.heroId,
        damage: 9500 - idx * 1450,
        attacks: 2,
        lastHitAt: nowMs - (idx + 1) * 18_000,
      }));
    const seededDamage = seededContributors.reduce((acc, c) => acc + c.damage, 0);
    const maxHp = 180_000;
    const milestones: LiveGuildBossMilestone[] = [
      {
        tierId: 'gb_live_1',
        label: 'Mốc 1 · Phá Giáp (30.000 ST)',
        damageRequired: 30_000,
        rewardGold: 1200,
        rewardGems: 40,
        rewardGuildCoins: 80,
      },
      {
        tierId: 'gb_live_2',
        label: 'Mốc 2 · Suy Kiệt (90.000 ST)',
        damageRequired: 90_000,
        rewardGold: 2400,
        rewardGems: 85,
        rewardGuildCoins: 160,
      },
      {
        tierId: 'gb_live_3',
        label: 'Mốc 3 · Trảm Boss Bang (180.000 ST)',
        damageRequired: 180_000,
        rewardGold: 4200,
        rewardGems: 160,
        rewardGuildCoins: 300,
      },
    ];
    return {
      dateKey,
      bossName: 'Cự Long Hắc Tinh · Boss Bang Live',
      bossTitle: 'Chiến dịch Hợp Lực Bang Hội Hằng Ngày (Bạn & Đồng Đội [AI Live])',
      maxHp,
      currentHp: Math.max(0, maxHp - seededDamage),
      totalDamage: seededDamage,
      defeatedCount: 0,
      contributors: seededContributors,
      milestones,
      claimedMilestoneIds: [],
      lastUpdatedAt: nowMs,
    };
  }

  private ensureLiveGuildBoss(nowMs = Date.now()): LiveGuildBossState {
    const dateKey = new Date(nowMs).toISOString().slice(0, 10);
    if (!this.store.guildBossLive || this.store.guildBossLive.dateKey !== dateKey) {
      this.store.guildBossLive = this.createFreshLiveGuildBoss(dateKey, nowMs);
      this.store.guildBossClaimsByPlayer = {};
    }
    return this.store.guildBossLive;
  }

  private applyGuildBossHitInternal(params: {
    id: string;
    displayName: string;
    isHuman: boolean;
    heroId: HeroId;
    damage: number;
    nowMs: number;
  }): LiveGuildBossState {
    const boss = this.ensureLiveGuildBoss(params.nowMs);
    const dmg = Math.max(100, Math.min(85_000, Math.round(params.damage)));
    boss.totalDamage += dmg;
    if (boss.currentHp <= dmg) {
      boss.defeatedCount += 1;
      boss.currentHp = boss.maxHp;
    } else {
      boss.currentHp -= dmg;
    }
    boss.lastUpdatedAt = params.nowMs;

    const existing = boss.contributors.find((c) => c.id === params.id);
    if (existing) {
      existing.displayName = params.displayName;
      existing.heroId = params.heroId;
      existing.damage += dmg;
      existing.attacks += 1;
      existing.lastHitAt = params.nowMs;
    } else {
      boss.contributors.push({
        id: params.id,
        displayName: params.displayName,
        isHuman: params.isHuman,
        heroId: normalizePlayableHeroId(params.heroId),
        damage: dmg,
        attacks: 1,
        lastHitAt: params.nowMs,
      });
    }
    boss.contributors.sort((a, b) => b.damage - a.damage);
    boss.contributors = boss.contributors.slice(0, 14);
    return boss;
  }

  public getLiveGuildBossState(playerName?: string, nowMs = Date.now()): LiveGuildBossState {
    const boss = this.ensureLiveGuildBoss(nowMs);
    const pKey = playerName ? this.normalizePlayerKey(playerName) : null;
    const claimedMap = pKey ? this.store.guildBossClaimsByPlayer?.[pKey] ?? {} : {};
    const claimedMilestoneIds = Object.keys(claimedMap).filter((k) => claimedMap[k]);
    return {
      ...boss,
      contributors: boss.contributors.map((c) => ({ ...c })),
      milestones: boss.milestones.map((m) => ({ ...m })),
      claimedMilestoneIds,
    };
  }

  public recordHumanGuildBossAttack(params: {
    playerName: string;
    heroId?: HeroId;
    damage: number;
    nowMs?: number;
  }): { state: LiveGuildBossState; event: AiLiveActivityEvent } {
    const nowMs = params.nowMs ?? Date.now();
    const pKey = this.normalizePlayerKey(params.playerName);
    const safeDmg = Math.max(250, Math.min(85_000, Math.round(params.damage)));
    this.applyGuildBossHitInternal({
      id: `human_${pKey}`,
      displayName: params.playerName,
      isHuman: true,
      heroId: normalizePlayableHeroId(params.heroId),
      damage: safeDmg,
      nowMs,
    });
    const event = this.pushActivity({
      id: `evt_gbl_h_${nowMs}_${crypto.randomBytes(3).toString('hex')}`,
      timestamp: nowMs,
      kind: 'guild',
      actorName: params.playerName,
      summary: `góp ${safeDmg.toLocaleString('vi-VN')} ST vào Boss Bang Live cùng toàn bang!`,
      accent: 'emerald',
    });
    this.persistStore();
    return {
      state: this.getLiveGuildBossState(params.playerName, nowMs),
      event,
    };
  }

  public claimLiveGuildBossMilestone(params: {
    playerName: string;
    tierId: string;
    nowMs?: number;
  }): {
    ok: boolean;
    alreadyClaimed: boolean;
    goldReward: number;
    gemsReward: number;
    guildCoinsReward: number;
    message: string;
    state: LiveGuildBossState;
  } {
    const nowMs = params.nowMs ?? Date.now();
    const boss = this.ensureLiveGuildBoss(nowMs);
    const pKey = this.normalizePlayerKey(params.playerName);
    const tier = boss.milestones.find((m) => m.tierId === params.tierId);
    if (!tier) {
      return {
        ok: false,
        alreadyClaimed: false,
        goldReward: 0,
        gemsReward: 0,
        guildCoinsReward: 0,
        message: 'Không tìm thấy mốc thưởng Boss Bang Live.',
        state: this.getLiveGuildBossState(params.playerName, nowMs),
      };
    }

    if (!this.store.guildBossClaimsByPlayer) this.store.guildBossClaimsByPlayer = {};
    if (!this.store.guildBossClaimsByPlayer[pKey]) this.store.guildBossClaimsByPlayer[pKey] = {};

    if (this.store.guildBossClaimsByPlayer[pKey][tier.tierId]) {
      return {
        ok: true,
        alreadyClaimed: true,
        goldReward: 0,
        gemsReward: 0,
        guildCoinsReward: 0,
        message: 'Mốc thưởng Boss Bang Live này đã được nhận hôm nay.',
        state: this.getLiveGuildBossState(params.playerName, nowMs),
      };
    }

    if (boss.totalDamage < tier.damageRequired) {
      return {
        ok: false,
        alreadyClaimed: false,
        goldReward: 0,
        gemsReward: 0,
        guildCoinsReward: 0,
        message: `Bang hội cần đạt ${tier.damageRequired.toLocaleString('vi-VN')} ST (hiện có ${boss.totalDamage.toLocaleString('vi-VN')} ST).`,
        state: this.getLiveGuildBossState(params.playerName, nowMs),
      };
    }

    this.store.guildBossClaimsByPlayer[pKey][tier.tierId] = true;
    this.persistStore();

    return {
      ok: true,
      alreadyClaimed: false,
      goldReward: tier.rewardGold,
      gemsReward: tier.rewardGems,
      guildCoinsReward: tier.rewardGuildCoins,
      message: `Nhận rương ${tier.label}: +${tier.rewardGold} Vàng · +${tier.rewardGems} Ngọc · +${tier.rewardGuildCoins} Xu Bang!`,
      state: this.getLiveGuildBossState(params.playerName, nowMs),
    };
  }

  // ============================================================================
  // WAVE 6 — PILLAR 5: LIVE 8-PLAYER 1V1 MINI-CUP TOURNAMENT BRACKET
  // ============================================================================

  public getMiniCupForPlayer(playerName: string): LiveMiniCupState | null {
    const pKey = this.normalizePlayerKey(playerName);
    return this.store.miniCupsByPlayer?.[pKey] ?? null;
  }

  public startMiniCup(params: {
    playerName: string;
    playerHeroId?: HeroId;
    playerPowerRating?: number;
    playerDuelRating?: number;
    nowMs?: number;
  }): { cup: LiveMiniCupState; event: AiLiveActivityEvent } {
    const nowMs = params.nowMs ?? Date.now();
    const pKey = this.normalizePlayerKey(params.playerName);
    const humanParticipant: LiveMiniCupParticipant = {
      id: `human_${pKey}`,
      displayName: params.playerName,
      isHuman: true,
      heroId: normalizePlayableHeroId(params.playerHeroId),
      powerRating: Math.max(500, Math.round(params.playerPowerRating ?? 1800)),
      duelRating: Math.max(900, Math.round(params.playerDuelRating ?? 1200)),
    };

    const sortedAi = [...this.store.players].sort((a, b) => b.duelRating - a.duelRating);
    const offset = Math.floor(nowMs / 1000) % Math.max(1, sortedAi.length - 7);
    const sevenAi: LiveMiniCupParticipant[] = sortedAi.slice(offset, offset + 7).map((ai) => ({
      id: ai.id,
      displayName: `${ai.displayName} ${ai.tag}`,
      isHuman: false,
      heroId: ai.heroId,
      powerRating: ai.powerRating,
      duelRating: ai.duelRating,
    }));

    const cupId = `cup_${nowMs}_${crypto.randomBytes(3).toString('hex')}`;
    const matches: LiveMiniCupMatch[] = [
      // Round 1: Quarter-Finals (4 matches)
      {
        matchId: `${cupId}_qf1`,
        round: 1,
        slotIndex: 0,
        fighterA: humanParticipant,
        fighterB: sevenAi[0],
        winnerId: null,
        status: 'ready',
      },
      {
        matchId: `${cupId}_qf2`,
        round: 1,
        slotIndex: 1,
        fighterA: sevenAi[1],
        fighterB: sevenAi[2],
        winnerId: null,
        status: 'ready',
      },
      {
        matchId: `${cupId}_qf3`,
        round: 1,
        slotIndex: 2,
        fighterA: sevenAi[3],
        fighterB: sevenAi[4],
        winnerId: null,
        status: 'ready',
      },
      {
        matchId: `${cupId}_qf4`,
        round: 1,
        slotIndex: 3,
        fighterA: sevenAi[5],
        fighterB: sevenAi[6],
        winnerId: null,
        status: 'ready',
      },
      // Round 2: Semi-Finals (2 matches)
      {
        matchId: `${cupId}_sf1`,
        round: 2,
        slotIndex: 0,
        fighterA: null,
        fighterB: null,
        winnerId: null,
        status: 'pending',
      },
      {
        matchId: `${cupId}_sf2`,
        round: 2,
        slotIndex: 1,
        fighterA: null,
        fighterB: null,
        winnerId: null,
        status: 'pending',
      },
      // Round 3: Grand Final (1 match)
      {
        matchId: `${cupId}_gf`,
        round: 3,
        slotIndex: 0,
        fighterA: null,
        fighterB: null,
        winnerId: null,
        status: 'pending',
      },
    ];

    const cup: LiveMiniCupState = {
      cupId,
      playerName: params.playerName,
      createdAt: nowMs,
      status: 'active',
      currentRound: 1,
      matches,
      prizeClaimed: false,
      rewardGems: 0,
      rewardGold: 0,
    };

    if (!this.store.miniCupsByPlayer) this.store.miniCupsByPlayer = {};
    this.store.miniCupsByPlayer[pKey] = cup;

    const event = this.pushActivity({
      id: `evt_cup_start_${cupId}`,
      timestamp: nowMs,
      kind: 'duel_result',
      actorName: params.playerName,
      summary: `khai mạc Giải Cúp 1v1 8 Người — Tứ Kết đối đầu ${sevenAi[0].displayName}!`,
      accent: 'amber',
    });
    this.persistStore();
    return { cup, event };
  }

  private resolveAiVsAiCupMatch(match: LiveMiniCupMatch, seedSalt: number): LiveMiniCupParticipant | null {
    if (!match.fighterA || !match.fighterB) return null;
    const scoreA =
      match.fighterA.duelRating + ((match.fighterA.id.charCodeAt(0) * 31 + seedSalt) % 140);
    const scoreB =
      match.fighterB.duelRating + ((match.fighterB.id.charCodeAt(0) * 29 + seedSalt * 7) % 140);
    const winner = scoreA >= scoreB ? match.fighterA : match.fighterB;
    const loser = winner.id === match.fighterA.id ? match.fighterB : match.fighterA;
    match.winnerId = winner.id;
    match.status = 'completed';
    match.summary = `${winner.displayName} hạ ${loser.displayName}`;
    return winner;
  }

  public reportMiniCupMatchResult(params: {
    playerName: string;
    matchId: string;
    playerWon: boolean;
    nowMs?: number;
  }): {
    ok: boolean;
    alreadyProcessed: boolean;
    cup: LiveMiniCupState | null;
    rival?: AiRivalRecord | null;
    event?: AiLiveActivityEvent;
  } {
    const nowMs = params.nowMs ?? Date.now();
    const pKey = this.normalizePlayerKey(params.playerName);
    const cup = this.store.miniCupsByPlayer?.[pKey] ?? null;
    if (!cup) {
      return { ok: false, alreadyProcessed: false, cup: null };
    }

    const match = cup.matches.find((m) => m.matchId === params.matchId);
    if (!match || !match.fighterA || !match.fighterB) {
      return { ok: false, alreadyProcessed: false, cup };
    }

    if (match.status === 'completed') {
      return { ok: true, alreadyProcessed: true, cup };
    }

    const human = match.fighterA.isHuman ? match.fighterA : match.fighterB;
    const aiOpp = match.fighterA.isHuman ? match.fighterB : match.fighterA;
    const winner = params.playerWon ? human : aiOpp;
    match.winnerId = winner.id;
    match.status = 'completed';
    match.summary = params.playerWon
      ? `${human.displayName} chiến thắng ${aiOpp.displayName}`
      : `${aiOpp.displayName} loại ${human.displayName}`;

    // Escalate rivalry in Semi-Finals and Grand Final
    const rival = this.recordRivalEncounter({
      playerName: params.playerName,
      aiPlayerId: aiOpp.id,
      playerWon: params.playerWon,
      reason: match.round === 3 ? 'Chung Kết Cúp 1v1' : match.round === 2 ? 'Bán Kết Cúp 1v1' : 'Tứ Kết Cúp 1v1',
      scoreDelta: match.round === 3 ? 45 : 30,
      nowMs,
    });

    // Simultaneously resolve sibling AI-vs-AI matches in the same round
    const roundMatches = cup.matches.filter((m) => m.round === match.round);
    for (const rm of roundMatches) {
      if (rm.status !== 'completed' && rm.fighterA && rm.fighterB) {
        this.resolveAiVsAiCupMatch(rm, nowMs % 997);
      }
    }

    // Advance winners to next round
    if (match.round === 1) {
      const qf = cup.matches.filter((m) => m.round === 1);
      const sf1 = cup.matches.find((m) => m.round === 2 && m.slotIndex === 0)!;
      const sf2 = cup.matches.find((m) => m.round === 2 && m.slotIndex === 1)!;
      sf1.fighterA = qf[0].winnerId === qf[0].fighterA?.id ? qf[0].fighterA : qf[0].fighterB;
      sf1.fighterB = qf[1].winnerId === qf[1].fighterA?.id ? qf[1].fighterA : qf[1].fighterB;
      sf1.status = 'ready';
      sf2.fighterA = qf[2].winnerId === qf[2].fighterA?.id ? qf[2].fighterA : qf[2].fighterB;
      sf2.fighterB = qf[3].winnerId === qf[3].fighterA?.id ? qf[3].fighterA : qf[3].fighterB;
      sf2.status = 'ready';
      cup.currentRound = 2;
    } else if (match.round === 2) {
      const sf = cup.matches.filter((m) => m.round === 2);
      const gf = cup.matches.find((m) => m.round === 3)!;
      gf.fighterA = sf[0].winnerId === sf[0].fighterA?.id ? sf[0].fighterA : sf[0].fighterB;
      gf.fighterB = sf[1].winnerId === sf[1].fighterA?.id ? sf[1].fighterA : sf[1].fighterB;
      gf.status = 'ready';
      cup.currentRound = 3;
    }

    let event: AiLiveActivityEvent;
    if (!params.playerWon) {
      // Finish remaining AI bracket to crown the tournament champion
      for (const m of cup.matches) {
        if (m.round === 2 && m.status !== 'completed' && m.fighterA && m.fighterB) {
          this.resolveAiVsAiCupMatch(m, (nowMs + 17) % 997);
        }
      }
      const sf = cup.matches.filter((m) => m.round === 2);
      const gf = cup.matches.find((m) => m.round === 3)!;
      if (!gf.fighterA || !gf.fighterB) {
        gf.fighterA = sf[0].winnerId === sf[0].fighterA?.id ? sf[0].fighterA : sf[0].fighterB;
        gf.fighterB = sf[1].winnerId === sf[1].fighterA?.id ? sf[1].fighterA : sf[1].fighterB;
      }
      const champ = gf.status === 'completed'
        ? (gf.winnerId === gf.fighterA?.id ? gf.fighterA : gf.fighterB)
        : this.resolveAiVsAiCupMatch(gf, (nowMs + 41) % 997);

      cup.status = 'eliminated';
      cup.championName = champ?.displayName ?? aiOpp.displayName;
      cup.rewardGems = match.round === 3 ? 180 : match.round === 2 ? 95 : 40;
      cup.rewardGold = match.round === 3 ? 2800 : match.round === 2 ? 1500 : 700;
      cup.rewardTitleLabel =
        match.round === 3 ? 'Á Quân Cúp 1v1 Hoàng Đạo' : match.round === 2 ? 'Top 4 Cúp 1v1' : undefined;
      event = this.pushActivity({
        id: `evt_cup_end_${cup.cupId}_${match.round}`,
        timestamp: nowMs,
        kind: 'duel_result',
        actorName: params.playerName,
        summary:
          match.round === 3
            ? `giành ngôi Á Quân Cúp 1v1 8 Người sau trận Chung Kết nghẹt thở với ${aiOpp.displayName}!`
            : `dừng bước tại vòng ${match.round === 2 ? 'Bán Kết' : 'Tứ Kết'} Cúp 1v1 8 Người.`,
        accent: match.round === 3 ? 'amber' : 'rose',
      });
    } else if (match.round === 3) {
      cup.status = 'champion';
      cup.championName = human.displayName;
      cup.rewardGems = 320;
      cup.rewardGold = 4500;
      cup.rewardTitleLabel = 'Vô Địch Cúp 1v1 Hoàng Đạo';
      event = this.pushActivity({
        id: `evt_cup_champ_${cup.cupId}`,
        timestamp: nowMs,
        kind: 'duel_result',
        actorName: params.playerName,
        summary: `ĐĂNG QUANG VÔ ĐỊCH CÚP 1v1 8 NGƯỜI sau khi đánh bại ${aiOpp.displayName} ở Chung Kết!`,
        accent: 'amber',
      });
    } else {
      event = this.pushActivity({
        id: `evt_cup_adv_${cup.cupId}_${match.round}`,
        timestamp: nowMs,
        kind: 'duel_result',
        actorName: params.playerName,
        summary: `vượt qua ${aiOpp.displayName} tiến vào ${match.round === 1 ? 'Bán Kết' : 'Chung Kết'} Cúp 1v1 8 Người!`,
        accent: 'emerald',
      });
    }

    this.persistStore();
    return { ok: true, alreadyProcessed: false, cup, rival, event };
  }

  public claimMiniCupPrize(params: {
    playerName: string;
    cupId: string;
  }): {
    ok: boolean;
    alreadyClaimed: boolean;
    goldReward: number;
    gemsReward: number;
    titleLabel?: string;
    cup: LiveMiniCupState | null;
    message: string;
  } {
    const pKey = this.normalizePlayerKey(params.playerName);
    const cup = this.store.miniCupsByPlayer?.[pKey] ?? null;
    if (!cup || cup.cupId !== params.cupId) {
      return {
        ok: false,
        alreadyClaimed: false,
        goldReward: 0,
        gemsReward: 0,
        cup,
        message: 'Không tìm thấy giải Cúp 1v1 tương ứng.',
      };
    }
    if (cup.status === 'active') {
      return {
        ok: false,
        alreadyClaimed: false,
        goldReward: 0,
        gemsReward: 0,
        cup,
        message: 'Giải Cúp vẫn đang diễn ra — hãy hoàn tất nhánh đấu trước.',
      };
    }
    if (cup.prizeClaimed) {
      return {
        ok: true,
        alreadyClaimed: true,
        goldReward: 0,
        gemsReward: 0,
        cup,
        message: 'Phần thưởng Cúp 1v1 này đã được nhận trước đó.',
      };
    }

    cup.prizeClaimed = true;
    this.persistStore();
    return {
      ok: true,
      alreadyClaimed: false,
      goldReward: cup.rewardGold,
      gemsReward: cup.rewardGems,
      titleLabel: cup.rewardTitleLabel,
      cup,
      message: `Nhận thưởng Cúp 1v1: +${cup.rewardGold} Vàng · +${cup.rewardGems} Ngọc Hồn${
        cup.rewardTitleLabel ? ` · Danh hiệu "${cup.rewardTitleLabel}"` : ''
      }!`,
    };
  }

  // ============================================================================
  // WAVE 7 — PILLAR 5: SERVER-AUTHORITATIVE LIVE SERVER-WIDE BOUNTY BOARD
  // ============================================================================

  private createFreshServerBounty(dateKey: string, nowMs: number): LiveServerBountyState {
    const daySeed = dateKey.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const catalog = [
      {
        title: 'Lệnh Truy Nã: Diệt Hắc Long Tinh Giới',
        subtitle: 'Toàn server (Bạn + người chơi [AI Live]) gom Chiến Tích hạ Boss & Phá Giáp.',
        objectiveLabel: 'Chiến Tích Truy Nã Toàn Server',
        targetPoints: 2400,
        rewardGold: 3200,
        rewardGems: 120,
        rewardStarDust: 180,
      },
      {
        title: 'Lệnh Truy Nã: Phá Vỡ Hư Không Cổ Đại',
        subtitle: 'Đóng góp điểm truy nã từ trận chiến, Co-op & hạ Boss cùng cộng đồng [AI Live].',
        objectiveLabel: 'Chiến Tích Hư Không Toàn Server',
        targetPoints: 2600,
        rewardGold: 3500,
        rewardGems: 135,
        rewardStarDust: 200,
      },
      {
        title: 'Lệnh Truy Nã: Đột Kích Đỉnh Tinh Tú',
        subtitle: 'Hoàn tất mốc chung hằng ngày để mở Rương Truy Nã Server cho toàn bộ chiến binh.',
        objectiveLabel: 'Chiến Tích Tinh Tú Toàn Server',
        targetPoints: 2200,
        rewardGold: 3000,
        rewardGems: 115,
        rewardStarDust: 165,
      },
    ];
    const tpl = catalog[daySeed % catalog.length];
    const seededContributors: LiveServerBountyContributor[] = this.store.players
      .slice(0, 5)
      .map((ai, idx) => ({
        id: ai.id,
        displayName: `${ai.displayName} ${ai.tag}`,
        isHuman: false,
        heroId: ai.heroId,
        points: 260 - idx * 32,
        lastContributedAt: nowMs - (idx + 1) * 45_000,
      }));
    const currentPoints = seededContributors.reduce((acc, c) => acc + c.points, 0);
    return {
      bountyId: `bounty_${dateKey}`,
      dateKey,
      title: tpl.title,
      subtitle: tpl.subtitle,
      objectiveLabel: tpl.objectiveLabel,
      targetPoints: tpl.targetPoints,
      currentPoints,
      completed: currentPoints >= tpl.targetPoints,
      rewardGold: tpl.rewardGold,
      rewardGems: tpl.rewardGems,
      rewardStarDust: tpl.rewardStarDust,
      claimedByPlayer: false,
      contributors: seededContributors,
      lastUpdatedAt: nowMs,
    };
  }

  private ensureServerBounty(nowMs = Date.now()): LiveServerBountyState {
    const dateKey = new Date(nowMs).toISOString().slice(0, 10);
    if (!this.store.serverBounty || this.store.serverBounty.dateKey !== dateKey) {
      this.store.serverBounty = this.createFreshServerBounty(dateKey, nowMs);
      this.store.serverBountyClaimsByPlayer = {};
    }
    return this.store.serverBounty;
  }

  private applyServerBountyContributionInternal(params: {
    id: string;
    displayName: string;
    isHuman: boolean;
    heroId: HeroId;
    points: number;
    nowMs: number;
  }): LiveServerBountyState {
    const bounty = this.ensureServerBounty(params.nowMs);
    const pts = Math.max(10, Math.min(600, Math.round(params.points)));
    bounty.currentPoints = Math.min(bounty.targetPoints * 3, bounty.currentPoints + pts);
    if (bounty.currentPoints >= bounty.targetPoints) {
      bounty.completed = true;
    }
    bounty.lastUpdatedAt = params.nowMs;

    const existing = bounty.contributors.find((c) => c.id === params.id);
    if (existing) {
      existing.displayName = params.displayName;
      existing.heroId = params.heroId;
      existing.points += pts;
      existing.lastContributedAt = params.nowMs;
    } else {
      bounty.contributors.push({
        id: params.id,
        displayName: params.displayName,
        isHuman: params.isHuman,
        heroId: normalizePlayableHeroId(params.heroId),
        points: pts,
        lastContributedAt: params.nowMs,
      });
    }
    bounty.contributors.sort((a, b) => b.points - a.points);
    bounty.contributors = bounty.contributors.slice(0, 12);
    return bounty;
  }

  public getServerBountyState(playerName?: string, nowMs = Date.now()): LiveServerBountyState {
    const bounty = this.ensureServerBounty(nowMs);
    const pKey = playerName ? this.normalizePlayerKey(playerName) : null;
    const claimedByPlayer = pKey
      ? Boolean(this.store.serverBountyClaimsByPlayer?.[pKey])
      : false;
    return {
      ...bounty,
      claimedByPlayer,
      contributors: bounty.contributors.map((c) => ({ ...c })),
    };
  }

  public recordHumanBountyContribution(params: {
    playerName: string;
    heroId?: HeroId;
    points: number;
    sourceLabel?: string;
    nowMs?: number;
  }): { state: LiveServerBountyState; event: AiLiveActivityEvent } {
    const nowMs = params.nowMs ?? Date.now();
    const pKey = this.normalizePlayerKey(params.playerName);
    const pts = Math.max(20, Math.min(500, Math.round(params.points)));
    this.applyServerBountyContributionInternal({
      id: `human_${pKey}`,
      displayName: params.playerName,
      isHuman: true,
      heroId: normalizePlayableHeroId(params.heroId),
      points: pts,
      nowMs,
    });
    const event = this.pushActivity({
      id: `evt_bounty_h_${nowMs}_${crypto.randomBytes(3).toString('hex')}`,
      timestamp: nowMs,
      kind: 'world_boss',
      actorName: params.playerName,
      summary: `đóng góp +${pts} Chiến Tích vào Lệnh Truy Nã Toàn Server${
        params.sourceLabel ? ` (${params.sourceLabel})` : ''
      }!`,
      accent: 'amber',
    });
    this.persistStore();
    return {
      state: this.getServerBountyState(params.playerName, nowMs),
      event,
    };
  }

  public claimServerBountyReward(params: {
    playerName: string;
    bountyId?: string;
    nowMs?: number;
  }): {
    ok: boolean;
    alreadyClaimed: boolean;
    goldReward: number;
    gemsReward: number;
    starDustReward: number;
    message: string;
    state: LiveServerBountyState;
  } {
    const nowMs = params.nowMs ?? Date.now();
    const bounty = this.ensureServerBounty(nowMs);
    const pKey = this.normalizePlayerKey(params.playerName);
    if (params.bountyId && params.bountyId !== bounty.bountyId) {
      return {
        ok: false,
        alreadyClaimed: false,
        goldReward: 0,
        gemsReward: 0,
        starDustReward: 0,
        message: 'Lệnh Truy Nã Server đã chuyển sang ngày mới.',
        state: this.getServerBountyState(params.playerName, nowMs),
      };
    }

    if (!this.store.serverBountyClaimsByPlayer) {
      this.store.serverBountyClaimsByPlayer = {};
    }
    if (this.store.serverBountyClaimsByPlayer[pKey]) {
      return {
        ok: true,
        alreadyClaimed: true,
        goldReward: 0,
        gemsReward: 0,
        starDustReward: 0,
        message: 'Bạn đã nhận Rương Truy Nã Toàn Server hôm nay.',
        state: this.getServerBountyState(params.playerName, nowMs),
      };
    }

    if (!bounty.completed && bounty.currentPoints < bounty.targetPoints) {
      return {
        ok: false,
        alreadyClaimed: false,
        goldReward: 0,
        gemsReward: 0,
        starDustReward: 0,
        message: `Cần đủ ${bounty.targetPoints.toLocaleString('vi-VN')} Chiến Tích toàn server (hiện đạt ${bounty.currentPoints.toLocaleString('vi-VN')}).`,
        state: this.getServerBountyState(params.playerName, nowMs),
      };
    }

    this.store.serverBountyClaimsByPlayer[pKey] = true;
    this.persistStore();
    return {
      ok: true,
      alreadyClaimed: false,
      goldReward: bounty.rewardGold,
      gemsReward: bounty.rewardGems,
      starDustReward: bounty.rewardStarDust,
      message: `Nhận Rương Truy Nã Server: +${bounty.rewardGold} Vàng · +${bounty.rewardGems} Ngọc · +${bounty.rewardStarDust} Bụi Tinh Tú!`,
      state: this.getServerBountyState(params.playerName, nowMs),
    };
  }

  // ============================================================================
  // WAVE 10 — PILLAR 5A: ADAPTIVE AI PLAYSTYLE LEARNING
  // ============================================================================

  public getAdaptationForPlayer(playerName: string): AiPlayerAdaptationProfile | null {
    const pKey = this.normalizePlayerKey(playerName);
    const prof = this.store.adaptationByPlayer?.[pKey] ?? null;
    return prof ? { ...prof } : null;
  }

  public recordPlayerCombatTelemetry(params: {
    playerName: string;
    telemetry: PlayerCombatTelemetryInput;
    nowMs?: number;
  }): AiPlayerAdaptationProfile {
    const nowMs = params.nowMs ?? Date.now();
    const pKey = this.normalizePlayerKey(params.playerName);
    if (!this.store.adaptationByPlayer) {
      this.store.adaptationByPlayer = {};
    }
    const prev = this.store.adaptationByPlayer[pKey] ?? null;
    const updated = derivePlayerAdaptationProfile(
      prev,
      params.playerName,
      params.telemetry,
      nowMs
    );
    this.store.adaptationByPlayer[pKey] = updated;
    this.persistStore();
    return { ...updated };
  }

  public resetPlayerAdaptation(playerName: string): void {
    const pKey = this.normalizePlayerKey(playerName);
    if (this.store.adaptationByPlayer && this.store.adaptationByPlayer[pKey]) {
      delete this.store.adaptationByPlayer[pKey];
      this.persistStore();
    }
  }

  // ============================================================================
  // WAVE 10 — PILLAR 5B: REAL-TIME 3-BASTION GUILD WAR BATTLEFIELD
  // ============================================================================

  private ensureLiveGuildWar(nowMs = Date.now()): LiveGuildWarState {
    const dateKey = new Date(nowMs).toISOString().slice(0, 10);
    if (!this.store.guildWarLive || this.store.guildWarLive.dateKey !== dateKey) {
      this.store.guildWarLive = createInitialLiveGuildWarState(dateKey, nowMs);
      this.store.guildWarClaimsByPlayer = {};
    }
    return this.store.guildWarLive;
  }

  public getLiveGuildWarState(playerName?: string, nowMs = Date.now()): LiveGuildWarState {
    const war = this.ensureLiveGuildWar(nowMs);
    const pKey = playerName ? this.normalizePlayerKey(playerName) : null;
    const claimedByPlayer = pKey
      ? Boolean(this.store.guildWarClaimsByPlayer?.[pKey])
      : false;
    return {
      ...war,
      claimedByPlayer,
      bastions: war.bastions.map((b) => ({ ...b })),
      contributors: war.contributors.map((c) => ({ ...c })),
    };
  }

  public strikeGuildWarBastion(params: {
    playerName: string;
    heroId?: HeroId;
    bastionId: GuildWarBastionId;
    mode: 'assault_3d' | 'quick_strike';
    scoreGain?: number;
    nowMs?: number;
  }): {
    state: LiveGuildWarState;
    pointsAwarded: number;
    bastionName: string;
    flippedOwner: boolean;
    event: AiLiveActivityEvent;
  } {
    const nowMs = params.nowMs ?? Date.now();
    const war = this.ensureLiveGuildWar(nowMs);
    const pKey = this.normalizePlayerKey(params.playerName);
    const res = applyGuildWarBastionStrike(war, {
      actorId: `human_${pKey}`,
      actorName: params.playerName,
      heroId: normalizePlayableHeroId(params.heroId),
      isHuman: true,
      faction: 'zodiac_guild',
      bastionId: params.bastionId,
      mode: params.mode,
      scoreGain: params.scoreGain,
      nowMs,
    });
    this.store.guildWarLive = res.nextState;
    const event = this.pushActivity({
      id: `evt_gwar_${nowMs}_${crypto.randomBytes(3).toString('hex')}`,
      timestamp: nowMs,
      kind: 'guild',
      actorName: params.playerName,
      summary:
        params.mode === 'assault_3d'
          ? `xung kích 3D tại ${res.bastion.name} (+${res.pointsAwarded} điểm Bang)!`
          : `chi viện nhanh ${res.bastion.name} (+${res.pointsAwarded} điểm Bang)!`,
      accent: res.flippedOwner ? 'amber' : 'emerald',
    });
    this.persistStore();
    return {
      state: this.getLiveGuildWarState(params.playerName, nowMs),
      pointsAwarded: res.pointsAwarded,
      bastionName: res.bastion.name,
      flippedOwner: res.flippedOwner,
      event,
    };
  }

  public claimLiveGuildWarReward(params: {
    playerName: string;
    warId?: string;
    nowMs?: number;
  }): {
    ok: boolean;
    alreadyClaimed: boolean;
    goldReward: number;
    gemsReward: number;
    guildCoinsReward: number;
    starDustReward: number;
    message: string;
    state: LiveGuildWarState;
  } {
    const nowMs = params.nowMs ?? Date.now();
    const war = this.ensureLiveGuildWar(nowMs);
    const pKey = this.normalizePlayerKey(params.playerName);

    if (params.warId && params.warId !== war.warId) {
      return {
        ok: false,
        alreadyClaimed: false,
        goldReward: 0,
        gemsReward: 0,
        guildCoinsReward: 0,
        starDustReward: 0,
        message: 'Chiến Trường Bang đã chuyển sang ngày mới.',
        state: this.getLiveGuildWarState(params.playerName, nowMs),
      };
    }

    if (!this.store.guildWarClaimsByPlayer) {
      this.store.guildWarClaimsByPlayer = {};
    }
    if (this.store.guildWarClaimsByPlayer[pKey]) {
      return {
        ok: true,
        alreadyClaimed: true,
        goldReward: 0,
        gemsReward: 0,
        guildCoinsReward: 0,
        starDustReward: 0,
        message: 'Bạn đã nhận Rương Chiến Trường Bang hôm nay.',
        state: this.getLiveGuildWarState(params.playerName, nowMs),
      };
    }

    const wonOrParticipated =
      war.status === 'zodiac_victory' ||
      war.status === 'rival_victory' ||
      war.zodiacScore >= 600;
    if (!wonOrParticipated) {
      return {
        ok: false,
        alreadyClaimed: false,
        goldReward: 0,
        gemsReward: 0,
        guildCoinsReward: 0,
        starDustReward: 0,
        message: `Cần Bang đạt tối thiểu 600 điểm Chiến Trường hoặc phân định thắng bại (hiện ${war.zodiacScore}/${war.targetScore}).`,
        state: this.getLiveGuildWarState(params.playerName, nowMs),
      };
    }

    const winMult = war.status === 'zodiac_victory' ? 1.0 : 0.7;
    const goldReward = Math.round(war.rewardGold * winMult);
    const gemsReward = Math.round(war.rewardGems * winMult);
    const guildCoinsReward = Math.round(war.rewardGuildCoins * winMult);
    const starDustReward = Math.round(war.rewardStarDust * winMult);

    this.store.guildWarClaimsByPlayer[pKey] = true;
    this.persistStore();
    return {
      ok: true,
      alreadyClaimed: false,
      goldReward,
      gemsReward,
      guildCoinsReward,
      starDustReward,
      message: `Nhận Rương Chiến Trường Bang: +${goldReward} Vàng · +${gemsReward} Ngọc · +${guildCoinsReward} Xu Bang · +${starDustReward} Bụi!`,
      state: this.getLiveGuildWarState(params.playerName, nowMs),
    };
  }

  // ==========================================================================
  // WAVE 11 — PILLAR 5B: LIVE AI CHAMPIONSHIP SPECTATOR ARENA
  // ==========================================================================

  private ensureLiveSpectatorMatch(nowMs = Date.now()): LiveSpectatorMatchState {
    if (!this.store.spectatorMatch) {
      const seq = Math.max(1, Math.floor(this.store.spectatorMatchSeq ?? 1));
      this.store.spectatorMatchSeq = seq;
      this.store.spectatorMatch = createLiveSpectatorMatch(
        this.store.players.map((p) => ({
          id: p.id,
          displayName: p.displayName,
          heroId: p.heroId,
          powerRating: p.powerRating,
          personality: p.personality,
        })),
        nowMs,
        seq
      );
    }
    return this.store.spectatorMatch;
  }

  public startNextSpectatorMatch(nowMs = Date.now()): LiveSpectatorMatchState {
    const nextSeq = Math.max(1, Math.floor(this.store.spectatorMatchSeq ?? 1)) + 1;
    this.store.spectatorMatchSeq = nextSeq;
    const match = createLiveSpectatorMatch(
      this.store.players.map((p) => ({
        id: p.id,
        displayName: p.displayName,
        heroId: p.heroId,
        powerRating: p.powerRating,
        personality: p.personality,
      })),
      nowMs,
      nextSeq
    );
    this.store.spectatorMatch = match;
    this.persistStore();
    return match;
  }

  public getLiveSpectatorMatch(
    playerName?: string,
    nowMs = Date.now()
  ): LiveSpectatorMatchState {
    const match = this.ensureLiveSpectatorMatch(nowMs);
    const pKey = playerName ? this.normalizePlayerKey(playerName) : null;
    const cheeredFighterId =
      pKey && this.store.spectatorCheersByMatch?.[match.matchId]?.[pKey]
        ? this.store.spectatorCheersByMatch[match.matchId][pKey]
        : null;
    const claimed = Boolean(
      pKey && this.store.spectatorClaimsByMatch?.[match.matchId]?.[pKey]
    );
    return {
      ...match,
      fighterA: { ...match.fighterA },
      fighterB: { ...match.fighterB },
      tickerLog: match.tickerLog.map((t) => ({ ...t })),
      playerCheeredFighterId: cheeredFighterId,
      playerClaimedReward: claimed,
    };
  }

  public cheerSpectatorFighter(params: {
    playerName: string;
    matchId?: string;
    fighterId: string;
    nowMs?: number;
  }): {
    ok: boolean;
    message: string;
    state: LiveSpectatorMatchState;
  } {
    const nowMs = params.nowMs ?? Date.now();
    const match = this.ensureLiveSpectatorMatch(nowMs);
    if (params.matchId && params.matchId !== match.matchId) {
      return {
        ok: false,
        message: 'Khán đài đã chuyển sang trận đấu mới.',
        state: this.getLiveSpectatorMatch(params.playerName, nowMs),
      };
    }
    if (match.status === 'finished') {
      return {
        ok: false,
        message: 'Trận đấu AI đã kết thúc, hãy chờ trận kế tiếp để cổ vũ.',
        state: this.getLiveSpectatorMatch(params.playerName, nowMs),
      };
    }
    const isA = match.fighterA.aiPlayerId === params.fighterId;
    const isB = match.fighterB.aiPlayerId === params.fighterId;
    if (!isA && !isB) {
      return {
        ok: false,
        message: 'Tuyển thủ AI không hợp lệ.',
        state: this.getLiveSpectatorMatch(params.playerName, nowMs),
      };
    }

    const pKey = this.normalizePlayerKey(params.playerName);
    if (!this.store.spectatorCheersByMatch) this.store.spectatorCheersByMatch = {};
    if (!this.store.spectatorCheersByMatch[match.matchId]) {
      this.store.spectatorCheersByMatch[match.matchId] = {};
    }
    const existing = this.store.spectatorCheersByMatch[match.matchId][pKey];
    if (existing) {
      return {
        ok: true,
        message: 'Bạn đã gửi phiếu cổ vũ cho trận đấu này rồi.',
        state: this.getLiveSpectatorMatch(params.playerName, nowMs),
      };
    }

    this.store.spectatorCheersByMatch[match.matchId][pKey] = params.fighterId;
    if (isA) match.fighterA.cheersCount += 1;
    else match.fighterB.cheersCount += 1;
    const pickedName = isA ? match.fighterA.displayName : match.fighterB.displayName;
    this.persistStore();
    return {
      ok: true,
      message: `Đã cổ vũ ${pickedName}! Dự đoán đúng sẽ nhận thưởng đầy đủ khi kết thúc.`,
      state: this.getLiveSpectatorMatch(params.playerName, nowMs),
    };
  }

  public claimSpectatorReward(params: {
    playerName: string;
    matchId?: string;
    nowMs?: number;
  }): {
    ok: boolean;
    alreadyClaimed: boolean;
    predictedCorrectly: boolean;
    goldReward: number;
    gemsReward: number;
    starDustReward: number;
    message: string;
    state: LiveSpectatorMatchState;
  } {
    const nowMs = params.nowMs ?? Date.now();
    const match = this.ensureLiveSpectatorMatch(nowMs);
    if (params.matchId && params.matchId !== match.matchId) {
      return {
        ok: false,
        alreadyClaimed: false,
        predictedCorrectly: false,
        goldReward: 0,
        gemsReward: 0,
        starDustReward: 0,
        message: 'Trận đấu đã hết hiệu lực nhận thưởng.',
        state: this.getLiveSpectatorMatch(params.playerName, nowMs),
      };
    }
    if (match.status !== 'finished') {
      return {
        ok: false,
        alreadyClaimed: false,
        predictedCorrectly: false,
        goldReward: 0,
        gemsReward: 0,
        starDustReward: 0,
        message: 'Trận đấu AI đang diễn ra, hãy chờ kết quả cuối cùng.',
        state: this.getLiveSpectatorMatch(params.playerName, nowMs),
      };
    }
    const pKey = this.normalizePlayerKey(params.playerName);
    const cheeredFighterId = this.store.spectatorCheersByMatch?.[match.matchId]?.[pKey];
    if (!cheeredFighterId) {
      return {
        ok: false,
        alreadyClaimed: false,
        predictedCorrectly: false,
        goldReward: 0,
        gemsReward: 0,
        starDustReward: 0,
        message: 'Bạn chưa gửi phiếu cổ vũ cho trận đấu này.',
        state: this.getLiveSpectatorMatch(params.playerName, nowMs),
      };
    }
    if (!this.store.spectatorClaimsByMatch) this.store.spectatorClaimsByMatch = {};
    if (!this.store.spectatorClaimsByMatch[match.matchId]) {
      this.store.spectatorClaimsByMatch[match.matchId] = {};
    }
    if (this.store.spectatorClaimsByMatch[match.matchId][pKey]) {
      return {
        ok: true,
        alreadyClaimed: true,
        predictedCorrectly: match.winnerId === cheeredFighterId,
        goldReward: 0,
        gemsReward: 0,
        starDustReward: 0,
        message: 'Bạn đã nhận thưởng cổ vũ trận này rồi.',
        state: this.getLiveSpectatorMatch(params.playerName, nowMs),
      };
    }

    const reward = computeSpectatorCheerReward(match, cheeredFighterId);
    this.store.spectatorClaimsByMatch[match.matchId][pKey] = true;
    this.persistStore();
    return {
      ok: true,
      alreadyClaimed: false,
      predictedCorrectly: reward.predictedCorrectly,
      goldReward: reward.goldReward,
      gemsReward: reward.gemsReward,
      starDustReward: reward.starDustReward,
      message: reward.predictedCorrectly
        ? `Dự đoán chính xác! Nhận +${reward.goldReward} Vàng · +${reward.gemsReward} Ngọc · +${reward.starDustReward} Bụi!`
        : `Quà cổ vũ Khán Đài: +${reward.goldReward} Vàng · +${reward.gemsReward} Ngọc · +${reward.starDustReward} Bụi!`,
      state: this.getLiveSpectatorMatch(params.playerName, nowMs),
    };
  }
}



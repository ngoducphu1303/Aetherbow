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
  AiLivePlayerPersonality,
  AiLivePlayerProfile,
  AiLivePlayerStatus,
  AvatarFrameId,
  HeroId,
} from '../types/game.ts';

interface LiveAiStoreData {
  version: 1;
  players: AiLivePlayerProfile[];
  activities: AiLiveActivityEvent[];
  processedDuelIds: Record<string, number>;
  chatHistory?: {
    lobby: AiLiveChatMessage[];
    guild: AiLiveChatMessage[];
  };
}

const MAX_CHAT_PER_CHANNEL = 40;

function buildDefaultAiBuildSnapshot(seed: RosterSeed): AiLiveBuildSnapshot {
  const weaponByHero: Record<HeroId, string> = {
    artemis: 'Cung Ngân Hà Tinh Tú +20',
    alex: 'Cung Nhật Luân Hoàng Kim +19',
    thor: 'Lôi Cung Thiên Đế +21',
    wukong: 'Như Ý Kim Côn Tinh Giới +22',
    cleo: 'Phượng Hỏa Pháp Trượng +19',
    rolla: 'Hàn Sương Thánh Trượng +18',
    atreus: 'Cung Thanh Vân Sơ Khởi +17',
    dracoola: 'Huyết Nguyệt Ma Trảo +21',
  };
  const mountPool = [
    'Thanh Long Thiên Giới',
    'Hỏa Long Viêm Hoàng',
    'Kỳ Lân Băng Sương',
    'Thiên Sư Thái Dương',
    'Chiến Mã Bạch Dương',
  ];
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
        heroId: 'wukong',
        text: 'Ai vào Co-op 3D Thần Thoại săn mảnh Sử Thi cùng mình không?',
        timestamp: nowMs - 115_000,
      },
      {
        id: 'chat_init_lobby_2',
        channel: 'lobby',
        senderName: 'Linh Vũ',
        senderTag: '[AI Live]',
        aiPlayerId: 'ai_linh_vu',
        heroId: 'artemis',
        text: 'Boss Tuần này đọc vòng Quét Vòng né đúng nhịp ăn thêm +125 điểm Né Hoàn Hảo ngon lắm!',
        timestamp: nowMs - 68_000,
      },
      {
        id: 'chat_init_lobby_3',
        channel: 'lobby',
        senderName: 'Cửu Thiên',
        senderTag: '[AI Live]',
        aiPlayerId: 'ai_cuu_thien',
        heroId: 'thor',
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
        heroId: 'wukong',
        text: 'Anh em Bang Hoàng Đạo nhớ đánh đủ lượt Boss Bang Thái Cổ Ma Long lấy rương ngày nhé!',
        timestamp: nowMs - 95_000,
      },
      {
        id: 'chat_init_guild_2',
        channel: 'guild',
        senderName: 'Sát Tinh',
        senderTag: '[AI Live]',
        aiPlayerId: 'ai_sat_tinh',
        heroId: 'dracoola',
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
  { id: 'ai_te_thien', displayName: 'Tề Thiên', heroId: 'wukong', powerRating: 5910, highestChapterCleared: 10, worldBossBestDamage: 168400, bestTowerFloor: 48, personality: 'assassin', duelRating: 1620, weeklyPracticeBest: 15740, weeklyPracticeClearTimeMs: 31200, guildRole: 'Bang Chủ', guildContribution: 9850, guildBossDamage: 142600, titleBadge: 'Chí Tôn Tinh Giới', frameId: 'world_dragon' },
  { id: 'ai_sat_tinh', displayName: 'Sát Tinh', heroId: 'dracoola', powerRating: 5680, highestChapterCleared: 9, worldBossBestDamage: 154200, bestTowerFloor: 45, personality: 'assassin', duelRating: 1585, weeklyPracticeBest: 15380, weeklyPracticeClearTimeMs: 33400, guildRole: 'Phó Bang', guildContribution: 8620, guildBossDamage: 129400, titleBadge: 'Ảnh Sát Hoàng Đạo', frameId: 'royal_vip' },
  { id: 'ai_cuu_thien', displayName: 'Cửu Thiên', heroId: 'thor', powerRating: 5490, highestChapterCleared: 9, worldBossBestDamage: 146800, bestTowerFloor: 43, personality: 'aggressive', duelRating: 1540, weeklyPracticeBest: 14680, weeklyPracticeClearTimeMs: 36100, guildRole: 'Phó Bang', guildContribution: 8140, guildBossDamage: 121800, titleBadge: 'Lôi Thần Chinh Phạt', frameId: 'seraph_crown' },
  { id: 'ai_hao_thien', displayName: 'Hạo Thiên', heroId: 'alex', powerRating: 5340, highestChapterCleared: 8, worldBossBestDamage: 138500, bestTowerFloor: 41, personality: 'aggressive', duelRating: 1510, weeklyPracticeBest: 14920, weeklyPracticeClearTimeMs: 35300, guildRole: 'Tinh Anh', guildContribution: 7490, guildBossDamage: 114200, titleBadge: 'Hạo Nhật Thần Xạ', frameId: 'royal_vip' },
  { id: 'ai_kiem_thanh', displayName: 'Kiếm Thánh', heroId: 'wukong', powerRating: 5120, highestChapterCleared: 8, worldBossBestDamage: 129600, bestTowerFloor: 39, personality: 'assassin', duelRating: 1495, weeklyPracticeBest: 14350, weeklyPracticeClearTimeMs: 38200, guildRole: 'Tinh Anh', guildContribution: 6980, guildBossDamage: 108500, titleBadge: 'Vô Song Kiếm Ảnh', frameId: 'crystal_guardian' },
  { id: 'ai_loi_de', displayName: 'Lôi Đế', heroId: 'thor', powerRating: 4980, highestChapterCleared: 7, worldBossBestDamage: 122400, bestTowerFloor: 37, personality: 'aggressive', duelRating: 1475, weeklyPracticeBest: 14120, weeklyPracticeClearTimeMs: 39400, guildRole: 'Tinh Anh', guildContribution: 6420, guildBossDamage: 99800, titleBadge: 'Lôi Đình Hộ Pháp', frameId: 'seraph_crown' },
  { id: 'ai_linh_vu', displayName: 'Linh Vũ', heroId: 'artemis', powerRating: 4820, highestChapterCleared: 7, worldBossBestDamage: 118900, bestTowerFloor: 35, personality: 'tactical', duelRating: 1420, weeklyPracticeBest: 13850, weeklyPracticeClearTimeMs: 41100, guildRole: 'Tinh Anh', guildContribution: 6150, guildBossDamage: 94200, titleBadge: 'Thần Xạ Ngân Hà', frameId: 'astral_crescent' },
  { id: 'ai_phong_van', displayName: 'Phong Vân', heroId: 'wukong', powerRating: 4720, highestChapterCleared: 6, worldBossBestDamage: 110500, bestTowerFloor: 33, personality: 'assassin', duelRating: 1460, weeklyPracticeBest: 13940, weeklyPracticeClearTimeMs: 40600, guildRole: 'Tinh Vệ', guildContribution: 5640, guildBossDamage: 87400, titleBadge: 'Liệt Phong Săn Boss', frameId: 'crystal_guardian' },
  { id: 'ai_hoa_phuong', displayName: 'Hỏa Phượng', heroId: 'cleo', powerRating: 4610, highestChapterCleared: 6, worldBossBestDamage: 104200, bestTowerFloor: 31, personality: 'aggressive', duelRating: 1440, weeklyPracticeBest: 13560, weeklyPracticeClearTimeMs: 43200, guildRole: 'Tinh Vệ', guildContribution: 5210, guildBossDamage: 82900, titleBadge: 'Phượng Hoàng Cháy Rực', frameId: 'royal_vip' },
  { id: 'ai_han_bang', displayName: 'Hàn Băng', heroId: 'rolla', powerRating: 4510, highestChapterCleared: 6, worldBossBestDamage: 98400, bestTowerFloor: 30, personality: 'tactical', duelRating: 1410, weeklyPracticeBest: 13290, weeklyPracticeClearTimeMs: 44800, guildRole: 'Tinh Vệ', guildContribution: 4890, guildBossDamage: 78600, titleBadge: 'Hàn Sương Thánh Nữ', frameId: 'astral_crescent' },
  { id: 'ai_thanh_van', displayName: 'Thanh Vân', heroId: 'atreus', powerRating: 4460, highestChapterCleared: 5, worldBossBestDamage: 93200, bestTowerFloor: 28, personality: 'tactical', duelRating: 1390, weeklyPracticeBest: 13040, weeklyPracticeClearTimeMs: 46500, guildRole: 'Tinh Vệ', guildContribution: 4560, guildBossDamage: 74200, titleBadge: 'Thanh Vân Vệ Sĩ', frameId: 'default_gold' },
  { id: 'ai_kiet_tac', displayName: 'Kiệt Tác', heroId: 'dracoola', powerRating: 4320, highestChapterCleared: 5, worldBossBestDamage: 88600, bestTowerFloor: 26, personality: 'aggressive', duelRating: 1340, weeklyPracticeBest: 12650, weeklyPracticeClearTimeMs: 48900, guildRole: 'Tinh Vệ', guildContribution: 4180, guildBossDamage: 69500, titleBadge: 'Huyết Nguyệt Kỵ Sĩ', frameId: 'crystal_guardian' },
  { id: 'ai_bach_tuyet', displayName: 'Bạch Tuyết', heroId: 'rolla', powerRating: 4190, highestChapterCleared: 5, worldBossBestDamage: 84100, bestTowerFloor: 25, personality: 'tactical', duelRating: 1365, weeklyPracticeBest: 12410, weeklyPracticeClearTimeMs: 50200, guildRole: 'Thành Viên', guildContribution: 3920, guildBossDamage: 65100, titleBadge: 'Băng Tuyết Pháp Sư', frameId: 'astral_crescent' },
  { id: 'ai_duong_quang', displayName: 'Dương Quang', heroId: 'alex', powerRating: 3960, highestChapterCleared: 4, worldBossBestDamage: 76500, bestTowerFloor: 22, personality: 'aggressive', duelRating: 1325, weeklyPracticeBest: 12100, weeklyPracticeClearTimeMs: 52600, guildRole: 'Thành Viên', guildContribution: 3480, guildBossDamage: 58900, titleBadge: 'Nhật Luân Cung Thủ', frameId: 'default_gold' },
  { id: 'ai_tinh_ha', displayName: 'Tinh Hà', heroId: 'rolla', powerRating: 3880, highestChapterCleared: 4, worldBossBestDamage: 71900, bestTowerFloor: 20, personality: 'tactical', duelRating: 1310, weeklyPracticeBest: 11890, weeklyPracticeClearTimeMs: 54100, guildRole: 'Thành Viên', guildContribution: 3190, guildBossDamage: 54300, titleBadge: 'Tinh Hà Chiêm Tinh', frameId: 'astral_crescent' },
  { id: 'ai_nguyet_anh', displayName: 'Nguyệt Ảnh', heroId: 'artemis', powerRating: 3650, highestChapterCleared: 3, worldBossBestDamage: 64800, bestTowerFloor: 18, personality: 'tactical', duelRating: 1280, weeklyPracticeBest: 11200, weeklyPracticeClearTimeMs: 57900, guildRole: 'Thành Viên', guildContribution: 2840, guildBossDamage: 48600, titleBadge: 'Nguyệt Quang Xạ Thủ', frameId: 'default_gold' },
  { id: 'ai_thien_duyen', displayName: 'Thiên Duyên', heroId: 'cleo', powerRating: 3420, highestChapterCleared: 3, worldBossBestDamage: 58200, bestTowerFloor: 15, personality: 'tactical', duelRating: 1245, weeklyPracticeBest: 10860, weeklyPracticeClearTimeMs: 61400, guildRole: 'Thành Viên', guildContribution: 2510, guildBossDamage: 43200, titleBadge: 'Thiên Duyên Hỏa Vũ', frameId: 'default_gold' },
  { id: 'ai_minh_triet', displayName: 'Minh Triết', heroId: 'atreus', powerRating: 3290, highestChapterCleared: 2, worldBossBestDamage: 52400, bestTowerFloor: 13, personality: 'tactical', duelRating: 1215, weeklyPracticeBest: 10450, weeklyPracticeClearTimeMs: null, guildRole: 'Thành Viên', guildContribution: 2180, guildBossDamage: 38900, titleBadge: 'Tân Tinh Hoàng Đạo', frameId: 'default_gold' },
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
  const validHeroes: HeroId[] = ['artemis', 'alex', 'thor', 'wukong', 'cleo', 'rolla', 'atreus', 'dracoola'];
  const heroId: HeroId = validHeroes.includes(raw.heroId as HeroId) ? (raw.heroId as HeroId) : seed.heroId;
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
    buildSnapshot: raw.buildSnapshot ?? buildDefaultAiBuildSnapshot(seed),
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
      if (parsed && parsed.version === 1 && Array.isArray(parsed.players) && parsed.players.length >= 8) {
        const normalizedPlayers = parsed.players.map((p, idx) =>
          normalizeAiPlayerProfile(p, idx, nowMs)
        );
        const seededChat = createInitialChatHistory(nowMs);
        const chatHistory = {
          lobby:
            Array.isArray(parsed.chatHistory?.lobby) && parsed.chatHistory.lobby.length > 0
              ? parsed.chatHistory.lobby.slice(-MAX_CHAT_PER_CHANNEL)
              : seededChat.lobby,
          guild:
            Array.isArray(parsed.chatHistory?.guild) && parsed.chatHistory.guild.length > 0
              ? parsed.chatHistory.guild.slice(-MAX_CHAT_PER_CHANNEL)
              : seededChat.guild,
        };
        return {
          version: 1,
          players: normalizedPlayers,
          activities: Array.isArray(parsed.activities) ? parsed.activities.slice(0, MAX_ACTIVITY_HISTORY) : [],
          processedDuelIds:
            parsed.processedDuelIds && typeof parsed.processedDuelIds === 'object'
              ? parsed.processedDuelIds
              : {},
          chatHistory,
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
      event = this.pushActivity({
        id: `evt_guild_${nowMs}_${crypto.randomBytes(3).toString('hex')}`,
        timestamp: nowMs,
        kind: 'guild',
        actorName: `${player.displayName} ${player.tag}`,
        summary: `gây ${player.guildBossDamage.toLocaleString('vi-VN')} ST lên Boss Bang (+${contribGain} Cống Hiến).`,
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

    if (this.tickCounter % 4 === 0) {
      this.persistStore();
    }

    return { updatedPlayer: player, event };
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

import { HERO_MAP } from './heroesData';
import type { HonorBoardTab } from './wave7Data';
import type { WeeklyBossLeaderboardEntry } from './weeklyBossData';
import type {
  AiLiveAuctionBidEvent,
  AiLivePlayerProfile,
  ArenaOpponent,
  AuctionHouseState,
  AvatarFrameId,
  HeroId,
  SaveData,
} from '../types/game';

export type LeaderboardFilterMode = 'all' | 'real';

export interface CloudPlayerSummaryRow {
  uid: string;
  displayName: string;
  heroId: HeroId;
  heroName: string;
  highestChapterCleared: number;
  title: string;
  equippedAvatarFrameId: AvatarFrameId;
  powerRating: number;
  worldBossBestDamage: number;
  arenaRating: number;
  bestTowerFloor: number;
}

export interface MergedHonorRow {
  id: string;
  rank: number;
  name: string;
  heroId: HeroId;
  heroName: string;
  server: string;
  badgeTitle: string;
  frameId: AvatarFrameId;
  score: number;
  isPlayer: boolean;
  isRealPlayer: boolean;
  isAiLive: boolean;
  aiPlayerId?: string;
  statusDetail?: string;
}

export function buildMergedHonorLeaderboard(params: {
  tab: HonorBoardTab;
  filter: LeaderboardFilterMode;
  cloudPlayers: CloudPlayerSummaryRow[];
  aiPlayers: AiLivePlayerProfile[];
  save: SaveData;
  powerRating: number;
  playerDisplayName: string;
  currentUid?: string | null;
}): MergedHonorRow[] {
  const { tab, filter, cloudPlayers, aiPlayers, save, powerRating, playerDisplayName, currentUid } = params;
  const activeHero = HERO_MAP[save.selectedHeroId] ?? HERO_MAP.artemis;

  const cloudScore = (r: CloudPlayerSummaryRow) => {
    if (tab === 'power') return r.powerRating;
    if (tab === 'world_boss') return r.worldBossBestDamage;
    if (tab === 'arena') return r.arenaRating;
    return r.bestTowerFloor;
  };

  const realRows: MergedHonorRow[] = cloudPlayers.map((r) => ({
    id: `cloud_${r.uid}`,
    rank: 0,
    name: r.displayName,
    heroId: r.heroId,
    heroName: r.heroName,
    server: `Chương ${r.highestChapterCleared}`,
    badgeTitle: r.title,
    frameId: r.equippedAvatarFrameId,
    score: cloudScore(r),
    isPlayer: Boolean(currentUid && r.uid === currentUid),
    isRealPlayer: true,
    isAiLive: false,
  }));

  // Ensure the local player is always visible even before cloud sync finishes or in guest mode
  const hasLocalPlayerInCloud = realRows.some((r) => r.isPlayer);
  if (!hasLocalPlayerInCloud) {
    const localScore =
      tab === 'power'
        ? powerRating
        : tab === 'world_boss'
        ? save.worldBoss?.bestSingleDamage ?? 0
        : tab === 'arena'
        ? save.arena?.rating ?? 1000
        : save.bestTowerFloor ?? 0;

    realRows.push({
      id: 'local_player',
      rank: 0,
      name: playerDisplayName || activeHero.name,
      heroId: activeHero.id,
      heroName: activeHero.name,
      server: `Chương ${save.highestChapterCleared}`,
      badgeTitle: save.equippedTitle ?? 'Chiến Binh Tinh Giới',
      frameId: save.equippedAvatarFrameId ?? 'default_gold',
      score: localScore,
      isPlayer: true,
      isRealPlayer: true,
      isAiLive: false,
    });
  }

  const aiRows: MergedHonorRow[] =
    filter === 'all'
      ? aiPlayers.map((ai) => {
          const hero = HERO_MAP[ai.heroId] ?? HERO_MAP.artemis;
          const score =
            tab === 'power'
              ? ai.powerRating
              : tab === 'world_boss'
              ? ai.worldBossBestDamage
              : tab === 'arena'
              ? ai.duelRating
              : ai.bestTowerFloor;
          return {
            id: `ai_${ai.id}`,
            rank: 0,
            name: ai.displayName,
            heroId: hero.id,
            heroName: hero.name,
            server: ai.statusDetail,
            badgeTitle: ai.titleBadge || hero.title,
            frameId: ai.frameId ?? 'astral_crescent',
            score,
            isPlayer: false,
            isRealPlayer: false,
            isAiLive: true,
            aiPlayerId: ai.id,
            statusDetail: ai.statusDetail,
          };
        })
      : [];

  return [...realRows, ...aiRows]
    .sort((a, b) => b.score - a.score)
    .map((entry, idx) => ({ ...entry, rank: idx + 1 }));
}

export interface MergedWeeklyBossRow {
  id: string;
  displayRank: number;
  /** Official verified human rank (1-based) used for rewards; null for [AI Live] benchmark rows */
  humanRank: number | null;
  displayName: string;
  bestScore: number;
  bestDamage: number;
  bestClearTimeMs: number | null;
  attemptsUsed: number;
  isMe: boolean;
  isAiLive: boolean;
  aiPlayerId?: string;
}

export function buildMergedWeeklyBossLeaderboard(params: {
  verifiedEntries: WeeklyBossLeaderboardEntry[];
  aiPlayers: AiLivePlayerProfile[];
  filter: LeaderboardFilterMode;
  currentUid?: string;
}): MergedWeeklyBossRow[] {
  const { verifiedEntries, aiPlayers, filter, currentUid } = params;

  const sortedHumans = [...verifiedEntries].sort((a, b) => {
    if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
    const at = a.bestClearTimeMs ?? Number.MAX_SAFE_INTEGER;
    const bt = b.bestClearTimeMs ?? Number.MAX_SAFE_INTEGER;
    return at - bt;
  });

  const humanRows: MergedWeeklyBossRow[] = sortedHumans.map((entry, idx) => ({
    id: `human_${entry.uid}`,
    displayRank: idx + 1,
    humanRank: idx + 1,
    displayName: entry.displayName,
    bestScore: entry.bestScore,
    bestDamage: entry.bestDamage,
    bestClearTimeMs: entry.bestClearTimeMs,
    attemptsUsed: entry.attemptsUsed,
    isMe: Boolean(currentUid && entry.uid === currentUid),
    isAiLive: false,
  }));

  if (filter === 'real') {
    return humanRows;
  }

  const aiRows: MergedWeeklyBossRow[] = aiPlayers.map((ai) => ({
    id: `ai_wb_${ai.id}`,
    displayRank: 0,
    humanRank: null,
    displayName: ai.displayName,
    bestScore: ai.weeklyPracticeBest,
    bestDamage: Math.min(18_500, Math.round(ai.weeklyPracticeBest * 1.18)),
    bestClearTimeMs: ai.weeklyPracticeClearTimeMs ?? null,
    attemptsUsed: 3,
    isMe: false,
    isAiLive: true,
    aiPlayerId: ai.id,
  }));

  return [...humanRows, ...aiRows]
    .sort((a, b) => {
      if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
      const at = a.bestClearTimeMs ?? Number.MAX_SAFE_INTEGER;
      const bt = b.bestClearTimeMs ?? Number.MAX_SAFE_INTEGER;
      return at - bt;
    })
    .map((row, idx) => ({ ...row, displayRank: idx + 1 }));
}

export interface MergedWeeklySeasonRow {
  id: string;
  displayRank: number;
  humanRank: number | null;
  displayName: string;
  seasonPoints: number;
  weeksParticipated: number;
  bestWeeklyScore: number;
  isMe: boolean;
  isAiLive: boolean;
  aiPlayerId?: string;
}

export function buildMergedWeeklySeasonLeaderboard(params: {
  verifiedStandings: Array<{
    uid: string;
    displayName: string;
    seasonPoints: number;
    weeksParticipated: number;
    bestWeeklyScore: number;
  }>;
  aiPlayers: AiLivePlayerProfile[];
  filter: LeaderboardFilterMode;
  currentWeekNumberInSeason: number;
  currentUid?: string;
}): MergedWeeklySeasonRow[] {
  const { verifiedStandings, aiPlayers, filter, currentWeekNumberInSeason, currentUid } = params;

  const sortedHumans = [...verifiedStandings].sort((a, b) => {
    if (b.seasonPoints !== a.seasonPoints) return b.seasonPoints - a.seasonPoints;
    return b.bestWeeklyScore - a.bestWeeklyScore;
  });

  const humanRows: MergedWeeklySeasonRow[] = sortedHumans.map((entry, idx) => ({
    id: `season_human_${entry.uid}`,
    displayRank: idx + 1,
    humanRank: idx + 1,
    displayName: entry.displayName,
    seasonPoints: entry.seasonPoints,
    weeksParticipated: entry.weeksParticipated,
    bestWeeklyScore: entry.bestWeeklyScore,
    isMe: Boolean(currentUid && entry.uid === currentUid),
    isAiLive: false,
  }));

  if (filter === 'real') {
    return humanRows;
  }

  const weeksFactor = Math.max(1, Math.min(4, currentWeekNumberInSeason));
  const sortedAi = [...aiPlayers].sort((a, b) => b.weeklyPracticeBest - a.weeklyPracticeBest);
  const aiRows: MergedWeeklySeasonRow[] = sortedAi.map((ai, idx) => {
    const perWeekCp = idx === 0 ? 115 : idx <= 2 ? 90 : idx <= 7 ? 65 : 42;
    return {
      id: `season_ai_${ai.id}`,
      displayRank: 0,
      humanRank: null,
      displayName: ai.displayName,
      seasonPoints: perWeekCp * weeksFactor,
      weeksParticipated: weeksFactor,
      bestWeeklyScore: ai.weeklyPracticeBest,
      isMe: false,
      isAiLive: true,
      aiPlayerId: ai.id,
    };
  });

  return [...humanRows, ...aiRows]
    .sort((a, b) => {
      if (b.seasonPoints !== a.seasonPoints) return b.seasonPoints - a.seasonPoints;
      return b.bestWeeklyScore - a.bestWeeklyScore;
    })
    .map((row, idx) => ({ ...row, displayRank: idx + 1 }));
}

export interface MergedArenaLadderRow {
  id: string;
  rank: number;
  name: string;
  title: string;
  heroId: HeroId;
  rating: number;
  powerRating: number;
  isPlayer: boolean;
  isAiLive: boolean;
  aiPlayer?: AiLivePlayerProfile;
}

export function buildMergedArenaLeaderboard(params: {
  filter: LeaderboardFilterMode;
  aiPlayers: AiLivePlayerProfile[];
  cloudPlayers?: CloudPlayerSummaryRow[];
  playerName: string;
  playerTitle: string;
  playerHeroId: HeroId;
  playerRating: number;
  playerPower: number;
  currentUid?: string | null;
}): MergedArenaLadderRow[] {
  const {
    filter,
    aiPlayers,
    cloudPlayers = [],
    playerName,
    playerTitle,
    playerHeroId,
    playerRating,
    playerPower,
    currentUid,
  } = params;

  const humanRows: MergedArenaLadderRow[] = cloudPlayers.map((cp) => ({
    id: `cloud_ar_${cp.uid}`,
    rank: 0,
    name: cp.displayName,
    title: cp.title,
    heroId: cp.heroId,
    rating: cp.arenaRating,
    powerRating: cp.powerRating,
    isPlayer: Boolean(currentUid && cp.uid === currentUid),
    isAiLive: false,
  }));

  if (!humanRows.some((r) => r.isPlayer)) {
    humanRows.push({
      id: 'local_arena_player',
      rank: 0,
      name: playerName,
      title: playerTitle,
      heroId: playerHeroId,
      rating: playerRating,
      powerRating: playerPower,
      isPlayer: true,
      isAiLive: false,
    });
  }

  const aiRows: MergedArenaLadderRow[] =
    filter === 'all'
      ? aiPlayers.map((ai) => ({
          id: `ai_ar_${ai.id}`,
          rank: 0,
          name: ai.displayName,
          title:
            ai.personality === 'assassin'
              ? 'Sát Thủ Real-Time'
              : ai.personality === 'aggressive'
              ? 'Chiến Binh Real-Time'
              : 'Chiến Thuật Real-Time',
          heroId: ai.heroId,
          rating: ai.duelRating,
          powerRating: ai.powerRating,
          isPlayer: false,
          isAiLive: true,
          aiPlayer: ai,
        }))
      : [];

  return [...humanRows, ...aiRows]
    .sort((a, b) => b.rating - a.rating)
    .map((r, idx) => ({ ...r, rank: idx + 1 }));
}

export function buildLiveArenaOpponents(
  aiPlayers: AiLivePlayerProfile[],
  playerRating: number,
  playerPower: number
): Array<{ opponent: ArenaOpponent; aiProfile: AiLivePlayerProfile }> {
  if (aiPlayers.length === 0) return [];
  const sortedByProximity = [...aiPlayers].sort((a, b) => {
    const aReady = a.status === 'ready_duel' ? 0 : 1;
    const bReady = b.status === 'ready_duel' ? 0 : 1;
    if (aReady !== bReady) return aReady - bReady;
    return Math.abs(a.duelRating - playerRating) - Math.abs(b.duelRating - playerRating);
  });

  // Pick 3 varied opponents (balanced, challenging, and high-tier rival)
  const picks: AiLivePlayerProfile[] = [];
  for (const candidate of sortedByProximity) {
    if (picks.length >= 3) break;
    picks.push(candidate);
  }

  return picks.map((ai, idx) => {
    const hero = HERO_MAP[ai.heroId] ?? HERO_MAP.artemis;
    const scale = 0.92 + idx * 0.14;
    const effectivePower = Math.max(400, ai.powerRating);
    const ratio = Math.max(0.75, Math.min(1.45, effectivePower / Math.max(800, playerPower)));
    const weaponArchetype = 'bow' as const;
    return {
      aiProfile: ai,
      opponent: {
        id: ai.id,
        name: `${ai.displayName} ${ai.tag}`,
        title:
          ai.personality === 'assassin'
            ? 'Sát Thủ Real-Time'
            : ai.personality === 'aggressive'
            ? 'Chiến Binh Real-Time'
            : 'Chiến Thuật Real-Time',
        heroId: ai.heroId,
        rating: ai.duelRating,
        powerRating: ai.powerRating,
        maxHp: Math.round((1800 + playerPower * 1.1) * ratio * scale),
        attack: Math.round((95 + playerPower * 0.055) * ratio * scale),
        speedMult: ai.personality === 'assassin' ? 1.15 : ai.personality === 'aggressive' ? 1.05 : 1.0,
        weaponArchetype,
        accentHex: hero.accentHex,
        cloakHex: hero.cloakHex,
        hairHex: hero.hairHex,
        rewardPoints: 24 + idx * 8,
        rewardArenaCoins: 80 + idx * 25,
      },
    };
  });
}

export interface MergedGuildMemberRow {
  id: string;
  rank: number;
  name: string;
  heroId: HeroId;
  role: string;
  contribution: number;
  bossDmg: number;
  isPlayer: boolean;
  isAiLive: boolean;
  aiPlayerId?: string;
  statusDetail?: string;
}

export function buildMergedGuildMemberBoard(params: {
  filter: LeaderboardFilterMode;
  aiPlayers: AiLivePlayerProfile[];
  playerName: string;
  playerHeroId: HeroId;
  playerContribution: number;
  playerBossDmg: number;
}): MergedGuildMemberRow[] {
  const { filter, aiPlayers, playerName, playerHeroId, playerContribution, playerBossDmg } = params;

  const rows: MergedGuildMemberRow[] = [
    {
      id: 'guild_player',
      rank: 0,
      name: playerName,
      heroId: playerHeroId,
      role: 'Tinh Vệ (Bạn)',
      contribution: playerContribution,
      bossDmg: playerBossDmg,
      isPlayer: true,
      isAiLive: false,
    },
  ];

  if (filter === 'all') {
    for (const ai of aiPlayers.slice(0, 12)) {
      rows.push({
        id: `guild_ai_${ai.id}`,
        rank: 0,
        name: ai.displayName,
        heroId: ai.heroId,
        role: ai.guildRole || 'Tinh Vệ',
        contribution: ai.guildContribution,
        bossDmg: ai.guildBossDamage,
        isPlayer: false,
        isAiLive: true,
        aiPlayerId: ai.id,
        statusDetail: ai.statusDetail,
      });
    }
  }

  return rows
    .sort((a, b) => b.bossDmg - a.bossDmg)
    .map((r, idx) => ({ ...r, rank: idx + 1 }));
}

/**
 * Pure, idempotent reducer applying a real-time WebSocket [AI Live] bid or buyout event
 * to the player's AuctionHouseState. Guarantees 100% gem refund when outbid!
 */
export function applyLiveAiAuctionBidEvent(params: {
  auctionHouse: AuctionHouseState;
  currentGems: number;
  event: AiLiveAuctionBidEvent;
  processedEventIds: Set<string>;
}): {
  changed: boolean;
  nextAuctionHouse: AuctionHouseState;
  nextGems: number;
  refundedGems: number;
  toastMessage: string | null;
} {
  const { auctionHouse, currentGems, event, processedEventIds } = params;
  if (processedEventIds.has(event.eventId)) {
    return {
      changed: false,
      nextAuctionHouse: auctionHouse,
      nextGems: currentGems,
      refundedGems: 0,
      toastMessage: null,
    };
  }

  const lotIndex = auctionHouse.lots.findIndex((l) => l.id === event.lotId && l.status === 'active');
  if (lotIndex === -1) {
    return {
      changed: false,
      nextAuctionHouse: auctionHouse,
      nextGems: currentGems,
      refundedGems: 0,
      toastMessage: null,
    };
  }

  processedEventIds.add(event.eventId);
  const lot = auctionHouse.lots[lotIndex];
  const bidderLabel = `${event.bidderName} ${event.bidderTag}`;
  const nextLots = [...auctionHouse.lots];
  const nextClaimBox = [...auctionHouse.claimBox];
  let nextGems = currentGems;
  let refundedGems = 0;
  let totalTrades = auctionHouse.totalTrades;
  let toastMessage: string | null = null;

  if (lot.isPlayerListing) {
    if (event.action === 'buyout' || event.amount >= lot.buyoutPrice) {
      const paid = Math.max(lot.startingBid, event.amount);
      nextLots[lotIndex] = {
        ...lot,
        currentBid: paid,
        highestBidderIsPlayer: false,
        highestBidderName: bidderLabel,
        highestBidderIsAiLive: true,
        status: 'sold',
      };
      nextClaimBox.unshift({
        id: `claim_${event.eventId}`,
        title: `Bán Thành Công: ${lot.label}`,
        gems: paid,
        reason: `${bidderLabel} đã mua đứt vật phẩm ký gửi của bạn với giá ${paid} Ngọc Hồn!`,
      });
      totalTrades += 1;
      toastMessage = `${bidderLabel} vừa mua đứt "${lot.label}" (+${paid} Ngọc trong Hòm Nhận Đồ)!`;
    } else if (event.amount > lot.currentBid) {
      nextLots[lotIndex] = {
        ...lot,
        currentBid: event.amount,
        highestBidderIsPlayer: false,
        highestBidderName: bidderLabel,
        highestBidderIsAiLive: true,
      };
      toastMessage = `${bidderLabel} vừa trả giá ${event.amount} Ngọc cho vật phẩm ký gửi "${lot.label}"!`;
    }
  } else {
    // Market lot: if player was leading, immediately refund their escrowed gems!
    if (lot.highestBidderIsPlayer && lot.playerBidAmount > 0) {
      refundedGems = lot.playerBidAmount;
      nextGems += refundedGems;
    }

    if (event.action === 'buyout' || event.amount >= lot.buyoutPrice) {
      nextLots[lotIndex] = {
        ...lot,
        currentBid: lot.buyoutPrice,
        highestBidderIsPlayer: false,
        highestBidderName: bidderLabel,
        highestBidderIsAiLive: true,
        playerBidAmount: 0,
        status: 'sold',
      };
      toastMessage =
        refundedGems > 0
          ? `${bidderLabel} đã mua đứt "${lot.label}"! Hoàn trả +${refundedGems} Ngọc đặt cọc.`
          : `${bidderLabel} vừa mua đứt "${lot.label}" trên Sàn Đấu Giá!`;
    } else if (event.amount > lot.currentBid) {
      nextLots[lotIndex] = {
        ...lot,
        currentBid: event.amount,
        highestBidderIsPlayer: false,
        highestBidderName: bidderLabel,
        highestBidderIsAiLive: true,
        playerBidAmount: 0,
      };
      toastMessage =
        refundedGems > 0
          ? `${bidderLabel} vượt giá "${lot.label}" (${event.amount} Ngọc)! Hoàn trả +${refundedGems} Ngọc cọc.`
          : null;
    }
  }

  return {
    changed: true,
    nextAuctionHouse: {
      ...auctionHouse,
      lots: nextLots,
      claimBox: nextClaimBox,
      totalTrades,
    },
    nextGems,
    refundedGems,
    toastMessage,
  };
}

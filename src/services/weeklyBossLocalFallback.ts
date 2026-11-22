import type { CombatStyleGrade } from '../types/game';
import {
  computeWeekendBlitzScore,
  computeWeeklyBossScore,
  computeWeeklySeasonPointsForRank,
  getCurrentWeekendBlitzSchedule,
  getCurrentWeeklyBossSchedule,
  getWeeklyBossSeasonInfo,
  type WeeklyBossClaimReceipt,
  type WeeklyBossLeaderboardEntry,
  type WeeklyBossRunHistoryEntry,
  type WeeklyBossSchedule,
  type WeeklyBossSeasonClaimReceipt,
  type WeeklyBossSeasonEntry,
  type WeeklyBossSeasonStateResponse,
  type WeeklyBossStateResponse,
  type WeekendBlitzClaimReceipt,
  type WeekendBlitzSchedule,
  type WeekendBlitzStateResponse,
} from '../data/weeklyBossData';

const STORAGE_KEY = 'artemis_weekly_boss_standalone_v1';

export interface WeeklyBossFallbackIdentity {
  uid: string;
  displayName: string;
  authenticated: boolean;
}

interface StoredAttempt {
  attemptId: string;
  seed: string;
  startedAt: number;
  displayName: string;
  submitted: boolean;
}

interface StoredWeeklyBucket {
  weekId: string;
  attemptsUsed: number;
  activeAttemptId: string | null;
  attempts: Record<string, StoredAttempt>;
  bestScore: number;
  bestClearTimeMs: number | null;
  bestDamage: number;
  cleared: boolean;
  bestSplitsMs: number[] | null;
  counterHitsLanded: number;
  guardBreaksLanded: number;
  peakStyleGrade?: CombatStyleGrade;
  lastVerifiedAttemptId: string | null;
  displayName: string;
  updatedAt: number;
  claimedTierIds: string[];
  receipts: WeeklyBossClaimReceipt[];
  idempotencyMap: Record<string, WeeklyBossClaimReceipt>;
}

interface StoredSeasonBucket {
  seasonId: string;
  seasonPoints: number;
  weekPointsByWeek: Record<string, number>;
  weekendBonusByEvent: Record<string, number>;
  bestWeeklyScore: number;
  highestRank: number;
  totalClears: number;
  displayName: string;
  updatedAt: number;
  claimedSeasonTierIds: string[];
  receipts: WeeklyBossSeasonClaimReceipt[];
  idempotencyMap: Record<string, WeeklyBossSeasonClaimReceipt>;
  history: WeeklyBossRunHistoryEntry[];
}

interface StoredWeekendBucket {
  eventId: string;
  attemptsUsed: number;
  activeAttemptId: string | null;
  attempts: Record<string, StoredAttempt>;
  bestScore: number;
  bestClearTimeMs: number | null;
  bestDamage: number;
  cleared: boolean;
  bestSplitsMs: number[] | null;
  counterHitsLanded: number;
  guardBreaksLanded: number;
  peakStyleGrade?: CombatStyleGrade;
  lastVerifiedAttemptId: string | null;
  displayName: string;
  updatedAt: number;
  claimedTierIds: string[];
  receipts: WeekendBlitzClaimReceipt[];
  idempotencyMap: Record<string, WeekendBlitzClaimReceipt>;
}

interface StandaloneStore {
  byUid: Record<
    string,
    {
      weekly: Record<string, StoredWeeklyBucket>;
      seasons: Record<string, StoredSeasonBucket>;
      weekend: Record<string, StoredWeekendBucket>;
    }
  >;
}

let memoryStore: StandaloneStore = { byUid: {} };

function readStore(): StandaloneStore {
  if (typeof localStorage === 'undefined') {
    return memoryStore;
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { byUid: {} };
    const parsed = JSON.parse(raw) as StandaloneStore;
    if (!parsed || typeof parsed !== 'object' || !parsed.byUid) {
      return { byUid: {} };
    }
    return parsed;
  } catch {
    return { byUid: {} };
  }
}

function writeStore(store: StandaloneStore): void {
  memoryStore = store;
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage quota errors in restricted browsers
  }
}

export function resetWeeklyBossStandaloneStoreForTests(): void {
  memoryStore = { byUid: {} };
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}

function ensureUserRoot(store: StandaloneStore, uid: string) {
  if (!store.byUid[uid]) {
    store.byUid[uid] = { weekly: {}, seasons: {}, weekend: {} };
  }
  return store.byUid[uid];
}

function ensureWeeklyBucket(
  store: StandaloneStore,
  identity: WeeklyBossFallbackIdentity,
  weekId: string
): StoredWeeklyBucket {
  const root = ensureUserRoot(store, identity.uid);
  if (!root.weekly[weekId]) {
    root.weekly[weekId] = {
      weekId,
      attemptsUsed: 0,
      activeAttemptId: null,
      attempts: {},
      bestScore: 0,
      bestClearTimeMs: null,
      bestDamage: 0,
      cleared: false,
      bestSplitsMs: null,
      counterHitsLanded: 0,
      guardBreaksLanded: 0,
      lastVerifiedAttemptId: null,
      displayName: identity.displayName,
      updatedAt: Date.now(),
      claimedTierIds: [],
      receipts: [],
      idempotencyMap: {},
    };
  }
  return root.weekly[weekId];
}

function ensureSeasonBucket(
  store: StandaloneStore,
  identity: WeeklyBossFallbackIdentity,
  seasonId: string
): StoredSeasonBucket {
  const root = ensureUserRoot(store, identity.uid);
  if (!root.seasons[seasonId]) {
    root.seasons[seasonId] = {
      seasonId,
      seasonPoints: 0,
      weekPointsByWeek: {},
      weekendBonusByEvent: {},
      bestWeeklyScore: 0,
      highestRank: 0,
      totalClears: 0,
      displayName: identity.displayName,
      updatedAt: Date.now(),
      claimedSeasonTierIds: [],
      receipts: [],
      idempotencyMap: {},
      history: [],
    };
  }
  return root.seasons[seasonId];
}

function ensureWeekendBucket(
  store: StandaloneStore,
  identity: WeeklyBossFallbackIdentity,
  eventId: string
): StoredWeekendBucket {
  const root = ensureUserRoot(store, identity.uid);
  if (!root.weekend[eventId]) {
    root.weekend[eventId] = {
      eventId,
      attemptsUsed: 0,
      activeAttemptId: null,
      attempts: {},
      bestScore: 0,
      bestClearTimeMs: null,
      bestDamage: 0,
      cleared: false,
      bestSplitsMs: null,
      counterHitsLanded: 0,
      guardBreaksLanded: 0,
      lastVerifiedAttemptId: null,
      displayName: identity.displayName,
      updatedAt: Date.now(),
      claimedTierIds: [],
      receipts: [],
      idempotencyMap: {},
    };
  }
  return root.weekend[eventId];
}

function normalizeSplits(splitsMs?: Array<number | null>): number[] | null {
  if (!Array.isArray(splitsMs) || splitsMs.length !== 4) return null;
  const parsed = splitsMs.map((v) =>
    typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v) : 0
  );
  return parsed.every((v) => v > 0) ? parsed : null;
}

function buildWeeklyLeaderboard(
  store: StandaloneStore,
  weekId: string
): WeeklyBossLeaderboardEntry[] {
  const entries: WeeklyBossLeaderboardEntry[] = [];
  for (const [uid, root] of Object.entries(store.byUid)) {
    const bucket = root.weekly[weekId];
    if (!bucket || bucket.bestScore <= 0) continue;
    entries.push({
      uid,
      displayName: bucket.displayName,
      bestScore: bucket.bestScore,
      bestClearTimeMs: bucket.bestClearTimeMs,
      bestDamage: bucket.bestDamage,
      cleared: bucket.cleared,
      attemptsUsed: bucket.attemptsUsed,
      updatedAt: bucket.updatedAt,
      bestSplitsMs: bucket.bestSplitsMs,
      counterHitsLanded: bucket.counterHitsLanded,
      guardBreaksLanded: bucket.guardBreaksLanded,
      peakStyleGrade: bucket.peakStyleGrade,
      lastVerifiedAttemptId: bucket.lastVerifiedAttemptId ?? undefined,
    });
  }
  entries.sort((a, b) => {
    if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
    const tA = a.bestClearTimeMs ?? Number.MAX_SAFE_INTEGER;
    const tB = b.bestClearTimeMs ?? Number.MAX_SAFE_INTEGER;
    return tA - tB;
  });
  return entries.slice(0, 50);
}

function buildWeekendLeaderboard(
  store: StandaloneStore,
  eventId: string
): WeeklyBossLeaderboardEntry[] {
  const entries: WeeklyBossLeaderboardEntry[] = [];
  for (const [uid, root] of Object.entries(store.byUid)) {
    const bucket = root.weekend[eventId];
    if (!bucket || bucket.bestScore <= 0) continue;
    entries.push({
      uid,
      displayName: bucket.displayName,
      bestScore: bucket.bestScore,
      bestClearTimeMs: bucket.bestClearTimeMs,
      bestDamage: bucket.bestDamage,
      cleared: bucket.cleared,
      attemptsUsed: bucket.attemptsUsed,
      updatedAt: bucket.updatedAt,
      bestSplitsMs: bucket.bestSplitsMs,
      counterHitsLanded: bucket.counterHitsLanded,
      guardBreaksLanded: bucket.guardBreaksLanded,
      peakStyleGrade: bucket.peakStyleGrade,
      lastVerifiedAttemptId: bucket.lastVerifiedAttemptId ?? undefined,
    });
  }
  entries.sort((a, b) => {
    if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
    const tA = a.bestClearTimeMs ?? Number.MAX_SAFE_INTEGER;
    const tB = b.bestClearTimeMs ?? Number.MAX_SAFE_INTEGER;
    return tA - tB;
  });
  return entries.slice(0, 50);
}

function recalcSeasonPoints(season: StoredSeasonBucket): void {
  const weeklyPts = Object.values(season.weekPointsByWeek).reduce((acc, v) => acc + v, 0);
  const weekendPts = Object.values(season.weekendBonusByEvent).reduce((acc, v) => acc + v, 0);
  season.seasonPoints = weeklyPts + weekendPts;
}

function buildSeasonStandings(
  store: StandaloneStore,
  seasonId: string
): WeeklyBossSeasonEntry[] {
  const list: WeeklyBossSeasonEntry[] = [];
  for (const [uid, root] of Object.entries(store.byUid)) {
    const bucket = root.seasons[seasonId];
    if (!bucket || bucket.seasonPoints <= 0) continue;
    list.push({
      uid,
      displayName: bucket.displayName,
      seasonPoints: bucket.seasonPoints,
      weeksParticipated: Object.keys(bucket.weekPointsByWeek).length,
      bestWeeklyScore: bucket.bestWeeklyScore,
      highestRank: bucket.highestRank || 1,
      totalClears: bucket.totalClears,
      updatedAt: bucket.updatedAt,
    });
  }
  list.sort((a, b) => {
    if (b.seasonPoints !== a.seasonPoints) return b.seasonPoints - a.seasonPoints;
    return b.bestWeeklyScore - a.bestWeeklyScore;
  });
  return list.slice(0, 50);
}

export function fallbackFetchWeeklyBossState(
  identity: WeeklyBossFallbackIdentity,
  nowMs = Date.now()
): WeeklyBossStateResponse {
  const schedule = getCurrentWeeklyBossSchedule(nowMs);
  const store = readStore();
  const bucket = ensureWeeklyBucket(store, identity, schedule.weekId);
  const leaderboard = buildWeeklyLeaderboard(store, schedule.weekId);
  const top1SplitsMs = leaderboard[0]?.bestSplitsMs ?? null;

  return {
    schedule,
    serverNow: nowMs,
    authenticated: identity.authenticated,
    player: {
      uid: identity.uid,
      displayName: bucket.displayName || identity.displayName,
      attemptsUsed: bucket.attemptsUsed,
      attemptsRemaining: Math.max(0, schedule.maxFreeAttempts - bucket.attemptsUsed),
      activeAttemptId: bucket.activeAttemptId,
      bestScore: bucket.bestScore,
      bestClearTimeMs: bucket.bestClearTimeMs,
      bestDamage: bucket.bestDamage,
      claimedTierIds: [...bucket.claimedTierIds],
      receipts: [...bucket.receipts],
      bestSplitsMs: bucket.bestSplitsMs,
      lastVerifiedAttemptId: bucket.lastVerifiedAttemptId,
    },
    leaderboard,
    top1SplitsMs,
  };
}

export function fallbackStartWeeklyBossAttempt(
  identity: WeeklyBossFallbackIdentity,
  displayName: string,
  nowMs = Date.now()
): {
  schedule: WeeklyBossSchedule;
  attempt: { attemptId: string; seed: string; startedAt: number };
  attemptsUsed: number;
  attemptsRemaining: number;
} {
  const schedule = getCurrentWeeklyBossSchedule(nowMs);
  const store = readStore();
  const bucket = ensureWeeklyBucket(store, identity, schedule.weekId);
  const cleanName = (displayName || identity.displayName).trim().slice(0, 24) || 'Chiến Binh Tinh Giới';
  bucket.displayName = cleanName;

  if (bucket.attemptsUsed >= schedule.maxFreeAttempts) {
    throw new Error('Bạn đã dùng hết 3 lượt tính hạng miễn phí trong tuần này.');
  }

  const attemptId = `wb_local_${schedule.weekId}_${nowMs}_${Math.random().toString(36).slice(2, 7)}`;
  bucket.attemptsUsed += 1;
  bucket.activeAttemptId = attemptId;
  bucket.attempts[attemptId] = {
    attemptId,
    seed: schedule.seed,
    startedAt: nowMs,
    displayName: cleanName,
    submitted: false,
  };
  bucket.updatedAt = nowMs;
  writeStore(store);

  return {
    schedule,
    attempt: { attemptId, seed: schedule.seed, startedAt: nowMs },
    attemptsUsed: bucket.attemptsUsed,
    attemptsRemaining: Math.max(0, schedule.maxFreeAttempts - bucket.attemptsUsed),
  };
}

export function fallbackSubmitWeeklyBossAttempt(
  identity: WeeklyBossFallbackIdentity,
  payload: {
    attemptId: string;
    seed: string;
    displayName: string;
    cleared: boolean;
    damageDealt: number;
    simTicks: number;
    clearTimeMs: number;
    remainingHpPct: number;
    perfectDodges: number;
    autoPilotUsed?: boolean;
    splitsMs?: Array<number | null>;
    counterHitsLanded?: number;
    guardBreaksLanded?: number;
    peakStyleGrade?: CombatStyleGrade;
  },
  nowMs = Date.now()
): {
  ok: true;
  verifiedScore: number;
  rank: number;
  attemptsRemaining: number;
  leaderboard: WeeklyBossLeaderboardEntry[];
} {
  const schedule = getCurrentWeeklyBossSchedule(nowMs);
  const seasonInfo = getWeeklyBossSeasonInfo(nowMs);
  const store = readStore();
  const bucket = ensureWeeklyBucket(store, identity, schedule.weekId);
  const season = ensureSeasonBucket(store, identity, seasonInfo.seasonId);

  const attempt = bucket.attempts[payload.attemptId];
  if (attempt && attempt.submitted) {
    const lb = buildWeeklyLeaderboard(store, schedule.weekId);
    const rankIdx = lb.findIndex((e) => e.uid === identity.uid);
    return {
      ok: true,
      verifiedScore: bucket.bestScore,
      rank: rankIdx >= 0 ? rankIdx + 1 : 1,
      attemptsRemaining: Math.max(0, schedule.maxFreeAttempts - bucket.attemptsUsed),
      leaderboard: lb,
    };
  }
  if (attempt) {
    attempt.submitted = true;
  }
  if (bucket.activeAttemptId === payload.attemptId) {
    bucket.activeAttemptId = null;
  }

  const cleanName = (payload.displayName || bucket.displayName || identity.displayName)
    .trim()
    .slice(0, 24);
  bucket.displayName = cleanName;
  season.displayName = cleanName;

  const safeDamage = Math.max(0, Math.min(schedule.bossMaxHp, Math.round(payload.damageDealt || 0)));
  const safeClearTimeMs = Math.max(
    1000,
    Math.min(schedule.timeLimitSec * 1000, Math.round(payload.clearTimeMs || schedule.timeLimitSec * 1000))
  );
  const verifiedScore = payload.autoPilotUsed
    ? 0
    : computeWeeklyBossScore({
        cleared: Boolean(payload.cleared),
        damageDealt: safeDamage,
        bossMaxHp: schedule.bossMaxHp,
        clearTimeMs: safeClearTimeMs,
        timeLimitSec: schedule.timeLimitSec,
        remainingHpPct: payload.remainingHpPct,
        perfectDodges: payload.perfectDodges,
      });

  const splits = normalizeSplits(payload.splitsMs);
  if (verifiedScore >= bucket.bestScore) {
    bucket.bestScore = verifiedScore;
    bucket.bestDamage = Math.max(bucket.bestDamage, safeDamage);
    if (payload.cleared) {
      bucket.cleared = true;
      bucket.bestClearTimeMs =
        bucket.bestClearTimeMs === null
          ? safeClearTimeMs
          : Math.min(bucket.bestClearTimeMs, safeClearTimeMs);
    }
    if (splits) bucket.bestSplitsMs = splits;
    bucket.counterHitsLanded = Math.max(bucket.counterHitsLanded, payload.counterHitsLanded ?? 0);
    bucket.guardBreaksLanded = Math.max(bucket.guardBreaksLanded, payload.guardBreaksLanded ?? 0);
    if (payload.peakStyleGrade) bucket.peakStyleGrade = payload.peakStyleGrade;
    bucket.lastVerifiedAttemptId = payload.attemptId;
  }
  bucket.updatedAt = nowMs;

  const leaderboard = buildWeeklyLeaderboard(store, schedule.weekId);
  const rankIdx = leaderboard.findIndex((e) => e.uid === identity.uid);
  const rank = rankIdx >= 0 ? rankIdx + 1 : 1;

  if (!payload.autoPilotUsed && verifiedScore > 0) {
    const awardedCp = computeWeeklySeasonPointsForRank(rank, Boolean(payload.cleared));
    const prevWeekCp = season.weekPointsByWeek[schedule.weekId] ?? 0;
    season.weekPointsByWeek[schedule.weekId] = Math.max(prevWeekCp, awardedCp);
    season.bestWeeklyScore = Math.max(season.bestWeeklyScore, verifiedScore);
    season.highestRank =
      season.highestRank === 0 ? rank : Math.min(season.highestRank, rank);
    if (payload.cleared) season.totalClears += 1;
    season.updatedAt = nowMs;
    recalcSeasonPoints(season);
    season.history.unshift({
      weekId: schedule.weekId,
      bossName: schedule.bossName,
      attemptId: payload.attemptId,
      verifiedScore,
      damageDealt: safeDamage,
      clearTimeMs: payload.cleared ? safeClearTimeMs : null,
      cleared: Boolean(payload.cleared),
      weekRank: rank,
      seasonPointsAwarded: awardedCp,
      submittedAt: nowMs,
    });
    season.history = season.history.slice(0, 20);
  }

  writeStore(store);

  return {
    ok: true,
    verifiedScore,
    rank,
    attemptsRemaining: Math.max(0, schedule.maxFreeAttempts - bucket.attemptsUsed),
    leaderboard,
  };
}

export function fallbackClaimWeeklyBossReward(
  identity: WeeklyBossFallbackIdentity,
  payload: { tierId: string; idempotencyKey: string },
  nowMs = Date.now()
): {
  ok: true;
  alreadyClaimed: boolean;
  receipt: WeeklyBossClaimReceipt;
  claimedTierIds: string[];
} {
  const schedule = getCurrentWeeklyBossSchedule(nowMs);
  const tier = schedule.rewardTiers.find((t) => t.tierId === payload.tierId);
  if (!tier) {
    throw new Error('Mốc thưởng Boss Tuần không hợp lệ.');
  }
  const store = readStore();
  const bucket = ensureWeeklyBucket(store, identity, schedule.weekId);

  if (payload.idempotencyKey && bucket.idempotencyMap[payload.idempotencyKey]) {
    return {
      ok: true,
      alreadyClaimed: true,
      receipt: bucket.idempotencyMap[payload.idempotencyKey],
      claimedTierIds: [...bucket.claimedTierIds],
    };
  }
  const existingReceipt = bucket.receipts.find((r) => r.tierId === tier.tierId);
  if (existingReceipt || bucket.claimedTierIds.includes(tier.tierId)) {
    const fallbackReceipt: WeeklyBossClaimReceipt = existingReceipt ?? {
      claimKey: `${schedule.weekId}_${identity.uid}_${tier.tierId}`,
      weekId: schedule.weekId,
      uid: identity.uid,
      tierId: tier.tierId,
      claimedAt: nowMs,
      rewardTitleLabel: tier.rewardTitleLabel,
      rewardDynamicTitleId: tier.rewardDynamicTitleId,
      rewardFrameId: tier.rewardFrameId,
      rewardFrameName: tier.rewardFrameName,
      idempotencyKey: payload.idempotencyKey,
    };
    return {
      ok: true,
      alreadyClaimed: true,
      receipt: fallbackReceipt,
      claimedTierIds: [...bucket.claimedTierIds],
    };
  }
  if (bucket.bestScore < tier.minScore) {
    throw new Error(`Cần đạt tối thiểu ${tier.minScore.toLocaleString('vi-VN')} điểm để nhận mốc này.`);
  }

  const receipt: WeeklyBossClaimReceipt = {
    claimKey: `${schedule.weekId}_${identity.uid}_${tier.tierId}`,
    weekId: schedule.weekId,
    uid: identity.uid,
    tierId: tier.tierId,
    claimedAt: nowMs,
    rewardTitleLabel: tier.rewardTitleLabel,
    rewardDynamicTitleId: tier.rewardDynamicTitleId,
    rewardFrameId: tier.rewardFrameId,
    rewardFrameName: tier.rewardFrameName,
    idempotencyKey: payload.idempotencyKey,
  };
  bucket.claimedTierIds.push(tier.tierId);
  bucket.receipts.push(receipt);
  if (payload.idempotencyKey) {
    bucket.idempotencyMap[payload.idempotencyKey] = receipt;
  }
  writeStore(store);

  return {
    ok: true,
    alreadyClaimed: false,
    receipt,
    claimedTierIds: [...bucket.claimedTierIds],
  };
}

export function fallbackFetchWeeklyBossSeasonState(
  identity: WeeklyBossFallbackIdentity,
  nowMs = Date.now()
): WeeklyBossSeasonStateResponse {
  const seasonInfo = getWeeklyBossSeasonInfo(nowMs);
  const store = readStore();
  const bucket = ensureSeasonBucket(store, identity, seasonInfo.seasonId);
  const standings = buildSeasonStandings(store, seasonInfo.seasonId);
  const rankIdx = standings.findIndex((s) => s.uid === identity.uid);

  return {
    season: seasonInfo,
    serverNow: nowMs,
    authenticated: identity.authenticated,
    player: {
      uid: identity.uid,
      displayName: bucket.displayName || identity.displayName,
      seasonPoints: bucket.seasonPoints,
      seasonRank: rankIdx >= 0 ? rankIdx + 1 : null,
      weeksParticipated: Object.keys(bucket.weekPointsByWeek).length,
      claimedSeasonTierIds: [...bucket.claimedSeasonTierIds],
      receipts: [...bucket.receipts],
      history: [...bucket.history],
    },
    standings,
  };
}

export function fallbackClaimWeeklyBossSeasonReward(
  identity: WeeklyBossFallbackIdentity,
  payload: { tierId: string; idempotencyKey: string },
  nowMs = Date.now()
): {
  ok: true;
  alreadyClaimed: boolean;
  receipt: WeeklyBossSeasonClaimReceipt;
  claimedSeasonTierIds: string[];
} {
  const seasonInfo = getWeeklyBossSeasonInfo(nowMs);
  const milestone = seasonInfo.milestones.find((m) => m.tierId === payload.tierId);
  if (!milestone) {
    throw new Error('Mốc thưởng Mùa Giải không hợp lệ.');
  }
  const store = readStore();
  const bucket = ensureSeasonBucket(store, identity, seasonInfo.seasonId);

  if (payload.idempotencyKey && bucket.idempotencyMap[payload.idempotencyKey]) {
    return {
      ok: true,
      alreadyClaimed: true,
      receipt: bucket.idempotencyMap[payload.idempotencyKey],
      claimedSeasonTierIds: [...bucket.claimedSeasonTierIds],
    };
  }
  const existing = bucket.receipts.find((r) => r.tierId === milestone.tierId);
  if (existing || bucket.claimedSeasonTierIds.includes(milestone.tierId)) {
    const fallbackReceipt: WeeklyBossSeasonClaimReceipt = existing ?? {
      claimKey: `${seasonInfo.seasonId}_${identity.uid}_${milestone.tierId}`,
      seasonId: seasonInfo.seasonId,
      uid: identity.uid,
      tierId: milestone.tierId,
      claimedAt: nowMs,
      rewardTitleLabel: milestone.rewardTitleLabel,
      rewardDynamicTitleId: milestone.rewardDynamicTitleId,
      rewardFrameId: milestone.rewardFrameId,
      rewardFrameName: milestone.rewardFrameName,
      idempotencyKey: payload.idempotencyKey,
    };
    return {
      ok: true,
      alreadyClaimed: true,
      receipt: fallbackReceipt,
      claimedSeasonTierIds: [...bucket.claimedSeasonTierIds],
    };
  }
  if (bucket.seasonPoints < milestone.minSeasonPoints) {
    throw new Error(`Cần tích lũy tối thiểu ${milestone.minSeasonPoints} CP Mùa Giải.`);
  }

  const receipt: WeeklyBossSeasonClaimReceipt = {
    claimKey: `${seasonInfo.seasonId}_${identity.uid}_${milestone.tierId}`,
    seasonId: seasonInfo.seasonId,
    uid: identity.uid,
    tierId: milestone.tierId,
    claimedAt: nowMs,
    rewardTitleLabel: milestone.rewardTitleLabel,
    rewardDynamicTitleId: milestone.rewardDynamicTitleId,
    rewardFrameId: milestone.rewardFrameId,
    rewardFrameName: milestone.rewardFrameName,
    idempotencyKey: payload.idempotencyKey,
  };
  bucket.claimedSeasonTierIds.push(milestone.tierId);
  bucket.receipts.push(receipt);
  if (payload.idempotencyKey) {
    bucket.idempotencyMap[payload.idempotencyKey] = receipt;
  }
  writeStore(store);

  return {
    ok: true,
    alreadyClaimed: false,
    receipt,
    claimedSeasonTierIds: [...bucket.claimedSeasonTierIds],
  };
}

export function fallbackFetchWeekendBlitzState(
  identity: WeeklyBossFallbackIdentity,
  nowMs = Date.now()
): WeekendBlitzStateResponse {
  const schedule = getCurrentWeekendBlitzSchedule(nowMs);
  const store = readStore();
  const bucket = ensureWeekendBucket(store, identity, schedule.eventId);
  const leaderboard = buildWeekendLeaderboard(store, schedule.eventId);

  return {
    schedule,
    serverNow: nowMs,
    authenticated: identity.authenticated,
    player: {
      uid: identity.uid,
      displayName: bucket.displayName || identity.displayName,
      attemptsUsed: bucket.attemptsUsed,
      attemptsRemaining: Math.max(0, schedule.maxFreeAttempts - bucket.attemptsUsed),
      activeAttemptId: bucket.activeAttemptId,
      bestScore: bucket.bestScore,
      bestClearTimeMs: bucket.bestClearTimeMs,
      bestDamage: bucket.bestDamage,
      claimedTierIds: [...bucket.claimedTierIds],
      receipts: [...bucket.receipts],
      bestSplitsMs: bucket.bestSplitsMs,
      lastVerifiedAttemptId: bucket.lastVerifiedAttemptId,
    },
    leaderboard,
    top1SplitsMs: leaderboard[0]?.bestSplitsMs ?? null,
  };
}

export function fallbackStartWeekendBlitzAttempt(
  identity: WeeklyBossFallbackIdentity,
  displayName: string,
  nowMs = Date.now()
): {
  schedule: WeekendBlitzSchedule;
  attempt: { attemptId: string; seed: string; startedAt: number };
  attemptsUsed: number;
  attemptsRemaining: number;
} {
  const schedule = getCurrentWeekendBlitzSchedule(nowMs);
  const store = readStore();
  const bucket = ensureWeekendBucket(store, identity, schedule.eventId);
  const cleanName = (displayName || identity.displayName).trim().slice(0, 24) || 'Chiến Binh Tinh Giới';
  bucket.displayName = cleanName;

  if (bucket.attemptsUsed >= schedule.maxFreeAttempts) {
    throw new Error('Bạn đã dùng hết 3 lượt miễn phí cho Boss Cuối Tuần.');
  }

  const attemptId = `we_local_${schedule.eventId}_${nowMs}_${Math.random().toString(36).slice(2, 7)}`;
  bucket.attemptsUsed += 1;
  bucket.activeAttemptId = attemptId;
  bucket.attempts[attemptId] = {
    attemptId,
    seed: schedule.seed,
    startedAt: nowMs,
    displayName: cleanName,
    submitted: false,
  };
  bucket.updatedAt = nowMs;
  writeStore(store);

  return {
    schedule,
    attempt: { attemptId, seed: schedule.seed, startedAt: nowMs },
    attemptsUsed: bucket.attemptsUsed,
    attemptsRemaining: Math.max(0, schedule.maxFreeAttempts - bucket.attemptsUsed),
  };
}

export function fallbackSubmitWeekendBlitzAttempt(
  identity: WeeklyBossFallbackIdentity,
  payload: {
    attemptId: string;
    seed: string;
    displayName: string;
    cleared: boolean;
    damageDealt: number;
    simTicks: number;
    clearTimeMs: number;
    remainingHpPct: number;
    perfectDodges: number;
    autoPilotUsed?: boolean;
    splitsMs?: Array<number | null>;
    counterHitsLanded?: number;
    guardBreaksLanded?: number;
    peakStyleGrade?: CombatStyleGrade;
  },
  nowMs = Date.now()
): {
  ok: true;
  verifiedScore: number;
  rank: number;
  attemptsRemaining: number;
  leaderboard: WeeklyBossLeaderboardEntry[];
  seasonCpBonusAwarded: number;
} {
  const schedule = getCurrentWeekendBlitzSchedule(nowMs);
  const seasonInfo = getWeeklyBossSeasonInfo(nowMs);
  const store = readStore();
  const bucket = ensureWeekendBucket(store, identity, schedule.eventId);
  const season = ensureSeasonBucket(store, identity, seasonInfo.seasonId);

  const attempt = bucket.attempts[payload.attemptId];
  if (attempt && attempt.submitted) {
    const lb = buildWeekendLeaderboard(store, schedule.eventId);
    const rankIdx = lb.findIndex((e) => e.uid === identity.uid);
    return {
      ok: true,
      verifiedScore: bucket.bestScore,
      rank: rankIdx >= 0 ? rankIdx + 1 : 1,
      attemptsRemaining: Math.max(0, schedule.maxFreeAttempts - bucket.attemptsUsed),
      leaderboard: lb,
      seasonCpBonusAwarded: 0,
    };
  }
  if (attempt) attempt.submitted = true;
  if (bucket.activeAttemptId === payload.attemptId) bucket.activeAttemptId = null;

  const cleanName = (payload.displayName || bucket.displayName || identity.displayName)
    .trim()
    .slice(0, 24);
  bucket.displayName = cleanName;
  season.displayName = cleanName;

  const safeDamage = Math.max(0, Math.min(schedule.bossMaxHp, Math.round(payload.damageDealt || 0)));
  const safeClearTimeMs = Math.max(
    1000,
    Math.min(schedule.timeLimitSec * 1000, Math.round(payload.clearTimeMs || schedule.timeLimitSec * 1000))
  );
  const verifiedScore = payload.autoPilotUsed
    ? 0
    : computeWeekendBlitzScore({
        cleared: Boolean(payload.cleared),
        damageDealt: safeDamage,
        bossMaxHp: schedule.bossMaxHp,
        clearTimeMs: safeClearTimeMs,
        timeLimitSec: schedule.timeLimitSec,
        remainingHpPct: payload.remainingHpPct,
        perfectDodges: payload.perfectDodges,
        modifier: schedule.modifier,
      });

  const splits = normalizeSplits(payload.splitsMs);
  if (verifiedScore >= bucket.bestScore) {
    bucket.bestScore = verifiedScore;
    bucket.bestDamage = Math.max(bucket.bestDamage, safeDamage);
    if (payload.cleared) {
      bucket.cleared = true;
      bucket.bestClearTimeMs =
        bucket.bestClearTimeMs === null
          ? safeClearTimeMs
          : Math.min(bucket.bestClearTimeMs, safeClearTimeMs);
    }
    if (splits) bucket.bestSplitsMs = splits;
    bucket.counterHitsLanded = Math.max(bucket.counterHitsLanded, payload.counterHitsLanded ?? 0);
    bucket.guardBreaksLanded = Math.max(bucket.guardBreaksLanded, payload.guardBreaksLanded ?? 0);
    if (payload.peakStyleGrade) bucket.peakStyleGrade = payload.peakStyleGrade;
    bucket.lastVerifiedAttemptId = payload.attemptId;
  }
  bucket.updatedAt = nowMs;

  let seasonCpBonusAwarded = 0;
  if (!payload.autoPilotUsed && payload.cleared && !season.weekendBonusByEvent[schedule.eventId]) {
    seasonCpBonusAwarded = schedule.seasonCpBonusOnClear;
    season.weekendBonusByEvent[schedule.eventId] = seasonCpBonusAwarded;
    season.updatedAt = nowMs;
    recalcSeasonPoints(season);
  }

  writeStore(store);

  const leaderboard = buildWeekendLeaderboard(store, schedule.eventId);
  const rankIdx = leaderboard.findIndex((e) => e.uid === identity.uid);

  return {
    ok: true,
    verifiedScore,
    rank: rankIdx >= 0 ? rankIdx + 1 : 1,
    attemptsRemaining: Math.max(0, schedule.maxFreeAttempts - bucket.attemptsUsed),
    leaderboard,
    seasonCpBonusAwarded,
  };
}

export function fallbackClaimWeekendBlitzReward(
  identity: WeeklyBossFallbackIdentity,
  payload: { tierId: string; idempotencyKey: string },
  nowMs = Date.now()
): {
  ok: true;
  alreadyClaimed: boolean;
  receipt: WeekendBlitzClaimReceipt;
  claimedTierIds: string[];
} {
  const schedule = getCurrentWeekendBlitzSchedule(nowMs);
  const tier = schedule.rewardTiers.find((t) => t.tierId === payload.tierId);
  if (!tier) {
    throw new Error('Mốc thưởng Boss Cuối Tuần không hợp lệ.');
  }
  const store = readStore();
  const bucket = ensureWeekendBucket(store, identity, schedule.eventId);

  if (payload.idempotencyKey && bucket.idempotencyMap[payload.idempotencyKey]) {
    return {
      ok: true,
      alreadyClaimed: true,
      receipt: bucket.idempotencyMap[payload.idempotencyKey],
      claimedTierIds: [...bucket.claimedTierIds],
    };
  }
  const existing = bucket.receipts.find((r) => r.tierId === tier.tierId);
  if (existing || bucket.claimedTierIds.includes(tier.tierId)) {
    const fallbackReceipt: WeekendBlitzClaimReceipt = existing ?? {
      claimKey: `${schedule.eventId}_${identity.uid}_${tier.tierId}`,
      eventId: schedule.eventId,
      uid: identity.uid,
      tierId: tier.tierId,
      claimedAt: nowMs,
      rewardGems: tier.rewardGems,
      rewardEpicShards: tier.rewardEpicShards,
      rewardTitleLabel: tier.rewardTitleLabel,
      rewardFrameId: tier.rewardFrameId,
      rewardFrameName: tier.rewardFrameName,
      idempotencyKey: payload.idempotencyKey,
    };
    return {
      ok: true,
      alreadyClaimed: true,
      receipt: fallbackReceipt,
      claimedTierIds: [...bucket.claimedTierIds],
    };
  }
  if (bucket.bestScore < tier.minScore) {
    throw new Error(`Cần đạt tối thiểu ${tier.minScore.toLocaleString('vi-VN')} điểm để nhận mốc này.`);
  }

  const receipt: WeekendBlitzClaimReceipt = {
    claimKey: `${schedule.eventId}_${identity.uid}_${tier.tierId}`,
    eventId: schedule.eventId,
    uid: identity.uid,
    tierId: tier.tierId,
    claimedAt: nowMs,
    rewardGems: tier.rewardGems,
    rewardEpicShards: tier.rewardEpicShards,
    rewardTitleLabel: tier.rewardTitleLabel,
    rewardFrameId: tier.rewardFrameId,
    rewardFrameName: tier.rewardFrameName,
    idempotencyKey: payload.idempotencyKey,
  };
  bucket.claimedTierIds.push(tier.tierId);
  bucket.receipts.push(receipt);
  if (payload.idempotencyKey) {
    bucket.idempotencyMap[payload.idempotencyKey] = receipt;
  }
  writeStore(store);

  return {
    ok: true,
    alreadyClaimed: false,
    receipt,
    claimedTierIds: [...bucket.claimedTierIds],
  };
}

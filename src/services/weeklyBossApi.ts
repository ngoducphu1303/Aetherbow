import { auth } from '../firebase';
import type { CombatStyleGrade } from '../types/game';
import type {
  WeeklyBossClaimReceipt,
  WeeklyBossLeaderboardEntry,
  WeeklyBossSchedule,
  WeeklyBossSeasonClaimReceipt,
  WeeklyBossSeasonStateResponse,
  WeeklyBossStateResponse,
  WeekendBlitzClaimReceipt,
  WeekendBlitzSchedule,
  WeekendBlitzStateResponse,
} from '../data/weeklyBossData';
import {
  fallbackClaimWeekendBlitzReward,
  fallbackClaimWeeklyBossReward,
  fallbackClaimWeeklyBossSeasonReward,
  fallbackFetchWeekendBlitzState,
  fallbackFetchWeeklyBossSeasonState,
  fallbackFetchWeeklyBossState,
  fallbackStartWeekendBlitzAttempt,
  fallbackStartWeeklyBossAttempt,
  fallbackSubmitWeekendBlitzAttempt,
  fallbackSubmitWeeklyBossAttempt,
  type WeeklyBossFallbackIdentity,
} from './weeklyBossLocalFallback';

let standaloneFallbackLatched = false;

export function isWeeklyBossStandaloneFallbackActive(): boolean {
  return standaloneFallbackLatched;
}

export function resetWeeklyBossApiModeForTests(): void {
  standaloneFallbackLatched = false;
}

function getCurrentFallbackIdentity(preferredName?: string): WeeklyBossFallbackIdentity {
  const user = auth?.currentUser ?? null;
  const uid = user?.uid || 'local_artemis_player';
  const displayName =
    preferredName?.trim() ||
    user?.displayName?.trim() ||
    user?.email?.split('@')[0] ||
    'Chiến Binh Tinh Giới';
  return {
    uid,
    displayName: displayName.slice(0, 24),
    authenticated: true,
  };
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const user = auth?.currentUser ?? null;
  if (user) {
    try {
      const token = await user.getIdToken();
      headers.Authorization = `Bearer ${token}`;
    } catch {
      // Unauthenticated fallback handled gracefully by server
    }
  }
  return headers;
}

function isStaticHostUnavailableStatus(status: number): boolean {
  return status === 404 || status === 405 || status === 501;
}

async function requestWithStaticFallback<T>(
  url: string,
  init: RequestInit,
  fallbackFn: () => T
): Promise<T> {
  if (standaloneFallbackLatched) {
    return fallbackFn();
  }
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(url, { ...init, headers });
    const contentType = res.headers.get('content-type') || '';

    // Static SPA hosts (e.g., Vercel without serverless API) return 404/405 or HTML
    if (isStaticHostUnavailableStatus(res.status) || contentType.includes('text/html')) {
      standaloneFallbackLatched = true;
      return fallbackFn();
    }

    const rawText = await res.text();
    let parsed: ({ error?: string; message?: string } & T) | null = null;
    try {
      parsed = JSON.parse(rawText) as { error?: string; message?: string } & T;
    } catch {
      // Non-JSON payload on an API route indicates static host/proxy mismatch
      standaloneFallbackLatched = true;
      return fallbackFn();
    }

    if (!res.ok) {
      throw new Error(parsed.message || parsed.error || `Lỗi máy chủ (${res.status})`);
    }
    return parsed;
  } catch (err) {
    // Only fall back on network-level errors (TypeError / offline / blocked);
    // rethrow legitimate server validation errors (e.g. out of attempts).
    if (err instanceof TypeError) {
      standaloneFallbackLatched = true;
      return fallbackFn();
    }
    throw err;
  }
}

export async function fetchWeeklyBossState(): Promise<WeeklyBossStateResponse> {
  return requestWithStaticFallback(
    '/api/weekly-boss/state',
    { method: 'GET' },
    () => fallbackFetchWeeklyBossState(getCurrentFallbackIdentity())
  );
}

export async function startWeeklyBossAttempt(displayName: string): Promise<{
  schedule: WeeklyBossSchedule;
  attempt: { attemptId: string; seed: string; startedAt: number };
  attemptsUsed: number;
  attemptsRemaining: number;
}> {
  return requestWithStaticFallback(
    '/api/weekly-boss/start',
    {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    },
    () => fallbackStartWeeklyBossAttempt(getCurrentFallbackIdentity(displayName), displayName)
  );
}

export async function submitWeeklyBossAttempt(payload: {
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
}): Promise<{
  ok: true;
  verifiedScore: number;
  rank: number;
  attemptsRemaining: number;
  leaderboard: WeeklyBossLeaderboardEntry[];
}> {
  return requestWithStaticFallback(
    '/api/weekly-boss/submit',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    () =>
      fallbackSubmitWeeklyBossAttempt(getCurrentFallbackIdentity(payload.displayName), payload)
  );
}

export async function claimWeeklyBossReward(payload: {
  tierId: string;
  idempotencyKey: string;
}): Promise<{
  ok: true;
  alreadyClaimed: boolean;
  receipt: WeeklyBossClaimReceipt;
  claimedTierIds: string[];
}> {
  return requestWithStaticFallback(
    '/api/weekly-boss/claim',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    () => fallbackClaimWeeklyBossReward(getCurrentFallbackIdentity(), payload)
  );
}

export async function fetchWeeklyBossSeasonState(): Promise<WeeklyBossSeasonStateResponse> {
  return requestWithStaticFallback(
    '/api/weekly-boss/season',
    { method: 'GET' },
    () => fallbackFetchWeeklyBossSeasonState(getCurrentFallbackIdentity())
  );
}

export async function claimWeeklyBossSeasonReward(payload: {
  tierId: string;
  idempotencyKey: string;
}): Promise<{
  ok: true;
  alreadyClaimed: boolean;
  receipt: WeeklyBossSeasonClaimReceipt;
  claimedSeasonTierIds: string[];
}> {
  return requestWithStaticFallback(
    '/api/weekly-boss/season/claim',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    () => fallbackClaimWeeklyBossSeasonReward(getCurrentFallbackIdentity(), payload)
  );
}

export async function fetchWeekendBlitzState(): Promise<WeekendBlitzStateResponse> {
  return requestWithStaticFallback(
    '/api/weekly-boss/weekend/state',
    { method: 'GET' },
    () => fallbackFetchWeekendBlitzState(getCurrentFallbackIdentity())
  );
}

export async function startWeekendBlitzAttempt(displayName: string): Promise<{
  schedule: WeekendBlitzSchedule;
  attempt: { attemptId: string; seed: string; startedAt: number };
  attemptsUsed: number;
  attemptsRemaining: number;
}> {
  return requestWithStaticFallback(
    '/api/weekly-boss/weekend/start',
    {
      method: 'POST',
      body: JSON.stringify({ displayName }),
    },
    () => fallbackStartWeekendBlitzAttempt(getCurrentFallbackIdentity(displayName), displayName)
  );
}

export async function submitWeekendBlitzAttempt(payload: {
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
}): Promise<{
  ok: true;
  verifiedScore: number;
  rank: number;
  attemptsRemaining: number;
  leaderboard: WeeklyBossLeaderboardEntry[];
  seasonCpBonusAwarded: number;
}> {
  return requestWithStaticFallback(
    '/api/weekly-boss/weekend/submit',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    () =>
      fallbackSubmitWeekendBlitzAttempt(getCurrentFallbackIdentity(payload.displayName), payload)
  );
}

export async function claimWeekendBlitzReward(payload: {
  tierId: string;
  idempotencyKey: string;
}): Promise<{
  ok: true;
  alreadyClaimed: boolean;
  receipt: WeekendBlitzClaimReceipt;
  claimedTierIds: string[];
}> {
  return requestWithStaticFallback(
    '/api/weekly-boss/weekend/claim',
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    () => fallbackClaimWeekendBlitzReward(getCurrentFallbackIdentity(), payload)
  );
}

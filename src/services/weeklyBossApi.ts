import { auth } from '../firebase';
import type {
  WeeklyBossClaimReceipt,
  WeeklyBossLeaderboardEntry,
  WeeklyBossSchedule,
  WeeklyBossSeasonClaimReceipt,
  WeeklyBossSeasonStateResponse,
  WeeklyBossStateResponse,
} from '../data/weeklyBossData';

async function getAuthHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const user = auth.currentUser;
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

async function parseApiResponse<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string } & T;
  if (!res.ok) {
    throw new Error(data.message || data.error || `Lỗi máy chủ (${res.status})`);
  }
  return data;
}

export async function fetchWeeklyBossState(): Promise<WeeklyBossStateResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/weekly-boss/state', { method: 'GET', headers });
  return parseApiResponse<WeeklyBossStateResponse>(res);
}

export async function startWeeklyBossAttempt(displayName: string): Promise<{
  schedule: WeeklyBossSchedule;
  attempt: { attemptId: string; seed: string; startedAt: number };
  attemptsUsed: number;
  attemptsRemaining: number;
}> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/weekly-boss/start', {
    method: 'POST',
    headers,
    body: JSON.stringify({ displayName }),
  });
  return parseApiResponse(res);
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
}): Promise<{
  ok: true;
  verifiedScore: number;
  rank: number;
  attemptsRemaining: number;
  leaderboard: WeeklyBossLeaderboardEntry[];
}> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/weekly-boss/submit', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return parseApiResponse(res);
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
  const headers = await getAuthHeaders();
  const res = await fetch('/api/weekly-boss/claim', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return parseApiResponse(res);
}

export async function fetchWeeklyBossSeasonState(): Promise<WeeklyBossSeasonStateResponse> {
  const headers = await getAuthHeaders();
  const res = await fetch('/api/weekly-boss/season', { method: 'GET', headers });
  return parseApiResponse<WeeklyBossSeasonStateResponse>(res);
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
  const headers = await getAuthHeaders();
  const res = await fetch('/api/weekly-boss/season/claim', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  return parseApiResponse(res);
}

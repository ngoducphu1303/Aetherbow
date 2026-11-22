import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import {
  computeWeeklyBossScore,
  computeWeeklySeasonPointsForRank,
  computeWeekendBlitzScore,
  getCurrentWeeklyBossSchedule,
  getCurrentWeekendBlitzSchedule,
  getWeeklyBossSeasonInfo,
  WEEKLY_BOSS_LOANER_STATS,
  WEEKLY_BOSS_MAX_FREE_ATTEMPTS,
} from '../data/weeklyBossData.ts';
import { ACCOUNT_RESET_EPOCH } from '../services/accountHydrationPolicy.ts';
import type { CombatStyleGrade } from '../types/game.ts';
import type {
  WeeklyBossClaimReceipt,
  WeeklyBossLeaderboardEntry,
  WeeklyBossRunHistoryEntry,
  WeeklyBossSchedule,
  WeeklyBossSeasonClaimReceipt,
  WeeklyBossSeasonEntry,
  WeeklyBossSeasonStateResponse,
  WeeklyBossStateResponse,
  WeekendBlitzClaimReceipt,
  WeekendBlitzSchedule,
  WeekendBlitzStateResponse,
} from '../data/weeklyBossData.ts';

const VALID_STYLE_GRADES = new Set<CombatStyleGrade>(['B', 'A', 'S', 'SS', 'SSS']);

function sanitizeStyleGrade(raw: unknown): CombatStyleGrade | undefined {
  if (typeof raw === 'string' && VALID_STYLE_GRADES.has(raw as CombatStyleGrade)) {
    return raw as CombatStyleGrade;
  }
  return undefined;
}

export interface WeeklyBossAttemptRecord {
  attemptId: string;
  weekId: string;
  uid: string;
  displayName: string;
  seed: string;
  startedAt: number;
  submittedAt?: number;
  status: 'active' | 'submitted' | 'rejected';
  rejectReason?: string;
  verifiedScore?: number;
  damageDealt?: number;
  clearTimeMs?: number | null;
  simTicks?: number;
  cleared?: boolean;
}

export interface WeeklyBossAuditEntry {
  at: number;
  uid: string;
  attemptId: string;
  verdict: 'accepted' | 'rejected';
  reason: string;
  verifiedScore?: number;
}

export interface WeeklyBossWeekLedger {
  weekId: string;
  attempts: Record<string, WeeklyBossAttemptRecord>;
  attemptsByUser: Record<string, string[]>;
  leaderboard: Record<string, WeeklyBossLeaderboardEntry>;
  claims: Record<string, WeeklyBossClaimReceipt>; // key: `${weekId}:${uid}:${tierId}`
  idempotencyIndex: Record<string, string>; // key: `${weekId}:${uid}:${idempotencyKey}` -> claimKey
  auditLog?: WeeklyBossAuditEntry[];
}

export interface WeekendBlitzEventLedger {
  eventId: string;
  attempts: Record<string, WeeklyBossAttemptRecord>;
  attemptsByUser: Record<string, string[]>;
  leaderboard: Record<string, WeeklyBossLeaderboardEntry>;
  claims: Record<string, WeekendBlitzClaimReceipt>;
  idempotencyIndex: Record<string, string>;
  auditLog?: WeeklyBossAuditEntry[];
}

export interface WeeklyBossStoreData {
  version: 1;
  resetEpoch?: number;
  weeks: Record<string, WeeklyBossWeekLedger>;
  weekendEvents?: Record<string, WeekendBlitzEventLedger>;
  seasonClaims?: Record<string, WeeklyBossSeasonClaimReceipt>;
  seasonIdempotencyIndex?: Record<string, string>;
}

export interface SubmitAttemptPayload {
  attemptId: string;
  seed: string;
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
}

export interface SubmitAttemptResult {
  ok: true;
  attempt: WeeklyBossAttemptRecord;
  verifiedScore: number;
  rank: number;
  attemptsRemaining: number;
  leaderboard: WeeklyBossLeaderboardEntry[];
}

export interface ClaimRewardResult {
  ok: true;
  alreadyClaimed: boolean;
  receipt: WeeklyBossClaimReceipt;
  claimedTierIds: string[];
}

export class WeeklyBossServiceError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(statusCode: number, code: string, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function createEmptyStore(): WeeklyBossStoreData {
  return {
    version: 1,
    resetEpoch: ACCOUNT_RESET_EPOCH,
    weeks: {},
    weekendEvents: {},
    seasonClaims: {},
    seasonIdempotencyIndex: {},
  };
}

function createEmptyWeekLedger(weekId: string): WeeklyBossWeekLedger {
  return {
    weekId,
    attempts: {},
    attemptsByUser: {},
    leaderboard: {},
    claims: {},
    idempotencyIndex: {},
    auditLog: [],
  };
}

/**
 * Maximum theoretically plausible sustained DPS with standardized Epic loaner gear
 * (including realistic in-run skill drafts, crits, Overcharge, CounterShot, and ultimates).
 * Used to reject tampered client submissions.
 */
function computeMaxPlausibleDps(): number {
  const s = WEEKLY_BOSS_LOANER_STATS;
  const baseDps = s.attack * s.attackSpeedMult * (1 + s.critChance * (s.critDamage - 1)) * (1 + s.bossDamageBonus);
  // Generous 5.2x multiplier allows skilled CounterShot + Overcharge + Ult bursts while blocking spoofed instant kills
  return Math.round(baseDps * 5.2);
}

export class WeeklyBossService {
  private readonly storePath: string;
  private store: WeeklyBossStoreData;
  private onLeaderboardUpdated?: (info: {
    weekId: string;
    uid: string;
    displayName: string;
    rank: number;
    verifiedScore: number;
    cleared: boolean;
    leaderboard: WeeklyBossLeaderboardEntry[];
  }) => void;

  constructor(
    storePath = path.resolve(process.cwd(), '.data/weekly-ranked-boss.json'),
    onLeaderboardUpdated?: WeeklyBossService['onLeaderboardUpdated']
  ) {
    this.storePath = storePath;
    this.onLeaderboardUpdated = onLeaderboardUpdated;
    this.store = this.loadStore();
  }

  private pushAudit(ledger: WeeklyBossWeekLedger, entry: WeeklyBossAuditEntry): void {
    if (!Array.isArray(ledger.auditLog)) ledger.auditLog = [];
    ledger.auditLog.push(entry);
    if (ledger.auditLog.length > 120) {
      ledger.auditLog = ledger.auditLog.slice(-120);
    }
  }

  private loadStore(): WeeklyBossStoreData {
    try {
      if (!fs.existsSync(this.storePath)) return createEmptyStore();
      const raw = fs.readFileSync(this.storePath, 'utf8');
      const parsed = JSON.parse(raw) as Partial<WeeklyBossStoreData>;
      if (
        parsed &&
        parsed.version === 1 &&
        (parsed.resetEpoch ?? 0) >= ACCOUNT_RESET_EPOCH &&
        parsed.weeks &&
        typeof parsed.weeks === 'object'
      ) {
        return {
          version: 1,
          resetEpoch: parsed.resetEpoch ?? ACCOUNT_RESET_EPOCH,
          weeks: parsed.weeks,
          weekendEvents: parsed.weekendEvents ?? {},
          seasonClaims: parsed.seasonClaims ?? {},
          seasonIdempotencyIndex: parsed.seasonIdempotencyIndex ?? {},
        };
      }
      const fresh = createEmptyStore();
      try {
        this.store = fresh;
        this.persistStore();
      } catch {
        // ignore disk write errors during reset
      }
      return fresh;
    } catch {
      return createEmptyStore();
    }
  }

  private persistStore(): void {
    const dir = path.dirname(this.storePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpPath = `${this.storePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(this.store, null, 2), 'utf8');
    fs.renameSync(tmpPath, this.storePath);
  }

  private ensureWeekLedger(weekId: string): WeeklyBossWeekLedger {
    if (!this.store.weeks[weekId]) {
      this.store.weeks[weekId] = createEmptyWeekLedger(weekId);
    }
    return this.store.weeks[weekId];
  }

  private getSortedLeaderboard(ledger: WeeklyBossWeekLedger): WeeklyBossLeaderboardEntry[] {
    return Object.values(ledger.leaderboard)
      .sort((a, b) => {
        if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
        const aTime = a.bestClearTimeMs ?? Number.MAX_SAFE_INTEGER;
        const bTime = b.bestClearTimeMs ?? Number.MAX_SAFE_INTEGER;
        if (aTime !== bTime) return aTime - bTime;
        return a.updatedAt - b.updatedAt;
      })
      .slice(0, 50);
  }

  public getState(
    user: { uid: string; displayName: string } | null,
    nowMs = Date.now()
  ): WeeklyBossStateResponse {
    const schedule = getCurrentWeeklyBossSchedule(nowMs);
    const ledger = this.ensureWeekLedger(schedule.weekId);
    const leaderboard = this.getSortedLeaderboard(ledger);

    if (!user) {
      return {
        schedule,
        serverNow: nowMs,
        authenticated: false,
        player: null,
        leaderboard,
      };
    }

    const userAttemptIds = ledger.attemptsByUser[user.uid] ?? [];
    const activeAttempt = userAttemptIds
      .map((id) => ledger.attempts[id])
      .find((a) => a && a.status === 'active');
    const lbEntry = ledger.leaderboard[user.uid];
    const receipts = Object.values(ledger.claims).filter(
      (c) => c.uid === user.uid && c.weekId === schedule.weekId
    );

    return {
      schedule,
      serverNow: nowMs,
      authenticated: true,
      player: {
        uid: user.uid,
        displayName: user.displayName,
        attemptsUsed: userAttemptIds.length,
        attemptsRemaining: Math.max(0, schedule.maxFreeAttempts - userAttemptIds.length),
        activeAttemptId: activeAttempt?.attemptId ?? null,
        bestScore: lbEntry?.bestScore ?? 0,
        bestClearTimeMs: lbEntry?.bestClearTimeMs ?? null,
        bestDamage: lbEntry?.bestDamage ?? 0,
        claimedTierIds: receipts.map((r) => r.tierId),
        receipts,
        bestSplitsMs: lbEntry?.bestSplitsMs ?? null,
        lastVerifiedAttemptId: lbEntry?.lastVerifiedAttemptId ?? null,
      },
      leaderboard,
      top1SplitsMs: leaderboard[0]?.bestSplitsMs ?? null,
    };
  }

  public startAttempt(
    user: { uid: string; displayName: string },
    nowMs = Date.now()
  ): {
    schedule: WeeklyBossSchedule;
    attempt: WeeklyBossAttemptRecord;
    attemptsUsed: number;
    attemptsRemaining: number;
  } {
    const schedule = getCurrentWeeklyBossSchedule(nowMs);
    const ledger = this.ensureWeekLedger(schedule.weekId);
    const userAttemptIds = ledger.attemptsByUser[user.uid] ?? [];

    // Close any stale active attempt older than timeLimit + 60s
    for (const id of userAttemptIds) {
      const existing = ledger.attempts[id];
      if (existing && existing.status === 'active') {
        const ageMs = nowMs - existing.startedAt;
        if (ageMs < (schedule.timeLimitSec + 45) * 1000) {
          // Return existing active attempt instead of burning an extra free attempt on double-click
          return {
            schedule,
            attempt: existing,
            attemptsUsed: userAttemptIds.length,
            attemptsRemaining: Math.max(0, schedule.maxFreeAttempts - userAttemptIds.length),
          };
        }
        existing.status = 'rejected';
        existing.rejectReason = 'Hết thời gian nộp kết quả phiên trước';
      }
    }

    if (userAttemptIds.length >= WEEKLY_BOSS_MAX_FREE_ATTEMPTS) {
      throw new WeeklyBossServiceError(
        403,
        'ATTEMPT_LIMIT_REACHED',
        `Bạn đã dùng hết ${WEEKLY_BOSS_MAX_FREE_ATTEMPTS}/${WEEKLY_BOSS_MAX_FREE_ATTEMPTS} lượt tính hạng miễn phí của tuần ${schedule.weekId}.`
      );
    }

    const attemptId = `wb_${schedule.weekId}_${crypto.randomBytes(6).toString('hex')}`;
    const attempt: WeeklyBossAttemptRecord = {
      attemptId,
      weekId: schedule.weekId,
      uid: user.uid,
      displayName: user.displayName,
      seed: schedule.seed,
      startedAt: nowMs,
      status: 'active',
    };

    ledger.attempts[attemptId] = attempt;
    ledger.attemptsByUser[user.uid] = [...userAttemptIds, attemptId];
    this.persistStore();

    return {
      schedule,
      attempt,
      attemptsUsed: ledger.attemptsByUser[user.uid].length,
      attemptsRemaining: Math.max(
        0,
        schedule.maxFreeAttempts - ledger.attemptsByUser[user.uid].length
      ),
    };
  }

  public submitAttempt(
    user: { uid: string; displayName: string },
    payload: SubmitAttemptPayload,
    nowMs = Date.now()
  ): SubmitAttemptResult {
    const schedule = getCurrentWeeklyBossSchedule(nowMs);
    const ledger = this.ensureWeekLedger(schedule.weekId);
    const attempt = ledger.attempts[payload.attemptId];

    if (!attempt) {
      throw new WeeklyBossServiceError(404, 'ATTEMPT_NOT_FOUND', 'Không tìm thấy phiên lượt chơi hợp lệ.');
    }
    if (attempt.uid !== user.uid) {
      throw new WeeklyBossServiceError(403, 'ATTEMPT_OWNER_MISMATCH', 'Phiên lượt chơi không thuộc tài khoản này.');
    }
    if (attempt.status !== 'active') {
      throw new WeeklyBossServiceError(
        409,
        'ATTEMPT_ALREADY_FINALIZED',
        'Phiên lượt chơi này đã được ghi nhận trước đó.'
      );
    }
    if (payload.autoPilotUsed) {
      attempt.status = 'rejected';
      attempt.rejectReason = 'Phát hiện bật AI Tự Chơi trong lượt Boss Tuần Tính Hạng';
      this.pushAudit(ledger, {
        at: nowMs,
        uid: user.uid,
        attemptId: attempt.attemptId,
        verdict: 'rejected',
        reason: 'AUTOPILOT_FORBIDDEN_IN_RANKED',
      });
      this.persistStore();
      throw new WeeklyBossServiceError(
        422,
        'AUTOPILOT_FORBIDDEN_IN_RANKED',
        'Boss Tuần Tính Hạng chỉ chấp nhận điều khiển thủ công thuần kỹ năng (AI Tự Chơi bị khóa).'
      );
    }
    if (payload.seed !== attempt.seed) {
      attempt.status = 'rejected';
      attempt.rejectReason = 'Sai mã Seed trận đấu tuần';
      this.pushAudit(ledger, {
        at: nowMs,
        uid: user.uid,
        attemptId: attempt.attemptId,
        verdict: 'rejected',
        reason: 'SEED_MISMATCH',
      });
      this.persistStore();
      throw new WeeklyBossServiceError(400, 'SEED_MISMATCH', 'Mã Seed trận đấu không khớp lịch tuần hiện tại.');
    }

    const damageDealt = Number(payload.damageDealt);
    const simTicks = Math.floor(Number(payload.simTicks));
    const clearTimeMs = Math.round(Number(payload.clearTimeMs));
    const remainingHpPct = Number(payload.remainingHpPct);
    const perfectDodges = Math.floor(Number(payload.perfectDodges));

    if (
      !Number.isFinite(damageDealt) ||
      !Number.isFinite(simTicks) ||
      !Number.isFinite(clearTimeMs) ||
      !Number.isFinite(remainingHpPct) ||
      !Number.isFinite(perfectDodges)
    ) {
      throw new WeeklyBossServiceError(400, 'INVALID_PAYLOAD', 'Dữ liệu báo cáo trận đấu không hợp lệ.');
    }

    if (damageDealt < 0 || damageDealt > schedule.bossMaxHp * 1.05) {
      attempt.status = 'rejected';
      attempt.rejectReason = 'Sát thương vượt giới hạn HP Boss';
      this.persistStore();
      throw new WeeklyBossServiceError(
        422,
        'INVALID_DAMAGE_RANGE',
        'Sát thương báo cáo vượt quá giới hạn hợp lệ của Boss Tuần.'
      );
    }

    const simSeconds = simTicks / 60;
    const clearSeconds = clearTimeMs / 1000;
    const wallElapsedSec = Math.max(0, (nowMs - attempt.startedAt) / 1000);

    // Fixed-timestep consistency check: clearTimeMs must match simTicks * (1/60s) within 1.5s tolerance
    if (simTicks < 60 || Math.abs(simSeconds - clearSeconds) > 1.5) {
      attempt.status = 'rejected';
      attempt.rejectReason = 'Sai lệch nhịp bước thời gian cố định (simTicks vs clearTimeMs)';
      this.persistStore();
      throw new WeeklyBossServiceError(
        422,
        'SIM_CLOCK_MISMATCH',
        'Đồng bộ thời gian mô phỏng không khớp số bước cố định 60Hz.'
      );
    }

    if (clearSeconds > schedule.timeLimitSec + 2) {
      attempt.status = 'rejected';
      attempt.rejectReason = 'Vượt quá giới hạn thời gian trận Boss Tuần';
      this.persistStore();
      throw new WeeklyBossServiceError(422, 'TIME_LIMIT_EXCEEDED', 'Thời gian vượt giới hạn 90 giây.');
    }

    // Wall-clock anti-speedhack check (allow slight 1.5s grace for network jitter & test clocks)
    if (clearSeconds > wallElapsedSec + 2.5) {
      attempt.status = 'rejected';
      attempt.rejectReason = 'Thời gian mô phỏng lớn hơn thời gian thực phiên đấu';
      this.persistStore();
      throw new WeeklyBossServiceError(
        422,
        'WALL_CLOCK_VIOLATION',
        'Thời gian trận đấu không khớp thời điểm máy chủ mở phiên.'
      );
    }

    // Standardized Epic loaner gear DPS ceiling verification
    const maxPlausibleDps = computeMaxPlausibleDps();
    const observedDps = damageDealt / Math.max(1, simSeconds);
    if (observedDps > maxPlausibleDps || (payload.cleared && clearSeconds < 6)) {
      attempt.status = 'rejected';
      attempt.rejectReason = `DPS (${Math.round(observedDps)}) vượt ngưỡng hợp lệ của bộ đồ Sử Thi cho mượn (${maxPlausibleDps})`;
      this.persistStore();
      throw new WeeklyBossServiceError(
        422,
        'LOANER_DPS_EXCEEDED',
        'Chỉ số sát thương vượt giới hạn bộ trang bị Sử Thi chuẩn hóa.'
      );
    }

    if (payload.cleared && damageDealt < schedule.bossMaxHp * 0.98) {
      attempt.status = 'rejected';
      attempt.rejectReason = 'Báo hạ Boss nhưng sát thương chưa đủ HP Boss';
      this.persistStore();
      throw new WeeklyBossServiceError(422, 'INCOMPLETE_CLEAR_DAMAGE', 'Sát thương chưa đủ để hạ Boss Tuần.');
    }

    const verifiedScore = computeWeeklyBossScore({
      cleared: Boolean(payload.cleared),
      damageDealt: Math.min(schedule.bossMaxHp, Math.round(damageDealt)),
      bossMaxHp: schedule.bossMaxHp,
      clearTimeMs,
      timeLimitSec: schedule.timeLimitSec,
      remainingHpPct: Math.max(0, Math.min(1, remainingHpPct)),
      perfectDodges: Math.max(0, Math.min(20, perfectDodges)),
    });

    attempt.status = 'submitted';
    attempt.submittedAt = nowMs;
    attempt.verifiedScore = verifiedScore;
    attempt.damageDealt = Math.min(schedule.bossMaxHp, Math.round(damageDealt));
    attempt.clearTimeMs = payload.cleared ? clearTimeMs : null;
    attempt.simTicks = simTicks;
    attempt.cleared = Boolean(payload.cleared);

    const prev = ledger.leaderboard[user.uid];
    const attemptsUsed = (ledger.attemptsByUser[user.uid] ?? []).length;
    const isBetter =
      !prev ||
      verifiedScore > prev.bestScore ||
      (verifiedScore === prev.bestScore &&
        payload.cleared &&
        (prev.bestClearTimeMs === null || clearTimeMs < prev.bestClearTimeMs));

    const sanitizedSplits =
      Array.isArray(payload.splitsMs) && payload.splitsMs.length === 4
        ? payload.splitsMs.map((v) =>
            v !== null && Number.isFinite(Number(v)) && Number(v) > 0
              ? Math.min(clearTimeMs, Math.round(Number(v)))
              : payload.cleared
              ? clearTimeMs
              : 0
          )
        : null;
    const counterHitsLanded = Math.max(0, Math.min(50, Math.floor(Number(payload.counterHitsLanded ?? 0))));
    const guardBreaksLanded = Math.max(0, Math.min(20, Math.floor(Number(payload.guardBreaksLanded ?? 0))));
    const peakStyleGrade = sanitizeStyleGrade(payload.peakStyleGrade) ?? prev?.peakStyleGrade;

    ledger.leaderboard[user.uid] = isBetter
      ? {
          uid: user.uid,
          displayName: user.displayName,
          bestScore: verifiedScore,
          bestClearTimeMs: payload.cleared ? clearTimeMs : prev?.bestClearTimeMs ?? null,
          bestDamage: Math.max(prev?.bestDamage ?? 0, attempt.damageDealt),
          cleared: Boolean(payload.cleared || prev?.cleared),
          attemptsUsed,
          updatedAt: nowMs,
          bestSplitsMs:
            sanitizedSplits && sanitizedSplits.every((v) => v > 0)
              ? sanitizedSplits
              : prev?.bestSplitsMs ?? null,
          counterHitsLanded,
          guardBreaksLanded,
          peakStyleGrade,
          lastVerifiedAttemptId: attempt.attemptId,
        }
      : {
          ...prev,
          displayName: user.displayName,
          attemptsUsed,
        };

    this.pushAudit(ledger, {
      at: nowMs,
      uid: user.uid,
      attemptId: attempt.attemptId,
      verdict: 'accepted',
      reason: payload.cleared ? 'VERIFIED_BOSS_CLEAR' : 'VERIFIED_DAMAGE_RUN',
      verifiedScore,
    });
    this.persistStore();

    const sorted = this.getSortedLeaderboard(ledger);
    const rank = Math.max(1, sorted.findIndex((e) => e.uid === user.uid) + 1);

    this.onLeaderboardUpdated?.({
      weekId: schedule.weekId,
      uid: user.uid,
      displayName: user.displayName,
      rank,
      verifiedScore,
      cleared: Boolean(payload.cleared),
      leaderboard: sorted,
    });

    return {
      ok: true,
      attempt,
      verifiedScore,
      rank,
      attemptsRemaining: Math.max(0, schedule.maxFreeAttempts - attemptsUsed),
      leaderboard: sorted,
    };
  }

  /**
   * Idempotent reward claim:
   * - Unique key per `${weekId}:${uid}:${tierId}` AND optional `idempotencyKey`.
   * - Re-submitting the same claim request returns the original receipt with
   *   `alreadyClaimed: true` and never issues a duplicate reward.
   */
  public claimReward(
    user: { uid: string; displayName: string },
    tierId: string,
    idempotencyKey?: string,
    nowMs = Date.now()
  ): ClaimRewardResult {
    const schedule = getCurrentWeeklyBossSchedule(nowMs);
    const ledger = this.ensureWeekLedger(schedule.weekId);
    const tier = schedule.rewardTiers.find((t) => t.tierId === tierId);

    if (!tier) {
      throw new WeeklyBossServiceError(404, 'REWARD_TIER_NOT_FOUND', 'Không tìm thấy mốc thưởng hạng tuần.');
    }

    const claimKey = `${schedule.weekId}:${user.uid}:${tierId}`;
    const idemLookupKey = idempotencyKey ? `${schedule.weekId}:${user.uid}:${idempotencyKey}` : null;

    // 1. Idempotency check by request key or unique tier claim key
    const existingByIdem =
      idemLookupKey && ledger.idempotencyIndex[idemLookupKey]
        ? ledger.claims[ledger.idempotencyIndex[idemLookupKey]]
        : undefined;
    const existingClaim = existingByIdem ?? ledger.claims[claimKey];

    if (existingClaim) {
      const claimedTierIds = Object.values(ledger.claims)
        .filter((c) => c.uid === user.uid && c.weekId === schedule.weekId)
        .map((c) => c.tierId);
      return {
        ok: true,
        alreadyClaimed: true,
        receipt: existingClaim,
        claimedTierIds,
      };
    }

    // 2. Verify player actually reached the verified score threshold on the server
    const lbEntry = ledger.leaderboard[user.uid];
    const verifiedBestScore = lbEntry?.bestScore ?? 0;
    if (verifiedBestScore < tier.minScore) {
      throw new WeeklyBossServiceError(
        403,
        'SCORE_THRESHOLD_NOT_MET',
        `Cần tối thiểu ${tier.minScore.toLocaleString('vi-VN')} điểm xác minh để nhận mốc này (hiện có ${verifiedBestScore.toLocaleString('vi-VN')}).`
      );
    }

    const receipt: WeeklyBossClaimReceipt = {
      claimKey,
      weekId: schedule.weekId,
      uid: user.uid,
      tierId: tier.tierId,
      claimedAt: nowMs,
      rewardTitleLabel: tier.rewardTitleLabel,
      rewardDynamicTitleId: tier.rewardDynamicTitleId,
      rewardFrameId: tier.rewardFrameId,
      rewardFrameName: tier.rewardFrameName,
      idempotencyKey,
    };

    ledger.claims[claimKey] = receipt;
    if (idemLookupKey) {
      ledger.idempotencyIndex[idemLookupKey] = claimKey;
    }
    this.persistStore();

    const claimedTierIds = Object.values(ledger.claims)
      .filter((c) => c.uid === user.uid && c.weekId === schedule.weekId)
      .map((c) => c.tierId);

    return {
      ok: true,
      alreadyClaimed: false,
      receipt,
      claimedTierIds,
    };
  }

  /**
   * Computes authoritative 4-Week Season Championship standings + verified personal
   * run history across all weeks belonging to the active season.
   */
  public getSeasonState(
    user: { uid: string; displayName: string } | null,
    nowMs = Date.now()
  ): WeeklyBossSeasonStateResponse {
    const season = getWeeklyBossSeasonInfo(nowMs);
    const aggMap = new Map<string, WeeklyBossSeasonEntry>();
    const playerHistory: WeeklyBossRunHistoryEntry[] = [];

    for (const wkId of season.weekIds) {
      const ledger = this.store.weeks[wkId];
      if (!ledger) continue;
      const sorted = this.getSortedLeaderboard(ledger);

      sorted.forEach((entry, idx) => {
        const rank = idx + 1;
        const cp = computeWeeklySeasonPointsForRank(rank, entry.cleared);
        const existing = aggMap.get(entry.uid);
        if (!existing) {
          aggMap.set(entry.uid, {
            uid: entry.uid,
            displayName: entry.displayName,
            seasonPoints: cp,
            weeksParticipated: 1,
            bestWeeklyScore: entry.bestScore,
            highestRank: rank,
            totalClears: entry.cleared ? 1 : 0,
            updatedAt: entry.updatedAt,
          });
        } else {
          existing.displayName = entry.displayName;
          existing.seasonPoints += cp;
          existing.weeksParticipated += 1;
          existing.bestWeeklyScore = Math.max(existing.bestWeeklyScore, entry.bestScore);
          existing.highestRank = Math.min(existing.highestRank, rank);
          existing.totalClears += entry.cleared ? 1 : 0;
          existing.updatedAt = Math.max(existing.updatedAt, entry.updatedAt);
        }

        if (user && entry.uid === user.uid) {
          const userAttemptIds = ledger.attemptsByUser[user.uid] ?? [];
          const submittedAttempts = userAttemptIds
            .map((id) => ledger.attempts[id])
            .filter((a): a is WeeklyBossAttemptRecord => Boolean(a && a.status === 'submitted'));
          const bestAttempt = submittedAttempts.sort(
            (a, b) => (b.verifiedScore ?? 0) - (a.verifiedScore ?? 0)
          )[0];

          playerHistory.push({
            weekId: wkId,
            bossName: bestAttempt?.seed ?? wkId,
            attemptId: bestAttempt?.attemptId ?? `best_${wkId}`,
            verifiedScore: entry.bestScore,
            damageDealt: entry.bestDamage,
            clearTimeMs: entry.bestClearTimeMs,
            cleared: entry.cleared,
            weekRank: rank,
            seasonPointsAwarded: cp,
            submittedAt: entry.updatedAt,
          });
        }
      });
    }

    const standings = Array.from(aggMap.values()).sort((a, b) => {
      if (b.seasonPoints !== a.seasonPoints) return b.seasonPoints - a.seasonPoints;
      if (b.bestWeeklyScore !== a.bestWeeklyScore) return b.bestWeeklyScore - a.bestWeeklyScore;
      return a.highestRank - b.highestRank;
    });

    if (!user) {
      return {
        season,
        serverNow: nowMs,
        authenticated: false,
        player: null,
        standings,
      };
    }

    const seasonClaims = this.store.seasonClaims ?? {};
    const myReceipts = Object.values(seasonClaims).filter(
      (c) => c.uid === user.uid && c.seasonId === season.seasonId
    );
    const myStandingIndex = standings.findIndex((s) => s.uid === user.uid);
    const myStanding = myStandingIndex >= 0 ? standings[myStandingIndex] : null;

    return {
      season,
      serverNow: nowMs,
      authenticated: true,
      player: {
        uid: user.uid,
        displayName: user.displayName,
        seasonPoints: myStanding?.seasonPoints ?? 0,
        seasonRank: myStandingIndex >= 0 ? myStandingIndex + 1 : null,
        weeksParticipated: myStanding?.weeksParticipated ?? 0,
        claimedSeasonTierIds: myReceipts.map((r) => r.tierId),
        receipts: myReceipts,
        history: playerHistory.sort((a, b) => b.submittedAt - a.submittedAt),
      },
      standings,
    };
  }

  /**
   * Idempotent Season Championship milestone claim (strictly verified human Season CP).
   */
  public claimSeasonReward(
    user: { uid: string; displayName: string },
    tierId: string,
    idempotencyKey?: string,
    nowMs = Date.now()
  ): {
    ok: true;
    alreadyClaimed: boolean;
    receipt: WeeklyBossSeasonClaimReceipt;
    claimedSeasonTierIds: string[];
  } {
    const seasonState = this.getSeasonState(user, nowMs);
    const { season } = seasonState;
    const tier = season.milestones.find((m) => m.tierId === tierId);
    if (!tier) {
      throw new WeeklyBossServiceError(
        404,
        'SEASON_TIER_NOT_FOUND',
        'Không tìm thấy mốc thưởng Mùa Giải.'
      );
    }

    if (!this.store.seasonClaims) this.store.seasonClaims = {};
    if (!this.store.seasonIdempotencyIndex) this.store.seasonIdempotencyIndex = {};

    const claimKey = `${season.seasonId}:${user.uid}:${tierId}`;
    const idemLookupKey = idempotencyKey
      ? `${season.seasonId}:${user.uid}:${idempotencyKey}`
      : null;

    const existingByIdem =
      idemLookupKey && this.store.seasonIdempotencyIndex[idemLookupKey]
        ? this.store.seasonClaims[this.store.seasonIdempotencyIndex[idemLookupKey]]
        : undefined;
    const existingClaim = existingByIdem ?? this.store.seasonClaims[claimKey];

    if (existingClaim) {
      const claimedSeasonTierIds = Object.values(this.store.seasonClaims)
        .filter((c) => c.uid === user.uid && c.seasonId === season.seasonId)
        .map((c) => c.tierId);
      return {
        ok: true,
        alreadyClaimed: true,
        receipt: existingClaim,
        claimedSeasonTierIds,
      };
    }

    const earnedCp = seasonState.player?.seasonPoints ?? 0;
    if (earnedCp < tier.minSeasonPoints) {
      throw new WeeklyBossServiceError(
        403,
        'SEASON_POINTS_NOT_MET',
        `Cần tối thiểu ${tier.minSeasonPoints} Điểm Mùa Giải (CP) để nhận mốc này (hiện có ${earnedCp} CP).`
      );
    }

    const receipt: WeeklyBossSeasonClaimReceipt = {
      claimKey,
      seasonId: season.seasonId,
      uid: user.uid,
      tierId: tier.tierId,
      claimedAt: nowMs,
      rewardTitleLabel: tier.rewardTitleLabel,
      rewardDynamicTitleId: tier.rewardDynamicTitleId,
      rewardFrameId: tier.rewardFrameId,
      rewardFrameName: tier.rewardFrameName,
      idempotencyKey,
    };

    this.store.seasonClaims[claimKey] = receipt;
    if (idemLookupKey) {
      this.store.seasonIdempotencyIndex[idemLookupKey] = claimKey;
    }
    this.persistStore();

    const claimedSeasonTierIds = Object.values(this.store.seasonClaims)
      .filter((c) => c.uid === user.uid && c.seasonId === season.seasonId)
      .map((c) => c.tierId);

    return {
      ok: true,
      alreadyClaimed: false,
      receipt,
      claimedSeasonTierIds,
    };
  }

  // ============================================================================
  // WAVE 5 — PILLAR 4: WEEKEND BLITZ COMPETITIVE EVENT (SERVER-AUTHORITATIVE)
  // ============================================================================

  private ensureWeekendLedger(eventId: string): WeekendBlitzEventLedger {
    if (!this.store.weekendEvents) {
      this.store.weekendEvents = {};
    }
    let ledger = this.store.weekendEvents[eventId];
    if (!ledger) {
      ledger = {
        eventId,
        attempts: {},
        attemptsByUser: {},
        leaderboard: {},
        claims: {},
        idempotencyIndex: {},
        auditLog: [],
      };
      this.store.weekendEvents[eventId] = ledger;
    }
    return ledger;
  }

  private getSortedWeekendLeaderboard(
    ledger: WeekendBlitzEventLedger
  ): WeeklyBossLeaderboardEntry[] {
    return Object.values(ledger.leaderboard)
      .sort((a, b) => {
        if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
        if (a.bestClearTimeMs !== null && b.bestClearTimeMs !== null) {
          return a.bestClearTimeMs - b.bestClearTimeMs;
        }
        return a.updatedAt - b.updatedAt;
      })
      .slice(0, 50);
  }

  public getWeekendBlitzState(
    user: { uid: string; displayName: string } | null,
    nowMs = Date.now()
  ): WeekendBlitzStateResponse {
    const schedule = getCurrentWeekendBlitzSchedule(nowMs);
    const ledger = this.ensureWeekendLedger(schedule.eventId);
    const leaderboard = this.getSortedWeekendLeaderboard(ledger);

    if (!user) {
      return {
        schedule,
        serverNow: nowMs,
        authenticated: false,
        player: null,
        leaderboard,
      };
    }

    const userAttemptIds = ledger.attemptsByUser[user.uid] ?? [];
    const activeAttempt = userAttemptIds
      .map((id) => ledger.attempts[id])
      .find((a) => a && a.status === 'active');
    const lbEntry = ledger.leaderboard[user.uid];
    const receipts = Object.values(ledger.claims)
      .filter((c) => c.uid === user.uid && c.eventId === schedule.eventId)
      .sort((a, b) => a.claimedAt - b.claimedAt);

    return {
      schedule,
      serverNow: nowMs,
      authenticated: true,
      player: {
        uid: user.uid,
        displayName: user.displayName,
        attemptsUsed: userAttemptIds.length,
        attemptsRemaining: Math.max(0, schedule.maxFreeAttempts - userAttemptIds.length),
        activeAttemptId: activeAttempt?.attemptId ?? null,
        bestScore: lbEntry?.bestScore ?? 0,
        bestClearTimeMs: lbEntry?.bestClearTimeMs ?? null,
        bestDamage: lbEntry?.bestDamage ?? 0,
        claimedTierIds: receipts.map((r) => r.tierId),
        receipts,
        bestSplitsMs: lbEntry?.bestSplitsMs ?? null,
        lastVerifiedAttemptId: lbEntry?.lastVerifiedAttemptId ?? null,
      },
      leaderboard,
      top1SplitsMs: leaderboard[0]?.bestSplitsMs ?? null,
    };
  }

  public startWeekendBlitzAttempt(
    user: { uid: string; displayName: string },
    nowMs = Date.now()
  ): {
    schedule: WeekendBlitzSchedule;
    attempt: WeeklyBossAttemptRecord;
    attemptsUsed: number;
    attemptsRemaining: number;
  } {
    const schedule = getCurrentWeekendBlitzSchedule(nowMs);
    const ledger = this.ensureWeekendLedger(schedule.eventId);
    const existingIds = ledger.attemptsByUser[user.uid] ?? [];

    const openAttempt = existingIds
      .map((id) => ledger.attempts[id])
      .find((a) => a && a.status === 'active');
    if (openAttempt) {
      return {
        schedule,
        attempt: openAttempt,
        attemptsUsed: existingIds.length,
        attemptsRemaining: Math.max(0, schedule.maxFreeAttempts - existingIds.length),
      };
    }

    if (existingIds.length >= schedule.maxFreeAttempts) {
      throw new WeeklyBossServiceError(
        403,
        'WEEKEND_ATTEMPTS_EXHAUSTED',
        `Bạn đã dùng hết ${schedule.maxFreeAttempts} lượt Sự Kiện Boss Cuối Tuần này.`
      );
    }

    const attemptId = `wba_${crypto.randomBytes(8).toString('hex')}`;
    const attempt: WeeklyBossAttemptRecord = {
      attemptId,
      weekId: schedule.eventId,
      uid: user.uid,
      displayName: user.displayName,
      seed: schedule.seed,
      startedAt: nowMs,
      status: 'active',
    };
    ledger.attempts[attemptId] = attempt;
    ledger.attemptsByUser[user.uid] = [...existingIds, attemptId];
    this.persistStore();

    return {
      schedule,
      attempt,
      attemptsUsed: ledger.attemptsByUser[user.uid].length,
      attemptsRemaining: Math.max(
        0,
        schedule.maxFreeAttempts - ledger.attemptsByUser[user.uid].length
      ),
    };
  }

  public submitWeekendBlitzAttempt(
    user: { uid: string; displayName: string },
    payload: SubmitAttemptPayload,
    nowMs = Date.now()
  ): SubmitAttemptResult & { seasonCpBonusAwarded: number } {
    const schedule = getCurrentWeekendBlitzSchedule(nowMs);
    const ledger = this.ensureWeekendLedger(schedule.eventId);
    const attempt = ledger.attempts[payload.attemptId];

    if (!attempt || attempt.uid !== user.uid) {
      throw new WeeklyBossServiceError(
        404,
        'ATTEMPT_NOT_FOUND',
        'Không tìm thấy phiên Boss Cuối Tuần hợp lệ.'
      );
    }
    if (attempt.status !== 'active') {
      throw new WeeklyBossServiceError(
        409,
        'ATTEMPT_ALREADY_FINALIZED',
        'Lượt Boss Cuối Tuần này đã được ghi nhận trước đó.'
      );
    }
    if (payload.autoPilotUsed) {
      attempt.status = 'rejected';
      attempt.rejectReason = 'Chế độ AI Tự Chơi không tính hạng Boss Cuối Tuần';
      this.persistStore();
      throw new WeeklyBossServiceError(
        422,
        'AUTOPILOT_NOT_RANKED',
        'Boss Cuối Tuần chỉ tính hạng cho lượt điều khiển thủ công.'
      );
    }
    if (payload.seed !== schedule.seed) {
      attempt.status = 'rejected';
      attempt.rejectReason = 'Seed sự kiện cuối tuần không khớp';
      this.persistStore();
      throw new WeeklyBossServiceError(
        422,
        'SEED_MISMATCH',
        'Mã seed sự kiện cuối tuần không khớp máy chủ.'
      );
    }

    const damageDealt = Number(payload.damageDealt);
    const simTicks = Math.floor(Number(payload.simTicks));
    const clearTimeMs = Math.floor(Number(payload.clearTimeMs));
    const remainingHpPct = Number(payload.remainingHpPct);
    const perfectDodges = Math.floor(Number(payload.perfectDodges));
    const simSeconds = simTicks / 60;
    const clearSeconds = clearTimeMs / 1000;
    const wallElapsedSec = Math.max(0, (nowMs - attempt.startedAt) / 1000);

    if (
      !Number.isFinite(damageDealt) ||
      damageDealt < 0 ||
      simTicks < 60 ||
      clearTimeMs < 1000 ||
      clearSeconds > schedule.timeLimitSec + 2 ||
      Math.abs(simSeconds - clearSeconds) > 1.5 ||
      clearSeconds > wallElapsedSec + 2.5
    ) {
      attempt.status = 'rejected';
      attempt.rejectReason = 'Thông số nhịp cố định hoặc thời gian thực không hợp lệ';
      this.persistStore();
      throw new WeeklyBossServiceError(
        422,
        'INVALID_SIM_TELEMETRY',
        'Dữ liệu lượt Boss Cuối Tuần không hợp lệ.'
      );
    }

    const maxPlausibleDps = computeMaxPlausibleDps();
    const observedDps = damageDealt / Math.max(1, simSeconds);
    if (observedDps > maxPlausibleDps || (payload.cleared && clearSeconds < 6)) {
      attempt.status = 'rejected';
      attempt.rejectReason = `DPS (${Math.round(observedDps)}) vượt ngưỡng chuẩn hóa`;
      this.persistStore();
      throw new WeeklyBossServiceError(
        422,
        'LOANER_DPS_EXCEEDED',
        'Sát thương vượt giới hạn bộ Sử Thi chuẩn hóa.'
      );
    }

    if (payload.cleared && damageDealt < schedule.bossMaxHp * 0.98) {
      attempt.status = 'rejected';
      attempt.rejectReason = 'Sát thương chưa đủ hạ Boss Cuối Tuần';
      this.persistStore();
      throw new WeeklyBossServiceError(
        422,
        'INCOMPLETE_CLEAR_DAMAGE',
        'Sát thương chưa đủ hạ Boss Cuối Tuần.'
      );
    }

    const verifiedScore = computeWeekendBlitzScore({
      cleared: Boolean(payload.cleared),
      damageDealt: Math.min(schedule.bossMaxHp, Math.round(damageDealt)),
      bossMaxHp: schedule.bossMaxHp,
      clearTimeMs,
      timeLimitSec: schedule.timeLimitSec,
      remainingHpPct: Math.max(0, Math.min(1, remainingHpPct)),
      perfectDodges: Math.max(0, Math.min(20, perfectDodges)),
      modifier: schedule.modifier,
    });

    attempt.status = 'submitted';
    attempt.submittedAt = nowMs;
    attempt.verifiedScore = verifiedScore;
    attempt.damageDealt = Math.min(schedule.bossMaxHp, Math.round(damageDealt));
    attempt.clearTimeMs = payload.cleared ? clearTimeMs : null;
    attempt.simTicks = simTicks;
    attempt.cleared = Boolean(payload.cleared);

    const prev = ledger.leaderboard[user.uid];
    const attemptsUsed = (ledger.attemptsByUser[user.uid] ?? []).length;
    const isBetter =
      !prev ||
      verifiedScore > prev.bestScore ||
      (verifiedScore === prev.bestScore &&
        payload.cleared &&
        (prev.bestClearTimeMs === null || clearTimeMs < prev.bestClearTimeMs));

    const sanitizedSplits =
      Array.isArray(payload.splitsMs) && payload.splitsMs.length === 4
        ? payload.splitsMs.map((v) =>
            v !== null && Number.isFinite(Number(v)) && Number(v) > 0
              ? Math.min(clearTimeMs, Math.round(Number(v)))
              : payload.cleared
              ? clearTimeMs
              : 0
          )
        : null;
    const counterHitsLanded = Math.max(0, Math.min(50, Math.floor(Number(payload.counterHitsLanded ?? 0))));
    const guardBreaksLanded = Math.max(0, Math.min(20, Math.floor(Number(payload.guardBreaksLanded ?? 0))));
    const peakStyleGrade = sanitizeStyleGrade(payload.peakStyleGrade) ?? prev?.peakStyleGrade;

    ledger.leaderboard[user.uid] = isBetter
      ? {
          uid: user.uid,
          displayName: user.displayName,
          bestScore: verifiedScore,
          bestClearTimeMs: payload.cleared ? clearTimeMs : prev?.bestClearTimeMs ?? null,
          bestDamage: Math.max(prev?.bestDamage ?? 0, attempt.damageDealt),
          cleared: Boolean(payload.cleared || prev?.cleared),
          attemptsUsed,
          updatedAt: nowMs,
          bestSplitsMs:
            sanitizedSplits && sanitizedSplits.every((v) => v > 0)
              ? sanitizedSplits
              : prev?.bestSplitsMs ?? null,
          counterHitsLanded,
          guardBreaksLanded,
          peakStyleGrade,
          lastVerifiedAttemptId: attempt.attemptId,
        }
      : {
          ...prev,
          displayName: user.displayName,
          attemptsUsed,
        };

    // Award verified Weekend Blitz score into Weekly Season eligibility if user hasn't scored yet this week
    const seasonCpBonusAwarded = payload.cleared ? schedule.seasonCpBonusOnClear : 10;
    const weekLedger = this.ensureWeekLedger(schedule.weekId);
    const existingWeekEntry = weekLedger.leaderboard[user.uid];
    if (!existingWeekEntry || verifiedScore > existingWeekEntry.bestScore) {
      weekLedger.leaderboard[user.uid] = {
        uid: user.uid,
        displayName: user.displayName,
        bestScore: Math.max(existingWeekEntry?.bestScore ?? 0, verifiedScore),
        bestClearTimeMs: payload.cleared
          ? clearTimeMs
          : existingWeekEntry?.bestClearTimeMs ?? null,
        bestDamage: Math.max(existingWeekEntry?.bestDamage ?? 0, attempt.damageDealt),
        cleared: Boolean(payload.cleared || existingWeekEntry?.cleared),
        attemptsUsed: existingWeekEntry?.attemptsUsed ?? 1,
        updatedAt: nowMs,
      };
    }

    this.persistStore();
    const sorted = this.getSortedWeekendLeaderboard(ledger);
    const rank = Math.max(1, sorted.findIndex((e) => e.uid === user.uid) + 1);

    this.onLeaderboardUpdated?.({
      weekId: schedule.eventId,
      uid: user.uid,
      displayName: user.displayName,
      rank,
      verifiedScore,
      cleared: Boolean(payload.cleared),
      leaderboard: sorted,
    });

    return {
      ok: true,
      attempt,
      verifiedScore,
      rank,
      attemptsRemaining: Math.max(0, schedule.maxFreeAttempts - attemptsUsed),
      leaderboard: sorted,
      seasonCpBonusAwarded,
    };
  }

  public claimWeekendBlitzReward(
    user: { uid: string; displayName: string },
    tierId: string,
    idempotencyKey?: string,
    nowMs = Date.now()
  ): {
    ok: true;
    alreadyClaimed: boolean;
    receipt: WeekendBlitzClaimReceipt;
    claimedTierIds: string[];
  } {
    const schedule = getCurrentWeekendBlitzSchedule(nowMs);
    const ledger = this.ensureWeekendLedger(schedule.eventId);
    const tier = schedule.rewardTiers.find((t) => t.tierId === tierId);

    if (!tier) {
      throw new WeeklyBossServiceError(
        404,
        'WEEKEND_TIER_NOT_FOUND',
        'Không tìm thấy mốc thưởng Boss Cuối Tuần.'
      );
    }

    const claimKey = `${schedule.eventId}:${user.uid}:${tierId}`;
    const idemLookupKey = idempotencyKey
      ? `${schedule.eventId}:${user.uid}:${idempotencyKey}`
      : null;

    const existingByIdem =
      idemLookupKey && ledger.idempotencyIndex[idemLookupKey]
        ? ledger.claims[ledger.idempotencyIndex[idemLookupKey]]
        : undefined;
    const existingClaim = existingByIdem ?? ledger.claims[claimKey];

    if (existingClaim) {
      const claimedTierIds = Object.values(ledger.claims)
        .filter((c) => c.uid === user.uid && c.eventId === schedule.eventId)
        .map((c) => c.tierId);
      return {
        ok: true,
        alreadyClaimed: true,
        receipt: existingClaim,
        claimedTierIds,
      };
    }

    const bestScore = ledger.leaderboard[user.uid]?.bestScore ?? 0;
    if (bestScore < tier.minScore) {
      throw new WeeklyBossServiceError(
        403,
        'SCORE_THRESHOLD_NOT_MET',
        `Cần tối thiểu ${tier.minScore.toLocaleString('vi-VN')} điểm xác minh Boss Cuối Tuần (hiện có ${bestScore.toLocaleString('vi-VN')}).`
      );
    }

    const receipt: WeekendBlitzClaimReceipt = {
      claimKey,
      eventId: schedule.eventId,
      uid: user.uid,
      tierId: tier.tierId,
      claimedAt: nowMs,
      rewardGems: tier.rewardGems,
      rewardEpicShards: tier.rewardEpicShards,
      rewardTitleLabel: tier.rewardTitleLabel,
      rewardFrameId: tier.rewardFrameId,
      rewardFrameName: tier.rewardFrameName,
      idempotencyKey,
    };

    ledger.claims[claimKey] = receipt;
    if (idemLookupKey) {
      ledger.idempotencyIndex[idemLookupKey] = claimKey;
    }
    this.persistStore();

    const claimedTierIds = Object.values(ledger.claims)
      .filter((c) => c.uid === user.uid && c.eventId === schedule.eventId)
      .map((c) => c.tierId);

    return {
      ok: true,
      alreadyClaimed: false,
      receipt,
      claimedTierIds,
    };
  }
}

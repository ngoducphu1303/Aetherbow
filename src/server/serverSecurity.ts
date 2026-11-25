import type { NextFunction, Request, Response } from 'express';

export const VERIFIED_ADMIN_EMAIL = 'ngoducphu1303@gmail.com';

export const WS_SECURITY_LIMITS = {
  maxPayloadBytes: 32 * 1024,
  generalMaxMsgsPer10s: 45,
  actionBurstMaxPer10s: 12,
  duelMinDurationSec: 1,
  duelMaxDurationSec: 3600,
  maxDuelDurationSec: 3600,
  guildBossMaxDamagePerHit: 25_000_000,
  maxGuildBossDamage: 25_000_000,
  bountyMaxPointsPerContribution: 5_000,
  maxBountyPoints: 5_000,
  guildWarMaxQuickScore: 800,
  guildWarMaxAssaultScore: 2_500,
  maxGuildWarScorePerAction: 2_500,
} as const;

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
  maxBuckets?: number;
}

export interface RateLimitVerdict {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

export class SlidingWindowRateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly maxBuckets: number;
  private readonly buckets = new Map<string, number[]>();

  constructor(options: RateLimitOptions) {
    this.maxRequests = Math.max(1, Math.floor(options.maxRequests));
    this.windowMs = Math.max(250, Math.floor(options.windowMs));
    this.maxBuckets = Math.max(64, Math.floor(options.maxBuckets ?? 2000));
  }

  public consume(key: string, nowMs = Date.now()): RateLimitVerdict {
    const cutoff = nowMs - this.windowMs;
    const prev = this.buckets.get(key) ?? [];
    const active = prev.filter((ts) => ts > cutoff);

    if (active.length >= this.maxRequests) {
      this.buckets.set(key, active);
      const oldest = active[0] ?? nowMs;
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(50, this.windowMs - (nowMs - oldest)),
      };
    }

    active.push(nowMs);
    this.buckets.set(key, active);
    this.pruneIfNeeded(cutoff);

    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - active.length),
      retryAfterMs: 0,
    };
  }

  public reset(key: string): void {
    this.buckets.delete(key);
  }

  private pruneIfNeeded(cutoff: number): void {
    if (this.buckets.size <= this.maxBuckets) return;
    for (const [k, list] of this.buckets.entries()) {
      const kept = list.filter((ts) => ts > cutoff);
      if (kept.length === 0) {
        this.buckets.delete(k);
      } else {
        this.buckets.set(k, kept);
      }
      if (this.buckets.size <= Math.floor(this.maxBuckets * 0.8)) break;
    }
  }
}

export type SecurityAnomalyCategory =
  | 'rate_limit'
  | 'ws_clamped'
  | 'auth_invalid'
  | 'admin_denied';

export interface SecurityAnomalyEvent {
  id: string;
  ts: number;
  category: SecurityAnomalyCategory;
  scope: string;
  actor: string;
  detail: string;
}

export interface SecurityAnomalySummary {
  totalRecorded: number;
  retainedCount: number;
  maxCapacity: number;
  countsByCategory: Record<SecurityAnomalyCategory, number>;
  lastEventAtMs: number | null;
}

/**
 * Bounded in-memory ring buffer tracking server security anomalies (429 rate limits,
 * clamped WS combat/score payloads, invalid Bearer tokens, and 403 admin denials).
 */
export class SecurityAnomalyTracker {
  private readonly maxCapacity: number;
  private readonly events: SecurityAnomalyEvent[] = [];
  private totalRecorded = 0;
  private seq = 0;
  private readonly counts: Record<SecurityAnomalyCategory, number> = {
    rate_limit: 0,
    ws_clamped: 0,
    auth_invalid: 0,
    admin_denied: 0,
  };

  constructor(maxCapacity = 200) {
    this.maxCapacity = Math.max(10, Math.min(1000, Math.floor(maxCapacity)));
  }

  public record(input: {
    category: SecurityAnomalyCategory;
    scope: string;
    actor?: string;
    detail: string;
    ts?: number;
  }): SecurityAnomalyEvent {
    const cleanActor = (input.actor || 'anonymous').replace(/[^\w.:@-]/g, '').slice(0, 48) || 'anonymous';
    const cleanScope = (input.scope || 'unknown').slice(0, 48);
    const cleanDetail = (input.detail || '').slice(0, 160);
    const event: SecurityAnomalyEvent = {
      id: `sec_${++this.seq}`,
      ts: typeof input.ts === 'number' && Number.isFinite(input.ts) ? input.ts : Date.now(),
      category: input.category,
      scope: cleanScope,
      actor: cleanActor,
      detail: cleanDetail,
    };
    this.totalRecorded += 1;
    this.counts[input.category] += 1;
    this.events.push(event);
    if (this.events.length > this.maxCapacity) {
      this.events.splice(0, this.events.length - this.maxCapacity);
    }
    return event;
  }

  public getRecent(limit = 30): SecurityAnomalyEvent[] {
    const safeLimit = Math.max(1, Math.min(this.maxCapacity, Math.floor(limit)));
    return this.events.slice(-safeLimit).reverse();
  }

  public getSummary(): SecurityAnomalySummary {
    const last = this.events.length > 0 ? this.events[this.events.length - 1].ts : null;
    return {
      totalRecorded: this.totalRecorded,
      retainedCount: this.events.length,
      maxCapacity: this.maxCapacity,
      countsByCategory: { ...this.counts },
      lastEventAtMs: last,
    };
  }
}

export function createApiRateLimitMiddleware(options: {
  scope: string;
  maxRequests: number;
  windowMs: number;
  onRateLimited?: (info: { scope: string; ip: string; retryAfterMs: number }) => void;
}) {
  const limiter = new SlidingWindowRateLimiter({
    maxRequests: options.maxRequests,
    windowMs: options.windowMs,
    maxBuckets: 4000,
  });

  return (req: Request, res: Response, next: NextFunction): void => {
    const forwarded = req.headers['x-forwarded-for'];
    const ipRaw =
      typeof forwarded === 'string'
        ? forwarded.split(',')[0]?.trim()
        : Array.isArray(forwarded)
        ? forwarded[0]?.trim()
        : req.ip || req.socket.remoteAddress || 'local';
    const safeIp = ipRaw || 'local';
    const bucketKey = `${options.scope}:${safeIp}`;
    const verdict = limiter.consume(bucketKey);
    res.setHeader('X-RateLimit-Remaining', String(verdict.remaining));
    if (!verdict.allowed) {
      options.onRateLimited?.({
        scope: options.scope,
        ip: safeIp,
        retryAfterMs: verdict.retryAfterMs,
      });
      res.setHeader('Retry-After', String(Math.ceil(verdict.retryAfterMs / 1000)));
      res.status(429).json({
        error: 'RATE_LIMITED',
        message: 'Bạn gửi yêu cầu quá nhanh. Vui lòng chờ giây lát và thử lại.',
      });
      return;
    }
    next();
  };
}

export function applySecurityHeadersMiddleware(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

export function isVerifiedAdminClaims(claims?: {
  email?: string | null;
  emailVerified?: boolean;
} | null): boolean {
  if (!claims || !claims.email) return false;
  return (
    claims.email.trim().toLowerCase() === VERIFIED_ADMIN_EMAIL &&
    claims.emailVerified === true
  );
}

function clampFinite(value: unknown, min: number, max: number, fallback = min): number {
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

export function clampWsDuelDurationSec(raw: unknown): number {
  return Math.round(
    clampFinite(
      raw,
      WS_SECURITY_LIMITS.duelMinDurationSec,
      WS_SECURITY_LIMITS.duelMaxDurationSec,
      30
    )
  );
}

export function clampWsGuildBossDamage(raw: unknown): number | null {
  const num = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(Math.min(WS_SECURITY_LIMITS.guildBossMaxDamagePerHit, num));
}

export function clampWsBountyPoints(raw: unknown): number | null {
  const num = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(Math.min(WS_SECURITY_LIMITS.bountyMaxPointsPerContribution, num));
}

export function clampWsGuildWarScore(raw: unknown, mode?: string): number {
  const cap =
    mode === 'quick_strike'
      ? WS_SECURITY_LIMITS.guildWarMaxQuickScore
      : mode === 'boss_rush'
      ? 3500
      : WS_SECURITY_LIMITS.guildWarMaxAssaultScore;
  return Math.round(clampFinite(raw, 0, cap, 0));
}

import type { NextFunction, Request, Response } from 'express';

export const VERIFIED_ADMIN_EMAIL = 'ngoducphu1303@gmail.com';

export const WS_SECURITY_LIMITS = {
  maxPayloadBytes: 32 * 1024,
  generalMaxMsgsPer10s: 45,
  actionBurstMaxPer10s: 12,
  maxDuelDurationSec: 3600,
  maxGuildBossDamage: 25_000_000,
  maxBountyPoints: 5_000,
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

export function createApiRateLimitMiddleware(options: {
  scope: string;
  maxRequests: number;
  windowMs: number;
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
    const bucketKey = `${options.scope}:${ipRaw || 'local'}`;
    const verdict = limiter.consume(bucketKey);
    res.setHeader('X-RateLimit-Remaining', String(verdict.remaining));
    if (!verdict.allowed) {
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
  return Math.round(clampFinite(raw, 1, WS_SECURITY_LIMITS.maxDuelDurationSec, 30));
}

export function clampWsGuildBossDamage(raw: unknown): number {
  return Math.round(clampFinite(raw, 0, WS_SECURITY_LIMITS.maxGuildBossDamage, 0));
}

export function clampWsBountyPoints(raw: unknown): number {
  return Math.round(clampFinite(raw, 0, WS_SECURITY_LIMITS.maxBountyPoints, 0));
}

export function clampWsGuildWarScore(raw: unknown, mode?: string): number {
  const cap = mode === 'boss_rush' ? 3500 : WS_SECURITY_LIMITS.maxGuildWarScorePerAction;
  return Math.round(clampFinite(raw, 0, cap, 0));
}

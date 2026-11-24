import type express from 'express';

export const AUTHORIZED_ADMIN_EMAILS: ReadonlySet<string> = new Set([
  'ngoducphu1303@gmail.com',
]);

export interface VerifiedAdminCheck {
  email?: string | null;
  emailVerified?: boolean | null;
}

export function isVerifiedAdminClaims(claims: VerifiedAdminCheck | null | undefined): boolean {
  if (!claims || typeof claims.email !== 'string') return false;
  if (claims.emailVerified !== true) return false;
  return AUTHORIZED_ADMIN_EMAILS.has(claims.email.trim().toLowerCase());
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
}

/**
 * Memory-safe sliding-window rate limiter with automatic stale bucket eviction.
 */
export class SlidingWindowRateLimiter {
  private readonly maxRequests: number;
  private readonly windowMs: number;
  private readonly maxBuckets: number;
  private readonly buckets = new Map<string, number[]>();

  constructor(options: { maxRequests: number; windowMs: number; maxBuckets?: number }) {
    this.maxRequests = Math.max(1, Math.floor(options.maxRequests));
    this.windowMs = Math.max(250, Math.floor(options.windowMs));
    this.maxBuckets = Math.max(64, Math.floor(options.maxBuckets ?? 2000));
  }

  public consume(key: string, nowMs = Date.now()): RateLimitResult {
    const cutoff = nowMs - this.windowMs;
    const prev = this.buckets.get(key) ?? [];
    const recent = prev.filter((ts) => ts > cutoff);

    if (recent.length >= this.maxRequests) {
      this.buckets.set(key, recent);
      const oldest = recent[0] ?? nowMs;
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: Math.max(50, oldest + this.windowMs - nowMs),
      };
    }

    recent.push(nowMs);
    this.buckets.set(key, recent);

    if (this.buckets.size > this.maxBuckets) {
      this.prune(nowMs);
    }

    return {
      allowed: true,
      remaining: Math.max(0, this.maxRequests - recent.length),
      retryAfterMs: 0,
    };
  }

  public reset(key: string): void {
    this.buckets.delete(key);
  }

  public prune(nowMs = Date.now()): void {
    const cutoff = nowMs - this.windowMs;
    for (const [k, list] of this.buckets.entries()) {
      const filtered = list.filter((ts) => ts > cutoff);
      if (filtered.length === 0) {
        this.buckets.delete(k);
      } else {
        this.buckets.set(k, filtered);
      }
    }
  }

  public getBucketCount(): number {
    return this.buckets.size;
  }
}

export function extractClientKey(req: express.Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const rawIp =
    typeof forwarded === 'string'
      ? forwarded.split(',')[0]?.trim()
      : Array.isArray(forwarded)
      ? forwarded[0]?.trim()
      : req.ip || req.socket?.remoteAddress || 'unknown';
  return (rawIp || 'unknown').slice(0, 64);
}

/**
 * Security response headers middleware compatible with embedded AI Studio iframe previews.
 */
export function applySecurityHeadersMiddleware(
  _req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
}

export function createApiRateLimitMiddleware(options: {
  maxRequests: number;
  windowMs: number;
  scope: string;
}): express.RequestHandler {
  const limiter = new SlidingWindowRateLimiter({
    maxRequests: options.maxRequests,
    windowMs: options.windowMs,
  });

  return (req, res, next) => {
    const key = `${options.scope}:${extractClientKey(req)}`;
    const verdict = limiter.consume(key);
    res.setHeader('X-RateLimit-Limit', String(options.maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(verdict.remaining));
    if (!verdict.allowed) {
      const retrySec = Math.max(1, Math.ceil(verdict.retryAfterMs / 1000));
      res.setHeader('Retry-After', String(retrySec));
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau giây lát.',
        retryAfterSec: retrySec,
      });
      return;
    }
    next();
  };
}

// ============================================================================
// WEBSOCKET ANTI-CHEAT VALUE BOUNDS & ACTION COOLDOWNS
// ============================================================================

export const WS_SECURITY_LIMITS = {
  maxPayloadBytes: 32 * 1024, // 32 KiB per WebSocket frame
  generalMaxMsgsPer10s: 60,
  actionBurstMaxPer10s: 12,
  chatCooldownMs: 700,
  guildBossAttackCooldownMs: 1200,
  guildBossMaxDamagePerHit: 250_000,
  bountyContributeCooldownMs: 1000,
  bountyMaxPointsPerContribution: 12_000,
  guildWarStrikeCooldownMs: 1200,
  guildWarMaxQuickScore: 95,
  guildWarMaxAssaultScore: 260,
  duelMinDurationSec: 3,
  duelMaxDurationSec: 300,
  spectatorNextMatchCooldownMs: 2500,
} as const;

export function clampWsGuildBossDamage(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(1, Math.min(WS_SECURITY_LIMITS.guildBossMaxDamagePerHit, Math.round(n)));
}

export function clampWsBountyPoints(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.max(1, Math.min(WS_SECURITY_LIMITS.bountyMaxPointsPerContribution, Math.round(n)));
}

export function clampWsGuildWarScore(
  raw: unknown,
  mode: 'quick_strike' | 'assault_3d'
): number {
  const defaultVal = mode === 'assault_3d' ? 145 : 65;
  const cap =
    mode === 'assault_3d'
      ? WS_SECURITY_LIMITS.guildWarMaxAssaultScore
      : WS_SECURITY_LIMITS.guildWarMaxQuickScore;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return defaultVal;
  return Math.max(10, Math.min(cap, Math.round(n)));
}

export function clampWsDuelDurationSec(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 15;
  return Math.max(
    WS_SECURITY_LIMITS.duelMinDurationSec,
    Math.min(WS_SECURITY_LIMITS.duelMaxDurationSec, Math.round(n))
  );
}

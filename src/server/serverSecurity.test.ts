import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampWsBountyPoints,
  clampWsDuelDurationSec,
  clampWsGuildBossDamage,
  clampWsGuildWarScore,
  isVerifiedAdminClaims,
  SecurityAnomalyTracker,
  SlidingWindowRateLimiter,
  VERIFIED_ADMIN_EMAIL,
  WS_SECURITY_LIMITS,
} from './serverSecurity';

test('SecurityAnomalyTracker: enforces bounded ring buffer and tallies categories accurately', () => {
  const tracker = new SecurityAnomalyTracker(10);

  for (let i = 0; i < 15; i++) {
    tracker.record({
      category: i % 2 === 0 ? 'rate_limit' : 'ws_clamped',
      scope: 'test-scope',
      actor: `192.168.1.${i}`,
      detail: `event ${i}`,
      ts: 1000 + i,
    });
  }
  tracker.record({
    category: 'admin_denied',
    scope: 'admin-api',
    actor: 'intruder@example.com',
    detail: '403 denied',
    ts: 2000,
  });

  const summary = tracker.getSummary();
  assert.equal(summary.maxCapacity, 10);
  assert.equal(summary.retainedCount, 10, 'Ring buffer must never exceed maxCapacity');
  assert.equal(summary.totalRecorded, 16);
  assert.equal(summary.countsByCategory.rate_limit, 8);
  assert.equal(summary.countsByCategory.ws_clamped, 7);
  assert.equal(summary.countsByCategory.admin_denied, 1);
  assert.equal(summary.countsByCategory.auth_invalid, 0);
  assert.equal(summary.lastEventAtMs, 2000);

  const recent = tracker.getRecent(3);
  assert.equal(recent.length, 3);
  assert.equal(recent[0].category, 'admin_denied');
  assert.equal(recent[0].ts, 2000);
});

test('ServerSecurity: clamps WS combat/score payloads, verifies admin claims, and enforces sliding rate limits', () => {
  assert.equal(clampWsDuelDurationSec(999999), WS_SECURITY_LIMITS.maxDuelDurationSec);
  assert.equal(clampWsDuelDurationSec(-5), 1);
  assert.equal(clampWsDuelDurationSec(NaN), 30);

  assert.equal(clampWsGuildBossDamage(999_999_999), WS_SECURITY_LIMITS.maxGuildBossDamage);
  assert.equal(clampWsGuildBossDamage(-100), 0);

  assert.equal(clampWsBountyPoints(999_999), WS_SECURITY_LIMITS.maxBountyPoints);
  assert.equal(clampWsGuildWarScore(999_999, 'boss_rush'), 3500);
  assert.equal(clampWsGuildWarScore(999_999, 'quick_strike'), WS_SECURITY_LIMITS.maxGuildWarScorePerAction);

  assert.equal(isVerifiedAdminClaims({ email: VERIFIED_ADMIN_EMAIL, emailVerified: true }), true);
  assert.equal(isVerifiedAdminClaims({ email: VERIFIED_ADMIN_EMAIL, emailVerified: false }), false);
  assert.equal(isVerifiedAdminClaims({ email: 'other@example.com', emailVerified: true }), false);

  const limiter = new SlidingWindowRateLimiter({ maxRequests: 2, windowMs: 1000 });
  assert.equal(limiter.consume('ip1', 1000).allowed, true);
  assert.equal(limiter.consume('ip1', 1100).allowed, true);
  const blocked = limiter.consume('ip1', 1200);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterMs >= 50);
  assert.equal(limiter.consume('ip1', 2100).allowed, true);
});

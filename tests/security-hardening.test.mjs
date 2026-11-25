import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SlidingWindowRateLimiter,
  applySecurityHeadersMiddleware,
  clampWsBountyPoints,
  clampWsDuelDurationSec,
  clampWsGuildBossDamage,
  clampWsGuildWarScore,
  isVerifiedAdminClaims,
  WS_SECURITY_LIMITS,
} from '../src/server/serverSecurity.ts';
import { validateAndSanitizeSaveIntegrity } from '../src/data/saveIntegrity.ts';
import { createInitialSaveData } from '../src/data/gearData.ts';
import { GearSlot, Rarity } from '../src/types/game.ts';

test('Security: SlidingWindowRateLimiter enforces per-window quota and recovers after window expiry', () => {
  const limiter = new SlidingWindowRateLimiter({ maxRequests: 3, windowMs: 1000 });
  const t0 = 10_000;
  assert.equal(limiter.consume('ip1', t0).allowed, true);
  assert.equal(limiter.consume('ip1', t0 + 100).allowed, true);
  assert.equal(limiter.consume('ip1', t0 + 200).allowed, true);

  const blocked = limiter.consume('ip1', t0 + 300);
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.retryAfterMs >= 650);

  // Separate client remains unaffected
  assert.equal(limiter.consume('ip2', t0 + 300).allowed, true);

  // Recovers cleanly once earliest request falls out of window
  const recovered = limiter.consume('ip1', t0 + 1050);
  assert.equal(recovered.allowed, true);
});

test('Security: Verified admin claim checker strictly requires verified email match', () => {
  assert.equal(
    isVerifiedAdminClaims({ email: 'ngoducphu1303@gmail.com', emailVerified: true }),
    true
  );
  assert.equal(
    isVerifiedAdminClaims({ email: 'NGODUCPHU1303@GMAIL.COM', emailVerified: true }),
    true
  );
  assert.equal(
    isVerifiedAdminClaims({ email: 'ngoducphu1303@gmail.com', emailVerified: false }),
    false
  );
  assert.equal(
    isVerifiedAdminClaims({ email: 'attacker@example.com', emailVerified: true }),
    false
  );
  assert.equal(isVerifiedAdminClaims(null), false);
});

test('Security: WebSocket anti-cheat bounds clamp abnormal damage, bounty, guild war score, and duel duration', () => {
  assert.equal(clampWsGuildBossDamage(-500), null);
  assert.equal(clampWsGuildBossDamage(Number.NaN), null);
  assert.equal(clampWsGuildBossDamage(999_999_999), WS_SECURITY_LIMITS.guildBossMaxDamagePerHit);
  assert.equal(clampWsGuildBossDamage(42_500), 42_500);

  assert.equal(clampWsBountyPoints(0), null);
  assert.equal(clampWsBountyPoints(500_000), WS_SECURITY_LIMITS.bountyMaxPointsPerContribution);
  assert.equal(clampWsBountyPoints(450), 450);

  assert.equal(clampWsGuildWarScore(99_999, 'quick_strike'), WS_SECURITY_LIMITS.guildWarMaxQuickScore);
  assert.equal(clampWsGuildWarScore(99_999, 'assault_3d'), WS_SECURITY_LIMITS.guildWarMaxAssaultScore);
  assert.equal(clampWsGuildWarScore(240, 'assault_3d'), 240);

  assert.equal(clampWsDuelDurationSec(0), WS_SECURITY_LIMITS.duelMinDurationSec);
  assert.equal(clampWsDuelDurationSec(9999), WS_SECURITY_LIMITS.duelMaxDurationSec);
});

test('Security: iframe-compatible security headers middleware sets nosniff and referrer policy without blocking iframe embedding', () => {
  const headers = new Map();
  let nextCalled = false;
  applySecurityHeadersMiddleware(
    {},
    {
      setHeader(k, v) {
        headers.set(k, v);
      },
    },
    () => {
      nextCalled = true;
    }
  );
  assert.equal(nextCalled, true);
  assert.equal(headers.get('X-Content-Type-Options'), 'nosniff');
  assert.equal(headers.get('Referrer-Policy'), 'strict-origin-when-cross-origin');
  assert.equal(headers.has('X-Frame-Options'), false, 'Must remain compatible with AI Studio iframe');
});

test('Security: Save integrity sanitizer neutralizes NaN/negative/overflow values & duplicate UIDs while preserving legitimate legacy saves', () => {
  const legacy = createInitialSaveData();
  legacy.gold = 125_400;
  legacy.gems = 4_820;
  legacy.highestChapterCleared = 9;
  const cleanReport = validateAndSanitizeSaveIntegrity(legacy);
  assert.equal(cleanReport.repairs.length, 0);
  assert.equal(cleanReport.sanitizedSave.gold, 125_400);
  assert.equal(cleanReport.sanitizedSave.gems, 4_820);
  assert.equal(cleanReport.sanitizedSave.highestChapterCleared, 9);

  // Corrupted / tampered payload
  const corrupted = structuredClone(legacy);
  corrupted.gold = Number.NaN;
  corrupted.gems = -9999;
  corrupted.starDust = 999_999_999_999;
  corrupted.highestChapterCleared = 42;
  const dupItem = { ...corrupted.inventory[0] };
  corrupted.inventory.push(dupItem);
  corrupted.equipped[GearSlot.RING] = 'non_existent_uid_999';

  const fixed = validateAndSanitizeSaveIntegrity(corrupted);
  assert.ok(fixed.repairs.length >= 5);
  assert.equal(fixed.sanitizedSave.gold, 0);
  assert.equal(fixed.sanitizedSave.gems, 0);
  assert.ok(fixed.sanitizedSave.starDust <= 50_000_000);
  assert.equal(fixed.sanitizedSave.highestChapterCleared, 12);
  assert.equal(
    new Set(fixed.sanitizedSave.inventory.map((g) => g.uid)).size,
    fixed.sanitizedSave.inventory.length,
    'Duplicate inventory UIDs must be deduplicated'
  );
  assert.equal(fixed.sanitizedSave.equipped[GearSlot.RING], undefined, 'Dangling equipped UID must be cleared');
  assert.ok(
    fixed.sanitizedSave.inventory.every((g) => Object.values(Rarity).includes(g.rarity)),
    'All surviving items must have valid rarity'
  );

  // Corrupted chapterMilestones must be sanitized without breaking legitimate progress
  const badMilestones = structuredClone(legacy);
  badMilestones.chapterMilestones = {
    2: { chapterId: 2, clears: -5, starsEarned: [1, 99, 2, 2, -1], bestEndHpRatio: 4.5 },
    999: { chapterId: 999, clears: 1, starsEarned: [1] },
  };
  const fixedMs = validateAndSanitizeSaveIntegrity(badMilestones);
  assert.ok(fixedMs.repairs.length >= 3);
  assert.equal(fixedMs.sanitizedSave.chapterMilestones?.[2]?.clears, 0);
  assert.deepEqual(fixedMs.sanitizedSave.chapterMilestones?.[2]?.starsEarned, [1, 2]);
  assert.equal(fixedMs.sanitizedSave.chapterMilestones?.[999], undefined);
});

test('Security PoC: Asset deploy admin authorization rejects unlinked password accounts and requires Worker session confirmation', async () => {
  const { verifyAssetAdminAuthorization } = await import('../src/server/assetDeployService.ts');

  // Attack PoC: password account with puugoo email that is NOT linked in Worker must be rejected
  const unlinkedPasswordAllowed = await verifyAssetAdminAuthorization({
    decoded: {
      email: 'puugoo@aetherbow.local',
      email_verified: false,
      firebase: { sign_in_provider: 'password' },
    },
    token: 'forged-or-unlinked-token',
    allowedPasswordEmail: 'puugoo@aetherbow.local',
    verifyWorkerSession: async () => false,
  });
  assert.equal(
    unlinkedPasswordAllowed,
    false,
    'Unlinked password admin must NEVER pass asset deploy authorization'
  );

  // Legitimate linked password admin confirmed by Worker session passes
  const linkedPasswordAllowed = await verifyAssetAdminAuthorization({
    decoded: {
      email: 'puugoo@aetherbow.local',
      email_verified: false,
      firebase: { sign_in_provider: 'password' },
    },
    token: 'linked-worker-token',
    allowedPasswordEmail: 'puugoo@aetherbow.local',
    verifyWorkerSession: async () => true,
  });
  assert.equal(linkedPasswordAllowed, true);

  // Verified Google owner passes directly
  const verifiedGoogleOwner = await verifyAssetAdminAuthorization({
    decoded: {
      email: 'ngoducphu1303@gmail.com',
      email_verified: true,
      firebase: { sign_in_provider: 'google.com' },
    },
    token: 'owner-token',
    verifyWorkerSession: async () => false,
  });
  assert.equal(verifiedGoogleOwner, true);

  // Unverified Google account or random user is denied
  const unverifiedGoogle = await verifyAssetAdminAuthorization({
    decoded: {
      email: 'ngoducphu1303@gmail.com',
      email_verified: false,
      firebase: { sign_in_provider: 'google.com' },
    },
    token: 'unverified-token',
    verifyWorkerSession: async () => true,
  });
  assert.equal(unverifiedGoogle, false);
});


# Firestore Security Specification — Artemis 3D

## 1. Data Invariants

1. **Strict Owner Isolation (`/players/{uid}`)**: Only an authenticated user whose `request.auth.uid == uid` may `get`, `create`, or `update` their own player document. Collection-wide `list` and `delete` operations are unconditionally denied.
2. **PII Isolation (`/leaderboard/{uid}`, `/boss_race_entries/{entryId}`, `/season_standings/{standingId}`)**: Public competitive entries contain zero PII (`email`, `username`, `phone`, `address`). Public reads (`get` and `list`) strictly require `resource.data.isPublic == true`. Writes require `request.auth.uid == data.uid` and composite ID binding (`{weekId}_{uid}` / `{seasonId}_{uid}`).
3. **Immutable Identity & Timestamps**: `uid`, `weekId`, `seasonId`, and `createdAt` can never be changed after creation. `createdAt == request.time` on `create` and `updatedAt == request.time` on both `create` and `update`.
4. **Monotonic Competitive Integrity & Action-Based Updates**: Every `create` checks both `hasAll` and `hasOnly`. Every `update` invokes `isValid[Entity](incoming(), ...)` first, enforces non-decreasing high scores (`bestScore >= existing().bestScore`, `seasonPoints >= existing().seasonPoints`), and explicitly allowlists mutable keys via `incoming().diff(existing()).affectedKeys().hasOnly(...)`.
5. **Path Hardening, Resource Bounds & Total Array Guarding**: Every single-doc operation validates `isValidId(...)` (`<= 128` chars, `^[a-zA-Z0-9_\-]+$`). Every string enforces `.size()` bounds, every number enforces numeric bounds, and `claimedMilestones` enforces `.size() <= 20` with first-element type checking.
6. **Verified Asset Admin RBAC (`/asset_admins/{uid}`)**: Only the verified Google owner (`request.auth.token.email == 'puugoo002@gmail.com' && request.auth.token.email_verified == true`) may create, update, or delete `/asset_admins/{uid}` records. Collection-wide `list` is unconditionally denied; `get` is limited to the target UID owner or the Google owner.
7. **Public Read-Only Asset Inbox Mirror (`/asset_inbox/{assetId}`)**: Public `get` and `list` require `resource.data.isPublic == true` and contain zero PII (only public CDN GLB path metadata). Writes (`create`, `update`, `delete`) require `isAssetAdmin()` (verified Google owner or UID present in `/asset_admins/{uid}`) with strict UUIDv4 ID binding, `.glb` path/name regex validation, size bounds (`24..120000000`), immutable `id`/`path`/`createdAt`, and server timestamps.

## 2. The "Dirty Dozen" + Asset Inbox Adversarial Payloads (Must Return PERMISSION_DENIED)

1. **Cross-User Private Read**: User B attempts `get(/players/userA)` -> DENIED (`request.auth.uid != uid`).
2. **Private Collection Scraping**: Any user attempts `list(/players)` -> DENIED (`allow list: if false`).
3. **Identity Spoofing on Create**: User A attempts to create `/players/userA` with `uid: "userB"` -> DENIED (`data.uid == request.auth.uid`).
4. **Shadow Field Injection on Create**: User A includes `"isAdmin": true` in `/players/userA` or `/boss_race_entries/2026-W47_userA` -> DENIED (`data.keys().hasOnly(...)`).
5. **Shadow Update Injection**: User A updates `/season_standings/S01_userA` with extra field `"role": "superadmin"` -> DENIED (`affectedKeys().hasOnly(...)`).
6. **Immutable Field Tampering**: User A updates `/boss_race_entries/2026-W47_userA` and mutates `weekId` or `createdAt` -> DENIED (`incoming().weekId == existing().weekId && incoming().createdAt == existing().createdAt`).
7. **Forged Client Timestamp**: User A sets `updatedAt` to a past client timestamp instead of `request.time` -> DENIED (`incoming().updatedAt == request.time`).
8. **ID Poisoning & Composite Key Spoofing**: User A writes `/boss_race_entries/2026-W47_userB` or a 200-char ID -> DENIED (`isValidId(entryId)` & `entryId == data.weekId + '_' + data.uid`).
9. **Value Poisoning (Oversized String / Invalid Enum)**: User A writes `rankTier: "godmode"` or 500-char `displayName` -> DENIED (`data.rankTier in [...]` & `size() <= 24`).
10. **Cross-User Competitive Hijack**: User B attempts to overwrite `/leaderboard/userA` or `/season_standings/S01_userA` -> DENIED (`existing().uid == request.auth.uid`).
11. **Unfiltered Non-Public Query**: Client attempts `list(/boss_race_entries)` or `list(/season_standings)` or `list(/asset_inbox)` without `where('isPublic', '==', true)` -> DENIED (`resource.data.isPublic == true`).
12. **Array Exhaustion & Score Tampering**: User A writes `claimedMilestones` with 50 items or decreases `bestScore` below `existing().bestScore` or injects negative `seasonPoints` -> DENIED (Total Array Guard + monotonic & numeric bounds).
13. **Admin Self-Escalation**: A regular authenticated player attempts `create(/asset_admins/myUid)` or `list(/asset_admins)` -> DENIED (`isGoogleAssetAdmin()` required & `allow list: if false`).
14. **Unverified Email Spoofing**: An account with `email == 'puugoo002@gmail.com'` and `email_verified == false` attempts to write `/asset_inbox/{id}` -> DENIED (`request.auth.token.email_verified == true` required).
15. **Path Traversal / Non-GLB Poisoning**: An admin client attempts to write `/asset_inbox/{id}` with `path: "/assets/../secret.txt"` or `group: "admin"` -> DENIED (strict path regex & group enum).

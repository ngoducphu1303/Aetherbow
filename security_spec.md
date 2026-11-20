# Firestore Security Specification — Artemis 3D

## 1. Data Invariants

1. **Strict Owner Isolation (`/players/{uid}`)**: Only an authenticated user whose `request.auth.uid == uid` may `get`, `create`, or `update` their own player document. Collection-wide `list` and `delete` operations are unconditionally denied.
2. **PII Isolation (`/leaderboard/{uid}`)**: Public leaderboard entries contain zero PII (`email`, `username`, `phone`, `address`). Public reads (`get` and `list`) strictly require `resource.data.isPublic == true`. Writes require `request.auth.uid == uid`.
3. **Immutable Identity & Timestamps**: `uid` and `createdAt` can never be changed after creation. `createdAt == request.time` on `create` and `updatedAt == request.time` on both `create` and `update`.
4. **Action-Based Updates & Strict Allowlists**: Every `create` checks both `hasAll` and `hasOnly`. Every `update` invokes `isValid[Entity](incoming())` first and explicitly allowlists mutable keys via `incoming().diff(existing()).affectedKeys().hasOnly(...)`.
5. **Path Hardening & Resource Bounds**: Every single-doc operation validates `isValidId(uid)` (`<= 128` chars, `^[a-zA-Z0-9_\-]+$`). Every string enforces `.size()` bounds and every number enforces numeric bounds.

## 2. The "Dirty Dozen" Adversarial Payloads (Must Return PERMISSION_DENIED)

1. **Cross-User Private Read**: User B attempts `get(/players/userA)` -> DENIED (`request.auth.uid != uid`).
2. **Private Collection Scraping**: Any user attempts `list(/players)` -> DENIED (`allow list: if false`).
3. **Identity Spoofing on Create**: User A attempts to create `/players/userA` with `uid: "userB"` -> DENIED (`data.uid == request.auth.uid`).
4. **Shadow Field Injection on Create**: User A includes `"isAdmin": true` in `/players/userA` -> DENIED (`data.keys().hasOnly(...)`).
5. **Shadow Update Injection**: User A updates `/players/userA` with extra field `"role": "superadmin"` -> DENIED (`affectedKeys().hasOnly(...)`).
6. **Immutable `createdAt` Tampering**: User A updates `/players/userA` and changes `createdAt` -> DENIED (`incoming().createdAt == existing().createdAt`).
7. **Forged Client Timestamp**: User A sets `updatedAt` to a past client timestamp instead of `request.time` -> DENIED (`incoming().updatedAt == request.time`).
8. **ID Poisoning**: Attacker writes to `/players/../../admin$bad` or a 200-char ID -> DENIED (`isValidId(uid)`).
9. **Value Poisoning (Oversized String)**: User A sets `displayName` to a 500-char string -> DENIED (`data.displayName.size() <= 24`).
10. **Leaderboard Cross-User Hijack**: User B attempts to overwrite `/leaderboard/userA` -> DENIED (`isOwner(uid)`).
11. **Leaderboard Private Leak / Non-Public Query**: Client attempts `list(/leaderboard)` without `where('isPublic', '==', true)` -> DENIED (`existing().isPublic == true`).
12. **Leaderboard Value Poisoning (Negative/Infinite Power)**: User A writes `powerRating: -999` or `powerRating: "infinite"` -> DENIED (`data.powerRating is number && data.powerRating >= 0 && data.powerRating <= 1000000000`).

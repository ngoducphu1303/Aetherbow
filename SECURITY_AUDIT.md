# SECURITY AUDIT — BÁO CÁO KIỂM TOÁN BẢO MẬT & CHỐNG GIAN LẬN

- **Phạm vi kiểm toán**: `firestore.rules`, `firebase-blueprint.json`, `server.ts`, `src/server/serverSecurity.ts`, `src/data/runIntegrityVerifier.ts`, `src/data/gearSetTransmutation.ts`, `src/data/wave16TacticalAndLiveOps.ts`, `src/data/wave17EndgameAndBackup.ts`, `src/engine/wave17CombatAndPractice.ts`, `src/engine/wave18TacticalAndAtmosphere.ts`, `src/server/weeklyBossService.ts`, `src/data/saveIntegrity.ts`, `src/data/liveOpsConfig.ts`, `src/components/AssetAdminLiveOpsTab.tsx`, và `.env.example`.
- **Trạng thái chung**: **AN TOÀN CAO (Đợt 18)** — 0 thay đổi & 0 lỗi ESLint trên `firestore.rules` (đã deploy live lên Firestore), 0 bí mật lộ phía client, đầy đủ Rate Limit + WS Clamp + Admin Auth + Xác Thực Kết Quả Trận Đấu (`POST /api/runs/verify`, bổ sung biên thẩm quyền **Khế Ước Hoàng Đạo `zodiacVowGoldMult`** khóa cứng `1.0×` ở Ch.1 và kẹp trần `1.0..1.7` trên Ch.2–12/Tháp) & Chống Phát Lại Nonce (`RunNonceReplayGuard`) + lọc trắng `sanitizeZodiacVowsForRun`, `transmutedSetId` & `GearInstance.mythicImprint` + khóa cứng 0-Farm cho Luyện Boss 12 Cung + Cố Vấn Đầu Tư LC & Trung Tâm Kiểm Định Tài Nguyên 12 Chương chỉ-đọc (`702 LC` bất biến) + Kho Sao Lưu Cuốn Chiếu 5 Mốc kiểm chứng FNV-1a + Giám sát 5 nhóm Bất thường An ninh.

---

## 1. Kiểm Toán Firestore Security Rules (`firestore.rules` — Đã Deploy Live)

- **Kết quả kiểm định tự động**: `npx eslint firestore.rules` → **`0 errors, 0 warnings`**.
- **Nguyên tắc cốt lõi**: Mặc định từ chối toàn cục (`match /{document=**} { allow read, write: if false; }`), chỉ mở đúng **7 blueprint** có kiểm duyệt kiểu dữ liệu, độ dài chuỗi, giới hạn số và sở hữu UID:
  1. `players/{uid}`: Chỉ chủ tài khoản (`request.auth.uid == uid`) được đọc/ghi hồ sơ lưu riêng; kiểm duyệt cấu trúc hợp lệ.
  2. `leaderboard/{uid}`: Đọc công khai, chỉ chủ UID được cập nhật mục của mình trong biên hợp lệ.
  3. `boss_race_entries/{entryId}`: Kiểm duyệt chặt điểm số & danh tính người chơi.
  4. `season_standings/{seasonId}`: Bảo vệ thứ hạng mùa giải.
  5. `liveops_config/{docId}`: Đọc công khai cho client đồng bộ sự kiện; chỉ Admin xác thực được ghi trong biên an toàn (`LIVEOPS_BOUNDS`), bao gồm kiểm định cửa sổ hẹn giờ tự động **P2-4b** (`scheduledStartMs`, `scheduledEndMs` không âm và bắt buộc `scheduledEndMs == 0 || scheduledEndMs >= scheduledStartMs`).
  6. `asset_admins/{uid}`: Kiểm soát danh sách quản trị viên tài sản.
  7. `asset_inbox/{itemId}`: Chỉ quản trị viên xác thực xử lý hàng đợi tài sản 3D.

---

## 2. Bảo Mật Backend Express & WebSocket (`server.ts`, `serverSecurity.ts`)

| Lớp phòng vệ | Cơ chế triển khai | Trạng thái |
|---|---|---|
| **HTTP Security Headers** | `applySecurityHeadersMiddleware` gắn `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-DNS-Prefetch-Control: off`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. | Đã xác minh |
| **Sliding Window Rate Limit** | Giới hạn theo IP cho `/api/weekly-boss` (60/phút), `/api/liveops` (60/phút), `/api/admin/security-anomalies` (60/phút), `/api/live-ai/snapshot` (120/phút), `/api/assets` (240/phút) + chống burst hành động WS (`12/10s`, tổng `45/10s`). | Đã xác minh (`tests/security-hardening.test.mjs`) |
| **Kẹp Trần & Từ Chối Payload WS Không Hợp Lệ** | `duel:complete` (`1..3600s`), `guild_boss:attack` (từ chối `null` nếu `<= 0` hoặc `NaN`, kẹp trần `25,000,000`), `bounty:contribute` (từ chối `null` nếu `<= 0`, kẹp trần `5,000`), `guild_war:strike` (`2,500` quick / `3,500` assault) và giới hạn gói ≤ 32 KB. | Đã xác minh (`tests/security-hardening.test.mjs`) |
| **Xác Thực Admin Hai Lớp** | Kiểm tra `resolveBearerUser(req)` (Firebase Admin SDK verify ID Token) kết hợp `isVerifiedAdminClaims` / `isVerifiedAdminIdentity` (`emailVerified === true` khớp `VERIFIED_ADMIN_EMAIL`) hoặc `verifyWorkerAdminSession`. | Đã xác minh |
| **Giám Sát Bất Thường (5 Danh Mục)** | `SecurityAnomalyTracker` (ring buffer giới hạn cứng **200 sự kiện**, 0 rò rỉ RAM) tự động ghi nhận `rate_limit` (429), `ws_clamped`, `auth_invalid` (401), `admin_denied` (403) và **`run_integrity_flagged` (Đợt 14)**; hiển thị đủ 5 thẻ KPI trên bảng Admin đọc-duy-nhất qua `GET /api/admin/security-anomalies` (`Cache-Control: no-store`). | Đã xác minh (`wave14Overhaul.test.ts` W14-4b) |
| **Xác Thực Kết Quả Trận Đấu & Chống Phát Lại (Đợt 14)** | `POST /api/runs/verify` (`verifyCombatRunIntegrity` + `RunNonceReplayGuard` tối đa `2,000` nonce / TTL `6h`) tự tính lại biên thời lượng, DPS, Vàng/Ngọc/Season XP dựa trên cấu hình LiveOps thẩm quyền của server (`readServerLiveOpsConfig`), kẹp trần khi tràn thưởng, từ chối tốc độ/DPS phi lý hoặc gửi lại nonce cũ, và ghi nhận mọi vi phạm vào `run_integrity_flagged`. Client chạy đồng bộ cùng bộ kiểm định trước khi ghi thưởng và tự bỏ qua HTTP call trên SPA tĩnh (`!shouldSkipNodeApiEndpoints()`). | Đã xác minh (`wave14Overhaul.test.ts` W14-4a/b) |

---

## 3. Gia Cố Tính Toàn Vẹn Dữ Liệu Lưu & Chuẩn JSON-V2 (`saveIntegrity.ts`, `phase5Data.ts`, `App.tsx`)

- **Gói xuất/nhập JSON-V2 có Checksum (`aetherbow_save_v2`)**: `encodeSignedSaveJson` đóng gói `{ format, exportedAt, checksum, payload }` kèm mã kiểm tra toàn vẹn FNV-1a; `decodeSaveTransferCode` từ chối ngay tệp JSON-V2 bị chỉnh sửa thủ công, đồng thời giữ **100% tương thích ngược** cho tệp JSON cũ và chuỗi `ABW5`.
- **Phòng vệ hai lớp khi Import (`handleImportSave`)**: Cả `decodeSaveTransferCode` lẫn `handleImportSave` đều chạy qua `validateAndSanitizeSaveIntegrity`.
- **Tự phục hồi & kẹp biên an toàn**: Kẹp trần `gold`, `gems`, `starDust (0..50,000,000)`, `scrolls`, `spiritCores`, `paragonInfusionLevel (0..500)`, `career (0..1,000,000)`, dọn UID `equipped` trỏ tới vật phẩm không tồn tại, lọc trắng `discoveredEvolutions`, `chapterMilestones (Ch.1–12, ★1–★4)`, **`claimedJourneyMilestones` (`VALID_JOURNEY_MILESTONE_IDS`, Đợt 14)**, **`GearInstance.transmutedSetId` (lọc trắng theo `GEAR_SET_DEFINITIONS`, tước bỏ trên đồ Thường/Hiếm, Đợt 15)**, **`GearInstance.mythicImprint` (chỉ chấp nhận trên `Rarity.MYTHIC`, lọc trắng 4 mã Ấn Tinh hợp lệ & kẹp `tier 1..5`, Đợt 17)**, khử trùng lặp `inventory`/`mailIds`, và trả về báo cáo `{ ok, repairs }` với 0 cảnh báo giả trên save sạch.
- **Kho Sao Lưu & Khôi Phục Nhanh (`5 Mốc` FNV-1a, Đợt 17)**: `src/data/wave17EndgameAndBackup.ts` tự động chụp snapshot có mã băm FNV-1a trước mọi thao tác rủi ro cao (`pre_import`, `pre_reset`, `pre_cloud_overwrite`, `pre_restore`) với vòng đệm giới hạn cứng **5 mốc** tránh tràn `localStorage`; khi khôi phục (`restoreSaveRollbackSnapshot`), hệ thống xác minh lại checksum FNV-1a (từ chối ngay snapshot bị sửa tay) và chạy toàn bộ `validateAndSanitizeSaveIntegrity`.
- **Khóa 0-Farm Tuyệt Đối Cho Luyện Boss 12 Cung (Đợt 17)**: `enforceZeroBossPracticeRewards` và nhánh `isTrainingMode` trong `GameEngine.ts` ép toàn bộ Vàng/Ngọc/XP/Loot/Tiến độ Nhiệm vụ về `0` và chặn sinh Loot Orb trong Sân Tập 3D; `computeSmartUpgradeRoi` chạy hoàn toàn chỉ-đọc không biến đổi dữ liệu lưu.
- **Lọc Trắng & Kẹp Biên Thẩm Quyền Khế Ước Hoàng Đạo (Đợt 18)**: `sanitizeZodiacVowsForRun` (`src/engine/wave18TacticalAndAtmosphere.ts`) chỉ chấp nhận 3 mã Khế Ước hợp lệ (`VALID_ZODIAC_VOW_IDS`), khử trùng lặp và ép mảng rỗng `[]` cho Chương 1 cũng như mọi chế độ ngoài Chiến Dịch/Tháp; đồng thời `computeAuthoritativeRunBounds` (`src/data/runIntegrityVerifier.ts`) khóa cứng `zodiacVowGoldMult = 1.0` ở Ch.1 hoặc ngoài Chiến Dịch/Tháp và kẹp chặt `1.0..1.7` ở Ch.2–12/Tháp (`wave18Overhaul.test.ts` W18-1). Trung Tâm Kiểm Định Sẵn Sàng Tài Nguyên 12 Chương trong `SettingsModal.tsx` chạy hoàn toàn chỉ-đọc từ manifest công khai.

---

## 4. Vệ Sinh Bí Mật & Rủi Ro Tồn Đọng

- **Quản lý Secret**: Toàn bộ khóa Backblaze B2 (`B2_KEY_ID`, `B2_APPLICATION_KEY`) và Cloudflare (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`) chỉ đọc qua `process.env` phía server; không tồn tại trong bundle client hay `.env.example`.
- **Rủi ro đã ghi nhận cho lộ trình P3**:
  1. `SecurityAnomalyTracker` và `SlidingWindowRateLimiter` lưu trong bộ nhớ đơn tiến trình (đủ cho quy mô hiện tại; chuyển Redis ở P3-4 khi scale đa pod).
  2. Checksum FNV-1a phía client chống sửa tay tệp xuất cục bộ; dữ liệu bảng xếp hạng & người chơi chính thức trên máy chủ do `firestore.rules` và Firebase Auth/Express xác thực độc lập.

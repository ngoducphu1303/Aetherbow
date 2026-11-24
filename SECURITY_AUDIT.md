# SECURITY AUDIT — BÁO CÁO KIỂM TOÁN BẢO MẬT & CHỐNG GIAN LẬN

- **Phạm vi kiểm toán**: `firestore.rules`, `server.ts`, `src/server/serverSecurity.ts`, `src/server/weeklyBossService.ts`, `src/data/saveIntegrity.ts`, `src/components/AssetAdminLiveOpsTab.tsx`, và quản lý biến môi trường `.env.example`.
- **Trạng thái chung**: **AN TOÀN CAO** — 0 lỗi ESLint trên `firestore.rules`, 0 bí mật lộ phía client, đầy đủ Rate Limit + WS Clamp + Admin Auth + Giám sát Bất thường.

---

## 1. Kiểm Toán Firestore Security Rules (`firestore.rules`)

- **Kết quả kiểm định tự động**: `npx eslint firestore.rules` → **`0 errors, 0 warnings`**.
- **Nguyên tắc cốt lõi**: Mặc định từ chối toàn cục (`match /{document=**} { allow read, write: if false; }`), chỉ mở đúng **7 blueprint** có kiểm duyệt kiểu dữ liệu, độ dài chuỗi, giới hạn số và sở hữu UID:
  1. `players/{uid}`: Chỉ chủ tài khoản (`request.auth.uid == uid`) được đọc/ghi hồ sơ lưu riêng; kiểm duyệt cấu trúc hợp lệ.
  2. `leaderboard/{uid}`: Đọc công khai, chỉ chủ UID được cập nhật mục của mình trong biên hợp lệ.
  3. `boss_race_entries/{entryId}`: Kiểm duyệt chặt điểm số & danh tính người chơi.
  4. `season_standings/{seasonId}`: Bảo vệ thứ hạng mùa giải.
  5. `liveops_config/{docId}`: Đọc công khai cho client đồng bộ sự kiện; chỉ Admin xác thực được ghi trong biên an toàn (`LIVEOPS_BOUNDS`).
  6. `asset_admins/{uid}`: Kiểm soát danh sách quản trị viên tài sản.
  7. `asset_inbox/{itemId}`: Chỉ quản trị viên xác thực xử lý hàng đợi tài sản 3D.

---

## 2. Bảo Mật Backend Express & WebSocket (`server.ts`, `serverSecurity.ts`)

| Lớp phòng vệ | Cơ chế triển khai | Trạng thái |
|---|---|---|
| **HTTP Security Headers** | `applySecurityHeadersMiddleware` gắn `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-DNS-Prefetch-Control: off`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. | Đã xác minh |
| **Sliding Window Rate Limit** | Giới hạn theo IP cho `/api/weekly-boss` (60/phút), `/api/liveops` (60/phút), `/api/admin/security-anomalies` (60/phút), `/api/live-ai/snapshot` (120/phút), `/api/assets` (240/phút) + chống burst hành động WS (`12/10s`, tổng `45/10s`). | Đã xác minh (`serverSecurity.test.ts`) |
| **Kẹp Trần Payload WebSocket** | Mọi gói tin `duel:complete` (`1..3600s`), `guild_boss:attack` (`0..25,000,000`), `bounty:contribute` (`0..5,000`), `guild_war:strike` (`0..2,500` hoặc `3,500` boss_rush) bị kẹp trần tuyệt đối và giới hạn kích thước gói ≤ 32 KB. | Đã xác minh (`serverSecurity.test.ts`) |
| **Xác Thực Admin Hai Lớp** | Kiểm tra `resolveBearerUser(req)` (Firebase Admin SDK verify ID Token) kết hợp `isVerifiedAdminClaims` (yêu cầu `emailVerified === true` khớp `VERIFIED_ADMIN_EMAIL`) hoặc `verifyWorkerAdminSession`. | Đã xác minh |
| **Giám Sát Bất Thường (MỚI)** | `SecurityAnomalyTracker` (ring buffer giới hạn cứng **200 sự kiện**, không rò rỉ RAM) tự động ghi nhận `rate_limit` (429), `ws_clamped`, `auth_invalid` (401), `admin_denied` (403); hiển thị trên bảng Admin đọc-duy-nhất qua `GET /api/admin/security-anomalies` (`Cache-Control: no-store`). | **Mới triển khai & Đã test** |

---

## 3. Gia Cố Tính Toàn Vẹn Dữ Liệu Lưu (`src/data/saveIntegrity.ts`)

Các quy tắc kiểm duyệt & tự phục hồi đã được mở rộng và kiểm chứng qua `saveIntegrity.test.ts`:
- Kẹp trần tiền tệ và tài nguyên: `gold (0..999,999,999)`, `gems / starDust / scrolls / spiritCores (0..99,999,999)`.
- Kẹp trần tiến độ: `highestChapterCleared (0..12)`, `bestTowerFloor (0..10,000)`.
- Khử trùng lặp `inventory` theo `uid`, kẹp trần `level (1..120)` và `awakeningLevel (0..10)` trên từng trang bị.
- Sửa fallback danh sách tướng rỗng từ legacy `'artemis'` sang `'aurelia'`; kẹp trần `heroStars (0..10)`.
- Kẹp trần toàn bộ bộ đếm `pity (0..500)` chống số âm/NaN; khử trùng lặp `claimedMailIds` và `deletedMailIds`.
- Đảm bảo **0 cảnh báo giả (zero false-positives)** trên hồ sơ người chơi sạch.

---

## 4. Vệ Sinh Bí Mật & Rủi Ro Tồn Đọng

- **Quản lý Secret**: Toàn bộ khóa Backblaze B2 (`B2_KEY_ID`, `B2_APPLICATION_KEY`) và Cloudflare (`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`) chỉ đọc qua `process.env` tại phía server; không tồn tại trong bundle client hay `.env.example`.
- **Rủi ro đã ghi nhận cho lộ trình P2/P3**:
  1. `SecurityAnomalyTracker` và `SlidingWindowRateLimiter` lưu trên bộ nhớ đơn tiến trình (đủ cho quy mô triển khai hiện tại; chuyển Redis ở P3-4 khi scale đa pod).
  2. Gói Export/Import Save thủ công hiện được kẹp trần bởi `saveIntegrity.ts`; sẽ bổ sung checksum xác thực toàn vẹn ở P2-4.

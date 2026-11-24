# SECURITY AUDIT — KIỂM TOÁN BẢO MẬT & CHỐNG GIAN LẬN

**Phạm vi:** Express Server (`server.ts`, `src/server/assetDeployService.ts`, `src/server/serverSecurity.ts`), Cloud Firestore (`firestore.rules`, `firebase-blueprint.json`, `security_spec.md`), dịch vụ đồng bộ Asset & LiveOps (`src/services/assetInboxMirrorService.ts`, `src/services/liveOpsConfigService.ts`), và toàn vẹn dữ liệu người chơi (`src/data/saveIntegrity.ts`).

---

## 1. Các Lỗ Hổng Thực Tế Đã Phát Hiện & Đóng Hoàn Toàn Trong Đợt Nâng Cấp

### 1.1. Lỗ hổng vượt quyền quản trị CDN bằng tài khoản mật khẩu chưa liên kết (`src/server/assetDeployService.ts`)
- **Mức độ:** Cao (Đã khắc phục & kiểm chứng bằng test tự động).
- **Vấn đề trước sửa:** Hàm `isAuthorizedAdmin()` từng trả về `true` ngay lập tức khi `provider === 'password' && email === allowedPasswordEmail` mà không kiểm tra tài khoản đó có thực sự được liên kết hợp lệ trên Cloudflare Worker (`__admin/session`) hay không.
- **Biện pháp khắc phục:**
  - Tách hàm `verifyAssetAdminAuthorization()` và bắt buộc gọi `verifyWorkerAdminSession(token)` cho mọi đăng nhập mật khẩu `puugoo`.
  - Chủ sở hữu Google đã xác thực email (`ngoducphu1303@gmail.com`) được cấp quyền trực tiếp; tài khoản Google khác hoặc tài khoản mật khẩu không qua được kiểm tra Worker bị từ chối tuyệt đối (`403`).
  - Áp dụng giới hạn tốc độ (`createApiRateLimitMiddleware`): `/api/admin/asset-deploy/status` tối đa **30 yêu cầu/phút**, `/upload-b2` và `/deploy-worker` tối đa **6 yêu cầu/phút**.
  - Kiểm chứng tự động trong `tests/security-hardening.test.mjs` (**pass**).

### 1.2. Thiếu quy tắc bảo mật Firestore cho `asset_admins` và `asset_inbox` (`firestore.rules` & `firebase-blueprint.json`)
- **Mức độ:** Cao (Đã khắc phục & kiểm tra `npx eslint firestore.rules` = 0 lỗi).
- **Vấn đề trước sửa:** `src/services/assetInboxMirrorService.ts` ghi vào `/asset_admins/{uid}` và `/asset_inbox/{itemId}` nhưng chưa có khai báo quy tắc, khiến đồng bộ thất bại hoặc thiếu hàng rào kiểm soát schema.
- **Biện pháp khắc phục:**
  - Bổ sung entity `AssetAdmin` và `AssetInboxItem` vào `firebase-blueprint.json`.
  - Bổ sung quy tắc 8 trụ cột vào `firestore.rules`:
    - `/asset_admins/{uid}`: **Chỉ chủ sở hữu Google (`isVerifiedAdmin()`)** mới được tạo/cập nhật; ngăn hoàn toàn hành vi tự leo thang quyền; cấm xóa.
    - `/asset_inbox/{itemId}`: Xác thực UUID v4, kích thước tệp `24..120MB`, chương `1..12`, danh mục hợp lệ; chỉ quản trị hợp lệ (`isAnyAuthorizedAdmin()`) mới được ghi; cấm xóa.
    - `/liveops_config/global`: Mở rộng cho cả Google Admin và tài khoản `puugoo` đã liên kết trong `/asset_admins/{uid}` với biên hệ số cứng (`0.5..3.0` thưởng, `0.6..2.0` quái) và phiên bản tăng đơn điệu.

### 1.3. Chống gian lận dữ liệu người chơi & LiveOps (`src/data/saveIntegrity.ts`, `server.ts`)
- Mở rộng `validateAndSanitizeSaveIntegrity()` để lọc sạch bản ghi `chapterMilestones` lỗi (chương ngoài `1..12`, số lần thắng âm, sao ngoài `1..4`, tỉ lệ HP ngoài `0..1`).
- Giữ nguyên toàn bộ lớp bảo vệ sẵn có: kẹp biên sát thương/điểm WebSocket (`clampWs*`), rate-limit toàn bộ API (`/api/liveops`, `/api/weekly-boss`, `/api/live-ai`, `/api/assets`), tiêu đề bảo mật tương thích iframe (`X-Content-Type-Options: nosniff`, `Referrer-Policy`), và ẩn toàn bộ bí mật B2/Cloudflare trong log (`redactSecrets`).

---

## 2. Kiểm Tra Phụ Thuộc Bên Thứ Ba (`bun audit`)

- Ghi nhận **1 cảnh báo mức cao** và **1 cảnh báo mức thấp** nằm ở gói bắc cầu `@grpc/grpc-js` (được kéo vào thông qua `firebase` / `firebase-admin`).
- Không có lỗ hổng trực tiếp trong mã nguồn ứng dụng; cần cập nhật gói `firebase` / `firebase-admin` khi phiên bản mới phát hành bản vá tương thích.

## 3. Lưu Ý Triển Khai

- Hãy triển khai tệp `firestore.rules` lên dự án Firebase (`firebase deploy --only firestore:rules`) và kiểm tra kỹ lại quyền quản trị trước khi chia sẻ rộng rãi.

# Walkthrough & Verification Summary — Aetherbow: Citadel Trial

## Tổng Quan Triển Khai

Đợt nâng cấp toàn diện theo 30 tiêu chí trong `AAAA_GAME_DEVELOPMENT_MASTER_PROMPT.md` đã hoàn tất trên toàn bộ mã nguồn đồng bộ Chương 1–4:

1. **Tăng tiến 4 Mốc Sao Chương 2–4 & Bảo toàn Save cũ:**
   - Tạo `src/data/chapterCollectionMilestones.ts` và tích hợp vào `src/App.tsx` + `src/components/LobbyPanels.tsx`, thay thế cơ chế nhận 7 vật phẩm cùng lúc bằng lộ trình kỹ năng **★1–★4**.
   - Khôi phục toàn vẹn `migrateSaveData()` trong `src/data/earlyProgressionData.ts` để giữ 100% tướng, thú cưỡi, tinh linh, cánh, thánh khí, hào quang, trang phục và `chapterEquipmentPresets` Chương 1–4.
2. **Chiến đấu, AI Đội Hình & Boss 3 Giai Đoạn Chương 1–4:**
   - Tạo `src/engine/tacticalCombatChoreography.ts` và gắn trực tiếp vào `src/engine/GameEngine.ts`: cơ chế **Ngắt Chiêu (`NGẮT CHIÊU!` / `NGẮT CHIÊU BOSS!`)**, điều hướng tách nhóm chống chồng chéo theo 4 vai trò quái, và kế hoạch 3 giai đoạn (100% / 65% / 30%) cho Boss Chương 1–4.
3. **Bảng Quản Trị Thống Nhất Asset + LiveOps:**
   - Tạo `src/components/AssetAdminLiveOpsTab.tsx` và gắn làm tab thứ 4 **`Cân Bằng LiveOps`** trong `src/components/AssetAdminPage.tsx`, kết nối đồng bộ với `PUT /api/liveops/config` và Cloud Firestore.
4. **Hiệu năng Dell Latitude E5430 & Tài nguyên 3D:**
   - Đồng bộ **137 tệp GLB hoạt động** (High + Lite cho Chương 1–4) và xóa bỏ tệp thừa `public/assets/mounts/black-dragon.glb` (12.5 MB).

---

# Security Summary

- **Siết quyền API đồng bộ CDN (`src/server/assetDeployService.ts`):** Đóng lỗ hổng trước đó cho phép tài khoản mật khẩu trùng email `puugoo` đi qua mà không xác minh trạng thái liên kết trên Worker. Mọi đăng nhập mật khẩu hiện bắt buộc xác thực qua `verifyWorkerAdminSession(token)`; bổ sung giới hạn tốc độ (`30 req/phút` cho `/status`, `6 req/phút` cho `/upload-b2` và `/deploy-worker`).
- **Quy tắc Cloud Firestore (`firestore.rules`, `firebase-blueprint.json`, `security_spec.md`):** Bổ sung đầy đủ schema và quy tắc kiểm tra chặt chẽ cho `/asset_admins/{uid}` (chỉ chủ sở hữu Google đã xác thực mới được ghi) và `/asset_inbox/{itemId}` (chỉ quản trị xác thực/liên kết mới được ghi, xác thực UUID v4, kích thước, chương), đồng thời mở quyền cập nhật `/liveops_config/global` có biên số an toàn cho tài khoản liên kết `puugoo`. Đạt **0 lỗi / 0 cảnh báo** với `npx eslint firestore.rules`.
- **Toàn vẹn bản lưu người chơi (`src/data/saveIntegrity.ts`):** Bổ sung kiểm chuẩn cho `chapterMilestones` để loại bỏ giá trị lỗi/vượt biên mà vẫn bảo toàn dữ liệu hợp lệ.
- **Kiểm tra phụ thuộc (`bun audit`):** Ghi nhận cảnh báo ở thư viện bắc cầu `@grpc/grpc-js` (1 cao, 1 thấp) đi kèm gói `firebase` / `firebase-admin`; chưa có bản cập nhật tương thích trực tiếp ngoài hệ SDK, cần tiếp tục theo dõi khi nâng cấp Firebase SDK.
- **Lưu ý triển khai:** Hãy chạy `firebase deploy --only firestore:rules` để áp dụng `firestore.rules` mới lên dự án Firebase của bạn và kiểm tra lại cấu hình quyền truy cập trước khi chia sẻ rộng rãi.

---

## PoC Verification

Các kịch bản kiểm chứng thực tế đã được thực thi và vượt qua 100%:

1. **Chặn tài khoản mật khẩu chưa liên kết gọi API đồng bộ CDN:**
   - Kiểm thử `Security PoC: Asset deploy admin authorization rejects unlinked password accounts and requires Worker session confirmation` trong `tests/security-hardening.test.mjs`:
     - Truyền token `provider: 'password'` trùng email `puugoo@aetherbow.local` nhưng `verifyWorkerSession` trả `false` → `verifyAssetAdminAuthorization()` trả về **`false`** (bị chặn).
     - Truyền tài khoản Google chưa xác thực email (`email_verified: false`) → trả về **`false`** (bị chặn).
     - Chỉ khi `verifyWorkerSession` xác nhận hợp lệ hoặc là chủ sở hữu Google đã xác thực email → trả về **`true`**.
2. **Chặn dữ liệu bản lưu giả mạo / hỏng:**
   - Kiểm thử `validateAndSanitizeSaveIntegrity()` trong `tests/security-hardening.test.mjs`: bơm `gold: NaN`, `gems: -9999`, `highestChapterCleared: 42`, trùng UID trang bị, `chapterMilestones` có sao `99` và chương `999` → bộ lọc tự động khôi phục về trạng thái hợp lệ và loại bỏ khóa giả mạo.
3. **Kiểm chứng toàn bộ hệ thống & build:**
   - `npx eslint firestore.rules`: **0 lỗi, 0 cảnh báo**.
   - `npm test`: **298 / 298 pass (0 fail, 0 skip)**.
   - `npm run lint` (`tsc --noEmit`): **0 lỗi**.
   - `npm run build` (`vite build`): **thành công**.

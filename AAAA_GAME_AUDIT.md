# AAAA GAME AUDIT — AETHERBOW: CITADEL TRIAL (Bản Đồng Bộ Chương 1–4 & Nâng Cấp Toàn Diện)

**Phạm vi kiểm toán:** Toàn bộ kho mã nguồn sau đồng bộ GitHub (Chương 1 Sư Tử Nhật Luân, Chương 2 Hỏa Sơn Bạch Dương, Chương 3 Thánh Địa Kim Ngưu, Chương 4 Đấu Trường Song Tử, hệ thống quản trị Asset `puugoo` + Cloudflare Worker + Backblaze B2 CDN, Express API/WebSocket, Cloud Firestore, và 3D Three.js Engine).
**Ngày nghiệm thu:** 24/11/2026
**Trạng thái xác minh:** `npm test` **298/298 pass (0 fail, 0 skip)** · `npx eslint firestore.rules` **0 lỗi / 0 cảnh báo** · `tsc --noEmit` **0 lỗi** · `vite build` **thành công**.

---

## 1. Tổng Quan Kiến Trúc & Hiện Trạng Kho Mã Nguồn

| Phân hệ | Tệp / Mô-đun chính | Trạng thái sau nâng cấp |
|---|---|---|
| **3D Engine & Combat** | `src/engine/GameEngine.ts`, `src/engine/tacticalCombatChoreography.ts`, `src/engine/aaaEnemyCombatEngine.ts`, `src/engine/zodiacBossEngine.ts` | Đã tích hợp **Ngắt Chiêu (Cast Interrupt)** khi đánh trúng đòn gồng, **Phối Hợp Đội Hình Quái (Squad Coordination Anti-Clump)**, và **Nhịp Boss 3 Giai Đoạn (100% / 65% / 30%)** cho Chương 1–4. |
| **Tăng Tiến & Bộ Sưu Tập Chương** | `src/data/chapterCollectionMilestones.ts`, `src/data/earlyProgressionData.ts`, `src/data/chapterEquipmentSets.ts`, `src/data/saveIntegrity.ts` | Đã vá lỗi hồi quy `migrateSaveData` làm mất tướng/trang bị Chương 2–4; thay thế cơ chế xả 7 món ngay lập tức bằng **Lộ Trình 4 Sao Kỹ Năng (★1–★4)** cho Chương 2–4 mà vẫn bảo toàn 100% save cũ. |
| **Kinh Tế & LiveOps** | `src/data/liveOpsConfig.ts`, `src/services/liveOpsConfigService.ts`, `src/components/AssetAdminLiveOpsTab.tsx`, `src/data/balanceSimulation.ts` | Đã hợp nhất tab **Cân Bằng LiveOps** trực tiếp vào bảng Quản trị Asset (`/#/admin/assets?tab=liveops`), hỗ trợ cả Admin Google và Admin liên kết `puugoo`, đồng bộ Firestore + Express + Local Cache. |
| **Asset Pipeline & Dell E5430 Lite** | `scripts/glb-manifest.json`, `src/engine/modelAssets.ts`, `src/engine/chapter1Map.ts`..`chapter4Map.ts`, `workers/glb-cdn` | Đã đồng bộ **137 tệp GLB hoạt động** (gỡ bỏ `black-dragon.glb` 12.5 MB dư thừa), chuẩn hóa song song bản High & Lite cho toàn bộ Chương 1–4 và tướng, tự động phát hiện phần cứng yếu (Dell Latitude E5430). |
| **Bảo Mật & Dữ Liệu Cloud** | `src/server/assetDeployService.ts`, `server.ts`, `firestore.rules`, `firebase-blueprint.json`, `security_spec.md` | Đã khóa lỗ hổng xác thực `provider === 'password'` trong `assetDeployService.ts` (bắt buộc xác minh Worker `__admin/session`), bổ sung giới hạn tốc độ (rate-limit) cho mọi route deploy, và đồng bộ hoàn chỉnh rules + schema cho `asset_admins` và `asset_inbox`. |

---

## 2. Các Lỗi Nghiêm Trọng Đã Phát Hiện & Khắc Phục Thực Tế Trong Đợt Kiểm Toán

1. **[P0 — Mất dữ liệu người chơi] Hồi quy `migrateSaveData` sau hợp nhất mã nguồn:**
   - **Hiện tượng:** `migrateSaveData` trước đó vô tình loại bỏ `bellona`, `sylvia`, `celeste`, thú cưỡi, tinh linh, cánh, thánh khí, hào quang và `chapterEquipmentPresets` của Chương 2–4 khi người chơi tải lại bản lưu.
   - **Khắc phục:** Khôi phục danh sách hợp lệ đầy đủ 4 chương trong `src/data/earlyProgressionData.ts`, chỉ chuyển đổi ID cũ đã ngừng sử dụng (`artemis`, `hatsune_miku`) sang `aurelia`, đồng thời bảo toàn và tự động quy đổi mốc sao (`normalizeChapterMilestones`) cho tài khoản cũ.
2. **[P0 — Bảo mật quản trị CDN] Tin cậy email mật khẩu chưa liên kết tại `assetDeployService.ts`:**
   - **Hiện tượng:** Route `/api/admin/asset-deploy/*` từng cho phép `provider === 'password' && email === allowedPasswordEmail` đi qua trực tiếp mà không kiểm tra tài khoản đó đã được liên kết trên Cloudflare Worker hay chưa, đồng thời thiếu giới hạn tốc độ gọi API.
   - **Khắc phục:** Tách và kiểm thử hàm `verifyAssetAdminAuthorization()` bắt buộc gọi `verifyWorkerAdminSession(token)` cho mọi đăng nhập mật khẩu; áp dụng rate-limit `30 req/phút` cho `/status` và `6 req/phút` cho `/upload-b2`, `/deploy-worker`.
3. **[P0 — Thiếu quy tắc Firestore cho `asset_admins` & `asset_inbox`]:**
   - **Hiện tượng:** `src/services/assetInboxMirrorService.ts` ghi vào `/asset_admins/{uid}` và `/asset_inbox/{itemId}` nhưng `firestore.rules` chưa định nghĩa 2 bộ sưu tập này (bị chặn mặc định).
   - **Khắc phục:** Bổ sung đầy đủ schema trong `firebase-blueprint.json` và quy tắc 8 trụ cột trong `firestore.rules` (chỉ chủ sở hữu Google mới được cấp quyền `asset_admins`; chỉ Admin xác thực/liên kết mới được ghi `asset_inbox` và `liveops_config/global`).
4. **[P1 — Bùng nổ sức mạnh đầu/giữa game] Xả trọn 7 vật phẩm Chương 2–4 ngay lần thắng đầu:**
   - **Hiện tượng:** Hoàn thành Ải 12 Chương 2/3/4 lập tức tặng toàn bộ Tướng + Tinh linh + Trang phục + Cánh + Thú cưỡi + Thánh khí + Hào quang, làm gãy đường cong sức mạnh và giảm động lực chơi lại.
   - **Khắc phục:** Áp dụng hệ thống **Mốc Sao Chương ★1–★4** (`src/data/chapterCollectionMilestones.ts`) kết nối trực tiếp vào `App.tsx` và hiển thị rõ ràng trong `LobbyPanels.tsx` (`Bộ Theo Chương`).
5. **[P1 — Chiều sâu chiến đấu & AI]:**
   - **Khắc phục:** Bổ sung mô-đun `src/engine/tacticalCombatChoreography.ts` kết nối trực tiếp vào `GameEngine.ts`: cơ chế **Ngắt Chiêu (Cast Interrupt)** thưởng sát thương Suy Yếu +20% và thanh Phá Giáp Boss +22%, điều hướng tách nhóm chống dồn cục cho quái thường, và kế hoạch Boss 3 giai đoạn cho Chương 1–4.
6. **[P1 — Đồng bộ bộ kiểm thử tự động & dọn tài nguyên nặng]:**
   - **Khắc phục:** Đồng bộ 137 tệp GLB thực tế, xóa `public/assets/mounts/black-dragon.glb` (12.5 MB) để giữ gói tài nguyên nhẹ cho Dell Latitude E5430, cập nhật 3 bài kiểm thử lỗi thời trước Chương 4 và bổ sung 6 bài kiểm thử mới → đạt **298/298 pass**.

---

## 3. Hạng Mục Cần Chủ Dự Án Thao Tác Ngoài Môi Trường Preview

- **Triển khai quy tắc Firestore mới:** Do môi trường sandbox không tự động đẩy rules lên dự án Firebase bên ngoài, hãy chạy `firebase deploy --only firestore:rules` (hoặc dán `firestore.rules` trong Firebase Console) để kích hoạt `asset_admins`, `asset_inbox` và quyền `liveops_config` cho tài khoản liên kết `puugoo`.
- **Theo dõi thư viện bắc cầu `@grpc/grpc-js`:** Kiểm tra phụ thuộc (`bun audit`) ghi nhận 1 cảnh báo mức cao và 1 mức thấp nằm sâu trong phụ thuộc bắc cầu của `firebase-admin` / `firebase` SDK; cần cập nhật khi gói SDK phát hành bản vá tương thích.

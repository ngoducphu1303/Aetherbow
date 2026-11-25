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
4. **Hiệu năng Dell Latitude E5430 & Watchdog GPU Thời Gian Thực (Đợt 1 + Đợt 2):**
   - Đồng bộ **137 tệp GLB hoạt động** (High + Lite cho Chương 1–4) và xóa bỏ tệp thừa `public/assets/mounts/black-dragon.glb` (12.5 MB).
   - Bổ sung **Watchdog GPU 5 Bậc (`src/engine/gpuThermalWatchdog.ts`)** chạy trên toàn bộ các chương và chế độ: khởi động an toàn ở Bậc 2 trên Dell Latitude E5430 (Intel HD 4000), tự hạ Bloom → Bóng/Hạt → DPR/Đèn → Lite Khẩn Cấp nếu tụt khung hình kéo dài và tự động bảo vệ khi mất ngữ cảnh WebGL.
5. **Chiều Sâu Gameplay, Âm Thanh Động & Tiếp Cận (Đợt 2):**
   - **Tiến Hóa Kỹ Năng Rẽ Nhánh (`src/engine/skillEvolutionEngine.ts`):** 12 nhánh tiến hóa (Boss vs AoE) trên 6 kỹ năng cốt lõi, chọn nhánh trực tiếp trong trận (`SkillDraftModal.tsx`), hỗ trợ AI Auto-Pilot và lưu kho khám phá vào Codex.
   - **Nhạc Nền Động Hoàng Đạo (`src/audio/zodiacMusicDirector.ts`):** Chủ đề nhạc nền riêng cho từng Chương 1–12 + cao trào Boss 3 Pha + hiệu ứng kèn/chuông Ngắt Chiêu (`playInterruptFanfare`), 100% Web Audio.
   - **Tiếp Cận & Sổ Tay Thế Giới (`src/engine/colorblindTelegraphs.ts`, `CodexGuideModal.tsx`, `SettingsModal.tsx`):** Hình học cảnh báo an toàn mù màu, cỡ chữ 3 mức (`100% / 115% / 130%`), phím tắt `V` bật/tắt Tự Động Chiến Đấu, và hồ sơ 3 Pha/Lore/Ngắt Chiêu/★1–★4 trong Codex.
6. **Cơ Quan Đấu Trường, AI Đội Hình, Động Học Zero-GC, Hiệu Ứng Bộ Trang Bị & Giữ Chân Người Chơi (Đợt 3):**
   - **Cơ Quan Đấu Trường Hoàng Đạo (`src/engine/chapterArenaMechanisms.ts`):** 4 cơ quan tương tác cho toàn bộ Chương 1–12, đặt tránh cột/tường, tuyệt đối không thêm `PointLight` và tự hạ low-poly trên Dell Latitude E5430 Lite / Watchdog ≥ Bậc 2.
   - **AI Né Vật Cản, Phối Hợp Đội Hình & Vật Lý An Toàn (`src/engine/tacticalCombatChoreography.ts`):** Quái tự vòng tránh cột, Tiên phong che chắn Xạ thủ/Pháp sư, chặn sinh quái trong cột và chặn đẩy lùi xuyên tường.
   - **Động Học Hoạt Ảnh Zero-GC (`src/engine/combatAnimationKinematics.ts`):** Giật ngược có hướng khi trúng đòn, giật cung, khụy gối choáng và nhún ăn mừng không tạo rác bộ nhớ, tôn trọng `reducedMotion` (25%).
   - **5 Hiệu Ứng Bộ Trang Bị Độc Nhất & Lộ Trình 60p / 19 Thành Tựu (`src/engine/gearSetCombatProcs.ts`, `src/data/onboardingAndMasteryData.ts`, `ProfileCodexModal.tsx`, `LobbyPanels.tsx`):** Kích hoạt thật trong chiến đấu với ICD chuẩn (tỷ số DPS `1.26x`, bảo toàn khởi điểm `702 CP`, sink Vàng 100h đạt `107%`).

---

# Security Summary

- **Siết quyền API đồng bộ CDN (`src/server/assetDeployService.ts`):** Đóng lỗ hổng trước đó cho phép tài khoản mật khẩu trùng email `puugoo` đi qua mà không xác minh trạng thái liên kết trên Worker. Mọi đăng nhập mật khẩu hiện bắt buộc xác thực qua `verifyWorkerAdminSession(token)`; bổ sung giới hạn tốc độ (`30 req/phút` cho `/status`, `6 req/phút` cho `/upload-b2` và `/deploy-worker`).
- **Quy tắc Cloud Firestore (`firestore.rules`, `firebase-blueprint.json`, `security_spec.md`):** Bổ sung đầy đủ schema và quy tắc kiểm tra chặt chẽ cho `/asset_admins/{uid}` và `/asset_inbox/{itemId}` cùng quyền LiveOps có biên số an toàn. Đạt **0 lỗi / 0 cảnh báo** với `npx eslint firestore.rules`.
- **Toàn vẹn bản lưu người chơi (`src/data/saveIntegrity.ts`):** Bổ sung kiểm chuẩn cho `chapterMilestones`, `discoveredEvolutions` và 3 bộ đếm sự nghiệp mới (`arenaMechanismsTriggered`, `bossInterruptsTotal`, `setProcsTriggered`) để loại bỏ giá trị lỗi/giả mạo mà vẫn bảo toàn 100% dữ liệu hợp lệ.

---

## PoC Verification

1. **Chặn tài khoản mật khẩu chưa liên kết gọi API đồng bộ CDN:** `tests/security-hardening.test.mjs` (6/6 pass).
2. **Chặn dữ liệu bản lưu giả mạo / hỏng:** `validateAndSanitizeSaveIntegrity()` làm sạch `chapterMilestones`, `discoveredEvolutions` & bộ đếm sự nghiệp mới (`tests/security-hardening.test.mjs`, `tests/accessibility-codex-pass2.test.mjs`, `tests/gear-set-procs-and-100h-audit.test.mjs`).
3. **Kiểm chứng toàn bộ hệ thống & build (Đợt 3):**
   - `npx eslint firestore.rules`: **0 lỗi, 0 cảnh báo**.
   - `npm test`: **328 / 328 pass (0 fail, 0 skip)**.
   - `npm run lint` (`tsc --noEmit`): **0 lỗi**.
   - `npm run build` (`vite build`): **thành công**.


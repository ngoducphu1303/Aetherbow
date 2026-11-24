# IMPLEMENTATION CHANGELOG — NHẬT KÝ TRIỂN KHAI NÂNG CẤP AAAA (CHƯƠNG 1–4)

## Phiên bản 24/11/2026 — Đợt Nâng Cấp Toàn Diện Sau Đồng Bộ GitHub (Chương 1–4 + Asset Admin)

### 1. Tăng Tiến & Bảo Toàn Dữ Liệu Người Chơi (Wave 1)
- **Tạo mới `src/data/chapterCollectionMilestones.ts`:** Hệ thống mở khóa Bộ Sưu Tập Chương 2–4 theo **4 Mốc Sao Kỹ Năng (★1–★4)** kèm cơ chế tự động quy đổi ngược cho bản lưu cũ (`normalizeChapterMilestones`, `getChapterMilestoneSummary`, `applyChapterCollectionMilestones`).
- **Cập nhật `src/types/game.ts` & `src/data/saveIntegrity.ts`:** Bổ sung kiểu `ChapterMilestoneProgress`, trường `SaveData.chapterMilestones`, và lớp kiểm chuẩn làm sạch dữ liệu sao hỏng mà không ảnh hưởng dữ liệu hợp lệ.
- **Vá hồi quy `src/data/earlyProgressionData.ts`:** Khôi phục bảo toàn 100% tướng (`aurelia`, `bellona`, `sylvia`, `celeste`), thú cưỡi, tinh linh, cánh, thánh khí, hào quang, skin và `chapterEquipmentPresets` của Chương 1–4 trong `migrateSaveData()`.
- **Kết nối UI & Campaign (`src/App.tsx`, `src/components/LobbyPanels.tsx`):** Thay cơ chế xả 7 món ngay lập tức trong `onRunEnded` bằng `applyChapterCollectionMilestones()` và hiển thị rõ tiến độ `★0/4..★4/4` cùng điều kiện mốc kế tiếp trong mục `Bộ Theo Chương`.

### 2. Chiến Đấu, AI Đội Hình & Boss 3 Giai Đoạn Chương 1–4 (Wave 2)
- **Tạo mới `src/engine/tacticalCombatChoreography.ts`:**
  - Phân vai 4 nhóm chiến thuật (`vanguard`, `flanker`, `ranged`, `caster`) và tính vector điều hướng tách nhóm chống dồn cục (`computeSquadCoordinationVector`).
  - Cơ chế **Ngắt Chiêu (`evaluateCastInterrupt`)** thưởng Suy Yếu +20%, choáng quái, và +22% thanh Phá Giáp Boss với hồi chiêu công bằng.
  - Kế hoạch **Boss 3 Giai Đoạn (100% / 65% / 30%)** riêng cho Chương 1–4 (`getChapterBossPhasePlan`).
- **Kết nối `src/engine/GameEngine.ts`:** Tích hợp trạng thái `exposedTimer`, `interruptCdTimer`, đếm `runCastInterrupts` & `runRevivesUsed`, gọi `computeSquadCoordinationVector` cho quái thường, kích hoạt `evaluateCastInterrupt` trong `damageEnemy` (tôn trọng `reducedMotion`), và truyền đầy đủ chỉ số trận (`endHpRatio`, `revivesUsed`, `perfectDodges`, `bossGuardBreaks`, `castInterrupts`) sang `onRunEnded`.

### 3. Bảo Mật, Quy Tắc Firestore & Bảng Quản Trị Thống Nhất (Wave 3)
- **Siết chặt `src/server/assetDeployService.ts`:** Xuất hàm `verifyAssetAdminAuthorization()` và `verifyWorkerAdminSession()`; bắt buộc đăng nhập mật khẩu `puugoo` phải xác minh qua Worker `__admin/session`; bổ sung rate-limit (`30/phút` cho status, `6/phút` cho upload-b2 & deploy-worker).
- **Cập nhật `server.ts` & `src/services/liveOpsConfigService.ts`:** Cho phép cả Admin Google xác thực và Admin liên kết `puugoo` xuất bản cấu hình `PUT /api/liveops/config` và đồng bộ Firestore.
- **Tạo mới `src/components/AssetAdminLiveOpsTab.tsx` & cập nhật `src/components/AssetAdminPage.tsx`:** Hợp nhất tab thứ 4 **`Cân Bằng LiveOps`** (kịch bản nhanh, thanh trượt hệ số, công tắc sự kiện, Xuất/Nạp JSON) ngay trong trang Quản trị Asset.
- **Đồng bộ `firestore.rules`, `firebase-blueprint.json`, `security_spec.md`:** Bổ sung đầy đủ schema và quy tắc bảo mật cho `/asset_admins/{uid}` và `/asset_inbox/{itemId}` cùng `isLinkedAssetAdmin()`; xác minh `npx eslint firestore.rules` = 0 lỗi.

### 4. Kiểm Thử, Đồng Bộ GLB & Báo Cáo Nghiệm Thu (Wave 4)
- Đồng bộ **137 tệp GLB hoạt động**, loại bỏ `public/assets/mounts/black-dragon.glb` (12.5 MB).
- Tạo `tests/chapter-milestones-and-tactical-ai.test.mjs`, mở rộng `tests/security-hardening.test.mjs`, cập nhật `tests/miku-hero.test.mjs`, `src/engine/blackDragonRide.test.ts`, `src/engine/solarLeoAssets.test.ts`, `tests/model-preload-retry.test.mjs` → **298/298 pass (0 fail)**.
- Cập nhật đồng bộ toàn bộ 10 báo cáo kiểm toán gốc và `walkthrough.md`.

---

## Phiên bản 24/11/2026 — Đợt 2: Tiến Hóa Kỹ Năng Rẽ Nhánh, Nhạc Động Hoàng Đạo, Watchdog GPU E5430 & Tiếp Cận

### 1. Tiến Hóa Kỹ Năng Rẽ Nhánh (12 Nhánh Trên 6 Kỹ Năng Cốt Lõi)
- **Tạo mới `src/engine/skillEvolutionEngine.ts`:** 12 nhánh tiến hóa (Đánh Boss vs Diện Rộng) cho Hỏa Tiễn, Băng Tiễn, Lôi Tiễn, Liên Xạ, Cầu Xoay, Phi Kiếm; bộ tính chỉ số chiến đấu (`resolveEvolutionCombatModifiers`), chọn nhánh AI (`selectAiEvolutionBranch`) và Codex (`buildEvolutionCodexEntries`).
- **Tích hợp `src/engine/GameEngine.ts`, `src/components/SkillDraftModal.tsx`, `src/App.tsx`:** Mở Ngã Rẽ Tiến Hóa 2 cột (hỗ trợ phím `[1]`/`[2]` & AI Auto-Pilot), thay đổi hành vi chiến đấu thực tế (nổ AoE lửa/băng, tăng bước nhảy sét, thêm tia rộng/nảy, kết liễu Boss, khiên mỗi phòng), lưu vĩnh viễn vào `SaveData.discoveredEvolutions` và làm sạch trong `src/data/saveIntegrity.ts`.

### 2. Nhạc Nền Động Hoàng Đạo & Âm Thanh Ngắt Chiêu
- **Tạo mới `src/audio/zodiacMusicDirector.ts` & tích hợp `src/audio/soundEngine.ts`, `src/App.tsx`:** 100% Web Audio tổng hợp với giai điệu/âm giai/bassline riêng cho Chương 1–12, đẩy cao trào Boss Pha 1→2→3, và thêm âm thanh kèn/chuông `playInterruptFanfare()` khi Ngắt Chiêu thành công.

### 3. Watchdog GPU Thời Gian Thực Cho Dell Latitude E5430 & Toàn Hệ Thống
- **Tạo mới `src/engine/gpuThermalWatchdog.ts` & tích hợp `src/engine/GameEngine.ts`, `src/components/SettingsModal.tsx`:** Máy trạng thái 5 bậc (0→4) giám sát frame-time EWMA trên mọi chương, tự động hạ Bloom → Bóng/Hạt → DPR/Đèn → Chế Độ Lite Khẩn Cấp + xử lý `webglcontextlost`, có độ trễ chống dao động và thông báo tự ẩn.

### 4. Tiếp Cận (Accessibility) & Sổ Tay Thế Giới / Boss
- **Tạo mới `src/engine/colorblindTelegraphs.ts`:** Hình học cảnh báo an toàn mù màu (vòng đôi, làn mũi tên, tâm ngắm, vòng Ngắt Chiêu) tích hợp vào cảnh báo sàn 3D.
- **Nâng cấp `src/components/SettingsModal.tsx`, `src/engine/aaaWave6Director.ts`, `src/data/liveOpsData.ts`:** Cỡ chữ 3 mức (`100% / 115% / 130%`), thêm phím tắt `toggleAutoPilot (V)`, công tắc Watchdog GPU, Nhạc Nền Động và Hình Học Mù Màu.
- **Nâng cấp `src/data/phase5Data.ts` & `src/components/CodexGuideModal.tsx`:** Thêm tab **Tiến Hóa (12)** và đồng bộ **Biên Niên Sử Hoàng Đạo, 3 Pha Boss, Mẹo Ngắt Chiêu, Mốc Sao ★1–★4**.
- **Kiểm thử mở rộng:** Thêm 4 bộ kiểm thử mới → **313/313 pass (0 fail, 0 skip)**, `tsc --noEmit` 0 lỗi, `vite build` thành công.

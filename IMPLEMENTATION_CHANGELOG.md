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

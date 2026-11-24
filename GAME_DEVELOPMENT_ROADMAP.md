# GAME DEVELOPMENT ROADMAP — LỘ TRÌNH CẢI TIẾN & NGHIỆM THU

## Phân Loại Theo Mức Độ Ưu Tiên & Trạng Thái Hoàn Thành

### P0 — Lỗi Nghiêm Trọng, Bảo Mật, Toàn Vẹn Dữ Liệu & Khả Năng Chơi
- [x] **P0.1 — Khôi phục toàn vẹn Save Chương 2–4 trong `migrateSaveData`** (`src/data/earlyProgressionData.ts`, `src/data/saveIntegrity.ts`): Bảo toàn 100% tướng (`aurelia`, `bellona`, `sylvia`, `celeste`), thú cưỡi, tinh linh, cánh, thánh khí, hào quang, skin và `chapterEquipmentPresets`.
- [x] **P0.2 — Siết chặt bảo mật `assetDeployService.ts`** (`src/server/assetDeployService.ts`): Bắt buộc xác minh Worker `__admin/session` cho đăng nhập mật khẩu `puugoo`, chặn tài khoản chưa liên kết, bổ sung rate-limit (`30/phút` status, `6/phút` B2/Worker).
- [x] **P0.3 — Đồng bộ Firestore Rules & Blueprint cho `asset_admins` & `asset_inbox`** (`firestore.rules`, `firebase-blueprint.json`, `security_spec.md`): Kiểm tra `npx eslint firestore.rules` đạt 0 lỗi, 0 cảnh báo.
- [x] **P0.4 — Đồng bộ tài nguyên GLB & ổn định toàn bộ bộ kiểm thử tự động**: Đồng bộ 137 GLB hoạt động, xóa `black-dragon.glb` (12.5 MB), đưa `npm test` từ 34 lỗi về **298/298 pass**.

### P1 — Tăng Tiến, Kinh Tế, Chiến Đấu, AI & Boss
- [x] **P1.1 — Hệ thống Mở Khóa Bộ Sưu Tập Chương 2–4 theo 4 Mốc Sao (★1–★4)** (`src/data/chapterCollectionMilestones.ts`, `src/App.tsx`, `src/components/LobbyPanels.tsx`): Thay cơ chế tặng 7 món ngay lập tức bằng lộ trình kỹ năng 4 sao, vẫn quy đổi tự động cho người chơi cũ.
- [x] **P1.2 — Cơ chế Ngắt Chiêu (Cast Interrupt) & Phản Đòn Chiến Thuật** (`src/engine/tacticalCombatChoreography.ts`, `src/engine/GameEngine.ts`): Đánh trúng kẻ địch/Boss đang gồng chiêu bằng Tuyệt Kỹ / Phản Đòn / Chí mạng Nguyên tố gây Ngắt Chiêu, Suy Yếu +20%, và +22% thanh Phá Giáp Boss.
- [x] **P1.3 — Phối Hợp Đội Hình Quái & Kế Hoạch Boss 3 Giai Đoạn Chương 1–4** (`src/engine/tacticalCombatChoreography.ts`, `src/engine/GameEngine.ts`): Tách khoảng cách chống dồn cục, phân vai 4 nhóm quái, nhịp Boss 100%/65%/30% với cửa sổ phản công tăng dần (+18% → +27%).
- [x] **P1.4 — Hợp nhất Cân Bằng LiveOps vào Bảng Quản Trị Asset** (`src/components/AssetAdminLiveOpsTab.tsx`, `src/components/AssetAdminPage.tsx`, `server.ts`, `src/services/liveOpsConfigService.ts`): Quản trị cả Asset 3D lẫn tham số cân bằng LiveOps trong một giao diện thống nhất.

### P2 — Hiệu Năng Máy Yếu (Dell Latitude E5430) & Độ Ổn Định
- [x] **P2.1 — Kiểm soát tải khởi động & dọn tài nguyên thừa**: Startup preload chỉ nạp map Chương 1 theo biến thể Lite/Full tương ứng cấu hình máy; duy trì không tồn tại `black-dragon.glb` / `dragon.glb` trên đĩa.
- [x] **P2.2 — Tối ưu phản hồi & tiếp cận (`reducedMotion`)**: Tự động tắt sóng xung kích/rung camera khi Ngắt Chiêu ở chế độ giảm chuyển động.

### P3 — Lộ Trình Mở Rộng Dài Hạn (Chuẩn Bị Cho Chương 5+)
- [ ] **P3.1 — Mở rộng Mốc Sao ★1–★4 cho Chương 5 (Cự Giải) & Chương 6 (Xử Nữ)** bằng cách thêm cấu hình vào `CHAPTER_MILESTONE_CONFIGS` (kiến trúc data-driven sẵn sàng).
- [ ] **P3.2 — Triển khai `firestore.rules` lên Production Firebase** và nâng cấp bản vá phụ thuộc SDK khi `@grpc/grpc-js` cập nhật tương thích với `firebase-admin`.
- [ ] **P3.3 — Thu thập telemetry trận thực tế (D1/D7/D30)** qua LiveOps sau khi mở đợt thử nghiệm người chơi để tinh chỉnh hệ số vàng/mảnh rèn bằng công cụ `Cân Bằng LiveOps` không cần sửa mã nguồn.

# IMPLEMENTATION CHANGELOG — NHẬT KÝ CẢI TIẾN & NGHIỆM THU (PHASE 4 & 6)

- **Ngày nghiệm thu**: 2026-11-24
- **Tổng điểm AAAA Scorecard**: **`7.94 / 10` → `8.65 / 10`** (+0.71 điểm trọng số trên 30 tiêu chí).

---

## 1. Danh Mục Thay Đổi Mã Nguồn Thực Tế (Trước → Sau)

### A. Tối Ưu Hóa Phần Cứng Yếu Dell Latitude E5430 & Anti-Flash (Workstream C)
- **`src/engine/zodiacLightingVfxDirector.ts`**: Thêm `DynamicPointLightPolicy` & `resolveDynamicPointLightPolicy(...)` quy định chặt chế độ **0 PointLights** (`totalScenePointLights = 0`) cho `lowEndGpu || isSoftwareGl || liteActive || graphicsQuality === 'low' || watchdogStage >= 2`, và hệ số giảm lóe sáng `flashScale = 0.25` khi bật Anti-Flash.
- **`src/engine/GameEngine.ts`**: Thêm `reduceScreenFlashEnabled` và `syncPointLightPolicy()` để tự động `scene.remove(...)` / `scene.add(...)` `heroLight` và `impactLightPool` theo cấu hình thực tế và trạng thái GPU Watchdog — chấm dứt việc Intel HD 4000 phải biên dịch fragment shader `NUM_POINT_LIGHTS = 3` ở Lite Mode.
- **`src/types/game.ts`, `src/data/liveOpsData.ts`, `src/components/SettingsModal.tsx`**: Thêm cài đặt độc lập `reduceScreenFlash` (**Giảm Chớp Sáng · Anti-Flash**) có lưu bền vững và đồng bộ tức thì vào engine.
- **`src/engine/zodiacLightingVfxDirector.test.ts`**: Bổ sung unit test xác minh chính sách 0-PointLight và Anti-Flash.

### B. Cân Bằng Chiến Đấu, Di Cư Save & Đồng Bộ Contract Chương 3–4 (Workstream A)
- **`src/types/game.ts`, `src/data/phase5Data.ts`, `src/engine/GameEngine.ts`**: Bổ sung hiệu ứng kỹ năng chủ động riêng `'jade_bastion'` cho **Sylvia (Kim Ngưu)** — tạo Khiên Địa Mạch 12% HP, sóng ngọc lục bảo và làm chậm mục tiêu trong vùng ảnh hưởng (tách khỏi `'ember_nova'` của Aurelia).
- **`src/data/earlyProgressionData.ts`**:
  - Sửa lỗi di cư thú cưỡi cũ (`azure_dragon`, `aries_steed`, v.v.) luôn quy về `'solarius'` thay vì `null`.
  - Sửa lỗi `migrateSaveData` tự động bổ sung các tướng đã mở theo `highestChapterCleared` (`Ch.2 Bellona`, `Ch.3 Sylvia`, `Ch.4 Celeste`) để giữ nguyên `selectedHeroId` sau reload.
- **`src/data/fairProgression30Day.ts`**: Đồng bộ bộ mô phỏng 30 ngày với Bộ Sưu Tập Ch.2–4 và hệ thống Endgame Wave 12–14 (`blessingAltar`, `mythicWeapon`, `soulRings`, `zodiacRelics`, `guildSanctuary`).
- **`src/data/assetRegistry.test.ts`, `src/data/earlyProgression.test.ts`**: Đồng bộ 100% kiểm định cho đủ 4 tướng Hoàng Đạo, 7 skin, thư mục Ch.3–4, Boss Codex Phase III và biên độ chỉ số Sylvia (`bonusHp: 230`) / Celeste (`bonusAtk: 58`).
- **`src/components/AuctionHouseModal.tsx`**: Gỡ 2 chấm trang trí `animate-pulse` cuối cùng để tuân thủ hoàn toàn chuẩn giao diện Zero-Pill / Anti-Slop.

### C. Mô Phỏng Kinh Tế 8 Mốc Thời Lượng `5m → 100h` (Workstream B)
- **`src/data/economyTelemetry.ts`** (mới): Mô phỏng tất định sử dụng công thức thực của game cho cả 8 mốc `5m, 15m, 30m, 1h, 3h, 10h, 30h, 100h`, tính toán Vàng/Kim Cương thu-chi, tỷ lệ Sink %, TTK Quái/Boss, Player TTD và cảnh báo tự động tồn kho Vàng Endgame (`53.5%` ở 100h).
- **`tools/simulate-playtime-milestones.ts`** (mới): Công cụ CLI xuất bảng cân bằng Markdown/JSON tái lập theo seed.
- **`src/data/economyTelemetry.test.ts`** (mới): Unit test kiểm chứng tính tất định, chống power-creep Ch.1, tăng trưởng đơn điệu và không bao giờ âm tiền tệ.

### D. Giám Sát Bất Thường An Ninh Máy Chủ & Gia Cố Save Integrity (Workstream D)
- **`src/server/serverSecurity.ts`**: Bổ sung `SecurityAnomalyTracker` (ring buffer giới hạn 200 sự kiện cho 4 nhóm `rate_limit`, `ws_clamped`, `auth_invalid`, `admin_denied`) và callback `onRateLimited`.
- **`server.ts`**: Gắn `SecurityAnomalyTracker` vào toàn bộ rate limiter, hàm kẹp trần WS (`duel`, `guild_boss`, `bounty`, `guild_war`), chốt kiểm tra 401/403, và mở endpoint chỉ dành cho Admin xác thực `GET /api/admin/security-anomalies`.
- **`src/components/AssetAdminLiveOpsTab.tsx`**: Thêm bảng đọc-duy-nhất **Giám Sát Bất Thường & An Ninh Máy Chủ** chuẩn Zero-Pill + `tabular-nums` cho quản trị viên.
- **`src/data/saveIntegrity.ts`**: Đổi fallback sang `'aurelia'`, gia cố kẹp trần `level (1..120)`, `awakeningLevel (0..10)`, `heroStars (0..10)`, `pity (0..500)`, `starDust/scrolls/spiritCores`, và khử trùng lặp `claimedMailIds`/`deletedMailIds`.
- **`src/server/serverSecurity.test.ts` & `src/data/saveIntegrity.test.ts`** (mới): Kiểm chứng đầy đủ lớp phòng vệ server và toàn vẹn save.

### E. Trọn Bộ 10 Báo Cáo Kiểm Toán & Thiết Kế Chuẩn AAAA
1. `AAAA_GAME_AUDIT.md`
2. `AAAA_QUALITY_SCORECARD.md`
3. `GAME_DEVELOPMENT_ROADMAP.md`
4. `GAME_BALANCE_REPORT.md`
5. `GAME_PROGRESSION_DESIGN.md`
6. `PERFORMANCE_REPORT.md`
7. `SECURITY_AUDIT.md`
8. `QA_TEST_REPORT.md`
9. `ART_STYLE_GUIDE.md`
10. `IMPLEMENTATION_CHANGELOG.md`

---

## 2. Danh Sách Nghiệm Thu (Definition of Done)

- [x] Bảo toàn 100% dữ liệu lưu cũ và tính năng đang hoạt động của người chơi.
- [x] Chế độ Lite / Dell Latitude E5430 (Intel HD 4000) chạy đúng **0 PointLights** trong `THREE.Scene` trên toàn bộ 12 chương.
- [x] Tất cả 4 tướng Hoàng Đạo có 4 kỹ năng chủ động độc nhất (`ember_nova`, `thunder_arc`, `jade_bastion`, `moon_fan_mark`) trong biên cân bằng ±12% DPS.
- [x] Mô phỏng đủ 8 mốc thời lượng `5m → 100h` trên toán học thật, phân định rõ mô phỏng vs playtest người thật.
- [x] `firestore.rules` không bị phá vỡ và đạt **0 lỗi ESLint**.
- [x] `208 / 208` unit & integration tests (không phụ thuộc local GLB) đạt **100% PASS**.
- [x] TypeScript `tsc --noEmit` (lint) và Vite production build (`compile_applet`) đều sạch 0 lỗi.
- [x] Hoàn tất 10/10 báo cáo kiểm toán & thiết kế tại thư mục gốc kho mã nguồn.

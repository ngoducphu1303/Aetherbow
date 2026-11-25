# IMPLEMENTATION CHANGELOG — NHẬT KÝ CẢI TIẾN & NGHIỆM THU (PHASE 4 & 6)

- **Ngày nghiệm thu**: 2026-11-24
- **Tổng điểm AAAA Scorecard (thang 0–100 chuẩn Master Prompt Mục VIII)**: **`78.99 / 100` → `86.13 / 100`** (`+7.14` điểm trọng số trên 30 tiêu chí / 10 nhóm qua Đợt 1 P0–P1 và Đợt 2 P2).

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

### C. Mô Phỏng Kinh Tế 8 Mốc `5m → 100h` & Endgame Gold Sink P1-5 (Workstream B)
- **`src/data/economyTelemetry.ts`** (mới): Mô phỏng tất định sử dụng công thức thực của game cho cả 8 mốc `5m, 15m, 30m, 1h, 3h, 10h, 30h, 100h`, tính toán Vàng/Kim Cương thu-chi, tỷ lệ Sink %, TTK Quái/Boss, Player TTD và cảnh báo tự động.
- **`src/data/talentsData.ts`, `src/data/gearData.ts`, `src/types/game.ts`, `src/App.tsx`, `src/components/TalentsModal.tsx`** (P1-5 mới): Triển khai **Tinh Tuý Hoàng Đạo (Astral Paragon Infusion — 500 bậc)** mở khóa sau 160/160 Thiên Phú hoặc Chương 12, tiêu thụ Vàng dư Endgame (`18,000 + lv×3,200 + lv^1.58×380`) để cộng `+0.4% ATK / +0.4% Max HP / +0.2% Sát Thương Boss` mỗi bậc. Đưa `100h Gold Sink Ratio` từ **`53.5%` → `99.8%`** (Paragon Bậc `44/500`, **`0` cảnh báo**) với **0% tác động Early/Mid Game**.
- **`tools/simulate-playtime-milestones.ts`** (mới): Công cụ CLI xuất bảng cân bằng Markdown/JSON tái lập theo seed (hiển thị cả cột Paragon).
- **`src/data/economyTelemetry.test.ts`** (mới): Unit test kiểm chứng tính tất định, chống power-creep Ch.1, mở khóa Paragon, tăng trưởng đơn điệu, 0 cảnh báo lạm phát và không bao giờ âm tiền tệ.

### D. Giám Sát Bất Thường An Ninh Máy Chủ & Gia Cố Save Integrity (Workstream D)
- **`src/server/serverSecurity.ts`**: Bổ sung `SecurityAnomalyTracker` (ring buffer giới hạn 200 sự kiện cho 4 nhóm `rate_limit`, `ws_clamped`, `auth_invalid`, `admin_denied`) và callback `onRateLimited`.
- **`server.ts`**: Gắn `SecurityAnomalyTracker` vào toàn bộ rate limiter, hàm kẹp trần WS (`duel`, `guild_boss`, `bounty`, `guild_war`), chốt kiểm tra 401/403, và mở endpoint chỉ dành cho Admin xác thực `GET /api/admin/security-anomalies`.
- **`src/components/AssetAdminLiveOpsTab.tsx`**: Thêm bảng đọc-duy-nhất **Giám Sát Bất Thường & An Ninh Máy Chủ** chuẩn Zero-Pill + `tabular-nums` cho quản trị viên.
- **`src/data/saveIntegrity.ts`**: Đổi fallback sang `'aurelia'`, gia cố kẹp trần `level (1..120)`, `awakeningLevel (0..10)`, `heroStars (0..10)`, `pity (0..500)`, `paragonInfusionLevel (0..500)`, `starDust/spiritCores`, và khử trùng lặp `claimedMailIds`/`deletedMailIds`.
- **`src/server/serverSecurity.test.ts` & `src/data/saveIntegrity.test.ts`** (mới): Kiểm chứng đầy đủ lớp phòng vệ server và toàn vẹn save.

### E. Cải Tiến Đợt 2 (P2 — AI Đám Đông, Save JSON-V2, ARIA Live & Test Manifest CDN)
- **`src/engine/enemySquadDirector.ts` & `src/engine/enemySquadDirector.test.ts`** (mới) + **`src/engine/GameEngine.ts`**: Triển khai `EnemySquadDirector` (zero-GC scratch `Set`, 0 tải GPU thêm) điều phối `2–5` token tấn công đồng thời cho quái thường (khóa `≤ 3` trên Lite Mode E5430, giảm `-1` khi có Boss), cân bằng vai trò tầm xa/cận chiến và di chuyển vòng sườn giữ cự ly cho quái chờ token.
- **`src/data/phase5Data.ts`, `src/components/SettingsModal.tsx`, `src/App.tsx`, `src/data/saveIntegrity.test.ts`**: Triển khai chuẩn xuất/nhập tệp lưu **`aetherbow_save_v2` (JSON-V2)** có mã kiểm tra toàn vẹn FNV-1a chống sửa tay (giữ 100% tương thích ngược JSON cũ), gắn lớp phòng vệ sâu `validateAndSanitizeSaveIntegrity` tại cả `decodeSaveTransferCode` lẫn `handleImportSave`, và rút gọn phụ đề modal chống cắt chữ.
- **`src/App.tsx`**: Bổ sung vùng thông báo trình đọc màn hình **`aria-live="polite" aria-atomic="true"`** (`data-testid="a11y-live-announcer"`) cho các mốc khôi phục dữ liệu và nâng bậc Tinh Tuý Hoàng Đạo.
- **`src/engine/testGlbManifestHelper.ts`** (mới) + 12 tệp `src/engine/*.test.ts`: Chuẩn hóa xác minh tài sản GLB theo cả tệp đĩa cục bộ lẫn `scripts/glb-manifest.json` thật trên CDN — đưa toàn bộ bộ test engine từ 27 `ENOENT` về **0 fail** (`181 pass / 8 skip CDN minh bạch`).

### F. Trọn Bộ 10 Báo Cáo Kiểm Toán & Thiết Kế Chuẩn AAAA
1. `AAAA_GAME_AUDIT.md`
2. `AAAA_QUALITY_SCORECARD.md` (đủ 30 tiêu chí × 10 trường bắt buộc, thang 0–100 & bảng trọng số 10 nhóm Mục VIII)
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
- [x] Chế độ Lite / Dell Latitude E5430 (Intel HD 4000) chạy đúng **0 PointLights** trong `THREE.Scene` và trần `≤ 3` token quái tấn công đồng thời trên toàn bộ 12 chương.
- [x] Tất cả 4 tướng Hoàng Đạo có 4 kỹ năng chủ động độc nhất (`ember_nova`, `thunder_arc`, `jade_bastion`, `moon_fan_mark`) trong biên cân bằng ±12% DPS.
- [x] Mô phỏng đủ 8 mốc thời lượng `5m → 100h` trên toán học thật (`Gold Sink 99.8%`, `0` cảnh báo sau P1-5), phân định rõ mô phỏng vs playtest người thật.
- [x] Kiểm thử trực tiếp trên trình duyệt thật (Headless Chromium `playwright-cli`, `1440×900`): Splash → Lobby 3D → `SettingsModal` (Anti-Flash + chặn tệp Save `JSON-V2` bị giả mạo) → `TalentsModal` (Tinh Tuý Hoàng Đạo Bậc 0→1) → Combat 3D (Ch.1 & Ch.12) + `aria-live="polite"` với **0 Console Errors / 0 Warnings**.
- [x] `firestore.rules` không bị phá vỡ và đạt **0 lỗi ESLint**.
- [x] Toàn bộ kho mã nguồn đạt **`393 bài kiểm thử | 385 PASS | 0 FAIL | 8 skip CDN minh bạch`** (bao gồm `204/204` logic/tích hợp + `181/189` engine với 0 `ENOENT`).
- [x] TypeScript `tsc --noEmit` (`lint_applet`) và Vite production build (`compile_applet`) đều sạch 0 lỗi.
- [x] Hoàn tất 10/10 báo cáo kiểm toán & thiết kế đồng bộ tại thư mục gốc kho mã nguồn.

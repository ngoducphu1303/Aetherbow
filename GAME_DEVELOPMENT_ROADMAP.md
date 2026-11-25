# GAME DEVELOPMENT ROADMAP — LỘ TRÌNH PHÁT TRIỂN P0 → P3 (PHASE 3)

Tài liệu tổng hợp lộ trình kỹ thuật và nội dung cho **Aetherbow: Hoàng Đạo Trỗi Dậy**, phản ánh trung thực trạng thái sau **Đợt 1 (P0–P1), Đợt 2 (P2), Đợt 3 (Wave 3 Overhaul) và Đợt 4 (Zero-GC Projectile Broadphase & P2-3 Modularization)**.

---

## 1. Sơ Đồ Phụ Thuộc (Dependency Graph)

```text
[P0: 0-PointLight E5430 & Migration Fixes] ──► [P0: Full Unit/Integration Green Baseline]
                                                       │
       ┌───────────────────────────────────────────────┼──────────────────────────────────────────────┐
       ▼                                               ▼                                              ▼
[P1: 8-Milestone Economy & Paragon Sink]     [P1/P2: Security Monitor & JSON-V2]           [P2-1: 100% GLB High/Lite]
       │                                               │                                              │
       ▼                                               ▼                                              ▼
[Wave 3: 12 Bespoke Zodiac Music Themes]     [P2-4b: LiveOps Scheduled Events + Rules]     [Wave 3/4: Zero-GC SpatialHashGrid & P2-3 Projectile Physics]
       └───────────────────────────────────────────────┴──────────────────────────────────────────────┘
                                                       │
                                                       ▼
                        [P2-5b / P3-1 / P3-2: Ch.5-12 3D Assets, Physical E5430 Field QA & Redis Scale]
```

---

## 2. Chi Tiết Lộ Trình Theo Mức Ưu Tiên

### P0 — Ổn Định Nền Tảng, An Toàn Phần Cứng Yếu & Dữ Liệu Người Chơi (HOÀN THÀNH 5/5)

| Mã | Hạng mục | Tệp liên quan | Trạng thái |
|---|---|---|---|
| **P0-1** | **True 0-PointLight Lite Mode cho Dell Latitude E5430 / Intel HD 4000**: Tách hoàn toàn `heroLight` và `impactLightPool` khỏi `THREE.Scene` khi `lowEndGpu \|\| liteActive \|\| isSoftwareGl \|\| watchdogStage >= 2`. | `zodiacLightingVfxDirector.ts`, `GameEngine.ts` | **Hoàn thành & Đã test** |
| **P0-2** | **Sửa Lỗi Di Cư Save (Hero & Mount)**: Giữ `selectedHeroId` theo tướng mở qua tiến độ chương (`Ch.2–4`) và chuyển thú cưỡi cũ về `solarius`. | `earlyProgressionData.ts` | **Hoàn thành & Đã test** |
| **P0-3** | **Kỹ Năng Chủ Động Độc Nhất Cho Sylvia (`jade_bastion`)**: Địa Mạch Lục Bảo tạo khiên 12% HP + sóng ngọc làm chậm. | `game.ts`, `phase5Data.ts`, `GameEngine.ts` | **Hoàn thành & Đã test** |
| **P0-4** | **Đồng Bộ 100% Contract Kiểm Thử Toàn Kho Mã Nguồn**: Toàn bộ suite logic, dữ liệu, âm thanh, bảo mật, engine đạt **0 fail**. | `src/**/*.test.ts`, `tests/*.test.mjs` | **Hoàn thành & Đã test** |
| **P0-5** | **Xác Minh & Triển Khai Firestore Rules 0 Lỗi**: 7 blueprint bảo mật nghiêm ngặt, `npx eslint firestore.rules` = 0 lỗi, đã deploy live. | `firestore.rules`, `firebase-blueprint.json` | **Hoàn thành & Đã deploy** |

---

### P1 — Cân Bằng Kinh Tế, Giám Sát An Ninh & Tiếp Cận (HOÀN THÀNH 5/5)

| Mã | Hạng mục | Tệp liên quan | Trạng thái |
|---|---|---|---|
| **P1-1** | **Mô Phỏng Kinh Tế 8 Mốc Thời Lượng (`5m → 100h`) & CLI Tái Lập**: Chạy toán học thật của game cho cả hồ sơ `average` và `unlucky`. | `src/data/balanceSimulation.ts`, `src/data/onboardingAndMasteryData.ts`, `tools/simulate-playtime-milestones.ts` | **Hoàn thành & Đã test** |
| **P1-2** | **Giám Sát Bất Thường & An Ninh Máy Chủ**: `SecurityAnomalyTracker` (ring buffer 200), `GET /api/admin/security-anomalies`, bảng đọc-duy-nhất trên Admin LiveOps Tab. | `src/server/serverSecurity.ts`, `server.ts`, `AssetAdminLiveOpsTab.tsx` | **Hoàn thành & Đã test** |
| **P1-3** | **Gia Cố Save Integrity**: Kẹp trần tiền tệ, `starDust`, `paragonInfusionLevel`, dọn UID trang bị treo, xác thực `chapterMilestones` và `discoveredEvolutions`. | `src/data/saveIntegrity.ts`, `tests/security-hardening.test.mjs` | **Hoàn thành & Đã test** |
| **P1-4** | **Anti-Flash (`reduceScreenFlash`) & Zero-Pill UI**: Công tắc giảm 75% xung lóe sáng độc lập với giảm chuyển động; gỡ chấm `animate-pulse` cuối cùng. | `game.ts`, `liveOpsData.ts`, `SettingsModal.tsx`, `AuctionHouseModal.tsx` | **Hoàn thành & Đã test** |
| **P1-5** | **Endgame Gold Sink (60h–100h+) — "Tinh Tuý Hoàng Đạo (500 bậc)"**: Hấp thụ triệt để Vàng dư Endgame (`1.76B` tổng sink > `13.45M` Vàng 100h) với 0% ảnh hưởng Early/Mid Game. | `talentsData.ts`, `gearData.ts`, `TalentsModal.tsx`, `App.tsx` | **Hoàn thành & Đã test** |

---

### P2 — Kho Tài Sản 3D, Vật Lý Zero-GC, AI Đám Đông, Âm Nhạc 12 Chương & LiveOps Tự Động

| Mã | Hạng mục | Mục tiêu đo lường | Trạng thái |
|---|---|---|---|
| **P2-1** | **Đạt 100% Cặp High/Lite Trong `glb-manifest.json`**: `63/63` cặp đầy đủ (`100%`), `0` lỗi / `0` cảnh báo, `status: healthy`, `e5430Safe: true`. | `pairCoveragePct === 100%`, `issues.length === 0` | **Hoàn thành & Đã xác minh** |
| **P2-2** | **Tách Bộ Test GLB Local vs CDN Manifest (`testGlbManifestHelper.ts`)**: Xác minh thực thể thật trong `scripts/glb-manifest.json`, 0 `ENOENT`. | 0 `ENOENT` / 0 fail trên toàn bộ bộ test engine | **Hoàn thành & Đã test** |
| **P2-3a** | **Zero-GC Spatial Hash Grid & Trích Xuất Mô-đun `projectilePhysicsSystem.ts`**: Tách vật lý đạn, nảy tường/trụ, bám mục tiêu và va chạm `SpatialHashGrid` (cả đội hình lẫn đạn/AoE) khỏi `GameEngine.ts`, đo benchmark thực tế nhanh hơn **8.09×** và triệt tiêu **18,000 cấp phát mảng/giây**. | Benchmark 300×40×600 pass 100% parity, nhanh hơn ≥ 5× | **Hoàn thành & Đã đo (Đợt 3–4)** |
| **P2-4a** | **Chuẩn Lưu JSON-V2 (`aetherbow_save_v2`) có FNV-1a Checksum**: Chống sửa tay tệp xuất `.JSON`, tương thích ngược 100% JSON cũ. | Chặn tệp sửa đổi live + unit test 100% | **Hoàn thành & Đã test** |
| **P2-4b** | **Hẹn Giờ Sự Kiện LiveOps Tự Động (`scheduledStartMs`/`scheduledEndMs`) & Presets**: Tự động kích hoạt trong khung giờ, hoàn nguyên 1.0× ngoài khung giờ, cập nhật & deploy `firestore.rules` + UI chọn lịch trên `AssetAdminLiveOpsTab.tsx`. | `liveops-config.test.mjs` pass 100% + rules deployed | **Hoàn thành & Đã deploy (Đợt 3)** |
| **P2-5a** | **AI Đám Đông Theo Token (`EnemySquadDirector`) & 12 Chủ Đề Nhạc Hoàng Đạo Độc Bản (`zodiacMusicDirector.ts`)**: Điều phối 2–5 token tấn công (`≤ 3` ở Lite), 12 giai điệu/âm giai/tempo chiến đấu & Boss riêng cho Ch.1–12. | `enemy-squad-director.test.mjs` & `zodiac-music-director.test.mjs` pass 100% | **Hoàn thành & Đã test (Đợt 2–3)** |
| **P2-3b** | **Tiếp Tục Tách Module Hóa `GameEngine.ts` & `App.tsx`**: Tách thêm `ArenaSceneBuilder` và `VfxPoolManager` để giảm thêm dung lượng tệp lõi theo từng lát cắt an toàn. | Giảm >25% dung lượng tệp lõi, 0 regression | Kế hoạch tiếp theo (3–4 ngày) |
| **P2-5b** | **Tài Sản 3D High/Lite Độc Bản Cho Chương 5–8 (Cự Giải → Bọ Cạp)**: Kèm Boss Phase III, tuân thủ ngân sách E5430 Lite `≤ 2.5 MB/entity`. | 100% cặp High/Lite Ch.5–8 | Theo lịch mỹ thuật 3D |

---

### P3 — Playtest Thực Địa, Mở Rộng Ch.9–12 & Scale Hạ Tầng

| Mã | Hạng mục | Mục tiêu đo lường | Trạng thái |
|---|---|---|---|
| **P3-3** | **Hỗ Trợ Tay Cầm Gamepad API & ARIA Live Regions**: Xác minh Gamepad API và bổ sung `aria-live="polite"` trong `App.tsx`. | Đạt chuẩn điều khiển đa thiết bị & tiếp cận | **Hoàn thành & Đã xác minh** |
| **P3-1** | **Kiểm Thử Thực Địa Trên Máy Vật Lý Dell Latitude E5430 & Playtest Người Thật**: Đo FPS 1% low, nhiệt độ GPU 60 phút liên tục và thu thập dữ liệu D1/D7/D30 thực tế. | 0 crash / 0 treo máy trong 60 phút, phản hồi FTUE thực tế | Chờ QA thực địa |
| **P3-2** | **Tích Hợp Tài Sản 3D Chương 9–12 (Nhân Mã → Song Ngư)**: Hoàn tất trọn bộ 12 bản đồ & Boss 3D độc bản High/Lite. | Đủ 12 bản đồ & Boss 3D riêng biệt | Theo lịch mỹ thuật 3D |
| **P3-4** | **Chuyển Rate Limiter & Anomaly Store Sang Redis (Khi Scale Multi-Instance)**: Đồng bộ giới hạn tốc độ xuyên cụm server khi mở rộng hàng nghìn CCU. | Đồng bộ multi-pod | Khi scale hạ tầng |

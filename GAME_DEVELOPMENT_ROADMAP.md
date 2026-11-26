# GAME DEVELOPMENT ROADMAP — LỘ TRÌNH PHÁT TRIỂN P0 → P3 (PHASE 3)

Tài liệu tổng hợp lộ trình kỹ thuật và nội dung cho **Aetherbow: Hoàng Đạo Trỗi Dậy**, phản ánh trung thực trạng thái sau **Đợt 1–9** (`P0`, `P1`, `P2-1 → P2-3f`, `P2-4a/b`, `P2-5a`) và **Đợt 10 (`P2-3g`: Tải GLB Streaming Chống Nghẽn + Tự Động Fallback High → Lite Toàn Diện, Không 404 Trên Vercel SPA, Triệt Tiêu Cấp Phát 60Hz Cơ Quan/Boss Hazard & Chẩn Đoán Hậu Thất Bại 12 Chương Theo Phím Tùy Biến — `91.11 / 100`, `467` bài kiểm thử / `0` lỗi)**.

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
[Wave 3-10: 12 Music, 7-State AI, Defeat Coach][P2-4b/W10: LiveOps Schedule & Zero-404 SPA][Wave 3-10: Zero-GC Pools & Universal GLB Idle-Timeout Fallback]
       └───────────────────────────────────────────────┴──────────────────────────────────────────────┘
                                                       │
                                                       ▼
                        [P2-5b / P3-1 / P3-2: Ch.5-12 GLB Art Expansion, Physical E5430 Field QA & Redis Scale]
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
| **P2-3a** | **Zero-GC Spatial Hash Grid & Trích Xuất Mô-đun `projectilePhysicsSystem.ts`**: Tách vật lý đạn, nảy tường/trụ, bám mục tiêu và va chạm `SpatialHashGrid` (cả đội hình lẫn đạn/AoE) khỏi `GameEngine.ts`, đo benchmark thực tế nhanh hơn **7.05×–8.09×** và triệt tiêu **18,000 cấp phát mảng/giây**. | Benchmark 300×40×600 pass 100% parity, nhanh hơn ≥ 5× | **Hoàn thành & Đã đo (Đợt 3–4)** |
| **P2-4a** | **Chuẩn Lưu JSON-V2 (`aetherbow_save_v2`) có FNV-1a Checksum**: Chống sửa tay tệp xuất `.JSON`, tương thích ngược 100% JSON cũ. | Chặn tệp sửa đổi live + unit test 100% | **Hoàn thành & Đã test** |
| **P2-4b** | **Hẹn Giờ Sự Kiện LiveOps Tự Động (`scheduledStartMs`/`scheduledEndMs`) & Presets**: Tự động kích hoạt trong khung giờ, hoàn nguyên 1.0× ngoài khung giờ, cập nhật & deploy `firestore.rules` + UI chọn lịch trên `AssetAdminLiveOpsTab.tsx`. | `liveops-config.test.mjs` pass 100% + rules deployed | **Hoàn thành & Đã deploy (Đợt 3)** |
| **P2-5a** | **AI Đám Đông Theo Token (`EnemySquadDirector`) & 12 Chủ Đề Nhạc Hoàng Đạo Độc Bản (`zodiacMusicDirector.ts`)**: Điều phối 2–5 token tấn công (`≤ 3` ở Lite), 12 giai điệu/âm giai/tempo chiến đấu & Boss riêng cho Ch.1–12. | `enemy-squad-director.test.mjs` & `zodiac-music-director.test.mjs` pass 100% | **Hoàn thành & Đã test (Đợt 2–3)** |
| **P2-3b** | **Trích Xuất `VfxPoolManager` Zero-GC, Cache Ngân Sách VFX Theo Frame, SFX Không Gian 3D & Biên Niên Sử 12 Chương**: Tách 8 vòng cập nhật VFX pool + `VfxFrameBudgetCache` khỏi `GameEngine.ts`, sửa lỗi wrap sương mù `-Z`, bổ sung SFX khoảng cách 3D / 4 âm sắc tướng / tiếng dội khiên và Biên Niên Sử 12 Chương trong Boss Codex. | `vfxPoolManager.test.ts` (4/4), `sfxSpatialAndTimbre.test.ts` (4/4), `zodiacWorldLore.test.ts` (2/2) pass 100% | **Hoàn thành & Đã test (Đợt 5)** |
| **P2-3c** | **Máy Trạng Thái 12 Hoạt Ảnh, Sửa Lỗi Boss Pha III Chương 1–4 & `LootOrbVisualCache` Zero-GPU-Churn**: Bổ sung `resolveCombatAnimState` (12 trạng thái chuẩn) + xung động học Lướt/Kỹ năng/Xuất trận/Gục ngã, sửa điều kiện Pha III Ch.1–4 + 12 cảnh báo khắc chế Boss Hoàng Đạo, và chia sẻ 2 geometry + 4 material cho toàn bộ vật phẩm rơi 3D. | `wave6AnimationAndBoss.test.ts` (5/5) pass 100% | **Hoàn thành & Đã test (Đợt 6)** |
| **P2-3d** | **Kiến Trúc Đền Thờ 3D Độc Bản Ch.5–12 (`zodiacRealmArchitecture.ts`), `GroundTelegraphVisualPool` Zero-GPU-Churn, Đệm Phím 5 Hành Động (`140ms`), 8 Phím Tắt PC Tùy Biến & Hiển Thị Đầy Đủ Bộ Sưu Tập Xem Thử 3D Trực Tiếp**: Xây dựng 8 cụm biểu tượng Hoàng Đạo 3D đa tầng ngoài vùng chiến đấu (`0 PointLights`, tự giảm đỉnh ở Lite), thay thế toàn bộ cấp phát GPU cho `arenaHazards` & `volatileBlasts` bằng pool dùng chung 2 hình học chuẩn, mở rộng đệm phím + tùy biến phím cho `Phá Giáp Trảm (F)` & `Thức Tỉnh Vũ Khí (X)` hiển thị trực tiếp trên HUD/Cài Đặt, và hiển thị đầy đủ 100% danh mục Tinh Linh/Cánh/Thú Cưỡi/Thánh Khí/Hào Quang Ch.1–4 kèm `Xem 3D`. | `zodiacRealmArchitecture.test.ts` (5/5), `chapterAssetVisibility.test.ts` (3/3), full suite 0 fail, live Chromium 0 lỗi | **Hoàn thành & Đã test (Đợt 7)** |
| **P2-3e** | **AI Quái 7 Trạng Thái Chiến Thuật, Phối Hợp Che Chắn Tiên Phong, Điều Hướng `SpatialHashGrid` Zero-GC, Dự Báo Tiến Hóa Kỹ Năng Tarot & So Sánh Trang Bị Song Song**: Nâng cấp `aaaEnemyCombatEngine.ts` lên đủ 7 trạng thái (`patrol`, `chase`, `flank`, `attack`, `retreat`, `dodge`, `recovery`) kèm cửa sổ `recovery` tỉ lệ theo Chương 1→12 (`0.24s–0.60s`), cơ chế xạ thủ/pháp sư lùi về sau đồng đội `vanguard` khi bị áp sát hoặc `< 35% HP`, chuyển cả 2 điểm gọi `computeAaaMobSteering` trong `GameEngine.ts` từ duyệt `O(N²)` sang `enemySpatialGrid.queryRadius` + `intactObstacleScratch` Zero-GC; hiển thị dự báo nhánh tiến hóa Boss/AoE trực tiếp trên thẻ Tarot `SkillDraftModal.tsx` (`getSkillEvolutionPreview`) và so sánh `ΔLC` / từng chỉ số / chuyển đổi Bộ 2–3 món (`computeGearComparison`) trong `LobbyPanels.tsx`. | `wave8TacticalAndProgression.test.ts` (4/4), `458 tests / 450 pass / 0 fail`, live Chromium 0 lỗi (`90.73/100`) | **Hoàn thành & Đã test (Đợt 8)** |
| **P2-3f** | **Bộ Đệm Khung Hình Chiến Đấu Zero-GC (`CombatFrameScratchPool`), Hợp Nhất Tiếp Cận HUD & Khử Overdraw Viền Thấp Máu, Biểu Ngữ 12 Boss Hoàng Đạo + Phím Tùy Biến**: Tạo `src/engine/combatScratchBuffers.ts` tái sử dụng toàn bộ mảng/đối tượng snapshot cho AutoPilot 60Hz, Co-op AI, Arena AI Rival né đạn và 3 bộ đệm AoE độc lập (`reaction` / `resonance` / `chain`) trong `GameEngine.ts`; gỡ lớp viền thấp máu trùng lặp trong `GameHUD.tsx` (giảm 50% fillrate overdraw `box-shadow`), nối `reduceScreenFlash` / `reducedMotion` / `colorblindTelegraphs` qua `resolveHudVisualFeedbackPolicy`, và đưa đủ 12 chữ ký Boss Pha II/III + phím tùy biến `ultKeyLabel`/`heavyBreakKeyLabel` lên `resolveTopCombatBanner`. | `wave9ZeroGcAndHud.test.ts` (3/3), `461 tests / 453 pass / 0 fail`, live Chromium 0 lỗi (`90.91/100`) | **Hoàn thành & Đã test (Đợt 9)** |
| **P2-3g** | **Tải GLB Streaming Chống Nghẽn + Fallback High → Lite Toàn Diện, Zero-404 Static SPA, Triệt Tiêu Cấp Phát 60Hz Còn Lại & Chẩn Đoán Hậu Thất Bại 12 Chương**: Bổ sung streaming 6 MiB khớp cache cạnh Cloudflare Worker + hoàn nguyên byte khi retry (`chapter1Map.ts`), tự động fallback `Chương 1.glb` → `Chương 1 Lite.glb` (`1.32 MB`) + nút `Vào ngay (Sân Đấu Nhẹ)` trên `SplashGate.tsx`, tạo `glbFetchResilience.ts` (`fetchGlbWithIdleTimeout` & `shouldSkipNodeApiEndpoints`) cho toàn bộ `chapter1Boss.ts` / `chapter1RosterAssets.ts` / `solarLeoAssets.ts` / `modelAssets.ts` / `liveAiSocket.ts` / `liveOpsConfigService.ts` + `VITE_STATIC_SPA=true` trên `vercel.json`; hoàn tất Zero-GC cho `chapterMechanismDataList`, `mechanismScanScratch` & `selectBossHazardSlot`; nối 12 chữ ký Boss + Cơ Quan Đấu Trường + phím tắt tùy biến vào `defeatDiagnostics.ts` & `PauseResultModal.tsx`. | `wave10ResilienceAndTactics.test.ts` (5/5), `467 tests / 459 pass / 0 fail`, Vercel static build & live Chromium 0 lỗi (`91.11/100`) | **Hoàn thành & Đã test (Đợt 10)** |
| **P2-5b** | **Tài Sản GLB High/Lite Độc Bản Cho Chương 5–8 (Cự Giải → Bọ Cạp)**: Mở rộng thêm mô hình quái/Boss GLB riêng bên cạnh kiến trúc đền thờ 3D Ch.5–12 đã có, tuân thủ ngân sách E5430 Lite `≤ 2.5 MB/entity`. | 100% cặp High/Lite Ch.5–8 | Theo lịch mỹ thuật 3D |

---

### P3 — Playtest Thực Địa, Mở Rộng Ch.9–12 & Scale Hạ Tầng

| Mã | Hạng mục | Mục tiêu đo lường | Trạng thái |
|---|---|---|---|
| **P3-3** | **Hỗ Trợ Tay Cầm Gamepad API & ARIA Live Regions**: Xác minh Gamepad API và bổ sung `aria-live="polite"` trong `App.tsx`. | Đạt chuẩn điều khiển đa thiết bị & tiếp cận | **Hoàn thành & Đã xác minh** |
| **P3-1** | **Kiểm Thử Thực Địa Trên Máy Vật Lý Dell Latitude E5430 & Playtest Người Thật**: Đo FPS 1% low, nhiệt độ GPU 60 phút liên tục và thu thập dữ liệu D1/D7/D30 thực tế. | 0 crash / 0 treo máy trong 60 phút, phản hồi FTUE thực tế | Chờ QA thực địa |
| **P3-2** | **Tích Hợp Tài Sản 3D Chương 9–12 (Nhân Mã → Song Ngư)**: Hoàn tất trọn bộ 12 bản đồ & Boss 3D độc bản High/Lite. | Đủ 12 bản đồ & Boss 3D riêng biệt | Theo lịch mỹ thuật 3D |
| **P3-4** | **Chuyển Rate Limiter & Anomaly Store Sang Redis (Khi Scale Multi-Instance)**: Đồng bộ giới hạn tốc độ xuyên cụm server khi mở rộng hàng nghìn CCU. | Đồng bộ multi-pod | Khi scale hạ tầng |

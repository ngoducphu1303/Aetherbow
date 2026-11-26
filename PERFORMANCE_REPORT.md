# PERFORMANCE REPORT — BÁO CÁO HIỆU NĂNG & AN TOÀN DELL LATITUDE E5430

- **Thiết bị chuẩn thấp (Baseline Target)**: Dell Latitude E5430 (Intel Core i5-3320M / GPU tích hợp **Intel HD Graphics 4000** / 4–8 GB RAM / màn hình 1366×768).
- **Trạng thái nghiệm thu phần mềm**: **ĐẠT CHUẨN AN TOÀN E5430 (`e5430Safe: true`, 0 PointLights ở Lite Mode gồm cả VFX Chữ Ký 4 Tướng & Boss Pha II/III, Watchdog 5 cấp, 100% cặp GLB High/Lite, tăng tốc 8.09× va chạm đạn Zero-GC, tích hợp sẵn Bộ Đo Benchmark 15s/60s FPS 1% Low xuất JSON)**.
- **Lưu ý trung thực**: Các số liệu CPU/GC dưới đây được đo trực tiếp bằng benchmark tái lập `npx --yes tsx tools/benchmark-spatial-physics.ts`, kiểm định `validateGlbPipelineManifest(scripts/glb-manifest.json)`, và kiểm chứng sống Headless Chromium (`0 PointLights`, `76` draw calls). Từ Đợt 12, game tích hợp sẵn **Bộ Đo Benchmark 15s / 60s** trong `Cài Đặt` để QA xuất JSON đo FPS 1% low trực tiếp trên phần cứng thật; số liệu nhiệt độ & độ bền 60 phút trên laptop vật lý Dell Latitude E5430 vẫn được ghi nhận trung thực là **chờ QA thực địa (P3-1)**.

---

## 1. Đo Hiệu Năng Trước & Sau: Vật Lý Đạn & Đội Hình Zero-GC (`SpatialHashGrid` + `projectilePhysicsSystem.ts`)

### Trước cải tiến
- Trong `src/engine/GameEngine.ts`, vòng lặp `updateProjectiles` sử dụng `for (const e of [...this.enemies])` (duyệt `O(P × E)` và cấp phát mảng mới trên từng viên đạn mỗi khung hình), đồng thời gọi `evaluateActiveSynergies(this.activeSkills)` ngay bên trong nhánh trúng đạn; `updateEnemies`, `updateOrbitOrbs`, `updateElementalZones` cũng tạo bản sao mảng mới liên tục trên mỗi khung hình.

### Sau cải tiến (Đã triển khai & đo thực tế)
- Triển khai **`SpatialHashGrid<T>`** (`src/engine/spatialHashGrid.ts`, tự theo dõi `maxInsertedRadius` nên không bao giờ bỏ sót Boss khổng lồ bán kính `> 2.5u`) và tách mô-đun vật lý thuần **`src/engine/projectilePhysicsSystem.ts`** (zero-GC scratch arrays, hoist `activeSynergies` ra ngoài vòng lặp).
- Kết quả đo thực tế từ **`node --import tsx tools/benchmark-spatial-physics.ts`** (`300 viên đạn × 40 quái × 600 khung hình` = 10 giây giao tranh dày đặc 60 FPS):

| Chỉ số đo thực tế | Trước (Legacy `[...enemies]` O(P×E)) | Sau (Zero-GC `SpatialHashGrid`) | Cải thiện thực tế |
|---|---:|---:|---|
| Tổng thời gian 600 khung hình | **742.76 ms** | **91.85 ms** | **Nhanh hơn 8.09×** |
| Thời gian CPU trung bình / khung hình | **1.2379 ms/frame** | **0.1531 ms/frame** | **Giảm 87.6% tải CPU va chạm** |
| Tổng số lần trúng đạn chính xác | **49,332** | **49,332** | **Trùng khớp 100% (0 sai số)** |
| Cấp phát mảng rác trên Heap | **180,000 mảng** (18,000/giây) | **0 mảng** (tái dùng scratch buffer) | **Triệt tiêu 100% GC churn vòng đạn** |

---

## 2. Khắc Phục Lỗi Nghiêm Trọng P0: True 0-PointLight Shader Mode

- Trong `src/engine/zodiacLightingVfxDirector.ts` (`resolveDynamicPointLightPolicy`) và `src/engine/GameEngine.ts` (`syncPointLightPolicy()`):
  - Khi `lowEndGpu || isSoftwareGl || liteActive || graphicsQuality === 'low' || watchdogStage >= 2`: toàn bộ `heroLight` và `impactLightPool` bị **`this.scene.remove(...)`** khỏi scene graph → Three.js biên dịch shader với **`NUM_POINT_LIGHTS = 0`** (chỉ còn 1 Directional Key + 1 Hemisphere Light nhẹ).
  - Khi bật **Giảm Chớp Sáng (`reduceScreenFlash`)**: giảm cường độ xung đèn lóe xuống **25%** (`flashScale = 0.25`).

---

## 3. Cơ Chế Bảo Vệ Toàn Hệ Thống (Áp Dụng Cả 12 Chương)

| Lớp bảo vệ | Tệp triển khai | Hành vi trên Dell Latitude E5430 / GPU yếu |
|---|---|---|
| **Auto-Detect Phần Cứng** | `src/engine/aaaVisualPipeline.ts`, `gpuThermalWatchdog.ts` | Nhận diện Intel HD 4000 (`lowPowerLegacyGpu`, `deviceTier: 'lite'`), SoftwareGL (SwiftShader/llvmpipe), RAM thấp hoặc Crash Sentinel latch → khởi động ngay ở **Watchdog Stage ≥ 2**. |
| **Zero-PointLight Shader Policy, Ch.1–12 Celestial Portal Arch (Đợt 16), Ch.5–12 Lite Landmarks / Shrines / Boss Regalia & Signature + Tactical Impact VFX Pool** | `wave16BossAndPortal.ts`, `zodiacLightingVfxDirector.ts`, `zodiacRealmArchitecture.ts`, `zodiacBossRegalia.ts`, `heroAndBossSignatureVfx.ts`, `GameEngine.ts` | Gỡ hoàn toàn 3 `PointLight` khỏi `THREE.Scene`, giữ `newPointLightsAdded: 0` trên cả 12 bảng màu Hoàng Đạo, **Cổng Tinh Đạo 3D Cổng Bắc 12 Chương (Đợt 16: 14 khối PBR `0.85` vs `0.24`, Lite giảm đỉnh nghiêm ngặt, 0 PointLights, Zero-GC, giải phóng GPU sạch)**, 8 cụm kiến trúc + phù điêu + Thánh Vật kể chuyện + giáp Boss Ch.5–12, và trọn bộ `HeroAndBossSignatureVfxPool` bao gồm **3 VFX Va Chạm Chiến Thuật Đợt 16 (`riposte_lance`, `wall_slam_burst`, `boss_phase3_eruption`, trần `<= 3` slot Lite, 0 PointLights)**. |
| **GPU Thermal Watchdog (Stage 0 → 4)** | `src/engine/gpuThermalWatchdog.ts` | Tự hạ DPR cap (xuống `0.70` ở Stage 4 Emergency Lite), tắt ShadowMap, Bloom, Starfall Weather, giảm mật độ hạt (`particleBudgetScale`), hạ âm thanh đa kênh (`setLowEndAudioMode`, khóa `extraOscillatorCap <= 1` ở nhạc động), và lưu Crash Sentinel latch. |
| **Zero-GC Spatial Broadphase, Boss Entrance Pose (Đợt 16), Cached Synergy Tiers (Đợt 14), Wall-Slam Physics (Đợt 15), VFX Pool Manager & `GroundTelegraphVisualPool`** | `spatialHashGrid.ts`, `projectilePhysicsSystem.ts`, `wave16BossAndPortal.ts`, `wave15CombatSystems.ts`, `aaaEnemyCombatEngine.ts`, `vfxPoolManager.ts`, `GameEngine.ts` | Tái dùng cell bucket + scratch buffer cho đội hình quái, đạn, cầu xoay, vùng nguyên tố và `computeAaaMobSteering`; **Đợt 16 biên đạo Khai Màn Boss 12 Cung (`stepBossEntrancePose`) tái dùng tuyệt đối biến đệm `out` (`0` cấp phát GC, `reducedMotion = 0.25×`)**; Đợt 14 cache `activeSynergyTiersCache`; Đợt 15 `evaluateWallSlamImpact` tái dùng `wallSlamScratch` & `intactObstacleScratch`; `LootOrbVisualCache` & `GroundTelegraphVisualPool` dùng chung hình học chuẩn (`0` cấp phát GPU trong trận). |
| **Zero-GC Combat Frame Scratch Pool (`CombatFrameScratchPool` & `selectBossHazardSlot`)** | `src/engine/combatScratchBuffers.ts`, `src/engine/GameEngine.ts` | Đợt 9–10 thay thế toàn bộ `.filter().map()`, `[...this.enemies]`, `.map()` 60Hz ở vòng Cơ Quan Đấu Trường (`chapterMechanismDataList` + `mechanismScanScratch`), và `.reduce()/.find()/.filter().sort()` trong `spawnBossHazardZone` (bằng 1 lượt quét tuyến tính `selectBossHazardSlot` tôn trọng trần Lite), duy trì 0 cấp phát đối tượng/mảng trên vòng nóng 60Hz (kiểm định 600 khung hình tại `wave9ZeroGcAndHud.test.ts` & `wave10ResilienceAndTactics.test.ts`). |
| **Streaming GLB 6 MiB, Idle-Timeout & Tự Động Fallback High → Lite** | `src/engine/glbFetchResilience.ts`, `chapter1Map.ts`, `modelAssets.ts`, `chapter1Boss.ts`, `chapter1RosterAssets.ts`, `solarLeoAssets.ts` | Đợt 10 tải streaming theo từng gói khớp cache cạnh 6 MiB Cloudflare Worker, tự động lùi `Chương 1.glb` (`90.36 MB`) về `Chương 1 Lite.glb` (`1.32 MB`) và tự động lùi High → Lite trên toàn bộ Hero/Boss/Quái/Sưu tầm khi gặp nghẽn mạng hoặc idle-timeout, giúp máy yếu và mạng chậm không bao giờ treo ở màn hình nạp. |
| **Single-Pass HUD Low-HP Vignette, Anti-Flash & 0-Blur Tactical/LiveOps UI (Đợt 15–16)** | `combatHudBanners.ts`, `GameHUD.tsx`, `TacticalCrossroadsModal.tsx`, `PreBattleBriefingModal.tsx`, `LiveOpsScheduleModal.tsx` | Đợt 9 gỡ bỏ lớp viền đỏ thấp máu trùng lặp (giảm 50% fillrate overdraw `box-shadow` ở HP ≤ 30% trên Intel HD 4000) và tắt lớp chớp gắt khi bật `reduceScreenFlash`; **Đợt 15–16 toàn bộ hộp thoại Ngã Rẽ Chiến Thuật, Tóm Tắt Chiến Thuật Trước Trận, Lịch Sự Kiện LiveOps, Bảng Khai Màn Boss 12 Cung và Phụ Đề Âm Thanh Chiến Đấu đều dùng nền đặc `#0d111a` (`0 backdrop-blur`, `0 animate-pulse`)**. |
| **Crowd Attack Token Cap, Vanguard-Screen AI & Enemy 3-Phase Choreography** | `src/engine/enemySquadDirector.ts`, `src/engine/aaaEnemyCombatEngine.ts`, `src/engine/combatAnimationKinematics.ts` | Khóa trần `≤ 3` quái thường tung đòn đồng thời ở Lite Mode; điều phối 7 trạng thái AI, cửa sổ `recovery`, che chắn tiên phong và biên đạo 3 pha Quái/Boss (`stepEnemyChoreography`) hoàn toàn trên CPU Zero-GC (`0` tải GPU / `0` PointLights thêm). |
| **Built-in 15s / 60s E5430 FPS 1% Low Benchmark Tool (Đợt 12)** | `src/engine/frameBenchmarkSampler.ts`, `src/components/SettingsModal.tsx`, `src/engine/GameEngine.ts` | Ghi nhận mẫu thời gian khung hình vào mảng tĩnh `Float32Array(7200)` (**0 cấp phát GC** trong suốt 60 giây đo), tính chính xác `avgFps`, `fps1Low`, `p95FrameMs`, `p99FrameMs`, khung jank `>33ms`/`>50ms`, Draw Calls, Triangles, số `PointLight` hoạt động, trạng thái Lite/Watchdog và GPU Renderer; hỗ trợ **Sao Chép JSON** & **Tải JSON** phục vụ QA thực địa P3-1. |

---

## 4. Kiểm Định Kho Tài Sản 3D High / Lite (`scripts/glb-manifest.json`)

Kết quả đo trực tiếp từ `validateGlbPipelineManifest(manifest)`:

| Chỉ số | Giá trị thực tế | Đánh giá |
|---|---:|---|
| Trạng thái tổng thể (`status`) | **`healthy`** | **ĐẠT CHUẨN** |
| An toàn Intel HD 4000 (`e5430Safe`) | **`true`** | **ĐẠT CHUẨN** |
| Tổng tệp GLB trên CDN (`totalManifestFiles`) | **173 tệp** | Backblaze B2 / Cloudflare Worker CDN |
| Tệp Runtime hoạt động (`activeFilesCount`) | **126 tệp** (`63 High · 63 Lite`) | Ch.1 (34), Ch.2 (28), Ch.3 (28), Ch.4 (28), Tướng chung (8) |
| Tỷ lệ đối cặp High / Lite (`pairCoveragePct`) | **`100%`** (`63 / 63` cặp đầy đủ) | **Đạt mục tiêu 100%** |
| Tổng dung lượng toàn bộ gói Lite hoạt động | **31.88 MB** (`33,431,296 bytes`) | Gọn nhẹ cho tải cuốn chiếu từng chương |
| Tệp Lite nặng nhất Chương 1–4 | **1.78 MB** (Ch.4) · Ch.1–3 `≤ 1.62 MB` | Tất cả đều dưới ngưỡng 2.5 MB |
| Tổng số cảnh báo / lỗi (`issues.length`) | **`0` lỗi · `0` cảnh báo** | Sạch 100% |

---

## 5. Bộ Đo Benchmark 15s / 60s E5430 Tích Hợp Trong Game (Đợt 12)

- **Vị trí truy cập**: `Cài Đặt` (`SettingsModal.tsx`) → khung **Kiểm Định Hiệu Năng 60 Giây (FPS 1% Low · E5430 Field QA)**.
- **Kiến trúc Zero-GC**: `FrameBenchmarkSampler` (`src/engine/frameBenchmarkSampler.ts`) cấp phát sẵn một bộ đệm `Float32Array(7200)` duy nhất cho tối đa 7,200 khung hình (60 giây ở 120Hz), đọc trực tiếp `deltaMs`, `renderer.info.render.calls` và `renderer.info.render.triangles` ngay trong vòng `GameEngine.startLoop` mà không tạo bất kỳ mảng hay đối tượng rác nào trong quá trình đo.
- **Tiêu chí phân loại kết quả (`FrameBenchmarkVerdict`)**:
  - `DAT_E5430_60FPS`: `avgFps >= 55` và `fps1Low >= 42`
  - `DAT_E5430_30FPS_ON_DINH`: `avgFps >= 30` và `fps1Low >= 24`
  - `CAN_TOI_UU_THEM`: dưới ngưỡng 30 FPS ổn định
- **Kiểm chứng trình duyệt sống (Headless Chromium `1440×900`)**: Đã xác minh trực tiếp chạy đo sống trên WebGL và chốt báo cáo với **`Draw Calls: 76 / 76`**, **`PointLights: 0`**, **`Lite: Bật`**, xuất đủ nút **`Sao Chép JSON`** và **`Tải JSON`** (`0` lỗi console, `0` cảnh báo). Số liệu FPS 1% low & nhiệt độ 60 phút trên laptop vật lý Dell Latitude E5430 sẽ được thu thập thực địa bằng chính công cụ này trong **P3-1**.

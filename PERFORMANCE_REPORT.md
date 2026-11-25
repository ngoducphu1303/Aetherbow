# PERFORMANCE REPORT — BÁO CÁO HIỆU NĂNG & AN TOÀN DELL LATITUDE E5430

- **Thiết bị chuẩn thấp (Baseline Target)**: Dell Latitude E5430 (Intel Core i5-3320M / GPU tích hợp **Intel HD Graphics 4000** / 4–8 GB RAM / màn hình 1366×768).
- **Trạng thái nghiệm thu phần mềm**: **ĐẠT CHUẨN AN TOÀN E5430 (`e5430Safe: true`, 0 PointLights ở Lite Mode, Watchdog 5 cấp, 100% cặp GLB High/Lite, tăng tốc 8.09× va chạm đạn Zero-GC)**.
- **Lưu ý trung thực**: Các số liệu CPU/GC dưới đây được đo trực tiếp bằng benchmark tái lập `node --import tsx tools/benchmark-spatial-physics.ts` và kiểm định trực tiếp `validateGlbPipelineManifest(scripts/glb-manifest.json)`. Kiểm thử FPS 1% low và nhiệt độ thực địa trên máy vật lý Dell Latitude E5430 được ghi nhận vào kế hoạch QA thực địa (P3-1).

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
| **Zero-PointLight Shader Policy** | `zodiacLightingVfxDirector.ts`, `GameEngine.ts` | Gỡ hoàn toàn 3 `PointLight` khỏi `THREE.Scene`, giữ `newPointLightsAdded: 0` trên cả 12 bảng màu Hoàng Đạo và 4 cơ quan sàn đấu. |
| **GPU Thermal Watchdog (Stage 0 → 4)** | `src/engine/gpuThermalWatchdog.ts` | Tự hạ DPR cap (xuống `0.70` ở Stage 4 Emergency Lite), tắt ShadowMap, Bloom, Starfall Weather, giảm mật độ hạt (`particleBudgetScale`), hạ âm thanh đa kênh (`setLowEndAudioMode`), và lưu Crash Sentinel latch. |
| **Zero-GC Spatial Broadphase & Pooling** | `spatialHashGrid.ts`, `projectilePhysicsSystem.ts`, `GameEngine.ts` | Tái dùng cell bucket + scratch buffer cho đội hình quái, đạn, cầu xoay, vùng nguyên tố và vật thể pooled (`arrows`, `orbs`, `particles`, `shockwaves`). |
| **Crowd Attack Token Cap** | `src/engine/enemySquadDirector.ts` | Khóa trần `≤ 3` quái thường tung đòn đồng thời ở Lite Mode (0 tải GPU thêm). |

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

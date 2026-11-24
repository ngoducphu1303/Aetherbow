# PERFORMANCE REPORT — BÁO CÁO HIỆU NĂNG & AN TOÀN DELL LATITUDE E5430

- **Thiết bị chuẩn thấp (Baseline Target)**: Dell Latitude E5430 (Intel Core i5-3320M / GPU tích hợp **Intel HD Graphics 4000** / 4–8 GB RAM / màn hình 1366×768).
- **Trạng thái nghiệm thu phần mềm**: **ĐẠT CHUẨN AN TOÀN E5430 (`e5430Safe: true`, 0 PointLights ở Lite Mode, Watchdog 5 cấp)**.
- **Lưu ý trung thực**: Các chỉ số dưới đây đến từ kiểm toán kiến trúc shader, bộ kiểm định kho GLB (`glbPipelineValidator.ts`) và unit test logic ngân sách GPU. Kiểm thử FPS 1% low và nhiệt độ thực địa trên máy vật lý E5430 được ghi nhận vào kế hoạch QA thực địa (P3-1).

---

## 1. Khắc Phục Lỗi Nghiêm Trọng P0: True 0-PointLight Shader Mode

### Trước cải tiến
- Trong `src/engine/GameEngine.ts` (khởi tạo scene), `this.heroLight` (`THREE.PointLight`) và 2 đèn trong `this.impactLightPool` (`THREE.PointLight`) luôn được gọi `this.scene.add(...)` vô điều kiện kể cả khi đang chạy Lite Mode / Intel HD 4000 / SoftwareGL.
- Hệ quả kỹ thuật trên WebGL / Three.js: Chỉ cần tồn tại 3 `PointLight` trong scene graph (dù `intensity = 0`), Three.js vẫn biên dịch macro `#define NUM_POINT_LIGHTS 3` vào mọi fragment shader `MeshStandardMaterial`, buộc Intel HD 4000 chạy thêm 3 vòng lặp tính ánh sáng điểm cho từng pixel mỗi khung hình — nguy cơ gây tụt FPS sâu, treo driver (TDR) hoặc đen màn hình trên laptop yếu.

### Sau cải tiến (Đã triển khai & kiểm chứng)
- Xây dựng hàm thuần **`resolveDynamicPointLightPolicy(...)`** trong `src/engine/zodiacLightingVfxDirector.ts` và phương thức **`syncPointLightPolicy()`** trong `src/engine/GameEngine.ts`:
  - Khi `lowEndGpu || isSoftwareGl || liteActive || graphicsQuality === 'low' || watchdogStage >= 2`:
    - `enableHeroLight = false`
    - `maxImpactPointLights = 0`
    - `totalScenePointLights = 0`
    - `this.heroLight` và toàn bộ `impactLightPool` bị **`this.scene.remove(...)`** khỏi scene graph → Three.js biên dịch shader với **`NUM_POINT_LIGHTS = 0`** (chỉ còn Directional Key + Hemisphere Light nhẹ).
  - Đồng bộ tức thì khi khởi tạo, khi người chơi đổi cài đặt (`applyRuntimeSettings`), và ngay khi **GPU Thermal Watchdog** nâng lên cấp ≥ 2.
  - Trên máy cấu hình cao bật **Giảm Chớp Sáng (`reduceScreenFlash`)**: giới hạn còn 1 impact light và giảm cường độ xung lóe xuống **25%** (`flashScale = 0.25`).

---

## 2. Cơ Chế Bảo Vệ Toàn Hệ Thống (Áp Dụng Cả 12 Chương)

| Lớp bảo vệ | Tệp triển khai | Hành vi trên Dell Latitude E5430 / GPU yếu |
|---|---|---|
| **Auto-Detect Phần Cứng** | `src/engine/gpuProfile.ts` | Nhận diện Intel HD 3000/4000/4400, SoftwareGL (SwiftShader/llvmpipe), RAM thấp (`deviceMemory <= 4`) hoặc Crash Sentinel latch → tự bật `liteActive = true`. |
| **Zero-PointLight Shader Policy** | `zodiacLightingVfxDirector.ts`, `GameEngine.ts` | Gỡ hoàn toàn 3 `PointLight` khỏi `THREE.Scene`, chuyển ánh sáng sang 1 Key Directional + 1 Hemisphere (12 bảng màu Hoàng Đạo có `newPointLightsAdded: 0`). |
| **GPU Thermal Watchdog (Stage 0 → 4)** | `src/engine/gpuThermalWatchdog.ts` | Tự hạ DPR cap, tắt ShadowMap, tắt Bloom, tắt Starfall Weather, hạ mật độ hạt (`particleDensityScale` xuống tới `0.16`), tách PointLight từ Stage ≥ 2, hạ âm thanh đa kênh (`setLowEndAudioMode`), và lưu Crash Sentinel latch nếu nghẽn kéo dài. |
| **Dynamic VFX & Crowd Throttle** | `zodiacLightingVfxDirector.ts`, `vfxBudgetGovernor.ts` | Tự cắt giảm số hạt mỗi đợt (`22 → 11 → 4`) và số shockwave tối đa (`10 → 5 → 2`) khi đông quái (`>= 18` thực thể). |
| **Object Pooling & Disposal** | `src/engine/GameEngine.ts` | Tái sử dụng pool đạn, hạt, shockwave, impact light; giải phóng bản đồ GLB khi đổi chương; `dispose()` dọn tài nguyên WebGL sạch sẽ. |
| **Lazy Preload & Chunked Streaming** | `src/App.tsx`, `server.ts` | Chỉ nạp trước tướng đang chọn (`lazyPreloadOnlyActiveHero: true`), ưu tiên biến thể Lite; map Chương 1 dung lượng lớn hỗ trợ stream chia mảnh `≤ 6 MiB` tránh vượt trần 32 MiB của Cloud Run. |

---

## 3. Kiểm Định Kho Tài Sản 3D High / Lite (`scripts/glb-manifest.json`)

Kết quả đo trực tiếp từ `validateGlbPipelineManifest(manifest)`:

| Chỉ số | Giá trị thực tế | Đánh giá |
|---|---:|---|
| Tổng tệp GLB hoạt động trên CDN | **173 tệp** | B2 / Cloudflare Worker CDN |
| Số tệp High / Lite | **58 High · 64 Lite** | Đủ cặp cho toàn bộ quái/boss/tướng chính Ch.1–4 |
| Tỷ lệ đối cặp High / Lite | **87.7%** (`57` cặp đầy đủ) | Đạt mức khá; mục tiêu P2-1 nâng lên ≥ 98% |
| An toàn Intel HD 4000 (`e5430Safe`) | **`true`** (0 lỗi nghiêm trọng) | **ĐẠT CHUẨN** |
| Tổng dung lượng toàn bộ gói Lite | **32.29 MB** | Rất gọn cho tải cuốn chiếu từng chương |
| Tệp Lite lớn nhất hiện tại | **3.47 MB** (`hatsune-miku-lite.glb`) | Tệp legacy không nằm trong 4 tướng hoạt động; cảnh báo nhẹ (> 2.5 MB soft cap) |
| Tổng số cảnh báo / lỗi nghiêm trọng | **9 cảnh báo · 0 lỗi nghiêm trọng** | Gồm `aries-arena-high.glb` thiếu cặp cùng tên trong `Runtime/` và 7 tệp Lite-only legacy Ch.1–2/heroes |

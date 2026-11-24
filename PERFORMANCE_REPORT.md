# PERFORMANCE REPORT — TỐI ƯU HIỆU NĂNG TOÀN HỆ THỐNG & CHẾ ĐỘ LITE (DELL LATITUDE E5430)

## 1. Mục Tiêu Tương Thích Phần Cứng Yếu

Toàn bộ cơ chế nhận diện phần cứng (`src/engine/hardwareProfile.ts`) và chế độ **Lite** áp dụng đồng bộ trên **mọi chương (Chương 1–4 & tương lai), mọi đấu trường, mọi mô hình tướng/quái/boss và hiệu ứng VFX** nhằm ngăn tình trạng quá tải GPU/VRAM, đen màn hình, treo máy hoặc sập nguồn trên các laptop cấu hình thấp như **Dell Latitude E5430 (Intel HD 4000 / RAM 4–8GB)**.

---

## 2. Số Liệu Tài Nguyên GLB Đo Thực Tế Sau Đồng Bộ

- Tổng số mô hình GLB hoạt động trên đĩa (`scripts/glb-manifest.json` sau đồng bộ): **137 tệp GLB** (tất cả đều có đối cặp High / Lite cho các tài nguyên nặng).
- Đã loại bỏ vĩnh viễn tệp thừa **`public/assets/mounts/black-dragon.glb` (12.5 MB)** và kiểm soát tự động bằng bài test `src/engine/blackDragonRide.test.ts`.
- Phân bổ dung lượng thư mục `public/assets` đo trực tiếp bằng `du -sh`:

| Thư mục tài nguyên | Dung lượng tổng (gồm High + Lite + WebP) | Chiến lược nạp trên Dell Latitude E5430 (Lite) |
|---|---:|---|
| `Chương 1` (Sư Tử Nhật Luân) | **206 MB** | Tự động chuyển sang biến thể Lite GLB, stream phân mảnh ≤ 6 MiB, không giữ buffer thô thừa sau khi parse |
| `Chương 2` (Hỏa Sơn Bạch Dương) | **41 MB** | Nạp lười (lazy-load) khi vào Chương 2 · dùng `Aries War-Forge Arena Lite.glb` & bộ quái Lite |
| `Chương 3` (Thánh Địa Kim Ngưu) | **29 MB** | Nạp lười khi vào Chương 3 · dùng `taurus-arena-lite.glb` & bộ quái Lite |
| `Chương 4` (Đấu Trường Song Tử) | **29 MB** | Nạp lười khi vào Chương 4 · dùng `gemini-arena-lite.glb` & 14 mô hình Lite (trong tổng 28 GLB Ch.4) |
| `heroes/` (Tướng & biến thể) | **70 MB** | Chỉ nạp đúng tướng đang chọn; không preload hàng loạt 4 chương lúc khởi động |

---

## 3. Các Cơ Chế Bảo Vệ GPU / RAM Đang Hoạt Động

1. **Khởi động siêu nhẹ (`startupModels`):** `src/engine/modelAssets.ts` chỉ preload duy nhất 1 mô hình đấu trường Chương 1 (bản Lite trên máy yếu) lúc khởi động, không tải toàn bộ kho GLB cùng lúc.
2. **Tự động điều chỉnh chất lượng theo cấu hình thực (`hardwareProfile.ts` & `GameEngine.ts`):**
   - Nhận diện CPU threads, RAM thiết bị, WebGL renderer (`Intel HD 4000`, `SwiftShader`, `llvmpipe`) để tự kích hoạt Lite Mode.
   - Giới hạn DPR, tắt UnrealBloom/Shadow nặng, thu nhỏ ngân sách hạt particle (`particleDensityScale`), giới hạn vòng nổ mortar & bụi chân (`aaaMobBudget`), và tôn trọng `reducedMotion` (tắt shockwave/rung màn hình khi Ngắt Chiêu).
3. **Giải phóng bộ nhớ khi đổi màn/chương:** Gọi `disposeObjectResources` & `discardChapter*MapDownload` để tránh rò rỉ VRAM khi chuyển qua lại giữa Sảnh và Chương 1–4.
4. **Hiệu năng AI & Chiến đấu mới:** `computeSquadCoordinationVector` và `evaluateCastInterrupt` sử dụng toán học vector thuần $O(N)$ không cấp phát đối tượng Three.js trong vòng lặp khung hình, tránh GC stutter.
5. **Kiểm tra Build Production:** `vite build` hoàn tất trong **~6 giây**, toàn bộ các modal phụ (Admin LiveOps, Asset Admin, Shop, Sự kiện) đều được lazy-load theo chunk riêng.

# ART STYLE GUIDE — ĐỊNH HƯỚNG NGHỆ THUẬT CHƯƠNG 1–4

## 1. Bản Sắc Nghệ Thuật Thống Nhất

**Aetherbow: Citadel Trial** theo đuổi phong cách **Celestial Zodiac Action-Fantasy**: tương phản rõ giữa nền đấu trường đá cổ/tinh giới có chiều sâu và các đường báo chiêu (telegraph), quỹ đạo mũi tên, hiệu ứng nguyên tố độ đọc cao. Mọi tài nguyên 3D đều có song song hai biến thể **High** và **Lite (Dell Latitude E5430)** cùng ảnh chân dung **WebP** nhẹ để giữ đồng nhất nghệ thuật ngay cả trên GPU tích hợp.

---

## 2. Bảng Màu & Ngôn Ngữ Thị Giác 4 Chương Hoàng Đạo

| Chương | Vùng đất & Chủ đề | Bảng màu chủ đạo | Tướng & Bộ sưu tập gắn kết | Ngôn ngữ Boss & Telegraph |
|---|---|---|---|---|
| **Chương 1** | **Thánh Điện Nhật Luân (Sư Tử)** | Vàng Thái Dương `#f59e0b`, Đá Cẩm Thạch ấm, Xanh Đêm `#0b1224` | Aurelia · Astraeo · Solarius · Cánh Nhật Đỉnh · Tinh Bàn Regulus | Sư Tử Nhật Luân — vòng lửa mặt trời, nhảy bổ quét cánh |
| **Chương 2** | **Hỏa Sơn Sừng Đỏ (Bạch Dương)** | Đỏ Dung Nham `#ef4444`, Đồng Cháy `#d97706`, Đá Hắc Diện `#1c1917` | Bellona · Pyro · Bộ Lông Cừu Vàng · Cánh Hỏa Dương · Vulcan · Tù Và Chiến Tranh | Kratos Hỏa Sơn — chùy dung nham, thiên thạch lửa, tường xung kích |
| **Chương 3** | **Thánh Địa Ngọc Lục Bảo (Kim Ngưu)** | Ngọc Lục Bảo `#10b981`, Vàng Cổ `#eab308`, Rêu Đá `#064e3b` | Sylvia · Ngọc Ngưu Con · Hóa Thân Vệ Nữ · Cánh Ngọc Kim Ngưu · Ngọc Ngưu · Tâm Ngọc | Địa Thần Kim Ngưu — sóng địa chấn, trụ ngọc bảo hộ, cú giậm 3 nhịp |
| **Chương 4** | **Đấu Trường Song Tử (Song Tử)** | Tinh Lam `#38bdf8`, Tím Gương `#a855f7`, Bạc Ánh Trăng `#e2e8f0` | Celeste · Song Linh Tinh Tú · Nữ Hoàng Song Kính · Song Dực · Thiên Phong Song Mã · Đồng Hồ Cát Song Sinh | Nữ Hoàng Gương Tinh Giới — tia khúc xạ đôi, biến ảnh, xoáy tinh giới |

---

## 3. Quy Chuẩn VFX, UI & Khả Năng Đọc Chiến Trường

- **Phân biệt rõ phe phái & trạng thái:**
  - Cảnh báo đòn địch: Đỏ/Cam rõ viền sàn, co dần theo thời gian thực.
  - Cửa sổ Phản Đòn (Punish Window): Vòng sáng Ngọc Lục Bảo dưới chân Boss.
  - **Ngắt Chiêu (Cast Interrupt):** Vòng xung kích Tinh Lam `#38bdf8` + nhãn nổi `NGẮT CHIÊU!` / `NGẮT CHIÊU BOSS!` (tự động lược bỏ shockwave khi bật `reducedMotion`).
- **Chuẩn UI/UX:**
  - Không dùng pill trang trí tràn lan; các chỉ số số học (CP, hệ số LiveOps, tiến độ `★0/4..★4/4`) dùng `tabular-nums` căn thẳng hàng.
  - Không dùng `backdrop-blur` nặng đè lên khung WebGL để bảo vệ FPS trên máy yếu.
  - Mọi thanh điều hướng nút hành động dùng `whitespace-nowrap` tránh vỡ dòng.

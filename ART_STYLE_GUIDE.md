# ART STYLE GUIDE — CHUẨN MỸ THUẬT, ÁNH SÁNG 12 CHƯƠNG & GIAO DIỆN

Tài liệu chuẩn hóa ngôn ngữ hình ảnh của **Aetherbow: Hoàng Đạo Trỗi Dậy**, đồng bộ 100% với mã nguồn `src/engine/zodiacLightingVfxDirector.ts`, `src/engine/colorblindTelegraphs.ts`, và quy chuẩn giao diện **Zero-Pill / High-Craft**.

---

## 1. Quy Tắc Ánh Sáng 60-30-10 & 12 Bảng Màu Hoàng Đạo (0 PointLights Mới)

Mỗi chương áp dụng phối màu **60% nền đấu trường/sương mù tối sâu — 30% kiến trúc trung tính — 10% điểm nhấn Hoàng Đạo rực sáng**, sử dụng duy nhất **1 Directional Key Light + 1 Hemisphere Light + Fog** (`newPointLightsAdded: 0` trên cả 12 chương):

| Chương | Cung Hoàng Đạo | Key Light | Hemi Sky / Ground | Fog Hex | Điểm Nhấn Kiến Trúc |
|---:|---|---|---|---|---|
| 1 | **Sư Tử Nhật Luân** | `#ffdf9e` | `#ffe4b5` / `#261d14` | `#16121f` | `#f59e0b` (Vàng Thái Dương) |
| 2 | **Hỏa Sơn Bạch Dương** | `#ffb07c` | `#f97316` / `#241210` | `#1f0f10` | `#f97316` (Cam Dung Nham) |
| 3 | **Thánh Địa Kim Ngưu** | `#d9f99d` | `#86efac` / `#0d261b` | `#0c1b18` | `#10b981` (Ngọc Lục Bảo) |
| 4 | **Đấu Trường Song Tử** | `#bce6ff` | `#7dd3fc` / `#1e1b4b` | `#10172b` | `#38bdf8` (Lam Tinh Vân) |
| 5 | **Nguyệt Triều Cự Giải** | `#c7d2fe` | `#93c5fd` / `#0f1d33` | `#0c1629` | `#60a5fa` (Xanh Hải Vực) |
| 6 | **Thánh Điện Xử Nữ** | `#fef3c7` | `#a7f3d0` / `#1c2520` | `#131d1d` | `#34d399` (Bích Thảo) |
| 7 | **Phán Quyết Thiên Bình** | `#fde68a` | `#e0e7ff` / `#221c33` | `#151428` | `#fbbf24` (Kim Cân Bằng) |
| 8 | **Vực Sâu Bọ Cạp** | `#f5d0fe` | `#c084fc` / `#210d24` | `#1a0c21` | `#c026d3` (Tử Độc Tinh) |
| 9 | **Tinh Nguyên Nhân Mã** | `#fed7aa` | `#fbbf24` / `#261a14` | `#1b1318` | `#fb923c` (Hổ Phách Sao Băng) |
| 10 | **Hàn Đỉnh Ma Kết** | `#e0f2fe` | `#bae6fd` / `#172030` | `#101826` | `#7dd3fc` (Băng Lam) |
| 11 | **Lôi Vực Bảo Bình** | `#a5f3fc` | `#38bdf8` / `#121d36` | `#0d172c` | `#22d3ee` (Lôi Điện) |
| 12 | **Thiên Hải Song Ngư** | `#e9d5ff` | `#818cf8` / `#161436` | `#11122e` | `#a855f7` (Tím Thiên Hà) |

---

## 2. Phân Tách Phe Phái VFX & Hỗ Trợ Mù Màu (`resolveFactionVfxPalette`)

Để người chơi đọc tình huống tức thì trong giao tranh đông đúc (kể cả khi bật chế độ Mù Màu):

| Phe | Hình Học Độc Nhất (`shapeToken`) | Màu Chuẩn | Màu Mù Màu (`colorblindSafe = true`) |
|---|---|---|---|
| **Người Chơi (Player)** | `crisp_diamond` (Kim Cương sắc nét) | Vàng Kim `#facc15` / Lam `#38bdf8` / Ngọc `#34d399` | Lam Sáng `#38bdf8` / Vàng Nhạt `#fef08a` / Trắng |
| **Quái Thường (Enemy)** | `crimson_ring` (Vòng Tròn cảnh báo) | Đỏ Thẫm `#ef4444` / Hồng Đỏ `#f43f5e` | Cam Ấm `#f97316` / Cam Sáng `#fb923c` |
| **Boss Hoàng Đạo** | `imperial_octagon` (Bát Giác Hoàng Gia) | Tím Hoàng Gia `#a855f7` / Đỏ Đô `#e11d48` | Tím Sáng `#e879f9` / Cam `#f97316` |

- **Anti-Flash (`reduceScreenFlash`)**: Giảm 75% cường độ xung đèn lóe sáng va chạm (`flashScale = 0.25`) mà vẫn giữ trọn đường viền telegraph rõ nét.

---

## 2b. Kiến Trúc Đền Thờ 3D Độc Bản Chương 5–12 (`src/engine/zodiacRealmArchitecture.ts` — Đợt 7)

Bên cạnh 4 đấu trường GLB độc bản của Chương 1–4, toàn bộ 8 Chương 5–12 sở hữu cụm kiến trúc Hoàng Đạo thủ tục đa tầng (`18–30+` mesh/chương, đặt an toàn ngoài vùng di chuyển chiến đấu hai bên sườn + Cổng Bắc, dùng chung vật liệu PBR, đĩa bóng tiếp xúc đáy, giảm phân đoạn tự động ở Lite Mode và **`0 PointLight` mới**):

| Chương | Cung | Biểu Tượng Kiến Trúc 3D (`archetype`) | Chuyển Động Zero-GC (`reducedMotion` = 0.25×) |
|---:|---|---|---|
| 5 | **Cự Giải** | *Thủy Triều Nguyệt Tháp* (`cancer_tidal_arch`) | Ngọc thủy triều bồng bềnh + vòng quỹ đạo nghiêng |
| 6 | **Xử Nữ** | *Nhật Khuê Thánh Điện* (`virgo_astral_sundial`) | Tinh bàn đồng hồ mặt trời xoay trục Y |
| 7 | **Thiên Bình** | *Cán Cân Công Lý Hoàng Kim* (`libra_golden_scales`) | Đòn cân vàng & hai đĩa pha lê đung đưa nhịp nhàng |
| 8 | **Hổ Cáp** | *Tháp Độc Thạch Hắc Diện* (`scorpio_obsidian_spire`) | Đốt tháp uốn cong hắc diện + mũi kim pha lê nhịp xung |
| 9 | **Nhân Mã** | *Khải Hoàn Cung Tinh Đạo* (`sagittarius_celestial_bow`) | Vòm cung khải hoàn + mũi tên sao vàng lơ lửng hướng thiên |
| 10 | **Ma Kết** | *Cự Thạch Sơn Đỉnh Cổ Đại* (`capricorn_summit_monolith`) | Đỉnh núi bậc thang + cặp sừng vàng + lõi cổ ngữ xoay |
| 11 | **Bảo Bình** | *Thiên Bình Tinh Lưu Khí* (`aquarius_starlight_amphora`) | Bình tinh không nghiêng rót dòng sao sáng vào đài |
| 12 | **Song Ngư** | *Song Ngư Mộng Cảnh Đài* (`pisces_twin_crescents`) | Hai vành trăng khuyết san hô/ngọc trai xoay quanh lăng kính |

---

## 3. Quy Chuẩn Tài Sản 3D High / Lite (Chuẩn Dell Latitude E5430)

- Mọi nhân vật, quái, Boss và bản đồ mới (Ch.5–12) khi bổ sung tài sản GLB bắt buộc xuất **đủ 2 biến thể** trong `Runtime/`:
  - `*-high.glb`: PBR đầy đủ cho GPU rời / máy tầm trung-cao.
  - `*-lite.glb`: Nén mesh + giảm texture ≤ 512–1024px, **mục tiêu ≤ 2.5 MB / thực thể**, không phụ thuộc shader ánh sáng điểm phức tạp.
- Mọi thay đổi kho GLB phải vượt qua `validateGlbPipelineManifest` với `e5430Safe === true`.

---

## 4. Chuẩn Giao Diện UI / HUD (Zero-Pill & Anti-Slop)

- **Zero-Pill Metadata**: Nhãn thông số tĩnh dùng chữ đậm sắc nét, đường phân cách mảnh `border-slate-800`, không bọc thẻ tròn màu mè rườm rà.
- **Không dùng chấm `animate-pulse` trang trí**: Toàn bộ chấm nhấp nháy trang trí giả trạng thái đã bị gỡ sạch (bao gồm `AuctionHouseModal.tsx`).
- **Số liệu thẳng hàng (`tabular-nums`)**: Bắt buộc áp dụng cho mọi bảng sát thương, LC, Vàng/Kim Cương, đồng hồ đếm ngược, bảng GLB và bảng An Ninh Admin.
- **Không `backdrop-blur` đè lên canvas WebGL 3D**: Tránh sụt FPS đột ngột trên trình duyệt dùng GPU tích hợp yếu (Intel HD 4000).
- **Hỗ trợ Cỡ Chữ 3 Mức**: Toàn bộ giao diện tôn trọng `rem` / tỷ lệ chữ `100% / 115% / 130%` mà không cắt chữ hay tràn khung.

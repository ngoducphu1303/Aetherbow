# GAME BALANCE REPORT — MÔ PHỎNG KINH TẾ & TĂNG TIẾN (5 PHÚT → 100 GIỜ)

**Nguồn đo đạc thực tế:** Chạy trực tiếp từ công thức thật của game (`simulate100HourJourney('average')` trong `src/data/balanceSimulation.ts`, gọi `createInitialSaveData`, `computePlayerStats`, `simulate30DayFairProgression`).

---

## 1. Đường Cong Sức Mạnh & Kinh Tế Đo Được (5 Phút → 100 Giờ)

| Mốc thời gian | Chương vượt | Lực chiến (CP) | Tháp cao nhất | Phẩm chất cao nhất | Tổng Vàng tích lũy | Tổng Ngọc Hồn tích lũy |
|---|---:|---:|---:|---|---:|---:|
| **Khởi điểm (0p)** | 0 | **702** | 0 | Thường (Common) | 0 | 0 |
| **5 phút** | 0 | **706** | 0 | Thường (Common) | 113 | 6 |
| **15 phút** | 0 | **715** | 0 | Thường → Hiếm (Ares Ải 4) | 338 | 17 |
| **30 phút** | 0 | **725** | 0 | Thường | 627 | 31 |
| **1 giờ** | 1 | **1,869** | 1 | Hiếm | 1,808 | 80 |
| **3 giờ** | 2 | **7,392** | 4 | Sử Thi | 18,063 | 363 |
| **10 giờ** | 5 | **44,937** | 18 | Huyền Thoại | 171,507 | 2,354 |
| **30 giờ** | 8 | **131,979** | 42 | Thần Thoại | 1,539,688 | 10,809 |
| **100 giờ** | 12 | **159,764** | 68 | Thần Thoại (Max +80) | 4,768,066 | 31,706 |

### Nhận xét cân bằng:
- **Giai đoạn 0–30 phút:** Lực chiến tăng êm từ `702 → 725 CP`, đảm bảo người chơi mới cảm nhận rõ từng đòn né và lựa chọn kỹ năng mà không bị quá mạnh.
- **Tác động của Mốc Sao ★1–★4:** Khi vượt Ải 12 Chương 2 lần đầu, người chơi chỉ mở ★1 (Bellona + Pyro), giữ lực chiến tăng trong ngưỡng an toàn (`< 1.6x` so với nền) thay vì nhảy vọt khi nhận cùng lúc 7 nguồn chỉ số (cánh, thú cưỡi, thánh khí, hào quang).
- **Khống chế Power Creep ở Endgame:** Từ 30 giờ (`131,979 CP`) lên 100 giờ (`159,764 CP`), tốc độ tăng trưởng hội tụ (`+21.1%`), ưu tiên tối ưu dòng phụ, synergy kỹ năng và trình độ điều khiển thay vì lạm phát chỉ số vô hạn.

---

## 2. Cân Bằng Chiến Đấu, Ngắt Chiêu & Boss 3 Giai Đoạn (Chương 1–4)

| Chương & Boss | Giai đoạn 1 (100–66% HP) | Giai đoạn 2 (65–31% HP) | Giai đoạn 3 (≤ 30% HP) | Thưởng Ngắt Chiêu |
|---|---|---|---|---|
| **Ch.1 · Vệ Thần Sư Tử Nhật Luân** | Nhịp `1.05x` · Phản Đòn `+18%` (1.85s) | Nhịp `0.92x` · Phản Đòn `+22%` (2.00s) | Nhịp `0.84x` · Phản Đòn `+26%` (2.20s) | +22% thanh Phá Giáp + Suy Yếu +20% (1.85s) |
| **Ch.2 · Kratos Hỏa Sơn** | Nhịp `1.00x` · Phản Đòn `+18%` (1.75s) | Nhịp `0.90x` · Phản Đòn `+22%` (1.90s) | Nhịp `0.82x` · Phản Đòn `+26%` (2.15s) | +22%–26% Phá Giáp + Suy Yếu +20% |
| **Ch.3 · Địa Thần Kim Ngưu** | Nhịp `1.04x` · Phản Đòn `+18%` (1.85s) | Nhịp `0.92x` · Phản Đòn `+22%` (2.00s) | Nhịp `0.84x` · Phản Đòn `+26%` (2.20s) | +22%–26% Phá Giáp + Suy Yếu +20% |
| **Ch.4 · Nữ Hoàng Gương Tinh Giới** | Nhịp `0.96x` · Phản Đòn `+19%` (1.75s) | Nhịp `0.88x` · Phản Đòn `+23%` (1.95s) | Nhịp `0.80x` · Phản Đòn `+27%` (2.25s) | +22%–28% Phá Giáp + Suy Yếu +20% |

- **Hồi chiêu chống lạm dụng Ngắt Chiêu:** Quái thường `2.2s`, Tinh Anh `3.5s`, Boss `5.5s`; đòn xoáy toàn sân (`spiral`) của Boss không bị hủy hoàn toàn nhưng vẫn thưởng Phá Giáp + Suy Yếu +20%.

---

## 3. Biên Kiểm Soát Cân Bằng Động (LiveOps Guardrails)

Mọi điều chỉnh từ tab **Cân Bằng LiveOps** đều bị chặn cứng ở cả client (`sanitizeLiveOpsConfig`), Express (`PUT /api/liveops/config`) và Firestore (`firestore.rules`):
- `goldRewardMult`: `0.50x .. 3.00x`
- `gemRewardMult`: `0.50x .. 2.50x`
- `forgeShardMult`: `0.50x .. 3.00x`
- `enemyHpMult` & `enemyDmgMult`: `0.60x .. 2.00x`
- `chestEpicRateBonus`: `-5% .. +20%` · `pitySoftCapOffset`: `-5 .. +5`

---

## 4. Kiểm Toán Đợt 3: 5 Hiệu Ứng Bộ Trang Bị Độc Nhất & Kinh Tế 100 Giờ (`evaluatePass3EconomyAndSetBalance`)

Kết quả đo trực tiếp từ mô-đun `src/data/onboardingAndMasteryData.ts` và `src/engine/gearSetCombatProcs.ts` (được kiểm chứng tự động trong `tests/gear-set-procs-and-100h-audit.test.mjs`):

| Chỉ số kiểm toán Đợt 3 | Giá trị đo thực tế | Ngưỡng nghiệm thu | Trạng thái |
|---|---:|---|---|
| **Lực chiến khởi điểm tài khoản mới** | **702 CP** | `702 CP` (không nhảy cóc) | **ĐẠT** |
| **Số hiệu ứng Bộ Trang Bị kích hoạt ở Bộ Khởi Đầu** | **0** | `0` (bảo toàn Chương 1) | **ĐẠT** |
| **Số Bộ Trang Bị Trung–Cuối Game có Hiệu Ứng Độc Nhất** | **5 bộ** | Đủ 5 bộ (`Destruction`, `Echo`, `Dragon Knight`, `Oracle`, `Griffin`) | **ĐẠT** |
| **Tỷ số chênh lệch điểm DPS giữa Bộ mạnh nhất / yếu nhất** | **1.26x** | `≤ 1.45x` (không bộ nào thống trị tuyệt đối) | **ĐẠT** |
| **Lực chiến mốc 100 giờ (`simulate100HourJourney`)** | **158,062 CP** | Hội tụ Endgame, chống Power Creep | **ĐẠT** |
| **Tổng Vàng kiếm được sau 100 giờ** | **4,726,963 Vàng** | Đối chiếu nguồn/tiêu thụ thực tế | **ĐẠT** |
| **Tổng nhu cầu tiêu thụ Vàng Endgame (Sink)** | **5,036,976 Vàng** | Tỷ lệ bao phủ **`107%` (`1.07x > 1.0x`)** — không lạm phát | **ĐẠT** |
| **Phát hiện chênh lệch giá Flash Deal (`flashDealArbitrageDetected`)** | **`false`** | Không có vòng lặp trục lợi vô hạn | **ĐẠT** |
| **TTK Chương 12 & Cân bằng lối chơi kỹ năng** | **`true` / `true`** | Đạt chuẩn chiến thuật Endgame | **ĐẠT** |

### Ma Trận 5 Hiệu Ứng Chiến Đấu Độc Nhất Của Bộ Trang Bị (Kèm Hồi Chiêu Nội Tại ICD)

| Bộ Trang Bị | Hiệu Ứng Độc Nhất | Điều kiện kích hoạt | Chỉ số (2 món / 3 món) | Hồi chiêu (ICD) |
|---|---|---|---|---:|
| **Bộ Hủy Diệt (`Destruction Set`)** | *Xung Kích Hủy Diệt* | Mỗi đòn Chí Mạng thứ 4 | Sóng lửa diện rộng `135% ATK` (bán kính `4.0m`) | `4.5s` |
| **Bộ Vọng Âm (`Echo Set`)** | *Mũi Tên Vọng Ảnh* | Mỗi loạt bắn thứ 5 | Bắn thêm 1 mũi tên xuyên thấu `85% ATK` (**`115% ATK`** ở 3 món) | `3.0s` |
| **Bộ Long Kỵ [S] (`Dragon Knight Set`)** | *Vảy Rồng Bất Khuất* | Né Hoàn Hảo hoặc trúng đòn khi `HP ≤ 50%` | Khiên `14% HP` (**`20%`** ở 3 món) + sóng lửa `120%` (**`145%`**) ATK | `7.5s` |
| **Bộ Tiên Tri Oracle [S] (`Oracle Set`)** | *Luồng Tinh Tri* | Ngắt Chiêu hoặc mỗi 12 đòn trúng | Hồi `+12%` (**`+18%`** ở 3 món) Nộ + `+18%` (**`+22%`**) Tốc Bắn (`3.5s`) | `6.0s` |
| **Bộ Điểu Sư [S] (`Griffin Set`)** | *Xé Gió Điểu Sư* | Sau khi Lướt Né (`Dash`) | Bắn tia gió xuyên thấu `140% ATK` + `+20%` Tốc Chạy (`2.5s`) | `4.5s` |


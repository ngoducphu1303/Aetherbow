# GAME BALANCE REPORT — BÁO CÁO CÂN BẰNG KINH TẾ & CHIẾN ĐẤU (PHASE 5)

- **Nguồn dữ liệu**: Mô phỏng tất định sử dụng công thức thực tế của trò chơi (`src/data/economyTelemetry.ts`, chạy qua `node --import tsx tools/simulate-playtime-milestones.ts`, `seed = 20260410`, `model = deterministic_seeded_model`).
- **Phân định trung thực**: Mọi số liệu dưới đây là **kết quả mô phỏng toán học có seed lặp lại được** từ hệ thống chỉ số thật (`computePlayerStats`, `CHAPTERS`, `TALENTS`, `computePowerPressure`, `getEarlyProgressionPolicy`, `Wave 12–14`), **KHÔNG thay thế cho dữ liệu playtest người chơi thật** (sẽ đo ở mốc P3-1).

---

## 1. Chỉ Số Nền Tài Khoản Mới (Fresh Account Baseline — Đã Xác Minh)

| Chỉ số | Giá trị thực tế | Ghi chú thiết kế |
|---|---:|---|
| Tướng khởi đầu | **Aurelia (Sư Tử)** | Mở khóa sẵn 100%, không cần quay Gacha |
| Lực chiến (Power Rating) | **702 LC** | Dưới ngưỡng Ch.1 (`1,350 LC`) để tạo động lực học nâng cấp sớm |
| ATK / Max HP / Crit / ASPD | **84 ATK / 461 HP / 14.5% / 1.08x** | Cân bằng giữa tốc độ bắn và khả năng chịu đòn 4–5 đòn đầu |
| Tiền tệ khởi điểm | **40 Vàng / 0 Kim Cương** | Không bơm tài nguyên ảo gây lạm phát đầu game |
| Trang bị khởi điểm | **2 món Thường (Common Lv.1)** | Vũ khí + Giáp khởi đầu |

---

## 2. Bảng Mô Phỏng 8 Mốc Thời Lượng (`5m → 100h`, Seed `20260410` — Sau Triển Khai P1-5)

| Mốc | Pha Trải Nghiệm | Chương Đã Vượt | Tháp Vô Tận | Lực Chiến (LC) | LC Khuyến Nghị | Tỷ Lệ LC | Phẩm Cao Nhất | Tinh Tuý (Paragon) | Vàng Thu Tích Lũy | Vàng Chi Tích Lũy | Tỷ Lệ Tiêu Vàng (Sink %) | Mob TTK | Boss TTK | Player TTD |
|---|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|---:|---:|---:|
| **5m** | FTUE / Mở đầu Ch.1 | 0/12 | F0 | 798 | 1,350 | 59% | Thường | 0 | 243 | 162 | 66.7% | 4.78s | 73.4s | 7.3s |
| **15m** | Early Game · Ch.1 | 0/12 | F0 | 1,038 | 1,350 | 77% | Thường | 0 | 1,153 | 1,085 | 94.1% | 1.35s | 20.8s | 22.0s |
| **30m** | Early Game · Boss Ch.1 | 1/12 | F0 | 3,177 | 4,500 | 71% | Sử Thi | 0 | 2,857 | 2,846 | 99.6% | 1.31s | 17.3s | 23.1s |
| **1h** | Early-Mid · Ch.1–2 | 1/12 | F1 | 3,534 | 4,500 | 79% | Sử Thi | 0 | 5,996 | 5,929 | 98.9% | 0.95s | 12.5s | 36.9s |
| **3h** | Mid Game · Ch.2–4 | 2/12 | F3 | 6,059 | 10,000 | 61% | Sử Thi | 0 | 22,831 | 22,787 | 99.8% | 2.59s | 34.0s | 20.4s |
| **10h** | Mid-Late · Ch.5–7 | 3/12 | F10 | 18,490 | 20,000 | 92% | Sử Thi | 0 | 113,308 | 112,068 | 98.9% | 0.65s | 8.5s | 180.0s* |
| **30h** | Late Game · Ch.8–11 | 12/12 | F54 | 364,078 | 285,000 | 128% | Thần Thoại | 0 | 1,911,488 | 1,902,943 | 99.6% | 0.23s | 1.3s | 180.0s* |
| **100h** | Endgame · Ch.12 & Tháp | 12/12 | F60 | 1,332,804 | 285,000 | 468% | Thần Thoại | **44 / 500** | 13,424,993 | 13,402,778 | **99.8% (0 cảnh báo)** | 0.20s | 1.0s | 180.0s* |

*\*Lưu ý: `Player TTD` được kẹp trần hiển thị ở `180.0s` đối với Chương Chiến Dịch chuẩn khi người chơi đã vượt mạnh LC khuyến nghị; thử thách sống còn thực sự ở mốc 30h–100h chuyển sang **Nightmare Ascension Tier I–V** và **Tháp Vô Tận tầng F50–F100+**.*

---

## 3. Phân Tích Chuyên Sâu: TTK, TTD, Nguồn Thu vs Tiêu Hao

### 3.1. Nhịp Chiến Đấu Early → Mid Game (`5m → 10h`) — ĐẠT CHUẨN TỐT
- **5m → 15m**: Người chơi mới bước vào Ch.1 với `59% → 77%` LC, `Mob TTK` giảm mượt từ `4.78s → 1.35s`, `Boss TTK` từ `73.4s → 20.8s`, `Player TTD` tăng từ `7.3s → 22.0s`. Áp chế LC (`computePowerPressure`) giữ cho người chơi không thể "đứng yên bắn chết Boss" nhưng vẫn có thể thắng bằng kỹ năng né đòn ở dải `75%–89% LC`.
- **30m → 3h**: Chuyển tiếp từ Ch.1 → Ch.2 → Ch.3 có sự căng thẳng vừa phải (tỷ lệ LC dao động `61%–79%`), `Gold Sink Ratio` đạt `98.9%–99.8%`, nghĩa là **mỗi đồng Vàng kiếm được đều chuyển hóa ngay thành cảm giác mạnh lên rõ rệt**.

### 3.2. Xử Lý Dứt Điểm Lạm Phát Vàng Endgame Ở Mốc `100h` (P1-5 ĐÃ TRIỂN KHAI & NGHIỆM THU)
- **Trước cải tiến**: Bộ mô phỏng phát hiện cảnh báo `[100h] Gold sink ratio 53.5% (<60%) — dư Vàng ở Endgame` (tồn kho ~6,239,355 Vàng sau khi 8 Thiên Phú chạm 160/160 và trang bị Thần Thoại chạm Lv.80).
- **Giải pháp đã triển khai trực tiếp vào mã nguồn**:
  - Bổ sung hệ thống **Tinh Tuý Hoàng Đạo (Astral Paragon Infusion — 500 bậc)** trong `src/data/talentsData.ts`, `src/data/gearData.ts`, `src/data/saveIntegrity.ts`, `src/App.tsx` và `src/components/TalentsModal.tsx`.
  - **Điều kiện mở khóa nghiêm ngặt**: Chỉ mở khi đạt `160/160 Thiên Phú` hoặc vượt `Chương 12` → **0% ảnh hưởng đến Early/Mid Game (Ch.1–11)**.
  - **Công thức tiêu Vàng & phần thưởng có kiểm soát**: `18,000 + lv × 3,200 + lv^1.58 × 380` Vàng/bậc, cộng `+0.4% ATK`, `+0.4% Max HP`, `+0.2% Sát Thương Boss` (trần `+40%`).
- **Kết quả xác minh sau triển khai**: Ở mốc `100h`, người chơi đạt **Paragon Bậc 44/500**, tiêu thụ **`13,402,778 / 13,424,993 Vàng`**, đưa `Gold Sink Ratio` từ **`53.5%` → `99.8%`** và hạ cảnh báo kinh tế về **`0`**.

---

## 4. Cân Bằng Tướng & Tính Công Bằng Cho Người Chơi F2P / Xui Rủi

### 4.1. Biên Độ Cân Bằng 4 Tướng Hoàng Đạo (Đã Kiểm Chứng Unit Test)
| Tướng | Cung Hoàng Đạo | Chương Mở Khóa | Vai Trò | Kỹ Năng Chủ Động (`effectKind`) | Biên Độ DPS so với Aurelia |
|---|---|---|---|---|---|
| **Aurelia** | Sư Tử | Chương 1 (Sẵn) | Cân bằng / Khiên Hỏa | Nhật Hoa Trảm Thiên (`ember_nova`) | `0.0%` (Chuẩn) |
| **Bellona** | Bạch Dương | Chương 2 | Đột kích / Lôi Hỏa | Hỏa Mạch (`thunder_arc`) | Trong biên `≤ ±12%` |
| **Sylvia** | Kim Ngưu | Chương 3 | Chống chịu / Địa Mạch (`bonusHp: 230`) | Địa Mạch Lục Bảo (`jade_bastion` · Khiên 12% HP) | Trong biên `≤ ±12%` |
| **Celeste** | Song Tử | Chương 4 | Pháp sư Gương (`bonusAtk: 58`) | Song Kính Tinh Tú (`moon_fan_mark`) | Trong biên `≤ ±12%` |

### 4.2. Kiểm Chứng Công Bằng 30 Ngày (`fairProgression30Day.test.ts`)
- Cả hai hồ sơ **`average`** và **`unlucky`** (RNG bị ép luôn rơi vào vùng kém may mắn `>= 0.55`) đều vượt qua toàn bộ kiểm định 30 ngày nhờ:
  - Chuyển cấp cường hóa **miễn phí 100%** (`transferGearUpgradeLevel`).
  - Hệ thống Pity không reset sai + Rèn mục tiêu từ mảnh phân giải.
  - Capped Daily Catch-Up hỗ trợ người chơi tụt nhịp mà không cho phép khai thác lặp vô hạn.

---

## 5. Ranh Giới Mô Phỏng vs Kiểm Thử Thực Tế (Human Playtest)

| Hạng mục | Đã chứng minh bằng Mô Phỏng & Unit Test | Cần xác nhận thêm bằng Playtest Người Chơi Thật |
|---|---|---|
| Toán học chỉ số, TTK/TTD lý thuyết, Pity, Rarity Gating | **Có** (`economyTelemetry.test.ts`, `fairProgression30Day.test.ts`, `earlyProgression.test.ts`) | — |
| Cảm nhận độ khó né đạn Boss Ch.1–4, cảm giác "đã tay" của `jade_bastion` | Chưa đo bằng cảm nhận con người | **Cần playtest 10–15 người chơi thật (P3-1)** |
| Tỷ lệ giữ chân D1 / D7 / D30 & điểm gãy thực tế | Chưa có dữ liệu live | **Cần thu thập sau khi mở Beta công khai** |

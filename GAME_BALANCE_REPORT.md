# GAME BALANCE REPORT — BÁO CÁO CÂN BẰNG KINH TẾ & CHIẾN ĐẤU (PHASE 5)

- **Nguồn dữ liệu**: Mô phỏng tất định sử dụng công thức thực tế của trò chơi (`src/data/balanceSimulation.ts` + `src/data/onboardingAndMasteryData.ts`, tái lập trực tiếp qua `node --import tsx tools/simulate-playtime-milestones.ts`, `seed = aaaa-100h-v1`).
- **Phân định trung thực**: Mọi số liệu dưới đây là **kết quả mô phỏng toán học có seed lặp lại được** trên công thức thật (`computePlayerStats`, `CHAPTERS`, `TALENTS`, `PARAGON_INFUSION_MAX_LEVEL`, `getParagonInfusionCost`, `computePowerPressure`, `getEarlyProgressionPolicy`, `simulate30DayFairProgression`), **KHÔNG thay thế cho dữ liệu playtest người chơi thật** (sẽ đo ở mốc P3-1).

---

## 1. Chỉ Số Nền Tài Khoản Mới (Fresh Account Baseline — Đã Xác Minh)

| Chỉ số | Giá trị thực tế | Ghi chú thiết kế |
|---|---:|---|
| Tướng khởi đầu | **Aurelia (Sư Tử)** | Mở khóa sẵn 100%, không cần quay Gacha |
| Lực chiến (Power Rating) | **702 LC** | Dưới ngưỡng Ch.1 (`1,350 LC`) để tạo động lực học nâng cấp sớm |
| ATK / Max HP / Crit / ASPD | **84 ATK / 461 HP / 14.5% / 1.08x** | Cân bằng giữa tốc độ bắn và khả năng chịu đòn 4–5 đòn đầu |
| Tiền tệ khởi điểm | **40 Vàng / 0 Kim Cương** | Không bơm tài nguyên ảo gây lạm phát đầu game |
| Trang bị khởi điểm | **2 món Thường (Common Lv.1)** | Vũ khí + Giáp khởi đầu (`activeSetProcs = 0`) |

---

## 2. Bảng Mô Phỏng 8 Mốc Thời Lượng (`5 phút → 100 giờ`, Seed `aaaa-100h-v1`)

Kết quả xuất trực tiếp từ `node --import tsx tools/simulate-playtime-milestones.ts`:

| Mốc | Ngày | Chương Đã Vượt | Tháp Vô Tận | Lực Chiến (Avg) | Lực Chiến (Unlucky) | Phẩm Cao Nhất | TB Cấp Đồ | Tổng Thiên Phú | Vàng Tích Lũy | Kim Cương Tích Lũy |
|---|---:|---:|---:|---:|---:|---|---:|---:|---:|---:|
| **5 phút** | D1 | 0/12 | F0 | **706** | **706** | Thường (Common) | Lv.1 | 0 | 113 | 6 |
| **15 phút** | D1 | 0/12 | F0 | **715** | **715** | Thường → Hiếm (Ải 4) | Lv.1 | 0 | 338 | 17 |
| **30 phút** | D1 | 0/12 | F0 | **725** | **725** | Thường | Lv.1 | 0 | 627 | 31 |
| **1 giờ** | D2 | 1/12 | F1 | **1,869** | **1,997** | Hiếm | Lv.2 | 8 | 1,808 | 80 |
| **3 giờ** | D5 | 2/12 | F5 | **7,849** | **8,626** | Sử Thi | Lv.7 | 42 | 18,229 | 363 |
| **10 giờ** | D15 | 6/12 | F22 | **60,703** | **64,525** | Huyền Thoại | Lv.20 | 100 | 233,392 | 2,730 |
| **30 giờ** | D45 | 12/12 | F62 | **474,410** | **484,339** | Thần Thoại | Lv.68 | 160 | 4,343,661 | 16,824 |
| **100 giờ** | D150 | 12/12 | F88 | **574,286** | **586,305** | Thần Thoại (Max +80) | Lv.80 | 160 | **13,451,338** | **49,350** |

---

## 3. Kiểm Toán Nguồn Thu vs Bể Tiêu Hao Vàng Endgame (100h) & Cân Bằng Bộ Trang Bị

Kết quả kiểm toán tự động từ `evaluatePass3EconomyAndSetBalance()` (`src/data/onboardingAndMasteryData.ts` + `tests/gear-set-procs-and-100h-audit.test.mjs`):

| Hạng mục kiểm định | Giá trị thực tế | Trạng thái |
|---|---:|---|
| Lực chiến tài khoản mới (`freshAccountPowerRating`) | **702 LC** | ĐẠT (`< 1,350 LC` Ch.1) |
| Hiệu ứng Set Proc tài khoản mới (`freshAccountActiveSetProcs`) | **0** | ĐẠT (không Power Creep đầu game) |
| Số Bộ Trang Bị Mid–Endgame có proc chiến đấu riêng (`gearSetProcCount`) | **5 bộ** (Hủy Diệt, Vang Vọng, Long Kỵ, Tiên Tri, Điểu Sư) | ĐẠT (`setProcsBalanced: true`) |
| Kiểm tra chênh lệch mua-bán Flash Deal (`flashDealArbitrageDetected`) | **`false`** | ĐẠT (0 vòng lặp tiền vô hạn) |
| Kiểm tra TTK Chương 12 & cân bằng hướng Build Kỹ Năng | `chapter12TtkHealthy: true`, `skillBuildsBalanced: true` | ĐẠT |
| Tổng Vàng kiếm được mốc 100 giờ (`hour100GoldEarned`) | **13,451,338 Vàng** | Đo thực tế |
| Tổng bể tiêu Vàng Endgame (Thiên Phú 160 + 6 món Thần Thoại Lv.80 + **Tinh Tuý Hoàng Đạo 500 bậc**) | **1,763,396,749 Vàng** (riêng Paragon: `1,758,359,773`) | **Vượt xa nguồn thu 100h — triệt tiêu hoàn toàn lạm phát Vàng dư Endgame** |

---

## 4. Cân Bằng 4 Tướng Hoàng Đạo & Tính Công Bằng F2P / Unlucky

| Tướng | Cung Hoàng Đạo | Chương Mở Khóa | Vai Trò | Kỹ Năng Chủ Động (`effectKind`) | Biên Độ DPS so với Aurelia |
|---|---|---|---|---|---|
| **Aurelia** | Sư Tử | Chương 1 (Sẵn) | Cân bằng / Khiên Hỏa | Nhật Hoa Trảm Thiên (`ember_nova`) | `0.0%` (Chuẩn) |
| **Bellona** | Bạch Dương | Chương 2 | Đột kích / Lôi Hỏa | Hỏa Mạch (`thunder_arc`) | Trong biên `≤ ±12%` |
| **Sylvia** | Kim Ngưu | Chương 3 | Chống chịu / Địa Mạch (`bonusHp: 230`) | Địa Mạch Lục Bảo (`jade_bastion` · Khiên 12% HP) | Trong biên `≤ ±12%` |
| **Celeste** | Song Tử | Chương 4 | Pháp sư Gương (`bonusAtk: 58`) | Song Kính Tinh Tú (`moon_fan_mark`) | Trong biên `≤ ±12%` |

- **Kiểm chứng F2P / Unlucky (`fairProgression30Day.test.ts` & `balance-100h-simulation.test.mjs`)**: Nhờ chuyển cấp cường hóa miễn phí 100%, Pity bảo toàn + Rèn mục tiêu, và Daily Catch-Up giới hạn trần, người chơi `unlucky` vẫn đạt `424,859 LC` ở Ngày 30 và `586,305 LC` (Tháp F88) ở 100 giờ — không bị bỏ lại phía sau bởi RNG xấu.

---

## 5. Ranh Giới Mô Phỏng vs Playtest Người Chơi Thật

| Hạng mục | Đã chứng minh bằng Mô Phỏng & Unit Test | Cần xác nhận thêm bằng Playtest Người Chơi Thật |
|---|---|---|
| Toán học chỉ số, 8 mốc `5m → 100h`, Pity, Rarity Gating, Set Procs, Paragon Sink | **Có** (`balance-100h-simulation.test.mjs`, `gear-set-procs-and-100h-audit.test.mjs`, `fairProgression30Day.test.ts`, `earlyProgression.test.ts`) | — |
| Cảm nhận né đòn Boss Ch.1–4, độ "đã tay" của kỹ năng tiến hóa & cơ quan sàn đấu | Chưa đo bằng cảm nhận con người | **Cần playtest 10–15 người chơi thật (P3-1)** |
| Tỷ lệ giữ chân D1 / D7 / D30 thực địa | Chưa có dữ liệu live | **Cần thu thập sau khi mở Beta công khai** |

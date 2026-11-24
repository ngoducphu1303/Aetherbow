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

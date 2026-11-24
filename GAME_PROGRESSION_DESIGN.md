# GAME PROGRESSION DESIGN — KIẾN TRÚC TIẾN TRÌNH TOÀN HỆ THỐNG

Tài liệu mô tả kiến trúc tiến trình hoàn chỉnh từ phút thứ 1 đến 100+ giờ chơi của **Aetherbow: Hoàng Đạo Trỗi Dậy**, phản ánh chính xác mã nguồn đang vận hành (`earlyProgressionData.ts`, `gearData.ts`, `talentsData.ts`, `phase5Data.ts`, `fairProgression30Day.ts`, `wave12–14Data.ts`).

---

## 1. Bốn Giai Đoạn Tiến Trình Cốt Lõi

| Giai đoạn | Thời lượng ước tính | Chương mục tiêu | Trần Phẩm Chất (`getEarlyProgressionPolicy`) | Hệ Thống Mở Khóa Chính |
|---|---|---|---|---|
| **Early Game (FTUE)** | `0m – 1h` | Chương 1 (1,350 LC) | Ch.1 Phòng 1–3: `Thường`; Phòng 4+: `Hiếm`; Vượt Ch.1: `Sử Thi` | Chiến đấu 3D, Cường hóa Trang bị, Thiên Phú, Rương Sắt, Chuyển Cấp Miễn Phí, Tháp Vô Tận (sau Ch.1). |
| **Mid Game** | `1h – 10h` | Chương 2–4 (4,500 → 20,000 LC) | Ch.2–3: `Sử Thi`; Ch.4: Mở khóa Mẫu `[S]` Sử Thi | Bộ Sưu Tập Ch.2–4 (Bellona, Sylvia, Celeste + Thú Cưỡi/Pet/Skin), Cổ Ngữ (Rune 1→2 ô), Chòm Sao (Constellations), Nightmare Ascension (sau Ch.3). |
| **Late Game** | `10h – 30h` | Chương 5–8 (34,000 → 112,000 LC) | Ch.5–8: `Huyền Thoại (Legendary)` + `[S]` | 4 ô Cổ Ngữ, Tháp Nguyên Tố, Đàn Chúc Phúc (Blessing Altar), Vũ Khí Thần Thoại (Mythic Weapon), Thức Tỉnh Trang Bị (Ch.6+), Nhẫn Hồn (Soul Rings Ch.7+), Thánh Tích Hoàng Đạo & Tế Đàn Bang Hội (Ch.8+). |
| **Endgame** | `30h – 100h+` | Chương 9–12 (152,000 → 285,000 LC) & Tháp F50+ | Ch.9–12: `Thần Thoại (Mythic)` + `[S]` | Nightmare Ascension Tier I–V + 5 Mutators, Leo Tháp Vô Tận F50–F100+, Đua Top Weekly Boss có xác thực server, Đấu Trường Cân Bằng (Equalized Rift), Săn Boss Bang & Bang Chiến. |

---

## 2. Cơ Chế Bảo Vệ Tính Công Bằng (Fair Progression Pillars)

1. **Chống Lạm Phát Đầu Game (Progression-Gated Drops)**: `getEarlyProgressionPolicy` khóa trần phẩm chất rơi từ rương/quái theo tiến độ chương thực tế. Người chơi 5 phút đầu không thể mở trúng đồ Thần Thoại phá nát trải nghiệm Ch.1–4.
2. **Kế Thừa Cấp Độ Miễn Phí 100% (`transferGearUpgradeLevel`)**: Khi người chơi nhận được trang bị phẩm cao hơn ở cùng ô, toàn bộ cấp cường hóa cũ được chuyển sang không mất một đồng Vàng nào — xóa bỏ nỗi sợ "nâng đồ cấp thấp sẽ phí tài nguyên".
3. **Bảo Toàn Pity & Rèn Mục Tiêu (Deterministic Forge)**: Đồ thừa phân giải thành mảnh rèn (`salvageExcessGearToForgeShards`) để chế tạo chắc chắn đồ Hiếm / Sử Thi / `[S]` mà không phụ thuộc hoàn toàn vào may rủi.
4. **Áp Chế Lực Chiến Mềm (`computePowerPressure`)**:
   - `≥ 90% LC`: Đạt chuẩn, 100% sát thương.
   - `75% – 89% LC`: Thử thách kỹ năng — người chơi né đòn tốt vẫn thắng đẹp mắt.
   - `62% – 74% LC`: Ranh giới vượt cấp — yêu cầu kỹ năng cao trước khi Boss Cuồng Nộ (`50s–60s`).
   - `< 62% LC`: Áp chế mạnh + khóa Kết Liễu tức thời để chống khai thác vượt 3–5 chương phi lý.
5. **Di Cư Dữ Liệu Không Mất Mát (`migrateSaveData` + `saveIntegrity.ts`)**: Bảo toàn 100% tài sản, tự động khôi phục tướng mở theo chương (`Bellona/Sylvia/Celeste`) và chuyển thú cưỡi cũ sang `solarius`.

---

## 3. Vòng Lặp Giữ Chân Dài Hạn (30–100+ Giờ)

- **Lộ Trình 30 Ngày Công Bằng (`FAIR_30DAY_MILESTONES`)**: 4 tuần / 8 mốc thưởng rõ ràng dẫn dắt người chơi F2P từ Ch.1 lên Ch.12 và Tháp F45+.
- **Nightmare Ascension I–V & 5 Biến Dị Phòng (`NIGHTMARE_MUTATORS`)**: Tăng độ sâu chiến thuật khi người chơi đã vượt qua chỉ số Chiến Dịch cơ bản.
- **Đề Xuất Mở Rộng Sprint Kế (P1-5)**: Bổ sung **Tinh Tuý Hoàng Đạo Vô Hạn** (tiêu Vàng sau khi Talent đạt tổng Lv.160) và **Tẩy Luyện Dòng Phụ Bằng Vàng** để hấp thụ lượng Vàng dư ở mốc 60h–100h+ đã được chỉ ra trong `GAME_BALANCE_REPORT.md`.

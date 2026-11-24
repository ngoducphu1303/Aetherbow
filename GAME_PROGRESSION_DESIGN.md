# GAME PROGRESSION DESIGN — THIẾT KẾ TĂNG TIẾN CHƯƠNG 1–4 & ENDGAME

## 1. Triết Lý Tăng Tiến

- **Khởi đầu hợp lý (Low-Power Start):** Tài khoản mới bắt đầu với **Aurelia** và trang bị Thường cấp 1 tại **`702 CP`**, không sở hữu vật phẩm Endgame sớm.
- **Lộ trình rõ giai đoạn:**
  - **Early Game (5 phút – 1 giờ):** Làm quen né đòn, ghép Synergy kỹ năng, rèn đồ Hiếm đầu tiên và chinh phục Chương 1 (`702 → 1,869 CP`).
  - **Mid Game (1 giờ – 10 giờ):** Chinh phục Chương 2–5, mở dần Bộ Sưu Tập Chương qua **4 Mốc Sao Kỹ Năng (★1–★4)**, nâng cấp Tinh linh/Cánh/Thú cưỡi và leo Tháp Vô Tận (`1,869 → 44,937 CP`).
  - **Late Game (10 giờ – 30 giờ):** Phối bộ trang bị Sử Thi/Huyền Thoại/Thần Thoại, mở khóa đầy đủ 4 sao Chương 2–4, tối ưu dòng phụ và tham chiến Đấu Trường/Boss Tuần (`44,937 → 131,979 CP`).
  - **Endgame (30 giờ – 100 giờ):** Tinh luyện Thần Thoại (+80), Thức Tỉnh trang bị, Tháp Vô Tận tầng 68+, Đua Boss Cuối Tuần và Bảng Xếp Hạng Mùa Giải (`131,979 → 159,764 CP`, tăng trưởng giảm dần tránh Power Creep).

## 2. Cơ Chế Mở Khóa Bộ Sưu Tập Chương 2–4 Theo 4 Mốc Sao (★1–★4)

Thay vì xả toàn bộ 7 vật phẩm khi vừa vượt Ải 12 lần đầu (gây tăng đột biến chỉ số và giảm giá trị chơi lại), Chương 2, Chương 3 và Chương 4 sử dụng lộ trình **4 Mốc Sao Kỹ Năng** (`src/data/chapterCollectionMilestones.ts`):

| Mốc sao | Điều kiện mở khóa | Phần thưởng mở khóa | Giá trị thiết kế |
|---|---|---|---|
| **★1** | Vượt Ải 12 của Chương tương ứng | **Tướng Chương + Tinh linh Chương** *(Ch.2: Bellona + Pyro; Ch.3: Sylvia + Ngọc Ngưu Con; Ch.4: Celeste + Song Linh Tinh Tú)* | Cho phép trải nghiệm ngay lối đánh tướng mới mà không gây sốc lực chiến (`< 1.6x` CP gốc). |
| **★2** | Thắng Chương giữ **≥ 50% HP** hoặc **không dùng hồi sinh** *(hoặc thắng đủ 2 lần)* | **Trang phục Chương + Cánh Chương** | Thưởng khả năng đọc đòn và né tránh sạch. |
| **★3** | Thắng Chương đạt **≥ 2 Né Hoàn Hảo**, hoặc **≥ 1 Phá Giáp Boss**, hoặc **≥ 2 Ngắt Chiêu** *(hoặc thắng đủ 3 lần)* | **Thú cưỡi Chương + Thánh khí Chương** | Khuyến khích chủ động phản công, phá giáp và ngắt chiêu Boss. |
| **★4** | Đạt **Ải 6 Chương tiếp theo**, hoặc đạt mốc **Tháp Vô Tận** *(Ch.2: Tầng 16, Ch.3: Tầng 24, Ch.4: Tầng 32)*, hoặc thắng đủ **4 lần** | **Hào quang Chương** *(Hoàn tất 100% Bộ Sưu Tập)* | Đích đến trung hạn gắn kết Chiến Dịch với Tháp Vô Tận. |

## 3. Bảo Toàn Dữ Liệu Người Chơi Cũ (Zero Data Loss)

- Hàm `migrateSaveData()` trong `src/data/earlyProgressionData.ts` giữ nguyên 100% tướng, trang phục, tinh linh, cánh, thú cưỡi, thánh khí, hào quang và `chapterEquipmentPresets` của người chơi đã mở từ phiên bản trước.
- Hàm `normalizeChapterMilestones()` tự động quy đổi ngược các món người chơi đã sở hữu thành mốc sao ★1–★4 tương ứng để hiển thị đồng bộ trên Sảnh (`LobbyPanels.tsx`).
- Mọi bản lưu đều đi qua `validateAndSanitizeSaveIntegrity()` để loại bỏ giá trị lỗi (`NaN`, số âm, vượt trần, sao không hợp lệ) mà không ảnh hưởng dữ liệu hợp lệ.

---

## 4. Lộ Trình 60 Phút Đầu Tiên & 19 Thành Tựu Tinh Thông (Đợt 3)

Nhằm nâng cao khả năng giữ chân người chơi tự nhiên (**Player Retention**) mà không sử dụng cơ chế ép buộc hay dark pattern, Đợt 3 bổ sung hệ thống định hướng thực tế gắn với thanh Hồ Sơ (`src/data/onboardingAndMasteryData.ts`, `src/components/ProfileCodexModal.tsx`):

1. **Lộ Trình 60 Phút Đầu Tiên (`5p → 15p → 30p → 60p`):**
   - **Mốc 5 phút:** Làm chủ nhịp bắn & hạ 15 mục tiêu đầu tiên.
   - **Mốc 15 phút:** Sở hữu trang bị Hiếm hoặc nâng cường hóa vũ khí lên cấp 3+.
   - **Mốc 30 phút:** Chinh phục trọn vẹn Chương 1 (Sư Tử Nhật Luân) hoặc kích hoạt 1 Cơ quan Đấu trường.
   - **Mốc 60 phút:** Khám phá ít nhất 1 nhánh Tiến Hóa Kỹ Năng và mở khóa Tháp Vô Tận (Tầng 1+).
2. **Mở rộng lên 19 Thành Tựu Tinh Thông (`src/data/liveOpsData.ts`):**
   - Bổ sung 7 cột mốc dài hạn gắn trực tiếp với kỹ năng chiến đấu và khám phá: leo Tháp Tầng 30 (`ach_tower_30`), khám phá 3 & 12 nhánh Tiến Hóa (`ach_evo_3`, `ach_evo_12`), thu thập 10 Sao Chương (`ach_stars_10`), kích hoạt 15 Cơ quan Đấu trường (`ach_mech_15`), thực hiện 10 pha Ngắt Chiêu Boss (`ach_interrupt_10`), và kích hoạt 25 Hiệu Ứng Bộ Trang Bị (`ach_set_proc_25`).
   - Toàn bộ 3 bộ đếm sự nghiệp mới (`arenaMechanismsTriggered`, `bossInterruptsTotal`, `setProcsTriggered`) đều được kiểm chuẩn và chống giả mạo an toàn trong `src/data/saveIntegrity.ts`, tương thích ngược 100% với bản lưu cũ.


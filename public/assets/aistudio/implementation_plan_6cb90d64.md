# Kế Hoạch Nâng Cấp Đợt 4 — Hoàn Thiện 7 Tiêu Chí Cuối Đạt Chuẩn 96+ (Aetherbow: Citadel Trial)

Đợt 4 tập trung nâng cấp toàn diện 7 tiêu chí cuối cùng hiện ở mức **93–94/100** (*SFX, VFX, Đồ họa, Định hướng Nghệ thuật, Tăng tiến Độ khó, Quy trình Asset và Live Operations*) nhằm đưa toàn bộ 30 tiêu chí đồng loạt đạt **≥ 95/100** trong khi giữ vững an toàn GPU tuyệt đối cho laptop cấu hình yếu như **Dell Latitude E5430** và bảo toàn 100% dữ liệu người chơi hiện tại.

## Quyết Định Đã Xác Nhận Từ Người Dùng

> [!IMPORTANT]
> Toàn bộ định hướng triển khai Đợt 4 đã được người dùng xác nhận ở giai đoạn làm rõ và sẽ được thực hiện đầy đủ kèm kiểm thử tự động và cập nhật toàn bộ báo cáo kiểm toán:

- **Phạm vi Đợt 4:** Triển khai toàn diện cả 5 trụ cột cho nhóm 7 tiêu chí (`SFX`, `VFX/Đồ họa/Nghệ thuật`, `Tăng tiến Độ khó`, `Quy trình Asset GLB`, và `Vận hành LiveOps`).
- **Âm thanh & Hình ảnh an toàn phần cứng yếu:** Bổ sung **Bộ Trộn SFX Ưu Tiên Chống Chồng Âm** kèm biến thể âm thanh đòn đánh, kết hợp **Giám Đốc Ánh Sáng & Ngôn Ngữ VFX Riêng Cho 12 Chương** tuân thủ tuyệt đối ngân sách E5430 (0 đèn động `PointLight` mới, tự thu gọn mật độ hạt theo Watchdog GPU).
- **Công cụ Thực tế cho Người chơi & Vận hành:** Bổ sung **Chẩn Đoán Nguyên Nhân Thất Bại Chiến Thuật** ngay màn hình kết thúc trận, **Trình Kiểm Định Sức Khỏe Asset GLB High/Lite** theo ngân sách E5430, và **Lịch Sử Snapshot & Khôi Phục 1 Chạm (Rollback)** ngay trong bảng quản trị LiveOps hợp nhất.

---

## 1. Tổng Quan & Giá Trị Cốt Lõi

- **Mục tiêu sản phẩm:** Biến từng khung hình, từng cú bắn, từng lần thua trận và từng đợt cập nhật nội dung đều có chiều sâu rõ ràng:
  1. **Chiến đấu nghe sắc nét, nhìn tách bạch:** Không còn tình trạng vỡ tiếng khi bắn liên hoàn/nổ AoE nhiều quái cùng lúc; mỗi chương có bảng màu ánh sáng & sương mù mang bản sắc Hoàng Đạo riêng, tách biệt hoàn toàn màu hiệu ứng giữa Người chơi, Quái vật và Boss.
  2. **Thất bại công bằng và có hướng khắc phục:** Thay vì chỉ báo "Thất Bại" chung chung, hệ thống phân tích dữ liệu thật của trận vừa đánh (chênh lệch lực chiến, tỷ lệ né đòn, số lần ngắt chiêu Boss, tận dụng cơ quan đấu trường) để chỉ ra đúng nguyên nhân và gợi ý hành động tiếp theo.
  3. **Vận hành & Tài nguyên chuẩn sản xuất:** Đội vận hành kiểm tra được ngay tình trạng cặp High/Lite của toàn bộ kho 137 GLB so với ngưỡng bộ nhớ máy yếu Dell Latitude E5430, đồng thời lưu lịch sử phiên bản cân bằng LiveOps và hoàn tác về bản ổn định chỉ với 1 lần nhấn.
- **Đối tượng phục vụ:** Người chơi trên cả máy tính cấu hình cao lẫn laptop văn phòng cấu hình yếu (Intel HD 4000 / RAM 4–8GB) và quản trị viên vận hành game.

---

## 2. Trải Nghiệm Người Dùng & Định Hướng Thẩm Mỹ

### Luồng Tương Tác Chính
1. **Trong Trận Đấu (Chương 1–12 & Tháp/Boss):**
   - Ngay khi bước vào từng chương, ánh sáng chủ đạo (Key Light ấm/lạnh), ánh sáng vòm trời–mặt đất (HemisphereLight) và sương mù chân trời tự động chuyển sắc theo chòm sao Hoàng Đạo của chương đó mà không tạo thêm nguồn đèn tốn shader.
   - Khi bắn trúng quái thường, chí mạng, đánh vào khiên chắn, né hoàn hảo, kích hoạt cơ quan đấu trường hoặc bộ trang bị, Bộ Trộn SFX Ưu Tiên tự động chọn biến thể cao độ/âm sắc khác nhau và giới hạn số kênh đồng thời để âm thanh luôn trong trẻo, giàu trọng lượng.
   - Hiệu ứng hạt và sóng xung kích tự động áp dụng quy ước màu phân biệt phe (Người chơi / Quái / Boss) và cắt giảm mật độ khi chiến trường đông hoặc Watchdog GPU kích hoạt, giữ rõ vùng cảnh báo đỏ/vàng trên mặt sàn.
2. **Màn Hình Thất Bại (Chẩn Đoán Chiến Thuật):**
   - Hiển thị gọn gàng ngay trong hộp thoại kết thúc trận: **Nguyên nhân chính** (ví dụ: *Bỏ lỡ cửa sổ Ngắt Chiêu Boss*, *Chưa né kịp đòn cảnh báo*, *Chênh lệch lực chiến*, hoặc *Chưa kích hoạt Cơ Quan Đấu Trường*) kèm số liệu trận đấu dạng số thẳng hàng (`tabular-nums`) và **2 gợi ý hành động cụ thể**.
   - Tuân thủ nguyên tắc không dùng thẻ viên thuốc trang trí (Zero-Pill), không dùng dấu chấm nhấp nháy, không dùng hiệu ứng làm mờ nền đè lên WebGL, giữ độ tương phản cao và nhãn tiếng Việt trực diện.
3. **Trang Quản Trị Thống Nhất (Tab LiveOps & Kiểm Định Asset):**
   - Bổ sung khối **Kiểm Định Sức Khỏe Kho GLB & Ngân Sách E5430**: hiển thị tổng số tệp hoạt động, tỷ lệ phủ đối cặp High/Lite, dung lượng tối đa bản Lite so với ngưỡng máy yếu, và cảnh báo ngay nếu có tài nguyên vượt trần hoặc sai quy chuẩn.
   - Bổ sung khối **Lịch Sử Phiên Bản & Khôi Phục 1 Chạm (Rollback)**: tự động lưu tới 10 mốc cấu hình LiveOps đã xuất bản kèm so sánh nhanh các hệ số thay đổi và nút **Khôi phục bản này** giúp hoàn tác tức thì nếu cần cân bằng lại sự kiện.

### Bảng Màu & Ngôn Ngữ Thị Giác 12 Chương Hoàng Đạo
- **Nguyên tắc 60-30-10 & Tương phản ấm/lạnh:** Nền đấu trường tối sâu giữ tầm nhìn rõ đạn bay (60%), bề mặt kiến trúc chương đồng bộ màu Hoàng Đạo (30%), điểm nhấn sắc nét tập trung vào nhân vật, cơ quan đấu trường và vùng cảnh báo (10%).
- **Quy ước phân biệt phe (an toàn mù màu):** Hiệu ứng người chơi ưu tiên sắc vàng ánh dương / lam băng / ngọc sáng kèm hình khối sắc cạnh; hiệu ứng quái và Boss ưu tiên sắc đỏ thẫm / tím hắc ám kết hợp hình học cảnh báo đã chuẩn hóa từ Đợt 2.

---

## 3. Các Quyết Định Thiết Kế & Đánh Đổi Quan Trọng

### Quyết Định 1: Nâng Cấp Ánh Sáng 12 Chương Bằng Đèn Vòm & Sương Mù Thay Vì Thêm Đèn Điểm
- **Hướng chọn:** Điều phối đồng bộ màu và cường độ của bộ đèn hiện hữu (`DirectionalLight` + `HemisphereLight` + `Fog`) theo từng Chương 1–12; tuyệt đối giữ **`0` đèn động `PointLight` mới**.
- **Lý do:** Tạo khác biệt thị giác rõ rệt giữa Sư Tử Nhật Luân, Hỏa Sơn Bạch Dương, Thánh Địa Kim Ngưu, Đấu Trường Song Tử và các chương cao hơn mà chi phí GPU gần như bằng 0 trên Intel HD 4000 (Dell Latitude E5430).
- **Phương án loại bỏ:** Thêm đèn điểm theo từng hiệu ứng kỹ năng hoặc hậu kỳ nặng (gây sụt FPS và nguy cơ treo driver WebGL trên máy yếu).

### Quyết Định 2: Bộ Trộn SFX Ưu Tiên Thuần Toán Học Trước Khi Tạo Node Web Audio
- **Hướng chọn:** Tách lớp quản lý hạn mức kênh âm thanh (`voice cap`), chống trùng lặp trong cửa sổ thời gian ngắn (`dedupe window`), phân cấp độ ưu tiên (*Ngắt Chiêu / Phá Giáp Boss > Chí Mạng / Bộ Trang Bị > Đánh Thường / Bước Chân*) và biến thể cao độ thành mô-đun thuần độc lập trước khi kích hoạt bộ tổng hợp Web Audio.
- **Lý do:** Giảm mạnh tải CPU âm thanh khi bắn đa tia/lan sét trên laptop yếu, triệt tiêu hoàn toàn hiện tượng rè/vỡ tiếng, đồng thời kiểm thử tự động được 100% mà không phụ thuộc trình duyệt.

### Quyết Định 3: Lưu Lịch Sử Rollback LiveOps Không Phá Vỡ Quy Tắc Firestore Hiện Tại
- **Hướng chọn:** Khi quản trị viên xuất bản cấu hình LiveOps, lưu bản sao đối chiếu vào kho lịch sử phiên bản (tối đa 10 mốc gần nhất) và cho phép **Khôi phục 1 chạm** bằng cách xuất bản lại cấu hình đã kiểm chuẩn qua cùng tuyến đồng bộ có tăng số phiên bản tịnh tiến (`version + 1`).
- **Lý do:** Giữ nguyên toàn vẹn schema và 0 lỗi ESLint của quy tắc bảo mật Firestore hiện hành, đồng thời đảm bảo mọi client đang chơi nhận ngay bản khôi phục nhờ số phiên bản mới cao hơn.

---

## 4. Kiến Trúc Kỹ Thuật & Luồng Dữ Liệu

### Sơ Đồ Kiến Trúc Tích Hợp Đợt 4

```text
┌──────────────────────────────────────────────────────────────────────────────┐
│                     LỚP ĐỘNG CƠ THUẦN (TEST ĐỘC LẬP 100%)                    │
├──────────────────────┬──────────────────────────┬────────────────────────────┤
│ Bộ Trộn SFX Ưu Tiên  │ Giám Đốc Ánh Sáng & VFX  │ Chẩn Đoán Nguyên Nhân Thua │
│ • Hạn mức kênh âm    │ • Bảng màu 12 Chương     │ • Đọc CP / Né / Ngắt chiêu │
│ • Độ ưu tiên sự kiện │ • Tách màu Phe/Boss      │ • Phân loại nguyên nhân    │
│ • Biến thể cao độ    │ • Cắt trần hạt theo GPU  │ • Sinh 2 gợi ý chiến thuật │
└──────────┬───────────┴────────────┬─────────────┴─────────────┬──────────────┘
           │                        │                           │
           ▼                        ▼                           ▼
┌──────────────────────┐ ┌────────────────────────┐ ┌──────────────────────────┐
│  Hệ Thống Âm Thanh   │ │   Động Cơ Chiến Đấu    │ │  Hộp Thoại Kết Quả Trận  │
│  Web Audio Tổng Hợp  │ │   Three.js + Watchdog  │ │  Hiển Thị Phân Tích Thua │
└──────────────────────┘ └────────────────────────┘ └──────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                HỆ THỐNG TÀI NGUYÊN & VẬN HÀNH QUẢN TRỊ                       │
├──────────────────────────────────────────┬───────────────────────────────────┤
│ Trình Kiểm Định Kho Asset GLB (137 tệp)  │ Lịch Sử Snapshot & Rollback       │
│ • Kiểm tra đối cặp High / Lite           │ • Lưu 10 mốc xuất bản gần nhất    │
│ • Kiểm tra trần dung lượng E5430 Lite    │ • So sánh chênh lệch hệ số        │
│ • Kiểm tra đường dẫn & bản cũ thừa       │ • Khôi phục 1 chạm qua LiveOps    │
└─────────────────────┬────────────────────┴─────────────────┬─────────────────┘
                      └──────────────────┬───────────────────┘
                                         ▼
                      ┌──────────────────────────────────────┐
                      │   Trang Quản Trị Hợp Nhất (Admin)    │
                      │   + Bộ Kiểm Thử Tự Động & CI Audit   │
                      └──────────────────────────────────────┘
```

### Ánh Xạ Tương Tác & Trạng Thái
- **Âm thanh chiến đấu:** Mỗi sự kiện bắn, trúng thường, chí mạng, chạm khiên, né hoàn hảo, ngắt chiêu, kích hoạt cơ quan và hiệu ứng bộ trang bị đi qua bộ lọc ưu tiên trước khi phát âm; khi đầy hạn mức kênh, âm cấp thấp tự nhường chỗ cho âm quan trọng như Ngắt Chiêu hoặc Cảnh báo Boss.
- **Ánh sáng & VFX theo chương:** Khi đổi chương hoặc thay đổi trạng thái Watchdog GPU (Bậc 0 → 4), bảng màu ánh sáng vòm/sương mù cập nhật êm và trần số hạt/sóng hiệu ứng được tính lại tức thì, cam kết giữ nguyên bố cục chiến trường.
- **Chẩn đoán thất bại:** Khi trận đấu kết thúc thất bại, thông số thực của trận được đưa qua bộ phân tích để xếp hạng nguyên nhân chính và gợi ý hành động rõ ràng trên màn hình kết thúc trận, kèm nút quay về sảnh hoặc thử lại ngay.
- **Kiểm định GLB & Rollback LiveOps:** Trong tab vận hành quản trị, bảng kiểm định đọc trực tiếp manifest 137 GLB để báo cáo tỷ lệ đối cặp Lite và mức độ an toàn Dell Latitude E5430; thao tác xuất bản tự động ghi nhận snapshot mới và nút **Khôi phục** nạp lại cấu hình cũ, kiểm chuẩn biên an toàn và đồng bộ ngay lên Firestore/Server.

### Tiêu Chí Nghiệm Thu Đợt 4
- Bổ sung bộ kiểm thử tự động cho cả 5 hệ thống mới (SFX Priority Mixer, 12-Chapter Lighting & VFX Cap, Failure-Cause Diagnostics, GLB High/Lite Pipeline Validator, LiveOps Rollback History).
- Đạt **100% test pass (0 fail, 0 skip)**, **0 lỗi TypeScript**, **build production sạch**, **0 lỗi ESLint quy tắc Firestore**, và cập nhật đồng bộ toàn bộ báo cáo kiểm toán chất lượng lên bản nghiệm thu Đợt 4.

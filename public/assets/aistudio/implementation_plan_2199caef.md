# Aetherbow · Tái Cân Bằng Tiến Trình & Chiến Đấu Đầu Game (Chương 1–3)

Thiết kế lại nhịp tăng sức mạnh vĩnh viễn cho tài khoản mới trong phạm vi **Chương 1–3**, tách bạch hoàn toàn trạng thái nhận thưởng khỏi hộp thư để chặn phát lại quà, khóa trần phẩm chất/mẫu S theo mốc chiến dịch mà không làm mất đồ của tài khoản cũ, đồng thời làm cho Chương 1 nhanh, dễ đọc và đáng chơi lại nhờ kỹ năng, 2 hướng build rõ rệt và tín hiệu đòn Boss sắc nét.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Bốn quyết định sản phẩm trọng yếu dưới đây đã được xác nhận ở vòng làm rõ và sẽ chi phối trực tiếp toàn bộ bản triển khai:

- **Nhịp mở khóa phẩm chất & mẫu S đầu tiên (Đã xác nhận)**: Món **Hiếm (Rare)** đầu tiên rơi/chế tạo ở **giữa Chương 1** (mốc hạ Phụ Boss 1 – Ải 4 và Ải 8), món **Sử Thi (Epic)** đầu tiên mở khóa ở **cuối Chương 1 đến Chương 2**, và dòng **Mẫu S (`[S]`)** chỉ mở khóa từ **Chương 3** trở đi (bảo toàn 100% bộ đếm Pity đã tích lũy).
- **Xử lý hệ thống sảnh ngoài chiến dịch cho tài khoản mới (Đã xác nhận)**: **Mở khóa dần theo mốc Chương 1–3** (không ồ ạt ở tài khoản chưa đánh trận) và **áp dụng trần phẩm chất + chặn mẫu S theo chương hiện tại** ở cả tầng xử lý dữ liệu lẫn giao diện hiển thị.
- **Chính sách Migration cho tài khoản cũ đã xóa thư (Đã xác nhận)**: Tách sổ cái `claimedMailIds` (lưu vĩnh viễn các mã thư đã nhận) khỏi mảng hộp thư hiển thị `mailInbox`. Khi migrate save cũ (chưa có trường `claimedMailIds` / phiên bản schema cũ): mọi thư hệ thống mặc định **không còn tồn tại trong hộp thư** sẽ được đánh dấu là **đã nhận** (chặn phát lại), các thư vẫn còn trong hộp thư giữ nguyên trạng thái `claimed` hiện tại, và **tuyệt đối không thu hồi** bất kỳ trang bị, rune, cánh, danh hiệu hay thành tựu nào tài khoản cũ đã sở hữu.
- **Hướng build Chương 1 & Phương pháp kiểm chứng (Đã xác nhận)**: Tập trung cân bằng và kiểm chứng 2 hướng build cốt lõi bằng bộ kỹ năng sẵn có (**Dọn Nhóm – AoE/Chain** và **Đánh Boss – Single-Target/Sustain**), đi kèm bộ **mô phỏng RNG có seed** (báo cáo P10/P50/P90 trên luồng kinh tế thật) và **mô phỏng chiến đấu đầu game** (thời gian dọn phòng, thời gian hạ boss, số mẫu đòn boss kịp thể hiện).

> [!NOTE]
> **Mục tiêu nghiệm thu mặc định**: Chênh lệch DPS kỳ vọng trước trận đầu giữa tài khoản *vào trận ngay* và tài khoản *nhận hết quà sảnh hợp lệ* không vượt quá **10%** (sẽ công bố công thức DPS kỳ vọng và toàn bộ giả định kèm số đo trước/sau trong báo cáo bàn giao).

---

## 1. Overview & Core Concept

### Hiện trạng đo được trên HEAD (Đường cơ sở trước khi sửa)
Qua kiểm tra trực tiếp logic khởi tạo, tính chỉ số và hộp thư trên HEAD:
- **Sức mạnh tài khoản vừa tạo bị phồng gấp ~10 lần Chương 1**: Tài khoản mới vào sảnh (chưa nhận bất kỳ quà nào) đã có sẵn **6 món Common**, **1 Ngọc Khắc Rare** (`arrow_rain` +15% Tốc Bắn), **Cánh Thần Quang 3D** (`seraph_azure` 1★), **Danh Hiệu 3D** (`title_sky_sovereign` +65 ATK / +319 HP / +1.5% Crit), **Đại Sảnh Bang Hội cấp 1** và hàng chục loại tài nguyên mở khóa từ Wave 3–14 — đẩy chỉ số khởi điểm của Artemis lên **ATK 229 · HP 1.219 · Crit 36.28% · ASPD 1.41x · Lực Chiến 2.178**, trong khi lực chiến khuyến nghị Chương 1 hiện chỉ là **220**.
- **Lỗ hổng phát lại quà hộp thư & vượt mốc ngay tại sảnh**: Hàm chuẩn hóa hộp thư luôn tái tạo lại thư hệ thống bị thiếu với `claimed: false`, khiến thao tác *Xóa thư đã nhận → Tải lại* cho phép nhận lặp vô hạn (bao gồm 1 món **Epic `[S]`** từ thư Tri Ân Mùa 1). Bên cạnh đó, nút *Nhận Nhanh Quà Sảnh*, *Quà Chào Mừng*, *Flash Sale*, *Rương Thần Thoại*, *Vòng Quay*, *Hộp Mù* và *Sổ Chiến Lệnh* đều cho phép tài khoản chưa đánh một ải nào sở hữu ngay **Epic / Legendary / Mẫu S**.

### Giá trị cốt lõi của bản cập nhật
1. **Đường cong sức mạnh rõ ràng, có chủ đích**: Tài khoản mới bắt đầu gọn nhẹ với **Artemis + Cung Khởi Nguyên (Thường) + Áo Choàng Nguyệt Lâm (Thường)**; mỗi mốc nâng cấp đầu tiên (cường hóa vũ khí, mở ô trang bị, nhận món Hiếm đầu tiên) diễn ra đủ sớm trong cùng phiên chơi để người chơi cảm nhận ngay tác động.
2. **Kinh tế sạch, chống lợi dụng**: Một nguồn sự thật duy nhất (single source of truth) quản lý trạng thái nhận thưởng và trần phần thưởng theo tiến độ chiến dịch Chương 1–3 cho toàn bộ 15+ kênh cấp quà.
3. **Chiến đấu Chương 1 giàu kỹ năng & đáng chơi lại**: Giữ nhịp trận nhanh (không nhân đồng loạt HP quái hay thêm chờ đợi giả tạo), biến các mốc Ải 2/6/10 (Valkyrie), Ải 4/8 (Phụ Boss) và Ải 12 (Boss cuối) thành chuỗi quyết định chiến thuật có tác dụng tức thì.

---

## 2. User Experience & Visual Design

### Hành trình người chơi (Từ Ải 1 đến hết Chương 3)
1. **Bước vào sảnh (Tài khoản mới)**:
   - Giao diện sảnh giữ nguyên thẩm mỹ thần thoại tinh giới hiện có, nhưng các nút/modal phụ ngoài chiến dịch (Vòng Quay, Hộp Mù, Đấu Giá, Bàn Cờ, Sàn Đổi Mảnh, Phó Bản sự kiện) hiển thị rõ **mốc mở khóa chiến dịch** (ví dụ: *Mở sau Ải 4 Ch.1*, *Mở sau Chương 1*, *Mở sau Chương 2*) thay vì dội hàng loạt nút thưởng gây loãng mục tiêu.
   - Quà tân thủ hợp lệ trước trận đầu chỉ gồm Vàng vừa đủ để cường hóa vũ khí lần đầu và tài nguyên thẩm mỹ/tiến trình — giữ chênh lệch DPS kỳ vọng trước trận đầu **≤ 10%** so với người bấm Vào Trận ngay.
2. **Trong trận Chương 1 (Nhịp 12 ải có cấu trúc)**:
   - **Ải 1–3**: Nhịp dọn quái nhanh, dạy di chuyển–dừng bắn và lướt né. **Valkyrie Ải 2** giới thiệu lựa chọn định hình build sớm (chọn thiên hướng *Dọn Nhóm* hoặc *Đánh Boss*).
   - **Ải 4 (Phụ Boss 1 – Ares)**: Dạy đọc vòng báo đòn dậm đất/lao tới + khoảng phản công ngay sau khi boss hạ chiêu; lần đầu vượt Ải 4 mở khóa cột mốc nhận/rèn **món Hiếm (Rare) đầu tiên** và hiển thị rõ tiến độ mục tiêu.
   - **Ải 6 (Valkyrie 2)**: Đưa ra lựa chọn khuếch đại build (ví dụ ghép *Đạn Nảy / Siêu Lôi* cho Dọn Nhóm hoặc *Liên Xạ / Băng Tiễn / Tập Trung Chí Mạng* cho Đánh Boss).
   - **Ải 8 (Phụ Boss 2 – Boreas)**: Dạy né chùm tia/vùng nguy hiểm đa hướng kèm cửa sổ phản công rõ ràng; trao nguyên liệu & mảnh chế tạo hướng tới **món Sử Thi (Epic) đầu tiên** khi chạm cuối Chương 1–Chương 2.
   - **Ải 10 (Valkyrie 3)**: Quyết định chốt bài trước Boss cuối (bổ sung sinh tồn/khiên hoặc dồn sát thương đơn mục tiêu).
   - **Ải 12 (Boss cuối – Sư Vương Thái Dương)**: Thể hiện rõ cả Pha I và Pha II (<55% HP) với tín hiệu báo đòn dễ đọc, hạ gục mở khóa Chương 2, Ngọc Khắc đầu tiên và lộ trình hướng tới **Mẫu S ở Chương 3**.
3. **Màn hình Kết Quả sau trận (Thắng & Thua)**:
   - Tái sử dụng hoàn toàn khung modal kết quả, hệ thống biểu tượng và âm thanh hiện có; bổ sung gọn gàng 3 thông tin thiết yếu dạng chữ sạch (không nhồi thẻ pill hay khối trang trí thừa):
     - **Nguyên nhân thua cụ thể** (khi thất bại): phân loại tự động từ dữ liệu trận thực tế (ví dụ: *Trúng đòn dậm đất/tia cảnh báo của Boss*, *Bị bao vây cự ly gần*, *Thiếu sát thương dứt điểm pha Boss*, hoặc *Hết máu do đạn tầm xa*).
     - **Kỷ lục ải & Tiến độ mục tiêu tiếp theo**: hiển thị `Ải đạt được / Kỷ lục chương` (số dạng `tabular-nums`) cùng thanh tiến độ trực tiếp tới **món trang bị/mốc mục tiêu kế tiếp** (Rare Ải 4 → Epic cuối Ch.1–2 → Mẫu S Ch.3) kèm nguồn rơi rõ ràng.
     - **Thao tác chơi lại nhanh 1 chạm**: nút *Thử Lại Ngay* nổi bật (tiêu điểm duy nhất) đặt cạnh nút nâng cấp nhanh khi đủ Vàng cường hóa món mục tiêu.

### Nguyên tắc Thị giác & Đọc hiểu Chiến đấu trên Màn hình Nhỏ
- **Tín hiệu báo đòn Boss (3D Telegraph Readability)**:
  - Nâng độ tương phản vòng cảnh báo mặt sàn và làn tia nguy hiểm (viền sáng sắc nét + độ mờ nền vừa đủ, không dùng hiệu ứng chói gắt gây lóa), bổ sung vòng viền mảnh thứ hai chỉ tiến độ tích chiêu và dấu hiệu pha nghỉ phản công ngay sau khi đòn kết thúc để vẫn đọc rõ trên màn hình di động nhỏ kể cả khi có nhiều mũi tên, sét và cầu nguyên tố.
- **Kỷ luật UI & Hiệu năng**:
  - Giữ nguyên bảng màu obsidian tinh giới – hổ phách hoàng kim (`60-30-10`), chữ số thẳng cột (`tabular-nums`), không tạo thẻ pill tĩnh cho metadata (dùng văn bản phân cách bằng `·`), mọi nút điều khiển trên một dòng (`whitespace-nowrap shrink-0`), tuân thủ `prefers-reduced-motion` và không dùng `backdrop-blur` lên canvas WebGL.

---

## 3. Key Product Decisions & Trade-Offs

### Quyết định 1: Tách sổ cái nhận thưởng vĩnh viễn (`claimedMailIds`) & Chính sách Migration Save Cũ
- **Hướng chọn**:
  - Lưu một danh sách `claimedMailIds: string[]` (và `deletedMailIds: string[]` / `progressionSchemaVersion`) độc lập với mảng `mailInbox` đang hiển thị.
  - Mọi đường nhận thưởng (*Nhận từng thư*, *Nhận tất cả trong hộp thư*, *Nhận Nhanh Toàn Bộ Quà Sảnh*, *Xóa thư đã nhận*, *Tải lại trang*) đều đi qua **một bộ hàm thuần duy nhất** để đọc/ghi `claimedMailIds`, cập nhật hộp thư và phát vật phẩm (đồng thời vá luôn lỗi *Nhận Nhanh Quà Sảnh* hiện đang bỏ sót hoặc lệch quy tắc với Hộp Thư).
  - **Quyết định Migration cho save cũ (chưa có `progressionSchemaVersion`)**:
    1. Nếu save cũ không còn một mã thư hệ thống nào trong `mailInbox` (người chơi đã xóa trước đây), migration **ghi thẳng mã thư đó vào `claimedMailIds`** để không phát lại.
    2. Nếu thư hệ thống vẫn còn trong `mailInbox`, giữ nguyên cờ `claimed`; nếu `claimed === true`, đồng bộ mã thư vào `claimedMailIds`.
    3. **Bảo toàn 100% tài sản tài khoản cũ**: Không xóa, không hạ cấp, không thu hồi trang bị, rune, cánh, danh hiệu, thành tựu hay tiền tệ đã kiếm được của save cũ; chỉ áp dụng baseline mới cho tài khoản tạo mới (`createInitialSaveData`).
- **Lý do**: Xóa bỏ triệt để lỗ hổng nhận đồ vô hạn mà không phá vỡ niềm tin của người chơi cũ.

### Quyết định 2: Cổng tiến độ Chương 1–3 & Ngân sách thưởng tổng hợp (Unified Reward Ceiling)
- **Hướng chọn**:
  - Xây dựng một bộ quy tắc tập trung **Progression Gate & Reward Policy** định nghĩa trần phẩm chất (`maxGearRarity`), quyền rơi mẫu S (`allowSTier`) và mốc mở khóa từng tính năng theo tiến độ thực (`highestChapterCleared` và `bestStagePerChapter[1]`):
    - **Chưa chiến đấu (`bestStageCh1 < 4` & `highestChapterCleared === 0`)**: Trần trang bị = **Thường (Common)**, `allowSTier = false`. Không bất kỳ nguồn hợp lệ nào (Thư, Welcome Gift, Starter Pack, Rương Sắt/Thần Thoại, Flash Sale, Quét Nhanh, Battle Pass, Sự kiện, Cửa hàng) có thể cấp Rare/Epic/Legendary hay Mẫu S.
    - **Giữa Chương 1 (`bestStageCh1 >= 4` – đã vượt Phụ Boss 1 Ares)**: Mở khóa phẩm **Hiếm (Rare)** (`allowSTier = false`), kích hoạt mốc thưởng/chế tạo **món Rare đầu tiên** (cùng đường rơi rõ ràng từ rương/cột mốc Chương 1).
    - **Cuối Chương 1 – Chương 2 (`highestChapterCleared >= 1`)**: Mở khóa phẩm **Sử Thi (Epic)** (`allowSTier = false`), mở Rương cao cấp bậc Epic, Ngọc Khắc đầu tiên, và mở khóa dần các hoạt động sảnh Chương 2.
    - **Từ Chương 3 (`highestChapterCleared >= 2` hoặc hoàn thành cột mốc đầu Chương 3)**: Mở khóa dòng **Mẫu S (`[S]`)** và bậc **Huyền Thoại (Legendary)** theo tỷ lệ hợp lệ.
  - **Bảo toàn Pity khi mở khóa pool mới**:
    - Bộ đếm Pity (`mythicRollsSinceEpic`, `mythicRollsSinceSTier`, `runeRollsSinceEpic`) **không bị reset oan** khi người chơi mở rương trước khi mở khóa pool Epic hoặc Mẫu S. Nếu chạm ngưỡng Pity trong khi pool chưa mở khóa, bộ đếm được **giữ nguyên ở mức sẵn sàng nổ** (`pityCap - 1` hoặc kích hoạt ngay ở lượt đầu tiên sau khi mở khóa Chương tương ứng) thay vì bị tiêu thụ vô ích vào đồ cấp thấp.
  - **Cánh & Danh hiệu khởi điểm**: Dời Ngọc Khắc Rare, Cánh Thần Quang 3D cộng chỉ số và Danh Hiệu 3D cộng chỉ số ra khỏi trạng thái khởi tạo mới (không tự hồi sinh trong `normalize` khi tải lại save mới), gắn vào các mốc thành tựu/chương rõ ràng (ví dụ: Ngọc Khắc đầu tiên khi vượt Chương 1, Danh hiệu chiến đấu khi hạ Boss Chương 1, Cánh 3D ở mốc Chương 2–3).

### Quyết định 3: Cân bằng Chương 1, 2 Hướng Build & Đọc Đòn Boss
- **Hướng chọn**:
  - **Baseline Artemis**: Bắt đầu với `Artemis` (0★), `Cung Khởi Nguyên (Thường Lv1)` và `Áo Choàng Nguyệt Lâm (Thường Lv1)`, kèm lượng Vàng khởi điểm vừa đủ cho 1–2 lần nâng cấp vũ khí ngay sau lượt đầu/ải đầu.
  - **2 hướng build khả thi ở Chương 1** (dùng hệ thống kỹ năng đang có và định hướng lựa chọn Valkyrie tại Ải 2 / 6 / 10):
    1. **Build Dọn Nhóm (AoE / Lan Sát Thương)**: Trọng tâm *Đạn Nảy Liên Hoàn (Ricochet)* + *Tên Chéo / Xuyên Thấu* + *Lôi Tiễn / Hỏa Tiễn* (+ *Cầu Nguyên Tố*). Vượt trội ở các phòng đông quái Ải 3, 5, 7, 9, 11.
    2. **Build Đánh Boss (Đơn Mục Tiêu / Kiểm Soát)**: Trọng tâm *Tên Phía Trước (+1)* + *Liên Xạ (Multishot)* + *Tập Trung Chí Mạng / Băng Tiễn (Làm chậm Boss)* + *Suối Nguồn Sinh Mệnh / Khiên Thánh*. Ổn định cao ở Phụ Boss Ải 4, 8 và Boss cuối Ải 12.
  - **Nhịp trận & 3 Boss Chương 1**:
    - *Phụ Boss 1 – Ares (Ải 4)*: Đòn báo vùng tròn dậm đất (`slam`) và lao tới (`lunge`) có thời gian báo đòn rõ + khoảng nghỉ phản công ~1.3–1.5s.
    - *Phụ Boss 2 – Boreas (Ải 8)*: Đòn tia dẫn hướng (`lane`) và đạn tỏa kết hợp lính phụ, có khoảng hở di chuyển ngang + cửa sổ phản công rõ ràng.
    - *Boss cuối – Sư Vương Thái Dương (Ải 12)*: Pha I dùng tổ hợp đòn đơn dễ đọc; Pha II (<55% HP) tăng nhịp bằng chuỗi tia quét + dậm đất nhưng giữ cửa sổ né và phản công công bằng.
    - Tinh chỉnh `recommendedPower` Chương 1–3 khớp với kết quả đo thực tế của baseline mới (không để lệch hàng nghìn điểm như HEAD hiện tại).

### Quyết định 4: Bộ Kiểm Thử Hồi Quy & Mô Phỏng Có Seed (Data-Driven Acceptance)
- **Hướng chọn**:
  - Viết bộ unit/integration test tự động kiểm tra: nhận thư 1 lần, xóa thư không hồi sinh, tải lại, migration save cũ (đủ/thiếu thư, không mất đồ cũ), chặn toàn bộ đường vượt mốc Epic/Legendary/S trước trận đầu, và kiểm tra chênh lệch DPS kỳ vọng trước trận đầu `≤ 10%`.
  - Viết bộ **mô phỏng kinh tế RNG có seed** (Mulberry32 deterministic PRNG) chạy trên đúng hàm economy/gacha thật của game để so sánh **Trước vs Sau** phân bố lượt nhận món Rare / Epic / `[S]` ở các mốc **P10 / P50 / P90**, tách riêng 2 nhóm người chơi (*Chỉ đi Chiến dịch* vs *Tối ưu mọi nguồn miễn phí*).
  - Viết bộ **mô phỏng chiến đấu Chương 1 có seed** dùng đúng công thức sát thương, tốc bắn, HP quái/boss, chu kỳ đòn boss và kỹ năng của engine để đo **thời gian dọn phòng, thời gian hạ từng Boss và số mẫu đòn Boss kịp thể hiện** cho cả 2 hồ sơ (tối giản & tối ưu hợp lệ) và 2 hướng build; ghi rõ phần nào đã đo bằng code và phần nào cần playtest người thật (kèm bộ chỉ số theo dõi vận hành: tỷ lệ bắt đầu lượt 2 sau lần thua đầu, điểm bỏ cuộc theo ải, tỷ lệ vượt boss theo số lần thử, thời gian tới nâng cấp có ý nghĩa đầu tiên, tỷ lệ quay lại D1).

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Sơ đồ Kiến trúc Hệ thống & Dòng Dữ liệu

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SAVE STORAGE & MIGRATION LAYER                       │
│  loadSaveData() ──▶ migrateSaveData() ──▶ SaveData (schemaVersion v2)   │
│  • claimedMailIds[] (sổ cái bất biến, tách rời khỏi mailInbox)          │
│  • Giữ nguyên 100% đồ/thành tựu save cũ; chỉ áp baseline mới cho new    │
└────────────────────────────────────┬────────────────────────────────────┘
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│             PROGRESSION GATE & UNIFIED REWARD POLICY                    │
│  getEarlyProgressionPolicy(save) ──▶ { maxRarity, allowSTier, unlocks } │
│  • Ch.1 trước Ải 4: max Common, không [S], khóa tính năng meta phụ      │
│  • Ch.1 sau Ải 4:   mở Rare + mốc/chế tạo món Rare đầu tiên             │
│  • Sau Ch.1 (Ch.2): mở Epic + Rune đầu tiên + hoạt động Ch.2            │
│  • Từ Ch.3:         mở Mẫu [S] + Legendary, bảo toàn bộ đếm Pity        │
└──────────────┬────────────────────────────────────────┬─────────────────┘
               ▼                                        ▼
┌─────────────────────────────────────┐  ┌────────────────────────────────┐
│   REWARD CHANNELS (HANDLERS + UI)   │  │   CHAPTER 1–3 COMBAT ENGINE    │
│ • Mail / Claim All / Welcome Gift   │  │ • Valkyrie Ải 2/6/10: chọn     │
│ • Starter Pack / Chests + Pity      │  │   build (AoE vs Boss)          │
│ • Flash Deals / Pass / Sweep        │  │ • Boss Ải 4/8/12: telegraph    │
│ • Wave 3–14 Events & Shops          │  │   tương phản cao + punish win  │
│ • Target Gear & Milestone Tracker   │  │ • Death Cause & Run Telemetry  │
└──────────────┬──────────────────────┘  └───────────────┬────────────────┘
               └────────────────────┬────────────────────┘
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│             UI FEEDBACK & VERIFICATION HARNESS                          │
│ • Lobby: Mốc khóa tính năng rõ ràng + Theo dõi món mục tiêu (Rare/Epic/S│
│ • Result Modal: Nguyên nhân thua + Kỷ lục ải + Tiến độ mục tiêu + Retry │
│ • Automated Suite: Regression Tests + Seeded Economy (P10/P50/P90)      │
│                    + Seeded Ch.1 Combat Pacing & DPS Gap (≤ 10%)        │
└─────────────────────────────────────────────────────────────────────────┘
```

### Mô hình Dữ liệu & Trạng thái cốt lõi
- **Sổ cái & Phiên bản lưu (`SaveData`)**:
  - `progressionSchemaVersion?: number`: phân biệt save cũ (`undefined` / `1`) với save mới (`2`) để chạy migration một lần an toàn.
  - `claimedMailIds?: string[]`: danh sách mã thư đã từng nhận thưởng (không bao giờ bị xóa khi người chơi dọn hộp thư).
  - `deletedMailIds?: string[]`: danh sách mã thư đã bị người chơi ẩn/xóa khỏi hộp thư để không tự mọc lại khi chuẩn hóa.
  - `earlyMilestonesClaimed?: string[]`: các mốc thử nghiệm đầu game (ví dụ: *Món Hiếm đầu tiên – Phụ Boss Ải 4*, *Hạ Boss Chương 1 – Mở Ngọc Khắc & Danh Hiệu*, *Chạm mốc Sử Thi*, *Mở khóa Mẫu S Chương 3*).
  - `earlyForgeProgress?: { rareFragments: number; epicFragments: number; sTierBlueprints: number }`: tiến độ chế tạo/tích mảnh rõ ràng cho món mục tiêu Rare, Epic và Mẫu S (hiển thị cả ở Sảnh và Màn Kết Quả).
- **Trạng thái kết thúc trận (`RunEndSummary` / `GameEngine` callback)**:
  - Bổ sung `defeatCause?: { code: string; label: string; tip: string; killerName?: string; attackType?: string }` ghi nhận đòn kết liễu thật từ engine (đạn tầm xa, áp sát, dậm đất Boss, tia cảnh báo Boss) để màn hình kết quả hiển thị nguyên nhân thua chính xác thay vì chỉ thông báo chung chung.

### Ánh xạ Tương tác & Xử lý Trạng thái
- **Hộp Thư & Nhận Nhanh Toàn Bộ**: Mọi thao tác *Nhận 1 thư*, *Nhận hết thư*, *Xóa thư đã nhận* và *Nhận Nhanh Quà Sảnh* đều gọi qua hàm xử lý dùng chung kiểm tra `claimedMailIds`, áp dụng `getEarlyProgressionPolicy(save)` cho vật phẩm đính kèm (nếu có), và đảm bảo nhận lặp = 0.
- **Cửa Hàng, Rương & Gói Quà (Handler + UI)**:
  - Bộ lọc/chuyển đổi tại tầng dữ liệu đảm bảo không có handler nào có thể sinh món vượt `maxRarity` hoặc `allowSTier` của tài khoản hiện tại.
  - UI hiển thị trạng thái khóa theo chương (có giải thích mốc mở khóa ngắn gọn) và hiển thị bộ đếm Pity + ghi chú bảo toàn Pity khi pool Epic/S chưa mở.
- **Vòng lặp Chiến đấu Chương 1 & Màn Kết Quả**:
  - Valkyrie Ải 2/6/10 ưu tiên đưa ra các lựa chọn phân nhánh rõ ràng giữa 2 hướng build (có thẻ gợi ý ngắn gọn không rườm rà) để người chơi chủ động thử nghiệm build ngay trong Chương 1.
  - Màn kết quả nhận `defeatCause`, `bestStage`, và tính tiến độ tới mục tiêu tiếp theo từ `save` hiện tại, cung cấp nút *Chơi Lại Ngay* 1 chạm và nút *Nâng Cấp Nhanh* khi đủ vàng.
- **Kế hoạch Kiểm chứng & Bàn giao Số liệu**:
  - Đo và lưu bảng 3 hồ sơ **Trước (HEAD)** vs **Sau** (cùng hero Artemis): *Vừa tạo*, *Nhận hết quà sảnh hợp lệ*, và *Vừa vượt Chương 1*.
  - Chạy toàn bộ bộ kiểm thử hồi quy, kiểm tra TypeScript, build production, chạy mô phỏng RNG có seed (P10/P50/P90) và mô phỏng chiến đấu Chương 1; bàn giao đầy đủ bảng trước/sau, danh sách file thay đổi, quyết định migration, phần đã quan sát so với mục tiêu thiết kế, và các tham số tinh chỉnh sau playtest người thật.

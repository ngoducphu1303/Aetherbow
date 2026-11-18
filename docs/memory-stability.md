# Sửa vòng đời GPU và giảm tải laptop

## Bằng chứng trước khi sửa

- Baseline repository: `4c05e0059b18f355b638074ff262020187adc8ad`.
- Kiểm thử 100 lần xóa thực thể khỏi phòng ghi nhận **0/100 geometry được dispose**.
- 100 cập nhật chỉ số cùng ngoại hình dựng lại hero **100 lần**.
- Nhánh GPU phần cứng không đi qua bước chờ hoàn tất frame.
- Nhật ký Windows của máy thử có EventLog 6008 (tắt bất thường), nhưng không tìm được sự kiện Resource-Exhaustion-Detector trong cửa sổ 7 ngày. Không dùng điều này để kết luận chắc chắn nguyên nhân tắt nguồn là RAM.

## Thay đổi

- Giải phóng geometry/material/texture của đối tượng đã nghỉ ở các đường: đổi phòng/map, diệt quái, nhặt loot, phá bình, đóng shrine, đổi hero/companion/pet và hủy engine.
- Giữ texture bóng tiếp xúc và environment còn dùng chung; giải phóng khi hủy engine.
- Không dựng lại hero khi chỉ tiến độ/chỉ số thay đổi và ngoại hình giữ nguyên.
- Chờ GPU hoàn tất frame trước khi gửi frame tiếp theo, tối đa 30 FPS chiến đấu / 20 FPS sảnh / 12 FPS software GL.
- Tab ẩn không render hoặc mô phỏng chiến đấu.
- Nhận diện nhóm GPU Intel tích hợp, CPU <=4 luồng hoặc thiết bị báo <=4 GB RAM: dùng chất lượng thấp, bỏ MSAA/shadow/starfall và DPR tối đa 1; không ghi đè save.
- Giới hạn tổng số pixel buffer: 1,5 triệu ở profile nhẹ, 2,5 triệu ở profile khác.

## Xác minh trên máy thực

Môi trường: Windows 10 Pro, Intel Core i7-3520M, Intel HD Graphics 4000, RAM khả dụng hệ thống 8.097 MB. Dùng Chrome cài trên máy, WebGL phần cứng; engine tự chọn profile nhẹ.

- Production build: thành công.
- 6 kiểm thử hồi quy: thành công; các lỗi được sửa đã được quan sát RED trước khi sửa.
- Lượt Chrome cục bộ trên bản cuối: khoảng 180 giây, 36 mẫu mỗi 5 giây, bắt đầu bằng nút vào game và Chiến đấu thật.
- Đã tăng HP riêng trong fixture để sống đủ thời gian; tự xử lý draft và đưa nhân vật qua portal. Không phải kiểm thử cân bằng hay chơi thủ công đầy đủ.
- 28 quái bị diệt, tới phòng 6; engine tiếp tục cập nhật đến hết lượt (lượt trước bản phục hồi context: 44 quái, phòng 7).
- JS heap quan sát: 15–27 MB. Đây không phải tổng RAM của Chrome hay bộ nhớ GPU.
- RAM hệ thống trống thấp nhất: 3.578 MB; commit cao nhất: 49%.
- Không có lỗi JavaScript trong lượt.
- Mô phỏng mất và phục hồi WebGL context trên Chrome thật: mô phỏng dừng khi context mất, render tự chạy lại sau phục hồi.
- 12 lượt thay model/map sau đó: cuối lượt 65 geometry / 8 texture; không tăng liên tục theo số lần đổi.
- Bộ giám sát PowerShell lấy mẫu mỗi 2 giây, dừng cây Chrome kiểm thử khi RAM trống <1.500 MB hoặc commit >=78%. Đây là lớp giảm rủi ro, không bảo đảm ngăn mọi sự cố nguồn/nhiệt/driver.

Dữ liệu: `memory-evidence/runtime.json`, `memory-evidence/system-memory.jsonl`, `memory-evidence/churn.json`.

Typecheck toàn dự án vẫn có 3 lỗi cũ, đã chạy lại trên source baseline từ Git và thấy đúng cùng các lỗi:

1. `App.tsx`: thiếu props journey của `DailyRewardsModal`.
2. `App.tsx`: thiếu props socket gem của `RelicForgeModal`.
3. `GameEngine.ts`: arena rival thiếu `headOrCore` trong `EnemyModelRefs`.

Bản sửa này không che hoặc sửa các lỗi không liên quan đó. Build Vite không thay thế typecheck.

## Chạy lại

Chạy từng bước, không đồng thời, chỉ khi đủ RAM trống:

    npm test
    npm run build

Windows/Git Bash, dùng playwright-core đã cài và Chrome hệ thống, không tải browser mới:

    PLAYWRIGHT_MODULE="C:/path/to/playwright-core/index.mjs" FULL_RUN=1 DURATION_MS=180000 node --max-old-space-size=192 tools/verify-memory-local.mjs

Harness chỉ phục vụ `dist` trên loopback, chặn request ra ngoài; hook đo engine được chèn trong response cục bộ, không thêm API sửa state vào production. Cần lưu công việc trước khi chạy trên máy từng tắt nguồn.

## Giới hạn kết luận

Lượt thử này chứng minh bản build cục bộ vượt qua tình huống thử nêu trên mà không tăng tài nguyên vô hạn. Không chứng minh mọi chế độ/kỹ năng hoặc nhiều giờ chơi không còn lỗi; không loại trừ lỗi nguồn, quá nhiệt hay driver GPU. Bản Vercel chỉ được coi là đã sửa sau khi push/deploy và xác minh asset mới.

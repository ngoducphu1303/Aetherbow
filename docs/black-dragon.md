# Hắc Long — thú cưỡi Aetherbow

Trong thư mục Aetherbow, chạy `npm run dev` rồi mở địa chỉ local mà máy chủ in ra. Vào **Anh Hùng → Thú Cưỡi → Hắc Long → Nhận Miễn Phí** để trang bị. Quay lại Chiến Đấu: WASD để di chuyển trong phố, kéo chuột phải để xoay camera. Thanh Long vẫn là thú cưỡi riêng với mô hình và hoạt ảnh cũ.

Tệp tối ưu nằm ở `public/assets/mounts/black-dragon.glb` và được đóng gói trong bản build. Game chỉ tải mô hình khi cần; nếu tải thất bại, game hiển thị mô hình thú cưỡi dự phòng.

Nguồn: [Black Dragon with Idle Animation](https://sketchfab.com/3d-models/black-dragon-with-idle-animation-fb0053a2e59b43868e934c239bf4eb36) của [3DHaupt](https://sketchfab.com/dennish2010). Metadata trong GLB ghi [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/). Bản tích hợp bỏ đế trưng bày, giảm kích thước texture còn tối đa 1024 px và gắn điểm ngồi vào xương rồng. Tệp nguồn chỉ có hoạt ảnh idle; di chuyển sử dụng cùng clip với tốc độ phát khác, không có hoạt ảnh đi/chạy hay cơ chế bay riêng.

Quyền phát hành trong Aetherbow: chủ dự án xác nhận có giấy phép riêng và cho phép đưa mẫu đã tối ưu vào kho mã và bản game. Xác nhận này không thay đổi giấy phép nguồn hoặc cấp quyền dùng lại tệp ngoài Aetherbow.

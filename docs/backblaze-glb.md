# Tải mô hình Aetherbow từ bucket Backblaze B2 Private

Game tải qua Cloudflare Worker. Worker ký yêu cầu tới bucket `aetherbow-assets` ở vùng `us-east-005`, giữ khóa ở phía máy chủ và cho trình duyệt tải các tệp `.glb` qua HTTPS. Bucket B2 vẫn ở chế độ **Private**. Worker phục vụ GLB cho người chơi và hỗ trợ tải theo đoạn cho bản đồ lớn Chương 1.

## Upload 3D vào Backblaze

1. Trong **Application Keys → Add a New Application Key**, chọn bucket **aetherbow-assets**, quyền **Read and Write**. Lưu giá trị **keyID** vào `B2_KEY_ID` và **applicationKey** vào `B2_APPLICATION_KEY` trong cấu hình bảo mật của môi trường upload. Backblaze chỉ hiện giá trị applicationKey khi tạo khóa.
2. Cho môi trường upload truy cập `s3.us-east-005.backblazeb2.com` qua HTTPS. Có thể giữ CORS của B2 nguyên vì Worker truy cập B2 từ máy chủ.
3. Chạy từ repo với Git, Node.js và rclone.

   ```sh
   node scripts/upload-glb-b2.mjs --list
   node scripts/upload-glb-b2.mjs
   ```

Script giữ nguyên đường dẫn tệp, đặt MIME `model/gltf-binary` và kiểm tra các object đã upload. Có thể chạy lại khi thêm hoặc thay tệp. Tùy chọn `--check` chỉ xác minh. Khi thay tệp tại cùng đường dẫn, tăng version tương ứng trong mã game để đổi khóa cache.

## Triển khai Worker

Tạo thêm một khóa **Read Only** cho bucket `aetherbow-assets`, có thể giới hạn prefix `assets/`. Đặt cặp giá trị vào Worker Secrets dưới tên `B2_READ_KEY_ID` và `B2_READ_APPLICATION_KEY`.

Nếu triển khai từ Codex Cloud, cho phép `api.cloudflare.com` và cấu hình `CLOUDFLARE_ACCOUNT_ID` cùng `CLOUDFLARE_API_TOKEN` có quyền sửa Workers trong account đích. Nếu dùng máy cá nhân, có thể đăng nhập Wrangler. Với biến bí mật đã nạp vào shell, triển khai và gắn khóa bằng:

```sh
npm exec --yes --package=wrangler -- wrangler deploy --config workers/glb-cdn/wrangler.jsonc
printf '%s' "$B2_READ_KEY_ID" | npm exec --yes --package=wrangler -- wrangler secret put B2_READ_KEY_ID --config workers/glb-cdn/wrangler.jsonc
printf '%s' "$B2_READ_APPLICATION_KEY" | npm exec --yes --package=wrangler -- wrangler secret put B2_READ_APPLICATION_KEY --config workers/glb-cdn/wrangler.jsonc
```

## Chuyển game sang Worker

Lấy URL `workers.dev` từ lần triển khai. Kiểm tra tệp bản đồ lớn qua Worker và xác nhận HTTP 206, `Content-Range` đúng cùng header CORS:

```sh
curl --fail --silent --show-error --dump-header - --output /dev/null \
  -H 'Origin: https://aetherbow.vercel.app' -H 'Range: bytes=0-11' \
  'https://aetherbow-glb.puugoo002.workers.dev/assets/Ch%C6%B0%C6%A1ng%201/Map%20m%E1%BB%9Bi/Ch%C6%B0%C6%A1ng%201.glb?v=2'
```

Build Vercel mặc định dùng Worker này và bỏ GLB khỏi `dist`. Biến `VITE_GLB_CDN_BASE_URL` có thể ghi đè URL nếu chuyển sang hostname khác. Có thể quay lại gói GLB nội bộ bằng cách đặt biến thành chuỗi rỗng cho lần build hoặc hoàn tác cấu hình Vercel.

# Tải mô hình Aetherbow từ bucket Backblaze B2 Private

Game tải qua Cloudflare Worker. Worker ký yêu cầu tới bucket `aetherbow-assets` ở vùng `us-east-005`, giữ khóa ở phía máy chủ và cho trình duyệt tải các tệp `.glb` qua HTTPS. Bucket B2 vẫn ở chế độ **Private**. Worker phục vụ GLB cho người chơi và hỗ trợ tải theo đoạn cho bản đồ lớn Chương 1.

## Upload hoặc thay GLB từ máy local

Đăng nhập GitHub CLI bằng tài khoản chủ repo Aetherbow, sau đó đặt tệp GLB đúng thư mục `public/assets`.

```sh
gh auth login --hostname github.com --web
npm run upload:glb -- "public/assets/Chương 2/Runtime/bellona-lite.glb"
```

Worker kiểm tra tài khoản GitHub trước khi cấp quyền tải lên đúng một tệp. URL có chữ ký hết hạn sau 5 phút và chỉ dùng được với kích thước và checksum đã gửi. Script truyền tệp trực tiếp tới Backblaze và xác minh qua CDN. Cập nhật `scripts/glb-manifest.json` nếu đường dẫn mới hoặc kích thước thay đổi. Khi thay nội dung ở cùng đường dẫn, tăng version tương ứng trong mã game để làm mới cache.

Script rclone `node scripts/upload-glb-b2.mjs` vẫn có thể dùng cho đồng bộ hàng loạt trực tiếp với B2 nếu môi trường có cặp khóa upload. Tùy chọn `--list` kiểm tra tệp local và `--check` đối chiếu tệp local với B2.

## Triển khai Worker

Tạo thêm một khóa **Read Only** cho bucket `aetherbow-assets`, có thể giới hạn prefix `assets/`. Đặt cặp giá trị vào Worker Secrets dưới tên `B2_READ_KEY_ID` và `B2_READ_APPLICATION_KEY`. Upload qua Worker dùng thêm `B2_WRITE_KEY_ID` và `B2_WRITE_APPLICATION_KEY` với quyền ghi giới hạn trong bucket này. Các secret được lưu trên Worker. `UPLOAD_GITHUB_USER_ID` trong `wrangler.jsonc` giới hạn quyền upload theo ID tài khoản GitHub.

Nếu triển khai từ Codex Cloud, cho phép `api.cloudflare.com` và cấu hình `CLOUDFLARE_ACCOUNT_ID` cùng `CLOUDFLARE_API_TOKEN` có quyền sửa Workers trong account đích. Nếu dùng máy cá nhân, có thể đăng nhập Wrangler. Với biến bí mật đã nạp vào shell, triển khai và gắn khóa bằng:

```sh
npm exec --yes --package=wrangler -- wrangler deploy --config workers/glb-cdn/wrangler.jsonc
printf '%s' "$B2_READ_KEY_ID" | npm exec --yes --package=wrangler -- wrangler secret put B2_READ_KEY_ID --config workers/glb-cdn/wrangler.jsonc
printf '%s' "$B2_READ_APPLICATION_KEY" | npm exec --yes --package=wrangler -- wrangler secret put B2_READ_APPLICATION_KEY --config workers/glb-cdn/wrangler.jsonc
printf '%s' "$B2_WRITE_KEY_ID" | npm exec --yes --package=wrangler -- wrangler secret put B2_WRITE_KEY_ID --config workers/glb-cdn/wrangler.jsonc
printf '%s' "$B2_WRITE_APPLICATION_KEY" | npm exec --yes --package=wrangler -- wrangler secret put B2_WRITE_APPLICATION_KEY --config workers/glb-cdn/wrangler.jsonc
```

## Chuyển game sang Worker

Lấy URL `workers.dev` từ lần triển khai. Kiểm tra tệp bản đồ lớn qua Worker và xác nhận HTTP 206, `Content-Range` đúng cùng header CORS:

```sh
curl --fail --silent --show-error --dump-header - --output /dev/null \
  -H 'Origin: https://aetherbow.vercel.app' -H 'Range: bytes=0-11' \
  'https://aetherbow-glb.puugoo002.workers.dev/assets/Ch%C6%B0%C6%A1ng%201/Map%20m%E1%BB%9Bi/Ch%C6%B0%C6%A1ng%201.glb?v=2'
```

Build Vercel mặc định dùng Worker này và bỏ GLB khỏi `dist`. Biến `VITE_GLB_CDN_BASE_URL` có thể ghi đè URL nếu chuyển sang hostname khác. Có thể quay lại gói GLB nội bộ bằng cách đặt biến thành chuỗi rỗng cho lần build hoặc hoàn tác cấu hình Vercel.


## Chạy local và kiểm thử

Vite dùng CDN mặc định. Có thể chạy game ngay sau khi clone mà không cần tải kho GLB về máy. Để chạy kiểm thử cần tệp mô hình trên đĩa hoặc chỉnh sửa asset, tải từ CDN:

```sh
npm run sync:glb
npm run check:glb
```

Thêm `-- --all` để tải cả mẫu gốc dung lượng lớn, hoặc dùng `-- --file "public/assets/…/Tên.glb"` để tải riêng một tệp. Nếu muốn game local đọc các tệp vừa tải, đặt `VITE_GLB_CDN_BASE_URL=""` trong `.env.local`. Các tệp tải về được Git bỏ qua. Bản gốc trước khi gỡ vẫn truy xuất được từ commit `3a1eda6`.

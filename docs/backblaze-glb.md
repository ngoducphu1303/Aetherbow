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

Tạo thêm một khóa **Read Only** cho bucket `aetherbow-assets`, có thể giới hạn prefix `assets/`. Đặt cặp giá trị vào Worker Secrets dưới tên `B2_READ_KEY_ID` và `B2_READ_APPLICATION_KEY`. Upload qua Worker dùng thêm `B2_WRITE_KEY_ID` và `B2_WRITE_APPLICATION_KEY` với quyền **đọc và ghi** giới hạn trong bucket này (quyền đọc cần cho bước HEAD xác minh đối tượng sau khi hoàn tất upload). Các secret được lưu trên Worker. `UPLOAD_GITHUB_USER_ID` trong `wrangler.jsonc` giới hạn quyền upload theo ID tài khoản GitHub.

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

## Trang quản trị trong game

Mở [Quản trị mô hình 3D](https://aetherbow.vercel.app/admin/assets) và đăng nhập bằng tên tài khoản `puugoo` cùng mật khẩu. Chọn model đã tích hợp, tải tệp GLB 2.0 tối đa 120 MB, xem thử bản nháp rồi bấm **Áp dụng**. Người chơi tải bản đã áp dụng khi mở lại game. Nút **Quay lại bản trước** khôi phục phiên bản trước đó, kể cả bản gốc trên CDN.

Danh mục quản trị lấy các model có `"runtime": true` trong manifest. Worker kiểm tra Firebase ID token và email quản trị đã xác minh. Biến bí mật `ADMIN_GOOGLE_EMAIL` cấu hình người được phép ghi. Durable Object `ASSET_CATALOG` lưu phiên bản nháp và đã áp dụng. Tệp mới nằm dưới prefix `assets/.revisions/` trên B2. Game đọc danh mục phiên bản lúc khởi động và dùng URL riêng cho từng bản để cache ổn định.

### Chuẩn bị tệp mới trước khi tích hợp

Trong trang quản trị, mở **Tải asset mới**, chọn chương và nhóm, rồi tải một hoặc nhiều tệp GLB 2.0. Mỗi tệp tối đa 120 MB. Cả **Tải asset mới** và **Thay model đã tích hợp** đều gửi từng phần 6 MiB qua Worker tới B2 Private, thay vì đẩy nguyên tệp qua một request. Worker lưu ETag đã được B2 xác nhận cho từng phần. Nếu bị gián đoạn, chọn lại chính tệp đó (giữ nguyên tên, kích thước và thời điểm sửa tệp) trong cùng phiên trình duyệt rồi bấm tải lại; các phần đã được ghi nhận sẽ được bỏ qua. Chỉ hiển thị 100% sau khi B2 và danh mục đã xác nhận hoàn tất. Ví dụ, bản đồ Chương 3 được lưu dưới `assets/Chương 3/Asset mới/Bản đồ/<id>/<tên-tệp>.glb`. Tên tệp được giữ lại và mỗi lần tải có đường dẫn riêng.

Dùng **Sao chép danh sách cho AI** nếu muốn gửi thủ công, hoặc dùng cơ chế tự động đọc kho asset:

```sh
npm run inbox:glb -- 3
npm run inbox:glb -- 3 --download tmp/ch3-inbox
```

Worker cung cấp endpoint chỉ-đọc `GET /__asset-inbox?chapter=<1..12>` (hoặc bỏ `chapter` để liệt kê tất cả chương) trả về tên tệp, nhóm, kích thước và URL CDN công khai của các model trong kho mới, trong khi mọi thao tác upload/publish/rollback dưới `/__admin/*` vẫn yêu cầu xác thực quản trị. Sau khi triển khai Worker một lần bằng `npm run deploy:worker`, AI và script build có thể tự đọc và tải model mới cho mọi chương mà không cần sao chép link thủ công. Trang quản trị cũng tự động đồng bộ siêu dữ liệu kho sang Firestore (`/asset_inbox`) làm nguồn dự phòng chỉ-đọc khi `firestore.rules` đã được triển khai.

### Liên kết tài khoản quản trị puugoo

Trong lần đầu, chọn **Google để thiết lập hoặc khôi phục quyền** bằng tài khoản Google quản trị hiện tại. Bấm **Thiết lập đăng nhập puugoo**. Có thể liên kết tài khoản game đã tồn tại hoặc tạo tài khoản mới với mật khẩu do bạn đặt. Firebase quản lý mật khẩu. Worker ghim quyền vào UID của tài khoản puugoo sau khi nhận được cả hai phiên đăng nhập mới xác minh.

Các lần sau có thể vào thẳng bằng **puugoo** và mật khẩu. Cả kho asset mới và bản thay model dùng upload chia phần, tối đa 120 MB mỗi tệp.

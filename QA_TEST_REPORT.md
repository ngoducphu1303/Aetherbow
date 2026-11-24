# QA TEST REPORT — BÁO CÁO KIỂM THỬ & NGHIỆM THU CHẤT LƯỢNG

**Ngày nghiệm thu:** 24/11/2026
**Môi trường kiểm thử:** Node.js v22.23.5 + `tsx` + TypeScript `tsc --noEmit` + Vite Production Build + ESLint Firestore Rules.

---

## 1. Tổng Kết Kết Quả Kiểm Thử Tự Động

| Cổng kiểm tra | Lệnh thực thi | Trước nâng cấp | Sau nâng cấp | Trạng thái |
|---|---|---:|---:|---|
| **Toàn bộ Unit & Integration Tests** | `npm test` | 257 pass / 34 fail / 1 skip | **298 pass / 0 fail / 0 skip** | **ĐẠT 100%** |
| **Kiểm tra kiểu TypeScript** | `npm run lint` (`tsc --noEmit`) | Lỗi biên dịch trước đồng bộ | **0 lỗi** | **ĐẠT 100%** |
| **Biên dịch Production Bundle** | `npm run build` (`vite build`) | — | **Thành công** | **ĐẠT 100%** |
| **Kiểm chuẩn Quy tắc Firestore** | `npx eslint firestore.rules` | Thiếu 2 collection | **0 lỗi / 0 cảnh báo** | **ĐẠT 100%** |
| **Đồng bộ GLB 4 Chương + Dọn rác** | `sync:glb` + xóa `black-dragon.glb` | Thiếu GLB cục bộ | **137 GLB sẵn sàng** | **ĐẠT 100%** |

---

## 2. Chi Tiết Các Ca Kiểm Thử Mới Bổ Sung & Đã Xác Minh

1. **`tests/chapter-milestones-and-tactical-ai.test.mjs` (5/5 pass):**
   - Kiểm chứng vượt Ải 12 Chương 2 lần đầu (HP thấp, dùng hồi sinh, 0 né/phá giáp) **chỉ mở ★1 (Bellona + Pyro)**, không xả 7 món ngay lập tức, giữ lực chiến tăng ổn định.
   - Kiểm chứng lần thắng kỹ năng (HP ≥ 50%, 0 hồi sinh, ≥ 2 Né Hoàn Hảo) mở chính xác **★2 & ★3**; đạt Tháp 16 hoặc Ải 6 Chương 3 mở **★4 (Hào quang)**.
   - Kiểm chứng **`migrateSaveData()`** bảo toàn 100% tướng, thú cưỡi, tinh linh, cánh, thánh khí, hào quang, trang phục và `chapterEquipmentPresets` của Chương 2–4, đồng thời tự động quy đổi ngược ★1–★4 cho save cũ.
   - Kiểm chứng **Phối hợp đội hình quái (`computeSquadCoordinationVector`)**: tách khoảng cách chống chồng chéo và giữ cự ly thả diều cho quái tầm xa.
   - Kiểm chứng **Ngắt Chiêu (`evaluateCastInterrupt`)**: kích hoạt đúng với Tuyệt Kỹ / Phản Đòn / Chí mạng Nguyên tố, thưởng Suy Yếu +20% và Phá Giáp Boss +22%, tôn trọng hồi chiêu, bỏ qua đòn đánh thường.
   - Kiểm chứng **Boss 3 Giai Đoạn Chương 1–4 (`getChapterBossPhasePlan`)**: 3 pha 100% / 65% / 30% có nhịp telegraph tăng dần và thưởng Phản Đòn tăng dần từ +18% lên +27%.

2. **`tests/security-hardening.test.mjs` (6/6 pass):**
   - PoC chứng minh tài khoản mật khẩu `puugoo` **chưa liên kết** trên Worker bị từ chối tuyệt đối (`false`) khi gọi `verifyAssetAdminAuthorization()`.
   - Chứng minh tài khoản `puugoo` đã xác minh Worker và tài khoản Google chủ sở hữu đã xác thực email được phép truy cập; email chưa xác thực bị chặn.
   - Chứng minh `validateAndSanitizeSaveIntegrity()` lọc sạch dữ liệu `chapterMilestones` sai/vượt biên mà vẫn giữ nguyên dữ liệu hợp lệ.

3. **Cập nhật 3 bài test cũ đồng bộ với Chương 4 & kiến trúc Preload Lite:**
   - `tests/miku-hero.test.mjs`: cập nhật danh sách tướng hợp lệ gồm 4 chương (`aurelia`, `bellona`, `sylvia`, `celeste`).
   - `src/engine/blackDragonRide.test.ts` & `src/engine/solarLeoAssets.test.ts`: cập nhật bộ sưu tập Chương 4 (`celeste`, `twin_astral_spirits`, `dual_gemini_wings`, `celestial_wind_mount`, `twin_hourglass_relic`, `gemini_halo`) và xác nhận `black-dragon.glb` đã được gỡ khỏi đĩa.
   - `tests/model-preload-retry.test.mjs`: kiểm thử stream byte-level, bắt lỗi HTTP 500 và tải lại đúng 1 tệp lỗi mà không tải lại mô hình khỏe mạnh.

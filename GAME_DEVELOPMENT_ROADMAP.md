# GAME DEVELOPMENT ROADMAP — LỘ TRÌNH PHÁT TRIỂN P0 → P3 (PHASE 3)

Tài liệu này tổng hợp lộ trình kỹ thuật và nội dung cho **Aetherbow: Hoàng Đạo Trỗi Dậy**, phân tách rõ các hạng mục **đã hoàn thành trong đợt này** và các hạng mục **tiếp theo theo thứ tự ưu tiên P0 → P3**.

---

## 1. Sơ Đồ Phụ Thuộc (Dependency Graph)

```text
[P0: 0-PointLight E5430 & Migration Fixes] ──► [P0: Full Unit/Integration Green Baseline]
                                                       │
       ┌───────────────────────────────────────────────┴──────────────────────────────────────────────┐
       ▼                                               ▼                                              ▼
[P1: 8-Milestone Economy Model]              [P1: Security Anomaly Monitor]              [P1: Anti-Flash & UI Polish]
       │                                               │                                              │
       ▼                                               ▼                                              ▼
[P1-Next: Endgame Gold Sink (60h-100h)]      [P2: Save Export HMAC Checksum]             [P2: GLB Pair 100% Coverage]
       │                                               │                                              │
       └───────────────────────────────────────────────┴──────────────────────────────────────────────┘
                                                       │
                                                       ▼
                              [P2/P3: Chapters 5-12 3D Assets & Engine Modularization]
```

---

## 2. Chi Tiết Lộ Trình Theo Mức Ưu Tiên

### P0 — Ổn Định Nền Tảng, An Toàn Phần Cứng Yếu & Dữ Liệu Người Chơi (ĐÃ HOÀN THÀNH)

| Mã | Hạng mục | Tệp liên quan | Trạng thái |
|---|---|---|---|
| **P0-1** | **True 0-PointLight Lite Mode cho Dell Latitude E5430 / Intel HD 4000**: Tách hoàn toàn `heroLight` và `impactLightPool` khỏi `THREE.Scene` khi `lowEndGpu \|\| liteActive \|\| isSoftwareGl \|\| watchdogStage >= 2` để fragment shader biên dịch với `NUM_POINT_LIGHTS = 0`. | `zodiacLightingVfxDirector.ts`, `GameEngine.ts` | **Hoàn thành & Đã test** |
| **P0-2** | **Sửa Lỗi Di Cư Save (Hero & Mount)**: Tự động giữ `selectedHeroId` theo tướng mở qua tiến độ chương (`Ch.2 Bellona, Ch.3 Sylvia, Ch.4 Celeste`) và chuyển toàn bộ thú cưỡi đã nghỉ hưu về `solarius`. | `earlyProgressionData.ts` | **Hoàn thành & Đã test** |
| **P0-3** | **Kỹ Năng Chủ Động Độc Nhất Cho Sylvia (`jade_bastion`)**: Thay thế hiệu ứng mượn `ember_nova` bằng Địa Mạch Lục Bảo tạo khiên 12% HP + sóng ngọc lục bảo + làm chậm. | `game.ts`, `phase5Data.ts`, `GameEngine.ts` | **Hoàn thành & Đã test** |
| **P0-4** | **Đồng Bộ 100% Contract Kiểm Thử Dữ Liệu**: Cập nhật bộ test Ch.3–4 (`assetRegistry.test.ts`, `earlyProgression.test.ts`, `fairProgression30Day.ts`) đạt 100% pass. | `src/data/*.test.ts` | **Hoàn thành & Đã test** |
| **P0-5** | **Xác Minh Firestore Rules 0 Lỗi**: Giữ nguyên 7 blueprint bảo mật, kiểm định `npx eslint firestore.rules` = 0 lỗi. | `firestore.rules` | **Hoàn thành & Đã xác minh** |

---

### P1 — Cân Bằng Kinh Tế, Giám Sát An Ninh & Tiếp Cận (ĐÃ HOÀN THÀNH 5/5)

| Mã | Hạng mục | Tệp liên quan | Trạng thái |
|---|---|---|---|
| **P1-1** | **Mô Phỏng Kinh Tế 8 Mốc Thời Lượng (`5m → 100h`) & TTK/TTD**: Đo đạc thực tế trên toán học thật của game, tự động phát hiện cảnh báo dư Vàng Endgame. | `src/data/economyTelemetry.ts`, `tools/simulate-playtime-milestones.ts` | **Hoàn thành & Đã test** |
| **P1-2** | **Giám Sát Bất Thường & An Ninh Máy Chủ**: Ring buffer 200 sự kiện (`rate_limit`, `ws_clamped`, `auth_invalid`, `admin_denied`), API Admin-only `GET /api/admin/security-anomalies`, và bảng hiển thị đọc-duy-nhất trên Admin LiveOps Tab. | `src/server/serverSecurity.ts`, `server.ts`, `AssetAdminLiveOpsTab.tsx` | **Hoàn thành & Đã test** |
| **P1-3** | **Gia Cố Save Integrity**: Chuyển fallback sang `aurelia`, kẹp trần `level (1..120)`, `awakening (0..10)`, `heroStars (0..10)`, `pity`, `paragonInfusionLevel (0..500)`, `starDust/spiritCores`, và khử trùng lặp thư. | `src/data/saveIntegrity.ts`, `saveIntegrity.test.ts` | **Hoàn thành & Đã test** |
| **P1-4** | **Công Tắc Anti-Flash Độc Lập (`reduceScreenFlash`) & Zero-Pill UI**: Thêm nút Giảm Chớp Sáng giảm 75% xung lóe sáng độc lập với Giảm Chuyển Động; gỡ chấm `animate-pulse` cuối cùng trong `AuctionHouseModal.tsx`. | `game.ts`, `liveOpsData.ts`, `SettingsModal.tsx`, `AuctionHouseModal.tsx` | **Hoàn thành & Đã test** |
| **P1-5** | **Endgame Gold Sink (60h–100h+) — "Tinh Tuý Hoàng Đạo (Astral Paragon Infusion 500 bậc)"**: Hấp thụ triệt để tồn kho Vàng sau 160/160 Thiên Phú / Ch.12, đưa `100h Gold Sink Ratio` từ `53.5%` lên **`99.8%`** (0 cảnh báo) với 0% ảnh hưởng Ch.1–11. | `talentsData.ts`, `gearData.ts`, `TalentsModal.tsx`, `App.tsx`, `economyTelemetry.ts` | **Hoàn thành & Đã test** |

---

### P2 — Chuẩn Hóa Kho Tài Sản 3D, Bảo Trì Kiến Trúc & Mở Rộng Nội Dung

| Mã | Hạng mục | Mục tiêu đo lường | Effort dự kiến |
|---|---|---|---|
| **P2-1** | **Đạt 100% Cặp High/Lite Trong `glb-manifest.json`**: Chuẩn hóa `aries-arena-lite.glb` trong `Chương 2/Runtime/` và nén lại tệp legacy `hatsune-miku-lite.glb` (3.47 MB → ≤ 2.2 MB). | `pairCoveragePct >= 98%`, `0` warning vượt 2.5 MB | 1 ngày |
| **P2-2** | **Tách Bộ Test GLB Local vs CDN Manifest**: Cho phép `src/engine/*.test.ts` chạy 100% xanh trên CI không cần commit nhị phân `.glb` lên git. | 0 `ENOENT` trên CI không có binary cục bộ | 0.5 ngày |
| **P2-3** | **Tách Module Hóa `GameEngine.ts` & `App.tsx`**: Tách `ArenaSceneBuilder`, `CombatSkillExecutor`, `VfxPoolManager` khỏi `GameEngine.ts` (~24.8k dòng) để tối ưu code-splitting và thời gian parse JS trên CPU yếu. | Giảm >35% kích thước tệp lõi, 0 regression | 4–5 ngày |
| **P2-4** | **Hẹn Giờ Sự Kiện LiveOps & Checksum Save Export**: Thêm `scheduledStartMs`/`scheduledEndMs` cho sự kiện tự động và mã kiểm tra toàn vẹn gói Export Save. | Tự động hóa bật/tắt sự kiện cuối tuần | 2 ngày |
| **P2-5** | **Tích Hợp Tài Sản 3D High/Lite Cho Chương 5–8 (Cự Giải → Bọ Cạp)**: Kèm Boss Phase III đầy đủ cho Chương 5–8, tuân thủ tuyệt đối ngân sách E5430 Lite ≤ 2.5 MB/entity. | 100% cặp High/Lite, FPS ổn định ≥ 30 trên E5430 | Theo lịch mỹ thuật |

---

### P3 — Hoàn Thiện Dài Hạn, Playtest Người Chơi Thật & Scale Hạ Tầng

| Mã | Hạng mục | Mục tiêu đo lường | Effort dự kiến |
|---|---|---|---|
| **P3-1** | **Kiểm Thử Thực Địa Trên Máy Vật Lý Dell Latitude E5430 & Playtest Người Thật**: Đo FPS 1% low, nhiệt độ GPU, RAM trình duyệt trong phiên chơi liên tục 60 phút và thu thập phản hồi FTUE thực tế. | 0 crash / 0 treo máy trong 60 phút chơi liên tục | 3 ngày QA thực địa |
| **P3-2** | **Tích Hợp Tài Sản 3D Chương 9–12 (Nhân Mã → Song Ngư)**: Hoàn tất trọn bộ 12 Cung Hoàng Đạo 3D chuẩn High/Lite. | Đủ 12 bản đồ & Boss 3D riêng biệt | Theo lịch mỹ thuật |
| **P3-3** | **Hỗ Trợ Tay Cầm Gamepad API & ARIA Live Regions**: Mở rộng khả năng tiếp cận cho người chơi dùng tay cầm và công cụ đọc màn hình. | Đạt chuẩn điều khiển đa thiết bị | 2–3 ngày |
| **P3-4** | **Chuyển Rate Limiter & Anomaly Store Sang Redis (Khi Scale Multi-Instance)**: Sẵn sàng mở rộng hàng nghìn CCU đồng thời. | Đồng bộ giới hạn tốc độ xuyên cụm server | 2 ngày |

# QA TEST REPORT — BÁO CÁO KIỂM THỬ & NGHIỆM THU CHẤT LƯỢNG

- **Ngày thực hiện**: 2026-11-24
- **Môi trường kiểm thử**: Node.js v22.23.5, `tsx`, `node:test`, TypeScript (`tsc --noEmit`), Vite 6 production build, ESLint (Firestore Rules).

---

## 1. Bảng Kết Quả Kiểm Thử Tự Động (Thực Tế 100%)

| Bộ Kiểm Thử | Lệnh Chạy Thực Tế | Tổng Số Test | Pass | Fail | Skip | Ghi Chú |
|---|---|---:|---:|---:|---:|---|
| **Integration Tests (`tests/*.test.mjs`)** | `node --max-old-space-size=512 --import tsx --test --test-concurrency=1 tests/*.test.mjs` | **106** | **106** | 0 | 0 | WeeklyBoss, LiveAI, Boss Patterns, Save Migration, Asset Contracts |
| **Data, Audio, Services, Server & Pure Engine Unit Tests** | `node --import tsx --test src/data/*.test.ts src/audio/*.test.ts src/services/*.test.ts src/server/*.test.ts src/engine/{zodiacLightingVfxDirector,glbPipelineValidator,gpuThermalWatchdog,colorblindTelegraphs,fixedTimestep,combatFeelDirector,cameraCombatRig,heroKinematicMotion,vfxBudgetGovernor}.test.ts` | **102** | **102** | 0 | 0 | Bao gồm 4 bộ test mới/nâng cấp (`economyTelemetry`, `saveIntegrity`, `serverSecurity`, `resolveDynamicPointLightPolicy`) |
| **Firestore Security Rules Lint** | `npx eslint firestore.rules` | **7 blueprints** | **Pass** | 0 | 0 | 0 lỗi, 0 cảnh báo |
| **8-Milestone Playtime Simulation** | `node --import tsx tools/simulate-playtime-milestones.ts` | **8 mốc** | **Pass** | 0 | 0 | Chạy tất định (`seed=20260410`), phát hiện trung thực cảnh báo dư Vàng mốc 100h |
| **GLB Pipeline Manifest Validator** | `validateGlbPipelineManifest(scripts/glb-manifest.json)` | **173 tệp** | **e5430Safe** | 0 critical | — | 9 cảnh báo nhẹ (legacy Lite & `aries-arena-high.glb`), 0 lỗi nghiêm trọng |
| **TypeScript Typecheck & Vite Build** | `compile_applet` + `lint_applet` (`npm run lint` & `npm run build`) | **Full Build** | **Pass** | 0 | 0 | Xác minh ở bước kết thúc trước nghiệm thu |

**Tổng cộng bộ kiểm thử logic & tích hợp**: **`208 / 208 PASS (100% pass, 0 fail, 0 skip)`**.

---

## 2. Ghi Nhận Trung Thực Về Nhóm Test Đọc `.glb` Cục Bộ (`ENOENT`)

- Khi chạy wildcard toàn bộ `src/engine/*.test.ts`, có **27 subtest** thuộc các tệp kiểm tra binary trực tiếp trên ổ đĩa cục bộ (`public/assets/.../*.glb`) báo lỗi **`ENOENT`**.
- **Nguyên nhân thực tế**: Toàn bộ tệp nhị phân `.glb` dung lượng lớn đã được đưa lên **Backblaze B2 / Cloudflare Worker CDN** (quản lý trong `scripts/glb-manifest.json`) thay vì commit vào kho mã cục bộ.
- **Quyết định QA**: Không làm giả file đĩa và không xóa kiểm thử; ghi nhận rõ nguyên nhân tại đây và đưa hạng mục tách tag kiểm thử `manifest-only` vs `local-glb-assets` vào lộ trình P2-2.

---

## 3. Các Lỗi Đã Được Phát Hiện & Khắc Phục Trong Đợt Kiểm Thử Này

1. **Di cư dữ liệu lưu (Save Migration)**:
   - Sửa lỗi `migrateSaveData` không giữ `selectedHeroId` khi người chơi mở khóa Bellona/Sylvia/Celeste qua `highestChapterCleared`.
   - Sửa lỗi thú cưỡi cũ không phải `black_dragon` (như `azure_dragon`, `aries_steed`) bị chuyển về `null` thay vì `solarius`.
2. **Kỹ năng chủ động Sylvia**:
   - Phát hiện Sylvia dùng trùng `effectKind: 'ember_nova'` với Aurelia; đã triển khai riêng `'jade_bastion'` trong `game.ts`, `phase5Data.ts` và `GameEngine.ts`.
3. **Đồng bộ kiểm thử Chương 3–4**:
   - Đồng bộ `assetRegistry.test.ts` (4 tướng Hoàng Đạo, 7 skin, thư mục Ch.3–4), `earlyProgression.test.ts` (Boss Codex Phase III, biên độ Sylvia `bonusHp: 230` & Celeste `bonusAtk: 58`), và `fairProgression30Day.ts` (tích hợp Bộ Sưu Tập Ch.2–4 & hệ thống Wave 12–14).
4. **An toàn Shader Dell Latitude E5430**:
   - Phát hiện 3 `THREE.PointLight` vẫn được gắn vào `THREE.Scene` ở chế độ Lite; đã triển khai `syncPointLightPolicy()` tách hoàn toàn về **0 PointLights** và bổ sung unit test xác minh.
5. **Gia cố `saveIntegrity.ts` & Giám sát An ninh**:
   - Sửa fallback legacy `'artemis'` → `'aurelia'`, bổ sung kẹp trần toàn diện và viết mới `saveIntegrity.test.ts` & `serverSecurity.test.ts`.

---

## 4. Hạng Mục Chờ Kiểm Thử Thực Địa (Ngoài Phạm Vi Tự Động)

- Đo FPS 1% low, VRAM và nhiệt độ thực tế trong phiên chơi 60 phút trên laptop vật lý **Dell Latitude E5430** (P3-1).
- Playtest người chơi thật đánh giá cảm nhận độ khó Boss Chương 1–4 và độ "đã tay" của kỹ năng `jade_bastion` (P3-1).

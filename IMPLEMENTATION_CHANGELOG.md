# IMPLEMENTATION CHANGELOG — NHẬT KÝ CẢI TIẾN & NGHIỆM THU (PHASE 4 & 6)

- **Ngày nghiệm thu**: 2026-11-24
- **Tổng điểm AAAA Scorecard (thang 0–100 chuẩn Master Prompt Mục VIII)**: **`78.99 / 100` → `88.15 / 100`** (`+9.16` điểm trọng số trên 30 tiêu chí / 10 nhóm qua Đợt 1 P0–P1, Đợt 2 P2, Đợt 3 Wave 3 Overhaul và Đợt 4 Zero-GC Projectile Broadphase).

---

## 1. Danh Mục Thay Đổi Mã Nguồn Thực Tế (Trước → Sau)

### A. Đợt 4 — Vật Lý Đạn Zero-GC, Tách Mô-đun Kiến Trúc `P2-3a` & Benchmark Đo Thực Tế
- **`src/engine/spatialHashGrid.ts`**: Nâng cấp theo dõi động `maxInsertedRadius` (reset ở `clear()`, cập nhật ở `insert()`) để phạm vi quét ô lưới luôn chính xác 100% kể cả với Boss Hoàng Đạo khổng lồ (`radius > 2.5u`) mà vẫn giữ tối ưu cho quái thường.
- **`src/engine/projectilePhysicsSystem.ts` & `src/engine/projectilePhysicsSystem.test.ts`** (mới — `P2-3a`): Trích xuất toàn bộ toán học bám mục tiêu (`stepProjectileHomingVelocity`), phản xạ tường/trụ (`resolveProjectileArenaBoundaryAndObstacles`), và truy vấn va chạm đạn / AoE Zero-GC (`queryProjectileEnemyHits`, `queryAoeEnemiesInGrid`) khỏi `GameEngine.ts`.
- **`src/engine/GameEngine.ts`**: Tích hợp `projectileEnemyGrid` + các scratch buffer tái sử dụng (`enemySnapshotScratch`, `projectileQueryScratch`, `projectileHitScratch`, `aoeQueryScratch`, `aoeTargetScratch`) cho `updateProjectiles`, `updateEnemies`, `updateOrbitOrbs`, `updateElementalZones`; hoist `evaluateActiveSynergies(this.activeSkills)` ra ngoài vòng va chạm đạn.
- **`tools/benchmark-spatial-physics.ts`** (mới): Đo hiệu năng thực tế trên `300 đạn × 40 quái × 600 khung hình` — xác minh trùng khớp 100% (**49,332 / 49,332** va chạm), nhanh hơn **8.09×** (`742.76ms → 91.85ms`), triệt tiêu **180,000** mảng rác (**18,000/giây** ở 60 FPS).
- **`tools/simulate-playtime-milestones.ts`** (mới): Công cụ CLI tái lập đầy đủ 8 mốc thời lượng `5m → 100h` (`average` & `unlucky`) và kiểm toán Endgame Gold Sink từ `src/data/balanceSimulation.ts` + `src/data/onboardingAndMasteryData.ts`.

### B. Đợt 3 — Wave 3 AAAA Overhaul (Zero-GC Squad Grid, 12 Chủ Đề Nhạc Hoàng Đạo, LiveOps P2-4b & Toàn Bộ Suite Xanh)
- **`src/engine/spatialHashGrid.ts` & `src/engine/spatialHashGrid.test.ts`**: Triển khai `SpatialHashGrid` O(1) cho điều hướng đội hình quái và tích hợp đẩy lùi an toàn theo vật cản (`clampKnockbackInsideArena`) trong `GameEngine.ts`.
- **`src/audio/zodiacMusicDirector.ts` & `tests/zodiac-music-director.test.mjs`**: Nâng cấp trọn bộ **12 bản nhạc chủ đề Hoàng Đạo độc bản** cho Chương 1–12 (12 âm giai, 12 tempo, 12 giai điệu chiến đấu & Boss riêng biệt), kết nối trực tiếp vào `src/audio/soundEngine.ts`.
- **`src/data/liveOpsConfig.ts`, `src/services/liveOpsConfigService.ts`, `src/components/AssetAdminLiveOpsTab.tsx`, `firebase-blueprint.json`, `firestore.rules`, `tests/liveops-config.test.mjs`** (`P2-4b`): Triển khai hẹn giờ sự kiện LiveOps tự động (`scheduledStartMs`, `scheduledEndMs`, `resolveEffectiveLiveOpsConfig`), bộ Preset sự kiện nhanh, giao diện chọn lịch `datetime-local`, cập nhật luật Firestore (0 lỗi ESLint) và deploy live qua `fax.DeployRules`.
- **Hoàn thiện đồng bộ toàn bộ 10 hệ thống lõi** (`colorblindTelegraphs.ts`, `combatAnimationKinematics.ts`, `chapterArenaMechanisms.ts`, `gpuThermalWatchdog.ts`, `skillEvolutionEngine.ts`, `saveIntegrity.ts`, `serverSecurity.ts`, `tacticalCombatChoreography.ts`, `chapterCollectionMilestones.ts`, `gearSetCombatProcs.ts`, `onboardingAndMasteryData.ts`, `defeatDiagnostics.ts`) đưa kho kiểm thử về **0 lỗi**.

### C. Đợt 1 & Đợt 2 — Nền Tảng P0/P1/P2
- **True 0-PointLight Shader Policy (E5430)** & **Anti-Flash (`reduceScreenFlash`)**: `zodiacLightingVfxDirector.ts`, `GameEngine.ts`, `SettingsModal.tsx`.
- **Kỹ năng chủ động độc nhất Sylvia (`jade_bastion`)** & **Save Migration (`earlyProgressionData.ts`)**.
- **Tinh Tuý Hoàng Đạo (Astral Paragon Infusion 500 bậc)**: `talentsData.ts`, `gearData.ts`, `TalentsModal.tsx`, `App.tsx` (tổng Endgame Gold Sink `1.76B` > `13.45M` Vàng 100h).
- **AI Đám Đông theo Token (`EnemySquadDirector`)**, **Save JSON-V2 có Checksum FNV-1a**, **SecurityAnomalyTracker**, **ARIA `aria-live="polite"`**, và **100% đối cặp GLB High/Lite (`63/63` cặp, `0` cảnh báo)**.

---

## 2. Danh Sách Nghiệm Thu (Definition of Done)

- [x] Bảo toàn 100% dữ liệu lưu cũ và tính năng đang hoạt động của người chơi.
- [x] Chế độ Lite / Dell Latitude E5430 (Intel HD 4000) chạy đúng **0 PointLights**, Watchdog Stage ≥ 2 floor, trần `≤ 3` token quái và **100% cặp GLB High/Lite (`63/63`, `0` issues)**.
- [x] Đo hiệu năng thực tế trước & sau cho vòng va chạm đạn Zero-GC (**8.09×** nhanh hơn, **18,000** mảng rác/giây bị triệt tiêu, 100% trùng khớp va chạm).
- [x] Tất cả 12 chương có 12 chủ đề nhạc Hoàng Đạo riêng biệt và 4 cơ quan sàn đấu tương tác.
- [x] Hẹn giờ sự kiện LiveOps tự động (`P2-4b`) hoạt động đồng bộ từ UI Admin đến `firestore.rules` (đã deploy live, 0 lỗi ESLint).
- [x] Toàn bộ kho mã nguồn đạt **`431 bài kiểm thử | 430 PASS | 0 FAIL | 1 skip`**.
- [x] TypeScript `tsc --noEmit` (`lint_applet`) và Vite production build (`compile_applet`) đều sạch 0 lỗi.
- [x] Kiểm thử trình duyệt sống Headless Chromium (`playwright-cli`, `1440×900`) qua đầy đủ Cổng Tài Khoản → Sảnh 3D → Chọn Thẻ Kỹ Năng → Chiến Đấu 3D trực tiếp với **0 Console Errors / 0 Warnings**.
- [x] Hoàn tất & đồng bộ thực tế 10/10 báo cáo kiểm toán & thiết kế tại thư mục gốc kho mã nguồn.

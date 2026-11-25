# QA TEST REPORT — BÁO CÁO KIỂM THỬ & NGHIỆM THU CHẤT LƯỢNG

- **Ngày thực hiện**: 2026-11-24
- **Môi trường kiểm thử**: Node.js v22.23.5, `tsx`, `node:test`, TypeScript (`tsc --noEmit`), Vite 6 production build, ESLint (Firestore Rules), Headless Chromium (`playwright-cli`).

---

## 1. Bảng Kết Quả Kiểm Thử Tự Động & Trình Duyệt Sống (Thực Tế 100%)

| Bộ Kiểm Thử | Lệnh / Phạm Vi Chạy Thực Tế | Tổng Số Kiểm Định | Pass | Fail | Skip | Ghi Chú |
|---|---|---:|---:|---:|---:|---|
| **Full Repository Test Suite (Audio, Data, Engine, Services, Integration)** | `npx --yes tsx --test src/audio/*.test.ts src/data/*.test.ts src/engine/*.test.ts src/services/*.test.ts tests/*.test.mjs` | **446** | **445** | **0** | **1** | Bao gồm Wave 6 (`wave6AnimationAndBoss.test.ts` 5) + Wave 5 (`sfxSpatialAndTimbre.test.ts` 4, `zodiacWorldLore.test.ts` 2, `vfxPoolManager.test.ts` 4) + Wave 1–4 (`spatialHashGrid.test.ts`, `projectilePhysicsSystem.test.ts`, `zodiac-music-director.test.mjs`, `liveops-config.test.mjs`, `security-hardening.test.mjs`, `enemy-squad-director.test.mjs`, `gpu-thermal-watchdog.test.mjs`) |
| **Firestore Security Rules Lint & Live Deploy** | `npx eslint firestore.rules` + `fax.DeployRules` | **7 blueprints** | **Pass** | 0 | 0 | 0 lỗi, 0 cảnh báo; bao gồm luật kiểm biên lịch P2-4b `scheduledStartMs`/`scheduledEndMs` đã deploy live |
| **Spatial Physics CPU & GC Benchmark** | `node --import tsx tools/benchmark-spatial-physics.ts` | **300 đạn × 40 quái × 600 frame** | **Pass (100% Parity)** | 0 | 0 | **49,332 / 49,332** va chạm trùng khớp tuyệt đối; nhanh hơn **8.09×** (`742.76ms → 91.85ms`), triệt tiêu **180,000** mảng rác (**18,000/giây** ở 60 FPS) |
| **8-Milestone Playtime & 100h Economy Simulation** | `node --import tsx tools/simulate-playtime-milestones.ts` | **8 mốc (`5m → 100h`)** | **Pass** | 0 | 0 | Tất định (`seed=aaaa-100h-v1`), cả `average` và `unlucky` đạt Ch.12 / Tháp F88; tổng Endgame Gold Sink `1.76B` > `13.45M` thu nhập 100h |
| **GLB Pipeline Manifest Validator** | `validateGlbPipelineManifest(scripts/glb-manifest.json)` | **173 tệp (126 active)** | **`healthy` / `e5430Safe`** | 0 | 0 | **`100%` đối cặp High/Lite (`63/63`)**, **`0` lỗi, `0` cảnh báo** |
| **Live Browser QA (Headless Chromium `playwright-cli`, `1440×900`)** | Kiểm chứng trực tiếp `http://localhost:3000`: Cổng Tài Khoản → Sảnh 3D → Chiến Đấu 3D Chương 1 (di chuyển `KeyD`, Lướt `Space` với `applyDodgeBank`, Phá Giáp `KeyF` & Kỹ Năng `KeyE` với `applySkillCastPulse`, hạ quái sinh & thu nhặt vật phẩm qua `LootOrbVisualCache` chia sẻ GPU) | **Toàn luồng thực tế** | **Pass** | 0 | 0 | **0 Console Errors, 0 Warnings**, tự kích hoạt chế độ bảo vệ phần cứng Software WebGL, hiển thị HUD/vật lý/hiệu ứng/loot orb rõ nét không chồng lấn |
| **TypeScript Typecheck & Vite Build** | `compile_applet` + `lint_applet` (`tsc --noEmit` & `npm run build`) | **Full Build** | **Pass** | 0 | 0 | 0 lỗi biên dịch, 0 lỗi kiểu dữ liệu |

**Tổng cộng bộ kiểm thử tự động toàn kho mã nguồn**: **`446 bài kiểm thử | 445 PASS | 0 FAIL | 1 skip`**.

---

## 2. Các Hạng Mục Đã Khắc Phục & Nâng Cấp Qua Đợt 1 → Đợt 6

- **Máy Trạng Thái 12 Hoạt Ảnh, Sửa Lỗi Boss Pha III Chương 1–4 & Cache Tài Nguyên GPU Loot Orb (Đợt 6)**:
  - `src/engine/combatAnimationKinematics.ts` & `src/engine/GameEngine.ts`: triển khai máy trạng thái 12 trạng thái `CombatAnimState` (`resolveCombatAnimState`) và nối `applyDodgeBank` (Lướt), `applySkillCastPulse` (Phá Giáp Trảm `F` / Kỹ Năng `E`), `applySpawnSettle` (Vào trận), và pha gục ngã `isDead` vào vòng cập nhật nhân vật (Zero-GC, tôn trọng `reducedMotion`).
  - `src/engine/tacticalCombatChoreography.ts` & `src/engine/GameEngine.ts`: sửa lỗi gameplay thực tế tại `GameEngine.ts:20965` vốn chặn Boss Hoàng Đạo Ch.1–4 vào Pha III ở `<= 30% HP` bằng `canBossEnterPhaseThree`, đồng thời nối 12 bộ danh hiệu Pha II/III & mẹo khắc chế riêng biệt (`ZODIAC_BOSS_PHASE_SIGNATURES`) vào cảnh báo Boss thực chiến.
  - `src/engine/vfxPoolManager.ts` & `src/engine/GameEngine.ts`: triển khai `LootOrbVisualCache` dùng chung đúng 2 `OctahedronGeometry` và 4 `MeshStandardMaterial` cho toàn bộ vật phẩm rơi (`xp`/`gold`/`gem`/`heal`), triệt tiêu 100% cấp phát geometry/material GPU khi hạ quái (`wave6AnimationAndBoss.test.ts`: 5/5 pass).

0. **Âm Thanh Không Gian 3D, Biên Niên Sử 12 Chương & VFX Pool Manager Zero-GC `P2-3b` (Đợt 5)**:
   - `src/audio/sfxPriorityMixer.ts` & `src/audio/soundEngine.ts`: suy giảm âm theo khoảng cách 3D (`computeSpatialDistanceGain`, cắt ngoài tầm `26u`), 4 âm sắc cung riêng cho 4 tướng Hoàng Đạo, tiếng dội khiên kim loại cho `CHẮN KHIÊN!`/`VỎ GIÁP!`, và âm `attack_dodged` (`sfxSpatialAndTimbre.test.ts`: 4/4 pass).
   - `src/engine/vfxPoolManager.ts` (`P2-3b`): tách 8 vòng cập nhật VFX pool Zero-GC + `VfxFrameBudgetCache` (cache ngân sách VFX theo từng frame, loại bỏ `arrowPool.reduce` lặp lại), đồng thời sửa lỗi trôi sương mù cạnh `-Z` (`vfxPoolManager.test.ts`: 4/4 pass).
   - `src/data/chaptersData.ts`, `src/data/zodiacWorldLore.ts`, `src/components/CodexGuideModal.tsx`: tất định hóa Phòng 8 (`devil`), xoay vòng bố cục vật cản cho Ch.2–12 (giữ nguyên FTUE Ch.1), và bổ sung Biên Niên Sử 12 Chương + Mẹo Địa Hình trong Boss Codex (`zodiacWorldLore.test.ts`: 2/2 pass).

1. **Vật Lý Đạn & Đội Hình Zero-GC (Đợt 3 & Đợt 4)**:
   - Triển khai `SpatialHashGrid<T>` (`src/engine/spatialHashGrid.ts`) theo dõi động `maxInsertedRadius` để không bỏ sót Boss khổng lồ (`radius > 2.5u`).
   - Trích xuất mô-đun thuần `src/engine/projectilePhysicsSystem.ts` (`P2-3a`) và nối vào `GameEngine.ts` cho `updateProjectiles`, `updateEnemies`, `updateOrbitOrbs`, `updateElementalZones` — đo thực tế nhanh hơn **8.09×** và triệt tiêu **18,000** cấp phát mảng/giây.
2. **12 Bản Nhạc Chủ Đề Hoàng Đạo Độc Bản (Đợt 3)**:
   - `src/audio/zodiacMusicDirector.ts` cung cấp 12 âm giai, tempo, sắc thái sóng, giai điệu chiến đấu & Boss riêng biệt cho Chương 1–12, tích hợp trực tiếp vào `src/audio/soundEngine.ts`.
3. **Hẹn Giờ Sự Kiện LiveOps Tự Động P2-4b (Đợt 3)**:
   - `src/data/liveOpsConfig.ts` (`resolveEffectiveLiveOpsConfig`, `LIVEOPS_PRESETS`, `parseLiveOpsConfigJson`), `AssetAdminLiveOpsTab.tsx` (Presets + khung chọn lịch `datetime-local`), cập nhật & deploy `firestore.rules` thành công.
4. **An Toàn Phần Cứng Dell Latitude E5430 & 100% Cặp GLB (Đợt 1–3)**:
   - `syncPointLightPolicy()` tháo hẳn về **0 PointLights** ở Lite / Watchdog ≥ 2; `gpuThermalWatchdog.ts` khởi động ở Stage 2 floor trên Intel HD 4000 và hỗ trợ Stage 4 Emergency Lite (`dprCap: 0.7`); kho GLB đạt **100% đối cặp High/Lite (`63/63`) với 0 cảnh báo**.
5. **Kinh Tế 100h, Bảo Mật, AI Đám Đông & Tiếp Cận (Đợt 1–3)**:
   - Tinh Tuý Hoàng Đạo 500 bậc hấp thụ Vàng Endgame; `EnemySquadDirector` (2–5 token tấn công, `≤ 3` ở Lite); `saveIntegrity.ts` + chuẩn xuất/nhập `JSON-V2` có FNV-1a checksum; `SecurityAnomalyTracker` + kẹp/từ chối payload WS; `reduceScreenFlash` Anti-Flash & vùng `aria-live="polite"`.

---

## 3. Hạng Mục Chờ Kiểm Thử Thực Địa (Ngoài Phạm Vi Tự Động & Headless Chromium)

- Đo FPS 1% low, VRAM và nhiệt độ thực tế trong phiên chơi 60 phút trên laptop vật lý **Dell Latitude E5430** (P3-1; headless Chromium dùng Software WebGL chỉ xác minh được luồng tự bật Lite Mode và 0 lỗi runtime).
- Playtest người chơi thật đánh giá cảm nhận độ khó Boss Chương 1–4, cơ quan sàn đấu, và thu thập dữ liệu D1/D7/D30 thực tế sau khi mở Beta (P3-1).

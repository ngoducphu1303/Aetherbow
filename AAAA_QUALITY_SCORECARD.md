# AAAA QUALITY SCORECARD — BẢNG CHẤM ĐIỂM 30 TIÊU CHÍ (THANG ĐIỂM 0–100)

> **Lưu ý minh bạch**: Đây là thang điểm đánh giá nội bộ theo `AAAA_GAME_DEVELOPMENT_MASTER_PROMPT.md` (Phase 2 & Mục VIII), **không phải chứng nhận AAA/AAAA chính thức**. Mọi điểm số đều gắn bằng chứng kiểm tra trực tiếp từ mã nguồn, kết quả kiểm thử tự động, mô phỏng tất định (`seed=20260410`) và kiểm tra trình duyệt thực tế. Những hạng mục cần đo thực địa (như D1/D7/D30 live retention hoặc đo nhiệt laptop vật lý Dell Latitude E5430) được ghi rõ **chưa xác minh thực địa** thay vì suy đoán.

## 1. Thang Điểm Nội Bộ (Master Prompt Phase 2)

| Điểm | Mức độ |
|---|---|
| `0–39` | Chưa đạt, cần cải thiện nghiêm trọng |
| `40–59` | Có nền tảng nhưng chưa hoàn thiện |
| `60–74` | Chất lượng khá |
| `75–89` | Chất lượng cao |
| `90–95` | Đạt mục tiêu chất lượng đề xuất |
| `96–100` | Mức độ hoàn thiện xuất sắc theo phạm vi đánh giá |

---

## 2. Tổng Hợp Trọng Số 10 Nhóm Tiêu Chí (Master Prompt Mục VIII)

| Nhóm tiêu chí | Tiêu chí thành phần | Trọng số | TB Trước (/100) | TB Sau (/100) | Đóng góp Trước | Đóng góp Sau | Thay đổi |
|---|---|---:|---:|---:|---:|---:|---:|
| **Progression, Economy & Loot** | 16, 17, 18 | 20% | 79.00 | 94.67 | 15.80 | 18.93 | **+3.13** |
| **Gameplay, Combat & Skill** | 01, 02, 03, 04 | 20% | 81.25 | 94.75 | 16.25 | 18.95 | **+2.70** |
| **Animation, VFX, SFX & Music** | 05, 06, 07, 08 | 15% | 78.75 | 94.50 | 11.81 | 14.18 | **+2.37** |
| **Enemy AI, Boss & Difficulty** | 12, 13, 19 | 10% | 80.67 | 94.33 | 8.07 | 9.43 | **+1.36** |
| **Performance & Architecture** | 22, 23 | 10% | 74.00 | 95.50 | 7.40 | 9.55 | **+2.15** |
| **Graphics, Art & World Design** | 09, 10, 15 | 5% | 80.67 | 94.00 | 4.03 | 4.70 | **+0.67** |
| **Game Feel, UI/UX & Accessibility** | 20, 21, 27 | 5% | 78.67 | 94.33 | 3.93 | 4.72 | **+0.79** |
| **Replayability & Retention** | 25, 26 | 5% | 79.00 | 92.50 | 3.95 | 4.63 | **+0.68** |
| **Physics, Level & Asset Pipeline** | 11, 14, 24 | 5% | 80.33 | 94.67 | 4.02 | 4.73 | **+0.71** |
| **Security, QA & Live Operations** | 28, 29, 30 | 5% | 74.67 | 95.00 | 3.73 | 4.75 | **+1.02** |
| **TỔNG ĐIỂM TRỌNG SỐ** | **30 / 30 tiêu chí** | **100%** | — | — | **78.99 / 100** | **94.57 / 100** | **+15.58** |

---

## 3. Đánh Giá Chi Tiết 30 Tiêu Chí (Đủ 10 Trường Bắt Buộc / Tiêu Chí)

### 01. Game Design — Thiết kế trò chơi
1. **Điểm hiện tại (Trước)**: `84 / 100`
2. **Bằng chứng đánh giá**: 4 tướng Hoàng Đạo (`heroesData.ts`), 12 chương chiến dịch (`chaptersData.ts`), hệ thống Roguelike skill draft (`skillsData.ts`), Tháp Vô Tận, Nightmare Ascension I–V (`phase5Data.ts`).
3. **Vấn đề tồn tại**: Tướng Sylvia dùng trùng hiệu ứng kỹ năng chủ động với Aurelia; thiếu mục tiêu tiêu Vàng rõ ràng ở giai đoạn sau 60h.
4. **Nguyên nhân gốc rễ**: Nội dung Ch.3–4 được mở rộng nhanh nhưng nhánh hiệu ứng riêng của Sylvia và sink Endgame chưa tách biệt hoàn toàn.
5. **Giải pháp đề xuất**: Kết hợp nền tảng Đợt 8 & Đợt 13 (5 Biến Thể Phòng, 6 cặp Phản Ứng Nguyên Tố, Tinh Luyện Cổ Ngữ/Dòng Phụ), trong **Đợt 15** mở rộng chiều sâu tương tác chiến thuật bằng bộ ba cơ chế liên kết: **Phản Tiễn Né Hoàn Hảo (`Zodiac Counter-Volley Riposte`)**, **Vật Lý Va Tường Choáng (`Wall-Slam Impact`)** và **Ngã Rẽ Chiến Thuật giữa chương (`Tactical Room Crossroads`)** cho Ch.2–12 Ải 4 & 8 (tắt tuyệt đối ở Ch.1 & chế độ đặc biệt để bảo vệ FTUE).
6. **File hoặc module liên quan**: `src/engine/wave15CombatSystems.ts`, `src/components/TacticalCrossroadsModal.tsx`, `src/data/gearSetTransmutation.ts`, `src/engine/tacticalRoomModifiers.ts`, `src/engine/GameEngine.ts`, `src/engine/wave15Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 8, Đợt 13 & Đợt 15)
8. **Rủi ro khi thay đổi**: Phải khóa hoàn toàn Ngã Rẽ Chiến Thuật ở Ch.1 để bảo toàn FTUE, giữ Fresh `702 LC` và giữ biên DPS ±12% giữa 4 tướng.
9. **Tiêu chí nghiệm thu**: 4 tướng 4 `effectKind`, Fresh `702 LC` giữ nguyên, `wave15Overhaul.test.ts` (5/5), `wave13Overhaul.test.ts` (6/6) & `earlyProgression.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `95 / 100`

### 02. Core Gameplay Loop — Vòng lặp gameplay
1. **Điểm hiện tại (Trước)**: `82 / 100`
2. **Bằng chứng đánh giá**: Vòng lặp Chiến đấu → Nhặt đồ/Vàng → So sánh chỉ số & Bộ Trang Bị → Nâng Trang bị/Thiên Phú/Cổ Ngữ → Vượt Boss Chương → Mở khóa Ch.2–12 & Tháp Vô Tận.
3. **Vấn đề tồn tại**: Sau mốc ~45h–60h khi 8 Thiên Phú chạm 160/160 và đồ Thần Thoại đạt Lv.80, vòng lặp tiêu Vàng từng bị đứt gãy; ở màn so sánh đồ mới nhặt, người chơi chưa thấy rõ biến động chỉ số thành phần và kích hoạt/mất hiệu ứng Bộ Trang Bị.
4. **Nguyên nhân gốc rễ**: Toàn bộ Gold sink trước đây có trần cứng và khung so sánh đồ mới chỉ hiện chênh lệch LC tổng.
5. **Giải pháp đề xuất**: Tích hợp vòng lặp Endgame **Tinh Tuý Hoàng Đạo (500 bậc)** (`TalentsModal.tsx`), so sánh chỉ số chi tiết & Bộ Trang Bị (Đợt 8), chẩn đoán hậu thất bại (`defeatDiagnostics.ts`, Đợt 10), phân tích sát thương từng kỹ năng & tự động phân giải đồ thừa (Đợt 11), và trong **Đợt 14** khép kín toàn diện cả vòng trong trận lẫn ngoài trận bằng **Cộng Hưởng Kỹ Năng 3 Tầng (`I / II / III`)**, **Nhật Ký Hành Trình 12 Chương & Ấn Triện Chinh Phục (`zodiacJourneyLog.ts`)**, và **Bộ Xác Thực Kết Quả Trận Đấu (`runIntegrityVerifier.ts`)** kẹp biên thưởng sạch trước khi quyết toán.
6. **File hoặc module liên quan**: `src/data/skillsData.ts`, `src/data/zodiacJourneyLog.ts`, `src/data/runIntegrityVerifier.ts`, `src/data/talentsData.ts`, `src/data/gearData.ts`, `src/components/CodexGuideModal.tsx`, `src/components/PauseResultModal.tsx`, `src/App.tsx`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 8, 10, 11 & Đợt 14)
8. **Rủi ro khi thay đổi**: Không làm biến động mốc tài khoản mới `702 LC` và không chặn nhầm thưởng hợp lệ từ LiveOps/Nightmare/VIP.
9. **Tiêu chí nghiệm thu**: Mô phỏng 100h giữ nguyên Fresh `702 LC` và tiêu thụ `99.8%` Vàng dư Endgame; `wave14Overhaul.test.ts` (7/7) & `wave11Overhaul.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `94 / 100`

### 03. Combat System — Hệ thống chiến đấu
1. **Điểm hiện tại (Trước)**: `83 / 100`
2. **Bằng chứng đánh giá**: Auto-aim bắn khi đứng yên, né đòn cơ động, Crit/Knockback/Chill/Shield, `combatFeelDirector.ts`, `computePowerPressure` chống vượt cấp phi lý.
3. **Vấn đề tồn tại**: Trước Đợt 7, bộ đệm phím (`CombatInputBuffer`) mới chỉ hỗ trợ 3 thao tác (`dash`/`activeSkill`/`ultimate`), bỏ sót `Phá Giáp Trảm (F)` & `Thức Tỉnh Vũ Khí (X)` và chưa tự xả sạch khi mất tiêu điểm/đổi phòng; Sylvia từng thiếu kỹ năng phòng thủ riêng.
4. **Nguyên nhân gốc rễ**: `aaaFivePillarsDirector.ts` chưa mở rộng `BufferedCombatAction` cho đủ 5 thao tác cốt lõi và `GameEngine.ts` chưa dọn đệm phím ở `onWindowBlur`/`clearCombatEntities`.
5. **Giải pháp đề xuất**: Kế thừa `'jade_bastion'`, Đệm Phím 5 Hành Động (`140ms`), Ma Trận 6 Phản Ứng + Chuỗi Cộng Hưởng Zero-GC (Đợt 13), trong **Đợt 15** bổ sung **Phản Tiễn Né Hoàn Hảo (`computeRiposteArrowEnhancement`)** biến phát bắn tiếp theo sau Né Hoàn Hảo thành mũi tên xuyên `+1` mục tiêu, `+45%` sát thương bào Khiên Phá Giáp Boss, `+35%` lực đẩy lùi và hưởng cộng thêm theo bậc Cộng Hưởng kỹ năng + hit-stop `0.032s` (tắt khi bật `reducedMotion`), kết hợp trực tiếp với **Vật Lý Va Tường Choáng (`evaluateWallSlamImpact`: choáng `0.75s` & `+18%` sát thương cộng thêm)**.
6. **File hoặc module liên quan**: `src/engine/wave15CombatSystems.ts`, `src/engine/aaaWave4Director.ts`, `src/engine/tacticalRoomModifiers.ts`, `src/engine/GameEngine.ts`, `src/components/GameHUD.tsx`, `src/engine/wave15Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 7, Đợt 13 & Đợt 15)
8. **Rủi ro khi thay đổi**: Bảo đảm Zero-GC trên vòng chiến đấu 60Hz, khóa cooldown Va Tường `1.6s`/mục tiêu chống khóa choáng vĩnh viễn và Boss chỉ tăng stagger thay vì bị choáng thường.
9. **Tiêu chí nghiệm thu**: `wave15Overhaul.test.ts` (W15-1/W15-2), `wave13Overhaul.test.ts` & toàn kho kiểm thử pass 100%, hiển thị rõ `⚡ PHẢN TIỄN` & `◆ VA TƯỜNG` trên `GameHUD.tsx` (Zero-Pill, `0 backdrop-blur`).
10. **Điểm sau khi triển khai và kiểm thử**: `95 / 100`

### 04. Skill System — Hệ thống kỹ năng
1. **Điểm hiện tại (Trước)**: `76 / 100`
2. **Bằng chứng đánh giá**: 40+ kỹ năng roguelike trong trận (`skillsData.ts`), kỹ năng tiến hóa & cộng hưởng, kỹ năng chủ động 4 tướng độc nhất (`phase5Data.ts`), Phá Giáp Trảm & Thức Tỉnh Vũ Khí hỗ trợ đệm phím + gán phím tự do.
3. **Vấn đề tồn tại**: Sylvia (`Kim Ngưu`) từng dùng trùng `effectKind: 'ember_nova'` với Aurelia; Phá Giáp Trảm (`F`) & Thức Tỉnh Vũ Khí (`X`) trước Đợt 7 chưa hỗ trợ đệm phím và tùy biến phím tắt.
4. **Nguyên nhân gốc rễ**: Chưa có nhánh enum `'jade_bastion'` và hai kỹ năng chiến thuật chưa nối vào `CombatKeybinds` & `CombatInputBuffer`.
5. **Giải pháp đề xuất**: Thêm `'jade_bastion'` cho Sylvia, đệm phím `140ms` + 8 phím tùy biến, dự báo Tiến Hóa Tarot (Đợt 8), đo 11 kênh sát thương kỹ năng Zero-GC (Đợt 11), và trong **Đợt 14** triển khai **Hệ Thống Cộng Hưởng Kỹ Năng 3 Tầng (`Bậc I: 2–3 cộng dồn · 1.00×`, `Bậc II: 4–5 cộng dồn · 1.35×`, `Bậc III: 6+ cộng dồn · 1.70×`)** qua `evaluateTieredSkillSynergies` & `getSynergyTierUpgradeHint` trên trọn bộ **9 cặp Cộng Hưởng**, cache Zero-GC trong `GameEngine.ts` (loại bỏ luôn 6 lần cấp phát mảng/frame ở vòng chiến đấu 60Hz), hiển thị dự báo `Thăng Bậc I→II` / `II→III` trực tiếp trên `SkillDraftModal.tsx` và ký hiệu mù màu `◆/✦/★` + chữ số La Mã `I/II/III` trên `GameHUD.tsx`.
6. **File hoặc module liên quan**: `src/data/skillsData.ts`, `src/engine/GameEngine.ts`, `src/components/SkillDraftModal.tsx`, `src/components/GameHUD.tsx`, `src/engine/skillEvolutionEngine.ts`, `src/engine/wave14Overhaul.test.ts`, `src/types/game.ts`.
7. **Mức độ ưu tiên**: P0 / P2 (Đã hoàn thành Đợt 8, Đợt 11 & Đợt 14)
8. **Rủi ro khi thay đổi**: Bảo toàn 100% hàm `evaluateActiveSynergies` tương thích ngược, không cấp phát mảng mới trên vòng 60Hz và cân bằng hệ số `1.70×` không phá trần sát thương Boss.
9. **Tiêu chí nghiệm thu**: `wave14Overhaul.test.ts` (W14-1a/W14-1b) xác minh đầy đủ 3 bậc `1.00× / 1.35× / 1.70×`, dự báo thăng bậc I→II→III trên 9 cộng hưởng và giữ nguyên `evaluateActiveSynergies`; 4 tướng dùng 4 `effectKind` riêng biệt.
10. **Điểm sau khi triển khai và kiểm thử**: `95 / 100`

### 05. Animation — Hệ thống hoạt ảnh
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: `combatAnimationKinematics.ts` (máy trạng thái 12 trạng thái chuẩn Tiêu chí 05 + blending động học Zero-GC + **biên đạo 3 pha Quái/Boss `stepEnemyChoreography`**: chuẩn bị ra đòn coil-back/nhướn vai → lao đòn, quỳ gối rung choáng/phá giáp, và tan biến xác chết có trần `<= 5` Lite / `<= 12` High), `heroKinematicMotion.ts`, hệ thống GLB `AnimationMixer` cho Tướng/Quái/Boss Chương 1–4.
3. **Vấn đề tồn tại**: Trước Đợt 12, Quái & Boss chỉ rung đơn giản khi trúng đòn mà chưa có hoạt ảnh gồng trước đòn đánh (anticipation), cúi quỳ khi bị Phá Giáp/Choáng và hiệu ứng tan biến giới hạn trần cho máy yếu; rig GLB độc bản Ch.5–12 tiếp tục ở P2-5b/P3-2.
4. **Nguyên nhân gốc rễ**: `GameEngine.ts` chưa có bộ điều khiển động học Zero-GC riêng cho pha ra đòn, pha choáng và trần xác tan biến của Quái/Boss.
5. **Giải pháp đề xuất**: Triển khai đủ máy trạng thái **12 trạng thái `CombatAnimState`** (Đợt 6) và mở rộng Đợt 12 với **`stepEnemyChoreography`** (Zero-GC out-parameter, tôn trọng `reducedMotion = 0.25×`) + **`computeDissolveCap(liteActive)`** (`5` Lite / `12` High) nối trực tiếp vào vòng cập nhật hình ảnh Quái/Boss trong `GameEngine.ts`.
6. **File hoặc module liên quan**: `src/engine/combatAnimationKinematics.ts`, `src/engine/wave12Overhaul.test.ts`, `src/engine/wave6AnimationAndBoss.test.ts`, `src/engine/GameEngine.ts`, `scripts/glb-manifest.json`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 6 & Đợt 12; rig Ch.5–12 ở P2-5b/P3-2)
8. **Rủi ro khi thay đổi**: Phải hoàn toàn Zero-GC trên vòng 60Hz và không làm trượt vị trí va chạm logic của Quái/Boss.
9. **Tiêu chí nghiệm thu**: `wave12Overhaul.test.ts` (W12-1) & `wave6AnimationAndBoss.test.ts` xác minh đủ 12 trạng thái Tướng + 3 pha Quái/Boss (windup/stagger kneel/dissolve cap Lite `<= 5`), `reducedMotion = 0.25×`, 0 lỗi trên Chromium.
10. **Điểm sau khi triển khai và kiểm thử**: `94 / 100`

### 06. VFX — Hiệu ứng hình ảnh
1. **Điểm hiện tại (Trước)**: `76 / 100`
2. **Bằng chứng đánh giá**: `zodiacLightingVfxDirector.ts`, `heroAndBossSignatureVfx.ts` (**Pool VFX Tuyệt Kỹ Riêng 4 Tướng + Vòng Hào Quang Cổ Ngữ Boss Pha II/III — 0 PointLights**), `vfxPoolManager.ts` (`GroundTelegraphVisualPool`, `LootOrbVisualCache`, `VfxFrameBudgetCache`), vòng telegraph mù màu (`colorblindTelegraphs.ts`).
3. **Vấn đề tồn tại**: Trước Đợt 12, tuyệt kỹ chủ động của 4 tướng (`aurelia`, `bellona`, `sylvia`, `celeste`) chia sẻ vòng sóng chung chưa tạo bản sắc thị giác khác biệt rõ rệt và Boss khi bước sang Pha II/III thiếu vòng hào quang cổ ngữ xoay sát mặt đất.
4. **Nguyên nhân gốc rễ**: Chưa có pool hình học chuyên biệt Zero-GC / **0 PointLights** cho 4 tuyệt kỹ tướng và vòng hào quang Boss Pha II/III.
5. **Giải pháp đề xuất**: Triển khai **`HeroAndBossSignatureVfxPool`** (`src/engine/heroAndBossSignatureVfx.ts`, Đợt 12): 4 hiệu ứng chữ ký riêng (`ember_nova` nhật thực 3 vòng lửa, `thunder_arc`/`storm_convergence` cột sét trụ + vòng điện, `jade_bastion` vòm lục giác ngọc bích, `moon_fan_mark` chùm lưỡi nguyệt 6 mảnh) và vòng hào quang cổ ngữ Boss Pha II/III sát mặt đất; dùng chung hình học chuẩn, tự giảm phân đoạn & slot ở Lite (`3` Lite vs `6` High), **0 PointLights**, tôn trọng `reducedMotion`/`reduceScreenFlash`/`colorblindTelegraphs`, giải phóng đầy đủ GPU trong `dispose()`.
6. **File hoặc module liên quan**: `src/engine/heroAndBossSignatureVfx.ts`, `src/engine/zodiacLightingVfxDirector.ts`, `src/engine/vfxPoolManager.ts`, `src/engine/GameEngine.ts`, `src/engine/wave12Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P0 / P2 (Đã hoàn thành Đợt 7 & Đợt 12)
8. **Rủi ro khi thay đổi**: Tuyệt đối không tạo bất kỳ `PointLight` nào mới và phải thu hồi slot sạch khi đổi phòng (`releaseAll`) hoặc đóng engine (`dispose`).
9. **Tiêu chí nghiệm thu**: `wave12Overhaul.test.ts` (W12-2) xác minh `countScenePointLights === 0`, đủ 4 chữ ký tướng + Boss Pha II/III aura, Lite giảm rõ số tam giác/slot, dọn GPU sạch 100%; live Chromium đo thực tế `PointLights: 0`.
10. **Điểm sau khi triển khai và kiểm thử**: `94 / 100`

### 07. SFX — Hiệu ứng âm thanh
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: `src/audio/sfxPriorityMixer.ts` (bộ trộn ưu tiên voice, giới hạn máy yếu, chống clipping, suy giảm theo khoảng cách 3D, **5 danh mục âm ưu tiên mới Đợt 12**: `boss_telegraph_ping`, `execution_finisher_drop`, `loot_rarity_epic`, `loot_rarity_legendary`, `loot_rarity_mythic`) và `src/audio/soundEngine.ts` (Web Audio thủ tục Zero-GC).
3. **Vấn đề tồn tại**: Trước Đợt 12, tiếng báo chiêu Boss, tiếng kết liễu Boss/Tinh Anh và tiếng chuông phân bậc độ hiếm trang bị rơi (`Sử Thi` / `Huyền Thoại` / `Thần Thoại`) chưa tách kênh ưu tiên riêng trong `SfxPriorityMixer`.
4. **Nguyên nhân gốc rễ**: `SfxPriorityMixer` chưa khai báo danh mục & ưu tiên riêng cho tín hiệu Boss, âm trầm kết liễu và chuông độ hiếm rơi đồ.
5. **Giải pháp đề xuất**: Kế thừa 5 danh mục SFX ưu tiên Đợt 12, trong **Đợt 15** bổ sung **`wall_slam_impact` (ưu tiên 88)** cho tiếng va đập tường/cột đá (`playWallSlamImpact`), **`boss_weakpoint_shatter` (ưu tiên 99)** hợp âm vỡ điểm yếu/phá giáp Boss (`playBossWeakpointShatterChord`), và nâng cấp **Lọc Trầm Né Đòn (`computeTimeScaleAudioFilter`)** quét `masterFilter` xuống **`820 Hz`** khi làm chậm thời gian (**`2400 Hz`** êm dịu khi bật `reducedMotion`, trở về `18000 Hz` khi bình thường).
6. **File hoặc module liên quan**: `src/audio/sfxPriorityMixer.ts`, `src/audio/aaaAudioMix.ts`, `src/audio/soundEngine.ts`, `src/engine/wave15Overhaul.test.ts`, `src/engine/GameEngine.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 5, Đợt 12 & Đợt 15)
8. **Rủi ro khi thay đổi**: Cần kiểm soát chặt tổng voice và tắt dốc lọc quá sâu khi người dùng bật `reducedMotion`.
9. **Tiêu chí nghiệm thu**: `wave15Overhaul.test.ts` (W15-5), `aaaVisualPipeline.test.ts` & toàn bộ `src/audio/*.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `95 / 100`

### 08. Music Design — Thiết kế nhạc nền
1. **Điểm hiện tại (Trước)**: `79 / 100`
2. **Bằng chứng đánh giá**: Trọn bộ 12 chủ đề nhạc Hoàng Đạo độc bản Ch.1–12 (`zodiacMusicDirector.ts`), crossfade mượt (`bgmGain`), lớp nhạc động theo Pha Boss/HP thấp/Combo (`resolveDynamicMusicLayers`), và **12 khúc kết Chiến Thắng / Thất Bại theo điệu thức riêng từng Chương (`resolveChapterEndingCadence`, Đợt 15)**.
3. **Vấn đề tồn tại**: Trước Đợt 15, mọi chương dùng chung một khúc nhạc ngắn khi thắng/thua chưa phản ánh điệu thức Hoàng Đạo của chương vừa chiến đấu.
4. **Nguyên nhân gốc rễ**: `soundEngine.ts` dùng chuỗi tần số cố định cho `playVictory` và chưa có hàm `playDefeatCadence` rút trích từ âm giai chương hiện tại.
5. **Giải pháp đề xuất**: Triển khai 12 chủ đề nhạc Hoàng Đạo (Đợt 3), lớp nhạc động khóa trần `extraOscillatorCap <= 1` ở `lowEndMode` (Đợt 12), và trong **Đợt 15** bổ sung **`resolveChapterEndingCadence(chapterId, victory)`** sinh 12 khúc kết Chiến Thắng đi lên và 12 khúc kết Thất Bại đi xuống rút trích trực tiếp từ âm giai từng cung Hoàng Đạo, nối vào `playVictory(chapterId?)` và `playDefeatCadence(chapterId?)` trong `soundEngine.ts` & `GameEngine.ts`.
6. **File hoặc module liên quan**: `src/audio/zodiacMusicDirector.ts`, `src/audio/soundEngine.ts`, `src/engine/wave15Overhaul.test.ts`, `tests/zodiac-music-director.test.mjs`, `src/engine/GameEngine.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 3, Đợt 12 & Đợt 15)
8. **Rủi ro khi thay đổi**: Phải bảo đảm khúc kết ngắn gọn, không tràn bộ dao động trên `lowEndMode` và tương thích ngược khi gọi `playVictory()` không tham số.
9. **Tiêu chí nghiệm thu**: `wave15Overhaul.test.ts` (W15-5) & `zodiac-music-director.test.mjs` xác minh đủ 12/12 khúc kết Chiến Thắng & Thất Bại độc bản theo điệu thức chương, sạch bản quyền 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `95 / 100`

### 09. Graphic Fidelity — Chất lượng đồ họa
1. **Điểm hiện tại (Trước)**: `82 / 100`
2. **Bằng chứng đánh giá**: Three.js PBR + ACES Filmic tone mapping, bộ mô hình 3D High/Lite 100% đối cặp (`63/63` cặp, 0 cảnh báo) cho Ch.1–4, hệ thống cánh/thú cưỡi/hào quang 3D, 8 cụm kiến trúc đền thờ 3D đa tầng Ch.5–12 (`zodiacRealmArchitecture.ts`), và trong Đợt 11 bổ sung **trọn bộ Giáp Trụ, Vương Miện/Mũ Chiến & Vũ Khí 3D Thủ Tục Độc Bản cho cả 8 Boss Hoàng Đạo Chương 5–12** (`zodiacBossRegalia.ts`).
3. **Vấn đề tồn tại**: Trước Đợt 11, 8 Boss Hoàng Đạo Chương 5–12 chưa có giáp trụ, vương miện và vũ khí 3D đặc trưng riêng biệt trong khung cảnh chiến đấu; mô hình GLB điêu khắc riêng Ch.5–12 tiếp tục ở lộ trình mỹ thuật dài hạn P2-5b/P3-2.
4. **Nguyên nhân gốc rễ**: `createEnemy` ở Ch.5–12 trước đây dùng hình khối chung chưa ghép lớp giáp ngực, giáp vai, vương miện biểu tượng cung Hoàng Đạo và vũ khí đặc trưng.
5. **Giải pháp đề xuất**: Kết hợp Giáp/Vương Miện/Vũ Khí 3D Boss Ch.5–12 (`zodiacBossRegalia.ts`, Đợt 11) & 8 Phù Điêu Sàn Đấu Ch.5–12 (Đợt 13), trong **Đợt 14** bổ sung **8 Cụm Vật Thể 3D Kể Chuyện Môi Trường (Relic Shrines) cho Chương 5–12 (`buildZodiacStorytellingProps` trong `zodiacRealmArchitecture.ts`)**: đặt đối xứng hai bên sườn ngoài vùng di chuyển (`x = ±(arenaHalfW + 2.35)`), tương phản vật liệu PBR rõ nét (`stoneRoughness: 0.84` vs `metalRoughness: 0.26`, biên độ `0.58 >= 0.25`), đĩa bóng tiếp xúc đáy `depthWrite: false`, **0 PointLights mới**, tự giảm số đỉnh ở Lite Mode (an toàn Dell E5430), chuyển động Zero-GC tôn trọng `reducedMotion = 0.25×` và giải phóng GPU sạch (`disposeZodiacStorytellingProps`).
6. **File hoặc module liên quan**: `src/engine/zodiacRealmArchitecture.ts`, `src/engine/zodiacBossRegalia.ts`, `src/engine/GameEngine.ts`, `src/engine/wave14Overhaul.test.ts`, `src/engine/glbPipelineValidator.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 7, 11, 13 & Đợt 14; GLB điêu khắc Ch.5–12 ở P2-5b/P3-2)
8. **Rủi ro khi thay đổi**: Tuyệt đối giữ Ch.1–4 trả về `null`, 0 `PointLight` mới, Lite luôn ít đỉnh hơn High và không rò rỉ GPU khi chuyển chương.
9. **Tiêu chí nghiệm thu**: `wave14Overhaul.test.ts` (W14-3a) xác minh 8/8 cụm Ch.5–12 đạt `pointLightCount === 0`, `meshCount >= 10`, tương phản PBR `>= 0.25`, Lite giảm đỉnh nghiêm ngặt, `reducedMotion = 0.25×`, dọn GPU sạch; `validateGlbPipelineManifest` giữ nguyên `e5430Safe = true`.
10. **Điểm sau khi triển khai và kiểm thử**: `94 / 100`

### 10. Art Direction — Định hướng nghệ thuật
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: Bảng màu Hoàng Đạo 12 chương nhất quán 60-30-10 (`ART_STYLE_GUIDE.md`), 4 đấu trường & Boss GLB Ch.1–4, 8 cụm kiến trúc đền thờ 3D độc bản Ch.5–12 (`zodiacRealmArchitecture.ts`), **8 bộ giáp/vương miện/vũ khí 3D nhận diện thị giác riêng cho 8 Boss Ch.5–12** (`zodiacBossRegalia.ts`, Đợt 11), và UI Celestial Tapestry Zero-Pill.
3. **Vấn đề tồn tại**: Trước Đợt 7–11, 8 cung Ch.5–12 chưa có công trình biểu tượng và phục trang Boss nhận diện rõ từng cung Hoàng Đạo.
4. **Nguyên nhân gốc rễ**: `buildArena` và `createEnemy` trước đây gom Ch.5–12 vào khuôn hình nguyên tố chung.
5. **Giải pháp đề xuất**: Kế thừa chuẩn `ART_STYLE_GUIDE.md`, 8 cụm kiến trúc & phù điêu sàn đấu Ch.5–12 (Đợt 7–13), trong **Đợt 15** đồng bộ ngôn ngữ hình ảnh Zero-Pill nền đặc (`0 backdrop-blur`, **0 PointLights mới**) cho hộp thoại **Ngã Rẽ Chiến Thuật (`TacticalCrossroadsModal.tsx`)** và các tín hiệu HUD **Phản Tiễn / Va Tường Choáng** kèm bộ ký hiệu hình học mù màu `⚡/◆/✦/▲` chuẩn hóa tại `ART_STYLE_GUIDE.md` Mục 2e.
6. **File hoặc module liên quan**: `ART_STYLE_GUIDE.md`, `src/components/TacticalCrossroadsModal.tsx`, `src/components/GameHUD.tsx`, `src/engine/zodiacRealmArchitecture.ts`, `src/engine/GameEngine.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 7, 11, 13 & Đợt 15)
8. **Rủi ro khi thay đổi**: Tuyệt đối giữ **0 PointLights mới** và **0 `backdrop-blur`** đè canvas WebGL 3D.
9. **Tiêu chí nghiệm thu**: `wave13Overhaul.test.ts` & `wave15Overhaul.test.ts` pass 100%, chuẩn mỹ thuật đồng nhất 100% với `ART_STYLE_GUIDE.md`.
10. **Điểm sau khi triển khai và kiểm thử**: `94 / 100`

### 11. Physics System — Hệ thống vật lý
1. **Điểm hiện tại (Trước)**: `82 / 100`
2. **Bằng chứng đánh giá**: `fixedTimestep.ts`, va chạm tường/trụ, đẩy lùi an toàn (`clampKnockbackInsideArena`), lưới `SpatialHashGrid` Zero-GC, sóng xung kích vỡ trụ (`evaluatePillarShatterShockwave`, Đợt 13) và **Vật Lý Va Tường Choáng Zero-GC (`evaluateWallSlamImpact`, Đợt 15)**.
3. **Vấn đề tồn tại**: Trước Đợt 15, đẩy lùi kẻ địch vào tường đấu trường hoặc trụ đá nguyên vẹn chỉ kẹp vị trí lại mà chưa có phản hồi va chạm vật lý (choáng, sát thương va đập, sóng xung kích).
4. **Nguyên nhân gốc rễ**: Vòng đẩy lùi trong `GameEngine.ts` chưa kiểm tra tiếp xúc biên tường/trụ đá nguyên vẹn bằng hàm tính va chạm thuần Zero-GC.
5. **Giải pháp đề xuất**: Triển khai **`SpatialHashGrid<T>`** + **`projectilePhysicsSystem.ts`** (Đợt 3–4), sóng vỡ trụ Zero-GC (Đợt 13), và trong **Đợt 15** triển khai **`evaluateWallSlamImpact`** (`src/engine/wave15CombatSystems.ts`) ghi trực tiếp vào biến đệm `wallSlamScratch` & tái dùng `intactObstacleScratch` (0 cấp phát GC): phát hiện va đập biên tường hoặc cột đá nguyên vẹn, gây **choáng `0.75s`**, **`+18%` sát thương cộng thêm**, khóa hồi `1.6s`/mục tiêu, và áp dụng luật miễn choáng (chỉ tăng stagger) cho Boss.
6. **File hoặc module liên quan**: `src/engine/wave15CombatSystems.ts`, `src/engine/tacticalRoomModifiers.ts`, `src/engine/spatialHashGrid.ts`, `src/engine/projectilePhysicsSystem.ts`, `src/engine/GameEngine.ts`, `src/engine/wave15Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 3–4, Đợt 13 & Đợt 15)
8. **Rủi ro khi thay đổi**: Tuyệt đối 0 cấp phát đối tượng mới trên vòng 60Hz và không khóa choáng vĩnh viễn Boss hay quái thường.
9. **Tiêu chí nghiệm thu**: `wave15Overhaul.test.ts` (W15-2 xác minh tường/trụ, cooldown `1.6s`, Boss stagger-only, 100% Zero-GC tái dùng `out` object), `spatialHashGrid.test.ts` & benchmark `49,332/49,332` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `95 / 100`

### 12. Enemy AI — Trí tuệ nhân tạo quái vật
1. **Điểm hiện tại (Trước)**: `78 / 100`
2. **Bằng chứng đánh giá**: `EnemySquadDirector` (`2–5` token tấn công, `≤ 3` ở Lite), `aaaEnemyCombatEngine.ts` (7 trạng thái AI + che chắn tiên phong), 2 Đặc Tính Tinh Anh chiến thuật (`vanguard_link` & `quake_pulse`), và **3 Học Thuyết Đội Hình Quái (`resolveFormationDoctrineProfile`: `pincer_flank`, `balanced_line`, `shield_wall`, Đợt 15)**.
3. **Vấn đề tồn tại**: Trước Đợt 15, đội hình xuất trận của quái giữa các phòng chưa phân hóa rõ theo học thuyết chiến thuật gắn với lựa chọn đường đi của người chơi.
4. **Nguyên nhân gốc rễ**: `GameEngine.ts` sinh quái theo bố cục phân bố đồng nhất thay vì áp dụng học thuyết bọc sườn / tuyến cân bằng / tường khiên theo phòng đã chọn.
5. **Giải pháp đề xuất**: Triển khai `EnemySquadDirector` (Đợt 2), AI 7 trạng thái (Đợt 8), 2 Đặc Tính Tinh Anh (Đợt 13), và trong **Đợt 15** triển khai **3 Học Thuyết Đội Hình Quái (`resolveFormationDoctrineProfile`)** nối trực tiếp vào từng nhánh **Ngã Rẽ Chiến Thuật**: **`pincer_flank`** (bọc sườn hai cánh cơ động), **`balanced_line`** (tuyến tiêu chuẩn cân bằng) và **`shield_wall`** (tuyến đầu tiên phong tăng HP chống chịu, mở không gian cho Phản Tiễn & Va Tường).
6. **File hoặc module liên quan**: `src/engine/wave15CombatSystems.ts`, `src/engine/tacticalRoomModifiers.ts`, `src/engine/aaaEnemyCombatEngine.ts`, `src/engine/enemySquadDirector.ts`, `src/engine/GameEngine.ts`, `src/engine/wave15Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 2, 8, 13 & Đợt 15)
8. **Rủi ro khi thay đổi**: Không vượt trần token tấn công Lite (`≤ 3`) và giữ Ch.1 thuần FTUE.
9. **Tiêu chí nghiệm thu**: `wave15Overhaul.test.ts` (W15-3), `wave13Overhaul.test.ts` & `enemySquadDirector.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `95 / 100`

### 13. Boss Design — Thiết kế boss
1. **Điểm hiện tại (Trước)**: `84 / 100`
2. **Bằng chứng đánh giá**: Boss Ch.1–4 & Ch.10–12 đủ 3 giai đoạn, 12 danh hiệu & mẹo khắc chế Hoàng Đạo, 8 bộ giáp/vương miện/vũ khí 3D Boss Ch.5–12, cộng thêm trong **Đợt 15**: tương tác **Phản Tiễn `+45%` bào Khiên Phá Giáp Boss**, **miễn choáng Va Tường (chỉ tích lũy Stagger)** và **Hợp Âm Vỡ Điểm Yếu / Phá Giáp Boss (`boss_weakpoint_shatter`, ưu tiên 99)**.
3. **Vấn đề tồn tại**: Trước Đợt 15, cú Né Hoàn Hảo trước chiêu Boss chưa tạo lợi thế Phá Giáp rõ nét và pha vỡ điểm yếu / phá giáp Boss thiếu tín hiệu âm thanh ưu tiên tối cao riêng biệt.
4. **Nguyên nhân gốc rễ**: Mũi tên hậu né đòn chưa nhân hệ số bào Khiên Phá Giáp Boss và `SfxPriorityMixer` chưa có danh mục ưu tiên 99 riêng cho vỡ điểm yếu Boss.
5. **Giải pháp đề xuất**: Kế thừa sửa lỗi Pha III Ch.1–4 (Đợt 6) và 8 bộ phục trang 3D Ch.5–12 (Đợt 11), trong **Đợt 15** nối **Phản Tiễn Né Hoàn Hảo (`bossBreakShieldScale: 1.45×`)**, bảo vệ Boss khỏi choáng thường khi Va Tường (chuyển hóa sang Stagger), và phát **`playBossWeakpointShatterChord`** (`priority 99`) ngay khi đánh trúng Điểm Yếu hoặc phá vỡ Khiên Phá Giáp Boss.
6. **File hoặc module liên quan**: `src/engine/wave15CombatSystems.ts`, `src/audio/sfxPriorityMixer.ts`, `src/audio/soundEngine.ts`, `src/engine/zodiacBossRegalia.ts`, `src/engine/GameEngine.ts`, `src/engine/wave15Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P0 / P1 / P2 (Đã hoàn thành Đợt 6, 9, 11 & Đợt 15)
8. **Rủi ro khi thay đổi**: Boss tuyệt đối không bị stun-lock bởi Va Tường mà chỉ tăng thanh Stagger đúng cơ chế Phá Giáp.
9. **Tiêu chí nghiệm thu**: `wave15Overhaul.test.ts` (W15-1/W15-2/W15-5), `wave11Overhaul.test.ts` & `boss-patterns.test.mjs` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `94 / 100`

### 14. Level Design — Thiết kế màn chơi
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: 12 chương × 12 phòng, 4 cơ quan sàn đấu, 5 Biến Thể Phòng Chiến Thuật (Đợt 13), và **Ngã Rẽ Chiến Thuật Giữa Chương (`Tactical Room Crossroads`, Đợt 15)** tại Cổng Bắc sau Ải 4 & Ải 8 trên Ch.2–12.
3. **Vấn đề tồn tại**: Trước Đợt 15, mạch tiến trình qua 12 phòng trong mỗi chương diễn ra tuyến tính 1 đường duy nhất, thiếu quyết định rẽ nhánh rủi ro/phần thưởng giữa chặng.
4. **Nguyên nhân gốc rễ**: Bước chuyển qua Cổng Bắc trong `GameEngine.ts` đi thẳng sang phòng kế tiếp thay vì mở giao lộ chọn nhánh chiến thuật tại các cột mốc giữa chương.
5. **Giải pháp đề xuất**: Kết hợp xoay vòng địa hình (Đợt 5) và 5 Biến Thể Phòng (Đợt 13), trong **Đợt 15** triển khai **Ngã Rẽ Chiến Thuật tất định (`rollTacticalCrossroadsPair` + `TacticalCrossroadsModal.tsx`)** kích hoạt sau khi vượt Ải 4 & Ải 8 trên Chiến Dịch Ch.2–12 (khóa tắt 100% ở Ch.1 & chế độ đặc biệt bảo vệ FTUE), cho phép chọn 1 trong 2 nhánh (`Phòng Phục Kích Kho Báu` +35% Vàng & +25% Bụi Sao / `Phòng Thánh Tuyền Hồi Phục` hồi 28% HP / `Phòng Cổ Ngữ Kiên Cố` +20% Vàng & +35% Bụi Sao) gắn liền với 3 Học Thuyết Đội Hình Quái.
6. **File hoặc module liên quan**: `src/engine/wave15CombatSystems.ts`, `src/components/TacticalCrossroadsModal.tsx`, `src/engine/tacticalRoomModifiers.ts`, `src/engine/GameEngine.ts`, `src/App.tsx`, `src/engine/wave15Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 5, Đợt 13 & Đợt 15; GLB điêu khắc Ch.5–12 ở P2-5b/P3-2)
8. **Rủi ro khi thay đổi**: Phải bảo toàn tuyệt đối Ch.1 (0 ngã rẽ chặn FTUE) và cộng thưởng Crossroads rõ ràng vào quyết toán thắng trận.
9. **Tiêu chí nghiệm thu**: `wave15Overhaul.test.ts` (W15-3) xác minh Ch.1 / chế độ đặc biệt trả về `null`, Ch.2–12 Ải 4 & 8 sinh cặp tất định 2 nhánh khác nhau và thưởng áp dụng chính xác; `wave13Overhaul.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `95 / 100`

### 15. World Building — Xây dựng thế giới
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: Vũ trụ 12 Cung Hoàng Đạo gắn kết trực tiếp giữa 4 Tướng, Bộ Sưu Tập Ch.1–4, Boss Codex, Chòm Sao, Thánh Tích, Biên Niên Sử 12 Chương (`zodiacWorldLore.ts`) và 8 cụm kiến trúc đền thờ 3D độc bản Ch.5–12 (`zodiacRealmArchitecture.ts`).
3. **Vấn đề tồn tại**: Trước Đợt 5–7, Boss Codex thiếu biên niên sử đầy đủ và khung cảnh 3D Ch.5–12 chưa phản ánh trực tiếp kiến trúc biểu tượng của từng cung.
4. **Nguyên nhân gốc rễ**: Chưa gắn biên niên sử 12 chương vào Sổ Tay và chưa có bộ công trình kể chuyện môi trường Ch.5–12.
5. **Giải pháp đề xuất**: Xây dựng `src/data/zodiacWorldLore.ts`, 8 cụm kiến trúc đền thờ 3D Ch.5–12 (Đợt 7), 8 phù điêu sàn đấu Ch.5–12 (Đợt 13), và trong **Đợt 14** gắn kết chặt chẽ thế giới 3D với tiến trình người chơi qua **Nhật Ký Hành Trình 12 Chương (`src/data/zodiacJourneyLog.ts`)** trong `CodexGuideModal.tsx` (tab **`Hành Trình`**): liên kết trực tiếp Biên Niên Sử từng chương với tên & điển tích **Thánh Vật 3D kể chuyện môi trường** xuất hiện ngay trên đấu trường Ch.5–12 và **12 Ấn Triện Chinh Phục**.
6. **File hoặc module liên quan**: `src/data/zodiacJourneyLog.ts`, `src/data/zodiacWorldLore.ts`, `src/engine/zodiacRealmArchitecture.ts`, `src/components/CodexGuideModal.tsx`, `src/engine/wave14Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 5, 7, 13 & Đợt 14)
8. **Rủi ro khi thay đổi**: Bảo đảm tên & mô tả Thánh Vật 3D trong Codex khớp 100% với `ZODIAC_STORYTELLING_PROPS` trên đấu trường 3D Ch.5–12.
9. **Tiêu chí nghiệm thu**: `wave14Overhaul.test.ts` (W14-2a/W14-3a), `zodiacWorldLore.test.ts` & `zodiacRealmArchitecture.test.ts` pass 100% cho cả 12/12 cung Hoàng Đạo.
10. **Điểm sau khi triển khai và kiểm thử**: `94 / 100`

### 16. Progression System — Hệ thống tăng tiến
1. **Điểm hiện tại (Trước)**: `82 / 100`
2. **Bằng chứng đánh giá**: `getEarlyProgressionPolicy`, tài khoản mới bắt đầu ở `702 LC` (dưới Ch.1 `1,350 LC`), trần phẩm chất khóa theo chương, lộ trình 30 ngày F2P (`fairProgression30Day.ts`), Tinh Tuý Hoàng Đạo 500 bậc, và hiển thị minh bạch 100% danh mục tiến trình mở khóa Tinh Linh / Cánh / Thú Cưỡi / Thánh Khí / Hào Quang Ch.1–4 (`chapterAssetVisibility.ts`).
3. **Vấn đề tồn tại**: `migrateSaveData` từng làm rớt `selectedHeroId` tướng Ch.2–4; trước đây các vật phẩm bộ sưu tập Ch.2–4 bị ẩn khỏi giao diện khiến người chơi không thấy rõ mục tiêu mở khóa theo chương.
4. **Nguyên nhân gốc rễ**: Thiếu hàm chuẩn hóa hiển thị và khóa theo chương thống nhất cho 5 danh mục sưu tầm và Phòng Thử Đồ.
5. **Giải pháp đề xuất**: Sửa triệt để `migrateSaveData`, bổ sung **Tinh Tuý Hoàng Đạo (500 bậc)**, hiển thị trọn bộ danh mục Ch.1–4 kèm `Xem 3D` (`chapterAssetVisibility.ts`), Mốc Thành Tựu Tinh Thông Tướng Lv.2–10 (Đợt 11), và trong **Đợt 14** triển khai **Nhật Ký Hành Trình 12 Chương (`zodiacJourneyLog.ts`)** gồm **36 mốc chinh phục tất định** (3 mốc/chương: Khai Phá Ải 3 · Hạ Boss Chương · Ấn Triện Tinh Thông ≥2 Sao / Ác Mộng I) trao Vàng, Ngọc, Bụi Sao & 12 Ấn Triện trực tiếp trên `CodexGuideModal.tsx`, giữ tuyệt đối `0` chỉ số bị động ảnh hưởng tài khoản mới `702 LC` và khóa nhận 1 lần qua `claimedJourneyMilestones`.
6. **File hoặc module liên quan**: `src/data/zodiacJourneyLog.ts`, `src/data/saveIntegrity.ts`, `src/components/CodexGuideModal.tsx`, `src/App.tsx`, `src/data/wave11RetentionSystems.ts`, `src/data/fairProgression30Day.ts`, `src/engine/wave14Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P0 / P1 / P2 (Đã hoàn thành Đợt 1–11 & Đợt 14)
8. **Rủi ro khi thay đổi**: Tuyệt đối không ảnh hưởng mốc Fresh Account `702 LC`, chặn nhận trùng và lọc trắng `claimedJourneyMilestones` chống sửa tay file lưu.
9. **Tiêu chí nghiệm thu**: Tài khoản mới giữ nguyên `702 LC`, `wave14Overhaul.test.ts` (W14-2a/W14-2b) & `tools/simulate-playtime-milestones.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `94 / 100`

### 17. Economy System — Hệ thống kinh tế
1. **Điểm hiện tại (Trước)**: `72 / 100`
2. **Bằng chứng đánh giá**: Các nguồn thu/chi Vàng, Kim Cương, Bụi Sao, Lõi Tinh Linh đã có nhưng chưa có mô phỏng 8 mốc thời lượng (`5m → 100h`) để kiểm chứng lạm phát.
3. **Vấn đề tồn tại**: Khi xây dựng bộ mô phỏng thực tế lần đầu, phát hiện lạm phát tồn kho Vàng ở mốc `100h`: `Gold Sink Ratio = 53.5%` (dư ~6.24M Vàng chưa có chỗ tiêu).
4. **Nguyên nhân gốc rễ**: Không có Gold Sink mở rộng theo hàm mũ sau khi 8 Thiên Phú chạm tổng Lv.160 và đồ Thần Thoại chạm Lv.80.
5. **Giải pháp đề xuất**: Kế thừa Tinh Tuý Hoàng Đạo 500 bậc & Tinh Luyện Cổ Ngữ/Tôi Luyện Dòng Phụ (Đợt 13), trong **Đợt 15** bổ sung bể tiêu Vàng · Bụi Sao · Mảnh Rèn tất định **Chuyển Hóa Đồ Bộ Hoàng Đạo (`src/data/gearSetTransmutation.ts`)** mở khóa sau Ch.2 (`highestChapterCleared >= 2`), cho phép chuyển đổi nhãn Bộ Trang Bị cho đồ Sử Thi (`6,500g / 90d / 15s`), Huyền Thoại (`18,000g / 240d / 35s`) và Thần Thoại (`42,000g / 520d / 75s`), tích hợp trực tiếp vào kiểm toán 100h `tools/simulate-playtime-milestones.ts`.
6. **File hoặc module liên quan**: `src/data/gearSetTransmutation.ts`, `src/data/runeAndAffixRefining.ts`, `src/data/gearData.ts`, `src/data/saveIntegrity.ts`, `src/components/RelicForgeModal.tsx`, `tools/simulate-playtime-milestones.ts`, `src/engine/wave15Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 1–4, Đợt 13 & Đợt 15)
8. **Rủi ro khi thay đổi**: Khóa cứng Chuyển Hóa Đồ Bộ trước Ch.3 để Fresh Account giữ nguyên `702 LC` và xác thực tài nguyên chặt chẽ trước khi trừ.
9. **Tiêu chí nghiệm thu**: `tools/simulate-playtime-milestones.ts` xác minh Fresh `702 LC`, bể tiêu Đợt 15 **`133,000 Vàng · 1,700 Bụi Sao · 250 Mảnh Rèn`**, tổng Endgame Gold Sink **`1,763,855,343 Vàng` (`13,112.9%` thu nhập 100h)**, `flashDealArbitrageDetected: false`, `wave15Overhaul.test.ts` (W15-4) pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `95 / 100`

### 18. Loot System — Hệ thống vật phẩm
1. **Điểm hiện tại (Trước)**: `83 / 100`
2. **Bằng chứng đánh giá**: 5 bậc phẩm chất, 5 Bộ Trang Bị (Set Bonus 2/3 món), Pity chống xui, phân giải đồ thừa ra Mảnh Rèn mục tiêu, Bộ Lọc Tự Động Phân Giải, so sánh chi tiết chỉ số & Bộ, và trong **Đợt 15** bổ sung **Chuyển Hóa Đồ Bộ Tất Định (`RelicForgeModal.tsx` → `Chuyển Bộ`)** xóa hoàn toàn rủi ro RNG kẹt thiếu mảnh cuối Bộ Trang Bị ở trung–hậu kỳ.
3. **Vấn đề tồn tại**: Trước Đợt 15, người chơi nhặt được món Sử Thi/Huyền Thoại/Thần Thoại dòng phụ đẹp nhưng lệch Bộ Trang Bị không có cách chuyển hóa tất định sang bộ mong muốn để hoàn chỉnh kích hoạt 2/3 món.
4. **Nguyên nhân gốc rễ**: `GearInstance` chưa có trường `transmutedSetId` và `evaluateEquippedGearSets` chưa đọc nhãn bộ chuyển hóa hợp lệ.
5. **Giải pháp đề xuất**: Triển khai **`src/data/gearSetTransmutation.ts`**, cập nhật **`evaluateEquippedGearSets`** trong `gearData.ts`, mở tab **`Chuyển Bộ`** trong `RelicForgeModal.tsx` với bộ lọc đồ Sử Thi+, 5 thẻ Bộ Hoàng Đạo, xem trước thay đổi kích hoạt Bộ 2/3 món trước/sau và chi phí rõ ràng, đồng thời lọc trắng `transmutedSetId` trong `saveIntegrity.ts`.
6. **File hoặc module liên quan**: `src/data/gearSetTransmutation.ts`, `src/data/gearData.ts`, `src/data/saveIntegrity.ts`, `src/components/RelicForgeModal.tsx`, `src/App.tsx`, `src/engine/wave15Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 6, 8, 11 & Đợt 15)
8. **Rủi ro khi thay đổi**: Tuyệt đối chỉ cho phép trên đồ Sử Thi/Huyền Thoại/Thần Thoại sau khi vượt Ch.2, và tước sạch `transmutedSetId` giả mạo trong `saveIntegrity.ts`.
9. **Tiêu chí nghiệm thu**: `wave15Overhaul.test.ts` (W15-4 xác minh khóa Ch.2, từ chối đồ Thường/Hiếm, trừ tài nguyên chính xác, kích hoạt ngay Bộ 2/3 món và làm sạch save giả mạo) pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `95 / 100`

### 19. Difficulty Scaling — Tăng tiến độ khó
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: 12 chương tăng từ `1,350 LC → 285,000 LC`, `computePowerPressure`, Nightmare Ascension I–V & 5 biến dị phòng, nhịp hồi phục AI Ch.1→12, 5 Biến Thể Phòng, 2 Đặc Tính Tinh Anh, và **Ngã Rẽ Chiến Thuật tự chọn độ khó đổi thưởng (`ambush_vault` `+18% HP/+10% DMG` vs `sanctuary_spring` vs `rune_bastion`, Đợt 15)**.
3. **Vấn đề tồn tại**: Trước Đợt 15, người chơi vượt cấp tốt hoặc đang cần hồi phục giữa chương chưa có công cụ tự điều tiết rủi ro/phần thưởng ngay trong từng lượt đi.
4. **Nguyên nhân gốc rễ**: Mạch phòng giữa chương chưa có nhánh chọn rủi ro chủ động gắn liền với học thuyết đội hình quái.
5. **Giải pháp đề xuất**: Kết hợp lộ trình phân tầng Đợt 13, trong **Đợt 15** bổ sung **Ngã Rẽ Chiến Thuật Ch.2–12 (Ải 4 & 8)** cho phép người chơi chủ động chọn phòng rủi ro cao (`ambush_vault` bọc sườn +35% Vàng), phòng hồi phục an toàn (`sanctuary_spring` +28% HP), hoặc phòng công thành (`rune_bastion` tường khiên +35% Bụi Sao) mà vẫn giữ sạch Ch.1 FTUE.
6. **File hoặc module liên quan**: `src/engine/wave15CombatSystems.ts`, `src/engine/tacticalRoomModifiers.ts`, `src/engine/GameEngine.ts`, `GAME_BALANCE_REPORT.md`, `src/engine/wave15Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 6, 8, 13 & Đợt 15)
8. **Rủi ro khi thay đổi**: Vẫn cần xác nhận cảm nhận né đòn thực tế từ playtest người thật (P3-1).
9. **Tiêu chí nghiệm thu**: `wave15Overhaul.test.ts` (W15-3) & `tools/simulate-playtime-milestones.ts` (`chapter12TtkHealthy: true`, `skillBuildsBalanced: true`) pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `94 / 100`

### 20. UI/UX — Giao diện và trải nghiệm người dùng
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: Giao diện Celestial Gold thống nhất, Zero-Pill, 0 `backdrop-blur` đè WebGL, 0 chấm `animate-pulse`, HUD tách khỏi vòng 60Hz, hiển thị đầy đủ 100% danh mục sưu tầm Ch.1–4 kèm `Xem 3D`, đồng bộ sống 8 phím tắt tùy biến trên `GameHUD.tsx`, và trong Đợt 8 bổ sung so sánh chỉ số chi tiết + Bộ Trang Bị trên `LobbyPanels.tsx` cùng dự báo Ngã Rẽ Tiến Hóa trực tiếp trên thẻ Tarot `SkillDraftModal.tsx`.
3. **Vấn đề tồn tại**: Trước Đợt 7–8, nhãn phím `F`/`X` trên HUD gắn cứng, khung so sánh đồ mới chỉ hiện chênh lệch LC tổng và thẻ chọn kỹ năng chưa báo rõ nhánh Tiến Hóa sắp mở.
4. **Nguyên nhân gốc rễ**: Thiếu hàm tính chênh lệch trang bị chi tiết (`computeGearComparison`) và hàm dự báo tiến hóa trên thẻ chọn kỹ năng (`getSkillEvolutionPreview`).
5. **Giải pháp đề xuất**: Hoàn thiện trọn bộ UX chiến đấu & kho đồ (Đợt 7–10), và trong Đợt 11 bổ sung đồng bộ 4 bề mặt UX chiều sâu cao: **Bảng Sát Thương Từng Kỹ Năng cuối trận (`PauseResultModal.tsx`)**, **tab Thử Thách Tuần (`DailyRewardsModal.tsx`)**, **Mốc Tinh Thông Anh Hùng Lv.2–10 + Bộ Lưu Preset đồng bộ Trang Bị/Ngọc Khắc có đổi tên trực tiếp (`LobbyPanels.tsx`)**, và **Bảng Lọc Tự Động Phân Giải (`RelicForgeModal.tsx`)** — toàn bộ giữ vững chuẩn Zero-Pill & 0 `backdrop-blur`.
6. **File hoặc module liên quan**: `src/components/PauseResultModal.tsx`, `src/components/DailyRewardsModal.tsx`, `src/components/RelicForgeModal.tsx`, `src/components/LobbyPanels.tsx`, `src/components/SplashGate.tsx`, `src/components/SkillDraftModal.tsx`, `src/components/GameHUD.tsx`, `src/App.tsx`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 7, 8, 10 & 11)
8. **Rủi ro khi thay đổi**: Phải giữ thẻ Tarot, bảng kết quả trận đấu, bảng lọc phân giải và các ngăn Sảnh gọn gàng, không tràn chiều dọc ở `1440×900`.
9. **Tiêu chí nghiệm thu**: Headless Chromium (`1440×900`) xác minh trực tiếp toàn bộ 4 bề mặt Đợt 11 (`weekly-challenges-panel`, `hero-mastery-milestones`, `runes-loadout-presets`, `smart-auto-salvage-panel`) với 0 lỗi console, 0 cảnh báo, `blurred: 0`, `ariaLive: 1`.
10. **Điểm sau khi triển khai và kiểm thử**: `94 / 100`

### 21. Game Feel — Cảm giác chơi
1. **Điểm hiện tại (Trước)**: `82 / 100`
2. **Bằng chứng đánh giá**: `combatFeel.ts` (Hitstop, Camera Shake trauma, recoil, kill burst), `combatAnimationKinematics.ts` (nghiêng thân Lướt, nhún Kỹ năng `E`/`F`, **biên đạo Quái/Boss windup anticipation → lunge, quỳ gối rung phá giáp, tan biến xác chết**), `heroAndBossSignatureVfx.ts` (**VFX tuyệt kỹ riêng 4 tướng & vòng hào quang Boss Pha II/III — 0 PointLights**), âm trầm kết liễu `playExecutionFinisherDrop`, tách riêng `reduceScreenFlash` đồng bộ WebGL + HUD, và **Đệm Phím 5 Hành Động (`140ms`)**.
3. **Vấn đề tồn tại**: Trước Đợt 7–12, Quái/Boss thiếu biên đạo gồng đòn & quỳ gối choáng, 4 tướng thiếu hiệu ứng chữ ký riêng khi tung tuyệt kỹ và thiếu âm trầm kết liễu khi hạ Boss/Tinh Anh.
4. **Nguyên nhân gốc rễ**: Phản hồi chiến đấu trước đây tập trung vào phía người chơi mà chưa có bộ biên đạo hình ảnh-âm thanh đồng bộ cho Quái/Boss và 4 tuyệt kỹ tướng.
5. **Giải pháp đề xuất**: Kế thừa Đệm Phím 5 hành động (Đợt 7), chính sách HUD `resolveHudVisualFeedbackPolicy` (Đợt 9), và biên đạo/VFX Đợt 12, trong **Đợt 15** đẩy cảm giác va chạm lên tầm cao mới với **hit-stop Phản Tiễn `0.032s`** (tự động tắt khi bật `reducedMotion`), **lọc trầm dưới nước `820 Hz`** (`2400 Hz` cho `reducedMotion`) khi Né Hoàn Hảo làm chậm thời gian, cùng **đập tường/cột choáng `wall_slam_impact`** kết hợp sóng xung kích tức thì (0 PointLights).
6. **File hoặc module liên quan**: `src/engine/wave15CombatSystems.ts`, `src/audio/aaaAudioMix.ts`, `src/audio/soundEngine.ts`, `src/engine/combatAnimationKinematics.ts`, `src/engine/heroAndBossSignatureVfx.ts`, `src/engine/GameEngine.ts`, `src/engine/wave15Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 7, 9, 12 & Đợt 15)
8. **Rủi ro khi thay đổi**: Phải tôn trọng tuyệt đối `reducedMotion` (tắt hit-stop & nâng cutoff lên `2400 Hz`) và `reduceScreenFlash`.
9. **Tiêu chí nghiệm thu**: `wave15Overhaul.test.ts` (W15-1/2/5) & `wave12Overhaul.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `95 / 100`

### 22. Performance — Hiệu năng
1. **Điểm hiện tại (Trước)**: `76 / 100`
2. **Bằng chứng đánh giá**: Auto-detect Intel HD 4000 (`aaaVisualPipeline.ts`), GPU Thermal Watchdog Stage 0→4, 0-PointLight Shader Policy (xác minh sống `PointLights: 0` ngay cả khi bật VFX chữ ký 4 tướng & Boss Pha II/III), Zero-GC `SpatialHashGrid`, `projectilePhysicsSystem.ts`, `VfxFrameBudgetCache`, `LootOrbVisualCache`, `GroundTelegraphVisualPool`, `CombatFrameScratchPool`, trần tan biến xác chết Lite `<= 5`, và trong Đợt 12 tích hợp **Bộ Đo Benchmark 15s / 60s FPS 1% Low (Zero-GC `Float32Array(7200)`) xuất báo cáo JSON** ngay trong `SettingsModal.tsx`.
3. **Vấn đề tồn tại**: Trước Đợt 12, người dùng/QA chưa có công cụ đo trực tiếp FPS 1% Low, P95/P99 frame time, Draw Calls, Triangles và số PointLights hoạt động ngay trong game để xuất JSON kiểm định phần cứng Dell Latitude E5430.
4. **Nguyên nhân gốc rễ**: `GameEngine.ts` chưa có bộ thu thập mẫu khung hình Zero-GC gắn vào vòng `startLoop` và chưa có bảng điều khiển xuất báo cáo benchmark trong Cài Đặt.
5. **Giải pháp đề xuất**: Triển khai **`FrameBenchmarkSampler`** (`src/engine/frameBenchmarkSampler.ts`, đệm `Float32Array(7200)` không cấp phát GC trong lúc đo) nối vào `GameEngine.startLoop` và bảng **`Kiểm Định Hiệu Năng 60 Giây (FPS 1% Low · E5430 Field QA)`** trong `SettingsModal.tsx` hỗ trợ chạy nhanh 15s / chuẩn 60s, Sao chép JSON & Tải JSON; đồng thời khóa chặt 0 PointLights cho `HeroAndBossSignatureVfxPool` và trần `<= 5` xác tan biến ở Lite.
6. **File hoặc module liên quan**: `src/engine/frameBenchmarkSampler.ts`, `src/engine/heroAndBossSignatureVfx.ts`, `src/components/SettingsModal.tsx`, `src/engine/combatScratchBuffers.ts`, `src/engine/GameEngine.ts`, `PERFORMANCE_REPORT.md`.
7. **Mức độ ưu tiên**: P0 / P2 (Đã hoàn thành Đợt 1–12; đo nhiệt vật lý E5430 60 phút ở P3-1)
8. **Rủi ro khi thay đổi**: Bộ ghi khung hình trong `startLoop` phải đảm bảo Zero-GC và null-safe với các bài test `Object.create(GameEngine.prototype)`.
9. **Tiêu chí nghiệm thu**: `wave12Overhaul.test.ts` (W12-4) & `tests/render-pacing.test.mjs` pass 100%; live Chromium đo thực tế `PointLights: 0`, `Lite: Bật`, `76` draw calls và xuất đủ nút `Sao Chép JSON` / `Tải JSON`; đo nhiệt vật lý Dell E5430 60 phút tiếp tục ghi nhận trung thực là chờ QA thực địa P3-1.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 23. Code Architecture — Kiến trúc mã nguồn
1. **Điểm hiện tại (Trước)**: `72 / 100`
2. **Bằng chứng đánh giá**: Tách biệt rõ lớp dữ liệu (`src/data/`), âm thanh (`src/audio/`), dịch vụ (`src/services/`), máy chủ (`server.ts`, `src/server/`), và các mô-đun engine thuần túy có unit test độc lập.
3. **Vấn đề tồn tại**: `src/engine/GameEngine.ts` và `src/App.tsx` có độ tập trung cao từ nhiều đợt mở rộng nhanh.
4. **Nguyên nhân gốc rễ**: Nhiều vòng lặp VFX, vật lý đạn, đội hình, bộ đệm snapshot khung hình, kiến trúc đấu trường và bộ đo hiệu năng trước đây có nguy cơ phình to nếu viết trực tiếp vào `GameEngine.ts`.
5. **Giải pháp đề xuất**: Hoàn tất trọn bộ **`P2-3a` → `P2-3l`**: trong Đợt 15 tiếp tục tách biệt hoàn toàn hai mô-đun thuần túy Zero-GC **`src/engine/wave15CombatSystems.ts`** (Phản Tiễn, Va Tường Choáng, Ngã Rẽ Chiến Thuật & 3 Học Thuyết Đội Hình) và **`src/data/gearSetTransmutation.ts`** (Chuyển Hóa Đồ Bộ Tất Định & kiểm toán sink 100h) cùng modal lazy-loaded **`src/components/TacticalCrossroadsModal.tsx`**, nối gọn gàng qua hợp đồng giao diện vào `GameEngine.ts` và `App.tsx`.
6. **File hoặc module liên quan**: `src/engine/wave15CombatSystems.ts`, `src/data/gearSetTransmutation.ts`, `src/components/TacticalCrossroadsModal.tsx`, `src/engine/heroAndBossSignatureVfx.ts`, `src/engine/frameBenchmarkSampler.ts`, `src/engine/GameEngine.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành `P2-3a` → `P2-3l`)
8. **Rủi ro khi thay đổi**: Phải bảo đảm null-safety cho `GameEngine` prototype harness (`tests/render-pacing.test.mjs`, `tests/resource-lifecycle.test.mjs`) và dọn sạch trạng thái mỗi lần đổi phòng.
9. **Tiêu chí nghiệm thu**: `tsc --noEmit` 0 lỗi, Vite build sạch, toàn bộ kho mã nguồn đạt **`495` test / `487` PASS / `0` fail**.
10. **Điểm sau khi triển khai và kiểm thử**: `95 / 100`

### 24. Asset Pipeline — Quy trình quản lý tài nguyên
1. **Điểm hiện tại (Trước)**: `79 / 100`
2. **Bằng chứng đánh giá**: Backblaze B2 + Cloudflare Worker CDN, `scripts/glb-manifest.json` quản lý 173 tệp (126 active), `glbPipelineValidator.ts`, `chapter1Map.ts`, `glbFetchResilience.ts`, `modelAssets.ts`, `/admin/assets`.
3. **Vấn đề tồn tại**: Trước Đợt 10, bản đồ `Chương 1.glb` (`90.36 MB`) tải 4 phân đoạn song song bằng `arrayBuffer()` không phát tiến độ giữa gói nên hay đứt `AbortError` ở `6%` trên mạng thực tế mà không tự lùi về `Chương 1 Lite.glb` (`1.32 MB`); `downloadModel` (Hero High), `chapter1Boss.ts`, `chapter1RosterAssets.ts`, `solarLeoAssets.ts` và nhánh phục hồi `loadAppearanceAsset` thiếu idle-timeout hoặc thiếu fallback High → Lite.
4. **Nguyên nhân gốc rễ**: Chưa có lớp tải nhị phân streaming reset timeout theo gói dùng chung và chưa nối tự động fallback High → Lite cho cả bản đồ Chương 1 lẫn mô hình Anh hùng/Quái/Boss/Sưu tầm.
5. **Giải pháp đề xuất**: Hoàn tất **P2-1, P2-2 & Đợt 10**: đạt **`100%` đối cặp High/Lite (`63/63` cặp, `0` lỗi, tổng Lite `31.88 MB`)**, triển khai streaming `readResponseBytesWithProgress` khớp chính xác khóa cache 6 MiB của Cloudflare Worker + tự hoàn nguyên byte khi thử lại gói lỗi (`chapter1Map.ts`), tự động fallback `Chương 1.glb` → `Chương 1 Lite.glb` (`1.32 MB`) kèm nhận diện biến thể Lite trong `GameEngine.ts`, bổ sung High → Lite fallback cho Hero GLB (`modelAssets.ts`), và thống nhất **`fetchGlbWithIdleTimeout`** (`glbFetchResilience.ts`) cho toàn bộ `chapter1Boss.ts`, `chapter1RosterAssets.ts`, `solarLeoAssets.ts` và `GameEngine.ts`.
6. **File hoặc module liên quan**: `src/engine/glbFetchResilience.ts`, `src/engine/chapter1Map.ts`, `src/engine/modelAssets.ts`, `src/engine/chapter1Boss.ts`, `src/engine/chapter1RosterAssets.ts`, `src/engine/solarLeoAssets.ts`, `src/engine/GameEngine.ts`, `scripts/glb-manifest.json`.
7. **Mức độ ưu tiên**: P0 / P2 (Đã hoàn thành P2-1, P2-2 & Đợt 10)
8. **Rủi ro khi thay đổi**: Phải giữ nguyên kích thước phân đoạn `CHAPTER1_MAP_CHUNK_BYTES = 6 MiB` để không phá cache cạnh Cloudflare Worker (`workers/glb-cdn/index.mjs:622`).
9. **Tiêu chí nghiệm thu**: `validateGlbPipelineManifest` trả `pairCoveragePct: 100`, `issues: []`, `e5430Safe: true`; `chapter1Map.test.ts` (5/5) & `wave10ResilienceAndTactics.test.ts` (W10-1a/1b) xác minh streaming, chống HTML-404, idle-timeout và tự động fallback High → Lite pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `94 / 100`

### 25. Replayability — Giá trị chơi lại
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: 4 tướng Hoàng Đạo, 40+ kỹ năng roguelike + 12 nhánh Tiến Hóa Boss/AoE dự báo rõ trên thẻ Tarot, **Bảng Phân Tích Sát Thương Từng Kỹ Năng cuối trận**, **Bộ Lưu Trang Bị & Cổ Ngữ Chuyển Nhanh**, **Sân Tập 3D So Sánh DPS Thực Tế Từng Bộ Lưu Trang Bị (`Chốt Mẫu DPS` + tự chốt khi đổi Preset + `% ΔDPS` & Kỹ Năng MVP, Đợt 12)**, **Khế Ước Thử Thách Tuần xoay vòng ISO**, Tháp Vô Tận, Nightmare Ascension I–V + 5 Mutators, Đấu Trường Cân Bằng.
3. **Vấn đề tồn tại**: Trước Đợt 12, khi thử nghiệm nhiều Bộ Lưu Trang Bị & Cổ Ngữ trong Sân Tập 3D, người chơi chưa thể chốt và so sánh trực tiếp DPS 5s, Đỉnh DPS, tỷ lệ chí mạng, Kỹ năng MVP và `% ΔDPS` cạnh nhau ngay trên HUD.
4. **Nguyên nhân gốc rễ**: `GameHUD.tsx` ở chế độ `isTrainingMode` chưa có bảng ghi nhận đối chiếu theo từng slot Bộ Trang Bị và chưa đọc Kỹ năng MVP thực tế từ `GameEngine`.
5. **Giải pháp đề xuất**: Kết hợp Sân Tập 3D so sánh DPS Preset (Đợt 12), trong **Đợt 15** mở rộng mạnh giá trị chơi lại từng lượt đi qua **Ngã Rẽ Chiến Thuật Ch.2–12 (Ải 4 & 8)** (chọn giữa Kho Báu Phục Kích, Thánh Tuyền Hồi Phục hoặc Cổ Ngữ Kiên Cố gắn 3 Học Thuyết Đội Hình Quái) kết hợp **Chuyển Hóa Đồ Bộ Tất Định** cho phép xoay chuyển build linh hoạt giữa 5 Bộ Hoàng Đạo mà không phụ thuộc may rủi.
6. **File hoặc module liên quan**: `src/engine/wave15CombatSystems.ts`, `src/data/gearSetTransmutation.ts`, `src/components/TacticalCrossroadsModal.tsx`, `src/components/RelicForgeModal.tsx`, `src/engine/wave15Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 8, 11, 12 & Đợt 15)
8. **Rủi ro khi thay đổi**: Không làm gián đoạn mạch FTUE Ch.1 và bảo đảm chi phí Chuyển Bộ tạo lựa chọn chiến lược ý nghĩa.
9. **Tiêu chí nghiệm thu**: `wave15Overhaul.test.ts` (W15-3/W15-4) & `wave12Overhaul.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `95 / 100`

### 26. Player Retention — Khả năng giữ chân người chơi
1. **Điểm hiện tại (Trước)**: `78 / 100`
2. **Bằng chứng đánh giá**: FTUE Ch.1 chặt chẽ (`5m → 30m`), lộ trình công bằng 30 ngày (`FAIR_30DAY_MILESTONES`), nhiệm vụ ngày, **5 Khế Ước Thử Thách Tuần xoay vòng theo tuần ISO** (`DailyRewardsModal.tsx`, tự cộng điểm từ trận đấu thực & hiển thị chấm thông báo Phúc Lợi), **Mốc Thành Tựu Tinh Thông Từng Tướng Lv.2–10** kèm Danh Hiệu Lv.10 độc quyền (`LobbyPanels.tsx`), **Bộ Lọc Tự Động Phân Giải Trang Bị Thừa** giảm ma sát quản lý kho đồ (`RelicForgeModal.tsx`), chuyển cấp miễn phí 100%, và xem trước 3D Bộ Sưu Tập Ch.1–4, không dùng dark pattern.
3. **Vấn đề tồn tại**: Về mặt thiết kế và triển khai cơ chế giữ chân dài hạn (ngày/tuần/tướng/QoL kho đồ) đã hoàn thiện đầy đủ; **tuy nhiên vẫn chưa có dữ liệu đo giữ chân thực tế D1 / D7 / D30 từ người chơi thật** (chưa xác minh live).
4. **Nguyên nhân gốc rễ**: Dự án đang ở giai đoạn hoàn thiện kỹ thuật trước khi mở Beta thu thập hành vi người dùng.
5. **Giải pháp đề xuất**: Triển khai trọn bộ vòng giữ chân trung–dài hạn trong Đợt 11 (Thử Thách Tuần xoay vòng tự động, Mốc Thành Tựu Tinh Thông cho cả 4 tướng, Bộ Lọc Tự Động Phân Giải bảo vệ S-Tier/Preset, và Bộ Lưu Preset chuyển nhanh), giữ nguyên bạch minh: số liệu D1/D7/D30 thực tế chờ đo ở P3-1.
6. **File hoặc module liên quan**: `src/data/wave11RetentionSystems.ts`, `src/components/DailyRewardsModal.tsx`, `src/components/LobbyPanels.tsx`, `src/components/RelicForgeModal.tsx`, `src/data/questsData.ts`, `src/data/chapterAssetVisibility.ts`, `src/data/fairProgression30Day.ts`.
7. **Mức độ ưu tiên**: P1 / P2 / P3 (Cơ chế hoàn thành Đợt 11; đo D1/D7/D30 thực địa ở P3-1)
8. **Rủi ro khi thay đổi**: Nhầm lẫn giữa chất lượng cơ chế giữ chân + mô phỏng toán học với tỷ lệ giữ chân Beta thực tế — luôn ghi rõ tách bạch trong mọi báo cáo.
9. **Tiêu chí nghiệm thu**: `wave11Overhaul.test.ts` (W11-2, W11-3, W11-4) pass 100%, kiểm chứng sống cả 3 màn hình trên Chromium 0 lỗi; D1/D7/D30 thực tế tiếp tục ghi nhận là chờ đo thực địa.
10. **Điểm sau khi triển khai và kiểm thử**: `90 / 100` *(cơ chế & QoL dài hạn hoàn chỉnh; D1/D7/D30 live: chưa xác minh thực địa)*

### 27. Accessibility — Khả năng tiếp cận
1. **Điểm hiện tại (Trước)**: `74 / 100`
2. **Bằng chứng đánh giá**: Tùy chỉnh cỡ chữ UI (`100% / 115% / 130%`), bảng màu mù màu (`colorblindTelegraphs.ts`), giảm rung, giảm chuyển động (kể cả giảm 75% biên độ kiến trúc Ch.5–12 và tắt nhịp nhấp nháy viền thấp máu trên HUD), Anti-Flash độc lập (`reduceScreenFlash`) đồng bộ trọn vẹn từ WebGL sang mọi lớp chớp HUD, biểu tượng hình học mù màu (`◈/✦/▲/◆/⚡/◎/★`) + cảnh báo viền hổ phách tương phản cao trên `GameHUD.tsx`, hỗ trợ Gamepad API, vùng `aria-live="polite"`, và **trọn bộ 8 phím tắt chiến đấu PC tùy biến** đồng bộ sống vào cả nút HUD lẫn biểu ngữ phản công/kết liễu (`resolveTopCombatBanner`).
3. **Vấn đề tồn tại**: Trước Đợt 9, `reduceScreenFlash`, `reducedMotion`, và `colorblindTelegraphs` chưa được truyền xuống `GameHUD.tsx` (khiến các lớp chớp toàn màn hình chuyển pha Boss / dính đòn vẫn bật mạnh và viền thấp máu vẫn nhấp nháy đỏ), đồng thời biểu ngữ phản công/kết liễu vẫn viết cứng phím `Q`/`F` thay vì đọc phím người chơi đã gán lại.
4. **Nguyên nhân gốc rễ**: `App.tsx` chưa truyền 3 cờ tiếp cận này xuống `<GameHUD>` và `resolveTopCombatBanner` chưa nhận tham số phím tắt tùy biến & mù màu.
5. **Giải pháp đề xuất**: Truyền trọn bộ `reduceScreenFlash`, `reducedMotion`, `colorblindTelegraphs` từ `App.tsx` vào `GameHUD.tsx`, triển khai **`resolveHudVisualFeedbackPolicy`** tắt chớp toàn màn hình gắt khi bật Anti-Flash, tắt nhịp nhấp nháy khi bật Giảm Chuyển Động, chuyển sắc thái sang hổ phách tương phản cao + ký hiệu hình học khi bật Mù Màu, và tiêm nhãn phím tùy biến `ultKeyLabel`/`heavyBreakKeyLabel` trực tiếp vào `resolveTopCombatBanner` trong Đợt 9.
6. **File hoặc module liên quan**: `src/engine/combatHudBanners.ts`, `src/components/GameHUD.tsx`, `src/App.tsx`, `src/engine/wave9ZeroGcAndHud.test.ts`, `src/types/game.ts`, `src/engine/aaaWave6Director.ts`, `src/components/SettingsModal.tsx`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 7 & Đợt 9)
8. **Rủi ro khi thay đổi**: Cần giữ nguyên phản hồi chỉ hướng trúng đòn (directional hit arc) và ngữ nghĩa cảnh báo khi bật Anti-Flash / Mù Màu.
9. **Tiêu chí nghiệm thu**: `wave9ZeroGcAndHud.test.ts` (W9-2/W9-3) pass 100%, kiểm chứng live Chromium bật sống đồng thời Mù Màu + Anti-Flash (`r9-settings-a11y.png`) và vào trận chiến đấu (`r9-combat-hud.png`) với 0 lỗi console, `aria-live="polite"` hiện diện trên DOM thật.
10. **Điểm sau khi triển khai và kiểm thử**: `94 / 100`

### 28. Security & Anti-Cheat — Bảo mật và chống gian lận
1. **Điểm hiện tại (Trước)**: `74 / 100`
2. **Bằng chứng đánh giá**: `firestore.rules` (7 blueprint, 0 lỗi ESLint, đã sửa & deploy live quyền cập nhật lịch `scheduledStartMs`/`scheduledEndMs` trong `liveops_config`), xác thực Firebase ID Token ở `server.ts`, rate limiter API, kẹp tải trọng WebSocket, `saveIntegrity.ts` làm sạch trọn bộ trường lưu bao gồm dữ liệu Đợt 11 (`autoSalvageFilter`, `weeklyChallenges`, `claimedHeroMasteryMilestones`), không lộ bí mật trên frontend.
3. **Vấn đề tồn tại**: Trước Đợt 11, nhánh `allow update` của `liveops_config` trong `firestore.rules` thiếu 2 khóa `scheduledStartMs`/`scheduledEndMs` trong danh sách `affectedKeys().hasOnly(...)`, và các trường mới Đợt 11 cần được kẹp biên chặt chống sửa tay file lưu.
4. **Nguyên nhân gốc rễ**: Danh sách khóa cho phép cập nhật ở `firestore.rules` chưa bổ sung đủ 2 khóa lịch LiveOps khi cập nhật tài liệu đã tồn tại.
5. **Giải pháp đề xuất**: Ngoài bộ quy tắc `firestore.rules` (0 lỗi ESLint) và sanitization `saveIntegrity.ts`, trong **Đợt 14** bổ sung lớp chống gian lận kết quả trận đấu đầy đủ cả client lẫn server:
   - **`src/data/runIntegrityVerifier.ts`**: Hàm thuần tính lại trần thẩm quyền (`computeAuthoritativeRunBounds`) theo chế độ/chương/ải/lực chiến (không bao giờ tin trần từ client), phát hiện speedhack (`impossible_clear_speed`), hack sát thương (`excessive_dps`), tràn Vàng/Ngọc/Season XP (`clamped` về biên hợp lệ hoặc `rejected` với thưởng = 0).
   - **`POST /api/runs/verify` (`server.ts`) + `RunNonceReplayGuard` (`serverSecurity.ts`)**: Bảo vệ bằng `createApiRateLimitMiddleware`, đọc hệ số LiveOps thẩm quyền trực tiếp từ server (`readServerLiveOpsConfig`), chống phát lại kết quả trận đấu bằng bộ nhớ giới hạn (`maxEntries: 2000`, `TTL: 6h`), ghi nhận sự kiện vào danh mục **`run_integrity_flagged`** của `SecurityAnomalyTracker` và hiển thị thẻ KPI **`Bất Thường Kết Quả Trận`** trên `AssetAdminLiveOpsTab.tsx` (kèm guard `!shouldSkipNodeApiEndpoints()` tránh 404 trên SPA tĩnh).
   - **`src/data/saveIntegrity.ts`**: Lọc trắng `claimedJourneyMilestones` theo `VALID_JOURNEY_MILESTONE_IDS`, khử trùng lặp và loại bỏ mã giả mạo.
6. **File hoặc module liên quan**: `src/data/runIntegrityVerifier.ts`, `src/server/serverSecurity.ts`, `server.ts`, `src/data/saveIntegrity.ts`, `src/components/AssetAdminLiveOpsTab.tsx`, `src/App.tsx`, `firestore.rules`, `src/engine/wave14Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P0 / P1 / P2 (Đã hoàn thành Đợt 11 & Đợt 14)
8. **Rủi ro khi thay đổi**: Biên DPS/thưởng phải đủ rộng cho chí mạng, Cộng Hưởng Bậc III, Tiến Hóa, Ác Mộng I–V & sự kiện LiveOps để không chặn nhầm người chơi chân chính.
9. **Tiêu chí nghiệm thu**: `wave14Overhaul.test.ts` (W14-2b, W14-4a, W14-4b) xác minh xác thực trận hợp lệ, kẹp trần tràn thưởng, từ chối speedhack/DPS phi lý, chặn replay nonce, ghi nhận `run_integrity_flagged` & lọc sạch `claimedJourneyMilestones`; `npx eslint firestore.rules` = 0 lỗi.
10. **Điểm sau khi triển khai và kiểm thử**: `95 / 100`

### 29. Quality Assurance — Kiểm thử chất lượng
1. **Điểm hiện tại (Trước)**: `70 / 100`
2. **Bằng chứng đánh giá**: Toàn bộ bộ kiểm thử `node:test` (`src/**/*.test.ts` + `tests/*.test.mjs`), **công cụ Benchmark 15s/60s FPS 1% Low xuất JSON tích hợp trực tiếp trong game** (`frameBenchmarkSampler.ts` + `SettingsModal.tsx`), benchmark vật lý `tools/benchmark-spatial-physics.ts`, mô phỏng 8 mốc `tools/simulate-playtime-milestones.ts`, kiểm định `firestore.rules` và kiểm chứng trình duyệt sống Chromium (`playwright-cli`).
3. **Vấn đề tồn tại**: Mọi cải tiến Đợt 15 (Phản Tiễn Né Hoàn Hảo, Vật Lý Va Tường Choáng Zero-GC, Ngã Rẽ Chiến Thuật + 3 Học Thuyết Đội Hình, Chuyển Hóa Đồ Bộ Tất Định + sanitization và Âm Thanh Biến Thiên + 12 khúc kết điệu thức) đều cần regression gate tự động toàn kho.
4. **Nguyên nhân gốc rễ**: Cần duy trì kỷ luật 0 fail / 0 lỗi biên dịch / 0 PointLights mới / 702 LC Fresh Baseline xuyên suốt mọi đợt phát triển.
5. **Giải pháp đề xuất**: Bổ sung bộ kiểm thử **`src/engine/wave15Overhaul.test.ts`** (5 bộ kiểm định `W15-1 → W15-5` bao phủ đủ 4 trụ cột Đợt 15) và đồng bộ kiểm định lọc trầm `820 Hz`/`2400 Hz` trong `aaaVisualPipeline.test.ts`, kế thừa trọn bộ W1–W14 (`495` bài kiểm thử), mô phỏng 100h `tools/simulate-playtime-milestones.ts` và ESLint `firestore.rules`.
6. **File hoặc module liên quan**: `src/engine/wave15Overhaul.test.ts`, `src/engine/aaaVisualPipeline.test.ts`, `src/engine/wave14Overhaul.test.ts`, `tests/*.test.mjs`, `src/**/*.test.ts`, `tools/simulate-playtime-milestones.ts`, `QA_TEST_REPORT.md`.
7. **Mức độ ưu tiên**: P0 / P1 / P2 (Đã hoàn thành Đợt 1–15)
8. **Rủi ro khi thay đổi**: Mọi cải tiến mới bắt buộc chạy lại full suite + `tsc --noEmit` + Vite production build để chống regression.
9. **Tiêu chí nghiệm thu**: Toàn bộ kho mã nguồn đạt **`495 bài kiểm thử | 487 PASS | 0 FAIL | 8 skip`**, `tsc --noEmit` 0 lỗi, Vite production build sạch, `npx eslint firestore.rules` = 0 lỗi, mô phỏng 100h (`702 LC` Fresh) PASS.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 30. Live Operations — Vận hành và mở rộng
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: Bảng quản trị `/admin/assets`, `AssetAdminLiveOpsTab.tsx`, `src/data/liveOpsConfig.ts`, `liveOpsConfigService.ts`, `liveAiSocket.ts`, `glbFetchResilience.ts`, `vercel.json`, `src/data/wave11RetentionSystems.ts` (Khế Ước Thử Thách Tuần xoay vòng ISO tự động), `firestore.rules` (đã sửa & deploy live).
3. **Vấn đề tồn tại**: Trước Đợt 11, cập nhật khung lịch sự kiện LiveOps (`scheduledStartMs`/`scheduledEndMs`) trên tài liệu Firestore đã tồn tại có nguy cơ bị chặn bởi `affectedKeys().hasOnly(...)` trong `firestore.rules`, và chưa có vòng sự kiện Khế Ước Tuần tự động làm mới theo lịch ISO.
4. **Nguyên nhân gốc rễ**: Quy tắc `allow update` của `liveops_config` chưa liệt kê đủ hai khóa lịch sự kiện.
5. **Giải pháp đề xuất**: Hoàn thiện & deploy live quy tắc cập nhật `scheduledStartMs`/`scheduledEndMs` trên `firestore.rules`, kết hợp chế độ SPA tĩnh `VITE_STATIC_SPA=true` + `shouldSkipNodeApiEndpoints()` (0 lỗi 404 Vercel) và động cơ xoay vòng Khế Ước Tuần tự động theo ISO week (`getIsoWeekKey`, Đợt 11).
6. **File hoặc module liên quan**: `firestore.rules`, `src/data/wave11RetentionSystems.ts`, `vercel.json`, `src/engine/glbFetchResilience.ts`, `src/services/liveAiSocket.ts`, `src/services/liveOpsConfigService.ts`, `src/data/liveOpsConfig.ts`, `src/components/AssetAdminLiveOpsTab.tsx`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành P2-4b, Đợt 10 & Đợt 11)
8. **Rủi ro khi thay đổi**: Không được vô hiệu hóa `/api/*` trên môi trường full-stack Node/Express tự host (`localhost` hoặc máy chủ riêng).
9. **Tiêu chí nghiệm thu**: `wave11Overhaul.test.ts` (W11-3), `wave10ResilienceAndTactics.test.ts` & `liveops-config.test.mjs` pass 100%, `VITE_STATIC_SPA=true ... npm run build` thành công (`7.47s`), `npx eslint firestore.rules` = 0 lỗi & `DeployRules` thành công.
10. **Điểm sau khi triển khai và kiểm thử**: `94 / 100`

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
| **Progression, Economy & Loot** | 16, 17, 18 | 20% | 79.00 | 93.33 | 15.80 | 18.67 | **+2.87** |
| **Gameplay, Combat & Skill** | 01, 02, 03, 04 | 20% | 81.25 | 93.75 | 16.25 | 18.75 | **+2.50** |
| **Animation, VFX, SFX & Music** | 05, 06, 07, 08 | 15% | 78.75 | 93.50 | 11.81 | 14.03 | **+2.22** |
| **Enemy AI, Boss & Difficulty** | 12, 13, 19 | 10% | 80.67 | 93.00 | 8.07 | 9.30 | **+1.23** |
| **Performance & Architecture** | 22, 23 | 10% | 74.00 | 95.00 | 7.40 | 9.50 | **+2.10** |
| **Graphics, Art & World Design** | 09, 10, 15 | 5% | 80.67 | 93.67 | 4.03 | 4.68 | **+0.65** |
| **Game Feel, UI/UX & Accessibility** | 20, 21, 27 | 5% | 78.67 | 93.67 | 3.93 | 4.68 | **+0.75** |
| **Replayability & Retention** | 25, 26 | 5% | 79.00 | 92.00 | 3.95 | 4.60 | **+0.65** |
| **Physics, Level & Asset Pipeline** | 11, 14, 24 | 5% | 80.33 | 93.33 | 4.02 | 4.67 | **+0.65** |
| **Security, QA & Live Operations** | 28, 29, 30 | 5% | 74.67 | 95.00 | 3.73 | 4.75 | **+1.02** |
| **TỔNG ĐIỂM TRỌNG SỐ** | **30 / 30 tiêu chí** | **100%** | — | — | **78.99 / 100** | **93.63 / 100** | **+14.64** |

---

## 3. Đánh Giá Chi Tiết 30 Tiêu Chí (Đủ 10 Trường Bắt Buộc / Tiêu Chí)

### 01. Game Design — Thiết kế trò chơi
1. **Điểm hiện tại (Trước)**: `84 / 100`
2. **Bằng chứng đánh giá**: 4 tướng Hoàng Đạo (`heroesData.ts`), 12 chương chiến dịch (`chaptersData.ts`), hệ thống Roguelike skill draft (`skillsData.ts`), Tháp Vô Tận, Nightmare Ascension I–V (`phase5Data.ts`).
3. **Vấn đề tồn tại**: Tướng Sylvia dùng trùng hiệu ứng kỹ năng chủ động với Aurelia; thiếu mục tiêu tiêu Vàng rõ ràng ở giai đoạn sau 60h.
4. **Nguyên nhân gốc rễ**: Nội dung Ch.3–4 được mở rộng nhanh nhưng nhánh hiệu ứng riêng của Sylvia và sink Endgame chưa tách biệt hoàn toàn.
5. **Giải pháp đề xuất**: Triển khai kỹ năng độc nhất `'jade_bastion'` cho Sylvia, hệ thống **Tinh Tuý Hoàng Đạo** (`paragonInfusionLevel`), dự báo Ngã Rẽ Tiến Hóa trên thẻ Tarot (Đợt 8), và trong **Đợt 13** bổ sung đồng bộ **5 Biến Thể Phòng Chiến Thuật (`tacticalRoomModifiers.ts`, tắt tuyệt đối Ch.1 Ải 1–5 bảo vệ FTUE)**, **ma trận 6 cặp Phản Ứng Nguyên Tố + Chuỗi Cộng Hưởng (`CỘNG HƯỞNG ×N`)**, **2 Đặc Tính Tinh Anh chiến thuật (`vanguard_link` & `quake_pulse`)**, cùng **Tinh Luyện Cổ Ngữ `+0→+5` & Tôi Luyện Dòng Phụ Trang Bị tất định**.
6. **File hoặc module liên quan**: `src/engine/tacticalRoomModifiers.ts`, `src/engine/aaaWave4Director.ts`, `src/data/runeAndAffixRefining.ts`, `src/data/phase5Data.ts`, `src/data/talentsData.ts`, `src/engine/skillEvolutionEngine.ts`, `src/components/SkillDraftModal.tsx`, `src/engine/GameEngine.ts`, `src/engine/wave13Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 8 & Đợt 13)
8. **Rủi ro khi thay đổi**: Phải khóa hoàn toàn Biến Thể Phòng ở Ch.1 Ải 1–5, giữ Fresh `702 LC` và giữ biên DPS ±12% giữa 4 tướng.
9. **Tiêu chí nghiệm thu**: 4 tướng 4 `effectKind`, Fresh `702 LC` giữ nguyên, `wave13Overhaul.test.ts` (6/6), `earlyProgression.test.ts` & `wave8TacticalAndProgression.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `93 / 100`

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
5. **Giải pháp đề xuất**: Hiện thực hóa `'jade_bastion'`, Đệm Phím 5 Hành Động (`140ms`, Đợt 7), và trong **Đợt 13** hoàn thiện **Ma Trận 6 Cặp Phản Ứng Nguyên Tố** (thêm `electro_venom` Độc Lôi Lan & `cryo_blight` Hàn Độc Phá Giáp), cơ chế **Chuỗi Cộng Hưởng Nguyên Tố Zero-GC (`ElementalChainState`: 2+ phản ứng khác nhau trong `6s` → `+18%` sát thương & `+15%` bào Khiên Phá Giáp Boss)**, cùng vòng **Mạch Tinh Năng (`leyline_conduit`)** và cửa sổ **Sơ Hở `2.5s`** khi ngắt chiêu `quake_pulse`.
6. **File hoặc module liên quan**: `src/engine/aaaWave4Director.ts`, `src/engine/aaaWave5Director.ts`, `src/engine/tacticalRoomModifiers.ts`, `src/engine/GameEngine.ts`, `src/components/GameHUD.tsx`, `src/components/CodexGuideModal.tsx`, `src/engine/wave13Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 7 & Đợt 13)
8. **Rủi ro khi thay đổi**: Bảo đảm Zero-GC trên vòng chiến đấu 60Hz, giữ nguyên `ELEMENTAL_REACTION_GUIDE` (4 mục cũ) cho tương thích ngược trong khi Codex hiển thị đủ 6 cặp qua `EXTENDED_ELEMENTAL_REACTION_GUIDE`.
9. **Tiêu chí nghiệm thu**: `wave13Overhaul.test.ts` (W13-2/W13-3), `aaaWave4Director.test.ts` & `aaaWave5Director.test.ts` pass 100%, hiển thị rõ chuỗi `CỘNG HƯỞNG ×N` và thanh biến thể phòng trên `GameHUD.tsx` (Zero-Pill, `0 backdrop-blur`).
10. **Điểm sau khi triển khai và kiểm thử**: `93 / 100`

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
5. **Giải pháp đề xuất**: Bổ sung suy giảm khoảng cách 3D + 4 âm sắc vũ khí tướng + tiếng dội khiên kim loại (Đợt 5), và trong Đợt 12 bổ sung 5 danh mục SFX ưu tiên cùng `playBossTelegraphPing`, `playLootRarityChime` (3 bậc âm sắc Sử Thi/Huyền Thoại/Thần Thoại) và `playExecutionFinisherDrop` (sub-bass kết liễu Boss/Tinh Anh) trong `soundEngine.ts`, nối trực tiếp vào `GameEngine.ts`.
6. **File hoặc module liên quan**: `src/audio/sfxPriorityMixer.ts`, `src/audio/soundEngine.ts`, `src/engine/wave12Overhaul.test.ts`, `src/audio/sfxSpatialAndTimbre.test.ts`, `src/engine/GameEngine.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 5 & Đợt 12)
8. **Rủi ro khi thay đổi**: Cần kiểm soát chặt tổng voice khi rơi nhiều đồ hoặc Boss ra đòn liên tiếp để không gây méo tiếng trên CPU yếu.
9. **Tiêu chí nghiệm thu**: `wave12Overhaul.test.ts` (W12-3) & toàn bộ `src/audio/*.test.ts` pass 100%, 0 lỗi WebAudio trên trình duyệt sống Chromium.
10. **Điểm sau khi triển khai và kiểm thử**: `93 / 100`

### 08. Music Design — Thiết kế nhạc nền
1. **Điểm hiện tại (Trước)**: `79 / 100`
2. **Bằng chứng đánh giá**: Trọn bộ 12 chủ đề nhạc Hoàng Đạo độc bản Ch.1–12 (`zodiacMusicDirector.ts`), chuyển pha Sảnh / Chiến đấu / Boss có **crossfade mượt (`bgmGain`)** và **lớp nhạc động thích ứng theo Pha Boss, HP thấp & Combo (`resolveDynamicMusicLayers`, Đợt 12)**.
3. **Vấn đề tồn tại**: Trước Đợt 12, nhạc chiến đấu và Boss chuyển pha đột ngột chưa có crossfade mượt và chưa xếp lớp động (nhịp trống căng thẳng, đối âm Pha II/III, nhịp tim thấp máu) có giới hạn tài nguyên cho `lowEndMode`.
4. **Nguyên nhân gốc rễ**: `soundEngine.ts` chưa có bộ điều phối tầng nhạc động theo trạng thái trận đấu và chưa đặt dốc chuyển âm lượng `bgmGain` khi đổi chế độ nhạc.
5. **Giải pháp đề xuất**: Triển khai trọn bộ 12 chủ đề nhạc Hoàng Đạo (Đợt 3) và bổ sung **`resolveDynamicMusicLayers`** (Đợt 12) tự động tăng cường lớp gõ, đối âm căng thẳng, nhịp tim khi HP ≤ 30% và dải lọc theo Pha Boss I–III đồng thời khóa chặt số bộ dao động bổ sung `≤ 1` ở `lowEndMode`, kết hợp crossfade `bgmGain` mượt trong `setBgmMode`.
6. **File hoặc module liên quan**: `src/audio/zodiacMusicDirector.ts`, `src/audio/soundEngine.ts`, `src/engine/wave12Overhaul.test.ts`, `tests/zodiac-music-director.test.mjs`, `src/components/SettingsModal.tsx`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 3 & Đợt 12)
8. **Rủi ro khi thay đổi**: Tăng số bộ dao động ở Pha III trên Intel HD 4000/i5-3320M — đã khóa cứng `extraOscillatorCap <= 1` khi `lowEndMode` bật.
9. **Tiêu chí nghiệm thu**: `wave12Overhaul.test.ts` (W12-3) & `zodiac-music-director.test.mjs` xác minh đủ 12 chủ đề, tăng tiến lớp nhạc theo pha/HP/combo và tuân thủ trần `lowEndMode`; sạch bản quyền 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `93 / 100`

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
5. **Giải pháp đề xuất**: Ban hành & đồng bộ `ART_STYLE_GUIDE.md`, dựng đủ 8 biểu tượng kiến trúc 3D (Đợt 7), 8 bộ giáp/vương miện/vũ khí 3D Boss Ch.5–12 (Đợt 11), và trong **Đợt 13** bổ sung **8 Phù Điêu Sàn Đấu Hoàng Đạo Thủ Tục Ch.5–12 (`buildZodiacArenaFloorMedallion`: `y = 0.025`, `polygonOffset: true`, `depthWrite: false`, 0 PointLights, tự giảm đỉnh ở Lite, 1 nút xoay Zero-GC, giải phóng GPU sạch)** kèm bộ ký hiệu hình học mù màu (`◈/▲/◆/✦/⚡`) chuẩn hóa trong `ART_STYLE_GUIDE.md` Mục 2c.
6. **File hoặc module liên quan**: `ART_STYLE_GUIDE.md`, `src/engine/zodiacRealmArchitecture.ts`, `src/engine/zodiacBossRegalia.ts`, `src/components/GameHUD.tsx`, `src/engine/GameEngine.ts`, `src/engine/wave13Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 7, Đợt 11 & Đợt 13)
8. **Rủi ro khi thay đổi**: Tuyệt đối không tạo Z-fighting với sàn đấu/vòng telegraph (`polygonOffset: true`, `depthWrite: false`) và **0 PointLights mới**.
9. **Tiêu chí nghiệm thu**: `wave13Overhaul.test.ts` (W13-5) xác minh đủ 8/8 phù điêu Ch.5–12 (0 PointLights, `polygonOffset`, Lite giảm đỉnh, giải phóng GPU sạch), Ch.1–4 không bị ảnh hưởng, 0 `backdrop-blur` đè WebGL.
10. **Điểm sau khi triển khai và kiểm thử**: `93 / 100`

### 11. Physics System — Hệ thống vật lý
1. **Điểm hiện tại (Trước)**: `82 / 100`
2. **Bằng chứng đánh giá**: `fixedTimestep.ts`, va chạm tường/trụ, đẩy lùi an toàn theo vật cản (`clampKnockbackInsideArena`), và lưới phân vùng không gian Zero-GC `SpatialHashGrid`.
3. **Vấn đề tồn tại**: Trước Đợt 3–4, vòng lặp `updateProjectiles` và `updateEnemies` quét `O(P × E)` / `O(N²)` kèm `[...this.enemies]` cấp phát hàng chục nghìn mảng rác/giây khi nhiều đạn đồng thời.
4. **Nguyên nhân gốc rễ**: Chưa tách mô-đun va chạm không gian Zero-GC riêng cho đạn và đội hình.
5. **Giải pháp đề xuất**: Triển khai **`SpatialHashGrid<T>`** + **`projectilePhysicsSystem.ts`** (Đợt 3–4), và trong **Đợt 13** bổ sung **Vật Lý Vỡ Trụ Tương Tác Zero-GC (`evaluatePillarShatterShockwave`)**: khi trụ chắn bị vỡ (đặc biệt trong phòng `fragile_sanctuary`), phát sóng xung kích bán kính `3.4m`, gây choáng `1.1s` và đẩy lùi hướng tâm có kẹp biên đấu trường hoàn toàn không cấp phát mảng rác mới.
6. **File hoặc module liên quan**: `src/engine/tacticalRoomModifiers.ts`, `src/engine/spatialHashGrid.ts`, `src/engine/projectilePhysicsSystem.ts`, `src/engine/tacticalCombatChoreography.ts`, `src/engine/GameEngine.ts`, `src/engine/wave13Overhaul.test.ts`, `tools/benchmark-spatial-physics.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 3–4 & Đợt 13)
8. **Rủi ro khi thay đổi**: Đẩy lùi từ sóng phá trụ phải kẹp biên an toàn trong đấu trường và không gây đẩy lùi Boss/bù nhìn tập luyện.
9. **Tiêu chí nghiệm thu**: `wave13Overhaul.test.ts` (W13-1b), `spatialHashGrid.test.ts` & `projectilePhysicsSystem.test.ts` pass 100%; benchmark thực tế đạt **49,332/49,332** trùng khớp, nhanh hơn **5.1×–8.09×**, 0 cấp phát mảng rác.
10. **Điểm sau khi triển khai và kiểm thử**: `93 / 100`

### 12. Enemy AI — Trí tuệ nhân tạo quái vật
1. **Điểm hiện tại (Trước)**: `78 / 100`
2. **Bằng chứng đánh giá**: `EnemySquadDirector` (`2–5` token tấn công, `≤ 3` ở Lite), `aaaEnemyCombatEngine.ts` (máy trạng thái **7 trạng thái `EnemyAiTacticalState`**: `patrol | chase | flank | attack | retreat | dodge | recovery`, phối hợp xạ thủ/pháp sư rút lui núp sau đồng đội Tiên Phong `vanguard`, cửa sổ hồi chiêu mở cho người chơi phản công `resolveMobRecoveryDuration`), và truy vấn lân cận `SpatialHashGrid` Zero-GC trong `GameEngine.ts`.
3. **Vấn đề tồn tại**: Trước Đợt 8, `computeAaaMobSteering` vẫn duyệt toàn bộ `enemySnapshot` O(N²) + `this.obstacles` chưa lọc vật cản nguyên vẹn, chưa có máy trạng thái chiến thuật 7 pha tường minh (`patrol`/`retreat`/`recovery` khi thấp máu hoặc sau đòn đánh) và chưa có phối hợp xạ thủ rút lui sau đồng đội Tiên Phong (`vanguard`).
4. **Nguyên nhân gốc rễ**: Hai điểm gọi điều hướng quái trong `GameEngine.ts` chưa tận dụng `enemySpatialGrid.queryRadius` + `intactObstacleScratch`, và `aaaEnemyCombatEngine.ts` thiếu lớp phối hợp vai trò & nhịp `recovery`.
5. **Giải pháp đề xuất**: Triển khai `EnemySquadDirector` (Đợt 2), máy trạng thái AI 7 pha + che chắn tiên phong (Đợt 8), và trong **Đợt 13** bổ sung **2 Đặc Tính Tinh Anh Chiến Thuật mở khóa từ Ch.4+ / Tháp F12+**: **`vanguard_link`** (vòng hào quang giảm 18% sát thương đồng đội lân cận, phá vỡ ngay khi làm choáng hoặc hạ Tinh Anh để gây choáng phản đòn `1.05s`) và **`quake_pulse`** (tụ xung chấn động có vòng telegraph rõ ràng, cho phép ngắt bằng Khống Chế/Phá Giáp để mở cửa sổ **Sơ Hở `2.5s`**), cùng cơ chế **Đội Hình Tiên Phong (`vanguard_phalanx`)** mở sơ hở hậu tuyến khi phá tuyến đầu.
6. **File hoặc module liên quan**: `src/engine/tacticalRoomModifiers.ts`, `src/engine/aaaEnemyCombatEngine.ts`, `src/engine/enemySquadDirector.ts`, `src/audio/soundEngine.ts`, `src/engine/GameEngine.ts`, `src/engine/wave13Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 2, Đợt 8 & Đợt 13)
8. **Rủi ro khi thay đổi**: Không mở 2 đặc tính mới ở Ch.1–3 / Tháp `< F12` để giữ độ mượt học chơi, và dùng scratch buffer Zero-GC khi tính aura `vanguard_link`.
9. **Tiêu chí nghiệm thu**: `wave13Overhaul.test.ts` (W13-3), `wave8TacticalAndProgression.test.ts`, `aaaEnemyCombatEngine.test.ts` & `enemySquadDirector.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `93 / 100`

### 13. Boss Design — Thiết kế boss
1. **Điểm hiện tại (Trước)**: `84 / 100`
2. **Bằng chứng đánh giá**: Boss Chương 1–4 & Chương 10–12 có đầy đủ 3 giai đoạn (Phase I/II/III), vùng telegraph rõ ràng, cửa sổ phản công 2.5s, 12 bộ danh hiệu & mẹo khắc chế Hoàng Đạo độc bản (`ZODIAC_BOSS_PHASE_SIGNATURES`), Boss Codex đồng bộ 100%.
3. **Vấn đề tồn tại**: Phát hiện **lỗi gameplay thực tế tại `GameEngine.ts:20965`** khóa cứng điều kiện Pha III vào `chapter.id >= 10`, khiến Boss Hoàng Đạo Chương 1–4 không bao giờ vào Pha III ở `<= 30% HP` dù Boss Codex đã thiết kế đủ 3 pha; các thông báo chuyển pha vẫn dùng chữ chung chung.
4. **Nguyên nhân gốc rễ**: Điều kiện `canEnterPhaseThree` trong `GameEngine.ts` chưa được cập nhật sau khi mở rộng cơ chế 3 pha cho Chương 1–4 và chưa đọc chữ ký từng cung Hoàng Đạo.
5. **Giải pháp đề xuất**: Triển khai **`canBossEnterPhaseThree`** (kích hoạt Pha III cho Boss cuối Ch.1–4 & Ch.10–12 + Tháp Tầng ≥ 20, khóa an toàn với sub-boss) và **`ZODIAC_BOSS_PHASE_SIGNATURES`** (12 danh hiệu Pha II/III + 12 gợi ý khắc chế trực quan riêng cho Ch.1–12), nối thẳng vào `GameEngine.ts` (Đợt 6) và biểu ngữ HUD (`combatHudBanners.ts`, Đợt 9), và trong Đợt 11 gắn trọn bộ **Giáp Trụ, Vương Miện & Vũ Khí 3D Thủ Tục Độc Bản (`zodiacBossRegalia.ts`)** có hoạt ảnh Zero-GC tăng cường theo Pha II/III cho cả 8 Boss Ch.5–12.
6. **File hoặc module liên quan**: `src/engine/zodiacBossRegalia.ts`, `src/engine/tacticalCombatChoreography.ts`, `src/engine/combatHudBanners.ts`, `src/components/GameHUD.tsx`, `src/engine/wave6AnimationAndBoss.test.ts`, `src/engine/wave9ZeroGcAndHud.test.ts`, `src/engine/wave11Overhaul.test.ts`, `src/engine/GameEngine.ts`, `tests/boss-patterns.test.mjs`.
7. **Mức độ ưu tiên**: P0 / P1 / P2 (Đã hoàn thành Đợt 6, Đợt 9 & Đợt 11)
8. **Rủi ro khi thay đổi**: Phải khóa chặt `e.kind === EnemyKind.ZODIAC_BOSS` để sub-boss giữa chương không vô tình kích hoạt Pha III và giải phóng sạch GPU regalia khi đổi phòng.
9. **Tiêu chí nghiệm thu**: `wave6AnimationAndBoss.test.ts`, `wave9ZeroGcAndHud.test.ts` & `wave11Overhaul.test.ts` (W11-1) xác minh đủ 12 danh hiệu Pha II/III độc nhất + 8 bộ giáp/vũ khí 3D Boss Ch.5–12 (0 PointLights); `boss-patterns.test.mjs` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `93 / 100`

### 14. Level Design — Thiết kế màn chơi
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: 12 chương chiến dịch × 12 phòng/chương + phòng Thiên Thần/Ác Quỷ + Vòng Quay May Mắn + Tháp Vô Tận + 4 cơ quan sàn đấu tương tác (`chapterArenaMechanisms.ts`) + Đấu trường GLB 100% High/Lite Ch.1–4.
3. **Vấn đề tồn tại**: Trước Đợt 5, mọi chương Ch.1–12 đều dùng trùng thứ tự bố trí chướng ngại vật (`courtyard → pillars → cross → gauntlet`) và dòng `eventAfter` Phòng 8 dùng `Math.random()` không tất định lúc nạp mô-đun; Ch.5–12 vẫn chờ tài sản 3D riêng ở P2-5b/P3-2.
4. **Nguyên nhân gốc rễ**: Công thức gán `obstaclePreset` chưa xoay vòng theo `ch.id` và còn nhánh ngẫu nhiên chết tại Phòng 8.
5. **Giải pháp đề xuất**: Xoay vòng địa hình theo chương (Đợt 5) và trong **Đợt 13** triển khai **5 Biến Thể Phòng Chiến Thuật tất định (`src/engine/tacticalRoomModifiers.ts`)** cho Ch.2–12 & Tháp Vô Tận (`leyline_conduit` đặt vòng năng lượng tránh vật cản bằng `GroundTelegraphVisualPool`, `fragile_sanctuary` trụ dễ vỡ nổ xung kích, `vanguard_phalanx`, `elemental_resonance`, `haste_currents`) đồng thời khóa tắt tuyệt đối ở Ch.1 Ải 1–5, Sân Tập, Đấu Trường và World Boss để bảo toàn FTUE.
6. **File hoặc module liên quan**: `src/engine/tacticalRoomModifiers.ts`, `src/engine/GameEngine.ts`, `src/components/GameHUD.tsx`, `src/data/chaptersData.ts`, `src/data/zodiacWorldLore.ts`, `src/engine/wave13Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 5 & Đợt 13; GLB điêu khắc Ch.5–12 ở P2-5b/P3-2)
8. **Rủi ro khi thay đổi**: Phải bảo toàn tuyệt đối Ch.1 Ải 1–5 (0 biến thể phòng) và đặt vòng Mạch Tinh Năng không đè lên cột đá.
9. **Tiêu chí nghiệm thu**: `wave13Overhaul.test.ts` (W13-1/W13-1b), `zodiacWorldLore.test.ts` & `chapterSceneDirector.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `93 / 100`

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
5. **Giải pháp đề xuất**: Triển khai mô phỏng 8 mốc + Tinh Tuý Hoàng Đạo 500 bậc (Đợt 1–4), và trong **Đợt 13** bổ sung 2 bể tiêu Vàng · Bụi Sao · Mảnh Cổ Ngữ trung–hậu kỳ có chiều sâu thiết thực (`src/data/runeAndAffixRefining.ts`): **Tinh Luyện Cổ Ngữ `+0 → +5`** (mở khóa sau Ch.2, mỗi bậc `+6%` hiệu lực cổ ngữ, trần `+30%`) và **Tôi Luyện Dòng Phụ Trang Bị tất định** (tiến `+24%` biên độ mỗi lần, chạm trần sau `≤ 5` bước), tích hợp vào `computePlayerStats`, `saveIntegrity.ts`, `LobbyPanels.tsx`, `RelicForgeModal.tsx`, `App.tsx` và kiểm toán 100h `tools/simulate-playtime-milestones.ts`.
6. **File hoặc module liên quan**: `src/data/runeAndAffixRefining.ts`, `src/data/gearData.ts`, `src/data/saveIntegrity.ts`, `src/components/LobbyPanels.tsx`, `src/components/RelicForgeModal.tsx`, `tools/simulate-playtime-milestones.ts`, `src/engine/wave13Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 1–4 & Đợt 13)
8. **Rủi ro khi thay đổi**: Khóa cứng Tinh Luyện Cổ Ngữ trước Ch.3 để Fresh Account giữ nguyên `702 LC` và kẹp biên chặt trong `saveIntegrity.ts` chống sửa tay file lưu.
9. **Tiêu chí nghiệm thu**: `tools/simulate-playtime-milestones.ts` xác minh Fresh `702 LC`, bể tiêu Đợt 13 **`325,594 Vàng · 5,084 Bụi Sao · 472 Mảnh Cổ Ngữ`**, tổng Endgame Gold Sink **`1,763,722,343 Vàng` (`13,111.9%` thu nhập 100h)**, `flashDealArbitrageDetected: false`, `wave13Overhaul.test.ts` (W13-4) pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `93 / 100`

### 18. Loot System — Hệ thống vật phẩm
1. **Điểm hiện tại (Trước)**: `83 / 100`
2. **Bằng chứng đánh giá**: 5 bậc phẩm chất, 5 Bộ Trang Bị (Set Bonus 2/3 món), Pity chống xui, phân giải đồ thừa ra Mảnh Rèn mục tiêu (`salvageExcessGearToForgeShards`), chuyển cấp cường hóa miễn phí 100%, `LootOrbVisualCache` Zero-GPU-Churn, và bộ so sánh chi tiết từng chỉ số + chuyển đổi Bộ Trang Bị (`computeGearComparison` trong Đợt 8).
3. **Vấn đề tồn tại**: Trước Đợt 8, khi chọn món trang bị mới trong Kho Đồ, giao diện chỉ báo chênh lệch LC tổng (`▲ +LC`), chưa hiển thị chênh lệch từng chỉ số thực (`ATK/HP/Crit/Tốc bắn/Giáp` bao gồm dòng phụ & ngọc khảm) cũng như cảnh báo **+Kích hoạt / -Mất hiệu ứng Bộ Trang Bị**.
4. **Nguyên nhân gốc rễ**: `LobbyPanels.tsx` chưa có hàm so sánh đầy đủ giữa món đang mặc và món dự kiến thay kèm mô phỏng `evaluateEquippedGearSets` trước/sau.
5. **Giải pháp đề xuất**: Triển khai **`LootOrbVisualCache`** (Đợt 6), **`computeGearComparison`** (Đợt 8), và trong Đợt 11 bổ sung **Bộ Lọc Tự Động Phân Giải Trang Bị Thừa (`RelicForgeModal.tsx` → `Tách Đồ`)** luôn khóa bảo vệ cứng đồ Cấp `[S]`, Huyền Thoại+, đang mặc và mọi món nằm trong Bộ Lưu Preset (kèm công tắc bảo vệ Đồ Bộ / Đồ Đã Nâng / Tự động tách sau trận + xem trước sản lượng), cùng **Bộ Lưu Trang Bị & Cổ Ngữ Chuyển Nhanh** hỗ trợ đổi tên trực tiếp, hiển thị trước Bộ Trang Bị kích hoạt & đồng bộ cả hai tab Trang Bị + Ngọc Khắc.
6. **File hoặc module liên quan**: `src/data/wave11RetentionSystems.ts`, `src/components/RelicForgeModal.tsx`, `src/components/LobbyPanels.tsx`, `src/data/gearData.ts`, `src/engine/vfxPoolManager.ts`, `src/engine/wave11Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 6, Đợt 8 & Đợt 11)
8. **Rủi ro khi thay đổi**: Tuyệt đối không bao giờ phân giải nhầm trang bị đang mặc, nằm trong bất kỳ Loadout/Build Preset nào, Cấp `[S]` hoặc Huyền Thoại+.
9. **Tiêu chí nghiệm thu**: `wave11Overhaul.test.ts` (W11-2 & W11-4) chứng minh 100% lớp bảo vệ phân giải & đồng bộ Preset; live Chromium xác minh trực tiếp bảng lọc `smart-auto-salvage-panel` và `runes-loadout-presets`.
10. **Điểm sau khi triển khai và kiểm thử**: `93 / 100`

### 19. Difficulty Scaling — Tăng tiến độ khó
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: 12 chương tăng từ `1,350 LC → 285,000 LC`, `computePowerPressure`, Nightmare Ascension I–V & 5 biến dị phòng, nhịp chuyển Pha II/III chuẩn xác cho Boss Hoàng Đạo Ch.1–4, Ch.10–12 & Tháp F20+, và nhịp hồi phục chiến thuật quái thường `resolveMobRecoveryDuration` giảm dần từ Chương 1 (dễ đọc, rộng cửa sổ phản công) đến Chương 12 (gắt hơn bằng nhịp AI thay vì chỉ tăng HP).
3. **Vấn đề tồn tại**: Trước Đợt 6–8, Boss cuối Ch.1–4 bị khóa Pha III và quái thường chưa có đường cong nhịp hồi phục hậu tấn công (`recovery`) điều chỉnh theo chương.
4. **Nguyên nhân gốc rễ**: Điều kiện `chapter.id >= 10` trước đây chặn Pha III ở Ch.1–4 và AI quái thường thiếu cửa sổ `recovery` theo độ khó chương.
5. **Giải pháp đề xuất**: Chuẩn hóa Pha III Boss Ch.1–4 (Đợt 6), nhịp hồi phục AI giảm dần Ch.1→12 (Đợt 8), và trong **Đợt 13** xây dựng lộ trình phân tầng thử thách chiến thuật không thổi phồng máu ảo: Ch.1 Ải 1–5 thuần FTUE → Ch.2+/Tháp mở **5 Biến Thể Phòng Chiến Thuật** → sau Ch.2 mở **Tinh Luyện Cổ Ngữ** → Ch.4+/Tháp F12+ mở **2 Đặc Tính Tinh Anh phản đòn (`vanguard_link` & `quake_pulse`)**.
6. **File hoặc module liên quan**: `src/engine/tacticalRoomModifiers.ts`, `src/data/runeAndAffixRefining.ts`, `src/engine/aaaEnemyCombatEngine.ts`, `src/engine/tacticalCombatChoreography.ts`, `src/engine/GameEngine.ts`, `GAME_BALANCE_REPORT.md`, `src/engine/wave13Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 6, Đợt 8 & Đợt 13)
8. **Rủi ro khi thay đổi**: Vẫn cần xác nhận cảm nhận né đòn thực tế từ playtest người thật (P3-1).
9. **Tiêu chí nghiệm thu**: `wave13Overhaul.test.ts` (W13-1/W13-3/W13-4) & `tools/simulate-playtime-milestones.ts` (`chapter12TtkHealthy: true`, `skillBuildsBalanced: true`) pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `93 / 100`

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
5. **Giải pháp đề xuất**: Hợp nhất Đệm Phím 5 hành động (Đợt 7), chính sách HUD `resolveHudVisualFeedbackPolicy` (Đợt 9), và trong Đợt 12 kết hợp đồng bộ `stepEnemyChoreography`, `HeroAndBossSignatureVfxPool`, `playBossTelegraphPing` và `playExecutionFinisherDrop` (Zero-GC, 0 PointLights, tôn trọng `reducedMotion` & `reduceScreenFlash`).
6. **File hoặc module liên quan**: `src/engine/combatAnimationKinematics.ts`, `src/engine/heroAndBossSignatureVfx.ts`, `src/audio/soundEngine.ts`, `src/engine/combatHudBanners.ts`, `src/components/GameHUD.tsx`, `src/engine/GameEngine.ts`, `src/engine/wave12Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 7, Đợt 9 & Đợt 12)
8. **Rủi ro khi thay đổi**: Phải tôn trọng tuyệt đối `reducedMotion` (`0.25×` biên độ) và `reduceScreenFlash` để không gây chói hay chóng mặt.
9. **Tiêu chí nghiệm thu**: `wave12Overhaul.test.ts` (W12-1/2/3) & `wave9ZeroGcAndHud.test.ts` pass 100%, kiểm chứng trực tiếp trên Chromium 0 lỗi.
10. **Điểm sau khi triển khai và kiểm thử**: `93 / 100`

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
5. **Giải pháp đề xuất**: Hoàn tất trọn bộ **`P2-3a` → `P2-3i`**: trong Đợt 12 tiếp tục tách rời hai mô-đun thuần túy **`heroAndBossSignatureVfx.ts`** (`HeroAndBossSignatureVfxPool` + `countScenePointLights`) và **`frameBenchmarkSampler.ts`** (`FrameBenchmarkSampler`, `computeFrameBenchmarkReport`, `computeTrainingPresetComparison`), cùng các hàm thuần `stepEnemyChoreography` & `resolveDynamicMusicLayers` có 100% unit test độc lập bên cạnh các mô-đun Đợt 1–11 (`zodiacBossRegalia.ts`, `wave11RetentionSystems.ts`, `glbFetchResilience.ts`, `combatScratchBuffers.ts`, `combatHudBanners.ts`, `zodiacRealmArchitecture.ts`, `vfxPoolManager.ts`, `projectilePhysicsSystem.ts`, `spatialHashGrid.ts`).
6. **File hoặc module liên quan**: `src/engine/heroAndBossSignatureVfx.ts`, `src/engine/frameBenchmarkSampler.ts`, `src/engine/zodiacBossRegalia.ts`, `src/engine/glbFetchResilience.ts`, `src/engine/combatScratchBuffers.ts`, `src/engine/vfxPoolManager.ts`, `src/engine/projectilePhysicsSystem.ts`, `src/engine/GameEngine.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành `P2-3a` → `P2-3i`)
8. **Rủi ro khi thay đổi**: Phải bảo đảm null-safety cho `GameEngine` prototype harness (`tests/render-pacing.test.mjs`, `tests/resource-lifecycle.test.mjs`) và dọn sạch GPU khi `dispose()`.
9. **Tiêu chí nghiệm thu**: `tsc --noEmit` 0 lỗi, Vite build sạch, toàn bộ kho mã nguồn đạt **`477` test / `0` fail** & kiểm chứng live Chromium.
10. **Điểm sau khi triển khai và kiểm thử**: `94 / 100`

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
5. **Giải pháp đề xuất**: Triển khai trọn bộ Đợt 11 (`wave11RetentionSystems.ts`) và bổ sung trong Đợt 12 **`computeTrainingPresetComparison`** (`frameBenchmarkSampler.ts`) + `getTrainingMvpSkillLabel` (`GameEngine.ts`) + bảng so sánh trực quan nền đặc (0 `backdrop-blur`, `tabular-nums`, Zero-Pill) trên `GameHUD.tsx` với nút `Chốt Mẫu DPS` và tự chốt khi chuyển nhanh Preset.
6. **File hoặc module liên quan**: `src/engine/frameBenchmarkSampler.ts`, `src/components/GameHUD.tsx`, `src/engine/GameEngine.ts`, `src/data/wave11RetentionSystems.ts`, `src/engine/wave12Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 8, Đợt 11 & Đợt 12)
8. **Rủi ro khi thay đổi**: Bảng so sánh Sân Tập phải gọn gàng không che khuất tầm nhìn đánh bù nhìn và tự reset thống kê kỹ năng sạch khi người chơi bấm đặt lại DPS.
9. **Tiêu chí nghiệm thu**: `wave12Overhaul.test.ts` (W12-5) & `wave11Overhaul.test.ts` pass 100%; live Chromium (`1440×900`) xác minh trực tiếp `training-preset-comparison` & `training-capture-preset-dps` với `0` lỗi, `0` `backdrop-blur`.
10. **Điểm sau khi triển khai và kiểm thử**: `94 / 100`

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
3. **Vấn đề tồn tại**: Mọi cải tiến Đợt 14 (Cộng Hưởng 3 Tầng, Nhật Ký Hành Trình 12 Chương, 8 cụm Thánh Vật 3D Ch.5–12 0-PointLight, và Bộ Xác Thực Kết Quả Trận Đấu + chống replay) đều cần regression gate tự động toàn kho.
4. **Nguyên nhân gốc rễ**: Cần duy trì kỷ luật 0 fail / 0 lỗi console / 0 PointLights mới / 702 LC Fresh Baseline xuyên suốt mọi đợt phát triển.
5. **Giải pháp đề xuất**: Bổ sung bộ kiểm thử **`src/engine/wave14Overhaul.test.ts`** (7 bộ kiểm định `W14-1a → W14-4b` bao phủ đủ 4 trụ cột Đợt 14), kế thừa trọn bộ W1–W13 (`490` bài kiểm thử), mô phỏng 100h `tools/simulate-playtime-milestones.ts` và ESLint `firestore.rules`.
6. **File hoặc module liên quan**: `src/engine/wave14Overhaul.test.ts`, `src/engine/wave13Overhaul.test.ts`, `tests/*.test.mjs`, `src/**/*.test.ts`, `tools/benchmark-spatial-physics.ts`, `tools/simulate-playtime-milestones.ts`, `QA_TEST_REPORT.md`.
7. **Mức độ ưu tiên**: P0 / P1 / P2 (Đã hoàn thành Đợt 1–14)
8. **Rủi ro khi thay đổi**: Mọi cải tiến mới bắt buộc chạy lại full suite + `tsc --noEmit` + Vite production build để chống regression.
9. **Tiêu chí nghiệm thu**: Toàn bộ kho mã nguồn đạt **`490 bài kiểm thử | 482 PASS | 0 FAIL | 8 skip`**, `tsc --noEmit` 0 lỗi, Vite production build sạch, `npx eslint firestore.rules` = 0 lỗi, mô phỏng 100h (`702 LC` Fresh) PASS.
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

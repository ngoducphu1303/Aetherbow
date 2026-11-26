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
| **Progression, Economy & Loot** | 16, 17, 18 | 20% | 79.00 | 96.00 | 15.80 | 19.20 | **+3.40** |
| **Gameplay, Combat & Skill** | 01, 02, 03, 04 | 20% | 81.25 | 96.00 | 16.25 | 19.20 | **+2.95** |
| **Animation, VFX, SFX & Music** | 05, 06, 07, 08 | 15% | 78.75 | 96.00 | 11.81 | 14.40 | **+2.59** |
| **Enemy AI, Boss & Difficulty** | 12, 13, 19 | 10% | 80.67 | 96.00 | 8.07 | 9.60 | **+1.53** |
| **Performance & Architecture** | 22, 23 | 10% | 74.00 | 96.00 | 7.40 | 9.60 | **+2.20** |
| **Graphics, Art & World Design** | 09, 10, 15 | 5% | 80.67 | 96.00 | 4.03 | 4.80 | **+0.77** |
| **Game Feel, UI/UX & Accessibility** | 20, 21, 27 | 5% | 78.67 | 96.00 | 3.93 | 4.80 | **+0.87** |
| **Replayability & Retention** | 25, 26 | 5% | 79.00 | 93.00 | 3.95 | 4.65 | **+0.70** |
| **Physics, Level & Asset Pipeline** | 11, 14, 24 | 5% | 80.33 | 96.00 | 4.02 | 4.80 | **+0.78** |
| **Security, QA & Live Operations** | 28, 29, 30 | 5% | 74.67 | 96.00 | 3.73 | 4.80 | **+1.07** |
| **TỔNG ĐIỂM TRỌNG SỐ** | **30 / 30 tiêu chí** | **100%** | — | — | **78.99 / 100** | **95.85 / 100** | **+16.86** |

---

## 3. Đánh Giá Chi Tiết 30 Tiêu Chí (Đủ 10 Trường Bắt Buộc / Tiêu Chí)

### 01. Game Design — Thiết kế trò chơi
1. **Điểm hiện tại (Trước)**: `84 / 100`
2. **Bằng chứng đánh giá**: 4 tướng Hoàng Đạo (`heroesData.ts`), 12 chương chiến dịch (`chaptersData.ts`), hệ thống Roguelike skill draft (`skillsData.ts`), Tháp Vô Tận, Nightmare Ascension I–V (`phase5Data.ts`).
3. **Vấn đề tồn tại**: Tướng Sylvia dùng trùng hiệu ứng kỹ năng chủ động với Aurelia; thiếu mục tiêu tiêu Vàng rõ ràng ở giai đoạn sau 60h.
4. **Nguyên nhân gốc rễ**: Nội dung Ch.3–4 được mở rộng nhanh nhưng nhánh hiệu ứng riêng của Sylvia và sink Endgame chưa tách biệt hoàn toàn.
5. **Giải pháp đề xuất**: Kế thừa nền tảng Đợt 8, Đợt 13 & Đợt 15 (5 Biến Thể Phòng, 6 Phản Ứng Nguyên Tố, Phản Tiễn Né Hoàn Hảo, Va Tường Choáng, Ngã Rẽ Chiến Thuật), trong **Đợt 17** nâng tầm vòng tương tác kỹ năng cao nhất với **Phá Chiêu Phản Công Boss (`Interrupt Counter-Surge`)** và **Sảnh Luyện Boss 12 Cung Hoàng Đạo — 0 Farm (`12-Zodiac Boss Practice`)** ngay trong Sân Tập 3D, đồng thời giữ chặt mốc Fresh **`702 LC`** và không mở khóa farm tài nguyên ngoài luồng.
6. **File hoặc module liên quan**: `src/engine/wave17CombatAndPractice.ts`, `src/engine/wave15CombatSystems.ts`, `src/components/TacticalCrossroadsModal.tsx`, `src/engine/GameEngine.ts`, `src/components/GameHUD.tsx`, `src/engine/wave17Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 8, Đợt 13, Đợt 15 & Đợt 17)
8. **Rủi ro khi thay đổi**: Khóa tuyệt đối Ngã Rẽ ở Ch.1, khóa cứng 0 Vàng / 0 Ngọc / 0 XP / 0 Đồ / 0 Tiến độ Nhiệm vụ trong Luyện Boss 12 Cung và giữ nguyên Fresh `702 LC`.
9. **Tiêu chí nghiệm thu**: 4 tướng 4 `effectKind`, Fresh `702 LC` giữ nguyên, `wave17Overhaul.test.ts` (W17-1/W17-2, 5/5), `wave15Overhaul.test.ts` (5/5) & `earlyProgression.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 02. Core Gameplay Loop — Vòng lặp gameplay
1. **Điểm hiện tại (Trước)**: `82 / 100`
2. **Bằng chứng đánh giá**: Vòng lặp Chiến đấu → Nhặt đồ/Vàng → So sánh chỉ số & Bộ Trang Bị → Nâng Trang bị/Thiên Phú/Cổ Ngữ → Vượt Boss Chương → Mở khóa Ch.2–12 & Tháp Vô Tận.
3. **Vấn đề tồn tại**: Sau mốc ~45h–60h khi 8 Thiên Phú chạm 160/160 và đồ Thần Thoại đạt Lv.80, vòng lặp tiêu Vàng từng bị đứt gãy; ở màn so sánh đồ mới nhặt, người chơi chưa thấy rõ biến động chỉ số thành phần và kích hoạt/mất hiệu ứng Bộ Trang Bị.
4. **Nguyên nhân gốc rễ**: Toàn bộ Gold sink trước đây có trần cứng và khung so sánh đồ mới chỉ hiện chênh lệch LC tổng.
5. **Giải pháp đề xuất**: Kế thừa Tinh Tuý Hoàng Đạo 500 bậc, Tóm Tắt Chiến Thuật Trước Trận 1-Click & Xác Thực Kết Quả Trận Đấu (Đợt 8–16), trong **Đợt 18** nâng tầm vòng lặp rủi ro/phần thưởng trước–trong–sau trận bằng **Khế Ước Độ Khó Hoàng Đạo (`ZODIAC_VOW_CATALOG`, chọn trực tiếp trên `PreBattleBriefingModal.tsx`, hiển thị Zero-Pill trên `GameHUD.tsx`, tối đa `+67%` Vàng / `+60%` Bụi Sao trên Ch.2–12 & Tháp)** đồng bộ biên thẩm quyền `zodiacVowGoldMult` trong `runIntegrityVerifier.ts` và khóa cứng tắt hoàn toàn ở Chương 1 để bảo toàn 100% FTUE cùng mốc Fresh **`702 LC`**.
6. **File hoặc module liên quan**: `src/engine/wave18TacticalAndAtmosphere.ts`, `src/data/runIntegrityVerifier.ts`, `src/components/PreBattleBriefingModal.tsx`, `src/components/GameHUD.tsx`, `src/App.tsx`, `src/engine/wave18Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 8, 10, 11, 14, 16 & Đợt 18)
8. **Rủi ro khi thay đổi**: Khóa cứng `sanitizeZodiacVowsForRun` & `zodiacVowGoldMult = 1.0` ở Ch.1 và chế độ đặc biệt để không bao giờ ảnh hưởng Fresh `702 LC` hay FTUE.
9. **Tiêu chí nghiệm thu**: Mô phỏng 100h giữ nguyên Fresh `702 LC`, `wave18Overhaul.test.ts` (W18-1, W18-5) & `wave16Overhaul.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 03. Combat System — Hệ thống chiến đấu
1. **Điểm hiện tại (Trước)**: `83 / 100`
2. **Bằng chứng đánh giá**: Auto-aim bắn khi đứng yên, né đòn cơ động, Crit/Knockback/Chill/Shield, `combatFeelDirector.ts`, `computePowerPressure` chống vượt cấp phi lý.
3. **Vấn đề tồn tại**: Trước Đợt 7, bộ đệm phím (`CombatInputBuffer`) mới chỉ hỗ trợ 3 thao tác (`dash`/`activeSkill`/`ultimate`), bỏ sót `Phá Giáp Trảm (F)` & `Thức Tỉnh Vũ Khí (X)` và chưa tự xả sạch khi mất tiêu điểm/đổi phòng; Sylvia từng thiếu kỹ năng phòng thủ riêng.
4. **Nguyên nhân gốc rễ**: `aaaFivePillarsDirector.ts` chưa mở rộng `BufferedCombatAction` cho đủ 5 thao tác cốt lõi và `GameEngine.ts` chưa dọn đệm phím ở `onWindowBlur`/`clearCombatEntities`.
5. **Giải pháp đề xuất**: Kế thừa `'jade_bastion'`, Đệm Phím 5 Hành Động (`140ms`), Ma Trận 6 Phản Ứng, Phản Tiễn Né Hoàn Hảo & Va Tường Choáng (Đợt 7–15), trong **Đợt 17** triển khai **Phá Chiêu Phản Công Boss Zero-GC (`triggerInterruptCounterSurge` & `stepInterruptCounterSurge` trong `src/engine/wave17CombatAndPractice.ts`)**: ngay khi người chơi ngắt thành công chiêu đang niệm của Boss (bằng Phá Giáp Trảm/Khống Chế/Kỹ năng), kích hoạt cửa sổ phản công **`3.8s`** cắt **`-35%`** hồi chiêu Kỹ Năng Chủ Động, hồi **`+18`** Nộ Tuyệt Kỹ (kẹp trần `100`), cộng **`+25%`** sát thương lên Điểm Yếu Boss (`getInterruptSurgeBossDamageMult`), tung hiệu ứng **`interrupt_surge`** 0-PointLight và phát phụ đề `boss_shatter`.
6. **File hoặc module liên quan**: `src/engine/wave17CombatAndPractice.ts`, `src/engine/heroAndBossSignatureVfx.ts`, `src/engine/wave15CombatSystems.ts`, `src/engine/GameEngine.ts`, `src/components/GameHUD.tsx`, `src/engine/wave17Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 7, Đợt 13, Đợt 15 & Đợt 17)
8. **Rủi ro khi thay đổi**: Bảo đảm Zero-GC tuyệt đối trên vòng 60Hz, null-safe trong `clearCombatEntities`, 0 PointLight mới và không cộng dồn vô hạn thời gian phản công.
9. **Tiêu chí nghiệm thu**: `wave17Overhaul.test.ts` (W17-1 xác minh `-35%` Active CD, `+18` Ult kẹp `100`, `+25%` sát thương Boss, `3.8s` đếm ngược & reset sạch), `wave15Overhaul.test.ts` & toàn kho 505 test pass 100%, hiển thị thanh Zero-Pill `hud-interrupt-surge` (`tabular-nums`, `0 backdrop-blur`).
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 04. Skill System — Hệ thống kỹ năng
1. **Điểm hiện tại (Trước)**: `76 / 100`
2. **Bằng chứng đánh giá**: 40+ kỹ năng roguelike trong trận (`skillsData.ts`), kỹ năng tiến hóa & cộng hưởng, kỹ năng chủ động 4 tướng độc nhất (`phase5Data.ts`), Phá Giáp Trảm & Thức Tỉnh Vũ Khí hỗ trợ đệm phím + gán phím tự do.
3. **Vấn đề tồn tại**: Sylvia (`Kim Ngưu`) từng dùng trùng `effectKind: 'ember_nova'` với Aurelia; Phá Giáp Trảm (`F`) & Thức Tỉnh Vũ Khí (`X`) trước Đợt 7 chưa hỗ trợ đệm phím và tùy biến phím tắt.
4. **Nguyên nhân gốc rễ**: Chưa có nhánh enum `'jade_bastion'` và hai kỹ năng chiến thuật chưa nối vào `CombatKeybinds` & `CombatInputBuffer`.
5. **Giải pháp đề xuất**: Kế thừa `'jade_bastion'`, Đệm Phím 5 hành động, Dự báo Tiến Hóa Tarot & Cộng Hưởng Kỹ Năng 3 Tầng (`1.00× / 1.35× / 1.70×`, Đợt 8–14), trong **Đợt 18** bổ sung **Khuếch Đại Kỹ Năng (`Skill Draft Focus Pity` trong `src/data/skillsData.ts`)**: khi người chơi Reroll (`isReroll: true`) trong lúc đang cầm dở cặp Cộng Hưởng hoặc nhánh build chủ lực, hệ thống đảm bảo xuất hiện ít nhất 1 thẻ ghép Cộng Hưởng / Khuếch Đại kèm nhãn Zero-Pill **`skill-focus-badge`** (`getSkillDraftFocusBadge`) trên `SkillDraftModal.tsx`, đồng thời bảo toàn nguyên vẹn hợp đồng 3 làn Valkyrie (`AoE + Boss + Thứ ba`) Ch.1–12.
6. **File hoặc module liên quan**: `src/data/skillsData.ts`, `src/components/SkillDraftModal.tsx`, `src/App.tsx`, `src/engine/GameEngine.ts`, `src/engine/wave18Overhaul.test.ts`, `src/engine/wave14Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P0 / P2 (Đã hoàn thành Đợt 8, Đợt 11, Đợt 14 & Đợt 18)
8. **Rủi ro khi thay đổi**: Bảo toàn 100% hợp đồng 3 làn Valkyrie Ch.1–12, không tạo rác GC trên vòng 60Hz và không làm vỡ tỷ lệ độ hiếm thẻ.
9. **Tiêu chí nghiệm thu**: `wave18Overhaul.test.ts` (W18-1 xác minh Focus Pity qua 12 lượt seed tất định + giữ nguyên 3 làn Valkyrie) & `wave14Overhaul.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 05. Animation — Hệ thống hoạt ảnh
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: `combatAnimationKinematics.ts` (máy trạng thái 12 trạng thái chuẩn Tiêu chí 05 + blending động học Zero-GC + **biên đạo 3 pha Quái/Boss `stepEnemyChoreography`**: chuẩn bị ra đòn coil-back/nhướn vai → lao đòn, quỳ gối rung choáng/phá giáp, và tan biến xác chết có trần `<= 5` Lite / `<= 12` High), `heroKinematicMotion.ts`, hệ thống GLB `AnimationMixer` cho Tướng/Quái/Boss Chương 1–4.
3. **Vấn đề tồn tại**: Trước Đợt 12, Quái & Boss chỉ rung đơn giản khi trúng đòn mà chưa có hoạt ảnh gồng trước đòn đánh (anticipation), cúi quỳ khi bị Phá Giáp/Choáng và hiệu ứng tan biến giới hạn trần cho máy yếu; rig GLB độc bản Ch.5–12 tiếp tục ở P2-5b/P3-2.
4. **Nguyên nhân gốc rễ**: `GameEngine.ts` chưa có bộ điều khiển động học Zero-GC riêng cho pha ra đòn, pha choáng và trần xác tan biến của Quái/Boss.
5. **Giải pháp đề xuất**: Kế thừa máy trạng thái 12 trạng thái Tướng (Đợt 6), biên đạo 3 pha Quái/Boss (Đợt 12) & Khai Màn Boss 12 Cung Zero-GC (Đợt 16), trong **Đợt 18** bổ sung cặp động học chiến đấu cao cấp Zero-GC ngay trong `src/engine/combatAnimationKinematics.ts`: **Giật Chí Mạng (`applyCriticalStaggerSnap`)** và **Theo Đà Kết Liễu (`applyFinisherFollowThrough` + `stepFinisherFollowThrough`)** tích hợp mượt vào `stepCombatKinematicPose` & `GameEngine.ts` (`damageEnemy` / `killEnemy`), tuyệt đối không cấp phát GC và tự hạ biên độ chuẩn **`0.25×`** khi bật `reducedMotion`.
6. **File hoặc module liên quan**: `src/engine/combatAnimationKinematics.ts`, `src/engine/wave16BossAndPortal.ts`, `src/engine/GameEngine.ts`, `src/engine/wave18Overhaul.test.ts`, `src/engine/wave16Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 6, Đợt 12, Đợt 16 & Đợt 18; rig GLB điêu khắc Ch.5–12 ở P2-5b/P3-2)
8. **Rủi ro khi thay đổi**: Phải hoàn toàn Zero-GC trên vòng 60Hz, tôn trọng `reducedMotion = 0.25×` và không làm lệch vùng va chạm.
9. **Tiêu chí nghiệm thu**: `wave18Overhaul.test.ts` (W18-3 xác minh tỉ lệ `reducedMotion = 0.25×` & đường cong tắt dần hữu hạn), `wave16Overhaul.test.ts` & `wave6AnimationAndBoss.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 06. VFX — Hiệu ứng hình ảnh
1. **Điểm hiện tại (Trước)**: `76 / 100`
2. **Bằng chứng đánh giá**: `zodiacLightingVfxDirector.ts`, `heroAndBossSignatureVfx.ts` (**Pool VFX Tuyệt Kỹ 4 Tướng, Vòng Hào Quang Boss Pha II/III & 3 Hiệu Ứng Va Chạm Chiến Thuật Đợt 16 — 0 PointLights**), `vfxPoolManager.ts` (`GroundTelegraphVisualPool`, `LootOrbVisualCache`, `VfxFrameBudgetCache`), vòng telegraph mù màu (`colorblindTelegraphs.ts`).
3. **Vấn đề tồn tại**: Trước Đợt 16, ba pha chiến đấu đỉnh cao là **Phản Tiễn Né Hoàn Hảo**, **Va Tường Choáng** và **Bùng Nổ Boss Pha III** chưa có VFX chữ ký riêng tái dùng pool 0-PointLight.
4. **Nguyên nhân gốc rễ**: `HeroAndBossSignatureVfxPool` trước Đợt 16 mới phục vụ 4 tuyệt kỹ tướng và vòng hào quang cổ ngữ nền, chưa có nhánh `spawnTacticalImpactVfx`.
5. **Giải pháp đề xuất**: Kế thừa `HeroAndBossSignatureVfxPool` & 4 VFX chiến thuật Đợt 16–17 (`riposte_lance`, `wall_slam_burst`, `boss_phase3_eruption`, `interrupt_surge`), trong **Đợt 18** mở rộng nhánh thứ 5 **`imprint_resonance`** cùng bảng màu 4 hệ Ấn Tinh có chế độ Mù Màu (`getImprintAspectVfxColor`) tái dùng trọn vẹn hình học pool, nối vào nhịp Chí Mạng trang bị Ấn Tinh Thần Thoại (`1.6s` cooldown chống rối mắt), giữ chặt **0 PointLights**, trần **`<= 3` slot Lite** và giải phóng GPU sạch 100%.
6. **File hoặc module liên quan**: `src/engine/heroAndBossSignatureVfx.ts`, `src/engine/zodiacLightingVfxDirector.ts`, `src/engine/vfxPoolManager.ts`, `src/engine/GameEngine.ts`, `src/engine/wave18Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P0 / P2 (Đã hoàn thành Đợt 7, Đợt 12, Đợt 16, Đợt 17 & Đợt 18)
8. **Rủi ro khi thay đổi**: Tuyệt đối không tạo bất kỳ `PointLight` nào mới, tuân thủ trần slot Lite (`<= 3`) và thu hồi slot sạch ở `releaseAll()`/`dispose()`.
9. **Tiêu chí nghiệm thu**: `wave18Overhaul.test.ts` (W18-3 xác minh `imprint_resonance`, `countScenePointLights === 0`, Lite `<= 3` slot) & `wave16Overhaul.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 07. SFX — Hiệu ứng âm thanh
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: `src/audio/sfxPriorityMixer.ts` (bộ trộn ưu tiên voice, giới hạn máy yếu, chống clipping, suy giảm theo khoảng cách 3D, **5 danh mục âm ưu tiên mới Đợt 12**: `boss_telegraph_ping`, `execution_finisher_drop`, `loot_rarity_epic`, `loot_rarity_legendary`, `loot_rarity_mythic`) và `src/audio/soundEngine.ts` (Web Audio thủ tục Zero-GC).
3. **Vấn đề tồn tại**: Trước Đợt 12, tiếng báo chiêu Boss, tiếng kết liễu Boss/Tinh Anh và tiếng chuông phân bậc độ hiếm trang bị rơi (`Sử Thi` / `Huyền Thoại` / `Thần Thoại`) chưa tách kênh ưu tiên riêng trong `SfxPriorityMixer`.
4. **Nguyên nhân gốc rễ**: `SfxPriorityMixer` chưa khai báo danh mục & ưu tiên riêng cho tín hiệu Boss, âm trầm kết liễu và chuông độ hiếm rơi đồ.
5. **Giải pháp đề xuất**: Kế thừa SFX ưu tiên Đợt 12–15 (`wall_slam_impact`, `boss_weakpoint_shatter`, Lọc Trầm Né Đòn `820 Hz`/`2400 Hz`), trong **Đợt 18** bổ sung **Bậc Cao Độ Chuỗi Hạ Gục Ngũ Cung (`computeComboPitchStep`: `1.00..1.24` đơn điệu trong `playEnemyDefeated`)** và 2 danh mục ưu tiên mới trong `SfxPriorityMixer`: **`ricochet_ping` (ưu tiên 72)** cho tiếng bật tường/trụ mũi tên cộng hưởng (`playRicochetPing`) và **`vow_seal_chime` (ưu tiên 84)** cho tiếng ấn định Khế Ước Hoàng Đạo (`playVowSealChime`).
6. **File hoặc module liên quan**: `src/audio/sfxPriorityMixer.ts`, `src/audio/soundEngine.ts`, `src/audio/aaaAudioMix.ts`, `src/engine/GameEngine.ts`, `src/engine/wave18Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 5, Đợt 12, Đợt 15 & Đợt 18)
8. **Rủi ro khi thay đổi**: Kiểm soát chặt số voice đồng thời ở `lowEndMode` và kẹp trần cao độ `1.24×` tránh chói tai ở chuỗi combo dài.
9. **Tiêu chí nghiệm thu**: `wave18Overhaul.test.ts` (W18-4 xác minh `computeComboPitchStep`, `ricochet_ping` & `vow_seal_chime`), `wave15Overhaul.test.ts` & toàn bộ `src/audio/*.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 08. Music Design — Thiết kế nhạc nền
1. **Điểm hiện tại (Trước)**: `79 / 100`
2. **Bằng chứng đánh giá**: Trọn bộ 12 chủ đề nhạc Hoàng Đạo độc bản Ch.1–12 (`zodiacMusicDirector.ts`), crossfade mượt (`bgmGain`), lớp nhạc động theo Pha Boss/HP thấp/Combo (`resolveDynamicMusicLayers`), và **12 khúc kết Chiến Thắng / Thất Bại theo điệu thức riêng từng Chương (`resolveChapterEndingCadence`, Đợt 15)**.
3. **Vấn đề tồn tại**: Trước Đợt 15, mọi chương dùng chung một khúc nhạc ngắn khi thắng/thua chưa phản ánh điệu thức Hoàng Đạo của chương vừa chiến đấu.
4. **Nguyên nhân gốc rễ**: `soundEngine.ts` dùng chuỗi tần số cố định cho `playVictory` và chưa có hàm `playDefeatCadence` rút trích từ âm giai chương hiện tại.
5. **Giải pháp đề xuất**: Kế thừa 12 chủ đề nhạc Hoàng Đạo (Đợt 3), lớp nhạc động `extraOscillatorCap <= 1` (Đợt 12) và 12 khúc kết Chiến Thắng/Thất Bại (Đợt 15), trong **Đợt 18** hoàn thiện mạch chuyển hồi cao trào bằng **Khúc Chuyển Pha Boss 12 Điệu Thức (`resolveBossPhaseTransitionStinger` & `playBossPhaseTransitionStinger`)**: sinh cầu nối 3 nốt đặc trưng theo âm giai từng Chương cho Pha II & Pha III (đỉnh cao Pha III luôn vượt Pha II), tự khóa **`maxOscillators = 1`** và dùng sóng `triangle` êm CPU trên `lowEndMode`.
6. **File hoặc module liên quan**: `src/audio/zodiacMusicDirector.ts`, `src/audio/soundEngine.ts`, `src/engine/wave18Overhaul.test.ts`, `tests/zodiac-music-director.test.mjs`, `src/engine/GameEngine.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 3, Đợt 12, Đợt 15 & Đợt 18)
8. **Rủi ro khi thay đổi**: Khóa cứng ngân sách dao động trên `lowEndMode` và chỉ kích hoạt nhánh modal khi bật `adaptiveChapterMusic`.
9. **Tiêu chí nghiệm thu**: `wave18Overhaul.test.ts` (W18-4 xác minh đủ 12/12 chương Pha II/III + `maxOscillators = 1` ở `lowEndMode`), `wave15Overhaul.test.ts` & `zodiac-music-director.test.mjs` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 09. Graphic Fidelity — Chất lượng đồ họa
1. **Điểm hiện tại (Trước)**: `82 / 100`
2. **Bằng chứng đánh giá**: Three.js PBR + ACES Filmic tone mapping, bộ mô hình 3D High/Lite 100% đối cặp (`63/63` cặp, 0 cảnh báo) cho Ch.1–4, hệ thống cánh/thú cưỡi/hào quang 3D, 8 cụm kiến trúc đền thờ 3D đa tầng Ch.5–12 (`zodiacRealmArchitecture.ts`), và trong Đợt 11 bổ sung **trọn bộ Giáp Trụ, Vương Miện/Mũ Chiến & Vũ Khí 3D Thủ Tục Độc Bản cho cả 8 Boss Hoàng Đạo Chương 5–12** (`zodiacBossRegalia.ts`).
3. **Vấn đề tồn tại**: Trước Đợt 11, 8 Boss Hoàng Đạo Chương 5–12 chưa có giáp trụ, vương miện và vũ khí 3D đặc trưng riêng biệt trong khung cảnh chiến đấu; mô hình GLB điêu khắc riêng Ch.5–12 tiếp tục ở lộ trình mỹ thuật dài hạn P2-5b/P3-2.
4. **Nguyên nhân gốc rễ**: `createEnemy` ở Ch.5–12 trước đây dùng hình khối chung chưa ghép lớp giáp ngực, giáp vai, vương miện biểu tượng cung Hoàng Đạo và vũ khí đặc trưng.
5. **Giải pháp đề xuất**: Kế thừa 8 bộ Giáp/Vương Miện/Vũ Khí Boss Ch.5–12, Phù Điêu, Thánh Vật & Cổng Tinh Đạo 12 Chương (Đợt 11–16), trong **Đợt 18** dựng **Vành Chân Trời Hoàng Đạo 12 Chương (`buildZodiacArenaAtmosphereBand` trong `src/engine/wave18TacticalAndAtmosphere.ts`)** bao quanh rìa đấu trường trên trọn bộ **12/12 Chương**: vòng thiên hà `y = 0.035` (`depthWrite: false`, `polygonOffset: true`) + 4 trụ mốc góc tiếp đất có bóng tiếp xúc, tương phản vật liệu PBR **`stoneRoughness: 0.86` vs `goldRoughness: 0.24` (`Δ = 0.62 >= 0.25`)**, **0 PointLights**, Lite giảm đỉnh nghiêm ngặt, xoay Zero-GC (`reducedMotion = 0.25×`) và giải phóng GPU đầy đủ (`disposeZodiacArenaAtmosphereBand`).
6. **File hoặc module liên quan**: `src/engine/wave18TacticalAndAtmosphere.ts`, `src/engine/wave16BossAndPortal.ts`, `src/engine/zodiacRealmArchitecture.ts`, `src/engine/GameEngine.ts`, `src/engine/wave18Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 7, 11, 13, 14, 16 & Đợt 18; GLB điêu khắc Ch.5–12 ở P2-5b/P3-2)
8. **Rủi ro khi thay đổi**: Tuyệt đối giữ **0 PointLights mới**, Lite luôn ít đỉnh hơn High và dọn sạch GPU khi đổi phòng/đóng engine.
9. **Tiêu chí nghiệm thu**: `wave18Overhaul.test.ts` (W18-3 xác minh trọn bộ 12/12 chương `pointLightCount === 0`, `Δroughness >= 0.25`, `liteVerts < highVerts`, `reducedMotion = 0.25×`, dọn GPU sạch) & `wave16Overhaul.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 10. Art Direction — Định hướng nghệ thuật
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: Bảng màu Hoàng Đạo 12 chương nhất quán 60-30-10 (`ART_STYLE_GUIDE.md`), 4 đấu trường & Boss GLB Ch.1–4, 8 cụm kiến trúc đền thờ + phù điêu sàn đấu + thánh vật kể chuyện + giáp trụ Boss 3D Ch.5–12, **Cổng Tinh Đạo 3D Cổng Bắc đồng bộ cả 12 Chương** và ngôn ngữ UI Celestial Gold Zero-Pill (`0 backdrop-blur`).
3. **Vấn đề tồn tại**: Trước Đợt 16, điểm dẫn mắt chiến thuật ở Cổng Bắc chuyển phòng giữa 12 chương chưa có công trình khung cổng 3D mang sắc thái từng cung Hoàng Đạo và bảng khai màn Boss / phụ đề âm thanh chưa đồng bộ cùng hệ ngôn ngữ đồ họa Zero-Pill.
4. **Nguyên nhân gốc rễ**: Cổng chuyển phòng trước đây chỉ dựa vào vòng sáng sàn đơn lẻ chưa có khung vòm kiến trúc PBR 12 cung tương đồng với đền thờ.
5. **Giải pháp đề xuất**: Kết hợp chuẩn `ART_STYLE_GUIDE.md` Mục 2b–2g, trong **Đợt 18** đồng bộ hóa **Mục 2h**: **Vành Chân Trời Hoàng Đạo 12 Chương** (`ZODIAC_ATMOSPHERE_PALETTES`, tương phản PBR `0.86` vs `0.24`, **0 PointLights**), **VFX `imprint_resonance`** 4 hệ Ấn Tinh có chế độ Mù Màu, cùng hệ ngôn ngữ Zero-Pill nền đặc (`0 backdrop-blur`, `tabular-nums`, `0 animate-pulse`) cho Khế Ước Hoàng Đạo (`◆/⚡/▲`), Huy Hiệu Khuếch Đại Kỹ Năng, 4 Hồ Sơ Tiếp Cận 1-Click & Trung Tâm Sẵn Sàng Tài Nguyên 12 Chương.
6. **File hoặc module liên quan**: `ART_STYLE_GUIDE.md`, `src/engine/wave18TacticalAndAtmosphere.ts`, `src/engine/heroAndBossSignatureVfx.ts`, `src/components/PreBattleBriefingModal.tsx`, `src/components/SkillDraftModal.tsx`, `src/components/SettingsModal.tsx`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 7, 11, 13, 15, 16 & Đợt 18)
8. **Rủi ro khi thay đổi**: Tuyệt đối giữ **0 PointLights mới**, **0 `backdrop-blur`** đè canvas WebGL 3D và nhất quán 100% chuẩn Zero-Pill.
9. **Tiêu chí nghiệm thu**: `wave18Overhaul.test.ts` (W18-1 → W18-5) pass 100%, đồng bộ hoàn toàn với `ART_STYLE_GUIDE.md` Mục 2h.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 11. Physics System — Hệ thống vật lý
1. **Điểm hiện tại (Trước)**: `82 / 100`
2. **Bằng chứng đánh giá**: `fixedTimestep.ts`, va chạm tường/trụ, đẩy lùi an toàn (`clampKnockbackInsideArena`), lưới `SpatialHashGrid` Zero-GC, sóng xung kích vỡ trụ (`evaluatePillarShatterShockwave`, Đợt 13) và **Vật Lý Va Tường Choáng Zero-GC (`evaluateWallSlamImpact`, Đợt 15)**.
3. **Vấn đề tồn tại**: Trước Đợt 15, đẩy lùi kẻ địch vào tường đấu trường hoặc trụ đá nguyên vẹn chỉ kẹp vị trí lại mà chưa có phản hồi va chạm vật lý (choáng, sát thương va đập, sóng xung kích).
4. **Nguyên nhân gốc rễ**: Vòng đẩy lùi trong `GameEngine.ts` chưa kiểm tra tiếp xúc biên tường/trụ đá nguyên vẹn bằng hàm tính va chạm thuần Zero-GC.
5. **Giải pháp đề xuất**: Kế thừa `SpatialHashGrid`, `projectilePhysicsSystem.ts`, sóng vỡ trụ & Va Tường Choáng Zero-GC (Đợt 3–15), trong **Đợt 18** hoàn thiện tương tác vật lý đạn với **Phản Bật Mũi Tên Cộng Hưởng (`computeRicochetResonanceMult`: `0 lần → 1.00×`, `1 lần → 1.15×`, `2+ lần → 1.30×`)** thưởng trực tiếp cho các cú bắn nảy tường/trụ, kết hợp **Khóa Chống Trúng Lặp Zero-GC (`canRegisterProjectileEnemyHit`, cửa sổ `0.12s`)** chống đếm sát thương trùng khung hình và gắn âm thanh `playRicochetPing` theo số lần nảy.
6. **File hoặc module liên quan**: `src/engine/wave18TacticalAndAtmosphere.ts`, `src/engine/wave15CombatSystems.ts`, `src/engine/spatialHashGrid.ts`, `src/engine/projectilePhysicsSystem.ts`, `src/engine/GameEngine.ts`, `src/engine/wave18Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 3–4, Đợt 13, Đợt 15 & Đợt 18)
8. **Rủi ro khi thay đổi**: Tuyệt đối 0 cấp phát đối tượng mới trên vòng 60Hz và kẹp trần phản bật ở `1.30×` chống tràn sát thương vô hạn.
9. **Tiêu chí nghiệm thu**: `wave18Overhaul.test.ts` (W18-2 xác minh `1.00× / 1.15× / 1.30×` & khóa trùng lặp `0.12s`), `wave15Overhaul.test.ts` & benchmark `49,332/49,332` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 12. Enemy AI — Trí tuệ nhân tạo quái vật
1. **Điểm hiện tại (Trước)**: `78 / 100`
2. **Bằng chứng đánh giá**: `EnemySquadDirector` (`2–5` token tấn công, `≤ 3` ở Lite), `aaaEnemyCombatEngine.ts` (7 trạng thái AI + che chắn tiên phong), 2 Đặc Tính Tinh Anh chiến thuật (`vanguard_link` & `quake_pulse`), và **3 Học Thuyết Đội Hình Quái (`resolveFormationDoctrineProfile`: `pincer_flank`, `balanced_line`, `shield_wall`, Đợt 15)**.
3. **Vấn đề tồn tại**: Trước Đợt 15, đội hình xuất trận của quái giữa các phòng chưa phân hóa rõ theo học thuyết chiến thuật gắn với lựa chọn đường đi của người chơi.
4. **Nguyên nhân gốc rễ**: `GameEngine.ts` sinh quái theo bố cục phân bố đồng nhất thay vì áp dụng học thuyết bọc sườn / tuyến cân bằng / tường khiên theo phòng đã chọn.
5. **Giải pháp đề xuất**: Kế thừa `EnemySquadDirector`, AI 7 trạng thái, 2 Đặc Tính Tinh Anh & 3 Học Thuyết Đội Hình (Đợt 2–15), trong **Đợt 18** triển khai **AI Liên Kích Đội Hình Zero-GC (`evaluateSquadComboSynergy` & `squadComboScratch` trong `src/engine/wave18TacticalAndAtmosphere.ts`)**: trung tính hoàn toàn ở Chương 1 để bảo vệ FTUE, từ Chương 2+ tự động phối hợp giữa các vai trò trong phòng (**Tiên Phong che chắn giảm `14%` sát thương cho Xạ Thủ/Pháp Sư**, **Cánh Tốc tăng tốc bọc sườn `1.12×` khi có Tiên Phong**, và **Pháp Sư thúc nhịp tấn công toàn đội `0.90×` ở High / `0.94×` êm dịu ở Lite**).
6. **File hoặc module liên quan**: `src/engine/wave18TacticalAndAtmosphere.ts`, `src/engine/wave15CombatSystems.ts`, `src/engine/aaaEnemyCombatEngine.ts`, `src/engine/enemySquadDirector.ts`, `src/engine/GameEngine.ts`, `src/engine/wave18Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 2, 8, 13, 15 & Đợt 18)
8. **Rủi ro khi thay đổi**: Tuyệt đối Zero-GC trên vòng 60Hz, không vượt trần token tấn công Lite (`≤ 3`) và giữ Ch.1 hoàn toàn trung tính.
9. **Tiêu chí nghiệm thu**: `wave18Overhaul.test.ts` (W18-2 xác minh Zero-GC trả đúng `scratch`, Ch.1 trung tính, Ch.2+ che chắn/bọc sườn/thúc nhịp High vs Lite) & `enemySquadDirector.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 13. Boss Design — Thiết kế boss
1. **Điểm hiện tại (Trước)**: `84 / 100`
2. **Bằng chứng đánh giá**: Boss Ch.1–4 & Ch.10–12 đủ 3 giai đoạn, 12 danh hiệu & mẹo khắc chế Hoàng Đạo, 8 bộ giáp/vương miện/vũ khí 3D Boss Ch.5–12, cộng thêm trong **Đợt 15**: tương tác **Phản Tiễn `+45%` bào Khiên Phá Giáp Boss**, **miễn choáng Va Tường (chỉ tích lũy Stagger)** và **Hợp Âm Vỡ Điểm Yếu / Phá Giáp Boss (`boss_weakpoint_shatter`, ưu tiên 99)**.
3. **Vấn đề tồn tại**: Trước Đợt 15, cú Né Hoàn Hảo trước chiêu Boss chưa tạo lợi thế Phá Giáp rõ nét và pha vỡ điểm yếu / phá giáp Boss thiếu tín hiệu âm thanh ưu tiên tối cao riêng biệt.
4. **Nguyên nhân gốc rễ**: Mũi tên hậu né đòn chưa nhân hệ số bào Khiên Phá Giáp Boss và `SfxPriorityMixer` chưa có danh mục ưu tiên 99 riêng cho vỡ điểm yếu Boss.
5. **Giải pháp đề xuất**: Kế thừa Pha III Ch.1–4, 8 bộ phục trang 3D Ch.5–12, Phản Tiễn `+45%` bào Khiên, Bảng Khai Màn Boss 12 Cung & VFX Pha III (Đợt 6–16), trong **Đợt 17** hoàn thiện chiều sâu đối kháng & tập luyện Boss qua **Phá Chiêu Phản Công Boss (`+25%` sát thương Điểm Yếu trong `3.8s`, `-35%` hồi chiêu, `+18` Nộ, VFX `interrupt_surge` 0-PointLight)** và **Chế Độ Luyện Boss 12 Cung Trong Sân Tập 3D (`startBossPractice`)**: cho phép gọi trực tiếp bất kỳ Boss Hoàng Đạo nào đã mở khóa (`1..min(12, max(1, highestChapterCleared + 1))`) với đầy đủ biên đạo Pha I→II→III, Bộ Phận Boss, Phục Trang 3D, hồi máu tập luyện bất tử và thống kê DPS / Số lần Phá Chiêu / Né Hoàn Hảo theo thời gian thực (**khóa cứng 0 Farm**).
6. **File hoặc module liên quan**: `src/engine/wave17CombatAndPractice.ts`, `src/engine/wave16BossAndPortal.ts`, `src/engine/heroAndBossSignatureVfx.ts`, `src/components/GameHUD.tsx`, `src/engine/GameEngine.ts`, `src/engine/wave17Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P0 / P1 / P2 (Đã hoàn thành Đợt 6, 9, 11, 15, 16 & Đợt 17)
8. **Rủi ro khi thay đổi**: Khóa tuyệt đối không rơi vật phẩm / không cộng thưởng / không tính tiến độ nhiệm vụ trong Luyện Boss và giải phóng sạch tài nguyên GPU khi quay về Hình Nộm.
9. **Tiêu chí nghiệm thu**: `wave17Overhaul.test.ts` (W17-1/W17-2), `wave16Overhaul.test.ts` (W16-1/W16-2) & `boss-patterns.test.mjs` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 14. Level Design — Thiết kế màn chơi
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: 12 chương × 12 phòng, 4 cơ quan sàn đấu, 5 Biến Thể Phòng Chiến Thuật (Đợt 13), và **Ngã Rẽ Chiến Thuật Giữa Chương (`Tactical Room Crossroads`, Đợt 15)** tại Cổng Bắc sau Ải 4 & Ải 8 trên Ch.2–12.
3. **Vấn đề tồn tại**: Trước Đợt 15, mạch tiến trình qua 12 phòng trong mỗi chương diễn ra tuyến tính 1 đường duy nhất, thiếu quyết định rẽ nhánh rủi ro/phần thưởng giữa chặng.
4. **Nguyên nhân gốc rễ**: Bước chuyển qua Cổng Bắc trong `GameEngine.ts` đi thẳng sang phòng kế tiếp thay vì mở giao lộ chọn nhánh chiến thuật tại các cột mốc giữa chương.
5. **Giải pháp đề xuất**: Kế thừa xoay vòng địa hình, 5 Biến Thể Phòng & Ngã Rẽ Chiến Thuật Ch.2–12 (Đợt 5–15), trong **Đợt 18** kết nối mạch màn chơi từ tiền chiến vào từng phòng qua **Khế Ước Độ Khó Hoàng Đạo (Ch.2–12 & Tháp)** kết hợp **Vành Chân Trời Hoàng Đạo 12 Chương (`buildZodiacArenaAtmosphereBand`)** đánh dấu rõ ranh giới địa hình 4 góc + vòng thiên hà ngoại vi (`0 PointLights`), đồng thời nâng giá trị vị trí tường/trụ trong bố cục phòng nhờ cơ chế **Phản Bật Mũi Tên Cộng Hưởng (`+15% / +30%`)**.
6. **File hoặc module liên quan**: `src/engine/wave18TacticalAndAtmosphere.ts`, `src/engine/wave15CombatSystems.ts`, `src/components/TacticalCrossroadsModal.tsx`, `src/engine/tacticalRoomModifiers.ts`, `src/engine/GameEngine.ts`, `src/engine/wave18Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 5, Đợt 13, Đợt 15 & Đợt 18; GLB điêu khắc Ch.5–12 ở P2-5b/P3-2)
8. **Rủi ro khi thay đổi**: Bảo toàn tuyệt đối Ch.1 FTUE (0 Ngã Rẽ, 0 Khế Ước), 0 PointLights mới và 4 trụ mốc đặt ngoài hoàn toàn vùng đi lại.
9. **Tiêu chí nghiệm thu**: `wave18Overhaul.test.ts` (W18-1, W18-2, W18-3) & `wave15Overhaul.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 15. World Building — Xây dựng thế giới
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: Vũ trụ 12 Cung Hoàng Đạo gắn kết trực tiếp giữa 4 Tướng, Bộ Sưu Tập Ch.1–4, Boss Codex, Chòm Sao, Thánh Tích, Biên Niên Sử 12 Chương (`zodiacWorldLore.ts`) và 8 cụm kiến trúc đền thờ 3D độc bản Ch.5–12 (`zodiacRealmArchitecture.ts`).
3. **Vấn đề tồn tại**: Trước Đợt 5–7, Boss Codex thiếu biên niên sử đầy đủ và khung cảnh 3D Ch.5–12 chưa phản ánh trực tiếp kiến trúc biểu tượng của từng cung.
4. **Nguyên nhân gốc rễ**: Chưa gắn biên niên sử 12 chương vào Sổ Tay và chưa có bộ công trình kể chuyện môi trường Ch.5–12.
5. **Giải pháp đề xuất**: Kế thừa `zodiacWorldLore.ts`, 8 cụm kiến trúc, phù điêu, Thánh Vật 3D, Nhật Ký Hành Trình 12 Chương & Cổng Tinh Đạo 12 Cung (Đợt 5–16), trong **Đợt 18** bao phủ trọn bộ **12/12 Đấu Trường Hoàng Đạo** bằng **Vành Chân Trời Hoàng Đạo (`ZODIAC_ATMOSPHERE_PALETTES` — 12 sắc thái tinh vân riêng từ Sư Tử đến Song Ngư, 0 PointLights)** kết hợp **Khúc Chuyển Pha Boss 12 Điệu Thức** và **3 Khế Ước Thử Thách Hoàng Đạo (`Huyết Chiến` · `Tốc Biến` · `Khổ Hạnh`)**, gắn kết chặt bản sắc thế giới vào cả thị giác, âm nhạc lẫn cơ chế rủi ro/phần thưởng.
6. **File hoặc module liên quan**: `src/engine/wave18TacticalAndAtmosphere.ts`, `src/audio/zodiacMusicDirector.ts`, `src/engine/wave16BossAndPortal.ts`, `src/data/zodiacWorldLore.ts`, `src/engine/wave18Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 5, 7, 13, 14, 16 & Đợt 18)
8. **Rủi ro khi thay đổi**: Bảo đảm cả 12/12 cung Hoàng Đạo có bảng màu Vành Chân Trời & điệu thức Boss đồng nhất với `ART_STYLE_GUIDE.md`.
9. **Tiêu chí nghiệm thu**: `wave18Overhaul.test.ts` (W18-3/W18-4), `wave16Overhaul.test.ts` & `zodiacWorldLore.test.ts` pass 100% cho cả 12/12 cung.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 16. Progression System — Hệ thống tăng tiến
1. **Điểm hiện tại (Trước)**: `82 / 100`
2. **Bằng chứng đánh giá**: `getEarlyProgressionPolicy`, tài khoản mới bắt đầu ở `702 LC`, lộ trình 30 ngày F2P, Tinh Tuý Hoàng Đạo 500 bậc, Nhật Ký Hành Trình 12 Chương (36 mốc), và **Chẩn Đoán Nút Thắt Tăng Tiến + Định Tuyến 1-Click (`PreBattleBriefingModal.tsx`, Đợt 16)**.
3. **Vấn đề tồn tại**: Trước Đợt 16, khi người chơi đứng trước chương mới có mức Lực Chiến khuyến nghị cao hơn hiện tại, chưa có bảng tóm tắt chỉ rõ đúng hạng mục đang tụt hậu nhất (Trang Bị / Thiên Phú / Cổ Ngữ / Anh Hùng) cùng nút nhảy thẳng tới màn hình nâng cấp tương ứng.
4. **Nguyên nhân gốc rễ**: Sảnh chính mới hiển thị số LC tổng và LC đề xuất mà chưa tính toán chỉ số hụt theo từng trục sức mạnh trước khi vào trận.
5. **Giải pháp đề xuất**: Kế thừa Tinh Tuý Hoàng Đạo 500 bậc, Nhật Ký Hành Trình 12 Chương & Tóm Tắt Chiến Thuật Trước Trận (Đợt 1–16), trong **Đợt 17** tích hợp **Cố Vấn Đầu Tư Lực Chiến Thông Minh (`computeSmartUpgradeRoi` trong `src/data/wave17EndgameAndBackup.ts`)** chạy mô phỏng chỉ-đọc `computePlayerStats` để xếp hạng Top 3 khoản đầu tư sinh nhiều **`+LC / 1.000 Vàng`** nhất (Cường Hóa Trang Bị · Thiên Phú · Tinh Luyện Cổ Ngữ · Thức Tỉnh Ấn Tinh Thần Thoại) kèm nút nhảy 1-chạm trực tiếp ngay trong `PreBattleBriefingModal.tsx`, giữ nguyên tuyệt đối Fresh Account **`702 LC`**.
6. **File hoặc module liên quan**: `src/data/wave17EndgameAndBackup.ts`, `src/data/wave16TacticalAndLiveOps.ts`, `src/components/PreBattleBriefingModal.tsx`, `src/App.tsx`, `src/engine/wave17Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P0 / P1 / P2 (Đã hoàn thành Đợt 1–16 & Đợt 17)
8. **Rủi ro khi thay đổi**: Tuyệt đối chỉ đọc (không biến đổi save gốc, 0 hiệu ứng phụ lên Fresh `702 LC`) và giữ mở khóa mượt cho Ch.1 FTUE.
9. **Tiêu chí nghiệm thu**: Tài khoản mới giữ nguyên `702 LC`, `wave17Overhaul.test.ts` (W17-4 xác minh xếp hạng ROI giảm dần + 0 biến đổi save gốc) & `tools/simulate-playtime-milestones.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 17. Economy System — Hệ thống kinh tế
1. **Điểm hiện tại (Trước)**: `72 / 100`
2. **Bằng chứng đánh giá**: Các nguồn thu/chi Vàng, Kim Cương, Bụi Sao, Lõi Tinh Linh đã có nhưng chưa có mô phỏng 8 mốc thời lượng (`5m → 100h`) để kiểm chứng lạm phát.
3. **Vấn đề tồn tại**: Khi xây dựng bộ mô phỏng thực tế lần đầu, phát hiện lạm phát tồn kho Vàng ở mốc `100h`: `Gold Sink Ratio = 53.5%` (dư ~6.24M Vàng chưa có chỗ tiêu).
4. **Nguyên nhân gốc rễ**: Không có Gold Sink mở rộng theo hàm mũ sau khi 8 Thiên Phú chạm tổng Lv.160 và đồ Thần Thoại chạm Lv.80.
5. **Giải pháp đề xuất**: Kế thừa Tinh Tuý Hoàng Đạo 500 bậc, Tinh Luyện Cổ Ngữ/Tôi Luyện Dòng Phụ & Chuyển Hóa Đồ Bộ (Đợt 13–15), trong **Đợt 17** bổ sung bể tiêu Endgame đa tài nguyên **Thức Tỉnh Ấn Tinh Thần Thoại (`+1 → +5`, `src/data/wave17EndgameAndBackup.ts`)** khóa chặt sau Ch.4 (`highestChapterCleared >= 4`) & chỉ áp dụng cho đồ `MYTHIC`, tiêu thụ đồng bộ **Vàng + Bụi Sao + Mảnh Rèn + Lõi Tinh Linh** (`64,200g / 4,390d / 202s / 161c` mỗi món; `385,200g / 26,340d / 1,212s / 966c` cho bộ 6 món) và kiểm toán trực tiếp trong `tools/simulate-playtime-milestones.ts`.
6. **File hoặc module liên quan**: `src/data/wave17EndgameAndBackup.ts`, `src/data/gearData.ts`, `src/data/saveIntegrity.ts`, `src/components/RelicForgeModal.tsx`, `tools/simulate-playtime-milestones.ts`, `src/engine/wave17Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 1–4, Đợt 13, Đợt 15 & Đợt 17)
8. **Rủi ro khi thay đổi**: Khóa cứng trước Ch.5 & trên mọi phẩm chất dưới Thần Thoại để bảo toàn tuyệt đối Fresh `702 LC` và không tạo lỗ hổng chênh lệch giá (arbitrage).
9. **Tiêu chí nghiệm thu**: `tools/simulate-playtime-milestones.ts` xác minh Fresh `702 LC`, bể tiêu Đợt 17 **`385,200 Vàng · 26,340 Bụi Sao · 1,212 Mảnh Rèn · 966 Lõi Tinh Linh`**, tổng Endgame Gold Sink **`1,764,240,543 Vàng` (`13,115.7%` thu nhập 100h)**, `flashDealArbitrageDetected: false`, `wave17Overhaul.test.ts` (W17-3) pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 18. Loot System — Hệ thống vật phẩm
1. **Điểm hiện tại (Trước)**: `83 / 100`
2. **Bằng chứng đánh giá**: 5 bậc phẩm chất, 5 Bộ Trang Bị (Set Bonus 2/3 món), Pity chống xui, phân giải đồ thừa ra Mảnh Rèn mục tiêu, Bộ Lọc Tự Động Phân Giải, so sánh chi tiết chỉ số & Bộ, Chuyển Hóa Đồ Bộ Tất Định (Đợt 15), và trong **Đợt 17** hoàn thiện đỉnh cao trang bị Endgame với **Thức Tỉnh Ấn Tinh Thần Thoại (`+1 → +5`)** gồm 4 Ấn Tinh Hoàng Đạo tất định (`solar_sunder`, `astral_pierce`, `jade_aegis`, `lunar_execution`).
3. **Vấn đề tồn tại**: Trước Đợt 17, trang bị Thần Thoại (`MYTHIC`) sau khi đạt Lv.80 & chuyển đúng Bộ chưa có trục phát triển tinh khắc Endgame riêng tạo điểm khác biệt build theo 4 hướng tấn công/xuyên giáp/phòng thủ/kết liễu.
4. **Nguyên nhân gốc rễ**: `GearInstance` chưa có trường `mythicImprint` tách biệt và `RelicForgeModal.tsx` chưa có phân khu `Ấn Tinh` dành riêng cho đồ Thần Thoại sau Ch.4.
5. **Giải pháp đề xuất**: Triển khai **`src/data/wave17EndgameAndBackup.ts`** (`MYTHIC_IMPRINT_ASPECTS`, `previewMythicImprint`, `applyMythicImprint`), tích hợp `item.mythicImprint` vào **`getGearPowerScore` (`tier * 115`) & `computePlayerStats`** trong `gearData.ts`, mở tab thứ 7 **`Ấn Tinh`** (`forge-tab-imprint`) trong `RelicForgeModal.tsx`, và lọc trắng/kẹp biên `tier 1..5` trong `saveIntegrity.ts`.
6. **File hoặc module liên quan**: `src/data/wave17EndgameAndBackup.ts`, `src/data/gearData.ts`, `src/data/saveIntegrity.ts`, `src/components/RelicForgeModal.tsx`, `src/App.tsx`, `src/engine/wave17Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 6, 8, 11, 15 & Đợt 17)
8. **Rủi ro khi thay đổi**: Khóa tuyệt đối cho `Rarity.MYTHIC` sau Ch.4 và tước sạch `mythicImprint` giả mạo hoặc vượt bậc `> 5` trong `saveIntegrity.ts`.
9. **Tiêu chí nghiệm thu**: `wave17Overhaul.test.ts` (W17-3 xác minh khóa Ch.4, từ chối đồ Huyền Thoại, cộng đúng chỉ số & LC khi nâng `+1 → +5`, làm sạch save giả mạo) pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 19. Difficulty Scaling — Tăng tiến độ khó
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: 12 chương tăng từ `1,350 LC → 285,000 LC`, `computePowerPressure`, Nightmare Ascension I–V & 5 biến dị phòng, nhịp hồi phục AI Ch.1→12, 5 Biến Thể Phòng, 2 Đặc Tính Tinh Anh, và **Ngã Rẽ Chiến Thuật tự chọn độ khó đổi thưởng (`ambush_vault` `+18% HP/+10% DMG` vs `sanctuary_spring` vs `rune_bastion`, Đợt 15)**.
3. **Vấn đề tồn tại**: Trước Đợt 15, người chơi vượt cấp tốt hoặc đang cần hồi phục giữa chương chưa có công cụ tự điều tiết rủi ro/phần thưởng ngay trong từng lượt đi.
4. **Nguyên nhân gốc rễ**: Mạch phòng giữa chương chưa có nhánh chọn rủi ro chủ động gắn liền với học thuyết đội hình quái.
5. **Giải pháp đề xuất**: Kế thừa phân tầng Đợt 13, Ngã Rẽ Chiến Thuật Đợt 15 & Tóm Tắt Trước Trận Đợt 16, trong **Đợt 18** trao quyền chủ động điều chỉnh độ khó đổi thưởng trên **Ch.2–12 & Tháp Vô Tận** thông qua **3 Khế Ước Độ Khó Hoàng Đạo có thể kết hợp tự do (`vow_ferocity`: +18% HP / +12% DMG; `vow_haste`: nhịp ra chiêu nhanh 15%; `vow_austerity`: giảm 30% hồi máu — tối đa `+67%` Vàng & `+60%` Bụi Sao)**, khóa tắt tuyệt đối ở Ch.1 & chế độ đặc biệt và nối thẳng biên thẩm quyền `zodiacVowGoldMult` vào `runIntegrityVerifier.ts`.
6. **File hoặc module liên quan**: `src/engine/wave18TacticalAndAtmosphere.ts`, `src/data/runIntegrityVerifier.ts`, `src/components/PreBattleBriefingModal.tsx`, `src/components/GameHUD.tsx`, `src/engine/wave18Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 6, 8, 13, 15, 16 & Đợt 18)
8. **Rủi ro khi thay đổi**: Khóa cứng Ch.1 FTUE để người chơi mới không gặp đột biến độ khó; vẫn cần xác nhận cảm nhận né đòn thực tế từ playtest người thật (P3-1).
9. **Tiêu chí nghiệm thu**: `wave18Overhaul.test.ts` (W18-1), `wave16Overhaul.test.ts` & `tools/simulate-playtime-milestones.ts` (`chapter12TtkHealthy: true`, `skillBuildsBalanced: true`) pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 20. UI/UX — Giao diện và trải nghiệm người dùng
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: Giao diện Celestial Gold thống nhất, Zero-Pill, 0 `backdrop-blur` đè WebGL, 0 chấm `animate-pulse`, HUD tách khỏi vòng 60Hz, đồng bộ sống 8 phím tắt tùy biến, và trong **Đợt 16** mở rộng thêm **Bảng Tóm Tắt Chiến Thuật Trước Trận 1-Click**, **Biểu Ngữ Lịch Sự Kiện LiveOps Sảnh Chính + Modal Đếm Ngược 1s**, **Bảng Khai Màn Boss 12 Cung** và **Phụ Đề Âm Thanh Chiến Đấu**.
3. **Vấn đề tồn tại**: Trước Đợt 16, người chơi thiếu một điểm xem nhanh trước trận gom gọn LC khuyến nghị / nút thắt yếu nhất / khắc chế Boss, thiếu băng sự kiện LiveOps kèm đếm ngược trực tiếp tại Sảnh Chính, và khoảnh khắc Boss xuất hiện chưa có bảng danh hiệu 12 cung riêng.
4. **Nguyên nhân gốc rễ**: Thông tin chiến thuật & lịch sự kiện trước đây nằm rải rác giữa Codex, Cài Đặt và trang quản trị Admin LiveOps thay vì đưa ra giao diện người chơi 1-chạm.
5. **Giải pháp đề xuất**: Kế thừa Tóm Tắt Trước Trận + Lịch LiveOps Đợt 16 & Cố Vấn ROI Đợt 17, trong **Đợt 18** hoàn thiện trải nghiệm điều khiển 1-chạm từ Tiền Chiến → Chọn Kỹ Năng → HUD → Cài Đặt: bảng chọn **Khế Ước Hoàng Đạo (`briefing-zodiac-vows`)** hiển thị tức thời tổng `+Vàng% · +Bụi Sao%`, nhãn Zero-Pill **`skill-focus-badge`** chỉ rõ thẻ Cộng Hưởng/Khuếch Đại trên `SkillDraftModal.tsx`, thanh **`hud-active-vows`** gọn nhẹ trên `GameHUD.tsx`, cùng cụm **4 Hồ Sơ Tiếp Cận 1-Click (`settings-accessibility-presets`)** & **Trung Tâm Sẵn Sàng Tài Nguyên 12 Chương (`settings-asset-readiness-center`)** trong `SettingsModal.tsx` — toàn bộ nền đặc `0 backdrop-blur`, `tabular-nums`, `0 animate-pulse`.
6. **File hoặc module liên quan**: `src/components/PreBattleBriefingModal.tsx`, `src/components/SkillDraftModal.tsx`, `src/components/GameHUD.tsx`, `src/components/SettingsModal.tsx`, `src/App.tsx`, `src/engine/wave18Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 7, 8, 10, 11, 16 & Đợt 18)
8. **Rủi ro khi thay đổi**: Giữ thanh CTA Sảnh Chính gọn gàng, không chắn Ch.1 FTUE và không tràn bố cục ở màn hình 1366×768 / cỡ chữ 130%.
9. **Tiêu chí nghiệm thu**: `wave18Overhaul.test.ts` (W18-1, W18-5) & `wave16Overhaul.test.ts` pass 100%, `tsc --noEmit` & Vite build sạch, 0 `backdrop-blur` & 0 `animate-pulse`.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 21. Game Feel — Cảm giác chơi
1. **Điểm hiện tại (Trước)**: `82 / 100`
2. **Bằng chứng đánh giá**: `combatFeel.ts` (Hitstop, Camera Shake trauma, recoil, kill burst), `combatAnimationKinematics.ts` (nghiêng thân Lướt, nhún Kỹ năng `E`/`F`, **biên đạo Quái/Boss windup anticipation → lunge, quỳ gối rung phá giáp, tan biến xác chết**), `heroAndBossSignatureVfx.ts` (**VFX tuyệt kỹ riêng 4 tướng & vòng hào quang Boss Pha II/III — 0 PointLights**), âm trầm kết liễu `playExecutionFinisherDrop`, tách riêng `reduceScreenFlash` đồng bộ WebGL + HUD, và **Đệm Phím 5 Hành Động (`140ms`)**.
3. **Vấn đề tồn tại**: Trước Đợt 7–12, Quái/Boss thiếu biên đạo gồng đòn & quỳ gối choáng, 4 tướng thiếu hiệu ứng chữ ký riêng khi tung tuyệt kỹ và thiếu âm trầm kết liễu khi hạ Boss/Tinh Anh.
4. **Nguyên nhân gốc rễ**: Phản hồi chiến đấu trước đây tập trung vào phía người chơi mà chưa có bộ biên đạo hình ảnh-âm thanh đồng bộ cho Quái/Boss và 4 tuyệt kỹ tướng.
5. **Giải pháp đề xuất**: Kế thừa Đệm Phím 5 hành động (Đợt 7), chính sách HUD `resolveHudVisualFeedbackPolicy` (Đợt 9), biên đạo/VFX Đợt 12 và Phản Tiễn/Va Tường Đợt 15, trong **Đợt 17** hoàn thiện khoảnh khắc cao trào nhất khi đối đầu Boss với **Phá Chiêu Phản Công Boss (`Interrupt Counter-Surge`)**: ngắt chiêu niệm Boss lập tức kích nổ VFX **`interrupt_surge`** 0-PointLight, rút **`-35%`** hồi chiêu Chủ Động, cộng **`+18`** Nộ, mở thanh phản công `3.8s` (`hud-interrupt-surge` nền đặc `tabular-nums`, `0 backdrop-blur`) kèm **`+25%`** sát thương Điểm Yếu Boss và phụ đề `boss_shatter` đồng bộ.
6. **File hoặc module liên quan**: `src/engine/wave17CombatAndPractice.ts`, `src/engine/heroAndBossSignatureVfx.ts`, `src/engine/wave15CombatSystems.ts`, `src/audio/soundEngine.ts`, `src/components/GameHUD.tsx`, `src/engine/GameEngine.ts`, `src/engine/wave17Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 7, 9, 12, 15 & Đợt 17)
8. **Rủi ro khi thay đổi**: Phải tôn trọng tuyệt đối `reducedMotion`, `reduceScreenFlash`, `colorblindTelegraphs` và giữ `0 PointLights`.
9. **Tiêu chí nghiệm thu**: `wave17Overhaul.test.ts` (W17-1/W17-2 xác minh VFX `interrupt_surge` 0 PointLight & phản hồi Phá Chiêu) và `wave15Overhaul.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

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
5. **Giải pháp đề xuất**: Hoàn tất trọn bộ **`P2-3a` → `P2-3o`**: trong **Đợt 18** tiếp tục kỷ luật tách mô-đun thuần có unit test độc lập 100% bằng **`src/engine/wave18TacticalAndAtmosphere.ts`** (Khế Ước Độ Khó Hoàng Đạo, AI Liên Kích Đội Hình Zero-GC, Phản Bật Mũi Tên Cộng Hưởng, Vành Chân Trời 12 Chương 0-PointLight & 4 Hồ Sơ Tiếp Cận 1-Click) nối gọn qua hợp đồng kiểu chặt vào `GameEngine.ts`, `runIntegrityVerifier.ts`, `skillsData.ts`, `combatAnimationKinematics.ts`, `heroAndBossSignatureVfx.ts`, `sfxPriorityMixer.ts`, `zodiacMusicDirector.ts`, `soundEngine.ts` và các modal UI.
6. **File hoặc module liên quan**: `src/engine/wave18TacticalAndAtmosphere.ts`, `src/engine/wave17CombatAndPractice.ts`, `src/data/wave17EndgameAndBackup.ts`, `src/engine/wave16BossAndPortal.ts`, `src/engine/heroAndBossSignatureVfx.ts`, `src/engine/GameEngine.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành `P2-3a` → `P2-3o`)
8. **Rủi ro khi thay đổi**: Bảo đảm null-safety tuyệt đối cho `GameEngine` prototype harness (`tests/render-pacing.test.mjs`, `tests/resource-lifecycle.test.mjs`), giải phóng sạch GPU và 0 vòng phụ thuộc vòng tròn.
9. **Tiêu chí nghiệm thu**: `tsc --noEmit` 0 lỗi, Vite build sạch, toàn bộ kho mã nguồn đạt **`510` test / `502` PASS / `0` fail**.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 24. Asset Pipeline — Quy trình quản lý tài nguyên
1. **Điểm hiện tại (Trước)**: `79 / 100`
2. **Bằng chứng đánh giá**: Backblaze B2 + Cloudflare Worker CDN, `scripts/glb-manifest.json` (`173` tệp, `63/63` cặp High/Lite `100%`, `0` lỗi), `glbPipelineValidator.ts`, `glbFetchResilience.ts`, và trong **Đợt 16** bổ sung **Trình Kiểm Định Sẵn Sàng Tài Nguyên Hợp Nhất 12 Chương (`auditChapterAssetReadiness`)**.
3. **Vấn đề tồn tại**: Trước Đợt 16, kho GLB Ch.1–4 và hệ thống tài sản 3D thủ tục Ch.5–12 (kiến trúc đền thờ, phù điêu sàn đấu, thánh vật kể chuyện, giáp trụ Boss và Cổng Tinh Đạo 12 chương) chưa được kiểm toán hợp nhất qua một báo cáo sẵn sàng 12/12 chương chung.
4. **Nguyên nhân gốc rễ**: `validateGlbPipelineManifest` chỉ kiểm toán manifest GLB Ch.1–4 mà chưa nối kiểm định chéo toàn bộ lớp tài sản 3D thủ tục 0-PointLight Ch.5–12.
5. **Giải pháp đề xuất**: Kế thừa 100% đối cặp High/Lite (`63/63`), streaming 6 MiB, fallback High → Lite & `auditChapterAssetReadiness` (Đợt 10 & Đợt 16), trong **Đợt 18** mở **Trung Tâm Kiểm Định Sẵn Sàng Tài Nguyên 12 Chương chỉ-đọc (`settings-asset-readiness-center` ngay trong `SettingsModal.tsx`)** gọi trực tiếp `auditChapterAssetReadiness` để hiển thị minh bạch tỷ lệ sẵn sàng `12/12` Chương, phân loại GLB High/Lite (Ch.1–4) vs Thủ Tục 3D 0-PointLight (Ch.5–12) và chứng nhận `e5430Safe` ngay trong game.
6. **File hoặc module liên quan**: `src/components/SettingsModal.tsx`, `src/data/wave16TacticalAndLiveOps.ts`, `src/engine/wave18TacticalAndAtmosphere.ts`, `src/engine/glbPipelineValidator.ts`, `scripts/glb-manifest.json`, `src/engine/wave18Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P0 / P2 (Đã hoàn thành P2-1, P2-2, Đợt 10, Đợt 16 & Đợt 18)
8. **Rủi ro khi thay đổi**: Hoàn toàn chỉ-đọc, giữ nguyên phân đoạn `6 MiB` Cloudflare Worker và bảo đảm mọi tài sản thủ tục luôn đạt `0 PointLights`.
9. **Tiêu chí nghiệm thu**: `wave18Overhaul.test.ts` (W18-5) & `wave16Overhaul.test.ts` (W16-3) xác minh `auditChapterAssetReadiness`: `readyChaptersCount === 12/12`, `e5430Safe === true`, `totalProceduralPointLights === 0`, cùng `validateGlbPipelineManifest` `100%` cặp High/Lite (`0` lỗi).
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 25. Replayability — Giá trị chơi lại
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: 4 tướng Hoàng Đạo, 40+ kỹ năng roguelike + 12 nhánh Tiến Hóa Boss/AoE dự báo rõ trên thẻ Tarot, **Bảng Phân Tích Sát Thương Từng Kỹ Năng cuối trận**, **Bộ Lưu Trang Bị & Cổ Ngữ Chuyển Nhanh**, **Sân Tập 3D So Sánh DPS Thực Tế Từng Bộ Lưu Trang Bị (`Chốt Mẫu DPS` + tự chốt khi đổi Preset + `% ΔDPS` & Kỹ Năng MVP, Đợt 12)**, **Khế Ước Thử Thách Tuần xoay vòng ISO**, Tháp Vô Tận, Nightmare Ascension I–V + 5 Mutators, Đấu Trường Cân Bằng.
3. **Vấn đề tồn tại**: Trước Đợt 12, khi thử nghiệm nhiều Bộ Lưu Trang Bị & Cổ Ngữ trong Sân Tập 3D, người chơi chưa thể chốt và so sánh trực tiếp DPS 5s, Đỉnh DPS, tỷ lệ chí mạng, Kỹ năng MVP và `% ΔDPS` cạnh nhau ngay trên HUD.
4. **Nguyên nhân gốc rễ**: `GameHUD.tsx` ở chế độ `isTrainingMode` chưa có bảng ghi nhận đối chiếu theo từng slot Bộ Trang Bị và chưa đọc Kỹ năng MVP thực tế từ `GameEngine`.
5. **Giải pháp đề xuất**: Kế thừa Sân Tập 3D so sánh DPS Preset (Đợt 12) và Ngã Rẽ Chiến Thuật + Chuyển Hóa Đồ Bộ (Đợt 15), trong **Đợt 17** bổ sung **Sảnh Luyện Boss 12 Cung Hoàng Đạo — 0 Farm (`training-boss-practice-bar` trong `GameHUD.tsx`)** cho phép tập né, canh thời điểm Phá Chiêu Phản Công và thử nghiệm các bộ build Ấn Tinh Thần Thoại trên đúng Boss Ch.1–12 đã mở khóa với thống kê live DPS / Số lần Phá Chiêu / Né Hoàn Hảo mà không tốn lượt hay phá cân bằng kinh tế.
6. **File hoặc module liên quan**: `src/engine/wave17CombatAndPractice.ts`, `src/data/wave17EndgameAndBackup.ts`, `src/components/GameHUD.tsx`, `src/components/RelicForgeModal.tsx`, `src/engine/wave17Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 8, 11, 12, 15 & Đợt 17)
8. **Rủi ro khi thay đổi**: Khóa tuyệt đối 0 Vàng / 0 Ngọc / 0 XP / 0 Đồ / 0 Tiến độ Nhiệm vụ trong Luyện Boss 12 Cung (`enforceZeroBossPracticeRewards`).
9. **Tiêu chí nghiệm thu**: `wave17Overhaul.test.ts` (W17-2/W17-3) & `wave15Overhaul.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

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
5. **Giải pháp đề xuất**: Kế thừa đồng bộ Mù Màu + Anti-Flash + Giảm Chuyển Động + 8 Phím Tắt Tùy Biến + Phụ Đề Âm Thanh Khiếm Thính (Đợt 7–16), trong **Đợt 18** bổ sung **4 Hồ Sơ Tiếp Cận 1-Click (`ACCESSIBILITY_PRESETS`, `applyAccessibilityPreset`, `detectActiveAccessibilityPreset` gắn trên `SettingsModal.tsx` → `settings-accessibility-presets`)**: **`Tiêu Chuẩn`**, **`Hỗ Trợ Mù Màu`**, **`Dịu Mắt & Chống Chớp`** và **`Chữ Lớn & Khiếm Thính`**, tự động phát hiện hồ sơ đang áp dụng (hoặc `'custom'`) mà bảo toàn tuyệt đối 100% âm lượng & chất lượng đồ họa độc lập của người chơi.
6. **File hoặc module liên quan**: `src/engine/wave18TacticalAndAtmosphere.ts`, `src/components/SettingsModal.tsx`, `src/engine/wave16BossAndPortal.ts`, `src/data/liveOpsData.ts`, `src/components/GameHUD.tsx`, `src/engine/wave18Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 7, Đợt 9, Đợt 16 & Đợt 18)
8. **Rủi ro khi thay đổi**: Không ghi đè cài đặt âm lượng/đồ họa khi chuyển hồ sơ tiếp cận và bảo toàn khả năng tùy chỉnh từng công tắc lẻ.
9. **Tiêu chí nghiệm thu**: `wave18Overhaul.test.ts` (W18-5 xác minh 4 hồ sơ 1-Click bảo toàn `masterVol`/`bgmVol`/`sfxVol`/`graphicsQuality` + phát hiện `'custom'`) & `wave16Overhaul.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 28. Security & Anti-Cheat — Bảo mật và chống gian lận
1. **Điểm hiện tại (Trước)**: `74 / 100`
2. **Bằng chứng đánh giá**: `firestore.rules` (7 blueprint, 0 lỗi ESLint, đã sửa & deploy live quyền cập nhật lịch `scheduledStartMs`/`scheduledEndMs` trong `liveops_config`), xác thực Firebase ID Token ở `server.ts`, rate limiter API, kẹp tải trọng WebSocket, `saveIntegrity.ts` làm sạch trọn bộ trường lưu bao gồm dữ liệu Đợt 11 (`autoSalvageFilter`, `weeklyChallenges`, `claimedHeroMasteryMilestones`), không lộ bí mật trên frontend.
3. **Vấn đề tồn tại**: Trước Đợt 11, nhánh `allow update` của `liveops_config` trong `firestore.rules` thiếu 2 khóa `scheduledStartMs`/`scheduledEndMs` trong danh sách `affectedKeys().hasOnly(...)`, và các trường mới Đợt 11 cần được kẹp biên chặt chống sửa tay file lưu.
4. **Nguyên nhân gốc rễ**: Danh sách khóa cho phép cập nhật ở `firestore.rules` chưa bổ sung đủ 2 khóa lịch LiveOps khi cập nhật tài liệu đã tồn tại.
5. **Giải pháp đề xuất**: Ngoài bộ quy tắc `firestore.rules` (0 lỗi ESLint), `POST /api/runs/verify` + `RunNonceReplayGuard` (Đợt 14) và sanitization `saveIntegrity.ts`, trong **Đợt 17** gia cố thêm 3 lớp phòng vệ dữ liệu & chống khai thác mới:
   - **Lọc trắng & kẹp biên `GearInstance.mythicImprint` (`src/data/saveIntegrity.ts`)**: Tự động tước bỏ Ấn Tinh giả mạo trên đồ dưới Thần Thoại, loại bỏ mã hệ Ấn Tinh không thuộc 4 hệ hợp lệ và kẹp chặt `tier` trong `[1..5]`.
   - **Khóa 0-Farm tuyệt đối cho Sảnh Luyện Boss 12 Cung (`enforceZeroBossPracticeRewards` & guard `isTrainingMode` trong `GameEngine.ts`)**: Ép toàn bộ thưởng Vàng/Ngọc/XP/Loot/Nhiệm vụ về `0` và chặn sinh Loot Orb hay sự kiện tiến độ khi đang luyện Boss.
   - **Kho Sao Lưu & Khôi Phục Nhanh FNV-1a (`src/data/wave17EndgameAndBackup.ts`)**: Kiểm chứng mã băm FNV-1a trước khi cho phép khôi phục (từ chối ngay snapshot bị sửa tay trong `localStorage`) và chạy qua `validateAndSanitizeSaveIntegrity` trước khi ghi lại.
6. **File hoặc module liên quan**: `src/data/wave17EndgameAndBackup.ts`, `src/engine/wave17CombatAndPractice.ts`, `src/data/saveIntegrity.ts`, `src/data/runIntegrityVerifier.ts`, `src/server/serverSecurity.ts`, `firestore.rules`, `src/engine/wave17Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P0 / P1 / P2 (Đã hoàn thành Đợt 11, Đợt 14 & Đợt 17)
8. **Rủi ro khi thay đổi**: Giữ dung lượng vòng đệm cục bộ giới hạn cứng tối đa **5 mốc** tránh tràn `localStorage` và luôn tự tạo mốc `pre_restore` trước khi khôi phục.
9. **Tiêu chí nghiệm thu**: `wave17Overhaul.test.ts` (W17-2, W17-3, W17-5 xác minh 0-farm, làm sạch `mythicImprint` giả mạo, phát hiện & chặn sửa tay checksum FNV-1a trong Rollback Vault) & `wave14Overhaul.test.ts` pass 100%; `npx eslint firestore.rules` = 0 lỗi.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 29. Quality Assurance — Kiểm thử chất lượng
1. **Điểm hiện tại (Trước)**: `70 / 100`
2. **Bằng chứng đánh giá**: Toàn bộ bộ kiểm thử `node:test` (`src/**/*.test.ts` + `tests/*.test.mjs`), **công cụ Benchmark 15s/60s FPS 1% Low xuất JSON tích hợp trực tiếp trong game** (`frameBenchmarkSampler.ts` + `SettingsModal.tsx`), benchmark vật lý `tools/benchmark-spatial-physics.ts`, mô phỏng 8 mốc `tools/simulate-playtime-milestones.ts`, kiểm định `firestore.rules` và kiểm chứng trình duyệt sống Chromium (`playwright-cli`).
3. **Vấn đề tồn tại**: Mọi cải tiến Đợt 18 (Khuếch Đại Kỹ Năng Focus Pity, Khế Ước Độ Khó Hoàng Đạo, AI Liên Kích Đội Hình, Phản Bật Mũi Tên Cộng Hưởng, Vành Chân Trời 12 Chương + VFX Ấn Tinh 0-PointLight, Bậc Cao Độ Combo + Stinger 12 Điệu Thức, 4 Hồ Sơ Tiếp Cận 1-Click & Trung Tâm Sẵn Sàng 12 Chương) đều cần regression gate tự động toàn kho.
4. **Nguyên nhân gốc rễ**: Cần duy trì kỷ luật 0 fail / 0 lỗi biên dịch / 0 PointLights mới / 702 LC Fresh Baseline xuyên suốt mọi đợt phát triển.
5. **Giải pháp đề xuất**: Bổ sung bộ kiểm thử **`src/engine/wave18Overhaul.test.ts`** (5 bộ kiểm định `W18-1 → W18-5` bao phủ trọn vẹn 5 trụ cột Đợt 18), kế thừa trọn bộ W1–W17 (`510` bài kiểm thử), xác minh lại mô phỏng 100h `tools/simulate-playtime-milestones.ts` (`702 LC` Fresh) và chạy ESLint `firestore.rules`.
6. **File hoặc module liên quan**: `src/engine/wave18Overhaul.test.ts`, `src/engine/wave17Overhaul.test.ts`, `tests/*.test.mjs`, `src/**/*.test.ts`, `tools/simulate-playtime-milestones.ts`, `QA_TEST_REPORT.md`.
7. **Mức độ ưu tiên**: P0 / P1 / P2 (Đã hoàn thành Đợt 1–18)
8. **Rủi ro khi thay đổi**: Mọi cải tiến mới bắt buộc chạy lại full suite + `tsc --noEmit` + Vite production build để chống regression.
9. **Tiêu chí nghiệm thu**: Toàn bộ kho mã nguồn đạt **`510 bài kiểm thử | 502 PASS | 0 FAIL | 8 skip`**, `tsc --noEmit` 0 lỗi, Vite production build sạch, `npx eslint firestore.rules` = 0 lỗi, mô phỏng 100h (`702 LC` Fresh) PASS.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

### 30. Live Operations — Vận hành và mở rộng
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: Bảng quản trị `/admin/assets`, `AssetAdminLiveOpsTab.tsx`, `src/data/liveOpsConfig.ts`, `liveOpsConfigService.ts`, `vercel.json`, Khế Ước Tuần xoay vòng ISO, `firestore.rules` (0 lỗi ESLint), Băng Lịch Sự Kiện LiveOps Sảnh Chính + Modal Đếm Ngược 1s (Đợt 16), và trong **Đợt 17** bổ sung **Kho Sao Lưu & Khôi Phục Nhanh Tự Động (`5 Mốc` FNV-1a)** bảo vệ dữ liệu người chơi khỏi rủi ro ghi đè xung đột Cloud / nhập mã lỗi / đặt lại nhầm.
3. **Vấn đề tồn tại**: Trước Đợt 17, khi người chơi gặp xung đột lưu đám mây (Cloud Conflict Overwrite), nhập mã save cũ (`Import`) hoặc đặt lại dữ liệu (`Reset`), chưa có lớp lưới an toàn tự động chụp bản sao cục bộ kiểm chứng FNV-1a để hoàn tác 1-click khi cần.
4. **Nguyên nhân gốc rễ**: `App.tsx` ghi đè trực tiếp `saveData` tại 3 thao tác rủi ro cao mà chưa đẩy bản chụp vào bộ đệm vòng bảo hộ trong `localStorage` và `SettingsModal.tsx` chưa có bảng khôi phục xác nhận 2 bước.
5. **Giải pháp đề xuất**: Kế thừa P2-4b, Zero-404 SPA, Khế Ước Tuần ISO & Lịch LiveOps Sảnh Chính (Đợt 3–16), trong **Đợt 17** triển khai **Kho Sao Lưu & Khôi Phục Nhanh (`SAVE_ROLLBACK_MAX_SNAPSHOTS = 5`, `recordLocalRollbackSnapshot` trong `src/data/wave17EndgameAndBackup.ts`)**: tự động chụp trước `Import` (`pre_import`), `Reset` (`pre_reset`), `Cloud Overwrite` (`pre_cloud_overwrite`) và `Restore` (`pre_restore`), hiển thị trực tiếp trong `SettingsModal.tsx` (`settings-rollback-vault`) với nút **`Tạo Mốc Ngay`** và xác nhận 2 bước **`Khôi Phục`**, kèm kiểm định FNV-1a + `validateAndSanitizeSaveIntegrity`.
6. **File hoặc module liên quan**: `src/data/wave17EndgameAndBackup.ts`, `src/components/SettingsModal.tsx`, `src/App.tsx`, `src/data/wave16TacticalAndLiveOps.ts`, `src/components/LiveOpsScheduleModal.tsx`, `firestore.rules`, `src/engine/wave17Overhaul.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành P2-4b, Đợt 10, 11, 16 & Đợt 17)
8. **Rủi ro khi thay đổi**: Giới hạn chặt 5 mốc để tránh quá tải quota `localStorage`, bắt buộc xác nhận 2 bước khi khôi phục và luôn tự chụp `pre_restore` trước khi ghi đè.
9. **Tiêu chí nghiệm thu**: `wave17Overhaul.test.ts` (W17-5 xác minh trần vòng đệm 5 mốc, khôi phục toàn vẹn, phát hiện giả mạo checksum), `wave16Overhaul.test.ts` & `liveops-config.test.mjs` pass 100%, `npx eslint firestore.rules` = 0 lỗi.
10. **Điểm sau khi triển khai và kiểm thử**: `96 / 100`

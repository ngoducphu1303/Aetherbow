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
| **Progression, Economy & Loot** | 16, 17, 18 | 20% | 79.00 | 91.00 | 15.80 | 18.20 | **+2.40** |
| **Gameplay, Combat & Skill** | 01, 02, 03, 04 | 20% | 81.25 | 90.25 | 16.25 | 18.05 | **+1.80** |
| **Animation, VFX, SFX & Music** | 05, 06, 07, 08 | 15% | 78.75 | 90.00 | 11.81 | 13.50 | **+1.69** |
| **Enemy AI, Boss & Difficulty** | 12, 13, 19 | 10% | 80.67 | 91.00 | 8.07 | 9.10 | **+1.03** |
| **Performance & Architecture** | 22, 23 | 10% | 74.00 | 92.50 | 7.40 | 9.25 | **+1.85** |
| **Graphics, Art & World Design** | 09, 10, 15 | 5% | 80.67 | 90.33 | 4.03 | 4.52 | **+0.49** |
| **Game Feel, UI/UX & Accessibility** | 20, 21, 27 | 5% | 78.67 | 91.67 | 3.93 | 4.58 | **+0.65** |
| **Replayability & Retention** | 25, 26 | 5% | 79.00 | 87.50 | 3.95 | 4.38 | **+0.43** |
| **Physics, Level & Asset Pipeline** | 11, 14, 24 | 5% | 80.33 | 90.67 | 4.02 | 4.53 | **+0.51** |
| **Security, QA & Live Operations** | 28, 29, 30 | 5% | 74.67 | 92.33 | 3.73 | 4.62 | **+0.89** |
| **TỔNG ĐIỂM TRỌNG SỐ** | **30 / 30 tiêu chí** | **100%** | — | — | **78.99 / 100** | **90.73 / 100** | **+11.74** |

---

## 3. Đánh Giá Chi Tiết 30 Tiêu Chí (Đủ 10 Trường Bắt Buộc / Tiêu Chí)

### 01. Game Design — Thiết kế trò chơi
1. **Điểm hiện tại (Trước)**: `84 / 100`
2. **Bằng chứng đánh giá**: 4 tướng Hoàng Đạo (`heroesData.ts`), 12 chương chiến dịch (`chaptersData.ts`), hệ thống Roguelike skill draft (`skillsData.ts`), Tháp Vô Tận, Nightmare Ascension I–V (`phase5Data.ts`).
3. **Vấn đề tồn tại**: Tướng Sylvia dùng trùng hiệu ứng kỹ năng chủ động với Aurelia; thiếu mục tiêu tiêu Vàng rõ ràng ở giai đoạn sau 60h.
4. **Nguyên nhân gốc rễ**: Nội dung Ch.3–4 được mở rộng nhanh nhưng nhánh hiệu ứng riêng của Sylvia và sink Endgame chưa tách biệt hoàn toàn.
5. **Giải pháp đề xuất**: Triển khai kỹ năng độc nhất `'jade_bastion'` cho Sylvia, hệ thống **Tinh Tuý Hoàng Đạo** (`paragonInfusionLevel`), và trong Đợt 8 hiển thị trực diện lộ trình Ngã Rẽ Tiến Hóa (Boss vs AoE) ngay trên thẻ Tarot chọn kỹ năng (`getSkillEvolutionPreview`) giúp quyết định build trong trận có chiều sâu chiến thuật rõ rệt.
6. **File hoặc module liên quan**: `src/data/phase5Data.ts`, `src/data/talentsData.ts`, `src/engine/skillEvolutionEngine.ts`, `src/components/SkillDraftModal.tsx`, `src/engine/GameEngine.ts`, `src/components/TalentsModal.tsx`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 8)
8. **Rủi ro khi thay đổi**: Có thể lệch biên cân bằng DPS ±12% giữa các tướng hoặc ảnh hưởng sớm đầu game nếu mở khóa sai điều kiện.
9. **Tiêu chí nghiệm thu**: 4 tướng có 4 `effectKind` khác nhau, `earlyProgression.test.ts` pass ±12% DPS, Paragon khóa hoàn toàn trước Ch.12 / 160 Thiên Phú, `wave8TacticalAndProgression.test.ts` & Chromium xác minh rõ thẻ tiến hóa.
10. **Điểm sau khi triển khai và kiểm thử**: `90 / 100`

### 02. Core Gameplay Loop — Vòng lặp gameplay
1. **Điểm hiện tại (Trước)**: `82 / 100`
2. **Bằng chứng đánh giá**: Vòng lặp Chiến đấu → Nhặt đồ/Vàng → So sánh chỉ số & Bộ Trang Bị → Nâng Trang bị/Thiên Phú/Cổ Ngữ → Vượt Boss Chương → Mở khóa Ch.2–12 & Tháp Vô Tận.
3. **Vấn đề tồn tại**: Sau mốc ~45h–60h khi 8 Thiên Phú chạm 160/160 và đồ Thần Thoại đạt Lv.80, vòng lặp tiêu Vàng từng bị đứt gãy; ở màn so sánh đồ mới nhặt, người chơi chưa thấy rõ biến động chỉ số thành phần và kích hoạt/mất hiệu ứng Bộ Trang Bị.
4. **Nguyên nhân gốc rễ**: Toàn bộ Gold sink trước đây có trần cứng và khung so sánh đồ mới chỉ hiện chênh lệch LC tổng.
5. **Giải pháp đề xuất**: Tích hợp vòng lặp Endgame **Tinh Tuý Hoàng Đạo (500 bậc)** vào `TalentsModal.tsx` + `computePlayerStats`, đồng thời bổ sung so sánh chỉ số chi tiết & cảnh báo Bộ 2/3 món (`computeGearComparison`) trong `LobbyPanels.tsx` ở Đợt 8.
6. **File hoặc module liên quan**: `src/data/talentsData.ts`, `src/data/gearData.ts`, `src/components/LobbyPanels.tsx`, `src/components/TalentsModal.tsx`, `src/App.tsx`, `src/data/economyTelemetry.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 8)
8. **Rủi ro khi thay đổi**: Rủi ro tạo lạm phát chỉ số Endgame nếu thưởng mỗi bậc quá lớn.
9. **Tiêu chí nghiệm thu**: Mô phỏng 100h tiêu thụ `>= 75%` tổng Vàng tích lũy (thực tế đạt `99.8%`), không ảnh hưởng Ch.1–11, luồng nhặt & so sánh trang bị minh bạch 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `90 / 100`

### 03. Combat System — Hệ thống chiến đấu
1. **Điểm hiện tại (Trước)**: `83 / 100`
2. **Bằng chứng đánh giá**: Auto-aim bắn khi đứng yên, né đòn cơ động, Crit/Knockback/Chill/Shield, `combatFeelDirector.ts`, `computePowerPressure` chống vượt cấp phi lý.
3. **Vấn đề tồn tại**: Trước Đợt 7, bộ đệm phím (`CombatInputBuffer`) mới chỉ hỗ trợ 3 thao tác (`dash`/`activeSkill`/`ultimate`), bỏ sót `Phá Giáp Trảm (F)` & `Thức Tỉnh Vũ Khí (X)` và chưa tự xả sạch khi mất tiêu điểm/đổi phòng; Sylvia từng thiếu kỹ năng phòng thủ riêng.
4. **Nguyên nhân gốc rễ**: `aaaFivePillarsDirector.ts` chưa mở rộng `BufferedCombatAction` cho đủ 5 thao tác cốt lõi và `GameEngine.ts` chưa dọn đệm phím ở `onWindowBlur`/`clearCombatEntities`.
5. **Giải pháp đề xuất**: Hiện thực hóa `'jade_bastion'` (Khiên 12% HP + sóng ngọc làm chậm), đồng bộ `flashScale`, và mở rộng **Đệm Phím 5 Hành Động (`140ms`)** cho `dash`, `activeSkill`, `heavyBreak`, `ultimate`, `overdrive` kèm tự xả sạch khi đổi phòng/blur trong Đợt 7.
6. **File hoặc module liên quan**: `src/engine/GameEngine.ts`, `src/engine/aaaFivePillarsDirector.ts`, `src/engine/zodiacLightingVfxDirector.ts`, `src/engine/zodiacRealmArchitecture.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 7)
8. **Rủi ro khi thay đổi**: Cần bảo đảm null-safety cho `clearCombatInputBuffer` và tránh kích hoạt nhầm thao tác cũ khi qua phòng mới.
9. **Tiêu chí nghiệm thu**: 5/5 hành động chiến đấu đều đệm mượt trong `140ms`, xả sạch khi blur/đổi phòng, unit test & live Chromium pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `90 / 100`

### 04. Skill System — Hệ thống kỹ năng
1. **Điểm hiện tại (Trước)**: `76 / 100`
2. **Bằng chứng đánh giá**: 40+ kỹ năng roguelike trong trận (`skillsData.ts`), kỹ năng tiến hóa & cộng hưởng, kỹ năng chủ động 4 tướng độc nhất (`phase5Data.ts`), Phá Giáp Trảm & Thức Tỉnh Vũ Khí hỗ trợ đệm phím + gán phím tự do.
3. **Vấn đề tồn tại**: Sylvia (`Kim Ngưu`) từng dùng trùng `effectKind: 'ember_nova'` với Aurelia; Phá Giáp Trảm (`F`) & Thức Tỉnh Vũ Khí (`X`) trước Đợt 7 chưa hỗ trợ đệm phím và tùy biến phím tắt.
4. **Nguyên nhân gốc rễ**: Chưa có nhánh enum `'jade_bastion'` và hai kỹ năng chiến thuật chưa nối vào `CombatKeybinds` & `CombatInputBuffer`.
5. **Giải pháp đề xuất**: Thêm `'jade_bastion'` cho Sylvia, nối đầy đủ `heavyBreak` & `overdrive` vào hệ thống đệm phím `140ms` và 8 phím tắt tùy biến, và trong Đợt 8 triển khai **`getSkillEvolutionPreview`** (`skillEvolutionEngine.ts`) hiển thị trực tiếp tiến độ `0→1/2` / `1→2/2` cùng hai nhánh Tiến Hóa Boss & AoE ngay trên thẻ Tarot (`SkillDraftModal.tsx`) kèm danh sách Tiến Hóa đang kích hoạt.
6. **File hoặc module liên quan**: `src/engine/skillEvolutionEngine.ts`, `src/components/SkillDraftModal.tsx`, `src/App.tsx`, `src/types/game.ts`, `src/data/phase5Data.ts`, `src/engine/aaaWave6Director.ts`, `src/components/GameHUD.tsx`.
7. **Mức độ ưu tiên**: P0 / P2 (Đã hoàn thành Đợt 8)
8. **Rủi ro khi thay đổi**: Cần bảo đảm tương thích ngược 100% save cũ chỉ có 6 phím tắt và không hiển thị lại nhắc nhở cho nhánh đã tiến hóa.
9. **Tiêu chí nghiệm thu**: 4 tướng dùng 4 `effectKind` riêng biệt, 8/8 phím tắt & đệm phím hoạt động sạch, 6/6 nhánh Tiến Hóa hiện dự báo rõ trên thẻ Tarot (`r8b-skill-draft.png`) và `wave8TacticalAndProgression.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `91 / 100`

### 05. Animation — Hệ thống hoạt ảnh
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: `combatAnimationKinematics.ts` (máy trạng thái 12 trạng thái chuẩn Tiêu chí 05 + blending động học Zero-GC), `heroKinematicMotion.ts`, hệ thống GLB `AnimationMixer` cho Tướng/Quái/Boss Chương 1–4.
3. **Vấn đề tồn tại**: Trước Đợt 6, lớp kinematic mới hỗ trợ giật bắn/choáng/chiến thắng mà thiếu đủ 12 trạng thái chuẩn (`dodge`, `skill_cast`, `spawn`, `death`, `knockback`, `walk`/`run`) và chuyển pha ưu tiên rõ ràng; Ch.5–12 vẫn chờ rig GLB độc bản ở P2-5b/P3-2.
4. **Nguyên nhân gốc rễ**: Chưa có hàm phân giải ưu tiên 12 trạng thái thống nhất (`resolveCombatAnimState`) và các xung động học riêng cho Lướt, tung Kỹ năng, Xuất trận, và Gục ngã.
5. **Giải pháp đề xuất**: Triển khai đầy đủ máy trạng thái **12 trạng thái `CombatAnimState`** (`idle | walk | run | attack | skill_cast | hit_reaction | dodge | stun | knockback | death | spawn | victory`) kèm thời gian crossfade (`0.06–0.22s`) và nối **`applyDodgeBank`**, **`applySkillCastPulse`**, **`applySpawnSettle`**, và pha gục ngã `isDead` trực tiếp vào `GameEngine.ts` (tôn trọng `reducedMotion`, Zero-GC).
6. **File hoặc module liên quan**: `src/engine/combatAnimationKinematics.ts`, `src/engine/wave6AnimationAndBoss.test.ts`, `src/engine/GameEngine.ts`, `scripts/glb-manifest.json`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 6; rig Ch.5–12 ở P2-5b/P3-2)
8. **Rủi ro khi thay đổi**: Cần bảo toàn tương thích ngược với cấu trúc `CombatKinematicPose` cũ và không gây sai lệch khi nhân vật đang cưỡi Rồng (`onDragon`).
9. **Tiêu chí nghiệm thu**: `wave6AnimationAndBoss.test.ts` xác minh đủ 12/12 trạng thái và thứ tự ưu tiên, kiểm chứng Lướt/Kỹ năng E/Phá Giáp F trực tiếp trên Chromium 0 lỗi.
10. **Điểm sau khi triển khai và kiểm thử**: `90 / 100`

### 06. VFX — Hiệu ứng hình ảnh
1. **Điểm hiện tại (Trước)**: `76 / 100`
2. **Bằng chứng đánh giá**: `zodiacLightingVfxDirector.ts`, `vfxBudgetGovernor.ts`, vòng telegraph mù màu (`colorblindTelegraphs.ts`), pool hạt và sóng xung kích.
3. **Vấn đề tồn tại**: 3 `THREE.PointLight` vẫn gắn trong `THREE.Scene` ở chế độ Lite khiến GPU yếu (Intel HD 4000) biên dịch shader nặng; thiếu công tắc giảm chớp sáng độc lập.
4. **Nguyên nhân gốc rễ**: `heroLight` và `impactLightPool` chỉ đặt `intensity = 0` thay vì gỡ khỏi scene graph; thiếu `reduceScreenFlash`.
5. **Giải pháp đề xuất**: Triển khai `resolveDynamicPointLightPolicy` + `syncPointLightPolicy()` tháo hẳn đèn về **0 PointLights** trong Lite/Watchdog ≥ 2, giảm 75% xung sáng khi bật Anti-Flash, và bổ sung **`GroundTelegraphVisualPool`** (Đợt 7) tái sử dụng đúng 2 hình học chuẩn cho toàn bộ bẫy sàn đấu (`arenaHazards`) & vụ nổ tinh anh (`volatileBlasts`) để loại bỏ 100% cấp phát/hủy `RingGeometry`/`CircleGeometry` giữa giao tranh.
6. **File hoặc module liên quan**: `src/engine/zodiacLightingVfxDirector.ts`, `src/engine/vfxPoolManager.ts`, `src/engine/GameEngine.ts`, `src/engine/zodiacRealmArchitecture.test.ts`.
7. **Mức độ ưu tiên**: P0 / P2 (Đã hoàn thành Đợt 7)
8. **Rủi ro khi thay đổi**: Phải hoàn trả đúng slot về pool khi kết thúc hiệu ứng hoặc đổi phòng và chỉ `dispose()` một lần khi đóng engine.
9. **Tiêu chí nghiệm thu**: Unit test xác minh `totalScenePointLights === 0` ở Lite/E5430, `flashScale === 0.25`, và 40 lần tạo telegraph chỉ dùng đúng 2 shared geometry.
10. **Điểm sau khi triển khai và kiểm thử**: `90 / 100`

### 07. SFX — Hiệu ứng âm thanh
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: `src/audio/sfxPriorityMixer.ts` (bộ trộn ưu tiên, giới hạn số voice cho máy yếu, chống clipping, giảm âm theo khoảng cách 3D) và `src/audio/soundEngine.ts` (Web Audio thủ tục không tạo GC rác).
3. **Vấn đề tồn tại**: Trước Đợt 5, SFX chưa suy giảm theo khoảng cách 3D (`out_of_range` culling), 4 tướng bắn chung 1 âm sắc dây cung, và đòn bị `CHẮN KHIÊN!` / `VỎ GIÁP!` vẫn phát tiếng trúng thịt thường thay vì tiếng dội kim loại.
4. **Nguyên nhân gốc rễ**: `SfxPriorityMixer.requestPlay` chưa nhận `distanceUnits`, `playBowShoot` chưa nhận `heroId`, và `damageEnemy` chưa tách nhánh `playShieldHit`.
5. **Giải pháp đề xuất**: Triển khai **`computeSpatialDistanceGain`** + cắt âm ngoài tầm (`out_of_range`, `maxRadius = 26u`) và danh mục `'attack_dodged'` trong `sfxPriorityMixer.ts`; bổ sung **4 âm sắc vũ khí đặc trưng cho 4 tướng Hoàng Đạo** (`aurelia` họa âm ánh dương, `bellona` xung sấm chớp, `sylvia` chuông gió ngọc, `celeste` song âm nguyệt kính), tiếng **dội khiên kim loại** cho `CHẮN KHIÊN!`/`VỎ GIÁP!` và `playAttackDodged` trong `soundEngine.ts` + nối khoảng cách thực `Math.hypot(e.x - this.px, e.z - this.pz)` tại `GameEngine.ts`.
6. **File hoặc module liên quan**: `src/audio/sfxPriorityMixer.ts`, `src/audio/soundEngine.ts`, `src/audio/sfxSpatialAndTimbre.test.ts`, `src/engine/GameEngine.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 5)
8. **Rủi ro khi thay đổi**: Phải giữ 100% tương thích ngược khi `distanceUnits` hoặc `heroId` không truyền vào để không vỡ các lời gọi cũ.
9. **Tiêu chí nghiệm thu**: Toàn bộ `src/audio/*.test.ts` (bao gồm 4/4 bài test mới tại `sfxSpatialAndTimbre.test.ts`) pass 100%, 0 lỗi WebAudio trên trình duyệt thật.
10. **Điểm sau khi triển khai và kiểm thử**: `90 / 100`

### 08. Music Design — Thiết kế nhạc nền
1. **Điểm hiện tại (Trước)**: `79 / 100`
2. **Bằng chứng đánh giá**: Hệ thống nhạc nền thích ứng theo pha Sảnh / Chiến đấu / Boss trong `soundEngine.ts` + `zodiacMusicDirector.ts`, có thanh chỉnh âm lượng riêng trong `SettingsModal.tsx`.
3. **Vấn đề tồn tại**: Trước Đợt 3, Chương 5–12 tái sử dụng chung chủ đề nhạc với 4 chương đầu.
4. **Nguyên nhân gốc rễ**: Ban đầu mới soạn mẫu cho 4 cung Hoàng Đạo đầu tiên.
5. **Giải pháp đề xuất**: Triển khai trọn bộ **12 chủ đề nhạc Hoàng Đạo độc bản** cho Chương 1–12 trong `src/audio/zodiacMusicDirector.ts` (12 âm giai, 12 tempo, sắc thái sóng, giai điệu chiến đấu & Boss riêng biệt kèm tăng tốc theo pha Boss và kèn Interrupt), nối trực tiếp vào `src/audio/soundEngine.ts`.
6. **File hoặc module liên quan**: `src/audio/zodiacMusicDirector.ts`, `src/audio/soundEngine.ts`, `tests/zodiac-music-director.test.mjs`, `src/components/SettingsModal.tsx`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 3)
8. **Rủi ro khi thay đổi**: Chồng vòng lặp nhạc khi chuyển màn nhanh nếu không dọn bộ hẹn giờ cũ.
9. **Tiêu chí nghiệm thu**: `zodiac-music-director.test.mjs` xác minh đủ 12 giai điệu chiến đấu, 12 giai điệu Boss, 12 khóa âm giai riêng biệt; sạch bản quyền 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `90 / 100`

### 09. Graphic Fidelity — Chất lượng đồ họa
1. **Điểm hiện tại (Trước)**: `82 / 100`
2. **Bằng chứng đánh giá**: Three.js PBR + ACES Filmic tone mapping, bộ mô hình 3D High/Lite 100% đối cặp (`63/63` cặp, 0 cảnh báo) cho Ch.1–4, hệ thống cánh/thú cưỡi/hào quang 3D, và 8 cụm kiến trúc đền thờ 3D đa tầng Ch.5–12 (`zodiacRealmArchitecture.ts`).
3. **Vấn đề tồn tại**: Trước Đợt 7, đấu trường Ch.5–12 chỉ dùng chung 4 kiểu lư hương góc đơn giản; bộ mô hình GLB quái/Boss Ch.5–12 tiếp tục theo lộ trình P2-5b/P3-2.
4. **Nguyên nhân gốc rễ**: Chưa có lớp kiến trúc thủ tục đa tầng riêng cho từng cung Hoàng Đạo Ch.5–12 bên ngoài vùng giao tranh.
5. **Giải pháp đề xuất**: Triển khai **`src/engine/zodiacRealmArchitecture.ts`** tạo 8 cụm đền thờ 3D độc bản (Cự Giải → Song Ngư) với vật liệu PBR dùng chung, đĩa bóng tiếp xúc đáy, chuyển động Zero-GC, tự giảm đỉnh hình học ở Lite Mode và **0 PointLights mới**; giữ chuẩn High/Lite `e5430Safe: true`.
6. **File hoặc module liên quan**: `src/engine/zodiacRealmArchitecture.ts`, `src/engine/zodiacRealmArchitecture.test.ts`, `src/engine/GameEngine.ts`, `src/engine/glbPipelineValidator.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 7; mở rộng GLB Ch.5–12 ở P2-5b/P3-2)
8. **Rủi ro khi thay đổi**: Không được thêm bất kỳ `PointLight` nào hoặc đặt công trình lấn vào vùng di chuyển của người chơi.
9. **Tiêu chí nghiệm thu**: `zodiacRealmArchitecture.test.ts` chứng minh 8/8 chương Ch.5–12 có kiến trúc độc bản (`>= 18` mesh, `0` PointLights, Lite giảm số đỉnh) và `validateGlbPipelineManifest` đạt `e5430Safe = true`, 0 issues.
10. **Điểm sau khi triển khai và kiểm thử**: `89 / 100`

### 10. Art Direction — Định hướng nghệ thuật
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: Bảng màu Hoàng Đạo 12 chương nhất quán 60-30-10 (`ART_STYLE_GUIDE.md`), 4 đấu trường GLB Ch.1–4, 8 cụm biểu tượng kiến trúc 3D độc bản Ch.5–12 (`Thủy Triều Nguyệt Tháp`, `Nhật Khuê Thánh Điện`, `Cán Cân Công Lý Hoàng Kim`, `Tháp Độc Thạch Hắc Diện`, `Khải Hoàn Cung Tinh Đạo`, `Cự Thạch Sơn Đỉnh Cổ Đại`, `Thiên Bình Tinh Lưu Khí`, `Song Ngư Mộng Cảnh Đài`), và UI Celestial Tapestry Zero-Pill.
3. **Vấn đề tồn tại**: Trước Đợt 7, 8 cung Ch.5–12 chưa có biểu tượng kiến trúc nhận diện thị giác riêng trong khung cảnh 3D.
4. **Nguyên nhân gốc rễ**: `buildArena` trước đây chỉ gom 12 cung vào 4 khuôn lư hương nguyên tố chung.
5. **Giải pháp đề xuất**: Ban hành & đồng bộ `ART_STYLE_GUIDE.md`, loại sạch 100% chấm `animate-pulse` trang trí, và dựng đủ **8 biểu tượng kiến trúc 3D Hoàng Đạo độc bản** cho Ch.5–12 (hoàn thiện nhận diện thị giác trọn bộ 12/12 cung Hoàng Đạo).
6. **File hoặc module liên quan**: `ART_STYLE_GUIDE.md`, `src/engine/zodiacRealmArchitecture.ts`, `src/engine/GameEngine.ts`, `src/components/AuctionHouseModal.tsx`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 7)
8. **Rủi ro khi thay đổi**: Cần bảo toàn đường nhìn camera rõ nét và màu sắc tương phản tốt với vòng telegraph chiến đấu.
9. **Tiêu chí nghiệm thu**: Đủ 12/12 cung có bản sắc không gian riêng (4 GLB + 8 kiến trúc đa tầng), 0 `animate-pulse` trang trí, 0 `backdrop-blur` đè WebGL.
10. **Điểm sau khi triển khai và kiểm thử**: `90 / 100`

### 11. Physics System — Hệ thống vật lý
1. **Điểm hiện tại (Trước)**: `82 / 100`
2. **Bằng chứng đánh giá**: `fixedTimestep.ts`, va chạm tường/trụ, đẩy lùi an toàn theo vật cản (`clampKnockbackInsideArena`), và lưới phân vùng không gian Zero-GC `SpatialHashGrid`.
3. **Vấn đề tồn tại**: Trước Đợt 3–4, vòng lặp `updateProjectiles` và `updateEnemies` quét `O(P × E)` / `O(N²)` kèm `[...this.enemies]` cấp phát hàng chục nghìn mảng rác/giây khi nhiều đạn đồng thời.
4. **Nguyên nhân gốc rễ**: Chưa tách mô-đun va chạm không gian Zero-GC riêng cho đạn và đội hình.
5. **Giải pháp đề xuất**: Triển khai **`SpatialHashGrid<T>`** (tự theo dõi `maxInsertedRadius` nên không bao giờ bỏ sót Boss khổng lồ `> 2.5u`) + trích xuất **`projectilePhysicsSystem.ts`** (phản xạ tường/trụ, bám mục tiêu, va chạm đạn & AoE Zero-GC) và nối vào `GameEngine.ts`.
6. **File hoặc module liên quan**: `src/engine/spatialHashGrid.ts`, `src/engine/projectilePhysicsSystem.ts`, `src/engine/tacticalCombatChoreography.ts`, `src/engine/GameEngine.ts`, `tools/benchmark-spatial-physics.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 3–4)
8. **Rủi ro khi thay đổi**: Sai bán kính quét ô lưới có thể bỏ sót Boss lớn — đã khóa chặt bằng `maxInsertedRadius` và test 300×40 brute-force parity.
9. **Tiêu chí nghiệm thu**: `spatialHashGrid.test.ts` + `projectilePhysicsSystem.test.ts` pass 100%; benchmark thực tế đạt **49,332/49,332** trùng khớp, nhanh hơn **8.09×**, 0 cấp phát mảng rác.
10. **Điểm sau khi triển khai và kiểm thử**: `91 / 100`

### 12. Enemy AI — Trí tuệ nhân tạo quái vật
1. **Điểm hiện tại (Trước)**: `78 / 100`
2. **Bằng chứng đánh giá**: `EnemySquadDirector` (`2–5` token tấn công, `≤ 3` ở Lite), `aaaEnemyCombatEngine.ts` (máy trạng thái **7 trạng thái `EnemyAiTacticalState`**: `patrol | chase | flank | attack | retreat | dodge | recovery`, phối hợp xạ thủ/pháp sư rút lui núp sau đồng đội Tiên Phong `vanguard`, cửa sổ hồi chiêu mở cho người chơi phản công `resolveMobRecoveryDuration`), và truy vấn lân cận `SpatialHashGrid` Zero-GC trong `GameEngine.ts`.
3. **Vấn đề tồn tại**: Trước Đợt 8, `computeAaaMobSteering` vẫn duyệt toàn bộ `enemySnapshot` O(N²) + `this.obstacles` chưa lọc vật cản nguyên vẹn, chưa có máy trạng thái chiến thuật 7 pha tường minh (`patrol`/`retreat`/`recovery` khi thấp máu hoặc sau đòn đánh) và chưa có phối hợp xạ thủ rút lui sau đồng đội Tiên Phong (`vanguard`).
4. **Nguyên nhân gốc rễ**: Hai điểm gọi điều hướng quái trong `GameEngine.ts` chưa tận dụng `enemySpatialGrid.queryRadius` + `intactObstacleScratch`, và `aaaEnemyCombatEngine.ts` thiếu lớp phối hợp vai trò & nhịp `recovery`.
5. **Giải pháp đề xuất**: Triển khai `EnemySquadDirector` (Đợt 2) và nâng cấp Đợt 8 trên **`src/engine/aaaEnemyCombatEngine.ts`** + **`src/engine/GameEngine.ts`**: máy trạng thái **7 pha** (`patrol`, `chase`, `flank`, `attack`, `retreat`, `dodge`, `recovery`), xạ thủ/pháp sư rút lui núp sau đồng đội `vanguard` khi bị áp sát hoặc `< 35% HP`, nhịp hồi phục `resolveMobRecoveryDuration` sau mỗi kỹ năng quái, và chuyển 100% truy vấn lân cận sang `enemySpatialGrid` + `intactObstacleScratch` Zero-GC.
6. **File hoặc module liên quan**: `src/engine/aaaEnemyCombatEngine.ts`, `src/engine/enemySquadDirector.ts`, `src/engine/GameEngine.ts`, `src/engine/wave8TacticalAndProgression.test.ts`, `src/engine/aaaEnemyCombatEngine.test.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 2 & Đợt 8)
8. **Rủi ro khi thay đổi**: Phải bảo đảm giữ nguyên hành vi mượt của toàn bộ 10 bài test AI cũ và giải phóng token tấn công ngay khi quái choáng/hạ gục.
9. **Tiêu chí nghiệm thu**: `wave8TacticalAndProgression.test.ts` (W8-1a/W8-1b), `aaaEnemyCombatEngine.test.ts` (10/10), `enemySquadDirector.test.ts` (4/4) pass 100% và chạy mượt trên live Chromium (`r8b-combat-ai.png`).
10. **Điểm sau khi triển khai và kiểm thử**: `91 / 100`

### 13. Boss Design — Thiết kế boss
1. **Điểm hiện tại (Trước)**: `84 / 100`
2. **Bằng chứng đánh giá**: Boss Chương 1–4 & Chương 10–12 có đầy đủ 3 giai đoạn (Phase I/II/III), vùng telegraph rõ ràng, cửa sổ phản công 2.5s, 12 bộ danh hiệu & mẹo khắc chế Hoàng Đạo độc bản (`ZODIAC_BOSS_PHASE_SIGNATURES`), Boss Codex đồng bộ 100%.
3. **Vấn đề tồn tại**: Phát hiện **lỗi gameplay thực tế tại `GameEngine.ts:20965`** khóa cứng điều kiện Pha III vào `chapter.id >= 10`, khiến Boss Hoàng Đạo Chương 1–4 không bao giờ vào Pha III ở `<= 30% HP` dù Boss Codex đã thiết kế đủ 3 pha; các thông báo chuyển pha vẫn dùng chữ chung chung.
4. **Nguyên nhân gốc rễ**: Điều kiện `canEnterPhaseThree` trong `GameEngine.ts` chưa được cập nhật sau khi mở rộng cơ chế 3 pha cho Chương 1–4 và chưa đọc chữ ký từng cung Hoàng Đạo.
5. **Giải pháp đề xuất**: Triển khai **`canBossEnterPhaseThree`** (kích hoạt Pha III cho Boss cuối Ch.1–4 & Ch.10–12 + Tháp Tầng ≥ 20, khóa an toàn với sub-boss) và **`ZODIAC_BOSS_PHASE_SIGNATURES`** (12 danh hiệu Pha II/III + 12 gợi ý khắc chế trực quan riêng cho Ch.1–12), nối thẳng vào `GameEngine.ts` trong Đợt 6; mô hình 3D Ch.5–12 tiếp tục theo lịch P2-5b/P3-2.
6. **File hoặc module liên quan**: `src/engine/tacticalCombatChoreography.ts`, `src/engine/wave6AnimationAndBoss.test.ts`, `src/engine/GameEngine.ts`, `src/data/earlyProgression.test.ts`, `tests/boss-patterns.test.mjs`.
7. **Mức độ ưu tiên**: P0 / P1 (Đã khắc phục triệt để trong Đợt 6)
8. **Rủi ro khi thay đổi**: Phải khóa chặt `e.kind === EnemyKind.ZODIAC_BOSS` để sub-boss giữa chương không vô tình kích hoạt Pha III làm lệch độ khó.
9. **Tiêu chí nghiệm thu**: `wave6AnimationAndBoss.test.ts` xác minh đủ 12 danh hiệu Pha II/III độc nhất & điều kiện `canBossEnterPhaseThree` chuẩn cho Ch.1–12 & Tháp; `boss-patterns.test.mjs` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `91 / 100`

### 14. Level Design — Thiết kế màn chơi
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: 12 chương chiến dịch × 12 phòng/chương + phòng Thiên Thần/Ác Quỷ + Vòng Quay May Mắn + Tháp Vô Tận + 4 cơ quan sàn đấu tương tác (`chapterArenaMechanisms.ts`) + Đấu trường GLB 100% High/Lite Ch.1–4.
3. **Vấn đề tồn tại**: Trước Đợt 5, mọi chương Ch.1–12 đều dùng trùng thứ tự bố trí chướng ngại vật (`courtyard → pillars → cross → gauntlet`) và dòng `eventAfter` Phòng 8 dùng `Math.random()` không tất định lúc nạp mô-đun; Ch.5–12 vẫn chờ tài sản 3D riêng ở P2-5b/P3-2.
4. **Nguyên nhân gốc rễ**: Công thức gán `obstaclePreset` chưa xoay vòng theo `ch.id` và còn nhánh ngẫu nhiên chết tại Phòng 8.
5. **Giải pháp đề xuất**: Chuẩn hóa tất định Phòng 8 (`eventAfter = 'devil'`) và xoay vòng bố cục đấu trường theo chương `presets[(s - 1 + (ch.id - 1)) % 4]` trong `src/data/chaptersData.ts` (giữ nguyên 100% FTUE Chương 1 trong khi Ch.2–12 mở màn bằng địa hình đa dạng) kết hợp lời khuyên chiến thuật địa hình cho đủ 12 chương.
6. **File hoặc module liên quan**: `src/data/chaptersData.ts`, `src/data/zodiacWorldLore.ts`, `src/data/zodiacWorldLore.test.ts`, `src/engine/chapterSceneDirector.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 5; Ch.5–12 3D ở P2-5b/P3-2)
8. **Rủi ro khi thay đổi**: Phải bảo toàn tuyệt đối thứ tự phòng Chương 1 để không phá vỡ FTUE và bộ kiểm định Ch.1.
9. **Tiêu chí nghiệm thu**: `zodiacWorldLore.test.ts` và `chapterSceneDirector.test.ts` pass 100%, 4 chương đầu khởi đầu bằng 4 bố cục vật cản riêng biệt.
10. **Điểm sau khi triển khai và kiểm thử**: `90 / 100`

### 15. World Building — Xây dựng thế giới
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: Vũ trụ 12 Cung Hoàng Đạo gắn kết trực tiếp giữa 4 Tướng, Bộ Sưu Tập Ch.1–4, Boss Codex, Chòm Sao, Thánh Tích, Biên Niên Sử 12 Chương (`zodiacWorldLore.ts`) và 8 cụm kiến trúc đền thờ 3D độc bản Ch.5–12 (`zodiacRealmArchitecture.ts`).
3. **Vấn đề tồn tại**: Trước Đợt 5–7, Boss Codex thiếu biên niên sử đầy đủ và khung cảnh 3D Ch.5–12 chưa phản ánh trực tiếp kiến trúc biểu tượng của từng cung.
4. **Nguyên nhân gốc rễ**: Chưa gắn biên niên sử 12 chương vào Sổ Tay và chưa có bộ công trình kể chuyện môi trường Ch.5–12.
5. **Giải pháp đề xuất**: Xây dựng `src/data/zodiacWorldLore.ts` hiển thị trong `CodexGuideModal.tsx`, chuẩn hóa di cư sang `'aurelia'`/`'solarius'`, và bổ sung 8 cụm biểu tượng kiến trúc 3D kể chuyện môi trường cho Ch.5–12 trong Đợt 7.
6. **File hoặc module liên quan**: `src/data/zodiacWorldLore.ts`, `src/engine/zodiacRealmArchitecture.ts`, `src/components/CodexGuideModal.tsx`, `src/data/earlyProgressionData.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 5–7)
8. **Rủi ro khi thay đổi**: Bảo đảm kiến trúc môi trường không chắn tầm nhìn và thẻ Codex cuộn gọn trên mọi độ phân giải.
9. **Tiêu chí nghiệm thu**: `zodiacWorldLore.test.ts` & `zodiacRealmArchitecture.test.ts` pass 100% cho cả 12/12 cung Hoàng Đạo.
10. **Điểm sau khi triển khai và kiểm thử**: `92 / 100`

### 16. Progression System — Hệ thống tăng tiến
1. **Điểm hiện tại (Trước)**: `82 / 100`
2. **Bằng chứng đánh giá**: `getEarlyProgressionPolicy`, tài khoản mới bắt đầu ở `702 LC` (dưới Ch.1 `1,350 LC`), trần phẩm chất khóa theo chương, lộ trình 30 ngày F2P (`fairProgression30Day.ts`), Tinh Tuý Hoàng Đạo 500 bậc, và hiển thị minh bạch 100% danh mục tiến trình mở khóa Tinh Linh / Cánh / Thú Cưỡi / Thánh Khí / Hào Quang Ch.1–4 (`chapterAssetVisibility.ts`).
3. **Vấn đề tồn tại**: `migrateSaveData` từng làm rớt `selectedHeroId` tướng Ch.2–4; trước đây các vật phẩm bộ sưu tập Ch.2–4 bị ẩn khỏi giao diện khiến người chơi không thấy rõ mục tiêu mở khóa theo chương.
4. **Nguyên nhân gốc rễ**: Thiếu hàm chuẩn hóa hiển thị và khóa theo chương thống nhất cho 5 danh mục sưu tầm và Phòng Thử Đồ.
5. **Giải pháp đề xuất**: Sửa triệt để `migrateSaveData`, bổ sung **Tinh Tuý Hoàng Đạo (500 bậc)**, và triển khai **`src/data/chapterAssetVisibility.ts`** hiển thị trọn bộ danh mục Ch.1–4 theo thứ tự tự nhiên kèm nhãn khóa rõ ràng (`Vượt Chương 2/3/4 để mở`) & nút `Xem 3D` không làm thay đổi chỉ số thật.
6. **File hoặc module liên quan**: `src/data/chapterAssetVisibility.ts`, `src/data/earlyProgressionData.ts`, `src/data/fairProgression30Day.ts`, `src/data/talentsData.ts`, `src/components/LobbyPanels.tsx`, `src/components/WardrobeModal.tsx`.
7. **Mức độ ưu tiên**: P0 / P1 / P2 (Đã hoàn thành)
8. **Rủi ro khi thay đổi**: Tuyệt đối không để `Xem 3D` ghi đè dữ liệu lưu hay cộng sớm chỉ số chiến đấu của vật phẩm chưa sở hữu.
9. **Tiêu chí nghiệm thu**: Tài khoản mới giữ nguyên `702 LC`, `chapterAssetVisibility.test.ts` (3/3) & `fairProgression30Day.test.ts` pass 100%, xác minh trực tiếp trên Chromium.
10. **Điểm sau khi triển khai và kiểm thử**: `91 / 100`

### 17. Economy System — Hệ thống kinh tế
1. **Điểm hiện tại (Trước)**: `72 / 100`
2. **Bằng chứng đánh giá**: Các nguồn thu/chi Vàng, Kim Cương, Bụi Sao, Lõi Tinh Linh đã có nhưng chưa có mô phỏng 8 mốc thời lượng (`5m → 100h`) để kiểm chứng lạm phát.
3. **Vấn đề tồn tại**: Khi xây dựng bộ mô phỏng thực tế lần đầu, phát hiện lạm phát tồn kho Vàng ở mốc `100h`: `Gold Sink Ratio = 53.5%` (dư ~6.24M Vàng chưa có chỗ tiêu).
4. **Nguyên nhân gốc rễ**: Không có Gold Sink mở rộng theo hàm mũ sau khi 8 Thiên Phú chạm tổng Lv.160 và đồ Thần Thoại chạm Lv.80.
5. **Giải pháp đề xuất**: Xây dựng bộ mô phỏng 8 mốc `economyTelemetry.ts` + CLI `tools/simulate-playtime-milestones.ts`, đồng thời triển khai Gold Sink thật **Tinh Tuý Hoàng Đạo** (`18,000 + lv*3,200 + lv^1.58*380` Vàng/bậc) tích hợp vào UI và `computePlayerStats`.
6. **File hoặc module liên quan**: `src/data/economyTelemetry.ts`, `tools/simulate-playtime-milestones.ts`, `src/data/talentsData.ts`, `src/components/TalentsModal.tsx`, `src/data/economyTelemetry.test.ts`.
7. **Mức độ ưu tiên**: P1
8. **Rủi ro khi thay đổi**: Chi phí tăng quá chậm sẽ không hút hết Vàng dư; tăng quá nhanh sẽ khiến người chơi Endgame không bấm nâng được.
9. **Tiêu chí nghiệm thu**: Mô phỏng 8 mốc (`seed=20260410`) đạt `Gold Sink Ratio >= 75%` ở mốc 100h (thực tế đạt **`99.8%`**, Paragon Bậc `44/500`, **`0` cảnh báo**), tiền tệ không bao giờ âm.
10. **Điểm sau khi triển khai và kiểm thử**: `91 / 100`

### 18. Loot System — Hệ thống vật phẩm
1. **Điểm hiện tại (Trước)**: `83 / 100`
2. **Bằng chứng đánh giá**: 5 bậc phẩm chất, 5 Bộ Trang Bị (Set Bonus 2/3 món), Pity chống xui, phân giải đồ thừa ra Mảnh Rèn mục tiêu (`salvageExcessGearToForgeShards`), chuyển cấp cường hóa miễn phí 100%, `LootOrbVisualCache` Zero-GPU-Churn, và bộ so sánh chi tiết từng chỉ số + chuyển đổi Bộ Trang Bị (`computeGearComparison` trong Đợt 8).
3. **Vấn đề tồn tại**: Trước Đợt 8, khi chọn món trang bị mới trong Kho Đồ, giao diện chỉ báo chênh lệch LC tổng (`▲ +LC`), chưa hiển thị chênh lệch từng chỉ số thực (`ATK/HP/Crit/Tốc bắn/Giáp` bao gồm dòng phụ & ngọc khảm) cũng như cảnh báo **+Kích hoạt / -Mất hiệu ứng Bộ Trang Bị**.
4. **Nguyên nhân gốc rễ**: `LobbyPanels.tsx` chưa có hàm so sánh đầy đủ giữa món đang mặc và món dự kiến thay kèm mô phỏng `evaluateEquippedGearSets` trước/sau.
5. **Giải pháp đề xuất**: Triển khai **`LootOrbVisualCache`** (Đợt 6) và **`computeGearComparison`** (`src/data/gearData.ts` + `src/components/LobbyPanels.tsx` Đợt 8) tính chính xác `ΔLC`, `ΔATK/ΔHP/ΔCrit/ΔTốc bắn/ΔGiáp`, đề xuất `Nên Đổi / Yếu Hơn`, và mọi chuyển đổi kích hoạt/mất mốc 2/3 món Bộ Trang Bị.
6. **File hoặc module liên quan**: `src/data/gearData.ts`, `src/components/LobbyPanels.tsx`, `src/engine/vfxPoolManager.ts`, `src/engine/wave8TacticalAndProgression.test.ts`, `src/data/economyTelemetry.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 6 & Đợt 8)
8. **Rủi ro khi thay đổi**: Phải tính đủ dòng phụ (`crit_pct`/`aspd_pct`/`move_pct`/`dr_pct`) + ngọc khảm và không làm thay đổi trạng thái lưu thật khi chỉ xem so sánh.
9. **Tiêu chí nghiệm thu**: `wave8TacticalAndProgression.test.ts` (W8-3) xác minh tăng/mất Bộ 2 món Echo Set & chênh lệch chỉ số chuẩn; `wave6AnimationAndBoss.test.ts` & `economyTelemetry.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `91 / 100`

### 19. Difficulty Scaling — Tăng tiến độ khó
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: 12 chương tăng từ `1,350 LC → 285,000 LC`, `computePowerPressure`, Nightmare Ascension I–V & 5 biến dị phòng, nhịp chuyển Pha II/III chuẩn xác cho Boss Hoàng Đạo Ch.1–4, Ch.10–12 & Tháp F20+, và nhịp hồi phục chiến thuật quái thường `resolveMobRecoveryDuration` giảm dần từ Chương 1 (dễ đọc, rộng cửa sổ phản công) đến Chương 12 (gắt hơn bằng nhịp AI thay vì chỉ tăng HP).
3. **Vấn đề tồn tại**: Trước Đợt 6–8, Boss cuối Ch.1–4 bị khóa Pha III và quái thường chưa có đường cong nhịp hồi phục hậu tấn công (`recovery`) điều chỉnh theo chương.
4. **Nguyên nhân gốc rễ**: Điều kiện `chapter.id >= 10` trước đây chặn Pha III ở Ch.1–4 và AI quái thường thiếu cửa sổ `recovery` theo độ khó chương.
5. **Giải pháp đề xuất**: Bổ sung `estimateCombatTimings`, mở chuẩn Pha III bằng `canBossEnterPhaseThree` (Đợt 6), và nối `resolveMobRecoveryDuration(kind, chapterId)` + phối hợp rút lui núp sau `vanguard` (Đợt 8) để độ khó tăng bằng chiều sâu chiến thuật AI.
6. **File hoặc module liên quan**: `src/engine/aaaEnemyCombatEngine.ts`, `src/engine/tacticalCombatChoreography.ts`, `src/engine/GameEngine.ts`, `src/data/economyTelemetry.ts`, `GAME_BALANCE_REPORT.md`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 6 & Đợt 8)
8. **Rủi ro khi thay đổi**: Công thức mô phỏng TTK chỉ phản ánh lý thuyết DPS — vẫn cần xác nhận cảm nhận né đòn từ playtest người thật (P3-1).
9. **Tiêu chí nghiệm thu**: Bảng TTK/TTD chính xác cho cả 8 mốc, Boss Ch.1–4 & Ch.10–12 kích hoạt đủ Pha II/III, `resolveMobRecoveryDuration` giảm đơn điệu Ch.1 → Ch.12 (`wave8TacticalAndProgression.test.ts` pass).
10. **Điểm sau khi triển khai và kiểm thử**: `91 / 100`

### 20. UI/UX — Giao diện và trải nghiệm người dùng
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: Giao diện Celestial Gold thống nhất, Zero-Pill, 0 `backdrop-blur` đè WebGL, 0 chấm `animate-pulse`, HUD tách khỏi vòng 60Hz, hiển thị đầy đủ 100% danh mục sưu tầm Ch.1–4 kèm `Xem 3D`, đồng bộ sống 8 phím tắt tùy biến trên `GameHUD.tsx`, và trong Đợt 8 bổ sung so sánh chỉ số chi tiết + Bộ Trang Bị trên `LobbyPanels.tsx` cùng dự báo Ngã Rẽ Tiến Hóa trực tiếp trên thẻ Tarot `SkillDraftModal.tsx`.
3. **Vấn đề tồn tại**: Trước Đợt 7–8, nhãn phím `F`/`X` trên HUD gắn cứng, khung so sánh đồ mới chỉ hiện chênh lệch LC tổng và thẻ chọn kỹ năng chưa báo rõ nhánh Tiến Hóa sắp mở.
4. **Nguyên nhân gốc rễ**: Thiếu hàm tính chênh lệch trang bị chi tiết (`computeGearComparison`) và hàm dự báo tiến hóa trên thẻ chọn kỹ năng (`getSkillEvolutionPreview`).
5. **Giải pháp đề xuất**: Hoàn thiện trọn bộ UX chiến đấu & kho đồ trong Đợt 7–8 (`GameHUD.tsx`, `LobbyPanels.tsx`, `SkillDraftModal.tsx`, `WardrobeModal.tsx`, `SettingsModal.tsx`), kiểm chứng sống bằng Chromium (`r7-*.png`, `r8b-equipment.png`, `r8b-skill-draft.png`, `r8b-combat-ai.png`).
6. **File hoặc module liên quan**: `src/components/LobbyPanels.tsx`, `src/components/SkillDraftModal.tsx`, `src/components/WardrobeModal.tsx`, `src/components/GameHUD.tsx`, `src/components/SettingsModal.tsx`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 7 & Đợt 8)
8. **Rủi ro khi thay đổi**: Phải giữ thẻ Tarot và ngăn Kho Đồ gọn gàng, không tràn chiều dọc ở độ phân giải `1440×900` và di động.
9. **Tiêu chí nghiệm thu**: Headless Chromium (`1440×900`) xác minh 0 lỗi console, 0 `backdrop-blur`, 8 phím tắt trên HUD/Settings, so sánh trang bị và dự báo Tiến Hóa hiển thị sắc nét.
10. **Điểm sau khi triển khai và kiểm thử**: `92 / 100`

### 21. Game Feel — Cảm giác chơi
1. **Điểm hiện tại (Trước)**: `82 / 100`
2. **Bằng chứng đánh giá**: `combatFeel.ts` (Hitstop, Camera Shake trauma, recoil, kill burst), `combatAnimationKinematics.ts` (nghiêng thân khi Lướt, nhún nâng người khi tung Kỹ năng `E` / Phá Giáp `F`, đáp đất khi vào trận, gục ngã mượt), tách riêng `reduceScreenFlash` (`flashScale = 0.25`), và **Đệm Phím 5 Hành Động (`140ms`)** phủ trọn Lướt / Kỹ Năng / Phá Giáp / Tuyệt Kỹ / Thức Tỉnh Vũ Khí.
3. **Vấn đề tồn tại**: Trước Đợt 7, bấm sớm `Phá Giáp Trảm (F)` hoặc `Thức Tỉnh Vũ Khí (X)` sát mép hồi chiêu bị rớt thao tác.
4. **Nguyên nhân gốc rễ**: `CombatInputBuffer` mới chỉ phủ 3 hành động và chưa xả đệm khi mất tiêu điểm / chuyển phòng.
5. **Giải pháp đề xuất**: Mở rộng `CombatInputBuffer` trong `aaaFivePillarsDirector.ts` lên đầy đủ 5 hành động chiến đấu (`140ms`), nối vào `GameEngine.ts` cùng xả sạch đệm khi `onWindowBlur`/`clearCombatEntities`.
6. **File hoặc module liên quan**: `src/engine/aaaFivePillarsDirector.ts`, `src/engine/combatAnimationKinematics.ts`, `src/engine/GameEngine.ts`, `src/engine/zodiacRealmArchitecture.test.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 7)
8. **Rủi ro khi thay đổi**: Phải đảm bảo mỗi thao tác đệm chỉ tiêu thụ đúng 1 lần và không bị trôi sang phòng tiếp theo.
9. **Tiêu chí nghiệm thu**: Unit test xác minh đầy đủ đệm phím 5 hành động + giảm biên độ `reducedMotion` pass 100%, kiểm chứng thao tác trực tiếp trên Chromium.
10. **Điểm sau khi triển khai và kiểm thử**: `91 / 100`

### 22. Performance — Hiệu năng
1. **Điểm hiện tại (Trước)**: `76 / 100`
2. **Bằng chứng đánh giá**: Auto-detect Intel HD 4000 (`aaaVisualPipeline.ts`), GPU Thermal Watchdog Stage 0→4 (`gpuThermalWatchdog.ts`), 0-PointLight Shader Policy, Zero-GC `SpatialHashGrid`, `projectilePhysicsSystem.ts`, `VfxFrameBudgetCache`, `LootOrbVisualCache`, và **`GroundTelegraphVisualPool`** (Đợt 7) cùng kiến trúc Ch.5–12 Lite giảm đỉnh (`0 PointLights`).
3. **Vấn đề tồn tại**: Trước Đợt 7, mỗi lần bẫy sàn đấu (`arenaHazards`) hoặc vụ nổ tinh anh (`volatileBlasts`) xuất hiện giữa giao tranh đều tạo mới `RingGeometry` + `CircleGeometry` + 2× `MeshBasicMaterial` rồi hủy GPU buffer ngay sau 0.5–1.25s.
4. **Nguyên nhân gốc rễ**: Hai vòng hiệu ứng cảnh báo sàn đấu chưa được nối qua bể hình học dùng chung.
5. **Giải pháp đề xuất**: Triển khai **`GroundTelegraphVisualPool`** trong `src/engine/vfxPoolManager.ts` (dùng chung đúng 2 hình học chuẩn tái sử dụng tối đa 16 slot, 0 cấp phát GPU giữa trận, chỉ `dispose()` một lần khi đóng engine) bên cạnh 0-PointLights, SpatialHashGrid nhanh hơn **7.05×–8.09×**, `VfxFrameBudgetCache`, và `LootOrbVisualCache`.
6. **File hoặc module liên quan**: `src/engine/vfxPoolManager.ts`, `src/engine/zodiacRealmArchitecture.ts`, `src/engine/zodiacLightingVfxDirector.ts`, `src/engine/spatialHashGrid.ts`, `src/engine/projectilePhysicsSystem.ts`, `PERFORMANCE_REPORT.md`.
7. **Mức độ ưu tiên**: P0 / P2 (Đã hoàn thành Đợt 1–7)
8. **Rủi ro khi thay đổi**: Cần bảo đảm hoàn trả slot an toàn cả khi hiệu ứng hết giờ, khi đổi phòng và khi đóng engine.
9. **Tiêu chí nghiệm thu**: 0 PointLights ở E5430/Lite/Watchdog ≥ 2, `GroundTelegraphVisualPool` pass 100% (40 lần tạo chỉ dùng đúng 2 shared geometry), benchmark CPU triệt tiêu 180,000 mảng rác; đo nhiệt vật lý Dell E5430 60 phút ghi nhận ở P3-1.
10. **Điểm sau khi triển khai và kiểm thử**: `94 / 100`

### 23. Code Architecture — Kiến trúc mã nguồn
1. **Điểm hiện tại (Trước)**: `72 / 100`
2. **Bằng chứng đánh giá**: Tách biệt rõ lớp dữ liệu (`src/data/`), âm thanh (`src/audio/`), dịch vụ (`src/services/`), máy chủ (`server.ts`, `src/server/`), và các mô-đun engine thuần túy có unit test độc lập.
3. **Vấn đề tồn tại**: `src/engine/GameEngine.ts` và `src/App.tsx` có độ tập trung cao từ nhiều đợt mở rộng nhanh.
4. **Nguyên nhân gốc rễ**: Nhiều vòng lặp VFX, vật lý đạn, đội hình, kiến trúc đấu trường và logic hiển thị trước đây nằm chung trong tệp lõi.
5. **Giải pháp đề xuất**: Hoàn tất trọn bộ **`P2-3a`, `P2-3b`, `P2-3c` & `P2-3d`**: trích xuất **`spatialHashGrid.ts`**, **`projectilePhysicsSystem.ts`**, **`vfxPoolManager.ts`** (8 pool Zero-GC + `VfxFrameBudgetCache` + `LootOrbVisualCache` + `GroundTelegraphVisualPool`), **`zodiacRealmArchitecture.ts`** (kiến trúc 3D Ch.5–12), **`chapterAssetVisibility.ts`**, **`enemySquadDirector.ts`**, **`chapterArenaMechanisms.ts`**, **`zodiacLightingVfxDirector.ts`**, **`zodiacMusicDirector.ts`**, và **`zodiacWorldLore.ts`** với 100% unit test độc lập.
6. **File hoặc module liên quan**: `src/engine/zodiacRealmArchitecture.ts`, `src/engine/vfxPoolManager.ts`, `src/data/chapterAssetVisibility.ts`, `src/engine/projectilePhysicsSystem.ts`, `src/engine/spatialHashGrid.ts`, `src/engine/GameEngine.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành `P2-3a` → `P2-3d`)
8. **Rủi ro khi thay đổi**: Tách mô-đun engine cần giữ đúng vòng đời giải phóng GPU và tương thích các bộ test giả lập.
9. **Tiêu chí nghiệm thu**: `tsc --noEmit` 0 lỗi, Vite build sạch, toàn bộ mô-đun trích xuất pass 100% unit test & kiểm chứng live Chromium.
10. **Điểm sau khi triển khai và kiểm thử**: `91 / 100`

### 24. Asset Pipeline — Quy trình quản lý tài nguyên
1. **Điểm hiện tại (Trước)**: `79 / 100`
2. **Bằng chứng đánh giá**: Backblaze B2 + Cloudflare Worker CDN, `scripts/glb-manifest.json` quản lý 173 tệp (126 active), `glbPipelineValidator.ts`, `testGlbManifestHelper.ts`, `/admin/assets`.
3. **Vấn đề tồn tại**: Trước đây thiếu 1 cặp Lite ở Ch.2 và 27 test GLB báo `ENOENT` trên môi trường CDN-only.
4. **Nguyên nhân gốc rễ**: Cần đối cặp đủ High/Lite trong manifest và kiểm định manifest thay vì chỉ đọc nhị phân trên đĩa.
5. **Giải pháp đề xuất**: Hoàn tất **P2-1 & P2-2**: đạt **`100%` đối cặp High/Lite (`63/63` cặp)**, `status: healthy`, `e5430Safe: true`, **`0` lỗi / `0` cảnh báo**, tổng gói Lite `31.88 MB`, và 0 `ENOENT` toàn suite.
6. **File hoặc module liên quan**: `scripts/glb-manifest.json`, `src/engine/glbPipelineValidator.ts`, `src/engine/testGlbManifestHelper.ts`, `src/data/assetRegistry.test.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành P2-1 & P2-2)
8. **Rủi ro khi thay đổi**: Sai đường dẫn manifest gây 404 mô hình — đã khóa bằng `assetRegistry.test.ts` và `glb-pipeline-and-liveops-rollback.test.mjs`.
9. **Tiêu chí nghiệm thu**: `validateGlbPipelineManifest` trả `pairCoveragePct: 100`, `issues: []`, `e5430Safe: true`.
10. **Điểm sau khi triển khai và kiểm thử**: `91 / 100`

### 25. Replayability — Giá trị chơi lại
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: 4 tướng Hoàng Đạo với lối chơi khác nhau, 40+ kỹ năng roguelike + 12 nhánh Tiến Hóa Boss/AoE hiển thị dự báo rõ trên thẻ Tarot (`SkillDraftModal.tsx`), 5 Bộ Trang Bị có so sánh kích hoạt bộ trực quan, Tháp Vô Tận, Nightmare Ascension I–V + 5 Mutators, Đấu Trường Cân Bằng.
3. **Vấn đề tồn tại**: Trước đây tướng Sylvia thiếu kỹ năng đặc trưng, người chơi Endgame thiếu động lực tiêu Vàng sau 60h, và người chơi khó chủ động săn đủ 12 nhánh Tiến Hóa kỹ năng khi chọn thẻ.
4. **Nguyên nhân gốc rễ**: Trùng hiệu ứng kỹ năng chủ động, trần Thiên Phú cố định và thiếu dự báo nhánh Tiến Hóa trên thẻ chọn kỹ năng.
5. **Giải pháp đề xuất**: Bổ sung `'jade_bastion'`, mở **Tinh Tuý Hoàng Đạo 500 bậc**, và trong Đợt 8 gắn **`getSkillEvolutionPreview`** trực tiếp lên thẻ chọn kỹ năng + hiển thị danh sách Tiến Hóa đang bật giúp mỗi lượt chơi hình thành nhiều lối build (Boss vs AoE) rõ rệt hơn.
6. **File hoặc module liên quan**: `src/engine/skillEvolutionEngine.ts`, `src/components/SkillDraftModal.tsx`, `src/data/phase5Data.ts`, `src/data/talentsData.ts`, `src/engine/GameEngine.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 8)
8. **Rủi ro khi thay đổi**: Cần cân bằng sát thương Boss của Paragon (+0.2%/bậc, trần +40%) để không biến Nightmare Tier V thành quá dễ.
9. **Tiêu chí nghiệm thu**: Kiểm chứng bằng unit test (`wave8TacticalAndProgression.test.ts`, `economyTelemetry.test.ts`) và live Chromium (`r8b-skill-draft.png`).
10. **Điểm sau khi triển khai và kiểm thử**: `90 / 100`

### 26. Player Retention — Khả năng giữ chân người chơi
1. **Điểm hiện tại (Trước)**: `78 / 100`
2. **Bằng chứng đánh giá**: FTUE Ch.1 chặt chẽ (`5m → 30m`), lộ trình công bằng 30 ngày (`FAIR_30DAY_MILESTONES`), nhiệm vụ ngày, chuyển cấp miễn phí giảm ma sát tâm lý, hiển thị đầy đủ 100% mục tiêu sưu tầm Tinh Linh / Cánh / Thú Cưỡi / Thánh Khí / Hào Quang Ch.1–4 kèm `Xem 3D` ngay từ ngày đầu, không dùng dark pattern.
3. **Vấn đề tồn tại**: **Chưa có dữ liệu giữ chân thực tế D1 / D7 / D30 từ người chơi thật** (chưa xác minh live).
4. **Nguyên nhân gốc rễ**: Dự án đang ở giai đoạn hoàn thiện kỹ thuật trước khi mở Beta thu thập hành vi người dùng.
5. **Giải pháp đề xuất**: Khóa chặt trải nghiệm 5m → 100h bằng mô phỏng có seed, minh bạch mục tiêu sưu tầm Ch.1–4 bằng xem thử 3D trực tiếp, và bổ sung mục tiêu Endgame rõ ràng; ghi rõ chỉ số D1/D7/D30 thực tế chờ đo ở P3-1.
6. **File hoặc module liên quan**: `src/data/chapterAssetVisibility.ts`, `src/data/economyTelemetry.ts`, `src/data/fairProgression30Day.ts`, `GAME_PROGRESSION_DESIGN.md`.
7. **Mức độ ưu tiên**: P1 / P3
8. **Rủi ro khi thay đổi**: Nhầm lẫn giữa kết quả mô phỏng toán học với tỷ lệ giữ chân thực tế — phải luôn tách bạch trong báo cáo.
9. **Tiêu chí nghiệm thu**: Tất cả 8 mốc chơi đều có mục tiêu kế tiếp rõ ràng, 0 cảnh báo lạm phát, phân định minh bạch mô phỏng vs live.
10. **Điểm sau khi triển khai và kiểm thử**: `85 / 100` *(D1/D7/D30 live: chưa xác minh thực địa)*

### 27. Accessibility — Khả năng tiếp cận
1. **Điểm hiện tại (Trước)**: `74 / 100`
2. **Bằng chứng đánh giá**: Tùy chỉnh cỡ chữ UI (`100% / 115% / 130%`), bảng màu mù màu (`colorblindTelegraphs.ts`), giảm rung, giảm chuyển động (kể cả giảm 75% biên độ kiến trúc Ch.5–12), Anti-Flash độc lập (`reduceScreenFlash`), hỗ trợ Gamepad API, vùng `aria-live="polite"`, và **trọn bộ 8 phím tắt chiến đấu PC tùy biến** (tự hoán đổi chống trùng phím & khóa bảo vệ cụm di chuyển WASD/Mũi tên).
3. **Vấn đề tồn tại**: Trước Đợt 7, `Phá Giáp Trảm (F)` và `Thức Tỉnh Vũ Khí (X)` còn gắn cứng không thể đổi phím trong `SettingsModal.tsx`.
4. **Nguyên nhân gốc rễ**: `CombatKeybindAction` trước đây mới khai báo 6/8 thao tác chiến đấu.
5. **Giải pháp đề xuất**: Mở rộng `CombatKeybindAction` & `COMBAT_KEYBIND_META` lên đủ **8/8 thao tác chiến đấu PC**, bảo toàn tương thích ngược save cũ, và cập nhật động nhãn phím trên `GameHUD.tsx`.
6. **File hoặc module liên quan**: `src/types/game.ts`, `src/engine/aaaWave6Director.ts`, `src/components/SettingsModal.tsx`, `src/components/GameHUD.tsx`, `src/engine/GameEngine.ts`, `src/App.tsx`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 7)
8. **Rủi ro khi thay đổi**: Bảo đảm save cũ không có khóa `heavyBreak`/`overdrive` tự động điền mặc định `KeyF`/`KeyX` không xung đột.
9. **Tiêu chí nghiệm thu**: Đủ 8 phím tắt hiển thị và gán lại trực tiếp trong `SettingsModal.tsx` (kiểm chứng live Chromium `r7-settings-keybinds.png`), `aria-live="polite"` hiện diện trên DOM thật.
10. **Điểm sau khi triển khai và kiểm thử**: `92 / 100`

### 28. Security & Anti-Cheat — Bảo mật và chống gian lận
1. **Điểm hiện tại (Trước)**: `74 / 100`
2. **Bằng chứng đánh giá**: `firestore.rules` (7 blueprint, 0 lỗi ESLint), xác thực Firebase ID Token ở `server.ts`, rate limiter API, kẹp tải trọng WebSocket, không lộ bí mật trên frontend.
3. **Vấn đề tồn tại**: Thiếu giám sát bất thường tập trung, `saveIntegrity.ts` còn fallback legacy `'artemis'` và chưa kẹp trần đầy đủ; xuất tệp `.JSON` Save thủ công chưa có lớp kiểm tra checksum chống sửa tay và `handleImportSave` chưa chạy lại lớp sanitization.
4. **Nguyên nhân gốc rễ**: Lớp bảo vệ trước đây chỉ áp dụng checksum FNV-1a cho chuỗi `ABW5` mà bỏ qua tệp `.JSON` và luồng import trực tiếp.
5. **Giải pháp đề xuất**: Triển khai `SecurityAnomalyTracker` (ring buffer 200 sự kiện) + `GET /api/admin/security-anomalies`, chuẩn xuất/nhập **`aetherbow_save_v2` (JSON-V2)** có checksum FNV-1a chống giả mạo (giữ 100% tương thích ngược JSON cũ), và gắn `validateAndSanitizeSaveIntegrity` làm lớp phòng vệ sâu tại cả `decodeSaveTransferCode` lẫn `handleImportSave`.
6. **File hoặc module liên quan**: `src/server/serverSecurity.ts`, `src/server/serverSecurity.test.ts`, `server.ts`, `src/data/saveIntegrity.ts`, `src/data/saveIntegrity.test.ts`, `src/data/phase5Data.ts`, `src/components/SettingsModal.tsx`, `src/App.tsx`, `firestore.rules`.
7. **Mức độ ưu tiên**: P0 / P1 / P2 (Đã hoàn thành)
8. **Rủi ro khi thay đổi**: Kẹp trần sai có thể làm hụt dữ liệu hợp lệ hoặc từ chối nhầm tệp JSON cũ của người chơi.
9. **Tiêu chí nghiệm thu**: Tệp JSON-V2 bị sửa `gold` bị chặn ngay cả trong unit test lẫn live Chromium UI, tệp JSON cũ vẫn nhập bình thường và được kẹp biên an toàn, `npx eslint firestore.rules` = 0 lỗi.
10. **Điểm sau khi triển khai và kiểm thử**: `91 / 100`

### 29. Quality Assurance — Kiểm thử chất lượng
1. **Điểm hiện tại (Trước)**: `70 / 100`
2. **Bằng chứng đánh giá**: Toàn bộ bộ kiểm thử `node:test` (`src/**/*.test.ts` + `tests/*.test.mjs`), benchmark hiệu năng `tools/benchmark-spatial-physics.ts`, mô phỏng 8 mốc `tools/simulate-playtime-milestones.ts`, kiểm định `firestore.rules` và kiểm chứng trình duyệt sống Chromium (`playwright-cli`).
3. **Vấn đề tồn tại**: Trước đây có lỗi lệch contract Ch.3–4, thiếu regression gate cho Paragon/Security/Spatial Physics/LiveOps Schedule/Ch.5–12 Landmarks/GroundTelegraphPool, và lỗi `ENOENT` CDN.
4. **Nguyên nhân gốc rễ**: Cập nhật tính năng nhanh chưa đồng bộ toàn bộ regression gate.
5. **Giải pháp đề xuất**: Khắc phục 100% lỗi gốc, bổ sung test cho `wave8TacticalAndProgression`, `zodiacRealmArchitecture`, `GroundTelegraphVisualPool`, `chapterAssetVisibility`, `SpatialHashGrid`, `projectilePhysicsSystem`, `zodiacMusicDirector`, `liveOpsConfig` (P2-4b), `EnemySquadDirector`, `serverSecurity`, `saveIntegrity` và kiểm chứng trực tiếp Kho Đồ, Thẻ Tarot Tiến Hóa, Cài Đặt 8 Phím & giao tranh 3D trên trình duyệt thật.
6. **File hoặc module liên quan**: `tests/*.test.mjs`, `src/**/*.test.ts`, `tools/benchmark-spatial-physics.ts`, `tools/simulate-playtime-milestones.ts`, `QA_TEST_REPORT.md`.
7. **Mức độ ưu tiên**: P0 / P1 / P2 (Đã hoàn thành Đợt 1–8)
8. **Rủi ro khi thay đổi**: Mọi cải tiến mới bắt buộc chạy lại full suite và trình duyệt sống để chống regression.
9. **Tiêu chí nghiệm thu**: Toàn bộ kho mã nguồn đạt **`458 bài kiểm thử | 450 PASS | 0 FAIL | 8 skip`**, `tsc --noEmit` 0 lỗi, Vite build sạch, live Chromium 0 lỗi console / 0 cảnh báo.
10. **Điểm sau khi triển khai và kiểm thử**: `95 / 100`

### 30. Live Operations — Vận hành và mở rộng
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: Bảng quản trị `/admin/assets`, `AssetAdminLiveOpsTab.tsx`, `src/data/liveOpsConfig.ts`, `liveOpsConfigService.ts`, `firestore.rules` (đã deploy live).
3. **Vấn đề tồn tại**: Trước Đợt 3, chưa có hẹn giờ bật/tắt sự kiện tự động theo khung giờ (P2-4b) và chưa có Preset sự kiện nhanh.
4. **Nguyên nhân gốc rễ**: Schema LiveOps & Firestore rules trước đây chưa có trường thời gian `scheduledStartMs`/`scheduledEndMs`.
5. **Giải pháp đề xuất**: Triển khai trọn bộ **P2-4b**: `scheduledStartMs`/`scheduledEndMs` + `resolveEffectiveLiveOpsConfig` (tự bật trong khung giờ, hoàn nguyên `1.0×` ngoài khung giờ), bộ `LIVEOPS_PRESETS`, JSON rollback parser, chọn lịch `datetime-local` trên `AssetAdminLiveOpsTab.tsx`, bảng **Giám Sát An Ninh**, và cập nhật + deploy `firestore.rules`.
6. **File hoặc module liên quan**: `src/data/liveOpsConfig.ts`, `src/services/liveOpsConfigService.ts`, `src/components/AssetAdminLiveOpsTab.tsx`, `firebase-blueprint.json`, `firestore.rules`, `tests/liveops-config.test.mjs`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành P2-4b)
8. **Rủi ro khi thay đổi**: Quy tắc Firestore phải kiểm tra chặt `scheduledEndMs == 0 || scheduledEndMs >= scheduledStartMs` và chỉ cho Admin xác thực ghi.
9. **Tiêu chí nghiệm thu**: `liveops-config.test.mjs` pass 100%, `npx eslint firestore.rules` = 0 lỗi, rules deployed live, tương thích ngược 100% save & config cũ.
10. **Điểm sau khi triển khai và kiểm thử**: `91 / 100`

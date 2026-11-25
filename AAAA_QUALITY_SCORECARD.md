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
| **Progression, Economy & Loot** | 16, 17, 18 | 20% | 79.00 | 89.67 | 15.80 | 17.93 | **+2.13** |
| **Gameplay, Combat & Skill** | 01, 02, 03, 04 | 20% | 81.25 | 87.50 | 16.25 | 17.50 | **+1.25** |
| **Animation, VFX, SFX & Music** | 05, 06, 07, 08 | 15% | 78.75 | 89.25 | 11.81 | 13.39 | **+1.58** |
| **Enemy AI, Boss & Difficulty** | 12, 13, 19 | 10% | 80.67 | 89.00 | 8.07 | 8.90 | **+0.83** |
| **Performance & Architecture** | 22, 23 | 10% | 74.00 | 90.50 | 7.40 | 9.05 | **+1.65** |
| **Graphics, Art & World Design** | 09, 10, 15 | 5% | 80.67 | 86.33 | 4.03 | 4.32 | **+0.29** |
| **Game Feel, UI/UX & Accessibility** | 20, 21, 27 | 5% | 78.67 | 87.67 | 3.93 | 4.38 | **+0.45** |
| **Replayability & Retention** | 25, 26 | 5% | 79.00 | 85.50 | 3.95 | 4.28 | **+0.33** |
| **Physics, Level & Asset Pipeline** | 11, 14, 24 | 5% | 80.33 | 90.00 | 4.02 | 4.50 | **+0.48** |
| **Security, QA & Live Operations** | 28, 29, 30 | 5% | 74.67 | 92.00 | 3.73 | 4.60 | **+0.87** |
| **TỔNG ĐIỂM TRỌNG SỐ** | **30 / 30 tiêu chí** | **100%** | — | — | **78.99 / 100** | **88.85 / 100** | **+9.86** |

---

## 3. Đánh Giá Chi Tiết 30 Tiêu Chí (Đủ 10 Trường Bắt Buộc / Tiêu Chí)

### 01. Game Design — Thiết kế trò chơi
1. **Điểm hiện tại (Trước)**: `84 / 100`
2. **Bằng chứng đánh giá**: 4 tướng Hoàng Đạo (`heroesData.ts`), 12 chương chiến dịch (`chaptersData.ts`), hệ thống Roguelike skill draft (`skillsData.ts`), Tháp Vô Tận, Nightmare Ascension I–V (`phase5Data.ts`).
3. **Vấn đề tồn tại**: Tướng Sylvia dùng trùng hiệu ứng kỹ năng chủ động với Aurelia; thiếu mục tiêu tiêu Vàng rõ ràng ở giai đoạn sau 60h.
4. **Nguyên nhân gốc rễ**: Nội dung Ch.3–4 được mở rộng nhanh nhưng nhánh hiệu ứng riêng của Sylvia và sink Endgame chưa tách biệt hoàn toàn.
5. **Giải pháp đề xuất**: Triển khai kỹ năng độc nhất `'jade_bastion'` cho Sylvia và hệ thống **Tinh Tuý Hoàng Đạo** (`paragonInfusionLevel`) sau khi chạm trần 160/160 Thiên Phú hoặc Chương 12.
6. **File hoặc module liên quan**: `src/data/phase5Data.ts`, `src/data/talentsData.ts`, `src/engine/GameEngine.ts`, `src/components/TalentsModal.tsx`.
7. **Mức độ ưu tiên**: P1
8. **Rủi ro khi thay đổi**: Có thể lệch biên cân bằng DPS ±12% giữa các tướng hoặc ảnh hưởng sớm đầu game nếu mở khóa sai điều kiện.
9. **Tiêu chí nghiệm thu**: 4 tướng có 4 `effectKind` khác nhau, `earlyProgression.test.ts` pass ±12% DPS, Paragon khóa hoàn toàn trước Ch.12 / 160 Thiên Phú.
10. **Điểm sau khi triển khai và kiểm thử**: `88 / 100`

### 02. Core Gameplay Loop — Vòng lặp gameplay
1. **Điểm hiện tại (Trước)**: `82 / 100`
2. **Bằng chứng đánh giá**: Vòng lặp Chiến đấu → Nhặt đồ/Vàng → Nâng Trang bị/Thiên Phú/Cổ Ngữ → Vượt Boss Chương → Mở khóa Ch.2–12 & Tháp Vô Tận.
3. **Vấn đề tồn tại**: Sau mốc ~45h–60h khi 8 Thiên Phú chạm 160/160 và đồ Thần Thoại đạt Lv.80, vòng lặp tiêu Vàng bị đứt gãy (tồn kho >6.24M Vàng).
4. **Nguyên nhân gốc rễ**: Toàn bộ Gold sink hiện hữu đều có trần cứng ở Mid-Late Game.
5. **Giải pháp đề xuất**: Tích hợp vòng lặp Endgame **Tinh Tuý Hoàng Đạo (500 bậc)** ngay trong `TalentsModal.tsx` và nối thẳng vào `computePlayerStats` + nhiệm vụ ngày.
6. **File hoặc module liên quan**: `src/data/talentsData.ts`, `src/data/gearData.ts`, `src/components/TalentsModal.tsx`, `src/App.tsx`, `src/data/economyTelemetry.ts`.
7. **Mức độ ưu tiên**: P1
8. **Rủi ro khi thay đổi**: Rủi ro tạo lạm phát chỉ số Endgame nếu thưởng mỗi bậc quá lớn.
9. **Tiêu chí nghiệm thu**: Mô phỏng 100h tiêu thụ `>= 75%` tổng Vàng tích lũy (thực tế đạt `99.8%`), không ảnh hưởng Ch.1–11.
10. **Điểm sau khi triển khai và kiểm thử**: `89 / 100`

### 03. Combat System — Hệ thống chiến đấu
1. **Điểm hiện tại (Trước)**: `83 / 100`
2. **Bằng chứng đánh giá**: Auto-aim bắn khi đứng yên, né đòn cơ động, Crit/Knockback/Chill/Shield, `combatFeelDirector.ts`, `computePowerPressure` chống vượt cấp phi lý.
3. **Vấn đề tồn tại**: Chưa có đòn chủ động mang bản sắc phòng thủ/chống chịu cho lối chơi Kim Ngưu; một số xung lóe sáng khi đánh chí mạng gây mỏi mắt.
4. **Nguyên nhân gốc rễ**: Chưa có nhánh tạo khiên chủ động riêng trong `GameEngine.ts` và chưa tách hệ số `flashScale`.
5. **Giải pháp đề xuất**: Hiện thực hóa `'jade_bastion'` (Khiên 12% HP + sóng ngọc làm chậm) và đồng bộ `flashScale` trong `zodiacLightingVfxDirector.ts`.
6. **File hoặc module liên quan**: `src/engine/GameEngine.ts`, `src/engine/combatFeelDirector.ts`, `src/engine/zodiacLightingVfxDirector.ts`.
7. **Mức độ ưu tiên**: P1
8. **Rủi ro khi thay đổi**: Sai công thức tính khiên có thể khiến Sylvia bất tử trong phòng Boss.
9. **Tiêu chí nghiệm thu**: Khiên giới hạn rõ 12% Max HP theo cooldown chuẩn, unit test pass 100%, không lỗi runtime.
10. **Điểm sau khi triển khai và kiểm thử**: `86 / 100`

### 04. Skill System — Hệ thống kỹ năng
1. **Điểm hiện tại (Trước)**: `76 / 100`
2. **Bằng chứng đánh giá**: 40+ kỹ năng roguelike trong trận (`skillsData.ts`), kỹ năng tiến hóa & cộng hưởng, kỹ năng chủ động tướng trong `phase5Data.ts`.
3. **Vấn đề tồn tại**: Sylvia (`Kim Ngưu`) đang gán `effectKind: 'ember_nova'` giống hệt Aurelia (`Sư Tử`), đánh mất bản sắc 4 tướng.
4. **Nguyên nhân gốc rễ**: Khi bổ sung Ch.3 chưa thêm nhánh enum `'jade_bastion'` vào `HeroActiveSkillEffectKind`.
5. **Giải pháp đề xuất**: Thêm `'jade_bastion'` vào `src/types/game.ts`, gán cho Sylvia trong `src/data/phase5Data.ts`, và viết thực thi đầy đủ trong `GameEngine.ts`.
6. **File hoặc module liên quan**: `src/types/game.ts`, `src/data/phase5Data.ts`, `src/engine/GameEngine.ts`.
7. **Mức độ ưu tiên**: P0
8. **Rủi ro khi thay đổi**: Cần bảo đảm type Exhaustive check của TypeScript không bị sót nhánh.
9. **Tiêu chí nghiệm thu**: 4 tướng dùng 4 `effectKind` riêng biệt (`ember_nova`, `thunder_arc`, `jade_bastion`, `moon_fan_mark`), `tsc --noEmit` 0 lỗi.
10. **Điểm sau khi triển khai và kiểm thử**: `87 / 100`

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
5. **Giải pháp đề xuất**: Triển khai `resolveDynamicPointLightPolicy` + `syncPointLightPolicy()` tháo hẳn đèn về **0 PointLights** trong Lite/Watchdog ≥ 2 và giảm 75% xung sáng khi bật Anti-Flash.
6. **File hoặc module liên quan**: `src/engine/zodiacLightingVfxDirector.ts`, `src/engine/GameEngine.ts`, `src/engine/zodiacLightingVfxDirector.test.ts`.
7. **Mức độ ưu tiên**: P0
8. **Rủi ro khi thay đổi**: Nếu gắn/gỡ đèn liên tục từng frame sẽ gây shader recompile giật khung hình — phải chỉ gọi khi đổi cấu hình/Watchdog.
9. **Tiêu chí nghiệm thu**: Unit test xác minh `totalScenePointLights === 0` ở Lite/E5430 và `flashScale === 0.25` khi bật Anti-Flash.
10. **Điểm sau khi triển khai và kiểm thử**: `87 / 100`

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
2. **Bằng chứng đánh giá**: Three.js PBR + ACES Filmic tone mapping, bộ mô hình 3D High/Lite cho Chương 1–4 (`glb-manifest.json`, 173 tệp), hệ thống cánh/thú cưỡi/hào quang 3D.
3. **Vấn đề tồn tại**: Chương 5–12 chưa có bộ đấu trường GLB riêng; 1 tệp legacy `hatsune-miku-lite.glb` nặng `3.47 MB` vượt ngưỡng Lite `2.5 MB`.
4. **Nguyên nhân gốc rễ**: Quy trình nén tự động chưa chạy lại trên tệp legacy cũ và Ch.5–12 đang trong lộ trình sản xuất mỹ thuật.
5. **Giải pháp đề xuất**: Giữ chuẩn High/Lite tự động hạ cấp theo phần cứng; ghi nhận rõ P2-1 nén tệp legacy và P2-5/P3-2 mở rộng Ch.5–12.
6. **File hoặc module liên quan**: `src/engine/GameEngine.ts`, `src/engine/glbPipelineValidator.ts`, `scripts/glb-manifest.json`.
7. **Mức độ ưu tiên**: P2
8. **Rủi ro khi thay đổi**: Nâng độ phân giải bóng/vật liệu trên GPU yếu sẽ gây crash WebGL Context Lost trên Dell E5430.
9. **Tiêu chí nghiệm thu**: `validateGlbPipelineManifest` đạt `e5430Safe = true` với 0 lỗi nghiêm trọng.
10. **Điểm sau khi triển khai và kiểm thử**: `85 / 100`

### 10. Art Direction — Định hướng nghệ thuật
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: Bảng màu Hoàng Đạo nhất quán (Vàng Kim Sư Tử, Đỏ Bạch Dương, Ngọc Lục Bảo Kim Ngưu, Lam Ánh Trăng Song Tử) và UI Celestial Tapestry thống nhất.
3. **Vấn đề tồn tại**: Thiếu tài liệu chuẩn hóa Art Style Guide chính thức; còn chấm `animate-pulse` trang trí dư thừa trong `AuctionHouseModal.tsx`.
4. **Nguyên nhân gốc rễ**: Quy chuẩn UI Zero-Pill và bảng màu 12 cung chưa được văn bản hóa thành chuẩn duy nhất.
5. **Giải pháp đề xuất**: Ban hành `ART_STYLE_GUIDE.md` làm chuẩn toàn dự án và loại bỏ hoàn toàn chấm `animate-pulse` cuối cùng trong `AuctionHouseModal.tsx`.
6. **File hoặc module liên quan**: `ART_STYLE_GUIDE.md`, `src/components/AuctionHouseModal.tsx`, `src/engine/chapterSceneDirector.ts`.
7. **Mức độ ưu tiên**: P2
8. **Rủi ro khi thay đổi**: Rủi ro thấp; cần kiểm tra trực quan bằng trình duyệt thật.
9. **Tiêu chí nghiệm thu**: 0 `animate-pulse` trang trí trong UI, `ART_STYLE_GUIDE.md` đầy đủ quy chuẩn màu/ánh sáng/ngân sách E5430.
10. **Điểm sau khi triển khai và kiểm thử**: `84 / 100`

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
2. **Bằng chứng đánh giá**: Phân loại hành vi quái cận chiến, xạ thủ tầm xa, lao thẳng có cảnh báo, nổ vùng, tách chồng lấn cơ bản trong `GameEngine.ts`.
3. **Vấn đề tồn tại**: Trước đây toàn bộ quái thường có thể tung đòn đồng thời khi hết cooldown (gây chồng chéo/dogpile không công bằng), chưa có bể token điều phối tấn công theo vai trò.
4. **Nguyên nhân gốc rễ**: AI vận hành độc lập theo từng thực thể chưa có bộ điều phối đám đông chung.
5. **Giải pháp đề xuất**: Triển khai **`EnemySquadDirector`** (`src/engine/enemySquadDirector.ts`, zero-GC scratch Set, 0 tải GPU thêm): giới hạn `2–5` token tấn công đồng thời (khóa `≤ 3` ở Chế độ Lite E5430 và giảm `-1` khi có Boss), cân bằng vai trò tầm xa/cận chiến, tự xoay vòng công bằng và cho quái chờ token di chuyển vòng sườn / giữ cự ly (`computeSquadWaitingFlankImpulse`).
6. **File hoặc module liên quan**: `src/engine/enemySquadDirector.ts`, `src/engine/enemySquadDirector.test.ts`, `src/engine/GameEngine.ts`, `tests/boss-patterns.test.mjs`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành Đợt 2)
8. **Rủi ro khi thay đổi**: Cần bảo đảm giải phóng token ngay khi quái bị choáng, kết thúc đòn hoặc bị hạ gục để không nghẽn bể token.
9. **Tiêu chí nghiệm thu**: `enemySquadDirector.test.ts` (4/4) và `boss-patterns.test.mjs` pass 100%, không gây ảnh hưởng Boss/Rival AI và 0 lỗi runtime trong trận 3D.
10. **Điểm sau khi triển khai và kiểm thử**: `87 / 100`

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
10. **Điểm sau khi triển khai và kiểm thử**: `88 / 100`

### 15. World Building — Xây dựng thế giới
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: Vũ trụ 12 Cung Hoàng Đạo gắn kết trực tiếp với 4 Tướng, Bộ Sưu Tập Ch.2–4, Boss Codex, Chòm Sao, Thánh Tích và Biên Niên Sử 12 Chương (`zodiacWorldLore.ts`).
3. **Vấn đề tồn tại**: Trước Đợt 5, một số fallback di cư cũ còn sót tên tiền nhiệm và phần Boss Codex mới có đoạn trích ngắn thay vì biên niên sử thế giới, phe phái thủ hộ, kỷ nguyên và mẹo địa hình đầy đủ cho cả 12 chương.
4. **Nguyên nhân gốc rễ**: Chưa có kho dữ liệu biên niên sử 12 chương chuẩn hóa gắn trực tiếp vào giao diện Sổ Tay.
5. **Giải pháp đề xuất**: Xây dựng **`src/data/zodiacWorldLore.ts`** gồm 12 vùng đất Hoàng Đạo, 12 phe thủ hộ, 12 kỷ nguyên, biên niên sử, tiểu sử Boss và mẹo địa hình chiến thuật độc nhất, hiển thị trực tiếp trong tab Boss của `src/components/CodexGuideModal.tsx` (phong cách Zero-Pill sạch sẽ) và chuẩn hóa hoàn toàn fallback di cư sang `'aurelia'` / `'solarius'`.
6. **File hoặc module liên quan**: `src/data/zodiacWorldLore.ts`, `src/data/zodiacWorldLore.test.ts`, `src/components/CodexGuideModal.tsx`, `src/data/earlyProgressionData.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 5)
8. **Rủi ro khi thay đổi**: Phải đảm bảo thẻ Boss Codex cuộn gọn đẹp trên cả màn hình nhỏ mà không bị rối chữ hay vỡ bố cục.
9. **Tiêu chí nghiệm thu**: `zodiacWorldLore.test.ts` xác minh đủ 12/12 vùng đất & 12/12 phe thủ hộ độc nhất; xác minh hiển thị trực tiếp trên Chromium (`r3-codex-lore.png`).
10. **Điểm sau khi triển khai và kiểm thử**: `90 / 100`

### 16. Progression System — Hệ thống tăng tiến
1. **Điểm hiện tại (Trước)**: `82 / 100`
2. **Bằng chứng đánh giá**: `getEarlyProgressionPolicy`, tài khoản mới bắt đầu ở `702 LC` (dưới Ch.1 `1,350 LC`), trần phẩm chất khóa theo chương, lộ trình 30 ngày F2P (`fairProgression30Day.ts`).
3. **Vấn đề tồn tại**: `migrateSaveData` làm rớt `selectedHeroId` đối với tướng mở theo chương (Ch.2–4); mô phỏng 30 ngày chưa phản ánh đủ Wave 12–14; thiếu lớp tăng tiến sau khi max 160 Thiên Phú.
4. **Nguyên nhân gốc rễ**: Logic di cư chưa cộng tướng theo `highestChapterCleared` và hệ Thiên Phú chạm trần cứng Lv.20 × 8.
5. **Giải pháp đề xuất**: Sửa triệt để `migrateSaveData`, đồng bộ Wave 12–14 vào mô phỏng 30 ngày, và bổ sung **Tinh Tuý Hoàng Đạo (500 bậc)** mở sau 160 Thiên Phú / Ch.12.
6. **File hoặc module liên quan**: `src/data/earlyProgressionData.ts`, `src/data/fairProgression30Day.ts`, `src/data/talentsData.ts`, `src/data/gearData.ts`.
7. **Mức độ ưu tiên**: P0 / P1
8. **Rủi ro khi thay đổi**: Phải bảo đảm tuyệt đối không tạo Power Creep ở Ch.1–Ch.11.
9. **Tiêu chí nghiệm thu**: Tài khoản mới giữ nguyên `702 LC`, 5m ở Common `798 LC`, Paragon = 0 cho tới khi chạm Endgame, `fairProgression30Day.test.ts` pass cả hồ sơ `average` và `unlucky`.
10. **Điểm sau khi triển khai và kiểm thử**: `90 / 100`

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
2. **Bằng chứng đánh giá**: 5 bậc phẩm chất, 5 Bộ Trang Bị (Set Bonus), Pity chống xui, phân giải đồ thừa ra Mảnh Rèn mục tiêu (`salvageExcessGearToForgeShards`), chuyển cấp cường hóa miễn phí 100%, và bộ nhớ đệm dùng chung **`LootOrbVisualCache`** cho mọi quả cầu vật phẩm rơi trong đấu trường 3D.
3. **Vấn đề tồn tại**: Trước Đợt 6, mỗi quả cầu Vàng/XP/Kim Cương/Hồi máu rơi ra khi hạ quái tạo mới 1 `OctahedronGeometry` và 1 `MeshStandardMaterial` rồi hủy khi nhặt, dễ gây khựng nhẹ khi nổ rương/hạ Boss nhiều loot trên GPU yếu.
4. **Nguyên nhân gốc rễ**: `spawnLootOrb` cấp phát tài nguyên hình học & vật liệu trực tiếp theo từng lần rơi thay vì dùng chung theo chủng loại.
5. **Giải pháp đề xuất**: Triển khai **`LootOrbVisualCache`** trong `src/engine/vfxPoolManager.ts` (dùng chung đúng 2 geometry và 4 material cho toàn bộ vòng đời đấu trường, chỉ `dispose()` một lần khi đóng engine) kết hợp kiểm chứng rơi đồ xuyên suốt 8 mốc `5m → 100h` qua `economyTelemetry.test.ts`.
6. **File hoặc module liên quan**: `src/engine/vfxPoolManager.ts`, `src/engine/GameEngine.ts`, `src/engine/wave6AnimationAndBoss.test.ts`, `src/data/gearData.ts`, `src/data/economyTelemetry.ts`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 6)
8. **Rủi ro khi thay đổi**: Tuyệt đối không gọi `releaseObject(o.mesh)` khi nhặt từng quả cầu để tránh hủy tài nguyên chia sẻ — chỉ gỡ khỏi `entitiesGroup` và giải phóng duy nhất trong `dispose()`.
9. **Tiêu chí nghiệm thu**: `wave6AnimationAndBoss.test.ts` chứng minh 100 lần rơi đồ chỉ dùng đúng 2 geometry & 4 material; `earlyProgression.test.ts`, `fairProgression30Day.test.ts`, `economyTelemetry.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `88 / 100`

### 19. Difficulty Scaling — Tăng tiến độ khó
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: 12 chương tăng từ `1,350 LC → 285,000 LC`, `computePowerPressure` điều tiết sát thương/xuyên giáp, Nightmare Ascension I–V & 5 biến dị phòng, nhịp chuyển Pha II/III chuẩn xác cho Boss Hoàng Đạo Ch.1–4, Ch.10–12 & Tháp F20+.
3. **Vấn đề tồn tại**: Trước Đợt 6, Boss cuối Chương 1–4 bị khóa không thể vào Pha III làm đường cong độ khó cao trào của 4 chương mở đầu bị hụt nhịp so với thiết kế; chưa có bảng TTK/TTD đầy đủ.
4. **Nguyên nhân gốc rễ**: Ngưỡng `chapter.id >= 10` trong `GameEngine.ts` chặn mất cao trào Pha III ở Ch.1–4 và thiếu công cụ đo TTK/TTD tự động.
5. **Giải pháp đề xuất**: Bổ sung `estimateCombatTimings` trong `economyTelemetry.ts` (`GAME_BALANCE_REPORT.md`) và sửa đường cong cao trào Pha III thực tế bằng `canBossEnterPhaseThree` + hiệu chỉnh `cadenceBias` / `punishBonusBias` riêng cho từng cung Hoàng Đạo trong Đợt 6.
6. **File hoặc module liên quan**: `src/engine/tacticalCombatChoreography.ts`, `src/engine/GameEngine.ts`, `src/data/economyTelemetry.ts`, `src/data/fairProgression30Day.ts`, `GAME_BALANCE_REPORT.md`.
7. **Mức độ ưu tiên**: P1 (Đã hoàn thành Đợt 6)
8. **Rủi ro khi thay đổi**: Công thức mô phỏng TTK chỉ phản ánh lý thuyết DPS — vẫn cần xác nhận cảm nhận né đòn từ playtest người thật (P3-1).
9. **Tiêu chí nghiệm thu**: Bảng TTK/TTD chính xác cho cả 8 mốc, Boss Ch.1–4 & Ch.10–12 kích hoạt đủ Pha II/III kèm cửa sổ phản công 2.5s.
10. **Điểm sau khi triển khai và kiểm thử**: `89 / 100`

### 20. UI/UX — Giao diện và trải nghiệm người dùng
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: Giao diện Celestial Gold thống nhất, HUD tách khỏi vòng lặp 60Hz, không có nút giả, hỗ trợ đa kích thước màn hình.
3. **Vấn đề tồn tại**: `AuctionHouseModal.tsx` còn 2 chấm `animate-pulse` trang trí; `TalentsModal.tsx` chưa hiển thị tiến độ mở khóa Endgame và chưa định dạng số `tabular-nums` có phân tách hàng nghìn cho số lớn.
4. **Nguyên nhân gốc rễ**: Thiếu rà soát cuối cùng sau các đợt bổ sung tính năng Wave 10–14.
5. **Giải pháp đề xuất**: Gỡ chấm `animate-pulse`, bổ sung thẻ **Tinh Tuý Hoàng Đạo** + định dạng số rõ ràng trong `TalentsModal.tsx`, thêm bảng **Giám Sát An Ninh** sạch Zero-Pill trong `AssetAdminLiveOpsTab.tsx`, và kiểm tra trực tiếp trên trình duyệt thật.
6. **File hoặc module liên quan**: `src/components/AuctionHouseModal.tsx`, `src/components/TalentsModal.tsx`, `src/components/CodexGuideModal.tsx`, `src/components/SettingsModal.tsx`, `src/components/AssetAdminLiveOpsTab.tsx`.
7. **Mức độ ưu tiên**: P1 / P2
8. **Rủi ro khi thay đổi**: Chèn thêm thẻ vào modal có thể gây tràn chiều cao trên màn hình nhỏ nếu không bọc `overflow-y-auto`.
9. **Tiêu chí nghiệm thu**: Kiểm tra bằng headless Chromium (`playwright-cli`) ở desktop 1440×900: 0 lỗi console, không cắt chữ/chồng lấn nút, tab Boss Codex hiển thị rõ biên niên sử 12 chương.
10. **Điểm sau khi triển khai và kiểm thử**: `87 / 100`

### 21. Game Feel — Cảm giác chơi
1. **Điểm hiện tại (Trước)**: `82 / 100`
2. **Bằng chứng đánh giá**: `combatFeel.ts` (Hitstop, Camera Shake trauma, recoil, kill burst), `combatAnimationKinematics.ts` (nghiêng thân khi Lướt, nhún nâng người khi tung Kỹ năng E / Phá Giáp F, đáp đất khi vào trận, gục ngã mượt khi hết HP), tách riêng `reduceScreenFlash` (`flashScale = 0.25`).
3. **Vấn đề tồn tại**: Trước Đợt 6, người chơi chưa có độ nghiêng thân rõ rệt khi Lướt (`Space`) hay xung nâng người khi tung Kỹ năng chủ động (`E`) / Phá Giáp Trảm (`F`), và công tắc giảm chớp sáng từng gộp với `reducedMotion`.
4. **Nguyên nhân gốc rễ**: Chưa tách `reduceScreenFlash` và chưa nối xung động học thân trên cho các thao tác cốt lõi (Dash, Active Skill, Heavy Break, Spawn, Death).
5. **Giải pháp đề xuất**: Tách riêng `reduceScreenFlash` (`flashScale = 0.25`), bổ sung phản hồi trực quan cho `jade_bastion` + Tinh Tuý Hoàng Đạo, và nối trực tiếp `applyDodgeBank`, `applySkillCastPulse`, `applySpawnSettle` + pha `isDead` vào `GameEngine.ts` trong Đợt 6.
6. **File hoặc module liên quan**: `src/engine/combatAnimationKinematics.ts`, `src/engine/zodiacLightingVfxDirector.ts`, `src/engine/GameEngine.ts`, `src/components/SettingsModal.tsx`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành Đợt 6)
8. **Rủi ro khi thay đổi**: Phải giảm biên độ còn `0.25×` khi người chơi bật `reducedMotion` để không gây chóng mặt.
9. **Tiêu chí nghiệm thu**: Unit test xác minh `flashScale = 0.25`, `applyDodgeBank`/`applySkillCastPulse`/`applySpawnSettle` và giảm biên độ `reducedMotion` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `88 / 100`

### 22. Performance — Hiệu năng
1. **Điểm hiện tại (Trước)**: `76 / 100`
2. **Bằng chứng đánh giá**: Auto-detect Intel HD 4000 (`aaaVisualPipeline.ts`), GPU Thermal Watchdog Stage 0→4 (`gpuThermalWatchdog.ts`), 0-PointLight Shader Policy, Zero-GC `SpatialHashGrid`, `projectilePhysicsSystem.ts`, **`VfxFrameBudgetCache`**, và **`LootOrbVisualCache`** (`vfxPoolManager.ts`).
3. **Vấn đề tồn tại**: Trước cải tiến, `GameEngine.ts` giữ 3 `THREE.PointLight` trong Lite Mode, cấp phát `18,000` mảng rác/giây ở vòng đạn, quét `arrowPool.reduce(...)` trên từng lần gọi VFX, và tạo mới `OctahedronGeometry` + `MeshStandardMaterial` trên mỗi quả cầu loot rơi.
4. **Nguyên nhân gốc rễ**: Chưa tháo `PointLight` khỏi `THREE.Scene`, dùng `[...this.enemies]` trong vòng đạn, chưa cache ngân sách VFX theo khung hình, và chưa chia sẻ tài nguyên GPU cho vật phẩm rơi.
5. **Giải pháp đề xuất**: Triển khai `syncPointLightPolicy()` về **0 PointLights**, Watchdog Stage 2 floor cho E5430 + Stage 4 Emergency Lite (`dprCap: 0.7`), broadphase Zero-GC nhanh hơn **8.09×** (`742.76ms → 91.85ms`), **`VfxFrameBudgetCache`**, và **`LootOrbVisualCache`** (triệt tiêu 100% cấp phát geometry/material GPU mỗi lần rơi loot trong Đợt 6).
6. **File hoặc module liên quan**: `src/engine/zodiacLightingVfxDirector.ts`, `src/engine/gpuThermalWatchdog.ts`, `src/engine/spatialHashGrid.ts`, `src/engine/projectilePhysicsSystem.ts`, `src/engine/vfxPoolManager.ts`, `tools/benchmark-spatial-physics.ts`, `PERFORMANCE_REPORT.md`.
7. **Mức độ ưu tiên**: P0 / P2 (Đã hoàn thành Đợt 1–6)
8. **Rủi ro khi thay đổi**: Phải đảm bảo vòng dọn màn chơi và nhặt loot không gọi `releaseObject` lên tài nguyên chia sẻ của `LootOrbVisualCache`.
9. **Tiêu chí nghiệm thu**: 0 PointLights ở E5430/Lite/Watchdog ≥ 2, benchmark CPU giảm **87.6%** (`8.09×`) & triệt tiêu **180,000** mảng rác, 100 quả cầu loot chỉ dùng 2 geometry + 4 material; đo nhiệt vật lý Dell E5430 60 phút ghi nhận ở P3-1.
10. **Điểm sau khi triển khai và kiểm thử**: `93 / 100`

### 23. Code Architecture — Kiến trúc mã nguồn
1. **Điểm hiện tại (Trước)**: `72 / 100`
2. **Bằng chứng đánh giá**: Tách biệt rõ lớp dữ liệu (`src/data/`), âm thanh (`src/audio/`), dịch vụ (`src/services/`), máy chủ (`server.ts`, `src/server/`), và các mô-đun engine thuần túy có unit test độc lập.
3. **Vấn đề tồn tại**: `src/engine/GameEngine.ts` và `src/App.tsx` có độ tập trung cao từ nhiều đợt mở rộng nhanh.
4. **Nguyên nhân gốc rễ**: Nhiều vòng lặp VFX, vật lý đạn, đội hình và biên niên sử trước đây viết trực tiếp trong tệp lõi.
5. **Giải pháp đề xuất**: Hoàn tất cả **`P2-3a` và `P2-3b`**: trích xuất **`spatialHashGrid.ts`**, **`projectilePhysicsSystem.ts`**, **`vfxPoolManager.ts`** (8 bộ cập nhật VFX pool Zero-GC + `VfxFrameBudgetCache`), **`enemySquadDirector.ts`**, **`chapterArenaMechanisms.ts`**, **`zodiacLightingVfxDirector.ts`**, **`zodiacMusicDirector.ts`**, và **`zodiacWorldLore.ts`** với 100% unit test độc lập; bước tiếp theo tách thêm `ArenaSceneBuilder` nếu mở rộng Ch.5–12 3D.
6. **File hoặc module liên quan**: `src/engine/vfxPoolManager.ts`, `src/engine/projectilePhysicsSystem.ts`, `src/engine/spatialHashGrid.ts`, `src/engine/enemySquadDirector.ts`, `src/data/zodiacWorldLore.ts`, `src/engine/GameEngine.ts`.
7. **Mức độ ưu tiên**: P2 (Đã hoàn thành `P2-3a` & `P2-3b`)
8. **Rủi ro khi thay đổi**: Tách mô-đun engine cần giữ đúng cấu trúc tham chiếu Three.js để không phát sinh lỗi runtime hay cấp phát GC.
9. **Tiêu chí nghiệm thu**: `tsc --noEmit` 0 lỗi, Vite build sạch, toàn bộ mô-đun trích xuất pass 100% unit test & kiểm chứng live Chromium.
10. **Điểm sau khi triển khai và kiểm thử**: `88 / 100`

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
2. **Bằng chứng đánh giá**: 4 tướng Hoàng Đạo với lối chơi khác nhau, 40+ kỹ năng roguelike trong trận, 5 Bộ Trang Bị, Tháp Vô Tận, Nightmare Ascension I–V + 5 Mutators, Đấu Trường Cân Bằng.
3. **Vấn đề tồn tại**: Tướng Sylvia thiếu kỹ năng đặc trưng; người chơi Endgame sau 60h thiếu động lực tiếp tục tích lũy Vàng từ các chế độ lặp lại.
4. **Nguyên nhân gốc rễ**: Trùng hiệu ứng kỹ năng chủ động và trần Thiên Phú cố định ở 160.
5. **Giải pháp đề xuất**: Bổ sung `'jade_bastion'` tạo lối build chống chịu/làm chậm cho Sylvia và mở **Tinh Tuý Hoàng Đạo 500 bậc** tạo mục tiêu dài hạn sau 100h+.
6. **File hoặc module liên quan**: `src/data/phase5Data.ts`, `src/data/talentsData.ts`, `src/engine/GameEngine.ts`.
7. **Mức độ ưu tiên**: P1
8. **Rủi ro khi thay đổi**: Cần cân bằng sát thương Boss của Paragon (+0.2%/bậc, trần +40%) để không biến Nightmare Tier V thành quá dễ.
9. **Tiêu chí nghiệm thu**: Kiểm chứng bằng unit test và mô phỏng 100h đạt Paragon Bậc 44/500 mà không phá vỡ trần chỉ số.
10. **Điểm sau khi triển khai và kiểm thử**: `87 / 100`

### 26. Player Retention — Khả năng giữ chân người chơi
1. **Điểm hiện tại (Trước)**: `78 / 100`
2. **Bằng chứng đánh giá**: FTUE Ch.1 chặt chẽ (`5m → 30m`), lộ trình công bằng 30 ngày (`FAIR_30DAY_MILESTONES`), nhiệm vụ ngày, chuyển cấp miễn phí giảm ma sát tâm lý, không dùng dark pattern.
3. **Vấn đề tồn tại**: **Chưa có dữ liệu giữ chân thực tế D1 / D7 / D30 từ người chơi thật** (chưa xác minh live).
4. **Nguyên nhân gốc rễ**: Dự án đang ở giai đoạn hoàn thiện kỹ thuật trước khi mở Beta thu thập hành vi người dùng.
5. **Giải pháp đề xuất**: Khóa chặt trải nghiệm 5m / 15m / 30m / 1h / 3h / 10h / 30h / 100h bằng mô phỏng có seed + bổ sung mục tiêu Endgame rõ ràng; ghi rõ chỉ số D1/D7/D30 thực tế chờ đo ở P3-1.
6. **File hoặc module liên quan**: `src/data/economyTelemetry.ts`, `src/data/fairProgression30Day.ts`, `GAME_PROGRESSION_DESIGN.md`.
7. **Mức độ ưu tiên**: P1 / P3
8. **Rủi ro khi thay đổi**: Nhầm lẫn giữa kết quả mô phỏng toán học với tỷ lệ giữ chân thực tế — phải luôn tách bạch trong báo cáo.
9. **Tiêu chí nghiệm thu**: Tất cả 8 mốc chơi đều có mục tiêu kế tiếp rõ ràng, 0 cảnh báo lạm phát, phân định minh bạch mô phỏng vs live.
10. **Điểm sau khi triển khai và kiểm thử**: `84 / 100` *(D1/D7/D30 live: chưa xác minh thực địa)*

### 27. Accessibility — Khả năng tiếp cận
1. **Điểm hiện tại (Trước)**: `74 / 100`
2. **Bằng chứng đánh giá**: Tùy chỉnh cỡ chữ UI (`small / normal / large`), bảng màu mù màu (`colorblindTelegraphs.ts`), giảm rung, giảm chuyển động, hỗ trợ Gamepad API (`GameEngine.ts` + `SettingsModal.tsx`), chỉnh âm lượng riêng.
3. **Vấn đề tồn tại**: Thiếu công tắc **Giảm Chớp Sáng (Anti-Flash)** độc lập và thiếu vùng thông báo **`aria-live="polite"`** cho trình đọc màn hình khi khôi phục dữ liệu hoặc nâng bậc Tinh Tuý Hoàng Đạo.
4. **Nguyên nhân gốc rễ**: Hiệu ứng lóe sáng từng gắn cứng vào `reducedMotion`, và các thông báo trạng thái chính chưa có `role="status"` ARIA live.
5. **Giải pháp đề xuất**: Tách riêng `reduceScreenFlash` (`flashScale = 0.25`) và bổ sung vùng `<div role="status" aria-live="polite" aria-atomic="true" className="sr-only">` (`data-testid="a11y-live-announcer"`) trong `App.tsx`.
6. **File hoặc module liên quan**: `src/types/game.ts`, `src/data/liveOpsData.ts`, `src/components/SettingsModal.tsx`, `src/engine/zodiacLightingVfxDirector.ts`, `src/App.tsx`.
7. **Mức độ ưu tiên**: P1 / P2 (Đã hoàn thành)
8. **Rủi ro khi thay đổi**: Bảo đảm save cũ không có khóa `reduceScreenFlash` mặc định an toàn về `false` và vùng `sr-only` không ảnh hưởng bố cục thị giác.
9. **Tiêu chí nghiệm thu**: Nút Anti-Flash lưu bền vững, `aria-live="polite"` xác minh tồn tại trực tiếp trên DOM trình duyệt thật.
10. **Điểm sau khi triển khai và kiểm thử**: `88 / 100`

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
3. **Vấn đề tồn tại**: Trước đây có lỗi lệch contract Ch.3–4, thiếu regression gate cho Paragon/Security/Spatial Physics/LiveOps Schedule, và lỗi `ENOENT` CDN.
4. **Nguyên nhân gốc rễ**: Cập nhật tính năng nhanh chưa đồng bộ toàn bộ regression gate.
5. **Giải pháp đề xuất**: Khắc phục 100% lỗi gốc, bổ sung test cho `SpatialHashGrid`, `projectilePhysicsSystem`, `zodiacMusicDirector`, `liveOpsConfig` (P2-4b), `EnemySquadDirector`, `serverSecurity`, `saveIntegrity` và kiểm chứng trực tiếp giao tranh 3D trên trình duyệt thật.
6. **File hoặc module liên quan**: `tests/*.test.mjs`, `src/**/*.test.ts`, `tools/benchmark-spatial-physics.ts`, `tools/simulate-playtime-milestones.ts`, `QA_TEST_REPORT.md`.
7. **Mức độ ưu tiên**: P0 / P1 / P2 (Đã hoàn thành Đợt 1–6)
8. **Rủi ro khi thay đổi**: Mọi cải tiến mới bắt buộc chạy lại full suite và trình duyệt sống để chống regression.
9. **Tiêu chí nghiệm thu**: Toàn bộ kho mã nguồn đạt **`446 bài kiểm thử | 445 PASS | 0 FAIL | 1 skip`**, `tsc --noEmit` 0 lỗi, Vite build sạch, live Chromium 0 lỗi console.
10. **Điểm sau khi triển khai và kiểm thử**: `94 / 100`

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

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
| **Progression, Economy & Loot** | 16, 17, 18 | 20% | 79.00 | 89.00 | 15.80 | 17.80 | **+2.00** |
| **Gameplay, Combat & Skill** | 01, 02, 03, 04 | 20% | 81.25 | 87.50 | 16.25 | 17.50 | **+1.25** |
| **Animation, VFX, SFX & Music** | 05, 06, 07, 08 | 15% | 78.75 | 82.75 | 11.81 | 12.41 | **+0.60** |
| **Enemy AI, Boss & Difficulty** | 12, 13, 19 | 10% | 80.67 | 84.00 | 8.07 | 8.40 | **+0.33** |
| **Performance & Architecture** | 22, 23 | 10% | 74.00 | 83.00 | 7.40 | 8.30 | **+0.90** |
| **Graphics, Art & World Design** | 09, 10, 15 | 5% | 80.67 | 84.00 | 4.03 | 4.20 | **+0.17** |
| **Game Feel, UI/UX & Accessibility** | 20, 21, 27 | 5% | 78.67 | 85.67 | 3.93 | 4.28 | **+0.35** |
| **Replayability & Retention** | 25, 26 | 5% | 79.00 | 85.50 | 3.95 | 4.28 | **+0.33** |
| **Physics, Level & Asset Pipeline** | 11, 14, 24 | 5% | 80.33 | 83.00 | 4.02 | 4.15 | **+0.13** |
| **Security, QA & Live Operations** | 28, 29, 30 | 5% | 74.67 | 87.33 | 3.73 | 4.37 | **+0.64** |
| **TỔNG ĐIỂM TRỌNG SỐ** | **30 / 30 tiêu chí** | **100%** | — | — | **78.99 / 100** | **85.69 / 100** | **+6.70** |

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
2. **Bằng chứng đánh giá**: `heroKinematicMotion.ts`, hệ thống GLB `AnimationMixer` cho Tướng/Quái/Boss Chương 1–4, chuyển pha Idle/Run/Attack/Cast/Death.
3. **Vấn đề tồn tại**: Chương 5–12 vẫn dùng bộ xương/biến thể tái sử dụng; bộ test GLB trực tiếp trên đĩa báo `ENOENT` vì nhị phân nằm trên CDN B2.
4. **Nguyên nhân gốc rễ**: Chưa sản xuất đủ bộ rig GLB riêng cho Ch.5–12; bộ test engine đọc thẳng `public/assets`.
5. **Giải pháp đề xuất**: Duy trì kinematic blending mượt và xác minh toàn vẹn manifest; lên kế hoạch P2-2 tách test CDN/local và P2-5/P3-2 mở rộng rig Ch.5–12.
6. **File hoặc module liên quan**: `src/engine/heroKinematicMotion.ts`, `src/engine/GameEngine.ts`, `scripts/glb-manifest.json`.
7. **Mức độ ưu tiên**: P2
8. **Rủi ro khi thay đổi**: Thay đổi blending trực tiếp mà không có đủ clip gốc dễ gây T-pose.
9. **Tiêu chí nghiệm thu**: `heroKinematicMotion.test.ts` pass 100%, không lỗi giật/cắt animation trên Ch.1–4.
10. **Điểm sau khi triển khai và kiểm thử**: `82 / 100`

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
2. **Bằng chứng đánh giá**: `src/audio/soundEngine.ts` tổng hợp Web Audio thủ tục phân tách âm bắn, chí mạng, nâng cấp, chiến thắng, né đòn, có biến thiên cao độ.
3. **Vấn đề tồn tại**: Chưa có ngân hàng mẫu SFX ghi âm cao cấp (Foley) cho từng loại vũ khí S-Tier riêng biệt.
4. **Nguyên nhân gốc rễ**: Dự án ưu tiên dung lượng nhẹ tải nhanh trên web và máy yếu (tránh nạp hàng chục MB audio).
5. **Giải pháp đề xuất**: Duy trì hệ thống Web Audio không tạo GC rác, gắn âm thanh xác thực vào nút tinh luyện Tinh Tuý Hoàng Đạo và kỹ năng `jade_bastion`.
6. **File hoặc module liên quan**: `src/audio/soundEngine.ts`, `src/audio/*.test.ts`, `src/App.tsx`.
7. **Mức độ ưu tiên**: P2
8. **Rủi ro khi thay đổi**: Autoplay bị chặn trước tương tác đầu tiên của người dùng nếu không resume `AudioContext` đúng cách.
9. **Tiêu chí nghiệm thu**: Toàn bộ `src/audio/*.test.ts` pass 100%, không lỗi WebAudio trong console trình duyệt.
10. **Điểm sau khi triển khai và kiểm thử**: `82 / 100`

### 08. Music Design — Thiết kế nhạc nền
1. **Điểm hiện tại (Trước)**: `79 / 100`
2. **Bằng chứng đánh giá**: Hệ thống nhạc nền thích ứng theo pha Sảnh / Chiến đấu / Boss trong `soundEngine.ts`, có thanh chỉnh âm lượng riêng trong `SettingsModal.tsx`.
3. **Vấn đề tồn tại**: Thiếu biến tấu nhạc chủ đề riêng biệt cho từng chương Ch.5–12.
4. **Nguyên nhân gốc rễ**: Kiến trúc nhạc tổng hợp tập trung vào độ nhẹ và tính hợp lệ bản quyền 100% không dùng file ngoài.
5. **Giải pháp đề xuất**: Giữ sạch bản quyền, kiểm thử tắt/mở âm lượng độc lập BGM/SFX không lỗi.
6. **File hoặc module liên quan**: `src/audio/soundEngine.ts`, `src/components/SettingsModal.tsx`.
7. **Mức độ ưu tiên**: P3
8. **Rủi ro khi thay đổi**: Chồng vòng lặp nhạc khi chuyển màn nhanh nếu không dọn node cũ.
9. **Tiêu chí nghiệm thu**: Âm lượng BGM/SFX lưu bền vững trong `SaveData.settings` và hoạt động đúng.
10. **Điểm sau khi triển khai và kiểm thử**: `80 / 100`

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
2. **Bằng chứng đánh giá**: `fixedTimestep.ts` kẹp `dt`, va chạm tường/chướng ngại vật trong đấu trường, chống đạn đánh trùng nhiều lần cùng frame.
3. **Vấn đề tồn tại**: Chưa có phân vùng không gian dạng Uniform Grid / Spatial Hash chuyên biệt khi số lượng đạn vượt >300 đồng thời.
4. **Nguyên nhân gốc rễ**: Quy mô phòng hiện tại giới hạn mật độ quái để bảo vệ CPU yếu nên kiểm tra bán kính trực tiếp vẫn đủ nhanh.
5. **Giải pháp đề xuất**: Duy trì `fixedTimestep.ts` ổn định đa tần số quét và theo dõi ngân sách vật thể trong `vfxBudgetGovernor.ts`.
6. **File hoặc module liên quan**: `src/engine/fixedTimestep.ts`, `src/engine/GameEngine.ts`.
7. **Mức độ ưu tiên**: P2
8. **Rủi ro khi thay đổi**: Thay đổi va chạm trực tiếp dễ gây xuyên tường nếu không có bộ test hình học đi kèm.
9. **Tiêu chí nghiệm thu**: `fixedTimestep.test.ts` pass 100%, không kẹt nhân vật trong kiểm thử.
10. **Điểm sau khi triển khai và kiểm thử**: `83 / 100`

### 12. Enemy AI — Trí tuệ nhân tạo quái vật
1. **Điểm hiện tại (Trước)**: `78 / 100`
2. **Bằng chứng đánh giá**: Phân loại hành vi quái cận chiến, xạ thủ tầm xa, lao thẳng có cảnh báo, nổ vùng, tách chồng lấn cơ bản trong `GameEngine.ts`.
3. **Vấn đề tồn tại**: Chưa có hành vi phối hợp đội hình (ví dụ: quái chắn khiên che cho xạ thủ phía sau) ở các chương cao.
4. **Nguyên nhân gốc rễ**: AI hiện hoạt động độc lập theo từng thực thể để tiết kiệm CPU trên máy cấu hình thấp.
5. **Giải pháp đề xuất**: Bảo toàn bộ hành vi hiện tại đã qua kiểm thử, đưa cơ chế phối hợp nhóm nhẹ theo token vào lộ trình nâng cấp Ch.5–8 (P2-5).
6. **File hoặc module liên quan**: `src/engine/GameEngine.ts`, `tests/boss-patterns.test.mjs`.
7. **Mức độ ưu tiên**: P2
8. **Rủi ro khi thay đổi**: Tính toán pathfinding nặng mỗi frame sẽ làm tụt FPS trên CPU 2 nhân cũ.
9. **Tiêu chí nghiệm thu**: Toàn bộ test hành vi quái/boss pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `80 / 100`

### 13. Boss Design — Thiết kế boss
1. **Điểm hiện tại (Trước)**: `84 / 100`
2. **Bằng chứng đánh giá**: Boss Chương 1–4 có 3 giai đoạn (Phase I/II/III), vùng telegraph rõ ràng, cửa sổ phản công, Boss Codex ghi nhận đủ cơ chế (`earlyProgression.test.ts`).
3. **Vấn đề tồn tại**: Bộ test hợp đồng Boss Codex cũ chưa đồng bộ đầy đủ Phase III của Chương 3–4; Boss Ch.5–12 chưa có mô hình 3D độc bản.
4. **Nguyên nhân gốc rễ**: Nội dung Ch.3–4 cập nhật nhanh hơn bộ test kiểm định.
5. **Giải pháp đề xuất**: Đồng bộ 100% contract test cho Boss Phase III Ch.1–4; lên kế hoạch mô hình độc bản Ch.5–12 ở P2-5/P3-2.
6. **File hoặc module liên quan**: `src/data/earlyProgression.test.ts`, `src/data/chaptersData.ts`, `tests/boss-patterns.test.mjs`.
7. **Mức độ ưu tiên**: P1
8. **Rủi ro khi thay đổi**: Tăng quá mạnh sát thương Phase III có thể làm gãy trải nghiệm F2P ở 75–89% LC.
9. **Tiêu chí nghiệm thu**: 100% contract Boss Phase III & `boss-patterns.test.mjs` pass.
10. **Điểm sau khi triển khai và kiểm thử**: `86 / 100`

### 14. Level Design — Thiết kế màn chơi
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: 12 chương chiến dịch × 12 phòng/chương + phòng Thiên Thần/Ác Quỷ + Vòng Quay May Mắn + Tháp Vô Tận + Đấu trường GLB riêng cho Ch.1–4.
3. **Vấn đề tồn tại**: Ch.5–12 tái sử dụng biến thể đấu trường thủ tục; tệp `aries-arena-high.glb` thiếu bản `-lite` chuyên biệt trong manifest.
4. **Nguyên nhân gốc rễ**: Quy trình export bản Lite của đấu trường Ch.2 chưa chạy bổ sung.
5. **Giải pháp đề xuất**: Ghi nhận chính xác cảnh báo `aries-arena-high.glb` vào P2-1; kiểm chứng đường đi và chỉ số mở khóa 12 chương không có màn bất khả thi.
6. **File hoặc module liên quan**: `src/data/chaptersData.ts`, `src/engine/chapterSceneDirector.ts`, `scripts/glb-manifest.json`.
7. **Mức độ ưu tiên**: P2
8. **Rủi ro khi thay đổi**: Thay đổi kích thước đấu trường có thể làm lệch tọa độ spawn tường/chướng ngại vật.
9. **Tiêu chí nghiệm thu**: `chapterSceneDirector.test.ts` pass 100%, 12/12 chương có đường cong LC thông suốt.
10. **Điểm sau khi triển khai và kiểm thử**: `82 / 100`

### 15. World Building — Xây dựng thế giới
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: Vũ trụ 12 Cung Hoàng Đạo gắn kết trực tiếp với Tướng, Bộ Sưu Tập Ch.2–4, Boss Codex, Chòm Sao và Thánh Tích Hoàng Đạo.
3. **Vấn đề tồn tại**: Một số dữ liệu di cư cũ còn sót tên thú cưỡi/tướng tiền nhiệm không khớp vũ trụ Hoàng Đạo.
4. **Nguyên nhân gốc rễ**: Quá trình chuyển đổi từ bản mẫu cũ sang 12 Cung Hoàng Đạo để sót nhánh fallback `'artemis'` và mount legacy.
5. **Giải pháp đề xuất**: Chuẩn hóa toàn bộ fallback sang `'aurelia'` và `'solarius'`, đồng bộ Bộ Sưu Tập Ch.2–4 xuyên suốt dữ liệu và kiểm thử.
6. **File hoặc module liên quan**: `src/data/earlyProgressionData.ts`, `src/data/saveIntegrity.ts`, `src/data/chapter2Collection.ts`, `src/data/chapter3Collection.ts`, `src/data/chapter4Collection.ts`.
7. **Mức độ ưu tiên**: P1
8. **Rủi ro khi thay đổi**: Có thể ảnh hưởng save cũ nếu không giữ ánh xạ di cư an toàn.
9. **Tiêu chí nghiệm thu**: Save cũ di cư không mất dữ liệu, 0 tên legacy còn rò rỉ trong đường dẫn chính.
10. **Điểm sau khi triển khai và kiểm thử**: `83 / 100`

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
2. **Bằng chứng đánh giá**: 5 bậc phẩm chất, 5 Bộ Trang Bị (Set Bonus), Pity chống xui, phân giải đồ thừa ra Mảnh Rèn mục tiêu (`salvageExcessGearToForgeShards`), chuyển cấp cường hóa miễn phí 100%.
3. **Vấn đề tồn tại**: Cần kiểm chứng liên tục đồ rơi trong 100h không tràn kho đồ rác và không xuất hiện đồ Sử Thi/Thần Thoại sớm ở 5m–15m.
4. **Nguyên nhân gốc rễ**: Nhiều hệ thống thưởng (Thư, Rương, Sự kiện) dễ vô tình mở khóa vượt trần nếu không đi qua `rollProgressionGatedGear`.
5. **Giải pháp đề xuất**: Kiểm chứng luồng rơi đồ xuyên suốt 8 mốc `5m → 100h` qua `economyTelemetry.test.ts` (5m–15m giữ chặt `Thường`, 30m–10h `Sử Thi`, 30h–100h `Thần Thoại`).
6. **File hoặc module liên quan**: `src/data/gearData.ts`, `src/data/earlyProgressionData.ts`, `src/data/economyTelemetry.ts`.
7. **Mức độ ưu tiên**: P1
8. **Rủi ro khi thay đổi**: Sửa sai tỷ lệ phân giải sẽ ảnh hưởng tốc độ rèn đồ S-Tier của người chơi F2P.
9. **Tiêu chí nghiệm thu**: `earlyProgression.test.ts`, `fairProgression30Day.test.ts`, và `economyTelemetry.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `86 / 100`

### 19. Difficulty Scaling — Tăng tiến độ khó
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: 12 chương tăng từ `1,350 LC → 285,000 LC`, `computePowerPressure` điều tiết sát thương/xuyên giáp, Nightmare Ascension I–V & 5 biến dị phòng.
3. **Vấn đề tồn tại**: Trước đây chưa có bảng số liệu định lượng `Mob TTK`, `Boss TTK`, `Player TTD` cho từng mốc chơi.
4. **Nguyên nhân gốc rễ**: Thiếu công cụ đo TTK/TTD tự động ghép nối trực tiếp từ `computePlayerStats` và `CHAPTERS`.
5. **Giải pháp đề xuất**: Bổ sung `estimateCombatTimings` trong `economyTelemetry.ts` và báo cáo định lượng đầy đủ tại `GAME_BALANCE_REPORT.md` (5m: Mob TTK 4.78s, Boss TTK 73.4s, TTD 7.3s → 15m: 1.35s / 20.8s / 22.0s).
6. **File hoặc module liên quan**: `src/data/economyTelemetry.ts`, `src/data/fairProgression30Day.ts`, `GAME_BALANCE_REPORT.md`.
7. **Mức độ ưu tiên**: P1
8. **Rủi ro khi thay đổi**: Công thức mô phỏng TTK chỉ phản ánh lý thuyết DPS — vẫn cần xác nhận cảm nhận né đòn từ playtest người thật (P3-1).
9. **Tiêu chí nghiệm thu**: Xuất bảng TTK/TTD chính xác cho cả 8 mốc với đơn vị giây và chú thích rõ giới hạn mô phỏng.
10. **Điểm sau khi triển khai và kiểm thử**: `86 / 100`

### 20. UI/UX — Giao diện và trải nghiệm người dùng
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: Giao diện Celestial Gold thống nhất, HUD tách khỏi vòng lặp 60Hz, không có nút giả, hỗ trợ đa kích thước màn hình.
3. **Vấn đề tồn tại**: `AuctionHouseModal.tsx` còn 2 chấm `animate-pulse` trang trí; `TalentsModal.tsx` chưa hiển thị tiến độ mở khóa Endgame và chưa định dạng số `tabular-nums` có phân tách hàng nghìn cho số lớn.
4. **Nguyên nhân gốc rễ**: Thiếu rà soát cuối cùng sau các đợt bổ sung tính năng Wave 10–14.
5. **Giải pháp đề xuất**: Gỡ chấm `animate-pulse`, bổ sung thẻ **Tinh Tuý Hoàng Đạo** + định dạng số rõ ràng trong `TalentsModal.tsx`, thêm bảng **Giám Sát An Ninh** sạch Zero-Pill trong `AssetAdminLiveOpsTab.tsx`, và kiểm tra trực tiếp trên trình duyệt thật.
6. **File hoặc module liên quan**: `src/components/AuctionHouseModal.tsx`, `src/components/TalentsModal.tsx`, `src/components/SettingsModal.tsx`, `src/components/AssetAdminLiveOpsTab.tsx`.
7. **Mức độ ưu tiên**: P1 / P2
8. **Rủi ro khi thay đổi**: Chèn thêm thẻ vào modal có thể gây tràn chiều cao trên màn hình nhỏ nếu không bọc `overflow-y-auto`.
9. **Tiêu chí nghiệm thu**: Kiểm tra bằng headless Chromium (`playwright-cli`) ở desktop 1440×900: 0 lỗi console, không cắt chữ/chồng lấn nút.
10. **Điểm sau khi triển khai và kiểm thử**: `86 / 100`

### 21. Game Feel — Cảm giác chơi
1. **Điểm hiện tại (Trước)**: `82 / 100`
2. **Bằng chứng đánh giá**: `combatFeelDirector.ts` (Hitstop, Camera Shake trauma, recoil, kill burst), phản hồi âm thanh/hình ảnh đồng bộ trên đòn chí mạng và nâng cấp.
3. **Vấn đề tồn tại**: Người chơi nhạy cảm với ánh sáng chớp chưa có tùy chọn riêng để giảm độ lóe màn hình mà vẫn giữ nguyên cảm giác chuyển động.
4. **Nguyên nhân gốc rễ**: Trước đây giảm chớp sáng bị gộp chung với `reducedMotion`.
5. **Giải pháp đề xuất**: Tách riêng `reduceScreenFlash` (`flashScale = 0.25`) và bổ sung phản hồi trực quan cho khiên `jade_bastion` + nâng bậc Tinh Tuý Hoàng Đạo.
6. **File hoặc module liên quan**: `src/engine/zodiacLightingVfxDirector.ts`, `src/engine/GameEngine.ts`, `src/components/SettingsModal.tsx`.
7. **Mức độ ưu tiên**: P1
8. **Rủi ro khi thay đổi**: Giảm quá tay `flashScale` về 0 sẽ làm mất dấu hiệu phản hồi trúng đòn — giữ ở mức `0.25x` êm dịu nhưng vẫn rõ.
9. **Tiêu chí nghiệm thu**: Unit test xác minh `flashScale = 0.25` khi bật Anti-Flash và `1.0` ở mặc định.
10. **Điểm sau khi triển khai và kiểm thử**: `86 / 100`

### 22. Performance — Hiệu năng
1. **Điểm hiện tại (Trước)**: `76 / 100`
2. **Bằng chứng đánh giá**: `hardwareProfile.ts` nhận diện GPU/CPU/RAM/Intel HD 4000, Chế độ Lite toàn hệ thống 12 chương, GPU Thermal Watchdog Stage 0→4, `vfxBudgetGovernor.ts`, object pooling.
3. **Vấn đề tồn tại**: `GameEngine.ts` vẫn giữ 3 `THREE.PointLight` trong `THREE.Scene` ngay cả khi bật Lite Mode hoặc trên Intel HD 4000 (Dell Latitude E5430), gây biên dịch fragment shader nặng và nguy cơ đen màn hình/sập nguồn.
4. **Nguyên nhân gốc rễ**: Chỉ hạ `intensity = 0` không làm Three.js loại bỏ vòng lặp đèn điểm khỏi GLSL shader.
5. **Giải pháp đề xuất**: Triển khai `resolveDynamicPointLightPolicy` + `syncPointLightPolicy()` tháo hẳn đèn điểm khỏi `THREE.Scene` về **0 PointLights** trên `lowEndGpu / isSoftwareGl / liteActive / low / watchdog >= 2`.
6. **File hoặc module liên quan**: `src/engine/zodiacLightingVfxDirector.ts`, `src/engine/GameEngine.ts`, `src/engine/hardwareProfile.ts`, `PERFORMANCE_REPORT.md`.
7. **Mức độ ưu tiên**: P0
8. **Rủi ro khi thay đổi**: Phải kiểm soát việc chỉ gọi `syncPointLightPolicy()` tại các điểm chuyển cấu hình để tránh recompile shader giữa trận.
9. **Tiêu chí nghiệm thu**: Unit test xác minh 0 PointLights ở mọi cấu hình E5430/Lite/Watchdog ≥ 2; ghi nhận trung thực rằng đo nhiệt/FPS 1% low 60 phút trên máy vật lý Dell E5430 còn chờ P3-1.
10. **Điểm sau khi triển khai và kiểm thử**: `88 / 100`

### 23. Code Architecture — Kiến trúc mã nguồn
1. **Điểm hiện tại (Trước)**: `72 / 100`
2. **Bằng chứng đánh giá**: Tách biệt rõ lớp dữ liệu (`src/data/`), dịch vụ (`src/services/`), máy chủ (`server.ts`, `src/server/`), và các director thuần túy (`zodiacLightingVfxDirector`, `economyTelemetry`, `serverSecurity`).
3. **Vấn đề tồn tại**: `src/engine/GameEngine.ts` (~24.8k dòng) và `src/App.tsx` (~13k dòng) có độ tập trung cao, gây nợ kỹ thuật khi bảo trì dài hạn.
4. **Nguyên nhân gốc rễ**: Tốc độ phát triển nhiều wave liên tiếp ưu tiên tính năng chạy ổn định thay vì tách nhỏ tệp lõi.
5. **Giải pháp đề xuất**: Trích xuất toàn bộ logic mới thành các module thuần túy dễ test (`economyTelemetry.ts`, `saveIntegrity.ts`, `serverSecurity.ts`, `talentsData.ts` Paragon) thay vì phình to thêm tệp lõi; lên kế hoạch tách module hóa có kiểm soát ở P2-3 (tránh đập đi xây lại gây vỡ tính năng đang chạy tốt).
6. **File hoặc module liên quan**: `src/engine/GameEngine.ts`, `src/App.tsx`, `src/data/economyTelemetry.ts`, `src/server/serverSecurity.ts`.
7. **Mức độ ưu tiên**: P2
8. **Rủi ro khi thay đổi**: Tách lớn `GameEngine.ts` không có test E2E sâu dễ gây lỗi ngầm vòng lặp 3D.
9. **Tiêu chí nghiệm thu**: 0 lỗi `tsc --noEmit`, Vite build sạch, mọi module mới có unit test riêng độc lập.
10. **Điểm sau khi triển khai và kiểm thử**: `78 / 100`

### 24. Asset Pipeline — Quy trình quản lý tài nguyên
1. **Điểm hiện tại (Trước)**: `79 / 100`
2. **Bằng chứng đánh giá**: Backblaze B2 + Cloudflare Worker CDN, `scripts/glb-manifest.json` quản lý 173 tệp High/Lite, `glbPipelineValidator.ts` kiểm định ngân sách E5430, công cụ quản trị `/admin/assets`.
3. **Vấn đề tồn tại**: Tệp `aries-arena-high.glb` thiếu cặp `-lite` trong manifest; 1 tệp legacy `hatsune-miku-lite.glb` nặng 3.47 MB (> 2.5 MB); test GLB local báo `ENOENT` trên môi trường không kéo binary về đĩa.
4. **Nguyên nhân gốc rễ**: Tệp nhị phân được chuyển hẳn lên CDN để giảm dung lượng repo nhưng test engine cũ vẫn đọc `fs.readFileSync`.
5. **Giải pháp đề xuất**: Xác minh manifest `e5430Safe`, ghi nhận minh bạch các cảnh báo nhẹ trong `PERFORMANCE_REPORT.md` & `QA_TEST_REPORT.md`, và đưa P2-1/P2-2 vào lộ trình xử lý dứt điểm.
6. **File hoặc module liên quan**: `scripts/glb-manifest.json`, `src/engine/glbPipelineValidator.ts`, `src/data/assetRegistry.test.ts`.
7. **Mức độ ưu tiên**: P2
8. **Rủi ro khi thay đổi**: Xóa nhầm đường dẫn manifest sẽ gây 404 mô hình cho người chơi đang dùng bản cũ.
9. **Tiêu chí nghiệm thu**: `assetRegistry.test.ts` pass 100%, `validateGlbPipelineManifest` 0 lỗi nghiêm trọng.
10. **Điểm sau khi triển khai và kiểm thử**: `84 / 100`

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
2. **Bằng chứng đánh giá**: Đã có tùy chỉnh cỡ chữ UI (`small / normal / large`), bảng màu mù màu cho vòng cảnh báo (`colorblindTelegraphs.ts`), giảm rung màn hình, giảm chuyển động, chỉnh âm lượng riêng.
3. **Vấn đề tồn tại**: Thiếu công tắc **Giảm Chớp Sáng (Anti-Flash)** độc lập; chưa hỗ trợ Gamepad API và ARIA live regions đầy đủ.
4. **Nguyên nhân gốc rễ**: Hiệu ứng lóe sáng chí mạng/kỹ năng trước đây gắn cứng vào `reducedMotion`.
5. **Giải pháp đề xuất**: Thêm cài đặt độc lập `reduceScreenFlash` trong `SettingsModal.tsx` + `liveOpsData.ts` + `zodiacLightingVfxDirector.ts` (giảm 75% xung sáng); ghi nhận Gamepad/ARIA vào P3-3.
6. **File hoặc module liên quan**: `src/types/game.ts`, `src/data/liveOpsData.ts`, `src/components/SettingsModal.tsx`, `src/engine/zodiacLightingVfxDirector.ts`.
7. **Mức độ ưu tiên**: P1
8. **Rủi ro khi thay đổi**: Cần bảo đảm save cũ không có khóa `reduceScreenFlash` sẽ mặc định an toàn về `false`.
9. **Tiêu chí nghiệm thu**: Nút Anti-Flash hiển thị rõ trên `SettingsModal`, lưu bền vững và giảm `flashScale` xuống `0.25`.
10. **Điểm sau khi triển khai và kiểm thử**: `85 / 100`

### 28. Security & Anti-Cheat — Bảo mật và chống gian lận
1. **Điểm hiện tại (Trước)**: `74 / 100`
2. **Bằng chứng đánh giá**: `firestore.rules` (7 blueprint, 0 lỗi ESLint), xác thực Firebase ID Token ở `server.ts`, rate limiter API, kẹp tải trọng WebSocket, không lộ bí mật trên frontend.
3. **Vấn đề tồn tại**: Thiếu bộ ghi nhận hành vi bất thường tập trung (rate limit, gói WS bất thường, 401/403); `saveIntegrity.ts` còn fallback legacy `'artemis'` và chưa kẹp trần đầy đủ `awakeningLevel`, `heroStars`, `pity`, `paragonInfusionLevel`, khử trùng thư.
4. **Nguyên nhân gốc rễ**: Lớp giám sát an ninh mới dừng ở chặn tại chỗ chưa có telemetry cho Admin.
5. **Giải pháp đề xuất**: Xây dựng `SecurityAnomalyTracker` (ring buffer 200 sự kiện) + endpoint chỉ Admin `GET /api/admin/security-anomalies`, gia cố toàn diện `saveIntegrity.ts` và thêm đầy đủ unit test.
6. **File hoặc module liên quan**: `src/server/serverSecurity.ts`, `src/server/serverSecurity.test.ts`, `server.ts`, `src/data/saveIntegrity.ts`, `src/data/saveIntegrity.test.ts`, `firestore.rules`.
7. **Mức độ ưu tiên**: P0 / P1
8. **Rủi ro khi thay đổi**: Kẹp trần sai trong `saveIntegrity.ts` có thể làm hụt dữ liệu hợp lệ của người chơi cũ hoặc báo anomaly giả cho tài khoản sạch.
9. **Tiêu chí nghiệm thu**: Tài khoản sạch báo `hadAnomalies: false`, dữ liệu sửa đổi bị kẹp chặt, `npx eslint firestore.rules` = 0 lỗi, `serverSecurity.test.ts` & `saveIntegrity.test.ts` pass 100%.
10. **Điểm sau khi triển khai và kiểm thử**: `88 / 100`

### 29. Quality Assurance — Kiểm thử chất lượng
1. **Điểm hiện tại (Trước)**: `70 / 100`
2. **Bằng chứng đánh giá**: Có nền tảng `node:test`, nhưng nhiều test hợp đồng Ch.3–4 đang lệch sau cập nhật mới và chưa có test cho kinh tế 8 mốc, an ninh máy chủ, 0-PointLight hay kiểm tra trình duyệt sống.
3. **Vấn đề tồn tại**: Lệch test contract Ch.3–4 (`assetRegistry`, `earlyProgression`, `fairProgression30Day`), thiếu test `saveIntegrity` / `serverSecurity` / `economyTelemetry`; 27 subtest đọc binary `.glb` cục bộ báo `ENOENT` do asset nằm trên CDN.
4. **Nguyên nhân gốc rễ**: Cập nhật tính năng nhanh chưa đồng bộ regression gate đầy đủ.
5. **Giải pháp đề xuất**: Sửa triệt để các lỗi thật làm vỡ test, bổ sung bộ test mới cho kinh tế/an ninh/0-PointLight/Paragon, chạy kiểm thử trình duyệt thật (`playwright-cli`), và ghi nhận trung thực nguyên nhân 27 `ENOENT` CDN.
6. **File hoặc module liên quan**: `tests/*.test.mjs`, `src/data/*.test.ts`, `src/server/serverSecurity.test.ts`, `src/engine/zodiacLightingVfxDirector.test.ts`, `QA_TEST_REPORT.md`.
7. **Mức độ ưu tiên**: P0 / P1
8. **Rủi ro khi thay đổi**: Tuyệt đối không nới lỏng assert để che lỗi thật — chỉ sửa bug gốc và đồng bộ spec Ch.3–4 hợp lệ.
9. **Tiêu chí nghiệm thu**: 100% bộ test logic & tích hợp pass (0 fail, 0 skip), `tsc --noEmit` 0 lỗi, Vite build sạch, kiểm tra trình duyệt thật 0 lỗi runtime.
10. **Điểm sau khi triển khai và kiểm thử**: `88 / 100`

### 30. Live Operations — Vận hành và mở rộng
1. **Điểm hiện tại (Trước)**: `80 / 100`
2. **Bằng chứng đánh giá**: Bảng quản trị `/admin/assets`, `AssetAdminLiveOpsTab.tsx`, cấu hình động `liveOpsData.ts`, di cư save tương thích ngược `PROGRESSION_SCHEMA_VERSION`.
3. **Vấn đề tồn tại**: Quản trị viên chưa quan sát được trực tiếp các sự kiện an ninh bất thường từ bảng LiveOps; chưa có hẹn giờ bật/tắt sự kiện tự động theo lịch (P2-4).
4. **Nguyên nhân gốc rễ**: Chưa có API telemetry an ninh nối sang giao diện Admin.
5. **Giải pháp đề xuất**: Tích hợp thẻ đọc-duy-nhất **Giám Sát Bất Thường & An Ninh Máy Chủ** vào `AssetAdminLiveOpsTab.tsx` kết nối trực tiếp `GET /api/admin/security-anomalies`; ghi nhận lịch sự kiện tự động vào P2-4.
6. **File hoặc module liên quan**: `src/components/AssetAdminLiveOpsTab.tsx`, `server.ts`, `src/data/liveOpsData.ts`.
7. **Mức độ ưu tiên**: P1 / P2
8. **Rủi ro khi thay đổi**: Endpoint admin bắt buộc phải yêu cầu Bearer Token hợp lệ của tài khoản Admin, không được mở công khai.
9. **Tiêu chí nghiệm thu**: Endpoint trả 401/403 nếu không phải Admin, hiển thị bảng dữ liệu thật với `tabular-nums`, tương thích ngược 100% save cũ.
10. **Điểm sau khi triển khai và kiểm thử**: `86 / 100`

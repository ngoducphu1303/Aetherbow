import assert from 'node:assert/strict';
import test from 'node:test';
import {
  compactCombatCalloutLabel,
  resolveFloatingNumberPresentation,
} from './combatFeel';
import {
  computeTopHudSafeZoneY,
  resolveTopCombatBanner,
} from './combatHudBanners';

const EMPTY_HUD = {
  heroName: 'Alice',
};

test('resolveTopCombatBanner collapses simultaneous Boss alerts into a single highest-priority top-edge strip', () => {
  // Exact worst-case pile-up from real gameplay: Warning + Finisher + Phase II + Guard-Break + Part Broken + Counter Window
  const fullPileUp = {
    ...EMPTY_HUD,
    bossWarningTitle: 'Sư Tử Cánh Ánh Dương · Tiên Phong',
    bossWarningSubtitle: 'PHA II CUỒNG NỘ · CỬA SỔ PHẢN CÔNG 2.5S!',
    bossFinisherTimer: 1.2,
    bossFinisherName: 'Sư Tử Cánh Ánh Dương · Tiên Phong',
    bossPartBrokenBanner: 'PHÁ VỠ SỪNG HỘ GIÁP · -18% Công Boss',
    bossBrokenBannerTimer: 1.8,
    bossPhaseTwoBannerTimer: 2.0,
    phaseCounterReady: true,
    phaseCounterWindowSec: 2.1,
    phaseCounterWindowTotalSec: 2.5,
    ultCutinTimer: 1.0,
    ultCutinTitle: 'Mưa Tên Ánh Dương',
  };

  // Priority 1: Phase Counter Window wins over everything else
  const top1 = resolveTopCombatBanner(fullPileUp, 'Sư Tử Cánh Ánh Dương', false);
  assert.ok(top1);
  assert.equal(top1.kind, 'phase_counter');
  assert.equal(top1.tone, 'cyan');
  assert.equal(top1.timerText, '2.1s');
  assert.ok((top1.progressRatio ?? 0) > 0.8);

  // Without Phase Counter, Boss Finisher wins over Guard-Break / Warning / Part Broken
  const top2 = resolveTopCombatBanner(
    { ...fullPileUp, phaseCounterReady: false, phaseCounterWindowSec: 0 },
    null,
    false
  );
  assert.equal(top2?.kind, 'boss_finisher');

  // Without Finisher, Guard-Break wins over Phase II & Warning
  const top3 = resolveTopCombatBanner(
    {
      ...fullPileUp,
      phaseCounterReady: false,
      phaseCounterWindowSec: 0,
      bossFinisherTimer: 0,
    },
    null,
    false
  );
  assert.equal(top3?.kind, 'boss_broken');

  // When only Boss Warning is active, Normal HUD includes concise detail while Compact HUD strips subtitle
  const warnNormal = resolveTopCombatBanner(
    {
      ...EMPTY_HUD,
      bossWarningTitle: 'Sư Tử Cánh Ánh Dương · Tiên Phong',
      bossWarningSubtitle: 'PHA II CUỒNG NỘ · CỬA SỔ PHẢN CÔNG 2.5S!',
    },
    null,
    false
  );
  const warnCompact = resolveTopCombatBanner(
    {
      ...EMPTY_HUD,
      bossWarningTitle: 'Sư Tử Cánh Ánh Dương · Tiên Phong',
      bossWarningSubtitle: 'PHA II CUỒNG NỘ · CỬA SỔ PHẢN CÔNG 2.5S!',
    },
    null,
    true
  );
  assert.equal(warnNormal?.kind, 'boss_warning');
  assert.ok(Boolean(warnNormal?.detail));
  assert.equal(warnCompact?.kind, 'boss_warning');
  assert.equal(warnCompact?.detail, undefined);

  // Idle combat with no active alert returns null (zero clutter)
  assert.equal(resolveTopCombatBanner(EMPTY_HUD, null, false), null);
});

test('computeTopHudSafeZoneY reserves tighter safe vertical margin in Compact HUD than Normal HUD', () => {
  const normalBossY = computeTopHudSafeZoneY(true, false);
  const compactBossY = computeTopHudSafeZoneY(true, true);
  const compactNoBossY = computeTopHudSafeZoneY(false, true);

  assert.ok(compactBossY < normalBossY, 'Compact HUD should free more vertical screen space');
  assert.ok(compactNoBossY < compactBossY, 'Rooms without Boss bar need less top safe margin');
});

test('compactCombatCalloutLabel shortens verbose Vietnamese boss & reaction callouts to <= 12 chars', () => {
  assert.equal(compactCombatCalloutLabel('PHẢN ĐÒN CHUYỂN PHA!'), 'Phản Pha');
  assert.equal(compactCombatCalloutLabel('VỠ SỪNG HỘ GIÁP!'), 'Vỡ Sừng');
  assert.equal(compactCombatCalloutLabel('KÍCH NỔ CỐT LÕI CỔ NGỮ!'), 'Nổ Cổ Ngữ');
  assert.equal(compactCombatCalloutLabel('SIÊU DẪN!'), 'Siêu Dẫn');
  assert.equal(compactCombatCalloutLabel('TAN CHẢY!'), 'Chảy');

  // Dynamic fallback still stays compact
  const custom = compactCombatCalloutLabel('KÍCH NỔ BÃO LỬA HOÀNG ĐẠO!');
  assert.ok(custom && custom.length <= 12, `Expected <=12 chars, got "${custom}"`);
});

test('resolveFloatingNumberPresentation caps simultaneous text callouts at 2 lines, prevents 2D overlap, and stays below Boss HUD bar', () => {
  // Reproduce exact 4-callout collision from the Boss fight screenshot at identical screen coordinates (640, 90)
  const pileUp = [
    { id: 101, x: 640, y: 90, amount: 0, isCrit: true, label: 'PHẢN ĐÒN CHUYỂN PHA!', element: 'fire' as const },
    { id: 102, x: 640, y: 90, amount: 0, isCrit: true, label: 'VỠ SỪNG HỘ GIÁP!', element: 'ice' as const },
    { id: 103, x: 640, y: 90, amount: 177, isCrit: true, label: 'SIÊU DẪN!', element: 'storm' as const },
    { id: 104, x: 640, y: 90, amount: 449, isCrit: true, isSuperCrit: true, label: 'KÍCH NỔ CỐT LÕI CỔ NGỮ!', element: 'fire' as const },
    { id: 105, x: 640, y: 95, amount: 278, isCrit: false },
  ];

  const topSafeY = computeTopHudSafeZoneY(true, true);
  const presented = resolveFloatingNumberPresentation(pileUp, 1, true, {
    topSafeY,
    maxLabelLines: 2,
  });

  const labeledItems = presented.filter((item) => Boolean(item.compactLabel));
  assert.ok(
    labeledItems.length <= 2,
    `Must display at most 2 floating text callout lines simultaneously, got ${labeledItems.length}`
  );
  assert.equal(labeledItems.length, 2, 'Should keep the top 2 highest-priority callout lines');

  // Every visible item must stay strictly below the top Boss HUD bar safe zone
  for (const item of presented) {
    assert.ok(
      item.y >= topSafeY,
      `Floating item ${item.id} y=${item.y} must stay below topSafeY=${topSafeY}`
    );
  }

  // The 2 labeled callout lines must NOT overlap each other in 2D space
  const [a, b] = labeledItems;
  const separatedX = Math.abs(a.x - b.x) >= 110;
  const separatedY = Math.abs(a.y - b.y) >= 20;
  assert.ok(
    separatedX || separatedY,
    `Two labeled callouts must not overlap: (${a.x},${a.y}) vs (${b.x},${b.y})`
  );

  // Every compact label stays crisp and short
  for (const item of labeledItems) {
    assert.ok(
      (item.compactLabel?.length ?? 0) <= 12,
      `Compact label "${item.compactLabel}" should be <= 12 chars`
    );
  }
});

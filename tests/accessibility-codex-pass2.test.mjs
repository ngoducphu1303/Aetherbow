import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveGeometricTelegraphSpec } from '../src/engine/colorblindTelegraphs.ts';
import {
  DEFAULT_COMBAT_KEYBINDS,
  normalizeCombatKeybinds,
  remapCombatKeybind,
} from '../src/engine/aaaWave6Director.ts';
import { normalizeSettings } from '../src/data/liveOpsData.ts';
import { buildBossCodexEntries } from '../src/data/phase5Data.ts';
import { createInitialSaveData } from '../src/data/gearData.ts';
import { validateAndSanitizeSaveIntegrity } from '../src/data/saveIntegrity.ts';

test('Colorblind-safe geometric telegraphs distinguish danger types by shape as well as color', () => {
  const aoe = resolveGeometricTelegraphSpec('aoe_ring', true);
  const charge = resolveGeometricTelegraphSpec('charge_lane', true);
  const beam = resolveGeometricTelegraphSpec('beam_reticle', true);
  const interrupt = resolveGeometricTelegraphSpec('interrupt_halo', true);

  assert.equal(aoe.useDoubleRing, true);
  assert.ok(charge.chevronCount >= 3);
  assert.equal(beam.crosshairArms, true);
  assert.equal(interrupt.octagonSegments, 8);
  assert.equal(interrupt.labelBadge, 'NGẮT CHIÊU');
});

test('Settings normalize 3-step uiTextScale (normal/large/xlarge), watchdog, adaptive music, and toggleAutoPilot keybind', () => {
  const s1 = normalizeSettings({ uiTextScale: 'xlarge', colorblindTelegraphs: true, autoGpuWatchdog: true });
  assert.equal(s1.uiTextScale, 'xlarge');
  assert.equal(s1.colorblindTelegraphs, true);
  assert.equal(s1.autoGpuWatchdog, true);
  assert.equal(s1.adaptiveChapterMusic, true);
  assert.equal(s1.keybinds?.toggleAutoPilot, 'KeyV');

  const legacyKb = normalizeCombatKeybinds({ dash: 'Space', ultimate: 'KeyQ' });
  assert.equal(legacyKb.toggleAutoPilot, DEFAULT_COMBAT_KEYBINDS.toggleAutoPilot);

  const remapped = remapCombatKeybind(legacyKb, 'toggleAutoPilot', 'KeyB');
  assert.equal(remapped.toggleAutoPilot, 'KeyB');
});

test('Boss Codex entries include Lore, 3-Phase summaries, Interrupt tips, and ★1-★4 star progress', () => {
  const save = {
    ...createInitialSaveData(),
    highestChapterCleared: 2,
    chapterMilestones: {
      1: { chapterId: 1, clears: 2, starsEarned: [1, 2, 3] },
    },
  };
  const bosses = buildBossCodexEntries(save);
  assert.equal(bosses.length, 12);
  assert.equal(bosses[0].hasPhaseThree, true);
  assert.equal(bosses[0].starsEarned, 3);
  assert.equal(bosses[0].maxStars, 4);
  assert.equal(bosses[0].phasesSummary.length, 3);
  assert.ok(bosses[0].loreExcerpt.length > 20);
  assert.ok(bosses[0].interruptTip.includes('E'));
});

test('Save integrity sanitizes discoveredEvolutions without touching legitimate legacy fields', () => {
  const raw = {
    ...createInitialSaveData(),
    gold: 12345,
    discoveredEvolutions: ['evo_fire_solar_lance', 'corrupted_fake_id'],
  };
  const report = validateAndSanitizeSaveIntegrity(raw);
  assert.equal(report.ok, false);
  assert.equal(report.sanitizedSave.gold, 12345);
  assert.deepEqual(report.sanitizedSave.discoveredEvolutions, ['evo_fire_solar_lance']);
});

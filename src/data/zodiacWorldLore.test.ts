import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CHAPTERS } from './chaptersData';
import { getZodiacChapterLore, ZODIAC_WORLD_LORE } from './zodiacWorldLore';

describe('Wave 5 Zodiac World Building & Chapter Arena Layout Rotation (Criteria 14 & 15)', () => {
  it('provides complete, unique world lore for all 12 Zodiac chapters', () => {
    assert.equal(ZODIAC_WORLD_LORE.length, 12);
    const realmTitles = new Set<string>();
    const factionNames = new Set<string>();

    for (const ch of CHAPTERS) {
      const lore = getZodiacChapterLore(ch.id);
      assert.ok(lore, `missing lore for chapter ${ch.id}`);
      assert.equal(lore.zodiacId, ch.zodiacId);
      assert.ok(lore.realmTitle.length >= 6);
      assert.ok(lore.factionName.length >= 6);
      assert.ok(lore.chronicle.length >= 40);
      assert.ok(lore.bossLore.length >= 40);
      assert.ok(lore.tacticalTip.length >= 25);
      realmTitles.add(lore.realmTitle);
      factionNames.add(lore.factionName);
    }

    assert.equal(realmTitles.size, 12);
    assert.equal(factionNames.size, 12);
  });

  it('preserves Chapter 1 FTUE obstacle sequence while rotating starting arena layouts across Chapters 2-12', () => {
    const ch1 = CHAPTERS.find((c) => c.id === 1);
    assert.ok(ch1);
    assert.equal(ch1.stages[0].obstaclePreset, 'courtyard');
    assert.equal(ch1.stages[1].obstaclePreset, 'pillars');
    assert.equal(ch1.stages[2].obstaclePreset, 'cross');
    assert.equal(ch1.stages[3].obstaclePreset, 'sanctum');

    // Chapters 1..4 must start with all 4 distinct arena obstacle presets
    const startingPresets = CHAPTERS.slice(0, 4).map((c) => c.stages[0].obstaclePreset);
    assert.deepEqual(startingPresets, ['courtyard', 'pillars', 'cross', 'gauntlet']);

    // Stage 8 sub-boss event is deterministic ('devil') across all 12 chapters
    for (const ch of CHAPTERS) {
      assert.equal(ch.stages[7].eventAfter, 'devil');
      assert.equal(ch.stages[11].obstaclePreset, 'sanctum');
    }
  });
});

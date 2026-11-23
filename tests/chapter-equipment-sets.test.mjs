import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyChapterEquipmentSet,
  CHAPTER_EQUIPMENT_SETS,
  getChapterEquipmentStatus,
  saveChapterEquipmentSet,
} from '../src/data/chapterEquipmentSets.ts';
import { grantChapter2Collection } from '../src/data/chapter2Collection.ts';
import { migrateSaveData } from '../src/data/earlyProgressionData.ts';
import { createInitialSaveData } from '../src/data/gearData.ts';
import { GearSlot, Rarity } from '../src/types/game.ts';

test('full chapter sets save and restore independently after reloading', () => {
  const [leo, aries] = CHAPTER_EQUIPMENT_SETS;
  const initial = createInitialSaveData();
  assert.equal(saveChapterEquipmentSet(initial, 1), initial, 'incomplete set cannot be saved');
  const restricted = { ...initial, ...aries.equipment, chapterEquipmentPresets: [{ chapterId: 2, skinId: 'golden_fleece', equipped: {} }] };
  assert.equal(saveChapterEquipmentSet(restricted, 2), restricted);
  assert.equal(applyChapterEquipmentSet(restricted, 2), restricted);

  const cleared = grantChapter2Collection({ ...initial, highestChapterCleared: 2 });
  const wearingLeo = {
    ...cleared, ...leo.equipment, equippedSkinByHero: { aurelia: 'aurelia_winter_solstice' },
  };
  const savedLeo = saveChapterEquipmentSet(wearingLeo, 1);
  const spear = { uid: 'aries-weapon', templateId: 'heroic_longbow', rarity: Rarity.RARE, level: 3 };
  const wearingAries = {
    ...savedLeo,
    ...aries.equipment,
    equippedSkinByHero: { ...savedLeo.equippedSkinByHero, bellona: 'golden_fleece' },
    inventory: [...savedLeo.inventory, spear],
    equipped: { [GearSlot.WEAPON]: spear.uid },
  };
  const savedAries = saveChapterEquipmentSet(wearingAries, 2);
  const reloaded = migrateSaveData(JSON.parse(JSON.stringify(savedAries)));
  assert.equal(reloaded.chapterEquipmentPresets.length, 2);
  assert.ok(getChapterEquipmentStatus(reloaded, aries).wearingSavedSet);

  const switchedLeo = applyChapterEquipmentSet(reloaded, 1);
  assert.ok(getChapterEquipmentStatus(switchedLeo, leo).wearingSavedSet);
  assert.deepEqual(switchedLeo.equipped, wearingLeo.equipped);
  assert.equal(switchedLeo.equippedSkinByHero.aurelia, 'aurelia_winter_solstice');

  const switchedAries = applyChapterEquipmentSet(switchedLeo, 2);
  assert.ok(getChapterEquipmentStatus(switchedAries, aries).wearingSavedSet);
  assert.deepEqual(switchedAries.equipped, wearingAries.equipped);
  assert.equal(switchedAries.equippedSkinByHero.bellona, 'golden_fleece');

  const afterFusion = { ...savedAries, ...leo.equipment, equipped: switchedLeo.equipped, inventory: cleared.inventory };
  assert.equal(getChapterEquipmentStatus(afterFusion, aries).missingGear, 1);
  const restoredAfterFusion = applyChapterEquipmentSet(afterFusion, 2);
  assert.equal(restoredAfterFusion.equipped[GearSlot.WEAPON], switchedLeo.equipped[GearSlot.WEAPON]);
  assert.equal(restoredAfterFusion.selectedHeroId, 'bellona');
  assert.deepEqual(restoredAfterFusion.inventory, afterFusion.inventory);
});

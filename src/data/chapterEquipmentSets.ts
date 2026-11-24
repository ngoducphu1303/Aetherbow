import { GearSlot, type ChapterEquipmentPreset, type HeroSkinId, type SaveData } from '../types/game';
import { GEAR_TEMPLATES } from './gearData';
import { SKIN_MAP } from './wave3Data';

type ChapterEquipment = Required<{
  [Key in 'selectedHeroId' | 'equippedPetId' | 'equippedWingId' |
    'equippedMountId' | 'equippedArtifactId' | 'equippedHaloId']: NonNullable<SaveData[Key]>;
}>;

interface ChapterEquipmentSet {
  chapterId: number;
  unlockChapter: number;
  equipment: ChapterEquipment;
}

export const CHAPTER_EQUIPMENT_SETS: readonly ChapterEquipmentSet[] = [
  {
    chapterId: 1,
    unlockChapter: 0,
    equipment: {
      selectedHeroId: 'aurelia',
      equippedPetId: 'astraeo',
      equippedWingId: 'solar_zenith',
      equippedMountId: 'solarius',
      equippedArtifactId: 'astrolabe_regulus',
      equippedHaloId: 'leo_sovereign',
    },
  },
  {
    chapterId: 2,
    unlockChapter: 2,
    equipment: {
      selectedHeroId: 'bellona',
      equippedPetId: 'pyro',
      equippedWingId: 'crimson_ram_wings',
      equippedMountId: 'vulcan',
      equippedArtifactId: 'war_horn',
      equippedHaloId: 'aries_vanguard',
    },
  },
  {
    chapterId: 3,
    unlockChapter: 3,
    equipment: {
      selectedHeroId: 'sylvia',
      equippedPetId: 'jade_calf',
      equippedWingId: 'emerald_taurus_wings',
      equippedMountId: 'jade_bull',
      equippedArtifactId: 'jade_heart_relic',
      equippedHaloId: 'emerald_taurus_halo',
    },
  },
  {
    chapterId: 4,
    unlockChapter: 4,
    equipment: {
      selectedHeroId: 'celeste',
      equippedPetId: 'twin_astral_spirits',
      equippedWingId: 'dual_gemini_wings',
      equippedMountId: 'celestial_wind_mount',
      equippedArtifactId: 'twin_hourglass_relic',
      equippedHaloId: 'gemini_halo',
    },
  },
];

const GEAR_SLOTS = Object.values(GearSlot);

function isChapterSkin(set: ChapterEquipmentSet, skinId: HeroSkinId): boolean {
  return skinId === 'default' || SKIN_MAP[skinId]?.heroId === set.equipment.selectedHeroId;
}

function ownsSkin(save: SaveData, skinId: HeroSkinId): boolean {
  return skinId === 'default' || Boolean(save.unlockedSkins?.includes(skinId));
}

function ownsChapterSet(save: SaveData, set: ChapterEquipmentSet): boolean {
  const gear = set.equipment;
  return save.highestChapterCleared >= set.unlockChapter &&
    save.unlockedHeroes.includes(gear.selectedHeroId) &&
    Boolean(save.pets?.some(({ petId }) => petId === gear.equippedPetId)) &&
    Boolean(save.unlockedWings?.includes(gear.equippedWingId)) &&
    Boolean(save.unlockedMounts?.includes(gear.equippedMountId)) &&
    Boolean(save.unlockedArtifacts?.includes(gear.equippedArtifactId)) &&
    Boolean(save.unlockedHalos?.includes(gear.equippedHaloId));
}

export function normalizeChapterEquipmentPresets(raw: SaveData['chapterEquipmentPresets']): ChapterEquipmentPreset[] {
  if (!Array.isArray(raw)) return [];

  const presets: ChapterEquipmentPreset[] = [];
  for (const set of CHAPTER_EQUIPMENT_SETS) {
    const preset = raw.find((entry) => entry?.chapterId === set.chapterId);
    if (!preset || !isChapterSkin(set, preset.skinId)) continue;
    const equipped: SaveData['equipped'] = {};
    for (const slot of GEAR_SLOTS) {
      const uid = preset.equipped?.[slot];
      if (typeof uid === 'string' && uid.length > 0) equipped[slot] = uid;
    }
    presets.push({ chapterId: set.chapterId, skinId: preset.skinId, equipped });
  }
  return presets;
}

function resolveCombatGear(save: SaveData, equipped: SaveData['equipped'], keepCurrentWhenMissing = false) {
  const itemsByUid = new Map(save.inventory.map((item) => [item.uid, item]));
  const result: SaveData['equipped'] = {};
  let missing = 0;
  const fitsSlot = (uid: string, slot: GearSlot) => {
    const item = itemsByUid.get(uid);
    return item && GEAR_TEMPLATES[item.templateId]?.slot === slot;
  };
  for (const slot of GEAR_SLOTS) {
    const uid = equipped[slot];
    if (!uid) continue;
    if (fitsSlot(uid, slot)) {
      result[slot] = uid;
    } else {
      missing += 1;
      const current = save.equipped[slot];
      if (keepCurrentWhenMissing && current && fitsSlot(current, slot)) result[slot] = current;
    }
  }
  return { equipped: result, missing };
}

export function getChapterEquipmentStatus(save: SaveData, set: ChapterEquipmentSet) {
  const slots = Object.keys(set.equipment) as (keyof ChapterEquipment)[];
  const wornCount = slots.filter((slot) => save[slot] === set.equipment[slot]).length;
  const owned = ownsChapterSet(save, set);
  const skinId = save.equippedSkinByHero?.[set.equipment.selectedHeroId] ?? 'default';
  const preset = save.chapterEquipmentPresets?.find(({ chapterId }) => chapterId === set.chapterId);
  const missingGear = preset ? resolveCombatGear(save, preset.equipped).missing : 0;
  const canSave = owned && wornCount === slots.length && isChapterSkin(set, skinId) && ownsSkin(save, skinId);
  const wearingSavedSet = Boolean(
    canSave && missingGear === 0 && preset && skinId === preset.skinId && GEAR_SLOTS.every((slot) => save.equipped[slot] === preset.equipped[slot])
  );
  return { owned, wornCount, total: slots.length, canSave, wearingSavedSet, preset, missingGear };
}

export function saveChapterEquipmentSet(save: SaveData, chapterId: number): SaveData {
  const set = CHAPTER_EQUIPMENT_SETS.find((entry) => entry.chapterId === chapterId);
  if (!set) return save;

  const status = getChapterEquipmentStatus(save, set);
  if (!status.canSave || status.wearingSavedSet) return save;

  const skinId = save.equippedSkinByHero?.[set.equipment.selectedHeroId] ?? 'default';
  const { equipped } = resolveCombatGear(save, save.equipped);
  return {
    ...save,
    chapterEquipmentPresets: [
      ...(save.chapterEquipmentPresets ?? []).filter((preset) => preset.chapterId !== chapterId),
      { chapterId, skinId, equipped },
    ],
  };
}

export function applyChapterEquipmentSet(save: SaveData, chapterId: number): SaveData {
  const set = CHAPTER_EQUIPMENT_SETS.find((entry) => entry.chapterId === chapterId);
  if (!set || !ownsChapterSet(save, set)) return save;

  const preset = save.chapterEquipmentPresets?.find((entry) => entry.chapterId === chapterId);
  if (!preset) return save;

  const skinId = isChapterSkin(set, preset.skinId) && ownsSkin(save, preset.skinId) ? preset.skinId : 'default';
  const { equipped } = resolveCombatGear(save, preset.equipped, true);
  return {
    ...save,
    ...set.equipment,
    equipped,
    equippedSkinByHero: { ...save.equippedSkinByHero, [set.equipment.selectedHeroId]: skinId },
    equippedAstralSteedId: null,
    mountAppearance: 'zodiac',
    activeLoadoutPresetId: null,
  };
}

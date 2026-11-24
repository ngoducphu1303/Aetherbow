import type { SaveData } from '../types/game';

const CHAPTER_4_COLLECTION_IDS = new Set([
  'celeste',
  'astral_mirror_queen',
  'twin_astral_spirits',
  'celestial_wind_mount',
  'dual_gemini_wings',
  'twin_hourglass_relic',
  'gemini_halo',
]);

export function canClaimChapter4Asset(id: string, highestChapterCleared: number): boolean {
  return !CHAPTER_4_COLLECTION_IDS.has(id) || highestChapterCleared >= 4;
}

function include<T>(items: readonly T[] | undefined, item: T): T[] {
  if (items?.includes(item)) return [...items];
  return [...(items ?? []), item];
}

export function grantChapter4Collection(save: SaveData): SaveData {
  if (save.highestChapterCleared < 4) return save;
  return {
    ...save,
    unlockedHeroes: include(save.unlockedHeroes, 'celeste'),
    unlockedSkins: include(save.unlockedSkins, 'astral_mirror_queen'),
    pets: save.pets?.some(({ petId }) => petId === 'twin_astral_spirits')
      ? save.pets
      : [...(save.pets ?? []), { petId: 'twin_astral_spirits', level: 1 }],
    unlockedMounts: include(save.unlockedMounts, 'celestial_wind_mount'),
    mountLevels: { celestial_wind_mount: 1, ...save.mountLevels },
    unlockedWings: include(save.unlockedWings, 'dual_gemini_wings'),
    wingLevels: { dual_gemini_wings: 1, ...save.wingLevels },
    unlockedArtifacts: include(save.unlockedArtifacts, 'twin_hourglass_relic'),
    artifactLevels: { twin_hourglass_relic: 1, ...save.artifactLevels },
    unlockedHalos: include(save.unlockedHalos, 'gemini_halo'),
    haloLevels: { gemini_halo: 1, ...save.haloLevels },
  };
}

import type { SaveData } from '../types/game';

const CHAPTER_3_COLLECTION_IDS = new Set([
  'sylvia',
  'venus_incarnate',
  'jade_calf',
  'jade_bull',
  'emerald_taurus_wings',
  'jade_heart_relic',
  'emerald_taurus_halo',
]);

export function canClaimChapter3Asset(id: string, highestChapterCleared: number): boolean {
  return !CHAPTER_3_COLLECTION_IDS.has(id) || highestChapterCleared >= 3;
}

function include<T>(items: readonly T[] | undefined, item: T): T[] {
  if (items?.includes(item)) return [...items];
  return [...(items ?? []), item];
}

export function grantChapter3Collection(save: SaveData): SaveData {
  if (save.highestChapterCleared < 3) return save;
  return {
    ...save,
    unlockedHeroes: include(save.unlockedHeroes, 'sylvia'),
    unlockedSkins: include(save.unlockedSkins, 'venus_incarnate'),
    pets: save.pets?.some(({ petId }) => petId === 'jade_calf')
      ? save.pets
      : [...(save.pets ?? []), { petId: 'jade_calf', level: 1 }],
    unlockedMounts: include(save.unlockedMounts, 'jade_bull'),
    mountLevels: { jade_bull: 1, ...save.mountLevels },
    unlockedWings: include(save.unlockedWings, 'emerald_taurus_wings'),
    wingLevels: { emerald_taurus_wings: 1, ...save.wingLevels },
    unlockedArtifacts: include(save.unlockedArtifacts, 'jade_heart_relic'),
    artifactLevels: { jade_heart_relic: 1, ...save.artifactLevels },
    unlockedHalos: include(save.unlockedHalos, 'emerald_taurus_halo'),
    haloLevels: { emerald_taurus_halo: 1, ...save.haloLevels },
  };
}

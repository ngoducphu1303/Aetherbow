import type { SaveData } from '../types/game';

const CHAPTER_2_COLLECTION_IDS = new Set([
  'bellona', 'golden_fleece', 'pyro', 'vulcan', 'crimson_ram_wings', 'war_horn', 'aries_vanguard',
]);

export function canClaimChapter2Asset(id: string, highestChapterCleared: number): boolean {
  return !CHAPTER_2_COLLECTION_IDS.has(id) || highestChapterCleared >= 2;
}

function include<T>(items: readonly T[] | undefined, item: T): T[] {
  if (items?.includes(item)) return [...items];
  return [...(items ?? []), item];
}

export function grantChapter2Collection(save: SaveData): SaveData {
  if (save.highestChapterCleared < 2) return save;
  return {
    ...save,
    unlockedHeroes: include(save.unlockedHeroes, 'bellona'),
    unlockedSkins: include(save.unlockedSkins, 'golden_fleece'),
    pets: save.pets?.some(({petId}) => petId === 'pyro')
      ? save.pets
      : [...(save.pets ?? []), { petId: 'pyro', level: 1 }],
    unlockedMounts: include(save.unlockedMounts, 'vulcan'),
    mountLevels: { vulcan: 1, ...save.mountLevels },
    unlockedWings: include(save.unlockedWings, 'crimson_ram_wings'),
    wingLevels: { crimson_ram_wings: 1, ...save.wingLevels },
    unlockedArtifacts: include(save.unlockedArtifacts, 'war_horn'),
    artifactLevels: { war_horn: 1, ...save.artifactLevels },
    unlockedHalos: include(save.unlockedHalos, 'aries_vanguard'),
    haloLevels: { aries_vanguard: 1, ...save.haloLevels },
  };
}

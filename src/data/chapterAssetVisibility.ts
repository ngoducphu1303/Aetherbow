import { canClaimChapter2Asset } from './chapter2Collection';
import { canClaimChapter3Asset } from './chapter3Collection';
import { canClaimChapter4Asset } from './chapter4Collection';

export type RequiredChapterGate = 2 | 3 | 4 | null;

export interface ChapterAssetLockState {
  requiredChapter: RequiredChapterGate;
  isChapterLocked: boolean;
  lockLabel: string | null;
  shortLockLabel: string | null;
}

/**
 * Returns the chapter clear milestone required to claim/unlock an asset ID,
 * derived directly from the canonical chapter collection guards.
 */
export function getChapterAssetRequiredChapter(id: string): RequiredChapterGate {
  if (!canClaimChapter2Asset(id, 0)) return 2;
  if (!canClaimChapter3Asset(id, 0)) return 3;
  if (!canClaimChapter4Asset(id, 0)) return 4;
  return null;
}

/**
 * Computes whether an asset is currently locked by chapter progression.
 * Locked assets remain visible across Lobby & Wardrobe catalogs and support
 * live 3D preview, while keeping fair chapter-clear unlock requirements intact.
 */
export function getChapterAssetLockState(
  id: string,
  highestChapterCleared: number
): ChapterAssetLockState {
  const requiredChapter = getChapterAssetRequiredChapter(id);
  const isChapterLocked =
    requiredChapter !== null && highestChapterCleared < requiredChapter;

  return {
    requiredChapter,
    isChapterLocked,
    lockLabel: isChapterLocked ? `Vượt Chương ${requiredChapter} để mở` : null,
    shortLockLabel: isChapterLocked ? `Khóa Chương ${requiredChapter}` : null,
  };
}

/**
 * Returns a copy of a collection sorted by chapter unlock progression
 * (Chapter 1 starter items first, then Ch.2 -> Ch.3 -> Ch.4) so catalog grids
 * match the natural order of the Heroes roster without mutating source arrays.
 */
export function sortCollectionByChapterOrder<T extends { id: string }>(
  items: readonly T[]
): T[] {
  return [...items].sort((a, b) => {
    const aOrder = getChapterAssetRequiredChapter(a.id) ?? 1;
    const bOrder = getChapterAssetRequiredChapter(b.id) ?? 1;
    return aOrder - bOrder;
  });
}

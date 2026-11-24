import type { SaveData } from '../types/game';

export interface SaveIntegrityReport {
  sanitizedSave: SaveData;
  issuesFixed: string[];
  hadAnomalies: boolean;
}

function clampFiniteInt(raw: unknown, min: number, max: number, fallback: number): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export function validateAndSanitizeSaveIntegrity(rawSave: SaveData): SaveIntegrityReport {
  const issuesFixed: string[] = [];
  const next: SaveData = { ...rawSave };

  const bag = next as unknown as Record<string, unknown>;
  const fixInt = (key: keyof SaveData, min: number, max: number, fallback = 0) => {
    const val = bag[key as string];
    const clean = clampFiniteInt(val, min, max, fallback);
    if (val !== clean) {
      bag[key as string] = clean;
      issuesFixed.push(String(key));
    }
  };

  fixInt('gold', 0, 999_999_999, 0);
  fixInt('gems', 0, 99_999_999, 0);
  fixInt('highestChapterCleared', 0, 12, 0);
  fixInt('bestTowerFloor', 0, 10000, 0);

  if (!Array.isArray(next.inventory)) {
    next.inventory = [];
    issuesFixed.push('inventory');
  } else {
    const seenIds = new Set<string>();
    const cleanInv = next.inventory.filter((item) => {
      if (!item || typeof item !== 'object' || typeof item.uid !== 'string' || !item.uid) return false;
      if (seenIds.has(item.uid)) return false;
      seenIds.add(item.uid);
      return true;
    });
    if (cleanInv.length !== next.inventory.length) {
      next.inventory = cleanInv;
      issuesFixed.push('inventory_dedupe');
    }
  }

  if (!next.equipped || typeof next.equipped !== 'object') {
    next.equipped = {};
    issuesFixed.push('equipped');
  }

  if (!Array.isArray(next.unlockedHeroes) || next.unlockedHeroes.length === 0) {
    next.unlockedHeroes = ['artemis'];
    issuesFixed.push('unlockedHeroes');
  }

  if (!next.selectedHeroId || !next.unlockedHeroes.includes(next.selectedHeroId)) {
    next.selectedHeroId = next.unlockedHeroes[0];
    issuesFixed.push('selectedHeroId');
  }

  return {
    sanitizedSave: next,
    issuesFixed,
    hadAnomalies: issuesFixed.length > 0,
  };
}

import type { HeroId, SaveData } from '../types/game';

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

function dedupeStringArray(raw: unknown): { list: string[]; changed: boolean } {
  if (!Array.isArray(raw)) {
    return { list: [], changed: raw !== undefined };
  }
  const seen = new Set<string>();
  const out: string[] = [];
  let changed = false;
  for (const entry of raw) {
    if (typeof entry !== 'string' || !entry.trim()) {
      changed = true;
      continue;
    }
    if (seen.has(entry)) {
      changed = true;
      continue;
    }
    seen.add(entry);
    out.push(entry);
  }
  return { list: out, changed };
}

export function validateAndSanitizeSaveIntegrity(rawSave: SaveData): SaveIntegrityReport {
  const issuesFixed: string[] = [];
  const next: SaveData = { ...rawSave };

  const bag = next as unknown as Record<string, unknown>;
  const fixInt = (key: keyof SaveData, min: number, max: number, fallback = 0) => {
    const val = bag[key as string];
    if (
      val === undefined &&
      fallback === 0 &&
      (key === 'starDust' || key === 'spiritCores' || key === 'paragonInfusionLevel')
    ) {
      return;
    }
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
  fixInt('starDust', 0, 99_999_999, 0);
  fixInt('spiritCores', 0, 99_999_999, 0);
  fixInt('paragonInfusionLevel', 0, 500, 0);

  if (!Array.isArray(next.inventory)) {
    next.inventory = [];
    issuesFixed.push('inventory');
  } else {
    const seenIds = new Set<string>();
    let gearStatFixed = false;
    const cleanInv = next.inventory
      .filter((item) => {
        if (!item || typeof item !== 'object' || typeof item.uid !== 'string' || !item.uid) return false;
        if (seenIds.has(item.uid)) return false;
        seenIds.add(item.uid);
        return true;
      })
      .map((item) => {
        const cleanLevel = clampFiniteInt(item.level, 1, 120, 1);
        const cleanAwakening =
          item.awakeningLevel !== undefined
            ? clampFiniteInt(item.awakeningLevel, 0, 10, 0)
            : undefined;
        if (item.level !== cleanLevel || item.awakeningLevel !== cleanAwakening) {
          gearStatFixed = true;
          return {
            ...item,
            level: cleanLevel,
            ...(cleanAwakening !== undefined ? { awakeningLevel: cleanAwakening } : {}),
          };
        }
        return item;
      });
    if (cleanInv.length !== next.inventory.length) {
      issuesFixed.push('inventory_dedupe');
    }
    if (gearStatFixed) {
      issuesFixed.push('inventory_bounds');
    }
    next.inventory = cleanInv;
  }

  if (!next.equipped || typeof next.equipped !== 'object') {
    next.equipped = {};
    issuesFixed.push('equipped');
  }

  if (!Array.isArray(next.unlockedHeroes) || next.unlockedHeroes.length === 0) {
    next.unlockedHeroes = ['aurelia'];
    issuesFixed.push('unlockedHeroes');
  }

  if (!next.selectedHeroId || !next.unlockedHeroes.includes(next.selectedHeroId)) {
    next.selectedHeroId = next.unlockedHeroes[0];
    issuesFixed.push('selectedHeroId');
  }

  if (next.heroStars && typeof next.heroStars === 'object') {
    const cleanStars: Partial<Record<HeroId, number>> = { ...next.heroStars };
    let starFixed = false;
    for (const [heroKey, rawVal] of Object.entries(next.heroStars)) {
      const cleanVal = clampFiniteInt(rawVal, 0, 10, 0);
      if (rawVal !== cleanVal) {
        cleanStars[heroKey as HeroId] = cleanVal;
        starFixed = true;
      }
    }
    if (starFixed) {
      next.heroStars = cleanStars;
      issuesFixed.push('heroStars');
    }
  }

  if (next.pity && typeof next.pity === 'object') {
    const pityObj = { ...(next.pity as unknown as Record<string, unknown>) };
    let pityFixed = false;
    for (const [k, rawVal] of Object.entries(pityObj)) {
      if (typeof rawVal === 'number' || typeof rawVal === 'string') {
        const cleanVal = clampFiniteInt(rawVal, 0, 500, 0);
        if (rawVal !== cleanVal) {
          pityObj[k] = cleanVal;
          pityFixed = true;
        }
      }
    }
    if (pityFixed) {
      next.pity = pityObj as unknown as SaveData['pity'];
      issuesFixed.push('pity');
    }
  }

  if (next.claimedMailIds !== undefined) {
    const res = dedupeStringArray(next.claimedMailIds);
    if (res.changed) {
      next.claimedMailIds = res.list;
      issuesFixed.push('claimedMailIds');
    }
  }
  if (next.deletedMailIds !== undefined) {
    const res = dedupeStringArray(next.deletedMailIds);
    if (res.changed) {
      next.deletedMailIds = res.list;
      issuesFixed.push('deletedMailIds');
    }
  }

  return {
    sanitizedSave: next,
    issuesFixed,
    hadAnomalies: issuesFixed.length > 0,
  };
}

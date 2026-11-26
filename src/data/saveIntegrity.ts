import { Rarity, type ChapterMilestoneProgress, type HeroId, type RuneId, type SaveData } from '../types/game';
import { sanitizeDiscoveredEvolutions } from '../engine/skillEvolutionEngine';
import {
  HERO_MASTERY_MILESTONES,
  normalizeAutoSalvageFilter,
  normalizeWeeklyChallenges,
} from './wave11RetentionSystems';
import { RUNES_CATALOG } from './runesData';
import { RUNE_REFINEMENT_MAX_TIER } from './runeAndAffixRefining';
import { SUBSTAT_DEFS } from './wave4Data';
import { VALID_JOURNEY_MILESTONE_IDS } from './zodiacJourneyLog';
import { GEAR_SET_DEFINITIONS } from './gearData';

export interface SaveIntegrityReport {
  ok: boolean;
  sanitizedSave: SaveData;
  issuesFixed: string[];
  repairs: string[];
  hadAnomalies: boolean;
}

const VALID_RARITIES = new Set<string>(Object.values(Rarity));

function clampFiniteInt(raw: unknown, min: number, max: number, fallback: number): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

function clampFiniteFloat(raw: unknown, min: number, max: number, fallback: number): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
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
  fixInt('starDust', 0, 50_000_000, 0);
  fixInt('spiritCores', 0, 50_000_000, 0);
  fixInt('paragonInfusionLevel', 0, 500, 0);

  const validInventoryUids = new Set<string>();
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
        const cleanRarity = VALID_RARITIES.has(String(item.rarity)) ? item.rarity : Rarity.COMMON;
        const cleanAwakening =
          item.awakeningLevel !== undefined
            ? clampFiniteInt(item.awakeningLevel, 0, 10, 0)
            : undefined;
        let subFixed = false;
        const cleanSubstats = Array.isArray(item.substats)
          ? item.substats.map((sub) => {
              const def = SUBSTAT_DEFS[sub.kind];
              if (!def) return sub;
              const clampedVal = clampFiniteFloat(sub.value, def.minPct, def.maxPct, def.minPct);
              const roundedVal = Math.round(clampedVal * 100) / 100;
              if (roundedVal !== sub.value) {
                subFixed = true;
                return { ...sub, value: roundedVal };
              }
              return sub;
            })
          : item.substats;
        const isTransmutableRarity =
          cleanRarity === Rarity.EPIC ||
          cleanRarity === Rarity.LEGENDARY ||
          cleanRarity === Rarity.MYTHIC;
        const cleanTransmutedSetId =
          item.transmutedSetId !== undefined
            ? isTransmutableRarity &&
              typeof item.transmutedSetId === 'string' &&
              item.transmutedSetId in GEAR_SET_DEFINITIONS
              ? item.transmutedSetId
              : undefined
            : undefined;
        const transmutedSetFixed = item.transmutedSetId !== cleanTransmutedSetId;
        validInventoryUids.add(item.uid);
        if (
          item.level !== cleanLevel ||
          item.rarity !== cleanRarity ||
          item.awakeningLevel !== cleanAwakening ||
          subFixed ||
          transmutedSetFixed
        ) {
          gearStatFixed = true;
          const nextItem = {
            ...item,
            level: cleanLevel,
            rarity: cleanRarity,
            ...(cleanAwakening !== undefined ? { awakeningLevel: cleanAwakening } : {}),
            ...(subFixed && cleanSubstats ? { substats: cleanSubstats } : {}),
          };
          if (cleanTransmutedSetId !== undefined) {
            nextItem.transmutedSetId = cleanTransmutedSetId;
          } else {
            delete nextItem.transmutedSetId;
          }
          return nextItem;
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
  } else {
    const cleanEquipped: SaveData['equipped'] = { ...next.equipped };
    let danglingFixed = false;
    for (const [slot, uid] of Object.entries(cleanEquipped)) {
      if (uid === undefined) continue;
      if (typeof uid !== 'string' || !validInventoryUids.has(uid)) {
        delete (cleanEquipped as Record<string, unknown>)[slot];
        danglingFixed = true;
      }
    }
    if (danglingFixed) {
      next.equipped = cleanEquipped;
      issuesFixed.push('equipped_dangling');
    }
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

  if (next.discoveredEvolutions !== undefined) {
    const cleanEvos = sanitizeDiscoveredEvolutions(next.discoveredEvolutions);
    const rawArr = Array.isArray(next.discoveredEvolutions) ? next.discoveredEvolutions : [];
    if (
      !Array.isArray(next.discoveredEvolutions) ||
      cleanEvos.length !== rawArr.length ||
      cleanEvos.some((id, idx) => rawArr[idx] !== id)
    ) {
      next.discoveredEvolutions = cleanEvos;
      issuesFixed.push('discoveredEvolutions');
    }
  }

  if (next.chapterMilestones && typeof next.chapterMilestones === 'object') {
    const cleanMap: Partial<Record<number, ChapterMilestoneProgress>> = {};
    for (const [rawKey, entry] of Object.entries(next.chapterMilestones)) {
      const chId = Number(rawKey);
      if (!Number.isInteger(chId) || chId < 1 || chId > 12 || !entry || typeof entry !== 'object') {
        issuesFixed.push(`chapterMilestones_invalid_${rawKey}`);
        continue;
      }
      const cleanClears = clampFiniteInt(entry.clears, 0, 100_000, 0);
      if (cleanClears !== entry.clears) {
        issuesFixed.push(`chapterMilestones_${chId}_clears`);
      }
      const rawStars = Array.isArray(entry.starsEarned) ? entry.starsEarned : [];
      const starSet = new Set<number>();
      for (const s of rawStars) {
        if (s === 1 || s === 2 || s === 3 || s === 4) {
          starSet.add(s);
        }
      }
      const cleanStars = [...starSet].sort((a, b) => a - b);
      if (
        !Array.isArray(entry.starsEarned) ||
        cleanStars.length !== rawStars.length ||
        cleanStars.some((s, idx) => rawStars[idx] !== s)
      ) {
        issuesFixed.push(`chapterMilestones_${chId}_stars`);
      }
      const cleanHp =
        entry.bestEndHpRatio !== undefined
          ? clampFiniteFloat(entry.bestEndHpRatio, 0, 1, 0)
          : undefined;
      if (entry.bestEndHpRatio !== undefined && cleanHp !== entry.bestEndHpRatio) {
        issuesFixed.push(`chapterMilestones_${chId}_hp`);
      }
      cleanMap[chId] = {
        ...entry,
        chapterId: chId,
        clears: cleanClears,
        starsEarned: cleanStars,
        ...(cleanHp !== undefined ? { bestEndHpRatio: cleanHp } : {}),
        ...(entry.bestPerfectDodges !== undefined
          ? { bestPerfectDodges: clampFiniteInt(entry.bestPerfectDodges, 0, 10_000, 0) }
          : {}),
        ...(entry.bestBossGuardBreaks !== undefined
          ? { bestBossGuardBreaks: clampFiniteInt(entry.bestBossGuardBreaks, 0, 10_000, 0) }
          : {}),
      };
    }
    next.chapterMilestones = cleanMap;
  }

  if (next.career && typeof next.career === 'object') {
    const careerCopy = { ...(next.career as unknown as Record<string, unknown>) };
    const boundedCareerFields: Array<{ key: string; max: number }> = [
      { key: 'totalKills', max: 100_000_000 },
      { key: 'totalBossKills', max: 10_000_000 },
      { key: 'arenaMechanismsTriggered', max: 1_000_000 },
      { key: 'bossInterruptsTotal', max: 1_000_000 },
      { key: 'setProcsTriggered', max: 1_000_000 },
    ];
    let careerFixed = false;
    for (const { key, max } of boundedCareerFields) {
      if (careerCopy[key] === undefined) continue;
      const cleanVal = clampFiniteInt(careerCopy[key], 0, max, 0);
      if (careerCopy[key] !== cleanVal) {
        careerCopy[key] = cleanVal;
        careerFixed = true;
        issuesFixed.push(`career_${key}`);
      }
    }
    if (careerFixed) {
      next.career = careerCopy as unknown as SaveData['career'];
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

  if (next.autoSalvageFilter !== undefined) {
    const cleanFilter = normalizeAutoSalvageFilter(next.autoSalvageFilter);
    const raw = next.autoSalvageFilter as unknown as Record<string, unknown>;
    if (
      !raw ||
      typeof raw !== 'object' ||
      raw.maxRarity !== cleanFilter.maxRarity ||
      raw.protectSTier !== true ||
      raw.protectSetPieces !== cleanFilter.protectSetPieces ||
      raw.protectUpgradedOrSocketed !== cleanFilter.protectUpgradedOrSocketed ||
      raw.autoRunAfterBattle !== cleanFilter.autoRunAfterBattle
    ) {
      next.autoSalvageFilter = cleanFilter;
      issuesFixed.push('autoSalvageFilter');
    }
  }

  if (next.weeklyChallenges !== undefined) {
    const rawWk = next.weeklyChallenges as unknown as Record<string, unknown>;
    const weekKey =
      rawWk && typeof rawWk.weekKey === 'string' && /^\d{4}-W\d{2}$/.test(rawWk.weekKey)
        ? rawWk.weekKey
        : undefined;
    const normalizedWk = normalizeWeeklyChallenges(next.weeklyChallenges, weekKey);
    const cleanWk = {
      ...normalizedWk,
      runsCompleted: clampFiniteInt(normalizedWk.runsCompleted, 0, 100_000, 0),
      bossKills: clampFiniteInt(normalizedWk.bossKills, 0, 100_000, 0),
      bossInterrupts: clampFiniteInt(normalizedWk.bossInterrupts, 0, 100_000, 0),
      elementalReactions: clampFiniteInt(normalizedWk.elementalReactions, 0, 1_000_000, 0),
      heroesUsedToWin: dedupeStringArray(normalizedWk.heroesUsedToWin).list as HeroId[],
      claimedIds: dedupeStringArray(normalizedWk.claimedIds).list,
    };
    if (JSON.stringify(rawWk) !== JSON.stringify(cleanWk)) {
      next.weeklyChallenges = cleanWk;
      issuesFixed.push('weeklyChallenges');
    }
  }

  if (next.claimedHeroMasteryMilestones !== undefined) {
    if (
      !next.claimedHeroMasteryMilestones ||
      typeof next.claimedHeroMasteryMilestones !== 'object'
    ) {
      next.claimedHeroMasteryMilestones = {};
      issuesFixed.push('claimedHeroMasteryMilestones');
    } else {
      const validLevels = new Set<number>(HERO_MASTERY_MILESTONES.map((m) => m.level));
      const cleanMap: Partial<Record<HeroId, number[]>> = {};
      let changed = false;
      for (const [heroKey, rawList] of Object.entries(next.claimedHeroMasteryMilestones)) {
        if (!Array.isArray(rawList)) {
          changed = true;
          continue;
        }
        const levelSet = new Set<number>();
        for (const lv of rawList) {
          if (typeof lv === 'number' && validLevels.has(lv)) {
            levelSet.add(lv);
          } else {
            changed = true;
          }
        }
        const sorted = [...levelSet].sort((a, b) => a - b);
        if (sorted.length !== rawList.length || sorted.some((v, idx) => rawList[idx] !== v)) {
          changed = true;
        }
        cleanMap[heroKey as HeroId] = sorted;
      }
      if (changed) {
        next.claimedHeroMasteryMilestones = cleanMap;
        issuesFixed.push('claimedHeroMasteryMilestones');
      }
    }
  }

  if (next.runeRefinements !== undefined) {
    if (!next.runeRefinements || typeof next.runeRefinements !== 'object') {
      next.runeRefinements = {};
      issuesFixed.push('runeRefinements');
    } else {
      const cleanRefines: Partial<Record<RuneId, number>> = {};
      let changed = false;
      for (const [rawKey, rawTier] of Object.entries(next.runeRefinements)) {
        if (!(rawKey in RUNES_CATALOG)) {
          changed = true;
          continue;
        }
        const cleanTier = clampFiniteInt(rawTier, 0, RUNE_REFINEMENT_MAX_TIER, 0);
        if (cleanTier !== rawTier) {
          changed = true;
        }
        if (cleanTier > 0) {
          cleanRefines[rawKey as RuneId] = cleanTier;
        } else if (rawTier !== 0) {
          changed = true;
        }
      }
      if (changed) {
        next.runeRefinements = cleanRefines;
        issuesFixed.push('runeRefinements');
      }
    }
  }

  if (next.claimedJourneyMilestones !== undefined) {
    const rawList = Array.isArray(next.claimedJourneyMilestones)
      ? next.claimedJourneyMilestones
      : [];
    const seen = new Set<string>();
    const cleanJourney: string[] = [];
    let changed = !Array.isArray(next.claimedJourneyMilestones);
    for (const entry of rawList) {
      if (
        typeof entry !== 'string' ||
        !VALID_JOURNEY_MILESTONE_IDS.has(entry) ||
        seen.has(entry)
      ) {
        changed = true;
        continue;
      }
      seen.add(entry);
      cleanJourney.push(entry);
    }
    if (changed) {
      next.claimedJourneyMilestones = cleanJourney;
      issuesFixed.push('claimedJourneyMilestones');
    }
  }

  return {
    ok: issuesFixed.length === 0,
    sanitizedSave: next,
    issuesFixed,
    repairs: issuesFixed,
    hadAnomalies: issuesFixed.length > 0,
  };
}

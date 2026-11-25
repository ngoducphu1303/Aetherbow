import type {
  ArtifactId,
  ChapterMilestoneProgress,
  HaloId,
  HeroId,
  HeroSkinId,
  MountId,
  PetId,
  SaveData,
  WingId,
} from '../types/game';

export interface ChapterMilestoneRunInput {
  chapterId: number;
  victory: boolean;
  stageReached: number;
  endHpRatio?: number;
  revivesUsed?: number;
  perfectDodges?: number;
  bossGuardBreaks?: number;
  castInterrupts?: number;
}

export interface ChapterStarAward {
  star: 1 | 2 | 3 | 4;
  chapterId: number;
  label: string;
}

export interface ChapterNextStarMeta {
  star: 1 | 2 | 3 | 4;
  title: string;
  requirementText: string;
  rewardSummary: string;
}

export interface ChapterMilestoneSummary {
  chapterId: number;
  clears: number;
  starCount: number;
  maxStars: number;
  starsEarned: number[];
  bestEndHpRatio: number;
  bestPerfectDodges: number;
  bestBossGuardBreaks: number;
  nextStar: ChapterNextStarMeta | null;
}

interface ChapterCollectionTierUnlock {
  chapterId: number;
  heroId: HeroId;
  petId: PetId;
  skinId: HeroSkinId;
  wingId: WingId;
  mountId: MountId;
  artifactId: ArtifactId;
  haloId: HaloId;
  star4TowerFloor: number;
  star4NextChapterStage: number;
}

const CHAPTER_COLLECTION_TIERS: Record<number, ChapterCollectionTierUnlock> = {
  2: {
    chapterId: 2,
    heroId: 'bellona',
    petId: 'pyro',
    skinId: 'golden_fleece',
    wingId: 'crimson_ram_wings',
    mountId: 'vulcan',
    artifactId: 'war_horn',
    haloId: 'aries_vanguard',
    star4TowerFloor: 16,
    star4NextChapterStage: 6,
  },
  3: {
    chapterId: 3,
    heroId: 'sylvia',
    petId: 'jade_calf',
    skinId: 'venus_incarnate',
    wingId: 'emerald_taurus_wings',
    mountId: 'jade_bull',
    artifactId: 'jade_heart_relic',
    haloId: 'emerald_taurus_halo',
    star4TowerFloor: 24,
    star4NextChapterStage: 6,
  },
  4: {
    chapterId: 4,
    heroId: 'celeste',
    petId: 'twin_astral_spirits',
    skinId: 'astral_mirror_queen',
    wingId: 'dual_gemini_wings',
    mountId: 'celestial_wind_mount',
    artifactId: 'twin_hourglass_relic',
    haloId: 'gemini_halo',
    star4TowerFloor: 32,
    star4NextChapterStage: 6,
  },
};

function includeUnique<T>(list: readonly T[] | undefined, item: T): T[] {
  if (list?.includes(item)) return [...list];
  return [...(list ?? []), item];
}

function hasLegacyCollectionTierUnlocked(
  save: Partial<SaveData>,
  tier: ChapterCollectionTierUnlock,
  star: 1 | 2 | 3 | 4
): boolean {
  if (star === 1) {
    return Boolean(
      save.unlockedHeroes?.includes(tier.heroId) ||
        save.pets?.some((p) => p.petId === tier.petId)
    );
  }
  if (star === 2) {
    return Boolean(
      save.unlockedSkins?.includes(tier.skinId) ||
        save.unlockedWings?.includes(tier.wingId)
    );
  }
  if (star === 3) {
    return Boolean(
      save.unlockedMounts?.includes(tier.mountId) ||
        save.unlockedArtifacts?.includes(tier.artifactId)
    );
  }
  return Boolean(save.unlockedHalos?.includes(tier.haloId));
}

function applyTierUnlockForStar(
  save: SaveData,
  chapterId: number,
  star: 1 | 2 | 3 | 4
): SaveData {
  const tier = CHAPTER_COLLECTION_TIERS[chapterId];
  if (!tier) return save;

  if (star === 1) {
    return {
      ...save,
      unlockedHeroes: includeUnique(save.unlockedHeroes, tier.heroId),
      pets: save.pets?.some((p) => p.petId === tier.petId)
        ? save.pets
        : [...(save.pets ?? []), { petId: tier.petId, level: 1 }],
    };
  }
  if (star === 2) {
    return {
      ...save,
      unlockedSkins: includeUnique(save.unlockedSkins, tier.skinId),
      unlockedWings: includeUnique(save.unlockedWings, tier.wingId),
      wingLevels: { [tier.wingId]: 1, ...(save.wingLevels ?? {}) },
    };
  }
  if (star === 3) {
    return {
      ...save,
      unlockedMounts: includeUnique(save.unlockedMounts, tier.mountId),
      mountLevels: { [tier.mountId]: 1, ...(save.mountLevels ?? {}) },
      unlockedArtifacts: includeUnique(save.unlockedArtifacts, tier.artifactId),
      artifactLevels: { [tier.artifactId]: 1, ...(save.artifactLevels ?? {}) },
    };
  }
  return {
    ...save,
    unlockedHalos: includeUnique(save.unlockedHalos, tier.haloId),
    haloLevels: { [tier.haloId]: 1, ...(save.haloLevels ?? {}) },
  };
}

export function normalizeChapterMilestones(
  save: Partial<SaveData> & Pick<SaveData, 'chapterMilestones' | 'highestChapterCleared'>
): Partial<Record<number, ChapterMilestoneProgress>> {
  const raw = save.chapterMilestones ?? {};
  const result: Partial<Record<number, ChapterMilestoneProgress>> = {};
  const highestCleared = Math.max(0, Math.min(12, Math.floor(save.highestChapterCleared ?? 0)));

  for (let ch = 1; ch <= 12; ch++) {
    const existing = raw[ch];
    const tier = CHAPTER_COLLECTION_TIERS[ch];
    const hasLegacyItems =
      tier !== undefined &&
      ([1, 2, 3, 4] as const).some((s) => hasLegacyCollectionTierUnlocked(save, tier, s));

    if (!existing && ch > highestCleared && !hasLegacyItems) continue;

    const stars = new Set<number>(
      Array.isArray(existing?.starsEarned)
        ? existing.starsEarned.filter((s) => s === 1 || s === 2 || s === 3 || s === 4)
        : []
    );

    // Backfill stars only from explicit legacy collection ownership or existing progress
    if (tier) {
      for (const s of [1, 2, 3, 4] as const) {
        if (hasLegacyCollectionTierUnlocked(save, tier, s)) {
          stars.add(s);
        }
      }
    } else if (ch <= highestCleared && existing && existing.clears > 0) {
      stars.add(1);
    }

    const clears = Math.max(
      existing ? Math.floor(existing.clears ?? 0) : stars.size > 0 ? 1 : 0,
      0
    );

    result[ch] = {
      chapterId: ch,
      clears,
      starsEarned: [...stars].sort((a, b) => a - b),
      bestEndHpRatio:
        typeof existing?.bestEndHpRatio === 'number' && Number.isFinite(existing.bestEndHpRatio)
          ? Math.max(0, Math.min(1, existing.bestEndHpRatio))
          : 0,
      bestPerfectDodges: Math.max(0, Math.floor(existing?.bestPerfectDodges ?? 0)),
      bestBossGuardBreaks: Math.max(0, Math.floor(existing?.bestBossGuardBreaks ?? 0)),
    };
  }
  return result;
}

function buildNextStarMeta(chapterId: number, starsEarned: number[]): ChapterNextStarMeta | null {
  const goldStep = 180 + chapterId * 45;
  const gemStep = 15 + chapterId * 5;
  const rewardSummary = `+${goldStep} Vàng · +${gemStep} Ngọc`;
  if (!starsEarned.includes(1)) {
    return {
      star: 1,
      title: '★1 Chinh Phục',
      requirementText: `Vượt toàn bộ ải Chương ${chapterId}`,
      rewardSummary,
    };
  }
  if (!starsEarned.includes(2)) {
    return {
      star: 2,
      title: '★2 Vững Vàng',
      requirementText: 'Thắng không hồi sinh & còn ≥ 50% HP',
      rewardSummary,
    };
  }
  if (!starsEarned.includes(3)) {
    return {
      star: 3,
      title: '★3 Đại Sư Chiến Thuật',
      requirementText: '≥ 2 Né Hoàn Hảo hoặc Ngắt Chiêu / Phá Giáp Boss',
      rewardSummary,
    };
  }
  if (!starsEarned.includes(4)) {
    const tier = CHAPTER_COLLECTION_TIERS[chapterId];
    return {
      star: 4,
      title: '★4 Hào Quang Đỉnh Cao',
      requirementText: tier
        ? `Đạt Tầng ${tier.star4TowerFloor} Tháp hoặc Chương ${chapterId + 1} Ải ${tier.star4NextChapterStage}`
        : `Chinh phục thử thách tối thượng Chương ${chapterId}`,
      rewardSummary,
    };
  }
  return null;
}

export function getChapterMilestoneSummary(
  save: Partial<SaveData> & Pick<SaveData, 'chapterMilestones' | 'highestChapterCleared'>,
  chapterId: number
): ChapterMilestoneSummary {
  const normalized = normalizeChapterMilestones(save);
  const entry = normalized[chapterId];
  const starsEarned = entry?.starsEarned ?? [];
  return {
    chapterId,
    clears: entry?.clears ?? 0,
    starCount: starsEarned.length,
    maxStars: 4,
    starsEarned,
    bestEndHpRatio: entry?.bestEndHpRatio ?? 0,
    bestPerfectDodges: entry?.bestPerfectDodges ?? 0,
    bestBossGuardBreaks: entry?.bestBossGuardBreaks ?? 0,
    nextStar: buildNextStarMeta(chapterId, starsEarned),
  };
}

export function applyChapterCollectionMilestones(
  save: SaveData,
  input: ChapterMilestoneRunInput
): {
  nextSave: SaveData;
  newlyEarnedStars: ChapterStarAward[];
  newlyUnlockedLabels: string[];
  bonusGold: number;
  bonusGems: number;
} {
  const chapterId = Math.max(1, Math.min(12, Math.floor(input.chapterId || 1)));
  const currentMap = normalizeChapterMilestones(save);
  const prev: ChapterMilestoneProgress = currentMap[chapterId] ?? {
    chapterId,
    clears: 0,
    starsEarned: [],
    bestEndHpRatio: 0,
    bestPerfectDodges: 0,
    bestBossGuardBreaks: 0,
  };

  const prevSet = new Set(prev.starsEarned);
  const nextSet = new Set(prev.starsEarned);

  const endHpRatio = Math.max(0, Math.min(1, input.endHpRatio ?? 0));
  const revivesUsed = Math.max(0, Math.floor(input.revivesUsed ?? 0));
  const perfectDodges = Math.max(0, Math.floor(input.perfectDodges ?? 0));
  const bossGuardBreaks = Math.max(0, Math.floor(input.bossGuardBreaks ?? 0));
  const castInterrupts = Math.max(0, Math.floor(input.castInterrupts ?? 0));
  const stageReached = Math.max(0, Math.floor(input.stageReached ?? 0));

  if (input.victory) {
    nextSet.add(1);
    if (revivesUsed === 0 && endHpRatio >= 0.5) {
      nextSet.add(2);
    }
    if (perfectDodges >= 2 || bossGuardBreaks >= 1 || castInterrupts >= 1) {
      nextSet.add(3);
    }
  }

  const newlyEarnedStars: ChapterStarAward[] = [];
  const newlyUnlockedLabels: string[] = [];
  let bonusGold = 0;
  let bonusGems = 0;
  let workingSave: SaveData = { ...save };

  const currentChapterNewStars = ([1, 2, 3, 4] as const).filter(
    (s) => nextSet.has(s) && !prevSet.has(s)
  );
  for (const s of currentChapterNewStars) {
    const g = 180 + chapterId * 45;
    const gm = 15 + chapterId * 5;
    bonusGold += g;
    bonusGems += gm;
    const label = `Mốc ★${s} Chương ${chapterId} (+${g} Vàng, +${gm} Ngọc)`;
    newlyEarnedStars.push({ star: s, chapterId, label });
    newlyUnlockedLabels.push(label);
    workingSave = applyTierUnlockForStar(workingSave, chapterId, s);
  }

  const updatedMap: Partial<Record<number, ChapterMilestoneProgress>> = {
    ...currentMap,
    [chapterId]: {
      chapterId,
      clears: prev.clears + (input.victory ? 1 : 0),
      starsEarned: [...nextSet].sort((a, b) => a - b),
      bestEndHpRatio: Math.max(prev.bestEndHpRatio ?? 0, input.victory ? endHpRatio : 0),
      bestPerfectDodges: Math.max(prev.bestPerfectDodges ?? 0, perfectDodges),
      bestBossGuardBreaks: Math.max(prev.bestBossGuardBreaks ?? 0, bossGuardBreaks),
    },
  };

  // Evaluate ★4 Prestige Halo milestones across Ch.2–Ch.4 when Tower floor or next-chapter stage is reached
  const bestTower = Math.max(0, Math.floor(workingSave.bestTowerFloor ?? 0));
  for (const tier of Object.values(CHAPTER_COLLECTION_TIERS)) {
    const prog = updatedMap[tier.chapterId];
    if (!prog || !prog.starsEarned.includes(1) || prog.starsEarned.includes(4)) continue;
    const towerMet = bestTower >= tier.star4TowerFloor;
    const nextChapterMet =
      chapterId >= tier.chapterId + 1 && stageReached >= tier.star4NextChapterStage;
    if (towerMet || nextChapterMet) {
      const nextStars = [...new Set([...prog.starsEarned, 4])].sort((a, b) => a - b);
      updatedMap[tier.chapterId] = {
        ...prog,
        starsEarned: nextStars,
      };
      const g = 180 + tier.chapterId * 45;
      const gm = 15 + tier.chapterId * 5;
      bonusGold += g;
      bonusGems += gm;
      const label = `Mốc ★4 Chương ${tier.chapterId} · Mở khóa Hào Quang (+${g} Vàng, +${gm} Ngọc)`;
      newlyEarnedStars.push({ star: 4, chapterId: tier.chapterId, label });
      newlyUnlockedLabels.push(label);
      workingSave = applyTierUnlockForStar(workingSave, tier.chapterId, 4);
    }
  }

  const nextSave: SaveData = {
    ...workingSave,
    gold: workingSave.gold + bonusGold,
    gems: workingSave.gems + bonusGems,
    chapterMilestones: updatedMap,
  };

  return {
    nextSave,
    newlyEarnedStars,
    newlyUnlockedLabels,
    bonusGold,
    bonusGems,
  };
}

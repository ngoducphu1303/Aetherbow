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

export type ChapterMilestoneStar = 1 | 2 | 3 | 4;

export interface ChapterRunPerformance {
  chapterId: number;
  victory: boolean;
  stageReached: number;
  endHpRatio?: number;
  revivesUsed?: number;
  perfectDodges?: number;
  bossGuardBreaks?: number;
  castInterrupts?: number;
}

export interface ChapterStarTierDef {
  star: ChapterMilestoneStar;
  title: string;
  requirementText: string;
  rewardSummary: string;
}

export interface ChapterCollectionConfig {
  chapterId: 2 | 3 | 4;
  chapterTitle: string;
  heroId: HeroId;
  heroName: string;
  petId: PetId;
  petName: string;
  skinId: HeroSkinId;
  skinName: string;
  wingId: WingId;
  wingName: string;
  mountId: MountId;
  mountName: string;
  artifactId: ArtifactId;
  artifactName: string;
  haloId: HaloId;
  haloName: string;
  towerFloorTarget: number;
  stars: readonly ChapterStarTierDef[];
}

export const CHAPTER_MILESTONE_CONFIGS: readonly ChapterCollectionConfig[] = [
  {
    chapterId: 2,
    chapterTitle: 'Hỏa Sơn Sừng Đỏ',
    heroId: 'bellona',
    heroName: 'Bellona',
    petId: 'pyro',
    petName: 'Pyro',
    skinId: 'golden_fleece',
    skinName: 'Bộ Lông Cừu Vàng',
    wingId: 'crimson_ram_wings',
    wingName: 'Cánh Hỏa Dương',
    mountId: 'vulcan',
    mountName: 'Vulcan',
    artifactId: 'war_horn',
    artifactName: 'Tù Và Chiến Tranh',
    haloId: 'aries_vanguard',
    haloName: 'Quang Hoàn Bạch Dương',
    towerFloorTarget: 16,
    stars: [
      {
        star: 1,
        title: '★1 Chinh Phục Chương 2',
        requirementText: 'Vượt Ải 12 Chương 2',
        rewardSummary: 'Bellona + Linh thú Pyro',
      },
      {
        star: 2,
        title: '★2 Chiến Binh Bất Khuất',
        requirementText: 'Thắng Ch.2 giữ ≥ 50% HP hoặc không hồi sinh (hoặc thắng 2 lần)',
        rewardSummary: 'Trang phục Bộ Lông Cừu Vàng + Cánh Hỏa Dương',
      },
      {
        star: 3,
        title: '★3 Bậc Thầy Phản Đòn',
        requirementText: 'Đạt ≥ 2 Né Hoàn Hảo, ≥ 1 Phá Giáp Boss hoặc ≥ 2 Ngắt Chiêu (hoặc thắng 3 lần)',
        rewardSummary: 'Thú cưỡi Vulcan + Thánh khí Tù Và Chiến Tranh',
      },
      {
        star: 4,
        title: '★4 Đỉnh Cao Hỏa Sơn',
        requirementText: 'Đạt Ải 6 Chương 3, Tầng 16 Tháp Vô Tận hoặc thắng Ch.2 đủ 4 lần',
        rewardSummary: 'Hào quang Bạch Dương (Hoàn tất Bộ Chương 2)',
      },
    ],
  },
  {
    chapterId: 3,
    chapterTitle: 'Thánh Địa Ngọc Lục Bảo',
    heroId: 'sylvia',
    heroName: 'Sylvia',
    petId: 'jade_calf',
    petName: 'Ngọc Ngưu Con',
    skinId: 'venus_incarnate',
    skinName: 'Hóa Thân Vệ Nữ',
    wingId: 'emerald_taurus_wings',
    wingName: 'Cánh Ngọc Kim Ngưu',
    mountId: 'jade_bull',
    mountName: 'Ngọc Ngưu Thần Thú',
    artifactId: 'jade_heart_relic',
    artifactName: 'Thánh Tích Tâm Ngọc',
    haloId: 'emerald_taurus_halo',
    haloName: 'Hào Quang Lục Bảo',
    towerFloorTarget: 24,
    stars: [
      {
        star: 1,
        title: '★1 Chinh Phục Chương 3',
        requirementText: 'Vượt Ải 12 Chương 3',
        rewardSummary: 'Sylvia + Linh thú Ngọc Ngưu Con',
      },
      {
        star: 2,
        title: '★2 Vệ Thần Lục Bảo',
        requirementText: 'Thắng Ch.3 giữ ≥ 50% HP hoặc không hồi sinh (hoặc thắng 2 lần)',
        rewardSummary: 'Trang phục Hóa Thân Vệ Nữ + Cánh Ngọc Kim Ngưu',
      },
      {
        star: 3,
        title: '★3 Phá Trận Kim Ngưu',
        requirementText: 'Đạt ≥ 2 Né Hoàn Hảo, ≥ 1 Phá Giáp Boss hoặc ≥ 2 Ngắt Chiêu (hoặc thắng 3 lần)',
        rewardSummary: 'Thú cưỡi Ngọc Ngưu + Thánh tích Tâm Ngọc',
      },
      {
        star: 4,
        title: '★4 Đỉnh Cao Thánh Địa',
        requirementText: 'Đạt Ải 6 Chương 4, Tầng 24 Tháp Vô Tận hoặc thắng Ch.3 đủ 4 lần',
        rewardSummary: 'Hào quang Lục Bảo (Hoàn tất Bộ Chương 3)',
      },
    ],
  },
  {
    chapterId: 4,
    chapterTitle: 'Đấu Trường Song Tử',
    heroId: 'celeste',
    heroName: 'Celeste',
    petId: 'twin_astral_spirits',
    petName: 'Song Linh Tinh Tú',
    skinId: 'astral_mirror_queen',
    skinName: 'Nữ Hoàng Song Kính',
    wingId: 'dual_gemini_wings',
    wingName: 'Song Dực Song Tử',
    mountId: 'celestial_wind_mount',
    mountName: 'Thiên Phong Song Mã',
    artifactId: 'twin_hourglass_relic',
    artifactName: 'Đồng Hồ Cát Song Sinh',
    haloId: 'gemini_halo',
    haloName: 'Hào Quang Song Tử',
    towerFloorTarget: 32,
    stars: [
      {
        star: 1,
        title: '★1 Chinh Phục Chương 4',
        requirementText: 'Vượt Ải 12 Chương 4',
        rewardSummary: 'Celeste + Song Linh Tinh Tú',
      },
      {
        star: 2,
        title: '★2 Vũ Điệu Song Kính',
        requirementText: 'Thắng Ch.4 giữ ≥ 50% HP hoặc không hồi sinh (hoặc thắng 2 lần)',
        rewardSummary: 'Trang phục Nữ Hoàng Song Kính + Song Dực Song Tử',
      },
      {
        star: 3,
        title: '★3 Phản Xạ Tuyệt Đối',
        requirementText: 'Đạt ≥ 2 Né Hoàn Hảo, ≥ 1 Phá Giáp Boss hoặc ≥ 2 Ngắt Chiêu (hoặc thắng 3 lần)',
        rewardSummary: 'Thiên Phong Song Mã + Đồng Hồ Cát Song Sinh',
      },
      {
        star: 4,
        title: '★4 Đỉnh Cao Song Tử',
        requirementText: 'Đạt Ải 6 Chương 5, Tầng 32 Tháp Vô Tận hoặc thắng Ch.4 đủ 4 lần',
        rewardSummary: 'Hào quang Song Tử (Hoàn tất Bộ Chương 4)',
      },
    ],
  },
];

export const CHAPTER_MILESTONE_MAP: Record<number, ChapterCollectionConfig> = Object.fromEntries(
  CHAPTER_MILESTONE_CONFIGS.map((cfg) => [cfg.chapterId, cfg])
);

function includeUnique<T>(items: readonly T[] | undefined, item: T): T[] {
  if (items?.includes(item)) return [...items];
  return [...(items ?? []), item];
}

function inferOwnedStars(save: SaveData, cfg: ChapterCollectionConfig): number[] {
  const earned = new Set<number>();
  if (save.unlockedHeroes?.includes(cfg.heroId) && save.pets?.some((p) => p.petId === cfg.petId)) {
    earned.add(1);
  }
  if (save.unlockedSkins?.includes(cfg.skinId) && save.unlockedWings?.includes(cfg.wingId)) {
    earned.add(2);
  }
  if (save.unlockedMounts?.includes(cfg.mountId) && save.unlockedArtifacts?.includes(cfg.artifactId)) {
    earned.add(3);
  }
  if (save.unlockedHalos?.includes(cfg.haloId)) {
    earned.add(4);
  }
  return Array.from(earned).sort((a, b) => a - b);
}

/**
 * Normalizes chapter milestone progress and seamlessly backfills stars for legacy saves
 * that already own Chapter 2-4 collection items so no existing player progress is ever lost.
 */
export function normalizeChapterMilestones(
  save: SaveData
): Partial<Record<number, ChapterMilestoneProgress>> {
  const rawMap = save.chapterMilestones ?? {};
  const result: Partial<Record<number, ChapterMilestoneProgress>> = {};

  for (const cfg of CHAPTER_MILESTONE_CONFIGS) {
    const existing = rawMap[cfg.chapterId];
    const starSet = new Set<number>();
    if (Array.isArray(existing?.starsEarned)) {
      for (const s of existing.starsEarned) {
        if (s === 1 || s === 2 || s === 3 || s === 4) starSet.add(s);
      }
    }
    for (const inferred of inferOwnedStars(save, cfg)) {
      starSet.add(inferred);
    }
    const clears = Math.max(
      Math.floor(Number(existing?.clears ?? 0) || 0),
      starSet.size > 0 ? 1 : 0
    );
    if (clears > 0 || starSet.size > 0 || existing) {
      result[cfg.chapterId] = {
        chapterId: cfg.chapterId,
        clears,
        starsEarned: Array.from(starSet).sort((a, b) => a - b),
        bestEndHpRatio: existing?.bestEndHpRatio,
        bestPerfectDodges: existing?.bestPerfectDodges,
        bestBossGuardBreaks: existing?.bestBossGuardBreaks,
      };
    }
  }
  return result;
}

export interface ChapterMilestoneUiSummary {
  chapterId: number;
  earnedStars: number[];
  starCount: number;
  maxStars: 4;
  clears: number;
  nextStar: ChapterStarTierDef | null;
  tiers: ReadonlyArray<ChapterStarTierDef & { earned: boolean }>;
}

export function getChapterMilestoneSummary(
  save: SaveData,
  chapterId: number
): ChapterMilestoneUiSummary | null {
  const cfg = CHAPTER_MILESTONE_MAP[chapterId];
  if (!cfg) return null;
  const map = normalizeChapterMilestones(save);
  const progress = map[chapterId];
  const earnedSet = new Set<number>(progress?.starsEarned ?? []);
  const tiers = cfg.stars.map((tier) => ({
    ...tier,
    earned: earnedSet.has(tier.star),
  }));
  const nextStar = tiers.find((t) => !t.earned) ?? null;
  return {
    chapterId,
    earnedStars: Array.from(earnedSet).sort((a, b) => a - b),
    starCount: earnedSet.size,
    maxStars: 4,
    clears: progress?.clears ?? 0,
    nextStar,
    tiers,
  };
}

function grantStarsForChapter(
  save: SaveData,
  cfg: ChapterCollectionConfig,
  stars: ReadonlySet<number>
): { nextSave: SaveData; unlockedLabels: string[] } {
  let next: SaveData = save;
  const unlockedLabels: string[] = [];

  if (stars.has(1)) {
    const hadHero = next.unlockedHeroes.includes(cfg.heroId);
    const hadPet = Boolean(next.pets?.some((p) => p.petId === cfg.petId));
    next = {
      ...next,
      unlockedHeroes: includeUnique(next.unlockedHeroes, cfg.heroId),
      pets: hadPet ? next.pets : [...(next.pets ?? []), { petId: cfg.petId, level: 1 }],
    };
    if (!hadHero || !hadPet) {
      unlockedLabels.push(`★1 ${cfg.chapterTitle}: Mở khóa ${cfg.heroName} & ${cfg.petName}`);
    }
  }

  if (stars.has(2)) {
    const hadSkin = Boolean(next.unlockedSkins?.includes(cfg.skinId));
    const hadWing = Boolean(next.unlockedWings?.includes(cfg.wingId));
    next = {
      ...next,
      unlockedSkins: includeUnique(next.unlockedSkins, cfg.skinId),
      unlockedWings: includeUnique(next.unlockedWings, cfg.wingId),
      wingLevels: { [cfg.wingId]: 1, ...next.wingLevels },
    };
    if (!hadSkin || !hadWing) {
      unlockedLabels.push(`★2 ${cfg.chapterTitle}: Mở khóa ${cfg.skinName} & ${cfg.wingName}`);
    }
  }

  if (stars.has(3)) {
    const hadMount = Boolean(next.unlockedMounts?.includes(cfg.mountId));
    const hadArt = Boolean(next.unlockedArtifacts?.includes(cfg.artifactId));
    next = {
      ...next,
      unlockedMounts: includeUnique(next.unlockedMounts, cfg.mountId),
      mountLevels: { [cfg.mountId]: 1, ...next.mountLevels },
      unlockedArtifacts: includeUnique(next.unlockedArtifacts, cfg.artifactId),
      artifactLevels: { [cfg.artifactId]: 1, ...next.artifactLevels },
    };
    if (!hadMount || !hadArt) {
      unlockedLabels.push(`★3 ${cfg.chapterTitle}: Mở khóa ${cfg.mountName} & ${cfg.artifactName}`);
    }
  }

  if (stars.has(4)) {
    const hadHalo = Boolean(next.unlockedHalos?.includes(cfg.haloId));
    next = {
      ...next,
      unlockedHalos: includeUnique(next.unlockedHalos, cfg.haloId),
      haloLevels: { [cfg.haloId]: 1, ...next.haloLevels },
    };
    if (!hadHalo) {
      unlockedLabels.push(`★4 ${cfg.chapterTitle}: Mở khóa ${cfg.haloName} (Hoàn tất Bộ Chương ${cfg.chapterId})`);
    }
  }

  return { nextSave: next, unlockedLabels };
}

/**
 * Progressive milestone-gated Chapter 2-4 collection unlock engine.
 * Replaces instant 7-item power dumps with skill-based 4-star mastery milestones
 * while preserving 100% of items already owned by legacy players.
 */
export function applyChapterCollectionMilestones(
  save: SaveData,
  run: ChapterRunPerformance
): {
  nextSave: SaveData;
  newlyEarnedStars: Array<{ chapterId: number; star: ChapterMilestoneStar }>;
  newlyUnlockedLabels: string[];
} {
  const milestones = normalizeChapterMilestones(save);
  let workingSave: SaveData = { ...save, chapterMilestones: { ...milestones } };
  const newlyEarnedStars: Array<{ chapterId: number; star: ChapterMilestoneStar }> = [];
  const newlyUnlockedLabels: string[] = [];

  for (const cfg of CHAPTER_MILESTONE_CONFIGS) {
    const prevProgress: ChapterMilestoneProgress = milestones[cfg.chapterId] ?? {
      chapterId: cfg.chapterId,
      clears: 0,
      starsEarned: [],
    };
    const prevStarSet = new Set<number>(prevProgress.starsEarned);
    const nextStarSet = new Set<number>(prevProgress.starsEarned);

    const isMatchingChapterWin = run.victory && run.chapterId === cfg.chapterId;
    const nextClears = prevProgress.clears + (isMatchingChapterWin ? 1 : 0);
    const endHpRatio = Math.max(0, Math.min(1, Number(run.endHpRatio ?? 0)));
    const revivesUsed = Math.max(0, Math.floor(Number(run.revivesUsed ?? 0)));
    const perfectDodges = Math.max(0, Math.floor(Number(run.perfectDodges ?? 0)));
    const bossGuardBreaks = Math.max(0, Math.floor(Number(run.bossGuardBreaks ?? 0)));
    const castInterrupts = Math.max(0, Math.floor(Number(run.castInterrupts ?? 0)));

    const chapterClearedAtLeastOnce =
      workingSave.highestChapterCleared >= cfg.chapterId || isMatchingChapterWin;

    // ★1: Clear Chapter N Stage 12
    if (chapterClearedAtLeastOnce) {
      nextStarSet.add(1);
    }

    // ★2: Clear Chapter N with >=50% HP or 0 revives, or 2+ clears
    if (
      chapterClearedAtLeastOnce &&
      ((isMatchingChapterWin && (endHpRatio >= 0.5 || revivesUsed === 0)) || nextClears >= 2)
    ) {
      nextStarSet.add(2);
    }

    // ★3: Mastery skill clear (>=2 perfect dodges, >=1 guard break, >=2 interrupts) or 3+ clears
    if (
      chapterClearedAtLeastOnce &&
      ((isMatchingChapterWin &&
        (perfectDodges >= 2 || bossGuardBreaks >= 1 || castInterrupts >= 2)) ||
        nextClears >= 3)
    ) {
      nextStarSet.add(3);
    }

    // ★4: Apex trial — reach Stage 6 of next chapter, Endless Tower milestone, or 4+ clears
    const nextChapterBestStage =
      Math.max(
        workingSave.bestStagePerChapter?.[cfg.chapterId + 1] ?? 0,
        run.chapterId === cfg.chapterId + 1 ? run.stageReached : 0
      );
    const towerReached = workingSave.bestTowerFloor ?? 0;
    if (
      chapterClearedAtLeastOnce &&
      (nextChapterBestStage >= 6 ||
        workingSave.highestChapterCleared >= cfg.chapterId + 1 ||
        towerReached >= cfg.towerFloorTarget ||
        nextClears >= 4)
    ) {
      nextStarSet.add(4);
    }

    for (const s of [1, 2, 3, 4] as const) {
      if (nextStarSet.has(s) && !prevStarSet.has(s)) {
        newlyEarnedStars.push({ chapterId: cfg.chapterId, star: s });
      }
    }

    const granted = grantStarsForChapter(workingSave, cfg, nextStarSet);
    workingSave = granted.nextSave;
    newlyUnlockedLabels.push(...granted.unlockedLabels);

    if (nextClears > 0 || nextStarSet.size > 0) {
      milestones[cfg.chapterId] = {
        chapterId: cfg.chapterId,
        clears: nextClears,
        starsEarned: Array.from(nextStarSet).sort((a, b) => a - b),
        bestEndHpRatio: isMatchingChapterWin
          ? Math.max(prevProgress.bestEndHpRatio ?? 0, Number(endHpRatio.toFixed(2)))
          : prevProgress.bestEndHpRatio,
        bestPerfectDodges: isMatchingChapterWin
          ? Math.max(prevProgress.bestPerfectDodges ?? 0, perfectDodges)
          : prevProgress.bestPerfectDodges,
        bestBossGuardBreaks: isMatchingChapterWin
          ? Math.max(prevProgress.bestBossGuardBreaks ?? 0, bossGuardBreaks)
          : prevProgress.bestBossGuardBreaks,
      };
    }
  }

  workingSave = {
    ...workingSave,
    chapterMilestones: milestones,
  };

  return {
    nextSave: workingSave,
    newlyEarnedStars,
    newlyUnlockedLabels,
  };
}

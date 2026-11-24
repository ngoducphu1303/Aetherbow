import type { ChapterMilestoneProgress, SaveData } from '../types/game';

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

export interface ChapterNextStarMeta {
  star: 1 | 2 | 3;
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

export function normalizeChapterMilestones(
  save: Pick<SaveData, 'chapterMilestones' | 'highestChapterCleared'>
): Partial<Record<number, ChapterMilestoneProgress>> {
  const raw = save.chapterMilestones ?? {};
  const result: Partial<Record<number, ChapterMilestoneProgress>> = {};
  const highestCleared = Math.max(0, Math.min(12, Math.floor(save.highestChapterCleared ?? 0)));

  for (let ch = 1; ch <= 12; ch++) {
    const existing = raw[ch];
    if (!existing && ch > highestCleared) continue;
    const stars = new Set<number>(
      Array.isArray(existing?.starsEarned)
        ? existing.starsEarned.filter((s) => s === 1 || s === 2 || s === 3)
        : []
    );
    if (ch <= highestCleared) {
      stars.add(1);
    }
    const clears = Math.max(ch <= highestCleared ? 1 : 0, Math.floor(existing?.clears ?? 0));
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
      requirementText: 'Thắng không hồi sinh & còn ≥ 45% HP',
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
  return null;
}

export function getChapterMilestoneSummary(
  save: Pick<SaveData, 'chapterMilestones' | 'highestChapterCleared'>,
  chapterId: number
): ChapterMilestoneSummary {
  const normalized = normalizeChapterMilestones(save);
  const entry = normalized[chapterId];
  const starsEarned = entry?.starsEarned ?? [];
  return {
    chapterId,
    clears: entry?.clears ?? 0,
    starCount: starsEarned.length,
    maxStars: 3,
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
  newlyEarnedStars: number[];
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

  if (input.victory) {
    nextSet.add(1);
    if (revivesUsed === 0 && endHpRatio >= 0.45) {
      nextSet.add(2);
    }
    if (perfectDodges >= 2 || bossGuardBreaks >= 1 || castInterrupts >= 1) {
      nextSet.add(3);
    }
  }

  const newlyEarnedStars = [...nextSet].filter((s) => !prevSet.has(s)).sort((a, b) => a - b);
  const bonusGold = newlyEarnedStars.length * (180 + chapterId * 45);
  const bonusGems = newlyEarnedStars.length * (15 + chapterId * 5);
  const newlyUnlockedLabels = newlyEarnedStars.map(
    (s) => `Mốc ★${s} Chương ${chapterId} (+${180 + chapterId * 45} Vàng, +${15 + chapterId * 5} Ngọc)`
  );

  const updatedProgress: ChapterMilestoneProgress = {
    chapterId,
    clears: prev.clears + (input.victory ? 1 : 0),
    starsEarned: [...nextSet].sort((a, b) => a - b),
    bestEndHpRatio: Math.max(prev.bestEndHpRatio ?? 0, input.victory ? endHpRatio : 0),
    bestPerfectDodges: Math.max(prev.bestPerfectDodges ?? 0, perfectDodges),
    bestBossGuardBreaks: Math.max(prev.bestBossGuardBreaks ?? 0, bossGuardBreaks),
  };

  const nextSave: SaveData = {
    ...save,
    gold: save.gold + bonusGold,
    gems: save.gems + bonusGems,
    chapterMilestones: {
      ...currentMap,
      [chapterId]: updatedProgress,
    },
  };

  return {
    nextSave,
    newlyEarnedStars,
    newlyUnlockedLabels,
    bonusGold,
    bonusGems,
  };
}

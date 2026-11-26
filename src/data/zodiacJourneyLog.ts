import { CHAPTERS } from './chaptersData';
import { getZodiacChapterLore } from './zodiacWorldLore';
import type { SaveData } from '../types/game';

/**
 * Wave 14 Pillar 2: 12-Chapter Zodiac Journey Log & Conquest Seals
 * (Criteria 02 Core Loop, 15 World Building, 16 Progression).
 *
 * Strictly zero passive stat inflation on Fresh Accounts (preserves exact 702 LC).
 * All rewards unlock only after real gameplay progress and are protected against
 * duplicate claims and save tampering via allowlist sanitization.
 */

export type ZodiacJourneyMilestoneKind = 'enter' | 'clear_boss' | 'mastery_clear';

export interface ZodiacChapterRelicInfo {
  chapterId: number;
  relicName: string;
  relicDesc: string;
  has3dStoryProp: boolean;
}

export interface ZodiacJourneyMilestoneDef {
  id: string;
  chapterId: number;
  kind: ZodiacJourneyMilestoneKind;
  title: string;
  requirementLabel: string;
  rewardGold: number;
  rewardGems: number;
  rewardStarDust: number;
  sealTitle?: string;
}

export interface EvaluatedJourneyMilestone {
  def: ZodiacJourneyMilestoneDef;
  status: 'locked' | 'claimable' | 'claimed';
  progressText: string;
}

export interface EvaluatedChapterJourney {
  chapterId: number;
  chapterName: string;
  zodiacName: string;
  bossName: string;
  realmTitle: string;
  factionName: string;
  eraTag: string;
  chronicle: string;
  relic: ZodiacChapterRelicInfo;
  bestStage: number;
  totalStages: number;
  bossCleared: boolean;
  starsEarned: number;
  nightmareCleared: number;
  milestones: EvaluatedJourneyMilestone[];
  claimableCount: number;
  claimedCount: number;
}

export interface ZodiacJourneyProgressSummary {
  chapters: EvaluatedChapterJourney[];
  totalMilestones: number;
  completedCount: number;
  claimedCount: number;
  claimableCount: number;
  sealsEarnedCount: number;
}

export const ZODIAC_CHAPTER_RELICS: Readonly<Record<number, ZodiacChapterRelicInfo>> = {
  1: {
    chapterId: 1,
    relicName: 'Ấn Nhật Luân Sư Tử',
    relicDesc: 'Đĩa khắc thái dương lưu giữ lời thề đầu tiên của Đoàn Vệ Binh Ánh Dương.',
    has3dStoryProp: false,
  },
  2: {
    chapterId: 2,
    relicName: 'Chiến Cổ Dung Nham Bạch Dương',
    relicDesc: 'Trống lệnh cổ bằng đồng đen vang dội mỗi khi chiến đoàn Sừng Đỏ xuất chinh.',
    has3dStoryProp: false,
  },
  3: {
    chapterId: 3,
    relicName: 'Trụ Địa Mạch Ngọc Lục Bảo',
    relicDesc: 'Khối ngọc mạch đất truyền sinh lực cổ thụ cho toàn bộ rừng thiêng Kim Ngưu.',
    has3dStoryProp: false,
  },
  4: {
    chapterId: 4,
    relicName: 'Song Kính Tinh Tú Song Tử',
    relicDesc: 'Cặp gương đối xứng phản chiếu hai dòng thời gian song song trên tầng mây.',
    has3dStoryProp: false,
  },
  5: {
    chapterId: 5,
    relicName: 'Lồng Đèn San Hô Nguyệt Triều',
    relicDesc: 'Ngọn hải đăng san hô soi chiếu thủy triều trăng dưới đáy Thủy Cung Cự Giải.',
    has3dStoryProp: true,
  },
  6: {
    chapterId: 6,
    relicName: 'Bệ Thư Tịch Tinh Nữ',
    relicDesc: 'Đài khắc mật điển ánh sao ghi lại nghi thức thanh tẩy của Vườn Sao Xử Nữ.',
    has3dStoryProp: true,
  },
  7: {
    chapterId: 7,
    relicName: 'Cột Cân Pha Lê Thiên Bình',
    relicDesc: 'Trụ cân pha lê đo lường công lý đặt dọc đại sảnh Điện Cân Bằng.',
    has3dStoryProp: true,
  },
  8: {
    chapterId: 8,
    relicName: 'Lư Độc Hắc Diện Bọ Cạp',
    relicDesc: 'Lư hương đá hắc diện bốc sương độc tím đánh dấu lãnh địa Ẩn Khách.',
    has3dStoryProp: true,
  },
  9: {
    chapterId: 9,
    relicName: 'Giá Tên Sao Băng Nhân Mã',
    relicDesc: 'Giá trưng bày mũi tên ánh sao của bậc thầy xạ thuật trên Thiên Lộ.',
    has3dStoryProp: true,
  },
  10: {
    chapterId: 10,
    relicName: 'Bia Khắc Đá Băng Ma Kết',
    relicDesc: 'Phiến bia cổ đóng băng khắc niên đại của Cự Nhân Hàn Đỉnh.',
    has3dStoryProp: true,
  },
  11: {
    chapterId: 11,
    relicName: 'Đài Dẫn Tinh Thủy Bảo Bình',
    relicDesc: 'Bồn dẫn tinh thủy tích tụ tia sét lam giữa cơn bão điện từ Hải Đài.',
    has3dStoryProp: true,
  },
  12: {
    chapterId: 12,
    relicName: 'Cổng Ngọc Trai Song Ngư',
    relicDesc: 'Cổng vòng ngọc trai đôi nối liền giấc mộng khởi nguyên ở Hải Vực Mộng Ảo.',
    has3dStoryProp: true,
  },
};

function buildJourneyMilestones(): ZodiacJourneyMilestoneDef[] {
  const list: ZodiacJourneyMilestoneDef[] = [];
  for (let ch = 1; ch <= 12; ch++) {
    const chDef = CHAPTERS.find((c) => c.id === ch);
    const zodiacLabel = chDef?.zodiacName ?? `Cung ${ch}`;
    const enterGold = 180 + ch * 45;
    const clearGold = 320 + ch * 75;
    const clearGems = 14 + ch * 3;
    const masteryGold = 420 + ch * 95;
    const masteryGems = 20 + ch * 4;
    const enterDust = 10 + ch * 3;
    const clearDust = 22 + ch * 5;
    const masteryDust = 35 + ch * 7;

    list.push(
      {
        id: `journey_ch${ch}_enter`,
        chapterId: ch,
        kind: 'enter',
        title: `Khám Phá Chương ${ch}`,
        requirementLabel: `Đạt ít nhất Ải 3 của Chương ${ch}`,
        rewardGold: enterGold,
        rewardGems: 0,
        rewardStarDust: enterDust,
      },
      {
        id: `journey_ch${ch}_clear`,
        chapterId: ch,
        kind: 'clear_boss',
        title: `Chinh Phục ${zodiacLabel}`,
        requirementLabel: `Hạ gục Đại Boss Chương ${ch}`,
        rewardGold: clearGold,
        rewardGems: clearGems,
        rewardStarDust: clearDust,
      },
      {
        id: `journey_ch${ch}_mastery`,
        chapterId: ch,
        kind: 'mastery_clear',
        title: `Ấn Triện ${zodiacLabel}`,
        requirementLabel: `Đạt ≥ 2 Sao Chương ${ch} hoặc vượt Ác Mộng I`,
        rewardGold: masteryGold,
        rewardGems: masteryGems,
        rewardStarDust: masteryDust,
        sealTitle: `Chinh Phục ${zodiacLabel}`,
      }
    );
  }
  return list;
}

export const ZODIAC_JOURNEY_MILESTONES: readonly ZodiacJourneyMilestoneDef[] =
  buildJourneyMilestones();

export const ZODIAC_JOURNEY_MILESTONE_MAP: Readonly<Record<string, ZodiacJourneyMilestoneDef>> =
  Object.fromEntries(ZODIAC_JOURNEY_MILESTONES.map((m) => [m.id, m]));

export const VALID_JOURNEY_MILESTONE_IDS: ReadonlySet<string> = new Set(
  ZODIAC_JOURNEY_MILESTONES.map((m) => m.id)
);

function isMilestoneUnlocked(save: SaveData, def: ZodiacJourneyMilestoneDef): {
  unlocked: boolean;
  progressText: string;
} {
  const ch = def.chapterId;
  const highestCleared = Math.max(0, Math.floor(save.highestChapterCleared ?? 0));
  const bestStage = Math.max(0, Math.floor(save.bestStagePerChapter?.[ch] ?? 0));
  const bossCleared = highestCleared >= ch;
  const starsCount = save.chapterMilestones?.[ch]?.starsEarned?.length ?? 0;
  const nightmareTier = Math.max(0, Math.floor(save.nightmareClears?.[ch] ?? 0));

  if (def.kind === 'enter') {
    const reached = bossCleared ? 3 : Math.min(3, bestStage);
    return {
      unlocked: bossCleared || bestStage >= 3,
      progressText: `${reached}/3 Ải`,
    };
  }
  if (def.kind === 'clear_boss') {
    return {
      unlocked: bossCleared,
      progressText: bossCleared ? 'Đã hạ Boss' : `Ải ${bestStage}/12`,
    };
  }
  const masteryReached = bossCleared && (starsCount >= 2 || nightmareTier >= 1);
  return {
    unlocked: masteryReached,
    progressText:
      nightmareTier >= 1
        ? `Ác Mộng ${nightmareTier}`
        : `${Math.min(2, starsCount)}/2 Sao`,
  };
}

export function evaluateZodiacJourneyProgress(save: SaveData): ZodiacJourneyProgressSummary {
  const claimedSet = new Set<string>(save.claimedJourneyMilestones ?? []);
  const chapters: EvaluatedChapterJourney[] = [];
  let completedCount = 0;
  let claimedCount = 0;
  let claimableCount = 0;
  let sealsEarnedCount = 0;

  for (let ch = 1; ch <= 12; ch++) {
    const chDef = CHAPTERS.find((c) => c.id === ch);
    const lore = getZodiacChapterLore(ch);
    const relic = ZODIAC_CHAPTER_RELICS[ch];
    const totalStages = chDef?.stages.length ?? 12;
    const bossCleared = (save.highestChapterCleared ?? 0) >= ch;
    const bestStage = bossCleared
      ? totalStages
      : Math.max(0, Math.min(totalStages, Math.floor(save.bestStagePerChapter?.[ch] ?? 0)));
    const starsEarned = save.chapterMilestones?.[ch]?.starsEarned?.length ?? 0;
    const nightmareCleared = Math.max(0, Math.floor(save.nightmareClears?.[ch] ?? 0));

    const chapterMilestones = ZODIAC_JOURNEY_MILESTONES.filter((m) => m.chapterId === ch);
    const evaluated: EvaluatedJourneyMilestone[] = [];
    let chClaimable = 0;
    let chClaimed = 0;

    for (const def of chapterMilestones) {
      const { unlocked, progressText } = isMilestoneUnlocked(save, def);
      const isClaimed = claimedSet.has(def.id);
      const status: 'locked' | 'claimable' | 'claimed' = isClaimed
        ? 'claimed'
        : unlocked
        ? 'claimable'
        : 'locked';

      if (unlocked || isClaimed) completedCount += 1;
      if (isClaimed) {
        claimedCount += 1;
        chClaimed += 1;
        if (def.kind === 'mastery_clear') sealsEarnedCount += 1;
      } else if (unlocked) {
        claimableCount += 1;
        chClaimable += 1;
      }

      evaluated.push({ def, status, progressText });
    }

    chapters.push({
      chapterId: ch,
      chapterName: chDef?.name ?? lore.realmTitle,
      zodiacName: chDef?.zodiacName ?? `Chương ${ch}`,
      bossName: chDef?.bossName ?? 'Đại Boss Hoàng Đạo',
      realmTitle: lore.realmTitle,
      factionName: lore.factionName,
      eraTag: lore.eraTag,
      chronicle: lore.chronicle,
      relic,
      bestStage,
      totalStages,
      bossCleared,
      starsEarned,
      nightmareCleared,
      milestones: evaluated,
      claimableCount: chClaimable,
      claimedCount: chClaimed,
    });
  }

  return {
    chapters,
    totalMilestones: ZODIAC_JOURNEY_MILESTONES.length,
    completedCount,
    claimedCount,
    claimableCount,
    sealsEarnedCount,
  };
}

export function countClaimableJourneyMilestones(save: SaveData): number {
  return evaluateZodiacJourneyProgress(save).claimableCount;
}

export function claimZodiacJourneyMilestoneInSave(
  save: SaveData,
  milestoneId: string
): {
  claimed: boolean;
  nextSave: SaveData;
  milestone?: ZodiacJourneyMilestoneDef;
  reason?: string;
} {
  const def = ZODIAC_JOURNEY_MILESTONE_MAP[milestoneId];
  if (!def) {
    return { claimed: false, nextSave: save, reason: 'Mốc hành trình không hợp lệ.' };
  }
  const existing = save.claimedJourneyMilestones ?? [];
  if (existing.includes(def.id)) {
    return { claimed: false, nextSave: save, milestone: def, reason: 'Mốc này đã được nhận thưởng.' };
  }
  const check = isMilestoneUnlocked(save, def);
  if (!check.unlocked) {
    return {
      claimed: false,
      nextSave: save,
      milestone: def,
      reason: `Chưa đạt điều kiện: ${def.requirementLabel}.`,
    };
  }

  const nextSave: SaveData = {
    ...save,
    gold: save.gold + def.rewardGold,
    gems: save.gems + def.rewardGems,
    starDust: (save.starDust ?? 0) + def.rewardStarDust,
    claimedJourneyMilestones: [...existing, def.id],
  };

  return { claimed: true, nextSave, milestone: def };
}

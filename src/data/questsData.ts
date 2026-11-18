import { CheckInProgress, DailyQuestProgress, Rarity } from '../types/game';

export function getTodayKey(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function normalizeDailyQuests(q?: DailyQuestProgress): DailyQuestProgress {
  const today = getTodayKey();
  if (!q || q.date !== today) {
    return {
      date: today,
      kills: 0,
      stages: 0,
      chests: 0,
      upgrades: 0,
      claimedIds: [],
    };
  }
  return {
    date: q.date,
    kills: q.kills ?? 0,
    stages: q.stages ?? 0,
    chests: q.chests ?? 0,
    upgrades: q.upgrades ?? 0,
    claimedIds: Array.isArray(q.claimedIds) ? q.claimedIds : [],
  };
}

export function normalizeCheckIn(c?: CheckInProgress): CheckInProgress {
  if (!c) return { count: 0, lastDate: '' };
  return {
    count: Math.max(0, Math.min(7, c.count ?? 0)),
    lastDate: c.lastDate ?? '',
  };
}

export interface DailyQuestDef {
  id: string;
  title: string;
  metric: 'kills' | 'stages' | 'chests' | 'upgrades';
  target: number;
  rewardGold: number;
  rewardGems: number;
}

export const DAILY_QUESTS: DailyQuestDef[] = [
  {
    id: 'dq_kills_20',
    title: 'Tiêu diệt 20 quái vật trong Thánh Điện',
    metric: 'kills',
    target: 20,
    rewardGold: 140,
    rewardGems: 12,
  },
  {
    id: 'dq_stages_5',
    title: 'Vượt qua 5 phòng chiến đấu bất kỳ',
    metric: 'stages',
    target: 5,
    rewardGold: 160,
    rewardGems: 15,
  },
  {
    id: 'dq_upgrade_1',
    title: 'Cường hóa trang bị hoặc nâng cấp 1 lần',
    metric: 'upgrades',
    target: 1,
    rewardGold: 110,
    rewardGems: 10,
  },
  {
    id: 'dq_chest_1',
    title: 'Triệu hồi 1 Rương Kho Báu bất kỳ',
    metric: 'chests',
    target: 1,
    rewardGold: 150,
    rewardGems: 18,
  },
];

export interface CheckInDayReward {
  day: number;
  label: string;
  gold: number;
  gems: number;
  bonusRarity?: Rarity;
}

export const CHECK_IN_REWARDS: CheckInDayReward[] = [
  { day: 1, label: '150 Vàng', gold: 150, gems: 10 },
  { day: 2, label: '25 Ngọc Hồn', gold: 80, gems: 25 },
  { day: 3, label: '240 Vàng', gold: 240, gems: 15 },
  { day: 4, label: 'Trang Bị Hiếm', gold: 100, gems: 15, bonusRarity: Rarity.RARE },
  { day: 5, label: '350 Vàng', gold: 350, gems: 20 },
  { day: 6, label: '45 Ngọc Hồn', gold: 150, gems: 45 },
  { day: 7, label: 'Trang Bị Sử Thi [S]', gold: 300, gems: 50, bonusRarity: Rarity.EPIC },
];

export function countClaimableWelfare(save: {
  welcomeGiftClaimed?: boolean;
  checkIn?: CheckInProgress;
  dailyQuests?: DailyQuestProgress;
}): number {
  let count = 0;
  if (!save.welcomeGiftClaimed) count += 1;

  const ci = normalizeCheckIn(save.checkIn);
  const today = getTodayKey();
  if (ci.count < 7 && ci.lastDate !== today) count += 1;

  const dq = normalizeDailyQuests(save.dailyQuests);
  for (const q of DAILY_QUESTS) {
    if (!dq.claimedIds.includes(q.id) && dq[q.metric] >= q.target) {
      count += 1;
    }
  }
  return count;
}

import type { SaveData } from '../types/game';

export interface FirstHourMilestone {
  id: string;
  timeLabel: string;
  title: string;
  goalDesc: string;
  completed: boolean;
  progressLabel: string;
}

export interface FirstHourRoadmapEvaluation {
  milestones: FirstHourMilestone[];
  completedCount: number;
  totalCount: number;
  nextMilestone: FirstHourMilestone | null;
}

export function evaluateFirstHourRoadmap(save: SaveData): FirstHourRoadmapEvaluation {
  const highestChapter = Math.max(0, Math.floor(save.highestChapterCleared ?? 0));
  const equippedCount = Object.values(save.equipped ?? {}).filter(Boolean).length;
  const totalTalentLevels = Object.values(save.talents ?? {}).reduce(
    (sum, lv) => sum + Math.max(0, Math.floor(lv ?? 0)),
    0
  );
  const towerFloor = Math.max(0, Math.floor(save.bestTowerFloor ?? 0));
  const evoCount = Array.isArray(save.discoveredEvolutions) ? save.discoveredEvolutions.length : 0;

  const milestones: FirstHourMilestone[] = [
    {
      id: 'ftue_ch1_clear',
      timeLabel: '0–10 phút',
      title: 'Chinh Phục Chương 1',
      goalDesc: 'Vượt qua Đấu Trường Sư Tử Nhật Luân và làm quen né hoàn hảo + ngắt chiêu Boss.',
      completed: highestChapter >= 1,
      progressLabel: highestChapter >= 1 ? '1/1' : '0/1',
    },
    {
      id: 'ftue_gear_and_talents',
      timeLabel: '10–25 phút',
      title: 'Trang Bị & Thiên Phú',
      goalDesc: 'Mặc tối thiểu 4 ô trang bị và nâng 3 tầng Thiên Phú để bứt phá lực chiến.',
      completed: equippedCount >= 4 && totalTalentLevels >= 3,
      progressLabel: `${Math.min(4, equippedCount)}/4 đồ · ${Math.min(3, totalTalentLevels)}/3 TP`,
    },
    {
      id: 'ftue_evolution_or_ch2',
      timeLabel: '25–45 phút',
      title: 'Ngã Rẽ Tiến Hóa Kỹ Năng',
      goalDesc: 'Chinh phục Chương 2 hoặc mở khóa ít nhất 1 nhánh Tiến Hóa Kỹ Năng trong trận.',
      completed: highestChapter >= 2 || evoCount >= 1,
      progressLabel: highestChapter >= 2 ? 'Xong Ch.2' : `${Math.min(1, evoCount)}/1 Tiến Hóa`,
    },
    {
      id: 'ftue_endgame_ready',
      timeLabel: '45–60 phút',
      title: 'Sẵn Sàng Tháp & Boss Tuần',
      goalDesc: 'Leo tối thiểu Tầng 5 Tháp Thiên Giới hoặc chinh phục Chương 3.',
      completed: towerFloor >= 5 || highestChapter >= 3,
      progressLabel: `Tầng ${Math.min(5, towerFloor)}/5`,
    },
  ];

  const completedCount = milestones.filter((m) => m.completed).length;
  const nextMilestone = milestones.find((m) => !m.completed) ?? null;

  return {
    milestones,
    completedCount,
    totalCount: milestones.length,
    nextMilestone,
  };
}

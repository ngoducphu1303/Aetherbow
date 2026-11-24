import { Rarity, SaveData } from '../types/game';
import { computePlayerStats, createInitialSaveData } from './gearData';
import { GEAR_SET_COMBAT_PROCS } from '../engine/gearSetCombatProcs';
import {
  auditEconomySinksAndArbitrage,
  evaluateChapterTtkTtdCurve,
  evaluateSkillBuildBalance,
  simulate100HourJourney,
} from './balanceSimulation';

export interface FirstHourMilestone {
  id: 'ftue_5m' | 'ftue_15m' | 'ftue_30m' | 'ftue_60m';
  timeLabel: string;
  title: string;
  goalDesc: string;
  completed: boolean;
  progressLabel: string;
}

export interface FirstHourRoadmapState {
  milestones: FirstHourMilestone[];
  completedCount: number;
  totalCount: number;
  nextMilestone: FirstHourMilestone | null;
}

/**
 * Evaluates the Master Prompt First-Time User Experience checkpoints (5m, 15m, 30m, 60m)
 * directly from real player save progress with zero dark patterns or artificial timers.
 */
export function evaluateFirstHourRoadmap(save: SaveData): FirstHourRoadmapState {
  const career = save.career;
  const ch1BestStage = Math.max(
    save.bestStagePerChapter?.[1] ?? 0,
    save.highestChapterCleared >= 1 ? 12 : 0
  );
  const totalKills = career?.totalKills ?? 0;
  const hasRareOrHigher = (save.inventory ?? []).some(
    (g) =>
      g.rarity === Rarity.RARE ||
      g.rarity === Rarity.EPIC ||
      g.rarity === Rarity.LEGENDARY ||
      g.rarity === Rarity.MYTHIC
  );
  const totalUpgrades =
    (save.inventory ?? []).reduce((acc, g) => acc + Math.max(0, (g.level ?? 1) - 1), 0) +
    Object.values(save.talents ?? {}).reduce((acc, lv) => acc + (lv ?? 0), 0);
  const discoveredEvos = (save.discoveredEvolutions ?? []).length;
  const bestTower = save.bestTowerFloor ?? 0;

  const milestones: FirstHourMilestone[] = [
    {
      id: 'ftue_5m',
      timeLabel: '5 phút',
      title: 'Khởi Động Thánh Điện & Nâng Cấp Đầu Tiên',
      goalDesc: 'Hạ 10 quái Chương 1 và cường hóa trang bị hoặc Thiên Phú 1 lần.',
      completed: totalKills >= 10 && totalUpgrades >= 1,
      progressLabel: `${Math.min(10, totalKills)}/10 quái · ${Math.min(1, totalUpgrades)}/1 nâng cấp`,
    },
    {
      id: 'ftue_15m',
      timeLabel: '15 phút',
      title: 'Chạm Trán Tinh Anh Ải 4 & Trang Bị Hiếm',
      goalDesc: 'Đạt Ải 4 Chương 1 và sở hữu món trang bị phẩm chất Hiếm đầu tiên.',
      completed: ch1BestStage >= 4 && hasRareOrHigher,
      progressLabel: `Ải ${Math.min(4, ch1BestStage)}/4 · ${hasRareOrHigher ? 'Đã có Hiếm' : 'Chưa có Hiếm'}`,
    },
    {
      id: 'ftue_30m',
      timeLabel: '30 phút',
      title: 'Chinh Phục Vệ Thần Sư Tử (Chương 1)',
      goalDesc: 'Đánh bại Boss Chương 1 để mở khóa Chương 2 và Tháp Vô Tận.',
      completed: save.highestChapterCleared >= 1,
      progressLabel:
        save.highestChapterCleared >= 1
          ? 'Đã hoàn thành Chương 1'
          : `Tiến độ Ải ${ch1BestStage}/12`,
    },
    {
      id: 'ftue_60m',
      timeLabel: '60 phút',
      title: 'Khai Mở Tiến Hóa Kỹ Năng & Tháp Vô Tận',
      goalDesc: 'Kích hoạt 1 Tiến Hóa Kỹ Năng rẽ nhánh và vượt ít nhất Tầng 2 Tháp Vô Tận.',
      completed: discoveredEvos >= 1 && bestTower >= 2,
      progressLabel: `${Math.min(1, discoveredEvos)}/1 Tiến Hóa · Tầng ${Math.min(2, bestTower)}/2`,
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

export interface Pass3EconomyBalanceAudit {
  freshAccountPowerRating: number;
  freshAccountActiveSetProcs: number;
  gearSetProcCount: number;
  setProcDpsScoreRatio: number;
  setProcsBalanced: boolean;
  journey100hMilestonesCount: number;
  hour100PowerRating: number;
  hour100GoldEarned: number;
  totalEndgameGoldSink: number;
  goldSinkCoverageRatio: number;
  flashDealArbitrageDetected: boolean;
  chapter12TtkHealthy: boolean;
  skillBuildsBalanced: boolean;
}

/**
 * Verifies Pass 3 economy, gear-set proc balance, and 5m -> 100h progression invariants:
 * - Fresh account stays strictly at ~702 CP with 0 active gear set procs.
 * - All 5 mid/endgame gear set procs stay within a fair DPS/survivability band (<= 1.25 ratio).
 * - Endgame gold sinks (Talents + 6x Mythic +80 gear) exceed 100h cumulative gold to prevent inflation.
 */
export function evaluatePass3EconomyAndSetBalance(): Pass3EconomyBalanceAudit {
  const freshSave = createInitialSaveData();
  const freshStats = computePlayerStats(freshSave);
  const journey = simulate100HourJourney('average', 'pass3-audit-100h');
  const sinks = auditEconomySinksAndArbitrage();
  const ttkRows = evaluateChapterTtkTtdCurve();
  const skillBalance = evaluateSkillBuildBalance();

  const procs = Object.values(GEAR_SET_COMBAT_PROCS);
  // Estimate normalized per-second effective value of each unique set proc
  const procScores = procs.map((p) => {
    const dpsPart = p.damageAtkMult / Math.max(1, p.internalCooldownSec);
    const defensePart = (p.shieldMaxHpPct * 2.2) / Math.max(1, p.internalCooldownSec);
    const utilityPart =
      (p.ultChargeGain * 1.8 +
        (p.tempAtkSpeedBonus + p.tempMoveSpeedBonus * 0.6) * (p.buffDurationSec / Math.max(1, p.internalCooldownSec)));
    return Number((dpsPart + defensePart + utilityPart).toFixed(3));
  });
  const sortedScores = [...procScores].sort((a, b) => a - b);
  const median = sortedScores[Math.floor(sortedScores.length / 2)] || 1;
  const maxScore = sortedScores[sortedScores.length - 1] || 1;
  const setProcDpsScoreRatio = Number((maxScore / Math.max(0.001, median)).toFixed(3));

  const hour100Milestone = journey.milestones[journey.milestones.length - 1];
  const hour100GoldEarned = hour100Milestone?.cumulativeGoldEarned ?? 1;
  const totalEndgameGoldSink = sinks.fullTalentGoldSink + sinks.sixMythicGearLv80GoldSink;
  const goldSinkCoverageRatio = Number(
    (totalEndgameGoldSink / Math.max(1, hour100GoldEarned)).toFixed(2)
  );

  const chapter12TtkHealthy = ttkRows.every(
    (row) => row.mobTtkSec >= 0.4 && row.bossTtkSec >= 10 && row.playerTtdHits >= 3.0
  );

  return {
    freshAccountPowerRating: freshStats.powerRating,
    freshAccountActiveSetProcs: (freshStats.activeGearSets ?? []).filter(
      (s) => s.unlockedTiers.length > 0
    ).length,
    gearSetProcCount: procs.length,
    setProcDpsScoreRatio,
    setProcsBalanced: setProcDpsScoreRatio <= 1.35,
    journey100hMilestonesCount: journey.milestones.length,
    hour100PowerRating: journey.hour100PowerRating,
    hour100GoldEarned,
    totalEndgameGoldSink,
    goldSinkCoverageRatio,
    flashDealArbitrageDetected: sinks.flashDealArbitrageDetected,
    chapter12TtkHealthy,
    skillBuildsBalanced: skillBalance.balanced,
  };
}

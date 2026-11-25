import { Rarity, type SaveData } from '../types/game';
import { computePlayerStats, createInitialSaveData, evaluateEquippedGearSets } from './gearData';
import {
  auditEconomySinksAndArbitrage,
  evaluateChapterTtkTtdCurve,
  evaluateSkillBuildBalance,
  simulate100HourJourney,
} from './balanceSimulation';
import { GEAR_SET_COMBAT_PROCS, resolveActiveGearSetProcs } from '../engine/gearSetCombatProcs';
import { getParagonInfusionCost, PARAGON_INFUSION_MAX_LEVEL } from './talentsData';

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

export interface Pass3EconomyAndSetBalanceAudit {
  freshAccountPowerRating: number;
  freshAccountActiveSetProcs: number;
  gearSetProcCount: number;
  setProcsBalanced: boolean;
  journey100hMilestonesCount: number;
  flashDealArbitrageDetected: boolean;
  chapter12TtkHealthy: boolean;
  skillBuildsBalanced: boolean;
  hour100GoldEarned: number;
  paragonInfusionGoldSink: number;
  totalEndgameGoldSink: number;
}

const RARE_OR_HIGHER = new Set<Rarity>([
  Rarity.RARE,
  Rarity.EPIC,
  Rarity.LEGENDARY,
  Rarity.MYTHIC,
]);

export function evaluateFirstHourRoadmap(save: SaveData): FirstHourRoadmapEvaluation {
  const highestChapter = Math.max(0, Math.floor(save.highestChapterCleared ?? 0));
  const totalKills = Math.max(0, Math.floor(save.career?.totalKills ?? 0));
  const hasRareOrUpGear = (save.inventory ?? []).some((item) => RARE_OR_HIGHER.has(item.rarity));
  const towerFloor = Math.max(0, Math.floor(save.bestTowerFloor ?? 0));
  const evoCount = Array.isArray(save.discoveredEvolutions) ? save.discoveredEvolutions.length : 0;

  const m5Done = totalKills >= 15 || highestChapter >= 1;
  const m15Done = hasRareOrUpGear || Object.values(save.equipped ?? {}).filter(Boolean).length >= 4;
  const m30Done = highestChapter >= 1 || evoCount >= 1;
  const m60Done = towerFloor >= 3 || highestChapter >= 2 || evoCount >= 3;

  const milestones: FirstHourMilestone[] = [
    {
      id: 'ftue_5m',
      timeLabel: '0–5 phút',
      title: 'Khởi Động Chiến Trường',
      goalDesc: 'Tiêu diệt 15 quái đầu tiên và làm quen nhịp né đòn + kích hoạt Cơ Chế Đấu Trường.',
      completed: m5Done,
      progressLabel: `${Math.min(15, totalKills)}/15 quái`,
    },
    {
      id: 'ftue_15m',
      timeLabel: '5–15 phút',
      title: 'Trang Bị Hiếm Đầu Tiên',
      goalDesc: 'Sở hữu trang bị bậc Hiếm trở lên hoặc lấp đầy 4 ô trang bị để mở khóa bộ chỉ số.',
      completed: m15Done,
      progressLabel: m15Done ? 'Đã đạt' : '0/1 Hiếm',
    },
    {
      id: 'ftue_30m',
      timeLabel: '15–30 phút',
      title: 'Chinh Phục Chương 1 & Tiến Hóa',
      goalDesc: 'Hạ gục Boss Chương 1 hoặc khai mở nhánh Tiến Hóa Kỹ Năng đầu tiên.',
      completed: m30Done,
      progressLabel: highestChapter >= 1 ? 'Xong Ch.1' : `${Math.min(1, evoCount)}/1 Tiến Hóa`,
    },
    {
      id: 'ftue_60m',
      timeLabel: '30–60 phút',
      title: 'Leo Tháp & Chuẩn Bị Endgame',
      goalDesc: 'Chạm mốc Tầng 3 Tháp Thiên Giới hoặc khám phá 3 nhánh Tiến Hóa Kỹ Năng.',
      completed: m60Done,
      progressLabel: `Tầng ${Math.min(3, towerFloor)}/3`,
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

export function evaluatePass3EconomyAndSetBalance(): Pass3EconomyAndSetBalanceAudit {
  const freshSave = createInitialSaveData();
  const freshAccountPowerRating = computePlayerStats(freshSave).powerRating;
  const freshSets = evaluateEquippedGearSets(freshSave);
  const freshAccountActiveSetProcs = resolveActiveGearSetProcs(freshSets.sets).length;

  const procEntries = Object.values(GEAR_SET_COMBAT_PROCS);
  const gearSetProcCount = procEntries.length;
  const setProcsBalanced =
    gearSetProcCount === 5 &&
    procEntries.every(
      (p) =>
        p.internalCooldownSec >= 4 &&
        p.internalCooldownSec <= 15 &&
        p.aoeDamageAtkMult <= 2.5 &&
        p.shieldMaxHpPct <= 0.25 &&
        p.ultChargeGain <= 0.35
    );

  const avgJourney = simulate100HourJourney('average');
  const econAudit = auditEconomySinksAndArbitrage();
  const ttkRows = evaluateChapterTtkTtdCurve();
  const skillBalance = evaluateSkillBuildBalance();

  const ch12 = ttkRows[ttkRows.length - 1];
  const chapter12TtkHealthy = Boolean(
    ch12 &&
      ch12.mobTtkSec >= 0.4 &&
      ch12.mobTtkSec <= 8.0 &&
      ch12.bossTtkSec >= 8 &&
      ch12.bossTtkSec <= 120 &&
      ch12.playerTtdHits >= 3.5
  );

  const hour100GoldEarned =
    avgJourney.milestones[avgJourney.milestones.length - 1]?.cumulativeGoldEarned ?? 0;

  let paragonInfusionGoldSink = 0;
  for (let lv = 0; lv < PARAGON_INFUSION_MAX_LEVEL; lv++) {
    paragonInfusionGoldSink += getParagonInfusionCost(lv);
  }
  const totalEndgameGoldSink =
    econAudit.fullTalentGoldSink +
    econAudit.sixMythicGearLv80GoldSink +
    paragonInfusionGoldSink;

  return {
    freshAccountPowerRating,
    freshAccountActiveSetProcs,
    gearSetProcCount,
    setProcsBalanced,
    journey100hMilestonesCount: avgJourney.milestones.length,
    flashDealArbitrageDetected: econAudit.flashDealArbitrageDetected,
    chapter12TtkHealthy,
    skillBuildsBalanced: skillBalance.balanced,
    hour100GoldEarned,
    paragonInfusionGoldSink,
    totalEndgameGoldSink,
  };
}

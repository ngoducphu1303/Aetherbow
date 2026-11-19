import React from 'react';
import { AlertTriangle, ArrowUpRight, BarChart3, Crown, Flag, Flame, Hammer, Home, Play, RotateCcw, Settings, Skull, Sparkles, Swords, Trophy, Users } from 'lucide-react';
import { getNextTargetGoal } from '../data/earlyProgressionData';
import { GEAR_TEMPLATES, getUpgradeCost } from '../data/gearData';
import { COOP_DIFFICULTY_MAP, ELEMENTAL_TOWER_MAP } from '../data/wave6Data';
import { evaluateMatchMvpReport } from '../data/wave11Data';
import { CoopRaidDifficulty, DamageBreakdown, DefeatCauseInfo, ElementalTowerId, GamePhase, GearSlot, SaveData } from '../types/game';
import {
  ArtifactRelicIcon,
  AwakenCrystalIcon,
  GoldCoinIcon,
  MountShardIcon,
  MysticTokenIcon,
  PetEssenceIcon,
  SoulGemIcon,
  StarDustIcon,
  WingFeatherIcon,
} from './GameIcons';

interface PauseResultModalProps {
  phase: GamePhase.PAUSED | GamePhase.VICTORY | GamePhase.GAME_OVER;
  chapterName: string;
  stageReached: number;
  totalStages: number;
  isTowerMode?: boolean;
  towerFloor?: number;
  isBossRushMode?: boolean;
  bossRushRound?: number;
  isDailyRiftMode?: boolean;
  isGuildBossMode?: boolean;
  guildBossDamage?: number;
  isArenaMode?: boolean;
  arenaOpponentName?: string;
  arenaRatingDelta?: number;
  isCoopRaidMode?: boolean;
  coopDifficulty?: CoopRaidDifficulty;
  isElementalTowerMode?: boolean;
  elementalTowerId?: ElementalTowerId;
  elementalTowerFloor?: number;
  isCrystalDefenseMode?: boolean;
  crystalWavesCleared?: number;
  crystalHpPct?: number;
  isWorldBossMode?: boolean;
  worldBossDamage?: number;
  worldBossLiveRank?: number;
  isBloodMoonMode?: boolean;
  bloodMoonScore?: number;
  bloodMoonWave?: number;
  isAbyssalMode?: boolean;
  abyssalWave?: number;
  abyssalScore?: number;
  isGuildWarMode?: boolean;
  guildWarScore?: number;
  guildWarNodes?: number;
  isPantheonMode?: boolean;
  pantheonStage?: number;
  pantheonScore?: number;
  divineCrystalsEarned?: number;
  isChampionshipMode?: boolean;
  championshipRound?: number;
  championshipScore?: number;
  gloryTrophiesEarned?: number;
  spiritCoresEarned?: number;
  festivalLanternsEarned?: number;
  isCrystalVaultMode?: boolean;
  vaultPillarsBroken?: number;
  vaultReforgeLooted?: number;
  vaultShardsLooted?: number;
  isDragonLairMode?: boolean;
  dragonDamageDealt?: number;
  dragonScalesLooted?: number;
  dragonPhase?: number;
  isSkyCitadelMode?: boolean;
  skyCitadelWave?: number;
  skyCitadelScore?: number;
  celestialFeathersEarned?: number;
  mythicShardsEarned?: number;
  warCrestsEarned?: number;
  wingFeathersEarned?: number;
  mountShardsEarned?: number;
  awakeningCrystalsEarned?: number;
  artifactShardsEarned?: number;
  mysticTokensEarned?: number;
  guildCoinsEarned?: number;
  kills: number;
  goldEarned: number;
  gemsEarned: number;
  starDustEarned?: number;
  petEssenceEarned?: number;
  maxCombo?: number;
  damageBreakdown?: DamageBreakdown;
  seasonXpEarned?: number;
  save?: SaveData;
  defeatCause?: DefeatCauseInfo;
  milestoneNotes?: string[];
  prevBestStage?: number;
  masteryExpGained?: number;
  masteryLeveledUpTo?: number;
  onQuickUpgradeWeapon?: () => void;
  onResume?: () => void;
  onRetry: () => void;
  onReturnTitle: () => void;
  onOpenSettings?: () => void;
  onQuickAction?: (target: 'gear' | 'pets' | 'halos' | 'festival') => void;
}

export const PauseResultModal: React.FC<PauseResultModalProps> = ({
  phase,
  chapterName,
  stageReached,
  totalStages,
  isTowerMode = false,
  towerFloor = 1,
  isBossRushMode = false,
  bossRushRound = 1,
  isDailyRiftMode = false,
  isGuildBossMode = false,
  guildBossDamage = 0,
  isArenaMode = false,
  arenaOpponentName = '',
  arenaRatingDelta = 0,
  isCoopRaidMode = false,
  coopDifficulty = 'normal',
  isElementalTowerMode = false,
  elementalTowerId = 'fire',
  elementalTowerFloor = 1,
  isCrystalDefenseMode = false,
  crystalWavesCleared = 0,
  crystalHpPct = 0,
  isWorldBossMode = false,
  worldBossDamage = 0,
  worldBossLiveRank = 9,
  isBloodMoonMode = false,
  bloodMoonScore = 0,
  bloodMoonWave = 0,
  isAbyssalMode = false,
  abyssalWave = 0,
  abyssalScore = 0,
  isGuildWarMode = false,
  guildWarScore = 0,
  guildWarNodes = 0,
  isPantheonMode = false,
  pantheonStage = 0,
  pantheonScore = 0,
  divineCrystalsEarned = 0,
  isChampionshipMode = false,
  championshipRound = 0,
  championshipScore = 0,
  gloryTrophiesEarned = 0,
  spiritCoresEarned = 0,
  festivalLanternsEarned = 0,
  isCrystalVaultMode = false,
  vaultPillarsBroken = 0,
  vaultReforgeLooted = 0,
  vaultShardsLooted = 0,
  isDragonLairMode = false,
  dragonDamageDealt = 0,
  dragonScalesLooted = 0,
  dragonPhase = 1,
  isSkyCitadelMode = false,
  skyCitadelWave = 1,
  skyCitadelScore = 0,
  celestialFeathersEarned = 0,
  mythicShardsEarned = 0,
  warCrestsEarned = 0,
  wingFeathersEarned = 0,
  mountShardsEarned = 0,
  awakeningCrystalsEarned = 0,
  artifactShardsEarned = 0,
  mysticTokensEarned = 0,
  guildCoinsEarned = 0,
  kills,
  goldEarned,
  gemsEarned,
  starDustEarned = 0,
  petEssenceEarned = 0,
  maxCombo = 0,
  damageBreakdown,
  seasonXpEarned = 0,
  save,
  defeatCause,
  milestoneNotes,
  prevBestStage,
  masteryExpGained = 0,
  masteryLeveledUpTo,
  onQuickUpgradeWeapon,
  onResume,
  onRetry,
  onReturnTitle,
  onOpenSettings,
  onQuickAction,
}) => {
  const isPause = phase === GamePhase.PAUSED;
  const isVictory = phase === GamePhase.VICTORY;
  const isCampaignRun =
    !isTowerMode &&
    !isBossRushMode &&
    !isDailyRiftMode &&
    !isGuildBossMode &&
    !isArenaMode &&
    !isCoopRaidMode &&
    !isElementalTowerMode &&
    !isCrystalDefenseMode &&
    !isWorldBossMode &&
    !isBloodMoonMode &&
    !isAbyssalMode &&
    !isGuildWarMode &&
    !isPantheonMode &&
    !isChampionshipMode &&
    !isCrystalVaultMode &&
    !isDragonLairMode &&
    !isSkyCitadelMode;

  const targetGoal = !isPause && save ? getNextTargetGoal(save) : null;
  const equippedWeapon =
    save && save.equipped[GearSlot.WEAPON]
      ? save.inventory.find((g) => g.uid === save.equipped[GearSlot.WEAPON])
      : undefined;
  const weaponUpgradeCost = equippedWeapon ? getUpgradeCost(equippedWeapon) : null;
  const canQuickUpgradeWeapon = Boolean(
    !isPause &&
      save &&
      equippedWeapon &&
      weaponUpgradeCost !== null &&
      save.gold >= weaponUpgradeCost &&
      onQuickUpgradeWeapon
  );
  const bestCampaignStage =
    prevBestStage !== undefined ? Math.max(prevBestStage, stageReached) : stageReached;
  const isNewStageRecord =
    !isPause && isCampaignRun && prevBestStage !== undefined && stageReached > prevBestStage;

  const totalDamage = damageBreakdown
    ? damageBreakdown.basic + damageBreakdown.ultimate + damageBreakdown.pet + damageBreakdown.elemental
    : 0;
  const dps =
    damageBreakdown && damageBreakdown.elapsedSeconds > 0
      ? Math.round(totalDamage / damageBreakdown.elapsedSeconds)
      : 0;

  const mvpReport = !isPause
    ? evaluateMatchMvpReport({
        isVictory,
        kills,
        maxCombo,
        damageBreakdown,
      })
    : null;

  const breakdownRows = damageBreakdown
    ? [
        {
          id: 'basic',
          label: 'Đòn Thường & Đa Tiễn',
          value: damageBreakdown.basic,
          barClass: 'from-sky-500 to-cyan-300',
          textClass: 'text-sky-300',
          strokeHex: '#38bdf8',
        },
        {
          id: 'ultimate',
          label: 'Chiêu Cuối Anh Hùng',
          value: damageBreakdown.ultimate,
          barClass: 'from-purple-500 to-fuchsia-300',
          textClass: 'text-purple-300',
          strokeHex: '#c084fc',
        },
        {
          id: 'pet',
          label: 'Tinh Linh / Thần Sủng 3D',
          value: damageBreakdown.pet,
          barClass: 'from-emerald-500 to-lime-300',
          textClass: 'text-emerald-300',
          strokeHex: '#34d399',
        },
        {
          id: 'elemental',
          label: 'Nguyên Tố & Thiên Thạch',
          value: damageBreakdown.elemental,
          barClass: 'from-amber-500 to-orange-300',
          textClass: 'text-amber-300',
          strokeHex: '#fbbf24',
        },
      ]
    : [];

  const hasExtraLoot =
    starDustEarned > 0 ||
    petEssenceEarned > 0 ||
    wingFeathersEarned > 0 ||
    mountShardsEarned > 0 ||
    awakeningCrystalsEarned > 0 ||
    artifactShardsEarned > 0 ||
    mysticTokensEarned > 0 ||
    guildCoinsEarned > 0 ||
    divineCrystalsEarned > 0 ||
    gloryTrophiesEarned > 0 ||
    spiritCoresEarned > 0 ||
    festivalLanternsEarned > 0 ||
    vaultReforgeLooted > 0 ||
    vaultShardsLooted > 0 ||
    dragonScalesLooted > 0 ||
    celestialFeathersEarned > 0 ||
    mythicShardsEarned > 0 ||
    warCrestsEarned > 0;

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-[#040611]/92 overflow-y-auto">
      <div
        className={`cel-panel-ornate w-full ${
          isPause ? 'max-w-md' : 'max-w-3xl'
        } rounded-3xl p-5 sm:p-7 text-left my-auto max-h-[92vh] overflow-y-auto a2-modal-enter`}
      >
        {/* Top Imperial Verdict Header */}
        <div
          className={`flex flex-col sm:flex-row ${
            isPause ? 'items-center text-center' : 'sm:items-center sm:justify-between'
          } gap-4 pb-4 border-b border-amber-400/20`}
        >
          <div className={`flex items-center gap-3.5 min-w-0 ${isPause ? 'flex-col' : ''}`}>
            {isVictory ? (
              <div className="relative p-3.5 rounded-2xl bg-gradient-to-b from-amber-400/25 to-amber-600/10 border border-amber-300/80 shadow-[0_0_24px_rgba(251,191,36,0.34)] shrink-0">
                <Trophy className="w-7 h-7 text-amber-300" />
              </div>
            ) : phase === GamePhase.GAME_OVER ? (
              <div className="relative p-3.5 rounded-2xl bg-gradient-to-b from-rose-500/22 to-rose-900/15 border border-rose-400/75 shadow-[0_0_22px_rgba(244,63,94,0.28)] shrink-0">
                <Skull className="w-7 h-7 text-rose-400" />
              </div>
            ) : null}

            <div className="min-w-0">
              <div className="text-[11px] font-extrabold uppercase tracking-[0.18em] text-amber-300/95 mb-0.5 truncate">
                {isSkyCitadelMode
                  ? `Không Chiến Tinh Giới 3D · Đợt ${skyCitadelWave}/3`
                  : isDragonLairMode
                  ? `Lãnh Địa Rồng Cổ 3D · Pha ${dragonPhase}/3`
                  : isCrystalVaultMode
                  ? `Hầm Mỏ Pha Lê Kho Báu 3D · Phá ${vaultPillarsBroken} Trụ`
                  : isChampionshipMode
                  ? `Giải Đấu Quán Quân 3D · Hiệp ${championshipRound}/3`
                  : isArenaMode
                  ? `Đấu Trường Arena 1v1 · ${arenaOpponentName || 'Kình Địch'}`
                  : isPantheonMode
                  ? `Viễn Chinh Điện Thần 3D · Tầng ${pantheonStage}/3`
                  : isGuildWarMode
                  ? `Chiến Trường Bang Hội 3D · Trụ ${guildWarNodes}/3`
                  : isAbyssalMode
                  ? `Hố Sâu Đột Biến 3D · Đợt ${abyssalWave}/10`
                  : isBloodMoonMode
                  ? `Đêm Trăng Máu Sinh Tồn · Đợt ${bloodMoonWave}`
                  : isCrystalDefenseMode
                  ? `Thủ Thành Pha Lê Tinh Linh · Đợt ${stageReached}/6`
                  : isWorldBossMode
                  ? `Boss Thế Giới Liên Server · Hạng #${worldBossLiveRank}`
                  : isCoopRaidMode
                  ? `Phó Bản Co-op 3D · ${COOP_DIFFICULTY_MAP[coopDifficulty]?.badge ?? 'TỔ ĐỘI'}`
                  : isElementalTowerMode
                  ? `Tháp Thí Luyện · ${ELEMENTAL_TOWER_MAP[elementalTowerId]?.name ?? 'Nguyên Tố'}`
                  : isGuildBossMode
                  ? 'Thánh Điện Boss Bang Hội · 60 Giây'
                  : isDailyRiftMode
                  ? 'Bí Cảnh Biến Hóa Hằng Ngày'
                  : isBossRushMode
                  ? 'Đấu Trường Săn Boss Liên Hoàn'
                  : isTowerMode
                  ? 'Tháp Vô Tận Hoàng Đạo'
                  : chapterName}
              </div>
              <h2 className="font-display text-2xl sm:text-[26px] font-black text-white leading-tight">
                {isPause
                  ? 'Tạm Dừng Trận Đấu'
                  : isSkyCitadelMode
                  ? isVictory
                    ? 'Chinh Phục Không Chiến Tinh Giới!'
                    : 'Tổng Kết Không Chiến Tinh Giới 3D!'
                  : isDragonLairMode
                  ? isVictory
                    ? 'Đồ Long Thành Công · Chinh Phục Cổ Long!'
                    : 'Tổng Kết Lãnh Địa Rồng Cổ 3D!'
                  : isCrystalVaultMode
                  ? 'Hoàn Tất Khai Phá Hầm Mỏ Pha Lê!'
                  : isChampionshipMode
                  ? isVictory
                    ? 'Đăng Quang Giải Đấu Quán Quân!'
                    : 'Dừng Bước Tại Giải Đấu Quán Quân'
                  : isArenaMode
                  ? isVictory
                    ? 'Chiến Thắng Đấu Trường!'
                    : 'Thất Bại Tại Đấu Trường'
                  : isPantheonMode
                  ? isVictory
                    ? 'Chinh Phục Viễn Chinh Điện Thần!'
                    : 'Dừng Bước Tại Điện Thần 3D'
                  : isGuildWarMode
                  ? 'Tổng Kết Chiến Trường Bang!'
                  : isAbyssalMode
                  ? isVictory
                    ? 'Chinh Phục Hố Sâu Đột Biến!'
                    : 'Dừng Bước Tại Hố Sâu Đột Biến'
                  : isBloodMoonMode
                  ? isVictory
                    ? 'Sống Sót Qua Đêm Trăng Máu!'
                    : 'Ngã Xuống Dưới Trăng Máu'
                  : isCrystalDefenseMode
                  ? isVictory
                    ? 'Bảo Vệ Thành Công Pha Lê!'
                    : 'Pha Lê Tinh Linh Vỡ Vụn'
                  : isWorldBossMode
                  ? 'Tổng Kết Boss Thế Giới!'
                  : isCoopRaidMode
                  ? isVictory
                    ? 'Chinh Phục Phó Bản Co-op!'
                    : 'Thất Bại Trong Phó Bản Co-op'
                  : isElementalTowerMode
                  ? 'Tổng Kết Tháp Nguyên Tố!'
                  : isGuildBossMode
                  ? 'Tổng Kết Sát Thương Bang Hội!'
                  : isVictory
                  ? isDailyRiftMode
                    ? 'Chinh Phục Bí Cảnh!'
                    : isBossRushMode
                    ? 'Chinh Phục Đấu Trường Boss!'
                    : 'Chinh Phục Tinh Giới!'
                  : isDailyRiftMode
                  ? 'Kết Thúc Bí Cảnh'
                  : isBossRushMode
                  ? 'Kết Thúc Săn Boss'
                  : isTowerMode
                  ? 'Kết Thúc Leo Tháp'
                  : 'Thất Bại Trong Thánh Điện'}
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
                {isPause
                  ? 'Nghỉ ngơi đôi chút hoặc tùy chỉnh âm thanh & đồ họa 3D.'
                  : isSkyCitadelMode
                  ? `Bạn vượt qua Đợt ${skyCitadelWave}/3 Không Chiến Tinh Giới với ${skyCitadelScore.toLocaleString('vi-VN')} điểm! Lông Vũ Thần Quang & Mảnh Thần Thoại đã chuyển vào Kho.`
                  : isDragonLairMode
                  ? `Bạn gây ${dragonDamageDealt.toLocaleString('vi-VN')} sát thương lên Cổ Long Tinh Giới (Pha ${dragonPhase}/3) và thu thập ${dragonScalesLooted} Vảy Rồng Cổ!`
                  : isCrystalVaultMode
                  ? `Bạn đã phá vỡ ${vaultPillarsBroken} Trụ Pha Lê Kho Báu! Ngọc Hồn, Đá Đúc Hoàng Kim, Mảnh Thần Binh & Huy Hiệu Chiến Trận đã chuyển vào Kho.`
                  : isChampionshipMode
                  ? isVictory
                    ? `Bạn toàn thắng cả 3 Hiệp Quán Quân với ${championshipScore.toLocaleString('vi-VN')} điểm! Cúp Vinh Quang, Lõi Thần Sủng & Đèn Lồng đã chuyển vào Kho.`
                    : `Bạn đã vượt qua ${championshipRound}/3 Hiệp với ${championshipScore.toLocaleString('vi-VN')} điểm. Cúp & Lõi Thần Sủng tích lũy đã được bảo toàn!`
                  : isArenaMode
                  ? isVictory
                    ? `Bạn đã đánh bại ${arenaOpponentName || 'đối thủ'} và nhận ${arenaRatingDelta >= 0 ? `+${arenaRatingDelta}` : arenaRatingDelta} Điểm Xếp Hạng Arena!`
                    : `Đối thủ ${arenaOpponentName || 'đối thủ'} đã thắng thế (${arenaRatingDelta} Điểm Arena). Hãy nâng cấp Bảo Thạch và tái đấu!`
                  : isPantheonMode
                  ? `Bạn chinh phục Tầng ${pantheonStage}/3 với ${pantheonScore.toLocaleString('vi-VN')} Điểm Điện Thần! Thần Tinh & Ấn Thần Bí đã chuyển vào Kho.`
                  : isGuildWarMode
                  ? `Bạn đã chiếm ${guildWarNodes}/3 Trụ Tinh Thể và ghi ${guildWarScore.toLocaleString('vi-VN')} Điểm Bang Hội! Điểm Tuần & Xu Bang đã được cộng.`
                  : isAbyssalMode
                  ? `Bạn vượt qua ${abyssalWave}/10 đợt quái đột biến với ${abyssalScore.toLocaleString('vi-VN')} điểm! Mảnh Thánh Khí & Ấn Thần Bí đã lưu vào Kho.`
                  : isBloodMoonMode
                  ? `Bạn đã tích lũy ${bloodMoonScore.toLocaleString('vi-VN')} Huyết Tinh qua ${bloodMoonWave} đợt Trăng Máu! Mảnh Thú Cưỡi & Tinh Thể đã chuyển vào Kho.`
                  : isCrystalDefenseMode
                  ? isVictory
                    ? `Pha Lê Tinh Linh còn ${crystalHpPct}% Sinh Lực sau 6 đợt công thành! Lông Vũ Tinh Tú đã chuyển vào Kho Cánh.`
                    : `Bạn đã bảo vệ Pha Lê qua ${crystalWavesCleared} đợt công thành. Lông Vũ thu thập được đã được bảo toàn.`
                  : isWorldBossMode
                  ? `Bạn gây ${worldBossDamage.toLocaleString('vi-VN')} sát thương lên Hắc Long Liên Server và đạt Hạng #${worldBossLiveRank}! Hãy vào Bảng Vinh Danh để nhận mốc thưởng.`
                  : isCoopRaidMode
                  ? isVictory
                    ? 'Tổ đội 3 Anh Hùng đã tiêu diệt Chúa Tể Phó Bản! Chiến lợi phẩm & Bảo Thạch đã chuyển vào Kho Đồ.'
                    : 'Tổ đội đã rút lui khỏi Phó Bản Co-op. Toàn bộ Vàng & Bụi Tinh Tú thu thập được đã lưu lại.'
                  : isElementalTowerMode
                  ? `Kỷ lục tầng ${ELEMENTAL_TOWER_MAP[elementalTowerId]?.name ?? 'Tháp Hệ'} cùng Bụi Tinh Tú và Tinh Chất đã lưu vào Kho Báu.`
                  : isGuildBossMode
                  ? `Bạn đã gây ${guildBossDamage.toLocaleString('vi-VN')} sát thương lên Thái Cổ Ma Long · Kỷ lục & Xu Bang đã được cập nhật!`
                  : isVictory
                  ? isDailyRiftMode
                    ? 'Toàn bộ Bụi Tinh Tú và Tinh Chất Tinh Linh đã được chuyển vào Kho Báu!'
                    : isBossRushMode
                    ? 'Toàn bộ 5 vòng Thủ Lĩnh Hoàng Đạo đã bị đánh bại! Ngọc Hồn đã chuyển vào Kho Báu.'
                    : 'Bạn đã đánh bại Thủ Lĩnh Hoàng Đạo và mở khóa chương tiếp theo!'
                  : isDailyRiftMode
                  ? 'Nguyên liệu rèn đồ thu được dọc đường đã được bảo toàn trong Kho Báu.'
                  : isBossRushMode
                  ? 'Ngọc Hồn và Vàng thu được từ các vòng Boss đã được lưu vào Kho Báu.'
                  : isTowerMode
                  ? 'Kỷ lục tầng tháp mới cùng Vàng và Ngọc Hồn đã được lưu vào Kho Báu.'
                  : 'Số Vàng và Ngọc Hồn thu thập được đã được lưu vào Kho Báu.'}
              </p>
            </div>
          </div>

          {/* Sculpted Imperial MVP Grade Medallion */}
          {mvpReport && (
            <div className="flex items-center gap-3 sm:pl-4 sm:border-l sm:border-amber-400/20 shrink-0">
              <div
                className={`flex h-13 w-13 shrink-0 items-center justify-center rounded-2xl border-2 font-display text-xl font-black ${
                  mvpReport.grade === 'SSS' || mvpReport.grade === 'SS'
                    ? 'border-amber-300 bg-amber-400/20 text-amber-200 shadow-[0_0_20px_rgba(251,191,36,0.42)]'
                    : mvpReport.grade === 'S'
                    ? 'border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-200'
                    : 'border-sky-400 bg-sky-500/20 text-sky-200'
                }`}
              >
                {mvpReport.grade}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.16em] text-amber-300">
                  Hạng Chiến Công
                </div>
                <div className="font-display text-sm font-black text-white truncate max-w-[155px]">
                  {mvpReport.mvpBadgeTitle}
                </div>
                <div className="font-mono-nums text-[11px] font-bold text-sky-300">
                  {dps.toLocaleString('vi-VN')} DPS
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Unboxed Key Combat Telemetry Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 py-3.5 border-b border-amber-400/15">
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              {isSkyCitadelMode
                ? 'Điểm Không Chiến'
                : isDragonLairMode
                ? 'Sát Thương Cổ Long'
                : isCrystalVaultMode
                ? 'Trụ Pha Lê Phá'
                : isChampionshipMode
                ? 'Hiệp Quán Quân'
                : isArenaMode
                ? 'Điểm Xếp Hạng'
                : isPantheonMode
                ? 'Tầng Điện Thần'
                : isGuildWarMode
                ? 'Điểm Chiến Trường'
                : isAbyssalMode
                ? 'Đợt Hố Sâu'
                : isBloodMoonMode
                ? 'Huyết Tinh'
                : isCrystalDefenseMode
                ? 'Đợt Thủ Thành'
                : isWorldBossMode
                ? 'Sát Thương Boss'
                : isCoopRaidMode
                ? 'Ải Phó Bản'
                : isElementalTowerMode
                ? 'Tầng Tháp Hệ'
                : isGuildBossMode
                ? 'Sát Thương Boss'
                : isDailyRiftMode
                ? 'Ải Bí Cảnh'
                : isBossRushMode
                ? 'Vòng Boss'
                : isTowerMode
                ? 'Tầng Tháp'
                : 'Phòng Đạt'}
            </div>
            <div
              className={`font-mono-nums text-sm sm:text-base font-black mt-0.5 ${
                isArenaMode
                  ? arenaRatingDelta >= 0
                    ? 'text-emerald-300'
                    : 'text-rose-400'
                  : 'text-white'
              }`}
            >
              {isSkyCitadelMode
                ? `${skyCitadelScore.toLocaleString('vi-VN')} đ (${skyCitadelWave}/3)`
                : isDragonLairMode
                ? `${dragonDamageDealt.toLocaleString('vi-VN')} ST`
                : isCrystalVaultMode
                ? `${vaultPillarsBroken} Trụ`
                : isChampionshipMode
                ? `Hiệp ${championshipRound}/3`
                : isArenaMode
                ? `${arenaRatingDelta >= 0 ? `+${arenaRatingDelta}` : arenaRatingDelta} Điểm`
                : isPantheonMode
                ? `Tầng ${pantheonStage}/3`
                : isGuildWarMode
                ? `${guildWarScore.toLocaleString('vi-VN')}`
                : isAbyssalMode
                ? `${abyssalWave}/10`
                : isBloodMoonMode
                ? bloodMoonScore.toLocaleString('vi-VN')
                : isCrystalDefenseMode
                ? `${crystalWavesCleared}/6 (${crystalHpPct}%)`
                : isWorldBossMode
                ? worldBossDamage.toLocaleString('vi-VN')
                : isCoopRaidMode
                ? `${stageReached}/${totalStages}`
                : isElementalTowerMode
                ? `Tầng ${elementalTowerFloor}`
                : isGuildBossMode
                ? guildBossDamage.toLocaleString('vi-VN')
                : isDailyRiftMode
                ? `${stageReached} / 3`
                : isBossRushMode
                ? `Vòng ${bossRushRound}/5`
                : isTowerMode
                ? `Tầng ${towerFloor}`
                : `${stageReached}/${totalStages}`}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Quái Đã Hạ</div>
            <div className="font-mono-nums text-sm sm:text-base font-black text-sky-300 mt-0.5">
              {kills.toLocaleString('vi-VN')}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Vàng Thu</div>
            <div className="font-mono-nums text-sm sm:text-base font-black text-amber-300 flex items-center gap-1.5 mt-0.5">
              <GoldCoinIcon className="w-4 h-4 shrink-0" />
              <span>+{goldEarned.toLocaleString('vi-VN')}</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Ngọc Hồn</div>
            <div className="font-mono-nums text-sm sm:text-base font-black text-purple-300 flex items-center gap-1.5 mt-0.5">
              <SoulGemIcon className="w-4 h-4 shrink-0" />
              <span>+{gemsEarned.toLocaleString('vi-VN')}</span>
            </div>
          </div>
        </div>

        {/* Main 2-Column Imperial Debrief Body (Post-Battle only) */}
        {!isPause && (
          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 py-4">
            {/* Left Column: Combat Analytics (Donut DPS + Breakdown + Defeat Diagnosis) */}
            <div className="md:col-span-7 space-y-4">
              {damageBreakdown && totalDamage > 0 && (() => {
                const radius = 38;
                const circumference = 2 * Math.PI * radius;
                let accOffset = 0;
                const donutSegments = breakdownRows.map((row) => {
                  const frac = row.value / Math.max(1, totalDamage);
                  const segLen = frac * circumference;
                  const offset = accOffset;
                  accOffset += segLen;
                  return { ...row, segLen, offset };
                });

                return (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-black text-amber-200 uppercase tracking-wider">
                        <BarChart3 className="w-3.5 h-3.5 text-sky-300" />
                        <span>Phân Tích Sát Thương</span>
                      </span>
                      <span className="font-mono-nums text-xs font-bold text-slate-300">
                        Tổng {totalDamage.toLocaleString('vi-VN')}
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-4">
                      {/* Enlarged High-Clarity SVG Donut */}
                      <div className="relative h-28 w-28 shrink-0">
                        <svg viewBox="0 0 96 96" className="h-full w-full -rotate-90">
                          <circle
                            cx="48"
                            cy="48"
                            r={radius}
                            fill="none"
                            stroke="#1e293b"
                            strokeWidth="10"
                          />
                          {donutSegments.map(
                            (seg) =>
                              seg.segLen > 0.5 && (
                                <circle
                                  key={seg.id}
                                  cx="48"
                                  cy="48"
                                  r={radius}
                                  fill="none"
                                  stroke={seg.strokeHex}
                                  strokeWidth="10"
                                  strokeDasharray={`${seg.segLen} ${circumference}`}
                                  strokeDashoffset={-seg.offset}
                                />
                              )
                          )}
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                            DPS TB
                          </span>
                          <span className="font-mono-nums text-sm font-black text-amber-200">
                            {dps >= 1000 ? `${(dps / 1000).toFixed(1)}k` : dps}
                          </span>
                        </div>
                      </div>

                      {/* Horizontal Segmented Bars */}
                      <div className="flex-1 w-full space-y-2.5">
                        {breakdownRows.map((row) => {
                          const pct = totalDamage > 0 ? Math.round((row.value / totalDamage) * 100) : 0;
                          return (
                            <div key={row.id}>
                              <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                                <span className="flex items-center gap-1.5 text-slate-200 truncate">
                                  <span
                                    className="h-2 w-2 rounded-sm shrink-0"
                                    style={{ backgroundColor: row.strokeHex }}
                                  />
                                  <span className="truncate">{row.label}</span>
                                </span>
                                <span className={`font-mono-nums shrink-0 ${row.textClass}`}>
                                  {row.value.toLocaleString('vi-VN')} · {pct}%
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                                <div
                                  className={`h-full rounded-full bg-gradient-to-r ${row.barClass}`}
                                  style={{ width: `${Math.max(row.value > 0 ? 3 : 0, pct)}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Efficiency Metrics Row */}
                    <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-left">
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">Chí Mạng Đỉnh</div>
                        <div className="font-mono-nums text-xs font-black text-amber-300 mt-0.5">
                          {damageBreakdown.peakCrit.toLocaleString('vi-VN')}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">Liên Kích Tối Đa</div>
                        <div className="font-mono-nums text-xs font-black text-rose-300 mt-0.5">
                          ×{maxCombo}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 font-bold">Thời Gian Trận</div>
                        <div className="font-mono-nums text-xs font-black text-sky-300 mt-0.5">
                          {Math.max(1, Math.round(damageBreakdown.elapsedSeconds))}s
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Co-op Raid Team Damage & MVP Crown */}
              {isCoopRaidMode && damageBreakdown?.coopAllies && damageBreakdown.coopAllies.length > 0 && (() => {
                const teamMembers = [
                  {
                    key: 'player',
                    name: 'Bạn (Đội Trưởng)',
                    damage: totalDamage,
                    isPlayer: true,
                    isMvp: !damageBreakdown.coopAllies!.some((a) => a.isMvp),
                  },
                  ...damageBreakdown.coopAllies!.map((a, idx) => ({
                    key: `${a.heroId}_${idx}`,
                    name: `${a.name} (AI)`,
                    damage: a.damage,
                    isPlayer: false,
                    isMvp: Boolean(a.isMvp),
                  })),
                ].sort((a, b) => b.damage - a.damage);
                const teamTotal = Math.max(1, teamMembers.reduce((s, m) => s + m.damage, 0));

                return (
                  <div className="pt-3 border-t border-amber-400/20 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-black text-amber-300 uppercase tracking-wider">
                        <Users className="w-3.5 h-3.5" />
                        <span>Tổ Đội Co-op &amp; MVP</span>
                      </span>
                      <span className="font-mono-nums text-[11px] font-bold text-slate-300">
                        Tổng {teamTotal.toLocaleString('vi-VN')}
                      </span>
                    </div>
                    <div className="space-y-2">
                      {teamMembers.map((m) => {
                        const pct = Math.round((m.damage / teamTotal) * 100);
                        return (
                          <div key={m.key} className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-[11px] font-bold">
                              <span className="flex items-center gap-1.5 text-white truncate">
                                {m.isMvp && <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
                                <span className="truncate">{m.name}</span>
                                {m.isMvp && (
                                  <span className="text-[10px] font-black text-amber-300 uppercase">
                                    · MVP
                                  </span>
                                )}
                              </span>
                              <span className="font-mono-nums text-amber-200 shrink-0">
                                {m.damage.toLocaleString('vi-VN')} ({pct}%)
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  m.isMvp
                                    ? 'bg-gradient-to-r from-amber-400 to-yellow-200'
                                    : m.isPlayer
                                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-300'
                                    : 'bg-gradient-to-r from-sky-500 to-indigo-400'
                                }`}
                                style={{ width: `${Math.max(4, pct)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Defeat Cause Diagnostic */}
              {!isVictory && defeatCause && (
                <div className="pt-3 border-t border-rose-400/25">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-300">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      Nguyên nhân thất bại: {defeatCause.label}
                      {defeatCause.killerName ? ` · ${defeatCause.killerName}` : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">{defeatCause.tip}</p>
                </div>
              )}
            </div>

            {/* Right Column: War Spoils Ledger & Progression Targets */}
            <div className="md:col-span-5 md:pl-5 md:border-l md:border-amber-400/15 space-y-4">
              {/* War Spoils & Mastery Ledger */}
              <div className="space-y-2">
                <div className="text-xs font-black text-amber-200 uppercase tracking-wider">
                  Chiến Lợi Phẩm &amp; Tiến Trình
                </div>

                <div className="divide-y divide-slate-800/80 text-xs">
                  {masteryExpGained > 0 && (
                    <div className="py-2 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 font-bold text-amber-200">
                        <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>Tinh Thông Anh Hùng</span>
                      </span>
                      <span className="font-mono-nums font-black text-emerald-300 shrink-0">
                        +{masteryExpGained} EXP{masteryLeveledUpTo ? ` · Lv.${masteryLeveledUpTo}` : ''}
                      </span>
                    </div>
                  )}
                  {seasonXpEarned > 0 && (
                    <div className="py-2 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-amber-200 font-bold">
                        <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>Battle Pass Mùa 1</span>
                      </span>
                      <span className="font-mono-nums font-black text-emerald-300 shrink-0">
                        +{seasonXpEarned} XP
                      </span>
                    </div>
                  )}
                  {celestialFeathersEarned > 0 && (
                    <div className="py-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sky-200 font-bold">
                        <WingFeatherIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Lông Vũ Thần Quang</span>
                      </span>
                      <span className="font-mono-nums font-black text-sky-300">+{celestialFeathersEarned}</span>
                    </div>
                  )}
                  {mythicShardsEarned > 0 && (
                    <div className="py-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-fuchsia-200 font-bold">
                        <Sparkles className="w-3.5 h-3.5 text-fuchsia-300 shrink-0" />
                        <span>Mảnh Thần Thoại</span>
                      </span>
                      <span className="font-mono-nums font-black text-fuchsia-300">+{mythicShardsEarned}</span>
                    </div>
                  )}
                  {dragonScalesLooted > 0 && (
                    <div className="py-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-rose-200 font-bold">
                        <Sparkles className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>Vảy Rồng Cổ</span>
                      </span>
                      <span className="font-mono-nums font-black text-rose-300">+{dragonScalesLooted}</span>
                    </div>
                  )}
                  {vaultReforgeLooted > 0 && (
                    <div className="py-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-orange-200 font-bold">
                        <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span>Đá Đúc Hoàng Kim</span>
                      </span>
                      <span className="font-mono-nums font-black text-orange-300">+{vaultReforgeLooted}</span>
                    </div>
                  )}
                  {vaultShardsLooted > 0 && (
                    <div className="py-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-amber-200 font-bold">
                        <Swords className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>Mảnh Thần Binh</span>
                      </span>
                      <span className="font-mono-nums font-black text-yellow-300">+{vaultShardsLooted}</span>
                    </div>
                  )}
                  {warCrestsEarned > 0 && (
                    <div className="py-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-rose-200 font-bold">
                        <Flag className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                        <span>Huy Hiệu Chiến Trận</span>
                      </span>
                      <span className="font-mono-nums font-black text-rose-300">+{warCrestsEarned}</span>
                    </div>
                  )}
                  {gloryTrophiesEarned > 0 && (
                    <div className="py-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-amber-200 font-bold">
                        <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>Cúp Vinh Quang</span>
                      </span>
                      <span className="font-mono-nums font-black text-amber-300">+{gloryTrophiesEarned}</span>
                    </div>
                  )}
                  {spiritCoresEarned > 0 && (
                    <div className="py-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-fuchsia-200 font-bold">
                        <Sparkles className="w-3.5 h-3.5 text-fuchsia-300 shrink-0" />
                        <span>Lõi Thần Sủng</span>
                      </span>
                      <span className="font-mono-nums font-black text-fuchsia-300">+{spiritCoresEarned}</span>
                    </div>
                  )}
                  {festivalLanternsEarned > 0 && (
                    <div className="py-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-rose-200 font-bold">
                        <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>Đèn Lồng Lễ Hội</span>
                      </span>
                      <span className="font-mono-nums font-black text-amber-300">+{festivalLanternsEarned}</span>
                    </div>
                  )}
                  {divineCrystalsEarned > 0 && (
                    <div className="py-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-amber-200 font-bold">
                        <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>Thần Tinh</span>
                      </span>
                      <span className="font-mono-nums font-black text-amber-300">+{divineCrystalsEarned}</span>
                    </div>
                  )}
                  {starDustEarned > 0 && (
                    <div className="py-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sky-200 font-bold">
                        <StarDustIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Bụi Tinh Tú</span>
                      </span>
                      <span className="font-mono-nums font-black text-sky-300">+{starDustEarned}</span>
                    </div>
                  )}
                  {petEssenceEarned > 0 && (
                    <div className="py-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-emerald-200 font-bold">
                        <PetEssenceIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Tinh Chất</span>
                      </span>
                      <span className="font-mono-nums font-black text-emerald-300">+{petEssenceEarned}</span>
                    </div>
                  )}
                  {mountShardsEarned > 0 && (
                    <div className="py-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-amber-200 font-bold">
                        <MountShardIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Mảnh Thú Cưỡi</span>
                      </span>
                      <span className="font-mono-nums font-black text-amber-300">+{mountShardsEarned}</span>
                    </div>
                  )}
                  {awakeningCrystalsEarned > 0 && (
                    <div className="py-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-rose-200 font-bold">
                        <AwakenCrystalIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Tinh Thể Thức Tỉnh</span>
                      </span>
                      <span className="font-mono-nums font-black text-rose-300">+{awakeningCrystalsEarned}</span>
                    </div>
                  )}
                  {artifactShardsEarned > 0 && (
                    <div className="py-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-amber-200 font-bold">
                        <ArtifactRelicIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Mảnh Thánh Khí</span>
                      </span>
                      <span className="font-mono-nums font-black text-amber-300">+{artifactShardsEarned}</span>
                    </div>
                  )}
                  {mysticTokensEarned > 0 && (
                    <div className="py-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-cyan-200 font-bold">
                        <MysticTokenIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Ấn Thần Bí</span>
                      </span>
                      <span className="font-mono-nums font-black text-cyan-300">+{mysticTokensEarned}</span>
                    </div>
                  )}
                  {guildCoinsEarned > 0 && (
                    <div className="py-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-amber-200 font-bold">
                        <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                        <span>Xu Bang Hội</span>
                      </span>
                      <span className="font-mono-nums font-black text-amber-300">+{guildCoinsEarned}</span>
                    </div>
                  )}
                  {wingFeathersEarned > 0 && (
                    <div className="py-2 flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sky-200 font-bold">
                        <WingFeatherIcon className="w-3.5 h-3.5 shrink-0" />
                        <span>Lông Vũ Tinh Tú</span>
                      </span>
                      <span className="font-mono-nums font-black text-amber-300">+{wingFeathersEarned}</span>
                    </div>
                  )}
                  {!hasExtraLoot && masteryExpGained <= 0 && seasonXpEarned <= 0 && (
                    <div className="py-2 text-slate-400">
                      Toàn bộ Vàng và Ngọc Hồn đã được chuyển vào Kho Báu.
                    </div>
                  )}
                </div>
              </div>

              {/* Next Target Gear Progress (Campaign only) */}
              {isCampaignRun && targetGoal && (
                <div className="pt-3 border-t border-amber-400/20 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                    <span className="font-bold text-amber-200">{targetGoal.title}</span>
                    <span className="font-mono-nums text-[11px] text-slate-300">
                      Kỷ lục {bestCampaignStage}/{totalStages}
                      {isNewStageRecord ? ' · Mới' : ''}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-400 to-emerald-400"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(4, Math.round((targetGoal.current / Math.max(1, targetGoal.target)) * 100))
                        )}%`,
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-300">
                    <span className="truncate">{targetGoal.dropSourceText}</span>
                    <span className="font-mono-nums font-bold text-amber-300 shrink-0">
                      {targetGoal.current}/{targetGoal.target}
                    </span>
                  </div>
                  {milestoneNotes && milestoneNotes.length > 0 && (
                    <div className="text-[11px] text-emerald-300 font-semibold">
                      Mốc vừa đạt: {milestoneNotes.join(' · ')}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Footer */}
        <div
          className={`pt-4 border-t border-amber-400/15 ${
            isPause ? 'flex flex-col gap-2.5' : 'grid grid-cols-1 sm:grid-cols-2 gap-2.5'
          }`}
        >
          {isPause && onResume && (
            <button
              type="button"
              onClick={onResume}
              className="a2-yellow-btn w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-sm whitespace-nowrap cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>Tiếp Tục Chiến Đấu</span>
              <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 rounded bg-amber-950/35 border border-amber-950/30 font-mono-nums text-[10px] font-black text-amber-950">
                P / ESC
              </kbd>
            </button>
          )}

          {isPause && onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              className="a2-slate-btn w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-black text-sm whitespace-nowrap cursor-pointer"
            >
              <Settings className="w-4 h-4 text-amber-300" />
              <span>Cài Đặt Đồ Họa &amp; Âm Thanh</span>
            </button>
          )}

          <button
            type="button"
            data-start={!isPause ? 'true' : undefined}
            onClick={onRetry}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-sm whitespace-nowrap cursor-pointer ${
              isPause ? 'a2-emerald-btn' : 'a2-yellow-btn'
            }`}
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>{isPause ? 'Đánh Lại Từ Đầu' : isVictory ? 'Chơi Lại' : 'Thử Lại Ngay'}</span>
          </button>

          <button
            type="button"
            onClick={onReturnTitle}
            className="a2-slate-btn w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-sm whitespace-nowrap cursor-pointer"
          >
            <Home className="w-4 h-4 shrink-0" />
            <span>Về Thánh Điện Chính</span>
          </button>

          {canQuickUpgradeWeapon && equippedWeapon && weaponUpgradeCost !== null && (
            <button
              type="button"
              onClick={onQuickUpgradeWeapon}
              className="a2-emerald-btn sm:col-span-2 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm whitespace-nowrap cursor-pointer"
            >
              <Hammer className="w-4 h-4 shrink-0" />
              <span className="font-mono-nums">
                Cường Hóa {GEAR_TEMPLATES[equippedWeapon.templateId]?.name ?? 'Vũ Khí'} Lv.{equippedWeapon.level + 1} ({weaponUpgradeCost.toLocaleString('vi-VN')} Vàng)
              </span>
            </button>
          )}

          {!isPause && onQuickAction && (
            <button
              type="button"
              onClick={() =>
                onQuickAction(
                  isVictory
                    ? festivalLanternsEarned > 0
                      ? 'festival'
                      : 'gear'
                    : 'gear'
                )
              }
              className="a2-slate-btn sm:col-span-2 w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap cursor-pointer"
            >
              <ArrowUpRight className="w-4 h-4 text-amber-300 shrink-0" />
              <span>
                {isVictory
                  ? festivalLanternsEarned > 0
                    ? 'Đổi Đèn Lồng Tại Lễ Hội Tinh Giới'
                    : 'Mở Kho Trang Bị & Rèn Mục Tiêu'
                  : 'Mở Kho Trang Bị & Nâng Cấp'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


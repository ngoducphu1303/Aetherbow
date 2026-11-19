import React from 'react';
import { AlertTriangle, ArrowUpRight, BarChart3, Crown, Hammer, Home, Play, RotateCcw, Settings, Skull, Sparkles, Trophy, Users } from 'lucide-react';
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

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-[#040611]/90 overflow-y-auto">
      <div className="cel-panel-ornate w-full max-w-lg rounded-3xl p-5 sm:p-6 text-center my-auto max-h-[92vh] overflow-y-auto a2-modal-enter">
        <div className="flex justify-center mb-2.5">
          {isVictory ? (
            <div className="p-3 rounded-2xl bg-amber-400/15 border border-amber-300/70 shadow-lg">
              <Trophy className="w-7 h-7 text-amber-300" />
            </div>
          ) : phase === GamePhase.GAME_OVER ? (
            <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-400/65 shadow-lg">
              <Skull className="w-7 h-7 text-rose-400" />
            </div>
          ) : null}
        </div>

        <div className="text-xs font-extrabold uppercase tracking-widest text-amber-300 mb-1">
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
        <h2 className="font-display text-2xl font-black text-white mb-1.5">
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
        <p className="text-xs text-slate-300 mb-3">
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

        {/* Defeat Cause Diagnostic (Game Over only) */}
        {!isPause && !isVictory && defeatCause && (
          <div className="mb-3.5 rounded-2xl border border-rose-400/35 bg-[#120916]/90 px-4 py-3 text-left">
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

        {/* Campaign Record & Next Target Gear Progress */}
        {!isPause && isCampaignRun && targetGoal && (
          <div className="mb-3.5 rounded-2xl border border-amber-400/30 bg-[#080d20]/95 px-4 py-3 text-left space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="font-bold text-amber-200">{targetGoal.title}</span>
              <span className="font-mono-nums text-slate-300">
                Ải {stageReached}/{totalStages} · Kỷ lục {bestCampaignStage}/{totalStages}
                {isNewStageRecord ? ' (Kỷ lục mới)' : ''}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
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
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-300">
              <span>{targetGoal.dropSourceText}</span>
              <span className="font-mono-nums font-bold text-amber-300 shrink-0">
                {targetGoal.current}/{targetGoal.target}
                {targetGoal.canCraftNow ? ' · Sẵn sàng rèn tại Sảnh' : !targetGoal.unlocked ? ` · ${targetGoal.unlockRequirement}` : ''}
              </span>
            </div>
            {milestoneNotes && milestoneNotes.length > 0 && (
              <div className="pt-2 border-t border-amber-400/15 text-[11px] text-emerald-300 font-semibold">
                Mốc vừa đạt: {milestoneNotes.join(' · ')}
              </div>
            )}
          </div>
        )}

        {/* Phase 4: Hero Mastery EXP Gain Strip */}
        {!isPause && masteryExpGained > 0 && (
          <div className="mb-3.5 rounded-2xl border border-amber-400/25 bg-[#0a1024]/95 px-4 py-2 text-left flex flex-wrap items-center justify-between gap-2 text-xs font-mono-nums">
            <span className="inline-flex items-center gap-1.5 font-bold text-amber-200">
              <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Tinh Thông Anh Hùng: +{masteryExpGained} EXP</span>
            </span>
            {masteryLeveledUpTo ? (
              <span className="font-black text-emerald-300">
                Lên Cấp Lv.{masteryLeveledUpTo}!
              </span>
            ) : (
              <span className="text-[11px] text-slate-400">Tự động cộng vào Anh Hùng đang ra trận</span>
            )}
          </div>
        )}

        {/* Wave 11: Match MVP Grade & Title Plaque */}
        {mvpReport && (
          <div className="mb-3.5 flex items-center justify-between gap-3 rounded-2xl border border-amber-400/45 bg-gradient-to-r from-[#1c1336] via-[#121936] to-[#1d1424] px-4 py-2.5 text-left">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 font-display text-lg font-black ${
                  mvpReport.grade === 'SSS' || mvpReport.grade === 'SS'
                    ? 'border-amber-300 bg-amber-400/20 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.45)]'
                    : mvpReport.grade === 'S'
                    ? 'border-fuchsia-400 bg-fuchsia-500/20 text-fuchsia-200'
                    : 'border-sky-400 bg-sky-500/20 text-sky-200'
                }`}
              >
                {mvpReport.grade}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                  Xếp Hạng Chiến Đấu · MVP
                </div>
                <div className="font-display text-sm font-black text-white truncate">
                  {mvpReport.mvpBadgeTitle}
                </div>
              </div>
            </div>
            <div className="text-right font-mono-nums shrink-0">
              <div className="text-[10px] font-bold text-slate-400">DPS Trung Bình</div>
              <div className="text-sm font-black text-sky-300">
                {dps.toLocaleString('vi-VN')}/s
              </div>
            </div>
          </div>
        )}

        {/* Run Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4 text-left bg-[#060916]/95 border border-amber-400/30 rounded-2xl p-3.5">
          <div>
            <div className="text-[10px] text-slate-400 font-bold">
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
              className={`font-mono-nums text-xs sm:text-sm font-black mt-0.5 ${
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
                ? `Hiệp ${championshipRound}/3 (${championshipScore.toLocaleString('vi-VN')}đ)`
                : isArenaMode
                ? `${arenaRatingDelta >= 0 ? `+${arenaRatingDelta}` : arenaRatingDelta} Điểm`
                : isPantheonMode
                ? `Tầng ${pantheonStage}/3 (${pantheonScore.toLocaleString('vi-VN')}đ)`
                : isGuildWarMode
                ? `${guildWarScore.toLocaleString('vi-VN')} (${guildWarNodes}/3 Trụ)`
                : isAbyssalMode
                ? `${abyssalWave}/10 (${abyssalScore.toLocaleString('vi-VN')}đ)`
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
            <div className="text-[10px] text-slate-400 font-bold">Quái Đã Hạ</div>
            <div className="font-mono-nums text-xs sm:text-sm font-black text-sky-300 mt-0.5">
              {kills}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold">Vàng Thu</div>
            <div className="font-mono-nums text-xs sm:text-sm font-black text-amber-300 flex items-center gap-1 mt-0.5">
              <GoldCoinIcon className="w-3.5 h-3.5 shrink-0" />
              <span>+{goldEarned}</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-bold">Ngọc Hồn</div>
            <div className="font-mono-nums text-xs sm:text-sm font-black text-purple-300 flex items-center gap-1 mt-0.5">
              <SoulGemIcon className="w-3.5 h-3.5 shrink-0" />
              <span>+{gemsEarned}</span>
            </div>
          </div>

          {(starDustEarned > 0 ||
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
            warCrestsEarned > 0) && (
            <>
              {celestialFeathersEarned > 0 && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-amber-400/15 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-sky-200 font-bold">
                    <WingFeatherIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Lông Vũ Thần Quang</span>
                  </span>
                  <span className="font-mono-nums font-black text-sky-300">
                    +{celestialFeathersEarned}
                  </span>
                </div>
              )}
              {mythicShardsEarned > 0 && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-amber-400/15 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-fuchsia-200 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-fuchsia-300 shrink-0" />
                    <span>Mảnh Thần Thoại</span>
                  </span>
                  <span className="font-mono-nums font-black text-fuchsia-300">
                    +{mythicShardsEarned}
                  </span>
                </div>
              )}
              {dragonScalesLooted > 0 && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-amber-400/15 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-rose-200 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <span>Vảy Rồng Cổ</span>
                  </span>
                  <span className="font-mono-nums font-black text-rose-300">
                    +{dragonScalesLooted}
                  </span>
                </div>
              )}
              {vaultReforgeLooted > 0 && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-amber-400/15 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-orange-200 font-bold">
                    <span>🔥</span>
                    <span>Đá Đúc Hoàng Kim</span>
                  </span>
                  <span className="font-mono-nums font-black text-orange-300">
                    +{vaultReforgeLooted}
                  </span>
                </div>
              )}
              {vaultShardsLooted > 0 && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-amber-400/15 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-amber-200 font-bold">
                    <span>⚔</span>
                    <span>Mảnh Thần Binh</span>
                  </span>
                  <span className="font-mono-nums font-black text-yellow-300">
                    +{vaultShardsLooted}
                  </span>
                </div>
              )}
              {warCrestsEarned > 0 && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-amber-400/15 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-rose-200 font-bold">
                    <span>⚑</span>
                    <span>Huy Hiệu Chiến Trận</span>
                  </span>
                  <span className="font-mono-nums font-black text-rose-300">
                    +{warCrestsEarned}
                  </span>
                </div>
              )}
              {gloryTrophiesEarned > 0 && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-amber-400/15 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-amber-200 font-bold">
                    <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>Cúp Vinh Quang</span>
                  </span>
                  <span className="font-mono-nums font-black text-amber-300">
                    +{gloryTrophiesEarned}
                  </span>
                </div>
              )}
              {spiritCoresEarned > 0 && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-amber-400/15 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-fuchsia-200 font-bold">
                    <Sparkles className="w-3.5 h-3.5 text-fuchsia-300 shrink-0" />
                    <span>Lõi Thần Sủng</span>
                  </span>
                  <span className="font-mono-nums font-black text-fuchsia-300">
                    +{spiritCoresEarned}
                  </span>
                </div>
              )}
              {festivalLanternsEarned > 0 && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-amber-400/15 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-rose-200 font-bold">
                    <span>🏮</span>
                    <span>Đèn Lồng Lễ Hội</span>
                  </span>
                  <span className="font-mono-nums font-black text-amber-300">
                    +{festivalLanternsEarned}
                  </span>
                </div>
              )}
              {divineCrystalsEarned > 0 && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-amber-400/15 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-amber-200 font-bold">
                    <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>Thần Tinh (Nâng Hào Quang 3D)</span>
                  </span>
                  <span className="font-mono-nums font-black text-amber-300">
                    +{divineCrystalsEarned}
                  </span>
                </div>
              )}
              {starDustEarned > 0 && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-amber-400/15 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-sky-200 font-bold">
                    <StarDustIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Bụi Tinh Tú</span>
                  </span>
                  <span className="font-mono-nums font-black text-sky-300">+{starDustEarned}</span>
                </div>
              )}
              {petEssenceEarned > 0 && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-amber-400/15 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-emerald-200 font-bold">
                    <PetEssenceIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Tinh Chất</span>
                  </span>
                  <span className="font-mono-nums font-black text-emerald-300">+{petEssenceEarned}</span>
                </div>
              )}
              {mountShardsEarned > 0 && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-amber-400/15 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-amber-200 font-bold">
                    <MountShardIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Mảnh Thú Cưỡi</span>
                  </span>
                  <span className="font-mono-nums font-black text-amber-300">+{mountShardsEarned}</span>
                </div>
              )}
              {awakeningCrystalsEarned > 0 && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-amber-400/15 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-rose-200 font-bold">
                    <AwakenCrystalIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Tinh Thể Thức Tỉnh</span>
                  </span>
                  <span className="font-mono-nums font-black text-rose-300">+{awakeningCrystalsEarned}</span>
                </div>
              )}
              {artifactShardsEarned > 0 && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-amber-400/15 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-amber-200 font-bold">
                    <ArtifactRelicIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Mảnh Thánh Khí</span>
                  </span>
                  <span className="font-mono-nums font-black text-amber-300">+{artifactShardsEarned}</span>
                </div>
              )}
              {mysticTokensEarned > 0 && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-amber-400/15 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-cyan-200 font-bold">
                    <MysticTokenIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Ấn Thần Bí</span>
                  </span>
                  <span className="font-mono-nums font-black text-cyan-300">+{mysticTokensEarned}</span>
                </div>
              )}
              {guildCoinsEarned > 0 && (
                <div className="col-span-1 sm:col-span-2 pt-2 border-t border-amber-400/15 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-amber-200 font-bold">
                    <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>Xu Bang Hội</span>
                  </span>
                  <span className="font-mono-nums font-black text-amber-300">+{guildCoinsEarned}</span>
                </div>
              )}
              {wingFeathersEarned > 0 && (
                <div className="col-span-2 sm:col-span-4 pt-2 border-t border-amber-400/15 flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-sky-200 font-bold">
                    <WingFeatherIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>Lông Vũ Tinh Tú (Nâng Cấp Cánh 3D)</span>
                  </span>
                  <span className="font-mono-nums font-black text-amber-300">+{wingFeathersEarned}</span>
                </div>
              )}
            </>
          )}

          {!isPause && seasonXpEarned > 0 && (
            <div className="col-span-2 sm:col-span-4 pt-2 border-t border-amber-400/15 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-amber-200 font-bold">
                <Crown className="w-3.5 h-3.5 text-amber-300" />
                <span>XP Battle Pass Mùa 1</span>
              </span>
              <span className="font-mono-nums font-black text-emerald-300">
                +{seasonXpEarned} XP
              </span>
            </div>
          )}
        </div>

        {/* Post-Match Damage Breakdown Chart (SVG Donut + Horizontal Bars) */}
        {!isPause && damageBreakdown && totalDamage > 0 && (() => {
          const radius = 34;
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
            <div className="mb-4 text-left bg-[#060916]/95 border border-sky-400/25 rounded-2xl p-3.5">
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="flex items-center gap-1.5 text-xs font-black text-amber-200 uppercase tracking-wider">
                  <BarChart3 className="w-3.5 h-3.5 text-sky-300" />
                  <span>Biểu Đồ Sát Thương DPS</span>
                </span>
                <span className="font-mono-nums text-[11px] font-bold text-slate-300">
                  Tổng {totalDamage.toLocaleString('vi-VN')}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4">
                {/* SVG Donut Chart */}
                <div className="relative h-24 w-24 shrink-0">
                  <svg viewBox="0 0 88 88" className="h-full w-full -rotate-90">
                    <circle
                      cx="44"
                      cy="44"
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
                            cx="44"
                            cy="44"
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
                    <span className="text-[9px] font-bold uppercase text-slate-400">DPS</span>
                    <span className="font-mono-nums text-xs font-black text-amber-200">
                      {dps >= 1000 ? `${(dps / 1000).toFixed(1)}k` : dps}
                    </span>
                  </div>
                </div>

                {/* Horizontal DPS Bars */}
                <div className="flex-1 w-full space-y-2">
                  {breakdownRows.map((row) => {
                    const pct = totalDamage > 0 ? Math.round((row.value / totalDamage) * 100) : 0;
                    return (
                      <div key={row.id}>
                        <div className="flex items-center justify-between text-[11px] font-bold mb-0.5">
                          <span className="flex items-center gap-1.5 text-slate-200 truncate">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: row.strokeHex }}
                            />
                            <span className="truncate">{row.label}</span>
                          </span>
                          <span className={`font-mono-nums shrink-0 ${row.textClass}`}>
                            {row.value.toLocaleString('vi-VN')} ({pct}%)
                          </span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
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

              <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-800 text-center">
                <div>
                  <div className="text-[10px] text-slate-400 font-bold">DPS Trung Bình</div>
                  <div className="font-mono-nums text-xs font-black text-sky-300">{dps}/s</div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold">Chí Mạng Đỉnh</div>
                  <div className="font-mono-nums text-xs font-black text-amber-300">
                    {damageBreakdown.peakCrit.toLocaleString('vi-VN')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-bold">Max Liên Kích</div>
                  <div className="font-mono-nums text-xs font-black text-rose-300">×{maxCombo}</div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Co-op Raid Team Damage & MVP Crown */}
        {!isPause && isCoopRaidMode && damageBreakdown?.coopAllies && damageBreakdown.coopAllies.length > 0 && (() => {
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
            <div className="mb-4 text-left bg-[#060916]/95 border border-amber-400/35 rounded-2xl p-3.5">
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="flex items-center gap-1.5 text-xs font-black text-amber-300 uppercase tracking-wider">
                  <Users className="w-3.5 h-3.5" />
                  <span>Tổ Đội Co-op &amp; Danh Hiệu MVP</span>
                </span>
                <span className="font-mono-nums text-[11px] font-bold text-slate-300">
                  Tổng Đội {teamTotal.toLocaleString('vi-VN')}
                </span>
              </div>
              <div className="space-y-2">
                {teamMembers.map((m) => {
                  const pct = Math.round((m.damage / teamTotal) * 100);
                  return (
                    <div
                      key={m.key}
                      className={`rounded-xl px-3 py-2 border ${
                        m.isMvp
                          ? 'bg-amber-400/10 border-amber-300/75'
                          : 'bg-[#090f24] border-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-[11px] font-black mb-1">
                        <span className="flex items-center gap-1.5 text-white truncate">
                          {m.isMvp && <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />}
                          <span className="truncate">{m.name}</span>
                          {m.isMvp && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-300 text-slate-950 text-[9px] font-black whitespace-nowrap">
                              MVP
                            </span>
                          )}
                        </span>
                        <span className="font-mono-nums text-amber-200 shrink-0">
                          {m.damage.toLocaleString('vi-VN')} ({pct}%)
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-950 overflow-hidden">
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

        <div className="flex flex-col gap-2.5">
          {isPause && onResume && (
            <button
              type="button"
              onClick={onResume}
              className="a2-yellow-btn w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-sm whitespace-nowrap cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>Tiếp Tục Chiến Đấu</span>
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
            onClick={onRetry}
            className={`w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-sm whitespace-nowrap cursor-pointer ${
              isPause ? 'a2-emerald-btn' : 'a2-yellow-btn'
            }`}
          >
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>{isPause ? 'Đánh Lại Từ Đầu' : isVictory ? 'Chơi Lại' : 'Thử Lại Ngay'}</span>
          </button>

          {canQuickUpgradeWeapon && equippedWeapon && weaponUpgradeCost !== null && (
            <button
              type="button"
              onClick={onQuickUpgradeWeapon}
              className="a2-emerald-btn w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-black text-xs sm:text-sm whitespace-nowrap cursor-pointer"
            >
              <Hammer className="w-4 h-4 shrink-0" />
              <span className="font-mono-nums">
                Cường Hóa {GEAR_TEMPLATES[equippedWeapon.templateId]?.name ?? 'Vũ Khí'} Lv.{equippedWeapon.level + 1} ({weaponUpgradeCost} Vàng)
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
              className="a2-slate-btn w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm whitespace-nowrap cursor-pointer"
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

          <button
            type="button"
            onClick={onReturnTitle}
            className="a2-slate-btn w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-black text-sm whitespace-nowrap cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Về Thánh Điện Chính</span>
          </button>
        </div>
      </div>
    </div>
  );
};


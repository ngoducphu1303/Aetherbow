import React from 'react';
import { BarChart3, Crown, Home, Play, RotateCcw, Settings, Skull, Trophy } from 'lucide-react';
import { DamageBreakdown, GamePhase } from '../types/game';
import { GoldCoinIcon, PetEssenceIcon, SoulGemIcon, StarDustIcon } from './GameIcons';

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
  kills: number;
  goldEarned: number;
  gemsEarned: number;
  starDustEarned?: number;
  petEssenceEarned?: number;
  maxCombo?: number;
  damageBreakdown?: DamageBreakdown;
  seasonXpEarned?: number;
  onResume?: () => void;
  onRetry: () => void;
  onReturnTitle: () => void;
  onOpenSettings?: () => void;
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
  kills,
  goldEarned,
  gemsEarned,
  starDustEarned = 0,
  petEssenceEarned = 0,
  maxCombo = 0,
  damageBreakdown,
  seasonXpEarned = 0,
  onResume,
  onRetry,
  onReturnTitle,
  onOpenSettings,
}) => {
  const isPause = phase === GamePhase.PAUSED;
  const isVictory = phase === GamePhase.VICTORY;

  const totalDamage = damageBreakdown
    ? damageBreakdown.basic + damageBreakdown.ultimate + damageBreakdown.pet + damageBreakdown.elemental
    : 0;
  const dps =
    damageBreakdown && damageBreakdown.elapsedSeconds > 0
      ? Math.round(totalDamage / damageBreakdown.elapsedSeconds)
      : 0;

  const breakdownRows = damageBreakdown
    ? [
        {
          id: 'basic',
          label: 'Đòn Thường & Đa Tiễn',
          value: damageBreakdown.basic,
          barClass: 'from-sky-500 to-cyan-300',
          textClass: 'text-sky-300',
        },
        {
          id: 'ultimate',
          label: 'Chiêu Cuối Anh Hùng',
          value: damageBreakdown.ultimate,
          barClass: 'from-purple-500 to-fuchsia-300',
          textClass: 'text-purple-300',
        },
        {
          id: 'pet',
          label: 'Tinh Linh 3D Đồng Hành',
          value: damageBreakdown.pet,
          barClass: 'from-emerald-500 to-lime-300',
          textClass: 'text-emerald-300',
        },
        {
          id: 'elemental',
          label: 'Nguyên Tố & Thiên Thạch',
          value: damageBreakdown.elemental,
          barClass: 'from-amber-500 to-orange-300',
          textClass: 'text-amber-300',
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
          {isArenaMode
            ? `Đấu Trường Arena 1v1 · ${arenaOpponentName || 'Kình Địch'}`
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
            : isArenaMode
            ? isVictory
              ? 'Chiến Thắng Đấu Trường!'
              : 'Thất Bại Tại Đấu Trường'
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
        <p className="text-xs text-slate-300 mb-4">
          {isPause
            ? 'Nghỉ ngơi đôi chút hoặc tùy chỉnh âm thanh & đồ họa 3D.'
            : isArenaMode
            ? isVictory
              ? `Bạn đã đánh bại ${arenaOpponentName || 'đối thủ'} và nhận ${arenaRatingDelta >= 0 ? `+${arenaRatingDelta}` : arenaRatingDelta} Điểm Xếp Hạng Arena!`
              : `Đối thủ ${arenaOpponentName || 'đối thủ'} đã thắng thế (${arenaRatingDelta} Điểm Arena). Hãy nâng cấp Bảo Thạch và tái đấu!`
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

        {/* Run Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-4 text-left bg-[#060916]/95 border border-amber-400/30 rounded-2xl p-3.5">
          <div>
            <div className="text-[10px] text-slate-400 font-bold">
              {isArenaMode
                ? 'Điểm Xếp Hạng'
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
              {isArenaMode
                ? `${arenaRatingDelta >= 0 ? `+${arenaRatingDelta}` : arenaRatingDelta} Điểm`
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

          {(starDustEarned > 0 || petEssenceEarned > 0) && (
            <>
              <div className="col-span-1 sm:col-span-2 pt-2 border-t border-amber-400/15 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-sky-200 font-bold">
                  <StarDustIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Bụi Tinh Tú</span>
                </span>
                <span className="font-mono-nums font-black text-sky-300">+{starDustEarned}</span>
              </div>
              <div className="col-span-1 sm:col-span-2 pt-2 border-t border-amber-400/15 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-emerald-200 font-bold">
                  <PetEssenceIcon className="w-3.5 h-3.5 shrink-0" />
                  <span>Tinh Chất</span>
                </span>
                <span className="font-mono-nums font-black text-emerald-300">+{petEssenceEarned}</span>
              </div>
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

        {/* Post-Match Damage Breakdown Chart */}
        {!isPause && damageBreakdown && totalDamage > 0 && (
          <div className="mb-4 text-left bg-[#060916]/95 border border-sky-400/25 rounded-2xl p-3.5">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="flex items-center gap-1.5 text-xs font-black text-amber-200 uppercase tracking-wider">
                <BarChart3 className="w-3.5 h-3.5 text-sky-300" />
                <span>Phân Tích Sát Thương</span>
              </span>
              <span className="font-mono-nums text-[11px] font-bold text-slate-300">
                Tổng {totalDamage.toLocaleString('vi-VN')}
              </span>
            </div>

            <div className="space-y-2">
              {breakdownRows.map((row) => {
                const pct = totalDamage > 0 ? Math.round((row.value / totalDamage) * 100) : 0;
                return (
                  <div key={row.id}>
                    <div className="flex items-center justify-between text-[11px] font-bold mb-0.5">
                      <span className="text-slate-200 truncate">{row.label}</span>
                      <span className={`font-mono-nums ${row.textClass}`}>
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
        )}

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
            <RotateCcw className="w-4 h-4" />
            <span>{isPause ? 'Đánh Lại Từ Đầu' : 'Chơi Lại'}</span>
          </button>

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


import React, { useState } from 'react';
import { Award, BookOpen, Check, Crown, History, Shield, Skull, Sword, Trophy, User, X } from 'lucide-react';
import bossArenaArt from '../assets/images/boss_rush_arena_emblem_1794973982304.jpg';
import seasonHonorArt from '../assets/images/season_honor_medals_1794982055715.jpg';
import { soundEngine } from '../audio/soundEngine';
import { CHAPTERS } from '../data/chaptersData';
import { HEROES, HERO_MAP } from '../data/heroesData';
import {
  ACHIEVEMENTS_CATALOG,
  ENEMY_CODEX_LIST,
  SEASON_HALL_RIVALS,
  computeSeasonScore,
  countClaimableAchievements,
  getAchievementCurrentValue,
  getSeasonRankInfo,
  normalizeCareer,
} from '../data/liveOpsData';
import { ALL_SKILLS_LIST, SKILL_RARITY_META } from '../data/skillsData';
import {
  SEASON_MEDALS,
  countClaimableSeasonMedals,
  getSeasonMedalCurrentValue,
} from '../data/wave4Data';
import { DYNAMIC_TITLES, DYNAMIC_TITLE_MAP } from '../data/wave9Data';
import { ComputedPlayerStats, DynamicTitleId, SaveData } from '../types/game';
import { GoldCoinIcon, HeroCrestSvg, SoulGemIcon, StarDustIcon } from './GameIcons';

interface ProfileCodexModalProps {
  save: SaveData;
  stats: ComputedPlayerStats;
  initialTab?: 'profile' | 'achievements' | 'history' | 'codex';
  onClose: () => void;
  onClaimAchievement: (id: string) => void;
  onClaimSeasonMedal: (medalId: string) => void;
  onSelectTitle: (title: string) => void;
  onSelectDynamicTitle?: (id: DynamicTitleId) => void;
}

export const ProfileCodexModal: React.FC<ProfileCodexModalProps> = ({
  save,
  stats,
  initialTab = 'profile',
  onClose,
  onClaimAchievement,
  onClaimSeasonMedal,
  onSelectTitle,
  onSelectDynamicTitle,
}) => {
  const [tab, setTab] = useState<'profile' | 'achievements' | 'history' | 'codex'>(initialTab);
  const [codexSubTab, setCodexSubTab] = useState<'heroes' | 'enemies' | 'skills'>('heroes');
  const [arenaImgFailed, setArenaImgFailed] = useState(false);
  const [medalImgFailed, setMedalImgFailed] = useState(false);

  const career = normalizeCareer(save.career);
  const activeHero = HERO_MAP[save.selectedHeroId] ?? HERO_MAP.artemis;
  const claimedSet = new Set(save.achievementsClaimed ?? []);
  const claimableAchCount = countClaimableAchievements(save);

  const unlockedTitles = ['Tân Binh Tinh Giới'];
  ACHIEVEMENTS_CATALOG.forEach((a) => {
    if (a.unlockTitle && getAchievementCurrentValue(save, a.metric) >= a.target) {
      unlockedTitles.push(a.unlockTitle);
    }
  });
  const currentTitle = save.equippedTitle ?? 'Tân Binh Tinh Giới';

  const mySeasonScore = computeSeasonScore(save, stats.powerRating);
  const myRankInfo = getSeasonRankInfo(mySeasonScore);
  const leaderboard = [
    ...SEASON_HALL_RIVALS.map((r) => ({ ...r, isPlayer: false })),
    {
      name: `${activeHero.name} (Bạn)`,
      heroName: activeHero.name,
      title: currentTitle,
      score: mySeasonScore,
      chapter: save.highestChapterCleared,
      tower: save.bestTowerFloor ?? 0,
      isPlayer: true,
    },
  ].sort((a, b) => b.score - a.score);

  const myPlacement = leaderboard.findIndex((row) => row.isPlayer) + 1;
  const runHistory = save.runHistory ?? [];
  const claimedMedalsSet = new Set(save.seasonMedalsClaimed ?? []);
  const claimableMedalsCount = countClaimableSeasonMedals(save, stats.powerRating, mySeasonScore);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/90">
      <div className="cel-panel-ornate w-full max-w-4xl max-h-[88vh] rounded-3xl overflow-hidden flex flex-col">
        {/* Header & Primary Tabs */}
        <div className="px-4 sm:px-6 pt-4 pb-3 border-b border-amber-400/25 bg-[#070b1a] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <HeroCrestSvg
              heroId={activeHero.id}
              accentHex={activeHero.accentHex}
              cloakHex={activeHero.cloakHex}
              hairHex={activeHero.hairHex}
              className="w-11 h-11 shrink-0"
            />
            <div>
              <div className="text-[11px] font-bold text-amber-300 flex flex-wrap items-center gap-2">
                <span>
                  {currentTitle} · Hạng #{myPlacement} Mùa 1
                </span>
                {save.equippedDynamicTitleId && save.equippedDynamicTitleId !== 'none' && (
                  <span
                    className={`px-2 py-0.5 rounded-lg border text-[10px] font-black ${
                      DYNAMIC_TITLE_MAP[save.equippedDynamicTitleId]?.borderClass ?? 'border-amber-300/60'
                    }`}
                  >
                    <span className={DYNAMIC_TITLE_MAP[save.equippedDynamicTitleId]?.gradientClass ?? 'text-amber-300'}>
                      {DYNAMIC_TITLE_MAP[save.equippedDynamicTitleId]?.title}
                    </span>
                  </span>
                )}
              </div>
              <h2 className="font-display text-lg sm:text-xl font-black text-white">
                Hồ Sơ Chiến Binh · {activeHero.name}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick(0.9);
              onClose();
            }}
            aria-label="Đóng Hồ Sơ"
            className="cel-panel w-9 h-9 rounded-xl flex items-center justify-center text-slate-200 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-[#050813] border border-amber-400/25 rounded-xl p-1">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setTab('profile');
              }}
              className={`py-2 px-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                tab === 'profile' ? 'a2-yellow-btn' : 'text-slate-300 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>Hồ Sơ &amp; Chỉ Số</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setTab('achievements');
              }}
              className={`py-2 px-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                tab === 'achievements' ? 'a2-yellow-btn' : 'text-slate-300 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5 shrink-0" />
              <span>Thành Tựu{claimableAchCount > 0 ? ` (${claimableAchCount})` : ''}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setTab('history');
              }}
              className={`py-2 px-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                tab === 'history' ? 'a2-yellow-btn' : 'text-slate-300 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5 shrink-0" />
              <span>Nhật Ký &amp; Vinh Danh{claimableMedalsCount > 0 ? ` (${claimableMedalsCount})` : ''}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setTab('codex');
              }}
              className={`py-2 px-2.5 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                tab === 'codex' ? 'a2-yellow-btn' : 'text-slate-300 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Thư Viện</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto a2-scroll p-4 sm:p-6">
          {tab === 'profile' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Left: Career KPIs + Title Selector */}
              <div className="space-y-4">
                <div className="cel-panel rounded-2xl p-4">
                  <h3 className="font-display text-sm font-black text-amber-200 mb-3">
                    Kỷ Lục Sự Nghiệp
                  </h3>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#060916] border border-amber-400/20 rounded-xl p-3">
                      <div className="text-slate-400 font-semibold">Tổng Quái Đã Hạ</div>
                      <div className="font-mono-nums text-lg font-black text-white mt-0.5">
                        {career.totalKills}
                      </div>
                    </div>
                    <div className="bg-[#060916] border border-amber-400/20 rounded-xl p-3">
                      <div className="text-slate-400 font-semibold">Thủ Lĩnh Đã Diệt</div>
                      <div className="font-mono-nums text-lg font-black text-rose-300 mt-0.5">
                        {career.totalBossesKilled}
                      </div>
                    </div>
                    <div className="bg-[#060916] border border-amber-400/20 rounded-xl p-3">
                      <div className="text-slate-400 font-semibold">Liên Kích Cao Nhất</div>
                      <div className="font-mono-nums text-lg font-black text-amber-300 mt-0.5">
                        x{career.maxComboEver}
                      </div>
                    </div>
                    <div className="bg-[#060916] border border-amber-400/20 rounded-xl p-3">
                      <div className="text-slate-400 font-semibold">Tháp Vô Tận · Săn Boss</div>
                      <div className="font-mono-nums text-sm font-black text-purple-300 mt-1">
                        Tầng {save.bestTowerFloor ?? 0} · Vòng {save.bestBossRushRound ?? 0}/5
                      </div>
                    </div>
                    <div className="bg-[#060916] border border-amber-400/20 rounded-xl p-3">
                      <div className="text-slate-400 font-semibold">Chương Đã Chinh Phục</div>
                      <div className="font-mono-nums text-lg font-black text-emerald-300 mt-0.5">
                        {save.highestChapterCleared}/{CHAPTERS.length}
                      </div>
                    </div>
                    <div className="bg-[#060916] border border-amber-400/20 rounded-xl p-3">
                      <div className="text-slate-400 font-semibold">Rương Đã Triệu Hồi</div>
                      <div className="font-mono-nums text-lg font-black text-sky-300 mt-0.5">
                        {career.totalChestsOpened}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Title Selector */}
                <div className="cel-panel rounded-2xl p-4">
                  <h3 className="font-display text-sm font-black text-amber-200 mb-2">
                    Danh Hiệu Hiển Thị
                  </h3>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Mở khóa thêm danh hiệu cao quý thông qua bảng Thành Tựu.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {unlockedTitles.map((title) => {
                      const active = currentTitle === title;
                      return (
                        <button
                          key={title}
                          type="button"
                          onClick={() => {
                            soundEngine.playUiClick(1.05);
                            onSelectTitle(title);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap transition-colors ${
                            active
                              ? 'a2-yellow-btn'
                              : 'bg-[#080d1e] border border-amber-400/25 text-slate-200 hover:border-amber-300'
                          }`}
                        >
                          {title}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Dynamic Shimmer Titles */}
                <div className="cel-panel rounded-2xl p-4">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="font-display text-sm font-black text-amber-200">
                      Danh Hiệu Động · Hào Quang Tên
                    </h3>
                    <span className="text-[10px] font-mono-nums font-bold text-sky-300">
                      {(save.unlockedDynamicTitles ?? ['none']).filter((id) => id !== 'none').length}/{DYNAMIC_TITLES.length - 1} Đã Mở
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-3">
                    Hiệu ứng chữ phát sáng chuyển sắc hiển thị trên Sảnh Chính và cộng vĩnh viễn chỉ số ATK/HP.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {DYNAMIC_TITLES.map((dt) => {
                      const isUnlocked = (save.unlockedDynamicTitles ?? ['none']).includes(dt.id);
                      const isEquipped = (save.equippedDynamicTitleId ?? 'none') === dt.id;
                      return (
                        <div
                          key={dt.id}
                          className={`rounded-xl p-3 border flex flex-col justify-between gap-2 ${
                            isEquipped ? dt.borderClass : 'bg-[#070b1a] border-slate-800'
                          }`}
                        >
                          <div>
                            <div className={`font-display text-xs font-black ${dt.gradientClass}`}>
                              {dt.title}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{dt.unlockHint}</div>
                            {(dt.bonusAtk > 0 || dt.bonusHp > 0) && (
                              <div className="text-[10px] font-mono-nums font-bold text-emerald-300 mt-1">
                                +{dt.bonusAtk} ATK · +{dt.bonusHp} HP
                              </div>
                            )}
                          </div>
                          {onSelectDynamicTitle && (
                            <button
                              type="button"
                              disabled={!isUnlocked || isEquipped}
                              onClick={() => {
                                soundEngine.playUiClick(1.08);
                                onSelectDynamicTitle(dt.id);
                              }}
                              className={`w-full py-1.5 px-2.5 rounded-lg text-[11px] font-black cursor-pointer whitespace-nowrap disabled:cursor-not-allowed ${
                                isEquipped
                                  ? 'bg-emerald-500/20 border border-emerald-400/50 text-emerald-300'
                                  : isUnlocked
                                  ? 'a2-yellow-btn'
                                  : 'bg-slate-900 border border-slate-800 text-slate-500'
                              }`}
                            >
                              {isEquipped ? 'Đang Trang Bị' : isUnlocked ? 'Trang Bị Danh Hiệu' : 'Chưa Mở Khóa'}
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Right: Detailed Combat Stat Breakdown */}
              <div className="cel-panel rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-sm font-black text-amber-200">
                      Chi Tiết Chỉ Số Chiến Đấu
                    </h3>
                    <span className="font-mono-nums text-sm font-black text-amber-300">
                      LC {stats.powerRating}
                    </span>
                  </div>

                  <div className="divide-y divide-amber-400/15 text-xs">
                    {[
                      { label: 'Sức Tấn Công (ATK)', val: `${stats.attack}`, icon: <Sword className="w-3.5 h-3.5 text-amber-300" /> },
                      { label: 'Sinh Lực Tối Đa (HP)', val: `${stats.maxHp}`, icon: <Shield className="w-3.5 h-3.5 text-emerald-300" /> },
                      { label: 'Tỷ Lệ Chí Mạng', val: `${Math.round(stats.critChance * 100)}%`, icon: <Crown className="w-3.5 h-3.5 text-yellow-300" /> },
                      { label: 'Sát Thương Chí Mạng', val: `${Math.round(stats.critDamage * 100)}%`, icon: <Crown className="w-3.5 h-3.5 text-orange-300" /> },
                      { label: 'Hệ Số Tốc Độ Đánh', val: `${stats.attackSpeedMult.toFixed(2)}x`, icon: <Sword className="w-3.5 h-3.5 text-sky-300" /> },
                      { label: 'Tốc Độ Di Chuyển', val: `${stats.moveSpeed.toFixed(1)} m/s`, icon: <Trophy className="w-3.5 h-3.5 text-teal-300" /> },
                      { label: 'Giảm Sát Thương Nhận', val: `${Math.round(stats.damageReduction * 100)}%`, icon: <Shield className="w-3.5 h-3.5 text-indigo-300" /> },
                      { label: 'Hồi Máu Qua Phòng', val: `+${Math.round(stats.stageHealPct * 100)}% HP`, icon: <Shield className="w-3.5 h-3.5 text-lime-300" /> },
                      { label: 'Hệ Số Thu Nhập Vàng', val: `+${Math.round((stats.goldGainMult - 1) * 100)}%`, icon: <GoldCoinIcon className="w-3.5 h-3.5" /> },
                    ].map((row) => (
                      <div key={row.label} className="py-2.5 flex items-center justify-between">
                        <span className="flex items-center gap-2 text-slate-300 font-semibold">
                          {row.icon}
                          <span>{row.label}</span>
                        </span>
                        <span className="font-mono-nums font-black text-white">{row.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-amber-400/20 text-[11px] text-slate-400">
                  Tổng hợp từ Anh Hùng ★{stats.heroStar}, 6 Trang Bị, {stats.equippedRunes.length}/4 Ngọc Khắc và Thiên Phú vĩnh viễn.
                </div>
              </div>
            </div>
          )}

          {tab === 'achievements' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ACHIEVEMENTS_CATALOG.map((ach) => {
                const cur = getAchievementCurrentValue(save, ach.metric);
                const done = cur >= ach.target;
                const claimed = claimedSet.has(ach.id);
                const pct = Math.min(100, (cur / ach.target) * 100);

                return (
                  <div
                    key={ach.id}
                    className={`rounded-2xl p-4 border flex flex-col justify-between gap-3 ${
                      claimed
                        ? 'bg-[#070b18]/75 border-slate-800'
                        : done
                        ? 'cel-panel-ornate'
                        : 'cel-panel'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display text-sm font-black text-white">
                          {ach.title}
                        </h3>
                        <span className="font-mono-nums text-xs font-black text-amber-300 shrink-0">
                          {Math.min(cur, ach.target)}/{ach.target}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">{ach.desc}</p>

                      <div className="mt-2.5 h-1.5 w-full rounded-full bg-slate-950 overflow-hidden border border-amber-400/20">
                        <div
                          className={`h-full transition-all duration-300 ${
                            done ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-3 text-xs font-mono-nums font-bold">
                        <span className="flex items-center gap-1 text-amber-300">
                          <GoldCoinIcon className="w-3.5 h-3.5" />+{ach.rewardGold}
                        </span>
                        <span className="flex items-center gap-1 text-purple-300">
                          <SoulGemIcon className="w-3.5 h-3.5" />+{ach.rewardGems}
                        </span>
                        {ach.unlockTitle && (
                          <span className="text-[10px] text-sky-300 font-semibold">
                            · Danh hiệu: {ach.unlockTitle}
                          </span>
                        )}
                      </div>

                      {claimed ? (
                        <span className="text-xs font-black text-emerald-400 flex items-center gap-1 shrink-0">
                          <Check className="w-3.5 h-3.5" /> Đã Nhận
                        </span>
                      ) : done ? (
                        <button
                          type="button"
                          onClick={() => {
                            soundEngine.playAchievement();
                            onClaimAchievement(ach.id);
                          }}
                          className="a2-emerald-btn px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap"
                        >
                          Nhận Thưởng
                        </button>
                      ) : (
                        <span className="text-[11px] font-bold text-slate-500 shrink-0">
                          Chưa đạt
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'history' && (
            <div className="space-y-5">
              {/* Season Hall of Fame Banner */}
              <div className="relative rounded-2xl overflow-hidden border border-amber-400/35 bg-[#080d22]">
                {!arenaImgFailed && (
                  <img
                    src={bossArenaArt}
                    alt="Bảng Vinh Danh Mùa 1"
                    referrerPolicy="no-referrer"
                    onError={() => setArenaImgFailed(true)}
                    className="absolute inset-0 w-full h-full object-cover opacity-35 pointer-events-none"
                  />
                )}
                <div className="relative z-[1] p-4 sm:p-5 bg-gradient-to-r from-[#070b1a]/95 via-[#090f26]/85 to-transparent flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-black tracking-wider text-amber-300">
                      BẢNG VINH DANH MÙA 1 · TINH GIỚI KHỞI NGUYÊN
                    </div>
                    <h3 className="font-display text-lg font-black text-white mt-0.5">
                      Xếp Hạng Của Bạn: #{myPlacement} ·{' '}
                      <span className={myRankInfo.colorClass}>{myRankInfo.tier}</span>
                    </h3>
                    <p className="text-xs text-slate-300 mt-1">
                      Tính theo Lực Chiến, Chương vượt qua, Tầng Tháp, Săn Boss và XP Battle Pass.
                    </p>
                  </div>
                  <div className="cel-panel rounded-2xl px-4 py-2.5 text-right font-mono-nums">
                    <div className="text-[10px] text-slate-400">Điểm Mùa Giải</div>
                    <div className="text-xl font-black text-amber-300">{mySeasonScore}</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Leaderboard List */}
                <div className="cel-panel rounded-2xl p-4 space-y-2.5">
                  <h4 className="font-display text-sm font-black text-amber-200 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-300" />
                    <span>Top Chiến Binh Hoàng Đạo</span>
                  </h4>
                  <div className="space-y-2">
                    {leaderboard.map((row, idx) => (
                      <div
                        key={row.name}
                        className={`rounded-xl px-3 py-2.5 border flex items-center justify-between gap-2 text-xs ${
                          row.isPlayer
                            ? 'bg-amber-500/15 border-amber-300/65'
                            : 'bg-[#070b1a] border-amber-400/15'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span
                            className={`w-6 h-6 rounded-lg font-mono-nums font-black flex items-center justify-center shrink-0 ${
                              idx === 0
                                ? 'bg-amber-400 text-slate-950'
                                : idx === 1
                                ? 'bg-slate-300 text-slate-950'
                                : idx === 2
                                ? 'bg-orange-400 text-slate-950'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="font-display font-black text-white truncate">
                              {row.name}
                            </div>
                            <div className="text-[10px] text-slate-400 truncate">
                              {row.title} · C.{row.chapter} · Tháp T.{row.tower}
                            </div>
                          </div>
                        </div>
                        <span className="font-mono-nums font-black text-amber-300 shrink-0">
                          {row.score} đ
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Run History */}
                <div className="cel-panel rounded-2xl p-4 space-y-2.5">
                  <h4 className="font-display text-sm font-black text-sky-200 flex items-center gap-2">
                    <History className="w-4 h-4 text-sky-300" />
                    <span>Nhật Ký 15 Trận Gần Nhất</span>
                  </h4>
                  {runHistory.length === 0 ? (
                    <div className="rounded-xl bg-[#070b1a] border border-amber-400/15 p-6 text-center text-xs text-slate-400">
                      Chưa có nhật ký trận đấu nào. Hãy tham gia Thử Thách Chương, Tháp Vô Tận hoặc Săn Boss!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[340px] overflow-y-auto a2-scroll pr-1">
                      {runHistory.map((run) => (
                        <div
                          key={run.id}
                          className="rounded-xl bg-[#070b1a] border border-amber-400/15 px-3 py-2.5 text-xs flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-black ${
                                  run.victory ? 'text-emerald-300' : 'text-rose-300'
                                }`}
                              >
                                {run.victory ? 'Thắng' : 'Dừng Bước'}
                              </span>
                              <span aria-hidden="true" className="text-slate-600">·</span>
                              <span className="font-display font-bold text-white truncate">
                                {run.label}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono-nums mt-0.5">
                              Hạ {run.kills} quái · Max Combo ×{run.maxCombo}
                            </div>
                          </div>
                          <div className="text-right font-mono-nums shrink-0">
                            <div className="text-amber-300 font-black">+{run.gold} V</div>
                            <div className="text-purple-300 font-black">+{run.gems} N</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Season Honor Medals Showcase */}
              <div className="cel-panel-ornate rounded-2xl overflow-hidden">
                <div className="relative h-28 sm:h-32 bg-[#070b1a] border-b border-amber-400/25">
                  {!medalImgFailed && (
                    <img
                      src={seasonHonorArt}
                      alt="Huy Chương Danh Vọng Mùa 1"
                      referrerPolicy="no-referrer"
                      onError={() => setMedalImgFailed(true)}
                      className="w-full h-full object-cover opacity-50"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#070b1a]/95 via-[#090f26]/80 to-transparent p-4 flex flex-col justify-end">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-300">
                      HUY CHƯƠNG DANH VỌNG MÙA 1
                    </div>
                    <h4 className="font-display text-base sm:text-lg font-black text-white">
                      Bộ Sưu Tập Ấn Ký Vinh Danh Vĩnh Viễn
                    </h4>
                  </div>
                </div>

                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {SEASON_MEDALS.map((medal) => {
                    const curVal = getSeasonMedalCurrentValue(
                      save,
                      stats.powerRating,
                      mySeasonScore,
                      medal.metric
                    );
                    const reached = curVal >= medal.target;
                    const claimed = claimedMedalsSet.has(medal.id);
                    const pct = Math.min(100, Math.round((curVal / Math.max(1, medal.target)) * 100));

                    return (
                      <div
                        key={medal.id}
                        className={`rounded-2xl p-3.5 border flex flex-col justify-between gap-2.5 ${
                          claimed
                            ? 'bg-emerald-950/20 border-emerald-400/40'
                            : reached
                            ? 'cel-panel-ornate a2-holo-foil overflow-hidden'
                            : 'bg-[#070b1a] border-amber-400/20'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between gap-2 mb-1">
                            <span
                              className="text-[10px] font-black uppercase tracking-wider"
                              style={{ color: medal.accentColor }}
                            >
                              {medal.tierLabel}
                            </span>
                            <span className="font-mono-nums text-[10px] font-black text-slate-300">
                              {Math.min(curVal, medal.target).toLocaleString('vi-VN')}/{medal.target.toLocaleString('vi-VN')}
                            </span>
                          </div>
                          <h5 className="font-display text-xs sm:text-sm font-black text-white">
                            {medal.title}
                          </h5>
                          <p className="text-[11px] text-slate-300 mt-1 leading-snug">
                            {medal.desc}
                          </p>
                          <div className="mt-2 h-1.5 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                            <div
                              className="h-full transition-all duration-300"
                              style={{
                                width: `${pct}%`,
                                backgroundColor: medal.accentColor,
                              }}
                            />
                          </div>
                        </div>

                        <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between gap-2">
                          <div className="text-[10px] font-mono-nums font-bold text-amber-200">
                            +{medal.atkBonus} ATK · +{medal.hpBonus} HP
                          </div>
                          {claimed ? (
                            <span className="text-[11px] font-black text-emerald-300 flex items-center gap-1 shrink-0">
                              <Check className="w-3.5 h-3.5" /> Đã Kích Hoạt
                            </span>
                          ) : reached ? (
                            <button
                              type="button"
                              onClick={() => {
                                soundEngine.playAchievement();
                                onClaimSeasonMedal(medal.id);
                              }}
                              className="a2-yellow-btn px-3 py-1.5 rounded-xl text-[11px] font-black cursor-pointer shrink-0 flex items-center gap-1"
                            >
                              <StarDustIcon className="w-3 h-3" />
                              <span>Nhận Ấn Ký</span>
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-500 shrink-0">
                              {pct}%
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {tab === 'codex' && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'heroes' as const, label: `Anh Hùng (${HEROES.length})` },
                  { id: 'enemies' as const, label: `Quái & Boss (${ENEMY_CODEX_LIST.length})` },
                  { id: 'skills' as const, label: `Kỹ Năng (${ALL_SKILLS_LIST.length})` },
                ].map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      soundEngine.playUiClick();
                      setCodexSubTab(sub.id);
                    }}
                    className={`px-3.5 py-2 rounded-xl text-xs font-black cursor-pointer whitespace-nowrap ${
                      codexSubTab === sub.id
                        ? 'a2-purple-btn'
                        : 'cel-panel text-slate-300 hover:text-white'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>

              {codexSubTab === 'heroes' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {HEROES.map((h) => {
                    const unlocked = save.unlockedHeroes.includes(h.id);
                    return (
                      <div key={h.id} className="cel-panel rounded-2xl p-4 flex gap-3">
                        <HeroCrestSvg
                          heroId={h.id}
                          accentHex={h.accentHex}
                          cloakHex={h.cloakHex}
                          hairHex={h.hairHex}
                          className="w-12 h-12 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="font-display text-sm font-black text-white truncate">
                              {h.name} · {h.title}
                            </h4>
                            <span
                              className={`text-[10px] font-bold ${
                                unlocked ? 'text-emerald-300' : 'text-slate-500'
                              }`}
                            >
                              {unlocked ? 'Đã sở hữu' : 'Chưa mở'}
                            </span>
                          </div>
                          <div className="text-[11px] text-amber-300 font-semibold mt-0.5">
                            {h.role} · Chiêu Cuối: {h.ultName}
                          </div>
                          <p className="text-xs text-slate-300 mt-1">{h.ultDesc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {codexSubTab === 'enemies' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ENEMY_CODEX_LIST.map((en) => {
                    const seen = career.seenEnemies.includes(en.kind);
                    return (
                      <div key={en.kind} className="cel-panel rounded-2xl p-4 space-y-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-black uppercase tracking-wider text-rose-300">
                            {en.tier} · {en.role}
                          </span>
                          <Skull className="w-4 h-4 text-rose-400 shrink-0" />
                        </div>
                        <h4 className="font-display text-sm font-black text-white">
                          {en.name}
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">{en.desc}</p>
                        <div className="pt-1 flex items-center justify-between text-[11px] font-mono-nums">
                          <span className="text-amber-300">
                            Nguy hiểm: {'★'.repeat(en.threat)}
                          </span>
                          <span className={seen ? 'text-emerald-300' : 'text-slate-500'}>
                            {seen ? 'Đã chạm trán' : 'Chưa gặp'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {codexSubTab === 'skills' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {ALL_SKILLS_LIST.map((sk) => {
                    const meta = SKILL_RARITY_META[sk.rarity];
                    return (
                      <div key={sk.id} className="cel-panel rounded-2xl p-3.5 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className="text-[10px] font-black uppercase tracking-wider"
                            style={{ color: sk.accentColor }}
                          >
                            {meta.label}
                          </span>
                          <span className="text-[10px] font-mono-nums text-slate-400">
                            Tối đa ×{sk.maxStacks}
                          </span>
                        </div>
                        <h4 className="font-display text-xs font-black text-white">
                          {sk.name}
                        </h4>
                        <p className="text-[11px] text-slate-300">{sk.description}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

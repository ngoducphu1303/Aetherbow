import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  Cloud,
  CloudOff,
  Crown,
  History,
  KeyRound,
  LogOut,
  RefreshCw,
  Shield,
  ShieldCheck,
  Skull,
  Sword,
  Trophy,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
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
import {
  CODEX_COLLECTION_RANKS,
  computeCodexSummary,
  countClaimableCodexRanks,
} from '../data/wave11Data';
import {
  CloudSyncStatus,
  detectAuthProvider,
  formatAccountHandle,
  isPasswordAccount,
  mapAuthError,
} from '../services/playerCloudService';
import { ComputedPlayerStats, DynamicTitleId, SaveData } from '../types/game';
import { GoldCoinIcon, HeroCrestSvg, SoulGemIcon, StarDustIcon } from './GameIcons';

export type ProfileModalTab = 'profile' | 'achievements' | 'history' | 'codex' | 'account';

interface ProfileCodexModalProps {
  save: SaveData;
  stats: ComputedPlayerStats;
  initialTab?: ProfileModalTab;
  currentUser: FirebaseUser | null;
  playerDisplayName: string;
  cloudSyncStatus: CloudSyncStatus;
  lastSyncedAt: number | null;
  cloudErrorMessage?: string | null;
  onManualCloudSave: () => Promise<void>;
  onUpdateDisplayName: (newName: string) => Promise<void>;
  onUpdatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  onOpenLinkAccount: () => void;
  onLogout: () => Promise<void>;
  onClose: () => void;
  onClaimAchievement: (id: string) => void;
  onClaimSeasonMedal: (medalId: string) => void;
  onSelectTitle: (title: string) => void;
  onSelectDynamicTitle?: (id: DynamicTitleId) => void;
  onClaimCodexRank?: (rank: number) => void;
}

export const ProfileCodexModal: React.FC<ProfileCodexModalProps> = ({
  save,
  stats,
  initialTab = 'profile',
  currentUser,
  playerDisplayName,
  cloudSyncStatus,
  lastSyncedAt,
  cloudErrorMessage,
  onManualCloudSave,
  onUpdateDisplayName,
  onUpdatePassword,
  onOpenLinkAccount,
  onLogout,
  onClose,
  onClaimAchievement,
  onClaimSeasonMedal,
  onSelectTitle,
  onSelectDynamicTitle,
  onClaimCodexRank,
}) => {
  const [tab, setTab] = useState<ProfileModalTab>(initialTab);
  const [codexSubTab, setCodexSubTab] = useState<'collection' | 'heroes' | 'enemies' | 'skills'>('collection');
  const [arenaImgFailed, setArenaImgFailed] = useState(false);
  const [medalImgFailed, setMedalImgFailed] = useState(false);

  // Account tab state
  const [nameInput, setNameInput] = useState(playerDisplayName);
  const [nameSaving, setNameSaving] = useState(false);
  const [nameFeedback, setNameFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [currPwd, setCurrPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdFeedback, setPwdFeedback] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const [manualSaving, setManualSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    setNameInput(playerDisplayName);
  }, [playerDisplayName]);

  const canChangePassword = isPasswordAccount(currentUser);
  const formattedSyncTime = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : null;

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || nameSaving) return;
    setNameFeedback(null);
    setNameSaving(true);
    try {
      await onUpdateDisplayName(nameInput);
      setNameFeedback({ kind: 'ok', text: 'Đã cập nhật tên hiển thị và đồng bộ lên Bảng Xếp Hạng.' });
    } catch (err) {
      setNameFeedback({ kind: 'err', text: mapAuthError(err) });
    } finally {
      setNameSaving(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || pwdSaving) return;
    setPwdFeedback(null);
    if (newPwd !== confirmPwd) {
      setPwdFeedback({ kind: 'err', text: 'Mật khẩu mới và xác nhận không khớp.' });
      return;
    }
    setPwdSaving(true);
    try {
      await onUpdatePassword(currPwd, newPwd);
      setCurrPwd('');
      setNewPwd('');
      setConfirmPwd('');
      setPwdFeedback({ kind: 'ok', text: 'Đã đổi mật khẩu thành công.' });
    } catch (err) {
      setPwdFeedback({ kind: 'err', text: mapAuthError(err) });
    } finally {
      setPwdSaving(false);
    }
  };

  const handleManualSyncClick = async () => {
    if (!currentUser || manualSaving) return;
    setManualSaving(true);
    try {
      await onManualCloudSave();
    } finally {
      setManualSaving(false);
    }
  };

  const handleLogoutClick = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await onLogout();
      onClose();
    } finally {
      setLoggingOut(false);
    }
  };

  const codexSummary = computeCodexSummary(save);
  const claimableCodexCount = countClaimableCodexRanks(save);
  const claimedCodexSet = new Set(save.codexClaimedRanks ?? []);

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
                {playerDisplayName} · {activeHero.name}
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

          <div className="w-full grid grid-cols-2 sm:grid-cols-5 gap-1.5 bg-[#050813] border border-amber-400/25 rounded-xl p-1">
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setTab('profile');
              }}
              className={`py-2 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                tab === 'profile' ? 'a2-yellow-btn' : 'text-slate-300 hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5 shrink-0" />
              <span>Hồ Sơ</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setTab('account');
              }}
              className={`py-2 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                tab === 'account' ? 'a2-yellow-btn' : 'text-slate-300 hover:text-white'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
              <span>Tài Khoản</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setTab('achievements');
              }}
              className={`py-2 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
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
              className={`py-2 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                tab === 'history' ? 'a2-yellow-btn' : 'text-slate-300 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5 shrink-0" />
              <span>Vinh Danh{claimableMedalsCount > 0 ? ` (${claimableMedalsCount})` : ''}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                soundEngine.playUiClick();
                setTab('codex');
              }}
              className={`py-2 px-2 rounded-lg text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer transition-colors ${
                tab === 'codex' ? 'a2-yellow-btn' : 'text-slate-300 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 shrink-0" />
              <span>Thư Viện{claimableCodexCount > 0 ? ` (${claimableCodexCount})` : ''}</span>
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
                  {
                    id: 'collection' as const,
                    label: `Sổ Tay Buff Toàn Đội (Cấp ${codexSummary.currentRank.rank})${claimableCodexCount > 0 ? ` · +${claimableCodexCount}` : ''}`,
                  },
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

              {codexSubTab === 'collection' && (
                <div className="space-y-4">
                  {/* Active Global Team Buff Header */}
                  <div className="cel-panel-ornate rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-[#171232] via-[#101833] to-[#1a1228]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-widest text-amber-300">
                          SỔ TAY SƯU TẦM HOÀNG ĐẠO · BUFF VĨNH VIỄN TOÀN ĐỘI
                        </div>
                        <h3 className="font-display text-lg sm:text-xl font-black text-white mt-0.5">
                          Cấp {codexSummary.currentRank.rank} · {codexSummary.currentRank.title}
                        </h3>
                        <p className="text-xs text-slate-300 mt-0.5">
                          Mở khóa Anh Hùng, Tiến Hóa Thần Sủng, Cánh, Thú Cưỡi, Bầu Trời &amp; Hào Quang để cộng vĩnh viễn sức mạnh!
                        </p>
                      </div>
                      <div className="rounded-xl border border-amber-400/45 bg-[#070b1a] px-4 py-2.5 text-right font-mono-nums">
                        <div className="text-[10px] font-bold text-slate-400">Điểm Sưu Tầm</div>
                        <div className="text-xl font-black text-amber-300">
                          {codexSummary.totalPoints.toLocaleString('vi-VN')}
                          {codexSummary.nextRank ? (
                            <span className="text-xs text-slate-400">
                              {' '}/ {codexSummary.nextRank.pointsRequired}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4 text-center font-mono-nums">
                      <div className="rounded-xl border border-amber-400/25 bg-[#060916] p-2.5">
                        <div className="text-[10px] text-slate-400 font-bold">Buff Công Toàn Đội</div>
                        <div className="text-base font-black text-amber-300">
                          +{Math.round(codexSummary.totalAtkPct * 100)}% ATK
                        </div>
                      </div>
                      <div className="rounded-xl border border-emerald-400/25 bg-[#060916] p-2.5">
                        <div className="text-[10px] text-slate-400 font-bold">Buff Máu Toàn Đội</div>
                        <div className="text-base font-black text-emerald-300">
                          +{Math.round(codexSummary.totalHpPct * 100)}% HP
                        </div>
                      </div>
                      <div className="rounded-xl border border-rose-400/25 bg-[#060916] p-2.5">
                        <div className="text-[10px] text-slate-400 font-bold">Tỷ Lệ Chí Mạng</div>
                        <div className="text-base font-black text-rose-300">
                          +{(codexSummary.totalCrit * 100).toFixed(1)}% CRIT
                        </div>
                      </div>
                      <div className="rounded-xl border border-sky-400/25 bg-[#060916] p-2.5">
                        <div className="text-[10px] text-slate-400 font-bold">Thu Nhập Vàng</div>
                        <div className="text-base font-black text-sky-300">
                          +{Math.round(codexSummary.totalGoldPct * 100)}% VÀNG
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3 text-[11px] font-mono-nums text-slate-300">
                      <div className="rounded-lg bg-slate-950/60 px-2.5 py-1.5 flex items-center justify-between">
                        <span>Anh Hùng</span>
                        <span className="font-black text-amber-200">{codexSummary.heroPoints}đ</span>
                      </div>
                      <div className="rounded-lg bg-slate-950/60 px-2.5 py-1.5 flex items-center justify-between">
                        <span>Tinh Linh &amp; Sủng</span>
                        <span className="font-black text-emerald-200">{codexSummary.petPoints}đ</span>
                      </div>
                      <div className="rounded-lg bg-slate-950/60 px-2.5 py-1.5 flex items-center justify-between">
                        <span>Ngoại Trang &amp; Trời</span>
                        <span className="font-black text-sky-200">{codexSummary.cosmeticPoints}đ</span>
                      </div>
                      <div className="rounded-lg bg-slate-950/60 px-2.5 py-1.5 flex items-center justify-between">
                        <span>Thánh Khí &amp; Hào Quang</span>
                        <span className="font-black text-fuchsia-200">{codexSummary.artifactHaloPoints}đ</span>
                      </div>
                    </div>
                  </div>

                  {/* 8 Codex Mastery Ranks */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CODEX_COLLECTION_RANKS.map((rk) => {
                      const reached = codexSummary.totalPoints >= rk.pointsRequired;
                      const claimed = claimedCodexSet.has(rk.rank);
                      return (
                        <div
                          key={rk.rank}
                          className={`rounded-2xl border p-3.5 flex flex-col justify-between gap-2.5 ${
                            claimed
                              ? 'border-emerald-500/35 bg-emerald-950/20'
                              : reached
                              ? 'cel-panel-ornate'
                              : 'cel-panel opacity-85'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                                Cấp {rk.rank} · Yêu cầu {rk.pointsRequired} Điểm
                              </div>
                              <h4 className="font-display text-sm font-black text-white">
                                {rk.title}
                              </h4>
                            </div>
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-md ${
                                reached
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                                  : 'bg-slate-800 text-slate-400'
                              }`}
                            >
                              {reached ? 'Đã Kích Hoạt' : 'Chưa Đạt'}
                            </span>
                          </div>

                          <div className="text-[11px] font-mono-nums font-bold text-slate-200">
                            +{Math.round(rk.atkPctBonus * 100)}% ATK · +{Math.round(rk.hpPctBonus * 100)}% HP
                            {rk.critBonus > 0 ? ` · +${(rk.critBonus * 100).toFixed(1)}% Crit` : ''}
                            {rk.goldPctBonus > 0 ? ` · +${Math.round(rk.goldPctBonus * 100)}% Vàng` : ''}
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                            <div className="text-[11px] font-mono-nums font-bold text-sky-300">
                              Quà Mốc: +{rk.rewardGems}💎 · +{rk.rewardSpiritCores} Lõi Sủng
                            </div>
                            {claimed ? (
                              <span className="text-[11px] font-black text-emerald-400 flex items-center gap-1 whitespace-nowrap">
                                <Check className="w-3.5 h-3.5" /> Đã Nhận
                              </span>
                            ) : reached && onClaimCodexRank ? (
                              <button
                                type="button"
                                onClick={() => {
                                  soundEngine.playAchievement();
                                  onClaimCodexRank(rk.rank);
                                }}
                                className="a2-yellow-btn px-3 py-1.5 rounded-xl text-[11px] font-black cursor-pointer whitespace-nowrap"
                              >
                                Nhận Quà
                              </button>
                            ) : (
                              <span className="font-mono-nums text-[10px] font-bold text-slate-500">
                                Thiếu {Math.max(0, rk.pointsRequired - codexSummary.totalPoints)}đ
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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

          {tab === 'account' && (
            <div className="space-y-5">
              {/* Identity & Cloud Sync Status Card */}
              <div className="cel-panel rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 text-xs font-bold">
                    {currentUser ? (
                      <>
                        <Cloud className="w-4 h-4 text-emerald-300 shrink-0" />
                        <span className="text-emerald-300">
                          {cloudSyncStatus === 'syncing' || manualSaving
                            ? 'Đang đồng bộ lên đám mây Firebase…'
                            : cloudSyncStatus === 'pending'
                            ? 'Có thay đổi mới chờ tự động lưu…'
                            : cloudSyncStatus === 'error'
                            ? 'Đồng bộ đám mây gặp lỗi'
                            : formattedSyncTime
                            ? `Đã đồng bộ đám mây · ${formattedSyncTime}`
                            : 'Đã kết nối đám mây Firebase'}
                        </span>
                      </>
                    ) : (
                      <>
                        <CloudOff className="w-4 h-4 text-amber-300 shrink-0" />
                        <span className="text-amber-300">
                          Chế Độ Khách (Chỉ lưu cục bộ trên trình duyệt này)
                        </span>
                      </>
                    )}
                  </div>

                  <h3 className="font-display text-lg font-black text-white truncate">
                    {playerDisplayName}
                  </h3>

                  {currentUser ? (
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-300">
                      <span>{formatAccountHandle(currentUser.email)}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span>
                        {detectAuthProvider(currentUser) === 'google'
                          ? 'Đăng nhập bằng Google'
                          : 'Tài khoản & Mật khẩu'}
                      </span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="font-mono-nums text-slate-400">
                        ID: {currentUser.uid.slice(0, 8)}
                      </span>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-300 max-w-xl">
                      Liên kết tài khoản ngay để lưu toàn bộ Anh Hùng, Trang Bị, Ngọc Khắc, Vàng và Ngọc Hồn lên Firebase Cloud cũng như ghi danh lên Bảng Xếp Hạng người chơi thật.
                    </p>
                  )}

                  {cloudErrorMessage && (
                    <div className="text-[11px] text-rose-300 flex items-center gap-1.5 pt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{cloudErrorMessage}</span>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap sm:flex-col gap-2 shrink-0">
                  {currentUser ? (
                    <>
                      <button
                        type="button"
                        disabled={manualSaving || cloudSyncStatus === 'syncing'}
                        onClick={handleManualSyncClick}
                        className="a2-yellow-btn px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-60"
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${
                            manualSaving || cloudSyncStatus === 'syncing' ? 'animate-spin' : ''
                          }`}
                        />
                        <span>{manualSaving ? 'Đang lưu…' : 'Lưu Ngay Lên Đám Mây'}</span>
                      </button>
                      <button
                        type="button"
                        disabled={loggingOut}
                        onClick={handleLogoutClick}
                        className="a2-slate-btn px-4 py-2 rounded-xl text-xs font-bold text-rose-200 hover:text-white flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-60"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{loggingOut ? 'Đang đăng xuất…' : 'Đăng Xuất'}</span>
                      </button>
                    </>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        onOpenLinkAccount();
                      }}
                      className="a2-yellow-btn px-4 py-2.5 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Đăng Nhập / Liên Kết Tài Khoản</span>
                    </button>
                  )}
                </div>
              </div>

              {currentUser && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Change Display Name */}
                  <form onSubmit={handleSaveName} className="cel-panel rounded-2xl p-4 space-y-3">
                    <div>
                      <h4 className="font-display text-sm font-black text-amber-200">
                        Đổi Tên Hiển Thị
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Hiển thị trên thanh Hồ Sơ sảnh và Bảng Xếp Hạng Liên Server.
                      </p>
                    </div>
                    <div>
                      <label
                        htmlFor="profile-display-name"
                        className="block text-[11px] font-semibold text-slate-300 mb-1"
                      >
                        Tên chiến binh mới (2–24 ký tự)
                      </label>
                      <input
                        id="profile-display-name"
                        type="text"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        minLength={2}
                        maxLength={24}
                        required
                        className="w-full rounded-xl bg-[#050813] border border-amber-400/25 px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-300"
                      />
                    </div>
                    {nameFeedback && (
                      <div
                        className={`text-[11px] flex items-center gap-1.5 ${
                          nameFeedback.kind === 'ok' ? 'text-emerald-300' : 'text-rose-300'
                        }`}
                      >
                        {nameFeedback.kind === 'ok' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{nameFeedback.text}</span>
                      </div>
                    )}
                    <button
                      type="submit"
                      disabled={nameSaving || nameInput.trim() === playerDisplayName}
                      className="a2-yellow-btn w-full py-2.5 px-4 rounded-xl text-xs font-black cursor-pointer disabled:opacity-50"
                    >
                      {nameSaving ? 'Đang cập nhật…' : 'Lưu Tên Hiển Thị'}
                    </button>
                  </form>

                  {/* Change Password */}
                  <div className="cel-panel rounded-2xl p-4 space-y-3">
                    <div>
                      <h4 className="font-display text-sm font-black text-amber-200 flex items-center gap-1.5">
                        <KeyRound className="w-4 h-4" />
                        <span>Bảo Mật &amp; Đổi Mật Khẩu</span>
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Bảo vệ tài khoản và kho trang bị khỏi truy cập trái phép.
                      </p>
                    </div>

                    {canChangePassword ? (
                      <form onSubmit={handleSavePassword} className="space-y-2.5">
                        <input
                          type="password"
                          value={currPwd}
                          onChange={(e) => setCurrPwd(e.target.value)}
                          placeholder="Mật khẩu hiện tại"
                          autoComplete="current-password"
                          required
                          className="w-full rounded-xl bg-[#050813] border border-amber-400/25 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-300"
                        />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <input
                            type="password"
                            value={newPwd}
                            onChange={(e) => setNewPwd(e.target.value)}
                            placeholder="Mật khẩu mới (≥ 6 ký tự)"
                            autoComplete="new-password"
                            minLength={6}
                            required
                            className="w-full rounded-xl bg-[#050813] border border-amber-400/25 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-300"
                          />
                          <input
                            type="password"
                            value={confirmPwd}
                            onChange={(e) => setConfirmPwd(e.target.value)}
                            placeholder="Nhập lại mật khẩu mới"
                            autoComplete="new-password"
                            minLength={6}
                            required
                            className="w-full rounded-xl bg-[#050813] border border-amber-400/25 px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-300"
                          />
                        </div>
                        {pwdFeedback && (
                          <div
                            className={`text-[11px] flex items-center gap-1.5 ${
                              pwdFeedback.kind === 'ok' ? 'text-emerald-300' : 'text-rose-300'
                            }`}
                          >
                            {pwdFeedback.kind === 'ok' ? (
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            ) : (
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            )}
                            <span>{pwdFeedback.text}</span>
                          </div>
                        )}
                        <button
                          type="submit"
                          disabled={pwdSaving}
                          className="a2-slate-btn w-full py-2.5 px-4 rounded-xl text-xs font-black text-amber-200 cursor-pointer disabled:opacity-50"
                        >
                          {pwdSaving ? 'Đang đổi mật khẩu…' : 'Cập Nhật Mật Khẩu'}
                        </button>
                      </form>
                    ) : (
                      <div className="rounded-xl bg-[#050813] border border-amber-400/20 p-3.5 text-xs text-slate-300 leading-relaxed">
                        Tài khoản này đăng nhập trực tiếp qua <strong>Google</strong> nên mật khẩu và xác thực 2 lớp được quản lý an toàn bởi tài khoản Google của bạn.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

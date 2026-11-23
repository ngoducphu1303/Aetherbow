import React, { useState } from 'react';
import { Calendar, Check, Compass, Gift, ScrollText, Sparkles, X } from 'lucide-react';
import noviceJourneyBanner from '../assets/images/novice_journey_scroll_1794983176618.jpg';
import {
  CHECK_IN_REWARDS,
  DAILY_QUESTS,
  countClaimableDailyQuests,
  getTodayKey,
  normalizeCheckIn,
  normalizeDailyQuests,
} from '../data/questsData';
import {
  NOVICE_JOURNEY_DAYS,
  getJourneyTaskCurrentValue,
  normalizeNoviceJourney,
} from '../data/wave5Data';
import { SaveData } from '../types/game';
import { GoldCoinIcon, SoulGemIcon, StarDustIcon } from './GameIcons';

interface DailyRewardsModalProps {
  save: SaveData;
  powerRating: number;
  initialTab?: 'checkin' | 'quests' | 'welcome' | 'journey';
  onClose: () => void;
  onClaimCheckIn: () => void;
  onClaimDailyQuest: (questId: string) => void;
  onClaimWelcomeGift: () => void;
  onClaimJourneyTask: (taskId: string) => void;
  onClaimJourneyDay: (day: number) => void;
}

export const DailyRewardsModal: React.FC<DailyRewardsModalProps> = ({
  save,
  powerRating,
  initialTab = 'checkin',
  onClose,
  onClaimCheckIn,
  onClaimDailyQuest,
  onClaimWelcomeGift,
  onClaimJourneyTask,
  onClaimJourneyDay,
}) => {
  const [tab, setTab] = useState<'checkin' | 'quests' | 'welcome' | 'journey'>(initialTab);
  const [journeyDay, setJourneyDay] = useState<number>(1);
  const [journeyImgErr, setJourneyImgErr] = useState(false);

  const checkIn = normalizeCheckIn(save.checkIn);
  const today = getTodayKey();
  const daily = normalizeDailyQuests(save.dailyQuests, today);
  const dailyQuestClaimable = countClaimableDailyQuests(save.dailyQuests, today);
  const journey = normalizeNoviceJourney(save.noviceJourney);
  const canCheckInToday = checkIn.count < 7 && checkIn.lastDate !== today;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/88">
      <div className="cel-panel-ornate w-full max-w-2xl max-h-[88vh] flex flex-col rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-[#101836] border-b border-amber-400/35">
          <div>
            <h2 className="font-display text-lg sm:text-xl font-black text-amber-200">
              Phúc Lợi Hoàng Đạo
            </h2>
            <p className="text-xs text-slate-300">
              Điểm danh mỗi ngày, hoàn thành nhiệm vụ và nhận gói tân thủ.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng Phúc Lợi"
            className="cel-panel w-9 h-9 rounded-xl flex items-center justify-center text-slate-200 hover:border-amber-300 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Subtabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 px-4 pt-3 pb-2.5 bg-[#090e22] border-b border-amber-400/20">
          <button
            type="button"
            onClick={() => setTab('checkin')}
            className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              tab === 'checkin'
                ? 'a2-yellow-btn'
                : 'cel-panel text-slate-300 hover:text-white'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 shrink-0" />
            <span>Điểm Danh</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('quests')}
            className={`relative py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              tab === 'quests'
                ? 'a2-yellow-btn'
                : 'cel-panel text-slate-300 hover:text-white'
            }`}
          >
            <ScrollText className="w-3.5 h-3.5 shrink-0" />
            <span>Nhiệm Vụ</span>
            {dailyQuestClaimable > 0 && (
              <span
                data-testid="rewards-modal-quests-badge"
                className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-mono-nums text-[9px] font-black leading-none"
              >
                {dailyQuestClaimable}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('welcome')}
            className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              tab === 'welcome'
                ? 'a2-yellow-btn'
                : 'cel-panel text-slate-300 hover:text-white'
            }`}
          >
            <Gift className="w-3.5 h-3.5 shrink-0" />
            <span>Quà Tân Thủ</span>
          </button>
          <button
            type="button"
            onClick={() => setTab('journey')}
            className={`py-2 px-2 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
              tab === 'journey'
                ? 'a2-emerald-btn'
                : 'cel-panel text-slate-300 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span>Hành Trình 7 Ngày</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 a2-gear-vault-bg overflow-y-auto a2-scroll p-4 sm:p-5">
          {tab === 'checkin' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {CHECK_IN_REWARDS.map((item) => {
                  const claimed = item.day <= checkIn.count;
                  const isToday =
                    item.day === checkIn.count + 1 && canCheckInToday;
                  const spanWide = item.day === 7;

                  return (
                    <div
                      key={item.day}
                      className={`rounded-2xl p-3 border flex flex-col justify-between gap-2 ${
                        spanWide ? 'col-span-2' : ''
                      } ${
                        claimed
                          ? 'bg-[#0a1726]/90 border-emerald-500/45 opacity-80'
                          : isToday
                          ? 'bg-gradient-to-b from-[#2b200c] to-[#12162b] border-amber-300 shadow-lg'
                          : 'cel-panel'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] font-black">
                        <span className="text-amber-300">Ngày {item.day}</span>
                        {claimed && (
                          <span className="text-emerald-300 flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Đã nhận
                          </span>
                        )}
                      </div>
                      <div className="text-xs sm:text-sm font-black text-white">
                        {item.label}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] font-mono-nums text-slate-200">
                        <span className="flex items-center gap-1">
                          +{item.gold} <GoldCoinIcon className="w-3 h-3" />
                        </span>
                        <span aria-hidden="true" className="text-slate-600">·</span>
                        <span className="flex items-center gap-1">
                          +{item.gems} <SoulGemIcon className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={!canCheckInToday}
                onClick={onClaimCheckIn}
                className={`w-full py-3 rounded-xl font-black text-sm whitespace-nowrap cursor-pointer ${
                  canCheckInToday
                    ? 'a2-emerald-btn'
                    : 'bg-slate-900 border border-slate-700 text-slate-400 cursor-not-allowed'
                }`}
              >
                {checkIn.count >= 7
                  ? 'Đã Hoàn Thành Chuỗi 7 Ngày!'
                  : canCheckInToday
                  ? `Điểm Danh Nhận Quà Ngày ${checkIn.count + 1}`
                  : 'Hôm Nay Đã Điểm Danh · Quay Lại Ngày Mai'}
              </button>
            </div>
          )}

          {tab === 'quests' && (
            <div className="flex flex-col gap-3">
              {DAILY_QUESTS.map((q) => {
                const current = Math.min(q.target, daily[q.metric]);
                const pct = Math.round((current / q.target) * 100);
                const claimed = daily.claimedIds.includes(q.id);
                const ready = !claimed && current >= q.target;

                return (
                  <div
                    key={q.id}
                    className="cel-panel rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-black text-white">
                        {q.title}
                      </div>
                      <div className="flex items-center gap-3 text-[11px] font-mono-nums text-amber-300 mt-1">
                        <span className="flex items-center gap-1">
                          +{q.rewardGold} <GoldCoinIcon className="w-3 h-3" />
                        </span>
                        <span className="flex items-center gap-1 text-purple-300">
                          +{q.rewardGems} <SoulGemIcon className="w-3 h-3" />
                        </span>
                        <span className="text-slate-300">
                          Tiến độ: {current}/{q.target}
                        </span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-950/90 mt-2 overflow-hidden border border-amber-400/20">
                        <div
                          className="h-full bg-gradient-to-r from-amber-300 to-emerald-400 transition-all duration-200"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!ready}
                      onClick={() => onClaimDailyQuest(q.id)}
                      className={`px-4 py-2 rounded-xl text-xs font-black shrink-0 whitespace-nowrap cursor-pointer ${
                        claimed
                          ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 cursor-default'
                          : ready
                          ? 'a2-yellow-btn'
                          : 'bg-slate-900 border border-slate-700 text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      {claimed ? 'Đã Nhận' : ready ? 'Nhận Thưởng' : 'Chưa Đạt'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'welcome' && (
            <div className="cel-panel-ornate rounded-2xl p-5 text-center flex flex-col items-center gap-3">
              <div className="p-3.5 rounded-2xl bg-amber-400/15 border border-amber-300/65 text-amber-300">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="font-display text-xl font-black text-white">
                Gói Tiếp Tế Tân Thủ Artemis
              </h3>
              <p className="text-xs sm:text-sm text-slate-200 max-w-md">
                Quà chào mừng chiến binh mới gia nhập Hoàng Đạo Tinh Giới giúp bạn cường hóa trang bị và chiêu mộ Anh Hùng nhanh chóng.
              </p>

              <div className="grid grid-cols-3 gap-2.5 w-full max-w-md my-1 text-xs font-black font-mono-nums">
                <div className="rounded-xl bg-[#070b1a] border border-amber-400/45 p-2.5 text-amber-300 flex items-center justify-center gap-1.5">
                  <GoldCoinIcon className="w-4 h-4 shrink-0" />
                  <span>+30 Vàng</span>
                </div>
                <div className="rounded-xl bg-[#070b1a] border border-purple-400/45 p-2.5 text-purple-300 flex items-center justify-center gap-1.5">
                  <SoulGemIcon className="w-4 h-4 shrink-0" />
                  <span>+10 Ngọc</span>
                </div>
                <div className="rounded-xl bg-[#070b1a] border border-sky-400/45 p-2.5 text-sky-300 flex items-center justify-center">
                  <span>+2 Mảnh Hiếm</span>
                </div>
              </div>

              <button
                type="button"
                disabled={Boolean(save.welcomeGiftClaimed)}
                onClick={onClaimWelcomeGift}
                className={`w-full max-w-xs py-3 rounded-xl font-black text-sm whitespace-nowrap cursor-pointer ${
                  save.welcomeGiftClaimed
                    ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-300 cursor-default'
                    : 'a2-yellow-btn'
                }`}
              >
                {save.welcomeGiftClaimed ? 'Đã Nhận Quà Tân Thủ' : 'Nhận Ngay Quà Tân Thủ'}
              </button>
            </div>
          )}

          {tab === 'journey' && (() => {
            const activeDayDef =
              NOVICE_JOURNEY_DAYS.find((d) => d.day === journeyDay) ?? NOVICE_JOURNEY_DAYS[0];
            const completedTasksInDay = activeDayDef.tasks.filter(
              (t) => getJourneyTaskCurrentValue(save, powerRating, t.metric) >= t.target
            ).length;
            const dayMilestoneClaimed = journey.claimedDayMilestones.includes(activeDayDef.day);
            const dayMilestoneReady =
              completedTasksInDay >= activeDayDef.tasks.length && !dayMilestoneClaimed;

            return (
              <div className="flex flex-col gap-3.5">
                <div className="relative rounded-2xl overflow-hidden border border-amber-400/40 bg-gradient-to-br from-[#121936] to-[#080d22]">
                  {!journeyImgErr && (
                    <img
                      src={noviceJourneyBanner}
                      alt="Hành Trình Tân Thủ 7 Ngày"
                      referrerPolicy="no-referrer"
                      onError={() => setJourneyImgErr(true)}
                      className="w-full h-24 sm:h-28 object-cover opacity-70"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-r from-[#060916]/95 via-[#091026]/75 to-transparent p-3.5 flex flex-col justify-end">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-300">
                      Hành Trình Tân Thủ 7 Ngày
                    </div>
                    <div className="font-display text-sm sm:text-base font-black text-white">
                      Hoàn Thành Ngày 7 Nhận Vũ Khí [S] Sử Thi Độc Quyền!
                    </div>
                  </div>
                </div>

                {/* Day 1..7 Selector */}
                <div className="grid grid-cols-7 gap-1.5">
                  {NOVICE_JOURNEY_DAYS.map((d) => {
                    const hasClaimable =
                      d.tasks.some(
                        (t) =>
                          getJourneyTaskCurrentValue(save, powerRating, t.metric) >= t.target &&
                          !journey.claimedTaskIds.includes(t.id)
                      ) ||
                      (d.tasks.every(
                        (t) => getJourneyTaskCurrentValue(save, powerRating, t.metric) >= t.target
                      ) &&
                        !journey.claimedDayMilestones.includes(d.day));
                    const dayDone = journey.claimedDayMilestones.includes(d.day);
                    const isSelected = d.day === journeyDay;

                    return (
                      <button
                        key={d.day}
                        type="button"
                        onClick={() => setJourneyDay(d.day)}
                        className={`relative py-2 rounded-xl text-[11px] font-mono-nums font-black cursor-pointer border transition-colors ${
                          isSelected
                            ? 'a2-yellow-btn'
                            : dayDone
                            ? 'bg-emerald-950/60 border-emerald-500/45 text-emerald-300'
                            : 'cel-panel text-slate-200 hover:border-amber-300'
                        }`}
                      >
                        <span>N.{d.day}</span>
                        {hasClaimable && (
                          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border border-white" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Selected Day Header & Tasks */}
                <div className="cel-panel rounded-2xl p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 border-b border-amber-400/20 pb-2">
                    <div>
                      <div className="font-display text-sm font-black text-amber-200">
                        {activeDayDef.title}
                      </div>
                      <div className="text-[11px] text-slate-300">{activeDayDef.subtitle}</div>
                    </div>
                    <span className="font-mono-nums text-xs font-black text-emerald-300 shrink-0">
                      {completedTasksInDay}/{activeDayDef.tasks.length} Xong
                    </span>
                  </div>

                  {activeDayDef.tasks.map((task) => {
                    const current = Math.min(
                      task.target,
                      getJourneyTaskCurrentValue(save, powerRating, task.metric)
                    );
                    const pct = Math.round((current / task.target) * 100);
                    const claimed = journey.claimedTaskIds.includes(task.id);
                    const ready = !claimed && current >= task.target;

                    return (
                      <div
                        key={task.id}
                        className="rounded-xl bg-[#070b1a] border border-amber-400/20 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-black text-white">{task.title}</div>
                          <div className="flex flex-wrap items-center gap-2.5 text-[10px] font-mono-nums mt-1">
                            <span className="text-amber-300 font-bold">+{task.rewardGold} V</span>
                            <span className="text-purple-300 font-bold">+{task.rewardGems} Ngọc</span>
                            <span className="text-sky-300 font-bold flex items-center gap-0.5">
                              <StarDustIcon className="w-3 h-3" />+{task.rewardDust}
                            </span>
                            <span className="text-slate-400">
                              ({current}/{task.target})
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-slate-950 mt-1.5 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-300 to-emerald-400"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          disabled={!ready}
                          onClick={() => onClaimJourneyTask(task.id)}
                          className={`px-3.5 py-2 rounded-xl text-[11px] font-black shrink-0 cursor-pointer ${
                            claimed
                              ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 cursor-default'
                              : ready
                              ? 'a2-yellow-btn'
                              : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          {claimed ? 'Đã Nhận' : ready ? 'Nhận' : 'Chưa Đạt'}
                        </button>
                      </div>
                    );
                  })}

                  {/* Day Milestone Chest */}
                  <div
                    className={`rounded-xl p-3 border flex flex-wrap items-center justify-between gap-2.5 ${
                      activeDayDef.milestoneGearS
                        ? 'bg-gradient-to-r from-[#2c1b0e] to-[#171236] border-amber-300/75'
                        : 'bg-[#0b132a] border-sky-400/35'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-black text-amber-200">
                        {activeDayDef.milestoneLabel}
                      </div>
                      <div className="text-[11px] font-mono-nums text-slate-300 mt-0.5">
                        +{activeDayDef.milestoneGold} Vàng · +{activeDayDef.milestoneGems} Ngọc · +
                        {activeDayDef.milestoneDust} Bụi Tinh Tú
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={!dayMilestoneReady}
                      onClick={() => onClaimJourneyDay(activeDayDef.day)}
                      className={`px-4 py-2 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer ${
                        dayMilestoneClaimed
                          ? 'bg-emerald-950/70 border border-emerald-500/40 text-emerald-300 cursor-default'
                          : dayMilestoneReady
                          ? 'a2-emerald-btn'
                          : 'bg-slate-900 border border-slate-800 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      {dayMilestoneClaimed && <Check className="w-3.5 h-3.5" />}
                      <span>
                        {dayMilestoneClaimed
                          ? 'Đã Mở Rương'
                          : dayMilestoneReady
                          ? 'Mở Rương Ngày'
                          : 'Xong 3 NV Để Mở'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};

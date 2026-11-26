import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Sparkles, X } from 'lucide-react';
import { soundEngine } from '../audio/soundEngine';
import type { LiveOpsConfig } from '../data/liveOpsConfig';
import { buildPlayerLiveOpsSchedule } from '../data/wave16TacticalAndLiveOps';

interface LiveOpsScheduleModalProps {
  liveOpsConfig: LiveOpsConfig;
  onClose: () => void;
}

export const LiveOpsScheduleModal: React.FC<LiveOpsScheduleModalProps> = ({
  liveOpsConfig,
  onClose,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearInterval(id);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose]);

  const schedule = buildPlayerLiveOpsSchedule(liveOpsConfig, nowMs);

  const statusColor =
    schedule.status === 'active'
      ? 'text-emerald-300'
      : schedule.status === 'upcoming'
        ? 'text-sky-300'
        : schedule.status === 'expired'
          ? 'text-slate-400'
          : 'text-amber-300';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="liveops-schedule-title"
      data-testid="liveops-schedule-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl max-h-[88vh] overflow-y-auto a2-scroll rounded-2xl bg-[#0d111a] border border-amber-400/35 shadow-2xl p-4 sm:p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-amber-300">
              <Calendar className="w-3.5 h-3.5" />
              <span>Lịch Sự Kiện Tinh Giới · Bản v{schedule.version}</span>
            </div>
            <h2
              id="liveops-schedule-title"
              className="font-display text-lg font-black text-white mt-0.5 text-balance"
            >
              {schedule.statusLabel}
            </h2>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">{schedule.headline}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            aria-label="Đóng Lịch Sự Kiện"
            className="w-8 h-8 rounded-lg bg-[#141b2d] border border-slate-700 hover:border-amber-300 text-slate-300 hover:text-white flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Countdowns Row (Zero-Pill, tabular-nums) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div className="rounded-xl bg-[#111726] border border-slate-800 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <Clock className="w-3.5 h-3.5 text-amber-300" />
              <span>Trạng Thái Sự Kiện</span>
            </div>
            <div className={`text-sm font-black font-mono-nums tabular-nums ${statusColor}`}>
              {schedule.countdownLabel}
            </div>
            <div className="text-[11px] text-slate-400">{schedule.balanceNote}</div>
          </div>

          <div className="rounded-xl bg-[#111726] border border-slate-800 p-3 space-y-1">
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-sky-300" />
              <span>Làm Mới Thử Thách Tuần ({schedule.weeklyResetWeekKey})</span>
            </div>
            <div className="text-sm font-black font-mono-nums tabular-nums text-sky-200">
              {schedule.weeklyResetCountdownLabel}
            </div>
            <div className="text-[11px] text-slate-400">
              Làm mới lúc 00:00 Thứ Hai hàng tuần (UTC).
            </div>
          </div>
        </div>

        {/* Maintenance Notice if present */}
        {schedule.maintenanceNotice && (
          <div className="rounded-xl bg-[#241118] border border-rose-500/45 p-3 text-xs text-rose-100">
            <div className="font-black uppercase text-[11px] text-rose-300 mb-0.5">
              Thông Báo Bảo Trì
            </div>
            {schedule.maintenanceNotice}
          </div>
        )}

        {/* Active Multipliers Table (Zero-Pill) */}
        <div className="rounded-xl bg-[#111726] border border-slate-800 p-3.5 space-y-2">
          <div className="text-xs font-black uppercase tracking-wider text-slate-200">
            Hệ Số Ưu Đãi Đang Áp Dụng
          </div>
          {schedule.activeBonuses.length > 0 ? (
            <div className="divide-y divide-slate-800/80">
              {schedule.activeBonuses.map((bonus) => (
                <div
                  key={bonus.key}
                  className="py-1.5 flex items-center justify-between gap-2 text-xs"
                >
                  <span className="text-slate-300 font-medium">{bonus.label}</span>
                  <span
                    className={`font-mono-nums tabular-nums font-black ${
                      bonus.tone === 'challenge'
                        ? 'text-rose-300'
                        : bonus.tone === 'gacha'
                          ? 'text-sky-300'
                          : 'text-emerald-300'
                    }`}
                  >
                    {bonus.value}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">
              Toàn bộ phần thưởng Vàng, Ngọc, Mảnh Rèn và sức mạnh Quái đang ở mức chuẩn 1.00× cân
              bằng mùa giải.
            </p>
          )}
        </div>

        {/* Recurring Seasonal Event Timeline */}
        <div className="rounded-xl bg-[#111726] border border-slate-800 p-3.5 space-y-2.5">
          <div className="text-xs font-black uppercase tracking-wider text-slate-200">
            Chu Kỳ Sự Kiện Luân Phiên
          </div>
          <div className="divide-y divide-slate-800/80">
            {schedule.upcomingEvents.map((ev) => (
              <div key={ev.id} className="py-2 first:pt-0 last:pb-0 space-y-0.5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-xs font-black text-white">
                    {ev.title}
                    {ev.isCurrent && (
                      <span className="ml-2 text-[11px] font-bold text-emerald-300">
                        · Đang kích hoạt
                      </span>
                    )}
                  </span>
                  <span className="text-[11px] font-mono-nums text-amber-300">
                    {ev.cadenceLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{ev.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

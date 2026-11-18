import React, { useEffect, useState } from 'react';
import { CheckCircle2, Clock, Compass, FastForward, Send, Sparkles, X } from 'lucide-react';
import dispatchBannerImg from '../assets/images/companion_dispatch_map_1795007597892.jpg';
import { HEROES, HERO_MAP } from '../data/heroesData';
import {
  DISPATCH_MISSIONS,
  DISPATCH_SPEEDUP_GOLD,
  getDispatchMissionDef,
  normalizeDispatchState,
} from '../data/wave8Data';
import { HeroId, SaveData } from '../types/game';
import {
  AwakenCrystalIcon,
  GoldCoinIcon,
  HeroCrestSvg,
  MountShardIcon,
  SoulGemIcon,
  WingFeatherIcon,
} from './GameIcons';

interface DispatchModalProps {
  save: SaveData;
  onStartDispatch: (slotIndex: number, missionId: string, heroId: HeroId) => void;
  onSpeedupDispatch: (slotIndex: number) => void;
  onClaimDispatch: (slotIndex: number) => void;
  onClose: () => void;
}

function formatCountdown(msLeft: number): string {
  const sec = Math.max(0, Math.ceil(msLeft / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export const DispatchModal: React.FC<DispatchModalProps> = ({
  save,
  onStartDispatch,
  onSpeedupDispatch,
  onClaimDispatch,
  onClose,
}) => {
  const [now, setNow] = useState<number>(() => Date.now());
  const [bannerError, setBannerError] = useState(false);
  const [activeSlotPicker, setActiveSlotPicker] = useState<number | null>(null);
  const [pickedMissionId, setPickedMissionId] = useState<string>(DISPATCH_MISSIONS[0].id);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const dispatch = normalizeDispatchState(save.dispatch);
  const busyHeroIds = new Set(
    dispatch.slots.filter((s) => s.missionId && s.heroId).map((s) => s.heroId as HeroId)
  );
  const idleHeroes = HEROES.filter(
    (h) => save.unlockedHeroes.includes(h.id) && !busyHeroIds.has(h.id)
  );

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-[#040611]/90">
      <div className="cel-panel-ornate w-full max-w-3xl max-h-[90vh] rounded-3xl flex flex-col overflow-hidden a2-modal-enter">
        {/* Header */}
        <div className="relative h-28 sm:h-32 shrink-0 overflow-hidden border-b border-amber-400/25">
          {!bannerError ? (
            <img
              src={dispatchBannerImg}
              alt="Phái Cử Đồng Hành Thám Hiểm"
              referrerPolicy="no-referrer"
              onError={() => setBannerError(true)}
              className="w-full h-full object-cover opacity-55"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-indigo-950 via-slate-900 to-amber-950" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#080d1e] via-[#080d1e]/60 to-transparent" />
          <div className="absolute inset-0 p-4 sm:p-5 flex items-end justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-300/60 text-[10px] font-black text-emerald-200 uppercase tracking-wider mb-1">
                <Compass className="w-3 h-3" />
                <span>Thám Hiểm Thụ Động · {dispatch.completedCount} Chuyến Hoàn Thành</span>
              </div>
              <h2 className="font-display text-lg sm:text-2xl font-black text-white">
                Phái Cử Đồng Hành Hoàng Đạo
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng Phái Cử"
              className="w-9 h-9 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-amber-300 flex items-center justify-center text-slate-200 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Expedition Slots */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {dispatch.slots.map((slot) => {
              const mission = getDispatchMissionDef(slot.missionId);
              const hero = slot.heroId ? HERO_MAP[slot.heroId] : null;
              const isFinished = Boolean(mission && slot.endsAt > 0 && now >= slot.endsAt);
              const msLeft = mission ? Math.max(0, slot.endsAt - now) : 0;
              const pct =
                mission && slot.endsAt > slot.startedAt
                  ? Math.min(100, Math.max(4, ((now - slot.startedAt) / (slot.endsAt - slot.startedAt)) * 100))
                  : 0;

              return (
                <div
                  key={slot.slotIndex}
                  className={`rounded-2xl p-3.5 border flex flex-col justify-between gap-3 ${
                    isFinished
                      ? 'bg-emerald-950/35 border-emerald-400/75 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
                      : mission
                      ? 'bg-[#090f24] border-sky-400/45'
                      : 'bg-[#070b1a] border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Đội Thám Hiểm #{slot.slotIndex + 1}
                    </span>
                    {mission && (
                      <span
                        className="px-1.5 py-0.5 rounded text-[9px] font-black border"
                        style={{
                          color: mission.accentColor,
                          borderColor: `${mission.accentColor}66`,
                          backgroundColor: `${mission.accentColor}1a`,
                        }}
                      >
                        Hạng {mission.rank}
                      </span>
                    )}
                  </div>

                  {mission && hero ? (
                    <>
                      <div className="flex items-center gap-2.5">
                        <HeroCrestSvg
                          heroId={hero.id}
                          accentHex={hero.accentHex}
                          cloakHex={hero.cloakHex}
                          hairHex={hero.hairHex}
                          className="w-10 h-10 shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-black text-white truncate">{mission.title}</div>
                          <div className="text-[11px] font-bold text-amber-200 truncate">
                            {hero.name} · {mission.region}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-mono-nums font-bold">
                          <span className="flex items-center gap-1 text-slate-300">
                            <Clock className="w-3 h-3 text-sky-300" />
                            <span>{isFinished ? 'Đã Hoàn Thành' : formatCountdown(msLeft)}</span>
                          </span>
                          <span className="text-emerald-300">{Math.round(pct)}%</span>
                        </div>
                        <div className="h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isFinished
                                ? 'bg-gradient-to-r from-emerald-400 to-lime-300'
                                : 'bg-gradient-to-r from-sky-500 to-amber-300'
                            }`}
                            style={{ width: `${isFinished ? 100 : pct}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono-nums font-bold text-slate-200 bg-slate-950/75 rounded-xl p-2 border border-slate-800">
                        <span className="flex items-center gap-0.5 text-amber-300">
                          <GoldCoinIcon className="w-3 h-3" />+{mission.rewardGold}
                        </span>
                        <span className="flex items-center gap-0.5 text-purple-300">
                          <SoulGemIcon className="w-3 h-3" />+{mission.rewardGems}
                        </span>
                        <span className="flex items-center gap-0.5 text-amber-200">
                          <MountShardIcon className="w-3 h-3" />+{mission.rewardMountShards}
                        </span>
                        <span className="flex items-center gap-0.5 text-rose-300">
                          <AwakenCrystalIcon className="w-3 h-3" />+{mission.rewardCrystals}
                        </span>
                        <span className="flex items-center gap-0.5 text-sky-300">
                          <WingFeatherIcon className="w-3 h-3" />+{mission.rewardFeathers}
                        </span>
                      </div>

                      {isFinished ? (
                        <button
                          type="button"
                          onClick={() => onClaimDispatch(slot.slotIndex)}
                          className="a2-emerald-btn w-full py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Nhận Thưởng</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={save.gold < DISPATCH_SPEEDUP_GOLD}
                          onClick={() => onSpeedupDispatch(slot.slotIndex)}
                          className="a2-yellow-btn disabled:opacity-45 w-full py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer"
                        >
                          <FastForward className="w-3.5 h-3.5" />
                          <span>Tăng Tốc ({DISPATCH_SPEEDUP_GOLD} Vàng)</span>
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center py-4 text-center gap-2.5">
                      <Sparkles className="w-7 h-7 text-slate-500" />
                      <div className="text-xs font-bold text-slate-400">
                        {idleHeroes.length > 0
                          ? `Có ${idleHeroes.length} Anh Hùng đang rảnh`
                          : 'Tất cả Anh Hùng đã xuất kích'}
                      </div>
                      <button
                        type="button"
                        disabled={idleHeroes.length === 0}
                        onClick={() => setActiveSlotPicker(slot.slotIndex)}
                        className="a2-yellow-btn disabled:opacity-40 py-2 px-3.5 rounded-xl font-black text-xs flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Chọn Phái Cử</span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Slot Mission + Hero Picker */}
          {activeSlotPicker !== null && (
            <div className="rounded-2xl p-4 bg-[#0b132b] border border-amber-400/55 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="font-display text-sm font-black text-amber-200">
                  Cử Đội #{activeSlotPicker + 1} · Chọn Tuyến Thám Hiểm &amp; Anh Hùng
                </div>
                <button
                  type="button"
                  onClick={() => setActiveSlotPicker(null)}
                  className="text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Đóng
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {DISPATCH_MISSIONS.map((m) => {
                  const selected = pickedMissionId === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setPickedMissionId(m.id)}
                      className={`text-left rounded-xl p-2.5 border transition-colors cursor-pointer ${
                        selected
                          ? 'bg-amber-400/15 border-amber-300 text-white'
                          : 'bg-slate-950/75 border-slate-800 text-slate-300 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 text-[10px] font-black mb-0.5">
                        <span style={{ color: m.accentColor }}>HẠNG {m.rank}</span>
                        <span className="font-mono-nums text-sky-300">{m.durationSec}s</span>
                      </div>
                      <div className="text-xs font-black truncate">{m.title}</div>
                      <div className="text-[10px] text-slate-400 mt-1 font-mono-nums">
                        +{m.rewardMountShards} Mảnh · +{m.rewardCrystals} Tinh Thể · +{m.rewardGems} Ngọc
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="text-[11px] font-bold text-slate-300">
                Chọn 1 Anh Hùng nhàn rỗi để xuất kích ngay:
              </div>
              <div className="flex flex-wrap gap-2">
                {idleHeroes.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => {
                      onStartDispatch(activeSlotPicker, pickedMissionId, h.id);
                      setActiveSlotPicker(null);
                    }}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-emerald-400 text-xs font-black text-white cursor-pointer"
                  >
                    <HeroCrestSvg
                      heroId={h.id}
                      accentHex={h.accentHex}
                      cloakHex={h.cloakHex}
                      hairHex={h.hairHex}
                      className="w-6 h-6 shrink-0"
                    />
                    <span>{h.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

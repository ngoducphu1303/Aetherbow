import React, { useEffect, useRef, useState } from 'react';
import { ArrowUp, Crown, Flame, Heart, Pause, Skull, Users, Volume2, VolumeX, Zap } from 'lucide-react';
import { SKILLS_CATALOG } from '../data/skillsData';
import { COOP_DIFFICULTY_MAP, ELEMENTAL_TOWER_MAP } from '../data/wave6Data';
import {
  FloatingDamage,
  HudSnapshot,
  JoystickState,
  SkillId,
} from '../types/game';
import { GoldCoinIcon, SoulGemIcon } from './GameIcons';

interface GameHUDProps {
  hud: HudSnapshot;
  muted: boolean;
  damages: FloatingDamage[];
  joystick: JoystickState;
  onToggleMute: () => void;
  onPause: () => void;
  onDashClick: () => void;
  onUltimateClick: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  muted,
  damages,
  joystick,
  onToggleMute,
  onPause,
  onDashClick,
  onUltimateClick,
}) => {
  const hpPct = Math.max(0, Math.min(100, (hud.hp / Math.max(1, hud.maxHp)) * 100));
  const shieldPct = Math.max(
    0,
    Math.min(100, (hud.shield / Math.max(1, hud.maxHp)) * 100)
  );
  const xpPct = Math.max(
    0,
    Math.min(100, (hud.xp / Math.max(1, hud.xpToNext)) * 100)
  );

  const [ghostPct, setGhostPct] = useState<number>(100);
  useEffect(() => {
    const t = window.setTimeout(() => {
      setGhostPct(hpPct);
    }, 260);
    return () => window.clearTimeout(t);
  }, [hpPct]);

  const bossHpPct = hud.bossName
    ? Math.max(0, Math.min(100, (hud.bossHp / Math.max(1, hud.bossMaxHp)) * 100))
    : 100;
  const [bossGhostPct, setBossGhostPct] = useState<number>(100);
  useEffect(() => {
    if (!hud.bossName) {
      setBossGhostPct(100);
      return;
    }
    const t = window.setTimeout(() => {
      setBossGhostPct(bossHpPct);
    }, 320);
    return () => window.clearTimeout(t);
  }, [bossHpPct, hud.bossName]);

  const lastHitRef = useRef<number>(0);
  const [damageFlashKey, setDamageFlashKey] = useState<number>(0);
  useEffect(() => {
    if (hud.lastPlayerHitAt > 0 && hud.lastPlayerHitAt !== lastHitRef.current) {
      lastHitRef.current = hud.lastPlayerHitAt;
      setDamageFlashKey(hud.lastPlayerHitAt);
    }
  }, [hud.lastPlayerHitAt]);

  const bossBannerStageRef = useRef<number>(-1);
  const [bossIntroTitle, setBossIntroTitle] = useState<string | null>(null);
  useEffect(() => {
    if (hud.isBossStage && hud.bossName && bossBannerStageRef.current !== hud.stage) {
      bossBannerStageRef.current = hud.stage;
      setBossIntroTitle(hud.bossName);
      const timer = window.setTimeout(() => setBossIntroTitle(null), 2650);
      return () => window.clearTimeout(timer);
    }
    if (!hud.isBossStage) {
      bossBannerStageRef.current = -1;
      setBossIntroTitle(null);
    }
    return undefined;
  }, [hud.isBossStage, hud.bossName, hud.stage]);

  const [inspectedSkillId, setInspectedSkillId] = useState<SkillId | null>(null);
  const skillEntries = Object.entries(hud.activeSkills) as Array<[SkillId, number]>;
  const dashReady = hud.dashCooldownRatio <= 0.02;
  const ultPct = Math.max(0, Math.min(100, Math.floor(hud.ultCharge)));
  const ultReady = ultPct >= 100;
  const inspectedSkill = inspectedSkillId ? SKILLS_CATALOG[inspectedSkillId] : null;

  const arenaOppHpPct = hud.isArenaMode
    ? Math.max(0, Math.min(100, ((hud.arenaOpponentHp ?? 0) / Math.max(1, hud.arenaOpponentMaxHp ?? 1)) * 100))
    : 100;

  return (
    <div className="fixed inset-0 z-10 pointer-events-none overflow-hidden">
      {/* Persistent Low-HP Pulsing Crimson Vignette (<=30% HP) */}
      {hpPct <= 30 && hud.hp > 0 && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none a2-lowhp-vignette"
          style={{
            boxShadow: 'inset 0 0 84px 20px rgba(225, 29, 72, 0.58)',
          }}
        />
      )}

      {/* Subtle Crimson Edge Vignette on Player Hit */}
      {damageFlashKey > 0 && (
        <div
          key={damageFlashKey}
          className="fixed inset-0 pointer-events-none a2-damage-flash"
          style={{
            boxShadow: 'inset 0 0 72px 18px rgba(244, 63, 94, 0.7)',
          }}
        />
      )}

      {/* Floating Damage Numbers (GPU animated arc & crit pop) */}
      {damages.map((d) => {
        const colorClass = d.isHeal
          ? 'text-emerald-300'
          : d.element === 'playerHit'
          ? 'text-rose-400'
          : d.isCrit
          ? 'text-amber-300'
          : d.element === 'fire'
          ? 'text-orange-400'
          : d.element === 'ice'
          ? 'text-cyan-300'
          : d.element === 'storm'
          ? 'text-purple-300'
          : d.element === 'poison'
          ? 'text-lime-400'
          : 'text-slate-100';

        const animClass = d.isCrit || d.label ? 'a2-crit-float' : 'a2-dmg-float';

        return (
          <div
            key={d.id}
            style={{
              left: `${d.x}px`,
              top: `${d.y}px`,
            }}
            className={`absolute font-mono-nums font-black drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] ${animClass} ${
              d.isCrit ? 'text-lg sm:text-xl' : 'text-xs sm:text-sm'
            } ${colorClass}`}
          >
            {d.label
              ? `${d.label} ${d.amount > 0 ? d.amount : ''}`
              : d.isHeal
              ? `+${d.amount}`
              : d.isCrit
              ? `${d.amount}!`
              : d.amount}
          </div>
        );
      })}

      {/* Virtual Joystick Ring */}
      {joystick.active && (
        <div
          style={{
            left: joystick.originX - 48,
            top: joystick.originY - 48,
          }}
          className="absolute w-24 h-24 rounded-full border-2 border-amber-300/60 bg-slate-950/35"
        >
          <div
            style={{
              transform: `translate(${joystick.currentX - joystick.originX + 32}px, ${
                joystick.currentY - joystick.originY + 32
              }px)`,
            }}
            className="w-8 h-8 rounded-full bg-amber-300/90 border-2 border-amber-100 shadow-lg"
          />
        </div>
      )}

      {/* TOP HUD BAR (Clean & Breathable) */}
      <div className="flex flex-col gap-2 px-3 sm:px-5 pt-3">
        <div className="flex items-center justify-between gap-2.5 max-w-5xl w-full mx-auto">
          {/* Top-Left: Pause + Level Medallion & XP Bar */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              type="button"
              onClick={onPause}
              aria-label="Tạm dừng"
              className="pointer-events-auto hv2-panel w-10 h-10 rounded-xl flex items-center justify-center text-slate-100 hover:border-amber-300 transition-colors cursor-pointer shrink-0"
            >
              <Pause className="w-4 h-4" />
            </button>

            <div className="hv2-panel rounded-2xl py-1.5 pr-3 pl-1.5 flex items-center gap-2 flex-1 max-w-[235px] min-w-0">
              <div className="hv2-lv w-8 h-8 rounded-xl flex items-center justify-center font-mono-nums font-black text-xs shrink-0">
                {hud.level}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-[10px] font-bold mb-1">
                  <span className="font-display text-amber-200 truncate">{hud.heroName}</span>
                  <span className="text-slate-300 font-mono-nums">
                    {hud.xp}/{hud.xpToNext}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-slate-950/95 border border-amber-400/20 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-cyan-300 transition-all duration-150"
                    style={{ width: `${xpPct}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Top-Center: Room / Tower / Boss Rush Counter + Room Progress Strip */}
          <div className="hv2-panel rounded-2xl px-3.5 sm:px-4 py-1.5 text-center shrink-0">
            <div className="font-display text-[11px] sm:text-xs font-black text-amber-200 font-mono-nums whitespace-nowrap flex items-center justify-center gap-1.5">
              {hud.portalOpen && <ArrowUp className="w-3.5 h-3.5 text-emerald-300 shrink-0" />}
              <span>
                {hud.isArenaMode
                  ? `Đấu Trường 1v1 · ${hud.arenaTimeLeft ?? 45}s`
                  : hud.isCoopRaidMode
                  ? `Co-op Raid · ${
                      hud.coopDifficulty === 'mythic'
                        ? 'Thần Thoại'
                        : hud.coopDifficulty === 'heroic'
                        ? 'Anh Hùng'
                        : 'Thường'
                    } · Ải ${hud.stage}/${hud.totalStages}`
                  : hud.isElementalTowerMode
                  ? `${ELEMENTAL_TOWER_MAP[hud.elementalTowerId ?? 'fire']?.name ?? 'Tháp Hệ'} · Tầng ${
                      hud.elementalTowerFloor ?? 1
                    }`
                  : hud.isGuildBossMode
                  ? `Boss Bang Hội · ${hud.guildBossTimeLeft ?? 60}s`
                  : hud.isDailyRiftMode
                  ? `Bí Cảnh · Ải ${hud.stage}/${hud.totalStages}`
                  : hud.isBossRushMode
                  ? `Săn Boss · Vòng ${hud.bossRushRound}/${hud.bossRushTotalRounds ?? 5}`
                  : hud.isTowerMode
                  ? `Tháp Vô Tận · Tầng ${hud.towerFloor}`
                  : `${hud.chapterName} · Phòng ${hud.stage}/${hud.totalStages}`}
              </span>
            </div>
            <div className="text-[10px] font-semibold text-slate-300 truncate max-w-[190px] sm:max-w-xs">
              {hud.isArenaMode
                ? `Đối thủ: ${hud.arenaOpponentName ?? 'Kình Địch'}`
                : hud.isGuildBossMode
                ? `Tổng ST: ${(hud.guildBossTotalDamage ?? 0).toLocaleString('vi-VN')}`
                : hud.portalOpen
                ? 'Cổng Bắc Đã Mở · Tiến Lên Phía Bắc!'
                : hud.isCoopRaidMode
                ? `Tổ Đội 3 Anh Hùng · Còn ${hud.enemiesRemaining} mục tiêu`
                : hud.isElementalTowerMode
                ? `+50% ST ${ELEMENTAL_TOWER_MAP[hud.elementalTowerId ?? 'fire']?.shortName ?? 'Hệ'} · Còn ${hud.enemiesRemaining} mục tiêu`
                : `${
                    hud.isTowerMode || hud.isBossRushMode || hud.isDailyRiftMode
                      ? ''
                      : `${hud.stageName} · `
                  }Còn ${hud.enemiesRemaining} mục tiêu`}
            </div>
            {!hud.isTowerMode && hud.totalStages > 1 && hud.totalStages <= 15 && (
              <div className="mt-1 flex items-center justify-center gap-1" aria-hidden="true">
                {Array.from({ length: hud.totalStages }).map((_, idx) => {
                  const num = idx + 1;
                  const done = num < hud.stage || (num === hud.stage && hud.portalOpen);
                  const cur = num === hud.stage && !hud.portalOpen;
                  return (
                    <span
                      key={num}
                      className={`h-1.5 rounded-full transition-all ${
                        cur
                          ? 'w-3.5 bg-amber-300'
                          : done
                          ? 'w-1.5 bg-emerald-400'
                          : num === hud.totalStages
                          ? 'w-2 bg-rose-400/75'
                          : 'w-1.5 bg-slate-700'
                      }`}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Top-Right: Loot Metrics & Mute */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <div className="hidden sm:flex items-center gap-3 hv2-panel rounded-xl px-3 py-2 text-xs font-mono-nums font-black text-white">
              <span className="flex items-center gap-1 text-amber-300">
                <GoldCoinIcon className="w-3.5 h-3.5" />
                <span>{hud.runGold}</span>
              </span>
              <span className="flex items-center gap-1 text-purple-300">
                <SoulGemIcon className="w-3.5 h-3.5" />
                <span>{hud.runGems}</span>
              </span>
              <span className="flex items-center gap-1 text-sky-300">
                <Skull className="w-3.5 h-3.5" />
                <span>{hud.kills}</span>
              </span>
            </div>

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
              className="pointer-events-auto hv2-panel w-10 h-10 rounded-xl flex items-center justify-center text-slate-100 hover:border-amber-300 transition-colors cursor-pointer shrink-0"
            >
              {muted ? (
                <VolumeX className="w-4 h-4 text-slate-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-amber-300" />
              )}
            </button>
          </div>
        </div>

        {/* Arena 1v1 Duel VS Bar */}
        {hud.isArenaMode && (
          <div className="w-full max-w-lg mx-auto rounded-2xl px-4 py-2.5 bg-[#110a24]/95 border border-amber-400/65 shadow-2xl">
            <div className="flex items-center justify-between gap-2 text-xs font-black mb-1.5">
              <span className="text-emerald-300 truncate">
                {hud.heroName} ({Math.round(hpPct)}%)
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-400/50 font-mono-nums text-[11px] text-amber-300 shrink-0">
                VS · {hud.arenaTimeLeft ?? 45}s
              </span>
              <span className="text-rose-300 truncate text-right">
                {hud.arenaOpponentName ?? 'Đối Thủ'} ({Math.round(arenaOppHpPct)}%)
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-2.5 rounded-full bg-slate-950 border border-emerald-400/30 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-lime-400 transition-all duration-150"
                  style={{ width: `${hpPct}%` }}
                />
              </div>
              <div className="h-2.5 rounded-full bg-slate-950 border border-rose-400/30 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-l from-rose-500 to-amber-400 transition-all duration-150 ml-auto"
                  style={{ width: `${arenaOppHpPct}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Cinematic 2-Layer Boss HP Bar */}
        {hud.bossName && !hud.isArenaMode && (
          <div
            className={`w-full max-w-md mx-auto rounded-2xl px-4 py-2 shadow-2xl border ${
              hud.bossPhase === 2
                ? 'bg-[#240713]/95 border-amber-400 shadow-[0_0_24px_rgba(244,63,94,0.45)]'
                : 'bg-[#170914]/95 border-rose-500/70'
            }`}
          >
            <div className="flex items-center justify-between gap-2 text-xs font-black mb-1.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="font-display text-rose-100 tracking-wide truncate">
                  {hud.bossName}
                </span>
                {hud.bossPhase === 2 && (
                  <span className="px-1.5 py-0.5 rounded bg-rose-600/90 border border-amber-300/80 text-[9px] font-black text-amber-100 whitespace-nowrap">
                    PHA II · CUỒNG NỘ
                  </span>
                )}
              </div>
              <span className="font-mono-nums text-rose-200 shrink-0">
                {hud.isGuildBossMode
                  ? `${hud.guildBossTimeLeft ?? 60}s · ${(hud.guildBossTotalDamage ?? 0).toLocaleString('vi-VN')} ST`
                  : `${Math.max(0, hud.bossHp)} / ${hud.bossMaxHp}`}
              </span>
            </div>
            <div className="hv2-boss-track">
              <div
                className="h-full bg-amber-300/55 absolute top-0 left-0 transition-all duration-500"
                style={{ width: `${Math.max(bossHpPct, bossGhostPct)}%` }}
              />
              <div
                className={`h-full relative z-[1] transition-all duration-100 ${
                  hud.bossPhase === 2
                    ? 'bg-gradient-to-r from-red-600 via-orange-500 to-amber-300'
                    : 'bg-gradient-to-r from-rose-600 via-rose-500 to-amber-400'
                }`}
                style={{ width: `${bossHpPct}%` }}
              />
            </div>
          </div>
        )}
        {/* Co-op AI Allies Live Strip & Elemental Tower Affinity Banner */}
        {hud.isCoopRaidMode && hud.coopAllies && hud.coopAllies.length > 0 && (
          <div className="max-w-5xl w-full mx-auto flex flex-wrap items-center justify-start gap-2 pointer-events-none">
            {hud.coopAllies.map((ally) => {
              const allyUlt = Math.max(0, Math.min(100, Math.round(ally.ultCharge)));
              return (
                <div
                  key={ally.heroId}
                  className="hv2-panel rounded-xl px-2.5 py-1.5 border border-sky-400/40 min-w-[155px]"
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-black">
                    <span className="flex items-center gap-1 text-sky-200 truncate">
                      <Users className="w-3 h-3 text-sky-300 shrink-0" />
                      <span>{ally.name}</span>
                    </span>
                    <span className="font-mono-nums text-amber-300 shrink-0">
                      {ally.damage.toLocaleString('vi-VN')} ST
                    </span>
                  </div>
                  <div className="mt-1 flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 rounded-full bg-slate-950 overflow-hidden border border-sky-400/20">
                      <div
                        className="h-full bg-gradient-to-r from-sky-400 to-amber-300 transition-all duration-150"
                        style={{ width: `${allyUlt}%` }}
                      />
                    </div>
                    <span className="font-mono-nums text-[9px] font-bold text-slate-300">
                      {allyUlt}%
                    </span>
                  </div>
                </div>
              );
            })}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#070b1a]/90 border border-amber-400/30 text-[10px] font-black text-amber-200">
              <span>{COOP_DIFFICULTY_MAP[hud.coopDifficulty ?? 'normal']?.badge}</span>
            </div>
          </div>
        )}

        {hud.isElementalTowerMode && (
          <div className="max-w-5xl w-full mx-auto flex justify-start pointer-events-none">
            <div
              className={`hv2-panel rounded-xl px-3 py-1 border ${
                ELEMENTAL_TOWER_MAP[hud.elementalTowerId ?? 'fire']?.borderClass ?? 'border-amber-400/40'
              } text-[10px] font-black flex items-center gap-1.5`}
            >
              <Flame
                className={`w-3.5 h-3.5 ${
                  ELEMENTAL_TOWER_MAP[hud.elementalTowerId ?? 'fire']?.accentTextClass ?? 'text-orange-300'
                }`}
              />
              <span
                className={
                  ELEMENTAL_TOWER_MAP[hud.elementalTowerId ?? 'fire']?.accentTextClass ?? 'text-orange-300'
                }
              >
                Cộng Hưởng +50% Sát Thương Hệ {ELEMENTAL_TOWER_MAP[hud.elementalTowerId ?? 'fire']?.shortName}
              </span>
            </div>
          </div>
        )}

        {/* Top-Right Tactical Arena Mini-Radar + Live Combo Chain */}
        <div className="max-w-5xl w-full mx-auto flex items-start justify-end gap-2.5 pointer-events-none">
          {hud.comboCount >= 2 && (
            <div
              key={hud.comboCount}
              className="a2-combo-pop hv2-panel rounded-2xl px-3.5 py-2 border-amber-300/60 min-w-[146px]"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-mono-nums text-lg sm:text-xl font-black text-amber-300 leading-none">
                  ×{hud.comboCount}
                </span>
                <span
                  className={`text-[10px] font-black tracking-wider ${
                    hud.comboCount >= 50
                      ? 'text-rose-300'
                      : hud.comboCount >= 30
                      ? 'text-amber-200'
                      : 'text-sky-300'
                  }`}
                >
                  {hud.comboTierLabel || 'LIÊN KÍCH'}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-950 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 transition-all duration-75"
                  style={{ width: `${Math.round(hud.comboTimerRatio * 100)}%` }}
                />
              </div>
            </div>
          )}

          {hud.radarData && (
            <div
              aria-hidden="true"
              className="hidden sm:block relative w-[86px] h-[86px] rounded-2xl bg-[#050814]/90 border border-amber-400/45 shadow-xl overflow-hidden shrink-0"
            >
              {/* Grid Crosshairs */}
              <div className="absolute inset-y-0 left-1/2 w-px bg-amber-300/10" />
              <div className="absolute inset-x-0 top-1/2 h-px bg-amber-300/10" />
              {/* North Portal Beacon */}
              <span
                className={`absolute top-1 left-1/2 -translate-x-1/2 w-4 h-1.5 rounded-full ${
                  hud.radarData.portalOpen
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : 'bg-slate-600/70'
                }`}
              />
              {/* Enemy Blips */}
              {hud.radarData.enemies.map((en, idx) => (
                <span
                  key={idx}
                  style={{
                    left: `${50 + en.x * 42}%`,
                    top: `${50 + en.z * 42}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${
                    en.isBoss
                      ? 'w-2.5 h-2.5 bg-amber-300 ring-2 ring-rose-500'
                      : en.isElite
                      ? 'w-2 h-2 bg-purple-400'
                      : 'w-1.5 h-1.5 bg-rose-400'
                  }`}
                />
              ))}
              {/* Player Dot */}
              <span
                style={{
                  left: `${50 + hud.radarData.playerX * 42}%`,
                  top: `${50 + hud.radarData.playerZ * 42}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-emerald-300 border border-white shadow-[0_0_8px_#34d399]"
              />
            </div>
          )}
        </div>
      </div>

      {/* Boss Intro Warning Banner */}
      {bossIntroTitle && (
        <div className="mt-4 flex justify-center px-4">
          <div className="a2-boss-intro w-full max-w-md rounded-2xl bg-gradient-to-r from-[#240814]/95 via-[#3f0b20]/95 to-[#240814]/95 border border-amber-300/75 px-5 py-3 shadow-[0_0_28px_rgba(244,63,94,0.5)] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/25 border border-amber-300/70 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
                Cảnh Báo · Thủ Lĩnh Xuất Hiện
              </div>
              <div className="font-display text-base sm:text-lg font-black text-white truncate">
                {bossIntroTitle}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stage / Room Clear Banner */}
      {!bossIntroTitle && hud.stageBannerText && (
        <div className="mt-4 flex justify-center px-4">
          <div
            className={`px-5 py-2 rounded-2xl border font-display text-xs sm:text-sm font-black shadow-2xl tracking-wide ${
              hud.portalOpen
                ? 'bg-[#081d18]/95 border-emerald-400/70 text-emerald-200'
                : 'bg-[#0a1026]/95 border-amber-300/60 text-amber-200'
            }`}
          >
            {hud.stageBannerText}
          </div>
        </div>
      )}

      {/* BOTTOM PERIMETER: Interactive Active Skills + Sleek Vitals + Dual Action Medallions */}
      <div className="fixed bottom-3.5 left-3 right-3 sm:left-6 sm:right-6 flex items-end justify-between gap-2.5">
        {/* Interactive Active Skill Chips */}
        <div className="relative flex flex-col items-start gap-1.5 max-w-[140px] sm:max-w-xs">
          {inspectedSkill && (
            <div className="pointer-events-auto cel-panel-ornate rounded-xl px-3 py-2 text-[11px] w-56 shadow-2xl">
              <div className="flex items-center justify-between gap-2">
                <span className="font-display font-black text-amber-200 truncate">
                  {inspectedSkill.name}
                </span>
                <button
                  type="button"
                  onClick={() => setInspectedSkillId(null)}
                  className="text-[10px] font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  Đóng
                </button>
              </div>
              <p className="text-slate-300 mt-1 leading-snug">{inspectedSkill.description}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-1">
            {skillEntries.slice(0, 8).map(([id, count]) => {
              const def = SKILLS_CATALOG[id];
              if (!def) return null;
              const active = inspectedSkillId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setInspectedSkillId(active ? null : id)}
                  title={`${def.name}: ${def.description}`}
                  className={`pointer-events-auto hv2-panel px-2 py-1 rounded-lg text-[10px] font-bold text-slate-100 flex items-center gap-1 cursor-pointer transition-colors ${
                    active ? 'border-amber-300' : 'hover:border-amber-400/60'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-xs shrink-0"
                    style={{ backgroundColor: def.accentColor }}
                  />
                  <span className="hidden sm:inline truncate max-w-[100px]">{def.name}</span>
                  {count > 1 && (
                    <span className="font-mono-nums text-amber-300 font-black">×{count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Center Player Vitals Bar */}
        <div className="hv2-panel rounded-2xl px-3.5 py-2 w-full max-w-[265px] mx-auto">
          <div className="flex items-center justify-between text-[11px] font-black mb-1">
            <span className="flex items-center gap-1.5 text-rose-200">
              <Heart className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="font-mono-nums">
                {hud.hp} / {hud.maxHp}
              </span>
              {hud.shield > 0 && (
                <span className="text-sky-300 font-mono-nums">(+{hud.shield})</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              {hud.revivesLeft > 0 && (
                <span className="text-amber-300 font-mono-nums text-[10px]">
                  Hồi sinh ×{hud.revivesLeft}
                </span>
              )}
              <span className="font-mono-nums text-slate-300">{Math.round(hpPct)}%</span>
            </div>
          </div>

          <div className="relative h-2.5 w-full rounded-full bg-slate-950/95 border border-amber-400/25 overflow-hidden">
            <div
              className="h-full bg-rose-300/40 absolute top-0 left-0 transition-all duration-500"
              style={{ width: `${Math.max(hpPct, ghostPct)}%` }}
            />
            <div
              className={`h-full relative z-[1] transition-all duration-150 ${
                hpPct > 55
                  ? 'bg-gradient-to-r from-emerald-500 to-lime-400'
                  : hpPct > 28
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                  : 'bg-gradient-to-r from-rose-600 to-rose-400'
              }`}
              style={{ width: `${hpPct}%` }}
            />
            {shieldPct > 0 && (
              <div
                className="h-full bg-sky-400/80 absolute top-0 left-0 z-[2] transition-all duration-150"
                style={{ width: `${shieldPct}%` }}
              />
            )}
          </div>
        </div>

        {/* Dual Action Medallions: Ultimate (Q) + Dash (Space) */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative shrink-0">
            {ultReady && (
              <span
                aria-hidden="true"
                className="a2-ult-ready-ring absolute -inset-1 rounded-full border-2 border-dashed border-amber-300/90 pointer-events-none"
              />
            )}
            <button
              type="button"
              disabled={!ultReady}
              onClick={onUltimateClick}
              title={hud.ultName}
              className={`pointer-events-auto relative overflow-hidden w-[62px] h-[62px] sm:w-[68px] sm:h-[68px] rounded-full flex flex-col items-center justify-center font-black transition-transform shrink-0 ${
                ultReady
                  ? 'a2-purple-btn cursor-pointer shadow-[0_0_26px_rgba(251,191,36,0.65)] hover:scale-105'
                  : 'hv2-panel text-slate-300 cursor-not-allowed'
              }`}
            >
              {!ultReady && (
                <span
                  className="absolute inset-x-0 bottom-0 bg-purple-500/35 pointer-events-none"
                  style={{ height: `${ultPct}%` }}
                />
              )}
              <Flame
                className={`w-5 h-5 relative z-[1] ${
                  ultReady ? 'text-amber-300' : 'text-purple-300'
                }`}
              />
              <span className="font-mono-nums text-[10px] leading-tight mt-0.5 relative z-[1]">
                {ultReady ? 'CHIÊU Q' : `${ultPct}%`}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={onDashClick}
            className={`pointer-events-auto relative overflow-hidden w-[62px] h-[62px] sm:w-[68px] sm:h-[68px] rounded-full flex flex-col items-center justify-center font-black cursor-pointer shrink-0 transition-transform ${
              dashReady
                ? 'a2-emerald-btn shadow-[0_0_22px_rgba(52,211,153,0.55)] hover:scale-105'
                : 'hv2-panel text-slate-400'
            }`}
          >
            {!dashReady && (
              <span
                className="absolute inset-x-0 bottom-0 bg-emerald-500/25 pointer-events-none"
                style={{ height: `${Math.max(0, 100 - hud.dashCooldownRatio * 100)}%` }}
              />
            )}
            <Zap
              className={`w-5 h-5 relative z-[1] ${
                dashReady ? 'text-amber-200' : 'text-slate-400'
              }`}
            />
            <span className="font-mono-nums text-[10px] leading-tight mt-0.5 relative z-[1]">
              {dashReady ? 'LƯỚT' : `${Math.ceil(hud.dashCooldownRatio * 100)}%`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};

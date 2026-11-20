import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowUp,
  Bot,
  Compass,
  Crosshair,
  Crown,
  Feather,
  Flame,
  Gamepad2,
  Gem,
  Heart,
  Lock,
  LogOut,
  Moon,
  Pause,
  RotateCcw,
  Shield,
  Skull,
  Sparkles,
  Trophy,
  Users,
  Volume2,
  VolumeX,
  Zap,
} from 'lucide-react';
import { SKILLS_CATALOG, SKILL_SYNERGY_MAP } from '../data/skillsData';
import { COOP_DIFFICULTY_MAP, ELEMENTAL_TOWER_MAP } from '../data/wave6Data';
import { getComboTierMeta } from '../data/wave12Data';
import { computeComboStyleRank } from '../engine/aaaCombatDirector';
import { resolveHudScaleFactor } from '../engine/aaaWave4Director';
import {
  formatKeybindShortLabel,
  normalizeCombatKeybinds,
} from '../engine/aaaWave6Director';
import { yawToRadarDegrees } from '../engine/combatFeel';
import {
  AiAutoPilotTactic,
  ChampionshipTacticId,
  CombatKeybinds,
  FloatingDamage,
  HudScaleMode,
  HudSnapshot,
  CoopTacticalOrder,
  JoystickState,
  LoadoutPreset,
  LoadoutPresetSlotId,
  SkillId,
  TrainingTargetMode,
} from '../types/game';
import { COOP_TACTICAL_ORDERS } from '../engine/wave5CombatSystems';
import { getStyleRewardBonusPct } from '../engine/wave7CombatSystems';
import { GoldCoinIcon, SoulGemIcon } from './GameIcons';

interface GameHUDProps {
  hud: HudSnapshot;
  muted: boolean;
  damages: FloatingDamage[];
  joystick: JoystickState;
  hudScale?: HudScaleMode;
  liveDpsMeter?: boolean;
  showFpsOverlay?: boolean;
  keybinds?: Partial<CombatKeybinds>;
  onToggleMute: () => void;
  onPause: () => void;
  onDashClick: () => void;
  onActiveSkillClick?: () => void;
  onUltimateClick: () => void;
  onToggleAutoPilot?: () => void;
  onSelectAutoPilotTactic?: (tactic: AiAutoPilotTactic) => void;
  onSetCoopTacticalOrder?: (order: CoopTacticalOrder) => void;
  onSelectChampionshipTactic?: (tacticId: ChampionshipTacticId) => void;
  loadoutPresets?: LoadoutPreset[];
  activeLoadoutPresetId?: LoadoutPresetSlotId | null;
  onTrainingTargetMode?: (mode: TrainingTargetMode) => void;
  onTrainingReset?: () => void;
  onTrainingLoadoutSwitch?: (slotId: LoadoutPresetSlotId) => void;
  onTrainingExit?: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hud,
  muted,
  damages,
  joystick,
  hudScale = 'normal',
  liveDpsMeter = false,
  showFpsOverlay = false,
  keybinds,
  onToggleMute,
  onPause,
  onDashClick,
  onActiveSkillClick,
  onUltimateClick,
  onToggleAutoPilot,
  onSelectAutoPilotTactic,
  onSetCoopTacticalOrder,
  onSelectChampionshipTactic,
  loadoutPresets,
  activeLoadoutPresetId,
  onTrainingTargetMode,
  onTrainingReset,
  onTrainingLoadoutSwitch,
  onTrainingExit,
}) => {
  const hudScaleFactor = resolveHudScaleFactor(hudScale);
  const activeKeybinds = normalizeCombatKeybinds(keybinds);
  const dashKeyLabel = formatKeybindShortLabel(activeKeybinds.dash);
  const activeSkillKeyLabel = formatKeybindShortLabel(activeKeybinds.activeSkill);
  const ultKeyLabel = formatKeybindShortLabel(activeKeybinds.ultimate);
  const pauseKeyLabel = formatKeybindShortLabel(activeKeybinds.pause);
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
  const bossTotalLayers = Math.max(1, hud.bossLayers ?? 1);
  const bossCurLayer = Math.max(1, Math.min(bossTotalLayers, hud.bossCurrentLayer ?? 1));
  const bossLayerFrac = hud.bossName
    ? Math.max(0, Math.min(100, ((bossHpPct / 100) * bossTotalLayers - (bossCurLayer - 1)) * 100))
    : 100;
  const bossPrevLayerRef = useRef<number>(bossCurLayer);
  const [bossLayerGhostPct, setBossLayerGhostPct] = useState<number>(100);
  useEffect(() => {
    if (!hud.bossName) {
      setBossLayerGhostPct(100);
      bossPrevLayerRef.current = 1;
      return;
    }
    if (bossCurLayer !== bossPrevLayerRef.current) {
      // Layer broke -> flash ghost from full layer down to current fraction smoothly
      bossPrevLayerRef.current = bossCurLayer;
      setBossLayerGhostPct(100);
    }
    const t = window.setTimeout(() => {
      setBossLayerGhostPct(bossLayerFrac);
    }, 340);
    return () => window.clearTimeout(t);
  }, [bossLayerFrac, bossCurLayer, hud.bossName]);

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
  const activeSkillCdRatio = Math.max(0, Math.min(1, hud.activeSkillCooldownRatio ?? 0));
  const activeSkillReady = hud.activeSkillReady ?? activeSkillCdRatio <= 0.01;
  const activeSkillCdSec = Math.max(0, hud.activeSkillCooldownSec ?? 0);
  const ultPct = Math.max(0, Math.min(100, Math.floor(hud.ultCharge)));
  const ultReady = ultPct >= 100;
  const inspectedSkill = inspectedSkillId ? SKILLS_CATALOG[inspectedSkillId] : null;

  const arenaOppHpPct = hud.isArenaMode
    ? Math.max(0, Math.min(100, ((hud.arenaOpponentHp ?? 0) / Math.max(1, hud.arenaOpponentMaxHp ?? 1)) * 100))
    : 100;

  const cinematicBarRatio = Math.max(0, Math.min(1, hud.cinematicBarRatio ?? 0));

  return (
    <div className="fixed inset-0 z-10 pointer-events-none overflow-hidden">
      {/* AAA Wave 2: Cinematic Letterbox Framing Bars (Boss Intro & Execution Slow-Mo) */}
      {cinematicBarRatio > 0.01 && (
        <>
          <div
            aria-hidden="true"
            className="fixed top-0 left-0 right-0 h-10 sm:h-12 bg-[#02040a] origin-top pointer-events-none z-[18] border-b border-amber-400/20"
            style={{
              transform: `scaleY(${cinematicBarRatio})`,
              opacity: Math.min(0.96, cinematicBarRatio * 1.15),
            }}
          />
          <div
            aria-hidden="true"
            className="fixed bottom-0 left-0 right-0 h-10 sm:h-12 bg-[#02040a] origin-bottom pointer-events-none z-[18] border-t border-amber-400/20"
            style={{
              transform: `scaleY(${cinematicBarRatio})`,
              opacity: Math.min(0.96, cinematicBarRatio * 1.15),
            }}
          />
        </>
      )}

      {/* AAA Wave 2: Boss Execution Slow-Mo Finisher Callout */}
      {(hud.bossFinisherTimer ?? 0) > 0 && hud.bossFinisherName && (
        <div className="fixed inset-x-0 top-[24%] z-[20] flex justify-center px-4 pointer-events-none">
          <div className="aaa-finisher-banner px-7 py-3 rounded-2xl border-y-2 border-amber-300 bg-[#14050b]/92 shadow-[0_0_48px_rgba(251,191,36,0.55)] text-center">
            <div className="text-[10px] font-black uppercase tracking-[0.34em] text-amber-300">
              KẾT LIỄU HOÀNG ĐẠO
            </div>
            <div className="font-display text-2xl sm:text-3xl font-black text-white tracking-wider mt-0.5">
              {hud.bossFinisherName}
            </div>
          </div>
        </div>
      )}

      {/* AAA Wave 3: Non-Blocking Hero Ultimate Cut-In Strip */}
      {(hud.ultCutinTimer ?? 0) > 0 && hud.ultCutinTitle && (
        <div className="fixed inset-x-0 top-[15%] z-[19] flex justify-center px-4 pointer-events-none">
          <div
            className="aaa-ult-cutin-strip px-6 py-2.5 rounded-xl border-y-2 bg-[#070b1a]/92 shadow-[0_0_36px_rgba(251,191,36,0.45)] flex items-center gap-3.5"
            style={{ borderColor: hud.ultCutinAccentHex || '#fbbf24' }}
          >
            <Zap
              className="w-5 h-5 shrink-0"
              style={{ color: hud.ultCutinAccentHex || '#fde047' }}
            />
            <div className="text-left">
              <div className="text-[10px] font-black uppercase tracking-[0.26em] text-amber-300">
                TUYỆT KỸ · {hud.ultCutinHeroName || hud.heroName}
              </div>
              <div className="font-display text-lg sm:text-xl font-black text-white tracking-wide leading-tight">
                {hud.ultCutinTitle}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AAA Wave 3: Boss Phase II / III Atmosphere Shift Flash */}
      {(hud.bossPhaseShiftTimer ?? 0) > 0 && hud.bossPhaseShiftLevel && (
        <div
          key={`phase-shift-${hud.bossPhaseShiftLevel}`}
          aria-hidden="true"
          className="fixed inset-0 z-[17] pointer-events-none aaa-phase-shift-flash"
          style={{
            boxShadow:
              hud.bossPhaseShiftLevel === 3
                ? 'inset 0 0 110px 28px rgba(244, 63, 94, 0.72)'
                : 'inset 0 0 96px 24px rgba(245, 158, 11, 0.62)',
          }}
        />
      )}

      {/* AAA Wave 3: Screen-Edge Directional Threat Arrows (up to 4 prioritized vectors) */}
      {hud.edgeThreats && hud.edgeThreats.length > 0 && (
        <div
          aria-hidden="true"
          className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(78vw,460px)] h-[min(64vh,420px)] pointer-events-none z-[12]"
        >
          {hud.edgeThreats.map((threat, idx) => {
            const rad = ((threat.angleDeg - 90) * Math.PI) / 180;
            const leftPct = 50 + Math.cos(rad) * 46;
            const topPct = 50 + Math.sin(rad) * 46;
            const isHigh = threat.severity === 'high' || threat.kind === 'boss_charge';
            return (
              <div
                key={`threat-${idx}-${threat.kind}`}
                className="absolute -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  transform: `translate(-50%, -50%) rotate(${threat.angleDeg}deg)`,
                }}
              >
                <svg width={isHigh ? 24 : 18} height={isHigh ? 24 : 18} viewBox="0 0 24 24">
                  <polygon
                    points="12,2 21,19 12,14 3,19"
                    fill={isHigh ? '#fb7185' : '#fbbf24'}
                    stroke="#090d1e"
                    strokeWidth="1.5"
                    opacity={isHigh ? '0.94' : '0.76'}
                  />
                </svg>
              </div>
            );
          })}
        </div>
      )}

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

      {/* Perfect Dodge Kinetic Edge Sheen (Active Counter-Strike Buff) */}
      {(hud.perfectDodgeBuffTimer ?? 0) > 0 && (
        <div
          aria-hidden="true"
          className="fixed inset-0 pointer-events-none transition-opacity duration-200"
          style={{
            boxShadow: 'inset 0 0 68px 14px rgba(16, 185, 129, 0.34)',
          }}
        />
      )}

      {/* Subtle Crimson Edge Vignette + Diegetic Directional Hit Arc on Player Hit */}
      {damageFlashKey > 0 && (
        <>
          <div
            key={damageFlashKey}
            aria-hidden="true"
            className="fixed inset-0 pointer-events-none a2-damage-flash"
            style={{
              boxShadow: 'inset 0 0 72px 18px rgba(244, 63, 94, 0.7)',
            }}
          />
          {hud.lastHitAngleDeg !== undefined && hud.lastHitAngleDeg !== null && (
            <div
              key={`arc-${damageFlashKey}`}
              aria-hidden="true"
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 sm:w-64 sm:h-64 pointer-events-none a2-damage-flash"
            >
              <svg
                viewBox="0 0 200 200"
                className="w-full h-full"
                style={{ transform: `rotate(${hud.lastHitAngleDeg}deg)` }}
              >
                <path
                  d="M 64 24 A 84 84 0 0 1 136 24"
                  fill="none"
                  stroke="#fb7185"
                  strokeWidth="7"
                  strokeLinecap="round"
                  opacity="0.92"
                />
                <polygon points="100,10 92,22 108,22" fill="#fda4af" />
              </svg>
            </div>
          )}
        </>
      )}

      {/* Floating Damage Numbers (Clean AAA elemental typography & crit pop) */}
      {damages.map((d) => {
        const colorClass = d.isHeal
          ? 'text-emerald-300'
          : d.element === 'playerHit'
          ? 'text-rose-400'
          : d.isSuperCrit
          ? 'text-amber-200'
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

        const animClass = d.isSuperCrit
          ? 'a2-supercrit-float'
          : d.isCrit || d.label
          ? 'a2-crit-float'
          : 'a2-dmg-float';

        const shadowStyle = d.isSuperCrit
          ? '0 2px 6px rgba(0,0,0,0.98), 0 0 18px rgba(251,191,36,0.95)'
          : d.isCrit
          ? '0 2px 5px rgba(0,0,0,0.95), 0 0 10px rgba(245,158,11,0.65)'
          : '0 2px 4px rgba(0,0,0,0.96)';

        return (
          <div
            key={d.id}
            style={{
              left: `${d.x}px`,
              top: `${d.y}px`,
              textShadow: shadowStyle,
            }}
            className={`absolute font-mono-nums font-black leading-none select-none ${animClass} ${
              d.isSuperCrit
                ? 'text-xl sm:text-2xl tracking-tight'
                : d.isCrit
                ? 'text-base sm:text-xl'
                : 'text-xs sm:text-sm'
            } ${colorClass}`}
          >
            {d.isSuperCrit && !d.label && (
              <span className="block text-[9px] font-display tracking-[0.18em] text-amber-300/95 uppercase mb-0.5 text-center">
                BẠO ĐỈNH
              </span>
            )}
            <span>
              {d.label
                ? `${d.label} ${d.amount > 0 ? d.amount : ''}`
                : d.isHeal
                ? `+${d.amount}`
                : d.isSuperCrit
                ? `${d.amount}!!`
                : d.isCrit
                ? `${d.amount}!`
                : d.amount}
            </span>
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
      <div
        className="flex flex-col gap-2 px-3 sm:px-5 pt-3"
        style={
          hudScaleFactor !== 1
            ? { transform: `scale(${hudScaleFactor})`, transformOrigin: 'top center' }
            : undefined
        }
      >
        <div className="flex items-center justify-between gap-2.5 max-w-5xl w-full mx-auto">
          {/* Top-Left: Pause + Level Medallion & XP Bar */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <button
              type="button"
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onPause();
              }}
              title={`Tạm dừng [${pauseKeyLabel}]`}
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
              {hud.portalOpen ? (
                <ArrowUp className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              ) : hud.isBossStage ? (
                <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              ) : (
                <Compass className="w-3.5 h-3.5 text-amber-300/90 shrink-0" />
              )}
              <span>
                {hud.isTrainingMode
                  ? 'Sân Tập 3D · Đo DPS Thực Chiến'
                  : hud.isSkyCitadelMode
                  ? `Không Chiến Tinh Giới 3D · ${hud.skyCitadelTimeLeft ?? 75}s`
                  : hud.isDragonLairMode
                  ? `Lãnh Địa Rồng Cổ 3D · ${hud.dragonTimeLeft ?? 75}s`
                  : hud.isCrystalVaultMode
                  ? `Hầm Mỏ Pha Lê 3D · ${hud.vaultTimeLeft ?? 60}s`
                  : hud.isChampionshipMode
                  ? `Giải Đấu Quán Quân · Hiệp ${hud.championshipRound ?? 1}/${hud.championshipTotalRounds ?? 3}`
                  : hud.isArenaMode
                  ? `Đấu Trường 1v1 · ${hud.arenaTimeLeft ?? 45}s`
                  : hud.isPantheonMode
                  ? `Điện Thần 3D · Tầng ${hud.pantheonStage ?? 1}/${hud.pantheonTotalStages ?? 3}`
                  : hud.isGuildWarMode
                  ? `Chiến Trường Bang · ${hud.guildWarTimeLeft ?? 75}s`
                  : hud.isAbyssalMode
                  ? `Hố Sâu Đột Biến · Đợt ${hud.abyssalWave ?? 1}/${hud.abyssalTotalWaves ?? 10}`
                  : hud.isBloodMoonMode
                  ? `Đêm Trăng Máu · ${hud.bloodMoonTimeLeft ?? 90}s`
                  : hud.isCrystalDefenseMode
                  ? `Thủ Thành Pha Lê · Đợt ${hud.crystalWave ?? 1}/${hud.crystalTotalWaves ?? 6}`
                  : hud.isWorldBossMode
                  ? `Boss Thế Giới · ${hud.worldBossTimeLeft ?? 60}s`
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
              {hud.isTrainingMode
                ? hud.trainingTargetMode === 'aoe'
                  ? '3 Mục Tiêu (Đa Mục Tiêu) · Miễn Phí Thử Build'
                  : '1 Mục Tiêu (Boss Chuẩn) · Miễn Phí Thử Build'
                : hud.isSkyCitadelMode
                ? `Đợt Không Chiến ${hud.skyCitadelWave ?? 1}/3 · Điểm ${(hud.skyCitadelScore ?? 0).toLocaleString('vi-VN')} · +${hud.skyCitadelFeathersLooted ?? 0} Lông Vũ`
                : hud.isDragonLairMode
                ? `Pha ${hud.dragonPhase ?? 1}/3 · Vảy Rồng +${hud.dragonScalesLooted ?? 0} · ST ${(hud.dragonDamageDealt ?? 0).toLocaleString('vi-VN')}`
                : hud.isCrystalVaultMode
                ? `Trụ Phá: ${hud.vaultPillarsBroken ?? 0} · Đợt ${hud.vaultWave ?? 1} · +${hud.vaultGemsLooted ?? 0} Ngọc`
                : hud.isChampionshipMode
                ? `${hud.championshipRivalName ?? 'Quán Quân'} · Điểm: ${(hud.championshipScore ?? 0).toLocaleString('vi-VN')}`
                : hud.isArenaMode
                ? `Đối thủ: ${hud.arenaOpponentName ?? 'Kình Địch'}`
                : hud.isPantheonMode
                ? `${hud.pantheonBlessingTitle ?? 'Chúc Phúc'} · Điểm: ${(hud.pantheonScore ?? 0).toLocaleString('vi-VN')}`
                : hud.isGuildWarMode
                ? `Trụ Chiếm: ${hud.guildWarNodes ?? 0}/3 · Điểm: ${(hud.guildWarScore ?? 0).toLocaleString('vi-VN')}`
                : hud.isAbyssalMode
                ? `Điểm Hố Sâu: ${(hud.abyssalScore ?? 0).toLocaleString('vi-VN')} · Còn ${hud.enemiesRemaining} quái`
                : hud.isBloodMoonMode
                ? `Đợt ${hud.bloodMoonWave ?? 1} · Huyết Tinh: ${(hud.bloodMoonScore ?? 0).toLocaleString('vi-VN')}`
                : hud.isCrystalDefenseMode
                ? `Bảo vệ Pha Lê · Còn ${hud.enemiesRemaining} quái công thành`
                : hud.isWorldBossMode
                ? `Sát thương: ${(hud.worldBossTotalDamage ?? 0).toLocaleString('vi-VN')} · Hạng #${hud.worldBossRank ?? 9}`
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
                      : `${hud.stageName.replace(/\s*·\s*Phòng\s+\d+$/i, '')} · `
                  }Còn ${hud.enemiesRemaining} mục tiêu`}
            </div>
            {!hud.isTowerMode && !hud.isTrainingMode && hud.totalStages > 1 && hud.totalStages <= 15 && (
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
              tabIndex={-1}
              onClick={(e) => {
                e.currentTarget.blur();
                onToggleMute();
              }}
              title={muted ? 'Bật âm thanh [M]' : 'Tắt âm thanh [M]'}
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

        {/* Pillar 5A: 1-Tap Real-Time AI Auto-Pilot Bar + 3 Tactics + Optional Diagnostics */}
        <div className="max-w-5xl w-full mx-auto flex justify-end items-center gap-2 flex-wrap pointer-events-auto">
          {!hud.isTrainingMode && onToggleAutoPilot && (
            <div className="inline-flex items-center gap-1.5 bg-[#060a18]/92 border border-sky-400/35 rounded-xl px-2 py-1">
              <button
                type="button"
                data-autopilot-toggle="true"
                disabled={Boolean(hud.autoPilotLockedReason)}
                onClick={onToggleAutoPilot}
                title={hud.autoPilotLockedReason || 'Bật/Tắt AI Tự Chơi né đòn Boss 1 chạm'}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black whitespace-nowrap cursor-pointer transition-colors disabled:opacity-55 disabled:cursor-not-allowed ${
                  hud.autoPilotLockedReason
                    ? 'bg-slate-900 text-slate-400 border border-slate-700'
                    : hud.autoPilotEnabled
                    ? 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/60'
                    : 'bg-slate-900 text-slate-200 border border-slate-700 hover:border-sky-400/50'
                }`}
              >
                {hud.autoPilotLockedReason ? (
                  <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                ) : (
                  <Bot className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                )}
                <span>
                  {hud.autoPilotLockedReason
                    ? 'Khóa AI (Tính Hạng)'
                    : hud.autoPilotEnabled
                    ? 'AI Tự Chơi: BẬT'
                    : 'AI Tự Chơi'}
                </span>
              </button>

              {hud.autoPilotEnabled && !hud.autoPilotLockedReason && onSelectAutoPilotTactic && (
                <div className="inline-flex items-center gap-1 pl-1 border-l border-slate-700/80">
                  {(
                    [
                      { id: 'aggressive', label: 'Công' },
                      { id: 'balanced', label: 'Cân Bằng' },
                      { id: 'evasive', label: 'Né' },
                    ] as Array<{ id: AiAutoPilotTactic; label: string }>
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onSelectAutoPilotTactic(t.id)}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-black whitespace-nowrap cursor-pointer ${
                        (hud.autoPilotTactic ?? 'balanced') === t.id
                          ? 'bg-amber-400/25 text-amber-200 border border-amber-300/60'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              )}

              {hud.autoPilotEnabled && hud.autoPilotStatusText && (
                <span className="hidden md:inline text-[10px] font-semibold text-sky-200 pl-1.5 border-l border-slate-700/80 whitespace-nowrap">
                  {hud.autoPilotStatusText}
                </span>
              )}
            </div>
          )}

          {hud.isWeeklyBossPracticeMode && (
            <div className="inline-flex items-center gap-1.5 bg-[#060a18]/92 border border-sky-400/40 rounded-lg px-2.5 py-1 text-[11px] font-bold text-sky-200 whitespace-nowrap">
              <span>Tập Boss Tuần · Không Tốn Lượt</span>
            </div>
          )}

          {hud.isCoopRaidMode && hud.coopRoleSynergyLabel && (
            <div className="inline-flex items-center gap-1.5 bg-[#060a18]/92 border border-emerald-400/40 rounded-lg px-2.5 py-1 text-[11px] font-bold text-emerald-200 whitespace-nowrap">
              <Users className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
              <span>{hud.coopRoleSynergyLabel}</span>
            </div>
          )}

          {liveDpsMeter && !hud.isTrainingMode && (
            <div className="inline-flex items-center gap-2.5 bg-[#060a18]/90 border border-amber-400/25 rounded-lg px-2.5 py-1 text-[11px] font-mono-nums font-bold text-slate-200">
              <span className="text-amber-300">
                DPS 5s: {(hud.liveDps5s ?? 0).toLocaleString('vi-VN')}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-rose-300">
                Chí Mạng Đỉnh: {(hud.livePeakCrit ?? 0).toLocaleString('vi-VN')}
              </span>
              {(hud.elementalReactionsCount ?? 0) > 0 && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-sky-300">Phản Ứng ×{hud.elementalReactionsCount}</span>
                </>
              )}
            </div>
          )}

          {showFpsOverlay && typeof hud.fps === 'number' && (
            <div className="inline-flex items-center gap-1.5 bg-[#060a18]/90 border border-sky-400/30 rounded-lg px-2.5 py-1 text-[11px] font-mono-nums font-bold text-slate-200">
              <span
                className={
                  hud.fps >= 55
                    ? 'text-emerald-300'
                    : hud.fps >= 40
                    ? 'text-amber-300'
                    : 'text-rose-300'
                }
              >
                {hud.fps} FPS
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-slate-300">
                {(hud.frameTimeMs ?? 16.7).toFixed(1)}ms
              </span>
              {typeof hud.perfSimHz === 'number' && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-sky-300">{hud.perfSimHz}Hz</span>
                </>
              )}
              {typeof hud.perfDrawCalls === 'number' && (
                <>
                  <span className="text-slate-600">·</span>
                  <span className="text-amber-200">{hud.perfDrawCalls} DC</span>
                </>
              )}
            </div>
          )}
        </div>

        {/* AAA Wave 6: 1-Line Optional Tactical Room Bounty Strip & Camera Preset Toast */}
        {!hud.isTrainingMode && (hud.roomBountyBanner || hud.roomBounty) && (
          <div className="max-w-3xl w-full mx-auto flex justify-center">
            {hud.roomBountyBanner ? (
              <div className="inline-flex items-center gap-2 bg-[#161006]/92 border-b border-amber-300/80 rounded-lg px-3.5 py-1 text-[11px] font-black text-amber-200 whitespace-nowrap shadow-[0_0_18px_rgba(251,191,36,0.35)]">
                <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="font-mono-nums">{hud.roomBountyBanner}</span>
              </div>
            ) : hud.roomBounty && hud.roomBounty.status === 'active' ? (
              <div className="inline-flex items-center gap-2 bg-[#060a18]/88 border border-amber-400/25 rounded-lg px-3 py-0.5 text-[11px] font-semibold text-slate-200 max-w-full overflow-hidden">
                <span className="text-amber-300 font-black shrink-0">Thử Thách</span>
                <span className="text-slate-600">·</span>
                <span className="truncate">{hud.roomBounty.title}</span>
                <span className="text-slate-600">·</span>
                <span className="font-mono-nums font-bold text-cyan-300 shrink-0">
                  {hud.roomBounty.progressLabel}
                </span>
                <span className="hidden sm:inline text-slate-600">·</span>
                <span className="hidden sm:inline font-mono-nums text-amber-200/90 shrink-0">
                  {hud.roomBounty.rewardLabel}
                </span>
              </div>
            ) : null}
          </div>
        )}

        {hud.cameraPresetToast && (
          <div className="mx-auto inline-flex items-center gap-1.5 bg-[#060a18]/92 border border-sky-400/45 rounded-lg px-3 py-0.5 text-[11px] font-bold text-sky-200 whitespace-nowrap">
            <Compass className="w-3.5 h-3.5 text-sky-300 shrink-0" />
            <span>{hud.cameraPresetToast}</span>
          </div>
        )}

        {/* AAA Wave 7: 1-Line Boss Weak-Point Exposure & Resonance Trap Detonation Cues */}
        {hud.bossWeakPointActive && (
          <div className="mx-auto inline-flex items-center gap-2 bg-[#1a1204]/95 border border-amber-300/80 rounded-lg px-3.5 py-1 text-[11px] font-black text-amber-200 whitespace-nowrap shadow-[0_0_20px_rgba(251,191,36,0.4)]">
            <Crosshair className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>ĐIỂM YẾU THỦ LĨNH LỘ DIỆN</span>
            <span className="text-amber-500/70">·</span>
            <span className="font-mono-nums text-cyan-200">
              {(hud.bossWeakPointTimer ?? 0).toFixed(1)}s
            </span>
          </div>
        )}

        {hud.trapTriggerToast && (
          <div className="mx-auto inline-flex items-center gap-1.5 bg-[#061420]/94 border border-cyan-300/65 rounded-lg px-3.5 py-0.5 text-[11px] font-bold text-cyan-100 whitespace-nowrap">
            <Zap className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
            <span>{hud.trapTriggerToast}</span>
          </div>
        )}

        {/* Phase 5: Nightmare Ascension Active Mutator Line (clean unboxed text strip) */}
        {(hud.nightmareTier ?? 0) > 0 && !hud.isTrainingMode && (
          <div className="mx-auto max-w-xl rounded-xl px-3.5 py-1 bg-[#180912]/95 border border-rose-400/45 text-[11px] font-bold text-rose-200 flex items-center justify-center gap-2 whitespace-nowrap overflow-hidden">
            <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <span className="truncate font-mono-nums">
              Ác Mộng {['', 'I', 'II', 'III', 'IV', 'V'][hud.nightmareTier ?? 0] ?? hud.nightmareTier}
              {hud.nightmareMutatorLabels && hud.nightmareMutatorLabels.length > 0
                ? ` · ${hud.nightmareMutatorLabels.join(' · ')}`
                : ''}
            </span>
          </div>
        )}

        {/* Phase 5 + Wave 6: Perfect Dodge Tactical & Counter-Window Strip (zero-blur) */}
        {(hud.counterChargesRemaining ?? 0) > 0 ? (
          <div className="mx-auto rounded-xl px-3.5 py-1 bg-[#1b1204]/95 border border-amber-300/80 text-[11px] font-black text-amber-100 flex items-center justify-center gap-2 whitespace-nowrap shadow-[0_0_22px_rgba(251,191,36,0.45)]">
            <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="font-mono-nums tabular-nums">
              PHẢN KÍCH HOÀNG KIM ×{hud.counterChargesRemaining} · +65% ST CHÍ MẠNG XUYÊN ·{' '}
              {(hud.counterWindowRemainingSec ?? 0).toFixed(1)}s
            </span>
          </div>
        ) : (hud.perfectDodgeBannerTimer ?? 0) > 0 ? (
          <div className="mx-auto rounded-xl px-3.5 py-1 bg-[#071b28]/95 border border-cyan-300/75 text-[11px] font-black text-cyan-100 flex items-center justify-center gap-2 whitespace-nowrap shadow-[0_0_20px_rgba(34,211,238,0.45)]">
            <Sparkles className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
            <span className="font-mono-nums">
              NÉ HOÀN HẢO · +20% Sát Thương · -2s Hồi Chiêu E · +12% Tuyệt Kỹ
            </span>
          </div>
        ) : null}

        {/* Wave 6 Pillar 4: Live Boss Split Pace HUD (Weekly & Weekend Boss) */}
        {hud.bossPace && (
          <div className="mx-auto rounded-xl px-3.5 py-1 bg-[#060a18]/94 border border-amber-400/35 text-[11px] font-bold text-slate-200 flex items-center justify-center gap-2.5 whitespace-nowrap">
            <span className="text-slate-400">So với {hud.bossPace.referenceLabel}:</span>
            <span
              className={`font-mono-nums tabular-nums font-black ${
                hud.bossPace.ahead ? 'text-emerald-300' : 'text-amber-300'
              }`}
            >
              {hud.bossPace.deltaSec <= 0
                ? `${hud.bossPace.deltaSec.toFixed(1)}s`
                : `+${hud.bossPace.deltaSec.toFixed(1)}s`}
            </span>
            <span className="text-slate-600">·</span>
            <span className="font-mono-nums tabular-nums text-sky-200">
              {(hud.bossPace.elapsedMs / 1000).toFixed(1)}s
            </span>
            <div className="hidden sm:flex items-center gap-1 pl-1 border-l border-slate-700/80">
              {(['75%', '50%', '25%', '0%'] as const).map((cpLabel, idx) => {
                const reached = hud.bossPace?.splitsMs[idx] != null;
                return (
                  <span
                    key={cpLabel}
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono-nums tabular-nums ${
                      reached
                        ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/45'
                        : 'bg-slate-900/90 text-slate-500 border border-slate-800'
                    }`}
                  >
                    {cpLabel}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Phase 5: 3D Training Grounds Live DPS Panel (solid dark obsidian, zero backdrop-blur) */}
        {hud.isTrainingMode && (
          <div className="max-w-5xl w-full mx-auto flex flex-col sm:flex-row sm:items-start justify-between gap-2.5 pt-1">
            <div className="pointer-events-auto rounded-2xl bg-[#070b1a]/95 border border-amber-400/35 px-3.5 py-2.5 w-full sm:w-auto sm:min-w-[280px] shadow-xl">
              <div className="flex items-center justify-between gap-3 border-b border-amber-400/15 pb-1.5 mb-2">
                <span className="text-[11px] font-black text-amber-200 flex items-center gap-1.5 whitespace-nowrap">
                  <Crosshair className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span>Đo Sát Thương Thực Chiến (5s)</span>
                </span>
                <span className="text-[10px] font-semibold text-slate-400 font-mono-nums whitespace-nowrap">
                  {hud.trainingHits ?? 0} đòn
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <div className="text-[10px] font-bold text-slate-400">DPS 5 giây</div>
                  <div className="text-base font-black text-amber-300 font-mono-nums">
                    {(hud.trainingDps5s ?? 0).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400">DPS Đỉnh</div>
                  <div className="text-base font-black text-emerald-300 font-mono-nums">
                    {(hud.trainingPeakDps ?? 0).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400">Tổng ST</div>
                  <div className="text-sm font-black text-white font-mono-nums">
                    {(hud.trainingTotalDamage ?? 0).toLocaleString('vi-VN')}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-slate-400">Chí Mạng</div>
                  <div className="text-sm font-black text-sky-300 font-mono-nums">
                    {hud.trainingCritRatePct ?? 0}%
                  </div>
                </div>
              </div>
            </div>

            <div className="pointer-events-auto rounded-2xl bg-[#070b1a]/95 border border-amber-400/30 p-2 flex flex-wrap items-center gap-1.5 shadow-xl">
              {onTrainingTargetMode && (
                <>
                  <button
                    type="button"
                    onClick={() => onTrainingTargetMode('single')}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      (hud.trainingTargetMode ?? 'single') === 'single'
                        ? 'bg-amber-400/20 border-amber-300 text-amber-200'
                        : 'bg-[#0c1328] border-slate-700 text-slate-300 hover:border-amber-400/50'
                    }`}
                  >
                    1 Mục Tiêu (Boss)
                  </button>
                  <button
                    type="button"
                    onClick={() => onTrainingTargetMode('aoe')}
                    className={`px-2.5 py-1.5 rounded-xl text-[11px] font-black border whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                      hud.trainingTargetMode === 'aoe'
                        ? 'bg-amber-400/20 border-amber-300 text-amber-200'
                        : 'bg-[#0c1328] border-slate-700 text-slate-300 hover:border-amber-400/50'
                    }`}
                  >
                    3 Mục Tiêu (AoE)
                  </button>
                </>
              )}

              {onTrainingLoadoutSwitch && loadoutPresets && loadoutPresets.length > 0 && (
                <div className="flex items-center gap-1 pl-1 border-l border-slate-700/80">
                  {loadoutPresets.map((preset) => {
                    const isActive = activeLoadoutPresetId === preset.slotId;
                    return (
                      <button
                        key={preset.slotId}
                        type="button"
                        onClick={() => onTrainingLoadoutSwitch(preset.slotId)}
                        className={`px-2 py-1.5 rounded-xl text-[10px] font-black border whitespace-nowrap shrink-0 cursor-pointer ${
                          isActive
                            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200'
                            : 'bg-[#0c1328] border-slate-700 text-slate-300 hover:border-amber-300'
                        }`}
                      >
                        {preset.name}
                      </button>
                    );
                  })}
                </div>
              )}

              {onTrainingReset && (
                <button
                  type="button"
                  onClick={onTrainingReset}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-black bg-[#0c1328] border border-sky-400/40 text-sky-200 hover:border-sky-300 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>Đặt Lại</span>
                </button>
              )}

              {onTrainingExit && (
                <button
                  type="button"
                  onClick={onTrainingExit}
                  className="px-2.5 py-1.5 rounded-xl text-[11px] font-black bg-rose-500/20 border border-rose-400/55 text-rose-100 hover:bg-rose-500/30 flex items-center gap-1 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Thoát</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Wave 14: Sky Citadel Aerial Arena 3D Live Progress Strip */}
        {hud.isSkyCitadelMode && (
          <div className="w-full max-w-lg mx-auto rounded-2xl px-4 py-2 bg-[#07162a]/95 border border-sky-400/75 shadow-2xl">
            <div className="flex items-center justify-between gap-2 text-xs font-black mb-1">
              <span className="flex items-center gap-1.5 text-sky-200 truncate">
                <Feather className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span>Không Chiến Tinh Giới · Đợt {hud.skyCitadelWave ?? 1}/3</span>
              </span>
              <span className="font-mono-nums text-amber-300 shrink-0">
                {(hud.skyCitadelScore ?? 0).toLocaleString('vi-VN')} điểm · +{hud.skyCitadelFeathersLooted ?? 0} Lông Vũ · {hud.skyCitadelTimeLeft ?? 75}s
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-950 border border-sky-400/40 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-sky-500 via-cyan-300 to-amber-300 transition-all duration-300"
                style={{
                  width: `${Math.max(0, Math.min(100, ((hud.skyCitadelTimeLeft ?? 0) / 75) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Wave 13: Ancient Dragon Lair 3D Live Strip & Crimson Breath Warning */}
        {hud.isDragonLairMode && (
          <div className="w-full max-w-lg mx-auto space-y-1.5">
            <div className="rounded-2xl px-4 py-2 bg-[#1e080d]/95 border border-rose-400/75 shadow-2xl">
              <div className="flex items-center justify-between gap-2 text-xs font-black mb-1">
                <span className="flex items-center gap-1.5 text-rose-200">
                  <Flame className="w-3.5 h-3.5 text-orange-400" />
                  <span>Lãnh Địa Rồng Cổ · Pha {hud.dragonPhase ?? 1}/3</span>
                </span>
                <span className="font-mono-nums text-amber-300">
                  Vảy Rồng +{hud.dragonScalesLooted ?? 0} · {hud.dragonTimeLeft ?? 75}s
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-950 border border-rose-500/40 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-rose-600 via-orange-500 to-amber-300 transition-all duration-300"
                  style={{
                    width: `${Math.max(0, Math.min(100, ((hud.dragonTimeLeft ?? 0) / 75) * 100))}%`,
                  }}
                />
              </div>
            </div>
            {hud.dragonBreathWarning && (
              <div className="rounded-xl px-4 py-1.5 bg-gradient-to-r from-rose-700/95 via-red-600/95 to-orange-600/95 border border-amber-300 text-center text-xs font-black uppercase tracking-wider text-white shadow-[0_0_24px_rgba(244,63,94,0.85)]">
                CẢNH BÁO HƠI THỞ RỒNG CỔ · LƯỚT NÉ KHỎI VÙNG ĐỎ NGAY!
              </div>
            )}
          </div>
        )}

        {/* Arena 1v1 Duel VS Bar */}
        {hud.isArenaMode && (
          <div
            className={`w-full max-w-lg mx-auto rounded-2xl px-4 py-2.5 bg-[#110a24]/95 border shadow-2xl ${
              hud.isArenaEqualized ? 'border-emerald-400/70' : 'border-amber-400/65'
            }`}
          >
            {hud.isArenaEqualized && (
              <div className="flex items-center justify-center gap-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-300 mb-1">
                <Shield className="w-3 h-3 shrink-0" />
                <span>Chế Độ Công Bằng · Cân Bằng Chỉ Số · +35% Xu Đấu Trường</span>
              </div>
            )}
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

        {/* Blood Moon Survival Top Progress Strip */}
        {hud.isBloodMoonMode && (
          <div className="w-full max-w-md mx-auto rounded-2xl px-4 py-2 bg-[#23060f]/95 border border-rose-500/75 shadow-2xl">
            <div className="flex items-center justify-between gap-2 text-xs font-black mb-1">
              <span className="flex items-center gap-1.5 text-rose-200">
                <Moon className="w-3.5 h-3.5 text-rose-400" />
                <span>Đêm Trăng Máu · Đợt {hud.bloodMoonWave ?? 1}</span>
              </span>
              <span className="font-mono-nums text-amber-300">
                {(hud.bloodMoonScore ?? 0).toLocaleString('vi-VN')} Huyết Tinh · {hud.bloodMoonTimeLeft ?? 90}s
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-950 border border-rose-500/35 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-rose-600 via-pink-500 to-amber-300 transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, ((hud.bloodMoonTimeLeft ?? 0) / 90) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {/* Abyssal Gauntlet Top Progress Strip */}
        {hud.isAbyssalMode && (
          <div className="w-full max-w-md mx-auto rounded-2xl px-4 py-2 bg-[#160826]/95 border border-purple-400/75 shadow-2xl">
            <div className="flex items-center justify-between gap-2 text-xs font-black mb-1">
              <span className="flex items-center gap-1.5 text-purple-200">
                <Skull className="w-3.5 h-3.5 text-purple-300" />
                <span>Hố Sâu Đột Biến · Đợt {hud.abyssalWave ?? 1}/{hud.abyssalTotalWaves ?? 10}</span>
              </span>
              <span className="font-mono-nums text-amber-300">
                {(hud.abyssalScore ?? 0).toLocaleString('vi-VN')} Điểm
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-950 border border-purple-500/35 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-amber-300 transition-all duration-300"
                style={{
                  width: `${Math.max(
                    5,
                    Math.min(100, ((hud.abyssalWave ?? 1) / Math.max(1, hud.abyssalTotalWaves ?? 10)) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Guild War Top Citadel Progress Strip */}
        {hud.isGuildWarMode && (
          <div className="w-full max-w-md mx-auto rounded-2xl px-4 py-2 bg-[#06181a]/95 border border-emerald-400/75 shadow-2xl">
            <div className="flex items-center justify-between gap-2 text-xs font-black mb-1">
              <span className="flex items-center gap-1.5 text-emerald-200">
                <Shield className="w-3.5 h-3.5 text-emerald-300" />
                <span>Chiến Trường Bang · Trụ {hud.guildWarNodes ?? 0}/3</span>
              </span>
              <span className="font-mono-nums text-amber-300">
                {(hud.guildWarScore ?? 0).toLocaleString('vi-VN')} Điểm · {hud.guildWarTimeLeft ?? 75}s
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-950 border border-emerald-500/35 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-amber-300 transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, ((hud.guildWarTimeLeft ?? 0) / 75) * 100))}%` }}
              />
            </div>
          </div>
        )}

        {/* Wave 12: Crystal Vault 3D Raid Live Loot Strip */}
        {hud.isCrystalVaultMode && (
          <div className="w-full max-w-md mx-auto rounded-2xl px-4 py-2 bg-[#161029]/95 border border-amber-300/80 shadow-2xl">
            <div className="flex items-center justify-between gap-2 text-xs font-black mb-1">
              <span className="flex items-center gap-1.5 text-amber-200 truncate">
                <Gem className="w-3.5 h-3.5 text-yellow-300 shrink-0" />
                <span>
                  Hầm Mỏ Pha Lê · Đợt {hud.vaultWave ?? 1} · Phá {hud.vaultPillarsBroken ?? 0} Trụ
                </span>
              </span>
              <span className="font-mono-nums text-yellow-300 shrink-0">
                {hud.vaultTimeLeft ?? 60}s
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-950 border border-amber-400/35 overflow-hidden mb-1.5">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-300 to-cyan-300 transition-all duration-300"
                style={{
                  width: `${Math.max(0, Math.min(100, ((hud.vaultTimeLeft ?? 0) / 60) * 100))}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono-nums font-black text-slate-200">
              <span className="text-purple-300">+{hud.vaultGemsLooted ?? 0} Ngọc Hồn</span>
              <span className="text-orange-300">+{hud.vaultReforgeLooted ?? 0} Đá Đúc</span>
              <span className="text-amber-300">+{hud.vaultShardsLooted ?? 0} Mảnh Thần Binh</span>
            </div>
          </div>
        )}

        {/* Wave 11: Championship 3-Round Progress Strip */}
        {hud.isChampionshipMode && (
          <div className="w-full max-w-md mx-auto rounded-2xl px-4 py-2 bg-[#1c1028]/95 border border-amber-300/80 shadow-2xl">
            <div className="flex items-center justify-between gap-2 text-xs font-black mb-1">
              <span className="flex items-center gap-1.5 text-amber-200 truncate">
                <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate">
                  Giải Đấu Quán Quân 3D · Hiệp {hud.championshipRound ?? 1}/{hud.championshipTotalRounds ?? 3}
                </span>
              </span>
              <span className="font-mono-nums text-emerald-300 shrink-0">
                {(hud.championshipScore ?? 0).toLocaleString('vi-VN')} Điểm
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-950 border border-amber-400/35 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-rose-400 transition-all duration-300"
                style={{
                  width: `${Math.max(
                    15,
                    Math.min(
                      100,
                      ((hud.championshipRound ?? 1) / Math.max(1, hud.championshipTotalRounds ?? 3)) * 100
                    )
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Celestial Pantheon Boss Expedition Progress Strip */}
        {hud.isPantheonMode && (
          <div className="w-full max-w-md mx-auto rounded-2xl px-4 py-2 bg-[#1a1105]/95 border border-amber-300/80 shadow-2xl">
            <div className="flex items-center justify-between gap-2 text-xs font-black mb-1">
              <span className="flex items-center gap-1.5 text-amber-200 truncate">
                <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate">
                  Điện Thần 3D · Tầng {hud.pantheonStage ?? 1}/{hud.pantheonTotalStages ?? 3} ({hud.pantheonBlessingTitle ?? 'Chúc Phúc'})
                </span>
              </span>
              <span className="font-mono-nums text-emerald-300 shrink-0">
                {(hud.pantheonScore ?? 0).toLocaleString('vi-VN')} Điểm
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-950 border border-amber-400/35 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-300 transition-all duration-300"
                style={{
                  width: `${Math.max(
                    15,
                    Math.min(100, ((hud.pantheonStage ?? 1) / Math.max(1, hud.pantheonTotalStages ?? 3)) * 100)
                  )}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Cinematic Multi-Layer Boss HP Bar */}
        {hud.bossName && !hud.isArenaMode && (() => {
          const totalLayers = Math.max(1, hud.bossLayers ?? 1);
          const curLayer = Math.max(1, Math.min(totalLayers, hud.bossCurrentLayer ?? 1));
          const layerFrac = Math.max(
            0,
            Math.min(100, ((bossHpPct / 100) * totalLayers - (curLayer - 1)) * 100)
          );
          const layerPalette = [
            'from-rose-600 via-rose-500 to-amber-400',
            'from-amber-500 via-orange-400 to-yellow-300',
            'from-emerald-500 via-teal-400 to-cyan-300',
            'from-sky-500 via-blue-400 to-indigo-300',
            'from-purple-600 via-fuchsia-500 to-pink-300',
          ];
          const underPalette = [
            'bg-slate-950/90',
            'bg-rose-700/75',
            'bg-amber-600/75',
            'bg-emerald-600/75',
            'bg-sky-600/75',
          ];
          const barGrad =
            hud.bossPhase === 3
              ? 'from-amber-400 via-rose-500 to-red-700'
              : hud.bossPhase === 2 && curLayer === 1
              ? 'from-red-600 via-orange-500 to-amber-300'
              : layerPalette[(curLayer - 1) % layerPalette.length];
          const underBg =
            curLayer > 1 ? underPalette[(curLayer - 1) % underPalette.length] : 'bg-slate-950/90';

          const totalHpPct = Math.max(0, Math.min(100, bossHpPct));
          return (
            <div
              className={`w-full max-w-lg mx-auto rounded-2xl px-4 py-2.5 shadow-2xl border ${
                hud.bossPhase === 3
                  ? 'bg-[#260612]/96 border-amber-300 shadow-[0_0_28px_rgba(251,191,36,0.48)]'
                  : hud.bossPhase === 2
                  ? 'bg-[#200713]/96 border-amber-400/85 shadow-[0_0_22px_rgba(244,63,94,0.42)]'
                  : 'bg-[#120816]/96 border-amber-300/45 shadow-[0_8px_28px_rgba(0,0,0,0.65)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2 text-xs font-black mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="font-display text-amber-50 tracking-wide truncate">
                    {hud.bossName}
                  </span>
                  {totalLayers > 1 && (
                    <span className="font-mono-nums text-[10px] font-black text-amber-300 whitespace-nowrap">
                      ×{curLayer}
                    </span>
                  )}
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  {hud.bossPhase === 3 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-amber-200 whitespace-nowrap">
                      <Crown className="w-3 h-3 text-amber-300 shrink-0" />
                      <span>Pha III · Tối Thượng</span>
                    </span>
                  ) : hud.bossPhase === 2 ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-rose-300 whitespace-nowrap">
                      <Flame className="w-3 h-3 text-rose-400 shrink-0" />
                      <span>Pha II · Cuồng Nộ</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-300 whitespace-nowrap">
                      Pha I
                    </span>
                  )}
                </div>
                <span className="font-mono-nums text-amber-100/95 shrink-0">
                  {hud.isWorldBossMode
                    ? `${hud.worldBossTimeLeft ?? 60}s · ${(hud.worldBossTotalDamage ?? 0).toLocaleString('vi-VN')} ST`
                    : hud.isGuildBossMode
                    ? `${hud.guildBossTimeLeft ?? 60}s · ${(hud.guildBossTotalDamage ?? 0).toLocaleString('vi-VN')} ST`
                    : `${Math.max(0, hud.bossHp).toLocaleString('vi-VN')} / ${hud.bossMaxHp.toLocaleString('vi-VN')}`}
                </span>
              </div>
              <div className={`hv2-boss-track relative ${underBg}`}>
                <div
                  className="h-full bg-amber-100/75 absolute top-0 left-0 transition-all duration-300"
                  style={{ width: `${Math.max(layerFrac, bossLayerGhostPct)}%` }}
                />
                <div
                  className={`h-full relative z-[1] transition-all duration-100 bg-gradient-to-r ${barGrad}`}
                  style={{ width: `${layerFrac}%` }}
                />
                {/* Segmented Raid-Boss Notches + 50% (Pha II) & 25% (Pha III) Threshold Ticks */}
                <div className="pointer-events-none absolute inset-0 z-[2]" aria-hidden="true">
                  {[10, 20, 30, 40, 60, 70, 80, 90].map((pct) => (
                    <span
                      key={pct}
                      className="absolute top-0 bottom-0 w-px bg-black/35"
                      style={{ left: `${pct}%` }}
                    />
                  ))}
                  <span
                    className={`absolute top-0 bottom-0 w-[2px] ${
                      totalHpPct <= 50 ? 'bg-amber-200/35' : 'bg-amber-300 shadow-[0_0_6px_rgba(251,191,36,0.9)]'
                    }`}
                    style={{ left: '50%' }}
                  />
                  <span
                    className={`absolute top-0 bottom-0 w-[2px] ${
                      totalHpPct <= 25 ? 'bg-rose-200/35' : 'bg-rose-300 shadow-[0_0_6px_rgba(251,113,133,0.9)]'
                    }`}
                    style={{ left: '25%' }}
                  />
                </div>
              </div>

              {/* Wave 7 Pillar 1+2: Deterministic Boss Stagger / Guard-Break Sub-bar (4.0s +45% Vulnerability) */}
              {((hud.bossMaxShield ?? 0) > 0 || hud.bossStaggerRatio !== undefined) && (() => {
                const staggerPct =
                  hud.bossStaggerRatio !== undefined
                    ? Math.max(0, Math.min(100, hud.bossStaggerRatio * 100))
                    : Math.max(
                        0,
                        Math.min(
                          100,
                          100 -
                            ((hud.bossShield ?? 0) / Math.max(1, hud.bossMaxShield ?? 1)) * 100
                        )
                      );
                const stunRemaining = hud.bossStaggerBrokenSec ?? hud.bossStunTimer ?? 0;
                const isStunned = Boolean(hud.bossStaggerBroken || stunRemaining > 0.05);
                return (
                  <div className="mt-1.5">
                    <div className="flex items-center justify-between text-[10px] font-black mb-0.5">
                      <span
                        className={`flex items-center gap-1 ${
                          isStunned ? 'text-yellow-300' : 'text-amber-200/90'
                        }`}
                      >
                        {isStunned ? (
                          <Zap className="w-3 h-3 text-yellow-300 shrink-0" />
                        ) : (
                          <Shield className="w-3 h-3 text-amber-300 shrink-0" />
                        )}
                        <span>
                          {isStunned
                            ? `PHÁ GIÁP CHẤN ĐỘNG (${stunRemaining.toFixed(1)}s) · +45% SÁT THƯƠNG`
                            : 'Thanh Phá Giáp · Phản Kích & Tuyệt Kỹ tích cực nhanh'}
                        </span>
                      </span>
                      <span className="font-mono-nums tabular-nums text-amber-300">
                        {isStunned
                          ? `VỠ GIÁP${(hud.bossGuardBreaksTotal ?? 0) > 0 ? ` ×${hud.bossGuardBreaksTotal}` : ''}`
                          : `${Math.round(staggerPct)}%`}
                      </span>
                    </div>
                    <div className="relative h-2 w-full rounded-full bg-slate-950/95 border border-amber-400/40 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-100 ${
                          isStunned
                            ? 'bg-gradient-to-r from-yellow-300 via-amber-400 to-rose-400'
                            : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-200'
                        }`}
                        style={{ width: `${isStunned ? 100 : staggerPct}%` }}
                      />
                      <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                        {[25, 50, 75].map((tick) => (
                          <span
                            key={tick}
                            className="absolute top-0 bottom-0 w-px bg-slate-950/75"
                            style={{ left: `${tick}%` }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Phase 2–4: Boss Punish Window (+18% / +24% Counter-Strike) */}
              {hud.bossPunishActive && (hud.bossStunTimer ?? 0) <= 0.05 && (
                <div className="mt-1.5">
                  <div className="flex items-center justify-between text-[9px] font-black mb-0.5">
                    <span className="text-emerald-300">
                      SƠ HỞ PHẢN ĐÒN · +{hud.bossPunishBonusPct ?? 18}% SÁT THƯƠNG
                    </span>
                    <span className="font-mono-nums text-emerald-200">
                      {Math.round((hud.bossPunishRatio ?? 0) * 100)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-slate-950/95 border border-emerald-400/45 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-75"
                      style={{
                        width: `${Math.max(4, Math.min(100, Math.round((hud.bossPunishRatio ?? 0) * 100)))}%`,
                      }}
                    />
                  </div>
                </div>
              )}
              {/* Wave 4 Pillar 2: High-Clarity Boss Telegraph Windup Countdown Bar */}
              {hud.activeBossTelegraph && (hud.bossStunTimer ?? 0) <= 0.05 && (() => {
                const tg = hud.activeBossTelegraph;
                const ratio = Math.max(0, Math.min(1, tg.remainingSec / Math.max(0.25, tg.durationSec)));
                const isCritical = tg.dangerLevel === 'critical';
                return (
                  <div
                    className={`mt-1.5 rounded-lg px-2.5 py-1.5 bg-[#230712]/95 border ${
                      isCritical ? 'border-rose-400/80' : 'border-amber-400/75'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 text-[10px] font-black mb-1">
                      <span className="flex items-center gap-1.5 text-rose-200 truncate">
                        <AlertTriangle
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isCritical ? 'text-rose-400' : 'text-amber-300'
                          }`}
                        />
                        <span className="truncate">{tg.label}</span>
                        <span className="text-amber-300 font-bold">· {tg.actionHint}</span>
                      </span>
                      <span className="font-mono-nums tabular-nums text-rose-100 shrink-0">
                        {tg.remainingSec.toFixed(1)}s
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-950/95 border border-rose-500/35 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-75 ${
                          isCritical
                            ? 'bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300'
                            : 'bg-gradient-to-r from-amber-500 to-yellow-300'
                        }`}
                        style={{ width: `${Math.max(5, Math.round(ratio * 100))}%` }}
                      />
                    </div>
                  </div>
                );
              })()}
            </div>
          );
        })()}

        {/* Wave 12 + Wave 7: Dramatic Boss Guard-Break Shatter Banner */}
        {(hud.bossBrokenBannerTimer ?? 0) > 0 && (
          <div className="w-full max-w-md mx-auto rounded-xl px-4 py-1.5 bg-gradient-to-r from-amber-500/95 via-yellow-400/95 to-orange-500/95 border border-yellow-100 text-slate-950 text-center shadow-[0_0_24px_rgba(251,191,36,0.65)]">
            <div className="font-display text-xs sm:text-sm font-black tracking-wide flex items-center justify-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-slate-950 fill-current shrink-0" />
              <span>PHÁ GIÁP CHẤN ĐỘNG! · CHOÁNG 4S &amp; +45% SÁT THƯƠNG</span>
              <Zap className="w-3.5 h-3.5 text-slate-950 fill-current shrink-0" />
            </div>
          </div>
        )}

        {/* Phase 4: Boss Phase III Transition Banner */}
        {(hud.bossPhaseThreeBannerTimer ?? 0) > 0 && (hud.bossBrokenBannerTimer ?? 0) <= 0 && (
          <div className="w-full max-w-md mx-auto rounded-xl px-4 py-1.5 bg-[#2c0512]/95 border border-amber-300 text-center shadow-[0_0_28px_rgba(251,191,36,0.55)]">
            <div className="font-display text-xs sm:text-sm font-black tracking-wide text-amber-200 flex items-center justify-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>PHA III TỐI THƯỢNG · CỬA SỔ PHẢN ĐÒN +24% SÁT THƯƠNG</span>
            </div>
          </div>
        )}

        {/* Phase 3: Boss Phase II Transition Banner */}
        {(hud.bossPhaseTwoBannerTimer ?? 0) > 0 &&
          (hud.bossPhaseThreeBannerTimer ?? 0) <= 0 &&
          (hud.bossBrokenBannerTimer ?? 0) <= 0 && (
          <div className="w-full max-w-md mx-auto rounded-xl px-4 py-1.5 bg-[#2a0715]/95 border border-amber-300/85 text-center shadow-[0_0_24px_rgba(244,63,94,0.6)]">
            <div className="font-display text-xs sm:text-sm font-black tracking-wide text-amber-200 flex items-center justify-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>PHA II CUỒNG NỘ · BOSS TĂNG TỐC ĐÒN ĐÁNH</span>
            </div>
          </div>
        )}

        {/* Phase 3–4: Active Elite Affix & Arena Floor Hazard Readout */}
        {((hud.activeEliteAffixLabel && !hud.bossName) || hud.activeArenaHazardLabel) && (
          <div className="w-full max-w-md mx-auto flex flex-wrap justify-center gap-2">
            {hud.activeEliteAffixLabel && !hud.bossName && (
              <div className="hv2-panel rounded-xl px-3 py-1 text-[11px] font-bold text-amber-200 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                <span className="truncate">{hud.activeEliteAffixLabel}</span>
              </div>
            )}
            {hud.activeArenaHazardLabel && (
              <div className="hv2-panel rounded-xl px-3 py-1 text-[11px] font-bold text-rose-200 flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span className="truncate">{hud.activeArenaHazardLabel}</span>
              </div>
            )}
          </div>
        )}

        {/* Crystal Defense Spirit Crystal HP Bar */}
        {hud.isCrystalDefenseMode && (() => {
          const cHp = Math.max(0, hud.crystalHp ?? 0);
          const cMax = Math.max(1, hud.crystalMaxHp ?? 1);
          const cPct = Math.max(0, Math.min(100, (cHp / cMax) * 100));
          return (
            <div className="w-full max-w-md mx-auto rounded-2xl px-4 py-2 bg-[#071526]/95 border border-sky-400/70 shadow-2xl">
              <div className="flex items-center justify-between gap-2 text-xs font-black mb-1.5">
                <span className="flex items-center gap-1.5 text-sky-200 truncate">
                  <Gem className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                  <span>Pha Lê Tinh Linh (Trung Tâm)</span>
                </span>
                <span className="font-mono-nums text-cyan-200 shrink-0">
                  {cHp.toLocaleString('vi-VN')} / {cMax.toLocaleString('vi-VN')} ({Math.round(cPct)}%)
                </span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-950 border border-sky-400/35 overflow-hidden">
                <div
                  className={`h-full transition-all duration-150 ${
                    cPct > 55
                      ? 'bg-gradient-to-r from-sky-500 to-cyan-300'
                      : cPct > 28
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-300'
                      : 'bg-gradient-to-r from-rose-600 to-orange-400'
                  }`}
                  style={{ width: `${cPct}%` }}
                />
              </div>
            </div>
          );
        })()}

        {/* World Boss Live Cross-Server Rank Climber Strip */}
        {hud.isWorldBossMode && (
          <div className="w-full max-w-md mx-auto flex items-center justify-between gap-2 rounded-xl px-3.5 py-1.5 bg-[#1b081b]/95 border border-amber-400/55 text-[11px] font-black">
            <span className="flex items-center gap-1.5 text-amber-200">
              <Trophy className="w-3.5 h-3.5 text-amber-300 shrink-0" />
              <span>Đua Top Liên Server</span>
            </span>
            <span className="font-mono-nums text-emerald-300">
              Hạng Hiện Tại: #{hud.worldBossRank ?? 9}
            </span>
          </div>
        )}
        {/* Co-op & Pillar 5B 3D AI Squad Companion Live Strip */}
        {((hud.isCoopRaidMode && hud.coopAllies && hud.coopAllies.length > 0) ||
          (!hud.isCoopRaidMode && hud.aiSquadAllies && hud.aiSquadAllies.length > 0)) && (
          <div className="max-w-5xl w-full mx-auto flex flex-wrap items-center justify-start gap-2 pointer-events-none">
            {(hud.aiSquadAllies ?? []).map((ally, idx) => {
              const allyUlt = Math.max(0, Math.min(100, Math.round(ally.ultCharge)));
              return (
                <div
                  key={`${ally.role}-${idx}`}
                  className="hv2-panel rounded-xl px-2.5 py-1.5 border border-sky-400/40 min-w-[165px]"
                >
                  <div className="flex items-center justify-between gap-2 text-[10px] font-black">
                    <span className="flex items-center gap-1 text-sky-200 truncate">
                      <Users className="w-3 h-3 text-sky-300 shrink-0" />
                      <span>{ally.name}</span>
                      <span className="text-slate-400 font-semibold">· {ally.roleLabel}</span>
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
                  {ally.callout && (
                    <div className="mt-0.5 text-[9px] font-bold text-emerald-300 truncate">
                      {ally.callout}
                    </div>
                  )}
                </div>
              );
            })}
            {hud.isCoopRaidMode && (
              <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-[#070b1a]/94 border border-amber-400/30 text-[10px] font-black text-amber-200">
                <span>{COOP_DIFFICULTY_MAP[hud.coopDifficulty ?? 'normal']?.badge}</span>
              </div>
            )}
            {hud.isCoopRaidMode && onSetCoopTacticalOrder && (
              <div
                className="pointer-events-auto flex items-center gap-1 rounded-xl bg-[#060a18]/92 border border-sky-400/40 p-1"
                role="group"
                aria-label="Lệnh chiến thuật tổ đội Co-op"
              >
                {COOP_TACTICAL_ORDERS.map((ord) => {
                  const active = (hud.coopTacticalOrder ?? 'focus_boss') === ord.id;
                  return (
                    <button
                      key={ord.id}
                      type="button"
                      onClick={() => onSetCoopTacticalOrder(ord.id)}
                      title={ord.desc}
                      className={`px-2 py-1 rounded-lg text-[10px] font-black whitespace-nowrap cursor-pointer transition-colors ${
                        active
                          ? 'bg-amber-400/25 text-amber-200 border border-amber-300/70'
                          : 'text-slate-300 hover:text-white border border-transparent'
                      }`}
                    >
                      [{ord.hotkey}] {ord.shortLabel}
                    </button>
                  );
                })}
              </div>
            )}
            {hud.isCoopRaidMode && hud.coopSynergy && (
              (hud.coopSynergy.resonanceRemainingSec > 0 ||
                hud.coopSynergy.windowRemainingSec > 0 ||
                hud.coopSynergy.alliesUltReady.length > 0) && (
                <div
                  className={`rounded-xl px-3 py-1.5 border text-[10px] font-black flex items-center gap-2 ${
                    hud.coopSynergy.resonanceRemainingSec > 0
                      ? 'bg-[#251806]/95 border-amber-300/80 text-amber-200'
                      : hud.coopSynergy.windowRemainingSec > 0
                      ? 'bg-[#081a30]/95 border-sky-400/80 text-sky-200'
                      : 'bg-[#070d20]/94 border-amber-400/45 text-amber-100'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  {hud.coopSynergy.resonanceRemainingSec > 0 ? (
                    <span className="font-mono-nums tabular-nums">
                      Cộng Hưởng Liên Kích · +{hud.coopSynergy.resonanceBonusPct}% ST Boss ({hud.coopSynergy.resonanceRemainingSec.toFixed(1)}s)
                    </span>
                  ) : hud.coopSynergy.windowRemainingSec > 0 ? (
                    <span className="font-mono-nums tabular-nums">
                      {hud.coopSynergy.windowAllyName} tung Tuyệt Kỹ · Bấm Q Liên Kích ({hud.coopSynergy.windowRemainingSec.toFixed(1)}s)
                    </span>
                  ) : (
                    <span>
                      {hud.coopSynergy.alliesUltReady[0]} sẵn sàng Tuyệt Kỹ · Chuẩn bị Liên Kích!
                    </span>
                  )}
                </div>
              )
            )}
            {hud.isCoopRaidMode && hud.coopPingToast && (
              <div className="rounded-xl px-3 py-1.5 bg-[#061826]/95 border border-cyan-400/70 text-[10px] font-black text-cyan-100 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300 shrink-0" />
                <span>{hud.coopPingToast}</span>
              </div>
            )}
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

        {/* AAA Wave 2: Synergy Awakening Strip */}
        {(hud.synergyAwakenedTimer ?? 0) > 0 && hud.synergyAwakenedName && (
          <div className="mx-auto rounded-xl px-4 py-1 bg-[#140b24]/95 border border-amber-300/80 text-[11px] font-black text-amber-200 flex items-center justify-center gap-2 whitespace-nowrap shadow-[0_0_24px_rgba(251,191,36,0.38)]">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span>THỨC TỈNH CỘNG HƯỞNG · {hud.synergyAwakenedName}</span>
          </div>
        )}

        {/* Top-Right Tactical Arena Mini-Radar + Wave 7 Style Momentum & Combo Rank (B -> SSS) */}
        <div className="max-w-5xl w-full mx-auto flex items-start justify-end gap-2.5 pointer-events-none">
          {(hud.comboCount >= 2 || Boolean(hud.styleGrade)) && (() => {
            const comboMeta = getComboTierMeta(hud.comboCount);
            const styleRank = computeComboStyleRank(hud.comboCount);
            const displayGrade = hud.styleGrade ?? styleRank.grade;
            const styleRewardBonusPct = hud.styleGrade ? getStyleRewardBonusPct(hud.styleGrade) : 0;
            const bonusPct = Math.round((hud.comboDmgBonusPct ?? comboMeta.dmgBonusPct) * 100);
            const ringCirc = 2 * Math.PI * 19;
            const fillRatio =
              hud.styleFillRatio !== undefined ? hud.styleFillRatio : hud.comboTimerRatio;
            const ringOffset = ringCirc * (1 - Math.max(0, Math.min(1, fillRatio)));
            return (
              <div
                className={`hv2-panel rounded-2xl px-3 py-2 min-w-[186px] border ${styleRank.borderClass} flex items-center gap-2.5 shadow-xl`}
              >
                <div className="relative w-11 h-11 flex items-center justify-center shrink-0">
                  <svg
                    viewBox="0 0 44 44"
                    aria-hidden="true"
                    className="absolute inset-0 w-full h-full -rotate-90"
                  >
                    <circle
                      cx="22"
                      cy="22"
                      r="19"
                      fill="rgba(5,8,20,0.88)"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="2.8"
                    />
                    <circle
                      cx="22"
                      cy="22"
                      r="19"
                      fill="none"
                      stroke={styleRank.ringColor}
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeDasharray={ringCirc}
                      strokeDashoffset={ringOffset}
                    />
                  </svg>
                  <span
                    key={displayGrade}
                    className={`aaa-rank-pop relative z-[1] font-display font-black leading-none ${
                      displayGrade === 'SSS'
                        ? 'text-xs tracking-tighter'
                        : displayGrade === 'SS'
                        ? 'text-sm tracking-tight'
                        : 'text-lg'
                    } ${styleRank.textClass}`}
                  >
                    {displayGrade}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <span
                      key={hud.comboCount}
                      className="a2-combo-pop font-mono-nums tabular-nums text-lg font-black text-white leading-none"
                    >
                      ×{Math.max(1, hud.comboCount)}
                    </span>
                    <span className={`text-[10px] font-black tracking-wider ${styleRank.textClass}`}>
                      {hud.styleGrade ? `Hạng ${hud.styleGrade}` : styleRank.title}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[10px] font-mono-nums tabular-nums font-bold">
                    {styleRewardBonusPct > 0 ? (
                      <span className="text-amber-300 font-black">
                        +{styleRewardBonusPct}% Vàng/EXP
                      </span>
                    ) : (
                      <span className="text-slate-400">
                        {styleRank.nextThreshold
                          ? `Bậc kế: ${styleRank.nextThreshold}`
                          : 'Cực Hạn'}
                      </span>
                    )}
                    {bonusPct > 0 && (
                      <span className="text-emerald-300 font-black">+{bonusPct}% ST</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {hud.radarData && (
            <div
              aria-hidden="true"
              className="hidden sm:block relative w-[94px] h-[94px] rounded-2xl bg-[#050814]/92 border border-amber-400/50 shadow-xl overflow-hidden shrink-0"
            >
              {/* Concentric Range Rings & Crosshairs */}
              <div className="absolute inset-2.5 rounded-full border border-sky-400/15" />
              <div className="absolute inset-6 rounded-full border border-sky-400/15" />
              <div className="absolute inset-y-0 left-1/2 w-px bg-amber-300/12" />
              <div className="absolute inset-x-0 top-1/2 h-px bg-amber-300/12" />
              <span className="absolute top-0.5 right-1.5 text-[7px] font-display font-black text-amber-300/80 tracking-wider">
                BẢN ĐỒ
              </span>
              {/* North Portal Beacon */}
              <span
                className={`absolute top-1 left-1/2 -translate-x-1/2 w-4 h-1.5 rounded-full ${
                  hud.radarData.portalOpen
                    ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]'
                    : 'bg-slate-600/70'
                }`}
              />
              {/* Loot Drop Blips (Wave 14) */}
              {(hud.radarData.drops ?? []).map((dr, idx) => (
                <span
                  key={`d_${idx}`}
                  style={{
                    left: `${50 + dr.x * 42}%`,
                    top: `${50 + dr.z * 42}%`,
                  }}
                  className={`absolute -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rotate-45 ${
                    dr.kind === 'gem'
                      ? 'bg-cyan-300 shadow-[0_0_5px_#67e8f9]'
                      : dr.kind === 'heal'
                      ? 'bg-emerald-400'
                      : 'bg-amber-300'
                  }`}
                />
              ))}
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
              {/* Player Facing Wedge & Dot */}
              <div
                style={{
                  left: `${50 + hud.radarData.playerX * 42}%`,
                  top: `${50 + hud.radarData.playerZ * 42}%`,
                  transform: `translate(-50%, -50%) rotate(${yawToRadarDegrees(hud.radarData.playerYaw ?? Math.PI)}deg)`,
                }}
                className="absolute w-5 h-5 flex items-center justify-center"
              >
                <span
                  className="absolute -top-1.5 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[7px] border-l-transparent border-r-transparent border-b-emerald-300/80"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-300 border border-white shadow-[0_0_8px_#34d399]" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Wave 14: Cinematic Boss Warning Cut-In Overlay */}
      {hud.bossWarningTitle ? (
        <div className="mt-4 flex justify-center px-3 pointer-events-none">
          <div className="w14-boss-warning-cutin relative w-full max-w-2xl overflow-hidden rounded-2xl border-y-2 border-amber-300/90 bg-gradient-to-r from-[#1a040c]/95 via-[#4c071b]/95 to-[#1a040c]/95 px-5 py-3 shadow-[0_0_38px_rgba(244,63,94,0.65)]">
            <div className="flex items-center justify-center gap-3.5 text-center sm:text-left">
              <div className="w-11 h-11 rounded-xl bg-rose-500/25 border border-amber-300/80 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 text-amber-300" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-black uppercase tracking-[0.28em] text-amber-300">
                  CẢNH BÁO ĐỎ · THỦ LĨNH XUẤT TRẬN
                </div>
                <div className="font-display text-lg sm:text-2xl font-black text-white tracking-wide truncate">
                  {hud.bossWarningTitle}
                </div>
                {hud.bossWarningSubtitle && (
                  <div className="text-xs font-bold text-rose-200/95 truncate mt-0.5">
                    {hud.bossWarningSubtitle}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : bossIntroTitle ? (
        <div className="mt-4 flex justify-center px-4">
          <div className="a2-boss-intro w-full max-w-md rounded-2xl bg-[#180710]/96 border border-amber-300/80 px-5 py-3 shadow-[0_12px_36px_rgba(0,0,0,0.72)] flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-300/70 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-amber-300" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-amber-300">
                <span>Đại Boss Hoàng Đạo</span>
                <span aria-hidden="true" className="text-amber-500/60">·</span>
                <span className="text-rose-300">Khai Chiến</span>
              </div>
              <div className="font-display text-base sm:text-xl font-black text-white truncate tracking-wide">
                {bossIntroTitle}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Stage / Room Clear Banner (Pinned tightly below top readout so north enemies stay 100% clear) */}
      {!hud.bossWarningTitle && !bossIntroTitle && hud.stageBannerText && (
        <div className="fixed top-[74px] left-1/2 -translate-x-1/2 z-[12] pointer-events-none px-3">
          <div
            className={`px-3.5 py-0.5 rounded-lg border-b font-display text-[11px] font-black tracking-[0.06em] whitespace-nowrap shadow-[0_6px_18px_rgba(0,0,0,0.65)] ${
              hud.portalOpen
                ? 'bg-[#071814]/92 border-emerald-400/75 text-emerald-200'
                : 'bg-[#080d1e]/88 border-amber-300/65 text-amber-200'
            }`}
          >
            {hud.stageBannerText}
          </div>
        </div>
      )}

      {/* BOTTOM PERIMETER: Interactive Active Skills + Sleek Vitals + Dual Action Medallions */}
      <div
        className="fixed bottom-3.5 left-3 right-3 sm:left-6 sm:right-6 flex items-end justify-between gap-2.5"
        style={
          hudScaleFactor !== 1
            ? { transform: `scale(${hudScaleFactor})`, transformOrigin: 'bottom center' }
            : undefined
        }
      >
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

          {(hud.activeSynergies?.length ?? 0) > 0 && (
            <div className="hv2-panel px-2.5 py-1 rounded-lg text-[10px] font-bold text-amber-200 max-w-full truncate">
              Cộng Hưởng:{' '}
              <span className="text-emerald-300">
                {hud.activeSynergies!
                  .map((id) => SKILL_SYNERGY_MAP[id]?.name ?? id)
                  .join(' · ')}
              </span>
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

        {/* Center Player Vitals Bar + Counter-Shot Ready Callout + Gamepad Legend */}
        <div className="flex flex-col items-center gap-1.5 w-full max-w-[265px] mx-auto">
          {hud.counterShotReady && (
            <div className="w-full px-3 py-1 rounded-xl bg-[#181004]/95 border border-amber-300/80 shadow-[0_0_20px_rgba(251,191,36,0.4)]">
              <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-amber-200">
                <span className="flex items-center gap-1 min-w-0 truncate">
                  <Zap className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                  <span className="truncate">PHẢN TIỄN TINH QUANG · DỪNG ĐỂ PHÓNG</span>
                </span>
                {typeof hud.counterShotTimer === 'number' && hud.counterShotTimer > 0 && (
                  <span className="font-mono-nums text-amber-300 shrink-0">
                    {hud.counterShotTimer.toFixed(1)}s
                  </span>
                )}
              </div>
              <div className="mt-1 h-1 w-full rounded-full bg-slate-950 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 via-yellow-200 to-cyan-300 transition-all duration-75"
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, ((hud.counterShotTimer ?? 0) / 3.2) * 100)
                    )}%`,
                  }}
                />
              </div>
            </div>
          )}

          <div className="hv2-panel rounded-2xl px-3.5 py-2 w-full">
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
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/4 w-px bg-slate-950/55 z-[3]" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-slate-950/65 z-[3]" />
            <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-3/4 w-px bg-slate-950/55 z-[3]" />
          </div>
          </div>

          {hud.gamepadConnected && (
            <div className="flex items-center gap-1.5 text-[9px] font-bold tracking-wide text-slate-300/90 drop-shadow-[0_1px_6px_rgba(0,0,0,0.85)]">
              <Gamepad2 className="w-3 h-3 text-emerald-300 shrink-0" />
              <span>A Lướt · X Chiêu E · Y Chiêu Q</span>
            </div>
          )}
        </div>

        {/* Action Medallions: Ultimate (Q) + Signature Active Skill (E) + Dash (Space) with Radial Rings */}
        <div className="flex items-end gap-2 sm:gap-3 shrink-0">
          {(() => {
            const circ = 2 * Math.PI * 29;
            const ultOffset = circ * (1 - ultPct / 100);
            const activeFill = Math.max(0, Math.min(1, 1 - activeSkillCdRatio));
            const activeOffset = circ * (1 - activeFill);
            const dashFill = Math.max(0, Math.min(1, 1 - hud.dashCooldownRatio));
            const dashOffset = circ * (1 - dashFill);
            return (
              <>
                <div className="relative flex flex-col items-center shrink-0">
                  {ultReady && (
                    <>
                      <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md bg-gradient-to-r from-amber-400 to-yellow-300 border border-amber-100 text-[9px] font-black text-slate-950 whitespace-nowrap shadow-lg">
                        TUYỆT KỸ ĐẦY
                      </span>
                      <span
                        aria-hidden="true"
                        className="a2-ult-ready-ring absolute -inset-1 rounded-full border-2 border-dashed border-amber-300/90 pointer-events-none"
                      />
                    </>
                  )}
                  <button
                    type="button"
                    tabIndex={-1}
                    disabled={!ultReady}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onUltimateClick();
                    }}
                    title={hud.ultName}
                    className={`pointer-events-auto relative overflow-hidden w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-full flex flex-col items-center justify-center font-black transition-transform shrink-0 ${
                      ultReady
                        ? 'a2-purple-btn w13-skill-ready-glow cursor-pointer shadow-[0_0_26px_rgba(251,191,36,0.65)] hover:scale-105'
                        : 'hv2-panel text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <svg
                      viewBox="0 0 64 64"
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 w-full h-full -rotate-90"
                    >
                      <circle cx="32" cy="32" r="29" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                      <circle
                        cx="32"
                        cy="32"
                        r="29"
                        fill="none"
                        stroke={ultReady ? '#fde047' : '#c084fc'}
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={ultOffset}
                      />
                    </svg>
                    <Flame
                      className={`w-5 h-5 relative z-[1] ${
                        ultReady ? 'text-amber-200' : 'text-purple-300'
                      }`}
                    />
                    <span className="font-mono-nums text-[10px] leading-tight mt-0.5 relative z-[1]">
                      {ultReady ? `CHIÊU ${ultKeyLabel}` : `${ultPct}%`}
                    </span>
                  </button>
                  <kbd className="-mt-2.5 relative z-[3] px-1.5 py-0.5 rounded-md bg-[#050814]/95 border border-amber-300/55 shadow-md text-[9px] font-mono-nums font-black leading-none tracking-wider text-amber-200">
                    {ultKeyLabel}
                  </kbd>
                </div>

                {onActiveSkillClick && (
                  <div className="relative flex flex-col items-center shrink-0">
                    <button
                      type="button"
                      tabIndex={-1}
                      disabled={!activeSkillReady}
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onActiveSkillClick();
                      }}
                      title={hud.activeSkillName ?? `Kỹ Năng Chủ Động (${activeSkillKeyLabel})`}
                      className={`pointer-events-auto relative overflow-hidden w-[58px] h-[58px] sm:w-[64px] sm:h-[64px] rounded-full flex flex-col items-center justify-center font-black shrink-0 transition-transform ${
                        activeSkillReady
                          ? 'bg-gradient-to-b from-sky-500/95 to-indigo-700/95 border border-cyan-200/80 text-white shadow-[0_0_20px_rgba(56,189,248,0.5)] cursor-pointer hover:scale-105'
                          : 'hv2-panel text-slate-400 cursor-not-allowed'
                      }`}
                    >
                      <svg
                        viewBox="0 0 64 64"
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 w-full h-full -rotate-90"
                      >
                        <circle cx="32" cy="32" r="29" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                        <circle
                          cx="32"
                          cy="32"
                          r="29"
                          fill="none"
                          stroke={activeSkillReady ? '#67e8f9' : '#38bdf8'}
                          strokeWidth="2.8"
                          strokeLinecap="round"
                          strokeDasharray={circ}
                          strokeDashoffset={activeOffset}
                        />
                      </svg>
                      <Sparkles
                        className={`w-4 h-4 relative z-[1] ${
                          activeSkillReady ? 'text-cyan-100' : 'text-slate-400'
                        }`}
                      />
                      <span className="font-mono-nums text-[10px] leading-tight mt-0.5 relative z-[1]">
                        {activeSkillReady ? `CHIÊU ${activeSkillKeyLabel}` : `${activeSkillCdSec.toFixed(1)}s`}
                      </span>
                    </button>
                    <kbd className="-mt-2.5 relative z-[3] px-1.5 py-0.5 rounded-md bg-[#050814]/95 border border-sky-300/55 shadow-md text-[9px] font-mono-nums font-black leading-none tracking-wider text-sky-200">
                      {activeSkillKeyLabel}
                    </kbd>
                  </div>
                )}

                <div className="relative flex flex-col items-center shrink-0">
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onDashClick();
                    }}
                    className={`pointer-events-auto relative overflow-hidden w-[60px] h-[60px] sm:w-[68px] sm:h-[68px] rounded-full flex flex-col items-center justify-center font-black cursor-pointer shrink-0 transition-transform ${
                      dashReady
                        ? 'a2-emerald-btn w13-skill-ready-glow shadow-[0_0_22px_rgba(52,211,153,0.52)] hover:scale-105'
                        : 'hv2-panel text-slate-400'
                    }`}
                  >
                    <svg
                      viewBox="0 0 64 64"
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-0 w-full h-full -rotate-90"
                    >
                      <circle cx="32" cy="32" r="29" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
                      <circle
                        cx="32"
                        cy="32"
                        r="29"
                        fill="none"
                        stroke={dashReady ? '#6ee7b7' : '#34d399'}
                        strokeWidth="2.8"
                        strokeLinecap="round"
                        strokeDasharray={circ}
                        strokeDashoffset={dashOffset}
                      />
                    </svg>
                    <Zap
                      className={`w-5 h-5 relative z-[1] ${
                        dashReady ? 'text-amber-200' : 'text-slate-400'
                      }`}
                    />
                    <span className="font-mono-nums text-[10px] leading-tight mt-0.5 relative z-[1]">
                      {dashReady ? 'LƯỚT' : `${Math.ceil(hud.dashCooldownRatio * 100)}%`}
                    </span>
                  </button>
                  <kbd className="-mt-2.5 relative z-[3] px-1.5 py-0.5 rounded-md bg-[#050814]/95 border border-emerald-300/60 shadow-md text-[9px] font-mono-nums font-black leading-none tracking-wider text-emerald-200">
                    {dashKeyLabel}
                  </kbd>
                </div>
              </>
            );
          })()}
        </div>
      </div>

      {/* Wave 11: Inter-Round Championship 3-Card Tactical Buff Selection Overlay */}
      {hud.isChampionshipMode &&
        hud.championshipTacticsOffer &&
        hud.championshipTacticsOffer.length > 0 &&
        onSelectChampionshipTactic && (
          <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-[#040610]/88 p-4">
            <div className="cel-panel-ornate w-full max-w-2xl rounded-3xl p-5 sm:p-6 text-center a2-modal-enter">
              <div className="flex items-center justify-center gap-1.5 text-[11px] font-black uppercase tracking-[0.2em] text-amber-300 mb-1.5">
                <Trophy className="w-3.5 h-3.5 shrink-0" />
                <span>Thắng Hiệp {hud.championshipRound ?? 1} · Chiến Thuật Hiệp {(hud.championshipRound ?? 1) + 1}</span>
              </div>
              <h3 className="font-display text-xl sm:text-2xl font-black text-white">
                Chọn 1 Thẻ Chiến Thuật Quán Quân
              </h3>
              <p className="text-xs text-slate-300 mt-1 mb-5">
                Hiệu ứng cộng dồn ngay lập tức và duy trì đến hết Giải Đấu 3 Hiệp 3D.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
                {hud.championshipTacticsOffer.map((tactic) => (
                  <button
                    key={tactic.id}
                    type="button"
                    onClick={() => onSelectChampionshipTactic(tactic.id)}
                    className="group flex flex-col justify-between rounded-2xl border border-amber-400/45 bg-gradient-to-b from-[#171d3a] to-[#0a0f22] p-4 transition hover:-translate-y-1 hover:border-amber-300 hover:shadow-[0_0_24px_rgba(251,191,36,0.35)] cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-300/40 bg-slate-950/80 text-amber-300">
                          <Trophy className="w-5 h-5" />
                        </span>
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-300">
                          {tactic.badge}
                        </span>
                      </div>
                      <h4 className="mt-3 font-display text-sm font-black text-white group-hover:text-amber-200">
                        {tactic.name}
                      </h4>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                        {tactic.desc}
                      </p>
                    </div>
                    <div className="mt-4 w-full rounded-xl bg-gradient-to-r from-amber-400 to-yellow-400 py-2 text-center text-xs font-black uppercase text-slate-950">
                      Kích Hoạt
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
    </div>
  );
};


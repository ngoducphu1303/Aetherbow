import {
  CombatMedalBadge,
  DamageBreakdown,
  GraphicsQuality,
  ResonanceTrapKind,
  RunCombatHighlights,
} from '../types/game';
import { computeComboStyleRank } from './aaaCombatDirector';
import { computePostRunDamageShares } from './aaaWave3Director';

// ============================================================================
// PILLAR 1: 3D TARGET LOCK RETICLE, BOSS WEAK-POINT & STUCK ARROWS
// ============================================================================

export interface TargetLockVisualState {
  isExecuteThreshold: boolean;
  reticleColorHex: number;
  innerColorHex: number;
  pulseSpeed: number;
  ringScale: number;
}

export function evaluateTargetLockState(
  hp: number,
  maxHp: number,
  isBoss: boolean
): TargetLockVisualState {
  const safeMax = Math.max(1, maxHp);
  const ratio = Math.max(0, Math.min(1, hp / safeMax));
  const isExecuteThreshold = ratio > 0 && ratio <= 0.22;

  if (isExecuteThreshold) {
    return {
      isExecuteThreshold: true,
      reticleColorHex: 0xf43f5e,
      innerColorHex: 0xfda4af,
      pulseSpeed: 9.5,
      ringScale: isBoss ? 1.18 : 1.08,
    };
  }
  if (isBoss) {
    return {
      isExecuteThreshold: false,
      reticleColorHex: 0xfbbf24,
      innerColorHex: 0xfef08a,
      pulseSpeed: 4.5,
      ringScale: 1.12,
    };
  }
  return {
    isExecuteThreshold: false,
    reticleColorHex: 0x38bdf8,
    innerColorHex: 0xbae6fd,
    pulseSpeed: 3.4,
    ringScale: 1.0,
  };
}

export interface BossWeakPointState {
  active: boolean;
  remainingSec: number;
  durationSec: number;
  orbitAngle: number;
  orbitRadius: number;
  heightOffset: number;
  shattered: boolean;
}

export function createBossWeakPointWindow(
  bossRadius: number,
  initialAngle = 0
): BossWeakPointState {
  return {
    active: true,
    remainingSec: 3.6,
    durationSec: 3.6,
    orbitAngle: initialAngle,
    orbitRadius: Math.max(1.35, bossRadius + 0.55),
    heightOffset: 1.55,
    shattered: false,
  };
}

export function stepBossWeakPointWindow(
  state: BossWeakPointState,
  dt: number
): BossWeakPointState {
  if (!state.active) return state;
  const safeDt = Math.max(0, Math.min(0.1, dt));
  const nextRem = state.remainingSec - safeDt;
  if (nextRem <= 0) {
    return {
      ...state,
      active: false,
      remainingSec: 0,
    };
  }
  return {
    ...state,
    remainingSec: nextRem,
    orbitAngle: state.orbitAngle + safeDt * 1.45,
  };
}

export function getBossWeakPointWorldPos(
  bossX: number,
  bossZ: number,
  state: BossWeakPointState
): { x: number; y: number; z: number } {
  return {
    x: bossX + Math.cos(state.orbitAngle) * state.orbitRadius,
    y: state.heightOffset + Math.sin(state.orbitAngle * 2.2) * 0.16,
    z: bossZ + Math.sin(state.orbitAngle) * state.orbitRadius,
  };
}

export function checkBossWeakPointHit(
  wpX: number,
  wpZ: number,
  projX: number,
  projZ: number,
  hitRadius = 1.18
): boolean {
  const dx = projX - wpX;
  const dz = projZ - wpZ;
  return dx * dx + dz * dz <= hitRadius * hitRadius;
}

export interface StuckArrowLocalOffset {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

export function computeStuckArrowLocalOffset(
  incomingAngle: number,
  enemyRadius: number,
  enemyHeight: number,
  seedIndex: number
): StuckArrowLocalOffset {
  const spread = ((seedIndex % 5) - 2) * 0.14;
  const surfaceAngle = incomingAngle + Math.PI + spread;
  const r = Math.max(0.35, enemyRadius * 0.82);
  const yFrac = 0.42 + ((seedIndex * 37) % 36) / 100;
  return {
    x: Math.sin(surfaceAngle) * r,
    y: Math.max(0.55, enemyHeight * yFrac),
    z: Math.cos(surfaceAngle) * r,
    yaw: incomingAngle,
    pitch: 0.08 + ((seedIndex % 3) - 1) * 0.06,
  };
}

// ============================================================================
// PILLAR 2: INTERACTIVE 3D ARENA RESONANCE TRAPS
// ============================================================================

export interface ResonanceTrapConfig {
  kind: ResonanceTrapKind;
  label: string;
  triggerHint: string;
  primaryHex: number;
  accentHex: number;
  aoeRadius: number;
  cooldownSec: number;
  damageMultiplier: number;
  knockbackForce: number;
  heroSpeedBoostSec: number;
}

export const RESONANCE_TRAP_CONFIGS: Record<ResonanceTrapKind, ResonanceTrapConfig> = {
  storm_pylon: {
    kind: 'storm_pylon',
    label: 'Trụ Lôi Cộng Hưởng',
    triggerHint: 'Giật sét chuỗi diện rộng',
    primaryHex: 0x38bdf8,
    accentHex: 0xc084fc,
    aoeRadius: 4.8,
    cooldownSec: 9.5,
    damageMultiplier: 1.9,
    knockbackForce: 1.2,
    heroSpeedBoostSec: 0,
  },
  ember_crucible: {
    kind: 'ember_crucible',
    label: 'Lò Hỏa Mạch',
    triggerHint: 'Nổ vòng lửa thiêu đốt',
    primaryHex: 0xf97316,
    accentHex: 0xfde047,
    aoeRadius: 4.5,
    cooldownSec: 9.5,
    damageMultiplier: 2.05,
    knockbackForce: 1.6,
    heroSpeedBoostSec: 0,
  },
  wind_beacon: {
    kind: 'wind_beacon',
    label: 'Bệ Phong Thần',
    triggerHint: 'Đẩy lùi quái & tăng tốc chạy',
    primaryHex: 0x34d399,
    accentHex: 0xa7f3d0,
    aoeRadius: 5.2,
    cooldownSec: 8.5,
    damageMultiplier: 1.25,
    knockbackForce: 4.2,
    heroSpeedBoostSec: 3.0,
  },
};

export interface ResonanceTrapPlacement {
  x: number;
  z: number;
  kind: ResonanceTrapKind;
}

export function computeResonanceTrapPlacements(
  seed: number,
  roomHalfW: number,
  roomHalfH: number,
  obstacles: Array<{ x: number; z: number; r: number }>,
  isBossStage: boolean
): ResonanceTrapPlacement[] {
  const safeW = Math.max(5, roomHalfW - 2.6);
  const safeH = Math.max(5, roomHalfH - 3.6);
  const kinds: ResonanceTrapKind[] = ['storm_pylon', 'ember_crucible', 'wind_beacon'];
  const s = Math.abs(Math.floor(seed));
  const candidates: Array<[number, number]> = [
    [-safeW * 0.62, -safeH * 0.12],
    [safeW * 0.62, -safeH * 0.12],
    [-safeW * 0.56, safeH * 0.28],
    [safeW * 0.56, safeH * 0.28],
    [0, -safeH * 0.32],
  ];

  const desiredCount = isBossStage ? 2 : s % 3 === 0 ? 1 : 2;
  const out: ResonanceTrapPlacement[] = [];

  for (let i = 0; i < candidates.length && out.length < desiredCount; i++) {
    const [cx, cz] = candidates[(s + i) % candidates.length];
    // Keep clear of hero spawn (south) & north portal
    if (cz > roomHalfH - 4.2 || cz < -roomHalfH + 3.6) continue;
    let blocked = false;
    for (const obs of obstacles) {
      if (Math.hypot(cx - obs.x, cz - obs.z) < obs.r + 2.0) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;
    for (const prev of out) {
      if (Math.hypot(cx - prev.x, cz - prev.z) < 4.5) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;
    const kind = kinds[(s + out.length) % kinds.length];
    out.push({ x: cx, z: cz, kind });
  }
  return out;
}

// ============================================================================
// PILLAR 3: CHAPTER 3D WEATHER PROFILES & ELEMENTAL FOOTSTEP RIPPLES
// ============================================================================

export type ChapterWeatherMode = 'embers' | 'snow' | 'starlight' | 'storm_sparks';

export interface ChapterWeatherProfile {
  mode: ChapterWeatherMode;
  particleCount: number;
  colorPrimaryHex: number;
  colorSecondaryHex: number;
  velX: number;
  velY: number;
  velZ: number;
  pointSize: number;
  opacity: number;
}

export function getChapterWeatherProfile(
  chapterId: number,
  graphicsQuality: GraphicsQuality = 'medium'
): ChapterWeatherProfile {
  const count =
    graphicsQuality === 'low' ? 44 : graphicsQuality === 'high' ? 140 : 90;

  // Map 12 Zodiac chapters to 4 distinct atmospheric weather moods
  // Fire/Solar (1 Leo, 2 Aries, 9 Sagittarius) -> Embers
  // Frost/Water (5 Cancer, 11 Aquarius, 12 Pisces) -> Snow / Mist Crystals
  // Storm/Shadow (4 Gemini, 8 Scorpio) -> Storm Sparks
  // Earth/Celestial (3 Taurus, 6 Virgo, 7 Libra, 10 Capricorn) -> Starlight Dust
  const ch = Math.max(1, Math.floor(chapterId));
  if (ch === 1 || ch === 2 || ch === 9) {
    return {
      mode: 'embers',
      particleCount: count,
      colorPrimaryHex: 0xfb923c,
      colorSecondaryHex: 0xfde047,
      velX: 0.55,
      velY: 1.65,
      velZ: -0.35,
      pointSize: 0.24,
      opacity: 0.72,
    };
  }
  if (ch === 5 || ch === 11 || ch === 12) {
    return {
      mode: 'snow',
      particleCount: count,
      colorPrimaryHex: 0xe0f2fe,
      colorSecondaryHex: 0x38bdf8,
      velX: 0.85,
      velY: -1.85,
      velZ: 0.4,
      pointSize: 0.26,
      opacity: 0.68,
    };
  }
  if (ch === 4 || ch === 8) {
    return {
      mode: 'storm_sparks',
      particleCount: count,
      colorPrimaryHex: 0xc084fc,
      colorSecondaryHex: 0x38bdf8,
      velX: -1.4,
      velY: -2.4,
      velZ: 0.55,
      pointSize: 0.22,
      opacity: 0.74,
    };
  }
  return {
    mode: 'starlight',
    particleCount: count,
    colorPrimaryHex: 0xfef08a,
    colorSecondaryHex: 0x93c5fd,
    velX: 0.35,
    velY: -0.65,
    velZ: -0.25,
    pointSize: 0.23,
    opacity: 0.65,
  };
}

export function stepFootstepRippleDistance(
  accumDist: number,
  deltaDist: number,
  isMounted: boolean
): { nextAccum: number; shouldEmit: boolean } {
  const stride = isMounted ? 1.85 : 1.35;
  const total = Math.max(0, accumDist) + Math.max(0, deltaDist);
  if (total >= stride) {
    return { nextAccum: total - stride, shouldEmit: true };
  }
  return { nextAccum: total, shouldEmit: false };
}

// ============================================================================
// PILLAR 4: LIVING 3D SANCTUARY ATMOSPHERE & 360° INSPECT TURNTABLE
// ============================================================================

export interface LobbyInspectRigState {
  blend: number; // 0 = normal lobby, 1 = 360° hero/weapon inspect
  autoRotateYaw: number;
  rimLightIntensity: number;
}

export function stepLobbyInspectRig(
  current: LobbyInspectRigState,
  inspectActive: boolean,
  autoRotate: boolean,
  dt: number
): LobbyInspectRigState {
  const safeDt = Math.max(0.001, Math.min(0.05, dt));
  const targetBlend = inspectActive ? 1 : 0;
  const alpha = 1 - Math.exp(-7.5 * safeDt);
  const blend = current.blend + (targetBlend - current.blend) * alpha;
  const nextYaw =
    inspectActive && autoRotate
      ? current.autoRotateYaw + safeDt * 0.58
      : current.autoRotateYaw;
  const rimLightIntensity = 0.85 + blend * 1.45;
  return {
    blend: Math.abs(blend - targetBlend) < 0.002 ? targetBlend : blend,
    autoRotateYaw: nextYaw,
    rimLightIntensity,
  };
}

export interface SanctuaryAtmospherePulse {
  nebulaYaw: number;
  sunBreathIntensity: number;
  rimColorShift: number;
}

export function computeSanctuaryAtmosphereWave(elapsed: number): SanctuaryAtmospherePulse {
  const t = Math.max(0, elapsed);
  return {
    nebulaYaw: t * 0.045,
    sunBreathIntensity: 1.0 + Math.sin(t * 0.62) * 0.14,
    rimColorShift: 0.5 + 0.5 * Math.sin(t * 0.42),
  };
}

// ============================================================================
// PILLAR 5: AAA POST-RUN COMBAT MEDALS & 1200x675 PNG MEDAL CARD RENDERER
// ============================================================================

export interface RunMedalEvaluationInput {
  isVictory: boolean;
  kills: number;
  maxCombo: number;
  elapsedSeconds: number;
  highlights?: RunCombatHighlights;
}

export function evaluateRunCombatMedals(
  input: RunMedalEvaluationInput
): {
  medals: CombatMedalBadge[];
  highlightSummaryParts: string[];
} {
  const h = input.highlights ?? {};
  const medals: CombatMedalBadge[] = [];

  if (input.isVictory && (h.damageTakenCount ?? 1) === 0 && input.kills >= 5) {
    medals.push({
      id: 'untouchable',
      title: 'Bất Khả Xâm Phạm',
      subtitle: 'Chiến thắng không trúng đòn',
      accentHex: '#34d399',
    });
  }
  if ((h.weakPointHits ?? 0) >= 2) {
    medals.push({
      id: 'weakpoint_hunter',
      title: 'Thợ Săn Điểm Yếu',
      subtitle: `${h.weakPointHits} phát phá lõi Boss`,
      accentHex: '#fbbf24',
    });
  }
  if ((h.trapsTriggered ?? 0) >= 2) {
    medals.push({
      id: 'arena_tactician',
      title: 'Bậc Thầy Địa Hình',
      subtitle: `Kích hoạt ${h.trapsTriggered} Trụ Cộng Hưởng`,
      accentHex: '#38bdf8',
    });
  }
  if ((h.perfectDodgesCount ?? 0) >= 3) {
    medals.push({
      id: 'phantom_step',
      title: 'Nghệ Sĩ Né Đòn',
      subtitle: `${h.perfectDodgesCount} lần Né Hoàn Hảo`,
      accentHex: '#22d3ee',
    });
  }
  if ((h.elementalReactionsCount ?? 0) >= 4) {
    medals.push({
      id: 'elemental_maestro',
      title: 'Bậc Thầy Phản Ứng',
      subtitle: `${h.elementalReactionsCount} Phản Ứng Nguyên Tố`,
      accentHex: '#c084fc',
    });
  }
  if (input.maxCombo >= 35) {
    medals.push({
      id: 'style_legend',
      title: 'Phong Cách Huyền Thoại',
      subtitle: `Chuỗi tối đa ${input.maxCombo} Combo`,
      accentHex: '#f59e0b',
    });
  }
  if ((h.bountiesCompleted ?? 0) >= 2) {
    medals.push({
      id: 'bounty_master',
      title: 'Thợ Săn Thử Thách',
      subtitle: `Hoàn tất ${h.bountiesCompleted} Thử Thách Phòng`,
      accentHex: '#fde047',
    });
  }
  if (input.isVictory && input.elapsedSeconds > 0 && input.elapsedSeconds <= 110 && input.kills >= 10) {
    medals.push({
      id: 'swift_zodiac',
      title: 'Tốc Chiến Hoàng Đạo',
      subtitle: `Dọn sạch trong ${Math.round(input.elapsedSeconds)}s`,
      accentHex: '#fb7185',
    });
  }

  // Fallback authentic participation badge when a short run completes
  if (medals.length === 0 && input.kills > 0) {
    medals.push({
      id: 'zodiac_archer',
      title: input.isVictory ? 'Cung Thủ Khải Hoàn' : 'Ý Chí Bất Khuất',
      subtitle: `Hạ gục ${input.kills} kẻ địch`,
      accentHex: '#fbbf24',
    });
  }

  const highlightSummaryParts: string[] = [];
  if ((h.peakCritDamage ?? 0) > 0) {
    highlightSummaryParts.push(`Chí Mạng Đỉnh ${Math.round(h.peakCritDamage!).toLocaleString('vi-VN')}`);
  }
  if ((h.weakPointHits ?? 0) > 0) {
    highlightSummaryParts.push(`Điểm Yếu ×${h.weakPointHits}`);
  }
  if ((h.trapsTriggered ?? 0) > 0) {
    highlightSummaryParts.push(`Trụ Cộng Hưởng ×${h.trapsTriggered}`);
  }
  if ((h.perfectDodgesCount ?? 0) > 0) {
    highlightSummaryParts.push(`Né Hoàn Hảo ×${h.perfectDodgesCount}`);
  }
  if ((h.bountiesCompleted ?? 0) > 0) {
    highlightSummaryParts.push(`Thử Thách ×${h.bountiesCompleted}`);
  }

  return {
    medals: medals.slice(0, 3),
    highlightSummaryParts: highlightSummaryParts.slice(0, 4),
  };
}

export interface AaaMedalCardRenderInput {
  isVictory: boolean;
  chapterName: string;
  stageLabel: string;
  heroName: string;
  kills: number;
  maxCombo: number;
  goldEarned: number;
  gemsEarned: number;
  damageBreakdown?: DamageBreakdown;
  highlights?: RunCombatHighlights;
  medals: CombatMedalBadge[];
}

/**
 * Pure client-side HTML5 Canvas 2D renderer generating a 1200x675 obsidian-and-gold
 * AAA Battle Honor Card PNG data URL with zero external network dependencies.
 */
export function renderAaaMedalCardPngDataUrl(
  input: AaaMedalCardRenderInput
): string | null {
  if (typeof document === 'undefined') return null;
  const W = 1200;
  const H = 675;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const styleInfo = computeComboStyleRank(input.maxCombo);
  const totalDmg = input.damageBreakdown
    ? input.damageBreakdown.basic +
      input.damageBreakdown.ultimate +
      input.damageBreakdown.pet +
      input.damageBreakdown.elemental
    : 0;
  const elapsedSec = Math.max(1, Math.round(input.damageBreakdown?.elapsedSeconds ?? 1));
  const avgDps = Math.round(totalDmg / elapsedSec);

  // 1. Deep Obsidian Celestial Background
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#040714');
  bg.addColorStop(0.52, '#0b122b');
  bg.addColorStop(1, '#070b1a');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Radial accent glow behind Style Rank emblem
  const glow = ctx.createRadialGradient(970, 175, 24, 970, 175, 280);
  glow.addColorStop(0, input.isVictory ? 'rgba(251, 191, 36, 0.28)' : 'rgba(244, 63, 94, 0.24)');
  glow.addColorStop(1, 'rgba(4, 7, 20, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Subtle decorative constellation lines in backdrop
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.12)';
  ctx.lineWidth = 1.2;
  const stars: Array<[number, number]> = [
    [110, 95], [220, 62], [350, 118], [520, 74],
    [820, 90], [990, 58], [1110, 140], [1060, 480], [920, 560],
  ];
  ctx.beginPath();
  for (let i = 0; i < stars.length - 1; i++) {
    ctx.moveTo(stars[i][0], stars[i][1]);
    ctx.lineTo(stars[i + 1][0], stars[i + 1][1]);
  }
  ctx.stroke();
  for (const [sx, sy] of stars) {
    ctx.fillStyle = 'rgba(254, 240, 138, 0.42)';
    ctx.beginPath();
    ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Outer ornate gold hairline border
  ctx.strokeStyle = input.isVictory ? 'rgba(251, 191, 36, 0.72)' : 'rgba(251, 113, 133, 0.65)';
  ctx.lineWidth = 2.5;
  ctx.strokeRect(24, 24, W - 48, H - 48);
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.22)';
  ctx.lineWidth = 1;
  ctx.strokeRect(34, 34, W - 68, H - 68);

  // Header Kicker & Title
  ctx.fillStyle = '#fbbf24';
  ctx.font = '700 18px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('AETHERBOW 3D  ·  THẺ CHIẾN TÍCH HOÀNG ĐẠO', 64, 82);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 46px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(input.isVictory ? 'CHIẾN THẮNG KHẢI HOÀN' : 'CHIẾN TÍCH HẠC ĐẠO', 64, 142);

  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 22px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(`${input.chapterName}  ·  ${input.stageLabel}  ·  ${input.heroName}`, 64, 180);

  // Style Rank Medallion (Top-Right)
  ctx.save();
  ctx.translate(990, 142);
  ctx.strokeStyle = styleInfo.accentHex;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 74, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(8, 13, 30, 0.92)';
  ctx.fill();
  ctx.fillStyle = styleInfo.accentHex;
  ctx.font = '900 54px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(styleInfo.grade, 0, 14);
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 13px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText(styleInfo.title.toUpperCase(), 0, 42);
  ctx.restore();

  // Horizontal Hairline Divider
  ctx.strokeStyle = 'rgba(251, 191, 36, 0.22)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(64, 212);
  ctx.lineTo(W - 64, 212);
  ctx.stroke();

  // 4-Column Primary Metrics Row
  const statCols: Array<{ label: string; value: string; color: string }> = [
    { label: 'HẠ GỤC', value: input.kills.toLocaleString('vi-VN'), color: '#38bdf8' },
    { label: 'COMBO ĐỈNH', value: `${input.maxCombo}×`, color: '#fbbf24' },
    { label: 'DPS TRUNG BÌNH', value: avgDps.toLocaleString('vi-VN'), color: '#34d399' },
    {
      label: 'THỜI GIAN',
      value: `${Math.floor(elapsedSec / 60)}p ${(elapsedSec % 60).toString().padStart(2, '0')}s`,
      color: '#e2e8f0',
    },
  ];
  statCols.forEach((col, i) => {
    const x = 64 + i * 272;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '700 14px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(col.label, x, 250);
    ctx.fillStyle = col.color;
    ctx.font = '900 34px "JetBrains Mono", monospace';
    ctx.fillText(col.value, x, 294);
  });

  // Left Column: Damage Breakdown Bars
  ctx.fillStyle = '#fbbf24';
  ctx.font = '800 16px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('TỶ TRỌNG SÁT THƯƠNG', 64, 356);

  const shareObj = input.damageBreakdown
    ? computePostRunDamageShares(input.damageBreakdown)
    : null;
  const shareRows: Array<{ label: string; pct: number; amount: number; color: string }> =
    shareObj && shareObj.total > 0 && input.damageBreakdown
      ? [
          {
            label: 'Cung Tiễn Cơ Bản',
            pct: shareObj.basicPct,
            amount: Math.round(input.damageBreakdown.basic),
            color: '#fbbf24',
          },
          {
            label: 'Tuyệt Chiêu & Kỹ Năng',
            pct: shareObj.ultimatePct,
            amount: Math.round(input.damageBreakdown.ultimate),
            color: '#c084fc',
          },
          {
            label: 'Nguyên Tố & Phản Ứng',
            pct: shareObj.elementalPct,
            amount: Math.round(input.damageBreakdown.elemental),
            color: '#38bdf8',
          },
          {
            label: 'Tinh Linh & Đồng Hành',
            pct: shareObj.petPct,
            amount: Math.round(input.damageBreakdown.pet),
            color: '#34d399',
          },
        ]
      : [];
  if (shareRows.length > 0) {
    shareRows.forEach((s, idx) => {
      const y = 382 + idx * 46;
      ctx.fillStyle = '#e2e8f0';
      ctx.font = '600 16px "Plus Jakarta Sans", system-ui, sans-serif';
      ctx.fillText(s.label, 64, y);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '700 15px "JetBrains Mono", monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`${s.pct}%  (${s.amount.toLocaleString('vi-VN')})`, 560, y);
      ctx.textAlign = 'left';

      ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
      ctx.fillRect(64, y + 10, 496, 10);
      ctx.fillStyle = s.color;
      ctx.fillRect(64, y + 10, Math.max(4, (496 * s.pct) / 100), 10);
    });
  } else {
    ctx.fillStyle = '#94a3b8';
    ctx.font = '600 16px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(`Tổng vàng nhận: +${input.goldEarned.toLocaleString('vi-VN')}  ·  Ngọc: +${input.gemsEarned}`, 64, 396);
  }

  // Right Column: Honor Medals
  ctx.fillStyle = '#fbbf24';
  ctx.font = '800 16px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.fillText('HUY HIỆU DANH DỰ', 630, 356);

  input.medals.slice(0, 3).forEach((medal, idx) => {
    const y = 376 + idx * 62;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.86)';
    ctx.fillRect(630, y, 506, 52);
    ctx.strokeStyle = medal.accentHex;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(630, y, 506, 52);

    ctx.fillStyle = medal.accentHex;
    ctx.font = '800 18px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(medal.title, 650, y + 24);
    ctx.fillStyle = '#cbd5e1';
    ctx.font = '600 14px "Plus Jakarta Sans", system-ui, sans-serif';
    ctx.fillText(medal.subtitle, 650, y + 43);
  });

  // Footer Summary Line
  const h = input.highlights ?? {};
  const footerBits = [
    `+${input.goldEarned.toLocaleString('vi-VN')} Vàng`,
    `+${input.gemsEarned.toLocaleString('vi-VN')} Ngọc`,
  ];
  if ((h.peakCritDamage ?? 0) > 0) {
    footerBits.push(`Chí Mạng Đỉnh ${Math.round(h.peakCritDamage!).toLocaleString('vi-VN')}`);
  }
  if ((h.weakPointHits ?? 0) > 0) footerBits.push(`Điểm Yếu ×${h.weakPointHits}`);
  if ((h.trapsTriggered ?? 0) > 0) footerBits.push(`Trụ Cộng Hưởng ×${h.trapsTriggered}`);

  ctx.strokeStyle = 'rgba(251, 191, 36, 0.22)';
  ctx.beginPath();
  ctx.moveTo(64, 592);
  ctx.lineTo(W - 64, 592);
  ctx.stroke();

  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 16px "JetBrains Mono", monospace';
  ctx.fillText(footerBits.join('  ·  '), 64, 626);

  ctx.fillStyle = '#64748b';
  ctx.font = '600 14px "Plus Jakarta Sans", system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(new Date().toLocaleDateString('vi-VN'), W - 64, 626);

  return canvas.toDataURL('image/png');
}

import type {
  EnemyFormationDoctrine,
  TacticalCrossroadsId,
  TacticalCrossroadsOption,
} from '../types/game';

/**
 * ============================================================================
 * WAVE 15 — PURE COMBAT PHYSICS, RIPOSTE & TACTICAL CROSSROADS SIMULATION
 * ============================================================================
 * Zero DOM / Three.js / Node dependencies and Zero-GC out-parameter hot paths
 * so Dell Latitude E5430 maintains steady frame pacing with 0 PointLights.
 */

// ============================================================================
// 1. ZODIAC COUNTER-VOLLEY RIPOSTE (PHẢN TIỄN NÉ HOÀN HẢO)
// ============================================================================

export interface RiposteArrowEnhancement {
  extraPierce: number;
  bossGuardBreakMult: number;
  knockbackMult: number;
  hitStopSec: number;
  damageBonusMult: number;
  label: string;
}

export function computeRiposteArrowEnhancement(params: {
  activeSynergyMaxScale: number;
  reducedMotion: boolean;
}): RiposteArrowEnhancement {
  const tierScale = Math.max(0, Math.min(3, Number.isFinite(params.activeSynergyMaxScale) ? params.activeSynergyMaxScale : 0));
  const damageBonusMult = Number((1 + tierScale * 0.08).toFixed(3));
  return {
    extraPierce: 1,
    bossGuardBreakMult: 1.45,
    knockbackMult: 1.35,
    hitStopSec: params.reducedMotion ? 0 : 0.032,
    damageBonusMult,
    label: tierScale > 0 ? 'PHẢN TIỄN CỘNG HƯỞNG!' : 'PHẢN TIỄN HOÀNG ĐẠO!',
  };
}

// ============================================================================
// 2. WALL-SLAM IMPACT PHYSICS (VẬT LÝ VA TƯỜNG CHOÁNG — ZERO-GC)
// ============================================================================

export const WALL_SLAM_MIN_IMPULSE = 0.42;
export const WALL_SLAM_STUN_SEC = 0.75;
export const WALL_SLAM_BONUS_DAMAGE_MULT = 0.18;
export const WALL_SLAM_COOLDOWN_SEC = 1.6;
export const WALL_SLAM_WALL_MARGIN = 0.32;

export interface WallSlamPillarCollider {
  x: number;
  z: number;
  radius: number;
  broken?: boolean;
}

export interface WallSlamEvalInput {
  nextX: number;
  nextZ: number;
  clampedX: number;
  clampedZ: number;
  knockbackImpulse: number;
  arenaHalfW: number;
  arenaHalfD: number;
  enemyRadius: number;
  isBoss: boolean;
  isDummy: boolean;
  wallSlamCooldownRemaining: number;
  pillars?: readonly WallSlamPillarCollider[];
}

export interface WallSlamImpactResult {
  triggered: boolean;
  source: 'none' | 'wall' | 'pillar';
  hitX: number;
  hitZ: number;
  stunDurationSec: number;
  bonusDamageMultiplier: number;
  bossStaggerOnly: boolean;
  nextCooldownSec: number;
}

export function createWallSlamResultScratch(): WallSlamImpactResult {
  return {
    triggered: false,
    source: 'none',
    hitX: 0,
    hitZ: 0,
    stunDurationSec: 0,
    bonusDamageMultiplier: 0,
    bossStaggerOnly: false,
    nextCooldownSec: 0,
  };
}

/**
 * Zero-GC Wall-Slam Impact evaluator.
 * Mutates `out` in place and returns it so 60Hz combat loops allocate 0 objects.
 */
export function evaluateWallSlamImpact(
  input: WallSlamEvalInput,
  out: WallSlamImpactResult
): WallSlamImpactResult {
  out.triggered = false;
  out.source = 'none';
  out.hitX = input.clampedX;
  out.hitZ = input.clampedZ;
  out.stunDurationSec = 0;
  out.bonusDamageMultiplier = 0;
  out.bossStaggerOnly = false;
  out.nextCooldownSec = Math.max(0, input.wallSlamCooldownRemaining);

  if (
    input.isDummy ||
    input.wallSlamCooldownRemaining > 0 ||
    !Number.isFinite(input.knockbackImpulse) ||
    input.knockbackImpulse < WALL_SLAM_MIN_IMPULSE
  ) {
    return out;
  }

  const maxX = Math.max(1, input.arenaHalfW - Math.max(0.5, input.enemyRadius + 0.35));
  const maxZ = Math.max(1, input.arenaHalfD - Math.max(0.5, input.enemyRadius + 0.35));

  const hitWallX = Math.abs(input.nextX) >= maxX - WALL_SLAM_WALL_MARGIN && Math.abs(input.clampedX) >= maxX - WALL_SLAM_WALL_MARGIN - 0.08;
  const hitWallZ = Math.abs(input.nextZ) >= maxZ - WALL_SLAM_WALL_MARGIN && Math.abs(input.clampedZ) >= maxZ - WALL_SLAM_WALL_MARGIN - 0.08;

  if (hitWallX || hitWallZ) {
    out.triggered = true;
    out.source = 'wall';
    out.hitX = input.clampedX;
    out.hitZ = input.clampedZ;
    out.bossStaggerOnly = input.isBoss;
    out.stunDurationSec = input.isBoss ? 0 : WALL_SLAM_STUN_SEC;
    out.bonusDamageMultiplier = WALL_SLAM_BONUS_DAMAGE_MULT;
    out.nextCooldownSec = WALL_SLAM_COOLDOWN_SEC;
    return out;
  }

  const pillars = input.pillars;
  if (pillars && pillars.length > 0) {
    const eRad = Math.max(0.45, input.enemyRadius);
    for (let i = 0; i < pillars.length; i++) {
      const p = pillars[i];
      if (p.broken) continue;
      const dx = input.clampedX - p.x;
      const dz = input.clampedZ - p.z;
      const touchDist = p.radius + eRad + 0.28;
      if (dx * dx + dz * dz <= touchDist * touchDist) {
        out.triggered = true;
        out.source = 'pillar';
        out.hitX = p.x;
        out.hitZ = p.z;
        out.bossStaggerOnly = input.isBoss;
        out.stunDurationSec = input.isBoss ? 0 : WALL_SLAM_STUN_SEC;
        out.bonusDamageMultiplier = WALL_SLAM_BONUS_DAMAGE_MULT;
        out.nextCooldownSec = WALL_SLAM_COOLDOWN_SEC;
        return out;
      }
    }
  }

  return out;
}

// ============================================================================
// 3. TACTICAL ROOM CROSSROADS & ENEMY FORMATION DOCTRINES
// ============================================================================

export const TACTICAL_CROSSROADS_CATALOG: Record<
  TacticalCrossroadsId,
  TacticalCrossroadsOption
> = {
  ambush_vault: {
    id: 'ambush_vault',
    title: 'Kho Báu Phục Kích',
    subtitle: 'Đột kích kho báu tinh tú được bảo vệ bởi đội hình Gọng Kìm',
    glyph: '◆',
    accentHex: '#f59e0b',
    doctrine: 'pincer_flank',
    doctrineLabel: 'Đội Hình Gọng Kìm',
    riskSummary: 'Quái +18% Máu · +10% Công · Ép cánh 2 bên',
    rewardSummary: '+35% Vàng · +25% Bụi Sao · +8% Tỉ Lệ Chí Mạng',
    enemyHpMult: 1.18,
    enemyDmgMult: 1.1,
    goldBonusPct: 35,
    starDustBonusPct: 25,
    instantHealRatio: 0,
    bonusAtkPct: 0,
    bonusCritPct: 0.08,
  },
  sanctuary_spring: {
    id: 'sanctuary_spring',
    title: 'Suối Thánh Hồi Nguyên',
    subtitle: 'Tái tạo sinh lực trước đội hình Trận Cân Bằng tiêu chuẩn',
    glyph: '✦',
    accentHex: '#10b981',
    doctrine: 'balanced_line',
    doctrineLabel: 'Đội Hình Cân Bằng',
    riskSummary: 'Quái chuẩn · Giữ nhịp hồi phục an toàn',
    rewardSummary: 'Hồi +28% Máu Tối Đa · +10% Vàng',
    enemyHpMult: 1.0,
    enemyDmgMult: 1.0,
    goldBonusPct: 10,
    starDustBonusPct: 0,
    instantHealRatio: 0.28,
    bonusAtkPct: 0,
    bonusCritPct: 0,
  },
  rune_bastion: {
    id: 'rune_bastion',
    title: 'Pháo Đài Cổ Ngữ',
    subtitle: 'Xuyên phá tuyến Khiên Giáp để chiếm ấn chú tăng sát thương',
    glyph: '▲',
    accentHex: '#38bdf8',
    doctrine: 'shield_wall',
    doctrineLabel: 'Đội Hình Khiên Giáp',
    riskSummary: 'Quái tuyến trước +22% Máu · Đội hình hộ vệ xạ thủ',
    rewardSummary: '+14% ATK (đến hết chương) · +20% Bụi Sao',
    enemyHpMult: 1.14,
    enemyDmgMult: 1.06,
    goldBonusPct: 15,
    starDustBonusPct: 20,
    instantHealRatio: 0.08,
    bonusAtkPct: 0.14,
    bonusCritPct: 0.04,
  },
};

export const TACTICAL_CROSSROADS_IDS: readonly TacticalCrossroadsId[] = [
  'ambush_vault',
  'sanctuary_spring',
  'rune_bastion',
];

export interface EnemyFormationDoctrineProfile {
  doctrine: EnemyFormationDoctrine;
  label: string;
  flankSpreadX: number;
  vanguardForwardBiasZ: number;
  rangedBackBiasZ: number;
  vanguardHpMult: number;
  rangedAspdMult: number;
}

const DOCTRINE_PROFILES: Record<EnemyFormationDoctrine, EnemyFormationDoctrineProfile> = {
  pincer_flank: {
    doctrine: 'pincer_flank',
    label: 'Đội Hình Gọng Kìm',
    flankSpreadX: 1.38,
    vanguardForwardBiasZ: 1.6,
    rangedBackBiasZ: -1.1,
    vanguardHpMult: 1.05,
    rangedAspdMult: 1.1,
  },
  balanced_line: {
    doctrine: 'balanced_line',
    label: 'Đội Hình Cân Bằng',
    flankSpreadX: 1.0,
    vanguardForwardBiasZ: 0.6,
    rangedBackBiasZ: -0.6,
    vanguardHpMult: 1.0,
    rangedAspdMult: 1.0,
  },
  shield_wall: {
    doctrine: 'shield_wall',
    label: 'Đội Hình Khiên Giáp',
    flankSpreadX: 0.72,
    vanguardForwardBiasZ: 2.3,
    rangedBackBiasZ: -2.2,
    vanguardHpMult: 1.22,
    rangedAspdMult: 1.05,
  },
};

export function resolveFormationDoctrineProfile(
  doctrine: EnemyFormationDoctrine
): EnemyFormationDoctrineProfile {
  return DOCTRINE_PROFILES[doctrine] ?? DOCTRINE_PROFILES.balanced_line;
}

export interface CrossroadsRollInput {
  chapterId: number;
  stageCleared: number;
  isCampaignMode: boolean;
  runSeed: number;
}

/**
 * Mid-chapter Risk/Reward Crossroads strictly for Campaign Chapters 2..12
 * after Stage 4 and Stage 8. Disabled on Chapter 1 (FTUE protection) and
 * special modes (Tower/Arena/Boss Rush/Training).
 */
export function rollTacticalCrossroadsPair(
  input: CrossroadsRollInput
): [TacticalCrossroadsOption, TacticalCrossroadsOption] | null {
  if (!input.isCampaignMode) return null;
  if (input.chapterId < 2 || input.chapterId > 12) return null;
  if (input.stageCleared !== 4 && input.stageCleared !== 8) return null;

  const hash = Math.abs(
    Math.imul(input.chapterId * 37 + input.stageCleared * 131 + Math.floor(input.runSeed || 1), 2654435761)
  );
  // Always pair one high-risk vault/bastion with either sanctuary or the alternate tactical option
  const pairIndex = hash % 3;
  if (pairIndex === 0) {
    return [TACTICAL_CROSSROADS_CATALOG.ambush_vault, TACTICAL_CROSSROADS_CATALOG.sanctuary_spring];
  }
  if (pairIndex === 1) {
    return [TACTICAL_CROSSROADS_CATALOG.rune_bastion, TACTICAL_CROSSROADS_CATALOG.sanctuary_spring];
  }
  return [TACTICAL_CROSSROADS_CATALOG.ambush_vault, TACTICAL_CROSSROADS_CATALOG.rune_bastion];
}

export function applyCrossroadsRewardBonus(
  base: { gold: number; starDust: number },
  activeOptionId: TacticalCrossroadsId | null | undefined
): { gold: number; starDust: number; bonusGold: number; bonusStarDust: number } {
  const safeGold = Math.max(0, Math.floor(base.gold || 0));
  const safeDust = Math.max(0, Math.floor(base.starDust || 0));
  if (!activeOptionId || !(activeOptionId in TACTICAL_CROSSROADS_CATALOG)) {
    return { gold: safeGold, starDust: safeDust, bonusGold: 0, bonusStarDust: 0 };
  }
  const opt = TACTICAL_CROSSROADS_CATALOG[activeOptionId];
  const bonusGold = Math.round((safeGold * opt.goldBonusPct) / 100);
  const bonusStarDust = Math.round((safeDust * opt.starDustBonusPct) / 100);
  return {
    gold: safeGold + bonusGold,
    starDust: safeDust + bonusStarDust,
    bonusGold,
    bonusStarDust,
  };
}

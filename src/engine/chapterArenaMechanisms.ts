export type ArenaMechanismKind =
  | 'solar_obelisk'
  | 'magma_vent'
  | 'emerald_crystal'
  | 'astral_prism';

export interface ArenaObstacleCircle {
  x: number;
  z: number;
  radius: number;
}

export interface ArenaMechanismSpec {
  kind: ArenaMechanismKind;
  name: string;
  shortLabel: string;
  description: string;
  accentHex: number;
  secondaryHex: number;
  triggerRadius: number;
  effectRadius: number;
  cooldownSec: number;
  buffDurationSec: number;
  /** Multiplicative damage ratio based on player ATK (0 for pure defense/utility). */
  damageAtkMult: number;
  stunSec: number;
  bossStaggerRatio: number;
  healPct: number;
  shieldPct: number;
  atkBonusPct: number;
  atkSpeedBonusPct: number;
  moveSpeedBonusPct: number;
  drBonusPct: number;
  ultChargeBonus: number;
  resetDash: boolean;
  burnDurationSec: number;
  armorSunderSec: number;
}

export interface ArenaMechanismInstance {
  id: string;
  chapterId: number;
  kind: ArenaMechanismKind;
  x: number;
  z: number;
  state: 'ready' | 'cooldown';
  cooldownRemaining: number;
  cooldownMax: number;
  triggerCount: number;
  pulsePhase: number;
}

export interface ArenaMechanismTriggerResult {
  triggered: boolean;
  mechanismId: string;
  kind: ArenaMechanismKind;
  x: number;
  z: number;
  spec: ArenaMechanismSpec;
  bannerText: string;
}

export interface ArenaMechanismRenderBudget {
  cylinderSegments: number;
  ringSegments: number;
  allowPointLight: boolean;
  allowAmbientOrbiters: boolean;
}

export const ARENA_MECHANISM_SPECS: Record<ArenaMechanismKind, ArenaMechanismSpec> = {
  solar_obelisk: {
    kind: 'solar_obelisk',
    name: 'Trụ Nhật Luân',
    shortLabel: 'Nhật Luân',
    description: 'Kích hoạt sóng Thái Dương làm choáng quái, phá giáp Boss và tăng +20% Công trong 5.5s.',
    accentHex: 0xf59e0b,
    secondaryHex: 0xfef08a,
    triggerRadius: 2.15,
    effectRadius: 5.6,
    cooldownSec: 15,
    buffDurationSec: 5.5,
    damageAtkMult: 2.4,
    stunSec: 1.4,
    bossStaggerRatio: 0.18,
    healPct: 0,
    shieldPct: 0,
    atkBonusPct: 0.2,
    atkSpeedBonusPct: 0,
    moveSpeedBonusPct: 0,
    drBonusPct: 0,
    ultChargeBonus: 0.08,
    resetDash: false,
    burnDurationSec: 0,
    armorSunderSec: 0,
  },
  magma_vent: {
    kind: 'magma_vent',
    name: 'Mạch Dung Nham',
    shortLabel: 'Dung Nham',
    description: 'Bùng nổ địa nhiệt gây thiêu đốt diện rộng và phá vỡ 20% phòng thủ kẻ địch trong 5s.',
    accentHex: 0xef4444,
    secondaryHex: 0xf97316,
    triggerRadius: 2.15,
    effectRadius: 5.8,
    cooldownSec: 15,
    buffDurationSec: 5.0,
    damageAtkMult: 2.8,
    stunSec: 0.45,
    bossStaggerRatio: 0.16,
    healPct: 0,
    shieldPct: 0,
    atkBonusPct: 0.14,
    atkSpeedBonusPct: 0,
    moveSpeedBonusPct: 0,
    drBonusPct: 0,
    ultChargeBonus: 0.08,
    resetDash: false,
    burnDurationSec: 5.0,
    armorSunderSec: 5.0,
  },
  emerald_crystal: {
    kind: 'emerald_crystal',
    name: 'Tinh Thể Lục Bảo',
    shortLabel: 'Lục Bảo',
    description: 'Hồi 14% HP tối đa, tạo Khiên 18% HP, tăng +22% Giảm Thương và đẩy lùi quái áp sát.',
    accentHex: 0x10b981,
    secondaryHex: 0x6ee7b7,
    triggerRadius: 2.25,
    effectRadius: 5.2,
    cooldownSec: 16,
    buffDurationSec: 6.0,
    damageAtkMult: 1.15,
    stunSec: 0.6,
    bossStaggerRatio: 0.12,
    healPct: 0.14,
    shieldPct: 0.18,
    atkBonusPct: 0,
    atkSpeedBonusPct: 0,
    moveSpeedBonusPct: 0,
    drBonusPct: 0.22,
    ultChargeBonus: 0.1,
    resetDash: false,
    burnDurationSec: 0,
    armorSunderSec: 0,
  },
  astral_prism: {
    kind: 'astral_prism',
    name: 'Lăng Kính Song Tử',
    shortLabel: 'Lăng Kính',
    description: 'Tăng +30% Tốc Bắn, +22% Tốc Chạy, hồi ngay Lướt Né và cộng +25% Nộ Tuyệt Kỹ trong 5.5s.',
    accentHex: 0x38bdf8,
    secondaryHex: 0xc084fc,
    triggerRadius: 2.2,
    effectRadius: 4.8,
    cooldownSec: 14,
    buffDurationSec: 5.5,
    damageAtkMult: 1.5,
    stunSec: 0.35,
    bossStaggerRatio: 0.12,
    healPct: 0,
    shieldPct: 0,
    atkBonusPct: 0.08,
    atkSpeedBonusPct: 0.3,
    moveSpeedBonusPct: 0.22,
    drBonusPct: 0,
    ultChargeBonus: 0.25,
    resetDash: true,
    burnDurationSec: 0,
    armorSunderSec: 0,
  },
};

/**
 * Maps every Chapter 1..12 to its canonical Zodiac Arena Mechanism archetype:
 * - Ch.1 / 5 / 9  (Solar / Leo / Sagittarius / Fire)   -> solar_obelisk
 * - Ch.2 / 6 / 10 (Magma / Aries / Scorpio / Forge)    -> magma_vent
 * - Ch.3 / 7 / 11 (Emerald / Taurus / Virgo / Earth)   -> emerald_crystal
 * - Ch.4 / 8 / 12 (Astral / Gemini / Libra / Air-Star) -> astral_prism
 */
export function resolveChapterArenaMechanismKind(chapterId: number): ArenaMechanismKind {
  const safeCh = Math.max(1, Math.floor(Number.isFinite(chapterId) ? chapterId : 1));
  const slot = ((safeCh - 1) % 4) + 1;
  switch (slot) {
    case 2:
      return 'magma_vent';
    case 3:
      return 'emerald_crystal';
    case 4:
      return 'astral_prism';
    case 1:
    default:
      return 'solar_obelisk';
  }
}

export function getChapterArenaMechanismSpec(chapterId: number): ArenaMechanismSpec {
  return ARENA_MECHANISM_SPECS[resolveChapterArenaMechanismKind(chapterId)];
}

/**
 * Computes Dell Latitude E5430 & Watchdog-aware rendering budget for 3D arena mechanisms.
 * Guarantees zero extra dynamic PointLights on Lite mode or Watchdog Stage >= 2.
 */
export function resolveMechanismRenderBudget(options: {
  isLiteMode: boolean;
  watchdogStage: number;
  reducedMotion?: boolean;
}): ArenaMechanismRenderBudget {
  const constrained = options.isLiteMode || options.watchdogStage >= 2;
  return {
    cylinderSegments: constrained ? 6 : 12,
    ringSegments: constrained ? 16 : 32,
    allowPointLight: false, // Zero extra dynamic lights across all tiers for E5430 thermal headroom
    allowAmbientOrbiters: !constrained && !options.reducedMotion,
  };
}

/**
 * Places 1-2 interactive chapter mechanisms symmetrically inside the arena while strictly
 * avoiding the center spawn zone, arena perimeter walls, and every obstacle pillar.
 */
export function spawnChapterArenaMechanisms(params: {
  chapterId: number;
  stageIndex: number;
  arenaHalfW: number;
  arenaHalfD: number;
  obstacles: readonly ArenaObstacleCircle[];
  isBossStage?: boolean;
  count?: number;
}): ArenaMechanismInstance[] {
  const kind = resolveChapterArenaMechanismKind(params.chapterId);
  const spec = ARENA_MECHANISM_SPECS[kind];
  const targetCount = Math.max(1, Math.min(2, params.count ?? (params.isBossStage ? 2 : 1)));
  const marginX = Math.max(2.6, params.arenaHalfW * 0.22);
  const marginZ = Math.max(2.6, params.arenaHalfD * 0.24);
  const maxX = Math.max(3.0, params.arenaHalfW - marginX);
  const maxZ = Math.max(3.0, params.arenaHalfD - marginZ);

  const flipSign = params.stageIndex % 2 === 0 ? 1 : -1;
  const candidateAnchors: Array<{ x: number; z: number }> = [
    { x: -maxX * 0.62 * flipSign, z: -maxZ * 0.28 },
    { x: maxX * 0.62 * flipSign, z: maxZ * 0.24 },
    { x: -maxX * 0.52 * flipSign, z: maxZ * 0.36 },
    { x: maxX * 0.52 * flipSign, z: -maxZ * 0.36 },
    { x: 0, z: -maxZ * 0.52 },
    { x: 0, z: maxZ * 0.52 },
  ];

  const placed: ArenaMechanismInstance[] = [];

  for (const cand of candidateAnchors) {
    if (placed.length >= targetCount) break;
    const clampedX = Math.max(-maxX, Math.min(maxX, cand.x));
    const clampedZ = Math.max(-maxZ, Math.min(maxZ, cand.z));

    // Keep clear of center player spawn (0, 0) by >= 3.2 units
    if (Math.hypot(clampedX, clampedZ) < 3.2) continue;

    // Keep clear of all obstacle pillars
    let blocked = false;
    for (const obs of params.obstacles) {
      if (Math.hypot(clampedX - obs.x, clampedZ - obs.z) < obs.radius + 1.85) {
        blocked = true;
        break;
      }
    }
    if (blocked) continue;

    // Keep mechanisms spaced apart from each other
    if (placed.some((p) => Math.hypot(clampedX - p.x, clampedZ - p.z) < 5.0)) continue;

    placed.push({
      id: `mech_ch${params.chapterId}_s${params.stageIndex}_${placed.length + 1}`,
      chapterId: params.chapterId,
      kind,
      x: Number(clampedX.toFixed(2)),
      z: Number(clampedZ.toFixed(2)),
      state: 'ready',
      cooldownRemaining: 0,
      cooldownMax: spec.cooldownSec,
      triggerCount: 0,
      pulsePhase: placed.length * Math.PI,
    });
  }

  // Fallback safe placement if obstacle density was unusually high
  if (placed.length === 0) {
    placed.push({
      id: `mech_ch${params.chapterId}_s${params.stageIndex}_1`,
      chapterId: params.chapterId,
      kind,
      x: Number((-maxX * 0.55 * flipSign).toFixed(2)),
      z: 0,
      state: 'ready',
      cooldownRemaining: 0,
      cooldownMax: spec.cooldownSec,
      triggerCount: 0,
      pulsePhase: 0,
    });
  }

  return placed;
}

/**
 * Advances cooldown timers and pulse phase for all active arena mechanisms.
 */
export function stepArenaMechanisms(
  mechanisms: ArenaMechanismInstance[],
  dt: number
): void {
  if (!Number.isFinite(dt) || dt <= 0) return;
  for (let i = 0; i < mechanisms.length; i++) {
    const m = mechanisms[i];
    m.pulsePhase += dt * 2.4;
    if (m.state === 'cooldown') {
      m.cooldownRemaining = Math.max(0, m.cooldownRemaining - dt);
      if (m.cooldownRemaining <= 0.001) {
        m.cooldownRemaining = 0;
        m.state = 'ready';
      }
    }
  }
}

/**
 * Checks whether a player position or player projectile hits/activates a ready mechanism.
 */
export function tryTriggerArenaMechanism(
  mechanisms: ArenaMechanismInstance[],
  probeX: number,
  probeZ: number,
  extraRadius = 0
): ArenaMechanismTriggerResult | null {
  for (let i = 0; i < mechanisms.length; i++) {
    const m = mechanisms[i];
    if (m.state !== 'ready') continue;
    const spec = ARENA_MECHANISM_SPECS[m.kind];
    const dist = Math.hypot(probeX - m.x, probeZ - m.z);
    if (dist <= spec.triggerRadius + Math.max(0, extraRadius)) {
      m.state = 'cooldown';
      m.cooldownRemaining = spec.cooldownSec;
      m.cooldownMax = spec.cooldownSec;
      m.triggerCount += 1;
      return {
        triggered: true,
        mechanismId: m.id,
        kind: m.kind,
        x: m.x,
        z: m.z,
        spec,
        bannerText: `Kích hoạt ${spec.name}!`,
      };
    }
  }
  return null;
}

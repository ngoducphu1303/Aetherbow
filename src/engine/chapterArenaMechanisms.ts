import type { GpuWatchdogStage } from '../types/game';

export type ArenaMechanismKind =
  | 'solar_obelisk'
  | 'volcanic_forge'
  | 'emerald_crystal'
  | 'astral_prism';

export interface ArenaMechanismSpec {
  kind: ArenaMechanismKind;
  name: string;
  shortLabel: string;
  accentHex: number;
  secondaryHex: number;
  triggerRadius: number;
  effectRadius: number;
  cooldownSec: number;
  healPct: number;
  shieldPct: number;
  ultChargeBonus: number;
  resetDash: boolean;
  buffDurationSec: number;
  atkBonusPct: number;
  atkSpeedBonusPct: number;
  moveSpeedBonusPct: number;
  drBonusPct: number;
  damageAtkMult: number;
  stunSec: number;
  bossStaggerRatio: number;
  armorSunderSec: number;
  burnDurationSec: number;
}

export interface ArenaMechanismInstance {
  id: string;
  kind: ArenaMechanismKind;
  x: number;
  z: number;
  cooldownLeft: number;
  maxCooldown: number;
  ready: boolean;
  state: 'ready' | 'cooldown';
  pulsePhase: number;
}

export const ARENA_MECHANISM_SPECS: Record<ArenaMechanismKind, ArenaMechanismSpec> = {
  solar_obelisk: {
    kind: 'solar_obelisk',
    name: 'Trụ Nhật Luân',
    shortLabel: 'NHẬT LUÂN BÙNG NỔ',
    accentHex: 0xf59e0b,
    secondaryHex: 0xfef08a,
    triggerRadius: 2.0,
    effectRadius: 6.2,
    cooldownSec: 16,
    healPct: 0.08,
    shieldPct: 0.1,
    ultChargeBonus: 0.18,
    resetDash: true,
    buffDurationSec: 5.5,
    atkBonusPct: 0.18,
    atkSpeedBonusPct: 0.12,
    moveSpeedBonusPct: 0.1,
    drBonusPct: 0.08,
    damageAtkMult: 2.1,
    stunSec: 1.2,
    bossStaggerRatio: 0.16,
    armorSunderSec: 4.0,
    burnDurationSec: 3.5,
  },
  volcanic_forge: {
    kind: 'volcanic_forge',
    name: 'Lò Rèn Hỏa Sơn',
    shortLabel: 'HỎA LÒ QUÁ TẢI',
    accentHex: 0xf97316,
    secondaryHex: 0xfdba74,
    triggerRadius: 2.0,
    effectRadius: 6.6,
    cooldownSec: 15,
    healPct: 0,
    shieldPct: 0.12,
    ultChargeBonus: 0.16,
    resetDash: false,
    buffDurationSec: 6.0,
    atkBonusPct: 0.24,
    atkSpeedBonusPct: 0.16,
    moveSpeedBonusPct: 0.08,
    drBonusPct: 0,
    damageAtkMult: 2.45,
    stunSec: 1.0,
    bossStaggerRatio: 0.18,
    armorSunderSec: 4.5,
    burnDurationSec: 4.0,
  },
  emerald_crystal: {
    kind: 'emerald_crystal',
    name: 'Tinh Thể Lục Bảo',
    shortLabel: 'LỤC BẢO HỘ THÂN',
    accentHex: 0x10b981,
    secondaryHex: 0x6ee7b7,
    triggerRadius: 2.1,
    effectRadius: 5.8,
    cooldownSec: 15,
    healPct: 0.14,
    shieldPct: 0.16,
    ultChargeBonus: 0.14,
    resetDash: true,
    buffDurationSec: 6.5,
    atkBonusPct: 0.12,
    atkSpeedBonusPct: 0.14,
    moveSpeedBonusPct: 0.16,
    drBonusPct: 0.16,
    damageAtkMult: 1.75,
    stunSec: 1.4,
    bossStaggerRatio: 0.15,
    armorSunderSec: 3.5,
    burnDurationSec: 0,
  },
  astral_prism: {
    kind: 'astral_prism',
    name: 'Lăng Kính Song Tử',
    shortLabel: 'LĂNG KÍNH CỘNG HƯỞNG',
    accentHex: 0x38bdf8,
    secondaryHex: 0xc084fc,
    triggerRadius: 2.1,
    effectRadius: 6.8,
    cooldownSec: 14,
    healPct: 0.06,
    shieldPct: 0.12,
    ultChargeBonus: 0.24,
    resetDash: true,
    buffDurationSec: 5.5,
    atkBonusPct: 0.16,
    atkSpeedBonusPct: 0.22,
    moveSpeedBonusPct: 0.18,
    drBonusPct: 0.1,
    damageAtkMult: 2.25,
    stunSec: 1.3,
    bossStaggerRatio: 0.2,
    armorSunderSec: 4.2,
    burnDurationSec: 0,
  },
};

export function resolveMechanismRenderBudget(options: {
  isLiteMode: boolean;
  watchdogStage: GpuWatchdogStage;
  reducedMotion: boolean;
}): { cylinderSegments: number; ringSegments: number; pulseEnabled: boolean } {
  if (options.isLiteMode || options.watchdogStage >= 2) {
    return {
      cylinderSegments: 8,
      ringSegments: 16,
      pulseEnabled: !options.reducedMotion && options.watchdogStage < 3,
    };
  }
  return {
    cylinderSegments: 14,
    ringSegments: 24,
    pulseEnabled: !options.reducedMotion,
  };
}

function resolveKindForChapter(chapterId: number): ArenaMechanismKind {
  const mod = ((Math.max(1, Math.floor(chapterId)) - 1) % 4) + 1;
  if (mod === 1) return 'solar_obelisk';
  if (mod === 2) return 'volcanic_forge';
  if (mod === 3) return 'emerald_crystal';
  return 'astral_prism';
}

export function spawnChapterArenaMechanisms(input: {
  chapterId: number;
  stageIndex: number;
  arenaHalfW: number;
  arenaHalfD: number;
  obstacles: Array<{ x: number; z: number; radius: number }>;
  isBossStage: boolean;
}): ArenaMechanismInstance[] {
  const kind = resolveKindForChapter(input.chapterId);
  const spec = ARENA_MECHANISM_SPECS[kind];
  const count = input.isBossStage ? 2 : 1;
  const maxX = Math.max(3.2, input.arenaHalfW - 3.2);
  const maxZ = Math.max(3.2, input.arenaHalfD - 3.8);

  const candidates: Array<[number, number]> = input.isBossStage
    ? [
        [-maxX * 0.62, 0.8],
        [maxX * 0.62, 0.8],
        [0, -maxZ * 0.35],
      ]
    : [
        [input.stageIndex % 2 === 0 ? -maxX * 0.45 : maxX * 0.45, 0.5],
        [0, 1.2],
      ];

  const placed: ArenaMechanismInstance[] = [];
  for (let i = 0; i < candidates.length && placed.length < count; i++) {
    let [x, z] = candidates[i];
    for (const ob of input.obstacles) {
      const d = Math.hypot(x - ob.x, z - ob.z);
      if (d < ob.radius + 1.8) {
        x = Math.max(-maxX, Math.min(maxX, x + (x >= 0 ? -2.2 : 2.2)));
        z = Math.max(-maxZ, Math.min(maxZ, z + 1.4));
      }
    }
    placed.push({
      id: `mech_${input.chapterId}_${input.stageIndex}_${placed.length}`,
      kind,
      x,
      z,
      cooldownLeft: 0,
      maxCooldown: spec.cooldownSec,
      ready: true,
      state: 'ready',
      pulsePhase: placed.length * 1.4,
    });
  }
  return placed;
}

export function stepArenaMechanisms(list: ArenaMechanismInstance[], dt: number): void {
  const safeDt = Math.max(0, dt);
  for (const m of list) {
    m.pulsePhase += safeDt * 2.8;
    if (m.cooldownLeft > 0) {
      m.cooldownLeft = Math.max(0, m.cooldownLeft - safeDt);
      m.ready = m.cooldownLeft <= 0;
      m.state = m.ready ? 'ready' : 'cooldown';
    } else {
      m.ready = true;
      m.state = 'ready';
    }
  }
}

export function tryTriggerArenaMechanism(
  list: ArenaMechanismInstance[],
  probeX: number,
  probeZ: number,
  extraRadius = 0
): {
  id: string;
  kind: ArenaMechanismKind;
  x: number;
  z: number;
  spec: ArenaMechanismSpec;
  bannerText: string;
} | null {
  for (const m of list) {
    if (!m.ready || m.cooldownLeft > 0) continue;
    const spec = ARENA_MECHANISM_SPECS[m.kind];
    if (Math.hypot(m.x - probeX, m.z - probeZ) <= spec.triggerRadius + Math.max(0, extraRadius)) {
      m.ready = false;
      m.state = 'cooldown';
      m.cooldownLeft = spec.cooldownSec;
      return {
        id: m.id,
        kind: m.kind,
        x: m.x,
        z: m.z,
        spec,
        bannerText: `${spec.name.toUpperCase()} · ${spec.shortLabel}!`,
      };
    }
  }
  return null;
}

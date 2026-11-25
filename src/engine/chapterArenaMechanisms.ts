export type ArenaMechanismKind =
  | 'solar_obelisk'
  | 'magma_vent'
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
  damageAtkMult: number;
  stunSec: number;
  bossStaggerRatio: number;
  armorSunderSec: number;
  burnDurationSec: number;
  healPct: number;
  shieldPct: number;
  ultChargeBonus: number;
  resetDash: boolean;
  buffDurationSec: number;
  atkBonusPct: number;
  atkSpeedBonusPct: number;
  moveSpeedBonusPct: number;
  drBonusPct: number;
  bannerText: string;
}

export interface ArenaMechanismInstance {
  id: string;
  kind: ArenaMechanismKind;
  x: number;
  z: number;
  state: 'ready' | 'cooldown';
  cooldownLeft: number;
  cooldownRemaining: number;
  triggerCount: number;
  pulsePhase: number;
}

export interface ArenaMechanismTriggerOutcome {
  triggered: true;
  id: string;
  kind: ArenaMechanismKind;
  x: number;
  z: number;
  spec: ArenaMechanismSpec;
  bannerText: string;
}

export interface MechanismRenderBudget {
  cylinderSegments: number;
  ringSegments: number;
  orbiterCount: number;
  allowPointLight: false;
  allowAmbientOrbiters: boolean;
}

export const ARENA_MECHANISM_SPECS: Record<ArenaMechanismKind, ArenaMechanismSpec> = {
  solar_obelisk: {
    kind: 'solar_obelisk',
    name: 'Trụ Nhật Luân',
    shortLabel: 'NHẬT LUÂN!',
    accentHex: 0xf59e0b,
    secondaryHex: 0xfef08a,
    triggerRadius: 2.1,
    effectRadius: 5.5,
    cooldownSec: 12,
    damageAtkMult: 1.8,
    stunSec: 1.2,
    bossStaggerRatio: 0.16,
    armorSunderSec: 4.0,
    burnDurationSec: 3.5,
    healPct: 0,
    shieldPct: 0.1,
    ultChargeBonus: 0.18,
    resetDash: false,
    buffDurationSec: 5.0,
    atkBonusPct: 0.16,
    atkSpeedBonusPct: 0.1,
    moveSpeedBonusPct: 0,
    drBonusPct: 0,
    bannerText: 'TRỤ NHẬT LUÂN BÙNG NỔ · +16% ATK & NẠP NỘ!',
  },
  magma_vent: {
    kind: 'magma_vent',
    name: 'Lò Dung Nham',
    shortLabel: 'DUNG NHAM!',
    accentHex: 0xf97316,
    secondaryHex: 0xfb923c,
    triggerRadius: 2.1,
    effectRadius: 5.8,
    cooldownSec: 14,
    damageAtkMult: 2.2,
    stunSec: 1.4,
    bossStaggerRatio: 0.2,
    armorSunderSec: 4.5,
    burnDurationSec: 4.0,
    healPct: 0,
    shieldPct: 0,
    ultChargeBonus: 0.12,
    resetDash: true,
    buffDurationSec: 5.0,
    atkBonusPct: 0.2,
    atkSpeedBonusPct: 0.08,
    moveSpeedBonusPct: 0.08,
    drBonusPct: 0,
    bannerText: 'LÒ DUNG NHAM PHUN TRÀO · SÁT THƯƠNG DIỆN RỘNG & HỒI LƯỚT!',
  },
  emerald_crystal: {
    kind: 'emerald_crystal',
    name: 'Tinh Thể Lục Bảo',
    shortLabel: 'LỤC BẢO!',
    accentHex: 0x10b981,
    secondaryHex: 0x6ee7b7,
    triggerRadius: 2.1,
    effectRadius: 5.2,
    cooldownSec: 13,
    damageAtkMult: 1.1,
    stunSec: 0.9,
    bossStaggerRatio: 0.12,
    armorSunderSec: 3.0,
    burnDurationSec: 0,
    healPct: 0.14,
    shieldPct: 0.16,
    ultChargeBonus: 0.1,
    resetDash: false,
    buffDurationSec: 6.0,
    atkBonusPct: 0.08,
    atkSpeedBonusPct: 0.06,
    moveSpeedBonusPct: 0.1,
    drBonusPct: 0.18,
    bannerText: 'TINH THỂ LỤC BẢO · HỒI PHỤC HP & KHIÊN HỘ MỆNH!',
  },
  astral_prism: {
    kind: 'astral_prism',
    name: 'Lăng Kính Tinh Giới',
    shortLabel: 'TINH GIỚI!',
    accentHex: 0x38bdf8,
    secondaryHex: 0x818cf8,
    triggerRadius: 2.1,
    effectRadius: 6.0,
    cooldownSec: 12,
    damageAtkMult: 1.6,
    stunSec: 1.5,
    bossStaggerRatio: 0.18,
    armorSunderSec: 4.0,
    burnDurationSec: 0,
    healPct: 0.06,
    shieldPct: 0.12,
    ultChargeBonus: 0.24,
    resetDash: true,
    buffDurationSec: 5.5,
    atkBonusPct: 0.12,
    atkSpeedBonusPct: 0.18,
    moveSpeedBonusPct: 0.14,
    drBonusPct: 0.08,
    bannerText: 'LĂNG KÍNH TINH GIỚI · TĂNG TỐC BẮN & HỒI CHIÊU TỨC THÌ!',
  },
};

export function resolveChapterArenaMechanismKind(chapterId: number): ArenaMechanismKind {
  const normalized = Math.max(1, Math.floor(chapterId || 1));
  const mod = ((normalized - 1) % 4) + 1;
  if (mod === 1) return 'solar_obelisk';
  if (mod === 2) return 'magma_vent';
  if (mod === 3) return 'emerald_crystal';
  return 'astral_prism';
}

export function getChapterArenaMechanismSpec(chapterId: number): ArenaMechanismSpec {
  return ARENA_MECHANISM_SPECS[resolveChapterArenaMechanismKind(chapterId)];
}

export function resolveMechanismRenderBudget(options: {
  isLiteMode: boolean;
  watchdogStage: number;
  reducedMotion?: boolean;
}): MechanismRenderBudget {
  const lite = options.isLiteMode || options.watchdogStage >= 2;
  const allowAmbientOrbiters = !lite && !options.reducedMotion;
  return {
    cylinderSegments: lite ? 6 : 12,
    ringSegments: lite ? 14 : 24,
    orbiterCount: allowAmbientOrbiters ? 3 : 0,
    allowPointLight: false,
    allowAmbientOrbiters,
  };
}

export function spawnChapterArenaMechanisms(input: {
  chapterId: number;
  stageIndex: number;
  arenaHalfW: number;
  arenaHalfD: number;
  obstacles: Array<{ x: number; z: number; radius: number }>;
  isBossStage?: boolean;
  count?: number;
}): ArenaMechanismInstance[] {
  const kind = resolveChapterArenaMechanismKind(input.chapterId);
  const desiredCount =
    typeof input.count === 'number' && Number.isFinite(input.count)
      ? Math.max(0, Math.min(4, Math.floor(input.count)))
      : input.isBossStage
      ? 2
      : 1;

  const limitX = Math.max(3.5, input.arenaHalfW - 2.0);
  const limitZ = Math.max(3.5, input.arenaHalfD - 2.0);
  const offsetX = Math.min(limitX, Math.max(3.8, input.arenaHalfW * 0.56));
  const offsetZ = Math.min(limitZ, Math.max(3.4, input.arenaHalfD * 0.42));

  const candidates: Array<{ x: number; z: number }> = [
    { x: -offsetX, z: -offsetZ },
    { x: offsetX, z: offsetZ },
    { x: offsetX, z: -offsetZ },
    { x: -offsetX, z: offsetZ },
    { x: 0, z: -Math.min(limitZ, 5.2) },
    { x: 0, z: Math.min(limitZ, 5.2) },
    { x: -Math.min(limitX, 6.2), z: 0 },
    { x: Math.min(limitX, 6.2), z: 0 },
    { x: -Math.min(limitX, 5.5), z: -Math.min(limitZ, 6.5) },
    { x: Math.min(limitX, 5.5), z: Math.min(limitZ, 6.5) },
    { x: Math.min(limitX, 6.5), z: -Math.min(limitZ, 5.5) },
    { x: -Math.min(limitX, 6.5), z: Math.min(limitZ, 5.5) },
  ];

  const isPositionSafe = (
    x: number,
    z: number,
    placed: ArenaMechanismInstance[]
  ): boolean => {
    if (Math.abs(x) > limitX || Math.abs(z) > limitZ) return false;
    if (Math.hypot(x, z) < 3.05) return false;
    for (const obs of input.obstacles) {
      if (Math.hypot(x - obs.x, z - obs.z) < obs.radius + 1.55) {
        return false;
      }
    }
    for (const existing of placed) {
      if (Math.hypot(x - existing.x, z - existing.z) < 4.0) {
        return false;
      }
    }
    return true;
  };

  const spawned: ArenaMechanismInstance[] = [];
  const startIdx = Math.abs(input.stageIndex) % candidates.length;

  for (let pass = 0; pass < candidates.length && spawned.length < desiredCount; pass++) {
    const raw = candidates[(startIdx + pass) % candidates.length];
    let x = Math.max(-limitX, Math.min(limitX, raw.x));
    let z = Math.max(-limitZ, Math.min(limitZ, raw.z));
    if (!isPositionSafe(x, z, spawned)) {
      // Spiral nudge around candidate to find guaranteed safe spot
      let found = false;
      for (let angleIdx = 0; angleIdx < 12 && !found; angleIdx++) {
        const ang = (angleIdx / 12) * Math.PI * 2;
        for (const stepDist of [1.8, 3.0, 4.2]) {
          const tx = Math.max(-limitX, Math.min(limitX, x + Math.cos(ang) * stepDist));
          const tz = Math.max(-limitZ, Math.min(limitZ, z + Math.sin(ang) * stepDist));
          if (isPositionSafe(tx, tz, spawned)) {
            x = tx;
            z = tz;
            found = true;
            break;
          }
        }
      }
      if (!found) continue;
    }

    spawned.push({
      id: `mech_${input.chapterId}_${input.stageIndex}_${spawned.length}`,
      kind,
      x,
      z,
      state: 'ready',
      cooldownLeft: 0,
      cooldownRemaining: 0,
      triggerCount: 0,
      pulsePhase: spawned.length * 1.4,
    });
  }

  return spawned;
}

export function stepArenaMechanisms(mechanisms: ArenaMechanismInstance[], dt: number): void {
  const safeDt = Math.max(0, Math.min(30, dt));
  for (const m of mechanisms) {
    m.pulsePhase += safeDt * 2.4;
    if (m.state === 'cooldown') {
      const nextCd = Math.max(0, m.cooldownLeft - safeDt);
      m.cooldownLeft = nextCd;
      m.cooldownRemaining = nextCd;
      if (nextCd <= 0) {
        m.state = 'ready';
      }
    }
  }
}

export function tryTriggerArenaMechanism(
  mechanisms: ArenaMechanismInstance[],
  probeX: number,
  probeZ: number,
  extraRadius = 0
): ArenaMechanismTriggerOutcome | null {
  for (const m of mechanisms) {
    if (m.state !== 'ready') continue;
    const spec = ARENA_MECHANISM_SPECS[m.kind];
    const dist = Math.hypot(probeX - m.x, probeZ - m.z);
    if (dist <= spec.triggerRadius + Math.max(0, extraRadius)) {
      m.state = 'cooldown';
      m.cooldownLeft = spec.cooldownSec;
      m.cooldownRemaining = spec.cooldownSec;
      m.triggerCount += 1;
      return {
        triggered: true,
        id: m.id,
        kind: m.kind,
        x: m.x,
        z: m.z,
        spec,
        bannerText: spec.bannerText,
      };
    }
  }
  return null;
}

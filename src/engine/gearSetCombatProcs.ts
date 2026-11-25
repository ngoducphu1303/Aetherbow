import type { GearSetId } from '../types/game';

export type GearSetProcTriggerEvent =
  | 'perfect_dodge'
  | 'dash_used'
  | 'basic_volley'
  | 'cast_interrupt'
  | 'crit_hit'
  | 'low_hp_hit';

export type GearSetProcId =
  | 'destruction_nova'
  | 'echo_phantom_volley'
  | 'dragon_knight_aegis'
  | 'oracle_astral_surge'
  | 'griffin_gale_stride';

export interface GearSetCombatProcSpec {
  setId: GearSetId;
  procId: GearSetProcId;
  name: string;
  triggerLabel: string;
  shortDesc: string;
  triggerEvent: GearSetProcTriggerEvent;
  triggerThreshold: number;
  cooldownSec: number;
  internalCooldownSec: number;
  accentHex: number;
  shieldMaxHpPct: number;
  ultChargeGain: number;
  buffDurationSec: number;
  tempAtkSpeedBonus: number;
  tempMoveSpeedBonus: number;
  aoeDamageAtkMult: number;
  aoeRadius: number;
  extraPierceArrowAtkMult: number;
}

export interface ActiveGearSetInput {
  setId: GearSetId | string;
  pieces?: number;
  equippedCount?: number;
  unlockedTiers?: unknown[];
}

export const GEAR_SET_COMBAT_PROCS: Record<GearSetId, GearSetCombatProcSpec> = {
  'Destruction Set': {
    setId: 'Destruction Set',
    procId: 'destruction_nova',
    name: 'Hủy Diệt Bùng Nổ',
    triggerLabel: 'Mỗi 4 Đòn Chí Mạng',
    shortDesc: 'Mỗi 4 đòn chí mạng kích nổ sóng lửa 160% ATK quanh mục tiêu (ICD 6s).',
    triggerEvent: 'crit_hit',
    triggerThreshold: 4,
    cooldownSec: 6.0,
    internalCooldownSec: 6.0,
    accentHex: 0xf97316,
    shieldMaxHpPct: 0,
    ultChargeGain: 0.06,
    buffDurationSec: 0,
    tempAtkSpeedBonus: 0,
    tempMoveSpeedBonus: 0,
    aoeDamageAtkMult: 1.6,
    aoeRadius: 3.6,
    extraPierceArrowAtkMult: 0,
  },
  'Echo Set': {
    setId: 'Echo Set',
    procId: 'echo_phantom_volley',
    name: 'Vọng Âm Truy Ảnh',
    triggerLabel: 'Mỗi 5 Loạt Bắn',
    shortDesc: 'Mỗi 5 loạt bắn phóng thêm mũi tên xuyên ảnh 125% ATK (ICD 4.5s).',
    triggerEvent: 'basic_volley',
    triggerThreshold: 5,
    cooldownSec: 4.5,
    internalCooldownSec: 4.5,
    accentHex: 0x38bdf8,
    shieldMaxHpPct: 0,
    ultChargeGain: 0.04,
    buffDurationSec: 2.5,
    tempAtkSpeedBonus: 0.12,
    tempMoveSpeedBonus: 0,
    aoeDamageAtkMult: 0,
    aoeRadius: 0,
    extraPierceArrowAtkMult: 1.25,
  },
  'Dragon Knight Set': {
    setId: 'Dragon Knight Set',
    procId: 'dragon_knight_aegis',
    name: 'Long Giáp Hộ Thể',
    triggerLabel: 'Né Hoàn Hảo / <50% HP',
    shortDesc: 'Né hoàn hảo hoặc dính đòn dưới 50% HP tạo khiên 16% Max HP và sóng lửa (ICD 10s).',
    triggerEvent: 'perfect_dodge',
    triggerThreshold: 1,
    cooldownSec: 10.0,
    internalCooldownSec: 10.0,
    accentHex: 0xfbbf24,
    shieldMaxHpPct: 0.16,
    ultChargeGain: 0.08,
    buffDurationSec: 3.5,
    tempAtkSpeedBonus: 0,
    tempMoveSpeedBonus: 0.1,
    aoeDamageAtkMult: 1.35,
    aoeRadius: 4.0,
    extraPierceArrowAtkMult: 0,
  },
  'Oracle Set': {
    setId: 'Oracle Set',
    procId: 'oracle_astral_surge',
    name: 'Thiên Cơ Cộng Hưởng',
    triggerLabel: 'Ngắt Chiêu / Né Hoàn Hảo',
    shortDesc: 'Ngắt chiêu hoặc né hoàn hảo hồi 16% Nộ và tăng 18% tốc đánh (ICD 6s).',
    triggerEvent: 'cast_interrupt',
    triggerThreshold: 1,
    cooldownSec: 6.0,
    internalCooldownSec: 6.0,
    accentHex: 0xc084fc,
    shieldMaxHpPct: 0.08,
    ultChargeGain: 0.16,
    buffDurationSec: 4.0,
    tempAtkSpeedBonus: 0.18,
    tempMoveSpeedBonus: 0.12,
    aoeDamageAtkMult: 0,
    aoeRadius: 0,
    extraPierceArrowAtkMult: 0,
  },
  'Griffin Set': {
    setId: 'Griffin Set',
    procId: 'griffin_gale_stride',
    name: 'Phong Dực Xung Kích',
    triggerLabel: 'Khi Lướt Né',
    shortDesc: 'Lướt né tăng mạnh 24% tốc chạy & 16% tốc đánh trong 3.5s (ICD 5.5s).',
    triggerEvent: 'dash_used',
    triggerThreshold: 1,
    cooldownSec: 5.5,
    internalCooldownSec: 5.5,
    accentHex: 0x34d399,
    shieldMaxHpPct: 0,
    ultChargeGain: 0.05,
    buffDurationSec: 3.5,
    tempAtkSpeedBonus: 0.16,
    tempMoveSpeedBonus: 0.24,
    aoeDamageAtkMult: 0,
    aoeRadius: 0,
    extraPierceArrowAtkMult: 0,
  },
};

export interface GearSetProcRuntimeState {
  activeSetIds: GearSetId[];
  activeSpecs: Partial<Record<GearSetId, GearSetCombatProcSpec>>;
  cooldowns: Partial<Record<GearSetId, number>>;
  counters: Partial<Record<GearSetId, number>>;
}

export interface GearSetProcOutcome extends GearSetCombatProcSpec {
  bannerText: string;
}

function resolvePieceCount(entry: ActiveGearSetInput): number {
  if (typeof entry.equippedCount === 'number' && Number.isFinite(entry.equippedCount)) {
    return Math.floor(entry.equippedCount);
  }
  if (typeof entry.pieces === 'number' && Number.isFinite(entry.pieces)) {
    return Math.floor(entry.pieces);
  }
  if (Array.isArray(entry.unlockedTiers) && entry.unlockedTiers.length > 0) {
    return entry.unlockedTiers.length >= 2 ? 3 : 2;
  }
  return 0;
}

function buildScaledProcSpec(base: GearSetCombatProcSpec, pieceCount: number): GearSetCombatProcSpec {
  const isThreePiece = pieceCount >= 3;
  if (!isThreePiece) return { ...base };
  const mult = 1.3;
  return {
    ...base,
    shieldMaxHpPct: Math.min(0.24, Math.round(base.shieldMaxHpPct * mult * 1000) / 1000),
    ultChargeGain: Math.min(0.32, Math.round(base.ultChargeGain * mult * 1000) / 1000),
    tempAtkSpeedBonus: Math.round(base.tempAtkSpeedBonus * mult * 1000) / 1000,
    tempMoveSpeedBonus: Math.round(base.tempMoveSpeedBonus * mult * 1000) / 1000,
    aoeDamageAtkMult: Math.round(base.aoeDamageAtkMult * mult * 100) / 100,
    extraPierceArrowAtkMult: Math.round(base.extraPierceArrowAtkMult * mult * 100) / 100,
  };
}

export function resolveActiveGearSetProcs(
  activeGearSets?: Array<ActiveGearSetInput> | GearSetId[]
): GearSetCombatProcSpec[] {
  if (!Array.isArray(activeGearSets)) return [];
  const resolved: GearSetCombatProcSpec[] = [];
  const seen = new Set<GearSetId>();

  for (const entry of activeGearSets) {
    if (typeof entry === 'string') {
      if (entry in GEAR_SET_COMBAT_PROCS && !seen.has(entry as GearSetId)) {
        const id = entry as GearSetId;
        seen.add(id);
        resolved.push(buildScaledProcSpec(GEAR_SET_COMBAT_PROCS[id], 2));
      }
      continue;
    }
    if (!entry || typeof entry !== 'object') continue;
    const id = entry.setId as GearSetId;
    if (!(id in GEAR_SET_COMBAT_PROCS) || seen.has(id)) continue;
    const pieces = resolvePieceCount(entry);
    const hasBonus =
      pieces >= 2 || (Array.isArray(entry.unlockedTiers) && entry.unlockedTiers.length > 0);
    if (!hasBonus) continue;
    seen.add(id);
    resolved.push(buildScaledProcSpec(GEAR_SET_COMBAT_PROCS[id], Math.max(2, pieces)));
  }

  return resolved;
}

export function createGearSetProcRuntime(
  activeGearSets?: Array<ActiveGearSetInput> | GearSetId[]
): GearSetProcRuntimeState {
  const specs = resolveActiveGearSetProcs(activeGearSets);
  const activeSetIds: GearSetId[] = [];
  const activeSpecs: Partial<Record<GearSetId, GearSetCombatProcSpec>> = {};
  for (const spec of specs) {
    activeSetIds.push(spec.setId);
    activeSpecs[spec.setId] = spec;
  }
  return {
    activeSetIds,
    activeSpecs,
    cooldowns: {},
    counters: {},
  };
}

export function stepGearSetProcCooldowns(state: GearSetProcRuntimeState, dt: number): void {
  const safeDt = Math.max(0, dt);
  for (const key of Object.keys(state.cooldowns) as GearSetId[]) {
    const prev = state.cooldowns[key] ?? 0;
    state.cooldowns[key] = Math.max(0, prev - safeDt);
  }
}

export function evaluateGearSetProcEvent(
  state: GearSetProcRuntimeState,
  event: GearSetProcTriggerEvent,
  context?: { hpRatio?: number; targetX?: number; targetZ?: number }
): GearSetProcOutcome | null {
  for (const setId of state.activeSetIds) {
    const spec = state.activeSpecs[setId] ?? GEAR_SET_COMBAT_PROCS[setId];
    if (!spec) continue;
    const matches =
      spec.triggerEvent === event ||
      (setId === 'Dragon Knight Set' && event === 'low_hp_hit') ||
      (setId === 'Oracle Set' && event === 'perfect_dodge');
    if (!matches) continue;
    if (event === 'low_hp_hit' && (context?.hpRatio ?? 1) > 0.5) continue;
    if ((state.cooldowns[setId] ?? 0) > 0) continue;

    const nextCount = (state.counters[setId] ?? 0) + 1;
    if (nextCount < spec.triggerThreshold) {
      state.counters[setId] = nextCount;
      continue;
    }

    state.counters[setId] = 0;
    state.cooldowns[setId] = spec.internalCooldownSec;
    return {
      ...spec,
      bannerText: `NỘI TẠI BỘ · ${spec.name.toUpperCase()}!`,
    };
  }
  return null;
}

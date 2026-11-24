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
  | 'echo_phantom_shot'
  | 'dragon_knight_aegis'
  | 'oracle_time_surge'
  | 'griffin_gale_stride';

export interface GearSetCombatProcSpec {
  setId: GearSetId;
  procId: GearSetProcId;
  name: string;
  triggerLabel: string;
  shortDesc: string;
  triggerEvent: GearSetProcTriggerEvent;
  cooldownSec: number;
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

export const GEAR_SET_COMBAT_PROCS: Record<GearSetId, GearSetCombatProcSpec> = {
  'Destruction Set': {
    setId: 'Destruction Set',
    procId: 'destruction_nova',
    name: 'Hủy Diệt Bùng Nổ',
    triggerLabel: 'Khi Chí Mạng',
    shortDesc: 'Chí mạng kích hoạt sóng nổ lửa 160% ATK quanh mục tiêu (CD 6s).',
    triggerEvent: 'crit_hit',
    cooldownSec: 6.0,
    accentHex: 0xf97316,
    shieldMaxHpPct: 0,
    ultChargeGain: 0.06,
    buffDurationSec: 0,
    tempAtkSpeedBonus: 0,
    tempMoveSpeedBonus: 0,
    aoeDamageAtkMult: 1.6,
    aoeRadius: 3.4,
    extraPierceArrowAtkMult: 0,
  },
  'Echo Set': {
    setId: 'Echo Set',
    procId: 'echo_phantom_shot',
    name: 'Vọng Âm Truy Ảnh',
    triggerLabel: 'Khi Bắn Liên Hoàn',
    shortDesc: 'Mỗi loạt bắn kích thêm mũi tên xuyên ảnh 125% ATK (CD 4.5s).',
    triggerEvent: 'basic_volley',
    cooldownSec: 4.5,
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
    triggerLabel: 'Trúng Đòn <50% HP',
    shortDesc: 'Trúng đòn dưới 50% HP tạo khiên 18% Max HP và đẩy sóng lửa (CD 12s).',
    triggerEvent: 'low_hp_hit',
    cooldownSec: 12.0,
    accentHex: 0xfbbf24,
    shieldMaxHpPct: 0.18,
    ultChargeGain: 0.1,
    buffDurationSec: 3.5,
    tempAtkSpeedBonus: 0,
    tempMoveSpeedBonus: 0.1,
    aoeDamageAtkMult: 1.35,
    aoeRadius: 4.0,
    extraPierceArrowAtkMult: 0,
  },
  'Oracle Set': {
    setId: 'Oracle Set',
    procId: 'oracle_time_surge',
    name: 'Thiên Cơ Cộng Hưởng',
    triggerLabel: 'Né Hoàn Hảo / Ngắt Chiêu',
    shortDesc: 'Né hoàn hảo hoặc Ngắt chiêu hồi 18% Nộ và tăng 18% tốc đánh (CD 6s).',
    triggerEvent: 'perfect_dodge',
    cooldownSec: 6.0,
    accentHex: 0xc084fc,
    shieldMaxHpPct: 0.08,
    ultChargeGain: 0.18,
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
    shortDesc: 'Lướt né tăng mạnh 24% tốc chạy & 16% tốc đánh trong 3.5s (CD 5.5s).',
    triggerEvent: 'dash_used',
    cooldownSec: 5.5,
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
  cooldowns: Partial<Record<GearSetId, number>>;
}

export interface GearSetProcOutcome extends GearSetCombatProcSpec {
  bannerText: string;
}

export function createGearSetProcRuntime(
  activeGearSets?: Array<{ setId: GearSetId; pieces?: number; unlockedTiers?: unknown[] }> | GearSetId[]
): GearSetProcRuntimeState {
  const activeSetIds: GearSetId[] = [];
  if (Array.isArray(activeGearSets)) {
    for (const entry of activeGearSets) {
      if (typeof entry === 'string') {
        if (entry in GEAR_SET_COMBAT_PROCS && !activeSetIds.includes(entry as GearSetId)) {
          activeSetIds.push(entry as GearSetId);
        }
      } else if (entry && typeof entry === 'object' && entry.setId in GEAR_SET_COMBAT_PROCS) {
        const hasBonus =
          (typeof entry.pieces === 'number' && entry.pieces >= 2) ||
          (Array.isArray(entry.unlockedTiers) && entry.unlockedTiers.length > 0);
        if (hasBonus && !activeSetIds.includes(entry.setId)) {
          activeSetIds.push(entry.setId);
        }
      }
    }
  }
  return {
    activeSetIds,
    cooldowns: {},
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
    const spec = GEAR_SET_COMBAT_PROCS[setId];
    if (!spec) continue;
    const matches =
      spec.triggerEvent === event ||
      (setId === 'Oracle Set' && event === 'cast_interrupt');
    if (!matches) continue;
    if (event === 'low_hp_hit' && (context?.hpRatio ?? 1) > 0.5) continue;
    if ((state.cooldowns[setId] ?? 0) > 0) continue;

    state.cooldowns[setId] = spec.cooldownSec;
    return {
      ...spec,
      bannerText: `NỘI TẠI BỘ · ${spec.name.toUpperCase()}!`,
    };
  }
  return null;
}

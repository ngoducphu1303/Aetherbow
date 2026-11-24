import { ActiveGearSetBonus, GearSetId } from '../types/game';

export type GearSetProcId =
  | 'destruction_nova'
  | 'echo_phantom_volley'
  | 'dragon_knight_aegis'
  | 'oracle_astral_surge'
  | 'griffin_gale_stride';

export type GearSetProcTriggerEvent =
  | 'crit_hit'
  | 'basic_volley'
  | 'perfect_dodge'
  | 'low_hp_hit'
  | 'cast_interrupt'
  | 'dash_used';

export interface GearSetProcDefinition {
  procId: GearSetProcId;
  setId: GearSetId;
  piecesRequired: 2 | 3;
  name: string;
  shortDesc: string;
  triggerLabel: string;
  internalCooldownSec: number;
  /** Threshold count for counter-based procs (e.g. every 4th crit or 5th volley). */
  triggerEveryN: number;
  damageAtkMult: number;
  aoeRadius: number;
  shieldMaxHpPct: number;
  ultChargeGain: number;
  tempAtkSpeedBonus: number;
  tempMoveSpeedBonus: number;
  buffDurationSec: number;
  accentHex: number;
}

export interface GearSetProcRuntimeState {
  activeProcs: GearSetProcDefinition[];
  cooldowns: Partial<Record<GearSetProcId, number>>;
  critCounter: number;
  volleyCounter: number;
  hitCounter: number;
  totalProcsTriggered: number;
}

export interface GearSetProcOutcome {
  procId: GearSetProcId;
  setId: GearSetId;
  name: string;
  bannerText: string;
  aoeDamageAtkMult: number;
  aoeRadius: number;
  extraPierceArrowAtkMult: number;
  shieldMaxHpPct: number;
  ultChargeGain: number;
  tempAtkSpeedBonus: number;
  tempMoveSpeedBonus: number;
  buffDurationSec: number;
  accentHex: number;
}

/**
 * Canonical Unique Combat Procs for the 5 Mid-to-Endgame Gear Sets.
 * Deliberately excludes the Starter Set so Chapter 1 fresh accounts (702 CP) remain untouched.
 */
export const GEAR_SET_COMBAT_PROCS: Record<GearSetId, GearSetProcDefinition> = {
  'Destruction Set': {
    procId: 'destruction_nova',
    setId: 'Destruction Set',
    piecesRequired: 2,
    name: 'Xung Kích Hủy Diệt',
    shortDesc: 'Mỗi đòn Chí Mạng thứ 4 kích nổ sóng lửa gây 135% ATK diện rộng (hồi 4.5s).',
    triggerLabel: 'Mỗi 4 Chí Mạng',
    internalCooldownSec: 4.5,
    triggerEveryN: 4,
    damageAtkMult: 1.35,
    aoeRadius: 4.0,
    shieldMaxHpPct: 0,
    ultChargeGain: 0,
    tempAtkSpeedBonus: 0,
    tempMoveSpeedBonus: 0,
    buffDurationSec: 0,
    accentHex: 0xf97316,
  },
  'Echo Set': {
    procId: 'echo_phantom_volley',
    setId: 'Echo Set',
    piecesRequired: 2,
    name: 'Mũi Tên Vọng Ảnh',
    shortDesc: 'Mỗi loạt bắn thứ 5 phóng thêm 1 mũi tên xuyên thấu 85% ATK (115% khi đủ 3 món, hồi 3s).',
    triggerLabel: 'Mỗi 5 Loạt Bắn',
    internalCooldownSec: 3.0,
    triggerEveryN: 5,
    damageAtkMult: 0.85,
    aoeRadius: 0,
    shieldMaxHpPct: 0,
    ultChargeGain: 0,
    tempAtkSpeedBonus: 0,
    tempMoveSpeedBonus: 0,
    buffDurationSec: 0,
    accentHex: 0xc084fc,
  },
  'Dragon Knight Set': {
    procId: 'dragon_knight_aegis',
    setId: 'Dragon Knight Set',
    piecesRequired: 2,
    name: 'Vảy Rồng Bất Khuất',
    shortDesc: 'Né Hoàn Hảo hoặc khi HP ≤ 50% tạo Khiên 14% HP (20% ở 3 món) + sóng lửa 120% ATK (hồi 7.5s).',
    triggerLabel: 'Né Hoàn Hảo / HP ≤ 50%',
    internalCooldownSec: 7.5,
    triggerEveryN: 1,
    damageAtkMult: 1.2,
    aoeRadius: 4.4,
    shieldMaxHpPct: 0.14,
    ultChargeGain: 0,
    tempAtkSpeedBonus: 0,
    tempMoveSpeedBonus: 0,
    buffDurationSec: 4.5,
    accentHex: 0xf59e0b,
  },
  'Oracle Set': {
    procId: 'oracle_astral_surge',
    setId: 'Oracle Set',
    piecesRequired: 2,
    name: 'Luồng Tinh Tri',
    shortDesc: 'Ngắt Chiêu hoặc mỗi 12 đòn trúng hồi +12% Nộ (+18% ở 3 món) và +18% Tốc Bắn 3.5s (hồi 6s).',
    triggerLabel: 'Ngắt Chiêu / 12 Đòn Trúng',
    internalCooldownSec: 6.0,
    triggerEveryN: 12,
    damageAtkMult: 0,
    aoeRadius: 0,
    shieldMaxHpPct: 0,
    ultChargeGain: 0.12,
    tempAtkSpeedBonus: 0.18,
    tempMoveSpeedBonus: 0,
    buffDurationSec: 3.5,
    accentHex: 0x38bdf8,
  },
  'Griffin Set': {
    procId: 'griffin_gale_stride',
    setId: 'Griffin Set',
    piecesRequired: 2,
    name: 'Xé Gió Điểu Sư',
    shortDesc: 'Sau khi Lướt Né bắn tia gió xuyên thấu 140% ATK và tăng +20% Tốc Chạy 2.5s (hồi 4.5s).',
    triggerLabel: 'Sau khi Lướt Né',
    internalCooldownSec: 4.5,
    triggerEveryN: 1,
    damageAtkMult: 1.4,
    aoeRadius: 0,
    shieldMaxHpPct: 0,
    ultChargeGain: 0,
    tempAtkSpeedBonus: 0,
    tempMoveSpeedBonus: 0.2,
    buffDurationSec: 2.5,
    accentHex: 0x34d399,
  },
};

/**
 * Resolves active Unique Combat Procs from the player's currently equipped gear sets,
 * upgrading 3-piece sets (Echo, Dragon Knight, Oracle) automatically.
 */
export function resolveActiveGearSetProcs(
  activeGearSets?: ReadonlyArray<ActiveGearSetBonus>
): GearSetProcDefinition[] {
  if (!Array.isArray(activeGearSets) || activeGearSets.length === 0) return [];
  const resolved: GearSetProcDefinition[] = [];
  for (const entry of activeGearSets) {
    if (entry.unlockedTiers.length === 0) continue;
    const base = GEAR_SET_COMBAT_PROCS[entry.setId as GearSetId];
    if (!base || entry.equippedCount < base.piecesRequired) continue;

    // 3-piece empowerment scaling for 3-piece sets
    if (entry.equippedCount >= 3) {
      if (base.procId === 'echo_phantom_volley') {
        resolved.push({ ...base, piecesRequired: 3, damageAtkMult: 1.15 });
        continue;
      }
      if (base.procId === 'dragon_knight_aegis') {
        resolved.push({ ...base, piecesRequired: 3, shieldMaxHpPct: 0.2, damageAtkMult: 1.45 });
        continue;
      }
      if (base.procId === 'oracle_astral_surge') {
        resolved.push({ ...base, piecesRequired: 3, ultChargeGain: 0.18, tempAtkSpeedBonus: 0.22 });
        continue;
      }
    }
    resolved.push(base);
  }
  return resolved;
}

export function createGearSetProcRuntime(
  activeGearSets?: ReadonlyArray<ActiveGearSetBonus>
): GearSetProcRuntimeState {
  return {
    activeProcs: resolveActiveGearSetProcs(activeGearSets),
    cooldowns: {},
    critCounter: 0,
    volleyCounter: 0,
    hitCounter: 0,
    totalProcsTriggered: 0,
  };
}

export function stepGearSetProcCooldowns(runtime: GearSetProcRuntimeState, dt: number): void {
  if (!Number.isFinite(dt) || dt <= 0) return;
  const keys = Object.keys(runtime.cooldowns) as GearSetProcId[];
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    const rem = runtime.cooldowns[k] ?? 0;
    if (rem > 0) {
      runtime.cooldowns[k] = Math.max(0, rem - dt);
    }
  }
}

export function evaluateGearSetProcEvent(
  runtime: GearSetProcRuntimeState,
  event: GearSetProcTriggerEvent,
  context?: { hpRatio?: number }
): GearSetProcOutcome | null {
  if (runtime.activeProcs.length === 0) return null;

  for (let i = 0; i < runtime.activeProcs.length; i++) {
    const proc = runtime.activeProcs[i];
    if ((runtime.cooldowns[proc.procId] ?? 0) > 0) continue;

    let shouldTrigger = false;
    if (proc.procId === 'destruction_nova' && event === 'crit_hit') {
      runtime.critCounter += 1;
      if (runtime.critCounter >= proc.triggerEveryN) {
        runtime.critCounter = 0;
        shouldTrigger = true;
      }
    } else if (proc.procId === 'echo_phantom_volley' && event === 'basic_volley') {
      runtime.volleyCounter += 1;
      if (runtime.volleyCounter >= proc.triggerEveryN) {
        runtime.volleyCounter = 0;
        shouldTrigger = true;
      }
    } else if (proc.procId === 'dragon_knight_aegis') {
      if (event === 'perfect_dodge' || (event === 'low_hp_hit' && (context?.hpRatio ?? 1) <= 0.5)) {
        shouldTrigger = true;
      }
    } else if (proc.procId === 'oracle_astral_surge') {
      if (event === 'cast_interrupt') {
        runtime.hitCounter = 0;
        shouldTrigger = true;
      } else if (event === 'crit_hit' || event === 'basic_volley') {
        runtime.hitCounter += 1;
        if (runtime.hitCounter >= proc.triggerEveryN) {
          runtime.hitCounter = 0;
          shouldTrigger = true;
        }
      }
    } else if (proc.procId === 'griffin_gale_stride' && event === 'dash_used') {
      shouldTrigger = true;
    }

    if (shouldTrigger) {
      runtime.cooldowns[proc.procId] = proc.internalCooldownSec;
      runtime.totalProcsTriggered += 1;
      return {
        procId: proc.procId,
        setId: proc.setId,
        name: proc.name,
        bannerText: `Bộ Trang Bị · ${proc.name}!`,
        aoeDamageAtkMult: proc.aoeRadius > 0 ? proc.damageAtkMult : 0,
        aoeRadius: proc.aoeRadius,
        extraPierceArrowAtkMult: proc.aoeRadius === 0 ? proc.damageAtkMult : 0,
        shieldMaxHpPct: proc.shieldMaxHpPct,
        ultChargeGain: proc.ultChargeGain,
        tempAtkSpeedBonus: proc.tempAtkSpeedBonus,
        tempMoveSpeedBonus: proc.tempMoveSpeedBonus,
        buffDurationSec: proc.buffDurationSec,
        accentHex: proc.accentHex,
      };
    }
  }

  return null;
}

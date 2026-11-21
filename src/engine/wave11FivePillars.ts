import type { GearSlot, HeroId, PityState, Rarity } from '../types/game';

const R_COMMON = 'common' as Rarity;
const R_RARE = 'rare' as Rarity;
const R_EPIC = 'epic' as Rarity;
const R_LEGENDARY = 'legendary' as Rarity;
const R_MYTHIC = 'mythic' as Rarity;

/**
 * ============================================================================
 * WAVE 11 — UNIFIED 5-PILLAR PURE SIMULATION
 * ============================================================================
 * Zero DOM / Three.js / Node dependencies so 60Hz engine, React UI, WebSocket
 * server, and Node tests share exact deterministic formulas.
 *
 * Pillar 1 & 2 (AAA Production & World-Class Game Feel):
 *   - Weapon Overdrive (Vũ Khí Thức Tỉnh): 0..100 charge -> 6s Overdrive + Finisher Surge
 *   - 3D Interactive Battlefield Hazards: Frost Crystal / Magma Brazier / Volt Obelisk
 *   - Cinematic Camera Sweep: Smooth Boss Intro & Execution Finisher FOV/orbit curves
 *
 * Pillar 3 & 4 (Fair Progression & Competitive LiveOps):
 *   - Guaranteed Gear Forge Blueprint Pity (6 Epic / 15 Legendary / Soft Pity @11 / 25-Shard Selector)
 *   - Equalized Endless Rift with Daily Rotating Mutators & Seasonal Floor Milestones
 *
 * Pillar 5 (AI Tự Động Là Người Chơi Real-Time):
 *   - Tactical AI Squad Formations & Live Battle Pings
 *   - Server-Authoritative Live AI Championship Spectator Arena (Real-Time AI vs AI)
 */

// ============================================================================
// PILLAR 1 & 2A: WEAPON OVERDRIVE (VŨ KHÍ THỨC TỈNH)
// ============================================================================

export type OverdriveWeaponArchetype = 'bow' | 'staff' | 'claw';

export interface WeaponOverdriveState {
  charge: number; // 0..100
  active: boolean;
  activeRemainingSec: number;
  maxDurationSec: number;
  weaponArchetype: OverdriveWeaponArchetype;
  stanceLabel: string;
  auraHex: number;
  totalActivations: number;
}

export interface WeaponOverdriveBuffs {
  atkMult: number;
  aspdMult: number;
  critChanceBonus: number;
  pierceBonus: number;
}

const OVERDRIVE_META: Record<
  OverdriveWeaponArchetype,
  { stanceLabel: string; auraHex: number }
> = {
  bow: { stanceLabel: 'Tinh Cung Khai Ấn', auraHex: 0xf59e0b },
  staff: { stanceLabel: 'Nguyên Tố Pháp Vực', auraHex: 0x38bdf8 },
  claw: { stanceLabel: 'Ảnh Trảo Hư Không', auraHex: 0xf43f5e },
};

export function createInitialWeaponOverdriveState(
  weaponArchetype: OverdriveWeaponArchetype = 'bow'
): WeaponOverdriveState {
  const meta = OVERDRIVE_META[weaponArchetype] ?? OVERDRIVE_META.bow;
  return {
    charge: 0,
    active: false,
    activeRemainingSec: 0,
    maxDurationSec: 6.0,
    weaponArchetype,
    stanceLabel: meta.stanceLabel,
    auraHex: meta.auraHex,
    totalActivations: 0,
  };
}

export function chargeWeaponOverdrive(
  state: WeaponOverdriveState,
  rawGain: number,
  options?: { styleGrade?: string; mutatorMult?: number }
): WeaponOverdriveState {
  if (state.active || rawGain <= 0) return state;
  const grade = options?.styleGrade ?? 'B';
  const styleMult =
    grade === 'SSS' ? 1.55 : grade === 'SS' ? 1.38 : grade === 'S' ? 1.22 : grade === 'A' ? 1.1 : 1.0;
  const mutatorMult = Math.max(0.5, options?.mutatorMult ?? 1.0);
  const nextCharge = Math.min(100, Number((state.charge + rawGain * styleMult * mutatorMult).toFixed(2)));
  return {
    ...state,
    charge: nextCharge,
  };
}

export function activateWeaponOverdrive(
  state: WeaponOverdriveState,
  weaponArchetype?: OverdriveWeaponArchetype
): { activated: boolean; nextState: WeaponOverdriveState; calloutText: string | null } {
  if (state.active || state.charge < 100) {
    return { activated: false, nextState: state, calloutText: null };
  }
  const arch = weaponArchetype ?? state.weaponArchetype;
  const meta = OVERDRIVE_META[arch] ?? OVERDRIVE_META.bow;
  return {
    activated: true,
    nextState: {
      ...state,
      charge: 0,
      active: true,
      activeRemainingSec: state.maxDurationSec,
      weaponArchetype: arch,
      stanceLabel: meta.stanceLabel,
      auraHex: meta.auraHex,
      totalActivations: state.totalActivations + 1,
    },
    calloutText: `THỨC TỈNH · ${meta.stanceLabel.toUpperCase()}!`,
  };
}

export function stepWeaponOverdrive(
  state: WeaponOverdriveState,
  dt: number
): {
  nextState: WeaponOverdriveState;
  finisherSurgeTriggered: boolean;
  buffs: WeaponOverdriveBuffs;
} {
  if (!state.active) {
    return {
      nextState: state,
      finisherSurgeTriggered: false,
      buffs: { atkMult: 1, aspdMult: 1, critChanceBonus: 0, pierceBonus: 0 },
    };
  }
  const nextRemaining = Math.max(0, state.activeRemainingSec - Math.max(0, dt));
  if (nextRemaining <= 0) {
    return {
      nextState: {
        ...state,
        active: false,
        activeRemainingSec: 0,
      },
      finisherSurgeTriggered: true,
      buffs: { atkMult: 1, aspdMult: 1, critChanceBonus: 0, pierceBonus: 0 },
    };
  }
  return {
    nextState: {
      ...state,
      activeRemainingSec: nextRemaining,
    },
    finisherSurgeTriggered: false,
    buffs: {
      atkMult: 1.28,
      aspdMult: 1.32,
      critChanceBonus: 0.18,
      pierceBonus: 2,
    },
  };
}

// ============================================================================
// PILLAR 1 & 2B: 3D INTERACTIVE BATTLEFIELD HAZARDS (MÔI TRƯỜNG TƯƠNG TÁC 3D)
// ============================================================================

export type InteractiveHazardKind = 'frost_crystal' | 'magma_brazier' | 'volt_obelisk';

export interface InteractiveHazardSpec {
  id: string;
  kind: InteractiveHazardKind;
  label: string;
  effectLabel: string;
  element: 'ice' | 'fire' | 'storm';
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  hitRadius: number;
  blastRadius: number;
  detonateDmgMult: number;
  stunSec: number;
  breakShieldRatio: number;
  detonated: boolean;
  primaryHex: number;
  accentHex: number;
}

const HAZARD_TEMPLATES: Record<
  InteractiveHazardKind,
  {
    label: string;
    effectLabel: string;
    element: 'ice' | 'fire' | 'storm';
    blastRadius: number;
    detonateDmgMult: number;
    stunSec: number;
    breakShieldRatio: number;
    primaryHex: number;
    accentHex: number;
  }
> = {
  frost_crystal: {
    label: 'Tinh Thể Băng Sương',
    effectLabel: 'Đóng Băng AoE + Giảm Tốc',
    element: 'ice',
    blastRadius: 4.8,
    detonateDmgMult: 2.35,
    stunSec: 1.45,
    breakShieldRatio: 0.16,
    primaryHex: 0x38bdf8,
    accentHex: 0xe0f2fe,
  },
  magma_brazier: {
    label: 'Đỉnh Dung Nham',
    effectLabel: 'Nổ Hỏa Diệm + Thiêu Đốt',
    element: 'fire',
    blastRadius: 5.1,
    detonateDmgMult: 2.85,
    stunSec: 0.65,
    breakShieldRatio: 0.22,
    primaryHex: 0xf97316,
    accentHex: 0xfef08a,
  },
  volt_obelisk: {
    label: 'Cột Lôi Cổ Ngữ',
    effectLabel: 'Sét Lan Phá Giáp Boss',
    element: 'storm',
    blastRadius: 5.4,
    detonateDmgMult: 2.55,
    stunSec: 1.05,
    breakShieldRatio: 0.28,
    primaryHex: 0xa855f7,
    accentHex: 0xfde047,
  },
};

const HAZARD_KIND_ORDER: InteractiveHazardKind[] = [
  'frost_crystal',
  'magma_brazier',
  'volt_obelisk',
];

export function generateInteractiveBattlefieldHazards(
  chapterId: number,
  stageIndex: number,
  options?: { isBossRoom?: boolean; arenaHalfW?: number; arenaHalfD?: number }
): InteractiveHazardSpec[] {
  const halfW = Math.max(7, options?.arenaHalfW ?? 11);
  const halfD = Math.max(7, options?.arenaHalfD ?? 11);
  const count = options?.isBossRoom ? 3 : 2;
  const seed = Math.abs(chapterId * 31 + stageIndex * 17 + (options?.isBossRoom ? 7 : 3));
  const anchorPositions: Array<[number, number]> = [
    [-Math.min(5.8, halfW - 3.0), -Math.min(3.6, halfD - 3.6)],
    [Math.min(5.8, halfW - 3.0), -Math.min(3.4, halfD - 3.6)],
    [0, -Math.min(5.6, halfD - 2.8)],
  ];
  const hpBase = 48 + Math.max(0, chapterId) * 26 + Math.max(0, stageIndex) * 10;

  const list: InteractiveHazardSpec[] = [];
  for (let i = 0; i < count; i++) {
    const kind = HAZARD_KIND_ORDER[(seed + i) % HAZARD_KIND_ORDER.length];
    const tpl = HAZARD_TEMPLATES[kind];
    const [ax, az] = anchorPositions[i];
    list.push({
      id: `hazard_${chapterId}_${stageIndex}_${i}_${kind}`,
      kind,
      label: tpl.label,
      effectLabel: tpl.effectLabel,
      element: tpl.element,
      x: ax,
      z: az,
      hp: hpBase,
      maxHp: hpBase,
      hitRadius: 1.05,
      blastRadius: tpl.blastRadius,
      detonateDmgMult: tpl.detonateDmgMult,
      stunSec: tpl.stunSec,
      breakShieldRatio: tpl.breakShieldRatio,
      detonated: false,
      primaryHex: tpl.primaryHex,
      accentHex: tpl.accentHex,
    });
  }
  return list;
}

export interface InteractiveHazardHitResult {
  nextHazard: InteractiveHazardSpec;
  detonatedNow: boolean;
  blastDamage: number;
  blastRadius: number;
  element: 'ice' | 'fire' | 'storm';
  stunSec: number;
  breakShieldRatio: number;
  overdriveChargeGain: number;
  calloutText: string | null;
}

export function damageInteractiveHazard(
  hazard: InteractiveHazardSpec,
  damage: number,
  playerAttack: number
): InteractiveHazardHitResult {
  if (hazard.detonated || damage <= 0) {
    return {
      nextHazard: hazard,
      detonatedNow: false,
      blastDamage: 0,
      blastRadius: hazard.blastRadius,
      element: hazard.element,
      stunSec: 0,
      breakShieldRatio: 0,
      overdriveChargeGain: 0,
      calloutText: null,
    };
  }
  const nextHp = Math.max(0, hazard.hp - Math.max(1, Math.round(damage)));
  const detonatedNow = nextHp <= 0;
  const nextHazard: InteractiveHazardSpec = {
    ...hazard,
    hp: nextHp,
    detonated: detonatedNow,
  };
  if (!detonatedNow) {
    return {
      nextHazard,
      detonatedNow: false,
      blastDamage: 0,
      blastRadius: hazard.blastRadius,
      element: hazard.element,
      stunSec: 0,
      breakShieldRatio: 0,
      overdriveChargeGain: 2.5,
      calloutText: null,
    };
  }
  const blastDamage = Math.max(60, Math.round(Math.max(25, playerAttack) * hazard.detonateDmgMult));
  return {
    nextHazard,
    detonatedNow: true,
    blastDamage,
    blastRadius: hazard.blastRadius,
    element: hazard.element,
    stunSec: hazard.stunSec,
    breakShieldRatio: hazard.breakShieldRatio,
    overdriveChargeGain: 18,
    calloutText: `KÍCH NỔ ${hazard.label.toUpperCase()}!`,
  };
}

// ============================================================================
// PILLAR 1 & 2C: CINEMATIC CAMERA SWEEP (CAMERA ĐIỆN ẢNH)
// ============================================================================

export type CinematicCameraMode = 'none' | 'boss_intro' | 'execution_finisher';

export interface CinematicCameraState {
  mode: CinematicCameraMode;
  remainingSec: number;
  durationSec: number;
  focusX: number;
  focusZ: number;
  reducedMotion: boolean;
}

export interface CinematicCameraSample {
  nextState: CinematicCameraState;
  active: boolean;
  fovDelta: number;
  orbitYawOffset: number;
  zoomOffset: number;
  heightOffset: number;
  focusBlend: number;
}

export function createIdleCinematicCameraState(reducedMotion = false): CinematicCameraState {
  return {
    mode: 'none',
    remainingSec: 0,
    durationSec: 0,
    focusX: 0,
    focusZ: 0,
    reducedMotion,
  };
}

export function triggerCinematicCamera(
  mode: Exclude<CinematicCameraMode, 'none'>,
  focusX: number,
  focusZ: number,
  reducedMotion = false
): CinematicCameraState {
  if (reducedMotion) {
    return createIdleCinematicCameraState(true);
  }
  const durationSec = mode === 'boss_intro' ? 1.15 : 0.72;
  return {
    mode,
    remainingSec: durationSec,
    durationSec,
    focusX,
    focusZ,
    reducedMotion: false,
  };
}

export function stepCinematicCamera(
  state: CinematicCameraState,
  dt: number
): CinematicCameraSample {
  if (state.reducedMotion || state.mode === 'none' || state.remainingSec <= 0 || state.durationSec <= 0) {
    return {
      nextState: { ...state, mode: 'none', remainingSec: 0 },
      active: false,
      fovDelta: 0,
      orbitYawOffset: 0,
      zoomOffset: 0,
      heightOffset: 0,
      focusBlend: 0,
    };
  }
  const nextRemaining = Math.max(0, state.remainingSec - Math.max(0, dt));
  const progress = Math.min(1, Math.max(0, 1 - nextRemaining / state.durationSec));
  // Smooth bell envelope: rises rapidly, eases back to gameplay framing
  const envelope = Math.sin(progress * Math.PI);

  if (state.mode === 'boss_intro') {
    return {
      nextState: {
        ...state,
        mode: nextRemaining > 0 ? 'boss_intro' : 'none',
        remainingSec: nextRemaining,
      },
      active: nextRemaining > 0,
      fovDelta: -4.2 * envelope,
      orbitYawOffset: Math.sin(progress * Math.PI * 1.2) * 0.24 * envelope,
      zoomOffset: -2.2 * envelope,
      heightOffset: -1.1 * envelope,
      focusBlend: 0.65 * envelope,
    };
  }

  // execution_finisher
  return {
    nextState: {
      ...state,
      mode: nextRemaining > 0 ? 'execution_finisher' : 'none',
      remainingSec: nextRemaining,
    },
    active: nextRemaining > 0,
    fovDelta: -6.5 * envelope,
    orbitYawOffset: 0.18 * envelope,
    zoomOffset: -3.1 * envelope,
    heightOffset: -1.6 * envelope,
    focusBlend: 0.78 * envelope,
  };
}

// ============================================================================
// PILLAR 3: GUARANTEED GEAR FORGE BLUEPRINT PITY (LÒ ĐÚC BẢO HIỂM TRANG BỊ)
// ============================================================================

export const FORGE_EPIC_PITY_MAX = 6;
export const FORGE_LEGENDARY_PITY_MAX = 15;
export const FORGE_LEGENDARY_SOFT_PITY_START = 11;
export const FORGE_SHARD_EXCHANGE_COST = 25;

export interface ForgePitySummary {
  epicCurrent: number;
  epicMax: number;
  rollsToEpic: number;
  legendaryCurrent: number;
  legendaryMax: number;
  rollsToLegendary: number;
  isSoftPityActive: boolean;
  effectiveLegendaryRatePct: number;
  forgeRelicShards: number;
  shardExchangeCost: number;
  canDirectCraftGear: boolean;
}

export function getForgeShardsFromRarity(rarity: Rarity): number {
  switch (rarity) {
    case R_MYTHIC:
      return 15;
    case R_LEGENDARY:
      return 12;
    case R_EPIC:
      return 7;
    case R_RARE:
      return 4;
    default:
      return 2;
  }
}

export function computeForgePitySummary(
  pity: Partial<PityState> | undefined,
  canRollLegendary = true
): ForgePitySummary {
  const epicCurrent = Math.max(0, Math.min(FORGE_EPIC_PITY_MAX - 1, Math.floor(pity?.forgeRollsSinceEpic ?? 0)));
  const legendaryCurrent = Math.max(
    0,
    Math.min(FORGE_LEGENDARY_PITY_MAX - 1, Math.floor(pity?.forgeRollsSinceLegendary ?? 0))
  );
  const forgeRelicShards = Math.max(0, Math.floor(pity?.forgeRelicShards ?? 0));
  const rollsToEpic = Math.max(1, FORGE_EPIC_PITY_MAX - epicCurrent);
  const rollsToLegendary = Math.max(1, FORGE_LEGENDARY_PITY_MAX - legendaryCurrent);
  const isSoftPityActive = canRollLegendary && legendaryCurrent + 1 >= FORGE_LEGENDARY_SOFT_PITY_START;
  const baseLegRate = canRollLegendary ? 0.09 : 0;
  const softBonus = isSoftPityActive
    ? Math.min(0.85, (legendaryCurrent + 1 - FORGE_LEGENDARY_SOFT_PITY_START + 1) * 0.16)
    : 0;
  const effectiveLegendaryRatePct =
    rollsToLegendary === 1 && canRollLegendary
      ? 100
      : Math.min(100, Math.round((baseLegRate + softBonus) * 100));

  return {
    epicCurrent,
    epicMax: FORGE_EPIC_PITY_MAX,
    rollsToEpic,
    legendaryCurrent,
    legendaryMax: FORGE_LEGENDARY_PITY_MAX,
    rollsToLegendary,
    isSoftPityActive,
    effectiveLegendaryRatePct,
    forgeRelicShards,
    shardExchangeCost: FORGE_SHARD_EXCHANGE_COST,
    canDirectCraftGear: forgeRelicShards >= FORGE_SHARD_EXCHANGE_COST,
  };
}

export interface ProtectedForgeRollResult {
  rarity: Rarity;
  nextPity: PityState;
  shardsGained: number;
  hitEpicPity: boolean;
  hitLegendaryPity: boolean;
}

const RARITY_ORDER_LOCAL: Rarity[] = [
  R_COMMON,
  R_RARE,
  R_EPIC,
  R_LEGENDARY,
  R_MYTHIC,
];

function clampRarityLocal(rarity: Rarity, maxRarity?: Rarity): Rarity {
  if (!maxRarity) return rarity;
  const rIdx = RARITY_ORDER_LOCAL.indexOf(rarity);
  const mIdx = RARITY_ORDER_LOCAL.indexOf(maxRarity);
  if (rIdx === -1 || mIdx === -1) return rarity;
  return rIdx > mIdx ? maxRarity : rarity;
}

export function rollProtectedForgeGear(
  currentPity: Partial<PityState> | undefined,
  options?: { maxRarity?: Rarity; rng?: () => number }
): ProtectedForgeRollResult {
  const rng = options?.rng ?? Math.random;
  const maxRarity = options?.maxRarity ?? R_LEGENDARY;
  const maxIdx = RARITY_ORDER_LOCAL.indexOf(maxRarity);
  const canRollEpic = maxIdx >= RARITY_ORDER_LOCAL.indexOf(R_EPIC);
  const canRollLegendary = maxIdx >= RARITY_ORDER_LOCAL.indexOf(R_LEGENDARY);

  const epicCur = Math.max(0, Math.floor(currentPity?.forgeRollsSinceEpic ?? 0));
  const legCur = Math.max(0, Math.floor(currentPity?.forgeRollsSinceLegendary ?? 0));
  const existingShards = Math.max(0, Math.floor(currentPity?.forgeRelicShards ?? 0));

  const hitLegendaryPity = canRollLegendary && legCur + 1 >= FORGE_LEGENDARY_PITY_MAX;
  const hitEpicPity = !hitLegendaryPity && canRollEpic && epicCur + 1 >= FORGE_EPIC_PITY_MAX;

  let rarity: Rarity;
  if (hitLegendaryPity) {
    rarity = R_LEGENDARY;
  } else if (hitEpicPity) {
    rarity = R_EPIC;
  } else {
    const softBonus =
      canRollLegendary && legCur + 1 >= FORGE_LEGENDARY_SOFT_PITY_START
        ? Math.min(0.85, (legCur + 1 - FORGE_LEGENDARY_SOFT_PITY_START + 1) * 0.16)
        : 0;
    const roll = rng();
    const legThreshold = canRollLegendary ? Math.min(0.95, 0.09 + softBonus) : 0;
    const epicThreshold = canRollEpic ? Math.min(0.98, legThreshold + 0.28) : 0;
    if (roll < legThreshold) rarity = R_LEGENDARY;
    else if (roll < epicThreshold) rarity = R_EPIC;
    else rarity = R_RARE;
  }

  rarity = clampRarityLocal(rarity, maxRarity);
  const rIdx = RARITY_ORDER_LOCAL.indexOf(rarity);
  const nextEpic =
    canRollEpic && rIdx >= RARITY_ORDER_LOCAL.indexOf(R_EPIC)
      ? 0
      : Math.min(FORGE_EPIC_PITY_MAX - 1, epicCur + 1);
  const nextLeg =
    canRollLegendary && rIdx >= RARITY_ORDER_LOCAL.indexOf(R_LEGENDARY)
      ? 0
      : Math.min(FORGE_LEGENDARY_PITY_MAX - 1, legCur + 1);

  const shardsGained = getForgeShardsFromRarity(rarity);

  const nextPity: PityState = {
    mythicRollsSinceEpic: currentPity?.mythicRollsSinceEpic ?? 0,
    mythicRollsSinceSTier: currentPity?.mythicRollsSinceSTier ?? 0,
    runeRollsSinceEpic: currentPity?.runeRollsSinceEpic ?? 0,
    runeRollsSinceLegendary: currentPity?.runeRollsSinceLegendary ?? 0,
    ancientRuneShards: currentPity?.ancientRuneShards ?? 0,
    forgeRollsSinceEpic: nextEpic,
    forgeRollsSinceLegendary: nextLeg,
    forgeRelicShards: existingShards + shardsGained,
  };

  return {
    rarity,
    nextPity,
    shardsGained,
    hitEpicPity,
    hitLegendaryPity,
  };
}

export function consumeForgeShardsForDirectCraft(
  currentPity: Partial<PityState> | undefined,
  targetSlot: GearSlot,
  options?: { maxRarity?: Rarity }
): {
  ok: boolean;
  targetSlot: GearSlot;
  rarity: Rarity;
  nextPity: PityState;
  reason?: string;
} {
  const existingShards = Math.max(0, Math.floor(currentPity?.forgeRelicShards ?? 0));
  const basePity: PityState = {
    mythicRollsSinceEpic: currentPity?.mythicRollsSinceEpic ?? 0,
    mythicRollsSinceSTier: currentPity?.mythicRollsSinceSTier ?? 0,
    runeRollsSinceEpic: currentPity?.runeRollsSinceEpic ?? 0,
    runeRollsSinceLegendary: currentPity?.runeRollsSinceLegendary ?? 0,
    ancientRuneShards: currentPity?.ancientRuneShards ?? 0,
    forgeRollsSinceEpic: Math.max(0, Math.floor(currentPity?.forgeRollsSinceEpic ?? 0)),
    forgeRollsSinceLegendary: Math.max(0, Math.floor(currentPity?.forgeRollsSinceLegendary ?? 0)),
    forgeRelicShards: existingShards,
  };
  if (existingShards < FORGE_SHARD_EXCHANGE_COST) {
    return {
      ok: false,
      targetSlot,
      rarity: R_EPIC,
      nextPity: basePity,
      reason: `Cần ${FORGE_SHARD_EXCHANGE_COST} Mảnh Thánh Lò (hiện có ${existingShards}).`,
    };
  }
  const rarity = clampRarityLocal(R_LEGENDARY, options?.maxRarity ?? R_LEGENDARY);
  return {
    ok: true,
    targetSlot,
    rarity,
    nextPity: {
      ...basePity,
      forgeRelicShards: existingShards - FORGE_SHARD_EXCHANGE_COST,
    },
  };
}

// ============================================================================
// PILLAR 4: EQUALIZED ENDLESS RIFT WITH DAILY ROTATING MUTATORS
// ============================================================================

export type RiftMutatorId =
  | 'overcharge_resonance'
  | 'glass_cannon_frenzy'
  | 'glacial_attrition'
  | 'overdrive_surge'
  | 'iron_bastion_foes'
  | 'precision_crit_trial';

export interface RiftMutatorDef {
  id: RiftMutatorId;
  name: string;
  desc: string;
  playerAtkMult: number;
  playerAspdMult: number;
  enemyHpMult: number;
  enemyDmgMult: number;
  resonanceGainMult: number;
  overdriveChargeMult: number;
  accentHex: string;
}

export const DAILY_RIFT_MUTATORS: RiftMutatorDef[] = [
  {
    id: 'overcharge_resonance',
    name: 'Cộng Hưởng Quá Tải',
    desc: 'Phản ứng Nguyên Tố tích lũy +40% nhanh hơn · Quái tăng +15% HP.',
    playerAtkMult: 1.05,
    playerAspdMult: 1.0,
    enemyHpMult: 1.15,
    enemyDmgMult: 1.0,
    resonanceGainMult: 1.4,
    overdriveChargeMult: 1.1,
    accentHex: '#38bdf8',
  },
  {
    id: 'glass_cannon_frenzy',
    name: 'Huyết Chiến Cực Tốc',
    desc: 'Anh Hùng +24% ATK & +12% Tốc Bắn · Quái +22% Sát Thương.',
    playerAtkMult: 1.24,
    playerAspdMult: 1.12,
    enemyHpMult: 1.0,
    enemyDmgMult: 1.22,
    resonanceGainMult: 1.0,
    overdriveChargeMult: 1.15,
    accentHex: '#f43f5e',
  },
  {
    id: 'glacial_attrition',
    name: 'Băng Giá Cực Hạn',
    desc: 'Quái cứng hơn +20% HP nhưng đòn đánh chậm · Sạc Thức Tỉnh +25%.',
    playerAtkMult: 1.0,
    playerAspdMult: 1.04,
    enemyHpMult: 1.2,
    enemyDmgMult: 0.94,
    resonanceGainMult: 1.15,
    overdriveChargeMult: 1.25,
    accentHex: '#67e8f9',
  },
  {
    id: 'overdrive_surge',
    name: 'Triều Cường Thức Tỉnh',
    desc: 'Vũ Khí Thức Tỉnh sạc nhanh +45% · Boss & Tinh Anh +14% ATK.',
    playerAtkMult: 1.08,
    playerAspdMult: 1.06,
    enemyHpMult: 1.1,
    enemyDmgMult: 1.14,
    resonanceGainMult: 1.1,
    overdriveChargeMult: 1.45,
    accentHex: '#f59e0b',
  },
  {
    id: 'iron_bastion_foes',
    name: 'Pháo Đài Thép',
    desc: 'Quái tăng +25% HP · Vật thể Môi Trường & Phá Giáp phát huy tối đa.',
    playerAtkMult: 1.1,
    playerAspdMult: 1.0,
    enemyHpMult: 1.25,
    enemyDmgMult: 1.08,
    resonanceGainMult: 1.2,
    overdriveChargeMult: 1.2,
    accentHex: '#a855f7',
  },
  {
    id: 'precision_crit_trial',
    name: 'Nhịp Điệu Chuẩn Xác',
    desc: 'Tốc Bắn +15% · Quái gây +18% Sát Thương khi trúng đòn.',
    playerAtkMult: 1.12,
    playerAspdMult: 1.15,
    enemyHpMult: 1.06,
    enemyDmgMult: 1.18,
    resonanceGainMult: 1.0,
    overdriveChargeMult: 1.18,
    accentHex: '#10b981',
  },
];

export function getUtcDateKeyWave11(nowMs = Date.now()): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

export function getDailyRiftMutators(dateKey: string): [RiftMutatorDef, RiftMutatorDef] {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i++) {
    hash = (hash * 33 + dateKey.charCodeAt(i)) >>> 0;
  }
  const len = DAILY_RIFT_MUTATORS.length;
  const firstIdx = hash % len;
  const secondIdx = (firstIdx + 1 + ((hash >> 4) % (len - 1))) % len;
  return [DAILY_RIFT_MUTATORS[firstIdx], DAILY_RIFT_MUTATORS[secondIdx]];
}

export interface EqualizedRiftMilestone {
  floor: number;
  title: string;
  gold: number;
  gems: number;
  starDust: number;
  seasonPoints: number;
  forgeRelicShards: number;
}

export const EQUALIZED_RIFT_MILESTONES: EqualizedRiftMilestone[] = [
  { floor: 1, title: 'Khởi Động Đồng Bộ', gold: 240, gems: 15, starDust: 20, seasonPoints: 80, forgeRelicShards: 4 },
  { floor: 3, title: 'Chinh Phục Tầng 3', gold: 420, gems: 25, starDust: 35, seasonPoints: 140, forgeRelicShards: 6 },
  { floor: 5, title: 'Bậc Thầy Mutator', gold: 680, gems: 40, starDust: 55, seasonPoints: 220, forgeRelicShards: 8 },
  { floor: 8, title: 'Tinh Anh Không Giới Hạn', gold: 1050, gems: 60, starDust: 85, seasonPoints: 340, forgeRelicShards: 10 },
  { floor: 12, title: 'Đỉnh Cao Tháp Đồng Bộ', gold: 1600, gems: 95, starDust: 130, seasonPoints: 520, forgeRelicShards: 15 },
];

export interface EqualizedRiftProgressState {
  dateKey: string;
  bestFloorToday: number;
  seasonBestFloor: number;
  claimedMilestones: number[];
  totalRiftClears: number;
}

export function normalizeEqualizedRiftState(
  raw?: Partial<EqualizedRiftProgressState>,
  dateKey = getUtcDateKeyWave11()
): EqualizedRiftProgressState {
  const isSameDay = raw?.dateKey === dateKey;
  return {
    dateKey,
    bestFloorToday: isSameDay ? Math.max(0, Math.floor(raw?.bestFloorToday ?? 0)) : 0,
    seasonBestFloor: Math.max(
      Math.max(0, Math.floor(raw?.seasonBestFloor ?? 0)),
      isSameDay ? Math.max(0, Math.floor(raw?.bestFloorToday ?? 0)) : 0
    ),
    claimedMilestones: Array.isArray(raw?.claimedMilestones)
      ? Array.from(new Set(raw.claimedMilestones.filter((f) => Number.isFinite(f) && f > 0)))
      : [],
    totalRiftClears: Math.max(0, Math.floor(raw?.totalRiftClears ?? 0)),
  };
}

export function computeEqualizedRiftModifiers(
  floor: number,
  mutators: [RiftMutatorDef, RiftMutatorDef]
): {
  floor: number;
  playerAtkMult: number;
  playerAspdMult: number;
  enemyHpMult: number;
  enemyDmgMult: number;
  resonanceGainMult: number;
  overdriveChargeMult: number;
  summaryLabel: string;
} {
  const safeFloor = Math.max(1, Math.floor(floor));
  const [m1, m2] = mutators;
  const floorScaleHp = 1 + (safeFloor - 1) * 0.16;
  const floorScaleDmg = 1 + (safeFloor - 1) * 0.11;
  return {
    floor: safeFloor,
    playerAtkMult: Number((m1.playerAtkMult * m2.playerAtkMult).toFixed(3)),
    playerAspdMult: Number((m1.playerAspdMult * m2.playerAspdMult).toFixed(3)),
    enemyHpMult: Number((m1.enemyHpMult * m2.enemyHpMult * floorScaleHp).toFixed(3)),
    enemyDmgMult: Number((m1.enemyDmgMult * m2.enemyDmgMult * floorScaleDmg).toFixed(3)),
    resonanceGainMult: Number((m1.resonanceGainMult * m2.resonanceGainMult).toFixed(3)),
    overdriveChargeMult: Number((m1.overdriveChargeMult * m2.overdriveChargeMult).toFixed(3)),
    summaryLabel: `${m1.name} · ${m2.name}`,
  };
}

export function recordEqualizedRiftClear(
  state: EqualizedRiftProgressState,
  clearedFloor: number,
  dateKey = getUtcDateKeyWave11()
): EqualizedRiftProgressState {
  const base = normalizeEqualizedRiftState(state, dateKey);
  const nextFloor = Math.max(base.bestFloorToday, Math.max(1, Math.floor(clearedFloor)));
  return {
    ...base,
    dateKey,
    bestFloorToday: nextFloor,
    seasonBestFloor: Math.max(base.seasonBestFloor, nextFloor),
    totalRiftClears: base.totalRiftClears + 1,
  };
}

// ============================================================================
// PILLAR 5A: TACTICAL AI SQUAD FORMATION & LIVE PINGS
// ============================================================================

export type AiSquadFormationId = 'break_focus' | 'guard_sustain' | 'elemental_chain';

export interface AiSquadFormationConfig {
  id: AiSquadFormationId;
  name: string;
  shortLabel: string;
  desc: string;
  allyDmgMult: number;
  allyBreakMult: number;
  sanctuaryCdMult: number;
  primerRateMult: number;
  pingCallout: string;
  accentHex: string;
}

export const AI_SQUAD_FORMATIONS: Record<AiSquadFormationId, AiSquadFormationConfig> = {
  break_focus: {
    id: 'break_focus',
    name: 'Tổng Lực Phá Giáp',
    shortLabel: 'Phá Giáp',
    desc: 'Đồng đội AI tập trung bắn bộ phận Boss & khiên phá giáp (+28% Phá Giáp, +12% ST).',
    allyDmgMult: 1.12,
    allyBreakMult: 1.28,
    sanctuaryCdMult: 1.08,
    primerRateMult: 1.0,
    pingCallout: 'Đội hình Phá Giáp! Tập trung bắn vỡ hộ giáp Boss!',
    accentHex: '#f59e0b',
  },
  guard_sustain: {
    id: 'guard_sustain',
    name: 'Hộ Vệ Bảo Kê',
    shortLabel: 'Bảo Kê',
    desc: 'Đồng đội AI giảm 25% hồi chiêu Vòng Thánh Cứu Nguy và hút mục tiêu cận chiến.',
    allyDmgMult: 0.96,
    allyBreakMult: 1.05,
    sanctuaryCdMult: 0.75,
    primerRateMult: 1.05,
    pingCallout: 'Đội hình Bảo Kê! Giữ vòng khiên hồi phục cho đội trưởng!',
    accentHex: '#10b981',
  },
  elemental_chain: {
    id: 'elemental_chain',
    name: 'Cộng Hưởng Nguyên Tố',
    shortLabel: 'Nguyên Tố',
    desc: 'Đồng đội AI tăng +35% tốc độ mồi nguyên tố bổ trợ để kích nổ Tam Nguyên liên tục.',
    allyDmgMult: 1.06,
    allyBreakMult: 1.12,
    sanctuaryCdMult: 1.0,
    primerRateMult: 1.35,
    pingCallout: 'Đội hình Cộng Hưởng! Mồi nguyên tố liên hoàn kích nổ AoE!',
    accentHex: '#38bdf8',
  },
};

export const AI_SQUAD_FORMATION_LIST: AiSquadFormationConfig[] = [
  AI_SQUAD_FORMATIONS.break_focus,
  AI_SQUAD_FORMATIONS.guard_sustain,
  AI_SQUAD_FORMATIONS.elemental_chain,
];

export function normalizeAiSquadFormation(raw?: string): AiSquadFormationId {
  if (raw === 'guard_sustain' || raw === 'elemental_chain') return raw;
  return 'break_focus';
}

export function formatSquadPingBanner(
  formationId: AiSquadFormationId,
  allyName = 'Tổ Đội AI'
): string {
  const cfg = AI_SQUAD_FORMATIONS[formationId] ?? AI_SQUAD_FORMATIONS.break_focus;
  return `${allyName}: ${cfg.pingCallout}`;
}

// ============================================================================
// PILLAR 5B: REAL-TIME AI CHAMPIONSHIP SPECTATOR ARENA (XEM AI ĐẤU GIẢI)
// ============================================================================

export interface LiveSpectatorFighter {
  aiPlayerId: string;
  displayName: string;
  heroId: HeroId;
  powerRating: number;
  personality: 'aggressive' | 'tactical' | 'assassin';
  hp: number;
  maxHp: number;
  momentum: number; // 0..100
  styleGrade: 'B' | 'A' | 'S' | 'SS' | 'SSS';
  damageDealt: number;
  critsLanded: number;
  dodgesLanded: number;
  cheersCount: number;
}

export interface LiveSpectatorTickerLine {
  id: string;
  tick: number;
  text: string;
  accent: 'sky' | 'amber' | 'rose' | 'emerald';
}

export interface LiveSpectatorMatchState {
  matchId: string;
  roundLabel: string;
  status: 'pre_match' | 'live' | 'finished';
  startedAt: number;
  updatedAt: number;
  tickCount: number;
  maxTicks: number;
  fighterA: LiveSpectatorFighter;
  fighterB: LiveSpectatorFighter;
  winnerId: string | null;
  tickerLog: LiveSpectatorTickerLine[];
  cheerRewardGold: number;
  cheerRewardGems: number;
  cheerRewardStarDust: number;
  playerCheeredFighterId?: string | null;
  playerClaimedReward?: boolean;
}

export interface SpectatorRosterCandidate {
  id: string;
  displayName: string;
  heroId: HeroId;
  powerRating: number;
  personality: 'aggressive' | 'tactical' | 'assassin';
}

function gradeFromMomentum(m: number): LiveSpectatorFighter['styleGrade'] {
  if (m >= 92) return 'SSS';
  if (m >= 76) return 'SS';
  if (m >= 58) return 'S';
  if (m >= 36) return 'A';
  return 'B';
}

export function createLiveSpectatorMatch(
  roster: SpectatorRosterCandidate[],
  nowMs = Date.now(),
  matchNumber = 1
): LiveSpectatorMatchState {
  const safeRoster: SpectatorRosterCandidate[] =
    roster.length >= 2
      ? roster
      : [
          {
            id: 'ai_linh_vu',
            displayName: 'Linh Vũ',
            heroId: 'artemis',
            powerRating: 5400,
            personality: 'tactical',
          },
          {
            id: 'ai_te_thien',
            displayName: 'Tề Thiên',
            heroId: 'wukong',
            powerRating: 5650,
            personality: 'aggressive',
          },
        ];

  const idxA = (matchNumber * 3) % safeRoster.length;
  const idxB = (idxA + 1 + (matchNumber % Math.max(1, safeRoster.length - 1))) % safeRoster.length;
  const a = safeRoster[idxA];
  const b = safeRoster[idxB === idxA ? (idxA + 1) % safeRoster.length : idxB];

  const equalizedMaxHp = 3200;
  const roundLabels = [
    'Tứ Kết Siêu Cúp AI',
    'Bán Kết Hoàng Đạo',
    'Chung Kết Tinh Giới',
    'Trận Tranh Hạng 1 Máy Chủ',
  ];
  const roundLabel = roundLabels[(Math.max(1, matchNumber) - 1) % roundLabels.length];
  const matchId = `spec_${nowMs}_${matchNumber}`;

  return {
    matchId,
    roundLabel,
    status: 'live',
    startedAt: nowMs,
    updatedAt: nowMs,
    tickCount: 0,
    maxTicks: 18,
    fighterA: {
      aiPlayerId: a.id,
      displayName: a.displayName,
      heroId: a.heroId,
      powerRating: a.powerRating,
      personality: a.personality,
      hp: equalizedMaxHp,
      maxHp: equalizedMaxHp,
      momentum: 22,
      styleGrade: 'B',
      damageDealt: 0,
      critsLanded: 0,
      dodgesLanded: 0,
      cheersCount: 3 + (matchNumber % 5),
    },
    fighterB: {
      aiPlayerId: b.id,
      displayName: b.displayName,
      heroId: b.heroId,
      powerRating: b.powerRating,
      personality: b.personality,
      hp: equalizedMaxHp,
      maxHp: equalizedMaxHp,
      momentum: 22,
      styleGrade: 'B',
      damageDealt: 0,
      critsLanded: 0,
      dodgesLanded: 0,
      cheersCount: 3 + ((matchNumber + 2) % 5),
    },
    winnerId: null,
    tickerLog: [
      {
        id: `${matchId}_t0`,
        tick: 0,
        text: `${a.displayName} chạm trán ${b.displayName} tại ${roundLabel}!`,
        accent: 'sky',
      },
    ],
    cheerRewardGold: 280,
    cheerRewardGems: 18,
    cheerRewardStarDust: 26,
  };
}

function hashStep(matchId: string, tick: number, salt: number): number {
  let h = 2166136261 ^ tick ^ (salt * 16777619);
  for (let i = 0; i < matchId.length; i++) {
    h ^= matchId.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

export function stepLiveSpectatorMatch(
  match: LiveSpectatorMatchState,
  nowMs = Date.now()
): { nextMatch: LiveSpectatorMatchState; justFinished: boolean } {
  if (match.status === 'finished') {
    return { nextMatch: match, justFinished: false };
  }

  const nextTick = match.tickCount + 1;
  const fA: LiveSpectatorFighter = { ...match.fighterA };
  const fB: LiveSpectatorFighter = { ...match.fighterB };
  const logs = [...match.tickerLog];

  const rollA = hashStep(match.matchId, nextTick, 11);
  const rollB = hashStep(match.matchId, nextTick, 29);

  // Equalized base + personality nuance
  const applyExchange = (
    attacker: LiveSpectatorFighter,
    defender: LiveSpectatorFighter,
    roll: number,
    salt: number
  ) => {
    const dodgeChance =
      defender.personality === 'assassin' ? 0.24 : defender.personality === 'tactical' ? 0.19 : 0.13;
    if (roll < dodgeChance) {
      defender.dodgesLanded += 1;
      defender.momentum = Math.min(100, defender.momentum + 14);
      defender.styleGrade = gradeFromMomentum(defender.momentum);
      logs.unshift({
        id: `${match.matchId}_t${nextTick}_${salt}`,
        tick: nextTick,
        text: `${defender.displayName} Né Hoàn Hảo cú bắn của ${attacker.displayName}!`,
        accent: 'sky',
      });
      return;
    }

    const critChance =
      attacker.personality === 'assassin' ? 0.34 : attacker.personality === 'aggressive' ? 0.28 : 0.24;
    const isCrit = roll > 1 - critChance;
    const isOverdrive = attacker.momentum >= 88;
    const baseHit = 240 + Math.round(hashStep(match.matchId, nextTick, salt + 7) * 165);
    const dmg = Math.round(
      baseHit *
        (isCrit ? 1.55 : 1.0) *
        (isOverdrive ? 1.32 : 1.0) *
        (attacker.personality === 'aggressive' ? 1.07 : 1.0)
    );
    defender.hp = Math.max(0, defender.hp - dmg);
    attacker.damageDealt += dmg;
    if (isCrit) attacker.critsLanded += 1;
    attacker.momentum = isOverdrive
      ? 35
      : Math.min(100, attacker.momentum + (isCrit ? 18 : 11));
    attacker.styleGrade = gradeFromMomentum(attacker.momentum);

    logs.unshift({
      id: `${match.matchId}_t${nextTick}_${salt}`,
      tick: nextTick,
      text: isOverdrive
        ? `${attacker.displayName} kích hoạt Vũ Khí Thức Tỉnh gây ${dmg} ST vào ${defender.displayName}!`
        : isCrit
        ? `${attacker.displayName} tung đòn Chí Mạng ${dmg} ST lên ${defender.displayName}!`
        : `${attacker.displayName} gây ${dmg} ST liên hoàn lên ${defender.displayName}.`,
      accent: isOverdrive ? 'amber' : isCrit ? 'rose' : 'emerald',
    });
  };

  applyExchange(fA, fB, rollA, 1);
  if (fB.hp > 0) {
    applyExchange(fB, fA, rollB, 2);
  }

  let status: LiveSpectatorMatchState['status'] = 'live';
  let winnerId: string | null = null;
  let justFinished = false;

  if (fA.hp <= 0 || fB.hp <= 0 || nextTick >= match.maxTicks) {
    status = 'finished';
    justFinished = true;
    if (fA.hp === fB.hp) {
      winnerId = fA.damageDealt >= fB.damageDealt ? fA.aiPlayerId : fB.aiPlayerId;
    } else {
      winnerId = fA.hp > fB.hp ? fA.aiPlayerId : fB.aiPlayerId;
    }
    const winnerName = winnerId === fA.aiPlayerId ? fA.displayName : fB.displayName;
    logs.unshift({
      id: `${match.matchId}_ko`,
      tick: nextTick,
      text: `KẾT THÚC! ${winnerName} giành chiến thắng ${match.roundLabel}!`,
      accent: 'amber',
    });
  }

  return {
    nextMatch: {
      ...match,
      status,
      updatedAt: nowMs,
      tickCount: nextTick,
      fighterA: fA,
      fighterB: fB,
      winnerId,
      tickerLog: logs.slice(0, 8),
    },
    justFinished,
  };
}

export function computeSpectatorCheerReward(
  match: LiveSpectatorMatchState,
  cheeredFighterId: string | null | undefined
): {
  predictedCorrectly: boolean;
  goldReward: number;
  gemsReward: number;
  starDustReward: number;
} {
  if (match.status !== 'finished' || !cheeredFighterId) {
    return { predictedCorrectly: false, goldReward: 0, gemsReward: 0, starDustReward: 0 };
  }
  const predictedCorrectly = match.winnerId === cheeredFighterId;
  const mult = predictedCorrectly ? 1.0 : 0.5;
  return {
    predictedCorrectly,
    goldReward: Math.round(match.cheerRewardGold * mult),
    gemsReward: Math.round(match.cheerRewardGems * mult),
    starDustReward: Math.round(match.cheerRewardStarDust * mult),
  };
}

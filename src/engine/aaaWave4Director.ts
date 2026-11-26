import { HudScaleMode } from '../types/game';

export type ElementalHitType = 'fire' | 'ice' | 'storm' | 'poison';
export type ElementalReactionId =
  | 'melt'
  | 'superconduct'
  | 'overload'
  | 'venom_detonation'
  | 'electro_venom'
  | 'cryo_blight';

export interface EnemyElementalStatus {
  burning: boolean;
  chilled: boolean;
  poisoned: boolean;
  /** Wave 13: Optional electro-charged status for full bidirectional pair reactions */
  shocked?: boolean;
}

export interface ElementalReactionResult {
  id: ElementalReactionId;
  label: string;
  bonusDamage: number;
  breakShieldBonusRatio: number; // extra boss break-shield shred ratio
  aoeRadius: number;
  knockbackForce: number;
  primaryHex: number;
  secondaryHex: number;
  cooldownSec: number;
  /** Wave 13: Optional armor sunder duration (Cryo Blight) */
  sunderDurationSec?: number;
  /** Wave 13: Optional extra chain jumps (Electro Venom) */
  chainTargets?: number;
}

export interface ElementalChainState {
  lastReactionId: ElementalReactionId | null;
  chainCount: number;
  timerSec: number;
}

export interface ElementalChainBonusResult {
  chainCount: number;
  triggeredChainResonance: boolean;
  damageMultiplier: number;
  extraBreakShieldRatio: number;
  calloutLabel: string | null;
}

export function createElementalChainState(): ElementalChainState {
  return {
    lastReactionId: null,
    chainCount: 0,
    timerSec: 0,
  };
}

export function stepElementalChainState(state: ElementalChainState, dt: number): void {
  if (state.timerSec > 0) {
    state.timerSec = Math.max(0, state.timerSec - Math.max(0, dt));
    if (state.timerSec <= 0) {
      state.chainCount = 0;
      state.lastReactionId = null;
    }
  }
}

/**
 * Zero-GC Elemental Chain tracker: triggering 2+ distinct reactions within 6.0s
 * activates "Cộng Hưởng Chuỗi" (+18% reaction damage & +15% Boss Break-Shield shred).
 */
export function advanceElementalReactionChain(
  state: ElementalChainState,
  reactionId: ElementalReactionId
): ElementalChainBonusResult {
  const isDistinctFollowup =
    state.timerSec > 0 && state.lastReactionId !== null && state.lastReactionId !== reactionId;
  if (isDistinctFollowup) {
    state.chainCount = Math.min(5, Math.max(2, state.chainCount + 1));
  } else if (state.timerSec <= 0) {
    state.chainCount = 1;
  }
  state.lastReactionId = reactionId;
  state.timerSec = 6.0;

  if (state.chainCount >= 2) {
    const extraTier = Math.min(3, state.chainCount - 2);
    return {
      chainCount: state.chainCount,
      triggeredChainResonance: true,
      damageMultiplier: 1.18 + extraTier * 0.06,
      extraBreakShieldRatio: 0.15,
      calloutLabel: `CỘNG HƯỞNG ×${state.chainCount}!`,
    };
  }
  return {
    chainCount: state.chainCount,
    triggeredChainResonance: false,
    damageMultiplier: 1.0,
    extraBreakShieldRatio: 0,
    calloutLabel: null,
  };
}

export interface GamepadPrevButtons {
  dash: boolean;
  activeSkill: boolean;
  ultimate: boolean;
  pause: boolean;
}

export interface GamepadSampleResult {
  moveX: number;
  moveZ: number;
  dashPressed: boolean;
  activeSkillPressed: boolean;
  ultimatePressed: boolean;
  pausePressed: boolean;
  nextPrev: GamepadPrevButtons;
}

export interface VictoryCameraPose {
  camX: number;
  camY: number;
  camZ: number;
  lookX: number;
  lookY: number;
  lookZ: number;
  fov: number;
}

export interface TelegraphPalette {
  ringHex: number;
  fillHex: number;
  laneHex: number;
  imminentHex: number;
  punishHex: number;
}

export type HapticPatternId = 'crit' | 'dash' | 'reaction' | 'forge' | 'boss_break';

const HAPTIC_DURATIONS: Record<HapticPatternId, number | number[]> = {
  crit: 10,
  dash: 14,
  reaction: [16, 28, 22],
  forge: [14, 24, 18],
  boss_break: [24, 34, 32],
};

/**
 * Evaluates 3D Elemental Reactions when an enemy already bearing a status aura is hit
 * by a complementary element, gated by a per-enemy 1.6s internal cooldown so boss balance stays intact.
 */
export function evaluateElementalReaction(
  status: EnemyElementalStatus,
  incoming: ElementalHitType | null | undefined,
  hitDamage: number,
  remainingCooldownSec: number
): ElementalReactionResult | null {
  if (!incoming || remainingCooldownSec > 0 || hitDamage <= 0) return null;

  // Melt: Ice + Fire (either order)
  if ((incoming === 'fire' && status.chilled) || (incoming === 'ice' && status.burning)) {
    return {
      id: 'melt',
      label: 'TAN CHẢY!',
      bonusDamage: Math.max(1, Math.round(hitDamage * 0.45)),
      breakShieldBonusRatio: 0.08,
      aoeRadius: 2.1,
      knockbackForce: 0.4,
      primaryHex: 0xfb923c,
      secondaryHex: 0xe0f2fe,
      cooldownSec: 1.6,
    };
  }

  // Superconduct: Ice + Storm -> shreds Boss Break-Shield
  if (incoming === 'storm' && status.chilled) {
    return {
      id: 'superconduct',
      label: 'SIÊU DẪN!',
      bonusDamage: Math.max(1, Math.round(hitDamage * 0.35)),
      breakShieldBonusRatio: 0.22,
      aoeRadius: 2.75,
      knockbackForce: 0.3,
      primaryHex: 0x38bdf8,
      secondaryHex: 0xc084fc,
      cooldownSec: 1.6,
    };
  }

  // Overload: Fire + Storm -> radial detonation + knockback
  if (incoming === 'storm' && status.burning) {
    return {
      id: 'overload',
      label: 'QUÁ TẢI!',
      bonusDamage: Math.max(1, Math.round(hitDamage * 0.4)),
      breakShieldBonusRatio: 0.14,
      aoeRadius: 3.1,
      knockbackForce: 1.45,
      primaryHex: 0xf43f5e,
      secondaryHex: 0xfde047,
      cooldownSec: 1.6,
    };
  }

  // Venom Detonation: Poison + Fire (either order)
  if ((incoming === 'fire' && status.poisoned) || (incoming === 'poison' && status.burning)) {
    return {
      id: 'venom_detonation',
      label: 'NỔ ĐỘC KHÍ!',
      bonusDamage: Math.max(1, Math.round(hitDamage * 0.38)),
      breakShieldBonusRatio: 0.1,
      aoeRadius: 2.8,
      knockbackForce: 0.65,
      primaryHex: 0x4ade80,
      secondaryHex: 0xfbbf24,
      cooldownSec: 1.6,
    };
  }

  // Wave 13 — Electro-Venom: Storm + Poison -> chains toxic-electric damage across up to 3 foes
  if ((incoming === 'storm' && status.poisoned) || (incoming === 'poison' && status.shocked)) {
    return {
      id: 'electro_venom',
      label: 'ĐỘC LÔI LAN!',
      bonusDamage: Math.max(1, Math.round(hitDamage * 0.36)),
      breakShieldBonusRatio: 0.13,
      aoeRadius: 3.3,
      knockbackForce: 0.35,
      primaryHex: 0xa3e635,
      secondaryHex: 0xa855f7,
      cooldownSec: 1.6,
      chainTargets: 3,
    };
  }

  // Wave 13 — Cryo-Blight: Ice + Poison (either order) -> brittle armor sunder (+22% dmg taken)
  if ((incoming === 'ice' && status.poisoned) || (incoming === 'poison' && status.chilled)) {
    return {
      id: 'cryo_blight',
      label: 'HÀN ĐỘC PHÁ GIÁP!',
      bonusDamage: Math.max(1, Math.round(hitDamage * 0.34)),
      breakShieldBonusRatio: 0.16,
      aoeRadius: 2.4,
      knockbackForce: 0.25,
      primaryHex: 0x2dd4bf,
      secondaryHex: 0x86efac,
      cooldownSec: 1.6,
      sunderDurationSec: 4.5,
    };
  }

  return null;
}

/**
 * Maps standard HTML5 Gamepad API axes & buttons into normalized 360 movement
 * (with radial deadzone) and rising-edge action triggers.
 */
export function sampleGamepadInput(
  axes: readonly number[],
  buttons: ReadonlyArray<{ pressed: boolean; value?: number }>,
  prev: GamepadPrevButtons,
  deadzone = 0.18
): GamepadSampleResult {
  const rawX = axes[0] ?? 0;
  const rawZ = axes[1] ?? 0;
  const mag = Math.hypot(rawX, rawZ);

  let moveX = 0;
  let moveZ = 0;
  if (mag > deadzone) {
    const scaled = Math.min(1, (mag - deadzone) / Math.max(0.01, 1 - deadzone));
    moveX = (rawX / mag) * scaled;
    moveZ = (rawZ / mag) * scaled;
  }

  // D-Pad fallback (Standard mapping: 12=Up, 13=Down, 14=Left, 15=Right)
  if (moveX === 0 && moveZ === 0) {
    const up = Boolean(buttons[12]?.pressed);
    const down = Boolean(buttons[13]?.pressed);
    const left = Boolean(buttons[14]?.pressed);
    const right = Boolean(buttons[15]?.pressed);
    const dx = (right ? 1 : 0) - (left ? 1 : 0);
    const dz = (down ? 1 : 0) - (up ? 1 : 0);
    const dLen = Math.hypot(dx, dz);
    if (dLen > 0) {
      moveX = dx / dLen;
      moveZ = dz / dLen;
    }
  }

  // Standard Gamepad layout: A(0)/RT(7)=Dash, X(2)/RB(5)=Active Skill, Y(3)/LB(4)=Ultimate, Start(9)=Pause
  const dashNow = Boolean(buttons[0]?.pressed || (buttons[7]?.value ?? 0) > 0.45);
  const activeNow = Boolean(buttons[2]?.pressed || buttons[5]?.pressed);
  const ultNow = Boolean(buttons[3]?.pressed || buttons[4]?.pressed);
  const pauseNow = Boolean(buttons[9]?.pressed);

  return {
    moveX: Math.round(moveX * 1000) / 1000,
    moveZ: Math.round(moveZ * 1000) / 1000,
    dashPressed: dashNow && !prev.dash,
    activeSkillPressed: activeNow && !prev.activeSkill,
    ultimatePressed: ultNow && !prev.ultimate,
    pausePressed: pauseNow && !prev.pause,
    nextPrev: {
      dash: dashNow,
      activeSkill: activeNow,
      ultimate: ultNow,
      pause: pauseNow,
    },
  };
}

/**
 * Computes a heroic low-angle 3D showcase orbit around the victorious Hero during GamePhase.VICTORY.
 * Respects reducedMotion by holding a crisp static hero-portrait framing.
 */
export function computeVictoryOrbitCamera(
  heroX: number,
  heroZ: number,
  elapsedSec: number,
  reducedMotion = false
): VictoryCameraPose {
  const angle = reducedMotion ? 0.36 : 0.36 + elapsedSec * 0.42;
  const radius = 5.4;
  const camX = heroX + Math.sin(angle) * radius;
  const camZ = heroZ + Math.cos(angle) * radius;
  const camY = 2.55 + (reducedMotion ? 0 : Math.sin(elapsedSec * 0.9) * 0.14);

  return {
    camX: Math.round(camX * 1000) / 1000,
    camY: Math.round(camY * 1000) / 1000,
    camZ: Math.round(camZ * 1000) / 1000,
    lookX: Math.round(heroX * 1000) / 1000,
    lookY: 1.18,
    lookZ: Math.round(heroZ * 1000) / 1000,
    fov: 42,
  };
}

/**
 * Resolves enemy telegraph colors for either standard Mythic Crimson or Colorblind-Safe
 * High-Contrast Electric Cyan / Bright Amber signaling.
 */
export function resolveTelegraphPalette(highContrast = false): TelegraphPalette {
  if (highContrast) {
    return {
      ringHex: 0x06b6d4,     // Electric Cyan outer ring (high luminance contrast)
      fillHex: 0xfacc15,     // Vivid Amber fill
      laneHex: 0x38bdf8,     // Bright Sky danger lane
      imminentHex: 0xffffff, // Pure white flash right before strike
      punishHex: 0x4ade80,   // Crisp emerald-lime punish ring
    };
  }
  return {
    ringHex: 0xf43f5e,
    fillHex: 0xfb7185,
    laneHex: 0xf43f5e,
    imminentHex: 0xffffff,
    punishHex: 0xfbbf24,
  };
}

/**
 * Maps user-selected HUD accessibility scale preset into CSS transform factor.
 */
export function resolveHudScaleFactor(scale?: HudScaleMode): number {
  if (scale === 'compact') return 0.88;
  if (scale === 'large') return 1.12;
  return 1.0;
}

/**
 * Safe Web Vibration API micro-haptics trigger (no-op on unsupported desktop browsers).
 */
export function triggerHapticPulse(pattern: HapticPatternId, enabled = true): boolean {
  if (!enabled) return false;
  if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') {
    return false;
  }
  try {
    return Boolean(navigator.vibrate(HAPTIC_DURATIONS[pattern]));
  } catch {
    return false;
  }
}

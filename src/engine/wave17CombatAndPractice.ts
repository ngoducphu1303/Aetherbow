import { CHAPTERS } from '../data/chaptersData';
import {
  BossPracticeHudState,
  InterruptCounterSurgeHudState,
} from '../types/game';

/**
 * Wave 17 (P2-3n): Pure Zero-GC Boss Interrupt Counter-Surge & 12-Zodiac Boss Practice Engine Module.
 * - Zero heap allocations in 60Hz `stepInterruptCounterSurge` hot loop.
 * - Boss Practice strictly locks all Gold/Gems/Shards/XP/Loot/Quest credit to 0 (no farm exploit).
 */

export const INTERRUPT_SURGE_DURATION_SEC = 3.8;
export const INTERRUPT_SURGE_ACTIVE_CD_TRIM_RATIO = 0.35;
export const INTERRUPT_SURGE_ULT_GAIN = 18;
export const INTERRUPT_SURGE_BOSS_WEAKPOINT_BONUS = 0.25;

export interface InterruptCounterSurgeState {
  active: boolean;
  remainingSec: number;
  maxDurationSec: number;
  bossWeakpointBonus: number;
  lastCdTrimmedSec: number;
  lastUltGained: number;
  totalSurgesTriggered: number;
}

export function createInterruptCounterSurgeState(): InterruptCounterSurgeState {
  return {
    active: false,
    remainingSec: 0,
    maxDurationSec: INTERRUPT_SURGE_DURATION_SEC,
    bossWeakpointBonus: INTERRUPT_SURGE_BOSS_WEAKPOINT_BONUS,
    lastCdTrimmedSec: 0,
    lastUltGained: 0,
    totalSurgesTriggered: 0,
  };
}

export function resetInterruptCounterSurgeState(
  state: InterruptCounterSurgeState
): void {
  state.active = false;
  state.remainingSec = 0;
  state.maxDurationSec = INTERRUPT_SURGE_DURATION_SEC;
  state.bossWeakpointBonus = INTERRUPT_SURGE_BOSS_WEAKPOINT_BONUS;
  state.lastCdTrimmedSec = 0;
  state.lastUltGained = 0;
  state.totalSurgesTriggered = 0;
}

export interface TriggerInterruptSurgeInput {
  isBoss: boolean;
  currentActiveSkillCooldown: number;
  currentUltCharge: number;
  reducedMotion?: boolean;
}

export interface TriggerInterruptSurgeResult {
  triggered: boolean;
  nextActiveSkillCooldown: number;
  cdTrimmedSec: number;
  nextUltCharge: number;
  ultGained: number;
  bossWeakpointBonusPct: number;
  surgeDurationSec: number;
  pulseScale: number;
}

/**
 * Mutates `state` in-place (Zero-GC) when the player successfully interrupts a Boss cast.
 * Returns deterministic skill cooldown trim (-35%), Ultimate gain (+18 clamped 100),
 * and activates the 3.8s +25% Boss Weakpoint damage window.
 */
export function triggerInterruptCounterSurge(
  state: InterruptCounterSurgeState,
  input: TriggerInterruptSurgeInput
): TriggerInterruptSurgeResult {
  const safeCd = Math.max(0, Number.isFinite(input.currentActiveSkillCooldown) ? input.currentActiveSkillCooldown : 0);
  const safeUlt = Math.max(0, Math.min(100, Number.isFinite(input.currentUltCharge) ? input.currentUltCharge : 0));

  if (!input.isBoss) {
    return {
      triggered: false,
      nextActiveSkillCooldown: safeCd,
      cdTrimmedSec: 0,
      nextUltCharge: safeUlt,
      ultGained: 0,
      bossWeakpointBonusPct: 0,
      surgeDurationSec: 0,
      pulseScale: 0,
    };
  }

  const cdTrimmedSec = Number((safeCd * INTERRUPT_SURGE_ACTIVE_CD_TRIM_RATIO).toFixed(3));
  const nextActiveSkillCooldown = Math.max(0, Number((safeCd - cdTrimmedSec).toFixed(3)));
  const nextUltCharge = Math.min(100, safeUlt + INTERRUPT_SURGE_ULT_GAIN);
  const ultGained = Math.max(0, nextUltCharge - safeUlt);

  state.active = true;
  state.remainingSec = INTERRUPT_SURGE_DURATION_SEC;
  state.maxDurationSec = INTERRUPT_SURGE_DURATION_SEC;
  state.bossWeakpointBonus = INTERRUPT_SURGE_BOSS_WEAKPOINT_BONUS;
  state.lastCdTrimmedSec = cdTrimmedSec;
  state.lastUltGained = ultGained;
  state.totalSurgesTriggered += 1;

  return {
    triggered: true,
    nextActiveSkillCooldown,
    cdTrimmedSec,
    nextUltCharge,
    ultGained,
    bossWeakpointBonusPct: Math.round(INTERRUPT_SURGE_BOSS_WEAKPOINT_BONUS * 100),
    surgeDurationSec: INTERRUPT_SURGE_DURATION_SEC,
    pulseScale: input.reducedMotion ? 0.35 : 1.0,
  };
}

/**
 * Zero-GC 60Hz tick for Interrupt Counter-Surge window.
 */
export function stepInterruptCounterSurge(
  state: InterruptCounterSurgeState,
  dt: number
): boolean {
  if (!state.active) return false;
  const safeDt = Math.max(0, Math.min(0.25, Number.isFinite(dt) ? dt : 0));
  state.remainingSec = Math.max(0, state.remainingSec - safeDt);
  if (state.remainingSec <= 0) {
    state.active = false;
    state.remainingSec = 0;
  }
  return state.active;
}

export function getInterruptSurgeBossDamageMult(
  state: InterruptCounterSurgeState | null | undefined,
  targetIsBoss: boolean
): number {
  if (!state || !state.active || state.remainingSec <= 0 || !targetIsBoss) {
    return 1.0;
  }
  return 1 + state.bossWeakpointBonus;
}

export function buildInterruptCounterSurgeHud(
  state: InterruptCounterSurgeState | null | undefined
): InterruptCounterSurgeHudState | null {
  if (!state || !state.active || state.remainingSec <= 0) return null;
  return {
    active: true,
    remainingSec: Number(state.remainingSec.toFixed(1)),
    maxDurationSec: state.maxDurationSec,
    bossWeakpointBonusPct: Math.round(state.bossWeakpointBonus * 100),
    activeCdTrimmedPct: Math.round(INTERRUPT_SURGE_ACTIVE_CD_TRIM_RATIO * 100),
    ultGained: Math.round(state.lastUltGained),
    totalSurgesTriggered: state.totalSurgesTriggered,
  };
}

// ---------------------------------------------------------------------------
// 12-Zodiac Boss Practice / Sparring Mode (0 Farm Exploit Lock)
// ---------------------------------------------------------------------------

export interface BossPracticeCatalogEntry {
  chapterId: number;
  zodiacTitle: string;
  bossName: string;
  recommendedPower: number;
  unlocked: boolean;
  unlockRequirementLabel: string;
}

export interface BossPracticeEncounterConfig {
  chapterId: number;
  bossName: string;
  zodiacTitle: string;
  bossHp: number;
  bossDamage: number;
  trimHex: number;
  zeroRewardLocked: true;
}

export interface BossPracticeRewardEnvelope {
  gold: number;
  gems: number;
  forgeShards: number;
  xp: number;
  lootDroppedCount: number;
  questProgressDelta: number;
  careerBossKillsDelta: number;
}

export function getMaxUnlockedBossPracticeChapter(highestChapterCleared: number): number {
  const safeCleared = Math.max(0, Math.floor(Number.isFinite(highestChapterCleared) ? highestChapterCleared : 0));
  return Math.max(1, Math.min(CHAPTERS.length, safeCleared + 1));
}

export function getBossPracticeCatalog(
  highestChapterCleared: number
): BossPracticeCatalogEntry[] {
  const maxUnlocked = getMaxUnlockedBossPracticeChapter(highestChapterCleared);
  return CHAPTERS.map((ch) => {
    const unlocked = ch.id <= maxUnlocked;
    return {
      chapterId: ch.id,
      zodiacTitle: ch.name,
      bossName: ch.bossName,
      recommendedPower: ch.recommendedPower,
      unlocked,
      unlockRequirementLabel: unlocked
        ? 'Đã mở khóa'
        : `Vượt Chương ${ch.id - 1} để mở luyện tập`,
    };
  });
}

export function isBossPracticeChapterUnlocked(
  chapterId: number,
  highestChapterCleared: number
): boolean {
  const safeId = Math.floor(Number.isFinite(chapterId) ? chapterId : 0);
  if (safeId < 1 || safeId > CHAPTERS.length) return false;
  return safeId <= getMaxUnlockedBossPracticeChapter(highestChapterCleared);
}

/**
 * Resolves a realistic 3-phase Zodiac Boss sparring encounter tuned cleanly to the chapter
 * while staying survivable and readable for mechanical practice.
 */
export function resolveBossPracticeConfig(
  chapterId: number,
  playerPower: number
): BossPracticeEncounterConfig {
  const safeId = Math.max(1, Math.min(CHAPTERS.length, Math.floor(chapterId || 1)));
  const chapter = CHAPTERS.find((c) => c.id === safeId) ?? CHAPTERS[0];
  const powerScale = Math.max(0.85, Math.min(2.2, Math.max(500, playerPower) / Math.max(500, chapter.recommendedPower)));
  const bossHp = Math.round(
    (4200 + safeId * safeId * 1350) * Math.max(0.9, Math.min(1.65, powerScale * 0.95))
  );
  const bossDamage = Math.round(28 + safeId * 14);
  return {
    chapterId: chapter.id,
    bossName: chapter.bossName,
    zodiacTitle: chapter.name,
    bossHp,
    bossDamage,
    trimHex: chapter.trimHex,
    zeroRewardLocked: true,
  };
}

/**
 * Hard security invariant: Boss Practice mode NEVER yields Gold, Gems, Shards, XP, Loot,
 * Quest credit, or Career Boss Kill progress.
 */
export function enforceZeroBossPracticeRewards(
  _proposed: Partial<BossPracticeRewardEnvelope>
): BossPracticeRewardEnvelope {
  return {
    gold: 0,
    gems: 0,
    forgeShards: 0,
    xp: 0,
    lootDroppedCount: 0,
    questProgressDelta: 0,
    careerBossKillsDelta: 0,
  };
}

export function createBossPracticeHudState(params: {
  chapterId: number;
  bossName: string;
  zodiacTitle: string;
  bossPhase: 1 | 2 | 3;
  defeated: boolean;
  elapsedSec: number;
  interruptCount: number;
  perfectDodgeCount: number;
}): BossPracticeHudState {
  return {
    active: true,
    chapterId: params.chapterId,
    bossName: params.bossName,
    zodiacTitle: params.zodiacTitle,
    bossPhase: params.bossPhase,
    defeated: params.defeated,
    elapsedSec: Number(Math.max(0, params.elapsedSec).toFixed(1)),
    interruptCount: Math.max(0, Math.floor(params.interruptCount)),
    perfectDodgeCount: Math.max(0, Math.floor(params.perfectDodgeCount)),
    zeroRewardLocked: true,
  };
}

import type {
  AiDuelDifficultyTier,
  AiLivePlayerPersonality,
  ArenaOpponent,
  ComputedPlayerStats,
  DefeatCauseInfo,
} from '../types/game';

/**
 * ============================================================================
 * WAVE 8 — LETHAL ADAPTIVE AI & 5-PILLAR COMBAT DEPTH ENGINE
 * ============================================================================
 * Pure, deterministic 60Hz systems covering:
 * - Pillar 1 & 2: Readable lethal AI telegraphs, Sniper Lock-On, Phase-2 Enrage,
 *   Sudden Death Overdrive, and Perfect-Dodge Clash rewards.
 * - Pillar 3: Fair Defeat Breakdown, actionable counter-tips, consolation rewards,
 *   and transparent AI difficulty bonus multipliers.
 * - Pillar 4: Verified AI Intensity Tiers & Adaptive Win-Streak Escalation.
 * - Pillar 5: Lethal 60Hz Real-Time AI Rival Brain with active dash i-frames,
 *   velocity-lead aiming, 5 distinct attack patterns, and AI Ultimate bar (0-100%).
 */

export interface AiDifficultyTierConfig {
  id: AiDuelDifficultyTier;
  label: string;
  shortLabel: string;
  tagline: string;
  /** Fraction of player's Max HP dealt by a standard AI Rival attack before DR */
  baseHitMaxHpPct: number;
  /** Multiplier applied to AI Rival Max HP relative to player's Max HP */
  hpScaleToPlayer: number;
  /** AI Rival PvP resilience (reduces player raw burst so AI can't be 2-shotted) */
  pvpResilience: number;
  /** Cap on player's effective Damage Reduction in 1v1 Arena */
  playerArenaDrCap: number;
  /** Multiplier on AI attack cooldown (< 1 = attacks faster) */
  attackCooldownMult: number;
  /** Multiplier on AI telegraph windup (< 1 = tighter dodge reaction window) */
  telegraphMult: number;
  /** Projectile velocity multiplier */
  projectileSpeedMult: number;
  /** AI movement speed multiplier */
  moveSpeedMult: number;
  /** Lead-aim prediction accuracy (0..1) */
  leadAccuracy: number;
  /** Cooldown (sec) between AI tactical dash i-frame dodges */
  dashCooldownSec: number;
  /** Duration (sec) of AI dash invulnerability frames */
  dashIFrameSec: number;
  /** AI Ultimate charge gained per second + per attack */
  ultChargeRateMult: number;
  /** Opening Aegis shield as fraction of AI Max HP */
  openingShieldPct: number;
  /** Bonus reward percentage (+0%, +25%, +55%, +90%) */
  rewardBonusPct: number;
  /** Bonus Arena Elo rating on win */
  ratingBonus: number;
  /** PvE / Boss global AI pressure multiplier when Challenge Mode is active */
  pveDamageMult: number;
  pveCooldownMult: number;
  pveProjectileSpeedMult: number;
  accentClass: string;
}

export const AI_DIFFICULTY_TIER_ORDER: AiDuelDifficultyTier[] = [
  'challenger',
  'master',
  'sovereign',
  'mythic',
];

export const AI_DIFFICULTY_TIERS: Record<AiDuelDifficultyTier, AiDifficultyTierConfig> = {
  challenger: {
    id: 'challenger',
    label: 'Thách Đấu',
    shortLabel: 'Thách Đấu',
    tagline: 'AI di chuyển thông minh, có né đạn & Tuyệt Kỹ cân bằng.',
    baseHitMaxHpPct: 0.14,
    hpScaleToPlayer: 1.55,
    pvpResilience: 0.28,
    playerArenaDrCap: 0.35,
    attackCooldownMult: 0.92,
    telegraphMult: 0.95,
    projectileSpeedMult: 1.15,
    moveSpeedMult: 1.08,
    leadAccuracy: 0.55,
    dashCooldownSec: 4.2,
    dashIFrameSec: 0.28,
    ultChargeRateMult: 1.0,
    openingShieldPct: 0,
    rewardBonusPct: 0,
    ratingBonus: 0,
    pveDamageMult: 1.08,
    pveCooldownMult: 0.94,
    pveProjectileSpeedMult: 1.06,
    accentClass: 'text-sky-300',
  },
  master: {
    id: 'master',
    label: 'Cao Thủ',
    shortLabel: 'Cao Thủ',
    tagline: 'Mặc định · AI đoán hướng, Bắn Tỉa Đỏ & trừng phạt đứng yên.',
    baseHitMaxHpPct: 0.19,
    hpScaleToPlayer: 1.95,
    pvpResilience: 0.42,
    playerArenaDrCap: 0.3,
    attackCooldownMult: 0.72,
    telegraphMult: 0.82,
    projectileSpeedMult: 1.32,
    moveSpeedMult: 1.18,
    leadAccuracy: 0.8,
    dashCooldownSec: 3.1,
    dashIFrameSec: 0.34,
    ultChargeRateMult: 1.25,
    openingShieldPct: 0.12,
    rewardBonusPct: 25,
    ratingBonus: 6,
    pveDamageMult: 1.28,
    pveCooldownMult: 0.84,
    pveProjectileSpeedMult: 1.16,
    accentClass: 'text-amber-300',
  },
  sovereign: {
    id: 'sovereign',
    label: 'Đế Vương',
    shortLabel: 'Đế Vương',
    tagline: 'AI phản xạ cao, Lướt Vô Địch né tên, Hộ Thuẫn & Cuồng Nộ Phase 2.',
    baseHitMaxHpPct: 0.24,
    hpScaleToPlayer: 2.35,
    pvpResilience: 0.52,
    playerArenaDrCap: 0.25,
    attackCooldownMult: 0.58,
    telegraphMult: 0.72,
    projectileSpeedMult: 1.46,
    moveSpeedMult: 1.28,
    leadAccuracy: 0.92,
    dashCooldownSec: 2.35,
    dashIFrameSec: 0.38,
    ultChargeRateMult: 1.5,
    openingShieldPct: 0.22,
    rewardBonusPct: 55,
    ratingBonus: 14,
    pveDamageMult: 1.52,
    pveCooldownMult: 0.75,
    pveProjectileSpeedMult: 1.26,
    accentClass: 'text-rose-300',
  },
  mythic: {
    id: 'mythic',
    label: 'Thần Thoại',
    shortLabel: 'Thần Thoại',
    tagline: 'Cực hạn · AI đọc vị liên hoàn, Tuyệt Kỹ dày đặc — sai 1 nhịp là gục!',
    baseHitMaxHpPct: 0.3,
    hpScaleToPlayer: 2.75,
    pvpResilience: 0.6,
    playerArenaDrCap: 0.2,
    attackCooldownMult: 0.46,
    telegraphMult: 0.64,
    projectileSpeedMult: 1.6,
    moveSpeedMult: 1.38,
    leadAccuracy: 1.0,
    dashCooldownSec: 1.75,
    dashIFrameSec: 0.42,
    ultChargeRateMult: 1.85,
    openingShieldPct: 0.3,
    rewardBonusPct: 90,
    ratingBonus: 24,
    pveDamageMult: 1.78,
    pveCooldownMult: 0.68,
    pveProjectileSpeedMult: 1.35,
    accentClass: 'text-fuchsia-300',
  },
};

export function normalizeAiDuelDifficultyTier(value: unknown): AiDuelDifficultyTier {
  if (
    value === 'challenger' ||
    value === 'master' ||
    value === 'sovereign' ||
    value === 'mythic'
  ) {
    return value;
  }
  return 'master';
}

export function getAiDifficultyTierConfig(tier: AiDuelDifficultyTier): AiDifficultyTierConfig {
  return AI_DIFFICULTY_TIERS[tier] ?? AI_DIFFICULTY_TIERS.master;
}

// ============================================================================
// ADAPTIVE WIN-STREAK ESCALATION
// ============================================================================

export interface AdaptiveAiEscalation {
  winStreak: number;
  threatLevel: number; // 0..5
  threatLabel: string;
  attackBonusMult: number;
  speedBonusMult: number;
  cooldownScale: number;
}

export function computeAdaptiveAiEscalation(winStreak: number): AdaptiveAiEscalation {
  const clamped = Math.max(0, Math.min(10, Math.floor(winStreak)));
  const threatLevel = Math.min(5, Math.floor(clamped / 2));
  const labels = [
    'Ổn Định',
    'AI Đang Thích Nghi',
    'AI Phân Tích Lối Đánh',
    'AI Báo Động Đỏ',
    'AI Truy Sát Cực Độ',
    'AI Thần Cấp Áp Đảo',
  ];
  return {
    winStreak: clamped,
    threatLevel,
    threatLabel: labels[threatLevel] ?? labels[0],
    attackBonusMult: Number((1 + threatLevel * 0.08).toFixed(2)),
    speedBonusMult: Number((1 + threatLevel * 0.04).toFixed(2)),
    cooldownScale: Number(Math.max(0.76, 1 - threatLevel * 0.045).toFixed(3)),
  };
}

// ============================================================================
// ARENA FAIR LETHALITY & SUDDEN DEATH OVERDRIVE
// ============================================================================

export interface LethalArenaMatchConfig {
  tier: AiDuelDifficultyTier;
  tierLabel: string;
  rivalMaxHp: number;
  rivalAttack: number;
  rivalShieldHp: number;
  rivalSpeedMult: number;
  rivalPvpResilience: number;
  playerArenaDrCap: number;
  disableFreeRevives: boolean;
  disableCompanionsInDuel: boolean;
  startingPlayerUltCharge: number;
  startingRivalUltCharge: number;
  rewardBonusPct: number;
  ratingBonus: number;
  escalation: AdaptiveAiEscalation;
}

export function computeLethalArenaMatchConfig(params: {
  playerStats: ComputedPlayerStats;
  opponent: ArenaOpponent;
  tier: AiDuelDifficultyTier;
  playerWinStreak?: number;
  equalized?: boolean;
}): LethalArenaMatchConfig {
  const cfg = getAiDifficultyTierConfig(params.tier);
  const escalation = computeAdaptiveAiEscalation(params.playerWinStreak ?? 0);
  const playerHp = Math.max(600, params.playerStats.maxHp);
  const playerAtk = Math.max(50, params.playerStats.attack);

  // Power ratio nudges non-equalized fights, while equalized uses strict 1.0 parity
  const powerRatio = params.equalized
    ? 1.0
    : Math.max(
        0.88,
        Math.min(1.42, params.opponent.powerRating / Math.max(1200, params.playerStats.powerRating))
      );

  // Scale rival damage directly off player's Max HP so every hit is genuinely lethal
  // (14%..30%+ of player Max HP per hit before DR cap), never tickling for 1-2% HP!
  const hpBasedAttack = playerHp * cfg.baseHitMaxHpPct * escalation.attackBonusMult * powerRatio;
  const atkFloor = playerAtk * 0.95;
  const rivalAttack = Math.max(48, Math.round(Math.max(hpBasedAttack, atkFloor)));

  // Scale rival HP so duels last a real tactical 15-35s rather than ending in a 4s burst
  const rivalMaxHp = Math.max(
    1800,
    Math.round(playerHp * cfg.hpScaleToPlayer * (0.9 + powerRatio * 0.18))
  );
  const rivalShieldHp = Math.round(rivalMaxHp * cfg.openingShieldPct);

  return {
    tier: cfg.id,
    tierLabel: cfg.label,
    rivalMaxHp,
    rivalAttack,
    rivalShieldHp,
    rivalSpeedMult: Number(
      (Math.max(1.0, params.opponent.speedMult) * cfg.moveSpeedMult * escalation.speedBonusMult).toFixed(3)
    ),
    rivalPvpResilience: cfg.pvpResilience,
    playerArenaDrCap: cfg.playerArenaDrCap,
    disableFreeRevives: true,
    disableCompanionsInDuel: true,
    startingPlayerUltCharge: 35,
    startingRivalUltCharge: params.tier === 'mythic' ? 35 : params.tier === 'sovereign' ? 20 : 10,
    rewardBonusPct: cfg.rewardBonusPct,
    ratingBonus: cfg.ratingBonus,
    escalation,
  };
}

export interface ArenaSuddenDeathState {
  active: boolean;
  elapsedSec: number;
  damageMult: number;
  healReductionPct: number;
  label: string | null;
}

/**
 * Sudden Death / Overdrive activates after 22s in a 45s 1v1 Arena Duel (timeLeft <= 23s).
 * Escalates damage smoothly up to 2.25x so neither fighter can stall forever.
 */
export function computeArenaSuddenDeath(arenaTimeLeft: number, totalDurationSec = 45): ArenaSuddenDeathState {
  const elapsed = Math.max(0, totalDurationSec - Math.max(0, arenaTimeLeft));
  const thresholdSec = 22;
  if (elapsed < thresholdSec) {
    return {
      active: false,
      elapsedSec: elapsed,
      damageMult: 1.0,
      healReductionPct: 0,
      label: null,
    };
  }
  const overSec = elapsed - thresholdSec;
  const damageMult = Number(Math.min(2.25, 1.2 + overSec * 0.055).toFixed(2));
  const healReductionPct = Math.min(75, Math.round(35 + overSec * 2));
  return {
    active: true,
    elapsedSec: elapsed,
    damageMult,
    healReductionPct,
    label: `QUÁ TẢI x${damageMult.toFixed(2)}`,
  };
}

// ============================================================================
// 60HZ LETHAL AI RIVAL COMBAT BRAIN (STATE MACHINE)
// ============================================================================

export type AiRivalAttackPattern =
  | 'rapid_burst'
  | 'crimson_snipe'
  | 'flank_fan'
  | 'hazard_zone'
  | 'ai_ultimate';

export interface AiRivalCombatState {
  tier: AiDuelDifficultyTier;
  personality: AiLivePlayerPersonality;
  ultCharge: number; // 0..100
  ultCastCount: number;
  dashCooldown: number; // sec until next tactical dash
  dashTimer: number; // active dash movement burst sec
  dashIFrameTimer: number; // >0 => AI dodges incoming player arrows!
  dashDirX: number;
  dashDirZ: number;
  phase2Triggered: boolean;
  enraged: boolean;
  playerStationarySec: number;
  patternIndex: number;
  activeIntentLabel: string | null;
  intentBannerTimer: number;
  lastPatternUsed: AiRivalAttackPattern | null;
  aiDodgesPerformed: number;
  shieldHp: number;
  shieldMaxHp: number;
}

export function createAiRivalCombatState(
  tier: AiDuelDifficultyTier,
  personality: AiLivePlayerPersonality,
  startingUlt = 15,
  shieldHp = 0
): AiRivalCombatState {
  return {
    tier,
    personality,
    ultCharge: Math.max(0, Math.min(100, startingUlt)),
    ultCastCount: 0,
    dashCooldown: 1.1,
    dashTimer: 0,
    dashIFrameTimer: 0,
    dashDirX: 1,
    dashDirZ: 0,
    phase2Triggered: false,
    enraged: false,
    playerStationarySec: 0,
    patternIndex: 0,
    activeIntentLabel: null,
    intentBannerTimer: 0,
    lastPatternUsed: null,
    aiDodgesPerformed: 0,
    shieldHp: Math.max(0, Math.round(shieldHp)),
    shieldMaxHp: Math.max(0, Math.round(shieldHp)),
  };
}

export interface IncomingPlayerProjectile {
  x: number;
  z: number;
  vx: number;
  vz: number;
  radius: number;
}

export interface AiRivalBrainInput {
  dt: number;
  simTimeSec: number;
  rivalX: number;
  rivalZ: number;
  rivalHpRatio: number;
  playerX: number;
  playerZ: number;
  playerVx: number;
  playerVz: number;
  arenaHalfW: number;
  arenaHalfD: number;
  incomingArrows: IncomingPlayerProjectile[];
  attackReady: boolean;
  isTelegraphing: boolean;
  escalation?: AdaptiveAiEscalation;
}

export interface AiRivalPatternPlan {
  pattern: AiRivalAttackPattern;
  telegraphType: 'shot' | 'lane' | 'slam' | 'spiral';
  telegraphDuration: number;
  nextCooldown: number;
  aimDirX: number;
  aimDirZ: number;
  targetX: number;
  targetZ: number;
  projectileSpeed: number;
  damageMult: number;
  intentLabel: string;
}

export interface AiRivalBrainStepOutput {
  moveX: number;
  moveZ: number;
  speedMult: number;
  triggeredDash: boolean;
  isInvulnerable: boolean;
  triggeredPhase2Enrage: boolean;
  patternPlan: AiRivalPatternPlan | null;
  ultChargePct: number;
  activeIntentLabel: string | null;
}

/**
 * Computes predicted player position using velocity-lead targeting scaled by AI tier accuracy.
 */
export function computeLeadAimTarget(
  rivalX: number,
  rivalZ: number,
  playerX: number,
  playerZ: number,
  playerVx: number,
  playerVz: number,
  projectileSpeed: number,
  leadAccuracy: number,
  arenaHalfW: number,
  arenaHalfD: number
): { x: number; z: number; dirX: number; dirZ: number } {
  const dx = playerX - rivalX;
  const dz = playerZ - rivalZ;
  const dist = Math.hypot(dx, dz) || 1;
  const travelTime = Math.min(0.85, dist / Math.max(8, projectileSpeed));
  const rawX = playerX + playerVx * travelTime * leadAccuracy;
  const rawZ = playerZ + playerVz * travelTime * leadAccuracy;
  const x = Math.max(-arenaHalfW + 0.8, Math.min(arenaHalfW - 0.8, rawX));
  const z = Math.max(-arenaHalfD + 0.8, Math.min(arenaHalfD - 0.8, rawZ));
  const ldx = x - rivalX;
  const ldz = z - rivalZ;
  const len = Math.hypot(ldx, ldz) || 1;
  return { x, z, dirX: ldx / len, dirZ: ldz / len };
}

/**
 * Deterministic 60Hz AI Rival step.
 * Mutates `state` in place (zero per-frame object allocations on idle frames).
 */
export function stepAiRivalCombatBrain(
  state: AiRivalCombatState,
  input: AiRivalBrainInput
): AiRivalBrainStepOutput {
  const dt = Math.max(0.001, Math.min(0.05, input.dt));
  const cfg = getAiDifficultyTierConfig(state.tier);
  const esc = input.escalation ?? computeAdaptiveAiEscalation(0);

  // Track timers
  if (state.dashCooldown > 0) state.dashCooldown = Math.max(0, state.dashCooldown - dt);
  if (state.dashTimer > 0) state.dashTimer = Math.max(0, state.dashTimer - dt);
  if (state.dashIFrameTimer > 0) state.dashIFrameTimer = Math.max(0, state.dashIFrameTimer - dt);
  if (state.intentBannerTimer > 0) {
    state.intentBannerTimer = Math.max(0, state.intentBannerTimer - dt);
    if (state.intentBannerTimer <= 0 && !input.isTelegraphing) {
      state.activeIntentLabel = null;
    }
  }

  // Track if player is camping/stationary (punish with Crimson Snipe!)
  const playerSpeed = Math.hypot(input.playerVx, input.playerVz);
  if (playerSpeed < 0.45) {
    state.playerStationarySec = Math.min(5, state.playerStationarySec + dt);
  } else {
    state.playerStationarySec = Math.max(0, state.playerStationarySec - dt * 1.8);
  }

  // Passive Ultimate charge buildup (faster when enraged)
  const passiveUltRate = (state.enraged ? 11.5 : 8.0) * cfg.ultChargeRateMult;
  state.ultCharge = Math.min(100, state.ultCharge + passiveUltRate * dt);

  // Phase-2 Enrage trigger at <= 50% HP
  let triggeredPhase2Enrage = false;
  if (!state.phase2Triggered && input.rivalHpRatio <= 0.5 && input.rivalHpRatio > 0) {
    state.phase2Triggered = true;
    state.enraged = true;
    state.ultCharge = Math.min(100, state.ultCharge + 35);
    state.dashCooldown = 0;
    state.activeIntentLabel = 'CUỒNG NỘ PHASE 2 · TỐC ĐỘ CỰC ĐẠI!';
    state.intentBannerTimer = 2.4;
    triggeredPhase2Enrage = true;
  }

  // Detect urgent incoming player arrows for active Dash I-Frames
  let triggeredDash = false;
  let evadeX = 0;
  let evadeZ = 0;
  let urgentArrowFound = false;

  for (let i = 0; i < input.incomingArrows.length; i++) {
    const a = input.incomingArrows[i];
    const bSpd = Math.hypot(a.vx, a.vz);
    if (bSpd < 1.0) continue;
    const relX = input.rivalX - a.x;
    const relZ = input.rivalZ - a.z;
    const along = (relX * a.vx + relZ * a.vz) / bSpd;
    if (along < -0.2 || along > 8.5) continue;
    const tImpact = along / bSpd;
    if (tImpact > 0.42) continue;
    const bDirX = a.vx / bSpd;
    const bDirZ = a.vz / bSpd;
    const closestX = a.x + bDirX * along;
    const closestZ = a.z + bDirZ * along;
    const perpX = input.rivalX - closestX;
    const perpZ = input.rivalZ - closestZ;
    const perpDist = Math.hypot(perpX, perpZ);
    const dangerRadius = a.radius + 1.05;
    if (perpDist < dangerRadius) {
      urgentArrowFound = true;
      let sideX: number;
      let sideZ: number;
      if (perpDist > 0.08) {
        sideX = perpX / perpDist;
        sideZ = perpZ / perpDist;
      } else {
        const sign = Math.sin(input.simTimeSec * 4.3) >= 0 ? 1 : -1;
        sideX = -bDirZ * sign;
        sideZ = bDirX * sign;
      }
      // Bias away from arena edge so AI doesn't dash into a corner
      if (input.rivalX + sideX * 2.5 > input.arenaHalfW - 1.2 || input.rivalX + sideX * 2.5 < -input.arenaHalfW + 1.2) {
        sideX = -sideX;
      }
      if (input.rivalZ + sideZ * 2.5 > input.arenaHalfD - 1.2 || input.rivalZ + sideZ * 2.5 < -input.arenaHalfD + 1.2) {
        sideZ = -sideZ;
      }
      evadeX += sideX;
      evadeZ += sideZ;
      if (state.dashCooldown <= 0 && tImpact < 0.28 && !input.isTelegraphing) {
        const norm = Math.hypot(sideX, sideZ) || 1;
        state.dashDirX = sideX / norm;
        state.dashDirZ = sideZ / norm;
        state.dashTimer = 0.24;
        state.dashIFrameTimer = cfg.dashIFrameSec;
        state.dashCooldown = Math.max(1.2, cfg.dashCooldownSec * (state.enraged ? 0.78 : 1.0));
        state.aiDodgesPerformed += 1;
        triggeredDash = true;
        break;
      }
    }
  }

  // Movement vector (stays agile even between attacks!)
  const dx = input.playerX - input.rivalX;
  const dz = input.playerZ - input.rivalZ;
  const dist = Math.hypot(dx, dz) || 1;
  const toPlayerX = dx / dist;
  const toPlayerZ = dz / dist;

  let moveX = 0;
  let moveZ = 0;
  let speedMult = state.enraged ? 1.18 : 1.0;

  if (state.dashTimer > 0) {
    moveX = state.dashDirX;
    moveZ = state.dashDirZ;
    speedMult = 2.45;
  } else {
    const preferredRange =
      state.personality === 'assassin' ? 4.4 : state.personality === 'aggressive' ? 6.2 : 7.6;
    const strafeSign = Math.sin(input.simTimeSec * (state.enraged ? 1.55 : 0.95)) >= 0 ? 1 : -1;
    const strafeX = -toPlayerZ * strafeSign;
    const strafeZ = toPlayerX * strafeSign;

    let radial = 0;
    if (dist > preferredRange + 1.3) radial = 0.85;
    else if (dist < preferredRange - 1.5) radial = -0.78;
    else radial = 0.15;

    moveX = toPlayerX * radial + strafeX * 0.92;
    moveZ = toPlayerZ * radial + strafeZ * 0.92;

    if (urgentArrowFound) {
      const eLen = Math.hypot(evadeX, evadeZ) || 1;
      moveX = moveX * 0.25 + (evadeX / eLen) * 1.15;
      moveZ = moveZ * 0.25 + (evadeZ / eLen) * 1.15;
      speedMult *= 1.22;
    }

    // Wall avoidance
    if (input.rivalX > input.arenaHalfW - 2.0) moveX -= 0.9;
    if (input.rivalX < -input.arenaHalfW + 2.0) moveX += 0.9;
    if (input.rivalZ > input.arenaHalfD - 2.0) moveZ -= 0.9;
    if (input.rivalZ < -input.arenaHalfD + 2.0) moveZ += 0.9;

    const mLen = Math.hypot(moveX, moveZ);
    if (mLen > 0.001) {
      moveX /= mLen;
      moveZ /= mLen;
    }
    if (input.isTelegraphing) {
      // AI still strafes slowly while aiming instead of freezing completely like a dummy!
      speedMult *= 0.42;
    }
  }

  // Pattern selection when ready to attack
  let patternPlan: AiRivalPatternPlan | null = null;
  if (input.attackReady && !input.isTelegraphing) {
    const cdFactor = cfg.attackCooldownMult * esc.cooldownScale * (state.enraged ? 0.82 : 1.0);
    const tgFactor = cfg.telegraphMult * (state.enraged ? 0.9 : 1.0);

    let chosen: AiRivalAttackPattern;
    if (state.ultCharge >= 100) {
      chosen = 'ai_ultimate';
      state.ultCharge = 0;
      state.ultCastCount += 1;
    } else if (state.playerStationarySec >= 0.7 && state.lastPatternUsed !== 'crimson_snipe') {
      // Punish standing still / facetanking with high-velocity Crimson Snipe!
      chosen = 'crimson_snipe';
    } else {
      const cycle: AiRivalAttackPattern[] =
        state.personality === 'assassin'
          ? ['flank_fan', 'crimson_snipe', 'rapid_burst', 'hazard_zone']
          : state.personality === 'aggressive'
          ? ['rapid_burst', 'flank_fan', 'crimson_snipe', 'hazard_zone']
          : ['crimson_snipe', 'hazard_zone', 'flank_fan', 'rapid_burst'];
      chosen = cycle[state.patternIndex % cycle.length];
      state.patternIndex += 1;
    }

    state.lastPatternUsed = chosen;
    if (chosen !== 'ai_ultimate') {
      state.ultCharge = Math.min(100, state.ultCharge + 14 * cfg.ultChargeRateMult);
    }

    const baseProjSpeed =
      chosen === 'crimson_snipe'
        ? 19.5
        : chosen === 'ai_ultimate'
        ? 14.5
        : chosen === 'flank_fan'
        ? 13.8
        : 14.8;
    const projectileSpeed = Number((baseProjSpeed * cfg.projectileSpeedMult).toFixed(2));
    const lead = computeLeadAimTarget(
      input.rivalX,
      input.rivalZ,
      input.playerX,
      input.playerZ,
      input.playerVx,
      input.playerVz,
      projectileSpeed,
      cfg.leadAccuracy,
      input.arenaHalfW,
      input.arenaHalfD
    );

    if (chosen === 'ai_ultimate') {
      patternPlan = {
        pattern: 'ai_ultimate',
        telegraphType: 'spiral',
        telegraphDuration: Number(Math.max(0.45, 0.72 * tgFactor).toFixed(2)),
        nextCooldown: Number(Math.max(0.65, 1.05 * cdFactor).toFixed(2)),
        aimDirX: lead.dirX,
        aimDirZ: lead.dirZ,
        targetX: lead.x,
        targetZ: lead.z,
        projectileSpeed,
        damageMult: 1.55,
        intentLabel: '⚡ AI TUYỆT KỸ · BÃO TINH TÚ!',
      };
    } else if (chosen === 'crimson_snipe') {
      patternPlan = {
        pattern: 'crimson_snipe',
        telegraphType: 'shot',
        telegraphDuration: Number(Math.max(0.32, 0.52 * tgFactor).toFixed(2)),
        nextCooldown: Number(Math.max(0.5, 0.92 * cdFactor).toFixed(2)),
        aimDirX: lead.dirX,
        aimDirZ: lead.dirZ,
        targetX: lead.x,
        targetZ: lead.z,
        projectileSpeed,
        damageMult: 1.38,
        intentLabel: '🎯 BẮN TỈA ĐỎ · LƯỚT NGANG!',
      };
    } else if (chosen === 'flank_fan') {
      // Trigger an aggressive flank sidestep right before the fan shot
      if (state.dashCooldown <= 0.4) {
        const flankSign = state.patternIndex % 2 === 0 ? 1 : -1;
        state.dashDirX = -toPlayerZ * flankSign;
        state.dashDirZ = toPlayerX * flankSign;
        state.dashTimer = 0.2;
        state.dashIFrameTimer = Math.max(state.dashIFrameTimer, 0.22);
        triggeredDash = true;
      }
      patternPlan = {
        pattern: 'flank_fan',
        telegraphType: 'lane',
        telegraphDuration: Number(Math.max(0.34, 0.5 * tgFactor).toFixed(2)),
        nextCooldown: Number(Math.max(0.52, 0.95 * cdFactor).toFixed(2)),
        aimDirX: lead.dirX,
        aimDirZ: lead.dirZ,
        targetX: lead.x,
        targetZ: lead.z,
        projectileSpeed,
        damageMult: 1.12,
        intentLabel: '⚔ LƯỚT ÁP SÁT · LOẠT QUẠT!',
      };
    } else if (chosen === 'hazard_zone') {
      patternPlan = {
        pattern: 'hazard_zone',
        telegraphType: 'slam',
        telegraphDuration: Number(Math.max(0.45, 0.72 * tgFactor).toFixed(2)),
        nextCooldown: Number(Math.max(0.55, 0.98 * cdFactor).toFixed(2)),
        aimDirX: lead.dirX,
        aimDirZ: lead.dirZ,
        targetX: lead.x,
        targetZ: lead.z,
        projectileSpeed,
        damageMult: 1.32,
        intentLabel: '🔥 THIÊN THẠCH PHONG TỎA!',
      };
    } else {
      patternPlan = {
        pattern: 'rapid_burst',
        telegraphType: 'shot',
        telegraphDuration: Number(Math.max(0.24, 0.36 * tgFactor).toFixed(2)),
        nextCooldown: Number(Math.max(0.45, 0.78 * cdFactor).toFixed(2)),
        aimDirX: lead.dirX,
        aimDirZ: lead.dirZ,
        targetX: lead.x,
        targetZ: lead.z,
        projectileSpeed,
        damageMult: 0.92,
        intentLabel: '🏹 LIÊN TIỄN ĐOÁN HƯỚNG!',
      };
    }

    state.activeIntentLabel = patternPlan.intentLabel;
    state.intentBannerTimer = Math.max(1.1, patternPlan.telegraphDuration + 0.55);
  }

  return {
    moveX,
    moveZ,
    speedMult,
    triggeredDash,
    isInvulnerable: state.dashIFrameTimer > 0,
    triggeredPhase2Enrage,
    patternPlan,
    ultChargePct: Math.round(state.ultCharge),
    activeIntentLabel: state.activeIntentLabel,
  };
}

// ============================================================================
// PILLAR 3: FAIR DEFEAT BREAKDOWN & CONSOLATION PROGRESSION
// ============================================================================

export interface LethalDefeatSummary {
  cause: DefeatCauseInfo;
  rivalRemainingHpPct: number;
  tierLabel: string;
  consolationGold: number;
  consolationStarDust: number;
  consolationMasteryExp: number;
  coachingNote: string;
}

export function buildLethalDefeatReport(params: {
  rivalName: string;
  rivalRemainingHpPct: number;
  tier: AiDuelDifficultyTier;
  lastPattern?: AiRivalAttackPattern | null;
  suddenDeathActive?: boolean;
  perfectDodges?: number;
  durationSec?: number;
}): LethalDefeatSummary {
  const cfg = getAiDifficultyTierConfig(params.tier);
  const remPct = Math.max(0, Math.min(100, Math.round(params.rivalRemainingHpPct)));
  const duration = Math.max(1, Math.round(params.durationSec ?? 15));

  let cause: DefeatCauseInfo;
  if (params.lastPattern === 'ai_ultimate') {
    cause = {
      code: 'boss_projectile',
      label: `Trúng Tuyệt Kỹ Bão Tinh Tú của ${params.rivalName}`,
      tip: 'Theo dõi thanh Tuyệt Kỹ AI ở đầu màn hình: khi chạm 100%, giữ sẵn phím Lướt (Space) để kích hoạt Né Hoàn Hảo phản đòn!',
      killerName: `${params.rivalName} (${cfg.label})`,
    };
  } else if (params.lastPattern === 'crimson_snipe') {
    cause = {
      code: 'boss_lane',
      label: `Bị Bắn Tỉa Đỏ đoán hướng kết liễu`,
      tip: 'AI sẽ bắn tỉa cực nhanh nếu bạn đứng yên quá lâu. Đổi hướng di chuyển ngang ngay khi tia laser đỏ lóe sáng!',
      killerName: `${params.rivalName} (${cfg.label})`,
    };
  } else if (params.lastPattern === 'hazard_zone') {
    cause = {
      code: 'boss_slam',
      label: `Trúng Thiên Thạch Phong Tỏa của ${params.rivalName}`,
      tip: 'AI đặt vòng nổ chặn trước hướng chạy của bạn — hãy bẻ ngoặt ngược lại hoặc Lướt xuyên qua mép vòng.',
      killerName: `${params.rivalName} (${cfg.label})`,
    };
  } else if (params.suddenDeathActive) {
    cause = {
      code: 'unknown',
      label: `Bị áp đảo trong giai đoạn Quá Tải Đấu Trường`,
      tip: 'Từ giây thứ 22 sát thương tăng vọt và giảm hồi máu. Hãy chủ động xả Tuyệt Kỹ sớm trước khi AI vào Phase 2!',
      killerName: `${params.rivalName} (${cfg.label})`,
    };
  } else {
    cause = {
      code: 'boss_projectile',
      label: `Bị chuỗi Liên Tiễn & Áp Sát của ${params.rivalName} hạ gục`,
      tip: 'Tận dụng cột đá che góc bắn, giữ nhịp vừa di chuyển vừa bắn và canh Lướt để phá thế áp đảo của AI.',
      killerName: `${params.rivalName} (${cfg.label})`,
    };
  }

  const effortScore = Math.max(0.25, Math.min(1, (100 - remPct) / 100 + duration / 60));
  const tierScale = 1 + cfg.rewardBonusPct / 100;
  const consolationGold = Math.round(75 * effortScore * tierScale);
  const consolationStarDust = Math.max(2, Math.round(4 * effortScore * tierScale));
  const consolationMasteryExp = Math.round(28 * effortScore * tierScale);

  const coachingNote =
    remPct <= 18
      ? `Suýt thắng! AI chỉ còn ${remPct}% HP — chỉ cần thêm 1 cú Né Hoàn Hảo (Space) là lật kèo.`
      : (params.perfectDodges ?? 0) === 0
      ? `Bạn chưa kích hoạt Né Hoàn Hảo nào. Lướt đúng nhịp tia đỏ sẽ làm chậm thời gian và +100% chí mạng phát bắn kế!`
      : `AI ${cfg.label} vẫn còn ${remPct}% HP. Hãy đổi chiến thuật di chuyển zic-zac hoặc dùng Cân Bằng Chỉ Số để luyện phản xạ.`;

  return {
    cause,
    rivalRemainingHpPct: remPct,
    tierLabel: cfg.label,
    consolationGold,
    consolationStarDust,
    consolationMasteryExp,
    coachingNote,
  };
}

// ============================================================================
// PVE / BOSS AI INTENSITY PROFILE (WHEN CHALLENGE MODE IS ENABLED)
// ============================================================================

export interface PvEIntensityProfile {
  enabled: boolean;
  tier: AiDuelDifficultyTier;
  tierLabel: string;
  enemyDamageMult: number;
  enemyCooldownMult: number;
  enemyProjectileSpeedMult: number;
  rewardBonusPct: number;
}

export function computePvEIntensityProfile(
  tier: AiDuelDifficultyTier,
  enabled: boolean
): PvEIntensityProfile {
  const cfg = getAiDifficultyTierConfig(tier);
  if (!enabled) {
    return {
      enabled: false,
      tier: 'challenger',
      tierLabel: 'Tiêu Chuẩn',
      enemyDamageMult: 1.0,
      enemyCooldownMult: 1.0,
      enemyProjectileSpeedMult: 1.0,
      rewardBonusPct: 0,
    };
  }
  return {
    enabled: true,
    tier: cfg.id,
    tierLabel: cfg.label,
    enemyDamageMult: cfg.pveDamageMult,
    enemyCooldownMult: cfg.pveCooldownMult,
    enemyProjectileSpeedMult: cfg.pveProjectileSpeedMult,
    rewardBonusPct: Math.round(cfg.rewardBonusPct * 0.6),
  };
}

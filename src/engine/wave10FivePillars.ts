import type { HeroId, PityState, Rarity } from '../types/game';

/**
 * ============================================================================
 * WAVE 10 — UNIFIED 5-PILLAR PURE SIMULATION, EQUALIZED TRIALS & ADAPTIVE AI
 * ============================================================================
 * Zero DOM / Three.js / Node dependencies so 60Hz engine, React UI, WebSocket
 * server, and Node tests share the exact same deterministic formulas.
 *
 * Pillar 1 & 2 (AAA Production & World-Class Game Feel):
 *   - Boss Breakable Parts (2-3 anatomical armor/core parts with permanent debuffs)
 *   - Elemental Resonance Burst (Multi-element chain meter -> Tam Nguyên Hợp Kích)
 *   - Dynamic 3D Skybox Shader Atmosphere Targets (chapter biome + Boss Phase)
 *
 * Pillar 3 & 4 (Fair Progression & Competitive LiveOps):
 *   - Ancient Rune Pity (10 Epic, 30 Legendary with Soft Pity @22, 35-Shard Selector)
 *   - Equalized Trial Gauntlet (3 Standardized Equal Kits + 3-Match Gauntlet)
 *
 * Pillar 5 (AI Tự Động Là Người Chơi Real-Time):
 *   - Player Combat Telemetry & Adaptive AI Learning (1v1 Counter + Co-op Primer)
 *   - Real-Time 3-Bastion Guild War State & Capture Mechanics
 */

// ============================================================================
// PILLAR 1 & 2A: BOSS BREAKABLE PARTS (PHÁ VỠ BỘ PHẬN BOSS 3D)
// ============================================================================

export type BossPartId = 'armor_horn' | 'arcane_core' | 'astral_wing';

export interface BossBreakablePart {
  id: BossPartId;
  label: string;
  debuffLabel: string;
  hp: number;
  maxHp: number;
  broken: boolean;
  atkReductionPct: number;
  barrageSlowPct: number;
  staggerSpikePct: number;
  bonusGold: number;
  bonusStarDust: number;
}

export function createBossBreakableParts(
  bossMaxHp: number,
  isMajorBoss: boolean
): BossBreakablePart[] {
  const safeHp = Math.max(120, Math.round(bossMaxHp || 120));
  const parts: BossBreakablePart[] = [
    {
      id: 'armor_horn',
      label: 'Sừng Hộ Giáp',
      debuffLabel: '-18% Công Boss',
      hp: Math.round(safeHp * 0.24),
      maxHp: Math.round(safeHp * 0.24),
      broken: false,
      atkReductionPct: 0.18,
      barrageSlowPct: 0,
      staggerSpikePct: 0.22,
      bonusGold: 95,
      bonusStarDust: 18,
    },
    {
      id: 'arcane_core',
      label: 'Lõi Ma Pháp',
      debuffLabel: '+26% Phá Giáp',
      hp: Math.round(safeHp * 0.28),
      maxHp: Math.round(safeHp * 0.28),
      broken: false,
      atkReductionPct: 0.08,
      barrageSlowPct: 0.12,
      staggerSpikePct: 0.34,
      bonusGold: 120,
      bonusStarDust: 24,
    },
  ];
  if (isMajorBoss) {
    parts.push({
      id: 'astral_wing',
      label: 'Cánh Tinh Tú',
      debuffLabel: '-24% Tốc Đạn',
      hp: Math.round(safeHp * 0.26),
      maxHp: Math.round(safeHp * 0.26),
      broken: false,
      atkReductionPct: 0,
      barrageSlowPct: 0.24,
      staggerSpikePct: 0.20,
      bonusGold: 110,
      bonusStarDust: 22,
    });
  }
  return parts;
}

export interface BossPartDamageResult {
  parts: BossBreakablePart[];
  brokenPartNow: BossBreakablePart | null;
  activeTargetPart: BossBreakablePart | null;
}

export function applyBossPartDamage(
  parts: BossBreakablePart[] | undefined,
  damage: number,
  options?: { isCrit?: boolean; isBreakerSkill?: boolean; aimAngleBias?: number }
): BossPartDamageResult {
  if (!parts || parts.length === 0 || damage <= 0) {
    return {
      parts: parts ?? [],
      brokenPartNow: null,
      activeTargetPart: null,
    };
  }
  const intact = parts.filter((p) => !p.broken);
  if (intact.length === 0) {
    return {
      parts,
      brokenPartNow: null,
      activeTargetPart: null,
    };
  }

  // Pick targetable part based on aim bias or prioritize lowest remaining ratio for snappy breaks
  const bias = options?.aimAngleBias ?? 0;
  let chosenIdx = 0;
  if (bias > 0.35 && intact.length >= 2) {
    chosenIdx = 1;
  } else if (bias < -0.35 && intact.length >= 3) {
    chosenIdx = 2;
  } else {
    // Prefer lowest HP ratio intact part so focused combat breaks parts predictably
    let bestRatio = 2;
    intact.forEach((p, i) => {
      const r = p.hp / Math.max(1, p.maxHp);
      if (r < bestRatio) {
        bestRatio = r;
        chosenIdx = i;
      }
    });
  }

  const targetId = intact[chosenIdx].id;
  const partMult = (options?.isBreakerSkill ? 1.55 : 1.0) * (options?.isCrit ? 1.25 : 1.0);
  const partDmg = Math.max(1, Math.round(damage * 0.68 * partMult));

  let brokenPartNow: BossBreakablePart | null = null;
  let activeTargetPart: BossBreakablePart | null = null;

  const updated = parts.map((p) => {
    if (p.id !== targetId || p.broken) return p;
    const nextHp = Math.max(0, p.hp - partDmg);
    const broken = nextHp <= 0;
    const nextPart: BossBreakablePart = {
      ...p,
      hp: nextHp,
      broken,
    };
    if (broken) brokenPartNow = nextPart;
    activeTargetPart = nextPart;
    return nextPart;
  });

  return {
    parts: updated,
    brokenPartNow,
    activeTargetPart,
  };
}

// ============================================================================
// PILLAR 1 & 2B: ELEMENTAL RESONANCE BURST (HỢP KÍCH NGUYÊN TỐ CỘNG HƯỞNG)
// ============================================================================

export type ResonanceElementKey = 'fire' | 'ice' | 'storm' | 'poison';

export interface ElementalResonanceState {
  stack: number; // 0..3
  maxStack: number;
  recentElements: ResonanceElementKey[];
  windowTimerSec: number;
  burstBannerTimerSec: number;
  burstBannerText: string | null;
  totalBurstsTriggered: number;
}

export function createInitialElementalResonanceState(): ElementalResonanceState {
  return {
    stack: 0,
    maxStack: 3,
    recentElements: [],
    windowTimerSec: 0,
    burstBannerTimerSec: 0,
    burstBannerText: null,
    totalBurstsTriggered: 0,
  };
}

export interface ElementalResonanceStepResult {
  nextState: ElementalResonanceState;
  burstTriggered: boolean;
  burstDamage: number;
  aoeRadius: number;
  breakShieldRatio: number;
  stylePointsBonus: number;
  calloutText: string | null;
  primaryHex: number;
}

const ELEMENT_HEX_MAP: Record<ResonanceElementKey, number> = {
  fire: 0xf97316,
  ice: 0x38bdf8,
  storm: 0xfacc15,
  poison: 0x4ade80,
};

export function mapReactionToResonanceElement(reactionKind: string): ResonanceElementKey {
  if (reactionKind === 'melt' || reactionKind === 'overload') return 'fire';
  if (reactionKind === 'superconduct') return 'storm';
  if (reactionKind === 'venom_blast') return 'poison';
  return 'ice';
}

export function advanceElementalResonance(
  state: ElementalResonanceState,
  element: ResonanceElementKey,
  baseDamage: number
): ElementalResonanceStepResult {
  const uniqueSwitchBonus =
    state.recentElements.length > 0 &&
    state.recentElements[state.recentElements.length - 1] !== element
      ? 1
      : 0;
  const nextStack = Math.min(state.maxStack, state.stack + 1 + (uniqueSwitchBonus > 0 && state.stack === 0 ? 0 : 0));
  const recentElements = [...state.recentElements, element].slice(-3);

  if (nextStack >= state.maxStack) {
    const distinctCount = new Set(recentElements).size;
    const synergyMult = distinctCount >= 3 ? 2.15 : distinctCount === 2 ? 1.85 : 1.55;
    const burstDamage = Math.max(45, Math.round(Math.max(30, baseDamage) * synergyMult));
    const title =
      distinctCount >= 3
        ? 'HỢP KÍCH TAM NGUYÊN · BÙNG NỔ!'
        : distinctCount === 2
        ? 'CỘNG HƯỞNG SONG NGUYÊN!'
        : 'XUNG KÍCH NGUYÊN TỐ!';
    return {
      nextState: {
        stack: 0,
        maxStack: state.maxStack,
        recentElements: [],
        windowTimerSec: 0,
        burstBannerTimerSec: 2.2,
        burstBannerText: `${title} (+${burstDamage.toLocaleString('vi-VN')} ST)`,
        totalBurstsTriggered: state.totalBurstsTriggered + 1,
      },
      burstTriggered: true,
      burstDamage,
      aoeRadius: 5.4,
      breakShieldRatio: distinctCount >= 3 ? 0.30 : 0.22,
      stylePointsBonus: distinctCount >= 3 ? 180 : 120,
      calloutText: title,
      primaryHex: ELEMENT_HEX_MAP[element] ?? 0x38bdf8,
    };
  }

  return {
    nextState: {
      ...state,
      stack: nextStack,
      recentElements,
      windowTimerSec: 8.5,
    },
    burstTriggered: false,
    burstDamage: 0,
    aoeRadius: 0,
    breakShieldRatio: 0,
    stylePointsBonus: 0,
    calloutText: null,
    primaryHex: ELEMENT_HEX_MAP[element] ?? 0x38bdf8,
  };
}

export function tickElementalResonanceTimers(
  state: ElementalResonanceState,
  dt: number
): ElementalResonanceState {
  let changed = false;
  let nextWindow = state.windowTimerSec;
  let nextStack = state.stack;
  let nextRecent = state.recentElements;
  if (nextWindow > 0) {
    nextWindow = Math.max(0, nextWindow - dt);
    changed = true;
    if (nextWindow <= 0 && nextStack > 0) {
      nextStack = Math.max(0, nextStack - 1);
      nextRecent = nextRecent.slice(1);
      if (nextStack > 0) nextWindow = 4.0;
    }
  }
  let nextBanner = state.burstBannerTimerSec;
  let nextText = state.burstBannerText;
  if (nextBanner > 0) {
    nextBanner = Math.max(0, nextBanner - dt);
    changed = true;
    if (nextBanner <= 0) nextText = null;
  }
  if (!changed) return state;
  return {
    ...state,
    stack: nextStack,
    recentElements: nextRecent,
    windowTimerSec: nextWindow,
    burstBannerTimerSec: nextBanner,
    burstBannerText: nextText,
  };
}

// ============================================================================
// PILLAR 1 & 2C: DYNAMIC 3D SKYBOX SHADER UNIFORM TARGETS
// ============================================================================

export interface DynamicSkyShaderTargets {
  zenithHex: number;
  horizonHex: number;
  nebulaHex: number;
  auroraHex: number;
  turbulence: number;
  phaseIntensity: number;
}

export function computeDynamicSkyShaderTargets(params: {
  skyHex: number;
  fogHex: number;
  rimLightHex: number;
  bossPhase: 1 | 2 | 3;
  resonanceRatio?: number;
}): DynamicSkyShaderTargets {
  const phase = params.bossPhase;
  const resonance = Math.max(0, Math.min(1, params.resonanceRatio ?? 0));
  const phaseBoost = phase === 3 ? 1.0 : phase === 2 ? 0.55 : 0.15;
  const nebulaHex =
    phase === 3 ? 0xf43f5e : phase === 2 ? 0xf59e0b : params.rimLightHex;
  const auroraHex =
    resonance > 0.65 ? 0x38bdf8 : phase === 3 ? 0xfb7185 : params.rimLightHex;

  return {
    zenithHex: params.skyHex,
    horizonHex: params.fogHex,
    nebulaHex,
    auroraHex,
    turbulence: Number((0.85 + phaseBoost * 1.15 + resonance * 0.45).toFixed(3)),
    phaseIntensity: Number(Math.min(1, phaseBoost + resonance * 0.25).toFixed(3)),
  };
}

// ============================================================================
// PILLAR 3: ANCIENT RUNE PITY & 35-SHARD SELECTOR GUARANTEE
// ============================================================================

export const RUNE_EPIC_PITY_MAX = 10;
export const RUNE_LEGENDARY_PITY_MAX = 30;
export const RUNE_LEGENDARY_SOFT_PITY_START = 22;
export const ANCIENT_RUNE_EXCHANGE_COST = 35;

export interface AncientRunePitySummary {
  epicCurrent: number;
  epicMax: number;
  epicRemaining: number;
  legendaryCurrent: number;
  legendaryMax: number;
  legendaryRemaining: number;
  softPityActive: boolean;
  effectiveLegendaryRatePct: number;
  ancientRuneShards: number;
  exchangeCost: number;
  canDirectSelectRune: boolean;
}

export function computeAncientRunePitySummary(
  pity: Partial<PityState> | undefined,
  isPremiumBag: boolean
): AncientRunePitySummary {
  const epicCur = Math.max(0, Math.min(RUNE_EPIC_PITY_MAX, pity?.runeRollsSinceEpic ?? 0));
  const legCur = Math.max(
    0,
    Math.min(RUNE_LEGENDARY_PITY_MAX, pity?.runeRollsSinceLegendary ?? 0)
  );
  const softPityActive = isPremiumBag && legCur >= RUNE_LEGENDARY_SOFT_PITY_START;
  const softBonus = softPityActive ? (legCur - RUNE_LEGENDARY_SOFT_PITY_START + 1) * 5.0 : 0;
  const baseLeg = isPremiumBag ? 4.5 : 0.8;
  const effectiveLegendaryRatePct =
    isPremiumBag && legCur >= RUNE_LEGENDARY_PITY_MAX - 1
      ? 100
      : Math.min(100, Number((baseLeg + softBonus).toFixed(1)));
  const shards = Math.max(0, pity?.ancientRuneShards ?? 0);

  return {
    epicCurrent: epicCur,
    epicMax: RUNE_EPIC_PITY_MAX,
    epicRemaining: Math.max(1, RUNE_EPIC_PITY_MAX - epicCur),
    legendaryCurrent: legCur,
    legendaryMax: RUNE_LEGENDARY_PITY_MAX,
    legendaryRemaining: Math.max(1, RUNE_LEGENDARY_PITY_MAX - legCur),
    softPityActive,
    effectiveLegendaryRatePct,
    ancientRuneShards: shards,
    exchangeCost: ANCIENT_RUNE_EXCHANGE_COST,
    canDirectSelectRune: shards >= ANCIENT_RUNE_EXCHANGE_COST,
  };
}

export function getAncientRuneShardsFromRarity(rarity: Rarity): number {
  if (rarity === 'MYTHIC') return 12;
  if (rarity === 'LEGENDARY') return 8;
  if (rarity === 'EPIC') return 4;
  if (rarity === 'RARE') return 2;
  return 1;
}

// ============================================================================
// PILLAR 4: EQUALIZED TRIAL GAUNTLET (ĐẤU TRƯỜNG THỬ NGHIỆM ĐỒNG BỘ 3 TRẬN)
// ============================================================================

export type EqualizedTrialKitId = 'assassin_counter' | 'rapid_ranger' | 'elemental_sage';

export interface EqualizedTrialKitDef {
  id: EqualizedTrialKitId;
  name: string;
  badge: string;
  heroId: HeroId;
  desc: string;
  perkSummary: string;
  baseMaxHp: number;
  baseAttack: number;
  baseCritChance: number;
  baseCritDamage: number;
  attackSpeedMult: number;
  moveSpeed: number;
  accentClass: string;
}

export const EQUALIZED_TRIAL_KITS: Record<EqualizedTrialKitId, EqualizedTrialKitDef> = {
  assassin_counter: {
    id: 'assassin_counter',
    name: 'Ảnh Sát Phản Đòn',
    badge: 'Bộ Mẫu Sát Thủ',
    heroId: 'bellona',
    desc: 'Chuẩn hóa chỉ số ngang nhau — ưu thế chí mạng chuẩn xác và hồi Lướt nhanh.',
    perkSummary: '+6% Tỷ lệ Chí mạng nội bộ · Lướt phản công cơ động',
    baseMaxHp: 4200,
    baseAttack: 260,
    baseCritChance: 0.28,
    baseCritDamage: 1.9,
    attackSpeedMult: 1.05,
    moveSpeed: 7.7,
    accentClass: 'text-rose-300',
  },
  rapid_ranger: {
    id: 'rapid_ranger',
    name: 'Thần Xạ Liên Hoàn',
    badge: 'Bộ Mẫu Xạ Thủ',
    heroId: 'aurelia',
    desc: 'Chuẩn hóa chỉ số ngang nhau — nhịp bắn liên tục giữ khoảng cách an toàn.',
    perkSummary: '+15% Tốc độ bắn · Bắn ổn định cự ly xa',
    baseMaxHp: 4200,
    baseAttack: 250,
    baseCritChance: 0.22,
    baseCritDamage: 1.8,
    attackSpeedMult: 1.18,
    moveSpeed: 7.45,
    accentClass: 'text-sky-300',
  },
  elemental_sage: {
    id: 'elemental_sage',
    name: 'Hiền Triết Nguyên Tố',
    badge: 'Bộ Mẫu Pháp Sư',
    heroId: 'bellona',
    desc: 'Chuẩn hóa chỉ số ngang nhau — chuyên tích Cộng Hưởng Nguyên Tố bùng nổ.',
    perkSummary: '+14% Sát thương Cộng Hưởng · Sinh lực +150',
    baseMaxHp: 4350,
    baseAttack: 255,
    baseCritChance: 0.22,
    baseCritDamage: 1.82,
    attackSpeedMult: 1.08,
    moveSpeed: 7.35,
    accentClass: 'text-amber-300',
  },
};

export const EQUALIZED_TRIAL_KIT_LIST: EqualizedTrialKitDef[] = Object.values(
  EQUALIZED_TRIAL_KITS
);

export interface TrialGauntletRoundReward {
  round: 1 | 2 | 3;
  title: string;
  opponentTitle: string;
  seasonPoints: number;
  arenaCoins: number;
  starDust: number;
  gems: number;
}

export const EQUALIZED_TRIAL_ROUNDS: TrialGauntletRoundReward[] = [
  {
    round: 1,
    title: 'Vòng 1 · Khảo Nghiệm Cân Bằng',
    opponentTitle: 'Ứng Viên Thử Nghiệm I',
    seasonPoints: 35,
    arenaCoins: 55,
    starDust: 45,
    gems: 15,
  },
  {
    round: 2,
    title: 'Vòng 2 · Thích Nghi Chiến Thuật',
    opponentTitle: 'Cao Thủ Thử Nghiệm II',
    seasonPoints: 55,
    arenaCoins: 85,
    starDust: 75,
    gems: 25,
  },
  {
    round: 3,
    title: 'Vòng 3 · Quán Quân Đồng Bộ',
    opponentTitle: 'Đế Vương Thử Nghiệm III',
    seasonPoints: 90,
    arenaCoins: 140,
    starDust: 120,
    gems: 45,
  },
];

// ============================================================================
// PILLAR 5A: ADAPTIVE AI PLAYSTYLE LEARNING (AI HỌC LỐI ĐÁNH NGƯỜI CHƠI)
// ============================================================================

export type PlayerDodgeBias = 'left' | 'right' | 'balanced';
export type PlayerRangeStyle = 'kiter' | 'midrange' | 'brawler';
export type AiDominantElement = 'fire' | 'ice' | 'storm' | 'poison';

export interface PlayerCombatTelemetryInput {
  leftDodges: number;
  rightDodges: number;
  avgDistance: number; // average distance to enemy/rival in meters
  dashCount: number;
  durationSec: number;
  dominantElement: AiDominantElement;
  elementalReactions: number;
  won?: boolean;
}

export interface AiPlayerAdaptationProfile {
  playerName: string;
  samplesAnalyzed: number;
  dodgeBias: PlayerDodgeBias;
  dodgeBiasStrength: number; // 0..1
  rangeStyle: PlayerRangeStyle;
  avgEngageDistance: number;
  dashFrequencyPer10s: number;
  preferredElement: AiDominantElement;
  coopComplementaryElement: AiDominantElement;
  counterInsightLabel: string;
  coopSynergyHint: string;
  updatedAt: number;
}

export function pickComplementaryElement(preferred: AiDominantElement): AiDominantElement {
  if (preferred === 'fire') return 'ice';
  if (preferred === 'ice') return 'storm';
  if (preferred === 'storm') return 'fire';
  return 'fire';
}

export function buildAdaptationLabels(params: {
  dodgeBias: PlayerDodgeBias;
  rangeStyle: PlayerRangeStyle;
  preferredElement: AiDominantElement;
  coopComplementaryElement: AiDominantElement;
}): { counterInsightLabel: string; coopSynergyHint: string } {
  const dodgeTxt =
    params.dodgeBias === 'left'
      ? 'Bắt bài né trái'
      : params.dodgeBias === 'right'
      ? 'Bắt bài né phải'
      : 'Khóa góc trung tâm';
  const rangeTxt =
    params.rangeStyle === 'kiter'
      ? 'Áp sát chống thả diều'
      : params.rangeStyle === 'brawler'
      ? 'Giữ giãn cách cận chiến'
      : 'Đấu nhịp trung cự';
  const elemName: Record<AiDominantElement, string> = {
    fire: 'Hỏa',
    ice: 'Băng',
    storm: 'Lôi',
    poison: 'Độc',
  };
  return {
    counterInsightLabel: `${dodgeTxt} · ${rangeTxt}`,
    coopSynergyHint: `Bạn chuộng ${elemName[params.preferredElement]} → AI tự bồi ${elemName[params.coopComplementaryElement]} kích Hợp Kích`,
  };
}

export function derivePlayerAdaptationProfile(
  prev: AiPlayerAdaptationProfile | null | undefined,
  playerName: string,
  telemetry: PlayerCombatTelemetryInput,
  nowMs = Date.now()
): AiPlayerAdaptationProfile {
  const safeDur = Math.max(4, Math.min(300, telemetry.durationSec || 20));
  const left = Math.max(0, Math.min(200, telemetry.leftDodges || 0));
  const right = Math.max(0, Math.min(200, telemetry.rightDodges || 0));
  const totalDodges = left + right;
  const rawSignedBias = totalDodges >= 2 ? (right - left) / totalDodges : 0; // -1 left .. +1 right

  const prevSignedBias = prev
    ? prev.dodgeBias === 'left'
      ? -prev.dodgeBiasStrength
      : prev.dodgeBias === 'right'
      ? prev.dodgeBiasStrength
      : 0
    : 0;
  const blend = prev ? 0.55 : 1.0;
  const nextSigned = prevSignedBias * (1 - blend) + rawSignedBias * blend;

  const dodgeBias: PlayerDodgeBias =
    nextSigned <= -0.2 ? 'left' : nextSigned >= 0.2 ? 'right' : 'balanced';
  const dodgeBiasStrength = Number(Math.min(1, Math.abs(nextSigned)).toFixed(3));

  const rawDist = Math.max(1.5, Math.min(14, telemetry.avgDistance || 6.5));
  const avgEngageDistance = Number(
    (prev ? prev.avgEngageDistance * 0.5 + rawDist * 0.5 : rawDist).toFixed(2)
  );
  const rangeStyle: PlayerRangeStyle =
    avgEngageDistance >= 7.6 ? 'kiter' : avgEngageDistance <= 4.6 ? 'brawler' : 'midrange';

  const rawDashFreq = (Math.max(0, telemetry.dashCount || 0) / safeDur) * 10;
  const dashFrequencyPer10s = Number(
    (prev ? prev.dashFrequencyPer10s * 0.5 + rawDashFreq * 0.5 : rawDashFreq).toFixed(2)
  );

  const validEls: AiDominantElement[] = ['fire', 'ice', 'storm', 'poison'];
  const preferredElement = validEls.includes(telemetry.dominantElement)
    ? telemetry.dominantElement
    : prev?.preferredElement ?? 'fire';
  const coopComplementaryElement = pickComplementaryElement(preferredElement);
  const labels = buildAdaptationLabels({
    dodgeBias,
    rangeStyle,
    preferredElement,
    coopComplementaryElement,
  });

  return {
    playerName,
    samplesAnalyzed: (prev?.samplesAnalyzed ?? 0) + 1,
    dodgeBias,
    dodgeBiasStrength,
    rangeStyle,
    avgEngageDistance,
    dashFrequencyPer10s,
    preferredElement,
    coopComplementaryElement,
    counterInsightLabel: labels.counterInsightLabel,
    coopSynergyHint: labels.coopSynergyHint,
    updatedAt: nowMs,
  };
}

export interface AdaptiveAiCounterAdjustments {
  shotLeadAngleOffsetRad: number;
  dashInterceptCooldownMult: number;
  preferredSpacingDist: number;
  complementaryCoopElement: AiDominantElement;
  badgeText: string | null;
}

export function computeAdaptiveAiCounterAdjustments(
  profile: AiPlayerAdaptationProfile | null | undefined
): AdaptiveAiCounterAdjustments {
  if (!profile || profile.samplesAnalyzed <= 0) {
    return {
      shotLeadAngleOffsetRad: 0,
      dashInterceptCooldownMult: 1.0,
      preferredSpacingDist: 6.2,
      complementaryCoopElement: 'ice',
      badgeText: null,
    };
  }
  const leadMag = 0.08 + profile.dodgeBiasStrength * 0.14;
  const shotLeadAngleOffsetRad =
    profile.dodgeBias === 'left'
      ? -leadMag
      : profile.dodgeBias === 'right'
      ? leadMag
      : 0;
  const dashInterceptCooldownMult =
    profile.rangeStyle === 'kiter' ? 0.78 : profile.rangeStyle === 'brawler' ? 0.92 : 1.0;
  const preferredSpacingDist =
    profile.rangeStyle === 'kiter' ? 4.4 : profile.rangeStyle === 'brawler' ? 7.6 : 6.0;

  return {
    shotLeadAngleOffsetRad: Number(shotLeadAngleOffsetRad.toFixed(4)),
    dashInterceptCooldownMult,
    preferredSpacingDist,
    complementaryCoopElement: profile.coopComplementaryElement,
    badgeText: `AI Thích Nghi (${profile.samplesAnalyzed}): ${profile.counterInsightLabel}`,
  };
}

// ============================================================================
// PILLAR 5B: REAL-TIME GUILD WAR BASTIONS (CHIẾN TRƯỜNG BANG HỘI REAL-TIME)
// ============================================================================

export type GuildWarBastionId = 'solar_spire' | 'astral_citadel' | 'void_shrine';

export interface LiveGuildWarBastion {
  id: GuildWarBastionId;
  name: string;
  bonusLabel: string;
  /** -100 (Dark Alliance) .. 0 (Contested) .. +100 (Zodiac Guild) */
  controlScore: number;
  owner: 'zodiac_guild' | 'contested' | 'dark_alliance';
  allyAiCount: number;
  enemyAiCount: number;
  lastStrikeBy?: string;
  lastStrikeAt?: number;
}

export interface LiveGuildWarContribution {
  id: string;
  displayName: string;
  isHuman: boolean;
  heroId: HeroId;
  points: number;
  strikes: number;
  lastActionAt: number;
}

export interface LiveGuildWarState {
  warId: string;
  dateKey: string;
  zodiacGuildName: string;
  rivalGuildName: string;
  zodiacScore: number;
  rivalScore: number;
  targetScore: number;
  status: 'active' | 'zodiac_victory' | 'rival_victory';
  bastions: LiveGuildWarBastion[];
  contributors: LiveGuildWarContribution[];
  rewardGold: number;
  rewardGems: number;
  rewardGuildCoins: number;
  rewardStarDust: number;
  claimedByPlayer: boolean;
  lastUpdatedAt: number;
}

export function resolveBastionOwner(
  controlScore: number
): LiveGuildWarBastion['owner'] {
  if (controlScore >= 25) return 'zodiac_guild';
  if (controlScore <= -25) return 'dark_alliance';
  return 'contested';
}

export const GUILD_WAR_TARGET_SCORE = 1500;

export const GUILD_WAR_BASTION_TEMPLATES: Array<{
  id: GuildWarBastionId;
  name: string;
  bonusLabel: string;
  initialScore: number;
}> = [
  {
    id: 'solar_spire',
    name: 'Tháp Thái Dương',
    bonusLabel: '+15% ST Toàn Bang',
    initialScore: 18,
  },
  {
    id: 'astral_citadel',
    name: 'Thành Cổ Tinh Giới',
    bonusLabel: '+20% Khiên & Giáp',
    initialScore: -8,
  },
  {
    id: 'void_shrine',
    name: 'Đền Hư Không',
    bonusLabel: '+25% Cộng Hưởng',
    initialScore: -28,
  },
];

export function createInitialLiveGuildWarState(
  dateKey: string,
  nowMs = Date.now()
): LiveGuildWarState {
  const bastions: LiveGuildWarBastion[] = GUILD_WAR_BASTION_TEMPLATES.map((tpl, idx) => ({
    id: tpl.id,
    name: tpl.name,
    bonusLabel: tpl.bonusLabel,
    controlScore: tpl.initialScore,
    owner: resolveBastionOwner(tpl.initialScore),
    allyAiCount: 2 + (idx % 2),
    enemyAiCount: 2 + ((idx + 1) % 2),
  }));
  return {
    warId: `guildwar_${dateKey}`,
    dateKey,
    zodiacGuildName: 'Liên Minh Hoàng Đạo',
    rivalGuildName: 'Hắc Ám Vực Sâu',
    zodiacScore: 340,
    rivalScore: 315,
    targetScore: GUILD_WAR_TARGET_SCORE,
    status: 'active',
    bastions,
    contributors: [
      {
        id: 'ai_player_01',
        displayName: 'ThiênXạSư [AI Live]',
        isHuman: false,
        heroId: 'aurelia',
        points: 185,
        strikes: 4,
        lastActionAt: nowMs - 25_000,
      },
      {
        id: 'ai_player_02',
        displayName: 'BăngTinhLinh [AI Live]',
        isHuman: false,
        heroId: 'bellona',
        points: 155,
        strikes: 3,
        lastActionAt: nowMs - 40_000,
      },
    ],
    rewardGold: 2800,
    rewardGems: 110,
    rewardGuildCoins: 180,
    rewardStarDust: 160,
    claimedByPlayer: false,
    lastUpdatedAt: nowMs,
  };
}

export function applyGuildWarBastionStrike(
  state: LiveGuildWarState,
  params: {
    actorId: string;
    actorName: string;
    heroId: HeroId;
    isHuman: boolean;
    faction: 'zodiac_guild' | 'dark_alliance';
    bastionId: GuildWarBastionId;
    mode: 'assault_3d' | 'quick_strike';
    scoreGain?: number;
    nowMs?: number;
  }
): {
  nextState: LiveGuildWarState;
  bastion: LiveGuildWarBastion;
  pointsAwarded: number;
  flippedOwner: boolean;
} {
  const nowMs = params.nowMs ?? Date.now();
  const baseControlDelta =
    params.mode === 'assault_3d' ? 28 : params.isHuman ? 14 : 10;
  const signedDelta = params.faction === 'zodiac_guild' ? baseControlDelta : -baseControlDelta;
  const fallbackPts = params.mode === 'assault_3d' ? 145 : params.isHuman ? 65 : 42;
  const pointsAwarded = Math.max(
    15,
    Math.min(360, Math.round(params.scoreGain ?? fallbackPts))
  );

  let touchedBastion = state.bastions[0];
  let flippedOwner = false;

  const bastions = state.bastions.map((b) => {
    if (b.id !== params.bastionId) return b;
    const prevOwner = b.owner;
    const nextControl = Math.max(-100, Math.min(100, b.controlScore + signedDelta));
    const nextOwner = resolveBastionOwner(nextControl);
    if (prevOwner !== nextOwner) flippedOwner = true;
    const updated: LiveGuildWarBastion = {
      ...b,
      controlScore: nextControl,
      owner: nextOwner,
      allyAiCount:
        params.faction === 'zodiac_guild' && !params.isHuman
          ? Math.max(1, Math.min(5, b.allyAiCount + (flippedOwner ? 1 : 0)))
          : b.allyAiCount,
      enemyAiCount:
        params.faction === 'dark_alliance'
          ? Math.max(1, Math.min(5, b.enemyAiCount + (flippedOwner ? 1 : 0)))
          : b.enemyAiCount,
      lastStrikeBy: params.actorName,
      lastStrikeAt: nowMs,
    };
    touchedBastion = updated;
    return updated;
  });

  const heldZodiac = bastions.filter((b) => b.owner === 'zodiac_guild').length;
  const heldRival = bastions.filter((b) => b.owner === 'dark_alliance').length;

  let nextZodiacScore = state.zodiacScore;
  let nextRivalScore = state.rivalScore;
  if (params.faction === 'zodiac_guild') {
    nextZodiacScore = Math.min(
      state.targetScore,
      nextZodiacScore + pointsAwarded + heldZodiac * 12
    );
  } else {
    nextRivalScore = Math.min(
      state.targetScore,
      nextRivalScore + pointsAwarded + heldRival * 12
    );
  }

  let nextStatus: LiveGuildWarState['status'] = state.status;
  if (nextStatus === 'active') {
    if (nextZodiacScore >= state.targetScore) {
      nextStatus = 'zodiac_victory';
    } else if (nextRivalScore >= state.targetScore) {
      nextStatus = 'rival_victory';
    }
  }

  let contributors = [...state.contributors];
  if (params.faction === 'zodiac_guild') {
    const idx = contributors.findIndex((c) => c.id === params.actorId);
    if (idx >= 0) {
      contributors[idx] = {
        ...contributors[idx],
        displayName: params.actorName,
        heroId: params.heroId,
        points: contributors[idx].points + pointsAwarded,
        strikes: contributors[idx].strikes + 1,
        lastActionAt: nowMs,
      };
    } else {
      contributors.push({
        id: params.actorId,
        displayName: params.actorName,
        isHuman: params.isHuman,
        heroId: params.heroId,
        points: pointsAwarded,
        strikes: 1,
        lastActionAt: nowMs,
      });
    }
    contributors.sort((a, b) => b.points - a.points);
    contributors = contributors.slice(0, 14);
  }

  return {
    nextState: {
      ...state,
      zodiacScore: nextZodiacScore,
      rivalScore: nextRivalScore,
      status: nextStatus,
      bastions,
      contributors,
      lastUpdatedAt: nowMs,
    },
    bastion: touchedBastion,
    pointsAwarded,
    flippedOwner,
  };
}

export function tickLiveGuildWarAiSkirmish(
  state: LiveGuildWarState,
  params: {
    aiId: string;
    aiDisplayName: string;
    heroId: HeroId;
    tickSeed: number;
    nowMs?: number;
  }
): {
  nextState: LiveGuildWarState;
  bastion: LiveGuildWarBastion;
  faction: 'zodiac_guild' | 'dark_alliance';
  pointsAwarded: number;
  flippedOwner: boolean;
} {
  const nowMs = params.nowMs ?? Date.now();
  const bastion =
    state.bastions[params.tickSeed % Math.max(1, state.bastions.length)] ??
    state.bastions[0];
  // Keep race exciting: Zodiac allies and Dark Alliance trade blows
  const faction: 'zodiac_guild' | 'dark_alliance' =
    params.tickSeed % 5 === 2 ? 'dark_alliance' : 'zodiac_guild';
  const points = 28 + (params.tickSeed % 36);
  const res = applyGuildWarBastionStrike(state, {
    actorId: params.aiId,
    actorName:
      faction === 'zodiac_guild'
        ? `${params.aiDisplayName} [AI Live]`
        : 'Tiên Phong Hắc Ám [AI]',
    heroId: params.heroId,
    isHuman: false,
    faction,
    bastionId: bastion.id,
    mode: 'quick_strike',
    scoreGain: points,
    nowMs,
  });
  return {
    ...res,
    faction,
  };
}


import { SKILLS_CATALOG } from '../data/skillsData';
import type {
  AiAutoPilotTactic,
  SaveData,
  SkillEvolutionCodexEntry,
  SkillEvolutionDef,
  SkillEvolutionId,
  SkillEvolutionOffer,
  SkillId,
} from '../types/game';

/**
 * 12 Branching Skill Evolutions across 6 core skill lines.
 * Each core line offers a real tactical fork mid-run:
 *  - Branch 'boss': Focused single-target / boss-killer specialization
 *  - Branch 'aoe' : Wide crowd-control / AoE clearing specialization
 */
export const SKILL_EVOLUTIONS: SkillEvolutionDef[] = [
  // 1. Fire Arrow (Hỏa Tiễn)
  {
    id: 'evo_fire_solar_lance',
    baseSkillId: 'fire_arrow',
    branch: 'boss',
    name: 'Thương Nhật Dương',
    tagline: 'Đơn Mục Tiêu · Sát Thủ Boss',
    description:
      'Ngưng tụ Hỏa Tiễn thành mũi thương mặt trời xuyên giáp: +42% sát thương thiêu đốt và +22% sát thương trực tiếp lên Boss & Tinh Anh.',
    effectSummary: '+22% DMG Boss · +42% Cháy',
    accentColor: '#fb923c',
    accentHex: 0xfb923c,
  },
  {
    id: 'evo_fire_inferno_ring',
    baseSkillId: 'fire_arrow',
    branch: 'aoe',
    name: 'Vòng Lửa Địa Ngục',
    tagline: 'Diện Rộng · Càn Quét Nhóm',
    description:
      'Mỗi phát bắn Hỏa Tiễn kích nổ sóng lửa 3.2m xung quanh mục tiêu, lan hiệu ứng Thiêu Đốt sang tối đa 4 kẻ địch lân cận.',
    effectSummary: 'Nổ AoE 3.2m · Lan Thiêu Đốt',
    accentColor: '#f97316',
    accentHex: 0xf97316,
  },

  // 2. Ice Arrow (Băng Tiễn)
  {
    id: 'evo_ice_brittle_shatter',
    baseSkillId: 'ice_arrow',
    branch: 'boss',
    name: 'Băng Phá Giáp Sương',
    tagline: 'Đơn Mục Tiêu · Phá Giáp Boss',
    description:
      'Kẻ địch bị Lạnh chịu thêm +28% sát thương Chí Mạng và tăng +25% hiệu quả bào Khiên Phá Chiêu của Boss.',
    effectSummary: '+28% DMG Lên Địch Lạnh · +25% Phá Khiên',
    accentColor: '#38bdf8',
    accentHex: 0x38bdf8,
  },
  {
    id: 'evo_ice_glacier_nova',
    baseSkillId: 'ice_arrow',
    branch: 'aoe',
    name: 'Bão Sương Băng Giá',
    tagline: 'Diện Rộng · Khống Chế Quái',
    description:
      'Đòn Băng Tiễn giải phóng vòng sóng băng bán kính 3.6m làm chậm 45% toàn bộ quái xung quanh và gây thêm sát thương lan.',
    effectSummary: 'Sóng Băng 3.6m · Làm Chậm 45%',
    accentColor: '#67e8f9',
    accentHex: 0x67e8f9,
  },

  // 3. Lightning Arrow (Lôi Tiễn)
  {
    id: 'evo_bolt_overload_arc',
    baseSkillId: 'lightning_arrow',
    branch: 'boss',
    name: 'Lôi Cực Quá Tải',
    tagline: 'Đơn Mục Tiêu · Giật Sét Boss',
    description:
      'Tập trung điện tích vào mục tiêu chính: tăng +35% sát thương tia sét và tích nạp thêm +20% năng lượng Tuyệt Kỹ khi trúng Boss.',
    effectSummary: '+35% Sét Chính · +20% Nạp Nộ',
    accentColor: '#a78bfa',
    accentHex: 0xa78bfa,
  },
  {
    id: 'evo_bolt_storm_web',
    baseSkillId: 'lightning_arrow',
    branch: 'aoe',
    name: 'Lưới Lôi Bão Tố',
    tagline: 'Diện Rộng · Lan Sét Đa Mục Tiêu',
    description:
      'Tia Sét nhảy lan thêm +3 mục tiêu với phạm vi mở rộng +40%, tạo lưới điện giật liên hoàn quét sạch đội hình đông.',
    effectSummary: '+3 Mục Tiêu Sét Lan · +40% Tầm',
    accentColor: '#c084fc',
    accentHex: 0xc084fc,
  },

  // 4. Multishot (Liên Xạ)
  {
    id: 'evo_multi_deadeye_rail',
    baseSkillId: 'multishot',
    branch: 'boss',
    name: 'Xạ Kích Xuyên Tâm',
    tagline: 'Đơn Mục Tiêu · Chí Mạng Chuẩn',
    description:
      'Thu gọn chùm đạn Liên Xạ thành loạt bắn chuẩn xác tốc độ cao: +18% tốc bắn và +30% sát thương Chí Mạng.',
    effectSummary: '+18% Tốc Bắn · +30% DMG Chí Mạng',
    accentColor: '#fbbf24',
    accentHex: 0xfbbf24,
  },
  {
    id: 'evo_multi_tempest_fan',
    baseSkillId: 'multishot',
    branch: 'aoe',
    name: 'Loạt Tiễn Bão Xoáy',
    tagline: 'Diện Rộng · Phủ Sân Toàn Diện',
    description:
      'Mỗi loạt Liên Xạ phóng thêm +2 tia chéo góc rộng có khả năng nảy +1 mục tiêu kế cận, áp đảo các đợt quái đông.',
    effectSummary: '+2 Tia Rộng · +1 Nảy Đạn',
    accentColor: '#22d3ee',
    accentHex: 0x22d3ee,
  },

  // 5. Orbit Orbs (Cầu Xoay)
  {
    id: 'evo_orbs_sentinel_bastion',
    baseSkillId: 'orbit_orbs',
    branch: 'boss',
    name: 'Vòng Bảo Hộ Thánh Quang',
    tagline: 'Sinh Tồn · Khắc Chế Boss',
    description:
      'Cầu Xoay tạo lá chắn hộ thể +18% Max HP mỗi phòng mới và giảm 12% sát thương đạn Boss bắn vào nhân vật.',
    effectSummary: '+18% Khiên/Phòng · -12% DMG Nhận',
    accentColor: '#34d399',
    accentHex: 0x34d399,
  },
  {
    id: 'evo_orbs_sawblade_vortex',
    baseSkillId: 'orbit_orbs',
    branch: 'aoe',
    name: 'Lốc Xoáy Luân Đao',
    tagline: 'Diện Rộng · Càn Quét Cận Chiến',
    description:
      'Tăng +55% tốc độ quay và +35% sát thương của toàn bộ Cầu Xoay, nghiền nát quái cận chiến áp sát.',
    effectSummary: '+55% Tốc Quay · +35% DMG Cầu',
    accentColor: '#10b981',
    accentHex: 0x10b981,
  },

  // 6. Flying Swords (Phi Kiếm)
  {
    id: 'evo_sword_boss_executioner',
    baseSkillId: 'flying_swords',
    branch: 'boss',
    name: 'Trảm Vương Kiếm Ý',
    tagline: 'Đơn Mục Tiêu · Kết Liễu Boss',
    description:
      'Phi Kiếm tự động khóa mục tiêu máu cao nhất/Boss, tăng +45% sát thương lên Boss và gây thêm sát thương kết liễu khi Boss dưới 35% HP.',
    effectSummary: '+45% DMG Boss · Kết Liễu <35% HP',
    accentColor: '#60a5fa',
    accentHex: 0x60a5fa,
  },
  {
    id: 'evo_sword_blade_storm',
    baseSkillId: 'flying_swords',
    branch: 'aoe',
    name: 'Vạn Kiếm Quy Tông',
    tagline: 'Diện Rộng · Triệu Hồi Đa Kiếm',
    description:
      'Tăng +2 Phi Kiếm mỗi chu kỳ và giảm 28% hồi chiêu phóng kiếm, liên tục cắt xuyên đội hình quái toàn đấu trường.',
    effectSummary: '+2 Phi Kiếm · -28% Hồi Chiêu',
    accentColor: '#818cf8',
    accentHex: 0x818cf8,
  },
];

export const SKILL_EVOLUTION_MAP: Record<SkillEvolutionId, SkillEvolutionDef> =
  SKILL_EVOLUTIONS.reduce((acc, evo) => {
    acc[evo.id] = evo;
    return acc;
  }, {} as Record<SkillEvolutionId, SkillEvolutionDef>);

export const SKILL_EVOLUTION_BASE_LINES: SkillId[] = [
  'fire_arrow',
  'ice_arrow',
  'lightning_arrow',
  'multishot',
  'orbit_orbs',
  'flying_swords',
];

/**
 * Required stacks (or base + super companion) for a core skill line to unlock its branching evolution fork.
 */
export function isCoreSkillReadyForEvolution(
  baseSkillId: SkillId,
  activeStacks: Partial<Record<SkillId, number>>
): boolean {
  const baseStacks = activeStacks[baseSkillId] ?? 0;
  if (baseStacks <= 0) return false;

  // Reaching 2+ stacks on the base skill OR owning its super counterpart unlocks the 2-branch Evolution Fork
  if (baseStacks >= 2) return true;
  if (baseSkillId === 'fire_arrow' && (activeStacks.super_blaze ?? 0) > 0) return true;
  if (baseSkillId === 'ice_arrow' && (activeStacks.super_freeze ?? 0) > 0) return true;
  if (baseSkillId === 'lightning_arrow' && (activeStacks.super_bolt ?? 0) > 0) return true;
  if (baseSkillId === 'multishot' && (activeStacks.front_arrow ?? 0) > 0) return true;
  if (baseSkillId === 'orbit_orbs' && (activeStacks.super_circle ?? 0) > 0) return true;
  if (baseSkillId === 'flying_swords' && (activeStacks.twin_strike ?? 0) > 0) return true;
  return false;
}

export function getEvolutionPairForBase(baseSkillId: SkillId): SkillEvolutionOffer | null {
  const branchBoss = SKILL_EVOLUTIONS.find(
    (e) => e.baseSkillId === baseSkillId && e.branch === 'boss'
  );
  const branchAoe = SKILL_EVOLUTIONS.find(
    (e) => e.baseSkillId === baseSkillId && e.branch === 'aoe'
  );
  if (!branchBoss || !branchAoe) return null;
  const baseDef = SKILLS_CATALOG[baseSkillId];
  return {
    baseSkillId,
    baseSkillName: baseDef?.name ?? baseSkillId,
    branchBoss,
    branchAoe,
  };
}

/**
 * Returns all currently eligible (not yet evolved) branching evolution offers for the active run.
 */
export function getEligibleEvolutionOffers(
  activeStacks: Partial<Record<SkillId, number>>,
  chosenEvolutions: ReadonlyArray<SkillEvolutionId> | ReadonlySet<SkillEvolutionId>
): SkillEvolutionOffer[] {
  const chosenSet: ReadonlySet<SkillEvolutionId> =
    chosenEvolutions instanceof Set
      ? (chosenEvolutions as ReadonlySet<SkillEvolutionId>)
      : new Set<SkillEvolutionId>(chosenEvolutions);

  const evolvedBases = new Set<SkillId>();
  for (const evoId of chosenSet) {
    const def = SKILL_EVOLUTION_MAP[evoId];
    if (def) evolvedBases.add(def.baseSkillId);
  }

  const offers: SkillEvolutionOffer[] = [];
  for (const baseSkillId of SKILL_EVOLUTION_BASE_LINES) {
    if (evolvedBases.has(baseSkillId)) continue;
    if (!isCoreSkillReadyForEvolution(baseSkillId, activeStacks)) continue;
    const pair = getEvolutionPairForBase(baseSkillId);
    if (pair) offers.push(pair);
  }
  return offers;
}

export interface EvolutionCombatModifiers {
  bossDamageMult: number;
  burnDamageMult: number;
  fireAoeRadius: number;
  chilledTargetDamageMult: number;
  bossShieldBreakMult: number;
  iceNovaRadius: number;
  lightningDamageMult: number;
  lightningExtraJumps: number;
  lightningRangeMult: number;
  ultChargeOnBossHitMult: number;
  attackSpeedMult: number;
  critDamageBonus: number;
  extraDiagonalArrows: number;
  extraRicochet: number;
  roomStartShieldRatio: number;
  damageTakenMult: number;
  orbitSpeedMult: number;
  orbitDamageMult: number;
  swordBossDamageMult: number;
  swordExecuteBonus: number;
  extraFlyingSwords: number;
  swordCooldownMult: number;
}

export function resolveEvolutionCombatModifiers(
  activeEvolutions: ReadonlyArray<SkillEvolutionId> | ReadonlySet<SkillEvolutionId>
): EvolutionCombatModifiers {
  const set = activeEvolutions instanceof Set ? activeEvolutions : new Set(activeEvolutions);

  return {
    bossDamageMult: set.has('evo_fire_solar_lance') ? 1.22 : 1.0,
    burnDamageMult: set.has('evo_fire_solar_lance') ? 1.42 : 1.0,
    fireAoeRadius: set.has('evo_fire_inferno_ring') ? 3.2 : 0,
    chilledTargetDamageMult: set.has('evo_ice_brittle_shatter') ? 1.28 : 1.0,
    bossShieldBreakMult: set.has('evo_ice_brittle_shatter') ? 1.25 : 1.0,
    iceNovaRadius: set.has('evo_ice_glacier_nova') ? 3.6 : 0,
    lightningDamageMult: set.has('evo_bolt_overload_arc') ? 1.35 : 1.0,
    lightningExtraJumps: set.has('evo_bolt_storm_web') ? 3 : 0,
    lightningRangeMult: set.has('evo_bolt_storm_web') ? 1.4 : 1.0,
    ultChargeOnBossHitMult: set.has('evo_bolt_overload_arc') ? 1.2 : 1.0,
    attackSpeedMult: set.has('evo_multi_deadeye_rail') ? 1.18 : 1.0,
    critDamageBonus: set.has('evo_multi_deadeye_rail') ? 0.3 : 0,
    extraDiagonalArrows: set.has('evo_multi_tempest_fan') ? 2 : 0,
    extraRicochet: set.has('evo_multi_tempest_fan') ? 1 : 0,
    roomStartShieldRatio: set.has('evo_orbs_sentinel_bastion') ? 0.18 : 0,
    damageTakenMult: set.has('evo_orbs_sentinel_bastion') ? 0.88 : 1.0,
    orbitSpeedMult: set.has('evo_orbs_sawblade_vortex') ? 1.55 : 1.0,
    orbitDamageMult: set.has('evo_orbs_sawblade_vortex') ? 1.35 : 1.0,
    swordBossDamageMult: set.has('evo_sword_boss_executioner') ? 1.45 : 1.0,
    swordExecuteBonus: set.has('evo_sword_boss_executioner') ? 0.25 : 0,
    extraFlyingSwords: set.has('evo_sword_blade_storm') ? 2 : 0,
    swordCooldownMult: set.has('evo_sword_blade_storm') ? 0.72 : 1.0,
  };
}

/**
 * Deterministic AI Auto-Pilot evolution fork selector matching active combat tactic.
 */
export function selectAiEvolutionBranch(
  offer: SkillEvolutionOffer,
  tactic: AiAutoPilotTactic = 'balanced',
  isBossStage = false
): SkillEvolutionDef {
  if (isBossStage || tactic === 'aggressive') {
    return offer.branchBoss;
  }
  if (tactic === 'evasive' && offer.baseSkillId === 'orbit_orbs') {
    return offer.branchBoss; // Sentinel Bastion grants defensive shield & DR
  }
  return offer.branchAoe;
}

export function sanitizeDiscoveredEvolutions(raw: unknown): SkillEvolutionId[] {
  if (!Array.isArray(raw)) return [];
  const valid = new Set<SkillEvolutionId>();
  for (const item of raw) {
    if (typeof item === 'string' && item in SKILL_EVOLUTION_MAP) {
      valid.add(item as SkillEvolutionId);
    }
  }
  return Array.from(valid);
}

export function buildEvolutionCodexEntries(save: SaveData): SkillEvolutionCodexEntry[] {
  const discoveredSet = new Set(sanitizeDiscoveredEvolutions(save.discoveredEvolutions));
  return SKILL_EVOLUTIONS.map((evo) => ({
    ...evo,
    baseSkillName: SKILLS_CATALOG[evo.baseSkillId]?.name ?? evo.baseSkillId,
    discovered: discoveredSet.has(evo.id),
  }));
}

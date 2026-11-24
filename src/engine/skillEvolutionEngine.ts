import type {
  AiAutoPilotTactic,
  SaveData,
  SkillEvolutionCodexEntry,
  SkillEvolutionDef,
  SkillEvolutionId,
  SkillEvolutionOffer,
  SkillId,
} from '../types/game';

const BASE_SKILL_NAMES: Partial<Record<SkillId, string>> = {
  fire_arrow: 'Hỏa Tiễn',
  ice_arrow: 'Băng Tiễn',
  lightning_arrow: 'Lôi Tiễn',
  multishot: 'Liên Xạ',
  orbit_orbs: 'Cầu Xoay',
  flying_swords: 'Phi Kiếm',
};

export const SKILL_EVOLUTION_LIST: SkillEvolutionDef[] = [
  {
    id: 'evo_fire_solar_lance',
    baseSkillId: 'fire_arrow',
    branch: 'boss',
    name: 'Thương Nhật Luân',
    tagline: 'Xuyên giáp đơn mục tiêu & thiêu đốt Boss',
    description: 'Ngọn lửa cô đặc thành thương mặt trời, tăng mạnh sát thương lên Boss và sát thương thiêu đốt.',
    effectSummary: '+22% DMG Boss · +40% Thiêu Đốt',
    accentColor: '#fb923c',
    accentHex: 0xfb923c,
  },
  {
    id: 'evo_fire_inferno_ring',
    baseSkillId: 'fire_arrow',
    branch: 'aoe',
    name: 'Vòng Lửa Hỏa Ngục',
    tagline: 'Kích nổ diện rộng khi trúng đòn lửa',
    description: 'Mũi tên lửa tạo vòng chấn động nhiệt lan rộng thiêu rụi toàn bộ quái xung quanh.',
    effectSummary: 'Nổ Hỏa Diện Rộng 3.2m · +20% Thiêu Đốt',
    accentColor: '#f97316',
    accentHex: 0xf97316,
  },
  {
    id: 'evo_ice_brittle_shatter',
    baseSkillId: 'ice_arrow',
    branch: 'boss',
    name: 'Băng Giá Phá Giáp',
    tagline: 'Đột phá mục tiêu đang bị làm chậm',
    description: 'Mục tiêu dính hàn băng chịu thêm sát thương chí mạng và vỡ thanh choáng Boss nhanh hơn.',
    effectSummary: '+24% DMG mục tiêu Băng · +25% Phá Choáng',
    accentColor: '#38bdf8',
    accentHex: 0x38bdf8,
  },
  {
    id: 'evo_ice_glacier_nova',
    baseSkillId: 'ice_arrow',
    branch: 'aoe',
    name: 'Hàn Băng Tân Tinh',
    tagline: 'Tỏa sóng băng làm chậm đàn quái',
    description: 'Đòn băng kích hoạt vòng băng giá 3.4m khống chế đám đông và bảo vệ vị trí bắn.',
    effectSummary: 'Sóng Băng 3.4m · -10% Sát Thương Nhận',
    accentColor: '#67e8f9',
    accentHex: 0x67e8f9,
  },
  {
    id: 'evo_bolt_overload_arc',
    baseSkillId: 'lightning_arrow',
    branch: 'boss',
    name: 'Lôi Đình Quá Tải',
    tagline: 'Sốc điện tập trung & nạp Nộ nhanh',
    description: 'Tia sét tập trung dồn sát thương Lôi lên Boss và gia tăng tốc độ hồi chiêu Tuyệt Kỹ.',
    effectSummary: '+28% DMG Lôi · +25% Hồi Nộ Khi Đánh Boss',
    accentColor: '#a855f7',
    accentHex: 0xa855f7,
  },
  {
    id: 'evo_bolt_storm_web',
    baseSkillId: 'lightning_arrow',
    branch: 'aoe',
    name: 'Mạng Lưới Bão Tố',
    tagline: 'Tăng tầm nhảy & số mục tiêu lan sét',
    description: 'Mở rộng phạm vi liên kết sấm sét, nhảy thêm 2 mục tiêu để dọn phòng cực nhanh.',
    effectSummary: '+2 Lần Nhảy Sét · +30% Tầm Lan',
    accentColor: '#c084fc',
    accentHex: 0xc084fc,
  },
  {
    id: 'evo_multi_deadeye_rail',
    baseSkillId: 'multishot',
    branch: 'boss',
    name: 'Ưng Nhãn Xuyên Phá',
    tagline: 'Tập trung tốc bắn và bạo kích Boss',
    description: 'Tăng tốc độ bắn cơ bản và sát thương chí mạng khi duy trì chuỗi bắn vào Boss.',
    effectSummary: '+18% Tốc Đánh · +25% Sát Thương Chí Mạng',
    accentColor: '#facc15',
    accentHex: 0xfacc15,
  },
  {
    id: 'evo_multi_tempest_fan',
    baseSkillId: 'multishot',
    branch: 'aoe',
    name: 'Cuồng Phong Loạn Tiễn',
    tagline: 'Bắn thêm 2 tia chéo & tăng nảy bật',
    description: 'Mỗi loạt bắn phóng thêm 2 mũi tên chéo cùng khả năng nảy thêm mục tiêu.',
    effectSummary: '+2 Tia Chéo · +1 Nảy Mục Tiêu',
    accentColor: '#34d399',
    accentHex: 0x34d399,
  },
  {
    id: 'evo_orbs_sentinel_bastion',
    baseSkillId: 'orbit_orbs',
    branch: 'boss',
    name: 'Pháo Đài Vệ Tinh',
    tagline: 'Khiên đầu màn & giảm sát thương nhận',
    description: 'Quả cầu hộ vệ tạo lá chắn năng lượng 18% HP tối đa đầu mỗi phòng và giảm 12% sát thương nhận.',
    effectSummary: '+18% Khiên Đầu Phòng · -12% DMG Nhận',
    accentColor: '#60a5fa',
    accentHex: 0x60a5fa,
  },
  {
    id: 'evo_orbs_sawblade_vortex',
    baseSkillId: 'orbit_orbs',
    branch: 'aoe',
    name: 'Lốc Xoáy Luân Đao',
    tagline: 'Quay siêu tốc & nghiền nát quái cận chiến',
    description: 'Tăng mạnh tốc độ xoay và sát thương của hệ thống Cầu Xoay quanh nhân vật.',
    effectSummary: '+35% Tốc Xoay · +35% DMG Cầu Xoay',
    accentColor: '#2dd4bf',
    accentHex: 0x2dd4bf,
  },
  {
    id: 'evo_sword_boss_executioner',
    baseSkillId: 'flying_swords',
    branch: 'boss',
    name: 'Trảm Vương Kiếm Ý',
    tagline: 'Ưu tiên khóa mục tiêu Boss & kết liễu <35% HP',
    description: 'Phi kiếm ưu tiên dồn vào Boss hoặc Tinh Anh với sát thương và tần suất vượt trội.',
    effectSummary: '+30% DMG Kiếm Boss · +25% Kết Liễu · -18% Hồi Chiêu',
    accentColor: '#f43f5e',
    accentHex: 0xf43f5e,
  },
  {
    id: 'evo_sword_blade_storm',
    baseSkillId: 'flying_swords',
    branch: 'aoe',
    name: 'Vạn Kiếm Quy Tông',
    tagline: 'Triệu hồi thêm 2 thanh phi kiếm liên hoàn',
    description: 'Gia tăng số lượng phi kiếm phóng ra mỗi nhịp để quét sạch toàn sân.',
    effectSummary: '+2 Phi Kiếm Mỗi Nhịp · -12% Hồi Chiêu',
    accentColor: '#fbbf24',
    accentHex: 0xfbbf24,
  },
];

export const SKILL_EVOLUTION_MAP: Record<SkillEvolutionId, SkillEvolutionDef> = Object.fromEntries(
  SKILL_EVOLUTION_LIST.map((e) => [e.id, e])
) as Record<SkillEvolutionId, SkillEvolutionDef>;

export interface EvolutionCombatModifiers {
  roomStartShieldRatio: number;
  attackSpeedMult: number;
  extraDiagonalArrows: number;
  extraRicochet: number;
  swordCooldownMult: number;
  extraFlyingSwords: number;
  swordBossDamageMult: number;
  swordExecuteBonus: number;
  orbitSpeedMult: number;
  orbitDamageMult: number;
  bossDamageMult: number;
  critDamageBonus: number;
  chilledTargetDamageMult: number;
  lightningDamageMult: number;
  ultChargeOnBossHitMult: number;
  bossShieldBreakMult: number;
  burnDamageMult: number;
  fireAoeRadius: number;
  iceNovaRadius: number;
  lightningExtraJumps: number;
  lightningRangeMult: number;
  damageTakenMult: number;
}

export function getEligibleEvolutionOffers(
  activeSkills: Partial<Record<SkillId, number>>,
  activeEvolutions: Set<SkillEvolutionId>
): SkillEvolutionOffer[] {
  const baseIds: SkillId[] = [
    'fire_arrow',
    'ice_arrow',
    'lightning_arrow',
    'multishot',
    'orbit_orbs',
    'flying_swords',
  ];
  const offers: SkillEvolutionOffer[] = [];

  for (const baseSkillId of baseIds) {
    if ((activeSkills[baseSkillId] ?? 0) < 2) continue;
    const branches = SKILL_EVOLUTION_LIST.filter((e) => e.baseSkillId === baseSkillId);
    const branchBoss = branches.find((b) => b.branch === 'boss');
    const branchAoe = branches.find((b) => b.branch === 'aoe');
    if (!branchBoss || !branchAoe) continue;
    if (activeEvolutions.has(branchBoss.id) || activeEvolutions.has(branchAoe.id)) continue;
    offers.push({
      baseSkillId,
      baseSkillName: BASE_SKILL_NAMES[baseSkillId] ?? baseSkillId,
      branchBoss,
      branchAoe,
    });
  }
  return offers;
}

export function resolveEvolutionCombatModifiers(
  activeEvolutions: Set<SkillEvolutionId>
): EvolutionCombatModifiers {
  const mods: EvolutionCombatModifiers = {
    roomStartShieldRatio: 0,
    attackSpeedMult: 1,
    extraDiagonalArrows: 0,
    extraRicochet: 0,
    swordCooldownMult: 1,
    extraFlyingSwords: 0,
    swordBossDamageMult: 1,
    swordExecuteBonus: 0,
    orbitSpeedMult: 1,
    orbitDamageMult: 1,
    bossDamageMult: 1,
    critDamageBonus: 0,
    chilledTargetDamageMult: 1,
    lightningDamageMult: 1,
    ultChargeOnBossHitMult: 1,
    bossShieldBreakMult: 1,
    burnDamageMult: 1,
    fireAoeRadius: 0,
    iceNovaRadius: 0,
    lightningExtraJumps: 0,
    lightningRangeMult: 1,
    damageTakenMult: 1,
  };

  if (activeEvolutions.has('evo_fire_solar_lance')) {
    mods.bossDamageMult *= 1.22;
    mods.burnDamageMult *= 1.4;
  }
  if (activeEvolutions.has('evo_fire_inferno_ring')) {
    mods.fireAoeRadius = Math.max(mods.fireAoeRadius, 3.2);
    mods.burnDamageMult *= 1.2;
  }
  if (activeEvolutions.has('evo_ice_brittle_shatter')) {
    mods.chilledTargetDamageMult *= 1.24;
    mods.bossShieldBreakMult *= 1.25;
  }
  if (activeEvolutions.has('evo_ice_glacier_nova')) {
    mods.iceNovaRadius = Math.max(mods.iceNovaRadius, 3.4);
    mods.damageTakenMult *= 0.9;
  }
  if (activeEvolutions.has('evo_bolt_overload_arc')) {
    mods.lightningDamageMult *= 1.28;
    mods.ultChargeOnBossHitMult *= 1.25;
  }
  if (activeEvolutions.has('evo_bolt_storm_web')) {
    mods.lightningExtraJumps += 2;
    mods.lightningRangeMult *= 1.3;
  }
  if (activeEvolutions.has('evo_multi_deadeye_rail')) {
    mods.attackSpeedMult *= 1.18;
    mods.critDamageBonus += 0.25;
  }
  if (activeEvolutions.has('evo_multi_tempest_fan')) {
    mods.extraDiagonalArrows += 2;
    mods.extraRicochet += 1;
  }
  if (activeEvolutions.has('evo_orbs_sentinel_bastion')) {
    mods.roomStartShieldRatio += 0.18;
    mods.damageTakenMult *= 0.88;
  }
  if (activeEvolutions.has('evo_orbs_sawblade_vortex')) {
    mods.orbitSpeedMult *= 1.35;
    mods.orbitDamageMult *= 1.35;
  }
  if (activeEvolutions.has('evo_sword_boss_executioner')) {
    mods.swordBossDamageMult *= 1.3;
    mods.swordExecuteBonus += 0.25;
    mods.swordCooldownMult *= 0.82;
  }
  if (activeEvolutions.has('evo_sword_blade_storm')) {
    mods.extraFlyingSwords += 2;
    mods.swordCooldownMult *= 0.88;
  }

  return mods;
}

export function selectAiEvolutionBranch(
  offer: SkillEvolutionOffer,
  tactic: AiAutoPilotTactic,
  isBossStage: boolean
): SkillEvolutionDef {
  if (isBossStage || tactic === 'aggressive') {
    return offer.branchBoss;
  }
  return offer.branchAoe;
}

export function buildEvolutionCodexEntries(save: SaveData): SkillEvolutionCodexEntry[] {
  const discovered = new Set(save.discoveredEvolutions ?? []);
  return SKILL_EVOLUTION_LIST.map((evo) => ({
    ...evo,
    baseSkillName: BASE_SKILL_NAMES[evo.baseSkillId] ?? evo.baseSkillId,
    discovered: discovered.has(evo.id),
  }));
}

import { TalentDefinition, TalentId } from '../types/game';

export const TALENTS: TalentDefinition[] = [
  {
    id: 'might',
    name: 'Cường Lực Chiến Binh',
    icon: '⚔️',
    desc: 'Tăng vĩnh viễn Sức Tấn Công cơ bản cho toàn bộ Anh Hùng.',
    maxLevel: 20,
    baseCost: 90,
    stepCost: 65,
    perLevelLabel: '+9 ATK / cấp',
  },
  {
    id: 'vitality',
    name: 'Thể Phách Bất Diệt',
    icon: '❤️',
    desc: 'Gia tăng giới hạn Sinh Lực tối đa khi bước vào Thánh Điện.',
    maxLevel: 20,
    baseCost: 90,
    stepCost: 65,
    perLevelLabel: '+42 Max HP / cấp',
  },
  {
    id: 'swift_bow',
    name: 'Nhịp Cung Thanh Phong',
    icon: '🏹',
    desc: 'Rút ngắn thời gian giãn cách giữa các phát bắn.',
    maxLevel: 20,
    baseCost: 110,
    stepCost: 75,
    perLevelLabel: '+3.5% Tốc Bắn / cấp',
  },
  {
    id: 'eagle_eye',
    name: 'Mắt Diều Hâu',
    icon: '🎯',
    desc: 'Tăng xác suất tung đòn Chí Mạng và xuyên giáp kẻ thù.',
    maxLevel: 20,
    baseCost: 110,
    stepCost: 75,
    perLevelLabel: '+1.8% Chí Mạng / cấp',
  },
  {
    id: 'iron_skin',
    name: 'Thiết Bì Hộ Thân',
    icon: '🛡️',
    desc: 'Giảm sát thương gánh chịu từ đòn đánh và đạn của Boss.',
    maxLevel: 20,
    baseCost: 100,
    stepCost: 70,
    perLevelLabel: '+1.8% Giảm Thương / cấp',
  },
  {
    id: 'wind_step',
    name: 'Bước Chân Tinh Linh',
    icon: '💨',
    desc: 'Cải thiện tốc độ di chuyển giúp né vùng đỏ Boss mượt mà.',
    maxLevel: 20,
    baseCost: 95,
    stepCost: 65,
    perLevelLabel: '+2.5% Tốc Chạy / cấp',
  },
  {
    id: 'soul_regen',
    name: 'Hồi Phục Linh Hồn',
    icon: '🌿',
    desc: 'Tự động hồi lại một phần Máu tối đa sau mỗi phòng hoặc tầng tháp.',
    maxLevel: 20,
    baseCost: 120,
    stepCost: 85,
    perLevelLabel: '+2.5% Hồi Máu/Phòng',
  },
  {
    id: 'fortune',
    name: 'Kho Báu Hoàng Đạo',
    icon: '🪙',
    desc: 'Gia tăng lượng Vàng rơi từ quái vật, rương vỡ và Boss.',
    maxLevel: 20,
    baseCost: 100,
    stepCost: 70,
    perLevelLabel: '+8% Vàng Nhận / cấp',
  },
];

export const TALENT_MAP: Record<TalentId, TalentDefinition> = Object.fromEntries(
  TALENTS.map((t) => [t.id, t])
) as Record<TalentId, TalentDefinition>;

export function getTalentLevel(
  talents: Partial<Record<TalentId, number>> | undefined,
  id: TalentId
): number {
  return Math.max(0, Math.min(TALENT_MAP[id].maxLevel, talents?.[id] ?? 0));
}

export function getTalentUpgradeCost(id: TalentId, currentLevel: number): number {
  const def = TALENT_MAP[id];
  const lv = Math.max(0, Math.floor(currentLevel));
  const lateCurve = Math.pow(Math.max(0, lv - 3), 1.78) * 42;
  return Math.round(def.baseCost + lv * def.stepCost * 1.25 + lateCurve);
}

export function getTotalTalentLevels(
  talents: Partial<Record<TalentId, number>> | undefined
): number {
  if (!talents) return 0;
  return TALENTS.reduce((sum, t) => sum + getTalentLevel(talents, t.id), 0);
}

export function computeTalentBonuses(
  talents: Partial<Record<TalentId, number>> | undefined
) {
  const might = getTalentLevel(talents, 'might');
  const vitality = getTalentLevel(talents, 'vitality');
  const swift = getTalentLevel(talents, 'swift_bow');
  const eagle = getTalentLevel(talents, 'eagle_eye');
  const iron = getTalentLevel(talents, 'iron_skin');
  const wind = getTalentLevel(talents, 'wind_step');
  const regen = getTalentLevel(talents, 'soul_regen');
  const fortune = getTalentLevel(talents, 'fortune');

  return {
    atk: might * 9,
    hp: vitality * 42,
    aspdMult: swift * 0.035,
    critChance: eagle * 0.018,
    damageReduction: iron * 0.018,
    moveSpeedMult: wind * 0.025,
    stageHealPct: regen * 0.025,
    goldGainMult: 1 + fortune * 0.08,
  };
}

export const PARAGON_INFUSION_MAX_LEVEL = 500;
export const PARAGON_INFUSION_TALENT_THRESHOLD = 160;
export const PARAGON_INFUSION_CHAPTER_THRESHOLD = 12;

export function getParagonInfusionLevel(rawLevel: number | undefined): number {
  if (typeof rawLevel !== 'number' || !Number.isFinite(rawLevel)) return 0;
  return Math.max(0, Math.min(PARAGON_INFUSION_MAX_LEVEL, Math.floor(rawLevel)));
}

export function isParagonInfusionUnlocked(
  talents: Partial<Record<TalentId, number>> | undefined,
  highestChapterCleared: number
): boolean {
  return (
    getTotalTalentLevels(talents) >= PARAGON_INFUSION_TALENT_THRESHOLD ||
    highestChapterCleared >= PARAGON_INFUSION_CHAPTER_THRESHOLD
  );
}

export function getParagonInfusionCost(currentLevel: number): number {
  const lv = Math.max(0, Math.min(PARAGON_INFUSION_MAX_LEVEL - 1, Math.floor(currentLevel)));
  return Math.round(18_000 + lv * 3_200 + Math.pow(lv, 1.58) * 380);
}

export function computeParagonInfusionBonuses(rawLevel: number | undefined): {
  level: number;
  atkPct: number;
  hpPct: number;
  bossDmgBonus: number;
  cpBonus: number;
} {
  const level = getParagonInfusionLevel(rawLevel);
  return {
    level,
    atkPct: level * 0.004,
    hpPct: level * 0.004,
    bossDmgBonus: Math.min(0.4, level * 0.002),
    cpBonus: level * 95,
  };
}


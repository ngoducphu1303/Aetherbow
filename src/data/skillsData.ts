import { SkillDefinition, SkillId, SkillRarity, WheelOutcome } from '../types/game';

export const SKILL_RARITY_META: Record<
  SkillRarity,
  { label: string; badgeClass: string; borderClass: string; color: string }
> = {
  common: {
    label: 'Thường',
    badgeClass: 'text-slate-300',
    borderClass: 'border-slate-600/80 hover:border-slate-400',
    color: '#94a3b8',
  },
  rare: {
    label: 'Hiếm',
    badgeClass: 'text-sky-300',
    borderClass: 'border-sky-500/60 hover:border-sky-300',
    color: '#38bdf8',
  },
  epic: {
    label: 'Sử Thi',
    badgeClass: 'text-purple-300',
    borderClass: 'border-purple-500/65 hover:border-purple-300',
    color: '#c084fc',
  },
  legend: {
    label: 'Huyền Thoại',
    badgeClass: 'text-amber-300',
    borderClass: 'border-amber-500/75 hover:border-amber-300',
    color: '#fbbf24',
  },
};

export const SKILLS_CATALOG: Record<SkillId, SkillDefinition> = {
  // === LEGENDARY SKILLS ===
  warriors_soul: {
    id: 'warriors_soul',
    name: 'Linh Hồn Chiến Binh',
    rarity: 'legend',
    category: 'stat',
    description: 'Tăng trực tiếp +30% Sức Tấn Công (ATK PWR) cho mọi nguồn sát thương!',
    maxStacks: 2,
    accentColor: '#f59e0b',
  },
  power_trio: {
    id: 'power_trio',
    name: 'Tam Tuyệt Thần Lực',
    rarity: 'legend',
    category: 'stat',
    description: 'Tăng đồng thời +15% ATK, +20% Tốc Độ Bắn và +20% Máu Tối Đa!',
    maxStacks: 2,
    accentColor: '#fbbf24',
  },
  multishot: {
    id: 'multishot',
    name: 'Liên Xạ (+1 Loạt Đạn)',
    rarity: 'legend',
    category: 'weapon',
    description: 'Phóng thêm +1 loạt đạn liên tiếp mỗi lần tấn công.',
    maxStacks: 2,
    accentColor: '#38bdf8',
  },
  super_meteor: {
    id: 'super_meteor',
    name: 'Mưa Siêu Thiên Thạch',
    rarity: 'legend',
    category: 'meteor',
    description: 'Liên tục triệu hồi Thiên Thạch rực lửa giáng xuống đầu kẻ địch gây sát thương nổ AoE!',
    maxStacks: 2,
    accentColor: '#f97316',
  },
  sacred_protection: {
    id: 'sacred_protection',
    name: 'Khiên Thánh Hộ Mệnh',
    rarity: 'legend',
    category: 'stat',
    description: 'Nhận Khiên Thánh bằng 45% Max HP và tái tạo mỗi khi bước sang phòng mới.',
    maxStacks: 2,
    accentColor: '#67e8f9',
  },

  // === EPIC SKILLS ===
  diag_arrow: {
    id: 'diag_arrow',
    name: 'Tên Chéo (+2 Tia)',
    rarity: 'epic',
    category: 'weapon',
    description: 'Bắn thêm +2 tia đạn chéo góc ±26° cùng lúc với đòn chính.',
    maxStacks: 2,
    accentColor: '#22d3ee',
  },
  tracking_eye: {
    id: 'tracking_eye',
    name: 'Mắt Thần Truy Kích',
    rarity: 'epic',
    category: 'weapon',
    description: 'Đạn tự động bẻ lái truy đuổi kẻ địch gần nhất (Homing)!',
    maxStacks: 1,
    accentColor: '#c084fc',
  },
  super_blaze: {
    id: 'super_blaze',
    name: 'Siêu Hỏa Thiêu',
    rarity: 'epic',
    category: 'elemental',
    description: 'Cường hóa lửa thiêu đốt gây +150% sát thương Cháy và lan nổ nhỏ.',
    maxStacks: 2,
    accentColor: '#f97316',
  },
  super_bolt: {
    id: 'super_bolt',
    name: 'Siêu Lôi Phạt',
    rarity: 'epic',
    category: 'elemental',
    description: 'Tia Sét đánh trúng nhảy lan sang tối đa 4 mục tiêu xung quanh!',
    maxStacks: 2,
    accentColor: '#a78bfa',
  },
  super_freeze: {
    id: 'super_freeze',
    name: 'Siêu Đông Cứng',
    rarity: 'epic',
    category: 'elemental',
    description: 'Làm chậm cực đại kẻ địch và tăng +25% sát thương lên mục tiêu bị Lạnh.',
    maxStacks: 2,
    accentColor: '#67e8f9',
  },
  super_circle: {
    id: 'super_circle',
    name: '4 Siêu Cầu Xoay',
    rarity: 'epic',
    category: 'circle',
    description: 'Triệu hồi 4 Cầu Năng Lượng xoay nhanh quanh người, càn quét kẻ địch cận chiến.',
    maxStacks: 2,
    accentColor: '#34d399',
  },
  twin_strike: {
    id: 'twin_strike',
    name: 'Song Kiếm Liên Hoàn',
    rarity: 'epic',
    category: 'strike',
    description: 'Tăng gấp đôi số lượng Phi Kiếm tự động truy kích kẻ địch!',
    maxStacks: 2,
    accentColor: '#60a5fa',
  },
  laser_sprite: {
    id: 'laser_sprite',
    name: 'Tinh Linh Tia Sáng',
    rarity: 'epic',
    category: 'sprite',
    description: 'Triệu hồi Tinh Linh bay bên cạnh tự động bắn đạn năng lượng xuyên thấu.',
    maxStacks: 2,
    accentColor: '#e879f9',
  },
  revive: {
    id: 'revive',
    name: 'Thánh Ân Hồi Sinh',
    rarity: 'epic',
    category: 'stat',
    description: 'Khi HP về 0, lập tức Hồi Sinh với 100% Máu và đẩy lùi mọi kẻ địch!',
    maxStacks: 1,
    accentColor: '#fde047',
  },
  atk_boost: {
    id: 'atk_boost',
    name: 'Cường Hóa Tấn Công',
    rarity: 'epic',
    category: 'stat',
    description: 'Tăng +24% Sức Tấn Công (Attack Power).',
    maxStacks: 4,
    accentColor: '#fb7185',
  },
  aspd_boost: {
    id: 'aspd_boost',
    name: 'Linh Hồn Thần Tốc',
    rarity: 'epic',
    category: 'stat',
    description: 'Tăng +24% Tốc Độ Bắn (Attack Speed) để thả diều siêu mượt.',
    maxStacks: 4,
    accentColor: '#38bdf8',
  },

  // === RARE SKILLS ===
  front_arrow: {
    id: 'front_arrow',
    name: 'Tên Phía Trước (+1)',
    rarity: 'rare',
    category: 'weapon',
    description: 'Bắn song song 2 mũi tên về phía trước trên mỗi phát bắn.',
    maxStacks: 2,
    accentColor: '#38bdf8',
  },
  ricochet: {
    id: 'ricochet',
    name: 'Đạn Nảy Liên Hoàn',
    rarity: 'rare',
    category: 'weapon',
    description: 'Đạn trúng mục tiêu sẽ tự động bật nảy sang 2 kẻ địch lân cận.',
    maxStacks: 2,
    accentColor: '#fbbf24',
  },
  pierce: {
    id: 'pierce',
    name: 'Tên Xuyên Thấu',
    rarity: 'rare',
    category: 'weapon',
    description: 'Đạn xuyên thẳng qua hàng ngũ kẻ địch phía sau.',
    maxStacks: 1,
    accentColor: '#c084fc',
  },
  fire_arrow: {
    id: 'fire_arrow',
    name: 'Hỏa Tiễn (Blaze)',
    rarity: 'rare',
    category: 'elemental',
    description: 'Thắp lửa lên đạn gây sát thương Thiêu Đốt theo thời gian.',
    maxStacks: 2,
    accentColor: '#f97316',
  },
  lightning_arrow: {
    id: 'lightning_arrow',
    name: 'Lôi Tiễn (Bolt)',
    rarity: 'rare',
    category: 'elemental',
    description: 'Đòn đánh phóng tia Sét giật lan sang kẻ địch lân cận.',
    maxStacks: 2,
    accentColor: '#a78bfa',
  },
  ice_arrow: {
    id: 'ice_arrow',
    name: 'Băng Tiễn (Freeze)',
    rarity: 'rare',
    category: 'elemental',
    description: 'Đạn mang hàn khí làm chậm tốc độ di chuyển & tấn công của địch.',
    maxStacks: 2,
    accentColor: '#67e8f9',
  },
  venom_arrow: {
    id: 'venom_arrow',
    name: 'Độc Tiễn (Venom)',
    rarity: 'rare',
    category: 'elemental',
    description: 'Nhiễm độc vĩnh viễn rút máu mục tiêu liên tục cho đến khi bị hạ.',
    maxStacks: 2,
    accentColor: '#4ade80',
  },
  flying_swords: {
    id: 'flying_swords',
    name: 'Phi Kiếm Tự Động',
    rarity: 'rare',
    category: 'strike',
    description: 'Mỗi 1.5 giây tự động phóng Phi Kiếm truy kích mục tiêu gần nhất.',
    maxStacks: 3,
    accentColor: '#38bdf8',
  },
  meteor_shower: {
    id: 'meteor_shower',
    name: 'Thiên Thạch Truy Kích',
    rarity: 'rare',
    category: 'meteor',
    description: 'Khi tấn công có tỷ lệ gọi Thiên Thạch rơi xuống vị trí quái.',
    maxStacks: 2,
    accentColor: '#fb923c',
  },
  bomb_sprite: {
    id: 'bomb_sprite',
    name: 'Tinh Linh Pháo Hỏa',
    rarity: 'rare',
    category: 'sprite',
    description: 'Triệu hồi Tinh Linh ném cầu lửa phát nổ diện rộng hỗ trợ chiến đấu.',
    maxStacks: 2,
    accentColor: '#fbbf24',
  },
  fountain_of_life: {
    id: 'fountain_of_life',
    name: 'Suối Nguồn Sinh Mệnh',
    rarity: 'rare',
    category: 'stat',
    description: 'Tăng +25% Máu Tối Đa và lập tức hồi phục 40% HP.',
    maxStacks: 4,
    accentColor: '#4ade80',
  },

  // === COMMON SKILLS ===
  bouncy_wall: {
    id: 'bouncy_wall',
    name: 'Đạn Bật Tường',
    rarity: 'common',
    category: 'weapon',
    description: 'Đạn bật nảy lại khi chạm tường và cột đá đấu trường.',
    maxStacks: 1,
    accentColor: '#f59e0b',
  },
  rear_arrow: {
    id: 'rear_arrow',
    name: 'Tên Bảo Vệ Phía Sau',
    rarity: 'common',
    category: 'weapon',
    description: 'Bắn thêm 1 mũi tên về phía sau lưng để phòng thủ kẻ địch áp sát.',
    maxStacks: 1,
    accentColor: '#818cf8',
  },
  orbit_orbs: {
    id: 'orbit_orbs',
    name: 'Cầu Nguyên Tố Xoay',
    rarity: 'common',
    category: 'circle',
    description: 'Triệu hồi 2 Cầu Năng Lượng xoay quanh bảo vệ và gây sát thương.',
    maxStacks: 3,
    accentColor: '#34d399',
  },
  crit_mastery: {
    id: 'crit_mastery',
    name: 'Tập Trung Chí Mạng',
    rarity: 'common',
    category: 'stat',
    description: 'Tăng +12% Tỷ lệ Chí Mạng và +35% Sát thương Chí Mạng.',
    maxStacks: 4,
    accentColor: '#facc15',
  },
  bloodthirst: {
    id: 'bloodthirst',
    name: 'Hút Máu Diệt Quái',
    rarity: 'common',
    category: 'stat',
    description: 'Hồi sinh lực ngay lập tức mỗi khi tiêu diệt được kẻ địch.',
    maxStacks: 3,
    accentColor: '#f43f5e',
  },
};

export const SKILL_BUILD_TAG_META = {
  aoe: { label: 'Dọn Nhóm', shortDesc: 'Tối ưu quét bầy quái đông' },
  boss: { label: 'Đánh Boss', shortDesc: 'Tập trung dồn sát thương đơn mục tiêu' },
  sustain: { label: 'Sinh Tồn', shortDesc: 'Tăng máu, khiên và hồi phục ổn định' },
  hybrid: { label: 'Linh Hoạt', shortDesc: 'Tăng sức mạnh toàn diện cho mọi hướng build' },
} as const;

const SKILL_BUILD_TAG_MAP: Record<SkillId, 'aoe' | 'boss' | 'sustain' | 'hybrid'> = {
  warriors_soul: 'boss',
  power_trio: 'hybrid',
  multishot: 'boss',
  super_meteor: 'aoe',
  sacred_protection: 'sustain',
  diag_arrow: 'aoe',
  tracking_eye: 'boss',
  super_blaze: 'aoe',
  super_bolt: 'aoe',
  super_freeze: 'boss',
  super_circle: 'aoe',
  twin_strike: 'boss',
  laser_sprite: 'boss',
  revive: 'sustain',
  atk_boost: 'boss',
  aspd_boost: 'boss',
  front_arrow: 'boss',
  ricochet: 'aoe',
  pierce: 'aoe',
  fire_arrow: 'aoe',
  lightning_arrow: 'aoe',
  ice_arrow: 'boss',
  venom_arrow: 'boss',
  flying_swords: 'boss',
  meteor_shower: 'aoe',
  bomb_sprite: 'aoe',
  fountain_of_life: 'sustain',
  bouncy_wall: 'aoe',
  rear_arrow: 'aoe',
  orbit_orbs: 'aoe',
  crit_mastery: 'boss',
  bloodthirst: 'sustain',
};

for (const skill of Object.values(SKILLS_CATALOG)) {
  skill.buildTag = SKILL_BUILD_TAG_MAP[skill.id];
}

export const ALL_SKILLS_LIST: SkillDefinition[] = Object.values(SKILLS_CATALOG);

const RARITY_WEIGHT: Record<SkillRarity, number> = {
  common: 36,
  rare: 34,
  epic: 21,
  legend: 9,
};

export interface SkillRollContext {
  chapterId?: number;
  stage?: number;
  isValkyrie?: boolean;
  rng?: () => number;
}

function pickWeightedFromPool(
  pool: SkillDefinition[],
  rng: () => number
): SkillDefinition | null {
  if (pool.length === 0) return null;
  const totalWeight = pool.reduce((sum, s) => sum + RARITY_WEIGHT[s.rarity], 0);
  let r = rng() * totalWeight;
  for (let i = 0; i < pool.length; i++) {
    r -= RARITY_WEIGHT[pool[i].rarity];
    if (r <= 0) return pool[i];
  }
  return pool[0];
}

// Chapter 1 Valkyrie milestones (Stages 2, 6, 10) guarantee clear build identity choices:
// Card 1: AoE / Mob-Clear pillar, Card 2: Single-Target Boss pillar, Card 3: Sustain / Flex pillar.
const CH1_VALKYRIE_PILLARS: Record<
  number,
  { aoe: SkillId[]; boss: SkillId[]; third: SkillId[] }
> = {
  2: {
    aoe: ['ricochet', 'diag_arrow', 'lightning_arrow', 'pierce'],
    boss: ['front_arrow', 'ice_arrow', 'crit_mastery', 'venom_arrow'],
    third: ['fountain_of_life', 'bloodthirst', 'atk_boost', 'aspd_boost'],
  },
  6: {
    aoe: ['super_bolt', 'diag_arrow', 'super_blaze', 'meteor_shower', 'bomb_sprite'],
    boss: ['tracking_eye', 'multishot', 'super_freeze', 'twin_strike', 'atk_boost'],
    third: ['sacred_protection', 'fountain_of_life', 'power_trio', 'aspd_boost'],
  },
  10: {
    aoe: ['super_meteor', 'super_bolt', 'super_circle', 'diag_arrow'],
    boss: ['multishot', 'warriors_soul', 'tracking_eye', 'super_freeze'],
    third: ['sacred_protection', 'revive', 'power_trio', 'atk_boost'],
  },
};

export function rollSkillChoices(
  currentStacks: Partial<Record<SkillId, number>>,
  count = 3,
  minRarity?: SkillRarity,
  context?: SkillRollContext
): SkillDefinition[] {
  const rng = context?.rng ?? Math.random;
  const rankOrder: SkillRarity[] = ['common', 'rare', 'epic', 'legend'];
  const minRankIdx = minRarity ? rankOrder.indexOf(minRarity) : 0;

  const isEligible = (skill: SkillDefinition, respectMinRarity = true) =>
    (currentStacks[skill.id] ?? 0) < skill.maxStacks &&
    (!respectMinRarity || rankOrder.indexOf(skill.rarity) >= minRankIdx);

  const picked: SkillDefinition[] = [];
  const pickedIds = new Set<SkillId>();

  // Chapter 1 Valkyrie Stages 2/6/10: guarantee 1 AoE + 1 Boss + 1 Sustain/Flex meaningful choice
  if (
    context?.isValkyrie &&
    context.chapterId === 1 &&
    context.stage &&
    CH1_VALKYRIE_PILLARS[context.stage] &&
    count >= 3
  ) {
    const pillars = CH1_VALKYRIE_PILLARS[context.stage];
    const lanes = [pillars.aoe, pillars.boss, pillars.third];
    for (const laneIds of lanes) {
      const lanePool = laneIds
        .map((id) => SKILLS_CATALOG[id])
        .filter((s) => s && !pickedIds.has(s.id) && isEligible(s, false));
      const chosen = pickWeightedFromPool(lanePool, rng);
      if (chosen) {
        picked.push(chosen);
        pickedIds.add(chosen.id);
      }
    }
  }

  const remaining = Object.values(SKILLS_CATALOG).filter(
    (skill) => !pickedIds.has(skill.id) && isEligible(skill, true)
  );

  while (picked.length < count && remaining.length > 0) {
    const chosen = pickWeightedFromPool(remaining, rng);
    if (!chosen) break;
    picked.push(chosen);
    pickedIds.add(chosen.id);
    const idx = remaining.findIndex((s) => s.id === chosen.id);
    if (idx >= 0) remaining.splice(idx, 1);
  }

  return picked;
}

export const WHEEL_OUTCOMES: WheelOutcome[] = [
  { label: '+150 Vàng', kind: 'gold', amount: 150, color: '#fbbf24' },
  { label: '+15 Ngọc Hồn', kind: 'gems', amount: 15, color: '#c084fc' },
  { label: 'Hồi 65% HP', kind: 'heal', amount: 65, color: '#34d399' },
  { label: '+20% Công Lực', kind: 'atk', amount: 20, color: '#f97316' },
  { label: '+260 Vàng', kind: 'gold', amount: 260, color: '#f59e0b' },
  { label: '+25 Ngọc Hồn', kind: 'gems', amount: 25, color: '#a855f7' },
];

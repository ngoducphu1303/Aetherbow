import { PityState, Rarity, RuneDefinition, RuneId, RuneInstance } from '../types/game';
import { normalizePity } from './liveOpsData';

export const RUNES_CATALOG: Record<RuneId, RuneDefinition> = {
  rune_flame: {
    id: 'rune_flame',
    name: 'Hỏa Độc Ấn (Flame-Poison Seal)',
    category: 'enhancement',
    archetype: 'Nguyên Tố',
    color: '#ef4444',
    description: 'Tăng +60% sát thương Cháy & Độc và tăng tỷ lệ Chí mạng lên kẻ địch dính trạng thái.',
    atkBonusPct: 0.08,
    hpBonusPct: 0.04,
    critBonus: 0.03,
  },
  rune_frost: {
    id: 'rune_frost',
    name: 'Băng Lôi Ấn (Frost-Thunder Seal)',
    category: 'enhancement',
    archetype: 'Nguyên Tố',
    color: '#67e8f9',
    description: 'Kẻ địch bị Đóng Băng nhận thêm +30% mọi sát thương và kích nổ Sét lan mạnh hơn.',
    atkBonusPct: 0.08,
    hpBonusPct: 0.04,
    critBonus: 0.04,
  },
  sawblade_circle: {
    id: 'sawblade_circle',
    name: 'Cầu Xoay Lưỡi Cưa (Sawblade Circle)',
    category: 'enhancement',
    archetype: 'Cầu Xoay',
    color: '#f43f5e',
    description: 'Tăng +55% sát thương Cầu Xoay và kế thừa 100% Tỷ lệ Chí mạng vũ khí.',
    atkBonusPct: 0.07,
    hpBonusPct: 0.05,
    critBonus: 0.04,
  },
  giant_meteor: {
    id: 'giant_meteor',
    name: 'Đại Thiên Thạch (Giant Meteor)',
    category: 'enhancement',
    archetype: 'Thiên Thạch',
    color: '#f59e0b',
    description: 'Thiên Thạch giáng xuống có vùng nổ lớn hơn và gây thêm +60% sát thương.',
    atkBonusPct: 0.09,
    hpBonusPct: 0.03,
    critBonus: 0.02,
  },
  arrow_rain: {
    id: 'arrow_rain',
    name: 'Mưa Tên Tinh Hà (Arrow Rain)',
    category: 'ability',
    archetype: 'Vũ Khí',
    color: '#38bdf8',
    description: 'Tăng +15% Tốc độ bắn vũ khí chính và định kỳ trút Mưa Tên lên nhóm quái.',
    atkBonusPct: 0.06,
    hpBonusPct: 0.04,
    critBonus: 0.05,
  },
  sword_of_time: {
    id: 'sword_of_time',
    name: 'Kiếm Thời Gian (Sword of Time)',
    category: 'ability',
    archetype: 'Phi Kiếm',
    color: '#22d3ee',
    description: 'Khởi đầu trận triệu hồi Phi Kiếm tự động truy kích kẻ địch mỗi 1.8 giây.',
    atkBonusPct: 0.07,
    hpBonusPct: 0.04,
    critBonus: 0.03,
  },
  healing_sprite: {
    id: 'healing_sprite',
    name: 'Tinh Linh Trị Liệu (Healing Sprite)',
    category: 'ability',
    archetype: 'Tinh Linh',
    color: '#4ade80',
    description: 'Triệu hồi Tinh Linh hộ vệ bắn tia ánh sáng và hồi nhẹ sinh lực khi tiêu diệt quái.',
    atkBonusPct: 0.04,
    hpBonusPct: 0.1,
    critBonus: 0.02,
  },
  rootguard: {
    id: 'rootguard',
    name: 'Khiên Cổ Thụ (Rootguard)',
    category: 'enhancement',
    archetype: 'Phòng Thủ',
    color: '#10b981',
    description: 'Tăng +12% Máu tối đa và nhận +20% Max HP Khiên Khởi Đầu mỗi phòng.',
    atkBonusPct: 0.03,
    hpBonusPct: 0.12,
    critBonus: 0.02,
  },
  ability_circle: {
    id: 'ability_circle',
    name: 'Ngọc Cầu Xoay (Circle Rune)',
    category: 'ability',
    archetype: 'Cầu Xoay',
    color: '#34d399',
    description: 'Vào trận có sẵn 2 Cầu Năng Lượng xoay quanh bảo vệ và gây sát thương cận chiến.',
    atkBonusPct: 0.06,
    hpBonusPct: 0.06,
    critBonus: 0.02,
  },
  rune_valkyrie: {
    id: 'rune_valkyrie',
    name: 'Phước Lành Valkyrie (Revive Blessing)',
    category: 'blessing',
    archetype: 'Phước Lành',
    color: '#fde047',
    description: 'Tăng +8% toàn bộ chỉ số và ban 1 lần Miễn Tử Hồi Sinh (50% HP) trong lượt chơi.',
    atkBonusPct: 0.08,
    hpBonusPct: 0.08,
    critBonus: 0.04,
  },
  star_of_fury: {
    id: 'star_of_fury',
    name: 'Sao Cuồng Nộ (Star of Fury)',
    category: 'ability',
    archetype: 'Thiên Thạch',
    color: '#ef4444',
    description: 'Khi HP dưới 60%, tăng +25% Sát thương và tự động gọi Thiên Thạch giáng xuống.',
    atkBonusPct: 0.1,
    hpBonusPct: 0.05,
    critBonus: 0.03,
  },
  equinox_bloom: {
    id: 'equinox_bloom',
    name: 'Hoa Phân Nhật (Equinox Bloom)',
    category: 'ability',
    archetype: 'Chí Mạng',
    color: '#f472b6',
    description: 'Tăng mạnh Tỷ lệ Chí mạng (+8%) và Sát thương Chí mạng (+25%).',
    atkBonusPct: 0.06,
    hpBonusPct: 0.04,
    critBonus: 0.08,
  },
};

export const ALL_RUNES_LIST = Object.values(RUNES_CATALOG);

export function rollRuneChest(isPremium: boolean, forceMinRarity?: Rarity): RuneInstance {
  const def = ALL_RUNES_LIST[Math.floor(Math.random() * ALL_RUNES_LIST.length)];
  const r = Math.random();
  let rarity = Rarity.COMMON;
  if (isPremium) {
    if (r < 0.14) rarity = Rarity.LEGENDARY;
    else if (r < 0.5) rarity = Rarity.EPIC;
    else rarity = Rarity.RARE;
  } else {
    if (r < 0.08) rarity = Rarity.EPIC;
    else if (r < 0.4) rarity = Rarity.RARE;
    else rarity = Rarity.COMMON;
  }
  if (forceMinRarity) {
    const order = [Rarity.COMMON, Rarity.RARE, Rarity.EPIC, Rarity.LEGENDARY, Rarity.MYTHIC];
    if (order.indexOf(rarity) < order.indexOf(forceMinRarity)) {
      rarity = forceMinRarity;
    }
  }
  return {
    uid: `rune_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    runeId: def.id,
    rarity,
  };
}

export function rollRuneChestBatch(
  isPremium: boolean,
  count: number,
  currentPity?: Partial<PityState>
): { items: RuneInstance[]; nextPity: PityState } {
  const pity = normalizePity(currentPity);
  const items: RuneInstance[] = [];
  let hasRarePlus = false;

  for (let i = 0; i < count; i++) {
    if (isPremium) {
      const needEpic = pity.runeRollsSinceEpic >= 9;
      const item = rollRuneChest(true, needEpic ? Rarity.EPIC : undefined);
      if (item.rarity === Rarity.EPIC || item.rarity === Rarity.LEGENDARY || item.rarity === Rarity.MYTHIC) {
        pity.runeRollsSinceEpic = 0;
      } else {
        pity.runeRollsSinceEpic++;
      }
      items.push(item);
    } else {
      const forceRare = count >= 10 && i === count - 1 && !hasRarePlus;
      const item = rollRuneChest(false, forceRare ? Rarity.RARE : undefined);
      if (item.rarity !== Rarity.COMMON) hasRarePlus = true;
      items.push(item);
    }
  }

  return { items, nextPity: pity };
}

import { HeroDefinition, HeroId } from '../types/game';

/**
 * Normalized Hero Balance Envelope (0-star baseline):
 * - All heroes sit within a deliberate early-game envelope (ATK 48–56, HP 195–225)
 *   so no hero breaks Chapter 1–3 pacing at 0★ while preserving distinct mechanical kits.
 * - Unlock costs align cleanly with the rebalanced Ch.1–3 Gold/Gem economy.
 */
export type PlayableHeroId = Exclude<HeroId, 'artemis' | 'hatsune_miku'>;
export const DEFAULT_HERO_ID: PlayableHeroId = 'aurelia';

export function isPlayableHeroId(value: unknown): value is PlayableHeroId {
  return value === 'aurelia' || value === 'bellona' || value === 'sylvia' || value === 'celeste';
}

export function normalizePlayableHeroId(value: unknown): PlayableHeroId {
  return isPlayableHeroId(value) ? value : DEFAULT_HERO_ID;
}

export const HEROES: HeroDefinition[] = [
  {
    id: 'aurelia',
    name: 'Aurelia',
    rarity: 'Legendary',
    title: 'Nữ Hoàng Thái Dương Sư Tử',
    skillName: 'Ấn Quang Thái Dương',
    ultName: 'Thiên Quang Nhật Luân',
    ultDesc:
      'Triệu hồi Vành Nhật Hoa Hoàng Kim phát nổ 260% ATK, phóng 12 mũi tên Thái Dương truy kích và cường hóa +35% tốc bắn trong 5 giây.',
    role: 'Bùng Nổ Thái Dương & Tích Tụ Nhật Hoa',
    roleTag: 'aoe',
    unlockChapterReq: 0,
    passiveDesc:
      'Mỗi phát bắn thứ 3 kích nổ Ấn Quang Thái Dương gây 145% ATK diện rộng quanh mục tiêu và hồi 4% khiên ánh dương.',
    bonusAtk: 55,
    bonusHp: 218,
    unlockGold: 0,
    unlockGems: 0,
    accentHex: 0xf59e0b,
    cloakHex: 0x9a3412,
    hairHex: 0xfde68a,
    eyeColor: '#f59e0b',
    cheekColor: '#fb923c',
    crownStyle: 'cleo_crown',
  },
  {
    id: 'bellona',
    name: 'Bellona',
    rarity: 'Legendary',
    title: 'Chiến Nữ Hỏa Sơn',
    skillName: 'Hỏa Mạch',
    ultName: 'Phán Quyết Hỏa Sơn',
    ultDesc: 'Gây 240% ATK quanh Bellona và thiêu đốt địch trong vùng trúng chiêu.',
    role: 'Hỏa Công Diện Rộng',
    roleTag: 'aoe',
    unlockChapterReq: 2,
    passiveDesc: 'Dùng Hỏa Mạch để giật sét qua nhiều mục tiêu trước khi kết liễu bằng Phán Quyết Hỏa Sơn.',
    bonusAtk: 54, bonusHp: 220, unlockGold: 0, unlockGems: 0,
    accentHex: 0xff682e, cloakHex: 0x991b1b, hairHex: 0xa22d20,
    eyeColor: '#ffc062', cheekColor: '#fb7185', crownStyle: 'ranger_band',
  },
  {
    id: 'sylvia',
    name: 'Sylvia',
    rarity: 'Legendary',
    title: 'Thánh Nữ Ngọc Lục Bảo',
    skillName: 'Địa Mạch Lục Bảo',
    ultName: 'Thánh Địa Kim Ngưu',
    ultDesc: 'Triệu hồi Pháp Trận Ngọc Lục Bảo gây 255% ATK quanh Sylvia, kết tinh làm choáng địch và tạo khiên hộ thể 18% HP.',
    role: 'Khống Chế Ngọc Bảo & Bền Bỉ',
    roleTag: 'sustain',
    unlockChapterReq: 3,
    passiveDesc: 'Khai mở sức mạnh Thánh Địa Kim Ngưu giúp tích tụ khiên ngọc và tung Địa Mạch Lục Bảo xuyên phá đội hình địch.',
    bonusAtk: 56,
    bonusHp: 230,
    unlockGold: 0,
    unlockGems: 0,
    accentHex: 0x10b981,
    cloakHex: 0x065f46,
    hairHex: 0xd1fae5,
    eyeColor: '#34d399',
    cheekColor: '#6ee7b7',
    crownStyle: 'rolla_tiara',
  },
  {
    id: 'celeste',
    name: 'Celeste',
    rarity: 'Legendary',
    title: 'Thánh Nữ Song Tử',
    skillName: 'Song Kính Tinh Tú',
    ultName: 'Kính Giới Song Tử',
    ultDesc:
      'Khai mở Song Kính Tinh Tú phát nổ 270% ATK quanh Celeste, phóng 14 mảnh gương tinh vân truy kích địch và tạo khiên tinh tú 16% HP.',
    role: 'Song Kính Tinh Tú & Cơ Động',
    roleTag: 'hybrid',
    unlockChapterReq: 4,
    passiveDesc:
      'Khai mở sức mạnh Đấu Trường Song Tử giúp tăng bạo kích, tung Song Kính Tinh Tú phản xạ sát thương qua đội hình địch.',
    bonusAtk: 58,
    bonusHp: 226,
    unlockGold: 0,
    unlockGems: 0,
    accentHex: 0x38bdf8,
    cloakHex: 0x312e81,
    hairHex: 0xe0f2fe,
    eyeColor: '#38bdf8',
    cheekColor: '#c4b5fd',
    crownStyle: 'rolla_tiara',
  },
];

const playableHeroes = Object.fromEntries(HEROES.map((hero) => [hero.id, hero])) as Record<PlayableHeroId, HeroDefinition>;

// Historical profile and run records can still contain either retired ID.
export const HERO_MAP: Record<HeroId, HeroDefinition> = {
  ...playableHeroes,
  artemis: playableHeroes[DEFAULT_HERO_ID],
  hatsune_miku: playableHeroes[DEFAULT_HERO_ID],
};

export function getHeroStarUpgradeCost(currentStar: number): { gold: number; gems: number } {
  return {
    gold: 180 * (currentStar + 1),
    gems: 8 * (currentStar + 1),
  };
}

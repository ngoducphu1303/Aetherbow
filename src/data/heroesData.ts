import { HeroDefinition, HeroId } from '../types/game';

/**
 * Normalized Hero Balance Envelope (0-star baseline):
 * - All heroes sit within a deliberate early-game envelope (ATK 48–56, HP 195–225)
 *   so no hero breaks Chapter 1–3 pacing at 0★ while preserving distinct mechanical kits.
 * - Unlock costs align cleanly with the rebalanced Ch.1–3 Gold/Gem economy.
 */
export const HEROES: HeroDefinition[] = [
  {
    id: 'artemis',
    name: 'Alice',
    rarity: 'Legendary',
    title: 'Nữ Thần Săn Trăng Bạc',
    skillName: 'Silvermoon Hunt',
    ultName: 'Mưa Tên Trăng Bạc',
    ultDesc:
      'Phóng vòng tròn 14 mũi tên Trăng Bạc truy kích kèm tia Nguyệt Trảm giáng xuống toàn bộ mục tiêu.',
    role: 'Ấn Ký Con Mồi & Chim Ưng Ánh Trăng',
    roleTag: 'boss',
    unlockChapterReq: 0,
    passiveDesc:
      'Đòn đánh khắc Ấn Ký (+20% sát thương nhận vào) và triệu hồi tia Trăng Bạc giáng xuống kẻ địch bị đánh dấu mỗi 2.4s.',
    bonusAtk: 54,
    bonusHp: 215,
    unlockGold: 0,
    unlockGems: 0,
    accentHex: 0x10b981,
    cloakHex: 0x14532d,
    hairHex: 0xe2e8f0,
    eyeColor: '#d946ef',
    cheekColor: '#9333ea',
    crownStyle: 'crescent',
  },
  {
    id: 'hatsune_miku',
    name: 'Hatsune Miku',
    rarity: 'Epic',
    title: 'Ca Sĩ Ảo',
    skillName: 'Nhịp Điệu Sân Khấu',
    ultName: 'Cao Trào Sân Khấu',
    ultDesc: 'Gây 210% ATK trong phạm vi 6,2m, đẩy lùi quái thường và tăng 45% tốc bắn, 25% chí mạng trong 5 giây.',
    role: 'Tăng Tốc Bắn Sau Chí Mạng',
    roleTag: 'hybrid',
    unlockChapterReq: 0,
    passiveDesc: 'Nhận thêm 12% EXP. Đòn chí mạng tăng 15% tốc bắn trong 5 giây. Sau khi chịu đòn, phát tiếp theo chắc chắn chí mạng.',
    bonusAtk: 50,
    bonusHp: 210,
    unlockGold: 0,
    unlockGems: 0,
    accentHex: 0x39c5bb,
    cloakHex: 0x172b36,
    hairHex: 0x39c5bb,
    eyeColor: '#39c5bb',
    cheekColor: '#f472b6',
    crownStyle: 'ranger_band',
  },
];

export const HERO_MAP: Record<HeroId, HeroDefinition> = Object.fromEntries(
  HEROES.map((h) => [h.id, h])
) as Record<HeroId, HeroDefinition>;

export function getHeroStarUpgradeCost(currentStar: number): { gold: number; gems: number } {
  return {
    gold: 180 * (currentStar + 1),
    gems: 8 * (currentStar + 1),
  };
}

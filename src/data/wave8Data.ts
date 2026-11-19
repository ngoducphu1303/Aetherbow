import {
  BloodMoonMilestone,
  BloodMoonState,
  DispatchMissionDef,
  DispatchSlotState,
  DispatchState,
  FirstTopUpState,
  FirstTopUpTier,
  HotFlashBundle,
  MountDefinition,
  MountId,
  SaveData,
  WeaponAuraDefinition,
  WeaponAuraId,
  WishPoolState,
  WishTargetItem,
} from '../types/game';
import { getTodayKey } from './questsData';

export const MAX_MOUNT_LEVEL = 15;
export const MAX_WEAPON_AURA_LEVEL = 10;

export const ZODIAC_MOUNTS: MountDefinition[] = [
  {
    id: 'azure_dragon',
    name: 'Thanh Long',
    badge: 'HIẾM · RỒNG XANH',
    rarity: 'Hiếm',
    desc: 'Rồng vảy xanh với sừng ngà. Nhận miễn phí để cưỡi trong sảnh và khi ra trận.',
    bodyHex: 0x37647f,
    armorHex: 0xd8b990,
    maneHex: 0x9c4936,
    glowHex: 0x93d8ef,
    baseAtk: 34,
    baseHp: 220,
    baseMoveSpeed: 0.1,
    baseDr: 0.03,
    atkPerLv: 9,
    hpPerLv: 55,
    unlockGems: 0,
    unlockShards: 0,
  },
  {
    id: 'aries_steed',
    name: 'Chiến Mã Bạch Dương',
    badge: 'HIẾM · TỐC ĐỘ',
    rarity: 'Hiếm',
    desc: 'Tuấn mã giáp vàng chòm Bạch Dương giúp tăng tốc độ di chuyển và công lực cơ bản.',
    bodyHex: 0xf1f5f9,
    armorHex: 0xf59e0b,
    maneHex: 0xfbbf24,
    glowHex: 0xfde047,
    baseAtk: 34,
    baseHp: 220,
    baseMoveSpeed: 0.1,
    baseDr: 0.03,
    atkPerLv: 9,
    hpPerLv: 55,
    unlockGems: 90,
    unlockShards: 18,
  },
  {
    id: 'celestial_leo',
    name: 'Sư Tử Tinh Quân',
    badge: 'SỬ THI · HỎA KIM',
    rarity: 'Sử Thi',
    desc: 'Hùng sư rực lửa Tinh Giới mang giáp hoàng kim, tăng mạnh Công Kích và Giảm Sát Thương.',
    bodyHex: 0xd97706,
    armorHex: 0xfef08a,
    maneHex: 0xf97316,
    glowHex: 0xfb923c,
    baseAtk: 68,
    baseHp: 420,
    baseMoveSpeed: 0.14,
    baseDr: 0.05,
    atkPerLv: 15,
    hpPerLv: 92,
    unlockGems: 165,
    unlockShards: 32,
  },
  {
    id: 'frost_unicorn',
    name: 'Kỳ Lân Băng Thiên',
    badge: 'HUYỀN THOẠI · BĂNG NGỌC',
    rarity: 'Huyền Thoại',
    desc: 'Thần thú một sừng kết tinh từ Băng Tinh Cực Bắc, gia tăng Sinh Lực dồi dào và tốc biến.',
    bodyHex: 0xe0f2fe,
    armorHex: 0x38bdf8,
    maneHex: 0x7dd3fc,
    glowHex: 0x22d3ee,
    baseAtk: 108,
    baseHp: 680,
    baseMoveSpeed: 0.18,
    baseDr: 0.07,
    atkPerLv: 22,
    hpPerLv: 135,
    unlockGems: 260,
    unlockShards: 48,
  },
  {
    id: 'crimson_wyrm',
    name: 'Huyết Long Trăng Máu',
    badge: 'THẦN THOẠI · ĐẾ VƯƠNG',
    rarity: 'Thần Thoại',
    desc: 'Cổ long thức tỉnh từ Đêm Trăng Máu, bùng phát uy áp công kích hủy diệt toàn chiến trường.',
    bodyHex: 0x7f1d1d,
    armorHex: 0xfbbf24,
    maneHex: 0xf43f5e,
    glowHex: 0xfb7185,
    baseAtk: 165,
    baseHp: 1020,
    baseMoveSpeed: 0.22,
    baseDr: 0.1,
    atkPerLv: 30,
    hpPerLv: 185,
    unlockGems: 380,
    unlockShards: 68,
  },
];

export const MOUNT_MAP: Record<MountId, MountDefinition> = ZODIAC_MOUNTS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<MountId, MountDefinition>
);

export function getMountAppearance(save: SaveData, previewMountId?: MountId | null) {
  if (previewMountId !== undefined) return { mountId: previewMountId, astralSteedId: null };

  const mountId = save.equippedMountId && save.unlockedMounts?.includes(save.equippedMountId)
    ? save.equippedMountId
    : null;
  const astralSteedId = save.equippedAstralSteedId && save.unlockedAstralSteeds?.includes(save.equippedAstralSteedId)
    ? save.equippedAstralSteedId
    : null;
  const showZodiac = mountId && (!astralSteedId || save.mountAppearance === 'zodiac' ||
    (save.mountAppearance !== 'astral' && mountId === 'azure_dragon'));
  return showZodiac ? { mountId, astralSteedId: null } : { mountId: null, astralSteedId };
}

export function getMountStats(mountId: MountId, level: number) {
  const def = MOUNT_MAP[mountId];
  const lv = Math.max(1, Math.min(MAX_MOUNT_LEVEL, level));
  return {
    atk: def.baseAtk + (lv - 1) * def.atkPerLv,
    hp: def.baseHp + (lv - 1) * def.hpPerLv,
    moveSpeed: def.baseMoveSpeed + (lv - 1) * 0.008,
    dr: Math.min(0.18, def.baseDr + (lv - 1) * 0.005),
  };
}

export function getMountUpgradeCost(level: number) {
  const lv = Math.max(1, level);
  return {
    shards: 8 + lv * 4,
    gold: 180 + lv * 120,
  };
}

export const WEAPON_AURAS: WeaponAuraDefinition[] = [
  {
    id: 'none',
    name: 'Nguyên Bản Không Hào Quang',
    badge: 'MẶC ĐỊNH',
    rarity: 'Cơ Bản',
    desc: 'Giữ nguyên trạng thái vũ khí thuần túy không kèm vòng luân thức tỉnh.',
    primaryHex: 0x94a3b8,
    secondaryHex: 0xcbd5e1,
    baseAtkPct: 0,
    baseCritDmg: 0,
    atkPctPerLv: 0,
    critDmgPerLv: 0,
    unlockGems: 0,
    unlockCrystals: 0,
  },
  {
    id: 'solar_flare',
    name: 'Nhật Luân Viêm Dương',
    badge: 'SỬ THI · HỎA ẤN',
    rarity: 'Sử Thi',
    desc: 'Vòng luân lửa mặt trời xoay quanh vũ khí, cường hóa %ATK và Sát Thương Chí Mạng.',
    primaryHex: 0xf59e0b,
    secondaryHex: 0xf97316,
    baseAtkPct: 0.08,
    baseCritDmg: 0.18,
    atkPctPerLv: 0.02,
    critDmgPerLv: 0.04,
    unlockGems: 95,
    unlockCrystals: 12,
  },
  {
    id: 'astral_prism',
    name: 'Lăng Kính Tinh Tú',
    badge: 'HUYỀN THOẠI · BĂNG QUANG',
    rarity: 'Huyền Thoại',
    desc: 'Pháp trận tinh thể xanh lam bao bọc vũ khí, tăng mạnh sức xuyên phá và bạo kích.',
    primaryHex: 0x38bdf8,
    secondaryHex: 0xa855f7,
    baseAtkPct: 0.14,
    baseCritDmg: 0.3,
    atkPctPerLv: 0.025,
    critDmgPerLv: 0.055,
    unlockGems: 180,
    unlockCrystals: 24,
  },
  {
    id: 'void_eclipse',
    name: 'Huyết Nguyệt Thức Tỉnh',
    badge: 'THẦN THOẠI · TỐI THƯỢNG',
    rarity: 'Thần Thoại',
    desc: 'Ấn ký Nhật Thực đỏ rực quay cuồng quanh tay vũ khí, kích phát uy lực tối thượng.',
    primaryHex: 0xf43f5e,
    secondaryHex: 0xfbbf24,
    baseAtkPct: 0.22,
    baseCritDmg: 0.45,
    atkPctPerLv: 0.032,
    critDmgPerLv: 0.075,
    unlockGems: 290,
    unlockCrystals: 38,
  },
];

export const WEAPON_AURA_MAP: Record<WeaponAuraId, WeaponAuraDefinition> = WEAPON_AURAS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<WeaponAuraId, WeaponAuraDefinition>
);

export function getWeaponAuraStats(auraId: WeaponAuraId, level: number) {
  const def = WEAPON_AURA_MAP[auraId] ?? WEAPON_AURAS[0];
  if (auraId === 'none') {
    return { atkPct: 0, critDmg: 0 };
  }
  const lv = Math.max(1, Math.min(MAX_WEAPON_AURA_LEVEL, level));
  return {
    atkPct: def.baseAtkPct + (lv - 1) * def.atkPctPerLv,
    critDmg: def.baseCritDmg + (lv - 1) * def.critDmgPerLv,
  };
}

export function getWeaponAuraUpgradeCost(level: number) {
  const lv = Math.max(1, level);
  return {
    crystals: 6 + lv * 3,
    gold: 210 + lv * 130,
  };
}

export const WISH_POOL_COST_GEMS = 22;
export const WISH_POOL_10_COST_GEMS = 198;
export const WISH_PITY_LIMIT = 30;

export const WISH_TARGET_CATALOG: WishTargetItem[] = [
  {
    id: 'wish_crimson_wyrm',
    kind: 'mount',
    refId: 'crimson_wyrm',
    name: 'Huyết Long Trăng Máu',
    badge: 'THÚ CƯỠI THẦN THOẠI · RATE-UP',
    desc: 'Tăng +165 ATK, +1020 HP, +22% Tốc Độ. Nếu đã sở hữu sẽ hoàn +30 Mảnh Thú Cưỡi.',
    accentColor: '#fb7185',
  },
  {
    id: 'wish_seraph_wing',
    kind: 'wing',
    refId: 'seraph_zodiac',
    name: 'Thánh Dực Seraph Hoàng Đạo',
    badge: 'CÁNH THẦN THOẠI · RATE-UP',
    desc: 'Đôi cánh 6 lông vàng rực gắn lưng 3D. Nếu đã sở hữu sẽ hoàn +28 Lông Vũ Tinh Tú.',
    accentColor: '#fbbf24',
  },
  {
    id: 'wish_dracoola',
    kind: 'hero',
    refId: 'dracoola',
    name: 'Chúa Tể Dracoola',
    badge: 'ANH HÙNG SSR · RATE-UP',
    desc: 'Chiêu mộ hoặc thăng sao ngay Anh Hùng Hút Máu Dracoola.',
    accentColor: '#c084fc',
  },
  {
    id: 'wish_s_gear',
    kind: 's_gear',
    refId: 's_tier',
    name: 'Rương Thánh Vật Hoàng Đạo [S]',
    badge: 'TRANG BỊ CẤP S · RATE-UP',
    desc: 'Chắc chắn nhận 1 Trang Bị Huyền Thoại bộ [S] kèm chỉ số phụ hiếm.',
    accentColor: '#38bdf8',
  },
];

export const WISH_MILESTONES = [
  { count: 10, rewardGems: 40, rewardShards: 8, rewardCrystals: 6, label: '10 Lượt Ước' },
  { count: 30, rewardGems: 100, rewardShards: 18, rewardCrystals: 14, label: '30 Lượt Ước' },
  { count: 60, rewardGems: 180, rewardShards: 30, rewardCrystals: 22, label: '60 Lượt Ước' },
];

export function normalizeWishPool(raw?: Partial<WishPoolState>): WishPoolState {
  const validIds = new Set(WISH_TARGET_CATALOG.map((t) => t.id));
  const selectedTargetId =
    raw?.selectedTargetId && validIds.has(raw.selectedTargetId)
      ? raw.selectedTargetId
      : WISH_TARGET_CATALOG[0].id;
  return {
    selectedTargetId,
    pityCount: Math.max(0, Math.min(WISH_PITY_LIMIT - 1, raw?.pityCount ?? 0)),
    totalWishes: Math.max(0, raw?.totalWishes ?? 0),
    claimedMilestones: Array.isArray(raw?.claimedMilestones) ? raw.claimedMilestones : [],
    recentLogs: Array.isArray(raw?.recentLogs) ? raw.recentLogs.slice(0, 8) : [],
  };
}

export interface WishRollOutcome {
  label: string;
  rarity: 'R' | 'SR' | 'SSR';
  isTargetHit: boolean;
  rewardKind: 'target' | 'gold' | 'star_dust' | 'mount_shards' | 'awaken_crystals' | 'wing_feathers' | 'epic_gear';
  amount: number;
}

export function rollWishPoolBatch(
  count: number,
  currentPity: number,
  targetName: string
): { outcomes: WishRollOutcome[]; nextPity: number } {
  let pity = Math.max(0, currentPity);
  const outcomes: WishRollOutcome[] = [];

  for (let i = 0; i < count; i++) {
    pity++;
    const guaranteed = pity >= WISH_PITY_LIMIT;
    const roll = Math.random();
    if (guaranteed || roll < 0.048) {
      // Hit SSR! 65% rate-up target, or 100% when guaranteed by pity
      const isTargetHit = guaranteed || Math.random() < 0.65;
      pity = 0;
      if (isTargetHit) {
        outcomes.push({
          label: `[SSR Rate-Up] ${targetName}`,
          rarity: 'SSR',
          isTargetHit: true,
          rewardKind: 'target',
          amount: 1,
        });
      } else {
        outcomes.push({
          label: '[SSR] Rương Nguyên Liệu Thần Thoại (+14 Mảnh & +10 Tinh Thể)',
          rarity: 'SSR',
          isTargetHit: false,
          rewardKind: 'mount_shards',
          amount: 14,
        });
      }
    } else if (roll < 0.28) {
      const srPick = Math.random();
      if (srPick < 0.34) {
        outcomes.push({
          label: '[SR] Trang Bị Sử Thi Tinh Giới',
          rarity: 'SR',
          isTargetHit: false,
          rewardKind: 'epic_gear',
          amount: 1,
        });
      } else if (srPick < 0.68) {
        outcomes.push({
          label: '[SR] +7 Tinh Thể Thức Tỉnh',
          rarity: 'SR',
          isTargetHit: false,
          rewardKind: 'awaken_crystals',
          amount: 7,
        });
      } else {
        outcomes.push({
          label: '[SR] +9 Lông Vũ Tinh Tú',
          rarity: 'SR',
          isTargetHit: false,
          rewardKind: 'wing_feathers',
          amount: 9,
        });
      }
    } else {
      const rPick = Math.random();
      if (rPick < 0.35) {
        outcomes.push({
          label: '[R] +4 Mảnh Thú Cưỡi',
          rarity: 'R',
          isTargetHit: false,
          rewardKind: 'mount_shards',
          amount: 4,
        });
      } else if (rPick < 0.7) {
        outcomes.push({
          label: '[R] +45 Bụi Tinh Tú',
          rarity: 'R',
          isTargetHit: false,
          rewardKind: 'star_dust',
          amount: 45,
        });
      } else {
        outcomes.push({
          label: '[R] +260 Vàng Hoàng Đạo',
          rarity: 'R',
          isTargetHit: false,
          rewardKind: 'gold',
          amount: 260,
        });
      }
    }
  }

  return { outcomes, nextPity: pity };
}

export const FIRST_TOPUP_TIERS: FirstTopUpTier[] = [
  {
    id: 'topup_tier_60',
    title: 'Túi Tinh Thạch Khởi Hành',
    subtitle: 'Nạp lần đầu nhận X2 thành 120 Ngọc Hồn + Mảnh Chiến Mã',
    badge: 'X2 NẠP ĐẦU · MỐC 1',
    priceLabel: '22.000đ',
    baseGems: 60,
    bonusGemsFirstTime: 60,
    topUpPoints: 60,
    bonusMountShards: 10,
    bonusAwakeningCrystals: 6,
    bonusSGear: false,
    accent: 'sky',
  },
  {
    id: 'topup_tier_180',
    title: 'Rương Thần Hồn Nhật Thực',
    subtitle: 'Nạp lần đầu nhận X2 thành 360 Ngọc Hồn + Tinh Thể Thức Tỉnh',
    badge: 'X2 NẠP ĐẦU · MỐC 2',
    priceLabel: '69.000đ',
    baseGems: 180,
    bonusGemsFirstTime: 180,
    topUpPoints: 180,
    bonusMountShards: 22,
    bonusAwakeningCrystals: 14,
    bonusSGear: false,
    accent: 'amber',
  },
  {
    id: 'topup_tier_380',
    title: 'Kho Báu Đế Vương Hoàng Đạo',
    subtitle: 'Nạp lần đầu X2 thành 760 Ngọc Hồn + Tặng Thánh Vật [S]!',
    badge: 'X2 NẠP ĐẦU · SIÊU HOT',
    priceLabel: '149.000đ',
    baseGems: 380,
    bonusGemsFirstTime: 380,
    topUpPoints: 380,
    bonusMountShards: 36,
    bonusAwakeningCrystals: 24,
    bonusSGear: true,
    accent: 'rose',
  },
];

export const HOT_FLASH_BUNDLES: HotFlashBundle[] = [
  {
    id: 'hot_bundle_mount_starter',
    title: 'Gói Kỵ Sĩ Bạch Dương (-65%)',
    subtitle: 'Mảnh Thú Cưỡi, Vé Ước Nguyện & Tinh Thể mở khóa Kỵ Sĩ nhanh!',
    badge: 'GIẢM SỐC -65%',
    discountLabel: 'GIÁ GỐC 160 NGỌC',
    originalGemsLabel: '160 Ngọc',
    costGems: 55,
    rewardGems: 0,
    rewardGold: 850,
    rewardMountShards: 20,
    rewardCrystals: 8,
    rewardWishTickets: 3,
    rewardFeathers: 10,
    topUpPoints: 65,
  },
  {
    id: 'hot_bundle_wish_x10',
    title: 'Gói Hồ Ước Nguyện Bùng Nổ (-55%)',
    subtitle: 'Trọn bộ 10 Vé Ước Nguyện + 20 Tinh Thể Thức Tỉnh Vũ Khí!',
    badge: 'HOT NHẤT TUẦN',
    discountLabel: 'GIÁ GỐC 260 NGỌC',
    originalGemsLabel: '260 Ngọc',
    costGems: 118,
    rewardGems: 35,
    rewardGold: 1400,
    rewardMountShards: 12,
    rewardCrystals: 20,
    rewardWishTickets: 10,
    rewardFeathers: 16,
    topUpPoints: 130,
  },
];

export function normalizeFirstTopUp(raw?: Partial<FirstTopUpState>): FirstTopUpState {
  return {
    claimedTierIds: Array.isArray(raw?.claimedTierIds) ? raw.claimedTierIds : [],
  };
}

export const MAX_DISPATCH_SLOTS = 3;
export const DISPATCH_SPEEDUP_GOLD = 90;

export const DISPATCH_MISSIONS: DispatchMissionDef[] = [
  {
    id: 'dispatch_star_patrol',
    title: 'Tuần Tra Vành Đai Tinh Tú',
    region: 'Cổng Bạch Dương',
    rank: 'A',
    durationSec: 30,
    rewardGold: 240,
    rewardGems: 10,
    rewardMountShards: 5,
    rewardCrystals: 3,
    rewardFeathers: 4,
    accentColor: '#38bdf8',
  },
  {
    id: 'dispatch_crystal_cavern',
    title: 'Khai Thác Mỏ Pha Lê Cổ',
    region: 'Hang Băng Thiên',
    rank: 'S',
    durationSec: 90,
    rewardGold: 480,
    rewardGems: 22,
    rewardMountShards: 10,
    rewardCrystals: 7,
    rewardFeathers: 8,
    accentColor: '#fbbf24',
  },
  {
    id: 'dispatch_blood_expedition',
    title: 'Thám Hiểm Thung Lũng Trăng Máu',
    region: 'Vực Nhật Thực',
    rank: 'SS',
    durationSec: 180,
    rewardGold: 920,
    rewardGems: 42,
    rewardMountShards: 18,
    rewardCrystals: 14,
    rewardFeathers: 14,
    accentColor: '#fb7185',
  },
];

export function getDispatchMissionDef(missionId: string | null): DispatchMissionDef | null {
  if (!missionId) return null;
  return DISPATCH_MISSIONS.find((m) => m.id === missionId) ?? null;
}

export function normalizeDispatchState(raw?: Partial<DispatchState>): DispatchState {
  const slots: DispatchSlotState[] = [];
  for (let i = 0; i < MAX_DISPATCH_SLOTS; i++) {
    const existing = raw?.slots?.[i];
    slots.push({
      slotIndex: i,
      missionId: existing?.missionId ?? null,
      heroId: existing?.heroId ?? null,
      startedAt: existing?.startedAt ?? 0,
      endsAt: existing?.endsAt ?? 0,
    });
  }
  return {
    slots,
    completedCount: Math.max(0, raw?.completedCount ?? 0),
  };
}

export const BLOOD_MOON_DURATION_SEC = 90;
export const BLOOD_MOON_MAX_DAILY_RUNS = 2;

export const BLOOD_MOON_MILESTONES: BloodMoonMilestone[] = [
  { score: 300, title: 'Dấu Ấn Trăng Máu I', rewardGems: 18, rewardMountShards: 6, rewardCrystals: 4, rewardFeathers: 6 },
  { score: 750, title: 'Thợ Săn Huyết Tinh II', rewardGems: 32, rewardMountShards: 10, rewardCrystals: 8, rewardFeathers: 10 },
  { score: 1300, title: 'Chiến Tướng Đêm Đỏ III', rewardGems: 52, rewardMountShards: 16, rewardCrystals: 12, rewardFeathers: 14 },
  { score: 2000, title: 'Chúa Tể Nhật Thực IV', rewardGems: 85, rewardMountShards: 24, rewardCrystals: 18, rewardFeathers: 20 },
  { score: 3000, title: 'Huyền Thoại Trăng Máu V', rewardGems: 135, rewardMountShards: 36, rewardCrystals: 28, rewardFeathers: 30 },
];

export function normalizeBloodMoon(raw?: Partial<BloodMoonState>): BloodMoonState {
  const today = getTodayKey();
  const sameDay = raw?.date === today;
  return {
    date: today,
    dailyRunsRemaining: sameDay
      ? Math.max(0, Math.min(BLOOD_MOON_MAX_DAILY_RUNS, raw?.dailyRunsRemaining ?? BLOOD_MOON_MAX_DAILY_RUNS))
      : BLOOD_MOON_MAX_DAILY_RUNS,
    bestScore: Math.max(0, raw?.bestScore ?? 0),
    totalClears: Math.max(0, raw?.totalClears ?? 0),
    claimedMilestones: Array.isArray(raw?.claimedMilestones) ? raw.claimedMilestones : [],
  };
}

export function countClaimableWave8Rewards(save: SaveData, now = Date.now()): number {
  let count = 0;
  const dispatch = normalizeDispatchState(save.dispatch);
  for (const slot of dispatch.slots) {
    if (slot.missionId && slot.endsAt > 0 && now >= slot.endsAt) count++;
  }
  const wish = normalizeWishPool(save.wishPool);
  for (const m of WISH_MILESTONES) {
    if (wish.totalWishes >= m.count && !wish.claimedMilestones.includes(m.count)) count++;
  }
  const bm = normalizeBloodMoon(save.bloodMoon);
  for (const m of BLOOD_MOON_MILESTONES) {
    if (bm.bestScore >= m.score && !bm.claimedMilestones.includes(m.score)) count++;
  }
  return count;
}

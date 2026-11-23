import {
  AstralSteedId,
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
    id: 'vulcan', name: 'Vulcan · Chiến Dương', badge: 'CHƯƠNG 2 · THÚ CƯỠI 3D', rarity: 'Huyền Thoại',
    desc: 'Chiến dương của lò rèn Bạch Dương, có chuyển động khung xương bốn chân.',
    bodyHex: 0x60291a, armorHex: 0xa72e25, maneHex: 0xf97316, glowHex: 0xffcf71,
    baseAtk: 46, baseHp: 280, baseMoveSpeed: 0.14, baseDr: 0.05,
    atkPerLv: 12, hpPerLv: 68, unlockGems: 0, unlockShards: 0,
  },
  {
    id: 'solarius',
    name: 'Solarius · Sư Tử Thái Dương',
    badge: 'CHƯƠNG 1 · HUYỀN THOẠI 3D',
    rarity: 'Huyền Thoại',
    desc: 'Chiến sư hoàng kim Solarius với khung xương tứ chi 3D chuyển động phi nước đại uy dũng trong Sảnh và Chiến Đấu.',
    bodyHex: 0xd97706,
    armorHex: 0xf59e0b,
    maneHex: 0xfde047,
    glowHex: 0xfef08a,
    baseAtk: 46,
    baseHp: 280,
    baseMoveSpeed: 0.14,
    baseDr: 0.05,
    atkPerLv: 12,
    hpPerLv: 68,
    unlockGems: 0,
    unlockShards: 0,
  },
];

export const MOUNT_MAP: Record<MountId, MountDefinition> = ZODIAC_MOUNTS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<MountId, MountDefinition>
);

export function getMountAppearance(
  save: SaveData,
  previewMountId?: MountId | null,
  previewAstralSteedId?: AstralSteedId | null
) {
  if (previewMountId !== undefined) return { mountId: previewMountId, astralSteedId: null };
  if (previewAstralSteedId === null) return { mountId: null, astralSteedId: null };

  const mountId = save.equippedMountId && save.unlockedMounts?.includes(save.equippedMountId)
    ? save.equippedMountId
    : null;
  return { mountId, astralSteedId: null };
}

export function getMountStats(mountId: MountId, level: number) {
  const def = MOUNT_MAP[mountId];
  if (!def) {
    return { atk: 0, hp: 0, moveSpeed: 0, dr: 0 };
  }
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

export const WEAPON_AURAS: WeaponAuraDefinition[] = [];

export const WEAPON_AURA_MAP: Record<WeaponAuraId, WeaponAuraDefinition> = WEAPON_AURAS.reduce(
  (acc, item) => {
    acc[item.id] = item;
    return acc;
  },
  {} as Record<WeaponAuraId, WeaponAuraDefinition>
);

export function getWeaponAuraStats(auraId: WeaponAuraId, level: number) {
  const def = WEAPON_AURA_MAP[auraId];
  if (!def || auraId === 'none') {
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
    id: 'wish_solarius',
    kind: 'mount',
    refId: 'solarius',
    name: 'Solarius · Sư Tử Thái Dương',
    badge: 'THÚ CƯỠI SOLARIUS · RATE-UP',
    desc: 'Cường hóa Thú Cưỡi Solarius (+30 Mảnh Thú Cưỡi nếu đã sở hữu).',
    accentColor: '#f59e0b',
  },
  {
    id: 'wish_solar_wing',
    kind: 'wing',
    refId: 'solar_zenith',
    name: 'Thần Dực Đỉnh Thái Dương',
    badge: 'CÁNH THẦN THOẠI · RATE-UP',
    desc: 'Đôi thần dực hoàng kim 3D Chương 1. Nếu đã sở hữu sẽ hoàn +28 Lông Vũ Tinh Tú.',
    accentColor: '#fbbf24',
  },
  {
    id: 'wish_hatsune_miku',
    kind: 'hero',
    refId: 'hatsune_miku',
    name: 'Hatsune Miku',
    badge: 'ANH HÙNG SSR · RATE-UP',
    desc: 'Thăng sao ngay cho Anh Hùng Hatsune Miku.',
    accentColor: '#39c5bb',
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
    subtitle: 'Nạp lần đầu nhận X2 thành 120 Ngọc Hồn + Mảnh Solarius',
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
    subtitle: 'Nạp lần đầu nhận X2 thành 360 Ngọc Hồn + Tinh Thể Hoàng Đạo',
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
    title: 'Gói Kỵ Sĩ Solarius (-65%)',
    subtitle: 'Mảnh Thú Cưỡi Solarius, Vé Ước Nguyện & Lông Vũ nâng cấp nhanh!',
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
    subtitle: 'Trọn bộ 10 Vé Ước Nguyện + 16 Lông Vũ Thần Dực!',
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

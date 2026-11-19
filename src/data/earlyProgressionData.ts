import {
  ComputedPlayerStats,
  EarlyFeatureId,
  EarlyForgeProgress,
  GearInstance,
  MailItem,
  Rarity,
  RuneId,
  SaveData,
} from '../types/game';

export const PROGRESSION_SCHEMA_VERSION = 2;

export const RARITY_RANK: Record<Rarity, number> = {
  [Rarity.COMMON]: 0,
  [Rarity.RARE]: 1,
  [Rarity.EPIC]: 2,
  [Rarity.LEGENDARY]: 3,
  [Rarity.MYTHIC]: 4,
};

export const EARLY_FORGE_COSTS = {
  rareShards: 10,
  epicShards: 15,
  sTierBlueprints: 20,
} as const;

export const SYSTEM_MAIL_TEMPLATES: Omit<MailItem, 'claimed'>[] = [
  {
    id: 'mail_grand_launch',
    title: 'Thư Tiếp Tế Tân Binh Tinh Giới',
    sender: 'Hội Đồng Hoàng Đạo',
    body: 'Chào mừng Chiến Binh bước vào Thánh Điện Nhật Luân! Nhận gói tiếp tế khởi hành để cường hóa vũ khí sau những phòng đầu tiên.',
    date: 'Mùa 1 · Khởi Nguyên',
    rewardGold: 25,
    rewardGems: 10,
    minChapterCleared: 0,
    minCh1Stage: 0,
  },
  {
    id: 'mail_boss_rush_open',
    title: 'Thưởng Vượt Phụ Boss Ares (Ải 4)',
    sender: 'Đấu Trường Nhật Thực',
    body: 'Chúc mừng bạn vượt qua Phụ Boss đầu tiên! Dùng Vàng và Ngọc Hồn này để thử vận may Rương Thần Thoại bậc Hiếm.',
    date: 'Mốc Ải 4 · Chương 1',
    rewardGold: 120,
    rewardGems: 20,
    minChapterCleared: 0,
    minCh1Stage: 4,
  },
  {
    id: 'mail_season1_celebration',
    title: 'Chiến Công Chinh Phục Chương 1',
    sender: 'Thủ Thư Tinh Tú',
    body: 'Bạn đã đánh bại Sư Vương Thái Dương! Nhận ngay phần thưởng Sử Thi đầu tiên và chuẩn bị tiến vào Hỏa Sơn Chương 2.',
    date: 'Mốc Vượt Chương 1',
    rewardGold: 220,
    rewardGems: 25,
    bonusGearRarity: Rarity.EPIC,
    bonusSTier: false,
    minChapterCleared: 1,
    minCh1Stage: 12,
  },
];

export interface EarlyProgressionPolicy {
  highestChapterCleared: number;
  bestCh1Stage: number;
  maxGearRarity: Rarity;
  allowSTier: boolean;
  maxRuneRarity: Rarity;
  stageLabel: string;
}

export function getBestCh1Stage(save: Pick<SaveData, 'highestChapterCleared' | 'bestStagePerChapter'>): number {
  if ((save.highestChapterCleared ?? 0) >= 1) return 12;
  return Math.max(0, Math.floor(save.bestStagePerChapter?.[1] ?? 0));
}

export function getEarlyProgressionPolicy(
  save: Pick<SaveData, 'highestChapterCleared' | 'bestStagePerChapter'>
): EarlyProgressionPolicy {
  const highestChapterCleared = Math.max(0, Math.floor(save.highestChapterCleared ?? 0));
  const bestCh1Stage = getBestCh1Stage(save);

  if (highestChapterCleared >= 2) {
    return {
      highestChapterCleared,
      bestCh1Stage,
      maxGearRarity: Rarity.MYTHIC,
      allowSTier: true,
      maxRuneRarity: Rarity.LEGENDARY,
      stageLabel: 'Chương 3+ · Mở Khóa Mẫu [S] & Huyền Thoại',
    };
  }
  if (highestChapterCleared >= 1) {
    return {
      highestChapterCleared,
      bestCh1Stage,
      maxGearRarity: Rarity.EPIC,
      allowSTier: false,
      maxRuneRarity: Rarity.EPIC,
      stageLabel: 'Chương 2 · Mở Khóa Sử Thi (Epic)',
    };
  }
  if (bestCh1Stage >= 4) {
    return {
      highestChapterCleared,
      bestCh1Stage,
      maxGearRarity: Rarity.RARE,
      allowSTier: false,
      maxRuneRarity: Rarity.RARE,
      stageLabel: 'Giữa Chương 1 · Mở Khóa Hiếm (Rare)',
    };
  }
  return {
    highestChapterCleared,
    bestCh1Stage,
    maxGearRarity: Rarity.COMMON,
    allowSTier: false,
    maxRuneRarity: Rarity.COMMON,
    stageLabel: 'Khởi Đầu Chương 1 · Trần Thường (Common)',
  };
}

export function clampRarityToPolicy(rarity: Rarity, maxRarity: Rarity): Rarity {
  return RARITY_RANK[rarity] > RARITY_RANK[maxRarity] ? maxRarity : rarity;
}

export interface FeatureUnlockStatus {
  unlocked: boolean;
  minChapterCleared: number;
  minCh1Stage: number;
  requiredLabel: string;
}

export function isEarlyFeatureUnlocked(
  save: Pick<SaveData, 'highestChapterCleared' | 'bestStagePerChapter'>,
  feature: EarlyFeatureId
): FeatureUnlockStatus {
  const ch = Math.max(0, Math.floor(save.highestChapterCleared ?? 0));
  const st1 = getBestCh1Stage(save);

  switch (feature) {
    case 'mail':
    case 'welcome_gift':
    case 'daily_quests':
      return { unlocked: true, minChapterCleared: 0, minCh1Stage: 0, requiredLabel: 'Mở từ đầu' };
    case 'iron_chest':
    case 'talents':
      return {
        unlocked: ch >= 1 || st1 >= 2,
        minChapterCleared: 0,
        minCh1Stage: 2,
        requiredLabel: 'Mở sau Ải 2 Chương 1',
      };
    case 'mythic_chest':
    case 'hero_star':
    case 'flash_deals':
    case 'battle_pass':
    case 'forge':
      return {
        unlocked: ch >= 1 || st1 >= 4,
        minChapterCleared: 0,
        minCh1Stage: 4,
        requiredLabel: 'Mở sau Phụ Boss Ares (Ải 4 Ch.1)',
      };
    case 'sweep':
    case 'runes':
      return {
        unlocked: ch >= 1,
        minChapterCleared: 1,
        minCh1Stage: 12,
        requiredLabel: 'Mở sau khi vượt Chương 1',
      };
    case 'starter_pack':
    case 'meta_events':
    case 'late_modes':
      return {
        unlocked: ch >= 2,
        minChapterCleared: 2,
        minCh1Stage: 12,
        requiredLabel: 'Mở khi vào Chương 3 (Vượt Chương 2)',
      };
  }
}

export function normalizeEarlyForgeProgress(fp?: Partial<EarlyForgeProgress>): EarlyForgeProgress {
  return {
    rareShards: Math.max(0, Math.floor(fp?.rareShards ?? 0)),
    epicShards: Math.max(0, Math.floor(fp?.epicShards ?? 0)),
    sTierBlueprints: Math.max(0, Math.floor(fp?.sTierBlueprints ?? 0)),
  };
}

// ============================================================================
// PERSISTENT MAIL CLAIM LEDGER & LEGACY MIGRATION (SINGLE SOURCE OF TRUTH)
// ============================================================================

export function isMailEligibleByProgression(
  save: Pick<SaveData, 'highestChapterCleared' | 'bestStagePerChapter'>,
  mail: Pick<MailItem, 'minChapterCleared' | 'minCh1Stage'>
): boolean {
  const ch = Math.max(0, Math.floor(save.highestChapterCleared ?? 0));
  const st1 = getBestCh1Stage(save);
  const reqCh = mail.minChapterCleared ?? 0;
  const reqSt1 = mail.minCh1Stage ?? 0;
  if (ch >= reqCh && reqCh > 0) return true;
  if (reqCh > 0 && ch < reqCh) return false;
  return st1 >= reqSt1;
}

export function migrateSaveData(raw: SaveData): SaveData {
  // Always ensure array integrity without removing any legacy player assets!
  const isLegacy = !raw.progressionSchemaVersion || raw.progressionSchemaVersion < PROGRESSION_SCHEMA_VERSION;
  const existingClaimed = new Set<string>(Array.isArray(raw.claimedMailIds) ? raw.claimedMailIds : []);
  const existingDeleted = new Set<string>(Array.isArray(raw.deletedMailIds) ? raw.deletedMailIds : []);

  if (Array.isArray(raw.mailInbox)) {
    const inboxIds = new Set(raw.mailInbox.map((m) => m.id));
    for (const m of raw.mailInbox) {
      if (m.claimed) {
        existingClaimed.add(m.id);
      }
    }
    if (isLegacy) {
      // Legacy Policy (User Confirmed):
      // If a legacy save has a mailInbox array, any SYSTEM_MAIL_TEMPLATES entry missing from it
      // was previously deleted by the player -> mark as BOTH claimed & deleted so it never respawns or re-grants!
      for (const tpl of SYSTEM_MAIL_TEMPLATES) {
        if (!inboxIds.has(tpl.id)) {
          existingClaimed.add(tpl.id);
          existingDeleted.add(tpl.id);
        }
      }
    }
  } else if (isLegacy) {
    // Super-old legacy save with no mailInbox field at all: if it already progressed past Ch.1 or has >6 items,
    // mark legacy launch/celebration mails claimed to prevent retroactive double-granting.
    const hasLegacyProgress =
      (raw.highestChapterCleared ?? 0) > 0 ||
      (raw.career?.totalRuns ?? 0) > 0 ||
      (raw.inventory?.length ?? 0) > 6;
    if (hasLegacyProgress) {
      for (const tpl of SYSTEM_MAIL_TEMPLATES) {
        existingClaimed.add(tpl.id);
        existingDeleted.add(tpl.id);
      }
    }
  }

  // Build synchronized visible inbox (never respawning deleted mails, always reflecting claimedMailIds)
  const migratedBase: SaveData = {
    ...raw,
    progressionSchemaVersion: PROGRESSION_SCHEMA_VERSION,
    claimedMailIds: Array.from(existingClaimed),
    deletedMailIds: Array.from(existingDeleted),
    earlyMilestonesClaimed: Array.isArray(raw.earlyMilestonesClaimed) ? [...raw.earlyMilestonesClaimed] : [],
    earlyForgeProgress: normalizeEarlyForgeProgress(raw.earlyForgeProgress),
  };

  migratedBase.mailInbox = getVisibleMailInbox(migratedBase);
  return migratedBase;
}

export function getVisibleMailInbox(save: SaveData): MailItem[] {
  const claimedSet = new Set<string>(save.claimedMailIds ?? []);
  const deletedSet = new Set<string>(save.deletedMailIds ?? []);
  const existingMap = new Map<string, MailItem>();

  for (const m of save.mailInbox ?? []) {
    if (m.claimed) claimedSet.add(m.id);
    existingMap.set(m.id, m);
  }

  const visible: MailItem[] = [];
  for (const tpl of SYSTEM_MAIL_TEMPLATES) {
    if (deletedSet.has(tpl.id)) continue;
    const prev = existingMap.get(tpl.id);
    const isClaimed = claimedSet.has(tpl.id) || Boolean(prev?.claimed);
    // Keep existing custom fields for legacy unclaimed mail, but synchronize template rewards for new saves
    visible.push({
      ...tpl,
      claimed: isClaimed,
    });
  }

  for (const m of save.mailInbox ?? []) {
    if (deletedSet.has(m.id)) continue;
    if (!SYSTEM_MAIL_TEMPLATES.some((t) => t.id === m.id)) {
      visible.push({
        ...m,
        claimed: claimedSet.has(m.id) || m.claimed,
      });
    }
  }

  return visible;
}

export function countUnclaimedEligibleMail(save: SaveData): number {
  const claimedSet = new Set<string>(save.claimedMailIds ?? []);
  return getVisibleMailInbox(save).filter(
    (m) => !m.claimed && !claimedSet.has(m.id) && isMailEligibleByProgression(save, m)
  ).length;
}

export interface MailClaimResult {
  nextSave: SaveData;
  claimedCount: number;
  goldGained: number;
  gemsGained: number;
  gearsGained: GearInstance[];
}

export type ProgressionGearRoller = (opts: {
  isPremium: boolean;
  minRarity?: Rarity;
  forceSTier?: boolean;
  policy: EarlyProgressionPolicy;
}) => GearInstance;

export function claimMailsUnified(
  save: SaveData,
  mailIds: string[] | 'all',
  rollGear: ProgressionGearRoller
): MailClaimResult {
  const policy = getEarlyProgressionPolicy(save);
  const claimedSet = new Set<string>(save.claimedMailIds ?? []);
  const visible = getVisibleMailInbox(save);
  const targetIdSet = mailIds === 'all' ? null : new Set(mailIds);

  let goldGained = 0;
  let gemsGained = 0;
  const gearsGained: GearInstance[] = [];
  let claimedCount = 0;

  const nextInbox = visible.map((m) => {
    if (m.claimed || claimedSet.has(m.id)) return { ...m, claimed: true };
    if (targetIdSet && !targetIdSet.has(m.id)) return m;
    if (!isMailEligibleByProgression(save, m)) return m;

    claimedSet.add(m.id);
    claimedCount += 1;
    goldGained += m.rewardGold ?? 0;
    gemsGained += m.rewardGems ?? 0;

    if (m.bonusGearRarity) {
      const clampedRarity = clampRarityToPolicy(m.bonusGearRarity, policy.maxGearRarity);
      const allowSTier = Boolean(m.bonusSTier) && policy.allowSTier;
      gearsGained.push(
        rollGear({
          isPremium: RARITY_RANK[clampedRarity] >= RARITY_RANK[Rarity.RARE],
          minRarity: clampedRarity,
          forceSTier: allowSTier,
          policy,
        })
      );
    }

    return { ...m, claimed: true };
  });

  if (claimedCount === 0) {
    return { nextSave: save, claimedCount: 0, goldGained: 0, gemsGained: 0, gearsGained: [] };
  }

  return {
    nextSave: {
      ...save,
      progressionSchemaVersion: PROGRESSION_SCHEMA_VERSION,
      gold: save.gold + goldGained,
      gems: save.gems + gemsGained,
      inventory: gearsGained.length > 0 ? [...save.inventory, ...gearsGained] : save.inventory,
      claimedMailIds: Array.from(claimedSet),
      mailInbox: nextInbox,
    },
    claimedCount,
    goldGained,
    gemsGained,
    gearsGained,
  };
}

export function deleteClaimedMailsUnified(save: SaveData): SaveData {
  const claimedSet = new Set<string>(save.claimedMailIds ?? []);
  const deletedSet = new Set<string>(save.deletedMailIds ?? []);
  const visible = getVisibleMailInbox(save);

  const remaining: MailItem[] = [];
  for (const m of visible) {
    if (m.claimed || claimedSet.has(m.id)) {
      claimedSet.add(m.id);
      deletedSet.add(m.id);
    } else {
      remaining.push(m);
    }
  }

  return {
    ...save,
    progressionSchemaVersion: PROGRESSION_SCHEMA_VERSION,
    claimedMailIds: Array.from(claimedSet),
    deletedMailIds: Array.from(deletedSet),
    mailInbox: remaining,
  };
}

// ============================================================================
// EARLY MILESTONES, TARGET GEAR & PROGRESSIVE UNLOCKS (CH.1–3)
// ============================================================================

export interface EarlyMilestoneRewardSummary {
  milestoneIds: string[];
  titles: string[];
  goldGained: number;
  gemsGained: number;
  rareShardsGained: number;
  epicShardsGained: number;
  sTierBlueprintsGained: number;
  unlockedRune?: boolean;
  unlockedRoyalTitle?: boolean;
  unlockedCelestialWing?: boolean;
}

export function applyEarlyRunMilestones(
  save: SaveData,
  chapterId: number,
  stageReached: number,
  victory: boolean
): { nextSave: SaveData; summary: EarlyMilestoneRewardSummary } {
  const claimed = new Set<string>(save.earlyMilestonesClaimed ?? []);
  const forge = normalizeEarlyForgeProgress(save.earlyForgeProgress);
  const summary: EarlyMilestoneRewardSummary = {
    milestoneIds: [],
    titles: [],
    goldGained: 0,
    gemsGained: 0,
    rareShardsGained: 0,
    epicShardsGained: 0,
    sTierBlueprintsGained: 0,
  };

  let nextGold = save.gold;
  let nextGems = save.gems;
  let nextRuneInv = save.runeInventory;
  let nextEqRunes = save.equippedRunes;
  let nextTitles = [...(save.unlockedRoyal3DTitles ?? [])];
  let nextEqTitle = save.equippedRoyal3DTitleId ?? null;
  let nextCelWings = [...(save.unlockedCelestialWings ?? [])];
  let nextCelWingStars = { ...(save.celestialWingStars ?? {}) };
  let nextEqCelWing = save.equippedCelestialWingId ?? null;

  // Incremental forge shards earned on every meaningful campaign run (clear source visibility!)
  if (chapterId === 1) {
    if (stageReached >= 4) {
      const gained = victory ? 4 : stageReached >= 8 ? 3 : 2;
      forge.rareShards += gained;
      summary.rareShardsGained += gained;
    }
    if (stageReached >= 8) {
      const gained = victory ? 4 : 2;
      forge.epicShards += gained;
      summary.epicShardsGained += gained;
    }
  } else if (chapterId === 2) {
    const gainedEpic = victory ? 5 : stageReached >= 4 ? 2 : 1;
    forge.epicShards += gainedEpic;
    summary.epicShardsGained += gainedEpic;
    if (stageReached >= 8 || victory) {
      const gainedS = victory ? 4 : 2;
      forge.sTierBlueprints += gainedS;
      summary.sTierBlueprintsGained += gainedS;
    }
  } else if (chapterId >= 3) {
    const gainedS = victory ? 6 : stageReached >= 4 ? 3 : 1;
    forge.sTierBlueprints += gainedS;
    summary.sTierBlueprintsGained += gainedS;
  }

  // One-time progression milestones
  if (chapterId === 1 && stageReached >= 2 && !claimed.has('ms_ch1_stage2')) {
    claimed.add('ms_ch1_stage2');
    forge.rareShards += 2;
    nextGold += 45;
    summary.rareShardsGained += 2;
    summary.goldGained += 45;
    summary.milestoneIds.push('ms_ch1_stage2');
    summary.titles.push('Mở Khóa Rương Sắt (Ải 2 Ch.1)');
  }

  if (chapterId === 1 && (stageReached >= 4 || victory) && !claimed.has('ms_ch1_ares')) {
    claimed.add('ms_ch1_ares');
    forge.rareShards += 8; // Together with stage2 + run shards >= 10 -> guaranteed first Rare!
    nextGold += 80;
    nextGems += 15;
    summary.rareShardsGained += 8;
    summary.goldGained += 80;
    summary.gemsGained += 15;
    summary.milestoneIds.push('ms_ch1_ares');
    summary.titles.push('Hạ Phụ Boss Ares · Mở Khóa Đồ Hiếm (Rare)');
  }

  if (chapterId === 1 && (stageReached >= 8 || victory) && !claimed.has('ms_ch1_boreas')) {
    claimed.add('ms_ch1_boreas');
    forge.epicShards += 5;
    nextGold += 120;
    nextGems += 20;
    summary.epicShardsGained += 5;
    summary.goldGained += 120;
    summary.gemsGained += 20;
    summary.milestoneIds.push('ms_ch1_boreas');
    summary.titles.push('Hạ Phụ Boss Boreas · +5 Mảnh Sử Thi');
  }

  if (chapterId === 1 && victory && !claimed.has('ms_ch1_clear')) {
    claimed.add('ms_ch1_clear');
    forge.epicShards += 6; // 5 + 6 + 4 = 15/15 -> guaranteed first Epic craft!
    nextGold += 180;
    nextGems += 30;
    summary.epicShardsGained += 6;
    summary.goldGained += 180;
    summary.gemsGained += 30;
    // Award moved Rare Rune (arrow_rain) on Chapter 1 Clear!
    if (!nextRuneInv.some((r) => r.runeId === 'arrow_rain')) {
      const earnedRune = {
        uid: `milestone_rune_ch1_${Date.now()}`,
        runeId: 'arrow_rain' as RuneId,
        rarity: Rarity.RARE,
      };
      nextRuneInv = [...nextRuneInv, earnedRune];
      if (nextEqRunes.length < 4) {
        nextEqRunes = [...nextEqRunes, earnedRune.uid];
      }
      summary.unlockedRune = true;
    }
    // Award moved Royal 3D Title on Chapter 1 Clear!
    if (!nextTitles.includes('title_sky_sovereign')) {
      nextTitles.push('title_sky_sovereign');
      if (!nextEqTitle) nextEqTitle = 'title_sky_sovereign';
      summary.unlockedRoyalTitle = true;
    }
    summary.milestoneIds.push('ms_ch1_clear');
    summary.titles.push('Vượt Chương 1 · Mở Khóa Sử Thi, Ngọc Khắc & Danh Hiệu 3D');
  }

  if (chapterId === 2 && victory && !claimed.has('ms_ch2_clear')) {
    claimed.add('ms_ch2_clear');
    forge.sTierBlueprints += 10;
    nextGold += 260;
    nextGems += 40;
    summary.sTierBlueprintsGained += 10;
    summary.goldGained += 260;
    summary.gemsGained += 40;
    // Award moved Celestial Wing 3D on Chapter 2 Clear (entering Chapter 3)!
    if (!nextCelWings.includes('seraph_azure')) {
      nextCelWings.push('seraph_azure');
      nextCelWingStars = { ...nextCelWingStars, seraph_azure: 1 };
      if (!nextEqCelWing) nextEqCelWing = 'seraph_azure';
      summary.unlockedCelestialWing = true;
    }
    summary.milestoneIds.push('ms_ch2_clear');
    summary.titles.push('Vượt Chương 2 · Mở Khóa Mẫu [S] & Cánh Thần Quang 3D');
  }

  return {
    nextSave: {
      ...save,
      gold: nextGold,
      gems: nextGems,
      runeInventory: nextRuneInv,
      equippedRunes: nextEqRunes,
      unlockedRoyal3DTitles: nextTitles,
      equippedRoyal3DTitleId: nextEqTitle,
      unlockedCelestialWings: nextCelWings,
      celestialWingStars: nextCelWingStars,
      equippedCelestialWingId: nextEqCelWing,
      earlyMilestonesClaimed: Array.from(claimed),
      earlyForgeProgress: forge,
    },
    summary,
  };
}

export interface TargetGoalSnapshot {
  tier: 'rare' | 'epic' | 's_tier';
  title: string;
  current: number;
  target: number;
  canCraftNow: boolean;
  unlocked: boolean;
  unlockRequirement: string;
  dropSourceText: string;
}

export function getNextTargetGoal(save: SaveData): TargetGoalSnapshot {
  const policy = getEarlyProgressionPolicy(save);
  const forge = normalizeEarlyForgeProgress(save.earlyForgeProgress);
  const hasRare = save.inventory.some((g) => RARITY_RANK[g.rarity] >= RARITY_RANK[Rarity.RARE]);
  const hasEpic = save.inventory.some((g) => RARITY_RANK[g.rarity] >= RARITY_RANK[Rarity.EPIC]);

  if (!hasRare && policy.highestChapterCleared < 1) {
    return {
      tier: 'rare',
      title: 'Mục Tiêu: Trang Bị Hiếm (Rare) Đầu Tiên',
      current: Math.min(EARLY_FORGE_COSTS.rareShards, forge.rareShards),
      target: EARLY_FORGE_COSTS.rareShards,
      canCraftNow: policy.bestCh1Stage >= 4 && forge.rareShards >= EARLY_FORGE_COSTS.rareShards,
      unlocked: policy.bestCh1Stage >= 4,
      unlockRequirement: 'Hạ Phụ Boss Ares (Ải 4 Ch.1)',
      dropSourceText: 'Nguồn: Phụ Boss Ải 4 Ch.1 · Rương Sắt/Thần Thoại · Mảnh Rèn Hiếm',
    };
  }

  if (!hasEpic && policy.highestChapterCleared < 2) {
    return {
      tier: 'epic',
      title: 'Mục Tiêu: Trang Bị Sử Thi (Epic) Đầu Tiên',
      current: Math.min(EARLY_FORGE_COSTS.epicShards, forge.epicShards),
      target: EARLY_FORGE_COSTS.epicShards,
      canCraftNow: policy.highestChapterCleared >= 1 && forge.epicShards >= EARLY_FORGE_COSTS.epicShards,
      unlocked: policy.highestChapterCleared >= 1,
      unlockRequirement: 'Vượt Chương 1 (Hạ Sư Vương Ải 12)',
      dropSourceText: 'Nguồn: Boss Ải 8 & 12 Ch.1 · Chương 2 · Rương Thần Thoại (Pity 10 bảo toàn)',
    };
  }

  return {
    tier: 's_tier',
    title: 'Mục Tiêu: Thánh Vật Mẫu [S] Hoàng Đạo',
    current: Math.min(EARLY_FORGE_COSTS.sTierBlueprints, forge.sTierBlueprints),
    target: EARLY_FORGE_COSTS.sTierBlueprints,
    canCraftNow: policy.allowSTier && forge.sTierBlueprints >= EARLY_FORGE_COSTS.sTierBlueprints,
    unlocked: policy.allowSTier,
    unlockRequirement: 'Tiến vào Chương 3 (Vượt Chương 2)',
    dropSourceText: 'Nguồn: Boss Chương 2–3 · Bản Vẽ [S] · Rương Thần Thoại (Pity 25 bảo toàn)',
  };
}

/**
 * Expected single-target standing DPS before in-run skills or temporary procs.
 * Formula: attack * attackSpeedMult * (1 + critChance * (critDamage - 1))
 */
export function computeExpectedDps(stats: Pick<ComputedPlayerStats, 'attack' | 'attackSpeedMult' | 'critChance' | 'critDamage'>): number {
  return Number(
    (stats.attack * stats.attackSpeedMult * (1 + stats.critChance * (stats.critDamage - 1))).toFixed(2)
  );
}

// ============================================================================
// REWARD SOURCE AUDIT MATRIX (SECTION 2 OF SPECIFICATION)
// ============================================================================

export interface RewardChannelAuditRow {
  channel: string;
  earliestUnlock: string;
  cost: string;
  claimLimit: string;
  rarityCeiling: string;
  canDropSTier: string;
}

export const EARLY_REWARD_AUDIT_MATRIX: RewardChannelAuditRow[] = [
  {
    channel: 'Hòm Thư Hệ Thống (Mail)',
    earliestUnlock: 'Thư Tân Binh: Ch.1 Ải 0 · Thư Ares: Ải 4 · Thư Ch.1: Vượt Ch.1',
    cost: 'Miễn phí',
    claimLimit: '1 lần / mã thư (khóa vĩnh viễn bằng claimedMailIds)',
    rarityCeiling: 'Ch.1 Ải 0–3: Không đồ · Sau Ch.1: Tối đa Epic',
    canDropSTier: 'Không (đã gỡ [S] khỏi thư Mùa 1)',
  },
  {
    channel: 'Quà Chào Mừng (Welcome Gift)',
    earliestUnlock: 'Ch.1 Ải 0',
    cost: 'Miễn phí',
    claimLimit: '1 lần / tài khoản',
    rarityCeiling: '30 Vàng + 10 Ngọc + 2 Mảnh Rèn Hiếm (không cấp đồ Rare trước trận)',
    canDropSTier: 'Không',
  },
  {
    channel: 'Gói Khởi Nghiệp (Starter Pack [S])',
    earliestUnlock: 'Chương 3 (Vượt Chương 2)',
    cost: '39 Ngọc Hồn',
    claimLimit: '1 lần / tài khoản',
    rarityCeiling: 'Sử Thi (Epic)',
    canDropSTier: 'Có — chỉ khi đã mở Chương 3',
  },
  {
    channel: 'Rương Sắt (Iron Chest)',
    earliestUnlock: 'Sau Ải 2 Chương 1',
    cost: '120 Vàng (x10: 1.080 Vàng)',
    claimLimit: 'Không giới hạn',
    rarityCeiling: 'Ải 2–3: Common · Ải 4–11: Rare · Sau Ch.1: Epic',
    canDropSTier: 'Không (loại toàn bộ mẫu S khỏi pool trước Ch.3)',
  },
  {
    channel: 'Rương Thần Thoại (Mythic Chest)',
    earliestUnlock: 'Sau Phụ Boss Ares (Ải 4 Ch.1)',
    cost: '25 Ngọc (x10: 225 Ngọc)',
    claimLimit: 'Không giới hạn (Pity 10 Epic / 25 [S] bảo toàn khi chưa mở pool)',
    rarityCeiling: 'Ải 4–11: Rare · Sau Ch.1: Epic · Từ Ch.3: Legendary',
    canDropSTier: 'Chỉ từ Chương 3 (Vượt Chương 2)',
  },
  {
    channel: 'Quét Nhanh (Quick Sweep)',
    earliestUnlock: 'Sau khi vượt Chương 1 (Ch.2+)',
    cost: 'Miễn phí (3 lượt/ngày, VIP +2)',
    claimLimit: '3–5 lượt/ngày',
    rarityCeiling: 'Ch.2: tối đa Rare · Từ Ch.3: theo trần chương',
    canDropSTier: 'Không',
  },
  {
    channel: 'Sổ Chiến Lệnh (Battle Pass)',
    earliestUnlock: 'Sau Phụ Boss Ares (Ải 4 Ch.1)',
    cost: 'Miễn phí (Premium: 120 Ngọc)',
    claimLimit: '1 lần / bậc (20 bậc)',
    rarityCeiling: 'Bị chặn theo trần chương hiện tại',
    canDropSTier: 'Chỉ khi mở Chương 3 (nếu nhận sớm sẽ giữ lại hoặc yêu cầu Ch.3)',
  },
  {
    channel: 'Flash Sale & Cửa Hàng',
    earliestUnlock: 'Sau Phụ Boss Ares (Ải 4 Ch.1)',
    cost: 'Vàng / Ngọc (1 gói 0đ/ngày)',
    claimLimit: '1 lần / món / ngày',
    rarityCeiling: 'Gói Epic mở sau Ch.1 · Gói [S] mở từ Ch.3',
    canDropSTier: 'Chỉ từ Chương 3',
  },
  {
    channel: 'Sự Kiện Sảnh Wave 3–14 (Vòng Quay, Hộp Mù, Đấu Giá, Bàn Cờ, Lễ Hội)',
    earliestUnlock: 'Chương 3 (Vượt Chương 2)',
    cost: 'Vé / Ngọc / Vàng sự kiện',
    claimLimit: 'Theo chu kỳ ngày / mùa',
    rarityCeiling: 'Khóa trước Ch.3 · Mọi handler đều qua rollProgressionGatedGear',
    canDropSTier: 'Chỉ từ Chương 3',
  },
];

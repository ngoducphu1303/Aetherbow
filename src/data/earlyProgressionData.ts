import {
  ComputedPlayerStats,
  EarlyFeatureId,
  EarlyForgeProgress,
  EndlessTowerFloorScaling,
  GearInstance,
  GearSlot,
  HeroId,
  HeroMasteryBonuses,
  HeroMasteryProgress,
  KpiEvaluationRow,
  LoadoutPreset,
  LoadoutPresetSlotId,
  MailItem,
  PlaytestKpiContext,
  PlaytestMetrics,
  Rarity,
  RuneId,
  SaveData,
  SideModeScaling,
  SkillSynergyId,
} from '../types/game';

export const PROGRESSION_SCHEMA_VERSION = 2;
export const PUNISH_WINDOW_DAMAGE_BONUS = 0.18;
export const PUNISH_WINDOW_PHASE3_BONUS = 0.24;

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

  // Ensure Alice ('artemis') is always unlocked, and perform a one-time reset to Alice
  // for existing saves that were previously switched away automatically.
  const normalizedUnlockedHeroes = Array.isArray(raw.unlockedHeroes)
    ? Array.from(new Set([...raw.unlockedHeroes, 'artemis'])) as SaveData['unlockedHeroes']
    : (['artemis', 'alex'] as SaveData['unlockedHeroes']);
  const needsAliceRestore = !raw.aliceDefaultMigrated;
  const resolvedHeroId: SaveData['selectedHeroId'] = needsAliceRestore
    ? 'artemis'
    : normalizedUnlockedHeroes.includes(raw.selectedHeroId)
    ? raw.selectedHeroId
    : 'artemis';

  // Build synchronized visible inbox (never respawning deleted mails, always reflecting claimedMailIds)
  const migratedBase: SaveData = {
    ...raw,
    selectedHeroId: resolvedHeroId,
    aliceDefaultMigrated: true,
    unlockedHeroes: normalizedUnlockedHeroes,
    progressionSchemaVersion: PROGRESSION_SCHEMA_VERSION,
    claimedMailIds: Array.from(existingClaimed),
    deletedMailIds: Array.from(existingDeleted),
    earlyMilestonesClaimed: Array.isArray(raw.earlyMilestonesClaimed) ? [...raw.earlyMilestonesClaimed] : [],
    earlyForgeProgress: normalizeEarlyForgeProgress(raw.earlyForgeProgress),
    playtestMetrics: normalizePlaytestMetrics(raw.playtestMetrics),
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

// ============================================================================
// CHAPTER 1–3 CONQUEST ROADMAP (4 CLEAR UNLOCK MILESTONES)
// ============================================================================

export interface EarlyRoadmapStage {
  id: 'ch1_stage2' | 'ch1_ares' | 'ch1_clear' | 'ch2_clear';
  stepNumber: string;
  title: string;
  requirement: string;
  unlocksSummary: string;
  guaranteedReward: string;
  rarityCeilingLabel: string;
  actionTarget?: 'battle' | 'shop' | 'forge' | 'runes';
}

export const EARLY_ROADMAP_STAGES: EarlyRoadmapStage[] = [
  {
    id: 'ch1_stage2',
    stepNumber: '01',
    title: 'Vượt Ải 2 Chương 1',
    requirement: 'Đạt Ải 2 · Thánh Điện Nhật Luân',
    unlocksSummary: 'Mở Rương Sắt & Bảng Thiên Phú',
    guaranteedReward: '+45 Vàng · +2 Mảnh Hiếm',
    rarityCeilingLabel: 'Trần Thường (Common)',
    actionTarget: 'battle',
  },
  {
    id: 'ch1_ares',
    stepNumber: '02',
    title: 'Hạ Phụ Boss Ares (Ải 4 Ch.1)',
    requirement: 'Đánh bại Tướng Quân Hỏa Ngục Ares',
    unlocksSummary: 'Mở Rương Thần Thoại · Lò Rèn · Sổ Chiến Lệnh · Flash Sale',
    guaranteedReward: 'Đủ 10/10 Mảnh rèn Vũ Khí Hiếm (Rare) đầu tiên + Thư Ải 4',
    rarityCeilingLabel: 'Mở khóa Hiếm (Rare)',
    actionTarget: 'forge',
  },
  {
    id: 'ch1_clear',
    stepNumber: '03',
    title: 'Chinh Phục Chương 1 (Sư Vương Ải 12)',
    requirement: 'Hoàn thành Chương 1 · Thánh Điện Nhật Luân',
    unlocksSummary: 'Mở Quét Nhanh · Ngọc Khắc · Chương 2 Hỏa Sơn',
    guaranteedReward: 'Ngọc Khắc Mưa Tên (Rare) · Danh Hiệu 3D · Đủ 15 Mảnh Sử Thi + Thư Epic',
    rarityCeilingLabel: 'Mở khóa Sử Thi (Epic) · Ngọc Khắc tối đa Sử Thi',
    actionTarget: 'runes',
  },
  {
    id: 'ch2_clear',
    stepNumber: '04',
    title: 'Vượt Chương 2 · Bước Vào Chương 3',
    requirement: 'Hoàn thành Chương 2 · Hỏa Sơn Sừng Đỏ',
    unlocksSummary: 'Mở Mẫu [S] · Huyền Thoại · Gói Khởi Nghiệp [S] · Sự kiện Sảnh',
    guaranteedReward: 'Cánh Thần Quang 3D · +10 Bản Vẽ [S] · Kích hoạt Pity [S] đã tích lũy',
    rarityCeilingLabel: 'Mở khóa Mẫu [S] & Huyền Thoại (Legendary)',
    actionTarget: 'shop',
  },
];

export interface EarlyRoadmapStageStatus extends EarlyRoadmapStage {
  completed: boolean;
  isCurrentTarget: boolean;
}

export function getEarlyRoadmapStatus(
  save: Pick<SaveData, 'highestChapterCleared' | 'bestStagePerChapter'>
): EarlyRoadmapStageStatus[] {
  const ch = Math.max(0, Math.floor(save.highestChapterCleared ?? 0));
  const st1 = getBestCh1Stage(save);
  const doneFlags: Record<EarlyRoadmapStage['id'], boolean> = {
    ch1_stage2: ch >= 1 || st1 >= 2,
    ch1_ares: ch >= 1 || st1 >= 4,
    ch1_clear: ch >= 1,
    ch2_clear: ch >= 2,
  };
  let foundCurrent = false;
  return EARLY_ROADMAP_STAGES.map((stage) => {
    const completed = doneFlags[stage.id];
    const isCurrentTarget = !completed && !foundCurrent;
    if (isCurrentTarget) foundCurrent = true;
    return { ...stage, completed, isCurrentTarget };
  });
}

// ============================================================================
// LOCAL PLAYTEST TELEMETRY LEDGER (ZERO HUD CLUTTER · HIDDEN IN SETTINGS)
// ============================================================================

export function createEmptyPlaytestMetrics(now = Date.now()): PlaytestMetrics {
  return {
    createdAt: now,
    totalRuns: 0,
    totalPlaySeconds: 0,
    startedRunAfterFirstDefeat: false,
    stageEntriesByChapter: {},
    stageDefeatsByChapter: {},
    bossAttempts: {},
    milestones: {},
    synergyPickCounts: {},
  };
}

export function normalizePlaytestMetrics(raw?: Partial<PlaytestMetrics>): PlaytestMetrics {
  if (!raw || typeof raw !== 'object') {
    return createEmptyPlaytestMetrics();
  }
  return {
    createdAt: typeof raw.createdAt === 'number' && raw.createdAt > 0 ? raw.createdAt : Date.now(),
    totalRuns: Math.max(0, Math.floor(raw.totalRuns ?? 0)),
    totalPlaySeconds: Math.max(0, Math.round(raw.totalPlaySeconds ?? 0)),
    firstDefeatRunIndex:
      typeof raw.firstDefeatRunIndex === 'number' ? raw.firstDefeatRunIndex : undefined,
    startedRunAfterFirstDefeat: Boolean(raw.startedRunAfterFirstDefeat),
    stageEntriesByChapter:
      raw.stageEntriesByChapter && typeof raw.stageEntriesByChapter === 'object'
        ? { ...raw.stageEntriesByChapter }
        : {},
    stageDefeatsByChapter:
      raw.stageDefeatsByChapter && typeof raw.stageDefeatsByChapter === 'object'
        ? { ...raw.stageDefeatsByChapter }
        : {},
    bossAttempts:
      raw.bossAttempts && typeof raw.bossAttempts === 'object' ? { ...raw.bossAttempts } : {},
    milestones:
      raw.milestones && typeof raw.milestones === 'object' ? { ...raw.milestones } : {},
    synergyPickCounts:
      raw.synergyPickCounts && typeof raw.synergyPickCounts === 'object'
        ? { ...raw.synergyPickCounts }
        : {},
  };
}

export function recordPlaytestRunStart(raw?: Partial<PlaytestMetrics>): PlaytestMetrics {
  const m = normalizePlaytestMetrics(raw);
  const nextTotalRuns = m.totalRuns + 1;
  const startedRunAfterFirstDefeat =
    m.startedRunAfterFirstDefeat ||
    (typeof m.firstDefeatRunIndex === 'number' && nextTotalRuns > m.firstDefeatRunIndex);
  return {
    ...m,
    totalRuns: nextTotalRuns,
    startedRunAfterFirstDefeat,
  };
}

export function getBossTelemetryKey(chapterId: number, stage: number): string | null {
  if (chapterId === 1 && stage === 4) return 'ch1_ares';
  if (chapterId === 1 && stage === 8) return 'ch1_boreas';
  if (chapterId === 1 && stage === 12) return 'ch1_leo_king';
  if (chapterId === 2 && stage === 12) return 'ch2_aries_boss';
  if (chapterId === 3 && stage === 12) return 'ch3_taurus_boss';
  if (chapterId === 4 && stage === 12) return 'ch4_gemini_boss';
  if (chapterId === 5 && stage === 12) return 'ch5_cancer_boss';
  if (chapterId === 6 && stage === 12) return 'ch6_virgo_boss';
  if (chapterId === 7 && stage === 12) return 'ch7_libra_boss';
  if (chapterId === 8 && stage === 12) return 'ch8_scorpio_boss';
  if (chapterId === 9 && stage === 12) return 'ch9_sagittarius_boss';
  if (chapterId === 10 && stage === 12) return 'ch10_capricorn_boss';
  if (chapterId === 11 && stage === 12) return 'ch11_aquarius_boss';
  if (chapterId === 12 && stage === 12) return 'ch12_pisces_boss';
  return null;
}

export function recordPlaytestRunEnd(
  raw: Partial<PlaytestMetrics> | undefined,
  params: {
    chapterId: number;
    stageReached: number;
    victory: boolean;
    elapsedSeconds: number;
    activeSynergies?: SkillSynergyId[];
  }
): PlaytestMetrics {
  const m = normalizePlaytestMetrics(raw);
  const chKey = String(params.chapterId);
  const nextEntries: Record<string, Record<number, number>> = {
    ...m.stageEntriesByChapter,
    [chKey]: { ...(m.stageEntriesByChapter[chKey] ?? {}) },
  };
  const nextDefeats: Record<string, Record<number, number>> = {
    ...m.stageDefeatsByChapter,
    [chKey]: { ...(m.stageDefeatsByChapter[chKey] ?? {}) },
  };
  const clampedStage = Math.max(1, Math.min(12, Math.floor(params.stageReached)));

  for (let s = 1; s <= clampedStage; s++) {
    nextEntries[chKey][s] = (nextEntries[chKey][s] ?? 0) + 1;
  }
  if (!params.victory) {
    nextDefeats[chKey][clampedStage] = (nextDefeats[chKey][clampedStage] ?? 0) + 1;
  }

  const nextBossAttempts = { ...m.bossAttempts };
  for (const bossStage of [4, 8, 12]) {
    if (clampedStage < bossStage) continue;
    const bKey = getBossTelemetryKey(params.chapterId, bossStage);
    if (!bKey) continue;
    const prev = nextBossAttempts[bKey] ?? { attempts: 0, cleared: false };
    const nextCount = prev.attempts + 1;
    const beatThisBoss = params.victory || clampedStage > bossStage;
    nextBossAttempts[bKey] = {
      attempts: nextCount,
      cleared: prev.cleared || beatThisBoss,
      attemptsToFirstClear:
        prev.attemptsToFirstClear ?? (beatThisBoss ? nextCount : undefined),
    };
  }

  const nextTotalPlay = m.totalPlaySeconds + Math.max(0, Math.round(params.elapsedSeconds));
  const nextMilestones = { ...m.milestones };
  if (params.chapterId === 1 && params.victory && !nextMilestones.firstCh1Clear) {
    nextMilestones.firstCh1Clear = {
      runIndex: Math.max(1, m.totalRuns),
      elapsedSec: nextTotalPlay,
    };
  }

  const nextSynergies = { ...m.synergyPickCounts };
  for (const synId of params.activeSynergies ?? []) {
    nextSynergies[synId] = (nextSynergies[synId] ?? 0) + 1;
  }

  return {
    ...m,
    totalPlaySeconds: nextTotalPlay,
    firstDefeatRunIndex:
      !params.victory && m.firstDefeatRunIndex === undefined
        ? Math.max(1, m.totalRuns)
        : m.firstDefeatRunIndex,
    stageEntriesByChapter: nextEntries,
    stageDefeatsByChapter: nextDefeats,
    bossAttempts: nextBossAttempts,
    milestones: nextMilestones,
    synergyPickCounts: nextSynergies,
  };
}

export function recordPlaytestMilestone(
  raw: Partial<PlaytestMetrics> | undefined,
  milestone: 'firstUpgrade' | 'firstRare' | 'firstEpic' | 'firstSTier'
): PlaytestMetrics {
  const m = normalizePlaytestMetrics(raw);
  if (m.milestones[milestone]) return m;
  return {
    ...m,
    milestones: {
      ...m.milestones,
      [milestone]: {
        runIndex: m.totalRuns,
        elapsedSec: m.totalPlaySeconds,
      },
    },
  };
}

export function resetPlaytestMetrics(now = Date.now()): PlaytestMetrics {
  return createEmptyPlaytestMetrics(now);
}

// ============================================================================
// PHASE 3 · SIDE-MODE PROGRESSION SCALING (BOSS RUSH & DAILY RIFT)
// ============================================================================

export function getSideModeScaling(highestChapterCleared: number): SideModeScaling {
  const tier = Math.max(1, Math.min(12, Math.floor(highestChapterCleared ?? 0) + 1));
  const table: Record<number, Omit<SideModeScaling, 'chapterTier' | 'label'>> = {
    1: { enemyHpScale: 1.0, enemyDmgScale: 1.0, goldRewardMult: 1.0, starDustBonus: 20 },
    2: { enemyHpScale: 1.85, enemyDmgScale: 1.28, goldRewardMult: 1.35, starDustBonus: 36 },
    3: { enemyHpScale: 2.8, enemyDmgScale: 1.56, goldRewardMult: 1.7, starDustBonus: 54 },
    4: { enemyHpScale: 3.9, enemyDmgScale: 1.88, goldRewardMult: 2.1, starDustBonus: 74 },
    5: { enemyHpScale: 5.1, enemyDmgScale: 2.22, goldRewardMult: 2.55, starDustBonus: 96 },
    6: { enemyHpScale: 6.5, enemyDmgScale: 2.6, goldRewardMult: 3.05, starDustBonus: 120 },
  };
  if (table[tier]) {
    return {
      chapterTier: tier,
      ...table[tier],
      label: `Bậc Ch.${tier}`,
    };
  }
  const extra = tier - 6;
  return {
    chapterTier: tier,
    enemyHpScale: Number((6.5 + extra * 1.65).toFixed(2)),
    enemyDmgScale: Number((2.6 + extra * 0.42).toFixed(2)),
    goldRewardMult: Number((3.05 + extra * 0.55).toFixed(2)),
    starDustBonus: 120 + extra * 28,
    label: `Bậc Ch.${tier}`,
  };
}

// ============================================================================
// PHASE 3 · PLAYTEST KPI AUTO-GRADING (SETTINGS DIAGNOSTIC PANEL)
// ============================================================================

export function evaluatePlaytestKpis(
  raw?: Partial<PlaytestMetrics>,
  context?: PlaytestKpiContext
): KpiEvaluationRow[] {
  const m = normalizePlaytestMetrics(raw);
  const rows: KpiEvaluationRow[] = [];

  // 1. Run-2 retention after first defeat
  if (m.firstDefeatRunIndex === undefined) {
    rows.push({
      id: 'run2_retention',
      label: 'Quay lại Lượt 2 sau lần thua đầu',
      actualText: m.totalRuns > 0 ? 'Chưa thua trận nào' : '0 lượt',
      targetText: 'Vào trận tiếp theo ngay',
      status: 'insufficient',
      note: 'Ghi nhận khi phát sinh lần thua đầu tiên',
    });
  } else {
    rows.push({
      id: 'run2_retention',
      label: 'Quay lại Lượt 2 sau lần thua đầu',
      actualText: m.startedRunAfterFirstDefeat ? 'Có (100%)' : 'Chưa quay lại (0%)',
      targetText: '≥ 1 lượt sau lần thua đầu',
      status: m.startedRunAfterFirstDefeat ? 'pass' : 'warn',
      note: `Thua đầu ở Lượt #${m.firstDefeatRunIndex}`,
    });
  }

  // 2. Ares (Ch.1-4) attempts to first clear
  const ares = m.bossAttempts.ch1_ares;
  if (!ares || ares.attempts === 0) {
    rows.push({
      id: 'ares_attempts',
      label: 'Số lượt thử hạ Phụ Boss Ares (Ch.1-4)',
      actualText: 'Chưa chạm trán',
      targetText: '1–3 lượt',
      status: 'insufficient',
      note: 'Chưa vào Ải 4 Chương 1',
    });
  } else if (ares.attemptsToFirstClear !== undefined) {
    const ok = ares.attemptsToFirstClear >= 1 && ares.attemptsToFirstClear <= 3;
    rows.push({
      id: 'ares_attempts',
      label: 'Số lượt thử hạ Phụ Boss Ares (Ch.1-4)',
      actualText: `${ares.attemptsToFirstClear} lượt`,
      targetText: '1–3 lượt',
      status: ok ? 'pass' : 'warn',
      note: ok ? 'Nhịp thử thách đầu game chuẩn' : 'Cần rà soát độ khó Ải 4',
    });
  } else {
    rows.push({
      id: 'ares_attempts',
      label: 'Số lượt thử hạ Phụ Boss Ares (Ch.1-4)',
      actualText: `${ares.attempts} lượt (chưa qua)`,
      targetText: '1–3 lượt',
      status: ares.attempts > 3 ? 'warn' : 'insufficient',
      note: ares.attempts > 3 ? 'Vượt 3 lượt thử chưa hạ Ares' : 'Đang tiến hành',
    });
  }

  // 3. Leo King (Ch.1-12) attempts to first clear
  const leo = m.bossAttempts.ch1_leo_king;
  if (!leo || leo.attempts === 0) {
    rows.push({
      id: 'leo_attempts',
      label: 'Số lượt thử hạ Sư Vương (Ch.1-12)',
      actualText: 'Chưa chạm trán',
      targetText: '1–5 lượt',
      status: 'insufficient',
      note: 'Chưa vào Ải 12 Chương 1',
    });
  } else if (leo.attemptsToFirstClear !== undefined) {
    const ok = leo.attemptsToFirstClear >= 1 && leo.attemptsToFirstClear <= 5;
    rows.push({
      id: 'leo_attempts',
      label: 'Số lượt thử hạ Sư Vương (Ch.1-12)',
      actualText: `${leo.attemptsToFirstClear} lượt`,
      targetText: '1–5 lượt',
      status: ok ? 'pass' : 'warn',
      note: ok ? 'Ngưỡng hạ Boss Ch.1 đạt mục tiêu' : 'Hạ Sư Vương mất quá 5 lượt',
    });
  } else {
    rows.push({
      id: 'leo_attempts',
      label: 'Số lượt thử hạ Sư Vương (Ch.1-12)',
      actualText: `${leo.attempts} lượt (chưa qua)`,
      targetText: '1–5 lượt',
      status: leo.attempts > 5 ? 'warn' : 'insufficient',
      note: leo.attempts > 5 ? 'Độ khó Sư Vương cao hơn mục tiêu' : 'Đang tiến hành',
    });
  }

  // 4. First Rare gear pacing
  const firstRare = m.milestones.firstRare;
  if (!firstRare) {
    rows.push({
      id: 'first_rare',
      label: 'Nhịp đạt Trang Bị Hiếm (Rare) đầu tiên',
      actualText: 'Chưa đạt',
      targetText: 'Lượt 1–3',
      status: m.totalRuns >= 4 ? 'warn' : 'insufficient',
      note: m.totalRuns >= 4 ? 'Đã quá 3 lượt vẫn chưa có đồ Hiếm' : 'Mở khóa sau Ải 4 Ch.1',
    });
  } else {
    const ok = firstRare.runIndex >= 1 && firstRare.runIndex <= 3;
    rows.push({
      id: 'first_rare',
      label: 'Nhịp đạt Trang Bị Hiếm (Rare) đầu tiên',
      actualText: `Lượt #${firstRare.runIndex} (${firstRare.elapsedSec}s)`,
      targetText: 'Lượt 1–3',
      status: ok ? 'pass' : 'warn',
      note: ok ? 'Đúng nhịp mở khóa Hiếm' : 'Lệch nhịp mở khóa Hiếm đầu tiên',
    });
  }

  // 5. First Epic gear pacing
  const firstEpic = m.milestones.firstEpic;
  if (!firstEpic) {
    rows.push({
      id: 'first_epic',
      label: 'Nhịp đạt Trang Bị Sử Thi (Epic) đầu tiên',
      actualText: 'Chưa đạt',
      targetText: 'Lượt 2–6',
      status: m.totalRuns >= 7 ? 'warn' : 'insufficient',
      note: m.totalRuns >= 7 ? 'Đã quá 6 lượt chưa chạm mốc Sử Thi' : 'Mở khóa sau khi vượt Ch.1',
    });
  } else {
    const ok = firstEpic.runIndex >= 2 && firstEpic.runIndex <= 6;
    rows.push({
      id: 'first_epic',
      label: 'Nhịp đạt Trang Bị Sử Thi (Epic) đầu tiên',
      actualText: `Lượt #${firstEpic.runIndex} (${firstEpic.elapsedSec}s)`,
      targetText: 'Lượt 2–6',
      status: ok ? 'pass' : 'warn',
      note: ok ? 'Đúng nhịp chuyển tiếp Ch.1 → Ch.2' : 'Cần cân đối nguồn Mảnh Sử Thi',
    });
  }

  // 6. Skill Synergy adoption rate
  const totalSynergyPicks = Object.values(m.synergyPickCounts).reduce((sum, n) => sum + (n ?? 0), 0);
  if (m.totalRuns < 2) {
    rows.push({
      id: 'synergy_adoption',
      label: 'Tỷ lệ kích hoạt Cộng Hưởng kỹ năng',
      actualText: `${totalSynergyPicks} lần / ${m.totalRuns} lượt`,
      targetText: '≥ 0.5 lần / lượt',
      status: 'insufficient',
      note: 'Cần tối thiểu 2 lượt chơi để đánh giá',
    });
  } else {
    const avg = totalSynergyPicks / m.totalRuns;
    const ok = avg >= 0.5;
    rows.push({
      id: 'synergy_adoption',
      label: 'Tỷ lệ kích hoạt Cộng Hưởng kỹ năng',
      actualText: `${avg.toFixed(2)} lần / lượt (${totalSynergyPicks})`,
      targetText: '≥ 0.50 lần / lượt',
      status: ok ? 'pass' : 'warn',
      note: ok ? 'Người chơi ghép Cộng Hưởng đều đặn' : 'Gợi ý ghép cặp chưa đủ nổi bật',
    });
  }

  // 7. Endgame Progression Reach (Ch.4–12 boss progression)
  const lateBossKeys = [
    'ch4_gemini_boss',
    'ch5_cancer_boss',
    'ch6_virgo_boss',
    'ch7_libra_boss',
    'ch8_scorpio_boss',
    'ch9_sagittarius_boss',
    'ch10_capricorn_boss',
    'ch11_aquarius_boss',
    'ch12_pisces_boss',
  ];
  const clearedLateBosses = lateBossKeys.filter((k) => m.bossAttempts[k]?.cleared).length;
  const highestCleared = Math.max(0, context?.highestChapterCleared ?? 0);
  if (m.totalRuns < 4 && highestCleared < 3) {
    rows.push({
      id: 'endgame_reach',
      label: 'Chinh phục trung & hậu cuộc (Ch.4–12)',
      actualText: `Đã vượt Ch.${highestCleared} · ${clearedLateBosses}/9 Boss`,
      targetText: 'Vượt Ch.4+ hoặc hạ ≥ 1 Boss Ch.4–12',
      status: 'insufficient',
      note: 'Ghi nhận sau giai đoạn đầu (từ 4 lượt hoặc vượt Ch.3)',
    });
  } else {
    const ok = highestCleared >= 4 || clearedLateBosses >= 1;
    rows.push({
      id: 'endgame_reach',
      label: 'Chinh phục trung & hậu cuộc (Ch.4–12)',
      actualText: `Ch.${highestCleared}/12 · ${clearedLateBosses}/9 Boss`,
      targetText: 'Vượt Ch.4+ hoặc hạ ≥ 1 Boss Ch.4–12',
      status: ok ? 'pass' : 'warn',
      note: ok
        ? 'Tiến trình trung/hậu cuộc vượt ngưỡng trơn tru'
        : 'Độ dốc Ch.3 → Ch.4 có thể đang cản tiến trình',
    });
  }

  // 8. Build Depth (Gear Sets, Hero Mastery, Synergy Diversity)
  const distinctSynergies = Object.values(m.synergyPickCounts).filter((n) => (n ?? 0) > 0).length;
  const activeSetCount = Math.max(0, context?.activeSetCount ?? 0);
  const maxMasteryLevel = Math.max(1, context?.maxMasteryLevel ?? 1);
  if (m.totalRuns < 3) {
    rows.push({
      id: 'build_depth',
      label: 'Chiều sâu Build (Bộ Đồ · Tinh Thông · Cộng Hưởng)',
      actualText: `${activeSetCount} Bộ · Tinh Thông Lv.${maxMasteryLevel} · ${distinctSynergies} Cộng Hưởng`,
      targetText: '≥ 1 Bộ Đồ hoặc Tinh Thông Lv.3+ hoặc ≥ 2 Cộng Hưởng',
      status: 'insufficient',
      note: 'Cần tối thiểu 3 lượt để đo chiều sâu phối đồ',
    });
  } else {
    const ok = activeSetCount >= 1 || maxMasteryLevel >= 3 || distinctSynergies >= 2;
    rows.push({
      id: 'build_depth',
      label: 'Chiều sâu Build (Bộ Đồ · Tinh Thông · Cộng Hưởng)',
      actualText: `${activeSetCount} Bộ · Lv.${maxMasteryLevel} · ${distinctSynergies} Cộng Hưởng`,
      targetText: '≥ 1 Bộ · Lv.3+ hoặc ≥ 2 Cộng Hưởng',
      status: ok ? 'pass' : 'warn',
      note: ok
        ? 'Hệ thống phối trang bị & Tinh Thông phát huy hiệu quả'
        : 'Người chơi chưa kích hoạt sâu Bộ Đồ / Tinh Thông',
    });
  }

  return rows;
}

// ============================================================================
// PHASE 4 · HERO MASTERY (LV.1–10 PER HERO, LV.1 = +0% STATS)
// ============================================================================

export const HERO_MASTERY_MAX_LEVEL = 10;

export function getHeroMasteryExpRequired(level: number): number {
  const lv = Math.max(1, Math.min(HERO_MASTERY_MAX_LEVEL, Math.floor(level)));
  if (lv >= HERO_MASTERY_MAX_LEVEL) return 0;
  return 100 + (lv - 1) * 85;
}

export function normalizeHeroMastery(
  raw?: Partial<Record<HeroId, HeroMasteryProgress>>
): Partial<Record<HeroId, HeroMasteryProgress>> {
  if (!raw || typeof raw !== 'object') return {};
  const result: Partial<Record<HeroId, HeroMasteryProgress>> = {};
  for (const [k, entry] of Object.entries(raw)) {
    if (!entry || typeof entry !== 'object') continue;
    const level = Math.max(1, Math.min(HERO_MASTERY_MAX_LEVEL, Math.floor(entry.level || 1)));
    const nextReq = getHeroMasteryExpRequired(level);
    const exp =
      level >= HERO_MASTERY_MAX_LEVEL
        ? 0
        : Math.max(0, Math.min(Math.max(0, nextReq - 1), Math.floor(entry.exp || 0)));
    result[k as HeroId] = {
      level,
      exp,
      totalRuns: Math.max(0, Math.floor(entry.totalRuns || 0)),
    };
  }
  return result;
}

export function computeHeroMasteryBonuses(
  raw: Partial<Record<HeroId, HeroMasteryProgress>> | undefined,
  heroId: HeroId
): HeroMasteryBonuses {
  const normalized = normalizeHeroMastery(raw);
  const progress = normalized[heroId] ?? { level: 1, exp: 0, totalRuns: 0 };
  const level = progress.level;
  const levelsAboveOne = Math.max(0, level - 1);
  const isMax = level >= HERO_MASTERY_MAX_LEVEL;
  const nextExp = getHeroMasteryExpRequired(level);

  const atkPct = Number((levelsAboveOne * 0.02).toFixed(4));
  const hpPct = Number((levelsAboveOne * 0.025).toFixed(4));
  const critChance = level >= 5 ? 0.04 : 0;
  const bossDamageBonus = level >= 10 ? 0.08 : 0;
  const cpBonus = levelsAboveOne * 45;

  const parts: string[] = [];
  if (levelsAboveOne > 0) {
    parts.push(`+${Math.round(atkPct * 100)}% ATK`);
    parts.push(`+${(hpPct * 100).toFixed(1).replace(/\.0$/, '')}% HP`);
  }
  if (critChance > 0) parts.push(`+${Math.round(critChance * 100)}% Chí Mạng`);
  if (bossDamageBonus > 0) parts.push(`+${Math.round(bossDamageBonus * 100)}% Sát Thương Boss`);

  return {
    level,
    exp: progress.exp,
    nextExp,
    isMax,
    atkPct,
    hpPct,
    critChance,
    bossDamageBonus,
    cpBonus,
    summaryLabel: parts.length > 0 ? parts.join(' · ') : 'Chưa kích hoạt (đạt Lv.2 để mở thưởng)',
  };
}

export function computeRunMasteryExpGain(params: {
  chapterId: number;
  stageReached: number;
  victory: boolean;
  isTowerMode?: boolean;
  towerFloor?: number;
  isBossRushMode?: boolean;
  isDailyRiftMode?: boolean;
}): number {
  if (params.isTowerMode) {
    const floor = Math.max(1, Math.floor(params.towerFloor ?? params.stageReached));
    return Math.round(28 + floor * 6 + (params.victory ? 25 : 0));
  }
  if (params.isBossRushMode) {
    return Math.round(35 + Math.max(1, params.stageReached) * 14 + (params.victory ? 45 : 0));
  }
  if (params.isDailyRiftMode) {
    return Math.round(32 + Math.max(1, params.stageReached) * 10 + (params.victory ? 30 : 0));
  }
  const ch = Math.max(1, Math.min(12, Math.floor(params.chapterId || 1)));
  const stage = Math.max(1, Math.min(12, Math.floor(params.stageReached || 1)));
  return Math.round(18 + ch * 8 + stage * 4 + (params.victory ? 36 : 0));
}

export function grantHeroMasteryExp(
  raw: Partial<Record<HeroId, HeroMasteryProgress>> | undefined,
  heroId: HeroId,
  expGain: number
): {
  nextMap: Partial<Record<HeroId, HeroMasteryProgress>>;
  prevLevel: number;
  nextLevel: number;
  leveledUp: boolean;
  expGained: number;
} {
  const nextMap = normalizeHeroMastery(raw);
  const current = nextMap[heroId] ?? { level: 1, exp: 0, totalRuns: 0 };
  const gain = Math.max(0, Math.floor(expGain));
  let level = current.level;
  let exp = current.exp + gain;

  while (level < HERO_MASTERY_MAX_LEVEL) {
    const req = getHeroMasteryExpRequired(level);
    if (exp < req) break;
    exp -= req;
    level += 1;
  }
  if (level >= HERO_MASTERY_MAX_LEVEL) {
    level = HERO_MASTERY_MAX_LEVEL;
    exp = 0;
  }

  nextMap[heroId] = {
    level,
    exp,
    totalRuns: current.totalRuns + 1,
  };

  return {
    nextMap,
    prevLevel: current.level,
    nextLevel: level,
    leveledUp: level > current.level,
    expGained: gain,
  };
}

// ============================================================================
// PHASE 4 · 3 SAVED LOADOUT PRESETS (CAMPAIGN / BOSS / TOWER)
// ============================================================================

export const DEFAULT_LOADOUT_PRESET_SLOTS: ReadonlyArray<{
  slotId: LoadoutPresetSlotId;
  defaultName: string;
}> = [
  { slotId: 'preset_1', defaultName: 'Bộ 1 · Chiến Dịch' },
  { slotId: 'preset_2', defaultName: 'Bộ 2 · Săn Boss' },
  { slotId: 'preset_3', defaultName: 'Bộ 3 · Leo Tháp' },
];

export function normalizeLoadoutPresets(raw?: LoadoutPreset[]): LoadoutPreset[] {
  if (!Array.isArray(raw)) return [];
  const validSlots = new Set<LoadoutPresetSlotId>(['preset_1', 'preset_2', 'preset_3']);
  const seen = new Set<LoadoutPresetSlotId>();
  const out: LoadoutPreset[] = [];
  for (const p of raw) {
    if (!p || !validSlots.has(p.slotId) || seen.has(p.slotId)) continue;
    seen.add(p.slotId);
    out.push({
      slotId: p.slotId,
      name:
        typeof p.name === 'string' && p.name.trim().length > 0
          ? p.name.trim().slice(0, 28)
          : DEFAULT_LOADOUT_PRESET_SLOTS.find((s) => s.slotId === p.slotId)?.defaultName ?? 'Bộ Trang Bị',
      heroId: p.heroId,
      equipped: { ...(p.equipped ?? {}) },
      equippedRunes: Array.isArray(p.equippedRunes) ? p.equippedRunes.slice(0, 4) : [],
      equippedPetId: p.equippedPetId ?? null,
      equippedWingId: p.equippedWingId ?? null,
      savedAt: typeof p.savedAt === 'number' ? p.savedAt : Date.now(),
    });
  }
  return out;
}

export function captureLoadoutPreset(
  save: SaveData,
  slotId: LoadoutPresetSlotId,
  customName?: string
): LoadoutPreset[] {
  const existing = normalizeLoadoutPresets(save.loadoutPresets);
  const slotMeta = DEFAULT_LOADOUT_PRESET_SLOTS.find((s) => s.slotId === slotId);
  const prev = existing.find((p) => p.slotId === slotId);
  const nextPreset: LoadoutPreset = {
    slotId,
    name: customName?.trim() || prev?.name || slotMeta?.defaultName || 'Bộ Trang Bị',
    heroId: save.selectedHeroId,
    equipped: { ...(save.equipped ?? {}) },
    equippedRunes: [...(save.equippedRunes ?? [])].slice(0, 4),
    equippedPetId: save.equippedPetId ?? null,
    equippedWingId: save.equippedWingId ?? null,
    savedAt: Date.now(),
  };
  const filtered = existing.filter((p) => p.slotId !== slotId);
  return [...filtered, nextPreset].sort((a, b) => a.slotId.localeCompare(b.slotId));
}

export function applyLoadoutPreset(
  save: SaveData,
  slotId: LoadoutPresetSlotId
): {
  nextSave: SaveData;
  appliedGearCount: number;
  skippedGearCount: number;
  preset: LoadoutPreset | null;
} {
  const presets = normalizeLoadoutPresets(save.loadoutPresets);
  const preset = presets.find((p) => p.slotId === slotId) ?? null;
  if (!preset) {
    return { nextSave: save, appliedGearCount: 0, skippedGearCount: 0, preset: null };
  }

  const inventoryUidSet = new Set(save.inventory.map((g) => g.uid));
  const nextEquipped: Partial<Record<GearSlot, string>> = { ...(save.equipped ?? {}) };
  let appliedGearCount = 0;
  let skippedGearCount = 0;

  for (const [slotKey, uid] of Object.entries(preset.equipped)) {
    if (!uid) continue;
    if (inventoryUidSet.has(uid)) {
      nextEquipped[slotKey as GearSlot] = uid;
      appliedGearCount += 1;
    } else {
      skippedGearCount += 1;
    }
  }

  const runeUidSet = new Set((save.runeInventory ?? []).map((r) => r.uid));
  const nextRunes = preset.equippedRunes.filter((uid) => runeUidSet.has(uid)).slice(0, 4);

  // Never silently switch the player's active hero when swapping equipment/rune/pet loadouts.
  const nextHeroId = save.selectedHeroId;

  const ownedPetIds = new Set((save.pets ?? []).map((p) => p.petId));
  const nextPetId =
    preset.equippedPetId && ownedPetIds.has(preset.equippedPetId)
      ? preset.equippedPetId
      : save.equippedPetId ?? null;

  const ownedWingIds = new Set(save.unlockedWings ?? []);
  const nextWingId =
    preset.equippedWingId && ownedWingIds.has(preset.equippedWingId)
      ? preset.equippedWingId
      : save.equippedWingId ?? null;

  return {
    nextSave: {
      ...save,
      selectedHeroId: nextHeroId,
      equipped: nextEquipped,
      equippedRunes: nextRunes.length > 0 || preset.equippedRunes.length === 0 ? nextRunes : save.equippedRunes,
      equippedPetId: nextPetId,
      equippedWingId: nextWingId,
      activeLoadoutPresetId: slotId,
    },
    appliedGearCount,
    skippedGearCount,
    preset,
  };
}

// ============================================================================
// PHASE 4 · STANDARDIZED ENDLESS TOWER SCALING (FLOORS 1–50+)
// ============================================================================

export function getEndlessTowerScaling(
  floor: number,
  highestChapterCleared = 0
): EndlessTowerFloorScaling {
  const f = Math.max(1, Math.floor(floor || 1));
  const chTier = Math.max(0, Math.min(12, Math.floor(highestChapterCleared || 0)));
  // Gentle anchor so early players can climb Floors 1–9 cleanly while Ch.7–12 veterans face real endgame pressure
  const chapterAnchorHp = 1 + Math.min(chTier, 6) * 0.08 + Math.max(0, chTier - 6) * 0.14;
  const chapterAnchorDmg = 1 + Math.min(chTier, 6) * 0.05 + Math.max(0, chTier - 6) * 0.08;

  const floorHpGrowth = 1 + (f - 1) * 0.24 + Math.pow(Math.max(0, f - 10), 1.25) * 0.09;
  const floorDmgGrowth = 1 + (f - 1) * 0.11 + Math.pow(Math.max(0, f - 12), 1.15) * 0.04;

  const enemyHpScale = Number((floorHpGrowth * chapterAnchorHp).toFixed(2));
  const enemyDmgScale = Number((floorDmgGrowth * chapterAnchorDmg).toFixed(2));
  const goldReward = Math.round((42 + f * 18 + Math.floor(f / 5) * 35) * (1 + chTier * 0.08));
  const starDustReward = Math.round(6 + f * 2.5 + (f % 5 === 0 ? 12 : 0));
  const gemReward = f % 5 === 0 ? 10 + Math.floor(f / 5) * 4 : Math.max(2, Math.floor(f / 4) + 1);

  const enableHazards = f >= 10;
  const enableDualAffixElites = f >= 12;
  const enableBossPhaseThree = f >= 20;

  let tierTitle = 'Khởi Hành';
  if (f >= 20) tierTitle = 'Tối Thượng';
  else if (f >= 12) tierTitle = 'Song Ấn';
  else if (f >= 10) tierTitle = 'Nguy Hiểm';

  return {
    floor: f,
    enemyHpScale,
    enemyDmgScale,
    goldReward,
    starDustReward,
    gemReward,
    enableHazards,
    enableDualAffixElites,
    enableBossPhaseThree,
    label: `Tầng ${f} · ${tierTitle}`,
  };
}




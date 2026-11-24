import {
  AstralGemVaultMilestone,
  AstralGemVaultState,
  DivineHaloDefinition,
  HaloId,
  PantheonBlessingDef,
  PantheonBlessingId,
  PantheonExpeditionState,
  PantheonMilestone,
  SaveData,
  StepUpChainState,
  StepUpChainStep,
} from '../types/game';
import { getTodayKey } from './questsData';

// ============================================================================
// 1. 3D DIVINE ZODIAC HALOS (HÀO QUANG THẦN VỰC 3D SAU LƯNG ANH HÙNG)
// ============================================================================

export const DIVINE_HALO_MAX_LEVEL = 12;

export const DIVINE_HALO_CATALOG: DivineHaloDefinition[] = [
  {
    id: 'gemini_halo',
    name: 'Pháp Trận Song Tử',
    badge: 'CHƯƠNG 4 · HÀO QUANG 3D',
    elementLabel: 'Song Tử · Kính Giới Tinh Vân',
    desc: 'Pháp trận Song Tử song luân khắc ấn tinh vân xoay sau lưng, tăng mạnh Công, Máu, Bạo Thương và Giảm Thương.',
    primaryHex: 0x38bdf8,
    secondaryHex: 0xa78bfa,
    baseAtkPct: 0.12,
    baseHpPct: 0.11,
    baseCritDmg: 0.24,
    baseDr: 0.055,
    atkPctPerLv: 0.02,
    hpPctPerLv: 0.017,
    critDmgPerLv: 0.034,
    unlockGems: 0,
    unlockDivineCrystals: 0,
  },
  {
    id: 'emerald_taurus_halo',
    name: 'Pháp Trận Lục Bảo Kim Ngưu',
    badge: 'CHƯƠNG 3 · HÀO QUANG 3D',
    elementLabel: 'Kim Ngưu · Thánh Địa Lục Bảo',
    desc: 'Vầng pháp trận ngọc lục bảo khắc ấn Kim Ngưu xoay sau lưng, tăng mạnh Công, Máu, Bạo Thương và Giảm Thương.',
    primaryHex: 0x10b981,
    secondaryHex: 0xfde68a,
    baseAtkPct: 0.115,
    baseHpPct: 0.105,
    baseCritDmg: 0.23,
    baseDr: 0.05,
    atkPctPerLv: 0.019,
    hpPctPerLv: 0.016,
    critDmgPerLv: 0.032,
    unlockGems: 0,
    unlockDivineCrystals: 0,
  },
  {
    id: 'aries_vanguard', name: 'Hào Quang Tiên Phong Bạch Dương', badge: 'CHƯƠNG 2 · HÀO QUANG 3D',
    elementLabel: 'Bạch Dương · Hỏa Tinh', desc: 'Vòng lửa khắc huy hiệu Bạch Dương.',
    primaryHex: 0xf97316, secondaryHex: 0xffba60,
    baseAtkPct: 0.11, baseHpPct: 0.09, baseCritDmg: 0.22, baseDr: 0.045,
    atkPctPerLv: 0.018, hpPctPerLv: 0.015, critDmgPerLv: 0.03, unlockGems: 0, unlockDivineCrystals: 0,
  },
  {
    id: 'leo_sovereign',
    name: 'Hào Quang Sư Tử Chí Tôn',
    badge: 'CHƯƠNG 1 · THẦN VỰC 3D',
    elementLabel: 'Sư Tử · Thái Dương Chí Tôn',
    desc: 'Halo of the Leo Sovereign — Vầng thánh luân hoàng kim 3D khắc vương miện Sư Tử xoay sau lưng, khuếch đại Công, Bạo Thương và Giảm Thương.',
    primaryHex: 0xf59e0b,
    secondaryHex: 0xfef08a,
    baseAtkPct: 0.11,
    baseHpPct: 0.09,
    baseCritDmg: 0.22,
    baseDr: 0.045,
    atkPctPerLv: 0.018,
    hpPctPerLv: 0.015,
    critDmgPerLv: 0.03,
    unlockGems: 0,
    unlockDivineCrystals: 0,
  },
];

export const DIVINE_HALO_MAP: Record<HaloId, DivineHaloDefinition> =
  DIVINE_HALO_CATALOG.reduce((acc, item) => {
    acc[item.id] = item;
    return acc;
  }, {} as Record<HaloId, DivineHaloDefinition>);

export function getDivineHaloStats(
  haloId: HaloId | null | undefined,
  level = 1
): {
  atkPct: number;
  hpPct: number;
  critDmg: number;
  dr: number;
} {
  if (!haloId) {
    return { atkPct: 0, hpPct: 0, critDmg: 0, dr: 0 };
  }
  const def = DIVINE_HALO_MAP[haloId];
  if (!def) {
    return { atkPct: 0, hpPct: 0, critDmg: 0, dr: 0 };
  }
  const lv = Math.max(1, Math.min(DIVINE_HALO_MAX_LEVEL, level));
  const extra = lv - 1;
  return {
    atkPct: Number((def.baseAtkPct + extra * def.atkPctPerLv).toFixed(4)),
    hpPct: Number((def.baseHpPct + extra * def.hpPctPerLv).toFixed(4)),
    critDmg: Number((def.baseCritDmg + extra * def.critDmgPerLv).toFixed(4)),
    dr: Number((def.baseDr + extra * 0.003).toFixed(4)),
  };
}

export function getDivineHaloUpgradeCost(level: number): {
  gold: number;
  divineCrystals: number;
} {
  const lv = Math.max(1, level);
  return {
    gold: 260 + lv * 190,
    divineCrystals: 6 + lv * 4,
  };
}

// ============================================================================
// 2. STEP-UP COMMERCIAL CHAIN RELAY (CHUỖI QUÀ LIÊN HOÀN 5 BƯỚC)
// ============================================================================

export const STEP_UP_CHAIN_STEPS: StepUpChainStep[] = [
  {
    step: 1,
    title: 'Bước 1 · Lộc Tinh Khởi Đầu',
    subtitle: 'Nhận miễn phí Vàng, Thần Tinh & Vé Ước Nguyện để mở khóa Bước 2!',
    badge: 'BƯỚC 1 · MIỄN PHÍ 0Đ',
    valueLabel: 'QUÀ TẶNG MỞ MÀN',
    costGems: 0,
    rewardGold: 420,
    rewardGems: 15,
    rewardDivineCrystals: 8,
    rewardArtifactShards: 4,
    rewardWishTickets: 1,
    topUpPoints: 10,
  },
  {
    step: 2,
    title: 'Bước 2 · Tiếp Tế Tinh Quân',
    subtitle: 'Gói đầu tư nhẹ hoàn trả lớn Thần Tinh, Mảnh Thánh Khí & Vàng.',
    badge: 'BƯỚC 2 · LỜI 350%',
    valueLabel: 'GIÁ TRỊ X3.5',
    costGems: 48,
    rewardGold: 950,
    rewardGems: 0,
    rewardDivineCrystals: 16,
    rewardArtifactShards: 10,
    rewardWishTickets: 2,
    topUpPoints: 50,
  },
  {
    step: 3,
    title: 'Bước 3 · Trạm Phúc Lợi Đặc Quyền',
    subtitle: 'Phần thưởng tri ân MIỄN PHÍ dành cho chiến binh đã hoàn thành Bước 2!',
    badge: 'BƯỚC 3 · THƯỞNG FREE',
    valueLabel: 'HOÀN TRẢ 100% FREE',
    costGems: 0,
    rewardGold: 750,
    rewardGems: 30,
    rewardDivineCrystals: 14,
    rewardArtifactShards: 8,
    rewardWishTickets: 2,
    topUpPoints: 25,
  },
  {
    step: 4,
    title: 'Bước 4 · Rương Thánh Vật Hoàng Gia',
    subtitle: 'Chắc chắn nhận 1 Trang Bị [S] Sử Thi+ kèm kho Thần Tinh nâng Hào Quang 3D.',
    badge: 'BƯỚC 4 · NỔ ĐỒ [S]',
    valueLabel: 'GIÁ TRỊ X5.0',
    costGems: 98,
    rewardGold: 1800,
    rewardGems: 0,
    rewardDivineCrystals: 28,
    rewardArtifactShards: 18,
    rewardWishTickets: 4,
    rewardSGear: true,
    topUpPoints: 110,
  },
  {
    step: 5,
    title: 'Bước 5 · Đỉnh Cao Hào Quang Sư Tử Chí Tôn',
    subtitle: 'Nhận Trang Bị [S] + 45 Thần Tinh nâng cấp Hào Quang Sư Tử Chí Tôn 3D!',
    badge: 'BƯỚC 5 · ĐẠI ĐẶC QUYỀN',
    valueLabel: 'SIÊU PHẨM 900%',
    costGems: 145,
    rewardGold: 3200,
    rewardGems: 40,
    rewardDivineCrystals: 45,
    rewardArtifactShards: 25,
    rewardWishTickets: 6,
    rewardSGear: true,
    unlockHaloId: 'leo_sovereign',
    topUpPoints: 180,
  },
];

export function normalizeStepUpChain(s?: Partial<StepUpChainState>): StepUpChainState {
  const claimedSteps = Array.isArray(s?.claimedSteps)
    ? s.claimedSteps.filter((n) => typeof n === 'number' && n >= 1 && n <= 5)
    : [];
  const rawStep = typeof s?.currentStep === 'number' ? s.currentStep : 1;
  const currentStep = Math.max(1, Math.min(6, rawStep));
  return {
    currentStep,
    claimedSteps,
    cycleCount: Math.max(0, s?.cycleCount ?? 0),
  };
}

export function canClaimCurrentChainStep(save: SaveData): boolean {
  const chain = normalizeStepUpChain(save.stepUpChain);
  if (chain.currentStep > 5) return false;
  const stepDef = STEP_UP_CHAIN_STEPS.find((st) => st.step === chain.currentStep);
  if (!stepDef) return false;
  if (chain.claimedSteps.includes(stepDef.step)) return false;
  return save.gems >= stepDef.costGems;
}

export function hasFreeChainStepReady(save: SaveData): boolean {
  const chain = normalizeStepUpChain(save.stepUpChain);
  if (chain.currentStep > 5) return false;
  const stepDef = STEP_UP_CHAIN_STEPS.find((st) => st.step === chain.currentStep);
  if (!stepDef) return false;
  return stepDef.costGems === 0 && !chain.claimedSteps.includes(stepDef.step);
}

// ============================================================================
// 3. ASTRAL GEM REBATE VAULT (NGÂN HÀNG HOÀN TRẢ NGỌC TINH GIỚI)
// ============================================================================

export const GEM_VAULT_CAPACITY = 300;
export const GEM_VAULT_CLAIM_THRESHOLD = 60;

export const GEM_VAULT_MILESTONES: AstralGemVaultMilestone[] = [
  {
    storedTarget: 60,
    title: 'Cổ Tức Tinh Ngân I',
    dividendGems: 20,
    bonusDivineCrystals: 8,
    bonusWishTickets: 1,
  },
  {
    storedTarget: 120,
    title: 'Cổ Tức Tinh Ngân II',
    dividendGems: 35,
    bonusDivineCrystals: 14,
    bonusWishTickets: 2,
  },
  {
    storedTarget: 200,
    title: 'Cổ Tức Tinh Ngân III',
    dividendGems: 55,
    bonusDivineCrystals: 22,
    bonusWishTickets: 3,
  },
  {
    storedTarget: 300,
    title: 'Đại Kho Báu Hoàng Gia',
    dividendGems: 90,
    bonusDivineCrystals: 35,
    bonusWishTickets: 5,
  },
];

export function normalizeGemRebateVault(v?: Partial<AstralGemVaultState>): AstralGemVaultState {
  const storedGems = Math.max(0, Math.min(GEM_VAULT_CAPACITY, Math.round(v?.storedGems ?? 28)));
  const totalDepositedEver = Math.max(storedGems, Math.round(v?.totalDepositedEver ?? 28));
  return {
    storedGems,
    totalDepositedEver,
    vaultBrokenCount: Math.max(0, v?.vaultBrokenCount ?? 0),
    claimedMilestoneTargets: Array.isArray(v?.claimedMilestoneTargets)
      ? v.claimedMilestoneTargets
      : [],
  };
}

export function depositToGemRebateVault(
  current: Partial<AstralGemVaultState> | undefined,
  addAmount: number
): AstralGemVaultState {
  const norm = normalizeGemRebateVault(current);
  const delta = Math.max(0, Math.round(addAmount));
  return {
    ...norm,
    storedGems: Math.min(GEM_VAULT_CAPACITY, norm.storedGems + delta),
    totalDepositedEver: norm.totalDepositedEver + delta,
  };
}

export function countClaimableVaultRewards(save: SaveData): number {
  const vault = normalizeGemRebateVault(save.gemRebateVault);
  let count = 0;
  if (vault.storedGems >= GEM_VAULT_CLAIM_THRESHOLD) {
    count++;
  }
  for (const ms of GEM_VAULT_MILESTONES) {
    if (
      vault.totalDepositedEver >= ms.storedTarget &&
      !vault.claimedMilestoneTargets.includes(ms.storedTarget)
    ) {
      count++;
    }
  }
  return count;
}

// ============================================================================
// 4. 12TH GAME MODE: CELESTIAL PANTHEON BOSS EXPEDITION (VIỄN CHINH ĐIỆN THẦN 3D)
// ============================================================================

export const MAX_DAILY_PANTHEON_RUNS = 3;
export const PANTHEON_TOTAL_STAGES = 3;

export const PANTHEON_BLESSINGS: PantheonBlessingDef[] = [
  {
    id: 'blessing_wrath',
    name: 'Thần Ấn Cuồng Chiến',
    badge: '+28% CÔNG · +10% BẠO',
    desc: 'Nhận chúc phúc Chiến Thần: Tăng 28% Sát Thương Công Kích và +10% Tỷ Lệ Bạo Kích trong Điện Thần.',
    atkBonusPct: 0.28,
    critBonus: 0.1,
    drBonus: 0,
    accentColor: 'text-rose-300 border-rose-400/40 bg-rose-950/60',
  },
  {
    id: 'blessing_starlight',
    name: 'Thần Ấn Tinh Quang',
    badge: '+18% CÔNG · +18% BẠO · +10% THỦ',
    desc: 'Sự cân bằng hoàn hảo của 12 Chòm Sao: Tăng 18% Công, +18% Bạo Kích và +10% Giảm Sát Thương.',
    atkBonusPct: 0.18,
    critBonus: 0.18,
    drBonus: 0.1,
    accentColor: 'text-amber-300 border-amber-400/40 bg-amber-950/60',
  },
  {
    id: 'blessing_immortal',
    name: 'Thần Ấn Bất Tử',
    badge: '+24% GIẢM THƯƠNG · +12% CÔNG',
    desc: 'Hộ thuẫn Vạn Cổ bảo vệ trước các đòn càn quét của 3 Cổ Thần Hoàng Đạo.',
    atkBonusPct: 0.12,
    critBonus: 0.06,
    drBonus: 0.24,
    accentColor: 'text-cyan-300 border-cyan-400/40 bg-cyan-950/60',
  },
];

export const PANTHEON_MILESTONES: PantheonMilestone[] = [
  {
    score: 1200,
    title: 'Bậc I · Kẻ Chạm Ngưỡng Điện Thần',
    rewardGems: 25,
    rewardDivineCrystals: 12,
    rewardArtifactShards: 6,
  },
  {
    score: 2600,
    title: 'Bậc II · Thợ Săn Cổ Thần',
    rewardGems: 40,
    rewardDivineCrystals: 20,
    rewardArtifactShards: 10,
  },
  {
    score: 4200,
    title: 'Bậc III · Chinh Phục Tam Thần',
    rewardGems: 65,
    rewardDivineCrystals: 32,
    rewardArtifactShards: 16,
  },
  {
    score: 6000,
    title: 'Bậc IV · Chúa Tể Điện Thần Tối Thượng',
    rewardGems: 95,
    rewardDivineCrystals: 48,
    rewardArtifactShards: 24,
  },
];

export function normalizePantheonExpedition(
  p?: Partial<PantheonExpeditionState>,
  hasVip = false
): PantheonExpeditionState {
  const today = getTodayKey();
  const maxRuns = MAX_DAILY_PANTHEON_RUNS + (hasVip ? 1 : 0);
  const validBlessing: PantheonBlessingId =
    p?.selectedBlessingId &&
    PANTHEON_BLESSINGS.some((b) => b.id === p.selectedBlessingId)
      ? p.selectedBlessingId
      : 'blessing_starlight';

  if (!p || p.date !== today) {
    return {
      date: today,
      dailyRunsRemaining: maxRuns,
      selectedBlessingId: validBlessing,
      bestDeityStage: Math.max(0, Math.min(3, p?.bestDeityStage ?? 0)),
      bestScore: Math.max(0, p?.bestScore ?? 0),
      totalClears: Math.max(0, p?.totalClears ?? 0),
      claimedMilestones: Array.isArray(p?.claimedMilestones) ? p.claimedMilestones : [],
    };
  }
  return {
    date: today,
    dailyRunsRemaining: Math.max(0, Math.min(maxRuns, p.dailyRunsRemaining ?? maxRuns)),
    selectedBlessingId: validBlessing,
    bestDeityStage: Math.max(0, Math.min(3, p.bestDeityStage ?? 0)),
    bestScore: Math.max(0, p.bestScore ?? 0),
    totalClears: Math.max(0, p.totalClears ?? 0),
    claimedMilestones: Array.isArray(p.claimedMilestones) ? p.claimedMilestones : [],
  };
}

export function countClaimablePantheonMilestones(save: SaveData): number {
  const st = normalizePantheonExpedition(save.pantheonExpedition);
  let count = 0;
  for (const ms of PANTHEON_MILESTONES) {
    if (st.bestScore >= ms.score && !st.claimedMilestones.includes(ms.score)) {
      count++;
    }
  }
  return count;
}

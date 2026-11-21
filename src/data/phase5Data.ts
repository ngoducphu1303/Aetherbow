import { CHAPTERS } from './chaptersData';
import { getBossTelemetryKey, migrateSaveData, PUNISH_WINDOW_DAMAGE_BONUS, PUNISH_WINDOW_PHASE3_BONUS } from './earlyProgressionData';
import { createInitialSaveData } from './gearData';
import { SKILLS_CATALOG, SKILL_SYNERGIES } from './skillsData';
import {
  BossCodexEntry,
  HeroActiveSkillDef,
  HeroId,
  NightmareMutatorDef,
  NightmareMutatorId,
  NightmareTierConfig,
  SaveData,
  SaveTransferPreview,
  SkillSynergyId,
  SynergyCodexEntry,
  TrainingDpsSnapshot,
} from '../types/game';

// ============================================================================
// 1. 8 HERO SIGNATURE 3D ACTIVE SKILLS (KEY E — INDEPENDENT OF STATIC CP)
// ============================================================================

export const HERO_ACTIVE_SKILLS: Record<HeroId, HeroActiveSkillDef> = {
  artemis: {
    heroId: 'artemis',
    name: 'Nguyệt Tiễn Xuyên Giáp',
    shortLabel: 'Nguyệt Tiễn',
    desc: 'Phóng quạt 3 tia Trăng Bạc xuyên phá gây 155% ATK và khắc Ấn Ký +20% sát thương.',
    cooldownSec: 9.0,
    damageMult: 1.55,
    effectKind: 'moon_fan_mark',
    accentHex: 0x34d399,
    accentCss: '#34d399',
    radius: 7.5,
  },
  alex: {
    heroId: 'alex',
    name: 'Nhịp Điệu Dũng Khí',
    shortLabel: 'Dũng Khí',
    desc: 'Sóng chấn động đẩy lùi 125% ATK và kích hoạt +28% Tốc Bắn, +15% Tốc Chạy trong 3.5s.',
    cooldownSec: 8.5,
    damageMult: 1.25,
    effectKind: 'valiant_cadence',
    accentHex: 0x38bdf8,
    accentCss: '#38bdf8',
    radius: 4.5,
    durationSec: 3.5,
  },
  hatsune_miku: {
    heroId: 'hatsune_miku',
    name: 'Nhịp Điệu Sân Khấu',
    shortLabel: 'Nhịp Điệu',
    desc: 'Sóng âm đẩy lùi gây 125% ATK và tăng 28% tốc bắn, 15% tốc chạy trong 3,5 giây.',
    cooldownSec: 8.5,
    damageMult: 1.25,
    effectKind: 'stage_crescendo',
    accentHex: 0x39c5bb,
    accentCss: '#39c5bb',
    radius: 4.5,
    durationSec: 3.5,
  },
  dracoola: {
    heroId: 'dracoola',
    name: 'Bầy Dơi Huyết Ảnh',
    shortLabel: 'Huyết Dơi',
    desc: 'Phóng vòng 6 dơi huyết năng gây 140% ATK diện rộng và hồi ngay +8% Max HP.',
    cooldownSec: 9.5,
    damageMult: 1.4,
    effectKind: 'crimson_swarm',
    accentHex: 0xfb7185,
    accentCss: '#fb7185',
    radius: 5.5,
  },
  rolla: {
    heroId: 'rolla',
    name: 'Băng Trụ Phong Tỏa',
    shortLabel: 'Băng Trụ',
    desc: 'Triệu hồi trụ băng 3D gây 150% ATK quanh mục tiêu gần nhất và đóng băng 1.6s.',
    cooldownSec: 9.5,
    damageMult: 1.5,
    effectKind: 'glacial_spire',
    accentHex: 0x67e8f9,
    accentCss: '#67e8f9',
    radius: 4.4,
    durationSec: 1.6,
  },
  cleo: {
    heroId: 'cleo',
    name: 'Vòng Hỏa Ngục',
    shortLabel: 'Hỏa Ngục',
    desc: 'Kích nổ vòng lửa 3D bán kính 4.8m gây 165% ATK và thiêu đốt mọi quái lân cận.',
    cooldownSec: 9.0,
    damageMult: 1.65,
    effectKind: 'ember_nova',
    accentHex: 0xf97316,
    accentCss: '#f97316',
    radius: 4.8,
  },
  thor: {
    heroId: 'thor',
    name: 'Tia Sét Mjolnir',
    shortLabel: 'Sét Mjolnir',
    desc: 'Giật chuỗi 4 tia sét liên hoàn gây 155% ATK kèm làm choáng 0.8s.',
    cooldownSec: 8.5,
    damageMult: 1.55,
    effectKind: 'thunder_arc',
    accentHex: 0x60a5fa,
    accentCss: '#60a5fa',
    radius: 7.2,
    durationSec: 0.8,
  },
  atreus: {
    heroId: 'atreus',
    name: 'Hắc Giáp Bộc Phá',
    shortLabel: 'Hắc Giáp',
    desc: 'Dựng tức thì +16% Max HP Khiên Hắc Ám và phóng vòng gai bóng tối 135% ATK.',
    cooldownSec: 10.0,
    damageMult: 1.35,
    effectKind: 'abyssal_aegis',
    accentHex: 0xf43f5e,
    accentCss: '#f43f5e',
    radius: 5.0,
  },
  wukong: {
    heroId: 'wukong',
    name: 'Thiết Bổng Xung Kích',
    shortLabel: 'Thiết Bổng',
    desc: 'Giáng Kim Cô Bổng 3D gây 190% ATK và tăng +35% tốc bắn Phân Thân trong 3.5s.',
    cooldownSec: 9.0,
    damageMult: 1.9,
    effectKind: 'cudgel_vault',
    accentHex: 0xf59e0b,
    accentCss: '#f59e0b',
    radius: 4.8,
    durationSec: 3.5,
  },
  lisa: {
    heroId: 'lisa',
    name: 'Đèn Hoa Lôi Vi',
    shortLabel: 'Lôi Vi',
    desc: 'Kích nổ Đèn Hoa Lôi Vi gây 165% ATK diện rộng 5.2m, giật chuỗi Tử Lôi và làm choáng 0.9s.',
    cooldownSec: 9.0,
    damageMult: 1.65,
    effectKind: 'electro_rose_lantern',
    accentHex: 0xa855f7,
    accentCss: '#a855f7',
    radius: 5.2,
    durationSec: 0.9,
  },
  van_tich: {
    heroId: 'van_tich',
    name: 'Điểm Hội Tụ',
    shortLabel: 'Hội Tụ',
    desc: 'Tiêu Dấu Dẫn của mục tiêu gần nhất trong tầm, gây 135% ATK và truyền sét sang tối đa 2 địch gần đó.',
    cooldownSec: 8.5,
    damageMult: 1.35,
    effectKind: 'storm_convergence',
    accentHex: 0x5eead4,
    accentCss: '#5eead4',
    radius: 10.5,
  },
};

export function getHeroActiveSkill(heroId: HeroId): HeroActiveSkillDef {
  return HERO_ACTIVE_SKILLS[heroId] ?? HERO_ACTIVE_SKILLS.artemis;
}

// ============================================================================
// 2. PERFECT DODGE CONSTANTS & PURE CALCULATION
// ============================================================================

export const PERFECT_DODGE_DAMAGE_BONUS = 0.2; // +20% counter damage
export const PERFECT_DODGE_BUFF_DURATION = 2.2; // seconds
export const PERFECT_DODGE_CD_REDUCTION = 2.0; // seconds shaved off Active Skill E
export const PERFECT_DODGE_ULT_GAIN = 12; // +12% Ultimate charge
export const PERFECT_DODGE_INTERNAL_CD = 2.5; // prevents slow-mo / buff spam
export const PERFECT_DODGE_SLOWMO_DURATION = 0.22; // skipped when reduced-motion is active
export const PERFECT_DODGE_SLOWMO_SCALE = 0.38;

export interface PerfectDodgeRewardResult {
  triggered: boolean;
  nextActiveSkillCooldown: number;
  nextUltCharge: number;
  buffDuration: number;
  nextInternalCooldown: number;
  damageMultiplier: number;
}

export function resolvePerfectDodgeTrigger(input: {
  internalCooldown: number;
  activeSkillCooldown: number;
  ultCharge: number;
}): PerfectDodgeRewardResult {
  if (input.internalCooldown > 0) {
    return {
      triggered: false,
      nextActiveSkillCooldown: input.activeSkillCooldown,
      nextUltCharge: input.ultCharge,
      buffDuration: 0,
      nextInternalCooldown: input.internalCooldown,
      damageMultiplier: 1,
    };
  }
  return {
    triggered: true,
    nextActiveSkillCooldown: Math.max(0, Number((input.activeSkillCooldown - PERFECT_DODGE_CD_REDUCTION).toFixed(2))),
    nextUltCharge: Math.min(100, input.ultCharge + PERFECT_DODGE_ULT_GAIN),
    buffDuration: PERFECT_DODGE_BUFF_DURATION,
    nextInternalCooldown: PERFECT_DODGE_INTERNAL_CD,
    damageMultiplier: 1 + PERFECT_DODGE_DAMAGE_BONUS,
  };
}

// ============================================================================
// 3. NIGHTMARE ASCENSION TIERS I–V & 5 ROOM MUTATORS (UNLOCKS AFTER CH.3)
// ============================================================================

export const NIGHTMARE_MAX_TIER = 5;
export const NIGHTMARE_UNLOCK_CHAPTER = 3;

export const NIGHTMARE_MUTATORS: Record<NightmareMutatorId, NightmareMutatorDef> = {
  blood_frenzy: {
    id: 'blood_frenzy',
    name: 'Huyết Cuồng',
    shortDesc: 'Quái tăng +12% tốc độ di chuyển và tấn công quyết liệt hơn.',
  },
  rapid_barrage: {
    id: 'rapid_barrage',
    name: 'Mưa Đạn Nhanh',
    shortDesc: 'Đạn kẻ địch bay nhanh hơn +16% — ưu tiên Lướt Né Hoàn Hảo.',
  },
  dense_hazards: {
    id: 'dense_hazards',
    name: 'Bẫy Dày Đặc',
    shortDesc: 'Chu kỳ Bẫy sàn đấu trường 3D rút ngắn 22%.',
  },
  empowered_elites: {
    id: 'empowered_elites',
    name: 'Tinh Anh Cường Hóa',
    shortDesc: 'Quái Tinh Anh mang thêm 1 Ấn thuộc tính chiến đấu.',
  },
  double_punish: {
    id: 'double_punish',
    name: 'Phản Đòn Nhân Đôi',
    shortDesc: 'Cửa sổ Phản Đòn Boss tăng x1.5 sát thương thưởng cho thao tác né chuẩn.',
    isSkillReward: true,
  },
};

const TIER_ROMAN = ['', 'I', 'II', 'III', 'IV', 'V'];
const CHALLENGE_MUTATOR_CYCLE: NightmareMutatorId[] = [
  'blood_frenzy',
  'rapid_barrage',
  'dense_hazards',
  'empowered_elites',
];

export function isNightmareUnlocked(highestChapterCleared: number): boolean {
  return highestChapterCleared >= NIGHTMARE_UNLOCK_CHAPTER;
}

export function getNightmareTierConfig(chapterId: number, rawTier: number): NightmareTierConfig {
  const tier = Math.max(0, Math.min(NIGHTMARE_MAX_TIER, Math.floor(rawTier || 0)));
  if (tier === 0) {
    return {
      tier: 0,
      chapterId,
      label: 'Chuẩn',
      enemyHpMult: 1,
      enemyDmgMult: 1,
      enemySpeedMult: 1,
      bulletSpeedMult: 1,
      hazardIntervalMult: 1,
      extraEliteAffix: false,
      punishBonusMult: 1,
      goldRewardMult: 1,
      starDustRewardMult: 1,
      masteryExpMult: 1,
      mutators: [],
    };
  }

  // Smooth monotonic Ascension I..V curve (30-Day Fair Progression pinnacle challenge)
  const hpTable = [1, 1.55, 2.2, 3.05, 4.1, 5.4];
  const dmgTable = [1, 1.28, 1.56, 1.88, 2.24, 2.65];
  const goldTable = [1, 1.28, 1.58, 1.9, 2.25, 2.65];
  const dustTable = [1, 1.35, 1.72, 2.15, 2.6, 3.1];
  const masteryTable = [1, 1.25, 1.5, 1.75, 2.05, 2.4];

  const primaryIdx = (Math.max(1, chapterId) + tier - 2) % CHALLENGE_MUTATOR_CYCLE.length;
  const primaryId = CHALLENGE_MUTATOR_CYCLE[primaryIdx];
  const mutators: NightmareMutatorDef[] = [NIGHTMARE_MUTATORS[primaryId]];

  // Tier III+ always adds a second mutator: Tier III/IV pair with Double Punish skill reward,
  // Tier V pairs a second distinct challenge OR Double Punish depending on chapter parity
  if (tier >= 3) {
    if (tier === 3 || tier === 4 || chapterId % 2 === 1) {
      mutators.push(NIGHTMARE_MUTATORS.double_punish);
    } else {
      const secondaryId = CHALLENGE_MUTATOR_CYCLE[(primaryIdx + 1) % CHALLENGE_MUTATOR_CYCLE.length];
      mutators.push(NIGHTMARE_MUTATORS[secondaryId]);
    }
  }

  const has = (id: NightmareMutatorId) => mutators.some((m) => m.id === id);

  return {
    tier,
    chapterId,
    label: `Ác Mộng ${TIER_ROMAN[tier]}`,
    enemyHpMult: hpTable[tier],
    enemyDmgMult: dmgTable[tier],
    enemySpeedMult: has('blood_frenzy') ? 1.12 : 1,
    bulletSpeedMult: has('rapid_barrage') ? 1.16 : 1,
    hazardIntervalMult: has('dense_hazards') ? 0.78 : 1,
    extraEliteAffix: has('empowered_elites'),
    punishBonusMult: has('double_punish') ? 1.5 : 1,
    goldRewardMult: goldTable[tier],
    starDustRewardMult: dustTable[tier],
    masteryExpMult: masteryTable[tier],
    mutators,
  };
}

// ============================================================================
// 4. 3D TRAINING GROUNDS 5-SECOND SLIDING-WINDOW DPS TRACKER
// ============================================================================

export interface TrainingDamageSample {
  timeSec: number;
  amount: number;
  isCrit: boolean;
}

export interface TrainingDpsState {
  samples: TrainingDamageSample[];
  totalDamage: number;
  totalHits: number;
  critHits: number;
  peakDps: number;
  firstHitTimeSec: number | null;
}

export const TRAINING_DPS_WINDOW_SEC = 5.0;

export function createTrainingDpsState(): TrainingDpsState {
  return {
    samples: [],
    totalDamage: 0,
    totalHits: 0,
    critHits: 0,
    peakDps: 0,
    firstHitTimeSec: null,
  };
}

export function recordTrainingHit(
  state: TrainingDpsState,
  timeSec: number,
  amount: number,
  isCrit: boolean
): TrainingDpsSnapshot {
  const safeAmt = Math.max(0, Math.round(amount));
  if (safeAmt > 0) {
    if (state.firstHitTimeSec === null) {
      state.firstHitTimeSec = timeSec;
    }
    state.samples.push({ timeSec, amount: safeAmt, isCrit });
    state.totalDamage += safeAmt;
    state.totalHits += 1;
    if (isCrit) state.critHits += 1;
  }
  return computeTrainingDpsSnapshot(state, timeSec);
}

export function computeTrainingDpsSnapshot(
  state: TrainingDpsState,
  nowSec: number
): TrainingDpsSnapshot {
  const cutoff = nowSec - TRAINING_DPS_WINDOW_SEC;
  while (state.samples.length > 0 && state.samples[0].timeSec < cutoff) {
    state.samples.shift();
  }
  let windowDamage = 0;
  for (let i = 0; i < state.samples.length; i++) {
    windowDamage += state.samples[i].amount;
  }
  const activeSpan =
    state.firstHitTimeSec === null
      ? TRAINING_DPS_WINDOW_SEC
      : Math.max(1.0, Math.min(TRAINING_DPS_WINDOW_SEC, nowSec - state.firstHitTimeSec + 0.1));
  const dps5s = state.samples.length > 0 ? Math.round(windowDamage / activeSpan) : 0;
  if (dps5s > state.peakDps) {
    state.peakDps = dps5s;
  }
  const critRatePct =
    state.totalHits > 0 ? Math.round((state.critHits / state.totalHits) * 100) : 0;

  return {
    dps5s,
    peakDps: state.peakDps,
    totalDamage: state.totalDamage,
    critRatePct,
    hits: state.totalHits,
  };
}

// ============================================================================
// 5. SAVE EXPORT / IMPORT CODEC (FNV-1a CHECKSUM + LEGACY MIGRATION)
// ============================================================================

export const SAVE_CODE_PREFIX = 'ABW5';

function computeFnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  if (typeof btoa === 'function') {
    return btoa(binary);
  }
  return Buffer.from(bytes).toString('base64');
}

function base64ToUtf8(b64: string): string {
  if (typeof atob === 'function') {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  }
  return Buffer.from(b64, 'base64').toString('utf8');
}

export function encodeSaveTransferCode(save: SaveData): string {
  const json = JSON.stringify(save);
  const checksum = computeFnv1aHex(json);
  const b64 = utf8ToBase64(json);
  return `${SAVE_CODE_PREFIX}:${checksum}:${b64}`;
}

export interface DecodeSaveTransferResult {
  ok: boolean;
  error?: string;
  save?: SaveData;
  preview?: SaveTransferPreview;
}

export function decodeSaveTransferCode(rawInput: string): DecodeSaveTransferResult {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return { ok: false, error: 'Mã sao lưu đang trống.' };
  }

  let parsedJsonText = '';
  let versionLabel = 'JSON';

  if (trimmed.startsWith(`${SAVE_CODE_PREFIX}:`)) {
    const parts = trimmed.split(':');
    if (parts.length !== 3) {
      return { ok: false, error: 'Định dạng mã sao lưu không hợp lệ (thiếu phân đoạn).' };
    }
    const [, expectedChecksum, b64Payload] = parts;
    try {
      parsedJsonText = base64ToUtf8(b64Payload);
    } catch {
      return { ok: false, error: 'Không thể giải mã chuỗi Base64 — mã có thể bị cắt thiếu.' };
    }
    const actualChecksum = computeFnv1aHex(parsedJsonText);
    if (actualChecksum !== expectedChecksum.toLowerCase()) {
      return {
        ok: false,
        error: 'Mã kiểm tra toàn vẹn (checksum) không khớp — chuỗi đã bị thay đổi hoặc hỏng.',
      };
    }
    versionLabel = SAVE_CODE_PREFIX;
  } else if (trimmed.startsWith('{')) {
    parsedJsonText = trimmed;
    versionLabel = 'JSON';
  } else {
    return {
      ok: false,
      error: `Mã không đúng tiền tố ${SAVE_CODE_PREFIX}: hoặc định dạng JSON hợp lệ.`,
    };
  }

  let rawObj: unknown;
  try {
    rawObj = JSON.parse(parsedJsonText);
  } catch {
    return { ok: false, error: 'Dữ liệu JSON bên trong mã sao lưu bị lỗi cú pháp.' };
  }

  if (
    !rawObj ||
    typeof rawObj !== 'object' ||
    Array.isArray(rawObj) ||
    typeof (rawObj as Partial<SaveData>).gold !== 'number' ||
    !Array.isArray((rawObj as Partial<SaveData>).inventory)
  ) {
    return {
      ok: false,
      error: 'Dữ liệu không phải tệp lưu Aetherbow hợp lệ (thiếu trường gold/inventory).',
    };
  }

  const mergedRaw: SaveData = {
    ...createInitialSaveData(),
    ...(rawObj as Partial<SaveData>),
  };
  const migrated = migrateSaveData(mergedRaw);
  return {
    ok: true,
    save: migrated,
    preview: {
      version: versionLabel,
      highestChapterCleared: migrated.highestChapterCleared,
      selectedHeroId: migrated.selectedHeroId,
      gold: migrated.gold,
      gems: migrated.gems,
      gearCount: migrated.inventory.length,
      bestTowerFloor: migrated.bestTowerFloor ?? 0,
    },
  };
}

// ============================================================================
// 6. SYNERGY (9) & BOSS (12) CODEX BUILDERS
// ============================================================================

const BOSS_TACTICAL_TIPS: Record<number, string> = {
  1: 'Chờ sóng lửa kết thúc rồi tận dụng cửa sổ Phản Đòn +18% trong 1.3s.',
  2: 'Lướt chéo khi Hỏa Dương lao húc; dùng Né Hoàn Hảo để xoay nhanh Kỹ năng E.',
  3: 'Giữ khoảng cách trước cú giậm chấn động và dồn sát thương sau vòng báo đỏ.',
  4: 'Ưu tiên cộng hưởng AoE hoặc tia xuyên để dọn ảo ảnh Song Tử nhanh.',
  5: 'Giữ kỹ năng phá giáp khi Nguyệt Giáp vào Pha II (<=50% HP).',
  6: 'Chú ý chùm tia quét tinh tú — Lướt xuyên đúng nhịp để kích Né Hoàn Hảo.',
  7: 'Bẫy sàn 3D bắt đầu xuất hiện từ Ch.7 — luôn giữ Lướt khi vòng báo nạp lực đầy.',
  8: 'Tránh đứng lâu trong vùng độc/bẫy sàn và hạ sớm Tinh Anh song thuộc tính.',
  9: 'Di chuyển theo quỹ đạo cung tròn né loạt tên Xạ Thủ ở tốc độ cao.',
  10: 'Mở Pha III Tối Thượng ở <=25% HP — thưởng Phản Đòn tăng lên +24%.',
  11: 'Quản lý Bẫy Băng Giá và giữ Tuyệt Chiêu cho giai đoạn Pha III <=25% HP.',
  12: 'Đại Boss Song Ngư Pha III kết hợp toàn bộ bẫy sàn — tận dụng tối đa Phản Đòn +24%.',
};

export function collectDiscoveredSynergies(save: SaveData): SkillSynergyId[] {
  const discovered = new Set<SkillSynergyId>(save.discoveredSynergies ?? []);
  const pickCounts = save.playtestMetrics?.synergyPickCounts ?? {};
  for (const [id, count] of Object.entries(pickCounts)) {
    if ((count ?? 0) > 0) {
      discovered.add(id as SkillSynergyId);
    }
  }
  for (const entry of save.runHistory ?? []) {
    for (const synId of entry.activeSynergies ?? []) {
      discovered.add(synId);
    }
  }
  return Array.from(discovered);
}

export function buildSynergyCodexEntries(save: SaveData): SynergyCodexEntry[] {
  const discoveredSet = new Set(collectDiscoveredSynergies(save));
  const pickCounts = save.playtestMetrics?.synergyPickCounts ?? {};
  return SKILL_SYNERGIES.map((syn) => ({
    id: syn.id,
    name: syn.name,
    buildTag: syn.buildTag,
    groupALabels: syn.groupA.map((id) => SKILLS_CATALOG[id]?.name ?? id),
    groupBLabels: syn.groupB.map((id) => SKILLS_CATALOG[id]?.name ?? id),
    shortEffect: syn.shortEffect,
    accentColor: syn.accentColor,
    discovered: discoveredSet.has(syn.id),
    pickCount: pickCounts[syn.id] ?? (discoveredSet.has(syn.id) ? 1 : 0),
  }));
}

export function buildBossCodexEntries(save: SaveData): BossCodexEntry[] {
  const bossStats = save.playtestMetrics?.bossAttempts ?? {};
  const nightmareClears = save.nightmareClears ?? {};
  return CHAPTERS.map((ch) => {
    const bossKey = getBossTelemetryKey(ch.id, ch.stages.length) ?? `ch${ch.id}_boss`;
    const stat = bossStats[bossKey];
    const hasPhaseThree = ch.id >= 10;
    const cleared = Boolean(stat?.cleared) || save.highestChapterCleared >= ch.id;
    return {
      chapterId: ch.id,
      chapterName: ch.name,
      bossName: ch.bossName,
      bossKey,
      hasPhaseThree,
      punishBonusPct: Math.round(
        (hasPhaseThree ? PUNISH_WINDOW_PHASE3_BONUS : PUNISH_WINDOW_DAMAGE_BONUS) * 100
      ),
      tacticalTip:
        BOSS_TACTICAL_TIPS[ch.id] ?? 'Quan sát vòng cảnh báo 3D trên sàn và tận dụng cửa sổ Phản Đòn.',
      cleared,
      attempts: stat?.attempts ?? (cleared ? 1 : 0),
      highestNightmareTier: nightmareClears[ch.id] ?? 0,
    };
  });
}

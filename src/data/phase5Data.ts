import { normalizePlayableHeroId } from './heroesData';
import { CHAPTERS } from './chaptersData';
import { getBossTelemetryKey, migrateSaveData, PUNISH_WINDOW_DAMAGE_BONUS, PUNISH_WINDOW_PHASE3_BONUS } from './earlyProgressionData';
import { createInitialSaveData } from './gearData';
import { validateAndSanitizeSaveIntegrity } from './saveIntegrity';
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
  bellona: {
    heroId: 'bellona',
    name: 'Hỏa Mạch',
    shortLabel: 'Hỏa Mạch',
    desc: 'Giật sét qua tối đa 4 mục tiêu trong tầm, gây 150% ATK mỗi mục tiêu.',
    cooldownSec: 9, damageMult: 1.5, effectKind: 'thunder_arc',
    accentHex: 0xff682e, accentCss: '#ff682e', radius: 6.5,
  },
  sylvia: {
    heroId: 'sylvia',
    name: 'Địa Mạch Lục Bảo',
    shortLabel: 'Địa Mạch',
    desc: 'Triệu hồi Địa Mạch Lục Bảo gây 165% ATK diện rộng quanh mục tiêu và tạo khiên hộ thể 12% HP.',
    cooldownSec: 8.5,
    damageMult: 1.65,
    effectKind: 'jade_bastion',
    accentHex: 0x10b981,
    accentCss: '#10b981',
    radius: 6.4,
    durationSec: 3.5,
  },
  celeste: {
    heroId: 'celeste',
    name: 'Song Kính Tinh Tú',
    shortLabel: 'Song Kính',
    desc: 'Phóng song tia gương tinh vân xuyên phá gây 172% ATK và khắc Ấn Ký +20% sát thương lên mục tiêu.',
    cooldownSec: 8.5,
    damageMult: 1.72,
    effectKind: 'moon_fan_mark',
    accentHex: 0x38bdf8,
    accentCss: '#38bdf8',
    radius: 7.4,
    durationSec: 3.5,
  },
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
  aurelia: {
    heroId: 'aurelia',
    name: 'Nhật Hoa Trảm Thiên',
    shortLabel: 'Nhật Hoa',
    desc: 'Phóng Vành Nhật Hoa Thái Dương gây 175% ATK diện rộng, thiêu đốt kẻ địch và tạo khiên 10% HP trong 4 giây.',
    cooldownSec: 8.5,
    damageMult: 1.75,
    effectKind: 'ember_nova',
    accentHex: 0xf59e0b,
    accentCss: '#f59e0b',
    radius: 6.2,
    durationSec: 4.0,
  },
};

export function getHeroActiveSkill(heroId: HeroId): HeroActiveSkillDef {
  return HERO_ACTIVE_SKILLS[normalizePlayableHeroId(heroId)];
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
export const SAVE_JSON_ENVELOPE_FORMAT = 'aetherbow_save_v2';

export interface SignedSaveJsonEnvelope {
  format: typeof SAVE_JSON_ENVELOPE_FORMAT;
  exportedAt: string;
  checksum: string;
  payload: SaveData;
}

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
  const sanitized = validateAndSanitizeSaveIntegrity(save).sanitizedSave;
  const json = JSON.stringify(sanitized);
  const checksum = computeFnv1aHex(json);
  const b64 = utf8ToBase64(json);
  return `${SAVE_CODE_PREFIX}:${checksum}:${b64}`;
}

export function encodeSignedSaveJson(save: SaveData, exportedAt = new Date().toISOString()): string {
  const sanitized = validateAndSanitizeSaveIntegrity(save).sanitizedSave;
  const canonicalPayload = JSON.stringify(sanitized);
  const envelope: SignedSaveJsonEnvelope = {
    format: SAVE_JSON_ENVELOPE_FORMAT,
    exportedAt,
    checksum: computeFnv1aHex(canonicalPayload),
    payload: sanitized,
  };
  return JSON.stringify(envelope, null, 2);
}

export interface DecodeSaveTransferResult {
  ok: boolean;
  error?: string;
  save?: SaveData;
  preview?: SaveTransferPreview;
  integrityFixedCount?: number;
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

  // Verify signed JSON envelope (aetherbow_save_v2) if present
  if (
    rawObj &&
    typeof rawObj === 'object' &&
    !Array.isArray(rawObj) &&
    (rawObj as Partial<SignedSaveJsonEnvelope>).format === SAVE_JSON_ENVELOPE_FORMAT
  ) {
    const env = rawObj as Partial<SignedSaveJsonEnvelope>;
    if (typeof env.checksum !== 'string' || !env.payload || typeof env.payload !== 'object') {
      return {
        ok: false,
        error: 'Tệp JSON sao lưu v2 thiếu checksum hoặc dữ liệu payload hợp lệ.',
      };
    }
    const actualJsonChecksum = computeFnv1aHex(JSON.stringify(env.payload));
    if (actualJsonChecksum !== env.checksum.toLowerCase()) {
      return {
        ok: false,
        error: 'Mã kiểm tra toàn vẹn tệp JSON-V2 không khớp — tệp đã bị chỉnh sửa hoặc hỏng.',
      };
    }
    rawObj = env.payload;
    versionLabel = 'JSON-V2';
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
  const preIntegrity = validateAndSanitizeSaveIntegrity(mergedRaw);
  const migrated = migrateSaveData(preIntegrity.sanitizedSave);
  const postIntegrity = validateAndSanitizeSaveIntegrity(migrated);
  const totalFixed = preIntegrity.issuesFixed.length + postIntegrity.issuesFixed.length;
  return {
    ok: true,
    save: postIntegrity.sanitizedSave,
    integrityFixedCount: totalFixed,
    preview: {
      version: versionLabel,
      highestChapterCleared: postIntegrity.sanitizedSave.highestChapterCleared,
      selectedHeroId: postIntegrity.sanitizedSave.selectedHeroId,
      gold: postIntegrity.sanitizedSave.gold,
      gems: postIntegrity.sanitizedSave.gems,
      gearCount: postIntegrity.sanitizedSave.inventory.length,
      bestTowerFloor: postIntegrity.sanitizedSave.bestTowerFloor ?? 0,
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

const BOSS_CODEX_DOSSIERS: Record<
  number,
  {
    loreExcerpt: string;
    phasesSummary: [string, string, string];
    interruptTip: string;
  }
> = {
  1: {
    loreExcerpt:
      'Thánh Điện Sư Tử lưu giữ ngọn lửa Thái Dương cổ xưa. Khi Nhật Thạch rạn nứt, Sư Vương bị tà khí thiêu đốt và phong tỏa cửa ngõ Tinh Giới.',
    phasesSummary: [
      'Pha I (100–65% HP): Sóng lửa quạt & nhảy vồ đánh dấu vòng đỏ.',
      'Pha II (65–30% HP): Vòng Nhật Hoa liên hoàn + gọi hộ vệ tinh anh.',
      'Pha III (<30% HP): Cuồng Nộ Thái Dương — vận chiêu nổ toàn sân có thể Ngắt Chiêu.',
    ],
    interruptTip: 'Dùng Kỹ Năng Chủ Động (E) hoặc Tuyệt Kỹ (Q) khi vòng vàng Ngắt Chiêu xuất hiện ở Pha II–III để làm choáng 2.2s.',
  },
  2: {
    loreExcerpt:
      'Lò Rèn Hỏa Dương là nơi rèn chiến giáp cho quân đoàn Hoàng Đạo. Hỏa Dương Chiến Vương dẫn đầu đội quân dung nham thách thức mọi kẻ xâm nhập.',
    phasesSummary: [
      'Pha I (100–65% HP): Lao húc đường thẳng (Mũi Tên Đứt Khúc) kèm tia lửa.',
      'Pha II (65–30% HP): Húc đôi đổi hướng + rải đá dung nham nổ chậm.',
      'Pha III (<30% HP): Hỏa Khúc Chiến Trống — vận chiêu Địa Chấn Nóng Chảy có thể Ngắt Chiêu.',
    ],
    interruptTip: 'Lướt chéo góc 90° qua làn Lao Húc để kích Né Hoàn Hảo (-2s hồi E), sau đó tung E cắt ngang cú gầm nạp lực.',
  },
  3: {
    loreExcerpt:
      'Đền Thờ Ngọc Lục Bảo kết nối địa mạch sự sống. Địa Thần Kim Ngưu khoác giáp ngọc bảo vệ trái tim thánh địa trước cơn bão hỗn mang.',
    phasesSummary: [
      'Pha I (100–65% HP): Giậm đất tạo vòng chấn động đôi & ném đá ngọc.',
      'Pha II (65–30% HP): Dựng Khiên Địa Mạch + gọi cột gai lục bảo theo vòng.',
      'Pha III (<30% HP): Bão Ngọc Chấn Thiên — vận chiêu Địa Mạch Sụp Đổ có thể Ngắt Chiêu.',
    ],
    interruptTip: 'Giữ khoảng cách ngoài vòng đôi khi Boss giơ búa; dồn sát thương Băng/Phá Giáp lúc vòng Phá Chiêu mở ra.',
  },
  4: {
    loreExcerpt:
      'Gương Tinh Tú Song Tử phản chiếu hai dòng thời gian song song. Ảo Ảnh Vương phân tách thực tại để thử thách khả năng đọc trận địa của xạ thủ.',
    phasesSummary: [
      'Pha I (100–65% HP): Bắn song tia gương chữ thập & dịch chuyển biên sân.',
      'Pha II (65–30% HP): Triệu hồi phân thân Song Ảnh bắn đạn đan lưới.',
      'Pha III (<30% HP): Khúc Xạ Tinh Vân — tụ tia laser quét toàn sân có thể Ngắt Chiêu.',
    ],
    interruptTip: 'Ưu tiên nhánh Tiến Hóa AoE để dọn nhanh phân thân, sau đó ngắt chiêu tụ tia laser ở Pha III để mở cửa sổ Phản Đòn.',
  },
};

export function buildBossCodexEntries(save: SaveData): BossCodexEntry[] {
  const bossStats = save.playtestMetrics?.bossAttempts ?? {};
  const nightmareClears = save.nightmareClears ?? {};
  return CHAPTERS.map((ch) => {
    const bossKey = getBossTelemetryKey(ch.id, ch.stages.length) ?? `ch${ch.id}_boss`;
    const stat = bossStats[bossKey];
    const hasPhaseThree = ch.id <= 4 || ch.id >= 10;
    const cleared = Boolean(stat?.cleared) || save.highestChapterCleared >= ch.id;
    const milestone = save.chapterMilestones?.[ch.id];
    const starsEarned = milestone?.starsEarned?.length ?? (cleared ? 1 : 0);
    const dossier = BOSS_CODEX_DOSSIERS[ch.id] ?? {
      loreExcerpt: `${ch.name} là pháo đài Hoàng Đạo canh giữ bí mật cổ đại do ${ch.bossName} trấn thủ.`,
      phasesSummary: [
        'Pha I: Đòn đánh chuẩn xác với cảnh báo sàn 3D rõ ràng.',
        'Pha II (<=50% HP): Tăng tốc nhịp chiêu và bổ sung bẫy địa hình.',
        hasPhaseThree
          ? 'Pha III (<=25% HP): Tối Thượng cuồng hóa — phần thưởng Phản Đòn tăng mạnh.'
          : 'Giai đoạn kết liễu: Tận dụng cửa sổ Phản Đòn ngay sau loạt chiêu lớn.',
      ] as [string, string, string],
      interruptTip:
        'Canh chuẩn Né Hoàn Hảo để rút ngắn hồi chiêu E và dồn sát thương trong Cửa Sổ Phản Đòn.',
    };
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
      loreExcerpt: dossier.loreExcerpt,
      phasesSummary: dossier.phasesSummary,
      interruptTip: dossier.interruptTip,
      starsEarned: Math.min(4, Math.max(0, starsEarned)),
      maxStars: 4,
      cleared,
      attempts: stat?.attempts ?? (cleared ? 1 : 0),
      highestNightmareTier: nightmareClears[ch.id] ?? 0,
    };
  });
}

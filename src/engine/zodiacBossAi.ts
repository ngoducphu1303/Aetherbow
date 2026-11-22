import { EnemyKind } from '../types/game';

export type ZodiacBossProfileId =
  | 'leo'
  | 'aries'
  | 'taurus'
  | 'gemini'
  | 'cancer'
  | 'virgo'
  | 'libra'
  | 'scorpio'
  | 'sagittarius'
  | 'capricorn'
  | 'aquarius'
  | 'pisces'
  | 'warden'
  | 'titan';

export type BossMovementStyle =
  | 'predator'
  | 'rammer'
  | 'juggernaut'
  | 'trickster'
  | 'warden_orbit'
  | 'geometric'
  | 'duelist'
  | 'assassin'
  | 'kiter'
  | 'sovereign'
  | 'storm_orbit'
  | 'leviathan';

export type BossHazardKind = 'fire' | 'poison' | 'frost' | 'whirlpool';

export type BossSkillKind =
  | 'leap_slam'
  | 'dash_charge'
  | 'blink_strike'
  | 'meteor_cascade'
  | 'lane_sweep'
  | 'petal_spiral'
  | 'strafe_barrage'
  | 'tectonic_pulse'
  | 'hazard_ring'
  | 'guard_counter';

export type BossTelegraphChannel = 'shot' | 'lunge' | 'slam' | 'spiral' | 'lane';

export interface BossSkillDefinition {
  id: string;
  label: string;
  actionHint: string;
  kind: BossSkillKind;
  telegraphChannel: BossTelegraphChannel;
  telegraphDuration: number;
  damageMult: number;
  colorHex?: number;
  /** Capped velocity prediction window (seconds) for dodgeable lead-aiming */
  leadTimeSec?: number;
  /** Movement speed multiplier allowed during telegraph so bosses never feel frozen */
  telegraphMoveMult?: number;
  /** Number of primary orbs, lanes, slams, or staggered waves */
  count?: number;
  /** Additional staggered waves after initial trigger (for rotating spirals / burst volleys) */
  waves?: number;
  waveIntervalSec?: number;
  /** Projectile base speed */
  projectileSpeed?: number;
  /** Slam / AoE radius */
  radius?: number;
  /** Optional lingering ground hazard spawned on impact or along dash path */
  hazardKind?: BossHazardKind;
  hazardDurationSec?: number;
  /** Dash speed or leap flight duration */
  dashSpeed?: number;
  dashDurationSec?: number;
  leapDurationSec?: number;
  leapPeakHeight?: number;
  /** Lane pattern geometry */
  laneLayout?: 'fan' | 'cross_plus' | 'cross_x' | 'parallel_sweep' | 'twin_flank';
  /** Guard stance duration (for guard_counter) */
  guardDurationSec?: number;
  /** Combo follow-up skill id unlocked in Phase II+ (or always if comboInPhase1=true) */
  comboFollowUpId?: string;
  comboInPhase1?: boolean;
  comboGapSec?: number;
  /** Extra third step unlocked in Phase III */
  phase3FollowUpId?: string;
}

export interface ZodiacBossProfile {
  id: ZodiacBossProfileId;
  zodiacName: string;
  movementStyle: BossMovementStyle;
  /** Multiplier applied to base boss speed during active combat navigation */
  mobilitySpeedMult: number;
  /** Ideal distance band to hero (meters) */
  preferredRangeMin: number;
  preferredRangeMax: number;
  /** Angular orbit speed weight (0..1.2) */
  orbitWeight: number;
  /** Accent hex used for orbs/hazards if chapter trim isn't overriding */
  accentHex: number;
  /** Primary hazard flavor for this chapter/boss */
  hazardFlavor: BossHazardKind;
  /** Base recovery window (punish window) between combos in Phase 1 / 2 / 3 */
  recoverySec: [number, number, number];
  /** Ordered skill pool for Phase I */
  phase1Cycle: string[];
  /** Ordered skill pool for Phase II+ */
  phase2Cycle: string[];
  /** Skill definitions keyed by id */
  skills: Record<string, BossSkillDefinition>;
}

export interface BossPerformanceBudget {
  maxActiveHazards: number;
  maxMultiSlams: number;
  orbCountScale: number;
  particleScale: number;
  allowTrailHazards: boolean;
}

export function getBossPerformanceBudget(lowEndGpu: boolean): BossPerformanceBudget {
  if (lowEndGpu) {
    return {
      maxActiveHazards: 3,
      maxMultiSlams: 3,
      orbCountScale: 0.72,
      particleScale: 0.45,
      allowTrailHazards: true,
    };
  }
  return {
    maxActiveHazards: 6,
    maxMultiSlams: 4,
    orbCountScale: 1.0,
    particleScale: 1.0,
    allowTrailHazards: true,
  };
}

export const ZODIAC_PROFILE_ORDER: readonly ZodiacBossProfileId[] = [
  'leo',
  'aries',
  'taurus',
  'gemini',
  'cancer',
  'virgo',
  'libra',
  'scorpio',
  'sagittarius',
  'capricorn',
  'aquarius',
  'pisces',
] as const;

export const CHAPTER_HAZARD_FLAVOR: Record<number, { hazard: BossHazardKind; accentHex: number }> = {
  1: { hazard: 'fire', accentHex: 0xf59e0b },
  2: { hazard: 'fire', accentHex: 0xf43f5e },
  3: { hazard: 'fire', accentHex: 0xd97706 },
  4: { hazard: 'whirlpool', accentHex: 0x38bdf8 },
  5: { hazard: 'whirlpool', accentHex: 0x0ea5e9 },
  6: { hazard: 'poison', accentHex: 0x34d399 },
  7: { hazard: 'whirlpool', accentHex: 0xe879f9 },
  8: { hazard: 'poison', accentHex: 0xa855f7 },
  9: { hazard: 'fire', accentHex: 0x818cf8 },
  10: { hazard: 'frost', accentHex: 0x38bdf8 },
  11: { hazard: 'frost', accentHex: 0x22d3ee },
  12: { hazard: 'whirlpool', accentHex: 0x2dd4bf },
};

export const ZODIAC_BOSS_PROFILES: Record<ZodiacBossProfileId, ZodiacBossProfile> = {
  // Ch.1 — Sư Vương Thái Dương: Predatory Stalker (syncs with 3D Solar Lion model!)
  leo: {
    id: 'leo',
    zodiacName: 'Sư Tử',
    movementStyle: 'predator',
    mobilitySpeedMult: 1.56,
    preferredRangeMin: 4.0,
    preferredRangeMax: 7.2,
    orbitWeight: 0.78,
    accentHex: 0xf59e0b,
    hazardFlavor: 'fire',
    recoverySec: [0.96, 0.8, 0.66],
    phase1Cycle: ['solar_pounce', 'flame_mane_charge', 'solar_maelstrom'],
    phase2Cycle: ['flame_mane_charge', 'solar_maelstrom', 'solar_pounce'],
    skills: {
      solar_pounce: {
        id: 'solar_pounce',
        label: 'Vồ Mặt Trời',
        actionHint: 'Lướt Khỏi Vòng Lửa!',
        kind: 'leap_slam',
        telegraphChannel: 'slam',
        telegraphDuration: 0.7,
        damageMult: 1.2,
        colorHex: 0xf59e0b,
        leadTimeSec: 0.44,
        telegraphMoveMult: 0.66,
        count: 10,
        projectileSpeed: 9.8,
        radius: 3.3,
        hazardKind: 'fire',
        hazardDurationSec: 4.2,
        leapDurationSec: 0.34,
        leapPeakHeight: 3.1,
      },
      flame_mane_charge: {
        id: 'flame_mane_charge',
        label: 'Xung Kích Bờm Lửa',
        actionHint: 'Né Ngang Dụ Đập Tường!',
        kind: 'dash_charge',
        telegraphChannel: 'lane',
        telegraphDuration: 0.6,
        damageMult: 1.16,
        colorHex: 0xf97316,
        leadTimeSec: 0.38,
        telegraphMoveMult: 0.62,
        dashSpeed: 15.6,
        dashDurationSec: 0.54,
        hazardKind: 'fire',
        hazardDurationSec: 3.8,
        laneLayout: 'fan',
        count: 1,
        comboFollowUpId: 'solar_pounce',
        comboGapSec: 0.32,
      },
      solar_maelstrom: {
        id: 'solar_maelstrom',
        label: 'Bão Nhật Luân',
        actionHint: 'Xoay Vòng Luồn Khe Lửa!',
        kind: 'petal_spiral',
        telegraphChannel: 'spiral',
        telegraphDuration: 0.58,
        damageMult: 0.96,
        colorHex: 0xfbbf24,
        telegraphMoveMult: 0.86,
        count: 8,
        waves: 3,
        waveIntervalSec: 0.23,
        projectileSpeed: 10.2,
        hazardKind: 'fire',
        hazardDurationSec: 4.0,
        comboFollowUpId: 'flame_mane_charge',
        comboGapSec: 0.34,
      },
    },
  },

  // Ch.2 — Hỏa Dương Chiến Vương: Relentless Rammer
  aries: {
    id: 'aries',
    zodiacName: 'Bạch Dương',
    movementStyle: 'rammer',
    mobilitySpeedMult: 1.6,
    preferredRangeMin: 4.5,
    preferredRangeMax: 8.0,
    orbitWeight: 0.58,
    accentHex: 0xf43f5e,
    hazardFlavor: 'fire',
    recoverySec: [0.96, 0.8, 0.65],
    phase1Cycle: ['ram_charge', 'magma_cascade', 'crimson_eruption'],
    phase2Cycle: ['ram_charge', 'magma_cascade', 'crimson_eruption'],
    skills: {
      ram_charge: {
        id: 'ram_charge',
        label: 'Húc Đôi Hỏa Sừng',
        actionHint: 'Né Ngang Khi Sừng Bốc Cháy!',
        kind: 'dash_charge',
        telegraphChannel: 'lane',
        telegraphDuration: 0.58,
        damageMult: 1.2,
        colorHex: 0xf43f5e,
        leadTimeSec: 0.42,
        telegraphMoveMult: 0.64,
        dashSpeed: 16.4,
        dashDurationSec: 0.56,
        hazardKind: 'fire',
        hazardDurationSec: 4.2,
        laneLayout: 'fan',
        count: 1,
        comboFollowUpId: 'ram_charge_second',
        comboInPhase1: true,
        comboGapSec: 0.3,
      },
      ram_charge_second: {
        id: 'ram_charge_second',
        label: 'Húc Phản Đòn',
        actionHint: 'Né Nhịp Húc Thứ Hai!',
        kind: 'dash_charge',
        telegraphChannel: 'lane',
        telegraphDuration: 0.5,
        damageMult: 1.18,
        colorHex: 0xfb7185,
        leadTimeSec: 0.4,
        telegraphMoveMult: 0.64,
        dashSpeed: 16.8,
        dashDurationSec: 0.52,
        laneLayout: 'fan',
        count: 1,
      },
      magma_cascade: {
        id: 'magma_cascade',
        label: 'Mưa Nhung Nham',
        actionHint: 'Đổi Hướng Liên Tục!',
        kind: 'meteor_cascade',
        telegraphChannel: 'slam',
        telegraphDuration: 0.68,
        damageMult: 1.1,
        colorHex: 0xf97316,
        leadTimeSec: 0.52,
        telegraphMoveMult: 0.82,
        count: 3,
        radius: 2.65,
        hazardKind: 'fire',
        hazardDurationSec: 4.5,
        comboFollowUpId: 'crimson_eruption',
        comboGapSec: 0.34,
      },
      crimson_eruption: {
        id: 'crimson_eruption',
        label: 'Sóng Dung Nham',
        actionHint: 'Giữ Cự Ly & Luồn Sóng Lửa!',
        kind: 'hazard_ring',
        telegraphChannel: 'spiral',
        telegraphDuration: 0.62,
        damageMult: 1.0,
        colorHex: 0xe11d48,
        telegraphMoveMult: 0.78,
        count: 9,
        projectileSpeed: 10.6,
        radius: 2.8,
        hazardKind: 'fire',
        hazardDurationSec: 4.8,
      },
    },
  },

  // Ch.3 — Kim Ngưu Cự Thần: Earthshaker Juggernaut
  taurus: {
    id: 'taurus',
    zodiacName: 'Kim Ngưu',
    movementStyle: 'juggernaut',
    mobilitySpeedMult: 1.42,
    preferredRangeMin: 3.4,
    preferredRangeMax: 6.4,
    orbitWeight: 0.42,
    accentHex: 0xd97706,
    hazardFlavor: 'fire',
    recoverySec: [1.02, 0.84, 0.7],
    phase1Cycle: ['tectonic_trilogy', 'stonebreaker_charge', 'boulder_volley'],
    phase2Cycle: ['stonebreaker_charge', 'tectonic_trilogy', 'boulder_volley'],
    skills: {
      tectonic_trilogy: {
        id: 'tectonic_trilogy',
        label: 'Địa Chấn Liên Hoàn',
        actionHint: 'Lùi Xa Khỏi 3 Nhịp Chấn Động!',
        kind: 'tectonic_pulse',
        telegraphChannel: 'slam',
        telegraphDuration: 0.72,
        damageMult: 1.18,
        colorHex: 0xfbbf24,
        telegraphMoveMult: 0.6,
        waves: 3,
        waveIntervalSec: 0.38,
        radius: 3.2,
        count: 8,
        projectileSpeed: 9.6,
      },
      stonebreaker_charge: {
        id: 'stonebreaker_charge',
        label: 'Húc Phá Thạch',
        actionHint: 'Lướt Ngang Tránh Làn Húc!',
        kind: 'dash_charge',
        telegraphChannel: 'lane',
        telegraphDuration: 0.64,
        damageMult: 1.26,
        colorHex: 0x84cc16,
        leadTimeSec: 0.36,
        telegraphMoveMult: 0.58,
        dashSpeed: 15.2,
        dashDurationSec: 0.58,
        laneLayout: 'fan',
        count: 1,
        comboFollowUpId: 'tectonic_trilogy',
        comboGapSec: 0.34,
      },
      boulder_volley: {
        id: 'boulder_volley',
        label: 'Lao Đá Xoáy',
        actionHint: 'Chạy Cắt Ngang Đạn Đá!',
        kind: 'strafe_barrage',
        telegraphChannel: 'shot',
        telegraphDuration: 0.56,
        damageMult: 1.02,
        colorHex: 0xfbbf24,
        leadTimeSec: 0.44,
        telegraphMoveMult: 0.96,
        count: 5,
        waves: 2,
        waveIntervalSec: 0.26,
        projectileSpeed: 11.8,
        comboFollowUpId: 'stonebreaker_charge',
        comboGapSec: 0.36,
      },
    },
  },

  // Ch.4 — Song Tử Huyễn Vương: Mirage Trickster
  gemini: {
    id: 'gemini',
    zodiacName: 'Song Tử',
    movementStyle: 'trickster',
    mobilitySpeedMult: 1.64,
    preferredRangeMin: 5.2,
    preferredRangeMax: 9.0,
    orbitWeight: 0.95,
    accentHex: 0x67e8f9,
    hazardFlavor: 'whirlpool',
    recoverySec: [0.94, 0.78, 0.64],
    phase1Cycle: ['mirage_blink', 'twin_helix', 'cross_snipe'],
    phase2Cycle: ['mirage_blink', 'twin_helix', 'cross_snipe'],
    skills: {
      mirage_blink: {
        id: 'mirage_blink',
        label: 'Biến Ảnh Đột Kích',
        actionHint: 'Coi Chừng Sau Lưng & Làn Chéo!',
        kind: 'blink_strike',
        telegraphChannel: 'lane',
        telegraphDuration: 0.54,
        damageMult: 1.12,
        colorHex: 0x67e8f9,
        leadTimeSec: 0.38,
        telegraphMoveMult: 0.78,
        laneLayout: 'twin_flank',
        count: 2,
        projectileSpeed: 14.6,
        comboFollowUpId: 'twin_helix',
        comboGapSec: 0.32,
      },
      twin_helix: {
        id: 'twin_helix',
        label: 'Đan Lưới Song Sinh',
        actionHint: 'Đi Ngược Chiều Xoắn Đạn!',
        kind: 'petal_spiral',
        telegraphChannel: 'spiral',
        telegraphDuration: 0.58,
        damageMult: 0.96,
        colorHex: 0x38bdf8,
        telegraphMoveMult: 0.92,
        count: 8,
        waves: 3,
        waveIntervalSec: 0.21,
        projectileSpeed: 10.6,
      },
      cross_snipe: {
        id: 'cross_snipe',
        label: 'Phân Thân Bắn Chéo',
        actionHint: 'Lướt Ra Khỏi Giao Điểm Tia!',
        kind: 'lane_sweep',
        telegraphChannel: 'lane',
        telegraphDuration: 0.66,
        damageMult: 1.16,
        colorHex: 0xa5f3fc,
        leadTimeSec: 0.42,
        telegraphMoveMult: 0.72,
        laneLayout: 'cross_x',
        count: 4,
        projectileSpeed: 15.0,
        comboFollowUpId: 'mirage_blink',
        comboGapSec: 0.34,
      },
    },
  },

  // Ch.5 — Cự Giải Nguyệt Triều: Tidal Warden
  cancer: {
    id: 'cancer',
    zodiacName: 'Cự Giải',
    movementStyle: 'warden_orbit',
    mobilitySpeedMult: 1.46,
    preferredRangeMin: 4.5,
    preferredRangeMax: 7.8,
    orbitWeight: 0.88,
    accentHex: 0x38bdf8,
    hazardFlavor: 'whirlpool',
    recoverySec: [0.98, 0.82, 0.68],
    phase1Cycle: ['tidal_crescent', 'lunar_shell_counter', 'whirlpool_prison'],
    phase2Cycle: ['whirlpool_prison', 'tidal_crescent', 'lunar_shell_counter'],
    skills: {
      tidal_crescent: {
        id: 'tidal_crescent',
        label: 'Triều Cường Ép Góc',
        actionHint: 'Luồn Qua Khe Sóng Trăng Khuyết!',
        kind: 'strafe_barrage',
        telegraphChannel: 'shot',
        telegraphDuration: 0.58,
        damageMult: 1.04,
        colorHex: 0x38bdf8,
        leadTimeSec: 0.4,
        telegraphMoveMult: 1.0,
        count: 6,
        waves: 2,
        waveIntervalSec: 0.26,
        projectileSpeed: 11.0,
        comboFollowUpId: 'whirlpool_prison',
        comboGapSec: 0.35,
      },
      lunar_shell_counter: {
        id: 'lunar_shell_counter',
        label: 'Vỏ Giáp Phản Sóng',
        actionHint: 'Giữ Cự Ly Trước Khi Vỏ Nổ!',
        kind: 'guard_counter',
        telegraphChannel: 'spiral',
        telegraphDuration: 0.74,
        damageMult: 1.18,
        colorHex: 0x7dd3fc,
        telegraphMoveMult: 0.64,
        guardDurationSec: 0.74,
        count: 12,
        projectileSpeed: 10.8,
        radius: 3.4,
      },
      whirlpool_prison: {
        id: 'whirlpool_prison',
        label: 'Xoáy Nước Nguyệt Triều',
        actionHint: 'Thoát Vùng Xoáy & Né Tia Nước!',
        kind: 'hazard_ring',
        telegraphChannel: 'lane',
        telegraphDuration: 0.66,
        damageMult: 1.08,
        colorHex: 0x0ea5e9,
        leadTimeSec: 0.42,
        telegraphMoveMult: 0.74,
        count: 3,
        laneLayout: 'fan',
        projectileSpeed: 13.4,
        radius: 2.9,
        hazardKind: 'whirlpool',
        hazardDurationSec: 4.8,
        comboFollowUpId: 'tidal_crescent',
        comboGapSec: 0.34,
      },
    },
  },

  // Ch.6 — Tinh Nữ Thánh Vệ: Sacred Geometrician
  virgo: {
    id: 'virgo',
    zodiacName: 'Xử Nữ',
    movementStyle: 'geometric',
    mobilitySpeedMult: 1.52,
    preferredRangeMin: 5.5,
    preferredRangeMax: 9.2,
    orbitWeight: 0.92,
    accentHex: 0x5eead4,
    hazardFlavor: 'poison',
    recoverySec: [0.96, 0.8, 0.66],
    phase1Cycle: ['astral_bloom', 'sacred_cross_plus', 'thorn_runes'],
    phase2Cycle: ['sacred_cross_plus', 'astral_bloom', 'thorn_runes'],
    skills: {
      astral_bloom: {
        id: 'astral_bloom',
        label: 'Hoa Tinh Tú Nở Rộ',
        actionHint: 'Bước Nhẹ Theo Khe Cánh Hoa!',
        kind: 'petal_spiral',
        telegraphChannel: 'spiral',
        telegraphDuration: 0.6,
        damageMult: 0.98,
        colorHex: 0x5eead4,
        telegraphMoveMult: 0.88,
        count: 9,
        waves: 3,
        waveIntervalSec: 0.24,
        projectileSpeed: 10.0,
      },
      sacred_cross_plus: {
        id: 'sacred_cross_plus',
        label: 'Lưới Thánh Quang (+)',
        actionHint: 'Đứng Vào Góc Chéo An Toàn!',
        kind: 'lane_sweep',
        telegraphChannel: 'lane',
        telegraphDuration: 0.68,
        damageMult: 1.15,
        colorHex: 0xd9f99d,
        telegraphMoveMult: 0.64,
        laneLayout: 'cross_plus',
        count: 4,
        projectileSpeed: 14.6,
        comboFollowUpId: 'sacred_cross_x',
        comboGapSec: 0.32,
      },
      sacred_cross_x: {
        id: 'sacred_cross_x',
        label: 'Lưới Thánh Quang (×)',
        actionHint: 'Chuyển Sang Trục Thẳng An Toàn!',
        kind: 'lane_sweep',
        telegraphChannel: 'lane',
        telegraphDuration: 0.62,
        damageMult: 1.15,
        colorHex: 0x5eead4,
        telegraphMoveMult: 0.66,
        laneLayout: 'cross_x',
        count: 4,
        projectileSpeed: 15.0,
      },
      thorn_runes: {
        id: 'thorn_runes',
        label: 'Vườn Gai Ngọc',
        actionHint: 'Rời Khỏi Các Vòng Cổ Ngữ!',
        kind: 'meteor_cascade',
        telegraphChannel: 'slam',
        telegraphDuration: 0.72,
        damageMult: 1.1,
        colorHex: 0x34d399,
        leadTimeSec: 0.46,
        telegraphMoveMult: 0.82,
        count: 4,
        radius: 2.55,
        hazardKind: 'poison',
        hazardDurationSec: 4.2,
      },
    },
  },

  // Ch.7 — Phán Quan Thiên Bình: Judgment Duelist
  libra: {
    id: 'libra',
    zodiacName: 'Thiên Bình',
    movementStyle: 'duelist',
    mobilitySpeedMult: 1.54,
    preferredRangeMin: 5.0,
    preferredRangeMax: 8.6,
    orbitWeight: 0.84,
    accentHex: 0xf0abfc,
    hazardFlavor: 'whirlpool',
    recoverySec: [0.94, 0.78, 0.64],
    phase1Cycle: ['scales_cleave', 'bipolar_volley', 'verdict_leap'],
    phase2Cycle: ['scales_cleave', 'verdict_leap', 'bipolar_volley'],
    skills: {
      scales_cleave: {
        id: 'scales_cleave',
        label: 'Cán Cân Phán Xét',
        actionHint: 'Lướt Qua Khe Giữa Hai Làn Tia!',
        kind: 'lane_sweep',
        telegraphChannel: 'lane',
        telegraphDuration: 0.64,
        damageMult: 1.18,
        colorHex: 0xf0abfc,
        leadTimeSec: 0.4,
        telegraphMoveMult: 0.68,
        laneLayout: 'parallel_sweep',
        count: 3,
        projectileSpeed: 15.2,
        comboFollowUpId: 'bipolar_volley',
        comboGapSec: 0.3,
      },
      bipolar_volley: {
        id: 'bipolar_volley',
        label: 'Song Cực Khóa Mục Tiêu',
        actionHint: 'Chạy Zig-Zag Tránh Mũi Tên Đón Đầu!',
        kind: 'strafe_barrage',
        telegraphChannel: 'shot',
        telegraphDuration: 0.54,
        damageMult: 1.06,
        colorHex: 0xe879f9,
        leadTimeSec: 0.46,
        telegraphMoveMult: 1.04,
        count: 5,
        waves: 3,
        waveIntervalSec: 0.21,
        projectileSpeed: 13.0,
      },
      verdict_leap: {
        id: 'verdict_leap',
        label: 'Vòng Tuyên Án',
        actionHint: 'Lướt Ra Khỏi Tâm Phán Quyết!',
        kind: 'leap_slam',
        telegraphChannel: 'slam',
        telegraphDuration: 0.7,
        damageMult: 1.22,
        colorHex: 0xd946ef,
        leadTimeSec: 0.44,
        telegraphMoveMult: 0.66,
        count: 12,
        projectileSpeed: 10.6,
        radius: 3.4,
        leapDurationSec: 0.34,
        leapPeakHeight: 3.3,
        comboFollowUpId: 'scales_cleave',
        comboGapSec: 0.34,
      },
    },
  },

  // Ch.8 — Hạt Vương Độc Vĩ: Venom Assassin
  scorpio: {
    id: 'scorpio',
    zodiacName: 'Bọ Cạp',
    movementStyle: 'assassin',
    mobilitySpeedMult: 1.66,
    preferredRangeMin: 3.8,
    preferredRangeMax: 7.4,
    orbitWeight: 0.98,
    accentHex: 0xc084fc,
    hazardFlavor: 'poison',
    recoverySec: [0.92, 0.76, 0.62],
    phase1Cycle: ['venom_tail_dash', 'stinger_burst', 'toxic_ambush'],
    phase2Cycle: ['venom_tail_dash', 'toxic_ambush', 'stinger_burst'],
    skills: {
      venom_tail_dash: {
        id: 'venom_tail_dash',
        label: 'Lướt Đuôi Kịch Độc',
        actionHint: 'Tránh Đường Lướt & Vũng Độc!',
        kind: 'dash_charge',
        telegraphChannel: 'lane',
        telegraphDuration: 0.56,
        damageMult: 1.16,
        colorHex: 0xc084fc,
        leadTimeSec: 0.42,
        telegraphMoveMult: 0.68,
        dashSpeed: 16.8,
        dashDurationSec: 0.5,
        hazardKind: 'poison',
        hazardDurationSec: 5.0,
        laneLayout: 'fan',
        count: 1,
        comboFollowUpId: 'toxic_ambush',
        comboGapSec: 0.3,
      },
      stinger_burst: {
        id: 'stinger_burst',
        label: 'Mưa Châm Nọc',
        actionHint: 'Đảo Hướng Tránh 3 Loạt Kim Độc!',
        kind: 'strafe_barrage',
        telegraphChannel: 'shot',
        telegraphDuration: 0.52,
        damageMult: 1.0,
        colorHex: 0xa855f7,
        leadTimeSec: 0.46,
        telegraphMoveMult: 1.1,
        count: 4,
        waves: 3,
        waveIntervalSec: 0.19,
        projectileSpeed: 13.2,
      },
      toxic_ambush: {
        id: 'toxic_ambush',
        label: 'Vồ Độc Khép Vòng',
        actionHint: 'Lướt Thoát Tâm Độc!',
        kind: 'leap_slam',
        telegraphChannel: 'slam',
        telegraphDuration: 0.66,
        damageMult: 1.2,
        colorHex: 0x9333ea,
        leadTimeSec: 0.44,
        telegraphMoveMult: 0.7,
        count: 10,
        projectileSpeed: 11.0,
        radius: 3.15,
        hazardKind: 'poison',
        hazardDurationSec: 5.2,
        leapDurationSec: 0.32,
        leapPeakHeight: 2.9,
      },
    },
  },

  // Ch.9 — Nhân Mã Thần Xạ: Mobile Marksman
  sagittarius: {
    id: 'sagittarius',
    zodiacName: 'Nhân Mã',
    movementStyle: 'kiter',
    mobilitySpeedMult: 1.64,
    preferredRangeMin: 6.5,
    preferredRangeMax: 10.2,
    orbitWeight: 0.98,
    accentHex: 0xa5b4fc,
    hazardFlavor: 'fire',
    recoverySec: [0.92, 0.76, 0.62],
    phase1Cycle: ['skirmish_kiting', 'starfall_trail', 'astral_pierce'],
    phase2Cycle: ['skirmish_kiting', 'starfall_trail', 'astral_pierce'],
    skills: {
      skirmish_kiting: {
        id: 'skirmish_kiting',
        label: 'Trượt Bắn Truy Đuổi',
        actionHint: 'Đổi Hướng Đột Ngột Né Tên Đón Đầu!',
        kind: 'strafe_barrage',
        telegraphChannel: 'shot',
        telegraphDuration: 0.52,
        damageMult: 1.06,
        colorHex: 0xfbbf24,
        leadTimeSec: 0.48,
        telegraphMoveMult: 1.18,
        count: 5,
        waves: 3,
        waveIntervalSec: 0.2,
        projectileSpeed: 14.0,
        comboFollowUpId: 'starfall_trail',
        comboGapSec: 0.3,
      },
      starfall_trail: {
        id: 'starfall_trail',
        label: 'Mưa Sao Băng Dẫn Đường',
        actionHint: 'Bẻ Ngoặt Khỏi Đường Sao Băng!',
        kind: 'meteor_cascade',
        telegraphChannel: 'slam',
        telegraphDuration: 0.66,
        damageMult: 1.15,
        colorHex: 0x818cf8,
        leadTimeSec: 0.55,
        telegraphMoveMult: 0.88,
        count: 4,
        radius: 2.5,
        hazardKind: 'fire',
        hazardDurationSec: 3.8,
      },
      astral_pierce: {
        id: 'astral_pierce',
        label: 'Tiễn Xuyên Tinh Hệ',
        actionHint: 'Lướt Vuông Góc Khỏi 3 Tia Xuyên!',
        kind: 'lane_sweep',
        telegraphChannel: 'lane',
        telegraphDuration: 0.62,
        damageMult: 1.22,
        colorHex: 0xfde047,
        leadTimeSec: 0.44,
        telegraphMoveMult: 0.72,
        laneLayout: 'fan',
        count: 3,
        projectileSpeed: 16.4,
        comboFollowUpId: 'skirmish_kiting',
        comboGapSec: 0.32,
      },
    },
  },

  // Ch.10 — Sơn Thần Ma Kết: Glacial Sovereign
  capricorn: {
    id: 'capricorn',
    zodiacName: 'Ma Kết',
    movementStyle: 'sovereign',
    mobilitySpeedMult: 1.48,
    preferredRangeMin: 4.4,
    preferredRangeMax: 7.8,
    orbitWeight: 0.72,
    accentHex: 0x7dd3fc,
    hazardFlavor: 'frost',
    recoverySec: [0.94, 0.78, 0.64],
    phase1Cycle: ['glacial_lockdown', 'frost_pillars', 'blizzard_spiral'],
    phase2Cycle: ['frost_pillars', 'glacial_lockdown', 'blizzard_spiral'],
    skills: {
      glacial_lockdown: {
        id: 'glacial_lockdown',
        label: 'Băng Phong Tỏa Trận',
        actionHint: 'Đừng Dẫm Vùng Băng Làm Chậm!',
        kind: 'hazard_ring',
        telegraphChannel: 'slam',
        telegraphDuration: 0.66,
        damageMult: 1.1,
        colorHex: 0x7dd3fc,
        leadTimeSec: 0.44,
        telegraphMoveMult: 0.74,
        count: 10,
        projectileSpeed: 11.2,
        radius: 3.1,
        hazardKind: 'frost',
        hazardDurationSec: 5.2,
        comboFollowUpId: 'frost_pillars',
        comboGapSec: 0.32,
      },
      frost_pillars: {
        id: 'frost_pillars',
        label: 'Trụ Băng Liên Kích',
        actionHint: 'Chạy Vòng Tránh Chuỗi Trụ Băng!',
        kind: 'meteor_cascade',
        telegraphChannel: 'slam',
        telegraphDuration: 0.64,
        damageMult: 1.16,
        colorHex: 0x38bdf8,
        leadTimeSec: 0.5,
        telegraphMoveMult: 0.82,
        count: 4,
        radius: 2.6,
        hazardKind: 'frost',
        hazardDurationSec: 4.5,
        phase3FollowUpId: 'blizzard_spiral',
      },
      blizzard_spiral: {
        id: 'blizzard_spiral',
        label: 'Bão Tuyết Tinh Tú',
        actionHint: 'Luồn Khe Bão Băng & Né Nhảy Đập!',
        kind: 'petal_spiral',
        telegraphChannel: 'spiral',
        telegraphDuration: 0.6,
        damageMult: 1.02,
        colorHex: 0xbae6fd,
        telegraphMoveMult: 0.84,
        count: 10,
        waves: 3,
        waveIntervalSec: 0.22,
        projectileSpeed: 11.0,
        comboFollowUpId: 'glacial_lockdown',
        comboGapSec: 0.32,
      },
    },
  },

  // Ch.11 — Thủy Sứ Bảo Bình: Storm Conduit
  aquarius: {
    id: 'aquarius',
    zodiacName: 'Bảo Bình',
    movementStyle: 'storm_orbit',
    mobilitySpeedMult: 1.58,
    preferredRangeMin: 5.2,
    preferredRangeMax: 8.8,
    orbitWeight: 0.92,
    accentHex: 0x22d3ee,
    hazardFlavor: 'frost',
    recoverySec: [0.92, 0.76, 0.62],
    phase1Cycle: ['chain_lightning_lanes', 'tempest_vortex', 'surge_blink'],
    phase2Cycle: ['surge_blink', 'chain_lightning_lanes', 'tempest_vortex'],
    skills: {
      chain_lightning_lanes: {
        id: 'chain_lightning_lanes',
        label: 'Chớp Dây Chuyền',
        actionHint: 'Lướt Ngang Tránh Làn Sét Quét!',
        kind: 'lane_sweep',
        telegraphChannel: 'lane',
        telegraphDuration: 0.62,
        damageMult: 1.18,
        colorHex: 0x22d3ee,
        leadTimeSec: 0.42,
        telegraphMoveMult: 0.72,
        laneLayout: 'parallel_sweep',
        count: 4,
        projectileSpeed: 16.0,
        comboFollowUpId: 'tempest_vortex',
        comboGapSec: 0.3,
        phase3FollowUpId: 'surge_blink',
      },
      tempest_vortex: {
        id: 'tempest_vortex',
        label: 'Lốc Xoáy Thiên Thủy',
        actionHint: 'Giữ Tốc Độ Luồn Lốc Sét!',
        kind: 'petal_spiral',
        telegraphChannel: 'spiral',
        telegraphDuration: 0.58,
        damageMult: 1.02,
        colorHex: 0x06b6d4,
        telegraphMoveMult: 0.9,
        count: 10,
        waves: 3,
        waveIntervalSec: 0.2,
        projectileSpeed: 11.6,
        hazardKind: 'whirlpool',
        hazardDurationSec: 4.5,
      },
      surge_blink: {
        id: 'surge_blink',
        label: 'Dòng Chảy Nghịch',
        actionHint: 'Né Cú Biến Ảnh & Tia Sét Chéo!',
        kind: 'blink_strike',
        telegraphChannel: 'lane',
        telegraphDuration: 0.52,
        damageMult: 1.16,
        colorHex: 0x67e8f9,
        leadTimeSec: 0.42,
        telegraphMoveMult: 0.8,
        laneLayout: 'cross_x',
        count: 4,
        projectileSpeed: 15.4,
        comboFollowUpId: 'chain_lightning_lanes',
        comboGapSec: 0.3,
      },
    },
  },

  // Ch.12 — Song Ngư Mộng Chủ: Astral Leviathan
  pisces: {
    id: 'pisces',
    zodiacName: 'Song Ngư',
    movementStyle: 'leviathan',
    mobilitySpeedMult: 1.62,
    preferredRangeMin: 5.0,
    preferredRangeMax: 9.0,
    orbitWeight: 1.0,
    accentHex: 0x5eead4,
    hazardFlavor: 'whirlpool',
    recoverySec: [0.92, 0.76, 0.62],
    phase1Cycle: ['yinyang_dance', 'dream_blink_cross', 'astral_cascade'],
    phase2Cycle: ['dream_blink_cross', 'astral_cascade', 'yinyang_dance'],
    skills: {
      yinyang_dance: {
        id: 'yinyang_dance',
        label: 'Vũ Điệu Song Ngư',
        actionHint: 'Lượn Theo Nhịp Xoắn Âm Dương!',
        kind: 'petal_spiral',
        telegraphChannel: 'spiral',
        telegraphDuration: 0.58,
        damageMult: 1.04,
        colorHex: 0x5eead4,
        telegraphMoveMult: 0.96,
        count: 11,
        waves: 3,
        waveIntervalSec: 0.21,
        projectileSpeed: 11.6,
        comboFollowUpId: 'dream_blink_cross',
        comboGapSec: 0.3,
      },
      dream_blink_cross: {
        id: 'dream_blink_cross',
        label: 'Mộng Cảnh Biến Ảnh',
        actionHint: 'Đề Phòng Biến Ảnh & Làn Tinh Hà!',
        kind: 'blink_strike',
        telegraphChannel: 'lane',
        telegraphDuration: 0.54,
        damageMult: 1.18,
        colorHex: 0x2dd4bf,
        leadTimeSec: 0.44,
        telegraphMoveMult: 0.82,
        laneLayout: 'cross_plus',
        count: 4,
        projectileSpeed: 15.6,
        comboFollowUpId: 'astral_cascade',
        comboGapSec: 0.3,
        phase3FollowUpId: 'dream_nova_leap',
      },
      astral_cascade: {
        id: 'astral_cascade',
        label: 'Triều Mộng Hủy Diệt',
        actionHint: 'Lướt Liên Hoàn Khỏi Mưa Sao!',
        kind: 'meteor_cascade',
        telegraphChannel: 'slam',
        telegraphDuration: 0.64,
        damageMult: 1.16,
        colorHex: 0x99f6e4,
        leadTimeSec: 0.52,
        telegraphMoveMult: 0.86,
        count: 4,
        radius: 2.7,
        hazardKind: 'whirlpool',
        hazardDurationSec: 4.8,
        comboFollowUpId: 'yinyang_dance',
        comboGapSec: 0.3,
      },
      dream_nova_leap: {
        id: 'dream_nova_leap',
        label: 'Tinh Hà Giáng Thế',
        actionHint: 'Lướt Xa Tâm Nổ Tối Thượng!',
        kind: 'leap_slam',
        telegraphChannel: 'slam',
        telegraphDuration: 0.68,
        damageMult: 1.28,
        colorHex: 0xf0abfc,
        leadTimeSec: 0.44,
        telegraphMoveMult: 0.7,
        count: 14,
        projectileSpeed: 11.4,
        radius: 3.6,
        leapDurationSec: 0.36,
        leapPeakHeight: 3.5,
      },
    },
  },

  // Stage 4 Sub-Boss (WARDEN_BOSS): Vanguard Skirmisher
  warden: {
    id: 'warden',
    zodiacName: 'Tiên Phong',
    movementStyle: 'predator',
    mobilitySpeedMult: 1.5,
    preferredRangeMin: 4.2,
    preferredRangeMax: 7.6,
    orbitWeight: 0.82,
    accentHex: 0x38bdf8,
    hazardFlavor: 'fire',
    recoverySec: [1.04, 0.88, 0.74],
    phase1Cycle: ['vanguard_dash', 'tri_lance_strafe', 'warden_leap'],
    phase2Cycle: ['vanguard_dash', 'warden_leap', 'tri_lance_strafe'],
    skills: {
      vanguard_dash: {
        id: 'vanguard_dash',
        label: 'Đột Kích Tiên Phong',
        actionHint: 'Né Ngang Dụ Đập Tường!',
        kind: 'dash_charge',
        telegraphChannel: 'lane',
        telegraphDuration: 0.6,
        damageMult: 1.12,
        leadTimeSec: 0.38,
        telegraphMoveMult: 0.62,
        dashSpeed: 14.6,
        dashDurationSec: 0.5,
        laneLayout: 'fan',
        count: 1,
        comboFollowUpId: 'tri_lance_strafe',
        comboGapSec: 0.34,
      },
      tri_lance_strafe: {
        id: 'tri_lance_strafe',
        label: 'Liên Xạ Đảo Cánh',
        actionHint: 'Di Chuyển Chéo Né Loạt Đạn!',
        kind: 'strafe_barrage',
        telegraphChannel: 'shot',
        telegraphDuration: 0.56,
        damageMult: 1.0,
        leadTimeSec: 0.42,
        telegraphMoveMult: 1.02,
        count: 3,
        waves: 2,
        waveIntervalSec: 0.24,
        projectileSpeed: 12.2,
      },
      warden_leap: {
        id: 'warden_leap',
        label: 'Nhảy Đập Phá Vòng',
        actionHint: 'Rời Khỏi Vòng Cảnh Báo!',
        kind: 'leap_slam',
        telegraphChannel: 'slam',
        telegraphDuration: 0.72,
        damageMult: 1.16,
        leadTimeSec: 0.4,
        telegraphMoveMult: 0.64,
        count: 8,
        projectileSpeed: 9.6,
        radius: 3.0,
        leapDurationSec: 0.34,
        leapPeakHeight: 2.7,
      },
    },
  },

  // Stage 8 Sub-Boss (TITAN_BOSS): Siege Breaker
  titan: {
    id: 'titan',
    zodiacName: 'Cự Thần',
    movementStyle: 'juggernaut',
    mobilitySpeedMult: 1.44,
    preferredRangeMin: 3.8,
    preferredRangeMax: 7.0,
    orbitWeight: 0.54,
    accentHex: 0xf97316,
    hazardFlavor: 'fire',
    recoverySec: [1.02, 0.86, 0.72],
    phase1Cycle: ['siege_charge', 'double_quake', 'corridor_barrage'],
    phase2Cycle: ['siege_charge', 'double_quake', 'corridor_barrage'],
    skills: {
      siege_charge: {
        id: 'siege_charge',
        label: 'Xung Kích Công Thành',
        actionHint: 'Lướt Ngang Dụ Đập Tường Choáng!',
        kind: 'dash_charge',
        telegraphChannel: 'lane',
        telegraphDuration: 0.62,
        damageMult: 1.2,
        leadTimeSec: 0.4,
        telegraphMoveMult: 0.6,
        dashSpeed: 15.4,
        dashDurationSec: 0.56,
        laneLayout: 'fan',
        count: 1,
        comboFollowUpId: 'double_quake',
        comboGapSec: 0.34,
      },
      double_quake: {
        id: 'double_quake',
        label: 'Chấn Động Nhị Liên',
        actionHint: 'Tránh 2 Sóng Nổ Lan Rộng!',
        kind: 'tectonic_pulse',
        telegraphChannel: 'slam',
        telegraphDuration: 0.72,
        damageMult: 1.18,
        telegraphMoveMult: 0.58,
        waves: 2,
        waveIntervalSec: 0.4,
        radius: 3.25,
        count: 8,
        projectileSpeed: 10.0,
      },
      corridor_barrage: {
        id: 'corridor_barrage',
        label: 'Quét Làn Hủy Diệt',
        actionHint: 'Đứng Giữa Khe Trống 3 Làn Tia!',
        kind: 'lane_sweep',
        telegraphChannel: 'lane',
        telegraphDuration: 0.66,
        damageMult: 1.14,
        leadTimeSec: 0.4,
        telegraphMoveMult: 0.64,
        laneLayout: 'fan',
        count: 3,
        projectileSpeed: 14.6,
        comboFollowUpId: 'siege_charge',
        comboGapSec: 0.36,
      },
    },
  },
};

export interface BossProfileLookupInput {
  enemyKind: EnemyKind;
  chapterId: number;
  zodiacId?: string | null;
  weeklyBossId?: string | null;
  weeklyChapterVisualIndex?: number | null;
  isTowerMode?: boolean;
  towerFloor?: number;
  isBossRushMode?: boolean;
  bossRushStage?: number;
}

export function resolveBossProfileId(input: BossProfileLookupInput): ZodiacBossProfileId {
  if (input.enemyKind === EnemyKind.WARDEN_BOSS) return 'warden';
  if (input.enemyKind === EnemyKind.TITAN_BOSS) return 'titan';

  // Weekly Ranked Boss maps cleanly to its visual Zodiac chapter
  if (input.weeklyBossId) {
    const clean = input.weeklyBossId.replace(/_blitz$/, '');
    if (clean.includes('leo') || clean.includes('solar')) return 'leo';
    if (clean.includes('aries')) return 'aries';
    if (clean.includes('taurus')) return 'taurus';
    if (clean.includes('gemini')) return 'gemini';
    if (clean.includes('cancer')) return 'cancer';
    if (clean.includes('virgo')) return 'virgo';
    if (clean.includes('libra')) return 'libra';
    if (clean.includes('scorpio')) return 'scorpio';
    if (clean.includes('sagittarius')) return 'sagittarius';
    if (clean.includes('capricorn')) return 'capricorn';
    if (clean.includes('aquarius')) return 'aquarius';
    if (clean.includes('pisces')) return 'pisces';
    if (typeof input.weeklyChapterVisualIndex === 'number' && input.weeklyChapterVisualIndex >= 0) {
      return ZODIAC_PROFILE_ORDER[input.weeklyChapterVisualIndex % ZODIAC_PROFILE_ORDER.length];
    }
  }

  // Tower & Boss Rush rotate across all 12 Zodiac archetypes so every boss encounter feels fresh
  if (input.isTowerMode && typeof input.towerFloor === 'number' && input.towerFloor > 0) {
    const bossIndex = Math.max(0, Math.floor((input.towerFloor - 1) / 3));
    return ZODIAC_PROFILE_ORDER[bossIndex % ZODIAC_PROFILE_ORDER.length];
  }
  if (input.isBossRushMode && typeof input.bossRushStage === 'number' && input.bossRushStage > 0) {
    return ZODIAC_PROFILE_ORDER[(input.bossRushStage - 1) % ZODIAC_PROFILE_ORDER.length];
  }

  if (input.zodiacId && input.zodiacId in ZODIAC_BOSS_PROFILES) {
    return input.zodiacId as ZodiacBossProfileId;
  }

  const idx = Math.max(0, Math.min(ZODIAC_PROFILE_ORDER.length - 1, Math.floor((input.chapterId || 1) - 1)));
  return ZODIAC_PROFILE_ORDER[idx];
}

export interface BossPendingVolley {
  delaySec: number;
  kind: 'spiral' | 'strafe_shot' | 'tectonic_ring';
  waveIndex: number;
  baseYaw: number;
  count: number;
  projectileSpeed: number;
  damageMult: number;
  colorHex: number;
  radius?: number;
}

export interface BossActiveMovementAction {
  kind: 'leap' | 'dash' | 'guard';
  elapsed: number;
  duration: number;
  startX: number;
  startZ: number;
  targetX: number;
  targetZ: number;
  dirX: number;
  dirZ: number;
  speed: number;
  peakHeight: number;
  damageMult: number;
  colorHex: number;
  orbCount: number;
  projectileSpeed: number;
  slamRadius: number;
  hazardKind?: BossHazardKind;
  hazardDurationSec?: number;
  trailTimer: number;
  hitPlayerDuringDash?: boolean;
}

export interface BossAiRuntimeState {
  profileId: ZodiacBossProfileId;
  chapterId: number;
  accentHex: number;
  hazardFlavor: BossHazardKind;
  strafeDir: 1 | -1;
  strafeFlipTimer: number;
  cycleIndex: number;
  /** Currently telegraphing or executing skill */
  activeSkillId: string | null;
  activeSkillLabel: string;
  activeActionHint: string;
  /** Last skill executed (prevents infinite back-to-back anti-kite spam) */
  lastSkillId: string | null;
  /** Queued follow-up skill ids in a Phase II/III combo chain */
  comboQueue: string[];
  /** Currently executing active motion (parabolic leap, high-speed dash, or guard stance) */
  activeAction: BossActiveMovementAction | null;
  /** Queued staggered projectile/shockwave waves */
  pendingVolleys: BossPendingVolley[];
  /** Current visual jump height (applied to model root Y) */
  visualHeightY: number;
  /** Last blink arrival flash timer */
  blinkFlashTimer: number;
  /** True while guard_counter stance is reducing incoming damage */
  guardDamageReduction: number;
  /** Tactical Micro-Dash state between skills so bosses constantly dart/reposition */
  microDashCooldown: number;
  microDashTimer: number;
  microDashDirX: number;
  microDashDirZ: number;
  /** Boss Timed Enrage tracking (prevents infinite kiting & enforces LC readiness) */
  timedEnrageElapsed: number;
  timedEnrageLimitSec: number;
  timedEnrageTriggered: boolean;
}

export function createBossAiRuntimeState(
  input: BossProfileLookupInput & { timedEnrageLimitSec?: number }
): BossAiRuntimeState {
  const profileId = resolveBossProfileId(input);
  const profile = ZODIAC_BOSS_PROFILES[profileId];
  const chapterMeta = CHAPTER_HAZARD_FLAVOR[Math.max(1, Math.min(12, input.chapterId || 1))];
  // Sub-bosses inherit the current chapter's visual accent and hazard flavor
  const isSubBoss = profileId === 'warden' || profileId === 'titan';
  return {
    profileId,
    chapterId: input.chapterId || 1,
    accentHex: isSubBoss ? chapterMeta.accentHex : profile.accentHex,
    hazardFlavor: isSubBoss ? chapterMeta.hazard : profile.hazardFlavor,
    strafeDir: (input.chapterId % 2 === 0 ? -1 : 1) as 1 | -1,
    strafeFlipTimer: 2.2,
    cycleIndex: 0,
    activeSkillId: null,
    activeSkillLabel: '',
    activeActionHint: '',
    lastSkillId: null,
    comboQueue: [],
    activeAction: null,
    pendingVolleys: [],
    visualHeightY: 0,
    blinkFlashTimer: 0,
    guardDamageReduction: 0,
    microDashCooldown: 2.4,
    microDashTimer: 0,
    microDashDirX: 0,
    microDashDirZ: 0,
    timedEnrageElapsed: 0,
    timedEnrageLimitSec: Math.max(25, input.timedEnrageLimitSec ?? 75),
    timedEnrageTriggered: false,
  };
}

/**
 * Predicts a dodgeable target coordinate by capping lead time and clamping inside arena bounds.
 */
export function computeCappedLeadTarget(params: {
  playerX: number;
  playerZ: number;
  playerVx: number;
  playerVz: number;
  leadTimeSec: number;
  arenaHalfW: number;
  arenaHalfD: number;
  margin?: number;
}): { x: number; z: number } {
  const clampedLead = Math.max(0, Math.min(0.58, params.leadTimeSec));
  const margin = params.margin ?? 1.6;
  const maxX = Math.max(1, params.arenaHalfW - margin);
  const maxZ = Math.max(1, params.arenaHalfD - margin);
  const rawX = params.playerX + params.playerVx * clampedLead;
  const rawZ = params.playerZ + params.playerVz * clampedLead;
  return {
    x: Math.max(-maxX, Math.min(maxX, rawX)),
    z: Math.max(-maxZ, Math.min(maxZ, rawZ)),
  };
}

/**
 * Computes a safe flanking/behind-player blink destination inside the arena,
 * keeping at least `minDistFromPlayer` meters away so blink strikes never tele-frag.
 */
export function computeSafeBlinkDestination(params: {
  bossX: number;
  bossZ: number;
  playerX: number;
  playerZ: number;
  playerVx: number;
  playerVz: number;
  strafeDir: 1 | -1;
  arenaHalfW: number;
  arenaHalfD: number;
  preferredDist?: number;
}): { x: number; z: number } {
  const dist = params.preferredDist ?? 5.4;
  const pSpeed = Math.hypot(params.playerVx, params.playerVz);
  let refX: number;
  let refZ: number;
  if (pSpeed > 0.6) {
    // Appear on the flank/behind player's current motion vector
    refX = -(params.playerVx / pSpeed);
    refZ = -(params.playerVz / pSpeed);
  } else {
    // Appear behind the player relative to boss's current side
    const dx = params.playerX - params.bossX;
    const dz = params.playerZ - params.bossZ;
    const d = Math.hypot(dx, dz) || 1;
    refX = dx / d;
    refZ = dz / d;
  }

  // Blend behind + flank for dramatic dodgeable ambush angle
  const flankX = -refZ * params.strafeDir;
  const flankZ = refX * params.strafeDir;
  const mixX = refX * 0.72 + flankX * 0.68;
  const mixZ = refZ * 0.72 + flankZ * 0.68;
  const mixLen = Math.hypot(mixX, mixZ) || 1;

  const maxX = Math.max(1.5, params.arenaHalfW - 2.1);
  const maxZ = Math.max(1.5, params.arenaHalfD - 2.1);
  let tx = Math.max(-maxX, Math.min(maxX, params.playerX + (mixX / mixLen) * dist));
  let tz = Math.max(-maxZ, Math.min(maxZ, params.playerZ + (mixZ / mixLen) * dist));

  // If clamping pushed destination too close to player, flip toward arena center
  const dAfter = Math.hypot(tx - params.playerX, tz - params.playerZ);
  if (dAfter < 4.1) {
    const toCenterX = -params.playerX;
    const toCenterZ = -params.playerZ;
    const cLen = Math.hypot(toCenterX, toCenterZ) || 1;
    tx = Math.max(-maxX, Math.min(maxX, params.playerX + (toCenterX / cLen) * dist));
    tz = Math.max(-maxZ, Math.min(maxZ, params.playerZ + (toCenterZ / cLen) * dist));
  }
  return { x: tx, z: tz };
}

export interface BossMovementInput {
  dt: number;
  elapsed: number;
  bossX: number;
  bossZ: number;
  playerX: number;
  playerZ: number;
  baseSpeed: number;
  slowMult: number;
  bossPhase: 1 | 2 | 3;
  arenaHalfW: number;
  arenaHalfD: number;
  isTelegraphing: boolean;
  telegraphMoveMult: number;
  enrageSpeedMult?: number;
}

export interface BossMovementVelocity {
  vx: number;
  vz: number;
  microDashTriggered?: boolean;
  isMicroDashing?: boolean;
}

/**
 * Active navigation solver for all 12 Zodiac archetypes + Warden/Titan.
 * Keeps bosses fluidly stalking, micro-dashing, flanking, or pressuring — even while telegraphing!
 */
export function stepBossMovement(
  state: BossAiRuntimeState,
  input: BossMovementInput
): BossMovementVelocity {
  const profile = ZODIAC_BOSS_PROFILES[state.profileId];
  state.strafeFlipTimer -= input.dt;
  if (state.strafeFlipTimer <= 0) {
    state.strafeDir = state.strafeDir === 1 ? -1 : 1;
    state.strafeFlipTimer =
      profile.movementStyle === 'leviathan' || profile.movementStyle === 'assassin'
        ? 1.75
        : profile.movementStyle === 'kiter' || profile.movementStyle === 'trickster'
        ? 2.1
        : 2.65;
  }

  const dx = input.playerX - input.bossX;
  const dz = input.playerZ - input.bossZ;
  const dist = Math.hypot(dx, dz) || 0.001;
  const dirX = dx / dist;
  const dirZ = dz / dist;
  const tangX = -dirZ * state.strafeDir;
  const tangZ = dirX * state.strafeDir;

  const enrageSpeed = input.enrageSpeedMult ?? 1.0;
  const phaseMult = input.bossPhase === 3 ? 1.26 : input.bossPhase === 2 ? 1.15 : 1.0;

  // Tactical Micro-Dash: periodic short burst lunge/flank between skills so bosses never feel sluggish
  let microDashTriggered = false;
  if (state.microDashTimer > 0) {
    state.microDashTimer = Math.max(0, state.microDashTimer - input.dt);
  } else if (!input.isTelegraphing) {
    state.microDashCooldown -= input.dt * input.slowMult * enrageSpeed;
    if (state.microDashCooldown <= 0) {
      const gapUrgency = dist > profile.preferredRangeMax ? 0.86 : 0.44;
      const flankWeight = dist > profile.preferredRangeMax ? 0.5 : 0.9;
      let mx = dirX * gapUrgency + tangX * flankWeight;
      let mz = dirZ * gapUrgency + tangZ * flankWeight;
      // Keep micro-dash away from arena boundary
      const pad = 2.6;
      if (input.bossX > input.arenaHalfW - pad && mx > 0) mx = -Math.abs(mx);
      if (input.bossX < -input.arenaHalfW + pad && mx < 0) mx = Math.abs(mx);
      if (input.bossZ > input.arenaHalfD - pad && mz > 0) mz = -Math.abs(mz);
      if (input.bossZ < -input.arenaHalfD + pad && mz < 0) mz = Math.abs(mz);
      const mLen = Math.hypot(mx, mz) || 1;
      state.microDashDirX = mx / mLen;
      state.microDashDirZ = mz / mLen;
      state.microDashTimer = 0.26;
      const baseCd =
        profile.movementStyle === 'assassin' ||
        profile.movementStyle === 'predator' ||
        profile.movementStyle === 'trickster'
          ? 2.4
          : profile.movementStyle === 'juggernaut' || profile.movementStyle === 'sovereign'
          ? 3.1
          : 2.75;
      state.microDashCooldown = Math.max(1.85, baseCd - (input.bossPhase - 1) * 0.22);
      microDashTriggered = true;
    }
  }

  if (state.microDashTimer > 0 && !input.isTelegraphing) {
    const dashSpeed =
      input.baseSpeed * profile.mobilitySpeedMult * phaseMult * enrageSpeed * input.slowMult * 2.15;
    return {
      vx: state.microDashDirX * dashSpeed,
      vz: state.microDashDirZ * dashSpeed,
      microDashTriggered,
      isMicroDashing: true,
    };
  }

  // Radial pressure based on preferred range band
  let radial = 0;
  if (dist > profile.preferredRangeMax) {
    radial = 1.05;
  } else if (dist < profile.preferredRangeMin) {
    radial =
      profile.movementStyle === 'kiter' ||
      profile.movementStyle === 'trickster' ||
      profile.movementStyle === 'geometric'
        ? -0.88
        : profile.movementStyle === 'juggernaut' || profile.movementStyle === 'rammer'
        ? 0.35
        : -0.35;
  } else {
    // Inside sweet spot: crisp stalking wave so boss continuously glides
    radial = Math.sin(input.elapsed * 2.4 + state.chapterId) * 0.38;
  }

  let orbit = profile.orbitWeight;
  if (profile.movementStyle === 'leviathan') {
    orbit = 0.98 * Math.cos(input.elapsed * 1.25);
    radial += Math.sin(input.elapsed * 2.5) * 0.44;
  } else if (profile.movementStyle === 'predator' || profile.movementStyle === 'assassin') {
    orbit = dist > profile.preferredRangeMax ? 0.35 : profile.orbitWeight;
  }

  // Soft wall avoidance so orbiting bosses never grind against arena edges
  let wallPushX = 0;
  let wallPushZ = 0;
  const edgePad = 2.4;
  if (input.bossX > input.arenaHalfW - edgePad) wallPushX = -1.1;
  else if (input.bossX < -input.arenaHalfW + edgePad) wallPushX = 1.1;
  if (input.bossZ > input.arenaHalfD - edgePad) wallPushZ = -1.1;
  else if (input.bossZ < -input.arenaHalfD + edgePad) wallPushZ = 1.1;

  let moveX = dirX * radial + tangX * orbit + wallPushX;
  let moveZ = dirZ * radial + tangZ * orbit + wallPushZ;
  const mag = Math.hypot(moveX, moveZ);
  if (mag > 0.001) {
    moveX /= mag;
    moveZ /= mag;
  }

  // Enforce >= 55% floor during telegraphs so bosses NEVER freeze in place while casting!
  const teleMult = input.isTelegraphing ? Math.max(0.55, input.telegraphMoveMult) : 1.0;
  const finalSpeed =
    input.baseSpeed * profile.mobilitySpeedMult * phaseMult * enrageSpeed * teleMult * input.slowMult;

  return {
    vx: moveX * finalSpeed,
    vz: moveZ * finalSpeed,
    microDashTriggered: false,
    isMicroDashing: false,
  };
}

export interface BossSkillPlan {
  skill: BossSkillDefinition;
  telegraphDuration: number;
  aimX: number;
  aimZ: number;
  slamX: number;
  slamZ: number;
  slamRadius: number;
  laneAngles: number[];
  multiSlamPoints: Array<{ x: number; z: number; radius: number; delaySec: number }>;
  isComboStep: boolean;
  hasFollowUp: boolean;
  nextComboGapSec: number;
  antiKiteTriggered?: boolean;
}

const GAP_CLOSER_KINDS: ReadonlySet<BossSkillKind> = new Set([
  'leap_slam',
  'dash_charge',
  'blink_strike',
]);

const ANTI_KITE_FALLBACK_KINDS: ReadonlySet<BossSkillKind> = new Set([
  'strafe_barrage',
  'meteor_cascade',
]);

/**
 * Selects the next skill (continuing Phase II/III combos, overriding with a gap-closer when kited,
 * or advancing the Zodiac profile's signature skill cycle) and computes exact dodgeable telegraph geometry.
 */
export function planNextBossSkill(
  state: BossAiRuntimeState,
  params: {
    bossX: number;
    bossZ: number;
    playerX: number;
    playerZ: number;
    playerVx: number;
    playerVz: number;
    bossPhase: 1 | 2 | 3;
    arenaHalfW: number;
    arenaHalfD: number;
    lowEndGpu: boolean;
  }
): BossSkillPlan {
  const profile = ZODIAC_BOSS_PROFILES[state.profileId];
  const budget = getBossPerformanceBudget(params.lowEndGpu);
  const distToPlayer = Math.hypot(params.playerX - params.bossX, params.playerZ - params.bossZ);

  let skillId: string;
  let isComboStep = false;
  let antiKiteTriggered = false;
  if (state.comboQueue.length > 0) {
    skillId = state.comboQueue.shift()!;
    isComboStep = true;
  } else {
    const cycle = params.bossPhase >= 2 ? profile.phase2Cycle : profile.phase1Cycle;
    const scheduledId = cycle[state.cycleIndex % cycle.length];
    const scheduledSkill = profile.skills[scheduledId];
    skillId = scheduledId;

    // Anti-Kiting Override: when player runs far past ideal range, pick a gap-closer or pursuit strike immediately
    if (
      distToPlayer > profile.preferredRangeMax + 1.5 &&
      scheduledSkill &&
      !GAP_CLOSER_KINDS.has(scheduledSkill.kind)
    ) {
      const gapCloserId =
        cycle.find(
          (id) =>
            id !== state.lastSkillId &&
            profile.skills[id] &&
            GAP_CLOSER_KINDS.has(profile.skills[id].kind)
        ) ??
        cycle.find(
          (id) =>
            id !== state.lastSkillId &&
            profile.skills[id] &&
            ANTI_KITE_FALLBACK_KINDS.has(profile.skills[id].kind)
        );
      if (gapCloserId && gapCloserId !== scheduledId) {
        skillId = gapCloserId;
        antiKiteTriggered = true;
      }
    }

    state.cycleIndex += 1;

    const chosen = profile.skills[skillId];
    if (chosen) {
      const unlockCombo = params.bossPhase >= 2 || Boolean(chosen.comboInPhase1);
      if (unlockCombo && chosen.comboFollowUpId && profile.skills[chosen.comboFollowUpId]) {
        state.comboQueue.push(chosen.comboFollowUpId);
      }
      if (
        params.bossPhase === 3 &&
        chosen.phase3FollowUpId &&
        profile.skills[chosen.phase3FollowUpId]
      ) {
        state.comboQueue.push(chosen.phase3FollowUpId);
      }
    }
  }

  const skill = profile.skills[skillId] ?? Object.values(profile.skills)[0];
  state.lastSkillId = skill.id;
  state.activeSkillId = skill.id;
  state.activeSkillLabel = skill.label;
  state.activeActionHint = skill.actionHint;

  // Phase acceleration while keeping readable minimum dodge window (>= 0.44s)
  const phaseTeleMult = params.bossPhase === 3 ? 0.84 : params.bossPhase === 2 ? 0.9 : 1.0;
  const comboBoost = isComboStep ? 0.92 : 1.0;
  const telegraphDuration = Math.max(
    0.44,
    Number((skill.telegraphDuration * phaseTeleMult * comboBoost).toFixed(2))
  );

  const leadTarget = computeCappedLeadTarget({
    playerX: params.playerX,
    playerZ: params.playerZ,
    playerVx: params.playerVx,
    playerVz: params.playerVz,
    leadTimeSec: (skill.leadTimeSec ?? 0.34) * (params.bossPhase >= 2 ? 1.08 : 1.0),
    arenaHalfW: params.arenaHalfW,
    arenaHalfD: params.arenaHalfD,
    margin: 1.5,
  });

  const dx = leadTarget.x - params.bossX;
  const dz = leadTarget.z - params.bossZ;
  const d = Math.hypot(dx, dz) || 1;
  const aimX = dx / d;
  const aimZ = dz / d;
  const baseYaw = Math.atan2(aimX, aimZ);

  const laneAngles: number[] = [];
  if (skill.telegraphChannel === 'lane') {
    const layout = skill.laneLayout ?? 'fan';
    const baseCount = Math.max(1, skill.count ?? 2);
    if (layout === 'cross_plus') {
      laneAngles.push(0, Math.PI * 0.5, Math.PI, -Math.PI * 0.5);
    } else if (layout === 'cross_x') {
      laneAngles.push(Math.PI * 0.25, Math.PI * 0.75, -Math.PI * 0.75, -Math.PI * 0.25);
    } else if (layout === 'twin_flank') {
      laneAngles.push(baseYaw - 0.24, baseYaw + 0.24);
      if (params.bossPhase >= 2) laneAngles.push(baseYaw);
    } else if (layout === 'parallel_sweep') {
      const lanes = params.bossPhase >= 2 ? Math.min(5, baseCount + 1) : baseCount;
      const spread = 0.26;
      for (let k = 0; k < lanes; k++) {
        laneAngles.push(baseYaw + (k - (lanes - 1) / 2) * spread);
      }
    } else {
      const lanes =
        skill.kind === 'dash_charge'
          ? 1
          : params.bossPhase >= 2
          ? Math.min(5, baseCount + 1)
          : baseCount;
      const spread = lanes === 1 ? 0 : 0.28;
      for (let k = 0; k < lanes; k++) {
        laneAngles.push(baseYaw + (k - (lanes - 1) / 2) * spread);
      }
    }
  }

  const multiSlamPoints: Array<{ x: number; z: number; radius: number; delaySec: number }> = [];
  if (skill.kind === 'meteor_cascade') {
    const desired = Math.min(budget.maxMultiSlams, (skill.count ?? 3) + (params.bossPhase >= 2 ? 1 : 0));
    const clampedCount = Math.min(budget.maxMultiSlams, desired);
    const pSpd = Math.hypot(params.playerVx, params.playerVz);
    const stepDirX = pSpd > 0.45 ? params.playerVx / pSpd : -aimZ * state.strafeDir;
    const stepDirZ = pSpd > 0.45 ? params.playerVz / pSpd : aimX * state.strafeDir;
    const spacing = 2.45;
    const radius = skill.radius ?? 2.55;
    const maxX = Math.max(1.4, params.arenaHalfW - 1.5);
    const maxZ = Math.max(1.4, params.arenaHalfD - 1.5);

    for (let i = 0; i < clampedCount; i++) {
      const offsetDist = i * spacing;
      const px = Math.max(-maxX, Math.min(maxX, params.playerX + stepDirX * offsetDist));
      const pz = Math.max(-maxZ, Math.min(maxZ, params.playerZ + stepDirZ * offsetDist));
      multiSlamPoints.push({
        x: px,
        z: pz,
        radius,
        delaySec: i * 0.24,
      });
    }
  }

  const slamRadius = (skill.radius ?? 3.1) * (params.bossPhase >= 2 ? 1.06 : 1.0);
  const slamX =
    skill.kind === 'tectonic_pulse' || skill.kind === 'guard_counter'
      ? params.bossX
      : leadTarget.x;
  const slamZ =
    skill.kind === 'tectonic_pulse' || skill.kind === 'guard_counter'
      ? params.bossZ
      : leadTarget.z;

  const hasFollowUp = state.comboQueue.length > 0;
  const nextComboGapSec = hasFollowUp ? Math.max(0.24, skill.comboGapSec ?? 0.32) : 0;

  return {
    skill,
    telegraphDuration,
    aimX,
    aimZ,
    slamX,
    slamZ,
    slamRadius,
    laneAngles,
    multiSlamPoints,
    isComboStep,
    hasFollowUp,
    nextComboGapSec,
    antiKiteTriggered,
  };
}

export function getBossRecoveryDuration(
  state: BossAiRuntimeState,
  bossPhase: 1 | 2 | 3,
  pveCooldownMult: number,
  enrageCooldownMult = 1.0
): number {
  const profile = ZODIAC_BOSS_PROFILES[state.profileId];
  const base = profile.recoverySec[bossPhase - 1] ?? profile.recoverySec[0];
  return Math.max(0.45, base * pveCooldownMult * enrageCooldownMult);
}

export function scaleOrbCountForBudget(baseCount: number, bossPhase: 1 | 2 | 3, lowEndGpu: boolean): number {
  const budget = getBossPerformanceBudget(lowEndGpu);
  const phaseBonus = bossPhase === 3 ? 4 : bossPhase === 2 ? 2 : 0;
  return Math.max(4, Math.round((baseCount + phaseBonus) * budget.orbCountScale));
}

export function clearBossAiTransientCombat(state: BossAiRuntimeState): void {
  state.comboQueue.length = 0;
  state.activeAction = null;
  state.pendingVolleys.length = 0;
  state.visualHeightY = 0;
  state.guardDamageReduction = 0;
  state.microDashTimer = 0;
  state.activeSkillId = null;
  state.activeSkillLabel = '';
  state.activeActionHint = '';
}

// ============================================================================
// BOSS DURABILITY, CC RESISTANCE, PHASE LETHALITY & TIMED ENRAGE HELPERS
// ============================================================================

/** PvE Boss Guard-Break stun lasts 2.0s (not 4.0s) followed by 10s stun immunity. */
export const BOSS_GUARD_BREAK_STUN_SEC = 2.0;
export const BOSS_STUN_IMMUNITY_SEC = 10.0;

/**
 * Innate Astral Armor on PvE Bosses: reduces incoming damage by 16% (Ch.1) up to 26% (Ch.12).
 */
export function computeBossInnateArmorReduction(chapterId: number, isBoss: boolean): number {
  if (!isBoss) return 0;
  const clamped = Math.max(1, Math.min(12, Math.floor(chapterId || 1)));
  return Number((0.16 + ((clamped - 1) / 11) * 0.1).toFixed(3));
}

/**
 * Boss attack damage scales meaningfully across phases: Phase I = 1.0x, Phase II = 1.18x, Phase III = 1.32x.
 */
export function computeBossPhaseDamageMult(bossPhase: 1 | 2 | 3): number {
  if (bossPhase === 3) return 1.32;
  if (bossPhase === 2) return 1.18;
  return 1.0;
}

/**
 * Boss CC Resistance: Frost/Chill can slow PvE Bosses by at most 15% (slowMult >= 0.85).
 */
export function clampBossChillSlowMult(rawSlowMult: number, isBoss: boolean): number {
  return isBoss ? Math.max(0.85, rawSlowMult) : rawSlowMult;
}

export interface BossTimedEnrageModifiers {
  active: boolean;
  remainingSec: number;
  overtimeSec: number;
  damageMult: number;
  speedMult: number;
  cooldownMult: number;
}

/**
 * Boss Timed Enrage ("CUỒNG NỘ BẠO PHÁT"):
 * When fight exceeds `limitSec` (75s ready -> 25s severely under-LC), boss enters lethal overdrive:
 * +35% speed, -30% recovery cooldowns, and +70% (+25% every 10s overtime) damage.
 */
export function computeBossEnrageModifiers(
  elapsedSec: number,
  limitSec: number
): BossTimedEnrageModifiers {
  const safeLimit = Math.max(15, limitSec);
  const safeElapsed = Math.max(0, elapsedSec);
  if (safeElapsed < safeLimit) {
    return {
      active: false,
      remainingSec: Math.max(0, safeLimit - safeElapsed),
      overtimeSec: 0,
      damageMult: 1.0,
      speedMult: 1.0,
      cooldownMult: 1.0,
    };
  }
  const overtimeSec = safeElapsed - safeLimit;
  const escalations = Math.floor(overtimeSec / 10);
  return {
    active: true,
    remainingSec: 0,
    overtimeSec,
    damageMult: Number((1.7 + escalations * 0.25).toFixed(2)),
    speedMult: 1.35,
    cooldownMult: 0.7,
  };
}

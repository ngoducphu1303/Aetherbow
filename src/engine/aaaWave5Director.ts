import {
  CombatCameraPreset,
  PhotoLightingPreset,
  SaveData,
} from '../types/game';
import { ElementalReactionId } from './aaaWave4Director';

export interface CombatCameraRigSpec {
  preset: CombatCameraPreset;
  label: string;
  camY: number;
  camZOffset: number;
  fov: number;
  lookLeadMult: number;
}

export interface PhotoLightingMoodSpec {
  id: PhotoLightingPreset;
  label: string;
  keyHex: number;
  keyIntensity: number;
  rimHex: number;
  rimIntensity: number;
  hemiSkyHex: number;
  hemiGroundHex: number;
  exposure: number;
}

export interface BossAudioLayerSpec {
  tier: 0 | 1 | 2 | 3;
  choirGain: number;
  hihatDrive: number;
  subWeight: number;
  filterPeakHz: number;
}

export interface ArmorShardKinematics {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  rx: number;
  ry: number;
  rz: number;
  vrx: number;
  vry: number;
  vrz: number;
  bounces: number;
  life: number;
  maxLife: number;
}

export interface RollingDpsTracker {
  times: Float64Array;
  damages: Float32Array;
  head: number;
  count: number;
  capacity: number;
  peakCrit: number;
}

export interface RollingDpsSnapshot {
  dps5s: number;
  peakCrit: number;
  recentHits: number;
}

export interface ElementalReactionGuideEntry {
  id: ElementalReactionId;
  name: string;
  formula: string;
  accentColor: string;
  bonusPctLabel: string;
  breakShredPct: number;
  tacticalUse: string;
}

export interface PersonalRecordsSummary {
  totalRuns: number;
  totalKills: number;
  totalBossesKilled: number;
  maxComboEver: number;
  highestChapterCleared: number;
  bestTowerFloor: number;
  clearedBossCount: number;
  discoveredSynergiesCount: number;
  totalChestsOpened: number;
}

/**
 * Resolves 3D combat camera framing offsets for Action (closer dramatic angle),
 * Tactical (balanced default), and Wide (expansive arena readability).
 */
export function resolveCombatCameraConfig(
  preset: CombatCameraPreset = 'tactical'
): CombatCameraRigSpec {
  if (preset === 'action') {
    return {
      preset: 'action',
      label: 'Cận Cảnh',
      camY: 14.2,
      camZOffset: 10.6,
      fov: 48,
      lookLeadMult: 0.34,
    };
  }
  if (preset === 'wide') {
    return {
      preset: 'wide',
      label: 'Toàn Cảnh',
      camY: 18.8,
      camZOffset: 13.8,
      fov: 45,
      lookLeadMult: 0.22,
    };
  }
  return {
    preset: 'tactical',
    label: 'Chiến Thuật',
    camY: 16.5,
    camZOffset: 12.2,
    fov: 46,
    lookLeadMult: 0.28,
  };
}

/**
 * Resolves studio three-point lighting moods for 3D Photo Mode & Victory Snapshot.
 */
export function resolvePhotoLightingMood(
  preset: PhotoLightingPreset = 'golden_hall'
): PhotoLightingMoodSpec {
  if (preset === 'moonlit') {
    return {
      id: 'moonlit',
      label: 'Nguyệt Quang',
      keyHex: 0xc7d2fe,
      keyIntensity: 1.85,
      rimHex: 0x38bdf8,
      rimIntensity: 2.3,
      hemiSkyHex: 0x7dd3fc,
      hemiGroundHex: 0x1e1b4b,
      exposure: 1.12,
    };
  }
  if (preset === 'inferno') {
    return {
      id: 'inferno',
      label: 'Hỏa Diệm',
      keyHex: 0xfdba74,
      keyIntensity: 2.05,
      rimHex: 0xf43f5e,
      rimIntensity: 2.4,
      hemiSkyHex: 0xfde68a,
      hemiGroundHex: 0x3b0d14,
      exposure: 1.16,
    };
  }
  return {
    id: 'golden_hall',
    label: 'Hoàng Kim Điện',
    keyHex: 0xfff3d6,
    keyIntensity: 1.95,
    rimHex: 0xfbbf24,
    rimIntensity: 2.1,
    hemiSkyHex: 0xbae6fd,
    hemiGroundHex: 0x1e293b,
    exposure: 1.14,
  };
}

/**
 * Computes adaptive boss-phase BGM layering gains so Phase II & III seamlessly
 * introduce cathedral choir harmonics, double-time hi-hat tension, and deeper sub drums.
 */
export function resolveBossAudioLayers(
  bossPhase: 1 | 2 | 3,
  comboCount: number,
  hpRatio: number
): BossAudioLayerSpec {
  const lowHpBoost = hpRatio <= 0.35 ? 0.015 : 0;
  const comboBoost = comboCount >= 25 ? 0.012 : 0;
  if (bossPhase === 3) {
    return {
      tier: 3,
      choirGain: 0.088 + lowHpBoost,
      hihatDrive: 0.068 + comboBoost,
      subWeight: 0.28,
      filterPeakHz: 1850,
    };
  }
  if (bossPhase === 2) {
    return {
      tier: 2,
      choirGain: 0.056 + lowHpBoost,
      hihatDrive: 0.045 + comboBoost,
      subWeight: 0.24,
      filterPeakHz: 1420,
    };
  }
  return {
    tier: 1,
    choirGain: comboCount >= 18 ? 0.03 : 0,
    hihatDrive: 0.022 + comboBoost,
    subWeight: 0.2,
    filterPeakHz: 1040,
  };
}

/**
 * Deterministic physics integrator for physical 3D armor-shatter & crystal-pillar shards
 * with gravity, floor bounce, friction damping, and angular tumble (zero GC).
 */
export function stepArmorShardPhysics(
  shard: ArmorShardKinematics,
  dt: number
): boolean {
  const safeDt = Math.max(0, Math.min(0.05, dt));
  shard.life -= safeDt;
  if (shard.life <= 0) return false;

  shard.vy -= 18.5 * safeDt;
  shard.x += shard.vx * safeDt;
  shard.y += shard.vy * safeDt;
  shard.z += shard.vz * safeDt;

  if (shard.y < 0.09) {
    shard.y = 0.09;
    if (shard.vy < -0.6) {
      shard.vy = -shard.vy * 0.44;
      shard.vx *= 0.72;
      shard.vz *= 0.72;
      shard.vrx *= 0.65;
      shard.vry *= 0.65;
      shard.vrz *= 0.65;
      shard.bounces += 1;
    } else {
      shard.vy = 0;
      shard.vx *= 0.82;
      shard.vz *= 0.82;
    }
  }

  shard.rx += shard.vrx * safeDt;
  shard.ry += shard.vry * safeDt;
  shard.rz += shard.vrz * safeDt;
  return true;
}

/**
 * Zero-GC fixed-capacity ring buffer for live 5-second rolling DPS & Peak Crit readout.
 */
export function createRollingDpsTracker(capacity = 160): RollingDpsTracker {
  return {
    times: new Float64Array(capacity),
    damages: new Float32Array(capacity),
    head: 0,
    count: 0,
    capacity,
    peakCrit: 0,
  };
}

export function resetRollingDpsTracker(tracker: RollingDpsTracker): void {
  tracker.head = 0;
  tracker.count = 0;
  tracker.peakCrit = 0;
}

export function recordRollingDpsSample(
  tracker: RollingDpsTracker,
  nowSec: number,
  damage: number,
  isCrit: boolean
): void {
  if (damage <= 0) return;
  tracker.times[tracker.head] = nowSec;
  tracker.damages[tracker.head] = damage;
  tracker.head = (tracker.head + 1) % tracker.capacity;
  if (tracker.count < tracker.capacity) {
    tracker.count += 1;
  }
  if (isCrit && damage > tracker.peakCrit) {
    tracker.peakCrit = Math.round(damage);
  }
}

export function computeRollingDpsMetrics(
  tracker: RollingDpsTracker,
  nowSec: number,
  windowSec = 5.0
): RollingDpsSnapshot {
  const cutoff = nowSec - windowSec;
  let total = 0;
  let recentHits = 0;
  let oldestIncluded = nowSec;

  for (let i = 0; i < tracker.count; i++) {
    const t = tracker.times[i];
    if (t >= cutoff && t <= nowSec + 0.001) {
      total += tracker.damages[i];
      recentHits += 1;
      if (t < oldestIncluded) oldestIncluded = t;
    }
  }

  if (recentHits === 0) {
    return { dps5s: 0, peakCrit: tracker.peakCrit, recentHits: 0 };
  }
  const span = Math.max(1.0, Math.min(windowSec, nowSec - oldestIncluded + 0.45));
  return {
    dps5s: Math.round(total / span),
    peakCrit: tracker.peakCrit,
    recentHits,
  };
}

export const ELEMENTAL_REACTION_GUIDE: ElementalReactionGuideEntry[] = [
  {
    id: 'melt',
    name: 'Tan Chảy',
    formula: 'Băng + Hỏa',
    accentColor: '#fb923c',
    bonusPctLabel: '+45% ST Bùng Nổ',
    breakShredPct: 8,
    tacticalUse: 'Dồn sát thương đơn mục tiêu mạnh nhất vào Boss trong cửa sổ Phản Đòn hoặc khi Boss quỵ gối.',
  },
  {
    id: 'superconduct',
    name: 'Siêu Dẫn',
    formula: 'Băng + Lôi',
    accentColor: '#38bdf8',
    bonusPctLabel: '+35% ST & Phá Giáp',
    breakShredPct: 22,
    tacticalUse: 'Rút nhanh 22% thanh Giáp Phá Vỡ của Boss để ép Boss quỵ gối choáng 3 giây sớm hơn.',
  },
  {
    id: 'overload',
    name: 'Quá Tải',
    formula: 'Hỏa + Lôi',
    accentColor: '#f43f5e',
    bonusPctLabel: '+40% ST Diện Rộng',
    breakShredPct: 14,
    tacticalUse: 'Tạo vụ nổ bán kính 3.1m kèm đẩy lùi mạnh, lý tưởng để dọn quái áp sát và phòng đông.',
  },
  {
    id: 'venom_detonation',
    name: 'Nổ Độc Khí',
    formula: 'Độc + Hỏa',
    accentColor: '#4ade80',
    bonusPctLabel: '+38% ST Lan Độc',
    breakShredPct: 10,
    tacticalUse: 'Kích nổ mục tiêu đang trúng độc để gây sát thương lan đều lên cụm Tinh Anh.',
  },
];

/**
 * Aggregates personal career records strictly from existing SaveData fields
 * without requiring any new persistence schema.
 */
export function buildPersonalRecordsSummary(save: SaveData): PersonalRecordsSummary {
  const career = save.career;
  const bossAttempts = save.playtestMetrics?.bossAttempts ?? {};
  const clearedBossCount = Object.values(bossAttempts).filter((b) => b?.cleared).length;
  const synergyPicks = save.playtestMetrics?.synergyPickCounts ?? {};
  const discoveredSynergiesCount = Object.values(synergyPicks).filter((n) => (n ?? 0) > 0).length;

  return {
    totalRuns: career?.totalRuns ?? save.playtestMetrics?.totalRuns ?? 0,
    totalKills: career?.totalKills ?? 0,
    totalBossesKilled: career?.totalBossesKilled ?? clearedBossCount,
    maxComboEver: career?.maxComboEver ?? 0,
    highestChapterCleared: save.highestChapterCleared ?? 0,
    bestTowerFloor: save.bestTowerFloor ?? 0,
    clearedBossCount,
    discoveredSynergiesCount,
    totalChestsOpened: career?.totalChestsOpened ?? 0,
  };
}

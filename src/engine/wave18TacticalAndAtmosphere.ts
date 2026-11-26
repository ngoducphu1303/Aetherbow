import * as THREE from 'three';
import type {
  AccessibilityPresetId,
  GameSettings,
  ZodiacVowDefinition,
  ZodiacVowId,
} from '../types/game';

// ============================================================================
// WAVE 18 PILLAR 1: ZODIAC VOW DIFFICULTY MODIFIERS (Ch.2–12 & Tower Only)
// ============================================================================

export const ZODIAC_VOW_CATALOG: readonly ZodiacVowDefinition[] = [
  {
    id: 'vow_ferocity',
    title: 'Khế Ước Huyết Chiến',
    name: 'Khế Ước Huyết Chiến',
    shortLabel: 'Huyết Chiến',
    glyph: '◆',
    challengeText: 'Quái +18% HP · +12% Sát thương',
    description: 'Quái +18% HP · +12% Sát thương · +15% Bụi Sao',
    rewardText: '+22% Vàng · +15% Bụi Sao',
    enemyHpMult: 1.18,
    enemyDmgMult: 1.12,
    enemyCadenceMult: 1.0,
    healEffectivenessMult: 1.0,
    goldBonusPct: 22,
    starDustBonusPct: 15,
  },
  {
    id: 'vow_haste',
    title: 'Khế Ước Tốc Biến',
    name: 'Khế Ước Tốc Biến',
    shortLabel: 'Tốc Biến',
    glyph: '⚡',
    challengeText: 'Nhịp ra chiêu Quái & Boss nhanh hơn 15%',
    description: 'Nhịp ra chiêu Quái & Boss nhanh hơn 15% · +20% Bụi Sao',
    rewardText: '+20% Vàng · +20% Bụi Sao',
    enemyHpMult: 1.0,
    enemyDmgMult: 1.0,
    enemyCadenceMult: 0.85,
    healEffectivenessMult: 1.0,
    goldBonusPct: 20,
    starDustBonusPct: 20,
  },
  {
    id: 'vow_austerity',
    title: 'Khế Ước Khổ Hạnh',
    name: 'Khế Ước Khổ Hạnh',
    shortLabel: 'Khổ Hạnh',
    glyph: '▲',
    challengeText: 'Hiệu quả hồi máu trong trận giảm 30%',
    description: 'Hiệu quả hồi máu trong trận giảm 30% · +25% Bụi Sao',
    rewardText: '+25% Vàng · +25% Bụi Sao',
    enemyHpMult: 1.0,
    enemyDmgMult: 1.0,
    enemyCadenceMult: 1.0,
    healEffectivenessMult: 0.7,
    goldBonusPct: 25,
    starDustBonusPct: 25,
  },
] as const;

const ZODIAC_VOW_MAP: Readonly<Record<ZodiacVowId, ZodiacVowDefinition>> = {
  vow_ferocity: ZODIAC_VOW_CATALOG[0],
  vow_haste: ZODIAC_VOW_CATALOG[1],
  vow_austerity: ZODIAC_VOW_CATALOG[2],
};

export const VALID_ZODIAC_VOW_IDS: ReadonlySet<string> = new Set(
  ZODIAC_VOW_CATALOG.map((v) => v.id)
);

export interface ZodiacVowAggregate {
  activeVows: ZodiacVowId[];
  enemyHpMult: number;
  enemyDmgMult: number;
  enemyCadenceMult: number;
  healEffectivenessMult: number;
  goldBonusPct: number;
  starDustBonusPct: number;
  goldMult: number;
  starDustMult: number;
  labels: string[];
}

/**
 * Strictly locks Zodiac Vows off during Chapter 1 FTUE and non-campaign/tower
 * special modes (Training, Boss Practice, Arena, etc.) so Fresh 702 LC and
 * early onboarding remain completely untouched.
 */
export function sanitizeZodiacVowsForRun(
  rawVows: readonly string[] | undefined | null,
  chapterId: number,
  isCampaignOrTower: boolean
): ZodiacVowId[] {
  if (!isCampaignOrTower || chapterId <= 1 || !Array.isArray(rawVows) || rawVows.length === 0) {
    return [];
  }
  const unique: ZodiacVowId[] = [];
  for (let i = 0; i < rawVows.length; i++) {
    const id = rawVows[i];
    if (VALID_ZODIAC_VOW_IDS.has(id) && !unique.includes(id as ZodiacVowId)) {
      unique.push(id as ZodiacVowId);
    }
  }
  return unique;
}

export function computeZodiacVowAggregate(
  rawVows: readonly string[] | undefined | null,
  chapterId: number,
  isCampaignOrTower: boolean
): ZodiacVowAggregate {
  const activeVows = sanitizeZodiacVowsForRun(rawVows, chapterId, isCampaignOrTower);
  let enemyHpMult = 1.0;
  let enemyDmgMult = 1.0;
  let enemyCadenceMult = 1.0;
  let healEffectivenessMult = 1.0;
  let goldBonusPct = 0;
  let starDustBonusPct = 0;
  const labels: string[] = [];

  for (let i = 0; i < activeVows.length; i++) {
    const def = ZODIAC_VOW_MAP[activeVows[i]];
    enemyHpMult *= def.enemyHpMult;
    enemyDmgMult *= def.enemyDmgMult;
    enemyCadenceMult *= def.enemyCadenceMult;
    healEffectivenessMult *= def.healEffectivenessMult;
    goldBonusPct += def.goldBonusPct;
    starDustBonusPct += def.starDustBonusPct;
    labels.push(`${def.glyph} ${def.shortLabel}`);
  }

  return {
    activeVows,
    enemyHpMult: Number(enemyHpMult.toFixed(3)),
    enemyDmgMult: Number(enemyDmgMult.toFixed(3)),
    enemyCadenceMult: Number(enemyCadenceMult.toFixed(3)),
    healEffectivenessMult: Number(healEffectivenessMult.toFixed(3)),
    goldBonusPct,
    starDustBonusPct,
    goldMult: Number((1 + goldBonusPct / 100).toFixed(3)),
    starDustMult: Number((1 + starDustBonusPct / 100).toFixed(3)),
    labels,
  };
}

// ============================================================================
// WAVE 18 PILLAR 2: TACTICAL SQUAD COMBO AI & RICOCHET RESONANCE PHYSICS
// ============================================================================

export type TacticalEnemyRole = 'vanguard' | 'flanker' | 'ranged' | 'caster';

export interface SquadComboSynergyInput {
  chapterId: number;
  role: TacticalEnemyRole;
  aliveVanguardCount: number;
  aliveCasterCount: number;
  aliveSquadCount: number;
  liteActive: boolean;
}

export interface SquadComboSynergyOut {
  vanguardCoverDamageReduction: number;
  flankerSyncSpeedMult: number;
  casterRallyCadenceMult: number;
  activeLinkLabel: string | null;
}

export function createSquadComboSynergyScratch(): SquadComboSynergyOut {
  return {
    vanguardCoverDamageReduction: 0,
    flankerSyncSpeedMult: 1.0,
    casterRallyCadenceMult: 1.0,
    activeLinkLabel: null,
  };
}

/**
 * Pure Zero-GC Tactical Squad Combo AI coordinator.
 * Mutates `out` in-place on the 60Hz loop without allocating objects or arrays.
 * Kept completely neutral on Chapter 1 to protect FTUE readability.
 */
export function evaluateSquadComboSynergy(
  input: SquadComboSynergyInput,
  out: SquadComboSynergyOut
): SquadComboSynergyOut {
  out.vanguardCoverDamageReduction = 0;
  out.flankerSyncSpeedMult = 1.0;
  out.casterRallyCadenceMult = 1.0;
  out.activeLinkLabel = null;

  if (input.chapterId <= 1 || input.aliveSquadCount <= 1) {
    return out;
  }

  if (input.aliveVanguardCount > 0 && (input.role === 'ranged' || input.role === 'caster')) {
    out.vanguardCoverDamageReduction = 0.14;
    out.activeLinkLabel = 'Che Chắn Tiên Phong';
  }

  if (input.aliveVanguardCount > 0 && input.role === 'flanker') {
    out.flankerSyncSpeedMult = 1.12;
    out.activeLinkLabel = 'Đồng Bộ Cánh';
  }

  if (input.aliveCasterCount > 0 && input.aliveSquadCount >= 2) {
    out.casterRallyCadenceMult = input.liteActive ? 0.94 : 0.9;
    if (!out.activeLinkLabel) {
      out.activeLinkLabel = 'Cộng Hưởng Đội Hình';
    }
  }

  return out;
}

/**
 * Rewards tactical wall/pillar ricochets with a capped damage multiplier:
 * 0 bounces -> 1.00x, 1 bounce -> 1.15x, 2+ bounces -> 1.30x.
 */
export function computeRicochetResonanceMult(bounceCount: number): number {
  const safeBounces = Math.max(0, Math.floor(Number.isFinite(bounceCount) ? bounceCount : 0));
  if (safeBounces <= 0) return 1.0;
  if (safeBounces === 1) return 1.15;
  return 1.3;
}

/**
 * Zero-GC duplicate-hit guard preventing a single bouncing/piercing projectile
 * from striking the same enemy twice inside a tight multi-frame overlap window.
 */
export function canRegisterProjectileEnemyHit(
  lastHitTimeSec: number | undefined,
  nowSec: number,
  cooldownSec = 0.12
): boolean {
  if (lastHitTimeSec === undefined || !Number.isFinite(lastHitTimeSec)) return true;
  return nowSec - lastHitTimeSec >= Math.max(0.02, cooldownSec);
}

// ============================================================================
// WAVE 18 PILLAR 3: 12-CHAPTER ZODIAC ARENA ATMOSPHERE BAND (0 POINTLIGHTS)
// ============================================================================

export interface ZodiacAtmospherePalette {
  chapterId: number;
  zodiacName: string;
  accentHex: number;
  secondaryHex: number;
  stoneHex: number;
}

export const ZODIAC_ATMOSPHERE_PALETTES: readonly ZodiacAtmospherePalette[] = [
  { chapterId: 1, zodiacName: 'Sư Tử', accentHex: 0xf59e0b, secondaryHex: 0xfef08a, stoneHex: 0x261d14 },
  { chapterId: 2, zodiacName: 'Bạch Dương', accentHex: 0xf97316, secondaryHex: 0xfdba74, stoneHex: 0x241210 },
  { chapterId: 3, zodiacName: 'Kim Ngưu', accentHex: 0x10b981, secondaryHex: 0x86efac, stoneHex: 0x0d261b },
  { chapterId: 4, zodiacName: 'Song Tử', accentHex: 0x38bdf8, secondaryHex: 0xbae6fd, stoneHex: 0x1e1b4b },
  { chapterId: 5, zodiacName: 'Cự Giải', accentHex: 0x60a5fa, secondaryHex: 0xbfdbfe, stoneHex: 0x0f1d33 },
  { chapterId: 6, zodiacName: 'Xử Nữ', accentHex: 0x34d399, secondaryHex: 0xa7f3d0, stoneHex: 0x1c2520 },
  { chapterId: 7, zodiacName: 'Thiên Bình', accentHex: 0xfbbf24, secondaryHex: 0xe0e7ff, stoneHex: 0x221c33 },
  { chapterId: 8, zodiacName: 'Bọ Cạp', accentHex: 0xc026d3, secondaryHex: 0xf0abfc, stoneHex: 0x210d24 },
  { chapterId: 9, zodiacName: 'Nhân Mã', accentHex: 0xfb923c, secondaryHex: 0xfed7aa, stoneHex: 0x261a14 },
  { chapterId: 10, zodiacName: 'Ma Kết', accentHex: 0x7dd3fc, secondaryHex: 0xe0f2fe, stoneHex: 0x172030 },
  { chapterId: 11, zodiacName: 'Bảo Bình', accentHex: 0x22d3ee, secondaryHex: 0xa5f3fc, stoneHex: 0x121d36 },
  { chapterId: 12, zodiacName: 'Song Ngư', accentHex: 0xa855f7, secondaryHex: 0xe9d5ff, stoneHex: 0x161436 },
] as const;

export function getZodiacAtmospherePalette(chapterId: number): ZodiacAtmospherePalette {
  const clamped = Math.max(1, Math.min(12, Math.floor(chapterId || 1)));
  return ZODIAC_ATMOSPHERE_PALETTES[clamped - 1];
}

export interface ZodiacArenaAtmosphereHandle {
  chapterId: number;
  liteActive: boolean;
  group: THREE.Group;
  celestialBandRing: THREE.Mesh;
  geometries: THREE.BufferGeometry[];
  materials: THREE.Material[];
  pointLightCount: 0;
  stoneRoughness: number;
  goldRoughness: number;
  vertexCount: number;
  disposed: boolean;
}

/**
 * Builds an outer-perimeter 12-Chapter Zodiac Atmosphere Band & 4 grounded
 * celestial boundary obelisks around the arena perimeter:
 * - Strictly 0 PointLights (E5430 safe)
 * - PBR roughness contrast 0.86 (stone) vs 0.24 (gold trim) -> delta 0.62 >= 0.25
 * - `depthWrite: false` & `polygonOffset: true` on the floor celestial band (zero Z-fighting)
 * - Lite mode halves radial segments & omits crown finials for strict vertex reduction
 */
export function buildZodiacArenaAtmosphereBand(
  chapterId: number,
  arenaHalfW: number,
  arenaHalfD: number,
  liteActive: boolean
): ZodiacArenaAtmosphereHandle {
  const palette = getZodiacAtmospherePalette(chapterId);
  const group = new THREE.Group();
  group.name = `zodiac_atmosphere_band_ch${palette.chapterId}`;

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const stoneRoughness = 0.86;
  const goldRoughness = 0.24;

  const outerRadius = Math.max(arenaHalfW, arenaHalfD) + 1.35;
  const innerRadius = Math.max(2.0, outerRadius - 0.55);
  const ringSegments = liteActive ? 24 : 48;

  const bandGeo = new THREE.RingGeometry(innerRadius, outerRadius, ringSegments);
  bandGeo.rotateX(-Math.PI / 2);
  const bandMat = new THREE.MeshBasicMaterial({
    color: palette.accentHex,
    transparent: true,
    opacity: liteActive ? 0.22 : 0.3,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
    side: THREE.DoubleSide,
  });
  geometries.push(bandGeo);
  materials.push(bandMat);

  const celestialBandRing = new THREE.Mesh(bandGeo, bandMat);
  celestialBandRing.position.set(0, 0.035, 0);
  celestialBandRing.renderOrder = 2;
  group.add(celestialBandRing);

  // 4 grounded corner celestial boundary markers outside the playable walk area
  const stoneMat = new THREE.MeshStandardMaterial({
    color: palette.stoneHex,
    roughness: stoneRoughness,
    metalness: 0.14,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: palette.accentHex,
    emissive: palette.accentHex,
    emissiveIntensity: 0.25,
    roughness: goldRoughness,
    metalness: 0.82,
  });
  const shadowDiscMat = new THREE.MeshBasicMaterial({
    color: 0x05070d,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  materials.push(stoneMat, trimMat, shadowDiscMat);

  const pillarSegments = liteActive ? 6 : 12;
  const plinthGeo = new THREE.CylinderGeometry(0.42, 0.56, 0.72, pillarSegments);
  plinthGeo.translate(0, 0.36, 0); // bottom-center pivot flush on ground
  const bandRingGeo = new THREE.TorusGeometry(0.36, 0.055, liteActive ? 4 : 8, pillarSegments);
  bandRingGeo.rotateX(Math.PI / 2);
  const shadowGeo = new THREE.CircleGeometry(0.72, pillarSegments);
  shadowGeo.rotateX(-Math.PI / 2);
  geometries.push(plinthGeo, bandRingGeo, shadowGeo);

  let finialGeo: THREE.BufferGeometry | null = null;
  if (!liteActive) {
    finialGeo = new THREE.OctahedronGeometry(0.24, 0);
    geometries.push(finialGeo);
  }

  const cornerX = arenaHalfW + 1.55;
  const cornerZ = arenaHalfD + 1.15;
  const corners: readonly [number, number][] = [
    [-cornerX, -cornerZ],
    [cornerX, -cornerZ],
    [-cornerX, cornerZ],
    [cornerX, cornerZ],
  ];

  for (let i = 0; i < corners.length; i++) {
    const [cx, cz] = corners[i];
    const cornerGroup = new THREE.Group();
    cornerGroup.position.set(cx, 0, cz);

    const shadowMesh = new THREE.Mesh(shadowGeo, shadowDiscMat);
    shadowMesh.position.y = 0.02;
    cornerGroup.add(shadowMesh);

    const plinth = new THREE.Mesh(plinthGeo, stoneMat);
    cornerGroup.add(plinth);

    const trim = new THREE.Mesh(bandRingGeo, trimMat);
    trim.position.y = 0.74;
    cornerGroup.add(trim);

    if (finialGeo) {
      const finial = new THREE.Mesh(finialGeo, trimMat);
      finial.position.y = 1.08;
      cornerGroup.add(finial);
    }

    group.add(cornerGroup);
  }

  let vertexCount = 0;
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh && mesh.geometry) {
      const pos = mesh.geometry.getAttribute('position');
      if (pos) vertexCount += pos.count;
    }
  });

  return {
    chapterId: palette.chapterId,
    liteActive,
    group,
    celestialBandRing,
    geometries,
    materials,
    pointLightCount: 0,
    stoneRoughness,
    goldRoughness,
    vertexCount,
    disposed: false,
  };
}

/**
 * Zero-GC per-frame rotation for the outer celestial atmosphere band.
 */
export function stepZodiacArenaAtmosphereBand(
  handle: ZodiacArenaAtmosphereHandle | null | undefined,
  dt: number,
  reducedMotion: boolean
): void {
  if (!handle || handle.disposed) return;
  const safeDt = Math.max(0, Math.min(0.1, Number.isFinite(dt) ? dt : 0));
  const speedScale = reducedMotion ? 0.25 : 1.0;
  handle.celestialBandRing.rotation.y += safeDt * 0.09 * speedScale;
}

export function disposeZodiacArenaAtmosphereBand(
  handle: ZodiacArenaAtmosphereHandle | null | undefined,
  parentScene?: THREE.Scene | null
): void {
  if (!handle || handle.disposed) return;
  if (parentScene && handle.group.parent === parentScene) {
    parentScene.remove(handle.group);
  } else if (handle.group.parent) {
    handle.group.parent.remove(handle.group);
  }
  for (let i = 0; i < handle.geometries.length; i++) {
    handle.geometries[i].dispose();
  }
  for (let i = 0; i < handle.materials.length; i++) {
    handle.materials[i].dispose();
  }
  handle.disposed = true;
}

// ============================================================================
// WAVE 18 PILLAR 5: 1-CLICK ACCESSIBILITY PRESETS (Criteria 20 & 27)
// ============================================================================

export interface AccessibilityPresetDefinition {
  id: AccessibilityPresetId;
  label: string;
  summary: string;
  patch: Partial<GameSettings>;
}

export const ACCESSIBILITY_PRESETS: readonly AccessibilityPresetDefinition[] = [
  {
    id: 'standard',
    label: 'Tiêu Chuẩn',
    summary: 'Màu chuẩn, cỡ chữ 100%, hiệu ứng đầy đủ',
    patch: {
      colorblindTelegraphs: false,
      highContrastTelegraphs: false,
      reduceScreenFlash: false,
      reducedMotion: false,
      screenShake: true,
      uiTextScale: 'normal',
      audioCaptions: false,
    },
  },
  {
    id: 'colorblind',
    label: 'Hỗ Trợ Mù Màu',
    summary: 'Bảng màu Lam/Cam tương phản cao + ký hiệu hình học',
    patch: {
      colorblindTelegraphs: true,
      highContrastTelegraphs: true,
    },
  },
  {
    id: 'comfort_antiflash',
    label: 'Dịu Mắt & Chống Chớp',
    summary: 'Giảm 75% chớp sáng, giảm chuyển động & tắt rung camera',
    patch: {
      reduceScreenFlash: true,
      reducedMotion: true,
      screenShake: false,
    },
  },
  {
    id: 'large_captions',
    label: 'Chữ Lớn & Khiếm Thính',
    summary: 'Cỡ chữ 130%, bật Phụ Đề Âm Thanh & viền tương phản cao',
    patch: {
      uiTextScale: 'xlarge',
      audioCaptions: true,
      highContrastTelegraphs: true,
    },
  },
] as const;

export function applyAccessibilityPreset(
  current: GameSettings,
  presetId: AccessibilityPresetId
): GameSettings {
  const found = ACCESSIBILITY_PRESETS.find((p) => p.id === presetId);
  if (!found) return { ...current };
  return {
    ...current,
    ...found.patch,
  };
}

export function detectActiveAccessibilityPreset(
  settings: GameSettings
): AccessibilityPresetId | 'custom' {
  if (
    !settings.colorblindTelegraphs &&
    !settings.highContrastTelegraphs &&
    !settings.reduceScreenFlash &&
    !settings.reducedMotion &&
    settings.screenShake &&
    (settings.uiTextScale ?? 'normal') === 'normal' &&
    !settings.audioCaptions
  ) {
    return 'standard';
  }
  if (settings.uiTextScale === 'xlarge' && settings.audioCaptions && settings.highContrastTelegraphs) {
    return 'large_captions';
  }
  if (settings.reduceScreenFlash && settings.reducedMotion && !settings.screenShake) {
    return 'comfort_antiflash';
  }
  if (settings.colorblindTelegraphs && settings.highContrastTelegraphs) {
    return 'colorblind';
  }
  return 'custom';
}

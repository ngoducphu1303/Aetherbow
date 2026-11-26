import { getGlbAssetUrl } from './glbAssetUrl';
import {
  DEFAULT_GLB_HIGH_IDLE_TIMEOUT_MS,
  DEFAULT_GLB_LITE_IDLE_TIMEOUT_MS,
  fetchGlbWithIdleTimeout,
} from './glbFetchResilience';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { EnemyKind } from '../types/game';
import {
  AUTO_RIG_CALIBRATION,
  type AutoRigArchetype,
  AutoRigInstance,
  instantiateAutoRigModel,
  prepareAutoRigTemplate,
  PreparedAutoRigTemplate,
} from './aaaAutoRigSystem';

export type Chapter1RosterAssetId =
  | 'fire_lion'
  | 'stone_guardian'
  | 'flame_spirit'
  | 'sun_spearman'
  | 'winged_solar_lion';

export type Chapter2RosterAssetId =
  | 'magma-ram' | 'obsidian-golem' | 'crimson-spirit' | 'aries-berserker' | 'cinderhorn' | 'kratos-aries';

export type Chapter3RosterAssetId =
  | 'nguu-ngoc-xung-kich'
  | 've-binh-ngoc-luc-bao'
  | 'linh-hon-luc-bao'
  | 'chien-binh-kich-luc-bao'
  | 'ngoc-nguu-duc-thu'
  | 'dia-than-kim-nguu';

export type Chapter4RosterAssetId =
  | 'linh-mieu-ung-gio'
  | 've-binh-guong-song-sinh'
  | 'linh-hon-mat-na-song-sinh'
  | 'chien-binh-song-dao-phong-anh'
  | 'song-thu-canh-gio'
  | 'than-vuong-song-tu';

export type CampaignRosterAssetId =
  | Chapter1RosterAssetId
  | Chapter2RosterAssetId
  | Chapter3RosterAssetId
  | Chapter4RosterAssetId;

export type Chapter1RosterVariant = 'high' | 'lite';

export type Chapter1RosterBurstType = 'none' | 'lunge' | 'slam' | 'cast' | 'roar';

export interface Chapter1RosterSpec {
  id: CampaignRosterAssetId;
  displayName: string;
  roleLabel: string;
  isSubBoss: boolean;
  enemyKinds: readonly EnemyKind[];
  highPathSegments: readonly string[];
  litePathSegments: readonly string[];
  targetHeight: number;
  hoverOffsetY: number;
  facingYawOffset: number;
  maxLiteBytes: number;
}

export const CHAPTER1_ROSTER_ASSET_VERSION = '1';

export const CHAPTER1_ROSTER_SPECS: Record<Chapter1RosterAssetId, Chapter1RosterSpec> = {
  fire_lion: {
    id: 'fire_lion',
    displayName: 'Sư Tử Lửa Đền Thờ',
    roleLabel: 'Cận chiến tốc độ cao',
    isSubBoss: false,
    enemyKinds: [EnemyKind.SKIRMISHER],
    highPathSegments: ['assets', 'Chương 1', 'Quái mới', '1. Sư Tử Lửa Đền Thờ High.glb'],
    litePathSegments: ['assets', 'Chương 1', 'Quái mới', '1. Sư Tử Lửa Đền Thờ Lite.glb'],
    targetHeight: 1.55,
    hoverOffsetY: 0,
    facingYawOffset: AUTO_RIG_CALIBRATION.fire_lion.facingYawOffset,
    maxLiteBytes: 520_000,
  },
  stone_guardian: {
    id: 'stone_guardian',
    displayName: 'Vệ Binh Đá Mặt Trời',
    roleLabel: 'Tank giáp nặng',
    isSubBoss: false,
    enemyKinds: [EnemyKind.GOLEM],
    highPathSegments: ['assets', 'Chương 1', 'Quái mới', '2. Vệ Binh Đá Mặt Trời High.glb'],
    litePathSegments: ['assets', 'Chương 1', 'Quái mới', '2. Vệ Binh Đá Mặt Trời Lite.glb'],
    targetHeight: 2.25,
    hoverOffsetY: 0,
    facingYawOffset: AUTO_RIG_CALIBRATION.stone_guardian.facingYawOffset,
    maxLiteBytes: 520_000,
  },
  flame_spirit: {
    id: 'flame_spirit',
    displayName: 'Linh Hồn Lửa Hoàng Đạo',
    roleLabel: 'Pháp sư tầm xa',
    isSubBoss: false,
    enemyKinds: [EnemyKind.IMP_ARCHER],
    highPathSegments: ['assets', 'Chương 1', 'Quái mới', '3. Linh Hồn Lửa Hoàng Đạo High.glb'],
    litePathSegments: ['assets', 'Chương 1', 'Quái mới', '3. Linh Hồn Lửa Hoàng Đạo Lite.glb'],
    targetHeight: 1.75,
    hoverOffsetY: 0.26,
    facingYawOffset: AUTO_RIG_CALIBRATION.flame_spirit.facingYawOffset,
    maxLiteBytes: 520_000,
  },
  sun_spearman: {
    id: 'sun_spearman',
    displayName: 'Chiến Binh Thương Ánh Dương',
    roleLabel: 'Lính gác tầm trung',
    isSubBoss: false,
    enemyKinds: [EnemyKind.DRAGON_WHELP],
    highPathSegments: ['assets', 'Chương 1', 'Quái mới', '4. Chiến Binh Thương Ánh Dương High.glb'],
    litePathSegments: ['assets', 'Chương 1', 'Quái mới', '4. Chiến Binh Thương Ánh Dương Lite.glb'],
    targetHeight: 1.85,
    hoverOffsetY: 0,
    facingYawOffset: AUTO_RIG_CALIBRATION.sun_spearman.facingYawOffset,
    maxLiteBytes: 520_000,
  },
  winged_solar_lion: {
    id: 'winged_solar_lion',
    displayName: 'Sư Tử Cánh Ánh Dương',
    roleLabel: 'Boss Phụ Chương 1',
    isSubBoss: true,
    enemyKinds: [EnemyKind.WARDEN_BOSS, EnemyKind.TITAN_BOSS],
    highPathSegments: ['assets', 'Chương 1', 'Boss phụ mới', '1. Sư Tử Cánh Ánh Dương High.glb'],
    litePathSegments: ['assets', 'Chương 1', 'Boss phụ mới', '1. Sư Tử Cánh Ánh Dương Lite.glb'],
    targetHeight: 2.65,
    hoverOffsetY: 0.08,
    facingYawOffset: AUTO_RIG_CALIBRATION.winged_solar_lion.facingYawOffset,
    maxLiteBytes: 900_000,
  },
};

export const CHAPTER1_ROSTER_ASSET_IDS: readonly Chapter1RosterAssetId[] = [
  'fire_lion',
  'stone_guardian',
  'flame_spirit',
  'sun_spearman',
  'winged_solar_lion',
];

const CHAPTER2_ROSTER_RIGS = {
  'magma-ram': 'fire_lion',
  'obsidian-golem': 'stone_guardian',
  'crimson-spirit': 'flame_spirit',
  'aries-berserker': 'sun_spearman',
  cinderhorn: 'winged_solar_lion',
  'kratos-aries': 'stone_guardian',
} as const satisfies Record<Chapter2RosterAssetId, AutoRigArchetype>;

const CHAPTER2_ROSTER_DEFINITIONS = {
  // Source sculpt runs tail(-X) -> horned head(+X); -PI/2 aligns nose to +Z and matches fire_lion AutoRig spine/legs.
  'magma-ram': ['Dương Hỏa Dung Nham', EnemyKind.SKIRMISHER, 1.60, 0, -Math.PI / 2],
  'obsidian-golem': ['Golem Hắc Diện', EnemyKind.GOLEM, 2.25, 0, 0],
  'crimson-spirit': ['Hỏa Linh Xích Hỏa', EnemyKind.IMP_ARCHER, 1.75, 0.24, 0],
  'aries-berserker': ['Cuồng Chiến Bạch Dương', EnemyKind.DRAGON_WHELP, 1.90, 0, 0],
  cinderhorn: ['Cinderhorn', EnemyKind.WARDEN_BOSS, 2.70, 0.04, 0],
  'kratos-aries': ['Kratos-Aries', EnemyKind.ZODIAC_BOSS, 3.25, 0, 0],
} as const;

export const CHAPTER2_ROSTER_ASSET_IDS = Object.keys(CHAPTER2_ROSTER_DEFINITIONS) as Chapter2RosterAssetId[];

const CHAPTER3_ROSTER_RIGS = {
  'nguu-ngoc-xung-kich': 'fire_lion',
  've-binh-ngoc-luc-bao': 'stone_guardian',
  'linh-hon-luc-bao': 'flame_spirit',
  'chien-binh-kich-luc-bao': 'sun_spearman',
  'ngoc-nguu-duc-thu': 'winged_solar_lion',
  'dia-than-kim-nguu': 'stone_guardian',
} as const satisfies Record<Chapter3RosterAssetId, AutoRigArchetype>;

const CHAPTER3_ROSTER_DEFINITIONS = {
  'nguu-ngoc-xung-kich': ['Ngưu Ngọc Xung Kích', EnemyKind.SKIRMISHER, 1.62, 0, 0],
  've-binh-ngoc-luc-bao': ['Vệ Binh Ngọc Lục Bảo', EnemyKind.GOLEM, 2.28, 0, 0],
  'linh-hon-luc-bao': ['Linh Hồn Lục Bảo', EnemyKind.IMP_ARCHER, 1.78, 0.24, 0],
  'chien-binh-kich-luc-bao': ['Chiến Binh Kích Lục Bảo', EnemyKind.DRAGON_WHELP, 1.92, 0, 0],
  // Winged bull source sculpt faces +45° diagonal; -PI/4 aligns nose cleanly to +Z forward.
  'ngoc-nguu-duc-thu': ['Ngọc Ngưu Dực Thú', EnemyKind.WARDEN_BOSS, 2.75, 0.06, -Math.PI / 4],
  'dia-than-kim-nguu': ['Địa Thần Kim Ngưu', EnemyKind.ZODIAC_BOSS, 3.3, 0, 0],
} as const;

export const CHAPTER3_ROSTER_ASSET_IDS = Object.keys(CHAPTER3_ROSTER_DEFINITIONS) as Chapter3RosterAssetId[];

const CHAPTER4_ROSTER_RIGS = {
  'linh-mieu-ung-gio': 'fire_lion',
  've-binh-guong-song-sinh': 'stone_guardian',
  'linh-hon-mat-na-song-sinh': 'flame_spirit',
  'chien-binh-song-dao-phong-anh': 'sun_spearman',
  'song-thu-canh-gio': 'winged_solar_lion',
  'than-vuong-song-tu': 'stone_guardian',
} as const satisfies Record<Chapter4RosterAssetId, AutoRigArchetype>;

const CHAPTER4_ROSTER_DEFINITIONS = {
  // Source sculpt runs tail(-X) -> head(+X); -PI/2 aligns nose to +Z and matches fire_lion AutoRig spine/legs.
  'linh-mieu-ung-gio': ['Linh Miêu Ưng Gió', EnemyKind.SKIRMISHER, 1.62, 0, -Math.PI / 2],
  've-binh-guong-song-sinh': ['Vệ Binh Gương Song Sinh', EnemyKind.GOLEM, 2.28, 0, 0],
  'linh-hon-mat-na-song-sinh': ['Linh Hồn Mặt Nạ Song Sinh', EnemyKind.IMP_ARCHER, 1.80, 0.26, 0],
  'chien-binh-song-dao-phong-anh': ['Chiến Binh Song Đao Phong Ảnh', EnemyKind.DRAGON_WHELP, 1.92, 0, 0],
  'song-thu-canh-gio': ['Song Thú Cánh Gió', EnemyKind.WARDEN_BOSS, 2.76, 0.08, 0],
  'than-vuong-song-tu': ['Thần Vương Song Tử', EnemyKind.ZODIAC_BOSS, 3.35, 0, 0],
} as const;

export const CHAPTER4_ROSTER_ASSET_IDS = Object.keys(CHAPTER4_ROSTER_DEFINITIONS) as Chapter4RosterAssetId[];

export function getCampaignRosterArchetype(id: CampaignRosterAssetId): AutoRigArchetype {
  return (
    CHAPTER2_ROSTER_RIGS[id as Chapter2RosterAssetId] ??
    CHAPTER3_ROSTER_RIGS[id as Chapter3RosterAssetId] ??
    CHAPTER4_ROSTER_RIGS[id as Chapter4RosterAssetId] ??
    (id as Chapter1RosterAssetId)
  );
}

export interface CampaignRosterVisualTheme {
  readonly chapterId: 1 | 2 | 3 | 4;
  readonly archetype: AutoRigArchetype;
  readonly isFloatingSpirit: boolean;
  readonly isWingedSubBoss: boolean;
  readonly trailColorHex: number;
  readonly trailAccentHex: number;
  readonly dustHex: number;
  readonly titanTintHex: number;
}

const ARCHETYPE_ROLE_LABELS: Record<AutoRigArchetype, string> = {
  fire_lion: 'Cận chiến tốc độ cao',
  stone_guardian: 'Tank giáp nặng',
  flame_spirit: 'Pháp sư tầm xa',
  sun_spearman: 'Chiến binh xung kích',
  winged_solar_lion: 'Boss Phụ Hoàng Đạo',
  solar_lion_boss: 'Boss Chương Hoàng Đạo',
};

export function resolveCampaignRosterVisualTheme(
  id: CampaignRosterAssetId
): CampaignRosterVisualTheme {
  const archetype = getCampaignRosterArchetype(id);
  const isFloatingSpirit = archetype === 'flame_spirit';
  const isWingedSubBoss = archetype === 'winged_solar_lion';

  if (id in CHAPTER2_ROSTER_DEFINITIONS) {
    const trailColorHex =
      archetype === 'fire_lion'
        ? 0xef4444
        : archetype === 'stone_guardian'
        ? 0xf43f5e
        : archetype === 'flame_spirit'
        ? 0xfb7185
        : archetype === 'sun_spearman'
        ? 0xf97316
        : 0xf43f5e;
    return {
      chapterId: 2,
      archetype,
      isFloatingSpirit,
      isWingedSubBoss,
      trailColorHex,
      trailAccentHex: 0xfde047,
      dustHex: isWingedSubBoss || id === 'kratos-aries' ? 0xf97316 : 0xb45309,
      titanTintHex: 0x7f1d1d,
    };
  }

  if (id in CHAPTER3_ROSTER_DEFINITIONS) {
    const trailColorHex =
      archetype === 'fire_lion'
        ? 0x10b981
        : archetype === 'stone_guardian'
        ? 0x059669
        : archetype === 'flame_spirit'
        ? 0x34d399
        : archetype === 'sun_spearman'
        ? 0x6ee7b7
        : 0x10b981;
    return {
      chapterId: 3,
      archetype,
      isFloatingSpirit,
      isWingedSubBoss,
      trailColorHex,
      trailAccentHex: 0xfbbf24,
      dustHex: isWingedSubBoss || id === 'dia-than-kim-nguu' ? 0x34d399 : 0x6ee7b7,
      titanTintHex: 0x065f46,
    };
  }

  if (id in CHAPTER4_ROSTER_DEFINITIONS) {
    const trailColorHex =
      archetype === 'fire_lion'
        ? 0x38bdf8
        : archetype === 'stone_guardian'
        ? 0x818cf8
        : archetype === 'flame_spirit'
        ? 0xa78bfa
        : archetype === 'sun_spearman'
        ? 0x67e8f9
        : 0x38bdf8;
    return {
      chapterId: 4,
      archetype,
      isFloatingSpirit,
      isWingedSubBoss,
      trailColorHex,
      trailAccentHex: 0xc4b5fd,
      dustHex: isWingedSubBoss || id === 'than-vuong-song-tu' ? 0x38bdf8 : 0xa78bfa,
      titanTintHex: 0x312e81,
    };
  }

  const cal = AUTO_RIG_CALIBRATION[archetype];
  return {
    chapterId: 1,
    archetype,
    isFloatingSpirit,
    isWingedSubBoss,
    trailColorHex: cal.trailColorHex,
    trailAccentHex: cal.trailAccentHex,
    dustHex: isWingedSubBoss ? 0xfbbf24 : 0xa8a29e,
    titanTintHex: 0x7c2d12,
  };
}

export function getCampaignRosterSpec(id: CampaignRosterAssetId): Chapter1RosterSpec {
  const aries = CHAPTER2_ROSTER_DEFINITIONS[id as Chapter2RosterAssetId];
  if (aries) {
    const [displayName, kind, targetHeight, hoverOffsetY, facingYawOffset] = aries;
    const roleLabel =
      id === 'kratos-aries'
        ? 'Boss Chương 2'
        : id === 'cinderhorn'
        ? 'Boss Phụ Chương 2'
        : ARCHETYPE_ROLE_LABELS[CHAPTER2_ROSTER_RIGS[id as Chapter2RosterAssetId]];
    return {
      id,
      displayName,
      roleLabel,
      isSubBoss: id === 'cinderhorn',
      enemyKinds: id === 'cinderhorn' ? [kind, EnemyKind.TITAN_BOSS] : [kind],
      highPathSegments: ['assets', 'Chương 2', 'Runtime', `${id}-high.glb`],
      litePathSegments: ['assets', 'Chương 2', 'Runtime', `${id}-lite.glb`],
      targetHeight,
      hoverOffsetY,
      facingYawOffset,
      maxLiteBytes: 1_000_000,
    };
  }

  const taurus = CHAPTER3_ROSTER_DEFINITIONS[id as Chapter3RosterAssetId];
  if (taurus) {
    const [displayName, kind, targetHeight, hoverOffsetY, facingYawOffset] = taurus;
    const roleLabel =
      id === 'dia-than-kim-nguu'
        ? 'Boss Chương 3'
        : id === 'ngoc-nguu-duc-thu'
        ? 'Boss Phụ Chương 3'
        : ARCHETYPE_ROLE_LABELS[CHAPTER3_ROSTER_RIGS[id as Chapter3RosterAssetId]];
    return {
      id,
      displayName,
      roleLabel,
      isSubBoss: id === 'ngoc-nguu-duc-thu',
      enemyKinds: id === 'ngoc-nguu-duc-thu' ? [kind, EnemyKind.TITAN_BOSS] : [kind],
      highPathSegments: ['assets', 'Chương 3', 'Runtime', `${id}-high.glb`],
      litePathSegments: ['assets', 'Chương 3', 'Runtime', `${id}-lite.glb`],
      targetHeight,
      hoverOffsetY,
      facingYawOffset,
      maxLiteBytes: 1_000_000,
    };
  }

  const gemini = CHAPTER4_ROSTER_DEFINITIONS[id as Chapter4RosterAssetId];
  if (gemini) {
    const [displayName, kind, targetHeight, hoverOffsetY, facingYawOffset] = gemini;
    const roleLabel =
      id === 'than-vuong-song-tu'
        ? 'Boss Chương 4'
        : id === 'song-thu-canh-gio'
        ? 'Boss Phụ Chương 4'
        : ARCHETYPE_ROLE_LABELS[CHAPTER4_ROSTER_RIGS[id as Chapter4RosterAssetId]];
    return {
      id,
      displayName,
      roleLabel,
      isSubBoss: id === 'song-thu-canh-gio',
      enemyKinds: id === 'song-thu-canh-gio' ? [kind, EnemyKind.TITAN_BOSS] : [kind],
      highPathSegments: ['assets', 'Chương 4', 'Runtime', `${id}-high.glb`],
      litePathSegments: ['assets', 'Chương 4', 'Runtime', `${id}-lite.glb`],
      targetHeight,
      hoverOffsetY,
      facingYawOffset,
      maxLiteBytes: 1_000_000,
    };
  }

  return CHAPTER1_ROSTER_SPECS[id as Chapter1RosterAssetId];
}

export interface Chapter1RosterEncounterContext {
  chapterId: number;
  enemyKind: EnemyKind;
  isSideModeActive?: boolean;
  isTrainingDummy?: boolean;
  isArenaRival?: boolean;
}

/**
 * Maps Chapter 1 campaign regular mobs and both sub-boss milestones (Stage 4 Warden & Stage 8 Titan)
 * to their dedicated Solar Temple 3D models. Leaves Chapters 2–12 and side modes untouched.
 */
export function resolveChapter1RosterAssetId(
  ctx: Chapter1RosterEncounterContext
): Chapter1RosterAssetId | null {
  if (ctx.chapterId !== 1) return null;
  if (ctx.isSideModeActive || ctx.isTrainingDummy || ctx.isArenaRival) return null;

  switch (ctx.enemyKind) {
    case EnemyKind.SKIRMISHER:
      return 'fire_lion';
    case EnemyKind.GOLEM:
      return 'stone_guardian';
    case EnemyKind.IMP_ARCHER:
      return 'flame_spirit';
    case EnemyKind.DRAGON_WHELP:
      return 'sun_spearman';
    case EnemyKind.WARDEN_BOSS:
    case EnemyKind.TITAN_BOSS:
      return 'winged_solar_lion';
    default:
      return null;
  }
}

export function resolveCampaignRosterAssetId(ctx: Chapter1RosterEncounterContext): CampaignRosterAssetId | null {
  if (ctx.isSideModeActive || ctx.isTrainingDummy || ctx.isArenaRival) return null;
  if (ctx.chapterId === 2) {
    return CHAPTER2_ROSTER_ASSET_IDS.find((id) => getCampaignRosterSpec(id).enemyKinds.includes(ctx.enemyKind)) ?? null;
  }
  if (ctx.chapterId === 3) {
    return CHAPTER3_ROSTER_ASSET_IDS.find((id) => getCampaignRosterSpec(id).enemyKinds.includes(ctx.enemyKind)) ?? null;
  }
  if (ctx.chapterId === 4) {
    return CHAPTER4_ROSTER_ASSET_IDS.find((id) => getCampaignRosterSpec(id).enemyKinds.includes(ctx.enemyKind)) ?? null;
  }
  return resolveChapter1RosterAssetId(ctx);
}

export function getChapter1RosterAssetUrl(
  assetId: CampaignRosterAssetId,
  variant: Chapter1RosterVariant,
  baseUrl = '/',
  baseUri = 'http://localhost:3000/'
): URL {
  const spec = getCampaignRosterSpec(assetId);
  const segments = variant === 'lite' ? spec.litePathSegments : spec.highPathSegments;
  return getGlbAssetUrl(segments, CHAPTER1_ROSTER_ASSET_VERSION, baseUrl, baseUri);
}

function validateGlbBuffer(data: ArrayBuffer, label: string): void {
  const header = new DataView(data);
  if (
    data.byteLength < 20 ||
    header.getUint32(0, true) !== 0x46546c67 ||
    header.getUint32(4, true) !== 2 ||
    header.getUint32(8, true) !== data.byteLength
  ) {
    throw new Error(`Tệp GLB ${label} không hợp lệ.`);
  }
}

export interface DownloadChapter1RosterOptions {
  baseUrl?: string;
  baseUri?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
  idleTimeoutMs?: number;
}

const downloadCache = new Map<string, Promise<ArrayBuffer>>();

function cacheKey(assetId: CampaignRosterAssetId, variant: Chapter1RosterVariant): string {
  return `${assetId}:${variant}`;
}

export function clearChapter1RosterDownloadCache(): void {
  downloadCache.clear();
}

async function fetchRosterVariantBytes(
  assetId: CampaignRosterAssetId,
  variant: Chapter1RosterVariant,
  options: DownloadChapter1RosterOptions
): Promise<ArrayBuffer> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? '/';
  const baseUri =
    options.baseUri ?? (typeof document !== 'undefined' ? document.baseURI : 'http://localhost:3000/');
  const url = getChapter1RosterAssetUrl(assetId, variant, baseUrl, baseUri);
  const idleTimeoutMs =
    options.idleTimeoutMs ??
    (variant === 'high' ? DEFAULT_GLB_HIGH_IDLE_TIMEOUT_MS : DEFAULT_GLB_LITE_IDLE_TIMEOUT_MS);
  const fetchAndValidate = async (targetUrl: URL): Promise<ArrayBuffer> => {
    const buf = await fetchGlbWithIdleTimeout({
      url: targetUrl,
      fetchImpl,
      signal: options.signal,
      idleTimeoutMs,
      assetLabel: `${assetId} (${variant})`,
    });
    validateGlbBuffer(buf, `${assetId}:${variant}`);
    return buf;
  };

  try {
    return await fetchAndValidate(url);
  } catch (error) {
    if (
      options.signal?.aborted ||
      (!(assetId in CHAPTER3_ROSTER_DEFINITIONS) && !(assetId in CHAPTER4_ROSTER_DEFINITIONS))
    ) {
      throw error;
    }
    const spec = getCampaignRosterSpec(assetId);
    const segments = variant === 'lite' ? spec.litePathSegments : spec.highPathSegments;
    const localBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    const localUrl = new URL(segments.map(encodeURIComponent).join('/'), new URL(localBase, baseUri));
    localUrl.searchParams.set('v', CHAPTER1_ROSTER_ASSET_VERSION);
    if (localUrl.href === url.href) throw error;
    return await fetchAndValidate(localUrl);
  }
}

/**
 * Downloads and caches the compressed GLB bytes. If 'high' fails, automatically falls back to 'lite'.
 */
export function downloadChapter1RosterArrayBuffer(
  assetId: CampaignRosterAssetId,
  variant: Chapter1RosterVariant,
  options: DownloadChapter1RosterOptions = {}
): Promise<ArrayBuffer> {
  const key = cacheKey(assetId, variant);
  const existing = downloadCache.get(key);
  if (existing) return existing;

  const task = (async () => {
    try {
      return await fetchRosterVariantBytes(assetId, variant, options);
    } catch (error) {
      if (variant === 'high' && !options.signal?.aborted) {
        return await fetchRosterVariantBytes(assetId, 'lite', options);
      }
      throw error;
    }
  })().catch((err) => {
    downloadCache.delete(key);
    throw err;
  });

  downloadCache.set(key, task);
  return task;
}

export interface PreparedChapter1RosterTemplate {
  assetId: CampaignRosterAssetId;
  variant: Chapter1RosterVariant;
  root: THREE.Group;
  rigTemplate: PreparedAutoRigTemplate;
  scale: number;
  bounds: THREE.Box3;
  sharedGeometries: Set<THREE.BufferGeometry>;
  sharedTextures: Set<THREE.Texture>;
}

export interface InstantiatedChapter1RosterModel {
  assetId: CampaignRosterAssetId;
  group: THREE.Group;
  rigInstance: AutoRigInstance;
  hitMeshes: THREE.Mesh[];
  bounds: THREE.Box3;
}

/**
 * Calibrates facing orientation (+Z), grounds feet flush at y = 0 (+ hoverOffsetY for floating spirits),
 * auto-rigs real GPU SkinnedMesh 4-bone capsule weights, and flags all BufferGeometries & Textures
 * as shared cached resources so multiple enemy instances share GPU memory cleanly on Dell E5430.
 */
export function prepareChapter1RosterTemplate(
  assetId: CampaignRosterAssetId,
  gltfScene: THREE.Object3D,
  maxAnisotropy = 4,
  options?: { liteMode?: boolean; facingYawOffset?: number }
): PreparedChapter1RosterTemplate {
  const spec = getCampaignRosterSpec(assetId);
  const liteMode = Boolean(options?.liteMode);
  const variant: Chapter1RosterVariant = liteMode ? 'lite' : 'high';

  const rigTemplate = prepareAutoRigTemplate(getCampaignRosterArchetype(assetId), gltfScene, maxAnisotropy, {
    liteMode,
    facingYawOffset: options?.facingYawOffset ?? spec.facingYawOffset,
    targetHeight: spec.targetHeight,
    hoverOffsetY: spec.hoverOffsetY,
  });

  // Dispose raw unbaked geometries from the temporary parsed GLTF scene (textures are retained by rigTemplate)
  gltfScene.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry && !rigTemplate.sharedGeometries.has(obj.geometry)) {
      obj.geometry.dispose();
    }
  });

  const root = new THREE.Group();
  root.name = `Ch1RosterTemplate_${assetId}_${variant}`;
  const rawHeight = Math.max(0.001, rigTemplate.size.y);
  const scale = spec.targetHeight / rawHeight;

  return {
    assetId,
    variant,
    root,
    rigTemplate,
    scale,
    bounds: rigTemplate.bounds.clone(),
    sharedGeometries: rigTemplate.sharedGeometries,
    sharedTextures: rigTemplate.sharedTextures,
  };
}

/**
 * Instantiates a combat-ready SkinnedMesh rig from a cached template.
 * Shares BufferGeometry (including skinIndex/skinWeight) & GPU Textures across all enemies of the same type;
 * gives each instance its own lightweight 10-14 Bone Skeleton, cloned Material for hit-flash, and Bone Anchors.
 */
export function instantiateChapter1RosterModel(
  template: PreparedChapter1RosterTemplate,
  options?: {
    heightMultiplier?: number;
    emissiveTintHex?: number;
    emissiveIntensity?: number;
  }
): InstantiatedChapter1RosterModel {
  const rigInstance = instantiateAutoRigModel(template.rigTemplate, options);
  rigInstance.group.name = `Ch1RosterInstance_${template.assetId}`;

  return {
    assetId: template.assetId,
    group: rigInstance.group,
    rigInstance,
    hitMeshes: rigInstance.skinnedMeshes,
    bounds: rigInstance.bounds,
  };
}

const parsedTemplateCache = new Map<string, Promise<PreparedChapter1RosterTemplate>>();
const resolvedTemplates = new Map<string, PreparedChapter1RosterTemplate>();

export function getCachedChapter1RosterTemplateSync(
  assetId: CampaignRosterAssetId,
  variant: Chapter1RosterVariant
): PreparedChapter1RosterTemplate | null {
  return resolvedTemplates.get(cacheKey(assetId, variant)) ?? null;
}

export function loadChapter1RosterTemplate(
  assetId: CampaignRosterAssetId,
  variant: Chapter1RosterVariant,
  maxAnisotropy: number,
  options: DownloadChapter1RosterOptions = {}
): Promise<PreparedChapter1RosterTemplate> {
  const key = cacheKey(assetId, variant);
  const existing = parsedTemplateCache.get(key);
  if (existing) return existing;

  const task = (async () => {
    const baseUrl = options.baseUrl ?? '/';
    const baseUri =
      options.baseUri ?? (typeof document !== 'undefined' ? document.baseURI : 'http://localhost:3000/');
    const assetUrl = getChapter1RosterAssetUrl(assetId, variant, baseUrl, baseUri);
    const bytes = await downloadChapter1RosterArrayBuffer(assetId, variant, options);
    const gltf = await new GLTFLoader().parseAsync(bytes, new URL('.', assetUrl).href);
    const prepared = prepareChapter1RosterTemplate(assetId, gltf.scene, maxAnisotropy, {
      liteMode: variant === 'lite',
    });
    resolvedTemplates.set(key, prepared);
    return prepared;
  })().catch((err) => {
    parsedTemplateCache.delete(key);
    throw err;
  });

  parsedTemplateCache.set(key, task);
  return task;
}

/**
 * Releases all cached shared geometries, textures, and template materials on full engine teardown.
 */
export function disposeChapter1RosterTemplateCache(): void {
  for (const tpl of resolvedTemplates.values()) {
    tpl.sharedGeometries.forEach((geo) => {
      if (geo.userData) delete geo.userData.sharedCachedGeometry;
      geo.dispose();
    });
    tpl.sharedTextures.forEach((tex) => {
      if (tex.userData) delete tex.userData.sharedCachedTexture;
      tex.dispose();
    });
    tpl.rigTemplate.parts.forEach((part) => {
      const mats = Array.isArray(part.material) ? part.material : [part.material];
      mats.forEach((m) => m.dispose());
    });
    tpl.root.traverse((obj) => {
      if (obj instanceof THREE.Mesh && obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m.dispose());
      }
    });
  }
  resolvedTemplates.clear();
  parsedTemplateCache.clear();
}

export interface Chapter1RosterMotionInput {
  assetId: CampaignRosterAssetId;
  elapsed: number;
  phaseAngle: number;
  speed: number;
  telegraphType: 'none' | 'shot' | 'lunge' | 'slam' | 'spiral' | 'lane';
  telegraphProgress: number;
  burstType: Chapter1RosterBurstType;
  burstTimer: number;
  bossPhase: 1 | 2 | 3;
  stunTimer: number;
  hitFlashTimer: number;
  isSubBossTitan?: boolean;
  lateralSpeed?: number;
  recoilPitch?: number;
  recoilRoll?: number;
}

export interface Chapter1RosterMotionSnapshot {
  offsetY: number;
  offsetX: number;
  offsetZ: number;
  pitchX: number;
  rollZ: number;
  yawOffset: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

const _motionSnap: Chapter1RosterMotionSnapshot = {
  offsetY: 0,
  offsetX: 0,
  offsetZ: 0,
  pitchX: 0,
  rollZ: 0,
  yawOffset: 0,
  scaleX: 1,
  scaleY: 1,
  scaleZ: 1,
};

/**
 * Computes distinct, zero-allocation procedural combat choreography for all 5 new Chapter 1 models.
 */
export function computeChapter1RosterMotion(
  input: Chapter1RosterMotionInput
): Chapter1RosterMotionSnapshot {
  const {
    assetId: inputAssetId,
    elapsed,
    phaseAngle,
    speed,
    telegraphType,
    telegraphProgress,
    burstType,
    burstTimer,
    bossPhase,
    stunTimer,
    hitFlashTimer,
  } = input;

  const assetId = getCampaignRosterArchetype(inputAssetId);
  const moveFactor = Math.min(1, speed / 3.4);
  const t = elapsed + phaseAngle;

  let offsetY = 0;
  let offsetX = 0;
  let offsetZ = 0;
  let pitchX = 0;
  let rollZ = 0;
  let yawOffset = 0;
  let scaleX = 1;
  let scaleY = 1;
  let scaleZ = 1;

  if (stunTimer > 0) {
    offsetY = -0.05;
    pitchX = 0.2;
    rollZ = Math.sin(elapsed * 15 + phaseAngle) * 0.14;
    scaleY = 0.94;
    scaleX = 1.05;
    scaleZ = 1.05;
  } else if (assetId === 'fire_lion') {
    // Fast quadrupedal hunter: quick bounding stride + low predatory pounce crouch
    const gait = elapsed * (8.8 + moveFactor * 4.2) + phaseAngle;
    const bounce = Math.abs(Math.sin(gait));
    offsetY = moveFactor > 0.08 ? bounce * 0.16 * moveFactor : Math.sin(t * 3.4) * 0.03;
    pitchX = moveFactor > 0.08 ? 0.12 * moveFactor + Math.cos(gait) * 0.09 * moveFactor : 0;
    rollZ = Math.sin(gait * 0.5) * 0.08 * moveFactor;
    scaleY = 1 + Math.sin(t * 3.6) * 0.025 + bounce * 0.04 * moveFactor;
    scaleZ = 1 + moveFactor * 0.05;
    scaleX = 1 - moveFactor * 0.02;
  } else if (assetId === 'stone_guardian') {
    // Heavy armored golem tank: thunderous low stomp + shoulder sway
    const stomp = elapsed * (4.6 + moveFactor * 2.1) + phaseAngle;
    const stepLift = Math.abs(Math.sin(stomp));
    offsetY = moveFactor > 0.08 ? stepLift * 0.1 * moveFactor : 0;
    rollZ = moveFactor > 0.08 ? Math.sin(stomp) * 0.11 * moveFactor : Math.sin(t * 1.9) * 0.02;
    pitchX = moveFactor > 0.08 ? 0.05 * moveFactor : 0;
    scaleY = 1 - stepLift * 0.035 * moveFactor + Math.sin(t * 2.0) * 0.015;
    scaleX = 1 + stepLift * 0.03 * moveFactor;
    scaleZ = scaleX;
  } else if (assetId === 'flame_spirit') {
    // Floating zodiac fire mage: smooth levitation + arcane tilt
    offsetY = Math.sin(elapsed * 3.8 + phaseAngle) * 0.16;
    rollZ = Math.cos(elapsed * 2.4 + phaseAngle) * 0.1;
    pitchX = 0.08 * moveFactor + Math.sin(elapsed * 3.1 + phaseAngle) * 0.05;
    yawOffset = Math.sin(elapsed * 1.9 + phaseAngle) * 0.09;
    const pulse = Math.sin(elapsed * 5.2 + phaseAngle) * 0.035;
    scaleX = 1 + pulse;
    scaleY = 1 - pulse * 0.6;
    scaleZ = 1 + pulse;
  } else if (assetId === 'sun_spearman') {
    // Mid-range solar spear sentinel: disciplined martial march + thrust readiness
    const march = elapsed * (7.2 + moveFactor * 3.0) + phaseAngle;
    offsetY = moveFactor > 0.08 ? Math.abs(Math.sin(march)) * 0.11 * moveFactor : Math.sin(t * 2.6) * 0.02;
    pitchX = moveFactor > 0.08 ? 0.08 * moveFactor : 0.02;
    rollZ = Math.sin(march) * 0.07 * moveFactor;
    yawOffset = Math.cos(march) * 0.06 * moveFactor;
    scaleY = 1 + Math.sin(t * 3.0) * 0.02;
  } else {
    // Winged Solar Lion Sub-Boss: aerial wing-glide lift + regal predatory power
    const phaseTempo = bossPhase === 3 ? 1.32 : bossPhase === 2 ? 1.16 : 1.0;
    const wingCycle = elapsed * 4.4 * phaseTempo + phaseAngle;
    const stride = elapsed * (6.8 * phaseTempo) + phaseAngle;
    offsetY =
      Math.sin(wingCycle) * 0.14 +
      (moveFactor > 0.08 ? Math.abs(Math.sin(stride)) * 0.11 * moveFactor : 0);
    pitchX = moveFactor * 0.11 + Math.sin(wingCycle) * 0.05;
    rollZ = Math.sin(stride * 0.5) * 0.08 * (0.4 + moveFactor * 0.6);
    scaleX = 1 + Math.sin(wingCycle) * 0.03;
    scaleY = 1 + Math.cos(wingCycle) * 0.028;
    scaleZ = 1 + moveFactor * 0.03;
  }

  // Telegraph windup anticipation (clear, readable silhouette)
  if (stunTimer <= 0 && telegraphType !== 'none') {
    const p = Math.max(0, Math.min(1, telegraphProgress));
    if (telegraphType === 'lunge' || telegraphType === 'lane') {
      offsetZ -= 0.22 * p;
      pitchX -= 0.16 * p;
      scaleY *= 1 - 0.09 * p;
      scaleZ *= 1 + 0.1 * p;
    } else if (telegraphType === 'slam' || telegraphType === 'spiral') {
      offsetY += 0.24 * p;
      pitchX -= 0.18 * p;
      scaleY *= 1 + 0.09 * p;
    } else if (telegraphType === 'shot') {
      offsetY += assetId === 'flame_spirit' ? 0.16 * p : 0.07 * p;
      pitchX -= 0.12 * p;
      scaleX *= 1 + 0.07 * p;
      scaleZ *= 1 + 0.07 * p;
    }
  }

  // Attack release burst impulse
  if (stunTimer <= 0 && burstType !== 'none' && burstTimer > 0) {
    const b = Math.min(1, burstTimer / 0.36);
    if (burstType === 'lunge') {
      offsetZ += 0.34 * b;
      pitchX += 0.24 * b;
      scaleZ *= 1 + 0.14 * b;
      scaleY *= 1 - 0.08 * b;
    } else if (burstType === 'slam') {
      offsetY -= 0.1 * b;
      pitchX += 0.28 * b;
      scaleX *= 1 + 0.16 * b;
      scaleZ *= 1 + 0.16 * b;
      scaleY *= 1 - 0.14 * b;
    } else if (burstType === 'cast') {
      offsetZ += 0.18 * b;
      offsetY += 0.12 * b;
      scaleX *= 1 + 0.12 * b;
      scaleY *= 1 + 0.12 * b;
      scaleZ *= 1 + 0.12 * b;
    } else if (burstType === 'roar') {
      offsetY += 0.14 * b;
      pitchX -= 0.18 * b;
      scaleX *= 1 + 0.1 * b;
      scaleY *= 1 + 0.12 * b;
      scaleZ *= 1 + 0.1 * b;
    }
  }

  // Hit-recoil micro-jolt
  if (hitFlashTimer > 0) {
    const h = Math.min(1, hitFlashTimer / 0.12);
    offsetX += Math.sin(elapsed * 58 + phaseAngle) * 0.055 * h;
    offsetZ -= 0.08 * h;
    scaleX *= 1 + 0.05 * h;
    scaleY *= 1 - 0.05 * h;
  }

  // AAA velocity-coupled corner banking & directional hit-flinch away from arrows
  if (input.lateralSpeed !== undefined && stunTimer <= 0) {
    const latBank = Math.max(-0.22, Math.min(0.22, (-input.lateralSpeed / 4.0) * 0.2));
    rollZ += latBank;
  }
  if (input.recoilPitch !== undefined) {
    pitchX += input.recoilPitch;
  }
  if (input.recoilRoll !== undefined) {
    rollZ += input.recoilRoll;
  }

  _motionSnap.offsetY = offsetY;
  _motionSnap.offsetX = offsetX;
  _motionSnap.offsetZ = offsetZ;
  _motionSnap.pitchX = pitchX;
  _motionSnap.rollZ = rollZ;
  _motionSnap.yawOffset = yawOffset;
  _motionSnap.scaleX = scaleX;
  _motionSnap.scaleY = scaleY;
  _motionSnap.scaleZ = scaleZ;
  return _motionSnap;
}

/**
 * Smoothly applies archetype-specific procedural combat animation onto an attached Chapter 1 3D visual group.
 */
export function updateChapter1RosterMotion(
  visualGroup: THREE.Group,
  input: Chapter1RosterMotionInput,
  baseScale: number,
  dt: number
): void {
  const snap = computeChapter1RosterMotion(input);
  const lambda = 13;
  visualGroup.position.x = THREE.MathUtils.damp(visualGroup.position.x, snap.offsetX, lambda, dt);
  visualGroup.position.y = THREE.MathUtils.damp(visualGroup.position.y, snap.offsetY, lambda, dt);
  visualGroup.position.z = THREE.MathUtils.damp(visualGroup.position.z, snap.offsetZ, lambda, dt);
  visualGroup.rotation.x = THREE.MathUtils.damp(visualGroup.rotation.x, snap.pitchX, lambda, dt);
  visualGroup.rotation.z = THREE.MathUtils.damp(visualGroup.rotation.z, snap.rollZ, lambda, dt);
  visualGroup.rotation.y = THREE.MathUtils.damp(visualGroup.rotation.y, snap.yawOffset, lambda, dt);
  visualGroup.scale.x = THREE.MathUtils.damp(visualGroup.scale.x, baseScale * snap.scaleX, lambda, dt);
  visualGroup.scale.y = THREE.MathUtils.damp(visualGroup.scale.y, baseScale * snap.scaleY, lambda, dt);
  visualGroup.scale.z = THREE.MathUtils.damp(visualGroup.scale.z, baseScale * snap.scaleZ, lambda, dt);
}

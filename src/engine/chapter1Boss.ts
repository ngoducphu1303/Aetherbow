import * as THREE from 'three';
import { EnemyKind } from '../types/game';
import {
  AutoRigInstance,
  instantiateAutoRigModel,
  prepareAutoRigTemplate,
} from './aaaAutoRigSystem';

/**
 * Official GitHub source & hardware-adaptive runtime variants for the Chapter 1
 * Solar Lion Boss (Sư Vương Thái Dương).
 * - Source: 83.02 MB · 1,498,086 tris · 3 × 4096px PNGs (kept intact on disk)
 * - High:    3.45 MB ·    38,000 tris · 3 PBR maps (2K Albedo + 1K MR + 1K Normal)
 * - Lite:    0.70 MB ·    11,988 tris · 1 BaseColor 1024px JPEG (safe for Dell E5430 / HD 4000)
 */
export const CHAPTER1_BOSS_SOURCE_PATH_SEGMENTS = [
  'assets',
  'Chương 1',
  'Boss mới',
  'Sư tử boss mới.glb',
] as const;

export const CHAPTER1_BOSS_HIGH_PATH_SEGMENTS = [
  'assets',
  'Chương 1',
  'Boss mới',
  'Sư tử boss mới High.glb',
] as const;

export const CHAPTER1_BOSS_LITE_PATH_SEGMENTS = [
  'assets',
  'Chương 1',
  'Boss mới',
  'Sư tử boss mới Lite.glb',
] as const;

export const CHAPTER1_BOSS_ASSET_VERSION = '1';
export const CHAPTER1_BOSS_TARGET_HEIGHT = 3.25;
export const CHAPTER1_BOSS_FACING_YAW = 0;

export interface SolarLionBossEncounterContext {
  chapterId: number;
  enemyKind: EnemyKind;
  isWeeklyRankedBossMode?: boolean;
  weeklyBossId?: string | null;
  isSideModeActive?: boolean;
}

/**
 * Matches the confirmed gameplay scope:
 * 1. Campaign Chapter 1 Final Boss (Stage 12 · Sư Vương Thái Dương)
 * 2. Weekly Ranked Boss (weekly_solar_leo & weekly_solar_leo_blitz)
 */
export function isSolarLionBossEncounter(ctx: SolarLionBossEncounterContext): boolean {
  if (ctx.enemyKind !== EnemyKind.ZODIAC_BOSS) return false;
  if (ctx.isWeeklyRankedBossMode) {
    const normalized = (ctx.weeklyBossId || 'weekly_solar_leo').replace(/_blitz$/, '');
    return normalized === 'weekly_solar_leo';
  }
  if (ctx.isSideModeActive) return false;
  return ctx.chapterId === 1;
}

export function getChapter1BossAssetUrl(
  variant: 'high' | 'lite',
  baseUrl = '/',
  baseUri = 'http://localhost:3000/'
): URL {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const segments =
    variant === 'lite' ? CHAPTER1_BOSS_LITE_PATH_SEGMENTS : CHAPTER1_BOSS_HIGH_PATH_SEGMENTS;
  const encodedPath = segments.map((seg) => encodeURIComponent(seg)).join('/');
  const url = new URL(`${normalizedBase}${encodedPath}`, baseUri);
  url.searchParams.set('v', CHAPTER1_BOSS_ASSET_VERSION);
  return url;
}

function validateGlbBuffer(data: ArrayBuffer): void {
  const header = new DataView(data);
  if (
    data.byteLength < 20 ||
    header.getUint32(0, true) !== 0x46546c67 ||
    header.getUint32(4, true) !== 2 ||
    header.getUint32(8, true) !== data.byteLength
  ) {
    throw new Error('Tệp GLB Boss Sư Tử không hợp lệ.');
  }
}

const bossDownloadCache = new Map<'high' | 'lite', Promise<ArrayBuffer>>();

export function clearChapter1BossDownloadCache(): void {
  bossDownloadCache.clear();
}

export interface DownloadChapter1BossOptions {
  baseUrl?: string;
  baseUri?: string;
  signal?: AbortSignal;
  fetchImpl?: typeof fetch;
}

async function fetchBossVariantBytes(
  variant: 'high' | 'lite',
  options: DownloadChapter1BossOptions
): Promise<ArrayBuffer> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const baseUrl = options.baseUrl ?? '/';
  const baseUri = options.baseUri ?? (typeof document !== 'undefined' ? document.baseURI : 'http://localhost:3000/');
  const url = getChapter1BossAssetUrl(variant, baseUrl, baseUri);
  const res = await fetchImpl(url, { signal: options.signal });
  if (!res.ok || res.headers.get('content-type')?.includes('text/html')) {
    throw new Error(`Không tải được mô hình Boss Sư Tử (${variant}, HTTP ${res.status}).`);
  }
  const buf = await res.arrayBuffer();
  validateGlbBuffer(buf);
  return buf;
}

/**
 * Downloads and caches the compressed Boss GLB ArrayBuffer (0.70 MB Lite / 3.45 MB High).
 * If 'high' fails to download, automatically falls back to 'lite' so the boss never breaks.
 */
export function downloadChapter1BossArrayBuffer(
  variant: 'high' | 'lite',
  options: DownloadChapter1BossOptions = {}
): Promise<ArrayBuffer> {
  const existing = bossDownloadCache.get(variant);
  if (existing) return existing;

  const task = (async () => {
    try {
      return await fetchBossVariantBytes(variant, options);
    } catch (error) {
      if (variant === 'high' && !options.signal?.aborted) {
        return await fetchBossVariantBytes('lite', options);
      }
      throw error;
    }
  })().catch((err) => {
    bossDownloadCache.delete(variant);
    throw err;
  });

  bossDownloadCache.set(variant, task);
  return task;
}

export interface PreparedChapter1Boss {
  group: THREE.Group;
  rigInstance: AutoRigInstance;
  hitMeshes: THREE.Mesh[];
  scale: number;
  bounds: THREE.Box3;
}

/**
 * Calibrates facing (+Z), grounds feet flush at y = 0, auto-rigs real 13-bone GPU SkinnedMesh
 * weights & claw bone anchors, and tunes shadow & anisotropy caps for both High (discrete GPU)
 * and Lite (Dell Latitude E5430 / Intel HD 4000) modes.
 */
export function prepareChapter1BossModel(
  gltfScene: THREE.Object3D,
  maxAnisotropy = 4,
  options?: { liteMode?: boolean; facingYawOffset?: number }
): PreparedChapter1Boss {
  const liteMode = Boolean(options?.liteMode);
  const rigTemplate = prepareAutoRigTemplate('solar_lion_boss', gltfScene, maxAnisotropy, {
    liteMode,
    facingYawOffset: options?.facingYawOffset ?? CHAPTER1_BOSS_FACING_YAW,
  });

  // Dispose raw unbaked geometries and unmark shared flags so per-boss releaseObject frees GPU cleanly
  gltfScene.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.geometry && !rigTemplate.sharedGeometries.has(obj.geometry)) {
      obj.geometry.dispose();
    }
  });
  rigTemplate.sharedGeometries.forEach((geo) => {
    if (geo.userData) delete geo.userData.sharedCachedGeometry;
  });
  rigTemplate.sharedTextures.forEach((tex) => {
    if (tex.userData) delete tex.userData.sharedCachedTexture;
  });

  const rigInstance = instantiateAutoRigModel(rigTemplate);
  rigInstance.group.name = liteMode ? 'Chapter1SolarLionBossLite' : 'Chapter1SolarLionBossHigh';

  // Dispose template source material clones (the SkinnedMesh instance now owns its cloned materials)
  rigTemplate.parts.forEach((p) => {
    const mats = Array.isArray(p.material) ? p.material : [p.material];
    mats.forEach((m) => m.dispose());
  });

  const scale = CHAPTER1_BOSS_TARGET_HEIGHT / Math.max(0.001, rigTemplate.size.y);
  return {
    group: rigInstance.group,
    rigInstance,
    hitMeshes: rigInstance.skinnedMeshes,
    scale,
    bounds: rigInstance.bounds,
  };
}

export interface Chapter1BossMotionInput {
  elapsed: number;
  phaseAngle: number;
  speed: number;
  telegraphType: 'none' | 'shot' | 'lunge' | 'slam' | 'spiral' | 'lane';
  telegraphProgress: number; // 0..1 while telegraphing
  attackBurstType: 'none' | 'lunge' | 'slam' | 'roar';
  attackBurstTimer: number; // seconds remaining
  bossPhase: 1 | 2 | 3;
  stunTimer: number;
  hitFlashTimer: number;
  lateralSpeed?: number;
  recoilPitch?: number;
  recoilRoll?: number;
}

export interface Chapter1BossMotionSnapshot {
  offsetY: number;
  offsetX: number;
  offsetZ: number;
  pitchX: number;
  rollZ: number;
  scaleX: number;
  scaleY: number;
  scaleZ: number;
}

/**
 * Procedural predatory combat choreography for the sculpted static Lion Boss mesh.
 * Zero allocations per frame; smoothly interpolates breathing, heavy stalking stride,
 * telegraph crouch + tremor, lunge surge, slam leap/impact, hit recoil, stun stagger,
 * and Phase II/III solar enrage cadence.
 */
export function updateChapter1BossMotion(
  visualGroup: THREE.Group,
  input: Chapter1BossMotionInput,
  dt: number
): Chapter1BossMotionSnapshot {
  const safeDt = Math.max(0.001, Math.min(0.05, dt));
  const phaseRate = input.bossPhase === 3 ? 1.45 : input.bossPhase === 2 ? 1.22 : 1.0;
  const breathCycle = Math.sin(input.elapsed * 2.8 * phaseRate + input.phaseAngle);
  const isMoving = input.speed > 0.25;
  const strideWave = Math.sin(input.elapsed * 7.8 * phaseRate + input.phaseAngle);

  let targetY = 0;
  let targetX = 0;
  let targetZ = 0;
  let targetPitchX = 0;
  let targetRollZ = 0;
  let targetScaleY = 1 + breathCycle * (input.bossPhase >= 2 ? 0.032 : 0.022);
  let targetScaleXZ = 1 / Math.sqrt(Math.max(0.75, targetScaleY));

  if (input.stunTimer > 0) {
    // Guard-break staggered roar/kneel
    targetY = -0.18;
    targetPitchX = -0.14;
    targetRollZ = Math.sin(input.elapsed * 18 + input.phaseAngle) * 0.085;
    targetScaleY = 0.92;
    targetScaleXZ = 1.05;
  } else if (input.attackBurstTimer > 0 && input.attackBurstType !== 'none') {
    const burstRatio = Math.min(1, input.attackBurstTimer / 0.42);
    if (input.attackBurstType === 'slam') {
      // Dramatic leap-crest then heavy slam squash
      const arc = Math.sin(burstRatio * Math.PI);
      targetY = arc * 0.52 - (1 - burstRatio) * 0.12;
      targetPitchX = (0.5 - burstRatio) * 0.34;
      targetScaleY = 1 + (arc - 0.35) * 0.14;
      targetScaleXZ = 1 / Math.sqrt(Math.max(0.75, targetScaleY));
    } else if (input.attackBurstType === 'lunge') {
      // Predatory forward pounce stretch
      targetZ = burstRatio * 0.34;
      targetY = burstRatio * 0.14;
      targetPitchX = burstRatio * 0.26;
      targetScaleY = 0.94;
      targetScaleXZ = 1.04;
    } else {
      // Phase transition roar
      targetY = burstRatio * 0.24;
      targetPitchX = -burstRatio * 0.22;
      targetScaleY = 1 + burstRatio * 0.12;
      targetScaleXZ = 1 + burstRatio * 0.05;
    }
  } else if (input.telegraphType !== 'none') {
    const prog = Math.max(0, Math.min(1, input.telegraphProgress));
    const tremor = Math.sin(input.elapsed * 42) * (0.022 + prog * 0.032);
    if (input.telegraphType === 'slam' || input.telegraphType === 'spiral') {
      // Deep coiled crouch before slam/nova
      targetY = -0.14 * prog;
      targetPitchX = -0.16 * prog;
      targetX = tremor;
      targetScaleY = 1 - 0.1 * prog;
      targetScaleXZ = 1 + 0.07 * prog;
    } else if (input.telegraphType === 'lunge' || input.telegraphType === 'lane') {
      // Low predator stalk coil ready to dash
      targetY = -0.1 * prog;
      targetZ = -0.18 * prog;
      targetPitchX = 0.22 * prog;
      targetX = tremor * 0.8;
      targetScaleY = 1 - 0.07 * prog;
      targetScaleXZ = 1 + 0.05 * prog;
    } else {
      // Ranged solar roar windup
      targetPitchX = -0.14 * prog;
      targetY = 0.05 * prog;
      targetScaleY = 1 + 0.05 * prog;
      targetScaleXZ = 1 + 0.03 * prog;
    }
  } else if (isMoving) {
    // Heavy predatory stride with shoulder roll
    const strideAmp = Math.min(1, input.speed / 4.2);
    targetY = Math.abs(strideWave) * 0.11 * strideAmp;
    targetRollZ = strideWave * 0.065 * strideAmp;
    targetPitchX = 0.075 * strideAmp;
  } else {
    // Regal idle sway
    targetRollZ = Math.sin(input.elapsed * 1.45 + input.phaseAngle) * 0.024;
  }

  // Crisp recoil kickback when struck by arrows
  if (input.hitFlashTimer > 0) {
    const recoil = Math.min(1, input.hitFlashTimer / 0.12);
    targetZ -= recoil * 0.11;
    targetPitchX -= recoil * 0.09;
    targetScaleY *= 1 - recoil * 0.04;
    targetScaleXZ *= 1 + recoil * 0.035;
  }

  // AAA velocity-coupled corner banking & directional hit-flinch
  if (input.lateralSpeed !== undefined && input.stunTimer <= 0) {
    targetRollZ += Math.max(-0.18, Math.min(0.18, (-input.lateralSpeed / 4.5) * 0.16));
  }
  if (input.recoilPitch !== undefined) {
    targetPitchX += input.recoilPitch;
  }
  if (input.recoilRoll !== undefined) {
    targetRollZ += input.recoilRoll;
  }

  const lambda = 14;
  visualGroup.position.x = THREE.MathUtils.damp(visualGroup.position.x, targetX, lambda, safeDt);
  visualGroup.position.y = THREE.MathUtils.damp(visualGroup.position.y, targetY, lambda, safeDt);
  visualGroup.position.z = THREE.MathUtils.damp(visualGroup.position.z, targetZ, lambda, safeDt);
  visualGroup.rotation.x = THREE.MathUtils.damp(visualGroup.rotation.x, targetPitchX, lambda, safeDt);
  visualGroup.rotation.z = THREE.MathUtils.damp(visualGroup.rotation.z, targetRollZ, lambda, safeDt);
  visualGroup.scale.x = THREE.MathUtils.damp(visualGroup.scale.x, targetScaleXZ, lambda, safeDt);
  visualGroup.scale.y = THREE.MathUtils.damp(visualGroup.scale.y, targetScaleY, lambda, safeDt);
  visualGroup.scale.z = THREE.MathUtils.damp(visualGroup.scale.z, targetScaleXZ, lambda, safeDt);

  return {
    offsetY: visualGroup.position.y,
    offsetX: visualGroup.position.x,
    offsetZ: visualGroup.position.z,
    pitchX: visualGroup.rotation.x,
    rollZ: visualGroup.rotation.z,
    scaleX: visualGroup.scale.x,
    scaleY: visualGroup.scale.y,
    scaleZ: visualGroup.scale.z,
  };
}

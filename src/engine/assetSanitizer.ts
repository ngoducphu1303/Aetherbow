import * as THREE from 'three';
import type { SystemLiteBudget } from '../types/game';

export interface SanitizeGltfOptions {
  /** Keeps humanoid face/head/eye textures crisp up to 768px even in Lite mode. */
  preserveFaceSharpness?: boolean;
  /** Force-disables castShadow/receiveShadow regardless of shadowMapSize. */
  disableShadows?: boolean;
  /** Optional custom max texture edge override. */
  maxTextureSizeOverride?: number;
}

export interface SanitizeGltfStats {
  meshesProcessed: number;
  texturesDownscaled: number;
  materialsSimplified: number;
}

const FACE_NAME_RE = /face|head|eye|brow|mouth|hair|skin|bang|lash/i;

function isFaceLikeName(name?: string | null): boolean {
  return Boolean(name && FACE_NAME_RE.test(name));
}

function getTextureDimensions(tex: THREE.Texture): { width: number; height: number } | null {
  const img = tex.image as
    | { width?: number; height?: number; naturalWidth?: number; naturalHeight?: number }
    | undefined;
  if (!img) return null;
  const width = img.naturalWidth || img.width || 0;
  const height = img.naturalHeight || img.height || 0;
  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

function downscaleTextureInPlace(tex: THREE.Texture, maxEdge: number): boolean {
  if (typeof document === 'undefined' || typeof document.createElement !== 'function') {
    return false;
  }
  const dims = getTextureDimensions(tex);
  if (!dims) return false;
  const largest = Math.max(dims.width, dims.height);
  if (largest <= maxEdge) return false;

  const scale = maxEdge / largest;
  const nextW = Math.max(16, Math.round(dims.width * scale));
  const nextH = Math.max(16, Math.round(dims.height * scale));

  try {
    const canvas = document.createElement('canvas');
    canvas.width = nextW;
    canvas.height = nextH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return false;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tex.image as CanvasImageSource, 0, 0, nextW, nextH);
    tex.image = canvas;
    tex.needsUpdate = true;
    return true;
  } catch {
    return false;
  }
}

/**
 * Unified system-wide 3D asset & texture sanitizer.
 * Applied to ALL loaded GLB scenes (Heroes, Skins, Pets, Mounts, Wings, Artifacts,
 * Bosses, Mobs, Chapter 1-12 Maps, Lobby City, and future updates) so low-end devices
 * like Dell Latitude E5430 never exceed safe VRAM or shader budgets.
 */
export function sanitizeLoadedObjectForBudget(
  root: THREE.Object3D,
  budget: SystemLiteBudget,
  options: SanitizeGltfOptions = {}
): SanitizeGltfStats {
  const stats: SanitizeGltfStats = {
    meshesProcessed: 0,
    texturesDownscaled: 0,
    materialsSimplified: 0,
  };

  const processedTextures = new Set<THREE.Texture>();
  const processedMaterials = new Set<THREE.Material>();
  const allowShadows = budget.shadowMapSize > 0 && !options.disableShadows;
  const baseMaxTex = options.maxTextureSizeOverride ?? budget.maxTextureSize;
  const maxAniso = budget.liteActive ? 1 : budget.deviceTier === 'balanced' ? 4 : 8;

  const processTexture = (
    tex: THREE.Texture | null | undefined,
    isFace: boolean,
    isDataMap: boolean
  ) => {
    if (!tex || processedTextures.has(tex)) return;
    processedTextures.add(tex);

    if (tex.anisotropy > maxAniso) {
      tex.anisotropy = maxAniso;
    }

    let capEdge = baseMaxTex;
    if (budget.liteActive) {
      if (isDataMap) {
        capEdge = Math.min(capEdge, 256);
      } else if (isFace && options.preserveFaceSharpness) {
        capEdge = Math.min(capEdge, 768);
      } else {
        capEdge = Math.min(capEdge, budget.deviceTier === 'ultra_lite' ? 512 : 768);
      }

      // Disabling mipmaps on Lite cuts GPU texture memory footprint by ~33%
      if (tex.generateMipmaps) {
        tex.generateMipmaps = false;
        tex.minFilter = THREE.LinearFilter;
        tex.needsUpdate = true;
      }
    }

    if (downscaleTextureInPlace(tex, capEdge)) {
      stats.texturesDownscaled += 1;
    }
  };

  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    stats.meshesProcessed += 1;
    obj.castShadow = allowShadows && obj.castShadow;
    obj.receiveShadow = allowShadows && obj.receiveShadow;

    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    const meshFaceHint = isFaceLikeName(obj.name);

    for (const mat of mats) {
      if (!mat || processedMaterials.has(mat)) continue;
      processedMaterials.add(mat);

      const isFace = meshFaceHint || isFaceLikeName(mat.name);

      if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
        processTexture(mat.map, isFace, false);
        processTexture(mat.emissiveMap, isFace, false);
        processTexture(mat.normalMap, isFace, true);
        processTexture(mat.roughnessMap, isFace, true);
        processTexture(mat.metalnessMap, isFace, true);
        processTexture(mat.aoMap, isFace, true);
        processTexture(mat.bumpMap, isFace, true);

        if (budget.liteActive) {
          // Strip expensive multi-pass / secondary PBR maps on low-end GPUs
          if (mat instanceof THREE.MeshPhysicalMaterial) {
            if (mat.transmission > 0) {
              mat.transmission = 0;
              mat.transparent = true;
              mat.opacity = Math.min(mat.opacity, 0.72);
            }
            mat.clearcoat = 0;
            mat.sheen = 0;
            mat.iridescence = 0;
          }
          if (mat.aoMap) {
            mat.aoMap.dispose();
            mat.aoMap = null;
          }
          if (mat.bumpMap) {
            mat.bumpMap.dispose();
            mat.bumpMap = null;
          }
          if (budget.deviceTier === 'ultra_lite' && !isFace) {
            if (mat.normalMap) {
              mat.normalMap.dispose();
              mat.normalMap = null;
            }
            if (mat.roughnessMap) {
              mat.roughnessMap.dispose();
              mat.roughnessMap = null;
            }
            if (mat.metalnessMap) {
              mat.metalnessMap.dispose();
              mat.metalnessMap = null;
            }
          }
          mat.envMapIntensity = budget.environmentReflections
            ? Math.min(mat.envMapIntensity, 0.75)
            : 0;
          mat.needsUpdate = true;
          stats.materialsSimplified += 1;
        }
      } else if ('map' in mat && (mat as THREE.MeshBasicMaterial).map) {
        processTexture((mat as THREE.MeshBasicMaterial).map, isFace, false);
      }
    }
  });

  return stats;
}

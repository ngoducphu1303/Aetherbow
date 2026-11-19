import { GpuProfileSummary, GraphicsQuality } from '../types/game';

export interface PostFxRuntimeConfig {
  enabled: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  vignetteStrength: number;
  chromaticAmount: number;
  goldWarmth: number;
  shadowMapSize: 0 | 1024 | 2048;
  toneMappingExposure: number;
}

const SOFTWARE_GPU_RE = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i;
const INTEGRATED_GPU_RE = /Intel.*(?:HD|UHD|Iris|Graphics)|Mali-G[0-5]\d|Adreno\s*\(TM\)\s*[45]\d\d/i;

/**
 * Classifies the runtime WebGL GPU into 3 deterministic AAA hardware tiers
 * (software / integrated / discrete) so Aetherbow auto-selects safe shadows,
 * bloom post-processing, and combat frame pacing without stuttering.
 */
export function classifyGpuCapability(
  rendererString: string,
  deviceMemoryGb?: number,
  hardwareConcurrency = 8
): GpuProfileSummary {
  const cleanName = (rendererString || 'WebGL2 Renderer').trim().slice(0, 64);

  if (!rendererString || SOFTWARE_GPU_RE.test(rendererString)) {
    return {
      tier: 'software',
      tierLabel: 'WebGL Phần Mềm · Tối Ưu Tốc Độ',
      rendererName: cleanName,
      recommendedQuality: 'low',
      bloomSupported: false,
      shadowMapSize: 0,
      targetCombatFps: 12,
    };
  }

  const lowMemory = deviceMemoryGb !== undefined && deviceMemoryGb <= 4;
  const lowCores = hardwareConcurrency > 0 && hardwareConcurrency <= 4;
  if (INTEGRATED_GPU_RE.test(rendererString) || lowMemory || lowCores) {
    return {
      tier: 'integrated',
      tierLabel: 'GPU Tích Hợp · Cân Bằng',
      rendererName: cleanName,
      recommendedQuality: 'medium',
      bloomSupported: false,
      shadowMapSize: 1024,
      targetCombatFps: 30,
    };
  }

  return {
    tier: 'discrete',
    tierLabel: 'GPU Hiệu Năng Cao · Chuẩn AAA',
    rendererName: cleanName,
    recommendedQuality: 'high',
    bloomSupported: true,
    shadowMapSize: 2048,
    targetCombatFps: 60,
  };
}

/**
 * Resolves live post-processing parameters for the High-Contrast Mythic Zodiac
 * visual style (UnrealBloomPass + Mythic Gold-Obsidian Vignette + Impact Chromatic Pulse).
 */
export function resolvePostFxConfig(params: {
  quality: GraphicsQuality;
  bloomEnabled: boolean;
  isSoftwareGl: boolean;
  lowEndGpu: boolean;
  bloomImpulse?: number;
  chromaticImpulse?: number;
  isBossStage?: boolean;
  isLobby?: boolean;
  screenShakeEnabled?: boolean;
}): PostFxRuntimeConfig {
  const {
    quality,
    bloomEnabled,
    isSoftwareGl,
    lowEndGpu,
    bloomImpulse = 0,
    chromaticImpulse = 0,
    isBossStage = false,
    isLobby = false,
    screenShakeEnabled = true,
  } = params;

  const impulseBloom = Math.max(0, Math.min(0.65, bloomImpulse));
  const impulseChroma = screenShakeEnabled ? Math.max(0, Math.min(0.012, chromaticImpulse)) : 0;

  if (isSoftwareGl || lowEndGpu || quality === 'low') {
    return {
      enabled: false,
      bloomStrength: 0,
      bloomRadius: 0,
      bloomThreshold: 1,
      vignetteStrength: 0,
      chromaticAmount: 0,
      goldWarmth: 0,
      shadowMapSize: 0,
      toneMappingExposure: 1.12,
    };
  }

  if (quality === 'medium') {
    return {
      enabled: bloomEnabled,
      bloomStrength: bloomEnabled ? 0.34 + impulseBloom * 0.45 : 0,
      bloomRadius: 0.38,
      bloomThreshold: 0.88,
      vignetteStrength: isLobby ? 0.22 : isBossStage ? 0.3 : 0.24,
      chromaticAmount: impulseChroma * 0.65,
      goldWarmth: 0.05,
      shadowMapSize: 1024,
      toneMappingExposure: 1.14,
    };
  }

  // High — AAA Mythic Zodiac High-Contrast
  return {
    enabled: bloomEnabled,
    bloomStrength: bloomEnabled ? (isLobby ? 0.48 : 0.52) + impulseBloom * 0.72 : 0,
    bloomRadius: isLobby ? 0.48 : 0.42,
    bloomThreshold: isLobby ? 0.8 : 0.78,
    vignetteStrength: isLobby ? 0.26 : isBossStage ? 0.38 : 0.28,
    chromaticAmount: impulseChroma,
    goldWarmth: isLobby ? 0.08 : 0.06,
    shadowMapSize: 2048,
    toneMappingExposure: isLobby ? 1.16 : 1.15,
  };
}

/**
 * Single-pass AAA Mythic Zodiac finishing shader:
 * - Soft obsidian-gold radial vignette that frames the arena without obscuring corners
 * - Dynamic radial chromatic aberration impulse triggered on Boss roars, Ultimates & Perfect Dodge
 * - Calibrated warm-gold highlight lift & crisp deep-obsidian shadow contrast
 */
export const MythicZodiacGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVignette: { value: 0.28 },
    uChromatic: { value: 0.0 },
    uGoldWarmth: { value: 0.06 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    uniform float uChromatic;
    uniform float uGoldWarmth;
    varying vec2 vUv;

    void main() {
      vec2 centered = vUv - 0.5;
      float dist = length(centered);

      vec4 base = texture2D(tDiffuse, vUv);
      vec3 col = base.rgb;

      if (uChromatic > 0.0001) {
        vec2 offset = centered * uChromatic * (0.45 + dist * 1.4);
        col.r = texture2D(tDiffuse, clamp(vUv + offset, 0.001, 0.999)).r;
        col.b = texture2D(tDiffuse, clamp(vUv - offset, 0.001, 0.999)).b;
      }

      // Mythic Zodiac high-contrast micro-curve: luminous gold highs, clean dark shadows
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      vec3 goldLift = vec3(1.0 + uGoldWarmth, 1.0 + uGoldWarmth * 0.45, 1.0 - uGoldWarmth * 0.35);
      col = mix(col, col * goldLift, smoothstep(0.32, 0.95, luma));

      // Gentle obsidian-indigo edge framing
      float vig = smoothstep(0.46, 0.96, dist);
      vec3 shadowTint = vec3(0.03, 0.04, 0.09);
      col = mix(col, mix(col * 0.55, shadowTint, 0.32), vig * uVignette);

      gl_FragColor = vec4(col, base.a);
    }
  `,
};

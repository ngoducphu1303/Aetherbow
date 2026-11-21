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
// Legacy / weak integrated & mobile GPUs that risk TDR black-screen or thermal
// shutdown when uploading 942k vertices + three 4096x4096 RGBA8 PBR textures.
const LEGACY_WEAK_GPU_RE =
  /Intel.*(?:HD\s*Graphics(?:\s*(?:2\d00|3\d00|4\d00|5\d00|5\d0|6\d0))?|UHD\s*Graphics\s*(?:6\d0|G1)|GMA|Graphics\s*Media\s*Accelerator|Iris(?:\s*(?:Pro|Plus))?\s*(?:5\d0|6\d0|5100|5200|6100))|Radeon\s*(?:HD\s*[2-8]\d{3}|R[2-7]\b|Vega\s*[36]\b)|GeForce\s*(?:GT\s*[2-7]\d0|GTS|8[0-4]0M|9[0-4]0M|MX1[13]0)|Mali-(?:G[0-5]\d|T\d+)|Adreno\s*\(TM\)\s*[345]\d\d|PowerVR/i;

export interface ClassifyGpuOptions {
  maxTextureSize?: number;
  crashGuardTripped?: boolean;
  crashReason?: string;
}

/**
 * Classifies the runtime WebGL GPU into 3 deterministic AAA hardware tiers
 * (software / integrated / discrete) plus heavy-3D-map safety metadata so
 * legacy laptops (e.g., Dell Latitude E5430 · Intel HD 4000 · 4 logical threads)
 * stay cool and stable without crashing or shutting down.
 */
export function classifyGpuCapability(
  rendererString: string,
  deviceMemoryGb?: number,
  hardwareConcurrency = 8,
  options?: ClassifyGpuOptions
): GpuProfileSummary {
  const cleanName = (rendererString || 'WebGL2 Renderer').trim().slice(0, 64);
  const logicalCores = Number.isFinite(hardwareConcurrency) && hardwareConcurrency > 0
    ? Math.floor(hardwareConcurrency)
    : 4;
  const maxTextureSize =
    options?.maxTextureSize && options.maxTextureSize > 0 ? options.maxTextureSize : undefined;
  const crashGuardTripped = Boolean(options?.crashGuardTripped);

  if (!rendererString || SOFTWARE_GPU_RE.test(rendererString)) {
    return {
      tier: 'software',
      tierLabel: 'WebGL Phần Mềm · Tối Ưu Tốc Độ',
      rendererName: cleanName,
      recommendedQuality: 'low',
      bloomSupported: false,
      shadowMapSize: 0,
      targetCombatFps: 12,
      lowPowerLegacyGpu: true,
      supportsHighDetailChapter1Map: false,
      safetyReason: crashGuardTripped
        ? options?.crashReason || 'Tự bảo vệ sau sự cố WebGL ở phiên trước'
        : 'WebGL phần mềm · Tự dùng Sân Đấu 3D Nhẹ để tránh treo máy',
      crashGuardTripped,
      logicalCores,
      maxTextureSize,
    };
  }

  const lowMemory = deviceMemoryGb !== undefined && deviceMemoryGb <= 4;
  const lowCores = logicalCores <= 4;
  const isLegacyWeakGpu = LEGACY_WEAK_GPU_RE.test(rendererString);
  const lowTexLimit = maxTextureSize !== undefined && maxTextureSize < 8192;
  const lowPowerLegacyGpu =
    isLegacyWeakGpu || lowMemory || lowCores || lowTexLimit || crashGuardTripped;

  const buildSafetyReason = (): string | undefined => {
    if (crashGuardTripped) {
      return options?.crashReason || 'Tự bảo vệ sau sự cố mất WebGL / sập GPU ở phiên trước';
    }
    if (isLegacyWeakGpu && lowCores) {
      return `GPU tích hợp đời cũ & CPU ${logicalCores} luồng · Tự dùng Map 3D Lite & 30 FPS`;
    }
    if (isLegacyWeakGpu) {
      return 'GPU tích hợp đời cũ · Tự dùng Map 3D Lite (~30k mặt) để tránh quá tải';
    }
    if (lowCores) {
      return `CPU ${logicalCores} luồng · Tự dùng Map 3D Lite & 30 FPS`;
    }
    if (lowMemory) {
      return 'RAM hệ thống giới hạn · Tự dùng Map 3D Lite để tránh tràn bộ nhớ';
    }
    if (lowTexLimit) {
      return `Giới hạn texture GPU ${maxTextureSize}px · Tự dùng Map 3D Lite 1024px`;
    }
    return undefined;
  };

  if (INTEGRATED_GPU_RE.test(rendererString) || lowMemory || lowCores || isLegacyWeakGpu || lowTexLimit) {
    return {
      tier: 'integrated',
      tierLabel: lowPowerLegacyGpu
        ? 'GPU Tích Hợp / Máy Yếu · Chế Độ Bảo Vệ'
        : 'GPU Tích Hợp · Cân Bằng',
      rendererName: cleanName,
      recommendedQuality: lowPowerLegacyGpu ? 'low' : 'medium',
      bloomSupported: false,
      shadowMapSize: lowPowerLegacyGpu ? 0 : 1024,
      targetCombatFps: 30,
      lowPowerLegacyGpu,
      supportsHighDetailChapter1Map: !lowPowerLegacyGpu,
      safetyReason: buildSafetyReason(),
      crashGuardTripped,
      logicalCores,
      maxTextureSize,
    };
  }

  return {
    tier: 'discrete',
    tierLabel: crashGuardTripped
      ? 'GPU Rời · Đang Bật Chốt Bảo Vệ'
      : 'GPU Hiệu Năng Cao · Chuẩn AAA',
    rendererName: cleanName,
    recommendedQuality: crashGuardTripped ? 'low' : 'high',
    bloomSupported: !crashGuardTripped,
    shadowMapSize: crashGuardTripped ? 0 : 2048,
    targetCombatFps: crashGuardTripped ? 30 : 60,
    lowPowerLegacyGpu: crashGuardTripped,
    supportsHighDetailChapter1Map: !crashGuardTripped,
    safetyReason: buildSafetyReason(),
    crashGuardTripped,
    logicalCores,
    maxTextureSize,
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

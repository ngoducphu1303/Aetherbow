import {
  Chapter1MapMode,
  DeviceHardwareTier,
  GpuProfileSummary,
  GraphicsQuality,
  LowEndSafetyMode,
  SystemLiteBudget,
} from '../types/game';

export interface PostFxRuntimeConfig {
  enabled: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  vignetteStrength: number;
  chromaticAmount: number;
  goldWarmth: number;
  sharpness: number;
  shadowMapSize: 0 | 1024 | 2048;
  toneMappingExposure: number;
}

const SOFTWARE_GPU_RE = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i;
const INTEGRATED_GPU_RE = /Intel.*(?:HD|UHD|Iris|Graphics)|Mali-G[0-5]\d|Adreno\s*\(TM\)\s*[45]\d\d/i;
// Legacy / weak integrated & mobile GPUs that risk TDR black-screen or thermal
// shutdown when uploading high-poly meshes or 2K–4K RGBA8 PBR textures.
const LEGACY_WEAK_GPU_RE =
  /Intel.*(?:HD\s*Graphics(?:\s*(?:2\d00|3\d00|4\d00|5\d00|5\d0|6\d0))?|UHD\s*Graphics\s*(?:6\d0|G1)|GMA|Graphics\s*Media\s*Accelerator|Iris(?:\s*(?:Pro|Plus))?\s*(?:5\d0|6\d0|5100|5200|6100))|Radeon\s*(?:HD\s*[2-8]\d{3}|R[2-7]\b|Vega\s*[36]\b)|GeForce\s*(?:GT\s*[2-7]\d0|GTS|8[0-4]0M|9[0-4]0M|MX1[13]0)|Mali-(?:G[0-5]\d|T\d+)|Adreno\s*\(TM\)\s*[345]\d\d|PowerVR/i;
const HIGH_VRAM_DISCRETE_RE = /RTX\s*[345]\d{3}|RX\s*[679]\d{3}|Radeon\s*Pro|A\d{4}|RTX\s*20[78]\d/i;

export interface ClassifyGpuOptions {
  maxTextureSize?: number;
  maxRenderbufferSize?: number;
  maxTextureImageUnits?: number;
  crashGuardTripped?: boolean;
  crashReason?: string;
}

/**
 * Estimates usable GPU VRAM (MB) from renderer identity, system RAM, and WebGL texture/renderbuffer limits.
 * Used across all chapters and modes to keep texture & geometry residency inside safe device bounds.
 */
export function estimateGpuVramMb(params: {
  rendererString: string;
  tier: 'software' | 'integrated' | 'discrete';
  isLegacyWeakGpu: boolean;
  deviceMemoryGb?: number;
  maxTextureSize?: number;
  maxRenderbufferSize?: number;
}): number {
  const {
    rendererString,
    tier,
    isLegacyWeakGpu,
    deviceMemoryGb,
    maxTextureSize,
    maxRenderbufferSize,
  } = params;

  const limitSize = Math.min(
    maxTextureSize && maxTextureSize > 0 ? maxTextureSize : 16384,
    maxRenderbufferSize && maxRenderbufferSize > 0 ? maxRenderbufferSize : 16384
  );

  if (tier === 'software') return 128;

  let estimatedMb: number;
  if (isLegacyWeakGpu) {
    // Shared integrated memory on older laptops (e.g. Dell Latitude E5430 Intel HD 4000 / 8 GB RAM -> ~512 MB usable WebGL budget)
    const ramMb = deviceMemoryGb !== undefined ? Math.round(deviceMemoryGb * 64) : 384;
    estimatedMb = Math.min(512, Math.max(256, ramMb));
  } else if (tier === 'integrated') {
    const ramMb = deviceMemoryGb !== undefined ? Math.round(deviceMemoryGb * 128) : 1024;
    estimatedMb = Math.min(2048, Math.max(768, ramMb));
  } else {
    estimatedMb = HIGH_VRAM_DISCRETE_RE.test(rendererString) ? 8192 : 4096;
  }

  if (limitSize <= 2048) estimatedMb = Math.min(estimatedMb, 256);
  else if (limitSize <= 4096) estimatedMb = Math.min(estimatedMb, 512);
  else if (limitSize < 8192) estimatedMb = Math.min(estimatedMb, 512);

  return estimatedMb;
}

/**
 * Classifies the runtime WebGL GPU into 3 deterministic hardware tiers
 * (software / integrated / discrete) AND 4 global device performance tiers
 * (ultra_lite / lite / balanced / high) using CPU, GPU, RAM, and estimated VRAM
 * so legacy laptops (e.g., Dell Latitude E5430 · Intel HD 4000 · 4 logical threads)
 * stay cool and stable across ALL chapters and future content.
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
  const normalizedRam =
    typeof deviceMemoryGb === 'number' && Number.isFinite(deviceMemoryGb) && deviceMemoryGb > 0
      ? deviceMemoryGb
      : undefined;
  const maxTextureSize =
    options?.maxTextureSize && options.maxTextureSize > 0 ? options.maxTextureSize : undefined;
  const maxRenderbufferSize =
    options?.maxRenderbufferSize && options.maxRenderbufferSize > 0
      ? options.maxRenderbufferSize
      : undefined;
  const maxTextureImageUnits =
    options?.maxTextureImageUnits && options.maxTextureImageUnits > 0
      ? options.maxTextureImageUnits
      : undefined;
  const crashGuardTripped = Boolean(options?.crashGuardTripped);

  if (!rendererString || SOFTWARE_GPU_RE.test(rendererString)) {
    return {
      tier: 'software',
      deviceTier: 'ultra_lite',
      tierLabel: 'WebGL Phần Mềm · Chế Độ Siêu Nhẹ',
      rendererName: cleanName,
      recommendedQuality: 'low',
      bloomSupported: false,
      shadowMapSize: 0,
      targetCombatFps: 12,
      lowPowerLegacyGpu: true,
      supportsHighDetailChapter1Map: false,
      supportsHighDetailAssets: false,
      safetyReason: crashGuardTripped
        ? options?.crashReason || 'Tự bảo vệ sau sự cố WebGL ở phiên trước'
        : 'WebGL phần mềm · Tự bật Chế Độ Siêu Nhẹ toàn hệ thống để tránh treo máy',
      crashGuardTripped,
      logicalCores,
      deviceMemoryGb: normalizedRam,
      estimatedVramMb: 128,
      maxTextureSize,
      maxRenderbufferSize,
      maxTextureImageUnits,
    };
  }

  const ultraLowMemory = normalizedRam !== undefined && normalizedRam <= 2;
  const lowMemory = normalizedRam !== undefined && normalizedRam <= 4;
  const lowCores = logicalCores <= 4;
  const isLegacyWeakGpu = LEGACY_WEAK_GPU_RE.test(rendererString);
  const lowTexLimit =
    (maxTextureSize !== undefined && maxTextureSize < 8192) ||
    (maxRenderbufferSize !== undefined && maxRenderbufferSize < 4096);
  const lowPowerLegacyGpu =
    isLegacyWeakGpu || lowMemory || lowCores || lowTexLimit || crashGuardTripped;

  const isIntegratedBucket =
    INTEGRATED_GPU_RE.test(rendererString) || lowMemory || lowCores || isLegacyWeakGpu || lowTexLimit;
  const bucketTier: 'integrated' | 'discrete' = isIntegratedBucket ? 'integrated' : 'discrete';
  const estimatedVramMb = estimateGpuVramMb({
    rendererString,
    tier: bucketTier,
    isLegacyWeakGpu,
    deviceMemoryGb: normalizedRam,
    maxTextureSize,
    maxRenderbufferSize,
  });

  const deviceTier: DeviceHardwareTier =
    crashGuardTripped || ultraLowMemory || estimatedVramMb <= 256
      ? 'ultra_lite'
      : lowPowerLegacyGpu || estimatedVramMb <= 512
      ? 'lite'
      : bucketTier === 'integrated'
      ? 'balanced'
      : 'high';

  const buildSafetyReason = (): string | undefined => {
    if (crashGuardTripped) {
      return options?.crashReason || 'Tự bảo vệ sau sự cố mất WebGL / sập GPU ở phiên trước';
    }
    if (isLegacyWeakGpu && lowCores) {
      return `GPU tích hợp đời cũ (~${estimatedVramMb}MB VRAM) & CPU ${logicalCores} luồng · Tự bật Chế Độ Lite toàn hệ thống`;
    }
    if (isLegacyWeakGpu) {
      return `GPU tích hợp đời cũ (~${estimatedVramMb}MB VRAM) · Tự bật Chế Độ Lite toàn hệ thống`;
    }
    if (lowCores) {
      return `CPU ${logicalCores} luồng · Tự bật Chế Độ Lite & 30 FPS toàn hệ thống`;
    }
    if (lowMemory) {
      return `RAM hệ thống giới hạn (${normalizedRam}GB) · Tự bật Chế Độ Lite tránh tràn bộ nhớ`;
    }
    if (lowTexLimit) {
      return `Giới hạn texture GPU ${maxTextureSize ?? maxRenderbufferSize}px · Tự bật Chế Độ Lite`;
    }
    return undefined;
  };

  if (isIntegratedBucket) {
    return {
      tier: 'integrated',
      deviceTier,
      tierLabel: lowPowerLegacyGpu
        ? 'Máy Yếu / GPU Tích Hợp · Chế Độ Lite'
        : 'GPU Tích Hợp · Cân Bằng',
      rendererName: cleanName,
      recommendedQuality: lowPowerLegacyGpu ? 'low' : 'medium',
      bloomSupported: false,
      shadowMapSize: lowPowerLegacyGpu ? 0 : 1024,
      targetCombatFps: 30,
      lowPowerLegacyGpu,
      supportsHighDetailChapter1Map: !lowPowerLegacyGpu,
      supportsHighDetailAssets: !lowPowerLegacyGpu,
      safetyReason: buildSafetyReason(),
      crashGuardTripped,
      logicalCores,
      deviceMemoryGb: normalizedRam,
      estimatedVramMb,
      maxTextureSize,
      maxRenderbufferSize,
      maxTextureImageUnits,
    };
  }

  return {
    tier: 'discrete',
    deviceTier,
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
    supportsHighDetailAssets: !crashGuardTripped,
    safetyReason: buildSafetyReason(),
    crashGuardTripped,
    logicalCores,
    deviceMemoryGb: normalizedRam,
    estimatedVramMb,
    maxTextureSize,
    maxRenderbufferSize,
    maxTextureImageUnits,
  };
}

/**
 * Resolves the unified system-wide Lite / Compatibility budget applied to ALL chapters (1-12),
 * Lobby, Endless Tower, Arena, World Boss, Heroes, Bosses, Mobs, and future content.
 */
export function resolveSystemLiteBudget(
  profile: GpuProfileSummary,
  lowEndSafetyMode: LowEndSafetyMode = 'auto',
  chapter1MapMode: Chapter1MapMode = 'auto'
): SystemLiteBudget {
  const inferredTier: DeviceHardwareTier =
    profile.deviceTier ??
    (profile.tier === 'software' || profile.crashGuardTripped
      ? 'ultra_lite'
      : profile.lowPowerLegacyGpu
      ? 'lite'
      : profile.tier === 'integrated'
      ? 'balanced'
      : 'high');

  const isUltra =
    profile.tier === 'software' ||
    (lowEndSafetyMode !== 'off' &&
      (Boolean(profile.crashGuardTripped) || inferredTier === 'ultra_lite' || chapter1MapMode === 'light'));

  if (isUltra) {
    return {
      deviceTier: 'ultra_lite',
      liteActive: true,
      targetCombatFps: profile.tier === 'software' ? 12 : 24,
      targetLobbyFps: profile.tier === 'software' ? 12 : 20,
      maxPixelBudget: 550_000,
      maxDpr: 1.0,
      minAdaptiveDprScale: 0.72,
      maxTextureSize: 512,
      arenaTextureSize: 256,
      shadowMapSize: 0,
      bloomAllowed: false,
      environmentReflections: false,
      loadLobbyCity3d: false,
      arenaMonolithCount: 6,
      arenaDustCount: 6,
      enableBrazierFlames: false,
      enableConstellationLines: false,
      assetVariant:
        profile.tier === 'software' || profile.crashGuardTripped || chapter1MapMode === 'light'
          ? 'none'
          : 'lite',
      particleBudgetMult: 0.35,
    };
  }

  // Selecting 3D Lite for Chapter 1 Map alone does NOT force global Lite when the user explicitly chose Standard ('off')
  const liteActive =
    lowEndSafetyMode === 'on' ||
    (lowEndSafetyMode === 'auto' &&
      (chapter1MapMode === 'lite_3d' || inferredTier === 'lite' || Boolean(profile.lowPowerLegacyGpu)));

  if (liteActive) {
    return {
      deviceTier: inferredTier === 'high' || inferredTier === 'balanced' ? 'lite' : inferredTier,
      liteActive: true,
      targetCombatFps: 30,
      targetLobbyFps: 20,
      maxPixelBudget: 820_000,
      maxDpr: 1.0,
      minAdaptiveDprScale: 0.72,
      maxTextureSize: 1024,
      arenaTextureSize: 256,
      shadowMapSize: 0,
      bloomAllowed: false,
      environmentReflections: true,
      loadLobbyCity3d: false,
      arenaMonolithCount: 10,
      arenaDustCount: 10,
      enableBrazierFlames: false,
      enableConstellationLines: false,
      assetVariant: 'lite',
      particleBudgetMult: 0.45,
    };
  }

  if (inferredTier === 'balanced' && lowEndSafetyMode !== 'off' && chapter1MapMode !== 'high_3d') {
    return {
      deviceTier: 'balanced',
      liteActive: false,
      targetCombatFps: 45,
      targetLobbyFps: 30,
      maxPixelBudget: 2_100_000,
      maxDpr: 1.75,
      minAdaptiveDprScale: 0.8,
      maxTextureSize: 2048,
      arenaTextureSize: 512,
      shadowMapSize: 1024,
      bloomAllowed: true,
      environmentReflections: true,
      loadLobbyCity3d: false,
      arenaMonolithCount: 16,
      arenaDustCount: 20,
      enableBrazierFlames: true,
      enableConstellationLines: true,
      assetVariant: 'high',
      particleBudgetMult: 0.75,
    };
  }

  return {
    deviceTier: 'high',
    liteActive: false,
    targetCombatFps: 60,
    targetLobbyFps: 30,
    maxPixelBudget: 4_200_000,
    maxDpr: 2.0,
    minAdaptiveDprScale: 0.82,
    maxTextureSize: 4096,
    arenaTextureSize: 512,
    shadowMapSize: 2048,
    bloomAllowed: true,
    environmentReflections: true,
    loadLobbyCity3d: false,
    arenaMonolithCount: 22,
    arenaDustCount: 28,
    enableBrazierFlames: true,
    enableConstellationLines: true,
    assetVariant: 'high',
    particleBudgetMult: 1.0,
  };
}

export interface EffectivePixelRatioParams {
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
  budget: SystemLiteBudget;
  graphicsQuality: GraphicsQuality;
  isSoftwareGl: boolean;
  isLobby: boolean;
  adaptiveResolutionGuard: boolean;
  adaptiveResScale: number;
  governorDprScale: number;
}

/**
 * Computes crisp, GPU-safe canvas pixel ratio:
 * - In the static Lobby showcase, real GPUs (even Lite laptops like Dell E5430) render at
 *   100% native CSS resolution (DPR >= 1.0) without combat adaptive downscaling so heroes,
 *   mounts, pets, and sanctuary details never look stretched or blurry.
 * - In Combat, strictly respects the active SystemLiteBudget pixel cap to keep weak GPUs cool.
 */
export function computeEffectiveRenderPixelRatio(params: EffectivePixelRatioParams): number {
  const {
    viewportWidth,
    viewportHeight,
    devicePixelRatio,
    budget,
    graphicsQuality,
    isSoftwareGl,
    isLobby,
    adaptiveResolutionGuard,
    adaptiveResScale,
    governorDprScale,
  } = params;

  const safeDpr = Number.isFinite(devicePixelRatio) && devicePixelRatio > 0 ? devicePixelRatio : 1;
  const pixels = Math.max(1, Math.max(1, viewportWidth) * Math.max(1, viewportHeight));

  if (isSoftwareGl) {
    return Math.max(0.65, Math.min(1.0, Math.sqrt(budget.maxPixelBudget / pixels)));
  }

  const low = graphicsQuality === 'low' || budget.liteActive;
  const qualityCap = low
    ? isLobby
      ? Math.min(1.25, Math.max(1.0, budget.maxDpr))
      : budget.maxDpr
    : graphicsQuality === 'medium'
    ? Math.min(1.75, budget.maxDpr)
    : budget.maxDpr;

  // Lobby showcase has low draw-call load (20-30 FPS, no mobs/projectiles) -> always keep native 1:1 sharpness
  const effectiveBudget = isLobby
    ? low
      ? Math.max(budget.maxPixelBudget, Math.min(pixels * 1.15, 2_250_000))
      : Math.max(budget.maxPixelBudget, 4_200_000)
    : low
    ? budget.maxPixelBudget
    : Math.max(budget.maxPixelBudget, 3_600_000);

  const budgetDpr = Math.sqrt(effectiveBudget / pixels);
  const baseDpr = Math.min(safeDpr, qualityCap, budgetDpr);

  if (isLobby) {
    // Keep at least 1.0x native pixel crispness in Lobby on real GPUs when screen fits within 2.25M px
    const lobbyFloor = pixels <= 2_250_000 ? Math.min(safeDpr, 1.0) : 0.85;
    return Math.max(lobbyFloor, baseDpr);
  }

  const govDpr = adaptiveResolutionGuard ? Math.min(adaptiveResScale, governorDprScale) : 1.0;
  return Math.max(low ? 0.65 : 0.78, baseDpr * govDpr);
}

/**
 * Resolves live post-processing parameters for the High-Contrast Mythic Zodiac
 * visual style (Crisp UnrealBloomPass + Contrast Adaptive Sharpening + Gold-Obsidian Vignette).
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
      sharpness: 0,
      shadowMapSize: 0,
      toneMappingExposure: 1.12,
    };
  }

  if (quality === 'medium') {
    return {
      enabled: bloomEnabled,
      bloomStrength: bloomEnabled ? 0.28 + impulseBloom * 0.45 : 0,
      bloomRadius: 0.3,
      bloomThreshold: 0.9,
      vignetteStrength: isLobby ? 0.18 : isBossStage ? 0.28 : 0.22,
      chromaticAmount: impulseChroma * 0.65,
      goldWarmth: 0.05,
      sharpness: isLobby ? 0.34 : 0.26,
      shadowMapSize: 1024,
      toneMappingExposure: 1.13,
    };
  }

  // High — AAA Mythic Zodiac High-Contrast & Razor-Sharp CAS
  return {
    enabled: bloomEnabled,
    bloomStrength: bloomEnabled ? (isLobby ? 0.32 : 0.42) + impulseBloom * 0.72 : 0,
    bloomRadius: isLobby ? 0.32 : 0.34,
    bloomThreshold: isLobby ? 0.88 : 0.86,
    vignetteStrength: isLobby ? 0.22 : isBossStage ? 0.38 : 0.26,
    chromaticAmount: impulseChroma,
    goldWarmth: isLobby ? 0.07 : 0.06,
    sharpness: isLobby ? 0.44 : 0.36,
    shadowMapSize: 2048,
    toneMappingExposure: isLobby ? 1.14 : 1.15,
  };
}

/**
 * Single-pass AAA Mythic Zodiac finishing shader:
 * - Contrast Adaptive Sharpening (CAS) 5-tap micro-sharpen for crisp armor, hair & runes without haloing
 * - Soft obsidian-gold radial vignette that frames the arena without obscuring corners
 * - Dynamic radial chromatic aberration impulse triggered on Boss roars, Ultimates & Perfect Dodge
 * - Calibrated warm-gold highlight lift & crisp deep-obsidian shadow contrast
 */
export const MythicZodiacGradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVignette: { value: 0.26 },
    uChromatic: { value: 0.0 },
    uGoldWarmth: { value: 0.06 },
    uSharpness: { value: 0.36 },
    uTexelSize: { value: { x: 1 / 1280, y: 1 / 720 } },
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
    uniform float uSharpness;
    uniform vec2 uTexelSize;
    varying vec2 vUv;

    void main() {
      vec2 centered = vUv - 0.5;
      float dist = length(centered);

      vec4 base = texture2D(tDiffuse, vUv);
      vec3 col = base.rgb;

      // Contrast Adaptive Sharpening (5-tap cross with local min/max clamp to prevent edge halos)
      if (uSharpness > 0.005) {
        vec3 n = texture2D(tDiffuse, clamp(vUv + vec2(0.0, uTexelSize.y), 0.001, 0.999)).rgb;
        vec3 s = texture2D(tDiffuse, clamp(vUv - vec2(0.0, uTexelSize.y), 0.001, 0.999)).rgb;
        vec3 e = texture2D(tDiffuse, clamp(vUv + vec2(uTexelSize.x, 0.0), 0.001, 0.999)).rgb;
        vec3 w = texture2D(tDiffuse, clamp(vUv - vec2(uTexelSize.x, 0.0), 0.001, 0.999)).rgb;
        vec3 mn = min(col, min(min(n, s), min(e, w)));
        vec3 mx = max(col, max(max(n, s), max(e, w)));
        vec3 amp = clamp(min(mn, 1.0 - mx) / max(mx, vec3(0.001)), 0.0, 1.0);
        vec3 weight = sqrt(amp) * (-0.16 * uSharpness);
        vec3 sharpened = (col + (n + s + e + w) * weight) / (1.0 + 4.0 * weight);
        col = clamp(sharpened, mn * 0.92, mx * 1.08);
      }

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
      float vig = smoothstep(0.48, 0.98, dist);
      vec3 shadowTint = vec3(0.03, 0.04, 0.09);
      col = mix(col, mix(col * 0.55, shadowTint, 0.32), vig * uVignette);

      gl_FragColor = vec4(col, base.a);
    }
  `,
};

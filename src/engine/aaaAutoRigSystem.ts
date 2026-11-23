import * as THREE from 'three';

export type AutoRigArchetype =
  | 'fire_lion'
  | 'stone_guardian'
  | 'flame_spirit'
  | 'sun_spearman'
  | 'winged_solar_lion'
  | 'solar_lion_boss';

export type AutoRigTelegraphType = 'none' | 'shot' | 'lunge' | 'slam' | 'spiral' | 'lane';
export type AutoRigBurstType = 'none' | 'lunge' | 'slam' | 'cast' | 'roar';

export interface AutoRigCalibrationSpec {
  readonly archetype: AutoRigArchetype;
  readonly targetHeight: number;
  readonly hoverOffsetY: number;
  readonly facingYawOffset: number;
  readonly trailColorHex: number;
  readonly trailAccentHex: number;
  readonly trailWidth: number;
}

/**
 * Calibrated from direct 3D vertex/silhouette inspection of all 6 Chapter 1 GLB models:
 * - fire_lion raw sculpt sits rotated +55 deg off-axis -> -0.96 rad aligns snout straight +Z
 * - flame_spirit raw sculpt faces -Z (tail at +Z) -> Math.PI aligns hands/head +Z, flame tail -Z
 * - sun_spearman raw sculpt holds spear slightly oblique -> -0.14 rad aligns martial guard +Z
 * - stone_guardian, winged_solar_lion, solar_lion_boss face +Z natively (0 rad)
 */
export const AUTO_RIG_CALIBRATION: Record<AutoRigArchetype, AutoRigCalibrationSpec> = {
  fire_lion: {
    archetype: 'fire_lion',
    targetHeight: 1.55,
    hoverOffsetY: 0,
    facingYawOffset: -0.96,
    trailColorHex: 0xff6b2b,
    trailAccentHex: 0xfde047,
    trailWidth: 0.22,
  },
  stone_guardian: {
    archetype: 'stone_guardian',
    targetHeight: 2.25,
    hoverOffsetY: 0,
    facingYawOffset: 0,
    trailColorHex: 0xf59e0b,
    trailAccentHex: 0xfef3c7,
    trailWidth: 0.28,
  },
  flame_spirit: {
    archetype: 'flame_spirit',
    targetHeight: 1.75,
    hoverOffsetY: 0.26,
    facingYawOffset: Math.PI,
    trailColorHex: 0xf97316,
    trailAccentHex: 0xfde68a,
    trailWidth: 0.2,
  },
  sun_spearman: {
    archetype: 'sun_spearman',
    targetHeight: 1.85,
    hoverOffsetY: 0,
    facingYawOffset: -0.14,
    trailColorHex: 0x38bdf8,
    trailAccentHex: 0xfef08a,
    trailWidth: 0.24,
  },
  winged_solar_lion: {
    archetype: 'winged_solar_lion',
    targetHeight: 2.65,
    hoverOffsetY: 0.08,
    facingYawOffset: 0,
    trailColorHex: 0xfbbf24,
    trailAccentHex: 0xfff7ed,
    trailWidth: 0.36,
  },
  solar_lion_boss: {
    archetype: 'solar_lion_boss',
    targetHeight: 3.25,
    hoverOffsetY: 0,
    facingYawOffset: 0,
    trailColorHex: 0xf97316,
    trailAccentHex: 0xfef08a,
    trailWidth: 0.42,
  },
};

export interface RigBoneBlueprint {
  readonly name: string;
  readonly parent: number;
  /** Normalized coordinates inside model bounds: x in [-0.5..0.5]*W, y in [0..1]*H, z in [-0.5..0.5]*D */
  readonly headNorm: readonly [number, number, number];
  readonly tailNorm: readonly [number, number, number];
  readonly radiusRatio: number;
  readonly weightBias: number;
  /** -1 = left side only, +1 = right side only, 0 = centerline/unmasked */
  readonly sideSign: -1 | 0 | 1;
  /** Optional minimum |x|/halfW gating for wings/arms */
  readonly minAbsXNorm?: number;
  /** Optional Z gating for tails extending behind body */
  readonly maxZNorm?: number;
}

export interface RigAnchorBlueprint {
  readonly name: string;
  readonly boneName: string;
  /** Offset in normalized bounds from bone head toward tail (0 = head, 1 = tail) */
  readonly localTipNorm: readonly [number, number, number];
  readonly isPrimaryTrail: boolean;
}

export interface RigSchema {
  readonly archetype: AutoRigArchetype;
  readonly bones: readonly RigBoneBlueprint[];
  readonly anchors: readonly RigAnchorBlueprint[];
}

export const AUTO_RIG_SCHEMAS: Record<AutoRigArchetype, RigSchema> = {
  fire_lion: {
    archetype: 'fire_lion',
    bones: [
      { name: 'root', parent: -1, headNorm: [0, 0, 0], tailNorm: [0, 0.12, 0], radiusRatio: 0.05, weightBias: 0.01, sideSign: 0 },
      { name: 'pelvis', parent: 0, headNorm: [0, 0.44, -0.18], tailNorm: [0, 0.46, -0.04], radiusRatio: 0.24, weightBias: 1.0, sideSign: 0 },
      { name: 'spine', parent: 1, headNorm: [0, 0.46, -0.04], tailNorm: [0, 0.5, 0.14], radiusRatio: 0.25, weightBias: 1.1, sideSign: 0 },
      { name: 'chest', parent: 2, headNorm: [0, 0.5, 0.14], tailNorm: [0, 0.56, 0.3], radiusRatio: 0.26, weightBias: 1.15, sideSign: 0 },
      { name: 'head', parent: 3, headNorm: [0, 0.58, 0.28], tailNorm: [0, 0.72, 0.48], radiusRatio: 0.26, weightBias: 1.3, sideSign: 0 },
      { name: 'tail1', parent: 1, headNorm: [0, 0.52, -0.26], tailNorm: [0, 0.72, -0.38], radiusRatio: 0.2, weightBias: 1.25, sideSign: 0, maxZNorm: -0.15 },
      { name: 'tail2', parent: 5, headNorm: [0, 0.72, -0.38], tailNorm: [0, 0.96, -0.46], radiusRatio: 0.2, weightBias: 1.4, sideSign: 0, maxZNorm: -0.22 },
      { name: 'legFL', parent: 3, headNorm: [-0.22, 0.38, 0.22], tailNorm: [-0.24, 0.04, 0.3], radiusRatio: 0.18, weightBias: 1.3, sideSign: -1 },
      { name: 'legFR', parent: 3, headNorm: [0.22, 0.38, 0.22], tailNorm: [0.24, 0.04, 0.3], radiusRatio: 0.18, weightBias: 1.3, sideSign: 1 },
      { name: 'legBL', parent: 1, headNorm: [-0.22, 0.36, -0.18], tailNorm: [-0.24, 0.04, -0.24], radiusRatio: 0.18, weightBias: 1.25, sideSign: -1 },
      { name: 'legBR', parent: 1, headNorm: [0.22, 0.36, -0.18], tailNorm: [0.24, 0.04, -0.24], radiusRatio: 0.18, weightBias: 1.25, sideSign: 1 },
    ],
    anchors: [
      { name: 'clawL', boneName: 'legFL', localTipNorm: [-0.02, -0.32, 0.1], isPrimaryTrail: true },
      { name: 'clawR', boneName: 'legFR', localTipNorm: [0.02, -0.32, 0.1], isPrimaryTrail: true },
      { name: 'tailTip', boneName: 'tail2', localTipNorm: [0, 0.2, -0.06], isPrimaryTrail: false },
    ],
  },
  stone_guardian: {
    archetype: 'stone_guardian',
    bones: [
      { name: 'root', parent: -1, headNorm: [0, 0, 0], tailNorm: [0, 0.1, 0], radiusRatio: 0.05, weightBias: 0.01, sideSign: 0 },
      { name: 'pelvis', parent: 0, headNorm: [0, 0.42, -0.04], tailNorm: [0, 0.54, -0.04], radiusRatio: 0.26, weightBias: 1.0, sideSign: 0 },
      { name: 'spine', parent: 1, headNorm: [0, 0.54, -0.04], tailNorm: [0, 0.68, -0.02], radiusRatio: 0.28, weightBias: 1.05, sideSign: 0 },
      { name: 'chest', parent: 2, headNorm: [0, 0.68, -0.02], tailNorm: [0, 0.82, 0.0], radiusRatio: 0.28, weightBias: 1.1, sideSign: 0 },
      { name: 'head', parent: 3, headNorm: [0, 0.82, 0.0], tailNorm: [0, 0.98, 0.04], radiusRatio: 0.22, weightBias: 1.3, sideSign: 0 },
      { name: 'armL', parent: 3, headNorm: [-0.32, 0.72, -0.02], tailNorm: [-0.42, 0.48, 0.06], radiusRatio: 0.22, weightBias: 1.25, sideSign: -1, minAbsXNorm: 0.18 },
      { name: 'handL', parent: 5, headNorm: [-0.42, 0.48, 0.06], tailNorm: [-0.44, 0.3, 0.18], radiusRatio: 0.22, weightBias: 1.35, sideSign: -1, minAbsXNorm: 0.2 },
      { name: 'armR', parent: 3, headNorm: [0.32, 0.72, 0.02], tailNorm: [0.4, 0.48, 0.22], radiusRatio: 0.22, weightBias: 1.25, sideSign: 1, minAbsXNorm: 0.18 },
      { name: 'handR', parent: 7, headNorm: [0.4, 0.48, 0.22], tailNorm: [0.38, 0.34, 0.48], radiusRatio: 0.26, weightBias: 1.5, sideSign: 1, minAbsXNorm: 0.15 },
      { name: 'legL', parent: 1, headNorm: [-0.2, 0.38, -0.02], tailNorm: [-0.22, 0.04, 0.0], radiusRatio: 0.22, weightBias: 1.35, sideSign: -1 },
      { name: 'legR', parent: 1, headNorm: [0.2, 0.38, -0.02], tailNorm: [0.22, 0.04, 0.0], radiusRatio: 0.22, weightBias: 1.35, sideSign: 1 },
    ],
    anchors: [
      { name: 'weaponR', boneName: 'handR', localTipNorm: [0, -0.1, 0.28], isPrimaryTrail: true },
      { name: 'weaponL', boneName: 'handL', localTipNorm: [0, -0.14, 0.12], isPrimaryTrail: true },
    ],
  },
  flame_spirit: {
    archetype: 'flame_spirit',
    bones: [
      { name: 'root', parent: -1, headNorm: [0, 0, 0], tailNorm: [0, 0.1, 0], radiusRatio: 0.05, weightBias: 0.01, sideSign: 0 },
      { name: 'pelvis', parent: 0, headNorm: [0, 0.46, 0.0], tailNorm: [0, 0.58, 0.04], radiusRatio: 0.24, weightBias: 1.0, sideSign: 0 },
      { name: 'spine', parent: 1, headNorm: [0, 0.58, 0.04], tailNorm: [0, 0.72, 0.08], radiusRatio: 0.24, weightBias: 1.1, sideSign: 0 },
      { name: 'chest', parent: 2, headNorm: [0, 0.72, 0.08], tailNorm: [0, 0.84, 0.14], radiusRatio: 0.24, weightBias: 1.15, sideSign: 0 },
      { name: 'head', parent: 3, headNorm: [0, 0.84, 0.14], tailNorm: [0, 0.98, 0.22], radiusRatio: 0.22, weightBias: 1.35, sideSign: 0 },
      { name: 'armL', parent: 3, headNorm: [-0.26, 0.72, 0.1], tailNorm: [-0.44, 0.62, 0.24], radiusRatio: 0.22, weightBias: 1.35, sideSign: -1, minAbsXNorm: 0.18 },
      { name: 'armR', parent: 3, headNorm: [0.26, 0.72, 0.1], tailNorm: [0.44, 0.62, 0.24], radiusRatio: 0.22, weightBias: 1.35, sideSign: 1, minAbsXNorm: 0.18 },
      { name: 'tail1', parent: 1, headNorm: [0, 0.44, -0.02], tailNorm: [0, 0.3, -0.14], radiusRatio: 0.24, weightBias: 1.2, sideSign: 0 },
      { name: 'tail2', parent: 7, headNorm: [0, 0.3, -0.14], tailNorm: [0, 0.16, -0.28], radiusRatio: 0.24, weightBias: 1.3, sideSign: 0 },
      { name: 'tail3', parent: 8, headNorm: [0, 0.16, -0.28], tailNorm: [0, 0.03, -0.42], radiusRatio: 0.24, weightBias: 1.4, sideSign: 0 },
    ],
    anchors: [
      { name: 'handL', boneName: 'armL', localTipNorm: [-0.16, -0.06, 0.14], isPrimaryTrail: true },
      { name: 'handR', boneName: 'armR', localTipNorm: [0.16, -0.06, 0.14], isPrimaryTrail: true },
      { name: 'tailTip', boneName: 'tail3', localTipNorm: [0, -0.1, -0.12], isPrimaryTrail: false },
    ],
  },
  sun_spearman: {
    archetype: 'sun_spearman',
    bones: [
      { name: 'root', parent: -1, headNorm: [0, 0, 0], tailNorm: [0, 0.1, 0], radiusRatio: 0.05, weightBias: 0.01, sideSign: 0 },
      { name: 'pelvis', parent: 0, headNorm: [0, 0.42, 0.0], tailNorm: [0, 0.54, 0.0], radiusRatio: 0.24, weightBias: 1.0, sideSign: 0 },
      { name: 'spine', parent: 1, headNorm: [0, 0.54, 0.0], tailNorm: [0, 0.68, 0.02], radiusRatio: 0.24, weightBias: 1.1, sideSign: 0 },
      { name: 'chest', parent: 2, headNorm: [0, 0.68, 0.02], tailNorm: [0, 0.82, 0.02], radiusRatio: 0.24, weightBias: 1.15, sideSign: 0 },
      { name: 'head', parent: 3, headNorm: [0, 0.82, 0.02], tailNorm: [0, 0.98, 0.04], radiusRatio: 0.2, weightBias: 1.3, sideSign: 0 },
      { name: 'armL', parent: 3, headNorm: [-0.26, 0.72, 0.02], tailNorm: [-0.38, 0.48, 0.12], radiusRatio: 0.2, weightBias: 1.25, sideSign: -1, minAbsXNorm: 0.18 },
      { name: 'armR', parent: 3, headNorm: [0.24, 0.72, 0.04], tailNorm: [0.34, 0.54, 0.18], radiusRatio: 0.22, weightBias: 1.25, sideSign: 1, minAbsXNorm: 0.14 },
      { name: 'spear', parent: 6, headNorm: [0.3, 0.58, 0.16], tailNorm: [0.44, 0.94, 0.36], radiusRatio: 0.22, weightBias: 1.5, sideSign: 1, minAbsXNorm: 0.16 },
      { name: 'legL', parent: 1, headNorm: [-0.2, 0.38, 0.0], tailNorm: [-0.24, 0.04, 0.02], radiusRatio: 0.2, weightBias: 1.35, sideSign: -1 },
      { name: 'legR', parent: 1, headNorm: [0.18, 0.38, 0.0], tailNorm: [0.2, 0.04, 0.02], radiusRatio: 0.2, weightBias: 1.35, sideSign: 1 },
      { name: 'cape', parent: 2, headNorm: [0, 0.6, -0.14], tailNorm: [0, 0.24, -0.28], radiusRatio: 0.22, weightBias: 1.15, sideSign: 0, maxZNorm: -0.08 },
    ],
    anchors: [
      { name: 'spearTip', boneName: 'spear', localTipNorm: [0.14, 0.34, 0.22], isPrimaryTrail: true },
    ],
  },
  winged_solar_lion: {
    archetype: 'winged_solar_lion',
    bones: [
      { name: 'root', parent: -1, headNorm: [0, 0, 0], tailNorm: [0, 0.1, 0], radiusRatio: 0.05, weightBias: 0.01, sideSign: 0 },
      { name: 'pelvis', parent: 0, headNorm: [0, 0.38, 0.06], tailNorm: [0, 0.48, 0.1], radiusRatio: 0.22, weightBias: 1.0, sideSign: 0 },
      { name: 'spine', parent: 1, headNorm: [0, 0.48, 0.1], tailNorm: [0, 0.6, 0.14], radiusRatio: 0.22, weightBias: 1.1, sideSign: 0 },
      { name: 'chest', parent: 2, headNorm: [0, 0.6, 0.14], tailNorm: [0, 0.76, 0.18], radiusRatio: 0.22, weightBias: 1.15, sideSign: 0 },
      { name: 'head', parent: 3, headNorm: [0, 0.76, 0.18], tailNorm: [0, 0.96, 0.26], radiusRatio: 0.22, weightBias: 1.35, sideSign: 0 },
      { name: 'wingL1', parent: 3, headNorm: [-0.16, 0.62, 0.06], tailNorm: [-0.34, 0.68, 0.0], radiusRatio: 0.24, weightBias: 1.45, sideSign: -1, minAbsXNorm: 0.15 },
      { name: 'wingL2', parent: 5, headNorm: [-0.34, 0.68, 0.0], tailNorm: [-0.5, 0.72, -0.08], radiusRatio: 0.26, weightBias: 1.65, sideSign: -1, minAbsXNorm: 0.28 },
      { name: 'wingR1', parent: 3, headNorm: [0.16, 0.62, 0.06], tailNorm: [0.34, 0.68, 0.0], radiusRatio: 0.24, weightBias: 1.45, sideSign: 1, minAbsXNorm: 0.15 },
      { name: 'wingR2', parent: 7, headNorm: [0.34, 0.68, 0.0], tailNorm: [0.5, 0.72, -0.08], radiusRatio: 0.26, weightBias: 1.65, sideSign: 1, minAbsXNorm: 0.28 },
      { name: 'tail1', parent: 1, headNorm: [0, 0.36, -0.06], tailNorm: [0, 0.32, -0.26], radiusRatio: 0.22, weightBias: 1.3, sideSign: 0, maxZNorm: 0.02 },
      { name: 'tail2', parent: 9, headNorm: [0, 0.32, -0.26], tailNorm: [0, 0.26, -0.46], radiusRatio: 0.22, weightBias: 1.4, sideSign: 0, maxZNorm: -0.15 },
      { name: 'tail3', parent: 10, headNorm: [0, 0.26, -0.46], tailNorm: [0, 0.22, -0.66], radiusRatio: 0.24, weightBias: 1.5, sideSign: 0, maxZNorm: -0.32 },
      { name: 'legL', parent: 1, headNorm: [-0.14, 0.34, 0.1], tailNorm: [-0.16, 0.04, 0.14], radiusRatio: 0.18, weightBias: 1.35, sideSign: -1 },
      { name: 'legR', parent: 1, headNorm: [0.14, 0.34, 0.1], tailNorm: [0.16, 0.04, 0.14], radiusRatio: 0.18, weightBias: 1.35, sideSign: 1 },
    ],
    anchors: [
      { name: 'wingTipL', boneName: 'wingL2', localTipNorm: [-0.16, 0.04, -0.06], isPrimaryTrail: true },
      { name: 'wingTipR', boneName: 'wingR2', localTipNorm: [0.16, 0.04, -0.06], isPrimaryTrail: true },
      { name: 'tailTip', boneName: 'tail3', localTipNorm: [0, -0.02, -0.16], isPrimaryTrail: false },
    ],
  },
  solar_lion_boss: {
    archetype: 'solar_lion_boss',
    bones: [
      { name: 'root', parent: -1, headNorm: [0, 0, 0], tailNorm: [0, 0.1, 0], radiusRatio: 0.05, weightBias: 0.01, sideSign: 0 },
      { name: 'pelvis', parent: 0, headNorm: [0, 0.38, 0.02], tailNorm: [0, 0.5, 0.04], radiusRatio: 0.24, weightBias: 1.0, sideSign: 0 },
      { name: 'spine', parent: 1, headNorm: [0, 0.5, 0.04], tailNorm: [0, 0.64, 0.06], radiusRatio: 0.24, weightBias: 1.1, sideSign: 0 },
      { name: 'chest', parent: 2, headNorm: [0, 0.64, 0.06], tailNorm: [0, 0.78, 0.08], radiusRatio: 0.26, weightBias: 1.15, sideSign: 0 },
      { name: 'head', parent: 3, headNorm: [0, 0.78, 0.08], tailNorm: [0, 0.98, 0.14], radiusRatio: 0.24, weightBias: 1.35, sideSign: 0 },
      { name: 'armL', parent: 3, headNorm: [-0.26, 0.68, 0.06], tailNorm: [-0.4, 0.48, 0.14], radiusRatio: 0.22, weightBias: 1.3, sideSign: -1, minAbsXNorm: 0.16 },
      { name: 'handL', parent: 5, headNorm: [-0.4, 0.48, 0.14], tailNorm: [-0.44, 0.28, 0.22], radiusRatio: 0.22, weightBias: 1.45, sideSign: -1, minAbsXNorm: 0.2 },
      { name: 'armR', parent: 3, headNorm: [0.26, 0.68, 0.06], tailNorm: [0.4, 0.48, 0.14], radiusRatio: 0.22, weightBias: 1.3, sideSign: 1, minAbsXNorm: 0.16 },
      { name: 'handR', parent: 7, headNorm: [0.4, 0.48, 0.14], tailNorm: [0.44, 0.28, 0.22], radiusRatio: 0.22, weightBias: 1.45, sideSign: 1, minAbsXNorm: 0.2 },
      { name: 'legL', parent: 1, headNorm: [-0.18, 0.36, 0.04], tailNorm: [-0.2, 0.04, 0.08], radiusRatio: 0.2, weightBias: 1.35, sideSign: -1 },
      { name: 'legR', parent: 1, headNorm: [0.18, 0.36, 0.04], tailNorm: [0.2, 0.04, 0.08], radiusRatio: 0.2, weightBias: 1.35, sideSign: 1 },
      { name: 'tail1', parent: 1, headNorm: [0, 0.44, -0.14], tailNorm: [0, 0.34, -0.32], radiusRatio: 0.22, weightBias: 1.3, sideSign: 0, maxZNorm: -0.06 },
      { name: 'tail2', parent: 11, headNorm: [0, 0.34, -0.32], tailNorm: [0, 0.18, -0.46], radiusRatio: 0.24, weightBias: 1.4, sideSign: 0, maxZNorm: -0.2 },
    ],
    anchors: [
      { name: 'clawL', boneName: 'handL', localTipNorm: [-0.04, -0.18, 0.12], isPrimaryTrail: true },
      { name: 'clawR', boneName: 'handR', localTipNorm: [0.04, -0.18, 0.12], isPrimaryTrail: true },
    ],
  },
};

export interface PreparedSkinnedMeshPart {
  readonly geometry: THREE.BufferGeometry;
  readonly material: THREE.Material | THREE.Material[];
  readonly castShadow: boolean;
  readonly receiveShadow: boolean;
}

export interface AutoRigBoneRestTransform {
  readonly name: string;
  readonly parent: number;
  readonly localPos: readonly [number, number, number];
}

export interface AutoRigAnchorSpec {
  readonly name: string;
  readonly boneName: string;
  readonly localOffset: readonly [number, number, number];
  readonly isPrimaryTrail: boolean;
}

export interface PreparedAutoRigTemplate {
  readonly archetype: AutoRigArchetype;
  readonly calibration: AutoRigCalibrationSpec;
  readonly parts: readonly PreparedSkinnedMeshPart[];
  readonly boneRest: readonly AutoRigBoneRestTransform[];
  readonly anchors: readonly AutoRigAnchorSpec[];
  readonly bounds: THREE.Box3;
  readonly size: THREE.Vector3;
  readonly sharedGeometries: Set<THREE.BufferGeometry>;
  readonly sharedTextures: Set<THREE.Texture>;
}

export interface AutoRigInstance {
  readonly archetype: AutoRigArchetype;
  readonly group: THREE.Group;
  readonly rootBone: THREE.Bone;
  readonly bones: readonly THREE.Bone[];
  readonly boneMap: Record<string, THREE.Bone>;
  readonly boneRestPos: readonly THREE.Vector3[];
  readonly skeleton: THREE.Skeleton;
  readonly skinnedMeshes: THREE.SkinnedMesh[];
  readonly anchors: Record<string, THREE.Object3D>;
  readonly primaryTrailAnchors: THREE.Object3D[];
  readonly state: AutoRigRuntimeState;
  readonly bounds: THREE.Box3;
}

export interface AutoRigRuntimeState {
  stridePhase: number;
  prevFootSin: number;
  wingPhase: number;
  moveBlend: number;
  prevSpeed: number;
  brakeLean: number;
  telegraphBlend: number;
  strikeBlend: number;
  stunBlend: number;
  aimYawSmooth: number;
  tailLagYaw: number;
  lastFacingYaw: number;
  hasInitYaw: boolean;
  footstepTriggered: boolean;
}

export function createAutoRigRuntimeState(): AutoRigRuntimeState {
  return {
    stridePhase: 0,
    prevFootSin: 0,
    wingPhase: 0,
    moveBlend: 0,
    prevSpeed: 0,
    brakeLean: 0,
    telegraphBlend: 0,
    strikeBlend: 0,
    stunBlend: 0,
    aimYawSmooth: 0,
    tailLagYaw: 0,
    lastFacingYaw: 0,
    hasInitYaw: false,
    footstepTriggered: false,
  };
}

function distSqPointToSegment(
  px: number,
  py: number,
  pz: number,
  ax: number,
  ay: number,
  az: number,
  bx: number,
  by: number,
  bz: number
): number {
  const abx = bx - ax;
  const aby = by - ay;
  const abz = bz - az;
  const abLenSq = abx * abx + aby * aby + abz * abz;
  let t = 0;
  if (abLenSq > 1e-8) {
    t = ((px - ax) * abx + (py - ay) * aby + (pz - az) * abz) / abLenSq;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
  }
  const cx = ax + abx * t - px;
  const cy = ay + aby * t - py;
  const cz = az + abz * t - pz;
  return cx * cx + cy * cy + cz * cz;
}

/**
 * Computes smooth, normalized 4-bone capsule skinning weights directly on a normalized BufferGeometry.
 * Every vertex is guaranteed to sum strictly to 1.0 with zero NaN and clean left/right limb isolation.
 */
export function computeCapsuleSkinAttributes(
  geometry: THREE.BufferGeometry,
  schema: RigSchema,
  size: THREE.Vector3,
  hoverOffsetY: number
): {
  boneWorldHeads: THREE.Vector3[];
  boneWorldTails: THREE.Vector3[];
} {
  const posAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
  const vertCount = posAttr.count;
  const boneCount = schema.bones.length;

  const w = Math.max(0.2, size.x);
  const h = Math.max(0.2, size.y);
  const d = Math.max(0.2, size.z);
  const halfW = w * 0.5;
  const halfD = d * 0.5;
  const diag = Math.hypot(w, h, d);

  const boneWorldHeads: THREE.Vector3[] = [];
  const boneWorldTails: THREE.Vector3[] = [];
  const boneRadiiSq: number[] = [];

  for (let b = 0; b < boneCount; b++) {
    const bp = schema.bones[b];
    const hx = bp.headNorm[0] * w;
    const hy = bp.headNorm[1] * h + hoverOffsetY;
    const hz = bp.headNorm[2] * d;
    const tx = bp.tailNorm[0] * w;
    const ty = bp.tailNorm[1] * h + hoverOffsetY;
    const tz = bp.tailNorm[2] * d;
    boneWorldHeads.push(new THREE.Vector3(hx, hy, hz));
    boneWorldTails.push(new THREE.Vector3(tx, ty, tz));
    const r = Math.max(0.04, bp.radiusRatio * diag * 0.35);
    boneRadiiSq.push(r * r);
  }

  const skinIndices = new Uint16Array(vertCount * 4);
  const skinWeights = new Float32Array(vertCount * 4);

  const topIdx = new Int32Array(4);
  const topW = new Float32Array(4);

  for (let v = 0; v < vertCount; v++) {
    const vx = posAttr.getX(v);
    const vy = posAttr.getY(v);
    const vz = posAttr.getZ(v);

    topIdx[0] = 1;
    topIdx[1] = 0;
    topIdx[2] = 0;
    topIdx[3] = 0;
    topW[0] = 0;
    topW[1] = 0;
    topW[2] = 0;
    topW[3] = 0;

    for (let b = 1; b < boneCount; b++) {
      const bp = schema.bones[b];
      const head = boneWorldHeads[b];
      const tail = boneWorldTails[b];
      const dSq = distSqPointToSegment(
        vx,
        vy,
        vz,
        head.x,
        head.y,
        head.z,
        tail.x,
        tail.y,
        tail.z
      );

      // Smooth inverse-distance kernel with anatomical side & region masks
      const normDistSq = dSq / boneRadiiSq[b];
      let weight = bp.weightBias / Math.pow(normDistSq + 0.14, 1.85);

      if (bp.sideSign !== 0) {
        const signedX = (vx / Math.max(0.05, halfW)) * bp.sideSign;
        if (signedX < -0.06) {
          weight *= 0.015;
        } else if (signedX < 0.08) {
          weight *= 0.25 + ((signedX + 0.06) / 0.14) * 0.75;
        }
      }

      if (bp.minAbsXNorm !== undefined) {
        const absXNorm = Math.abs(vx) / Math.max(0.05, w);
        if (absXNorm < bp.minAbsXNorm * 0.75) {
          weight *= 0.04;
        } else if (absXNorm < bp.minAbsXNorm) {
          const t = (absXNorm - bp.minAbsXNorm * 0.75) / (bp.minAbsXNorm * 0.25);
          weight *= 0.04 + t * 0.96;
        }
      }

      if (bp.maxZNorm !== undefined) {
        const zNorm = vz / Math.max(0.05, d);
        if (zNorm > bp.maxZNorm + 0.14) {
          weight *= 0.03;
        } else if (zNorm > bp.maxZNorm) {
          const t = 1 - (zNorm - bp.maxZNorm) / 0.14;
          weight *= 0.03 + t * 0.97;
        }
      }

      // Insert into top-4 sorted list
      if (weight > topW[3]) {
        let pos = 3;
        while (pos > 0 && weight > topW[pos - 1]) {
          topW[pos] = topW[pos - 1];
          topIdx[pos] = topIdx[pos - 1];
          pos--;
        }
        topW[pos] = weight;
        topIdx[pos] = b;
      }
    }

    // Prune microscopic influences (< 3% of strongest) for crisp, non-mushy limbs
    const maxW = topW[0];
    let sum = 0;
    for (let k = 0; k < 4; k++) {
      if (topW[k] < maxW * 0.035) {
        topW[k] = 0;
      }
      sum += topW[k];
    }

    const base = v * 4;
    if (sum <= 1e-8 || !Number.isFinite(sum)) {
      skinIndices[base] = 1;
      skinIndices[base + 1] = 0;
      skinIndices[base + 2] = 0;
      skinIndices[base + 3] = 0;
      skinWeights[base] = 1;
      skinWeights[base + 1] = 0;
      skinWeights[base + 2] = 0;
      skinWeights[base + 3] = 0;
    } else {
      const inv = 1 / sum;
      for (let k = 0; k < 4; k++) {
        skinIndices[base + k] = topIdx[k];
        skinWeights[base + k] = topW[k] * inv;
      }
    }
  }

  geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndices, 4));
  geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeights, 4));
  // Guard against subtle half-D unused lint
  void halfD;
  return { boneWorldHeads, boneWorldTails };
}

/**
 * Bakes calibrated facing orientation (+Z), uniform targetHeight scale, and floor grounding (y = 0)
 * directly into shared template BufferGeometries, then auto-rigs smooth 4-bone GPU skinning weights.
 */
export function prepareAutoRigTemplate(
  archetype: AutoRigArchetype,
  gltfScene: THREE.Object3D,
  maxAnisotropy = 4,
  options?: { liteMode?: boolean; facingYawOffset?: number; targetHeight?: number; hoverOffsetY?: number }
): PreparedAutoRigTemplate {
  const calibration = AUTO_RIG_CALIBRATION[archetype];
  const schema = AUTO_RIG_SCHEMAS[archetype];
  const liteMode = Boolean(options?.liteMode);
  const yawOffset = options?.facingYawOffset ?? calibration.facingYawOffset;

  // Step 1: Rotate scene to calibrated facing (+Z) and measure true world bounds
  const measureRoot = new THREE.Group();
  const yawPivot = new THREE.Group();
  yawPivot.rotation.y = yawOffset;
  yawPivot.add(gltfScene);
  measureRoot.add(yawPivot);
  measureRoot.updateMatrixWorld(true);

  const rawBox = new THREE.Box3().setFromObject(measureRoot);
  const rawSize = new THREE.Vector3();
  const rawCenter = new THREE.Vector3();
  rawBox.getSize(rawSize);
  rawBox.getCenter(rawCenter);

  const rawHeight = Math.max(0.001, rawSize.y);
  const targetHeight = options?.targetHeight ?? calibration.targetHeight;
  const hoverOffsetY = options?.hoverOffsetY ?? calibration.hoverOffsetY;
  const scale = targetHeight / rawHeight;

  // Transform placing model centered on X/Z, grounded flush at y = hoverOffsetY, height = targetHeight
  const normalizeMatrix = new THREE.Matrix4().compose(
    new THREE.Vector3(
      -rawCenter.x * scale,
      -rawBox.min.y * scale + hoverOffsetY,
      -rawCenter.z * scale
    ),
    new THREE.Quaternion(),
    new THREE.Vector3(scale, scale, scale)
  );

  const normalizedSize = rawSize.clone().multiplyScalar(scale);
  const anisoCap = liteMode ? 2 : 8;
  const aniso = Math.max(1, Math.min(anisoCap, Math.floor(maxAnisotropy || 1)));

  const sharedGeometries = new Set<THREE.BufferGeometry>();
  const sharedTextures = new Set<THREE.Texture>();
  const parts: PreparedSkinnedMeshPart[] = [];

  let computedHeads: THREE.Vector3[] | null = null;
  const bakedMatrix = new THREE.Matrix4();
  const fullBounds = new THREE.Box3();

  gltfScene.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh) || !obj.geometry) return;

    const geo = obj.geometry.clone();
    bakedMatrix.multiplyMatrices(normalizeMatrix, obj.matrixWorld);
    geo.applyMatrix4(bakedMatrix);
    if (!geo.getAttribute('normal')) {
      geo.computeVertexNormals();
    }
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    const { boneWorldHeads } = computeCapsuleSkinAttributes(
      geo,
      schema,
      normalizedSize,
      calibration.hoverOffsetY
    );
    if (!computedHeads) {
      computedHeads = boneWorldHeads;
    }

    geo.userData = {
      ...(geo.userData ?? {}),
      sharedCachedGeometry: true,
      autoRigArchetype: archetype,
    };
    sharedGeometries.add(geo);
    if (geo.boundingBox) {
      fullBounds.union(geo.boundingBox);
    }

    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat) continue;
      if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshPhysicalMaterial) {
        const registerTex = (tex: THREE.Texture | null | undefined, isSrgb: boolean) => {
          if (!tex) return;
          if (isSrgb) tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = aniso;
          tex.userData = {
            ...(tex.userData ?? {}),
            sharedCachedTexture: true,
          };
          tex.needsUpdate = true;
          sharedTextures.add(tex);
        };
        registerTex(mat.map, true);
        registerTex(mat.normalMap, false);
        registerTex(mat.roughnessMap, false);
        registerTex(mat.metalnessMap, false);
        mat.envMapIntensity = liteMode ? 1.05 : 1.32;
        mat.needsUpdate = true;
      }
    }

    parts.push({
      geometry: geo,
      material: obj.material,
      castShadow: !liteMode,
      receiveShadow: true,
    });
  });

  // Fallback heads if scene had zero meshes (defensive)
  if (!computedHeads) {
    computedHeads = schema.bones.map(
      (bp) =>
        new THREE.Vector3(
          bp.headNorm[0] * normalizedSize.x,
          bp.headNorm[1] * normalizedSize.y + calibration.hoverOffsetY,
          bp.headNorm[2] * normalizedSize.z
        )
    );
  }

  // Convert world bone heads into parent-relative local bone offsets
  const boneRest: AutoRigBoneRestTransform[] = schema.bones.map((bp, idx) => {
    const head = computedHeads![idx];
    if (bp.parent < 0) {
      return { name: bp.name, parent: -1, localPos: [head.x, head.y, head.z] };
    }
    const parentHead = computedHeads![bp.parent];
    return {
      name: bp.name,
      parent: bp.parent,
      localPos: [head.x - parentHead.x, head.y - parentHead.y, head.z - parentHead.z],
    };
  });

  const anchors: AutoRigAnchorSpec[] = schema.anchors.map((a) => ({
    name: a.name,
    boneName: a.boneName,
    localOffset: [
      a.localTipNorm[0] * normalizedSize.x,
      a.localTipNorm[1] * normalizedSize.y,
      a.localTipNorm[2] * normalizedSize.z,
    ],
    isPrimaryTrail: a.isPrimaryTrail,
  }));

  return {
    archetype,
    calibration,
    parts,
    boneRest,
    anchors,
    bounds: fullBounds.isEmpty()
      ? new THREE.Box3(
          new THREE.Vector3(-0.5, 0, -0.5),
          new THREE.Vector3(0.5, calibration.targetHeight, 0.5)
        )
      : fullBounds,
    size: normalizedSize,
    sharedGeometries,
    sharedTextures,
  };
}

/**
 * Instantiates a combat-ready SkinnedMesh rig from a prepared template.
 * Shares 100% of GPU BufferGeometries and Textures across instances while giving every creature
 * its own lightweight Skeleton (10-14 Bones), cloned Material for hit-flash, and Bone Anchors.
 */
export function instantiateAutoRigModel(
  template: PreparedAutoRigTemplate,
  options?: {
    heightMultiplier?: number;
    emissiveTintHex?: number;
    emissiveIntensity?: number;
  }
): AutoRigInstance {
  const group = new THREE.Group();
  group.name = `AutoRigInstance_${template.archetype}`;
  const heightMult = options?.heightMultiplier ?? 1.0;

  // Construct fresh Bone hierarchy at exact unit rest offsets (before heightMultiplier scaling)
  const bones: THREE.Bone[] = [];
  const boneMap: Record<string, THREE.Bone> = {};
  const boneRestPos: THREE.Vector3[] = [];

  for (let i = 0; i < template.boneRest.length; i++) {
    const rest = template.boneRest[i];
    const bone = new THREE.Bone();
    bone.name = rest.name;
    bone.position.set(rest.localPos[0], rest.localPos[1], rest.localPos[2]);
    bones.push(bone);
    boneMap[rest.name] = bone;
    boneRestPos.push(new THREE.Vector3(rest.localPos[0], rest.localPos[1], rest.localPos[2]));
    if (rest.parent >= 0) {
      bones[rest.parent].add(bone);
    } else {
      group.add(bone);
    }
  }

  const rootBone = bones[0];
  const skeleton = new THREE.Skeleton(bones);
  group.updateMatrixWorld(true);

  const skinnedMeshes: THREE.SkinnedMesh[] = [];
  const cloneMat = (src: THREE.Material): THREE.Material => {
    const cloned = src.clone();
    if (
      (cloned instanceof THREE.MeshStandardMaterial ||
        cloned instanceof THREE.MeshPhysicalMaterial) &&
      options?.emissiveTintHex !== undefined
    ) {
      cloned.emissive.setHex(options.emissiveTintHex);
      cloned.emissiveIntensity = options.emissiveIntensity ?? 0.2;
    }
    return cloned;
  };

  for (const part of template.parts) {
    const mat = Array.isArray(part.material)
      ? part.material.map(cloneMat)
      : cloneMat(part.material);
    const skinned = new THREE.SkinnedMesh(part.geometry, mat);
    skinned.castShadow = part.castShadow;
    skinned.receiveShadow = part.receiveShadow;
    skinned.frustumCulled = false;
    group.add(skinned);
    skinned.updateMatrixWorld(true);
    skinned.bind(skeleton);
    skinnedMeshes.push(skinned);
  }

  // Attach bone anchors for weapon/claw/wingtip ribbon trails
  const anchors: Record<string, THREE.Object3D> = {};
  const primaryTrailAnchors: THREE.Object3D[] = [];
  for (const aSpec of template.anchors) {
    const hostBone = boneMap[aSpec.boneName] ?? rootBone;
    const anchor = new THREE.Object3D();
    anchor.name = `Anchor_${aSpec.name}`;
    anchor.position.set(aSpec.localOffset[0], aSpec.localOffset[1], aSpec.localOffset[2]);
    hostBone.add(anchor);
    anchors[aSpec.name] = anchor;
    if (aSpec.isPrimaryTrail) {
      primaryTrailAnchors.push(anchor);
    }
  }

  // Apply uniform heightMultiplier after unit-space skeleton bind so bind matrices stay pure identity
  if (Math.abs(heightMult - 1.0) > 0.001) {
    group.scale.setScalar(heightMult);
  }
  group.updateMatrixWorld(true);
  const scaledBounds = template.bounds.clone();
  if (Math.abs(heightMult - 1.0) > 0.001) {
    scaledBounds.min.multiplyScalar(heightMult);
    scaledBounds.max.multiplyScalar(heightMult);
  }

  return {
    archetype: template.archetype,
    group,
    rootBone,
    bones,
    boneMap,
    boneRestPos,
    skeleton,
    skinnedMeshes,
    anchors,
    primaryTrailAnchors,
    state: createAutoRigRuntimeState(),
    bounds: scaledBounds,
  };
}

export interface AutoRigPoseInput {
  readonly elapsed: number;
  readonly dt: number;
  readonly phaseAngle: number;
  readonly speed: number;
  readonly maxSpeed: number;
  readonly lateralSpeed: number;
  readonly facingYaw: number;
  readonly targetYaw?: number;
  readonly telegraphType: AutoRigTelegraphType;
  readonly telegraphProgress: number;
  readonly burstType: AutoRigBurstType;
  readonly burstTimer: number;
  readonly bossPhase: 1 | 2 | 3;
  readonly stunTimer: number;
  readonly hitFlashTimer: number;
  readonly recoilPitch: number;
  readonly recoilRoll: number;
  readonly isDashing?: boolean;
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function wrapAngle(a: number): number {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

function dampRot(
  bone: THREE.Bone | undefined,
  rx: number,
  ry: number,
  rz: number,
  lambda: number,
  dt: number
): void {
  if (!bone) return;
  bone.rotation.x = THREE.MathUtils.damp(bone.rotation.x, rx, lambda, dt);
  bone.rotation.y = THREE.MathUtils.damp(bone.rotation.y, ry, lambda, dt);
  bone.rotation.z = THREE.MathUtils.damp(bone.rotation.z, rz, lambda, dt);
}

/**
 * Updates the real 10–14 bone Skeleton with AAA layered combat choreography:
 * - Distance-driven foot stride (zero ice-skating, synced footstep triggers)
 * - Acceleration lean & heavy braking compression
 * - Articulated limbs, multi-joint wings, traveling-wave tails, and weapon thrusts
 * - Independent head aim-tracking + directional hit-flinch + guard-break stagger
 * Zero per-frame GC allocations.
 */
export function updateAutoRigPose(instance: AutoRigInstance, input: AutoRigPoseInput): void {
  const dt = clamp(input.dt, 0.001, 0.05);
  const st = instance.state;
  const bm = instance.boneMap;
  const arch = instance.archetype;

  const normMaxSpd = Math.max(1.8, input.maxSpeed);
  const speedRatio = clamp(input.speed / normMaxSpd, 0, 1.8);
  const phaseTempo = input.bossPhase === 3 ? 1.32 : input.bossPhase === 2 ? 1.16 : 1.0;

  // Distance-driven stride phase so limbs match floor travel speed accurately
  const strideFreq =
    arch === 'fire_lion'
      ? 2.55
      : arch === 'stone_guardian'
      ? 1.35
      : arch === 'solar_lion_boss'
      ? 1.55
      : arch === 'winged_solar_lion'
      ? 1.75
      : 2.05;
  if (input.stunTimer <= 0 && !input.isDashing) {
    st.stridePhase += input.speed * dt * strideFreq * phaseTempo;
  }
  st.wingPhase += dt * (4.6 + speedRatio * 3.8 + (input.isDashing ? 5.0 : 0)) * phaseTempo;

  // Detect foot-plant zero-crossing for grounded dust / stomp feel
  const footSin = Math.sin(st.stridePhase);
  st.footstepTriggered =
    speedRatio > 0.28 &&
    input.stunTimer <= 0 &&
    !input.isDashing &&
    ((st.prevFootSin >= 0 && footSin < 0) || (st.prevFootSin < 0 && footSin >= 0));
  st.prevFootSin = footSin;

  // Smooth state blend weights (zero abrupt snaps between Idle / Run / Windup / Strike / Stun)
  st.moveBlend = THREE.MathUtils.damp(st.moveBlend, speedRatio > 0.08 ? clamp(speedRatio, 0, 1.25) : 0, 9.5, dt);
  const rawAccel = (input.speed - st.prevSpeed) / dt;
  st.prevSpeed = input.speed;
  const targetBrakeLean = clamp(rawAccel * 0.018, -0.22, 0.16);
  st.brakeLean = THREE.MathUtils.damp(st.brakeLean, targetBrakeLean, 8.5, dt);

  const teleTarget = input.telegraphType !== 'none' && input.stunTimer <= 0 ? 1 : 0;
  st.telegraphBlend = THREE.MathUtils.damp(st.telegraphBlend, teleTarget, 14, dt);

  const burstRatio = input.burstTimer > 0 && input.burstType !== 'none' ? clamp(input.burstTimer / 0.36, 0, 1) : 0;
  st.strikeBlend = THREE.MathUtils.damp(st.strikeBlend, burstRatio, 18, dt);
  st.stunBlend = THREE.MathUtils.damp(st.stunBlend, input.stunTimer > 0 ? 1 : 0, 11, dt);

  // Independent head aim-tracking & tail angular momentum lag
  const desiredAimDelta =
    input.targetYaw !== undefined ? clamp(wrapAngle(input.targetYaw - input.facingYaw), -0.48, 0.48) : 0;
  st.aimYawSmooth = THREE.MathUtils.damp(st.aimYawSmooth, desiredAimDelta, 10, dt);

  if (!st.hasInitYaw) {
    st.lastFacingYaw = input.facingYaw;
    st.hasInitYaw = true;
  }
  const yawVel = wrapAngle(input.facingYaw - st.lastFacingYaw) / dt;
  st.lastFacingYaw = input.facingYaw;
  st.tailLagYaw = THREE.MathUtils.damp(st.tailLagYaw, clamp(-yawVel * 0.14, -0.52, 0.52), 7.5, dt);

  const t = input.elapsed + input.phaseAngle;
  const breath = Math.sin(t * 2.9 * phaseTempo);
  const move = st.moveBlend;
  const tp = clamp(input.telegraphProgress, 0, 1);
  const tele = st.telegraphBlend;
  const strike = st.strikeBlend;
  const stun = st.stunBlend;
  const bankRoll = clamp((-input.lateralSpeed / normMaxSpd) * 0.2, -0.22, 0.22);
  const hitShake = input.hitFlashTimer > 0 ? Math.sin(input.elapsed * 65 + input.phaseAngle) * 0.09 * clamp(input.hitFlashTimer / 0.12, 0, 1) : 0;

  // Pelvis root translation (breath, grounded bounce, crouch, brake compression, stagger kneel)
  const pelvis = bm.pelvis;
  const pelvisRest = instance.boneRestPos[1];
  let pelvisOffY = breath * 0.02;
  let pelvisOffZ = 0;
  let pelvisPitch = st.brakeLean * 0.55;
  let pelvisRoll = bankRoll * 0.65 + input.recoilRoll * 0.35;
  let pelvisYaw = 0;

  let spinePitch = breath * 0.03 + input.recoilPitch * 0.5;
  let spineYaw = 0;
  let spineRoll = bankRoll * 0.45 + input.recoilRoll * 0.45 + hitShake;

  let chestPitch = breath * 0.04 + input.recoilPitch * 0.45;
  let chestYaw = st.aimYawSmooth * 0.35;
  let chestRoll = input.recoilRoll * 0.35;

  let headPitch = -breath * 0.03 + input.recoilPitch * 0.65;
  let headYaw = st.aimYawSmooth * 0.72 + hitShake * 1.4;
  let headRoll = -bankRoll * 0.35 + input.recoilRoll * 0.5;

  const lam = 15;

  if (arch === 'fire_lion') {
    // True rotary quadruped gallop: front/back legs paired with spine flex & tail whip
    const g = st.stridePhase;
    const gallopAmp = 0.62 * move;
    const flSwing = Math.sin(g) * gallopAmp;
    const frSwing = Math.sin(g + 0.55) * gallopAmp;
    const blSwing = Math.sin(g + Math.PI) * gallopAmp * 0.95;
    const brSwing = Math.sin(g + Math.PI + 0.55) * gallopAmp * 0.95;

    pelvisOffY += Math.abs(Math.sin(g)) * 0.09 * move;
    spinePitch += Math.cos(g) * 0.18 * move;
    chestPitch += -Math.cos(g) * 0.14 * move;
    headPitch -= 0.06 * move; // Predator locks eyes flat on prey while galloping

    let legFLx = flSwing;
    let legFRx = frSwing;
    let legBLx = blSwing;
    let legBRx = brSwing;

    // Telegraph: low crouched stalking coil
    if (tele > 0.01) {
      const c = tele * (0.4 + tp * 0.6);
      pelvisOffY -= 0.16 * c;
      pelvisOffZ -= 0.12 * c;
      spinePitch -= 0.18 * c;
      chestPitch += 0.22 * c;
      headPitch -= 0.24 * c;
      legFLx -= 0.45 * c;
      legFRx -= 0.45 * c;
      legBLx += 0.38 * c;
      legBRx += 0.38 * c;
    }

    // Active Strike / Pounce: explosive front-claw slash reach
    if (strike > 0.01 || input.isDashing) {
      const s = Math.max(strike, input.isDashing ? 0.9 : 0);
      pelvisOffY += 0.12 * s;
      pelvisOffZ += 0.18 * s;
      spinePitch += 0.26 * s;
      chestPitch -= 0.18 * s;
      legFLx += 0.92 * s;
      legFRx += 0.78 * s;
      legBLx -= 0.68 * s;
      legBRx -= 0.68 * s;
    }

    // Stagger
    if (stun > 0.01) {
      pelvisOffY -= 0.14 * stun;
      headPitch += 0.32 * stun;
      headRoll += Math.sin(t * 14) * 0.22 * stun;
    }

    dampRot(bm.legFL, legFLx, 0, -0.06 * move, lam, dt);
    dampRot(bm.legFR, legFRx, 0, 0.06 * move, lam, dt);
    dampRot(bm.legBL, legBLx, 0, 0, lam, dt);
    dampRot(bm.legBR, legBRx, 0, 0, lam, dt);

    // Flaming arched tail whip
    const tailWag = Math.sin(t * 4.5 + g * 0.5) * (0.16 + move * 0.16) + st.tailLagYaw;
    dampRot(bm.tail1, -0.1 * move + tele * 0.22, tailWag, tailWag * 0.4, 11, dt);
    dampRot(bm.tail2, -0.15 * move - strike * 0.35, tailWag * 1.35, tailWag * 0.55, 10, dt);
  } else if (arch === 'stone_guardian') {
    // Heavy colossus march: deliberate stomps, counter-rotating shoulders, thunderous overhead slam
    const g = st.stridePhase;
    const stomp = Math.sin(g);
    const stepLift = Math.abs(stomp);
    pelvisOffY += stepLift * 0.075 * move;
    pelvisRoll += stomp * 0.1 * move;
    spineYaw += -stomp * 0.16 * move;
    chestYaw += -stomp * 0.12 * move;

    let legLx = stomp * 0.44 * move;
    let legRx = -stomp * 0.44 * move;
    let armLx = -stomp * 0.32 * move;
    let armRx = stomp * 0.28 * move;
    let armLz = -0.08;
    let armRz = 0.08;
    let handLx = 0.1;
    let handRx = 0.12;

    if (tele > 0.01) {
      // Raise massive stone arms & hammer high overhead before slam
      const c = tele * (0.35 + tp * 0.65);
      pelvisOffY += 0.06 * c;
      spinePitch -= 0.24 * c;
      chestPitch -= 0.18 * c;
      armLx = -1.45 * c;
      armRx = -1.65 * c;
      armLz = -0.25 * c;
      armRz = 0.25 * c;
      handLx = -0.3 * c;
      handRx = -0.4 * c;
    }

    if (strike > 0.01) {
      // Crushing downward seismic slam impact
      pelvisOffY -= 0.18 * strike;
      spinePitch += 0.42 * strike;
      chestPitch += 0.26 * strike;
      armLx = 0.85 * strike;
      armRx = 0.98 * strike;
      handRx = 0.42 * strike;
    }

    if (stun > 0.01) {
      pelvisOffY -= 0.22 * stun;
      spinePitch += 0.34 * stun;
      armLx = 0.28 * stun;
      armRx = 0.28 * stun;
    }

    dampRot(bm.legL, legLx, 0, 0, lam, dt);
    dampRot(bm.legR, legRx, 0, 0, lam, dt);
    dampRot(bm.armL, armLx, 0, armLz, lam, dt);
    dampRot(bm.handL, handLx, 0, 0, lam, dt);
    dampRot(bm.armR, armRx, 0, armRz, lam, dt);
    dampRot(bm.handR, handRx, 0, 0, lam, dt);
  } else if (arch === 'flame_spirit') {
    // Levitating zodiac mage: silky traveling-wave flame tail + expressive spellcasting hands
    const hover = Math.sin(t * 3.8);
    pelvisOffY += hover * 0.13;
    pelvisPitch += 0.14 * move;
    spinePitch += Math.sin(t * 3.1) * 0.07;

    let armLx = -0.18 + Math.sin(t * 3.2) * 0.14;
    let armRx = -0.18 + Math.cos(t * 3.2) * 0.14;
    let armLz = -0.22 - Math.sin(t * 2.5) * 0.12;
    let armRz = 0.22 + Math.sin(t * 2.5) * 0.12;
    let armLy = 0.15;
    let armRy = -0.15;

    if (tele > 0.01) {
      // Open arms wide & hover higher while channeling zodiac flame
      const c = tele * (0.4 + tp * 0.6);
      pelvisOffY += 0.18 * c;
      chestPitch -= 0.2 * c;
      armLx = -0.68 * c;
      armRx = -0.68 * c;
      armLz = -0.65 * c;
      armRz = 0.65 * c;
    }

    if (strike > 0.01) {
      // Snap both palms forward to release fire volley / solar rune mortar
      pelvisOffZ += 0.16 * strike;
      chestPitch += 0.24 * strike;
      armLx = 0.55 * strike;
      armRx = 0.55 * strike;
      armLy = -0.35 * strike;
      armRy = 0.35 * strike;
      armLz = 0.18 * strike;
      armRz = -0.18 * strike;
    }

    if (stun > 0.01) {
      pelvisOffY -= 0.2 * stun;
      chestPitch += 0.28 * stun;
    }

    dampRot(bm.armL, armLx, armLy, armLz, lam, dt);
    dampRot(bm.armR, armRx, armRy, armRz, lam, dt);

    // 3-segment traveling wave down the flame tail
    const wFreq = 5.4 + move * 2.4;
    const t1 = Math.sin(t * wFreq) * (0.16 + move * 0.14);
    const t2 = Math.sin(t * wFreq - 1.05) * (0.24 + move * 0.18);
    const t3 = Math.sin(t * wFreq - 2.1) * (0.34 + move * 0.22);
    dampRot(bm.tail1, 0.14 * move + t1 * 0.45, st.tailLagYaw * 0.5 + t1, t1 * 0.5, 11, dt);
    dampRot(bm.tail2, 0.18 * move + t2 * 0.55, st.tailLagYaw * 0.8 + t2, t2 * 0.6, 10, dt);
    dampRot(bm.tail3, 0.22 * move + t3 * 0.65, st.tailLagYaw * 1.1 + t3, t3 * 0.7, 9, dt);
  } else if (arch === 'sun_spearman') {
    // Disciplined martial lancer: crisp footwork, coiled spear draw, piercing forward thrust & sweeping fan
    const g = st.stridePhase;
    const stride = Math.sin(g);
    pelvisOffY += Math.abs(stride) * 0.08 * move;
    spineYaw += -stride * 0.18 * move;

    let legLx = stride * 0.56 * move;
    let legRx = -stride * 0.56 * move;
    let armLx = -stride * 0.35 * move;
    let armRx = 0.12 + stride * 0.22 * move;
    let armRy = 0;
    let spearX = 0.08;
    let spearY = 0;
    let spearZ = 0;

    if (tele > 0.01) {
      // Pull spear shoulder back & twist torso like a Hades spearman lining up thrust
      const c = tele * (0.35 + tp * 0.65);
      pelvisOffY -= 0.08 * c;
      pelvisOffZ -= 0.1 * c;
      chestYaw -= 0.45 * c;
      armRx = -0.82 * c;
      armRy = -0.35 * c;
      spearX = -0.45 * c;
      armLx = 0.35 * c;
    }

    if (strike > 0.01 || input.isDashing) {
      const s = Math.max(strike, input.isDashing ? 0.92 : 0);
      pelvisOffZ += 0.22 * s;
      chestPitch += 0.24 * s;
      if (input.burstType === 'lunge' || input.isDashing) {
        // Piercing forward spear thrust
        chestYaw += 0.32 * s;
        armRx = 0.92 * s;
        spearX = 0.58 * s;
        armLx = -0.42 * s;
      } else {
        // Wide horizontal lance fan sweep
        const sweep = Math.sin((1 - strike) * Math.PI) * 1.15 - 0.55;
        chestYaw += sweep * 0.65;
        armRy = sweep * 0.85;
        spearY = sweep * 0.55;
        spearZ = -0.35 * s;
      }
    }

    if (stun > 0.01) {
      pelvisOffY -= 0.16 * stun;
      chestPitch += 0.26 * stun;
    }

    dampRot(bm.legL, legLx, 0, 0, lam, dt);
    dampRot(bm.legR, legRx, 0, 0, lam, dt);
    dampRot(bm.armL, armLx, 0, -0.1, lam, dt);
    dampRot(bm.armR, armRx, armRy, 0.08, lam, dt);
    dampRot(bm.spear, spearX, spearY, spearZ, 18, dt);
    dampRot(bm.cape, 0.24 * move + (input.isDashing ? 0.45 : 0), st.tailLagYaw * 0.8, 0, 10, dt);
  } else if (arch === 'winged_solar_lion') {
    // Articulated 2-joint Winged Solar Lion Sub-Boss: sweeping wingbeats + 3-segment tail wave + regal stride
    const g = st.stridePhase;
    const w = st.wingPhase;
    const stride = Math.sin(g);

    // Two-joint bird/griffin wing kinematics: outer joint lags inner joint by ~0.85 rad!
    const flapBase = 0.32 + move * 0.24 + (input.bossPhase >= 2 ? 0.08 : 0);
    let wingInnerZ = Math.sin(w) * flapBase;
    let wingOuterZ = Math.sin(w - 0.85) * (flapBase * 1.18);
    let wingSweepY = Math.cos(w) * 0.14;

    pelvisOffY += Math.sin(w - 0.5) * 0.12 + Math.abs(stride) * 0.08 * move;
    chestPitch += 0.08 * move + Math.sin(w) * 0.06;

    let legLx = stride * 0.48 * move;
    let legRx = -stride * 0.48 * move;

    if (tele > 0.01) {
      const c = tele * (0.4 + tp * 0.6);
      if (input.telegraphType === 'lane' || input.telegraphType === 'lunge') {
        // Tuck wings back sleekly for predator dive charge
        pelvisOffY -= 0.14 * c;
        chestPitch += 0.24 * c;
        wingInnerZ = 0.28 * c;
        wingOuterZ = -0.35 * c;
        wingSweepY = 0.58 * c;
      } else {
        // Flare wings wide overhead before slam/nova/roar
        pelvisOffY += 0.22 * c;
        chestPitch -= 0.22 * c;
        headPitch -= 0.24 * c;
        wingInnerZ = 0.68 * c;
        wingOuterZ = 0.32 * c;
        wingSweepY = -0.25 * c;
      }
    }

    if (strike > 0.01 || input.isDashing) {
      const s = Math.max(strike, input.isDashing ? 0.85 : 0);
      if (input.burstType === 'slam') {
        // Violent downstroke wingbeat slam!
        pelvisOffY -= 0.16 * s;
        chestPitch += 0.34 * s;
        wingInnerZ = -0.78 * s;
        wingOuterZ = -0.42 * s;
        wingSweepY = -0.32 * s;
      } else if (input.burstType === 'roar') {
        // Proud solar roar with wings spread wide
        pelvisOffY += 0.16 * s;
        chestPitch -= 0.24 * s;
        headPitch -= 0.38 * s;
        wingInnerZ = 0.58 * s;
        wingOuterZ = 0.28 * s;
        wingSweepY = -0.35 * s;
      } else {
        // Dive lunge
        pelvisOffZ += 0.24 * s;
        chestPitch += 0.26 * s;
        wingInnerZ = -0.32 * s;
        wingOuterZ = 0.22 * s;
        wingSweepY = 0.62 * s;
      }
    }

    if (stun > 0.01) {
      pelvisOffY -= 0.24 * stun;
      chestPitch += 0.28 * stun;
      wingInnerZ = -0.45 * stun;
      wingOuterZ = -0.3 * stun;
    }

    // Mirror left (-X) and right (+X) wings symmetrically
    dampRot(bm.wingL1, 0.08 * move, wingSweepY, -wingInnerZ, 13, dt);
    dampRot(bm.wingL2, 0, wingSweepY * 0.4, -wingOuterZ, 12, dt);
    dampRot(bm.wingR1, 0.08 * move, -wingSweepY, wingInnerZ, 13, dt);
    dampRot(bm.wingR2, 0, -wingSweepY * 0.4, wingOuterZ, 12, dt);

    dampRot(bm.legL, legLx, 0, 0, lam, dt);
    dampRot(bm.legR, legRx, 0, 0, lam, dt);

    // 3-segment lion tail whip wave
    const tw = t * 4.4 * phaseTempo;
    dampRot(bm.tail1, 0.06, Math.sin(tw) * 0.2 + st.tailLagYaw * 0.5, 0, 11, dt);
    dampRot(bm.tail2, 0.08, Math.sin(tw - 0.9) * 0.28 + st.tailLagYaw * 0.85, 0, 10, dt);
    dampRot(bm.tail3, 0.12, Math.sin(tw - 1.8) * 0.36 + st.tailLagYaw * 1.15, 0, 9, dt);
  } else {
    // Solar Lion Final Boss: commanding warrior stride, cross-claw rends, overhead slam & solar roar
    const g = st.stridePhase;
    const stride = Math.sin(g);
    pelvisOffY += Math.abs(stride) * 0.1 * move;
    pelvisRoll += stride * 0.07 * move;
    spineYaw += -stride * 0.18 * move;
    chestYaw += -stride * 0.12 * move;

    let legLx = stride * 0.52 * move;
    let legRx = -stride * 0.52 * move;
    let armLx = -stride * 0.36 * move - 0.08;
    let armRx = stride * 0.36 * move - 0.08;
    let armLz = -0.14 - breath * 0.04;
    let armRz = 0.14 + breath * 0.04;
    let handLx = 0.16;
    let handRx = 0.16;

    if (tele > 0.01) {
      const c = tele * (0.4 + tp * 0.6);
      if (input.telegraphType === 'slam' || input.telegraphType === 'spiral') {
        pelvisOffY -= 0.12 * c;
        spinePitch -= 0.22 * c;
        armLx = -1.45 * c;
        armRx = -1.45 * c;
        armLz = -0.42 * c;
        armRz = 0.42 * c;
      } else if (input.telegraphType === 'lunge' || input.telegraphType === 'lane') {
        pelvisOffY -= 0.16 * c;
        pelvisOffZ -= 0.16 * c;
        spinePitch += 0.22 * c;
        armLx = -0.68 * c;
        armRx = -0.82 * c;
        armLz = -0.48 * c;
        armRz = 0.48 * c;
      } else {
        // Ranged solar roar windup
        chestPitch -= 0.22 * c;
        headPitch -= 0.26 * c;
        armLx = -0.52 * c;
        armRx = -0.52 * c;
        armLz = -0.55 * c;
        armRz = 0.55 * c;
      }
    }

    if (strike > 0.01 || input.isDashing) {
      const s = Math.max(strike, input.isDashing ? 0.92 : 0);
      if (input.burstType === 'slam') {
        pelvisOffY -= 0.22 * s;
        spinePitch += 0.42 * s;
        chestPitch += 0.24 * s;
        armLx = 0.98 * s;
        armRx = 0.98 * s;
        handLx = 0.42 * s;
        handRx = 0.42 * s;
      } else if (input.burstType === 'roar') {
        pelvisOffY += 0.18 * s;
        spinePitch -= 0.2 * s;
        headPitch -= 0.42 * s;
        armLx = -0.65 * s;
        armRx = -0.65 * s;
        armLz = -0.78 * s;
        armRz = 0.78 * s;
      } else {
        // Cross-claw solar rend / predatory dash
        pelvisOffZ += 0.26 * s;
        spinePitch += 0.24 * s;
        chestYaw += Math.sin(s * Math.PI) * 0.45;
        armLx = 0.86 * s;
        armRx = 1.05 * s;
        armLz = 0.24 * s;
        armRz = -0.24 * s;
        handLx = 0.38 * s;
        handRx = 0.45 * s;
      }
    }

    if (stun > 0.01) {
      pelvisOffY -= 0.28 * stun;
      spinePitch += 0.34 * stun;
      headPitch += 0.28 * stun;
      headRoll += Math.sin(t * 16) * 0.18 * stun;
      armLx = 0.32 * stun;
      armRx = 0.32 * stun;
    }

    dampRot(bm.legL, legLx, 0, 0, lam, dt);
    dampRot(bm.legR, legRx, 0, 0, lam, dt);
    dampRot(bm.armL, armLx, 0, armLz, lam, dt);
    dampRot(bm.handL, handLx, 0, 0, lam, dt);
    dampRot(bm.armR, armRx, 0, armRz, lam, dt);
    dampRot(bm.handR, handRx, 0, 0, lam, dt);

    const tw = t * 4.0 * phaseTempo;
    dampRot(bm.tail1, 0.12 * move, Math.sin(tw) * 0.18 + st.tailLagYaw * 0.6, 0, 10, dt);
    dampRot(bm.tail2, 0.16 * move, Math.sin(tw - 0.9) * 0.28 + st.tailLagYaw, 0, 9, dt);
  }

  // Apply pelvis offset & core spinal chain smoothly
  if (pelvis && pelvisRest) {
    pelvis.position.y = THREE.MathUtils.damp(pelvis.position.y, pelvisRest.y + pelvisOffY, 14, dt);
    pelvis.position.z = THREE.MathUtils.damp(pelvis.position.z, pelvisRest.z + pelvisOffZ, 14, dt);
    dampRot(pelvis, pelvisPitch, pelvisYaw, pelvisRoll, 13, dt);
  }
  dampRot(bm.spine, spinePitch, spineYaw, spineRoll, 14, dt);
  dampRot(bm.chest, chestPitch, chestYaw, chestRoll, 15, dt);
  dampRot(bm.head, headPitch, headYaw, headRoll, 16, dt);
}

import * as THREE from 'three';
import { HeroId } from '../types/game';

export type HeroSignatureVfxKind = 'aurelia' | 'bellona' | 'sylvia' | 'celeste';
export type TacticalImpactVfxKind =
  | 'riposte_lance'
  | 'wall_slam_burst'
  | 'boss_phase3_eruption'
  | 'interrupt_surge'
  | 'imprint_resonance';
export type PooledSignatureVfxKind = HeroSignatureVfxKind | TacticalImpactVfxKind;

export interface SignatureVfxOptions {
  liteActive: boolean;
  reducedMotion: boolean;
  reduceScreenFlash: boolean;
  colorblindTelegraphs: boolean;
}

export interface SpawnHeroSignatureParams {
  heroId: HeroId | string;
  effectKind?: string;
  x: number;
  z: number;
  targetX?: number;
  targetZ?: number;
  radius?: number;
  accentHex?: number;
  options: SignatureVfxOptions;
}

export interface SpawnTacticalImpactVfxParams {
  kind: TacticalImpactVfxKind;
  x: number;
  z: number;
  targetX?: number;
  targetZ?: number;
  radius?: number;
  accentHex?: number;
  options: SignatureVfxOptions;
}

export interface SyncBossAuraParams {
  active: boolean;
  x: number;
  z: number;
  phase: 1 | 2 | 3;
  baseRadius: number;
  accentHex: number;
  options: SignatureVfxOptions;
}

interface BurstSlot {
  active: boolean;
  kind: PooledSignatureVfxKind;
  age: number;
  duration: number;
  originX: number;
  originZ: number;
  targetX: number;
  targetZ: number;
  radius: number;
  reducedMotion: boolean;
  reduceScreenFlash: boolean;
  group: THREE.Group;
  primaryRing: THREE.Mesh;
  primaryRingMat: THREE.MeshBasicMaterial;
  secondaryRing: THREE.Mesh;
  secondaryRingMat: THREE.MeshBasicMaterial;
  domeMesh: THREE.Mesh;
  domeMat: THREE.MeshBasicMaterial;
  shards: THREE.Mesh[];
  shardMat: THREE.MeshBasicMaterial;
  boltMesh: THREE.Mesh;
  boltMat: THREE.MeshBasicMaterial;
}

const MAX_SLOTS_HIGH = 6;
const MAX_SLOTS_LITE = 3;
const SHARDS_PER_SLOT = 6;

export function resolveHeroSignatureKind(heroId: string, effectKind?: string): HeroSignatureVfxKind {
  if (effectKind === 'ember_nova' || heroId === 'aurelia') return 'aurelia';
  if (effectKind === 'thunder_arc' || effectKind === 'storm_convergence' || heroId === 'bellona') return 'bellona';
  if (effectKind === 'jade_bastion' || heroId === 'sylvia') return 'sylvia';
  if (effectKind === 'moon_fan_mark' || heroId === 'celeste' || heroId === 'artemis') return 'celeste';
  return 'aurelia';
}

export function getSignatureDefaultColor(kind: HeroSignatureVfxKind, colorblind: boolean): number {
  if (colorblind) {
    switch (kind) {
      case 'aurelia':
        return 0xf59e0b; // high-contrast amber
      case 'bellona':
        return 0x38bdf8; // sky cyan
      case 'sylvia':
        return 0x2dd4bf; // bright teal
      case 'celeste':
        return 0xe2e8f0; // lunar silver-white
    }
  }
  switch (kind) {
    case 'aurelia':
      return 0xf59e0b;
    case 'bellona':
      return 0xff682e;
    case 'sylvia':
      return 0x10b981;
    case 'celeste':
      return 0x38bdf8;
  }
}

export function getImprintAspectVfxColor(
  aspectId: string | null | undefined,
  colorblind: boolean
): number {
  const key = (aspectId ?? '').toLowerCase();
  if (colorblind) {
    if (key.includes('solar') || key.includes('sun') || key.includes('flame')) return 0xf59e0b;
    if (key.includes('lunar') || key.includes('moon') || key.includes('frost')) return 0xe2e8f0;
    if (key.includes('tempest') || key.includes('storm') || key.includes('volt')) return 0x38bdf8;
    if (key.includes('aegis') || key.includes('bastion') || key.includes('jade')) return 0x2dd4bf;
    return 0xfef08a;
  }
  if (key.includes('solar') || key.includes('sun') || key.includes('flame')) return 0xf59e0b;
  if (key.includes('lunar') || key.includes('moon') || key.includes('frost')) return 0x67e8f9;
  if (key.includes('tempest') || key.includes('storm') || key.includes('volt')) return 0xa78bfa;
  if (key.includes('aegis') || key.includes('bastion') || key.includes('jade')) return 0x34d399;
  return 0xfde047;
}

export function getTacticalImpactDefaultColor(
  kind: TacticalImpactVfxKind,
  colorblind: boolean
): number {
  if (colorblind) {
    switch (kind) {
      case 'riposte_lance':
        return 0x38bdf8;
      case 'wall_slam_burst':
        return 0xf59e0b;
      case 'boss_phase3_eruption':
        return 0xfef08a;
      case 'interrupt_surge':
        return 0x2dd4bf;
      case 'imprint_resonance':
        return 0xe2e8f0;
    }
  }
  switch (kind) {
    case 'riposte_lance':
      return 0xfef08a;
    case 'wall_slam_burst':
      return 0xf59e0b;
    case 'boss_phase3_eruption':
      return 0xef4444;
    case 'interrupt_surge':
      return 0x38bdf8;
    case 'imprint_resonance':
      return 0xfde047;
  }
}

export function countScenePointLights(root: THREE.Object3D): number {
  let count = 0;
  root.traverse((obj) => {
    if ((obj as THREE.PointLight).isPointLight) {
      count += 1;
    }
  });
  return count;
}

/**
 * Pooled, Zero-GC, 0-PointLight signature VFX director for the 4 playable heroes'
 * Active Skills and Boss Phase II/III ground-anchored Zodiac Runic Aura Rings.
 */
export class HeroAndBossSignatureVfxPool {
  public readonly root: THREE.Group;
  private readonly liteModeInit: boolean;
  private readonly slots: BurstSlot[] = [];

  // Shared geometries (disposed cleanly on dispose())
  private readonly ringGeo: THREE.RingGeometry;
  private readonly torusGeo: THREE.TorusGeometry;
  private readonly hexDomeGeo: THREE.CylinderGeometry;
  private readonly shardGeo: THREE.ConeGeometry;
  private readonly boltGeo: THREE.CylinderGeometry;
  private readonly bossOuterRingGeo: THREE.RingGeometry;
  private readonly bossInnerRingGeo: THREE.TorusGeometry;
  private readonly bossRuneGeo: THREE.PlaneGeometry;

  // Boss Phase II/III Runic Aura Ring (zero PointLights, ground-anchored)
  private readonly bossAuraGroup: THREE.Group;
  private readonly bossOuterRing: THREE.Mesh;
  private readonly bossOuterMat: THREE.MeshBasicMaterial;
  private readonly bossInnerRing: THREE.Mesh;
  private readonly bossInnerMat: THREE.MeshBasicMaterial;
  private readonly bossCardinalRunes: THREE.Mesh[] = [];
  private readonly bossRuneMat: THREE.MeshBasicMaterial;

  private bossAuraVisible = false;
  private bossAuraPhase: 1 | 2 | 3 = 1;
  private bossAuraRadius = 2.6;
  private bossAuraReducedMotion = false;
  private bossAuraReduceFlash = false;

  constructor(scene: THREE.Scene, liteActive = false) {
    this.liteModeInit = liteActive;
    this.root = new THREE.Group();
    this.root.name = 'hero_and_boss_signature_vfx_pool';

    const ringSegs = liteActive ? 16 : 32;
    const torusRadial = liteActive ? 6 : 10;
    const torusTubular = liteActive ? 18 : 36;

    this.ringGeo = new THREE.RingGeometry(0.72, 1.0, ringSegs);
    this.ringGeo.rotateX(-Math.PI / 2);

    this.torusGeo = new THREE.TorusGeometry(0.95, 0.055, torusRadial, torusTubular);
    this.torusGeo.rotateX(Math.PI / 2);

    this.hexDomeGeo = new THREE.CylinderGeometry(0.94, 1.02, 1.35, 6, 1, true);
    this.shardGeo = new THREE.ConeGeometry(0.14, 0.68, 4);
    this.boltGeo = new THREE.CylinderGeometry(0.065, 0.11, 1.0, liteActive ? 4 : 5, 1, true);
    this.boltGeo.rotateX(Math.PI / 2);

    this.bossOuterRingGeo = new THREE.RingGeometry(0.84, 1.0, liteActive ? 20 : 40);
    this.bossOuterRingGeo.rotateX(-Math.PI / 2);
    this.bossInnerRingGeo = new THREE.TorusGeometry(0.68, 0.036, torusRadial, torusTubular);
    this.bossInnerRingGeo.rotateX(Math.PI / 2);
    this.bossRuneGeo = new THREE.PlaneGeometry(0.42, 0.42);
    this.bossRuneGeo.rotateX(-Math.PI / 2);

    const slotCount = liteActive ? MAX_SLOTS_LITE : MAX_SLOTS_HIGH;
    for (let i = 0; i < slotCount; i++) {
      this.slots.push(this.createSlot());
    }

    // Build reusable Boss Phase II/III Runic Aura Ring
    this.bossAuraGroup = new THREE.Group();
    this.bossAuraGroup.name = 'boss_phase_runic_aura';
    this.bossAuraGroup.visible = false;

    this.bossOuterMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.48,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.bossOuterRing = new THREE.Mesh(this.bossOuterRingGeo, this.bossOuterMat);
    this.bossOuterRing.position.y = 0.075;
    this.bossAuraGroup.add(this.bossOuterRing);

    this.bossInnerMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.56,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.bossInnerRing = new THREE.Mesh(this.bossInnerRingGeo, this.bossInnerMat);
    this.bossInnerRing.position.y = 0.11;
    this.bossAuraGroup.add(this.bossInnerRing);

    this.bossRuneMat = new THREE.MeshBasicMaterial({
      color: 0xfde68a,
      transparent: true,
      opacity: 0.52,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const runeCount = liteActive ? 4 : 6;
    for (let r = 0; r < runeCount; r++) {
      const rune = new THREE.Mesh(this.bossRuneGeo, this.bossRuneMat);
      const angle = (r / runeCount) * Math.PI * 2;
      rune.position.set(Math.cos(angle) * 0.88, 0.09, Math.sin(angle) * 0.88);
      rune.rotation.y = angle + Math.PI * 0.25;
      this.bossCardinalRunes.push(rune);
      this.bossAuraGroup.add(rune);
    }

    this.root.add(this.bossAuraGroup);
    scene.add(this.root);
  }

  private createSlot(): BurstSlot {
    const group = new THREE.Group();
    group.visible = false;

    const primaryRingMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const primaryRing = new THREE.Mesh(this.ringGeo, primaryRingMat);
    primaryRing.position.y = 0.1;
    group.add(primaryRing);

    const secondaryRingMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.82,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const secondaryRing = new THREE.Mesh(this.torusGeo, secondaryRingMat);
    secondaryRing.position.y = 0.45;
    group.add(secondaryRing);

    const domeMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const domeMesh = new THREE.Mesh(this.hexDomeGeo, domeMat);
    domeMesh.position.y = 0.72;
    domeMesh.visible = false;
    group.add(domeMesh);

    const shardMat = new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const shards: THREE.Mesh[] = [];
    for (let s = 0; s < SHARDS_PER_SLOT; s++) {
      const shard = new THREE.Mesh(this.shardGeo, shardMat);
      shard.visible = false;
      shards.push(shard);
      group.add(shard);
    }

    const boltMat = new THREE.MeshBasicMaterial({
      color: 0xff682e,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const boltMesh = new THREE.Mesh(this.boltGeo, boltMat);
    boltMesh.visible = false;
    group.add(boltMesh);

    this.root.add(group);
    return {
      active: false,
      kind: 'aurelia',
      age: 0,
      duration: 0.6,
      originX: 0,
      originZ: 0,
      targetX: 0,
      targetZ: 0,
      radius: 4.5,
      reducedMotion: false,
      reduceScreenFlash: false,
      group,
      primaryRing,
      primaryRingMat,
      secondaryRing,
      secondaryRingMat,
      domeMesh,
      domeMat,
      shards,
      shardMat,
      boltMesh,
      boltMat,
    };
  }

  public getPoolCapacity(): number {
    return this.slots.length;
  }

  public getActiveBurstCount(): number {
    let count = 0;
    for (let i = 0; i < this.slots.length; i++) {
      if (this.slots[i].active) count += 1;
    }
    return count;
  }

  public isBossAuraActive(): boolean {
    return this.bossAuraVisible && this.bossAuraGroup.visible;
  }

  public getBossAuraPhase(): 1 | 2 | 3 {
    return this.bossAuraPhase;
  }

  public spawnHeroSignature(params: SpawnHeroSignatureParams): void {
    const kind = resolveHeroSignatureKind(params.heroId, params.effectKind);
    const activeLimit = params.options.liteActive
      ? Math.min(MAX_SLOTS_LITE, this.slots.length)
      : this.slots.length;

    let chosen = this.slots[0];
    let oldestAge = -1;
    for (let i = 0; i < activeLimit; i++) {
      const candidate = this.slots[i];
      if (!candidate.active) {
        chosen = candidate;
        break;
      }
      if (candidate.age > oldestAge) {
        oldestAge = candidate.age;
        chosen = candidate;
      }
    }

    const baseColor =
      params.accentHex !== undefined && !params.options.colorblindTelegraphs
        ? params.accentHex
        : getSignatureDefaultColor(kind, params.options.colorblindTelegraphs);

    chosen.active = true;
    chosen.kind = kind;
    chosen.age = 0;
    chosen.duration =
      kind === 'sylvia' ? 0.78 : kind === 'celeste' ? 0.64 : kind === 'bellona' ? 0.52 : 0.62;
    chosen.originX = params.x;
    chosen.originZ = params.z;
    chosen.targetX = params.targetX ?? params.x;
    chosen.targetZ = params.targetZ ?? params.z - 2.4;
    chosen.radius = Math.max(2.2, Math.min(8.5, params.radius ?? 5.5));
    chosen.reducedMotion = params.options.reducedMotion;
    chosen.reduceScreenFlash = params.options.reduceScreenFlash;

    chosen.group.visible = true;
    chosen.group.position.set(params.x, 0, params.z);

    chosen.primaryRingMat.color.setHex(baseColor);
    chosen.secondaryRingMat.color.setHex(
      kind === 'aurelia'
        ? 0xfef08a
        : kind === 'bellona'
          ? 0xfde047
          : kind === 'sylvia'
            ? 0x6ee7b7
            : 0xe0f2fe
    );
    chosen.domeMat.color.setHex(baseColor);
    chosen.shardMat.color.setHex(baseColor);
    chosen.boltMat.color.setHex(kind === 'bellona' ? 0xfef08a : baseColor);

    // Configure per-hero signature geometry layout
    chosen.domeMesh.visible = kind === 'sylvia';
    chosen.boltMesh.visible = kind === 'bellona';

    const visibleShards = params.options.liteActive ? 4 : SHARDS_PER_SLOT;
    for (let s = 0; s < chosen.shards.length; s++) {
      chosen.shards[s].visible = s < visibleShards;
    }

    if (kind === 'celeste') {
      // Twin angled lunar mirror halo
      chosen.secondaryRing.rotation.set(Math.PI * 0.34, 0, Math.PI * 0.16);
      chosen.secondaryRing.position.y = 1.05;
    } else if (kind === 'sylvia') {
      chosen.secondaryRing.rotation.set(0, 0, 0);
      chosen.secondaryRing.position.y = 0.25;
    } else {
      chosen.secondaryRing.rotation.set(0, 0, 0);
      chosen.secondaryRing.position.y = 0.58;
    }

    if (kind === 'bellona') {
      const dx = chosen.targetX - chosen.originX;
      const dz = chosen.targetZ - chosen.originZ;
      const len = Math.max(1.8, Math.min(chosen.radius, Math.hypot(dx, dz) || 3.4));
      const yaw = Math.atan2(dx, dz);
      chosen.boltMesh.position.set(dx * 0.5, 0.95, dz * 0.5);
      chosen.boltMesh.rotation.set(0, yaw, 0);
      chosen.boltMesh.scale.set(1.1, 1.1, len);
    }

    this.applySlotPose(chosen, 0);
  }

  /**
   * Wave 16: Spawns a pooled, 0-PointLight tactical impact burst for
   * Riposte Piercing Lance, Wall-Slam Shockwave, or Boss Phase III Eruption.
   */
  public spawnTacticalImpactVfx(params: SpawnTacticalImpactVfxParams): void {
    const activeLimit = params.options.liteActive
      ? Math.min(MAX_SLOTS_LITE, this.slots.length)
      : this.slots.length;

    let chosen = this.slots[0];
    let oldestAge = -1;
    for (let i = 0; i < activeLimit; i++) {
      const candidate = this.slots[i];
      if (!candidate.active) {
        chosen = candidate;
        break;
      }
      if (candidate.age > oldestAge) {
        oldestAge = candidate.age;
        chosen = candidate;
      }
    }

    const kind = params.kind;
    const baseColor =
      params.accentHex !== undefined && !params.options.colorblindTelegraphs
        ? params.accentHex
        : getTacticalImpactDefaultColor(kind, params.options.colorblindTelegraphs);

    chosen.active = true;
    chosen.kind = kind;
    chosen.age = 0;
    chosen.duration =
      kind === 'boss_phase3_eruption'
        ? 0.85
        : kind === 'interrupt_surge'
          ? 0.62
          : kind === 'imprint_resonance'
            ? 0.58
            : kind === 'wall_slam_burst'
              ? 0.56
              : 0.48;
    chosen.originX = params.x;
    chosen.originZ = params.z;
    chosen.targetX = params.targetX ?? params.x;
    chosen.targetZ = params.targetZ ?? params.z - 3.6;
    chosen.radius = Math.max(
      2.0,
      Math.min(
        9.5,
        params.radius ??
          (kind === 'boss_phase3_eruption'
            ? 7.2
            : kind === 'interrupt_surge'
              ? 5.6
              : kind === 'imprint_resonance'
                ? 4.8
                : kind === 'wall_slam_burst'
                  ? 4.4
                  : 5.2)
      )
    );
    chosen.reducedMotion = params.options.reducedMotion;
    chosen.reduceScreenFlash = params.options.reduceScreenFlash;

    chosen.group.visible = true;
    chosen.group.position.set(params.x, 0, params.z);

    chosen.primaryRingMat.color.setHex(baseColor);
    chosen.secondaryRingMat.color.setHex(
      kind === 'riposte_lance'
        ? 0x38bdf8
        : kind === 'interrupt_surge'
          ? 0xfef08a
          : kind === 'imprint_resonance'
            ? 0xffffff
            : kind === 'wall_slam_burst'
              ? 0xfde68a
              : 0xfbbf24
    );
    chosen.domeMat.color.setHex(baseColor);
    chosen.shardMat.color.setHex(
      kind === 'boss_phase3_eruption' || kind === 'interrupt_surge' || kind === 'imprint_resonance'
        ? 0xfef08a
        : baseColor
    );
    chosen.boltMat.color.setHex(kind === 'riposte_lance' ? 0xfef08a : baseColor);

    chosen.domeMesh.visible = kind === 'boss_phase3_eruption';
    chosen.boltMesh.visible = kind === 'riposte_lance';

    const visibleShards = params.options.liteActive ? 4 : SHARDS_PER_SLOT;
    for (let s = 0; s < chosen.shards.length; s++) {
      chosen.shards[s].visible = s < visibleShards;
    }

    if (kind === 'riposte_lance') {
      const dx = chosen.targetX - chosen.originX;
      const dz = chosen.targetZ - chosen.originZ;
      const len = Math.max(2.2, Math.min(9.0, Math.hypot(dx, dz) || 4.2));
      const yaw = Math.atan2(dx, dz);
      chosen.boltMesh.position.set(dx * 0.5, 1.05, dz * 0.5);
      chosen.boltMesh.rotation.set(0, yaw, 0);
      chosen.boltMesh.scale.set(1.25, 1.25, len);
      chosen.secondaryRing.rotation.set(Math.PI * 0.5, yaw, 0);
      chosen.secondaryRing.position.y = 1.05;
    } else if (kind === 'wall_slam_burst') {
      chosen.secondaryRing.rotation.set(0, 0, 0);
      chosen.secondaryRing.position.y = 0.32;
    } else if (kind === 'interrupt_surge') {
      chosen.secondaryRing.rotation.set(0, 0, 0);
      chosen.secondaryRing.position.y = 0.52;
    } else if (kind === 'imprint_resonance') {
      chosen.secondaryRing.rotation.set(Math.PI * 0.18, 0, -Math.PI * 0.14);
      chosen.secondaryRing.position.y = 0.68;
    } else {
      chosen.secondaryRing.rotation.set(0, 0, 0);
      chosen.secondaryRing.position.y = 0.65;
    }

    this.applySlotPose(chosen, 0);
  }

  public syncBossPhaseAura(params: SyncBossAuraParams): void {
    this.bossAuraPhase = params.phase;
    this.bossAuraRadius = Math.max(1.8, params.baseRadius);
    this.bossAuraReducedMotion = params.options.reducedMotion;
    this.bossAuraReduceFlash = params.options.reduceScreenFlash;

    if (!params.active || params.phase < 2) {
      this.bossAuraVisible = false;
      this.bossAuraGroup.visible = false;
      return;
    }

    this.bossAuraVisible = true;
    this.bossAuraGroup.visible = true;
    this.bossAuraGroup.position.set(params.x, 0, params.z);

    const outerColor = params.options.colorblindTelegraphs
      ? params.phase === 3
        ? 0x38bdf8
        : 0xf59e0b
      : params.phase === 3
        ? 0xef4444
        : params.accentHex;
    const innerColor = params.options.colorblindTelegraphs
      ? 0xfef08a
      : params.phase === 3
        ? 0xfbbf24
        : 0xfde68a;

    this.bossOuterMat.color.setHex(outerColor);
    this.bossInnerMat.color.setHex(innerColor);
    this.bossRuneMat.color.setHex(innerColor);
  }

  public step(dt: number, elapsedSec: number): void {
    const safeDt = Math.max(0, Math.min(0.1, dt));

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      if (!slot.active) continue;
      slot.age += safeDt;
      if (slot.age >= slot.duration) {
        slot.active = false;
        slot.group.visible = false;
        continue;
      }
      this.applySlotPose(slot, slot.age / slot.duration);
    }

    if (this.bossAuraVisible && this.bossAuraGroup.visible) {
      const motionMult = this.bossAuraReducedMotion ? 0.25 : 1.0;
      const flashMult = this.bossAuraReduceFlash ? 0.55 : 1.0;
      const phaseScale = this.bossAuraPhase === 3 ? 1.24 : 1.0;
      const pulse = this.bossAuraReducedMotion
        ? 1.0
        : 1 + Math.sin(elapsedSec * (this.bossAuraPhase === 3 ? 6.2 : 3.8)) * (this.bossAuraPhase === 3 ? 0.065 : 0.035);

      const totalRadius = this.bossAuraRadius * phaseScale * pulse;
      this.bossAuraGroup.scale.set(totalRadius, 1, totalRadius);
      this.bossOuterRing.rotation.y += safeDt * (this.bossAuraPhase === 3 ? 1.45 : 0.8) * motionMult;
      this.bossInnerRing.rotation.y -= safeDt * (this.bossAuraPhase === 3 ? 2.1 : 1.15) * motionMult;

      for (let r = 0; r < this.bossCardinalRunes.length; r++) {
        const rune = this.bossCardinalRunes[r];
        rune.rotation.y += safeDt * 1.6 * motionMult;
      }

      const baseOuterOp = this.bossAuraPhase === 3 ? 0.56 : 0.38;
      const baseInnerOp = this.bossAuraPhase === 3 ? 0.64 : 0.44;
      this.bossOuterMat.opacity = baseOuterOp * flashMult;
      this.bossInnerMat.opacity = baseInnerOp * flashMult;
      this.bossRuneMat.opacity = (this.bossAuraPhase === 3 ? 0.62 : 0.42) * flashMult;
    }
  }

  private applySlotPose(slot: BurstSlot, progress: number): void {
    const t = Math.max(0, Math.min(1, progress));
    const easeOut = 1 - (1 - t) * (1 - t);
    const fade = Math.max(0, 1 - t * t);
    const flashDamp = slot.reduceScreenFlash ? 0.52 : 1.0;
    const spinRate = slot.reducedMotion ? 0.35 : 1.0;

    // Ground primary ring expansion
    const ringRadius = 0.65 + slot.radius * 0.72 * easeOut;
    slot.primaryRing.scale.set(ringRadius, 1, ringRadius);
    slot.primaryRing.rotation.y = t * Math.PI * 0.9 * spinRate;
    slot.primaryRingMat.opacity = 0.78 * fade * flashDamp;

    // Secondary halo / corona
    if (slot.kind === 'aurelia') {
      const coronaScale = 0.7 + slot.radius * 0.56 * easeOut;
      slot.secondaryRing.scale.setScalar(coronaScale);
      slot.secondaryRing.position.y = 0.45 + easeOut * 0.95;
      slot.secondaryRing.rotation.y = -t * Math.PI * 1.4 * spinRate;
      slot.secondaryRingMat.opacity = 0.85 * fade * flashDamp;
    } else if (slot.kind === 'bellona') {
      const arcScale = 0.6 + slot.radius * 0.52 * easeOut;
      slot.secondaryRing.scale.setScalar(arcScale);
      slot.secondaryRing.rotation.y = t * Math.PI * 2.6 * spinRate;
      slot.secondaryRingMat.opacity = 0.86 * fade * flashDamp;
      slot.boltMat.opacity = (t < 0.45 ? 0.92 : fade * 1.1) * flashDamp;
      const flicker = slot.reducedMotion ? 1.0 : 0.85 + Math.sin(t * 44) * 0.25;
      slot.boltMesh.scale.x = flicker;
      slot.boltMesh.scale.y = flicker;
    } else if (slot.kind === 'sylvia') {
      const domeRadius = 0.95 + slot.radius * 0.44 * Math.min(1, t * 2.2);
      slot.domeMesh.scale.set(domeRadius, 0.85 + easeOut * 0.42, domeRadius);
      slot.domeMesh.rotation.y = t * Math.PI * 0.6 * spinRate;
      slot.domeMat.opacity = 0.44 * fade * flashDamp;
      slot.secondaryRing.scale.setScalar(domeRadius * 1.04);
      slot.secondaryRing.position.y = 0.22 + Math.sin(t * Math.PI) * 0.85;
      slot.secondaryRingMat.opacity = 0.76 * fade * flashDamp;
    } else if (slot.kind === 'riposte_lance') {
      const pierceScale = 0.55 + slot.radius * 0.44 * easeOut;
      slot.secondaryRing.scale.setScalar(pierceScale);
      slot.secondaryRingMat.opacity = 0.88 * fade * flashDamp;
      slot.boltMat.opacity = (t < 0.5 ? 0.94 : fade * 1.15) * flashDamp;
      const lanceWidth = Math.max(0.25, 1.35 - t * 0.85);
      slot.boltMesh.scale.x = lanceWidth;
      slot.boltMesh.scale.y = lanceWidth;
    } else if (slot.kind === 'wall_slam_burst') {
      const shockScale = 0.72 + slot.radius * 0.78 * easeOut;
      slot.secondaryRing.scale.setScalar(shockScale);
      slot.secondaryRing.position.y = 0.22 + easeOut * 0.48;
      slot.secondaryRing.rotation.y = t * Math.PI * 1.9 * spinRate;
      slot.secondaryRingMat.opacity = 0.9 * fade * flashDamp;
    } else if (slot.kind === 'interrupt_surge') {
      const surgeScale = 0.78 + slot.radius * 0.84 * easeOut;
      slot.secondaryRing.scale.setScalar(surgeScale);
      slot.secondaryRing.position.y = 0.32 + Math.sin(t * Math.PI) * 1.15;
      slot.secondaryRing.rotation.y = -t * Math.PI * 2.4 * spinRate;
      slot.secondaryRingMat.opacity = 0.92 * fade * flashDamp;
    } else if (slot.kind === 'imprint_resonance') {
      const resScale = 0.62 + slot.radius * 0.68 * easeOut;
      slot.secondaryRing.scale.setScalar(resScale);
      slot.secondaryRing.position.y = 0.55 + Math.sin(t * Math.PI) * 0.92;
      slot.secondaryRing.rotation.y = t * Math.PI * 2.2 * spinRate;
      slot.secondaryRingMat.opacity = 0.9 * fade * flashDamp;
    } else if (slot.kind === 'boss_phase3_eruption') {
      const eruptScale = 0.85 + slot.radius * 0.82 * easeOut;
      slot.domeMesh.scale.set(eruptScale * 0.65, 1.15 + easeOut * 1.35, eruptScale * 0.65);
      slot.domeMesh.rotation.y = -t * Math.PI * 1.1 * spinRate;
      slot.domeMat.opacity = 0.48 * fade * flashDamp;
      slot.secondaryRing.scale.setScalar(eruptScale);
      slot.secondaryRing.position.y = 0.35 + easeOut * 1.45;
      slot.secondaryRing.rotation.y = t * Math.PI * 2.1 * spinRate;
      slot.secondaryRingMat.opacity = 0.92 * fade * flashDamp;
    } else {
      // Celeste: twin lunar mirror reflection halo
      const mirrorScale = 0.8 + slot.radius * 0.42 * easeOut;
      slot.secondaryRing.scale.setScalar(mirrorScale);
      slot.secondaryRing.rotation.y = t * Math.PI * 1.8 * spinRate;
      slot.secondaryRingMat.opacity = 0.88 * fade * flashDamp;
    }

    // Radial shards (embers / thunder needles / jade obelisks / mirror crystals)
    slot.shardMat.opacity = 0.86 * fade * flashDamp;
    for (let s = 0; s < slot.shards.length; s++) {
      const shard = slot.shards[s];
      if (!shard.visible) continue;
      const angle = (s / SHARDS_PER_SLOT) * Math.PI * 2 + t * 0.75 * spinRate;
      const dist =
        slot.kind === 'sylvia'
          ? 0.85 + slot.radius * 0.36 * Math.min(1, t * 2.4)
          : 0.45 + slot.radius * 0.68 * easeOut;
      const liftY =
        slot.kind === 'sylvia'
          ? 0.42 + Math.sin(t * Math.PI) * 0.55
          : 0.55 + Math.sin(t * Math.PI) * 1.15;
      shard.position.set(Math.cos(angle) * dist, liftY, Math.sin(angle) * dist);
      if (slot.kind === 'sylvia') {
        shard.rotation.set(0, angle, 0);
      } else {
        shard.rotation.set(Math.PI * 0.35, -angle, 0);
      }
      const shardScale = Math.max(0.25, 1.08 - t * 0.62);
      shard.scale.setScalar(shardScale);
    }
  }

  public releaseAll(): void {
    for (let i = 0; i < this.slots.length; i++) {
      this.slots[i].active = false;
      this.slots[i].group.visible = false;
    }
    this.bossAuraVisible = false;
    this.bossAuraGroup.visible = false;
  }

  public dispose(): void {
    this.releaseAll();
    if (this.root.parent) {
      this.root.parent.remove(this.root);
    }
    this.ringGeo.dispose();
    this.torusGeo.dispose();
    this.hexDomeGeo.dispose();
    this.shardGeo.dispose();
    this.boltGeo.dispose();
    this.bossOuterRingGeo.dispose();
    this.bossInnerRingGeo.dispose();
    this.bossRuneGeo.dispose();

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      slot.primaryRingMat.dispose();
      slot.secondaryRingMat.dispose();
      slot.domeMat.dispose();
      slot.shardMat.dispose();
      slot.boltMat.dispose();
    }

    this.bossOuterMat.dispose();
    this.bossInnerMat.dispose();
    this.bossRuneMat.dispose();
  }

  public isLiteInitialized(): boolean {
    return this.liteModeInit;
  }
}

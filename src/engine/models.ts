import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { WING_MAP } from '../data/wave7Data';
import { MOUNT_MAP, WEAPON_AURA_MAP } from '../data/wave8Data';
import { ARTIFACT_MAP } from '../data/wave9Data';
import { DIVINE_HALO_MAP } from '../data/wave10Data';
import { MYTHIC_WEAPON_TIERS, WAR_BANNER_MAP } from '../data/wave12Data';
import { ASTRAL_STEED_MAP, SOUL_RING_DEFS } from '../data/wave13Data';
import { CELESTIAL_WING_MAP } from '../data/wave14Data';
import {
  ArtifactId,
  AstralSteedId,
  CelestialWingId,
  CrownStyle,
  EnemyKind,
  HaloId,
  MountId,
  PetId,
  SoulRingSlotId,
  StageEventAfter,
  WarBannerId,
  WeaponArchetype,
  WeaponAuraId,
  WingId,
} from '../types/game';
import {
  createEngravedArmorTexture,
  createFabricWeaveTexture,
  createGoblinFaceTexture,
  createHeroFaceTexture,
} from './textures';

export interface HeroVisualConfig {
  weaponAccentHex: number;
  cloakColorHex: number;
  hairColorHex: number;
  eyeColor: string;
  cheekColor: string;
  crownStyle: CrownStyle;
  weaponArchetype: WeaponArchetype;
  auraPrimaryHex?: number;
  auraSecondaryHex?: number;
  pedestalTintHex?: number;
  constellationLevels?: number[];
  wingId?: WingId | null;
  wingLevel?: number;
  mountId?: MountId | null;
  mountLevel?: number;
  weaponAuraId?: WeaponAuraId;
  weaponAuraLevel?: number;
  artifactId?: ArtifactId | null;
  artifactLevel?: number;
  haloId?: HaloId | null;
  haloLevel?: number;
  mythicWeaponTier?: number;
  warBannerId?: WarBannerId | null;
  warBannerLevel?: number;
  astralSteedId?: AstralSteedId | null;
  astralSteedStar?: number;
  soulRingLevels?: Partial<Record<SoulRingSlotId, number>>;
  celestialWingId?: CelestialWingId | null;
  celestialWingStar?: number;
}

export interface HeroModelRefs {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  bodyMeshes: THREE.Mesh[];
  cloak: THREE.Mesh;
  capeTail: THREE.Mesh;
  bowGroup: THREE.Group;
  drawArm: THREE.Group;
  magicOrb: THREE.Mesh;
  nockedArrow: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  hoodGem: THREE.Mesh;
  wingGroup?: THREE.Group;
  leftWingPivot?: THREE.Group;
  rightWingPivot?: THREE.Group;
  celestialWingGroup?: THREE.Group;
  celestialWingLeft?: THREE.Group;
  celestialWingRight?: THREE.Group;
  mountGroup?: THREE.Group;
  mountLegs?: THREE.Group[];
  weaponAuraGroup?: THREE.Group;
  artifactGroup?: THREE.Group;
  haloGroup?: THREE.Group;
  warBannerGroup?: THREE.Group;
  warBannerCloth?: THREE.Mesh;
  mythicCrownGroup?: THREE.Group;
  astralSteedGroup?: THREE.Group;
  astralSteedWings?: THREE.Group[];
  soulRingsGroup?: THREE.Group;
  soulRingNodes?: THREE.Object3D[];
  hitMeshes: THREE.Mesh[];
}

// Elliptical cross-sections give cloth, stone and helmets a shaped silhouette
// without changing the pivots used by animation and hit detection.
function makeSculptedShell(
  sections: ReadonlyArray<readonly [height: number, width: number, depth: number, centerZ?: number]>,
  segments = 20,
  fluting = 0,
): THREE.BufferGeometry {
  const positions: number[] = [];
  const uv: number[] = [];
  const indices: number[] = [];
  sections.forEach(([height, width, depth, centerZ = 0], row) => {
    for (let column = 0; column <= segments; column++) {
      const angle = (column % segments) * Math.PI * 2 / segments;
      const fold = 1 + Math.cos(6 * angle) * fluting;
      positions.push(Math.sin(angle) * width * fold, height, centerZ + Math.cos(angle) * depth * fold);
      uv.push(column / segments, row / (sections.length - 1));
      if (row > 0 && column > 0) {
        const corner = row * (segments + 1) + column;
        const below = corner - segments - 1;
        indices.push(below - 1, below, corner - 1, below, corner, corner - 1);
      }
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const normals = geometry.getAttribute('normal');
  for (let row = 0; row < sections.length; row++) {
    const first = row * (segments + 1);
    const last = first + segments;
    const normal = new THREE.Vector3().fromBufferAttribute(normals, first)
      .add(new THREE.Vector3().fromBufferAttribute(normals, last)).normalize();
    normals.setXYZ(first, normal.x, normal.y, normal.z);
    normals.setXYZ(last, normal.x, normal.y, normal.z);
  }
  return geometry;
}

function makeCrestPlate(width: number, height: number, depth: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, -height * 0.58);
  shape.quadraticCurveTo(width * 0.5, -height * 0.35, width * 0.5, height * 0.23);
  shape.lineTo(width * 0.31, height * 0.48);
  shape.quadraticCurveTo(0, height * 0.32, -width * 0.31, height * 0.48);
  shape.lineTo(-width * 0.5, height * 0.23);
  shape.quadraticCurveTo(-width * 0.5, -height * 0.35, 0, -height * 0.58);
  return new THREE.ExtrudeGeometry(shape, {
    depth, bevelThickness: depth * 0.32, bevelSize: depth * 0.3, bevelSegments: 2, curveSegments: 4,
  });
}

function makeBeveledWingGeo(w: number, h: number, depth = 0.05): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(w * 0.72, h * 0.2, w, h);
  shape.quadraticCurveTo(w * 0.42, h * 0.82, 0.04, h * 0.44);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.025,
    bevelSize: 0.025,
    bevelSegments: 3,
  });
  geo.center();
  return geo;
}

function makeCrescentGeo(outerR: number, innerR: number, depth = 0.05): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.absarc(0, 0, outerR, -Math.PI * 0.2, Math.PI * 1.2, false);
  shape.absarc(0, outerR * 0.22, innerR, Math.PI * 1.15, -Math.PI * 0.15, true);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.015,
    bevelSegments: 2,
  });
  geo.center();
  return geo;
}

function makeCapeShapeGeo(topW: number, bottomW: number, height: number): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-topW / 2, height);
  shape.lineTo(topW / 2, height);
  shape.quadraticCurveTo(bottomW * 0.56, height * 0.42, bottomW / 2, 0.06);
  shape.quadraticCurveTo(bottomW * 0.25, -0.05, 0, 0.02);
  shape.quadraticCurveTo(-bottomW * 0.25, -0.05, -bottomW / 2, 0.06);
  shape.quadraticCurveTo(-bottomW * 0.56, height * 0.42, -topW / 2, height);
  shape.closePath();

  return new THREE.ExtrudeGeometry(shape, {
    depth: 0.045,
    bevelEnabled: true,
    bevelThickness: 0.018,
    bevelSize: 0.018,
    bevelSegments: 2,
  });
}

export function createHeroModel(cfg: HeroVisualConfig): HeroModelRefs {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const hitMeshes: THREE.Mesh[] = [];
  const cloakHexStr = `#${cfg.cloakColorHex.toString(16).padStart(6, '0')}`;
  const cloakTex = createFabricWeaveTexture(cloakHexStr, '#f59e0b');
  const whiteClothTex = createFabricWeaveTexture('#f8fafc', '#f59e0b');
  const faceTex = createHeroFaceTexture(cfg.eyeColor, cfg.cheekColor);

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xf9ceb0,
    roughness: 0.52,
    metalness: 0.02,
  });
  const faceMat = new THREE.MeshStandardMaterial({
    map: faceTex,
    roughness: 0.48,
    metalness: 0.02,
  });
  const hairMat = new THREE.MeshStandardMaterial({
    color: cfg.hairColorHex,
    roughness: 0.5,
    metalness: 0.08,
  });
  const cloakMat = new THREE.MeshStandardMaterial({
    map: cloakTex,
    bumpMap: cloakTex,
    bumpScale: 0.014,
    roughness: 0.72,
    metalness: 0.06,
  });
  const whiteClothMat = new THREE.MeshStandardMaterial({
    map: whiteClothTex,
    roughness: 0.55,
    metalness: 0.05,
  });
  const silverMat = new THREE.MeshStandardMaterial({
    color: 0xcbd5e1,
    roughness: 0.24,
    metalness: 0.88,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.22,
    metalness: 0.9,
  });
  const accentGemMat = new THREE.MeshStandardMaterial({
    color: cfg.weaponAccentHex,
    emissive: cfg.weaponAccentHex,
    emissiveIntensity: 1.25,
    roughness: 0.1,
    metalness: 0.25,
  });
  const magicEnergyMat = new THREE.MeshStandardMaterial({
    color: cfg.weaponAccentHex,
    emissive: cfg.weaponAccentHex,
    emissiveIntensity: 1.65,
    roughness: 0.14,
    metalness: 0.3,
  });

  // 1. Chibi Legs & Boots
  const makeLeg = (side: -1 | 1) => {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.145, 0.54, 0);

    const thigh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.085, 0.2, 14),
      skinMat
    );
    thigh.position.y = -0.1;
    thigh.castShadow = true;

    const bootShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.088, 0.26, 14),
      whiteClothMat
    );
    bootShaft.position.y = -0.32;
    bootShaft.castShadow = true;

    const cuffTrim = new THREE.Mesh(
      new THREE.TorusGeometry(0.102, 0.018, 8, 16),
      goldMat
    );
    cuffTrim.rotation.x = Math.PI / 2;
    cuffTrim.position.y = -0.2;

    const shoe = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 10), cloakMat);
    shoe.scale.set(0.9, 0.58, 1.32);
    shoe.position.set(0, -0.48, 0.05);
    shoe.castShadow = true;

    const ankleGem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.042, 0),
      accentGemMat
    );
    ankleGem.position.set(0, -0.41, 0.1);

    legGroup.add(thigh, bootShaft, cuffTrim, shoe, ankleGem);
    return legGroup;
  };

  const leftLeg = makeLeg(-1);
  const rightLeg = makeLeg(1);
  bodyGroup.add(leftLeg, rightLeg);

  // 2. Layered Skirt + Gold-Trimmed Cloak
  const cloak = new THREE.Mesh(makeSculptedShell([
    [0.30, 0.40, 0.29, -0.025], [0.36, 0.39, 0.28, -0.02],
    [0.51, 0.33, 0.24], [0.67, 0.25, 0.19], [0.80, 0.18, 0.15],
  ], 36, 0.075), cloakMat);
  cloak.castShadow = true;
  cloak.receiveShadow = true;
  bodyGroup.add(cloak);
  hitMeshes.push(cloak);

  const whiteFront = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.31, 0.38, 12, 1, false, -0.7, 1.4),
    whiteClothMat
  );
  whiteFront.position.y = 0.55;
  bodyGroup.add(whiteFront);

  const capeTail = new THREE.Mesh(makeCapeShapeGeo(0.58, 1.08, 0.84), cloakMat);
  capeTail.position.set(0, 0.24, -0.2);
  capeTail.rotation.x = 0.22;
  capeTail.castShadow = true;
  bodyGroup.add(capeTail);
  hitMeshes.push(capeTail);

  // 3. Fitted White Bodice + High Capelet Collar + Gold Gem Belt
  const bodice = new THREE.Mesh(
    makeSculptedShell([
      [-0.2, 0.18, 0.14], [-0.10, 0.19, 0.15], [0.02, 0.23, 0.18],
      [0.13, 0.25, 0.16], [0.2, 0.17, 0.13],
    ]),
    whiteClothMat
  );
  bodice.position.set(0, 0.92, 0.01);
  bodice.castShadow = true;
  const breastplate = new THREE.Mesh(makeCrestPlate(0.33, 0.31, 0.035), silverMat);
  breastplate.position.set(0, 0.93, 0.156);
  breastplate.castShadow = true;
  bodyGroup.add(bodice, breastplate);
  hitMeshes.push(bodice);

  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.195, 0.032, 10, 20), goldMat);
  belt.rotation.x = Math.PI / 2;
  belt.position.set(0, 0.75, 0.01);
  const beltGem = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), accentGemMat);
  beltGem.position.set(0, 0.75, 0.21);
  bodyGroup.add(belt, beltGem);

  const collarPoints = [
    new THREE.Vector2(0.36, 0.94),
    new THREE.Vector2(0.27, 1.08),
    new THREE.Vector2(0.22, 1.15),
  ];
  const capelet = new THREE.Mesh(new THREE.LatheGeometry(collarPoints, 18), cloakMat);
  capelet.castShadow = true;
  const collarRim = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.022, 8, 18), goldMat);
  collarRim.rotation.x = Math.PI / 2;
  collarRim.position.y = 1.13;
  const throatGem = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.055, 0),
    accentGemMat
  );
  throatGem.scale.set(0.9, 1.25, 0.5);
  throatGem.position.set(0, 1.06, 0.23);
  bodyGroup.add(capelet, collarRim, throatGem);

  // 4. Oversized Chibi Head + Expressive Face
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 0.14, 12), skinMat);
  neck.position.set(0, 1.17, 0);
  bodyGroup.add(neck);

  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.54, 0.02);
  bodyGroup.add(headGroup);

  const headGeometry = new THREE.SphereGeometry(0.42, 32, 24);
  const facePositions = headGeometry.getAttribute('position');
  for (let index = 0; index < facePositions.count; index++) {
    const height = facePositions.getY(index);
    const jaw = THREE.MathUtils.smoothstep(-height, 0.06, 0.42);
    facePositions.setX(index, facePositions.getX(index) * (1 - jaw * 0.13));
    facePositions.setZ(index, facePositions.getZ(index) * (1 - jaw * 0.22));
  }
  headGeometry.computeVertexNormals();
  const head = new THREE.Mesh(headGeometry, faceMat);
  head.rotation.y = -Math.PI / 2;
  head.scale.set(1.03, 0.96, 1.0);
  head.castShadow = true;
  headGroup.add(head);
  hitMeshes.push(head);

  const browGeo = new THREE.SphereGeometry(0.055, 10, 8);
  const lBrow = new THREE.Mesh(browGeo, hairMat);
  lBrow.scale.set(1.5, 0.65, 0.65);
  lBrow.position.set(-0.15, 0.14, 0.38);
  lBrow.rotation.z = 0.2;
  const rBrow = new THREE.Mesh(browGeo, hairMat);
  rBrow.scale.set(1.5, 0.65, 0.65);
  rBrow.position.set(0.15, 0.14, 0.38);
  rBrow.rotation.z = -0.2;
  headGroup.add(lBrow, rBrow);

  // Elf ears for Artemis/Rolla, standard cute ears otherwise
  const isElf = cfg.crownStyle === 'crescent' || cfg.crownStyle === 'rolla_tiara';
  for (const side of [-1, 1] as const) {
    const ear = new THREE.Mesh(
      isElf ? new THREE.ConeGeometry(0.095, 0.34, 10) : new THREE.SphereGeometry(0.085, 10, 8),
      skinMat
    );
    ear.position.set(side * (isElf ? 0.45 : 0.41), -0.01, -0.02);
    if (isElf) {
      ear.rotation.z = -side * 1.32;
      ear.rotation.y = -side * 0.2;
    }
    headGroup.add(ear);

    if (isElf) {
      const earring = new THREE.Mesh(makeCrescentGeo(0.075, 0.05, 0.022), accentGemMat);
      earring.position.set(side * 0.42, -0.17, 0.03);
      earring.rotation.z = side * 0.35;
      headGroup.add(earring);
    }
  }

  // 5. Lush Hair + Side Bangs + Braid/Locks
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.445, 24, 18, 0, Math.PI * 2, 0, Math.PI * 0.62),
    hairMat
  );
  hairCap.position.set(0, 0.03, -0.03);
  hairCap.rotation.x = -0.28;
  hairCap.castShadow = true;
  headGroup.add(hairCap);

  for (const side of [-1, 1] as const) {
    const bangCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.34, 0.3),
      new THREE.Vector3(side * 0.22, 0.25, 0.36),
      new THREE.Vector3(side * 0.38, 0.06, 0.24),
      new THREE.Vector3(side * 0.36, -0.16, 0.12),
    ]);
    const bang = new THREE.Mesh(
      new THREE.TubeGeometry(bangCurve, 14, 0.095, 10, false),
      hairMat
    );
    bang.castShadow = true;
    headGroup.add(bang);
  }

  if (cfg.crownStyle === 'crescent' || cfg.crownStyle === 'cleo_crown' || cfg.crownStyle === 'rolla_tiara') {
    const braidCount = 7;
    for (let i = 0; i < braidCount; i++) {
      const t = i / (braidCount - 1);
      const radius = 0.165 - t * 0.045;
      const puff = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 10), hairMat);
      puff.position.set(
        0.26 + Math.sin(t * 2.2) * 0.06,
        -0.06 - t * 0.68,
        -0.28 - Math.cos(t * 1.4) * 0.06
      );
      puff.scale.set(1.1, 0.9, 1.0);
      puff.castShadow = true;
      headGroup.add(puff);
    }
  }

  // Hero-Specific Crown / Headgear
  const crownGroup = new THREE.Group();
  crownGroup.position.set(0, 0.44, 0.18);
  crownGroup.rotation.x = -0.18;
  headGroup.add(crownGroup);

  const hoodGem = new THREE.Mesh(new THREE.SphereGeometry(0.072, 14, 12), accentGemMat);
  hoodGem.scale.set(1, 1, 0.65);

  if (cfg.crownStyle === 'crescent') {
    const crescentMesh = new THREE.Mesh(makeCrescentGeo(0.28, 0.19, 0.055), silverMat);
    crescentMesh.castShadow = true;
    const browBand = new THREE.Mesh(
      new THREE.TorusGeometry(0.39, 0.032, 8, 24, Math.PI * 0.85),
      silverMat
    );
    browBand.rotation.x = Math.PI / 2;
    browBand.rotation.z = -Math.PI * 0.42;
    browBand.position.set(0, -0.16, -0.12);
    hoodGem.position.set(0, -0.05, 0.045);
    const gemSetting = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.016, 8, 16), goldMat);
    gemSetting.position.set(0, -0.05, 0.045);
    crownGroup.add(crescentMesh, browBand, hoodGem, gemSetting);
  } else if (cfg.crownStyle === 'thor_wings') {
    for (const side of [-1, 1] as const) {
      const wing = new THREE.Mesh(makeBeveledWingGeo(0.32, 0.34, 0.04), silverMat);
      wing.position.set(side * 0.44, -0.12, -0.16);
      wing.rotation.y = side > 0 ? -0.35 : Math.PI + 0.35;
      crownGroup.add(wing);
    }
    hoodGem.position.set(0, -0.1, 0.12);
    crownGroup.add(hoodGem);
  } else if (cfg.crownStyle === 'wukong_circlet') {
    const circlet = new THREE.Mesh(new THREE.TorusGeometry(0.41, 0.032, 10, 24), goldMat);
    circlet.rotation.x = Math.PI / 2;
    circlet.position.set(0, -0.2, -0.14);
    crownGroup.add(circlet);
    for (const side of [-1, 1] as const) {
      const plumeCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, -0.1, 0.15),
        new THREE.Vector3(side * 0.25, 0.28, -0.05),
        new THREE.Vector3(side * 0.48, 0.55, -0.35),
      ]);
      const plume = new THREE.Mesh(
        new THREE.TubeGeometry(plumeCurve, 12, 0.032, 8, false),
        new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xe11d48, emissiveIntensity: 0.6 })
      );
      crownGroup.add(plume);
    }
    hoodGem.position.set(0, -0.14, 0.24);
    crownGroup.add(hoodGem);
  } else if (cfg.crownStyle === 'cleo_crown' || cfg.crownStyle === 'rolla_tiara') {
    const mat = cfg.crownStyle === 'cleo_crown' ? goldMat : silverMat;
    for (let i = -2; i <= 2; i++) {
      const spike = new THREE.Mesh(
        new THREE.ConeGeometry(0.06, i === 0 ? 0.28 : 0.2, 6),
        mat
      );
      spike.position.set(i * 0.12, -0.05 + (i === 0 ? 0.05 : 0), 0.12 - Math.abs(i) * 0.06);
      crownGroup.add(spike);
    }
    hoodGem.position.set(0, -0.12, 0.18);
    crownGroup.add(hoodGem);
  } else if (cfg.crownStyle === 'demon_horns') {
    for (const side of [-1, 1] as const) {
      const hCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.24, -0.12, -0.05),
        new THREE.Vector3(side * 0.46, 0.18, -0.02),
        new THREE.Vector3(side * 0.36, 0.42, 0.16),
      ]);
      const horn = new THREE.Mesh(
        new THREE.TubeGeometry(hCurve, 12, 0.058, 8, false),
        new THREE.MeshStandardMaterial({ color: 0x1e1b4b, metalness: 0.5, roughness: 0.3 })
      );
      crownGroup.add(horn);
    }
    hoodGem.position.set(0, -0.12, 0.18);
    crownGroup.add(hoodGem);
  } else {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.41, 0.032, 8, 22, Math.PI * 0.9),
      goldMat
    );
    band.rotation.x = Math.PI / 2;
    band.rotation.z = -Math.PI * 0.45;
    band.position.set(0, -0.18, -0.12);
    hoodGem.position.set(0, -0.14, 0.2);
    crownGroup.add(band, hoodGem);
  }

  // 6. Left Arm + Weapon Group (Bow / Staff / Claw)
  const leftArm = new THREE.Group();
  leftArm.position.set(-0.24, 0.98, 0.06);
  leftArm.rotation.set(0.3, 0.1, 0.25);
  const lSleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.135, 0.38, 12),
    whiteClothMat
  );
  lSleeve.position.set(-0.04, -0.14, 0.14);
  lSleeve.rotation.x = Math.PI / 2 - 0.35;
  const lCuff = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 8, 14), goldMat);
  lCuff.position.set(-0.06, -0.22, 0.29);
  const lHand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), skinMat);
  lHand.position.set(-0.07, -0.24, 0.35);
  leftArm.add(lSleeve, lCuff, lHand);
  bodyGroup.add(leftArm);

  const bowGroup = new THREE.Group();
  bowGroup.position.set(-0.18, 0.88, 0.46);
  bodyGroup.add(bowGroup);

  const nockedArrow = new THREE.Group();
  nockedArrow.position.set(0, 0, 0.1);

  if (cfg.weaponArchetype === 'staff') {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.032, 1.45, 10), goldMat);
    shaft.rotation.x = 0.28;
    const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.028, 8, 20), silverMat);
    crownRing.position.set(0, 0.72, 0.2);
    const staffOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), magicEnergyMat);
    staffOrb.position.set(0, 0.72, 0.2);
    bowGroup.add(shaft, crownRing, staffOrb);

    const orbHead = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), magicEnergyMat);
    orbHead.position.z = 0.35;
    nockedArrow.add(orbHead);
    bowGroup.add(nockedArrow);
  } else if (cfg.weaponArchetype === 'claw') {
    const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.32), silverMat);
    gauntlet.position.z = 0.12;
    bowGroup.add(gauntlet);
    for (let c = -1; c <= 1; c++) {
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.48, 4), magicEnergyMat);
      blade.rotation.x = Math.PI / 2;
      blade.position.set(c * 0.06, 0.02, 0.42);
      bowGroup.add(blade);
    }
    const wave = new THREE.Mesh(makeCrescentGeo(0.18, 0.11, 0.03), magicEnergyMat);
    wave.rotation.x = Math.PI / 2;
    wave.position.z = 0.36;
    nockedArrow.add(wave);
    bowGroup.add(nockedArrow);
  } else {
    const bowCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, -0.58, -0.22),
      new THREE.Vector3(0, -0.32, 0.08),
      new THREE.Vector3(0, 0, 0.2),
      new THREE.Vector3(0, 0.32, 0.08),
      new THREE.Vector3(0, 0.58, -0.22),
    ]);
    const bowLimbs = new THREE.Mesh(
      new THREE.TubeGeometry(bowCurve, 22, 0.036, 10, false),
      silverMat
    );
    bowLimbs.castShadow = true;

    const bowGrip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.052, 0.052, 0.2, 10),
      goldMat
    );
    bowGrip.position.set(0, 0, 0.19);
    const bowCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), magicEnergyMat);
    bowCrystal.position.set(0, 0, 0.25);
    const bowString = new THREE.Mesh(
      new THREE.CylinderGeometry(0.009, 0.009, 1.14, 6),
      magicEnergyMat
    );
    bowString.position.set(0, 0, -0.21);
    bowGroup.add(bowLimbs, bowGrip, bowCrystal, bowString);

    const arrowShaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.016, 0.016, 0.68, 6),
      goldMat
    );
    arrowShaft.rotation.x = Math.PI / 2;
    const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.062, 0.16, 4), magicEnergyMat);
    arrowHead.rotation.x = Math.PI / 2;
    arrowHead.position.z = 0.38;
    nockedArrow.add(arrowShaft, arrowHead);
    bowGroup.add(nockedArrow);
  }

  // Right Draw Arm with Glowing Crescent Orb
  const drawArm = new THREE.Group();
  drawArm.position.set(0.24, 0.98, 0.06);
  const rSleeve = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.135, 0.38, 12),
    whiteClothMat
  );
  rSleeve.position.set(0.08, -0.1, 0.16);
  rSleeve.rotation.x = Math.PI / 2 - 0.3;
  rSleeve.rotation.z = -0.25;
  const rCuff = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 8, 14), goldMat);
  rCuff.position.set(0.14, -0.16, 0.31);
  const rHand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 10), skinMat);
  rHand.position.set(0.16, -0.17, 0.37);
  const magicOrb = new THREE.Mesh(makeCrescentGeo(0.14, 0.09, 0.03), magicEnergyMat);
  magicOrb.position.set(0.2, -0.12, 0.44);
  drawArm.add(rSleeve, rCuff, rHand, magicOrb);
  bodyGroup.add(drawArm);

  const bodyMeshes: THREE.Mesh[] = [];
  for (const part of bodyGroup.children) {
    if (part === bowGroup) continue;
    part.traverse((object) => {
      if (object instanceof THREE.Mesh && object !== magicOrb) bodyMeshes.push(object);
    });
  }

  // 7. Composite 3D Zodiac Wings attached to Hero's back
  let wingGroup: THREE.Group | undefined;
  let leftWingPivot: THREE.Group | undefined;
  let rightWingPivot: THREE.Group | undefined;
  if (cfg.wingId) {
    const builtWings = createZodiacWingsModel(cfg.wingId, cfg.wingLevel ?? 1);
    wingGroup = builtWings.group;
    leftWingPivot = builtWings.leftPivot;
    rightWingPivot = builtWings.rightPivot;
    wingGroup.position.set(0, 0.96, -0.24);
    bodyGroup.add(wingGroup);
  }

  // 8. Awakened Weapon Aura (attached to bodyGroup near weapon/orb hand so visible in Lobby & Combat)
  let weaponAuraGroup: THREE.Group | undefined;
  if (cfg.weaponAuraId && cfg.weaponAuraId !== 'none') {
    weaponAuraGroup = createWeaponAuraModel(cfg.weaponAuraId, cfg.weaponAuraLevel ?? 1);
    weaponAuraGroup.position.set(0.28, 0.94, 0.34);
    bodyGroup.add(weaponAuraGroup);
  }

  // 9. Mythic 3D Artifact orbiting behind right shoulder
  let artifactGroup: THREE.Group | undefined;
  if (cfg.artifactId) {
    artifactGroup = createMythicArtifactModel(cfg.artifactId, cfg.artifactLevel ?? 1);
    artifactGroup.position.set(0.56, 1.38, -0.22);
    bodyGroup.add(artifactGroup);
  }

  // 10. Wave 10: 3D Divine Zodiac Halo rotating behind Hero's head & shoulders
  let haloGroup: THREE.Group | undefined;
  if (cfg.haloId) {
    haloGroup = createDivineHaloModel(cfg.haloId, cfg.haloLevel ?? 1);
    haloGroup.position.set(0, 1.34, -0.34);
    bodyGroup.add(haloGroup);
  }

  // 10b. Wave 12: Mythic Weapon Transcendence 3D Crown FX (Tier 1..5)
  let mythicCrownGroup: THREE.Group | undefined;
  const mythicTier = Math.max(0, Math.min(5, Math.floor(cfg.mythicWeaponTier ?? 0)));
  if (mythicTier >= 1) {
    mythicCrownGroup = createMythicWeaponCrownFx(mythicTier);
    mythicCrownGroup.position.set(0, 0.08, 0.16);
    bowGroup.add(mythicCrownGroup);
  }

  // 10c. Wave 12: 3D Royal War Banner planted behind Hero's left shoulder
  let warBannerGroup: THREE.Group | undefined;
  let warBannerCloth: THREE.Mesh | undefined;
  if (cfg.warBannerId && WAR_BANNER_MAP[cfg.warBannerId]) {
    const builtBanner = createWarBannerModel(cfg.warBannerId, cfg.warBannerLevel ?? 1);
    warBannerGroup = builtBanner.group;
    warBannerCloth = builtBanner.clothMesh;
    warBannerGroup.position.set(-0.46, 0.42, -0.34);
    warBannerGroup.rotation.z = 0.12;
    bodyGroup.add(warBannerGroup);
  }

  // 10d. Wave 13: Multi-Tier Orbiting 3D Soul Rings encircling Hero
  let soulRingsGroup: THREE.Group | undefined;
  let soulRingNodes: THREE.Object3D[] | undefined;
  if (cfg.soulRingLevels) {
    const hasAnyRing = Object.values(cfg.soulRingLevels).some((lv) => (lv ?? 0) > 0);
    if (hasAnyRing) {
      const builtRings = createSoulRingsGroup(cfg.soulRingLevels);
      soulRingsGroup = builtRings.group;
      soulRingNodes = builtRings.ringNodes;
      soulRingsGroup.position.set(0, 0.96, 0);
      bodyGroup.add(soulRingsGroup);
    }
  }

  // 10e. Wave 14: Articulated Multi-Tier 3D Celestial Wings
  let celestialWingGroup: THREE.Group | undefined;
  let celestialWingLeft: THREE.Group | undefined;
  let celestialWingRight: THREE.Group | undefined;
  if (cfg.celestialWingId && CELESTIAL_WING_MAP[cfg.celestialWingId]) {
    const builtCelWings = createCelestialWings3DGroup(
      cfg.celestialWingId,
      cfg.celestialWingStar ?? 1
    );
    celestialWingGroup = builtCelWings.group;
    celestialWingLeft = builtCelWings.leftPivot;
    celestialWingRight = builtCelWings.rightPivot;
    celestialWingGroup.position.set(0, 1.18, -0.34);
    bodyGroup.add(celestialWingGroup);
  }

  // 11. Composite 3D Astral Steed (Wave 13) or Legacy Zodiac Mount under Hero
  let mountGroup: THREE.Group | undefined;
  let mountLegs: THREE.Group[] | undefined;
  let astralSteedGroup: THREE.Group | undefined;
  let astralSteedWings: THREE.Group[] | undefined;
  if (cfg.astralSteedId && ASTRAL_STEED_MAP[cfg.astralSteedId]) {
    const builtSteed = createAstralSteedModel(cfg.astralSteedId, cfg.astralSteedStar ?? 1);
    astralSteedGroup = builtSteed.group;
    astralSteedWings = builtSteed.wingPivots;
    mountGroup = builtSteed.group;
    mountLegs = builtSteed.legs;
    root.add(astralSteedGroup);
    bodyGroup.position.y = 0.72;
  } else if (cfg.mountId) {
    const builtMount = createZodiacMountModel(cfg.mountId, cfg.mountLevel ?? 1);
    mountGroup = builtMount.group;
    mountLegs = builtMount.legs;
    root.add(mountGroup);
    bodyGroup.position.y = 0.68;
  }

  return {
    root,
    bodyGroup,
    bodyMeshes,
    cloak,
    capeTail,
    bowGroup,
    drawArm,
    magicOrb,
    nockedArrow,
    leftLeg,
    rightLeg,
    hoodGem,
    wingGroup,
    leftWingPivot,
    rightWingPivot,
    celestialWingGroup,
    celestialWingLeft,
    celestialWingRight,
    mountGroup,
    mountLegs,
    weaponAuraGroup,
    artifactGroup,
    haloGroup,
    warBannerGroup,
    warBannerCloth,
    mythicCrownGroup,
    astralSteedGroup,
    astralSteedWings,
    soulRingsGroup,
    soulRingNodes,
    hitMeshes,
  };
}

function createZodiacWingsModel(
  wingId: WingId,
  wingLevel: number
): { group: THREE.Group; leftPivot: THREE.Group; rightPivot: THREE.Group } {
  const def = WING_MAP[wingId];
  const group = new THREE.Group();
  const scaleFactor = 1 + Math.min(14, Math.max(0, wingLevel - 1)) * 0.022;
  const emissiveBoost = 0.85 + Math.min(14, Math.max(0, wingLevel - 1)) * 0.06;

  const spineMat = new THREE.MeshStandardMaterial({
    color: def.spineHex,
    roughness: 0.24,
    metalness: 0.88,
  });
  const primaryMat = new THREE.MeshStandardMaterial({
    color: def.primaryHex,
    emissive: def.primaryHex,
    emissiveIntensity: emissiveBoost * 0.72,
    roughness: 0.28,
    metalness: 0.48,
  });
  const tipMat = new THREE.MeshStandardMaterial({
    color: def.secondaryHex,
    emissive: def.secondaryHex,
    emissiveIntensity: emissiveBoost * 1.15,
    roughness: 0.14,
    metalness: 0.22,
  });

  // Central spinal crest & jewel core
  const spinalPlate = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), spineMat);
  spinalPlate.scale.set(0.85, 1.5, 0.45);
  const coreGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), tipMat);
  coreGem.position.set(0, 0.02, -0.05);
  group.add(spinalPlate, coreGem);

  const bladeCount = def.featherStyle === 'seraph' ? 5 : def.featherStyle === 'crystal' ? 4 : 3;

  const buildWingSide = (side: -1 | 1) => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.08, 0.06, -0.02);

    // Upper shoulder strut
    const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.032, 0.46, 8), spineMat);
    strut.rotation.z = -side * 1.1;
    strut.position.set(side * 0.2, 0.14, -0.03);
    pivot.add(strut);

    for (let i = 0; i < bladeCount; i++) {
      const w = (0.48 - i * 0.075) * scaleFactor;
      const h = (0.64 - i * 0.08) * scaleFactor;
      const featherGeo = makeBeveledWingGeo(w, h, 0.035);
      const blade = new THREE.Mesh(featherGeo, i % 2 === 0 ? primaryMat : tipMat);
      blade.position.set(side * (0.28 + i * 0.08), 0.18 - i * 0.13, -0.04 - i * 0.025);
      blade.rotation.y = side > 0 ? -0.32 - i * 0.04 : Math.PI + 0.32 + i * 0.04;
      blade.rotation.z = side * (0.14 - i * 0.2);
      blade.castShadow = true;
      pivot.add(blade);
    }

    // Glowing feather tip accent shard
    const tipShard = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.34 * scaleFactor, 5), tipMat);
    tipShard.position.set(side * (0.62 * scaleFactor), 0.38 * scaleFactor, -0.09);
    tipShard.rotation.z = -side * 0.92;
    pivot.add(tipShard);

    return pivot;
  };

  const leftPivot = buildWingSide(-1);
  const rightPivot = buildWingSide(1);
  group.add(leftPivot, rightPivot);

  return { group, leftPivot, rightPivot };
}

export interface EnemyModelRefs {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  headOrCore: THREE.Mesh;
  weaponOrRing?: THREE.Object3D;
  wings?: THREE.Object3D[];
  hitMeshes: THREE.Mesh[];
}

export function createEnemyModel(
  kind: EnemyKind,
  zodiacAccentHex = 0xfbbf24,
  isElite = false
): EnemyModelRefs {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);
  const hitMeshes: THREE.Mesh[] = [];

  if (kind === EnemyKind.SKIRMISHER) {
    const faceTex = createGoblinFaceTexture();
    const skinMat = new THREE.MeshStandardMaterial({
      color: isElite ? 0xd97706 : 0x65a30d,
      roughness: 0.56,
      metalness: 0.04,
    });
    const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.5, metalness: 0.04 });
    const tunicMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.68, metalness: 0.1 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.24, metalness: 0.88 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.28, metalness: 0.85 });
    const ivoryMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.35 });

    const legGeo = makeSculptedShell([
      [-0.17, 0.074, 0.075], [-0.08, 0.093, 0.09],
      [0.05, 0.110, 0.095], [0.17, 0.102, 0.10],
    ], 14);
    const lLeg = new THREE.Mesh(legGeo, skinMat);
    lLeg.position.set(-0.15, 0.17, 0);
    lLeg.castShadow = true;
    const rLeg = new THREE.Mesh(legGeo, skinMat);
    rLeg.position.set(0.15, 0.17, 0);
    rLeg.castShadow = true;

    const torso = new THREE.Mesh(makeSculptedShell([
      [-0.22, 0.23, 0.16], [-0.14, 0.27, 0.20], [0.03, 0.24, 0.19],
      [0.15, 0.30, 0.17], [0.22, 0.15, 0.12],
    ]), tunicMat);
    const cuirass = new THREE.Mesh(makeCrestPlate(0.46, 0.35, 0.045), steelMat);
    cuirass.position.set(0, 0.58, 0.16);
    bodyGroup.add(cuirass);
    torso.position.y = 0.52;
    torso.castShadow = true;
    hitMeshes.push(torso);

    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.036, 8, 16), goldMat);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.42;

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.34, 24, 18), faceMat);
    head.rotation.y = -Math.PI / 2;
    head.position.set(0, 1.0, 0.04);
    head.castShadow = true;
    hitMeshes.push(head);

    for (const side of [-1, 1] as const) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.32, 8), skinMat);
      ear.position.set(side * 0.38, 1.02, 0);
      ear.rotation.z = -side * 1.25;
      bodyGroup.add(ear);
    }

    const helm = new THREE.Mesh(
      new THREE.SphereGeometry(0.355, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.46),
      steelMat
    );
    helm.position.set(0, 1.04, 0.02);
    helm.rotation.x = -0.22;
    helm.castShadow = true;
    const helmRim = new THREE.Mesh(new THREE.TorusGeometry(0.345, 0.03, 8, 22), goldMat);
    helmRim.rotation.x = Math.PI / 2 - 0.22;
    helmRim.position.set(0, 1.09, 0.02);

    for (const side of [-1, 1] as const) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 8), ivoryMat);
      horn.position.set(side * 0.24, 1.32, 0.04);
      horn.rotation.z = -side * 0.48;
      bodyGroup.add(horn);
    }

    const mace = new THREE.Group();
    mace.position.set(0.36, 0.62, 0.18);
    mace.rotation.x = 0.65;
    const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.032, 0.65, 8), tunicMat);
    const maceHead = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), steelMat);
    maceHead.position.y = 0.34;
    mace.add(handle, maceHead);

    const bootGeometry = new THREE.SphereGeometry(0.12, 14, 10);
    const greaveGeometry = makeCrestPlate(0.14, 0.16, 0.035);
    for (const side of [-1, 1]) {
      const boot = new THREE.Mesh(bootGeometry, tunicMat);
      boot.scale.set(0.92, 0.56, 1.4);
      boot.position.set(side * 0.15, 0.072, 0.063);
      boot.castShadow = true;
      const greave = new THREE.Mesh(greaveGeometry, steelMat);
      greave.position.set(side * 0.15, 0.17, 0.08);
      bodyGroup.add(boot, greave);
    }

    bodyGroup.add(lLeg, rLeg, torso, belt, head, helm, helmRim, mace);
    if (isElite) bodyGroup.scale.setScalar(1.22);
    return { root, bodyGroup, headOrCore: head, weaponOrRing: mace, hitMeshes };
  }

  if (kind === EnemyKind.IMP_ARCHER || kind === EnemyKind.SHADOW_STALKER) {
    const isStalker = kind === EnemyKind.SHADOW_STALKER;
    const robeTex = createFabricWeaveTexture(isStalker ? '#3b0764' : '#5b21b6', '#fbbf24');
    const cloakMat = new THREE.MeshStandardMaterial({ map: robeTex, roughness: 0.6, metalness: 0.1 });
    const darkFaceMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.4, metalness: 0.25 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.22, metalness: 0.9 });
    const glowMat = new THREE.MeshStandardMaterial({
      color: isStalker ? 0xc084fc : 0xf43f5e,
      emissive: isStalker ? 0xa855f7 : 0xf43f5e,
      emissiveIntensity: 1.75,
      roughness: 0.15,
    });

    const robe = new THREE.Mesh(makeSculptedShell([
      [0.14, 0.41, 0.31, -0.08], [0.25, 0.36, 0.29, -0.055],
      [0.47, 0.28, 0.22], [0.64, 0.25, 0.17], [0.76, 0.30, 0.18],
      [0.85, 0.18, 0.13],
    ], 24, 0.10), cloakMat);
    robe.castShadow = true;
    hitMeshes.push(robe);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.31, 20, 16), darkFaceMat);
    head.position.y = 1.06;
    head.castShadow = true;
    hitMeshes.push(head);

    const hood = new THREE.Mesh(makeSculptedShell([
      [-0.28, 0.33, 0.31, 0.02], [-0.11, 0.37, 0.34, 0.05],
      [0.08, 0.31, 0.29], [0.23, 0.19, 0.18, -0.09], [0.38, 0, 0, -0.19],
    ]), cloakMat);
    hood.position.set(0, 1.28, -0.06);
    hood.rotation.x = -0.3;
    hood.castShadow = true;
    const hoodRim = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.028, 8, 20), goldMat);
    hoodRim.rotation.x = Math.PI / 2 - 0.3;
    hoodRim.position.set(0, 1.08, 0.02);

    for (const side of [-1, 1] as const) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), glowMat);
      eye.scale.set(1.3, 0.85, 0.6);
      eye.position.set(side * 0.12, 1.05, 0.28);
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.26, 8), goldMat);
      horn.position.set(side * 0.22, 1.38, 0.06);
      horn.rotation.z = -side * 0.42;
      bodyGroup.add(eye, horn);
    }

    const haloGroup = new THREE.Group();
    haloGroup.position.set(0, 1.1, -0.34);
    const haloRing = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.026, 8, 24), glowMat);
    haloGroup.add(haloRing);
    for (let i = 0; i < 4; i++) {
      const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), goldMat);
      const a = (i * Math.PI) / 2;
      gem.position.set(Math.cos(a) * 0.42, Math.sin(a) * 0.42, 0);
      haloGroup.add(gem);
    }

    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.026, 1.25, 8), goldMat);
    staff.position.set(0.36, 0.78, 0.18);
    staff.rotation.x = 0.22;
    const orb = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), glowMat);
    orb.position.set(0.36, 1.42, 0.32);

    bodyGroup.add(robe, head, hood, hoodRim, haloGroup, staff, orb);
    if (isElite) bodyGroup.scale.setScalar(1.2);
    return { root, bodyGroup, headOrCore: head, weaponOrRing: haloGroup, hitMeshes };
  }

  if (kind === EnemyKind.GOLEM) {
    const stoneTex = createEngravedArmorTexture('#576574', '#fb923c');
    const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.65, metalness: 0.18 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.24, metalness: 0.88 });
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xfb923c,
      emissive: 0xf97316,
      emissiveIntensity: 1.8,
      roughness: 0.14,
    });

    const legGeo = new THREE.CylinderGeometry(0.16, 0.2, 0.45, 12);
    const lLeg = new THREE.Mesh(legGeo, stoneMat);
    lLeg.position.set(-0.26, 0.225, 0);
    lLeg.castShadow = true;
    const rLeg = new THREE.Mesh(legGeo, stoneMat);
    rLeg.position.set(0.26, 0.225, 0);
    rLeg.castShadow = true;

    const body = new THREE.Mesh(new THREE.DodecahedronGeometry(0.56, 0), stoneMat);
    body.scale.set(1.08, 0.96, 0.92);
    body.position.y = 0.88;
    body.castShadow = true;
    hitMeshes.push(body);

    const coreRing = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.038, 8, 18), goldMat);
    coreRing.position.set(0, 0.86, 0.49);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), coreMat);
    core.position.set(0, 0.86, 0.51);

    const helm = new THREE.Mesh(new THREE.SphereGeometry(0.36, 18, 14), stoneMat);
    helm.position.set(0, 1.44, 0.06);
    helm.castShadow = true;
    hitMeshes.push(helm);

    for (const side of [-1, 1] as const) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.068, 10, 8), coreMat);
      eye.scale.set(1.25, 0.8, 0.6);
      eye.position.set(side * 0.14, 1.46, 0.37);
      const pauldron = new THREE.Mesh(new THREE.DodecahedronGeometry(0.29, 0), stoneMat);
      pauldron.scale.set(1.2, 0.88, 1);
      pauldron.rotation.z = side * 0.35;
      pauldron.position.set(side * 0.62, 1.06, 0);
      pauldron.castShadow = true;
      const fist = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), stoneMat);
      fist.position.set(side * 0.68, 0.56, 0.15);
      fist.castShadow = true;
      bodyGroup.add(eye, pauldron, fist);
    }

    bodyGroup.add(lLeg, rLeg, body, coreRing, core, helm);
    if (isElite) bodyGroup.scale.setScalar(1.2);
    return { root, bodyGroup, headOrCore: core, hitMeshes };
  }

  if (kind === EnemyKind.WISP || kind === EnemyKind.DRAGON_WHELP) {
    const isDragon = kind === EnemyKind.DRAGON_WHELP;
    const crystalMat = new THREE.MeshStandardMaterial({
      color: isDragon ? 0xfb923c : 0x67e8f9,
      emissive: isDragon ? 0xea580c : 0x06b6d4,
      emissiveIntensity: 1.35,
      roughness: 0.18,
      metalness: 0.35,
    });
    const filigreeMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.2, metalness: 0.92 });
    const wingMat = new THREE.MeshStandardMaterial({
      color: isDragon ? 0xf43f5e : 0x38bdf8,
      emissive: isDragon ? 0xe11d48 : 0x0ea5e9,
      emissiveIntensity: 0.9,
      roughness: 0.18,
      metalness: 0.3,
    });

    const shellMat = new THREE.MeshStandardMaterial({
      color: isDragon ? 0x662231 : 0x154c68,
      roughness: 0.36, metalness: 0.58,
    });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.34, 0), crystalMat);
    core.scale.set(0.86, 1.2, 0.86);
    for (const side of [-1, 1]) {
      const shell = new THREE.Mesh(makeCrestPlate(0.20, 0.46, 0.06), shellMat);
      shell.position.set(side * 0.22, 1.00, 0.11);
      shell.rotation.set(0.15, side * 0.68, side * 0.26);
      bodyGroup.add(shell);
    }
    core.position.y = 1.02;
    core.castShadow = true;
    hitMeshes.push(core);

    if (isDragon) {
      for (const side of [-1, 1] as const) {
        const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.25, 8), filigreeMat);
        horn.position.set(side * 0.16, 1.36, 0);
        horn.rotation.z = -side * 0.35;
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), filigreeMat);
        eye.position.set(side * 0.13, 1.06, 0.3);
        bodyGroup.add(horn, eye);
      }
    }

    const ringGroup = new THREE.Group();
    ringGroup.position.y = 1.02;
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.025, 8, 24), filigreeMat);
    ringGroup.add(outerRing);

    const wingGeo = makeBeveledWingGeo(0.58, 0.5, 0.03);
    const wings: THREE.Object3D[] = [];
    for (let i = 0; i < (isDragon ? 2 : 4); i++) {
      const wingPivot = new THREE.Group();
      wingPivot.position.set(0, 1.02, 0);
      const side = i % 2 === 0 ? 1 : -1;
      const upper = i < 2 ? 1 : -1;
      const wingMesh = new THREE.Mesh(wingGeo, wingMat);
      wingMesh.position.set(side * 0.34, upper * 0.1, -0.08);
      wingMesh.rotation.y = side > 0 ? -0.35 : Math.PI + 0.35;
      wingMesh.rotation.z = upper * 0.22;
      wingPivot.add(wingMesh);
      bodyGroup.add(wingPivot);
      wings.push(wingPivot);
    }

    bodyGroup.add(core, ringGroup);
    if (isElite) bodyGroup.scale.setScalar(1.22);
    return { root, bodyGroup, headOrCore: core, weaponOrRing: ringGroup, wings, hitMeshes };
  }

  // Bosses: WARDEN_BOSS, TITAN_BOSS, ZODIAC_BOSS
  const isZodiac = kind === EnemyKind.ZODIAC_BOSS;
  const isTitan = kind === EnemyKind.TITAN_BOSS;
  const scale = isZodiac ? 1.56 : isTitan ? 1.44 : 1.26;
  const armorHexStr = `#${(isZodiac ? 0x1e1b4b : isTitan ? 0x27272a : 0x1e3a8a)
    .toString(16)
    .padStart(6, '0')}`;
  const accentHexStr = `#${zodiacAccentHex.toString(16).padStart(6, '0')}`;
  const armorTex = createEngravedArmorTexture(armorHexStr, accentHexStr);
  const bossArmorMat = new THREE.MeshStandardMaterial({
    map: armorTex, bumpMap: armorTex, bumpScale: 0.025, roughness: 0.38, metalness: 0.72,
  });
  const bossGoldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.2, metalness: 0.92 });
  const bossCoreMat = new THREE.MeshStandardMaterial({
    color: isZodiac ? zodiacAccentHex : isTitan ? 0xef4444 : 0x38bdf8,
    emissive: isZodiac ? zodiacAccentHex : isTitan ? 0xef4444 : 0x0ea5e9,
    emissiveIntensity: 1.95,
    roughness: 0.14,
  });
  const capeTex = createFabricWeaveTexture(isZodiac ? '#4c1d95' : isTitan ? '#7f1d1d' : '#1d4ed8', '#fbbf24');
  const capeMat = new THREE.MeshStandardMaterial({ map: capeTex, roughness: 0.62, metalness: 0.1 });

  const lLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.6, 12), bossArmorMat);
  lLeg.position.set(-0.28, 0.3, 0);
  lLeg.castShadow = true;
  const rLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 0.6, 12), bossArmorMat);
  rLeg.position.set(0.28, 0.3, 0);
  rLeg.castShadow = true;

  const cape = new THREE.Mesh(makeCapeShapeGeo(0.95, 1.55, 1.32), capeMat);
  cape.position.set(0, 0.24, -0.4);
  cape.rotation.x = 0.14;
  cape.castShadow = true;

  const torso = new THREE.Mesh(makeSculptedShell([
    [-0.42, 0.32, 0.25], [-0.26, 0.35, 0.28], [-0.08, 0.46, 0.38],
    [0.17, 0.56, 0.42], [0.31, 0.48, 0.32], [0.42, 0.27, 0.24],
  ]), bossArmorMat);
  torso.position.y = 0.98;
  torso.castShadow = true;
  hitMeshes.push(torso);

  const coreRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 20), bossGoldMat);
  coreRing.position.set(0, 1.0, 0.42);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), bossCoreMat);
  core.position.set(0, 1.0, 0.44);

  const helm = new THREE.Mesh(makeSculptedShell([
    [-0.39, 0, 0, 0.17], [-0.29, 0.23, 0.29, 0.08],
    [-0.08, 0.40, 0.36, 0.04], [0.13, 0.43, 0.39],
    [0.32, 0.35, 0.32, -0.03], [0.46, 0, 0, -0.04],
  ]), bossArmorMat);
  helm.position.set(0, 1.72, 0.04);
  helm.castShadow = true;
  hitMeshes.push(helm);

  for (const side of [-1, 1] as const) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), bossCoreMat);
    eye.scale.set(1.4, 0.75, 0.6);
    eye.position.set(side * 0.17, 1.72, 0.44);
    bodyGroup.add(eye);

    const pauldron = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 14, 12, 0, Math.PI * 2, 0, Math.PI * 0.65),
      bossGoldMat
    );
    pauldron.position.set(side * 0.62, 1.32, 0);
    pauldron.rotation.z = -side * 0.45;
    pauldron.castShadow = true;
    const mantle = new THREE.Mesh(makeCrestPlate(0.43, 0.45, 0.07), bossArmorMat);
    mantle.position.set(side * 0.67, 1.30, 0.19);
    mantle.rotation.set(-0.15, side * 0.3, -side * 0.38);
    const cheekGuard = new THREE.Mesh(makeCrestPlate(0.17, 0.29, 0.055), bossGoldMat);
    cheekGuard.position.set(side * 0.28, 1.55, 0.34);
    cheekGuard.rotation.set(0, side * 0.45, -side * 0.24);
    bodyGroup.add(pauldron, mantle, cheekGuard);
  }

  if (isZodiac || isTitan) {
    for (const side of [-1, 1] as const) {
      const hCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.28, 1.94, 0),
        new THREE.Vector3(side * 0.68, 2.34, -0.05),
        new THREE.Vector3(side * 0.85, 2.06, 0.22),
      ]);
      const horn = new THREE.Mesh(new THREE.TubeGeometry(hCurve, 14, 0.085, 10, false), bossGoldMat);
      bodyGroup.add(horn);
    }
  }
  if (isZodiac) {
    const starCrown = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), bossCoreMat);
    starCrown.position.set(0, 2.38, 0.08);
    bodyGroup.add(starCrown);
  } else if (!isTitan) {
    const crown = new THREE.Mesh(makeCrescentGeo(0.36, 0.24, 0.06), bossGoldMat);
    crown.position.set(0, 2.22, 0.16);
    bodyGroup.add(crown);
  }

  const runeRing = new THREE.Group();
  runeRing.position.set(0, 1.42, -0.44);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(isZodiac ? 1.12 : 0.95, 0.045, 8, 32), bossCoreMat);
  runeRing.add(halo);
  const nodeCount = isZodiac ? 12 : 6;
  for (let i = 0; i < nodeCount; i++) {
    const a = (i / nodeCount) * Math.PI * 2;
    const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), bossGoldMat);
    const rad = isZodiac ? 1.12 : 0.95;
    node.position.set(Math.cos(a) * rad, Math.sin(a) * rad, 0);
    runeRing.add(node);
  }

  const weaponGroup = new THREE.Group();
  weaponGroup.position.set(0.76, 1.0, 0.36);
  weaponGroup.rotation.x = 0.45;
  const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.46, 8), bossArmorMat);
  hilt.position.y = -0.32;
  const crossguard = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.09, 0.14), bossGoldMat);
  crossguard.position.y = -0.08;
  const blade = new THREE.Mesh(makeCrestPlate(isTitan ? 0.36 : 0.24, 1.24, 0.07), bossGoldMat);
  blade.rotation.z = Math.PI;
  blade.position.y = 0.61;
  blade.castShadow = true;
  const bladeGlow = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.12, 0.09), bossCoreMat);
  bladeGlow.position.y = 0.56;
  weaponGroup.add(hilt, crossguard, blade, bladeGlow);

  bodyGroup.add(lLeg, rLeg, cape, torso, coreRing, core, helm, runeRing, weaponGroup);
  bodyGroup.scale.setScalar(scale);

  return { root, bodyGroup, headOrCore: core, weaponOrRing: runeRing, hitMeshes };
}

export function createCompanionModel(kind: 'sprite' | 'wukong'): THREE.Group {
  const g = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.25, metalness: 0.85 });
  if (kind === 'wukong') {
    const furMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.6,
      roughness: 0.45,
    });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), furMat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), furMat);
    head.position.y = 0.34;
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.025, 8, 16), goldMat);
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.44;
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.024, 0.85, 8), goldMat);
    staff.position.set(0.24, 0.2, 0.1);
    staff.rotation.z = -0.35;
    g.add(body, head, band, staff);
  } else {
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0ea5e9,
      emissiveIntensity: 1.5,
      roughness: 0.15,
    });
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 12), coreMat);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.025, 8, 20), goldMat);
    halo.rotation.x = Math.PI / 2;
    const wingGeo = makeBeveledWingGeo(0.36, 0.3, 0.02);
    for (const side of [-1, 1] as const) {
      const w = new THREE.Mesh(wingGeo, coreMat);
      w.position.set(side * 0.22, 0.05, -0.05);
      w.rotation.y = side > 0 ? -0.3 : Math.PI + 0.3;
      g.add(w);
    }
    g.add(core, halo);
  }
  return g;
}

export function createPetModel(petId: PetId, evolved = false): THREE.Group {
  const g = new THREE.Group();
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.22,
    metalness: 0.85,
  });

  if (petId === 'solar_phoenix') {
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0.65,
      roughness: 0.25,
    });
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.9,
      roughness: 0.2,
    });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, 14, 12), bodyMat);
    body.scale.set(0.95, 1.15, 1.15);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), bodyMat);
    head.position.set(0, 0.24, 0.14);
    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.24, 6), wingMat);
    crest.position.set(0, 0.42, 0.1);
    crest.rotation.x = -0.35;
    const wingGeo = makeBeveledWingGeo(0.46, 0.36, 0.025);
    for (const side of [-1, 1] as const) {
      const wing = new THREE.Mesh(wingGeo, wingMat);
      wing.position.set(side * 0.24, 0.08, -0.04);
      wing.rotation.y = side > 0 ? -0.32 : Math.PI + 0.32;
      g.add(wing);
    }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.36, 7), wingMat);
    tail.position.set(0, -0.05, -0.28);
    tail.rotation.x = -Math.PI * 0.42;
    g.add(body, head, crest, tail);
  } else if (petId === 'frost_owl') {
    const frostMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.55,
      roughness: 0.3,
    });
    const iceMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x7dd3fc,
      emissiveIntensity: 0.85,
      roughness: 0.15,
    });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 12), frostMat);
    body.scale.set(1, 1.2, 0.95);
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 10), iceMat);
    belly.position.set(0, -0.02, 0.12);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 5), goldMat);
    beak.position.set(0, 0.12, 0.25);
    beak.rotation.x = Math.PI / 2;
    for (const side of [-1, 1] as const) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 5), iceMat);
      ear.position.set(side * 0.14, 0.28, 0.04);
      ear.rotation.z = -side * 0.35;
      const wing = new THREE.Mesh(makeBeveledWingGeo(0.38, 0.3, 0.02), iceMat);
      wing.position.set(side * 0.24, 0.04, -0.02);
      wing.rotation.y = side > 0 ? -0.25 : Math.PI + 0.25;
      g.add(ear, wing);
    }
    g.add(body, belly, beak);
  } else if (petId === 'storm_dragonet') {
    const scaleMat = new THREE.MeshStandardMaterial({
      color: 0x7e22ce,
      emissive: 0x6b21a8,
      emissiveIntensity: 0.55,
      roughness: 0.28,
    });
    const voltMat = new THREE.MeshStandardMaterial({
      color: 0x67e8f9,
      emissive: 0x22d3ee,
      emissiveIntensity: 1.1,
      roughness: 0.15,
    });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 0.24, 6, 12), scaleMat);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.14, 0.2), scaleMat);
    snout.position.set(0, 0.18, 0.2);
    for (const side of [-1, 1] as const) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22, 6), voltMat);
      horn.position.set(side * 0.1, 0.32, 0.04);
      horn.rotation.x = -0.35;
      horn.rotation.z = -side * 0.25;
      const wing = new THREE.Mesh(makeBeveledWingGeo(0.42, 0.32, 0.02), voltMat);
      wing.position.set(side * 0.2, 0.1, -0.06);
      wing.rotation.y = side > 0 ? -0.38 : Math.PI + 0.38;
      g.add(horn, wing);
    }
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.38, 6), voltMat);
    tail.position.set(0, -0.08, -0.26);
    tail.rotation.x = -Math.PI * 0.45;
    g.add(body, snout, tail);
  } else if (petId === 'eclipse_fox') {
    const foxMat = new THREE.MeshStandardMaterial({
      color: 0xbe123c,
      emissive: 0x9f1239,
      emissiveIntensity: 0.5,
      roughness: 0.35,
    });
    const orbMat = new THREE.MeshStandardMaterial({
      color: 0xc084fc,
      emissive: 0xa855f7,
      emissiveIntensity: 1.2,
      roughness: 0.15,
    });
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), foxMat);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), foxMat);
    head.position.set(0, 0.22, 0.1);
    for (const side of [-1, 1] as const) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.2, 5), foxMat);
      ear.position.set(side * 0.11, 0.38, 0.08);
      ear.rotation.z = -side * 0.2;
      const tail = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.42, 7), orbMat);
      tail.position.set(side * 0.14, 0.02, -0.26);
      tail.rotation.x = -Math.PI * 0.35;
      tail.rotation.z = side * 0.35;
      g.add(ear, tail);
    }
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.02, 8, 20), orbMat);
    halo.rotation.x = Math.PI / 2;
    halo.position.y = -0.08;
    g.add(body, head, halo);
  } else if (petId === 'jade_turtle') {
    const shellMat = new THREE.MeshStandardMaterial({
      color: 0x059669,
      emissive: 0x047857,
      emissiveIntensity: 0.45,
      roughness: 0.25,
      metalness: 0.35,
    });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0xa7f3d0,
      emissive: 0x34d399,
      emissiveIntensity: 1.0,
      roughness: 0.15,
    });
    const shell = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.6), shellMat);
    shell.position.y = -0.05;
    const belly = new THREE.Mesh(new THREE.CylinderGeometry(0.27, 0.25, 0.1, 12), goldMat);
    belly.position.y = -0.08;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), crystalMat);
    head.position.set(0, 0.02, 0.28);
    const spire = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), crystalMat);
    spire.position.set(0, 0.28, 0);
    g.add(shell, belly, head, spire);
  } else {
    // star_fairy
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.25,
      roughness: 0.15,
    });
    const prismMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: 0xfde047,
      emissiveIntensity: 1.1,
      roughness: 0.15,
    });
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), starMat);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.024, 8, 22), goldMat);
    halo.rotation.x = Math.PI / 2;
    const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), prismMat);
    crown.position.y = 0.29;
    const wingGeo = makeBeveledWingGeo(0.42, 0.34, 0.02);
    for (const side of [-1, 1] as const) {
      const wing = new THREE.Mesh(wingGeo, prismMat);
      wing.position.set(side * 0.22, 0.06, -0.04);
      wing.rotation.y = side > 0 ? -0.25 : Math.PI + 0.25;
      g.add(wing);
    }
    g.add(core, halo, crown);
  }

  if (evolved) {
    const auraColor =
      petId === 'solar_phoenix'
        ? 0xf59e0b
        : petId === 'frost_owl'
        ? 0x38bdf8
        : petId === 'storm_dragonet'
        ? 0xc084fc
        : petId === 'eclipse_fox'
        ? 0xf43f5e
        : petId === 'jade_turtle'
        ? 0x10b981
        : 0xfde047;
    const evolvedGlowMat = new THREE.MeshStandardMaterial({
      color: auraColor,
      emissive: auraColor,
      emissiveIntensity: 1.6,
      roughness: 0.14,
      metalness: 0.35,
    });
    const ascendedHalo = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.026, 8, 28),
      goldMat
    );
    ascendedHalo.position.set(0, 0.14, -0.22);
    const innerEnergyRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.018, 6, 22),
      evolvedGlowMat
    );
    innerEnergyRing.position.set(0, 0.14, -0.2);
    g.add(ascendedHalo, innerEnergyRing);

    const shardGeo = new THREE.OctahedronGeometry(0.068, 0);
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const shard = new THREE.Mesh(shardGeo, i % 2 === 0 ? evolvedGlowMat : goldMat);
      shard.scale.set(0.75, 1.55, 0.75);
      shard.position.set(Math.cos(ang) * 0.45, 0.14 + Math.sin(ang) * 0.45, -0.2);
      g.add(shard);
    }

    const crownSpike = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.22, 6), goldMat);
    crownSpike.position.set(0, 0.48, 0.04);
    g.add(crownSpike);
    g.scale.setScalar(1.18);
  }

  return g;
}

export function createPillarModel(stoneHex: number, trimHex: number): THREE.Group {
  const g = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: stoneHex, roughness: 0.85, metalness: 0.08 });
  const trimMat = new THREE.MeshStandardMaterial({ color: trimHex, roughness: 0.32, metalness: 0.78 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.86, 0.96, 0.34, 8), stoneMat);
  base.position.y = 0.17;
  base.castShadow = true;
  base.receiveShadow = true;

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.68, 1.8, 8), stoneMat);
  shaft.position.y = 1.24;
  shaft.castShadow = true;
  shaft.receiveShadow = true;

  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.74, 0.74, 0.16, 8), trimMat);
  collar.position.y = 2.15;
  collar.castShadow = true;

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.78, 0.26, 8), stoneMat);
  cap.position.y = 2.36;
  cap.castShadow = true;

  g.add(base, shaft, collar, cap);
  return g;
}

export function createUrnModel(trimHex: number): THREE.Group {
  const g = new THREE.Group();
  const clayMat = new THREE.MeshStandardMaterial({ color: 0x9a5b3c, roughness: 0.68, metalness: 0.12 });
  const rimMat = new THREE.MeshStandardMaterial({ color: trimHex, roughness: 0.28, metalness: 0.82 });

  const pts = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(0.24, 0),
    new THREE.Vector2(0.4, 0.36),
    new THREE.Vector2(0.36, 0.68),
    new THREE.Vector2(0.22, 0.84),
    new THREE.Vector2(0.28, 0.94),
    new THREE.Vector2(0.22, 0.96),
  ];
  const body = new THREE.Mesh(new THREE.LatheGeometry(pts, 14), clayMat);
  body.castShadow = true;
  body.receiveShadow = true;

  const band = new THREE.Mesh(new THREE.TorusGeometry(0.39, 0.035, 8, 18), rimMat);
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.52;

  g.add(body, band);
  return g;
}

export function createPortalModel(trimHex: number): {
  group: THREE.Group;
  vortex: THREE.Mesh;
  ringMat: THREE.MeshStandardMaterial;
} {
  const group = new THREE.Group();
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8, metalness: 0.18 });
  const ringMat = new THREE.MeshStandardMaterial({
    color: trimHex,
    emissive: trimHex,
    emissiveIntensity: 0.3,
    roughness: 0.25,
    metalness: 0.75,
  });

  const leftCol = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.8, 0.6), stoneMat);
  leftCol.position.set(-1.35, 1.4, 0);
  leftCol.castShadow = true;
  const rightCol = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.8, 0.6), stoneMat);
  rightCol.position.set(1.35, 1.4, 0);
  rightCol.castShadow = true;

  const lintel = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.52, 0.74), stoneMat);
  lintel.position.set(0, 2.95, 0);
  lintel.castShadow = true;

  const archRing = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.1, 10, 28), ringMat);
  archRing.position.set(0, 1.5, 0);

  const vortex = new THREE.Mesh(
    new THREE.CircleGeometry(0.98, 28),
    new THREE.MeshBasicMaterial({
      color: trimHex,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
    })
  );
  vortex.position.set(0, 1.5, 0);

  group.add(leftCol, rightCol, lintel, archRing, vortex);
  return { group, vortex, ringMat };
}

export function createShrineModel(kind: StageEventAfter = 'valkyrie'): THREE.Group {
  const g = new THREE.Group();
  const marbleMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.32, metalness: 0.15 });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.45,
    roughness: 0.22,
    metalness: 0.88,
  });

  const colorHex =
    kind === 'devil' ? 0xf43f5e : kind === 'wheel' ? 0xf59e0b : kind === 'angel' ? 0x34d399 : 0x38bdf8;
  const crystalMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: 1.55,
    roughness: 0.12,
    metalness: 0.3,
  });

  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.28, 0.4, 12), marbleMat);
  plinth.position.y = 0.2;
  plinth.receiveShadow = true;

  const pedestal = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.75, 1.0, 10), marbleMat);
  pedestal.position.y = 0.9;
  pedestal.castShadow = true;

  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.7, 0.07, 10, 24), goldMat);
  halo.position.y = 2.05;

  const crystal = new THREE.Mesh(
    kind === 'wheel' ? new THREE.CylinderGeometry(0.75, 0.75, 0.18, 16) : new THREE.OctahedronGeometry(0.38, 0),
    crystalMat
  );
  crystal.position.y = 2.05;
  if (kind === 'wheel') crystal.rotation.x = Math.PI / 2;

  g.add(plinth, pedestal, halo, crystal);

  if (kind === 'valkyrie' || kind === 'angel') {
    const wingGeo = makeBeveledWingGeo(0.7, 0.75, 0.04);
    for (const side of [-1, 1] as const) {
      const wing = new THREE.Mesh(wingGeo, crystalMat);
      wing.position.set(side * 0.65, 2.0, -0.1);
      wing.rotation.y = side > 0 ? -0.25 : Math.PI + 0.25;
      g.add(wing);
    }
  } else if (kind === 'devil') {
    for (const side of [-1, 1] as const) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.65, 8), crystalMat);
      horn.position.set(side * 0.45, 2.35, 0);
      horn.rotation.z = -side * 0.42;
      g.add(horn);
    }
  }

  return g;
}

export interface SpiritCrystalRefs {
  group: THREE.Group;
  coreMesh: THREE.Mesh;
  outerRing: THREE.Mesh;
  shards: THREE.Mesh[];
}

export function createSpiritCrystalModel(): SpiritCrystalRefs {
  const group = new THREE.Group();

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.45,
    metalness: 0.65,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.24,
    metalness: 0.9,
  });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.55,
    roughness: 0.1,
    metalness: 0.2,
  });
  const shardMat = new THREE.MeshStandardMaterial({
    color: 0x67e8f9,
    emissive: 0x22d3ee,
    emissiveIntensity: 1.35,
    roughness: 0.14,
    metalness: 0.25,
  });

  const basePlinth = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 0.34, 16), stoneMat);
  basePlinth.position.y = 0.17;
  basePlinth.receiveShadow = true;

  const goldRim = new THREE.Mesh(new THREE.TorusGeometry(1.16, 0.055, 8, 28), goldMat);
  goldRim.rotation.x = Math.PI / 2;
  goldRim.position.y = 0.34;

  const coreMesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.68, 0), crystalMat);
  coreMesh.scale.set(0.85, 1.65, 0.85);
  coreMesh.position.y = 1.65;
  coreMesh.castShadow = true;

  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.045, 8, 32), goldMat);
  outerRing.position.y = 1.65;

  const wardRing = new THREE.Mesh(
    new THREE.RingGeometry(1.55, 1.72, 36),
    new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  wardRing.rotation.x = -Math.PI / 2;
  wardRing.position.y = 0.04;

  const shards: THREE.Mesh[] = [];
  const shardGeo = new THREE.OctahedronGeometry(0.16, 0);
  for (let i = 0; i < 4; i++) {
    const s = new THREE.Mesh(shardGeo, shardMat);
    s.scale.set(0.7, 1.45, 0.7);
    shards.push(s);
    group.add(s);
  }

  group.add(basePlinth, goldRim, coreMesh, outerRing, wardRing);
  return { group, coreMesh, outerRing, shards };
}

function createWeaponAuraModel(auraId: WeaponAuraId, level: number): THREE.Group {
  const def = WEAPON_AURA_MAP[auraId] ?? WEAPON_AURA_MAP.solar_flare;
  const g = new THREE.Group();
  const boost = 1 + Math.min(9, Math.max(0, level - 1)) * 0.08;

  const primaryMat = new THREE.MeshStandardMaterial({
    color: def.primaryHex,
    emissive: def.primaryHex,
    emissiveIntensity: 1.3 * boost,
    roughness: 0.16,
    metalness: 0.45,
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: def.secondaryHex,
    emissive: def.secondaryHex,
    emissiveIntensity: 1.5 * boost,
    roughness: 0.12,
    metalness: 0.35,
  });

  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.022, 8, 28), primaryMat);
  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.016, 6, 22), secondaryMat);
  innerRing.rotation.x = Math.PI / 3;
  g.add(outerRing, innerRing);

  const shardGeo = new THREE.OctahedronGeometry(0.052, 0);
  const shardCount = auraId === 'void_eclipse' ? 6 : 4;
  for (let i = 0; i < shardCount; i++) {
    const a = (i / shardCount) * Math.PI * 2;
    const shard = new THREE.Mesh(shardGeo, i % 2 === 0 ? secondaryMat : primaryMat);
    shard.position.set(Math.cos(a) * 0.34, Math.sin(a) * 0.34, 0);
    shard.scale.set(0.75, 1.45, 0.75);
    g.add(shard);
  }

  return g;
}

function createZodiacMountModel(
  mountId: MountId,
  level: number
): { group: THREE.Group; legs: THREE.Group[] } {
  const def = MOUNT_MAP[mountId];
  const group = new THREE.Group();
  const boost = 0.85 + Math.min(14, Math.max(0, level - 1)) * 0.06;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: def.bodyHex,
    roughness: 0.42,
    metalness: 0.28,
  });
  const armorMat = new THREE.MeshStandardMaterial({
    color: def.armorHex,
    roughness: 0.24,
    metalness: 0.86,
  });
  const maneMat = new THREE.MeshStandardMaterial({
    color: def.maneHex,
    emissive: def.maneHex,
    emissiveIntensity: 0.55 * boost,
    roughness: 0.3,
    metalness: 0.35,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: def.glowHex,
    emissive: def.glowHex,
    emissiveIntensity: 1.35 * boost,
    roughness: 0.14,
    metalness: 0.25,
  });

  // Barrel torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.52, 1.32), bodyMat);
  torso.position.set(0, 0.66, -0.04);
  torso.castShadow = true;
  group.add(torso);

  // Armored chestplate & saddle
  const chestArmor = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.3, 0.56, 10), armorMat);
  chestArmor.rotation.x = Math.PI / 4;
  chestArmor.position.set(0, 0.74, 0.52);
  chestArmor.castShadow = true;
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 0.58), armorMat);
  saddle.position.set(0, 0.94, -0.02);
  const saddleGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), glowMat);
  saddleGem.position.set(0, 0.88, 0.68);
  group.add(chestArmor, saddle, saddleGem);

  // Neck + Armored Head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.26, 0.56, 10), bodyMat);
  neck.position.set(0, 1.02, 0.58);
  neck.rotation.x = 0.46;
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.28, 0.48), bodyMat);
  head.position.set(0, 1.24, 0.82);
  head.rotation.x = 0.18;
  const helm = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.14, 0.44), armorMat);
  helm.position.set(0, 1.34, 0.82);
  helm.rotation.x = 0.18;
  group.add(neck, head, helm);

  // Glowing eyes
  const eyeGeo = new THREE.SphereGeometry(0.045, 8, 8);
  for (const side of [-1, 1] as const) {
    const eye = new THREE.Mesh(eyeGeo, glowMat);
    eye.position.set(side * 0.15, 1.27, 0.96);
    group.add(eye);
  }

  // Species-specific horns / mane / crests
  if (mountId === 'aries_steed') {
    for (const side of [-1, 1] as const) {
      const horn = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.042, 6, 14, Math.PI * 1.3), armorMat);
      horn.position.set(side * 0.2, 1.34, 0.72);
      horn.rotation.y = side * (Math.PI / 2);
      group.add(horn);
    }
  } else if (mountId === 'celestial_leo') {
    const lionMane = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 0), maneMat);
    lionMane.position.set(0, 1.15, 0.65);
    lionMane.scale.set(1.15, 1.15, 0.95);
    group.add(lionMane);
  } else if (mountId === 'frost_unicorn') {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.44, 8), glowMat);
    horn.position.set(0, 1.48, 0.96);
    horn.rotation.x = 0.45;
    group.add(horn);
  } else if (mountId === 'crimson_wyrm') {
    for (const side of [-1, 1] as const) {
      const drakeHorn = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.42, 6), armorMat);
      drakeHorn.position.set(side * 0.14, 1.46, 0.72);
      drakeHorn.rotation.x = -0.5;
      drakeHorn.rotation.z = -side * 0.25;
      const fin = new THREE.Mesh(makeBeveledWingGeo(0.45, 0.48, 0.03), glowMat);
      fin.position.set(side * 0.45, 0.94, 0.05);
      fin.rotation.y = side > 0 ? -0.3 : Math.PI + 0.3;
      group.add(drakeHorn, fin);
    }
  }

  // Mane crest & tail
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.46, 0.16), maneMat);
  crest.position.set(0, 1.12, 0.42);
  crest.rotation.x = 0.48;
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.56, 8), maneMat);
  tail.position.set(0, 0.62, -0.78);
  tail.rotation.x = -0.95;
  group.add(crest, tail);

  // 4 Articulated Legs
  const legs: THREE.Group[] = [];
  const legOffsets: Array<[number, number]> = [
    [-0.24, 0.42],
    [0.24, 0.42],
    [-0.24, -0.44],
    [0.24, -0.44],
  ];
  const legGeo = new THREE.CylinderGeometry(0.09, 0.072, 0.54, 8);
  const hoofGeo = new THREE.CylinderGeometry(0.085, 0.095, 0.12, 8);
  for (const [lx, lz] of legOffsets) {
    const legPivot = new THREE.Group();
    legPivot.position.set(lx, 0.52, lz);
    const legMesh = new THREE.Mesh(legGeo, bodyMat);
    legMesh.position.y = -0.25;
    legMesh.castShadow = true;
    const hoof = new THREE.Mesh(hoofGeo, armorMat);
    hoof.position.y = -0.48;
    legPivot.add(legMesh, hoof);
    group.add(legPivot);
    legs.push(legPivot);
  }

  return { group, legs };
}

function createMythicArtifactModel(artifactId: ArtifactId, level: number): THREE.Group {
  const def = ARTIFACT_MAP[artifactId];
  const g = new THREE.Group();
  const boost = 1 + Math.min(9, Math.max(0, level - 1)) * 0.08;
  const scaleFactor = 1 + Math.min(9, Math.max(0, level - 1)) * 0.025;

  const primaryMat = new THREE.MeshStandardMaterial({
    color: def.primaryHex,
    emissive: def.primaryHex,
    emissiveIntensity: 1.15 * boost,
    roughness: 0.18,
    metalness: 0.55,
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: def.secondaryHex,
    emissive: def.secondaryHex,
    emissiveIntensity: 1.45 * boost,
    roughness: 0.12,
    metalness: 0.35,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.2,
    metalness: 0.9,
  });

  if (artifactId === 'astral_astrolabe') {
    const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.024, 8, 28), goldMat);
    const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.018, 8, 22), secondaryMat);
    innerRing.rotation.x = Math.PI / 3;
    innerRing.rotation.y = Math.PI / 5;
    const starCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), primaryMat);
    g.add(outerRing, innerRing, starCore);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      const node = new THREE.Mesh(new THREE.OctahedronGeometry(0.042, 0), secondaryMat);
      node.position.set(Math.cos(a) * 0.28, Math.sin(a) * 0.28, 0);
      g.add(node);
    }
  } else if (artifactId === 'phoenix_orb') {
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), primaryMat);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.02, 8, 24), secondaryMat);
    halo.rotation.x = Math.PI / 2.6;
    g.add(core, halo);
    const flameWingGeo = makeBeveledWingGeo(0.26, 0.24, 0.022);
    for (const side of [-1, 1] as const) {
      const flare = new THREE.Mesh(flameWingGeo, primaryMat);
      flare.position.set(side * 0.16, 0.03, -0.02);
      flare.rotation.y = side > 0 ? -0.3 : Math.PI + 0.3;
      g.add(flare);
    }
  } else if (artifactId === 'frost_prism') {
    const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(0.17, 0), primaryMat);
    diamond.scale.set(0.82, 1.55, 0.82);
    const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.23, 0.02, 6, 6), secondaryMat);
    crownRing.rotation.x = Math.PI / 2;
    g.add(diamond, crownRing);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.18, 4), secondaryMat);
      shard.position.set(Math.cos(a) * 0.24, Math.sin(a) * 0.06, Math.sin(a) * 0.24);
      shard.rotation.z = -Math.cos(a) * 0.35;
      g.add(shard);
    }
  } else {
    // eclipse_chalice
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.07, 0.22, 12), goldMat);
    cup.position.y = 0.04;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.08, 0.14, 10), goldMat);
    stem.position.y = -0.12;
    const chaliceGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), secondaryMat);
    chaliceGem.position.y = 0.22;
    const eclipseRing = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.022, 8, 26), primaryMat);
    eclipseRing.rotation.y = 0.45;
    eclipseRing.position.y = 0.08;
    g.add(cup, stem, chaliceGem, eclipseRing);
  }

  g.scale.setScalar(scaleFactor);
  return g;
}

function createDivineHaloModel(haloId: HaloId, level: number): THREE.Group {
  const def = DIVINE_HALO_MAP[haloId];
  const g = new THREE.Group();
  const boost = 1 + Math.min(11, Math.max(0, level - 1)) * 0.07;
  const scaleFactor = 1 + Math.min(11, Math.max(0, level - 1)) * 0.02;

  const primaryMat = new THREE.MeshStandardMaterial({
    color: def.primaryHex,
    emissive: def.primaryHex,
    emissiveIntensity: 1.35 * boost,
    roughness: 0.16,
    metalness: 0.65,
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: def.secondaryHex,
    emissive: def.secondaryHex,
    emissiveIntensity: 1.65 * boost,
    roughness: 0.12,
    metalness: 0.4,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.2,
    metalness: 0.92,
  });

  // Outer zodiac astrolabe ring
  const outerRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.026, 10, 36), primaryMat);
  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.018, 8, 28), goldMat);
  g.add(outerRing, innerRing);

  const rayCount = haloId === 'seraphim_glory' ? 12 : haloId === 'stellar_wheel' ? 10 : 8;
  for (let i = 0; i < rayCount; i++) {
    const a = (i / rayCount) * Math.PI * 2;
    const isMajor = i % 2 === 0;
    const ray = new THREE.Mesh(
      new THREE.ConeGeometry(isMajor ? 0.044 : 0.028, isMajor ? 0.24 : 0.15, 4),
      isMajor ? secondaryMat : primaryMat
    );
    const radius = isMajor ? 0.74 : 0.68;
    ray.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
    ray.rotation.z = a - Math.PI / 2;
    g.add(ray);
  }

  if (haloId === 'lunar_eclipse') {
    const crescent = new THREE.Mesh(makeCrescentGeo(0.32, 0.22, 0.03), secondaryMat);
    crescent.position.set(0, 0.48, 0.02);
    g.add(crescent);
  } else if (haloId === 'seraphim_glory') {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const jewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.075, 0), secondaryMat);
      jewel.position.set(Math.cos(a) * 0.53, Math.sin(a) * 0.53, 0.03);
      g.add(jewel);
    }
  }

  g.scale.setScalar(scaleFactor);
  return g;
}

export function createRoyalPedestalDecor(
  marbleHex: number,
  goldHex: number,
  crystalHex: number
): THREE.Group {
  const g = new THREE.Group();

  const marbleMat = new THREE.MeshStandardMaterial({
    color: marbleHex,
    roughness: 0.34,
    metalness: 0.42,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: goldHex,
    emissive: goldHex,
    emissiveIntensity: 0.35,
    roughness: 0.2,
    metalness: 0.9,
  });
  const crystalMat = new THREE.MeshStandardMaterial({
    color: crystalHex,
    emissive: crystalHex,
    emissiveIntensity: 1.35,
    roughness: 0.12,
    metalness: 0.28,
  });

  // Lower royal stepped plinth
  const lowerStep = new THREE.Mesh(new THREE.CylinderGeometry(1.48, 1.68, 0.12, 24), marbleMat);
  lowerStep.position.y = -0.14;
  lowerStep.receiveShadow = true;

  // Upper royal marble deck
  const upperDeck = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.34, 0.12, 32), marbleMat);
  upperDeck.position.y = -0.05;
  upperDeck.receiveShadow = true;

  // Chamfered gilded collars
  const lowerGoldTrim = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.032, 8, 40), goldMat);
  lowerGoldTrim.rotation.x = Math.PI / 2;
  lowerGoldTrim.position.y = -0.08;

  const upperGoldTrim = new THREE.Mesh(new THREE.TorusGeometry(1.19, 0.036, 8, 40), goldMat);
  upperGoldTrim.rotation.x = Math.PI / 2;
  upperGoldTrim.position.y = 0.01;

  // 4 Royal Crystal Pillars with gold finials around the pedestal perimeter
  const pillarGeo = new THREE.CylinderGeometry(0.06, 0.085, 0.56, 6);
  const capGeo = new THREE.OctahedronGeometry(0.095, 0);
  const collarGeo = new THREE.TorusGeometry(0.08, 0.018, 6, 12);
  for (let i = 0; i < 4; i++) {
    const ang = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const px = Math.cos(ang) * 1.48;
    const pz = Math.sin(ang) * 1.48;
    const pillar = new THREE.Mesh(pillarGeo, marbleMat);
    pillar.position.set(px, 0.16, pz);
    pillar.castShadow = true;
    const collar = new THREE.Mesh(collarGeo, goldMat);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(px, 0.42, pz);
    const crystalCap = new THREE.Mesh(capGeo, crystalMat);
    crystalCap.scale.set(0.8, 1.55, 0.8);
    crystalCap.position.set(px, 0.56, pz);
    g.add(pillar, collar, crystalCap);
  }

  g.add(lowerStep, upperDeck, lowerGoldTrim, upperGoldTrim);
  return g;
}

// ============================================================================
// WAVE 12 COMPOSITE 3D MODELS: WAR BANNER, MYTHIC WEAPON FX & VAULT PILLAR
// ============================================================================

export function createMythicWeaponCrownFx(tier: number): THREE.Group {
  const g = new THREE.Group();
  const def = MYTHIC_WEAPON_TIERS[Math.min(5, Math.max(1, tier))] ?? MYTHIC_WEAPON_TIERS[1];
  const glowMat = new THREE.MeshStandardMaterial({
    color: def.glowHex,
    emissive: def.glowHex,
    emissiveIntensity: 1.2 + tier * 0.25,
    roughness: 0.14,
    metalness: 0.72,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfde047,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.45,
    roughness: 0.18,
    metalness: 0.92,
  });

  // Outer celestial rune ring around weapon core
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.24 + tier * 0.025, 0.018, 8, 28),
    glowMat
  );
  g.add(ring);

  // Orbiting mythic crystal shards scaling with tier (2..6)
  const shardCount = Math.min(6, tier + 1);
  const shardGeo = new THREE.OctahedronGeometry(0.042 + tier * 0.004, 0);
  for (let i = 0; i < shardCount; i++) {
    const ang = (i / shardCount) * Math.PI * 2;
    const rad = 0.3 + tier * 0.02;
    const shard = new THREE.Mesh(shardGeo, i % 2 === 0 ? glowMat : goldMat);
    shard.scale.set(0.75, 1.8, 0.75);
    shard.position.set(Math.cos(ang) * rad, Math.sin(ang) * rad, 0);
    shard.rotation.z = ang + Math.PI / 2;
    g.add(shard);
  }

  return g;
}

export function createWarBannerModel(
  bannerId: WarBannerId,
  level = 1
): { group: THREE.Group; clothMesh: THREE.Mesh } {
  const def = WAR_BANNER_MAP[bannerId] ?? WAR_BANNER_MAP.banner_solar;
  const scaleBoost = 1 + Math.min(4, Math.max(0, level - 1)) * 0.05;
  const group = new THREE.Group();

  const poleMat = new THREE.MeshStandardMaterial({
    color: def.trimHex,
    roughness: 0.22,
    metalness: 0.92,
  });
  const clothMat = new THREE.MeshStandardMaterial({
    color: def.clothHex,
    emissive: def.clothHex,
    emissiveIntensity: 0.28,
    roughness: 0.62,
    metalness: 0.14,
    side: THREE.DoubleSide,
  });
  const emblemMat = new THREE.MeshStandardMaterial({
    color: def.emblemHex,
    emissive: def.emblemHex,
    emissiveIntensity: 1.25,
    roughness: 0.16,
    metalness: 0.78,
  });

  // 1. Gilded lance pole (grounded bottom pivot)
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.032, 2.05, 10), poleMat);
  pole.position.y = 1.02;
  pole.castShadow = true;

  // 2. Spearhead finial + collar ring
  const finial = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.26, 6), emblemMat);
  finial.position.y = 2.16;
  const finialRing = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.016, 8, 16), poleMat);
  finialRing.rotation.x = Math.PI / 2;
  finialRing.position.y = 2.02;

  // 3. Ornate crossbar + endcaps
  const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.76, 8), poleMat);
  crossbar.rotation.z = Math.PI / 2;
  crossbar.position.set(0, 1.88, -0.02);
  for (const side of [-1, 1] as const) {
    const cap = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), emblemMat);
    cap.position.set(side * 0.4, 1.88, -0.02);
    group.add(cap);
  }

  // 4. Sculpted Heraldic Swallowtail Banner Cloth
  const bannerShape = new THREE.Shape();
  bannerShape.moveTo(-0.32, 0);
  bannerShape.lineTo(0.32, 0);
  bannerShape.lineTo(0.28, -0.96);
  bannerShape.lineTo(0, -0.78);
  bannerShape.lineTo(-0.28, -0.96);
  bannerShape.closePath();

  const clothGeo = new THREE.ExtrudeGeometry(bannerShape, {
    depth: 0.022,
    bevelEnabled: true,
    bevelThickness: 0.008,
    bevelSize: 0.008,
    bevelSegments: 2,
  });
  const clothMesh = new THREE.Mesh(clothGeo, clothMat);
  clothMesh.position.set(0, 1.86, -0.035);
  clothMesh.castShadow = true;

  // 5. Glowing Zodiac Crest Medallion on banner center
  const emblemRing = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.022, 8, 20), poleMat);
  emblemRing.position.set(0, -0.38, 0.022);
  const emblemGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), emblemMat);
  emblemGem.scale.set(0.85, 1.2, 0.45);
  emblemGem.position.set(0, -0.38, 0.028);
  clothMesh.add(emblemRing, emblemGem);

  group.add(pole, finial, finialRing, crossbar, clothMesh);
  group.scale.setScalar(scaleBoost);
  return { group, clothMesh };
}

export function createVaultCrystalPillarModel(isGolden: boolean): EnemyModelRefs {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);
  const hitMeshes: THREE.Mesh[] = [];

  const plinthMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.62,
    metalness: 0.25,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    roughness: 0.2,
    metalness: 0.92,
  });
  const crystalHex = isGolden ? 0xfbbf24 : 0x38bdf8;
  const crystalMat = new THREE.MeshStandardMaterial({
    color: crystalHex,
    emissive: crystalHex,
    emissiveIntensity: isGolden ? 1.55 : 1.25,
    roughness: 0.14,
    metalness: 0.35,
  });

  // 1. Hexagonal stone plinth (bottom pivot at y = 0)
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.68, 0.34, 6), plinthMat);
  plinth.position.y = 0.17;
  plinth.castShadow = true;
  plinth.receiveShadow = true;

  // 2. Gilded collar ring
  const collar = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.045, 8, 24), goldMat);
  collar.rotation.x = Math.PI / 2;
  collar.position.y = 0.34;

  // 3. Central towering crystal spire
  const mainSpire = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.95, 6), crystalMat);
  mainSpire.position.y = 1.28;
  mainSpire.castShadow = true;
  hitMeshes.push(mainSpire);

  // 4. 3 angled satellite crystal shards
  const sideGeo = new THREE.ConeGeometry(0.18, 0.95, 5);
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2 + 0.4;
    const shard = new THREE.Mesh(sideGeo, crystalMat);
    shard.position.set(Math.cos(ang) * 0.34, 0.72, Math.sin(ang) * 0.34);
    shard.rotation.z = -Math.cos(ang) * 0.36;
    shard.rotation.x = Math.sin(ang) * 0.36;
    shard.castShadow = true;
    hitMeshes.push(shard);
    bodyGroup.add(shard);
  }

  // 5. Floating orbiting crown ring above crystal
  const orbitRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.025, 8, 24), goldMat);
  orbitRing.position.y = 1.68;
  orbitRing.rotation.x = Math.PI / 2.4;

  bodyGroup.add(plinth, collar, mainSpire, orbitRing);
  return { root, bodyGroup, headOrCore: mainSpire, weaponOrRing: orbitRing, hitMeshes };
}

// ============================================================================
// WAVE 13 COMPOSITE PBR 3D MODELS: ASTRAL STEEDS, MULTI-TIER SOUL RINGS &
// ANCIENT CELESTIAL DRAGON BOSS 3D
// ============================================================================

export function createSoulRingsGroup(
  levels: Partial<Record<SoulRingSlotId, number>>
): { group: THREE.Group; ringNodes: THREE.Object3D[] } {
  const group = new THREE.Group();
  const ringNodes: THREE.Object3D[] = [];

  for (const def of SOUL_RING_DEFS) {
    const lv = Math.max(0, Math.floor(levels[def.id] ?? 0));
    if (lv <= 0) continue;

    const ringHolder = new THREE.Group();
    const radius = 0.68 + def.tierIndex * 0.14;
    const tube = 0.014 + Math.min(10, lv) * 0.0012;

    const ringMat = new THREE.MeshStandardMaterial({
      color: def.ringHex,
      emissive: def.emissiveHex,
      emissiveIntensity: 1.05 + lv * 0.12,
      roughness: 0.16,
      metalness: 0.78,
      transparent: true,
      opacity: 0.88,
    });
    const jadeMat = new THREE.MeshStandardMaterial({
      color: def.ringHex,
      emissive: def.ringHex,
      emissiveIntensity: 1.7 + lv * 0.14,
      roughness: 0.1,
      metalness: 0.3,
    });

    const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 36), ringMat);
    ringHolder.add(torus);

    const jadeCount = 2 + Math.min(4, Math.ceil(lv / 2));
    const jadeGeo = new THREE.OctahedronGeometry(0.044 + def.tierIndex * 0.004, 0);
    for (let j = 0; j < jadeCount; j++) {
      const a = (j / jadeCount) * Math.PI * 2;
      const node = new THREE.Mesh(jadeGeo, jadeMat);
      node.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0);
      node.scale.set(0.85, 1.45, 0.85);
      ringHolder.add(node);
    }

    // Distinct inclination angles per tier so all 5 rings form a majestic 3D armillary aura
    ringHolder.rotation.x = Math.PI / 2 + (def.tierIndex - 3) * 0.28;
    ringHolder.rotation.y = def.tierIndex * 0.42;
    ringHolder.userData = {
      speed: (def.tierIndex % 2 === 0 ? 1 : -1) * (0.75 + def.tierIndex * 0.22),
      tierIndex: def.tierIndex,
    };

    group.add(ringHolder);
    ringNodes.push(ringHolder);
  }

  return { group, ringNodes };
}

export function createAstralSteedModel(
  steedId: AstralSteedId,
  star = 1
): { group: THREE.Group; legs: THREE.Group[]; wingPivots: THREE.Group[] } {
  const def = ASTRAL_STEED_MAP[steedId] ?? ASTRAL_STEED_MAP.galaxy_pegasus;
  const scaleBoost = 1 + Math.min(4, Math.max(0, star - 1)) * 0.045;
  const group = new THREE.Group();
  const legs: THREE.Group[] = [];
  const wingPivots: THREE.Group[] = [];

  const bodyMat = new THREE.MeshStandardMaterial({
    color: def.bodyHex,
    roughness: 0.44,
    metalness: 0.22,
  });
  const armorMat = new THREE.MeshStandardMaterial({
    color: def.armorHex,
    emissive: def.armorHex,
    emissiveIntensity: 0.28 + star * 0.06,
    roughness: 0.18,
    metalness: 0.92,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: def.glowHex,
    emissive: def.glowHex,
    emissiveIntensity: 1.35 + star * 0.15,
    roughness: 0.12,
    metalness: 0.35,
  });

  // 1. Primary sculpted steed torso (bottom-center grounded around y=0.62)
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.92, 8, 16), bodyMat);
  torso.rotation.x = Math.PI / 2;
  torso.position.set(0, 0.66, -0.05);
  torso.castShadow = true;

  // 2. Gilded saddle & chestplate barding
  const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.16, 0.56), armorMat);
  saddle.position.set(0, 0.92, -0.06);
  const chestGuard = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.52, 6), armorMat);
  chestGuard.rotation.x = Math.PI / 2.2;
  chestGuard.position.set(0, 0.72, 0.52);

  // 3. Neck, Head & Crown Horns / Crest
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 0.58, 12), bodyMat);
  neck.rotation.x = -0.42;
  neck.position.set(0, 1.02, 0.56);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.24, 0.48), bodyMat);
  head.position.set(0, 1.24, 0.8);
  const helmCrest = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), glowMat);
  helmCrest.scale.set(0.6, 1.8, 0.9);
  helmCrest.position.set(0, 1.44, 0.78);

  // Twin eyes
  for (const side of [-1, 1] as const) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 8, 8), glowMat);
    eye.position.set(side * 0.135, 1.28, 0.88);
    group.add(eye);
  }

  // 4. 4 Articulated Legs with glowing hooves grounded at y = 0
  const legOffsets: Array<[number, number]> = [
    [-0.24, 0.42],
    [0.24, 0.42],
    [-0.24, -0.48],
    [0.24, -0.48],
  ];
  for (const [lx, lz] of legOffsets) {
    const legPivot = new THREE.Group();
    legPivot.position.set(lx, 0.58, lz);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.062, 0.48, 8), bodyMat);
    upper.position.y = -0.24;
    upper.castShadow = true;
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.086, 0.14, 8), glowMat);
    hoof.position.y = -0.51;
    legPivot.add(upper, hoof);
    group.add(legPivot);
    legs.push(legPivot);
  }

  // 5. Flowing Tail Plume
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.72, 6), glowMat);
  tail.rotation.x = -Math.PI / 2.6;
  tail.position.set(0, 0.66, -0.88);

  // 6. Steed-specific silhouette extensions (Wings / Dorsal Spikes / Dragon Horns)
  if (
    steedId === 'galaxy_pegasus' ||
    steedId === 'eclipse_phoenix' ||
    steedId === 'golden_sovereign_dragon'
  ) {
    const wingW = steedId === 'galaxy_pegasus' ? 0.92 : 1.05;
    const wingH = steedId === 'eclipse_phoenix' ? 0.82 : 0.74;
    const wingGeo = makeBeveledWingGeo(wingW, wingH, 0.04);
    for (const side of [-1, 1] as const) {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.3, 0.88, 0.12);
      const wingMesh = new THREE.Mesh(wingGeo, side === 1 ? armorMat : armorMat);
      wingMesh.position.set(side * (wingW * 0.48), 0.18, -0.1);
      wingMesh.rotation.y = side > 0 ? -0.25 : Math.PI + 0.25;
      const featherTrim = new THREE.Mesh(
        new THREE.BoxGeometry(wingW * 0.86, 0.07, 0.06),
        glowMat
      );
      featherTrim.position.set(side * (wingW * 0.42), 0.42, -0.1);
      pivot.add(wingMesh, featherTrim);
      group.add(pivot);
      wingPivots.push(pivot);
    }
  } else {
    // Frost Starwolf crystalline dorsal ridge + ice collar
    for (let i = 0; i < 4; i++) {
      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.36 - i * 0.04, 5), glowMat);
      spike.position.set(0, 1.05 - i * 0.06, 0.32 - i * 0.28);
      spike.rotation.x = -0.35;
      group.add(spike);
    }
  }

  // 7. Ground Starlight Aura Ring underneath steed
  const groundAura = new THREE.Mesh(new THREE.TorusGeometry(0.94, 0.025, 8, 36), glowMat);
  groundAura.rotation.x = Math.PI / 2;
  groundAura.position.y = 0.04;

  group.add(torso, saddle, chestGuard, neck, head, helmCrest, tail, groundAura);
  group.scale.setScalar(scaleBoost);
  return { group, legs, wingPivots };
}

export function createAncientDragonBossModel(): EnemyModelRefs {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);
  const hitMeshes: THREE.Mesh[] = [];

  const scaleMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.48,
    metalness: 0.55,
  });
  const goldArmorMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xb45309,
    emissiveIntensity: 0.42,
    roughness: 0.2,
    metalness: 0.92,
  });
  const moltenMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 1.75,
    roughness: 0.14,
    metalness: 0.25,
  });
  const crystalHornMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.3,
    roughness: 0.12,
    metalness: 0.4,
  });

  // 1. Armored Obsidian Chest & Molten Core
  const torso = new THREE.Mesh(new THREE.DodecahedronGeometry(0.95, 1), scaleMat);
  torso.scale.set(1.15, 1.3, 1.05);
  torso.position.set(0, 1.55, 0);
  torso.castShadow = true;
  hitMeshes.push(torso);

  const chestCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 0), moltenMat);
  chestCore.position.set(0, 1.65, 0.72);
  hitMeshes.push(chestCore);

  // 2. Gilded Shoulder Pauldrons
  for (const side of [-1, 1] as const) {
    const pauldron = new THREE.Mesh(new THREE.ConeGeometry(0.46, 0.68, 6), goldArmorMat);
    pauldron.position.set(side * 1.05, 2.05, 0.18);
    pauldron.rotation.z = -side * 0.65;
    pauldron.castShadow = true;
    hitMeshes.push(pauldron);
    bodyGroup.add(pauldron);
  }

  // 3. Articulated Neck & Horned Draconic Head
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.54, 1.05, 10), scaleMat);
  neck.position.set(0, 2.68, 0.35);
  neck.rotation.x = 0.28;

  const head = new THREE.Mesh(makeSculptedShell([
    [-0.32, 0, 0, 0.28], [-0.21, 0.34, 0.49, 0.22], [-0.02, 0.43, 0.64, 0.13],
    [0.17, 0.43, 0.54], [0.31, 0.34, 0.38, -0.14], [0.45, 0, 0, -0.21],
  ], 16, 0.065), scaleMat);
  head.position.set(0, 3.22, 0.74);
  head.castShadow = true;
  hitMeshes.push(head);

  const fieryJaw = new THREE.Mesh(makeSculptedShell([
    [-0.12, 0, 0, 0.08], [-0.07, 0.24, 0.36], [0.02, 0.31, 0.46],
    [0.12, 0.27, 0.42], [0.15, 0, 0],
  ], 16), scaleMat);
  fieryJaw.position.set(0, 2.9, 1.11);
  const snout = new THREE.Mesh(makeSculptedShell([
    [-0.12, 0, 0], [-0.08, 0.24, 0.30], [0.03, 0.29, 0.37],
    [0.14, 0.23, 0.27, -0.07], [0.22, 0, 0, -0.15],
  ], 18), scaleMat);
  snout.position.set(0, 3.13, 1.27);
  snout.castShadow = true;
  bodyGroup.add(snout);

  const nostrilGeometry = new THREE.SphereGeometry(0.062, 10, 8);
  for (const side of [-1, 1] as const) {
    const nostril = new THREE.Mesh(nostrilGeometry, moltenMat);
    nostril.scale.set(1.15, 0.45, 0.64);
    nostril.position.set(side * 0.132, 3.239, 1.52);
    bodyGroup.add(nostril);
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.92, 6), crystalHornMat);
    horn.position.set(side * 0.36, 3.74, 0.38);
    horn.rotation.x = -0.58;
    horn.rotation.z = -side * 0.34;
    bodyGroup.add(horn);

    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), moltenMat);
    eye.scale.set(1.05, 0.53, 0.75);
    eye.position.set(side * 0.34, 3.32, 1.15);
    eye.rotation.z = side * 0.32;
    const brow = new THREE.Mesh(makeCrestPlate(0.27, 0.21, 0.075), goldArmorMat);
    brow.position.set(side * 0.33, 3.48, 1.03);
    brow.rotation.set(-0.45, side * 0.40, side * 0.30);
    const fang = new THREE.Mesh(new THREE.ConeGeometry(0.063, 0.26, 9), goldArmorMat);
    fang.rotation.z = Math.PI - side * 0.22;
    fang.position.set(side * 0.23, 3.05, 1.44);
    bodyGroup.add(eye, brow, fang);
  }

  // 4. Massive Swept Solar-Crimson Dragon Wings
  const membrane = new THREE.MeshStandardMaterial({
    color: 0x8f253c, emissive: 0x52121e, emissiveIntensity: 0.4,
    roughness: 0.56, metalness: 0.15,
  });
  const wingShape = new THREE.Shape()
    .moveTo(0, 0.2).quadraticCurveTo(0.83, 1.66, 2.32, 1.74)
    .quadraticCurveTo(1.87, 1.40, 1.96, 0.55)
    .quadraticCurveTo(1.58, 1.01, 1.27, 0.14)
    .quadraticCurveTo(1.04, 0.52, 0.74, 0)
    .quadraticCurveTo(0.44, 0.31, 0, 0.2);
  const wingGeo = new THREE.ExtrudeGeometry(wingShape, {
    depth: 0.045, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2, curveSegments: 8,
  }).center();
  for (const side of [-1, 1] as const) {
    const wing = new THREE.Mesh(wingGeo, membrane);
    wing.position.set(side * 1.65, 2.55, -0.45);
    wing.rotation.y = side > 0 ? -0.35 : Math.PI + 0.35;
    wing.rotation.z = side * 0.14;
    wing.castShadow = true;
    hitMeshes.push(wing);
    bodyGroup.add(wing);

    const wingBone = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 2.3, 8), goldArmorMat);
    wingBone.position.set(side * 1.3, 2.85, -0.36);
    wingBone.rotation.z = -side * 1.15;
    bodyGroup.add(wingBone);
  }

  // 5. Grounded Claws & Armored Tail
  const pawGeometry = new THREE.SphereGeometry(0.40, 14, 10);
  const clawGeometry = new THREE.ConeGeometry(0.067, 0.25, 8);
  for (const side of [-1, 1] as const) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 1.0, 8), scaleMat);
    leg.position.set(side * 0.72, 0.5, 0.25);
    leg.castShadow = true;
    const paw = new THREE.Mesh(pawGeometry, scaleMat);
    paw.scale.set(1.05, 0.48, 1.3);
    paw.position.set(side * 0.72, 0.19, 0.43);
    paw.castShadow = true;
    bodyGroup.add(leg, paw);
    for (let toe = -1; toe <= 1; toe++) {
      const claw = new THREE.Mesh(clawGeometry, goldArmorMat);
      claw.rotation.x = Math.PI / 2;
      claw.rotation.z = toe * -0.17;
      claw.position.set(side * 0.72 + toe * 0.17, 0.15, 0.88 - Math.abs(toe) * 0.045);
      bodyGroup.add(claw);
    }
  }
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.38, 2.1, 7), scaleMat);
  tail.rotation.x = -Math.PI / 2.2;
  tail.position.set(0, 0.78, -1.48);

  // 6. Orbiting Starfire Dragon Crown Ring
  const dragonRing = new THREE.Mesh(new THREE.TorusGeometry(1.65, 0.055, 10, 36), goldArmorMat);
  dragonRing.rotation.x = Math.PI / 2;
  dragonRing.position.set(0, 0.18, 0);

  bodyGroup.add(torso, chestCore, neck, head, fieryJaw, tail, dragonRing);
  return { root, bodyGroup, headOrCore: head, weaponOrRing: dragonRing, hitMeshes };
}

// ============================================================================
// WAVE 14: ARTICULATED MULTI-TIER 3D CELESTIAL WINGS & SKY SERAPH WARDEN BOSS
// ============================================================================

export function createCelestialWings3DGroup(
  wingId: CelestialWingId,
  star: number
): { group: THREE.Group; leftPivot: THREE.Group; rightPivot: THREE.Group } {
  const def = CELESTIAL_WING_MAP[wingId] ?? CELESTIAL_WING_MAP.seraph_azure;
  const s = Math.max(1, Math.min(5, Math.floor(star || 1)));
  const spanScale = 0.94 + (s - 1) * 0.1;

  const group = new THREE.Group();

  // Brushed metallic dorsal clasp (roughness 0.22 vs luminous feathers 0.48)
  const frameMat = new THREE.MeshStandardMaterial({
    color: def.frameHex,
    metalness: 0.9,
    roughness: 0.2,
    emissive: def.emissiveHex,
    emissiveIntensity: 0.22 + s * 0.08,
  });
  const featherMat = new THREE.MeshStandardMaterial({
    color: def.featherHex,
    metalness: 0.28,
    roughness: 0.48,
    emissive: def.emissiveHex,
    emissiveIntensity: 0.45 + s * 0.14,
  });
  const tipMat = new THREE.MeshStandardMaterial({
    color: def.tipHex,
    metalness: 0.4,
    roughness: 0.26,
    emissive: def.tipHex,
    emissiveIntensity: 0.65 + s * 0.15,
  });

  // Central ornate crest
  const clasp = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 1), frameMat);
  clasp.scale.set(0.9, 1.35, 0.55);
  group.add(clasp);

  const upperGeo = makeBeveledWingGeo(1.08 * spanScale, 0.72 * spanScale, 0.04);
  const midGeo = makeBeveledWingGeo(0.86 * spanScale, 0.52 * spanScale, 0.036);
  const lowerGeo = makeBeveledWingGeo(0.62 * spanScale, 0.36 * spanScale, 0.03);
  const strutGeo = new THREE.CylinderGeometry(0.025, 0.04, 0.92 * spanScale, 6);
  const gemGeo = new THREE.OctahedronGeometry(0.085, 0);

  const buildHalf = (side: -1 | 1): THREE.Group => {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.14, 0.05, -0.02);

    const strut = new THREE.Mesh(strutGeo, frameMat);
    strut.position.set(side * 0.42 * spanScale, 0.22 * spanScale, 0.02);
    strut.rotation.z = -side * 1.08;
    pivot.add(strut);

    const upperBlade = new THREE.Mesh(upperGeo, featherMat);
    upperBlade.position.set(side * 0.62 * spanScale, 0.32 * spanScale, -0.02);
    if (side < 0) upperBlade.scale.x = -1;
    upperBlade.rotation.z = side * 0.16;
    upperBlade.castShadow = true;
    pivot.add(upperBlade);

    const midBlade = new THREE.Mesh(midGeo, tipMat);
    midBlade.position.set(side * 0.54 * spanScale, 0.02 * spanScale, -0.04);
    if (side < 0) midBlade.scale.x = -1;
    midBlade.rotation.z = -side * 0.1;
    pivot.add(midBlade);

    const lowerBlade = new THREE.Mesh(lowerGeo, featherMat);
    lowerBlade.position.set(side * 0.38 * spanScale, -0.24 * spanScale, -0.05);
    if (side < 0) lowerBlade.scale.x = -1;
    lowerBlade.rotation.z = -side * 0.38;
    pivot.add(lowerBlade);

    // High-star celestial feathers unlock luminous wing jewels
    if (s >= 2) {
      const crystal = new THREE.Mesh(gemGeo, tipMat);
      crystal.position.set(side * 0.88 * spanScale, 0.46 * spanScale, 0.04);
      pivot.add(crystal);
    }
    if (s >= 4) {
      const upperCrownPinion = new THREE.Mesh(lowerGeo, tipMat);
      upperCrownPinion.position.set(side * 0.78 * spanScale, 0.56 * spanScale, 0.01);
      if (side < 0) upperCrownPinion.scale.x = -1;
      upperCrownPinion.rotation.z = side * 0.42;
      pivot.add(upperCrownPinion);
    }

    return pivot;
  };

  const leftPivot = buildHalf(-1);
  const rightPivot = buildHalf(1);
  group.add(leftPivot, rightPivot);

  return { group, leftPivot, rightPivot };
}

function makeSeraphWingGeometry(): THREE.BufferGeometry {
  const feathers: THREE.BufferGeometry[] = [];
  for (let index = 0; index < 6; index++) {
    const length = 0.82 + (5 - index) * 0.15;
    const shape = new THREE.Shape()
      .moveTo(0, 0)
      .quadraticCurveTo(length * 0.62, 0.51, length, 0.06)
      .quadraticCurveTo(length * 0.63, -0.16, 0.12, -0.19)
      .quadraticCurveTo(-0.07, -0.14, 0, 0);
    const feather = new THREE.ExtrudeGeometry(shape, {
      depth: 0.055, bevelThickness: 0.018, bevelSize: 0.022, bevelSegments: 2, curveSegments: 5,
    });
    feather.rotateZ(0.58 - index * 0.17);
    feather.translate(index * 0.12, 0.22 - index * 0.15, -index * 0.028);
    feathers.push(feather);
  }
  const wing = mergeGeometries(feathers)!;
  for (const feather of feathers) feather.dispose();
  return wing.center();
}

export function createSkySeraphBossModel(): EnemyModelRefs {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);
  const hitMeshes: THREE.Mesh[] = [];

  const armorMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    metalness: 0.78,
    roughness: 0.24,
  });
  const goldMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    metalness: 0.92,
    roughness: 0.16,
    emissive: 0xd97706,
    emissiveIntensity: 0.45,
  });
  const azureMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    metalness: 0.35,
    roughness: 0.32,
    emissive: 0x0284c7,
    emissiveIntensity: 0.85,
  });

  // 1. Armored Celestial Torso & Mantle
  const torso = new THREE.Mesh(makeSculptedShell([
    [-0.98, 0.73, 0.5], [-0.79, 0.76, 0.52], [-0.48, 0.62, 0.43],
    [-0.17, 0.48, 0.35], [0.15, 0.53, 0.43], [0.57, 0.71, 0.54],
    [0.79, 0.66, 0.49], [0.98, 0.35, 0.32],
  ], 24, 0.07), armorMat);
  torso.position.set(0, 1.45, 0);
  torso.castShadow = true;
  hitMeshes.push(torso);

  const cuirass = new THREE.Mesh(makeCrestPlate(0.94, 1.00, 0.12), goldMat);
  cuirass.position.set(0, 1.76, 0.41);
  bodyGroup.add(cuirass);
  const chestCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.37, 0), azureMat);
  chestCore.scale.set(0.79, 1.20, 0.55);
  chestCore.position.set(0, 1.76, 0.66);
  hitMeshes.push(chestCore);

  // 2. Crowned Visor Head & Radiant Halo
  const head = new THREE.Mesh(makeSculptedShell([
    [-0.43, 0, 0, 0.18], [-0.25, 0.27, 0.31, 0.06], [0, 0.38, 0.37],
    [0.27, 0.35, 0.32, -0.03], [0.48, 0, 0, -0.09],
  ]), armorMat);
  const visor = new THREE.Mesh(makeCrestPlate(0.56, 0.14, 0.045), azureMat);
  visor.position.set(0, 2.75, 0.32);
  bodyGroup.add(visor);
  head.position.set(0, 2.72, 0);
  head.castShadow = true;
  hitMeshes.push(head);

  const crown = new THREE.Mesh(new THREE.TorusGeometry(0.56, 0.06, 8, 24), goldMat);
  crown.rotation.x = Math.PI / 2.4;
  crown.position.set(0, 3.05, -0.05);

  // 3. Quad Articulated Sky Seraph Wings
  const wingGeo = makeSeraphWingGeometry();
  for (const side of [-1, 1] as const) {
    const upperWing = new THREE.Mesh(wingGeo, azureMat);
    upperWing.position.set(side * 1.48, 2.25, -0.35);
    if (side < 0) upperWing.scale.x = -1;
    upperWing.rotation.z = side * 0.22;
    upperWing.castShadow = true;
    hitMeshes.push(upperWing);
    bodyGroup.add(upperWing);

    const lowerWing = new THREE.Mesh(wingGeo, goldMat);
    lowerWing.scale.set(side * 0.72, 0.68, 0.8);
    lowerWing.position.set(side * 1.12, 1.42, -0.45);
    lowerWing.rotation.z = -side * 0.28;
    bodyGroup.add(lowerWing);
  }

  // 4. Twin Celestial Lances
  for (const side of [-1, 1] as const) {
    const lance = new THREE.Mesh(new THREE.ConeGeometry(0.14, 2.4, 6), goldMat);
    lance.position.set(side * 1.15, 1.65, 0.55);
    lance.rotation.x = Math.PI / 2.6;
    bodyGroup.add(lance);
  }

  // 5. Orbiting Wind Cyclone Ring
  const windRing = new THREE.Mesh(new THREE.TorusGeometry(1.55, 0.06, 10, 36), azureMat);
  windRing.rotation.x = Math.PI / 2;
  windRing.position.set(0, 0.24, 0);

  bodyGroup.add(torso, chestCore, head, crown, windRing);
  return { root, bodyGroup, headOrCore: head, weaponOrRing: windRing, hitMeshes };
}








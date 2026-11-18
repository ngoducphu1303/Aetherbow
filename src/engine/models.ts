import * as THREE from 'three';
import { CrownStyle, EnemyKind, PetId, StageEventAfter, WeaponArchetype } from '../types/game';
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
}

export interface HeroModelRefs {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  cloak: THREE.Mesh;
  capeTail: THREE.Mesh;
  bowGroup: THREE.Group;
  drawArm: THREE.Group;
  magicOrb: THREE.Mesh;
  nockedArrow: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  hoodGem: THREE.Mesh;
  hitMeshes: THREE.Mesh[];
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
    roughness: 0.62,
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
  const skirtPoints = [
    new THREE.Vector2(0.38, 0.34),
    new THREE.Vector2(0.32, 0.54),
    new THREE.Vector2(0.22, 0.72),
    new THREE.Vector2(0.18, 0.8),
  ];
  const cloak = new THREE.Mesh(new THREE.LatheGeometry(skirtPoints, 18), cloakMat);
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
    new THREE.CylinderGeometry(0.22, 0.18, 0.4, 16),
    whiteClothMat
  );
  bodice.position.set(0, 0.92, 0.01);
  bodice.castShadow = true;
  bodyGroup.add(bodice);
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

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.42, 28, 22), faceMat);
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

  return {
    root,
    bodyGroup,
    cloak,
    capeTail,
    bowGroup,
    drawArm,
    magicOrb,
    nockedArrow,
    leftLeg,
    rightLeg,
    hoodGem,
    hitMeshes,
  };
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

    const legGeo = new THREE.CylinderGeometry(0.095, 0.11, 0.34, 12);
    const lLeg = new THREE.Mesh(legGeo, skinMat);
    lLeg.position.set(-0.15, 0.17, 0);
    lLeg.castShadow = true;
    const rLeg = new THREE.Mesh(legGeo, skinMat);
    rLeg.position.set(0.15, 0.17, 0);
    rLeg.castShadow = true;

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.44, 14), tunicMat);
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

    const robePts = [
      new THREE.Vector2(0.4, 0.14),
      new THREE.Vector2(0.3, 0.44),
      new THREE.Vector2(0.22, 0.76),
    ];
    const robe = new THREE.Mesh(new THREE.LatheGeometry(robePts, 16), cloakMat);
    robe.castShadow = true;
    hitMeshes.push(robe);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.31, 20, 16), darkFaceMat);
    head.position.y = 1.06;
    head.castShadow = true;
    hitMeshes.push(head);

    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.65, 14), cloakMat);
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

    const body = new THREE.Mesh(new THREE.SphereGeometry(0.56, 20, 16), stoneMat);
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
      const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 12), goldMat);
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

    const core = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 16), crystalMat);
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
  const bossArmorMat = new THREE.MeshStandardMaterial({ map: armorTex, roughness: 0.28, metalness: 0.82 });
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

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.38, 0.84, 14), bossArmorMat);
  torso.position.y = 0.98;
  torso.castShadow = true;
  hitMeshes.push(torso);

  const coreRing = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.04, 8, 20), bossGoldMat);
  coreRing.position.set(0, 1.0, 0.42);
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), bossCoreMat);
  core.position.set(0, 1.0, 0.44);

  const helm = new THREE.Mesh(new THREE.SphereGeometry(0.46, 22, 18), bossArmorMat);
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
    bodyGroup.add(pauldron);
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
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.28, 0.06), bossGoldMat);
  blade.position.y = 0.58;
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

export function createPetModel(petId: PetId): THREE.Group {
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

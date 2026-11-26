import * as THREE from 'three';

/**
 * Bespoke Procedural 3D Zodiac Boss Regalia (Crowns, Armor Pauldrons/Cuirass & Signature Weapons)
 * for Chapters 5–12 (Cancer → Pisces) — Wave 11 Graphic Fidelity & Boss Design Overhaul.
 *
 * Strictly obeys Dell Latitude E5430 / Intel HD 4000 hardware constraints:
 * - ZERO THREE.PointLight instances anywhere in the hierarchy.
 * - Composite 6–12 part multi-scale THREE.Group assemblies (Primary Armor, Secondary Crown, Accent Weapon).
 * - Calibrated PBR material roughness contrast (>= 0.25 delta between matte obsidian armor & gilded metal).
 * - Automatic geometry segment reduction when `liteActive === true`.
 * - Zero-GC animation stepping (`stepZodiacBossRegalia`) with Phase II/III intensity & `reducedMotion` damping.
 */

export type ZodiacBossRegaliaChapterId = 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type ZodiacBossWeaponArchetype =
  | 'cancer_tidal_claws'
  | 'virgo_astral_scepter'
  | 'libra_judgment_halberd'
  | 'scorpio_venom_stinger_lance'
  | 'sagittarius_starlight_greatbow'
  | 'capricorn_summit_warmaul'
  | 'aquarius_starstream_amphora_staff'
  | 'pisces_twin_lunar_blades';

export interface ZodiacBossRegaliaSpec {
  chapterId: ZodiacBossRegaliaChapterId;
  zodiacId: string;
  titleVi: string;
  armorTitleVi: string;
  weaponTitleVi: string;
  weaponArchetype: ZodiacBossWeaponArchetype;
  armorBaseHex: number;
  gildedTrimHex: number;
  accentGlowHex: number;
}

export interface ZodiacBossRegaliaAnimNode {
  object: THREE.Object3D;
  mode: 'spin_y' | 'bob_y' | 'sway_z' | 'pulse_scale' | 'orbit_ring';
  baseValue: number;
  amplitude: number;
  speed: number;
  phase: number;
}

export interface BuiltZodiacBossRegalia {
  spec: ZodiacBossRegaliaSpec;
  root: THREE.Group;
  animNodes: ZodiacBossRegaliaAnimNode[];
  meshCount: number;
  pointLightCount: number;
  vertexCount: number;
  disposables: {
    geometries: THREE.BufferGeometry[];
    materials: THREE.Material[];
  };
}

export const ZODIAC_BOSS_REGALIA_SPECS: Record<ZodiacBossRegaliaChapterId, ZodiacBossRegaliaSpec> = {
  5: {
    chapterId: 5,
    zodiacId: 'cancer',
    titleVi: 'Giáp Thủy Triều Nguyệt Thần',
    armorTitleVi: 'Vương Miện Trăng Khuyết & Giáp San Hô',
    weaponTitleVi: 'Song Càng Thủy Triều',
    weaponArchetype: 'cancer_tidal_claws',
    armorBaseHex: 0x164e63,
    gildedTrimHex: 0x7dd3fc,
    accentGlowHex: 0x38bdf8,
  },
  6: {
    chapterId: 6,
    zodiacId: 'virgo',
    titleVi: 'Thánh Giáp Tinh Thần Xử Nữ',
    armorTitleVi: 'Mũ Nhật Khuê & Cánh Vàng Đan Đỉnh',
    weaponTitleVi: 'Quyền Trượng Nhật Khuê',
    weaponArchetype: 'virgo_astral_scepter',
    armorBaseHex: 0x365314,
    gildedTrimHex: 0xfde047,
    accentGlowHex: 0xa3e635,
  },
  7: {
    chapterId: 7,
    zodiacId: 'libra',
    titleVi: 'Chiến Giáp Cán Cân Công Lý',
    armorTitleVi: 'Miện Công Lý & Vai Cân Hoàng Kim',
    weaponTitleVi: 'Thiên Cân Phán Quyết Kích',
    weaponArchetype: 'libra_judgment_halberd',
    armorBaseHex: 0x312e81,
    gildedTrimHex: 0xfbbf24,
    accentGlowHex: 0xf59e0b,
  },
  8: {
    chapterId: 8,
    zodiacId: 'scorpio',
    titleVi: 'Hắc Diện Độc Giáp Bọ Cạp',
    armorTitleVi: 'Mũ Hắc Diện & Đuôi Độc Tinh Thể',
    weaponTitleVi: 'Độc Châm Thương Hắc Ám',
    weaponArchetype: 'scorpio_venom_stinger_lance',
    armorBaseHex: 0x3b0764,
    gildedTrimHex: 0xd8b4fe,
    accentGlowHex: 0xc084fc,
  },
  9: {
    chapterId: 9,
    zodiacId: 'sagittarius',
    titleVi: 'Tinh Đạo Xạ Thủ Chiến Giáp',
    armorTitleVi: 'Vương Miện Lông Vũ & Giáp Lửa Sao',
    weaponTitleVi: 'Đại Cung Tinh Hà',
    weaponArchetype: 'sagittarius_starlight_greatbow',
    armorBaseHex: 0x7c2d12,
    gildedTrimHex: 0xfdba74,
    accentGlowHex: 0xf97316,
  },
  10: {
    chapterId: 10,
    zodiacId: 'capricorn',
    titleVi: 'Cự Thạch Sơn Vương Giáp',
    armorTitleVi: 'Song Sừng Ma Kết & Giáp Bàn Thạch',
    weaponTitleVi: 'Chiến Chùy Đỉnh Núi Cổ Đại',
    weaponArchetype: 'capricorn_summit_warmaul',
    armorBaseHex: 0x1e293b,
    gildedTrimHex: 0xf59e0b,
    accentGlowHex: 0x94a3b8,
  },
  11: {
    chapterId: 11,
    zodiacId: 'aquarius',
    titleVi: 'Tinh Lưu Bảo Bình Thánh Giáp',
    armorTitleVi: 'Vòng Quỹ Đạo Sao & Cầu Vai Thủy Tinh',
    weaponTitleVi: 'Trượng Bình Tinh Lưu',
    weaponArchetype: 'aquarius_starstream_amphora_staff',
    armorBaseHex: 0x0c4a6e,
    gildedTrimHex: 0x67e8f9,
    accentGlowHex: 0x22d3ee,
  },
  12: {
    chapterId: 12,
    zodiacId: 'pisces',
    titleVi: 'Mộng Cảnh Song Ngư Thánh Giáp',
    armorTitleVi: 'Miện Song Nguyệt & Vầng Hào Quang Mộng',
    weaponTitleVi: 'Song Đao Nguyệt Mộng',
    weaponArchetype: 'pisces_twin_lunar_blades',
    armorBaseHex: 0x4c1d95,
    gildedTrimHex: 0xf9a8d4,
    accentGlowHex: 0xf472b6,
  },
};

export function getZodiacBossRegaliaSpec(chapterId: number): ZodiacBossRegaliaSpec | null {
  if (chapterId >= 5 && chapterId <= 12) {
    return ZODIAC_BOSS_REGALIA_SPECS[chapterId as ZodiacBossRegaliaChapterId] ?? null;
  }
  return null;
}

export function buildZodiacBossRegalia(params: {
  chapterId: number;
  liteActive: boolean;
  trimHexOverride?: number;
}): BuiltZodiacBossRegalia | null {
  const spec = getZodiacBossRegaliaSpec(params.chapterId);
  if (!spec) return null;

  const radialSegs = params.liteActive ? 6 : 10;
  const torusSegs = params.liteActive ? 10 : 20;
  const glowHex = params.trimHexOverride ?? spec.accentGlowHex;

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geometries.push(g);
    return g;
  };
  const trackMat = <T extends THREE.Material>(m: T): T => {
    materials.push(m);
    return m;
  };

  // Deliberate PBR roughness contrast (>= 0.25 delta): matte sculpted armor vs brushed gilded metal vs emissive relic
  const armorMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: spec.armorBaseHex,
      roughness: 0.62,
      metalness: 0.32,
    })
  );
  const gildedMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: spec.gildedTrimHex,
      roughness: 0.22,
      metalness: 0.88,
    })
  );
  const glowMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: glowHex,
      emissive: glowHex,
      emissiveIntensity: params.liteActive ? 0.95 : 1.35,
      roughness: 0.2,
      metalness: 0.25,
    })
  );

  const root = new THREE.Group();
  root.name = `ZodiacBossRegalia_Ch${spec.chapterId}_${spec.zodiacId}`;
  const animNodes: ZodiacBossRegaliaAnimNode[] = [];

  // 1. PRIMARY SILHOUETTE: Sculpted Zodiac Cuirass Chestplate + Twin Pauldrons (all 8 bosses share grounded anatomical anchor, customized by crest/proportions)
  const chestPlateGeo = trackGeo(new THREE.CylinderGeometry(0.62, 0.52, 0.72, radialSegs));
  const chestPlate = new THREE.Mesh(chestPlateGeo, armorMat);
  chestPlate.position.set(0, 1.18, 0.08);
  root.add(chestPlate);

  const chestMedallionGeo = trackGeo(new THREE.OctahedronGeometry(0.22, 0));
  const chestMedallion = new THREE.Mesh(chestMedallionGeo, glowMat);
  chestMedallion.position.set(0, 1.24, 0.6);
  root.add(chestMedallion);
  animNodes.push({
    object: chestMedallion,
    mode: 'pulse_scale',
    baseValue: 1.0,
    amplitude: 0.12,
    speed: 2.4,
    phase: spec.chapterId * 0.6,
  });

  const pauldronGeo = trackGeo(new THREE.SphereGeometry(0.38, radialSegs, Math.max(5, radialSegs - 2), 0, Math.PI * 2, 0, Math.PI * 0.62));
  const pauldronRimGeo = trackGeo(new THREE.TorusGeometry(0.35, 0.055, 5, torusSegs));
  for (const side of [-1, 1]) {
    const pauldron = new THREE.Mesh(pauldronGeo, armorMat);
    pauldron.position.set(side * 0.74, 1.56, 0.04);
    pauldron.rotation.z = side * -0.34;
    const rim = new THREE.Mesh(pauldronRimGeo, gildedMat);
    rim.position.set(side * 0.74, 1.54, 0.04);
    rim.rotation.x = Math.PI / 2;
    rim.rotation.y = side * 0.34;
    root.add(pauldron, rim);
  }

  // 2. SECONDARY SILHOUETTE (ZODIAC CROWN) & 3. ACCENT SIGNATURE WEAPON (bespoke per Chapter 5–12)
  const crownGroup = new THREE.Group();
  crownGroup.position.set(0, 2.08, 0);
  root.add(crownGroup);

  const weaponGroup = new THREE.Group();
  weaponGroup.position.set(1.06, 1.28, 0.25);
  root.add(weaponGroup);

  switch (spec.weaponArchetype) {
    case 'cancer_tidal_claws': {
      // Crescent lunar crown + twin coral-gold tidal pincer gauntlets on both sides
      const crownArc = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.46, 0.075, 6, torusSegs, Math.PI * 1.15)),
        gildedMat
      );
      crownArc.rotation.z = -Math.PI * 0.075;
      const tidePearl = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.18, 1)), glowMat);
      tidePearl.position.y = 0.24;
      crownGroup.add(crownArc, tidePearl);
      animNodes.push({ object: tidePearl, mode: 'bob_y', baseValue: 0.24, amplitude: 0.08, speed: 2.1, phase: 0 });

      const clawOuterGeo = trackGeo(new THREE.TorusGeometry(0.36, 0.09, 6, torusSegs, Math.PI * 1.25));
      const clawInnerGeo = trackGeo(new THREE.ConeGeometry(0.11, 0.44, 5));
      for (const side of [-1, 1]) {
        const clawRoot = new THREE.Group();
        clawRoot.position.set(side * 1.08, 1.15, 0.38);
        const outerBlade = new THREE.Mesh(clawOuterGeo, gildedMat);
        outerBlade.rotation.y = side * 0.45;
        outerBlade.rotation.z = side > 0 ? -0.3 : Math.PI + 0.3;
        const innerPin = new THREE.Mesh(clawInnerGeo, glowMat);
        innerPin.position.set(side * -0.14, 0.14, 0.22);
        innerPin.rotation.x = Math.PI * 0.38;
        clawRoot.add(outerBlade, innerPin);
        root.add(clawRoot);
        animNodes.push({
          object: clawRoot,
          mode: 'sway_z',
          baseValue: 0,
          amplitude: 0.12,
          speed: 1.9,
          phase: side > 0 ? 0 : Math.PI,
        });
      }
      break;
    }

    case 'virgo_astral_scepter': {
      // Halo astrolabe crown + fluted gilded sundial scepter with spinning crystal core
      const haloRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.56, 0.055, 6, torusSegs)), gildedMat);
      haloRing.position.set(0, 0.18, -0.14);
      const crownSpire = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.12, 0.52, 4)), glowMat);
      crownSpire.position.set(0, 0.36, 0.06);
      crownGroup.add(haloRing, crownSpire);
      animNodes.push({ object: haloRing, mode: 'spin_y', baseValue: 0, amplitude: 0, speed: 1.1, phase: 0.4 });

      const staffShaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.075, 2.35, 6)), gildedMat);
      const staffRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.32, 0.05, 6, torusSegs)), gildedMat);
      staffRing.position.y = 1.28;
      const staffGem = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.2, 0)), glowMat);
      staffGem.position.y = 1.28;
      weaponGroup.add(staffShaft, staffRing, staffGem);
      weaponGroup.rotation.z = -0.16;
      animNodes.push({ object: staffGem, mode: 'spin_y', baseValue: 0, amplitude: 0, speed: 2.2, phase: 0 });
      break;
    }

    case 'libra_judgment_halberd': {
      // Twin golden balance-scale back crest + imperial judgment halberd
      const scaleBeam = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(1.48, 0.08, 0.1)), gildedMat);
      scaleBeam.position.set(0, 0.28, -0.16);
      const panGeo = trackGeo(new THREE.CylinderGeometry(0.24, 0.12, 0.12, radialSegs));
      const panOrbGeo = trackGeo(new THREE.OctahedronGeometry(0.11, 0));
      for (const side of [-1, 1]) {
        const pan = new THREE.Mesh(panGeo, gildedMat);
        pan.position.set(side * 0.66, -0.02, -0.16);
        const orb = new THREE.Mesh(panOrbGeo, glowMat);
        orb.position.set(side * 0.66, 0.1, -0.16);
        crownGroup.add(pan, orb);
      }
      crownGroup.add(scaleBeam);
      animNodes.push({ object: crownGroup, mode: 'sway_z', baseValue: 0, amplitude: 0.11, speed: 1.35, phase: 0.2 });

      const pole = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.065, 2.55, 6)), armorMat);
      const blade = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.48, 0.72, 0.07)), gildedMat);
      blade.position.set(0.2, 0.92, 0);
      const spearTip = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.14, 0.56, 4)), glowMat);
      spearTip.position.y = 1.48;
      weaponGroup.add(pole, blade, spearTip);
      weaponGroup.rotation.z = -0.22;
      break;
    }

    case 'scorpio_venom_stinger_lance': {
      // Curved segmented dorsal obsidian scorpion tail arch + glowing venom lance
      const segGeo = trackGeo(new THREE.CylinderGeometry(0.14, 0.19, 0.42, 6));
      const tailPoints: Array<[number, number, number]> = [
        [0, -0.32, -0.62],
        [0, 0.08, -0.78],
        [0, 0.48, -0.62],
        [0, 0.72, -0.24],
      ];
      for (let i = 0; i < tailPoints.length; i++) {
        const seg = new THREE.Mesh(segGeo, armorMat);
        seg.position.set(tailPoints[i][0], tailPoints[i][1], tailPoints[i][2]);
        seg.rotation.x = 0.45 * (i + 1);
        crownGroup.add(seg);
      }
      const dorsalStinger = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.16, 0.56, 6)), glowMat);
      dorsalStinger.position.set(0, 0.76, 0.16);
      dorsalStinger.rotation.x = Math.PI * 0.62;
      crownGroup.add(dorsalStinger);
      animNodes.push({ object: dorsalStinger, mode: 'pulse_scale', baseValue: 1, amplitude: 0.14, speed: 2.8, phase: 0.5 });

      const lanceShaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.05, 0.07, 2.3, 6)), armorMat);
      const lanceGuard = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.2, 0.05, 5, torusSegs)), gildedMat);
      lanceGuard.position.y = 0.45;
      lanceGuard.rotation.x = Math.PI / 2;
      const lanceTip = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.16, 0.82, 6)), glowMat);
      lanceTip.position.y = 1.48;
      weaponGroup.add(lanceShaft, lanceGuard, lanceTip);
      weaponGroup.rotation.x = 0.35;
      break;
    }

    case 'sagittarius_starlight_greatbow': {
      // Swept flame-feather crown + towering celestial greatbow with hovering starlight arrow
      const crestGeo = trackGeo(new THREE.ConeGeometry(0.11, 0.54, 4));
      for (const side of [-1, 0, 1]) {
        const plume = new THREE.Mesh(crestGeo, side === 0 ? glowMat : gildedMat);
        plume.position.set(side * 0.24, 0.22 + (side === 0 ? 0.12 : 0), 0);
        plume.rotation.z = side * -0.38;
        crownGroup.add(plume);
      }

      const bowArc = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.92, 0.085, 6, torusSegs, Math.PI * 1.12)),
        gildedMat
      );
      bowArc.rotation.z = -Math.PI * 0.56;
      const arrowShaft = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.04, 0.04, 1.55, 6)), glowMat);
      arrowShaft.rotation.x = Math.PI / 2;
      arrowShaft.position.z = 0.25;
      const arrowHead = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.14, 0.38, 4)), glowMat);
      arrowHead.rotation.x = Math.PI / 2;
      arrowHead.position.z = 1.08;
      weaponGroup.add(bowArc, arrowShaft, arrowHead);
      animNodes.push({ object: weaponGroup, mode: 'bob_y', baseValue: 1.28, amplitude: 0.08, speed: 2.0, phase: 0.7 });
      break;
    }

    case 'capricorn_summit_warmaul': {
      // Twin massive curved golden mountain-ram horns + granite monolith war-maul
      const hornGeo = trackGeo(new THREE.TorusGeometry(0.44, 0.095, 6, torusSegs, Math.PI * 1.15));
      for (const side of [-1, 1]) {
        const horn = new THREE.Mesh(hornGeo, gildedMat);
        horn.position.set(side * 0.42, 0.16, 0.05);
        horn.rotation.y = side * 0.35;
        horn.rotation.z = side > 0 ? -0.35 : Math.PI + 0.35;
        crownGroup.add(horn);
      }
      const keystone = new THREE.Mesh(trackGeo(new THREE.OctahedronGeometry(0.18, 0)), glowMat);
      keystone.position.set(0, 0.32, 0.18);
      crownGroup.add(keystone);

      const handle = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.065, 0.08, 2.25, 6)), gildedMat);
      const maulHead = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.76, 0.46, 0.46)), armorMat);
      maulHead.position.y = 1.05;
      const maulBand = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.82, 0.14, 0.5)), glowMat);
      maulBand.position.y = 1.05;
      weaponGroup.add(handle, maulHead, maulBand);
      weaponGroup.rotation.z = -0.25;
      animNodes.push(
        { object: keystone, mode: 'pulse_scale', baseValue: 1, amplitude: 0.14, speed: 2.2, phase: 0.4 },
        { object: weaponGroup, mode: 'sway_z', baseValue: -0.25, amplitude: 0.08, speed: 1.4, phase: 0.9 }
      );
      break;
    }

    case 'aquarius_starstream_amphora_staff': {
      // Dual orbiting celestial astrolabe rings behind head + floating amphora starstream staff
      const orbitOuter = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.68, 0.045, 6, torusSegs)), gildedMat);
      orbitOuter.position.set(0, 0.16, -0.15);
      const orbitInner = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.46, 0.04, 6, torusSegs)), glowMat);
      orbitInner.position.set(0, 0.16, -0.15);
      orbitInner.rotation.x = Math.PI / 3;
      crownGroup.add(orbitOuter, orbitInner);
      animNodes.push({
        object: orbitInner,
        mode: 'orbit_ring',
        baseValue: Math.PI / 3,
        amplitude: 0.25,
        speed: 1.5,
        phase: 0.3,
      });

      const staff = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.065, 2.2, 6)), armorMat);
      const urn = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.18, 0.28, 0.56, radialSegs)), gildedMat);
      urn.position.set(0, 1.18, 0.1);
      urn.rotation.z = 0.42;
      const stream = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.09, 0.18, 0.95, radialSegs)), glowMat);
      stream.position.set(-0.22, 0.62, 0.18);
      weaponGroup.add(staff, urn, stream);
      animNodes.push({ object: stream, mode: 'pulse_scale', baseValue: 1, amplitude: 0.12, speed: 2.6, phase: 1.1 });
      break;
    }

    case 'pisces_twin_lunar_blades': {
      // Twin interlocking dream crescents halo + dual lunar crescent blades on left & right
      const cresA = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.56, 0.06, 6, torusSegs, Math.PI * 1.15)),
        glowMat
      );
      const cresB = new THREE.Mesh(
        trackGeo(new THREE.TorusGeometry(0.56, 0.06, 6, torusSegs, Math.PI * 1.15)),
        gildedMat
      );
      cresB.rotation.z = Math.PI;
      cresA.position.set(0, 0.2, -0.14);
      cresB.position.set(0, 0.2, -0.14);
      crownGroup.add(cresA, cresB);
      animNodes.push({ object: crownGroup, mode: 'spin_y', baseValue: 0, amplitude: 0, speed: 0.95, phase: 0 });

      const bladeGeo = trackGeo(new THREE.TorusGeometry(0.48, 0.07, 6, torusSegs, Math.PI * 1.18));
      const hiltGeo = trackGeo(new THREE.CylinderGeometry(0.045, 0.045, 0.45, 6));
      for (const side of [-1, 1]) {
        const bladeGroup = new THREE.Group();
        bladeGroup.position.set(side * 1.06, 1.18, 0.26);
        const blade = new THREE.Mesh(bladeGeo, side > 0 ? glowMat : gildedMat);
        blade.rotation.z = side > 0 ? -0.4 : Math.PI + 0.4;
        const hilt = new THREE.Mesh(hiltGeo, armorMat);
        bladeGroup.add(blade, hilt);
        root.add(bladeGroup);
        animNodes.push({
          object: bladeGroup,
          mode: 'bob_y',
          baseValue: 1.18,
          amplitude: 0.1,
          speed: 1.8,
          phase: side > 0 ? 0 : Math.PI,
        });
      }
      break;
    }
  }

  let meshCount = 0;
  let pointLightCount = 0;
  let vertexCount = 0;
  root.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) {
      meshCount += 1;
      const geo = (obj as THREE.Mesh).geometry;
      const posAttr = geo?.getAttribute('position');
      if (posAttr) vertexCount += posAttr.count;
    }
    if ((obj as THREE.PointLight).isPointLight) {
      pointLightCount += 1;
    }
  });

  return {
    spec,
    root,
    animNodes,
    meshCount,
    pointLightCount,
    vertexCount,
    disposables: {
      geometries,
      materials,
    },
  };
}

/**
 * Zero-GC animation stepper for Chapters 5–12 Boss Regalia.
 * Subtly accelerates in Boss Phase II/III and reduces motion amplitude by 75% when `reducedMotion` is enabled.
 */
export function stepZodiacBossRegalia(
  animNodes: readonly ZodiacBossRegaliaAnimNode[] | null | undefined,
  elapsed: number,
  bossPhase = 1,
  reducedMotion = false
): void {
  if (!animNodes || animNodes.length === 0) return;
  const phaseMult = bossPhase >= 3 ? 1.45 : bossPhase === 2 ? 1.2 : 1.0;
  const motionScale = reducedMotion ? 0.25 : 1.0;

  for (let i = 0; i < animNodes.length; i++) {
    const node = animNodes[i];
    const t = elapsed * node.speed * phaseMult + node.phase;
    switch (node.mode) {
      case 'spin_y':
        node.object.rotation.y = node.baseValue + elapsed * node.speed * phaseMult * motionScale + node.phase;
        break;
      case 'bob_y':
        node.object.position.y = node.baseValue + Math.sin(t) * node.amplitude * motionScale;
        break;
      case 'sway_z':
        node.object.rotation.z = node.baseValue + Math.sin(t) * node.amplitude * motionScale;
        break;
      case 'pulse_scale': {
        const s = node.baseValue + Math.sin(t) * node.amplitude * motionScale;
        node.object.scale.setScalar(s);
        break;
      }
      case 'orbit_ring':
        node.object.rotation.x = node.baseValue + Math.sin(t) * node.amplitude * motionScale;
        node.object.rotation.y = elapsed * node.speed * phaseMult * motionScale + node.phase;
        break;
    }
  }
}

export function disposeZodiacBossRegalia(regalia: BuiltZodiacBossRegalia | null | undefined): void {
  if (!regalia) return;
  for (let i = 0; i < regalia.disposables.geometries.length; i++) {
    regalia.disposables.geometries[i].dispose();
  }
  for (let i = 0; i < regalia.disposables.materials.length; i++) {
    regalia.disposables.materials[i].dispose();
  }
}

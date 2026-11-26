import * as THREE from 'three';

/**
 * Bespoke Procedural 3D Zodiac Sanctuary Architecture for Chapters 5–12 (Wave 7 Art Direction & Fidelity).
 *
 * Gives every late-campaign Zodiac realm (Cancer → Pisces) a distinctive, recognizable multi-part
 * architectural silhouette framed outside the playable arena rectangle so combat sightlines stay 100%
 * clear while dramatically elevating environmental storytelling and visual identity.
 *
 * Strict Dell Latitude E5430 / Intel HD 4000 Compliance:
 * - ZERO THREE.PointLight instances created anywhere in the hierarchy.
 * - Shared materials across all parts of each realm's monument assembly.
 * - Automatic segment reduction when `liteActive === true`.
 * - Grounded radial contact shadow disc beneath each pedestal (`depthWrite: false`).
 * - Zero-GC animation stepping via `stepZodiacRealmLandmarks`.
 */

export type ZodiacMonumentChapterId = 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;

export type ZodiacMonumentArchetype =
  | 'cancer_tidal_arch'
  | 'virgo_astral_sundial'
  | 'libra_golden_scales'
  | 'scorpio_obsidian_spire'
  | 'sagittarius_celestial_bow'
  | 'capricorn_summit_monolith'
  | 'aquarius_starlight_amphora'
  | 'pisces_twin_crescents';

export interface ZodiacMonumentSpec {
  chapterId: ZodiacMonumentChapterId;
  zodiacId: string;
  archetype: ZodiacMonumentArchetype;
  titleVi: string;
  accentSecondaryHex: number;
  baseHeight: number;
}

export interface ZodiacLandmarkAnimNode {
  object: THREE.Object3D;
  mode: 'spin_y' | 'orbit_tilt' | 'sway_z' | 'bob_y' | 'pulse_scale';
  baseValue: number;
  amplitude: number;
  speed: number;
  phase: number;
}

export interface BuiltZodiacRealmLandmarks {
  spec: ZodiacMonumentSpec;
  group: THREE.Group;
  animNodes: ZodiacLandmarkAnimNode[];
  meshCount: number;
  pointLightCount: number;
}

export const ZODIAC_REALM_MONUMENTS: Record<ZodiacMonumentChapterId, ZodiacMonumentSpec> = {
  5: {
    chapterId: 5,
    zodiacId: 'cancer',
    archetype: 'cancer_tidal_arch',
    titleVi: 'Thủy Triều Nguyệt Tháp',
    accentSecondaryHex: 0x7dd3fc,
    baseHeight: 4.8,
  },
  6: {
    chapterId: 6,
    zodiacId: 'virgo',
    archetype: 'virgo_astral_sundial',
    titleVi: 'Nhật Khuê Thánh Điện',
    accentSecondaryHex: 0xfde68a,
    baseHeight: 5.1,
  },
  7: {
    chapterId: 7,
    zodiacId: 'libra',
    archetype: 'libra_golden_scales',
    titleVi: 'Cán Cân Công Lý Hoàng Kim',
    accentSecondaryHex: 0xfbbf24,
    baseHeight: 5.4,
  },
  8: {
    chapterId: 8,
    zodiacId: 'scorpio',
    archetype: 'scorpio_obsidian_spire',
    titleVi: 'Tháp Độc Thạch Hắc Diện',
    accentSecondaryHex: 0xc084fc,
    baseHeight: 5.6,
  },
  9: {
    chapterId: 9,
    zodiacId: 'sagittarius',
    archetype: 'sagittarius_celestial_bow',
    titleVi: 'Khải Hoàn Cung Tinh Đạo',
    accentSecondaryHex: 0xfb923c,
    baseHeight: 5.5,
  },
  10: {
    chapterId: 10,
    zodiacId: 'capricorn',
    archetype: 'capricorn_summit_monolith',
    titleVi: 'Cự Thạch Sơn Đỉnh Cổ Đại',
    accentSecondaryHex: 0x94a3b8,
    baseHeight: 5.8,
  },
  11: {
    chapterId: 11,
    zodiacId: 'aquarius',
    archetype: 'aquarius_starlight_amphora',
    titleVi: 'Thiên Bình Tinh Lưu Khí',
    accentSecondaryHex: 0x22d3ee,
    baseHeight: 5.3,
  },
  12: {
    chapterId: 12,
    zodiacId: 'pisces',
    archetype: 'pisces_twin_crescents',
    titleVi: 'Song Ngư Mộng Cảnh Đài',
    accentSecondaryHex: 0xf472b6,
    baseHeight: 5.4,
  },
};

export function getZodiacMonumentSpec(chapterId: number): ZodiacMonumentSpec | null {
  if (chapterId >= 5 && chapterId <= 12) {
    return ZODIAC_REALM_MONUMENTS[chapterId as ZodiacMonumentChapterId] ?? null;
  }
  return null;
}

interface SharedMonumentPalette {
  marble: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  glow: THREE.MeshStandardMaterial;
  secondaryGlow: THREE.MeshStandardMaterial;
  shadowDisc: THREE.MeshBasicMaterial;
  radialSegs: number;
  torusSegs: number;
}

function buildSingleMonument(
  spec: ZodiacMonumentSpec,
  pal: SharedMonumentPalette,
  animNodes: ZodiacLandmarkAnimNode[],
  phaseSeed: number,
  scale = 1.0
): THREE.Group {
  const root = new THREE.Group();
  root.scale.setScalar(scale);

  // Grounded soft contact shadow disc (bottom-center grounding at y = 0.015)
  const contactShadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.85, pal.radialSegs),
    pal.shadowDisc
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.015;
  root.add(contactShadow);

  // Stepped marble plinth (universal base anchor)
  const plinthBottom = new THREE.Mesh(
    new THREE.CylinderGeometry(1.25, 1.48, 0.42, pal.radialSegs),
    pal.marble
  );
  plinthBottom.position.y = 0.21;
  const plinthCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(1.06, 1.18, 0.16, pal.radialSegs),
    pal.gold
  );
  plinthCollar.position.y = 0.5;
  root.add(plinthBottom, plinthCollar);

  switch (spec.archetype) {
    case 'cancer_tidal_arch': {
      // Twin coral-marble tide pillars + crescent lunar arch + hovering tide orb
      for (const side of [-1, 1]) {
        const col = new THREE.Mesh(
          new THREE.CylinderGeometry(0.24, 0.34, 2.75, pal.radialSegs),
          pal.marble
        );
        col.position.set(side * 0.78, 1.92, 0);
        const cap = new THREE.Mesh(
          new THREE.CylinderGeometry(0.36, 0.28, 0.16, pal.radialSegs),
          pal.gold
        );
        cap.position.set(side * 0.78, 3.32, 0);
        root.add(col, cap);
      }
      const crescentArch = new THREE.Mesh(
        new THREE.TorusGeometry(0.92, 0.14, 6, pal.torusSegs, Math.PI),
        pal.gold
      );
      crescentArch.position.set(0, 3.25, 0);
      root.add(crescentArch);

      const tideOrb = new THREE.Mesh(new THREE.OctahedronGeometry(0.46, 1), pal.glow);
      tideOrb.position.set(0, 2.35, 0);
      root.add(tideOrb);
      animNodes.push(
        { object: tideOrb, mode: 'bob_y', baseValue: 2.35, amplitude: 0.18, speed: 1.6, phase: phaseSeed },
        { object: tideOrb, mode: 'spin_y', baseValue: 0, amplitude: 0, speed: 0.9, phase: phaseSeed }
      );
      const tideRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.68, 0.045, 6, pal.torusSegs),
        pal.secondaryGlow
      );
      tideRing.position.set(0, 2.35, 0);
      tideRing.rotation.x = Math.PI / 2.3;
      root.add(tideRing);
      animNodes.push({
        object: tideRing,
        mode: 'orbit_tilt',
        baseValue: Math.PI / 2.3,
        amplitude: 0.24,
        speed: 1.15,
        phase: phaseSeed,
      });
      break;
    }

    case 'virgo_astral_sundial': {
      // Fluted ivory pedestal + angled gilded sundial ring + celestial gnomon blade
      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.48, 2.2, pal.radialSegs),
        pal.marble
      );
      shaft.position.y = 1.65;
      const dialPlate = new THREE.Mesh(
        new THREE.CylinderGeometry(1.05, 0.96, 0.14, pal.radialSegs),
        pal.gold
      );
      dialPlate.position.y = 2.82;
      const gnomon = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.65, 4), pal.gold);
      gnomon.position.set(0, 3.55, 0);
      gnomon.rotation.z = -0.28;
      root.add(shaft, dialPlate, gnomon);

      const astrolabe = new THREE.Group();
      astrolabe.position.y = 3.55;
      const outerRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.95, 0.06, 6, pal.torusSegs),
        pal.gold
      );
      const innerRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.66, 0.045, 6, pal.torusSegs),
        pal.secondaryGlow
      );
      innerRing.rotation.x = Math.PI / 3;
      const coreGem = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), pal.glow);
      astrolabe.add(outerRing, innerRing, coreGem);
      root.add(astrolabe);
      animNodes.push({
        object: astrolabe,
        mode: 'spin_y',
        baseValue: 0,
        amplitude: 0,
        speed: 0.72,
        phase: phaseSeed,
      });
      break;
    }

    case 'libra_golden_scales': {
      // Monumental central justice pillar + gently swaying golden balance beam + twin luminous crystal pans
      const pillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.44, 3.45, pal.radialSegs),
        pal.marble
      );
      pillar.position.y = 2.28;
      const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), pal.glow);
      crown.position.y = 4.35;
      root.add(pillar, crown);

      const beamPivot = new THREE.Group();
      beamPivot.position.y = 3.85;
      const crossBeam = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.14, 0.18), pal.gold);
      beamPivot.add(crossBeam);

      for (const side of [-1, 1]) {
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.1, 6), pal.gold);
        rod.position.set(side * 1.08, -0.55, 0);
        const pan = new THREE.Mesh(
          new THREE.CylinderGeometry(0.46, 0.24, 0.18, pal.radialSegs),
          pal.gold
        );
        pan.position.set(side * 1.08, -1.12, 0);
        const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), pal.glow);
        crystal.position.set(side * 1.08, -0.88, 0);
        beamPivot.add(rod, pan, crystal);
      }
      root.add(beamPivot);
      animNodes.push({
        object: beamPivot,
        mode: 'sway_z',
        baseValue: 0,
        amplitude: 0.14,
        speed: 1.1,
        phase: phaseSeed,
      });
      break;
    }

    case 'scorpio_obsidian_spire': {
      // Segmented curved obsidian scorpion-tail monolith + glowing venom stinger crystal
      const segConfigs: Array<[number, number, number, number]> = [
        [0, 1.05, 0.56, 0.0],
        [0.06, 1.85, 0.48, -0.14],
        [0.18, 2.6, 0.4, -0.28],
        [0.34, 3.32, 0.32, -0.44],
        [0.2, 3.98, 0.24, -0.82],
      ];
      for (const [sx, sy, rad, rz] of segConfigs) {
        const seg = new THREE.Mesh(
          new THREE.CylinderGeometry(rad * 0.82, rad, 0.82, 6),
          pal.marble
        );
        seg.position.set(sx, sy, 0);
        seg.rotation.z = rz;
        const band = new THREE.Mesh(
          new THREE.TorusGeometry(rad * 0.94, 0.045, 5, 12),
          pal.gold
        );
        band.position.set(sx, sy + 0.12, 0);
        band.rotation.x = Math.PI / 2;
        band.rotation.y = rz;
        root.add(seg, band);
      }
      const stinger = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.92, 6), pal.glow);
      stinger.position.set(-0.22, 4.35, 0);
      stinger.rotation.z = 1.15;
      root.add(stinger);
      animNodes.push({
        object: stinger,
        mode: 'pulse_scale',
        baseValue: 1.0,
        amplitude: 0.11,
        speed: 2.3,
        phase: phaseSeed,
      });
      break;
    }

    case 'sagittarius_celestial_bow': {
      // Triumphant crescent bow-arch + taut energy string + golden star-arrow poised skyward
      const basePillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.38, 0.54, 1.5, pal.radialSegs),
        pal.marble
      );
      basePillar.position.y = 1.28;
      root.add(basePillar);

      const bowArc = new THREE.Mesh(
        new THREE.TorusGeometry(1.38, 0.14, 6, pal.torusSegs, Math.PI * 1.15),
        pal.gold
      );
      bowArc.position.set(0, 2.85, 0);
      bowArc.rotation.z = -Math.PI * 0.075;
      root.add(bowArc);

      const arrowGroup = new THREE.Group();
      arrowGroup.position.set(0, 3.15, 0);
      const arrowShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.55, 6), pal.secondaryGlow);
      const arrowHead = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.62, 4), pal.glow);
      arrowHead.position.y = 1.48;
      const fletch = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.22, 0.06), pal.gold);
      fletch.position.y = -1.05;
      arrowGroup.add(arrowShaft, arrowHead, fletch);
      root.add(arrowGroup);
      animNodes.push({
        object: arrowGroup,
        mode: 'bob_y',
        baseValue: 3.15,
        amplitude: 0.16,
        speed: 1.85,
        phase: phaseSeed,
      });
      break;
    }

    case 'capricorn_summit_monolith': {
      // Stepped mountain-peak obelisk + twin curved gilded ram-horn crests + glowing summit keystone
      const lowerPeak = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 1.08, 1.85, 6), pal.marble);
      lowerPeak.position.y = 1.45;
      const upperPeak = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.68, 2.05, 6), pal.marble);
      upperPeak.position.y = 3.35;
      const summitCap = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.85, 6), pal.gold);
      summitCap.position.y = 4.78;
      root.add(lowerPeak, upperPeak, summitCap);

      for (const side of [-1, 1]) {
        const horn = new THREE.Mesh(
          new THREE.TorusGeometry(0.62, 0.11, 6, pal.torusSegs, Math.PI * 0.92),
          pal.gold
        );
        horn.position.set(side * 0.66, 3.52, 0);
        horn.rotation.z = side > 0 ? -0.45 : Math.PI + 0.45;
        root.add(horn);
      }

      const runeCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), pal.glow);
      runeCore.position.y = 2.68;
      runeCore.position.z = 0.52;
      root.add(runeCore);
      animNodes.push({
        object: runeCore,
        mode: 'spin_y',
        baseValue: 0,
        amplitude: 0,
        speed: 1.05,
        phase: phaseSeed,
      });
      break;
    }

    case 'aquarius_starlight_amphora': {
      // Celestial basin + floating tilted amphora urn + shimmering starlight cascade stream
      const basin = new THREE.Mesh(
        new THREE.CylinderGeometry(1.02, 0.78, 0.48, pal.radialSegs),
        pal.marble
      );
      basin.position.y = 0.82;
      const basinPool = new THREE.Mesh(
        new THREE.CircleGeometry(0.86, pal.radialSegs),
        pal.secondaryGlow
      );
      basinPool.rotation.x = -Math.PI / 2;
      basinPool.position.y = 1.08;
      root.add(basin, basinPool);

      const urnGroup = new THREE.Group();
      urnGroup.position.set(0.28, 3.55, 0);
      urnGroup.rotation.z = 0.58;
      const urnBody = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.52, 1.15, pal.radialSegs),
        pal.gold
      );
      const urnNeck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.22, 0.45, pal.radialSegs),
        pal.marble
      );
      urnNeck.position.y = 0.75;
      urnGroup.add(urnBody, urnNeck);
      root.add(urnGroup);

      const cascade = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.32, 2.35, pal.radialSegs),
        pal.glow
      );
      cascade.position.set(-0.18, 2.22, 0);
      cascade.rotation.z = -0.14;
      root.add(cascade);

      animNodes.push(
        { object: urnGroup, mode: 'bob_y', baseValue: 3.55, amplitude: 0.14, speed: 1.4, phase: phaseSeed },
        { object: cascade, mode: 'pulse_scale', baseValue: 1.0, amplitude: 0.1, speed: 2.5, phase: phaseSeed }
      );
      break;
    }

    case 'pisces_twin_crescents': {
      // Sanctuary pedestal + twin interlocking pearl/coral crescent rings orbiting a dream crystal
      const pedestal = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.56, 1.75, pal.radialSegs),
        pal.marble
      );
      pedestal.position.y = 1.42;
      root.add(pedestal);

      const orbitGroup = new THREE.Group();
      orbitGroup.position.y = 3.35;
      const crescentA = new THREE.Mesh(
        new THREE.TorusGeometry(0.95, 0.11, 6, pal.torusSegs, Math.PI * 1.18),
        pal.glow
      );
      const crescentB = new THREE.Mesh(
        new THREE.TorusGeometry(0.95, 0.11, 6, pal.torusSegs, Math.PI * 1.18),
        pal.secondaryGlow
      );
      crescentB.rotation.z = Math.PI;
      crescentB.rotation.y = Math.PI * 0.28;
      const dreamPrism = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), pal.gold);
      orbitGroup.add(crescentA, crescentB, dreamPrism);
      root.add(orbitGroup);

      animNodes.push(
        { object: orbitGroup, mode: 'spin_y', baseValue: 0, amplitude: 0, speed: 0.85, phase: phaseSeed },
        { object: orbitGroup, mode: 'bob_y', baseValue: 3.35, amplitude: 0.16, speed: 1.35, phase: phaseSeed }
      );
      break;
    }
  }

  return root;
}

/**
 * Builds the flanking + North-Vista bespoke Zodiac Sanctuary Landmarks for Chapters 5–12.
 * All landmarks sit cleanly outside the playable combat rectangle (`|x| > arenaHalfW + 1.8`
 * or `z < -arenaHalfD - 3.0`) so movement and camera sightlines remain unobstructed.
 */
export function buildZodiacRealmLandmarks(params: {
  chapterId: number;
  trimHex: number;
  stoneHex: number;
  arenaHalfW: number;
  arenaHalfD: number;
  liteActive: boolean;
}): BuiltZodiacRealmLandmarks | null {
  const spec = getZodiacMonumentSpec(params.chapterId);
  if (!spec) return null;

  const pal: SharedMonumentPalette = {
    marble: new THREE.MeshStandardMaterial({
      color: params.stoneHex,
      roughness: 0.48,
      metalness: 0.22,
    }),
    gold: new THREE.MeshStandardMaterial({
      color: 0xfcd34d,
      roughness: 0.24,
      metalness: 0.88,
    }),
    glow: new THREE.MeshStandardMaterial({
      color: params.trimHex,
      emissive: params.trimHex,
      emissiveIntensity: params.liteActive ? 0.95 : 1.4,
      roughness: 0.18,
      metalness: 0.25,
    }),
    secondaryGlow: new THREE.MeshStandardMaterial({
      color: spec.accentSecondaryHex,
      emissive: spec.accentSecondaryHex,
      emissiveIntensity: params.liteActive ? 0.78 : 1.15,
      roughness: 0.22,
      metalness: 0.3,
    }),
    shadowDisc: new THREE.MeshBasicMaterial({
      color: 0x050814,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    }),
    radialSegs: params.liteActive ? 6 : 10,
    torusSegs: params.liteActive ? 12 : 22,
  };

  const group = new THREE.Group();
  group.name = `ZodiacRealmLandmarks_Ch${spec.chapterId}_${spec.zodiacId}`;
  const animNodes: ZodiacLandmarkAnimNode[] = [];

  // Flanking West & East sanctuary monuments outside the colonnade
  const flankX = params.arenaHalfW + 3.45;
  const flankZ = -params.arenaHalfD * 0.38;

  const westMonument = buildSingleMonument(spec, pal, animNodes, 0.0, 1.05);
  westMonument.position.set(-flankX, 0, flankZ);
  westMonument.rotation.y = Math.PI * 0.16;

  const eastMonument = buildSingleMonument(spec, pal, animNodes, Math.PI * 0.75, 1.05);
  eastMonument.position.set(flankX, 0, flankZ);
  eastMonument.rotation.y = -Math.PI * 0.16;

  group.add(westMonument, eastMonument);

  // Elevated North Vista Sanctuary Altar behind the portal (skipped only in ultra-lite if needed,
  // still zero PointLights & ultra-low poly so even Lite E5430 can enjoy the North focal crest!)
  const northCrest = buildSingleMonument(spec, pal, animNodes, Math.PI * 1.35, params.liteActive ? 1.15 : 1.32);
  northCrest.position.set(0, 0.35, -params.arenaHalfD - 4.25);
  group.add(northCrest);

  let meshCount = 0;
  let pointLightCount = 0;
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) meshCount += 1;
    if ((obj as THREE.PointLight).isPointLight) pointLightCount += 1;
  });

  return {
    spec,
    group,
    animNodes,
    meshCount,
    pointLightCount,
  };
}

/**
 * Zero-GC animation stepper for active Zodiac Sanctuary Landmarks.
 * Automatically dampens amplitude by 75% when `reducedMotion` is enabled.
 */
export function stepZodiacRealmLandmarks(
  animNodes: readonly ZodiacLandmarkAnimNode[] | null | undefined,
  elapsed: number,
  reducedMotion = false
): void {
  if (!animNodes || animNodes.length === 0) return;
  const motionScale = reducedMotion ? 0.25 : 1.0;
  for (let i = 0; i < animNodes.length; i++) {
    const node = animNodes[i];
    const t = elapsed * node.speed + node.phase;
    switch (node.mode) {
      case 'spin_y':
        node.object.rotation.y = node.baseValue + elapsed * node.speed * motionScale + node.phase;
        break;
      case 'orbit_tilt':
        node.object.rotation.x = node.baseValue + Math.sin(t) * node.amplitude * motionScale;
        node.object.rotation.y = elapsed * node.speed * 0.85 * motionScale + node.phase;
        break;
      case 'sway_z':
        node.object.rotation.z = node.baseValue + Math.sin(t) * node.amplitude * motionScale;
        break;
      case 'bob_y':
        node.object.position.y = node.baseValue + Math.sin(t) * node.amplitude * motionScale;
        break;
      case 'pulse_scale': {
        const s = node.baseValue + Math.sin(t) * node.amplitude * motionScale;
        node.object.scale.setScalar(s);
        break;
      }
    }
  }
}

// ============================================================================
// WAVE 13 PILLAR 4: CHAPTER 5–12 PROCEDURAL CELESTIAL ARENA FLOOR MEDALLIONS
// ============================================================================

export interface BuiltZodiacFloorMedallion {
  spec: ZodiacMonumentSpec;
  group: THREE.Group;
  animNodes: ZodiacLandmarkAnimNode[];
  meshCount: number;
  pointLightCount: number;
  baseY: number;
}

/**
 * Builds a bespoke multi-part celestial floor medallion inlay for Chapters 5–12.
 * - Positioned flush at y = 0.025 with `polygonOffset = true` & `depthWrite = false`
 *   so there is zero Z-fighting against the arena floor and zero occlusion of combat
 *   ground telegraphs (`y >= 0.04`).
 * - Strict 0 PointLights, shared materials, automatic Lite segment reduction (Dell E5430 safe).
 */
export function buildZodiacArenaFloorMedallion(params: {
  chapterId: number;
  trimHex: number;
  arenaHalfW: number;
  arenaHalfD: number;
  liteActive: boolean;
}): BuiltZodiacFloorMedallion | null {
  const spec = getZodiacMonumentSpec(params.chapterId);
  if (!spec) return null;

  const baseY = 0.025;
  const maxRadius = Math.max(3.6, Math.min(params.arenaHalfW, params.arenaHalfD) * 0.56);
  const ringSegs = params.liteActive ? 20 : 40;
  const polySegs = params.liteActive ? 6 : 8;

  const primaryMat = new THREE.MeshBasicMaterial({
    color: params.trimHex,
    transparent: true,
    opacity: params.liteActive ? 0.24 : 0.32,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const secondaryMat = new THREE.MeshBasicMaterial({
    color: spec.accentSecondaryHex,
    transparent: true,
    opacity: params.liteActive ? 0.18 : 0.26,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const goldInlayMat = new THREE.MeshBasicMaterial({
    color: 0xfcd34d,
    transparent: true,
    opacity: params.liteActive ? 0.2 : 0.28,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const group = new THREE.Group();
  group.name = `ZodiacFloorMedallion_Ch${spec.chapterId}_${spec.zodiacId}`;
  group.position.y = baseY;
  const animNodes: ZodiacLandmarkAnimNode[] = [];

  // 1. Universal outer celestial astrolabe boundary ring
  const outerRing = new THREE.Mesh(
    new THREE.RingGeometry(maxRadius * 0.92, maxRadius, ringSegs),
    primaryMat
  );
  outerRing.rotation.x = -Math.PI / 2;
  group.add(outerRing);

  // 2. Subtle inner rotating sigil layer (distinct geometry per Zodiac Ch.5–12)
  const innerSigil = new THREE.Group();
  innerSigil.position.y = 0.002;
  group.add(innerSigil);

  const makeFlatRing = (innerR: number, outerR: number, segs: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.RingGeometry(innerR, outerR, segs), mat);
    m.rotation.x = -Math.PI / 2;
    return m;
  };

  const makeRayBar = (len: number, width: number, angleRad: number, mat: THREE.Material) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(len, width), mat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = angleRad;
    return m;
  };

  switch (spec.archetype) {
    case 'cancer_tidal_arch': {
      // Concentric lunar tidal waves + twin crescent arcs
      innerSigil.add(makeFlatRing(maxRadius * 0.56, maxRadius * 0.64, ringSegs, secondaryMat));
      innerSigil.add(makeFlatRing(maxRadius * 0.26, maxRadius * 0.34, ringSegs, goldInlayMat));
      const arcA = new THREE.Mesh(
        new THREE.RingGeometry(maxRadius * 0.72, maxRadius * 0.82, ringSegs, 1, 0.2, Math.PI * 0.75),
        primaryMat
      );
      arcA.rotation.x = -Math.PI / 2;
      const arcB = new THREE.Mesh(
        new THREE.RingGeometry(
          maxRadius * 0.72,
          maxRadius * 0.82,
          ringSegs,
          1,
          Math.PI + 0.2,
          Math.PI * 0.75
        ),
        primaryMat
      );
      arcB.rotation.x = -Math.PI / 2;
      innerSigil.add(arcA, arcB);
      break;
    }
    case 'virgo_astral_sundial': {
      // Sacred octagram star + solar sundial spokes
      innerSigil.add(makeFlatRing(maxRadius * 0.68, maxRadius * 0.75, 8, goldInlayMat));
      const innerOct = makeFlatRing(maxRadius * 0.42, maxRadius * 0.49, 8, secondaryMat);
      innerOct.rotation.z = Math.PI / 8;
      innerSigil.add(innerOct);
      for (let i = 0; i < 4; i++) {
        innerSigil.add(makeRayBar(maxRadius * 1.68, 0.08, (i * Math.PI) / 4, goldInlayMat));
      }
      break;
    }
    case 'libra_golden_scales': {
      // Balance meridian beam + twin scale pan discs
      innerSigil.add(makeRayBar(maxRadius * 1.72, 0.14, 0, goldInlayMat));
      innerSigil.add(makeRayBar(maxRadius * 1.2, 0.09, Math.PI / 2, secondaryMat));
      const panL = makeFlatRing(maxRadius * 0.16, maxRadius * 0.28, ringSegs, goldInlayMat);
      panL.position.x = -maxRadius * 0.54;
      const panR = makeFlatRing(maxRadius * 0.16, maxRadius * 0.28, ringSegs, goldInlayMat);
      panR.position.x = maxRadius * 0.54;
      innerSigil.add(panL, panR);
      break;
    }
    case 'scorpio_obsidian_spire': {
      // Hexagonal venom sigil + sharp obsidian cross-fangs
      innerSigil.add(makeFlatRing(maxRadius * 0.58, maxRadius * 0.68, 6, primaryMat));
      const fangHex = makeFlatRing(maxRadius * 0.3, maxRadius * 0.4, 6, secondaryMat);
      fangHex.rotation.z = Math.PI / 6;
      innerSigil.add(fangHex);
      for (let i = 0; i < 3; i++) {
        innerSigil.add(makeRayBar(maxRadius * 1.56, 0.1, (i * Math.PI) / 3, secondaryMat));
      }
      break;
    }
    case 'sagittarius_celestial_bow': {
      // Star-arrow compass pointing North + drawn bow arc
      innerSigil.add(makeRayBar(maxRadius * 1.78, 0.14, Math.PI / 2, goldInlayMat));
      const bowArc = new THREE.Mesh(
        new THREE.RingGeometry(maxRadius * 0.64, maxRadius * 0.74, ringSegs, 1, Math.PI * 0.15, Math.PI * 0.7),
        primaryMat
      );
      bowArc.rotation.x = -Math.PI / 2;
      const fletchL = makeRayBar(maxRadius * 0.6, 0.1, Math.PI * 0.25, secondaryMat);
      const fletchR = makeRayBar(maxRadius * 0.6, 0.1, -Math.PI * 0.25, secondaryMat);
      innerSigil.add(bowArc, fletchL, fletchR);
      break;
    }
    case 'capricorn_summit_monolith': {
      // Stepped mountain-crest triangle + solid stone compass frame
      innerSigil.add(makeFlatRing(maxRadius * 0.62, maxRadius * 0.74, 3, primaryMat));
      const invTri = makeFlatRing(maxRadius * 0.42, maxRadius * 0.52, 3, goldInlayMat);
      invTri.rotation.z = Math.PI;
      innerSigil.add(invTri);
      innerSigil.add(makeFlatRing(maxRadius * 0.18, maxRadius * 0.26, polySegs, secondaryMat));
      break;
    }
    case 'aquarius_starlight_amphora': {
      // Flowing double wave rings + starlight cardinal nodes
      innerSigil.add(makeFlatRing(maxRadius * 0.7, maxRadius * 0.77, ringSegs, secondaryMat));
      innerSigil.add(makeFlatRing(maxRadius * 0.44, maxRadius * 0.51, ringSegs, primaryMat));
      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2;
        const node = makeFlatRing(0.14, 0.34, 6, goldInlayMat);
        node.position.set(Math.cos(ang) * maxRadius * 0.6, 0, Math.sin(ang) * maxRadius * 0.6);
        innerSigil.add(node);
      }
      break;
    }
    case 'pisces_twin_crescents': {
      // Twin opposing dream-fish arcs + central lotus core
      const twinA = new THREE.Mesh(
        new THREE.RingGeometry(maxRadius * 0.48, maxRadius * 0.62, ringSegs, 1, 0, Math.PI * 0.85),
        primaryMat
      );
      twinA.rotation.x = -Math.PI / 2;
      const twinB = new THREE.Mesh(
        new THREE.RingGeometry(
          maxRadius * 0.48,
          maxRadius * 0.62,
          ringSegs,
          1,
          Math.PI,
          Math.PI * 0.85
        ),
        secondaryMat
      );
      twinB.rotation.x = -Math.PI / 2;
      innerSigil.add(twinA, twinB, makeFlatRing(maxRadius * 0.2, maxRadius * 0.29, ringSegs, goldInlayMat));
      break;
    }
  }

  animNodes.push({
    object: innerSigil,
    mode: 'spin_y',
    baseValue: 0,
    amplitude: 0,
    speed: 0.08,
    phase: spec.chapterId * 0.5,
  });

  let meshCount = 0;
  let pointLightCount = 0;
  group.traverse((obj) => {
    if ((obj as THREE.Mesh).isMesh) meshCount += 1;
    if ((obj as THREE.PointLight).isPointLight) pointLightCount += 1;
  });

  return {
    spec,
    group,
    animNodes,
    meshCount,
    pointLightCount,
    baseY,
  };
}

/**
 * Disposes all geometries and unique materials inside a Zodiac floor medallion cleanly.
 */
export function disposeZodiacFloorMedallion(medallion: BuiltZodiacFloorMedallion | null | undefined): void {
  if (!medallion) return;
  const disposedMats = new Set<THREE.Material>();
  medallion.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (m && !disposedMats.has(m)) {
        disposedMats.add(m);
        m.dispose();
      }
    }
  });
}

// ============================================================================
// WAVE 14 PILLAR 3: CHAPTER 5–12 PROCEDURAL 3D ENVIRONMENTAL STORYTELLING PROPS
// ============================================================================

export type ZodiacStoryPropKind =
  | 'cancer_coral_lantern'
  | 'virgo_astral_lectern'
  | 'libra_crystal_scale_post'
  | 'scorpio_obsidian_censer'
  | 'sagittarius_star_quiver_rack'
  | 'capricorn_glacial_stele'
  | 'aquarius_hydro_conduit'
  | 'pisces_pearl_arch';

export interface ZodiacStoryPropSpec {
  chapterId: ZodiacMonumentChapterId;
  zodiacId: string;
  kind: ZodiacStoryPropKind;
  relicTitleVi: string;
  accentHex: number;
}

export interface BuiltZodiacStorytellingProps {
  spec: ZodiacStoryPropSpec;
  group: THREE.Group;
  animNodes: ZodiacLandmarkAnimNode[];
  meshCount: number;
  pointLightCount: number;
  stoneRoughness: number;
  metalRoughness: number;
  totalVertexCount: number;
}

export const ZODIAC_STORYTELLING_PROPS: Readonly<
  Record<ZodiacMonumentChapterId, ZodiacStoryPropSpec>
> = {
  5: {
    chapterId: 5,
    zodiacId: 'cancer',
    kind: 'cancer_coral_lantern',
    relicTitleVi: 'Lồng Đèn San Hô Nguyệt Triều',
    accentHex: 0x38bdf8,
  },
  6: {
    chapterId: 6,
    zodiacId: 'virgo',
    kind: 'virgo_astral_lectern',
    relicTitleVi: 'Bệ Thư Tịch Tinh Nữ',
    accentHex: 0xfde047,
  },
  7: {
    chapterId: 7,
    zodiacId: 'libra',
    kind: 'libra_crystal_scale_post',
    relicTitleVi: 'Cột Cân Pha Lê Thiên Bình',
    accentHex: 0xfbbf24,
  },
  8: {
    chapterId: 8,
    zodiacId: 'scorpio',
    kind: 'scorpio_obsidian_censer',
    relicTitleVi: 'Lư Độc Hắc Diện Bọ Cạp',
    accentHex: 0xc084fc,
  },
  9: {
    chapterId: 9,
    zodiacId: 'sagittarius',
    kind: 'sagittarius_star_quiver_rack',
    relicTitleVi: 'Giá Tên Sao Băng Nhân Mã',
    accentHex: 0xfb923c,
  },
  10: {
    chapterId: 10,
    zodiacId: 'capricorn',
    kind: 'capricorn_glacial_stele',
    relicTitleVi: 'Bia Khắc Đá Băng Ma Kết',
    accentHex: 0x93c5fd,
  },
  11: {
    chapterId: 11,
    zodiacId: 'aquarius',
    kind: 'aquarius_hydro_conduit',
    relicTitleVi: 'Đài Dẫn Tinh Thủy Bảo Bình',
    accentHex: 0x22d3ee,
  },
  12: {
    chapterId: 12,
    zodiacId: 'pisces',
    kind: 'pisces_pearl_arch',
    relicTitleVi: 'Cổng Ngọc Trai Song Ngư',
    accentHex: 0xf472b6,
  },
};

export function getZodiacStoryPropSpec(chapterId: number): ZodiacStoryPropSpec | null {
  if (chapterId >= 5 && chapterId <= 12) {
    return ZODIAC_STORYTELLING_PROPS[chapterId as ZodiacMonumentChapterId] ?? null;
  }
  return null;
}

interface StoryPropPalette {
  stone: THREE.MeshStandardMaterial;
  metal: THREE.MeshStandardMaterial;
  crystal: THREE.MeshStandardMaterial;
  shadowDisc: THREE.MeshBasicMaterial;
  radialSegs: number;
  torusSegs: number;
}

function buildSingleStoryProp(
  spec: ZodiacStoryPropSpec,
  pal: StoryPropPalette,
  animNodes: ZodiacLandmarkAnimNode[],
  phaseSeed: number
): THREE.Group {
  const root = new THREE.Group();

  // Bottom-center grounded contact shadow disc (y = 0.015, depthWrite: false)
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(1.15, pal.radialSegs),
    pal.shadowDisc
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.015;
  root.add(shadow);

  // Carved sanctuary stone base grounded at y = 0
  const baseSlab = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.88, 0.28, pal.radialSegs),
    pal.stone
  );
  baseSlab.position.y = 0.14;
  const trimBand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.62, 0.68, 0.1, pal.radialSegs),
    pal.metal
  );
  trimBand.position.y = 0.33;
  root.add(baseSlab, trimBand);

  switch (spec.kind) {
    case 'cancer_coral_lantern': {
      const stem = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.24, 1.35, pal.radialSegs),
        pal.stone
      );
      stem.position.y = 1.05;
      const cageRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.42, 0.055, 6, pal.torusSegs),
        pal.metal
      );
      cageRing.position.y = 1.98;
      const pearl = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), pal.crystal);
      pearl.position.y = 1.98;
      const finial = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.36, pal.radialSegs), pal.metal);
      finial.position.y = 2.55;
      root.add(stem, cageRing, pearl, finial);
      animNodes.push(
        { object: pearl, mode: 'bob_y', baseValue: 1.98, amplitude: 0.08, speed: 1.7, phase: phaseSeed },
        { object: pearl, mode: 'spin_y', baseValue: 0, amplitude: 0, speed: 1.1, phase: phaseSeed }
      );
      break;
    }

    case 'virgo_astral_lectern': {
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.22, 0.3, 1.15, pal.radialSegs),
        pal.stone
      );
      column.position.y = 0.95;
      const desk = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.12, 0.65), pal.metal);
      desk.position.set(0, 1.56, 0);
      desk.rotation.x = 0.34;
      const tome = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.09, 0.48), pal.stone);
      tome.position.set(0, 1.66, 0.02);
      tome.rotation.x = 0.34;
      const sigil = new THREE.Mesh(
        new THREE.TorusGeometry(0.32, 0.04, 6, pal.torusSegs),
        pal.crystal
      );
      sigil.position.y = 2.25;
      root.add(column, desk, tome, sigil);
      animNodes.push({
        object: sigil,
        mode: 'spin_y',
        baseValue: 0,
        amplitude: 0,
        speed: 0.9,
        phase: phaseSeed,
      });
      break;
    }

    case 'libra_crystal_scale_post': {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.18, 0.28, 1.65, pal.radialSegs),
        pal.stone
      );
      post.position.y = 1.2;
      const armGroup = new THREE.Group();
      armGroup.position.y = 2.02;
      const bar = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.08, 0.1), pal.metal);
      const crystalL = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), pal.crystal);
      crystalL.position.set(-0.58, -0.34, 0);
      const crystalR = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), pal.crystal);
      crystalR.position.set(0.58, -0.34, 0);
      armGroup.add(bar, crystalL, crystalR);
      root.add(post, armGroup);
      animNodes.push({
        object: armGroup,
        mode: 'sway_z',
        baseValue: 0,
        amplitude: 0.14,
        speed: 1.25,
        phase: phaseSeed,
      });
      break;
    }

    case 'scorpio_obsidian_censer': {
      const tripod = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.48, 0.95, 6),
        pal.stone
      );
      tripod.position.y = 0.85;
      const bowl = new THREE.Mesh(
        new THREE.CylinderGeometry(0.62, 0.34, 0.42, pal.radialSegs),
        pal.metal
      );
      bowl.position.y = 1.5;
      const ember = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 0), pal.crystal);
      ember.position.y = 1.98;
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(0.58, 0.05, 6, pal.torusSegs),
        pal.metal
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.y = 1.7;
      root.add(tripod, bowl, rim, ember);
      animNodes.push({
        object: ember,
        mode: 'pulse_scale',
        baseValue: 1.0,
        amplitude: 0.12,
        speed: 2.1,
        phase: phaseSeed,
      });
      break;
    }

    case 'sagittarius_star_quiver_rack': {
      const rackStand = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.35, 0.22), pal.stone);
      rackStand.position.y = 1.05;
      const crossbar = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.12, 0.28), pal.metal);
      crossbar.position.y = 1.72;
      const arrowGroup = new THREE.Group();
      arrowGroup.position.y = 1.65;
      for (const offset of [-0.26, 0, 0.26]) {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1.4, 6), pal.metal);
        shaft.position.set(offset, 0.15, 0.18);
        shaft.rotation.z = offset * 0.55;
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.28, 4), pal.crystal);
        tip.position.set(offset - offset * 0.25, 0.92, 0.18);
        tip.rotation.z = offset * 0.55;
        arrowGroup.add(shaft, tip);
      }
      root.add(rackStand, crossbar, arrowGroup);
      animNodes.push({
        object: arrowGroup,
        mode: 'bob_y',
        baseValue: 1.65,
        amplitude: 0.06,
        speed: 1.6,
        phase: phaseSeed,
      });
      break;
    }

    case 'capricorn_glacial_stele': {
      const slab = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.95, 0.34), pal.stone);
      slab.position.y = 1.35;
      const crest = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.55, 4), pal.metal);
      crest.position.y = 2.58;
      const runeShard = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), pal.crystal);
      runeShard.position.set(0, 1.55, 0.28);
      const collar = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.12, 0.42), pal.metal);
      collar.position.y = 2.3;
      root.add(slab, collar, crest, runeShard);
      animNodes.push({
        object: runeShard,
        mode: 'spin_y',
        baseValue: 0,
        amplitude: 0,
        speed: 0.95,
        phase: phaseSeed,
      });
      break;
    }

    case 'aquarius_hydro_conduit': {
      const basin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.68, 0.48, 0.52, pal.radialSegs),
        pal.stone
      );
      basin.position.y = 0.64;
      const conduitRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.54, 0.06, 6, pal.torusSegs),
        pal.metal
      );
      conduitRing.position.y = 1.62;
      const coreStream = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.24, 1.25, pal.radialSegs),
        pal.crystal
      );
      coreStream.position.y = 1.48;
      const orbTop = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), pal.crystal);
      orbTop.position.y = 2.28;
      root.add(basin, conduitRing, coreStream, orbTop);
      animNodes.push(
        { object: conduitRing, mode: 'orbit_tilt', baseValue: 0.35, amplitude: 0.22, speed: 1.1, phase: phaseSeed },
        { object: orbTop, mode: 'bob_y', baseValue: 2.28, amplitude: 0.1, speed: 1.8, phase: phaseSeed }
      );
      break;
    }

    case 'pisces_pearl_arch': {
      for (const side of [-1, 1]) {
        const post = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.2, 1.55, pal.radialSegs),
          pal.stone
        );
        post.position.set(side * 0.52, 1.15, 0);
        root.add(post);
      }
      const arch = new THREE.Mesh(
        new THREE.TorusGeometry(0.56, 0.08, 6, pal.torusSegs, Math.PI),
        pal.metal
      );
      arch.position.y = 1.9;
      const pearlCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.26, 0), pal.crystal);
      pearlCore.position.y = 1.48;
      root.add(arch, pearlCore);
      animNodes.push(
        { object: pearlCore, mode: 'bob_y', baseValue: 1.48, amplitude: 0.1, speed: 1.5, phase: phaseSeed },
        { object: pearlCore, mode: 'spin_y', baseValue: 0, amplitude: 0, speed: 1.0, phase: phaseSeed }
      );
      break;
    }
  }

  return root;
}

/**
 * Builds symmetrical outer-flank 3D environmental storytelling relic shrines for Chapters 5–12.
 * - Chapters 1–4 return `null`.
 * - Strictly 0 THREE.PointLight instances, roughness contrast >= 0.25 (stone 0.84 vs metal 0.26),
 *   bottom-center grounded with radial contact shadow disc, automatic Lite vertex reduction.
 */
export function buildZodiacStorytellingProps(params: {
  chapterId: number;
  trimHex: number;
  stoneHex: number;
  arenaHalfW: number;
  arenaHalfD: number;
  liteActive: boolean;
}): BuiltZodiacStorytellingProps | null {
  const spec = getZodiacStoryPropSpec(params.chapterId);
  if (!spec) return null;

  const stoneRoughness = 0.84;
  const metalRoughness = 0.26;

  const pal: StoryPropPalette = {
    stone: new THREE.MeshStandardMaterial({
      color: params.stoneHex,
      roughness: stoneRoughness,
      metalness: 0.08,
    }),
    metal: new THREE.MeshStandardMaterial({
      color: 0xfcd34d,
      roughness: metalRoughness,
      metalness: 0.86,
    }),
    crystal: new THREE.MeshStandardMaterial({
      color: spec.accentHex,
      emissive: params.trimHex,
      emissiveIntensity: params.liteActive ? 0.72 : 1.15,
      roughness: 0.22,
      metalness: 0.2,
    }),
    shadowDisc: new THREE.MeshBasicMaterial({
      color: 0x050814,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
    }),
    radialSegs: params.liteActive ? 6 : 10,
    torusSegs: params.liteActive ? 10 : 18,
  };

  const group = new THREE.Group();
  group.name = `ZodiacStoryProps_Ch${spec.chapterId}_${spec.zodiacId}`;
  const animNodes: ZodiacLandmarkAnimNode[] = [];

  const flankX = params.arenaHalfW + 2.35;
  const flankZ = params.arenaHalfD * 0.34;

  const westProp = buildSingleStoryProp(spec, pal, animNodes, 0.35);
  westProp.position.set(-flankX, 0, flankZ);
  westProp.rotation.y = Math.PI * 0.22;

  const eastProp = buildSingleStoryProp(spec, pal, animNodes, Math.PI * 0.9);
  eastProp.position.set(flankX, 0, flankZ);
  eastProp.rotation.y = -Math.PI * 0.22;

  group.add(westProp, eastProp);

  let meshCount = 0;
  let pointLightCount = 0;
  let totalVertexCount = 0;
  group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (mesh.isMesh) {
      meshCount += 1;
      const posAttr = mesh.geometry?.getAttribute?.('position');
      if (posAttr) totalVertexCount += posAttr.count;
    }
    if ((obj as THREE.PointLight).isPointLight) pointLightCount += 1;
  });

  return {
    spec,
    group,
    animNodes,
    meshCount,
    pointLightCount,
    stoneRoughness,
    metalRoughness,
    totalVertexCount,
  };
}

export function stepZodiacStorytellingProps(
  props: BuiltZodiacStorytellingProps | null | undefined,
  elapsed: number,
  reducedMotion = false
): void {
  if (!props) return;
  stepZodiacRealmLandmarks(props.animNodes, elapsed, reducedMotion);
}

export function disposeZodiacStorytellingProps(
  props: BuiltZodiacStorytellingProps | null | undefined
): void {
  if (!props) return;
  const disposedMats = new Set<THREE.Material>();
  props.group.traverse((obj) => {
    const mesh = obj as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.geometry?.dispose();
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const m of mats) {
      if (m && !disposedMats.has(m)) {
        disposedMats.add(m);
        m.dispose();
      }
    }
  });
}



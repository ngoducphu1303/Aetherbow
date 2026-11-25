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

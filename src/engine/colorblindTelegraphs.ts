import type { TelegraphShapeKind } from '../types/game';

/**
 * Colorblind-Safe Geometric Telegraph Resolver (Criterion 27: Accessibility)
 * Ensures floor danger warnings NEVER rely on color hue alone by pairing
 * high-contrast Deuteranopia/Protanopia/Tritanopia-safe tones with distinct
 * geometric floor patterns:
 *  - aoe_ring       : Double concentric ring + radial cardinal ticks
 *  - charge_lane    : Dashed chevron lane arrows pointing along dash vector
 *  - beam_reticle   : Crosshair reticle lines intersecting target point
 *  - interrupt_halo : Octagonal break-halo warning players they can Interrupt ("Ngắt Chiêu")
 */

export interface GeometricTelegraphSpec {
  shape: TelegraphShapeKind;
  primaryHex: number;
  secondaryHex: number;
  accentHex: number;
  useDoubleRing: boolean;
  chevronCount: number;
  crosshairArms: boolean;
  octagonSegments: number;
  labelBadge: string;
}

export function resolveGeometricTelegraphSpec(
  shape: TelegraphShapeKind,
  colorblindOrHighContrast: boolean
): GeometricTelegraphSpec {
  if (shape === 'interrupt_halo') {
    return {
      shape,
      primaryHex: colorblindOrHighContrast ? 0x38bdf8 : 0xfbbf24,
      secondaryHex: colorblindOrHighContrast ? 0xfef08a : 0xf97316,
      accentHex: 0xffffff,
      useDoubleRing: true,
      chevronCount: 0,
      crosshairArms: true,
      octagonSegments: 8,
      labelBadge: 'NGẮT CHIÊU',
    };
  }

  if (shape === 'charge_lane') {
    return {
      shape,
      primaryHex: colorblindOrHighContrast ? 0x0ea5e9 : 0xf97316,
      secondaryHex: colorblindOrHighContrast ? 0xfacc15 : 0xfde047,
      accentHex: 0xffffff,
      useDoubleRing: false,
      chevronCount: 3,
      crosshairArms: false,
      octagonSegments: 0,
      labelBadge: 'LAO HÚC',
    };
  }

  if (shape === 'beam_reticle') {
    return {
      shape,
      primaryHex: colorblindOrHighContrast ? 0xfacc15 : 0xef4444,
      secondaryHex: colorblindOrHighContrast ? 0x38bdf8 : 0xfb7185,
      accentHex: 0xffffff,
      useDoubleRing: false,
      chevronCount: 0,
      crosshairArms: true,
      octagonSegments: 0,
      labelBadge: 'TIA XUYÊN',
    };
  }

  // Default: aoe_ring
  return {
    shape: 'aoe_ring',
    primaryHex: colorblindOrHighContrast ? 0x0284c7 : 0xef4444,
    secondaryHex: colorblindOrHighContrast ? 0xfde047 : 0xf97316,
    accentHex: 0xffffff,
    useDoubleRing: true,
    chevronCount: 0,
    crosshairArms: false,
    octagonSegments: 24,
    labelBadge: 'NỔ DIỆN RỘNG',
  };
}

import type { TelegraphShapeKind } from '../types/game';

export interface GeometricTelegraphSpec {
  shape: TelegraphShapeKind;
  primaryHex: number;
  secondaryHex: number;
  accentHex: number;
  useDoubleRing: boolean;
  polygonSides: number;
  chevronCount: number;
  crosshairArms: boolean;
  octagonSegments: number;
  labelBadge: string;
}

export function resolveGeometricTelegraphSpec(
  shape: TelegraphShapeKind,
  colorblindSafe: boolean
): GeometricTelegraphSpec {
  if (colorblindSafe) {
    switch (shape) {
      case 'beam_reticle':
        return {
          shape,
          primaryHex: 0xf59e0b,
          secondaryHex: 0xfef08a,
          accentHex: 0xffffff,
          useDoubleRing: false,
          polygonSides: 6,
          chevronCount: 0,
          crosshairArms: true,
          octagonSegments: 0,
          labelBadge: 'TIA NĂNG LƯỢNG',
        };
      case 'charge_lane':
        return {
          shape,
          primaryHex: 0x38bdf8,
          secondaryHex: 0xbae6fd,
          accentHex: 0xfef08a,
          useDoubleRing: true,
          polygonSides: 4,
          chevronCount: 4,
          crosshairArms: false,
          octagonSegments: 0,
          labelBadge: 'LAO TỚI',
        };
      case 'interrupt_halo':
        return {
          shape,
          primaryHex: 0xe879f9,
          secondaryHex: 0xfef08a,
          accentHex: 0xffffff,
          useDoubleRing: true,
          polygonSides: 8,
          chevronCount: 0,
          crosshairArms: false,
          octagonSegments: 8,
          labelBadge: 'NGẮT CHIÊU',
        };
      default:
        return {
          shape: 'aoe_ring',
          primaryHex: 0xf97316,
          secondaryHex: 0xfde047,
          accentHex: 0xffffff,
          useDoubleRing: true,
          polygonSides: 8,
          chevronCount: 0,
          crosshairArms: false,
          octagonSegments: 0,
          labelBadge: 'VÙNG NGUY HIỂM',
        };
    }
  }

  switch (shape) {
    case 'beam_reticle':
      return {
        shape,
        primaryHex: 0xf43f5e,
        secondaryHex: 0xfda4af,
        accentHex: 0xfef08a,
        useDoubleRing: false,
        polygonSides: 6,
        chevronCount: 0,
        crosshairArms: true,
        octagonSegments: 0,
        labelBadge: 'TIA NĂNG LƯỢNG',
      };
    case 'charge_lane':
      return {
        shape,
        primaryHex: 0xef4444,
        secondaryHex: 0xfb923c,
        accentHex: 0xfef08a,
        useDoubleRing: false,
        polygonSides: 4,
        chevronCount: 3,
        crosshairArms: false,
        octagonSegments: 0,
        labelBadge: 'LAO TỚI',
      };
    case 'interrupt_halo':
      return {
        shape,
        primaryHex: 0xc026d3,
        secondaryHex: 0xf43f5e,
        accentHex: 0x38bdf8,
        useDoubleRing: true,
        polygonSides: 8,
        chevronCount: 0,
        crosshairArms: false,
        octagonSegments: 8,
        labelBadge: 'NGẮT CHIÊU',
      };
    default:
      return {
        shape: 'aoe_ring',
        primaryHex: 0xe11d48,
        secondaryHex: 0xfb7185,
        accentHex: 0xfef08a,
        useDoubleRing: false,
        polygonSides: 16,
        chevronCount: 0,
        crosshairArms: false,
        octagonSegments: 0,
        labelBadge: 'VÙNG NGUY HIỂM',
      };
  }
}

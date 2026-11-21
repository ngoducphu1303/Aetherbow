export interface CameraSightlineTarget {
  lookX: number;
  lookZ: number;
  camZBias: number;
}

export interface TraumaShakeOffset {
  offsetX: number;
  offsetY: number;
  rollZ: number;
}

export interface ProjectedHudPoint {
  visible: boolean;
  x: number;
  y: number;
}

/**
 * Converts Three.js horizontal facing yaw (`Math.atan2(dx, dz)`) to clockwise
 * CSS degrees where 0deg points North (-Z, top of minimap) and 90deg points East (+X).
 */
export function yawToRadarDegrees(yawRad: number): number {
  const raw = 180 - (yawRad * 180) / Math.PI;
  const normalized = ((raw % 360) + 360) % 360;
  return Math.round(normalized * 10) / 10;
}

/**
 * Computes a tactical ARPG camera lookAt point that gently leads toward the active
 * enemy or boss so both Artemis and incoming telegraphs sit in the viewport sweet spot.
 */
export function computeCameraSightline(
  playerX: number,
  playerZ: number,
  targetX: number,
  targetZ: number,
  hasTarget: boolean,
  isBossTarget = false
): CameraSightlineTarget {
  let leadX = 0;
  let leadZ = 0;
  if (hasTarget) {
    const weight = isBossTarget ? 0.24 : 0.18;
    leadX = Math.max(-2.1, Math.min(2.1, (targetX - playerX) * weight));
    leadZ = Math.max(-2.6, Math.min(1.6, (targetZ - playerZ) * weight));
  }

  const lookX = Math.max(-4.5, Math.min(4.5, playerX * 0.45 + leadX));
  const lookZ = Math.max(-8.2, Math.min(6.5, playerZ * 0.72 - 1.55 + leadZ));
  const camZBias = hasTarget ? Math.max(-1.4, Math.min(0.8, leadZ * 0.45)) : 0;

  return { lookX, lookZ, camZBias };
}

/**
 * Quadratic trauma^2 camera shake with deterministic high-frequency harmonic roll
 * so heavy hits feel cinematic and punchy without harsh single-frame noise snaps.
 */
export function computeTraumaShake(trauma: number, elapsed: number): TraumaShakeOffset {
  const t = Math.max(0, Math.min(1, trauma));
  if (t <= 0.005) {
    return { offsetX: 0, offsetY: 0, rollZ: 0 };
  }
  const sq = t * t;
  const offsetX = Math.sin(elapsed * 53.7) * 0.58 * sq + Math.cos(elapsed * 89.3) * 0.24 * sq;
  const offsetY = Math.cos(elapsed * 61.1) * 0.44 * sq + Math.sin(elapsed * 97.1) * 0.18 * sq;
  const rollZ = Math.sin(elapsed * 43.9) * 0.022 * sq;
  return { offsetX, offsetY, rollZ };
}

/**
 * Projects normalized device coordinates to clamped HUD pixels with a strict
 * camera frustum Z guard and alternating left/right flank separation so damage
 * text clears the monster/boss silhouette directly ahead.
 */
export function projectFloatingScreenPos(
  ndcX: number,
  ndcY: number,
  ndcZ: number,
  viewportW: number,
  viewportH: number,
  salt = 0
): ProjectedHudPoint {
  if (ndcZ < -1 || ndcZ > 1 || viewportW <= 0 || viewportH <= 0) {
    return { visible: false, x: 0, y: 0 };
  }
  const side = salt % 2 === 0 ? 1 : -1;
  const lane = (Math.abs(salt) * 7) % 4;
  const jitterX = side * (22 + lane * 7);
  const jitterY = (((salt * 19) % 5) - 2) * 3.2 - 6;
  const rawX = ((ndcX + 1) / 2) * viewportW + jitterX;
  const rawY = ((-ndcY + 1) / 2) * viewportH + jitterY;
  const padX = Math.min(44, viewportW * 0.08);
  const padY = Math.min(54, viewportH * 0.1);
  return {
    visible: true,
    x: Math.max(padX, Math.min(viewportW - padX, rawX)),
    y: Math.max(padY, Math.min(viewportH - padY, rawY)),
  };
}

export interface PresentedFloatingDamage {
  id: number;
  x: number;
  y: number;
  amount: number;
  isCrit: boolean;
  isSuperCrit?: boolean;
  isHeal?: boolean;
  label?: string;
  element?: 'fire' | 'ice' | 'storm' | 'poison' | 'playerHit';
  compactLabel?: string;
  denseMode: boolean;
}

const DENSE_STATUS_LABEL_MAP: Record<string, string> = {
  'TAN CHẢY!': 'Chảy',
  'ĐÓNG BĂNG!': 'Băng',
  'QUÁ TẢI!': 'Sét',
  'TRÚNG ĐỘC!': 'Độc',
  'PHẢN ỨNG!': 'C.Hưởng',
  'PHÁ GIÁP!': 'Phá Giáp',
  'XUYÊN GIÁP!': 'Xuyên',
  'NÉ HOÀN HẢO': 'Né!',
};

/**
 * Scales down, shortens long status labels, pushes flanks outward, and trims
 * low-priority normal ticks when many enemies or simultaneous numbers are active.
 */
export function resolveFloatingNumberPresentation(
  damages: ReadonlyArray<{
    id: number;
    x: number;
    y: number;
    amount: number;
    isCrit: boolean;
    isSuperCrit?: boolean;
    isHeal?: boolean;
    label?: string;
    element?: 'fire' | 'ice' | 'storm' | 'poison' | 'playerHit';
  }>,
  enemiesRemaining: number,
  compactHud = false
): PresentedFloatingDamage[] {
  const denseMode = compactHud || enemiesRemaining >= 4 || damages.length >= 6;
  const veryDense = compactHud || enemiesRemaining >= 7 || damages.length >= 10;

  let filtered = damages;
  if (veryDense) {
    // Keep all crits, super-crits, heals, player hits, and every 2nd normal hit (capped at 10)
    filtered = damages.filter(
      (d, idx) =>
        d.isSuperCrit ||
        d.isCrit ||
        d.isHeal ||
        d.element === 'playerHit' ||
        (Boolean(d.label) && !compactHud) ||
        idx % 2 === 0
    );
  }
  const capped = filtered.slice(veryDense ? -10 : -14);

  return capped.map((d) => {
    const side = d.id % 2 === 0 ? 1 : -1;
    const extraPush = denseMode ? side * (12 + (d.id % 3) * 6) : 0;
    const rawLabel = d.label?.trim();
    const mappedLabel = rawLabel && denseMode ? DENSE_STATUS_LABEL_MAP[rawLabel] ?? rawLabel : rawLabel;
    return {
      ...d,
      x: d.x + extraPush,
      y: denseMode ? d.y - (d.id % 3) * 4 : d.y,
      compactLabel: mappedLabel,
      denseMode,
    };
  });
}

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

const COMPACT_STATUS_LABEL_MAP: Record<string, string> = {
  'TAN CHẢY!': 'Chảy',
  'ĐÓNG BĂNG!': 'Băng',
  'QUÁ TẢI!': 'Sét',
  'TRÚNG ĐỘC!': 'Độc',
  'PHẢN ỨNG!': 'C.Hưởng',
  'SIÊU DẪN!': 'Siêu Dẫn',
  'PHÁ GIÁP!': 'Phá Giáp',
  'XUYÊN GIÁP!': 'Xuyên',
  'NÉ HOÀN HẢO': 'Né!',
  'PHẢN ĐÒN CHUYỂN PHA!': 'Phản Pha',
  'PHẢN ĐÒN TỐI THƯỢNG!': 'Phản Đòn',
  'PHẢN ĐÒN!': 'Phản Đòn',
  'PHẢN KÍCH HOÀNG KIM!': 'Phản Kích',
  'PHẢN TIỄN TINH QUANG!': 'Phản Tiễn',
  'VỠ SỪNG HỘ GIÁP!': 'Vỡ Sừng',
  'VỠ HỘ THUẪN!': 'Vỡ Khiên',
  'VỠ HỘ THUẪN AI!': 'Vỡ Khiên',
  'VỠ TRỤ HỘ THUẪN!': 'Vỡ Trụ',
  'KÍCH NỔ CỐT LÕI CỔ NGỮ!': 'Nổ Cổ Ngữ',
  'KÍCH NỔ MÔI TRƯỜNG!': 'Nổ Đ.Hình',
  'TAM NGUYÊN HỢP KÍCH!': 'Tam Nguyên',
  'PHÁ GIÁP TRẢM!': 'Phá Trảm',
  'KẾT LIỄU TINH GIỚI!': 'Kết Liễu',
  'CUỒNG NỘ BẠO PHÁT!': 'Cuồng Nộ',
  'CUỒNG NỘ PHASE 2!': 'Pha II',
  'CHOÁNG ĐẬP TRỤ!': 'Choáng Trụ',
  'CHOÁNG ĐẬP TƯỜNG!': 'Choáng',
  'KHÁNG CHOÁNG!': 'Kháng CC',
  'XUNG KÍCH THỨC TỈNH!': 'Thức Tỉnh',
  'THẦN ẤN HỒI PHỤC!': 'Hồi Phục',
  'HỒI PHA LÊ!': 'Hồi Pha Lê',
  'TRỤ PHA LÊ VỠ!': 'Vỡ Trụ',
  'VÒNG HỘ MỆNH!': 'Hộ Mệnh',
  'BẪY HÀN BĂNG!': 'Bẫy Băng',
  'XUNG HƯ KHÔNG!': 'Hư Không',
  'HÀN KHÍ CHẬM!': 'Làm Chậm',
  'SÉT HỖN MANG!': 'Sét Loạn',
  'BẢN ĐỒ GIÔNG!': 'Bão Giông',
};

/**
 * Shortens verbose Vietnamese combat callouts (e.g. "PHẢN ĐÒN CHUYỂN PHA!",
 * "KÍCH NỔ CỐT LÕI CỔ NGỮ!", "VỠ SỪNG HỘ GIÁP!") into crisp <= 12-char tags
 * so floating combat text stays readable without masking Boss silhouettes.
 */
export function compactCombatCalloutLabel(rawLabel: string | undefined): string | undefined {
  if (!rawLabel) return undefined;
  const trimmed = rawLabel.trim();
  if (!trimmed) return undefined;

  const upper = trimmed.toUpperCase();
  const mapped = COMPACT_STATUS_LABEL_MAP[upper];
  if (mapped) return mapped;

  const cleaned = trimmed.replace(/!+$/g, '').trim();
  if (/^KÍCH NỔ\s+/i.test(cleaned)) {
    const rest = cleaned.replace(/^KÍCH NỔ\s+/i, '').split(/\s+/).slice(0, 2).join(' ');
    const compact = `Nổ ${rest}`;
    return compact.length <= 12 ? compact : `${compact.slice(0, 11)}…`;
  }
  if (/^VỠ\s+/i.test(cleaned)) {
    const words = cleaned.split(/\s+/).slice(0, 2).join(' ');
    return words.length <= 12 ? words : `${words.slice(0, 11)}…`;
  }
  if (cleaned.length <= 12) {
    return cleaned;
  }
  const words = cleaned.split(/\s+/);
  if (words.length >= 2) {
    const twoWords = `${words[0]} ${words[1]}`;
    if (twoWords.length <= 12) return twoWords;
  }
  return `${cleaned.slice(0, 11).trimEnd()}…`;
}

export const MAX_FLOATING_CALLOUT_LABELS = 2;

export interface FloatingPresentationOptions {
  /** Minimum Y pixel below top HUD / Boss bar so text never overlaps top bars. */
  topSafeY?: number;
  /** Maximum simultaneous text-label callout lines allowed on screen (default: 2). */
  maxLabelLines?: number;
}

/**
 * Scales down, shortens long status labels, caps simultaneous text-label callouts
 * to 2 non-overlapping lines, pushes flanks outward away from Boss silhouettes,
 * and resolves 2D collisions so floating combat text never piles up into a wall.
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
  compactHud = false,
  options?: FloatingPresentationOptions
): PresentedFloatingDamage[] {
  const denseMode = compactHud || enemiesRemaining >= 4 || damages.length >= 6;
  const veryDense = compactHud || enemiesRemaining >= 7 || damages.length >= 10;
  const topSafeY = options?.topSafeY ?? (compactHud ? 96 : 118);
  const maxLabelLines = Math.max(0, options?.maxLabelLines ?? MAX_FLOATING_CALLOUT_LABELS);

  let filtered = damages;
  if (veryDense) {
    filtered = damages.filter(
      (d, idx) =>
        d.isSuperCrit ||
        d.isCrit ||
        d.isHeal ||
        d.element === 'playerHit' ||
        Boolean(d.label) ||
        idx % 2 === 0
    );
  }
  const maxItems = compactHud ? 7 : veryDense ? 10 : 12;
  const capped = filtered.slice(-maxItems);

  // Enforce hard cap on simultaneous text-label callouts (newest/most impactful keep text;
  // excess labeled hits degrade to clean numeric ticks or drop if amount === 0).
  const keepLabelIds = new Set<number>();
  const labeledIndices: number[] = [];
  for (let i = capped.length - 1; i >= 0; i--) {
    if (capped[i].label && capped[i].label!.trim().length > 0) {
      labeledIndices.push(i);
    }
  }
  // Prefer super-crit / crit labeled callouts while keeping chronological recency
  labeledIndices.sort((ia, ib) => {
    const a = capped[ia];
    const b = capped[ib];
    const scoreA = (a.isSuperCrit ? 2 : a.isCrit ? 1 : 0) * 1000 + ia;
    const scoreB = (b.isSuperCrit ? 2 : b.isCrit ? 1 : 0) * 1000 + ib;
    return scoreB - scoreA;
  });
  for (let k = 0; k < Math.min(maxLabelLines, labeledIndices.length); k++) {
    keepLabelIds.add(capped[labeledIndices[k]].id);
  }

  const draft: PresentedFloatingDamage[] = [];
  for (const d of capped) {
    const rawLabel = d.label?.trim();
    const hasLabel = Boolean(rawLabel);
    const keepLabel = hasLabel && keepLabelIds.has(d.id);

    // Drop pure-text spam beyond the 2-line cap if it has no damage amount
    if (hasLabel && !keepLabel && d.amount <= 0) {
      continue;
    }

    const side = d.id % 2 === 0 ? 1 : -1;
    const basePush = keepLabel
      ? side * (compactHud ? 44 : 38)
      : denseMode
      ? side * (16 + (d.id % 3) * 8)
      : side * 8;

    const compactLabel = keepLabel ? compactCombatCalloutLabel(rawLabel) : undefined;
    draft.push({
      ...d,
      x: d.x + basePush,
      y: Math.max(topSafeY, denseMode ? d.y - (d.id % 3) * 4 : d.y),
      compactLabel,
      denseMode,
    });
  }

  // 2D Anti-Overlap Slot Separation: place labeled lines first so they get clean distinct rows
  const placed: Array<{ x: number; y: number; halfW: number; halfH: number }> = [];
  const labelOrder = draft
    .map((item, idx) => ({ item, idx }))
    .sort((a, b) => Number(Boolean(b.item.compactLabel)) - Number(Boolean(a.item.compactLabel)));

  const resolved: PresentedFloatingDamage[] = new Array(draft.length);

  for (const { item, idx } of labelOrder) {
    const isLabeled = Boolean(item.compactLabel);
    const halfW = isLabeled ? 58 : 24;
    const halfH = isLabeled ? 11 : 9;
    const stepY = isLabeled ? 22 : 18;

    let px = item.x;
    let py = Math.max(topSafeY, item.y);

    const collides = (cx: number, cy: number): boolean => {
      for (const box of placed) {
        if (Math.abs(cx - box.x) < halfW + box.halfW && Math.abs(cy - box.y) < halfH + box.halfH) {
          return true;
        }
      }
      return false;
    };

    if (collides(px, py)) {
      // Try clean vertical & opposite-flank candidate slots
      const altSideX = px + (item.id % 2 === 0 ? -84 : 84);
      const candidates: Array<[number, number]> = [
        [px, py + stepY],
        [px, Math.max(topSafeY, py - stepY)],
        [altSideX, py],
        [px, py + stepY * 2],
        [altSideX, py + stepY],
        [px, py + stepY * 3],
        [altSideX, py + stepY * 2],
      ];
      for (const [cx, cy] of candidates) {
        const clampedCy = Math.max(topSafeY, cy);
        if (!collides(cx, clampedCy)) {
          px = cx;
          py = clampedCy;
          break;
        }
      }
    }

    placed.push({ x: px, y: py, halfW, halfH });
    resolved[idx] = {
      ...item,
      x: px,
      y: py,
    };
  }

  return resolved;
}

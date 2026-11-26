import * as THREE from 'three';
import type {
  CombatAudioCaptionCue,
  CombatAudioCaptionKind,
} from '../types/game';

/**
 * Wave 16 — 12-Zodiac Boss Entrance Choreography, 3D Celestial Portal Waypoint Arch,
 * and Hearing-Impaired Combat Audio Captions Queue.
 *
 * Strictly Dell Latitude E5430 safe:
 *  - 0 PointLights (emissive + MeshStandardMaterial roughness contrast only)
 *  - Zero-GC 60Hz hot paths via reusable scratch objects
 *  - Automatic Lite vertex reduction & full GPU dispose()
 */

// ============================================================================
// 1. 12-ZODIAC BOSS ENTRANCE CHOREOGRAPHY (CH.1–12)
// ============================================================================

export interface ZodiacBossEntranceProfile {
  chapterId: number;
  zodiacTitle: string;
  bossName: string;
  epithet: string;
  entranceCallout: string;
  counterplayHint: string;
  accentHex: string;
  accentColor: number;
  dropHeight: number;
  entranceDurationSec: number;
  overlayDurationSec: number;
}

export interface BossEntrancePoseScratch {
  active: boolean;
  progress: number;
  yOffset: number;
  scaleY: number;
  scaleXZ: number;
  regaliaFlare: number;
  cameraFocusWeight: number;
}

export function createBossEntrancePoseScratch(): BossEntrancePoseScratch {
  return {
    active: false,
    progress: 1,
    yOffset: 0,
    scaleY: 1,
    scaleXZ: 1,
    regaliaFlare: 0,
    cameraFocusWeight: 0,
  };
}

export const ZODIAC_BOSS_ENTRANCE_PROFILES: Readonly<
  Record<number, ZodiacBossEntranceProfile>
> = {
  1: {
    chapterId: 1,
    zodiacTitle: 'CHƯƠNG 1 · SƯ TỬ THÁI DƯƠNG',
    bossName: 'Sư Vương Thái Dương',
    epithet: 'Chúa Tể Thánh Điện Nhật Luân',
    entranceCallout: 'Ánh dương thiêu đốt bầu trời — Sư Vương giáng lâm!',
    counterplayHint: 'Kích hoạt Trụ Nhật Luân & cắt chiêu (E/Q) khi vòng tụ khí sáng.',
    accentHex: '#f5b83d',
    accentColor: 0xf5b83d,
    dropHeight: 3.4,
    entranceDurationSec: 0.9,
    overlayDurationSec: 1.8,
  },
  2: {
    chapterId: 2,
    zodiacTitle: 'CHƯƠNG 2 · BẠCH DƯƠNG HỎA SƠN',
    bossName: 'Hỏa Dương Chiến Vương',
    epithet: 'Đồ Tể Lò Rèn Sừng Đỏ',
    entranceCallout: 'Mặt đất rạn nứt — Hỏa Dương Chiến Vương xung kích!',
    counterplayHint: 'Lướt vuông góc 90° khi Boss lao húc để mở Phản Tiễn.',
    accentHex: '#fb7185',
    accentColor: 0xfb7185,
    dropHeight: 3.6,
    entranceDurationSec: 0.9,
    overlayDurationSec: 1.8,
  },
  3: {
    chapterId: 3,
    zodiacTitle: 'CHƯƠNG 3 · KIM NGƯU NGỌC LỤC BẢO',
    bossName: 'Địa Thần Kim Ngưu',
    epithet: 'Hộ Vệ Thánh Địa Ngọc Lục Bảo',
    entranceCallout: 'Địa chấn nổi lên — Địa Thần Kim Ngưu trấn giữ thánh đàn!',
    counterplayHint: 'Dùng Phá Giáp (F) xuyên vỏ ngọc & phá trụ tinh thể để hồi HP.',
    accentHex: '#10b981',
    accentColor: 0x10b981,
    dropHeight: 3.2,
    entranceDurationSec: 0.9,
    overlayDurationSec: 1.8,
  },
  4: {
    chapterId: 4,
    zodiacTitle: 'CHƯƠNG 4 · SONG TỬ ẢO ẢNH',
    bossName: 'Thần Vương Song Tử',
    epithet: 'Chủ Nhân Song Thành Thiên Kính',
    entranceCallout: 'Không gian phân đôi — Thần Vương Song Tử hiện hình!',
    counterplayHint: 'Giữ cự ly trung bình đọc khe hở song đạn và dọn phân thân sớm.',
    accentHex: '#38bdf8',
    accentColor: 0x38bdf8,
    dropHeight: 3.5,
    entranceDurationSec: 0.9,
    overlayDurationSec: 1.8,
  },
  5: {
    chapterId: 5,
    zodiacTitle: 'CHƯƠNG 5 · CỰ GIẢI NGUYỆT TRIỀU',
    bossName: 'Nguyệt Triều Cự Giải',
    epithet: 'Giám Hộ San Hô Bán Nguyệt',
    entranceCallout: 'Thủy triều dâng cao — Giáp san hô bất hoại trỗi dậy!',
    counterplayHint: 'Chờ Boss mở mai sau sóng triều rồi dồn Phá Giáp (F).',
    accentHex: '#22d3ee',
    accentColor: 0x22d3ee,
    dropHeight: 3.1,
    entranceDurationSec: 0.9,
    overlayDurationSec: 1.8,
  },
  6: {
    chapterId: 6,
    zodiacTitle: 'CHƯƠNG 6 · XỬ NỮ THÁNH KIẾM',
    bossName: 'Thánh Nữ Tinh Khiết',
    epithet: 'Kiếm Sư Đài Gương Bạch Kim',
    entranceCallout: 'Kiếm trận tinh tú khai mở — Thanh tẩy bắt đầu!',
    counterplayHint: 'Xoay vòng lách khỏi đường kiếm hình học và ngắt tụ lực hoa thánh.',
    accentHex: '#e2e8f0',
    accentColor: 0xe2e8f0,
    dropHeight: 3.6,
    entranceDurationSec: 0.9,
    overlayDurationSec: 1.8,
  },
  7: {
    chapterId: 7,
    zodiacTitle: 'CHƯƠNG 7 · THIÊN BÌNH THẨM PHÁN',
    bossName: 'Chấp Pháp Thiên Bình',
    epithet: 'Phán Quan Cán Cân Ánh Sáng',
    entranceCallout: 'Cán cân nghiêng xuống — Bản án tinh giới được tuyên!',
    counterplayHint: 'Đứng vào nửa sàn an toàn trước khi đường chia đôi khóa mục tiêu.',
    accentHex: '#facc15',
    accentColor: 0xfacc15,
    dropHeight: 3.4,
    entranceDurationSec: 0.9,
    overlayDurationSec: 1.8,
  },
  8: {
    chapterId: 8,
    zodiacTitle: 'CHƯƠNG 8 · THIÊN YẾT VỰC SÂU',
    bossName: 'Độc Đế Thiên Yết',
    epithet: 'Sát Thủ Đầm Độc Tinh Vân',
    entranceCallout: 'Màn sương tím khép kín — Độc Đế rình rập từ bóng tối!',
    counterplayHint: 'Giữ Lướt (Space) để né cú dịch chuyển sau lưng và kích Phản Tiễn.',
    accentHex: '#c084fc',
    accentColor: 0xc084fc,
    dropHeight: 3.3,
    entranceDurationSec: 0.9,
    overlayDurationSec: 1.8,
  },
  9: {
    chapterId: 9,
    zodiacTitle: 'CHƯƠNG 9 · NHÂN MÃ TINH HÀ',
    bossName: 'Xạ Thần Nhân Mã',
    epithet: 'Thiện Xạ Cung Ngân Hà',
    entranceCallout: 'Dây cung ngân hà kéo căng — Mưa tiễn tinh tú giáng xuống!',
    counterplayHint: 'Áp sát theo góc chéo & ngắt mũi tên tụ lực bằng (E/Q).',
    accentHex: '#fb923c',
    accentColor: 0xfb923c,
    dropHeight: 3.7,
    entranceDurationSec: 0.9,
    overlayDurationSec: 1.8,
  },
  10: {
    chapterId: 10,
    zodiacTitle: 'CHƯƠNG 10 · MA KẾT BĂNG SƠN',
    bossName: 'Sơn Thần Ma Kết',
    epithet: 'Đế Vương Đỉnh Băng Cổ Đại',
    entranceCallout: 'Bão tuyết gào thét — Sơn Thần Ma Kết giáng đỉnh băng!',
    counterplayHint: 'Phá trụ băng phòng thủ & dùng Tuyệt Kỹ (Q) cắt bão tuyết Pha III.',
    accentHex: '#60a5fa',
    accentColor: 0x60a5fa,
    dropHeight: 3.4,
    entranceDurationSec: 0.9,
    overlayDurationSec: 1.8,
  },
  11: {
    chapterId: 11,
    zodiacTitle: 'CHƯƠNG 11 · BẢO BÌNH TINH VÂN',
    bossName: 'Lôi Đế Bảo Bình',
    epithet: 'Chúa Tể Lốc Xoáy Tinh Giới',
    entranceCallout: 'Lốc xoáy năng lượng hội tụ — Lôi Đế Bảo Bình giáng thế!',
    counterplayHint: 'Kích hoạt Lăng Kính Tinh Giới để hồi Lướt & di chuyển vòng ngoài.',
    accentHex: '#38bdf8',
    accentColor: 0x38bdf8,
    dropHeight: 3.5,
    entranceDurationSec: 0.9,
    overlayDurationSec: 1.8,
  },
  12: {
    chapterId: 12,
    zodiacTitle: 'CHƯƠNG 12 · SONG NGƯ TINH HẢI',
    bossName: 'Mộng Đế Song Ngư',
    epithet: 'Chúa Tể Vòng Xoáy Tinh Hải',
    entranceCallout: 'Tinh hải xoay chuyển — Chung kết Hoàng Đạo khai màn!',
    counterplayHint: 'Đọc vòng đạn xoắn kép & dồn Phản Đòn trong cửa sổ 2.5s Pha III.',
    accentHex: '#818cf8',
    accentColor: 0x818cf8,
    dropHeight: 3.8,
    entranceDurationSec: 0.9,
    overlayDurationSec: 1.8,
  },
};

export function resolveBossEntranceProfile(chapterId: number): ZodiacBossEntranceProfile {
  const clamped = Math.max(1, Math.min(12, Math.floor(chapterId || 1)));
  return ZODIAC_BOSS_ENTRANCE_PROFILES[clamped] ?? ZODIAC_BOSS_ENTRANCE_PROFILES[1];
}

/**
 * Zero-GC boss entrance animation curve:
 * - [0.00..0.52]: Heroic descent from `dropHeight` (cubic ease-in)
 * - [0.52..0.72]: Ground-impact squash & regalia flare
 * - [0.72..1.00]: Elastic settle back to neutral combat stance
 */
export function stepBossEntrancePose(
  elapsedSec: number,
  profile: ZodiacBossEntranceProfile,
  reducedMotion: boolean,
  out: BossEntrancePoseScratch
): BossEntrancePoseScratch {
  const dur = Math.max(0.2, profile.entranceDurationSec);
  const t = Math.max(0, Math.min(1, elapsedSec / dur));
  const motionScale = reducedMotion ? 0.25 : 1.0;

  if (t >= 1) {
    out.active = false;
    out.progress = 1;
    out.yOffset = 0;
    out.scaleY = 1;
    out.scaleXZ = 1;
    out.regaliaFlare = 0;
    out.cameraFocusWeight = 0;
    return out;
  }

  out.active = true;
  out.progress = t;

  if (t < 0.52) {
    const u = t / 0.52;
    const dropEase = 1 - u * u * u;
    out.yOffset = profile.dropHeight * dropEase * motionScale;
    out.scaleY = 1 + 0.14 * (1 - u) * motionScale;
    out.scaleXZ = 1 - 0.08 * (1 - u) * motionScale;
    out.regaliaFlare = u * 0.45;
  } else if (t < 0.72) {
    const u = (t - 0.52) / 0.2;
    const squash = Math.sin(u * Math.PI);
    out.yOffset = 0;
    out.scaleY = 1 - 0.18 * squash * motionScale;
    out.scaleXZ = 1 + 0.16 * squash * motionScale;
    out.regaliaFlare = 0.55 + 0.45 * squash;
  } else {
    const u = (t - 0.72) / 0.28;
    const rebound = Math.sin(u * Math.PI) * (1 - u);
    out.yOffset = 0;
    out.scaleY = 1 + 0.06 * rebound * motionScale;
    out.scaleXZ = 1 - 0.04 * rebound * motionScale;
    out.regaliaFlare = (1 - u) * 0.55;
  }

  // Smooth camera focus bell curve peaking around impact and easing cleanly to 0
  out.cameraFocusWeight = Math.sin(t * Math.PI) * (reducedMotion ? 0.35 : 0.85);
  return out;
}

// ============================================================================
// 2. 3D CELESTIAL PORTAL WAYPOINT ARCH (NORTH GATE, 0 POINTLIGHT)
// ============================================================================

export interface BuiltCelestialPortalArch {
  group: THREE.Group;
  chapterId: number;
  partCount: number;
  pointLightCount: number;
  stoneRoughness: number;
  gildedRoughness: number;
  runicHalo: THREE.Mesh;
  portalVeil: THREE.Mesh;
  keystoneMesh: THREE.Mesh;
  runicHaloMat: THREE.MeshStandardMaterial;
  portalVeilMat: THREE.MeshBasicMaterial;
  keystoneMat: THREE.MeshStandardMaterial;
  beaconRibbons: THREE.Mesh[];
  beaconMat: THREE.MeshBasicMaterial;
  disposables: Array<{ dispose: () => void }>;
}

function createContactShadowTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    grad.addColorStop(0, 'rgba(2, 6, 23, 0.56)');
    grad.addColorStop(0.65, 'rgba(2, 6, 23, 0.24)');
    grad.addColorStop(1, 'rgba(2, 6, 23, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  } catch {
    return null;
  }
}

/**
 * Builds a composite >= 8-part Celestial Portal Waypoint Arch anchored at the North Gate.
 * Uses matte obsidian stone (roughness 0.85, metalness 0.12) contrasted against gilded
 * celestial arch metalwork (roughness 0.24, metalness 0.82 -> roughness delta 0.61 >= 0.25).
 * Strictly 0 PointLights.
 */
export function buildCelestialPortalArch(params: {
  chapterId: number;
  accentHex: number;
  liteActive: boolean;
  arenaHalfD: number;
}): BuiltCelestialPortalArch {
  const { chapterId, accentHex, liteActive, arenaHalfD } = params;
  const disposables: Array<{ dispose: () => void }> = [];
  const group = new THREE.Group();
  group.name = `celestial_portal_arch_ch${chapterId}`;
  group.position.set(0, 0, -(arenaHalfD - 0.55));

  const stoneRoughness = 0.85;
  const gildedRoughness = 0.24;

  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x1e2538,
    roughness: stoneRoughness,
    metalness: 0.12,
  });
  const trimStoneMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.78,
    metalness: 0.18,
  });
  const gildedMat = new THREE.MeshStandardMaterial({
    color: 0xf5c56b,
    emissive: new THREE.Color(accentHex),
    emissiveIntensity: 0.22,
    roughness: gildedRoughness,
    metalness: 0.82,
  });
  const runicHaloMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: new THREE.Color(accentHex),
    emissiveIntensity: 0.45,
    roughness: gildedRoughness,
    metalness: 0.78,
  });
  const keystoneMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: new THREE.Color(accentHex),
    emissiveIntensity: 0.35,
    roughness: 0.22,
    metalness: 0.85,
  });
  const portalVeilMat = new THREE.MeshBasicMaterial({
    color: accentHex,
    transparent: true,
    opacity: 0.12,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const beaconMat = new THREE.MeshBasicMaterial({
    color: accentHex,
    transparent: true,
    opacity: 0.16,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  disposables.push(
    stoneMat,
    trimStoneMat,
    gildedMat,
    runicHaloMat,
    keystoneMat,
    portalVeilMat,
    beaconMat
  );

  // Segment budgets automatically reduced in Lite mode for Dell E5430
  const pillarSides = liteActive ? 6 : 10;
  const archRadial = liteActive ? 6 : 10;
  const archTubular = liteActive ? 16 : 32;
  const ringSegs = liteActive ? 16 : 32;

  const plinthGeo = new THREE.BoxGeometry(1.15, 0.36, 1.05);
  const pillarGeo = new THREE.CylinderGeometry(0.3, 0.38, 2.85, pillarSides);
  const capitalGeo = new THREE.BoxGeometry(0.92, 0.28, 0.88);
  const archGeo = new THREE.TorusGeometry(2.15, 0.16, archRadial, archTubular, Math.PI);
  const runicHaloGeo = new THREE.TorusGeometry(1.42, 0.065, archRadial, archTubular);
  const keystoneGeo = new THREE.OctahedronGeometry(0.36, 0);
  const veilGeo = new THREE.CircleGeometry(1.62, ringSegs);
  const stepSillGeo = new THREE.BoxGeometry(4.9, 0.14, 1.28);
  const beaconGeo = new THREE.PlaneGeometry(0.24, 2.55);
  const shadowGeo = new THREE.PlaneGeometry(6.2, 2.5);
  shadowGeo.rotateX(-Math.PI / 2);

  disposables.push(
    plinthGeo,
    pillarGeo,
    capitalGeo,
    archGeo,
    runicHaloGeo,
    keystoneGeo,
    veilGeo,
    stepSillGeo,
    beaconGeo,
    shadowGeo
  );

  let partCount = 0;
  const addPart = (mesh: THREE.Mesh) => {
    group.add(mesh);
    partCount += 1;
    return mesh;
  };

  // Part 1: Grounded radial contact shadow disc (depthWrite: false)
  const shadowTex = createContactShadowTexture();
  if (shadowTex) disposables.push(shadowTex);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x020617,
    ...(shadowTex ? { map: shadowTex } : {}),
    transparent: true,
    opacity: shadowTex ? 0.82 : 0.32,
    depthWrite: false,
  });
  disposables.push(shadowMat);
  const contactShadow = addPart(new THREE.Mesh(shadowGeo, shadowMat));
  contactShadow.position.set(0, 0.025, 0.1);
  contactShadow.name = 'portal_contact_shadow';

  // Part 2: Stepped stone threshold sill
  const sill = addPart(new THREE.Mesh(stepSillGeo, trimStoneMat));
  sill.position.set(0, 0.07, 0);

  // Parts 3–8: Left & Right composite plinth + fluted pillar + gilded capital
  const pillarOffsets = [-2.15, 2.15];
  for (let i = 0; i < pillarOffsets.length; i++) {
    const px = pillarOffsets[i];
    const plinth = addPart(new THREE.Mesh(plinthGeo, stoneMat));
    plinth.position.set(px, 0.24, 0);

    const pillar = addPart(new THREE.Mesh(pillarGeo, stoneMat));
    pillar.position.set(px, 1.82, 0);

    const capital = addPart(new THREE.Mesh(capitalGeo, gildedMat));
    capital.position.set(px, 3.26, 0);
  }

  // Part 9: Main gilded celestial arch ring
  const mainArch = addPart(new THREE.Mesh(archGeo, gildedMat));
  mainArch.position.set(0, 3.22, 0);

  // Part 10: Floating inner runic halo
  const runicHalo = addPart(new THREE.Mesh(runicHaloGeo, runicHaloMat));
  runicHalo.position.set(0, 2.38, 0.08);

  // Part 11: Crown keystone diamond crest
  const keystoneMesh = addPart(new THREE.Mesh(keystoneGeo, keystoneMat));
  keystoneMesh.position.set(0, 5.42, 0.12);

  // Part 12: Translucent portal veil (lights up when room clears)
  const portalVeil = addPart(new THREE.Mesh(veilGeo, portalVeilMat));
  portalVeil.position.set(0, 2.38, 0.02);

  // Parts 13–14: Vertical beacon ribbons visible when portal unlocks
  const beaconRibbons: THREE.Mesh[] = [];
  const ribbonX = [-1.45, 1.45];
  for (let i = 0; i < ribbonX.length; i++) {
    const ribbon = addPart(new THREE.Mesh(beaconGeo, beaconMat));
    ribbon.position.set(ribbonX[i], 1.75, 0.24);
    beaconRibbons.push(ribbon);
  }

  let pointLightCount = 0;
  group.traverse((obj) => {
    if ((obj as THREE.PointLight).isPointLight) pointLightCount += 1;
  });

  return {
    group,
    chapterId,
    partCount,
    pointLightCount,
    stoneRoughness,
    gildedRoughness,
    runicHalo,
    portalVeil,
    keystoneMesh,
    runicHaloMat,
    portalVeilMat,
    keystoneMat,
    beaconRibbons,
    beaconMat,
    disposables,
  };
}

/**
 * Zero-GC per-frame animation for the Celestial Portal Waypoint Arch.
 * Smoothly shifts from subdued obsidian standby (locked) to luminous gilded waypoint (unlocked).
 */
export function stepCelestialPortalArch(
  built: BuiltCelestialPortalArch | null | undefined,
  dt: number,
  elapsedSec: number,
  portalUnlocked: boolean,
  reducedMotion: boolean
): void {
  if (!built) return;
  const safeDt = Math.max(0, Math.min(0.1, dt));
  const motionMult = reducedMotion ? 0.25 : 1.0;

  // Spin inner runic halo & bob keystone diamond
  const haloSpeed = (portalUnlocked ? 1.55 : 0.35) * motionMult;
  built.runicHalo.rotation.z += safeDt * haloSpeed;
  built.keystoneMesh.rotation.y += safeDt * (portalUnlocked ? 1.8 : 0.5) * motionMult;
  built.keystoneMesh.position.y =
    5.42 + (reducedMotion ? 0 : Math.sin(elapsedSec * (portalUnlocked ? 3.2 : 1.4)) * 0.1);

  const pulse = reducedMotion
    ? 0.5
    : 0.5 + 0.5 * Math.sin(elapsedSec * (portalUnlocked ? 4.4 : 1.8));

  const targetVeilOpacity = portalUnlocked ? 0.32 + pulse * 0.18 : 0.06;
  const targetHaloEmissive = portalUnlocked ? 1.05 + pulse * 0.35 : 0.24;
  const targetKeystoneEmissive = portalUnlocked ? 1.15 + pulse * 0.35 : 0.26;
  const targetBeaconOpacity = portalUnlocked ? 0.36 + pulse * 0.16 : 0.0;

  const lerpAlpha = Math.min(1, safeDt * 6.5);
  built.portalVeilMat.opacity += (targetVeilOpacity - built.portalVeilMat.opacity) * lerpAlpha;
  built.runicHaloMat.emissiveIntensity +=
    (targetHaloEmissive - built.runicHaloMat.emissiveIntensity) * lerpAlpha;
  built.keystoneMat.emissiveIntensity +=
    (targetKeystoneEmissive - built.keystoneMat.emissiveIntensity) * lerpAlpha;
  built.beaconMat.opacity += (targetBeaconOpacity - built.beaconMat.opacity) * lerpAlpha;

  const showBeacons = built.beaconMat.opacity > 0.02;
  for (let i = 0; i < built.beaconRibbons.length; i++) {
    built.beaconRibbons[i].visible = showBeacons;
  }
}

export function disposeCelestialPortalArch(
  built: BuiltCelestialPortalArch | null | undefined
): void {
  if (!built) return;
  if (built.group.parent) {
    built.group.parent.remove(built.group);
  }
  for (let i = 0; i < built.disposables.length; i++) {
    try {
      built.disposables[i].dispose();
    } catch {
      // ignore redundant disposal
    }
  }
}

// ============================================================================
// 3. COMBAT AUDIO CAPTIONS QUEUE (HEARING-IMPAIRED ACCESSIBILITY)
// ============================================================================

export interface CombatAudioCaptionTemplate {
  kind: CombatAudioCaptionKind;
  glyph: string;
  label: string;
  defaultDetail: string;
  tone: CombatAudioCaptionCue['tone'];
}

export const COMBAT_AUDIO_CAPTION_CATALOG: Readonly<
  Record<CombatAudioCaptionKind, CombatAudioCaptionTemplate>
> = {
  boss_telegraph: {
    kind: 'boss_telegraph',
    glyph: '◆',
    label: 'CẢNH BÁO BOSS',
    defaultDetail: 'Đòn tụ lực sắp giáng xuống — sẵn sàng Lướt hoặc Cắt Chiêu!',
    tone: 'warning',
  },
  riposte_ready: {
    kind: 'riposte_ready',
    glyph: '⚡',
    label: 'PHẢN TIỄN SẴN SÀNG',
    defaultDetail: 'Né hoàn hảo — phát bắn kế tiếp xuyên giáp +75% sát thương!',
    tone: 'counter',
  },
  wall_slam: {
    kind: 'wall_slam',
    glyph: '▲',
    label: 'VA TƯỜNG CHOÁNG',
    defaultDetail: 'Kẻ địch đập vào tường đấu trường và bị choáng!',
    tone: 'impact',
  },
  boss_shatter: {
    kind: 'boss_shatter',
    glyph: '★',
    label: 'PHÁ GIÁP BOSS',
    defaultDetail: 'Lá chắn Boss vỡ vụn — mở cửa sổ phản công sát thương cao!',
    tone: 'counter',
  },
  loot_rare: {
    kind: 'loot_rare',
    glyph: '✦',
    label: 'CHIẾN LỢI PHẨM HIẾM',
    defaultDetail: 'Vật phẩm Sử Thi / Thần Thoại vừa rơi trên sàn đấu!',
    tone: 'reward',
  },
  execution_finisher: {
    kind: 'execution_finisher',
    glyph: '◈',
    label: 'KẾT LIỄU HOÀNG ĐẠO',
    defaultDetail: 'Đòn kết liễu kích hoạt — dứt điểm mục tiêu!',
    tone: 'impact',
  },
};

export const AUDIO_CAPTION_DEDUPE_MS = 350;
export const AUDIO_CAPTION_TTL_MS = 2400;
export const AUDIO_CAPTION_MAX_ACTIVE = 2;

export class CombatAudioCaptionQueue {
  private readonly items: CombatAudioCaptionCue[] = [];
  private readonly lastKindPushMs: Partial<Record<CombatAudioCaptionKind, number>> = {};
  private seq = 0;

  public push(
    kind: CombatAudioCaptionKind,
    nowMs = Date.now(),
    detailOverride?: string
  ): CombatAudioCaptionCue | null {
    const prev = this.lastKindPushMs[kind];
    if (prev !== undefined && nowMs - prev < AUDIO_CAPTION_DEDUPE_MS) {
      return null;
    }
    this.prune(nowMs);

    const template = COMBAT_AUDIO_CAPTION_CATALOG[kind];
    this.seq += 1;
    const cue: CombatAudioCaptionCue = {
      id: `cap_${kind}_${this.seq}`,
      kind,
      glyph: template.glyph,
      label: template.label,
      detail: (detailOverride && detailOverride.trim()) || template.defaultDetail,
      tone: template.tone,
      createdAtMs: nowMs,
      expiresAtMs: nowMs + AUDIO_CAPTION_TTL_MS,
    };

    this.lastKindPushMs[kind] = nowMs;
    this.items.push(cue);
    while (this.items.length > AUDIO_CAPTION_MAX_ACTIVE) {
      this.items.shift();
    }
    return cue;
  }

  public prune(nowMs = Date.now()): void {
    let writeIdx = 0;
    for (let i = 0; i < this.items.length; i++) {
      if (this.items[i].expiresAtMs > nowMs) {
        this.items[writeIdx] = this.items[i];
        writeIdx += 1;
      }
    }
    this.items.length = writeIdx;
  }

  public getActive(nowMs = Date.now()): CombatAudioCaptionCue[] {
    this.prune(nowMs);
    return this.items.slice();
  }

  public clear(): void {
    this.items.length = 0;
    for (const k of Object.keys(this.lastKindPushMs) as CombatAudioCaptionKind[]) {
      delete this.lastKindPushMs[k];
    }
  }
}

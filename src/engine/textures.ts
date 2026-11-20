import * as THREE from 'three';

export function createStoneTileTexture(
  primaryHex: string,
  accentHex: string,
  maxAnisotropy: number
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = primaryHex;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 3600; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1 + Math.random() * 2.5;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(x, y, r, r);
  }

  const step = size / 4;
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.36)';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 4; i++) {
    const p = i * step;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.055)';
  ctx.lineWidth = 2;
  for (let gx = 0; gx < 4; gx++) {
    for (let gy = 0; gy < 4; gy++) {
      ctx.strokeRect(gx * step + 5, gy * step + 5, step - 10, step - 10);
      if ((gx + gy) % 2 === 0) {
        ctx.fillStyle = accentHex;
        ctx.globalAlpha = 0.09;
        ctx.fillRect(gx * step + 10, gy * step + 10, step - 20, step - 20);
        ctx.globalAlpha = 1;
      }
    }
  }

  ctx.fillStyle = accentHex;
  ctx.globalAlpha = 0.22;
  for (let gx = 1; gx < 4; gx += 2) {
    for (let gy = 1; gy < 4; gy += 2) {
      const cx = gx * step;
      const cy = gy * step;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 8);
      ctx.lineTo(cx + 8, cy);
      ctx.lineTo(cx, cy + 8);
      ctx.lineTo(cx - 8, cy);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4.5);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createStoneBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 2000; i++) {
    const v = 110 + Math.floor(Math.random() * 36);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 3, 3);
  }

  const step = size / 4;
  ctx.strokeStyle = '#262626';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 4; i++) {
    const p = i * step;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4.5);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

/**
 * Procedural Sobel Tangent-Space Normal Map (linear NoColorSpace) aligned 1:1 with
 * createStoneTileTexture & createStoneRoughnessTexture so Zodiac floor joints, beveled slabs,
 * and inlaid gold diamonds catch directional key & rim light with true physical PBR relief.
 */
export function createStoneNormalTexture(maxAnisotropy: number): THREE.DataTexture {
  const size = 256;
  const heightField = new Float32Array(size * size);
  const step = size / 4; // 64px per stone slab

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const lx = x % step;
      const ly = y % step;
      const edgeDist = Math.min(lx, ly, step - 1 - lx, step - 1 - ly);

      // Mortar groove at slab seams -> beveled chamfer -> flat honed slab face
      let h = 0.68;
      if (edgeDist < 2.2) {
        h = 0.08;
      } else if (edgeDist < 6.0) {
        h = 0.08 + ((edgeDist - 2.2) / 3.8) * 0.6;
      } else {
        // Subtle deterministic stone micro-grain
        const hash = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
        const grain = hash - Math.floor(hash);
        h = 0.68 + (grain - 0.5) * 0.06;
      }

      // Raised gilded diamond inlays at alternating tile corners
      const gx = Math.round(x / step);
      const gy = Math.round(y / step);
      if (gx % 2 === 1 && gy % 2 === 1) {
        const dx = Math.abs(x - gx * step);
        const dy = Math.abs(y - gy * step);
        const manhattan = dx + dy;
        if (manhattan < 8.5) {
          h = Math.max(h, 0.96 - (manhattan / 8.5) * 0.22);
        }
      }

      heightField[y * size + x] = h;
    }
  }

  const data = new Uint8Array(size * size * 4);
  const strength = 2.6;
  const sampleH = (sx: number, sy: number) =>
    heightField[((sy + size) % size) * size + ((sx + size) % size)];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = sampleH(x - 1, y - 1);
      const t = sampleH(x, y - 1);
      const tr = sampleH(x + 1, y - 1);
      const l = sampleH(x - 1, y);
      const r = sampleH(x + 1, y);
      const bl = sampleH(x - 1, y + 1);
      const b = sampleH(x, y + 1);
      const br = sampleH(x + 1, y + 1);

      const dX = (tr + 2 * r + br - (tl + 2 * l + bl)) * strength;
      const dY = (bl + 2 * b + br - (tl + 2 * t + tr)) * strength;
      const nx = -dX;
      const ny = -dY;
      const nz = 1.0;
      const invLen = 1 / Math.hypot(nx, ny, nz);

      const idx = (y * size + x) * 4;
      data[idx] = Math.round((nx * invLen * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((ny * invLen * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((nz * invLen * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4.5);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.generateMipmaps = true;
  tex.anisotropy = maxAnisotropy;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Procedural PBR roughness map aligned 1:1 with createStoneTileTexture:
 * - Honed obsidian/marble tiles: ~0.64–0.72 roughness
 * - Grout/mortar seams: ~0.92 roughness (matte recesses)
 * - Inlaid gold bevels & center zodiac diamonds: ~0.18 roughness (glossy specular glint)
 */
export function createStoneRoughnessTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base honed marble (roughness ~0.68 -> RGB 174)
  ctx.fillStyle = '#aeaeae';
  ctx.fillRect(0, 0, size, size);

  // Subtle deterministic mineral grain variation
  for (let i = 0; i < 1600; i++) {
    const x = (i * 73.13) % size;
    const y = (i * 139.37) % size;
    const v = 152 + (i % 38);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(x, y, 2.5, 2.5);
  }

  const step = size / 4;

  // Glossy bevel frames on alternating polished tiles
  for (let gx = 0; gx < 4; gx++) {
    for (let gy = 0; gy < 4; gy++) {
      if ((gx + gy) % 2 === 0) {
        ctx.fillStyle = 'rgb(138,138,138)';
        ctx.fillRect(gx * step + 5, gy * step + 5, step - 10, step - 10);
      }
      ctx.strokeStyle = 'rgb(76,76,76)';
      ctx.lineWidth = 1.6;
      ctx.strokeRect(gx * step + 3, gy * step + 3, step - 6, step - 6);
    }
  }

  // Deep matte mortar lines (roughness ~0.92)
  ctx.strokeStyle = 'rgb(236,236,236)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    const p = i * step;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  // Polished golden diamond medallions at intersections (roughness ~0.18 -> RGB 46)
  ctx.fillStyle = 'rgb(46,46,46)';
  for (let gx = 1; gx < 4; gx += 2) {
    for (let gy = 1; gy < 4; gy += 2) {
      const cx = gx * step;
      const cy = gy * step;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 5);
      ctx.lineTo(cx + 5, cy);
      ctx.lineTo(cx, cy + 5);
      ctx.lineTo(cx - 5, cy);
      ctx.closePath();
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(4, 4.5);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createHeroFaceTexture(
  eyeColor = '#c026d3',
  cheekColor = '#9333ea'
): THREE.CanvasTexture {
  const w = 512;
  const h = 512;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Soft warm peach skin base
  const skinGrad = ctx.createRadialGradient(w * 0.5, h * 0.52, 40, w * 0.5, h * 0.52, 260);
  skinGrad.addColorStop(0, '#ffe3cf');
  skinGrad.addColorStop(0.75, '#f6caa9');
  skinGrad.addColorStop(1, '#e8b38f');
  ctx.fillStyle = skinGrad;
  ctx.fillRect(0, 0, w, h);

  const cx = w * 0.5;
  const cy = h * 0.54;

  // Soft rosy cheek blush
  for (const side of [-1, 1]) {
    const bx = cx + side * 68;
    const by = cy + 28;
    const blush = ctx.createRadialGradient(bx, by, 2, bx, by, 28);
    blush.addColorStop(0, 'rgba(244, 114, 182, 0.32)');
    blush.addColorStop(1, 'rgba(244, 114, 182, 0)');
    ctx.fillStyle = blush;
    ctx.beginPath();
    ctx.arc(bx, by, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  // Stylized triangle cheek markings
  ctx.fillStyle = cheekColor;
  for (const side of [-1, 1]) {
    const mx = cx + side * 56;
    const my = cy + 24;
    ctx.beginPath();
    ctx.moveTo(mx - 8, my);
    ctx.lineTo(mx + 8, my);
    ctx.lineTo(mx, my + 24);
    ctx.closePath();
    ctx.fill();
  }

  // Large luminous stylized anime/chibi eyes
  for (const side of [-1, 1]) {
    const ex = cx + side * 48;
    const ey = cy - 4;

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 26, 22, side * -0.1, 0, Math.PI * 2);
    ctx.fill();

    const irisGrad = ctx.createRadialGradient(ex, ey + 2, 3, ex, ey, 22);
    irisGrad.addColorStop(0, '#ffffff');
    irisGrad.addColorStop(0.32, eyeColor);
    irisGrad.addColorStop(0.85, eyeColor);
    irisGrad.addColorStop(1, '#1e1b4b');
    ctx.fillStyle = irisGrad;
    ctx.beginPath();
    ctx.ellipse(ex, ey + 1, 20, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.ellipse(ex, ey + 2, 7, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = '#1e1b4b';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(ex, ey + 5, 25, Math.PI * 1.12, Math.PI * 1.88);
    ctx.stroke();

    ctx.lineWidth = 4.5;
    ctx.beginPath();
    ctx.moveTo(ex + side * 22, ey - 10);
    ctx.lineTo(ex + side * 31, ey - 17);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - 7, ey - 7, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(ex + 8, ey + 7, 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = 'rgba(180, 100, 75, 0.35)';
  ctx.beginPath();
  ctx.arc(cx, cy + 19, 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#8b4a39';
  ctx.lineWidth = 3.2;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy + 28, 12, 0.22 * Math.PI, 0.78 * Math.PI);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createGoblinFaceTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(128, 128, 20, 128, 128, 128);
  grad.addColorStop(0, '#84cc16');
  grad.addColorStop(0.75, '#4d7c0f');
  grad.addColorStop(1, '#365314');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const cx = 128;
  const cy = 134;

  // Expressive fiery amber chibi eyes
  for (const side of [-1, 1]) {
    const ex = cx + side * 28;
    const ey = cy - 4;
    ctx.fillStyle = '#1c1917';
    ctx.beginPath();
    ctx.ellipse(ex, ey, 16, 13, side * 0.2, 0, Math.PI * 2);
    ctx.fill();

    const eyeG = ctx.createRadialGradient(ex, ey, 2, ex, ey, 12);
    eyeG.addColorStop(0, '#fef08a');
    eyeG.addColorStop(0.7, '#f59e0b');
    eyeG.addColorStop(1, '#b45309');
    ctx.fillStyle = eyeG;
    ctx.beginPath();
    ctx.ellipse(ex, ey + 1, 12, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ex - 4, ey - 3, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  // Wide cheeky grin
  ctx.strokeStyle = '#1a2e05';
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy + 14, 18, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createFabricWeaveTexture(
  baseHex: string,
  trimHex = '#eab308'
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, baseHex);
  grad.addColorStop(1, baseHex);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.055)';
  ctx.lineWidth = 2;
  for (let i = -size; i < size * 2; i += 10) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + size, size);
    ctx.stroke();
  }

  // Crisp gold border trim + inner filigree stripe
  ctx.fillStyle = trimHex;
  ctx.fillRect(0, size - 20, size, 12);
  ctx.globalAlpha = 0.65;
  ctx.fillRect(0, size - 28, size, 3);
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

export function createEngravedArmorTexture(
  baseHex: string,
  veinHex: string
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = baseHex;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.06)';
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 2 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.strokeStyle = veinHex;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 3;
  ctx.strokeRect(18, 18, size - 36, size - 36);
  ctx.beginPath();
  ctx.moveTo(size / 2, 18);
  ctx.lineTo(size - 18, size / 2);
  ctx.lineTo(size / 2, size - 18);
  ctx.lineTo(18, size / 2);
  ctx.closePath();
  ctx.stroke();
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createContactShadowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(
    size / 2,
    size / 2,
    size * 0.08,
    size / 2,
    size / 2,
    size * 0.48
  );
  grad.addColorStop(0, 'rgba(0, 0, 0, 0.72)');
  grad.addColorStop(0.55, 'rgba(0, 0, 0, 0.32)');
  grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createTargetReticleTexture(colorHex = '#fbbf24'): THREE.CanvasTexture {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const c = size / 2;

  ctx.strokeStyle = colorHex;
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(c, c, 48, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 4;
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * 34, c + Math.sin(a) * 34);
    ctx.lineTo(c + Math.cos(a) * 58, c + Math.sin(a) * 58);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createCelestialPortalTexture(
  goldHex = '#fbbf24',
  crystalHex = '#38bdf8'
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const c = size / 2;

  // Deep cosmic sapphire-to-indigo vortex backdrop
  const bgGrad = ctx.createRadialGradient(c, c, 12, c, c, c);
  bgGrad.addColorStop(0, '#1e3a8a');
  bgGrad.addColorStop(0.28, '#172554');
  bgGrad.addColorStop(0.62, '#0c1330');
  bgGrad.addColorStop(0.92, '#060918');
  bgGrad.addColorStop(1, '#040610');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, size, size);

  // Subtle luminous crystal nebula wisps
  for (let i = 0; i < 6; i++) {
    const ang = (i / 6) * Math.PI * 2 + 0.35;
    const nx = c + Math.cos(ang) * 92;
    const ny = c + Math.sin(ang) * 92;
    const neb = ctx.createRadialGradient(nx, ny, 8, nx, ny, 130);
    neb.addColorStop(0, i % 2 === 0 ? 'rgba(56, 189, 248, 0.24)' : 'rgba(251, 191, 36, 0.16)');
    neb.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = neb;
    ctx.beginPath();
    ctx.arc(nx, ny, 130, 0, Math.PI * 2);
    ctx.fill();
  }

  // Concentric golden astrolabe rings & 12 zodiac meridian rays
  ctx.strokeStyle = goldHex;
  ctx.globalAlpha = 0.42;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(c, c, 212, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = 0.28;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.arc(c, c, 168, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = crystalHex;
  ctx.globalAlpha = 0.36;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(c, c, 118, 0, Math.PI * 2);
  ctx.stroke();

  // 12 radial zodiac spokes & star nodes
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.strokeStyle = goldHex;
    ctx.globalAlpha = i % 3 === 0 ? 0.34 : 0.16;
    ctx.lineWidth = i % 3 === 0 ? 2 : 1.2;
    ctx.beginPath();
    ctx.moveTo(c + Math.cos(a) * 64, c + Math.sin(a) * 64);
    ctx.lineTo(c + Math.cos(a) * 212, c + Math.sin(a) * 212);
    ctx.stroke();

    ctx.fillStyle = '#fef08a';
    ctx.globalAlpha = 0.72;
    ctx.beginPath();
    ctx.arc(c + Math.cos(a) * 190, c + Math.sin(a) * 190, i % 3 === 0 ? 4.2 : 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // Crisp deterministic starfield inside portal
  for (let i = 0; i < 110; i++) {
    const seedA = (i * 137.508) % 360;
    const rad = Math.sqrt((i + 1) / 112) * 224;
    const sx = c + Math.cos((seedA * Math.PI) / 180) * rad;
    const sy = c + Math.sin((seedA * Math.PI) / 180) * rad;
    const sr = i % 9 === 0 ? 2.6 : i % 3 === 0 ? 1.6 : 1.0;
    ctx.fillStyle = i % 5 === 0 ? '#fde68a' : i % 4 === 0 ? '#bae6fd' : '#ffffff';
    ctx.globalAlpha = 0.45 + (i % 5) * 0.11;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();
  }

  // Soft radiant heart glow
  ctx.globalAlpha = 1;
  const core = ctx.createRadialGradient(c, c, 4, c, c, 86);
  core.addColorStop(0, 'rgba(224, 242, 254, 0.55)');
  core.addColorStop(0.45, 'rgba(56, 189, 248, 0.22)');
  core.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(c, c, 86, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
